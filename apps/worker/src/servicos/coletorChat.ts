import { Prisma, type PrismaClient } from '@cutpro/banco';
import {
  classificarReacao,
  DURACAO_BUCKET_SEGUNDOS,
  type CategoriaReacao,
} from '@cutpro/dominio';
import type { CanalExterno, ConexaoChat, ServicoPlataformaStreaming } from '@cutpro/integracoes';
import type { RegistroLog } from '@cutpro/nucleo';
import { EtapaPipeline, RegistroEventos } from './registroEventos.js';

const INTERVALO_DESCARGA_MS = 5_000;
const MILISSEGUNDOS_POR_SEGUNDO = 1000;
const TAMANHO_MAXIMO_BUFFER = 5_000;

type MensagemBufferizada = {
  readonly usuario: string;
  readonly mensagem: string;
  readonly dataHora: Date;
  readonly offsetSegundos: number;
  readonly categoriaReacao: CategoriaReacao;
  readonly scoreReacao: number;
  readonly possuiEmoteRiso: boolean;
};

type ColetaAtiva = {
  readonly liveId: string;
  readonly conexao: ConexaoChat;
  readonly temporizador: NodeJS.Timeout;
  buffer: MensagemBufferizada[];
};

export type EntradaColeta = {
  readonly liveId: string;
  readonly inicioLive: Date;
  readonly canalExterno: CanalExterno;
  readonly plataforma: ServicoPlataformaStreaming;
};

