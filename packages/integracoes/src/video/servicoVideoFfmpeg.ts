import { spawn } from 'node:child_process';
import { montarArgumentosConcatenacao } from './bufferCircular.js';
import {
  montarArgumentosDuracao,
  montarArgumentosExtracaoAudio,
  montarArgumentosEnquadramento,
  montarArgumentosMiniatura,
  montarArgumentosRecorte,
} from './argumentosFfmpeg.js';
import {
  ErroProcessamentoVideo,
  type EntradaConcatenacao,
  type EntradaEnquadramento,
  type EntradaExtracaoAudio,
  type EntradaMiniatura,
  type EntradaRecorte,
  type ServicoVideo,
} from './tipos.js';

const CODIGO_SAIDA_SUCESSO = 0;
const TAMANHO_MAXIMO_DETALHE_ERRO = 500;

export type OpcoesServicoVideoFfmpeg = {
  readonly caminhoFfmpeg: string;
  readonly caminhoFfprobe: string;
  readonly caminhoConfiguracaoFontes?: string;
};

type ResultadoExecucao = {
  readonly codigo: number | null;
  readonly saidaPadrao: string;
  readonly saidaErro: string;
};

function executar(
  comando: string,
  argumentos: readonly string[],
  ambiente?: NodeJS.ProcessEnv,
): Promise<ResultadoExecucao> {
  return new Promise((resolver, rejeitar) => {
    const processo = spawn(comando, [...argumentos], { windowsHide: true, env: ambiente ?? process.env });
    let saidaPadrao = '';
    let saidaErro = '';

    processo.stdout.on('data', (parte) => (saidaPadrao += parte.toString()));
    processo.stderr.on('data', (parte) => (saidaErro += parte.toString()));
    processo.on('error', (erro) => rejeitar(new ErroProcessamentoVideo(comando, null, erro.message)));
    processo.on('close', (codigo) => resolver({ codigo, saidaPadrao, saidaErro }));
  });
}

async function executarOuFalhar(
  comando: string,
  argumentos: readonly string[],
  ambiente?: NodeJS.ProcessEnv,
): Promise<string> {
  const resultado = await executar(comando, argumentos, ambiente);
  if (resultado.codigo === CODIGO_SAIDA_SUCESSO) return resultado.saidaPadrao;

  const detalhe = resultado.saidaErro.trim().slice(0, TAMANHO_MAXIMO_DETALHE_ERRO);
  throw new ErroProcessamentoVideo(comando, resultado.codigo, detalhe);
}

export class ServicoVideoFfmpeg implements ServicoVideo {
  constructor(private readonly opcoes: OpcoesServicoVideoFfmpeg) {}

  private montarAmbiente(): NodeJS.ProcessEnv {
    if (!this.opcoes.caminhoConfiguracaoFontes) return process.env;

    return { ...process.env, FONTCONFIG_FILE: this.opcoes.caminhoConfiguracaoFontes };
  }

  async concatenar(entrada: EntradaConcatenacao): Promise<void> {
    await executarOuFalhar(this.opcoes.caminhoFfmpeg, montarArgumentosConcatenacao(entrada));
  }

  async extrairAudio(entrada: EntradaExtracaoAudio): Promise<void> {
    await executarOuFalhar(this.opcoes.caminhoFfmpeg, montarArgumentosExtracaoAudio(entrada));
  }

  async recortar(entrada: EntradaRecorte): Promise<void> {
    await executarOuFalhar(this.opcoes.caminhoFfmpeg, montarArgumentosRecorte(entrada));
  }

  async enquadrarVertical(entrada: EntradaEnquadramento): Promise<void> {
    await executarOuFalhar(this.opcoes.caminhoFfmpeg, montarArgumentosEnquadramento(entrada), this.montarAmbiente());
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
