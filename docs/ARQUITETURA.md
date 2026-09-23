# Arquitetura do CutPro

## 1. Visão geral

O CutPro é um monorepo npm workspaces dividido em três processos executáveis e seis pacotes compartilhados.

```
Painel (React/Vite)
      │  HTTP/JSON
      ▼
API (Fastify)  ──enfileira──►  Redis / BullMQ  ──consome──►  Worker
      │                                                         │
      └───────────────┬─────────────────────────────────────────┘
                      ▼
              PostgreSQL (Supabase)
              Storage (Supabase / local)
```

A API nunca executa trabalho pesado. Ela lê e escreve no banco, valida entrada e enfileira jobs.
Todo processamento de longa duração (chat, análise, FFmpeg, transcrição, publicação) vive no worker.

## 2. Por que Fastify e não NestJS

O monorepo é ESM puro e roda em desenvolvimento com `tsx`, que usa esbuild.
O esbuild não emite `emitDecoratorMetadata`, e a injeção de dependência do NestJS depende
desses metadados para resolver construtores por tipo.

Manter o NestJS exigiria voltar API e worker para CommonJS com compilação via `tsc`,
criando duas convenções de módulo no mesmo repositório.

Fastify entrega o mesmo resultado com as camadas explícitas (`rotas` → `serviço` → `repositório`),
sem o custo de configuração. A separação de responsabilidades é obtida por estrutura de pastas
e injeção manual no construtor, que é testável do mesmo jeito.

## 3. Estrutura de pastas

```
CutPro/
├── apps/
│   ├── api/                 Fastify: rotas, serviços, repositórios, autenticação
│   ├── worker/              BullMQ: jobs, coletor de chat, análise de momentos
│   └── painel/              React + Vite + Tailwind
├── packages/
│   ├── dominio/             Regras puras: normalização, scoring, picos, janela. Sem I/O.
│   ├── contratos/           DTOs, validação zod, nomes de fila e payloads dos jobs
│   ├── banco/               Prisma schema, migrations e cliente
│   ├── integracoes/         Twitch, Kick, simulado, armazenamento
│   ├── filas/               Conexão Redis e produtor BullMQ
│   ├── configuracao/        Leitura e validação das variáveis de ambiente
│   └── nucleo/              Contexto de aplicação e log estruturado
├── docker/                  Dockerfile compartilhado (Node + FFmpeg)
└── docs/                    Arquitetura e limitações de plataforma
```

A regra central: **`packages/dominio` não conhece banco, rede nem framework.**
É por isso que a detecção de momentos é testável sem subir infraestrutura.

## 4. Modelo de dados

| Tabela | Papel |
|---|---|
| `canais` | Canal cadastrado, flags de automação e `configuracao` em JSON validado por zod |
| `lives` | Uma transmissão. Única por `(plataforma, identificadorExterno)` — é o que dá idempotência |
| `mensagens_chat` | Mensagem bruta com categoria e score de reação já calculados na ingestão |
| `buckets_chat` | Agregado de 10 segundos. **É o que a análise lê**, não as mensagens brutas |
| `amostras_audiencia` | Série de espectadores, para o sinal `ViewerSpikeScore` |
| `momentos_detectados` | Candidato a corte com os scores por sinal. Único por `(liveId, instantePicoSegundos)` |
| `cortes` | O vídeo em si, com máquina de estados e caminhos dos arquivos |
| `transcricoes` | Texto e timestamps por palavra |
| `publicacoes` | Uma linha por destino (TikTok, Reels, Shorts) |
| `eventos_pipeline` | Trilha estruturada do processamento, por live e por corte |

### A decisão que sustenta a escala

Uma live de 4 horas em canal grande gera mais de 150 mil mensagens.
Reler isso a cada ciclo de análise (a cada 60s) seria inviável.

Por isso a ingestão **agrega em `buckets_chat` no momento da escrita**, com `INSERT ... ON CONFLICT DO UPDATE`
somando os contadores. A análise lê 1.440 buckets em vez de 150 mil linhas — três ordens de grandeza a menos.
O `ON CONFLICT` também resolve concorrência: dois workers gravando o mesmo bucket somam, não sobrescrevem.

As mensagens brutas continuam gravadas para auditoria e para reprocessar com regras novas.

## 5. Fluxo de processamento

```
DetectarLivesJob (a cada 60s)
   └─ canal ao vivo? → upsert da live → garante coleta de chat → agenda análise
        │
        ▼
ColetorChat (conexão viva no worker)
   └─ classifica cada mensagem na chegada → buffer → descarrega a cada 5s
        └─ grava mensagens + soma buckets + atualiza contadores da live
              │
              ▼
AnalisarMomentosJob (a cada 60s por live)
   └─ lê buckets → baseline móvel → detecta picos → agrupa → deduplica
        └─ calcula janela e ClipScore → grava momento
              └─ se geração automática: cria corte e enfileira processamento
                    │
                    ▼
        [Fase 2] ProcessarCorte → Transcrever → Legenda → Renderizar → Pronto
                    │
                    ▼
        [Fase 4] Aprovar → Publicar → TikTok
```

## 6. Estratégia de identificação dos melhores momentos

