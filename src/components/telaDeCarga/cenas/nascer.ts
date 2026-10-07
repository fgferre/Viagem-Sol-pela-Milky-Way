// Tela de carga "Nascer do Sol em órbita": o lado noturno da Terra visto da
// estação espacial. O progresso da carga é o Sol se aproximando do limbo:
// primeiro um fio azul de atmosfera, depois as camadas reais do terminador
// (vermelho embaixo, amarelo, branco, azul), e a 100 % a borda do Sol
// rompe. No desfecho o Sol se solta do limbo e doura a tela inteira.
//
// Tudo num único shader de tela cheia: a Terra é uma esfera de verdade,
// a atmosfera é espalhamento simples Rayleigh + Mie (com ozônio e a sombra
// do planeta) integrado ao longo de cada raio, com a transmitância para o
// Sol pela função de Chapman. A atmosfera está ~4x mais espessa que a
// real para o degradê caber em pixels; os coeficientes compensam.
//
// O TEXTO NÃO É DESTA CENA. Esta cena só desenha no canvas (cena.ts); o
// protótipo punha o texto por cima, e o hospedeiro o refaz em HTML assim:
//   um bloco só, centrado na horizontal (largura toda, margem de 20 px):
//   título "Mar de Estrelas" (clamp(2,6 rem; 5,4 vw; 5,4 rem), linha 1,02),
//   a frase da etapa 1,35 rem abaixo e a porcentagem 0,55 rem abaixo dela.
//   PAISAGEM (largura/altura ≥ 1,3): topo do bloco a 20 % da altura da
//   tela (no mínimo 76 px) — a 1440×900, o título começa em y = 180 px.
//   RETRATO (largura/altura ≤ 0,6): topo a 24 % da altura — a 390×844,
//   y ≈ 202 px. No meio, mistura suave (smoothstep da proporção, 0,6→1,3).
//   Frase e porcentagem somem com `fim` de 0 a 0,45; a sombra do título
//   (0 0 30px, 60 % de opacidade), com `fim` de 0 a 0,3.
import type { Cena, DefinicaoDaCena, EstadoDaCena } from '../cena';

type Vec3 = [number, number, number];
/** matriz 3×3 em colunas, como o WebGL espera */
type Mat3 = number[];

const GRAU = Math.PI / 180;
const ALT = 0.075; // altitude da câmera em raios terrestres
const SOL_R = 0.32 * GRAU; // raio angular do disco solar desenhado
const DELTA0 = 16 * GRAU; // quanto o Sol começa abaixo do limbo (atmosfera exagerada)
const MAX_PIXELS = 4.2e6;
// expoente da descida: a borda do Sol rompe (0,2° abaixo do limbo) aos 95 %
const GAMA = Math.log((0.35 * GRAU) / (DELTA0 + 0.15 * GRAU)) / Math.log(0.05);

const ATRIBUTOS: WebGLContextAttributes = {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  premultipliedAlpha: false,
  powerPreference: 'high-performance',
};

const VS = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
precision highp sampler3D;

uniform vec2 uRes;
uniform float uDpr;
uniform vec3 uCam;
uniform mat3 uRot;
uniform float uScale;
uniform float uFish;
uniform vec3 uSun;
uniform vec3 uEcl;
uniform mat3 uGround;
uniform float uTime;
uniform float uExpo;
uniform vec4 uSunScr;   // xy: Sol na tela (px), z: fração visível do disco, w: brilho do clarão
uniform vec4 uDawnScr;  // xy: ponto do limbo sob o Sol (px), z: brilho da aurora, w: luz zodiacal
uniform vec2 uLimbTan;  // direção do limbo na tela
uniform float uPx;      // radianos por pixel
uniform float uFlood;
uniform float uSettle;
uniform float uFlash;
uniform float uSunR;
uniform sampler3D uNoise;
out vec4 frag;

const float HR = 0.0055;      // altura de escala Rayleigh (raios terrestres, ~4x a real)
const float HM = 0.0011;      // altura de escala dos aerossóis
const float ZTOP = 0.055;
const vec3 BR = vec3(12.4, 29.1, 71.0);   // Rayleigh por raio terrestre (λ^-4)
const float ZOZ = 0.0171;    // camada de ozônio (~25 km, exagerada como o resto)
const float WOZ = 0.0041;
const vec3 KOZ = vec3(0.6, 1.7, 0.08);   // banda de Chappuis: come o laranja, deixa o azul
const float BM = 6.4;
const float BMX = 7.2;
const float ESUN = 20.0;
const float ZAG = 0.026;      // camada verde do airglow (O 557,7 nm)
const float WAG = 0.0008;
const float ZCLOUD = 0.012;

float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec4 vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  f = f * f * (3.0 - 2.0 * f);
  return texture(uNoise, (i + f + 0.5) * (1.0 / 64.0));
}

