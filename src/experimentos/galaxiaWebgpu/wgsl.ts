// ============================================================
// ENSAIO WebGPU DA GALÁXIA DE PARTÍCULAS — os programas (WGSL).
//
// Três passos por quadro:
//  1. LUZ (compute, uma vez por partícula-mãe): a luz que a partícula
//     entrega à tela — a lei de fluxo única do ensaio 4 (px²/0,49 em brilho
//     de superfície constante) vezes a extinção pelo caminho, a MESMA conta
//     de GALAXY_VERT no modo só-partículas (16 amostras, camada inteira por
//     diferença de erf, empeno incluído). As filhas herdam a luz da mãe.
//  2. DESENHO, por um de dois caminhos medidos lado a lado:
//     (a) QUADRADOS instanciados no pipeline de render, soma aditiva;
//     (b) DEPÓSITO por compute num acumulador por pixel, com soma atômica
//         em inteiro de ponto fixo e arredondamento sorteado (o fluxo é
//         conservado na média; nada se perde por ser fraco demais).
//     Fundo (disco, espesso, bojo, esporão, halo): a tenda de ±1 px, que é
//     exatamente a interpolação bilinear nos 4 pixels vizinhos. Jovens,
//     aglomerados e nós H II (tipos 3–5): o mesmo ponto nítido, e a
//     gaussiana do tamanho físico quando passam de 2 px.
//  3. TOM: Khronos Neutral (o tom padrão do app) + sRGB, sem bloom.
// ============================================================
import { GALACTIC_MODEL } from '../../three/cartography/galacticModel';

const n = (v: number) => (Number.isInteger(v) ? `${v}.0` : `${v}`);

const COMUM = /* wgsl */ `
struct U {
  viewProj: mat4x4f,
  cam: vec3f, screenH: f32,
  ex: vec3f, tanHalfFov: f32,
  ey: vec3f, ganho: f32,
  ez: vec3f, espLod: f32,
  gc: vec3f, escala: f32,
  dims: vec2f, expo: f32, tetoPx: f32,
  n: u32, k: u32, borrifo: u32, base: u32,
}
struct P { pos: vec3f, r: f32, g: f32, b: f32, size: f32, alpha: f32 }

fn hashU(x0: u32) -> u32 {
  var x = x0;
  x ^= x >> 16u; x *= 0x7feb352du;
  x ^= x >> 15u; x *= 0x846ca68bu;
  x ^= x >> 16u;
  return x;
}
fn u01(x: u32) -> f32 { return f32(hashU(x) >> 8u) * (1.0 / 16777216.0); }
`;

// a filha k da mãe i: o mesmo desvio do ensaio 5 (gaussiana no plano de
// c·√(K−1) espaçamentos da célula, 1/5 de espaçamento na vertical)
const FILHA = /* wgsl */ `
fn posDaFilha(p0: vec3f, i: u32, k: u32, kk: u32, e: f32) -> vec3f {
  if (k == 0u) { return p0; }
  let h = i * 64u + k;
  let r = u.espLod * sqrt(f32(kk) - 1.0) * e * sqrt(-2.0 * log(max(u01(h), 1e-7)));
  let a = 6.2831853 * u01(h + 0x9e3779b9u);
  let vz = (u01(h + 0x3c6ef372u) + u01(h + 0xdaa66d2bu) - 1.0) * 0.2 * e;
  return p0 + u.ex * (r * cos(a)) + u.ey * (r * sin(a)) + u.ez * vz;
}
`;

