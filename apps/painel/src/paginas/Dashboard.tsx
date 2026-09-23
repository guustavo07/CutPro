import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { clienteApi, type RespostaPaginada } from '../api/clienteApi';
import type { Corte, Live, ResumoPainel } from '../api/tipos';
import { CartaoMetrica, Etiqueta, EstadoVazio, IndicadorScore } from '../componentes/Indicadores';
import { TituloPagina } from '../componentes/Layout';
import { formatarDuracao, formatarNumero } from '../utils/formatacao';

function CartaoLive({ live }: { readonly live: Live }) {
  return (
    <Link to={`/lives/${live.id}`} className="cartao transition hover:border-destaque">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-textoSecundario">{live.plataforma}</p>
          <p className="mt-1 text-base font-medium">{live.canalNome}</p>
        </div>
        <Etiqueta texto={live.status} />
      </div>
      <p className="mt-2 line-clamp-1 text-sm text-textoSecundario">{live.titulo ?? 'Sem título'}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-textoSecundario">Tempo</dt>
          <dd className="font-mono">{formatarDuracao(live.duracaoSegundos)}</dd>
        </div>
        <div>
          <dt className="text-xs text-textoSecundario">Mensagens</dt>
          <dd className="tabular-nums">{formatarNumero(live.totalMensagens)}</dd>
        </div>
        <div>
          <dt className="text-xs text-textoSecundario">Momentos</dt>
          <dd className="tabular-nums">{live.momentosDetectados}</dd>
        </div>
        <div>
          <dt className="text-xs text-textoSecundario">Cortes</dt>
          <dd className="tabular-nums">{live.cortesGerados}</dd>
        </div>
      </dl>
    </Link>
  );
}

function GradeCortes({ cortes }: { readonly cortes: readonly Corte[] }) {
  if (cortes.length === 0) return <EstadoVazio mensagem="Nenhum corte gerado ainda." />;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cortes.map((corte) => (
        <Link key={corte.id} to={`/cortes/${corte.id}`} className="cartao transition hover:border-destaque">
          <div className="mb-3 flex aspect-[9/16] items-center justify-center overflow-hidden rounded-lg bg-superficieAlta">
            {corte.urlMiniatura ? (
              <img src={corte.urlMiniatura} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-textoSecundario">sem preview</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{corte.canalNome}</span>
            <IndicadorScore valor={corte.clipScore} />
          </div>
          <div className="mt-2">
            <Etiqueta texto={corte.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}

export function Dashboard() {
  const resumo = useQuery({
    queryKey: ['painel', 'resumo'],
    queryFn: () => clienteApi.buscar<ResumoPainel>('/painel/resumo'),
  });
  const lives = useQuery({
    queryKey: ['painel', 'lives'],
    queryFn: () => clienteApi.buscar<Live[]>('/painel/lives-ao-vivo'),
  });
  const cortes = useQuery({
    queryKey: ['painel', 'cortes'],
    queryFn: () => clienteApi.buscar<RespostaPaginada<Corte>>('/painel/cortes-recentes'),
  });

  return (
    <>
      <TituloPagina titulo="Dashboard" descricao="Visão geral do monitoramento e da geração de cortes." />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoMetrica rotulo="Canais monitorados" valor={resumo.data?.canaisMonitorados ?? 0} />
        <CartaoMetrica rotulo="Lives ao vivo" valor={resumo.data?.livesAoVivo ?? 0} />
        <CartaoMetrica rotulo="Cortes gerados hoje" valor={resumo.data?.cortesGeradosHoje ?? 0} />
        <CartaoMetrica rotulo="Cortes publicados" valor={resumo.data?.cortesPublicados ?? 0} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-textoSecundario">Lives atuais</h2>
        {lives.data && lives.data.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {lives.data.map((live) => (
              <CartaoLive key={live.id} live={live} />
            ))}
          </div>
        ) : (
          <EstadoVazio mensagem="Nenhum canal ao vivo no momento." />
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-textoSecundario">Últimos cortes</h2>
        <GradeCortes cortes={cortes.data?.itens ?? []} />
      </section>
    </>
  );
}
