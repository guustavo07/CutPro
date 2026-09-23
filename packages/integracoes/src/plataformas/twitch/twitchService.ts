import { Plataforma } from '@cutpro/dominio';
import type {
  CanalExterno,
  ConexaoChat,
  LiveExterna,
  OpcoesConexaoChat,
  ServicoPlataformaStreaming,
  VodExterno,
} from '../tipos.js';
import { TwitchApi, type CredenciaisTwitch, type VideoTwitch } from './twitchApi.js';
import { ConexaoChatTwitch } from './twitchChat.js';

const URL_BASE_CANAL = 'https://www.twitch.tv';
const LARGURA_MINIATURA = '1280';
const ALTURA_MINIATURA = '720';
const SEGUNDOS_POR_HORA = 3600;
const SEGUNDOS_POR_MINUTO = 60;
const REGEX_DURACAO_VOD = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/;

function montarMiniatura(modelo: string): string {
  return modelo.replace('{width}', LARGURA_MINIATURA).replace('{height}', ALTURA_MINIATURA);
}

export function interpretarDuracaoVod(duracao: string): number | null {
  const partes = REGEX_DURACAO_VOD.exec(duracao);
  if (!partes) return null;

  const horas = Number(partes[1] ?? 0);
  const minutos = Number(partes[2] ?? 0);
  const segundos = Number(partes[3] ?? 0);

  return horas * SEGUNDOS_POR_HORA + minutos * SEGUNDOS_POR_MINUTO + segundos;
}

export class TwitchService implements ServicoPlataformaStreaming {
  readonly plataforma = Plataforma.TWITCH;

  private readonly api: TwitchApi;

  constructor(credenciais: CredenciaisTwitch) {
    this.api = new TwitchApi(credenciais);
  }

  async buscarCanal(identificador: string): Promise<CanalExterno | null> {
    const login = identificador.trim().toLowerCase();
    const usuario = await this.api.buscarUsuario(login);
    if (!usuario) return null;

    return {
      identificadorExterno: usuario.id,
      nome: usuario.login,
      nomeExibicao: usuario.display_name,
      url: `${URL_BASE_CANAL}/${usuario.login}`,
      urlAvatar: usuario.profile_image_url,
      identificadorChat: usuario.login,
    };
  }

  async buscarLiveAtual(canal: CanalExterno): Promise<LiveExterna | null> {
    const stream = await this.api.buscarStream(canal.nome);
    if (!stream) return null;

    return {
      identificadorExterno: stream.id,
      titulo: stream.title,
      categoria: stream.game_name,
      inicio: new Date(stream.started_at),
      espectadores: stream.viewer_count,
      urlMiniatura: montarMiniatura(stream.thumbnail_url),
    };
  }

  async buscarVodMaisRecente(canal: CanalExterno): Promise<VodExterno | null> {
    const video = await this.api.buscarVideoMaisRecente(canal.identificadorExterno);
    if (!video) return null;

    return this.montarVod(video);
  }

  private montarVod(video: VideoTwitch): VodExterno {
    return {
      identificadorExterno: video.id,
      url: video.url,
      duracaoSegundos: interpretarDuracaoVod(video.duration),
      disponivel: true,
    };
  }

  async conectarChat(opcoes: OpcoesConexaoChat): Promise<ConexaoChat> {
    const conexao = new ConexaoChatTwitch(opcoes);
    await conexao.conectar();

    return conexao;
  }
}
