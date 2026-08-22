// ============================================================
// O CLARÃO DE ASAS — a camada única da óptica das fontes fortes
// (M2 da LEI-DA-ESTRELA). Substitui as 16 heroes de autor.
//
// O QUE ELA É. O clarão é a LENTE (halo + espinhos), não a estrela — a
// Lei §1 numa frase. Desde o item 44 (16/08) a camada desenha SÓ o Sol,
// e desenha com A MESMA RECEITA das heroes de 30/07 ("claramente a
// regra que desenha sirius é totalmente diferente da que desenha o
// sol... o desenho de spikes de sirius é muito superioir" — dono; a
// resposta é UM desenhista). A LEI manda em presença (filtro/entrega,
// gatilho de entrada) e em TAMANHO (asa do item 3, com o teto de
// ocupação por estrela do dono: "nenhuma estrela ocupa a tela toda;
// chega rápido no máximo e para"); a FORMA e o brilho são os do filme.
// A cruz Moffat do M2 e a textura assada da R1 morreram aqui dentro —
// a prancha historia-dos-spikes e a "moeda" foram os atestados.
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
// A CAPACIDADE É RESERVA DO M3, e está declarada porque hoje ela é
// maior que o uso. A camada aloca 16 materiais + 16 quads
// (ORCAMENTO_DO_CLARAO) e os três arrays de candidatos com 1.727
// entradas (o Sol + as 1.726 nomeadas do sidecar) — mas `atualizar`
// varre `n = 1`: só o Sol candidata, desde o resgate das heroes em
// 16/08. Não encolhe, e a razão é dupla: (a) encolher mudaria a
// CONTAGEM DE OBJETOS da cena, que é mudança de pixel a provar em
// A/B no navegador, e esta não é uma rodada de pixel; (b) é
// exatamente a capacidade que o M3 vai querer de volta, quando as
// nomeadas voltarem a candidatar e a cessão catálogo↔hero for
// decidida. O custo enquanto isso: 16 quads invisíveis
// (`visible = false`, sem draw) e 55.264 B nos três arrays
// (pos 20.724 + mBase 13.816 + cor 20.724).
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
import {
  GLSL_BRANCO_DO_NUCLEO,
  GLSL_COMPRESSAO,
  bvToColor,
  glslBracosDeDifracao,
  glslNucleoEHalo,
} from '../shaders/common';
import { BETA_DA_EMISSAO } from '../shaders/starShaders';
import { alcanceDoEspinhoPx, ganhoDeEntradaDoFlare, raioVisivelDaAsaPx } from '../estrela';
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
 *  autoridade; o `ci` cobre o resto das 1.726.
 *
 *  ENDEREÇO ÚNICO desde 21/08: `heroStars.ts` tinha a MESMA tabela
 *  redigitada (`HERO_BV`, diff vazio nas 16 entradas) e agora importa
 *  esta. Fica aqui, e não lá, porque aqui já morava o `SOL_BV`
 *  exportado que `planetas/fotometria` consome — e porque a peça de
 *  autor é a que o M3 pode apagar. */
