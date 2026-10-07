// Serve: lei — o relevo de Jápeto (item 230, J1): a crista no lugar e na altura do alvo, a cratera que a corta e a semente que se repete
// ============================================================
// Grade de 512×256 (o dobro do texel do app) para o juiz correr rápido; as
// bacias com nome que mais mexem na faixa equatorial vão inline, com o
// lugar e o diâmetro do Gazetteer (°E); as detectadas no mosaico vão como
// a detecção as entrega (uma em cima de Malprimis, que cede a ela; uma
// menor que 2 texels), longe da faixa da crista.
// ============================================================
import { describe, expect, it } from 'vitest';
import {
  LEI_DE_FORMA,
  RAIO_KM,
  alturaDaCrista,
  camadaDaCrista,
  geraRelevo,
  maximoDaFaixa,
  normalDoCampo,
  quantiza,
} from './relevo-japeto.mjs';
import { aplicaCratera, morfologia, sha256 } from './relevo-por-foto.mjs';

const W = 512;
const H = 256;
const NOMEADAS = [
  { nome: 'Abisme', lat: 37.5293, lonE: 267.082, diametroKm: 767.737 },
  { nome: 'Turgis', lat: 16.9, lonE: 331.6, diametroKm: 580 },
  { nome: 'Falsaron', lat: 33.8, lonE: 277.4, diametroKm: 424 },
  { nome: 'Malprimis', lat: -15.2, lonE: 241.8, diametroKm: 377 },
  { nome: 'Corsablis', lat: 0.9, lonE: 245.8, diametroKm: 73 },
];
const DETECTADAS = [
  { lat: -15, lonE: 242, diametro_km: 400, confianca: 0.8 },
  { lat: 40, lonE: 100, diametro_km: 60, confianca: 0.5 },
  { lat: -30, lonE: 20, diametro_km: 25, confianca: 0.4 },
  { lat: 30, lonE: 200, diametro_km: 12, confianca: 0.9 },
];
const relevo = (alturaMaximaKm, semente = 230) => geraRelevo({ largura: W, altura: H, semente, alturaMaximaKm, nomeadas: NOMEADAS, detectadas: DETECTADAS });
const A = relevo(15);
const B = relevo(20);

/** O máximo da faixa equatorial (±5°) só nas longitudes que `dentro` aceita. */
function maximoOnde(km, dentro) {
  let max = -Infinity;
  for (let j = 0; j < H; j++) {
    if (Math.abs(90 - ((j + 0.5) * 180) / H) > 5) continue;
    for (let i = 0; i < W; i++) {
      const lon = (180 + ((i + 0.5) * 360) / W) % 360;
      if (dentro(lon)) max = Math.max(max, km[j * W + i]);
    }
  }
  return max;
}

const k = (lat, lonE) => Math.round(((90 - lat) / 180) * H - 0.5) * W + Math.round(((((lonE - 180) % 360) + 360) % 360) / 360 * W - 0.5);

describe('relevo de Jápeto', () => {
  it('põe o ponto mais alto da faixa equatorial em 170–314°E, e não em 350→134°E, onde a crista de hoje está', () => {
    for (const r of [A, B]) {
      const max = maximoDaFaixa(r.km, W, H);
      expect(max.lonE).toBeGreaterThanOrEqual(170);
      expect(max.lonE).toBeLessThanOrEqual(314);
      const naCristaDeHoje = maximoOnde(r.km, (lon) => lon >= 350 || lon <= 134);
      expect(naCristaDeHoje).toBeLessThan(max.km - 3);
    }
  });

  it('leva a altura da crista ao alvo de cada candidato (±1 km), lida depois das crateras', () => {
    for (const [r, alvo] of [
      [A, 15],
      [B, 20],
    ]) {
      expect(Math.abs(alturaDaCrista(r.km, W, H).km - alvo)).toBeLessThanOrEqual(1);
      expect(Math.abs(maximoDaFaixa(r.km, W, H).km - alvo)).toBeLessThanOrEqual(1);
    }
  });

  it('dá os mesmos bytes de altura e de normal com a mesma semente, e outros com outra', () => {
    const hash = (r) => [sha256(quantiza(r.km).bytes), sha256(normalDoCampo(r.km, W, H).rgb)];
    expect(hash(relevo(20))).toEqual(hash(B));
    const outra = hash(relevo(20, 231));
    expect(outra[0]).not.toBe(hash(B)[0]);
    expect(outra[1]).not.toBe(hash(B)[1]);
  });

  it('rebaixa a crista onde uma cratera grande cai sobre ela: dentro da cavidade o cume some', () => {
    const { campo } = camadaDaCrista({ largura: W, altura: H, semente: 230, alturaMaximaKm: 20, caminho: null });
    const antes = campo.slice();
    aplicaCratera(campo, W, H, { lat: 0, lonE: 230, diametroKm: 150, morfologia: morfologia(150, 1, LEI_DE_FORMA) }, RAIO_KM);
    // no centro (com o pico central) e a meio raio, ao longo da crista
    const meioRaioGraus = (0.5 * 75 * 180) / (Math.PI * 745.7);
    for (const lon of [230, 230 + meioRaioGraus, 230 - meioRaioGraus]) {
      expect(antes[k(0, lon)]).toBeGreaterThan(10);
      expect(campo[k(0, lon)]).toBeLessThan(antes[k(0, lon)] - 8);
    }
    // longe da cratera a crista fica como estava
    expect(campo[k(0, 215)]).toBe(antes[k(0, 215)]);
  });
});
