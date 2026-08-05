// ============================================================
// Shaders da nebulosa volumétrica — raymarching em tela cheia
// com dupla paleta (OIII × H-alfa), espalhamento do Sol e luz
// das supergigantes Betelgeuse/Rigel embutidas nas nuvens.
// ============================================================
import { WORLD } from '../config';
import { GLSL_CARTOGRAPHY } from '../cartography/galacticModel';
import { GLSL_NOISE, GLSL_GALAXY, GLSL_DENSITY } from './common';
import { GLSL_UNRESOLVED } from '../world/wrappedStars';

const cool = WORLD.gasColorCool.map((v) => v.toFixed(3)).join(', ');
const warm = WORLD.gasColorWarm.map((v) => v.toFixed(3)).join(', ');

export const NEBULA_VERT = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.999, 1.0);
}
`;

const NEBULA_FRAG_HEAD = /* glsl */ `
precision highp float;

uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamFwd;
uniform float uTanHalfFov;
uniform float uAspect;
uniform vec2 uResolution;
uniform float uTime;
uniform int uSteps;
uniform vec3 uSunPos;
uniform float uFade;

// luzes embutidas: Betelgeuse (vermelha) e Rigel (azul)
uniform vec3 uLightPos[2];
uniform vec3 uLightColor[2];

// LUT equiretangular da luz do disco (renderizada 1×/frame em
// 256×128): a integração distante depende só da DIREÇÃO do raio,
// então custa um fetch por pixel em vez de ~20 passos pesados.
uniform sampler2D uBandLUT;
// tile 64×64 de blue noise (blueNoise.ts) — jitter do raymarch
uniform sampler2D uBlueNoise;

${GLSL_NOISE}
${GLSL_GALAXY}
${GLSL_CARTOGRAPHY}
${GLSL_DENSITY}

const vec3 GAS_COOL = vec3(${cool});
const vec3 GAS_WARM = vec3(${warm});

vec3 palette(vec3 p, float d) {
  float m = fbm(p * 0.035 + 7.7, 3);
  float k = smoothstep(0.32, 0.72, m);
  // núcleos densos → H-alfa quente; filamentos tênues → azul de reflexão
  float byDensity = smoothstep(0.15, 1.1, d);
  vec3 col = mix(GAS_COOL, GAS_WARM, clamp(k * 0.55 + byDensity * 0.6, 0.0, 1.0));
  // toques magenta em filamentos densos (H-alfa + SII)
  col = mix(col, vec3(0.62, 0.22, 0.38), smoothstep(0.75, 0.95, m) * byDensity * 0.45);
  return col;
}

