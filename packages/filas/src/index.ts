import { ATRASO_INICIAL_TENTATIVA_MS, NomeFila, TENTATIVAS_PADRAO_JOB } from '@cutpro/contratos';
import { Queue, type JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';

const JOBS_CONCLUIDOS_MANTIDOS = 200;
const JOBS_FALHOS_MANTIDOS = 500;

export const OPCOES_JOB_PADRAO: JobsOptions = Object.freeze({
  attempts: TENTATIVAS_PADRAO_JOB,
  backoff: { type: 'exponential', delay: ATRASO_INICIAL_TENTATIVA_MS },
  removeOnComplete: JOBS_CONCLUIDOS_MANTIDOS,
  removeOnFail: JOBS_FALHOS_MANTIDOS,
});

export type AoErroConexao = (erro: Error) => void;

export function criarConexaoRedis(url: string, aoErro?: AoErroConexao): Redis {
  const conexao = new Redis(url, { maxRetriesPerRequest: null });
  conexao.on('error', (erro: Error) => aoErro?.(erro));

  return conexao;
}

export class ProdutorFilas {
  private readonly filas = new Map<NomeFila, Queue>();

  constructor(private readonly conexao: Redis) {}

  obterFila(nome: NomeFila): Queue {
    const existente = this.filas.get(nome);
    if (existente) return existente;

    const fila = new Queue(nome, { connection: this.conexao });
    this.filas.set(nome, fila);
    return fila;
  }

  async enfileirar(entrada: {
    readonly fila: NomeFila;
    readonly job: string;
    readonly dados: object;
    readonly opcoes?: JobsOptions;
  }): Promise<void> {
    await this.obterFila(entrada.fila).add(entrada.job, entrada.dados, {
      ...OPCOES_JOB_PADRAO,
      ...entrada.opcoes,
    });
  }

  async agendarRepeticao(entrada: {
    readonly fila: NomeFila;
    readonly job: string;
    readonly dados: object;
    readonly intervaloMs: number;
  }): Promise<void> {
    await this.obterFila(entrada.fila).add(entrada.job, entrada.dados, {
      ...OPCOES_JOB_PADRAO,
      repeat: { every: entrada.intervaloMs },
      jobId: `repeticao:${entrada.job}`,
    });
  }

  async encerrar(): Promise<void> {
    await Promise.all([...this.filas.values()].map((fila) => fila.close()));
    this.filas.clear();
  }
}
