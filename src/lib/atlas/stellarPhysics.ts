// ============================================================
// Física estelar pura — parser MK, temperatura efetiva, luminosidade
// visual, raio e o descritor visual por estrela.
//
// PROVENIÊNCIA (runtime que MIGRA pela exceção das duas provas,
// doutrina de travessia em docs/NORTE.md; linha da matriz em
// `git show 923dc20:docs/PLANO-ATLAS.md` §2): vendorizado VERBATIM do
// atlas-orbital `src/lib/stellarPhysics.ts`, subconjunto linhas
// 54–527 + 584–868, em 2026-08-10. TS puro: o subconjunto não tem
// UMA importação — os três `import` do topo do doador alimentavam
// só `stellarVisualProfileFrom`, que fica de fora. Oráculo: as 7
// verdades-terreno nomeadas em `stellarPhysics.test.ts` ao lado
// (Sol G2V, Sirius A1V, Vega A0V, Proxima M5.5V, Betelgeuse M2Ia,
// Antares M1Ib em sintaxe binária, Sirius B DA2 ≈ 25.200 K).
//
// FICA DE FORA (adaptações declaradas, §0 do plano):
// - o cabeçalho T6.2-α do doador (linhas 1–45) e os imports (47–52):
//   descreviam escopo de ondas do atlas e módulos que morrem aqui;
// - `stellarVisualProfileFrom` e toda a cauda 870–1183 (hue de
//   rays/flares, granulação por classe, glow): morta na matriz do
//   plano — a cor da casa vem da lei de cor única (`bvToColor`,
//   Onda 1) e o visual por classe renasce na Onda 7 com o motor
//   estelar;
// - `massFromSpectAbsmag` (linhas 529–582): exportada e SEM teste
//   no doador, sem consumidor nomeado na matriz — exclusão
//   declarada na ata da Onda 2. Um marcador no corpo diz onde ela
//   estava.
// Helpers que o doador mantém privados (`mvMSEstimate`,
// `inferLuminosityClass`, `radiusFromAbsmagBvFallback`) continuam
// privados aqui — a superfície exportada é a mesma do subconjunto.
//
// CONTRATO DE ENTRADA: `{ bv, spect?, absmag? }` — `absmag` é M_V
// (magnitude absoluta na banda V, o `absmag` do HYG). O `sc1` da
// viagem carrega `ci` (= B−V) e `logLum`; quem parte de `logLum`
// converte M_V = 4,83 − 2,5·log10(L_V) antes de chamar.
//
// CICATRIZES PRESERVADAS (cada uma comprou a linha estranha que a
// acompanha no corpo):
// - temperatura de anã branca é RECÍPROCA (Teff ≈ 50400/n), não
//   interpolação linear — a linear dava DA2 ≈ 44.400 K, quase o
//   dobro do real;
// - `normalizeLuminosity`: a regex é case-insensitive e devolvia
//   "v"/"ia" minúsculos, e as tabelas por classe retornavam
//   `undefined` apesar do cast;
// - `radiusFromAbsmagBvFallback` é forward-referenced de
//   `radiusFromSpect` — ordem do doador mantida; o comentário no
//   local explica por que a referência adiantada é segura;
// - Path-A passa `null` (não o spect cru) a `radiusFromSpect`,
//   para que um spect não-vazio inparseável ("WR") caia no
//   fallback Stefan-Boltzmann em vez do default 1.0.
//
// Daqui para baixo: conteúdo verbatim do doador (em inglês).
// ============================================================

// ─── Spectral classification ─────────────────────────────────────

/**
 * MK (Morgan-Keenan) spectral type — the major class letter.
 * Ordered hot → cool. Plus white-dwarf ("WD") and pre-parsed
 * white-dwarf subtypes (DA, DB, DO, DC, DZ, DQ).
 */
export type SpectralClass =
  | "O"
  | "B"
  | "A"
  | "F"
  | "G"
  | "K"
  | "M"
  | "L" // brown dwarf, very cool
  | "T" // brown dwarf, methane
  | "Y" // ultra-cool brown dwarf
  | "WD"; // generic white dwarf

/**
 * Luminosity class (MK system). Roman numerals; we keep them as
 * uppercase strings since some catalog entries write "Ia" /
 * "Ib" with subdivisions. Default `null` means unspecified
 * (treated as main-sequence "V" for radius math, but kept
 * distinct in the parsed result so downstream code can detect
 * absence).
 */
export type LuminosityClass =
  | "0" // hypergiant (rare)
  | "Ia" // bright supergiant
  | "Ib" // less bright supergiant
  | "I" // generic supergiant
  | "II" // bright giant
  | "III" // giant
  | "IV" // subgiant
  | "V" // main sequence (dwarf)
  | "VI" // subdwarf
  | "VII"; // white dwarf

