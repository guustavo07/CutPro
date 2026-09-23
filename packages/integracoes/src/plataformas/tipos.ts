import type { Plataforma } from '@cutpro/dominio';

export type CanalExterno = {
  readonly identificadorExterno: string;
  readonly nome: string;
  readonly nomeExibicao: string;
  readonly url: string;
  readonly urlAvatar: string | null;
  readonly identificadorChat: string | null;
};

export type LiveExterna = {
  readonly identificadorExterno: string;
  readonly titulo: string | null;
  readonly categoria: string | null;
  readonly inicio: Date;
  readonly espectadores: number;
  readonly urlMiniatura: string | null;
};

export type VodExterno = {
  readonly identificadorExterno: string;
  readonly url: string;
  readonly duracaoSegundos: number | null;
  readonly disponivel: boolean;
};

export type MensagemChatExterna = {
  readonly usuario: string;
  readonly mensagem: string;
  readonly dataHora: Date;
};

export type OpcoesConexaoChat = {
  readonly canal: CanalExterno;
  readonly aoReceberMensagem: (mensagem: MensagemChatExterna) => void;
  readonly aoDesconectar?: (motivo: string) => void;
  readonly aoErro?: (erro: Error) => void;
};

export interface ConexaoChat {
  readonly conectado: boolean;
  desconectar(): Promise<void>;
}

export interface ServicoPlataformaStreaming {
  readonly plataforma: Plataforma;
  buscarCanal(identificador: string): Promise<CanalExterno | null>;
  buscarLiveAtual(canal: CanalExterno): Promise<LiveExterna | null>;
  buscarVodMaisRecente(canal: CanalExterno): Promise<VodExterno | null>;
  conectarChat(opcoes: OpcoesConexaoChat): Promise<ConexaoChat>;
}

export class ErroPlataforma extends Error {
  constructor(
    readonly plataforma: Plataforma,
    mensagem: string,
    readonly causa?: unknown,
  ) {
    super(mensagem);
    this.name = 'ErroPlataforma';
  }
}

export class ErroCredenciaisPlataforma extends ErroPlataforma {
  constructor(plataforma: Plataforma, mensagem: string) {
    super(plataforma, mensagem);
    this.name = 'ErroCredenciaisPlataforma';
  }
}
