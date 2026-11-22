// ============================================================
// AS ESTRELAS COM LUGAR NO QUADRO — o piloto do pilar 2 do NORTE (12/11):
// as estrelas visitáveis (`lib/atlas/estrelasVisitaveis.ts` — Proxima,
// Sirius A+B, Betelgeuse, Vega e as anfitriãs dos exoplanetas) viram corpos
// pelo MOTOR DO SOL (`world/stellarBody.ts`, um motor só: cada uma pelos
// seus números físicos) nas posições do catálogo, sob a MESMA lei do Sol
// (`solNoQuadro.ts`), linha por linha:
//  · o GATE do palco (4 px de diâmetro, histerese 2×) arma o corpo e o
//    registra no palco — o near passa a respeitar a superfície;
//  · a REPARTIÇÃO (`repartir`) decide o peso da malha (wResolvido), o
//    filtro de tela (overrideExpoente, a fração do quadro) e a cessão do
//    ponto (`cessaoDoSol`, a mesma fórmula do Sol-ponto);
//  · o ponto do CATÁLOGO cede pelo canal `aFocus` do campo (o canal
//    dormente que o item 38 deixou para "a estrela que ganha corpo").
// A ÓPTICA É A DO SOL (12/11, "a luz da estrela é uma só"): cada estrela
// montada candidata ao CLARÃO DE ASAS pela mesma lei do Sol — a magnitude e
// a cor do ponto que ela é de longe, a soltura da repartição dela —, na
// MESMA vaga que ela tem de longe como nomeada (a luz única). A LENTE DE
// CINEMA segue a fonte de maior irradiância na câmera (`fonteDaLente`): o
// Sol, ou a visitada.
//
// PREGUIÇOSO: a malha só nasce quando o Atlas foca a estrela ou a câmera
// chega a menos de `RAIO_DE_PREPARO_PC`. Sem estrela por perto nada é
// criado e nada é escrito — o quadro sai bit a bit o de antes.
// `?estrelaslugar=0` nem constrói esta peça.
// ============================================================
import * as THREE from 'three';
import type { NamedStar } from '../config';
import type { CorposResolvidos } from '../world/corpos/corpos';
import { diametroAparentePx, gateBinario, LIMIAR_DO_GATE_PX } from '../world/corpos/corpos';
import type { StarField } from '../world/stars';
import type { OclusorDeRotulo } from '../world/labels';
import { faseDoCiclo, repartir, type JanelaDoQuadro, type EstadoDaEstrela } from '../estrela';
import { EXPO_M0, M_V_SOL_DO_CAMPO, SIGMA_PX, radianciaVisivelDeCorpoNegro } from '../luzDaCasa';
import type { QualityLevel } from '../core/engine';
import { SEMENTE_DA_CASA, SOL_KNOBS, StellarBody, pesoDoFiltro, rocheDe, type StellarParams } from '../world/stellarBody';
import {
  direcaoNoCeu,
  pesoDoPico,
  regiaoDoEscurecimento,
  semConveccaoNaSuperficie,
  type EscurecimentoDoMotor,
} from '../world/forjaDaEstrela';
import { PontoDeEstrela } from '../world/pontoDeEstrela';
import { anoDoJd, faseDoDisco, gasDaEstrela } from '../world/ventoDaEstrela';
import { jdDoAno } from '../../lib/estrelasS';
import { RAIO_SOL_PC } from '../escala';
import { BETA_DA_EMISSAO } from '../shaders/starShaders';
import { bvToColor } from '../shaders/common';
import { BV_MEDIDO, SOL_BV, VAGAS_DE_VISITADAS, type CandidataVisitada } from '../world/clarao';
import { cessaoDoSol } from './solNoQuadro';
import type { PoliticaDeLuz } from '../../lib/atlas/luz';
import { estrelaComCorpo } from '../../lib/atlas/estrelaDoCatalogo';
import {
  CONTRASTE_REAL_DO_SOL,
  ESTRELAS_VISITAVEIS,
  GRANULO_SOL_EM_RAIOS,
  achatamentoDe,
  atividadeDe,
  granuloNaTelaEmRaios,
  logGravidade,
  luminosidadeDe,
  celulaQuenteDe,
  manchasDe,
  SOL,
  posicaoDaCompanheira,
  raioDaEstrelaPc,
  rotacaoDe,
  superficiePelaTemperatura,
  temDinamoSolar,
  type CelulaQuenteMedida,
  type EstrelaVisitavel,
} from '../../lib/atlas/estrelasVisitaveis';

/** A distância (pc) a que a malha nasce sem foco — bem antes do gate. */
export const RAIO_DE_PREPARO_PC = 0.5;

/** A porta `?estrelaslugar=`: só `0` desliga (o padrão é o piloto ligado). */
export function lerPortaEstrelasComLugar(bruto: string | null): boolean {
  return bruto !== '0';
}

const GRAU = Math.PI / 180;

/**
 * O EIXO DE ROTAÇÃO na base da cena, pela inclinação do achatamento
 * (`achatamentoDe`). Vega: 6,2° da linha até o Sol (medido — vemos quase o
 * polo, como da Terra); só v·sen i (β Pic): 90°, o eixo de lado. O ÂNGULO
 * DE POSIÇÃO da inclinação é ARTÍSTICO (para o norte celeste). Sem
 * inclinação conhecida (o giro de um período, ou redonda): o polo celeste
 * norte, escolha artística declarada — que o motor só usa com inclinação
 * (`parametrosDoMotor`); sem ela o eixo é o +Y do motor, como sempre foi.
 */
export function eixoDeRotacao(e: EstrelaVisitavel, pos: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  const inclinacao = achatamentoDe(e)?.inclinacaoGraus;
  if (!inclinacao) return out.set(0, 0, 1);
  const r = pos.clone().normalize();
  const norte = new THREE.Vector3(0, 0, 1).addScaledVector(r, -r.z).normalize();
  const i = inclinacao.v * GRAU;
  return out.copy(r).multiplyScalar(-Math.cos(i)).addScaledVector(norte, Math.sin(i)).normalize();
}

/**
 * O EXPOENTE DO BRILHO ASSISTIDO — ARTÍSTICO, declarado. A estrela
 * visitada aparece no nível de tela do Sol escalado por (radiância
 * visível / a do Sol)^¼: Proxima ~0,37×, Betelgeuse ~0,51×. A ordem
 * física fica e a M não sai lama. É a "exposição de foto" da visita que
 * os planetas já têm (`lib/atlas/luzDaVisita.ts`), aplicada à fotosfera.
 *
 * Ele vale para quem o FILTRO fotográfico do Sol vale (`pesoDoFiltro`:
 * inteiro até 5.772 K) e passa, junto com o filtro, a ⅖ aos 8.000 K
 * (`EXPOENTE_SEM_O_FILTRO`): com ¼ o disco das A saía cinza. Daí para cima,
 * onde a convecção de superfície some, entra a regra das quentes
 * (`NIVEL_DO_PICO_DAS_QUENTES`).
 */
