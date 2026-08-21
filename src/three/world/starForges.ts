// ============================================================
// Forjas estelares OBSERVADAS — um único draw call de pontos
// tipados popula a galáxia com objetos reais:
//   · 1.413 regiões H II WISE (nós rosados H-alfa)
//   · 199 masers BeSSeL (paralaxe trigonométrica — âncoras)
//   · 988 aglomerados jovens Gaia DR3 (glitter azul-branco)
//   · 2.806 Cefeidas jovens Gaia DR3 (pulsando de verdade)
//   · amostra proxy de estrelas quentes Gaia DR3
//
// Camada `observed`/`derived`: nenhuma posição é inventada.
// Incerteza vira brilho: erro relativo alto = ponto mais tênue.
// ============================================================
import * as THREE from 'three';
import type { GalacticAssets } from '../cartography/galacticAssets';
import { galactocentricToScene, EX, EY, EZ, GAL } from './baseGalactica';
import { GLSL_CARTOGRAPHY } from '../cartography/galacticModel';
import { GLSL_STAR_COLOR } from '../shaders/common';

const TYPE_HII = 0;
const TYPE_MASER = 1;
const TYPE_CLUSTER = 2;
const TYPE_CEPHEID = 3;
const TYPE_OB_PROXY = 4;

// x,y,z,size,type,intensity,seed — e no proxy OB o "seed" carrega a
// TEMPERATURA medida (K) em vez de um sorteio: ver a cor do tipo 4 no FRAG.
// O slot é o mesmo porque, para essa população, ele só alimentava a cor.
const STRIDE = 7;

const VERT = /* glsl */ `
attribute float aSize;      // diâmetro do kernel de representação (pc)
attribute float aType;
attribute float aIntensity;
attribute float aSeed;

uniform vec3 uCamPos;
uniform float uScreenH;
uniform float uTanHalfFov;
uniform float uFade;
uniform float uTime;
// extinção pela coluna de poeira bakeada — mesmo bloco de GALAXY_VERT.
// Os forges têm renderOrder 3: os sprites multiplicativos (order 5) os
// escureciam, e o herdeiro precisa escurecê-los também.
uniform sampler2D uTauMap;
uniform vec3 uEX;
uniform vec3 uEY;
uniform vec3 uEZ;
uniform vec3 uGC;

varying float vType;
varying float vAlpha;
varying float vSeed;
varying vec3 vExtinct;

${GLSL_CARTOGRAPHY}

void main() {
  float dist = length(position - uCamPos);
  float px = aSize * uScreenH / (2.0 * uTanHalfFov * max(dist, 1.0));
  float clamped = clamp(px, 0.85, 26.0);
  // conservação de fluxo — mesma regra das partículas da galáxia
  float shrink = min(1.0, 9.0 / max(px * px, 1e-4));
  float subPix = px < 0.85 ? (px * px) / 0.7225 : 1.0;

  float intensity = aIntensity;
  // Cefeidas pulsam: períodos reais são 1–70 dias — inviáveis numa
  // sessão. Compressão temporal documentada de ~2000×: períodos de
  // ~70–350 s, respiração lenta perceptível, nunca strobo.
  if (aType > 2.5 && aType < 3.5) {
    intensity *= 0.78 + 0.34 * sin(uTime * (0.018 + fract(aSeed * 13.7) * 0.072) + aSeed * 41.0);
  }

  vType = aType;
  vAlpha = intensity * uFade * shrink * subPix;
  vSeed = aSeed;

  // mesma extinção por coluna de GALAXY_VERT (comentário completo lá)
  vec3 qv = position - uGC;
  vec2 xy = vec2(dot(qv, uEX), dot(qv, uEY));
  float rG = length(xy);
  float tauPerp = texture2D(uTauMap, xy / (2.0 * GAL_DISK_RADIUS) + 0.5).a;
  float zTil = dot(qv, uEZ) - galWarpHeight(rG, atan(xy.y, xy.x + 1e-7));
  float fxE = clamp((rG - 7500.0) / 9300.0, 0.0, 1.0);
  float sigmaD = 58.0 + fxE * fxE * 120.0;
  float camSide = sign(dot(uCamPos - uGC, uEZ));
  float cArg = clamp(2.35 * camSide * zTil / sigmaD, -20.0, 20.0);
  float Cfrac = 1.0 / (1.0 + exp(cArg));
  float muE = max(abs(dot(normalize(uCamPos - position), uEZ)), 0.05);
  vExtinct = exp(-(tauPerp * Cfrac / muE) * vec3(0.75, 1.0, 1.32));

  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamped;
}
`;

