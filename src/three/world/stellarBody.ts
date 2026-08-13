// ============================================================
// StellarBody — o corpo estelar procedural da casa, e o Sol é a
// instância 1. Nasceu como `novoSol.ts`: o Sol transplantado de
// Novo-Sol-Fable-3d (projeto irmão do mesmo autor; three 0.185, zero
// dependências). A Onda 3 não o reescreveu — promoveu a
// `StellarParams` os literais que eram DA INSTÂNCIA, com defaults
// (`SOL_PARAMS`) que reconstroem o objeto de antes byte a byte. O
// `git mv` preservou a história; o diff é o que mudou de fato.
//
// O núcleo vive VENDORIZADO VERBATIM em ./sol/ — fábricas
// createX(ctx) sem side-effects de import, exatamente como no
// original, e a Onda 3 não tocou nenhum dos 14 (M3: portam-se
// pixels). Este arquivo é (a) o adaptador de contexto que o
// main.js de lá provia, e (b) a orquestração por frame portada
// do animate() original (sim fatiada, bake da cromosfera a 8 Hz
// em 8 fatias, ciclo de 11 anos, flares, proeminências, loops,
// coroa). O que NÃO viaja: pipeline de pós deles (bloom/ACES
// próprios — aqui o Sol atravessa o NOSSO composer), céu, UI,
// câmera, museu. Fase 2 FEITA: coroa volumétrica (sampler3D) e CME
// (transform feedback) — as três pontes de escala estão no NORTE.
//
// ESCALA: o núcleo trabalha em "unidades de doador" (raio 2.2);
// o group leva scale = params.radiusPc/2.2 e o uCamDist é alimentado
// em unidades de doador CORRIGIDAS por fov (o LOD do disco de
// lá foi calibrado a fov 42° — sem a correção, o enquadramento
// da parede de fogo a fov 26° leria como "longe").
//
// TEMPO: update(time) recebe o relógio VISUAL do director (0 sob
// ?shot=). delta<=0 congela tudo — por isso o construtor faz um
// PRIME síncrono (semente do sim + N passos + um bake completo):
// sem ele, captura em t=0 fotografaria o disco sem cromosfera.
//
// LOD: este arquivo NÃO TEM MAIS LOD, e isso é o que a F3 da onda do Sol
// real entregou. Até ela, o corpo se atenuava por DISTÂNCIA — duas
// rampas em parsec (`solWorldFade`) escurecendo fotosfera, espículas,
// raias e halo, mais um corte duro de custo. As duas rampas existiam
// pela mesma razão: o disco da cena era 487.441× maior que o Sol, e um
// corpo desse tamanho precisava ser dissolvido à mão nas duas pontas
// (afastando-se ele engolia o céu; aproximando-se ele engolia o sistema
// solar). Com raio FÍSICO nada disso acontece — a perspectiva já faz o
// trabalho. Quem decide se o Sol é desenhado como CORPO é a régua do
// palco (4 px de diâmetro aparente, `corpos.ts`), aplicada pelo
// Director, exatamente como em Terra e Lua; aqui só se lê
// `group.visible`.
// ============================================================
import * as THREE from 'three';
import { RAIO_ARTISTICO_DO_SOL_PC, RAIO_DO_SOL_NA_CENA } from '../escala';
import type { QualityLevel } from '../core/engine';
import { NOISE_GLSL } from './sol/common.js';
import { createGranulation } from './sol/granulation.js';
import { createPIL } from './sol/pil.js';
import { createActivity } from './sol/activity.js';
import { createChromo } from './sol/chromo.js';
import { createSunBase, createSunUniforms, createSunMesh } from './sol/sun.js';
import { createFlares } from './sol/flares.js';
import { createCoronaRays } from './sol/coronaRays.js';
import { createSpicules } from './sol/spicules.js';
import { createProminences } from './sol/prominences.js';
import { createLoops } from './sol/loops.js';
import { createCoronaVolume } from './sol/coronaVolume.js';
import { createCME } from './sol/cme.js';

const DONOR_RADIUS = 2.2; // SUN_RADIUS do projeto original
const DONOR_FIT = 6.59; // fitDist de lá (fov 42°, landscape)
const DONOR_HALF_FOV = Math.tan((42 * Math.PI) / 360);
const MACRO_SLOW = 0.15;
const SIM_DT = 0.6 * MACRO_SLOW;

// Tiers do original (renderer.js) — só os campos que o núcleo lê.
// cinema→high, alta→mid, performance→low; ultra fica para depois.
const TIERS = {
  low: { fbm: 4, seg: 96, simW: 384, simH: 192, simStep: 1 / 16, prom: 4, chromo: 512, granFreq: 22.0, lic7: false, loops: 8, larc: 5, lseg: 28, cstep: 0, cmestep: 0, cmen: 0 },
  mid: { fbm: 5, seg: 128, simW: 768, simH: 384, simStep: 1 / 22, prom: 6, chromo: 1024, granFreq: 30.0, lic7: true, loops: 12, larc: 7, lseg: 36, cstep: 22, cmestep: 16, cmen: 1024 },
  high: { fbm: 5, seg: 128, simW: 768, simH: 384, simStep: 1 / 26, prom: 7, chromo: 2048, granFreq: 34.0, lic7: true, loops: 16, larc: 9, lseg: 44, cstep: 36, cmestep: 24, cmen: 2048 },
} as const;
const TIER_FOR: Record<QualityLevel, keyof typeof TIERS> = {
  cinema: 'high',
  alta: 'mid',
  performance: 'low',
};

