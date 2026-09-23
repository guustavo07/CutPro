export const CategoriaReacao = Object.freeze({
  HUMOR: 'HUMOR',
  SURPRESA: 'SURPRESA',
  HYPE: 'HYPE',
  NEGATIVO: 'NEGATIVO',
  VITORIA: 'VITORIA',
  DERROTA: 'DERROTA',
  CONFUSAO: 'CONFUSAO',
  CHOQUE: 'CHOQUE',
  NEUTRO: 'NEUTRO',
});

export type CategoriaReacao = (typeof CategoriaReacao)[keyof typeof CategoriaReacao];

export const PESO_POR_CATEGORIA_REACAO: Readonly<Record<CategoriaReacao, number>> = Object.freeze({
  [CategoriaReacao.HUMOR]: 1,
  [CategoriaReacao.CHOQUE]: 1,
  [CategoriaReacao.SURPRESA]: 0.95,
  [CategoriaReacao.HYPE]: 0.9,
  [CategoriaReacao.VITORIA]: 0.85,
  [CategoriaReacao.DERROTA]: 0.75,
  [CategoriaReacao.CONFUSAO]: 0.6,
  [CategoriaReacao.NEGATIVO]: 0.5,
  [CategoriaReacao.NEUTRO]: 0,
});

export const ROTULO_POR_CATEGORIA_REACAO: Readonly<Record<CategoriaReacao, string>> = Object.freeze({
  [CategoriaReacao.HUMOR]: 'Humor',
  [CategoriaReacao.SURPRESA]: 'Surpresa',
  [CategoriaReacao.HYPE]: 'Hype',
  [CategoriaReacao.NEGATIVO]: 'Negativo',
  [CategoriaReacao.VITORIA]: 'Vitória',
  [CategoriaReacao.DERROTA]: 'Derrota',
  [CategoriaReacao.CONFUSAO]: 'Confusão',
  [CategoriaReacao.CHOQUE]: 'Choque',
  [CategoriaReacao.NEUTRO]: 'Neutro',
});
