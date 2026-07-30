// ============================================================
// Contrato cartográfico compartilhado da Via Láctea.
//
// A geometria observável perto do Sol segue os ajustes de masers
// de Reid et al. (2019); o lado distante continua proceduralmente,
// com contraste menor, como nas impressões Gaia/ESA de 2025.
//
// Fontes primárias:
// - Gaia/ESA 2025: https://www.cosmos.esa.int/web/gaia/milky-way
// - Reid et al. 2019: https://arxiv.org/abs/1910.03357
// - Wegg et al. 2015 (barra): https://arxiv.org/abs/1504.01401
// ============================================================

export const GALACTIC_MODEL = {
  sunRadiusPc: 8_150,
  sunHeightPc: 5.5,
  diskRadiusPc: 16_800,
  stellarScaleLengthPc: 2_600,
  barHalfLengthPc: 5_000,
  barAngleRad: (-29 * Math.PI) / 180,
  warpStartPc: 8_400,
  warpAmplitudePc: 820,
  warpPhaseRad: (5 * Math.PI) / 180,
} as const;

export interface SpiralArmDefinition {
  readonly id: 'perseus' | 'sagittarius-carina' | 'scutum-centaurus' | 'norma-outer';
  readonly phaseAtSunRad: number;
  readonly pitchInnerDeg: number;
  readonly pitchOuterDeg: number;
  readonly weight: number;
  readonly minRadiusPc: number;
  readonly maxRadiusPc: number;
  readonly tint: readonly [number, number, number];
}

/**
 * Quatro famílias principais. As fases põem o Sol entre Sagittarius-Carina
 * e Perseus; pitches individuais ficam dentro do intervalo observado
 * (~7–20°) e mudam no raio solar para introduzir os "kinks" medidos.
 */
export const SPIRAL_ARMS: readonly SpiralArmDefinition[] = [
  {
    id: 'perseus',
    phaseAtSunRad: -0.52,
    pitchInnerDeg: 10.3,
    pitchOuterDeg: 8.7,
    weight: 0.86,
    minRadiusPc: 6_200,
    maxRadiusPc: 16_200,
    tint: [0.68, 0.79, 1.0],
  },
  {
    id: 'sagittarius-carina',
    phaseAtSunRad: 1.02,
    pitchInnerDeg: 17.1,
    pitchOuterDeg: 10.1,
    weight: 0.76,
    minRadiusPc: 4_200,
    maxRadiusPc: 13_300,
    tint: [0.78, 0.76, 1.0],
  },
  {
    id: 'scutum-centaurus',
    phaseAtSunRad: 2.64,
    pitchInnerDeg: 14.1,
    pitchOuterDeg: 12.1,
    weight: 0.82,
    minRadiusPc: 2_700,
    maxRadiusPc: 10_600,
    tint: [0.72, 0.82, 1.0],
  },
  {
    id: 'norma-outer',
    phaseAtSunRad: -2.15,
    pitchInnerDeg: 19.5,
    pitchOuterDeg: 9.4,
    weight: 0.72,
    minRadiusPc: 2_200,
    maxRadiusPc: 7_700,
    tint: [0.63, 0.74, 1.0],
  },
] as const;

export const LOCAL_ARM = {
  phaseAtSunRad: 0.035,
  pitchDeg: 11.4,
  minRadiusPc: 7_450,
  maxRadiusPc: 9_650,
  weight: 0.72,
} as const;

export function armThetaAtRadius(radiusPc: number, arm: SpiralArmDefinition) {
  const observedPitchDeg =
    radiusPc < GALACTIC_MODEL.sunRadiusPc ? arm.pitchInnerDeg : arm.pitchOuterDeg;
  // Gaia ainda não cartografou o lado oculto com a mesma precisão.
  // A continuação externa abre gradualmente para 15,8° e perde
  // contraste; perto do Sol permanece no pitch observado.
  const farBlend = Math.min(1, Math.max(0, (radiusPc - 9_500) / 5_500));
  const easedFarBlend = farBlend * farBlend * (3 - 2 * farBlend);
  const pitchDeg =
    observedPitchDeg + (15.8 - observedPitchDeg) * easedFarBlend;
  const base =
    arm.phaseAtSunRad +
    Math.log(Math.max(radiusPc, 180) / GALACTIC_MODEL.sunRadiusPc) /
      Math.tan((pitchDeg * Math.PI) / 180);
  // Kinks/ondulações suaves quebram a perfeição matemática sem
  // deslocar o braço além da sua largura observacional.
  return (
    base +
    0.052 * Math.sin(radiusPc * 0.00115 + arm.phaseAtSunRad * 2.7) +
    0.022 * Math.sin(radiusPc * 0.0037 - arm.phaseAtSunRad)
  );
}

