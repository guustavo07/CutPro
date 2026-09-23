import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { clienteApi, ErroApi } from '../api/clienteApi';
import type { Canal, Plataforma } from '../api/tipos';
import { EstadoVazio } from '../componentes/Indicadores';
import { TituloPagina } from '../componentes/Layout';

const PLATAFORMAS: readonly Plataforma[] = ['TWITCH', 'KICK'];

type ChaveInterruptor = 'monitoramentoAtivo' | 'geracaoAutomaticaAtiva' | 'publicacaoAutomaticaAtiva';

const INTERRUPTORES: readonly { chave: ChaveInterruptor; rotulo: string }[] = [
  { chave: 'monitoramentoAtivo', rotulo: 'Monitorar' },
  { chave: 'geracaoAutomaticaAtiva', rotulo: 'Gerar cortes' },
  { chave: 'publicacaoAutomaticaAtiva', rotulo: 'Publicar' },
];

function Interruptor({
  ativo,
  rotulo,
  aoAlternar,
}: {
  readonly ativo: boolean;
  readonly rotulo: string;
  readonly aoAlternar: () => void;
}) {
  return (
    <button type="button" onClick={aoAlternar} className="flex items-center gap-2 text-xs text-textoSecundario">
      <span
        className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${ativo ? 'bg-destaque' : 'bg-borda'}`}
      >
        <span className={`h-4 w-4 rounded-full bg-white transition ${ativo ? 'translate-x-4' : ''}`} />
      </span>
      {rotulo}
    </button>
  );
}

function FormularioCanal({ aoCriar }: { readonly aoCriar: (dados: { identificador: string; plataforma: Plataforma }) => void }) {
  const [identificador, definirIdentificador] = useState('');
  const [plataforma, definirPlataforma] = useState<Plataforma>('TWITCH');

  return (
    <form
      className="cartao mb-6 flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(evento) => {
        evento.preventDefault();
        if (identificador.trim().length === 0) return;

        aoCriar({ identificador: identificador.trim(), plataforma });
        definirIdentificador('');
      }}
    >
      <div className="flex-1">
        <label className="rotulo-campo" htmlFor="identificador">
          Nome do canal
        </label>
        <input
          id="identificador"
          className="campo"
          value={identificador}
          onChange={(evento) => definirIdentificador(evento.target.value)}
          placeholder="gaules"
        />
      </div>
      <div className="sm:w-40">
        <label className="rotulo-campo" htmlFor="plataforma">
          Plataforma
        </label>
        <select
          id="plataforma"
          className="campo"
          value={plataforma}
          onChange={(evento) => definirPlataforma(evento.target.value as Plataforma)}
        >
          {PLATAFORMAS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="botao-primario">
        Adicionar canal
      </button>
    </form>
  );
}

export function Canais() {
  const clienteConsulta = useQueryClient();
  const [erro, definirErro] = useState<string | null>(null);
  const [confirmandoRemocao, definirConfirmandoRemocao] = useState<string | null>(null);

  const canais = useQuery({ queryKey: ['canais'], queryFn: () => clienteApi.buscar<Canal[]>('/canais') });

  const invalidar = () => clienteConsulta.invalidateQueries({ queryKey: ['canais'] });

  const criar = useMutation({
    mutationFn: (dados: { identificador: string; plataforma: Plataforma }) =>
      clienteApi.criar<Canal>('/canais', dados),
    onSuccess: () => {
      definirErro(null);
      void invalidar();
    },
    onError: (falha: unknown) => definirErro(falha instanceof ErroApi ? falha.message : 'Falha ao adicionar canal'),
  });

  const alternar = useMutation({
    mutationFn: (dados: { id: string; campo: ChaveInterruptor; valor: boolean }) =>
      clienteApi.atualizar<Canal>(`/canais/${dados.id}`, { [dados.campo]: dados.valor }),
    onSuccess: invalidar,
  });

  const remover = useMutation({
    mutationFn: (id: string) => clienteApi.remover(`/canais/${id}`),
    onSuccess: () => {
      definirErro(null);
      definirConfirmandoRemocao(null);
      void invalidar();
    },
    onError: (falha: unknown) =>
      definirErro(falha instanceof ErroApi ? falha.message : 'Falha ao remover o canal'),
  });

  return (
    <>
      <TituloPagina titulo="Canais" descricao="Cadastre canais da Twitch e do Kick e escolha o que é automático." />

      <FormularioCanal aoCriar={(dados) => criar.mutate(dados)} />
      {erro ? <p className="mb-4 text-sm text-red-300">{erro}</p> : null}

      {canais.data && canais.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {canais.data.map((canal) => (
            <article key={canal.id} className="cartao">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-textoSecundario">{canal.plataforma}</p>
                  <p className="mt-1 text-base font-medium">{canal.nomeExibicao}</p>
                  <a
                    href={canal.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-destaqueSuave hover:underline"
                  >
                    {canal.url}
                  </a>
                </div>
                {confirmandoRemocao === canal.id ? (
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-red-300">Apaga lives e cortes deste canal.</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-xs text-red-300 hover:underline"
                        disabled={remover.isPending}
                        onClick={() => remover.mutate(canal.id)}
                      >
                        {remover.isPending ? 'removendo...' : 'confirmar'}
                      </button>
                      <button
                        type="button"
                        className="text-xs text-textoSecundario hover:underline"
                        onClick={() => definirConfirmandoRemocao(null)}
                      >
                        cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="shrink-0 text-xs text-textoSecundario hover:text-red-300"
                    onClick={() => definirConfirmandoRemocao(canal.id)}
                  >
                    remover
                  </button>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-4">
                {INTERRUPTORES.map((item) => (
                  <Interruptor
                    key={item.chave}
                    rotulo={item.rotulo}
                    ativo={canal[item.chave]}
                    aoAlternar={() =>
                      alternar.mutate({ id: canal.id, campo: item.chave, valor: !canal[item.chave] })
                    }
                  />
                ))}
              </div>
              <p className="mt-4 text-xs text-textoSecundario">
                Score mínimo {canal.configuracao.clipScoreMinimo} · janela -{canal.configuracao.segundosAntes}s / +
                {canal.configuracao.segundosDepois}s · até {canal.configuracao.cortesMaximosPorLive} cortes por live
              </p>
            </article>
          ))}
        </div>
      ) : (
        <EstadoVazio mensagem="Nenhum canal cadastrado ainda." />
      )}
    </>
  );
}
