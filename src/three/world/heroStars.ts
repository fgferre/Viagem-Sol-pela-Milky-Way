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
import { BV_MEDIDO, OCUPACAO_MAXIMA_DA_TELA, SOL_BV } from './clarao';
import {
  ESTRELAS_SEGUEM_A_LENTE,
  UNIFORMES_DA_ASSINATURA,
  receitaSegueALente,
  seguirALente,
} from '../shaders/estrelasDaLente';

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
  ${glslNucleoEHalo()}

  // spikes de difração
  ${glslBracosDeDifracao()}

  // cintilação sutil de plasma
  float tw = 0.92 + 0.08 * vnoise(vec3(uSeed * 10.0, uTime * 0.5, uSeed));

  vec3 col = (${GLSL_BRANCO_DO_NUCLEO} * core + uColor * (glow + spikes)) * tw;
  float a = clamp(core + glow + spikes, 0.0, 1.0);

  gl_FragColor = vec4(col * nearFade * farFade * uGain,
                      a * nearFade * farFade * uGain);
}
`;

/** `FRAG` com os braços trocados pela assinatura da lente de Ajustes (`estrelasDaLente.ts`). */
const FRAG_DA_LENTE = ESTRELAS_SEGUEM_A_LENTE ? receitaSegueALente(FRAG, 'abs(dFdx(vUv.x))') : FRAG;

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

/**
 * A CHEGADA DA HERO (13/11) — a hero de uma estrela VISITÁVEL a caminho do
 * corpo da mesma estrela, com a LUZ perto dela sem degrau e sem vale. A
 * arte de longe não muda: além de `CHEGADA_COMECA_EM_TAMANHOS` vezes o
 * tamanho de autor (S) a hero é a de sempre, bit a bit. Dali para dentro o
 * tamanho NA TELA para de crescer e desce, em log da distância, ao longo de
 * `FAIXA_DA_CHEGADA`× — e desce até a luz que VEM DEPOIS, não abaixo dela.
 *
 * A régua é a luz num raio de 150 px da estrela (`capturas/estrelas-lugar`,
 * a mesma para as três provas). Medida em 13/11, na tela de 900 px:
 *  · a hero põe ali ~1,0 por px² da meia-extensão (de 63 a 110 px; acima
 *    disso parte dela sai do raio) — luz ∝ tamanho²;
 *  · a lente de cinema saturada põe o mesmo que uma hero de
 *    `HERO_DA_LUZ_DA_LENTE` da altura (92 px), e cresce com a fração da
 *    lente (`lente`, 0..1) na potência `EXPOENTE_DA_LUZ_DA_LENTE`;
 *  · o clarão da lei, no teto, põe ~1/9 da hero do mesmo tamanho (o núcleo
 *    dele é mascarado onde o ponto do catálogo desenha; o da hero não).
 * Por isso a descida mira `√(teto² + lente²)` (111 px): a hero no teto mais
 * a lente saturada — e, enquanto a lente cresce, a hero encolhe na mesma
 * luz (o quadrado do tamanho cede o quadrado da lente). O vale de antes era
 * a hero chegando ao teto ANTES de a lente acender: Sírius caía ~28× e a
 * lente devolvia ×1,45 por passo.
 *
 * Os números são os mesmos para todas (nada por estrela): a 3 S a hero
 * mede 1/3 rad de raio — 271 px numa tela de 900 com a lente padrão — e o
 * teto, 63 px.
 */
export const CHEGADA_COMECA_EM_TAMANHOS = 3;
export const FAIXA_DA_CHEGADA = 30;
/** a fração inicial da faixa em que a descida ENTRA devagar (sem quina em d0) */
const ENTRADA_DA_CHEGADA = 0.3;
/** a meia-extensão de hero (fração da altura) com a luz da lente saturada — MEDIDO, ver acima */
export const HERO_DA_LUZ_DA_LENTE = 0.102;
/** a luz da lente perto da fonte ∝ fração^1,25 (medido: 0,03 → 0,3 → 1) */
const EXPOENTE_DA_LUZ_DA_LENTE = 1.25;
/**
 * O DISCO QUE RECEBE A HERO (fração da altura): a hero no teto põe ~3,6 mil
 * a mais que o clarão do mesmo tamanho, e o disco resolvido chega a isso
 * com ~33 px (900 de altura; Sírius e Vega, ~3,2 por px² do diâmetro). A
 * hero passa ao clarão na partilha (D/esse disco)² — a luz que ela larga é
 * a que o disco ganha. Medido; Betelgeuse, de disco mais luminoso, sobe um
 * pouco em vez de afundar.
 */
export const DISCO_QUE_RECEBE_A_HERO = 0.037;

export interface Chegada {
  /** 0 (a arte de longe) → 1 (a descida completa) */
  s: number;
  /** o fator sobre o tamanho de autor (1 = a arte de longe) */
  escala: number;
  /** a meia-extensão da hero na tela, em frações da altura */
  fracaoDaAltura: number;
}

/**
 * a chegada de uma hero de tamanho `tamanhoPc` vista a `dPc`, com a lente
 * de cinema da estrela na fração `lente` (0..1; ver `fracaoDaLente`) — pura
 */
export function chegadaDaHero(
  dPc: number,
  tamanhoPc: number,
  tanHalfFov: number,
  lente: number,
  out: Chegada
): Chegada {
  // a tela da hero: px = S·uZoom·P11·(H/2)/d = S·H / (2·d·max(tan, tanRef))
  const tan = Math.max(tanHalfFov, TAN_DA_LENTE_PADRAO);
  const d0 = CHEGADA_COMECA_EM_TAMANHOS * tamanhoPc;
  if (!(tamanhoPc > 0) || !(dPc > 0) || dPc >= d0) {
    out.s = 0;
    out.escala = 1;
  } else {
    const t = Math.min(1, Math.log(d0 / dPc) / Math.log(FAIXA_DA_CHEGADA));
    // a rampa ENTRA devagar (quadrática até `ENTRADA_DA_CHEGADA`, linear
    // depois, C¹): em d0 o tamanho de tela para de crescer sem quina, e a
    // descida segue no passo constante que a régua de luz pede
    const a = ENTRADA_DA_CHEGADA;
    out.s = (t < a ? (t * t) / (2 * a) : t - a / 2) / (1 - a / 2);
    // congelada no tamanho de tela de d0 (f0), descendo em log até o pouso
    // fT: o teto do clarão mais, em quadratura, a luz que a lente AINDA não
    // pôs — com a lente apagada, a hero que soma a lente saturada; com ela
    // inteira, o teto. A lente só tira da hero na fração `s` da descida:
    // acesa cedo (Betelgeuse a satura a 6× de d0), ela soma à hero que
    // ainda desce, em vez de dobrar a descida — o passo ×0,87 medido
    const f0 = 1 / (2 * CHEGADA_COMECA_EM_TAMANHOS * tan);
    const teto = Math.min(OCUPACAO_MAXIMA_DA_TELA, f0);
    const l = Math.min(1, Math.max(0, Number.isFinite(lente) ? lente : 0));
    const falta = 1 - out.s * Math.pow(l, EXPOENTE_DA_LUZ_DA_LENTE);
    const fT = Math.min(f0, Math.sqrt(teto * teto + falta * HERO_DA_LUZ_DA_LENTE ** 2));
    const f = Math.pow(f0, 1 - out.s) * Math.pow(fT, out.s);
    out.escala = Math.min(1, (f * 2 * dPc * tan) / tamanhoPc);
  }
  out.fracaoDaAltura = dPc > 0 ? (tamanhoPc * out.escala) / (2 * dPc * tan) : 0;
  return out;
}

/**
 * A PARTILHA COM O CORPO (0..1): a parte da LUZ da hero que já passou ao
 * clarão, pelo disco resolvido de `discoPx` numa tela de `alturaPx`. A hero
 * e o clarão pesam cor E alfa pelo próprio ganho (aditivo com SRC_ALPHA),
 * então a luz de cada um vai com o QUADRADO do ganho: a hero fica com
 * √(1 − w) e o clarão leva √(1 − hero²) (`estrelasNoQuadro.ts`).
 */
export function partilhaDoCorpo(discoPx: number, alturaPx: number): number {
  if (!(discoPx > 0) || !(alturaPx > 0)) return 0;
  return Math.min(1, (discoPx / (DISCO_QUE_RECEBE_A_HERO * alturaPx)) ** 2);
}

/** o `smoothstep` do GLSL, na CPU (a presença espelha o fragment) */
function suave(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

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
          uGain: { value: 1 },
          ...UNIFORMES_DA_ASSINATURA,
        },
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      });
      seguirALente(mat, FRAG, FRAG_DA_LENTE);
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

  /**
   * A PRESENÇA da hero de uma estrela (0..1) vista de `camPos`: a mesma
   * conta do fragment (`nearFade · farFade · uGain`), na CPU. 0 quando a
   * estrela não é hero ou a camada está escondida. É por ela que o clarão
   * da estrela visitada cede à hero (`director/estrelasNoQuadro.ts`): as
   * duas são a óptica do mesmo ponto, e a soma não pode dobrar.
   */
  presenca(nome: string, camPos: THREE.Vector3): number {
    if (!this.group.visible) return 0;
    const i = this.chosen.findIndex((s) => s.n === nome);
    if (i < 0) return 0;
    const size = this.mats[i].uniforms.uSize.value as number;
    const dist = (this.group.children[i] as THREE.Mesh).position.distanceTo(camPos);
    const near = suave(size * 0.5, size * 1.4, dist);
    const far = 1 - suave(320, 900, dist);
    return near * far * (this.mats[i].uniforms.uGain.value as number);
  }

  /**
   * A CHEGADA escrita (`chegadaDaHero`): o tamanho vira `escala` × o de
   * autor. Sem estrela visitável por perto ninguém escreve e fica 1.
   */
  escreverEscala(nome: string, escala: number) {
    const i = this.chosen.findIndex((s) => s.n === nome);
    if (i < 0 || !(escala > 0)) return;
    this.mats[i].uniforms.uSize.value = this.sizePc[i] * Math.min(1, escala);
  }

  /** a hero no LUGAR do corpo da mesma estrela (o do ponto do catálogo) */
  moverPara(nome: string, pos: THREE.Vector3) {
    const i = this.chosen.findIndex((s) => s.n === nome);
    if (i >= 0) this.group.children[i].position.copy(pos);
  }

  /** o raio do brilho da hero de uma estrela, pc (0 quando não é hero) */
  tamanhoDe(nome: string): number {
    const i = this.chosen.findIndex((s) => s.n === nome);
    return i < 0 ? 0 : this.sizePc[i];
  }

  /**
   * A CESSÃO da hero ao corpo da MESMA estrela: o ganho vira `1 − cede`
   * (quem escreve é `estrelasNoQuadro.ts`, pela `partilhaDoCorpo`). Sem
   * estrela montada ninguém escreve e o ganho fica 1, como sempre.
   */
  escreverCessao(nome: string, cede: number) {
    const i = this.chosen.findIndex((s) => s.n === nome);
    if (i < 0 || !Number.isFinite(cede)) return;
    this.mats[i].uniforms.uGain.value = 1 - Math.min(1, Math.max(0, cede));
  }

  dispose() {
    this.mats.forEach((m) => m.dispose());
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
}
