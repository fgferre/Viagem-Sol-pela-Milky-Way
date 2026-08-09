// ============================================================
// Engine — renderer WebGL2 HDR, cena, câmera, loop e qualidade
// adaptativa (degrada pixel ratio / passos do raymarch se cair fps).
// ============================================================
import * as THREE from 'three';

export type QualityLevel = 'cinema' | 'alta' | 'performance';

export type ToneMapMode = 'aces' | 'agx' | 'neutral' | 'linear';

export const TONE_MAPPINGS: Record<ToneMapMode, THREE.ToneMapping> = {
  aces: THREE.ACESFilmicToneMapping,
  agx: THREE.AgXToneMapping,
  neutral: THREE.NeutralToneMapping,
  linear: THREE.LinearToneMapping,
};

interface QualityPreset {
  pixelRatio: number;
  nebulaSteps: number;
  grain: number;
}

// grain agora é DISPLAY-space (film pass pós-tonemap): 0.055 era
// calibrado para o espaço linear onde o ACES o esmagava — em display
// vira granulado de vídeo; cinema real fica em ~1% de swing.
const PRESETS: Record<QualityLevel, QualityPreset> = {
  cinema: { pixelRatio: 2.0, nebulaSteps: 56, grain: 0.012 },
  alta: { pixelRatio: 1.5, nebulaSteps: 44, grain: 0.01 },
  performance: { pixelRatio: 1.0, nebulaSteps: 30, grain: 0.008 },
};

// Tier INICIAL sem ?q=: decidido pelo dispositivo, não por uma constante.
// A assimetria que justifica errar para BAIXO no touch: o tier inicial
// decide ALOCAÇÃO (a população da galáxia — 4,02 M partículas em cinema —
// e o tier do Sol congelam no init), e o auto-quality nunca desfaz o que
// já foi assado. Começar baixo e subir é barato (o nearCeiling sobe passos
// e pixelRatio em segundos); começar alto e cair deixa a memória de cinema
// num celular para sempre. Desktop segue em cinema: os gates capturam em
// headless sem touch e com ?q=cinema fixado — este caminho nem roda lá.
function defaultQualityForDevice(): QualityLevel {
  const touch =
    navigator.maxTouchPoints > 1 || window.matchMedia('(pointer: coarse)').matches;
  if (!touch) return 'cinema';
  // lado curto da TELA (não da janela): tablet deitado continua tablet
  const shortSide = Math.min(window.screen.width, window.screen.height);
  return shortSide < 820 ? 'performance' : 'alta';
}

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
  /** teto de refresh observado (proxy do monitor) — sob vsync a 60 Hz
   *  "avg > 72" nunca acontece; os limiares de subida são relativos */
  private peakAvg = 0;
  private upgradeCooldown = 0;

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

    // ?q= tem de valer ANTES do init: o tier do Sol congela no construtor do
    // Director e a população da galáxia é decidida durante o init. Aplicado
    // só depois (App.tsx), performance ficava com as 2,7 M partículas e o Sol
    // em high — exatamente onde a economia é necessária.
    const qParam = new URLSearchParams(window.location.search).get('q');
    const q = (['cinema', 'alta', 'performance'] as const).find((v) => v === qParam);
    this.applyQuality(q ?? defaultQualityForDevice(), q !== undefined);
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  get preset(): QualityPreset {
    return PRESETS[this.quality];
  }

  /**
   * Curva de tom. É GOSTO, não física: cada operador decide o que fazer com
   * o que passa de 1, e isso muda croma e faixa dinâmica. O ACES comprime e
   * dessatura os altos — bom para pele, discutível para uma galáxia, onde a
   * cor dos altos é justamente o dado. AgX preserva mais croma e escurece;
   * Neutral fica no meio; Linear não faz nada e estoura, mas serve para ver
   * o que a cena realmente produz antes de qualquer curva.
   *
   * Não precisa de traverse: a cena SÓ é renderizada dentro do composer, e
   * com render target amarrado o three compila os materiais com NoToneMapping
   * (o operador é do OutputPass, que recompila o próprio shader sozinho).
   * O traverse que havia aqui recompilava a cena inteira sem efeito visual —
   * é o hitch de compilação que o warm-up do director existe para evitar.
   */
  setToneMapping(mode: ToneMapMode) {
    this.renderer.toneMapping = TONE_MAPPINGS[mode];
  }

  setExposure(v: number) {
    this.renderer.toneMappingExposure = v;
  }

  /**
   * Planos de corte dinâmicos — a cena vai de 0,01 pc a ~25.000 pc;
   * sem isso o depth buffer colapsaria num extremo ou no outro.
   */
  updateClip(distFromSun: number) {
    // near cap 40 pc (era 500): no free-roam profundo o near de
    // centenas de pc comia o campo estelar envolvente. far mínimo
    // 60 kpc: com 9 kpc, metade distante da faixa era clipada mesmo
    // em casa. Quase tudo é aditivo sem depthWrite — a precisão de
    // depth não é o gargalo aqui.
    const near = THREE.MathUtils.clamp(distFromSun * 0.004, 0.001, 40);
    const far = THREE.MathUtils.clamp(distFromSun * 12, 60000, 400000);
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
          this.peakAvg = Math.max(this.peakAvg, avg);
          this.upgradeCooldown = Math.max(0, this.upgradeCooldown - this.fpsTimer);
          // degrada rápido; recupera com limiar RELATIVO ao teto de
          // refresh observado (94%) + cooldown anti-thrash — limiares
          // absolutos (>72 fps) eram inatingíveis sob vsync a 60 Hz.
          const nearCeiling = this.peakAvg > 20 && avg > this.peakAvg * 0.94;
          if (avg < 42 && this.quality === 'cinema') {
            this.applyQuality('alta');
            this.upgradeCooldown = 15;
          } else if (avg < 34 && this.quality === 'alta') {
            this.applyQuality('performance');
            this.upgradeCooldown = 15;
          } else if (nearCeiling && this.upgradeCooldown <= 0) {
            if (this.quality === 'performance') this.applyQuality('alta');
            else if (this.quality === 'alta') this.applyQuality('cinema');
            this.upgradeCooldown = 10;
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
