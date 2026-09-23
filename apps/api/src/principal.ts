import { encerrarClientePrisma } from '@cutpro/banco';
import { criarContextoAplicacao } from '@cutpro/nucleo';
import { criarServidor } from './servidor.js';

const ENDERECO_ESCUTA = '0.0.0.0';
const SINAIS_ENCERRAMENTO = ['SIGINT', 'SIGTERM'] as const;

async function iniciar(): Promise<void> {
  const contexto = criarContextoAplicacao('api');
  const app = await criarServidor(contexto);

  await app.listen({ port: contexto.ambiente.API_PORTA, host: ENDERECO_ESCUTA });
  contexto.log.info(
    { porta: contexto.ambiente.API_PORTA, modoSimulado: contexto.ambiente.PLATAFORMA_MODO_SIMULADO },
    'API do CutPro iniciada',
  );

  for (const sinal of SINAIS_ENCERRAMENTO) {
    process.once(sinal, () => void encerrar(app.close.bind(app), contexto.encerrar));
  }
}

async function encerrar(fecharServidor: () => Promise<void>, encerrarContexto: () => Promise<void>): Promise<void> {
  await fecharServidor();
  await encerrarContexto();
  await encerrarClientePrisma();
  process.exit(0);
}

iniciar().catch((erro: unknown) => {
  process.stderr.write(`Falha ao iniciar a API: ${erro instanceof Error ? erro.message : String(erro)}\n`);
  process.exit(1);
});
