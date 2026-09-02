// ============================================================
// Elementos orbitais — DADO, migra verbatim (PLANO-ATLAS §0.2 categoria 1).
//
// PROVENIÊNCIA (transcrito do atlas-orbital em 2026-08-10):
//   - src/lib/orbital/analytical/satellites.ts — os 20 satélites analíticos
//     (epochJD/aAU/e/iDeg/OmegaDeg/omegaDeg/M0Deg + parent + nDegPerDay),
//     com os comentários pub/fix de cada taxa COPIADOS: eles são a
//     proveniência do número, não decoração.
//   - src/lib/orbital/analytical/asteroids.ts — ceres, pallas, vesta.
//   - src/lib/orbital/analytical/coordUtils.ts — AU_KM e MU_SUN (k²).
//   - src/data/celestialBodies.ts — vanth e weywot, Kepler de catálogo
//     (ver CATALOG_MOONS abaixo, com a janela de validade declarada).
// HYGIEA é a adição da Onda 2: bloco derivado por
//   scripts/data/atlas/derive-elements-from-fixtures.js (vendorizado)
// dos fixtures novos hygiea-*.json em src/test/fixtures/horizons/.
//
// CONFERÊNCIA CONTRA O DOADOR (2026-08-10): script descartável no
// scratchpad comparou NUMERICAMENTE cada literal deste arquivo com o do
// doador (20 satélites × 8 campos + parent, 3 asteroides × 7 campos,
// vanth/weywot campo a campo, razões de massa do MU_PARENT, K, AU_KM,
// EPOCH_2025_JD) e o bloco da Hygiea com a saída do derive vendorizado:
// zero divergências. NUNCA editar números à mão — regenerar e colar.
//
// ADAPTAÇÕES DECLARADAS (todas estruturais; nenhum número muda):
//   1. `sun` entra em MU_PARENT (o satellites.ts do doador não o tem; o
//      derive-elements-from-fixtures.js tem `sun: 1.0 * K2`) — o
//      propagador precisa de μ☉ para os heliocêntricos via Kepler III.
//   2. As funções de runtime dos arquivos do doador NÃO vêm junto:
//      runtime renasce em kepler.ts (doutrina §0). Aqui só dado, tipos
//      do dado e constantes.
//   3. `SatelliteEntry.parent` é `string`, não `keyof typeof MU_PARENT`:
//      orcus e quaoar (CATALOG_MOONS) não têm μ na tabela — seus corpos
//      carregam nDegPerDay explícito e nunca caem no Kepler III.
// Frame de TUDO: eclíptica média J2000, parent-centered, AU — igual ao
// doador. Comentários do dado em inglês, verbatim.
// ============================================================

/** 1 astronomical unit in kilometres (IAU 2012 definition). */
export const AU_KM = 149597870.7;

/** Gaussian gravitational constant (AU^(3/2)/day), IAU 1976. */
export const K = 0.01720209895;

/**
 * Gaussian gravitational constant squared, i.e. the heliocentric
 * gravitational parameter in AU³/day² when masses are expressed in solar
 * masses and the Sun is given unit mass. This is the standard μ☉ used by
 * every analytical branch in the engine.
 *
 * Origin: IAU 1976 Gaussian constant k = 0.01720209895; k² gives AU³/day²
 * directly (`K = sqrt(GM_sun / AU^3) · day`).
 */
export const MU_SUN_AU3_PER_DAY2 = K ** 2;

const K2 = K ** 2;

// Standard gravitational parameters (AU^3/day^2) — k² × mass ratio.
export const MU_PARENT: Record<string, number> = {
  // Casa: μ☉ para os heliocêntricos (asteroides); mesmo `1.0 * K2` do
  // derive-elements-from-fixtures.js do doador.
  sun: MU_SUN_AU3_PER_DAY2,
  mars: 3.22715144e-7 * K2,
  jupiter: 9.54791915e-4 * K2,
  saturn: 2.8588567e-4 * K2,
  uranus: 4.366244e-5 * K2,
  // W6 stage B. `BODY<n>_GM / BODY10_GM` from NAIF `gm_de440.tpc`; the same
  // division reproduces the four ratios above, which came from an unrelated
  // source, to better than 1.5e-6 relative — the independent check standing
  // law 3 asks for. System values like the others, which matters unusually
  // much for Pluto because Charon is ~12% of its mass.
  neptune: 5.151383773e-5 * K2,
  pluto: 7.350478973e-9 * K2,
};

