import { ALTURA_VERTICAL, LARGURA_VERTICAL, REGIAO_WEBCAM_PADRAO } from '@cutpro/dominio';
import { describe, expect, it } from 'vitest';
import {
  montarArgumentosDuracao,
  montarArgumentosEnquadramento,
  montarArgumentosMiniatura,
  montarArgumentosRecorte,
  calcularRecorteDoConteudo,
  escaparTextoParaDrawtext,
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

  it('webcam em destaque compoe camera em cima e conteudo embaixo', () => {
    const filtro = montarFiltroEnquadramento(TemplateEnquadramento.WEBCAM_DESTAQUE);
    expect(filtro).toContain('[cameraPronta]overlay=0:0');
    expect(filtro).toContain('[conteudoPronto]overlay=');
  });

  it('preserva a cena no conteudo, sem recorte quase quadrado', () => {
    const filtro = montarFiltroEnquadramento(TemplateEnquadramento.WEBCAM_DESTAQUE);
    expect(filtro).toContain('force_original_aspect_ratio=decrease');
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

  it('posiciona o conteúdo abaixo da faixa da câmera', () => {
    const filtro = montarFiltroEnquadramento(TemplateEnquadramento.WEBCAM_DESTAQUE);
    const alturaCamera = Number(
      new RegExp(`crop=${LARGURA_VERTICAL}:(\\d+)\\[cameraPronta\\]`).exec(filtro)?.[1] ?? 0,
    );

    expect(alturaCamera).toBeGreaterThan(0);
    expect(alturaCamera).toBeLessThan(ALTURA_VERTICAL);
    expect(filtro).toContain(`overlay=(W-w)/2:${alturaCamera}+`);
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

describe('recorte do conteudo fora da webcam', () => {
  it('comeca depois da webcam quando ela esta na esquerda', () => {
    const recorte = calcularRecorteDoConteudo({ x: 0, y: 0, largura: 0.3, altura: 0.31 });
    expect(recorte.x).toBeCloseTo(0.3);
    expect(recorte.largura).toBeCloseTo(0.7);
  });

  it('comeca do zero quando a webcam esta na direita', () => {
    const recorte = calcularRecorteDoConteudo({ x: 0.7, y: 0, largura: 0.3, altura: 0.3 });
    expect(recorte.x).toBe(0);
    expect(recorte.largura).toBeCloseTo(0.7);
  });

  it('nao deixa o conteudo sumir quando a webcam ocupa quase tudo', () => {
    const recorte = calcularRecorteDoConteudo({ x: 0, y: 0, largura: 0.95, altura: 0.9 });
    expect(recorte.largura).toBeGreaterThan(0.3);
  });
});

describe('assinatura do canal', () => {
  it('escreve o nome do canal com arroba', () => {
    const cadeia = montarCadeiaEnquadramento({
      caminhoOrigem: ORIGEM,
      caminhoDestino: DESTINO,
      template: TemplateEnquadramento.WEBCAM_DESTAQUE,
      caminhoMarca: '/tmp/marca.png',
      nomeDoCanal: 'brabox',
      arquivoFonte: '/tmp/arial.ttf',
    });

    expect(cadeia).toContain("text='@brabox'");
  });

  it('nao escreve nada sem arquivo de fonte, que derruba o ffmpeg', () => {
    const cadeia = montarCadeiaEnquadramento({
      caminhoOrigem: ORIGEM,
      caminhoDestino: DESTINO,
      template: TemplateEnquadramento.WEBCAM_DESTAQUE,
      caminhoMarca: '/tmp/marca.png',
      nomeDoCanal: 'brabox',
    });

    expect(cadeia).not.toContain('drawtext');
  });

  it('nao escreve nada quando o canal nao e informado', () => {
    const cadeia = montarCadeiaEnquadramento({
      caminhoOrigem: ORIGEM,
      caminhoDestino: DESTINO,
      template: TemplateEnquadramento.WEBCAM_DESTAQUE,
      caminhoMarca: '/tmp/marca.png',
    });

    expect(cadeia).not.toContain('drawtext');
  });

  it('remove aspas do nome, que quebrariam o filtro', () => {
    expect(escaparTextoParaDrawtext("bra'box")).toBe('brabox');
  });
});