// direção → UV equiretangular no referencial galáctico (a costura em
// lon = ±π é resolvida pelo RepeatWrapping horizontal do LUT)
vec2 dirToBand(vec3 rd) {
  float lat = asin(clamp(dot(rd, GAL_N), -1.0, 1.0));
  float lon = atan(dot(rd, GAL_Y), dot(rd, GAL_X));
  return vec2(lon * 0.15915494 + 0.5, lat * 0.31830989 + 0.5);
}
`;

// Integra a luz do disco da Via Láctea ao longo do raio — o equivalente
// procedural de uma exposição astrofotográfica longa. Depende apenas de
// (posição da câmera, direção), então roda UMA vez por frame num LUT
// 256×128 com 24 passos (mais que os 10–20 antigos), não por pixel.
const BAND_INTEGRATION = /* glsl */ `
vec3 integrateGalacticDisk(vec3 ro, vec3 rd) {
  vec3 light = vec3(0.0);
  float transmission = 1.0;
  float previousT = 180.0;

  for (int j = 0; j < 24; j++) {
    float f = (float(j) + 0.62) / 24.0;
    float t = 180.0 + 22000.0 * f * f;
    float dt = max(t - previousT, 1.0);
    previousT = t;

    vec3 p = ro + rd * t;
    vec3 q = p - GAL_CENTER;
    float rawZ = dot(q, GAL_N);
    vec3 inPlane = q - GAL_N * rawZ;
    float radius = length(inPlane);
    float theta = atan(dot(q, GAL_Y), dot(q, GAL_X));
    float z = rawZ - galWarpHeight(radius, theta);
    float flare = clamp((radius - 7500.0) / 9300.0, 0.0, 1.0);
    flare *= flare;
    float edge = 1.0 - smoothstep(15500.0, GAL_DISK_RADIUS, radius);

    float thinHeight = mix(210.0, 460.0, flare);
    float thickHeight = mix(610.0, 1080.0, flare);
    float thinDisk =
      exp(-radius / 5200.0) * exp(-abs(z) / thinHeight) * edge;
    float thickDisk =
      exp(-radius / 6500.0) * exp(-abs(z) / thickHeight) * edge * 0.105;

    // R(+29°) — crista no azimute −29°, igual à barra do CPU
    float cb = cos(0.506145);
    float sb = sin(0.506145);
    vec2 barP = mat2(cb, sb, -sb, cb) *
      vec2(dot(q, GAL_X), dot(q, GAL_Y));
    float bar =
      exp(-abs(barP.x) / 2050.0) *
      exp(-abs(barP.y) / 430.0) *
      exp(-abs(z) / 390.0) *
      (1.0 - smoothstep(4650.0, 5400.0, abs(barP.x)));
    float bulge = exp(-length(q) / 1050.0) * 2.45 + bar * 0.82;

    // Estrutura fractal em escalas de quiloparsecs e centenas de parsecs.
    float broad = fbm(q * 0.00062 + 13.7, 2);
    float filaments = fbm(q * 0.0021 + 37.1, 2);
    // Variante de GÁS (4 braços parecidos) para TODO o raymarch,
    // inclusive o termo estelar logo abaixo — decisão, não descuido:
    // com o peso estelar 0,42·(1±profundidade) o par fraco zera dentro
    // do círculo solar (rodada 30: a profundidade só cai de 7,6 a
    // 11,5 kpc, e o Sol está em 8,15), e um realce estelar
    // 2-braços-com-zeros apagaria as nuvens estelares de Sagitário da
    // faixa e decorrelacionaria estrelas do gás na vista interna, que
    // ainda não tem gate (panorama ESO, lacuna 2 do NORTE). Quando o
    // gate existir, o termo estelar é o candidato a voltar para
    // galMajorArms pesado, com um piso > 0 no par fraco.
    float arms = clamp(
      galMajorArmsGas(theta, radius, 155.0) +
      galLocalArm(theta, radius, 180.0),
      0.0,
      1.0
    );
    // handoff da unificação 2: a fração da luz estelar que as cascas
    // resolvem como estrelas individuais a esta distância sai da
    // integrada — mesmo fator das partículas (GLSL_UNRESOLVED). Os
    // termos de gás (dust/hii) não entram: casca não desenha gás.
    float stellar =
      (thinDisk *
        mix(0.22, 1.12, broad) *
        mix(0.58, 1.28, arms) +
      thickDisk +
      bulge) * unresolved(t);

    // Poeira fria acumula na camada mais fina e recorta o centro em
    // filamentos negros, como as grandes fendas da astrofotografia.
    float dustProc = thinDisk * mix(0.58, 1.35, arms) *
      smoothstep(0.44, 0.76, broad * 0.68 + filaments * 0.42);
    // Onde o APOGEE mediu estruturas densas (cobertura começa a
    // ~1 kpc do Sol; as fendas locais tipo Great Rift continuam
    // procedurais), a fenda real SOMA-SE ao procedural; o nível
    // difuso do survey não escurece nada. Perfil vertical h ≈ 150 pc.
    vec2 cart = texture2D(
      uDustMap,
      vec2(dot(q, GAL_X), dot(q, GAL_Y)) / (2.0 * GAL_DISK_RADIUS) + 0.5
    ).rg;
    float obsLanes = smoothstep(0.56, 0.88, cart.r);
    float dustObs = obsLanes * exp(-abs(z) / 150.0) * 2.2 * mix(0.8, 1.15, arms);
    float dust = dustProc + dustObs * cart.g * uCartBlend;

    float towardCenter = clamp(bulge * 0.6 + exp(-radius / 2600.0), 0.0, 1.0);
    vec3 diskColor = mix(
      vec3(0.30, 0.43, 0.78),
      vec3(1.00, 0.72, 0.42),
      towardCenter * 0.82 + broad * 0.18
    );

    // Bolsões H-alfa/OIII pontuais: presentes no disco, nunca como
    // um véu magenta uniforme.
    float hii = thinDisk * (0.22 + arms * 0.78) *
      smoothstep(0.76, 0.94, filaments) *
      smoothstep(1800.0, 5200.0, radius);
    vec3 emission = diskColor * stellar;
    emission += vec3(0.95, 0.12, 0.32) * hii * 0.72;
    emission += vec3(0.12, 0.48, 0.72) * hii * (1.0 - broad) * 0.42;

    light += transmission * emission * dt * 0.000052;
    transmission *= exp(-dust * dt * 0.00035);
    if (transmission < 0.02) break;
  }

  return light / (1.0 + light * 0.55);
}
`;

// Passe de suavização do raymarch: 4 taps em ±meio-texel (com filtro
// linear = tent 3×3 efetivo). O blue noise do jitter vive SÓ na alta
// frequência — este blur o apaga onde o conteúdo (nuvem) é liso por
// natureza; borda de nuvem perde ~2 px de tela em meia-res, invisível.
export const NEBULA_BLUR_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uTexel;
void main() {
  vec2 uv = gl_FragCoord.xy * uTexel;
  vec3 c = texture2D(uSrc, uv + uTexel * vec2( 0.5,  0.5)).rgb
         + texture2D(uSrc, uv + uTexel * vec2(-0.5,  0.5)).rgb
         + texture2D(uSrc, uv + uTexel * vec2( 0.5, -0.5)).rgb
         + texture2D(uSrc, uv + uTexel * vec2(-0.5, -0.5)).rgb;
  gl_FragColor = vec4(c * 0.25, 1.0);
}
`;

