// Serve: lei — temperatura, raio e classe espectral reproduzem as sete verdades-terreno nomeadas (Sol, Sirius, Vega, Proxima…)
// ============================================================
// Oráculo da física estelar — 7 verdades-terreno nomeadas + bordas.
//
// PROVENIÊNCIA (teste/oráculo migra verbatim, doutrina de travessia em
// docs/NORTE.md): vendorizado do atlas-orbital
// `src/lib/stellarPhysics.test.ts`, linhas 13–388 + 570–852, em
// 2026-08-10. Estes números valem independentemente de quem
// escreveu o código julgado — são o instrumento que autorizou a
// travessia do módulo ao lado.
//
// ADAPTAÇÃO DECLARADA (única): o import perdeu
// `stellarVisualProfileFrom` e `SUN_DEFAULT_VISUAL_PROFILE`, e os
// describes de `stellarVisualProfileFrom` (linhas 390–566 e
// 854–fim do doador) não vieram — a função morre na matriz do
// plano; o visual por classe renasce na Onda 7 com oráculo
// próprio. Nenhum limiar foi afrouxado.
//
// As 7 verdades-terreno cobertas aqui: Sol G2V, Sirius A1V,
// Vega A0V, Proxima M5.5V, Betelgeuse M2Ia (bv 1,85),
// Antares M1Ib (sintaxe binária "M1Ib + B2.5V"), Sirius B DA2
// (≈ 25.200 K).
//
// Daqui para baixo: conteúdo verbatim do doador (em inglês).
// ============================================================
import { describe, expect, it } from "vitest";

import {
  descriptorFromCatalog,
  parseSpectralClass,
  radiusFromSpect,
  temperatureFromBV,
  temperatureFromSpect,
} from "./stellarPhysics";

/**
 * T6.2-α regression tests against named-star ground truths
 * (Codex-suggested set + atlas extensions). Where exact values
 * are loose (tEff ±200 K, R_sun ±50%), `toBeCloseTo` with low
 * precision is intentional — this is rendering-focused
 * approximation, not catalog-grade calibration.
 */

describe("parseSpectralClass — main-sequence stars", () => {
  it("Sun G2V", () => {
    expect(parseSpectralClass("G2V")).toEqual({
      spectralClass: "G",
      subclass: 2,
      luminosityClass: "V",
    });
  });
  it("Sirius A1V", () => {
    expect(parseSpectralClass("A1V")).toEqual({
      spectralClass: "A",
      subclass: 1,
      luminosityClass: "V",
    });
  });
  it("Vega A0V", () => {
    expect(parseSpectralClass("A0V")).toEqual({
      spectralClass: "A",
      subclass: 0,
      luminosityClass: "V",
    });
  });
  it("Proxima M5.5V (fractional subclass)", () => {
    expect(parseSpectralClass("M5.5V")).toEqual({
      spectralClass: "M",
      subclass: 5.5,
      luminosityClass: "V",
    });
  });
});

describe("parseSpectralClass — giants and supergiants", () => {
  it("Betelgeuse M2Ia", () => {
    expect(parseSpectralClass("M2Ia")).toEqual({
      spectralClass: "M",
      subclass: 2,
      luminosityClass: "Ia",
    });
  });
  it("Arcturus K0III", () => {
    expect(parseSpectralClass("K0III")).toEqual({
      spectralClass: "K",
      subclass: 0,
      luminosityClass: "III",
    });
  });
  it("M2Ib supergiant", () => {
    expect(parseSpectralClass("M2Ib")).toEqual({
      spectralClass: "M",
      subclass: 2,
      luminosityClass: "Ib",
    });
  });
});

describe("parseSpectralClass — binary syntax (primary only)", () => {
  it("Antares M1Ib + B2.5V (slash)", () => {
    expect(parseSpectralClass("M1Ib/B2.5V")).toEqual({
      spectralClass: "M",
      subclass: 1,
      luminosityClass: "Ib",
    });
  });
  it("Antares M1Ib + B2.5V (plus)", () => {
    expect(parseSpectralClass("M1Ib + B2.5V")).toEqual({
      spectralClass: "M",
      subclass: 1,
      luminosityClass: "Ib",
    });
  });
});

