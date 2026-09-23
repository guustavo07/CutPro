import { describe, expect, it } from 'vitest';
import { classificarReacao } from '../chat/classificacaoReacao.js';
import { SinalClipScore } from '../constantes/pontuacao.js';
import { CategoriaReacao } from '../enums/categoriaReacao.js';
import { agruparPicosEmMomentos } from './agrupadorMomentos.js';
import { calcularClipScore, calcularClipScoreDetalhado } from './clipScore.js';
import { construirBucketsChat, type MensagemAnalisada } from './serieTemporalChat.js';
import { detectarPicosChat } from './detectorPicos.js';
import { calcularJanelaCorte } from './janelaCorte.js';
import { analisarMomentosDaLive } from './analisadorMomentos.js';

const DURACAO_BASELINE_SEGUNDOS = 900;
const MENSAGENS_POR_MINUTO_NORMAL = 20;
const MENSAGENS_POR_MINUTO_PICO = 180;

function gerarMensagens(entrada: {
  readonly inicioSegundos: number;
  readonly fimSegundos: number;
  readonly mensagensPorMinuto: number;
  readonly texto: string;
}): MensagemAnalisada[] {
  const intervalo = 60 / entrada.mensagensPorMinuto;
  const classificacao = classificarReacao(entrada.texto);
  const mensagens: MensagemAnalisada[] = [];

  for (let instante = entrada.inicioSegundos; instante < entrada.fimSegundos; instante += intervalo) {
    mensagens.push({
      instanteSegundos: instante,
      categoria: classificacao.categoria,
      scoreReacao: classificacao.scoreReacao,
    });
  }

  return mensagens;
}

function montarLiveComPico(instantePicoSegundos: number): MensagemAnalisada[] {
  return [
    ...gerarMensagens({
      inicioSegundos: 0,
      fimSegundos: DURACAO_BASELINE_SEGUNDOS,
      mensagensPorMinuto: MENSAGENS_POR_MINUTO_NORMAL,
      texto: 'boa noite pessoal',
    }),
    ...gerarMensagens({
      inicioSegundos: instantePicoSegundos,
      fimSegundos: instantePicoSegundos + 20,
      mensagensPorMinuto: MENSAGENS_POR_MINUTO_PICO,
      texto: 'KKKKKKKKKK',
    }),
  ];
}

describe('deteccao de pico de chat', () => {
  it('pontua o cenario de 20 para 180 mensagens por minuto perto de 0.9', () => {
    const buckets = construirBucketsChat(montarLiveComPico(600));
    const picos = detectarPicosChat(buckets);

    expect(picos.length).toBeGreaterThan(0);
    expect(picos[0]?.scoreChat).toBeGreaterThan(0.85);
    expect(picos[0]?.categoriaDominante).toBe(CategoriaReacao.HUMOR);
  });

  it('nao detecta pico em chat constante', () => {
    const mensagens = gerarMensagens({
      inicioSegundos: 0,
      fimSegundos: DURACAO_BASELINE_SEGUNDOS,
      mensagensPorMinuto: MENSAGENS_POR_MINUTO_NORMAL,
      texto: 'boa noite pessoal',
    });

    expect(detectarPicosChat(construirBucketsChat(mensagens))).toHaveLength(0);
  });
});

describe('agrupamento de picos', () => {
  it('agrupa picos proximos em um unico momento', () => {
    const picos = detectarPicosChat(construirBucketsChat(montarLiveComPico(600)));
    const momentos = agruparPicosEmMomentos(picos);

    expect(picos.length).toBeGreaterThanOrEqual(2);
    expect(momentos).toHaveLength(1);
  });
});

