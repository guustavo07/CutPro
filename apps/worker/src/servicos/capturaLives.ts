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
      temporizador: setInterval(() => void this.limparTodosOsDiretorios(), INTERVALO_LIMPEZA_MS),
    });
    this.log.info({ liveId }, 'Captura de vídeo iniciada');
  }

  private async limparTodosOsDiretorios(): Promise<void> {
    const entradas = await readdir(this.opcoes.diretorioBase, { withFileTypes: true }).catch(() => []);
    const diretorios = entradas.filter((entrada) => entrada.isDirectory());

    for (const diretorio of diretorios) {
      await this.limparDiretorio(join(this.opcoes.diretorioBase, diretorio.name));
    }
  }

  private async limparDiretorio(diretorio: string): Promise<void> {
    const arquivos = await readdir(diretorio).catch(() => [] as string[]);
    const expirados = listarSegmentosExpirados({
      segmentos: listarSegmentosOrdenados(arquivos),
      agora: new Date(),
      retencaoMinutos: this.opcoes.retencaoMinutos,
    });

    await Promise.all(expirados.map((segmento) => rm(join(diretorio, segmento.nomeArquivo), { force: true })));
    await this.removerSeVazio(diretorio);
  }

  private async removerSeVazio(diretorio: string): Promise<void> {
    const restantes = await readdir(diretorio).catch(() => ['nao-vazio']);
    if (restantes.length > 0) return;

    await rm(diretorio, { recursive: true, force: true });
  }

  private diretorioDaLive(liveId: string): string {
    return join(this.opcoes.diretorioBase, liveId);
  }

  async extrairJanela(entrada: {
    readonly liveId: string;
    readonly inicioLive: Date;
    readonly janela: { readonly inicioSegundos: number; readonly duracaoSegundos: number };
    readonly caminhoDestino: string;
  }): Promise<JanelaExtraida | null> {
    const atrasoMs = this.opcoes.atrasoTransmissaoSegundos * MILISSEGUNDOS_POR_SEGUNDO;
    const inicioEm = new Date(
      entrada.inicioLive.getTime() + entrada.janela.inicioSegundos * MILISSEGUNDOS_POR_SEGUNDO - atrasoMs,
    );
    const fimEm = new Date(inicioEm.getTime() + entrada.janela.duracaoSegundos * MILISSEGUNDOS_POR_SEGUNDO);

    return this.concatenarJanela({
      diretorio: this.diretorioDaLive(entrada.liveId),
      inicioEm,
      fimEm,
      caminhoDestino: entrada.caminhoDestino,
    });
  }

  private async concatenarJanela(entrada: {
    readonly diretorio: string;
    readonly inicioEm: Date;
    readonly fimEm: Date;
    readonly caminhoDestino: string;
  }): Promise<JanelaExtraida | null> {
    const arquivos = await readdir(entrada.diretorio).catch(() => [] as string[]);
    const segmentos = listarSegmentosOrdenados(arquivos);
    const selecionados = selecionarSegmentosDaJanela({
      segmentos,
      inicioEm: entrada.inicioEm,
      fimEm: entrada.fimEm,
    });
    const primeiro = selecionados[0];
    if (!primeiro) return null;

    const caminhoLista = join(entrada.diretorio, NOME_LISTA_CONCATENACAO);
    const caminhos = selecionados.map((segmento) => join(entrada.diretorio, segmento.nomeArquivo));
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
    await this.limparDiretorio(this.diretorioDaLive(liveId));
  }

  async encerrarTudo(): Promise<void> {
    await Promise.all([...this.capturas.keys()].map((liveId) => this.encerrarCaptura(liveId)));
  }
}
