import { StatusLive, type PrismaClient } from '@cutpro/banco';

const LIVES_RECENTES_PADRAO = 20;

export type LiveComContagens = Awaited<ReturnType<RepositorioLives['listarRecentes']>>[number];

export class RepositorioLives {
  constructor(private readonly prisma: PrismaClient) {}

  async listarRecentes(limite: number = LIVES_RECENTES_PADRAO) {
    return this.prisma.live.findMany({
      take: limite,
      orderBy: { inicio: 'desc' },
      include: {
        canal: { select: { id: true, nome: true, nomeExibicao: true, urlAvatar: true } },
        _count: { select: { momentos: true, cortes: true } },
      },
    });
  }

  async listarAoVivo() {
    return this.prisma.live.findMany({
      where: { status: StatusLive.AO_VIVO },
      orderBy: { inicio: 'desc' },
      include: {
        canal: { select: { id: true, nome: true, nomeExibicao: true, urlAvatar: true } },
        _count: { select: { momentos: true, cortes: true } },
      },
    });
  }

  async obterPorId(id: string) {
    return this.prisma.live.findUnique({
      where: { id },
      include: {
        canal: { select: { id: true, nome: true, nomeExibicao: true, urlAvatar: true } },
        _count: { select: { momentos: true, cortes: true } },
      },
    });
  }

  async listarMomentos(liveId: string) {
    return this.prisma.momentoDetectado.findMany({
      where: { liveId },
      orderBy: { clipScore: 'desc' },
      include: { corte: { select: { id: true, status: true } } },
    });
  }

  async contarAoVivo(): Promise<number> {
    return this.prisma.live.count({ where: { status: StatusLive.AO_VIVO } });
  }
}
