import { describe, expect, it } from 'vitest';
import { brilhoRelativo, cometaPorId } from '../../lib/cometas';
import {
  ATIVIDADE_DE_HALLEY,
  PASSOS_DA_COMA,
  exposicaoDePerto,
  exposicaoDosIons,
  raioDaCabecaKm,
  regimeDePerto,
} from './caudasDosCometas';

describe('as caudas dos cometas — de perto', () => {
  const halley = ATIVIDADE_DE_HALLEY;
  const hb = brilhoRelativo(cometaPorId('hale-bopp')!, 0.921);

  it('de longe nada muda: exposição 1 e sem coma de perto (as vistas aprovadas)', () => {
    // a chegada em Halley (2,4·10⁸ km) e a vista larga de Hale–Bopp em 1997 (3,8·10⁸ km)
    for (const d of [1.6e7, 2.4e8, 1e10]) expect(exposicaoDePerto(d, halley)).toBe(1);
    for (const d of [2.1e8, 3.8e8]) expect(exposicaoDePerto(d, hb)).toBe(1);
    for (const d of [3e5, 3e6, 1e9]) expect(regimeDePerto(d).perto).toBe(0);
  });

  it('dentro da cabeça a exposição é ∝ D/atividade — a régua de 12/11 —, e sobe sem saltos até 1', () => {
    expect(exposicaoDePerto(1e5, halley)).toBeCloseTo(1e-4, 12);
    expect(exposicaoDePerto(2000, halley) / exposicaoDePerto(300, halley)).toBeCloseTo(2000 / 300, 6);
    expect(exposicaoDePerto(1e5, hb)).toBeCloseTo((1e-4 * halley) / hb, 12);
    for (const a of [halley, hb]) {
      let antes = 0;
      for (let d = 10; d < 2e8; d *= 1.01) {
        const e = exposicaoDePerto(d, a);
        expect(e).toBeGreaterThanOrEqual(antes);
        expect(e / exposicaoDePerto(d * 1.0001, a)).toBeGreaterThan(0.999);
        antes = e;
      }
    }
  });

  it('o "Aproximar" (3–4 raios da cabeça) vê toda cabeça com a mesma sobre-exposição, poucas vezes a de dentro', () => {
    for (const a of [halley, hb]) {
      const d = 3.24 * raioDaCabecaKm(a);
      const deDentro = d / (1e9 * (a / halley));
      const sobre = exposicaoDePerto(d, a) / deDentro;
      expect(sobre).toBeGreaterThan(2);
      expect(sobre).toBeLessThan(3);
    }
  });

  it('a coma de perto acende abaixo de 3·10⁵ km e o raio dela é 3× a câmera, até 10⁵ km', () => {
    expect(regimeDePerto(1e5)).toEqual({ perto: 1, raioKm: 1e5 });
    expect(regimeDePerto(2000)).toEqual({ perto: 1, raioKm: 6000 });
    const meio = regimeDePerto(2.25e5).perto;
    expect(meio).toBeGreaterThan(0.4);
    expect(meio).toBeLessThan(0.6);
  });

  it('a exposição dos íons não salta e, dentro de 3·10⁴ km, cai ∝ D^1,5', () => {
    expect(exposicaoDosIons(3e8, halley)).toBe(1);
    expect(exposicaoDosIons(3e4, halley)).toBeCloseTo(9e-4, 12);
    expect(exposicaoDosIons(1e5, hb)).toBeCloseTo((9e-4 * halley) / hb, 12);
    expect(exposicaoDosIons(1e4, hb) / exposicaoDosIons(2500, hb)).toBeCloseTo(8, 6);
  });

  it('o passo da coma de perto segue o tier e o telefone não pesa mais que os 16 de antes', () => {
    expect(PASSOS_DA_COMA.performance).toBeLessThanOrEqual(8);
    expect(PASSOS_DA_COMA.alta).toBeLessThanOrEqual(PASSOS_DA_COMA.cinema);
  });
});
