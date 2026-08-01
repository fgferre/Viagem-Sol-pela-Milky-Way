// ============================================================
// Campo estelar envolvente — uma caixa de ~2,4 kpc que acompanha
// a câmera com wrap determinístico no ESPAÇO-MUNDO: cada estrela
// tem posição fixa no universo (offset ≡ mod caixa), então não há
// popping nem nuvem que "anda junto". O brilho de cada estrela é
// modulado pela densidade estelar galactocêntrica real (disco fino
// + espesso + bojo + braços), então voar para o disco interno é
// mergulhar num céu em chamas e o disco externo é o fim do mundo.
//
// Camada `inferred` — população estatística; perto do Sol ela se
// desliga e o catálogo HYG (real) assume.
// ============================================================
import * as THREE from 'three';
import { GLSL_GALAXY, GLSL_STAR_COLOR } from '../shaders/common';
import { GLSL_CARTOGRAPHY } from '../cartography/galacticModel';

const BOX = 2400; // pc — aresta da caixa de wrap
const COUNT = 60000;

const VERT = /* glsl */ `
attribute float aMag;
attribute float aCi;
attribute float aSeed;

uniform vec3 uCamPos;
uniform float uScreenH;
uniform float uTanHalfFov;
uniform float uFade;

varying vec3 vColor;
varying float vAlpha;

${GLSL_GALAXY}
${GLSL_CARTOGRAPHY}
${GLSL_STAR_COLOR}

// densidade estelar relativa (≈1 na vizinhança solar)
float stellarDensity(vec3 p, out float armGate, out float bulgeGate) {
  vec3 q = p - GAL_CENTER;
  float z = dot(q, GAL_N);
  vec2 xy = vec2(dot(q, GAL_X), dot(q, GAL_Y));
  float radiusPc = length(xy);
  float theta = atan(xy.y, xy.x);
  float zw = z - galWarpHeight(radiusPc, theta);
  float thin = exp(-radiusPc / 2600.0) * exp(-abs(zw) / 300.0);
  float thick = exp(-radiusPc / 3600.0) * exp(-abs(zw) / 1000.0) * 0.12;
  float bulge = exp(-length(q) / 900.0) * 14.0;
  // braços: contraste de massa modesto (≲3x); o brilho azul vem da cor.
  // Variante de GÁS (4 braços parecidos), não a pesada: com renderWeight
  // 0,42·(1±1) o par fraco zera EXATO, e um campo de massa com dois
  // braços ausentes — enquanto o raymarch de gás desenha braço pleno no
  // mesmo ponto — decorrelaciona estrelas e gás na vista interna. A
  // dominância 2-braços da vista externa fica nas lâminas/partículas;
  // reequilibrar por aqui é trabalho do gate da vista interna (panorama
  // ESO, lacuna 2 do NORTE).
  float arms = clamp(
    galMajorArmsGas(theta, radiusPc, 22.0) + galLocalArm(theta, radiusPc, 26.0),
    0.0,
    1.0
  );
  armGate = arms;
  bulgeGate = clamp(bulge, 0.0, 1.0);
  float edge = 1.0 - smoothstep(15500.0, GAL_DISK_RADIUS + 2500.0, radiusPc);
  // 1/0.0436 normaliza para R=8150, z=0
  return (thin * (0.75 + 0.55 * arms) + thick) * edge * 22.9 + bulge * 0.02;
}

void main() {
  // wrap determinístico: wp ≡ position (mod BOX), dentro da caixa
  // centrada na câmera — a estrela é fixa no mundo
  vec3 wp = position - ${BOX.toFixed(1)} *
    floor((position - uCamPos) / ${BOX.toFixed(1)} + 0.5);

  float dist = length(wp - uCamPos);
  float armGate;
  float bulgeGate;
  float density = stellarDensity(wp, armGate, bulgeGate);

  // perto do Sol o HYG real assume — sem dupla contagem
  float sunGate = smoothstep(900.0, 2100.0, length(wp));
  // esconde a costura do wrap na borda da caixa
  float edgeFade = 1.0 - smoothstep(${(BOX * 0.36).toFixed(1)}, ${(BOX * 0.5).toFixed(1)}, dist);

  // população: braços ganham estrelas jovens azuis (20% dos seeds),
  // o bojo puxa para velha e dourada
  float youngPick = step(0.8, fract(aSeed * 7.31)) * armGate;
  float ci = mix(aCi, -0.18, youngPick * 0.85);
  ci = mix(ci, 1.15, bulgeGate * 0.55);
  vColor = bvToColor(ci);

  float lum = pow(10.0, -0.3 * aMag);
  float px = 900.0 * lum * uScreenH / (2.0 * uTanHalfFov * max(dist, 1.0)) * 0.002;
  float clamped = clamp(px, 0.8, 5.0);
  float shrink = min(1.0, 4.0 / max(px * px, 1e-4));
  float subPix = px < 0.8 ? (px * px) / 0.64 : 1.0;

  vAlpha = (0.16 + 0.5 * lum) * min(density, 2.6) * sunGate * edgeFade *
    shrink * subPix * uFade;

  vec4 mv = modelViewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamped;
}
`;

const FRAG = /* glsl */ `
precision highp float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  if (vAlpha < 0.002) discard;
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  float i = exp(-r2 * 4.0);
  gl_FragColor = vec4(vColor * i * vAlpha, 1.0);
}
`;

export class WrappedStars {
  readonly points: THREE.Points;
  private material: THREE.ShaderMaterial;

  constructor(seed = 0x57524150) {
    let state = seed >>> 0;
    const random = () => {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const pos = new Float32Array(COUNT * 3);
    const mag = new Float32Array(COUNT);
    const ci = new Float32Array(COUNT);
    const sd = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (random() - 0.5) * BOX;
      pos[i * 3 + 1] = (random() - 0.5) * BOX;
      pos[i * 3 + 2] = (random() - 0.5) * BOX;
      mag[i] = 4.5 + random() * 6.0;
      ci[i] = -0.15 + random() * 1.6;
      sd[i] = random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aMag', new THREE.BufferAttribute(mag, 1));
    geo.setAttribute('aCi', new THREE.BufferAttribute(ci, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uCamPos: { value: new THREE.Vector3() },
        uScreenH: { value: 1080 },
        uTanHalfFov: { value: 0.55 },
        uFade: { value: 1 },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
  }

  update(camPos: THREE.Vector3, screenH: number, tanHalfFov: number, fade: number) {
    const u = this.material.uniforms;
    (u.uCamPos.value as THREE.Vector3).copy(camPos);
    u.uScreenH.value = screenH;
    u.uTanHalfFov.value = tanHalfFov;
    u.uFade.value = fade;
    this.points.visible = fade > 0.001;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
