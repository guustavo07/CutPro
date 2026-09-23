import { StatusCorte } from '@cutpro/banco';
import type { ResumoPainel } from '@cutpro/contratos';
import type { FastifyInstance } from 'fastify';
import type { ContextoAplicacao } from '@cutpro/nucleo';
import { RepositorioCanais } from '../canais/repositorioCanais.js';
import { RepositorioCortes } from '../cortes/repositorioCortes.js';
import { ServicoCortes } from '../cortes/servicoCortes.js';
import { RepositorioLives } from '../lives/repositorioLives.js';
import { ServicoLives } from '../lives/servicoLives.js';

const CORTES_RECENTES_NO_PAINEL = 8;

function inicioDoDia(): Date {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

export async function registrarRotasPainel(app: FastifyInstance, contexto: ContextoAplicacao): Promise<void> {
  const repositorioCanais = new RepositorioCanais(contexto.prisma);
  const repositorioLives = new RepositorioLives(contexto.prisma);
  const repositorioCortes = new RepositorioCortes(contexto.prisma);
  const servicoLives = new ServicoLives(repositorioLives);
  const servicoCortes = new ServicoCortes(repositorioCortes, contexto.armazenamento, contexto.filas);

  app.get('/painel/resumo', async (): Promise<ResumoPainel> => {
    const [canaisMonitorados, livesAoVivo, cortesGeradosHoje, cortesPublicados] = await Promise.all([
      repositorioCanais.contarMonitorados(),
      repositorioLives.contarAoVivo(),
      repositorioCortes.contarCriadosApos(inicioDoDia()),
      repositorioCortes.contarPorStatus(StatusCorte.PUBLICADO),
    ]);

    return { canaisMonitorados, livesAoVivo, cortesGeradosHoje, cortesPublicados };
  });

  app.get('/painel/lives-ao-vivo', async () => servicoLives.listarAoVivo());

  app.get('/painel/cortes-recentes', async () =>
    servicoCortes.listar({ pagina: 1, tamanhoPagina: CORTES_RECENTES_NO_PAINEL }),
  );

  app.get('/painel/cortes-publicados', async () =>
    servicoCortes.listar({ pagina: 1, tamanhoPagina: CORTES_RECENTES_NO_PAINEL, status: StatusCorte.PUBLICADO }),
  );
}
