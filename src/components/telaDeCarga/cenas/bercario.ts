// Tela de carga "Berçário de estrelas": uma nuvem onde estrelas nascem, no
// espírito das "Escarpas Cósmicas" de Carina (JWST) e dos Pilares da
// Criação. Escarpas de poeira ocre e ferrugem embaixo, gás ionizado azul
// e turquesa em cima, bordas que brilham onde a luz das estrelas jovens
// corrói a nuvem, vapor subindo das cristas. O progresso é a nuvem se
// acendendo e as estrelas que nascem dentro dela: cada nascimento aquece
// a poeira em volta e abre aos poucos uma pequena cavidade; as mais
// brilhantes ganham os raios de difração do JWST (6 grandes + 2 finos).
// No desfecho a câmera atravessa as camadas, que se abrem em volta, e
// sobra o espaço calmo com uma única estrela dourada no centro.
//
// Três passos por quadro: a nebulosa num buffer de resolução reduzida
// (fbm de ruído 3D pré-assado, com o domínio torcido, em 5 camadas com
// paralaxe), a ampliação com pontilhado para a tela, e por cima, em
// resolução cheia, as estrelas de fundo (pontos) e as recém-nascidas
// (quadros com o brilho e os raios). Tudo é função de (t, suave, fim).
//
// O TEXTO NÃO É DESTA CENA. Esta cena só desenha no canvas (cena.ts); o
// protótipo punha o texto por cima, e o hospedeiro o refaz em HTML assim:
//   TÍTULO "Mar de Estrelas" (Fraunces 300, espaçamento 0,01 em, linha 1,0,
//   text-wrap balance, sombra 0 0 34px rgba(2,4,10,.75) + 0 1px 3px
//   rgba(2,4,10,.6)). A cena escurece a nuvem atrás dele (`uTit`), então ele
//   precisa cair onde o protótipo o pôs:
//   PAISAGEM (largura/altura ≥ 0,8): à esquerda, left 7,5 vw, top 15 vh,
//   corpo clamp(3 rem, 6 vw, 6,2 rem), max-width 6,2 em — a 1440×900, y = 135
//   px. A sombra da cena cobre a caixa de 6,2 em × 2 linhas (o protótipo a
//   media com a fonte reserva, que sempre quebra em duas).
//   RETRATO (largura/altura < 0,8): centrado na largura toda (left 0,
//   right 0), top 11 vh + safe-area de cima, corpo clamp(2,5 rem, 12,5 vw,
//   3,4 rem), uma linha — a 390×844, y ≈ 93 px.
//   PÉ (frase da etapa em Inter 0,8125 rem + porcentagem "NN %" em Inter
//   0,6875 rem, caixa-alta, espaçamento 0,14 em, tabular, mín. 3,2 em, as
//   duas com sombra escura 0 0 10–12px; linha flex alinhada na base, vão
//   14 px, nowrap): PAISAGEM em left 7,5 vw, bottom 6,5 vh; RETRATO centrado
//   (left 0, right 0), bottom 4,5 vh + safe-area de baixo, frase centrada.
//   A frase troca com fusão de 0,9 s; o pé todo some com a opacidade
//   1 − smoothstep(0, 0,3, fim) (transição de 0,6 s); o título fica.
//   A porcentagem é floor(suave × 100).
import type { Cena, DefinicaoDaCena, EstadoDaCena } from '../cena';

type Camada = 1 | 2 | 3;
type Quatro = [number, number, number, number];

interface Horizonte {
  b: number;
  tilt: number;
  A: Quatro;
  F: Quatro;
  P: Quatro;
}

/** uma estrela que nasce: o sorteio fixo (semente) e, depois, o lugar no mundo */
interface Estrela {
  limiar: number;
  grande: boolean;
  exposta: boolean;
  u: number;
  v: number;
  prof: number;
  brilho: number;
  tam: number;
  forca: number;
  temp: number;
  x: number;
  y: number;
  camada: Camada;
}

interface Programa {
  p: WebGLProgram;
  u: Record<string, WebGLUniformLocation | null>;
}

const NS = 28; // estrelas que nascem
const PROF = [7.0, 3.2, 2.2, 1.5, 1.0]; // profundidade: fundo, longe, meio, perto, frente
const VENTO = [0.03, 0.05, 0.07, 0.1, 0.16]; // amplitude da deriva lenta de cada camada
const FASE_VENTO = [0.3, 1.7, 0.9, 2.6, 4.1];
const PIX_NEBULOSA = 600000; // teto de pixels do passo caro

const ATRIBUTOS: WebGLContextAttributes = {
  antialias: false,
  alpha: false,
  depth: false,
  stencil: false,
  premultipliedAlpha: false,
  powerPreference: 'high-performance',
};

// Silhueta das escarpas de cada camada: dois senos suaves e dois picos
// agudos (0,55 − |sen|). O mesmo número serve ao shader e ao JS, que
// precisa saber onde fica a crista para pôr as estrelas dentro da poeira.
const HORIZ: Record<Camada, Horizonte> = {
  1: { b: 0.13, tilt: -0.04, A: [0.06, 0.03, 0.08, 0.035], F: [1.5, 4.3, 2.7, 6.7], P: [2.2, 0.3, 1.1, 4.0] },
  2: { b: -0.07, tilt: 0.11, A: [0.05, 0.03, 0.15, 0.05], F: [2.1, 4.9, 3.3, 8.9], P: [0.5, 2.0, 0.25, 1.3] },
  3: { b: -0.31, tilt: -0.09, A: [0.05, 0.035, 0.14, 0.05], F: [1.9, 4.6, 2.8, 7.6], P: [3.1, 1.2, 2.4, 0.6] },
};
function horiz(c: Horizonte, x: number): number {
  return (
    c.b +
    c.tilt * x +
    c.A[0] * Math.sin(c.F[0] * x + c.P[0]) +
    c.A[1] * Math.sin(c.F[1] * x + c.P[1]) +
    c.A[2] * (0.55 - Math.abs(Math.sin(c.F[2] * x + c.P[2]))) +
    c.A[3] * (0.55 - Math.abs(Math.sin(c.F[3] * x + c.P[3])))
  );
}
const n = (v: number): string => (Number.isInteger(v) ? v.toFixed(1) : String(v));
const glslHoriz = (c: Horizonte, nome: string): string =>
  `float ${nome}(float x) { return ${n(c.b)} + ${n(c.tilt)} * x` +
  ` + ${n(c.A[0])} * sin(${n(c.F[0])} * x + ${n(c.P[0])})` +
  ` + ${n(c.A[1])} * sin(${n(c.F[1])} * x + ${n(c.P[1])})` +
  ` + ${n(c.A[2])} * (0.55 - abs(sin(${n(c.F[2])} * x + ${n(c.P[2])})))` +
  ` + ${n(c.A[3])} * (0.55 - abs(sin(${n(c.F[3])} * x + ${n(c.P[3])}))); }`;

