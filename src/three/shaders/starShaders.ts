// ============================================================
// Shaders do campo estelar — pontos com tamanho/brilho por
// magnitude, cor por B-V, extinção pelo gás e spikes de difração.
// ============================================================
import { GLSL_NOISE, GLSL_GALAXY, GLSL_DENSITY_LOCAL, GLSL_STAR_COLOR } from './common';

export const STAR_VERT = /* glsl */ `
attribute float aMag;
attribute float aCi;
attribute float aRand;

uniform vec3 uCamPos;
uniform float uScreenH;
uniform float uPointScale;
uniform float uMaxPx;
uniform float uTau;
uniform float uTime;
uniform float uFade;

varying vec3 vColor;
varying float vSpike;
varying float vRand;
varying float vAlpha;

${GLSL_NOISE}
${GLSL_GALAXY}
${GLSL_DENSITY_LOCAL}
${GLSL_STAR_COLOR}

void main() {
  vec3 worldPos = position;
  float dist = length(worldPos - uCamPos);

  // brilho por magnitude aparente (expoente suavizado p/ estética)
  float lum = pow(10.0, -0.30 * aMag);
  float px = uPointScale * lum / max(dist, 0.02);
  px = clamp(px, 1.0, uMaxPx);

  // alpha: mistura de resposta física (1/d²) com resposta artística
  float flux = pow(10.0, -0.4 * aMag) / (dist * dist + 0.05);
  float phys = clamp(flux * 90.0, 0.0, 1.0);
  float art = clamp(pow(10.0, -0.18 * (aMag - 1.0)), 0.05, 1.0);
  float alpha = mix(art, phys, 0.45);

  // extinção interestelar: gás entre a câmera e a estrela a apaga e avermelha
  vec3 absorb = extinction(uCamPos, worldPos, uTau);
  vec3 col = bvToColor(aCi) * absorb;
  float vis = (absorb.r + absorb.g + absorb.b) / 3.0;
  alpha *= mix(1.0, vis, 0.5);
  alpha *= uFade; // some ao deixar a vizinhança solar

  // spikes de difração e halo só para as mais brilhantes vistas de perto
  vSpike = clamp(lum / max(dist, 0.4) * 1.2, 0.0, 1.0);
  vSpike *= smoothstep(0.8, 2.5, px);

  vColor = col;
  vRand = aRand;
  vAlpha = alpha;

  vec4 mv = modelViewMatrix * vec4(worldPos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = px * uScreenH * 0.0016;
}
`;

export const STAR_FRAG = /* glsl */ `
precision highp float;

varying vec3 vColor;
varying float vSpike;
varying float vRand;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;

  // núcleo gaussiano + halo suave
  float core = exp(-r2 * 9.0);
  float halo = exp(-r2 * 2.2) * 0.35;

  // spikes de difração em cruz (estilo óptico reflexivo)
  float spike = 0.0;
  if (vSpike > 0.001) {
    float ax = exp(-abs(uv.y) * 14.0) * exp(-abs(uv.x) * 2.6);
    float ay = exp(-abs(uv.x) * 14.0) * exp(-abs(uv.y) * 2.6);
    spike = (ax + ay) * vSpike * 0.85;
  }

  float i = core + halo + spike;
  // estrelas perfuram a névoa — boost como nas astrofotos reais
  vec3 col = vColor * i * vAlpha * 1.6;
  // leve núcleo esbranquiçado nas mais intensas (saturação do sensor)
  col += vec3(0.9, 0.95, 1.0) * core * core * vSpike * 0.6;

  gl_FragColor = vec4(col, 1.0);
}
`;
