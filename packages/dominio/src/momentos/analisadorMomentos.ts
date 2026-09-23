import {
  DISTANCIA_MINIMA_ENTRE_MOMENTOS_SEGUNDOS,
  INTERVALO_AGRUPAMENTO_PICOS_SEGUNDOS,
} from '../constantes/chat.js';
import { CORTES_MAXIMOS_POR_LIVE_PADRAO } from '../constantes/janelaCorte.js';
import {
  CLIPSCORE_MINIMO_PADRAO,
  PESOS_CLIPSCORE_PADRAO,
  SinalClipScore,
  type PesosClipScore,
} from '../constantes/pontuacao.js';
import { CategoriaReacao, ROTULO_POR_CATEGORIA_REACAO } from '../enums/categoriaReacao.js';
import {
  agruparPicosEmMomentos,
  descartarMomentosProximosDeExistentes,
  limitarPorScore,
  type MomentoCandidato,
} from './agrupadorMomentos.js';
import { calcularClipScore } from './clipScore.js';
import {
  CONFIGURACAO_DETECCAO_PICO_PADRAO,
  detectarPicosChat,
  type ConfiguracaoDeteccaoPico,
} from './detectorPicos.js';
import {
  calcularJanelaCorte,
  CONFIGURACAO_JANELA_CORTE_PADRAO,
  type ConfiguracaoJanelaCorte,
  type JanelaCorte,
} from './janelaCorte.js';
import { construirBucketsChat, type BucketChat, type MensagemAnalisada } from './serieTemporalChat.js';

const DENSIDADE_REACAO_ALTA = 0.7;
const RAZAO_VOLUME_MUITO_ALTA = 5;

export type ConfiguracaoAnaliseMomentos = {
  readonly deteccaoPico: ConfiguracaoDeteccaoPico;
  readonly janelaCorte: ConfiguracaoJanelaCorte;
  readonly pesos: PesosClipScore;
  readonly clipScoreMinimo: number;
  readonly intervaloAgrupamentoSegundos: number;
  readonly distanciaMinimaEntreMomentosSegundos: number;
  readonly quantidadeMaximaMomentos: number;
};

export const CONFIGURACAO_ANALISE_MOMENTOS_PADRAO: ConfiguracaoAnaliseMomentos = Object.freeze({
  deteccaoPico: CONFIGURACAO_DETECCAO_PICO_PADRAO,
  janelaCorte: CONFIGURACAO_JANELA_CORTE_PADRAO,
  pesos: PESOS_CLIPSCORE_PADRAO,
  clipScoreMinimo: CLIPSCORE_MINIMO_PADRAO,
  intervaloAgrupamentoSegundos: INTERVALO_AGRUPAMENTO_PICOS_SEGUNDOS,
  distanciaMinimaEntreMomentosSegundos: DISTANCIA_MINIMA_ENTRE_MOMENTOS_SEGUNDOS,
  quantidadeMaximaMomentos: CORTES_MAXIMOS_POR_LIVE_PADRAO,
});

export type MomentoAnalisado = {
  readonly instantePicoSegundos: number;
  readonly janela: JanelaCorte;
  readonly chatScore: number;
  readonly clipScore: number;
  readonly categoriaDominante: CategoriaReacao;
  readonly quantidadeMensagens: number;
  readonly mensagensPorMinuto: number;
  readonly baselineMensagensPorMinuto: number;
  readonly motivos: readonly string[];
};

function descreverVolume(candidato: MomentoCandidato): string {
  const principal = candidato.picoPrincipal;
  const mensagensPorMinuto = Math.round(principal.mensagensPorMinuto);
  const baseline = Math.round(principal.baselineMensagensPorMinuto);
  return `Pico de chat: ${mensagensPorMinuto} msg/min contra ${baseline} msg/min de média`;
}

function montarMotivos(candidato: MomentoCandidato): readonly string[] {
  const principal = candidato.picoPrincipal;
  const motivos = [descreverVolume(candidato)];

  if (candidato.categoriaDominante !== CategoriaReacao.NEUTRO) {
    motivos.push(`Reação dominante: ${ROTULO_POR_CATEGORIA_REACAO[candidato.categoriaDominante]}`);
  }
  if ((principal.densidadeReacao) >= DENSIDADE_REACAO_ALTA) {
    motivos.push('Alta concentração de reações na mesma janela');
  }
  if ((principal.razaoVolume) >= RAZAO_VOLUME_MUITO_ALTA) {
    motivos.push('Volume de chat muito acima do normal da live');
  }

  return motivos;
}

function analisarCandidato(entrada: {
  readonly candidato: MomentoCandidato;
  readonly configuracao: ConfiguracaoAnaliseMomentos;
  readonly duracaoLiveSegundos?: number;
}): MomentoAnalisado {
  const { candidato, configuracao } = entrada;
  const principal = candidato.picoPrincipal;

  return {
    instantePicoSegundos: candidato.instantePicoSegundos,
    janela: calcularJanelaCorte({
      instantePicoSegundos: candidato.instantePicoSegundos,
      configuracao: configuracao.janelaCorte,
      limiteSuperiorSegundos: entrada.duracaoLiveSegundos,
    }),
    chatScore: candidato.scoreChat,
    clipScore: calcularClipScore({ [SinalClipScore.CHAT]: candidato.scoreChat }, configuracao.pesos),
    categoriaDominante: candidato.categoriaDominante,
    quantidadeMensagens: candidato.quantidadeMensagens,
    mensagensPorMinuto: Math.round(principal.mensagensPorMinuto),
    baselineMensagensPorMinuto: Math.round(principal.baselineMensagensPorMinuto),
    motivos: montarMotivos(candidato),
  };
}

export function analisarMomentosDaLive(entrada: {
  readonly mensagens: readonly MensagemAnalisada[];
  readonly configuracao?: ConfiguracaoAnaliseMomentos;
  readonly instantesExistentesSegundos?: readonly number[];
  readonly duracaoLiveSegundos?: number;
}): readonly MomentoAnalisado[] {
  const configuracao = entrada.configuracao ?? CONFIGURACAO_ANALISE_MOMENTOS_PADRAO;

  return analisarMomentosPorBuckets({
    ...entrada,
    configuracao,
    buckets: construirBucketsChat(entrada.mensagens, configuracao.deteccaoPico.duracaoBucketSegundos),
  });
}

export function analisarMomentosPorBuckets(entrada: {
  readonly buckets: readonly BucketChat[];
  readonly configuracao?: ConfiguracaoAnaliseMomentos;
  readonly instantesExistentesSegundos?: readonly number[];
  readonly duracaoLiveSegundos?: number;
}): readonly MomentoAnalisado[] {
  const configuracao = entrada.configuracao ?? CONFIGURACAO_ANALISE_MOMENTOS_PADRAO;
  const picos = detectarPicosChat(entrada.buckets, configuracao.deteccaoPico);
  const candidatos = agruparPicosEmMomentos(picos, configuracao.intervaloAgrupamentoSegundos);

  const ineditos = descartarMomentosProximosDeExistentes({
    candidatos,
    instantesExistentesSegundos: entrada.instantesExistentesSegundos ?? [],
    distanciaMinimaSegundos: configuracao.distanciaMinimaEntreMomentosSegundos,
  });

  return limitarPorScore(ineditos, configuracao.quantidadeMaximaMomentos)
    .map((candidato) => analisarCandidato({ candidato, configuracao, duracaoLiveSegundos: entrada.duracaoLiveSegundos }))
    .filter((momento) => momento.clipScore >= configuracao.clipScoreMinimo);
}
