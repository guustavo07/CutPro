import { CASAS_DECIMAIS_SCORE, SCORE_MAXIMO, SCORE_MINIMO } from '../constantes/pontuacao.js';

export function limitar(valor: number, minimo: number, maximo: number): number {
  if (Number.isNaN(valor)) return minimo;
  return Math.min(Math.max(valor, minimo), maximo);
}

export function limitarScore(valor: number): number {
  return limitar(valor, SCORE_MINIMO, SCORE_MAXIMO);
}

export function arredondarScore(valor: number): number {
  const fator = 10 ** CASAS_DECIMAIS_SCORE;
  return Math.round(limitarScore(valor) * fator) / fator;
}

export function media(valores: readonly number[]): number {
  if (valores.length === 0) return 0;
  return valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
}

export function mediana(valores: readonly number[]): number {
  if (valores.length === 0) return 0;

  const ordenados = [...valores].sort((primeiro, segundo) => primeiro - segundo);
  const meio = Math.floor(ordenados.length / 2);
  if (ordenados.length % 2 !== 0) return ordenados[meio] ?? 0;

  return ((ordenados[meio - 1] ?? 0) + (ordenados[meio] ?? 0)) / 2;
}
