// ============================================================
// O CLARÃO DE ASAS — a camada única da óptica das fontes fortes
// (M2 da LEI-DA-ESTRELA). Substitui as 16 heroes de autor.
//
// O QUE ELA É. O clarão é a LENTE (halo + espinhos), não a estrela — a
// Lei §1 numa frase. Ele existe em toda distância, deriva do FLUXO
// recebido (nunca do peso do ponto), e ENCOLHE com a luz pela asa
// Moffat: R ∝ F^(1/2β). O desenho de autor que morreu aqui dava a
// Sirius um billboard de 0,08·10^(−0,3m) pc — 711 px a 0,5 pc — e ao
// Sol um halo constante de ~160–180 px de 3,6 a 500 UA (item 3); a lei
// dá a cada fonte exatamente o clarão que o fluxo dela paga.
//
// O ORÇAMENTO, não a lista de nomes. A identidade "as 16" morreu: a
// camada tem N slots (ORCAMENTO_DO_CLARAO) e quem os ocupa é decidido
// POR FLUXO, por quadro, entre o Sol e as 1.726 nomeadas do sidecar.
// A seleção tem HISTERESE (§5.21): entrada só com folga declarada sobre
// o membro mais fraco (RAZAO_DE_TROCA) e ganho em rampa de 300 ms
// (stepRampToward) — ranking que troca de posição não pode piscar.
//
// PROFUNDIDADE É LEI (§5.15): o clarão nunca é ocluído pelo corpo que o
// causa — depthTest: false, escrito aqui e não deixado ao acaso do
// material.
//
// O QUE FICA DE FORA, declarado:
//  · as 328.749 anônimas do catálogo não são candidatas — o ranking por
//    quadro custaria a travessia; nenhuma delas alcança asa visível sem
//    a câmera colar (aí é o M3/E3 que responde, com corpo);
//  · a extinção não entra no fluxo do candidato (as elegíveis vivem a
//    poucos pc, onde τ é ruído) — unifica no M3, com o campo;
//  · a cintilação de plasma do desenho velho morreu de propósito:
//    coerência quadro-a-quadro é cláusula (§5.17), não polimento.
// ============================================================
import * as THREE from 'three';
import type { NamedStar } from '../config';
import { GLSL_COMPRESSAO, bvToColor } from '../shaders/common';
import { BETA_DA_EMISSAO } from '../shaders/starShaders';
import {
  BETA_DA_ASA,
  BETA_DO_ESPINHO,
  FRACAO_DA_ASA,
  FRACAO_DOS_ESPINHOS,
  NUCLEO_DA_ASA_EM_SIGMAS,
  alcanceDoEspinhoPx,
  raioVisivelDaAsaPx,
} from '../estrela';
import { M_V_SOL_DO_CAMPO, picoDaPsf, psfPointSizePx, sigmaDaPsfPx } from '../luzDaCasa';
import { RAMP_DURATION_MS, stepRampToward } from './lodStellar';

// ─── O ORÇAMENTO E A HISTERESE (puros, testados sem three) ───────────────

/** N slots de clarão — o mesmo custo de draw das 16 de antes; quem muda é
 *  o critério de ocupação (fluxo, não nome). */
export const ORCAMENTO_DO_CLARAO = 16;

/** §5.21/§8.9: um de fora só desloca o membro mais fraco se o supera por
 *  esta razão — entrada e saída com limiares DIFERENTES, senão duas
 *  fontes empatadas na fronteira do top-N piscariam o clarão entre si. */
export const RAZAO_DE_TROCA = 1.25;

/** Quantos elegíveis a varredura guarda por quadro: os N possíveis
 *  membros mais uma folga de entrantes desafiando a fronteira. */
export const ELEGIVEIS_POR_QUADRO = ORCAMENTO_DO_CLARAO + 8;

export interface CandidatoAoClarao {
  /** identidade no cadastro de candidatos da camada (0 = Sol) */
  indice: number;
  /** pico da PSF em tela — a régua única do ranking */
  pico: number;
}

export interface SlotDoClarao {
  /** candidato dono do slot; −1 = vago */
  indice: number;
  /** presença 0..1 — rampa linear de 300 ms, nunca degrau */
  ganho: number;
  /** para onde a rampa anda (1 = dentro, 0 = saindo) */
  alvo: number;
}

export function criarSlots(n: number = ORCAMENTO_DO_CLARAO): SlotDoClarao[] {
  return Array.from({ length: n }, () => ({ indice: -1, ganho: 0, alvo: 0 }));
}

