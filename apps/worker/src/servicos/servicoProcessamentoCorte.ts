import { Prisma, StatusCorte, type PrismaClient } from '@cutpro/banco';
import { interpretarConfiguracaoCanal } from '@cutpro/contratos';
import { podeTransicionarCorte } from '@cutpro/dominio';
import type { ServicoArmazenamentoArquivo, ServicoVideo, TemplateEnquadramento } from '@cutpro/integracoes';
import type { RegistroLog } from '@cutpro/nucleo';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { CapturaLives } from './capturaLives.js';
import { EtapaPipeline, type RegistroEventos } from './registroEventos.js';

const TIPO_CONTEUDO_VIDEO = 'video/mp4';
const TIPO_CONTEUDO_MINIATURA = 'image/jpeg';
const PASTA_TRABALHO = 'processamento';
const PROPORCAO_INSTANTE_MINIATURA = 0.5;
const MENSAGEM_SEM_VIDEO_BRUTO =
  'Vídeo bruto indisponível: o trecho não está no buffer de captura ou a captura está desligada.';

type CorteComLive = Prisma.CorteGetPayload<{ include: { live: { include: { canal: true } } } }>;

type OrigemVideo = {
  readonly caminho: string;
  readonly inicioSegundos: number;
};

export class ServicoProcessamentoCorte {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly dependencias: {
      readonly video: ServicoVideo;
      readonly armazenamento: ServicoArmazenamentoArquivo;
      readonly captura: CapturaLives;
      readonly caminhoMarca: string;
      readonly eventos: RegistroEventos;
      readonly log: RegistroLog;
    },
    private readonly diretorioTrabalho: string,
  ) {}

  async processar(corteId: string): Promise<void> {
    const corte = await this.prisma.corte.findUnique({
      where: { id: corteId },
      include: { live: { include: { canal: true } } },
    });
    if (!corte) return;
    if (!podeTransicionarCorte(corte.status, StatusCorte.PROCESSANDO)) return;

    await this.executarComSeguranca(corte);
  }

  private async executarComSeguranca(corte: CorteComLive): Promise<void> {
    const pasta = join(this.diretorioTrabalho, PASTA_TRABALHO, corte.id);

    try {
      await this.atualizarStatus(corte.id, StatusCorte.PROCESSANDO);
      await mkdir(pasta, { recursive: true });
      const origem = await this.obterVideoBruto(corte, pasta);
      if (!origem) {
        await this.registrarErro(corte, MENSAGEM_SEM_VIDEO_BRUTO);
        return;
      }

      await this.renderizar({ corte, origem, pasta });
    } catch (erro) {
      await this.registrarErro(corte, erro instanceof Error ? erro.message : String(erro));
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
  }

  private async obterVideoBruto(corte: CorteComLive, pasta: string): Promise<OrigemVideo | null> {
    if (corte.caminhoArquivoBruto) {
      return { caminho: corte.caminhoArquivoBruto, inicioSegundos: corte.inicioSegundos };
    }

    const janela = await this.dependencias.captura.extrairJanela({
      liveId: corte.liveId,
      inicioLive: corte.live.inicio,
      janela: { inicioSegundos: corte.inicioSegundos, duracaoSegundos: corte.duracaoSegundos },
      caminhoDestino: join(pasta, 'bruto.mp4'),
    });
    if (!janela) return null;

    return { caminho: janela.caminhoArquivo, inicioSegundos: janela.deslocamentoSegundos };
  }

  private async renderizar(entrada: {
    readonly corte: CorteComLive;
    readonly origem: OrigemVideo;
    readonly pasta: string;
  }): Promise<void> {
    const { corte, origem, pasta } = entrada;
    const configuracao = interpretarConfiguracaoCanal(corte.live.canal.configuracao);
    const trecho = join(pasta, 'trecho.mp4');
    const vertical = join(pasta, 'vertical.mp4');
    const miniatura = join(pasta, 'miniatura.jpg');

    await this.dependencias.video.recortar({
      caminhoOrigem: origem.caminho,
      caminhoDestino: trecho,
      inicioSegundos: origem.inicioSegundos,
      duracaoSegundos: corte.duracaoSegundos,
    });

    await this.atualizarStatus(corte.id, StatusCorte.RENDERIZANDO);
    await this.dependencias.video.enquadrarVertical({
      caminhoOrigem: trecho,
      caminhoDestino: vertical,
      template: corte.template as TemplateEnquadramento,
      regiaoWebcam: configuracao.regiaoWebcam,
      deslocamentoGameplay: configuracao.deslocamentoGameplay,
      caminhoMarca: this.dependencias.caminhoMarca,
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
