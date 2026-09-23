import { obterClientePrisma, type PrismaClient } from '@cutpro/banco';
import { carregarAmbiente, resolverAPartirDaRaiz, type Ambiente } from '@cutpro/configuracao';
import { criarConexaoRedis, ProdutorFilas } from '@cutpro/filas';
import {
  criarServicoArmazenamento,
  FabricaPlataformas,
  ResolvedorFluxoStreamlink,
  ServicoVideoFfmpeg,
  type ResolvedorFluxoAoVivo,
  type ServicoArmazenamentoArquivo,
  type ServicoVideo,
} from '@cutpro/integracoes';
import { criarAvisoConexaoRedis } from './avisoConexao.js';
import { criarRegistroLog, type RegistroLog } from './registroLog.js';

const CAMINHO_MARCA = 'ativos/marca.png';

export type ContextoAplicacao = {
  readonly ambiente: Ambiente;
  readonly prisma: PrismaClient;
  readonly filas: ProdutorFilas;
  readonly plataformas: FabricaPlataformas;
  readonly armazenamento: ServicoArmazenamentoArquivo;
  readonly video: ServicoVideo;
  readonly resolvedorFluxo: ResolvedorFluxoAoVivo;
  readonly log: RegistroLog;
  readonly diretorioArmazenamentoLocal: string;
  readonly diretorioCaptura: string;
  readonly caminhoMarca: string;
  encerrar(): Promise<void>;
};

export function criarContextoAplicacao(servico: string): ContextoAplicacao {
  const ambiente = carregarAmbiente();
  const log = criarRegistroLog({ servico, desenvolvimento: ambiente.NODE_ENV === 'development' });
  const conexaoRedis = criarConexaoRedis(ambiente.REDIS_URL, criarAvisoConexaoRedis(log));
  const filas = new ProdutorFilas(conexaoRedis);
  const diretorioArmazenamentoLocal = resolverAPartirDaRaiz(ambiente.ARMAZENAMENTO_LOCAL_DIRETORIO);
  const diretorioCaptura = resolverAPartirDaRaiz(ambiente.CAPTURA_DIRETORIO);

  return {
    ambiente,
    prisma: obterClientePrisma(),
    filas,
    plataformas: montarFabricaPlataformas(ambiente),
    armazenamento: montarArmazenamento(ambiente, diretorioArmazenamentoLocal),
    video: new ServicoVideoFfmpeg({
      caminhoFfmpeg: ambiente.FFMPEG_CAMINHO,
      caminhoFfprobe: ambiente.FFPROBE_CAMINHO,
    }),
    resolvedorFluxo: new ResolvedorFluxoStreamlink({ caminhoStreamlink: ambiente.STREAMLINK_CAMINHO }),
    log,
    diretorioArmazenamentoLocal,
    diretorioCaptura,
    caminhoMarca: resolverAPartirDaRaiz(CAMINHO_MARCA),
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
