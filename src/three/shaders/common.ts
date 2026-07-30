// ============================================================
// Chunks GLSL compartilhados — ruído, plano galáctico real,
// função de densidade da nebulosa e cor de corpo negro.
// ============================================================
import { WORLD } from '../config';

export const GLSL_NOISE = /* glsl */ `
float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z);
}

float fbm(vec3 p, int oct) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    if (i >= oct) break;
    s += a * vnoise(p);
    p = p * 2.03 + vec3(11.7, 5.1, 7.9);
    a *= 0.5;
  }
  return s;
}

// ruído "ridged" — filamentos de poeira
float ridged(vec3 p, int oct) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    if (i >= oct) break;
    s += a * abs(2.0 * vnoise(p) - 1.0);
    p = p * 2.13 + vec3(7.3, 3.1, 9.7);
    a *= 0.5;
  }
  return s;
}
`;

// Base galactocêntrica completa no referencial da cena (mesma base
// EX/EY/EZ de world/galaxy.ts, conferida numericamente a 6e-8):
// GAL_N = polo norte galáctico, GAL_X = centro→Sol, GAL_Y = l=270°,
// GAL_CENTER = posição do centro galáctico na cena (pc).
export const GLSL_GALAXY = /* glsl */ `
const vec3 GAL_N = vec3(-0.867666149, -0.198076373, 0.455983776);
const vec3 GAL_CENTER = vec3(-442.464, -7117.423, -3945.763);
const vec3 GAL_X = vec3(0.0548756, 0.8734371, 0.4838350);
const vec3 GAL_Y = vec3(-0.4941094, 0.4448296, -0.7469822);
`;

// Constrói a função de densidade com os núcleos de nuvem injetados
// como constantes (evita uniforms extras e permite otimização do driver).
function coresGLSL(): string {
  // O gate espacial vem ANTES dos 2 fbm de cada núcleo: fora de ~3
  // raios (g < 6e-7, invisível) a amostra custa uma subtração e um
  // dot — sem ele, os 7 núcleos eram ~80% do custo do raymarch
  // (medido por timer de GPU: 75–80 ms/frame em t=0/85).
  return WORLD.nebulaCores
    .map(
      (c, i) =>
        `  { vec3 q = (p - vec3(${c[0].toFixed(2)}, ${c[1].toFixed(2)}, ${c[2].toFixed(2)})) / ${c[3].toFixed(2)};
     float q2 = dot(q, q);
     if (q2 < 9.0) {
       float g = exp(-q2 * 1.6);
       // bolsões densos separados por vãos + detalhe fino (~3 pc)
       float core = g * (0.04 + 1.5 * smoothstep(0.50, 0.85, fbm(p * 0.09 + ${(i * 13.7).toFixed(1)}, oct)));
       core *= 0.50 + 0.95 * fbm(p * 0.30 + ${(i * 7.31).toFixed(1)}, 2);
       d += core * 0.95;
     } }`
    )
    .join('\n');
}

// Variante COMPLETA (só o raymarch da nebulosa): envelope
// galactocêntrico via canais B/A do dust map (braços/warp bakeados
// — 1 fetch no lugar de ~40 transcendentais POR AMOSTRA) + nuvens-
// semente do catálogo. Requer GLSL_GALAXY e GLSL_CARTOGRAPHY antes.
export const GLSL_DENSITY = /* glsl */ `
uniform sampler2D uDustMap; // RGBA: poeira APOGEE + braços/warp bakeados
// Nuvens-semente do catálogo CO perto da câmera (0 = desligado).
uniform int uSeedCloudCount;
uniform vec4 uSeedClouds[32];   // xyz = posição na cena (pc), w = raio
uniform float uSeedCloudAmp[32];
// Cavidade do observador (superbolhas são onipresentes: qualquer
// ponto do disco está dentro de uma). 0 perto do Sol — lá a Bolha
// Local e os núcleos artísticos do corredor assumem.
uniform vec3 uCavityPos;
uniform float uCavityGate;

// Envelope do gás molecular galáctico: perfil radial exponencial,
// camada vertical FINA (h≈55 pc, flare no disco externo — o gás é
// mais fino que as estrelas), concentrado nos braços. Normalizado
// para ≈1 na vizinhança solar.
float diskGasEnvelope(vec3 p) {
  vec3 q = p - GAL_CENTER;
  float z = dot(q, GAL_N);
  vec2 xy = vec2(dot(q, GAL_X), dot(q, GAL_Y));
  float radiusPc = length(xy);
  // braços (B) e warp (A) pré-computados a 65 pc/texel
  vec4 cart = texture2D(uDustMap, xy / (2.0 * GAL_DISK_RADIUS) + 0.5);
  float zw = z - (cart.a * 2.0 - 1.0) * 820.0;
  float flare = clamp((radiusPc - 7500.0) / 9300.0, 0.0, 1.0);
  flare *= flare;
  // gaussiano FINO (σ 70→260 pc com flare): fino como o gás
  // molecular real, mas plano perto do plano — a exponencial tinha
  // cúspide que apagava o corredor local (z ≈ ±20 pc)
  float h = mix(70.0, 260.0, flare);
  float radial = exp(-radiusPc / 5200.0) *
    (1.0 - smoothstep(15500.0, GAL_DISK_RADIUS, radiusPc));
  // braços carregam as nuvens; inter-braço é limpo
  float arms = 0.15 + 0.85 * cart.b;
  // normaliza para ≈1 na vizinhança solar (R=8150, braço Local)
  return radial * exp(-zw * zw / (2.0 * h * h)) * arms * 6.9;
}

// último envelope avaliado — o loop do raymarch reusa em vez de
// pagar o fetch + ALU de diskGasEnvelope duas vezes pela mesma p
float gGasEnvelope = 0.0;

float nebulaDensity(vec3 p, int oct) {
  float envelope = min(diskGasEnvelope(p), 3.0);
  gGasEnvelope = envelope;
  if (envelope < 0.004 && uSeedCloudCount == 0) return 0.0;
  float n1 = fbm(p * 0.0135, oct >= 4 ? 4 : 2);
  float n2 = fbm(p * 0.048 + 17.3, oct >= 4 ? 3 : 2);
  // grumos raros e compactos — gás molecular ocupa ≪1% do volume
  float clumps = smoothstep(0.50, 0.90, n1 * 0.70 + n2 * 0.30);
  float d = envelope * clumps * 0.75;
${coresGLSL()}
  // nuvens-semente reais: metaballs com subestrutura FBM. O corte
  // por distância vem ANTES do exp/fbm: por amostra, quase sempre
  // só 0–2 nuvens passam — o resto custa uma subtração e um dot.
  for (int i = 0; i < 32; i++) {
    if (i >= uSeedCloudCount) break;
    vec3 cq = (p - uSeedClouds[i].xyz) / max(uSeedClouds[i].w, 8.0);
    float d2c = dot(cq, cq);
    if (d2c < 5.5) {
      float g = exp(-d2c * 1.4);
      // fase pela IDENTIDADE da nuvem (posição estável), nunca pelo
      // slot do array — o rank muda a cada refresh de proximidade
      float phase = hash13(uSeedClouds[i].xyz) * 118.3;
      float subst =
        0.35 + 1.35 * smoothstep(0.45, 0.85, fbm(p * 0.11 + phase, 2));
      d += g * uSeedCloudAmp[i] * subst;
    }
  }
  float lanes = fbm(p * 0.085 + 41.0, 2);
  d *= mix(0.12, 1.0, smoothstep(0.28, 0.64, lanes));
  // Bolha Local: os primeiros parsecs ao redor do Sol são limpos (real)
  d *= smoothstep(1.2, 6.5, length(p));
  // cavidade do observador itinerante (estilização "inferred"
  // fundamentada: superbolhas de ~300 pc povoam todo o disco)
  float cav = length(p - uCavityPos);
  d *= mix(1.0, smoothstep(25.0, 240.0, cav), uCavityGate);
  return d * ${WORLD.gasDensity.toFixed(2)};
}

`;

