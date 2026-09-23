FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg openssl ca-certificates fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/dominio/package.json packages/dominio/
COPY packages/contratos/package.json packages/contratos/
COPY packages/banco/package.json packages/banco/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/painel/package.json apps/painel/

RUN npm install

COPY . .

RUN npm run gerar --workspace @cutpro/banco

EXPOSE 3333 5173
