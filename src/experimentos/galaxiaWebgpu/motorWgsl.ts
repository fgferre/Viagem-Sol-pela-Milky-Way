// ============================================================
// A GALÁXIA DE PARTÍCULAS EM WebGPU — os programas (WGSL).
//
// Três passos por quadro:
//  1. EXTINÇÃO (compute): a fração da luz de cada partícula que atravessa a
//     poeira até a câmera — a MESMA conta de GALAXY_VERT no modo
//     só-partículas (16 amostras, camada inteira por diferença de erf,
//     empeno incluído). Muda devagar com a câmera: cada quadro renova uma
//     fatia das partículas e as outras usam o valor guardado (4 bytes).
//  2. DEPÓSITO (compute): cada partícula soma a sua luz num acumulador por
//     pixel, com soma atômica em inteiro de ponto fixo e arredondamento
//     sorteado pela partícula (nunca pelo quadro: câmera parada, imagem
//     idêntica). A lei de fluxo é a do ensaio 4 (px²/0,49, brilho de
//     superfície constante). Fundo: a tenda de ±1 px, que é a interpolação
//     bilinear nos 4 pixels vizinhos — contínua quando a partícula anda.
//     Jovens, aglomerados e nós H II (tipos 3–5) acima de 2 px: a gaussiana
//     do tamanho físico.
//  3. TOM (render): filtro [1 2 1]² opcional, Khronos Neutral e sRGB.
//
// A partícula ocupa 20 bytes: posição (3 × f32), tamanho com o tipo no
// milhar (f32) e a cor já multiplicada pelo alpha em rgb9e5 (u32).
// ============================================================
import { GALACTIC_MODEL } from '../../three/cartography/galacticModel';

const n = (v: number) => (Number.isInteger(v) ? `${v}.0` : `${v}`);

/** bytes do bloco de uniformes */
export const BYTES_DOS_UNIFORMES = 208;

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
  filtro: u32, linha: u32, pesoDasCelulas: f32, alfa: f32,
  fundo: f32, pesoParcial: f32, nCheio: u32, nTotal: u32,
}
struct P { x: f32, y: f32, z: f32, tam: f32, cor: u32 }

fn hashU(x0: u32) -> u32 {
  var x = x0;
  x ^= x >> 16u; x *= 0x7feb352du;
  x ^= x >> 15u; x *= 0x846ca68bu;
  x ^= x >> 16u;
  return x;
}
fn u01(x: u32) -> f32 { return f32(hashU(x) >> 8u) * (1.0 / 16777216.0); }
`;

export const WGSL_EXTINCAO = /* wgsl */ `
${COMUM}
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> ps: array<P>;
@group(0) @binding(2) var<storage, read_write> ext: array<u32>;
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
  let i = id.x + id.y * u.linha + u.base;
  if (i >= u.nTotal) { return; }
  let pos = vec3f(ps[i].x, ps[i].y, ps[i].z);
  let toCam = u.cam - pos;
  let D = length(toCam);
  let zP = dot(pos - u.gc, u.ez);
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
      let sp = pos + toCam * s - u.gc;
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
  let e = exp(-tau * mix(vec3f(0.75, 1.0, 1.32), vec3f(1.0), chromSat));
  // guardada como raiz em 10 bits por canal: o passo perto do zero é 1e-6
  let q = vec3u(round(sqrt(e) * 1023.0));
  ext[i] = q.x | (q.y << 10u) | (q.z << 20u);
}
`;

export const WGSL_DEPOSITO = /* wgsl */ `
${COMUM}
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> ps: array<P>;
@group(0) @binding(2) var<storage, read> ext: array<u32>;
@group(0) @binding(3) var<storage, read> esp: array<f32>;
@group(0) @binding(4) var<storage, read_write> acc: array<atomic<u32>>;

