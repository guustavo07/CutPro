import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

const NIVEIS_LOG_DESENVOLVIMENTO = ['warn', 'error'] as const;

let clienteCompartilhado: PrismaClient | undefined;

export function criarClientePrisma(): PrismaClient {
  return new PrismaClient({ log: [...NIVEIS_LOG_DESENVOLVIMENTO] });
}

export function obterClientePrisma(): PrismaClient {
  if (!clienteCompartilhado) {
    clienteCompartilhado = criarClientePrisma();
  }

  return clienteCompartilhado;
}

export async function encerrarClientePrisma(): Promise<void> {
  if (!clienteCompartilhado) return;

  await clienteCompartilhado.$disconnect();
  clienteCompartilhado = undefined;
}
