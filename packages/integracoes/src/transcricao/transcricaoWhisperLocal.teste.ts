import { describe, expect, it } from 'vitest';
import {
  interpretarSaidaWhisper,
  montarArgumentosTranscricao,
  nomeArquivoSaida,
  TranscricaoSimulada,
} from './transcricaoWhisperLocal.js';

const ENTRADA = {
  caminhoMidia: '/tmp/corte/audio.wav',
  diretorioSaida: '/tmp/corte',
  modelo: 'small',
  idioma: 'pt',
};

describe('argumentos da transcrição', () => {
  const argumentos = montarArgumentosTranscricao(ENTRADA);

  it('pede tempo por palavra, que é o que a legenda precisa', () => {
    const posicao = argumentos.indexOf('--word_timestamps');
    expect(argumentos[posicao + 1]).toBe('True');
  });

  it('pede saída em json', () => {
    const posicao = argumentos.indexOf('--output_format');
    expect(argumentos[posicao + 1]).toBe('json');
  });

  it('fixa o idioma, para não perder tempo detectando', () => {
    const posicao = argumentos.indexOf('--language');
    expect(argumentos[posicao + 1]).toBe('pt');
  });

  it('grava no diretório de trabalho do corte', () => {
    const posicao = argumentos.indexOf('--output_dir');
    expect(argumentos[posicao + 1]).toBe('/tmp/corte');
  });
});

describe('nome do arquivo de saída', () => {
  it('troca a extensão da mídia por json', () => {
    expect(nomeArquivoSaida('/tmp/corte/audio.wav')).toBe('audio.json');
    expect(nomeArquivoSaida('trecho.mp4')).toBe('trecho.json');
  });
});

describe('interpretação da saída', () => {
  const saida = JSON.stringify({
    text: ' não acredito nisso ',
    language: 'pt',
    segments: [
      {
        text: ' não acredito',
        words: [
          { start: 0.1, end: 0.4, word: ' não' },
          { start: 0.4, end: 1.0, word: ' acredito' },
        ],
      },
      { text: ' nisso', words: [{ start: 1.0, end: 1.4, word: ' nisso' }] },
    ],
  });

  it('junta as palavras de todos os segmentos', () => {
    expect(interpretarSaidaWhisper(saida).palavras).toHaveLength(3);
  });

  it('remove o espaço que o whisper coloca antes da palavra', () => {
    expect(interpretarSaidaWhisper(saida).palavras[0]?.texto).toBe('não');
  });

  it('preserva os tempos de cada palavra', () => {
    const palavra = interpretarSaidaWhisper(saida).palavras[1];
    expect(palavra?.inicioSegundos).toBe(0.4);
    expect(palavra?.fimSegundos).toBe(1);
  });

  it('descarta palavra sem tempo, que quebraria a legenda', () => {
    const incompleta = JSON.stringify({
      segments: [{ words: [{ word: 'sem tempo' }, { start: 1, end: 2, word: 'boa' }] }],
    });

    expect(interpretarSaidaWhisper(incompleta).palavras).toHaveLength(1);
  });

  it('não quebra quando não há segmento nenhum', () => {
    const resultado = interpretarSaidaWhisper(JSON.stringify({ text: '' }));
    expect(resultado.palavras).toEqual([]);
    expect(resultado.idioma).toBe('pt');
  });
});

describe('transcrição simulada', () => {
  it('devolve resultado vazio, sem palavras', async () => {
    const resultado = await new TranscricaoSimulada().transcrever();
    expect(resultado.palavras).toEqual([]);
  });
});
