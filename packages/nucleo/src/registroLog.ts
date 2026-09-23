import pino, { type Logger } from 'pino';

const NIVEL_PADRAO = 'info';

export type RegistroLog = Logger;

export function criarRegistroLog(entrada: { readonly servico: string; readonly desenvolvimento: boolean }): Logger {
  if (!entrada.desenvolvimento) {
    return pino({ level: NIVEL_PADRAO, base: { servico: entrada.servico } });
  }

  return pino({
    level: 'debug',
    base: { servico: entrada.servico },
    transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
  });
}