// Variante LOCAL barata (estrelas HYG e poeira próxima — camadas
// gated por dHome < 2,3 kpc, onde o envelope galáctico ≈ o slab
// solar): sem fetch de textura, sem nuvens-semente, sem cartografia.
// Restaura o custo de vértice original do campo estelar.
export const GLSL_DENSITY_LOCAL = /* glsl */ `
uniform vec3 uCavityPos;
uniform float uCavityGate;

float nebulaDensity(vec3 p, int oct) {
  // O Sol está 5,5 pc ao norte do plano médio.
  float gp = dot(p, GAL_N) + 5.5;
  float slab = exp(-gp * gp / (2.0 * 95.0 * 95.0));
  float n1 = fbm(p * 0.0135, oct >= 4 ? 4 : 2);
  float n2 = fbm(p * 0.048 + 17.3, oct >= 4 ? 3 : 2);
  float clumps = smoothstep(0.50, 0.90, n1 * 0.70 + n2 * 0.30);
  float d = slab * clumps * 0.75;
${coresGLSL()}
  float lanes = fbm(p * 0.085 + 41.0, 2);
  d *= mix(0.12, 1.0, smoothstep(0.28, 0.64, lanes));
  // Bolha Local: os primeiros parsecs ao redor do Sol são limpos (real)
  d *= smoothstep(1.2, 6.5, length(p));
  // mesma cavidade do raymarch (coerência na faixa dHome 600–2300)
  float cav = length(p - uCavityPos);
  d *= mix(1.0, smoothstep(25.0, 240.0, cav), uCavityGate);
  return d * ${WORLD.gasDensity.toFixed(2)};
}

// Transmissão + avermelhamento aproximados ao longo do raio (extinção interestelar)
vec3 extinction(vec3 from, vec3 to, float baseTau) {
  vec3 dir = to - from;
  float len = length(dir);
  dir /= max(len, 1e-4);
  float tau = 0.0;
  for (int i = 0; i < 6; i++) {
    float t = (float(i) + 0.5) / 6.0;
    tau += nebulaDensity(from + dir * (t * len), 2) * (len / 6.0);
  }
  tau *= baseTau;
  vec3 absorb = exp(-tau * vec3(1.0, 1.65, 2.35)); // azul é extinto primeiro
  return absorb;
}
`;

// Cor de corpo negro aproximada a partir do índice de cor B-V
export const GLSL_STAR_COLOR = /* glsl */ `
vec3 bvToColor(float bv) {
  // B-V: -0.4 (azul quente) → 0.0 (branco) → 0.65 (solar) → 2.0 (vermelha fria)
  vec3 c0 = vec3(0.61, 0.69, 1.00); // O/B
  vec3 c1 = vec3(0.79, 0.84, 1.00); // A
  vec3 c2 = vec3(1.00, 0.98, 0.95); // F/G branco
  vec3 c3 = vec3(1.00, 0.88, 0.68); // K
  vec3 c4 = vec3(1.00, 0.62, 0.42); // M
  vec3 col = mix(c0, c1, smoothstep(-0.40, -0.02, bv));
  col = mix(col, c2, smoothstep(-0.02, 0.45, bv));
  col = mix(col, c3, smoothstep(0.45, 1.05, bv));
  col = mix(col, c4, smoothstep(1.05, 1.90, bv));
  return col;
}
`;
