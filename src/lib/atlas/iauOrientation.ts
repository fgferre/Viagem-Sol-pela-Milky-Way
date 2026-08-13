// ============================================================
// Orientação IAU — coeficientes de polo, meridiano-primo e spin dos
// 31 corpos com solução de rotação medida, MAIS os raios triaxiais.
//
// PROVENIÊNCIA (dado migra verbatim, PLANO-ATLAS §0.2 categoria 1):
// gerado por `scripts/data/atlas/derive-iau-orientation.js` (vendorizado
// do atlas-orbital) contra o kernel oficial
//   https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc
// em 2026-08-10 (528 atribuições parseadas). NUNCA editar números à mão:
// um W0 errado renderiza um planeta perfeitamente plausível — regenerar
// com o script e colar (é a diferença entre transcrever máquina→máquina
// e copiar tabela de PDF).
//
// CONFERÊNCIA CONTRA O DOADOR (2026-08-10): os escalares de polo/spin dos
// 31 corpos batem com src/data/celestialBodies.ts do atlas a 1e-12 — zero
// erro de transcrição manual lá. Diferença DELIBERADA daqui: o doador
// truncava termos periódicos pequenos à mão (Mercúrio 5 termos ≤0,011°,
// Júpiter 5 termos ≤0,0022°, Marte 13 termos ≤0,0004° — truncamentos que
// ele declarava em comentário); a casa embarca o kernel COMPLETO, 86
// termos, e aposenta a curadoria manual. O oráculo sub-ponto solar
// (subSolarPoint.test.ts) julga os dois; a diferença fica ordens abaixo
// do limiar de 0,1°.
//
// MODELO (convenção IAU/WGCCRE, unidades EXATAS do kernel):
//   RA  = poleRa  + poleRaRate·T   + Σ raAmp·sin θ      [graus; T séculos TDB]
//   DEC = poleDec + poleDecRate·T  + Σ decAmp·cos θ     [graus; T séculos TDB]
//   W   = W0      + spinRate·d + spinAccel·d² + Σ pmAmp·sin θ  [graus; d DIAS TDB]
// A quebra de unidade (polo por SÉCULO, spin por DIA) é do próprio kernel;
// confundir move um corpo por fator 36.525.
// Os tipos abaixo são verbatim do doador (src/lib/bodyOrientation.ts).
// ============================================================

/**
 * One periodic term of an IAU rotation model.
 *
 * The argument is θ = `phaseDeg` + `rateDegPerCentury`·T
 * (+ `rateDegPerCentury2`·T²), with T in Julian centuries TDB from J2000.0.
 * Following the IAU/WGCCRE convention, right ascension and prime-meridian
 * terms enter as A·sin θ and declination terms as A·cos θ — which is why the
 * three amplitudes are separate optional fields on one shared argument rather
 * than a single signed number.
 */
export interface IauNutPrecTerm {
  /** θ at J2000.0, degrees. */
  phaseDeg: number;
  /** dθ/dT, degrees per Julian century. */
  rateDegPerCentury: number;
  /**
   * d²θ/dT², degrees per Julian century squared. Absent = 0.
   *
   * Only the Mars system uses it (`BODY4_MAX_PHASE_DEGREE = 2` in the kernel),
   * and only Phobos consumes the accelerating angle — but it does so with the
   * largest single amplitude in its model (−1.143° on W), so this is a
   * load-bearing field for exactly one body rather than generality for its
   * own sake.
   */
  rateDegPerCentury2?: number;
  /** Amplitude added to α₀ as A·sin θ, degrees. */
  raAmpDeg?: number;
  /** Amplitude added to δ₀ as A·cos θ, degrees. */
  decAmpDeg?: number;
  /** Amplitude added to W as A·sin θ, degrees. */
  pmAmpDeg?: number;
}

/**
 * A body's IAU rotational elements: where its spin axis points and where its
 * prime meridian is at a given instant.
 *
 * **The presence of this record is the discriminator** for "this body has a
 * measured rotation solution", replacing the older `poleRA !== undefined`
 * sniffing. A record carrying only `poleRA`/`poleDec` means the pole is
 * measured but the *phase origin is not* — see `computeSpinAngleRad` in
 * `orientacao.ts`.
 */