const mat3 ROT = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);

// fbm que some oitava por oitava quando o detalhe fica menor que o pixel
float fbm(vec3 p, float fp, int oct) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    float fade = 1.0 - smoothstep(0.25, 0.6, fp);
    s += a * fade * (vnoise(p).x - 0.5);
    p = ROT * p * 2.03;
    fp *= 2.03;
    a *= 0.5;
  }
  return s;
}

// função de Chapman aproximada (coluna rasante numa atmosfera exponencial)
float chap(float X, float h, float mu) {
  float x = X + h;
  float c = sqrt(1.5708 * x);
  if (mu >= 0.0) return c / (c * mu + 1.0) * exp(-h);
  float x0 = sqrt(max(1.0 - mu * mu, 0.0)) * x;
  float c0 = sqrt(1.5708 * x0);
  return 2.0 * c0 * exp(min(X - x0, 40.0)) - c / (1.0 - c * mu) * exp(-h);
}
// coluna de ozônio de um raio que sai do raio r com cosseno zenital mu,
// tratando a camada como uma casca gaussiana (uma ou duas travessias)
float ozoneCol(float r, float mu) {
  float rO = 1.0 + ZOZ;
  float b2 = r * r * max(1.0 - mu * mu, 0.0);
  float sec = rO / sqrt(max(rO * rO - b2, 0.0) + 2.7 * rO * WOZ);
  float u = max(sqrt(b2) - rO, 0.0);
  float one = WOZ * 2.5066 * sec * exp(-u * u / (2.0 * WOZ * WOZ));
  float above = smoothstep(rO - WOZ, rO + WOZ, r);
  return one * (mu < 0.0 ? 1.0 + above : 1.0 - above);
}
vec3 sunT(float r, float mu) {
  float z = r - 1.0;
  float cR = HR * chap(1.0 / HR, z / HR, mu);
  float cM = HM * chap(1.0 / HM, z / HM, mu);
  return exp(-BR * cR - BMX * cM - KOZ * ozoneCol(r, mu));
}
// sombra da Terra com penumbra
float sunVis(float r, float mu) {
  if (mu >= 0.0) return 1.0;
  float bs = r * sqrt(max(1.0 - mu * mu, 0.0));
  return smoothstep(0.9988, 1.0012, bs);
}
float hg(float mu, float g) {
  float g2 = g * g;
  return (1.0 - g2) / (12.566 * pow(max(1.0 + g2 - 2.0 * g * mu, 1e-4), 1.5));
}

void march(vec3 ro, vec3 rd, float t0, float t1, int n, bool denseEnd, float pR, float pM, inout vec2 od, out vec3 L) {
  L = vec3(0.0);
  float len = max(t1 - t0, 0.0);
  float inv = 1.0 / float(n);
  for (int i = 0; i < 16; i++) {
    if (i >= n) break;
    float u = (float(i) + 0.5) * inv;
    float t;
    float w;
    if (denseEnd) {
      float v = 1.0 - u;
      t = t0 + len * (1.0 - v * v);
      w = 2.0 * len * v * inv;
    } else {
      t = t0 + len * u * u;
      w = 2.0 * len * u * inv;
    }
    vec3 P = ro + rd * t;
    float r = length(P);
    float z = r - 1.0;
    float dR = exp(-z / HR);
    float dM = exp(-z / HM);
    vec2 dd = vec2(dR, dM) * w;
    vec2 odm = od + 0.5 * dd;
    od += dd;
    float mu = dot(P, uSun) / r;
    float vis = sunVis(r, mu);
    if (vis > 0.0) {
      vec3 Tv = exp(-BR * odm.x - BMX * odm.y);
      L += vis * sunT(r, mu) * Tv * (BR * dR * pR + BM * dM * pM) * w;
    }
  }
}

// uma camada de luzes de cidade numa grade 3D sobre a esfera: pontos de
// brilho em lei de potência, núcleo irregular e um halo de subúrbio; quando
// a célula fica menor que o pixel vira a média (sem cintilar)
vec3 cityLayer(vec3 Gt, float S, float fp, float dens, float rmin, float rmax, float gain, float avgK) {
  vec3 q = Gt * S;
  float fq = fp * S;
  vec3 c = floor(q);
  vec3 f = q - c;
  vec3 h = hash33(c);
  float hb = hash13(c + 19.7);
  float present = smoothstep(hb - 0.06, hb + 0.06, dens);
  vec3 d = f - (0.25 + 0.5 * h);
  float r = rmin + (rmax - rmin) * h.x * h.x;
  float b4 = h.y * h.y * h.y * h.y;
  float bri = gain * (0.1 + 3.2 * b4);
  float d2 = dot(d, d);
  float re2 = r * r + 0.6 * fq * fq;
  float core = (r * r / re2) * exp(-d2 / re2);
  float rh2 = 6.0 * r * r + 0.6 * fq * fq;
  float halo = (6.0 * r * r / rh2) * exp(-d2 / rh2) * (0.04 + 0.2 * h.y);
  vec3 m = min(f, 1.0 - f);
  float win = smoothstep(0.0, 0.12, min(m.x, min(m.y, m.z)));
  float shape = mix(vnoise(q * 3.1).y * 1.4 + 0.3, 1.0, smoothstep(0.08, 0.3, fq));
  float blob = bri * (core * shape + halo) * win;
  float k = smoothstep(0.35, 1.3, fq);
  vec3 tint = mix(vec3(1.0, 0.5, 0.16), vec3(1.0, 0.8, 0.52), smoothstep(0.62, 0.92, h.z));
  return tint * mix(blob * present, dens * gain * avgK, k);
}

