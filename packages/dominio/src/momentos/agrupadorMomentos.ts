import {
  DISTANCIA_MINIMA_ENTRE_MOMENTOS_SEGUNDOS,
  INTERVALO_AGRUPAMENTO_PICOS_SEGUNDOS,
} from '../constantes/chat.js';
import { CategoriaReacao } from '../enums/categoriaReacao.js';
import type { PicoChat } from './detectorPicos.js';

export type MomentoCandidato = {
  readonly instantePicoSegundos: number;
  readonly inicioPicosSegundos: number;
  readonly fimPicosSegundos: number;
  readonly scoreChat: number;
  readonly quantidadeMensagens: number;
  readonly categoriaDominante: CategoriaReacao;
  readonly picoPrincipal: PicoChat;
  readonly picos: readonly PicoChat[];
};

function escolherPicoPrincipal(grupo: readonly PicoChat[]): PicoChat | undefined {
  return grupo.reduce<PicoChat | undefined>((principal, pico) => {
    if (!principal) return pico;
    return pico.scoreChat > principal.scoreChat ? pico : principal;
  }, undefined);
}

function consolidarGrupo(grupo: readonly PicoChat[]): MomentoCandidato | null {
  const principal = escolherPicoPrincipal(grupo);
  const primeiro = grupo[0];
  const ultimo = grupo[grupo.length - 1];
  if (!principal || !primeiro || !ultimo) return null;

  return {
    instantePicoSegundos: principal.instanteSegundos,
    inicioPicosSegundos: primeiro.instanteSegundos,
    fimPicosSegundos: ultimo.instanteSegundos,
    scoreChat: principal.scoreChat,
    quantidadeMensagens: grupo.reduce((soma, pico) => soma + pico.quantidadeMensagens, 0),
    categoriaDominante: principal.categoriaDominante,
    picoPrincipal: principal,
    picos: grupo,
  };
}

function pertenceAoGrupo(grupo: readonly PicoChat[], pico: PicoChat, intervaloSegundos: number): boolean {
  const ultimo = grupo[grupo.length - 1];
  if (!ultimo) return true;
  return pico.instanteSegundos - ultimo.instanteSegundos <= intervaloSegundos;
}

export function agruparPicosEmMomentos(
  picos: readonly PicoChat[],
  intervaloSegundos: number = INTERVALO_AGRUPAMENTO_PICOS_SEGUNDOS,
): readonly MomentoCandidato[] {
  const ordenados = [...picos].sort((primeiro, segundo) => primeiro.instanteSegundos - segundo.instanteSegundos);
  const grupos: PicoChat[][] = [];

  for (const pico of ordenados) {
    const grupoAtual = grupos[grupos.length - 1];
    if (grupoAtual && pertenceAoGrupo(grupoAtual, pico, intervaloSegundos)) {
      grupoAtual.push(pico);
      continue;
    }
    grupos.push([pico]);
  }

  return grupos.flatMap((grupo) => {
    const momento = consolidarGrupo(grupo);
    return momento ? [momento] : [];
  });
}

export function descartarMomentosProximosDeExistentes(entrada: {
  readonly candidatos: readonly MomentoCandidato[];
  readonly instantesExistentesSegundos: readonly number[];
  readonly distanciaMinimaSegundos?: number;
}): readonly MomentoCandidato[] {
  const distancia = entrada.distanciaMinimaSegundos ?? DISTANCIA_MINIMA_ENTRE_MOMENTOS_SEGUNDOS;

  return entrada.candidatos.filter((candidato) =>
    entrada.instantesExistentesSegundos.every(
      (instante) => Math.abs(instante - candidato.instantePicoSegundos) >= distancia,
    ),
  );
}

export function limitarPorScore(
  candidatos: readonly MomentoCandidato[],
  quantidadeMaxima: number,
): readonly MomentoCandidato[] {
  return [...candidatos]
    .sort((primeiro, segundo) => segundo.scoreChat - primeiro.scoreChat)
    .slice(0, Math.max(0, quantidadeMaxima));
}
