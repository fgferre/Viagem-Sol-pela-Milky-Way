// ============================================================
// O CLARÃO DE ASAS — a camada única da óptica das fontes fortes
// (M2 da LEI-DA-ESTRELA), e desde 13/11 A LUZ ÚNICA: uma lei de luz para
// toda estrela, o Sol incluído. As 16 heroes de autor (`heroStars.ts`,
// exumadas em 16/08) e o remendo da chegada a elas morreram quando o dono
// aprovou a terceira passada por imagem ("gostei da v3... pode ligar").
//
// O QUE ELA É. O clarão é a LENTE (halo + espinhos), não a estrela — a
// Lei §1 numa frase. Desenha com A RECEITA DO FILME de 30/07 ("claramente
// a regra que desenha sirius é totalmente diferente da que desenha o
// sol... o desenho de spikes de sirius é muito superioir" — dono; a
// resposta é UM desenhista). A LEI manda em presença (filtro/entrega,
// gatilho de entrada) e em TAMANHO (asa do item 3, pisada pela arte
// declarada `meiaDaArtePx`, com o teto de ocupação por estrela do dono:
// "nenhuma estrela ocupa a tela toda; chega rápido no máximo e para"); a
// FORMA e o brilho são os do filme.
//
// O ORÇAMENTO, não a lista de nomes. A camada tem N slots
// (ORCAMENTO_DO_CLARAO) e quem os ocupa é decidido POR FLUXO, por quadro,
// entre o Sol, as 1.726 nomeadas do sidecar e as estrelas visitadas. A
// seleção tem HISTERESE (§5.21): entrada só com folga declarada sobre o
// membro mais fraco (RAZAO_DE_TROCA) e ganho em rampa de 300 ms
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
import {
  GLSL_BRANCO_DO_NUCLEO,
  GLSL_COMPRESSAO,
  bvToColor,
  glslBracosDeDifracao,
  glslNucleoEHalo,
} from '../shaders/common';
import {
  AMOSTRAS_DO_FATOR_TAU,
  BETA_DA_EMISSAO,
  LARGURA_DA_TABELA_DO_ANEL,
  LIMIAR_DO_ANEL,
  PISO_DA_TRANSMISSAO_DO_ANEL,
  PISO_DO_MU_DO_ANEL,
  UNIFORMES_DOS_ANEIS,
} from '../shaders/starShaders';
import {
  ESTRELAS_SEGUEM_A_LENTE,
  UNIFORMES_DA_ASSINATURA,
  receitaSegueALente,
  seguirALente,
} from '../shaders/estrelasDaLente';
import { alcanceDoEspinhoPx, ganhoDeEntradaDoFlare, raioVisivelDaAsaPx } from '../estrela';
import { M_V_SOL_DO_CAMPO, picoDaPsf, psfPointSizePx, sigmaDaPsfPx } from '../luzDaCasa';
import { MARGEM_DO_CAMPO } from '../core/post';
import { RAMP_DURATION_MS, stepRampToward } from './lodStellar';
import { SondaDeOclusao } from './sondaDeOclusao';
import { alemDoFundo } from '../core/profundidade';
import { U_PERFIL_BASE, U_PERFIL_ESCALA, type AnelComPerfil } from './corpos/gigante';
import { regiaoDoAnelCpu } from './corpos/descricaoDoAnel';

// ─── O ORÇAMENTO E A HISTERESE (puros, testados sem three) ───────────────

/** N slots de clarão: as fortes do céu de casa passam de 16 (o Sol + as
 *  16 mais brilhantes já são 17); com 32 o corte do ranking cai em m ≈ 1,7,
 *  onde a entrada (`ganhoDeEntradaDoFlare`) já deixou o clarão quase apagado */
export const ORCAMENTO_DO_CLARAO = 32;

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
 * Devolve se algum entrante do conjunto ficou esperando vaga — a troca
 * ainda não terminou, mesmo no quadro em que nenhuma rampa anda (o
 * deslocado zerou na fase 3, depois de a fase 2 procurar vaga).
 *
 * Custo: `dentro` tem ≤ orçamento entradas por quadro — a mesma ordem
 * de alocação dos 16 literais que a velha política de dominância pagava
 * (1,54 µs medidos por quadro, na época).
 */
export function passoDoOrcamento(
  slots: SlotDoClarao[],
  elegiveis: readonly CandidatoAoClarao[],
  dtS: number
): boolean {
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
  let esperando = false;
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
    if (!vago) {
      esperando = true;
      continue;
    }
    vago.indice = c.indice;
    vago.alvo = 1;
    vago.ganho = 0;
  }

  // fase 3 — as rampas
  for (const s of slots) {
    s.ganho = stepRampToward(s.ganho, s.alvo, dtS, RAMP_DURATION_MS);
    if (s.indice >= 0 && s.alvo === 0 && s.ganho === 0) s.indice = -1;
  }
  return esperando;
}

// ─── A COR — B−V medido onde há medição, sidecar onde não há ─────────────

/** B−V do Sol (medido) — a cor do clarão do Sol sai da MESMA lei. */
export const SOL_BV = 0.653;

/** Tabela de B−V MEDIDO (Onda 1b — SIMBAD/Hipparcos), herdada das
 *  heroes: o `ci` do sidecar acerta ±0,03 em quase todas, mas erra onde
 *  mais se vê (Betelgeuse: 1,50 lá contra 1,85 medido). A tabela é a
 *  autoridade; o `ci` cobre o resto das 1.726.
 *
 *  ENDEREÇO ÚNICO desde 21/08: `heroStars.ts` (apagado em 13/11) tinha
 *  a MESMA tabela redigitada (`HERO_BV`, diff vazio nas 16 entradas). */
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
  // extensão de vista que projeta em uMeiaPx: px = extent·P11·(H/2)/(−z).
  // O piso de −z é só guarda de divisão: era 1e-6 pc (0,2 UA) e, com a
  // câmera mais perto que isso, o quad saía (1e-6/d)× maior que a lei —
  // a cruz de Proxima a 40 px de disco (13/11) era o clarão a 7× o teto.
  float extent = uMeiaPx * 2.0 * max(-c.z, 1e-30) / (projectionMatrix[1][1] * uScreenH);
  c.xy += position.xy * extent;
  gl_Position = projectionMatrix * c;
}
`;

// A receita do filme (núcleo + halo + braços) é MONTADA do endereço
// único em `shaders/common.ts`. O texto montado é byte a byte o de
// antes — é o que o oráculo de conformidade cobra, sobre o
// `fragmentShader` pronto.
const FRAG = /* glsl */ `
precision highp float;

uniform vec3 uCor;
uniform float uMeiaPx;   // meia-extensão do billboard em px
uniform float uNucleoPx; // MEIO-tamanho do sprite do ponto, em px (máscara)
uniform float uGanho;    // presença: rampa do orçamento × entrada × filtro
uniform float uBeta;     // compressão na emissão — o MESMO β do campo
uniform vec3 uTransmitancia; // o ar da Terra no raio até a fonte (1 longe dela)

varying vec2 vUv;

${GLSL_COMPRESSAO}