// Defaults de fábrica do modo normal de lá (CONTROL_SCHEMA) — os knobs
// que o NÚCLEO lê. Congelados: o painel/URL de lá não viaja.
const SOL_KNOBS: Record<string, number> = {
  spots: 1, cycle: 1, lapse: 0, speed: 1, pmode: 0,
  plageglow: 0.35, halo: 0.55, ray: 0.9, cact: 0.5,
  // cme 1,4 (doador: 0,9): a casca foi calibrada contra a exposição
  // 0,418 do pipeline de lá; no nosso ACES ela compete com a coroa
  // mais clara — 0,9 mal aparecia, 1,4 lê a estrutura de 3 partes
  loops: 0.55, fprom: 0.55, cvol: 0.5, cme: 1.4, edu: 0,
};

// ------------------------------------------------------------
// StellarParams — o que é DA INSTÂNCIA (Onda 3, decisão D5)
// ------------------------------------------------------------
//
// A regra da promoção: sobe a parâmetro o literal que (a) descreve a
// ESTRELA, não o motor, e (b) sobe sem tocar em `sol/*.js`. Os 14
// módulos vendorizados ficam intocados, e o que não passou por esse
// filtro está NOMEADO aqui em vez de escondido:
//
//  1. `DONOR_RADIUS = 2.2`. O mesmo número vive DE NOVO, como literal
//     independente, em `sol/sun.js:13` (`var SUN_RADIUS = 2.2`), de
//     onde é publicado em `ctx.SUN_RADIUS` e lido por 7 dos 14 módulos
//     (sun, coronaRays, coronaVolume, prominences, spicules, loops,
//     cme). Promovê-lo exigiria editar `sol/*.js`. Não é perda: o
//     parâmetro REAL da instância é `radiusPc` (o raio em pc no mundo);
//     2.2 é só a régua interna do doador. Mas os dois lados têm de
//     continuar concordando À MÃO — se um mudar sem o outro, quebra em
//     silêncio. Onda 7.
//  2. A PALETA H-alfa: ~17 tripletos `vec3()` inline em 8 dos
//     `sol/*.js`, nenhum nomeado. É OVERRIDE DECLARADO da instância Sol
//     (decisão D4) — a lei de cor por classe espectral é da Onda 7, e é
//     ela que vai precisar de `teffK`.
//  3. `sol/cme.js:10` captura `ctx.camera` NA CRIAÇÃO, não por frame.
//     Uma segunda instância construída antes de a câmera real existir
//     pegaria a errada, sem erro nenhum. Onda 7.
//  4. `DONOR_FIT`/`DONOR_HALF_FOV` e a janela do limbo (35/25 em
//     unidades de doador): calibração de LENTE e de REGIME do doador,
//     não física da estrela.
//  5. `TIERS`: custo, não estrela — e nem chega a ser da instância,
//     porque nenhuma camada estelar responde a troca de qualidade
//     (decisão D8).

/** Período de rotação do Sol — sideral médio de Carrington, em dias. */
export const SOL_ROT_PERIOD_DAYS = 25.38;
/**
 * O `ROT_SPEED` do doador para o Sol: rad por segundo DE TELA. É taxa
 * artística — o doador nunca modelou período nenhum.
 */
const SOL_ROT_SPEED = 0.042;

/**
 * Período (dias) → rad/s de tela. A âncora é a RELAÇÃO, não o número:
 * o Sol devolve exatamente o 0,042 de sempre porque `25.38 / 25.38` é
 * 1 sem resto em IEEE754 e `0.042 * 1` é o mesmo bit. A promoção não
 * podia custar um ULP — o gate de md5 desta fase pegaria.
 * A razão embutida é a COMPRESSÃO DE TEMPO do filme: uma volta em
 * 2π/0,042 ≈ 149,6 s de tela para 25,38 dias ⇒ ~5,9 s por dia solar.
 * Guarda: período inválido devolve 0 (estrela não gira), nunca NaN.
 */
export function rotSpeedFromPeriod(periodDays: number): number {
  if (!Number.isFinite(periodDays) || periodDays <= 0) return 0;
  return SOL_ROT_SPEED * (SOL_ROT_PERIOD_DAYS / periodDays);
}

/** O que descreve UMA estrela procedural desta casa. */
export interface StellarParams {
  /** Nome da instância — diagnóstico e registro, só. */
  readonly nome: string;
  /** Raio VISUAL em pc (escala artística: o real seria invisível). */
  readonly radiusPc: number;
  /** Período de rotação em dias → `rotSpeedFromPeriod`. */
  readonly rotPeriodDays: number;
  /** Inclinação do eixo, em rad. */
  readonly tiltRad: number;
  /**
   * Escala global de atividade magnética: multiplica os knobs `spots` e
   * `cycle` do doador ANTES do override de URL (a URL segue sendo a
   * fonte de verdade). Só esses dois — `cact`/`cvol`/`fprom` são DOSE DE
   * RENDER da coroa, calibrada contra o nosso ACES, e enfiá-los aqui
   * seria promoção falsa.
   */
  readonly activityLevel: number;
  /**
   * RESERVADO (D4): temperatura efetiva, em K. Nasce documentado e sem
   * consumidor — a lei de cor por classe espectral é da Onda 7. Hoje a
   * cor sai da paleta H-alfa inline dos `sol/*.js`, que é override
   * declarado da instância 1.
   */
  readonly teffK?: number;
  /**
   * RESERVADO: envelope convectivo (granulação). O núcleo do doador não
   * tem caminho radiativo — `sol/granulation.js` roda incondicionalmente
   * — e abrir um exigiria editar os 14 vendorizados. Fica declarado
   * porque é o parâmetro que decide se uma estrela tem grânulos, e a
   * Onda 7 vai precisar dele para as classes quentes.
   */
  readonly convective: boolean;
  /** Fase do ciclo no arranque e no pico da dramaturgia. */
  readonly cyclePhaseMin: number;
  readonly cyclePhaseMax: number;
  /** Janela da dramaturgia, em s de tempo de VIAGEM. */
  readonly dramaT0: number;
  readonly dramaT1: number;
  /** Semente-mãe dos streams determinísticos da instância. */
  readonly seed: number;
  /** Prefixo dos knobs por URL (`?solcvol=0`). Por instância. */
  readonly knobPrefix: string;
  /** Defaults de fábrica dos knobs que o NÚCLEO lê. */
  readonly knobs: Readonly<Record<string, number>>;
}

