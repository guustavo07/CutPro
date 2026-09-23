import { ALTURA_VERTICAL, LARGURA_VERTICAL, REGIAO_WEBCAM_PADRAO } from '@cutpro/dominio';
import { describe, expect, it } from 'vitest';
import {
  montarArgumentosDuracao,
  montarArgumentosEnquadramento,
  montarArgumentosMiniatura,
  montarArgumentosRecorte,
  montarCadeiaEnquadramento,
  montarFiltroEnquadramento,
} from './argumentosFfmpeg.js';
import { TemplateEnquadramento } from './tipos.js';

const ORIGEM = '/tmp/bruto.mp4';
const DESTINO = '/tmp/vertical.mp4';

function valorDoParametro(argumentos: readonly string[], parametro: string): string | undefined {
  const posicao = argumentos.indexOf(parametro);
  return posicao < 0 ? undefined : argumentos[posicao + 1];
}

describe('recorte do trecho', () => {
  const argumentos = montarArgumentosRecorte({
    caminhoOrigem: ORIGEM,
    caminhoDestino: DESTINO,
    inicioSegundos: 120,
    duracaoSegundos: 45,
  });

  it('posiciona o -ss antes do -i para busca rápida', () => {
    expect(argumentos.indexOf('-ss')).toBeLessThan(argumentos.indexOf('-i'));
  });

  it('usa o instante e a duração recebidos', () => {
    expect(valorDoParametro(argumentos, '-ss')).toBe('120');
    expect(valorDoParametro(argumentos, '-t')).toBe('45');
  });

  it('copia os fluxos em vez de recodificar', () => {
    expect(valorDoParametro(argumentos, '-c')).toBe('copy');
  });

  it('grava no destino informado', () => {
    expect(argumentos[argumentos.length - 1]).toBe(DESTINO);
  });
});

describe('filtros de enquadramento vertical', () => {
  it('tem um filtro próprio para cada template', () => {
    const filtros = Object.values(TemplateEnquadramento).map((template) => montarFiltroEnquadramento(template));
    expect(new Set(filtros).size).toBe(Object.values(TemplateEnquadramento).length);
  });

  it('o template padrão usa fundo desfocado com vídeo centralizado', () => {
    const filtro = montarFiltroEnquadramento(TemplateEnquadramento.VERTICAL_PADRAO);
    expect(filtro).toContain('boxblur');
    expect(filtro).toContain('overlay');
  });

  it('tela cheia preenche e corta, sem sobra de fundo', () => {
    const filtro = montarFiltroEnquadramento(TemplateEnquadramento.TELA_CHEIA);
    expect(filtro).toContain('force_original_aspect_ratio=increase');
    expect(filtro).toContain(`crop=${LARGURA_VERTICAL}:${ALTURA_VERTICAL}`);
  });

  it('gameplay central recorta a faixa central sem desfoque', () => {
    const filtro = montarFiltroEnquadramento(TemplateEnquadramento.GAMEPLAY_CENTRAL);
    expect(filtro).toContain('crop=ih*');
    expect(filtro).not.toContain('boxblur');
  });

  it('webcam em destaque empilha duas faixas', () => {
    const filtro = montarFiltroEnquadramento(TemplateEnquadramento.WEBCAM_DESTAQUE);
    expect(filtro).toContain('vstack=inputs=2');
  });

  it('webcam em destaque recorta a região configurada do canal', () => {
    const filtro = montarFiltroEnquadramento(TemplateEnquadramento.WEBCAM_DESTAQUE, {
      x: 0.02,
      y: 0.05,
      largura: 0.31,
      altura: 0.28,
    });

    expect(filtro).toContain('crop=iw*0.31:ih*0.28:iw*0.02:ih*0.05');
  });

  it('usa a região padrão quando o canal não define uma', () => {
    const filtro = montarFiltroEnquadramento(TemplateEnquadramento.WEBCAM_DESTAQUE);
    expect(filtro).toContain(`crop=iw*${REGIAO_WEBCAM_PADRAO.largura}:ih*${REGIAO_WEBCAM_PADRAO.altura}`);
  });

  it('a soma das duas faixas preenche a altura vertical inteira', () => {
    const filtro = montarFiltroEnquadramento(TemplateEnquadramento.WEBCAM_DESTAQUE);
    const alturas = [...filtro.matchAll(new RegExp(`crop=${LARGURA_VERTICAL}:(\\d+)`, 'g'))].map((item) =>
      Number(item[1]),
    );
    const escalas = [...filtro.matchAll(new RegExp(`scale=${LARGURA_VERTICAL}:(\\d+)`, 'g'))].map((item) =>
      Number(item[1]),
    );

    expect(alturas[0]! + escalas[escalas.length - 1]!).toBe(ALTURA_VERTICAL);
  });

  it('cai no template padrão quando o valor é desconhecido', () => {
    const desconhecido = montarFiltroEnquadramento('TEMPLATE_INEXISTENTE' as TemplateEnquadramento);
    expect(desconhecido).toBe(montarFiltroEnquadramento(TemplateEnquadramento.VERTICAL_PADRAO));
  });
});

