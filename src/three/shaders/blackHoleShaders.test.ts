// Serve: lei — o disco de Sgr A✱ é uma fatia fina: inclinado sai igual ao plano de sempre, de lado vira faixa e não risco; a borda rala não tapa o fundo
import { describe, expect, it } from 'vitest';
import {
  BH_MARCH_FRAG,
  ESPESSURA_DO_DISCO,
  RAIO_DENSO_RS,
  densidadeDoDisco,
  fatiaDoDisco,
} from './blackHoleShaders';

const R_IN = 2.75;
const R_OUT = 26;

// peso de um trecho a→b, como em diskCross
function peso(ay: number, by: number, r: number): number {
  const fa = fatiaDoDisco(ay, r, R_IN, R_OUT);
  const fb = fatiaDoDisco(by, r, R_IN, R_OUT);
  return ay * by <= 0 ? 0.5 * (fa + fb) : 0.5 * Math.abs(fa - fb);
}

describe('a fatia do disco', () => {
  it('travessia inclinada num passo só pesa exatamente 1 — o plano de antes', () => {
    expect(peso(0.5, -0.5, 10)).toBe(1);
    expect(peso(0.5, 0.4, 10)).toBe(0);
  });

  it('travessia em muitos passos dentro da espessura soma 1', () => {
    const r = 10;
    const meia = ESPESSURA_DO_DISCO * r;
    let soma = 0;
    for (let i = 0; i < 40; i++) {
      soma += peso(meia * (1.5 - (3 * i) / 40), meia * (1.5 - (3 * (i + 1)) / 40), r);
    }
    expect(soma).toBeCloseTo(1, 12);
  });

  it('raio rente à face, sem cruzar o plano, leva só parte do disco', () => {
    const r = 10;
    const meia = ESPESSURA_DO_DISCO * r;
    const desce = peso(1.2 * meia, 0.3 * meia, r);
    expect(desce).toBeGreaterThan(0);
    expect(desce).toBeLessThan(0.5);
  });

  it('o shader usa a fatia no cruzamento', () => {
    expect(BH_MARCH_FRAG).toContain(`${ESPESSURA_DO_DISCO.toFixed(4)} * max(r, uDin)`);
    expect(BH_MARCH_FRAG).toMatch(/float fa = fatia\(a\), fb = fatia\(b\);/);
    // o cruzamento leva o disco inteiro — vista inclinada igual à de antes
    expect(BH_MARCH_FRAG).toContain('w = max(pend, 1.0);');
  });

  it('além da borda do disco não há fatia', () => {
    expect(fatiaDoDisco(0, R_OUT + 1, R_IN, R_OUT)).toBe(1);
  });

  it('a borda externa rala quase não tapa; por dentro tapa como sempre', () => {
    for (const r of [2.8, 3.1, 4, 6, RAIO_DENSO_RS]) expect(densidadeDoDisco(r, R_OUT)).toBe(1);
    expect(densidadeDoDisco(13, R_OUT)).toBeLessThan(0.3);
    expect(densidadeDoDisco(20, R_OUT)).toBeLessThan(0.05);
    for (let r = RAIO_DENSO_RS; r < R_OUT; r += 0.5) {
      expect(densidadeDoDisco(r + 0.5, R_OUT)).toBeLessThanOrEqual(densidadeDoDisco(r, R_OUT));
    }
    // o brilho segue com alpha; só o que tapa (trans) leva a densidade
    expect(BH_MARCH_FRAG).toContain('col += trans * alpha * dcol;');
    expect(BH_MARCH_FRAG).toContain('trans *= 1.0 - tapa;');
  });
});