export const EXPOENTE_DO_BRILHO_ASSISTIDO = 0.25;
/** o expoente de quem já não tem o filtro do Sol mas ainda tem a rede de
 *  convecção para mostrar (Altair, Fomalhaut) — ARTÍSTICO, ver acima */
export const EXPOENTE_SEM_O_FILTRO = 0.4;

/**
 * O NÍVEL DO PICO DAS QUENTES — a exposição do INSTRUMENTO, um número só
 * para toda estrela quente: o ponto mais quente do disco visto de frente (o
 * polo de quem gira, o centro de uma redonda) aparece com esta luminância,
 * na unidade da casa (a superfície do Sol = 1).
 *
 * POR QUÊ (17/11): a curva de tom da tela (Neutral) é reta até ~0,5 no
 * canal mais forte e chapada acima de ~2. Com o expoente ⅖ de antes o azul
 * do polo de Régulo caía em ~6: polo e equador, 1,9× um do outro na conta,
 * saíam a 1 % um do outro na tela — a placa azul. Com o pico em 1,6 o azul
 * do polo fica em ~2,7 e o do equador em ~1,4, onde a curva ainda distingue
 * (14 % na tela). A BASE: é como o instrumento mostra essas estrelas, a
 * intensidade normalizada pelo pico (as imagens do CHARA/MIRC e do
 * VLTI/PIONIER: Monnier et al. 2007, Che et al. 2011, Dalla Vedova et al.
 * 2017, "We normalized the dynamic range to 1"), e é o que um filtro neutro
 * faz numa câmera medida pelo ponto mais claro. O VALOR é escolha, por
 * imagem — ARTÍSTICO, declarado: mais alto e a estrela ofusca mas vira
 * placa (acima de ~1,8 a rede de convecção de Fomalhaut lava); mais baixo e
 * o contraste abre mas o disco acinzenta.
 *
 * ONDE ENTRA: junto com a saída da convecção de superfície, de 8.000 K a
 * `TEFF_SEM_CONVECCAO_K` (~9.320 K, `pesoDoPico`). Quem tem a rede de
 * convecção para mostrar fica na exposição de sempre, que já a mostrava
 * (Altair pelo pico escurecia de 196 para 170 na tela sem ganhar contraste);
 * a lisa, que só tem a borda e o gradiente para ler, vai pelo pico.
 *
 * A luz que a exposição NÃO põe no disco vira o VÉU em volta dele (`veuDe`,
 * 1 − ganho): o ofuscamento fica, fora do disco, como numa câmera — uma
 * fração da borda do disco como a tela a mostra, nunca mais clara que ela
 * (o véu no nível de antes, ensaiado em 17/11, emendava com a borda e a
 * estrela lisa parecia fora de foco).
 */
export const NIVEL_DO_PICO_DAS_QUENTES = 1.6;

/**
 * O ganho que leva a radiância verdadeira de uma fotosfera ao nível da
 * visita: 1 no modo REAL; no ASSISTIDO, rad^(e − 1), com e = ¼ passando a ⅖
 * junto com o filtro do Sol e, nas quentes, o que põe o pico do disco em
 * `NIVEL_DO_PICO_DAS_QUENTES` — misturados em stops por `pesoDoPico`.
 * `teffDoPicoK` é a temperatura do ponto mais quente (o polo de uma
 * achatada); sem ela, a média. Propriedade do CORPO, não do foco da câmera.
 * Quem o aplica é a rampa do filtro (`ganho^(1 − g)`): com o disco pequeno
 * (g = 1) a emissão é a verdadeira e a troca com o ponto conserva a luz.
 */
export function ganhoDaVisita(teffK: number, politica: PoliticaDeLuz, teffDoPicoK: number = teffK): number {
  if (politica === 'real') return 1;
  const deSempre = ganhoDeSempre(teffK);
  const q = pesoDoPico(teffK);
  if (q <= 0) return deSempre;
  const peloPico = NIVEL_DO_PICO_DAS_QUENTES / radianciaVisivelDeCorpoNegro(teffDoPicoK);
  return Math.pow(deSempre, 1 - q) * Math.pow(peloPico, q);
}

/** o ganho ASSISTIDO sem a regra do pico: rad^(e − 1), e de ¼ a ⅖ com o filtro do Sol */
function ganhoDeSempre(teffK: number): number {
  const w = pesoDoFiltro(teffK);
  const e = w * EXPOENTE_DO_BRILHO_ASSISTIDO + (1 - w) * EXPOENTE_SEM_O_FILTRO;
  return Math.pow(radianciaVisivelDeCorpoNegro(teffK), e - 1);
}

/**
 * Os STOPS que a regra do pico tirou do disco: ln(ganho de sempre / ganho da
 * visita). 0 sem peso do pico. O motor os devolve em volta do disco, na asa
 * do véu (`VEU_POR_STOP` em `stellarBody.ts`).
 */
export function stopsDoPico(teffK: number, teffDoPicoK: number = teffK): number {
  if (pesoDoPico(teffK) <= 0) return 0;
  return Math.log(ganhoDeSempre(teffK) / ganhoDaVisita(teffK, 'assistida', teffDoPicoK));
}

/** Os campos da regra do pico em `StellarParams`: só com peso do pico > 0. */
function camposDoPico(teffK: number, teffDoPicoK: number): Pick<StellarParams, 'pesoDoPico' | 'stopsDoPico'> {
  const q = pesoDoPico(teffK);
  return q > 0 ? { pesoDoPico: q, stopsDoPico: stopsDoPico(teffK, teffDoPicoK) } : {};
}

/** A distância (pc) além da qual a estrela do motor do Sol, fora de foco, é
 *  desmontada (2× o preparo: histerese, para não remontar na borda). */
const RAIO_DE_DESMONTE_PC = 2 * RAIO_DE_PREPARO_PC;

/**
 * Os parâmetros do motor do Sol PELA FÍSICA de uma estrela visitável. Cada
 * campo é a lei dos dados; o que não tem lei é o do Sol, declarado:
 *  · raio físico (o EQUATORIAL, o de enquadramento); o período pela lei
 *    única `rotacaoDe` (medido, ou o Rossby do Sol); Teff (cor e brilho,
 *    `stellarBody.ts`);
 *  · o dínamo de tipo solar (`temDinamoSolar`: envelope convectivo e aquém
 *    da linha de Linsky & Haisch): sem ele o motor nem constrói a atmosfera
 *    magnética;
 *  · grânulo na tela relativo ao do Sol (`granuloNaTelaEmRaios`, Hp ∝ T·R/M);
 *  · contraste da textura quieta relativo ao do Sol (`contrasteGranulos`
 *    sobre o rms real do Sol, 0,15); com células gigantes, o contraste dos
 *    dados é o DELAS, e os grânulos levam só a fração declarada;
 *  · sem convecção na superfície (`semConveccaoNaSuperficie`, acima de
 *    ~9.300 K) a textura é nenhuma: a quente é lisa;
 *  · células gigantes e borda difusa quando os dados as têm (Betelgeuse);
 *  · a mancha quente medida pelo nome (`celulaQuenteDe`), que vence a regra
 *    no pico das células quentes das supergigantes;
 *  · o VÉU, a luz que a exposição da visita não põe no disco (1 − ganho,
 *    > 0 só para quem é mais radiante que o Sol);
 *  · borda pelo u linear de Claret (`bordaU`);
 *  · atividade pelo número de Rossby (`atividadeDe`, Wright 2011): ela move
 *    manchas, ciclo, a frequência das erupções e a contagem de laços;
 *  · rotadora rápida: forma achatada + escurecimento gravitacional pela
 *    regra única (`achatamentoDe`: o modelo medido de Vega, ou o giro dos
 *    dados), com o eixo na base da cena (`eixo`, `eixoDeRotacao`); o raio
 *    do motor é então o EQUATORIAL;
 *  · eixo das outras: o +Y do motor sem inclinação (ARTÍSTICO — nenhuma tem
 *    eixo medido);
 *  · semente: a do Sol ⊕ HIP (outra superfície, mesma receita);
 *  · knobs de URL com o prefixo do id (`?proximaspots=`).
 */