function aleatorio(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));
const suav = (a: number, b: number, x: number): number => {
  const k = clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};

const VS_TELA = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// ruído de gradiente periódico (16 células em 64 voxels), 4 canais independentes
const FS_RUIDO = `#version 300 es
precision highp float;
precision highp int;
uniform float uZ;
out vec4 frag;
uint hsh(uvec3 v, uint s) {
  uint h = v.x * 0x8da6b343u ^ v.y * 0xd8163841u ^ v.z * 0xcb1ab31fu ^ s * 0x165667b1u;
  h ^= h >> 16; h *= 0x7feb352du; h ^= h >> 15; h *= 0x846ca68bu; h ^= h >> 16;
  return h;
}
vec3 grad(ivec3 c, uint s) {
  uvec3 u = uvec3((c % 16 + 16) % 16);
  uint h = hsh(u, s);
  return vec3(float(h & 1023u), float((h >> 10) & 1023u), float((h >> 20) & 1023u)) / 511.5 - 1.0;
}
float perlin(vec3 p, uint s) {
  ivec3 i = ivec3(floor(p));
  vec3 f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(grad(i, s), f);
  float b = dot(grad(i + ivec3(1, 0, 0), s), f - vec3(1, 0, 0));
  float c = dot(grad(i + ivec3(0, 1, 0), s), f - vec3(0, 1, 0));
  float d = dot(grad(i + ivec3(1, 1, 0), s), f - vec3(1, 1, 0));
  float e = dot(grad(i + ivec3(0, 0, 1), s), f - vec3(0, 0, 1));
  float g = dot(grad(i + ivec3(1, 0, 1), s), f - vec3(1, 0, 1));
  float h = dot(grad(i + ivec3(0, 1, 1), s), f - vec3(0, 1, 1));
  float k = dot(grad(i + ivec3(1, 1, 1), s), f - vec3(1, 1, 1));
  return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, g, u.x), mix(h, k, u.x), u.y), u.z);
}
void main() {
  vec3 p = vec3(gl_FragCoord.xy, uZ + 0.5) / 4.0;
  frag = clamp(vec4(perlin(p, 1u), perlin(p, 2u), perlin(p, 3u), perlin(p, 4u)) * 0.9 + 0.5, 0.0, 1.0);
}`;

