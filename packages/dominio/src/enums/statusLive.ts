export const StatusLive = Object.freeze({
  AO_VIVO: 'AO_VIVO',
  ENCERRADA: 'ENCERRADA',
  PROCESSANDO_VOD: 'PROCESSANDO_VOD',
  ERRO: 'ERRO',
});

export type StatusLive = (typeof StatusLive)[keyof typeof StatusLive];
