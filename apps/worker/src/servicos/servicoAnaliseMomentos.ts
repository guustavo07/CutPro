import { CategoriaReacao, Prisma, StatusCorte, StatusLive, type PrismaClient } from '@cutpro/banco';
import { interpretarConfiguracaoCanal, NomeFila, NomeJob, type ConfiguracaoCanal } from '@cutpro/contratos';
import {
  analisarMomentosPorBuckets,
  CONFIGURACAO_ANALISE_MOMENTOS_PADRAO,
  CONFIGURACAO_DETECCAO_PICO_PADRAO,
  DURACAO_BUCKET_SEGUNDOS,
  PERFIL_POR_MODO_PROCESSAMENTO,
  type BucketChat,
  type ConfiguracaoAnaliseMomentos,
  type MomentoAnalisado,
} from '@cutpro/dominio';
import type { ProdutorFilas } from '@cutpro/filas';
import type { RegistroLog } from '@cutpro/nucleo';
import { EtapaPipeline, type RegistroEventos } from './registroEventos.js';

const MILISSEGUNDOS_POR_SEGUNDO = 1000;

type LiveComCanal = Prisma.LiveGetPayload<{ include: { canal: true } }>;

function montarBucketVazio(indice: number): BucketChat {
  return {
    indice,
    inicioSegundos: indice * DURACAO_BUCKET_SEGUNDOS,
    quantidadeMensagens: 0,
    quantidadeMensagensComReacao: 0,
    somaScoreReacao: 0,
    categoriaDominante: CategoriaReacao.NEUTRO,
    usuariosDistintosComEmoteRiso: 0,
  };
}

function preencherSlotsSemMensagem(gravados: ReadonlyMap<number, BucketChat>): BucketChat[] {
  const indices = [...gravados.keys()];
  const primeiro = Math.min(...indices);
  const ultimo = Math.max(...indices);
  const serie: BucketChat[] = [];

  for (let indice = primeiro; indice <= ultimo; indice += 1) {
    serie.push(gravados.get(indice) ?? montarBucketVazio(indice));
  }

  return serie;
}

function montarConfiguracaoAnalise(configuracao: ConfiguracaoCanal): ConfiguracaoAnaliseMomentos {
  const perfil = PERFIL_POR_MODO_PROCESSAMENTO[configuracao.modoProcessamento];

  return {
    ...CONFIGURACAO_ANALISE_MOMENTOS_PADRAO,
    deteccaoPico: CONFIGURACAO_DETECCAO_PICO_PADRAO,
    pesos: configuracao.pesos,
    clipScoreMinimo: configuracao.clipScoreMinimo,
    quantidadeMaximaMomentos: Math.min(configuracao.cortesMaximosPorLive, perfil.candidatosMaximosPorLive),
    janelaCorte: {
      segundosAntes: configuracao.segundosAntes,
      segundosDepois: configuracao.segundosDepois,
      duracaoMinimaSegundos: configuracao.duracaoMinimaSegundos,
      duracaoMaximaSegundos: configuracao.duracaoMaximaSegundos,
    },
  };
}

