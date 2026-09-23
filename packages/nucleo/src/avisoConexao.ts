import type { RegistroLog } from './registroLog.js';

const INTERVALO_AVISO_MS = 30_000;

export function criarAvisoConexaoRedis(log: RegistroLog) {
  let ultimoAviso = 0;

  return function avisar(erro: Error): void {
    const agora = Date.now();
    if (agora - ultimoAviso < INTERVALO_AVISO_MS) return;

    ultimoAviso = agora;
    log.warn({ erro: erro.message }, 'Sem conexão com o Redis, as filas ficam indisponíveis');
  };
}
