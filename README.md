# CutPro

Plataforma de geração automática de cortes verticais a partir de lives da Twitch e do Kick.

O sistema monitora canais, acompanha o chat em tempo real, identifica os momentos com maior
probabilidade de virar corte, gera o vídeo no formato 9:16 com legenda e permite aprovar
e publicar pelo painel.

## Estado atual

| Fase | Escopo | Situação |
|---|---|---|
| **1** | Monitoramento, coleta de chat, detecção de picos, candidatos a corte | **Pronta** |
| 2 | Captura de vídeo, FFmpeg, transcrição, legendas, render vertical | Pendente |
| 3 | Análise por IA, título automático, thumbnail, sinais de áudio e visual | Pendente |
| 4 | Publicação no TikTok, histórico e métricas | Pendente |

A Fase 1 entrega o caminho completo: **live detectada → chat coletado → pico identificado →
momento pontuado → candidato a corte criado**, com painel, API, filas e banco funcionando.

## Requisitos

- Node.js 20.10 ou superior
- Docker (para Postgres e Redis locais)
- FFmpeg no `PATH` (só a partir da Fase 2; a imagem Docker já traz)

## Instalação

```bash
git clone <repositorio> CutPro
cd CutPro
npm install
cp .env.example .env
```

## Subindo o ambiente

### Com Docker (recomendado)

```bash
docker compose up -d postgres redis
npm run banco:migrar
npm run dev:api      # http://localhost:3333
npm run dev:worker
npm run dev:painel   # http://localhost:5173
```

Para subir tudo em container, incluindo API, worker e painel:

```bash
docker compose up --build
```

### Sem credencial de plataforma

Para rodar o sistema inteiro sem app da Twitch ou do Kick, ative o modo simulado no `.env`:

```
PLATAFORMA_MODO_SIMULADO=true
```

Nesse modo qualquer nome de canal é aceito, a live aparece como ao vivo e o chat recebe
tráfego sintético com picos periódicos de reação. É o caminho para ver o pipeline
funcionando de ponta a ponta na primeira execução.

## Variáveis de ambiente

| Variável | Para que serve | Obrigatória |
|---|---|---|
| `DATABASE_URL` | Conexão Postgres (Supabase ou local) | sim |
| `REDIS_URL` | Fila BullMQ | sim |
| `API_PORTA` | Porta da API (padrão 3333) | não |
| `PAINEL_ORIGEM_PERMITIDA` | Origens liberadas no CORS | não |
| `SUPABASE_URL` | Projeto Supabase | se usar storage/auth Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de servidor, só no backend | se usar storage Supabase |
| `SUPABASE_JWT_SECRET` | Validação do token do painel | **sim em produção** |
| `ARMAZENAMENTO_PROVEDOR` | `local` ou `supabase` | não |
| `PLATAFORMA_MODO_SIMULADO` | Ignora as plataformas reais | não |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` | App da Twitch | para usar Twitch |
| `KICK_CLIENT_ID` / `KICK_CLIENT_SECRET` | App do Kick | para usar Kick |
| `FFMPEG_CAMINHO` | Binário do FFmpeg | a partir da Fase 2 |

Nenhum segredo fica no repositório. O `.env` está no `.gitignore` e o `.env.example`
tem apenas nomes e placeholders.

Se `SUPABASE_JWT_SECRET` estiver vazio em desenvolvimento, a API aceita requisições sem token
e usa um usuário fixo local. **Em produção isso é recusado na inicialização**, com erro explícito.

## Banco de dados

O Prisma aponta para PostgreSQL. Como o Supabase é Postgres, a mesma migration serve
para o banco local do Docker e para o projeto Supabase — muda só a connection string.

```bash
npm run banco:gerar     # gera o Prisma Client
npm run banco:migrar    # aplica as migrations
npm run banco:estudio   # abre o Prisma Studio
```

A migration inicial está versionada em
`packages/banco/prisma/migrations/20260922000000_estrutura_inicial/migration.sql`.

Para apontar para o Supabase, troque `DATABASE_URL` e `DIRECT_URL` pelas strings do projeto
(use a porta 6543 com pooler para `DATABASE_URL` e a 5432 direta para `DIRECT_URL`)
e rode `npm run banco:migrar`.

## Verificando que funciona

```bash
npm run teste -w @cutpro/dominio
```

41 testes cobrindo normalização de chat, classificação de reação, detecção de pico,
agrupamento, janela de corte e ClipScore.

Para ver o funil de detecção sobre uma live simulada de 4 horas:

```bash
npm run demonstrar -w @cutpro/worker
```

```
Mensagens de chat processadas : 154.034
Buckets de 10s agregados      : 1.440
Picos de reacao detectados    : 68
Candidatos apos agrupamento   : 10
```

## Como o sistema escolhe um momento

O chat é normalizado antes de qualquer comparação: acentos removidos, repetições colapsadas,
emojis extraídos. Assim `kkkkkkkkkk`, `KKKK`, `kakakaka`, `huehuehue` e `rsrsrs` caem todos
na categoria Humor sem nenhuma busca literal, e a intensidade original vira peso no score.

Cada bucket de 10 segundos é comparado com a mediana dos 10 minutos anteriores.
O score combina **volume** (o quanto o chat acelerou) e **densidade de reação**
(quanto do excedente é reação, e não conversa normal).

Um surto de mensagens neutras — raid, spam de comando — não gera corte, por construção.

Detalhes das fórmulas e dos pesos em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Configuração por canal

Cada canal tem a própria configuração, editável na tela Configurações:
score mínimo, duração mínima e máxima, segundos antes e depois do pico,
máximo de cortes por live, template vertical, legendas e modo de processamento
(`ECONOMICO`, `BALANCEADO`, `QUALIDADE_MAXIMA`).

## Plataformas

**Twitch** funciona por completo com um app registrado em dev.twitch.tv.
O chat usa login anônimo via IRC e não precisa de token.

**Kick** tem limitação real de plataforma no chat em tempo real e no acesso via Cloudflare.
Leia [docs/LIMITACOES.md](docs/LIMITACOES.md) antes de colocar Kick em produção.

**TikTok** exige app aprovado em review. A abstração existe; a implementação é da Fase 4.

## Troubleshooting

**`Sem conexão com o Redis, as filas ficam indisponíveis`**
O Redis não está no ar. A API continua respondendo leitura, mas nada é enfileirado.
Rode `docker compose up -d redis`.

**`Variáveis de ambiente inválidas ou ausentes: DATABASE_URL`**
Falta o `.env`. Rode `cp .env.example .env`.

**Cadastro de canal Kick falha com 403**
Cloudflare bloqueando o endpoint de sala de chat. Veja `docs/LIMITACOES.md`.

**Canal não é detectado ao vivo**
Confira se `monitoramentoAtivo` está ligado no canal, se o worker está rodando e se
as credenciais da plataforma estão preenchidas. Em desenvolvimento, use
`PLATAFORMA_MODO_SIMULADO=true`.

**Cortes não são criados mesmo com momentos detectados**
`geracaoAutomaticaAtiva` precisa estar ligado no canal. Sem isso o sistema registra
o momento mas não cria o corte.

## Documentação

- [docs/ARQUITETURA.md](docs/ARQUITETURA.md) — decisões, modelo de dados, fluxo, escala
- [docs/LIMITACOES.md](docs/LIMITACOES.md) — o que as plataformas não permitem
- [CLAUDE.md](CLAUDE.md) — regras de código do projeto
- [CODE_REVIEW.md](CODE_REVIEW.md) — protocolo de review antes do merge na main