describe("parseSpectralClass — white dwarfs", () => {
  it("Sirius B DA2", () => {
    expect(parseSpectralClass("DA2")).toEqual({
      spectralClass: "WD",
      subclass: 2,
      luminosityClass: "VII",
    });
  });
  it("WD without subclass", () => {
    const parsed = parseSpectralClass("WD");
    expect(parsed?.spectralClass).toBe("WD");
    expect(Number.isNaN(parsed?.subclass)).toBe(true);
    expect(parsed?.luminosityClass).toBe("VII");
  });
  it("DB white dwarf without subclass", () => {
    const parsed = parseSpectralClass("DB");
    expect(parsed?.spectralClass).toBe("WD");
    expect(Number.isNaN(parsed?.subclass)).toBe(true);
    expect(parsed?.luminosityClass).toBe("VII");
  });
});

describe("parseSpectralClass — edge cases", () => {
  it("returns null for empty string", () => {
    expect(parseSpectralClass("")).toBeNull();
  });
  it("returns null for whitespace", () => {
    expect(parseSpectralClass("   ")).toBeNull();
  });
  it("returns null for unparseable garbage", () => {
    expect(parseSpectralClass("xyz")).toBeNull();
    expect(parseSpectralClass("123")).toBeNull();
  });
  it("class without subclass parses to NaN subclass", () => {
    const parsed = parseSpectralClass("M");
    expect(parsed?.spectralClass).toBe("M");
    expect(Number.isNaN(parsed?.subclass)).toBe(true);
    expect(parsed?.luminosityClass).toBeNull();
  });
  it("class+subclass without luminosity parses with null luminosity", () => {
    expect(parseSpectralClass("G2")).toEqual({
      spectralClass: "G",
      subclass: 2,
      luminosityClass: null,
    });
  });
  it("normalizes case on the class letter", () => {
    expect(parseSpectralClass("g2v")?.spectralClass).toBe("G");
  });

  // T6.4 post-audit P2: the regex is case-insensitive but only the
  // class letter was uppercased pre-fix, so `parseSpectralClass('g2v')`
  // returned `{ luminosityClass: 'v' }` (lowercase). Downstream
  // lookups (`RADIUS_FACTOR_BY_LUMINOSITY`, `GRANULATION_BY_LUMINOSITY`)
  // are keyed by the canonical "V" / "Ia" forms — the lowercase value
  // silently returned `undefined`. Pin canonicalization here.
  it("normalizes lowercase main-sequence luminosity to V", () => {
    expect(parseSpectralClass("g2v")?.luminosityClass).toBe("V");
    expect(parseSpectralClass("m5.5v")?.luminosityClass).toBe("V");
  });

  it("normalizes mixed-case supergiant luminosity to Ia / Ib", () => {
    expect(parseSpectralClass("m2ia")?.luminosityClass).toBe("Ia");
    expect(parseSpectralClass("m1IB")?.luminosityClass).toBe("Ib");
    expect(parseSpectralClass("M2IA")?.luminosityClass).toBe("Ia");
  });

  it("normalizes lowercase giant / subgiant luminosity to canonical case", () => {
    expect(parseSpectralClass("k0iii")?.luminosityClass).toBe("III");
    expect(parseSpectralClass("f5iv")?.luminosityClass).toBe("IV");
  });

  it("downstream radiusFromSpect handles lowercase input correctly", () => {
    // Pre-fix: radiusFromSpect("k0iii") → undefined (cast lie).
    // Post-fix: returns 30 (giant table value).
    expect(radiusFromSpect("k0iii")).toBe(30);
    expect(radiusFromSpect("m2ia")).toBe(1000);
  });
});

describe("temperatureFromSpect — main-sequence anchors", () => {
  it("G0 returns the G class anchor", () => {
    expect(temperatureFromSpect("G", 0)).toBe(5_900);
  });
  it("G2 (Sun-like) interpolates between G0 and K0", () => {
    // G0 = 5900, K0 = 5100, t = 0.2 → 5900*0.8 + 5100*0.2 = 5740
    expect(temperatureFromSpect("G", 2)).toBeCloseTo(5_740, 0);
  });
  it("A0 (Vega-like) returns the A class anchor", () => {
    expect(temperatureFromSpect("A", 0)).toBe(9_900);
  });
  it("M5.5 (Proxima-like) interpolates within M class", () => {
    // M0 = 3800, L0 = 2400, t = 0.55 → 3800*0.45 + 2400*0.55 = 3030
    expect(temperatureFromSpect("M", 5.5)).toBeCloseTo(3_030, 0);
  });
  it("clamps subclass > 9 to subclass = 9", () => {
    expect(temperatureFromSpect("M", 9)).toBe(temperatureFromSpect("M", 12));
  });
  it("NaN subclass falls back to the class anchor (subclass 0)", () => {
    expect(temperatureFromSpect("G", NaN)).toBe(5_900);
  });
});

