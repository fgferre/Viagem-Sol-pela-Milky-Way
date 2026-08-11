// ============================================================
// Frame galáctico — a ponte completa de referenciais do modo Atlas:
// eclíptica J2000 → equatorial J2000 → galáctica (IAU 1958) → base
// de cena do projeto. Runtime RENASCIDO (PLANO-ATLAS §0): o doador
// espalhava essas rotações entre coordUtils.ts (tudo THREE.Vector3),
// uma cópia local da obliquidade em hygFrame.ts e o par
// ecliptic2ThreeJs/equatorial2Ecliptic; aqui a álgebra é tupla pura —
// ZERO three — e a conversão para objetos de cena fica na borda de
// quem chama.
//
// CICATRIZES HERDADAS:
// 1. Obliquidade 23.4392808° — o MESMO literal do doador
//    (coordUtils.ts: OBLIQUITY_J2000_RAD), mantido pela consistência
//    com os oráculos que migram com ele: 84381,411″ contra 84381,406″
//    do IAU 2006 — ~5 milissegundos de arco, ordens abaixo do gate
//    de 0,01° (36″). Trocar o literal "pelo certo" moveria todos os
//    oráculos por nada mensurável.
// 2. O doador teve uma função (AstroPhysics.equatorialToEcliptic) que
//    rotacionava E remapeava para Y-up do three sob um nome que
//    prometia só a primeira coisa — coordUtils.ts:81-87 registra o
//    conserto. Aqui cada função faz UMA mudança de base e o nome diz
//    qual; só a última função conhece a base de cena.
// 3. Matriz galáctica CONSTRUÍDA da definição (NGP + lNCP), não
//    transcrita de tabela: um elemento de matriz digitado errado gera
//    um céu perfeitamente plausível (mesma lição do W0 em
//    iauOrientation.ts). O teste (c) cobra bDeg(NGP) = 90° a 1e-9 —
//    prova de construção, não de transcrição.
//
// DUPLICAÇÃO DELIBERADA COM O PIPELINE: scripts/data/lib/galactic.mjs
// (heliocentricGalacticToProject) é quem carimba os binários de
// public/data/galaxy; este módulo repete a MESMA convenção para o
// runtime. O elo entre os dois NÃO é import compartilhado — runtime
// não enxerga scripts/, pipeline não enxerga src/ — é ORÁCULO: os
// casos fixos de verify-assets.mjs estão reproduzidos em
// frameGalactico.test.ts a 1e-8. Se a convenção mudar lá, o teste
// daqui quebra antes de a cena mentir.
//
// SINAL DE Y: y = −d·cos b·sin l. A base do projeto é dextrógira com
// +Y → l = 270° (galaxy.ts: EY = EZ × EX); uma fonte em l = 90° tem
// Y NEGATIVO. O sinal está gravado em galaxy.ts:82-84 e no cabeçalho
// de galactic.mjs — não é erro, é a convenção da casa.
// ============================================================

/** Vetor cartesiano imutável — a moeda deste módulo (sem three). */
export type Vec3 = readonly [number, number, number];

/** Matriz 3×3 por LINHAS: aplicar = linha·vetor. */
export type Mat3 = readonly [Vec3, Vec3, Vec3];

const DEG_PARA_RAD = Math.PI / 180;
const RAD_PARA_DEG = 180 / Math.PI;

/**
 * Obliquidade média da eclíptica em J2000, graus — literal idêntico ao
 * do doador (atlas-orbital, coordUtils.ts: OBLIQUITY_J2000_RAD =
 * 23.4392808°). Ver cicatriz 1 no cabeçalho.
 */
export const OBLIQUIDADE_J2000_DEG = 23.4392808;

/**
 * Polo norte galáctico no sistema equatorial J2000 — definição IAU 1958
 * (Blaauw et al. 1960) transportada a J2000; são os valores canônicos do
 * catálogo Hipparcos (ESA 1997, vol. 1, §1.5.3), a mesma convenção do
 * costume astronômico.
 */
export const NGP_RA_DEG = 192.85948;
export const NGP_DEC_DEG = 27.12825;

