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
import spiralModel from './spiralModel.json';

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

interface SpiralArmDefinition {
  readonly id: 'perseus' | 'sagittarius-carina' | 'scutum-centaurus' | 'norma-outer';
  readonly phaseAtSunRad: number;
  readonly pitchInnerDeg: number;
  readonly pitchOuterDeg: number;
  readonly weight: number;
  readonly minRadiusPc: number;
  readonly maxRadiusPc: number;
  readonly tint: readonly [number, number, number];
  readonly gate: {
    readonly risePc: readonly number[];
    readonly fallPc: readonly number[];
  };
  readonly outerContinuation?: {
    readonly phaseAtSunRad: number;
    readonly weight: number;
    readonly gate: {
      readonly risePc: readonly number[];
      readonly fallPc: readonly number[];
    };
  };
}

/**
 * Quatro famílias principais. Pitches e janelas seguem Reid et al.; as fases
 * vêm do fit robusto versionado em spiralModel.json. Norma e a continuação
 * Outer têm fases independentes porque não há suporte observado no hiato entre
 * os dois segmentos — esse kink evita forçar uma espiral fictícia pelos dados.
 */
export const SPIRAL_ARMS: readonly SpiralArmDefinition[] =
  spiralModel.arms.map((arm) => ({
    id: arm.id as SpiralArmDefinition['id'],
    phaseAtSunRad: arm.phaseAtSunRad,
    pitchInnerDeg: arm.pitchInnerDeg,
    pitchOuterDeg: arm.pitchOuterDeg,
    weight: arm.weight,
    minRadiusPc: arm.minRadiusPc,
    maxRadiusPc: arm.maxRadiusPc,
    tint: arm.tint as [number, number, number],
    gate: arm.gate,
    outerContinuation: arm.outerContinuation,
  }));

export const LOCAL_ARM = {
  phaseAtSunRad: spiralModel.localArm.phaseAtSunRad,
  pitchDeg: spiralModel.localArm.pitchInnerDeg,
  minRadiusPc: spiralModel.localArm.minRadiusPc,
  maxRadiusPc: spiralModel.localArm.maxRadiusPc,
  weight: spiralModel.localArm.weight,
  gate: spiralModel.localArm.gate,
} as const;

function armPhaseAtRadius(radiusPc: number, arm: SpiralArmDefinition) {
  const outer = arm.outerContinuation;
  return outer && radiusPc >= outer.gate.risePc[0]
    ? outer.phaseAtSunRad
    : arm.phaseAtSunRad;
}

export function armThetaAtRadius(radiusPc: number, arm: SpiralArmDefinition) {
  const phaseAtSunRad = armPhaseAtRadius(radiusPc, arm);
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
    phaseAtSunRad +
    Math.log(Math.max(radiusPc, 180) / GALACTIC_MODEL.sunRadiusPc) /
      Math.tan((pitchDeg * Math.PI) / 180);
  // A espinha inferida permanece lisa. Quebras macroscópicas só podem vir
  // das fases/janelas ajustadas aos masers ou do campo de matéria observado;
  // não se adiciona assimetria senoidal apenas por direção de arte.
  return base;
}

function smoothstepTs(edge0: number, edge1: number, value: number) {
  const c = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return c * c * (3 - 2 * c);
}

function gateActivity(
  radiusPc: number,
  gate: SpiralArmDefinition['gate']
) {
  return (
    smoothstepTs(gate.risePc[0], gate.risePc[1], radiusPc) *
    (1 - smoothstepTs(gate.fallPc[0], gate.fallPc[1], radiusPc))
  );
}

