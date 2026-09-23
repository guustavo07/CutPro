import { Plataforma } from '@cutpro/dominio';
import type {
  CanalExterno,
  ConexaoChat,
  LiveExterna,
  OpcoesConexaoChat,
  ServicoPlataformaStreaming,
  VodExterno,
} from '../tipos.js';

const INTERVALO_MENSAGEM_NORMAL_MS = 3_000;
const INTERVALO_MENSAGEM_PICO_MS = 300;
const INTERVALO_ENTRE_PICOS_MS = 120_000;
const DURACAO_PICO_MS = 15_000;
const MENSAGENS_NORMAIS = [
  'boa noite pessoal',
  'alguem sabe o nome da musica',
  'to assistindo do trabalho',
  'primeira vez aqui',
  'qual o proximo jogo',
];
const MENSAGENS_PICO = ['KKKKKKKKKK', 'kkkkkkk', 'W', 'WWW', 'MDS', 'nao acredito', 'que isso mano', '😂😂😂'];

function sortear(itens: readonly string[]): string {
  return itens[Math.floor(Math.random() * itens.length)] ?? '';
}

class ConexaoChatSimulada implements ConexaoChat {
  private temporizador: NodeJS.Timeout | null = null;
  private inicioPicoAtual = Date.now() + INTERVALO_ENTRE_PICOS_MS;
  private encerrado = false;

  constructor(private readonly opcoes: OpcoesConexaoChat) {}

  get conectado(): boolean {
    return !this.encerrado;
  }

  iniciar(): void {
    this.agendarProximaMensagem();
  }

  private estaEmPico(): boolean {
    const agora = Date.now();
    if (agora > this.inicioPicoAtual + DURACAO_PICO_MS) {
      this.inicioPicoAtual = agora + INTERVALO_ENTRE_PICOS_MS;
      return false;
    }

    return agora >= this.inicioPicoAtual;
  }

  private agendarProximaMensagem(): void {
    if (this.encerrado) return;

    const emPico = this.estaEmPico();
    const intervalo = emPico ? INTERVALO_MENSAGEM_PICO_MS : INTERVALO_MENSAGEM_NORMAL_MS;
    this.temporizador = setTimeout(() => this.emitirMensagem(emPico), intervalo);
  }

  private emitirMensagem(emPico: boolean): void {
    this.opcoes.aoReceberMensagem({
      usuario: `espectador${Math.floor(Math.random() * 1000)}`,
      mensagem: emPico ? sortear(MENSAGENS_PICO) : sortear(MENSAGENS_NORMAIS),
      dataHora: new Date(),
    });
    this.agendarProximaMensagem();
  }

  async desconectar(): Promise<void> {
    this.encerrado = true;
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
  }
}

export class PlataformaSimulada implements ServicoPlataformaStreaming {
  constructor(readonly plataforma: Plataforma = Plataforma.TWITCH) {}

  async buscarCanal(identificador: string): Promise<CanalExterno | null> {
    const nome = identificador.trim().toLowerCase();

    return {
      identificadorExterno: `simulado-${nome}`,
      nome,
      nomeExibicao: nome,
      url: `https://exemplo.local/${nome}`,
      urlAvatar: null,
      identificadorChat: nome,
    };
  }

  async buscarLiveAtual(canal: CanalExterno): Promise<LiveExterna | null> {
    return {
      identificadorExterno: `simulada-${canal.nome}-${new Date().toISOString().slice(0, 10)}`,
      titulo: `Live simulada de ${canal.nomeExibicao}`,
      categoria: 'Just Chatting',
      inicio: new Date(Date.now() - INTERVALO_ENTRE_PICOS_MS),
      espectadores: 1200,
      urlMiniatura: null,
    };
  }

  async buscarVodMaisRecente(): Promise<VodExterno | null> {
    return null;
  }

  async conectarChat(opcoes: OpcoesConexaoChat): Promise<ConexaoChat> {
    const conexao = new ConexaoChatSimulada(opcoes);
    conexao.iniciar();

    return conexao;
  }
}