/**
 * A semente da estrela: o HIP quando há; para quem está fora do Hipparcos
 * (TRAPPIST-1, Kepler-186), um hash do id — estável entre sessões.
 */
function sementeDe(e: EstrelaVisitavel): number {
  if (e.semente !== undefined) return e.semente;
  if (e.hip !== undefined) return e.hip;
  let h = 2166136261;
  for (let i = 0; i < e.id.length; i++) h = Math.imul(h ^ e.id.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function parametrosDoMotor(e: EstrelaVisitavel, eixo?: THREE.Vector3, pos?: THREE.Vector3): StellarParams {
  const s = e.superficie;
  const achatamento = achatamentoDe(e);
  const logG = logGravidade(e.massaMsol.v, e.raioRsol.v);
  const contrasteDosGranulos = semConveccaoNaSuperficie(e.teffK.v, logG) ? 0 : s.contrasteGranulos.v;
  const teffDoPicoK = achatamento ? rocheDe(0, achatamento).teffK : e.teffK.v;
  const veu = veuDe(e.teffK.v, teffDoPicoK);
  // o gás das quentes (o vento medido pelo nome, ou a receita; o disco da ficha; os braços só com giro medido)
  const gas = gasDaEstrela(e);
  // a mancha quente medida (Betelgeuse, Antares) vence a regra no pico das células quentes
  const mancha = celulaQuenteDe(e);
  return {
    nome: e.id,
    // o EQUATORIAL (`raioDaEstrelaPc`): o mesmo do piso da câmera
    radiusPc: raioDaEstrelaPc(e),
    rotPeriodDays: rotacaoDe(e).v,
    tiltRad: e.inclinacaoDoEixoRad?.v ?? 0,
    activityLevel: atividadeDe(e).nivel,
    teffK: e.teffK.v,
    dinamo: temDinamoSolar(e),
    logG,
    seed: (SEMENTE_DA_CASA ^ sementeDe(e)) >>> 0,
    knobPrefix: e.id,
    knobs: SOL_KNOBS,
    granuloRelativoAoSol:
      granuloNaTelaEmRaios(s.granuloEmRaios.v) / granuloNaTelaEmRaios(GRANULO_SOL_EM_RAIOS),
    contrasteRelativoAoSol: contrasteDosGranulos / CONTRASTE_REAL_DO_SOL,
    bordaU: s.bordaU.v,
    // a temperatura das manchas (miolo e penumbra), a medida ou a do Sol
    manchas: { miolo: manchasDe(e).miolo.v, penumbra: manchasDe(e).penumbra.v },
    ...(veu > 0 ? { veu } : {}),
    // a regra do pico (a ponta, a asa e o tom do véu no motor): só nas quentes
    ...camposDoPico(e.teffK.v, teffDoPicoK),
    ...(achatamento ? { achatamento } : {}),
    // sem inclinação (o giro de um período) o eixo segue o +Y do motor: a
    // estrela achata em volta do eixo em que já girava
    ...(achatamento?.inclinacaoGraus && eixo ? { eixoNaCena: [eixo.x, eixo.y, eixo.z] as const } : {}),
    ...(gas ? { gas } : {}),
    ...(mancha.medida ? { celulaQuente: { razao: mancha.razao.v, lambdaUm: mancha.lambdaUm.v } } : {}),
    ...(mancha.lugar && pos ? { lugarDaCelulaQuente: lugarNoCeu(mancha.lugar, pos) } : {}),
    ...(e.escurecimento ? { escurecimento: escurecimentoDoMotor(e.escurecimento) } : {}),
  };
}

/**
 * O LUGAR DE UMA CÉLULA QUENTE no céu da cena: o ponto da superfície que,
 * visto da Terra (a linha de visada é a posição a partir do Sol), cai a
 * `distanciaEmRaios` do centro do disco no ângulo de posição dado — no
 * hemisfério de frente —, como direção unitária a partir do centro da
 * estrela; a linha de visada (da estrela para o Sol); e a data (JD).
 */
export function lugarNoCeu(
  l: NonNullable<CelulaQuenteMedida['lugar']>,
  pos: THREE.Vector3
): { direcao: [number, number, number]; linhaDeVisada: [number, number, number]; jd: number } {
  const p = [pos.x, pos.y, pos.z] as const;
  const norte = direcaoNoCeu(p, 0);
  const leste = direcaoNoCeu(p, 90);
  const r = Math.min(1, Math.max(0, l.distanciaEmRaios.v));
  const a = (l.anguloGraus.v * Math.PI) / 180;
  const n = Math.hypot(...p) || 1;
  const frente = Math.sqrt(1 - r * r);
  const d = [0, 1, 2].map((k) => r * (Math.cos(a) * norte[k] + Math.sin(a) * leste[k]) - (frente * p[k]) / n);
  return {
    direcao: [d[0], d[1], d[2]],
    linhaDeVisada: [-p[0] / n, -p[1] / n, -p[2] / n],
    jd: Date.parse(l.data) / 86400000 + 2440587.5,
  };
}

/**
 * O SOL pela MESMA lei de toda estrela, sobre o registro dele (`SOL`): o
 * motor não tem mais um ramo de parâmetros só do Sol. Na origem da cena.
 */
export const SOL_PARAMS: StellarParams = parametrosDoMotor(SOL);

/**
 * as épocas do escurecimento da ficha em números de desenho: o ano pela data
 * UT, a borda das imagens, o véu e o lado escuro. A PARCELA FRIA do modelo
 * fica fora do desenho (razão 1; decisão da coordenadora, 17/11): pela rampa
 * do instrumento ela achatava as células; o escuro é o do véu
 */
export function escurecimentoDoMotor(x: NonNullable<EstrelaVisitavel['escurecimento']>): EscurecimentoDoMotor {
  return {
    epocas: x.epocas.map((p) => ({
      ano: anoDoJd(Date.parse(p.data) / 86400000 + 2440587.5),
      borda: p.bordaNaImagemEmRaios.v,
      razaoT: 1,
      transmissao: p.transmissaoDoVeu.v,
      anguloGraus: p.anguloGraus.v,
    })),
  };
}

/**
 * A COMPANHEIRA (Sirius B) como SEGUNDA INSTÂNCIA do mesmo motor — um
 * binário são duas instâncias, nada de binário dentro do motor. Anã branca:
 * raio e Teff medidos, sem envelope convectivo (sem dínamo, sem grânulo
 * visível — Hp de metros), u = 0,3 (a escolha declarada do piloto, que é o
 * mesmo 0,30 do Sol), contraste 0. Sem eixo medido.
 */
export function parametrosDaCompanheira(e: EstrelaVisitavel): StellarParams | null {
  const c = e.companheira;
  if (!c) return null;
  const nome = `${e.id}-b`;
  const seed = (SEMENTE_DA_CASA ^ sementeDe(e) ^ 0x0b0b0b0b) >>> 0;
  // A COMPANHEIRA QUE NÃO É ANÃ BRANCA (Capella Ab, 16/11) é uma estrela
  // como qualquer outra: a MESMA lei da principal (`parametrosDoMotor`),
  // sobre a ficha que os números medidos dela dão — o achatamento também
  // (`achatamentoDe`: Capella Ab gira em 8,5 d). Sem eixo medido.
  if (!c.tipo.startsWith('D')) {
    const ficha: EstrelaVisitavel = {
      id: nome,
      nomeNoCatalogo: c.nome,
      tipo: { texto: c.tipo, v: 0, p: 'medido', fonte: c.orbita.fonte },
      teffK: c.teffK,
      raioRsol: c.raioRsol,
      massaMsol: c.massaMsol,
      luminosidadeLsol: {
        v: luminosidadeDe(c.raioRsol.v, c.teffK.v),
        p: 'derivado',
        fonte: 'Stefan-Boltzmann',
      },
      ...(c.rotacaoDias ? { rotacaoDias: c.rotacaoDias } : {}),
      ...(c.vSenIKms ? { vSenIKms: c.vSenIKms } : {}),
      superficie: superficiePelaTemperatura(c.teffK.v, c.raioRsol.v, c.massaMsol.v),
    };
    return {
      ...parametrosDoMotor(ficha),
      seed,
      knobPrefix: `${e.id}b`,
      foraDaOrigem: true,
    };
  }
  return {
    knobs: SOL_KNOBS,
    nome,
    radiusPc: c.raioRsol.v * RAIO_SOL_PC,
    rotPeriodDays: SOL_PARAMS.rotPeriodDays,
    tiltRad: 0,
    activityLevel: 0,
    teffK: c.teffK.v,
    dinamo: false,
    seed,
    knobPrefix: `${e.id}b`,
    contrasteRelativoAoSol: 0,
    bordaU: 0.3,
    // sem dínamo não há manchas: a temperatura delas é a do Sol, sem uso
    manchas: SOL_PARAMS.manchas,
    foraDaOrigem: true,
    // o véu pela MESMA lei da principal (a anã branca é a mais radiante)
    ...(veuDe(c.teffK.v) > 0 ? { veu: veuDe(c.teffK.v) } : {}),
    // a regra do pico pela MESMA lei da principal
    ...camposDoPico(c.teffK.v, c.teffK.v),
  };
}

/** O VÉU de uma fotosfera: a fração da radiância que a exposição da visita
 *  não põe no disco (1 − ganho; 0 no Sol e nas mais frias). */
export function veuDe(teffK: number, teffDoPicoK: number = teffK): number {
  return Math.max(0, 1 - ganhoDaVisita(teffK, 'assistida', teffDoPicoK));
}

/** O que o motor do Sol precisa para nascer (o director empresta). */
export interface MeiosDoMotor {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  quality: QualityLevel;
}

/** Uma estrela visitável desenhada pelo MOTOR DO SOL (`StellarBody`). */
export class EstrelaPeloMotorDoSol {
  readonly corpo: StellarBody;
  readonly group: THREE.Group;
  readonly raioPc: number;
  /** a Teff média e a do ponto mais quente (o polo de uma achatada) */
  readonly fotosfera: { readonly teffK: number; readonly teffDoPicoK: number };
  /** o custo da construção (prime: sim + bake + coroa), ms */
  readonly msDeConstrucao: number;
  /** o tier com que nasceu — trocar de tier REMONTA (`EstrelasNoQuadro`) */
  readonly quality: QualityLevel;
  private readonly meios: MeiosDoMotor;
  private readonly epocasDoDisco: readonly (readonly [number, number])[] | null;
  private readonly escurecimento: EscurecimentoDoMotor | null;
  constructor(params: StellarParams, meios: MeiosDoMotor, jd: number) {
    this.meios = meios;
    this.epocasDoDisco = params.gas?.disco?.epocas ?? null;
    this.escurecimento = params.escurecimento ?? null;
    this.quality = meios.quality;
    const t0 = performance.now();
    this.corpo = new StellarBody(params, meios.renderer, meios.camera, meios.quality, faseDoCiclo(jd), jd);
    this.msDeConstrucao = performance.now() - t0;
    this.group = this.corpo.group;
    this.raioPc = params.radiusPc;
    this.fotosfera = {
      teffK: params.teffK,
      teffDoPicoK: params.achatamento ? rocheDe(0, params.achatamento).teffK : params.teffK,
    };
  }

  /** o passo do quadro: a lei da repartição entra pelos mesmos fios do Sol */
  escrever(q: {
    posPc: THREE.Vector3;
    g: number;
    alturaCss: number;
    exposicao: number;
    /** a exposição com o disco enchendo o quadro (g = 0): o nível da casca */
    exposicaoPlena: number;
    peso: number;
    jd: number;
    tempoS: number;
  }) {
    this.group.position.copy(q.posPc);
    if (this.group.visible) {
      this.corpo.escreverFiltroSolar(q.g, q.alturaCss);
      const rad = radianciaVisivelDeCorpoNegro(this.fotosfera.teffK);
      this.corpo.escreverBrilho(rad * q.exposicao, rad * q.exposicaoPlena);
      this.corpo.escreverPesoDaLei(q.peso);
    }
    // a fase do ciclo é a do CALENDÁRIO DO SOL (a lei `faseDoCiclo`):
    // Proxima tem ciclo próprio de ~7 anos (Wargelin et al. 2017) que o
    // motor ainda não conhece — declarado
    this.corpo.escreverCiclo(faseDoCiclo(q.jd));
    // a fase do disco de gás (Achernar) é a da DATA, pela lista medida
    if (this.epocasDoDisco) this.corpo.escreverDisco(faseDoDisco(this.epocasDoDisco, anoDoJd(q.jd)));
    // a região fria de um escurecimento (Betelgeuse, 2019–20) é a da DATA:
    // cada época é um retrato do céu de quem olha da Terra (a linha de
    // visada é a posição a partir do Sol), levado ao referencial da estrela
    // pelo giro daquela data; entre as épocas ela gira com a estrela. Não
    // depende da câmera
    const x = this.escurecimento;
    if (x) {
      const pos = [q.posPc.x, q.posPc.y, q.posPc.z] as const;
      const regiao = regiaoDoEscurecimento(x, anoDoJd(q.jd), (anguloGraus, ano) =>
        this.corpo.naEstrela(direcaoNoCeu(pos, anguloGraus), jdDoAno(ano))
      );
      this.corpo.escreverRegiao(regiao, q.jd);
    }
    this.corpo.update(q.tempoS, this.meios.camera);
  }

  dispose() {
    this.group.removeFromParent();
    this.corpo.dispose();
  }
}

interface Superficie {
  corpo: EstrelaPeloMotorDoSol;
  armado: boolean;
  estado: EstadoDaEstrela;
  /** a candidatura ao clarão (reusada por quadro; a vaga é fixa) */
  clarao: CandidataVisitada & { raioPc: number };
}

/** m − 5·log10(d) do Sol no ponto-zero do campo (o candidato 0 do clarão) */
const M_BASE_DO_SOL = M_V_SOL_DO_CAMPO - 5;

/**
 * A FONTE DA LENTE quando não é o Sol: onde está, o raio, o fator que leva
 * a distância verdadeira à distância do Sol de MESMA irradiância
 * (10^(0,2·(mBase − mBase☉)), a lei do ponto) e a cor relativa à do Sol,
 * com a luminância normalizada (a força vem da irradiância, não da cor).
 */
export interface FonteDaLente {
  pos: THREE.Vector3;
  raioPc: number;
  fatorDeDistancia: number;
  tinta: [number, number, number];
  /** a candidata ao clarão que é a fonte (o halo do campo dela cede à lente) */
  candidata: CandidataVisitada | null;
}

const LUM = [0.2126, 0.7152, 0.0722] as const;
const COR_DO_SOL = bvToColor(SOL_BV);

/** a cor de uma fonte relativa à do Sol, luminância 1 (no Sol, 1 exato) */
export function tintaRelativaAoSol(cor: readonly number[], out: [number, number, number]) {
  const l = LUM[0] * cor[0] + LUM[1] * cor[1] + LUM[2] * cor[2];
  const ls = LUM[0] * COR_DO_SOL[0] + LUM[1] * COR_DO_SOL[1] + LUM[2] * COR_DO_SOL[2];
  for (let k = 0; k < 3; k++) out[k] = l > 0 && COR_DO_SOL[k] > 0 ? cor[k] / l / (COR_DO_SOL[k] / ls) : 1;
  return out;
}

interface Piloto {
  dados: EstrelaVisitavel;
  pos: THREE.Vector3;
  eixo: THREE.Vector3;
  /** índice no catálogo (`stars.bin`); −1 = não achado */
  indice: number;
  /** m − 5·log10(d) do NOME (o sidecar): a conferência do casamento com o catálogo */
  mBaseDoNome: number;
  /** o índice na lista de nomeadas (a identidade dela no clarão) */
  nomeada: number;
  /** o mesmo para a companheira (−1 = sem nomeada própria) */
  nomeadaDaCompanheira: number;
  principal: Superficie | null;
  /**
   * O PONTO DE QUEM NÃO ESTÁ NO BINÁRIO (as anfitriãs de exoplanetas
   * fracas demais para `stars.bin`, como TRAPPIST-1): sem ponto do
   * catálogo para ceder, a estrela ganha o seu, pela lei da Sirius B.
   * Quem está no binário fica com `null`.
   */
  pontoProprio: PontoDeEstrela | null;
  companheira: (Superficie & { ponto: PontoDeEstrela; pos: THREE.Vector3 }) | null;
  /** a última cessão escrita no campo (evita escrita por quadro) */
  cedeu: number;
  /** a vaga do clarão da principal (a companheira, a seguinte) — fixa */
  vaga: number;
  /** nasceu pelo foco (uma nomeada fora da lista à mão): sai da lista
   *  quando perde o foco e o corpo dela já foi desmontado */
  sobDemanda: boolean;
}

/**
 * A VAGA DE QUEM NASCE PELO FOCO: a última do cadastro do clarão (a sob
 * demanda não tem companheira, uma vaga basta). As da lista à mão ficam com
 * 2 × índice, como sempre, e a companheira com corpo com a seguinte: 19
 * estrelas, vagas 0–36 — a de Achernar, a 19ª, é a 36, e a 37 seria a da
 * companheira dela, que não tem corpo. A 20ª escrita à mão fica com a 38 e
 * cabe se NÃO tiver companheira com corpo; com ela, a companheira cairia na
 * 39, que é esta vaga sob demanda, e as duas se atropelariam no clarão. A
 * 21ª não cabe de jeito nenhum. Nos dois casos `VAGAS_DE_VISITADAS` tem de
 * crescer, e o teste do cadastro acusa antes. Toda
 * estrela sob demanda é NOMEADA, e o clarão escreve a nomeada na vaga da
 * nomeada (não nesta) — esta só precisa caber e não repetir a de outra.
 */
const VAGA_SOB_DEMANDA = VAGAS_DE_VISITADAS - 1;

function novoPiloto(
  named: readonly NamedStar[],
  dados: EstrelaVisitavel,
  vaga: number,
  sobDemanda: boolean
): Piloto | null {
  const nomeada = named.findIndex((n) => n.n === dados.nomeNoCatalogo);
  if (nomeada < 0) return null;
  const s = named[nomeada];
  const pos = new THREE.Vector3(s.x, s.y, s.z);
  return {
    dados,
    pos,
    eixo: eixoDeRotacao(dados, pos, new THREE.Vector3()),
    indice: -1,
    mBaseDoNome: s.d > 0 ? s.m - 5 * Math.log10(s.d) : NaN,
    nomeada,
    nomeadaDaCompanheira: named.findIndex((n) => n.n === dados.companheira?.nome),
    principal: null,
    pontoProprio: null,
    companheira: null,
    cedeu: 0,
    vaga,
    sobDemanda,
  };
}

function estadoDe(id: string, raioPc: number, teffK: number, pos: THREE.Vector3): EstadoDaEstrela {
  return {
    id,
    semente: 0,
    posicaoPc: [pos.x, pos.y, pos.z],
    raioPc,
    teffK,
    tempo: 0,
    fase: 0,
    rotacao: { periodo: 0, eixo: [0, 0, 1] },
    atividade: { nivel: 0 },
  };
}

const _dir = new THREE.Vector3();

/**
 * A estrela do catálogo (`stars.bin`) na posição de um nome: a lei de
 * `EstrelasNoQuadro.indiceNoCatalogo`, pura — a mesma que os pinos dos
 * filmes conferem (o corpo é desenhado no ponto, não no nome). `xyz` e
 * `logLum` são os atributos do campo; −1 = sem casamento.
 */
export function indiceNoCatalogo(
  xyz: ArrayLike<number>,
  logLum: ArrayLike<number>,
  pos: { x: number; y: number; z: number },
  mBaseDoNome: number
): number {
  const raio = Math.max(0.01, 1e-3 * Math.hypot(pos.x, pos.y, pos.z));
  let melhor = -1;
  let dMin = raio * raio;
  for (let i = 0; i < xyz.length; i += 3) {
    const dx = xyz[i] - pos.x;
    const dy = xyz[i + 1] - pos.y;
    const dz = xyz[i + 2] - pos.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < dMin) {
      const mBase = -0.15 - 2.5 * logLum[i / 3];
      if (Number.isFinite(mBaseDoNome) && !(Math.abs(mBase - mBaseDoNome) < 0.5)) continue;
      dMin = d2;
      melhor = i / 3;
    }
  }
  return melhor;
}

export class EstrelasNoQuadro {
  readonly group = new THREE.Group();
  private readonly pilotos: Piloto[] = [];
  private readonly poolDeOclusores: OclusorDeRotulo[] = [];
  private readonly listaDeOclusores: OclusorDeRotulo[] = [];
  private lugaresResolvidos = false;
  private readonly named: readonly NamedStar[];
  /** o último foco que não deu piloto (sem ficha pela regra): não refaz a busca */
  private focoSemPiloto: string | null = null;
  private readonly fios: {
    stars: () => StarField | undefined;
    palco: () => CorposResolvidos;
    escondido: (flag: string) => boolean;
    janelaDoQuadro: JanelaDoQuadro | 'hoje';
    /** brilho assistido × real (o selo do HUD) — a exposição da visita */
    politicaDeLuz: () => PoliticaDeLuz;
    /** os meios do motor do Sol (renderer, câmera e o tier vivo) */
    motorDoSol: () => MeiosDoMotor;
  };
  /** as candidatas ao clarão deste quadro (`atualizar` escreve) */
  private readonly candidatas: (CandidataVisitada & { raioPc: number })[] = [];
  private readonly fonte: FonteDaLente = {
    pos: new THREE.Vector3(),
    raioPc: 0,
    fatorDeDistancia: 1,
    tinta: [1, 1, 1],
    candidata: null,
  };

  constructor(named: readonly NamedStar[], fios: EstrelasNoQuadro['fios']) {
    this.fios = fios;
    this.named = named;
    for (const dados of ESTRELAS_VISITAVEIS) {
      const p = novoPiloto(named, dados, 2 * this.pilotos.length, false);
      if (p) this.pilotos.push(p);
    }
  }

  /**
   * A NOMEADA EM FOCO QUE NÃO ESTÁ NA LISTA À MÃO: ganha piloto pela ficha
   * da regra única (`estrelaComCorpo`), com o lugar resolvido no ponto do
   * catálogo como os outros. Sem ficha confiável, segue ponto.
   */
  private pilotoPeloFoco(nome: string | null) {
    if (!nome || nome === this.focoSemPiloto) return;
    if (this.pilotos.some((p) => p.dados.nomeNoCatalogo === nome)) return;
    const dados = estrelaComCorpo(nome, this.named);
    const p = dados ? novoPiloto(this.named, dados, VAGA_SOB_DEMANDA, true) : null;
    if (!p) {
      this.focoSemPiloto = nome;
      return;
    }
    this.focoSemPiloto = null;
    this.resolverLugar(p);
    this.pilotos.push(p);
  }

  /**
   * OS DISCOS QUE ESCONDEM NOME (a lei do Sol e dos planetas em
   * `director/rotulos.ts`): cada corpo VISÍVEL deste quadro, com a chave
   * do próprio rótulo para não esconder o próprio nome. A lista e os
   * objetos são reusados — nenhum quadro aloca.
   */
  oclusores(): readonly OclusorDeRotulo[] {
    let n = 0;
    for (const p of this.pilotos) {
      for (const s of [p.principal, p.companheira]) {
        if (!s || !s.corpo.group.visible) continue;
        let o = this.poolDeOclusores[n];
        if (!o) {
          o = { x: 0, y: 0, z: 0, raio: 0 };
          this.poolDeOclusores[n] = o;
        }
        const pos = s.corpo.group.position;
        o.x = pos.x;
        o.y = pos.y;
        o.z = pos.z;
        o.raio = s.corpo.raioPc;
        o.chave = s === p.principal ? p.dados.nomeNoCatalogo : undefined;
        n++;
      }
    }
    this.listaDeOclusores.length = 0;
    for (let i = 0; i < n; i++) this.listaDeOclusores.push(this.poolDeOclusores[i]);
    return this.listaDeOclusores;
  }

  /**
   * A posição de catálogo de um piloto pelo nome (para a escada). Com
   * `preparar`, a estrela que só tem corpo SOB DEMANDA ganha o piloto já
   * aqui: a escada pergunta o lugar ANTES do primeiro quadro em foco, e
   * sem isto a câmera estacionava no lugar do NOME (arredondado a 1e-4 pc)
   * — em Arcturus, a 517 raios do corpo, que nasce no ponto do catálogo.
   */
  posicaoDe(nomeNoCatalogo: string, preparar = false): THREE.Vector3 | null {
    if (this.resolverLugares() && preparar) this.pilotoPeloFoco(nomeNoCatalogo);
    return this.pilotos.find((p) => p.dados.nomeNoCatalogo === nomeNoCatalogo)?.pos ?? null;
  }

  private criar(p: Piloto, jd: number) {
    const meios = this.fios.motorDoSol();
    const d = p.dados;
    const corpo = new EstrelaPeloMotorDoSol({ ...parametrosDoMotor(d, p.eixo, p.pos), foraDaOrigem: true }, meios, jd);
    corpo.group.position.copy(p.pos);
    this.group.add(corpo.group);
    const stars = this.fios.stars();
    const vaga = p.vaga;
    // o clarão de longe é a óptica do PONTO: a magnitude e a cor dele
    let mBase = Infinity;
    let cor: readonly [number, number, number] = [1, 1, 1];
    if (p.indice < 0) {
      p.pontoProprio = new PontoDeEstrela(
        { teffK: d.teffK.v, raioRsol: d.raioRsol.v },
        stars?.expoM0 ?? EXPO_M0,
        stars?.sigmaPx ?? SIGMA_PX
      );
      this.group.add(p.pontoProprio.points);
      mBase = p.pontoProprio.mBase;
      cor = p.pontoProprio.cor;
    } else if (stars) {
      // a lei do vertex do catálogo: m = −0,15 − 2,5·logLum + 5·log10(d)
      const geo = stars.points.geometry;
      mBase = -0.15 - 2.5 * (geo.getAttribute('aLogLum') as THREE.BufferAttribute).getX(p.indice);
      // o B−V MEDIDO onde há (a mesma tabela do clarão): uma estrela, uma cor
      // — Betelgeuse é 1,85 medida e 1,50 no catálogo
      cor = bvToColor(BV_MEDIDO[d.nomeNoCatalogo] ?? (geo.getAttribute('aCi') as THREE.BufferAttribute).getX(p.indice));
    }
    p.principal = {
      corpo,
      armado: false,
      estado: estadoDe(d.id, corpo.raioPc, d.teffK.v, p.pos),
      clarao: {
        vaga,
        pos: p.pos,
        mBase,
        cor,
        soltura: 1,
        nomeada: p.nomeada,
        raioPc: corpo.raioPc,
      },
    };
    const pb = parametrosDaCompanheira(d);
    if (pb && d.companheira) {
      // a companheira pelo MESMO motor (segunda instância); o ponto de luz
      // fica — de longe ela é sub-pixel
      const cb = new EstrelaPeloMotorDoSol(pb, meios, jd);
      const ponto = new PontoDeEstrela(
        { teffK: d.companheira.teffK.v, raioRsol: d.companheira.raioRsol.v },
        stars?.expoM0 ?? EXPO_M0,
        stars?.sigmaPx ?? SIGMA_PX
      );
      this.group.add(cb.group, ponto.points);
      const posB = new THREE.Vector3();
      p.companheira = {
        corpo: cb,
        armado: false,
        estado: estadoDe(pb.nome, cb.raioPc, pb.teffK, posB),
        clarao: {
          vaga: vaga + 1,
          pos: posB,
          mBase: ponto.mBase,
          cor: ponto.cor,
          soltura: 1,
          nomeada: p.nomeadaDaCompanheira,
          raioPc: cb.raioPc,
        },
        ponto,
        pos: posB,
      };
    }
  }

  /**
   * O LUGAR DE CADA UMA é o do PONTO do catálogo (`stars.bin`), não o do
   * nome: o nome traz o valor exato da fonte (AT-HYG v4.0), mas o binário
   * guarda a posição em 16 bits e o ponto cai até ~43 UA dele no raio para
   * Sirius (37,2 UA medidos em 22/11) — de perto, os dois apareciam em
   * lugares diferentes, e é o ponto que o céu desenha. Uma vez, quando o catálogo
   * chega; escrito no MESMO vetor que `posicaoDe` entrega.
   */
  private resolverLugares(): boolean {
    if (this.lugaresResolvidos) return true;
    const stars = this.fios.stars();
    if (!stars) return false;
    for (const p of this.pilotos) this.resolverLugar(p);
    this.lugaresResolvidos = true;
    return true;
  }

  /** o lugar de UM piloto no ponto do catálogo (o catálogo já chegou) */
  private resolverLugar(p: Piloto) {
    const stars = this.fios.stars();
    if (!stars) return;
    const xyz = stars.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    p.indice = this.indiceNoCatalogo(p);
    if (p.indice < 0) return;
    p.pos.set(xyz.getX(p.indice), xyz.getY(p.indice), xyz.getZ(p.indice));
    eixoDeRotacao(p.dados, p.pos, p.eixo);
  }

  /**
   * a estrela do catálogo na posição do nome: a mais próxima a menos de
   * 0,01 pc OU de 1e-3 da distância (o que for maior), com o MESMO brilho
   * (m − 5·log10 d a 0,5 mag do nome). O raio fixo de 0,01 pc deixava de
   * fora Betelgeuse (o ponto a 0,0116 pc do nome, a 153 pc) e HD 189733
   * (0,013 pc): sem casamento a estrela ganhava ponto próprio e o do
   * catálogo nunca cedia — o ponto branco ao lado do corpo, a ~2.400 UA,
   * que de perto andava em paralaxe (13/11). O brilho barra o vizinho de
   * verdade (Sirius B fica a 0,033 pc, 4 mag abaixo).
   */
  private indiceNoCatalogo(p: Piloto): number {
    const stars = this.fios.stars();
    if (!stars) return -1;
    const geo = stars.points.geometry;
    return indiceNoCatalogo(
      (geo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array,
      (geo.getAttribute('aLogLum') as THREE.BufferAttribute).array as Float32Array,
      p.pos,
      p.mBaseDoNome
    );
  }

  /**
   * O passo do quadro. Roda ANTES de o near ler o palco (o corpo que
   * arma NESTE tick governa o clip NESTE tick), como o gate do Sol.
   */
  atualizar(q: {
    camPos: THREE.Vector3;
    hPx: number;
    prAtual: number;
    fovDeg: number;
    jd: number;
    tempoS: number;
    focoNome: string | null;
  }) {
    const alturaCss = q.hPx / q.prAtual;
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(q.fovDeg) / 2);
    const stars = this.fios.stars();
    const escondido = this.fios.escondido('noestrelaslugar');
    this.candidatas.length = 0;
    // sem o catálogo não há lugar certo (nem ponto a ceder): espera
    if (!this.resolverLugares()) return;
    this.pilotoPeloFoco(q.focoNome);
    let saiu = false;
    for (const p of this.pilotos) {
      const emFoco = q.focoNome === p.dados.nomeNoCatalogo;
      // o motor do Sol é PESADO (sim, bakes, coroa 3D): fora de foco e longe,
      // desmonta — e devolve o ponto, o palco e a memória. Trocar de TIER
      // também: o corpo nasce com o tier do aparelho (como o Sol, que o
      // director refaz na troca) e renasce logo abaixo, no tier novo
      if (p.principal) {
        const longe = !emFoco && q.camPos.distanceTo(p.pos) > RAIO_DE_DESMONTE_PC;
        if (longe || this.fios.motorDoSol().quality !== p.principal.corpo.quality) {
          this.desmontar(p);
          if (longe) {
            if (p.sobDemanda) saiu = true;
            continue;
          }
        }
      }
      if (!p.principal) {
        const perto = q.camPos.distanceTo(p.pos) < RAIO_DE_PREPARO_PC;
        if (!(perto || emFoco)) {
          // a sob demanda sem foco e já desmontada sai da lista
          if (p.sobDemanda) saiu = true;
          continue;
        }
        this.criar(p, q.jd);
      }
      const a = p.principal!;
      const leiA = this.passo(a, p.pos, q, alturaCss, tanHalfFov, escondido);
      // a cessão do ponto do catálogo: a MESMA do Sol-ponto
      const cede = a.corpo.group.visible ? cessaoDoSol(leiA) : 0;
      if (stars && p.indice >= 0 && cede !== p.cedeu) {
        stars.writeFocus(p.indice, cede);
        p.cedeu = cede;
      }
      a.clarao.soltura = leiA.solturaDoClarao;
      // a candidata vale com o ponto do catálogo apagado (longe de casa,
      // `?nocat`): sem ela a nomeada caía no laço comum do clarão, com a
      // cruz plena por cima da fotosfera (auditoria de 20/11/2026, item 10.2)
      if (!escondido) this.candidatas.push(a.clarao);
      if (p.pontoProprio) {
        p.pontoProprio.points.visible = !escondido;
        p.pontoProprio.escrever({
          posPc: p.pos,
          distPc: q.camPos.distanceTo(p.pos),
          screenH: q.hPx,
          pr2: q.prAtual * q.prAtual,
          peso: 1 - cede,
        });
      }
      const b = p.companheira;
      if (b && p.dados.companheira) {
        const rel = posicaoDaCompanheira(
          q.jd,
          p.dados.companheira.orbita,
          [p.pos.x / p.pos.length(), p.pos.y / p.pos.length(), p.pos.z / p.pos.length()],
          p.pos.length()
        );
        b.pos.set(p.pos.x + rel[0], p.pos.y + rel[1], p.pos.z + rel[2]);
        const leiB = this.passo(b, b.pos, q, alturaCss, tanHalfFov, escondido);
        const cedeB = b.corpo.group.visible ? cessaoDoSol(leiB) : 0;
        b.clarao.soltura = leiB.solturaDoClarao;
        if (!escondido) this.candidatas.push(b.clarao);
        b.ponto.points.visible = !escondido;
        b.ponto.escrever({
          posPc: b.pos,
          distPc: q.camPos.distanceTo(b.pos),
          screenH: q.hPx,
          pr2: q.prAtual * q.prAtual,
          peso: 1 - cedeB,
        });
      }
    }
    if (saiu) {
      const ficam = this.pilotos.filter((p) => !(p.sobDemanda && !p.principal));
      this.pilotos.length = 0;
      this.pilotos.push(...ficam);
    }
  }

  /** devolve o ponto, o palco e a memória das duas superfícies de um piloto
   *  — e o ponto próprio, como antes de a estrela ser preparada */
  private desmontar(p: Piloto) {
    const stars = this.fios.stars();
    for (const s of [p.principal, p.companheira]) {
      if (!s) continue;
      s.corpo.group.removeFromParent();
      s.corpo.dispose();
      this.fios.palco().remover(`estrela:${s.estado.id}`);
    }
    for (const ponto of [p.companheira?.ponto, p.pontoProprio]) {
      ponto?.points.removeFromParent();
      ponto?.dispose();
    }
    p.pontoProprio = null;
    p.principal = null;
    p.companheira = null;
    if (stars && p.indice >= 0 && p.cedeu !== 0) stars.writeFocus(p.indice, 0);
    p.cedeu = 0;
  }

  /** as estrelas montadas que candidatam ao clarão neste quadro (pela lei do Sol) */
  candidatasAoClarao(): readonly CandidataVisitada[] {
    return this.candidatas;
  }

  /**
   * A FONTE DA LENTE: a estrela de MAIOR IRRADIÂNCIA na câmera, pela lei
   * do ponto (10^(−0,4·mBase)/d²), entre o Sol e as candidatas deste
   * quadro. `null` = o Sol (a lente segue como sempre, bit a bit). A troca
   * de fonte só acontece onde as duas irradiâncias são iguais — a dezenas
   * de milhares de UA equivalentes, onde a lente já é zero.
   */
  fonteDaLente(camPos: THREE.Vector3): FonteDaLente | null {
    const dSol2 = camPos.lengthSq();
    let melhor: (CandidataVisitada & { raioPc: number }) | null = null;
    // em log: −0,4·mBase − log10(d²), o do Sol primeiro
    let eMelhor = -0.4 * M_BASE_DO_SOL - Math.log10(Math.max(dSol2, 1e-300));
    for (const c of this.candidatas) {
      const dx = c.pos.x - camPos.x;
      const dy = c.pos.y - camPos.y;
      const dz = c.pos.z - camPos.z;
      const e = -0.4 * c.mBase - Math.log10(Math.max(dx * dx + dy * dy + dz * dz, 1e-300));
      if (e > eMelhor) {
        eMelhor = e;
        melhor = c;
      }
    }
    if (!melhor) return null;
    const f = this.fonte;
    f.pos.set(melhor.pos.x, melhor.pos.y, melhor.pos.z);
    f.raioPc = melhor.raioPc;
    f.fatorDeDistancia = Math.pow(10, 0.2 * (melhor.mBase - M_BASE_DO_SOL));
    tintaRelativaAoSol(melhor.cor, f.tinta);
    f.candidata = melhor;
    return f;
  }

  private passo(
    s: Superficie,
    pos: THREE.Vector3,
    q: { camPos: THREE.Vector3; hPx: number; fovDeg: number; jd: number; tempoS: number },
    alturaCss: number,
    tanHalfFov: number,
    escondido: boolean
  ) {
    const d = q.camPos.distanceTo(pos);
    s.armado = gateBinario(s.armado, diametroAparentePx(s.corpo.raioPc, d, q.hPx, q.fovDeg));
    const id = `estrela:${s.estado.id}`;
    // no palco também SEM disco, enquanto a câmera está perto: o near
    // da casa só conhece a distância ao SOL (é o dHome que salva o
    // Sol-ponto), e a 0,5 UA de Sirius B o near de ~2.000 UA cortava os
    // pontos de A e de B. Com a superfície registrada, o near a respeita.
    // O raio é o do DESMONTE, não o do preparo: com o near da casa em
    // dHome·0,004, a 168 pc (Betelgeuse) o corte cai a 0,67 pc, e entre
    // 0,5 e 0,67 pc a estrela inteira (ponto, hero, clarão) sumia — um
    // buraco na aproximação, medido em 12/11 também no código de antes.
    const noPalco = !escondido && (s.armado || d < RAIO_DE_DESMONTE_PC);
    if (noPalco) this.fios.palco().registrar(id, s.corpo.raioPc, pos);
    else this.fios.palco().remover(id);
    s.corpo.group.visible = s.armado && !escondido;
    const stars = this.fios.stars();
    _dir.copy(q.camPos).sub(pos);
    if (d > 0) _dir.divideScalar(d);
    const lei = repartir(
      s.estado,
      { distPc: d, direcao: [_dir.x, _dir.y, _dir.z] },
      {
        alturaPx: alturaCss,
        tanHalfFov,
        expoM0: stars?.expoM0 ?? EXPO_M0,
        sigmaPx: stars?.sigmaPx ?? SIGMA_PX,
        beta: BETA_DA_EMISSAO,
        trocaPx: LIMIAR_DO_GATE_PX,
        requisitoGeometrico: 1,
        janelaDoQuadro: this.fios.janelaDoQuadro,
      }
    );
    const g = lei.overrideExpoente;
    // a exposição da visita entra pela MESMA rampa do filtro, ao contrário:
    // plena com o disco enchendo o quadro (g = 0), nenhuma no ponto (g = 1)
    const plena = ganhoDaVisita(s.corpo.fotosfera.teffK, this.fios.politicaDeLuz(), s.corpo.fotosfera.teffDoPicoK);
    s.corpo.escrever({
      posPc: pos,
      g,
      alturaCss,
      exposicao: Math.pow(plena, 1 - Math.min(1, Math.max(0, g))),
      exposicaoPlena: plena,
      peso: lei.wResolvido * lei.wMalha,
      jd: q.jd,
      tempoS: q.tempoS,
    });
    return lei;
  }

  dispose() {
    this.candidatas.length = 0;
    for (const p of this.pilotos) {
      p.principal?.corpo.dispose();
      p.pontoProprio?.dispose();
      p.companheira?.corpo.dispose();
      p.companheira?.ponto.dispose();
    }
  }
}
