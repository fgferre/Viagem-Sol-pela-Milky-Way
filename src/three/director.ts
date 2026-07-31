// ============================================================
// Director — orquestra engine, mundo e cinemática.
// API consumida pelo React: eventos de legenda/progresso/fase.
// ============================================================
import * as THREE from 'three';
import { Engine } from './core/engine';
import type { QualityLevel } from './core/engine';
import { Post } from './core/post';
import { StarField, buildFarStars } from './world/stars';
import { Nebula } from './world/nebula';
import { Sun } from './world/sun';
import { Dust } from './world/dust';
import { projectLabels } from './world/labels';
import type { StarLabel } from './world/labels';
import { HeroStars } from './world/heroStars';
import { Galaxy, buildGalaxy, GAL, EX, EY, EZ, galactocentricToScene } from './world/galaxy';
import type { CartographyMode } from './world/galaxy';
import { ObservedClouds } from './world/observedClouds';
import { StarForges } from './world/starForges';
import { WrappedStars } from './world/wrappedStars';
import { loadGalacticAssets } from './cartography/galacticAssets';
import {
  bakeDustMap,
  DUST_MAP_SIZE,
  DUST_MAP_HALF_EXTENT,
} from './cartography/dustMap';
import { JourneyRig, FreeRoam } from './cinematic/cameraRig';
import { loadStarData, WORLD } from './config';
import type { StarsMeta } from './config';

export type Phase = 'loading' | 'intro' | 'journey' | 'end' | 'free';

interface DirectorEvents {
  onPhase: (p: Phase) => void;
  onCaption: (index: number, caption: string, sub?: string) => void;
  onProgress: (k: number) => void;
  onLabels: (labels: StarLabel[]) => void;
  onWarp: (k: number) => void;
  onQuality: (quality: QualityLevel) => void;
}

export class Director {
  private engine: Engine;
  private post: Post;
  private nebula: Nebula;
  private stars!: StarField;
  private farStars!: StarField;
  private heroes!: HeroStars;
  private galaxy!: Galaxy;
  private observedClouds: ObservedClouds | null = null;
  private starForges: StarForges | null = null;
  private wrappedStars!: WrappedStars;
  private dustMapTexture: THREE.Texture | null = null;
  /** nuvens do catálogo em coords de cena: x,y,z,raio,amp por registro */
  private seedCloudPool: Float32Array | null = null;
  private seedCloudScratch = new Float32Array(32 * 5);
  private seedCloudTimer = 0;
  private sun: Sun;
  private dust: Dust;
  private bgColor = new THREE.Color(0x000106);
  private rig = new JourneyRig();
  private roam: FreeRoam;
  private meta!: StarsMeta;