export interface ParsedSpectralClass {
  /** Major MK class letter, or "WD" for white dwarfs. */
  spectralClass: SpectralClass;
  /** Subclass digit 0-9. NaN when not specified (e.g. "M" alone). */
  subclass: number;
  /** Luminosity class, or `null` if not in the input string. */
  luminosityClass: LuminosityClass | null;
}

/**
 * Parse an HYG / SIMBAD-style spectral classification string into
 * its components. Handles:
 *
 *   "G2V"            → { class: "G", subclass: 2, luminosity: "V" }
 *   "A1V"            → { class: "A", subclass: 1, luminosity: "V" }
 *   "M5.5V"          → { class: "M", subclass: 5.5, luminosity: "V" }
 *   "M2Ib"           → { class: "M", subclass: 2, luminosity: "Ib" }
 *   "M1Ib + B2.5V"   → { class: "M", subclass: 1, luminosity: "Ib" }  (primary only)
 *   "DA2"            → { class: "WD", subclass: 2, luminosity: "VII" }
 *   "WD"             → { class: "WD", subclass: NaN, luminosity: "VII" }
 *   "K0III"          → { class: "K", subclass: 0, luminosity: "III" }
 *   ""               → null
 *
 * Binary stars: keeps the **primary** (first) component only.
 * Catalog conventions like "G2V/M3V" or "M1Ib + B2.5V" both
 * resolve to the primary; the secondary is dropped (T6 wave's
 * MVP doesn't render binary companions).
 *
 * Whitespace-trim then case-normalize the class letter to upper;
 * subclass digit and luminosity class stay as parsed. Returns
 * `null` for empty / unparseable input — caller must fall back
 * to B-V via `stellarVisualProfileFrom`.
 */
export const parseSpectralClass = (
  spect: string
): ParsedSpectralClass | null => {
  if (!spect) return null;

  // Strip leading whitespace, take everything before the first
  // " " / "+" / "/" boundary so binary-component syntax resolves
  // to the primary. Empty-after-trim → null.
  const primary = spect
    .trim()
    .split(/\s*[+/]\s*/)[0]
    ?.split(/\s+/)[0]
    ?.trim();
  if (!primary) return null;

  // White-dwarf shortcuts. "WD" alone → no subclass / fixed VII.
  if (/^WD$/i.test(primary)) {
    return { spectralClass: "WD", subclass: NaN, luminosityClass: "VII" };
  }

  // White-dwarf with composition + temperature digit, e.g. "DA2",
  // "DB", "DZA", etc. Pattern: starts with D, followed by 1-2
  // composition letters, optionally a number. Always luminosity
  // class VII.
  const wdMatch = primary.match(/^D[A-Z]{0,2}(\d+(?:\.\d+)?)?$/i);
  if (wdMatch) {
    const sub = wdMatch[1] ? Number(wdMatch[1]) : NaN;
    return { spectralClass: "WD", subclass: sub, luminosityClass: "VII" };
  }

  // Standard MK pattern: <letter><digit><luminosity>?
  // Letter ∈ {O, B, A, F, G, K, M, L, T, Y}. Subclass digit
  // 0-9 with optional fractional part (M5.5). Luminosity class
  // optional; matched longest-prefix (Ia/Ib/II/III/IV/VI/VII/V).
  const mkMatch = primary.match(
    /^([OBAFGKMLTY])(\d+(?:\.\d+)?)?(0|Ia|Ib|VII|VI|IV|III|II|I|V)?/i
  );
  if (!mkMatch) return null;

  const classLetter = mkMatch[1].toUpperCase() as Exclude<SpectralClass, "WD">;
  const subclass = mkMatch[2] !== undefined ? Number(mkMatch[2]) : NaN;
  // T6.4 post-audit P2: the regex is case-insensitive so we accept
  // "g2v" / "M2ia" alongside the canonical "G2V" / "M2Ia". The
  // class letter is uppercased above; the luminosity class needs
  // the same canonicalization or downstream lookups
  // (`RADIUS_FACTOR_BY_LUMINOSITY`, `GRANULATION_BY_LUMINOSITY`)
  // miss and return `undefined` despite the type cast.
  const luminosityClass = mkMatch[3] ? normalizeLuminosity(mkMatch[3]) : null;

  return { spectralClass: classLetter, subclass, luminosityClass };
};

/**
 * Canonicalize a parsed luminosity-class token to the exact
 * casing of `LuminosityClass`. Roman numerals are case-insensitive
 * in MK notation; "Ia" / "Ib" mix upper- and lower-case so a
 * blanket `.toUpperCase()` would yield "IA" / "IB" which are not
 * keys in `LuminosityClass`. The helper handles both shapes.
 */
const normalizeLuminosity = (raw: string): LuminosityClass => {
  const u = raw.toUpperCase();
  if (u === "IA") return "Ia";
  if (u === "IB") return "Ib";
  return u as LuminosityClass;
};

// ─── Effective temperature ────────────────────────────────────────