const FS_NEBULOSA = `#version 300 es
precision highp float;
precision highp sampler3D;
#define NS ${NS}
uniform sampler3D uN;
uniform vec2 uRes;
uniform float uT;
uniform float uLuz;      // 0..1: quanto a nuvem está acesa
uniform vec4 uL[5];      // por camada: mundo = uv * z + xy; w: visibilidade
uniform vec4 uFuro;     // desfecho: raio da abertura na tela, força, brilho da estrela dourada, contraluz
uniform float uZoom;    // zoom do enquadramento (1 na mesa)
uniform float uKR;      // a abertura na poeira cabe na largura (estreita no celular em pé)
uniform vec4 uS[NS];     // estrelas ativas, agrupadas por camada: xy no mundo, brilho na poeira, cavidade
uniform vec2 uSK[NS];    // força do brilho, tamanho
uniform ivec2 uFx[4];    // por camada: primeira estrela e quantas
uniform vec4 uTit;       // sombra atrás do título: centro (uv) e raios
uniform float uSem;
out vec4 frag;

${glslHoriz(HORIZ[1], 'h1')}
${glslHoriz(HORIZ[2], 'h2')}
${glslHoriz(HORIZ[3], 'h3')}
float horiz(int li, float x) { return li == 1 ? h1(x) : (li == 2 ? h2(x) : h3(x)); }

const mat2 ROT = mat2(0.80, 0.60, -0.60, 0.80);
vec4 N(vec2 x, float z) { return texture(uN, vec3(x, z)); }

// fbm: x = soma completa, y = só as 3 primeiras oitavas (para o sombreado)
// (oct pode ser fracionário: a última oitava entra aos poucos, sem salto)
vec2 fbm(vec2 x, float z, float oct, int crista) {
  float s = 0.0, a = 0.5, p = 0.0;
  for (int i = 0; i < 7; i++) {
    if (float(i) >= oct) break;
    float v = texture(uN, vec3(x, z)).r * 2.0 - 1.0;
    if (i >= crista) v = (1.0 - sqrt(v * v + 0.004)) * 1.5 - 0.95;
    s += a * v * min(1.0, oct - float(i));
    if (i == 2) p = s;
    x = ROT * x * 2.07 + vec2(0.31, 0.17);
    z += 0.071;
    a *= 0.5;
  }
  if (oct <= 3.0) p = s;
  return vec2(s, p);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// cores lineares antes do tom (1 - e^-1,7c): marrom quase preto, ferrugem,
// ocre alaranjado, borda creme, vapor azul-claro, brasa das estrelas novas
const vec3 C_FUNDO = vec3(0.0065, 0.0030, 0.0021);
const vec3 C_FERRUGEM = vec3(0.075, 0.019, 0.0065);
const vec3 C_OCRE = vec3(0.85, 0.16, 0.028);
const vec3 C_BORDA = vec3(1.9, 0.85, 0.40);
const vec3 C_VAPOR = vec3(0.21, 0.42, 0.92);
const vec3 C_BRASA = vec3(1.1, 0.26, 0.06);

vec3 gas(vec2 uv) {
  vec4 L = uL[0];
  vec2 w = uv * L.z + L.xy;
  float z = uT * 0.0025 + 0.6;
  vec4 q = N(w * 0.16, z);
  vec2 ww = w + 0.4 * (q.gb - 0.5);
  float g = fbm(ww * 0.40, z, 4.0, 9).x;
  float prof = exp(-pow((w.y - 0.12) / 0.40, 2.0)) * 0.85 + 0.15;
  float b = max(0.0, 0.5 + g * 1.3) * prof;
  vec3 c = vec3(0.004, 0.009, 0.020);
  c += vec3(0.018, 0.070, 0.110) * b;
  c += vec3(0.09, 0.22, 0.30) * pow(max(g + 0.05, 0.0), 2.0) * prof * 2.4;
  c += vec3(0.07, 0.035, 0.02) * exp(-pow((w.y + 0.02) / 0.14, 2.0)) * q.a;
  return c * (0.28 + 0.72 * uLuz) * L.w;
}

// uma camada de escarpas (li 2 e 3) ou de retalhos de poeira ao longe (li 1)
// composição da frente para trás: col acumula, T é o quanto ainda passa
void camada(int li, vec2 uv, float fq, float amp, float wa, inout vec3 col, inout float T) {
  vec4 L = uL[li];
  if (L.w < 0.002) return;
  bool longe = li == 1;
  vec2 w = uv * L.z + L.xy;
  float z = uT * 0.0035 + float(li) * 0.23;
  vec4 q = N(w * fq * 0.55, z);
  vec4 q2 = N(w * fq * 1.6 + (q.gb - 0.5) * 0.2, z + 0.4);
  vec2 wv = (q.gb - 0.5) + (q2.gb - 0.5) * 0.5;
  vec2 ww = w + wa * wv;
  float hx = horiz(li, ww.x);
  // ao se aproximar no desfecho a nuvem é autossemelhante: ganha oitavas finas
  // (sem salto) e as larguras de borda encolhem junto, então não vira borrão
  float nit = clamp(L.z / uZoom, 0.2, 1.0);
  vec2 f = fbm(ww * fq, z, (longe ? 4.0 : 5.0) - log2(nit), 3);
  float inc = longe ? 0.3 : 1.0;
  float D = inc * (hx - ww.y) + amp * f.x;
  if (longe) {
    D += 0.2 * (q.a - 0.62);
    vec2 tq = (uv - uTit.xy) / (uTit.zw * 1.6);
    D -= 0.12 * exp(-dot(tq, tq));
  }
  // sombreado: a densidade cai na direção da luz (de cima, um pouco da direita)
  float DL = 0.022 * nit;
  vec2 ld = vec2(0.28, 0.96);
  vec2 wo = ww + ld * DL;
  float D3 = inc * (hx - ww.y) + amp * f.y;
  float Do = inc * (horiz(li, wo.x) - wo.y) + amp * fbm(wo * fq, z, 3.0, 3).x;
  float dif = (D3 - Do) / DL;
  float sh = clamp(0.2 + 0.6 * dif / inc, 0.0, 1.6);
  // as estrelas desta camada: luz por dentro e cavidade
  float glow = 0.0, halo = 0.0, cav = 0.0;
  ivec2 fx = uFx[li];
  for (int j = 0; j < NS; j++) {
    if (j >= fx.y) break;
    int k = fx.x + j;
    vec2 dv = w - uS[k].xy;
    float r2 = dot(dv, dv);
    float tam = uSK[k].y;
    if (r2 > 0.06 * tam * tam) continue;
    float r = sqrt(r2);
    cav += uS[k].w * exp(-r2 / (0.0012 * tam * tam));
    float fo = uS[k].z * uSK[k].x * uSK[k].x;
    glow += fo * exp(-r / (0.014 * tam));
    halo += fo * exp(-r / (0.05 * tam));
  }
  D = mix(D, min(D, 0.006 + 0.03 * q2.a), clamp(cav, 0.0, 1.0));
  // a luz pega na estrutura da poeira: as dobras acendem, os vãos não
  float dobra = clamp(0.5 + 1.6 * (f.x - f.y), 0.0, 1.0);
  glow = glow * (0.35 + 1.0 * dobra) * 0.7 + halo * 0.1 * (0.3 + dobra);
  // no desfecho a nuvem se abre em volta de quem atravessa, com borda rasgada
  float rasgo = clamp(0.45 + 0.6 * (f.x + 0.3) + 3.5 * (f.x - f.y), 0.15, 2.0);
  D -= uFuro.y * rasgo * exp(-dot(uv, uv) / (uFuro.x * uFuro.x * uKR * uKR));
  float s = max(D, 0.0);
  float soft = (longe ? mix(0.02, 0.06, q.a) : mix(0.004, 0.03, q.a)) * nit;
  float a = smoothstep(0.0, soft, D);
  float face = exp(-s / (0.045 * nit));
  float rim = exp(-s / (0.008 * nit));
  float fundo = exp(-s / (0.16 * nit));
  float relevo = 0.6 + 0.8 * dobra;
  float var = q2.a;
  float luz = uLuz;
  // no desfecho a nuvem vira contraluz: corpo escuro, borda dourada virada para o centro
  float cl = uFuro.w;
  vec3 c = mix(C_FUNDO, C_FERRUGEM * mix(0.6, 1.5, var), fundo) * (0.35 + 0.65 * luz) * (0.55 + 0.45 * min(sh, 1.4)) * (1.0 - 0.5 * cl) * relevo;
  c += C_OCRE * mix(vec3(0.8, 1.0, 1.4), vec3(1.15, 0.9, 0.7), var) * face * mix(sh, 0.5, cl) * luz * (longe ? 0.3 : 0.6) * (1.0 - 0.6 * cl) * relevo;
  c += mix(C_BORDA, vec3(2.2, 1.05, 0.35), cl) * rim * (0.1 + 0.9 * luz) * mix(0.35 + 0.65 * min(sh, 1.2), 1.3, cl) * (longe ? 0.15 : 0.6);
  c += C_BRASA * glow * (0.25 + 0.75 * fundo);
  // vapor: o gás que a luz arranca das cristas sobe em fiapos
  float hz = exp(min(D, 0.0) / (0.035 * nit)) * (1.0 - a);
  float hz2 = exp(min(D, 0.0) / (0.12 * nit)) * (1.0 - a);
  float st = N(vec2(ww.x * fq * 1.4, ww.y * fq * 0.7 - uT * 0.0016), z + 0.2).r;
  float vapor = (hz * (0.35 + 0.9 * st) + 0.22 * hz2) * (0.1 + 0.9 * luz) * (1.0 - cl);
  vec3 em = C_VAPOR * vapor * (longe ? 0.0 : 0.17) + vec3(0.35, 0.5, 0.95) * halo * 0.06 * (1.0 - a);
  if (longe) a *= 0.55;
  a *= L.w;
  col += T * (c * a + em * L.w);
  T *= 1.0 - a;
}

void frente(vec2 uv, inout vec3 col, inout float T) {
  vec4 L = uL[4];
  if (L.w < 0.002) return;
  vec2 w = uv * L.z + L.xy;
  float z = uT * 0.004 + 0.9;
  vec4 q = N(w * 0.5, z);
  vec2 ww = w + 0.12 * (q.gb - 0.5);
  float f = fbm(ww * 0.9, z, 4.0, 9).x;
  float D = (-0.45 + 0.05 * sin(1.3 * ww.x + 0.5) + 0.04 * sin(3.1 * ww.x + 2.0) - ww.y) + 0.13 * f;
  float a = smoothstep(0.0, 0.07, D) * 0.94 * L.w;
  float s = max(D, 0.0);
  vec3 c = C_FUNDO * 0.6 + C_FERRUGEM * 0.5 * exp(-s / 0.03) * uLuz + C_BORDA * 0.08 * exp(-s / 0.006) * uLuz;
  col += T * c * a;
  T *= 1.0 - a;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float abre = uFuro.y * exp(-dot(uv, uv) / (uFuro.x * uFuro.x * 1.8));
  // da frente para trás, parando quando nada mais passa (economiza o fundo coberto)
  vec3 col = vec3(0.0);
  float T = 1.0;
  frente(uv, col, T);
  if (T > 0.003) camada(3, uv, 0.42, 0.12, 0.04, col, T);
  if (T > 0.003) camada(2, uv, 0.36, 0.11, 0.035, col, T);
  float aD = 1.0 - T; // poeira na frente das estrelas de fundo
  if (T > 0.003) camada(1, uv, 0.44, 0.085, 0.04, col, T);
  if (T > 0.003) col += T * (gas(uv) * (1.0 - min(abre * 3.0, 0.97)) + vec3(0.0012, 0.0018, 0.0035));
  float ro = length(uv);
  col += vec3(1.0, 0.6, 0.24) * uFuro.z * (0.06 * exp(-ro / 0.07) + 0.014 * exp(-ro / 0.3));
  // sombra suave atrás do título e vinheta
  vec2 tq = (uv - uTit.xy) / uTit.zw;
  col *= 1.0 - 0.5 * exp(-dot(tq, tq));
  float vg = length(uv * vec2(0.75, 1.0));
  col *= 1.0 - 0.45 * smoothstep(0.35, 0.95, vg);
  col = 1.0 - exp(-col * 1.7);
  col = pow(col, vec3(1.0 / 2.2));
  col += (hash12(gl_FragCoord.xy + uSem) + hash12(gl_FragCoord.xy * 1.37 + uSem + 11.0) - 1.0) / 255.0;
  frag = vec4(col, aD);
}`;

