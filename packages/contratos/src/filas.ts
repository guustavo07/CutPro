export const NomeFila = Object.freeze({
  MONITORAMENTO_LIVES: 'live-monitoring',
  ANALISE_CHAT: 'chat-analysis',
  DETECCAO_CORTES: 'clip-detection',
  PROCESSAMENTO_VIDEO: 'video-processing',
  TRANSCRICAO: 'transcription',
  GERACAO_LEGENDAS: 'subtitle-generation',
  RENDERIZACAO_VIDEO: 'video-rendering',
  PUBLICACAO_SOCIAL: 'social-publishing',
});

export type NomeFila = (typeof NomeFila)[keyof typeof NomeFila];

export const NomeJob = Object.freeze({
  DETECTAR_LIVES: 'detectar-lives',
  COLETAR_CHAT: 'coletar-chat',
  ANALISAR_MOMENTOS: 'analisar-momentos',
  PROCESSAR_CORTE: 'processar-corte',
  TRANSCREVER_CORTE: 'transcrever-corte',
  GERAR_LEGENDA: 'gerar-legenda',
  RENDERIZAR_VIDEO: 'renderizar-video',
  PUBLICAR_TIKTOK: 'publicar-tiktok',
});

export type NomeJob = (typeof NomeJob)[keyof typeof NomeJob];

export type PayloadDetectarLives = {
  readonly canalId?: string;
};

export type PayloadColetarChat = {
  readonly liveId: string;
  readonly canalId: string;
};

export type PayloadAnalisarMomentos = {
  readonly liveId: string;
};

export type PayloadProcessarCorte = {
  readonly corteId: string;
};

export type PayloadTranscreverCorte = {
  readonly corteId: string;
};

export type PayloadGerarLegenda = {
  readonly corteId: string;
};

export type PayloadRenderizarVideo = {
  readonly corteId: string;
};

export type PayloadPublicar = {
  readonly publicacaoId: string;
};

export const INTERVALO_DETECCAO_LIVES_MS = 60_000;
export const INTERVALO_ANALISE_MOMENTOS_MS = 60_000;
export const TENTATIVAS_PADRAO_JOB = 3;
export const ATRASO_INICIAL_TENTATIVA_MS = 5_000;