function picoDoIndice(elegiveis: readonly CandidatoAoClarao[], indice: number): number {
  for (const c of elegiveis) if (c.indice === indice) return c.pico;
  return -1;
}

/**
 * UM passo da seleção com histerese — muta `slots`; a lista só é lida.
 * `elegiveis` chega ordenado por pico DESC (desempate: índice ASC, para
 * o quadro ser determinístico com picos empatados).
 *
 * DUAS FASES, e a ordem é o conserto de um bug que o oráculo da
 * fronteira pegou: decidir o CONJUNTO primeiro, escrever os alvos
 * depois. Na forma de uma passada só, a reafirmação do membro mais
 * fraco (ainda elegível) desfazia o deslocamento no MESMO quadro — o
 * desafiante com folga nunca entrava.
 *
 *  1. o conjunto DESEJADO: membros elegíveis ficam; entrante ocupa
 *     capacidade livre; sem capacidade, só desloca o mais fraco do
 *     conjunto com a folga da RAZAO_DE_TROCA (§5.21 — entrada e saída
 *     com limiares diferentes). Processado do mais forte para o mais
 *     fraco, um entrante nunca desloca outro entrante do mesmo quadro.
 *  2. alvos: quem está no desejado anda para 1; quem não está, para 0.
 *     Entrante SEM slot ocupa apenas VAGA (indice −1) — o deslocado sai
 *     pela rampa primeiro e o entrante espera: a casa nunca tem N+1
 *     clarões, e a fronteira nunca troca em um quadro.
 *  3. as rampas andam; slot que zerou com alvo 0 vira vaga.
 *
 * Custo: `dentro` tem ≤ orçamento entradas por quadro — a mesma ordem
 * de alocação dos 16 literais que a velha política de dominância pagava
 * (1,54 µs medidos por quadro, na época).
 */
export function passoDoOrcamento(
  slots: SlotDoClarao[],
  elegiveis: readonly CandidatoAoClarao[],
  dtS: number
): void {
  // fase 1 — o conjunto desejado, mantido ordenado por pico DESC. Os
  // MEMBROS entram todos ANTES de qualquer entrante: capacidade "livre"
  // que um membro ainda ia ocupar não é porta de entrada sem folga — a
  // histerese protege o incumbente, e só a vaga de verdade é grátis.
  const dentro: CandidatoAoClarao[] = [];
  const entrantes: CandidatoAoClarao[] = [];
  const inserir = (c: CandidatoAoClarao) => {
    let p = dentro.length;
    while (p > 0 && dentro[p - 1].pico < c.pico) p--;
    dentro.splice(p, 0, c);
  };
  for (const c of elegiveis) {
    let temSlot = false;
    for (const s of slots) {
      if (s.indice === c.indice) {
        temSlot = true;
        break;
      }
    }
    if (temSlot) inserir(c);
    else entrantes.push(c); // preserva a ordem DESC de `elegiveis`
  }
  for (const e of entrantes) {
    if (dentro.length < slots.length) {
      inserir(e);
      continue;
    }
    const fraco = dentro[dentro.length - 1];
    if (e.pico > RAZAO_DE_TROCA * fraco.pico) {
      dentro.pop();
      inserir(e);
    }
  }

  // fase 2 — alvos e ocupação de vagas
  for (const s of slots) {
    if (s.indice < 0) continue;
    s.alvo = picoDoIndice(dentro, s.indice) >= 0 ? 1 : 0;
  }
  for (const c of dentro) {
    let temSlot = false;
    for (const s of slots) {
      if (s.indice === c.indice) {
        temSlot = true;
        break;
      }
    }
    if (temSlot) continue;
    let vago: SlotDoClarao | null = null;
    for (const s of slots) {
      if (s.indice < 0) {
        vago = s;
        break;
      }
    }
    if (!vago) continue;
    vago.indice = c.indice;
    vago.alvo = 1;
    vago.ganho = 0;
  }

  // fase 3 — as rampas
  for (const s of slots) {
    s.ganho = stepRampToward(s.ganho, s.alvo, dtS, RAMP_DURATION_MS);
    if (s.indice >= 0 && s.alvo === 0 && s.ganho === 0) s.indice = -1;
  }
}

// ─── A COR — B−V medido onde há medição, sidecar onde não há ─────────────

/** B−V do Sol (medido) — a cor do clarão do Sol sai da MESMA lei. */
export const SOL_BV = 0.653;

/** Tabela de B−V MEDIDO (Onda 1b — SIMBAD/Hipparcos), herdada das
 *  heroes: o `ci` do sidecar acerta ±0,03 em quase todas, mas erra onde
 *  mais se vê (Betelgeuse: 1,50 lá contra 1,85 medido). A tabela é a
 *  autoridade; o `ci` cobre o resto das 1.726. */