/**
 * Longitude galáctica do polo celeste norte (ângulo de posição do polo,
 * mesma fonte IAU 1958/J2000 acima). Fecha a definição da base: diz onde
 * l = 0 fica dentro do plano galáctico.
 */
export const L_NCP_DEG = 122.93192;

/**
 * AU → pc. O literal 206264.80624548031 é o especificado como elo com o
 * pipeline da fusão; numericamente é 3.0856775814671916e16 m (parsec
 * derivado do AU pré-2012 de 1.49597870691e11 m, valor corrente nas
 * bibliotecas) dividido por 1.495978707e11 m (AU IAU 2012). Difere de
 * 648000/π (206264.80624709636) por 8e-12 relativo — ~240 m por parsec,
 * nada mensurável em qualquer gate.
 */
export const AU_PARA_PC = 1 / 206_264.80624548031;

/**
 * O Sol na base do projeto — espelho EXATO de GALACTIC_FRAME em
 * scripts/data/lib/galactic.mjs (sunRadiusPc 8150, sunHeightPc 5.5).
 * Duplicação deliberada; o elo é o oráculo de casos fixos (cabeçalho).
 */
export const RAIO_SOL_PC = 8_150;
export const ALTURA_SOL_PC = 5.5;

function versorEquatorial(raDeg: number, decDeg: number): Vec3 {
  const ra = raDeg * DEG_PARA_RAD;
  const dec = decDeg * DEG_PARA_RAD;
  const cosDec = Math.cos(dec);
  return [cosDec * Math.cos(ra), cosDec * Math.sin(ra), Math.sin(dec)];
}

function aplicar(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

/** Inversa de rotação é a transposta — sem inverter matriz numericamente. */
function aplicarTransposta(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2],
    m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2],
    m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2],
  ];
}

const COS_OBL = Math.cos(OBLIQUIDADE_J2000_DEG * DEG_PARA_RAD);
const SIN_OBL = Math.sin(OBLIQUIDADE_J2000_DEG * DEG_PARA_RAD);

/**
 * Rotação de +ε em torno de x̂ (o equinócio vernal, comum às duas bases):
 * leva eclíptica J2000 → equatorial J2000. A transposta é a inversa e
 * reproduz exatamente o equatorial2Ecliptic do doador.
 */
export const MATRIZ_ECLIPTICA_PARA_EQUATORIAL: Mat3 = [
  [1, 0, 0],
  [0, COS_OBL, -SIN_OBL],
  [0, SIN_OBL, COS_OBL],
];

// ---- Construção da base galáctica (cicatriz 3: da definição, não de
// tabela). ẑ_gal é o NGP. O polo celeste norte (0,0,1), projetado no
// plano galáctico, aponta por definição para l = lNCP; girar essa
// projeção de −lNCP em torno de ẑ_gal dá x̂_gal (l = 0, o centro
// galáctico) e ŷ_gal = ẑ×x̂ (l = 90°) sai da mesma conta.
const Z_GAL = versorEquatorial(NGP_RA_DEG, NGP_DEC_DEG);
const PROJ = Z_GAL[2]; // (0,0,1)·ẑ_gal
const P_PERP_BRUTO: Vec3 = [
  -PROJ * Z_GAL[0],
  -PROJ * Z_GAL[1],
  1 - PROJ * Z_GAL[2],
];
const NORMA_P = Math.hypot(P_PERP_BRUTO[0], P_PERP_BRUTO[1], P_PERP_BRUTO[2]);
const P_PERP: Vec3 = [
  P_PERP_BRUTO[0] / NORMA_P,
  P_PERP_BRUTO[1] / NORMA_P,
  P_PERP_BRUTO[2] / NORMA_P,
];
// q̂ = ẑ_gal × p̂_perp completa o triedro no plano galáctico.
const Q: Vec3 = [
  Z_GAL[1] * P_PERP[2] - Z_GAL[2] * P_PERP[1],
  Z_GAL[2] * P_PERP[0] - Z_GAL[0] * P_PERP[2],
  Z_GAL[0] * P_PERP[1] - Z_GAL[1] * P_PERP[0],
];
const COS_LNCP = Math.cos(L_NCP_DEG * DEG_PARA_RAD);
const SIN_LNCP = Math.sin(L_NCP_DEG * DEG_PARA_RAD);
// Na base galáctica, p̂_perp = (cos lNCP, sin lNCP, 0) e q̂ =
// (−sin lNCP, cos lNCP, 0); resolver para x̂ e ŷ dá as combinações abaixo.
const X_GAL: Vec3 = [
  P_PERP[0] * COS_LNCP - Q[0] * SIN_LNCP,
  P_PERP[1] * COS_LNCP - Q[1] * SIN_LNCP,
  P_PERP[2] * COS_LNCP - Q[2] * SIN_LNCP,
];
const Y_GAL: Vec3 = [
  P_PERP[0] * SIN_LNCP + Q[0] * COS_LNCP,
  P_PERP[1] * SIN_LNCP + Q[1] * COS_LNCP,
  P_PERP[2] * SIN_LNCP + Q[2] * COS_LNCP,
];

