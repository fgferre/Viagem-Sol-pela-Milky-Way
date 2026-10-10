// Serve: lei — a régua dos mapas (PLAN-REGUA-UNICA.md, R2): a média de G por área cai em p0 e as de B e R nas razões medidas (foto guarda o matiz, tinta o faz uniforme), o teto baixa o γ e nada estoura além de 0,1 % da área, a segunda passada não muda nada, a média pesa por cos(latitude) e a segunda âncora fixa o γ
// ============================================================
// Mapas pequenos e sintéticos (equiretangulares de 256×128, sorteados por
// LCG). Os alvos são os de uma linha da tabela (`alvoDoMapa`); a régua sobre
// os mapas de verdade roda na cadeia, no terminal do dono.
// ============================================================
import { describe, expect, it } from 'vitest';
import { LINEAR_DO_BYTE } from './cor-europa.mjs';
import { FRACAO_ACIMA_DO_TETO, mediasPonderadas, nivelaMapa } from './regua-dos-mapas.mjs';

const W = 256;
const H = 128;

function lcg(semente) {
  let s = semente;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** RGB com matiz variado: cada texel um tom de 40 a 220 e um desvio de cor de até ±25 por canal. */
function mapaColorido(semente = 3) {
  const r = lcg(semente);
  const p = new Uint8Array(3 * W * H);
  for (let k = 0; k < W * H; k += 1) {
    const tom = 40 + 180 * r();
    for (let c = 0; c < 3; c += 1) p[3 * k + c] = Math.round(Math.max(0, Math.min(255, tom + 50 * (r() - 0.5))));
  }
  return p;
}

/** Cinza com a metade esquerda (180–360°E: a coluna 0 é 180°E) escura e a direita clara. */
function mapaDeMetades(semente = 17) {
  const r = lcg(semente);
  const p = new Uint8Array(3 * W * H);
  for (let k = 0; k < W * H; k += 1) p.fill(Math.round((k % W < W / 2 ? 30 : 120) + 40 * r()), 3 * k, 3 * k + 3);
  return p;
}

const METADES = { clara: { lat: [-90, 90], lonE: [0, 180] }, escura: { lat: [-90, 90], lonE: [180, 360] } };

const perto = (obtido, esperado, relativo) => expect(Math.abs(obtido / esperado - 1)).toBeLessThan(relativo);

describe('a régua dos mapas', () => {
  it('a média de G cai em p0 e as de R e B em p0·R/G e p0·B/G; a foto guarda o matiz de cada texel, a tinta o faz uniforme', () => {
    const pixels = mapaColorido();
    const alvo = { p0: 0.3, BG: 0.8, RG: 1.2 };
    const razoesR = (out) => {
      const rs = [];
      for (let k = 0; k < W * H; k += 1) if (out[3 * k + 1] > 60) rs.push(LINEAR_DO_BYTE[out[3 * k]] / LINEAR_DO_BYTE[out[3 * k + 1]]);
      const m = rs.reduce((s, v) => s + v, 0) / rs.length;
      return Math.sqrt(rs.reduce((s, v) => s + (v - m) ** 2, 0) / rs.length);
    };
    for (const matiz of ['foto', 'tinta']) {
      const r = nivelaMapa({ pixels, largura: W, altura: H, canais: 3, alvo: { ...alvo, matiz } });
      perto(r.medias[0], 0.36, 0.01);
      perto(r.medias[1], 0.3, 0.01);
      perto(r.medias[2], 0.24, 0.01);
      if (matiz === 'foto') expect(razoesR(r.pixels)).toBeGreaterThan(0.05);
      else expect(razoesR(r.pixels)).toBeLessThan(0.02);
    }
    // um canal só (o mosaico de Ceres) é tinta
    const cinza = Uint8Array.from({ length: W * H }, (_, k) => pixels[3 * k + 1]);
    const r = nivelaMapa({ pixels: cinza, largura: W, altura: H, canais: 1, alvo: { ...alvo, matiz: 'foto' } });
    perto(r.medias[0] / r.medias[1], 1.2, 0.01);
    perto(r.medias[2] / r.medias[1], 0.8, 0.01);
  });

  it('o teto: com o alvo alto o γ baixa (o g não), a média fica a medida e no máximo 0,1 % da área chega a 255', () => {
    const r0 = lcg(11);
    // planície de 90–130 com 3 % de manchas brancas: em γ 1 a média 0,85 estouraria as manchas e boa parte da planície
    const pixels = new Uint8Array(3 * W * H);
    for (let k = 0; k < W * H; k += 1) {
      const v = r0() < 0.03 ? 255 : 90 + 40 * r0();
      pixels.fill(Math.round(v), 3 * k, 3 * k + 3);
    }
    const r = nivelaMapa({ pixels, largura: W, altura: H, canais: 3, alvo: { p0: 0.85, BG: 0.95, RG: 1.0, matiz: 'foto' } });
    expect(r.gamaAntesDoTeto).toBe(1);
    expect(r.gama).toBeLessThan(1);
    expect(r.fracaoComprimida).toBeGreaterThan(0.03);
    expect(r.fracaoNoTeto).toBeLessThanOrEqual(FRACAO_ACIMA_DO_TETO);
    // nada se funde no branco: a mancha segue acima do texel mais claro da planície, em cada canal
    const planicie = [0, 0, 0];
    const mancha = [255, 255, 255];
    for (let k = 0; k < W * H; k += 1) {
      for (let c = 0; c < 3; c += 1) {
        const v = r.pixels[3 * k + c];
        if (pixels[3 * k] === 255) mancha[c] = Math.min(mancha[c], v);
        else planicie[c] = Math.max(planicie[c], v);
      }
    }
    for (let c = 0; c < 3; c += 1) expect(mancha[c]).toBeGreaterThan(planicie[c]);
    perto(r.medias[1], 0.85, 0.01);
    perto(r.medias[2], 0.85 * 0.95, 0.01);
  });

  it('é idempotente: passada de novo sobre o próprio resultado, o γ fica em 1 e nenhum byte muda mais de 1', () => {
    const casos = [
      [mapaColorido(5), { p0: 0.62, BG: 0.9, RG: 1.05, matiz: 'foto' }], // com teto
      [mapaColorido(5), { p0: 0.2, BG: 0.85, RG: 1.1, matiz: 'tinta' }],
      [mapaDeMetades(), { p0: 0.21, BG: 0.9, RG: 1.03, matiz: 'tinta', ancora: { razao: 9.5, ...METADES } }],
    ];
    for (const [pixels, alvo] of casos) {
      const um = nivelaMapa({ pixels, largura: W, altura: H, canais: 3, alvo });
      const dois = nivelaMapa({ pixels: um.pixels, largura: W, altura: H, canais: 3, alvo });
      expect(Math.abs(dois.gama - 1)).toBeLessThan(0.01);
      let pior = 0;
      for (let k = 0; k < um.pixels.length; k += 1) pior = Math.max(pior, Math.abs(um.pixels[k] - dois.pixels[k]));
      expect(pior).toBeLessThanOrEqual(1);
    }
  });

  it('pesa a média pela área, cos(latitude): polos claros e equador escuro dão o alvo na média por área, não na média por texel', () => {
    const pixels = new Uint8Array(W * H);
    for (let j = 0; j < H; j += 1) pixels.fill(Math.abs(j - H / 2) > H / 4 ? 200 : 50, j * W, (j + 1) * W);
    const r = nivelaMapa({ pixels, largura: W, altura: H, canais: 1, alvo: { p0: 0.2, BG: 1, RG: 1, matiz: 'tinta' } });
    let porArea = 0;
    let area = 0;
    let porTexel = 0;
    for (let j = 0; j < H; j += 1) {
      const lat = 90 - ((j + 0.5) * 180) / H;
      const v = LINEAR_DO_BYTE[r.pixels[3 * j * W + 1]];
      porArea += Math.cos((lat * Math.PI) / 180) * v;
      area += Math.cos((lat * Math.PI) / 180);
      porTexel += v / H;
    }
    perto(porArea / area, 0.2, 0.01);
    expect(porTexel / 0.2).toBeGreaterThan(1.15);
    perto(mediasPonderadas(r.pixels, W, H, 3)[1], porArea / area, 1e-9);
  });

  it('a segunda âncora fixa o γ: a razão das médias de G entre a região clara e a escura sai a medida, com a média em p0', () => {
    const ancora = { razao: 9.5, ...METADES };
    const r = nivelaMapa({ pixels: mapaDeMetades(), largura: W, altura: H, canais: 3, alvo: { p0: 0.21, BG: 0.9, RG: 1.03, matiz: 'tinta', ancora } });
    expect(r.gamaAntesDoTeto).toBeGreaterThan(1);
    expect(r.gama).toBe(r.gamaAntesDoTeto);
    perto(r.razaoDaAncora, 9.5, 0.02);
    perto(r.medias[1], 0.21, 0.01);
  });
});
