export const SinalClipScore = Object.freeze({
  CHAT: 'chat',
  AUDIO: 'audio',
  TRANSCRICAO: 'transcricao',
  VISUAL: 'visual',
  ESPECTADORES: 'espectadores',
});

export type SinalClipScore = (typeof SinalClipScore)[keyof typeof SinalClipScore];

export type PesosClipScore = Readonly<Record<SinalClipScore, number>>;

export const PESOS_CLIPSCORE_PADRAO: PesosClipScore = Object.freeze({
  [SinalClipScore.CHAT]: 0.35,
  [SinalClipScore.AUDIO]: 0.2,
  [SinalClipScore.TRANSCRICAO]: 0.25,
  [SinalClipScore.VISUAL]: 0.1,
  [SinalClipScore.ESPECTADORES]: 0.1,
});

export const SCORE_MINIMO = 0;
export const SCORE_MAXIMO = 1;
export const CLIPSCORE_MINIMO_PADRAO = 0.75;
export const CASAS_DECIMAIS_SCORE = 4;
