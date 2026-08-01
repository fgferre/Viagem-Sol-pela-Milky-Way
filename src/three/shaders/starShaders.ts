// ============================================================
// Shaders do campo estelar — pontos com tamanho/brilho por
// magnitude, cor por B-V, extinção pelo gás e spikes de difração.
// ============================================================
import {
  GLSL_NOISE,
  GLSL_GALAXY,
  GLSL_DENSITY_LOCAL,
  GLSL_STAR_COLOR,
  GLSL_STAR_PSF,
} from './common';

export const STAR_VERT = /* glsl */ `
attribute float aLogLum;
attribute float aCi;

uniform vec3 uCamPos;
uniform float uScreenH;
uniform float uExpoM0;  // magnitude aparente que satura o pico da PSF
uniform float uSigmaPx; // largura da PSF em px a 1080p (o "instrumento")
uniform float uTau;
uniform float uTime;
uniform float uFade;

varying vec3 vColor;
varying float vSat;    // quanto o pico passou de 1 (núcleo estourado)
varying float vSigma;  // sigma da PSF em fração do meio-sprite
varying float vPeak;

${GLSL_NOISE}
${GLSL_GALAXY}
${GLSL_DENSITY_LOCAL}
${GLSL_STAR_COLOR}
${GLSL_STAR_PSF}

void main() {
  vec3 worldPos = position;
  float dist = length(worldPos - uCamPos);

  // Magnitude aparente RECALCULADA da posição da câmera. logLum é
  // 0,4·(4,85 − M_V), então M_V = 4,85 − 2,5·logLum e
  // m = M_V + 5·log10(d) − 5. Custa um log2 e dois mads — o preço de
  // "as estrelas reagem a onde eu estou" é praticamente zero; o que era
  // caro no desenho antigo não era a conta, era a resposta errada.
  float m = -0.15 - 2.5 * aLogLum + 5.0 * (log2(max(dist, 1e-3)) * 0.30103);

  // A lei da PSF é compartilhada (GLSL_STAR_PSF, common.ts) — a mesma
  // para o catálogo e para as cascas procedurais.
  float size; float peak; float sat; float sigmaFrac;
  starPSF(m, uExpoM0, uSigmaPx, uScreenH, size, peak, sat, sigmaFrac);
  float alpha = 1.0;

  // extinção interestelar: gás entre a câmera e a estrela a apaga e
  // avermelha — só para estrelas com presença real na tela; num ponto
  // subpixel tênue o avermelhamento é ilegível e o mini-raymarch de
  // 6 amostras custaria ~80% do custo total do campo estelar
  vec3 absorb = size > 3.0 ? extinction(uCamPos, worldPos, uTau) : vec3(1.0);
  vec3 col = bvToColor(aCi) * absorb;
  float vis = (absorb.r + absorb.g + absorb.b) / 3.0;
  alpha *= mix(1.0, vis, 0.5);
  alpha *= uFade; // some ao deixar a vizinhança solar

  vColor = col;
  vSat = sat;
  vSigma = sigmaFrac;
  vPeak = peak * alpha;

  vec4 mv = modelViewMatrix * vec4(worldPos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = size;
}
`;

export const STAR_FRAG = /* glsl */ `
precision highp float;

varying vec3 vColor;
varying float vSat;
varying float vSigma;
varying float vPeak;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;

  // A PSF de verdade, com o sigma que o vértice calculou. Como o sprite
  // acompanha o sigma, a integral do gaussiano é o fluxo da estrela:
  // aditivo, o depósito total na tela É a energia recebida. Nada de
  // conservação artificial — ela sai de graça de desenhar a PSF certa.
  float s2 = max(vSigma * vSigma, 1e-6);
  float core = exp(-r2 / (2.0 * s2));
  float halo = exp(-r2 / (18.0 * s2)) * 0.06;

  // spikes de difração em cruz — só onde o núcleo estourou
  float spike = 0.0;
  if (vSat > 0.001) {
    float ax = exp(-abs(uv.y) * 14.0) * exp(-abs(uv.x) * 2.6);
    float ay = exp(-abs(uv.x) * 14.0) * exp(-abs(uv.y) * 2.6);
    spike = (ax + ay) * vSat * 0.85;
  }

  vec3 col = vColor * (core + halo) * vPeak + vColor * spike;
  // núcleo esbranquiçado nas estouradas (saturação do sensor)
  col += vec3(0.9, 0.95, 1.0) * core * core * vSat * 0.6;

  gl_FragColor = vec4(col, 1.0);
}
`;
