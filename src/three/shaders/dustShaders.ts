// ============================================================
// Poeira interestelar próxima — partículas que envolvem a câmera
// e se acendem dentro do gás, dando paralaxe e sensação de volume.
// ============================================================
import { GLSL_NOISE, GLSL_GALAXY, GLSL_DENSITY } from './common';

export const DUST_VERT = /* glsl */ `
attribute float aRand;

uniform vec3 uCamPos;
uniform float uTime;
uniform float uScreenH;
uniform float uBox;
uniform float uFade;

varying float vAlpha;
varying vec3 vColor;

${GLSL_NOISE}
${GLSL_GALAXY}
${GLSL_DENSITY}

void main() {
  // partículas fixas no mundo; a caixa "segue" a câmera via wrap
  vec3 p = position;
  vec3 rel = mod(p - uCamPos + uBox * 0.5, uBox) - uBox * 0.5;
  vec3 world = uCamPos + rel;

  // deriva lenta — o meio interestelar está vivo
  world += vec3(
    vnoise(world * 0.5 + uTime * 0.01) - 0.5,
    vnoise(world * 0.5 + 31.7 + uTime * 0.012) - 0.5,
    vnoise(world * 0.5 + 57.3 + uTime * 0.008) - 0.5) * 0.6;

  float gas = nebulaDensity(world, 2);
  float glow = smoothstep(0.02, 0.5, gas);
  vAlpha = 0.05 + glow * 0.5;
  vColor = mix(vec3(0.55, 0.62, 0.75), vec3(0.9, 0.75, 0.55), aRand) * (0.35 + glow * 1.6);

  float dist = length(rel);
  vAlpha *= 1.0 - smoothstep(uBox * 0.28, uBox * 0.5, dist); // some nas bordas da caixa
  vAlpha *= smoothstep(0.02, 0.12, dist);              // não cola na lente
  vAlpha *= uFade;                                     // some ao deixar a vizinhança

  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;
  float px = (1.1 + aRand * 2.2) * uScreenH * 0.0016 / max(dist * 0.35, 0.35);
  gl_PointSize = clamp(px, 1.0, 5.0);
}
`;

export const DUST_FRAG = /* glsl */ `
precision highp float;

varying float vAlpha;
varying vec3 vColor;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  float i = exp(-r2 * 4.5);
  gl_FragColor = vec4(vColor * i, i * vAlpha);
}
`;

// ============================================================
// Passe de gradação cinematográfica — vinheta, grão de filme,
// aberração cromática sutil nas bordas e leve elevação de negros.
// ============================================================
export const FILM_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.016 },
    uVignette: { value: 0.42 },
    uCA: { value: 0.00012 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    uniform float uVignette;
    uniform float uCA;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);

      // aberração cromática radial (mais forte nos cantos)
      vec2 off = c * uCA * r2 * 60.0;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - off).b;

      // vinheta anamórfica suave
      col *= 1.0 - uVignette * smoothstep(0.12, 0.62, r2);

      // leve elevação de negros (filme)
      col = col * 0.985 + vec3(0.012, 0.010, 0.014);

      // grão animado
      float g = hash(uv * vec2(1920.0, 1080.0) + fract(uTime) * 913.0) - 0.5;
      col += g * uGrain * (0.35 + 0.65 * (1.0 - clamp(dot(col, vec3(0.333)), 0.0, 1.0)));

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