/**
 * Equatorial J2000 → galáctica cartesiana dextrógira:
 * x̂ → l = 0 (centro galáctico), ŷ → l = 90°, ẑ → NGP.
 */
export const MATRIZ_EQUATORIAL_PARA_GALACTICA: Mat3 = [X_GAL, Y_GAL, Z_GAL];

export function eclipticaParaEquatorial(v: Vec3): Vec3 {
  return aplicar(MATRIZ_ECLIPTICA_PARA_EQUATORIAL, v);
}

export function equatorialParaEcliptica(v: Vec3): Vec3 {
  return aplicarTransposta(MATRIZ_ECLIPTICA_PARA_EQUATORIAL, v);
}

export function equatorialParaGalactica(v: Vec3): Vec3 {
  return aplicar(MATRIZ_EQUATORIAL_PARA_GALACTICA, v);
}

export function galacticaParaEquatorial(v: Vec3): Vec3 {
  return aplicarTransposta(MATRIZ_EQUATORIAL_PARA_GALACTICA, v);
}

/**
 * (α, δ) J2000 em graus → (l, b) galácticos em graus, l em [0, 360).
 *
 * b sai de atan2(z, hipotenusa) e NÃO de asin(z): com b → ±90° o asin
 * amplia o arredondamento de z ≈ 1 para ~1e-6 grau e o gate (c) — NGP
 * de volta a b = 90° a 1e-9 — não fecharia.
 */
export function radecParaGalactica(
  raDeg: number,
  decDeg: number
): { lDeg: number; bDeg: number } {
  const g = equatorialParaGalactica(versorEquatorial(raDeg, decDeg));
  let lDeg = Math.atan2(g[1], g[0]) * RAD_PARA_DEG;
  if (lDeg < 0) lDeg += 360;
  const bDeg = Math.atan2(g[2], Math.hypot(g[0], g[1])) * RAD_PARA_DEG;
  return { lDeg, bDeg };
}

/**
 * A ponte para a CENA: posição heliocêntrica eclíptica J2000 em AU →
 * [x, y, z] em pc na base do projeto — a MESMA convenção de
 * heliocentricGalacticToProject (scripts/data/lib/galactic.mjs):
 *
 *   x = 8150 − d·cos b·cos l;  y = −d·cos b·sin l;  z = 5.5 + d·sin b
 *
 * ADAPTAÇÃO DECLARADA: o .mjs parte de (l, b, d) esféricos; aqui o vetor
 * já chega cartesiano, e a identidade gx = d·cos b·cos l,
 * gy = d·cos b·sin l, gz = d·sin b é exata — dispensa a viagem por
 * ângulos. O teste (e) prova a equivalência contra os casos fixos de
 * verify-assets.mjs a 1e-8.
 */
export function posicaoHeliocentricaEclipticaParaCena(
  vAU: Vec3
): [number, number, number] {
  const gal = equatorialParaGalactica(eclipticaParaEquatorial(vAU));
  return [
    RAIO_SOL_PC - gal[0] * AU_PARA_PC,
    // sinal deliberado da casa: +Y da base → l = 270° (ver cabeçalho)
    -gal[1] * AU_PARA_PC,
    ALTURA_SOL_PC + gal[2] * AU_PARA_PC,
  ];
}