/**
 * MK effective-temperature lookup table (Kelvin), midpoints per
 * major class. Source: standard astrophysics references — Allen's
 * Astrophysical Quantities (4th ed.) + Habets & Heintze 1981 for
 * giants/supergiants; Burrows et al. 2001 for L/T/Y brown dwarfs.
 * Subclass interpolation is linear within the bracket; class
 * boundaries are the published anchor points.
 *
 * Atlas opinion: linear interpolation along subclass digit (0-9)
 * within each class. Real MK calibration is non-linear but the
 * difference is < 5% within a class — within the noise of the
 * Ballesteros fallback path that's used when `spect` is absent.
 *
 * Anchors for class C (subclass 0) and the next class C' (subclass
 * 0). Values for "subclass 5" interpolate between the two anchors.
 * Subclass 9 of class C is approximated as 90% of the way to
 * class C' subclass 0.
 */
const MK_TEMP_ANCHORS_K: Record<Exclude<SpectralClass, "WD">, number> = {
  O: 40_000, // O0 anchor (very hot)
  B: 20_000, // B0 anchor
  A: 9_900, // A0 anchor (Vega ~9700 K, this is the class anchor)
  F: 7_300, // F0 anchor
  G: 5_900, // G0 anchor (Sun is G2 ≈ 5778 K)
  K: 5_100, // K0 anchor
  M: 3_800, // M0 anchor
  L: 2_400, // L0 anchor (brown dwarfs)
  T: 1_400, // T0 anchor
  Y: 500, // Y0 anchor (ultra-cool)
};

const MK_CLASS_ORDER: ReadonlyArray<Exclude<SpectralClass, "WD">> = [
  "O",
  "B",
  "A",
  "F",
  "G",
  "K",
  "M",
  "L",
  "T",
  "Y",
];

/**
 * Effective temperature in Kelvin for a parsed (class, subclass)
 * pair. Linear interpolation between class anchors along the
 * subclass digit; class beyond Y returns the Y0 anchor.
 *
 * For white dwarfs (`spectralClass === "WD"`), uses the MK
 * temperature-index definition: the digit n in "DAn" is
 * n ≈ 50400 / Teff, so Teff ≈ 50400 / n (DA2 ≈ 25,200 K,
 * DA9 ≈ 5,600 K). Subclass 1 = hottest.
 *
 * For unknown subclass (NaN), returns the class-anchor temperature
 * (subclass 0).
 */
export const temperatureFromSpect = (
  spectralClass: SpectralClass,
  subclass: number
): number => {
  if (spectralClass === "WD") {
    // White-dwarf temperature index is RECIPROCAL, not linear: the
    // MK subclass digit n in "DAn" is defined as n ≈ round(50400/Teff)
    // (Teff ≈ 50400/n). DA2 → ~25,200 K (Sirius B), DA9 → ~5,600 K.
    // The previous linear interpolation between 50,000 K and 5,500 K
    // gave DA2 ≈ 44,400 K — almost double the real value, contradicting
    // this function's own docstring and rendering hot WDs far too blue.
    if (!Number.isFinite(subclass)) return 10_000; // unknown → typical mid-range
    return Math.max(3_000, Math.min(80_000, 50_400 / subclass));
  }

  const idx = MK_CLASS_ORDER.indexOf(spectralClass);
  if (idx < 0) return MK_TEMP_ANCHORS_K.G; // fallback: solar-like

  const thisAnchor = MK_TEMP_ANCHORS_K[MK_CLASS_ORDER[idx]];
  // Beyond the last class, no next-anchor available — return as-is.
  if (idx === MK_CLASS_ORDER.length - 1) return thisAnchor;
  const nextAnchor = MK_TEMP_ANCHORS_K[MK_CLASS_ORDER[idx + 1]];

  const sub = Number.isFinite(subclass)
    ? Math.max(0, Math.min(9, subclass))
    : 0;
  // Linear interpolation across the 10-subclass bracket.
  const t = sub / 10;
  return thisAnchor * (1 - t) + nextAnchor * t;
};

/**
 * Ballesteros (2012) B-V → T_eff conversion.
 *
 * **Gaia-borrowed**: 1:1 port of
 * `gaiasky/util/color/BVToTeffBallesteros.java:32-34` (MPL-2.0).
 *
 * O ENDEREÇO ÚNICO da fórmula na casa (LEI-DA-ESTRELA, F0). As constantes
 * são exportadas porque o GLSL de `shaders/common.ts` (`bvToColor`) é
 * GERADO delas — uma escrita, duas faces, conformidade por construção.
 * A casa já teve esta fórmula em três cópias; duas morreram no F0.
 *
 * Falls back to this when `spect` is absent or unparseable. The
 * Ballesteros formula is empirically fit and has ~5% error against
 * MK calibration; sufficient for the visual-identity profile.
 */
// Constants from BVToTeffBallesteros.java:18-23.
export const BALLESTEROS_T0_K = 4600;
export const BALLESTEROS_A = 0.92;
export const BALLESTEROS_B = 1.7;
export const BALLESTEROS_C = 0.62;

