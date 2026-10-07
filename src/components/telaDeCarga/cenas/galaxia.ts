// Tela de carga "A galáxia se forma". Uma nuvem primordial de gás gira
// devagar; com o progresso a gravidade a organiza: o disco achata, a barra e
// o bojo dourados acendem, os quatro braços da Via Láctea se enrolam a partir
// das pontas da barra, nascem as estrelas azuis e os nós rosados de
// hidrogênio, a poeira escurece a borda de dentro dos braços. Perto de 100 %
// o Sol é marcado num braço externo; no desfecho a câmera mergulha até ele e
// sobra o brilho dourado do Sol no escuro.
//
// Cada quadro é função de (t, suave, fim): nada guarda estado entre quadros.
// Camadas: gás e poeira numa textura de meia resolução (nuvem por marcha de
// raio, disco por interseção com o plano, bojo e barra por integrais
// analíticas), ~40 mil estrelas em pontos com mistura aditiva num buffer HDR,
// e uma passada final de tom, vinheta e pontilhado.
//
// O TEXTO NÃO É DESTA CENA (cena.ts), com uma exceção: o rótulo do Sol. O
// protótipo punha o texto por cima, e o hospedeiro o refaz em HTML assim:
//   um bloco só, centrado na horizontal (largura toda, margem de 20 px), com
//   o pé a `baixo` px da base da tela (mais a área segura do aparelho):
//   título "Mar de Estrelas" (Fraunces 300, 0,01 em, linha 1,04, #f3eee4,
//   sombra 0 0 30px rgba(2,3,6,.9) e 0 0 3px rgba(2,3,6,.6)) e, abaixo, a
//   linha da etapa: frase (Inter 13 px, 0,02 em, #b9b2a6, troca em fusão de
//   0,8 s), "·" (#85807a) e porcentagem (min(100, ⌊suave × 100⌋) %, 11 px,
//   caixa-alta, 0,14 em, #b9b2a6), na mesma linha de base, vão de 10 px,
//   sombra 0 0 12px rgba(2,3,6,.95).
//   PAISAGEM (largura/altura ≥ 0,9): título de clamp(44, 0,046 × largura, 84)
//   px, vão título-linha de 14 px, baixo = max(28, 6 % da altura): a 1440×900,
//   título de 66 px e pé a 54 px da base.
//   RETRATO (largura/altura < 0,9): título de clamp(34, 0,105 × largura, 48)
//   px, vão de 10 px, baixo = max(36, 7 % da altura): a 390×844, título de
//   41 px e pé a 59 px da base.
//   O bloco entra com smoothstep(0, 0,9, t) e sai com 1 − smoothstep(0,04 a
//   0,4, fim); a linha da etapa sai antes, com 1 − smoothstep(0 a 0,2, fim).
//
// O RÓTULO DO SOL ("o Sol · você está aqui") é desenhado aqui, no quadro, de
// `recursos.rotulos.get('voceEstaAqui')`. O hospedeiro o rasteriza na thread
// principal, em px do dispositivo (o mesmo `dpr` de `redimensionar`), assim:
//   bitmap PREMULTIPLICADO (createImageBitmap de um canvas 2D) com a pílula e
//   1 px de CSS de folga em volta, para o anel: `largura` e `altura` (CSS)
//   são as do bitmap inteiro, e ele tem ceil(largura × dpr) × ceil(altura ×
//   dpr) px, com a pílula a 1 px de CSS do canto de cima à esquerda.
//   texto: a frase em caixa-alta na língua de agora ("O SOL · VOCÊ ESTÁ
//   AQUI"), Inter 400, 11 px (0,6875 rem), 0,14 em (1,54 px, que também fecha
//   o fim da frase), #e2b872, tabular-nums. O Inter com tnum encolhe cada
//   avanço ~0,03 em (0,69 px na frase) e o canvas 2D não liga isso: a
//   posição de cada letra vem de um <span> de DOM com essas propriedades e o
//   canvas pinta cada letra ali, com a linha de base a 4 px + subida da fonte
//   (11 px) do topo da pílula.
//   pílula: preenchimento rgba(4,5,9,.62), cantos totalmente redondos (raio
//   de metade da altura), folga de 4 px em cima e embaixo e de 10 px à
//   esquerda e 9 px à direita em volta do texto (185,34 × 22 px em português);
//   anel de 1 px por FORA, rgba(226,184,114,.16) (sombra 0 0 0 1px, que não
//   passa por baixo da pílula; sem borda). O protótipo ainda borrava o fundo
//   atrás da pílula (backdrop-filter blur 6 px); a cena não faz isso.
// A cena põe a pílula 12 px à direita do anel do Sol (em cima ou embaixo dele
// quando falta espaço), a caixa no pixel inteiro do aparelho, com a opacidade
// e o sumiço do protótipo; sem o bitmap, ela simplesmente não aparece.
import type { Cena, DefinicaoDaCena, EstadoDaCena, RecursosDaCena, RotuloPronto } from '../cena';

type Vec3 = [number, number, number];
/** matriz 4×4 em colunas, como o WebGL espera */
type Mat4 = number[];
type Uniformes = Record<string, WebGLUniformLocation | null>;

const TAU = Math.PI * 2;
const GRAU = Math.PI / 180;

const ATRIBUTOS: WebGLContextAttributes = {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  premultipliedAlpha: false,
  powerPreference: 'high-performance',
};

// ---------- modelo da galáxia (o mesmo nas estrelas e no mapa de face) ----------
const R_BARRA = 0.27; // meia-barra (raio do disco visível ~1.1)
const PASSO = 14.5 * GRAU; // ângulo de passo dos braços
const KSP = 1 / Math.tan(PASSO);
const SINP = Math.sin(PASSO);
const EXT = 1.32; // meia largura do mapa de face
interface Braco {
  t0: number;
  r0: number;
  gas: number;
  velho: number;
  poeira: number;
  jov: number;
  fa: number;
  fb: number;
}
const BRACOS: Braco[] = [
  // dois maiores saem das pontas da barra; dois menores, ricos em gás, a 90°
  // fa, fb: fases da modulação ao longo do braço (trechos mais fortes e falhas)
  { t0: 0.0, r0: R_BARRA, gas: 1.0, velho: 1.0, poeira: 1.0, jov: 0.36, fa: 0.4, fb: 2.1 },
  { t0: Math.PI, r0: R_BARRA, gas: 1.0, velho: 1.0, poeira: 1.0, jov: 0.36, fa: 2.9, fb: 0.7 },
  { t0: Math.PI / 2 + 0.12 - KSP * Math.log(0.34 / R_BARRA), r0: 0.34, gas: 0.72, velho: 0.22, poeira: 0.62, jov: 0.14, fa: 4.4, fb: 5.2 },
  { t0: (3 * Math.PI) / 2 + 0.12 - KSP * Math.log(0.34 / R_BARRA), r0: 0.34, gas: 0.72, velho: 0.22, poeira: 0.62, jov: 0.14, fa: 1.3, fb: 3.6 },
];
const anguloBraco = (b: Braco, r: number): number => b.t0 - KSP * Math.log(r / b.r0);
// a mesma modulação no mapa (GLSL) e nas partículas
const forcaBraco = (b: Braco, r: number): number => {
  const l = Math.log(r);
  return Math.min(1.15, Math.max(0.12, 0.62 + 0.4 * Math.sin(5.3 * l + b.fa) + 0.22 * Math.sin(11.7 * l + b.fb)));
};
const OMEGA_P = TAU / 220; // velocidade do padrão (rad/s); o Sol fica perto da corrotação
const R_SOL = 0.64;
const R_ANEL = 0.036; // raio do anel que marca o Sol, no plano do disco
// aos ~14 s a barra fica a ~40° no plano e o Sol, no braço que cai mais perto da direita
const BARRA_14 = 0.7;
const PSI0 = BARRA_14 - OMEGA_P * 14;
const TH_SOL = (() => {
  let melhor = 0;
  let erro = Infinity;
  for (const b of BRACOS) {
    const th = anguloBraco(b, R_SOL) + 0.012 / (R_SOL * SINP);
    const mundo = Math.atan2(Math.sin(th + BARRA_14), Math.cos(th + BARRA_14));
    if (Math.abs(mundo + 0.3) < erro) {
      erro = Math.abs(mundo + 0.3);
      melhor = th;
    }
  }
  return melhor;
})();
const R_VIS = 1.22;
// os braços se revelam de dentro para fora entre estes progressos
const S_REV0 = 0.42;
const S_REV1 = 0.92;
const R_REV1 = 1.25;
const sRev = (r: number): number => S_REV0 + (S_REV1 - S_REV0) * Math.min(1, Math.max(0, (r - R_BARRA) / (R_REV1 - R_BARRA)));

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
const sstep = (a: number, b: number, x: number): number => {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};

