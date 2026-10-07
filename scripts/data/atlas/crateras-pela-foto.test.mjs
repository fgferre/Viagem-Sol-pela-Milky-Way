// Serve: lei — as crateras pela foto (item 230, J1b): o anel nítido vira cratera no lugar e no tamanho, a mancha sem borda não vira, e a lista se repete
// ============================================================
// Um mapa sintético de 2048×1024 (2,3 km/px, perto dos 1,2 km/px do
// mosaico de Jápeto) na convenção da casa: chão cinza com ruído fino
// determinístico, três crateras de tamanho conhecido — o filete claro
// (Cassini Regio) em 55°N, onde o círculo é uma elipse no mapa; o fundo
// escuro de borda clara (a transição); o sombreado de um lado contra o
// outro (o terreno claro) — e uma mancha escura gaussiana, sem borda.
// ============================================================
import { describe, expect, it } from 'vitest';
import { detectaCrateras } from './crateras-pela-foto.mjs';

const W = 2048;
const H = 1024;
const RAIO_KM = 745.7;
const RAD = Math.PI / 180;
const CRATERAS = [
  { tipo: 'filete', lat: 55, lonE: 30, D: 45 },
  { tipo: 'fundo', lat: -35, lonE: 120, D: 110 },
  { tipo: 'sombra', lat: 25, lonE: 250, D: 260 },
];
const MANCHA = { lat: -5, lonE: 330, D: 150 };

const distKm = (a, b) =>
  Math.acos(Math.min(1, Math.sin(a.lat * RAD) * Math.sin(b.lat * RAD) + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos((a.lonE - b.lonE) * RAD))) * RAIO_KM;
/** Rumo de `a` para `b`, a partir do norte, sentido leste (rad). */
const rumo = (a, b) =>
  Math.atan2(
    Math.sin((b.lonE - a.lonE) * RAD) * Math.cos(b.lat * RAD),
    Math.cos(a.lat * RAD) * Math.sin(b.lat * RAD) - Math.sin(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos((b.lonE - a.lonE) * RAD)
  );
const ruido = (i) => {
  let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};

function mapa() {
  const lum = new Float32Array(W * H);
  for (let j = 0; j < H; j += 1) {
    for (let i = 0; i < W; i += 1) {
      const p = { lat: 90 - ((j + 0.5) * 180) / H, lonE: (180 + ((i + 0.5) * 360) / W) % 360 };
      let L = 0.3 * (1 + 0.15 * (ruido(j * W + i) - 0.5));
      for (const c of CRATERAS) {
        const r = distKm(c, p) / (c.D / 2);
        if (r > 1.6) continue;
        if (c.tipo === 'filete' && Math.abs(r - 1) < 0.12) L *= 1.6;
        if (c.tipo === 'fundo') L *= r < 0.92 ? 0.55 : r < 1.06 ? 1.3 : 1;
        if (c.tipo === 'sombra') {
          // luz de oeste: a parede de dentro clareia para o leste até a crista; fora dela, o contrário
          const s = Math.sin(rumo(c, p));
          if (r > 0.6 && r < 1) L *= 1 + (0.5 * s * (r - 0.6)) / 0.4;
          else if (r >= 1 && r < 1.15) L *= 1 - 0.25 * s;
        }
      }
      const rm = distKm(MANCHA, p) / (MANCHA.D / 2);
      lum[j * W + i] = L * (1 - 0.5 * Math.exp(-rm * rm));
    }
  }
  return lum;
}

const LUM = mapa();
const PRIMEIRA = detectaCrateras(LUM, { W, H, raioKm: RAIO_KM });

describe('crateras pela foto', () => {
  it('acha as três crateras com o diâmetro a ±15 % e o centro a menos de ¼ do raio, e nada mais — nem na mancha sem borda', () => {
    const achadas = PRIMEIRA.crateras;
    for (const c of CRATERAS) {
      const perto = achadas.filter((a) => distKm(a, c) < c.D / 2);
      expect(perto).toHaveLength(1);
      expect(Math.abs(perto[0].diametro_km / c.D - 1)).toBeLessThanOrEqual(0.15);
      expect(distKm(perto[0], c)).toBeLessThan(c.D / 8);
    }
    expect(achadas.filter((a) => distKm(a, MANCHA) < MANCHA.D)).toHaveLength(0);
    expect(achadas).toHaveLength(CRATERAS.length);
  });

  it('devolve a mesma lista na segunda volta, número a número', () => {
    expect(detectaCrateras(LUM, { W, H, raioKm: RAIO_KM })).toEqual(PRIMEIRA);
  }, 30000);
});
