import { StatusLive } from '@cutpro/banco';
import { erroNaoEncontrado } from '../../infra/erros.js';
import type { LiveComContagens, RepositorioLives } from './repositorioLives.js';

const MILISSEGUNDOS_POR_SEGUNDO = 1000;

function calcularDuracaoSegundos(live: { inicio: Date; fim: Date | null; status: StatusLive }): number {
  const referencia = live.status === StatusLive.AO_VIVO ? new Date() : (live.fim ?? live.inicio);
  return Math.max(0, Math.floor((referencia.getTime() - live.inicio.getTime()) / MILISSEGUNDOS_POR_SEGUNDO));
}

export function montarRespostaLive(live: LiveComContagens) {
  return {
    id: live.id,
    canalId: live.canalId,
    canalNome: live.canal.nomeExibicao ?? live.canal.nome,
    canalAvatar: live.canal.urlAvatar,
    plataforma: live.plataforma,
    titulo: live.titulo,
    categoria: live.categoria,
    status: live.status,
    inicio: live.inicio.toISOString(),
    fim: live.fim?.toISOString() ?? null,
    duracaoSegundos: calcularDuracaoSegundos(live),
    totalMensagens: live.totalMensagens,
    picoEspectadores: live.picoEspectadores,
    momentosDetectados: live._count.momentos,
    cortesGerados: live._count.cortes,
    ultimaAtividade: live.ultimaAtividade.toISOString(),
    urlVod: live.urlVod,
  };
}

export class ServicoLives {
  constructor(private readonly repositorio: RepositorioLives) {}

  async listarRecentes() {
    const lives = await this.repositorio.listarRecentes();
    return lives.map(montarRespostaLive);
  }

  async listarAoVivo() {
    const lives = await this.repositorio.listarAoVivo();
    return lives.map(montarRespostaLive);
  }

  async reiniciarMetricas() {
    return this.repositorio.reiniciarMetricas();
  }

  async obter(id: string) {
    const live = await this.repositorio.obterPorId(id);
    if (!live) throw erroNaoEncontrado('Live não encontrada');

    return montarRespostaLive(live);
  }

  async listarMomentos(liveId: string) {
    await this.obter(liveId);
    const momentos = await this.repositorio.listarMomentos(liveId);

    return momentos.map((momento) => ({
      id: momento.id,
      instantePicoSegundos: momento.instantePicoSegundos,
      inicioSegundos: momento.inicioSegundos,
      fimSegundos: momento.fimSegundos,
      chatScore: Number(momento.chatScore),
      clipScore: Number(momento.clipScore),
      categoriaDominante: momento.categoriaDominante,
      quantidadeMensagens: momento.quantidadeMensagens,
      mensagensPorMinuto: momento.mensagensPorMinuto,
      motivos: momento.motivos,
      processado: momento.processado,
      corteId: momento.corte?.id ?? null,
      corteStatus: momento.corte?.status ?? null,
    }));
  }
}