vec3 lightning(vec3 Gt, float cloud, float detail) {
  vec3 q = Gt * 55.0;
  vec3 c = floor(q);
  vec3 h = hash33(c + 3.3);
  if (h.x > 0.3) return vec3(0.0);
  float per = 1.6 + 4.5 * h.y;
  float tt = fract(uTime / per + h.z) * per;
  float env = exp(-tt / 0.07) + 0.8 * step(0.18, tt) * exp(-max(tt - 0.18, 0.0) / 0.06);
  env *= 0.75 + 0.25 * sin(tt * 95.0);
  vec3 d = q - c - (0.3 + 0.4 * hash33(c + 9.1));
  vec3 m = min(q - c, 1.0 - (q - c));
  float win = smoothstep(0.0, 0.2, min(m.x, min(m.y, m.z)));
  float g = exp(-dot(d, d) / 0.004) + 0.25 * exp(-dot(d, d) / 0.03);
  return vec3(0.72, 0.8, 1.0) * env * g * win * smoothstep(0.15, 0.55, cloud) * (0.3 + 1.4 * detail) * 1.1 * uFlash;
}

vec3 shadeGround(vec3 G, vec3 Gt, float fp) {
  float cont = fbm(Gt * 2.1 + vec3(3.1, 1.7, 5.3), fp * 2.1, 5);
  float land = smoothstep(-0.1, -0.06, cont);
  float coast = exp(-abs(cont + 0.08) * 35.0);
  float popN = fbm(Gt * 9.0 + 11.0, fp * 9.0, 4);
  float pop = land * smoothstep(-0.08, 0.14, popN + 0.12 * coast);

  // nuvens: sistemas grandes deformados + textura fina de topo; nítidas
  // perto, lisas longe (a cobertura longe tende à média, não a zero)
  vec3 wq = vnoise(Gt * 4.0 + 4.0).yzw - 0.5;
  float cn = fbm(Gt * 11.0 + wq * 1.3, fp * 11.0, 7);
  float miss = smoothstep(0.002, 0.04, fp);
  float cloud = smoothstep(0.0 - 0.25 * miss, 0.1 + 0.25 * miss, cn);
  float det = fbm(Gt * 70.0 + 9.0, fp * 70.0, 3);
  float detail = clamp(0.5 + det * 2.2 + (cn - 0.05) * 1.5, 0.0, 1.0);

  vec3 surf = mix(vec3(0.0010, 0.0015, 0.0032), vec3(0.0022, 0.0023, 0.0027), land);

  // cidades: manchas orgânicas (fbm fino) onde há gente; dentro delas,
  // luzes finas em grade pequena; fora, vilas esparsas
  float mN = fbm(Gt * 190.0 + 2.0, fp * 190.0, 3);
  float metro = mix(smoothstep(0.04, 0.3, mN), 0.12, smoothstep(0.3, 1.0, fp * 190.0));
  float cityF = pop * metro;
  vec3 lights = vec3(1.0, 0.5, 0.17) * (cityF * cityF * 0.03 + pop * pop * 0.002);
  lights += cityLayer(Gt + 0.37, 800.0, fp, clamp(pop * 0.1 + cityF * 0.8, 0.0, 1.0), 0.06, 0.13, 1.3 * (0.4 + cityF), 0.002);
  lights += cityLayer(Gt + 0.71, 3200.0, fp, clamp(cityF * 2.0, 0.0, 1.0), 0.12, 0.24, 6.0 * (0.2 + cityF), 0.012);
  surf += lights * (1.0 - 0.8 * cloud);

  vec3 cloudCol = vec3(0.009, 0.0105, 0.015) * (0.15 + 1.8 * detail * detail);
  surf = mix(surf, cloudCol, cloud * 0.8);
  surf += cloud * (pop * 0.002 + cityF * 0.012) * vec3(1.0, 0.62, 0.32);
  surf += lightning(Gt, cloud, detail);

  // luz do Sol: topos de nuvem pegam a primeira luz antes do chão
  float mu = dot(G, uSun);
  vec3 Ts0 = sunT(1.0003, mu) * sunVis(1.0003, mu);
  vec3 Tsc = sunT(1.0 + ZCLOUD, mu) * sunVis(1.0 + ZCLOUD, mu);
  surf += ESUN * Ts0 * max(mu, 0.0) * mix(vec3(0.015, 0.025, 0.045), vec3(0.07, 0.06, 0.045), land) * (1.0 - cloud);
  Tsc = mix(Tsc, vec3(dot(Tsc, vec3(0.3, 0.5, 0.2))), 0.22);
  surf += ESUN * Tsc * cloud * (0.6 + 0.9 * max(mu, 0.0)) * (0.15 + 1.7 * detail * detail) * 0.55;
  float tw = smoothstep(-0.2, 0.03, mu);
  surf += ESUN * 0.003 * tw * tw * vec3(0.3, 0.42, 0.85) * (0.35 + cloud);
  return surf;
}

