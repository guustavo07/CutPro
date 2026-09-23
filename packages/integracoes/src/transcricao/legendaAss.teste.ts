import { ALTURA_VERTICAL, LARGURA_VERTICAL } from '@cutpro/dominio';
import { describe, expect, it } from 'vitest';
import {
  agruparPalavrasEmBlocos,
  formatarTempoAss,
  montarCabecalhoAss,
  montarLegendaAss,
  type PalavraTranscrita,
} from './legendaAss.js';

function palavra(texto: string, inicio: number, fim: number): PalavraTranscrita {
  return { texto, inicioSegundos: inicio, fimSegundos: fim };
}

describe('tempo no formato ASS', () => {
  it('formata segundos com centésimos', () => {
    expect(formatarTempoAss(0)).toBe('0:00:00.00');
    expect(formatarTempoAss(1.5)).toBe('0:00:01.50');
  });

  it('formata minutos e horas', () => {
    expect(formatarTempoAss(61.25)).toBe('0:01:01.25');
    expect(formatarTempoAss(3661)).toBe('1:01:01.00');
  });

  it('não produz tempo negativo', () => {
    expect(formatarTempoAss(-5)).toBe('0:00:00.00');
  });
});

describe('agrupamento em blocos curtos', () => {
  it('junta até três palavras por bloco', () => {
    const blocos = agruparPalavrasEmBlocos([
      palavra('olha', 0, 0.3),
      palavra('o', 0.3, 0.5),
      palavra('que', 0.5, 0.8),
      palavra('aconteceu', 0.8, 1.2),
    ]);

    expect(blocos).toHaveLength(2);
    expect(blocos[0]?.palavras).toHaveLength(3);
  });

  it('quebra o bloco quando ele ficaria longo demais na tela', () => {
    const blocos = agruparPalavrasEmBlocos([palavra('primeira', 0, 0.4), palavra('segunda', 5, 5.4)]);

    expect(blocos).toHaveLength(2);
  });

  it('devolve vazio quando não há palavras', () => {
    expect(agruparPalavrasEmBlocos([])).toEqual([]);
  });
});

describe('cabeçalho da legenda', () => {
  it('usa a resolução vertical do projeto', () => {
    const cabecalho = montarCabecalhoAss();
    expect(cabecalho).toContain(`PlayResX: ${LARGURA_VERTICAL}`);
    expect(cabecalho).toContain(`PlayResY: ${ALTURA_VERTICAL}`);
  });

  it('aceita fonte diferente, para ambiente sem a padrão', () => {
    expect(montarCabecalhoAss('DejaVu Sans')).toContain('Style: Viral,DejaVu Sans,');
  });

  it('usa texto em negrito com contorno, para ler sobre qualquer fundo', () => {
    const cabecalho = montarCabecalhoAss();
    expect(cabecalho).toMatch(/Style: Viral,[^,]+,\d+,[^,]+,[^,]+,[^,]+,[^,]+,-1/);
  });
});

describe('legenda completa', () => {
  const palavras = [palavra('não', 0, 0.3), palavra('acredito', 0.3, 0.9), palavra('nisso', 0.9, 1.3)];

  it('gera um evento por palavra, para destacar uma de cada vez', () => {
    const legenda = montarLegendaAss({ palavras });
    const eventos = legenda.split('\n').filter((linha) => linha.startsWith('Dialogue:'));

    expect(eventos).toHaveLength(palavras.length);
  });

  it('mostra o bloco inteiro em cada evento, destacando só a palavra corrente', () => {
    const legenda = montarLegendaAss({ palavras });
    const primeiro = legenda.split('\n').find((linha) => linha.startsWith('Dialogue:')) ?? '';

    expect(primeiro).toContain('NÃO');
    expect(primeiro).toContain('ACREDITO');
    expect(primeiro).toContain('NISSO');
  });

  it('escreve em maiúsculas, como no formato viral', () => {
    const legenda = montarLegendaAss({ palavras: [palavra('minusculo', 0, 0.5)] });
    expect(legenda).toContain('MINUSCULO');
  });

  it('remove chaves do texto, que quebrariam a marcação do ASS', () => {
    const legenda = montarLegendaAss({ palavras: [palavra('a{b}c', 0, 0.5)] });
    const evento = legenda.split('\n').find((linha) => linha.startsWith('Dialogue:')) ?? '';

    expect(evento).toContain('ABC');
  });

  it('garante duração mínima para palavra muito curta', () => {
    const legenda = montarLegendaAss({ palavras: [palavra('oi', 1, 1)] });
    const evento = legenda.split('\n').find((linha) => linha.startsWith('Dialogue:')) ?? '';

    expect(evento).not.toContain('0:00:01.00,0:00:01.00');
  });

  it('não gera evento nenhum sem palavras', () => {
    const legenda = montarLegendaAss({ palavras: [] });
    expect(legenda).not.toContain('Dialogue:');
  });
});
