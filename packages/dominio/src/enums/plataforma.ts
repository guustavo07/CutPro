export const Plataforma = Object.freeze({
  TWITCH: 'TWITCH',
  KICK: 'KICK',
});

export type Plataforma = (typeof Plataforma)[keyof typeof Plataforma];

export const PLATAFORMAS_SUPORTADAS = Object.freeze(Object.values(Plataforma));

export function ehPlataformaSuportada(valor: string): valor is Plataforma {
  return PLATAFORMAS_SUPORTADAS.includes(valor as Plataforma);
}
