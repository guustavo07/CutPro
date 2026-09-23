import { Plataforma } from '@cutpro/dominio';
import {
  ErroPlataforma,
  type CanalExterno,
  type ConexaoChat,
  type LiveExterna,
  type OpcoesConexaoChat,
  type ServicoPlataformaStreaming,
  type VodExterno,
} from '../tipos.js';
import { KickApi, type CanalKick, type CredenciaisKick } from './kickApi.js';
import { ConexaoChatKick } from './kickChat.js';

const URL_BASE_CANAL = 'https://kick.com';

export type OpcoesKickService = {
  readonly credenciais: CredenciaisKick;
  readonly chavePusher: string;
};

export class KickService implements ServicoPlataformaStreaming {
  readonly plataforma = Plataforma.KICK;

  private readonly api: KickApi;

  constructor(private readonly opcoes: OpcoesKickService) {
    this.api = new KickApi(opcoes.credenciais);
  }

  async buscarCanal(identificador: string): Promise<CanalExterno | null> {
    const slug = identificador.trim().toLowerCase();
    const canal = await this.api.buscarCanalPorSlug(slug);
    if (!canal) return null;

    return {
      identificadorExterno: String(canal.broadcaster_user_id),
      nome: canal.slug,
      nomeExibicao: canal.slug,
      url: `${URL_BASE_CANAL}/${canal.slug}`,
      urlAvatar: canal.banner_picture,
      identificadorChat: await this.descobrirSalaChat(slug),
    };
  }

  private async descobrirSalaChat(slug: string): Promise<string | null> {
    const sala = await this.api.buscarSalaChat(slug);
    return sala?.identificadorSala ?? null;
  }

  async buscarLiveAtual(canal: CanalExterno): Promise<LiveExterna | null> {
    const dados = await this.api.buscarCanalPorSlug(canal.nome);
    if (!dados?.stream?.is_live) return null;

    return this.montarLive(dados);
  }

  private montarLive(dados: CanalKick): LiveExterna {
    const stream = dados.stream;

    return {
      identificadorExterno: stream?.key ?? `${dados.broadcaster_user_id}-${stream?.start_time ?? ''}`,
      titulo: dados.stream_title,
      categoria: dados.category?.name ?? null,
      inicio: stream?.start_time ? new Date(stream.start_time) : new Date(),
      espectadores: stream?.viewer_count ?? 0,
      urlMiniatura: stream?.thumbnail ?? null,
    };
  }

  async buscarVodMaisRecente(): Promise<VodExterno | null> {
    return null;
  }

  async conectarChat(opcoes: OpcoesConexaoChat): Promise<ConexaoChat> {
    const identificadorSala = opcoes.canal.identificadorChat;
    if (!identificadorSala) {
      throw new ErroPlataforma(
        Plataforma.KICK,
        `Sala de chat do canal ${opcoes.canal.nome} não gravada no cadastro. Recadastre o canal para preencher o identificador de chat.`,
      );
    }

    const conexao = new ConexaoChatKick({ ...opcoes, identificadorSala, chavePusher: this.opcoes.chavePusher });
    await conexao.conectar();

    return conexao;
  }
}