function smoothWindow(x: number, lo: number, hi: number, feather: number) {
  const smooth = (v: number) => {
    const c = Math.min(1, Math.max(0, v));
    return c * c * (3 - 2 * c);
  };
  return (
    smooth((x - (lo - feather)) / (feather * 2)) *
    (1 - smooth((x - (hi - feather)) / (feather * 2)))
  );
}

export function armActivityAtRadius(
  radiusPc: number,
  arm: SpiralArmDefinition
) {
  const measured = smoothWindow(
    radiusPc,
    arm.minRadiusPc,
    arm.maxRadiusPc,
    700
  );
  // Norma reaparece como a continuação externa mapeada, mas com
  // confiança/contraste menores no lado distante.
  const outerContinuation =
    arm.id === 'norma-outer'
      ? smoothWindow(radiusPc, 11_100, GALACTIC_MODEL.diskRadiusPc, 750) * 0.42
      : 0;
  return Math.min(1, measured + outerContinuation);
}

export function localArmThetaAtRadius(radiusPc: number) {
  return (
    LOCAL_ARM.phaseAtSunRad +
    Math.log(Math.max(radiusPc, 180) / GALACTIC_MODEL.sunRadiusPc) /
      Math.tan((LOCAL_ARM.pitchDeg * Math.PI) / 180)
  );
}

/**
 * Reid et al. encontram w(R) = 336 + 36(R[kpc] - 8.15) pc.
 * O clamp só evita extrapolações não físicas no bojo e na borda.
 */
export function armWidthPc(radiusPc: number) {
  return Math.min(690, Math.max(170, 336 + 36 * (radiusPc / 1000 - 8.15)));
}

/** Warp suave, nulo dentro do círculo solar e máximo na borda externa. */
export function warpHeightPc(radiusPc: number, theta: number) {
  if (radiusPc <= GALACTIC_MODEL.warpStartPc) return 0;
  const x = Math.min(
    1,
    (radiusPc - GALACTIC_MODEL.warpStartPc) /
      (GALACTIC_MODEL.diskRadiusPc - GALACTIC_MODEL.warpStartPc)
  );
  return (
    GALACTIC_MODEL.warpAmplitudePc *
    Math.pow(x, 1.55) *
    Math.sin(theta - GALACTIC_MODEL.warpPhaseRad)
  );
}

/** Flare adimensional usado para aumentar a espessura no disco externo. */
export function flareAtRadius(radiusPc: number) {
  const x = Math.max(0, (radiusPc - 7_500) / 9_300);
  return Math.min(1, x * x);
}

// ---- Espelhos TS exatos das funções GLSL abaixo -----------------
// Usados pelo bake do dust map (canais B/A: braços e warp) para que
// o shader troque ~40 transcendentais por 1 fetch de textura sem
// nenhuma divergência de contrato.

function wrappedDistance(a: number, b: number) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function smoothstepGl(edge0: number, edge1: number, x: number) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

function glArmTarget(
  radiusPc: number,
  phaseAtSun: number,
  tanPitchInner: number,
  tanPitchOuter: number
) {
  const observedTan = radiusPc < 8150 ? tanPitchInner : tanPitchOuter;
  const farBlend = smoothstepGl(9500, 15000, radiusPc);
  const tanPitch = observedTan + (0.283 - observedTan) * farBlend;
  const base = phaseAtSun + Math.log(Math.max(radiusPc, 180) / 8150) / tanPitch;
  return (
    base +
    0.052 * Math.sin(radiusPc * 0.00115 + phaseAtSun * 2.7) +
    0.022 * Math.sin(radiusPc * 0.0037 - phaseAtSun)
  );
}

function glArm(
  theta: number,
  radiusPc: number,
  phaseAtSun: number,
  tanPitchInner: number,
  tanPitchOuter: number,
  sharpness: number
) {
  const d = wrappedDistance(
    theta,
    glArmTarget(radiusPc, phaseAtSun, tanPitchInner, tanPitchOuter)
  );
  return Math.exp(-d * d * sharpness);
}

/** espelho TS de galMajorArms (GLSL abaixo) — mesmos gates e pesos */
export function glMajorArms(theta: number, radiusPc: number, sharpness: number) {
  const perseusGate =
    smoothstepGl(5500, 6900, radiusPc) * (1 - smoothstepGl(15500, 16800, radiusPc));
  const sagittariusGate =
    smoothstepGl(3500, 4900, radiusPc) * (1 - smoothstepGl(12600, 14000, radiusPc));
  const scutumGate =
    smoothstepGl(2000, 3400, radiusPc) * (1 - smoothstepGl(9900, 11300, radiusPc));
  const normaInner =
    smoothstepGl(1600, 2900, radiusPc) * (1 - smoothstepGl(7000, 8400, radiusPc));
  const normaOuter =
    smoothstepGl(10300, 11800, radiusPc) *
    (1 - smoothstepGl(15900, 16800, radiusPc)) *
    0.42;
  return Math.min(
    Math.max(
      glArm(theta, radiusPc, -0.52, 0.1816, 0.1531, sharpness) * 0.86 * perseusGate +
        glArm(theta, radiusPc, 1.02, 0.3077, 0.1781, sharpness) * 0.76 * sagittariusGate +
        glArm(theta, radiusPc, 2.64, 0.2512, 0.2143, sharpness) * 0.82 * scutumGate +
        glArm(theta, radiusPc, -2.15, 0.3541, 0.1655, sharpness) *
          0.72 *
          (normaInner + normaOuter),
      0
    ),
    1
  );
}

