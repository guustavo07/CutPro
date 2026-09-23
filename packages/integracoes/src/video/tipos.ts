import type { RegiaoWebcam } from '@cutpro/dominio';

export const TemplateEnquadramento = Object.freeze({
  VERTICAL_PADRAO: 'VERTICAL_PADRAO',
  GAMEPLAY_CENTRAL: 'GAMEPLAY_CENTRAL',
  WEBCAM_DESTAQUE: 'WEBCAM_DESTAQUE',
  TELA_CHEIA: 'TELA_CHEIA',
});

export type TemplateEnquadramento = (typeof TemplateEnquadramento)[keyof typeof TemplateEnquadramento];

export type EntradaRecorte = {
  readonly caminhoOrigem: string;
  readonly caminhoDestino: string;
  readonly inicioSegundos: number;
  readonly duracaoSegundos: number;
};

export type EntradaEnquadramento = {
  readonly caminhoOrigem: string;
  readonly caminhoDestino: string;
  readonly template: TemplateEnquadramento;
  readonly regiaoWebcam?: RegiaoWebcam;
  readonly deslocamentoGameplay?: number;
  readonly caminhoMarca?: string;
  readonly nomeDoCanal?: string;
  readonly arquivoFonte?: string;
  readonly caminhoLegenda?: string;
};

export type EntradaMiniatura = {
  readonly caminhoOrigem: string;
  readonly caminhoDestino: string;
  readonly instanteSegundos: number;
};

export type EntradaConcatenacao = {
  readonly caminhoLista: string;
  readonly caminhoDestino: string;
};

export type EntradaExtracaoAudio = {
  readonly caminhoOrigem: string;
  readonly caminhoDestino: string;
};

export interface ServicoVideo {
  concatenar(entrada: EntradaConcatenacao): Promise<void>;
  extrairAudio(entrada: EntradaExtracaoAudio): Promise<void>;
  recortar(entrada: EntradaRecorte): Promise<void>;
  enquadrarVertical(entrada: EntradaEnquadramento): Promise<void>;
  gerarMiniatura(entrada: EntradaMiniatura): Promise<void>;
  obterDuracaoSegundos(caminhoOrigem: string): Promise<number>;
}

export class ErroProcessamentoVideo extends Error {
  constructor(
    readonly comando: string,
    readonly codigoSaida: number | null,
    detalhe: string,
  ) {
    super(`Falha no ${comando} (código ${codigoSaida ?? 'desconhecido'}): ${detalhe}`);
    this.name = 'ErroProcessamentoVideo';
  }
}