export interface EclipticElements {
  /** Reference epoch as Julian Date (TDB). */
  epochJD: number;
  /** Semi-major axis (AU). */
  aAU: number;
  /** Eccentricity. */
  e: number;
  /** Inclination to J2000 ecliptic (deg). */
  iDeg: number;
  /** Longitude of ascending node on J2000 ecliptic (deg). */
  OmegaDeg: number;
  /** Argument of periapsis (deg). */
  omegaDeg: number;
  /** Mean anomaly at epoch (deg). */
  M0Deg: number;
  /**
   * Mean motion (deg/day). Optional: when absent the value falls back to
   * Kepler III from `aAU` + μ_parent, which is only correct for an
   * unperturbed two-body orbit. Every analytical satellite below supplies
   * it explicitly; the fallback exists for entries added without a
   * calibrated rate.
   *
   * Provenance is tagged per entry:
   *   - `pub`  — JPL SSD "Planetary Satellite Mean Orbital Parameters"
   *              (published mean motion, independent of this repo's data).
   *              SOURCE CAVEAT: JPL states that table is a summary of
   *              orbital properties and is *not intended for ephemeris
   *              computation*. We use only the mean motion from it — a
   *              long-term average rate — and pair it with a locally
   *              derived osculating element set, so this is a calibrated
   *              constant borrowed from a descriptive table, not an
   *              endorsement of the table as an ephemeris source.
   *   - `fix`  — fitted to the local Horizons fixtures by minimising the
   *              angular error at 2025-07-01 and 2026-01-01.
   *
   * LIMITATION (`fix` entries): those rates were tuned **in-sample** against
   * the same two fixture epochs the regression suite asserts on, so the
   * residuals quoted in `regression.test.ts` are a goodness-of-fit, not an
   * independent accuracy measurement. Treat them as calibrated constants,
   * not as measured ephemeris quantities. Mimas and Phobos are excluded from
   * fitting: their periods are short enough that the 6-month fixture spacing
   * aliases the phase (many integer revolutions fit equally well), so they
   * use the published rate.
   */
  nDegPerDay?: number;
}

export interface SatelliteEntry {
  parent: string;
  elements: EclipticElements;
}

// 2025-01-01T00:00:00Z in TDB Julian Date. The engine evaluates analytical
// positions at `jdTDB`, not at raw UT JD, so the epoch we tag elements with
// must also be in TDB to keep `dt = jdTDB - epochJD` at zero when a request
// lands on the fixture instant. Mismatched scale moves Phobos ~1° at epoch.
//
// The epoch was shifted from 2020-01-01 in an earlier pass so short-period
// moons (Io, Phobos, Deimos, Mimas, Miranda) stay within Phase-4 tolerance
// at present-day simulation dates rather than accumulating years of
// two-body phase drift from a stale base. Plan to refresh this every few
// years.
export const EPOCH_2025_JD = 2460676.5008931975;

// J2000.0 como JD. É a época implícita do Kepler de catálogo do doador
// (keplerProvider.ts avança `M = M0 + n * daysSinceJ2000`) E a das nove
// luas do projeto Saturn do autor, abaixo. Morava mais adiante no arquivo;
// subiu porque agora SATELLITES o lê na própria construção.
const J2000_JD = 2451545.0;

/**
 * Ecliptic-J2000 osculating elements, parent-centered, all at epoch
 * 2025-01-01. Every block below was emitted by
 * `scripts/derive-elements-from-fixtures.js` against the corresponding
 * Horizons fixture on disk. Regenerating is a one-line command.
 *
 * Mean motion is carried **explicitly** as `nDegPerDay` rather than derived
 * from `aAU` via Kepler III. The `aAU` above is an *osculating* semi-major
 * axis inverted from a single state vector; under the primary's J2 it
 * oscillates around the mean value, so imposing Kepler III on it yields a
 * mean motion that is wrong by enough to lose the phase entirely (Phobos
 * drifted 165° at +6 months). Deriving `n` from `a` was previously described
 * here as a self-consistency feature — it was a bug. See the per-entry
 * `nDegPerDay` comments for the provenance of each rate.
 */