export const WGSL_LUZ = /* wgsl */ `
${COMUM}
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> maes: array<P>;
@group(0) @binding(2) var<storage, read_write> luz: array<vec4f>;
@group(0) @binding(3) var tauMap: texture_2d<f32>;
@group(0) @binding(4) var tauSamp: sampler;

fn erfAprox(x: f32) -> f32 {
  let a = abs(x);
  let t = 1.0 / (1.0 + 0.3275911 * a);
  let y = 1.0 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t
    - 0.284496736) * t + 0.254829592) * t * exp(-a * a);
  return sign(x) * y;
}
fn empeno(raio: f32, theta: f32) -> f32 {
  let x = clamp((raio - ${n(GALACTIC_MODEL.warpStartPc)}) /
    ${n(GALACTIC_MODEL.diskRadiusPc - GALACTIC_MODEL.warpStartPc)}, 0.0, 1.0);
  return ${n(GALACTIC_MODEL.warpAmplitudePc)} * pow(x, 1.55) * sin(theta - 3.2288591);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3u) {
  // u.base: a fatia das mães que este quadro renova (?fatia=)
  let i = id.x + u.base;
  if (i >= u.n) { return; }
  let p = maes[i];
  // a mãe fora do quadro (com folga para as filhas) não paga a extinção
  let c = u.viewProj * vec4f(p.pos, 1.0);
  if (c.w <= 0.0) { luz[i] = vec4f(0.0); return; }
  let ndc = c.xy / c.w;
  if (abs(ndc.x) > 1.15 || abs(ndc.y) > 1.15) { luz[i] = vec4f(0.0); return; }

  let toCam = u.cam - p.pos;
  let D = length(toCam);
  let dist = max(D, 1.0);
  let tipo = floor(p.size * 0.001);
  let px = (p.size - 1000.0 * tipo) * u.screenH / (2.0 * u.tanHalfFov * dist);
  let pxDep = min(px, u.tetoPx);
  // fluxo total em unidade de cena × pixel: 0,1726 = 0,690376/4, a integral
  // da pegada (tenda ou gaussiana) por px² de largura
  let fluxo = p.alpha * u.ganho * 0.172594 * pxDep * pxDep / 0.49;

  let zP = dot(p.pos - u.gc, u.ez);
  let zC = dot(u.cam - u.gc, u.ez);
  let dz = zC - zP;
  var s0 = 0.0;
  var s1 = 1.0;
  if (abs(dz) > 1e-3) {
    let ta = (-1700.0 - zP) / dz;
    let tb = (1700.0 - zP) / dz;
    s0 = clamp(min(ta, tb), 0.0, 1.0);
    s1 = clamp(max(ta, tb), 0.0, 1.0);
  }
  var tau = 0.0;
  if (s1 > s0) {
    let zMeio = (s1 - s0) * dz * (0.5 / 16.0);
    for (var j = 0; j < 16; j++) {
      let s = s0 + (s1 - s0) * (f32(j) + 0.5) / 16.0;
      let sp = p.pos + toCam * s - u.gc;
      let sxy = vec2f(dot(sp, u.ex), dot(sp, u.ey));
      let rS = length(sxy);
      let fx = clamp((rS - 7500.0) / 9300.0, 0.0, 1.0);
      let sig = 58.0 + fx * fx * 120.0;
      let zTil = dot(sp, u.ez) - empeno(rS, atan2(sxy.y, sxy.x + 1e-7));
      var g = exp(-zTil * zTil / (2.0 * sig * sig));
      if (abs(zMeio) > 0.05 * sig) {
        let ua = (zTil - zMeio) / (1.4142136 * sig);
        let ub = (zTil + zMeio) / (1.4142136 * sig);
        g = 0.5 * (erfAprox(ub) - erfAprox(ua)) / (2.0 * zMeio) * (2.5066283 * sig);
      }
      let tp = textureSampleLevel(tauMap, tauSamp,
        sxy / ${n(2 * GALACTIC_MODEL.diskRadiusPc)} + 0.5, 0.0).r;
      tau += tp * g / (2.5066283 * sig);
    }
  }
  tau *= (s1 - s0) * D / 16.0;
  let chromSat = 1.0 - exp(-tau * 0.5);
  let ext = exp(-tau * mix(vec3f(0.75, 1.0, 1.32), vec3f(1.0), chromSat));

  // w > 2: objeto resolvido maior que a tenda — a gaussiana do tamanho dele
  let resolvido = tipo > 2.5 && tipo < 5.5 && px > 2.0;
  luz[i] = vec4f(vec3f(p.r, p.g, p.b) * ext * fluxo, select(0.0, pxDep, resolvido));
}
`;