export const temperatureFromBV = (bv: number): number => {
  return (
    BALLESTEROS_T0_K *
    (1 / (BALLESTEROS_A * bv + BALLESTEROS_B) + 1 / (BALLESTEROS_A * bv + BALLESTEROS_C))
  );
};

// ─── Stellar luminosity ───────────────────────────────────────────

/**
 * The Sun's absolute **visual** magnitude, M_V = +4.83. The anchor for
 * every magnitude→luminosity conversion in this module.
 */
export const SOLAR_ABSOLUTE_MAGNITUDE_V = 4.83;

/**
 * Visual luminosity in solar units from a V-band absolute magnitude:
 *
 *     L_V / L_V☉ = 10 ^ (−0.4 × (M_V − M_V☉))
 *
 * **This is not bolometric luminosity, and the distinction is a display
 * contract, not a footnote.** HYG's `absmag` is a V-band quantity, so the
 * result is what the star emits in visible light relative to the Sun. Hot and
 * cool stars both radiate a large fraction of their output outside V — for
 * Rigel the bolometric correction is worth roughly a factor of two — so any
 * UI showing this number must say "visual" rather than implying total output.
 *
 * It is nonetheless a **restatement of a catalog value**, not a model: one
 * measured magnitude in, one number out, no spectral class, no temperature,
 * no radius. That is precisely why W4 shows it without an "estimated" chip
 * while temperature, radius and mass carry one — and why it must not be
 * derived from Stefan-Boltzmann through `radiusFromSpect`, whose
 * geometric-mean blend with the luminosity-class table is tuned for apparent
 * disc size and would report Rigel more than an order of magnitude bright.
 */
export const visualLuminosityFromAbsmag = (absmag: number): number =>
  Math.pow(10, -0.4 * (absmag - SOLAR_ABSOLUTE_MAGNITUDE_V));

// ─── Stellar radius ───────────────────────────────────────────────

/**
 * Class-aware radius factor (in solar radii) for non-main-sequence
 * stars. Main-sequence dwarfs (V) compute via Stefan-Boltzmann
 * from `absmag` when available; without absmag they use the V
 * column. Giants (III), bright giants (II), supergiants (I/Ia/Ib),
 * and subgiants (IV) use class-scaled factors based on standard
 * stellar-evolution references.
 *
 * Atlas-opinion approximations — full per-class radius modeling
 * (T6.5 territory) is out of scope. These values produce
 * visually-distinguishable stellar sizes at solid-angle gating
 * threshold without requiring spectral-grid lookup tables.
 */
const RADIUS_FACTOR_BY_LUMINOSITY: Record<LuminosityClass, number> = {
  "0": 1500, // hypergiant — few exist; rough order
  Ia: 1000, // bright supergiant (Betelgeuse ~900 R_sun)
  Ib: 500, // less bright supergiant
  I: 700, // generic supergiant midpoint
  II: 100, // bright giant
  III: 30, // giant (Arcturus ~25 R_sun)
  IV: 3, // subgiant (Procyon ~2 R_sun)
  V: 1, // main sequence — class-modulated (see below)
  VI: 0.5, // subdwarf
  VII: 0.01, // white dwarf (Sirius B ~0.008 R_sun)
};

/**
 * Approximate main-sequence radius in solar radii from spectral
 * class. Atlas-opinion values from standard astrophysics tables
 * (Cox 2000, Allen's Astrophysical Quantities). Subclass
 * interpolation linear within class.
 */
const MAIN_SEQUENCE_RADIUS_SOLAR: Record<
  Exclude<SpectralClass, "WD">,
  number
> = {
  O: 10, // O0 main sequence
  B: 5,
  A: 1.7, // A0 (Vega ~2.4, but A5 closer to 1.5 — midpoint anchor)
  F: 1.3,
  G: 1.0, // Sun
  K: 0.8,
  M: 0.4, // M0; cooler M dwarfs go down to ~0.1
  L: 0.1, // brown dwarfs are sub-stellar
  T: 0.09,
  Y: 0.08,
};

