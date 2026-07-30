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
import { Galaxy, buildGalaxy } from './world/galaxy';
import { JourneyRig, FreeRoam } from './cinematic/cameraRig';
import { loadStarData, WORLD } from './config';
import type { StarsMeta } from './config';

export type Phase = 'loading' | 'intro' | 'journey' | 'end' | 'free';

export interface DirectorEvents {
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
  private sun: Sun;
  private dust: Dust;
  private bgColor = new THREE.Color(0x000106);
  private rig = new JourneyRig();
  private roam: FreeRoam;
  private meta!: StarsMeta;

  private phase: Phase = 'loading';
  private journeyT = 0;
  private lastCaptionIdx = -1;
  private labelTimer = 0;
  /** congela o relógio da viagem (debug/screenshots via ?freeze=1) */
  freezeJourney = false;
  private noNebula = false;
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
    this.engine.onQuality((quality) => this.events.onQuality(quality));

    this.engine.onResize((w, h) => {
      this.nebula.setSize(w, h);
      this.post.setSize(w, h);
    });
    this.nebula.setSize(window.innerWidth, window.innerHeight);

    // debug via URL: ?nobloom=1
    if (this.debug.has('nobloom')) {
      this.post.bloom.enabled = false;
    }
    for (const k of ['nogal', 'nosun', 'nodust', 'nohero', 'nocat', 'nomarker']) {
      if (this.debug.has(k)) this.hide.add(k);
    }

    this.engine.onTick((t, dt) => this.tick(t, dt));
  }

  async init() {
    const { positions, meta } = await loadStarData(this.abortController.signal);
    if (this.disposed) return;
    this.meta = meta;

    this.stars = new StarField(positions, 6, { pointScale: 6.0, tau: 0.045, maxPx: 48 });
    this.farStars = new StarField(buildFarStars(WORLD.farStarsCount), 6, {
      pointScale: 1.5,
      tau: 0.04,
      maxPx: 3,
    });
    this.heroes = new HeroStars(this.meta.named);

    this.galaxy = new Galaxy(buildGalaxy());
    if (this.disposed) return;

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

  play() {
    this.journeyT = 0;
    this.lastCaptionIdx = -1;
    this.freezeJourney = false;
    this.rig.reset();
    this.roam.enabled = false;
    this.setPhase('journey');
  }

  /** salta para um instante da viagem (segundos) — usado por deep-links */
  seek(t: number) {
    this.journeyT = t;
    this.rig.reset(); // a mira suavizada também salta para o instante certo
  }

  enterFreeRoam() {
    this.roam.enabled = true;
    this.roam.syncFromCamera();
    this.setPhase('free');
    this.events.onCaption(-1, '', '');
    this.events.onLabels([]);
  }

  setQuality(q: QualityLevel) {
    this.engine.applyQuality(q, true);
    this.nebula.setSteps(this.engine.preset.nebulaSteps);
  }

  get progressTicks(): number[] {
    return this.rig.ticks;
  }

  private tick(time: number, dt: number) {
    const cam = this.engine.camera;
    let warp = 0;

    if (this.phase === 'journey') {
      if (!this.freezeJourney) this.journeyT += dt;
      const t = this.journeyT;
      const r = this.rig.apply(cam, t);
      warp = r.warp;
      this.events.onProgress(Math.min(t / this.rig.duration, 1));
      this.events.onWarp(warp);

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
        const r = this.rig.apply(cam, 0);
        warp = r.warp;
      }
    }

    // mundo
    const hPx = this.engine.renderer.domElement.height;
    const dHome = cam.position.length();
    this.engine.updateClip(dHome);

    // crossfade escala local ↔ galáxia (pc)
    const localFade = 1 - THREE.MathUtils.smoothstep(dHome, 1100, 2300);
    const nebulaFade = 1 - THREE.MathUtils.smoothstep(dHome, 1300, 2700);
    const galaxyFade = THREE.MathUtils.smoothstep(dHome, 1000, 2600);
    // Vista interna da Via Láctea: as partículas galactocêntricas são
    // visíveis como faixa estelar enquanto ainda estamos dentro do disco.
    const localBandFade =
      (1 - THREE.MathUtils.smoothstep(dHome, 650, 1900)) * 0.76;
    const markerFade = THREE.MathUtils.smoothstep(dHome, 1700, 3300);

    if (this.debug.has('dbgfade')) {
      console.log(
        `[dbgfade] dHome=${dHome.toFixed(0)} gal=${galaxyFade.toFixed(2)} ` +
          `loc=${localFade.toFixed(2)} hide=[${[...this.hide].join(',')}] ` +
          `galVis=${this.galaxy?.group.visible} phase=${this.phase} jt=${this.journeyT.toFixed(1)}`
      );
    }

    this.stars?.update(cam.position, hPx, time);
    this.farStars?.update(cam.position, hPx, time);
    this.stars?.setFade(this.hide.has('nocat') ? 0 : localFade);
    this.farStars?.setFade(this.hide.has('nocat') ? 0 : localFade);
    this.dust.setFade(this.hide.has('nodust') ? 0 : localFade);
    this.nebula.setFade(nebulaFade);
    if (this.heroes) this.heroes.group.visible = !this.hide.has('nohero');
    this.heroes?.update(time, cam.position);
    this.sun.group.visible = !this.hide.has('nosun');
    this.sun.update(time, cam.position);
    this.dust.update(cam.position, hPx, time);
    this.galaxy?.update(
      cam.position,
      hPx,
      Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2),
      time,
      this.hide.has('nogal') ? 0 : galaxyFade,
      this.hide.has('nomarker') ? 0 : markerFade,
      this.hide.has('nogal') ? 0 : localBandFade
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

    // rótulos (10 Hz basta)
    this.labelTimer += dt;
    if (this.labelTimer > 0.1) {
      this.labelTimer = 0;
      if ((this.phase === 'journey' || this.phase === 'free') && this.meta) {
        this.events.onLabels(projectLabels(cam, this.meta.named));
      } else if (this.phase !== 'journey') {
        this.events.onLabels([]);
      }
    }

    this.post.setGalaxy(galaxyFade);
    this.post.setWarp(warp);
    this.nebula.setSteps(this.engine.preset.nebulaSteps);
    if (this.noNebula || nebulaFade <= 0.001) {
      // longe de casa o céu é o preto profundo — a galáxia é a luz
      this.engine.scene.background = this.noNebula ? new THREE.Color(0x010208) : this.bgColor;
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
    this.post.dispose();
    this.engine.dispose();
    this.stars?.dispose();
    this.farStars?.dispose();
    this.heroes?.dispose();
    this.galaxy?.dispose();
    this.sun.dispose();
    this.dust.dispose();
    this.nebula.dispose();
  }
}
