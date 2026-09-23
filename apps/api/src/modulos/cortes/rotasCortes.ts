import { esquemaAtualizarCorte, esquemaListarCortes, esquemaPrepararCorte } from '@cutpro/contratos';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ContextoAplicacao } from '@cutpro/nucleo';
import { erroRequisicaoInvalida } from '../../infra/erros.js';
import { RepositorioCortes } from './repositorioCortes.js';
import { ServicoCortes } from './servicoCortes.js';

const esquemaParametroId = z.object({ id: z.string().uuid() });
const STATUS_SEM_CONTEUDO = 204;

function interpretar<E extends z.ZodTypeAny>(esquema: E, valor: unknown): z.output<E> {
  const resultado = esquema.safeParse(valor);
  if (!resultado.success) throw erroRequisicaoInvalida('Dados inválidos', resultado.error.flatten());

  return resultado.data;
}

export async function registrarRotasCortes(app: FastifyInstance, contexto: ContextoAplicacao): Promise<void> {
  const servico = new ServicoCortes(
    new RepositorioCortes(contexto.prisma),
    contexto.armazenamento,
    contexto.filas,
  );

  app.get('/cortes', async (requisicao) => servico.listar(interpretar(esquemaListarCortes, requisicao.query)));

  app.get('/cortes/:id', async (requisicao) => servico.obter(interpretar(esquemaParametroId, requisicao.params).id));

  app.patch('/cortes/:id', async (requisicao) => {
    const { id } = interpretar(esquemaParametroId, requisicao.params);
    return servico.atualizar(id, interpretar(esquemaAtualizarCorte, requisicao.body));
  });

  app.post('/cortes/:id/aprovar', async (requisicao) =>
    servico.aprovar(interpretar(esquemaParametroId, requisicao.params).id),
  );

  app.post('/cortes/:id/rejeitar', async (requisicao) =>
    servico.rejeitar(interpretar(esquemaParametroId, requisicao.params).id),
  );

  app.delete('/cortes', async (requisicao) => {
    const filtro = interpretar(esquemaListarCortes, requisicao.query);
    return servico.removerTodos(filtro.status);
  });

  app.delete('/cortes/:id', async (requisicao, resposta) => {
    await servico.remover(interpretar(esquemaParametroId, requisicao.params).id);
    return resposta.status(STATUS_SEM_CONTEUDO).send();
  });

  app.post('/cortes/:id/preparar', async (requisicao) => {
    const { id } = interpretar(esquemaParametroId, requisicao.params);
    return servico.preparar(id, interpretar(esquemaPrepararCorte, requisicao.body ?? {}));
  });

  app.post('/cortes/:id/regenerar', async (requisicao) =>
    servico.regenerar(interpretar(esquemaParametroId, requisicao.params).id),
  );
}