void main() {
  vec2 uv = vUv;
  float r = length(uv);
  if (r > 1.0) discard;

  // A RECEITA DO FILME ("claramente a regra que desenha sirius é
  // totalmente diferente da que desenha o sol... o desenho de spikes de
  // sirius é muito superioir" — dono, 16/08; a resposta é UM desenhista
  // só). Núcleo + halo + braços com os números de 30/07 — o oráculo de
  // conformidade cobra o texto. O brilho é FIXO (é a forma que lê como
  // estrela); quem varia é presença (uGanho) e tamanho (a lei).
  ${glslNucleoEHalo()}
  ${glslBracosDeDifracao()}

  // A MÁSCARA DO SPRITE: dentro do raio do ponto quem desenha é o
  // STAR_FRAG — esta camada continua DALI para fora (sem dupla conta).
  float rPx = r * uMeiaPx;
  float mascara = smoothstep(0.6 * uNucleoPx, uNucleoPx, rPx);

  vec3 col = (${GLSL_BRANCO_DO_NUCLEO} * core + uCor * (glow + spikes)) * mascara * uGanho * uTransmitancia;
  float a = clamp(core + glow + spikes, 0.0, 1.0) * mascara * uGanho;
  vec3 comprimida = comprimir3(col, uBeta);
  gl_FragColor = vec4(comprimida, a);
}
`;

/** `FRAG` com os braços trocados pela assinatura da lente de Ajustes (`estrelasDaLente.ts`). */
const FRAG_DA_LENTE = ESTRELAS_SEGUEM_A_LENTE ? receitaSegueALente(FRAG, '1.0 / max(uMeiaPx, 1e-6)') : FRAG;

// ─── A SONDA DE OCLUSÃO — outro corpo tapou o PONTO da estrela? ──────────
// A §5.15 acima só promete que o clarão nunca é ocluído pela estrela que o
// causa — nunca disse nada sobre um corpo DIFERENTE (Hipérion, um planeta)
// na frente, e por isso o clarão atravessava esses corpos. Nasceu para o
// Sol (23/09) e desde 13/11 é UMA SONDA POR VAGA, a mesma para toda
// estrela: Aldebaran e Rígel atrás do globo de Saturno, no filme do Sol
// (t = 236 s), acendiam o clarão em cima do planeta. A pergunta pede um
// desenhista PRÓPRIO: o `VERT`/`FRAG` acima é o texto que o oráculo de
// conformidade tranca byte a byte, e a sonda não é a lei do clarão — é
// um instrumento à parte, que mora no MESMO grupo só para desenhar no
// MESMO passe (ver a mecânica da consulta, mais abaixo na classe).
//
// A sonda é um billboard de ~2 px, invisível (`colorWrite: false`), com
// profundidade LIGADA (`depthTest: true`), e é a PRIMEIRA da fila
// transparente (`renderOrder` −1): a fila OPACA do three roda antes, então
// quando a sonda desenha o depth só tem as superfícies sólidas — os corpos
// resolvidos. Brilho, poeira e o que mais vier depois não contam.
//
// ONDE ELA FICA (medido em 23/09, Hipérion a 9,5 UA do Sol; vale para
// qualquer estrela, que só fica mais longe). Com o near
// da câmera em ~1 km, o Sol cai onde o depth de 24 bits já não distingue
// nada do fundo (1 − 7,6e−10): uma sonda no centro dele empata com o
// fundo e às vezes é descartada no arredondamento — o clarão sumia com o
// Sol à vista. Por isso a sonda vai para a METADE do caminho (mesmo lugar
// na tela: é a direção que conta) e nunca passa de 1 − 2,4e−7 no depth,
// quatro degraus antes do fundo. Continua atrás de todo corpo capaz de
// tapar o Sol inteiro — isso exige estar a menos de ~10 % do caminho (é o
// caso de Júpiter, o maior) — e à frente da fotosfera, então o Sol nunca
// tapa o próprio clarão (§5.15). A estrela visitada idem: a sonda só corre
// com soltura > 0 (disco < 10 px), e aí a câmera está a milhares de raios
// dela — a metade do caminho fica muito à frente do corpo que ela monta.
//
// O QUE A SONDA NÃO VÊ, declarado: anéis, atmosferas, poeira — tudo que é
// translúcido e não escreve profundidade. O PONTO da estrela também
// atravessa o anel (as camadas de estrelas desenham depois dele, só com o
// depth dos sólidos), então o clarão segue o ponto: os dois atravessam.
//
// A RESPOSTA É BINÁRIA (a consulta só diz "alguma amostra passou") e a
// estrela é um ponto: quem dá a passagem suave é a rampa da vaga
// (`visibilidade`, os MESMOS 300 ms do orçamento), não uma cobertura parcial.
const MEIA_PX_DA_SONDA = 1;

/** Até onde, fora do quadro, a sonda ainda responde (NDC): o teto do
 *  clarão é 0,07·H de meia-largura = 0,14 em NDC vertical, com folga. */
const ALCANCE_DA_SONDA_NDC = 1.15;

/** Quantas consultas de oclusão ficam em voo ao mesmo tempo — o bastante
 *  para NUNCA esperar a GPU (a leitura é sempre não-bloqueante), sabendo
 *  que a sonda desenha UMA vez por quadro (ver a mecânica, mais abaixo:
 *  o grupo do clarão só é desenhado no passe principal). */
const TAMANHO_DA_PISCINA_DE_SONDAS = 3;

const SONDA_VERT = /* glsl */ `
uniform float uMeiaPx;
uniform float uScreenH;

void main() {
  vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  // metade do caminho até o Sol, na mesma direção: mesmo pixel na tela
  c.xyz *= 0.5;
  // o piso é só guarda de divisão (o mesmo do clarão: 1e-6 pc inflava a
  // sonda de uma visitada pequena vista a menos de 0,4 UA)
  float extent = uMeiaPx * 2.0 * max(-c.z, 1e-30) / (projectionMatrix[1][1] * uScreenH);
  gl_Position = projectionMatrix * c;
  // A ESTRELA LOGO FORA DO QUADRO ainda joga o clarão para dentro dele: a
  // sonda pergunta então no pixel da BORDA mais perto dela (Sírius 2 px
  // abaixo do quadro, atrás de Io, acendia os braços em cima da lua —
  // filme do Sol, t = 165 s). Dentro do quadro o grampo não mexe em nada.
  if (gl_Position.w > 0.0) {
    float my = (uMeiaPx * 4.0 + 2.0) / uScreenH;
    vec2 lim = (1.0 - vec2(my * projectionMatrix[0][0] / projectionMatrix[1][1], my)) * gl_Position.w;
    gl_Position.xy = clamp(gl_Position.xy, -lim, lim);
  }
  gl_Position.xy += position.xy * extent * vec2(projectionMatrix[0][0], projectionMatrix[1][1]);
  // nunca no fundo do depth: z de NDC 1 − 4,8e−7 = depth 1 − 2,4e−7
  // (na profundidade invertida o fundo é z = 0: \`core/profundidade.ts\`)
  #ifdef USE_REVERSED_DEPTH_BUFFER
  gl_Position.z = max(gl_Position.z, 0.0);
  #else
  gl_Position.z = min(gl_Position.z, gl_Position.w * (1.0 - 4.8e-7));
  #endif
}
`;

const SONDA_FRAG = /* glsl */ `
precision lowp float;
void main() {
  gl_FragColor = vec4(1.0);
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
   * disco: ela é DESLIGADA pela soltura). As visitadas trazem a delas
   * (`visitadas`), pela mesma repartição.
   */
  solturaDoSol: number;
  expoM0: number;
  sigmaPx: number;
  /** pixelRatio do renderer — a INVARIÂNCIA de resolução: gatilho e
   *  tamanho do clarão são decididos na régua de referência (DPR 1) e
   *  convertidos para o buffer; sem isso o clarão desarma/encolhe
   *  exatamente no modo cinema (pico cai com pr²). 1 = referência. */
  pr?: number;
  /** o ar da Terra no raio câmera→Sol (`SolNoQuadro`), multiplicado na
   *  emissão do clarão do Sol, antes da compressão — como no disco e no
   *  ponto. Ausente = (1, 1, 1). */
  transmitanciaDoSol?: readonly number[];
  /**
   * AS ESTRELAS VISITADAS (12/11, a luz da estrela é uma só): toda
   * estrela que o motor do Sol monta (`director/estrelasNoQuadro.ts`)
   * candidata PELA MESMA LEI do Sol — magnitude do ponto que ela
   * substitui, cor desse ponto e a soltura da repartição dela. Ausente
   * ou vazia: o Sol e as nomeadas, sem corpo nenhum montado.
   */
  visitadas?: readonly CandidataVisitada[];
  /** a luz que a lente acendeu (quadro anterior): o halo do campo cede a ela */
  lente?: LuzDaLenteNoQuadro;
  /** os anéis desenhados neste quadro (`transmitanciaDosAneis`); ausente = nenhum */
  aneis?: readonly Readonly<AnelComPerfil>[];
  /** tan(fov vertical / 2) — a pegada de um pixel no anel; ausente = 0 */
  tanHalfFov?: number;
}

/** Quantas vagas de visitada o cadastro reserva (duas por estrela: a
 *  principal e a companheira) — guarda de memória, não lei. */
export const VAGAS_DE_VISITADAS = 40;

/**
 * Uma estrela visitada candidata ao clarão, por quadro. Os números são os
 * do PONTO que ela é de longe: `mBase` = m − 5·log10(d) (o catálogo:
 * −0,15 − 2,5·logLum; o ponto próprio: M_V − 5) e a cor do mesmo ponto.
 */
export interface CandidataVisitada {
  /** vaga estável (0..VAGAS_DE_VISITADAS−1): a identidade no orçamento */
  vaga: number;
  pos: { x: number; y: number; z: number };
  mBase: number;
  cor: readonly [number, number, number];
  /** a soltura da repartição dela (0..1): veste tamanho e presença, como a do Sol */
  soltura: number;
  /**
   * o índice dela na lista de nomeadas (−1 ou ausente = não é nomeada): é
   * a MESMA candidata de longe e de perto (`ClaraoDeAsas`)
   */
  nomeada?: number;
}

/** Teto de sanidade do billboard, em px: além da diagonal de qualquer
 *  tela real o perfil já é invisível — é guarda de fillrate, não lei. */
const TETO_DO_BILLBOARD_PX = 4096;

/** A ANATOMIA DO FILME no clarão do Sol (brief do dono, 16/08): cartaz
 *  GRANDE (o da asa inteira), com a receita do filme dentro (brilho
 *  morre sozinho, braços vazam para fora) — e o TETO DE OCUPAÇÃO por
 *  estrela: *"ele só limita para que nao aconteça que uma estrela nunca
 *  ocupe toda a tela, ela sempre chega no máximo que vai ocupar
 *  rapidamente"*. Nenhum clarão passa desta fração da altura da tela,
 *  nunca — o limitador é POR ESTRELA, jamais exposição de cena. */
