// Serve: lei — o relevo medido (E1 das luas pequenas): o referencial IAU cai no texel que o app lê, os poços e a cor respeitam a convenção da pintura, e o byte volta ao raio
// ============================================================
// O oráculo do texel é o do APP, não o deste módulo: a direção do corpo vai
// à cena pelas colunas de `orientacaoDoCorpoNaCena` (x̂ = meridiano-primo,
// polo, x̂×polo) e o uv sai do vértice da `SphereGeometry` do three que mora
// nela (linha 0 do mapa = norte, v = 1). A bossa em longitude 0 pega o mapa
// que começa em 0° (e não em 180°E); a de 45°N, 90°E pega o espelho.
// ============================================================
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { IAU_ORIENTATIONS } from '../../../src/lib/atlas/iauOrientation.ts';
import { orientacaoDoCorpoNaCena } from '../../../src/three/world/corpos/orientacaoNaCena.ts';
import {
  alturaEmBytes,
  campoNaCasa,
  corNaCasa,
  detectaPocos,
  direcaoLocalDeLonLat,
  gradeNaCasa,
  gradeRadial,
  lePlt,
  malhaNoReferencial,
  quantizaGrade,
  raioComPocos,
} from './relevo-medido.mjs';

const RAD = Math.PI / 180;
/** (λ leste, lat) em graus → direção no referencial do CORPO da IAU: X = longitude 0, Y = 90°E, Z = polo norte. */
const doCorpo = (lonE, lat) => [Math.cos(lat * RAD) * Math.cos(lonE * RAD), Math.cos(lat * RAD) * Math.sin(lonE * RAD), Math.sin(lat * RAD)];
const BOSSAS = [
  { centro: doCorpo(0, 0), altura: 0.4 }, // o ponto sub-Saturno
  { centro: doCorpo(90, 45), altura: 0.25 },
];

/** Uma esfera de 10 km com as duas bossas gaussianas (σ = 12°), em texto PLT, no referencial do corpo. */
function pltSintetico(nLon = 96, nLat = 48) {
  const raio = (d) =>
    10 * (1 + BOSSAS.reduce((s, b) => s + b.altura * Math.exp(-(Math.acos(Math.min(1, d[0] * b.centro[0] + d[1] * b.centro[1] + d[2] * b.centro[2])) ** 2) / (2 * (12 * RAD) ** 2)), 0));
  const v = [[0, 0, 1]];
  for (let j = 1; j < nLat; j++) for (let i = 0; i < nLon; i++) v.push(doCorpo((i * 360) / nLon, 90 - (j * 180) / nLat));
  v.push([0, 0, -1]);
  const anel = (j, i) => 1 + (j - 1) * nLon + (i % nLon);
  const f = [];
  for (let i = 0; i < nLon; i++) {
    f.push([0, anel(1, i), anel(1, i + 1)], [v.length - 1, anel(nLat - 1, i + 1), anel(nLat - 1, i)]);
    for (let j = 1; j < nLat - 1; j++) f.push([anel(j, i), anel(j + 1, i), anel(j + 1, i + 1)], [anel(j, i), anel(j + 1, i + 1), anel(j, i + 1)]);
  }
  const linhas = v.map((d) => d.map((c) => (c * raio(d)).toExponential(8)).join(' '));
  return [`${v.length} ${f.length}`, ...linhas, ...f.map((t) => t.join(' '))].join('\n');
}

/** O texel (coluna, linha fracionárias) que o app lê, num mapa W×H, para a direção `d` do corpo. */
function texelQueOAppLe(d, W, H) {
  const { colunaX: x, colunaY: polo, colunaZ: z } = orientacaoDoCorpoNaCena(IAU_ORIENTATIONS.pan, 2460000.5);
  const leste = [polo[1] * x[2] - polo[2] * x[1], polo[2] * x[0] - polo[0] * x[2], polo[0] * x[1] - polo[1] * x[0]];
  const cena = [0, 1, 2].map((k) => d[0] * x[k] + d[1] * leste[k] + d[2] * polo[k]);
  const ponto = (c) => cena[0] * c[0] + cena[1] * c[1] + cena[2] * c[2];
  const local = new THREE.Vector3(ponto(x), ponto(polo), ponto(z));
  const geo = new THREE.SphereGeometry(1, W, H);
  const pos = geo.getAttribute('position');
  const uv = geo.getAttribute('uv');
  let melhor = -2;
  let achado = null;
  for (let k = 0; k < pos.count; k++) {
    const c = new THREE.Vector3().fromBufferAttribute(pos, k).normalize().dot(local);
    if (c > melhor) [melhor, achado] = [c, [uv.getX(k) * W - 0.5, (1 - uv.getY(k)) * H - 0.5]];
  }
  expect(melhor).toBeGreaterThan(1 - 1e-9); // há vértice exatamente na direção
  return achado;
}

