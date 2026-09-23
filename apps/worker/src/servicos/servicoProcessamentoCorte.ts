import { Prisma, StatusCorte, type PrismaClient } from '@cutpro/banco';
import { podeTransicionarCorte } from '@cutpro/dominio';
import type { ServicoArmazenamentoArquivo, ServicoVideo, TemplateEnquadramento } from '@cutpro/integracoes';
import type { RegistroLog } from '@cutpro/nucleo';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { EtapaPipeline, type RegistroEventos } from './registroEventos.js';

const TIPO_CONTEUDO_VIDEO = 'video/mp4';
const TIPO_CONTEUDO_MINIATURA = 'image/jpeg';
const PASTA_TRABALHO = 'processamento';
const PROPORCAO_INSTANTE_MINIATURA = 0.5;
const MENSAGEM_SEM_VIDEO_BRUTO =
  'Vídeo bruto não disponível para este corte. A captura da live ainda não está implementada.';

type CorteComLive = Prisma.CorteGetPayload<{ include: { live: true } }>;

export class ServicoProcessamentoCorte {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly dependencias: {
      readonly video: ServicoVideo;
      readonly armazenamento: ServicoArmazenamentoArquivo;
      readonly eventos: RegistroEventos;
      readonly log: RegistroLog;
    },
    private readonly diretorioTrabalho: string,
  ) {}

  async processar(corteId: string): Promise<void> {
    const corte = await this.prisma.corte.findUnique({ where: { id: corteId }, include: { live: true } });
    if (!corte) return;
    if (!podeTransicionarCorte(corte.status, StatusCorte.PROCESSANDO)) return;

    if (!corte.caminhoArquivoBruto) {
      await this.registrarErro(corte, MENSAGEM_SEM_VIDEO_BRUTO);
      return;
    }

    await this.executarComSeguranca(corte, corte.caminhoArquivoBruto);
  }

  private async executarComSeguranca(corte: CorteComLive, caminhoBruto: string): Promise<void> {
    const pasta = join(this.diretorioTrabalho, PASTA_TRABALHO, corte.id);

    try {
      await this.atualizarStatus(corte.id, StatusCorte.PROCESSANDO);
      await mkdir(pasta, { recursive: true });
      await this.renderizar({ corte, caminhoBruto, pasta });
    } catch (erro) {
      await this.registrarErro(corte, erro instanceof Error ? erro.message : String(erro));
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
  }

  private async renderizar(entrada: {
    readonly corte: CorteComLive;
    readonly caminhoBruto: string;
    readonly pasta: string;
  }): Promise<void> {
    const { corte, caminhoBruto, pasta } = entrada;
    const trecho = join(pasta, 'trecho.mp4');
    const vertical = join(pasta, 'vertical.mp4');
    const miniatura = join(pasta, 'miniatura.jpg');

    await this.dependencias.video.recortar({
      caminhoOrigem: caminhoBruto,
      caminhoDestino: trecho,
      inicioSegundos: corte.inicioSegundos,
      duracaoSegundos: corte.duracaoSegundos,
    });

    await this.atualizarStatus(corte.id, StatusCorte.RENDERIZANDO);
    await this.dependencias.video.enquadrarVertical({
      caminhoOrigem: trecho,
      caminhoDestino: vertical,
      template: corte.template as TemplateEnquadramento,
    });
    await this.dependencias.video.gerarMiniatura({
      caminhoOrigem: vertical,
      caminhoDestino: miniatura,
      instanteSegundos: Math.floor(corte.duracaoSegundos * PROPORCAO_INSTANTE_MINIATURA),
    });

    await this.publicarResultado({ corte, vertical, miniatura });
  }

  private async publicarResultado(entrada: {
    readonly corte: CorteComLive;
    readonly vertical: string;
    readonly miniatura: string;
  }): Promise<void> {
    const { corte } = entrada;
    const [video, capa] = await Promise.all([
      this.dependencias.armazenamento.salvarArquivo({
        caminho: `cortes/${corte.id}/vertical.mp4`,
        caminhoLocalOrigem: entrada.vertical,
        tipoConteudo: TIPO_CONTEUDO_VIDEO,
      }),
      this.dependencias.armazenamento.salvarArquivo({
        caminho: `cortes/${corte.id}/miniatura.jpg`,
        caminhoLocalOrigem: entrada.miniatura,
        tipoConteudo: TIPO_CONTEUDO_MINIATURA,
      }),
    ]);

    await this.prisma.corte.update({
      where: { id: corte.id },
      data: { caminhoArquivo: video.caminho, caminhoMiniatura: capa.caminho, status: StatusCorte.PRONTO },
    });

    await this.dependencias.eventos.registrar({
      etapa: EtapaPipeline.CORTE_PRONTO,
      liveId: corte.liveId,
      corteId: corte.id,
      mensagem: `Corte renderizado em ${corte.duracaoSegundos}s no template ${corte.template}`,
    });
    this.dependencias.log.info({ corteId: corte.id }, 'Corte renderizado');
  }

  private async atualizarStatus(corteId: string, status: StatusCorte): Promise<void> {
    await this.prisma.corte.update({ where: { id: corteId }, data: { status } });
  }

  private async registrarErro(corte: CorteComLive, mensagem: string): Promise<void> {
    await this.prisma.corte.update({
      where: { id: corte.id },
      data: { status: StatusCorte.ERRO, mensagemErro: mensagem, tentativas: { increment: 1 } },
    });

    this.dependencias.log.error({ corteId: corte.id, erro: mensagem }, 'Falha ao processar corte');
    await this.dependencias.eventos.registrar({
      etapa: EtapaPipeline.FALHA_PROCESSAMENTO,
      liveId: corte.liveId,
      corteId: corte.id,
      mensagem,
    });
  }
}
