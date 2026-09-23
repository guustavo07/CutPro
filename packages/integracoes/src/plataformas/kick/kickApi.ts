import { Plataforma } from '@cutpro/dominio';
import { ErroCredenciaisPlataforma, ErroPlataforma } from '../tipos.js';

const URL_TOKEN = 'https://id.kick.com/oauth/token';
const URL_BASE_PUBLICA = 'https://api.kick.com/public/v1';
const URL_BASE_NAO_OFICIAL = 'https://kick.com/api/v2';
const MARGEM_RENOVACAO_TOKEN_MS = 60_000;
const STATUS_NAO_AUTORIZADO = 401;
const STATUS_BLOQUEIO_CLOUDFLARE = 403;

export type CredenciaisKick = {
  readonly clientId: string;
  readonly clientSecret: string;
};

export type CanalKick = {
  readonly broadcaster_user_id: number;
  readonly slug: string;
  readonly channel_description: string | null;
  readonly banner_picture: string | null;
  readonly stream: {
    readonly is_live: boolean;
    readonly start_time: string | null;
    readonly viewer_count: number;
    readonly thumbnail: string | null;
    readonly key: string | null;
  } | null;
  readonly stream_title: string | null;
  readonly category: { readonly name: string } | null;
};

export type SalaChatKick = {
  readonly identificadorSala: string;
  readonly slug: string;
};

type RespostaPublica<T> = {
  readonly data: readonly T[];
};

export class KickApi {
  private token: { valor: string; expiraEm: number } | null = null;

  constructor(private readonly credenciais: CredenciaisKick) {}

  private possuiCredenciais(): boolean {
    return this.credenciais.clientId.length > 0 && this.credenciais.clientSecret.length > 0;
  }

  private async obterToken(): Promise<string> {
    if (!this.possuiCredenciais()) {
      throw new ErroCredenciaisPlataforma(Plataforma.KICK, 'KICK_CLIENT_ID e KICK_CLIENT_SECRET não configurados');
    }

    const agora = Date.now();
    if (this.token && this.token.expiraEm - MARGEM_RENOVACAO_TOKEN_MS > agora) return this.token.valor;

    const resposta = await fetch(URL_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.credenciais.clientId,
        client_secret: this.credenciais.clientSecret,
        grant_type: 'client_credentials',
      }),
    });
    if (!resposta.ok) {
      throw new ErroCredenciaisPlataforma(Plataforma.KICK, 'Falha ao obter token de aplicação do Kick');
    }

    return this.guardarToken(await resposta.json());
  }

  private guardarToken(dados: unknown): string {
    const resposta = dados as { access_token?: string; expires_in?: number };
    if (!resposta.access_token) {
      throw new ErroCredenciaisPlataforma(Plataforma.KICK, 'Resposta de token do Kick sem access_token');
    }

    this.token = { valor: resposta.access_token, expiraEm: Date.now() + (resposta.expires_in ?? 0) * 1000 };
    return resposta.access_token;
  }

  async buscarCanalPorSlug(slug: string): Promise<CanalKick | null> {
    const token = await this.obterToken();
    const url = `${URL_BASE_PUBLICA}/channels?slug=${encodeURIComponent(slug)}`;
    const resposta = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (resposta.status === STATUS_NAO_AUTORIZADO) {
      this.token = null;
      throw new ErroCredenciaisPlataforma(Plataforma.KICK, 'Credenciais do Kick recusadas');
    }
    if (!resposta.ok) {
      throw new ErroPlataforma(Plataforma.KICK, `Falha ao consultar canal no Kick: ${resposta.status}`);
    }

    const corpo = (await resposta.json()) as RespostaPublica<CanalKick>;
    return corpo.data?.[0] ?? null;
  }

  async buscarSalaChat(slug: string): Promise<SalaChatKick | null> {
    const resposta = await fetch(`${URL_BASE_NAO_OFICIAL}/channels/${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json' },
    });

    if (resposta.status === STATUS_BLOQUEIO_CLOUDFLARE) {
      throw new ErroPlataforma(
        Plataforma.KICK,
        'Endpoint não oficial do Kick bloqueado pelo Cloudflare. Configure o webhook oficial de chat.',
      );
    }
    if (!resposta.ok) return null;

    return this.extrairSalaChat(await resposta.json(), slug);
  }

  private extrairSalaChat(dados: unknown, slug: string): SalaChatKick | null {
    const corpo = dados as { chatroom?: { id?: number } };
    if (!corpo.chatroom?.id) return null;

    return { identificadorSala: String(corpo.chatroom.id), slug };
  }
}
