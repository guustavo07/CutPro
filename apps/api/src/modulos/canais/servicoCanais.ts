import type { Canal } from '@cutpro/banco';
import {
  CONFIGURACAO_CANAL_PADRAO,
  interpretarConfiguracaoCanal,
  type AtualizarCanalDto,
  type CriarCanalDto,
} from '@cutpro/contratos';
import { ErroPlataforma, type FabricaPlataformas } from '@cutpro/integracoes';
import { erroConflito, erroDependenciaExterna, erroNaoEncontrado, erroRequisicaoInvalida } from '../../infra/erros.js';
import type { RepositorioCanais } from './repositorioCanais.js';

export type CanalResposta = ReturnType<typeof montarRespostaCanal>;

export function montarRespostaCanal(canal: Canal) {
  return {
    id: canal.id,
    nome: canal.nome,
    nomeExibicao: canal.nomeExibicao ?? canal.nome,
    plataforma: canal.plataforma,
    identificadorExterno: canal.identificadorExterno,
    url: canal.url,
    urlAvatar: canal.urlAvatar,
    ativo: canal.ativo,
    monitoramentoAtivo: canal.monitoramentoAtivo,
    geracaoAutomaticaAtiva: canal.geracaoAutomaticaAtiva,
    publicacaoAutomaticaAtiva: canal.publicacaoAutomaticaAtiva,
    modoProcessamento: canal.modoProcessamento,
    configuracao: interpretarConfiguracaoCanal(canal.configuracao),
    dataCriacao: canal.dataCriacao.toISOString(),
  };
}

export class ServicoCanais {
  constructor(
    private readonly repositorio: RepositorioCanais,
    private readonly plataformas: FabricaPlataformas,
  ) {}

  async listar(): Promise<CanalResposta[]> {
    const canais = await this.repositorio.listar();
    return canais.map(montarRespostaCanal);
  }

  async obter(id: string): Promise<CanalResposta> {
    return montarRespostaCanal(await this.obterCanalOuFalhar(id));
  }

  private async obterCanalOuFalhar(id: string): Promise<Canal> {
    const canal = await this.repositorio.obterPorId(id);
    if (!canal) throw erroNaoEncontrado('Canal não encontrado');

    return canal;
  }

  async criar(dto: CriarCanalDto): Promise<CanalResposta> {
    const canalExterno = await this.consultarCanalExterno(dto);
    const duplicado = await this.repositorio.obterPorIdentificador({
      plataforma: dto.plataforma,
      identificadorExterno: canalExterno.identificadorExterno,
    });
    if (duplicado) throw erroConflito('Este canal já está cadastrado');

    const criado = await this.repositorio.criar({
      nome: canalExterno.nome,
      nomeExibicao: canalExterno.nomeExibicao,
      plataforma: dto.plataforma,
      identificadorExterno: canalExterno.identificadorExterno,
      url: canalExterno.url,
      urlAvatar: canalExterno.urlAvatar,
      monitoramentoAtivo: dto.monitoramentoAtivo,
      geracaoAutomaticaAtiva: dto.geracaoAutomaticaAtiva,
      publicacaoAutomaticaAtiva: dto.publicacaoAutomaticaAtiva,
      configuracao: dto.configuracao ?? CONFIGURACAO_CANAL_PADRAO,
    });

    return montarRespostaCanal(criado);
  }

  private async consultarCanalExterno(dto: CriarCanalDto) {
    try {
      const canal = await this.plataformas.obter(dto.plataforma).buscarCanal(dto.identificador);
      if (!canal) throw erroRequisicaoInvalida(`Canal ${dto.identificador} não encontrado na ${dto.plataforma}`);

      return canal;
    } catch (erro) {
      if (erro instanceof ErroPlataforma) throw erroDependenciaExterna(erro.message);
      throw erro;
    }
  }

  async atualizar(id: string, dto: AtualizarCanalDto): Promise<CanalResposta> {
    await this.obterCanalOuFalhar(id);
    const atualizado = await this.repositorio.atualizar(id, {
      ativo: dto.ativo,
      monitoramentoAtivo: dto.monitoramentoAtivo,
      geracaoAutomaticaAtiva: dto.geracaoAutomaticaAtiva,
      publicacaoAutomaticaAtiva: dto.publicacaoAutomaticaAtiva,
      configuracao: dto.configuracao,
      modoProcessamento: dto.configuracao?.modoProcessamento,
    });

    return montarRespostaCanal(atualizado);
  }

  async remover(id: string): Promise<void> {
    await this.obterCanalOuFalhar(id);
    await this.repositorio.remover(id);
  }
}