const FRAG = /* glsl */ `
precision highp float;

varying float vType;
varying float vAlpha;
varying float vSeed;
varying vec3 vExtinct;

${GLSL_STAR_COLOR}

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0 || vAlpha < 0.002) discard;

  vec3 col;
  float profile;
  if (vType < 0.5) {
    // H II — halo H-alfa suave com coração levemente branco
    profile = exp(-r2 * 3.2);
    col = mix(vec3(1.0, 0.32, 0.5), vec3(1.0, 0.78, 0.82), exp(-r2 * 9.0) * 0.55);
  } else if (vType < 1.5) {
    // maser BeSSeL — núcleo compacto azul-branco (âncora de paralaxe)
    profile = exp(-r2 * 7.0);
    col = vec3(0.72, 0.84, 1.0);
  } else if (vType < 2.5) {
    // aglomerado jovem — núcleo nítido + halo frio
    profile = exp(-r2 * 5.0) + exp(-r2 * 1.8) * 0.35;
    col = mix(vec3(0.72, 0.82, 1.0), vec3(0.9, 0.94, 1.0), fract(vSeed * 5.1));
  } else if (vType < 3.5) {
    // Cefeida — amarela-branca quente
    profile = exp(-r2 * 5.5);
    col = vec3(1.0, 0.9, 0.72);
  } else {
    // proxy OB Gaia — núcleo frio pequeno; densidade, não “pérolas” enormes.
    // A COR VEM DA TEMPERATURA MEDIDA (vSeed = Teff em K), pela mesma
    // blackbodyLinear das 328.749 do HYG — unificação 1, uma lei fotométrica.
    // Antes era mix(azul, quase-branco, fract(seed*7.3)): um sorteio, com a
    // Teff de cada estrela parada no arquivo que o visitante já baixava.
    profile = exp(-r2 * 7.5);
    vec3 bb = blackbodyLinear(vSeed);
    // LUMINÂNCIA CONSERVADA, e isto não é detalhe: a lição da rodada 06/07 é
    // que trocar a cor de uma população por outra de Y diferente é mudança de
    // FLUXO disfarçada de cor, e a medição atribui à cor o que é de brilho.
    // 0,7889 é o Y MÉDIO da paleta antiga (mix em k=0,5, o valor esperado do
    // sorteio uniforme): assim só a MATIZ se move, e se espessura ou perfil
    // mexerem no gate, é defeito e não consequência.
    col = bb * (0.7889 / dot(bb, vec3(0.2126, 0.7152, 0.0722)));
  }

  gl_FragColor = vec4(col * vExtinct * profile * vAlpha, 1.0);
}
`;

export class StarForges {
  readonly points: THREE.Points;
  private material: THREE.ShaderMaterial;

