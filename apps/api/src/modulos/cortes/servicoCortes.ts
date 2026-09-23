import { StatusCorte } from '@cutpro/banco';
import { NomeFila, NomeJob, type AtualizarCorteDto, type ListarCortesDto } from '@cutpro/contratos';
import { podeTransicionarCorte } from '@cutpro/dominio';
import type { ProdutorFilas } from '@cutpro/filas';
import type { ServicoArmazenamentoArquivo } from '@cutpro/integracoes';
import { erroConflito, erroNaoEncontrado, erroRequisicaoInvalida } from '../../infra/erros.js';
import type { CorteDetalhado, RepositorioCortes } from './repositorioCortes.js';

export function montarRespostaCorte(corte: CorteDetalhado, urlVideo: string | null, urlMiniatura: string | null) {
  return {
    id: corte.id,
    liveId: corte.liveId,
    canalId: corte.live.canal.id,
    canalNome: corte.live.canal.nomeExibicao ?? corte.live.canal.nome,
    canalAvatar: corte.live.canal.urlAvatar,
    plataforma: corte.live.plataforma,
    titulo: corte.titulo,
    descricao: corte.descricao,
    hashtags: corte.hashtags,
    inicioSegundos: corte.inicioSegundos,
    fimSegundos: corte.fimSegundos,
    duracaoSegundos: corte.duracaoSegundos,
    template: corte.template,
    clipScore: Number(corte.clipScore),
    status: corte.status,
    mensagemErro: corte.mensagemErro,
    motivos: corte.momento.motivos,
    categoriaDominante: corte.momento.categoriaDominante,
    mensagensPorMinuto: corte.momento.mensagensPorMinuto,
    urlVideo,
    urlMiniatura,
    publicacoes: corte.publicacoes.map((publicacao) => ({
      id: publicacao.id,
      plataforma: publicacao.plataforma,
      status: publicacao.status,
      url: publicacao.url,
      dataPublicacao: publicacao.dataPublicacao?.toISOString() ?? null,
    })),
    dataCriacao: corte.dataCriacao.toISOString(),
  };
}

export class ServicoCortes {
  constructor(
    private readonly repositorio: RepositorioCortes,
    private readonly armazenamento: ServicoArmazenamentoArquivo,
    private readonly filas: ProdutorFilas,
  ) {}

  private async resolverUrl(caminho: string | null): Promise<string | null> {
    if (!caminho) return null;

    return this.armazenamento.obterUrl(caminho);
  }

  private async responder(corte: CorteDetalhado) {
    const [urlVideo, urlMiniatura] = await Promise.all([
      this.resolverUrl(corte.caminhoArquivo),
      this.resolverUrl(corte.caminhoMiniatura),
    ]);

    return montarRespostaCorte(corte, urlVideo, urlMiniatura);
  }

  async listar(filtro: ListarCortesDto) {
    const { itens, total } = await this.repositorio.listar(filtro);
    const cortes = await Promise.all(itens.map((corte) => this.responder(corte)));

    return { itens: cortes, total, pagina: filtro.pagina, tamanhoPagina: filtro.tamanhoPagina };
  }

  private async obterCorteOuFalhar(id: string): Promise<CorteDetalhado> {
    const corte = await this.repositorio.obterPorId(id);
    if (!corte) throw erroNaoEncontrado('Corte não encontrado');

    return corte;
  }

  async obter(id: string) {
    return this.responder(await this.obterCorteOuFalhar(id));
  }

  private async transicionar(id: string, proximo: StatusCorte) {
    const corte = await this.obterCorteOuFalhar(id);
    if (!podeTransicionarCorte(corte.status, proximo)) {
      throw erroConflito(`Não é possível mudar o corte de ${corte.status} para ${proximo}`);
    }

    return this.repositorio.atualizar(id, { status: proximo });
  }

  async aprovar(id: string) {
    return this.responder(await this.transicionar(id, StatusCorte.APROVADO));
  }

  async rejeitar(id: string) {
    return this.responder(await this.transicionar(id, StatusCorte.REJEITADO));
  }

  async regenerar(id: string) {
    const corte = await this.transicionar(id, StatusCorte.AGUARDANDO_PROCESSAMENTO);
    await this.filas.enfileirar({
      fila: NomeFila.PROCESSAMENTO_VIDEO,
      job: NomeJob.PROCESSAR_CORTE,
      dados: { corteId: id },
      opcoes: { jobId: `${NomeJob.PROCESSAR_CORTE}:${id}:${corte.tentativas}` },
    });

    return this.responder(corte);
  }

  async atualizar(id: string, dto: AtualizarCorteDto) {
    const corte = await this.obterCorteOuFalhar(id);
    const inicioSegundos = dto.inicioSegundos ?? corte.inicioSegundos;
    const fimSegundos = dto.fimSegundos ?? corte.fimSegundos;
    if (fimSegundos <= inicioSegundos) throw erroRequisicaoInvalida('O fim do corte precisa ser maior que o início');

    const atualizado = await this.repositorio.atualizar(id, {
      titulo: dto.titulo,
      descricao: dto.descricao,
      hashtags: dto.hashtags,
      template: dto.template,
      inicioSegundos,
      fimSegundos,
      duracaoSegundos: fimSegundos - inicioSegundos,
    });

    return this.responder(atualizado);
  }
}