// a filha k da partícula i: o desvio do ensaio 5 (gaussiana no plano de
// c·√(K−1) espaçamentos da célula, 1/5 de espaçamento na vertical)
fn posDaFilha(p0: vec3f, i: u32, k: u32, kk: u32, e: f32) -> vec3f {
  if (k == 0u) { return p0; }
  let h = i * 64u + k;
  let r = u.espLod * sqrt(f32(kk) - 1.0) * e * sqrt(-2.0 * log(max(u01(h), 1e-7)));
  let a = 6.2831853 * u01(h + 0x9e3779b9u);
  let vz = (u01(h + 0x3c6ef372u) + u01(h + 0xdaa66d2bu) - 1.0) * 0.2 * e;
  return p0 + u.ex * (r * cos(a)) + u.ey * (r * sin(a)) + u.ez * vz;
}

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
  let i = id.x + id.y * u.linha;
  if (i >= u.n) { return; }
  let p = ps[i];
  let p0 = vec3f(p.x, p.y, p.z);
  let c0 = u.viewProj * vec4f(p0, 1.0);
  if (c0.w <= 0.0) { return; }
  // fora do quadro, com folga para as filhas e para a pegada
  let fora = abs(c0.xy) - 1.15 * c0.w;
  if (fora.x > 0.0 || fora.y > 0.0) { return; }

  let tipo = floor(p.tam * 0.001);
  let dist = max(length(u.cam - p0), 1.0);
  let px = (p.tam - 1000.0 * tipo) * u.screenH / (2.0 * u.tanHalfFov * dist);
  let pxDep = min(px, u.tetoPx);
  // indivíduos (estrela jovem, nó H II, aglomerado, halo, núcleo) valem
  // inteiros; as populações contínuas dividem a luz pelos sorteios
  let individuo = (tipo > 2.5 && tipo < 6.5) || tipo > 7.5;
  // nível de detalhe por sorteio: os sorteios cheios pesam 1/s cada e o
  // último entra aos poucos (pesoParcial), sem salto
  let peso = select(select(u.pesoParcial, u.pesoDasCelulas, i < u.nCheio), 1.0, individuo);
  // fluxo total em unidade de cena × pixel: 0,1726 = 0,690376/4, a integral
  // da pegada (tenda ou gaussiana) por px² de largura
  let fluxo = peso * u.ganho * 0.172594 * pxDep * pxDep / 0.49;
  // a cor em rgb9e5, já vezes o alpha da partícula
  let escalaDaCor = exp2(f32(p.cor >> 27u) - 24.0);
  let cor = vec3f(f32(p.cor & 511u), f32((p.cor >> 9u) & 511u), f32((p.cor >> 18u) & 511u)) * escalaDaCor;
  let eq = ext[i];
  let er = vec3f(f32(eq & 1023u), f32((eq >> 10u) & 1023u), f32((eq >> 20u) & 1023u)) / 1023.0;
  let e = esp[i];
  let kk = select(1u, u.k, e > 0.0);
  let f = cor * (er * er) * (fluxo / f32(kk));
  if (max(f.x, max(f.y, f.z)) <= 0.0) { return; }
  // objeto resolvido maior que a tenda: a gaussiana do tamanho dele
  let larg = select(0.0, pxDep, tipo > 2.5 && tipo < 5.5 && px > 2.0);

  for (var k = 0u; k < kk; k++) {
    var c = c0;
    if (k > 0u) {
      c = u.viewProj * vec4f(posDaFilha(p0, i, k, kk, e * sqrt(u.pesoDasCelulas)), 1.0);
      if (c.w <= 0.0) { continue; }
    }
    let sx = (c.x / c.w * 0.5 + 0.5) * u.dims.x - 0.5;
    let sy = (0.5 - c.y / c.w * 0.5) * u.dims.y - 0.5;
    let sem = hashU(i * 64u + k);
    if (larg > 2.0) {
      let R = 0.5 * larg;
      let norma = 1.0 / (0.172594 * larg * larg);
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
        // bilinear — 1/4 das somas atômicas, mas a partícula salta de pixel
        // quando anda (ferve em movimento)
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

export const WGSL_TOM = /* wgsl */ `
${COMUM}
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> acc: array<u32>;

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
fn ler(p: vec2i) -> vec3f {
  let q = clamp(p, vec2i(0), vec2i(u.dims) - 1);
  let o = u32(q.y * i32(u.dims.x) + q.x) * 4u;
  return vec3f(f32(acc[o]), f32(acc[o + 1u]), f32(acc[o + 2u])) / u.escala;
}
@fragment
fn fs(v: VT) -> @location(0) vec4f {
  let p = vec2i(v.pos.xy);
  var s = ler(p);
  // filtro [1 2 1]²: conserva o fluxo, alarga a pegada em ~1 px e corta à
  // metade o grão fino (e com ele o que muda de um quadro ao seguinte)
  if (u.filtro == 1u) {
    s = vec3f(0.0);
    for (var j = -1; j <= 1; j++) {
      for (var i = -1; i <= 1; i++) {
        s += ler(p + vec2i(i, j)) * f32((2 - abs(i)) * (2 - abs(j)));
      }
    }
    s /= 16.0;
  }
  let c = clamp(neutro(s * u.expo), vec3f(0.0), vec3f(1.0));
  let t = select(1.055 * pow(c, vec3f(1.0 / 2.4)) - 0.055, 12.92 * c, c <= vec3f(0.0031308));
  return vec4f(t, 1.0);
}
`;
