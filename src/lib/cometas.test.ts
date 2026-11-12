import { describe, expect, it } from 'vitest';
import {
  COMETAS,
  LIMIAR_DE_ATIVIDADE,
  brilhoRelativo,
  cometaPorId,
  estadoDoCometa,
  perieliosEmVolta,
  producaoRelativa,
} from './cometas';

/** JD TDB de uma data UTC (a diferença de ~1 min não pesa aqui) */
const jdDe = (iso: string) => Date.parse(iso) / 86_400_000 + 2_440_587.5;
const r = (v: number[]) => Math.hypot(v[0], v[1], v[2]);

/**
 * O HORIZONS EM 2026-11-12 00:00 TDB (VECTORS, centro do Sol, eclíptica
 * J2000, consultado no mesmo dia) — nenhum conjunto da tabela tem esta
 * época: é a prova do "longe da passagem".
 */
const HOJE = 2_461_356.5;
const DO_HORIZONS: Record<string, [number, number, number]> = {
  halley: [-19.33269517, 27.47325186, -9.848399042],
  encke: [1.533151546, 0.6470844753, 0.2515249751],
  'churyumov-gerasimenko': [0.1782843175, -4.328834318, -0.2429304845],
  'swift-tuttle': [-33.3890575, 15.98317066, -22.03196096],
  'pons-brooks': [-2.624035102, -8.600224169, -1.566225992],
  'hale-bopp': [4.460288781, -22.37543736, -45.93428582],
  neowise: [-12.51333199, -12.94185965, -5.77116104],
  '3i-atlas': [-2.698877634, 12.95416887, -0.7265442471],
};

describe('os cometas — a posição', () => {
  it('as três passagens célebres: data e distância do periélio publicadas', () => {
    // Halley 1986-02-09, 0,587 UA; Hale–Bopp 1997-04-01, 0,914 UA;
    // NEOWISE 2020-07-03, 0,295 UA (JPL; NSSDC para Hale–Bopp)
    const casos: [string, string, number][] = [
      ['halley', '1986-02-09T11:00:00Z', 0.5871],
      ['hale-bopp', '1997-04-01T03:19:00Z', 0.9141],
      ['neowise', '2020-07-03T16:17:00Z', 0.2947],
    ];
    for (const [id, iso, q] of casos) {
      const jd = jdDe(iso);
      const e = estadoDoCometa(id, jd)!;
      expect(r(e), id).toBeCloseTo(q, 3);
      // é mesmo o mínimo: um dia antes e um depois está mais longe
      expect(r(estadoDoCometa(id, jd - 1)!)).toBeGreaterThan(r(e));
      expect(r(estadoDoCometa(id, jd + 1)!)).toBeGreaterThan(r(e));
    }
  });

  it('hoje, contra o Horizons: a posição erra menos de 0,02 UA (medido: 0,0008 a 0,010)', () => {
    for (const c of COMETAS) {
      const e = estadoDoCometa(c.id, HOJE)!;
      const h = DO_HORIZONS[c.id];
      const dr = Math.abs(r(e) - r(h)) / r(h);
      const dp = Math.hypot(e[0] - h[0], e[1] - h[1], e[2] - h[2]);
      expect(dr, c.id).toBeLessThan(0.01);
      expect(dp, c.id).toBeLessThan(0.02);
    }
  });

  it('o próximo periélio de Halley é 28/07/2061, e o último, 09/02/1986', () => {
    const { ultimo, proximo } = perieliosEmVolta('halley', HOJE);
    expect(ultimo!.jd).toBeCloseTo(jdDe('1986-02-09T11:00:00Z'), 0);
    expect(proximo!.jd).toBeCloseTo(jdDe('2061-07-28T17:00:00Z'), 0);
    expect(proximo!.derivado).toBe(false);
  });

  it('3I/ATLAS é hipérbole: uma passagem só, sem próxima', () => {
    const { proximo } = perieliosEmVolta('3i-atlas', HOJE);
    expect(proximo).toBeNull();
  });
});

describe('os cometas — a atividade', () => {
  it('a água acende dentro de ~3 UA e apaga longe', () => {
    expect(producaoRelativa(1, 8)).toBeCloseTo(1, 6);
    expect(producaoRelativa(3, 8)).toBeLessThan(0.05);
    expect(producaoRelativa(6, 8)).toBeLessThan(1e-4);
  });

  it('Halley no periélio está aceso; hoje, a 35 UA, não', () => {
    const halley = cometaPorId('halley')!;
    expect(brilhoRelativo(halley, 0.587)).toBeGreaterThan(1);
    expect(brilhoRelativo(halley, 35)).toBeLessThan(LIMIAR_DE_ATIVIDADE);
  });
});
