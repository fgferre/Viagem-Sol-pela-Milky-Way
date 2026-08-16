// ============================================================
// Hero stars — as 16 estrelas mais brilhantes ganham billboards
// de brilho dedicados com tamanho angular real (flybys AAA).
// ============================================================
import * as THREE from 'three';
import type { NamedStar } from '../config';
import { GLSL_NOISE, bvToColor } from '../shaders/common';
import { HERO_ZOOM_TAN_REF, heroSizePcDePx, psfPointSizePx, sunStarGain } from './lodStellar';

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
// A PUPILA (Onda 8). O clarão é billboard e NÃO passa pela PSF, então o
// deslocamento de expoM0 que expõe o campo de catálogo não chega aqui — e
// sem esta linha a pupila deixaria de ser pupila: fechá-la escureceria as
// fontes pontuais e deixaria os 16 clarões acesos, o que é um TETO sobre uma
// fonte só, não uma exposição de cena. Medido antes de existir: a 3,6 UA o Sol
// (m −23,8) saía MAIS FRACO que α Centauri (m 0,0) na mesma tela — "bonito e
// mentiroso", exatamente o que o NORTE proíbe. 1,0 = pupila aberta, neutro
// EXATO (x·1 === x).
uniform float uExposicao;

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

  // a exposição multiplica a COR e não o alfa: fechar a pupila escurece a
  // fonte, não a dissolve. Mexer no alfa mudaria a forma do clarão (o quanto
  // ele cobre) em vez do brilho dele, que é o que uma pupila faz.
  gl_FragColor = vec4(col * nearFade * farFade * uGain * uExposicao,
                      a * nearFade * farFade * uGain);
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
          uExposicao: { value: 1 },
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

  /**
   * A PUPILA (Onda 8) do lado dos 16 clarões. Um número só para os 16: a
   * exposição é da CENA, não da fonte — dar um ganho por hero seria voltar a
   * ter teto por fonte, que é o que esta linha existe para não ser.
   */
  escreverExposicao(g: number) {
    const v = Number.isFinite(g) && g > 0 ? g : 1;
    for (const m of this.mats) m.uniforms.uExposicao.value = v;
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
// como as outras — mesmo billboard dos heróis, mas com magnitude VIVA
// (M=4,83 + 5·log10(d/10)): a 0,5 pc vale −1,7, o brilho de Sirius
// vista da Terra. Quem faz o crossfade é `sunStarGain` desde a F3 (o
// nearFade do FRAG cuidava disso quando o disco era o inflado, e hoje
// satura em 1 na faixa inteira): na janela {0,02; 0,05} pc o clarão
// acende na EXATA medida em que o Sol-ponto da camada dos dez cede.
// E desde 15/08 (item 42) o TAMANHO dele também sai da lei do campo,
// não mais de um ângulo de autor — ver o `update`.
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
        uExposicao: { value: 1 },
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

  /**
   * O TAMANHO SAIU DA LEI DE AUTOR (item 42, 15/08). A magnitude
   * continua sendo a de sempre — `M=4,83 + 5·log10(d/10)` é FOTOMETRIA e
   * não estava em causa. O que morreu é a lei ANGULAR que ficava logo
   * abaixo dela: `ang = min(40°, 1,75°·10^(−0,3m))`, tamanho tirado de
   * magnitude por gosto, com teto de céu.
   *
   * O QUE O TETO FAZIA, medido: entre ~4,1 e ~27,7 mil UA o `min` fica
   * GRAMPEADO em 40°, e ângulo constante é fração de tela constante — o
   * clarão ocupava exatamente o mesmo pedaço do quadro enquanto o Sol
   * encolhia 6,7×. Na tela do gate (1713 px) isso são **2.593 px de
   * aresta, o MESMO número a 10.800 e a 15.800 UA**, que é o borrão de
   * ~620 px e os ~31% de quadro lavado que o voo de 15/08 registrou e o
   * dono viu: *"esse clarao a 15000 UA … nao vai consumir tudo a tela?"*.
   *
   * O QUE ENTRA NO LUGAR: o tamanho na tela é pedido em PIXELS à MESMA
   * lei do campo estelar (`psfPointSizePx`, o espelho da PSF que a GPU
   * desenha) e convertido para pc pela inversa exata da cadeia do VERT
   * (`heroSizePcDePx`). Nos mesmos dois pontos o clarão passa a medir
   * 15,9 e 15,3 px — e encolhe com a luz, porque agora é a luz que o
   * dimensiona. A COSTURA vem de graça e é o motivo de ser esta lei e não
   * outra: na janela da entrega o clarão e o Sol-ponto da camada dos dez
   * têm o MESMO diâmetro em px por construção, então o crossfade que já
   * era contínuo em brilho (`sunStarGain + deepPointGain = 1`) passa a
   * ser contínuo em TAMANHO também.
   *
   * EFEITO COLATERAL DECLARADO: com `uSize` mil vezes menor, o `nearFade`
   * do FRAG (`smoothstep(uSize·0,5, uSize·1,4, uCamDist)`) satura em 1 em
   * toda a faixa em que o clarão acende. Antes ele valia ~0,868 fixo no
   * platô dos 40° (a razão `uCamDist/uSize` era `1/tan40°` = 1,19,
   * constante). O clarão fica então ~15% mais forte — irrelevante ao lado
   * da área, que cai ~170×.
   *
   * AS 16 ILUSTRES NÃO MUDAM NESTA RODADA: elas seguem com
   * `size = 0,08·10^(−0,3m)` no construtor de `HeroStars`, declarado no
   * cadastro de escala (`clarao-estelar`) e protegido por varredura em
   * `escala.test.ts`. A instância nº 1 sai na frente porque é a única que
   * o visitante vê de dentro do sistema; a lei única para TODAS as fontes
   * é o L3 da Lei da Estrela, que também apaga esta classe inteira.
   */
  update(
    time: number,
    camDist: number,
    tanHalfFov: number,
    screenH: number,
    expoM0: number,
    sigmaPx: number
  ) {
    const d = Math.max(camDist, 1e-4);
    const m = 4.83 + 5 * Math.log10(d / 10);
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
    u.uSize.value = heroSizePcDePx(
      psfPointSizePx(m, expoM0, sigmaPx, screenH),
      d,
      screenH,
      tanHalfFov
    );
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

  /** A pupila, no clarão do Sol — a MESMA da cena (ver `HeroStars`). */
  escreverExposicao(g: number) {
    this.mat.uniforms.uExposicao.value = Number.isFinite(g) && g > 0 ? g : 1;
  }

  dispose() {
    this.mat.dispose();
    this.quad.geometry.dispose();
  }
}
