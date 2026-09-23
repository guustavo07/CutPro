import {
  PESOS_CLIPSCORE_PADRAO,
  SinalClipScore,
  type PesosClipScore,
} from '../constantes/pontuacao.js';
import { arredondarScore, limitarScore } from '../utils/numeros.js';

export type SinaisMomento = Partial<Readonly<Record<SinalClipScore, number>>>;

export type ContribuicaoSinal = {
  readonly sinal: SinalClipScore;
  readonly valor: number;
  readonly pesoEfetivo: number;
  readonly contribuicao: number;
};

export type ResultadoClipScore = {
  readonly clipScore: number;
  readonly contribuicoes: readonly ContribuicaoSinal[];
};

const CLIPSCORE_SEM_SINAIS: ResultadoClipScore = Object.freeze({
  clipScore: 0,
  contribuicoes: Object.freeze([]),
});

function listarSinaisPresentes(sinais: SinaisMomento): readonly SinalClipScore[] {
  return Object.values(SinalClipScore).filter((sinal) => typeof sinais[sinal] === 'number');
}

function somarPesos(sinais: readonly SinalClipScore[], pesos: PesosClipScore): number {
  return sinais.reduce((soma, sinal) => soma + pesos[sinal], 0);
}

export function calcularClipScoreDetalhado(
  sinais: SinaisMomento,
  pesos: PesosClipScore = PESOS_CLIPSCORE_PADRAO,
): ResultadoClipScore {
  const presentes = listarSinaisPresentes(sinais);
  const pesoTotal = somarPesos(presentes, pesos);
  if (pesoTotal <= 0) return CLIPSCORE_SEM_SINAIS;

  const contribuicoes = presentes.map((sinal) => montarContribuicao({ sinal, sinais, pesos, pesoTotal }));
  const clipScore = contribuicoes.reduce((soma, item) => soma + item.contribuicao, 0);

  return { clipScore: arredondarScore(clipScore), contribuicoes };
}

function montarContribuicao(entrada: {
  readonly sinal: SinalClipScore;
  readonly sinais: SinaisMomento;
  readonly pesos: PesosClipScore;
  readonly pesoTotal: number;
}): ContribuicaoSinal {
  const valor = limitarScore(entrada.sinais[entrada.sinal] ?? 0);
  const pesoEfetivo = entrada.pesos[entrada.sinal] / entrada.pesoTotal;

  return {
    sinal: entrada.sinal,
    valor: arredondarScore(valor),
    pesoEfetivo: arredondarScore(pesoEfetivo),
    contribuicao: valor * pesoEfetivo,
  };
}

export function calcularClipScore(
  sinais: SinaisMomento,
  pesos: PesosClipScore = PESOS_CLIPSCORE_PADRAO,
): number {
  return calcularClipScoreDetalhado(sinais, pesos).clipScore;
}

export function normalizarPesos(pesos: PesosClipScore): PesosClipScore {
  const total = somarPesos(Object.values(SinalClipScore), pesos);
  if (total <= 0) return PESOS_CLIPSCORE_PADRAO;

  const entradas = Object.values(SinalClipScore).map((sinal) => [sinal, pesos[sinal] / total] as const);
  return Object.freeze(Object.fromEntries(entradas)) as PesosClipScore;
}
