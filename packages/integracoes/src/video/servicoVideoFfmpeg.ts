import { spawn } from 'node:child_process';
import { montarArgumentosConcatenacao } from './bufferCircular.js';
import {
  montarArgumentosDuracao,
  montarArgumentosEnquadramento,
  montarArgumentosMiniatura,
  montarArgumentosRecorte,
} from './argumentosFfmpeg.js';
import {
  ErroProcessamentoVideo,
  type EntradaConcatenacao,
  type EntradaEnquadramento,
  type EntradaMiniatura,
  type EntradaRecorte,
  type ServicoVideo,
} from './tipos.js';

const CODIGO_SAIDA_SUCESSO = 0;
const TAMANHO_MAXIMO_DETALHE_ERRO = 500;

export type OpcoesServicoVideoFfmpeg = {
  readonly caminhoFfmpeg: string;
  readonly caminhoFfprobe: string;
};

type ResultadoExecucao = {
  readonly codigo: number | null;
  readonly saidaPadrao: string;
  readonly saidaErro: string;
};

function executar(comando: string, argumentos: readonly string[]): Promise<ResultadoExecucao> {
  return new Promise((resolver, rejeitar) => {
    const processo = spawn(comando, [...argumentos], { windowsHide: true });
    let saidaPadrao = '';
    let saidaErro = '';

    processo.stdout.on('data', (parte) => (saidaPadrao += parte.toString()));
    processo.stderr.on('data', (parte) => (saidaErro += parte.toString()));
    processo.on('error', (erro) => rejeitar(new ErroProcessamentoVideo(comando, null, erro.message)));
    processo.on('close', (codigo) => resolver({ codigo, saidaPadrao, saidaErro }));
  });
}

async function executarOuFalhar(comando: string, argumentos: readonly string[]): Promise<string> {
  const resultado = await executar(comando, argumentos);
  if (resultado.codigo === CODIGO_SAIDA_SUCESSO) return resultado.saidaPadrao;

  const detalhe = resultado.saidaErro.trim().slice(0, TAMANHO_MAXIMO_DETALHE_ERRO);
  throw new ErroProcessamentoVideo(comando, resultado.codigo, detalhe);
}

export class ServicoVideoFfmpeg implements ServicoVideo {
  constructor(private readonly opcoes: OpcoesServicoVideoFfmpeg) {}

  async concatenar(entrada: EntradaConcatenacao): Promise<void> {
    await executarOuFalhar(this.opcoes.caminhoFfmpeg, montarArgumentosConcatenacao(entrada));
  }

  async recortar(entrada: EntradaRecorte): Promise<void> {
    await executarOuFalhar(this.opcoes.caminhoFfmpeg, montarArgumentosRecorte(entrada));
  }

  async enquadrarVertical(entrada: EntradaEnquadramento): Promise<void> {
    await executarOuFalhar(this.opcoes.caminhoFfmpeg, montarArgumentosEnquadramento(entrada));
  }

  async gerarMiniatura(entrada: EntradaMiniatura): Promise<void> {
    await executarOuFalhar(this.opcoes.caminhoFfmpeg, montarArgumentosMiniatura(entrada));
  }

  async obterDuracaoSegundos(caminhoOrigem: string): Promise<number> {
    const saida = await executarOuFalhar(this.opcoes.caminhoFfprobe, montarArgumentosDuracao(caminhoOrigem));
    const duracao = Number.parseFloat(saida.trim());

    return Number.isFinite(duracao) ? duracao : 0;
  }
}
