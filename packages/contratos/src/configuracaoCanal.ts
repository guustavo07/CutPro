import {
  CLIPSCORE_MINIMO_PADRAO,
  CORTES_MAXIMOS_POR_LIVE_PADRAO,
  DURACAO_MAXIMA_SEGUNDOS_PADRAO,
  DURACAO_MINIMA_SEGUNDOS_PADRAO,
  ModoProcessamento,
  PESOS_CLIPSCORE_PADRAO,
  SEGUNDOS_ANTES_PADRAO,
  SEGUNDOS_DEPOIS_PADRAO,
} from '@cutpro/dominio';
import { z } from 'zod';

export const TemplateVertical = Object.freeze({
  VERTICAL_PADRAO: 'VERTICAL_PADRAO',
  GAMEPLAY_CENTRAL: 'GAMEPLAY_CENTRAL',
  WEBCAM_DESTAQUE: 'WEBCAM_DESTAQUE',
  TELA_CHEIA: 'TELA_CHEIA',
});

export type TemplateVertical = (typeof TemplateVertical)[keyof typeof TemplateVertical];

const SEGUNDOS_MINIMO_JANELA = 0;
const SEGUNDOS_MAXIMO_JANELA = 300;
const DURACAO_MINIMA_PERMITIDA = 5;
const DURACAO_MAXIMA_PERMITIDA = 180;
const CORTES_MAXIMOS_PERMITIDOS = 100;
const PESO_MINIMO = 0;
const PESO_MAXIMO = 1;

const esquemaPesos = z.object({
  chat: z.number().min(PESO_MINIMO).max(PESO_MAXIMO),
  audio: z.number().min(PESO_MINIMO).max(PESO_MAXIMO),
  transcricao: z.number().min(PESO_MINIMO).max(PESO_MAXIMO),
  visual: z.number().min(PESO_MINIMO).max(PESO_MAXIMO),
  espectadores: z.number().min(PESO_MINIMO).max(PESO_MAXIMO),
});

export const esquemaConfiguracaoCanal = z
  .object({
    clipScoreMinimo: z.number().min(PESO_MINIMO).max(PESO_MAXIMO).default(CLIPSCORE_MINIMO_PADRAO),
    duracaoMinimaSegundos: z
      .number()
      .int()
      .min(DURACAO_MINIMA_PERMITIDA)
      .max(DURACAO_MAXIMA_PERMITIDA)
      .default(DURACAO_MINIMA_SEGUNDOS_PADRAO),
    duracaoMaximaSegundos: z
      .number()
      .int()
      .min(DURACAO_MINIMA_PERMITIDA)
      .max(DURACAO_MAXIMA_PERMITIDA)
      .default(DURACAO_MAXIMA_SEGUNDOS_PADRAO),
    segundosAntes: z
      .number()
      .int()
      .min(SEGUNDOS_MINIMO_JANELA)
      .max(SEGUNDOS_MAXIMO_JANELA)
      .default(SEGUNDOS_ANTES_PADRAO),
    segundosDepois: z
      .number()
      .int()
      .min(SEGUNDOS_MINIMO_JANELA)
      .max(SEGUNDOS_MAXIMO_JANELA)
      .default(SEGUNDOS_DEPOIS_PADRAO),
    cortesMaximosPorLive: z
      .number()
      .int()
      .min(1)
      .max(CORTES_MAXIMOS_PERMITIDOS)
      .default(CORTES_MAXIMOS_POR_LIVE_PADRAO),
    legendasAtivas: z.boolean().default(true),
    template: z.nativeEnum(TemplateVertical).default(TemplateVertical.VERTICAL_PADRAO),
    modoProcessamento: z.nativeEnum(ModoProcessamento).default(ModoProcessamento.BALANCEADO),
    pesos: esquemaPesos.default({
      chat: PESOS_CLIPSCORE_PADRAO.chat,
      audio: PESOS_CLIPSCORE_PADRAO.audio,
      transcricao: PESOS_CLIPSCORE_PADRAO.transcricao,
      visual: PESOS_CLIPSCORE_PADRAO.visual,
      espectadores: PESOS_CLIPSCORE_PADRAO.espectadores,
    }),
    publicacaoDiariaMaxima: z.number().int().min(0).max(CORTES_MAXIMOS_PERMITIDOS).default(3),
    hashtagsPadrao: z.array(z.string().max(40)).max(20).default([]),
  })
  .superRefine((configuracao, contexto) => {
    if (configuracao.duracaoMinimaSegundos > configuracao.duracaoMaximaSegundos) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['duracaoMinimaSegundos'],
        message: 'A duração mínima não pode ser maior que a duração máxima',
      });
    }
  });

export type ConfiguracaoCanal = z.infer<typeof esquemaConfiguracaoCanal>;

export const CONFIGURACAO_CANAL_PADRAO: ConfiguracaoCanal = esquemaConfiguracaoCanal.parse({});

export function interpretarConfiguracaoCanal(valor: unknown): ConfiguracaoCanal {
  const resultado = esquemaConfiguracaoCanal.safeParse(valor ?? {});
  if (!resultado.success) return CONFIGURACAO_CANAL_PADRAO;

  return resultado.data;
}