function aleatorio(semente: number): () => number {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- matrizes (coluna maior) ----------
function perspectiva(fovy: number, asp: number, n: number, f: number): Mat4 {
  const t = 1 / Math.tan(fovy / 2);
  const nf = 1 / (n - f);
  return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0];
}
function olhar(e: Vec3, a: Vec3, u: Vec3): Mat4 {
  let zx = e[0] - a[0];
  let zy = e[1] - a[1];
  let zz = e[2] - a[2];
  let l = Math.hypot(zx, zy, zz);
  zx /= l;
  zy /= l;
  zz /= l;
  let xx = u[1] * zz - u[2] * zy;
  let xy = u[2] * zx - u[0] * zz;
  let xz = u[0] * zy - u[1] * zx;
  l = Math.hypot(xx, xy, xz);
  xx /= l;
  xy /= l;
  xz /= l;
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;
  return [
    xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
    -(xx * e[0] + xy * e[1] + xz * e[2]),
    -(yx * e[0] + yy * e[1] + yz * e[2]),
    -(zx * e[0] + zy * e[1] + zz * e[2]),
    1,
  ];
}
function mult(a: Mat4, b: Mat4): Mat4 {
  const o = new Array<number>(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  }
  return o;
}
function aplicar(m: Mat4, v: Vec3): [number, number, number, number] {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
    m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15],
  ];
}

// ---------- shaders ----------
const VS_TELA = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)) * 2.0 - 1.0;
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

// ruído de gradiente periódico, quatro canais independentes, numa fatia 64x64 do cubo
const FS_RUIDO = `#version 300 es
precision highp float;
precision highp int;
uniform float uZ;
out vec4 o;
uvec3 pcg3d(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v;
}
vec3 grad(ivec3 c, int per, uint s) {
  c = ((c % per) + per) % per;
  uvec3 h = pcg3d(uvec3(c) + uvec3(s, s * 3u + 1u, s * 7u + 2u));
  vec3 g = vec3(h & 1023u) / 511.5 - 1.0;
  return g / max(length(g), 1e-3);
}
float gn(vec3 x, int per, uint s) {
  ivec3 i = ivec3(floor(x));
  vec3 f = fract(x);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n000 = dot(grad(i, per, s), f);
  float n100 = dot(grad(i + ivec3(1, 0, 0), per, s), f - vec3(1.0, 0.0, 0.0));
  float n010 = dot(grad(i + ivec3(0, 1, 0), per, s), f - vec3(0.0, 1.0, 0.0));
  float n110 = dot(grad(i + ivec3(1, 1, 0), per, s), f - vec3(1.0, 1.0, 0.0));
  float n001 = dot(grad(i + ivec3(0, 0, 1), per, s), f - vec3(0.0, 0.0, 1.0));
  float n101 = dot(grad(i + ivec3(1, 0, 1), per, s), f - vec3(1.0, 0.0, 1.0));
  float n011 = dot(grad(i + ivec3(0, 1, 1), per, s), f - vec3(0.0, 1.0, 1.0));
  float n111 = dot(grad(i + ivec3(1, 1, 1), per, s), f - vec3(1.0, 1.0, 1.0));
  return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
             mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
}
void main() {
  vec3 p = vec3(gl_FragCoord.xy, uZ) / 64.0;
  vec4 r = vec4(0.0);
  for (int k = 0; k < 4; k++) {
    uint s = uint(k) * 977u + 13u;
    r[k] = gn(p * 8.0, 8, s) + 0.5 * gn(p * 16.0, 16, s + 101u);
  }
  o = clamp(0.5 + 0.9 * r, 0.0, 1.0);
}`;

// mapa de face (referencial do padrão): r = gás jovem, g = poeira, b = luz velha dos braços, a = H II
const FS_MAPA = `#version 300 es
precision highp float;
precision highp sampler3D;
uniform sampler3D uRuido;
uniform vec4 uBT0, uBR0, uBGas, uBVelho, uBPoeira, uBFa, uBFb;
uniform float uK, uSinP, uRBarra, uExt;
in vec2 vUv;
out vec4 o;
const float PI = 3.14159265;
const float TAU = 6.28318531;
float segm(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
void main() {
  vec2 q = (vUv * 2.0 - 1.0) * uExt;
  float r = max(length(q), 1e-3);
  float th = atan(q.y, q.x);
  float lr = log(r);
  float w = 0.026 + 0.03 * r;
  float yng = 0.0, dst = 0.0, old = 0.0, hii = 0.0;
  for (int i = 0; i < 4; i++) {
    float ta = uBT0[i] - uK * log(r / uBR0[i]);
    float d = mod(th - ta + PI, TAU) - PI;
    float s = r * d * uSinP; // distância perpendicular, positiva para fora
    float env = smoothstep(uBR0[i] - 0.02, uBR0[i] + 0.1, r) * (1.0 - smoothstep(0.9, 1.22, r));
    env *= clamp(0.62 + 0.4 * sin(5.3 * lr + uBFa[i]) + 0.22 * sin(11.7 * lr + uBFb[i]), 0.12, 1.15);
    float a = (s - 0.22 * w) / (0.62 * w);
    yng += uBGas[i] * env * exp(-a * a);
    float b = (s + 0.6 * w) / (0.42 * w);
    dst += uBPoeira[i] * env * exp(-b * b);
    float c = s / (1.9 * w);
    old += uBVelho[i] * env * exp(-c * c);
    float h = (s - 0.06 * w) / (0.42 * w);
    hii += uBGas[i] * env * exp(-h * h);
  }
  // ruído alinhado à espiral (filamentos ao longo dos braços) e isotrópico
  float chi = th + uK * lr;
  vec2 cs = vec2(cos(chi), sin(chi));
  float fil = texture(uRuido, vec3(cs * 0.9, lr * 0.18 + 0.1)).r * 0.55
            + texture(uRuido, vec3(cs * 2.3 + 0.3, lr * 0.42 + 0.6)).g * 0.3
            + texture(uRuido, vec3(cs * 5.5, lr * 1.0 + 0.2)).b * 0.15;
  float iso = texture(uRuido, vec3(q * 1.4, 0.21)).r * 0.5
            + texture(uRuido, vec3(q * 3.7, 0.47)).g * 0.3
            + texture(uRuido, vec3(q * 9.5, 0.73)).b * 0.2;
  float tufo = texture(uRuido, vec3(q * 6.0, 0.33)).a * 0.6 + texture(uRuido, vec3(q * 15.0, 0.81)).r * 0.4;
  float nPoeira = smoothstep(0.3, 0.72, fil * 0.65 + iso * 0.35);
  float poeira = dst * (0.2 + 1.3 * nPoeira);
  // poeira floculenta entre os braços
  poeira += smoothstep(0.56, 0.82, fil * 0.7 + iso * 0.3) * smoothstep(0.1, 0.35, r) * (1.0 - smoothstep(0.85, 1.2, r)) * 0.5;
  // faixas de poeira na borda de ataque da barra e o anel nuclear
  vec2 a1 = vec2(uRBarra * 0.95, 0.05), b1 = vec2(-0.015, 0.032);
  float l1 = segm(q, a1, b1), l2 = segm(q, -a1, -b1);
  float faixas = exp(-l1 * l1 / 0.0004) + exp(-l2 * l2 / 0.0004);
  float nr = (r - 0.05) / 0.011;
  float anel = exp(-nr * nr);
  poeira += (faixas * 0.4 + anel * 0.35) * (0.4 + 0.8 * iso);
  float jov = yng * (0.3 + 1.2 * smoothstep(0.35, 0.75, tufo)) + anel * 0.3;
  float h2 = hii * smoothstep(0.52, 0.82, tufo) * 1.3 + anel * 0.25 * smoothstep(0.4, 0.7, tufo);
  o = vec4(clamp(jov * 0.75, 0.0, 1.0), clamp(poeira * 0.6, 0.0, 1.0), clamp(old * 0.6, 0.0, 1.0), clamp(h2 * 0.8, 0.0, 1.0));
}`;

