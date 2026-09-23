-- AlterTable
ALTER TABLE "mensagens_chat" ADD COLUMN     "possuiEmoteRiso" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "momentos_detectados" ADD COLUMN     "usuariosDistintosEmoteRiso" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "mensagens_chat_liveId_possuiEmoteRiso_offsetSegundos_idx" ON "mensagens_chat"("liveId", "possuiEmoteRiso", "offsetSegundos");
