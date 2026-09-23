import { INTENSIDADE_MAXIMA_REPETICAO } from '../constantes/chat.js';
import { CategoriaReacao, PESO_POR_CATEGORIA_REACAO } from '../enums/categoriaReacao.js';
import { arredondarScore } from '../utils/numeros.js';
import {
  CATEGORIA_POR_EMOJI,
  CATEGORIA_POR_TOKEN_EXATO,
  REGRAS_FRASE,
  REGRAS_TOKEN,
} from './lexicoReacoes.js';
import { normalizarMensagem, type MensagemNormalizada } from './normalizacao.js';

const FATOR_INTENSIDADE_MINIMO = 0.6;
const FATOR_INTENSIDADE_MAXIMO = 1;
const OCORRENCIAS_PARA_INTENSIDADE_MAXIMA = 3;
const SCORE_NEUTRO = 0;

export type OcorrenciaReacao = {
  readonly identificador: string;
  readonly categoria: CategoriaReacao;
};

export type ResultadoClassificacao = {
  readonly categoria: CategoriaReacao;
  readonly scoreReacao: number;
  readonly ocorrencias: readonly OcorrenciaReacao[];
};

const RESULTADO_NEUTRO: ResultadoClassificacao = Object.freeze({
  categoria: CategoriaReacao.NEUTRO,
  scoreReacao: SCORE_NEUTRO,
  ocorrencias: Object.freeze([]),
});

function coletarPorToken(tokens: readonly string[]): OcorrenciaReacao[] {
  return tokens.flatMap((token) => {
    const categoriaExata = CATEGORIA_POR_TOKEN_EXATO.get(token);
    if (categoriaExata) return [{ identificador: `token:${token}`, categoria: categoriaExata }];

    return REGRAS_TOKEN.filter((regra) => regra.padrao.test(token)).map((regra) => ({
      identificador: regra.identificador,
      categoria: regra.categoria,
    }));
  });
}

function coletarPorFrase(textoNormalizado: string): OcorrenciaReacao[] {
  return REGRAS_FRASE.filter((regra) => regra.padrao.test(textoNormalizado)).map((regra) => ({
    identificador: regra.identificador,
    categoria: regra.categoria,
  }));
}

function coletarPorEmoji(emojis: readonly string[]): OcorrenciaReacao[] {
  return emojis.flatMap((emoji) => {
    const categoria = CATEGORIA_POR_EMOJI.get(emoji);
    if (!categoria) return [];
    return [{ identificador: `emoji:${emoji}`, categoria }];
  });
}

function escolherCategoriaDominante(ocorrencias: readonly OcorrenciaReacao[]): CategoriaReacao {
  return ocorrencias.reduce<CategoriaReacao>((dominante, ocorrencia) => {
    const pesoAtual = PESO_POR_CATEGORIA_REACAO[ocorrencia.categoria];
    const pesoDominante = PESO_POR_CATEGORIA_REACAO[dominante];
    return pesoAtual > pesoDominante ? ocorrencia.categoria : dominante;
  }, CategoriaReacao.NEUTRO);
}

function calcularFatorIntensidade(entrada: {
  readonly intensidadeRepeticao: number;
  readonly quantidadeOcorrencias: number;
}): number {
  const progressoRepeticao = (entrada.intensidadeRepeticao - 1) / (INTENSIDADE_MAXIMA_REPETICAO - 1);
  const progressoOcorrencias =
    Math.min(entrada.quantidadeOcorrencias - 1, OCORRENCIAS_PARA_INTENSIDADE_MAXIMA) /
    OCORRENCIAS_PARA_INTENSIDADE_MAXIMA;
  const progresso = Math.max(progressoRepeticao, progressoOcorrencias);

  return FATOR_INTENSIDADE_MINIMO + (FATOR_INTENSIDADE_MAXIMO - FATOR_INTENSIDADE_MINIMO) * progresso;
}

export function classificarMensagemNormalizada(mensagem: MensagemNormalizada): ResultadoClassificacao {
  const ocorrencias = [
    ...coletarPorToken(mensagem.tokens),
    ...coletarPorFrase(mensagem.textoNormalizado),
    ...coletarPorEmoji(mensagem.emojis),
  ];
  if (ocorrencias.length === 0) return RESULTADO_NEUTRO;

  const categoria = escolherCategoriaDominante(ocorrencias);
  const fatorIntensidade = calcularFatorIntensidade({
    intensidadeRepeticao: mensagem.intensidadeRepeticao,
    quantidadeOcorrencias: ocorrencias.length,
  });

  return {
    categoria,
    scoreReacao: arredondarScore(PESO_POR_CATEGORIA_REACAO[categoria] * fatorIntensidade),
    ocorrencias,
  };
}

export function classificarReacao(texto: string): ResultadoClassificacao {
  return classificarMensagemNormalizada(normalizarMensagem(texto));
}
