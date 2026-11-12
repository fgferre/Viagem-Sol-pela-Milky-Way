// ============================================================
// AS ESTRELAS COM LUGAR NO QUADRO — o piloto do pilar 2 do NORTE (12/11):
// Proxima, Sirius A+B, Betelgeuse e Vega viram corpos (`world/
// corpoDeEstrela.ts`) nas posições do catálogo, sob a MESMA lei do Sol
// (`solNoQuadro.ts`), linha por linha:
//  · o GATE do palco (4 px de diâmetro, histerese 2×) arma o corpo e o
//    registra no palco — o near passa a respeitar a superfície;
//  · a REPARTIÇÃO (`repartir`) decide o peso da malha (wResolvido), o
//    filtro de tela (overrideExpoente, a fração do quadro) e a cessão do
//    ponto (`cessaoDoSol`, a mesma fórmula do Sol-ponto);
//  · o ponto do CATÁLOGO cede pelo canal `aFocus` do campo (o canal
//    dormente que o item 38 deixou para "a estrela que ganha corpo").
// As heroes e o clarão de asas não precisam de cessão: a hero de cada uma
// já some pelo `nearFade` (0,5 × o tamanho do brilho, ≥ 0,03 pc) muito
// antes do disco ter 4 px (≤ 0,007 pc para Betelgeuse), e o clarão só
// candidata o Sol.
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
import {
  EXPO_M0,
  SIGMA_PX,
  radianciaDeTela,
  radianciaVisivelDeCorpoNegro,
  RADIANCIA_DA_FOTOSFERA,
} from '../luzDaCasa';
import type { QualityLevel } from '../core/engine';
import { SOL_PARAMS, StellarBody, type StellarParams } from '../world/stellarBody';
import { RAIO_SOL_PC } from '../escala';
import { BETA_DA_EMISSAO } from '../shaders/starShaders';
import { cessaoDoSol } from './solNoQuadro';
import {
  CorpoDeEstrela,
  PontoDeEstrela,
  eixoDeRotacao,
  fotosferaDaCompanheira,
  fotosferaDe,
  ganhoDaVisita,
  CONTRASTE_REAL_DO_SOL,
  granuloNaTelaEmRaios,
  posicaoDaCompanheira,
  raioDaEstrelaPc,
} from '../world/corpoDeEstrela';
import type { PoliticaDeLuz } from '../../lib/atlas/luz';
import {
  ESTRELAS_VISITAVEIS,
  GRANULO_SOL_EM_RAIOS,
  TEFF_SEM_ENVELOPE_K,
  atividadeDe,
  type EstrelaVisitavel,
} from '../../lib/atlas/estrelasVisitaveis';

/** A distância (pc) a que a malha nasce sem foco — bem antes do gate. */
export const RAIO_DE_PREPARO_PC = 0.5;

/** A porta `?estrelaslugar=`: só `0` desliga (o padrão é o piloto ligado). */
export function lerPortaEstrelasComLugar(bruto: string | null): boolean {
  return bruto !== '0';
}

/** A porta `?motorsol=`: só `0` volta Proxima ao motor simples do piloto. */
export function lerPortaMotorDoSol(bruto: string | null): boolean {
  return bruto !== '0';
}

/**
 * QUEM O MOTOR DO SOL DESENHA (12/11, "um motor só"): Proxima, Sirius A e
 * B, e Vega — cada uma por parâmetros físicos do mesmo motor. Betelgeuse
 * segue no motor simples (`corpoDeEstrela.ts`) até as células gigantes e a
 * borda difusa virarem parâmetros (a próxima rodada).
 */
const NO_MOTOR_DO_SOL: ReadonlySet<string> = new Set(['proxima', 'sirius', 'vega']);

/** A distância (pc) além da qual a estrela do motor do Sol, fora de foco, é
 *  desmontada (2× o preparo: histerese, para não remontar na borda). */
const RAIO_DE_DESMONTE_PC = 2 * RAIO_DE_PREPARO_PC;