  constructor(assets: GalacticAssets) {
    const entries: number[] = [];
    const scratch = new THREE.Vector3();

    const push = (
      lx: number, ly: number, lz: number,
      size: number, type: number, intensity: number, seed: number
    ) => {
      galactocentricToScene(lx, ly, lz, scratch);
      entries.push(scratch.x, scratch.y, scratch.z, size, type, intensity, seed);
    };

    // H II — raio real agregado; incerteza de distância esmaece e a
    // CLASSE do catálogo importa: K = confirmada brilha cheia,
    // candidatas/grupos/radio-quiet ficam mais discretas
    {
      const { data, count, stride } = assets.hiiRegions;
      for (let i = 0; i < count; i++) {
        const o = i * stride;
        const relErr = data[o + 6];
        const classCode = data[o + 7]; // 3 = K (confirmada)
        const method = data[o + 8];
        const classFactor = Math.abs(classCode - 3) < 0.5 ? 1.0 : 0.7;
        const confidence = (classFactor / (1 + Math.max(relErr, 0) * 2.2));
        const parallaxBoost = Math.abs(method - 10) < 0.5 ? 1.25 : 1.0;
        push(
          data[o], data[o + 1], data[o + 2],
          THREE.MathUtils.clamp(data[o + 3] * 3.0, 34, 170),
          TYPE_HII,
          0.16 * confidence * parallaxBoost,
          (i * 0.618034) % 1
        );
      }
    }

    // masers BeSSeL — as posições mais confiáveis de toda a cena
    {
      const { data, count, stride } = assets.spiralAnchors;
      for (let i = 0; i < count; i++) {
        const o = i * stride;
        const relParErr = data[o + 6];
        push(
          data[o], data[o + 1], data[o + 2],
          24,
          TYPE_MASER,
          0.34 * THREE.MathUtils.clamp(1.25 - relParErr * 1.8, 0.35, 1.25),
          (i * 0.754877 + 0.11) % 1
        );
      }
    }

    // aglomerados jovens — tamanho pelo nº de membros
    {
      const { data, count, stride } = assets.gaiaYoungClusters;
      for (let i = 0; i < count; i++) {
        const o = i * stride;
        const relParErr = data[o + 6];
        const members = data[o + 8];
        const bright = data[o + 9];
        push(
          data[o], data[o + 1], data[o + 2],
          THREE.MathUtils.clamp(13 + Math.sqrt(Math.max(members, 0)) * 1.3, 13, 48),
          TYPE_CLUSTER,
          0.14 * (0.55 + Math.min(bright, 70) / 70) / (1 + Math.max(relParErr, 0) * 2.0),
          (i * 0.552812 + 0.29) % 1
        );
      }
    }

    // Cefeidas jovens — brilho por incerteza, pulso no shader
    {
      const { data, count, stride } = assets.gaiaYoungCepheids;
      for (let i = 0; i < count; i++) {
        const o = i * stride;
        const dist = data[o + 3];
        const sigma = data[o + 4];
        const rel = dist > 0 ? sigma / dist : 1;
        push(
          data[o], data[o + 1], data[o + 2],
          15,
          TYPE_CEPHEID,
          0.2 / (1 + Math.max(rel, 0) * 3.0),
          (i * 0.412031 + 0.47) % 1
        );
      }
    }

    // Seleção proxy de estrelas quentes Gaia DR3. O kernel em pc conserva
    // fluxo na vista externa; não representa o diâmetro físico da estrela.
    {
      const { data, count, stride } = assets.gaiaObProxyStars;
      for (let i = 0; i < count; i++) {
        const o = i * stride;
        // stride 7: xPc, yPc, zPc, sigmaDistancePc, photGMeanMag,
        // effectiveTemperatureK, astrometricConfidence.
        const magnitude = data[o + 4];
        const confidence = data[o + 6];
        // [5] = effectiveTemperatureK (Gaia teff_esphs, com teff_gspphot de
        // reserva). Estava no arquivo desde sempre, baixada por todo
        // visitante, e o shader pintava estas 100.000 com um SORTEIO.
        // A cor OBSERVADA (bpMinusRp) NÃO serve e por isso nem viaja mais no
        // arquivo: ela já vem avermelhada pela poeira — mediana +0,76 —, e o
        // renderer aplica a própria extinção pelo tauMap (vExtinct, no VERT).
        // Usá-la avermelharia duas vezes. Quem precisar dela a busca na
        // consulta publicada, onde ela segue viva no corte da amostra.
        const temperaturaK = data[o + 5];
        const brightness = THREE.MathUtils.clamp(
          (17 - magnitude) / 8,
          0.2,
          1
        );
        push(
          data[o],
          data[o + 1],
          data[o + 2],
          10 + brightness * 8,
          TYPE_OB_PROXY,
          (0.022 + brightness * 0.038) * confidence,
          temperaturaK
        );
      }
    }

    const packed = new Float32Array(entries);
    const buffer = new THREE.InterleavedBuffer(packed, STRIDE);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(buffer, 3, 0));
    geometry.setAttribute('aSize', new THREE.InterleavedBufferAttribute(buffer, 1, 3));
    geometry.setAttribute('aType', new THREE.InterleavedBufferAttribute(buffer, 1, 4));
    geometry.setAttribute('aIntensity', new THREE.InterleavedBufferAttribute(buffer, 1, 5));
    geometry.setAttribute('aSeed', new THREE.InterleavedBufferAttribute(buffer, 1, 6));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60000);

    // nasce sem extinção (1×1 A=0); o director liga o mapa depois do bake
    const tauMap = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
    tauMap.needsUpdate = true;
    const exBase = EX.clone();
    const eyBase = EY.clone();
    const ezBase = EZ.clone();
    const gcBase = GAL.GC_POS.clone();

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uCamPos: { value: new THREE.Vector3() },
        uTauMap: { value: tauMap },
        uEX: { value: exBase },
        uEY: { value: eyBase },
        uEZ: { value: ezBase },
        uGC: { value: gcBase },
        uScreenH: { value: 1080 },
        uTanHalfFov: { value: 0.55 },
        uFade: { value: 0 },
        uTime: { value: 0 },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
  }

  /** liga o τ⊥ bakeado — chamado pelo director depois do bake das lâminas */
  setTauMap(t: THREE.Texture) {
    this.material.uniforms.uTauMap.value = t;
  }

  update(
    camPos: THREE.Vector3,
    screenH: number,
    tanHalfFov: number,
    time: number,
    fade: number
  ) {
    const u = this.material.uniforms;
    (u.uCamPos.value as THREE.Vector3).copy(camPos);
    u.uScreenH.value = screenH;
    u.uTanHalfFov.value = tanHalfFov;
    u.uTime.value = time;
    u.uFade.value = fade;
    this.points.visible = fade > 0.001;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