export const SATELLITES: Record<string, SatelliteEntry> = {
  // --- Martian ---
  // Phobos: P=0.32 d. Mars J2 + tidal-decay drift; multi-epoch envelope
  // 3.9° (worst observed 3.6°; see regression.test.ts MULTI_EPOCH_OVERRIDES).
  phobos: {
    parent: "mars",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.000062693,
      e: 0.015598,
      iDeg: 26.377682,
      OmegaDeg: 85.130902,
      omegaDeg: 356.427237,
      M0Deg: 343.483363,
      // pub: JPL SSD Planetary Satellite Mean Orbital Parameters.
      // Not fitted — the 6-month fixture spacing aliases a 0.32 d period.
      nDegPerDay: 1128.8446,
    },
  },
  // Deimos: P=1.26 d. Mars J2 drift; multi-epoch envelope 0.3°.
  deimos: {
    parent: "mars",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.000156818,
      e: 0.000264,
      iDeg: 24.261578,
      OmegaDeg: 80.746057,
      omegaDeg: 21.34648,
      M0Deg: 274.428678,
      // fix: fitted in-sample to the 2025-07-01 / 2026-01-01 fixtures.
      nDegPerDay: 285.161867,
    },
  },

  // --- Galilean ---
  // Io: P=1.77 d. Laplace resonance + Jupiter J2; envelope 1.1°.
  io: {
    parent: "jupiter",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.002820633,
      e: 0.004189,
      iDeg: 2.184263,
      OmegaDeg: 338.066972,
      omegaDeg: 162.539472,
      M0Deg: 77.16209,
      // pub: JPL SSD Planetary Satellite Mean Orbital Parameters.
      nDegPerDay: 203.489,
    },
  },
  // Europa: P=3.55 d. Laplace resonance + Jupiter J2; envelope 2.0°.
  europa: {
    parent: "jupiter",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.00448606,
      e: 0.009603,
      iDeg: 2.245018,
      OmegaDeg: 326.027753,
      omegaDeg: 348.485963,
      M0Deg: 41.525546,
      // fix: fitted in-sample to the 2025-07-01 / 2026-01-01 fixtures.
      nDegPerDay: 101.373519,
    },
  },
  // Ganymede: P=7.15 d. Laplace resonance + Jupiter J2; envelope 0.3°.
  ganymede: {
    parent: "jupiter",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.007155651,
      e: 0.001595,
      iDeg: 2.332721,
      OmegaDeg: 339.486914,
      omegaDeg: 0.37336,
      M0Deg: 355.419406,
      // fix: fitted in-sample to the 2025-07-01 / 2026-01-01 fixtures.
      nDegPerDay: 50.318096,
    },
  },
  // Callisto: P=16.69 d. Jupiter J2 + mutual Galilean perturbations
  // (not Laplace-locked); envelope 0.3°.
  callisto: {
    parent: "jupiter",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.012581724,
      e: 0.007335,
      iDeg: 1.949769,
      OmegaDeg: 336.755898,
      omegaDeg: 31.707226,
      M0Deg: 126.981443,
      // fix: fitted in-sample to the 2025-07-01 / 2026-01-01 fixtures.
      nDegPerDay: 21.570967,
    },
  },

  // --- Major Saturnian ---
  // Mimas: P=0.94 d. Tethys 2:4 mean-motion resonance; envelope 5.6°
  // (worst observed 5.2°; short-period resonant moon two-body cannot hold ±1 yr).
  mimas: {
    parent: "saturn",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.001243267,
      e: 0.021819,
      iDeg: 29.618039,
      OmegaDeg: 169.879386,
      omegaDeg: 241.83177,
      M0Deg: 338.697262,
      // pub: JPL SSD Planetary Satellite Mean Orbital Parameters.
      // Not fitted — the 6-month fixture spacing aliases a 0.94 d period.
      nDegPerDay: 381.9945,
    },
  },
  // Enceladus: P=1.37 d. Dione 1:2 mean-motion resonance + tidal heating;
  // envelope 1.2°.
  enceladus: {
    parent: "saturn",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.00159328,
      e: 0.004627,
      iDeg: 28.046968,
      OmegaDeg: 169.53623,
      omegaDeg: 321.387411,
      M0Deg: 277.657121,
      // fix: fitted in-sample to the 2025-07-01 / 2026-01-01 fixtures.
      nDegPerDay: 262.730539,
    },
  },
  // Tethys: P=1.89 d. Mimas 2:4 mean-motion resonance; envelope 1.6°.
  tethys: {
    parent: "saturn",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.001971307,
      e: 0.000841,
      iDeg: 27.142823,
      OmegaDeg: 168.2125,
      omegaDeg: 202.806232,
      M0Deg: 346.972498,
      // pub: JPL SSD Planetary Satellite Mean Orbital Parameters.
      nDegPerDay: 190.6979,
    },
  },
  // Dione: P=2.74 d. Enceladus 1:2 mean-motion resonance; envelope 0.3°.
  dione: {
    parent: "saturn",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.002523787,
      e: 0.002434,
      iDeg: 28.026006,
      OmegaDeg: 169.507282,
      omegaDeg: 229.097504,
      M0Deg: 59.177256,
      // fix: fitted in-sample to the 2025-07-01 / 2026-01-01 fixtures.
      nDegPerDay: 131.535095,
    },
  },
  // Rhea: P=4.52 d. Saturn J2 + Titan perturbation; envelope 0.3°.
  rhea: {
    parent: "saturn",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.003523311,
      e: 0.000913,
      iDeg: 28.195345,
      OmegaDeg: 170.10546,
      omegaDeg: 171.554945,
      M0Deg: 329.872314,
      // fix: fitted in-sample to the 2025-07-01 / 2026-01-01 fixtures.
      nDegPerDay: 79.690026,
    },
  },
  // Titan: P=15.95 d. Solar perturbation + Hyperion 4:3 resonance;
  // envelope 0.3°.
  titan: {
    parent: "saturn",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.008168275,
      e: 0.028823,
      iDeg: 27.711177,
      OmegaDeg: 169.071606,
      omegaDeg: 177.468183,
      M0Deg: 32.218395,
      // fix: fitted in-sample to the 2025-07-01 / 2026-01-01 fixtures.
      nDegPerDay: 22.576926,
    },
  },
  // Iapetus: P=79.32 d. Saturn J2 + transitional Laplace-plane dynamics;
  // envelope 0.3°.
  iapetus: {
    parent: "saturn",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.023788429,
      e: 0.029245,
      iDeg: 17.029066,
      OmegaDeg: 138.884109,
      omegaDeg: 232.489429,
      M0Deg: 244.336165,
      // fix: fitted in-sample to the 2025-07-01 / 2026-01-01 fixtures.
      nDegPerDay: 4.53792,
    },
  },

  // --- Saturnian menores + Hipérion e Febe (item 134/S3) ---
  //
  // FONTE: `src/data/saturn.ts` do PROJETO SATURN DO AUTOR (MOONS.hyperion,
  // MINOR_MOONS, PHOEBE_ECLIPTIC), que os transcreve de NASA/JPL Solar System
  // Dynamics, "Planetary Satellite Mean Orbital Parameters"
  // (https://ssd.jpl.nasa.gov/sats/elem/). São elementos MÉDIOS na época
  // J2000, não osculantes de fixture — por isso `epochJD: J2000_JD` e não
  // EPOCH_2025_JD, e por isso não há tag `pub`/`fix`: a taxa é 360/período
  // publicado, transcrição direta, sem ajuste local.
  //
  // MUDANÇA DE FRAME, o único cálculo feito aqui. Ele guarda tudo no frame
  // EQUATORIAL DE SATURNO (nas menores i = Ω = ω = 0 é a aproximação exata:
  // a órbita É o plano do equador); esta casa fala eclíptica J2000. A
  // conversão gira o versor do periastro e a normal da órbita pela base
  // (nodo do equador de Saturno na equatorial ICRF, polo IAU 40,589°/83,537°)
  // e re-extrai os três ângulos — a MESMA `eclipticOrbitToSaturnFrame()` dele,
  // no sentido inverso. DUAS PROVAS antes de colar: (1) a ida do Febe
  // reproduz os três ângulos que ele publica no lado equatorial
  // (149,14266°/52,95355°/281,75182°) a 1e-5°; (2) as SETE saturnianas que a
  // casa já tem, convertidas para o frame dele, batem com a tabela dele em
  // 0,03° nas cinco internas (Reia 0,308 × 0,333; Titã 0,402 × 0,306; Jápeto
  // 15,78 × 15,47 — a diferença é médio × osculante, não erro de rotação).
  //
  // O QUE ESTES NÚMEROS NÃO SÃO: efeméride. Duas leis a limitam, e as duas
  // são as mesmas do projeto dele. (a) A PRECESSÃO de nodo e periastro sob o
  // J2 de Saturno é desprezada — inofensiva nas sete internas (i = 0 no frame
  // de Saturno: o plano da órbita É o equador, que não precessa) e pequena em
  // Hipérion (0,43°) e Febe (longe). (b) A FASE é propagada por dois corpos
  // desde J2000: em 26 anos uma lua de 0,575 dia dá ~16.500 voltas, e o
  // arredondamento do período publicado na 4ª casa já vale dezenas de graus
  // de longitude. Para onde a lua ESTÁ, isto não serve; para a órbita, o
  // tamanho, a inclinação e o sentido, serve — e é o que a tela mostra.
  //
  // JANO E EPIMETEU: período IGUAL de propósito (decisão dele, §8 do plano
  // dele) — o par co-orbital dista ~50 km em `a`, menos que a soma dos raios,
  // e períodos diferentes fariam as malhas se atravessarem. A troca real de
  // órbitas a cada ~4 anos fica de fora; Epimeteu carrega M0 = 60° nominal
  // para os dois ficarem separados em longitude.
  //
  // FEBE é o único cujo dado nasce JÁ eclíptico: `PHOEBE_ECLIPTIC` dele é a
  // linha do JPL para satélites irregulares (i = 173,04° ⇒ RETRÓGRADA), e a
  // conversão só a devolve inalterada — o número que entra aqui é o do JPL,
  // sem rotação nenhuma no caminho.
  hyperion: {
    parent: "saturn",
    elements: {
      epochJD: J2000_JD,
      aAU: 0.00990321582,
      e: 0.105,
      iDeg: 27.743454,
      OmegaDeg: 168.88776,
      omegaDeg: 167.399866,
      M0Deg: 86.3,
      nDegPerDay: 16.91998962,
    },
  },
  pan: {
    parent: "saturn",
    elements: {
      epochJD: J2000_JD,
      aAU: 0.000892953886,
      e: 0,
      iDeg: 28.052163,
      OmegaDeg: 169.527509,
      omegaDeg: 320.034463,
      M0Deg: 0,
      nDegPerDay: 626.0869565,
    },
  },
  daphnis: {
    parent: "saturn",
    elements: {
      epochJD: J2000_JD,
      aAU: 0.000912479565,
      e: 0,
      iDeg: 28.052163,
      OmegaDeg: 169.527509,
      omegaDeg: 320.034463,
      M0Deg: 0,
      nDegPerDay: 606.0606061,
    },
  },
  atlas: {
    parent: "saturn",
    elements: {
      epochJD: J2000_JD,
      aAU: 0.000920267109,
      e: 0,
      iDeg: 28.052163,
      OmegaDeg: 169.527509,
      omegaDeg: 320.034463,
      M0Deg: 0,
      nDegPerDay: 598.3048031,
    },
  },
  prometheus: {
    parent: "saturn",
    elements: {
      epochJD: J2000_JD,
      aAU: 0.000931697753,
      e: 0,
      iDeg: 28.052163,
      OmegaDeg: 169.527509,
      omegaDeg: 320.034463,
      M0Deg: 0,
      nDegPerDay: 587.2756933,
    },
  },
  pandora: {
    parent: "saturn",
    elements: {
      epochJD: J2000_JD,
      aAU: 0.000947339687,
      e: 0,
      iDeg: 28.052163,
      OmegaDeg: 169.527509,
      omegaDeg: 320.034463,
      M0Deg: 0,
      nDegPerDay: 572.7923628,
    },
  },
  janus: {
    parent: "saturn",
    elements: {
      epochJD: J2000_JD,
      aAU: 0.00101244757,
      e: 0,
      iDeg: 28.052163,
      OmegaDeg: 169.527509,
      omegaDeg: 320.034463,
      M0Deg: 0,
      nDegPerDay: 518.3585313,
    },
  },
  epimetheus: {
    parent: "saturn",
    elements: {
      epochJD: J2000_JD,
      aAU: 0.00101211334,
      e: 0,
      iDeg: 28.052163,
      OmegaDeg: 169.527509,
      omegaDeg: 320.034463,
      M0Deg: 60,
      nDegPerDay: 518.3585313,
    },
  },
  phoebe: {
    parent: "saturn",
    elements: {
      epochJD: J2000_JD,
      aAU: 0.0865787724,
      e: 0.1635,
      iDeg: 173.040001,
      OmegaDeg: 241.570032,
      omegaDeg: 342.470032,
      M0Deg: 0,
      nDegPerDay: 0.6541767367,
    },
  },

  // --- Major Uranian ---
  // Miranda: P=1.41 d. Uranus J2 at small semi-major axis; envelope 1.6°.
  miranda: {
    parent: "uranus",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.000868067,
      e: 0.001318,
      iDeg: 100.54251,
      OmegaDeg: 164.189564,
      omegaDeg: 35.950344,
      M0Deg: 33.930746,
      // fix: fitted in-sample to the 2025-07-01 / 2026-01-01 fixtures.
      nDegPerDay: 254.692738,
    },
  },
  // Ariel: P=2.52 d. Uranus J2; envelope 0.3°.
  ariel: {
    parent: "uranus",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.001276303,
      e: 0.000328,
      iDeg: 97.712171,
      OmegaDeg: 167.661647,
      omegaDeg: 221.792544,
      M0Deg: 0.202294,
      // fix: fitted in-sample to the 2025-07-01 / 2026-01-01 fixtures.
      nDegPerDay: 142.835392,
    },
  },
  // Umbriel: P=4.14 d. Uranus J2; envelope 0.3°.
  umbriel: {
    parent: "uranus",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.001777846,
      e: 0.004169,
      iDeg: 97.707769,
      OmegaDeg: 167.72243,
      omegaDeg: 59.15342,
      M0Deg: 350.206625,
      // fix: fitted in-sample to the 2025-07-01 / 2026-01-01 fixtures.
      nDegPerDay: 86.868919,
    },
  },
  // Titania: P=8.71 d. Uranus J2; envelope 0.4°.
  titania: {
    parent: "uranus",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.002916309,
      e: 0.001193,
      iDeg: 97.765066,
      OmegaDeg: 167.640309,
      omegaDeg: 221.360305,
      M0Deg: 15.613765,
      // fix: fitted in-sample to the 2025-07-01 / 2026-01-01 fixtures.
      nDegPerDay: 41.35143,
    },
  },
  // Oberon: P=13.46 d. Uranus J2; envelope 0.4°.
  oberon: {
    parent: "uranus",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.00389973,
      e: 0.001524,
      iDeg: 97.905434,
      OmegaDeg: 167.71179,
      omegaDeg: 224.365314,
      M0Deg: 214.738022,
      // fix: fitted in-sample to the 2025-07-01 / 2026-01-01 fixtures.
      nDegPerDay: 26.739978,
    },
  },

  // --- Neptunian ---
  // Triton: P=5.88 d, retrograde. Added in W6 stage B; before it, Triton was a
  // legacy Kepler child whose catalog `i = 156.8°` was measured against
  // NEPTUNE'S EQUATOR while its Ω was fabricated, so no scene-graph state
  // reproduced the true orbit pole (the disclosed envelope was ~150°). The
  // ecliptic inclination inverted from the Horizons vector is 129.17°.
  triton: {
    parent: "neptune",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.002371478,
      e: 0.000027,
      iDeg: 129.170264,
      OmegaDeg: 222.392859,
      omegaDeg: 340.984172,
      M0Deg: 29.625503,
      // pub: Triton is synchronously locked, so its orbital mean motion IS the
      // IAU prime-meridian rate |Ẇ| = 61.2572637°/day (`BODY801_PM` in
      // `pck00011.tpc`) — a published constant, not a fit. Cross-checked
      // against Kepler III on the osculating `a` above: 61.2544°/day, agreeing
      // to 4.6e-5 relative. Two unrelated routes, so this also *measures* the
      // lock rather than assuming it.
      nDegPerDay: 61.2572637,
    },
  },

  // --- Pluto system ---
  // Charon: P=6.39 d. Also new in W6 stage B, and the more consequential fix —
  // its legacy record carried `O: 0, w: 0, M0: 0` (fabricated) against a true
  // `n` of 56.36, i.e. 22.8° of orbital phase invented per year. That made the
  // mutual-lock check undecidable, which is exactly the setup where somebody
  // nudges a transcribed constant to make a smoke look right.
  charon: {
    parent: "pluto",
    elements: {
      epochJD: EPOCH_2025_JD,
      aAU: 0.00013098,
      e: 0.000096,
      // 112.89° to the ecliptic. Independent confirmation that this element
      // set is sane: Pluto's IAU pole (α₀ 132.993 / δ₀ −6.163) puts its
      // equator 112.8° from the ecliptic, and Charon orbits in that plane.
      // The old record's `i: 0` was that same fact expressed in an
      // undeclared frame.
      iDeg: 112.887853,
      OmegaDeg: 227.39293,
      omegaDeg: 154.718896,
      M0Deg: 41.025066,
      // pub: the Pluto-Charon lock is double-synchronous, so this is Pluto's
      // own IAU Ẇ (`BODY999_PM`, 56.3625225°/day). Kepler III on the
      // osculating `a` gives 56.3710°/day, agreeing to 1.5e-4.
      nDegPerDay: 56.3625225,
    },
  },
};

