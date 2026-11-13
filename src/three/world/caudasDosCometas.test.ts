import { describe, expect, it } from 'vitest';
import { exposicaoDePerto, regimeDePerto } from './caudasDosCometas';

describe('as caudas dos cometas — de perto', () => {
  it('de longe nada muda: exposição 1 e sem coma de perto (as vistas aprovadas)', () => {
    for (const d of [2.5e6, 3e6, 1e8, 1e10]) expect(exposicaoDePerto(d)).toBe(1);
    for (const d of [3e5, 3e6, 1e9]) expect(regimeDePerto(d).perto).toBe(0);
  });

  it('a exposição desce sem saltos e, dentro de 10⁵ km, ∝ distância', () => {
    let antes = 0;
    for (let d = 10; d < 2.45e6; d *= 1.01) {
      const e = exposicaoDePerto(d);
      expect(e).toBeGreaterThan(antes);
      expect(e / exposicaoDePerto(d * 1.0001)).toBeGreaterThan(0.999);
      antes = e;
    }
    expect(exposicaoDePerto(2000) / exposicaoDePerto(300)).toBeCloseTo(2000 / 300, 6);
  });

  it('a coma de perto acende abaixo de 3·10⁵ km e o raio dela é 3× a câmera, até 10⁵ km', () => {
    expect(regimeDePerto(1e5)).toEqual({ perto: 1, raioKm: 1e5 });
    expect(regimeDePerto(2000)).toEqual({ perto: 1, raioKm: 6000 });
    const meio = regimeDePerto(2.25e5).perto;
    expect(meio).toBeGreaterThan(0.4);
    expect(meio).toBeLessThan(0.6);
  });
});
