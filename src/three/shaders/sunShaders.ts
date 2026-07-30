// ============================================================
// Shaders do Sol — fotosfera com granulação viva, escurecimento
// de limbo e coroa em camadas com filamentos animados.
// ============================================================
import { GLSL_NOISE } from './common';

export const SUN_VERT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPos;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = normalize(-mv.xyz);
  vPos = position;
  gl_Position = projectionMatrix * mv;
}
`;

export const SUN_FRAG = /* glsl */ `
precision highp float;

uniform float uTime;

varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPos;

${GLSL_NOISE}

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);
  float limb = clamp(dot(n, v), 0.0, 1.0);

  // granulação: duas escalas de fbm animadas lentamente
  vec3 p = normalize(vPos);
  float g1 = fbm(p * 9.0 + vec3(uTime * 0.020, uTime * 0.013, 0.0), 4);
  float g2 = fbm(p * 23.0 - vec3(0.0, uTime * 0.017, uTime * 0.011), 3);
  float gran = g1 * 0.65 + g2 * 0.35;

  // gradiente fotosférico
  vec3 hot = vec3(1.22, 1.04, 0.72);
  vec3 mid = vec3(1.00, 0.55, 0.16);
  vec3 dark = vec3(0.42, 0.12, 0.025);
  vec3 col = mix(dark, mid, smoothstep(0.25, 0.55, gran));
  col = mix(col, hot, smoothstep(0.55, 0.85, gran));

  // manchas solares grandes e fáculas pequenas preservam detalhe
  // mesmo depois do tone mapping e do bloom.
  float spotField = fbm(p * 3.2 + vec3(8.1, -3.7, uTime * 0.003), 4);
  float spots = smoothstep(0.72, 0.86, spotField) * smoothstep(0.35, 0.7, g2);
  col *= 1.0 - spots * 0.78;
  float faculae = smoothstep(0.72, 0.9, g2) * (1.0 - spots);
  col += vec3(1.0, 0.55, 0.16) * faculae * 0.22;

  // escurecimento de limbo
  col *= mix(0.28, 1.08, pow(limb, 0.6));

  // emissivo HDR controlado: o bloom envolve sem apagar a textura.
  col *= 1.28;

  gl_FragColor = vec4(col, 1.0);
}
`;

// Corona: quad billboard aditivo com filamentos radiais animados
export const CORONA_VERT = /* glsl */ `
varying vec2 vUv;
uniform float uSize;

void main() {
  vUv = position.xy; // -1..1
  vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  c.xy += position.xy * uSize;
  gl_Position = projectionMatrix * c;
}
`;

export const CORONA_FRAG = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uIntensity;
uniform float uSeed;
uniform float uSize;
uniform float uCamDist;

varying vec2 vUv;

${GLSL_NOISE}

void main() {
  vec2 uv = vUv;
  float r = length(uv);
  if (r > 1.0) discard;
  float ang = atan(uv.y, uv.x);

  // esmaece quando a câmera entra no plano do billboard
  float nearFade = smoothstep(uSize * 0.85, uSize * 1.9, uCamDist);

  // filamentos radiais: ruído 1D sobre o ângulo, girando devagar
  vec3 sp = vec3(cos(ang), sin(ang), uSeed) * (2.4 + r * 3.0);
  float fil = fbm(sp + vec3(0.0, 0.0, uTime * 0.05), 3);
  fil = smoothstep(0.35, 0.85, fil);

  // perfil radial: núcleo branco → âmbar → transparente
  float core = exp(-r * r * 22.0) * 0.9;
  float glow = exp(-r * 3.8) * 0.5;
  float streamers = exp(-r * 6.0) * fil * 0.95;

  vec3 col = vec3(1.0, 0.90, 0.70) * core
           + vec3(1.0, 0.68, 0.30) * (glow + streamers)
           + vec3(0.65, 0.45, 0.85) * streamers * 0.35;

  float a = clamp(core + glow + streamers, 0.0, 1.0) * uIntensity * nearFade;
  gl_FragColor = vec4(col * uIntensity * nearFade, a);
}
`;