### Sinais, do mais barato ao mais caro

| Sinal | Custo | Fase | Peso padrão |
|---|---|---|---|
| Chat (volume + reação) | quase zero | 1 | 0,35 |
| Espectadores | baixo | 1 | 0,10 |
| Áudio (volume, grito, risada) | médio | 3 | 0,20 |
| Transcrição (o que foi dito) | alto | 2 | 0,25 |
| Visual (corte de cena) | muito alto | 3 | 0,10 |

O `ClipScore` **renormaliza os pesos sobre os sinais realmente disponíveis**.
Na Fase 1, com só o chat, o peso efetivo do chat é 1,0 — não 0,35. Sem isso, nenhum
candidato passaria do limiar enquanto os outros sinais não existem.

### Normalização do chat

Não há busca literal. Toda mensagem passa por:

1. corte em 500 caracteres;
2. minúsculas e remoção de acentos (NFD);
3. colapso de repetições: qualquer caractere repetido vira no máximo 3;
4. tokenização por letras e números;
5. extração de emojis do texto original.

Assim `kkkkkkkkkk`, `KKKK` e `kkk` viram o mesmo token, e `kakakaka` / `huehuehue` / `rsrsrs`
são reconhecidos por padrão, não por lista. A intensidade original (quantos `k` de fato)
é medida **antes** do colapso e vira multiplicador do score: `kkkkkkkkkkkk` pontua mais que `kk`.

A classificação usa três camadas, na ordem de custo: mapa de token exato (O(1)),
regex só para os padrões que precisam (risada, `w+`, `gol`), e regex de frase sobre o texto inteiro
(`nao acredito`, `meu deus`, `como assim`).

### ChatReactionScore

```
razaoVolume   = mensagensNoBucket / baselineMovel
scoreVolume   = 1 - e^(-0,28 × (razaoVolume - 1))
densidade     = somaScoreReacao / mensagensExcedentes
ChatScore     = 0,70 × scoreVolume + 0,30 × densidade
```

O `baselineMovel` é a **mediana** dos 60 buckets anteriores (10 minutos), não a média:
mediana não é distorcida pelos próprios picos anteriores.

O detalhe que mais importa está na densidade: ela divide pelas **mensagens excedentes**
(`total - baseline`), não pelo total. Em canal grande a conversa normal continua rolando
durante o pico; dividir pelo total diluiria a reação e um momento legítimo nunca cruzaria o limiar.
Perguntamos "do que esse momento gerou a mais, quanto é reação".

Efeito colateral desejado: um surto de mensagens **neutras** (raid, spam de comando, bot)
fica com densidade perto de zero e trava em 0,70 — abaixo do limiar padrão de 0,75.
Volume sozinho não vira corte. Há teste de regressão para isso.

### Deduplicação

Picos a menos de 45 segundos um do outro são o mesmo acontecimento e viram um único momento,
cujo instante é o do pico de maior score. Momentos a menos de 60 segundos de um já gravado
são descartados, o que torna a análise segura para rodar a cada minuto sobre a mesma live.

## 7. Controle de custo

O funil, medido em uma live simulada de 4 horas (`npm run demonstrar -w @cutpro/worker`):

```
154.034 mensagens  →  1.440 buckets  →  68 picos  →  10 candidatos
```

Só os candidatos que passam do limiar chegam à IA e ao FFmpeg.
O modo de processamento (`ECONOMICO`, `BALANCEADO`, `QUALIDADE_MAXIMA`) ajusta
quantos candidatos são analisados, com que frequência e com qual qualidade de render.

## 8. Escala horizontal

- A API é stateless: pode ter N réplicas atrás de um load balancer.
- O worker pode ter N réplicas; BullMQ distribui os jobs.
- `DetectarLivesJob` usa `jobId` fixo de repetição, então só uma instância executa por ciclo.
- `AnalisarMomentosJob` usa `jobId` com janela de minuto, evitando análise duplicada da mesma live.
- A restrição real é a **conexão de chat**: ela vive no processo que abriu o socket.
  Para centenas de canais, o próximo passo é particionar canais por worker
  (hash do `canalId` pelo número de réplicas) ou mover a coleta para um serviço dedicado.
  A interface `ServicoPlataformaStreaming` já isola isso.

## 9. Integrações externas

| Serviço | Uso | Credencial |
|---|---|---|
| Twitch Helix | canal, live, VOD | `TWITCH_CLIENT_ID` + `TWITCH_CLIENT_SECRET` |
| Twitch IRC | chat em tempo real | nenhuma (login anônimo) |
| Kick API pública | canal e status da live | `KICK_CLIENT_ID` + `KICK_CLIENT_SECRET` |
| Kick chat | mensagens em tempo real | ver `LIMITACOES.md` |
| Supabase | banco, storage, auth | `SUPABASE_*` |
| TikTok | publicação | `TIKTOK_*` (Fase 4, exige aprovação) |

Toda plataforma entra pela interface `ServicoPlataformaStreaming`.
Nenhuma regra específica de Twitch ou Kick vaza para o domínio.
A `PlataformaSimulada` implementa a mesma interface e permite rodar o sistema inteiro sem credencial.