/**
 * Heliocentric J2000 ecliptic osculating elements, all at epoch 2025-01-01.
 * Emitted by `scripts/derive-elements-from-fixtures.js`.
 *
 * (Do doador, asteroids.ts: sub-arcsecond match ao fixture na época;
 * deriva multi-ano dominada por perturbações planetárias não modeladas.
 * A janela de validade 2000–2050 é imposta pelo motor, não por este dado.)
 */
export const ASTEROIDS: Record<string, EclipticElements> = {
  ceres: {
    epochJD: EPOCH_2025_JD,
    aAU: 2.766360231,
    e: 0.079279,
    iDeg: 10.587933,
    OmegaDeg: 80.254308,
    omegaDeg: 73.262383,
    M0Deg: 162.150254,
  },
  pallas: {
    epochJD: EPOCH_2025_JD,
    aAU: 2.770234763,
    e: 0.2305,
    iDeg: 34.922344,
    OmegaDeg: 172.901824,
    omegaDeg: 310.894699,
    M0Deg: 142.309832,
  },
  vesta: {
    epochJD: EPOCH_2025_JD,
    aAU: 2.361078966,
    e: 0.090021,
    iDeg: 7.143939,
    OmegaDeg: 103.703637,
    omegaDeg: 151.639146,
    M0Deg: 298.710084,
  },
  // Casa: Hygiea — a adição da Onda 2. O doador a deixava no Kepler de
  // catálogo; aqui ela entra na família analítica. Bloco emitido por
  // scripts/data/atlas/derive-elements-from-fixtures.js contra o fixture
  // novo hygiea-2025-01-01.json (Horizons, COMMAND='10;', eclíptica J2000
  // heliocêntrica), mesma pipeline determinística dos três acima.
  hygiea: {
    epochJD: 2460676.5008931975,
    aAU: 3.14208104,
    e: 0.110175,
    iDeg: 3.831799,
    OmegaDeg: 283.14131,
    omegaDeg: 312.664894,
    M0Deg: 159.367851,
  },
};