/** espelho TS de galLocalArm (GLSL abaixo) */
export function glLocalArm(theta: number, radiusPc: number, sharpness: number) {
  const radialWindow =
    smoothstepGl(7450, 7850, radiusPc) * (1 - smoothstepGl(9250, 9650, radiusPc));
  return glArm(theta, radiusPc, 0.035, 0.2017, 0.2017, sharpness) * radialWindow * 0.72;
}

/**
 * Mesmo contrato em GLSL. Mantê-lo aqui impede que partículas, lâminas
 * emissivas e volume de gás usem versões incompatíveis da galáxia.
 */
export const GLSL_CARTOGRAPHY = /* glsl */ `
const float GAL_SUN_RADIUS = 8150.0;
const float GAL_DISK_RADIUS = 16800.0;
const float GAL_WARP_START = 8400.0;

float galWrappedDistance(float a, float b) {
  return abs(atan(sin(a - b), cos(a - b)));
}

float galWarpHeight(float radiusPc, float theta) {
  float x = clamp(
    (radiusPc - GAL_WARP_START) / (GAL_DISK_RADIUS - GAL_WARP_START),
    0.0,
    1.0
  );
  return 820.0 * pow(x, 1.55) * sin(theta - 0.0872665);
}

float galArmTarget(
  float radiusPc,
  float phaseAtSun,
  float tanPitchInner,
  float tanPitchOuter
) {
  float observedTan =
    radiusPc < GAL_SUN_RADIUS ? tanPitchInner : tanPitchOuter;
  float farBlend = smoothstep(9500.0, 15000.0, radiusPc);
  float tanPitch = mix(observedTan, 0.2830, farBlend);
  float base =
    phaseAtSun + log(max(radiusPc, 180.0) / GAL_SUN_RADIUS) / tanPitch;
  return base +
    0.052 * sin(radiusPc * 0.00115 + phaseAtSun * 2.7) +
    0.022 * sin(radiusPc * 0.0037 - phaseAtSun);
}

float galArm(
  float theta,
  float radiusPc,
  float phaseAtSun,
  float tanPitchInner,
  float tanPitchOuter,
  float sharpness
) {
  float target = galArmTarget(
    radiusPc, phaseAtSun, tanPitchInner, tanPitchOuter
  );
  float d = galWrappedDistance(theta, target);
  return exp(-d * d * sharpness);
}

float galMajorArms(float theta, float radiusPc, float sharpness) {
  float perseusGate =
    smoothstep(5500.0, 6900.0, radiusPc) *
    (1.0 - smoothstep(15500.0, 16800.0, radiusPc));
  float sagittariusGate =
    smoothstep(3500.0, 4900.0, radiusPc) *
    (1.0 - smoothstep(12600.0, 14000.0, radiusPc));
  float scutumGate =
    smoothstep(2000.0, 3400.0, radiusPc) *
    (1.0 - smoothstep(9900.0, 11300.0, radiusPc));
  float normaInner =
    smoothstep(1600.0, 2900.0, radiusPc) *
    (1.0 - smoothstep(7000.0, 8400.0, radiusPc));
  float normaOuter =
    smoothstep(10300.0, 11800.0, radiusPc) *
    (1.0 - smoothstep(15900.0, 16800.0, radiusPc)) * 0.42;
  return clamp(
      galArm(theta, radiusPc, -0.52, 0.1816, 0.1531, sharpness)
        * 0.86 * perseusGate
    + galArm(theta, radiusPc,  1.02, 0.3077, 0.1781, sharpness)
        * 0.76 * sagittariusGate
    + galArm(theta, radiusPc,  2.64, 0.2512, 0.2143, sharpness)
        * 0.82 * scutumGate
    + galArm(theta, radiusPc, -2.15, 0.3541, 0.1655, sharpness)
        * 0.72 * (normaInner + normaOuter),
    0.0,
    1.0
  );
}

float galLocalArm(float theta, float radiusPc, float sharpness) {
  float radialWindow =
    smoothstep(7450.0, 7850.0, radiusPc) *
    (1.0 - smoothstep(9250.0, 9650.0, radiusPc));
  return galArm(theta, radiusPc, 0.035, 0.2017, 0.2017, sharpness)
    * radialWindow * 0.72;
}
`;
