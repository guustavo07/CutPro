import type { PalavraTranscrita } from './legendaAss.js';

export const ProvedorTranscricao = Object.freeze({
  MOCK: 'mock',
  LOCAL: 'local',
});

export type ProvedorTranscricao = (typeof ProvedorTranscricao)[keyof typeof ProvedorTranscricao];

export type ResultadoTranscricao = {
  readonly texto: string;
  readonly idioma: string;
  readonly palavras: readonly PalavraTranscrita[];
};

export type EntradaTranscricao = {
  readonly caminhoMidia: string;
  readonly diretorioTrabalho: string;
};

export interface ServicoTranscricao {
  readonly provedor: ProvedorTranscricao;
  transcrever(entrada: EntradaTranscricao): Promise<ResultadoTranscricao>;
}

export class ErroTranscricao extends Error {
  constructor(detalhe: string) {
    super(`Falha ao transcrever o áudio: ${detalhe}`);
    this.name = 'ErroTranscricao';
  }
}
