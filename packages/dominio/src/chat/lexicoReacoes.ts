import { CategoriaReacao } from '../enums/categoriaReacao.js';

export type RegraReacao = {
  readonly identificador: string;
  readonly categoria: CategoriaReacao;
  readonly padrao: RegExp;
};

export const CATEGORIA_POR_TOKEN_EXATO: ReadonlyMap<string, CategoriaReacao> = new Map([
  ['lol', CategoriaReacao.HUMOR],
  ['lmao', CategoriaReacao.HUMOR],
  ['lmfao', CategoriaReacao.HUMOR],
  ['kek', CategoriaReacao.HUMOR],
  ['rofl', CategoriaReacao.HUMOR],
  ['hype', CategoriaReacao.HYPE],
  ['goat', CategoriaReacao.HYPE],
  ['insano', CategoriaReacao.HYPE],
  ['monstro', CategoriaReacao.HYPE],
  ['absurdo', CategoriaReacao.HYPE],
  ['wtf', CategoriaReacao.SURPRESA],
  ['omg', CategoriaReacao.SURPRESA],
  ['wow', CategoriaReacao.SURPRESA],
  ['eita', CategoriaReacao.SURPRESA],
  ['mds', CategoriaReacao.CHOQUE],
  ['pqp', CategoriaReacao.CHOQUE],
  ['caralho', CategoriaReacao.CHOQUE],
  ['crl', CategoriaReacao.CHOQUE],
  ['krl', CategoriaReacao.CHOQUE],
  ['porra', CategoriaReacao.CHOQUE],
  ['nossa', CategoriaReacao.CHOQUE],
  ['chocado', CategoriaReacao.CHOQUE],
  ['gg', CategoriaReacao.VITORIA],
  ['ez', CategoriaReacao.VITORIA],
  ['ace', CategoriaReacao.VITORIA],
  ['clutch', CategoriaReacao.VITORIA],
  ['ganhamos', CategoriaReacao.VITORIA],
  ['venceu', CategoriaReacao.VITORIA],
  ['f', CategoriaReacao.DERROTA],
  ['ff', CategoriaReacao.DERROTA],
  ['rip', CategoriaReacao.DERROTA],
  ['perdeu', CategoriaReacao.DERROTA],
  ['perdemos', CategoriaReacao.DERROTA],
  ['acabou', CategoriaReacao.DERROTA],
  ['hein', CategoriaReacao.CONFUSAO],
  ['oq', CategoriaReacao.CONFUSAO],
  ['oque', CategoriaReacao.CONFUSAO],
  ['ue', CategoriaReacao.CONFUSAO],
  ['cringe', CategoriaReacao.NEGATIVO],
  ['lixo', CategoriaReacao.NEGATIVO],
  ['ruim', CategoriaReacao.NEGATIVO],
  ['mimimi', CategoriaReacao.NEGATIVO],
]);

export const REGRAS_TOKEN: readonly RegraReacao[] = Object.freeze([
  { identificador: 'riso-k', categoria: CategoriaReacao.HUMOR, padrao: /^k{2,}$/ },
  { identificador: 'riso-ka', categoria: CategoriaReacao.HUMOR, padrao: /^(ka){2,}k?$/ },
  { identificador: 'riso-ha', categoria: CategoriaReacao.HUMOR, padrao: /^(ha){2,}h?$/ },
  { identificador: 'riso-he', categoria: CategoriaReacao.HUMOR, padrao: /^(he){2,}h?$/ },
  { identificador: 'riso-hue', categoria: CategoriaReacao.HUMOR, padrao: /^(hue){2,}$/ },
  { identificador: 'riso-rs', categoria: CategoriaReacao.HUMOR, padrao: /^(rs){2,}$/ },
  { identificador: 'riso-ah', categoria: CategoriaReacao.HUMOR, padrao: /^a?h{2,}a{2,}h*$/ },
  { identificador: 'hype-w', categoria: CategoriaReacao.HYPE, padrao: /^w{1,}$/ },
  { identificador: 'hype-vamo', categoria: CategoriaReacao.HYPE, padrao: /^vamo{1,3}s?$/ },
  { identificador: 'vitoria-gol', categoria: CategoriaReacao.VITORIA, padrao: /^go{1,3}l{1,3}$/ },
  { identificador: 'derrota-l', categoria: CategoriaReacao.DERROTA, padrao: /^l{1,3}$/ },
]);

export const REGRAS_FRASE: readonly RegraReacao[] = Object.freeze([
  { identificador: 'frase-nao-acredito', categoria: CategoriaReacao.SURPRESA, padrao: /nao\s*acredito/ },
  { identificador: 'frase-como-assim', categoria: CategoriaReacao.CONFUSAO, padrao: /como\s*assim/ },
  { identificador: 'frase-que-isso', categoria: CategoriaReacao.SURPRESA, padrao: /que\s+isso/ },
  { identificador: 'frase-nao-pode-ser', categoria: CategoriaReacao.SURPRESA, padrao: /nao\s+pode\s+ser/ },
  { identificador: 'frase-meu-deus', categoria: CategoriaReacao.CHOQUE, padrao: /me?u\s+deus/ },
  { identificador: 'frase-minha-nossa', categoria: CategoriaReacao.CHOQUE, padrao: /minha\s+nossa/ },
  { identificador: 'frase-olha-isso', categoria: CategoriaReacao.SURPRESA, padrao: /olha\s+(isso|so)/ },
  { identificador: 'frase-interrogacao', categoria: CategoriaReacao.CONFUSAO, padrao: /\?{2,}/ },
  { identificador: 'frase-exclamacao', categoria: CategoriaReacao.HYPE, padrao: /!{3,}/ },
]);

export const CATEGORIA_POR_EMOJI: ReadonlyMap<string, CategoriaReacao> = new Map([
  ['😂', CategoriaReacao.HUMOR],
  ['🤣', CategoriaReacao.HUMOR],
  ['💀', CategoriaReacao.HUMOR],
  ['😭', CategoriaReacao.HUMOR],
  ['😱', CategoriaReacao.CHOQUE],
  ['🤯', CategoriaReacao.CHOQUE],
  ['😮', CategoriaReacao.SURPRESA],
  ['👀', CategoriaReacao.SURPRESA],
  ['🔥', CategoriaReacao.HYPE],
  ['🚀', CategoriaReacao.HYPE],
  ['💪', CategoriaReacao.HYPE],
  ['🏆', CategoriaReacao.VITORIA],
  ['👑', CategoriaReacao.VITORIA],
  ['😡', CategoriaReacao.NEGATIVO],
  ['🤡', CategoriaReacao.NEGATIVO],
  ['❓', CategoriaReacao.CONFUSAO],
]);
