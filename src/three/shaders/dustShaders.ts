// ============================================================
// Poeira interestelar próxima — partículas que envolvem a câmera
// e se acendem dentro do gás, dando paralaxe e sensação de volume.
// ============================================================
import { GLSL_NOISE, GLSL_GALAXY, GLSL_DENSITY_LOCAL } from './common';

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
${GLSL_DENSITY_LOCAL}

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

    // hash de Hoskins por pixel: o fract(sin(dot)) anterior tinha
    // gradiente de fase linear — virava BANDAMENTO diagonal coerente
    // em tela cheia, não grão de filme
    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);

      // aberração cromática radial (mais forte nos cantos)
      vec2 off = c * uCA * r2 * 60.0;
      vec3 base = texture2D(tDiffuse, uv).rgb;
      float rDesl = texture2D(tDiffuse, uv + off).r;
      float bDesl = texture2D(tDiffuse, uv - off).b;
      // A BEIRA DURA CEDE (item 117). A separação é um DESLOCAMENTO: num
      // degrau de silhueta ela traz para fora do corpo o azul de dentro
      // dele e pinta um aro que não existe — medido no limbo de
      // Ganimedes em 31/08. Onde o desvio ATRAVESSA um degrau (a luz do
      // ponto deslocado difere muito da do ponto), a separação cede; o
      // céu é gradiente e não degrau, então ali ela fica inteira. Custa
      // ZERO amostra a mais: a do centro já era a do canal verde.
      float degrau = max(abs(rDesl - base.r), abs(bDesl - base.b));
      float cede = 1.0 - smoothstep(0.06, 0.30, degrau);
      vec3 col;
      col.r = mix(base.r, rDesl, cede);
      col.g = base.g;
      col.b = mix(base.b, bDesl, cede);

      // vinheta anamórfica suave
      col *= 1.0 - uVignette * smoothstep(0.12, 0.62, r2);

      // leve elevação de negros (filme)
      col = col * 0.985 + vec3(0.012, 0.010, 0.014);

      // grão animado — resolução REAL do framebuffer, não 1920×1080
      float g = hash(gl_FragCoord.xy + floor(fract(uTime) * 913.0)) - 0.5;
      col += g * uGrain * (0.35 + 0.65 * (1.0 - clamp(dot(col, vec3(0.333)), 0.0, 1.0)));

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
