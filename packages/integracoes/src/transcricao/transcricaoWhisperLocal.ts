import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { PalavraTranscrita } from './legendaAss.js';
import {
  ErroTranscricao,
  ProvedorTranscricao,
  type EntradaTranscricao,
  type ResultadoTranscricao,
  type ServicoTranscricao,
} from './tipos.js';

const FORMATO_SAIDA = 'json';
const CODIGO_SAIDA_SUCESSO = 0;
const TAMANHO_MAXIMO_DETALHE_ERRO = 400;
const IDIOMA_PADRAO = 'pt';
const MODELO_PADRAO = 'small';

type PalavraBruta = {
  readonly start?: number;
  readonly end?: number;
  readonly word?: string;
};

type SegmentoBruto = {
  readonly text?: string;
  readonly words?: readonly PalavraBruta[];
};

type SaidaBruta = {
  readonly text?: string;
  readonly language?: string;
  readonly segments?: readonly SegmentoBruto[];
};

export type OpcoesTranscricaoLocal = {
  readonly comando: string;
  readonly modelo?: string;
  readonly idioma?: string;
};

export function montarArgumentosTranscricao(entrada: {
  readonly caminhoMidia: string;
  readonly diretorioSaida: string;
  readonly modelo: string;
  readonly idioma: string;
}): readonly string[] {
  return [
    entrada.caminhoMidia,
    '--model',
    entrada.modelo,
    '--language',
    entrada.idioma,
    '--word_timestamps',
    'True',
    '--output_format',
    FORMATO_SAIDA,
    '--output_dir',
    entrada.diretorioSaida,
    '--verbose',
    'False',
  ];
}

export function nomeArquivoSaida(caminhoMidia: string): string {
  return `${basename(caminhoMidia).replace(/\.[^.]+$/, '')}.${FORMATO_SAIDA}`;
}

export function interpretarSaidaWhisper(conteudo: string): ResultadoTranscricao {
  const bruto = JSON.parse(conteudo) as SaidaBruta;
  const palavras = (bruto.segments ?? []).flatMap((segmento) => extrairPalavras(segmento));

  return {
    texto: (bruto.text ?? '').trim(),
    idioma: bruto.language ?? IDIOMA_PADRAO,
    palavras,
  };
}

function extrairPalavras(segmento: SegmentoBruto): readonly PalavraTranscrita[] {
  return (segmento.words ?? []).flatMap((palavra) => {
    const texto = palavra.word?.trim() ?? '';
    if (texto.length === 0 || palavra.start === undefined || palavra.end === undefined) return [];

    return [{ texto, inicioSegundos: palavra.start, fimSegundos: palavra.end }];
  });
}

export class TranscricaoWhisperLocal implements ServicoTranscricao {
  readonly provedor = ProvedorTranscricao.LOCAL;

  constructor(private readonly opcoes: OpcoesTranscricaoLocal) {}

  async transcrever(entrada: EntradaTranscricao): Promise<ResultadoTranscricao> {
    const argumentos = montarArgumentosTranscricao({
      caminhoMidia: entrada.caminhoMidia,
      diretorioSaida: entrada.diretorioTrabalho,
      modelo: this.opcoes.modelo ?? MODELO_PADRAO,
      idioma: this.opcoes.idioma ?? IDIOMA_PADRAO,
    });

    await this.executar(argumentos);
    const caminhoSaida = join(entrada.diretorioTrabalho, nomeArquivoSaida(entrada.caminhoMidia));

    return interpretarSaidaWhisper(await readFile(caminhoSaida, 'utf8'));
  }

  private executar(argumentos: readonly string[]): Promise<void> {
    return new Promise((resolver, rejeitar) => {
      const processo = spawn(this.opcoes.comando, [...argumentos], { windowsHide: true });
      let saidaErro = '';

      processo.stderr.on('data', (parte) => (saidaErro += parte.toString()));
      processo.on('error', (erro) => rejeitar(new ErroTranscricao(erro.message)));
      processo.on('close', (codigo) =>
        codigo === CODIGO_SAIDA_SUCESSO
          ? resolver()
          : rejeitar(new ErroTranscricao(saidaErro.trim().slice(0, TAMANHO_MAXIMO_DETALHE_ERRO))),
      );
    });
  }
}

export class TranscricaoSimulada implements ServicoTranscricao {
  readonly provedor = ProvedorTranscricao.MOCK;

  async transcrever(): Promise<ResultadoTranscricao> {
    return { texto: '', idioma: IDIOMA_PADRAO, palavras: [] };
  }
}
