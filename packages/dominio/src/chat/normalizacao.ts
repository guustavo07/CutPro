import {
  INTENSIDADE_MAXIMA_REPETICAO,
  MAXIMO_REPETICOES_CARACTERE,
  TAMANHO_MAXIMO_MENSAGEM_ANALISADA,
} from '../constantes/chat.js';

const REGEX_DIACRITICOS = /[\u0300-\u036f]/g;
const REGEX_EMOJI = /\p{Extended_Pictographic}/gu;
const REGEX_SEPARADOR_TOKEN = /[^\p{L}\p{N}]+/u;
const REGEX_SEQUENCIA_REPETIDA = /(.)\1+/g;
const REPETICAO_MINIMA = 1;

export type MensagemNormalizada = {
  readonly textoOriginal: string;
  readonly textoNormalizado: string;
  readonly tokens: readonly string[];
  readonly emojis: readonly string[];
  readonly intensidadeRepeticao: number;
};

export function removerDiacriticos(texto: string): string {
  return texto.normalize('NFD').replace(REGEX_DIACRITICOS, '');
}

export function reduzirRepeticoes(texto: string): string {
  return texto.replace(REGEX_SEQUENCIA_REPETIDA, (sequencia, caractere: string) =>
    caractere.repeat(Math.min(sequencia.length, MAXIMO_REPETICOES_CARACTERE)),
  );
}

export function medirMaiorRepeticao(texto: string): number {
  const sequencias = texto.match(REGEX_SEQUENCIA_REPETIDA);
  if (!sequencias) return REPETICAO_MINIMA;

  const maior = sequencias.reduce((maximo, sequencia) => Math.max(maximo, sequencia.length), REPETICAO_MINIMA);
  return Math.min(maior, INTENSIDADE_MAXIMA_REPETICAO);
}

export function extrairEmojis(texto: string): readonly string[] {
  return texto.match(REGEX_EMOJI) ?? [];
}

export function dividirEmTokens(texto: string): readonly string[] {
  return texto.split(REGEX_SEPARADOR_TOKEN).filter((token) => token.length > 0);
}

export function normalizarMensagem(texto: string): MensagemNormalizada {
  const textoLimitado = texto.trim().slice(0, TAMANHO_MAXIMO_MENSAGEM_ANALISADA);
  const semAcento = removerDiacriticos(textoLimitado.toLowerCase());
  const reduzido = reduzirRepeticoes(semAcento);

  return {
    textoOriginal: texto,
    textoNormalizado: reduzido,
    tokens: dividirEmTokens(reduzido),
    emojis: extrairEmojis(textoLimitado),
    intensidadeRepeticao: medirMaiorRepeticao(semAcento),
  };
}
