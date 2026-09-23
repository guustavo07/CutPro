import { Plataforma } from '@cutpro/dominio';
import { ErroCredenciaisPlataforma, ErroPlataforma } from '../tipos.js';

const URL_TOKEN = 'https://id.twitch.tv/oauth2/token';
const URL_BASE_HELIX = 'https://api.twitch.tv/helix';
const MARGEM_RENOVACAO_TOKEN_MS = 60_000;
const STATUS_NAO_AUTORIZADO = 401;

export type CredenciaisTwitch = {
  readonly clientId: string;
  readonly clientSecret: string;
};

type TokenAplicacao = {
  readonly valor: string;
  readonly expiraEm: number;
};

export type UsuarioTwitch = {
  readonly id: string;
  readonly login: string;
  readonly display_name: string;
  readonly profile_image_url: string;
};

export type StreamTwitch = {
  readonly id: string;
  readonly user_login: string;
  readonly title: string;
  readonly game_name: string;
  readonly started_at: string;
  readonly viewer_count: number;
  readonly thumbnail_url: string;
};

export type VideoTwitch = {
  readonly id: string;
  readonly url: string;
  readonly duration: string;
  readonly stream_id: string | null;
};

type RespostaHelix<T> = {
  readonly data: readonly T[];
};

export class TwitchApi {
  private token: TokenAplicacao | null = null;

  constructor(private readonly credenciais: CredenciaisTwitch) {}

  private async obterToken(): Promise<string> {
    const agora = Date.now();
    if (this.token && this.token.expiraEm - MARGEM_RENOVACAO_TOKEN_MS > agora) return this.token.valor;

    const corpo = new URLSearchParams({
      client_id: this.credenciais.clientId,
      client_secret: this.credenciais.clientSecret,
      grant_type: 'client_credentials',
    });
    const resposta = await fetch(URL_TOKEN, { method: 'POST', body: corpo });
    if (!resposta.ok) {
      throw new ErroCredenciaisPlataforma(Plataforma.TWITCH, 'Falha ao obter token de aplicação da Twitch');
    }

    return this.guardarToken(await resposta.json());
  }

  private guardarToken(dados: unknown): string {
    const resposta = dados as { access_token?: string; expires_in?: number };
    if (!resposta.access_token) {
      throw new ErroCredenciaisPlataforma(Plataforma.TWITCH, 'Resposta de token da Twitch sem access_token');
    }

    const duracaoMs = (resposta.expires_in ?? 0) * 1000;
    this.token = { valor: resposta.access_token, expiraEm: Date.now() + duracaoMs };
    return resposta.access_token;
  }

  private async requisitar<T>(caminho: string, parametros: Record<string, string>): Promise<readonly T[]> {
    const token = await this.obterToken();
    const url = `${URL_BASE_HELIX}${caminho}?${new URLSearchParams(parametros).toString()}`;
    const resposta = await fetch(url, {
      headers: { 'Client-Id': this.credenciais.clientId, Authorization: `Bearer ${token}` },
    });

    if (resposta.status === STATUS_NAO_AUTORIZADO) {
      this.token = null;
      throw new ErroCredenciaisPlataforma(Plataforma.TWITCH, 'Credenciais da Twitch recusadas');
    }
    if (!resposta.ok) {
      throw new ErroPlataforma(Plataforma.TWITCH, `Falha na Helix ${caminho}: ${resposta.status}`);
    }

    const corpo = (await resposta.json()) as RespostaHelix<T>;
    return corpo.data ?? [];
  }

  async buscarUsuario(login: string): Promise<UsuarioTwitch | null> {
    const usuarios = await this.requisitar<UsuarioTwitch>('/users', { login });
    return usuarios[0] ?? null;
  }

  async buscarStream(login: string): Promise<StreamTwitch | null> {
    const streams = await this.requisitar<StreamTwitch>('/streams', { user_login: login });
    return streams[0] ?? null;
  }

  async buscarVideoMaisRecente(idUsuario: string): Promise<VideoTwitch | null> {
    const videos = await this.requisitar<VideoTwitch>('/videos', {
      user_id: idUsuario,
      type: 'archive',
      first: '1',
    });
    return videos[0] ?? null;
  }
}
