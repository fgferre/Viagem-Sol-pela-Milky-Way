import { describe, expect, it } from 'vitest';
import {
  B_CRITICO,
  PERIASTRO_S2_UA,
  RS_SGR_A_UA,
  azimuteDeEscape,
  deflexaoTotal,
  distanciaDeS2,
  lerTabela,
  parametroDeImpacto,
  sombraEmMicroArcsec,
  tabelaDaLente,
} from './buracoNegro';

/**
 * A REFERÊNCIA INDEPENDENTE: a órbita da luz integrada passo a passo
 * (u'' + u = 1,5u², RS = 1) por RK4, de u0 com du/dφ = v0 até u voltar a
 * zero. Devolve o azimute varrido.
 */
function azimutePorRk4(u0: number, v0: number): number {
  const h = 2e-5;
  let u = u0;
  let v = v0;
  let phi = 0;
  const acc = (x: number) => -x + 1.5 * x * x;
  for (let n = 0; n < 2e7; n++) {
    const k1u = v;
    const k1v = acc(u);
    const k2u = v + 0.5 * h * k1v;
    const k2v = acc(u + 0.5 * h * k1u);
    const k3u = v + 0.5 * h * k2v;
    const k3v = acc(u + 0.5 * h * k2u);
    const k4u = v + h * k3v;
    const k4v = acc(u + h * k3u);
    const un = u + (h / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
    const vn = v + (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    if (un <= 0 && n > 0) return phi + (h * u) / (u - un);
    u = un;
    v = vn;
    phi += h;
  }
  return NaN;
}

describe('Sagittarius A✱ — os números', () => {
  it('RS ≈ 0,085 UA e a sombra de longe ≈ 54 µas (o anel da EHT: 51,8 ± 2,3)', () => {
    expect(RS_SGR_A_UA).toBeCloseTo(0.0849, 3);
    expect(sombraEmMicroArcsec()).toBeGreaterThan(51.8 - 2 * 2.3);
    expect(sombraEmMicroArcsec()).toBeLessThan(51.8 + 2 * 2.3);
  });

  it('S2: periastro ≈ 120 UA, e a distância anda entre ele e o apoastro', () => {
    expect(PERIASTRO_S2_UA).toBeGreaterThan(115);
    expect(PERIASTRO_S2_UA).toBeLessThan(125);
    expect(distanciaDeS2(2018.379)).toBeCloseTo(PERIASTRO_S2_UA, 0);
  });
});

describe('a deflexão exata de Schwarzschild', () => {
  it('bate com a integração direta da órbita da luz em b = 3, 5, 10, 50 RS', () => {
    for (const b of [3, 5, 10, 50]) {
      const ref = azimutePorRk4(0, 1 / b) - Math.PI;
      expect(Math.abs(deflexaoTotal(b) - ref)).toBeLessThan(1e-5);
    }
  });

  it('tende ao limite fraco 2RS/b longe e diverge na borda da sombra', () => {
    expect(deflexaoTotal(5000) * 5000).toBeCloseTo(2, 2);
    expect(deflexaoTotal(B_CRITICO * (1 + 1e-6))).toBeGreaterThan(2 * Math.PI);
  });

  it('o azimute de escape de uma câmera a 40 RS confere com a órbita integrada', () => {
    const rO = 40;
    const t = tabelaDaLente(rO);
    for (const psiGraus of [10, 30, 60, 89, 91, 100, 170]) {
      const psiT = (psiGraus * Math.PI) / 180;
      expect(Math.abs(lerTabela(t, psiT) - azimuteDeEscape(psiT, rO))).toBeLessThan(3e-4);
    }
    for (const psiGraus of [30, 100, 170]) {
      const psi = (psiGraus * Math.PI) / 180;
      const b = parametroDeImpacto(psi, rO);
      const uO = 1 / rO;
      const g = 1 / (b * b) - uO * uO + uO * uO * uO;
      // du/dφ > 0 é ENTRANDO (u cresce)
      const v0 = Math.cos(psi) < 0 ? Math.sqrt(g) : -Math.sqrt(g);
      const ref = azimutePorRk4(uO, v0);
      expect(Math.abs(azimuteDeEscape(psi, rO) - ref)).toBeLessThan(1e-4);
    }
  });

  it('sem gravidade o raio segue reto: Φ → ψ quando a câmera está longe', () => {
    const psi = 1.0;
    expect(azimuteDeEscape(psi, 1e9)).toBeCloseTo(psi, 6);
  });

  it('a tabela erra menos de 3e-4 rad (¼ de pixel no Cinema) do anel até a borda', () => {
    const rO = 40;
    const t = tabelaDaLente(rO);
    for (const b of [2.7, 3, 5, 10, 30]) {
      const psi = Math.PI - Math.asin((b * Math.sqrt(1 - 1 / rO)) / rO);
      const exato = azimuteDeEscape(psi, rO);
      expect(Math.abs(lerTabela(t, psi) - exato)).toBeLessThan(3e-4);
    }
  });
});
