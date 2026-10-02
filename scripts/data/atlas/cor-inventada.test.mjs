// Serve: lei — as peças puras da cor inventada (PLAN-COR.md, M1): a máscara do vazio, o retalho no plano tangente, o corte de erro mínimo
// ============================================================
// Em miniatura, com resposta conhecida de fora do código:
//  1. O VAZIO é o que `preencherVazioSemDado` tapa — a calota grande —, e o
//     buraco pequeno fica como `semDado`; a redução ao destino é pelo máximo
//     da pegada e a dilatação dá a volta da longitude.
//  2. O RETALHO vai do alvo à origem e volta (a mesma rotação nos dois
//     sentidos), leva o centro ao centro e não gira: as coordenadas no plano
//     tangente são as mesmas, e o norte do alvo cai no meridiano da origem.
//  3. O CORTE passa pelo anel de erro baixo, deixa o descoberto dentro e
//     nunca põe novo além do primeiro texel fixo de um raio.
// ============================================================
import { describe, expect, it } from 'vitest';
import { corteDeErroMinimo, dilataMascara, geometriaDoCorte, pontoDaOrigem, reduzMascara, vazioDoMosaico } from './cor-inventada.mjs';
import { noPlano, planoTangente, pontoDoPlano } from './relevo-inventado.mjs';

const distancia = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const latLon = (p) => [Math.asin(p[2]) * (180 / Math.PI), ((Math.atan2(p[1], p[0]) * (180 / Math.PI)) + 360) % 360];

describe('a máscara do vazio', () => {
  it('pega a calota sem dado e deixa o buraco pequeno como sem dado', () => {
    const L = 360;
    const A = 180;
    const pixels = new Uint8Array(L * A * 3);
    for (let j = 0; j < A; j += 1) {
      for (let i = 0; i < L; i += 1) {
        let v = j >= 130 ? 0 : 100 + ((i * 7 + j * 13) % 50);
        if (j >= 60 && j <= 62 && i >= 200 && i <= 202) v = 5;
        pixels.fill(v, 3 * (j * L + i), 3 * (j * L + i) + 3);
      }
    }
    const { vazio, semDado } = vazioDoMosaico(pixels, L, A, 3);
    let calota = 0;
    let fora = 0;
    for (let k = 0; k < L * A; k += 1) {
      if (Math.floor(k / L) >= 130) calota += vazio[k];
      else fora += vazio[k];
    }
    expect(calota).toBe(50 * L);
    expect(fora).toBe(0);
    expect(semDado[61 * L + 201]).toBe(1);
    expect(semDado.reduce((s, v) => s + v, 0)).toBe(9);
  });

  it('reduz pelo máximo da pegada e dilata com a volta da longitude', () => {
    const fonte = new Uint8Array(12 * 6);
    fonte[2 * 12 + 11] = 1;
    const reduzida = reduzMascara(fonte, 12, 6, 8, 4);
    expect(reduzida[1 * 8 + 7]).toBe(1);
    expect(reduzida.reduce((s, v) => s + v, 0)).toBe(1);
    const dilatada = dilataMascara(reduzida, 8, 4, 1);
    expect(dilatada[1 * 8 + 0]).toBe(1);
    expect(dilatada[0 * 8 + 6]).toBe(1);
    expect(dilatada[2 * 8 + 0]).toBe(1);
    expect(dilatada[3 * 8 + 7]).toBe(0);
    expect(dilatada[1 * 8 + 5]).toBe(0);
  });
});

describe('o retalho no plano tangente', () => {
  it('vai e volta pela mesma rotação, leva o centro ao centro e não gira', () => {
    const raioKm = 606;
    for (const [aLat, aLon, oLat, oLon] of [[-60, 200, -20, 330], [-90, 0, -10, 320], [10, 100, -30, 300]]) {
      const alvo = planoTangente(aLat, aLon);
      const origem = planoTangente(oLat, oLon);
      const p = pontoDoPlano(alvo, 20, 30, raioKm);
      const q = pontoDaOrigem(alvo, origem, p);
      expect(distancia(pontoDaOrigem(origem, alvo, q), p)).toBeLessThan(1e-12);
      expect(distancia(pontoDaOrigem(alvo, origem, alvo.c), origem.c)).toBeLessThan(1e-12);
      const [x, y] = noPlano(origem, q, raioKm);
      expect(x).toBeCloseTo(20, 9);
      expect(y).toBeCloseTo(30, 9);
      // o norte do alvo cai no meridiano da origem, ao norte do centro
      const norte = latLon(pontoDaOrigem(alvo, origem, pontoDoPlano(alvo, 0, 50, raioKm)));
      expect(norte[0]).toBeGreaterThan(oLat);
      expect(Math.abs(((norte[1] - oLon + 540) % 360) - 180)).toBeLessThan(1e-9);
    }
  });
});

describe('o corte de erro mínimo', () => {
  const meio = 10;
  const H = 13;
  const montar = () => {
    const geo = geometriaDoCorte(meio, H);
    const { G } = geo;
    const custo = new Float64Array(G * G);
    const coberto = new Uint8Array(G * G).fill(1);
    const fixo = new Uint8Array(G * G);
    for (let b = 0; b < G; b += 1) {
      for (let a = 0; a < G; a += 1) {
        const r = Math.hypot(a - H, b - H);
        custo[b * G + a] = Math.abs(r - 7) < 0.75 ? 1e-3 : 1;
        if (r < 3) coberto[b * G + a] = 0;
      }
    }
    return { geo, G, custo, coberto, fixo };
  };

  it('passa pelo anel de erro baixo, com o descoberto dentro', () => {
    const { geo, custo, coberto, fixo } = montar();
    expect(corteDeErroMinimo(geo, custo, coberto, fixo)).toBeLessThan(1e29);
    for (let t = 0; t < geo.nTheta; t += 1) {
      expect(geo.rCorte[t]).toBeGreaterThanOrEqual(6);
      expect(geo.rCorte[t]).toBeLessThanOrEqual(8);
    }
  });

  it('não põe novo além do primeiro texel fixo de um raio', () => {
    const { geo, G, custo, coberto, fixo } = montar();
    for (let b = 0; b < G; b += 1) for (let a = H + 5; a < G; a += 1) fixo[b * G + a] = 1;
    expect(corteDeErroMinimo(geo, custo, coberto, fixo)).toBeLessThan(1e29);
    expect(geo.rCorte[0]).toBeGreaterThanOrEqual(3);
    expect(geo.rCorte[0]).toBeLessThanOrEqual(5);
    for (let t = 0; t < geo.nTheta; t += 1) expect(geo.rCorte[t]).toBeGreaterThanOrEqual(3);
  });
});
