# Protocolo de preparo do corte

Cada streamer monta a tela do seu jeito: a webcam pode estar em qualquer canto, com qualquer
tamanho, e sobreposições como minimapa e placar ocupam posições diferentes. Sem calibrar,
o corte vertical sai com pedaço de webcam no lugar errado ou com a ação fora do quadro.

Este documento define o procedimento. Rode ele **uma vez por canal**, e de novo sempre que o
streamer mudar o layout da transmissão.

## Quando aplicar

| Situação | Precisa calibrar? |
|---|---|
| Canal novo cadastrado | sim |
| Streamer mudou a posição ou o tamanho da webcam | sim |
| Streamer trocou de jogo, mesmo layout | não |
| Template do canal mudou para `WEBCAM_DESTAQUE` | sim |
| Template é `VERTICAL_PADRAO`, `TELA_CHEIA` ou `GAMEPLAY_CENTRAL` | não se aplica |

## Passo 1 — obter um quadro da transmissão

A calibração precisa de um quadro real, com o layout que o streamer usa de fato. A captura já
guarda segmentos em `captura/<liveId>/`, então use um deles enquanto o canal estiver ao vivo:

```bash
ls captura/<liveId>/
```

Escolha um segmento de um momento com gameplay normal — não use tela de "voltamos já",
intervalo ou menu, porque o layout costuma ser diferente ali.

## Passo 2 — gerar a grade de referência

```bash
npm run calibrar -- "captura/<liveId>/<segmento>.ts"
```

Isso grava `calibracao/<segmento>-grade.jpg`: o quadro com uma grade sobreposta, onde **cada
célula amarela vale 10% do quadro** e as linhas finas marcam 5%.

## Passo 3 — ler a região da webcam

Abra a imagem e leia quatro números, todos como fração de 0 a 1:

- **x** — onde a caixa da webcam começa na horizontal
- **y** — onde começa na vertical
- **largura** — quanto ela ocupa na horizontal
- **altura** — quanto ocupa na vertical

Conte as células e arredonde para o meio por cento mais próximo. Precisão de casa decimal não
muda o resultado visível; errar uma célula inteira, sim.

Prefira recortar **um pouco por dentro** da borda da webcam. Sobra de moldura aparece no corte;
um ou dois por cento a menos de imagem, não.

## Passo 4 — conferir com prévia

```bash
npm run calibrar -- "captura/<liveId>/<segmento>.ts" 0,0,0.3,0.31
```

Gera `calibracao/<segmento>-previa.jpg` já no formato final: webcam na faixa de cima, gameplay
embaixo, marca aplicada. É esse arquivo que você julga, não a grade.

## Passo 5 — ajustar o deslocamento da gameplay

A faixa de baixo recorta uma fatia vertical do quadro 16:9. Se a webcam estiver na lateral, essa
fatia pode alcançá-la e **sobra um pedaço da webcam no canto da gameplay**.

O quarto argumento controla onde a fatia é tirada, de 0 (extrema esquerda) a 1 (extrema direita):

```bash
npm run calibrar -- "<segmento>.ts" 0,0,0.3,0.31 0.72
```

O padrão é `0.72`, calibrado para liberar uma webcam no canto superior esquerdo com folga.

Existe um compromisso real aqui, e ele não tem resposta automática:

- valor **baixo demais** deixa aparecer a webcam original na gameplay
- valor **alto demais** empurra a ação para fora do centro e destaca minimapa e placar

Ajuste até que nenhum dos dois aconteça. Se o streamer tiver a webcam à direita, o movimento é
o inverso: valores baixos é que limpam o quadro.

## Passo 6 — gravar na configuração do canal

Com os números aprovados, salve na configuração do canal:

```
regiaoWebcam: { x: 0, y: 0, largura: 0.3, altura: 0.31 }
deslocamentoGameplay: 0.72
template: WEBCAM_DESTAQUE
```

A partir daí todo corte daquele canal sai enquadrado sozinho, sem repetir o procedimento.

## Passo 7 — validar em corte real

Calibração boa em quadro parado pode falhar em movimento. Aprove um corte de verdade e confira:

- a webcam ocupa a faixa de cima inteira, sem barra preta e sem esticar o rosto
- não sobrou pedaço da webcam original dentro da gameplay
- a ação principal está visível na faixa de baixo
- a marca está no canto superior direito, legível e sem cobrir informação útil
- o momento engraçado acontece **dentro** da janela, não no começo nem no fim

O último item não é enquadramento: é sincronia. Se o momento estiver sempre no fim do corte,
aumente `CAPTURA_ATRASO_TRANSMISSAO_SEGUNDOS`; se estiver sempre no começo, diminua.

## Marca

A marca fica em `ativos/marca.png` e é aplicada automaticamente em todo enquadramento.
Para regerá-la depois de mexer no gerador:

```bash
npm run marca:gerar
```

Ela é desenhada por código em `scripts/gerarMarca.ts`, sem dependência externa, e sai em
512x512 com transparência. No vídeo entra a 13% da largura, no canto superior direito, com 85%
de opacidade — posição escolhida por ser a menos disputada pela interface do TikTok, que ocupa
a lateral direita inferior e a faixa de baixo.
