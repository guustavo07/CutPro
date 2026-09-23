export const SEGUNDOS_ANTES_PADRAO = 15;
export const SEGUNDOS_DEPOIS_PADRAO = 45;
export const DURACAO_MINIMA_SEGUNDOS_PADRAO = 30;
export const DURACAO_MAXIMA_SEGUNDOS_PADRAO = 90;
export const CORTES_MAXIMOS_POR_LIVE_PADRAO = 10;

export const LARGURA_VERTICAL = 1080;
export const ALTURA_VERTICAL = 1920;
export const QUADROS_POR_SEGUNDO_PADRAO = 30;

export const REGIAO_WEBCAM_PADRAO = Object.freeze({
  x: 0,
  y: 0,
  largura: 0.3,
  altura: 0.3,
});

export const DESLOCAMENTO_GAMEPLAY_PADRAO = 0.72;

export type RegiaoWebcam = {
  readonly x: number;
  readonly y: number;
  readonly largura: number;
  readonly altura: number;
};
