const SEGUNDOS_POR_HORA = 3600;
const SEGUNDOS_POR_MINUTO = 60;
const CASAS_DECIMAIS_SCORE = 2;
const TAMANHO_PADDING = 2;

function preencher(valor: number): string {
  return String(valor).padStart(TAMANHO_PADDING, '0');
}

export function formatarDuracao(totalSegundos: number): string {
  const horas = Math.floor(totalSegundos / SEGUNDOS_POR_HORA);
  const minutos = Math.floor((totalSegundos % SEGUNDOS_POR_HORA) / SEGUNDOS_POR_MINUTO);
  const segundos = Math.floor(totalSegundos % SEGUNDOS_POR_MINUTO);

  return `${preencher(horas)}:${preencher(minutos)}:${preencher(segundos)}`;
}

export function formatarDuracaoCurta(totalSegundos: number): string {
  const minutos = Math.floor(totalSegundos / SEGUNDOS_POR_MINUTO);
  const segundos = Math.floor(totalSegundos % SEGUNDOS_POR_MINUTO);

  return `${minutos}:${preencher(segundos)}`;
}

export function formatarNumero(valor: number): string {
  return new Intl.NumberFormat('pt-BR').format(valor);
}

export function formatarScore(valor: number): string {
  return valor.toFixed(CASAS_DECIMAIS_SCORE);
}

export function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}
