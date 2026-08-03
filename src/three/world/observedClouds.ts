// ============================================================
// Nuvens moleculares OBSERVADAS — 8.107 nuvens CO (Miville-
// Deschênes 2017, filtradas por rendererRecommended) + 84
// grandes complexos APOGEE, como billboards FBM instanciados
// com blending multiplicativo: são as fendas escuras reais da
// Via Láctea, nas posições derivadas dos catálogos.
//
// Camada `derived`: posição/raio/densidade vêm dos binários;
// apenas a silhueta interna de cada nuvem é procedural (FBM),
// pois nenhum catálogo resolve a subestrutura em pc.
// ============================================================
import * as THREE from 'three';
import type { CatalogueTable } from '../cartography/galacticAssets';
import { galactocentricToScene } from './galaxy';
import { GLSL_NOISE } from '../shaders/common';

// As nuvens CO individuais têm dezenas de pc — subpixel na vista
// externa. O fator agrega o material não resolvido ao redor do
// centroide observado, sem deslocar nada.
// ponytail: escala artística fixa; LOD por distância se um dia houver zoom orbital
const CO_RADIUS_SCALE = 2.1;
const LARGE_RADIUS_SCALE = 1.2;

const VERT = /* glsl */ `
attribute vec3 aCenter;
attribute float aRadius;
attribute float aAlpha;
attribute float aSeed;

uniform float uFade;
uniform float uTanHalfFov;

varying vec2 vUv;
varying float vAlpha;
varying float vSeed;

void main() {
  vUv = position.xy; // -1..1 no quad base
  vec4 center = modelViewMatrix * vec4(aCenter, 1.0);
  float dist = length(center.xyz);
  // some antes de a câmera entrar na nuvem: perto, o volume local
  // (nebulosa raymarch) assume.
  float nearFade = smoothstep(aRadius * 2.0, aRadius * 7.0, dist);
  vAlpha = aAlpha * uFade * nearFade;
  vSeed = aSeed;

  // Orçamento de fill-rate: quads invisíveis colapsam a ponto (zero
  // rasterização) e o raio projetado é limitado a ~60% da tela —
  // além disso o nearFade já os tornou quase transparentes.
  float visible = step(0.003, vAlpha);
  float radius = min(aRadius, 0.6 * uTanHalfFov * dist);
  center.xy += position.xy * radius * visible;

  gl_Position = projectionMatrix * center;
}
`;

const FRAG = /* glsl */ `
precision highp float;

uniform float uTau;

varying vec2 vUv;
varying float vAlpha;
varying float vSeed;

${GLSL_NOISE}

void main() {
  if (vAlpha < 0.003) discard;
  vec2 uv = vUv;
  float ang = vSeed * 6.2831;
  mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  uv = rot * uv;
  uv.x *= 0.6 + fract(vSeed * 7.31) * 0.55;
  float r = length(uv);
  if (r > 1.0) discard;

  // silhueta irregular: fbm esculpe a borda e abre vãos internos —
  // erosão forte para que nuvens vizinhas se fundam em fendas, não
  // em bolinhas isoladas.
  //
  // DUAS OITAVAS, FIXAS — correção de um stall de driver, por medição.
  // A 3ª oitava deste fbm, neste shader (multiply + instanced), dispara
  // um stall periódico de ~210–280 ms no p99 a partir de 1440p de
  // altura. Bissecado em janela real 2560×1440, ~1400 frames por caso:
  // frag trivial 18,3 ms · 2 oitavas fixas 18,3 · ternário vPx<24?2:3
  // 240–278 · 3 oitavas fixas 209. Zero longtasks — o stall é do lado
  // GPU/driver (ANGLE/D3D11), mecanismo não identificado; o custo ALU
  // de uma oitava não explica, é patologia, não desempenho.
  // A oitava perdida era textura de alta frequência que o grain medido
  // já tinha em DOBRO do alvo (0,1376 vs 0,0679) — perdê-la aponta para
  // o alvo. Não subir de 2 oitavas sem medir p99 em janela real 1440p.
  float body = 1.0 - smoothstep(0.05, 0.95, r);
  float texture3 = fbm(vec3(uv * 2.2, vSeed * 19.7), 2);
  float shape = body * smoothstep(0.34, 0.72, texture3 * 0.8 + body * 0.2);

  // Mesma LEI DE EXTINÇÃO da poeira galáctica (R_V = 3,1): transmissão
  // por canal = exp(−τ·[0.75, 1.0, 1.32]). Uma cor fixa multiplicando
  // tudo pinta de marrom mesmo onde a coluna é rala — a nuvem molecular
  // real avermelha antes de escurecer. Uma física de poeira só, nos dois
  // consumidores.
  float tau = shape * vAlpha * uTau;
  gl_FragColor = vec4(exp(-tau * vec3(0.75, 1.0, 1.32)), 1.0);
}
`;