export function armActivityAtRadius(
  radiusPc: number,
  arm: SpiralArmDefinition
) {
  const measured = gateActivity(radiusPc, arm.gate);
  const outerContinuation = arm.outerContinuation
    ? gateActivity(radiusPc, arm.outerContinuation.gate) *
      arm.outerContinuation.weight
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

function armById(id: SpiralArmDefinition['id']) {
  const arm = SPIRAL_ARMS.find((candidate) => candidate.id === id);
  if (!arm) throw new Error(`Braço galáctico ausente: ${id}.`);
  return arm;
}

function tanPitch(degrees: number) {
  return Math.tan((degrees * Math.PI) / 180);
}

function glGate(
  radiusPc: number,
  gate: SpiralArmDefinition['gate']
) {
  return (
    smoothstepGl(gate.risePc[0], gate.risePc[1], radiusPc) *
    (1 - smoothstepGl(gate.fallPc[0], gate.fallPc[1], radiusPc))
  );
}

const PERSEUS = armById('perseus');
const SAGITTARIUS_CARINA = armById('sagittarius-carina');
const SCUTUM_CENTAURUS = armById('scutum-centaurus');
const NORMA_OUTER = armById('norma-outer');
function requireOuterContinuation(arm: SpiralArmDefinition) {
  const continuation = arm.outerContinuation;
  if (!continuation) {
    throw new Error('Continuação Outer ausente do modelo galáctico.');
  }
  return continuation;
}
const NORMA_CONTINUATION = requireOuterContinuation(NORMA_OUTER);

/** espelho TS de galMajorArms (GLSL abaixo) — mesmos gates e pesos */
export function glMajorArms(theta: number, radiusPc: number, sharpness: number) {
  return Math.min(
    Math.max(
      glArm(
        theta,
        radiusPc,
        PERSEUS.phaseAtSunRad,
        tanPitch(PERSEUS.pitchInnerDeg),
        tanPitch(PERSEUS.pitchOuterDeg),
        sharpness
      ) *
        PERSEUS.weight *
        glGate(radiusPc, PERSEUS.gate) +
        glArm(
          theta,
          radiusPc,
          SAGITTARIUS_CARINA.phaseAtSunRad,
          tanPitch(SAGITTARIUS_CARINA.pitchInnerDeg),
          tanPitch(SAGITTARIUS_CARINA.pitchOuterDeg),
          sharpness
        ) *
          SAGITTARIUS_CARINA.weight *
          glGate(radiusPc, SAGITTARIUS_CARINA.gate) +
        glArm(
          theta,
          radiusPc,
          SCUTUM_CENTAURUS.phaseAtSunRad,
          tanPitch(SCUTUM_CENTAURUS.pitchInnerDeg),
          tanPitch(SCUTUM_CENTAURUS.pitchOuterDeg),
          sharpness
        ) *
          SCUTUM_CENTAURUS.weight *
          glGate(radiusPc, SCUTUM_CENTAURUS.gate) +
        glArm(
          theta,
          radiusPc,
          NORMA_OUTER.phaseAtSunRad,
          tanPitch(NORMA_OUTER.pitchInnerDeg),
          tanPitch(NORMA_OUTER.pitchOuterDeg),
          sharpness
        ) *
          NORMA_OUTER.weight *
          glGate(radiusPc, NORMA_OUTER.gate) +
        glArm(
          theta,
          radiusPc,
          NORMA_CONTINUATION.phaseAtSunRad,
          tanPitch(NORMA_OUTER.pitchInnerDeg),
          tanPitch(NORMA_OUTER.pitchOuterDeg),
          sharpness
        ) *
          NORMA_OUTER.weight *
          NORMA_CONTINUATION.weight *
          glGate(radiusPc, NORMA_CONTINUATION.gate),
      0
    ),
    1
  );
}

/** espelho TS de galLocalArm (GLSL abaixo) */
export function glLocalArm(theta: number, radiusPc: number, sharpness: number) {
  return (
    glArm(
      theta,
      radiusPc,
      LOCAL_ARM.phaseAtSunRad,
      tanPitch(LOCAL_ARM.pitchDeg),
      tanPitch(LOCAL_ARM.pitchDeg),
      sharpness
    ) *
    glGate(radiusPc, LOCAL_ARM.gate) *
    LOCAL_ARM.weight
  );
}

function glslNumber(value: number) {
  return value.toFixed(7);
}

function glslGate(
  name: string,
  gate: SpiralArmDefinition['gate'],
  weight = 1
) {
  return `float ${name} =
    smoothstep(${glslNumber(gate.risePc[0])}, ${glslNumber(gate.risePc[1])}, radiusPc) *
    (1.0 - smoothstep(${glslNumber(gate.fallPc[0])}, ${glslNumber(gate.fallPc[1])}, radiusPc)) *
    ${glslNumber(weight)};`;
}

function glslArmCall(
  arm: SpiralArmDefinition,
  phaseAtSunRad: number,
  gateName: string,
  weight = arm.weight
) {
  return `galArm(
      theta,
      radiusPc,
      ${glslNumber(phaseAtSunRad)},
      ${glslNumber(tanPitch(arm.pitchInnerDeg))},
      ${glslNumber(tanPitch(arm.pitchOuterDeg))},
      sharpness
    ) * ${glslNumber(weight)} * ${gateName}`;
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
  float tanPitch = mix(
    observedTan,
    ${glslNumber(tanPitch(15.8))},
    farBlend
  );
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
  ${glslGate('perseusGate', PERSEUS.gate)}
  ${glslGate('sagittariusGate', SAGITTARIUS_CARINA.gate)}
  ${glslGate('scutumGate', SCUTUM_CENTAURUS.gate)}
  ${glslGate('normaInnerGate', NORMA_OUTER.gate)}
  ${glslGate(
    'normaOuterGate',
    NORMA_CONTINUATION.gate,
    NORMA_CONTINUATION.weight
  )}
  return clamp(
      ${glslArmCall(PERSEUS, PERSEUS.phaseAtSunRad, 'perseusGate')}
    + ${glslArmCall(
      SAGITTARIUS_CARINA,
      SAGITTARIUS_CARINA.phaseAtSunRad,
      'sagittariusGate'
    )}
    + ${glslArmCall(
      SCUTUM_CENTAURUS,
      SCUTUM_CENTAURUS.phaseAtSunRad,
      'scutumGate'
    )}
    + ${glslArmCall(NORMA_OUTER, NORMA_OUTER.phaseAtSunRad, 'normaInnerGate')}
    + ${glslArmCall(
      NORMA_OUTER,
      NORMA_CONTINUATION.phaseAtSunRad,
      'normaOuterGate'
    )},
    0.0,
    1.0
  );
}

float galLocalArm(float theta, float radiusPc, float sharpness) {
  ${glslGate('localGate', LOCAL_ARM.gate)}
  return galArm(
    theta,
    radiusPc,
    ${glslNumber(LOCAL_ARM.phaseAtSunRad)},
    ${glslNumber(tanPitch(LOCAL_ARM.pitchDeg))},
    ${glslNumber(tanPitch(LOCAL_ARM.pitchDeg))},
    sharpness
  ) * localGate * ${glslNumber(LOCAL_ARM.weight)};
}
`;