export class ServicoAnaliseMomentos {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly filas: ProdutorFilas,
    private readonly eventos: RegistroEventos,
    private readonly log: RegistroLog,
  ) {}

  async analisarLive(liveId: string): Promise<void> {
    const live = await this.prisma.live.findUnique({ where: { id: liveId }, include: { canal: true } });
    if (!live) return;

    const buckets = await this.carregarBuckets(liveId);
    if (buckets.length === 0) return;

    const configuracao = interpretarConfiguracaoCanal(live.canal.configuracao);
    const momentos = analisarMomentosPorBuckets({
      buckets,
      configuracao: montarConfiguracaoAnalise(configuracao),
      instantesExistentesSegundos: await this.listarInstantesExistentes(liveId),
      duracaoLiveSegundos: this.calcularDuracaoLive(live),
    });

    await this.persistirMomentos({ live, momentos, configuracao });
    await this.marcarBucketsAnalisados(liveId);
  }

  private async carregarBuckets(liveId: string): Promise<BucketChat[]> {
    const registros = await this.prisma.bucketChat.findMany({
      where: { liveId },
      orderBy: { indice: 'asc' },
    });
    if (registros.length === 0) return [];

    const usuariosPorBucket = await this.contarUsuariosComEmoteRiso(liveId);
    const gravados = new Map(
      registros.map((registro) => [
        registro.indice,
        {
          indice: registro.indice,
          inicioSegundos: registro.inicioSegundos,
          quantidadeMensagens: registro.quantidadeMensagens,
          quantidadeMensagensComReacao: registro.quantidadeMensagensComReacao,
          somaScoreReacao: Number(registro.somaScoreReacao),
          categoriaDominante: registro.categoriaDominante,
          usuariosDistintosComEmoteRiso: usuariosPorBucket.get(registro.indice) ?? 0,
        },
      ]),
    );

    return preencherSlotsSemMensagem(gravados);
  }

  private async contarUsuariosComEmoteRiso(liveId: string): Promise<Map<number, number>> {
    const linhas = await this.prisma.$queryRaw<{ indice: number; usuarios: bigint }[]>`
      SELECT ("offsetSegundos" / ${DURACAO_BUCKET_SEGUNDOS})::int AS indice, COUNT(DISTINCT usuario) AS usuarios
      FROM mensagens_chat
      WHERE "liveId" = ${liveId}::uuid AND "possuiEmoteRiso" = true
      GROUP BY 1
    `;

    return new Map(linhas.map((linha) => [linha.indice, Number(linha.usuarios)]));
  }

  private async listarInstantesExistentes(liveId: string): Promise<number[]> {
    const momentos = await this.prisma.momentoDetectado.findMany({
      where: { liveId },
      select: { instantePicoSegundos: true },
    });

    return momentos.map((momento) => momento.instantePicoSegundos);
  }

  private calcularDuracaoLive(live: LiveComCanal): number {
    const referencia = live.status === StatusLive.AO_VIVO ? new Date() : (live.fim ?? new Date());
    return Math.max(0, Math.floor((referencia.getTime() - live.inicio.getTime()) / MILISSEGUNDOS_POR_SEGUNDO));
  }

  private async persistirMomentos(entrada: {
    readonly live: LiveComCanal;
    readonly momentos: readonly MomentoAnalisado[];
    readonly configuracao: ConfiguracaoCanal;
  }): Promise<void> {
    for (const momento of entrada.momentos) {
      await this.persistirMomento(entrada.live, momento, entrada.configuracao);
    }
  }

  private async persistirMomento(
    live: LiveComCanal,
    momento: MomentoAnalisado,
    configuracao: ConfiguracaoCanal,
  ): Promise<void> {
    const registro = await this.criarMomento(live.id, momento);
    if (!registro) return;

    await this.eventos.registrar({
      etapa: EtapaPipeline.CANDIDATO_CRIADO,
      liveId: live.id,
      mensagem: `Candidato a corte em ${momento.instantePicoSegundos}s com ClipScore ${momento.clipScore}`,
      contexto: { clipScore: momento.clipScore, motivos: momento.motivos },
    });

    if (!live.canal.geracaoAutomaticaAtiva) return;

    await this.criarCorte({ live, momento, momentoId: registro.id, configuracao });
  }

  private async criarMomento(liveId: string, momento: MomentoAnalisado) {
    try {
      return await this.prisma.momentoDetectado.create({
        data: {
          liveId,
          instantePicoSegundos: momento.instantePicoSegundos,
          inicioSegundos: momento.janela.inicioSegundos,
          fimSegundos: momento.janela.fimSegundos,
          chatScore: new Prisma.Decimal(momento.chatScore),
          clipScore: new Prisma.Decimal(momento.clipScore),
          categoriaDominante: momento.categoriaDominante,
          quantidadeMensagens: momento.quantidadeMensagens,
          mensagensPorMinuto: momento.mensagensPorMinuto,
          baselineMensagensPorMinuto: momento.baselineMensagensPorMinuto,
          usuariosDistintosEmoteRiso: momento.usuariosDistintosComEmoteRiso,
          motivos: [...momento.motivos],
        },
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') return null;
      throw erro;
    }
  }

  private async criarCorte(entrada: {
    readonly live: LiveComCanal;
    readonly momento: MomentoAnalisado;
    readonly momentoId: string;
    readonly configuracao: ConfiguracaoCanal;
  }): Promise<void> {
    const { live, momento, momentoId, configuracao } = entrada;
    const corte = await this.prisma.corte.create({
      data: {
        liveId: live.id,
        momentoDetectadoId: momentoId,
        inicioSegundos: momento.janela.inicioSegundos,
        fimSegundos: momento.janela.fimSegundos,
        duracaoSegundos: momento.janela.duracaoSegundos,
        clipScore: new Prisma.Decimal(momento.clipScore),
        template: configuracao.template,
        hashtags: configuracao.hashtagsPadrao,
        status: StatusCorte.AGUARDANDO_PROCESSAMENTO,
      },
    });

    await this.filas.enfileirar({
      fila: NomeFila.PROCESSAMENTO_VIDEO,
      job: NomeJob.PROCESSAR_CORTE,
      dados: { corteId: corte.id },
      opcoes: { jobId: `${NomeJob.PROCESSAR_CORTE}:${corte.id}` },
    });
    this.log.info({ corteId: corte.id, clipScore: momento.clipScore }, 'Corte enfileirado para processamento');
  }

  private async marcarBucketsAnalisados(liveId: string): Promise<void> {
    await this.prisma.bucketChat.updateMany({ where: { liveId, analisado: false }, data: { analisado: true } });
  }
}
