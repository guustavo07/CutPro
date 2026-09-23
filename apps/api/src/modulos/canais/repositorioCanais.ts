import type { Canal, Plataforma, Prisma, PrismaClient } from '@cutpro/banco';

export type FiltroCanais = {
  readonly apenasAtivos?: boolean;
  readonly plataforma?: Plataforma;
};

export class RepositorioCanais {
  constructor(private readonly prisma: PrismaClient) {}

  async listar(filtro: FiltroCanais = {}): Promise<Canal[]> {
    return this.prisma.canal.findMany({
      where: {
        ativo: filtro.apenasAtivos ? true : undefined,
        plataforma: filtro.plataforma,
      },
      orderBy: { dataCriacao: 'desc' },
    });
  }

  async obterPorId(id: string): Promise<Canal | null> {
    return this.prisma.canal.findUnique({ where: { id } });
  }

  async obterPorIdentificador(entrada: {
    readonly plataforma: Plataforma;
    readonly identificadorExterno: string;
  }): Promise<Canal | null> {
    return this.prisma.canal.findUnique({
      where: {
        plataforma_identificadorExterno: {
          plataforma: entrada.plataforma,
          identificadorExterno: entrada.identificadorExterno,
        },
      },
    });
  }

  async criar(dados: Prisma.CanalCreateInput): Promise<Canal> {
    return this.prisma.canal.create({ data: dados });
  }

  async atualizar(id: string, dados: Prisma.CanalUpdateInput): Promise<Canal> {
    return this.prisma.canal.update({ where: { id }, data: dados });
  }

  async remover(id: string): Promise<void> {
    await this.prisma.canal.delete({ where: { id } });
  }

  async listarMonitorados(): Promise<Canal[]> {
    return this.prisma.canal.findMany({
      where: { ativo: true, monitoramentoAtivo: true },
      orderBy: { nome: 'asc' },
    });
  }

  async contarMonitorados(): Promise<number> {
    return this.prisma.canal.count({ where: { ativo: true, monitoramentoAtivo: true } });
  }
}
