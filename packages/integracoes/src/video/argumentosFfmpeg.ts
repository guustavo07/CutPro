import { ALTURA_VERTICAL, LARGURA_VERTICAL, QUADROS_POR_SEGUNDO_PADRAO } from '@cutpro/dominio';
import {
  TemplateEnquadramento,
  type EntradaEnquadramento,
  type EntradaMiniatura,
  type EntradaRecorte,
} from './tipos.js';

const CODIFICADOR_VIDEO = 'libx264';
const CODIFICADOR_AUDIO = 'aac';
const PERFIL_CODIFICACAO = 'veryfast';
const FATOR_QUALIDADE = '20';
const TAXA_AUDIO = '128k';
const FORMATO_PIXEL = 'yuv420p';
const DESLOCAMENTO_CENTRALIZADO = '(W-w)/2:(H-h)/2';
const RAIO_DESFOQUE = '20:2';
const PROPORCAO_WEBCAM = 0.42;
const QUADROS_MINIATURA = '1';
const QUALIDADE_MINIATURA = '2';

const ALTURA_WEBCAM = Math.round(ALTURA_VERTICAL * PROPORCAO_WEBCAM);
const ALTURA_GAMEPLAY = ALTURA_VERTICAL - ALTURA_WEBCAM;

function fundoDesfocado(): string {
  return `scale=${LARGURA_VERTICAL}:${ALTURA_VERTICAL}:force_original_aspect_ratio=increase,crop=${LARGURA_VERTICAL}:${ALTURA_VERTICAL},boxblur=${RAIO_DESFOQUE}`;
}

function recorteCentralVertical(): string {
  return `crop=ih*${LARGURA_VERTICAL}/${ALTURA_VERTICAL}:ih,scale=${LARGURA_VERTICAL}:${ALTURA_VERTICAL}`;
}

function montarFiltroVerticalPadrao(): string {
  return `[0:v]split=2[fundo][frente];[fundo]${fundoDesfocado()}[fundoPronto];[frente]scale=${LARGURA_VERTICAL}:-2[frentePronta];[fundoPronto][frentePronta]overlay=${DESLOCAMENTO_CENTRALIZADO}`;
}

function montarFiltroTelaCheia(): string {
  return `[0:v]scale=${LARGURA_VERTICAL}:${ALTURA_VERTICAL}:force_original_aspect_ratio=increase,crop=${LARGURA_VERTICAL}:${ALTURA_VERTICAL}`;
}

function montarFiltroGameplayCentral(): string {
  return `[0:v]${recorteCentralVertical()}`;
}

function montarFiltroWebcamDestaque(): string {
  return `[0:v]split=2[topo][base];[topo]scale=${LARGURA_VERTICAL}:-2,crop=${LARGURA_VERTICAL}:${ALTURA_WEBCAM}:0:0[topoPronto];[base]${recorteCentralVertical()},crop=${LARGURA_VERTICAL}:${ALTURA_GAMEPLAY}[basePronta];[topoPronto][basePronta]vstack=inputs=2`;
}

const FILTRO_POR_TEMPLATE: Readonly<Record<TemplateEnquadramento, () => string>> = Object.freeze({
  [TemplateEnquadramento.VERTICAL_PADRAO]: montarFiltroVerticalPadrao,
  [TemplateEnquadramento.TELA_CHEIA]: montarFiltroTelaCheia,
  [TemplateEnquadramento.GAMEPLAY_CENTRAL]: montarFiltroGameplayCentral,
  [TemplateEnquadramento.WEBCAM_DESTAQUE]: montarFiltroWebcamDestaque,
});

export function montarFiltroEnquadramento(template: TemplateEnquadramento): string {
  const construtor = FILTRO_POR_TEMPLATE[template] ?? montarFiltroVerticalPadrao;
  return construtor();
}

function escaparCaminhoParaFiltro(caminho: string): string {
  return caminho.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

export function montarArgumentosRecorte(entrada: EntradaRecorte): readonly string[] {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-ss',
    String(entrada.inicioSegundos),
    '-i',
    entrada.caminhoOrigem,
    '-t',
    String(entrada.duracaoSegundos),
    '-c',
    'copy',
    '-avoid_negative_ts',
    'make_zero',
    entrada.caminhoDestino,
  ];
}

export function montarArgumentosEnquadramento(entrada: EntradaEnquadramento): readonly string[] {
  const filtro = entrada.caminhoLegenda
    ? `${montarFiltroEnquadramento(entrada.template)},subtitles='${escaparCaminhoParaFiltro(entrada.caminhoLegenda)}'`
    : montarFiltroEnquadramento(entrada.template);

  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    entrada.caminhoOrigem,
    '-filter_complex',
    filtro,
    '-r',
    String(QUADROS_POR_SEGUNDO_PADRAO),
    '-c:v',
    CODIFICADOR_VIDEO,
    '-preset',
    PERFIL_CODIFICACAO,
    '-crf',
    FATOR_QUALIDADE,
    '-pix_fmt',
    FORMATO_PIXEL,
    '-c:a',
    CODIFICADOR_AUDIO,
    '-b:a',
    TAXA_AUDIO,
    '-movflags',
    '+faststart',
    entrada.caminhoDestino,
  ];
}

export function montarArgumentosMiniatura(entrada: EntradaMiniatura): readonly string[] {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-ss',
    String(entrada.instanteSegundos),
    '-i',
    entrada.caminhoOrigem,
    '-frames:v',
    QUADROS_MINIATURA,
    '-q:v',
    QUALIDADE_MINIATURA,
    entrada.caminhoDestino,
  ];
}

export function montarArgumentosDuracao(caminhoOrigem: string): readonly string[] {
  return [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    caminhoOrigem,
  ];
}
