import { Plataforma } from '@cutpro/dominio';
import { describe, expect, it } from 'vitest';
import { montarArgumentosStreamlink, montarUrlDoCanal } from './resolvedorFluxo.js';

describe('url do canal por plataforma', () => {
  it('monta a url da Twitch', () => {
    expect(montarUrlDoCanal({ plataforma: Plataforma.TWITCH, canal: 'BahiaQZ' })).toBe(
      'https://www.twitch.tv/bahiaqz',
    );
  });

  it('monta a url do Kick', () => {
    expect(montarUrlDoCanal({ plataforma: Plataforma.KICK, canal: 'JonVlogs' })).toBe('https://kick.com/jonvlogs');
  });

  it('devolve nulo para plataforma sem fluxo conhecido', () => {
    expect(montarUrlDoCanal({ plataforma: 'TIKTOK' as Plataforma, canal: 'qualquer' })).toBeNull();
  });
});

describe('argumentos do streamlink', () => {
  it('pede a url do fluxo na qualidade indicada', () => {
    const argumentos = montarArgumentosStreamlink('https://kick.com/jonvlogs', 'best');
    expect(argumentos).toEqual(['--stream-url', 'https://kick.com/jonvlogs', 'best']);
  });

  it('não usa --quiet, que suprime a própria url na saída', () => {
    const argumentos = montarArgumentosStreamlink('https://kick.com/jonvlogs', 'best');
    expect(argumentos).not.toContain('--quiet');
  });
});