// Fragment do LUT da faixa: uma direção por texel (256×128 equirect
// no referencial galáctico), integração distante completa.
export const NEBULA_LUT_FRAG = /* glsl */ `
precision highp float;

uniform vec3 uCamPos;
uniform sampler2D uDustMap;
uniform float uCartBlend;

${GLSL_NOISE}
${GLSL_GALAXY}
${GLSL_CARTOGRAPHY}
${GLSL_UNRESOLVED}
${BAND_INTEGRATION}

void main() {
  vec2 uv = gl_FragCoord.xy / vec2(256.0, 128.0);
  float lon = (uv.x - 0.5) * 6.2831853;
  float lat = (uv.y - 0.5) * 3.14159265;
  float cl = cos(lat);
  vec3 rd = GAL_X * (cl * cos(lon)) + GAL_Y * (cl * sin(lon)) + GAL_N * sin(lat);
  gl_FragColor = vec4(integrateGalacticDisk(uCamPos, rd), 1.0);
}
`;

// Corpo principal do raymarch — concatenado ao cabeçalho no export.
const NEBULA_MAIN = /* glsl */ `
void main() {
  vec2 uv = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;
  vec3 rd = normalize(
    uCamFwd +
    uCamRight * (uv.x * uTanHalfFov * uAspect) +
    uCamUp * (uv.y * uTanHalfFov));
  vec3 ro = uCamPos;

  // jitter anti-banding por BLUE NOISE (medido nas capturas t=110): IGN
  // imprimia xadrez estático ~2 px (estrutura periódica; sem TAA não se
  // dissolve, meia-res amplia), hash branco virava manchas de baixa
  // frequência que o upsample não remove. Blue noise = erro só em alta
  // frequência, sem período — o ótimo estático. Deslocamento COERENTE da
  // partição preservado (variância por pixel baixa, só termos de borda).
  float jitter = texture2D(uBlueNoise, gl_FragCoord.xy / 64.0).r;

  float tMax = 650.0;

  // O gás vive numa camada |z_gal| < 1600 pc: recorta o trecho útil
  // do raio e dimensiona os passos por ele — olhar para fora do
  // plano fica quase de graça, sem mudar o visual dentro da camada.
  float z0 = dot(ro - GAL_CENTER, GAL_N);
  float dz = dot(rd, GAL_N);
  float tLo = 0.0;
  float tHi = tMax;
  if (abs(dz) > 1e-4) {
    float ta = (-1600.0 - z0) / dz;
    float tb = (1600.0 - z0) / dz;
    tLo = clamp(min(ta, tb), 0.0, tMax);
    tHi = clamp(max(ta, tb), 0.0, tMax);
  } else if (abs(z0) > 1600.0) {
    tHi = 0.0;
  }
  float span = tHi - tLo;
  int N = int(float(uSteps) * clamp(span / tMax, 0.0, 1.0) + 0.5);

  vec3 acc = vec3(0.0);
  float T = 1.0;
  vec3 galacticLight = texture2D(uBandLUT, dirToBand(rd)).rgb;
  // +1e-4: normalize(vec3(0)) = NaN quando ?pos=0,0,0 (origem exata)
  vec3 toSun = normalize(uSunPos - ro + vec3(1e-4));
  float phaseSun = pow(max(dot(rd, toSun), 0.0), 24.0) * 2.2 +
                   pow(max(dot(rd, toSun), 0.0), 4.0) * 0.35;

  for (int i = 0; i < 96; i++) {
    if (i >= N || T < 0.015) break;
    // Amostragem quadrática: alta resolução perto da câmera, mas o
    // último passo realmente alcança 650 pc. A progressão anterior
    // percorria só ~4 pc e nunca chegava às nuvens da viagem.
    // (amostra por passo com hash próprio foi testada e granula demais:
    // uma amostra independente por célula grande = variância alta; o
    // deslocamento coerente da partição erra pouco e sem estrutura)
    float f0 = clamp((float(i) + jitter) / float(N), 0.0, 1.0);
    float f1 = clamp((float(i + 1) + jitter) / float(N), 0.0, 1.0);
    float t0 = tLo + span * f0 * f0;
    float t1 = tLo + span * f1 * f1;
    float t = (t0 + t1) * 0.5;
    float dt = max(t1 - t0, 0.01);
    vec3 p = ro + rd * t;
    float d = nebulaDensity(p, 4);

    if (d > 0.003) {
      // ambiente frio proporcional ao envelope do gás — reusa o valor
      // que nebulaDensity acabou de calcular para a MESMA amostra
      float slab = min(gGasEnvelope * 0.9, 1.0);

      // auto-absorção: corações densos são escuros, bordas brilham
      // (como nas nebulosas escuras reais — Barnard 68, Pilares da Criação)
      float selfShadow = exp(-d * 1.65);
      float rim = 1.0 - selfShadow; // concentra a emissão nas bordas

      // Emissão bicolor integrada por alpha volumétrico. A cor se
      // acumula sem depender do tamanho do passo e os núcleos densos
      // preservam silhuetas escuras em vez de virar branco uniforme.
      vec3 sampleColor = palette(p, d) * (0.22 + rim * 1.55);
      sampleColor *= 0.55 + min(d, 1.8) * 0.72;
      sampleColor *= exp(-max(d - 0.9, 0.0) * 0.55);
      sampleColor += GAS_COOL * slab * 0.012;

      // Região HII hero no corredor para Betelgeuse: uma cavidade
      // ionizada localizada — o fbm dos filamentos só roda dentro
      // do volume dela (fora, heroVolume < 1e-5 e não compra nada)
      vec3 hq = (p - vec3(5.5, 132.0, 18.0)) / 24.0;
      float hq2 = dot(hq, hq);
      if (hq2 < 9.0) {
        float heroVolume = exp(-hq2 * 1.25);
        float heroFilaments = smoothstep(0.58, 0.84, fbm(p * 0.115 + 63.7, 3));
        float heroHii = heroVolume * heroFilaments * heroFilaments;
        sampleColor += vec3(1.0, 0.09, 0.30) * heroHii * (0.08 + rim * 0.92);
        sampleColor += vec3(0.18, 0.48, 0.82) * heroHii * (1.0 - heroFilaments) * 0.16;
      }

      // luz do Sol (local)
      float dSun = length(p - uSunPos);
      sampleColor += vec3(1.0, 0.66, 0.3) * phaseSun * rim * exp(-dSun * 0.1) * 1.1;

      // luz das supergigantes embutidas no gás (falloff suave)
      for (int L = 0; L < 2; L++) {
        vec3 lv = uLightPos[L] - p;
        float ld = length(lv);
        sampleColor += uLightColor[L] * rim * (3.2 / (1.0 + ld * ld * 0.06));
      }

      // Beer–Lambert: cada passo deposita somente sua fração óptica.
      float alpha = 1.0 - exp(-d * dt * 0.055);
      acc += T * sampleColor * alpha;
      T *= 1.0 - alpha;
    }
  }

  // A luz galáctica está atrás das nuvens locais: regiões densas
  // realmente ocultam a faixa quando a câmera mergulha nelas.
  acc += galacticLight * T;

  // Véu tênue de fundo, limitado ao plano galáctico.
  float gpRay = dot(rd, GAL_N);
  acc += GAS_COOL * exp(-gpRay * gpRay * 5.0) * 0.0035 * T;

  // joelho suave — preserva gradientes, evita saturação uniforme
  acc = acc / (1.0 + acc * 0.72);
  acc *= uFade; // crossfade para o modelo galáctico na subida

  gl_FragColor = vec4(acc, 1.0);
}
`;

export const NEBULA_FRAG = NEBULA_FRAG_HEAD + NEBULA_MAIN;
