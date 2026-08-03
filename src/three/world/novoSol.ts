// ============================================================
// NovoSol — o Sol procedural transplantado de Novo-Sol-Fable-3d
// (projeto irmão do mesmo autor; three 0.185, zero dependências).
//
// O núcleo vive VENDORIZADO VERBATIM em ./sol/ — fábricas
// createX(ctx) sem side-effects de import, exatamente como no
// original. Este arquivo é (a) o adaptador de contexto que o
// main.js de lá provia, e (b) a orquestração por frame portada
// do animate() original (sim fatiada, bake da cromosfera a 8 Hz
// em 8 fatias, ciclo de 11 anos, flares, proeminências, loops,
// coroa). O que NÃO viaja: pipeline de pós deles (bloom/ACES
// próprios — aqui o Sol atravessa o NOSSO composer), céu, UI,
// câmera, museu. Fase 2 pendente: coroa volumétrica (sampler3D)
// e CME (transform feedback).
//
// ESCALA: o núcleo trabalha em "unidades de doador" (raio 2.2);
// o group leva scale = sunRadius/2.2 e o uCamDist é alimentado
// em unidades de doador CORRIGIDAS por fov (o LOD do disco de
// lá foi calibrado a fov 42° — sem a correção, o enquadramento
// da parede de fogo a fov 26° leria como "longe").
//
// TEMPO: update(time) recebe o relógio VISUAL do director (0 sob
// ?shot=). delta<=0 congela tudo — por isso o construtor faz um
// PRIME síncrono (semente do sim + N passos + um bake completo):
// sem ele, captura em t=0 fotografaria o disco sem cromosfera.
// ============================================================
import * as THREE from 'three';
import { WORLD } from '../config';
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
const ROT_SPEED = 0.042;
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
const KNOBS: Record<string, number> = {
  spots: 1, cycle: 1, lapse: 0, speed: 1, pmode: 0,
  plageglow: 0.35, halo: 0.55, ray: 0.9, cact: 0.5,
  // cme 1,4 (doador: 0,9): a casca foi calibrada contra a exposição
  // 0,418 do pipeline de lá; no nosso ACES ela compete com a coroa
  // mais clara — 0,9 mal aparecia, 1,4 lê a estrutura de 3 partes
  loops: 0.55, fprom: 0.55, cvol: 0.5, cme: 1.4, edu: 0,
};

// Dramaturgia do arranque (pedido do dono): o Sol acorda do MÍNIMO
// (fase 0,02, disco quase limpo) na parede de fogo e chega ao MÁXIMO
// (fase 0,50, solarMaxK pleno) no fim da hélice — dirigido pelo TEMPO
// DE VIAGEM, então seek e capturas ?t= veem a fase certa daquele
// instante. Depois da janela o ciclo segue vivo em 1× a partir do
// máximo (decai devagar pelo resto da viagem).
const CYCLE_PHASE_MIN = 0.02;
const CYCLE_PHASE_MAX = 0.5;
const DRAMA_T0 = 5; // s de viagem (fim da parede de fogo)
const DRAMA_T1 = 29; // s de viagem (fim da hélice)

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
export class NovoSol {
  readonly group = new THREE.Group();
  private ctx: any;
  private lastTime = -1;
  private simAccum = 0;
  private chromoAccum = 0;
  private scale: number;
  private camDirN = new THREE.Vector3(0, 0, 1);
  private limboFade = 1;
  private sunRotM4 = new THREE.Matrix4();
  private camRightTmp = new THREE.Vector3();
  private camUpTmp = new THREE.Vector3();
  private promNormal = new THREE.Vector3();
  private promWorldTmp = new THREE.Vector3();

  constructor(
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    quality: QualityLevel
  ) {
    this.scale = WORLD.sunRadius / DONOR_RADIUS;
    this.group.scale.setScalar(this.scale);

    const tier = TIERS[TIER_FOR[quality]];
    const srand = mulberry32(20260803);
    // knobs por URL (?solcvol=0 etc.) — a URL é a fonte de verdade,
    // como no resto do app; sem query, os defaults de fábrica valem
    const kn: Record<string, number> = { ...KNOBS };
    const q = new URLSearchParams(window.location.search);
    for (const k of Object.keys(kn)) {
      const v = Number.parseFloat(q.get('sol' + k) ?? '');
      if (Number.isFinite(v)) kn[k] = v;
    }
    const ctx: any = {
      renderer,
      // as fábricas fazem ctx.scene.add(mesh) — um Group serve
      scene: this.group,
      // o CME captura ctx.camera na CRIAÇÃO (cme.js:10) — tem de ser a real
      camera,
      // raio em unidades de MUNDO para os raymarches de cvol/cme
      // (cameraPosition/vWorld são parsec — ver patches "transplante:")
      SUN_RADIUS_WORLD: WORLD.sunRadius,
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
      spotRand: mulberry32(20260803 ^ 0x59075eed),
      loopRand: mulberry32(20260803 ^ 0x5eedc0de),
      cmeRand: mulberry32(20260803 ^ 0x00c0e5ed),
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
      cycleTime: (1 + CYCLE_PHASE_MIN - 0.35) * 1800,
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
      ROT_SPEED,
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
    for (const m of ctx.cmePts?.meshes ?? []) {
      if (m.material?.uniforms?.uZScale) m.material.uniforms.uZScale.value = 1 / this.scale;
    }
    createSpicules(ctx);
    ctx.prom = createProminences(ctx);
    createLoops(ctx);
    createFlares(ctx);

    // inclinação real do eixo solar (~7,25°), como no original
    ctx.sunMesh.rotation.z = 0.1265;
    ctx.prominenceGroup.rotation.z = 0.1265;
    ctx.spiculeMesh.rotation.z = 0.1265;
    ctx.loopGroup.rotation.z = 0.1265;

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
    ctx.sunMesh.rotation.y += ROT_SPEED * delta;
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
        const k = Math.min(1, Math.max(0, (journeyT - DRAMA_T0) / (DRAMA_T1 - DRAMA_T0)));
        const eased = k * k * (3 - 2 * k);
        const desired =
          (1 + CYCLE_PHASE_MIN + (CYCLE_PHASE_MAX - CYCLE_PHASE_MIN) * eased - 0.35) * 1800;
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
    this.group.traverse((o: any) => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else if (m) m.dispose();
    });
    for (const rt of ctx.simRTs ?? []) rt.dispose();
    for (const set of ctx.bakeSets ?? []) {
      set.c?.dispose?.();
      set.s?.dispose?.();
    }
  }
}
