import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { clienteApi } from '../api/clienteApi';
import type { Canal, ConfiguracaoCanal } from '../api/tipos';
import { EstadoVazio } from '../componentes/Indicadores';
import { TituloPagina } from '../componentes/Layout';

const MODOS = ['ECONOMICO', 'BALANCEADO', 'QUALIDADE_MAXIMA'];
const TEMPLATES = ['VERTICAL_PADRAO', 'GAMEPLAY_CENTRAL', 'WEBCAM_DESTAQUE', 'TELA_CHEIA'];

type CampoNumerico = {
  readonly chave: keyof ConfiguracaoCanal;
  readonly rotulo: string;
  readonly passo: number;
};

const CAMPOS_NUMERICOS: readonly CampoNumerico[] = [
  { chave: 'clipScoreMinimo', rotulo: 'Score mínimo', passo: 0.05 },
  { chave: 'duracaoMinimaSegundos', rotulo: 'Duração mínima (s)', passo: 1 },
  { chave: 'duracaoMaximaSegundos', rotulo: 'Duração máxima (s)', passo: 1 },
  { chave: 'segundosAntes', rotulo: 'Segundos antes', passo: 1 },
  { chave: 'segundosDepois', rotulo: 'Segundos depois', passo: 1 },
  { chave: 'cortesMaximosPorLive', rotulo: 'Cortes por live', passo: 1 },
];

export function Configuracoes() {
  const clienteConsulta = useQueryClient();
  const canais = useQuery({ queryKey: ['canais'], queryFn: () => clienteApi.buscar<Canal[]>('/canais') });
  const [canalSelecionado, definirCanalSelecionado] = useState('');
  const [configuracao, definirConfiguracao] = useState<ConfiguracaoCanal | null>(null);

  const canalAtual = canais.data?.find((canal) => canal.id === canalSelecionado) ?? canais.data?.[0];

  useEffect(() => {
    if (!canalAtual) return;

    definirCanalSelecionado(canalAtual.id);
    definirConfiguracao(canalAtual.configuracao);
  }, [canalAtual?.id]);

  const salvar = useMutation({
    mutationFn: (dados: ConfiguracaoCanal) =>
      clienteApi.atualizar<Canal>(`/canais/${canalSelecionado}`, { configuracao: dados }),
    onSuccess: () => clienteConsulta.invalidateQueries({ queryKey: ['canais'] }),
  });

  if (!canais.data || canais.data.length === 0 || !configuracao) {
    return (
      <>
        <TituloPagina titulo="Configurações" />
        <EstadoVazio mensagem="Cadastre um canal para configurar a geração de cortes." />
      </>
    );
  }

  const atualizarCampo = (chave: keyof ConfiguracaoCanal, valor: number | string | boolean) =>
    definirConfiguracao({ ...configuracao, [chave]: valor });

  return (
    <>
      <TituloPagina titulo="Configurações" descricao="Cada canal tem a sua própria configuração de corte." />

      <div className="cartao mb-6">
        <label className="rotulo-campo" htmlFor="canal">
          Canal
        </label>
        <select
          id="canal"
          className="campo"
          value={canalSelecionado}
          onChange={(evento) => {
            const selecionado = canais.data.find((canal) => canal.id === evento.target.value);
            definirCanalSelecionado(evento.target.value);
            if (selecionado) definirConfiguracao(selecionado.configuracao);
          }}
        >
          {canais.data.map((canal) => (
            <option key={canal.id} value={canal.id}>
              {canal.nomeExibicao} ({canal.plataforma})
            </option>
          ))}
        </select>
      </div>

      <form
        className="cartao space-y-5"
        onSubmit={(evento) => {
          evento.preventDefault();
          salvar.mutate(configuracao);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CAMPOS_NUMERICOS.map((campo) => (
            <div key={campo.chave}>
              <label className="rotulo-campo" htmlFor={campo.chave}>
                {campo.rotulo}
              </label>
              <input
                id={campo.chave}
                type="number"
                step={campo.passo}
                className="campo"
                value={String(configuracao[campo.chave])}
                onChange={(evento) => atualizarCampo(campo.chave, Number(evento.target.value))}
              />
            </div>
          ))}

          <div>
            <label className="rotulo-campo" htmlFor="modoProcessamento">
              Modo de processamento
            </label>
            <select
              id="modoProcessamento"
              className="campo"
              value={configuracao.modoProcessamento}
              onChange={(evento) => atualizarCampo('modoProcessamento', evento.target.value)}
            >
              {MODOS.map((modo) => (
                <option key={modo} value={modo}>
                  {modo.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="rotulo-campo" htmlFor="template">
              Template vertical
            </label>
            <select
              id="template"
              className="campo"
              value={configuracao.template}
              onChange={(evento) => atualizarCampo('template', evento.target.value)}
            >
              {TEMPLATES.map((template) => (
                <option key={template} value={template}>
                  {template.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={configuracao.legendasAtivas}
            onChange={(evento) => atualizarCampo('legendasAtivas', evento.target.checked)}
          />
          Gerar legendas automaticamente
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" className="botao-primario" disabled={salvar.isPending}>
            Salvar configurações
          </button>
          {salvar.isSuccess ? <span className="text-sm text-emerald-300">Configurações salvas.</span> : null}
          {salvar.isError ? <span className="text-sm text-red-300">Falha ao salvar.</span> : null}
        </div>
      </form>
    </>
  );
}