// gás e poeira: rgb = emissão, a = transmissão da poeira no plano
const FS_GAS = `#version 300 es
precision highp float;
precision highp sampler3D;
uniform sampler3D uRuido;
uniform sampler2D uMapa;
uniform mat3 uCamRot;
uniform vec3 uCam;
uniform vec2 uRes, uTan, uDesloc;
uniform float uPsi, uT, uOmegaP;
uniform float uNuvem, uHn, uRn, uAngNuvem, uEnrola;
uniform float uDisco, uBojo, uBarra, uRevela, uPoeira, uHii, uCod, uChao, uBracos;
in vec2 vUv;
out vec4 o;
const float EXT = 1.32;
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float erfa(float x) {
  float x2 = x * x;
  float e = exp(-x2 * (1.2732395 + 0.147 * x2) / (1.0 + 0.147 * x2));
  return sign(x) * sqrt(max(1.0 - e, 0.0));
}
// integral de exp(-|o+s d|^2) para s>=0, dividida em frente/atrás do plano (tp)
vec2 bolha(vec3 o3, vec3 d3, float tp) {
  float a2 = max(dot(d3, d3), 1e-8);
  float a = sqrt(a2);
  float s0 = -dot(o3, d3) / a2;
  float m2 = max(dot(o3, o3) - s0 * s0 * a2, 0.0);
  float k = 0.8862269 / a * exp(-m2);
  float e0 = erfa(a * s0);
  float tot = k * (1.0 + e0);
  if (tp <= 0.0) return vec2(tot, 0.0);
  float fr = k * (erfa(a * (tp - s0)) + e0);
  return vec2(fr, max(tot - fr, 0.0));
}
void main() {
  vec2 ndc = gl_FragCoord.xy / uRes * 2.0 - 1.0 - uDesloc;
  vec3 ro = uCam;
  vec3 rd = normalize(uCamRot * vec3(ndc * uTan, -1.0));
  vec3 em = vec3(0.0);
  float T = 1.0;
  float tp = abs(rd.z) > 1e-5 ? -ro.z / rd.z : -1.0;

  if (tp > 0.0 && uDisco > 0.0) {
    vec3 P = ro + tp * rd;
    vec2 q = rot(-uPsi) * P.xy;
    float r = length(q);
    if (r < EXT) {
      vec4 m = texture(uMapa, q / (2.0 * EXT) + 0.5);
      float mu = min(1.0 / abs(rd.z), 5.0);
      // detalhe que flui com a rotação diferencial (em relação ao padrão), em duas fases
      float om = uOmegaP * (0.64 / max(r, 0.2) - 1.0);
      const float FT = 18.0;
      float c1 = uT / FT;
      float f1 = fract(c1), f2 = fract(c1 + 0.5);
      float w1 = 1.0 - abs(2.0 * f1 - 1.0);
      vec2 q1 = rot(om * (f1 - 0.5) * FT) * q;
      vec2 q2 = rot(om * (f2 - 0.5) * FT) * q;
      float z1 = floor(c1) * 0.371, z2 = floor(c1 + 0.5) * 0.371 + 0.5;
      float nrm = inversesqrt(w1 * w1 + (1.0 - w1) * (1.0 - w1));
      vec4 nA = (mix(texture(uRuido, vec3(q2 * 1.9, z2)), texture(uRuido, vec3(q1 * 1.9, z1)), w1) - 0.5) * nrm + 0.5;
      vec4 nB = (mix(texture(uRuido, vec3(q2 * 5.3, z2 + 0.25)), texture(uRuido, vec3(q1 * 5.3, z1 + 0.25)), w1) - 0.5) * nrm + 0.5;
      float nf = clamp(nA.r * 0.6 + nB.r * 0.4, 0.0, 1.0);
      float nd = clamp(nA.g * 0.5 + nB.g * 0.5, 0.0, 1.0);
      float rev = smoothstep(uRevela, uRevela - 0.14, r);
      float fora = 1.0 - smoothstep(0.8, 1.22, r);
      float perfil = exp(-r / 0.28) * fora;
      float velho = perfil * (0.32 + 1.6 * m.b * rev) * (0.75 + 0.5 * nf);
      float jovem = m.r * rev * (0.35 + 1.3 * nf * nf);
      float h2 = m.a * rev * uHii * (0.6 + 0.8 * nf);
      float floc = smoothstep(0.62, 0.8, nd) * smoothstep(0.08, 0.3, r) * fora * 0.12;
      float tau = (m.g * rev * (0.6 + 0.8 * nd) + floc) * uPoeira * mu * 4.0;
      vec3 e = vec3(1.0, 0.80, 0.58) * velho * K_VELHO * uChao + (vec3(0.40, 0.58, 1.0) * jovem * K_JOVEM + vec3(1.0, 0.32, 0.52) * h2 * K_HII) * uBracos;
      tau *= uBracos;
      T = exp(-tau);
      em += e * uDisco * mu * mix(1.0, T, 0.8);
    }
  }

  // bojo, núcleo e barra só importam perto do centro: o raio que passa longe pula tudo
  float perto = length(ro - dot(ro, rd) * rd);
  if (uBojo > 0.0) {
    vec3 sH = vec3(1.0 / 0.5, 1.0 / 0.5, 1.0 / 0.34);
    vec2 fh = bolha(ro * sH, rd * sH, tp);
    em += uBojo * vec3(1.0, 0.80, 0.62) * K_HALO * (fh.x + fh.y * T);
  }
  if (uBojo > 0.0 && perto < 0.5) {
    vec3 sB = vec3(1.0 / 0.09, 1.0 / 0.09, 1.0 / 0.062);
    vec2 fb = bolha(ro * sB, rd * sB, tp);
    vec3 sC = vec3(1.0 / 0.024, 1.0 / 0.024, 1.0 / 0.019);
    vec2 fc = bolha(ro * sC, rd * sC, tp);
    em += uBojo * (vec3(1.0, 0.72, 0.40) * K_BOJO * (fb.x + fb.y * T)
                 + vec3(1.0, 0.86, 0.62) * K_NUCLEO * (fc.x + fc.y * T));
  }
  if (uBarra > 0.0 && perto < 0.5) {
    mat2 R = rot(-uPsi);
    vec3 ob = vec3(R * ro.xy, ro.z), db = vec3(R * rd.xy, rd.z);
    vec3 sb = vec3(1.0 / 0.10, 1.0 / 0.046, 1.0 / 0.04);
    vec2 f = bolha((ob - vec3(0.13, 0.0, 0.0)) * sb, db * sb, tp)
           + bolha((ob + vec3(0.13, 0.0, 0.0)) * sb, db * sb, tp)
           + 0.8 * bolha(ob * sb, db * sb, tp);
    em += uBarra * vec3(1.0, 0.75, 0.42) * K_BARRA * (f.x + f.y * T);
  }

  if (uNuvem > 0.0) {
    vec3 sc = vec3(1.0 / uRn, 1.0 / uRn, 1.0 / uHn);
    vec3 o2 = ro * sc, d2 = rd * sc;
    float A = dot(d2, d2), B = dot(o2, d2), C = dot(o2, o2) - 1.0;
    float disc = B * B - A * C;
    if (disc > 0.0) {
      float sq = sqrt(disc);
      float t0 = max((-B - sq) / A, 0.0), t1 = (-B + sq) / A;
      if (t1 > t0) {
        const int N = 12;
        float dt = (t1 - t0) / float(N);
        float j = ign(gl_FragCoord.xy);
        vec3 acc = vec3(0.0);
        float zs = 0.55 / uHn;
        for (int i = 0; i < N; i++) {
          vec3 p = ro + rd * (t0 + (float(i) + j) * dt);
          vec3 pe = p * sc;
          float pe2 = dot(pe, pe);
          float env = max(exp(-pe2 * 3.6) - 0.03, 0.0);
          // o gás se enrola em espiral à medida que achata (cisalhamento diferencial)
          float rp = length(p.xy);
          vec3 pc = vec3(rot(-uAngNuvem + uEnrola * log(rp + 0.08)) * p.xy, p.z * zs) + vec3(0.21, 0.43, 0.17);
          vec4 n1 = texture(uRuido, pc * 0.3 + vec3(0.0, 0.0, uT * 0.003));
          vec3 wv = (n1.gba - 0.5) * 0.8;
          vec4 n2 = texture(uRuido, pc * 0.75 + wv + vec3(0.31, 0.17, -uT * 0.005));
          vec4 n3 = texture(uRuido, pc * 1.7 + wv * 0.8 + vec3(0.73, 0.29, uT * 0.008));
          float d = smoothstep(0.38, 0.84, n1.r * 0.55 + n2.r * 0.35 + n3.r * 0.1 + 0.3 * exp(-pe2 * 4.0) - 0.1);
          d *= sqrt(d);
          float ouro = smoothstep(0.5, 0.7, n2.b * 0.65 + n3.a * 0.35);
          vec3 c = mix(vec3(0.30, 0.36, 1.0), vec3(0.62, 0.38, 1.0), smoothstep(0.35, 0.65, n1.a));
          c = mix(c, vec3(1.25, 0.82, 0.38), ouro * 0.85);
          acc += c * (d * env);
        }
        em += acc * dt * uNuvem * K_NUVEM;
      }
    }
  }
  o = vec4(em * uCod, T);
}`;

