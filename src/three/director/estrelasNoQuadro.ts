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
// a cor do ponto que ela é de longe, a soltura da repartição dela — e cede
// à hero de autor enquanto a hero está no quadro (as duas são a óptica do
// mesmo ponto; somar dobraria a cruz). A hero, por sua vez, cede ao corpo
// pela mesma cessão do ponto do catálogo. A LENTE DE CINEMA segue a fonte
// de maior irradiância na câmera (`fonteDaLente`): o Sol, ou a visitada.
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
import { SOL_PARAMS, StellarBody, pesoDoFiltro, type StellarParams } from '../world/stellarBody';
import { PontoDeEstrela } from '../world/pontoDeEstrela';
import { RAIO_SOL_PC } from '../escala';
import { BETA_DA_EMISSAO } from '../shaders/starShaders';
import { bvToColor } from '../shaders/common';
import { SOL_BV, type CandidataVisitada } from '../world/clarao';
import type { HeroStars } from '../world/heroStars';
import { cessaoDoSol } from './solNoQuadro';
import type { PoliticaDeLuz } from '../../lib/atlas/luz';
import {
  CONTRASTE_REAL_DO_SOL,
  ESTRELAS_VISITAVEIS,
  FRACAO_DOS_GRANULOS_SOB_AS_GIGANTES,
  GRANULO_SOL_EM_RAIOS,
  atividadeDe,
  granuloNaTelaEmRaios,
  posicaoDaCompanheira,
  raioDaEstrelaPc,
  rotacaoDe,
  temDinamoSolar,
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
 * O EIXO DE ROTAÇÃO na base da cena. Vega: 6,2° da linha até o Sol
 * (medido — vemos quase o polo, como da Terra); o ÂNGULO DE POSIÇÃO da
 * inclinação é ARTÍSTICO (para o norte celeste). As outras não têm eixo
 * medido: o polo celeste norte, escolha artística declarada (o motor só o
 * usa para a forma achatada; sem ela, o +Y do motor).
 */
export function eixoDeRotacao(e: EstrelaVisitavel, pos: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  if (!e.achatamento) return out.set(0, 0, 1);
  const r = pos.clone().normalize();
  const norte = new THREE.Vector3(0, 0, 1).addScaledVector(r, -r.z).normalize();
  const i = e.achatamento.inclinacaoGraus.v * GRAU;
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
 * inteiro até 5.772 K) e esmaece junto com o filtro: a estrela quente
 * (≥ 8.000 K) aparece na radiância visível VERDADEIRA relativa ao Sol —
 * Sirius ~6,9×, Vega ~6,5× (12/11, a tarefa das estrelas quentes). Com ¼
 * elas ficavam a 1,6×, com o canal azul no ombro da curva de tom: o disco
 * saía lilás e chapado, mais pobre que o Sol ("gesso"). Na radiância de
 * verdade o núcleo branqueia no ombro, o azul sobra na borda escurecida e
 * o disco passa do limiar do bloom. O Sol e as mais frias: o ¼ de sempre.
 */
export const EXPOENTE_DO_BRILHO_ASSISTIDO = 0.25;

/**
 * O ganho que leva a radiância verdadeira de uma fotosfera ao nível da
 * visita: 1 no modo REAL; no ASSISTIDO, rad^(e − 1), com e = ¼ esmaecendo
 * a 1 junto com o filtro do Sol (ver acima). Propriedade do CORPO (a Teff
 * dele), não do foco da câmera. Quem o aplica é a rampa do filtro
 * (`ganho^(1 − g)`): com o disco pequeno (g = 1) a emissão é a verdadeira
 * e a troca com o ponto conserva a luz.
 */
export function ganhoDaVisita(teffK: number, politica: PoliticaDeLuz): number {
  if (politica === 'real') return 1;
  const w = pesoDoFiltro(teffK);
  const e = w * EXPOENTE_DO_BRILHO_ASSISTIDO + (1 - w);
  return Math.pow(radianciaVisivelDeCorpoNegro(teffK), e - 1);
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
 *  · células gigantes e borda difusa quando os dados as têm (Betelgeuse);
 *  · borda pelo u linear de Claret (`bordaU`);
 *  · atividade pelo número de Rossby (`atividadeDe`, Wright 2011): ela move
 *    manchas, ciclo, a frequência das erupções e a contagem de laços;
 *  · rotadora rápida (Vega): forma achatada + escurecimento gravitacional
 *    (`achatamento`), com o eixo na base da cena (`eixo`, o do piloto:
 *    6,2° da linha até o Sol medido, ângulo de posição ARTÍSTICO);
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
  if (e.hip !== undefined) return e.hip;
  let h = 2166136261;
  for (let i = 0; i < e.id.length; i++) h = Math.imul(h ^ e.id.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function parametrosDoMotor(e: EstrelaVisitavel, eixo?: THREE.Vector3): StellarParams {
  const s = e.superficie;
  const gig = s.celulasGigantesEmRaios;
  const contrasteDosGranulos = s.contrasteGranulos.v * (gig ? FRACAO_DOS_GRANULOS_SOB_AS_GIGANTES : 1);
  return {
    ...SOL_PARAMS,
    nome: e.id,
    radiusPc: raioDaEstrelaPc(e),
    rotPeriodDays: rotacaoDe(e).v,
    tiltRad: 0,
    activityLevel: atividadeDe(e).nivel,
    teffK: e.teffK.v,
    dinamo: temDinamoSolar(e),
    seed: (SOL_PARAMS.seed ^ sementeDe(e)) >>> 0,
    knobPrefix: e.id,
    granuloRelativoAoSol:
      granuloNaTelaEmRaios(s.granuloEmRaios.v) / granuloNaTelaEmRaios(GRANULO_SOL_EM_RAIOS),
    contrasteRelativoAoSol: contrasteDosGranulos / CONTRASTE_REAL_DO_SOL,
    bordaU: s.bordaU.v,
    foraDaOrigem: true,
    ...(gig ? { celulasGigantes: { tamanhoEmRaios: gig.v, contraste: s.contrasteGranulos.v } } : {}),
    ...(s.bordaDifusaRaios.v > 1 ? { bordaDifusaRaios: s.bordaDifusaRaios.v } : {}),
    ...(e.achatamento ? { achatamento: e.achatamento } : {}),
    ...(e.achatamento && eixo ? { eixoNaCena: [eixo.x, eixo.y, eixo.z] as const } : {}),
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
  return {
    ...SOL_PARAMS,
    nome: `${e.id}-b`,
    radiusPc: c.raioRsol.v * RAIO_SOL_PC,
    rotPeriodDays: SOL_PARAMS.rotPeriodDays,
    tiltRad: 0,
    activityLevel: 0,
    teffK: c.teffK.v,
    dinamo: false,
    seed: (SOL_PARAMS.seed ^ sementeDe(e) ^ 0x0b0b0b0b) >>> 0,
    knobPrefix: `${e.id}b`,
    contrasteRelativoAoSol: 0,
    bordaU: 0.3,
    foraDaOrigem: true,
  };
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
  readonly fotosfera: { readonly teffK: number };
  /** o custo da construção (prime: sim + bake + coroa), ms */
  readonly msDeConstrucao: number;
  /** o tier com que nasceu — trocar de tier REMONTA (`EstrelasNoQuadro`) */
  readonly quality: QualityLevel;
  private readonly meios: MeiosDoMotor;
  constructor(params: StellarParams, meios: MeiosDoMotor, jd: number) {
    this.meios = meios;
    this.quality = meios.quality;
    const t0 = performance.now();
    this.corpo = new StellarBody(params, meios.renderer, meios.camera, meios.quality, faseDoCiclo(jd));
    this.msDeConstrucao = performance.now() - t0;
    this.group = this.corpo.group;
    this.raioPc = params.radiusPc;
    this.fotosfera = { teffK: params.teffK };
  }

  /** o passo do quadro: a lei da repartição entra pelos mesmos fios do Sol */
  escrever(q: {
    posPc: THREE.Vector3;
    g: number;
    alturaCss: number;
    exposicao: number;
    peso: number;
    jd: number;
    tempoS: number;
  }) {
    this.group.position.copy(q.posPc);
    if (this.group.visible) {
      this.corpo.escreverFiltroSolar(q.g, q.alturaCss);
      this.corpo.escreverBrilho(radianciaVisivelDeCorpoNegro(this.fotosfera.teffK) * q.exposicao);
      this.corpo.escreverPesoDaLei(q.peso);
    }
    // a fase do ciclo é a do CALENDÁRIO DO SOL (a lei `faseDoCiclo`):
    // Proxima tem ciclo próprio de ~7 anos (Wargelin et al. 2017) que o
    // motor ainda não conhece — declarado
    this.corpo.escreverCiclo(faseDoCiclo(q.jd));
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

/** smoothstep em log: 0 em `a`, 1 em `b` (a > b vale: a rampa de quem se aproxima) */
function suaveEmLog(a: number, b: number, x: number): number {
  if (!(x > 0)) return 1;
  const t = Math.min(1, Math.max(0, Math.log(x / a) / Math.log(b / a)));
  return t * t * (3 - 2 * t);
}

export class EstrelasNoQuadro {
  readonly group = new THREE.Group();
  private readonly pilotos: Piloto[] = [];
  private readonly poolDeOclusores: OclusorDeRotulo[] = [];
  private readonly listaDeOclusores: OclusorDeRotulo[] = [];
  private lugaresResolvidos = false;
  private readonly fios: {
    stars: () => StarField | undefined;
    palco: () => CorposResolvidos;
    escondido: (flag: string) => boolean;
    janelaDoQuadro: JanelaDoQuadro | 'hoje';
    /** brilho assistido × real (o selo do HUD) — a exposição da visita */
    politicaDeLuz: () => PoliticaDeLuz;
    /** os meios do motor do Sol (renderer, câmera e o tier vivo) */
    motorDoSol: () => MeiosDoMotor;
    /** as heroes de autor (a cessão delas e a presença que o clarão respeita) */
    heroes: () => HeroStars | undefined;
  };
  /** as candidatas ao clarão deste quadro (`atualizar` escreve) */
  private readonly candidatas: (CandidataVisitada & { raioPc: number })[] = [];
  private readonly fonte: FonteDaLente = {
    pos: new THREE.Vector3(),
    raioPc: 0,
    fatorDeDistancia: 1,
    tinta: [1, 1, 1],
  };

  constructor(named: readonly NamedStar[], fios: EstrelasNoQuadro['fios']) {
    this.fios = fios;
    for (const dados of ESTRELAS_VISITAVEIS) {
      const s = named.find((n) => n.n === dados.nomeNoCatalogo);
      if (!s) continue;
      const pos = new THREE.Vector3(s.x, s.y, s.z);
      this.pilotos.push({
        dados,
        pos,
        eixo: eixoDeRotacao(dados, pos, new THREE.Vector3()),
        indice: -1,
        principal: null,
        pontoProprio: null,
        companheira: null,
        cedeu: 0,
      });
    }
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

  /** A posição de catálogo de um piloto pelo nome (para a escada). */
  posicaoDe(nomeNoCatalogo: string): THREE.Vector3 | null {
    this.resolverLugares();
    return this.pilotos.find((p) => p.dados.nomeNoCatalogo === nomeNoCatalogo)?.pos ?? null;
  }

  private criar(p: Piloto, jd: number) {
    const meios = this.fios.motorDoSol();
    const d = p.dados;
    const corpo = new EstrelaPeloMotorDoSol(parametrosDoMotor(d, p.eixo), meios, jd);
    corpo.group.position.copy(p.pos);
    this.group.add(corpo.group);
    const stars = this.fios.stars();
    const vaga = 2 * this.pilotos.indexOf(p);
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
      cor = bvToColor((geo.getAttribute('aCi') as THREE.BufferAttribute).getX(p.indice));
    }
    p.principal = {
      corpo,
      armado: false,
      estado: estadoDe(d.id, corpo.raioPc, d.teffK.v, p.pos),
      clarao: { vaga, pos: p.pos, mBase, cor, soltura: 1, raioPc: corpo.raioPc },
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
        clarao: { vaga: vaga + 1, pos: posB, mBase: ponto.mBase, cor: ponto.cor, soltura: 1, raioPc: cb.raioPc },
        ponto,
        pos: posB,
      };
    }
  }

  /**
   * O LUGAR DE CADA UMA é o do PONTO do catálogo (float32 de `stars.bin`),
   * não o do nome: a posição do nome vem arredondada a 1e-4 pc, e para
   * Sirius isso punha o corpo a ~40 UA do próprio ponto — de perto, os
   * dois apareciam em lugares diferentes. Uma vez, quando o catálogo
   * chega; escrito no MESMO vetor que `posicaoDe` entrega.
   */
  private resolverLugares(): boolean {
    if (this.lugaresResolvidos) return true;
    const stars = this.fios.stars();
    if (!stars) return false;
    const xyz = stars.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (const p of this.pilotos) {
      p.indice = this.indiceNoCatalogo(p.pos);
      if (p.indice < 0) continue;
      p.pos.set(xyz.getX(p.indice), xyz.getY(p.indice), xyz.getZ(p.indice));
      eixoDeRotacao(p.dados, p.pos, p.eixo);
    }
    this.lugaresResolvidos = true;
    return true;
  }

  /**
   * a estrela do catálogo na posição do nome (a mais próxima, < 0,01 pc).
   * Era 1e-3 pc; β Pictoris tem o ponto do binário a 1,08e-3 pc do nome
   * (a quantização angular de ~20″ a 19,6 pc) e HD 189733, sem nome no
   * catálogo, a 5,4e-3 pc da posição do Gaia. As quatro do piloto casam
   * a < 1,2e-4 pc, então o ponto delas não muda.
   */
  private indiceNoCatalogo(pos: THREE.Vector3): number {
    const stars = this.fios.stars();
    if (!stars) return -1;
    const xyz = (stars.points.geometry.getAttribute('position') as THREE.BufferAttribute)
      .array as Float32Array;
    let melhor = -1;
    let dMin = 1e-4; // (0,01 pc)²
    for (let i = 0; i < xyz.length; i += 3) {
      const dx = xyz[i] - pos.x;
      const dy = xyz[i + 1] - pos.y;
      const dz = xyz[i + 2] - pos.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < dMin) {
        dMin = d2;
        melhor = i / 3;
      }
    }
    return melhor;
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
    const heroes = this.fios.heroes();
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
          if (longe) continue;
        }
      }
      if (!p.principal) {
        const perto = q.camPos.distanceTo(p.pos) < RAIO_DE_PREPARO_PC;
        if (!(perto || emFoco)) continue;
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
      // a hero de autor da MESMA estrela cede ao corpo na mesma medida — e,
      // antes, ao CLARÃO: a hero é um brilho de tamanho FIXO no espaço
      // (0,08·10^(−0,3m) pc), que perto enche a tela inteira; a troca para
      // o clarão (tamanho da lei, teto de 7 % da tela) corre em log da
      // distância desde a montagem (`RAIO_DE_PREPARO_PC`, onde a hero
      // ainda é inteira) até onde o `nearFade` dela termina (0,5×), a faixa
      // mais larga que existe. Sem isto a troca se espremia no `nearFade` e
      // saltava (Betelgeuse: ×0,23 de luz no quadro num só passo de 20 % na
      // distância). Ainda é troca de ESTILO (a hero é arte, não fluxo)
      const dHero = q.camPos.distanceTo(p.pos);
      const tamHero = heroes?.tamanhoDe(p.dados.nomeNoCatalogo) ?? 0;
      const aoClarao =
        tamHero > 0 && 0.5 * tamHero < RAIO_DE_PREPARO_PC
          ? suaveEmLog(RAIO_DE_PREPARO_PC, 0.5 * tamHero, dHero)
          : 0;
      // o ganho desce em LOG (três décadas ao longo da rampa): a hero é um
      // brilho estourado, e um ganho linear só aparecia quando já era quase
      // zero (Sirius: inteira a 26 % de ganho, nada no passo seguinte)
      const ganhoHero = aoClarao >= 1 ? 0 : Math.pow(1e-3, aoClarao);
      heroes?.escreverCessao(p.dados.nomeNoCatalogo, Math.max(cede, 1 - ganhoHero));
      // ...e o clarão cede à hero enquanto ela está no quadro
      const hero = heroes?.presenca(p.dados.nomeNoCatalogo, q.camPos) ?? 0;
      a.clarao.soltura = leiA.solturaDoClarao * (1 - hero);
      if (p.indice >= 0 ? (stars?.points.visible ?? false) : !escondido) this.candidatas.push(a.clarao);
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
    this.fios.heroes()?.escreverCessao(p.dados.nomeNoCatalogo, 0);
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
    s.corpo.escrever({
      posPc: pos,
      g,
      alturaCss,
      exposicao: Math.pow(
        ganhoDaVisita(s.corpo.fotosfera.teffK, this.fios.politicaDeLuz()),
        1 - Math.min(1, Math.max(0, g))
      ),
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
