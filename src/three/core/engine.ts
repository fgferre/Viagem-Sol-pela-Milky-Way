// ============================================================
// Engine — renderer WebGL2 HDR, cena, câmera, loop e qualidade
// adaptativa (degrada pixel ratio / passos do raymarch se cair fps).
// ============================================================
import * as THREE from 'three';

export type QualityLevel = 'cinema' | 'alta' | 'performance';

interface QualityPreset {
  pixelRatio: number;
  nebulaSteps: number;
  grain: number;
}

const PRESETS: Record<QualityLevel, QualityPreset> = {
  cinema: { pixelRatio: 2.0, nebulaSteps: 56, grain: 0.055 },
  alta: { pixelRatio: 1.5, nebulaSteps: 44, grain: 0.05 },
  performance: { pixelRatio: 1.0, nebulaSteps: 30, grain: 0.04 },
};

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  quality: QualityLevel = 'cinema';

  private timer = new THREE.Timer();
  private raf = 0;
  private tickFns = new Set<(t: number, dt: number) => void>();
  private resizeFns = new Set<(w: number, h: number) => void>();
  private qualityFns = new Set<(quality: QualityLevel) => void>();
  private fpsAcc = 0;
  private fpsN = 0;
  private fpsTimer = 0;
  private autoQuality = true;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // AA vem do supersampling via pixelRatio + bloom
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = true;

    this.camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.001, 9000);
    this.camera.position.set(0.03, 0.015, 0.07);
    this.timer.connect(document);

    this.applyQuality('cinema');
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  get preset(): QualityPreset {
    return PRESETS[this.quality];
  }

  /**
   * Planos de corte dinâmicos — a cena vai de 0,01 pc a ~25.000 pc;
   * sem isso o depth buffer colapsaria num extremo ou no outro.
   */
  updateClip(distFromSun: number) {
    const near = THREE.MathUtils.clamp(distFromSun * 0.004, 0.001, 500);
    const far = THREE.MathUtils.clamp(distFromSun * 12, 9000, 400000);
    if (
      Math.abs(near - this.camera.near) / near > 0.05 ||
      Math.abs(far - this.camera.far) / far > 0.05
    ) {
      this.camera.near = near;
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
  }

  applyQuality(q: QualityLevel, manual = false) {
    this.quality = q;
    if (manual) this.autoQuality = false;
    else if (q === 'cinema') this.autoQuality = true;
    const pr = Math.min(window.devicePixelRatio || 1, PRESETS[q].pixelRatio);
    this.renderer.setPixelRatio(pr);
    this.resize();
    this.qualityFns.forEach((fn) => fn(q));
  }

  onTick(fn: (t: number, dt: number) => void) {
    this.tickFns.add(fn);
  }

  onResize(fn: (w: number, h: number) => void) {
    this.resizeFns.add(fn);
  }

  onQuality(fn: (quality: QualityLevel) => void) {
    this.qualityFns.add(fn);
  }

  private resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.resizeFns.forEach((f) => f(w, h));
  };

  start() {
    this.timer.reset();
    const loop = (timestamp: number) => {
      this.raf = requestAnimationFrame(loop);
      this.timer.update(timestamp);
      const dt = Math.min(this.timer.getDelta(), 0.05);
      const t = this.timer.getElapsed();

      // monitor de fps → degradação automática suave
      if (this.autoQuality) {
        this.fpsAcc += dt;
        this.fpsN++;
        this.fpsTimer += dt;
        if (this.fpsTimer > 2.5) {
          const avg = this.fpsN / this.fpsAcc;
          if (avg < 42 && this.quality === 'cinema') this.applyQuality('alta');
          else if (avg < 34 && this.quality === 'alta') {
            this.autoQuality = false;
            this.applyQuality('performance');
          }
          this.fpsAcc = 0;
          this.fpsN = 0;
          this.fpsTimer = 0;
        }
      }

      this.tickFns.forEach((f) => f(t, dt));
    };
    this.raf = requestAnimationFrame(loop);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.timer.dispose();
    this.renderer.dispose();
  }
}
