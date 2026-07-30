// ============================================================
// Hero stars — as 12 estrelas mais brilhantes ganham billboards
// de brilho dedicados com tamanho angular real (flybys AAA).
// ============================================================
import * as THREE from 'three';
import type { NamedStar } from '../config';
import { GLSL_NOISE } from '../shaders/common';

const VERT = /* glsl */ `
varying vec2 vUv;
uniform float uSize;

void main() {
  vUv = position.xy; // -1..1
  vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  c.xy += position.xy * uSize;
  gl_Position = projectionMatrix * c;
}
`;

const FRAG = /* glsl */ `
precision highp float;

uniform vec3 uColor;
uniform float uTime;
uniform float uSeed;
uniform float uCamDist;
uniform float uSize;

varying vec2 vUv;

${GLSL_NOISE}

void main() {
  vec2 uv = vUv;
  float r = length(uv);
  if (r > 1.0) discard;

  // esmaece se a câmera colar na estrela
  float nearFade = smoothstep(uSize * 0.5, uSize * 1.4, uCamDist);
  // esmaece suavemente de longe (o ponto do catálogo assume)
  float farFade = 1.0 - smoothstep(320.0, 900.0, uCamDist);

  // núcleo estelar + brilho radial
  float core = exp(-r * r * 90.0) * 3.0;
  float glow = exp(-r * 4.5) * 0.9;

  // spikes de difração
  float ax = exp(-abs(uv.y) * 16.0) * exp(-abs(uv.x) * 2.4);
  float ay = exp(-abs(uv.x) * 16.0) * exp(-abs(uv.y) * 2.4);
  float spikes = (ax + ay) * 0.8;

  // cintilação sutil de plasma
  float tw = 0.92 + 0.08 * vnoise(vec3(uSeed * 10.0, uTime * 0.5, uSeed));

  vec3 col = (vec3(1.0, 0.98, 0.95) * core + uColor * (glow + spikes)) * tw;
  float a = clamp(core + glow + spikes, 0.0, 1.0);

  gl_FragColor = vec4(col * nearFade * farFade, a * nearFade * farFade);
}
`;

// B-V aproximado pela classe espectral
function spectToColor(s: string): THREE.Color {
  const c = s.charAt(0).toUpperCase();
  const table: Record<string, [number, number, number]> = {
    O: [0.61, 0.69, 1.0],
    B: [0.72, 0.79, 1.0],
    A: [0.85, 0.89, 1.0],
    F: [1.0, 0.96, 0.85],
    G: [1.0, 0.88, 0.68],
    K: [1.0, 0.72, 0.45],
    M: [1.0, 0.55, 0.35],
  };
  const rgb = table[c] ?? [0.9, 0.9, 0.95];
  return new THREE.Color(rgb[0], rgb[1], rgb[2]);
}

const HERO_COUNT = 12;

export class HeroStars {
  readonly group = new THREE.Group();
  private mats: THREE.ShaderMaterial[] = [];

  constructor(named: NamedStar[]) {
    const heroes = [...named].sort((a, b) => a.m - b.m).slice(0, HERO_COUNT);
    let heroIndex = 0;
    for (const s of heroes) {
      const lum = Math.pow(10, -0.3 * s.m);
      const size = 0.08 * lum; // pc — raio do brilho
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uColor: { value: spectToColor(s.s) },
          uTime: { value: 0 },
          // seed pelo índice: cintilação idêntica em toda visita
          uSeed: { value: ((heroIndex++ * 0.6180339887) % 1) * 10 },
          uSize: { value: size },
          uCamDist: { value: 100 },
        },
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      });
      this.mats.push(mat);
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      quad.position.set(s.x, s.y, s.z);
      quad.frustumCulled = false;
      quad.renderOrder = 3;
      this.group.add(quad);
    }
  }

  update(time: number, camPos: THREE.Vector3) {
    let i = 0;
    for (const child of this.group.children) {
      const m = this.mats[i++];
      m.uniforms.uTime.value = time;
      m.uniforms.uCamDist.value = (child as THREE.Mesh).position.distanceTo(camPos);
    }
  }

  dispose() {
    this.mats.forEach((m) => m.dispose());
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
}
