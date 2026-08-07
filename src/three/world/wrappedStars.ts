// ============================================================
// Cascas de população estelar por bin de magnitude absoluta —
// unificação 2, etapa 1. Substitui a caixa única de 2,4 kpc.
//
// O número que dissolve o problema: nunca é preciso gerar 10¹¹
// estrelas — de qualquer ponto do disco o céu RESOLVÍVEL tem
// ~10⁴–10⁵, porque N(<m) ∝ 10^0,6m e a extinção corta o alcance.
// O resto já está representado: é a luz integrada do disco.
//
// Cada bin de M_V tem a sua caixa de wrap com lado 2·d_max do
// membro mais brilhante ⇒ toda troca de célula acontece abaixo do
// piso de visibilidade ⇒ sem popping por construção. A identidade
// da estrela é o hash das coordenadas INTEIRAS da célula (+ bin):
// determinística, sobrevive a reload, ?pos= e ao wrap. A densidade
// galactocêntrica decide EXISTÊNCIA (rejeição), não alpha; onde
// ρ·prob satura em 1 (bojo, braços, bins brilhantes de longo
// alcance) o excedente permanece luz não resolvida — o limite de
// confusão de verdade.
//
// Anti-dupla-contagem vs catálogo: a casca cede onde o catálogo
// REALMENTE desenha, e os três termos vêm de stars_meta.json —
// magnitude limite, raio da bolha e o fade vivo. Nenhum número de
// catálogo é literal aqui: regerar o binário move o contrato
// sozinho. O halo buildFarStars morreu junto: era estático no Sol
// e este campo cobre o papel dele em qualquer ponto do disco.
//
// FLOATING ORIGIN da unificação 2: a posição nunca soma 25 kpc em
// f32 — o vértice reconstrói tudo relativo à câmera (célula
// inteira + fração de célula) e projeta com SÓ a rotação do MV.
// O quantum f32 a 25 kpc é 1,5e-3 pc ≈ 1,7 px de tremor numa
// estrela a 1 pc; aqui nenhum operando grande entra no caminho da
// posição. Por isso o Points NÃO pode ganhar transform próprio.
// ============================================================
import * as THREE from 'three';
import {
  GLSL_NOISE,
  GLSL_GALAXY,
  GLSL_STAR_COLOR,
  GLSL_STAR_PSF,
} from '../shaders/common';
import { STAR_FRAG } from '../shaders/starShaders';

// m em que a PSF morre na nossa exposição (expoM0 3,5):
// peak(11,75) ≈ 1,6e-4 — abaixo de qualquer depósito perceptível.
// É o teto que dimensiona as caixas.
const M_FAINT = 11.75;
// Extinção média no plano, usada no ALCANCE (CPU) e na m (shader) —
// o MESMO número dos dois lados, senão a borda da caixa pisca.
// ponytail: escalar isotrópico; extinção cromática por raymarch fica
// só no campo HYG (lá é gated por tamanho; aqui seriam 250 k × 6
// amostras por frame).
const EXT_MAG_PER_PC = 0.0008;
// teto de células por eixo — limita o orçamento de vértices; nos bins
// brilhantes a célula fica maior que 1/n^⅓ e prob satura (undersample
// deliberado do campo distante, que é o regime de confusão)
const GRID_MAX = 36;

interface MagBin {
  mLo: number;
  mHi: number;
  /** estrelas/pc³ no bin (função de luminosidade local, ≈Wielen) */
  n: number;
}
// A soma dá ≈ 0,014/pc³ resolvível + o resto na luz integrada; o total
// real local é ~0,1/pc³ — a diferença é anã demais para a nossa
// exposição (M_V > 11 nunca passa de m 11,75 além de ~10 pc).
const BINS: readonly MagBin[] = [
  { mLo: -6, mHi: -2, n: 3e-6 },
  { mLo: -2, mHi: 0, n: 2e-5 },
  { mLo: 0, mHi: 2, n: 1.6e-4 },
  { mLo: 2, mHi: 4, n: 5e-4 },
  { mLo: 4, mHi: 6, n: 1.2e-3 },
  { mLo: 6, mHi: 8, n: 2.4e-3 },
  { mLo: 8, mHi: 11, n: 9e-3 },
];
const NB = BINS.length;

/**
 * d onde o membro mais brilhante do bin atinge M_FAINT, resolvendo
 * m(d) = M + 5·log10(d) − 5 + ext·d = M_FAINT por bisseção (f é
 * monótona crescente em d; a cota superior é o alcance sem extinção).
 */