export const FATOR_DE_ENCHIMENTO_DO_SOL = 1.0;

/** O TETO É UM SÓ, NOS DOIS MODOS — decisão do dono, 23/08, com as
 *  quatro fotos da comparação na mão: *"vamos igualar o clarao, se
 *  percebermos que é um problema para observacao do sisztema solar,
 *  vamos pensar em como consertar globalmente, nao quero essa distincao
 *  entre modo atlas e modo filme, para mim o filme é um feature do
 *  atlas"*.
 *
 *  O que morreu ali: a DOSE POR FASE de 17/08 — 0,07 no Atlas contra
 *  0,55 no filme, sob o nome `OCUPACAO_NA_OBSERVACAO` —, que nasceu de
 *  uma pergunta legítima dele — *"não vai dominar toda a cena?"* — e
 *  virou, com o tempo, a distinção entre os modos que ele proíbe. Ela
 *  era assistência declarada; deixou de existir, e com ela o
 *  `tetoDeOcupacao` que o director mandava por quadro. A LEI DA
 *  UNIFICAÇÃO NÃO SE MEXE: um número, nunca dois.
 *
 *  E EM 24/08 O NÚMERO DESCEU — a segunda metade da mesma decisão, que
 *  ele já tinha pré-autorizado (*"se percebermos que é um problema…
 *  vamos pensar em como consertar globalmente"*). Ele OLHOU as fotos do
 *  teto unificado e reprovou: *"não gostei do resultado novo, acho que a
 *  versão anterior fica melhor em todo o app, unificada, essa estrela
 *  spiked desse tamanho (sol) ocupa todo sistema solar na visão
 *  afastada… fica um pouco prejudicado"*, e *"uma coisa é o background
 *  vivo, outra coisa é o tamanho que o Sol está ocupando do sistema
 *  solar"*. O teto único passa a ser 0,07 — o número que a observação
 *  tinha —, agora valendo no filme, no voo livre e no Atlas.
 *
 *  POR QUE TETO E NÃO EXPOSIÇÃO ADAPTATIVA, já que a redação anterior
 *  desta docstring prometia "auto-exposição" como o conserto global.
 *  Duas razões, e a primeira exige PRECISÃO no termo: o que o NORTE
 *  proíbe não é auto-exposição em geral, é a que LÊ A CENA — "Proibido:
 *  teto de brilho. Proibido: exposição que depende do que está em foco.
 *  A pupila adaptativa está reprovada pelo dono". A exposição que a casa
 *  TEM continua viva e lícita (`setExposure(1.02 + 0.03·galaxyFade)` no
 *  director, com `?exp=` por cima): ela depende de ONDE A CÂMERA ESTÁ,
 *  não do que caiu no quadro — é a mesma fronteira do §7 regra 1. O que
 *  seria proibido aqui é fechar a exposição PORQUE o Sol está grande na
 *  tela, que é a pupila com outro nome.
 *  A segunda razão é que a queixa DELE é GEOMÉTRICA — o TAMANHO que a
 *  estrela ocupa —, não fotométrica: qualquer exposição apagaria o resto
 *  da cena para caber uma fonte só, e o que ele pediu foi que a FONTE
 *  encolhesse. Este limitador é exatamente esse eixo.
 *
 *  O PREÇO, medido e declarado, agora no sentido inverso: o clarão
 *  encolhe 7,9× em linha para TODO MUNDO, e o filme paga junto — foi ele
 *  quem mandou unificar para baixo, sabendo que o drama do filme desce
 *  também. Os números degrau a degrau estão na `LEI-DA-ESTRELA`.
 *
 *  Segue sendo limitador POR ESTRELA, nunca exposição de cena. */
export const OCUPACAO_MAXIMA_DA_TELA = 0.07;

// ─── A LUZ ÚNICA (13/11) ─────────────────────────────────────────────────
// A decisão do dono: nenhum desenho de autor por classe de objeto — UMA lei
// de luz para toda estrela, o Sol incluído. Esta camada desenha a luz de
// TODA estrela brilhante, escolhida só por fluxo: o Sol, as 1.726 nomeadas
// do sidecar e as visitadas, ranqueadas pelo pico na câmera.

/**
 * A PONTA FRACA DA LEI É ARTE DECLARADA — "o brilho de autor virou lei".
 * A asa física (`raioVisivelDaAsaPx`) dá a uma estrela de m ≈ −1,5 cerca de
 * 5 px de meia-extensão; o desenho aprovado do dono dava a Sirius, de casa,
 * ~67 px. Para o céu de casa não empobrecer, o tamanho tem um PISO que é
 * função só da magnitude aparente (e da altura da tela), com Δ = m − (−1,5):
 *
 *   log10(meia_arte / teto) = −INCLINACAO·Δ − CURVATURA·max(0, Δ)²
 *
 * com `teto` = OCUPACAO_MAXIMA_DA_TELA da altura (Sirius de casa nasce no
 * teto). A curva é de GOSTO, escolhida na prancha contra as heroes de autor (13/11),
 * por duas âncoras: uma estrela de m ≈ 0 (α Centauri, Vega) com 0,4 do teto
 * (~25 px de meia num quadro de 900) e uma de m = 2 com 0,05 (~3 px: ponto).
 * Perto do teto ela anda devagar (≈ fluxo^0,47) — as de primeira grandeza
 * guardam um brilho legível e ordenado pela luz; mais fracas ela cai cada vez
 * mais depressa, e o céu não vira um campo de bolhas. (A reta anterior,
 * fluxo^1, encolhia α Centauri a ~16 px.) Nada aqui é por estrela. Como a
 * arte só PISA por baixo da asa e o teto é o mesmo, todo regime em que a lei
 * já estava no teto (o Sol a 1 UA, o Sol colado no disco e toda a entrega
 * dele) fica idêntico.
 */
export const MAGNITUDE_DO_TETO_DA_ARTE = -1.5;
export const INCLINACAO_DA_ARTE = 0.186;
export const CURVATURA_DA_ARTE = 0.053;

/**
 * A FATIA DO CAMPO (0..1) — quanto do halo largo e macio esta estrela ganha
 * no passe do campo (`ClaraoDoCampo`, `core/post.ts`), o mesmo kernel do
 * filme que vestia as heroes. O halo e a lente de cinema desenham a MESMA
 * luz em volta da fonte forte: onde a lente acende, o halo cede a ela — e a
 * medida é a da própria lente NESTE quadro (`luzDaLente`: a amplitude que o
 * passe recebeu sobre G, × a força de Ajustes; 0 com a lente desligada), nunca
 * uma magnitude adivinhada. As outras estrelas cedem ao VÉU dela (`veuDaLente`:
 * a mesma luz, pesada por quanto a fonte está no quadro).
 * Sem lente, então, o halo fica inteiro até o corpo (a soltura) tomar a luz;
 * com qualquer receita ele sai enquanto ela entra, e halo + lente é a mesma
 * função crescente da luz da estrela.
 *
 *   fatia = 1 − luzDaLente^EXPOENTE_DA_CESSAO
 *
 * O EXPOENTE é medido, não gosto: a lente põe boa parte da luz dela longe da
 * fonte (fantasmas, anel, sujeira), e perto dela o que a lente acende chega
 * DEPOIS da amplitude. Com cessão linear (1) o raio de 150 px em volta de
 * Sirius perdia luz por seis passos (×0,99 cada) e a lente subia de uma vez
 * (×1,23 num passo de 20 % na distância); com 2, o maior passo da chegada
 * foi ×1,08 e o vale ×1,04; com 3 voltava um degrau de ×0,97. Com a lente
 * plena (1) a fatia é 0 exato: o Sol a menos de 50 UA, com lente, fica como
 * estava.
 */
export const EXPOENTE_DA_CESSAO = 2;

export function fatiaDoCampo(luzDaLente: number): number {
  const l = Number.isFinite(luzDaLente) ? Math.min(1, Math.max(0, luzDaLente)) : 0;
  return 1 - Math.pow(l, EXPOENTE_DA_CESSAO);
}

/** a luz que a lente acendeu num quadro e de quem (`candidata` null = o Sol) */
export interface LuzDaLenteNoQuadro {
  /** a amplitude da lente sobre G, × a força de Ajustes, em 0..1 (0 = desligada) */
  fracao: number;
  /** a candidata ao clarão que é a fonte da lente; null = o Sol */
  candidata: CandidataVisitada | null;
  /**
   * quanto a fonte da lente está NO QUADRO (0..1): 1 dentro, 0 atrás da
   * câmera ou além da margem da borda — a mesma margem com que a própria
   * lente some (`veuDaLenteNaTela`). É o que faz o VÉU valer só quando a
   * fonte forte está à vista; ausente = 0 (sem véu sobre as outras).
   */
  naTela?: number;
}

