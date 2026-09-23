import { encerrarClientePrisma } from '@cutpro/banco';
import {
  INTERVALO_DETECCAO_LIVES_MS,
  NomeFila,
  NomeJob,
  type PayloadAnalisarMomentos,
  type PayloadDetectarLives,
} from '@cutpro/contratos';
import { criarConexaoRedis } from '@cutpro/filas';
import { criarContextoAplicacao, type ContextoAplicacao } from '@cutpro/nucleo';
import { Worker } from 'bullmq';
import { ColetorChat } from './servicos/coletorChat.js';
import { RegistroEventos } from './servicos/registroEventos.js';
import { ServicoAnaliseMomentos } from './servicos/servicoAnaliseMomentos.js';
import { ServicoMonitoramentoLives } from './servicos/servicoMonitoramentoLives.js';

const CONCORRENCIA_MONITORAMENTO = 1;
const CONCORRENCIA_ANALISE = 4;
const SINAIS_ENCERRAMENTO = ['SIGINT', 'SIGTERM'] as const;

function montarServicos(contexto: ContextoAplicacao) {
  const eventos = new RegistroEventos(contexto.prisma);
  const coletor = new ColetorChat(contexto.prisma, eventos, contexto.log);

  return {
    coletor,
    monitoramento: new ServicoMonitoramentoLives(
      contexto.prisma,
      contexto.plataformas,
      coletor,
      contexto.filas,
      eventos,
      contexto.log,
    ),
    analise: new ServicoAnaliseMomentos(contexto.prisma, contexto.filas, eventos, contexto.log),
  };
}

async function iniciar(): Promise<void> {
  const contexto = criarContextoAplicacao('worker');
  const conexao = criarConexaoRedis(contexto.ambiente.REDIS_URL);
  const servicos = montarServicos(contexto);

  const workerMonitoramento = new Worker(
    NomeFila.MONITORAMENTO_LIVES,
    async (job) => {
      const dados = job.data as PayloadDetectarLives;
      await servicos.monitoramento.verificarCanaisMonitorados(dados.canalId);
    },
    { connection: conexao, concurrency: CONCORRENCIA_MONITORAMENTO },
  );

  const workerAnalise = new Worker(
    NomeFila.ANALISE_CHAT,
    async (job) => {
      const dados = job.data as PayloadAnalisarMomentos;
      await servicos.analise.analisarLive(dados.liveId);
    },
    { connection: conexao, concurrency: CONCORRENCIA_ANALISE },
  );

  registrarFalhas(contexto, [workerMonitoramento, workerAnalise]);

  await contexto.filas.agendarRepeticao({
    fila: NomeFila.MONITORAMENTO_LIVES,
    job: NomeJob.DETECTAR_LIVES,
    dados: {},
    intervaloMs: INTERVALO_DETECCAO_LIVES_MS,
  });

  contexto.log.info({ modoSimulado: contexto.ambiente.PLATAFORMA_MODO_SIMULADO }, 'Worker do CutPro iniciado');
  configurarEncerramento({ contexto, workers: [workerMonitoramento, workerAnalise], coletor: servicos.coletor });
}

function registrarFalhas(contexto: ContextoAplicacao, workers: readonly Worker[]): void {
  for (const worker of workers) {
    worker.on('failed', (job, erro) => {
      contexto.log.error({ fila: worker.name, job: job?.name, erro: erro.message }, 'Job falhou');
    });
  }
}

function configurarEncerramento(entrada: {
  readonly contexto: ContextoAplicacao;
  readonly workers: readonly Worker[];
  readonly coletor: ColetorChat;
}): void {
  for (const sinal of SINAIS_ENCERRAMENTO) {
    process.once(sinal, () => {
      void (async () => {
        await entrada.coletor.encerrarTudo();
        await Promise.all(entrada.workers.map((worker) => worker.close()));
        await entrada.contexto.encerrar();
        await encerrarClientePrisma();
        process.exit(0);
      })();
    });
  }
}

iniciar().catch((erro: unknown) => {
  process.stderr.write(`Falha ao iniciar o worker: ${erro instanceof Error ? erro.message : String(erro)}\n`);
  process.exit(1);
});
