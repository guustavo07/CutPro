import {
  DURACAO_MAXIMA_SEGUNDOS_PADRAO,
  DURACAO_MINIMA_SEGUNDOS_PADRAO,
  SEGUNDOS_ANTES_PADRAO,
  SEGUNDOS_DEPOIS_PADRAO,
} from '../constantes/janelaCorte.js';

export type ConfiguracaoJanelaCorte = {
  readonly segundosAntes: number;
  readonly segundosDepois: number;
  readonly duracaoMinimaSegundos: number;
  readonly duracaoMaximaSegundos: number;
};

export const CONFIGURACAO_JANELA_CORTE_PADRAO: ConfiguracaoJanelaCorte = Object.freeze({
  segundosAntes: SEGUNDOS_ANTES_PADRAO,
  segundosDepois: SEGUNDOS_DEPOIS_PADRAO,
  duracaoMinimaSegundos: DURACAO_MINIMA_SEGUNDOS_PADRAO,
  duracaoMaximaSegundos: DURACAO_MAXIMA_SEGUNDOS_PADRAO,
});

export type JanelaCorte = {
  readonly inicioSegundos: number;
  readonly fimSegundos: number;
  readonly duracaoSegundos: number;
};

function ajustarPorDuracaoMaxima(janela: JanelaCorte, duracaoMaxima: number): JanelaCorte {
  if (janela.duracaoSegundos <= duracaoMaxima) return janela;

  const fimSegundos = janela.inicioSegundos + duracaoMaxima;
  return { inicioSegundos: janela.inicioSegundos, fimSegundos, duracaoSegundos: duracaoMaxima };
}

function ajustarPorDuracaoMinima(entrada: {
  readonly janela: JanelaCorte;
  readonly duracaoMinima: number;
  readonly limiteSuperiorSegundos: number;
}): JanelaCorte {
  const { janela, duracaoMinima, limiteSuperiorSegundos } = entrada;
  if (janela.duracaoSegundos >= duracaoMinima) return janela;

  const fimDesejado = Math.min(janela.inicioSegundos + duracaoMinima, limiteSuperiorSegundos);
  const inicioSegundos = Math.max(0, fimDesejado - duracaoMinima);
  return { inicioSegundos, fimSegundos: fimDesejado, duracaoSegundos: fimDesejado - inicioSegundos };
}

export function calcularJanelaCorte(entrada: {
  readonly instantePicoSegundos: number;
  readonly configuracao?: ConfiguracaoJanelaCorte;
  readonly limiteSuperiorSegundos?: number;
}): JanelaCorte {
  const configuracao = entrada.configuracao ?? CONFIGURACAO_JANELA_CORTE_PADRAO;
  const limiteSuperior = entrada.limiteSuperiorSegundos ?? Number.POSITIVE_INFINITY;
  const inicioSegundos = Math.max(0, entrada.instantePicoSegundos - configuracao.segundosAntes);
  const fimSegundos = Math.min(limiteSuperior, entrada.instantePicoSegundos + configuracao.segundosDepois);

  const bruta: JanelaCorte = { inicioSegundos, fimSegundos, duracaoSegundos: fimSegundos - inicioSegundos };
  const limitada = ajustarPorDuracaoMaxima(bruta, configuracao.duracaoMaximaSegundos);

  return ajustarPorDuracaoMinima({
    janela: limitada,
    duracaoMinima: configuracao.duracaoMinimaSegundos,
    limiteSuperiorSegundos: limiteSuperior,
  });
}

export function janelasSeSobrepoem(primeira: JanelaCorte, segunda: JanelaCorte): boolean {
  return primeira.inicioSegundos < segunda.fimSegundos && segunda.inicioSegundos < primeira.fimSegundos;
}