describe('janela de corte', () => {
  it('aplica 15 segundos antes e 45 depois', () => {
    const janela = calcularJanelaCorte({ instantePicoSegundos: 5143 });

    expect(janela.inicioSegundos).toBe(5128);
    expect(janela.fimSegundos).toBe(5188);
    expect(janela.duracaoSegundos).toBe(60);
  });

  it('nao gera inicio negativo no comeco da live', () => {
    const janela = calcularJanelaCorte({ instantePicoSegundos: 5 });

    expect(janela.inicioSegundos).toBe(0);
    expect(janela.duracaoSegundos).toBeGreaterThanOrEqual(30);
  });

  it('respeita a duracao maxima configurada', () => {
    const janela = calcularJanelaCorte({
      instantePicoSegundos: 1000,
      configuracao: {
        segundosAntes: 60,
        segundosDepois: 120,
        duracaoMinimaSegundos: 30,
        duracaoMaximaSegundos: 90,
      },
    });

    expect(janela.duracaoSegundos).toBe(90);
  });
});

describe('clipScore', () => {
  it('combina os sinais com os pesos padrao', () => {
    const clipScore = calcularClipScore({
      [SinalClipScore.CHAT]: 0.94,
      [SinalClipScore.AUDIO]: 0.81,
      [SinalClipScore.TRANSCRICAO]: 0.89,
      [SinalClipScore.VISUAL]: 0.72,
      [SinalClipScore.ESPECTADORES]: 0.66,
    });

    expect(clipScore).toBeCloseTo(0.8515, 3);
  });

  it('renormaliza os pesos quando so existe o sinal de chat', () => {
    const resultado = calcularClipScoreDetalhado({ [SinalClipScore.CHAT]: 0.9 });

    expect(resultado.clipScore).toBeCloseTo(0.9, 4);
    expect(resultado.contribuicoes[0]?.pesoEfetivo).toBe(1);
  });

  it('retorna zero quando nenhum sinal foi calculado', () => {
    expect(calcularClipScore({})).toBe(0);
  });
});

describe('analisarMomentosDaLive', () => {
  it('gera candidato a corte a partir do pico de chat', () => {
    const momentos = analisarMomentosDaLive({ mensagens: montarLiveComPico(600) });

    expect(momentos).toHaveLength(1);
    expect(momentos[0]?.clipScore).toBeGreaterThan(0.75);
    expect(momentos[0]?.motivos[0]).toContain('Pico de chat');
    expect(momentos[0]?.janela.duracaoSegundos).toBe(60);
  });

  it('descarta momento ja registrado anteriormente', () => {
    const mensagens = montarLiveComPico(600);
    const primeiro = analisarMomentosDaLive({ mensagens });
    const instanteExistente = primeiro[0]?.instantePicoSegundos ?? 0;

    const segundo = analisarMomentosDaLive({
      mensagens,
      instantesExistentesSegundos: [instanteExistente],
    });

    expect(segundo).toHaveLength(0);
  });
});

describe('sinal de reacao versus volume puro', () => {
  it('nao gera candidato quando o surto e de mensagens neutras', () => {
    const mensagens = [
      ...gerarMensagens({
        inicioSegundos: 0,
        fimSegundos: DURACAO_BASELINE_SEGUNDOS,
        mensagensPorMinuto: MENSAGENS_POR_MINUTO_NORMAL,
        texto: 'boa noite pessoal',
      }),
      ...gerarMensagens({
        inicioSegundos: 600,
        fimSegundos: 620,
        mensagensPorMinuto: MENSAGENS_POR_MINUTO_PICO,
        texto: 'entrei agora no canal',
      }),
    ];

    expect(analisarMomentosDaLive({ mensagens })).toHaveLength(0);
  });

  it('detecta reacao mesmo com conversa normal alta em paralelo', () => {
    const mensagens = [
      ...gerarMensagens({
        inicioSegundos: 0,
        fimSegundos: DURACAO_BASELINE_SEGUNDOS,
        mensagensPorMinuto: 500,
        texto: 'qual o proximo jogo',
      }),
      ...gerarMensagens({
        inicioSegundos: 600,
        fimSegundos: 620,
        mensagensPorMinuto: 3000,
        texto: 'KKKKKKKKKK',
      }),
    ];

    const momentos = analisarMomentosDaLive({ mensagens });

    expect(momentos).toHaveLength(1);
    expect(momentos[0]?.clipScore).toBeGreaterThanOrEqual(0.75);
  });
});