// ============================================================
// AS DUAS PONTES DE ESCALA PARA O GLSL (F1 da onda do Sol real).
//
// Os dois raymarches vendorizados (`sol/coronaVolume.js`, `sol/cme.js`)
// escrevem o raio DENTRO do texto do shader, e o fazem com dois números
// que só funcionam na escala artística. Com o raio físico do Sol
// (2,2567e-8 pc) os dois QUEBRAM EM SILÊNCIO — sem erro de compilação,
// sem uma linha de console, sem nada na tela além da ausência:
//
//  1. `(2.2567e-8).toFixed(6)` devolve literalmente a string
//     `"0.000000"`. O `#define SUN_R` vira ZERO, o `1.0/SUN_R` de
//     `cme.js` vira infinito, e a coroa e a ejeção de massa somem.
//  2. O guarda de segmento degenerado usa `1e-4` ABSOLUTO em unidade de
//     mundo. A travessia inteira do volume de coroa do Sol real mede
//     1,30e-7 pc — 769× menor que esse limiar: todo raio desiste antes
//     de começar.
//
// As duas pontes moram AQUI, na casa, e não nos arquivos vendorizados:
// lá dentro muda uma linha cada, que só lê o que este adaptador manda
// (`ctx.SUN_R_GLSL`, `ctx.SEG_EPS_GLSL`), com o caminho antigo intacto
// no `||` para quem construir o ctx sem elas. É a menor cirurgia
// possível sobre a promessa de não abrir o núcleo (cabeçalho deste
// arquivo), e ela é o oposto de silenciosa: `stellarBody.test.ts` tem
// teste-agulha que reprova se o raio voltar a virar `"0.000000"`.
// ============================================================

/**
 * Um literal float de GLSL que sobrevive a raio pequeno — e que devolve
 * EXATAMENTE a string de sempre para o raio artístico, que é o que
 * mantém as 24 vistas oficiais bit-idênticas com a porta desligada.
 *
 * A regra: usa-se a forma fixa de 6 casas (a herdada) SE ela voltar ao
 * mesmo float de 32 bits; senão, notação exponencial de 9 casas, que o
 * GLSL ES 3.0 aceita (tem ponto decimal e expoente). `Math.fround`
 * porque é em float32 que o shader vai viver — comparar em double
 * reprovaria formas que a GPU não distingue.
 */
export function literalGlsl(v: number): string {
  const fixo = v.toFixed(6);
  return Math.fround(Number(fixo)) === Math.fround(v) ? fixo : v.toExponential(9);
}

/**
 * O limiar de "segmento curto demais para marchar", como texto de GLSL.
 *
 * O valor herdado (`1e-4`) é ABSOLUTO e foi calibrado quando o raio da
 * cena era o artístico; o certo é ele ser PROPORCIONAL ao raio, que é o
 * que o torna portátil para qualquer instância (a mesma lição da régua
 * por ângulo de `lodStellar.ts`).
 *
 * O RAMO LITERAL PARA O RAIO ARTÍSTICO MORREU NA F3, como este
 * comentário prometia por escrito desde a F1 ("quando a F3 tirar o raio
 * artístico de cena, este ramo morre junto com ele"). Sobra a lei
 * proporcional, e ela é a mesma conta que o ramo morto fazia: o epsilon
 * vale **0,909% do raio do corpo** — `1e-4` de mundo sobre os 0,011 pc
 * em que foi calibrado. A âncora continua sendo o raio artístico porque
 * é dele que o 1e-4 nasceu; trocá-la pelo raio real mudaria o número
 * fingindo que a calibração foi refeita, que é a mentira de procedência
 * que o cadastro de escala existe para impedir.
 */
export function epsilonDeSegmentoGlsl(raioPc: number): string {
  return literalGlsl(raioPc * (1e-4 / RAIO_ARTISTICO_DO_SOL_PC));
}

/**
 * A instância 1. Todo campo aqui reproduz o literal que estava solto no
 * módulo antes da Onda 3: a promoção é de ENDEREÇO, não de valor, e o
 * gate de md5 desta fase é a prova.
 *
 * Dramaturgia do arranque (pedido do dono): o Sol acorda do MÍNIMO
 * (fase 0,02, disco quase limpo) na parede de fogo e chega ao MÁXIMO
 * (fase 0,50, solarMaxK pleno) no fim da hélice — dirigido pelo TEMPO
 * DE VIAGEM, então seek e capturas ?t= veem a fase certa daquele
 * instante. Depois da janela o ciclo segue vivo em 1× a partir do
 * máximo (decai devagar pelo resto da viagem).
 */