vec3 starField(vec3 rd) {
  vec3 a = abs(rd);
  vec2 uv;
  float face;
  if (a.x > a.y && a.x > a.z) { uv = rd.yz / a.x; face = rd.x > 0.0 ? 0.0 : 1.0; }
  else if (a.y > a.z) { uv = rd.xz / a.y; face = rd.y > 0.0 ? 2.0 : 3.0; }
  else { uv = rd.xy / a.z; face = rd.z > 0.0 ? 4.0 : 5.0; }
  vec3 col = vec3(0.0);
  for (int l = 0; l < 2; l++) {
    float N = l == 0 ? 30.0 : 80.0;
    vec2 g = uv * N;
    vec2 id = floor(g);
    vec3 h = hash33(vec3(id, face * 13.0 + float(l) * 101.0));
    if (h.z < (l == 0 ? 0.3 : 0.14)) {
      vec2 d = g - id - (0.15 + 0.7 * h.xy);
      float s = max(uPx * N * 0.75, 1e-4);
      float m = fract(h.z * 37.31);
      float bri = l == 0 ? 0.05 + 1.8 * m * m * m * m * m : 0.012 + 0.07 * m * m * m;
      // energia constante: um ponto de luz, nunca maior que ~1,5 pixel
      float k = 0.0004 / (s * s / (N * N) + 0.0000002);
      vec3 tint = mix(vec3(0.62, 0.74, 1.0), vec3(1.0, 0.82, 0.6), fract(h.x * 7.7 + h.y * 3.1));
      col += tint * bri * exp(-dot(d, d) / (s * s)) * min(k, 1.0) * 1.0;
    }
  }
  return col;
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 p = (fc - 0.5 * uRes) / (0.5 * uRes.y) * uScale;
  float rho = length(p);
  float th = mix(atan(rho), rho, uFish);
  vec3 dc = rho > 1e-6 ? vec3(p / rho * sin(th), cos(th)) : vec3(0.0, 0.0, 1.0);
  vec3 rd = normalize(uRot * dc);
  vec3 ro = uCam;

  float b = dot(ro, rd);
  float r2 = dot(ro, ro);
  float dmin = b < 0.0 ? sqrt(max(r2 - b * b, 0.0)) : sqrt(r2);
  float fw = max(fwidth(dmin), 1e-6);
  float cov = clamp((1.0 - dmin) / fw + 0.5, 0.0, 1.0);
  float discG = b * b - (r2 - 1.0);
  float tg = discG > 0.0 ? -b - sqrt(discG) : -b;
  vec3 G = normalize(ro + rd * max(tg, 0.0));
  vec3 Gt = uGround * G;
  float fp = length(fwidth(Gt));

  // atmosfera
  vec3 Ln = vec3(0.0);
  vec3 Lf = vec3(0.0);
  vec2 od = vec2(0.0);
  vec3 Tg = vec3(1.0);
  vec3 Tall = vec3(1.0);
  float RA = 1.0 + ZTOP;
  float discA = b * b - (r2 - RA * RA);
  float mu = dot(rd, uSun);
  if (discA > 0.0 && b < 0.0) {
    float sq = sqrt(discA);
    float t0 = -b - sq;
    float t1 = -b + sq;
    float tm = -b;
    float tn = discG > 0.0 ? tg : tm;
    float pR = 0.0597 * (1.0 + mu * mu);
    float pM = 0.8 * hg(mu, 0.76) + 0.2 * hg(mu, 0.97);
    int nn = dmin < 0.97 ? 6 : 13;
    march(ro, rd, t0, tn, nn, true, pR, pM, od, Ln);
    Tg = exp(-BR * od.x - BMX * od.y);
    if (cov < 1.0) {
      march(ro, rd, tm, t1, 12, false, pR, pM, od, Lf);
    }
    Tall = exp(-BR * od.x - BMX * od.y);
    // ozônio no caminho do olhar: uma travessia até o chão, duas no céu
    float ozv = ozoneCol(sqrt(r2), b / sqrt(r2)) * 0.5;
    vec3 tOz = exp(-KOZ * ozv);
    Ln *= sqrt(tOz);
    Lf *= tOz;
    Tg *= tOz;
    Tall *= tOz * mix(tOz, vec3(1.0), cov);
  }
  vec3 col = Ln * ESUN + Lf * ESUN * (1.0 - cov);

  // superfície
  if (cov > 0.0) {
    col += cov * Tg * shadeGround(G, Gt, fp);
  }

  // airglow: a linha verde fina (O 557,7 nm) a ~100 km, mais clara de lado
  {
    float ra = 1.0 + ZAG;
    float u = dmin - ra;
    float line = exp(-u * u / (2.0 * WAG * WAG));
    float tail = dmin < ra ? WAG * ra / sqrt(ra * ra - dmin * dmin + 2.7 * ra * WAG) : 0.0;
    float ra2 = 1.0 + ZAG * 1.5;
    float w2 = WAG * 4.0;
    float u2 = dmin - ra2;
    float red = exp(-u2 * u2 / (2.0 * w2 * w2));
    float side = b < 0.0 ? mix(1.0, 0.12, cov) : 0.0;
    col += side * (vec3(0.5, 1.0, 0.38) * (line * 0.042 + tail * 0.35) + vec3(1.0, 0.3, 0.2) * red * 0.0012);
  }

  // céu: estrelas, coroa e luz zodiacal, disco do Sol
  float sky = 1.0 - cov;
  if (sky > 0.0) {
    float ang = atan(length(cross(rd, uSun)), mu);
    float glareDim = 1.0 - 0.9 * (1.0 - smoothstep(0.0, 0.6, length((fc - uSunScr.xy) / uRes.y))) * uSunScr.w;
    vec3 s = starField(rd) * glareDim * (1.0 - 0.8 * uFlood) * (1.0 - uSettle);
    float cor = pow(max(ang / uSunR, 1.0), -2.4);
    float beta = asin(clamp(dot(rd, uEcl), -1.0, 1.0));
    float wz = 0.035 + 0.2 * ang;
    float zl = exp(-beta * beta / (2.0 * wz * wz)) * pow(max(ang, 0.03), -1.25);
    vec3 halo = vec3(1.0, 0.9, 0.78) * cor * 60.0 + vec3(0.92, 0.9, 0.84) * zl * uDawnScr.w;
    float disk = 1.0 - smoothstep(uSunR - uPx, uSunR + uPx, ang);
    float rr = clamp(ang / uSunR, 0.0, 1.0);
    float ld = 1.0 - 0.55 * (1.0 - sqrt(max(1.0 - rr * rr, 0.0)));
    vec3 sun = vec3(1.0, 0.97, 0.92) * 3000.0 * disk * ld;
    col += sky * Tall * (s + halo + sun);
  }

  // óptica da câmera: clarão, raios de difração e risco anamórfico
  {
    float um = min(uRes.x, uRes.y);
    vec2 dv = (fc - uSunScr.xy) / um;
    float rr = length(dv);
    float vf = uSunScr.w;
    vec3 gl = vec3(1.0, 0.84, 0.58) * (exp(-rr / 0.004) * 30.0 + exp(-rr / 0.018) * 2.6 + exp(-rr / 0.06) * 0.3 + 0.015 / (1.0 + rr * rr * 60.0));
    float spk = 0.0;
    float px = 1.0 / um;
    for (int k = 0; k < 3; k++) {
      float a = 0.30 + float(k) * 1.0472;
      vec2 dir = vec2(cos(a), sin(a));
      float along = abs(dot(dv, dir));
      float across = abs(dot(dv, vec2(-dir.y, dir.x))) / px / uDpr;
      spk += exp(-across * across / 0.9) * exp(-along / 0.032) + 0.25 * exp(-across * across / 9.0) * exp(-along / 0.018);
    }
    gl += vec3(1.0, 0.93, 0.82) * spk * 1.6 * (1.0 - 0.85 * uSettle);
    float ay = abs(dv.y) / px / uDpr;
    float streak = exp(-ay * ay / 1.6) * exp(-abs(dv.x) / 0.22) + 0.4 * exp(-ay * ay / 30.0) * exp(-abs(dv.x) / 0.1);
    gl += vec3(0.45, 0.66, 1.0) * streak * 0.28 * (1.0 - 0.85 * uSettle);
    col += gl * vf;

    // a aurora antes do Sol: o brilho da faixa vaza pela lente
    vec2 dd = (fc - uDawnScr.xy) / um;
    float al = dot(dd, uLimbTan);
    float ac = dot(dd, vec2(-uLimbTan.y, uLimbTan.x));
    float e = length(vec2(al * 0.28, ac));
    col += vec3(1.0, 0.5, 0.2) * (exp(-e / 0.03) * 0.35 + exp(-e / 0.1) * 0.05) * uDawnScr.z;

    // desfecho: a luz inunda a tela
    col += uFlood * vec3(1.0, 0.36, 0.09) * (2.4 * exp(-rr / 0.3) + 0.8 * exp(-rr / 0.75) + 0.06);
  }

  col = max(col, vec3(0.0)) * uExpo;
  col = aces(col);
  col = pow(col, vec3(1.0 / 2.2));
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(luma), col, 1.14), vec3(0.0));

  // repouso dourado, pronto para a tela de abertura
  {
    vec2 dv = (fc - uSunScr.xy) / uRes.y;
    float rs2 = dot(dv, dv);
    vec3 gold = vec3(0.886, 0.722, 0.447);
    vec3 calm = col * vec3(0.8, 0.6, 0.38) * 0.3 + gold * 0.56 * exp(-rs2 / 0.12) + vec3(0.6, 0.38, 0.16) * (0.24 * exp(-rs2 / 0.6) + 0.025);
    col = mix(col, calm, uSettle);
  }
  vec2 q = fc / uRes - 0.5;
  col *= 1.0 - 0.32 * dot(q, q) * 1.6;

  col += (hash12(fc) + hash12(fc + 17.3) - 1.0) / 255.0;
  frag = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