  private phase: Phase = 'loading';
  private journeyT = 0;
  /**
   * A trajetória do Ato III reatravessa o envelope do disco (t≈151–154)
   * já a ~15 kpc do Sol; na viagem ROTEIRIZADA, uma vez fora do disco o
   * ambiente fica desligado (latch) — o pull-back mostra o modelo da
   * galáxia, não uma nebulosa ressuscitada. Free-roam/?pos= não usam o
   * latch: lá o comportamento relocável instantâneo é o desejado.
   */
  private leftDisk = false;
  private lastCaptionIdx = -1;
  /** congela o relógio da viagem (debug/screenshots via ?freeze=1) */
  freezeJourney = false;
  private noNebula = false;
  private deepBg = new THREE.Color(0x010208);
  /** ?shot=1 congela o tempo visual — capturas determinísticas */
  private shotMode = false;
  /** prefers-reduced-motion: sem shake, sem pulso de warp/CA */
  private reducedMotion = false;
  /** toggles de debug: ?nogal=1&nosun=1&nodust=1&nohero=1&nocat=1 */
  private hide = new Set<string>();
  private events: DirectorEvents;
  private readonly abortController = new AbortController();
  private readonly debug = new URLSearchParams(window.location.search);
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, events: DirectorEvents) {
    this.events = events;
    this.engine = new Engine(canvas);
    this.post = new Post(this.engine.renderer, this.engine.scene, this.engine.camera);
    this.nebula = new Nebula(0.5);
    this.sun = new Sun();
    this.dust = new Dust();
    this.roam = new FreeRoam(canvas, this.engine.camera);
    this.engine.onQuality((quality) => {
      this.nebula.setScale(quality === 'performance' ? 0.35 : 0.5);
      // o preset de grão era config morta — nunca chegava ao shader
      this.post.setGrain(this.engine.preset.grain);
      this.events.onQuality(quality);
    });
    this.post.setGrain(this.engine.preset.grain);

    this.engine.onResize((w, h) => {
      this.nebula.setSize(w, h);
      this.post.setSize(w, h);
    });
    this.nebula.setSize(window.innerWidth, window.innerHeight);

    // debug via URL: ?nobloom=1
    if (this.debug.has('nobloom')) {
      this.post.bloom.enabled = false;
    }
    this.noNebula = this.debug.has('nonebula');
    this.shotMode = this.debug.has('shot');
    this.reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.reducedMotion) this.rig.shakeScale = 0;
    for (const k of [
      'nogal', 'nosun', 'nodust', 'nohero', 'nocat', 'nomarker', 'nocart', 'nowrap',
    ]) {
      if (this.debug.has(k)) this.hide.add(k);
    }

    this.engine.onTick((t, dt) => this.tick(t, dt));
  }

  async init() {
    // catálogo HYG + ativos cartográficos em paralelo; os segundos
    // são progressivos — sem eles a cena continua procedural.
    // ?cart=off não baixa os ~6 MB que ninguém consumiria.
    const cartMode: CartographyMode =
      this.debug.get('cart') === 'off'
        ? 'off'
        : this.debug.get('cart') === 'obs'
          ? 'observed'
          : 'blend';
    const [{ positions, meta }, galactic] = await Promise.all([
      loadStarData(this.abortController.signal),
      cartMode === 'off'
        ? Promise.resolve(null)
        : loadGalacticAssets(this.abortController.signal),
    ]);
    if (this.disposed) return;
    this.meta = meta;

    this.stars = new StarField(positions, 6, { pointScale: 6.0, tau: 0.045, maxPx: 48 });
    this.farStars = new StarField(buildFarStars(WORLD.farStarsCount), 6, {
      pointScale: 1.5,
      tau: 0.04,
      maxPx: 3,
    });
    this.heroes = new HeroStars(this.meta.named);

    // O mapa é bakeado SEMPRE: os canais B/A (braços/warp) alimentam
    // o envelope de gás do raymarch mesmo sem APOGEE (R/G zerados).
    const cartOn = Boolean(galactic) && cartMode !== 'off';
    const dustBake = bakeDustMap(cartOn && galactic ? galactic.dustDensity : null);
    this.dustMapTexture = dustBake.texture;
    this.galaxy = new Galaxy(
      buildGalaxy(
        20260730,
        cartOn
          ? {
              data: dustBake.coverage,
              size: DUST_MAP_SIZE,
              halfExtentPc: DUST_MAP_HALF_EXTENT,
            }
          : undefined
      ),
      dustBake.texture
    );
    this.galaxy.setCartography(
      this.debug.has('discoff') ? 'off' : galactic ? cartMode : 'off'
    );
    // congela as lâminas (estáticas) em texturas — depois do modo
    this.galaxy.bakeDiscLayers(this.engine.renderer);
    this.nebula.setDustMap(dustBake.texture, cartOn ? 1 : 0);
    if (galactic && cartMode !== 'off') {
      this.observedClouds = new ObservedClouds(
        galactic.molecularClouds,
        galactic.largeMolecularClouds
      );
      this.starForges = new StarForges(galactic);
      this.engine.scene.add(this.observedClouds.mesh);
      this.engine.scene.add(this.starForges.points);
      this.buildSeedCloudPool(galactic);
      if (dustBake) {
        console.info(
          `[cartografia] APOGEE ${(dustBake.coverageFraction * 100).toFixed(1)}% ` +
            'do disco com cobertura observacional.'
        );
      }
    }
    if (this.disposed) return;

    this.wrappedStars = new WrappedStars();
    this.engine.scene.add(this.wrappedStars.points);
    this.engine.scene.add(this.stars.points);
    this.engine.scene.add(this.farStars.points);
    this.engine.scene.add(this.sun.group);
    this.engine.scene.add(this.dust.points);
    this.engine.scene.add(this.heroes.group);
    this.engine.scene.add(this.galaxy.group);
    this.engine.scene.background = this.nebula.texture;
    this.engine.scene.backgroundIntensity = 1.0;

    this.setPhase('intro');
    this.engine.start();
  }

  private setPhase(p: Phase) {
    this.phase = p;
    this.events.onPhase(p);
  }

  /** nuvens CO/complexos em coords de cena para semear o raymarch */
  private buildSeedCloudPool(galactic: {
    molecularClouds: { data: Float32Array; count: number; stride: number };
    largeMolecularClouds: { data: Float32Array; count: number; stride: number };
  }) {
    const out: number[] = [];
    const scratch = new THREE.Vector3();
    {
      const { data, count, stride } = galactic.molecularClouds;
      for (let i = 0; i < count; i++) {
        const o = i * stride;
        if (data[o + 10] < 0.5) continue;
        const surface = data[o + 5];
        const amp = (surface / (surface + 130)) * 2.0;
        if (amp < 0.08) continue;
        galactocentricToScene(data[o], data[o + 1], data[o + 2], scratch);
        out.push(scratch.x, scratch.y, scratch.z, Math.max(data[o + 3] * 1.6, 14), amp);
      }
    }
    {
      const { data, count, stride } = galactic.largeMolecularClouds;
      for (let i = 0; i < count; i++) {
        const o = i * stride;
        const density = data[o + 4];
        galactocentricToScene(data[o], data[o + 1], data[o + 2], scratch);
        out.push(
          scratch.x, scratch.y, scratch.z,
          Math.max(data[o + 3] * 1.2, 60),
          (density / (density + 116)) * 1.6
        );
      }
    }
    this.seedCloudPool = new Float32Array(out);
  }

  /** seleciona as ≤32 nuvens do catálogo mais próximas da câmera */
  private updateSeedClouds(camPos: THREE.Vector3) {
    const pool = this.seedCloudPool;
    if (!pool) return;
    const reach = 900; // pc — alcance do raymarch + margem
    // rank pela distância à SUPERFÍCIE: um complexo que envolve a
    // câmera nunca é expulso por nuvens pequenas próximas
    const nearest: Array<{ sd: number; o: number }> = [];
    for (let o = 0; o < pool.length; o += 5) {
      const dx = pool[o] - camPos.x;
      const dy = pool[o + 1] - camPos.y;
      const dz = pool[o + 2] - camPos.z;
      const sd = Math.max(
        0,
        Math.sqrt(dx * dx + dy * dy + dz * dz) - pool[o + 3]
      );
      if (sd > reach) continue;
      nearest.push({ sd, o });
    }
    nearest.sort((a, b) => a.sd - b.sd);
    const n = Math.min(nearest.length, 32);
    // amplitude → 0 na fronteira de seleção: nuvens entram e saem do
    // conjunto invisíveis — sem popping a cada refresh de 0,25 s
    const cut = Math.max(nearest.length > 32 ? nearest[32].sd : reach, 1);
    for (let i = 0; i < n; i++) {
      const o = nearest[i].o;
      const t = i * 5;
      const edge = 1 - THREE.MathUtils.smoothstep(nearest[i].sd, cut * 0.8, cut);
      this.seedCloudScratch[t] = pool[o];
      this.seedCloudScratch[t + 1] = pool[o + 1];
      this.seedCloudScratch[t + 2] = pool[o + 2];
      this.seedCloudScratch[t + 3] = pool[o + 3];
      this.seedCloudScratch[t + 4] = pool[o + 4] * edge;
    }
    this.nebula.setSeedClouds(this.seedCloudScratch, n);
  }

  /** posiciona a câmera em modo livre (deep-links/screenshots ?pos=) */
  placeCamera(pos: [number, number, number], look?: [number, number, number]) {
    const cam = this.engine.camera;
    cam.position.set(pos[0], pos[1], pos[2]);
    if (look) cam.lookAt(look[0], look[1], look[2]);
    this.roam.enabled = true;
    this.roam.syncFromCamera();
    // o primeiro frame já renderiza com as nuvens-semente do lugar —
    // capturas ?pos= são determinísticas desde o frame 1
    this.updateSeedClouds(cam.position);
    this.seedCloudTimer = 0;
    this.setPhase('free');
    this.events.onCaption(-1, '', '');
    this.events.onWarp(0);
  }

  play() {
    this.journeyT = 0;
    this.lastCaptionIdx = -1;
    this.freezeJourney = false;
    this.leftDisk = false;
    this.rig.reset();
    this.roam.enabled = false;
    this.setPhase('journey');
  }

  /** salta para um instante da viagem (segundos) — usado por deep-links */
  seek(t: number) {
    this.journeyT = t;
    this.leftDisk = false;
    this.rig.reset(); // a mira suavizada também salta para o instante certo
  }

  get journeyDuration() {
    return this.rig.duration;
  }

  /** pausa/retoma a viagem; retorna o novo estado (true = pausado) */
  togglePause(): boolean {
    if (this.phase !== 'journey') return false;
    this.freezeJourney = !this.freezeJourney;
    return this.freezeJourney;
  }

  /** scrub pela barra de progresso (fração 0..1) */
  seekFraction(fraction: number) {
    if (this.phase === 'end') this.play();
    this.seek(THREE.MathUtils.clamp(fraction, 0, 1) * this.rig.duration);
  }

  enterFreeRoam() {
    this.roam.enabled = true;
    this.roam.syncFromCamera();
    this.setPhase('free');
    this.events.onCaption(-1, '', '');
    this.events.onLabels([]);
    this.events.onWarp(0); // a vinheta de warp ficava presa no CSS
  }

  setQuality(q: QualityLevel) {
    this.engine.applyQuality(q, true);
    this.nebula.setSteps(this.engine.preset.nebulaSteps);
  }

  get progressTicks(): number[] {
    return this.rig.ticks;
  }

  private tick(rawTime: number, dt: number) {
    // tempo VISUAL: congelado no modo foto (grão, pulsos, coroa e
    // deriva da poeira idênticos entre capturas do mesmo instante)
    const time = this.shotMode ? 0 : rawTime;
    const cam = this.engine.camera;
    let warp = 0;

    if (this.phase === 'journey') {
      if (!this.freezeJourney) this.journeyT += dt;
      const t = this.journeyT;
      const r = this.rig.apply(cam, t, dt);
      warp = r.warp;
      this.events.onProgress(Math.min(t / this.rig.duration, 1));
      this.events.onWarp(this.reducedMotion ? 0 : warp);

      const { index, key } = this.rig.captionAt(t);
      if (index !== this.lastCaptionIdx) {
        this.lastCaptionIdx = index;
        this.events.onCaption(index, key.caption, key.sub);
      }

      if (this.journeyT >= this.rig.duration) {
        this.setPhase('end');
        this.events.onWarp(0);
      }
    } else if (this.phase === 'free') {
      this.roam.update(dt);
    } else {
      // intro/end: deriva lenta contemplativa
      if (this.phase === 'intro') {
        const r = this.rig.apply(cam, 0, dt);
        warp = r.warp;
      }
    }

    // a matriz da câmera precisa estar atual ANTES de projeções e
    // extrações de base — labels usavam a matriz do frame anterior
    cam.updateMatrixWorld(true);

    // mundo
    const hPx = this.engine.renderer.domElement.height;
    const dHome = cam.position.length();
    this.engine.updateClip(dHome);

    // A Via Láctea não é um plano: os fades de AMBIENTE respondem à
    // posição da câmera no DISCO (R, z galactocêntricos), não à
    // distância do Sol — o volume local existe em qualquer ponto da
    // galáxia. Só camadas fisicamente solares continuam com dHome.
    const qx = cam.position.x - GAL.GC_POS.x;
    const qy = cam.position.y - GAL.GC_POS.y;
    const qz = cam.position.z - GAL.GC_POS.z;
    const zg = Math.abs(qx * EZ.x + qy * EZ.y + qz * EZ.z);
    const rg = Math.hypot(
      qx * EX.x + qy * EX.y + qz * EX.z,
      qx * EY.x + qy * EY.y + qz * EY.z
    );
    const inDisk =
      (1 - THREE.MathUtils.smoothstep(zg, 600, 2100)) *
      (1 - THREE.MathUtils.smoothstep(rg, 16800, 20500));
    if (this.phase === 'journey') {
      if (inDisk <= 0.001) this.leftDisk = true;
    } else {
      this.leftDisk = false;
    }
    const env = this.leftDisk ? 0 : inDisk;

    // camadas solares (HYG, poeira próxima, hero stars): dHome
    const localFade = 1 - THREE.MathUtils.smoothstep(dHome, 1100, 2300);
    // gás volumétrico + faixa interna: qualquer ponto dentro do disco
    const nebulaFade = env;
    const galaxyFade = 1 - env;
    const localBandFade = env * 0.76;
    const markerFade = THREE.MathUtils.smoothstep(dHome, 1700, 3300);

    // nuvens-semente do raymarch + cavidade do observador itinerante
    this.seedCloudTimer += dt;
    if (this.seedCloudTimer > 0.25) {
      this.seedCloudTimer = 0;
      if (nebulaFade > 0.001) this.updateSeedClouds(cam.position);
    }
    // a MESMA cavidade em todos os consumidores da densidade: raymarch,
    // extinção das estrelas e brilho da poeira próxima
    const cavityGate = THREE.MathUtils.smoothstep(dHome, 600, 1300);
    this.nebula.setCavity(cam.position, cavityGate);
    this.stars?.setCavity(cam.position, cavityGate);
    this.farStars?.setCavity(cam.position, cavityGate);
    this.dust.setCavity(cam.position, cavityGate);

    if (this.debug.has('dbgfade')) {
      console.log(
        `[dbgfade] dHome=${dHome.toFixed(0)} gal=${galaxyFade.toFixed(2)} ` +
          `loc=${localFade.toFixed(2)} hide=[${[...this.hide].join(',')}] ` +
          `galVis=${this.galaxy?.group.visible} phase=${this.phase} jt=${this.journeyT.toFixed(1)}`
      );
    }

    this.stars?.update(cam.position, hPx, time);
    this.farStars?.update(cam.position, hPx, time);
    this.wrappedStars?.update(
      cam.position,
      hPx,
      Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2),
      this.hide.has('nowrap') ? 0 : 1
    );
    this.stars?.setFade(this.hide.has('nocat') ? 0 : localFade);
    this.farStars?.setFade(this.hide.has('nocat') ? 0 : localFade);
    this.dust.setFade(this.hide.has('nodust') ? 0 : localFade);
    this.nebula.setFade(nebulaFade);
    // heroes esmaecem a zero em farFade (900 pc) — além disso os 12
    // draws são garantidamente invisíveis
    if (this.heroes) {
      this.heroes.group.visible = !this.hide.has('nohero') && dHome < 1200;
    }
    this.heroes?.update(time, cam.position);
    this.sun.group.visible = !this.hide.has('nosun');
    this.sun.update(time, cam.position);
    this.dust.update(cam.position, hPx, time);
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    this.galaxy?.update(
      cam.position,
      hPx,
      tanHalfFov,
      time,
      this.hide.has('nogal') ? 0 : galaxyFade,
      this.hide.has('nomarker') ? 0 : markerFade,
      this.hide.has('nogal') ? 0 : localBandFade
    );
    // camadas observacionais acompanham a galáxia: visíveis de fora e
    // como estrutura da faixa quando ainda estamos dentro do disco
    const cartHidden = this.hide.has('nocart') || this.hide.has('nogal');
    this.observedClouds?.update(
      hPx,
      tanHalfFov,
      cartHidden ? 0 : Math.max(galaxyFade, localBandFade * 0.72)
    );
    this.starForges?.update(
      cam.position,
      hPx,
      tanHalfFov,
      time,
      cartHidden ? 0 : Math.max(galaxyFade, localBandFade * 0.6)
    );

    // debug: posição projetada de Betelgeuse
    if (this.debug.has('dbgstar') && this.meta) {
      const b = this.meta.named.find((s) => s.n === 'Betelgeuse');
      if (b) {
        const v = new THREE.Vector3(b.x, b.y, b.z).project(cam);
        console.log(
          `[dbgstar] cam=${cam.position.toArray().map((n) => n.toFixed(1))} ` +
            `betel_ndc=(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(3)}) ` +
            `dist=${cam.position.distanceTo(new THREE.Vector3(b.x, b.y, b.z)).toFixed(2)}`
        );
      }
    }

    // rótulos a cada frame — a 10 Hz eles "nadavam" contra as estrelas
    // (7 projeções + um canvas 2D pequeno: custo desprezível)
    if ((this.phase === 'journey' || this.phase === 'free') && this.meta) {
      this.events.onLabels(projectLabels(cam, this.meta.named));
    } else if (this.phase !== 'journey') {
      this.events.onLabels([]);
    }

    this.post.setGalaxy(galaxyFade);
    this.post.setWarp(this.reducedMotion ? 0 : warp);
    this.nebula.setSteps(this.engine.preset.nebulaSteps);
    // gate 0.02: na casca externa do fade a contribuição é invisível
    // pós-ACES, mas o raymarch custaria integral
    if (this.noNebula || nebulaFade <= 0.02) {
      // longe de casa o céu é o preto profundo — a galáxia é a luz
      this.engine.scene.background = this.noNebula ? this.deepBg : this.bgColor;
    } else {
      this.engine.scene.background = this.nebula.texture;
      this.nebula.render(this.engine.renderer, cam, time);
    }
    this.post.render(time);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.abortController.abort();
    this.roam.dispose();
    // recursos do mundo ANTES do renderer: material descartado depois
    // de renderer.dispose() não chama deleteProgram
    this.stars?.dispose();
    this.farStars?.dispose();
    this.heroes?.dispose();
    this.galaxy?.dispose();
    this.observedClouds?.dispose();
    this.starForges?.dispose();
    this.wrappedStars?.dispose();
    this.dustMapTexture?.dispose();
    this.sun.dispose();
    this.dust.dispose();
    this.nebula.dispose();
    this.post.dispose();
    this.engine.dispose();
  }
}
