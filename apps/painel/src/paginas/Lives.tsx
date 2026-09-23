import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { clienteApi } from '../api/clienteApi';
import type { Live, Momento } from '../api/tipos';
import { EstadoVazio, Etiqueta, IndicadorScore } from '../componentes/Indicadores';
import { TituloPagina } from '../componentes/Layout';
import { formatarDuracao, formatarNumero } from '../utils/formatacao';

export function Lives() {
  const lives = useQuery({ queryKey: ['lives'], queryFn: () => clienteApi.buscar<Live[]>('/lives') });

  if (!lives.data || lives.data.length === 0) {
    return (
      <>
        <TituloPagina titulo="Lives" />
        <EstadoVazio mensagem="Nenhuma live registrada ainda." />
      </>
    );
  }

  return (
    <>
      <TituloPagina titulo="Lives" descricao="Lives monitoradas, em andamento e encerradas." />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-textoSecundario">
            <tr>
              <th className="px-4 py-2">Canal</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Tempo</th>
              <th className="px-4 py-2">Mensagens</th>
              <th className="px-4 py-2">Momentos</th>
              <th className="px-4 py-2">Cortes</th>
            </tr>
          </thead>
          <tbody>
            {lives.data.map((live) => (
              <tr key={live.id} className="bg-superficie">
                <td className="rounded-l-lg px-4 py-3">
                  <Link to={`/lives/${live.id}`} className="font-medium hover:text-destaqueSuave">
                    {live.canalNome}
                  </Link>
                  <p className="text-xs text-textoSecundario">{live.plataforma}</p>
                </td>
                <td className="px-4 py-3">
                  <Etiqueta texto={live.status} />
                </td>
                <td className="px-4 py-3 font-mono">{formatarDuracao(live.duracaoSegundos)}</td>
                <td className="px-4 py-3 tabular-nums">{formatarNumero(live.totalMensagens)}</td>
                <td className="px-4 py-3 tabular-nums">{live.momentosDetectados}</td>
                <td className="rounded-r-lg px-4 py-3 tabular-nums">{live.cortesGerados}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function DetalheLive() {
  const { id = '' } = useParams();
  const live = useQuery({ queryKey: ['live', id], queryFn: () => clienteApi.buscar<Live>(`/lives/${id}`) });
  const momentos = useQuery({
    queryKey: ['live', id, 'momentos'],
    queryFn: () => clienteApi.buscar<Momento[]>(`/lives/${id}/momentos`),
  });

  if (!live.data) return <EstadoVazio mensagem="Carregando live..." />;

  return (
    <>
      <TituloPagina
        titulo={live.data.canalNome}
        descricao={live.data.titulo ?? 'Momentos detectados ordenados por ClipScore.'}
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="cartao">
          <p className="text-xs uppercase text-textoSecundario">Tempo de live</p>
          <p className="mt-2 font-mono text-2xl">{formatarDuracao(live.data.duracaoSegundos)}</p>
        </div>
        <div className="cartao">
          <p className="text-xs uppercase text-textoSecundario">Mensagens</p>
          <p className="mt-2 text-2xl tabular-nums">{formatarNumero(live.data.totalMensagens)}</p>
        </div>
        <div className="cartao">
          <p className="text-xs uppercase text-textoSecundario">Momentos</p>
          <p className="mt-2 text-2xl tabular-nums">{live.data.momentosDetectados}</p>
        </div>
        <div className="cartao">
          <p className="text-xs uppercase text-textoSecundario">Cortes</p>
          <p className="mt-2 text-2xl tabular-nums">{live.data.cortesGerados}</p>
        </div>
      </section>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-textoSecundario">
        Melhores momentos detectados
      </h2>
      {momentos.data && momentos.data.length > 0 ? (
        <div className="grid gap-3">
          {momentos.data.map((momento) => (
            <article key={momento.id} className="cartao flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-mono text-sm">{formatarDuracao(momento.instantePicoSegundos)}</p>
                <p className="mt-1 text-xs text-textoSecundario">
                  {momento.motivos.join(' · ')}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-textoSecundario">ClipScore</p>
                  <IndicadorScore valor={momento.clipScore} />
                </div>
                {momento.corteId ? (
                  <Link to={`/cortes/${momento.corteId}`} className="botao-secundario">
                    Ver corte
                  </Link>
                ) : (
                  <span className="text-xs text-textoSecundario">sem corte</span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EstadoVazio mensagem="Nenhum momento detectado até agora." />
      )}
    </>
  );
}