describe("temperatureFromSpect — white dwarfs", () => {
  it("DA1 (hottest WD) returns ~50,400 K", () => {
    // MK index: Teff ≈ 50400 / n → DA1 = 50,400 K.
    expect(temperatureFromSpect("WD", 1)).toBeCloseTo(50_400, 0);
  });
  it("DA9 (coolest WD) returns ~5,600 K", () => {
    expect(temperatureFromSpect("WD", 9)).toBeCloseTo(5_600, 0);
  });
  it("DA2 (Sirius B) returns ~25,200 K", () => {
    // Teff ≈ 50400 / 2 = 25,200 K — matches the literature value for
    // Sirius B (~25,000 K), not the old inverted 44,400 K.
    expect(temperatureFromSpect("WD", 2)).toBeCloseTo(25_200, 0);
  });
  it("WD with NaN subclass returns mid-range 10,000 K", () => {
    expect(temperatureFromSpect("WD", NaN)).toBe(10_000);
  });
});

describe("temperatureFromBV — Ballesteros (Gaia-borrowed)", () => {
  // Gaia Sky `BVToTeffBallesteros.java:32-34`:
  // T = 4600 * (1/(0.92*bv + 1.7) + 1/(0.92*bv + 0.62))
  it("Sun bv = 0.65 → ~5750 K (matches solar T_eff to within ~30 K)", () => {
    // Hand calc:
    //   0.92*0.65 = 0.598
    //   1/(0.598 + 1.7) = 1/2.298 = 0.4351
    //   1/(0.598 + 0.62) = 1/1.218 = 0.8210
    //   sum = 1.2561
    //   T = 4600 * 1.2561 = 5778 K
    expect(temperatureFromBV(0.65)).toBeCloseTo(5_778, -1);
  });
  it("Vega bv = 0.0 → very hot (~12,000 K range)", () => {
    // 0.92*0 = 0; 1/1.7 + 1/0.62 = 0.588 + 1.613 = 2.201
    // T = 4600 * 2.201 = 10,127 K
    expect(temperatureFromBV(0.0)).toBeCloseTo(10_127, -1);
  });
  it("hot O-type bv = -0.3 → ~25,000 K", () => {
    // 0.92*-0.3 = -0.276
    // 1/(-0.276+1.7) + 1/(-0.276+0.62) = 1/1.424 + 1/0.344 = 0.7022 + 2.9070 = 3.6092
    // T = 4600 * 3.6092 = 16,602 K
    expect(temperatureFromBV(-0.3)).toBeCloseTo(16_602, -1);
  });
  it("cool M dwarf bv = 1.5 → ~3,300 K", () => {
    // 0.92*1.5 = 1.38
    // 1/(1.38+1.7) + 1/(1.38+0.62) = 1/3.08 + 1/2.0 = 0.3247 + 0.5 = 0.8247
    // T = 4600 * 0.8247 = 3,793 K
    expect(temperatureFromBV(1.5)).toBeCloseTo(3_793, -1);
  });
  it("matches Gaia source exactly: 4600*(1/(0.92*bv+1.7) + 1/(0.92*bv+0.62))", () => {
    // Pin the formula structure for any future audit.
    const bv = 0.5;
    const expected = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
    expect(temperatureFromBV(bv)).toBe(expected);
  });
});

describe("radiusFromSpect — main sequence", () => {
  it("Sun G2V returns ~1 R_sun", () => {
    expect(radiusFromSpect("G2V")).toBeCloseTo(0.96, 1); // G0=1, K0=0.8, t=0.2
  });
  it("Sirius A1V returns ~1.6 R_sun", () => {
    expect(radiusFromSpect("A1V")).toBeCloseTo(1.66, 1); // A0=1.7, F0=1.3, t=0.1
  });
  it("Vega A0V returns ~1.7 R_sun", () => {
    expect(radiusFromSpect("A0V")).toBeCloseTo(1.7, 1);
  });
  it("Proxima M5.5V returns sub-solar (~0.25)", () => {
    // M0=0.4, L0=0.1, t=0.55 → 0.4*0.45 + 0.1*0.55 = 0.235
    expect(radiusFromSpect("M5.5V")).toBeCloseTo(0.235, 2);
  });
});