const FS_COMPOR = `#version 300 es
precision highp float;
uniform sampler2D uNeb;
uniform vec2 uRes;
uniform float uSem;
out vec4 frag;
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
void main() {
  vec3 c = texture(uNeb, gl_FragCoord.xy / uRes).rgb;
  c += (hash12(gl_FragCoord.xy + uSem) + hash12(gl_FragCoord.xy * 1.37 + uSem + 5.0) - 1.0) / 255.0;
  frag = vec4(c, 1.0);
}`;

const VS_CAMPO = `#version 300 es
layout(location = 0) in vec4 aE;   // xy no plano do fundo, brilho, cor (0 azul .. 1 laranja)
layout(location = 1) in float aK;  // quanto a poeira a esconde
uniform vec4 uBg;
uniform vec2 uRes;
uniform float uDpr;
uniform float uGanho;
uniform sampler2D uNeb;
out vec3 vCor;
out float vSig;
out float vTam;
void main() {
  vec2 uv = (aE.xy - uBg.xy) / uBg.z;
  vec2 ndc = vec2(uv.x * 2.0 * uRes.y / uRes.x, uv.y * 2.0);
  float a = textureLod(uNeb, ndc * 0.5 + 0.5, 0.0).a;
  float tr = 1.0 - aK * a * 0.94;
  float I = aE.z * tr * uGanho;
  vec3 cor = mix(vec3(0.72, 0.84, 1.0), vec3(1.0, 0.82, 0.6), aE.w);
  cor = mix(cor, vec3(1.0, 0.5, 0.28), aK * a);
  vSig = (0.5 + 0.75 * aE.z) * uDpr;
  vTam = ceil(vSig * 6.0) + 1.0;
  gl_PointSize = vTam;
  vCor = cor * I;
  gl_Position = I < 0.003 ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(ndc, 0.0, 1.0);
}`;

