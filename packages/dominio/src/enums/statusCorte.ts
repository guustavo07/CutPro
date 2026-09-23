export const StatusCorte = Object.freeze({
  DETECTADO: 'DETECTADO',
  AGUARDANDO_PROCESSAMENTO: 'AGUARDANDO_PROCESSAMENTO',
  PROCESSANDO: 'PROCESSANDO',
  TRANSCREVENDO: 'TRANSCREVENDO',
  GERANDO_LEGENDAS: 'GERANDO_LEGENDAS',
  RENDERIZANDO: 'RENDERIZANDO',
  PRONTO: 'PRONTO',
  APROVADO: 'APROVADO',
  REJEITADO: 'REJEITADO',
  PUBLICANDO: 'PUBLICANDO',
  PUBLICADO: 'PUBLICADO',
  ERRO: 'ERRO',
});

export type StatusCorte = (typeof StatusCorte)[keyof typeof StatusCorte];

export const STATUS_CORTE_EM_PROCESSAMENTO: readonly StatusCorte[] = Object.freeze([
  StatusCorte.AGUARDANDO_PROCESSAMENTO,
  StatusCorte.PROCESSANDO,
  StatusCorte.TRANSCREVENDO,
  StatusCorte.GERANDO_LEGENDAS,
  StatusCorte.RENDERIZANDO,
  StatusCorte.PUBLICANDO,
]);

export const STATUS_CORTE_FINAIS: readonly StatusCorte[] = Object.freeze([
  StatusCorte.PUBLICADO,
  StatusCorte.REJEITADO,
]);

const TRANSICOES_PERMITIDAS: Readonly<Record<StatusCorte, readonly StatusCorte[]>> = Object.freeze({
  [StatusCorte.DETECTADO]: [StatusCorte.AGUARDANDO_PROCESSAMENTO, StatusCorte.REJEITADO, StatusCorte.ERRO],
  [StatusCorte.AGUARDANDO_PROCESSAMENTO]: [StatusCorte.PROCESSANDO, StatusCorte.REJEITADO, StatusCorte.ERRO],
  [StatusCorte.PROCESSANDO]: [StatusCorte.TRANSCREVENDO, StatusCorte.RENDERIZANDO, StatusCorte.ERRO],
  [StatusCorte.TRANSCREVENDO]: [StatusCorte.GERANDO_LEGENDAS, StatusCorte.ERRO],
  [StatusCorte.GERANDO_LEGENDAS]: [StatusCorte.RENDERIZANDO, StatusCorte.ERRO],
  [StatusCorte.RENDERIZANDO]: [StatusCorte.PRONTO, StatusCorte.ERRO],
  [StatusCorte.PRONTO]: [StatusCorte.APROVADO, StatusCorte.REJEITADO, StatusCorte.AGUARDANDO_PROCESSAMENTO, StatusCorte.ERRO],
  [StatusCorte.APROVADO]: [StatusCorte.PUBLICANDO, StatusCorte.REJEITADO, StatusCorte.AGUARDANDO_PROCESSAMENTO],
  [StatusCorte.REJEITADO]: [StatusCorte.AGUARDANDO_PROCESSAMENTO],
  [StatusCorte.PUBLICANDO]: [StatusCorte.PUBLICADO, StatusCorte.ERRO],
  [StatusCorte.PUBLICADO]: [],
  [StatusCorte.ERRO]: [StatusCorte.AGUARDANDO_PROCESSAMENTO, StatusCorte.REJEITADO],
});

export function podeTransicionarCorte(atual: StatusCorte, proximo: StatusCorte): boolean {
  return TRANSICOES_PERMITIDAS[atual].includes(proximo);
}