// estrelas em pontos (todas as populações num só buffer)
const VS_ESTRELAS = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aG;  // r, theta0, z, população
layout(location = 1) in vec4 aC;  // nuvem: r, dtheta, z, início da organização (ou xyz do céu)
layout(location = 2) in vec4 aB;  // nascimento, brilho, tamanho (px CSS), semente
layout(location = 3) in vec3 aCor;
uniform mat4 uVP;
uniform vec3 uCam;
uniform sampler2D uGas;
uniform float uT, uS, uPsi0, uOmegaP, uAngNuvem, uDpr, uDref, uGal, uCeu, uFlash, uMaxPt, uLocal, uCod;
out vec3 vCor;
flat out float vTipo;
out vec2 vElipse;
out float vNucleo;
void main() {
  float pop = aG.w;
  vec3 wp;
  float tipo = 0.0;
  float brilho = aB.y;
  float vis = 1.0;
  bool ceu = pop > 4.5 && pop < 6.5;
  if (ceu) {
    wp = aC.xyz;
    brilho *= uCeu;
    if (pop > 5.5) tipo = 2.0;
  } else {
    bool rigida = (pop > 0.5 && pop < 1.5) || (pop > 2.5 && pop < 4.5) || pop > 7.5;
    float r = aG.x;
    float om = rigida ? uOmegaP : uOmegaP * 0.64 / max(r, 0.2);
    if (pop > 6.5 && pop < 7.5) { om = uOmegaP * 0.15; tipo = 3.0; }
    float e = smoothstep(aC.w, aC.w + 0.3, uS);
    float rr = mix(aC.x, r, e);
    float ie = 1.0 - e;
    float tt = aG.y + uPsi0 + mix(uAngNuvem, om * uT, e) + aC.y * ie * ie;
    float zz = mix(aC.z, aG.z, e);
    wp = vec3(rr * cos(tt), rr * sin(tt), zz);
    vis = smoothstep(aB.x, aB.x + 0.05, uS);
    brilho *= pop > 7.5 ? uLocal : uGal;
    if (pop > 3.5 && pop < 4.5) {
      tipo = 1.0;
      float desde = uS - aB.x;
      brilho *= 1.0 + uFlash * 2.2 * exp(-max(desde, 0.0) * 45.0) * step(0.0, desde);
      brilho *= 0.86 + 0.14 * sin(uT * (0.5 + aB.w * 0.9) + aB.w * 40.0);
    }
  }
  if (vis * brilho <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vCor = vec3(0.0); vTipo = 0.0; vElipse = vec2(0.0, 1.0); vNucleo = 1.0;
    return;
  }
  vec4 clip = uVP * vec4(wp, 1.0);
  float prof = clip.w;
  float sc = ceu ? 1.0 : clamp(uDref / max(prof, 1e-4), 0.25, 40.0);
  float px = aB.z * uDpr * pow(sc, 0.6);
  float I = brilho * vis * sqrt(min(sc, 4.0)) * (ceu ? 1.0 : smoothstep(0.004, 0.04, prof));
  // a vizinhança do Sol só se resolve em estrelas quando a câmera chega perto
  if (pop > 7.5) I *= smoothstep(2.0, 6.0, sc);
  vNucleo = 1.0;
  if (tipo < 0.5 || tipo > 2.5) {
    // estrela: sigma >= 0,62 px do aparelho, o sprite cobre 7 sigma; de perto o núcleo
    // continua fino e só o halo cresce (estrela não vira bola desfocada)
    float sig = max(0.62, px * 0.42);
    float sig0 = max(0.62, aB.z * uDpr * 0.42);
    vNucleo = clamp(sig0 * 1.4 / sig, 0.0, 1.0);
    I *= min(1.0, px * 0.42 / 0.62) * 0.65 + 0.35;
    px = sig * 7.0;
  } else if (tipo < 1.5) {
    I *= mix(1.0, 0.45, smoothstep(2.0, 8.0, sc));
  }
  gl_PointSize = min(px, uMaxPt);
  gl_Position = clip;
  // poeira do plano: quem está atrás dele (vista da câmera) apaga mais; o vermelho passa mais
  vec2 ndc = clip.xy / max(clip.w, 1e-5);
  float T = max(textureLod(uGas, ndc * 0.5 + 0.5, 0.0).a, 1e-4);
  bool frente = !ceu && wp.z * uCam.z > 0.0;
  vec3 at = pow(vec3(T), vec3(0.72, 1.0, 1.35) * (frente ? 0.5 : 1.25));
  vCor = aCor * I * at * uCod;
  vTipo = tipo;
  vElipse = aG.xy;
}`;

const FS_ESTRELAS = `#version 300 es
precision highp float;
in vec3 vCor;
flat in float vTipo;
in vec2 vElipse;
in float vNucleo;
out vec4 o;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float f;
  if (vTipo < 0.5) {
    float r2 = dot(c, c);
    f = vNucleo > 0.99 ? exp(-r2 * 6.1) : exp(-r2 * 6.1 / (vNucleo * vNucleo)) + 0.16 * exp(-r2 * 5.0);
  } else if (vTipo < 1.5) {
    float r2 = dot(c, c);
    f = exp(-r2 * 4.5) * 0.7 + exp(-r2 * 18.0) * 0.6;
  } else if (vTipo < 2.5) {
    float cs = cos(vElipse.x), sn = sin(vElipse.x);
    c = mat2(cs, sn, -sn, cs) * c;
    c.y /= vElipse.y;
    float r2 = dot(c, c);
    f = exp(-r2 * 5.0) + exp(-r2 * 30.0) * 0.6;
  } else {
    f = exp(-dot(c, c) * 3.6);
  }
  o = vec4(vCor * f, 1.0);
}`;

const FS_TOM = `#version 300 es
precision highp float;
uniform sampler2D uGas, uEst;
uniform vec2 uRes, uSol, uPassoGas;
uniform float uSolR, uSolI, uDecod, uDecodEst;
in vec2 vUv;
out vec4 o;
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main() {
  // quatro amostras a meio texel: filtro tenda que apaga o grão da marcha da nuvem
  vec3 c;
  if (uPassoGas.x > 0.0) {
    vec2 h = uPassoGas * 0.5;
    c = (texture(uGas, vUv + vec2(h.x, h.y)).rgb + texture(uGas, vUv + vec2(-h.x, h.y)).rgb
       + texture(uGas, vUv + vec2(h.x, -h.y)).rgb + texture(uGas, vUv + vec2(-h.x, -h.y)).rgb) * 0.25;
  } else {
    c = texture(uGas, vUv).rgb;
  }
  c = c * uDecod + texture(uEst, vUv).rgb * uDecodEst;
  if (uSolI > 0.0) {
    vec2 d = (gl_FragCoord.xy - uSol) / uSolR;
    float d2 = dot(d, d);
    c += uSolI * (vec3(1.0, 0.88, 0.66) * exp(-d2 * 60.0) * 3.2
                + vec3(1.0, 0.72, 0.40) * exp(-d2 * 7.0) * 0.55
                + vec3(0.95, 0.60, 0.30) * 0.025 / (1.0 + d2 * 8.0));
  }
  c = 1.0 - exp(-c);
  vec2 v = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  c *= 1.0 - 0.28 * smoothstep(0.35, 1.1, length(v));
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c += (ign(gl_FragCoord.xy) + ign(gl_FragCoord.yx + 17.0) - 1.0) / 255.0;
  o = vec4(c, 1.0);
}`;

// anel do Sol, deitado no plano do disco, desenhado por cima do quadro pronto
const VS_ANEL = `#version 300 es
uniform mat4 uVP;
uniform vec3 uSol;
uniform float uRq;
out vec2 vP;
void main() {
  vec2 c = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1)) * 2.0 - 1.0;
  vP = c * uRq;
  gl_Position = uVP * vec4(uSol + vec3(vP, 0.0), 1.0);
}`;
const FS_ANEL = `#version 300 es
precision highp float;
in vec2 vP;
uniform float uR1, uA1, uR2, uA2, uPonto, uDpr;
out vec4 o;
void main() {
  float d = length(vP);
  float fw = max(fwidth(d), 1e-7);
  float a = clamp(1.25 * uDpr * 0.5 + 0.5 - abs(d - uR1) / fw, 0.0, 1.0) * uA1;
  a += clamp(0.9 * uDpr * 0.5 + 0.5 - abs(d - uR2) / fw, 0.0, 1.0) * uA2;
  a += clamp(1.5 * uDpr + 0.5 - d / fw, 0.0, 1.0) * uPonto;
  a = min(a, 1.0);
  o = vec4(vec3(0.886, 0.722, 0.447) * a, a);
}`;

// rótulo do Sol: um retângulo no pixel inteiro do aparelho, um texel do bitmap por pixel
const VS_ROTULO = `#version 300 es
uniform vec4 uRet;  // x, y (do topo), largura, altura, em px do aparelho
uniform vec2 uRes;
void main() {
  vec2 c = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1));
  vec2 px = uRet.xy + c * uRet.zw;
  gl_Position = vec4(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0, 0.0, 1.0);
}`;
const FS_ROTULO = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec4 uRet;
uniform vec2 uRes;
uniform float uOp;
out vec4 o;
void main() {
  ivec2 t = ivec2(int(gl_FragCoord.x) - int(uRet.x), int(uRes.y) - 1 - int(gl_FragCoord.y) - int(uRet.y));
  o = texelFetch(uTex, t, 0) * uOp;
}`;

