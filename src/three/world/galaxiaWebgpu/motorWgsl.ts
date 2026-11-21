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
//     A população esparsa (espaçamento na tela > 4 px) alarga a tenda até
//     encostar nas vizinhas, com a mesma luz (A PEGADA DO ESPAÇAMENTO); a
//     pegada mais larga que 2 px vai a acumuladores de 1/2 … 1/32 da
//     resolução, que a DOBRA (compute) junta no de 1/2 antes do tom.
//     Jovens, aglomerados e nós H II (tipos 3–5) acima de 2 px: a gaussiana
//     do tamanho físico.
//  3. TOM (render): filtro [1 2 1]² opcional e, na página de teste, Khronos
//     Neutral e sRGB; para o app a saída é linear (rgba16float) e é o app
//     quem aplica brilho e tom.
//
// A partícula ocupa 20 bytes: posição (3 × f32), tamanho com o tipo no
// milhar (f32) e a cor já multiplicada pelo alpha em rgb9e5 (u32); à parte,
// 4 bytes com o espaçamento e a espessura da célula dela (motor.ts).
// ============================================================
import { GALACTIC_MODEL } from '../../cartography/galacticModel';
import { GLSL_UNRESOLVED } from '../wrappedStars';
import { POEIRA_ATOMICA } from '../../shaders/galaxyShaders';

const n = (v: number) => (Number.isInteger(v) ? `${v}.0` : `${v}`);

/** bytes do bloco de uniformes */
export const BYTES_DOS_UNIFORMES = 224;

/** níveis de resolução reduzida da pegada do espaçamento (1/2 … 1/32) */
export const NIVEIS = 5;

// a fração da luz que as cascas de estrelas do app NÃO resolvem a esta
// distância (1,0 além de ~5 kpc): o mesmo polinômio, em WGSL
const WGSL_UNRESOLVED = GLSL_UNRESOLVED.replace('float unresolved(float d) {', 'fn unresolved(d: f32) -> f32 {');

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
  linear: f32, pesoParcial: f32, nCheio: u32, nTotal: u32,
  pesoFixo: f32, pesoPerto: f32, rhoAlvo: f32, livre1: f32,
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
// OS NÍVEIS DA PEGADA: depois do acumulador do quadro, ${NIVEIS} acumuladores de
// 1/2, 1/4… da resolução (motor.ts, redimensionar); o nível L tem
// (w >> L) + 2 por (h >> L) + 2 pixels. Devolve largura, altura e início (u32)
fn nivel(L: u32) -> vec3u {
  var o = u32(u.dims.x) * u32(u.dims.y) * 4u;
  for (var j = 1u; j < L; j++) { o += ((u32(u.dims.x) >> j) + 2u) * ((u32(u.dims.y) >> j) + 2u) * 4u; }
  return vec3u((u32(u.dims.x) >> L) + 2u, (u32(u.dims.y) >> L) + 2u, o);
}
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
// a camada espessa do gás atômico: a poeiraAtomica do GLSL (galaxyShaders.ts),
// aqui sempre com a camada inteira
fn poeiraAtomica(z: f32, zMeio: f32, r: f32) -> f32 {
  let h = ${n(POEIRA_ATOMICA.h0Pc)} + ${n(POEIRA_ATOMICA.flarePcPorPc)} * max(r - ${n(POEIRA_ATOMICA.inicioPc)}, 0.0);
  if (abs(zMeio) > 0.05 * h) {
    let ea = exp(-2.0 * abs(z - zMeio) / h);
    let eb = exp(-2.0 * abs(z + zMeio) / h);
    let ta = sign(z - zMeio) * (1.0 - ea) / (1.0 + ea);
    let tb = sign(z + zMeio) * (1.0 - eb) / (1.0 + eb);
    return 0.5 * (tb - ta) / (2.0 * zMeio);
  }
  let e = exp(-2.0 * abs(z) / h);
  return 2.0 * e / ((1.0 + e) * (1.0 + e)) / h;
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
        sxy / ${n(2 * GALACTIC_MODEL.diskRadiusPc)} + 0.5, 0.0).rg;
      tau += tp.x * g / (2.5066283 * sig) + tp.y * poeiraAtomica(zTil, zMeio, rS);
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
@group(0) @binding(3) var<storage, read> esp: array<u32>;
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

