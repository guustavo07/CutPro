-- CreateEnum
CREATE TYPE "Plataforma" AS ENUM ('TWITCH', 'KICK');

-- CreateEnum
CREATE TYPE "StatusLive" AS ENUM ('AO_VIVO', 'ENCERRADA', 'PROCESSANDO_VOD', 'ERRO');

-- CreateEnum
CREATE TYPE "CategoriaReacao" AS ENUM ('HUMOR', 'SURPRESA', 'HYPE', 'NEGATIVO', 'VITORIA', 'DERROTA', 'CONFUSAO', 'CHOQUE', 'NEUTRO');

-- CreateEnum
CREATE TYPE "StatusCorte" AS ENUM ('DETECTADO', 'AGUARDANDO_PROCESSAMENTO', 'PROCESSANDO', 'TRANSCREVENDO', 'GERANDO_LEGENDAS', 'RENDERIZANDO', 'PRONTO', 'APROVADO', 'REJEITADO', 'PUBLICANDO', 'PUBLICADO', 'ERRO');

-- CreateEnum
CREATE TYPE "PlataformaPublicacao" AS ENUM ('TIKTOK', 'INSTAGRAM_REELS', 'YOUTUBE_SHORTS');

-- CreateEnum
CREATE TYPE "StatusPublicacao" AS ENUM ('AGENDADA', 'ENVIANDO', 'PUBLICADA', 'FALHA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "ModoProcessamento" AS ENUM ('ECONOMICO', 'BALANCEADO', 'QUALIDADE_MAXIMA');

-- CreateEnum
CREATE TYPE "NivelEvento" AS ENUM ('INFO', 'ALERTA', 'ERRO');

-- CreateTable
CREATE TABLE "canais" (
    "id" UUID NOT NULL,
    "usuarioId" UUID,
    "nome" VARCHAR(120) NOT NULL,
    "nomeExibicao" VARCHAR(120),
    "plataforma" "Plataforma" NOT NULL,
    "identificadorExterno" VARCHAR(120) NOT NULL,
    "identificadorChat" VARCHAR(120),
    "url" VARCHAR(300) NOT NULL,
    "urlAvatar" VARCHAR(500),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "monitoramentoAtivo" BOOLEAN NOT NULL DEFAULT true,
    "geracaoAutomaticaAtiva" BOOLEAN NOT NULL DEFAULT false,
    "publicacaoAutomaticaAtiva" BOOLEAN NOT NULL DEFAULT false,
    "modoProcessamento" "ModoProcessamento" NOT NULL DEFAULT 'BALANCEADO',
    "configuracao" JSONB NOT NULL DEFAULT '{}',
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lives" (
    "id" UUID NOT NULL,
    "canalId" UUID NOT NULL,
    "plataforma" "Plataforma" NOT NULL,
    "identificadorExterno" VARCHAR(120) NOT NULL,
    "titulo" VARCHAR(300),
    "categoria" VARCHAR(120),
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),
    "status" "StatusLive" NOT NULL DEFAULT 'AO_VIVO',
    "urlVod" VARCHAR(500),
    "urlMiniatura" VARCHAR(500),
    "totalMensagens" INTEGER NOT NULL DEFAULT 0,
    "picoEspectadores" INTEGER NOT NULL DEFAULT 0,
    "ultimaAtividade" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens_chat" (
    "id" BIGSERIAL NOT NULL,
    "liveId" UUID NOT NULL,
    "usuario" VARCHAR(120) NOT NULL,
    "mensagem" VARCHAR(500) NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "offsetSegundos" INTEGER NOT NULL,
    "categoriaReacao" "CategoriaReacao" NOT NULL DEFAULT 'NEUTRO',
    "scoreReacao" DECIMAL(5,4) NOT NULL DEFAULT 0,

    CONSTRAINT "mensagens_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buckets_chat" (
    "id" BIGSERIAL NOT NULL,
    "liveId" UUID NOT NULL,
    "indice" INTEGER NOT NULL,
    "inicioSegundos" INTEGER NOT NULL,
    "quantidadeMensagens" INTEGER NOT NULL DEFAULT 0,
    "quantidadeMensagensComReacao" INTEGER NOT NULL DEFAULT 0,
    "somaScoreReacao" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "categoriaDominante" "CategoriaReacao" NOT NULL DEFAULT 'NEUTRO',
    "analisado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "buckets_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amostras_audiencia" (
    "id" BIGSERIAL NOT NULL,
    "liveId" UUID NOT NULL,
    "offsetSegundos" INTEGER NOT NULL,
    "espectadores" INTEGER NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amostras_audiencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "momentos_detectados" (
    "id" UUID NOT NULL,
    "liveId" UUID NOT NULL,
    "instantePicoSegundos" INTEGER NOT NULL,
    "inicioSegundos" INTEGER NOT NULL,
    "fimSegundos" INTEGER NOT NULL,
    "chatScore" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "audioScore" DECIMAL(5,4),
    "transcricaoScore" DECIMAL(5,4),
    "visualScore" DECIMAL(5,4),
    "espectadoresScore" DECIMAL(5,4),
    "clipScore" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "categoriaDominante" "CategoriaReacao" NOT NULL DEFAULT 'NEUTRO',
    "quantidadeMensagens" INTEGER NOT NULL DEFAULT 0,
    "mensagensPorMinuto" INTEGER NOT NULL DEFAULT 0,
    "baselineMensagensPorMinuto" INTEGER NOT NULL DEFAULT 0,
    "motivos" JSONB NOT NULL DEFAULT '[]',
    "analisadoPorIa" BOOLEAN NOT NULL DEFAULT false,
    "processado" BOOLEAN NOT NULL DEFAULT false,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "momentos_detectados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cortes" (
    "id" UUID NOT NULL,
    "liveId" UUID NOT NULL,
    "momentoDetectadoId" UUID NOT NULL,
    "titulo" VARCHAR(200),
    "descricao" VARCHAR(1000),
    "hashtags" JSONB NOT NULL DEFAULT '[]',
    "inicioSegundos" INTEGER NOT NULL,
    "fimSegundos" INTEGER NOT NULL,
    "duracaoSegundos" INTEGER NOT NULL,
    "template" VARCHAR(60) NOT NULL DEFAULT 'VERTICAL_PADRAO',
    "caminhoArquivoBruto" VARCHAR(500),
    "caminhoArquivo" VARCHAR(500),
    "caminhoMiniatura" VARCHAR(500),
    "caminhoLegenda" VARCHAR(500),
    "clipScore" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "status" "StatusCorte" NOT NULL DEFAULT 'DETECTADO',
    "mensagemErro" VARCHAR(1000),
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cortes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcricoes" (
    "id" UUID NOT NULL,
    "corteId" UUID NOT NULL,
    "provedor" VARCHAR(60) NOT NULL,
    "idioma" VARCHAR(10) NOT NULL DEFAULT 'pt',
    "texto" TEXT NOT NULL,
    "palavras" JSONB NOT NULL DEFAULT '[]',
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcricoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicacoes" (
    "id" UUID NOT NULL,
    "corteId" UUID NOT NULL,
    "plataforma" "PlataformaPublicacao" NOT NULL,
    "status" "StatusPublicacao" NOT NULL DEFAULT 'AGENDADA',
    "url" VARCHAR(500),
    "idExterno" VARCHAR(200),
    "visualizacoes" INTEGER,
    "erro" VARCHAR(1000),
    "agendadaPara" TIMESTAMP(3),
    "dataPublicacao" TIMESTAMP(3),
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publicacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_pipeline" (
    "id" BIGSERIAL NOT NULL,
    "liveId" UUID,
    "corteId" UUID,
    "etapa" VARCHAR(60) NOT NULL,
    "nivel" "NivelEvento" NOT NULL DEFAULT 'INFO',
    "mensagem" VARCHAR(500) NOT NULL,
    "contexto" JSONB NOT NULL DEFAULT '{}',
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "canais_monitoramentoAtivo_ativo_idx" ON "canais"("monitoramentoAtivo", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "canais_plataforma_identificadorExterno_key" ON "canais"("plataforma", "identificadorExterno");

-- CreateIndex
CREATE INDEX "lives_canalId_inicio_idx" ON "lives"("canalId", "inicio");

-- CreateIndex
CREATE INDEX "lives_status_idx" ON "lives"("status");

-- CreateIndex
CREATE UNIQUE INDEX "lives_plataforma_identificadorExterno_key" ON "lives"("plataforma", "identificadorExterno");

-- CreateIndex
CREATE INDEX "mensagens_chat_liveId_offsetSegundos_idx" ON "mensagens_chat"("liveId", "offsetSegundos");

-- CreateIndex
CREATE INDEX "mensagens_chat_liveId_categoriaReacao_idx" ON "mensagens_chat"("liveId", "categoriaReacao");

-- CreateIndex
CREATE INDEX "buckets_chat_liveId_analisado_idx" ON "buckets_chat"("liveId", "analisado");

-- CreateIndex
CREATE UNIQUE INDEX "buckets_chat_liveId_indice_key" ON "buckets_chat"("liveId", "indice");

-- CreateIndex
CREATE UNIQUE INDEX "amostras_audiencia_liveId_offsetSegundos_key" ON "amostras_audiencia"("liveId", "offsetSegundos");

-- CreateIndex
CREATE INDEX "momentos_detectados_liveId_processado_idx" ON "momentos_detectados"("liveId", "processado");

-- CreateIndex
CREATE INDEX "momentos_detectados_clipScore_idx" ON "momentos_detectados"("clipScore");

-- CreateIndex
CREATE UNIQUE INDEX "momentos_detectados_liveId_instantePicoSegundos_key" ON "momentos_detectados"("liveId", "instantePicoSegundos");

-- CreateIndex
CREATE UNIQUE INDEX "cortes_momentoDetectadoId_key" ON "cortes"("momentoDetectadoId");

-- CreateIndex
CREATE INDEX "cortes_status_dataCriacao_idx" ON "cortes"("status", "dataCriacao");

-- CreateIndex
CREATE INDEX "cortes_liveId_idx" ON "cortes"("liveId");

-- CreateIndex
CREATE UNIQUE INDEX "transcricoes_corteId_key" ON "transcricoes"("corteId");

-- CreateIndex
CREATE INDEX "publicacoes_status_agendadaPara_idx" ON "publicacoes"("status", "agendadaPara");

-- CreateIndex
CREATE INDEX "publicacoes_corteId_idx" ON "publicacoes"("corteId");

-- CreateIndex
CREATE INDEX "eventos_pipeline_liveId_dataCriacao_idx" ON "eventos_pipeline"("liveId", "dataCriacao");

-- CreateIndex
CREATE INDEX "eventos_pipeline_corteId_dataCriacao_idx" ON "eventos_pipeline"("corteId", "dataCriacao");

-- AddForeignKey
ALTER TABLE "lives" ADD CONSTRAINT "lives_canalId_fkey" FOREIGN KEY ("canalId") REFERENCES "canais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_chat" ADD CONSTRAINT "mensagens_chat_liveId_fkey" FOREIGN KEY ("liveId") REFERENCES "lives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buckets_chat" ADD CONSTRAINT "buckets_chat_liveId_fkey" FOREIGN KEY ("liveId") REFERENCES "lives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amostras_audiencia" ADD CONSTRAINT "amostras_audiencia_liveId_fkey" FOREIGN KEY ("liveId") REFERENCES "lives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "momentos_detectados" ADD CONSTRAINT "momentos_detectados_liveId_fkey" FOREIGN KEY ("liveId") REFERENCES "lives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cortes" ADD CONSTRAINT "cortes_liveId_fkey" FOREIGN KEY ("liveId") REFERENCES "lives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cortes" ADD CONSTRAINT "cortes_momentoDetectadoId_fkey" FOREIGN KEY ("momentoDetectadoId") REFERENCES "momentos_detectados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcricoes" ADD CONSTRAINT "transcricoes_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "cortes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "cortes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_pipeline" ADD CONSTRAINT "eventos_pipeline_liveId_fkey" FOREIGN KEY ("liveId") REFERENCES "lives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_pipeline" ADD CONSTRAINT "eventos_pipeline_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "cortes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

