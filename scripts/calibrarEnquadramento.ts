import { carregarAmbiente, resolverAPartirDaRaiz } from '@cutpro/configuracao';
import { REGIAO_WEBCAM_PADRAO, DESLOCAMENTO_GAMEPLAY_PADRAO } from '@cutpro/dominio';
import { ServicoVideoFfmpeg, TemplateEnquadramento } from '@cutpro/integracoes';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

const PASTA_SAIDA = 'calibracao';
const PASSO_GRADE = 10;
const INSTANTE_PADRAO = 2;
const CODIGO_SAIDA_SUCESSO = 0;
const COR_GRADE_FINA = 'white@0.35';
const COR_GRADE_GROSSA = 'yellow@0.8';
const ESPESSURA_FINA = 1;
const ESPESSURA_GROSSA = 3;
const PARTES_ESPERADAS_REGIAO = 4;

type Argumentos = {
  readonly caminhoVideo: string;
  readonly instanteSegundos: number;
  readonly regiao?: { x: number; y: number; largura: number; altura: number };
  readonly deslocamentoGameplay: number;
};

function interpretarArgumentos(): Argumentos {
  const [caminhoVideo, regiaoBruta, deslocamentoBruto, instanteBruto] = process.argv.slice(2);
  if (!caminhoVideo) {
    throw new Error(
      'uso: npm run calibrar -- <video> [x,y,largura,altura] [deslocamentoGameplay] [instanteSegundos]',
    );
  }

  const partes = regiaoBruta?.split(',').map(Number) ?? [];
  const regiao =
    partes.length === PARTES_ESPERADAS_REGIAO && partes.every(Number.isFinite)
      ? { x: partes[0]!, y: partes[1]!, largura: partes[2]!, altura: partes[3]! }
      : undefined;

  return {
    caminhoVideo,
    regiao,
    deslocamentoGameplay: Number(deslocamentoBruto ?? DESLOCAMENTO_GAMEPLAY_PADRAO),
    instanteSegundos: Number(instanteBruto ?? INSTANTE_PADRAO),
  };
}

function montarFiltroGrade(): string {
  const fina = `drawgrid=w=iw/${PASSO_GRADE * 2}:h=ih/${PASSO_GRADE * 2}:t=${ESPESSURA_FINA}:c=${COR_GRADE_FINA}`;
  const grossa = `drawgrid=w=iw/${PASSO_GRADE}:h=ih/${PASSO_GRADE}:t=${ESPESSURA_GROSSA}:c=${COR_GRADE_GROSSA}`;

  return `${fina},${grossa}`;
}

function executar(comando: string, argumentos: readonly string[]): Promise<void> {
  return new Promise((resolver, rejeitar) => {
    const processo = spawn(comando, [...argumentos], { windowsHide: true });
    let saidaErro = '';
    processo.stderr.on('data', (parte) => (saidaErro += parte.toString()));
    processo.on('error', (erro) => rejeitar(erro));
    processo.on('close', (codigo) =>
      codigo === CODIGO_SAIDA_SUCESSO ? resolver() : rejeitar(new Error(saidaErro.slice(0, 400))),
    );
  });
}

const argumentos = interpretarArgumentos();
const ambiente = carregarAmbiente();
const pasta = resolverAPartirDaRaiz(PASTA_SAIDA);
await mkdir(pasta, { recursive: true });

const nome = basename(argumentos.caminhoVideo).replace(/\.[^.]+$/, '');
const caminhoGrade = join(pasta, `${nome}-grade.jpg`);

await executar(ambiente.FFMPEG_CAMINHO, [
  '-hide_banner',
  '-loglevel',
  'error',
  '-y',
  '-ss',
  String(argumentos.instanteSegundos),
  '-i',
  argumentos.caminhoVideo,
  '-frames:v',
  '1',
  '-vf',
  montarFiltroGrade(),
  '-q:v',
  '2',
  caminhoGrade,
]);

process.stdout.write(`grade salva em ${caminhoGrade}\n`);
process.stdout.write(`cada celula amarela vale ${PASSO_GRADE}% do quadro\n`);

if (!argumentos.regiao) {
  const padrao = REGIAO_WEBCAM_PADRAO;
  process.stdout.write(
    `\nabra a grade, leia onde a webcam comeca e termina, e rode de novo passando a regiao:\n` +
      `  npm run calibrar -- "${argumentos.caminhoVideo}" ${padrao.x},${padrao.y},${padrao.largura},${padrao.altura}\n`,
  );
  process.exit(0);
}

const video = new ServicoVideoFfmpeg({
  caminhoFfmpeg: ambiente.FFMPEG_CAMINHO,
  caminhoFfprobe: ambiente.FFPROBE_CAMINHO,
});
const caminhoPreview = join(pasta, `${nome}-previa.jpg`);
const caminhoVertical = join(pasta, `${nome}-previa.mp4`);

await video.enquadrarVertical({
  caminhoOrigem: argumentos.caminhoVideo,
  caminhoDestino: caminhoVertical,
  template: TemplateEnquadramento.WEBCAM_DESTAQUE,
  regiaoWebcam: argumentos.regiao,
  deslocamentoGameplay: argumentos.deslocamentoGameplay,
  caminhoMarca: resolverAPartirDaRaiz('ativos/marca.png'),
});
await video.gerarMiniatura({
  caminhoOrigem: caminhoVertical,
  caminhoDestino: caminhoPreview,
  instanteSegundos: argumentos.instanteSegundos,
});

const regiao = argumentos.regiao;
process.stdout.write(`\npreview salvo em ${caminhoPreview}\n`);
process.stdout.write(
  `\nse ficou bom, cole na configuracao do canal:\n` +
    `  regiaoWebcam: { x: ${regiao.x}, y: ${regiao.y}, largura: ${regiao.largura}, altura: ${regiao.altura} }\n` +
    `  deslocamentoGameplay: ${argumentos.deslocamentoGameplay}\n`,
);