export interface IauOrientation {
  /** α₀ at J2000.0, degrees (ICRF). */
  poleRaDeg: number;
  /** dα₀/dT, degrees per Julian century. Absent = 0. */
  poleRaRateDegPerCentury?: number;
  /** δ₀ at J2000.0, degrees (ICRF). */
  poleDecDeg: number;
  /** dδ₀/dT, degrees per Julian century. Absent = 0. */
  poleDecRateDegPerCentury?: number;
  /** W₀, degrees: the prime meridian measured east from node Q at J2000.0. */
  primeMeridianDeg: number;
  /** Ẇ, degrees per day. Negative for retrograde rotators. */
  spinRateDegPerDay: number;
  /**
   * Ẅ, degrees per day **squared** — note the unit break: the pole rates above
   * are per century while the spin terms are per day, exactly as the kernel
   * publishes them. Absent = 0.
   *
   * Phobos is the case that needs it: 9.5e-9°/day² looks like rounding noise
   * and is 12.7° of prime meridian per century, because it is the tidal
   * secular acceleration of a moon spiralling into Mars.
   */
  spinAccelDegPerDay2?: number;
  /** Periodic corrections. Absent = the secular model only. */
  nutPrec?: readonly IauNutPrecTerm[];
}

export const IAU_ORIENTATIONS: Record<string, IauOrientation> = {
  // NAIF 10
  sun: {
    poleRaDeg: 286.13,
    poleDecDeg: 63.87,
    primeMeridianDeg: 84.176,
    spinRateDegPerDay: 14.1844,
  },
  // NAIF 199
  mercury: {
    poleRaDeg: 281.0103,
    poleRaRateDegPerCentury: -0.0328,
    poleDecDeg: 61.4155,
    poleDecRateDegPerCentury: -0.0049,
    primeMeridianDeg: 329.5988,
    spinRateDegPerDay: 6.1385108,
    nutPrec: [
      {
        phaseDeg: 174.7910857,
        rateDegPerCentury: 149472.53587500003,
        pmAmpDeg: 0.01067257,
      },
      {
        phaseDeg: 349.5821714,
        rateDegPerCentury: 298945.07175000006,
        pmAmpDeg: -0.00112309,
      },
      {
        phaseDeg: 164.3732571,
        rateDegPerCentury: 448417.60762500006,
        pmAmpDeg: -0.0001104,
      },
      {
        phaseDeg: 339.1643429,
        rateDegPerCentury: 597890.1435000001,
        pmAmpDeg: -0.00002539,
      },
      {
        phaseDeg: 153.9554286,
        rateDegPerCentury: 747362.679375,
        pmAmpDeg: -0.00000571,
      },
    ],
  },
  // NAIF 299
  venus: {
    poleRaDeg: 272.76,
    poleDecDeg: 67.16,
    primeMeridianDeg: 160.2,
    spinRateDegPerDay: -1.4813688,
  },
  // NAIF 301
  moon: {
    poleRaDeg: 269.9949,
    poleRaRateDegPerCentury: 0.0031,
    poleDecDeg: 66.5392,
    poleDecRateDegPerCentury: 0.013,
    primeMeridianDeg: 38.3213,
    spinRateDegPerDay: 13.17635815,
    spinAccelDegPerDay2: -1.4e-12,
    nutPrec: [
      {
        phaseDeg: 125.045,
        rateDegPerCentury: -1935.5364525,
        raAmpDeg: -3.8787,
        decAmpDeg: 1.5419,
        pmAmpDeg: 3.561,
      },
      {
        phaseDeg: 250.089,
        rateDegPerCentury: -3871.072905,
        raAmpDeg: -0.1204,
        decAmpDeg: 0.0239,
        pmAmpDeg: 0.1208,
      },
      {
        phaseDeg: 260.008,
        rateDegPerCentury: 475263.3328725,
        raAmpDeg: 0.07,
        decAmpDeg: -0.0278,
        pmAmpDeg: -0.0642,
      },
      {
        phaseDeg: 176.625,
        rateDegPerCentury: 487269.629985,
        raAmpDeg: -0.0172,
        decAmpDeg: 0.0068,
        pmAmpDeg: 0.0158,
      },
      {
        phaseDeg: 357.529,
        rateDegPerCentury: 35999.0509575,
        pmAmpDeg: 0.0252,
      },
      {
        phaseDeg: 311.589,
        rateDegPerCentury: 964468.49931,
        raAmpDeg: 0.0072,
        decAmpDeg: -0.0029,
        pmAmpDeg: -0.0066,
      },
      {
        phaseDeg: 134.963,
        rateDegPerCentury: 477198.869325,
        decAmpDeg: 0.0009,
        pmAmpDeg: -0.0047,
      },
      {
        phaseDeg: 276.617,
        rateDegPerCentury: 12006.300765,
        pmAmpDeg: -0.0046,
      },
      {
        phaseDeg: 34.226,
        rateDegPerCentury: 63863.5132425,
        pmAmpDeg: 0.0028,
      },
      {
        phaseDeg: 15.134,
        rateDegPerCentury: -5806.6093575,
        raAmpDeg: -0.0052,
        decAmpDeg: 0.0008,
        pmAmpDeg: 0.0052,
      },
      {
        phaseDeg: 119.743,
        rateDegPerCentury: 131.84064,
        pmAmpDeg: 0.004,
      },
      {
        phaseDeg: 239.961,
        rateDegPerCentury: 6003.1503825,
        pmAmpDeg: 0.0019,
      },
      {
        phaseDeg: 25.053,
        rateDegPerCentury: 473327.79642,
        raAmpDeg: 0.0043,
        decAmpDeg: -0.0009,
        pmAmpDeg: -0.0044,
      },
    ],
  },
  // NAIF 399
  earth: {
    poleRaDeg: 0,
    poleRaRateDegPerCentury: -0.641,
    poleDecDeg: 90,
    poleDecRateDegPerCentury: -0.557,
    primeMeridianDeg: 190.147,
    spinRateDegPerDay: 360.9856235,
  },
  // NAIF 401
  phobos: {
    poleRaDeg: 317.67071657,
    poleRaRateDegPerCentury: -0.10844326,
    poleDecDeg: 52.88627266,
    poleDecRateDegPerCentury: -0.06134706,
    primeMeridianDeg: 35.1877444,
    spinRateDegPerDay: 1128.84475928,
    spinAccelDegPerDay2: 9.536137031212154e-9,
    nutPrec: [
      {
        phaseDeg: 190.72646643,
        rateDegPerCentury: 15917.10818695,
        raAmpDeg: -1.78428399,
        decAmpDeg: -1.07516537,
        pmAmpDeg: 1.42421769,
      },
      {
        phaseDeg: 21.4689247,
        rateDegPerCentury: 31834.27934054,
        raAmpDeg: 0.02212824,
        decAmpDeg: 0.00668626,
        pmAmpDeg: -0.02273783,
      },
      {
        phaseDeg: 332.86082793,
        rateDegPerCentury: 19139.89694742,
        raAmpDeg: -0.01028251,
        decAmpDeg: -0.0064874,
        pmAmpDeg: 0.00410711,
      },
      {
        phaseDeg: 394.93256437,
        rateDegPerCentury: 38280.79631835,
        raAmpDeg: -0.00475595,
        decAmpDeg: 0.00281576,
        pmAmpDeg: 0.00631964,
      },
      {
        phaseDeg: 189.6327156,
        rateDegPerCentury: 41215158.1842005,
        rateDegPerCentury2: 12.711923222,
        pmAmpDeg: -1.143,
      },
    ],
  },
  // NAIF 402
  deimos: {
    poleRaDeg: 316.65705808,
    poleRaRateDegPerCentury: -0.10518014,
    poleDecDeg: 53.50992033,
    poleDecRateDegPerCentury: -0.05979094,
    primeMeridianDeg: 79.39932954,
    spinRateDegPerDay: 285.16188899,
    nutPrec: [
      {
        phaseDeg: 121.46893664,
        rateDegPerCentury: 660.22803474,
        raAmpDeg: 3.09217726,
        decAmpDeg: 1.83936004,
        pmAmpDeg: -2.73954829,
      },
      {
        phaseDeg: 231.05028581,
        rateDegPerCentury: 660.9912354,
        raAmpDeg: 0.22980637,
        decAmpDeg: 0.1432532,
        pmAmpDeg: -0.39968606,
      },
      {
        phaseDeg: 251.37314025,
        rateDegPerCentury: 1320.50145245,
        raAmpDeg: 0.06418655,
        decAmpDeg: 0.01911409,
        pmAmpDeg: -0.06563259,
      },
      {
        phaseDeg: 217.98635955,
        rateDegPerCentury: 38279.9612555,
        raAmpDeg: 0.02533537,
        decAmpDeg: -0.0148259,
        pmAmpDeg: -0.0291294,
      },
      {
        phaseDeg: 196.19729402,
        rateDegPerCentury: 19139.83628608,
        raAmpDeg: 0.00778695,
        decAmpDeg: 0.0019243,
        pmAmpDeg: 0.0169916,
      },
    ],
  },
  // NAIF 499
  mars: {
    poleRaDeg: 317.269202,
    poleRaRateDegPerCentury: -0.10927547,
    poleDecDeg: 54.432516,
    poleDecRateDegPerCentury: -0.05827105,
    primeMeridianDeg: 176.049863,
    spinRateDegPerDay: 350.891982443297,
    nutPrec: [
      {
        phaseDeg: 198.991226,
        rateDegPerCentury: 19139.4819985,
        raAmpDeg: 0.000068,
      },
      {
        phaseDeg: 226.292679,
        rateDegPerCentury: 38280.8511281,
        raAmpDeg: 0.000238,
      },
      {
        phaseDeg: 249.663391,
        rateDegPerCentury: 57420.7251593,
        raAmpDeg: 0.000052,
      },
      {
        phaseDeg: 266.18351,
        rateDegPerCentury: 76560.636795,
        raAmpDeg: 0.000009,
      },
      {
        phaseDeg: 79.398797,
        rateDegPerCentury: 0.5042615,
        raAmpDeg: 0.419057,
      },
      {
        phaseDeg: 122.433576,
        rateDegPerCentury: 19139.9407476,
        decAmpDeg: 0.000051,
      },
      {
        phaseDeg: 43.058401,
        rateDegPerCentury: 38280.8753272,
        decAmpDeg: 0.000141,
      },
      {
        phaseDeg: 57.663379,
        rateDegPerCentury: 57420.7517205,
        decAmpDeg: 0.000031,
      },
      {
        phaseDeg: 79.476401,
        rateDegPerCentury: 76560.6495004,
        decAmpDeg: 0.000005,
      },
      {
        phaseDeg: 166.325722,
        rateDegPerCentury: 0.5042615,
        decAmpDeg: 1.591274,
      },
      {
        phaseDeg: 129.071773,
        rateDegPerCentury: 19140.0328244,
        pmAmpDeg: 0.000145,
      },
      {
        phaseDeg: 36.352167,
        rateDegPerCentury: 38281.0473591,
        pmAmpDeg: 0.000157,
      },
      {
        phaseDeg: 56.668646,
        rateDegPerCentury: 57420.929536,
        pmAmpDeg: 0.00004,
      },
      {
        phaseDeg: 67.364003,
        rateDegPerCentury: 76560.2552215,
        pmAmpDeg: 0.000001,
      },
      {
        phaseDeg: 104.79268,
        rateDegPerCentury: 95700.4387578,
        pmAmpDeg: 0.000001,
      },
      {
        phaseDeg: 95.391654,
        rateDegPerCentury: 0.5042615,
        pmAmpDeg: 0.584542,
      },
    ],
  },
  // NAIF 501
  io: {
    poleRaDeg: 268.05,
    poleRaRateDegPerCentury: -0.009,
    poleDecDeg: 64.5,
    poleDecRateDegPerCentury: 0.003,
    primeMeridianDeg: 200.39,
    spinRateDegPerDay: 203.4889538,
    nutPrec: [
      {
        phaseDeg: 283.9,
        rateDegPerCentury: 4850.7,
        raAmpDeg: 0.094,
        decAmpDeg: 0.04,
        pmAmpDeg: -0.085,
      },
      {
        phaseDeg: 355.8,
        rateDegPerCentury: 1191.3,
        raAmpDeg: 0.024,
        decAmpDeg: 0.011,
        pmAmpDeg: -0.022,
      },
    ],
  },
  // NAIF 502
  europa: {
    poleRaDeg: 268.08,
    poleRaRateDegPerCentury: -0.009,
    poleDecDeg: 64.51,
    poleDecRateDegPerCentury: 0.003,
    primeMeridianDeg: 36.022,
    spinRateDegPerDay: 101.3747235,
    nutPrec: [
      {
        phaseDeg: 355.8,
        rateDegPerCentury: 1191.3,
        raAmpDeg: 1.086,
        decAmpDeg: 0.468,
        pmAmpDeg: -0.98,
      },
      {
        phaseDeg: 119.9,
        rateDegPerCentury: 262.1,
        raAmpDeg: 0.06,
        decAmpDeg: 0.026,
        pmAmpDeg: -0.054,
      },
      {
        phaseDeg: 229.8,
        rateDegPerCentury: 64.3,
        raAmpDeg: 0.015,
        decAmpDeg: 0.007,
        pmAmpDeg: -0.014,
      },
      {
        phaseDeg: 352.25,
        rateDegPerCentury: 2382.6,
        raAmpDeg: 0.009,
        decAmpDeg: 0.002,
        pmAmpDeg: -0.008,
      },
    ],
  },
  // NAIF 503
  ganymede: {
    poleRaDeg: 268.2,
    poleRaRateDegPerCentury: -0.009,
    poleDecDeg: 64.57,
    poleDecRateDegPerCentury: 0.003,
    primeMeridianDeg: 44.064,
    spinRateDegPerDay: 50.3176081,
    nutPrec: [
      {
        phaseDeg: 355.8,
        rateDegPerCentury: 1191.3,
        raAmpDeg: -0.037,
        decAmpDeg: -0.016,
        pmAmpDeg: 0.033,
      },
      {
        phaseDeg: 119.9,
        rateDegPerCentury: 262.1,
        raAmpDeg: 0.431,
        decAmpDeg: 0.186,
        pmAmpDeg: -0.389,
      },
      {
        phaseDeg: 229.8,
        rateDegPerCentury: 64.3,
        raAmpDeg: 0.091,
        decAmpDeg: 0.039,
        pmAmpDeg: -0.082,
      },
    ],
  },
  // NAIF 504
  callisto: {
    poleRaDeg: 268.72,
    poleRaRateDegPerCentury: -0.009,
    poleDecDeg: 64.83,
    poleDecRateDegPerCentury: 0.003,
    primeMeridianDeg: 259.51,
    spinRateDegPerDay: 21.5710715,
    nutPrec: [
      {
        phaseDeg: 119.9,
        rateDegPerCentury: 262.1,
        raAmpDeg: -0.068,
        decAmpDeg: -0.029,
        pmAmpDeg: 0.061,
      },
      {
        phaseDeg: 229.8,
        rateDegPerCentury: 64.3,
        raAmpDeg: 0.59,
        decAmpDeg: 0.254,
        pmAmpDeg: -0.533,
      },
      {
        phaseDeg: 113.35,
        rateDegPerCentury: 6070,
        raAmpDeg: 0.01,
        decAmpDeg: -0.004,
        pmAmpDeg: -0.009,
      },
    ],
  },
  // NAIF 599
  jupiter: {
    poleRaDeg: 268.056595,
    poleRaRateDegPerCentury: -0.006499,
    poleDecDeg: 64.495303,
    poleDecRateDegPerCentury: 0.002413,
    primeMeridianDeg: 284.95,
    spinRateDegPerDay: 870.536,
    nutPrec: [
      {
        phaseDeg: 99.360714,
        rateDegPerCentury: 4850.4046,
        raAmpDeg: 0.000117,
        decAmpDeg: 0.00005,
      },
      {
        phaseDeg: 175.895369,
        rateDegPerCentury: 1191.9605,
        raAmpDeg: 0.000938,
        decAmpDeg: 0.000404,
      },
      {
        phaseDeg: 300.323162,
        rateDegPerCentury: 262.5475,
        raAmpDeg: 0.001432,
        decAmpDeg: 0.000617,
      },
      {
        phaseDeg: 114.012305,
        rateDegPerCentury: 6070.2476,
        raAmpDeg: 0.00003,
        decAmpDeg: -0.000013,
      },
      {
        phaseDeg: 49.511251,
        rateDegPerCentury: 64.3,
        raAmpDeg: 0.00215,
        decAmpDeg: 0.000926,
      },
    ],
  },
  // NAIF 601
  mimas: {
    poleRaDeg: 40.66,
    poleRaRateDegPerCentury: -0.036,
    poleDecDeg: 83.52,
    poleDecRateDegPerCentury: -0.004,
    primeMeridianDeg: 333.46,
    spinRateDegPerDay: 381.994555,
    nutPrec: [
      {
        phaseDeg: 177.4,
        rateDegPerCentury: -36505.5,
        raAmpDeg: 13.56,
        decAmpDeg: -1.53,
        pmAmpDeg: -13.48,
      },
      {
        phaseDeg: 316.45,
        rateDegPerCentury: 506.2,
        pmAmpDeg: -44.85,
      },
    ],
  },
  // NAIF 602
  enceladus: {
    poleRaDeg: 40.66,
    poleRaRateDegPerCentury: -0.036,
    poleDecDeg: 83.52,
    poleDecRateDegPerCentury: -0.004,
    primeMeridianDeg: 6.32,
    spinRateDegPerDay: 262.7318996,
  },
  // NAIF 603
  tethys: {
    poleRaDeg: 40.66,
    poleRaRateDegPerCentury: -0.036,
    poleDecDeg: 83.52,
    poleDecRateDegPerCentury: -0.004,
    primeMeridianDeg: 8.95,
    spinRateDegPerDay: 190.6979085,
    nutPrec: [
      {
        phaseDeg: 300,
        rateDegPerCentury: -7225.9,
        raAmpDeg: 9.66,
        decAmpDeg: -1.09,
        pmAmpDeg: -9.6,
      },
      {
        phaseDeg: 316.45,
        rateDegPerCentury: 506.2,
        pmAmpDeg: 2.23,
      },
    ],
  },
  // NAIF 604
  dione: {
    poleRaDeg: 40.66,
    poleRaRateDegPerCentury: -0.036,
    poleDecDeg: 83.52,
    poleDecRateDegPerCentury: -0.004,
    primeMeridianDeg: 357.6,
    spinRateDegPerDay: 131.5349316,
  },
  // NAIF 605
  rhea: {
    poleRaDeg: 40.38,
    poleRaRateDegPerCentury: -0.036,
    poleDecDeg: 83.55,
    poleDecRateDegPerCentury: -0.004,
    primeMeridianDeg: 235.16,
    spinRateDegPerDay: 79.6900478,
    nutPrec: [
      {
        phaseDeg: 345.2,
        rateDegPerCentury: -1016.3,
        raAmpDeg: 3.1,
        decAmpDeg: -0.35,
        pmAmpDeg: -3.08,
      },
    ],
  },
  // NAIF 606
  titan: {
    poleRaDeg: 39.4827,
    poleDecDeg: 83.4279,
    primeMeridianDeg: 186.5855,
    spinRateDegPerDay: 22.5769768,
  },
  // NAIF 608
  iapetus: {
    poleRaDeg: 318.16,
    poleRaRateDegPerCentury: -3.949,
    poleDecDeg: 75.03,
    poleDecRateDegPerCentury: -1.143,
    primeMeridianDeg: 355.2,
    spinRateDegPerDay: 4.5379572,
  },
  // NAIF 699
  saturn: {
    poleRaDeg: 40.589,
    poleRaRateDegPerCentury: -0.036,
    poleDecDeg: 83.537,
    poleDecRateDegPerCentury: -0.004,
    primeMeridianDeg: 38.9,
    spinRateDegPerDay: 810.7939024,
  },
  // NAIF 701
  ariel: {
    poleRaDeg: 257.43,
    poleDecDeg: -15.1,
    primeMeridianDeg: 156.22,
    spinRateDegPerDay: -142.8356681,
    nutPrec: [
      {
        phaseDeg: 316.41,
        rateDegPerCentury: 2863.96,
        pmAmpDeg: 0.05,
      },
      {
        phaseDeg: 304.01,
        rateDegPerCentury: -51.94,
        raAmpDeg: 0.29,
        decAmpDeg: 0.28,
        pmAmpDeg: 0.08,
      },
    ],
  },
  // NAIF 702
  umbriel: {
    poleRaDeg: 257.43,
    poleDecDeg: -15.1,
    primeMeridianDeg: 108.05,
    spinRateDegPerDay: -86.8688923,
    nutPrec: [
      {
        phaseDeg: 316.41,
        rateDegPerCentury: 2863.96,
        pmAmpDeg: -0.09,
      },
      {
        phaseDeg: 308.71,
        rateDegPerCentury: -93.17,
        raAmpDeg: 0.21,
        decAmpDeg: 0.2,
        pmAmpDeg: 0.06,
      },
    ],
  },
  // NAIF 703
  titania: {
    poleRaDeg: 257.43,
    poleDecDeg: -15.1,
    primeMeridianDeg: 77.74,
    spinRateDegPerDay: -41.3514316,
    nutPrec: [
      {
        phaseDeg: 340.82,
        rateDegPerCentury: -75.32,
        raAmpDeg: 0.29,
        decAmpDeg: 0.28,
        pmAmpDeg: 0.08,
      },
    ],
  },
  // NAIF 704
  oberon: {
    poleRaDeg: 257.43,
    poleDecDeg: -15.1,
    primeMeridianDeg: 6.77,
    spinRateDegPerDay: -26.7394932,
    nutPrec: [
      {
        phaseDeg: 259.14,
        rateDegPerCentury: -504.81,
        raAmpDeg: 0.16,
        decAmpDeg: 0.16,
        pmAmpDeg: 0.04,
      },
    ],
  },
  // NAIF 705
  miranda: {
    poleRaDeg: 257.43,
    poleDecDeg: -15.08,
    primeMeridianDeg: 30.7,
    spinRateDegPerDay: -254.6906892,
    nutPrec: [
      {
        phaseDeg: 102.23,
        rateDegPerCentury: -2024.22,
        raAmpDeg: 4.41,
        decAmpDeg: 4.25,
        pmAmpDeg: 1.15,
      },
      {
        phaseDeg: 316.41,
        rateDegPerCentury: 2863.96,
        pmAmpDeg: -1.27,
      },
      {
        phaseDeg: 204.46,
        rateDegPerCentury: -4048.44,
        raAmpDeg: -0.04,
        decAmpDeg: -0.02,
        pmAmpDeg: -0.09,
      },
      {
        phaseDeg: 632.82,
        rateDegPerCentury: 5727.92,
        pmAmpDeg: 0.15,
      },
    ],
  },
  // NAIF 799
  uranus: {
    poleRaDeg: 257.311,
    poleDecDeg: -15.175,
    primeMeridianDeg: 203.81,
    spinRateDegPerDay: -501.1600928,
  },
  // NAIF 801
  triton: {
    poleRaDeg: 299.36,
    poleDecDeg: 41.17,
    primeMeridianDeg: 296.53,
    spinRateDegPerDay: -61.2572637,
    nutPrec: [
      {
        phaseDeg: 177.85,
        rateDegPerCentury: 52.316,
        raAmpDeg: -32.35,
        decAmpDeg: 22.55,
        pmAmpDeg: 22.25,
      },
      {
        phaseDeg: 355.7,
        rateDegPerCentury: 104.632,
        raAmpDeg: -6.28,
        decAmpDeg: 2.1,
        pmAmpDeg: 6.73,
      },
      {
        phaseDeg: 533.55,
        rateDegPerCentury: 156.948,
        raAmpDeg: -2.08,
        decAmpDeg: 0.55,
        pmAmpDeg: 2.05,
      },
      {
        phaseDeg: 711.4,
        rateDegPerCentury: 209.264,
        raAmpDeg: -0.74,
        decAmpDeg: 0.16,
        pmAmpDeg: 0.74,
      },
      {
        phaseDeg: 889.25,
        rateDegPerCentury: 261.58,
        raAmpDeg: -0.28,
        decAmpDeg: 0.05,
        pmAmpDeg: 0.28,
      },
      {
        phaseDeg: 1067.1,
        rateDegPerCentury: 313.896,
        raAmpDeg: -0.11,
        decAmpDeg: 0.02,
        pmAmpDeg: 0.11,
      },
      {
        phaseDeg: 1244.95,
        rateDegPerCentury: 366.212,
        raAmpDeg: -0.07,
        decAmpDeg: 0.01,
        pmAmpDeg: 0.05,
      },
      {
        phaseDeg: 1422.8,
        rateDegPerCentury: 418.528,
        raAmpDeg: -0.02,
        pmAmpDeg: 0.02,
      },
      {
        phaseDeg: 1600.65,
        rateDegPerCentury: 470.844,
        raAmpDeg: -0.01,
        pmAmpDeg: 0.01,
      },
    ],
  },
  // NAIF 899
  neptune: {
    poleRaDeg: 299.36,
    poleDecDeg: 43.46,
    primeMeridianDeg: 249.978,
    spinRateDegPerDay: 541.1397757,
    nutPrec: [
      {
        phaseDeg: 357.85,
        rateDegPerCentury: 52.316,
        raAmpDeg: 0.7,
        decAmpDeg: -0.51,
        pmAmpDeg: -0.48,
      },
    ],
  },
  // NAIF 901
  charon: {
    poleRaDeg: 132.993,
    poleDecDeg: -6.163,
    primeMeridianDeg: 122.695,
    spinRateDegPerDay: 56.3625225,
  },
  // NAIF 999
  pluto: {
    poleRaDeg: 132.993,
    poleDecDeg: -6.163,
    primeMeridianDeg: 302.695,
    spinRateDegPerDay: 56.3625225,
  },
  // NAIF 2000001 — pck00011 BODY2000001_POLE_*/PM
  ceres: {
    poleRaDeg: 291.418,
    poleDecDeg: 66.764,
    primeMeridianDeg: 170.65,
    spinRateDegPerDay: 952.1532,
  },
  // F6: sem IAU no pck00011. Polo = norte ECLÍPTICO em equatorial
  // (α=270°, δ=66,5607°) — o mesmo da câmera pinada de quaoar-anel;
  // W de 17,68 h (Pereira23 / Morgado23). Didático, declarado.
  quaoar: {
    poleRaDeg: 270,
    poleDecDeg: 66.5607,
    primeMeridianDeg: 0,
    spinRateDegPerDay: 488.6877828,
  },
  // F6: Haumea/Makemake/Éris sem kernel. Polo equatorial norte
  // declarado (não há IAU no pck); W da rotação publicada do doador
  // (3,9 h / 7,77 h / 25,9 h). Superfície procedural — o polo só
  // orienta o −3 inventado.
  haumea: {
    poleRaDeg: 0,
    poleDecDeg: 90,
    primeMeridianDeg: 0,
    spinRateDegPerDay: 2215.3846154,
  },
  makemake: {
    poleRaDeg: 0,
    poleDecDeg: 90,
    primeMeridianDeg: 0,
    spinRateDegPerDay: 1111.9691117,
  },
  eris: {
    poleRaDeg: 0,
    poleDecDeg: 90,
    primeMeridianDeg: 0,
    spinRateDegPerDay: 333.5907336,
  },
  // F7: Vesta/Palas pck00011 BODY2000004/2000002. Hígia sem
  // kernel — polo equatorial norte declarado; W de 13,8 h
  // (doador rotationPeriodHours).
  vesta: {
    poleRaDeg: 309.031,
    poleDecDeg: 42.235,
    primeMeridianDeg: 285.39,
    spinRateDegPerDay: 1617.3329428,
  },
  pallas: {
    poleRaDeg: 33,
    poleDecDeg: -3,
    primeMeridianDeg: 38,
    spinRateDegPerDay: 1105.8036,
  },
  hygiea: {
    poleRaDeg: 0,
    poleDecDeg: 90,
    primeMeridianDeg: 0,
    spinRateDegPerDay: 626.0869565,
  },
};

