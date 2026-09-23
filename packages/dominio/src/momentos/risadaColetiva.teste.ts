import { describe, expect, it } from 'vitest';
import { USUARIOS_DISTINTOS_MINIMO_RISADA_COLETIVA } from '../constantes/chat.js';
import { CategoriaReacao } from '../enums/categoriaReacao.js';
import {
  calcularBonusRisadaColetiva,
  possuiRisadaColetiva,
} from './analisadorMomentos.js';
import { construirBucketsChat, type MensagemAnalisada } from './serieTemporalChat.js';

function mensagemComEmote(usuario: string, instanteSegundos: number): MensagemAnalisada {
  return {
    instanteSegundos,
    categoria: CategoriaReacao.HUMOR,
    scoreReacao: 0.9,
    usuario,
    possuiEmoteRiso: true,
  };
}

describe('limiar de risada coletiva', () => {
  it('exige o mínimo configurado de usuários distintos', () => {
    expect(possuiRisadaColetiva(USUARIOS_DISTINTOS_MINIMO_RISADA_COLETIVA - 1)).toBe(false);
    expect(possuiRisadaColetiva(USUARIOS_DISTINTOS_MINIMO_RISADA_COLETIVA)).toBe(true);
  });

  it('não concede bônus abaixo do limiar', () => {
    expect(calcularBonusRisadaColetiva(2)).toBe(0);
  });

  it('concede bônus a partir do limiar', () => {
    expect(calcularBonusRisadaColetiva(3)).toBeGreaterThan(0);
  });
});

describe('contagem de usuários distintos por bucket', () => {
  it('conta três espectadores diferentes no mesmo bucket', () => {
    const buckets = construirBucketsChat([
      mensagemComEmote('ana', 1),
      mensagemComEmote('bruno', 3),
      mensagemComEmote('carla', 7),
    ]);

    expect(buckets[0]?.usuariosDistintosComEmoteRiso).toBe(3);
  });

  it('não conta o mesmo espectador duas vezes', () => {
    const buckets = construirBucketsChat([
      mensagemComEmote('ana', 1),
      mensagemComEmote('ana', 2),
      mensagemComEmote('ana', 3),
    ]);

    expect(buckets[0]?.usuariosDistintosComEmoteRiso).toBe(1);
  });

  it('separa a contagem por bucket', () => {
    const buckets = construirBucketsChat([
      mensagemComEmote('ana', 1),
      mensagemComEmote('bruno', 2),
      mensagemComEmote('carla', 15),
    ]);

    expect(buckets[0]?.usuariosDistintosComEmoteRiso).toBe(2);
    expect(buckets[1]?.usuariosDistintosComEmoteRiso).toBe(1);
  });

  it('ignora mensagem sem emote de riso', () => {
    const buckets = construirBucketsChat([
      { instanteSegundos: 1, categoria: CategoriaReacao.HUMOR, scoreReacao: 0.9, usuario: 'ana' },
      mensagemComEmote('bruno', 2),
    ]);

    expect(buckets[0]?.usuariosDistintosComEmoteRiso).toBe(1);
  });

  it('não quebra quando a mensagem não traz usuário', () => {
    const buckets = construirBucketsChat([
      { instanteSegundos: 1, categoria: CategoriaReacao.HUMOR, scoreReacao: 0.9, possuiEmoteRiso: true },
    ]);

    expect(buckets[0]?.usuariosDistintosComEmoteRiso).toBe(0);
  });
});
