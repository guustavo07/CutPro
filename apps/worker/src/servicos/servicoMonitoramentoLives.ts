import { NivelEvento, StatusLive, type Canal, type PrismaClient } from '@cutpro/banco';
import { NomeFila, NomeJob } from '@cutpro/contratos';
import type { ProdutorFilas } from '@cutpro/filas';
import { ErroPlataforma, type CanalExterno, type FabricaPlataformas } from '@cutpro/integracoes';
import type { RegistroLog } from '@cutpro/nucleo';
import type { ColetorChat } from './coletorChat.js';
import { EtapaPipeline, type RegistroEventos } from './registroEventos.js';

export function montarCanalExterno(canal: Canal): CanalExterno {
  return {
    identificadorExterno: canal.identificadorExterno,
    nome: canal.nome,
    nomeExibicao: canal.nomeExibicao ?? canal.nome,
    url: canal.url,
    urlAvatar: canal.urlAvatar,
    identificadorChat: canal.identificadorChat,
  };
}

export class ServicoMonitoramentoLives {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly plataformas: FabricaPlataformas,
    private readonly coletor: ColetorChat,
    private readonly filas: ProdutorFilas,
    private readonly eventos: RegistroEventos,
    private readonly log: RegistroLog,
  ) {}

  async verificarCanaisMonitorados(canalId?: string): Promise<void> {
    const canais = await this.prisma.canal.findMany({
      where: { ativo: true, monitoramentoAtivo: true, id: canalId },
    });

    for (const canal of canais) {
      await this.verificarCanalComSeguranca(canal);
    }
  }

  private async verificarCanalComSeguranca(canal: Canal): Promise<void> {
    try {
      await this.verificarCanal(canal);
    } catch (erro) {
      await this.registrarFalha(canal, erro);
    }
  }

  private async registrarFalha(canal: Canal, erro: unknown): Promise<void> {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    this.log.error({ canalId: canal.id, erro: mensagem }, 'Falha ao verificar canal');

    if (!(erro instanceof ErroPlataforma)) return;

    await this.eventos.registrar({
      etapa: EtapaPipeline.FALHA_PLATAFORMA,
      nivel: NivelEvento.ERRO,
      mensagem,
      contexto: { canalId: canal.id, plataforma: canal.plataforma },
    });
  }

  private async verificarCanal(canal: Canal): Promise<void> {
    const plataforma = this.plataformas.obter(canal.plataforma);
    const canalExterno = montarCanalExterno(canal);
    const liveExterna = await plataforma.buscarLiveAtual(canalExterno);
    const liveAberta = await this.buscarLiveAberta(canal.id);

    if (!liveExterna) {
      await this.encerrarLiveSeNecessario(liveAberta);
      return;
    }

    const live = await this.registrarLive({ canal, liveExterna, liveAbertaId: liveAberta?.id ?? null });
    await this.coletor.garantirColeta({
      liveId: live.id,
      inicioLive: live.inicio,
      canalExterno,
      plataforma,
    });
    await this.agendarAnalise(live.id);
  }

  private async buscarLiveAberta(canalId: string) {
    return this.prisma.live.findFirst({ where: { canalId, status: StatusLive.AO_VIVO } });
  }

  private async registrarLive(entrada: {
    readonly canal: Canal;
    readonly liveExterna: { identificadorExterno: string; titulo: string | null; categoria: string | null; inicio: Date; espectadores: number; urlMiniatura: string | null };
    readonly liveAbertaId: string | null;
  }) {
    const { canal, liveExterna } = entrada;
    const live = await this.prisma.live.upsert({
      where: {
        plataforma_identificadorExterno: {
          plataforma: canal.plataforma,
          identificadorExterno: liveExterna.identificadorExterno,
        },
      },
      create: {
        canalId: canal.id,
        plataforma: canal.plataforma,
        identificadorExterno: liveExterna.identificadorExterno,
        titulo: liveExterna.titulo,
        categoria: liveExterna.categoria,
        inicio: liveExterna.inicio,
        urlMiniatura: liveExterna.urlMiniatura,
        picoEspectadores: liveExterna.espectadores,
        status: StatusLive.AO_VIVO,
      },
      update: {
        titulo: liveExterna.titulo,
        categoria: liveExterna.categoria,
        picoEspectadores: { set: liveExterna.espectadores },
        ultimaAtividade: new Date(),
      },
    });

    await this.anunciarLiveNova(live.id, entrada.liveAbertaId, canal);
    return live;
  }

  private async anunciarLiveNova(liveId: string, liveAbertaId: string | null, canal: Canal): Promise<void> {
    if (liveAbertaId === liveId) return;

    await this.eventos.registrar({
      etapa: EtapaPipeline.LIVE_INICIADA,
      liveId,
      mensagem: `Canal ${canal.nome} entrou ao vivo`,
      contexto: { plataforma: canal.plataforma },
    });
  }

  private async agendarAnalise(liveId: string): Promise<void> {
    await this.filas.enfileirar({
      fila: NomeFila.ANALISE_CHAT,
      job: NomeJob.ANALISAR_MOMENTOS,
      dados: { liveId },
      opcoes: { jobId: `${NomeJob.ANALISAR_MOMENTOS}:${liveId}:${Math.floor(Date.now() / 60_000)}` },
    });
  }

  private async encerrarLiveSeNecessario(live: { id: string } | null): Promise<void> {
    if (!live) return;

    await this.coletor.encerrarColeta(live.id);
    await this.prisma.live.update({
      where: { id: live.id },
      data: { status: StatusLive.ENCERRADA, fim: new Date() },
    });
    await this.eventos.registrar({
      etapa: EtapaPipeline.LIVE_ENCERRADA,
      liveId: live.id,
      mensagem: 'Live encerrada',
    });
  }
}
