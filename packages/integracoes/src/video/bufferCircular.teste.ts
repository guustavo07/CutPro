import { describe, expect, it } from 'vitest';
import {
  calcularDeslocamentoNaJanela,
  interpretarNomeSegmento,
  listarSegmentosExpirados,
  listarSegmentosOrdenados,
  montarArgumentosCaptura,
  montarConteudoListaConcatenacao,
  selecionarSegmentosDaJanela,
  type SegmentoCapturado,
} from './bufferCircular.js';

function segmento(carimbo: string): SegmentoCapturado {
  const interpretado = interpretarNomeSegmento(`segmento_${carimbo}.ts`);
  if (!interpretado) throw new Error(`carimbo inválido no teste: ${carimbo}`);

  return interpretado;
}

describe('nome de segmento', () => {
  it('extrai a data e hora do nome', () => {
    const resultado = interpretarNomeSegmento('segmento_20260923041530.ts');
    expect(resultado?.inicioEm.getFullYear()).toBe(2026);
    expect(resultado?.inicioEm.getMonth()).toBe(8);
    expect(resultado?.inicioEm.getDate()).toBe(23);
    expect(resultado?.inicioEm.getHours()).toBe(4);
    expect(resultado?.inicioEm.getMinutes()).toBe(15);
    expect(resultado?.inicioEm.getSeconds()).toBe(30);
  });

  it('ignora arquivo que não é segmento', () => {
    expect(interpretarNomeSegmento('lista.txt')).toBeNull();
    expect(interpretarNomeSegmento('segmento_abc.ts')).toBeNull();
    expect(interpretarNomeSegmento('segmento_20260923041530.mp4')).toBeNull();
  });

  it('ordena por instante, não por nome bruto', () => {
    const ordenados = listarSegmentosOrdenados([
      'segmento_20260923041540.ts',
      'lista.txt',
      'segmento_20260923041520.ts',
      'segmento_20260923041530.ts',
    ]);

    expect(ordenados).toHaveLength(3);
    expect(ordenados[0]?.inicioEm.getSeconds()).toBe(20);
    expect(ordenados[2]?.inicioEm.getSeconds()).toBe(40);
  });
});

describe('seleção da janela do corte', () => {
  const segmentos = [
    segmento('20260923041500'),
    segmento('20260923041510'),
    segmento('20260923041520'),
    segmento('20260923041530'),
    segmento('20260923041540'),
  ];

  it('inclui o segmento que começa antes mas cobre o início', () => {
    const selecionados = selecionarSegmentosDaJanela({
      segmentos,
      inicioEm: new Date(2026, 8, 23, 4, 15, 15),
      fimEm: new Date(2026, 8, 23, 4, 15, 35),
    });

    expect(selecionados[0]?.inicioEm.getSeconds()).toBe(10);
  });

  it('cobre a janela inteira sem buraco', () => {
    const selecionados = selecionarSegmentosDaJanela({
      segmentos,
      inicioEm: new Date(2026, 8, 23, 4, 15, 15),
      fimEm: new Date(2026, 8, 23, 4, 15, 35),
    });

    expect(selecionados.map((item) => item.inicioEm.getSeconds())).toEqual([10, 20, 30]);
  });

  it('não inclui segmento que termina antes da janela', () => {
    const selecionados = selecionarSegmentosDaJanela({
      segmentos,
      inicioEm: new Date(2026, 8, 23, 4, 15, 30),
      fimEm: new Date(2026, 8, 23, 4, 15, 35),
    });

    expect(selecionados.map((item) => item.inicioEm.getSeconds())).toEqual([30]);
  });

  it('usa o início do próximo segmento como fim, não a duração nominal', () => {
    const irregulares = [segmento('20260923041500'), segmento('20260923041517'), segmento('20260923041530')];
    const selecionados = selecionarSegmentosDaJanela({
      segmentos: irregulares,
      inicioEm: new Date(2026, 8, 23, 4, 15, 14),
      fimEm: new Date(2026, 8, 23, 4, 15, 16),
    });

    expect(selecionados.map((item) => item.inicioEm.getSeconds())).toEqual([0]);
  });

  it('cobre janela que cai dentro de segmento mais longo que o nominal', () => {
    const irregulares = [segmento('20260923041500'), segmento('20260923041525')];
    const selecionados = selecionarSegmentosDaJanela({
      segmentos: irregulares,
      inicioEm: new Date(2026, 8, 23, 4, 15, 18),
      fimEm: new Date(2026, 8, 23, 4, 15, 22),
    });

    expect(selecionados.map((item) => item.inicioEm.getSeconds())).toEqual([0]);
  });

  it('devolve vazio quando a janela está fora do buffer', () => {
    const selecionados = selecionarSegmentosDaJanela({
      segmentos,
      inicioEm: new Date(2026, 8, 23, 3, 0, 0),
      fimEm: new Date(2026, 8, 23, 3, 1, 0),
    });

    expect(selecionados).toEqual([]);
  });
});

describe('deslocamento dentro do trecho concatenado', () => {
  it('calcula a diferença em segundos até o início do primeiro segmento', () => {
    const deslocamento = calcularDeslocamentoNaJanela({
      primeiroSegmento: segmento('20260923041510'),
      inicioEm: new Date(2026, 8, 23, 4, 15, 17),
    });

    expect(deslocamento).toBe(7);
  });

  it('nunca devolve valor negativo', () => {
    const deslocamento = calcularDeslocamentoNaJanela({
      primeiroSegmento: segmento('20260923041510'),
      inicioEm: new Date(2026, 8, 23, 4, 15, 5),
    });

    expect(deslocamento).toBe(0);
  });
});

describe('retenção do buffer', () => {
  it('marca como expirado apenas o que passou da janela', () => {
    const expirados = listarSegmentosExpirados({
      segmentos: [segmento('20260923040000'), segmento('20260923041500'), segmento('20260923042000')],
      agora: new Date(2026, 8, 23, 4, 20, 0),
      retencaoMinutos: 15,
    });

    expect(expirados).toHaveLength(1);
    expect(expirados[0]?.inicioEm.getHours()).toBe(4);
    expect(expirados[0]?.inicioEm.getMinutes()).toBe(0);
  });
});

describe('argumentos de captura e concatenação', () => {
  it('captura copiando os fluxos, sem recodificar', () => {
    const argumentos = montarArgumentosCaptura({ urlFluxo: 'https://exemplo/live.m3u8', diretorioDestino: '/tmp/x' });
    const posicao = argumentos.indexOf('-c');

    expect(argumentos[posicao + 1]).toBe('copy');
    expect(argumentos).toContain('segment');
  });

  it('usa carimbo de hora no nome do segmento', () => {
    const argumentos = montarArgumentosCaptura({ urlFluxo: 'https://exemplo/live.m3u8', diretorioDestino: '/tmp/x' });
    expect(argumentos[argumentos.length - 1]).toContain('%Y%m%d%H%M%S');
  });

  it('monta a lista de concatenação com barras normalizadas', () => {
    const conteudo = montarConteudoListaConcatenacao(['C:\\buffer\\segmento_1.ts', 'C:\\buffer\\segmento_2.ts']);
    expect(conteudo).toBe("file 'C:/buffer/segmento_1.ts'\nfile 'C:/buffer/segmento_2.ts'");
  });
});
