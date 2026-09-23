import { describe, expect, it } from 'vitest';
import { CategoriaReacao } from '../enums/categoriaReacao.js';
import { classificarReacao } from './classificacaoReacao.js';
import { extrairEmotes, normalizarMensagem } from './normalizacao.js';

describe('extração de emote de plataforma', () => {
  it('extrai o nome do emote no formato da Kick', () => {
    expect(extrairEmotes('[emote:5748031:collectibleswideKEKW]')).toEqual(['collectibleswidekekw']);
  });

  it('extrai vários emotes da mesma mensagem', () => {
    const emotes = extrairEmotes('[emote:37225:KEKLEO] olha isso [emote:5748031:KEKW]');
    expect(emotes).toEqual(['kekleo', 'kekw']);
  });

  it('não gera token de lixo a partir da marcação do emote', () => {
    const normalizada = normalizarMensagem('[emote:5748031:KEKW]');
    expect(normalizada.tokens).toEqual([]);
  });

  it('mantém o texto ao redor do emote', () => {
    const normalizada = normalizarMensagem('olha isso [emote:5748031:KEKW] mano');
    expect(normalizada.tokens).toEqual(['olha', 'isso', 'mano']);
  });
});

describe('classificação de emote de riso', () => {
  it('reconhece o KEKW da Kick como humor', () => {
    const resultado = classificarReacao('[emote:5748031:collectibleswideKEKW]');
    expect(resultado.possuiEmoteRiso).toBe(true);
    expect(resultado.categoria).toBe(CategoriaReacao.HUMOR);
  });

  it('reconhece variantes do KEKW', () => {
    expect(classificarReacao('[emote:1:wideKEKW]').possuiEmoteRiso).toBe(true);
    expect(classificarReacao('[emote:2:KEKW]').possuiEmoteRiso).toBe(true);
  });

  it('reconhece KEKW como texto puro, que é como chega na Twitch', () => {
    const resultado = classificarReacao('KEKW');
    expect(resultado.possuiEmoteRiso).toBe(true);
    expect(resultado.categoria).toBe(CategoriaReacao.HUMOR);
  });

  it('não marca emote de riso em outro emote qualquer', () => {
    expect(classificarReacao('[emote:5748073:collectiblesMONKE]').possuiEmoteRiso).toBe(false);
  });

  it('não marca emote de riso em risada escrita', () => {
    expect(classificarReacao('kkkkkkk').possuiEmoteRiso).toBe(false);
  });

  it('mensagem neutra não possui emote de riso', () => {
    expect(classificarReacao('boa noite pessoal').possuiEmoteRiso).toBe(false);
  });
});
