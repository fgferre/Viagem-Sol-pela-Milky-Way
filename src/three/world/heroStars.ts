// ============================================================
// Hero stars — as 16 estrelas mais brilhantes ganham billboards
// de brilho dedicados com tamanho angular real (flybys AAA).
//
// RESGATE (2026-08-16, ordem do dono): esta peça morreu no M2 e foi
// EXUMADA byte a byte de `bd12905` depois que a prancha
// historia-dos-spikes provou que a substituta (cruz procedural por lei
// de fluxo) perdeu a estética do filme. Palavras dele: *"Porque você
// não resgata no git a versão certa antes de entrar o atlas? ... Veja
// as imagens de spikes geradas anteriormente pelo histórico do git."*
// A divisão de trabalho fica assim: a LEI ÚNICA de fluxo segue regendo
// catálogo, planetas e o clarão do Sol; a ARTE das 16 é a do filme de
// 30/07 — braço fino 16/2,4, halo e cruz na cor da estrela, cintilação.
//
// Duas amputações no exumado, ambas de código MORTO da era da pupila
// (reprovada pelo dono em 14/08, enterrada no M2 — não renasce junto):
//  · a espinha de exposição por quadro saiu (era ×1 neutro);
//  · a referência de lente virou constante LOCAL (a de lodStellar morreu
//    no M2) — a MESMA expressão, bit a bit.
// ============================================================
import * as THREE from 'three';
import type { NamedStar } from '../config';
import {
  GLSL_BRANCO_DO_NUCLEO,
  GLSL_NOISE,
  bvToColor,
  glslBracosDeDifracao,
  glslNucleoEHalo,
} from '../shaders/common';
import { BV_MEDIDO, SOL_BV } from './clarao';

/** A lente de referência do `uZoom`: tan(29°), a metade do fov padrão
 *  (58°). Era `HERO_ZOOM_TAN_REF` em lodStellar (morta no M2); a
 *  expressão é a MESMA associação de `degToRad` — um ULP aqui seria um
 *  ULP no pixel. */
export const TAN_DA_LENTE_PADRAO = Math.tan(29 * (Math.PI / 180));

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
  ${glslNucleoEHalo(' * uCore')}

  // spikes de difração
  ${glslBracosDeDifracao(' * uCore')}

  // cintilação sutil de plasma
  float tw = 0.92 + 0.08 * vnoise(vec3(uSeed * 10.0, uTime * 0.5, uSeed));

  vec3 col = (${GLSL_BRANCO_DO_NUCLEO} * core + uColor * (glow + spikes)) * tw;
  float a = clamp(core + glow + spikes, 0.0, 1.0);

  gl_FragColor = vec4(col * nearFade * farFade * uGain,
                      a * nearFade * farFade * uGain);
}
`;

// A tabela de B−V MEDIDO das 16 (Onda 1b, SIMBAD/Hipparcos) e o B−V do
// Sol vêm de `clarao.ts`, ENDEREÇO ÚNICO desde 21/08. Ela morava aqui
// também, redigitada como `HERO_BV` — as duas cópias tinham diff vazio
// nas 16 entradas, e é o tipo de igualdade que só continua verdadeira
// enquanto ninguém corrige um lado. O `ci` do sidecar (HYG v4.4) acerta
// 15 delas dentro de ±0,03 do publicado, mas erra onde mais se vê:
// Betelgeuse vem 1,50 lá contra 1,85 medido — e a supergigante é o
// retrato do Ato II. A tabela é a autoridade; o `ci` cobre qualquer
// nomeada fora dela; a string espectral não decide mais cor (a da
// Capella é "M1: comp" — a lei antiga de baldes a pintava de M).
//
// O import atravessa para a camada da lei e ISSO NÃO É CONSUMO DA LEI:
// o que vem é DADO medido (cor de catálogo), não `estrela.ts` — a linha
// `heroes-de-autor` do cadastro segue `consomeL1: false`, e o teste do
// cadastro cobra o import de verdade.

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
  /** QUAIS são as 16, na ordem dos filhos do grupo. */
  readonly chosen: NamedStar[] = [];
  /** `uSize` de cada uma, em pc (o mesmo valor do uniform). */
  readonly sizePc: number[] = [];
  /** distância câmera↔estrela do ÚLTIMO `update`, em pc. */
  readonly camDistPc: number[] = [];

  constructor(named: readonly NamedStar[]) {
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
          uColor: { value: heroColor(BV_MEDIDO[s.n] ?? s.ci ?? SOL_BV) },
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

  update(time: number, camPos: THREE.Vector3, tanHalfFov: number) {
    const zoom = Math.min(1, tanHalfFov / TAN_DA_LENTE_PADRAO);
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
