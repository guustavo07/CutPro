export const ModoProcessamento = Object.freeze({
  ECONOMICO: 'ECONOMICO',
  BALANCEADO: 'BALANCEADO',
  QUALIDADE_MAXIMA: 'QUALIDADE_MAXIMA',
});

export type ModoProcessamento = (typeof ModoProcessamento)[keyof typeof ModoProcessamento];

export type PerfilModoProcessamento = {
  readonly candidatosMaximosPorLive: number;
  readonly candidatosMaximosAnalisadosPorIa: number;
  readonly scoreMinimoParaAnaliseIa: number;
  readonly intervaloAnaliseSegundos: number;
  readonly usaAnaliseVisual: boolean;
  readonly usaAnaliseAudio: boolean;
  readonly crfRenderizacao: number;
};

export const PERFIL_POR_MODO_PROCESSAMENTO: Readonly<Record<ModoProcessamento, PerfilModoProcessamento>> =
  Object.freeze({
    [ModoProcessamento.ECONOMICO]: {
      candidatosMaximosPorLive: 30,
      candidatosMaximosAnalisadosPorIa: 8,
      scoreMinimoParaAnaliseIa: 0.8,
      intervaloAnaliseSegundos: 120,
      usaAnaliseVisual: false,
      usaAnaliseAudio: false,
      crfRenderizacao: 26,
    },
    [ModoProcessamento.BALANCEADO]: {
      candidatosMaximosPorLive: 80,
      candidatosMaximosAnalisadosPorIa: 30,
      scoreMinimoParaAnaliseIa: 0.7,
      intervaloAnaliseSegundos: 60,
      usaAnaliseVisual: false,
      usaAnaliseAudio: true,
      crfRenderizacao: 23,
    },
    [ModoProcessamento.QUALIDADE_MAXIMA]: {
      candidatosMaximosPorLive: 200,
      candidatosMaximosAnalisadosPorIa: 80,
      scoreMinimoParaAnaliseIa: 0.55,
      intervaloAnaliseSegundos: 30,
      usaAnaliseVisual: true,
      usaAnaliseAudio: true,
      crfRenderizacao: 20,
    },
  });
