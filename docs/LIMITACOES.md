# Limitações técnicas das plataformas

Este documento registra o que **não** depende de código nosso. Nada aqui é contornável
com mais esforço de implementação: são restrições das plataformas.

## Twitch

### Funciona sem atrito

- **Helix API** (canal, live, VOD): precisa de `client_id` e `client_secret` de um app
  registrado em dev.twitch.tv. O fluxo usado é `client_credentials`, que não exige
  login de usuário nem aprovação de review.
- **Chat via IRC**: `wss://irc-ws.chat.twitch.tv:443` aceita login anônimo com nick
  `justinfan<número>`. Não exige token, não exige aprovação. É o caminho usado aqui.

### Restrições reais

- **Rate limit da Helix**: 800 pontos por minuto por app. Com um `GET /streams` por canal
  a cada 60 segundos, o teto prático é da ordem de centenas de canais por app.
  Acima disso é preciso usar EventSub (`stream.online` / `stream.offline`) em vez de polling.
  A interface já suporta essa troca sem mexer no domínio.
- **Download de VOD**: a Twitch **não** oferece endpoint oficial para baixar o arquivo do VOD.
  A Helix devolve a URL da página, não da mídia. Para recortar trecho de VOD é preciso
  resolver a playlist HLS, o que fica fora de contrato de API e pode quebrar sem aviso.
  Alternativa dentro das regras: capturar o stream ao vivo continuamente durante a live.
  Essa decisão está pendente para a Fase 2 — veja "Captura de vídeo" abaixo.
- **Clips API**: existe `POST /helix/clips`, mas cria clipe de 30s *na Twitch*, com corte
  controlado por ela. Não serve para gerar vertical com legenda própria.

## Kick

Esta é a plataforma com mais limitação real.

### API oficial

O Kick publicou uma API pública com OAuth 2.1 (`https://api.kick.com/public/v1`).
`KickApi.buscarCanalPorSlug` usa esse caminho, com token `client_credentials`
obtido em `https://id.kick.com/oauth/token`.

É preciso registrar um app no portal de desenvolvedor do Kick para obter as credenciais.
Sem elas, o cadastro de canal Kick falha com erro explícito — não silenciosamente.

### Chat em tempo real: o problema

O Kick **não oferece um socket público documentado** para consumir chat como espectador.
Existem dois caminhos, e ambos têm custo:

1. **Webhook oficial** (`chat.message.sent`): é o caminho suportado. Exige app aprovado,
   assinatura de evento e uma **URL pública HTTPS** para receber os POSTs.
   Não funciona em desenvolvimento local sem túnel (ngrok, Cloudflare Tunnel).

2. **Socket Pusher** (`wss://ws-us2.pusher.com/app/<chave>`, canal `chatrooms.<id>.v2`):
   é o que o site do Kick usa no navegador. Funciona hoje, mas **não é contrato público**:
   pode mudar ou ser fechado sem aviso, e não há suporte se quebrar.

O código implementa o caminho 2 (`ConexaoChatKick`), isolado em arquivo próprio,
porque é o único que funciona sem infraestrutura pública. A troca para webhook é
localizada: implementar `ConexaoChat` e trocar na `KickService`.

### Cloudflare

Descobrir o `chatroom.id` de um canal depende de `https://kick.com/api/v2/channels/<slug>`,
que fica atrás do Cloudflare. De datacenter (incluindo containers em nuvem) esse endpoint
costuma responder **403**. O código detecta o 403 e devolve erro explicando o motivo,
em vez de falhar de forma confusa.

Consequência prática: **o Kick pode funcionar na sua máquina e falhar em produção.**
Se isso acontecer, o caminho é o webhook oficial.

### VOD

`KickService.buscarVodMaisRecente` retorna `null` por ora: a API pública do Kick
não expõe VODs de forma estável.

## TikTok

- A **Content Posting API** exige app aprovado em review pelo TikTok. O review pede
  demonstração do fluxo e política de privacidade publicada.
- Enquanto o app não sai do modo sandbox, só contas explicitamente adicionadas
  como testers conseguem publicar.
- Publicação direta exige o escopo `video.publish`; sem aprovação, o máximo é
  `video.upload`, que deixa o vídeo como rascunho para o usuário confirmar no app.
- Há limite diário de posts por usuário, definido pela plataforma.

A abstração `ServicoPublicacaoVideo` existe para que Reels e Shorts entrem
sem tocar no resto. A implementação fica para a Fase 4.

## Captura de vídeo (decisão pendente da Fase 2)

Para gerar o arquivo do corte é preciso ter os bytes do vídeo. As opções:

| Estratégia | Custo | Risco |
|---|---|---|
| Gravar a live inteira enquanto acontece | disco alto (~2 GB/hora por canal) | baixo |
| Buffer circular dos últimos N minutos | disco baixo | perde momento antigo |
| Baixar trecho do VOD depois | disco baixo | sem contrato de API; Kick não tem VOD |

A recomendação é **buffer circular** de 10 a 15 minutos por canal monitorado:
cobre a janela de corte com folga, mantém o disco previsível e não depende de VOD.
Como a janela padrão é de 60 segundos, 15 minutos dão margem larga para o worker
processar mesmo sob fila.

## FFmpeg

Não é biblioteca, é binário externo. Precisa estar no `PATH` ou apontado por `FFMPEG_CAMINHO`.
A imagem em `docker/node.Dockerfile` já instala `ffmpeg` e `fonts-dejavu-core`
(a fonte é necessária para renderizar legenda ASS/SSA).
