import type { Ambiente } from '@cutpro/configuracao';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { jwtVerify } from 'jose';
import { erroNaoAutorizado } from '../infra/erros.js';

const PREFIXO_BEARER = 'Bearer ';
const USUARIO_DESENVOLVIMENTO = Object.freeze({ id: '00000000-0000-0000-0000-000000000000', email: 'dev@local' });

export type UsuarioAutenticado = {
  readonly id: string;
  readonly email: string;
};

declare module 'fastify' {
  interface FastifyRequest {
    usuario?: UsuarioAutenticado;
  }
}

function extrairToken(cabecalho: string | undefined): string | null {
  if (!cabecalho?.startsWith(PREFIXO_BEARER)) return null;

  const token = cabecalho.slice(PREFIXO_BEARER.length).trim();
  return token.length > 0 ? token : null;
}

async function validarToken(token: string, segredo: string): Promise<UsuarioAutenticado> {
  const chave = new TextEncoder().encode(segredo);
  const { payload } = await jwtVerify(token, chave);
  if (!payload.sub) throw erroNaoAutorizado('Token sem identificação de usuário');

  return { id: payload.sub, email: String(payload.email ?? '') };
}

export function criarVerificacaoAutenticacao(ambiente: Ambiente) {
  const autenticacaoDesabilitada = ambiente.SUPABASE_JWT_SECRET.length === 0;
  if (autenticacaoDesabilitada && ambiente.NODE_ENV === 'production') {
    throw new Error('SUPABASE_JWT_SECRET é obrigatório em produção');
  }

  return async function verificarAutenticacao(requisicao: FastifyRequest, _resposta: FastifyReply): Promise<void> {
    if (autenticacaoDesabilitada) {
      requisicao.usuario = USUARIO_DESENVOLVIMENTO;
      return;
    }

    const token = extrairToken(requisicao.headers.authorization);
    if (!token) throw erroNaoAutorizado('Token de acesso ausente');

    requisicao.usuario = await interpretarToken(token, ambiente.SUPABASE_JWT_SECRET);
  };
}

async function interpretarToken(token: string, segredo: string): Promise<UsuarioAutenticado> {
  try {
    return await validarToken(token, segredo);
  } catch {
    throw erroNaoAutorizado('Token de acesso inválido ou expirado');
  }
}