// constantes de brilho (calibradas olhando as fotos)
const BRILHOS: Record<string, number> = {
  K_VELHO: 0.62,
  K_JOVEM: 1.1,
  K_HII: 0.55,
  K_BOJO: 13.0,
  K_NUCLEO: 32.0,
  K_HALO: 0.05,
  K_BARRA: 15.0,
  K_NUVEM: 2.2,
};
const comBrilhos = (src: string): string =>
  src.replace(/K_[A-Z]+/g, (k) => (k in BRILHOS ? BRILHOS[k].toFixed(4) : k));

// ---------- partículas ----------
const COR: Record<string, Vec3> = {
  M: [1.0, 0.5, 0.28],
  K: [1.0, 0.66, 0.38],
  G: [1.0, 0.83, 0.6],
  F: [1.0, 0.93, 0.82],
  A: [0.86, 0.9, 1.0],
  B: [0.64, 0.75, 1.0],
  O: [0.55, 0.67, 1.0],
  H2: [1.0, 0.34, 0.55],
  H2r: [1.0, 0.27, 0.33],
};
const misturaCor = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

function gerarParticulas(): Float32Array {
  const R = aleatorio(20261007);
  const g = (): number => {
    let u = 0;
    while (u === 0) u = R();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * R());
  };
  const laplace = (): number => (R() < 0.5 ? 1 : -1) * -Math.log(1 - R() * 0.999);
  const d: number[] = [];
  const pos = (r: number, th: number, z: number, pop: number, nuv: Vec3, org: number, nasc: number, lum: number, tam: number, cor: Vec3): void => {
    d.push(r, th, z, pop, nuv[0], nuv[1], nuv[2], org, nasc, lum, tam, R(), cor[0], cor[1], cor[2]);
  };
  // posição de cada partícula na nuvem primordial (cilíndrica, relativa à da galáxia)
  const nuvem = (r: number): Vec3 => {
    const rc = Math.min(1.45, 0.4 * r + 1.0 * Math.pow(R(), 0.65));
    return [rc, (R() - 0.5) * 3.2, g() * 0.4 * (1.1 - (0.5 * rc) / 1.45)];
  };

  // 0 bojo: gigantes K velhas
  for (let i = 0; i < 5200; i++) {
    const sc = R() < 0.7 ? 0.07 : 0.13;
    const x = g() * sc;
    const y = g() * sc;
    const z = g() * sc * 0.62;
    const r = Math.hypot(x, y);
    const nasc = 0.2 + 0.2 * Math.min(1, Math.hypot(r, z) / 0.2) + 0.06 * R();
    const cor = R() < 0.1 ? COR.M : misturaCor(COR.K, COR.G, R() * 0.7);
    pos(r, Math.atan2(y, x), z, 0, nuvem(r), 0.04 + 0.1 * R(), nasc, 0.12 + 0.7 * R() ** 4, 0.9 + 1.1 * R() ** 4, cor);
  }
  // 1 barra: caixa/amendoim no referencial do padrão
  for (let i = 0; i < 4200; i++) {
    const u = R() * 2 - 1;
    const x = Math.sign(u) * Math.pow(Math.abs(u), 0.8) * R_BARRA * 0.95 + g() * 0.015;
    const ax = Math.min(1, Math.abs(x) / R_BARRA);
    const y = g() * 0.04 * (1 - 0.45 * ax * ax);
    const z = g() * 0.03 * (1 + 0.5 * Math.sin(Math.PI * ax));
    const r = Math.hypot(x, y);
    const cor = misturaCor(COR.K, COR.G, R() * 0.8);
    pos(r, Math.atan2(y, x), z, 1, nuvem(r), 0.08 + 0.12 * R(), 0.3 + 0.2 * ax + 0.06 * R(), 0.12 + 0.7 * R() ** 4, 0.9 + 1.0 * R() ** 4, cor);
  }
  // 2 disco velho (axissimétrico; as primeiras 700 são as estrelas espalhadas da nuvem)
  for (let i = 0; i < 17000; i++) {
    let r: number;
    do r = -0.26 * Math.log(R() * R() + 1e-9);
    while (r > 1.15 || r < 0.05);
    const th = R() * TAU;
    const z = laplace() * (0.01 + 0.012 * r);
    const primeira = i < 700;
    const nasc = primeira ? R() * 0.05 : 0.22 + 0.5 * Math.min(r / 1.2, 1) + 0.08 * (R() - 0.5);
    const org = 0.07 + 0.33 * Math.min(r / 1.15, 1) + (R() - 0.5) * 0.08;
    const u = R();
    let cor = u < 0.35 ? COR.G : u < 0.7 ? COR.F : u < 0.9 ? COR.K : COR.A;
    let lum = 0.1 + 0.9 * R() ** 5;
    let tam = 0.8 + 1.2 * R() ** 5;
    if (primeira) {
      cor = R() < 0.55 ? misturaCor(COR.A, COR.B, R()) : misturaCor(COR.G, COR.K, R());
      lum = 0.25 + 0.9 * R() ** 2;
      tam = 0.9 + 1.4 * R() ** 2;
    }
    pos(r, th, z, 2, nuvem(r), org, nasc, lum, tam, cor);
  }
  // 3 estrelas jovens nos braços: associações OB e campo
  const escolheBraco = (): Braco => {
    let u = R();
    for (const b of BRACOS) {
      if (u < b.jov) return b;
      u -= b.jov;
    }
    return BRACOS[3];
  };
  // raio ao longo do braço, aceito pela modulação (trechos fortes recebem mais)
  const raioNoBraco = (b: Braco, r1: number, ex: number): number => {
    for (;;) {
      const r = b.r0 + 0.03 + (r1 - b.r0) * Math.pow(R(), ex);
      if (R() * 1.15 < forcaBraco(b, r)) return r;
    }
  };
  const jovem = (r: number, th: number, nasc: number): void => {
    const u = R();
    const cor = u < 0.03 ? COR.M : u < 0.35 ? COR.O : u < 0.8 ? COR.B : COR.A;
    const lum = 0.2 + 1.5 * R() ** 6;
    const tam = 0.9 + 1.8 * R() ** 6;
    pos(r, th, g() * 0.006, 3, [0, 0, 0], -1, nasc, lum, tam, cor);
  };
  for (let k = 0; k < 240; k++) {
    const b = escolheBraco();
    const r = raioNoBraco(b, 1.1, 0.85);
    const w = 0.026 + 0.03 * r;
    const s = 0.32 * w + g() * 0.3 * w;
    const th = anguloBraco(b, r) + s / (r * SINP);
    const n = 4 + Math.floor(R() * 16);
    const nasc = sRev(r) + 0.01 + 0.03 * R();
    for (let j = 0; j < n; j++) {
      const rr = r + g() * 0.011;
      jovem(rr, th + (g() * 0.011) / rr, nasc + 0.02 * R());
    }
  }
  for (let k = 0; k < 1300; k++) {
    const b = escolheBraco();
    const r = raioNoBraco(b, 1.12, 0.9);
    const w = 0.026 + 0.03 * r;
    const s = 0.28 * w + g() * 0.5 * w;
    jovem(r, anguloBraco(b, r) + s / (r * SINP), sRev(r) + 0.01 + 0.04 * R());
  }
  // 4 nós de H II (brasas rosadas), cada um em 2 a 4 bolhas
  const no = (r: number, th: number, nasc: number, escala: number): void => {
    const nb = 2 + Math.floor(R() * 3);
    const cor = misturaCor(COR.H2, COR.H2r, R() * 0.6);
    const lum = (0.35 + 0.7 * R()) * escala;
    const tam = (4 + 7 * R() ** 2) * escala;
    for (let j = 0; j < nb; j++) {
      const rr = r + g() * 0.005;
      pos(rr, th + (g() * 0.005) / rr, g() * 0.003, 4, [0, 0, 0], -1, nasc, lum * (j ? 0.6 : 1), tam * (j ? 0.7 : 1), cor);
    }
  };
  for (let k = 0; k < 300; k++) {
    const b = BRACOS[Math.floor(R() * 4)];
    const r = raioNoBraco(b, 1.1, 0.9);
    const w = 0.026 + 0.03 * r;
    const s = 0.1 * w + g() * 0.3 * w;
    no(r, anguloBraco(b, r) + s / (r * SINP), sRev(r) + 0.03 + 0.05 * R(), 1);
  }
  for (let k = 0; k < 12; k++) no(0.05 + g() * 0.004, R() * TAU, 0.5 + 0.1 * R(), 0.45);
  // 5 céu de fundo, distante e fraco
  for (let i = 0; i < 1100; i++) {
    const z = R() * 2 - 1;
    const f = R() * TAU;
    const q = Math.sqrt(1 - z * z);
    const u = R();
    const cor = u < 0.3 ? COR.K : u < 0.6 ? COR.G : u < 0.85 ? COR.F : COR.B;
    d.push(0, 0, 0, 5, 45 * q * Math.cos(f), 45 * q * Math.sin(f), 45 * z, 0, 0, 0.05 + 0.45 * R() ** 6, 0.7 + 0.8 * R() ** 3, R(), ...cor);
  }
  // 6 galáxias distantes: manchinhas elípticas
  for (let i = 0; i < 28; i++) {
    const z = R() * 2 - 1;
    const f = R() * TAU;
    const q = Math.sqrt(1 - z * z);
    d.push(R() * TAU, 0.3 + 0.6 * R(), 0, 6, 45 * q * Math.cos(f), 45 * q * Math.sin(f), 45 * z, 0, 0, 0.05 + 0.08 * R(), 3 + 5 * R(), R(), ...misturaCor(COR.F, COR.K, R() * 0.6));
  }
  // 7 aglomerados globulares do halo
  for (let i = 0; i < 70; i++) {
    const rr = 0.08 + 0.9 * Math.pow(R(), 1.6);
    const z0 = R() * 2 - 1;
    const f = R() * TAU;
    const q = Math.sqrt(1 - z0 * z0);
    const x = rr * q * Math.cos(f);
    const y = rr * q * Math.sin(f);
    const r = Math.hypot(x, y);
    pos(r, Math.atan2(y, x), rr * z0, 7, nuvem(r), 0.03 + 0.1 * R(), 0.18 + 0.15 * R(), 0.22 + 0.3 * R(), 1.6 + 0.8 * R(), COR.G);
  }
  // 8 vizinhança do Sol: só aparece no mergulho, para as estrelas passarem pela câmera
  const xs = R_SOL * Math.cos(TH_SOL);
  const ys = R_SOL * Math.sin(TH_SOL);
  for (let i = 0; i < 1400; i++) {
    const sc = R() < 0.6 ? 0.05 : 0.12;
    const x = xs + g() * sc;
    const y = ys + g() * sc;
    const u = R();
    const cor = u < 0.3 ? COR.G : u < 0.55 ? COR.F : u < 0.75 ? COR.K : u < 0.92 ? COR.A : COR.B;
    pos(Math.hypot(x, y), Math.atan2(y, x), g() * 0.02, 8, [0, 0, 0], -1, 0, 0.12 + 0.7 * R() ** 4, 0.7 + 0.9 * R() ** 4, cor);
  }
  return new Float32Array(d);
}

