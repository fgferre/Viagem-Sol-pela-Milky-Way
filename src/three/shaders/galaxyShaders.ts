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
  // deforma o sprite para nuvens irregulares (barato, sem textura)
  float ang = vSeed * 6.2831;
  mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  uv = rot * uv;
  uv.x *= 0.55 + vSeed * 0.6;
  float r = length(uv);
  if (r > 1.0) discard;
  // smoothstep invertido (edge0 > edge1) é undefined em GLSL — NaN em alguns drivers
  float i = 1.0 - smoothstep(0.1, 1.0, r);
  i = i * i * (3.0 - 2.0 * i);
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

// Disco emissivo contínuo. Três camadas levemente separadas no
// eixo Z conectam as partículas e evitam o aspecto de "anéis".
// As fases e o pitch são os mesmos do gerador físico em galaxy.ts.
export const DISC_VERT = /* glsl */ `
varying vec2 vUv;
uniform float uDiskRadius;

${GLSL_CARTOGRAPHY}

void main() {
  vUv = uv;
  vec3 warped = position;
  float radiusPc = length(position.xy) * uDiskRadius;
  float theta = atan(position.y, position.x);
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
uniform float uCartBlend;
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
  float theta = atan(p.y, p.x);
  float armSharpness = mix(42.0, 105.0, smoothstep(3500.0, 15000.0, radiusPc));
  float arms = clamp(
    galMajorArms(theta, radiusPc, armSharpness) +
    galLocalArm(theta, radiusPc, armSharpness * 1.15),
    0.0,
    1.0
  );
  float dustArms = clamp(
    galMajorArms(theta - 0.065, radiusPc, armSharpness * 2.3) +
    galLocalArm(theta - 0.045, radiusPc, armSharpness * 2.1),
    0.0,
    1.0
  );

  float broadNoise = fbm2(p * 8.0 + vec2(uSeed, -uSeed));
  float fineNoise = fbm2(p * 31.0 - vec2(uSeed * 1.7, uSeed));
  float edge = 1.0 - smoothstep(0.84, 1.0, radius);
  float disk = exp(-radius * 2.05) * edge;
  float core = exp(-radius * radius * 64.0);

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

  // Braços menos dominantes e com interrupções: é a leitura Gaia 2025,
  // não a velha "grand design" simétrica.
  float continuity = smoothstep(0.28, 0.62, broadNoise * 0.72 + fineNoise * 0.28);
  float clumps = mix(0.34, 1.0, broadNoise) * mix(0.58, 1.0, fineNoise);
  float armLight = arms * mix(0.44, 1.0, continuity);
  // formação estelar acompanha o gás denso medido (sutil)
  armLight *= mix(1.0, 0.78 + obsLanes * 0.65, obsCoverage * 0.6);
  float absorptionProc =
    1.0 - dustArms * smoothstep(0.52, 0.84, fineNoise) * 0.64;
  // Composição por PRODUTO: as fendas medidas multiplicam o
  // procedural — nada de costura na borda da cobertura, e o
  // ruído fino só texturiza abaixo da resolução do mapa.
  float absorptionObs =
    1.0 - obsLanes * (0.55 + 0.45 * smoothstep(0.3, 0.8, fineNoise)) * 0.78;
  float absorption = absorptionProc * mix(1.0, absorptionObs, obsCoverage);

  float stellarClouds =
    0.042 + broadNoise * broadNoise * 0.155 + fineNoise * 0.014;
  float intensity = disk * (stellarClouds + armLight * 0.13 * clumps);
  intensity += core * 0.132 + bar * 0.046;
  intensity *= absorption * uLayerAlpha * uFade;

  vec3 cold = vec3(0.28, 0.40, 0.72);
  vec3 warm = vec3(0.92, 0.62, 0.40);
  vec3 color = mix(cold, warm, broadNoise * 0.46);
  color = mix(
    color,
    vec3(1.0, 0.72, 0.44),
    clamp(core + bar, 0.0, 1.0) * 0.84
  );
  color = mix(
    color,
    vec3(0.92, 0.22, 0.44),
    armLight * smoothstep(0.78, 0.94, fineNoise) * 0.30
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