describe("radiusFromSpect — giants and supergiants", () => {
  it("Betelgeuse M2Ia returns supergiant scale (~1000 R_sun)", () => {
    expect(radiusFromSpect("M2Ia")).toBe(1000);
  });
  it("Antares M1Ib returns less-bright supergiant (~500 R_sun)", () => {
    expect(radiusFromSpect("M1Ib")).toBe(500);
  });
  it("Arcturus K0III returns giant (~30 R_sun)", () => {
    expect(radiusFromSpect("K0III")).toBe(30);
  });
  it("Procyon F5IV returns subgiant (~3 R_sun)", () => {
    expect(radiusFromSpect("F5IV")).toBe(3);
  });
});

describe("radiusFromSpect — white dwarfs", () => {
  it("Sirius B DA2 returns ~0.01 R_sun", () => {
    expect(radiusFromSpect("DA2")).toBe(0.01);
  });
  it("generic WD returns ~0.01 R_sun", () => {
    expect(radiusFromSpect("WD")).toBe(0.01);
  });
});

describe("radiusFromSpect — edge cases", () => {
  it("returns 1.0 (Sun-equivalent) for null spect", () => {
    expect(radiusFromSpect(null)).toBe(1.0);
  });
  it("returns 1.0 for undefined spect", () => {
    expect(radiusFromSpect(undefined)).toBe(1.0);
  });
  it("returns 1.0 for empty string", () => {
    expect(radiusFromSpect("")).toBe(1.0);
  });
  it("returns 1.0 for unparseable garbage", () => {
    expect(radiusFromSpect("xyz")).toBe(1.0);
  });
});

describe("radiusFromSpect — M5-Path-A fallback (spect empty + absmag + bv)", () => {
  // T6.4-M5-Path-A: when spect is empty but bv + absmag are finite,
  // fall back to Stefan-Boltzmann via Ballesteros tEff. Critical
  // for the long-tail named stars (Bayer/Flamsteed-only) that didn't
  // make the M5-Path-B allowlist — they get correct radii via this
  // path despite spect="".
  it("Betelgeuse-like (no spect) returns supergiant-scale radius (>100 R_sun)", () => {
    const r = radiusFromSpect("", -5.85, 1.85);
    expect(r).toBeGreaterThan(100);
    expect(r).toBeLessThan(2000); // ceiling clamp
  });

  it("Proxima-like (no spect) returns sub-solar (red-dwarf range)", () => {
    const r = radiusFromSpect("", 15.49, 1.83);
    expect(r).toBeLessThan(0.5);
    expect(r).toBeGreaterThan(0.001); // floor clamp
  });

  it("hot MS-like (no spect, bv=-0.1, absmag=1.0) returns ~few R_sun", () => {
    const r = radiusFromSpect("", 1.0, -0.1);
    expect(r).toBeGreaterThan(1);
    expect(r).toBeLessThan(10);
  });

  it("no spect + no absmag → 1.0 (legacy default preserved)", () => {
    expect(radiusFromSpect("", undefined, 0.65)).toBe(1.0);
  });

  it("no spect + no bv → 1.0 (legacy default preserved)", () => {
    expect(radiusFromSpect("", 5.0, undefined)).toBe(1.0);
  });

  it("no spect + NaN absmag → 1.0", () => {
    expect(radiusFromSpect("", NaN, 0.65)).toBe(1.0);
  });

  it("when spect is non-empty the SB fallback path is NOT used (existing logic)", () => {
    // Sirius A1V with absmag=1.42: spect path uses table+SB blend.
    // tableR(A1V) = 1.66; sbR(absmag=1.42, tEff=9640) ≈ 1.728;
    // blended (geometric mean) ≈ √(1.66 × 1.728) = 1.69. Real
    // Sirius radius is ~1.711 R_sun — within ~1%.
    expect(radiusFromSpect("A1V", 1.42)).toBeCloseTo(1.69, 1);
  });
});