/**
 * Casa: luas de TNO que seguem como Kepler DE CATÁLOGO (matriz §2.2 do
 * PLANO-ATLAS). Elementos copiados verbatim de
 * `src/data/celestialBodies.ts` do doador (vanth ~l.2691, weywot ~l.2746),
 * onde vivem como `orbit: { a, e, i, O, w, M0, n }` com n em °/dia e época
 * J2000 implícita (M = M0 + n·diasDesdeJ2000 no keplerProvider.ts do
 * doador) — o epochJD abaixo só torna explícita essa convenção.
 *
 * JANELA DE VALIDADE: INDEFINIDA. Ω/ω/M0 = 0 são FABRICADOS (o doador os
 * copiou assim de si mesmo e esta transcrição preserva o fato, declarado):
 * a, e e n são medidos; a orientação do plano e a fase são invenção. Serve
 * para desenhar uma órbita plausível, nunca para prever onde o corpo está.
 * Não há fixture Horizons para julgá-los — é exatamente por isso que ficam
 * numa tabela separada dos 20 analíticos.
 */
export const CATALOG_MOONS: Record<string, SatelliteEntry> = {
  // Measured orbit: a = 9030 km (6.04e-5 AU), P = 9.5393 d
  // (Brown & Butler 2018 / Sickafoose et al. 2019 occultation).
  // n was 90 deg/day (P = 4 d), i.e. 2.4x too fast on screen.
  vanth: {
    parent: "orcus",
    elements: {
      epochJD: J2000_JD,
      aAU: 0.0000604,
      e: 0.0,
      iDeg: 0.0,
      OmegaDeg: 0,
      omegaDeg: 0,
      M0Deg: 0,
      nDegPerDay: 37.74,
    },
  },
  // Measured orbit: a = 13,289 km (8.88e-5 AU), P = 12.431 d
  // (Vachier et al. 2012 / Kiss et al. 2024).
  weywot: {
    parent: "quaoar",
    elements: {
      epochJD: J2000_JD,
      aAU: 0.0000888,
      e: 0.14,
      iDeg: 0.0,
      OmegaDeg: 0,
      omegaDeg: 0,
      M0Deg: 0,
      nDegPerDay: 28.96,
    },
  },
};

