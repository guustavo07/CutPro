import cors from '@fastify/cors';
import estaticos from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { criarVerificacaoAutenticacao } from './auth/autenticacao.js';
import type { ContextoAplicacao } from '@cutpro/nucleo';
import { ErroAplicacao } from './infra/erros.js';
import { registrarRotasCanais } from './modulos/canais/rotasCanais.js';
import { registrarRotasCortes } from './modulos/cortes/rotasCortes.js';
import { registrarRotasLives } from './modulos/lives/rotasLives.js';
import { registrarRotasPainel } from './modulos/painel/rotasPainel.js';

const STATUS_ERRO_INTERNO = 500;
const STATUS_REQUISICAO_INVALIDA = 400;
const PREFIXO_API = '/api';

function tratarErro(app: FastifyInstance, contexto: ContextoAplicacao): void {
  app.setErrorHandler((erro, _requisicao, resposta) => {
    if (erro instanceof ErroAplicacao) {
      return resposta.status(erro.status).send({ mensagem: erro.message, detalhes: erro.detalhes });
    }
    if (erro instanceof ZodError) {
      return resposta.status(STATUS_REQUISICAO_INVALIDA).send({ mensagem: 'Dados inválidos' });
    }

    contexto.log.error({ erro: erro.message, pilha: erro.stack }, 'Falha não tratada na API');
    return resposta.status(STATUS_ERRO_INTERNO).send({ mensagem: 'Erro interno no servidor' });
  });
}

async function registrarArquivosLocais(app: FastifyInstance, contexto: ContextoAplicacao): Promise<void> {
  if (contexto.armazenamento.provedor !== 'local') return;

  await app.register(estaticos, {
    root: contexto.diretorioArmazenamentoLocal,
    prefix: '/arquivos/',
    decorateReply: false,
  });
}

export async function criarServidor(contexto: ContextoAplicacao): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: contexto.ambiente.PAINEL_ORIGEM_PERMITIDA.split(',') });
  await registrarArquivosLocais(app, contexto);
  tratarErro(app, contexto);

  app.get('/saude', async () => ({ status: 'ok', ambiente: contexto.ambiente.NODE_ENV }));

  await app.register(
    async (instancia) => {
      instancia.addHook('onRequest', criarVerificacaoAutenticacao(contexto.ambiente));
      await registrarRotasCanais(instancia, contexto);
      await registrarRotasLives(instancia, contexto);
      await registrarRotasCortes(instancia, contexto);
      await registrarRotasPainel(instancia, contexto);
    },
    { prefix: PREFIXO_API },
  );

  return app;
}