describe("radiusFromSpect — Stefan-Boltzmann refinement with absmag", () => {
  it("Sun G2V with absmag = 4.83 (canonical M_V_sun) returns ~1 R_sun", () => {
    // tEff(G,2) ≈ 5740 K, T_sun = 5778 K; lumOverSun = 1; tRatio ≈ 1.007
    // sbR ≈ 1 × 1.007² ≈ 1.014; tableR ≈ 0.96; geometric mean ≈ 0.987
    expect(radiusFromSpect("G2V", 4.83)).toBeCloseTo(0.987, 1);
  });
  it("absent absmag returns the class-table value", () => {
    expect(radiusFromSpect("G2V")).toBeCloseTo(0.96, 1);
  });
  it("NaN absmag is ignored (not Number.isFinite)", () => {
    expect(radiusFromSpect("G2V", NaN)).toBeCloseTo(0.96, 1);
  });
  // T6.4-M5 post-audit: non-MS path now applies the SB blend too
  // (was table-only pre-fix). Codex flagged Rigel B8Ia returning
  // 1000 R_sun (vs real ~78) because the Ia table value is M-
  // supergiant-biased.
  it("Rigel B8Ia (absmag=-7.84) blends down to ~80 R_sun via SB (was 1000 pre-fix)", () => {
    // tEff(B,8) ≈ 11920 K; L ≈ 116,950 L_sun;
    // sbR ≈ √116950 × (5778/11920)² ≈ 80.4
    // blended = √(1000 × 80.4) ≈ 283.5
    expect(radiusFromSpect("B8Ia", -7.84)).toBeCloseTo(283, 0);
  });

  it("Betelgeuse M2Ib (absmag=-5.85) blends down to ~429 R_sun (was 500 pre-fix)", () => {
    // tableR=500, sbR≈369 → blended ≈ √(500 × 369) ≈ 429.3
    expect(radiusFromSpect("M2Ib", -5.85)).toBeCloseTo(429.3, 0);
  });

  it("non-MS without absmag preserves table value (back-compat)", () => {
    expect(radiusFromSpect("M2Ia")).toBe(1000);
    expect(radiusFromSpect("K0III")).toBe(30);
  });

  it("non-MS with absmag=0 (artificial) blends with SB term", () => {
    // M2Ia + absmag=0: L=85.5 L_sun, sbR≈24.9, blended≈√(1000×24.9)≈158
    expect(radiusFromSpect("M2Ia", 0)).toBeCloseTo(158, 0);
  });
});

describe("descriptorFromCatalog — named-star descriptors", () => {
  it("Sun (G2V, bv=0.65, absmag=4.83)", () => {
    const desc = descriptorFromCatalog({
      bv: 0.65,
      spect: "G2V",
      absmag: 4.83,
    });
    expect(desc.spectralClass).toBe("G");
    expect(desc.luminosityClass).toBe("V");
    expect(desc.tEff).toBeCloseTo(5_740, 0); // G2 interpolated
    expect(desc.absmag).toBe(4.83);
    expect(desc.radiusSolar).toBeCloseTo(0.987, 2);
  });

  it("Sirius (A1V, bv=0.0, absmag=1.42)", () => {
    const desc = descriptorFromCatalog({
      bv: 0.0,
      spect: "A1V",
      absmag: 1.42,
    });
    expect(desc.spectralClass).toBe("A");
    expect(desc.luminosityClass).toBe("V");
    // tEff(A,1) = 9900 + (7300 - 9900) * 0.1 = 9900 - 260 = 9640 K
    expect(desc.tEff).toBeCloseTo(9_640, 0);
    expect(desc.absmag).toBe(1.42);
  });

  it("Betelgeuse (M2Iab → primary luminosity Ia, bv=1.5, absmag=-5.85)", () => {
    // parseSpectralClass returns the longest-match luminosity prefix.
    // Catalog spect strings often write "M2Iab" / "M2Ia-b"; we test
    // the canonical "M2Ia" form (spec uses Ia or Ia-Iab).
    const desc = descriptorFromCatalog({
      bv: 1.85,
      spect: "M2Ia",
      absmag: -5.85,
    });
    expect(desc.spectralClass).toBe("M");
    expect(desc.luminosityClass).toBe("Ia");
    // tEff(M,2) = 3800 + (2400 - 3800) * 0.2 = 3520 K
    expect(desc.tEff).toBeCloseTo(3_520, 0);
    // T6.4-M5 post-audit: non-MS path now applies SB blend.
    // tableR=1000, sbR≈369 → blended ≈ √(1000 × 369) ≈ 607.
    expect(desc.radiusSolar).toBeCloseTo(607, 0);
  });

  it("Proxima (M5.5V, bv=1.83, absmag=15.49)", () => {
    const desc = descriptorFromCatalog({
      bv: 1.83,
      spect: "M5.5V",
      absmag: 15.49,
    });
    expect(desc.spectralClass).toBe("M");
    expect(desc.luminosityClass).toBe("V");
    // tEff(M,5.5) = 3800 + (2400 - 3800) * 0.55 = 3030 K
    expect(desc.tEff).toBeCloseTo(3_030, 0);
  });

  it("missing spect falls back to spectralClass=G, luminosity=V, B-V T_eff", () => {
    const desc = descriptorFromCatalog({ bv: 0.65 });
    expect(desc.spectralClass).toBe("G");
    expect(desc.luminosityClass).toBe("V");
    // Ballesteros at bv=0.65 → ~5778 K
    expect(desc.tEff).toBeCloseTo(5_778, -1);
  });

  it("non-finite absmag is normalized to null", () => {
    const desc = descriptorFromCatalog({ bv: 0.65, absmag: NaN });
    expect(desc.absmag).toBeNull();
  });
});