/**
 * Compute physical radius (in solar units) from a spectral
 * classification string.
 *
 * Algorithm:
 *   1. Parse spect via `parseSpectralClass`.
 *   2. If parse fails or no `spect` provided, return 1.0
 *      (Sun-equivalent fallback; caller may further refine via
 *      `absmag` or use the default profile).
 *   3. White dwarf (class === "WD"): return 0.01 R_sun (Sirius
 *      B-like; absmag ignored for WD because Stefan-Boltzmann
 *      breaks at WD densities — our table value is the
 *      conventional approximation).
 *   4. Non-main-sequence (luminosity ∈ {0, Ia, Ib, I, II, III,
 *      IV, VI}): use `RADIUS_FACTOR_BY_LUMINOSITY` directly.
 *      Subclass and absmag ignored — class-only granularity
 *      is the T6.2 scope; T6.4 may refine.
 *   5. Main sequence (V or null): interpolate
 *      `MAIN_SEQUENCE_RADIUS_SOLAR` between the parsed class and
 *      the next class along the subclass digit. If `absmag` is
 *      provided AND finite, optionally refine via Stefan-
 *      Boltzmann (R/R_sun = sqrt(L/L_sun) × (T_sun/T_eff)²)
 *      using the parsed temperature; this lets faint M-dwarfs
 *      compute correctly even when the table-level approximation
 *      would over-estimate them.
 *
 * **T6.4-M5-Path-A**: when `spect` is empty AND both `absmag` and
 * `bv` are finite, the early-return `1.0` is replaced with a
 * Stefan-Boltzmann fallback via `radiusFromAbsmagBvFallback`. This
 * means consumers (HygStellarMesh, CameraController, hygStarInfo)
 * automatically pick up correct radii for spect-less stars without
 * needing to route through `descriptorFromCatalog`. Bumping the
 * signature with an optional third parameter is the minimum-diff
 * way to thread B-V into the fallback path.
 *
 * Returns 0 for invalid input (never NaN — downstream consumers
 * use this to scale geometry).
 */
export const radiusFromSpect = (
  spect: string | null | undefined,
  absmag?: number,
  bv?: number
): number => {
  if (!spect) {
    // T6.4-M5-Path-A — Stefan-Boltzmann fallback when both absmag
    // and bv are finite. Path A reaches three callsites this way:
    // procedural-mesh radius (HygStellarMesh.tsx:259), camera-flight
    // target radius (CameraController.tsx:67), info-panel display
    // (hygStarInfo.ts:150).
    if (
      typeof absmag === "number" &&
      Number.isFinite(absmag) &&
      typeof bv === "number" &&
      Number.isFinite(bv)
    ) {
      const fallback = radiusFromAbsmagBvFallback(bv, absmag);
      if (fallback !== null) return fallback;
    }
    return 1.0;
  }
  const parsed = parseSpectralClass(spect);
  if (!parsed) return 1.0;

  // White dwarfs.
  if (parsed.spectralClass === "WD") return RADIUS_FACTOR_BY_LUMINOSITY.VII;

  // Non-main-sequence: class-factor table baseline + Stefan-Boltzmann
  // refinement when absmag is available. T6.4-M5 post-audit fix —
  // the class table values (`RADIUS_FACTOR_BY_LUMINOSITY.Ia = 1000`,
  // `Ib = 500`, etc.) are M-supergiant-biased averages. Without SB
  // refinement, hot supergiants like Rigel (B8Ia, real R≈78 R_sun)
  // got the same 1000 R_sun as cool supergiants like Betelgeuse.
  // Codex audit (2026-05-07) flagged this as P2 — Rigel rendered
  // ~13× too large. Routing through the same SB blend pattern as
  // the main-sequence path gives ~80 R_sun for Rigel and improves
  // Betelgeuse from 500 → 429 (still V-band-underestimated for
  // cool stars but directionally better).
  if (
    parsed.luminosityClass !== null &&
    parsed.luminosityClass !== "V" &&
    parsed.luminosityClass !== "VII"
  ) {
    const tableR = RADIUS_FACTOR_BY_LUMINOSITY[parsed.luminosityClass];
    if (Number.isFinite(absmag)) {
      const T_SUN = 5778;
      const tEff = temperatureFromSpect(parsed.spectralClass, parsed.subclass);
      if (Number.isFinite(tEff) && tEff > 0) {
        const lumOverSun = visualLuminosityFromAbsmag(absmag as number);
        const tRatio = T_SUN / tEff;
        const sbR = Math.sqrt(lumOverSun) * tRatio * tRatio;
        // Geometric-mean blend with the table value matches the MS
        // path's behaviour — protects against catalog absmag noise
        // without throwing away the SB physics signal.
        const blended = Math.sqrt(tableR * Math.max(1e-3, sbR));
        return Math.max(1e-3, Math.min(2000, blended));
      }
    }
    return tableR;
  }

  // Main sequence (V or unspecified default).
  const idx = MK_CLASS_ORDER.indexOf(parsed.spectralClass);
  if (idx < 0) return 1.0;

  const thisR = MAIN_SEQUENCE_RADIUS_SOLAR[MK_CLASS_ORDER[idx]];
  // Interpolate to the next class for a smoother subclass curve.
  const nextR =
    idx === MK_CLASS_ORDER.length - 1
      ? thisR
      : MAIN_SEQUENCE_RADIUS_SOLAR[MK_CLASS_ORDER[idx + 1]];

  const sub = Number.isFinite(parsed.subclass)
    ? Math.max(0, Math.min(9, parsed.subclass))
    : 0;
  const t = sub / 10;
  const tableR = thisR * (1 - t) + nextR * t;

  // Optional Stefan-Boltzmann refinement when absmag is available.
  // R/R_sun = sqrt(L/L_sun) × (T_sun / T_eff)², with L from
  // `visualLuminosityFromAbsmag` (W4 extracted the formula that used to be
  // inlined here and above — one anchor for M_V☉ = 4.83, and the panel's
  // Luminosity row reads the same function).
  // We average the table value with the SB value to prevent
  // pathological output when absmag-vs-spect disagree (catalog
  // noise). This is atlas-opinion smoothing — not a Gaia behavior.
  if (Number.isFinite(absmag)) {
    const T_SUN = 5778;
    const tEff = temperatureFromSpect(parsed.spectralClass, parsed.subclass);
    if (Number.isFinite(tEff) && tEff > 0) {
      const lumOverSun = visualLuminosityFromAbsmag(absmag as number);
      const tRatio = T_SUN / tEff;
      const sbR = Math.sqrt(lumOverSun) * tRatio * tRatio;
      // Geometric mean blends table + SB; clamp to a sensible range
      // so noisy absmag entries don't return absurd radii.
      const blended = Math.sqrt(tableR * Math.max(1e-3, sbR));
      return Math.max(1e-3, Math.min(2000, blended));
    }
  }

  return tableR;
};

