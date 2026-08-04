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
// clarão é artefato de olho/instrumento: não cresce com a lente. Sob
// teleobjetiva (fov < 58) o billboard encolhe na mesma razão e o
// tamanho NA TELA fica o da lente padrão — mesma filosofia do PSF de
// px fixo do catálogo. uZoom ≤ 1 (lente aberta não infla).
uniform float uZoom;

void main() {
  vUv = position.xy; // -1..1
  vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  c.xy += position.xy * uSize * uZoom;
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
// núcleo pontual + espinhos SÓ quando a estrela é um ponto. Com o disco
// resolvido na tela (só o Sol chega lá) o núcleo apertado imprime um
// PONTO BRANCO no meio do disco — lê como retículo de mira, não como
// estrela. Aí fica só o halo largo, que é o que uma fonte brilhante
// resolvida faz de verdade. 1,0 nos heróis (sempre pontos).
uniform float uCore;
// intensidade do clarão. O tamanho angular NÃO é atenuado na entrada:
// um clarão pequeno sobre um disco grande vira ponto de mira; um
// clarão do tamanho certo, subindo em BRILHO, lê como o disco
// estourando de luz. 1,0 nos heróis.
uniform float uGain;

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
  float core = exp(-r * r * 90.0) * 3.0 * uCore;
  float glow = exp(-r * 4.5) * 0.9;

  // spikes de difração
  float ax = exp(-abs(uv.y) * 16.0) * exp(-abs(uv.x) * 2.4);
  float ay = exp(-abs(uv.x) * 16.0) * exp(-abs(uv.y) * 2.4);
  float spikes = (ax + ay) * 0.8 * uCore;

  // cintilação sutil de plasma
  float tw = 0.92 + 0.08 * vnoise(vec3(uSeed * 10.0, uTime * 0.5, uSeed));

  vec3 col = (vec3(1.0, 0.98, 0.95) * core + uColor * (glow + spikes)) * tw;
  float a = clamp(core + glow + spikes, 0.0, 1.0);

  gl_FragColor = vec4(col * nearFade * farFade * uGain, a * nearFade * farFade * uGain);
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

// 16 desde o roteiro da rodada 26: inclui Antares (16ª mais brilhante),
// o portão do mergulho ao centro — o close dela precisa de corpo, não
// de PSF. Custa 4 draws, todos invisíveis além de 1.200 pc de casa.
const HERO_COUNT = 16;

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
          uZoom: { value: 1 },
          uCamDist: { value: 100 },
          uCore: { value: 1 },
          uGain: { value: 1 },
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

  static readonly TAN_REF = Math.tan(THREE.MathUtils.degToRad(58 / 2));

  update(time: number, camPos: THREE.Vector3, tanHalfFov: number) {
    const zoom = Math.min(1, tanHalfFov / HeroStars.TAN_REF);
    let i = 0;
    for (const child of this.group.children) {
      const m = this.mats[i++];
      m.uniforms.uTime.value = time;
      m.uniforms.uZoom.value = zoom;
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

// ============================================================
// O Sol sob a MESMA lei (unificação 2): de longe ele é uma estrela
// como as outras — mesma PSF dos heróis, mas com magnitude VIVA
// (M=4,83 + 5·log10(d/10)): a 0,5 pc vale −1,7, o brilho de Sirius
// vista da Terra. O nearFade do shader faz o crossfade sozinho: de
// perto o clarão some (o disco estruturado do NovoSol é a vista), no
// recuo da hélice ele acende e engole o disco — como a física manda.
// ============================================================
export class SunStar {
  readonly quad: THREE.Mesh;
  private mat: THREE.ShaderMaterial;

  constructor() {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uColor: { value: spectToColor('G') },
        uTime: { value: 0 },
        uSeed: { value: 4.83 },
        uSize: { value: 0.01 },
        uZoom: { value: 1 },
        uCamDist: { value: 100 },
        uCore: { value: 0 },
        uGain: { value: 0 },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      // o glare é artefato de olho/lente: nunca é ocluído pelo próprio
      // disco (com depthTest o disco opaco furava um buraco no clarão)
      depthTest: false,
      transparent: true,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.quad.frustumCulled = false;
    this.quad.renderOrder = 3;
  }

  update(time: number, camDist: number, tanHalfFov: number) {
    const d = Math.max(camDist, 1e-4);
    const m = 4.83 + 5 * Math.log10(d / 10);
    // lei ANGULAR: 1,75°·10^(−0,3m) — em m=−1,46 dá o look de Sirius
    // vista da Terra; teto de 40° (a lei de mundo dos heróis explodia
    // para ~d^−2,5 de ângulo vista de dentro do sub-parsec)
    const ang = Math.min(40, 1.75 * Math.pow(10, -0.3 * m));
    // portão de proximidade CASADO com o crossfade do disco
    // (novoSol.ts, DISC_FADE0/1 = 0,16→0,34 pc): o clarão sobe enquanto
    // o disco sai, e o disco é o assunto enquanto ele existe
    const k = Math.min(1, Math.max(0, (d - 0.14) / 0.16));
    const gate = k * k * (3 - 2 * k);
    const u = this.mat.uniforms;
    // tamanho SEMPRE cheio; quem entra é o ganho (ver uGain no shader)
    u.uSize.value = d * Math.tan((ang * Math.PI) / 180);
    u.uGain.value = gate;
    u.uCamDist.value = d;
    u.uTime.value = time;
    u.uZoom.value = Math.min(1, tanHalfFov / HeroStars.TAN_REF);
    // o núcleo pontual (+ espinhos) só acende DEPOIS que o disco saiu
    // de cena — sobrepostos, o núcleo apertado imprime um ponto branco
    // no meio do disco e a coisa lê como retículo de mira
    const c = Math.min(1, Math.max(0, (d - 0.3) / 0.12));
    u.uCore.value = c * c * (3 - 2 * c);
  }

  dispose() {
    this.mat.dispose();
    this.quad.geometry.dispose();
  }
}
