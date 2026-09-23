import {
  BASELINE_MENSAGENS_MINIMO,
  BUCKETS_JANELA_BASELINE,
  BUCKETS_MINIMOS_PARA_BASELINE,
  DURACAO_BUCKET_SEGUNDOS,
  FATOR_SATURACAO_VOLUME,
  PESO_DENSIDADE_NO_SCORE_CHAT,
  PESO_VOLUME_NO_SCORE_CHAT,
  RAZAO_VOLUME_MINIMA_PARA_PICO,
  SCORE_CHAT_MINIMO_PARA_PICO,
  SEGUNDOS_POR_MINUTO,
} from '../constantes/chat.js';
import { CategoriaReacao } from '../enums/categoriaReacao.js';
import { arredondarScore, limitarScore, mediana } from '../utils/numeros.js';
import type { BucketChat } from './serieTemporalChat.js';

const MENSAGENS_EXCEDENTES_MINIMAS = 1;

export type ConfiguracaoDeteccaoPico = {
  readonly duracaoBucketSegundos: number;
  readonly bucketsJanelaBaseline: number;
  readonly razaoVolumeMinima: number;
  readonly scoreChatMinimo: number;
};

export const CONFIGURACAO_DETECCAO_PICO_PADRAO: ConfiguracaoDeteccaoPico = Object.freeze({
  duracaoBucketSegundos: DURACAO_BUCKET_SEGUNDOS,
  bucketsJanelaBaseline: BUCKETS_JANELA_BASELINE,
  razaoVolumeMinima: RAZAO_VOLUME_MINIMA_PARA_PICO,
  scoreChatMinimo: SCORE_CHAT_MINIMO_PARA_PICO,
});

export type PicoChat = {
  readonly instanteSegundos: number;
  readonly quantidadeMensagens: number;
  readonly mensagensPorMinuto: number;
  readonly baselineMensagensPorMinuto: number;
  readonly razaoVolume: number;
  readonly scoreVolume: number;
  readonly densidadeReacao: number;
  readonly scoreChat: number;
  readonly categoriaDominante: CategoriaReacao;
  readonly usuariosDistintosComEmoteRiso: number;
};

export function calcularScoreVolume(razaoVolume: number): number {
  if (razaoVolume <= 1) return 0;
  return limitarScore(1 - Math.exp(-FATOR_SATURACAO_VOLUME * (razaoVolume - 1)));
}

export function calcularDensidadeReacao(bucket: BucketChat, baselineMensagens: number): number {
  if (bucket.quantidadeMensagens === 0) return 0;

  const mensagensExcedentes = bucket.quantidadeMensagens - baselineMensagens;
  if (mensagensExcedentes < MENSAGENS_EXCEDENTES_MINIMAS) {
    return limitarScore(bucket.somaScoreReacao / bucket.quantidadeMensagens);
  }

  return limitarScore(bucket.somaScoreReacao / mensagensExcedentes);
}

export function calcularScoreChat(entrada: {
  readonly scoreVolume: number;
  readonly densidadeReacao: number;
}): number {
  const combinado =
    entrada.scoreVolume * PESO_VOLUME_NO_SCORE_CHAT + entrada.densidadeReacao * PESO_DENSIDADE_NO_SCORE_CHAT;
  return arredondarScore(combinado);
}

function calcularBaseline(anteriores: readonly BucketChat[]): number {
  if (anteriores.length < BUCKETS_MINIMOS_PARA_BASELINE) return 0;

  const quantidades = anteriores.map((bucket) => bucket.quantidadeMensagens);
  return Math.max(mediana(quantidades), BASELINE_MENSAGENS_MINIMO);
}

function paraMensagensPorMinuto(quantidade: number, duracaoBucketSegundos: number): number {
  return (quantidade * SEGUNDOS_POR_MINUTO) / duracaoBucketSegundos;
}

function avaliarBucket(entrada: {
  readonly bucket: BucketChat;
  readonly baseline: number;
  readonly configuracao: ConfiguracaoDeteccaoPico;
}): PicoChat | null {
  const { bucket, baseline, configuracao } = entrada;
  if (baseline === 0) return null;

  const razaoVolume = bucket.quantidadeMensagens / baseline;
  if (razaoVolume < configuracao.razaoVolumeMinima) return null;

  const scoreVolume = calcularScoreVolume(razaoVolume);
  const densidadeReacao = calcularDensidadeReacao(bucket, baseline);
  const scoreChat = calcularScoreChat({ scoreVolume, densidadeReacao });
  if (scoreChat < configuracao.scoreChatMinimo) return null;

  return montarPico({ bucket, baseline, razaoVolume, scoreVolume, densidadeReacao, scoreChat, configuracao });
}

function montarPico(entrada: {
  readonly bucket: BucketChat;
  readonly baseline: number;
  readonly razaoVolume: number;
  readonly scoreVolume: number;
  readonly densidadeReacao: number;
  readonly scoreChat: number;
  readonly configuracao: ConfiguracaoDeteccaoPico;
}): PicoChat {
  const duracao = entrada.configuracao.duracaoBucketSegundos;

  return {
    instanteSegundos: entrada.bucket.inicioSegundos + Math.floor(duracao / 2),
    quantidadeMensagens: entrada.bucket.quantidadeMensagens,
    mensagensPorMinuto: paraMensagensPorMinuto(entrada.bucket.quantidadeMensagens, duracao),
    baselineMensagensPorMinuto: paraMensagensPorMinuto(entrada.baseline, duracao),
    razaoVolume: Number(entrada.razaoVolume.toFixed(2)),
    scoreVolume: arredondarScore(entrada.scoreVolume),
    densidadeReacao: arredondarScore(entrada.densidadeReacao),
    scoreChat: entrada.scoreChat,
    categoriaDominante: entrada.bucket.categoriaDominante,
    usuariosDistintosComEmoteRiso: entrada.bucket.usuariosDistintosComEmoteRiso,
  };
}

export function detectarPicosChat(
  buckets: readonly BucketChat[],
  configuracao: ConfiguracaoDeteccaoPico = CONFIGURACAO_DETECCAO_PICO_PADRAO,
): readonly PicoChat[] {
  return buckets.flatMap((bucket, posicao) => {
    const inicioJanela = Math.max(0, posicao - configuracao.bucketsJanelaBaseline);
    const baseline = calcularBaseline(buckets.slice(inicioJanela, posicao));
    const pico = avaliarBucket({ bucket, baseline, configuracao });
    return pico ? [pico] : [];
  });
}
