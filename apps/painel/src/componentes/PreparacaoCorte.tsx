import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type PointerEvent as EventoPonteiro } from 'react';
import { clienteApi, ErroApi } from '../api/clienteApi';
import type { Corte } from '../api/tipos';

const STATUS_EM_PREPARO = [
  'AGUARDANDO_PROCESSAMENTO',
  'PROCESSANDO',
  'TRANSCREVENDO',
  'GERANDO_LEGENDAS',
  'RENDERIZANDO',
];

const ROTULO_POR_STATUS: Readonly<Record<string, string>> = {
  AGUARDANDO_PROCESSAMENTO: 'Na fila...',
  PROCESSANDO: 'Recortando o trecho...',
  TRANSCREVENDO: 'Transcrevendo o áudio...',
  GERANDO_LEGENDAS: 'Montando as legendas...',
  RENDERIZANDO: 'Renderizando o vertical...',
};

const FRACAO_MINIMA_AREA = 0.02;
const DURACAO_MINIMA = 5;

export function estaEmPreparo(status: string): boolean {
  return STATUS_EM_PREPARO.includes(status);
}

export function descreverPreparo(status: string): string {
  return ROTULO_POR_STATUS[status] ?? 'Preparando...';
}

type Area = { x: number; y: number; largura: number; altura: number };

function normalizarArea(inicio: { x: number; y: number }, fim: { x: number; y: number }): Area {
  const x = Math.min(inicio.x, fim.x);
  const y = Math.min(inicio.y, fim.y);

  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    largura: Number(Math.abs(fim.x - inicio.x).toFixed(3)),
    altura: Number(Math.abs(fim.y - inicio.y).toFixed(3)),
  };
}

function SeletorArea({ url, area, aoSelecionar }: {
  readonly url: string;
  readonly area: Area | null;
  readonly aoSelecionar: (area: Area) => void;
}) {
  const referencia = useRef<HTMLDivElement>(null);
  const [arrastando, definirArrastando] = useState<{ x: number; y: number } | null>(null);

  const posicaoRelativa = (evento: EventoPonteiro<HTMLDivElement>) => {
    const caixa = referencia.current?.getBoundingClientRect();
    if (!caixa) return { x: 0, y: 0 };

    return {
      x: Math.min(1, Math.max(0, (evento.clientX - caixa.left) / caixa.width)),
      y: Math.min(1, Math.max(0, (evento.clientY - caixa.top) / caixa.height)),
    };
  };

  const concluir = (evento: EventoPonteiro<HTMLDivElement>) => {
    if (!arrastando) return;

    const selecionada = normalizarArea(arrastando, posicaoRelativa(evento));
    definirArrastando(null);
    if (selecionada.largura < FRACAO_MINIMA_AREA || selecionada.altura < FRACAO_MINIMA_AREA) return;

    aoSelecionar(selecionada);
  };

  return (
    <div
      ref={referencia}
      className="relative w-full cursor-crosshair touch-none overflow-hidden rounded-lg border border-borda"
      onPointerDown={(evento) => definirArrastando(posicaoRelativa(evento))}
      onPointerUp={concluir}
      onPointerLeave={() => definirArrastando(null)}
    >
      <img src={url} alt="Quadro de referência da transmissão" className="w-full select-none" draggable={false} />
      {area ? (
        <div
          className="pointer-events-none absolute border-2 border-destaque bg-destaque/20"
          style={{
            left: `${area.x * 100}%`,
            top: `${area.y * 100}%`,
            width: `${area.largura * 100}%`,
            height: `${area.altura * 100}%`,
          }}
        />
      ) : null}
    </div>
  );
}

export function PreparacaoCorte({ corte }: { readonly corte: Corte }) {
  const clienteConsulta = useQueryClient();
  const [area, definirArea] = useState<Area | null>(null);
  const [deslocamento, definirDeslocamento] = useState<number | null>(null);
  const [inicio, definirInicio] = useState(corte.inicioSegundos);
  const [duracao, definirDuracao] = useState(corte.duracaoSegundos);
  const [ajustando, definirAjustando] = useState(false);
  const [erro, definirErro] = useState<string | null>(null);

  const preparar = useMutation({
    mutationFn: () =>
      clienteApi.criar<Corte>(`/cortes/${corte.id}/preparar`, {
        regiaoWebcam: area ?? undefined,
        deslocamentoGameplay: deslocamento ?? undefined,
        inicioSegundos: inicio,
        duracaoSegundos: duracao,
      }),
    onSuccess: () => {
      definirErro(null);
      definirAjustando(false);
      void clienteConsulta.invalidateQueries({ queryKey: ['corte', corte.id] });
    },
    onError: (falha: unknown) =>
      definirErro(falha instanceof ErroApi ? falha.message : 'Falha ao preparar o corte'),
  });

  if (estaEmPreparo(corte.status)) {
    return (
      <div className="cartao flex items-center gap-3">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-destaque border-t-transparent" />
        <span className="text-sm">{descreverPreparo(corte.status)}</span>
      </div>
    );
  }

  return (
    <div className="cartao space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-textoSecundario">
          Preparar para publicação
        </h2>
        <button type="button" className="botao-secundario" onClick={() => definirAjustando(!ajustando)}>
          {ajustando ? 'Ocultar ajustes' : 'Ajustar'}
        </button>
      </div>

      {ajustando ? (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs text-textoSecundario">
              Trecho que será postado, dentro da janela capturada
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex-1 text-xs text-textoSecundario">
                Início (s)
                <input
                  type="number"
                  className="campo mt-1 w-full"
                  value={inicio}
                  min={0}
                  onChange={(evento) => definirInicio(Number(evento.target.value))}
                />
              </label>
              <label className="flex-1 text-xs text-textoSecundario">
                Duração (s)
                <input
                  type="number"
                  className="campo mt-1 w-full"
                  value={duracao}
                  min={DURACAO_MINIMA}
                  onChange={(evento) => definirDuracao(Number(evento.target.value))}
                />
              </label>
            </div>
          </div>

          {corte.urlQuadroReferencia ? (
            <div>
              <p className="mb-2 text-xs text-textoSecundario">
                Arraste sobre a webcam do streamer para corrigir a área. Fica salva no canal.
              </p>
              <SeletorArea url={corte.urlQuadroReferencia} area={area} aoSelecionar={definirArea} />
              <label className="mt-3 block text-xs text-textoSecundario">
                Posição da gameplay: {(deslocamento ?? 0.72).toFixed(2)}
                <input
                  type="range"
                  className="mt-1 w-full"
                  min={0}
                  max={1}
                  step={0.01}
                  value={deslocamento ?? 0.72}
                  onChange={(evento) => definirDeslocamento(Number(evento.target.value))}
                />
              </label>
            </div>
          ) : (
            <p className="text-xs text-textoSecundario">
              O quadro de referência aparece depois da primeira preparação.
            </p>
          )}
        </div>
      ) : null}

      {erro ? <p className="text-xs text-red-300">{erro}</p> : null}

      <button
        type="button"
        className="botao-primario w-full sm:w-auto"
        disabled={preparar.isPending}
        onClick={() => preparar.mutate()}
      >
        {preparar.isPending ? 'Enviando...' : corte.urlVideo ? 'Preparar novamente' : 'Preparar para publicação'}
      </button>
    </div>
  );
}
