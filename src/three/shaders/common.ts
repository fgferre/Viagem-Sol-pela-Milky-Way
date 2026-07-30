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

// Vetor normal do plano galáctico real (polo norte galáctico,
// RA 192.86°, Dec +27.13° em coordenadas equatoriais — mesma base do HYG)
export const GLSL_GALAXY = /* glsl */ `
const vec3 GAL_N = vec3(-0.867666149, -0.198076373, 0.455983776);
`;

// Constrói a função de densidade com os núcleos de nuvem injetados
// como constantes (evita uniforms extras e permite otimização do driver).
function coresGLSL(): string {
  return WORLD.nebulaCores
    .map(
      (c, i) =>
        `  { vec3 q = (p - vec3(${c[0].toFixed(2)}, ${c[1].toFixed(2)}, ${c[2].toFixed(2)})) / ${c[3].toFixed(2)};
     float g = exp(-dot(q, q) * 1.6);
     // bolsões densos separados por vãos + detalhe fino (~3 pc) — estrutura fractal
     float core = g * (0.04 + 1.5 * smoothstep(0.50, 0.85, fbm(p * 0.09 + ${(i * 13.7).toFixed(1)}, oct)));
     core *= 0.50 + 0.95 * fbm(p * 0.30 + ${(i * 7.31).toFixed(1)}, 2);
     d += core * 0.95; }`
    )
    .join('\n');
}

// detail: 0 = barato (amostras de estrelas), 1 = completo (raymarch)
export const GLSL_DENSITY = /* glsl */ `
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
