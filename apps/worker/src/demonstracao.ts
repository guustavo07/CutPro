import {
  analisarMomentosPorBuckets,
  classificarReacao,
  construirBucketsChat,
  detectarPicosChat,
  type MensagemAnalisada,
} from '@cutpro/dominio';

const DURACAO_LIVE_SEGUNDOS = 4 * 60 * 60;
const MENSAGENS_POR_MINUTO_BASE = 500;
const MENSAGENS_POR_MINUTO_PICO = 3_000;
const DURACAO_PICO_SEGUNDOS = 20;
const INTERVALO_ENTRE_PICOS_SEGUNDOS = 420;
const SEGUNDOS_POR_MINUTO = 60;

const CONVERSA_NORMAL = ['boa noite', 'alguem sabe a musica', 'primeira vez aqui', 'qual o proximo jogo'];
const REACOES = ['KKKKKKKKKK', 'kkkkkkk', 'W', 'WWW', 'MDS', 'nao acredito', 'que isso', 'caralho'];

function sortear(itens: readonly string[], posicao: number): string {
  return itens[posicao % itens.length] ?? '';
}

function gerarTrecho(entrada: {
  readonly inicioSegundos: number;
  readonly duracaoSegundos: number;
  readonly mensagensPorMinuto: number;
  readonly vocabulario: readonly string[];
}): MensagemAnalisada[] {
  const intervalo = SEGUNDOS_POR_MINUTO / entrada.mensagensPorMinuto;
  const mensagens: MensagemAnalisada[] = [];
  let posicao = 0;

  for (let deslocamento = 0; deslocamento < entrada.duracaoSegundos; deslocamento += intervalo) {
    const classificacao = classificarReacao(sortear(entrada.vocabulario, posicao));
    mensagens.push({
      instanteSegundos: entrada.inicioSegundos + deslocamento,
      categoria: classificacao.categoria,
      scoreReacao: classificacao.scoreReacao,
    });
    posicao += 1;
  }

  return mensagens;
}

function gerarLiveSimulada(): MensagemAnalisada[] {
  const base = gerarTrecho({
    inicioSegundos: 0,
    duracaoSegundos: DURACAO_LIVE_SEGUNDOS,
    mensagensPorMinuto: MENSAGENS_POR_MINUTO_BASE,
    vocabulario: CONVERSA_NORMAL,
  });

  const picos: MensagemAnalisada[] = [];
  for (let instante = INTERVALO_ENTRE_PICOS_SEGUNDOS; instante < DURACAO_LIVE_SEGUNDOS; instante += INTERVALO_ENTRE_PICOS_SEGUNDOS) {
    picos.push(
      ...gerarTrecho({
        inicioSegundos: instante,
        duracaoSegundos: DURACAO_PICO_SEGUNDOS,
        mensagensPorMinuto: MENSAGENS_POR_MINUTO_PICO,
        vocabulario: REACOES,
      }),
    );
  }

  return [...base, ...picos].sort((primeira, segunda) => primeira.instanteSegundos - segunda.instanteSegundos);
}

function formatarInstante(totalSegundos: number): string {
  const horas = String(Math.floor(totalSegundos / 3600)).padStart(2, '0');
  const minutos = String(Math.floor((totalSegundos % 3600) / 60)).padStart(2, '0');
  const segundos = String(Math.floor(totalSegundos % 60)).padStart(2, '0');

  return `${horas}:${minutos}:${segundos}`;
}

function executar(): void {
  const mensagens = gerarLiveSimulada();
  const buckets = construirBucketsChat(mensagens);
  const picos = detectarPicosChat(buckets);
  const momentos = analisarMomentosPorBuckets({ buckets, duracaoLiveSegundos: DURACAO_LIVE_SEGUNDOS });

  const linhas = [
    'Funil de deteccao do CutPro (live simulada de 4 horas)',
    '',
    `Mensagens de chat processadas : ${mensagens.length.toLocaleString('pt-BR')}`,
    `Buckets de 10s agregados      : ${buckets.length.toLocaleString('pt-BR')}`,
    `Picos de reacao detectados    : ${picos.length}`,
    `Candidatos apos agrupamento   : ${momentos.length}`,
    '',
    'Momentos selecionados:',
  ];

  for (const momento of momentos) {
    linhas.push(
      `  ${formatarInstante(momento.instantePicoSegundos)}  ClipScore ${momento.clipScore.toFixed(2)}  ` +
        `corte ${formatarInstante(momento.janela.inicioSegundos)} -> ${formatarInstante(momento.janela.fimSegundos)}  ` +
        `(${momento.janela.duracaoSegundos}s)`,
    );
    for (const motivo of momento.motivos) {
      linhas.push(`      - ${motivo}`);
    }
  }

  process.stdout.write(`${linhas.join('\n')}\n`);
}

executar();