/**
 * Os parâmetros do motor do Sol PELA FÍSICA de uma estrela visitável. Cada
 * campo é a lei dos dados; o que não tem lei é o do Sol, declarado:
 *  · raio físico (o EQUATORIAL, o de enquadramento); período medido; Teff
 *    (cor e brilho, `stellarBody.ts`);
 *  · envelope convectivo pela Teff (`TEFF_SEM_ENVELOPE_K`): sem ele, sem
 *    dínamo — o motor nem constrói a atmosfera magnética;
 *  · grânulo na tela relativo ao do Sol (`granuloNaTelaEmRaios`, Hp ∝ T·R/M);
 *  · contraste da textura quieta relativo ao do Sol (`contrasteGranulos`
 *    sobre o rms real do Sol, 0,15);
 *  · borda pelo u linear de Claret (`bordaU`);
 *  · atividade pelo número de Rossby (`atividadeDe`, Wright 2011) — no lugar
 *    de `manchas`/`erupcoes`, que ficam só para o motor simples; ela move
 *    manchas, ciclo, a frequência das erupções e a contagem de laços;
 *  · rotadora rápida (Vega): forma achatada + escurecimento gravitacional
 *    (`achatamento`), com o eixo na base da cena (`eixo`, o do piloto:
 *    6,2° da linha até o Sol medido, ângulo de posição ARTÍSTICO);
 *  · eixo das outras: o +Y do motor sem inclinação (ARTÍSTICO — nenhuma tem
 *    eixo medido);
 *  · semente: a do Sol ⊕ HIP (outra superfície, mesma receita);
 *  · knobs de URL com o prefixo do id (`?proximaspots=`).
 */
