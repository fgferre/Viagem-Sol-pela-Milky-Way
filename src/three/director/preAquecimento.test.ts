// Serve: chão — o fim do filme (fase 'end') conta como filme para o
// segurador do roteiro, tanto quanto 'journey' conta (item 225)
// ============================================================
// A CODA NÃO É UM MODO DIFERENTE. `corpoPedidoPeloRoteiro` gate por
// fase antes de perguntar ao roteiro se o corpo já foi pedido — e até
// aqui só 'journey' passava a pergunta adiante. A legenda do
// encerramento ("pálido ponto azul") vive em 'end', e um corpo que o
// roteiro pediu não pode perder o segurador só porque o filme chegou
// ao fim de verdade — ver o cabeçalho do arquivo para o efeito medido.
// ============================================================
import { describe, expect, it } from 'vitest';
import { corpoPedidoPeloRoteiro } from './preAquecimento';
import { APOIOS_DO_FILME } from '../cinematic/journey';

// 'earth' e 'moon' são preload do roteiro real (revelacao.json) — um t
// bem depois de qualquer início real confirma que o roteiro os pediu
// (o pedido é monotônico: `t >= inicio`).
const T_BEM_DEPOIS_DO_FILME = 1e6;

describe('o pedido do roteiro conta o fim do filme como filme', () => {
  it('em "end", um corpo que o roteiro pediu continua segurado — como em "journey"', () => {
    expect(APOIOS_DO_FILME.preAquecerCorpo(T_BEM_DEPOIS_DO_FILME, 'earth')).toBe(true);
    expect(corpoPedidoPeloRoteiro('journey', T_BEM_DEPOIS_DO_FILME, 'earth')).toBe(true);
    expect(corpoPedidoPeloRoteiro('end', T_BEM_DEPOIS_DO_FILME, 'earth')).toBe(true);
  });

  it('fora do filme (carregando, Atlas, voo livre) o pedido nunca segura, mesmo tarde', () => {
    for (const fase of ['loading', 'intro', 'free', 'atlas'] as const) {
      expect(corpoPedidoPeloRoteiro(fase, T_BEM_DEPOIS_DO_FILME, 'earth')).toBe(false);
    }
  });
});
