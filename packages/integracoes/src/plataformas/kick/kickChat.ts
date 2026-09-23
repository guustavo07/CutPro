import { WebSocket } from 'ws';
import type { ConexaoChat, MensagemChatExterna, OpcoesConexaoChat } from '../tipos.js';

const CLUSTER_PUSHER = 'us2';
const VERSAO_PROTOCOLO_PUSHER = '7';
const VERSAO_CLIENTE_PUSHER = '8.4.0';
const EVENTO_MENSAGEM_CHAT = 'App\\Events\\ChatMessageEvent';
const EVENTO_ASSINATURA = 'pusher:subscribe';
const EVENTO_PING = 'pusher:ping';
const INTERVALO_RECONEXAO_MS = 5_000;

export type OpcoesConexaoChatKick = OpcoesConexaoChat & {
  readonly identificadorSala: string;
  readonly chavePusher: string;
};

function montarUrlPusher(chave: string): string {
  const parametros = new URLSearchParams({
    protocol: VERSAO_PROTOCOLO_PUSHER,
    client: 'js',
    version: VERSAO_CLIENTE_PUSHER,
    flash: 'false',
  });

  return `wss://ws-${CLUSTER_PUSHER}.pusher.com/app/${chave}?${parametros.toString()}`;
}

export function interpretarEventoPusher(conteudo: string): MensagemChatExterna | null {
  const envelope = JSON.parse(conteudo) as { event?: string; data?: string };
  if (envelope.event !== EVENTO_MENSAGEM_CHAT || !envelope.data) return null;

  const dados = JSON.parse(envelope.data) as {
    content?: string;
    created_at?: string;
    sender?: { username?: string };
  };
  if (!dados.content || !dados.sender?.username) return null;

  return {
    usuario: dados.sender.username,
    mensagem: dados.content,
    dataHora: dados.created_at ? new Date(dados.created_at) : new Date(),
  };
}

export class ConexaoChatKick implements ConexaoChat {
  private socket: WebSocket | null = null;
  private encerrado = false;
  private temporizador: NodeJS.Timeout | null = null;

  constructor(private readonly opcoes: OpcoesConexaoChatKick) {}

  get conectado(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  async conectar(): Promise<void> {
    const socket = new WebSocket(montarUrlPusher(this.opcoes.chavePusher));
    this.socket = socket;

    socket.on('open', () => this.assinarSala(socket));
    socket.on('message', (dados) => this.processarMensagem(socket, dados.toString()));
    socket.on('error', (erro) => this.opcoes.aoErro?.(erro));
    socket.on('close', () => this.tratarFechamento());
  }

  private assinarSala(socket: WebSocket): void {
    socket.send(
      JSON.stringify({
        event: EVENTO_ASSINATURA,
        data: { auth: '', channel: `chatrooms.${this.opcoes.identificadorSala}.v2` },
      }),
    );
  }

  private processarMensagem(socket: WebSocket, conteudo: string): void {
    if (conteudo.includes(EVENTO_PING)) {
      socket.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
      return;
    }

    const mensagem = this.interpretarComSeguranca(conteudo);
    if (!mensagem) return;

    this.opcoes.aoReceberMensagem(mensagem);
  }

  private interpretarComSeguranca(conteudo: string): MensagemChatExterna | null {
    try {
      return interpretarEventoPusher(conteudo);
    } catch {
      return null;
    }
  }

  private tratarFechamento(): void {
    if (this.encerrado) return;

    this.opcoes.aoDesconectar?.('conexao encerrada pelo kick');
    this.temporizador = setTimeout(() => void this.conectar(), INTERVALO_RECONEXAO_MS);
  }

  async desconectar(): Promise<void> {
    this.encerrado = true;
    if (this.temporizador) clearTimeout(this.temporizador);

    this.socket?.close();
    this.socket = null;
  }
}
