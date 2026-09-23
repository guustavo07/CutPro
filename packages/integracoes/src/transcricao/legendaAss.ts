import { ALTURA_VERTICAL, LARGURA_VERTICAL } from '@cutpro/dominio';

const FONTE_PADRAO = 'Arial';
const TAMANHO_FONTE = 96;
const COR_TEXTO = '&H00FFFFFF';
const COR_DESTAQUE = '&H0000E5FF';
const COR_CONTORNO = '&H00101010';
const ESPESSURA_CONTORNO = 6;
const ESPESSURA_SOMBRA = 3;
const ALINHAMENTO_INFERIOR_CENTRO = 2;
const MARGEM_LATERAL = 90;
const MARGEM_INFERIOR = 420;
const PALAVRAS_POR_BLOCO = 3;
const DURACAO_MAXIMA_BLOCO_SEGUNDOS = 1.6;
const DURACAO_MINIMA_PALAVRA_SEGUNDOS = 0.12;
const SEGUNDOS_POR_HORA = 3600;
const SEGUNDOS_POR_MINUTO = 60;
const CENTESIMOS_POR_SEGUNDO = 100;
const CASAS_HORA = 1;
const CASAS_TEMPO = 2;

export type PalavraTranscrita = {
  readonly texto: string;
  readonly inicioSegundos: number;
  readonly fimSegundos: number;
};

export type BlocoLegenda = {
  readonly palavras: readonly PalavraTranscrita[];
};

export function formatarTempoAss(segundos: number): string {
  const total = Math.max(0, segundos);
  const horas = Math.floor(total / SEGUNDOS_POR_HORA);
  const minutos = Math.floor((total % SEGUNDOS_POR_HORA) / SEGUNDOS_POR_MINUTO);
  const restante = total % SEGUNDOS_POR_MINUTO;
  const inteiros = Math.floor(restante);
  const centesimos = Math.round((restante - inteiros) * CENTESIMOS_POR_SEGUNDO);

  return `${String(horas).padStart(CASAS_HORA, '0')}:${String(minutos).padStart(CASAS_TEMPO, '0')}:${String(inteiros).padStart(CASAS_TEMPO, '0')}.${String(centesimos).padStart(CASAS_TEMPO, '0')}`;
}

export function agruparPalavrasEmBlocos(
  palavras: readonly PalavraTranscrita[],
  palavrasPorBloco: number = PALAVRAS_POR_BLOCO,
): readonly BlocoLegenda[] {
  const blocos: PalavraTranscrita[][] = [];

  for (const palavra of palavras) {
    const atual = blocos[blocos.length - 1];
    if (atual && cabeNoBloco(atual, palavra, palavrasPorBloco)) {
      atual.push(palavra);
      continue;
    }
    blocos.push([palavra]);
  }

  return blocos.map((grupo) => ({ palavras: grupo }));
}

function cabeNoBloco(
  bloco: readonly PalavraTranscrita[],
  palavra: PalavraTranscrita,
  palavrasPorBloco: number,
): boolean {
  if (bloco.length >= palavrasPorBloco) return false;

  const primeira = bloco[0];
  if (!primeira) return false;

  return palavra.fimSegundos - primeira.inicioSegundos <= DURACAO_MAXIMA_BLOCO_SEGUNDOS;
}

function escaparTextoAss(texto: string): string {
  return texto.replace(/\\/g, '').replace(/[{}]/g, '').replace(/\r?\n/g, ' ').trim();
}

function montarTextoDoBloco(bloco: BlocoLegenda, indiceDestacado: number): string {
  return bloco.palavras
    .map((palavra, posicao) => {
      const texto = escaparTextoAss(palavra.texto).toUpperCase();
      if (posicao !== indiceDestacado) return texto;

      return `{\\c${COR_DESTAQUE}}${texto}{\\c${COR_TEXTO}}`;
    })
    .join(' ');
}

export function montarCabecalhoAss(fonte: string = FONTE_PADRAO): string {
  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    `PlayResX: ${LARGURA_VERTICAL}`,
    `PlayResY: ${ALTURA_VERTICAL}`,
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Viral,${fonte},${TAMANHO_FONTE},${COR_TEXTO},${COR_DESTAQUE},${COR_CONTORNO},${COR_CONTORNO},-1,0,0,0,100,100,2,0,1,${ESPESSURA_CONTORNO},${ESPESSURA_SOMBRA},${ALINHAMENTO_INFERIOR_CENTRO},${MARGEM_LATERAL},${MARGEM_LATERAL},${MARGEM_INFERIOR},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ].join('\n');
}

function montarEventosDoBloco(bloco: BlocoLegenda): readonly string[] {
  return bloco.palavras.flatMap((palavra, posicao) => {
    const fim = Math.max(palavra.fimSegundos, palavra.inicioSegundos + DURACAO_MINIMA_PALAVRA_SEGUNDOS);
    const texto = montarTextoDoBloco(bloco, posicao);
    if (texto.length === 0) return [];

    return [
      `Dialogue: 0,${formatarTempoAss(palavra.inicioSegundos)},${formatarTempoAss(fim)},Viral,,0,0,0,,${texto}`,
    ];
  });
}

export function montarLegendaAss(entrada: {
  readonly palavras: readonly PalavraTranscrita[];
  readonly fonte?: string;
  readonly palavrasPorBloco?: number;
}): string {
  const blocos = agruparPalavrasEmBlocos(entrada.palavras, entrada.palavrasPorBloco);
  const eventos = blocos.flatMap((bloco) => montarEventosDoBloco(bloco));

  return [montarCabecalhoAss(entrada.fonte), ...eventos, ''].join('\n');
}