export const WGSL_DEPOSITO = /* wgsl */ `
${COMUM}
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> maes: array<P>;
@group(0) @binding(2) var<storage, read> luz: array<vec4f>;
@group(0) @binding(3) var<storage, read> esp: array<f32>;
@group(0) @binding(4) var<storage, read_write> acc: array<atomic<u32>>;
${FILHA}

fn deposita(ix: i32, iy: i32, v: vec3f, semente: u32) {
  let w = i32(u.dims.x);
  if (ix < 0 || iy < 0 || ix >= w || iy >= i32(u.dims.y)) { return; }
  // arredondamento sorteado: floor(v·escala + sorteio) vale v·escala na média
  let q = vec3u(v * u.escala + u01(semente));
  let o = u32(iy * w + ix) * 4u;
  if (q.x > 0u) { atomicAdd(&acc[o], q.x); }
  if (q.y > 0u) { atomicAdd(&acc[o + 1u], q.y); }
  if (q.z > 0u) { atomicAdd(&acc[o + 2u], q.z); }
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= u.n) { return; }
  let l = luz[i];
  if (max(l.x, max(l.y, l.z)) <= 0.0) { return; }
  let e = esp[i];
  let kk = select(1u, u.k, e > 0.0);
  let f = l.xyz / f32(kk);
  let p0 = maes[i].pos;
  for (var k = 0u; k < kk; k++) {
    let c = u.viewProj * vec4f(posDaFilha(p0, i, k, kk, e), 1.0);
    if (c.w <= 0.0) { continue; }
    let sx = (c.x / c.w * 0.5 + 0.5) * u.dims.x - 0.5;
    let sy = (0.5 - c.y / c.w * 0.5) * u.dims.y - 0.5;
    let sem = hashU(i * 64u + k);
    if (l.w > 2.0) {
      let R = 0.5 * l.w;
      let norma = 1.0 / (0.172594 * l.w * l.w);
      let x0 = i32(floor(sx - R));
      let x1 = i32(ceil(sx + R));
      let y0 = i32(floor(sy - R));
      let y1 = i32(ceil(sy + R));
      for (var iy = y0; iy <= y1; iy++) {
        for (var ix = x0; ix <= x1; ix++) {
          let d = vec2f(f32(ix) - sx, f32(iy) - sy) / R;
          let r2 = dot(d, d);
          if (r2 > 1.0) { continue; }
          deposita(ix, iy, f * (exp(-4.5 * r2) * norma), sem + u32(ix * 7919 + iy));
        }
      }
    } else {
      let fx0 = floor(sx);
      let fy0 = floor(sy);
      let ax = sx - fx0;
      let ay = sy - fy0;
      let x0 = i32(fx0);
      let y0 = i32(fy0);
      if (u.borrifo == 1u) {
        // BORRIFO: a luz inteira num só dos 4 pixels, sorteado com o peso
        // bilinear — a mesma tenda na média, com 1/4 das somas atômicas
        let dx = select(0, 1, u01(sem + 5u) < ax);
        let dy = select(0, 1, u01(sem + 6u) < ay);
        deposita(x0 + dx, y0 + dy, f, sem);
      } else {
        deposita(x0, y0, f * ((1.0 - ax) * (1.0 - ay)), sem);
        deposita(x0 + 1, y0, f * (ax * (1.0 - ay)), sem + 1u);
        deposita(x0, y0 + 1, f * ((1.0 - ax) * ay), sem + 2u);
        deposita(x0 + 1, y0 + 1, f * (ax * ay), sem + 3u);
      }
    }
  }
}
`;