/**
 * O HALO CRESCE COM A LUZ, DEVAGAR — o regime do meio (m entre ≈ −1,5 e o
 * Sol de perto). O tamanho para no teto do dono em m = −1,5, então acima
 * dali só o halo do campo ainda pode ordenar as estrelas pela luz: uma estrela
 * 10 mag mais brilhante que Sirius de casa tem de ler mais forte que ela.
 * O ganho do halo é uma potência BAIXA do fluxo, presa em 1:
 *
 *   halo(m) = min(1, HALO_NO_TETO · 10^(0,4 · EXPOENTE_DO_HALO · max(0, −1,5 − m)))
 *
 * e vale HALO_NO_TETO para tudo de m = −1,5 para baixo (o céu de casa
 * inteiro: Sirius de casa é a mais brilhante dele). A física pediria o fluxo
 * inteiro (expoente 1): o Sol a 200 UA, 330 mil vezes Sirius de casa, teria
 * um halo que engole o sistema solar — o dono já disse não a isso ("essa
 * estrela spiked desse tamanho (sol) ocupa todo sistema solar na visão
 * afastada"). O meio-termo é ARTE DECLARADA, com duas âncoras escolhidas nas
 * pranchas de 13/11 (v3), e o halo é muito sensível ao ganho (o passe do
 * campo tem limiar: 0,55 já tirava metade do brilho macio, 0,8 era o halo
 * pleno de antes): Sirius de casa com 0,65 (entre o desenho de autor e a lei
 * de antes) e o Sol a 200 UA com ~0,85 (as órbitas legíveis através dele).
 * O halo pleno só chega em m ≈ −24 — o Sol a poucas UA, onde a lente já é
 * inteira e o halo da fonte cede a ela de qualquer jeito.
 */
export const HALO_NO_TETO = 0.65;
export const EXPOENTE_DO_HALO = 0.021;

export function haloDaLuz(m: number): number {
  if (!Number.isFinite(m)) return 0;
  const acima = Math.max(0, MAGNITUDE_DO_TETO_DA_ARTE - m);
  return Math.min(1, HALO_NO_TETO * Math.pow(10, 0.4 * EXPOENTE_DO_HALO * acima));
}

/**
 * A FRONTEIRA DAS VAGAS NÃO CORTA. Com mais estrelas fortes que
 * vagas, quem entra só entra deslocando o membro mais fraco, e com a folga da
 * troca (RAZAO_DE_TROCA) — a entrada era um estalo: o entrante nascia com a
 * presença que já tinha (0,35 medido em Alnitak, 13/11) e o deslocado sumia
 * na rampa. A presença passa a cair a zero NA fronteira: `corte` é o pico do
 * primeiro elegível que ficou de fora × a folga da troca, e a presença sobe
 * de 0 (no corte) a 1 num fator 2 de pico acima dele (0,75 mag). Quem entra
 * por deslocar nasce em 0 e quem é deslocado já chegou a 0 antes de perder a
 * vaga. Só as do fim da fila sentem (m ≳ 1 no céu de casa); a régua é o pico,
 * o mesmo critério do ranking — nenhuma conta por nome. Pura.
 */
export function presencaNaFronteira(pico: number, corte: number): number {
  if (!(corte > 0)) return 1;
  if (!(pico > corte)) return 0;
  return Math.min(1, Math.log2(pico / corte));
}

/**
 * NUMA DUPLA, A MAIS FRACA CEDE O CLARÃO À MAIS FORTE (decisão do dono,
 * 14/11). O defeito de origem é o TETO: ele põe duas estrelas acima dele no
 * MESMO tamanho e no mesmo ganho — Sirius B, 10 mag mais fraca, saía com o
 * clarão de Sirius A ao lado dela. A cessão nasce então do teto: ele age como
 * a exposição de uma câmera ajustada para a mais forte da vizinhança, e a
 * fraca é desenhada PELA MESMA LEI de qualquer estrela (`meiaDaLei` e
 * `ganhoDeEntradaDoFlare`), numa magnitude efetiva deslocada por
 *
 *   deslocamento = cobertura · presença_da_forte · min(Δm, e)
 *
 * com e = quantas magnitudes a forte está ACIMA do teto da arte (0 abaixo
 * dele: o céu de casa não muda). O ALCANCE da forte é o tamanho que o clarão
 * dela teria SEM o teto, pela mesma inclinação da arte, medido a partir do da
 * fraca: meia_fraca · 10^(INCLINACAO_DA_ARTE · Δm) (nunca menos que o
 * desenhado dela, nunca mais que `tetoPx`, um quadro); dentro dele a
 * cobertura sobe suave até 1 no centro (smoothstep). Δm = 0 e e = 0 não
 * deslocam nada, a forte nunca se desloca, e tudo é contínuo na câmera.
 * Devolve o deslocamento em magnitudes (≥ 0). Pura.
 */
export function deslocamentoDaCessao(
  mFraca: number,
  meiaDaFracaPx: number,
  mForte: number,
  meiaDaFortePx: number,
  presencaDaForte: number,
  separacaoPx: number,
  tetoPx: number
): number {
  const dm = mFraca - mForte;
  const e = MAGNITUDE_DO_TETO_DA_ARTE - mForte;
  if (!(dm > 0) || !(e > 0) || !(presencaDaForte > 0) || !(separacaoPx >= 0)) return 0;
  const semTeto = meiaDaFracaPx * Math.pow(10, INCLINACAO_DA_ARTE * dm);
  const alcance = Math.min(Math.max(meiaDaFortePx, semTeto), tetoPx);
  if (!(alcance > separacaoPx)) return 0;
  const t = separacaoPx / alcance;
  const cobertura = 1 - t * t * (3 - 2 * t);
  return cobertura * Math.min(1, presencaDaForte) * Math.min(dm, e);
}

/**
 * O VÉU DA LENTE — a luz que a lente acende é o véu da câmera INTEIRA, não só
 * da fonte: o espalhamento de uma fonte forte à vista levanta o fundo do
 * quadro e afoga o halo macio de toda estrela mais fraca (o "veiling glare"
 * das objetivas); o núcleo e os braços, nítidos, continuam. Por isso o halo
 * de TODA estrela cede à luz da lente, pela mesma lei da fonte (`fatiaDoCampo`),
 * com a luz pesada por quanto a fonte está no quadro (`naTela`) — fonte fora
 * da tela não vela nada. Não é exposição: nenhum núcleo nem tamanho muda, e
 * a conta não lê o quadro, só a lente que já está acesa nele.
 */
export function veuDaLente(lente: LuzDaLenteNoQuadro | undefined): number {
  if (!lente) return 0;
  const f = Number.isFinite(lente.fracao) ? Math.min(1, Math.max(0, lente.fracao)) : 0;
  const t = Number.isFinite(lente.naTela) ? Math.min(1, Math.max(0, lente.naTela as number)) : 0;
  return f * t;
}

/**
 * O QUANTO A FONTE DA LENTE ESTÁ NO QUADRO (0..1), pela posição dela em NDC:
 * 0 atrás da câmera; dentro do quadro 1; fora dele cai suave até zero a
 * MARGEM_DO_VEU (em alturas de quadro) da borda — a margem da lente
 * (`presets.ts`, `borda.margem`), para o véu sair junto com ela. Pura.
 */
export const MARGEM_DO_VEU = 0.15;

export function veuDaLenteNaTela(ndcX: number, ndcY: number, naFrente: boolean, aspecto: number): number {
  if (!naFrente || !Number.isFinite(ndcX) || !Number.isFinite(ndcY)) return 0;
  const db = Math.min(aspecto / 2 - (Math.abs(ndcX) * aspecto) / 2, 0.5 - Math.abs(ndcY) / 2);
  const t = Math.min(1, Math.max(0, (db + MARGEM_DO_VEU) / MARGEM_DO_VEU));
  return t * t * (3 - 2 * t);
}

/** o piso de arte da meia-extensão (px, na régua de `screenH`) — pura */
export function meiaDaArtePx(m: number, screenH: number): number {
  const dm = m - MAGNITUDE_DO_TETO_DA_ARTE;
  return (
    OCUPACAO_MAXIMA_DA_TELA *
    screenH *
    Math.pow(10, -INCLINACAO_DA_ARTE * dm - CURVATURA_DA_ARTE * Math.max(0, dm) ** 2)
  );
}

