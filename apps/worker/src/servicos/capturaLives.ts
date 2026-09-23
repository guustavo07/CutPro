import type { Plataforma } from '@cutpro/dominio';
import {
  calcularDeslocamentoNaJanela,
  listarSegmentosExpirados,
  listarSegmentosOrdenados,
  montarArgumentosCaptura,
  montarConteudoListaConcatenacao,
  selecionarSegmentosDaJanela,
  type ResolvedorFluxoAoVivo,
  type ServicoVideo,
} from '@cutpro/integracoes';
import type { RegistroLog } from '@cutpro/nucleo';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const INTERVALO_LIMPEZA_MS = 60_000;
const MILISSEGUNDOS_POR_SEGUNDO = 1000;
const NOME_LISTA_CONCATENACAO = 'lista.txt';

export type OpcoesCapturaLives = {
  readonly ativa: boolean;
  readonly caminhoFfmpeg: string;
  readonly diretorioBase: string;
  readonly retencaoMinutos: number;
  readonly atrasoTransmissaoSegundos: number;
};

export type JanelaExtraida = {
  readonly caminhoArquivo: string;
  readonly deslocamentoSegundos: number;
};

type CapturaAtiva = {
  readonly processo: ChildProcess;
  readonly diretorio: string;
  readonly temporizador: NodeJS.Timeout;
};

export class CapturaLives {
  private readonly capturas = new Map<string, CapturaAtiva>();

  constructor(
    private readonly resolvedor: ResolvedorFluxoAoVivo,
    private readonly video: ServicoVideo,
    private readonly opcoes: OpcoesCapturaLives,
    private readonly log: RegistroLog,
  ) {}

  estaCapturando(liveId: string): boolean {
    return this.capturas.has(liveId);
  }

  async garantirCaptura(entrada: {
    readonly liveId: string;
    readonly canal: string;
    readonly plataforma: Plataforma;
  }): Promise<void> {
    if (!this.opcoes.ativa) return;
    if (this.estaCapturando(entrada.liveId)) return;

    const urlFluxo = await this.resolvedor.resolverUrl({ plataforma: entrada.plataforma, canal: entrada.canal });
    if (!urlFluxo) {
      this.log.warn({ liveId: entrada.liveId, canal: entrada.canal }, 'Fluxo de vídeo não resolvido');
      return;
    }

    await this.iniciarProcesso(entrada.liveId, urlFluxo);
  }

  private async iniciarProcesso(liveId: string, urlFluxo: string): Promise<void> {
    const diretorio = join(this.opcoes.diretorioBase, liveId);
    await mkdir(diretorio, { recursive: true });

    const processo = spawn(
      this.opcoes.caminhoFfmpeg,
      [...montarArgumentosCaptura({ urlFluxo, diretorioDestino: diretorio })],
      { windowsHide: true },
    );
    processo.on('error', (erro) => this.log.error({ liveId, erro: erro.message }, 'Falha na captura de vídeo'));
    processo.on('close', (codigo) => this.log.warn({ liveId, codigo }, 'Captura de vídeo encerrada'));

    this.capturas.set(liveId, {
      processo,
      diretorio,
      temporizador: setInterval(() => void this.limpar(liveId), INTERVALO_LIMPEZA_MS),
    });
    this.log.info({ liveId }, 'Captura de vídeo iniciada');
  }

  private async limpar(liveId: string): Promise<void> {
    const captura = this.capturas.get(liveId);
    if (!captura) return;

    const segmentos = listarSegmentosOrdenados(await readdir(captura.diretorio));
    const expirados = listarSegmentosExpirados({
      segmentos,
      agora: new Date(),
      retencaoMinutos: this.opcoes.retencaoMinutos,
    });

    await Promise.all(
      expirados.map((segmento) => rm(join(captura.diretorio, segmento.nomeArquivo), { force: true })),
    );
  }

  async extrairJanela(entrada: {
    readonly liveId: string;
    readonly inicioLive: Date;
    readonly janela: { readonly inicioSegundos: number; readonly duracaoSegundos: number };
    readonly caminhoDestino: string;
  }): Promise<JanelaExtraida | null> {
    const captura = this.capturas.get(entrada.liveId);
    if (!captura) return null;

    const atrasoMs = this.opcoes.atrasoTransmissaoSegundos * MILISSEGUNDOS_POR_SEGUNDO;
    const inicioEm = new Date(
      entrada.inicioLive.getTime() + entrada.janela.inicioSegundos * MILISSEGUNDOS_POR_SEGUNDO - atrasoMs,
    );
    const fimEm = new Date(inicioEm.getTime() + entrada.janela.duracaoSegundos * MILISSEGUNDOS_POR_SEGUNDO);

    return this.concatenarJanela({ captura, inicioEm, fimEm, caminhoDestino: entrada.caminhoDestino });
  }

  private async concatenarJanela(entrada: {
    readonly captura: CapturaAtiva;
    readonly inicioEm: Date;
    readonly fimEm: Date;
    readonly caminhoDestino: string;
  }): Promise<JanelaExtraida | null> {
    const segmentos = listarSegmentosOrdenados(await readdir(entrada.captura.diretorio));
    const selecionados = selecionarSegmentosDaJanela({
      segmentos,
      inicioEm: entrada.inicioEm,
      fimEm: entrada.fimEm,
    });
    const primeiro = selecionados[0];
    if (!primeiro) return null;

    const caminhoLista = join(entrada.captura.diretorio, NOME_LISTA_CONCATENACAO);
    const caminhos = selecionados.map((segmento) => join(entrada.captura.diretorio, segmento.nomeArquivo));
    await writeFile(caminhoLista, montarConteudoListaConcatenacao(caminhos), 'utf8');
    await this.video.concatenar({ caminhoLista, caminhoDestino: entrada.caminhoDestino });
    await rm(caminhoLista, { force: true });

    return {
      caminhoArquivo: entrada.caminhoDestino,
      deslocamentoSegundos: calcularDeslocamentoNaJanela({ primeiroSegmento: primeiro, inicioEm: entrada.inicioEm }),
    };
  }

  async encerrarCaptura(liveId: string): Promise<void> {
    const captura = this.capturas.get(liveId);
    if (!captura) return;

    clearInterval(captura.temporizador);
    captura.processo.kill();
    this.capturas.delete(liveId);
    await rm(captura.diretorio, { recursive: true, force: true });
  }

  async encerrarTudo(): Promise<void> {
    await Promise.all([...this.capturas.keys()].map((liveId) => this.encerrarCaptura(liveId)));
  }
}