function reachPc(mAbs: number) {
  const target = M_FAINT - mAbs + 5;
  let lo = 1;
  let hi = Math.pow(10, target / 5);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const f = 5 * Math.log10(mid) + EXT_MAG_PER_PC * mid - target;
    if (f > 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

// ---- geometria e handoff derivados dos bins — calculados UMA vez ----
// cell/grid/prob dimensionam a treliça; reach é o raio de atividade do
// bin; amp é a fração da LUZ TOTAL que o bin de fato resolve
// (quota de luminosidade × completude do clamp em ρ=1) — o que a luz
// integrada (partículas + LUT da faixa) deve descontar dentro do reach.
interface BinDerived {
  cell: number;
  grid: number;
  prob: number;
  reach: number;
  amp: number;
}
const GRID = (() => {
  const out: BinDerived[] = [];
  // luminosidade média do bin com sorteio uniforme em M:
  // (1/ΔM)∫10^{0,4(4,85−M)}dM
  const meanL = (b: MagBin) =>
    (Math.pow(10, 0.4 * 4.85) / ((b.mHi - b.mLo) * 0.4 * Math.LN10)) *
    (Math.pow(10, -0.4 * b.mLo) - Math.pow(10, -0.4 * b.mHi));
  const lDens = BINS.map((b) => b.n * meanL(b));
  const lTot = lDens.reduce((s, v) => s + v, 0);
  for (let k = 0; k < NB; k++) {
    const bin = BINS[k];
    const reach = reachPc(bin.mLo);
    let cell = Math.cbrt(0.85 / bin.n);
    let grid = Math.ceil((2 * reach) / cell);
    if (grid > GRID_MAX) {
      grid = GRID_MAX;
      cell = (2 * reach) / grid;
    }
    if (grid < 3) grid = 3;
    const prob = bin.n * cell * cell * cell;
    // completude do clamp em ρ=1; a dependência de ρ é ignorada (efeito
    // total ≤ ~4% da luz — não vale o custo de modelar)
    const comp = Math.min(1, 1 / prob);
    out.push({ cell, grid, prob, reach, amp: (lDens[k] / lTot) * comp });
  }
  return out;
})();

/**
 * Fração NÃO resolvida da luz integrada a uma distância d da câmera —
 * o handoff da unificação 2 (etapa 2): dentro do alcance de cada bin,
 * as cascas desenham amp_k da luz total como estrelas individuais, e a
 * luz integrada (partículas da galáxia e termo estelar da LUT da faixa)
 * desconta exatamente isso. Além do maior alcance (~5 kpc) devolve
 * 1,0 EXATO — a vista externa fica bit-idêntica, que é o gate.
 * O degrau é suavizado nos últimos 25% do alcance, onde os membros do
 * bin já estão morrendo em m→M_FAINT de qualquer jeito.
 */
export const GLSL_UNRESOLVED = /* glsl */ `
float unresolved(float d) {
  return 1.0${GRID.map(
    (g) =>
      `
    - ${g.amp.toFixed(6)} *
      (1.0 - smoothstep(${(g.reach * 0.75).toFixed(1)}, ${g.reach.toFixed(1)}, d))`
  ).join('')};
}
`;

const VERT = /* glsl */ `
attribute vec3 aOffset; // offset inteiro na treliça do bin
attribute float aBin;

uniform vec3 uCamPos;
uniform float uScreenH;
uniform float uFade;
uniform float uExpoM0;
uniform float uSigmaPx;
uniform float uCell[${NB}];
uniform float uProb[${NB}];
uniform float uMagLo[${NB}];
uniform float uMagSpan[${NB}];
uniform vec3 uCamCell[${NB}]; // floor(camPos/célula) — inteiro exato
uniform vec3 uCamFrac[${NB}]; // fração da célula, em [0,1)
// contrato com o catálogo real (stars_meta.json): limite de magnitude,
// raio da bolha heliocreu que ele cobre, e o quanto ele está VISÍVEL agora
uniform float uCatMag;
uniform float uCatHorizon;
uniform float uCatFade;

varying vec3 vColor;
varying float vSat;
varying float vSigma;
varying float vPeak;

${GLSL_NOISE}
${GLSL_GALAXY}
${GLSL_STAR_COLOR}
${GLSL_STAR_PSF}

// canais B/A do dust map: braços (variante de GÁS uniforme + braço
// Local, rodada 12) e warp, bakeados a 65 pc/texel
uniform sampler2D uDustMap;

// densidade estelar relativa (≈1 na vizinhança solar).
// Braços e warp vêm do BAKE (1 fetch) em vez de galMajorArmsGas +
// galWarpHeight analíticos: ~40 transcendentais × 296 k vértices eram
// +5 ms/frame medidos a 1440p (probe CDP, t=0: média 31,0 → 25,7 sem
// as cascas). Mesmo padrão do envelope de gás do raymarch. O texel de
// 65 pc é 30× menor que a largura do braço — nenhuma perda real.
// A variante de gás (não a pesada) é decisão da rodada 12: par fraco
// com peso 0 exato decorrelacionaria estrelas e gás na vista interna;
// reequilibrar é trabalho do gate do panorama ESO (lacuna 2).
float stellarDensity(vec3 p, out float bulgeGate) {
  vec3 q = p - GAL_CENTER;
  float z = dot(q, GAL_N);
  vec2 xy = vec2(dot(q, GAL_X), dot(q, GAL_Y));
  float radiusPc = length(xy);
  vec4 cart = texture2D(uDustMap, xy / 33600.0 + 0.5);
  float zw = z - (cart.a * 2.0 - 1.0) * 820.0;
  float thin = exp(-radiusPc / 2600.0) * exp(-abs(zw) / 300.0);
  float thick = exp(-radiusPc / 3600.0) * exp(-abs(zw) / 1000.0) * 0.12;
  float bulge = exp(-length(q) / 900.0) * 14.0;
  // braços: contraste de massa modesto (≲3x); o brilho azul vem da cor
  float arms = cart.b;
  bulgeGate = clamp(bulge, 0.0, 1.0);
  float edge = 1.0 - smoothstep(15500.0, 19300.0, radiusPc);
  return (thin * (0.75 + 0.55 * arms) + thick) * edge * 22.9 + bulge * 0.02;
}

void main() {
  int b = int(aBin + 0.5);
  float c = uCell[b];
  // coordenadas INTEIRAS da célula no mundo — a identidade da estrela.
  // Exatas em f32 até 2^24; o maior índice real é ~6e3.
  vec3 cell = uCamCell[b] + aOffset;
  float hExist = hash13(cell * 0.7193 + float(b) * 17.17);
  vec3 jit = vec3(
    hash13(cell + 0.31),
    hash13(cell + 7.77),
    hash13(cell + 3.53)
  );
  // reconstrução relativa à câmera: só operandos pequenos
  vec3 rel = (aOffset + jit - uCamFrac[b]) * c;
  float dist = length(rel);
  // worldPos só alimenta densidade e m_sun (escalas de kpc — o erro de
  // 3e-3 pc do uCamPos f32 é irrelevante aqui, e NUNCA entra na posição)
  vec3 worldPos = uCamPos + rel;
  float bulgeGate;
  float density = stellarDensity(worldPos, bulgeGate);
  // densidade decide EXISTÊNCIA, não alpha
  float exists = step(hExist, clamp(density * uProb[b], 0.0, 1.0));
  float MV = uMagLo[b] + hash13(cell + 23.7) * uMagSpan[b];
  float dSun = length(worldPos);
  float mSun = MV + 5.0 * log2(max(dSun, 1.0)) * 0.30103 - 5.0 +
    ${EXT_MAG_PER_PC.toFixed(6)} * dSun;
  // Anti-dupla-contagem: a casca não repete o que o catálogo desenha.
  // TRÊS condições, não uma — o corte antigo só olhava a magnitude e
  // abria dois buracos por onde não passava estrela nenhuma:
  //   (1) magnitude: o catálogo é completo até uCatMag visto do Sol;
  //   (2) horizonte: ele é uma BOLHA heliocêntrica finita — além de
  //       uCatHorizon não há catálogo para repetir. Sem este termo, toda
  //       estrela luminosa além da parede do binário sumia do céu (com o
  //       binário antigo, tudo entre 1 e 2 kpc);
  //   (3) presença: o catálogo esmaece com a distância de CASA
  //       (localFade). Fora dela quem desenha é a casca — e o corte é
  //       heliocêntrico, então sem este termo o viajante levava um vazio
  //       esférico junto consigo.
  float covered = uCatFade *
    (1.0 - step(uCatMag, mSun)) *
    (1.0 - smoothstep(uCatHorizon * 0.85, uCatHorizon, dSun));
  exists *= 1.0 - covered;
  if (exists < 0.5 || uFade < 0.001) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0); // fora do clip — morta
    gl_PointSize = 0.0;
    vPeak = 0.0;
    vSat = 0.0;
    vSigma = 1.0;
    vColor = vec3(0.0);
    return;
  }
  float m = MV + 5.0 * log2(max(dist, 0.5)) * 0.30103 - 5.0 +
    ${EXT_MAG_PER_PC.toFixed(6)} * dist;
  // cor: sequência principal por M_V; na ponta brilhante metade vira
  // gigante vermelha (o céu brilhante real é dominado por elas); o bojo
  // puxa velho/dourado
  float bvMs = clamp(-0.05 + 0.155 * MV, -0.30, 1.75);
  float giant = step(0.5, hash13(cell + 41.9)) * (1.0 - smoothstep(-1.0, 2.0, MV));
  float bv = mix(bvMs, 1.05 + 0.5 * hash13(cell + 5.7), giant);
  bv = mix(bv, 1.15, bulgeGate * 0.4);
  vColor = bvToColor(bv);

  float size;
  float peak;
  float sat;
  float sigmaFrac;
  starPSF(m, uExpoM0, uSigmaPx, uScreenH, size, peak, sat, sigmaFrac);
  vSat = sat;
  vSigma = sigmaFrac;
  vPeak = peak * uFade;

  // projeção com SÓ a rotação do modelView: a posição em view-space de
  // (camPos + rel) É R·rel — nenhuma soma com quilo-parsecs em f32.
  vec3 viewPos = mat3(modelViewMatrix) * rel;
  gl_Position = projectionMatrix * vec4(viewPos, 1.0);
  gl_PointSize = size;
}
`;

export class WrappedStars {
  readonly points: THREE.Points;
  private material: THREE.ShaderMaterial;
  private cellSizes: number[] = [];

  constructor(dustMap: THREE.Texture, catalogue: { magLimit: number; horizonPc: number }) {
    // treliças e probabilidades vêm de GRID (derivado uma vez no módulo,
    // junto com o handoff GLSL_UNRESOLVED — uma só fonte para os dois)
    this.cellSizes = GRID.map((g) => g.cell);
    const total = GRID.reduce((s, g) => s + g.grid ** 3, 0);
    const magLo = BINS.map((b) => b.mLo);
    const magSpan = BINS.map((b) => b.mHi - b.mLo);
    const grids = GRID.map((g) => g.grid);
    const cells = GRID.map((g) => g.cell);
    const probs = GRID.map((g) => g.prob);

    const offsets = new Float32Array(total * 3);
    const binAttr = new Float32Array(total);
    let v = 0;
    for (let b = 0; b < NB; b++) {
      const grid = grids[b];
      const half = Math.floor(grid / 2);
      for (let x = 0; x < grid; x++) {
        for (let y = 0; y < grid; y++) {
          for (let z = 0; z < grid; z++) {
            offsets[v * 3] = x - half;
            offsets[v * 3 + 1] = y - half;
            offsets[v * 3 + 2] = z - half;
            binAttr[v] = b;
            v++;
          }
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 3));
    geo.setAttribute('aBin', new THREE.BufferAttribute(binAttr, 1));
    // position é obrigatório para THREE.Points; a projeção não o usa
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(total * 3), 3)
    );
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: STAR_FRAG, // a MESMA PSF do catálogo
      uniforms: {
        uCamPos: { value: new THREE.Vector3() },
        uScreenH: { value: 1080 },
        uFade: { value: 1 },
        uDustMap: { value: dustMap },
        // a mesma exposição/instrumento do campo HYG — uma cadeia
        uExpoM0: { value: 3.5 },
        uSigmaPx: { value: 0.85 },
        uCell: { value: new Float32Array(cells) },
        uProb: { value: new Float32Array(probs) },
        uMagLo: { value: new Float32Array(magLo) },
        uMagSpan: { value: new Float32Array(magSpan) },
        uCamCell: {
          value: Array.from({ length: NB }, () => new THREE.Vector3()),
        },
        uCamFrac: {
          value: Array.from({ length: NB }, () => new THREE.Vector3()),
        },
        uCatMag: { value: catalogue.magLimit },
        uCatHorizon: { value: catalogue.horizonPc },
        uCatFade: { value: 1 },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    // O shader projeta relativo à câmera assumindo modelMatrix identidade
    // — este objeto NÃO pode ganhar position/rotation/scale.
    this.points.matrixAutoUpdate = false;
  }

  update(
    camPos: THREE.Vector3,
    screenH: number,
    fade: number,
    /** o MESMO fade do campo de catálogo — a supressão tem de acompanhar
     *  quem está desenhando, senão o viajante leva um vazio junto */
    catFade: number
  ) {
    const u = this.material.uniforms;
    (u.uCamPos.value as THREE.Vector3).copy(camPos);
    u.uScreenH.value = screenH;
    u.uFade.value = fade;
    u.uCatFade.value = catFade;
    const camCells = u.uCamCell.value as THREE.Vector3[];
    const camFracs = u.uCamFrac.value as THREE.Vector3[];
    for (let b = 0; b < NB; b++) {
      const c = this.cellSizes[b];
      // floor em f64 na CPU: o inteiro da célula é exato; só a fração
      // (pequena) desce ao shader
      const cx = Math.floor(camPos.x / c);
      const cy = Math.floor(camPos.y / c);
      const cz = Math.floor(camPos.z / c);
      camCells[b].set(cx, cy, cz);
      camFracs[b].set(
        camPos.x / c - cx,
        camPos.y / c - cy,
        camPos.z / c - cz
      );
    }
    this.points.visible = fade > 0.001;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
