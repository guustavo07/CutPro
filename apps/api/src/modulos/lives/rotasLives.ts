import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ContextoAplicacao } from '@cutpro/nucleo';
import { erroRequisicaoInvalida } from '../../infra/erros.js';
import { RepositorioLives } from './repositorioLives.js';
import { ServicoLives } from './servicoLives.js';

const esquemaParametroId = z.object({ id: z.string().uuid() });

function interpretarId(valor: unknown): string {
  const resultado = esquemaParametroId.safeParse(valor);
  if (!resultado.success) throw erroRequisicaoInvalida('Identificador inválido');

  return resultado.data.id;
}

export async function registrarRotasLives(app: FastifyInstance, contexto: ContextoAplicacao): Promise<void> {
  const servico = new ServicoLives(new RepositorioLives(contexto.prisma));

  app.get('/lives', async () => servico.listarRecentes());

  app.get('/lives/ao-vivo', async () => servico.listarAoVivo());

  app.post('/lives/reiniciar-metricas', async () => servico.reiniciarMetricas());

  app.get('/lives/:id', async (requisicao) => servico.obter(interpretarId(requisicao.params)));

  app.get('/lives/:id/momentos', async (requisicao) => servico.listarMomentos(interpretarId(requisicao.params)));
}
