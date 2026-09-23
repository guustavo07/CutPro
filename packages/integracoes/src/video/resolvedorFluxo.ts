import { Plataforma } from '@cutpro/dominio';
import { spawn } from 'node:child_process';

const URL_BASE_POR_PLATAFORMA: Readonly<Record<string, string>> = Object.freeze({
  [Plataforma.TWITCH]: 'https://www.twitch.tv',
  [Plataforma.KICK]: 'https://kick.com',
});

const QUALIDADE_PADRAO = 'best';
const CODIGO_SAIDA_SUCESSO = 0;
const TAMANHO_MAXIMO_DETALHE_ERRO = 300;

export type EntradaResolucaoFluxo = {
  readonly plataforma: Plataforma;
  readonly canal: string;
};

export interface ResolvedorFluxoAoVivo {
  resolverUrl(entrada: EntradaResolucaoFluxo): Promise<string | null>;
}

export class ErroResolucaoFluxo extends Error {
  constructor(canal: string, detalhe: string) {
    super(`Não foi possível resolver o fluxo de vídeo do canal ${canal}: ${detalhe}`);
    this.name = 'ErroResolucaoFluxo';
  }
}

export function montarUrlDoCanal(entrada: EntradaResolucaoFluxo): string | null {
  const base = URL_BASE_POR_PLATAFORMA[entrada.plataforma];
  return base ? `${base}/${entrada.canal.toLowerCase()}` : null;
}

export function montarArgumentosStreamlink(urlCanal: string, qualidade: string): readonly string[] {
  return ['--stream-url', urlCanal, qualidade];
}

export type OpcoesResolvedorStreamlink = {
  readonly caminhoStreamlink: string;
  readonly qualidade?: string;
};

export class ResolvedorFluxoStreamlink implements ResolvedorFluxoAoVivo {
  constructor(private readonly opcoes: OpcoesResolvedorStreamlink) {}

  async resolverUrl(entrada: EntradaResolucaoFluxo): Promise<string | null> {
    const urlCanal = montarUrlDoCanal(entrada);
    if (!urlCanal) return null;

    const argumentos = montarArgumentosStreamlink(urlCanal, this.opcoes.qualidade ?? QUALIDADE_PADRAO);
    const resultado = await this.executar(argumentos);
    if (resultado.codigo !== CODIGO_SAIDA_SUCESSO) {
      throw new ErroResolucaoFluxo(entrada.canal, resultado.saidaErro.trim().slice(0, TAMANHO_MAXIMO_DETALHE_ERRO));
    }

    const url = resultado.saidaPadrao.trim();
    return url.length > 0 ? url : null;
  }

  private executar(
    argumentos: readonly string[],
  ): Promise<{ codigo: number | null; saidaPadrao: string; saidaErro: string }> {
    return new Promise((resolver, rejeitar) => {
      const processo = spawn(this.opcoes.caminhoStreamlink, [...argumentos], { windowsHide: true });
      let saidaPadrao = '';
      let saidaErro = '';

      processo.stdout.on('data', (parte) => (saidaPadrao += parte.toString()));
      processo.stderr.on('data', (parte) => (saidaErro += parte.toString()));
      processo.on('error', (erro) => rejeitar(new ErroResolucaoFluxo('desconhecido', erro.message)));
      processo.on('close', (codigo) => resolver({ codigo, saidaPadrao, saidaErro }));
    });
  }
}