/**
 * Raios triaxiais (km), `BODY<n>_RADII` do MESMO kernel e da MESMA rodada —
 * a figura que uma comparação de sub-ponto usa não pode derivar de outro
 * lugar que o polo que ela julga. Corpos esféricos (a≈b≈c a 1e-4) ficam de
 * fora de propósito: não contribuem à conversão planetocêntrica→planetodética.
 */
export const BODY_AXES: Record<string, readonly [number, number, number]> = {
  mercury: [2440.53, 2440.53, 2438.26],
  earth: [6378.1366, 6378.1366, 6356.7519],
  // A LUA É A EXCEÇÃO DECLARADA à regra "esférico fica de fora": o
  // critério acima serve à conversão planetodética, mas desde a Onda 6
  // (F2b) esta tabela é TAMBÉM a fonte única de raio físico dos corpos
  // RESOLVIDOS (terra.ts/lua.ts — nenhum literal de raio nasce lá), e a
  // Lua renderiza. BODY301_RADII do MESMO kernel pck00011: esfera exata
  // (a = b = c), então a conversão de latitude segue identidade — o
  // emitRadii do script continua pulando esferas; esta linha é mantida
  // à mão com a citação, não regenerada.
  moon: [1737.4, 1737.4, 1737.4],
  // VÊNUS entra pela MESMA exceção da Lua (F3): esfera exata (BODY2_RADII
  // do pck00011 — 6051,8 km nos três eixos), mantida à mão com a citação
  // porque o emissor pula esferas e a tabela é a fonte única de raio
  // físico dos corpos resolvidos.
  venus: [6051.8, 6051.8, 6051.8],
  phobos: [13, 11.4, 9.1],
  deimos: [7.8, 6, 5.1],
  mars: [3396.19, 3396.19, 3376.2],
  io: [1829.4, 1819.4, 1815.7],
  europa: [1562.6, 1560.3, 1559.5],
  // Ganimedes, Calisto, Umbriel, Titânia, Oberon e Tritão: a MESMA
  // exceção da Lua/Vênus (F5). BODY503/504/702/703/704/801_RADII do
  // pck00011 — esferas exatas, o emissor pula; a tabela é a fonte
  // única de raio dos resolvidos.
  ganymede: [2631.2, 2631.2, 2631.2],
  callisto: [2410.3, 2410.3, 2410.3],
  jupiter: [71492, 71492, 66854],
  mimas: [207.8, 196.7, 190.6],
  enceladus: [256.6, 251.4, 248.3],
  tethys: [538.4, 528.3, 526.3],
  dione: [563.4, 561.3, 559.6],
  rhea: [765, 763.1, 762.4],
  titan: [2575.15, 2574.78, 2574.47],
  iapetus: [745.7, 745.7, 712.1],
  saturn: [60268, 60268, 54364],
  ariel: [581.1, 577.9, 577.7],
  umbriel: [584.7, 584.7, 584.7],
  titania: [788.9, 788.9, 788.9],
  oberon: [761.4, 761.4, 761.4],
  miranda: [240.4, 234.2, 232.9],
  uranus: [25559, 25559, 24973],
  neptune: [24764, 24764, 24341],
  triton: [1352.6, 1352.6, 1352.6],
  // F6: esferas/elipsoides mão-mantidas. Plutão/Caronte BODY999/901
  // do pck00011; Ceres BODY2000001_RADII atuais 487,3×487,3×446
  // (o bloco "valores antigos" do kernel, IAU 2009, era 454,7 no
  // polo — não usar). Quaoar: R=543 km [Pereira23] × shapeScale
  // [1,18, 0,99, 0,86] em ordem de publicação (a,b,c) — c curto =
  // eixo de rotação (cicatriz herdada; a matriz aplica (a,c,b)).
  // Haumea Jacobi ~1161×852×513 (Lockwood et al. / IAU); Makemake
  // 715 e Éris 1163 esferas (ocultações; donor radiusKm).
  pluto: [1188.3, 1188.3, 1188.3],
  charon: [606, 606, 606],
  ceres: [487.3, 487.3, 446],
  quaoar: [640.74, 537.57, 466.98],
  haumea: [1161, 852, 513],
  makemake: [715, 715, 715],
  eris: [1163, 1163, 1163],
  // F7: Vesta BODY2000004_RADII 289×280×229. Palas sem
  // BODY*_RADII no pck — esfera 256 km (doador radiusKm).
  // Hígia sem kernel — esfera 217 km (doador radiusKm /
  // Vernazza mean). Modelos DAMIT/NASA GLB-OBJ: pendentes
  // (sem GLTFLoader/OBJLoader na casa).
  vesta: [289, 280, 229],
  pallas: [256, 256, 256],
  hygiea: [217, 217, 217],
};
