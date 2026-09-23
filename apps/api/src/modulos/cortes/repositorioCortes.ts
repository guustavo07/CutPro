import { StatusCorte, type Prisma, type PrismaClient } from '@cutpro/banco';
import type { ListarCortesDto } from '@cutpro/contratos';

export type CorteDetalhado = NonNullable<Awaited<ReturnType<RepositorioCortes['obterPorId']>>>;

const INCLUSAO_PADRAO = {
  live: {
    select: {
      id: true,
      titulo: true,
      plataforma: true,
      canal: { select: { id: true, nome: true, nomeExibicao: true, urlAvatar: true } },
    },
  },
  momento: {
    select: { motivos: true, categoriaDominante: true, mensagensPorMinuto: true, quantidadeMensagens: true },
  },
  publicacoes: { select: { id: true, plataforma: true, status: true, url: true, dataPublicacao: true } },
} satisfies Prisma.CorteInclude;

export class RepositorioCortes {
  constructor(private readonly prisma: PrismaClient) {}

  private montarFiltro(filtro: ListarCortesDto): Prisma.CorteWhereInput {
    return {
      status: filtro.status ? (filtro.status as StatusCorte) : undefined,
      liveId: filtro.liveId,
      live: filtro.canalId ? { canalId: filtro.canalId } : undefined,
    };
  }

  async listar(filtro: ListarCortesDto) {
    const where = this.montarFiltro(filtro);
    const [itens, total] = await this.prisma.$transaction([
      this.prisma.corte.findMany({
        where,
        include: INCLUSAO_PADRAO,
        orderBy: { dataCriacao: 'desc' },
        skip: (filtro.pagina - 1) * filtro.tamanhoPagina,
        take: filtro.tamanhoPagina,
      }),
      this.prisma.corte.count({ where }),
    ]);

    return { itens, total };
  }

  async obterPorId(id: string) {
    return this.prisma.corte.findUnique({ where: { id }, include: INCLUSAO_PADRAO });
  }

  async atualizar(id: string, dados: Prisma.CorteUpdateInput) {
    return this.prisma.corte.update({ where: { id }, data: dados, include: INCLUSAO_PADRAO });
  }

  async contarPorStatus(status: StatusCorte): Promise<number> {
    return this.prisma.corte.count({ where: { status } });
  }

  async contarCriadosApos(data: Date): Promise<number> {
    return this.prisma.corte.count({ where: { dataCriacao: { gte: data } } });
  }

  async listarRecentes(limite: number) {
    return this.prisma.corte.findMany({
      take: limite,
      orderBy: { dataCriacao: 'desc' },
      include: INCLUSAO_PADRAO,
    });
  }

  async listarPublicadosRecentes(limite: number) {
    return this.prisma.corte.findMany({
      where: { status: StatusCorte.PUBLICADO },
      take: limite,
      orderBy: { dataAtualizacao: 'desc' },
      include: INCLUSAO_PADRAO,
    });
  }
}
