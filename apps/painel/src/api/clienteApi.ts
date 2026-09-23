const URL_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';
const PREFIXO = '/api';

export type RespostaPaginada<T> = {
  readonly itens: readonly T[];
  readonly total: number;
  readonly pagina: number;
  readonly tamanhoPagina: number;
};

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'ErroApi';
  }
}

async function extrairMensagemErro(resposta: Response): Promise<string> {
  try {
    const corpo = (await resposta.json()) as { mensagem?: string };
    return corpo.mensagem ?? 'Falha na requisição';
  } catch {
    return 'Falha na requisição';
  }
}

async function requisitar<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`${URL_BASE}${PREFIXO}${caminho}`, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', ...opcoes.headers },
  });

  if (!resposta.ok) throw new ErroApi(resposta.status, await extrairMensagemErro(resposta));
  if (resposta.status === 204) return undefined as T;

  return (await resposta.json()) as T;
}

export const clienteApi = {
  buscar: <T>(caminho: string) => requisitar<T>(caminho),
  criar: <T>(caminho: string, corpo: unknown) =>
    requisitar<T>(caminho, { method: 'POST', body: JSON.stringify(corpo) }),
  atualizar: <T>(caminho: string, corpo: unknown) =>
    requisitar<T>(caminho, { method: 'PATCH', body: JSON.stringify(corpo) }),
  executar: <T>(caminho: string) => requisitar<T>(caminho, { method: 'POST' }),
  remover: (caminho: string) => requisitar<void>(caminho, { method: 'DELETE' }),
};