export function parametrosDoMotor(e: EstrelaVisitavel, eixo?: THREE.Vector3): StellarParams {
  const s = e.superficie;
  return {
    ...SOL_PARAMS,
    nome: e.id,
    radiusPc: raioDaEstrelaPc(e),
    rotPeriodDays: e.rotacaoDias?.v ?? SOL_PARAMS.rotPeriodDays,
    tiltRad: 0,
    activityLevel: atividadeDe(e).nivel,
    teffK: e.teffK.v,
    convective: e.teffK.v < TEFF_SEM_ENVELOPE_K,
    seed: (SOL_PARAMS.seed ^ e.hip) >>> 0,
    knobPrefix: e.id,
    granuloRelativoAoSol:
      granuloNaTelaEmRaios(s.granuloEmRaios.v) / granuloNaTelaEmRaios(GRANULO_SOL_EM_RAIOS),
    contrasteRelativoAoSol: s.contrasteGranulos.v / CONTRASTE_REAL_DO_SOL,
    bordaU: s.bordaU.v,
    foraDaOrigem: true,
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
    convective: false,
    seed: (SOL_PARAMS.seed ^ e.hip ^ 0x0b0b0b0b) >>> 0,
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
  corpo: CorpoDeEstrela | EstrelaPeloMotorDoSol;
  armado: boolean;
  estado: EstadoDaEstrela;
}

interface Piloto {
  dados: EstrelaVisitavel;
  pos: THREE.Vector3;
  eixo: THREE.Vector3;
  /** índice no catálogo (`stars.bin`); −1 = não achado */
  indice: number;
  principal: Superficie | null;
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
    /** a curva de tom viva — a receita do Sol troca de calibração com ela */
    toneMapping: () => THREE.ToneMapping;
    /** brilho assistido × real (o selo do HUD) — a exposição da visita */
    politicaDeLuz: () => PoliticaDeLuz;
    /** `?motorsol=` (null = desligado): os meios do motor do Sol */
    motorDoSol: () => MeiosDoMotor | null;
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
    const f = fotosferaDe(p.dados);
    const meios = NO_MOTOR_DO_SOL.has(p.dados.id) ? this.fios.motorDoSol() : null;
    const corpo = meios
      ? new EstrelaPeloMotorDoSol(parametrosDoMotor(p.dados, p.eixo), meios, jd)
      : new CorpoDeEstrela(f);
    if (corpo instanceof EstrelaPeloMotorDoSol) corpo.group.position.copy(p.pos);
    this.group.add(corpo.group);
    p.principal = {
      corpo,
      armado: false,
      estado: estadoDe(p.dados.id, corpo.raioPc, f.teffK, p.pos),
    };
    const fb = fotosferaDaCompanheira(p.dados);
    const pb = meios ? parametrosDaCompanheira(p.dados) : null;
    if (fb) {
      // a companheira pelo MESMO motor (segunda instância) quando a
      // principal está nele; o ponto de luz fica — de longe ela é sub-pixel
      const cb = pb ? new EstrelaPeloMotorDoSol(pb, meios!, jd) : new CorpoDeEstrela(fb);
      const stars = this.fios.stars();
      const ponto = new PontoDeEstrela(fb, stars?.expoM0 ?? EXPO_M0, stars?.sigmaPx ?? SIGMA_PX);
      this.group.add(cb.group, ponto.points);
      const posB = new THREE.Vector3();
      p.companheira = {
        corpo: cb,
        armado: false,
        estado: estadoDe(fb.id, cb.raioPc, fb.teffK, posB),
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

  /** a estrela do catálogo na posição do nome (a mais próxima, < 1e-3 pc) */
  private indiceNoCatalogo(pos: THREE.Vector3): number {
    const stars = this.fios.stars();
    if (!stars) return -1;
    const xyz = (stars.points.geometry.getAttribute('position') as THREE.BufferAttribute)
      .array as Float32Array;
    let melhor = -1;
    let dMin = 1e-6; // (1e-3 pc)²
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
    // sem o catálogo não há lugar certo (nem ponto a ceder): espera
    if (!this.resolverLugares()) return;
    for (const p of this.pilotos) {
      const emFoco = q.focoNome === p.dados.nomeNoCatalogo;
      // o motor do Sol é PESADO (sim, bakes, coroa 3D): fora de foco e longe,
      // desmonta — e devolve o ponto, o palco e a memória. Trocar de TIER
      // também: o corpo nasce com o tier do aparelho (como o Sol, que o
      // director refaz na troca) e renasce logo abaixo, no tier novo
      if (p.principal?.corpo instanceof EstrelaPeloMotorDoSol) {
        const longe = !emFoco && q.camPos.distanceTo(p.pos) > RAIO_DE_DESMONTE_PC;
        const tierNovo = this.fios.motorDoSol()?.quality;
        if (longe || (tierNovo !== undefined && tierNovo !== p.principal.corpo.quality)) {
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
      const leiA = this.passo(a, p.pos, p.eixo, q, alturaCss, tanHalfFov, escondido);
      // a cessão do ponto do catálogo: a MESMA do Sol-ponto
      const cede = a.corpo.group.visible ? cessaoDoSol(leiA) : 0;
      if (stars && p.indice >= 0 && cede !== p.cedeu) {
        stars.writeFocus(p.indice, cede);
        p.cedeu = cede;
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
        const leiB = this.passo(b, b.pos, p.eixo, q, alturaCss, tanHalfFov, escondido);
        const cedeB = b.corpo.group.visible ? cessaoDoSol(leiB) : 0;
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

  /** devolve o ponto, o palco e a memória das duas superfícies de um piloto */
  private desmontar(p: Piloto) {
    const stars = this.fios.stars();
    for (const s of [p.principal, p.companheira]) {
      if (!s) continue;
      s.corpo.group.removeFromParent();
      s.corpo.dispose();
      this.fios.palco().remover(`estrela:${s.estado.id}`);
    }
    if (p.companheira) {
      p.companheira.ponto.points.removeFromParent();
      p.companheira.ponto.dispose();
    }
    p.principal = null;
    p.companheira = null;
    if (stars && p.indice >= 0 && p.cedeu !== 0) stars.writeFocus(p.indice, 0);
    p.cedeu = 0;
  }

  private passo(
    s: Superficie,
    pos: THREE.Vector3,
    eixo: THREE.Vector3,
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
    const noPalco = !escondido && (s.armado || d < RAIO_DE_PREPARO_PC);
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
    if (s.corpo instanceof EstrelaPeloMotorDoSol) {
      const g = lei.overrideExpoente;
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
    } else if (s.corpo.group.visible) {
      // a ponte casa → tela com o raio do SOL (a unidade é a superfície
      // do Sol), na altura viva, descida em stops pelo filtro da lei
      const g = lei.overrideExpoente;
      const fator = Math.pow(radianciaDeTela(RADIANCIA_DA_FOTOSFERA, RAIO_SOL_PC, alturaCss), g);
      // a exposição da visita entra pela MESMA rampa, ao contrário: plena
      // com o disco enchendo o quadro (g = 0), nenhuma no ponto (g = 1)
      const exposicao = Math.pow(
        ganhoDaVisita(s.corpo.fotosfera.teffK, this.fios.politicaDeLuz()),
        1 - Math.min(1, Math.max(0, g))
      );
      s.corpo.escrever({
        posPc: pos,
        eixo,
        jd: q.jd,
        tempoS: q.tempoS,
        fator,
        exposicao,
        peso: lei.wResolvido * lei.wMalha,
        toneMapping: this.fios.toneMapping(),
      });
    }
    return lei;
  }

  dispose() {
    for (const p of this.pilotos) {
      p.principal?.corpo.dispose();
      p.companheira?.corpo.dispose();
      p.companheira?.ponto.dispose();
    }
  }
}
