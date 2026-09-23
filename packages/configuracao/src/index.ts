import { config as carregarArquivoEnv } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

const PORTA_PADRAO = 3333;
const CAMINHO_ENV = resolve(process.cwd(), '.env');

const esquemaAmbiente = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  API_PORTA: z.coerce.number().int().min(1).max(65535).default(PORTA_PADRAO),
  API_URL_PUBLICA: z.string().url().default(`http://localhost:${PORTA_PADRAO}`),
  PAINEL_ORIGEM_PERMITIDA: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  SUPABASE_URL: z.string().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(''),
  SUPABASE_JWT_SECRET: z.string().default(''),
  SUPABASE_BUCKET_CORTES: z.string().default('cortes'),

  ARMAZENAMENTO_PROVEDOR: z.enum(['local', 'supabase']).default('local'),
  ARMAZENAMENTO_LOCAL_DIRETORIO: z.string().default('./armazenamento'),

  PLATAFORMA_MODO_SIMULADO: z
    .string()
    .default('false')
    .transform((valor) => valor === 'true'),
  TWITCH_CLIENT_ID: z.string().default(''),
  TWITCH_CLIENT_SECRET: z.string().default(''),
  KICK_CLIENT_ID: z.string().default(''),
  KICK_CLIENT_SECRET: z.string().default(''),
  KICK_PUSHER_APP_KEY: z.string().default('32cbd69e4b950bf97679'),

  FFMPEG_CAMINHO: z.string().default('ffmpeg'),
  FFPROBE_CAMINHO: z.string().default('ffprobe'),

  IA_PROVEDOR: z.string().default('mock'),
  IA_API_KEY: z.string().default(''),
  IA_MODELO: z.string().default('claude-sonnet-5'),
  TRANSCRICAO_PROVEDOR: z.string().default('mock'),
  TRANSCRICAO_API_KEY: z.string().default(''),
});

export type Ambiente = z.infer<typeof esquemaAmbiente>;

let ambienteCarregado: Ambiente | undefined;

export function carregarAmbiente(): Ambiente {
  if (ambienteCarregado) return ambienteCarregado;

  carregarArquivoEnv({ path: CAMINHO_ENV });
  const resultado = esquemaAmbiente.safeParse(process.env);
  if (!resultado.success) {
    const detalhes = resultado.error.issues.map((problema) => problema.path.join('.')).join(', ');
    throw new Error(`Variáveis de ambiente inválidas ou ausentes: ${detalhes}`);
  }

  ambienteCarregado = resultado.data;
  return ambienteCarregado;
}

export function estaEmProducao(ambiente: Ambiente): boolean {
  return ambiente.NODE_ENV === 'production';
}