// [casa] Aqui o doador tinha `massFromSpectAbsmag` (linhas 529–582) —
// omitida; ver preâmbulo.

// ─── Visual descriptor + visual-profile aggregator ────────────────

/**
 * Star data subset needed to build a visual profile. Atlas's
 * `HygCatalogData` will be extended in T6.2-β to expose
 * `spect: string | null` + `absmag: number | null` per star;
 * until then, callers pass `bv` only and route through the
 * Ballesteros fallback path.
 */
export interface StellarPhysicsInput {
  /** B-V color index (mag). Always present in HYG catalog (default 0.65). */
  bv: number;
  /** MK spectral classification string. Optional until T6.2-β. */
  spect?: string | null;
  /** Absolute magnitude (M_V). Optional until T6.2-β. */
  absmag?: number | null;
}

/**
 * T6.4-M4 — bundled visual descriptor that `stellarVisualProfileFrom`
 * consumes internally. Surfaces every parsed/derived field the
 * downstream class-aware composition needs (color, granulation,
 * rays/flares, glow scale) so the visual-profile builder doesn't
 * re-parse `spect` mid-pipeline. M5 (spect-fallback via absmag)
 * also reads this shape.
 *
 * `luminosityClass` defaults to `"V"` (main sequence) when the
 * catalog string carries no luminosity hint — consistent with
 * `radiusFromSpect`'s "V or unspecified" branch. The visual
 * descriptor is therefore non-null on every field, simplifying
 * downstream callers.
 */
export interface StellarVisualDescriptor {
  /** Effective temperature in Kelvin. */
  tEff: number;
  /** MK class letter or `"WD"`. Defaults to `"G"` for unparseable input. */
  spectralClass: SpectralClass;
  /** Roman numeral. Defaults to `"V"` (main sequence) when absent. */
  luminosityClass: LuminosityClass;
  /** Catalog B-V (preserved verbatim — kept for downstream auditability). */
  bv: number;
  /** V-band absolute magnitude, or `null` when absent / non-finite. */
  absmag: number | null;
  /** Radius in solar units, via `radiusFromSpect`. */
  radiusSolar: number;
}

/**
 * Reverse-lookup spectral class from effective temperature. Used by
 * `descriptorFromCatalog` when `spect` is missing (catalog long-tail
 * after the M5-Path-B frequency cap) — gives a usable best-guess
 * class letter from the B-V-derived temperature so downstream
 * granulation / hue selection has something better than the prior
 * hardcoded "G" default.
 */
