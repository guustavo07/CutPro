import { esquemaAtualizarCanal, esquemaCriarCanal } from '@cutpro/contratos';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ContextoAplicacao } from '@cutpro/nucleo';
import { erroRequisicaoInvalida } from '../../infra/erros.js';
import { RepositorioCanais } from './repositorioCanais.js';
import { ServicoCanais } from './servicoCanais.js';

const STATUS_CRIADO = 201;
const STATUS_SEM_CONTEUDO = 204;

const esquemaParametroId = z.object({ id: z.string().uuid() });

function interpretar<E extends z.ZodTypeAny>(esquema: E, valor: unknown): z.output<E> {
  const resultado = esquema.safeParse(valor);
  if (!resultado.success) throw erroRequisicaoInvalida('Dados inválidos', resultado.error.flatten());

  return resultado.data;
}

export async function registrarRotasCanais(app: FastifyInstance, contexto: ContextoAplicacao): Promise<void> {
  const servico = new ServicoCanais(new RepositorioCanais(contexto.prisma), contexto.plataformas);

  app.get('/canais', async () => servico.listar());

  app.get('/canais/:id', async (requisicao) => {
    const { id } = interpretar(esquemaParametroId, requisicao.params);
    return servico.obter(id);
  });

  app.post('/canais', async (requisicao, resposta) => {
    const dto = interpretar(esquemaCriarCanal, requisicao.body);
    const canal = await servico.criar(dto);

    return resposta.status(STATUS_CRIADO).send(canal);
  });

  app.patch('/canais/:id', async (requisicao) => {
    const { id } = interpretar(esquemaParametroId, requisicao.params);
    const dto = interpretar(esquemaAtualizarCanal, requisicao.body);

    return servico.atualizar(id, dto);
  });

  app.delete('/canais/:id', async (requisicao, resposta) => {
    const { id } = interpretar(esquemaParametroId, requisicao.params);
    await servico.remover(id);

    return resposta.status(STATUS_SEM_CONTEUDO).send();
  });
}
