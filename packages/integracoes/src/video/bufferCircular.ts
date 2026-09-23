const PREFIXO_SEGMENTO = 'segmento';
const EXTENSAO_SEGMENTO = 'ts';
const FORMATO_SEGMENTO = 'mpegts';
const PADRAO_NOME_SEGMENTO = `${PREFIXO_SEGMENTO}_%Y%m%d%H%M%S.${EXTENSAO_SEGMENTO}`;
const REGEX_NOME_SEGMENTO = new RegExp(`^${PREFIXO_SEGMENTO}_(\\d{14})\\.${EXTENSAO_SEGMENTO}$`);
const MILISSEGUNDOS_POR_SEGUNDO = 1000;
const POSICAO_CARIMBO = 1;

export const DURACAO_SEGMENTO_SEGUNDOS = 10;
export const RETENCAO_BUFFER_MINUTOS_PADRAO = 15;

export type SegmentoCapturado = {
  readonly nomeArquivo: string;
  readonly inicioEm: Date;
};

export function montarArgumentosCaptura(entrada: {
  readonly urlFluxo: string;
  readonly diretorioDestino: string;
  readonly duracaoSegmentoSegundos?: number;
}): readonly string[] {
  const duracao = entrada.duracaoSegmentoSegundos ?? DURACAO_SEGMENTO_SEGUNDOS;

  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    entrada.urlFluxo,
    '-c',
    'copy',
    '-f',
    'segment',
    '-segment_time',
    String(duracao),
    '-segment_format',
    FORMATO_SEGMENTO,
    '-strftime',
    '1',
    '-reset_timestamps',
    '1',
    `${entrada.diretorioDestino}/${PADRAO_NOME_SEGMENTO}`,
  ];
}

export function interpretarNomeSegmento(nomeArquivo: string): SegmentoCapturado | null {
  const correspondencia = REGEX_NOME_SEGMENTO.exec(nomeArquivo);
  const carimbo = correspondencia?.[POSICAO_CARIMBO];
  if (!carimbo) return null;

  const ano = Number(carimbo.slice(0, 4));
  const mes = Number(carimbo.slice(4, 6));
  const dia = Number(carimbo.slice(6, 8));
  const hora = Number(carimbo.slice(8, 10));
  const minuto = Number(carimbo.slice(10, 12));
  const segundo = Number(carimbo.slice(12, 14));

  return { nomeArquivo, inicioEm: new Date(ano, mes - 1, dia, hora, minuto, segundo) };
}

export function listarSegmentosOrdenados(nomesArquivos: readonly string[]): readonly SegmentoCapturado[] {
  return nomesArquivos
    .flatMap((nome) => {
      const segmento = interpretarNomeSegmento(nome);
      return segmento ? [segmento] : [];
    })
    .sort((primeiro, segundo) => primeiro.inicioEm.getTime() - segundo.inicioEm.getTime());
}

export function calcularFimDoSegmento(entrada: {
  readonly segmentos: readonly SegmentoCapturado[];
  readonly posicao: number;
  readonly duracaoNominalSegundos: number;
}): number {
  const atual = entrada.segmentos[entrada.posicao];
  if (!atual) return 0;

  const proximo = entrada.segmentos[entrada.posicao + 1];
  if (proximo) return proximo.inicioEm.getTime();

  return atual.inicioEm.getTime() + entrada.duracaoNominalSegundos * MILISSEGUNDOS_POR_SEGUNDO;
}

export function selecionarSegmentosDaJanela(entrada: {
  readonly segmentos: readonly SegmentoCapturado[];
  readonly inicioEm: Date;
  readonly fimEm: Date;
  readonly duracaoSegmentoSegundos?: number;
}): readonly SegmentoCapturado[] {
  const duracaoNominalSegundos = entrada.duracaoSegmentoSegundos ?? DURACAO_SEGMENTO_SEGUNDOS;

  return entrada.segmentos.filter((segmento, posicao) => {
    const fim = calcularFimDoSegmento({ segmentos: entrada.segmentos, posicao, duracaoNominalSegundos });
    return fim > entrada.inicioEm.getTime() && segmento.inicioEm.getTime() < entrada.fimEm.getTime();
  });
}

export function listarSegmentosExpirados(entrada: {
  readonly segmentos: readonly SegmentoCapturado[];
  readonly agora: Date;
  readonly retencaoMinutos: number;
}): readonly SegmentoCapturado[] {
  const limite = entrada.agora.getTime() - entrada.retencaoMinutos * 60 * MILISSEGUNDOS_POR_SEGUNDO;
  return entrada.segmentos.filter((segmento) => segmento.inicioEm.getTime() < limite);
}

export function calcularDeslocamentoNaJanela(entrada: {
  readonly primeiroSegmento: SegmentoCapturado;
  readonly inicioEm: Date;
}): number {
  const diferencaMs = entrada.inicioEm.getTime() - entrada.primeiroSegmento.inicioEm.getTime();
  return Math.max(0, diferencaMs / MILISSEGUNDOS_POR_SEGUNDO);
}

export function montarArgumentosConcatenacao(entrada: {
  readonly caminhoLista: string;
  readonly caminhoDestino: string;
}): readonly string[] {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    entrada.caminhoLista,
    '-c',
    'copy',
    entrada.caminhoDestino,
  ];
}

export function montarConteudoListaConcatenacao(caminhosAbsolutos: readonly string[]): string {
  return caminhosAbsolutos.map((caminho) => `file '${caminho.replace(/\\/g, '/')}'`).join('\n');
}