describe('argumentos de enquadramento', () => {
  const argumentos = montarArgumentosEnquadramento({
    caminhoOrigem: ORIGEM,
    caminhoDestino: DESTINO,
    template: TemplateEnquadramento.TELA_CHEIA,
  });

  it('entrega vídeo pronto para reprodução progressiva', () => {
    expect(valorDoParametro(argumentos, '-movflags')).toBe('+faststart');
  });

  it('não inclui filtro de legenda quando não há arquivo', () => {
    expect(valorDoParametro(argumentos, '-filter_complex')).not.toContain('subtitles');
  });

  it('inclui o filtro de legenda quando há arquivo', () => {
    const comLegenda = montarArgumentosEnquadramento({
      caminhoOrigem: ORIGEM,
      caminhoDestino: DESTINO,
      template: TemplateEnquadramento.TELA_CHEIA,
      caminhoLegenda: '/tmp/legenda.ass',
    });

    expect(valorDoParametro(comLegenda, '-filter_complex')).toContain('subtitles=');
  });

  it('escapa caminho do Windows no filtro de legenda', () => {
    const comLegenda = montarArgumentosEnquadramento({
      caminhoOrigem: ORIGEM,
      caminhoDestino: DESTINO,
      template: TemplateEnquadramento.TELA_CHEIA,
      caminhoLegenda: 'C:\\temp\\legenda.ass',
    });
    const filtro = valorDoParametro(comLegenda, '-filter_complex') ?? '';

    expect(filtro).toContain('C\\:/temp/legenda.ass');
  });
});

describe('miniatura e duração', () => {
  it('extrai um único quadro no instante pedido', () => {
    const argumentos = montarArgumentosMiniatura({
      caminhoOrigem: ORIGEM,
      caminhoDestino: '/tmp/capa.jpg',
      instanteSegundos: 7,
    });

    expect(valorDoParametro(argumentos, '-ss')).toBe('7');
    expect(valorDoParametro(argumentos, '-frames:v')).toBe('1');
  });

  it('consulta a duração sem imprimir cabeçalho', () => {
    const argumentos = montarArgumentosDuracao(ORIGEM);
    expect(valorDoParametro(argumentos, '-show_entries')).toBe('format=duration');
    expect(argumentos[argumentos.length - 1]).toBe(ORIGEM);
  });
});

describe('sobreposição da marca', () => {
  const base = {
    caminhoOrigem: ORIGEM,
    caminhoDestino: DESTINO,
    template: TemplateEnquadramento.TELA_CHEIA,
  };

  it('não adiciona segunda entrada quando não há marca', () => {
    const argumentos = montarArgumentosEnquadramento(base);
    expect(argumentos.filter((item) => item === '-i')).toHaveLength(1);
  });

  it('adiciona a marca como segunda entrada', () => {
    const argumentos = montarArgumentosEnquadramento({ ...base, caminhoMarca: '/tmp/marca.png' });
    expect(argumentos.filter((item) => item === '-i')).toHaveLength(2);
    expect(argumentos).toContain('/tmp/marca.png');
  });

  it('sobrepõe a marca no canto superior direito', () => {
    const cadeia = montarCadeiaEnquadramento({ ...base, caminhoMarca: '/tmp/marca.png' });
    expect(cadeia).toContain('[1:v]');
    expect(cadeia).toMatch(/overlay=W-w-\d+:\d+/);
  });

  it('aplica a marca depois da legenda, para não ficar embaixo dela', () => {
    const cadeia = montarCadeiaEnquadramento({
      ...base,
      caminhoMarca: '/tmp/marca.png',
      caminhoLegenda: '/tmp/legenda.ass',
    });

    expect(cadeia.indexOf('subtitles=')).toBeLessThan(cadeia.indexOf('overlay=W-w'));
  });
});