const spectralClassFromTemperature = (
  tEff: number
): Exclude<SpectralClass, "WD"> => {
  // Walk the MK anchors; pick the class whose anchor is closest
  // (in log space) to tEff. Anchors are class-zero edges; a star at
  // 5500K (between G0=5900 and K0=5100) is closer to G0 ratio-wise.
  let best: Exclude<SpectralClass, "WD"> = "G";
  let bestDist = Infinity;
  for (const c of MK_CLASS_ORDER) {
    const dist = Math.abs(Math.log(tEff / MK_TEMP_ANCHORS_K[c]));
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
};

/**
 * Approximate main-sequence (V class) absolute V-band magnitude as
 * a function of effective temperature. Used by `inferLuminosityClass`
 * to compare an observed `absmag` against where the V-class baseline
 * would land at the same `tEff` — a simplified H-R-diagram lookup.
 *
 * Anchors (atlas-opinion, from Allen's Astrophysical Quantities V):
 *   O5V  (~42000 K)  M_V ≈ -5.5
 *   B0V  (~30000 K)  M_V ≈ -3.5
 *   B5V  (~15000 K)  M_V ≈ -1.0
 *   A0V  ( ~9900 K)  M_V ≈  0.6
 *   F0V  ( ~7300 K)  M_V ≈  2.7
 *   G0V  ( ~5900 K)  M_V ≈  4.4
 *   G2V  ( ~5778 K)  M_V ≈  4.83 (Sun)
 *   K0V  ( ~5100 K)  M_V ≈  5.9
 *   M0V  ( ~3800 K)  M_V ≈  8.8
 *   M5V  ( ~3030 K)  M_V ≈ 12.3
 *
 * Linear-interpolated in log10(tEff) space (the anchors form a
 * roughly straight line on `log T` vs `M_V`).
 */
const MS_ABSMAG_ANCHORS: ReadonlyArray<{ tEff: number; mv: number }> = [
  { tEff: 42000, mv: -5.5 },
  { tEff: 30000, mv: -3.5 },
  { tEff: 15000, mv: -1.0 },
  { tEff: 9900, mv: 0.6 },
  { tEff: 7300, mv: 2.7 },
  { tEff: 5900, mv: 4.4 },
  { tEff: 5778, mv: 4.83 }, // Sun (G2V) — pins solar-neighborhood interpolation
  { tEff: 5100, mv: 5.9 },
  { tEff: 3800, mv: 8.8 },
  { tEff: 3030, mv: 12.3 },
];

const mvMSEstimate = (tEff: number): number => {
  if (!Number.isFinite(tEff) || tEff <= 0) return 4.83; // solar fallback
  if (tEff >= MS_ABSMAG_ANCHORS[0].tEff) return MS_ABSMAG_ANCHORS[0].mv;
  if (tEff <= MS_ABSMAG_ANCHORS[MS_ABSMAG_ANCHORS.length - 1].tEff) {
    return MS_ABSMAG_ANCHORS[MS_ABSMAG_ANCHORS.length - 1].mv;
  }
  const logT = Math.log10(tEff);
  for (let i = 0; i < MS_ABSMAG_ANCHORS.length - 1; i++) {
    const hi = MS_ABSMAG_ANCHORS[i];
    const lo = MS_ABSMAG_ANCHORS[i + 1];
    if (tEff <= hi.tEff && tEff >= lo.tEff) {
      const logHi = Math.log10(hi.tEff);
      const logLo = Math.log10(lo.tEff);
      const t = (logT - logLo) / (logHi - logLo);
      return lo.mv * (1 - t) + hi.mv * t;
    }
  }
  return 4.83;
};

/**
 * T6.4-M5 post-audit: infer luminosity class from absmag + tEff
 * via a simplified H-R diagram lookup. Used by `descriptorFromCatalog`
 * when `spect` is missing (Bayer/Flamsteed-only sidecar stars that
 * fell outside the M5-Path-B allowlist). Replaces the prior
 * hardcoded `"V"` default which gave V-class granulation / rays
 * texture to spect-less giants and supergiants.
 *
 * Algorithm: compare observed `absmag` against the V-class baseline
 * at the same `tEff` (via `mvMSEstimate`). The "dimness factor"
 * (`absmag - mvMS`) is positive for stars dimmer than MS at that
 * temperature and negative for stars brighter than MS (giants /
 * supergiants). Threshold cuts:
 *
 *   −0.5 ≤ dimness         → V    (main sequence — within scatter band)
 *   −2 < dimness < −0.5    → IV   (subgiant)
 *   −5 < dimness ≤ −2      → III  (giant)
 *   −7 < dimness ≤ −5      → II   (bright giant)
 *  −10 < dimness ≤ −7      → Ib   (supergiant)
 *        dimness ≤ −10     → Ia   (bright supergiant)
 *
 * The V tolerance band (`dimness ≥ −0.5`) absorbs catalog scatter
 * (photometric noise, B-V calibration, metallicity spread) which
 * routinely shifts MS stars ±0.3-0.5 mag from the literature MS
 * curve. Without it, ~464 spect-less catalog rows in
 * `dimness ∈ (−0.5, 0)` (29 hot-MS + 141 cool-MS candidates among
 * them) would be misclassified as IV and lose the V-class
 * granulation/rays branch in `artDirectionMultipliers` (Codex
 * post-audit P2).
 *
 * Atlas-opinion thresholds — chosen to match the MK luminosity
 * class definitions roughly. Doesn't try to handle white dwarfs
 * (returns V for very dim outliers; real WDs have spect strings
 * starting with "D" and don't reach this path).
 */
const MS_TOLERANCE_MAG = 0.5;

const inferLuminosityClass = (
  tEff: number,
  absmag: number
): LuminosityClass => {
  if (!Number.isFinite(absmag) || !Number.isFinite(tEff)) return "V";
  const mvMS = mvMSEstimate(tEff);
  const dimness = absmag - mvMS;
  if (dimness <= -10) return "Ia";
  if (dimness <= -7) return "Ib";
  if (dimness <= -5) return "II";
  if (dimness <= -2) return "III";
  if (dimness < -MS_TOLERANCE_MAG) return "IV";
  return "V";
};

/**
 * T6.4-M5-Path-A: physical-fallback radius via Stefan-Boltzmann when
 * `spect` is empty but `absmag` is finite. Uses B-V-derived tEff
 * (Ballesteros) for the temperature term:
 *
 *   L/L_sun = 10^(-0.4 × (absmag - M_SUN_V_ABS))
 *   R/R_sun = √(L/L_sun) × (T_sun / T_eff)²
 *
 * Clamped to [1e-3, 2000] so noisy absmag entries don't return absurd
 * radii. Returns null if absmag is non-finite (caller falls back to
 * the radiusFromSpect default).
 */
// Note: forward-referenced from `radiusFromSpect` above (M5-Path-A
// fallback when spect is empty). Module-init resolves all const
// arrow functions before any of them is called, so the forward
// reference is safe.
const radiusFromAbsmagBvFallback = (
  bv: number,
  absmag: number
): number | null => {
  if (!Number.isFinite(absmag)) return null;
  const tEff = temperatureFromBV(bv);
  if (!Number.isFinite(tEff) || tEff <= 0) return null;
  const M_SUN_V = 4.83;
  const T_SUN = 5778;
  const lumOverSun = Math.pow(10, -0.4 * (absmag - M_SUN_V));
  if (!Number.isFinite(lumOverSun) || lumOverSun <= 0) return null;
  const tRatio = T_SUN / tEff;
  const r = Math.sqrt(lumOverSun) * tRatio * tRatio;
  return Math.max(1e-3, Math.min(2000, r));
};

/**
 * Build a visual descriptor from raw HYG catalog fields. Mirrors the
 * resolution sequence inside `stellarVisualProfileFrom` so callers
 * (M5 forward-port, info-panel labels) can share the same parsed
 * shape without re-implementing the spect / B-V fallback.
 *
 * **Resolution priority** (T6.4-M5):
 *   1. If `spect` parses → spectralClass, luminosityClass, tEff
 *      from MK lookup + radius from `radiusFromSpect` (handles
 *      Stefan-Boltzmann refinement when absmag is also present).
 *   2. If `spect` is empty/unparseable but `absmag` is finite →
 *      M5-Path-A physical fallback: tEff from B-V Ballesteros,
 *      spectralClass reverse-looked-up from tEff, radius via
 *      Stefan-Boltzmann from absmag + tEff. luminosityClass
 *      inferred via simplified H-R-diagram lookup
 *      (`inferLuminosityClass`) — compares observed absmag against
 *      V-class baseline at the same tEff to distinguish MS / sub-
 *      giant / giant / supergiant (post-audit, was hardcoded "V").
 *   3. Otherwise → tEff from B-V, spectralClass from B-V, radius
 *      defaults to 1.0, luminosityClass "V" (legacy behaviour for
 *      stars without absmag — no H-R position to infer from).
 */
export const descriptorFromCatalog = (
  input: StellarPhysicsInput
): StellarVisualDescriptor => {
  const parsed = input.spect ? parseSpectralClass(input.spect) : null;
  const absmag =
    typeof input.absmag === "number" && Number.isFinite(input.absmag)
      ? input.absmag
      : null;

  let tEff: number;
  let spectralClass: SpectralClass;
  let luminosityClass: LuminosityClass;
  let radiusSolar: number;

  if (parsed) {
    // Spectral path (~99% of catalog post-Path-B).
    tEff = temperatureFromSpect(parsed.spectralClass, parsed.subclass);
    spectralClass = parsed.spectralClass;
    luminosityClass = parsed.luminosityClass ?? "V";
    radiusSolar = radiusFromSpect(input.spect, absmag ?? undefined, input.bv);
  } else {
    // Path A: spect empty OR unparseable, fall back to physics.
    // tEff from B-V; class reverse-looked up; radius via
    // radiusFromSpect's spect-empty branch (which itself routes
    // to the SB fallback when bv + absmag are finite — single
    // source of truth).
    // T6.4-M5 post-audit: luminosity class inferred from H-R
    // position when absmag is available (was hardcoded "V" pre-fix,
    // misclassifying spect-less giants/supergiants like Wolf-Rayet
    // Bayer-only entries that drop out of the canonical MK letters).
    // T6.4-M5 post-audit-of-audit (Codex): pass `null` (not the
    // original `input.spect`) into radiusFromSpect so unparseable
    // non-empty strings (e.g. raw "WR" before canonicalization) hit
    // the SB-fallback branch rather than `parseSpectralClass`'s
    // 1.0-default. canonicalizeSpect strips these at build time, but
    // the exported helper shouldn't depend on that pre-condition.
    tEff = temperatureFromBV(input.bv);
    spectralClass = spectralClassFromTemperature(tEff);
    luminosityClass =
      absmag !== null ? inferLuminosityClass(tEff, absmag) : "V";
    radiusSolar = radiusFromSpect(null, absmag ?? undefined, input.bv);
  }

  return {
    tEff,
    spectralClass,
    luminosityClass,
    bv: input.bv,
    absmag,
    radiusSolar,
  };
};
