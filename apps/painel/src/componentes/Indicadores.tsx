import { formatarScore } from '../utils/formatacao';

const CLASSE_POR_STATUS: Record<string, string> = {
  AO_VIVO: 'bg-red-500/15 text-red-300 border-red-500/30',
  ENCERRADA: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  PRONTO: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  APROVADO: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  PUBLICADO: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  REJEITADO: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  ERRO: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const CLASSE_STATUS_PADRAO = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
const SCORE_ALTO = 0.85;
const SCORE_MEDIO = 0.7;

export function Etiqueta({ texto }: { readonly texto: string }) {
  const classe = CLASSE_POR_STATUS[texto] ?? CLASSE_STATUS_PADRAO;

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${classe}`}>
      {texto.replaceAll('_', ' ')}
    </span>
  );
}

function corDoScore(valor: number): string {
  if (valor >= SCORE_ALTO) return 'text-emerald-300';
  if (valor >= SCORE_MEDIO) return 'text-amber-300';

  return 'text-textoSecundario';
}

export function IndicadorScore({ valor }: { readonly valor: number }) {
  return <span className={`font-mono text-sm ${corDoScore(valor)}`}>{formatarScore(valor)}</span>;
}

export function CartaoMetrica({ rotulo, valor }: { readonly rotulo: string; readonly valor: number | string }) {
  return (
    <div className="cartao">
      <p className="text-xs uppercase tracking-wide text-textoSecundario">{rotulo}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{valor}</p>
    </div>
  );
}

export function EstadoVazio({ mensagem }: { readonly mensagem: string }) {
  return (
    <div className="cartao flex items-center justify-center py-10 text-sm text-textoSecundario">{mensagem}</div>
  );
}