export class ColetorChat {
  private readonly coletas = new Map<string, ColetaAtiva>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventos: RegistroEventos,
    private readonly log: RegistroLog,
  ) {}

  estaColetando(liveId: string): boolean {
    return this.coletas.has(liveId);
  }

  async garantirColeta(entrada: EntradaColeta): Promise<void> {
    if (this.estaColetando(entrada.liveId)) return;

    const coleta: ColetaAtiva = {
      liveId: entrada.liveId,
      buffer: [],
      conexao: await this.abrirConexao(entrada),
      temporizador: setInterval(() => void this.descarregar(entrada.liveId), INTERVALO_DESCARGA_MS),
    };
    this.coletas.set(entrada.liveId, coleta);

    await this.eventos.registrar({
      etapa: EtapaPipeline.CHAT_CONECTADO,
      liveId: entrada.liveId,
      mensagem: `Chat conectado no canal ${entrada.canalExterno.nome}`,
    });
  }

  private async abrirConexao(entrada: EntradaColeta): Promise<ConexaoChat> {
    return entrada.plataforma.conectarChat({
      canal: entrada.canalExterno,
      aoReceberMensagem: (mensagem) =>
        this.acumular(entrada.liveId, {
          usuario: mensagem.usuario,
          mensagem: mensagem.mensagem,
          dataHora: mensagem.dataHora,
          offsetSegundos: this.calcularOffset(entrada.inicioLive, mensagem.dataHora),
          ...this.classificar(mensagem.mensagem),
        }),
      aoErro: (erro) => this.log.error({ liveId: entrada.liveId, erro: erro.message }, 'Erro no chat'),
      aoDesconectar: (motivo) => this.log.warn({ liveId: entrada.liveId, motivo }, 'Chat desconectado'),
    });
  }

  private classificar(texto: string): {
    categoriaReacao: CategoriaReacao;
    scoreReacao: number;
    possuiEmoteRiso: boolean;
  } {
    const resultado = classificarReacao(texto);
    return {
      categoriaReacao: resultado.categoria,
      scoreReacao: resultado.scoreReacao,
      possuiEmoteRiso: resultado.possuiEmoteRiso,
    };
  }

  private calcularOffset(inicioLive: Date, dataHora: Date): number {
    return Math.max(0, Math.floor((dataHora.getTime() - inicioLive.getTime()) / MILISSEGUNDOS_POR_SEGUNDO));
  }

  private acumular(liveId: string, mensagem: MensagemBufferizada): void {
    const coleta = this.coletas.get(liveId);
    if (!coleta || coleta.buffer.length >= TAMANHO_MAXIMO_BUFFER) return;

    coleta.buffer.push(mensagem);
  }

  private async descarregar(liveId: string): Promise<void> {
    const coleta = this.coletas.get(liveId);
    if (!coleta || coleta.buffer.length === 0) return;

    const lote = coleta.buffer;
    coleta.buffer = [];

    try {
      await this.persistirLote(liveId, lote);
    } catch (erro) {
      this.log.error({ liveId, erro: (erro as Error).message }, 'Falha ao gravar lote de chat');
    }
  }

  private async persistirLote(liveId: string, lote: readonly MensagemBufferizada[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.mensagemChat.createMany({
        data: lote.map((item) => ({ ...item, liveId, scoreReacao: new Prisma.Decimal(item.scoreReacao) })),
      }),
      ...this.montarAtualizacoesBuckets(liveId, lote),
      this.prisma.live.update({
        where: { id: liveId },
        data: { totalMensagens: { increment: lote.length }, ultimaAtividade: new Date() },
      }),
    ]);
  }

  private montarAtualizacoesBuckets(liveId: string, lote: readonly MensagemBufferizada[]) {
    return [...this.agregarPorBucket(lote)].map(([indice, agregado]) =>
      this.prisma.$executeRaw`
        INSERT INTO buckets_chat ("liveId", indice, "inicioSegundos", "quantidadeMensagens", "quantidadeMensagensComReacao", "somaScoreReacao", "categoriaDominante")
        VALUES (${liveId}::uuid, ${indice}, ${indice * DURACAO_BUCKET_SEGUNDOS}, ${agregado.quantidade}, ${agregado.comReacao}, ${agregado.somaScore}, ${agregado.categoria}::"CategoriaReacao")
        ON CONFLICT ("liveId", indice) DO UPDATE SET
          "quantidadeMensagens" = buckets_chat."quantidadeMensagens" + EXCLUDED."quantidadeMensagens",
          "quantidadeMensagensComReacao" = buckets_chat."quantidadeMensagensComReacao" + EXCLUDED."quantidadeMensagensComReacao",
          "somaScoreReacao" = buckets_chat."somaScoreReacao" + EXCLUDED."somaScoreReacao",
          "categoriaDominante" = CASE
            WHEN EXCLUDED."somaScoreReacao" > buckets_chat."somaScoreReacao" THEN EXCLUDED."categoriaDominante"
            ELSE buckets_chat."categoriaDominante"
          END,
          analisado = false
      `,
    );
  }

  private agregarPorBucket(lote: readonly MensagemBufferizada[]) {
    const agregados = new Map<number, { quantidade: number; comReacao: number; somaScore: number; categoria: CategoriaReacao }>();

    for (const mensagem of lote) {
      const indice = Math.floor(mensagem.offsetSegundos / DURACAO_BUCKET_SEGUNDOS);
      const atual = agregados.get(indice) ?? { quantidade: 0, comReacao: 0, somaScore: 0, categoria: mensagem.categoriaReacao };
      agregados.set(indice, this.acumularAgregado(atual, mensagem));
    }

    return agregados;
  }

  private acumularAgregado(
    atual: { quantidade: number; comReacao: number; somaScore: number; categoria: CategoriaReacao },
    mensagem: MensagemBufferizada,
  ) {
    const temReacao = mensagem.scoreReacao > 0;

    return {
      quantidade: atual.quantidade + 1,
      comReacao: atual.comReacao + (temReacao ? 1 : 0),
      somaScore: atual.somaScore + mensagem.scoreReacao,
      categoria: temReacao && mensagem.scoreReacao > 0 ? mensagem.categoriaReacao : atual.categoria,
    };
  }

  async encerrarColeta(liveId: string): Promise<void> {
    const coleta = this.coletas.get(liveId);
    if (!coleta) return;

    clearInterval(coleta.temporizador);
    await this.descarregar(liveId);
    await coleta.conexao.desconectar();
    this.coletas.delete(liveId);

    await this.eventos.registrar({
      etapa: EtapaPipeline.CHAT_DESCONECTADO,
      liveId,
      mensagem: 'Coleta de chat encerrada',
    });
  }

  async encerrarTudo(): Promise<void> {
    await Promise.all([...this.coletas.keys()].map((liveId) => this.encerrarColeta(liveId)));
  }
}
