const STATUS_REQUISICAO_INVALIDA = 400;
const STATUS_NAO_AUTORIZADO = 401;
const STATUS_NAO_ENCONTRADO = 404;
const STATUS_CONFLITO = 409;
const STATUS_DEPENDENCIA_EXTERNA = 502;

export class ErroAplicacao extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
    readonly detalhes?: unknown,
  ) {
    super(mensagem);
    this.name = 'ErroAplicacao';
  }
}

export function erroRequisicaoInvalida(mensagem: string, detalhes?: unknown): ErroAplicacao {
  return new ErroAplicacao(STATUS_REQUISICAO_INVALIDA, mensagem, detalhes);
}

export function erroNaoAutorizado(mensagem: string): ErroAplicacao {
  return new ErroAplicacao(STATUS_NAO_AUTORIZADO, mensagem);
}

export function erroNaoEncontrado(mensagem: string): ErroAplicacao {
  return new ErroAplicacao(STATUS_NAO_ENCONTRADO, mensagem);
}

export function erroConflito(mensagem: string): ErroAplicacao {
  return new ErroAplicacao(STATUS_CONFLITO, mensagem);
}

export function erroDependenciaExterna(mensagem: string): ErroAplicacao {
  return new ErroAplicacao(STATUS_DEPENDENCIA_EXTERNA, mensagem);
}