/** o WebGL devolve `null` quando não consegue criar o objeto (contexto perdido, sem memória) */
function obter<T>(objeto: T | null, nome: string): T {
  if (!objeto) throw new Error('WebGL: não criou ' + nome);
  return objeto;
}

/** a composição da câmera, refeita a cada `redimensionar` */
interface Composicao {
  el: number;
  fov: number;
  D: number;
  rolo: number;
  desloc: number;
}

interface Camera {
  psi: number;
  C: Vec3;
  S: Vec3;
  VP: Mat4;
  rot3: number[];
  tan: [number, number];
  dy: number;
  D: number;
}

// o rótulo do Sol: nome no mapa de recursos e folga do anel no bitmap (px de CSS)
const ID_ROTULO = 'voceEstaAqui';
const FOLGA_ANEL = 1;

export const galaxia: DefinicaoDaCena = {
  id: 'galaxia',
  duracaoFinal: 2.8,
  criar(canvas: HTMLCanvasElement | OffscreenCanvas, recursos?: RecursosDaCena): Cena {
    const contexto = canvas.getContext('webgl2', ATRIBUTOS);
    if (!contexto) throw new Error('WebGL2 indisponível');
    const gl: WebGL2RenderingContext = contexto;

    const flutuante = !!gl.getExtension('EXT_color_buffer_float');
    const COD = flutuante ? 1 : 0.25; // gás: sem float, guarda 1/4 do valor para ter folga
    const COD_EST = 1 / 6;
    const faixaPonto = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array | null;
    const maxPt = (faixaPonto && faixaPonto[1]) || 64;

    const programas: WebGLProgram[] = [];
    function programa(vs: string, fs: string): { p: WebGLProgram; u: Uniformes } {
      const p = obter(gl.createProgram(), 'programa');
      const fontes: [number, string][] = [
        [gl.VERTEX_SHADER, vs],
        [gl.FRAGMENT_SHADER, fs],
      ];
      for (const [tipo, src] of fontes) {
        const s = obter(gl.createShader(tipo), 'shader');
        gl.shaderSource(s, comBrilhos(src));
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
          const log = gl.getShaderInfoLog(s);
          gl.deleteShader(s);
          throw new Error('shader: ' + log);
        }
        gl.attachShader(p, s);
        gl.deleteShader(s);
      }
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
        throw new Error('programa: ' + gl.getProgramInfoLog(p));
      }
      const u: Uniformes = {};
      const n: number = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) || 0;
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i);
        if (info) u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name);
      }
      programas.push(p);
      return { p, u };
    }
    const pRuido = programa(VS_TELA, FS_RUIDO);
    const pMapa = programa(VS_TELA, FS_MAPA);
    const pGas = programa(VS_TELA, FS_GAS);
    const pEst = programa(VS_ESTRELAS, FS_ESTRELAS);
    const pTom = programa(VS_TELA, FS_TOM);
    const pAnel = programa(VS_ANEL, FS_ANEL);
    const pRotulo = programa(VS_ROTULO, FS_ROTULO);

    const vaoVazio = obter(gl.createVertexArray(), 'vao');
    gl.bindVertexArray(vaoVazio);
    gl.disable(gl.DEPTH_TEST);

    // cubo de ruído 64³, gerado na GPU fatia a fatia
    const ruido = obter(gl.createTexture(), 'textura');
    gl.bindTexture(gl.TEXTURE_3D, ruido);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 64, 64, 64, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, p, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const fboAux = obter(gl.createFramebuffer(), 'framebuffer');
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboAux);
    gl.useProgram(pRuido.p);
    gl.viewport(0, 0, 64, 64);
    for (let z = 0; z < 64; z++) {
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, ruido, 0, z);
      gl.uniform1f(pRuido.u.uZ, z + 0.5);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // mapa de face 2048², com mipmaps
    const LADO_MAPA = 2048;
    const mapa = obter(gl.createTexture(), 'textura');
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, mapa);
    gl.texStorage2D(gl.TEXTURE_2D, Math.log2(LADO_MAPA) + 1, gl.RGBA8, LADO_MAPA, LADO_MAPA);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, ruido);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, mapa, 0);
    gl.useProgram(pMapa.p);
    gl.uniform1i(pMapa.u.uRuido, 0);
    gl.uniform4fv(pMapa.u.uBT0, BRACOS.map((b) => b.t0));
    gl.uniform4fv(pMapa.u.uBR0, BRACOS.map((b) => b.r0));
    gl.uniform4fv(pMapa.u.uBGas, BRACOS.map((b) => b.gas));
    gl.uniform4fv(pMapa.u.uBVelho, BRACOS.map((b) => b.velho));
    gl.uniform4fv(pMapa.u.uBPoeira, BRACOS.map((b) => b.poeira));
    gl.uniform4fv(pMapa.u.uBFa, BRACOS.map((b) => b.fa));
    gl.uniform4fv(pMapa.u.uBFb, BRACOS.map((b) => b.fb));
    gl.uniform1f(pMapa.u.uK, KSP);
    gl.uniform1f(pMapa.u.uSinP, SINP);
    gl.uniform1f(pMapa.u.uRBarra, R_BARRA);
    gl.uniform1f(pMapa.u.uExt, EXT);
    gl.viewport(0, 0, LADO_MAPA, LADO_MAPA);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE1);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // estrelas
    const dados = gerarParticulas();
    const NPART = dados.length / 15;
    const vaoEst = obter(gl.createVertexArray(), 'vao');
    gl.bindVertexArray(vaoEst);
    const buf = obter(gl.createBuffer(), 'buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, dados, gl.STATIC_DRAW);
    const STRIDE = 15 * 4;
    const atributos: [number, number, number][] = [
      [0, 4, 0],
      [1, 4, 16],
      [2, 4, 32],
      [3, 3, 48],
    ];
    for (const [loc, n, off] of atributos) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, STRIDE, off);
    }
    gl.bindVertexArray(vaoVazio);

    // alvos que dependem do tamanho da tela
    let W = 1;
    let H = 1;
    let GW = 1;
    let GH = 1;
    let cssW = 1;
    let cssH = 1;
    let DPR = 1;
    let texGas: WebGLTexture | null = null;
    let texEst: WebGLTexture | null = null;
    const fboEst = obter(gl.createFramebuffer(), 'framebuffer');
    const fboGas = obter(gl.createFramebuffer(), 'framebuffer');
    function alvo(tex: WebGLTexture | null, fbo: WebGLFramebuffer, w: number, h: number, filtro: number, formato: number): WebGLTexture {
      if (tex) gl.deleteTexture(tex);
      const t = obter(gl.createTexture(), 'textura');
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, 1, formato, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtro);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtro);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return t;
    }

    const lay: Composicao = { el: 0, fov: 30 * GRAU, D: 1, rolo: 0, desloc: 0 };
    let medido = false; // `redimensionar` já rodou
    let topoBloco = 0; // onde começa o bloco de texto do hospedeiro (o rótulo foge dele)
    let vivo = true;

    function redimensionar(w: number, h: number, dpr: number): void {
      cssW = w;
      cssH = h;
      DPR = dpr;
      W = Math.max(1, Math.round(w * dpr));
      H = Math.max(1, Math.round(h * dpr));
      canvas.width = W;
      canvas.height = H;
      const gs = Math.min(0.75, Math.sqrt(0.62e6 / (W * H)));
      GW = Math.max(1, Math.round(W * gs));
      GH = Math.max(1, Math.round(H * gs));
      texGas = alvo(texGas, fboGas, GW, GH, gl.LINEAR, flutuante ? gl.RGBA16F : gl.RGBA8);
      // estrelas em 10 bits por canal (metade da banda do float), com folga até 6
      texEst = alvo(texEst, fboEst, W, H, gl.NEAREST, gl.RGB10_A2);

      const retrato = w / h < 0.9;
      const inc = (retrato ? 54 : 60) * GRAU;
      const fov = 30 * GRAU;
      const diam = retrato ? Math.min(0.72 * h, (0.94 * w) / Math.cos(inc)) : Math.min(0.8 * w, 1.34 * h);
      const cy = retrato ? 0.415 : 0.41;
      lay.el = Math.PI / 2 - inc;
      lay.fov = fov;
      lay.D = (R_VIS * h) / (diam * Math.tan(fov / 2));
      lay.rolo = (retrato ? 78 : -3) * GRAU;
      lay.desloc = 1 - 2 * cy;
      const tit = retrato ? Math.max(34, Math.min(48, 0.105 * w)) : Math.max(44, Math.min(84, 0.046 * w));
      const baixo = retrato ? Math.max(36, 0.07 * h) : Math.max(28, 0.06 * h);
      topoBloco = h - baixo - tit * 1.04 - (retrato ? 10 : 14) - 20;
      medido = true;
    }

    // kFim: quanto a câmera chega perto do Sol (menos com movimento reduzido)
    function camera(s: number, f: number, tA: number, kFim: number): Camera {
      const psi = PSI0 + OMEGA_P * tA;
      const el = lay.el + 7 * GRAU * (1 - sstep(0, 0.6, s));
      const D = lay.D;
      const C0: Vec3 = [0, -D * Math.cos(el), D * Math.sin(el)];
      const ths = TH_SOL + psi;
      const S: Vec3 = [R_SOL * Math.cos(ths), R_SOL * Math.sin(ths), 0];
      const gg = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
      const k = Math.exp(Math.log(kFim) * gg);
      const d0: Vec3 = [C0[0] - S[0], C0[1] - S[1], C0[2] - S[2]];
      const L0 = Math.hypot(d0[0], d0[1], d0[2]);
      const kd = sstep(0.1, 0.85, f);
      const dir: Vec3 = [(d0[0] / L0) * (1 - 0.65 * kd), (d0[1] / L0) * (1 - 0.65 * kd), d0[2] / L0 + 0.9 * kd];
      const Ld = Math.hypot(dir[0], dir[1], dir[2]);
      const C: Vec3 = [S[0] + (dir[0] / Ld) * L0 * k, S[1] + (dir[1] / Ld) * L0 * k, S[2] + (dir[2] / Ld) * L0 * k];
      const ka = sstep(0, 0.6, f);
      const alvoV: Vec3 = [S[0] * ka, S[1] * ka, 0];
      const V0 = olhar(C, alvoV, [0, 0, 1]);
      const cr = Math.cos(lay.rolo);
      const sr = Math.sin(lay.rolo);
      const Rz: Mat4 = [cr, sr, 0, 0, -sr, cr, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
      const V = mult(Rz, V0);
      const P = perspectiva(lay.fov, cssW / cssH, 0.002, 200);
      const dy = lay.desloc * (1 - sstep(0, 0.7, f));
      const Sh: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, dy, 0, 1];
      const VP = mult(Sh, mult(P, V));
      const rot3 = [V[0], V[1], V[2], V[4], V[5], V[6], V[8], V[9], V[10]];
      const ty = Math.tan(lay.fov / 2);
      return { psi, C, S, VP, rot3, tan: [ty * (cssW / cssH), ty], dy, D };
    }

    function paraTela(VP: Mat4, p: Vec3): [number, number] | null {
      const c = aplicar(VP, p);
      if (c[3] <= 1e-6) return null;
      return [(c[0] / c[3] * 0.5 + 0.5) * cssW, (1 - (c[1] / c[3] * 0.5 + 0.5)) * cssH];
    }

    // o rótulo do Sol: a textura do bitmap do hospedeiro, enviada de novo só quando ele troca
    const texRotulo = obter(gl.createTexture(), 'textura');
    let bitmapEnviado: ImageBitmap | null = null;
    function enviarRotulo(r: RotuloPronto): boolean {
      if (r.bitmap.width === 0 || r.bitmap.height === 0) return false;
      if (r.bitmap !== bitmapEnviado) {
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, texRotulo);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, r.bitmap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        bitmapEnviado = r.bitmap;
      }
      return true;
    }

    // o rótulo "o Sol · você está aqui", colado ao anel (como o protótipo o punha em DOM)
    function desenharRotulo(r: RotuloPronto, op: number, sol: [number, number], cam: Camera): void {
      if (!enviarRotulo(r)) return;
      // largura e altura da pílula, sem a folga do anel
      const larguraRotulo = r.largura - 2 * FOLGA_ANEL;
      const alturaRotulo = r.altura - 2 * FOLGA_ANEL;
      const a = paraTela(cam.VP, [cam.S[0] + R_ANEL, cam.S[1], 0]);
      const b = paraTela(cam.VP, [cam.S[0], cam.S[1] + R_ANEL, 0]);
      const rpx = Math.max(a ? Math.hypot(a[0] - sol[0], a[1] - sol[1]) : 12, b ? Math.hypot(b[0] - sol[0], b[1] - sol[1]) : 12);
      let x = sol[0] + rpx + 12;
      let y = sol[1];
      let ty = -50;
      if (x + larguraRotulo > cssW - 14 || y > topoBloco - 10) {
        // sem espaço à direita: em cima do anel, preso dentro da tela
        x = Math.min(cssW - 12 - larguraRotulo, Math.max(12, sol[0] - larguraRotulo / 2));
        y = sol[1] - rpx * 0.7 - 10;
        ty = -100;
        if (y - 26 < 64) {
          y = sol[1] + rpx * 0.7 + 10;
          ty = 0;
        }
      }
      // o protótipo dava `translate(x, y)` com uma casa decimal; aqui a caixa vai ao pixel inteiro
      const caixaX = Number(x.toFixed(1));
      const caixaY = Number(y.toFixed(1)) + (ty / 100) * alturaRotulo;
      const esq = Math.round((caixaX - FOLGA_ANEL) * DPR);
      const topo = Math.round((caixaY - FOLGA_ANEL) * DPR);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(pRotulo.p);
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, texRotulo);
      gl.uniform1i(pRotulo.u.uTex, 4);
      gl.uniform4f(pRotulo.u.uRet, esq, topo, r.bitmap.width, r.bitmap.height);
      gl.uniform2f(pRotulo.u.uRes, W, H);
      gl.uniform1f(pRotulo.u.uOp, op);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disable(gl.BLEND);
    }

    function quadro(e: EstadoDaCena): void {
      if (!vivo || !medido || gl.isContextLost()) return;
      const tA = e.reduzido ? e.t / 4 : e.t;
      const s = clamp01(e.suave);
      const f = clamp01(e.fim);

      // coreografia pelo progresso
      const achata = sstep(0.04, 0.55, s);
      const Hn = lerp(0.75, 0.08, achata);
      const Rn = lerp(1.32, 1.18, achata);
      const nuvem = (1 - sstep(0.36, 0.72, s)) * Math.pow(0.75 / Hn, 0.55);
      const enrola = 2.6 * sstep(0.12, 0.7, s);
      const disco = sstep(0.28, 0.72, s);
      const bojo = sstep(0.22, 0.56, s);
      const barra = sstep(0.3, 0.6, s);
      const revela = R_BARRA + (R_REV1 - R_BARRA) * clamp01((s - S_REV0) / (S_REV1 - S_REV0));
      const poeira = sstep(0.36, 0.82, s);
      const hii = sstep(0.5, 0.9, s);
      const gal = 1 - sstep(0.5, 0.95, f);
      const difusa = 1 - sstep(0.3, 0.85, f);
      const chao = 1 - sstep(0.06, 0.45, f);
      const ceu = 1 - 0.65 * sstep(0.3, 0.9, f);
      const angNuvem = 0.035 * tA;
      const cam = camera(s, f, tA, e.reduzido ? 0.3 : 0.03);

      // 1) gás
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboGas);
      gl.viewport(0, 0, GW, GH);
      gl.disable(gl.BLEND);
      gl.useProgram(pGas.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_3D, ruido);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, mapa);
      const u = pGas.u;
      gl.uniform1i(u.uRuido, 0);
      gl.uniform1i(u.uMapa, 1);
      gl.uniformMatrix3fv(u.uCamRot, true, cam.rot3);
      gl.uniform3f(u.uCam, cam.C[0], cam.C[1], cam.C[2]);
      gl.uniform2f(u.uRes, GW, GH);
      gl.uniform2f(u.uTan, cam.tan[0], cam.tan[1]);
      gl.uniform2f(u.uDesloc, 0, cam.dy);
      gl.uniform1f(u.uPsi, cam.psi);
      gl.uniform1f(u.uT, tA);
      gl.uniform1f(u.uOmegaP, OMEGA_P);
      gl.uniform1f(u.uNuvem, nuvem * chao);
      gl.uniform1f(u.uHn, Hn);
      gl.uniform1f(u.uRn, Rn);
      gl.uniform1f(u.uAngNuvem, angNuvem);
      gl.uniform1f(u.uEnrola, enrola);
      gl.uniform1f(u.uDisco, disco);
      gl.uniform1f(u.uBojo, bojo * chao);
      gl.uniform1f(u.uBarra, barra * chao);
      gl.uniform1f(u.uRevela, revela);
      gl.uniform1f(u.uPoeira, poeira);
      gl.uniform1f(u.uHii, hii);
      gl.uniform1f(u.uChao, chao);
      gl.uniform1f(u.uBracos, difusa);
      gl.uniform1f(u.uCod, COD);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 2) estrelas, aditivas num buffer de luz linear, apagadas pela poeira uma a uma
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboEst);
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, texGas);
      gl.useProgram(pEst.p);
      const v = pEst.u;
      gl.uniformMatrix4fv(v.uVP, false, cam.VP);
      gl.uniform3f(v.uCam, cam.C[0], cam.C[1], cam.C[2]);
      gl.uniform1i(v.uGas, 2);
      gl.uniform1f(v.uT, tA);
      gl.uniform1f(v.uS, s);
      gl.uniform1f(v.uPsi0, PSI0);
      gl.uniform1f(v.uOmegaP, OMEGA_P);
      gl.uniform1f(v.uAngNuvem, angNuvem);
      gl.uniform1f(v.uDpr, DPR);
      gl.uniform1f(v.uDref, cam.D);
      gl.uniform1f(v.uGal, gal);
      gl.uniform1f(v.uCeu, ceu);
      gl.uniform1f(v.uFlash, e.reduzido ? 0 : 1);
      gl.uniform1f(v.uMaxPt, Math.min(maxPt, 72 * DPR));
      gl.uniform1f(v.uLocal, sstep(0.08, 0.35, f) * (1 - sstep(0.8, 1, f)));
      gl.uniform1f(v.uCod, COD_EST);
      gl.bindVertexArray(vaoEst);
      gl.drawArrays(gl.POINTS, 0, NPART);
      gl.bindVertexArray(vaoVazio);
      gl.disable(gl.BLEND);

      // 3) tom (gás + estrelas), Sol do desfecho, vinheta e pontilhado
      const sol = paraTela(cam.VP, cam.S);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.useProgram(pTom.p);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, texEst);
      gl.uniform1i(pTom.u.uGas, 2);
      gl.uniform1i(pTom.u.uEst, 3);
      gl.uniform2f(pTom.u.uRes, W, H);
      // o filtro tenda só é preciso enquanto a nuvem (marcha com sorteio) aparece
      const tenda = sstep(0, 0.05, nuvem * chao);
      gl.uniform2f(pTom.u.uPassoGas, tenda / GW, tenda / GH);
      const solI = sstep(0.15, 0.9, f) * 1.1;
      const solR = lerp(10, 0.36 * Math.min(cssW, cssH), sstep(0.15, 1, f)) * DPR;
      gl.uniform2f(pTom.u.uSol, sol ? sol[0] * DPR : -1e4, sol ? (cssH - sol[1]) * DPR : -1e4);
      gl.uniform1f(pTom.u.uSolR, solR);
      gl.uniform1f(pTom.u.uSolI, solI);
      gl.uniform1f(pTom.u.uDecod, 1 / COD);
      gl.uniform1f(pTom.u.uDecodEst, 1 / COD_EST);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 4) anel do Sol
      const marca = sstep(0.9, 0.975, s) * (1 - sstep(0.0, 0.3, f));
      if (marca > 0.002) {
        const ph = (tA / 2.6) % 1;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(pAnel.p);
        gl.uniformMatrix4fv(pAnel.u.uVP, false, cam.VP);
        gl.uniform3f(pAnel.u.uSol, cam.S[0], cam.S[1], 0);
        gl.uniform1f(pAnel.u.uRq, R_ANEL * 2.8);
        gl.uniform1f(pAnel.u.uR1, R_ANEL);
        gl.uniform1f(pAnel.u.uA1, marca * 0.95);
        gl.uniform1f(pAnel.u.uR2, R_ANEL * (1 + 1.5 * ph));
        gl.uniform1f(pAnel.u.uA2, e.reduzido ? 0 : marca * 0.55 * (1 - ph) * (1 - ph));
        gl.uniform1f(pAnel.u.uPonto, marca);
        gl.uniform1f(pAnel.u.uDpr, DPR);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disable(gl.BLEND);
      }

      // 5) o rótulo do Sol, por cima de tudo
      const opRot = Math.round(marca * (1 - sstep(0, 0.12, f)) * 1000) / 1000;
      const rotulo = recursos?.rotulos.get(ID_ROTULO);
      if (opRot > 0 && sol && rotulo) desenharRotulo(rotulo, opRot, sol, cam);
    }

    function soltar(): void {
      vivo = false;
      try {
        for (const p of programas) gl.deleteProgram(p);
        for (const t of [ruido, mapa, texGas, texEst, texRotulo]) if (t) gl.deleteTexture(t);
        for (const fb of [fboAux, fboEst, fboGas]) gl.deleteFramebuffer(fb);
        gl.deleteVertexArray(vaoVazio);
        gl.deleteVertexArray(vaoEst);
        gl.deleteBuffer(buf);
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      } catch (err) {
        console.error(err);
      }
      canvas.width = 1;
      canvas.height = 1;
    }

    return { redimensionar, quadro, soltar };
  },
};
