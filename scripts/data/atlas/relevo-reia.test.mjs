// Serve: lei — o relevo de Reia (PLAN-REIA.md, R2): a base é o DTM medido, a cratera fina só completa o que falta, o filtro barra o que o DTM já tem, e a mesma entrada dá os mesmos bytes
// ============================================================
// A base real (Tirawa) só roda onde o TIFF pinado está no cache (a máquina
// do dono); as outras usam campos sintéticos na grade de 2048 (o texel de
// 2,3 km desenha a tigela de 20 km).
// ============================================================
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { amostraBilinear } from './relevo-inventado.mjs';
import { COMPLETAR, DTM, LEI_DE_FORMA, RAIO_KM, X_KM, filtraDetectadas, geraRelevo, normalDoCampo, quantiza, relevoDoDtm } from './relevo-reia.mjs';
import { completaCratera, morfologia, paraCadaTexelDaCalota, perfilGasto, profundidadeBordaFundo, sha256 } from './relevo-por-foto.mjs';

const W = 2048;
const H = 1024;
const RAD = Math.PI / 180;
const ARQUIVO_DO_DTM = new URL(`../../../${DTM.arquivo}`, import.meta.url);

/** A média em volta (72 rumos) a `sKm` do centro, bilinear no campo. */
function mediaEmVolta(km, lat, lonE, sKm) {
  const grade = { metros: km, vazio: new Uint8Array(0), largura: W, altura: H };
  if (sKm === 0) return amostraBilinear(grade, lat * RAD, lonE);
  let soma = 0;
  for (let a = 0; a < 72; a += 1) {
    const t = (a * 5 * Math.PI) / 180;
    const d = sKm / RAIO_KM;
    const f = Math.asin(Math.sin(lat * RAD) * Math.cos(d) + Math.cos(lat * RAD) * Math.sin(d) * Math.cos(t));
    const l = lonE + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(lat * RAD), Math.cos(d) - Math.sin(lat * RAD) * Math.sin(f)) / RAD;
    soma += amostraBilinear(grade, f, l);
  }
  return soma / 72;
}

const cratera = (D, lat = 10, lonE = 100) => {
  const m = morfologia(D, 1, LEI_DE_FORMA);
  return { lat, lonE, diametroKm: D, morfologia: m, perfil: perfilGasto(m, 0.1) };
};