// ---------- álgebra pequena (mat3 em colunas) ----------
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mulTV = (m: Mat3, v: Vec3): Vec3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];
const mulMM = (a: Mat3, b: Mat3): Mat3 => {
  const r: Mat3 = new Array<number>(9);
  for (let c = 0; c < 3; c++)
    for (let i = 0; i < 3; i++) r[c * 3 + i] = a[i] * b[c * 3] + a[3 + i] * b[c * 3 + 1] + a[6 + i] * b[c * 3 + 2];
  return r;
};
const fromCols = (x: Vec3, y: Vec3, z: Vec3): Mat3 => [x[0], x[1], x[2], y[0], y[1], y[2], z[0], z[1], z[2]];
function rotAxis(k: Vec3, ang: number): Mat3 {
  const [x, y, z] = k;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const t = 1 - c;
  return [
    t * x * x + c, t * x * y + s * z, t * x * z - s * y,
    t * x * y - s * z, t * y * y + c, t * y * z + s * x,
    t * x * z + s * y, t * y * z - s * x, t * z * z + c,
  ];
}
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// lente: mistura de retilínea com olho de peixe (equidistante)
const lensTheta = (rho: number, fish: number): number => (1 - fish) * Math.atan(rho) + fish * rho;
function lensRho(theta: number, fish: number): number {
  let r = Math.tan(Math.min(theta, 1.3));
  for (let i = 0; i < 30; i++) {
    const f = lensTheta(r, fish) - theta;
    const d = (1 - fish) / (1 + r * r) + fish;
    r = Math.max(0, r - f / d);
  }
  return r;
}
function lensDir(px: number, py: number, fish: number): Vec3 {
  const rho = Math.hypot(px, py);
  if (rho < 1e-9) return [0, 0, 1];
  const th = lensTheta(rho, fish);
  const s = Math.sin(th) / rho;
  return [px * s, py * s, Math.cos(th)];
}

