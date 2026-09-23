import { describe, expect, it } from 'vitest';
import type { CanalKick } from './kickApi.js';
import { montarIdentificadorLiveKick } from './kickService.js';

function canal(parcial: {
  readonly id: number;
  readonly key?: string | null;
  readonly inicio?: string | null;
}): CanalKick {
  return {
    broadcaster_user_id: parcial.id,
    slug: 'canal',
    channel_description: null,
    banner_picture: null,
    stream: {
      is_live: true,
      start_time: parcial.inicio ?? null,
      viewer_count: 100,
      thumbnail: null,
      key: parcial.key ?? null,
    },
    stream_title: null,
    category: null,
  };
}

describe('identificador de live do Kick', () => {
  it('usa a chave do stream quando ela existe', () => {
    expect(montarIdentificadorLiveKick(canal({ id: 1, key: 'chave-real' }))).toBe('chave-real');
  });

  it('não aceita chave vazia, que o Kick devolve no lugar de nulo', () => {
    const identificador = montarIdentificadorLiveKick(canal({ id: 67160333, key: '', inicio: '2026-09-22T22:40:41Z' }));
    expect(identificador).toBe('67160333-2026-09-22T22:40:41Z');
  });

  it('não aceita chave só com espaços', () => {
    const identificador = montarIdentificadorLiveKick(canal({ id: 42, key: '   ', inicio: '2026-09-23T01:00:00Z' }));
    expect(identificador).toBe('42-2026-09-23T01:00:00Z');
  });

  it('gera identificadores diferentes para canais diferentes sem chave', () => {
    const primeiro = montarIdentificadorLiveKick(canal({ id: 67160333, key: '', inicio: '2026-09-22T22:40:41Z' }));
    const segundo = montarIdentificadorLiveKick(canal({ id: 89576466, key: '', inicio: '2026-09-22T22:40:41Z' }));

    expect(primeiro).not.toBe(segundo);
  });

  it('cai no identificador do canal quando não há chave nem início', () => {
    expect(montarIdentificadorLiveKick(canal({ id: 7 }))).toBe('7-');
  });
});