// ─── OS ANÉIS NO CAMINHO — o anel que tapa o ponto tapa o clarão ─────────
// A sonda só vê o que escreve profundidade, e o anel não escreve: Sírius
// atrás do anel B acendia o clarão inteiro. O anel é translúcido, então a
// resposta não é binária — é a TRANSMITÂNCIA, pela lei do PRÓPRIO material
// (`ANEL_FRAG`, gigante.ts): ele desenha com α = 1 − e^{−τ/μ} em mistura
// normal, e o que estiver atrás sai × e^{−τ/μ}. Aqui, a mesma conta na CPU:
//
//   τ = −ln(max(1 − ā, 10⁻³)) · fatorTau(r),  μ = max(|d·n|, 0,02),
//   T = e^{−τ/μ}  (T = 1 onde ā < 0,004 — o `discard` do material)
//
// com ā o α do perfil medido no raio onde a linha câmera→estrela fura o
// plano, MÉDIO NA PEGADA DE UM PIXEL ali (o mipmap do material faz o mesmo:
// de longe o pixel mistura o B com a Cassini). A pegada radial é o
// gradiente de r por pixel, `px·t·√(1 + (ê_r·d)²/μ²)`, nunca menor que uma
// caixa (que é o filtro linear de perto). Média de caixa sobre α constante
// por caixa = soma acumulada: contínua no raio, então o T anda contínuo com
// a câmera — sem rampa, ele vale no MESMO quadro em que o anel cobre o
// ponto. Os anéis procedurais (sem perfil) e os véus aditivos não tapam.
// Os números e o GLSL gêmeo moram em `starShaders.ts`: o ponto de cada
// estrela atravessa o anel pela mesma conta (`escreverAneisNosPontos`).

interface TabelaDoAnel {
  /** soma acumulada de α por caixa (n + 1 entradas) */
  readonly soma: Float64Array;
  readonly fatorTau: Float32Array;
  /** as duas tabelas para a GPU: a soma em BYTES (inteiros exatos em
   *  float32) a partir do texel 0 e o fatorTau a partir de `baseDoTau` */
  readonly textura: THREE.DataTexture;
  readonly baseDoTau: number;
}

const tabelasDosAneis = new WeakMap<Readonly<AnelComPerfil>, TabelaDoAnel>();

function tabelaDoAnel(anel: Readonly<AnelComPerfil>): TabelaDoAnel {
  let t = tabelasDosAneis.get(anel);
  if (t) return t;
  const n = anel.perfil.length >> 2;
  const soma = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) soma[i + 1] = soma[i] + anel.perfil[i * 4 + 3] / 255;
  const fatorTau = new Float32Array(AMOSTRAS_DO_FATOR_TAU);
  for (let k = 0; k < AMOSTRAS_DO_FATOR_TAU; k++) {
    const r = anel.rInt + ((anel.rExt - anel.rInt) * k) / (AMOSTRAS_DO_FATOR_TAU - 1);
    fatorTau[k] = regiaoDoAnelCpu(r * anel.kmPorRaio).fatorTau;
  }
  const L = LARGURA_DA_TABELA_DO_ANEL;
  const baseDoTau = Math.ceil((n + 1) / L) * L;
  const dados = new Float32Array(baseDoTau + Math.ceil(AMOSTRAS_DO_FATOR_TAU / L) * L);
  for (let i = 0; i < n; i++) dados[i + 1] = dados[i] + anel.perfil[i * 4 + 3];
  dados.set(fatorTau, baseDoTau);
  const textura = new THREE.DataTexture(dados, L, dados.length / L, THREE.RedFormat, THREE.FloatType);
  textura.needsUpdate = true;
  t = { soma, fatorTau, textura, baseDoTau };
  tabelasDosAneis.set(anel, t);
  return t;
}

/** ∫₀ˣ α, em caixas, com a borda estendida (o clamp-to-edge da textura) */
function integralDeAlfa(soma: Float64Array, x: number): number {
  const n = soma.length - 1;
  if (x <= 0) return x * soma[1];
  if (x >= n) return soma[n] + (x - n) * (soma[n] - soma[n - 1]);
  const i = Math.floor(x);
  return soma[i] + (x - i) * (soma[i + 1] - soma[i]);
}

/**
 * A fração da luz de um ponto em `alvo` que chega à câmera em `cam` depois
 * de atravessar os anéis (1 = nenhum no caminho). `radPorPx` é o ângulo de
 * um pixel do buffer (a pegada do mipmap); 0 = só o filtro linear.
 */
export function transmitanciaDosAneis(
  aneis: readonly Readonly<AnelComPerfil>[],
  cam: { x: number; y: number; z: number },
  alvo: { x: number; y: number; z: number },
  radPorPx: number
): number {
  let dx = alvo.x - cam.x;
  let dy = alvo.y - cam.y;
  let dz = alvo.z - cam.z;
  const l = Math.hypot(dx, dy, dz);
  if (!(l > 0)) return 1;
  dx /= l;
  dy /= l;
  dz /= l;
  let tr = 1;
  for (const anel of aneis) {
    const c = anel.centroPc;
    const p = anel.polo;
    const dn = dx * p.x + dy * p.y + dz * p.z;
    if (dn === 0) continue;
    const t = ((c.x - cam.x) * p.x + (c.y - cam.y) * p.y + (c.z - cam.z) * p.z) / dn;
    // o anel tem de estar ENTRE a câmera e a estrela
    if (!(t > 0 && t < l)) continue;
    const hx = cam.x + dx * t - c.x;
    const hy = cam.y + dy * t - c.y;
    const hz = cam.z + dz * t - c.z;
    const rPc = Math.hypot(hx, hy, hz);
    const r = rPc / anel.raioPc;
    // a malha (RingGeometry) vai de rInt a rExt: fora dela, nada desenha
    if (!(r > anel.rInt && r < anel.rExt)) continue;
    const mu = Math.max(Math.abs(dn), PISO_DO_MU_DO_ANEL);
    const tab = tabelaDoAnel(anel);
    const n = tab.soma.length - 1;
    const dudr = U_PERFIL_ESCALA / (anel.rExt - anel.rInt);
    const x = ((r - anel.rInt) * dudr + U_PERFIL_BASE) * n;
    const erd = (hx * dx + hy * dy + hz * dz) / rPc;
    const pegadaR = (radPorPx * t * Math.sqrt(1 + (erd / mu) ** 2)) / anel.raioPc;
    const w = Math.max(pegadaR * dudr * n, 1);
    const alfa = (integralDeAlfa(tab.soma, x + 0.5 * w) - integralDeAlfa(tab.soma, x - 0.5 * w)) / w;
    if (alfa < LIMIAR_DO_ANEL) continue;
    const k = ((r - anel.rInt) / (anel.rExt - anel.rInt)) * (AMOSTRAS_DO_FATOR_TAU - 1);
    const k0 = Math.min(Math.floor(k), AMOSTRAS_DO_FATOR_TAU - 2);
    const fz = tab.fatorTau[k0] + (k - k0) * (tab.fatorTau[k0 + 1] - tab.fatorTau[k0]);
    const tau = -Math.log(Math.max(1 - alfa, PISO_DA_TRANSMISSAO_DO_ANEL)) * fz;
    tr *= Math.exp(-tau / mu);
  }
  return tr;
}

/**
 * O MESMO anel para o PONTO de cada estrela: escreve `UNIFORMES_DOS_ANEIS`
 * (starShaders.ts), que o vértice de todo desenhista de ponto estelar lê
 * para dar, estrela a estrela, o número de `transmitanciaDosAneis`. Sem
 * anel com perfil desliga o termo (o ponto sai bit a bit o de antes). Só
 * um anel tem perfil medido (Saturno): um segundo seria ignorado aqui.
 */
export function escreverAneisNosPontos(
  aneis: readonly Readonly<AnelComPerfil>[],
  cam: { x: number; y: number; z: number },
  radPorPx: number
): void {
  const u = UNIFORMES_DOS_ANEIS;
  const anel = aneis[0];
  if (!anel) {
    u.uAnelLigado.value = 0;
    return;
  }
  const tab = tabelaDoAnel(anel);
  const n = tab.soma.length - 1;
  const caixasPorRaio = (U_PERFIL_ESCALA / (anel.rExt - anel.rInt)) * n;
  const c = anel.centroPc;
  u.uAnelLigado.value = 1;
  u.uAnelCentro.value.set(
    (c.x - cam.x) / anel.raioPc,
    (c.y - cam.y) / anel.raioPc,
    (c.z - cam.z) / anel.raioPc
  );
  u.uAnelPolo.value.copy(anel.polo);
  u.uAnelRaioPc.value = anel.raioPc;
  u.uAnelRaios.value.set(anel.rInt, anel.rExt);
  u.uAnelCaixas.value.set(caixasPorRaio, U_PERFIL_BASE * n, n);
  u.uAnelRadPorPx.value = Number.isFinite(radPorPx) && radPorPx > 0 ? radPorPx : 0;
  u.uAnelBaseDoTau.value = tab.baseDoTau;
  u.uAnelTabela.value = tab.textura;
}

export class ClaraoDeAsas {
  readonly group = new THREE.Group();
  private readonly mats: THREE.ShaderMaterial[] = [];
  private readonly meshes: THREE.Mesh[] = [];
  private readonly slots: SlotDoClarao[];
  /** o quadro em que a nomeada foi escrita por uma visitada */
  private readonly marcaDaVisita: Uint32Array;
  private quadro = 0;
  private readonly nNomeadas: number;
  /** os gêmeos da camada do campo (vazios sem `camadaDoCampo`) */
  private readonly matsDoCampo: THREE.ShaderMaterial[] = [];
  private readonly meshesDoCampo: THREE.Mesh[] = [];