/** O centro da bossa (coluna, linha) num campo W×H: média pesada nas duas linhas/colunas do meio, janela de 8 em volta de `alvo`. */
function centroDaBossa(campo, W, [x, y]) {
  const [i0, j0] = [Math.floor(x), Math.floor(y)];
  let base = Infinity;
  for (const v of campo) base = Math.min(base, v);
  let [sc, wc, sl, wl] = [0, 0, 0, 0];
  for (let d = -3; d <= 4; d++) {
    for (const j of [j0, j0 + 1]) [sc, wc] = [sc + (campo[j * W + i0 + d] - base) * (i0 + d), wc + campo[j * W + i0 + d] - base];
    for (const i of [i0, i0 + 1]) [sl, wl] = [sl + (campo[(j0 + d) * W + i] - base) * (j0 + d), wl + campo[(j0 + d) * W + i] - base];
  }
  return [sc / wc, sl / wl];
}

describe('relevo medido', () => {
  it('no referencial IAU, a bossa sub-Saturno e a de 45°N 90°E caem no texel que o app lê, no mapa de altura e na planta', () => {
    const malha = malhaNoReferencial(lePlt(pltSintetico()), 'iau');
    const grade = gradeRadial(malha, { nx: 128, ny: 64 });
    expect(grade.raiosComZeroHits).toBe(0);
    const gradeQ = quantizaGrade(grade, 10);
    const { bytes } = alturaEmBytes(campoNaCasa(64, 32, (d) => raioComPocos(gradeQ, null, d)));
    const planta = gradeNaCasa(grade.rKm, 128, 64);
    for (const { centro } of BOSSAS) {
      for (const [campo, W, H] of [[bytes, 64, 32], [planta, 128, 64]]) {
        const alvo = texelQueOAppLe(centro, W, H);
        const [c, l] = centroDaBossa(campo, W, alvo);
        expect(Math.abs(c - alvo[0])).toBeLessThan(0.25);
        expect(Math.abs(l - alvo[1])).toBeLessThan(0.25);
      }
    }
  });

  it('um poço escuro pintado em (60°E, 20°N) vira cratera nessa direção na convenção da casa, e no espelho na da malha', () => {
    const [W, H] = [512, 256];
    const [x0, y0] = [((60 + 180) / 360) * W - 0.5, ((90 - 20) / 180) * H - 0.5];
    const pintura = new Uint8Array(W * H * 3);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) pintura.fill(Math.round(200 - 150 * Math.exp(-((x - x0) ** 2 + (y - y0) ** 2) / (2 * 4 ** 2))), (y * W + x) * 3, (y * W + x) * 3 + 3);
    const alvo = direcaoLocalDeLonLat(60, 20);
    for (const [convencao, sinal] of [['casa', 1], ['malha', -1]]) {
      const crateras = detectaPocos(pintura, W, H, 3, { convencao });
      const angulo = (k) => Math.acos(Math.min(1, k[0] * alvo.x + k[1] * alvo.y + sinal * k[2] * alvo.z)) / RAD;
      const maisPerto = crateras.reduce((a, b) => (angulo(b) < angulo(a) ? b : a));
      expect(angulo(maisPerto)).toBeLessThan(0.5);
      expect(maisPerto[4]).toBeGreaterThan(0);
    }
  });

  it('a cor pintada na convenção da casa volta igual; a pintada na da malha volta espelhada em longitude', () => {
    const [W, H] = [64, 32];
    const L = [0, 1, 2].map((k) => Float64Array.from({ length: W * H }, (_, p) => ((p % W) + k * Math.floor(p / W)) / 200));
    const casa = corNaCasa({ L, W, H }, W, H, 'casa');
    const malha = corNaCasa({ L, W, H }, W, H, 'malha');
    let [difCasa, difMalha] = [0, 0];
    for (let k = 0; k < 3; k++) {
      for (let p = 0; p < W * H; p++) {
        const espelho = p - (p % W) + (W - 1 - (p % W));
        difCasa = Math.max(difCasa, Math.abs(casa[k][p] - L[k][p]));
        difMalha = Math.max(difMalha, Math.abs(malha[k][p] - L[k][espelho]));
      }
    }
    expect(difCasa).toBeLessThan(1e-9);
    expect(difMalha).toBeLessThan(1e-9);
  });

  it('o byte da altura volta ao raio do app em ±½ degrau: raio = 1 + viés + (b/255)·escala', () => {
    const campo = Float64Array.from({ length: 1001 }, (_, i) => 0.7 + (0.65 * i) / 1000);
    const { bytes, escala, vies } = alturaEmBytes(campo);
    expect([escala, vies].map((x) => +x.toFixed(12))).toEqual([0.65, -0.3]);
    campo.forEach((r, i) => expect(Math.abs(1 + vies + (bytes[i] / 255) * escala - r)).toBeLessThanOrEqual(escala / 510 + 1e-12));
  });
});