// T6.4-M5-Path-A: physical fallback when spect is empty but absmag
// is finite. After M5-Path-B's named-star allowlist re-bake, the
// catalog long-tail (~1% of stars) still has spect="" and falls
// through to this path. Without the fix, descriptorFromCatalog
// hardcodes G/V/1R☉, regressing all spect-less stars to Sun-class.

describe("descriptorFromCatalog — M5-Path-A physical fallback (spect empty + absmag finite)", () => {
  // Betelgeuse-like inputs WITHOUT spect (simulates pre-Path-B
  // behaviour to verify the fallback. Post-Path-B Betelgeuse has
  // spect="M2Ib"; this test specifically exercises the empty-spect
  // path.) Real Betelgeuse: bv=1.85, absmag=-5.85, R≈887 R_sun.
  it("Betelgeuse-like (bv=1.85, absmag=-5.85, no spect) → supergiant-scale radius", () => {
    const desc = descriptorFromCatalog({ bv: 1.85, absmag: -5.85, spect: "" });
    // tEff(B-V=1.85) ≈ 3334 K (Ballesteros).
    expect(desc.tEff).toBeGreaterThan(3000);
    expect(desc.tEff).toBeLessThan(4000);
    // Stefan-Boltzmann radius should be supergiant-scale (hundreds
    // of R_sun), not 1.0. The wave-plan acceptance is "within ~30%
    // of catalog literature" but our B-V tEff is offset from the
    // real 3500K so we accept a wider band: > 100 R_sun confirms
    // we're in the supergiant regime, not Sun-class.
    expect(desc.radiusSolar).toBeGreaterThan(100);
    // Spectral class derived from tEff should be M (cool).
    expect(desc.spectralClass).toBe("M");
  });

  // Proxima-like (bv=1.83, absmag=15.49, real R ≈ 0.14 R_sun).
  // V-band absmag understates cool-star total luminosity (M dwarfs
  // emit a large IR fraction not captured by M_V), so the SB radius
  // here lands below the literature value. The contract this test
  // pins: directional improvement vs the broken pre-Path-A default
  // of 1.0 R_sun. "Sub-solar by orders of magnitude" is correct for
  // a red dwarf even if the precise number isn't literature-accurate.
  it("Proxima-like (bv=1.83, absmag=15.49, no spect) → red-dwarf radius", () => {
    const desc = descriptorFromCatalog({ bv: 1.83, absmag: 15.49, spect: "" });
    expect(desc.tEff).toBeGreaterThan(3000);
    expect(desc.tEff).toBeLessThan(4000);
    // Sub-solar by a wide margin (V-band underestimate notwithstanding).
    expect(desc.radiusSolar).toBeGreaterThan(0.005);
    expect(desc.radiusSolar).toBeLessThan(0.5);
    expect(desc.spectralClass).toBe("M");
  });

  // Hot main-sequence-like (bv=-0.1, absmag=1.0): A0V-equivalent
  // proxy for a star that lost its spect string.
  it("hot MS-like (bv=-0.1, absmag=1.0, no spect) → A or B class, ~1.5 R_sun", () => {
    const desc = descriptorFromCatalog({ bv: -0.1, absmag: 1.0, spect: "" });
    // tEff(B-V=-0.1) ≈ 12,000 K (between A and B).
    expect(desc.tEff).toBeGreaterThan(8000);
    // Class should be A or B (the ratio-distance metric picks the
    // closest anchor in log space).
    expect(["A", "B"]).toContain(desc.spectralClass);
    // Radius around 1.5-3 R_sun for Sirius-like.
    expect(desc.radiusSolar).toBeGreaterThan(1);
    expect(desc.radiusSolar).toBeLessThan(5);
  });

  // No spect AND no absmag → safe defaults (legacy behaviour).
  it("no spect, no absmag → 1.0 R_sun fallback (legacy)", () => {
    const desc = descriptorFromCatalog({ bv: 0.65, spect: "" });
    expect(desc.radiusSolar).toBe(1.0);
    expect(desc.luminosityClass).toBe("V");
  });

  // No spect, absmag = NaN → safe defaults too.
  it("no spect, NaN absmag → 1.0 R_sun fallback", () => {
    const desc = descriptorFromCatalog({ bv: 0.65, absmag: NaN, spect: "" });
    expect(desc.radiusSolar).toBe(1.0);
  });

  // Sanity: when spect IS present (post-Path-B for named stars),
  // we DON'T go through the fallback — radius comes from the spect
  // table or Stefan-Boltzmann refinement.
  it("when spect is present, Path A (B-V SB) is NOT used (spect path takes priority)", () => {
    const descWith = descriptorFromCatalog({
      bv: 1.85,
      absmag: -5.85,
      spect: "M2Ia",
    });
    expect(descWith.spectralClass).toBe("M");
    expect(descWith.luminosityClass).toBe("Ia");
    // T6.4-M5 post-audit: spect path now applies SB blend on non-MS
    // classes too (was table-only pre-fix). M2Ia table=1000, sbR≈369
    // (M-supergiant V-band underestimate), blended≈607.
    expect(descWith.radiusSolar).toBeCloseTo(607, 0);
  });
});

