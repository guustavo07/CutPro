import { DURACAO_BUCKET_SEGUNDOS } from '../constantes/chat.js';
import { CategoriaReacao, PESO_POR_CATEGORIA_REACAO } from '../enums/categoriaReacao.js';

export type MensagemAnalisada = {
  readonly instanteSegundos: number;
  readonly categoria: CategoriaReacao;
  readonly scoreReacao: number;
  readonly usuario?: string;
  readonly possuiEmoteRiso?: boolean;
};

export type BucketChat = {
  readonly indice: number;
  readonly inicioSegundos: number;
  readonly quantidadeMensagens: number;
  readonly quantidadeMensagensComReacao: number;
  readonly somaScoreReacao: number;
  readonly categoriaDominante: CategoriaReacao;
  readonly usuariosDistintosComEmoteRiso: number;
};

type AcumuladorBucket = {
  quantidadeMensagens: number;
  quantidadeMensagensComReacao: number;
  somaScoreReacao: number;
  scorePorCategoria: Map<CategoriaReacao, number>;
  usuariosComEmoteRiso: Set<string>;
};

function criarAcumulador(): AcumuladorBucket {
  return {
    quantidadeMensagens: 0,
    quantidadeMensagensComReacao: 0,
    somaScoreReacao: 0,
    scorePorCategoria: new Map(),
    usuariosComEmoteRiso: new Set(),
  };
}

function registrarEmoteRiso(acumulador: AcumuladorBucket, mensagem: MensagemAnalisada): void {
  if (!mensagem.possuiEmoteRiso || !mensagem.usuario) return;

  acumulador.usuariosComEmoteRiso.add(mensagem.usuario);
}

function acumular(acumulador: AcumuladorBucket, mensagem: MensagemAnalisada): void {
  acumulador.quantidadeMensagens += 1;
  registrarEmoteRiso(acumulador, mensagem);
  if (mensagem.categoria === CategoriaReacao.NEUTRO) return;

  acumulador.quantidadeMensagensComReacao += 1;
  acumulador.somaScoreReacao += mensagem.scoreReacao;
  const atual = acumulador.scorePorCategoria.get(mensagem.categoria) ?? 0;
  acumulador.scorePorCategoria.set(mensagem.categoria, atual + mensagem.scoreReacao);
}

function definirCategoriaDominante(scorePorCategoria: ReadonlyMap<CategoriaReacao, number>): CategoriaReacao {
  let dominante: CategoriaReacao = CategoriaReacao.NEUTRO;
  let maiorScore = 0;

  for (const [categoria, score] of scorePorCategoria) {
    const desempate = PESO_POR_CATEGORIA_REACAO[categoria] > PESO_POR_CATEGORIA_REACAO[dominante];
    if (score > maiorScore || (score === maiorScore && desempate)) {
      dominante = categoria;
      maiorScore = score;
    }
  }

  return dominante;
}

export function construirBucketsChat(
  mensagens: readonly MensagemAnalisada[],
  duracaoBucketSegundos: number = DURACAO_BUCKET_SEGUNDOS,
): readonly BucketChat[] {
  if (mensagens.length === 0) return [];

  const acumuladores = new Map<number, AcumuladorBucket>();
  let maiorIndice = 0;

  for (const mensagem of mensagens) {
    const indice = Math.max(0, Math.floor(mensagem.instanteSegundos / duracaoBucketSegundos));
    const acumulador = acumuladores.get(indice) ?? criarAcumulador();
    acumular(acumulador, mensagem);
    acumuladores.set(indice, acumulador);
    maiorIndice = Math.max(maiorIndice, indice);
  }

  return montarSerieContigua({ acumuladores, maiorIndice, duracaoBucketSegundos });
}

function montarSerieContigua(entrada: {
  readonly acumuladores: ReadonlyMap<number, AcumuladorBucket>;
  readonly maiorIndice: number;
  readonly duracaoBucketSegundos: number;
}): readonly BucketChat[] {
  const buckets: BucketChat[] = [];

  for (let indice = 0; indice <= entrada.maiorIndice; indice += 1) {
    const acumulador = entrada.acumuladores.get(indice) ?? criarAcumulador();
    buckets.push({
      indice,
      inicioSegundos: indice * entrada.duracaoBucketSegundos,
      quantidadeMensagens: acumulador.quantidadeMensagens,
      quantidadeMensagensComReacao: acumulador.quantidadeMensagensComReacao,
      somaScoreReacao: acumulador.somaScoreReacao,
      categoriaDominante: definirCategoriaDominante(acumulador.scorePorCategoria),
      usuariosDistintosComEmoteRiso: acumulador.usuariosComEmoteRiso.size,
    });
  }

  return buckets;
}