export class ObservedClouds {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor(clouds: CatalogueTable, largeClouds: CatalogueTable) {
    const entries: number[] = []; // x,y,z,radius,alpha,seed
    const scratch = new THREE.Vector3();

    const push = (
      lx: number, ly: number, lz: number,
      radius: number, alpha: number, seed: number
    ) => {
      galactocentricToScene(lx, ly, lz, scratch);
      entries.push(scratch.x, scratch.y, scratch.z, radius, alpha, seed);
    };

    // nuvens CO — só as recomendadas pelo manifesto. farDistanceFlag
    // NÃO é incerteza: é qual solução (near/far) da ambiguidade
    // cinemática o catálogo adotou — não esmaece nada.
    {
      const { data, count, stride } = clouds;
      for (let i = 0; i < count; i++) {
        const o = i * stride;
        if (data[o + 10] < 0.5) continue; // rendererRecommended
        const surface = data[o + 5];
        const alpha = (surface / (surface + 130)) * 0.34;
        if (alpha < 0.015) continue;
        push(
          data[o], data[o + 1], data[o + 2],
          Math.max(data[o + 3] * CO_RADIUS_SCALE, 26),
          alpha,
          (i * 0.6180339887) % 1
        );
      }
    }

    // grandes complexos APOGEE — maiores e mais difusos. O joelho
    // fica na mediana do catálogo (~116 cm⁻³) para que a densidade
    // medida realmente module a opacidade; o erro de distância
    // esmaece os complexos menos seguros (contrato do manifesto).
    {
      const { data, count, stride } = largeClouds;
      for (let i = 0; i < count; i++) {
        const o = i * stride;
        const density = data[o + 4];
        const dist = data[o + 6];
        const sigma = data[o + 7];
        const rel = dist > 0 ? Math.max(sigma / dist, 0) : 1;
        const confidence = 1 / (1 + rel * 2.2);
        const alpha = (density / (density + 116)) * 0.82 * confidence;
        push(
          data[o], data[o + 1], data[o + 2],
          Math.max(data[o + 3] * LARGE_RADIUS_SCALE, 90),
          alpha,
          (i * 0.7548776662 + 0.31) % 1
        );
      }
    }

    const instanceCount = entries.length / 6;
    const base = new THREE.PlaneGeometry(2, 2);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = base.index;
    geometry.setAttribute('position', base.getAttribute('position'));
    geometry.instanceCount = instanceCount;

    const packed = new Float32Array(entries);
    const instanced = new THREE.InstancedInterleavedBuffer(packed, 6);
    geometry.setAttribute('aCenter', new THREE.InterleavedBufferAttribute(instanced, 3, 0));
    geometry.setAttribute('aRadius', new THREE.InterleavedBufferAttribute(instanced, 1, 3));
    geometry.setAttribute('aAlpha', new THREE.InterleavedBufferAttribute(instanced, 1, 4));
    geometry.setAttribute('aSeed', new THREE.InterleavedBufferAttribute(instanced, 1, 5));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60000);

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uFade: { value: 0 },
        uTanHalfFov: { value: 0.55 },
        uTau: { value: 2.4 },
      },
      blending: THREE.MultiplyBlending,
      depthWrite: false,
      transparent: true,
      premultipliedAlpha: true,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5; // junto da poeira galáctica multiplicativa
  }

  update(tanHalfFov: number, fade: number) {
    this.material.uniforms.uTanHalfFov.value = tanHalfFov;
    this.material.uniforms.uFade.value = fade;
    this.mesh.visible = fade > 0.001;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
