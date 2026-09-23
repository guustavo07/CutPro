export const StatusPublicacao = Object.freeze({
  AGENDADA: 'AGENDADA',
  ENVIANDO: 'ENVIANDO',
  PUBLICADA: 'PUBLICADA',
  FALHA: 'FALHA',
  CANCELADA: 'CANCELADA',
});

export type StatusPublicacao = (typeof StatusPublicacao)[keyof typeof StatusPublicacao];

export const PlataformaPublicacao = Object.freeze({
  TIKTOK: 'TIKTOK',
  INSTAGRAM_REELS: 'INSTAGRAM_REELS',
  YOUTUBE_SHORTS: 'YOUTUBE_SHORTS',
});

export type PlataformaPublicacao = (typeof PlataformaPublicacao)[keyof typeof PlataformaPublicacao];
