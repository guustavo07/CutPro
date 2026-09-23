import { obterClientePrisma, type PrismaClient } from '@cutpro/banco';
import { carregarAmbiente, type Ambiente } from '@cutpro/configuracao';
import { criarConexaoRedis, ProdutorFilas } from '@cutpro/filas';
import {
  criarServicoArmazenamento,
  FabricaPlataformas,
  type ServicoArmazenamentoArquivo,
} from '@cutpro/integracoes';
import { resolve } from 'node:path';
import { criarAvisoConexaoRedis } from './avisoConexao.js';
import { criarRegistroLog, type RegistroLog } from './registroLog.js';

export type ContextoAplicacao = {
  readonly ambiente: Ambiente;
  readonly prisma: PrismaClient;
  readonly filas: ProdutorFilas;
  readonly plataformas: FabricaPlataformas;
  readonly armazenamento: ServicoArmazenamentoArquivo;
  readonly log: RegistroLog;
  readonly diretorioArmazenamentoLocal: string;
  encerrar(): Promise<void>;
};

export function criarContextoAplicacao(servico: string): ContextoAplicacao {
  const ambiente = carregarAmbiente();
  const log = criarRegistroLog({ servico, desenvolvimento: ambiente.NODE_ENV === 'development' });
  const conexaoRedis = criarConexaoRedis(ambiente.REDIS_URL, criarAvisoConexaoRedis(log));
  const filas = new ProdutorFilas(conexaoRedis);
  const diretorioArmazenamentoLocal = resolve(process.cwd(), ambiente.ARMAZENAMENTO_LOCAL_DIRETORIO);

  return {
    ambiente,
    prisma: obterClientePrisma(),
    filas,
    plataformas: montarFabricaPlataformas(ambiente),
    armazenamento: montarArmazenamento(ambiente, diretorioArmazenamentoLocal),
    log,
    diretorioArmazenamentoLocal,
    encerrar: async () => {
      await filas.encerrar();
      conexaoRedis.disconnect();
    },
  };
}

function montarFabricaPlataformas(ambiente: Ambiente): FabricaPlataformas {
  return new FabricaPlataformas({
    modoSimulado: ambiente.PLATAFORMA_MODO_SIMULADO,
    twitch: { clientId: ambiente.TWITCH_CLIENT_ID, clientSecret: ambiente.TWITCH_CLIENT_SECRET },
    kick: {
      clientId: ambiente.KICK_CLIENT_ID,
      clientSecret: ambiente.KICK_CLIENT_SECRET,
      chavePusher: ambiente.KICK_PUSHER_APP_KEY,
    },
  });
}

function montarArmazenamento(ambiente: Ambiente, diretorioLocal: string): ServicoArmazenamentoArquivo {
  return criarServicoArmazenamento({
    provedor: ambiente.ARMAZENAMENTO_PROVEDOR,
    diretorioLocal,
    urlPublicaBase: ambiente.API_URL_PUBLICA,
    supabase: {
      url: ambiente.SUPABASE_URL,
      chaveServico: ambiente.SUPABASE_SERVICE_ROLE_KEY,
      bucket: ambiente.SUPABASE_BUCKET_CORTES,
    },
  });
}