describe('relevo de Reia', () => {
  it.runIf(existsSync(ARQUIVO_DO_DTM))('a base reproduz Tirawa como R1 a mediu no DTM: domo central +4,5 e vale anelar −2,0 km (±0,3)', () => {
    const bytes = readFileSync(ARQUIVO_DO_DTM);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(DTM.sha256);
    const km = relevoDoDtm(bytes, W, H);
    const [lat, lonE] = [34.77, 205.38];
    expect(Math.abs(mediaEmVolta(km, lat, lonE, 0) - 4.49)).toBeLessThanOrEqual(0.3);
    const vale = Math.min(...Array.from({ length: 17 }, (_, k) => mediaEmVolta(km, lat, lonE, 100 + 5 * k)));
    expect(Math.abs(vale + 2.04)).toBeLessThanOrEqual(0.3);
  });

  it('completaCratera não soma por cima de cavidade que já tem a lei, completa o chão liso até a lei e não confunde declive com cavidade', () => {
    const c = cratera(20);
    const R = c.diametroKm / 2;
    // uma cavidade 1,2× a lei já no campo: nada muda
    const fundo = new Float64Array(W * H);
    paraCadaTexelDaCalota(c.lat, c.lonE, 1.5 * R, W, H, RAIO_KM, (k, rKm) => {
      fundo[k] += 1.2 * c.perfil(rKm / R);
    });
    const antes = sha256(new Uint8Array(fundo.buffer));
    expect(completaCratera(fundo, W, H, c, RAIO_KM, COMPLETAR).fator).toBe(0);
    expect(sha256(new Uint8Array(fundo.buffer))).toBe(antes);
    // chão liso: a cavidade inteira, e o campo fica com a profundidade da lei (±10 %)
    const liso = new Float64Array(W * H);
    const r = completaCratera(liso, W, H, c, RAIO_KM, COMPLETAR);
    expect(r.fator).toBe(1);
    const grade = { metros: liso, vazio: new Uint8Array(0), largura: W, altura: H };
    const medida = profundidadeBordaFundo((rho, rumo) => {
      const d = (rho * R) / RAIO_KM;
      const f = Math.asin(Math.sin(c.lat * RAD) * Math.cos(d) + Math.cos(c.lat * RAD) * Math.sin(d) * Math.cos(rumo));
      return amostraBilinear(grade, f, c.lonE + Math.atan2(Math.sin(rumo) * Math.sin(d) * Math.cos(c.lat * RAD), Math.cos(d) - Math.sin(c.lat * RAD) * Math.sin(f)) / RAD);
    }, COMPLETAR.instrumento);
    expect(Math.abs(medida / r.leiKm - 1)).toBeLessThanOrEqual(0.1);
    expect(r.leiKm / c.diametroKm).toBeGreaterThan(0.06);
    // um plano inclinado a 3° não é cavidade: falta quase a lei inteira
    const inclinado = Float64Array.from({ length: W * H }, (_, k) => Math.tan(3 * RAD) * ((k % W) * ((2 * Math.PI * RAIO_KM) / W) * Math.cos(c.lat * RAD)));
    expect(completaCratera(inclinado, W, H, c, RAIO_KM, COMPLETAR).fator).toBeGreaterThan(0.9);
  });

  it('o filtro deixa de fora a de X km ou mais, a de diâmetro desconhecido e o mesmo anel em outro raio', () => {
    const det = [
      { lat: 0, lonE: 10, diametro_km: 12, confianca: 0.9 },
      { lat: 0, lonE: 30, diametro_km: X_KM, confianca: 0.9 },
      { lat: 0, lonE: 50, diametro_km: 0, confianca: 0.9 },
      { lat: 0, lonE: 60, confianca: 0.9 },
      { lat: 20, lonE: 80, diametro_km: 40, confianca: 0.5 },
      { lat: 20, lonE: 80.3, diametro_km: 24, confianca: 0.8 },
      { lat: 20, lonE: 81, diametro_km: 8, confianca: 0.8 },
    ];
    const { entram, excluidas } = filtraDetectadas(det);
    expect(entram.map((d) => d.lonE)).toEqual([10, 81]);
    expect(excluidas.xOuMais.map((d) => d.lonE)).toEqual([30, 80]);
    expect(excluidas.diametroDesconhecido.map((d) => d.lonE)).toEqual([50, 60]);
    expect(excluidas.duplicata.map((d) => d.lonE)).toEqual([80.3]);
  });

  it('dá os mesmos bytes de altura e de normal com a mesma entrada, e outros sem as crateras finas', () => {
    const base = Float64Array.from({ length: W * H }, (_, k) => Math.sin((k % W) / 97) + Math.cos(Math.floor(k / W) / 61));
    const det = [
      { lat: 5, lonE: 120, diametro_km: 22, confianca: 0.7 },
      { lat: -30, lonE: 200, diametro_km: 9, confianca: 0.5 },
      { lat: 60, lonE: 300, diametro_km: 14, confianca: 0.4 },
    ];
    const faixa = { min: -3, max: 3 };
    const hash = (detectadas) => {
      const r = geraRelevo({ largura: W, altura: H, dtmKm: base, detectadas });
      return [sha256(quantiza(r.km, faixa).bytes), sha256(normalDoCampo(r.km, W, H, faixa).rgb)];
    };
    const um = hash(det);
    expect(hash(det)).toEqual(um);
    expect(hash([])[0]).not.toBe(um[0]);
  });
});