${WGSL_UNRESOLVED}
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
// a tenda de ±1 pixel do nível L (bilinear), na luz inteira: o passo do tom
// divide o nível por 4^L ao ampliá-lo
fn depositaNoNivel(L: u32, sx: f32, sy: f32, v: vec3f, semente: u32) {
  let nv = nivel(L);
  let esc = 1.0 / f32(1u << L);
  let lx = (sx + 0.5) * esc - 0.5;
  let ly = (sy + 0.5) * esc - 0.5;
  let fx0 = floor(lx);
  let fy0 = floor(ly);
  let ax = lx - fx0;
  let ay = ly - fy0;
  for (var j = 0u; j < 4u; j++) {
    let dx = i32(j & 1u);
    let dy = i32(j >> 1u);
    let ix = i32(fx0) + dx;
    let iy = i32(fy0) + dy;
    if (ix < 0 || iy < 0 || ix >= i32(nv.x) || iy >= i32(nv.y)) { continue; }
    let pw = select(1.0 - ax, ax, dx == 1) * select(1.0 - ay, ay, dy == 1);
    let q = vec3u(v * (pw * u.escala) + u01(semente + j));
    let o = nv.z + u32(iy * i32(nv.x) + ix) * 4u;
    if (q.x > 0u) { atomicAdd(&acc[o], q.x); }
    if (q.y > 0u) { atomicAdd(&acc[o + 1u], q.y); }
    if (q.z > 0u) { atomicAdd(&acc[o + 2u], q.z); }
  }
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
  // A CESSÃO (galaxy.ts): a lei de perto (< ~1,5 kpc da câmera) é do WebGL
  // até o fim da subida; aqui só a parte de longe de cada partícula
  let cessao = u.pesoFixo + u.pesoPerto * smoothstep(300.0, 1500.0, dist);
  if (cessao <= 0.0) { return; }
  let px =(p.tam - 1000.0 * tipo) * u.screenH / (2.0 * u.tanHalfFov * dist);
  let pxDep = min(px, u.tetoPx);
  // indivíduos (estrela jovem, nó H II, aglomerado, halo, núcleo) valem
  // inteiros; as populações contínuas dividem a luz pelos sorteios
  let individuo = (tipo > 2.5 && tipo < 6.5) || tipo > 7.5;
  // nível de detalhe por sorteio: os sorteios cheios pesam 1/s cada e o
  // último entra aos poucos (pesoParcial), sem salto
  let peso = select(select(u.pesoParcial, u.pesoDasCelulas, i < u.nCheio), 1.0, individuo);
  // fluxo total em unidade de cena × pixel: 0,1726 = 0,690376/4, a integral
  // da pegada (tenda ou gaussiana) por px² de largura
  let fluxo = cessao * peso * u.ganho * unresolved(dist) * 0.172594 * pxDep * pxDep / 0.49;
  // a cor em rgb9e5, já vezes o alpha da partícula
  let escalaDaCor = exp2(f32(p.cor >> 27u) - 24.0);
  let cor = vec3f(f32(p.cor & 511u), f32((p.cor >> 9u) & 511u), f32((p.cor >> 18u) & 511u)) * escalaDaCor;
  let eq = ext[i];
  let er = vec3f(f32(eq & 1023u), f32((eq >> 10u) & 1023u), f32((eq >> 20u) & 1023u)) / 1023.0;
  // espaçamento (pc) e razão de espessura da célula (motor.ts, empacotarSorteio)
  let et = unpack2x16float(esp[i]);
  let e = et.x;
  let kk = select(1u, u.k, e > 0.0);
  let f = cor * (er * er) * (fluxo / f32(kk));
  if (max(f.x, max(f.y, f.z)) <= 0.0) { return; }
  // objeto resolvido maior que a tenda: a gaussiana do tamanho dele, que
  // nasce da tenda entre 2 e 4 px pela rampa do WebGL (tendaB em
  // galaxyShaders.ts, mesma escala). Em 2 px a tenda × 0,690376 × norma é
  // a bilinear de baixo: sem estalo no limiar
  let larg = select(0.0, pxDep, tipo > 2.5 && tipo < 5.5 && px > 2.0);
  let tB = 1.0 - smoothstep(2.0, 4.0, px);
  // A PEGADA DO ESPAÇAMENTO: a população contínua esparsa (o alto do bojo e
  // do disco espesso, vistos de ~1 kpc acima do plano na saída do filme)
  // espalha a luz numa tenda que cresce com o espaçamento entre vizinhas
  // projetado na tela — o princípio do núcleo do WebGL (galaxyShaders.ts) —
  // em vez de virar um ponto solto de 2 px (a areia da saída). O espaçamento:
  // o da célula (esp), ÷ √ dos sorteios e das filhas desenhados, × √ da área
  // projetada da coluna, μ + t·√(1−μ²) com t a razão de espessura (a conta do
  // nível de detalhe do WebGL: de perfil, a coluna alta se espalha pela
  // altura dela). Até 4 px de espaçamento a tenda é a de ±1 px de sempre, bit
  // a bit: o disco visto de fora (< 2 px) e o tapete do disco logo abaixo da
  // câmera (2–4 px), o grão nítido aprovado; a partir daí ela cresce √ρ vezes
  // mais depressa que o espaçamento (ρ = as partículas por pixel do nível de
  // detalhe), para cobrir ~ρ vizinhas: o grão do disco visto de fora.
  let pcPorPx = 2.0 * u.tanHalfFov * dist / u.screenH;
  let muE = abs(dot(p0 - u.cam, u.ez)) / dist;
  let proj = max(muE + et.y * sqrt(max(1.0 - muE * muE, 0.0)), 1e-3);
  let espPx = e * sqrt(u.pesoDasCelulas * proj / f32(kk)) / pcPorPx;
  let meia = min(1.0 + sqrt(u.rhoAlvo) * max(espPx - 4.0, 0.0), 0.5 * u.tetoPx);

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
          // a gaussiana para no círculo; a tenda vai aos cantos do quadrado
          let g = select(exp(-4.5 * r2), 0.0, r2 > 1.0);
          let tenda = max(1.0 - abs(d.x), 0.0) * max(1.0 - abs(d.y), 0.0);
          let w = mix(g, tenda * 0.690376, tB);
          if (w <= 0.0) { continue; }
          deposita(ix, iy, f * (w * norma), sem + u32(ix * 7919 + iy));
        }
      }
    } else if (meia > 1.0) {
      // A PEGADA LARGA. Até 2 px de meia largura, a tenda inteira no quadro,
      // normalizada pela soma dos pesos amostrados (a luz é exatamente f; em
      // meia → 1 ela é a bilinear abaixo, sem salto). Mais larga, nos NÍVEIS
      // de resolução reduzida: a tenda de ±1 pixel do nível L, ampliada pela
      // bilinear no passo do tom, tem a largura (variância) da tenda de meia
      // largura 2^L·√2 px do quadro; entre dois níveis a luz se divide pelo
      // log da largura. Até 16 somas por partícula em vez das (2·meia)² da
      // tenda inteira (1600 em 20 px).
      let lg = log2(meia);
      let lv = min(select(lg - 0.5, max(lg - 1.0, 0.0) * 2.0, lg < 1.5), f32(${NIVEIS}));
      let L = u32(floor(lv));
      let fr = lv - f32(L);
      if (L == 0u) {
        let m = min(meia, 2.0);
        let x0 = i32(ceil(sx - m));
        let x1 = i32(floor(sx + m));
        let y0 = i32(ceil(sy - m));
        let y1 = i32(floor(sy + m));
        var sxw = 0.0;
        for (var ix = x0; ix <= x1; ix++) { sxw += max(1.0 - abs(f32(ix) - sx) / m, 0.0); }
        var syw = 0.0;
        for (var iy = y0; iy <= y1; iy++) { syw += max(1.0 - abs(f32(iy) - sy) / m, 0.0); }
        let fn0 = f * ((1.0 - fr) / max(sxw * syw, 1e-6));
        for (var iy = y0; iy <= y1; iy++) {
          let wy = max(1.0 - abs(f32(iy) - sy) / m, 0.0);
          if (wy <= 0.0) { continue; }
          for (var ix = x0; ix <= x1; ix++) {
            let wx = max(1.0 - abs(f32(ix) - sx) / m, 0.0);
            if (wx <= 0.0) { continue; }
            deposita(ix, iy, fn0 * (wx * wy), sem + u32(ix * 7919 + iy));
          }
        }
      } else {
        depositaNoNivel(L, sx, sy, f * (1.0 - fr), sem);
      }
      if (fr > 0.0 && L < ${NIVEIS}u) { depositaNoNivel(L + 1u, sx, sy, f * fr, sem + 4u); }
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

/**
 * A DOBRA DOS NÍVEIS (compute, depois do depósito): do mais grosso ao nível 1,
 * cada nível soma o de baixo ampliado pela bilinear (÷ 4: a luz se conserva).
 * O tom lê só o nível 1. Um despacho por nível; o nível alvo vem em `alvo`.
 */
export const WGSL_DOBRA = /* wgsl */ `
${COMUM}
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read_write> acc: array<atomic<u32>>;
@group(0) @binding(2) var<uniform> alvo: vec4u;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let nv = nivel(alvo.x);
  if (id.x >= nv.x || id.y >= nv.y) { return; }
  let nc = nivel(alvo.x + 1u);
  let l = (vec2f(id.xy) + 0.5) * 0.5 - 0.5;
  let b = vec2i(floor(l));
  let a = l - floor(l);
  var t = vec3f(0.0);
  for (var j = 0; j < 4; j++) {
    let d = vec2i(j & 1, j >> 1);
    let q = clamp(b + d, vec2i(0), vec2i(nc.xy) - 1);
    let o = nc.z + u32(q.y * i32(nc.x) + q.x) * 4u;
    let pw = select(1.0 - a.x, a.x, d.x == 1) * select(1.0 - a.y, a.y, d.y == 1);
    t += vec3f(f32(atomicLoad(&acc[o])), f32(atomicLoad(&acc[o + 1u])), f32(atomicLoad(&acc[o + 2u]))) * pw;
  }
  let q = vec3u(t * 0.25 + 0.5);
  let o = nv.z + (id.y * nv.x + id.x) * 4u;
  if (q.x > 0u) { atomicAdd(&acc[o], q.x); }
  if (q.y > 0u) { atomicAdd(&acc[o + 1u], q.y); }
  if (q.z > 0u) { atomicAdd(&acc[o + 2u], q.z); }
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
  // os níveis da pegada, já dobrados no nível 1 (WGSL_DOBRA), ampliados
  // pela bilinear: ÷ 4, porque cada pixel do nível 1 se espalha por 4 do
  // quadro e a luz se conserva
  {
    let nv = nivel(1u);
    let l = v.pos.xy * 0.5 - 0.5;
    let b = vec2i(floor(l));
    let a = l - floor(l);
    var t = vec3f(0.0);
    for (var j = 0; j < 4; j++) {
      let d = vec2i(j & 1, j >> 1);
      let q = clamp(b + d, vec2i(0), vec2i(nv.xy) - 1);
      let o = nv.z + u32(q.y * i32(nv.x) + q.x) * 4u;
      let pw = select(1.0 - a.x, a.x, d.x == 1) * select(1.0 - a.y, a.y, d.y == 1);
      t += vec3f(f32(acc[o]), f32(acc[o + 1u]), f32(acc[o + 2u])) * pw;
    }
    s += t * (0.25 / u.escala);
  }
  // saída linear (o app aplica o próprio brilho e o próprio tom)
  if (u.linear > 0.5) { return vec4f(s, 1.0); }
  let c = clamp(neutro(s * u.expo), vec3f(0.0), vec3f(1.0));
  let t = select(1.055 * pow(c, vec3f(1.0 / 2.4)) - 0.055, 12.92 * c, c <= vec3f(0.0031308));
  return vec4f(t, 1.0);
}
`;