const BV_MEDIDO: Record<string, number> = {
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

// ─── OS SHADERS — o billboard em px de tela, o perfil da lei ─────────────

const VERT = /* glsl */ `
varying vec2 vUv;
// meia-extensão do billboard em PX DE TELA. O clarão é artefato do
// INSTRUMENTO: o tamanho dele na tela não depende da lente (a PSF é do
// sensor), e por isso a conversão px→vista usa a projeção do quadro —
// zoom não infla clarão, exatamente como não infla a PSF do campo.
uniform float uMeiaPx;
uniform float uScreenH;

void main() {
  vUv = position.xy; // -1..1
  vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  // extensão de vista que projeta em uMeiaPx: px = extent·P11·(H/2)/(−z)
  float extent = uMeiaPx * 2.0 * max(-c.z, 1e-6) / (projectionMatrix[1][1] * uScreenH);
  c.xy += position.xy * extent;
  gl_Position = projectionMatrix * c;
}
`;

const FRAG = /* glsl */ `
precision highp float;

uniform vec3 uCor;
uniform float uPico;     // pico da PSF em tela, PRÉ-curva — o fluxo manda
uniform float uMeiaPx;   // meia-extensão do billboard em px
uniform float uTheta0Px; // raio de dobra da asa (2σ) em px
uniform float uNucleoPx; // MEIO-tamanho do sprite do ponto, em px (máscara)
uniform float uGanho;    // rampa de presença do orçamento (histerese §5.21)
uniform float uBeta;     // compressão na emissão — o MESMO β do campo

varying vec2 vUv;

${GLSL_COMPRESSAO}

void main() {
  vec2 pxy = vUv * uMeiaPx;      // px de tela, origem na fonte
  float r2 = dot(pxy, pxy);
  float t2 = uTheta0Px * uTheta0Px;

  // A ASA (Lei §1): f·P/(1+(θ/θ₀)²)^β — o halo que encolhe com a luz.
  float asa = ${FRACAO_DA_ASA} * pow(1.0 + r2 / t2, -${BETA_DA_ASA});

  // OS ESPINHOS: mesma família Moffat, expoente próprio (decai mais
  // devagar — é o que faz a cruz LER como cruz), braço com largura de
  // θ₀ — fina como difração, larga o bastante para não ferver (§5.17).
  float radial = pow(1.0 + r2 / t2, -${BETA_DO_ESPINHO});
  float bracoH = exp(-(pxy.y * pxy.y) / t2);
  float bracoV = exp(-(pxy.x * pxy.x) / t2);
  float espinhos = ${FRACAO_DOS_ESPINHOS} * radial * (bracoH + bracoV);

  // A MÁSCARA DO SPRITE: dentro do raio do ponto quem desenha núcleo,
  // halo curto e espinhos curtos é o STAR_FRAG — esta camada continua o
  // perfil DALI para fora. Sem a máscara o miolo contaria duas vezes.
  float mascara = smoothstep(0.6 * uNucleoPx, uNucleoPx, sqrt(r2));

  // A JANELA DA BORDA: o billboard termina onde a asa cruza o limiar de
  // visibilidade — ou seja, a borda do quad carrega EXATAMENTE o valor
  // do limiar, e um degrau de 1/255 sobre céu preto lê como moldura
  // retangular (visto na correção do M2). A janela leva o perfil a ZERO
  // EXATO na borda, C¹, tocando só os últimos ~15% do raio.
  float borda = max(abs(vUv.x), abs(vUv.y));
  float janela = smoothstep(1.0, 0.85, borda);

  vec3 col = uCor * uPico * (asa + espinhos) * mascara * janela * uGanho;
  gl_FragColor = vec4(comprimir3(col, uBeta), 1.0);
}
`;

// ─── A CAMADA ─────────────────────────────────────────────────────────────

/** O que a camada precisa saber do quadro — o instrumento vem de quem o
 *  publica (`StarField`), nunca redigitado. */
export interface QuadroDoClarao {
  camPos: THREE.Vector3;
  screenH: number;
  dtS: number;
  /** a camada dos dez está desenhando o Sol-ponto? (fonte oculta não tem óptica) */
  solVisivel: boolean;
  /**
   * A TRANSMITÂNCIA DO FILTRO SOLAR sobre o clarão do Sol — o
   * `overrideFator` da repartição deste quadro (≥ 1; 1 = filtro fora,
   * ponto puro). O clarão é o espalhamento da luz que ENTRA no
   * instrumento: com o corpo resolvido, quem torna a superfície visível
   * é o filtro (§5.7, corta ~26 mag) — e uma câmera com filtro solar
   * não tem flare. Sem este fator a camada pintava a tela de branco POR
   * CIMA do Sol procedural na abertura do filme (palavras do dono,
   * 16/08). Só o candidato 0 o consome; as nomeadas são pontos sempre.
   */
  atenuacaoDoSol: number;
  /**
   * O PESO DO PONTO do Sol — `wPonto` da repartição (0..1). A ENTREGA DA
   * ÓPTICA, e a segunda lição do dono no mesmo dia (*"esse círculo
   * branco no meio do sol é normal?"*): esta camada modela a óptica de
   * uma fonte PONTUAL — todo o fluxo concentrado na PSF. Para uma fonte
   * RESOLVIDA a conta superestima por ordens de grandeza (o disco
   * filtrado da abertura ainda virava um pico de ~5.700 e desenhava um
   * círculo branco no meio da fotosfera). A óptica do RESOLVIDO é a
   * convolução da imagem real — trabalho do BLOOM, cuja pirâmide o M2
   * já governa pela mesma asa. Este peso é a entrega C¹ entre os dois
   * donos: ponto → asa explícita; resolvido → bloom sobre o quadro.
   */
  pesoDoPontoDoSol: number;
  expoM0: number;
  sigmaPx: number;
}

/** Teto de sanidade do billboard, em px: além da diagonal de qualquer
 *  tela real o perfil já é invisível — é guarda de fillrate, não lei. */
const TETO_DO_BILLBOARD_PX = 4096;

export class ClaraoDeAsas {
  readonly group = new THREE.Group();
  private readonly mats: THREE.ShaderMaterial[] = [];
  private readonly meshes: THREE.Mesh[] = [];
  private readonly slots = criarSlots();

  // o cadastro de candidatos: 0 = Sol (na origem), 1.. = as nomeadas.
  // mBase = m − 5·log10(d_casa): a MESMA lei de recálculo do campo,
  // m(d) = mBase + 5·log10(d) — para o Sol, mBase = M_V☉(campo) − 5,
  // o PONTO_ZERO_SOL_PC da camada dos dez (planetas.ts). Uma lei só.
  private readonly pos: Float32Array;
  private readonly mBase: Float64Array;
  private readonly cor: Float32Array;

  /** buffer de elegíveis do quadro, reusado — zero alocação por quadro */
  private readonly elegiveis: CandidatoAoClarao[] = [];

  constructor(named: readonly NamedStar[]) {
    const n = named.length + 1;
    this.pos = new Float32Array(n * 3);
    this.mBase = new Float64Array(n);
    this.cor = new Float32Array(n * 3);

    // candidato 0: o Sol
    this.mBase[0] = M_V_SOL_DO_CAMPO - 5;
    const [sr, sg, sb] = bvToColor(SOL_BV);
    this.cor.set([sr, sg, sb], 0);

    for (let i = 0; i < named.length; i++) {
      const s = named[i];
      const j = i + 1;
      this.pos[j * 3] = s.x;
      this.pos[j * 3 + 1] = s.y;
      this.pos[j * 3 + 2] = s.z;
      this.mBase[j] =
        Number.isFinite(s.m) && Number.isFinite(s.d) && s.d > 0
          ? s.m - 5 * Math.log10(s.d)
          : Infinity;
      const [r, g, b] = bvToColor(BV_MEDIDO[s.n] ?? s.ci ?? SOL_BV);
      this.cor[j * 3] = r;
      this.cor[j * 3 + 1] = g;
      this.cor[j * 3 + 2] = b;
    }

    for (let k = 0; k < ORCAMENTO_DO_CLARAO; k++) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uCor: { value: new THREE.Color(1, 1, 1) },
          uPico: { value: 0 },
          uMeiaPx: { value: 0 },
          uTheta0Px: { value: 1 },
          uNucleoPx: { value: 0 },
          uGanho: { value: 0 },
          uScreenH: { value: 1080 },
          uBeta: { value: BETA_DA_EMISSAO },
        },
        blending: THREE.AdditiveBlending,
        // §5.15: o clarão NUNCA é ocluído pelo corpo que o causa — estado
        // de profundidade é lei, não escolha de material.
        depthTest: false,
        depthWrite: false,
        transparent: true,
      });
      this.mats.push(mat);
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      quad.visible = false;
      quad.frustumCulled = false;
      quad.renderOrder = 3;
      this.group.add(quad);
      this.meshes.push(quad);
    }
  }

  /**
   * O passo do quadro: mede os candidatos, roda o orçamento com
   * histerese e escreve os slots nos billboards.
   */
  atualizar(q: QuadroDoClarao): void {
    const el = this.elegiveis;
    el.length = 0;
    const sigma = sigmaDaPsfPx(q.sigmaPx, q.screenH);
    const atenuacaoDoSol =
      Number.isFinite(q.atenuacaoDoSol) && q.atenuacaoDoSol >= 1 ? q.atenuacaoDoSol : 1;
    const pesoDoPontoDoSol =
      Number.isFinite(q.pesoDoPontoDoSol) && q.pesoDoPontoDoSol >= 0 && q.pesoDoPontoDoSol <= 1
        ? q.pesoDoPontoDoSol
        : 1;
    const doSol = pesoDoPontoDoSol / atenuacaoDoSol;
    const n = this.mBase.length;
    for (let i = 0; i < n; i++) {
      if (i === 0 && !q.solVisivel) continue;
      const dx = this.pos[i * 3] - q.camPos.x;
      const dy = this.pos[i * 3 + 1] - q.camPos.y;
      const dz = this.pos[i * 3 + 2] - q.camPos.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (!(d2 > 0)) continue;
      const m = this.mBase[i] + 2.5 * Math.log10(d2);
      // pré-filtro barato: acima de m 6 nem a asa nasce (excesso ≤ 1)
      if (!(m < 6)) continue;
      const pico = picoDaPsf(m, q.expoM0, q.sigmaPx, q.screenH) * (i === 0 ? doSol : 1);
      // elegível quando a ÓPTICA excede o que o sprite já desenha —
      // asa OU braço além do núcleo; senão o draw não acrescenta pixel
      const nucleo = psfPointSizePx(m, q.expoM0, q.sigmaPx, q.screenH);
      const alcance = Math.max(
        2 * raioVisivelDaAsaPx(pico, sigma),
        2 * alcanceDoEspinhoPx(pico, sigma)
      );
      if (!(alcance > nucleo)) continue;
      // inserção ordenada (pico DESC, índice ASC no empate), teto K
      let p = el.length;
      while (p > 0 && (el[p - 1].pico < pico || (el[p - 1].pico === pico && el[p - 1].indice > i)))
        p--;
      if (p >= ELEGIVEIS_POR_QUADRO) continue;
      el.splice(p, 0, { indice: i, pico });
      if (el.length > ELEGIVEIS_POR_QUADRO) el.length = ELEGIVEIS_POR_QUADRO;
    }

    passoDoOrcamento(this.slots, el, q.dtS);

    for (let k = 0; k < this.slots.length; k++) {
      const s = this.slots[k];
      const mesh = this.meshes[k];
      if (s.indice < 0 || s.ganho <= 0) {
        mesh.visible = false;
        continue;
      }
      const i = s.indice;
      const dx = this.pos[i * 3] - q.camPos.x;
      const dy = this.pos[i * 3 + 1] - q.camPos.y;
      const dz = this.pos[i * 3 + 2] - q.camPos.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      const m = this.mBase[i] + 2.5 * Math.log10(Math.max(d2, 1e-30));
      const pico = picoDaPsf(m, q.expoM0, q.sigmaPx, q.screenH) * (i === 0 ? doSol : 1);
      const nucleoPx = psfPointSizePx(m, q.expoM0, q.sigmaPx, q.screenH);
      const meiaPx = Math.min(
        Math.max(raioVisivelDaAsaPx(pico, sigma), alcanceDoEspinhoPx(pico, sigma)),
        TETO_DO_BILLBOARD_PX
      );
      if (!(meiaPx > 0)) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      mesh.position.set(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]);
      const u = this.mats[k].uniforms;
      (u.uCor.value as THREE.Color).setRGB(
        this.cor[i * 3],
        this.cor[i * 3 + 1],
        this.cor[i * 3 + 2]
      );
      u.uPico.value = pico;
      u.uMeiaPx.value = meiaPx;
      u.uTheta0Px.value = NUCLEO_DA_ASA_EM_SIGMAS * sigma;
      u.uNucleoPx.value = 0.5 * nucleoPx;
      u.uGanho.value = s.ganho;
      u.uScreenH.value = q.screenH;
    }
  }

  /** leitura para depuração/oráculos: quem ocupa os slots agora */
  ocupacao(): { indice: number; ganho: number }[] {
    return this.slots.filter((s) => s.indice >= 0).map((s) => ({ indice: s.indice, ganho: s.ganho }));
  }

  dispose(): void {
    this.mats.forEach((m) => m.dispose());
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
}
