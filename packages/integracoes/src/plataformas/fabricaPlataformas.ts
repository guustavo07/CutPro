import { Plataforma } from '@cutpro/dominio';
import { KickService } from './kick/kickService.js';
import { PlataformaSimulada } from './simulado/plataformaSimulada.js';
import type { ServicoPlataformaStreaming } from './tipos.js';
import { TwitchService } from './twitch/twitchService.js';

export type ConfiguracaoPlataformas = {
  readonly modoSimulado: boolean;
  readonly twitch: { readonly clientId: string; readonly clientSecret: string };
  readonly kick: { readonly clientId: string; readonly clientSecret: string; readonly chavePusher: string };
};

export class FabricaPlataformas {
  private readonly servicos: ReadonlyMap<Plataforma, ServicoPlataformaStreaming>;

  constructor(configuracao: ConfiguracaoPlataformas) {
    this.servicos = configuracao.modoSimulado
      ? FabricaPlataformas.montarSimulados()
      : FabricaPlataformas.montarReais(configuracao);
  }

  private static montarSimulados(): ReadonlyMap<Plataforma, ServicoPlataformaStreaming> {
    return new Map([
      [Plataforma.TWITCH, new PlataformaSimulada(Plataforma.TWITCH)],
      [Plataforma.KICK, new PlataformaSimulada(Plataforma.KICK)],
    ]);
  }

  private static montarReais(
    configuracao: ConfiguracaoPlataformas,
  ): ReadonlyMap<Plataforma, ServicoPlataformaStreaming> {
    return new Map<Plataforma, ServicoPlataformaStreaming>([
      [Plataforma.TWITCH, new TwitchService(configuracao.twitch)],
      [
        Plataforma.KICK,
        new KickService({ credenciais: configuracao.kick, chavePusher: configuracao.kick.chavePusher }),
      ],
    ]);
  }

  obter(plataforma: Plataforma): ServicoPlataformaStreaming {
    const servico = this.servicos.get(plataforma);
    if (!servico) throw new Error(`Plataforma não suportada: ${plataforma}`);

    return servico;
  }
}
