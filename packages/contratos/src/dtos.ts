import { Plataforma, PLATAFORMAS_SUPORTADAS } from '@cutpro/dominio';
import { z } from 'zod';
import { esquemaConfiguracaoCanal } from './configuracaoCanal.js';

const TAMANHO_MAXIMO_NOME = 120;
const TAMANHO_MAXIMO_TITULO = 200;
const TAMANHO_MAXIMO_DESCRICAO = 1000;

export const esquemaCriarCanal = z.object({
  identificador: z.string().trim().min(1).max(TAMANHO_MAXIMO_NOME),
  plataforma: z.enum(PLATAFORMAS_SUPORTADAS as [Plataforma, ...Plataforma[]]),
  monitoramentoAtivo: z.boolean().default(true),
  geracaoAutomaticaAtiva: z.boolean().default(false),
  publicacaoAutomaticaAtiva: z.boolean().default(false),
  configuracao: esquemaConfiguracaoCanal.optional(),
});

export type CriarCanalDto = z.infer<typeof esquemaCriarCanal>;

export const esquemaAtualizarCanal = z.object({
  ativo: z.boolean().optional(),
  monitoramentoAtivo: z.boolean().optional(),
  geracaoAutomaticaAtiva: z.boolean().optional(),
  publicacaoAutomaticaAtiva: z.boolean().optional(),
  configuracao: esquemaConfiguracaoCanal.optional(),
});

export type AtualizarCanalDto = z.infer<typeof esquemaAtualizarCanal>;

export const esquemaAtualizarCorte = z.object({
  titulo: z.string().trim().max(TAMANHO_MAXIMO_TITULO).optional(),
  descricao: z.string().trim().max(TAMANHO_MAXIMO_DESCRICAO).optional(),
  hashtags: z.array(z.string().trim().max(40)).max(20).optional(),
  inicioSegundos: z.number().int().min(0).optional(),
  fimSegundos: z.number().int().min(0).optional(),
  template: z.string().trim().max(60).optional(),
});

export type AtualizarCorteDto = z.infer<typeof esquemaAtualizarCorte>;

export const esquemaListarCortes = z.object({
  status: z.string().optional(),
  canalId: z.string().uuid().optional(),
  liveId: z.string().uuid().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  tamanhoPagina: z.coerce.number().int().min(1).max(100).default(24),
});

export type ListarCortesDto = z.infer<typeof esquemaListarCortes>;

export type ResumoPainel = {
  readonly canaisMonitorados: number;
  readonly livesAoVivo: number;
  readonly cortesGeradosHoje: number;
  readonly cortesPublicados: number;
};

export type LiveMonitorada = {
  readonly id: string;
  readonly canalId: string;
  readonly canalNome: string;
  readonly plataforma: Plataforma;
  readonly titulo: string | null;
  readonly status: string;
  readonly inicio: string;
  readonly duracaoSegundos: number;
  readonly totalMensagens: number;
  readonly momentosDetectados: number;
  readonly cortesGerados: number;
  readonly ultimaAtividade: string;
};