export const WGSL_QUADRADOS = /* wgsl */ `
${COMUM}
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> maes: array<P>;
@group(0) @binding(2) var<storage, read> luz: array<vec4f>;
@group(0) @binding(3) var<storage, read> esp: array<f32>;
${FILHA}

struct V {
  @builtin(position) pos: vec4f,
  @location(0) cor: vec3f,
  @location(1) uv: vec2f,
  @location(2) @interpolate(flat) larg: f32,
}

@vertex
fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) inst: u32) -> V {
  var o: V;
  o.pos = vec4f(2.0, 2.0, 2.0, 1.0);
  o.cor = vec3f(0.0);
  o.uv = vec2f(0.0);
  o.larg = 0.0;
  let i = inst / u.k;
  let k = inst % u.k;
  let l = luz[i];
  let e = esp[i];
  if (max(l.x, max(l.y, l.z)) <= 0.0 || (k > 0u && e <= 0.0)) { return o; }
  let kk = select(1u, u.k, e > 0.0);
  let c = u.viewProj * vec4f(posDaFilha(maes[i].pos, i, k, kk, e), 1.0);
  if (c.w <= 0.0) { return o; }
  let larg = max(l.w, 2.0);
  let canto = vec2f(f32(vi & 1u), f32(vi >> 1u)) * 2.0 - 1.0;
  o.pos = vec4f(c.xy + canto * (larg / u.dims) * c.w, 0.5 * c.w, c.w);
  o.cor = l.xyz / f32(kk);
  o.uv = canto;
  o.larg = l.w;
  return o;
}

@fragment
fn fs(v: V) -> @location(0) vec4f {
  var w = max(1.0 - abs(v.uv.x), 0.0) * max(1.0 - abs(v.uv.y), 0.0);
  if (v.larg > 2.0) {
    let r2 = dot(v.uv, v.uv);
    if (r2 > 1.0) { discard; }
    w = exp(-4.5 * r2) / (0.172594 * v.larg * v.larg);
  }
  return vec4f(v.cor * w, 1.0);
}
`;

const TOM = /* wgsl */ `
struct VT { @builtin(position) pos: vec4f }
@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VT {
  var o: VT;
  o.pos = vec4f(f32(vi & 1u) * 4.0 - 1.0, f32(vi >> 1u) * 4.0 - 1.0, 0.0, 1.0);
  return o;
}
// Khronos PBR Neutral, o operador do tom padrão do app (THREE.NeutralToneMapping)
fn neutro(c0: vec3f) -> vec3f {
  var c = c0;
  let x = min(c.x, min(c.y, c.z));
  let off = select(0.04, x - 6.25 * x * x, x < 0.08);
  c -= vec3f(off);
  let pico = max(c.x, max(c.y, c.z));
  if (pico < 0.76) { return c; }
  let d = 0.24;
  let novo = 1.0 - d * d / (pico + d - 0.76);
  c *= novo / pico;
  let g = 1.0 - 1.0 / (0.15 * (pico - novo) + 1.0);
  return mix(c, vec3f(novo), g);
}
fn tela(linear: vec3f) -> vec4f {
  let c = clamp(neutro(linear * u.expo), vec3f(0.0), vec3f(1.0));
  let s = select(1.055 * pow(c, vec3f(1.0 / 2.4)) - 0.055, 12.92 * c, c <= vec3f(0.0031308));
  return vec4f(s, 1.0);
}
`;

export const WGSL_TOM_DO_ACUMULADOR = /* wgsl */ `
${COMUM}
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> acc: array<u32>;
${TOM}
@fragment
fn fs(v: VT) -> @location(0) vec4f {
  let o = (u32(v.pos.y) * u32(u.dims.x) + u32(v.pos.x)) * 4u;
  return tela(vec3f(f32(acc[o]), f32(acc[o + 1u]), f32(acc[o + 2u])) / u.escala);
}
`;

export const WGSL_TOM_DA_TEXTURA = /* wgsl */ `
${COMUM}
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var soma: texture_2d<f32>;
${TOM}
@fragment
fn fs(v: VT) -> @location(0) vec4f {
  return tela(textureLoad(soma, vec2i(v.pos.xy), 0).xyz);
}
`;
