import { describe, expect, it } from 'vitest';
import { CategoriaReacao } from '../enums/categoriaReacao.js';
import { classificarReacao } from './classificacaoReacao.js';
import { normalizarMensagem, reduzirRepeticoes } from './normalizacao.js';

describe('normalizarMensagem', () => {
  it('remove acentos e reduz repeticoes', () => {
    const resultado = normalizarMensagem('NÃO ACREDITOOOOOO');
    expect(resultado.textoNormalizado).toBe('nao acreditooo');
  });

  it('mede a maior repeticao antes da reducao', () => {
    expect(normalizarMensagem('kkkkkkkkkk').intensidadeRepeticao).toBe(10);
    expect(reduzirRepeticoes('kkkkkkkkkk')).toBe('kkk');
  });

  it('extrai emojis da mensagem original', () => {
    expect(normalizarMensagem('isso foi absurdo 😂😂').emojis).toEqual(['😂', '😂']);
  });
});

describe('classificarReacao como humor', () => {
  const variacoesDeRiso = ['kkkk', 'KKKKKKKK', 'kkkkkkkkkkkkkk', 'kakakaka', 'hahahaha', 'HAHAHA', 'huehuehue', 'rsrsrs', 'lmao', 'LOL'];

  it.each(variacoesDeRiso)('reconhece %s como humor', (texto) => {
    expect(classificarReacao(texto).categoria).toBe(CategoriaReacao.HUMOR);
  });

  it('pontua riso longo acima de riso curto', () => {
    const curto = classificarReacao('kk').scoreReacao;
    const longo = classificarReacao('kkkkkkkkkkkk').scoreReacao;
    expect(longo).toBeGreaterThan(curto);
  });
});

describe('classificarReacao em outras categorias', () => {
  it.each([
    ['W', CategoriaReacao.HYPE],
    ['WWWW', CategoriaReacao.HYPE],
    ['wtf', CategoriaReacao.SURPRESA],
    ['mds', CategoriaReacao.CHOQUE],
    ['caralho', CategoriaReacao.CHOQUE],
    ['não acredito', CategoriaReacao.SURPRESA],
    ['que isso mano', CategoriaReacao.SURPRESA],
    ['MEU DEUS', CategoriaReacao.CHOQUE],
    ['como assim????', CategoriaReacao.CONFUSAO],
    ['gg ez', CategoriaReacao.VITORIA],
    ['🤣', CategoriaReacao.HUMOR],
    ['🔥🔥🔥', CategoriaReacao.HYPE],
  ])('classifica %s como %s', (texto, categoriaEsperada) => {
    expect(classificarReacao(texto).categoria).toBe(categoriaEsperada);
  });

  it('retorna neutro para mensagem sem reacao', () => {
    const resultado = classificarReacao('alguem sabe o nome da musica');
    expect(resultado.categoria).toBe(CategoriaReacao.NEUTRO);
    expect(resultado.scoreReacao).toBe(0);
  });

  it('ignora mensagem vazia', () => {
    expect(classificarReacao('   ').categoria).toBe(CategoriaReacao.NEUTRO);
  });
});