/**
 * Casa: os PAIS heliocêntricos das luas de catálogo acima — Orcus e
 * Quaoar como Kepler de catálogo, copiados verbatim do mesmo
 * `celestialBodies.ts` do doador (orcus ~l.2470, quaoar ~l.2416,
 * `orbit: { a, e, i, O, w, M0, n }`). Entraram na revisão de olhos
 * frescos da Onda 2: sem eles, `posicaoHeliocentrica("vanth")` compunha
 * até o pai e MORRIA em "corpo desconhecido" — a composição recursiva
 * exige fechamento: todo centro citado por um corpo coberto precisa ser
 * ele mesmo coberto.
 *
 * MESMA janela INDEFINIDA das luas: a, e, i e n são medidos
 * (Orcus P≈245 a → n 0,004°/dia; Quaoar P≈289 a → n 0,0035°/dia — os n
 * do doador batem os períodos publicados), mas Ω/ω/M0 = 0 são
 * FABRICADOS. Órbita plausível, nunca previsão de posição; sem fixture
 * Horizons para julgá-los, por decisão de escopo (os TNOs resolvidos
 * são assunto da Onda 6).
 */
export const CATALOG_TNOS: Record<string, SatelliteEntry> = {
  orcus: {
    parent: "sun",
    elements: {
      epochJD: J2000_JD,
      aAU: 39.4,
      e: 0.22,
      iDeg: 20.6,
      OmegaDeg: 0,
      omegaDeg: 0,
      M0Deg: 0,
      nDegPerDay: 0.004,
    },
  },
  quaoar: {
    parent: "sun",
    elements: {
      epochJD: J2000_JD,
      aAU: 43.7,
      e: 0.038,
      iDeg: 8.0,
      OmegaDeg: 0,
      omegaDeg: 0,
      M0Deg: 0,
      nDegPerDay: 0.0035,
    },
  },
  // F6: Haumea/Makemake/Éris — elementos heliocêntricos do doador
  // (celestialBodies.ts), n = Kepler III no a publicado. Sem fixture
  // Horizons na casa; a nota do registro (família catálogo) cobre.
  haumea: {
    parent: "sun",
    elements: {
      epochJD: J2000_JD,
      aAU: 43.218,
      e: 0.188,
      iDeg: 28.19,
      OmegaDeg: 121.9,
      omegaDeg: 240.2,
      M0Deg: 217.7,
      nDegPerDay: 0.0034689,
    },
  },
  makemake: {
    parent: "sun",
    elements: {
      epochJD: J2000_JD,
      aAU: 45.715,
      e: 0.159,
      iDeg: 29.0,
      OmegaDeg: 79.4,
      omegaDeg: 298.4,
      M0Deg: 165.5,
      nDegPerDay: 0.0031891,
    },
  },
  eris: {
    parent: "sun",
    elements: {
      epochJD: J2000_JD,
      aAU: 67.781,
      e: 0.44,
      iDeg: 44.04,
      OmegaDeg: 35.8,
      omegaDeg: 151.4,
      M0Deg: 205.9,
      nDegPerDay: 0.0017663,
    },
  },
};
