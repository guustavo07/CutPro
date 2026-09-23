import { NivelEvento, type PrismaClient } from '@cutpro/banco';

export const EtapaPipeline = Object.freeze({
  LIVE_INICIADA: 'live-iniciada',
  LIVE_ENCERRADA: 'live-encerrada',
  CHAT_CONECTADO: 'chat-conectado',
  CHAT_DESCONECTADO: 'chat-desconectado',
  PICO_DETECTADO: 'pico-detectado',
  CANDIDATO_CRIADO: 'candidato-criado',
  CORTE_ENFILEIRADO: 'corte-enfileirado',
  FALHA_PLATAFORMA: 'falha-plataforma',
});

export type EtapaPipeline = (typeof EtapaPipeline)[keyof typeof EtapaPipeline];

export type EntradaEvento = {
  readonly etapa: EtapaPipeline;
  readonly mensagem: string;
  readonly liveId?: string;
  readonly corteId?: string;
  readonly nivel?: NivelEvento;
  readonly contexto?: Record<string, unknown>;
};

export class RegistroEventos {
  constructor(private readonly prisma: PrismaClient) {}

  async registrar(entrada: EntradaEvento): Promise<void> {
    await this.prisma.eventoPipeline.create({
      data: {
        etapa: entrada.etapa,
        mensagem: entrada.mensagem,
        liveId: entrada.liveId ?? null,
        corteId: entrada.corteId ?? null,
        nivel: entrada.nivel ?? NivelEvento.INFO,
        contexto: (entrada.contexto ?? {}) as object,
      },
    });
  }
}
