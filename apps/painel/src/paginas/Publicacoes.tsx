import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { clienteApi, type RespostaPaginada } from '../api/clienteApi';
import type { Corte } from '../api/tipos';
import { EstadoVazio, Etiqueta } from '../componentes/Indicadores';
import { TituloPagina } from '../componentes/Layout';
import { formatarDataHora } from '../utils/formatacao';

export function Publicacoes() {
  const cortes = useQuery({
    queryKey: ['publicacoes'],
    queryFn: () => clienteApi.buscar<RespostaPaginada<Corte>>('/painel/cortes-publicados'),
  });

  if (!cortes.data || cortes.data.itens.length === 0) {
    return (
      <>
        <TituloPagina titulo="Publicações" descricao="Histórico dos cortes publicados." />
        <EstadoVazio mensagem="Nenhum corte publicado ainda. A publicação automática chega na Fase 4." />
      </>
    );
  }

  return (
    <>
      <TituloPagina titulo="Publicações" descricao="Histórico dos cortes publicados." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cortes.data.itens.map((corte) => (
          <article key={corte.id} className="cartao">
            <Link to={`/cortes/${corte.id}`} className="text-sm font-medium hover:text-destaqueSuave">
              {corte.titulo ?? 'Sem título'}
            </Link>
            <p className="mt-1 text-xs text-textoSecundario">{corte.canalNome}</p>
            <div className="mt-3 space-y-2">
              {corte.publicacoes.map((publicacao) => (
                <div key={publicacao.id} className="flex items-center justify-between gap-2 text-xs">
                  <span>{publicacao.plataforma}</span>
                  <Etiqueta texto={publicacao.status} />
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-textoSecundario">{formatarDataHora(corte.dataCriacao)}</p>
          </article>
        ))}
      </div>
    </>
  );
}
