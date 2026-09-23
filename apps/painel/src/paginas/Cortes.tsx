import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { clienteApi, type RespostaPaginada } from '../api/clienteApi';
import type { Corte } from '../api/tipos';
import { EstadoVazio, Etiqueta, IndicadorScore } from '../componentes/Indicadores';
import { TituloPagina } from '../componentes/Layout';
import { estaEmPreparo, PreparacaoCorte } from '../componentes/PreparacaoCorte';
import { formatarDataHora, formatarDuracaoCurta } from '../utils/formatacao';

const FILTROS = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'DETECTADO', rotulo: 'Detectados' },
  { valor: 'AGUARDANDO_PROCESSAMENTO', rotulo: 'Na fila' },
  { valor: 'RENDERIZANDO', rotulo: 'Processando' },
  { valor: 'PRONTO', rotulo: 'Prontos' },
  { valor: 'APROVADO', rotulo: 'Aprovados' },
  { valor: 'PUBLICADO', rotulo: 'Publicados' },
  { valor: 'REJEITADO', rotulo: 'Rejeitados' },
  { valor: 'ERRO', rotulo: 'Erro' },
];

export function Cortes() {
  const [status, definirStatus] = useState('');
  const cortes = useQuery({
    queryKey: ['cortes', status],
    queryFn: () =>
      clienteApi.buscar<RespostaPaginada<Corte>>(`/cortes${status ? `?status=${status}` : ''}`),
  });

  return (
    <>
      <TituloPagina titulo="Cortes" descricao="Todos os cortes gerados pelo sistema." />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTROS.map((filtro) => (
          <button
            key={filtro.rotulo}
            type="button"
            onClick={() => definirStatus(filtro.valor)}
            className={
              status === filtro.valor
                ? 'rounded-full bg-destaque px-3 py-1 text-xs text-white'
                : 'rounded-full border border-borda px-3 py-1 text-xs text-textoSecundario hover:border-destaque'
            }
          >
            {filtro.rotulo}
          </button>
        ))}
      </div>

      {cortes.data && cortes.data.itens.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cortes.data.itens.map((corte) => (
            <Link key={corte.id} to={`/cortes/${corte.id}`} className="cartao transition hover:border-destaque">
              <div className="mb-3 flex aspect-[9/16] items-center justify-center overflow-hidden rounded-lg bg-superficieAlta">
                {corte.urlMiniatura ? (
                  <img src={corte.urlMiniatura} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-textoSecundario">sem preview</span>
                )}
              </div>
              <p className="line-clamp-2 text-sm font-medium">{corte.titulo ?? 'Sem título gerado'}</p>
              <p className="mt-1 text-xs text-textoSecundario">
                {corte.canalNome} · {formatarDuracaoCurta(corte.duracaoSegundos)}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <Etiqueta texto={corte.status} />
                <IndicadorScore valor={corte.clipScore} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EstadoVazio mensagem="Nenhum corte encontrado para este filtro." />
      )}
    </>
  );
}

const INTERVALO_ATUALIZACAO_PREPARO_MS = 3000;

export function DetalheCorte() {
  const { id = '' } = useParams();
  const clienteConsulta = useQueryClient();
  const corte = useQuery({
    queryKey: ['corte', id],
    queryFn: () => clienteApi.buscar<Corte>(`/cortes/${id}`),
    refetchInterval: (consulta) =>
      estaEmPreparo(consulta.state.data?.status ?? '') ? INTERVALO_ATUALIZACAO_PREPARO_MS : false,
  });

  const acao = useMutation({
    mutationFn: (nome: string) => clienteApi.executar<Corte>(`/cortes/${id}/${nome}`),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: ['corte', id] });
      void clienteConsulta.invalidateQueries({ queryKey: ['cortes'] });
    },
  });

  if (!corte.data) return <EstadoVazio mensagem="Carregando corte..." />;

  return (
    <>
      <TituloPagina titulo={corte.data.titulo ?? 'Corte sem título'} descricao={`Gerado em ${formatarDataHora(corte.data.dataCriacao)}`} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="cartao">
          <div className="flex aspect-[9/16] items-center justify-center overflow-hidden rounded-lg bg-superficieAlta">
            {corte.data.urlVideo ? (
              <video src={corte.data.urlVideo} controls className="h-full w-full object-contain" />
            ) : (
              <span className="px-4 text-center text-xs text-textoSecundario">
                Vídeo ainda não renderizado
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <PreparacaoCorte corte={corte.data} />
          <div className="cartao">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm">
                  {corte.data.canalNome} · {corte.data.plataforma}
                </p>
                <p className="mt-1 text-xs text-textoSecundario">
                  {formatarDuracaoCurta(corte.data.duracaoSegundos)} · template {corte.data.template}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Etiqueta texto={corte.data.status} />
                <IndicadorScore valor={corte.data.clipScore} />
              </div>
            </div>
          </div>

          <div className="cartao">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-textoSecundario">
              Por que foi selecionado
            </h2>
            <ul className="space-y-2 text-sm">
              {corte.data.motivos.map((motivo) => (
                <li key={motivo} className="flex gap-2">
                  <span aria-hidden className="text-destaqueSuave">
                    ▸
                  </span>
                  {motivo}
                </li>
              ))}
            </ul>
          </div>

          {corte.data.mensagemErro ? (
            <div className="cartao border-red-500/30">
              <p className="text-sm text-red-300">{corte.data.mensagemErro}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="botao-primario"
              disabled={acao.isPending}
              onClick={() => acao.mutate('aprovar')}
            >
              Aprovar
            </button>
            <button
              type="button"
              className="botao-secundario"
              disabled={acao.isPending}
              onClick={() => acao.mutate('rejeitar')}
            >
              Rejeitar
            </button>
            <button
              type="button"
              className="botao-secundario"
              disabled={acao.isPending}
              onClick={() => acao.mutate('regenerar')}
            >
              Regenerar
            </button>
            {corte.data.urlVideo ? (
              <a href={corte.data.urlVideo} download className="botao-secundario">
                Baixar
              </a>
            ) : null}
          </div>

          {acao.isError ? <p className="text-sm text-red-300">Não foi possível executar esta ação.</p> : null}
        </div>
      </div>
    </>
  );
}