const FS_CAMPO = `#version 300 es
precision highp float;
in vec3 vCor;
in float vSig;
in float vTam;
out vec4 frag;
void main() {
  vec2 p = (gl_PointCoord - 0.5) * vTam;
  float g = exp(-dot(p, p) / (2.0 * vSig * vSig));
  frag = vec4(vCor * g, 1.0);
}`;

const VS_ASTRO = `#version 300 es
layout(location = 0) in vec2 aQ;
layout(location = 1) in vec4 aA;  // uv, brilho, raios
layout(location = 2) in vec4 aB;  // cor, meia largura do quadro (px)
layout(location = 3) in vec4 aC;  // sigma do núcleo (px), halo (px), quanto a poeira esconde, comprimento dos raios (px)
uniform vec2 uRes;
uniform sampler2D uNeb;
out vec2 vP;
out vec4 vA;
out vec4 vB;
out vec4 vC;
void main() {
  vec2 ndc = vec2(aA.x * 2.0 * uRes.y / uRes.x, aA.y * 2.0);
  float a = textureLod(uNeb, ndc * 0.5 + 0.5, 0.0).a;
  vP = aQ * aB.w;
  vA = vec4(aA.xy, aA.z * (1.0 - aC.z * a), aA.w);
  vB = aB;
  vC = aC;
  gl_Position = vec4(ndc + aQ * aB.w * 2.0 / uRes, 0.0, 1.0);
}`;

const FS_ASTRO = `#version 300 es
precision highp float;
in vec2 vP;
in vec4 vA;
in vec4 vB;
in vec4 vC;
out vec4 frag;
float raio(vec2 p, vec2 d, float len, float w) {
  float al = abs(dot(p, d));
  float pe = dot(p, vec2(-d.y, d.x));
  float wi = w * (1.0 + 0.5 * al / len);
  return exp(-pe * pe / (2.0 * wi * wi)) * exp(-al / len) * (w / wi) * (0.82 + 0.18 * cos(al * 0.35 / w));
}
void main() {
  float r = length(vP);
  float sig = vC.x;
  float core = exp(-r * r / (2.0 * sig * sig));
  float halo = exp(-r / vC.y) * 0.22 + 0.05 / (1.0 + r * r / (vC.y * vC.y * 6.0));
  float sp = 0.0;
  if (vA.w > 0.001) {
    float L = vC.w;
    float w = max(0.8, sig * 0.42);
    sp = raio(vP, vec2(0.0, 1.0), L, w) + raio(vP, vec2(0.8660254, 0.5), L, w) + raio(vP, vec2(-0.8660254, 0.5), L, w);
    sp += 0.3 * raio(vP, vec2(1.0, 0.0), L * 0.55, w * 0.85);
    sp *= vA.w;
  }
  float fora = 1.0 - smoothstep(0.75, 1.0, max(abs(vP.x), abs(vP.y)) / vB.w);
  vec3 c = vB.rgb * vA.z * (core * 1.5 + halo + sp * 0.8) * fora;
  frag = vec4(c, 1.0);
}`;

/** o WebGL devolve `null` quando não consegue criar o objeto (contexto perdido, sem memória) */
function obter<T>(objeto: T | null, nome: string): T {
  if (!objeto) throw new Error('WebGL: não criou ' + nome);
  return objeto;
}

function compilar(gl: WebGL2RenderingContext, vs: string, fs: string): Programa {
  const p = obter(gl.createProgram(), 'programa');
  for (const [tipo, fonte] of [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ] as const) {
    const s = obter(gl.createShader(tipo), 'shader');
    gl.shaderSource(s, fonte);
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
  const u: Record<string, WebGLUniformLocation | null> = {};
  const nu: number = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) || 0;
  for (let i = 0; i < nu; i++) {
    const info = gl.getActiveUniform(p, i);
    if (!info) continue;
    const nome = info.name.replace(/\[0\]$/, '');
    u[nome] = gl.getUniformLocation(p, nome);
  }
  return { p, u };
}

// as cinco que ganham os raios grandes (índice na ordem de nascimento) e o
// lugar de cada uma: fração da largura e da altura acima da crista
const GRANDES = [3, 9, 15, 20, 26];
const VAGAS: [number, number][] = [
  [0.55, 0.2],
  [0.1, 0.75],
  [0.88, 0.9],
  [0.3, 0.1],
  [0.72, 0.55],
];
// As estrelas que nascem: limiar de progresso, tipo e posição relativa.
// Fixas pela semente; a posição no mundo depende do enquadramento.
function catalogo(): Estrela[] {
  const r = aleatorio(0x5eed_b3c0);
  const lista: Estrela[] = [];
  for (let k = 0; k < NS; k++) {
    const limiar = 0.02 + (0.95 * (k + 0.15 + 0.7 * r())) / NS;
    const grande = GRANDES.includes(k);
    const exposta = grande || r() < 0.3;
    lista.push({
      limiar,
      grande,
      exposta,
      u: r(),
      v: 0,
      prof: r(),
      brilho: grande ? 0.95 + 0.35 * r() : exposta ? 0.35 + 0.3 * r() : 0.3 + 0.4 * r(),
      tam: grande ? 1.2 + 0.4 * r() : 0.6 + 0.9 * r(),
      forca: 0.35 + 0.95 * r() * r(),
      temp: exposta ? 0.1 * r() : 0.35 + 0.5 * r(),
      x: 0,
      y: 0,
      camada: 1,
    });
  }
  // as grandes nascem em pontos espalhados da largura, fora de ordem
  GRANDES.forEach((k, i) => {
    const [u, v] = VAGAS[i];
    lista[k].u = u;
    lista[k].v = v;
  });
  return lista;
}