  // ── a sonda de oclusão, UMA POR VAGA — ver a seção dedicada, logo
  // antes de `ocupacao()` — mesmo grupo, desenhista à parte
  private readonly sondaMat: THREE.ShaderMaterial;
  private readonly sondas: THREE.Mesh[] = [];
  private readonly consultas: SondaDeOclusao[] = [];
  /** por vaga: a ÚLTIMA consulta resolvida achou o ponto tapado por OUTRO
   *  corpo — nunca pela §5.15 (a estrela não conta para si mesma) */
  private readonly oculta: Uint8Array;
  /** por vaga: a presença pela oclusão, 0..1 — a rampa de 300 ms rumo a
   *  0 (tapada) ou 1 (à vista); multiplica o clarão e o halo da vaga */
  private readonly visibilidade: Float64Array;
  /** por vaga: o candidato a quem as respostas da sonda pertencem */
  private readonly donoDaSonda: Int32Array;
  /** por vaga: a sonda já respondeu (à vista, tapada ou fora da tela) ao dono de agora */
  private readonly respondida: Uint8Array;
  private readonly vSonda = new THREE.Vector3();
  /** por vaga, deste quadro: magnitude, meia em px do buffer e o ganho
   *  ANTES da cessão (0 = não desenha) — o que `cederAoMaisForte` compara */
  private readonly mDaVaga: Float64Array;
  private readonly meiaDaVaga: Float64Array;
  private readonly ganhoDaVaga: Float64Array;
  /** por vaga: o ganho sem a entrada do pico (orçamento × fronteira ×
   *  soltura × oclusão × anéis) e a fatia do campo sem o halo da luz — o
   *  que a lei recompõe na magnitude deslocada */
  private readonly restoDaVaga: Float64Array;
  private readonly cedidaALente: Float64Array;
  /** o último `atualizar` deixou rampa andando ou entrante sem vaga */
  private pendente = false;

  // o cadastro de candidatos: 0 = Sol (na origem), 1.. = as nomeadas.
  // mBase = m − 5·log10(d_casa): a MESMA lei de recálculo do campo,
  // m(d) = mBase + 5·log10(d) — para o Sol, mBase = M_V☉(campo) − 5,
  // o PONTO_ZERO_SOL_PC da camada dos dez (planetas.ts). Uma lei só.
  private readonly pos: Float32Array;
  private readonly mBase: Float64Array;
  private readonly cor: Float32Array;
  /** a soltura de cada candidato neste quadro (1 = ponto pleno) */
  private readonly soltura: Float64Array;
  /** o primeiro índice das vagas de visitadas no cadastro */
  private readonly inicioDasVisitadas: number;
  /** quais candidatos entram neste quadro (o Sol + as visitadas) */
  private readonly daVez: number[] = [];

  /** buffer de elegíveis do quadro, reusado — zero alocação por quadro */
  private readonly elegiveis: CandidatoAoClarao[] = [];