/** o WebGL devolve `null` quando não consegue criar o objeto (contexto perdido, sem memória) */
function obter<T>(objeto: T | null, nome: string): T {
  if (!objeto) throw new Error('WebGL: não criou ' + nome);
  return objeto;
}

function compilar(gl: WebGL2RenderingContext, tipo: number, fonte: string): WebGLShader {
  const sh = obter(gl.createShader(tipo), 'shader');
  gl.shaderSource(sh, fonte);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('shader: ' + log);
  }
  return sh;
}

/** a composição da câmera, refeita a cada `redimensionar` */
interface Camera {
  pos: Vec3;
  M: Mat3 | null;
  scale: number;
  fish: number;
  W: number;
  H: number;
  dpr: number;
}

export const nascer: DefinicaoDaCena = {
  id: 'nascer',
  duracaoFinal: 2.8,
  criar(canvas: HTMLCanvasElement | OffscreenCanvas): Cena {
    const contexto = canvas.getContext('webgl2', ATRIBUTOS);
    if (!contexto) throw new Error('WebGL2 indisponível');
    const gl: WebGL2RenderingContext = contexto;

    const vs = compilar(gl, gl.VERTEX_SHADER, VS);
    const fs = compilar(gl, gl.FRAGMENT_SHADER, FS);
    const prog = obter(gl.createProgram(), 'programa');
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost()) {
      throw new Error('programa: ' + gl.getProgramInfoLog(prog));
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    const U: Record<string, WebGLUniformLocation | null> = {};
    const nu: number = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) || 0;
    for (let i = 0; i < nu; i++) {
      const info = gl.getActiveUniform(prog, i);
      if (info) U[info.name] = gl.getUniformLocation(prog, info.name);
    }
    const vao = obter(gl.createVertexArray(), 'vao');

    // ruído de valor 64³ (4 canais independentes), semente fixa
    const N = 64;
    const dados = new Uint8Array(N * N * N * 4);
    let sem = 0x2545f491;
    for (let i = 0; i < dados.length; i++) {
      sem ^= sem << 13;
      sem ^= sem >>> 17;
      sem ^= sem << 5;
      dados[i] = (sem >>> 8) & 255;
    }
    const tex = obter(gl.createTexture(), 'textura');
    gl.bindTexture(gl.TEXTURE_3D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, N, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, dados);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.REPEAT);

    // composição (refeita a cada redimensionar)
    const cam: Camera = { pos: [0, 1 + ALT, 0], M: null, scale: 1, fish: 0.5, W: 1, H: 1, dpr: 1 };
    const dip = Math.acos(1 / (1 + ALT));

    function redimensionar(w: number, h: number, dpr: number): void {
      let d = dpr;
      if (w * h * d * d > MAX_PIXELS) d = Math.sqrt(MAX_PIXELS / (w * h));
      const W = Math.max(1, Math.round(w * d));
      const H = Math.max(1, Math.round(h * d));
      canvas.width = W;
      canvas.height = H;
      cam.W = W;
      cam.H = H;
      cam.dpr = d;

      // retrato (celular) ↔ paisagem (mesa), misturados pela proporção
      const k = smooth(0.6, 1.3, w / h);
      const vHalf = lerp(40, 25, k) * GRAU;
      const fish = lerp(0.8, 0.55, k);
      const roll = lerp(-5, -8, k) * GRAU;
      const tx = lerp(0.0, 0.1, k);
      const ty = lerp(-0.38, -0.24, k);
      cam.fish = fish;
      // escala tal que a borda de cima fique em vHalf
      let s = Math.tan(vHalf);
      for (let i = 0; i < 30; i++) {
        const f = lensTheta(s, fish) - vHalf;
        s -= f / ((1 - fish) / (1 + s * s) + fish);
      }
      cam.scale = s;

      const L: Vec3 = [0, -Math.sin(dip), -Math.cos(dip)];
      const r0 = norm(cross(L, [0, 1, 0]));
      const u0 = cross(r0, L);
      const cr = Math.cos(roll);
      const sr = Math.sin(roll);
      const r1: Vec3 = [r0[0] * cr + u0[0] * sr, r0[1] * cr + u0[1] * sr, r0[2] * cr + u0[2] * sr];
      const u1: Vec3 = [u0[0] * cr - r0[0] * sr, u0[1] * cr - r0[1] * sr, u0[2] * cr - r0[2] * sr];
      const B = fromCols(r1, u1, L);
      const dcam = lensDir(tx * s, ty * s, fish);
      const ax = cross(dcam, [0, 0, 1]);
      const sa = Math.hypot(ax[0], ax[1], ax[2]);
      const A = sa > 1e-9 ? rotAxis(norm(ax), Math.atan2(sa, dcam[2])) : [1, 0, 0, 0, 1, 0, 0, 0, 1];
      cam.M = mulMM(B, A);
    }

    function projetar(M: Mat3, v: Vec3): [number, number] | null {
      const c = mulTV(M, v);
      if (c[2] <= 0.02) return null;
      const th = Math.acos(Math.min(1, Math.max(-1, c[2])));
      const sx = Math.hypot(c[0], c[1]);
      const rho = lensRho(th, cam.fish);
      const px = sx > 1e-12 ? (rho * c[0]) / sx : 0;
      const py = sx > 1e-12 ? (rho * c[1]) / sx : 0;
      return [(px / cam.scale) * 0.5 * cam.H + 0.5 * cam.W, (py / cam.scale) * 0.5 * cam.H + 0.5 * cam.H];
    }

    const R0 = rotAxis(norm([0.31, 0.83, 0.47]), 5.2);

    function quadro(e: EstadoDaCena): void {
      if (gl.isContextLost() || !cam.M) return;
      const lento = e.reduzido ? 0.25 : 1;
      const t = e.t * lento;
      const s = clamp01(e.suave);
      const f = clamp01(e.fim);

      // o Sol: de ~16° abaixo do limbo até a borda romper em 95–100 %
      let delta = -0.15 * GRAU + (DELTA0 + 0.15 * GRAU) * Math.pow(1 - s, GAMA);
      const sobe = smooth(0, 0.7, f);
      delta -= 2.6 * GRAU * (1 - (1 - sobe) * (1 - sobe));
      const aurora = clamp01(1 - delta / DELTA0);
      const es = -dip - delta;
      const sol: Vec3 = [0, Math.sin(es), -Math.cos(es)];

      // deriva lenta da câmera
      const yaw = 0.9 * GRAU * Math.sin(t * 0.115 + 0.4) + 0.35 * GRAU * Math.sin(t * 0.043 + 2.0);
      const pit = 0.35 * GRAU * Math.sin(t * 0.091 + 1.3);
      const rol = 0.5 * GRAU * Math.sin(t * 0.067 + 2.6);
      const D = mulMM(mulMM(rotAxis([0, 1, 0], yaw), rotAxis([1, 0, 0], pit)), rotAxis([0, 0, 1], rol));
      const M = mulMM(cam.M, D);

      // a estação anda: o chão corre devagar em direção à câmera
      const Gr = mulMM(rotAxis([1, 0, 0], -0.0012 * t), R0);

      // eclíptica inclinada para a direita, passando pelo Sol
      const Y: Vec3 = [0, 1, 0];
      const ys = dot(Y, sol);
      const upS = norm([Y[0] - ys * sol[0], Y[1] - ys * sol[1], Y[2] - ys * sol[2]]);
      const rtS = cross(sol, upS);
      const tau = 32 * GRAU;
      const e2: Vec3 = [
        Math.cos(tau) * upS[0] + Math.sin(tau) * rtS[0],
        Math.cos(tau) * upS[1] + Math.sin(tau) * rtS[1],
        Math.cos(tau) * upS[2] + Math.sin(tau) * rtS[2],
      ];
      const ecl = norm(cross(sol, e2));

      // pontos na tela: o Sol, o limbo sob ele e a direção do limbo
      const L: Vec3 = [0, -Math.sin(dip), -Math.cos(dip)];
      const L2: Vec3 = [Math.sin(0.02) * Math.cos(dip), -Math.sin(dip), -Math.cos(0.02) * Math.cos(dip)];
      const pS = projetar(M, sol) || [cam.W * 0.5, cam.H * 0.3];
      const pL = projetar(M, L) || pS;
      const pL2 = projetar(M, L2) || [pL[0] + 1, pL[1]];
      let tx = pL2[0] - pL[0];
      let ty = pL2[1] - pL[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;

      // quanto do disco já passou do limbo
      const x = Math.min(1, Math.max(-1, -delta / SOL_R));
      const frac = (Math.acos(-x) + x * Math.sqrt(1 - x * x)) / Math.PI;

      // desfecho: a luz inunda e depois assenta num dourado escuro
      let flood = smooth(0.04, 0.34, f) * (1 - 0.75 * smooth(0.4, 0.95, f));
      if (e.reduzido) flood *= 0.45;
      const assenta = smooth(0.38, 1.0, f);

      const expo = lerp(1.9, 0.75, smooth(0.15, 1.0, aurora)) * (1 - 0.2 * smooth(0.0, 0.5, f));
      const brilhoAurora = Math.pow(aurora, 6) * (1 - frac * 0.6);
      const zodi = 0.0035 * (1 - 0.6 * aurora);

      gl.viewport(0, 0, cam.W, cam.H);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_3D, tex);
      gl.uniform1i(U.uNoise, 0);
      gl.uniform2f(U.uRes, cam.W, cam.H);
      gl.uniform1f(U.uDpr, cam.dpr);
      gl.uniform3fv(U.uCam, cam.pos);
      gl.uniformMatrix3fv(U.uRot, false, M);
      gl.uniform1f(U.uScale, cam.scale);
      gl.uniform1f(U.uFish, cam.fish);
      gl.uniform3fv(U.uSun, sol);
      gl.uniform3fv(U.uEcl, ecl);
      gl.uniformMatrix3fv(U.uGround, false, Gr);
      gl.uniform1f(U.uTime, t);
      gl.uniform1f(U.uExpo, expo);
      gl.uniform4f(U.uSunScr, pS[0], pS[1], frac, frac);
      gl.uniform4f(U.uDawnScr, pL[0], pL[1], brilhoAurora, zodi);
      gl.uniform2f(U.uLimbTan, tx, ty);
      gl.uniform1f(U.uPx, (2 * Math.atan(cam.scale)) / cam.H);
      gl.uniform1f(U.uFlood, flood);
      gl.uniform1f(U.uSettle, assenta);
      gl.uniform1f(U.uFlash, e.reduzido ? 0 : 1);
      gl.uniform1f(U.uSunR, SOL_R);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function soltar(): void {
      try {
        gl.deleteTexture(tex);
        gl.deleteVertexArray(vao);
        gl.deleteProgram(prog);
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
