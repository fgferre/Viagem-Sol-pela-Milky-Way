// ============================================================
// Shaders da galáxia — pontos com conservação de fluxo (tamanho
// físico em pc → px com alpha compensado), poeira multiplicativa
// que escurece o fundo e billboards de brilho (bojo / marcador).
// ============================================================
import { GLSL_CARTOGRAPHY } from '../cartography/galacticModel';

// Vértice compartilhado pelas partículas brilhantes e pela poeira.
export const GALAXY_VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;   // diâmetro físico em pc
attribute float aAlpha;

uniform vec3 uCamPos;
uniform float uScreenH;
uniform float uTanHalfFov;
uniform float uFade;
uniform float uMaxPx;

varying vec3 vColor;
varying float vAlpha;
varying float vSeed;

void main() {
  float dist = length(position - uCamPos);
  // tamanho angular real: pc/dist → fração da tela → pixels
  float px = aSize * uScreenH / (2.0 * uTanHalfFov * max(dist, 1.0));
  float clamped = clamp(px, 0.7, uMaxPx);
  // conservação de fluxo luminoso: sprites grandes (perto) teriam
  // pico constante e área enorme → estouro branco. Acima de ~3px o
  // pico cai com 1/px², mantendo o depósito total limitado; abaixo
  // do piso de pixel, o fluxo cai com px² (suavidade a distância).
  float shrink = min(1.0, 9.0 / max(px * px, 1e-4));
  float subPix = px < 0.7 ? (px * px) / 0.49 : 1.0;

  vColor = aColor;
  vAlpha = aAlpha * uFade * shrink * subPix;
  vSeed = fract(aSize * 0.371 + aAlpha * 7.13);

  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamped;
}
`;

export const GALAXY_FRAG = /* glsl */ `
precision highp float;

varying vec3 vColor;
varying float vAlpha;
varying float vSeed;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  float i = exp(-r2 * 4.5);
  vec3 col = vColor * i * vAlpha;
  gl_FragColor = vec4(col, 1.0);
}
`;

// Poeira galáctica — blending multiplicativo: escurece a luz
// acumulada atrás, desenhando as faixas escuras dos braços.
export const GALAXY_DUST_FRAG = /* glsl */ `
precision highp float;

uniform vec3 uDustColor;

varying vec3 vColor; // não usado — cor vem do uniform
varying float vAlpha;
varying float vSeed;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  // Fragmentos finos e curvos: poeira externa deve ler como filamento,
  // não como discos pretos destacados sobre a galáxia.
  float ang = vSeed * 6.2831;
  mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  uv = rot * uv;
  uv.x *= 0.72 + vSeed * 0.34;
  float r = length(vec2(uv.x * 0.72, uv.y));
  if (r > 1.0) discard;
  float bend = uv.y + sin(uv.x * (3.4 + vSeed * 2.1) + ang) * 0.16;
  float width = 0.10 + vSeed * 0.075;
  float filament = 1.0 - smoothstep(width, width + 0.18, abs(bend));
  float envelope = 1.0 - smoothstep(0.52, 1.0, r);
  float knots = 0.70 + 0.30 * sin(uv.x * 8.0 + ang);
  float i = filament * envelope * knots;
  vec3 factor = mix(vec3(1.0), uDustColor, i * vAlpha);
  gl_FragColor = vec4(factor, 1.0);
}
`;

// Billboard em view-space (mesma técnica das hero stars) para o
// brilho do bojo e o marcador do Sol.
export const GLOW_VERT = /* glsl */ `
varying vec2 vUv;
uniform float uSize;

void main() {
  vUv = position.xy;
  vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  c.xy += position.xy * uSize;
  gl_Position = projectionMatrix * c;
}
`;

export const GLOW_FRAG = /* glsl */ `
precision highp float;

uniform vec3 uColor;
uniform float uTime;
uniform float uFade;
uniform float uPulse; // 0 = bojo estático · 1 = marcador pulsante

varying vec2 vUv;

void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  float edgeFade = 1.0 - smoothstep(0.68, 1.0, r);
  float glow = (exp(-r * 3.6) * 0.85 + exp(-r * 14.0) * 0.7) * edgeFade;
  float a = glow * uFade;
  if (uPulse > 0.5) {
    float pulse = 0.75 + 0.25 * sin(uTime * 2.2);
    // anel fino em torno do ponto — "você está aqui"
    float dr = (r - 0.55) * 9.0;
    float ring = exp(-dr * dr) * 0.5 * pulse; // x*x — pow() de base negativa é NaN
    a = (glow * pulse + ring) * uFade;
  }
  gl_FragColor = vec4(uColor * a, 1.0);
}
`;

// Vertex de bake: quad direto em clip space, UV 1:1 — usado uma
// única vez no init para congelar cada lâmina numa textura.
export const DISC_BAKE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Fragment das lâminas BAKEADAS: o conteúdo do DISC_FRAG é estático
// (sem uTime, sem câmera) — recalculá-lo por fragmento a cada frame
// eram ~400 M hash/frame no Ato III. Agora é um fetch.
export const DISC_BAKED_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D uBaked;
uniform float uFade;
uniform float uLayerAlpha;
varying vec2 vUv;

void main() {
  gl_FragColor = vec4(texture2D(uBaked, vUv).rgb * uLayerAlpha * uFade, 1.0);
}
`;

