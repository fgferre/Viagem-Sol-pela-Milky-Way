// Serve: lei — a tabela única da régua (PLAN-REGUA-UNICA.md, R2): as fórmulas de cor do estudo (o Sol dá 1; índices e filtros Cassini viram as razões), p0 = valor / S, nenhum corpo pede média acima de 1 em canal nenhum, e a Terra fica fora
import { describe, expect, it } from 'vitest';
import { REGUA_DOS_MAPAS, alvoDoMapa, razaoBG, razaoRG } from './reguaDosMapas';

describe('a tabela da régua', () => {
  it('as fórmulas da cor: as cores do Sol dão 1, e Mercúrio, Io e Plutão saem nas razões do estudo', () => {
    expect(razaoBG({ BV: 0.653 })).toBeCloseTo(1, 12);
    expect(razaoRG({ VRc: 0.352 })).toBeCloseTo(1, 12);
    expect(razaoBG({ r420: 1 })).toBe(1);
    const mercurio = alvoDoMapa('mercury');
    expect(mercurio.BG).toBeCloseTo(0.747, 3);
    expect(mercurio.RG).toBeCloseTo(1.167, 3);
    expect(mercurio.p0).toBeCloseTo(0.142 / 1.28, 12);
    expect(alvoDoMapa('io').BG).toBeCloseTo(0.55 ** 0.85, 12);
    const plutao = alvoDoMapa('pluto');
    expect(plutao.BG).toBeCloseTo(0.758, 3);
    expect(plutao.RG).toBeCloseTo(1.162, 3);
  });

  it('nenhum corpo pede média acima de 1 em canal nenhum (p0·max(1, B/G, R/G) ≤ 1), toda âncora pede razão > 1, e a Terra fica fora', () => {
    for (const id of Object.keys(REGUA_DOS_MAPAS)) {
      const { p0, BG, RG, ancora } = alvoDoMapa(id);
      expect(p0 * Math.max(1, BG, RG), id).toBeLessThan(1);
      expect(p0, id).toBeGreaterThan(0);
      if (ancora) expect(ancora.razao, id).toBeGreaterThan(1);
    }
    expect(REGUA_DOS_MAPAS.earth).toBeUndefined();
    expect(() => alvoDoMapa('earth')).toThrow(/não está na tabela/);
  });
});
