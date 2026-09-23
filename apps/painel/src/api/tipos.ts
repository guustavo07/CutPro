export type Plataforma = 'TWITCH' | 'KICK';

export type ConfiguracaoCanal = {
  clipScoreMinimo: number;
  duracaoMinimaSegundos: number;
  duracaoMaximaSegundos: number;
  segundosAntes: number;
  segundosDepois: number;
  cortesMaximosPorLive: number;
  legendasAtivas: boolean;
  template: string;
  modoProcessamento: string;
  publicacaoDiariaMaxima: number;
  hashtagsPadrao: string[];
};

export type Canal = {
  id: string;
  nome: string;
  nomeExibicao: string;
  plataforma: Plataforma;
  identificadorExterno: string;
  url: string;
  urlAvatar: string | null;
  ativo: boolean;
  monitoramentoAtivo: boolean;
  geracaoAutomaticaAtiva: boolean;
  publicacaoAutomaticaAtiva: boolean;
  modoProcessamento: string;
  configuracao: ConfiguracaoCanal;
  dataCriacao: string;
};

export type Live = {
  id: string;
  canalId: string;
  canalNome: string;
  canalAvatar: string | null;
  plataforma: Plataforma;
  titulo: string | null;
  categoria: string | null;
  status: string;
  inicio: string;
  fim: string | null;
  duracaoSegundos: number;
  totalMensagens: number;
  picoEspectadores: number;
  momentosDetectados: number;
  cortesGerados: number;
  ultimaAtividade: string;
  urlVod: string | null;
};

export type Momento = {
  id: string;
  instantePicoSegundos: number;
  inicioSegundos: number;
  fimSegundos: number;
  chatScore: number;
  clipScore: number;
  categoriaDominante: string;
  quantidadeMensagens: number;
  mensagensPorMinuto: number;
  motivos: string[];
  processado: boolean;
  corteId: string | null;
  corteStatus: string | null;
};

export type Publicacao = {
  id: string;
  plataforma: string;
  status: string;
  url: string | null;
  dataPublicacao: string | null;
};

export type Corte = {
  id: string;
  liveId: string;
  canalId: string;
  canalNome: string;
  canalAvatar: string | null;
  plataforma: Plataforma;
  titulo: string | null;
  descricao: string | null;
  hashtags: string[];
  inicioSegundos: number;
  fimSegundos: number;
  duracaoSegundos: number;
  template: string;
  clipScore: number;
  status: string;
  mensagemErro: string | null;
  motivos: string[];
  categoriaDominante: string;
  mensagensPorMinuto: number;
  urlVideo: string | null;
  urlMiniatura: string | null;
  publicacoes: Publicacao[];
  dataCriacao: string;
};

export type ResumoPainel = {
  canaisMonitorados: number;
  livesAoVivo: number;
  cortesGeradosHoje: number;
  cortesPublicados: number;
};
