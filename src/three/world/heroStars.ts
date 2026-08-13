// ============================================================
// Hero stars — as 16 estrelas mais brilhantes ganham billboards
// de brilho dedicados com tamanho angular real (flybys AAA).
// ============================================================
import * as THREE from 'three';
import type { NamedStar } from '../config';
import { GLSL_NOISE, bvToColor } from '../shaders/common';
import { HERO_ZOOM_TAN_REF, sunStarGain } from './lodStellar';

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

// Tabela literal de B-V MEDIDO das 16 heroes (Onda 1b, valores
// publicados — SIMBAD/Hipparcos). O `ci` do sidecar (HYG v4.4) acerta
// 15 delas dentro de ±0,03 do publicado, mas erra onde mais se vê:
// Betelgeuse vem 1,50 lá contra 1,85 medido — e a supergigante é o
// retrato do Ato II. A tabela é a autoridade; o `ci` do sidecar cobre
// qualquer nomeada fora dela; a string espectral não decide mais cor
// (a da Capella é "M1: comp" — a lei antiga de baldes a pintava de M).
const HERO_BV: Record<string, number> = {
  Sirius: 0.0,
  Canopus: 0.15,
  Arcturus: 1.23,
  'Rigil Kentaurus': 0.71,
  Vega: 0.0,
  Capella: 0.8,
  Rigel: -0.03,
  Procyon: 0.42,
  Achernar: -0.16,
  Betelgeuse: 1.85,
  Hadar: -0.23,
  Altair: 0.22,
  Acrux: -0.26,
  Aldebaran: 1.54,
  Spica: -0.23,
  Antares: 1.83,
};

/** B-V do Sol (medido): a cor do clarão distante sai da MESMA lei. */
const SOL_BV = 0.653;

function heroColor(bv: number): THREE.Color {
  const [r, g, b] = bvToColor(bv);
  return new THREE.Color(r, g, b);
}

// 16 desde o roteiro da rodada 26: inclui Antares (16ª mais brilhante),
// o portão do mergulho ao centro — o close dela precisa de corpo, não
// de PSF. Custa 4 draws, todos invisíveis além de 1.200 pc de casa.
const HERO_COUNT = 16;

export class HeroStars {
  readonly group = new THREE.Group();
  private mats: THREE.ShaderMaterial[] = [];
  /** QUAIS são as 16, na ordem dos filhos do grupo. Publicado desde a
   *  fase 3 da Onda 3: quem escreve o `aFade` do ponto do catálogo
   *  precisa da identidade (para achar o índice) e do `uSize` (para
   *  saber o tamanho na tela) — e ler daqui é a única forma de não
   *  reordenar/redigitar a escolha das 16 do outro lado. */
  readonly chosen: NamedStar[] = [];
  /** `uSize` de cada uma, em pc (o mesmo valor do uniform). */
  readonly sizePc: number[] = [];
  /** distância câmera↔estrela do ÚLTIMO `update`, em pc — o mesmo
   *  número que foi para `uCamDist`, sem recalcular do outro lado. */
  readonly camDistPc: number[] = [];

  constructor(named: NamedStar[]) {
    const heroes = [...named].sort((a, b) => a.m - b.m).slice(0, HERO_COUNT);
    let heroIndex = 0;
    for (const s of heroes) {
      const lum = Math.pow(10, -0.3 * s.m);
      const size = 0.08 * lum; // pc — raio do brilho
      this.chosen.push(s);
      this.sizePc.push(size);
      this.camDistPc.push(Infinity); // até o primeiro update: "longe"
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uColor: { value: heroColor(HERO_BV[s.n] ?? s.ci ?? SOL_BV) },
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

  /** A lente de referência do `uZoom`. Vinha de
   *  `Math.tan(THREE.MathUtils.degToRad(58 / 2))`; desde a fase 3 da
   *  Onda 3 vem de `lodStellar`, que precisa do MESMO número para
   *  prever o tamanho do billboard na tela. A expressão de lá é
   *  bit-idêntica a esta (`29 * (Math.PI / 180)`, a mesma associação de
   *  `degToRad`) — um ULP aqui seria um ULP no pixel. */
  static readonly TAN_REF = HERO_ZOOM_TAN_REF;

  update(time: number, camPos: THREE.Vector3, tanHalfFov: number) {
    const zoom = Math.min(1, tanHalfFov / HeroStars.TAN_REF);
    let i = 0;
    for (const child of this.group.children) {
      const m = this.mats[i];
      m.uniforms.uTime.value = time;
      m.uniforms.uZoom.value = zoom;
      const dist = (child as THREE.Mesh).position.distanceTo(camPos);
      m.uniforms.uCamDist.value = dist;
      this.camDistPc[i] = dist;
      i++;
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
// perto o clarão some (o disco estruturado do StellarBody é a vista), no
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
        uColor: { value: heroColor(SOL_BV) },
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
    // O PORTÃO DE PROXIMIDADE, e desde a F3 ele é CASADO com o ponto
    // fotométrico da camada dos dez corpos, não mais com o disco
    // inflado: o clarão sobe na EXATA medida em que o Sol-ponto de
    // `planetas.ts` cede (`deepPointGain = 1 − sunStarGain`, soma
    // constante), na janela de entrega {0,02; 0,05} pc. A janela vem de
    // `lodStellar.ts` — até a Onda 3 os números viviam redigitados dos
    // dois lados, ligados só por este comentário.
    const gate = sunStarGain(d);
    const u = this.mat.uniforms;
    // tamanho SEMPRE cheio; quem entra é o ganho (ver uGain no shader)
    u.uSize.value = d * Math.tan((ang * Math.PI) / 180);
    u.uGain.value = gate;
    u.uCamDist.value = d;
    u.uTime.value = time;
    u.uZoom.value = Math.min(1, tanHalfFov / HeroStars.TAN_REF);
    // O NÚCLEO ACENDE COM O GANHO desde a F3, e não mais numa segunda
    // rampa atrasada {0,30; 0,42}. A razão da rampa atrasada era o
    // disco ("sobrepostos, o núcleo apertado imprime um ponto branco no
    // meio do disco e a coisa lê como retículo de mira"); sem disco não
    // há o que sobrepor, e mantê-la deixaria o Sol como um borrão SEM
    // ponto no meio de 0,05 a 0,30 pc — justamente onde ele já é, para
    // todos os efeitos, uma estrela do catálogo.
    u.uCore.value = gate;
  }

  dispose() {
    this.mat.dispose();
    this.quad.geometry.dispose();
  }
}