  constructor(
    named: readonly NamedStar[],
    opcoes: {
      camadaDoCampo?: number;
    } = {}
  ) {
    this.slots = criarSlots();
    this.oculta = new Uint8Array(this.slots.length);
    this.visibilidade = new Float64Array(this.slots.length).fill(1);
    this.donoDaSonda = new Int32Array(this.slots.length).fill(-1);
    this.respondida = new Uint8Array(this.slots.length);
    this.mDaVaga = new Float64Array(this.slots.length);
    this.meiaDaVaga = new Float64Array(this.slots.length);
    this.ganhoDaVaga = new Float64Array(this.slots.length);
    this.restoDaVaga = new Float64Array(this.slots.length);
    this.cedidaALente = new Float64Array(this.slots.length);
    this.nNomeadas = named.length;
    const n = named.length + 1 + VAGAS_DE_VISITADAS;
    this.marcaDaVisita = new Uint32Array(n);
    this.inicioDasVisitadas = named.length + 1;
    this.pos = new Float32Array(n * 3);
    this.mBase = new Float64Array(n);
    this.cor = new Float32Array(n * 3);
    this.soltura = new Float64Array(n).fill(1);

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

    // UM plano para todos os quads: cada vaga com a sua geometria punha
    // 65 delas residentes (memoria.mjs, teto de 80 no mundo inteiro)
    const plano = new THREE.PlaneGeometry(2, 2);
    const novoMaterial = () => {
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
          uTransmitancia: { value: new THREE.Vector3(1, 1, 1) },
          ...UNIFORMES_DA_ASSINATURA,
        },
        blending: THREE.AdditiveBlending,
        // §5.15: o clarão NUNCA é ocluído pelo corpo que o causa — estado
        // de profundidade é lei, não escolha de material.
        depthTest: false,
        depthWrite: false,
        transparent: true,
      });
      seguirALente(mat, FRAG, FRAG_DA_LENTE);
      const quad = new THREE.Mesh(plano, mat);
      quad.visible = false;
      quad.frustumCulled = false;
      quad.renderOrder = 3;
      this.group.add(quad);
      return { mat, quad };
    };
    for (let k = 0; k < ORCAMENTO_DO_CLARAO; k++) {
      const { mat, quad } = novoMaterial();
      this.mats.push(mat);
      this.meshes.push(quad);
    }
    // o GÊMEO de cada slot, só na camada do campo (o passe que veste o
    // campo com o kernel do filme) — nunca na camada 0, então não desenha
    // imagem direta: só o halo macio da estrela
    if (opcoes.camadaDoCampo !== undefined) {
      for (let k = 0; k < ORCAMENTO_DO_CLARAO; k++) {
        const { mat, quad } = novoMaterial();
        quad.layers.set(opcoes.camadaDoCampo);
        this.matsDoCampo.push(mat);
        this.meshesDoCampo.push(quad);
      }
    }

    // as sondas entram DEPOIS dos ORCAMENTO_DO_CLARAO quads: quem lê
    // `group.children[0..ORCAMENTO_DO_CLARAO-1]` continua vendo só os
    // billboards do clarão (clarao.test.ts)
    this.sondaMat = new THREE.ShaderMaterial({
      vertexShader: SONDA_VERT,
      fragmentShader: SONDA_FRAG,
      uniforms: {
        uMeiaPx: { value: MEIA_PX_DA_SONDA },
        uScreenH: { value: 1080 },
      },
      colorWrite: false,
      depthWrite: false,
      depthTest: true,
      transparent: true,
    });
    for (let k = 0; k < this.slots.length; k++) {
      const sonda = new THREE.Mesh(plano, this.sondaMat);
      sonda.visible = false;
      sonda.frustumCulled = false;
      sonda.renderOrder = -1; // a PRIMEIRA da fila transparente: só o depth dos sólidos
      // a mecânica da consulta é a comum (`sondaDeOclusao.ts`); fora da
      // tela (sem resposta) conta como à vista, ver a seção da mecânica
      const consultas = new SondaDeOclusao(TAMANHO_DA_PISCINA_DE_SONDAS, (visivel) =>
        this.registrarOclusao(k, visivel === false)
      );
      consultas.ligar(sonda, (camera) => this.centroNaTela(sonda, camera));
      this.group.add(sonda);
      this.sondas.push(sonda);
      this.consultas.push(consultas);
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
   * longo. A asa é pisada pela arte declarada (`meiaDaArtePx`).
   */
  private meiaDaLei(pico: number, sigma: number, screenH: number, m: number): number {
    const asa = Math.max(raioVisivelDaAsaPx(pico, sigma), alcanceDoEspinhoPx(pico, sigma));
    const teto = Math.min(OCUPACAO_MAXIMA_DA_TELA * screenH, TETO_DO_BILLBOARD_PX);
    return Math.min(FATOR_DE_ENCHIMENTO_DO_SOL * Math.max(asa, meiaDaArtePx(m, screenH)), teto);
  }

  /** um candidato do quadro: mede e, se a óptica alcança além do sprite,
   *  entra na lista de elegíveis (pico DESC) */
  private candidatar(i: number, q: QuadroDoClarao, cssH: number, sigma: number): void {
    const el = this.elegiveis;
    const soltura = this.soltura[i];
    // superfície é a dona: com a soltura em zero o clarão nem candidata
    if (!(soltura > 0)) return;
    const dx = this.pos[i * 3] - q.camPos.x;
    const dy = this.pos[i * 3 + 1] - q.camPos.y;
    const dz = this.pos[i * 3 + 2] - q.camPos.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (!(d2 > 0)) return;
    const m = this.mBase[i] + 2.5 * Math.log10(d2);
    // pré-filtro barato: acima de m 6 nem a asa nasce (excesso ≤ 1)
    if (!(m < 6)) return;
    // o pico é o PLENO (óptica do ponto, sem filtro) — a entrega
    // ponto↔resolvido é a soltura, aplicada no TAMANHO e no ganho
    const pico = picoDaPsf(m, q.expoM0, q.sigmaPx, cssH);
    // quem não passa do gatilho de entrada (pico ≤ 1, o
    // `ganhoDeEntradaDoFlare` zerado) nunca desenharia: sai antes do resto
    // da conta — é o que deixa as 1.726 nomeadas baratas por quadro
    if (!(pico > 1)) return;
    // elegível quando a óptica alcança além do que o sprite já desenha
    const nucleo = psfPointSizePx(m, q.expoM0, q.sigmaPx, cssH);
    if (!(2 * this.meiaDaLei(pico, sigma, cssH, m) * soltura > nucleo)) return;
    // inserção ordenada (pico DESC, índice ASC no empate), teto K
    const teto = ELEGIVEIS_POR_QUADRO;
    let p = el.length;
    while (p > 0 && (el[p - 1].pico < pico || (el[p - 1].pico === pico && el[p - 1].indice > i)))
      p--;
    if (p >= teto) return;
    el.splice(p, 0, { indice: i, pico });
    if (el.length > teto) el.length = teto;
  }

  /** o candidato tem vaga, e a sonda dela o deu por tapado com a rampa já em zero */
  private tapadaPorInteiro(indice: number): boolean {
    for (let k = 0; k < this.slots.length; k++) {
      if (this.slots[k].indice === indice) return this.oculta[k] === 1 && this.visibilidade[k] === 0;
    }
    return false;
  }

  /** o índice no cadastro de uma visitada (a mesma regra do laço de `atualizar`); null = o Sol */
  private indiceDaFonte(v: CandidataVisitada | null): number {
    if (!v) return 0;
    if (v.nomeada !== undefined && v.nomeada >= 0 && v.nomeada < this.nNomeadas) return 1 + v.nomeada;
    return v.vaga >= 0 && v.vaga < VAGAS_DE_VISITADAS ? this.inicioDasVisitadas + v.vaga : -1;
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

    this.sondaMat.uniforms.uScreenH.value = q.screenH;
    const radPorPx =
      Number.isFinite(q.tanHalfFov) && (q.tanHalfFov as number) > 0
        ? (2 * (q.tanHalfFov as number)) / q.screenH
        : 0;

    // o Sol e as estrelas VISITADAS (12/11): a que o motor do Sol monta
    // candidata pela mesma lei, com os números do ponto dela
    this.soltura[0] = solturaDoSol;
    const daVez = this.daVez;
    daVez.length = 0;
    if (q.solVisivel) daVez.push(0);
    const quadro = ++this.quadro;
    for (const v of q.visitadas ?? []) {
      if (!(v.vaga >= 0 && v.vaga < VAGAS_DE_VISITADAS) || !Number.isFinite(v.mBase)) continue;
      // a visitada que É uma nomeada escreve na vaga DELA (a mesma
      // identidade no orçamento antes e depois de o corpo montar — trocar
      // de vaga seria uma rampa de saída e outra de entrada no meio da
      // chegada); a magnitude e a cor ficam as da nomeada
      const nomeada =
        v.nomeada !== undefined && v.nomeada >= 0 && v.nomeada < this.nNomeadas ? 1 + v.nomeada : -1;
      const i = nomeada >= 0 ? nomeada : this.inicioDasVisitadas + v.vaga;
      this.pos[i * 3] = v.pos.x;
      this.pos[i * 3 + 1] = v.pos.y;
      this.pos[i * 3 + 2] = v.pos.z;
      if (nomeada < 0) {
        this.mBase[i] = v.mBase;
        this.cor[i * 3] = v.cor[0];
        this.cor[i * 3 + 1] = v.cor[1];
        this.cor[i * 3 + 2] = v.cor[2];
      } else this.marcaDaVisita[i] = quadro;
      this.soltura[i] = Number.isFinite(v.soltura) && v.soltura >= 0 && v.soltura <= 1 ? v.soltura : 1;
      daVez.push(i);
    }
    for (const i of daVez) this.candidatar(i, q, cssH, sigma);
    // A LUZ ÚNICA: toda nomeada candidata pelo MESMO critério (o pico na
    // câmera) — as visitadas deste quadro já entraram acima, na vaga delas;
    // as outras voltam a ponto pleno (soltura 1)
    for (let i = 1; i <= this.nNomeadas; i++) {
      if (this.marcaDaVisita[i] === quadro) continue;
      this.soltura[i] = 1;
      this.candidatar(i, q, cssH, sigma);
    }

    // A FRONTEIRA DO ORÇAMENTO NÃO CORTA (`presencaNaFronteira`): o corte é
    // o pico do primeiro elegível que ficou DE FORA × a folga da troca; sem
    // ninguém de fora, não há fronteira (0). A fila conta só quem se VÊ: a
    // estrela inteira atrás de um corpo guarda a vaga (a sonda dela precisa
    // continuar correndo), mas não empurra a fronteira das outras
    let corte = 0;
    let naFila = 0;
    for (const c of el) {
      if (this.tapadaPorInteiro(c.indice)) continue;
      if (naFila++ === this.slots.length) {
        corte = RAZAO_DE_TROCA * c.pico;
        break;
      }
    }

    let pendente = passoDoOrcamento(this.slots, el, q.dtS);
    const veu = veuDaLente(q.lente);

    for (let k = 0; k < this.slots.length; k++) {
      const s = this.slots[k];
      const mesh = this.meshes[k];
      const gemeo = this.meshesDoCampo[k];
      const sonda = this.sondas[k];
      if (gemeo) gemeo.visible = false;
      sonda.visible = false;
      this.ganhoDaVaga[k] = 0;
      // a rampa do orçamento anda em toda vaga, todo quadro: assenta sempre
      if (s.ganho !== s.alvo) pendente = true;
      // a vaga trocou de dono: as respostas em voo eram do anterior, e o
      // novo começa à vista (a mesma regra de "sem resposta")
      if (this.donoDaSonda[k] !== s.indice) {
        this.donoDaSonda[k] = s.indice;
        this.oculta[k] = 0;
        this.visibilidade[k] = 1;
        this.respondida[k] = 0;
        this.consultas[k].invalidar();
      }
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
      const soltura = this.soltura[i];
      const pico = picoDaPsf(m, q.expoM0, q.sigmaPx, cssH);
      const nucleoPx = psfPointSizePx(m, q.expoM0, q.sigmaPx, cssH) * soltura;
      const fronteira = corte > 0 ? presencaNaFronteira(pico, corte) : 1;
      const entrada = ganhoDeEntradaDoFlare(pico) * fronteira * soltura;
      // a soltura veste o TAMANHO por fora do teto de ocupação: o clarão
      // desabrocha DO teto estacionado (o espelho do brief do dono —
      // "chega no máximo rapidamente e estaciona"), nunca além dele
      const meiaPx = this.meiaDaLei(pico, sigma, cssH, m) * soltura * pr;
      if (!(meiaPx > 0) || !(entrada > 0)) {
        mesh.visible = false;
        continue;
      }
      // A OCLUSÃO, a mesma para toda vaga: a sonda corre sempre que a vaga
      // PODERIA ter clarão — também tapada, senão nunca veria a estrela
      // reaparecer —, e a presença anda pela rampa de 300 ms do orçamento
      sonda.visible = true;
      // a PRIMEIRA resposta chega no desenho, depois deste passo: com o dt
      // cortado a rampa assenta antes dela. Sem o grupo (`?noclarao=1`) a
      // sonda não desenha e nunca responde — aí não há o que esperar
      if (!this.respondida[k] && this.group.visible) pendente = true;
      sonda.position.set(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]);
      const alvoDaVis = this.oculta[k] ? 0 : 1;
      const vis = (this.visibilidade[k] = stepRampToward(
        this.visibilidade[k],
        alvoDaVis,
        q.dtS,
        RAMP_DURATION_MS
      ));
      // só conta onde a rampa anda: a vaga que não desenha congela a dela
      if (vis !== alvoDaVis) pendente = true;
      if (!(vis > 0)) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      mesh.position.copy(sonda.position);
      const u = this.mats[k].uniforms;
      (u.uCor.value as THREE.Color).setRGB(
        this.cor[i * 3],
        this.cor[i * 3 + 1],
        this.cor[i * 3 + 2]
      );
      // presença = rampa do orçamento × entrada × soltura × oclusão × o
      // que atravessa os anéis: o brilho da forma é FIXO — é o desenho
      // superior que o dono apontou; a lei manda só em presença e tamanho
      const aneis = q.aneis;
      const veuDosAneis =
        aneis && aneis.length > 0
          ? transmitanciaDosAneis(aneis, q.camPos, sonda.position, radPorPx)
          : 1;
      u.uGanho.value = s.ganho * entrada * vis * veuDosAneis;
      this.ganhoDaVaga[k] = u.uGanho.value;
      this.restoDaVaga[k] = s.ganho * fronteira * soltura * vis * veuDosAneis;
      this.mDaVaga[k] = m;
      this.meiaDaVaga[k] = meiaPx;
      const t = i === 0 ? q.transmitanciaDoSol : undefined;
      (u.uTransmitancia.value as THREE.Vector3).set(t ? t[0] : 1, t ? t[1] : 1, t ? t[2] : 1);
      u.uMeiaPx.value = meiaPx;
      u.uNucleoPx.value = 0.5 * nucleoPx * pr;
      u.uScreenH.value = q.screenH;
      // a fatia do campo: o mesmo desenho, no passe do campo
      // ...cedida à lente na medida da luz que ela acendeu nesta estrela
      // (a fonte cede à luz inteira da lente; as outras, ao véu dela — a
      // mesma luz pesada por quanto a fonte está no quadro) e cresce devagar
      // com a luz da estrela (`haloDaLuz`)
      const lente = q.lente;
      const daLente = lente && this.indiceDaFonte(lente.candidata) === i ? lente.fracao : veu;
      this.cedidaALente[k] = gemeo ? fatiaDoCampo(daLente) : 0;
      const fatia = this.cedidaALente[k] * haloDaLuz(m);
      if (gemeo && fatia > 0) {
        gemeo.visible = true;
        gemeo.position.copy(mesh.position);
        const g = this.matsDoCampo[k].uniforms;
        (g.uCor.value as THREE.Color).copy(u.uCor.value as THREE.Color);
        (g.uTransmitancia.value as THREE.Vector3).copy(u.uTransmitancia.value as THREE.Vector3);
        g.uGanho.value = u.uGanho.value * fatia;
        g.uMeiaPx.value = meiaPx;
        g.uNucleoPx.value = u.uNucleoPx.value;
        // o gêmeo só desenha no rascunho do campo, que é o quadro MAIS a
        // faixa de guarda: com a altura do quadro ele saía inflado por
        // (h + 2·margem)/h (auditoria de 20/11/2026, item 2.b)
        g.uScreenH.value = q.screenH + 2 * MARGEM_DO_CAMPO * pr;
      }
    }
    this.pendente = pendente;
    this.cederAoMaisForte(q, radPorPx, cssH, sigma, pr);
  }

  /** alguma rampa (orçamento ou oclusão) ainda anda, ou um entrante
   *  espera vaga: a imagem do clarão vai mudar sem nada mais mudar */
  get mudancaPendente(): boolean {
    return this.pendente;
  }

  /**
   * A cessão da dupla (`deslocamentoDaCessao`), entre todos os clarões que
   * desenham neste quadro: a separação é o ângulo entre as duas direções
   * vistas da câmera, em px do buffer (`radPorPx`); com várias mais fortes
   * vale o MAIOR deslocamento, medido contra os números de ANTES da cessão (a
   * ordem das vagas não muda nada). A fraca deslocada é redesenhada pela
   * lei de toda estrela — tamanho (`meiaDaLei`), entrada do ganho
   * (`ganhoDeEntradaDoFlare`) e halo (`haloDaLuz`) na magnitude efetiva; o
   * núcleo (o ponto) fica o dela. Sem a pegada do pixel (`tanHalfFov`
   * ausente) não há tela onde medir: nada cede.
   */
  private cederAoMaisForte(
    q: QuadroDoClarao,
    radPorPx: number,
    cssH: number,
    sigma: number,
    pr: number
  ): void {
    if (!(radPorPx > 0)) return;
    const camPos = q.camPos;
    const n = this.slots.length;
    for (let k = 0; k < n; k++) {
      if (!(this.ganhoDaVaga[k] > 0)) continue;
      const i = this.slots[k].indice;
      const ax = this.pos[i * 3] - camPos.x;
      const ay = this.pos[i * 3 + 1] - camPos.y;
      const az = this.pos[i * 3 + 2] - camPos.z;
      let desloc = 0;
      for (let j = 0; j < n; j++) {
        if (j === k || !(this.ganhoDaVaga[j] > 0) || !(this.mDaVaga[j] < this.mDaVaga[k])) continue;
        const o = this.slots[j].indice;
        const bx = this.pos[o * 3] - camPos.x;
        const by = this.pos[o * 3 + 1] - camPos.y;
        const bz = this.pos[o * 3 + 2] - camPos.z;
        const cx = ay * bz - az * by;
        const cy = az * bx - ax * bz;
        const cz = ax * by - ay * bx;
        const angulo = Math.atan2(Math.sqrt(cx * cx + cy * cy + cz * cz), ax * bx + ay * by + az * bz);
        desloc = Math.max(
          desloc,
          deslocamentoDaCessao(
            this.mDaVaga[k],
            this.meiaDaVaga[k],
            this.mDaVaga[j],
            this.meiaDaVaga[j],
            this.ganhoDaVaga[j],
            angulo / radPorPx,
            q.screenH
          )
        );
      }
      if (!(desloc > 0)) continue;
      const m = this.mDaVaga[k] + desloc;
      const pico = picoDaPsf(m, q.expoM0, q.sigmaPx, cssH);
      const meiaPx = this.meiaDaLei(pico, sigma, cssH, m) * this.soltura[i] * pr;
      const ganho = this.restoDaVaga[k] * ganhoDeEntradaDoFlare(pico);
      const visivel = meiaPx > 0 && ganho > 0;
      this.meshes[k].visible = visivel;
      const u = this.mats[k].uniforms;
      u.uGanho.value = visivel ? ganho : 0;
      u.uMeiaPx.value = visivel ? meiaPx : 0;
      const gemeo = this.meshesDoCampo[k];
      if (gemeo?.visible) {
        const g = this.matsDoCampo[k].uniforms;
        const fatia = this.cedidaALente[k] * haloDaLuz(m);
        gemeo.visible = visivel && fatia > 0;
        g.uGanho.value = visivel ? ganho * fatia : 0;
        g.uMeiaPx.value = visivel ? meiaPx : 0;
      }
    }
  }

  // ─── A MECÂNICA DA SONDA — consulta de oclusão sem nunca bloquear ───────
  //
  // A consulta em si (piscina, nunca bloquear, o mais novo decide) é a
  // comum, `sondaDeOclusao.ts`. Ela só dispara quando a sonda desenha de
  // verdade — e a sonda desenha UMA vez por quadro, no passe principal
  // (`CenaResolvidaUmaVez`, `core/post.ts`, o único que usa a câmera e a
  // cena reais). O segundo passe de estrelas do campo (`ClaraoDoCampo`)
  // roda com uma câmera à parte restrita às camadas 1/2
  // (`CAMADA_DO_CAMPO`/`CAMADA_DOS_OCULTADORES`), e a sonda — como todo o
  // resto do clarão — mora só na camada 0 (a padrão), então não a
  // alcança. É esse único draw, com a profundidade dos corpos resolvidos
  // já escrita pela fila opaca, que a consulta mede.
  //
  // O PONTO FORA DA TELA (medido no Sol em 23/09: a 2 % acima da borda, a
  // cruz ainda entrava no quadro): a sonda cairia fora da imagem e seria
  // descartada — "tapado" sem corpo nenhum. Até onde o clarão alcança o
  // quadro (`ALCANCE_DA_SONDA_NDC`) a sonda é grampeada na borda
  // (`SONDA_VERT`) e responde por ela; além disso a pergunta não tem
  // resposta: o clarão segue não oculto, e as consultas já em voo não
  // valem mais.
  private centroNaTela(sonda: THREE.Object3D, camera: THREE.Camera): boolean {
    const v = this.vSonda.setFromMatrixPosition(sonda.matrixWorld);
    // atrás da câmera a projeção espelha o ponto para dentro do quadro
    if (v.clone().applyMatrix4(camera.matrixWorldInverse).z >= 0) return false;
    v.project(camera);
    return (
      Math.abs(v.x) <= ALCANCE_DA_SONDA_NDC && Math.abs(v.y) <= ALCANCE_DA_SONDA_NDC && !alemDoFundo(v.z, camera)
    );
  }

  /** O ÚNICO lugar que escreve `oculta` — a consulta de oclusão da vaga
   *  chama daqui de cima (com GPU de verdade); o teste de unidade chama
   *  esta mesma função por um cast controlado, sem GPU nenhuma, para
   *  provar a rampa sem depender de um `WebGLRenderer` de verdade. */
  private registrarOclusao(vaga: number, oculto: boolean): void {
    this.oculta[vaga] = oculto ? 1 : 0;
    this.respondida[vaga] = 1;
  }

  /** leitura para depuração/oráculos: quem ocupa os slots agora */
  ocupacao(): { indice: number; ganho: number }[] {
    return this.slots.filter((s) => s.indice >= 0).map((s) => ({ indice: s.indice, ganho: s.ganho }));
  }

  dispose(): void {
    this.mats.forEach((m) => m.dispose());
    this.matsDoCampo.forEach((m) => m.dispose());
    this.sondaMat.dispose();
    this.consultas.forEach((c) => c.dispose());
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
}