/**
 * Onde o protótipo media o título no DOM (centro e meia-largura/altura em
 * uv da altura da tela, que a cena usa para escurecer a nuvem atrás dele e
 * para desviar as estrelas). Sem DOM, o retângulo vem da mesma CSS, em px.
 * O protótipo media a caixa no primeiro quadro, antes da fonte chegar, com
 * a fonte reserva (Georgia): "Mar de Estrelas" mede ~7,08 × corpo, então em
 * paisagem sempre quebra na caixa de 6,2 em (duas linhas) e em retrato
 * (corpo = 12,5 vw) sempre cabe numa linha. O layout do navegador mede em
 * 1/64 de px (cai para baixo; a linha, arredondada): igual aqui, a sombra sai
 * pixel a pixel a mesma.
 */
function caixaDoTitulo(w: number, h: number, celular: boolean): Quatro {
  const medida = (v: number): number => Math.floor(v * 64) / 64;
  const corpo = celular ? clamp(0.125 * w, 40, 54.4) : clamp(0.06 * w, 48, 99.2);
  const esq = celular ? 0 : medida(0.075 * w);
  const topo = medida((celular ? 0.11 : 0.15) * h);
  const larg = celular ? w : medida(6.2 * corpo);
  const alt = (celular ? 1 : 2) * (Math.round(corpo * 64) / 64);
  return [(esq + larg / 2 - w / 2) / h, (h / 2 - (topo + alt / 2)) / h, Math.max(0.05, (larg / h) * 0.65), Math.max(0.04, (alt / h) * 0.9)];
}