export const BV_MEDIDO: Record<string, number> = {
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

// A receita do filme (núcleo + halo + braços) é MONTADA do endereço
// único em `shaders/common.ts`, o mesmo que `heroStars.ts` monta: a
// igualdade que o comentário lá dentro promete deixou de ser conferida
// e passou a ser de CONSTRUÇÃO. O texto montado é byte a byte o de
// antes — é o que o oráculo de conformidade cobra, agora sobre o
// `fragmentShader` pronto em vez de sobre os dois fontes.
const FRAG = /* glsl */ `
precision highp float;

uniform vec3 uCor;
uniform float uMeiaPx;   // meia-extensão do billboard em px
uniform float uNucleoPx; // MEIO-tamanho do sprite do ponto, em px (máscara)
uniform float uGanho;    // presença: rampa do orçamento × entrada × filtro
uniform float uBeta;     // compressão na emissão — o MESMO β do campo

varying vec2 vUv;

${GLSL_COMPRESSAO}

void main() {
  vec2 uv = vUv;
  float r = length(uv);
  if (r > 1.0) discard;

  // A RECEITA DO FILME, a mesma das heroes ("claramente a regra que
  // desenha sirius é totalmente diferente da que desenha o sol... o
  // desenho de spikes de sirius é muito superioir" — dono, 16/08; a
  // resposta é UM desenhista só). Núcleo + halo + braços com os números
  // de 30/07, byte a byte com heroStars.ts — o oráculo de conformidade
  // cobra a igualdade. O brilho é FIXO como nas heroes (é a forma que
  // lê como estrela); quem varia é presença (uGanho) e tamanho (a lei).
  ${glslNucleoEHalo()}
  ${glslBracosDeDifracao()}

  // A MÁSCARA DO SPRITE: dentro do raio do ponto quem desenha é o
  // STAR_FRAG — esta camada continua DALI para fora (sem dupla conta).
  float rPx = r * uMeiaPx;
  float mascara = smoothstep(0.6 * uNucleoPx, uNucleoPx, rPx);

  vec3 col = (${GLSL_BRANCO_DO_NUCLEO} * core + uCor * (glow + spikes)) * mascara * uGanho;
  float a = clamp(core + glow + spikes, 0.0, 1.0) * mascara * uGanho;
  vec3 comprimida = comprimir3(col, uBeta);
  gl_FragColor = vec4(comprimida, a);
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
   * A SOLTURA DO CLARÃO do Sol — `solturaDoClarao` da repartição deste
   * quadro (0..1; 1 = ponto pleno, 0 = superfície é a dona). É a rampa
   * ÚNICA da entrega ponto↔resolvido, no domínio do TAMANHO — e a R2 do
   * item 44: a forma anterior somava DUAS travas exponenciais nesta
   * janela (o `wPonto` e a divisão pela transmitância do filtro,
   * 26 mag) e, como o raio da asa vai com fluxo^(1/2β), o clarão
   * EXPLODIA no recuo (10→417 px entre 0,8 e 2 UA, medido). As duas
   * lições do dono continuam pagas por construção: soltura = 0
   * exatamente onde o filtro completa — clarão nenhum por cima da
   * fotosfera (o círculo branco), e a óptica do RESOLVIDO segue sendo o
   * bloom sobre a imagem real (a conta de ponto nunca é aplicada a um
   * disco: ela é DESLIGADA pela soltura). Só o candidato 0 a consome;
   * as nomeadas são pontos sempre.
   */
  solturaDoSol: number;
  expoM0: number;
  sigmaPx: number;
  /** pixelRatio do renderer — a INVARIÂNCIA de resolução: gatilho e
   *  tamanho do clarão são decididos na régua de referência (DPR 1) e
   *  convertidos para o buffer; sem isso o clarão desarma/encolhe
   *  exatamente no modo cinema (pico cai com pr²). 1 = referência. */
  pr?: number;
  /** teto de ocupação deste quadro (fração da altura) — o director
   *  escolhe a dose pela FASE: drama no filme/voo (0,55), observação no
   *  Atlas (0,07). Ausente = o teto do filme. */
  tetoDeOcupacao?: number;
}

/** Teto de sanidade do billboard, em px: além da diagonal de qualquer
 *  tela real o perfil já é invisível — é guarda de fillrate, não lei. */
const TETO_DO_BILLBOARD_PX = 4096;

/** A ANATOMIA DO FILME no clarão do Sol (brief do dono, 16/08): cartaz
 *  GRANDE (o da asa inteira), com a receita das heroes dentro (brilho
 *  morre sozinho, braços vazam para fora) — e o TETO DE OCUPAÇÃO por
 *  estrela: *"ele só limita para que nao aconteça que uma estrela nunca
 *  ocupe toda a tela, ela sempre chega no máximo que vai ocupar
 *  rapidamente"*. Nenhum clarão passa desta fração da altura da tela,
 *  nunca — o limitador é POR ESTRELA, jamais exposição de cena. */
export const FATOR_DE_ENCHIMENTO_DO_SOL = 1.0;
export const OCUPACAO_MAXIMA_DA_TELA = 0.55;

/** A DOSE DE OBSERVAÇÃO (pergunta do dono, 17/08: *"quando estiver
 *  observando os obejtos em movimento do nosso sistemqa solar ele nao
 *  vai dominar toda a cena? como os apps como o solar system scope ou
 *  nasa eyes... fazem isso?"*). Medido na moldura de Vênus: com o teto
 *  do filme (0,55) o clarão comia o centro do quadro e o CORPO
 *  ENQUADRADO virava um pontinho dentro do brilho. Os apps de
 *  referência de-dramatizam o Sol quando o assunto é o sistema — o
 *  NASA Eyes o mantém em ~10–15% do quadro. No ATLAS (o modo de
 *  observação; o selo já declara BRILHO ASSISTIDO) o teto de ocupação
 *  do clarão do Sol desce para esta fração da altura: meia-largura
 *  0,07·H ⇒ cartaz de ~14% do quadro. O filme e o voo livre ficam com
 *  o drama (0,55); a troca de modo já atravessa o véu do Atlas — não
 *  há pulo em cena. Segue sendo limitador POR ESTRELA, nunca exposição
 *  de cena. */
export const OCUPACAO_NA_OBSERVACAO = 0.07;

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
          uMeiaPx: { value: 0 },
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
  /**
   * O TAMANHO do quad do Sol: a régua da asa (item 3) dá a ESCALA, e o
   * teto de ocupação do dono dá o LIMITE — nenhuma estrela ocupa a tela
   * toda; aproximando, chega rápido no máximo e estaciona. Dentro do
   * cartaz, a receita do filme faz o resto: brilho apertado, braço
   * longo. (O piso de presença das nomeadas saiu no resgate das heroes.)
   */
  private meiaDaLei(
    pico: number,
    sigma: number,
    screenH: number,
    ocupacao = OCUPACAO_MAXIMA_DA_TELA
  ): number {
    const asa = Math.max(raioVisivelDaAsaPx(pico, sigma), alcanceDoEspinhoPx(pico, sigma));
    const teto = Math.min(ocupacao * screenH, TETO_DO_BILLBOARD_PX);
    return Math.min(FATOR_DE_ENCHIMENTO_DO_SOL * asa, teto);
  }

  atualizar(q: QuadroDoClarao): void {
    const el = this.elegiveis;
    el.length = 0;
    const pr = Number.isFinite(q.pr) && (q.pr as number) > 0 ? (q.pr as number) : 1;
    // a régua de REFERÊNCIA (DPR 1): toda a decisão roda em px de CSS
    // (cssH) — pico, gatilho, tamanho — idêntica em qualquer resolução;
    // só a escrita nos uniforms converte para o buffer (× pr)
    const cssH = q.screenH / pr;
    const sigma = sigmaDaPsfPx(q.sigmaPx, cssH);
    // a soltura entra SANEADA e na direção segura do §8.5: entrada
    // inválida ⇒ 1 (ponto pleno — o clarão de longe nunca pode sumir
    // por um NaN; perto, quem protege a fotosfera é a própria rampa)
    const solturaDoSol =
      Number.isFinite(q.solturaDoSol) && q.solturaDoSol >= 0 && q.solturaDoSol <= 1
        ? q.solturaDoSol
        : 1;
    const ocupacao =
      Number.isFinite(q.tetoDeOcupacao) && (q.tetoDeOcupacao as number) > 0
        ? (q.tetoDeOcupacao as number)
        : OCUPACAO_MAXIMA_DA_TELA;
    // RESGATE (16/08, ordem do dono): as nomeadas voltaram às heroes de
    // autor (world/heroStars.ts) — esta camada fica SÓ com o Sol. A
    // unificação volta à mesa no M3, com o visto DELE na estética.
    const n = 1;
    for (let i = 0; i < n; i++) {
      if (i === 0 && !q.solVisivel) continue;
      // superfície é a dona: com a soltura em zero o clarão nem candidata
      if (i === 0 && !(solturaDoSol > 0)) continue;
      const dx = this.pos[i * 3] - q.camPos.x;
      const dy = this.pos[i * 3 + 1] - q.camPos.y;
      const dz = this.pos[i * 3 + 2] - q.camPos.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (!(d2 > 0)) continue;
      const m = this.mBase[i] + 2.5 * Math.log10(d2);
      // pré-filtro barato: acima de m 6 nem a asa nasce (excesso ≤ 1)
      if (!(m < 6)) continue;
      // o pico é o PLENO (óptica do ponto, sem filtro) — a entrega
      // ponto↔resolvido é a soltura, aplicada no TAMANHO e no ganho
      const pico = picoDaPsf(m, q.expoM0, q.sigmaPx, cssH);
      // elegível quando a óptica alcança além do que o sprite já desenha
      const nucleo = psfPointSizePx(m, q.expoM0, q.sigmaPx, cssH);
      if (
        !(2 * this.meiaDaLei(pico, sigma, cssH, ocupacao) * (i === 0 ? solturaDoSol : 1) > nucleo)
      )
        continue;
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
      const soltura = i === 0 ? solturaDoSol : 1;
      const pico = picoDaPsf(m, q.expoM0, q.sigmaPx, cssH);
      const nucleoPx = psfPointSizePx(m, q.expoM0, q.sigmaPx, cssH) * soltura;
      const entrada = ganhoDeEntradaDoFlare(pico) * soltura;
      // a soltura veste o TAMANHO por fora do teto de ocupação: o clarão
      // desabrocha DO teto estacionado (o espelho do brief do dono —
      // "chega no máximo rapidamente e estaciona"), nunca além dele
      const meiaPx = this.meiaDaLei(pico, sigma, cssH, ocupacao) * soltura * pr;
      if (!(meiaPx > 0) || !(entrada > 0)) {
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
      // presença = rampa do orçamento × entrada × soltura: o brilho da
      // forma é FIXO como nas heroes — é o desenho superior que o dono
      // apontou; a lei manda só em presença e tamanho
      u.uGanho.value = s.ganho * entrada;
      u.uMeiaPx.value = meiaPx;
      u.uNucleoPx.value = 0.5 * nucleoPx * pr;
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