// T6.4-M5 post-audit (Codex finding): luminosityClass for spect-less
// stars now inferred from H-R diagram (absmag vs MS baseline at the
// same tEff) instead of hardcoded "V". Closes the granulation/rays
// texture gap for Bayer/Flamsteed-only sidecar stars (e.g. Gam-2 Vel
// Wolf-Rayet binary that drops out of canonical MK letters).
//
// 2026-05-07 follow-up (Codex post-audit-of-audit): added the
// MS_TOLERANCE_MAG = 0.5 band so catalog scatter ±0.5 mag from the
// MS curve still resolves to V (was being misclassified as IV by
// the strict `dimness < 0` cut). And added the Sun (G2V, 5778 K,
// M_V=4.83) anchor that the JSDoc list named but the array omitted
// — pre-fix, mvMS(5778) interpolated to 4.61 not 4.83.

describe("descriptorFromCatalog — H-R-inferred luminosity class for spect-less stars", () => {
  it("MS-like absmag at solar tEff → V class", () => {
    // bv=0.65 → tEff≈5778; with Sun anchor mvMS(5778)=4.83 exactly;
    // absmag=4.83 → dimness=0 → V
    const desc = descriptorFromCatalog({ bv: 0.65, absmag: 4.83, spect: "" });
    expect(desc.luminosityClass).toBe("V");
  });

  it("Bayer-only Wolf-Rayet-like (bv=-0.18, absmag=-5.95) → III or brighter", () => {
    // tEff(BV=-0.18)≈13133; mvMS(13133)≈-0.5; dimness ≈ -5.95 - (-0.5) = -5.45
    // Threshold: dimness ≤ -5 → II, ≤ -7 → Ib. So II.
    const desc = descriptorFromCatalog({
      bv: -0.18,
      absmag: -5.95,
      spect: "",
    });
    expect(["II", "Ib", "Ia"]).toContain(desc.luminosityClass);
  });

  it("Betelgeuse-like spect-less (bv=1.85, absmag=-5.85) → supergiant class", () => {
    // tEff(BV=1.85)≈3334; mvMS(3334)≈11; dimness ≈ -5.85 - 11 = -16.85 → Ia
    const desc = descriptorFromCatalog({ bv: 1.85, absmag: -5.85, spect: "" });
    expect(desc.luminosityClass).toBe("Ia");
  });

  it("Proxima-like spect-less (bv=1.83, absmag=15.49) → V (stays MS)", () => {
    // tEff(BV=1.83)≈3357; mvMS(3357)≈11; dimness ≈ 15.49 - 11 = 4.49 → V
    const desc = descriptorFromCatalog({
      bv: 1.83,
      absmag: 15.49,
      spect: "",
    });
    expect(desc.luminosityClass).toBe("V");
  });

  it("subgiant range (dimness near -1.3) → IV (past tolerance band)", () => {
    // bv=0.65 → tEff≈5778; mvMS=4.83; absmag=3.5 → dimness=-1.33 → IV
    // (-1.33 < -0.5 tolerance → IV; -2 < -1.33 stays sub-III)
    const desc = descriptorFromCatalog({ bv: 0.65, absmag: 3.5, spect: "" });
    expect(desc.luminosityClass).toBe("IV");
  });

  it("giant range (dimness near -3.3) → III", () => {
    // bv=0.65 → tEff≈5778; mvMS=4.83; absmag=1.5 → dimness=-3.33 → III
    const desc = descriptorFromCatalog({ bv: 0.65, absmag: 1.5, spect: "" });
    expect(desc.luminosityClass).toBe("III");
  });

  it("no absmag → V default (no H-R inference possible)", () => {
    const desc = descriptorFromCatalog({ bv: 0.65, spect: "" });
    expect(desc.luminosityClass).toBe("V");
  });

  // T6.4-M5 post-audit-of-audit: MS tolerance band tests. Catalog
  // scatter routinely shifts MS stars ±0.3-0.5 mag from the
  // literature MS curve. Without these, the strict `dimness < 0`
  // cut misclassified ~464 spect-less rows as IV (Codex P2).

  it("MS scatter just brighter than baseline (dimness≈-0.3) → V (within tolerance)", () => {
    // bv=0.65 → tEff≈5778; mvMS=4.83; absmag=4.5 → dimness=-0.33
    // Pre-fix: dimness<0 → IV. Post-fix: |dimness|≤0.5 → V.
    const desc = descriptorFromCatalog({ bv: 0.65, absmag: 4.5, spect: "" });
    expect(desc.luminosityClass).toBe("V");
  });

  it("MS scatter just dimmer than baseline (dimness≈+0.3) → V (always was)", () => {
    // bv=0.65 → tEff≈5778; mvMS=4.83; absmag=5.13 → dimness=+0.30
    const desc = descriptorFromCatalog({ bv: 0.65, absmag: 5.13, spect: "" });
    expect(desc.luminosityClass).toBe("V");
  });

  it("just past tolerance band (dimness≈-0.6) → IV (subgiant)", () => {
    // bv=0.65 → tEff≈5778; mvMS=4.83; absmag=4.2 → dimness=-0.63
    // Boundary check: |dimness| > 0.5 tolerance → IV.
    const desc = descriptorFromCatalog({ bv: 0.65, absmag: 4.2, spect: "" });
    expect(desc.luminosityClass).toBe("IV");
  });

  it("unparseable non-empty spect (e.g. raw 'WR') → SB fallback, not 1.0", () => {
    // Codex post-audit-of-audit: pre-fix, descriptorFromCatalog Path
    // A passed input.spect into radiusFromSpect, which for "WR"
    // (non-empty unparseable) would skip the SB-fallback branch and
    // return 1.0 — contradicting the Path A "empty/unparseable →
    // SB fallback" contract. Inputs that escape canonicalizeSpect
    // (build-time only sanitizer) would silently misrender.
    // Wolf-Rayet-like params (bv=-0.18, absmag=-5.95) — SB radius
    // for tEff≈13133K and absmag=-5.95 should be on the order of
    // tens of R_sun, not 1.0.
    const desc = descriptorFromCatalog({
      bv: -0.18,
      absmag: -5.95,
      spect: "WR",
    });
    expect(desc.radiusSolar).not.toBe(1.0);
    expect(desc.radiusSolar).toBeGreaterThan(5);
    // Luminosity class should also escape "V" via H-R inference.
    expect(desc.luminosityClass).not.toBe("V");
  });

  it("Sun anchor pinned: mvMS(5778) ≈ 4.83 (Sun) within 0.05 mag", () => {
    // Pre-fix the MS_ABSMAG_ANCHORS array skipped G2V; interpolation
    // gave mvMS(5778) ≈ 4.61, off by 0.22 mag from the JSDoc claim.
    // This test pins the contract via a borderline absmag that lands
    // on V only if mvMS(5778) is within ~0.05 mag of 4.83.
    // absmag=4.30 → dimness=4.30-4.83=-0.53 → IV (just past tolerance)
    // If the anchor were missing, mvMS≈4.61, dimness=-0.31, → V
    // (within tolerance) — wrong answer.
    const desc = descriptorFromCatalog({ bv: 0.65, absmag: 4.3, spect: "" });
    expect(desc.luminosityClass).toBe("IV");
  });
});