export const bercario: DefinicaoDaCena = {
  id: 'bercario',
  duracaoFinal: 2.8,
  criar(canvas: HTMLCanvasElement | OffscreenCanvas): Cena {
    const contexto = canvas.getContext('webgl2', ATRIBUTOS);
    if (!contexto) throw new Error('WebGL2 indisponível');
    const gl: WebGL2RenderingContext = contexto;

    // --- programas
    const pRuido = compilar(gl, VS_TELA, FS_RUIDO);
    const pNeb = compilar(gl, VS_TELA, FS_NEBULOSA);
    const pComp = compilar(gl, VS_TELA, FS_COMPOR);
    const pCampo = compilar(gl, VS_CAMPO, FS_CAMPO);
    const pAstro = compilar(gl, VS_ASTRO, FS_ASTRO);
    const vaoVazio = obter(gl.createVertexArray(), 'vao');

    // --- ruído 3D assado uma vez na GPU, com mipmaps (sem cintilação ao longe)
    const ruido = obter(gl.createTexture(), 'textura do ruido');
    gl.bindTexture(gl.TEXTURE_3D, ruido);
    gl.texStorage3D(gl.TEXTURE_3D, 7, gl.RGBA8, 64, 64, 64);
    for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, p, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    {
      const fb = obter(gl.createFramebuffer(), 'framebuffer do ruido');
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.viewport(0, 0, 64, 64);
      gl.useProgram(pRuido.p);
      gl.bindVertexArray(vaoVazio);
      for (let z = 0; z < 64; z++) {
        gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, ruido, 0, z);
        gl.uniform1f(pRuido.u.uZ, z);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(fb);
      gl.generateMipmap(gl.TEXTURE_3D);
      gl.deleteProgram(pRuido.p);
    }

    // --- buffer da nebulosa (resolução reduzida)
    const neb = obter(gl.createTexture(), 'textura da nebulosa');
    const nebFb = obter(gl.createFramebuffer(), 'framebuffer da nebulosa');
    let nebW = 1;
    let nebH = 1;

    // --- estrelas de fundo
    const campoVao = obter(gl.createVertexArray(), 'vao do campo');
    const campoBuf = obter(gl.createBuffer(), 'buffer do campo');
    const campoN = 2600;
    {
      const r = aleatorio(0xc0ffee);
      const dados = new Float32Array(campoN * 5);
      for (let i = 0; i < campoN; i++) {
        const x = (r() * 2 - 1) * 1.35;
        const y = (r() * 2 - 1) * 0.78;
        const m = r();
        const brilho = 0.05 + 0.95 * Math.pow(m, 7);
        dados.set([x, y, brilho, Math.pow(r(), 1.6), r() < 0.82 ? 1 : 0.15], i * 5);
      }
      gl.bindVertexArray(campoVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, campoBuf);
      gl.bufferData(gl.ARRAY_BUFFER, dados, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 20, 16);
    }

    // --- estrelas que nascem (quadros instanciados) + a estrela dourada do fim
    const astroVao = obter(gl.createVertexArray(), 'vao das estrelas');
    const quadBuf = obter(gl.createBuffer(), 'buffer do quadro');
    const instBuf = obter(gl.createBuffer(), 'buffer das instancias');
    const MAXI = NS + 1;
    const inst = new Float32Array(MAXI * 12);
    gl.bindVertexArray(astroVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, inst.byteLength, gl.DYNAMIC_DRAW);
    for (let i = 0; i < 3; i++) {
      gl.enableVertexAttribArray(1 + i);
      gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, 48, i * 16);
      gl.vertexAttribDivisor(1 + i, 1);
    }
    gl.bindVertexArray(null);

    const estrelas = catalogo();
    const uS = new Float32Array(NS * 4);
    const uSK = new Float32Array(NS * 2);
    const uFx = new Int32Array(8);
    const nebS = new Float32Array(NS * 4); // por estrela, antes de agrupar
    const uL = new Float32Array(20);

    let W = 1;
    let H = 1;
    let DPR = 1;
    let celular = false;
    let medida = false;
    const frame = [0, 0, 1];
    const tit: Quatro = [0, 0, 1, 1];

    function posicionarEstrelas(): void {
      const asp = W / H;
      const x0 = frame[0] - 0.5 * asp * frame[2];
      const x1 = frame[0] + 0.5 * asp * frame[2];
      const y0 = frame[1] - 0.5 * frame[2];
      const y1 = frame[1] + 0.5 * frame[2];
      const mx = 0.05 * (x1 - x0);
      // zona do título no mundo (em repouso uvW = uv*zoom + desloc)
      const tx = tit[0] * frame[2] + frame[0];
      const ty = tit[1] * frame[2] + frame[1];
      const trx = (tit[2] / 0.65) * 0.5 * frame[2] + 0.05;
      const tryy = (tit[3] / 0.9) * 0.5 * frame[2] + 0.05;
      const r = aleatorio(celular ? 0x51 : 0x52);
      const postas: [number, number, number][] = [];
      for (let k = 0; k < NS; k++) {
        const s = estrelas[k];
        const camada: Camada = s.exposta ? 1 : s.prof < 0.6 ? 2 : 3;
        const dmin = s.grande ? 0.14 * frame[2] : 0.07 * frame[2];
        // melhor candidato: entre vários sorteios, o mais longe das já postas
        let x = 0;
        let y = 0;
        let melhor = -Infinity;
        for (let tent = 0; tent < 24; tent++) {
          const cx = x0 + mx + (x1 - x0 - 2 * mx) * (s.grande ? clamp(s.u + 0.08 * (r() - 0.5), 0, 1) : r());
          let cy: number;
          let multa = 0;
          if (s.exposta) {
            const base = Math.max(horiz(HORIZ[2], cx) + 0.05, horiz(HORIZ[3], cx) + 0.08);
            const topo = y1 - 0.1 * frame[2];
            cy = s.grande
              ? base + 0.03 + (Math.min(topo, base + 0.36) - base - 0.03) * clamp(s.v + 0.1 * (r() - 0.5), 0, 1)
              : base + (topo - base) * Math.pow(r(), 1.5);
            if (Math.abs((cx - tx) / trx) < 1 && Math.abs((cy - ty) / tryy) < 1) multa = 1;
          } else {
            cy = horiz(HORIZ[camada], cx) - (camada === 2 ? 0.035 + 0.16 * r() : 0.03 + 0.09 * r());
            if (cy < y0 + 0.13 * frame[2]) multa = 1;
          }
          let dist = 1;
          for (const p of postas) dist = Math.min(dist, Math.hypot(p[0] - cx, p[1] - cy) / Math.max(dmin, p[2]));
          const nota = dist - multa * 10;
          if (nota > melhor) {
            melhor = nota;
            x = cx;
            y = cy;
          }
        }
        postas.push([x, y, dmin]);
        s.x = x;
        s.y = y;
        s.camada = camada;
      }
    }

    function redimensionar(w: number, h: number, dpr: number): void {
      W = w;
      H = h;
      DPR = dpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      celular = w / h < 0.8;
      if (celular) {
        frame[0] = 0.16;
        frame[1] = 0.085;
        frame[2] = 1.34;
      } else {
        frame[0] = 0.0;
        frame[1] = 0.0;
        frame[2] = 1.0;
      }
      // sombra do título em uv
      const caixa = caixaDoTitulo(w, h, celular);
      tit[0] = caixa[0];
      tit[1] = caixa[1];
      tit[2] = caixa[2];
      tit[3] = caixa[3];
      const px = canvas.width * canvas.height;
      const k = Math.min(0.85, Math.sqrt(PIX_NEBULOSA / px));
      nebW = Math.max(16, Math.round(canvas.width * k));
      nebH = Math.max(16, Math.round(canvas.height * k));
      gl.bindTexture(gl.TEXTURE_2D, neb);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, nebW, nebH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, nebFb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, neb, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      posicionarEstrelas();
      medida = true;
    }

    function quadro(e: EstadoDaCena): void {
      if (gl.isContextLost() || !medida) return;
      const ta = e.reduzido ? e.t * 0.25 : e.t;
      const s = clamp(e.suave, 0, 1);
      const fim = clamp(e.fim, 0, 1);
      const luz = 0.07 + 0.93 * Math.pow(s, 0.85);
      const fe = fim * fim * (3 - 2 * fim);
      // câmera: deriva lenta e respiração; no desfecho, avanço pelas camadas
      const solta = 1 - fe;
      const cx = 0.035 * Math.sin(ta * 0.041 + 0.6) * solta;
      // desce até o centro da tela cair 0,1 abaixo da crista da escarpa principal
      const mergulho = (horiz(HORIZ[2], frame[0]) - 0.1 - frame[1]) * PROF[2];
      const cy = 0.012 * Math.sin(ta * 0.053 + 2.0) * solta + mergulho * suav(0, 0.55, fim);
      const cz = 0.06 * (0.5 - 0.5 * Math.cos(ta * 0.035)) + 2.5 * fe;
      const furo = suav(0.3, 0.85, fim);
      const some = 1 - suav(0.65, 0.93, fim);
      for (let i = 0; i < 5; i++) {
        const d = PROF[i];
        const esc = (d - cz) / d;
        const vento = VENTO[i] * Math.sin(ta * 0.035 + FASE_VENTO[i]);
        let vis = suav(0.03, 0.2, esc) * some;
        if (i === 0) vis = 1 - suav(0.45, 0.95, fim);
        // mundo da camada = uv * escala + deslocamento (o zoom gira em torno do centro da tela)
        uL.set([frame[0] + cx / d + vento, frame[1] + cy / d, frame[2] * Math.max(esc, 0.001), vis], i * 4);
      }

      // estrelas: acendem com o progresso (suave), sem degrau
      let ni = 0;
      for (let k = 0; k < NS; k++) {
        const st = estrelas[k];
        const g = clamp((s - st.limiar) / 0.045, 0, 1);
        const acesa = g * g * (3 - 2 * g);
        const pre = clamp((s - st.limiar + 0.06) / 0.06, 0, 1);
        const clarao = e.reduzido ? 0 : 0.8 * Math.sin(Math.PI * g);
        const cav = suav(0, 1, (s - st.limiar) / 0.3) * (1 - suav(0.15, 0.45, fim));
        const L = st.camada;
        const vis = uL[L * 4 + 3];
        const apaga = 1 - suav(0.1, 0.4, fim);
        nebS.set([st.x, st.y, (0.3 * pre * pre + 0.7 * acesa + 0.4 * clarao) * vis * apaga, cav], k * 4);
        const I = st.brilho * (acesa + clarao * acesa) * vis;
        if (I < 0.003) continue;
        // posição na tela
        const ox = uL[L * 4];
        const oy = uL[L * 4 + 1];
        const esc = uL[L * 4 + 2];
        const ux = (st.x - ox) / esc;
        const uy = (st.y - oy) / esc;
        const dp = DPR;
        const quente = st.temp;
        const cor = [0.75 + 0.25 * quente, 0.85 + 0.0 * quente, 1.0 - 0.45 * quente];
        const raios = st.grande ? 1 : st.exposta ? 0.45 : 0.18;
        const len = (st.grande ? 34 : 14) * Math.sqrt(st.brilho) * acesa * dp * (celular ? 0.62 : 1);
        const sig = (0.9 + 0.7 * st.brilho) * dp;
        const halo = (st.grande ? 7 : 4) * dp;
        const meia = Math.max(len * 3.3, halo * 6, sig * 6);
        inst.set([ux, uy, I, raios, cor[0], cor[1], cor[2], meia, sig, halo, st.exposta ? 0.85 : 0.55, Math.max(len, 1)], ni * 12);
        ni++;
      }
      // as estrelas que já mexem na poeira, agrupadas por camada (o shader só
      // percorre as da camada que está desenhando)
      let nu = 0;
      for (let L = 1; L <= 3; L++) {
        uFx[L * 2] = nu;
        for (let k = 0; k < NS; k++) {
          const st = estrelas[k];
          if (st.camada !== L || (nebS[k * 4 + 2] < 0.002 && nebS[k * 4 + 3] < 0.002)) continue;
          uS.set(nebS.subarray(k * 4, k * 4 + 4), nu * 4);
          uSK[nu * 2] = st.exposta ? 0.35 : st.forca;
          uSK[nu * 2 + 1] = st.tam;
          nu++;
        }
        uFx[L * 2 + 1] = nu - uFx[L * 2];
      }
      // a estrela dourada do desfecho, no centro
      const ouro = suav(0.25, 0.92, fim);
      if (ouro > 0.001) {
        const dp = DPR;
        inst.set([0, 0, 1.3 * ouro, 0.1 * ouro, 1.0, 0.74, 0.4, 160 * dp, (2.4 + 1.8 * ouro) * dp, (12 + 18 * ouro) * dp, 0.95, 26 * dp], ni * 12);
        ni++;
      }

      // 1) nebulosa
      gl.bindFramebuffer(gl.FRAMEBUFFER, nebFb);
      gl.viewport(0, 0, nebW, nebH);
      gl.disable(gl.BLEND);
      gl.useProgram(pNeb.p);
      gl.bindVertexArray(vaoVazio);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_3D, ruido);
      const u = pNeb.u;
      gl.uniform1i(u.uN, 0);
      gl.uniform2f(u.uRes, nebW, nebH);
      gl.uniform1f(u.uT, ta);
      gl.uniform1f(u.uLuz, luz);
      gl.uniform4fv(u.uL, uL);
      gl.uniform4f(u.uFuro, 0.03 + 0.75 * furo, 0.7 * furo, ouro, suav(0.15, 0.55, fim));
      gl.uniform1f(u.uKR, Math.min(1, (W / H) * 1.3));
      gl.uniform1f(u.uZoom, frame[2]);
      gl.uniform4fv(u.uS, uS);
      gl.uniform2fv(u.uSK, uSK);
      gl.uniform2iv(u.uFx, uFx);
      gl.uniform4f(u.uTit, tit[0], tit[1], tit[2], tit[3]);
      gl.uniform1f(u.uSem, (Math.floor(e.t * 60) % 997) * 1.7);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 2) para a tela
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(pComp.p);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, neb);
      gl.uniform1i(pComp.u.uNeb, 1);
      gl.uniform2f(pComp.u.uRes, canvas.width, canvas.height);
      gl.uniform1f(pComp.u.uSem, (Math.floor(e.t * 60) % 991) * 2.3);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 3) estrelas por cima, somando luz
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(pCampo.p);
      gl.uniform4f(pCampo.u.uBg, uL[0], uL[1], uL[2], 1);
      gl.uniform2f(pCampo.u.uRes, canvas.width, canvas.height);
      gl.uniform1f(pCampo.u.uDpr, DPR);
      gl.uniform1f(pCampo.u.uGanho, (0.45 + 0.55 * luz) * (1 - 0.3 * fe));
      gl.uniform1i(pCampo.u.uNeb, 1);
      gl.bindVertexArray(campoVao);
      gl.drawArrays(gl.POINTS, 0, campoN);

      if (ni > 0) {
        gl.useProgram(pAstro.p);
        gl.uniform2f(pAstro.u.uRes, canvas.width, canvas.height);
        gl.uniform1i(pAstro.u.uNeb, 1);
        gl.bindVertexArray(astroVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst, 0, ni * 12);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, ni);
      }
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
    }

    function soltar(): void {
      try {
        gl.deleteTexture(ruido);
        gl.deleteTexture(neb);
        gl.deleteFramebuffer(nebFb);
        for (const b of [campoBuf, quadBuf, instBuf]) gl.deleteBuffer(b);
        for (const v of [vaoVazio, campoVao, astroVao]) gl.deleteVertexArray(v);
        for (const p of [pNeb, pComp, pCampo, pAstro]) gl.deleteProgram(p.p);
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
