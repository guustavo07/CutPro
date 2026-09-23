import { WebSocket } from 'ws';
import type { ConexaoChat, MensagemChatExterna, OpcoesConexaoChat } from '../tipos.js';

const URL_IRC = 'wss://irc-ws.chat.twitch.tv:443';
const PREFIXO_USUARIO_ANONIMO = 'justinfan';
const LIMITE_SUFIXO_ANONIMO = 100_000;
const COMANDO_PRIVMSG = 'PRIVMSG';
const INTERVALO_RECONEXAO_MS = 5_000;

function gerarUsuarioAnonimo(): string {
  return `${PREFIXO_USUARIO_ANONIMO}${Math.floor(Math.random() * LIMITE_SUFIXO_ANONIMO)}`;
}

export function interpretarLinhaIrc(linha: string): MensagemChatExterna | null {
  const separador = linha.indexOf(` ${COMANDO_PRIVMSG} `);
  if (separador < 0) return null;

  const usuario = extrairUsuario(linha);
  const inicioTexto = linha.indexOf(' :', separador);
  if (!usuario || inicioTexto < 0) return null;

  const mensagem = linha.slice(inicioTexto + 2).trimEnd();
  if (mensagem.length === 0) return null;

  return { usuario, mensagem, dataHora: new Date() };
}

function extrairUsuario(linha: string): string | null {
  const inicio = linha.indexOf(':', linha.startsWith('@') ? linha.indexOf(' ') : 0);
  const fim = linha.indexOf('!', inicio);
  if (inicio < 0 || fim < 0) return null;

  return linha.slice(inicio + 1, fim);
}

export class ConexaoChatTwitch implements ConexaoChat {
  private socket: WebSocket | null = null;
  private encerrado = false;
  private temporizador: NodeJS.Timeout | null = null;

  constructor(private readonly opcoes: OpcoesConexaoChat) {}

  get conectado(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  async conectar(): Promise<void> {
    const socket = new WebSocket(URL_IRC);
    this.socket = socket;

    socket.on('open', () => this.autenticar(socket));
    socket.on('message', (dados) => this.processarMensagem(socket, dados.toString()));
    socket.on('error', (erro) => this.opcoes.aoErro?.(erro));
    socket.on('close', () => this.tratarFechamento());
  }

  private autenticar(socket: WebSocket): void {
    socket.send(`NICK ${gerarUsuarioAnonimo()}`);
    socket.send(`JOIN #${this.opcoes.canal.nome.toLowerCase()}`);
  }

  private processarMensagem(socket: WebSocket, conteudo: string): void {
    for (const linha of conteudo.split('\r\n')) {
      if (linha.startsWith('PING')) {
        socket.send('PONG :tmi.twitch.tv');
        continue;
      }
      this.repassarMensagem(linha);
    }
  }

  private repassarMensagem(linha: string): void {
    const mensagem = interpretarLinhaIrc(linha);
    if (!mensagem) return;

    this.opcoes.aoReceberMensagem(mensagem);
  }

  private tratarFechamento(): void {
    if (this.encerrado) return;

    this.opcoes.aoDesconectar?.('conexao encerrada pela twitch');
    this.temporizador = setTimeout(() => void this.conectar(), INTERVALO_RECONEXAO_MS);
  }

  async desconectar(): Promise<void> {
    this.encerrado = true;
    if (this.temporizador) clearTimeout(this.temporizador);

    this.socket?.close();
    this.socket = null;
  }
}
