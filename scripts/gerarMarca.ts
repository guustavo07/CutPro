import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const LARGURA = 512;
const ALTURA = 512;
const CANAIS = 4;
const RAIO_CANTO = 116;
const MARGEM_INTERNA = 18;
const ROXO_TOPO = [124, 92, 255];
const ROXO_BASE = [167, 139, 250];
const BRANCO = [255, 255, 255];
const SOMBRA = [8, 6, 24];
const ANGULO_CORTE_GRAUS = -24;
const ESPESSURA_CORTE = 26;
const DESLOCAMENTO_METADE = 17;
const AMOSTRAS_POR_EIXO = 4;
const OPACIDADE_TOTAL = 255;
const GRAUS_PARA_RADIANOS = Math.PI / 180;

type Cor = readonly [number, number, number];

type Amostra = {
  readonly cor: Cor;
  readonly alfa: number;
};

const VAZIO: Amostra = { cor: [0, 0, 0], alfa: 0 };

function interpolar(inicio: Cor, fim: Cor, progresso: number): Cor {
  return [
    Math.round(inicio[0] + (fim[0] - inicio[0]) * progresso),
    Math.round(inicio[1] + (fim[1] - inicio[1]) * progresso),
    Math.round(inicio[2] + (fim[2] - inicio[2]) * progresso),
  ];
}

function dentroDoRetanguloArredondado(x: number, y: number, margem: number, raio: number): boolean {
  const esquerda = margem;
  const direita = LARGURA - margem;
  const topo = margem;
  const base = ALTURA - margem;
  if (x < esquerda || x > direita || y < topo || y > base) return false;

  const cantoX = Math.min(Math.max(x, esquerda + raio), direita - raio);
  const cantoY = Math.min(Math.max(y, topo + raio), base - raio);
  const distancia = Math.hypot(x - cantoX, y - cantoY);

  return distancia <= raio;
}

function rotacionar(x: number, y: number, anguloGraus: number): { x: number; y: number } {
  const angulo = anguloGraus * GRAUS_PARA_RADIANOS;
  const centroX = LARGURA / 2;
  const centroY = ALTURA / 2;
  const deslocadoX = x - centroX;
  const deslocadoY = y - centroY;

  return {
    x: deslocadoX * Math.cos(angulo) - deslocadoY * Math.sin(angulo) + centroX,
    y: deslocadoX * Math.sin(angulo) + deslocadoY * Math.cos(angulo) + centroY,
  };
}

function dentroDoTriangulo(x: number, y: number): boolean {
  const pontaX = 352;
  const inicioX = 186;
  const topoY = 150;
  const baseY = 362;
  if (x < inicioX || x > pontaX) return false;

  const progresso = (x - inicioX) / (pontaX - inicioX);
  const meiaAltura = ((baseY - topoY) / 2) * (1 - progresso);
  const centroY = (topoY + baseY) / 2;

  return Math.abs(y - centroY) <= meiaAltura;
}

function amostrarMarca(x: number, y: number): Amostra {
  if (!dentroDoRetanguloArredondado(x, y, MARGEM_INTERNA, RAIO_CANTO)) return VAZIO;

  const fundo = interpolar(ROXO_TOPO, ROXO_BASE, y / ALTURA);
  const girado = rotacionar(x, y, ANGULO_CORTE_GRAUS);
  const distanciaDoCorte = girado.y - ALTURA / 2;
  if (Math.abs(distanciaDoCorte) <= ESPESSURA_CORTE / 2) return { cor: fundo, alfa: OPACIDADE_TOTAL };

  const deslocamento = distanciaDoCorte > 0 ? DESLOCAMENTO_METADE : -DESLOCAMENTO_METADE;
  const alvo = rotacionar(girado.x - deslocamento, girado.y, -ANGULO_CORTE_GRAUS);
  if (dentroDoTriangulo(alvo.x, alvo.y)) return { cor: BRANCO, alfa: OPACIDADE_TOTAL };

  return { cor: fundo, alfa: OPACIDADE_TOTAL };
}

function amostrarComSuavizacao(x: number, y: number): Amostra {
  let somaVermelho = 0;
  let somaVerde = 0;
  let somaAzul = 0;
  let somaAlfa = 0;

  for (let sub = 0; sub < AMOSTRAS_POR_EIXO * AMOSTRAS_POR_EIXO; sub += 1) {
    const deslocX = ((sub % AMOSTRAS_POR_EIXO) + 0.5) / AMOSTRAS_POR_EIXO;
    const deslocY = (Math.floor(sub / AMOSTRAS_POR_EIXO) + 0.5) / AMOSTRAS_POR_EIXO;
    const amostra = amostrarMarca(x + deslocX, y + deslocY);
    somaVermelho += amostra.cor[0] * amostra.alfa;
    somaVerde += amostra.cor[1] * amostra.alfa;
    somaAzul += amostra.cor[2] * amostra.alfa;
    somaAlfa += amostra.alfa;
  }

  if (somaAlfa === 0) return VAZIO;
  const total = AMOSTRAS_POR_EIXO * AMOSTRAS_POR_EIXO;

  return {
    cor: [Math.round(somaVermelho / somaAlfa), Math.round(somaVerde / somaAlfa), Math.round(somaAzul / somaAlfa)],
    alfa: Math.round(somaAlfa / total),
  };
}

function montarPixels(): Buffer {
  const linhas = Buffer.alloc(ALTURA * (1 + LARGURA * CANAIS));

  for (let y = 0; y < ALTURA; y += 1) {
    const inicioLinha = y * (1 + LARGURA * CANAIS);
    linhas[inicioLinha] = 0;

    for (let x = 0; x < LARGURA; x += 1) {
      const amostra = amostrarComSuavizacao(x, y);
      const posicao = inicioLinha + 1 + x * CANAIS;
      linhas[posicao] = amostra.cor[0];
      linhas[posicao + 1] = amostra.cor[1];
      linhas[posicao + 2] = amostra.cor[2];
      linhas[posicao + 3] = amostra.alfa;
    }
  }

  return linhas;
}

const TABELA_CRC = Array.from({ length: 256 }, (_, indice) => {
  let valor = indice;
  for (let bit = 0; bit < 8; bit += 1) {
    valor = valor & 1 ? 0xedb88320 ^ (valor >>> 1) : valor >>> 1;
  }
  return valor >>> 0;
});

function calcularCrc(dados: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of dados) {
    crc = TABELA_CRC[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function montarBloco(tipo: string, conteudo: Buffer): Buffer {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(conteudo.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), conteudo]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(calcularCrc(corpo));

  return Buffer.concat([tamanho, corpo, crc]);
}

function montarPng(pixels: Buffer): Buffer {
  const assinatura = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const cabecalho = Buffer.alloc(13);
  cabecalho.writeUInt32BE(LARGURA, 0);
  cabecalho.writeUInt32BE(ALTURA, 4);
  cabecalho[8] = 8;
  cabecalho[9] = 6;

  return Buffer.concat([
    assinatura,
    montarBloco('IHDR', cabecalho),
    montarBloco('IDAT', deflateSync(pixels, { level: 9 })),
    montarBloco('IEND', Buffer.alloc(0)),
  ]);
}

const DESTINOS_PADRAO = ['ativos/marca.png', 'apps/painel/public/marca.png'];

const destinos = process.argv.length > 2 ? process.argv.slice(2) : DESTINOS_PADRAO;
const conteudo = montarPng(montarPixels());

for (const caminho of destinos) {
  const destino = resolve(caminho);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, conteudo);
  process.stdout.write(`marca gerada em ${destino}\n`);
}