export const SOL_PARAMS: StellarParams = {
  nome: 'Sol',
  // O RAIO FÍSICO DA FOTOSFERA (F3), pela fonte única do cadastro — não
  // um 2,2567e-8 redigitado, e não mais o `WORLD.sunRadius` artístico
  // que ficou aqui da Onda 3 até 2026-08-13. É esta linha que faz o
  // fator do cadastro sair 1: `RAIO_DO_SOL_NA_CENA` é o MESMO símbolo
  // que `escala.ts` divide por `RAIO_SOL_PC` para acusar quem infla.
  radiusPc: RAIO_DO_SOL_NA_CENA,
  rotPeriodDays: SOL_ROT_PERIOD_DAYS,
  // inclinação real do eixo solar (~7,25°), como no original
  tiltRad: 0.1265,
  activityLevel: 1,
  teffK: 5772,
  convective: true,
  cyclePhaseMin: 0.02,
  cyclePhaseMax: 0.5,
  dramaT0: 5, // s de viagem (fim da parede de fogo)
  dramaT1: 29, // s de viagem (fim da hélice)
  seed: 20260803,
  knobPrefix: 'sol',
  knobs: SOL_KNOBS,
};

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export class StellarBody {
  readonly group = new THREE.Group();
  readonly params: StellarParams;
  /** rad/s de tela, derivado de `params.rotPeriodDays` no construtor */
  private readonly rotSpeed: number;
  private ctx: any;
  private lastTime = -1;
  private simAccum = 0;
  private chromoAccum = 0;
  private scale: number;
  private camDirN = new THREE.Vector3(0, 0, 1);
  private limboFade = 1;
  private kn: Record<string, number>;
  private sunRotM4 = new THREE.Matrix4();
  private camRightTmp = new THREE.Vector3();
  private camUpTmp = new THREE.Vector3();
  private promNormal = new THREE.Vector3();
  private promWorldTmp = new THREE.Vector3();

  constructor(
    params: StellarParams,
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    quality: QualityLevel
  ) {
    this.params = params;
    this.rotSpeed = rotSpeedFromPeriod(params.rotPeriodDays);
    this.scale = params.radiusPc / DONOR_RADIUS;
    this.group.scale.setScalar(this.scale);

    const tier = TIERS[TIER_FOR[quality]];
    const srand = mulberry32(params.seed);
    // knobs por URL (?solcvol=0 etc.) — a URL é a fonte de verdade,
    // como no resto do app; sem query, os defaults de fábrica valem.
    // `activityLevel` escala os dois knobs de atividade ANTES da URL:
    // no Sol ele é 1, e `1 * x` é o mesmo bit que x — a instância 1 sai
    // idêntica à de antes da parametrização.
    const kn: Record<string, number> = { ...params.knobs };
    kn.spots *= params.activityLevel;
    kn.cycle *= params.activityLevel;
    const q = new URLSearchParams(window.location.search);
    for (const k of Object.keys(kn)) {
      const v = Number.parseFloat(q.get(params.knobPrefix + k) ?? '');
      if (Number.isFinite(v)) kn[k] = v;
    }
    this.kn = kn;
    const ctx: any = {
      renderer,
      // as fábricas fazem ctx.scene.add(mesh) — um Group serve
      scene: this.group,
      // o CME captura ctx.camera na CRIAÇÃO (cme.js:10) — tem de ser a real
      camera,
      // raio em unidades de MUNDO para os raymarches de cvol/cme
      // (cameraPosition/vWorld são parsec — ver patches "transplante:")
      SUN_RADIUS_WORLD: params.radiusPc,
      // as duas pontes de escala para o texto do GLSL (F1) — sem elas o
      // raio físico vira "0.000000" e o guarda de segmento mata todo
      // raio antes do primeiro passo. Ver o bloco acima de SOL_PARAMS.
      SUN_R_GLSL: literalGlsl(params.radiusPc),
      SEG_EPS_GLSL: epsilonDeSegmentoGlsl(params.radiusPc),
      TP: tier,
      TIER: TIER_FOR[quality],
      FBM_OCTAVES: tier.fbm,
      SPHERE_SEG: tier.seg,
      SIM_W: tier.simW,
      SIM_H: tier.simH,
      PROMINENCE_COUNT: tier.prom,
      // streams próprios como no config.js de lá (semeados: capturas
      // reproduzíveis; o three não consome estes streams)
      srand,
      spotRand: mulberry32(params.seed ^ 0x59075eed),
      loopRand: mulberry32(params.seed ^ 0x5eedc0de),
      cmeRand: mulberry32(params.seed ^ 0x00c0e5ed),
      knob: (name: string) => kn[name] ?? 0,
      getControl: (name: string) => kn[name] ?? 0,
      getAppliedControl: (name: string) => kn[name] ?? 0,
      TIME_SCALE: 1, EDU_K: 0, CYCLE_K: kn.cycle, LAPSE_K: 0,
      FPROM_K: kn.fprom, SPOTS_K: kn.spots, LOOP_K: kn.loops,
      CVOL_K: kn.cvol, CME_K: kn.cme,
      DET: false,
      subToggle: {
        sim: true, bake: true, corona: true, corona3d: true,
        loops: true, spots: true, prom: true, cme: true, cmepts: true,
      },
      eduEvent: () => false,
      diagEvent: () => {},
      markInteraction: () => {},
      directorUserExit: null,
      launchCME: () => {},
      maybeLaunchCME: () => {},
      elapsed: 0,
      // fase inicial 0,02 (mínimo profundo): tot = 0,35 + 1206/1800 = 1,02
      cycleTime: (1 + params.cyclePhaseMin - 0.35) * 1800,
      cycleWarp: 0,
      solarMaxK: 0,
      surfFlareT: 999,
      surfFlareAmp: 0,
      surfFlareCooldown: 6,
      flareSeedVal: 0,
      bakeStep: -1,
      bakeTime: 0,
      bakeSwapT: 0,
      bakeCycleDt: 0.4,
      camDist: DONOR_FIT,
      fitDist: DONOR_FIT,
      MACRO_SLOW,
      ROT_SPEED: this.rotSpeed,
      rtType: THREE.HalfFloatType,
      isHDR: true,
      quadCamera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
      makeFullscreenScene: (material: THREE.Material) => {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        mesh.frustumCulled = false;
        const s = new THREE.Scene();
        s.add(mesh);
        return s;
      },
    };
    ctx.NOISE_GLSL = NOISE_GLSL.replace('i<5;', 'i<' + tier.fbm + ';');
    ctx.tuneLic = (src: string) =>
      tier.lic7
        ? src
        : src
            .replace(/int i=-6;i<=6/g, 'int i=-3;i<=3')
            .replace(/float\(i\)\/6\.0/g, 'float(i)/3.0');
    this.ctx = ctx;

    // Ordem de criação do main.js original — dependências implícitas
    ctx.gran = createGranulation(ctx);
    ctx.simRTs = ctx.gran.simRTs;
    ctx.simUniforms = ctx.gran.simUniforms;
    ctx.simRTOptions = ctx.gran.simRTOptions;
    ctx.pil = createPIL(ctx);
    createSunBase(ctx);
    ctx.act = createActivity(ctx);
    ctx.charges = ctx.act.charges;
    ctx.pairStates = ctx.act.pairStates;
    createSunUniforms(ctx);
    ctx.chromo = createChromo(ctx);
    createSunMesh(ctx);
    ctx.sunInvRot = new THREE.Matrix3();
    createCoronaRays(ctx);
    createCoronaVolume(ctx);
    createCME(ctx);
    // partículas do CME: -mv.z em parsec de volta à régua do doador
    // meshes NASCE [null, null] (cme.js) e o tier low nunca as preenche
    // (cmen=0 desliga o subsistema inteiro) — sem o m?. o construtor
    // estourava em ?q=performance. Ficou escondido porque o ?q= só era
    // aplicado DEPOIS do init: o tier low nunca tinha rodado.
    for (const m of ctx.cmePts?.meshes ?? []) {
      if (m?.material?.uniforms?.uZScale) m.material.uniforms.uZScale.value = 1 / this.scale;
    }
    createSpicules(ctx);
    ctx.prom = createProminences(ctx);
    createLoops(ctx);
    createFlares(ctx);

    // inclinação do eixo (Sol: ~7,25°, como no original)
    ctx.sunMesh.rotation.z = params.tiltRad;
    ctx.prominenceGroup.rotation.z = params.tiltRad;
    ctx.spiculeMesh.rotation.z = params.tiltRad;
    ctx.loopGroup.rotation.z = params.tiltRad;

    this.prime(renderer);
  }

  // Sim + bake síncronos: evolui o Br na direção das cargas ATUAIS e
  // publica um retrato completo da cromosfera. Usado pelo prime e pelo
  // catch-up de saltos de fase (seek/captura, quando delta=0 e o bake
  // fatiado nunca rodaria).
  private bakeNow(simSteps: number) {
    const ctx = this.ctx;
    const prevRT = ctx.renderer.getRenderTarget();
    for (let i = 0; i < simSteps; i++) ctx.gran.stepSimulation(SIM_DT);
    ctx.act.updateActiveRegions(ctx.elapsed + ctx.cycleWarp);
    ctx.chromo.snapshotBakeInputs();
    for (let s = 0; s < 8; s++) ctx.chromo.bakeChromoSlice(s, ctx.elapsed);
    ctx.bakePrev = ctx.bakeCur = ctx.bakeWrite;
    ctx.bakeWrite = (ctx.bakeCur + 1) % 3;
    ctx.bakeSwapT = ctx.elapsed;
    const set = ctx.bakeSets[ctx.bakeCur];
    ctx.sunUniforms.uChromoTex.value = set.s.texture;
    ctx.sunUniforms.uChromoFar.value = set.c.texture;
    ctx.sunUniforms.uChromoTexP.value = set.s.texture;
    ctx.sunUniforms.uChromoFarP.value = set.c.texture;
    ctx.sunUniforms.uBakeMix.value = 1;
    ctx.renderer.setRenderTarget(prevRT);
  }

  // Estado apresentável ANTES do primeiro frame (e do t=0 das capturas):
  // semente + relaxamento LONGO do sim (o Br semeado precisa convergir
  // para as cargas fracas do mínimo — senão o disco nasce com filamentos
  // de campo que não existe) + um bake completo. Sob o véu.
  private prime(renderer: THREE.WebGLRenderer) {
    const ctx = this.ctx;
    const prev = renderer.getRenderTarget();
    if (ctx.gran.seedSimulation) ctx.gran.seedSimulation();
    this.bakeNow(320);
    // coroa volumétrica: corre a máquina de fatias até a 1ª publicação —
    // sem isto, capturas ?shot= (delta 0) nunca a veriam
    for (let i = 0; i < 220 && !ctx.cvolReady; i++) {
      if (ctx.CVOL_STEPS > 0) ctx.cvolFrame(true, 1 / 30, false);
      else break;
    }
    renderer.setRenderTarget(prev);
  }

  // (sem warmupMaterials: os quads de sim/bake compilam no prime(),
  // com RT amarrado — a variante certa; os meshes do group entram na
  // cena antes do compileAsync do director e são cobertos por ele)

  /**
   * O corpo tem um retrato COMPLETO publicado: nenhum bake fatiado a meio
   * caminho (`bakeStep < 0` — as 8 fatias publicam de uma vez, e capturar
   * no meio mostraria meia cromosfera nova sobre meia velha) e a coroa
   * volumétrica já na primeira publicação (`cvolReady`, que o `prime` roda
   * até acontecer justamente porque sob `?shot=` o delta é 0 e a máquina
   * de fatias nunca giraria).
   *
   * SOMENTE LEITURA, e isso é contrato: quem consulta é o sinal de
   * prontidão do harness de captura (`window.__director.captura`). Nenhum
   * ramo daqui escreve estado nem toca no caminho de render — se tocasse,
   * o gate de identidade estaria medindo a própria régua.
   */
  get assentado(): boolean {
    const ctx = this.ctx;
    return ctx.bakeStep < 0 && (!(ctx.CVOL_STEPS > 0) || Boolean(ctx.cvolReady));
  }

  /** relógio visual do director (0 sob ?shot=) + câmera + tempo de viagem */
  update(time: number, camera: THREE.PerspectiveCamera, journeyT?: number) {
    const ctx = this.ctx;
    ctx.camera = camera;
    const delta = this.lastTime < 0 ? 0 : Math.min(Math.max(time - this.lastTime, 0), 0.1);
    this.lastTime = time;

    ctx.elapsed += delta;
    ctx.sunUniforms.uTime.value = ctx.elapsed;

    // câmera em unidades de doador, corrigida por fov: o LOD do disco
    // de lá foi calibrado a fov 42° — mesmo enquadramento, mesmo LOD
    const fovCorr =
      Math.tan((camera.fov * Math.PI) / 360) / DONOR_HALF_FOV;
    ctx.camDist = (camera.position.length() / this.scale) * fovCorr;
    ctx.sunUniforms.uCamDist.value = ctx.camDist;
    this.camDirN.copy(camera.position).normalize();
    ctx.camDirN = this.camDirN;

    // Fade das camadas de LIMBO além do regime do doador: o zoom de lá
    // parava em ~14 R e a dose proeminência+bloom nunca foi calibrada
    // para vista afastada (viravam bolas de bloom no recuo da hélice).
    // Fisicamente proeminências/loops somem a distâncias estelares.
    const fk = (ctx.camDist - 35) / 25;
    this.limboFade = fk <= 0 ? 1 : fk >= 1 ? 0 : 1 - fk * fk * (3 - 2 * fk);
    ctx.prominenceGroup.visible = this.limboFade > 0.01;
    ctx.loopGroup.visible = this.limboFade > 0.01;

    // O CROSSFADE DISCO→ESTRELA MORREU AQUI NA F3, e o que ficou no
    // lugar dele é a ausência de lei: `uWorldFade` vale 1 SEMPRE.
    //
    // A conta que autoriza, e ela é curta. A atenuação antiga era
    // `solWorldFade = discWorldFade × deepDiscFade`, duas rampas em
    // parsec que só faziam sentido para um corpo de 0,011 pc de raio: a
    // de longe (0,16→0,34 pc) apagava um disco que, inflado, ainda
    // media 3,9° a 0,16 pc; a de perto (0,05→0,02 pc) apagava o mesmo
    // disco antes de a fotosfera de 2.269 UA engolir a órbita de
    // Netuno. Com raio FÍSICO o corpo mede 4 px a 3,60 UA e 5,5e-4 px no
    // antigo piso do filme — a perspectiva apaga sozinha, e muito antes.
    // Manter as rampas com o raio novo seria pior que inútil: normalizada
    // pelo raio, a rampa de perto dissolveria a fotosfera entre 4,5 e
    // 1,8 RAIOS SOLARES, ou seja exatamente onde a F4 quer descer.
    //
    // O gate de custo também sai daqui: quem apaga o grupo agora é o
    // Director, pela régua do palco (4 px, com o cushion 2× da
    // histerese) — a MESMA que governa Terra e Lua, e a única que
    // continua fazendo uma pergunta respondível ("este corpo é
    // representável como corpo?"). Aqui sobra ler a decisão dele.
    //
    // O ZERO PIXEL desta remoção nas três vistas de raio físico da F1 é
    // aritmético e não medido: em `solreal4mkm` e `solreal1ua` as duas
    // rampas antigas já devolviam 1 EXATO (a de perto normalizada dava
    // 0,063 e 2,36 pc equivalentes, ambos acima de 0,05), e em
    // `solreal40ua` o grupo já estava apagado pelo gate de 4 px.
    ctx.sunUniforms.uWorldFade.value = 1;
    ctx.spiculeUniforms.uWorldFade.value = 1;
    ctx.coronaRaysUniforms.uRayBoost.value = this.kn.ray;
    ctx.coronaRaysUniforms.uHalo.value = this.kn.halo;
    if (!this.group.visible) return;

    // --- simulação de convecção, fatiada (guard-5 + dreno, como lá) ---
    this.simAccum += delta;
    let guard = 0;
    while (this.simAccum >= ctx.TP.simStep && guard < 5) {
      this.simAccum -= ctx.TP.simStep;
      ctx.gran.stepSimulation(SIM_DT);
      guard++;
    }
    if (this.simAccum > ctx.TP.simStep) this.simAccum = ctx.TP.simStep;

    // --- bake estrutural ~8 Hz, 8 fatias, publicação com crossfade ---
    this.chromoAccum += delta;
    if (ctx.bakeStep < 0 && this.chromoAccum >= 0.12 && delta > 0) {
      this.chromoAccum = 0;
      ctx.bakeStep = 0;
      ctx.bakeTime = ctx.elapsed;
      ctx.chromo.snapshotBakeInputs();
    }
    if (ctx.bakeStep >= 0) {
      ctx.chromo.bakeChromoSlice(ctx.bakeStep, ctx.bakeTime);
      ctx.bakeStep++;
      if (ctx.bakeStep >= 8) {
        ctx.bakeStep = -1;
        ctx.bakePrev = ctx.bakeCur;
        ctx.bakeCur = ctx.bakeWrite;
        ctx.bakeWrite = ctx.bakeCur === ctx.bakePrev ? (ctx.bakeCur + 1) % 3 : 3 - ctx.bakeCur - ctx.bakePrev;
        ctx.bakeCycleDt = Math.max(0.05, Math.min(4.5, (ctx.elapsed - ctx.bakeSwapT) * 0.85));
        ctx.bakeSwapT = ctx.elapsed;
        ctx.sunUniforms.uChromoTex.value = ctx.bakeSets[ctx.bakeCur].s.texture;
        ctx.sunUniforms.uChromoFar.value = ctx.bakeSets[ctx.bakeCur].c.texture;
        ctx.sunUniforms.uChromoTexP.value = ctx.bakeSets[ctx.bakePrev].s.texture;
        ctx.sunUniforms.uChromoFarP.value = ctx.bakeSets[ctx.bakePrev].c.texture;
      }
    }
    ctx.sunUniforms.uBakeMix.value = Math.min(1, (ctx.elapsed - ctx.bakeSwapT) / ctx.bakeCycleDt);

    // --- rotação + inversa compartilhada (tilt+spin) ---
    ctx.sunMesh.rotation.y += this.rotSpeed * delta;
    ctx.prominenceGroup.rotation.y = ctx.sunMesh.rotation.y;
    ctx.spiculeMesh.rotation.y = ctx.sunMesh.rotation.y;
    ctx.loopGroup.rotation.y = ctx.sunMesh.rotation.y;
    this.sunRotM4.makeRotationFromQuaternion(ctx.sunMesh.quaternion);
    ctx.sunInvRot.setFromMatrix4(this.sunRotM4).transpose();
    ctx.spiculeUniforms.uTime.value = ctx.elapsed;

    // --- ciclo de 11 anos + regiões ativas ---
    ctx.act.tickCycleEvent(delta);
    if (ctx.act.cycleDepth() > 0.001) {
      const cycMul = ctx.act.cycleMultiplier();
      ctx.cycleTime += delta * cycMul;
      if (cycMul > 1.0) ctx.cycleWarp += delta * (cycMul - 1.0);
      // dramaturgia do arranque: mínimo→máximo dirigido pelo tempo de
      // viagem (só empurra para FRENTE; depois da janela o relógio
      // natural assume e o snap vira no-op)
      if (journeyT !== undefined) {
        const p = this.params;
        const k = Math.min(1, Math.max(0, (journeyT - p.dramaT0) / (p.dramaT1 - p.dramaT0)));
        const eased = k * k * (3 - 2 * k);
        const desired =
          (1 + p.cyclePhaseMin + (p.cyclePhaseMax - p.cyclePhaseMin) * eased - 0.35) * 1800;
        if (desired > ctx.cycleTime) {
          const jump = desired - ctx.cycleTime;
          ctx.cycleWarp += jump;
          ctx.cycleTime = desired;
          // salto grande (seek/captura, não o avanço suave do play):
          // o Sol "vive" o salto na hora — sim + bake síncronos, senão
          // a fotografia mostra fase nova com cromosfera velha
          if (jump > 20) {
            ctx.act.updateCycleState();
            this.bakeNow(120);
          }
        }
      }
      ctx.act.updateCycleState();
    } else if (ctx.solarMaxK !== 0) ctx.solarMaxK = 0;
    ctx.sunUniforms.uMaxK.value = ctx.solarMaxK;
    ctx.act.updateActiveRegions(ctx.elapsed + ctx.cycleWarp);

    // --- flare de superfície (duas fases; sem CME na fase 1) ---
    if (delta > 0) {
      ctx.surfFlareCooldown -= delta;
      if (ctx.surfFlareCooldown <= 0) {
        if (ctx.triggerSurfaceFlare()) {
          ctx.surfFlareT = 0;
          // flare grande pode soltar CME (sorteio no stream próprio)
          ctx.maybeLaunchCME();
        }
        ctx.surfFlareCooldown =
          (12 + ctx.srand() * 14) / (0.5 + 1.1 * ctx.coronaRaysUniforms.uActivity.value);
      }
      ctx.surfFlareT += delta;
    }
    const sfImp = ctx.flareEnvImp(ctx.surfFlareT);
    const sfGrad = ctx.flareEnvGrad(ctx.surfFlareT);
    let sfEnv = sfImp * 1.7 * ctx.surfFlareAmp;
    let sfRib = (0.45 * sfImp + 0.85 * sfGrad) * 1.7 * ctx.surfFlareAmp;
    if (sfEnv < 0.004) sfEnv = 0;
    if (sfRib < 0.004) sfRib = 0;
    const sfSep = 0.018 + 0.05 * (1.0 - Math.exp(-ctx.surfFlareT * 0.45));
    const sfLen = 0.055 + 0.04 * (1.0 - Math.exp(-ctx.surfFlareT * 0.45));
    ctx.sunUniforms.uFlare.value.set(ctx.surfFlareDir.x, ctx.surfFlareDir.y, ctx.surfFlareDir.z, sfEnv);
    ctx.sunUniforms.uFlareGeo.value.set(ctx.flareTanDir.x, ctx.flareTanDir.y, ctx.flareTanDir.z, sfSep);
    ctx.sunUniforms.uFlarePerp.value.set(ctx.flarePerpDir.x, ctx.flarePerpDir.y, ctx.flarePerpDir.z, sfLen);
    ctx.sunUniforms.uFlareRib.value.set(
      sfRib, 0.01, ctx.flareSeedVal,
      Math.min(2.6, Math.max(1.0, ctx.fitDist / ctx.camDist))
    );

    // --- loops coronais + arcada pós-flare ---
    ctx.updateLoops(delta);

    // --- CME: relógio, casca e partículas (episódico; custo ~zero fora) ---
    if (ctx.cmePts?.on) {
      ctx.cmePts.meshes[0].rotation.y = ctx.sunMesh.rotation.y;
      ctx.cmePts.meshes[1].rotation.y = ctx.sunMesh.rotation.y;
    }
    ctx.updateCME(delta);

    // --- proeminências: ciclo de vida, campo, agitação, orientação ---
    ctx.promStates.forEach((ps: any) => {
      const lx = ((ctx.elapsed + ps.phase) % ps.period) / ps.period;
      ps.env = ctx.act.lifeEnvelope(lx);
      if (lx >= 0.9) {
        if (!ps.reborn) {
          ctx.placeProminence(ps, ctx.sampleProminenceAnchor());
          ps.reborn = true;
        }
      } else ps.reborn = false;
      const Bm = ctx.act.bFieldJS(ps.meshes[0].userData.dir).length();
      const fieldK = Math.min(1.2, 0.35 + 0.65 * (Bm / 1.1));
      ps.fieldK = ps.fieldK === undefined ? fieldK : ps.fieldK + (fieldK - ps.fieldK) * Math.min(1, delta * 0.8);
      ps.agitT = ps.agitT === undefined ? 999 : ps.agitT + delta;
      ps.agit = (1.0 - Math.exp(-ps.agitT * 3.0)) * Math.exp(-ps.agitT * 0.55);
      if (ps.agit < 0.004) ps.agit = 0;
      ps.drift = (ps.drift || 0) + delta * (1.0 + 4.0 * ps.agit);
      if (!ps.orient) ps.orient = [0, 0];
      for (let oi = 0; oi < 2; oi++) {
        ps.meshes[oi].getWorldDirection(this.promNormal);
        const nv = Math.abs(this.promNormal.dot(this.camDirN));
        const ek = Math.min(1, Math.max(0, (nv - 0.03) / 0.13));
        ps.orient[oi] = (1.0 - 0.5 * nv) * ek * ek * (3 - 2 * ek);
      }
      ps.orientNorm = 1.05 / Math.max(0.45, ps.orient[0] + ps.orient[1]);
      if (ctx.FPROM_K > 0.001) {
        ps.flat.visible = true;
        const facingF = this.promWorldTmp
          .copy(ps.flat.userData.dir)
          .applyQuaternion(ctx.prominenceGroup.quaternion)
          .dot(this.camDirN);
        let sF = Math.min(1, Math.max(0, (facingF - 0.1) / 0.42));
        sF = sF * sF * (3.0 - 2.0 * sF);
        const fu = ps.flat.material.uniforms;
        fu.uLife.value = ps.env;
        fu.uAgit.value = ps.agit;
        fu.uPTime.value = ps.drift;
        fu.uTime.value = ctx.elapsed;
        fu.uAbsorb.value =
          Math.min(1.0, ctx.FPROM_K) * 0.45 * sF * Math.min(1.0, ps.fieldK) * this.limboFade;
      } else if (ps.flat.visible) ps.flat.visible = false;
    });
    ctx.prominenceMeshes.forEach((m: any) => {
      const ps = m.userData.state;
      m.material.uniforms.uLife.value = ps.env;
      m.material.uniforms.uAgit.value = ps.agit;
      m.material.uniforms.uPTime.value = ps.drift;
      const famp = 0.16 + 0.14 * ps.fieldK + 0.45 * ps.agit;
      const f = 0.65 + famp * ctx.act.flicker1f(ctx.elapsed * m.userData.speed + m.userData.phase);
      let base = Math.max(0.55, Math.min(1.15, f + 0.2));
      base *= 0.3 + 0.7 * ps.env;
      base *= ps.fieldK;
      base += 1.6 * ps.agit;
      const facing = this.promWorldTmp
        .copy(m.userData.dir)
        .applyQuaternion(ctx.prominenceGroup.quaternion)
        .dot(this.camDirN);
      let s = Math.min(1, Math.max(0, (facing - 0.1) / 0.42));
      s = s * s * (3.0 - 2.0 * s);
      base *= 0.05 + 0.95 * (1.0 - s);
      base *= ps.orient[m.userData.twinIdx] * ps.orientNorm;
      m.material.uniforms.uIntensity.value = base * this.limboFade;
      m.material.uniforms.uTime.value = ctx.elapsed;
    });
    ctx.flushProminences();

    // --- coroa (plano de raias): billboard + atividade global ---
    ctx.coronaRays.quaternion.copy(camera.quaternion);
    ctx.coronaRaysUniforms.uTime.value = ctx.elapsed;
    this.camRightTmp.set(1, 0, 0).applyQuaternion(camera.quaternion);
    this.camUpTmp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    ctx.coronaRaysUniforms.uRight.value.copy(this.camRightTmp);
    ctx.coronaRaysUniforms.uUp.value.copy(this.camUpTmp);
    let actSum = 0;
    for (let ai = 0; ai < ctx.pairStates.length; ai++) actSum += Math.abs(ctx.pairStates[ai].lead.w);
    ctx.coronaRaysUniforms.uActivity.value = Math.min(1.0, actSum / 4.0);

    // --- coroa volumétrica: uniforms + scheduler fatiado do sampler3D ---
    if (ctx.CVOL_STEPS > 0) {
      const cvolOn = ctx.CVOL_K > 0.001 && !ctx.cvolKilled;
      const cvolShow = cvolOn && ctx.cvolReady;
      ctx.coronaVol.visible = cvolShow;
      ctx.coronaRaysUniforms.uCvolMix.value = cvolShow ? Math.min(1.0, ctx.CVOL_K) : 0.0;
      if (cvolShow) {
        ctx.coronaVol.quaternion.copy(camera.quaternion);
        ctx.cvolUniforms.uCvol.value = ctx.CVOL_K;
        ctx.cvolUniforms.uTime.value = ctx.elapsed;
        ctx.cvolUniforms.uActivity.value = ctx.coronaRaysUniforms.uActivity.value;
        // rotação PURA (matrixWorld herdaria a escala do group)
        ctx.cvolInvRot.copy(ctx.sunInvRot);
      }
      ctx.cvolFrame(cvolOn, delta, false);
    }
  }

  dispose() {
    const ctx = this.ctx;
    // As proeminências são Object3D-PROXY com `material = { uniforms }`
    // (prominences.js): objeto simples, SEM dispose. Chamar dispose() em
    // qualquer material truthy estourava aqui e abortava todo o teardown
    // — inclusive os RTs abaixo e o Engine (ver director.dispose).
    const free = (x: any) => x?.dispose?.();
    this.group.traverse((o: any) => {
      free(o.geometry);
      const m = o.material;
      if (Array.isArray(m)) m.forEach(free);
      else free(m);
    });
    for (const rt of ctx.simRTs ?? []) rt.dispose();
    for (const set of ctx.bakeSets ?? []) {
      set.c?.dispose?.();
      set.s?.dispose?.();
    }
    // Data3DTexture da coroa volumétrica: material.dispose() NÃO dispõe
    // texturas, e esta não pertence a nenhum material do traverse.
    free(ctx.cvolTex);
  }
}