// Disco emissivo contínuo. Sete camadas levemente separadas no
// eixo Z conectam as partículas; a macroestrutura é compartilhada
// verticalmente para que as lacunas dos braços não se preencham.
// As fases e o pitch são os mesmos do gerador físico em galaxy.ts.
export const DISC_VERT = /* glsl */ `
varying vec2 vUv;
uniform float uDiskRadius;

${GLSL_CARTOGRAPHY}

void main() {
  vUv = uv;
  vec3 warped = position;
  float radiusPc = length(position.xy) * uDiskRadius;
  // +1e-7: atan(0,0) é indefinido e 0*NaN = NaN — o vértice central
  // do plano existe exatamente em (0,0)
  float theta = atan(position.y, position.x + 1e-7);
  warped.z += galWarpHeight(radiusPc, theta);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(warped, 1.0);
}
`;

export const DISC_FRAG = /* glsl */ `
precision highp float;

uniform float uFade;
uniform float uSeed;
uniform float uLayerAlpha;
// mapa APOGEE bakeado: R = densidade de poeira, G = cobertura
uniform sampler2D uDustMap;
// resposta acoplada: R=gás/poeira, G=traçadores jovens,
// B/A=suporte espacial observado de cada família
uniform sampler2D uStructureMap;
uniform float uCartBlend;
uniform float uInferenceGain;
varying vec2 vUv;

${GLSL_CARTOGRAPHY}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm2(vec2 p) {
  float sum = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amplitude * noise2(p);
    p = p * 2.03 + vec2(9.7, 17.3);
    amplitude *= 0.5;
  }
  return sum;
}

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float radius = length(p);
  if (radius > 1.0) discard;

  float radiusPc = radius * GAL_DISK_RADIUS;
  float theta = atan(p.y, p.x + 1e-7); // NaN no texel central seria BAKEADO
  float armSharpness = mix(42.0, 105.0, smoothstep(3500.0, 15000.0, radiusPc));
  float arms = clamp(
    galMajorArms(theta, radiusPc, armSharpness) +
    galLocalArm(theta, radiusPc, armSharpness * 1.15),
    0.0,
    1.0
  );
  // A macroestrutura acoplada já vem da textura CPU. Só a microtextura
  // varia por lâmina; sua primeira oitava ≈65–80 pc no bake 1024².
  float microNoise = fbm2(p * 220.0 - vec2(uSeed * 1.7, uSeed));
  float edge = 1.0 - smoothstep(0.84, 1.0, radius);
  float disk = exp(-radius * 2.05) * edge;
  float core = exp(-radius * radius * 44.0);

  // Barra de 5 kpc inclinada 29° em relação à linha Sol–centro.
  // mat2 é column-major: esta é R(+29°), que traz a crista da barra
  // para o azimute −29° — coincidente com a barra de partículas do
  // CPU (barAngleRad = −29°) e com o referencial dos catálogos.
  float cb = cos(0.506145);
  float sb = sin(0.506145);
  vec2 bp = mat2(cb, sb, -sb, cb) * p;
  float bx = bp.x / 0.298;
  float by = bp.y / 0.058;
  float bar = exp(-bx * bx * 1.05 - abs(by) * 1.65);

  // Cartografia observada (APOGEE). O canal R é contraste log-local
  // (0,5 = neutro): só estruturas mais densas que o entorno viram
  // fendas — o nível médio do survey não escurece o disco.
  vec2 cart = texture2D(uDustMap, p * 0.5 + 0.5).rg;
  float obsCoverage = cart.g * uCartBlend;
  float obsLanes = smoothstep(0.56, 0.88, cart.r);
  vec4 structure = texture2D(uStructureMap, p * 0.5 + 0.5);
  float gasSupport = structure.b * uCartBlend;
  float youngSupport = structure.a * uCartBlend;
  float gasResponse =
    structure.r * mix(uInferenceGain, 1.0, gasSupport);
  float youngResponse =
    structure.g * mix(uInferenceGain, 1.0, youngSupport);
  float clumps =
    mix(0.54, 1.0, youngResponse) * mix(0.76, 1.0, microNoise);
  // A população velha é quase lisa; os quatro braços visíveis são
  // principalmente gás e estrelas jovens, como nos mapas Gaia.
  float oldStellarArm = arms * 0.16 * uInferenceGain;
  float armLight = oldStellarArm + youngResponse * 0.78;
  armLight *= mix(1.0, 0.88 + obsLanes * 0.42, obsCoverage * 0.55);

  // O mapa já fez o split macro observado/inferido; a mesma microtextura
  // fina apenas resolve subestrutura. APOGEE refina a extinção local.
  float dustMacro = mix(gasResponse, max(gasResponse, obsLanes), obsCoverage);
  float microDetail = mix(
    0.62,
    1.0,
    smoothstep(0.50, 0.82, microNoise)
  );
  float absorption = 1.0 - dustMacro * microDetail * 0.78;

  float stellarClouds = (0.036 + microNoise * 0.006) * uInferenceGain;
  float intensity =
    disk * (stellarClouds + armLight * 0.235 * clumps);
  intensity += (core * 0.112 + bar * 0.052) * uInferenceGain;
  intensity *= absorption * uLayerAlpha * uFade;

  vec3 cold = vec3(0.42, 0.51, 0.72);
  vec3 warm = vec3(0.92, 0.70, 0.52);
  vec3 color = mix(cold, warm, clamp(1.0 - radius * 0.78, 0.12, 0.92));
  color = mix(color, vec3(0.68, 0.80, 1.0), youngResponse * 0.24);
  color = mix(
    color,
    vec3(1.0, 0.72, 0.44),
    clamp(core + bar, 0.0, 1.0) * 0.84
  );
  color = mix(
    color,
    vec3(0.92, 0.22, 0.44),
    youngResponse * smoothstep(0.80, 0.94, microNoise) * 0.18
  );
  // avermelhamento por extinção nas fendas medidas
  color = mix(
    color,
    color * vec3(1.10, 0.78, 0.55),
    obsCoverage * obsLanes * 0.6
  );

  gl_FragColor = vec4(color * intensity, 1.0);
}
`;
