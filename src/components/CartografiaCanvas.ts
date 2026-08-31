// ============================================================
// Cartografia Viva — a composição da tela de carregamento.
//
// Canvas 2D, sem WebGL: o carregamento é justamente quando a GPU e a
// thread principal estão ocupadas construindo a cena de verdade. Tudo
// que é caro nasce UMA vez (sprites e dois bitmaps offscreen) e o frame
// só compõe: grade, halo e um drawImage do bitmap da galáxia girado.
// O bitmap só é regravado quando o progresso muda de patamar — e o
// modelo é determinístico (LCG semeada), então a mesma etapa desenha
// sempre a mesma galáxia, que é o que `?loader=<id>&shot=1` precisa.
// ============================================================
import { BACKBONE, GALACTIC_MODEL } from '../three/cartography/galacticModel';

/** o que o HUD manda a cada mudança de etapa/estado */
export interface CartografiaState {
  /** etapa viva, 1…total */
  index: number;
  total: number;
  /** falha de inicialização: cena esmaecida, sem varredura */
  error: boolean;
  /** prefers-reduced-motion ou ?shot=: quadro estático, sem rotação */
  still: boolean;
  /** a viagem começou: o véu está cobrindo, poupa GPU e para o laço */
  merging: boolean;
}

/**
 * A LEI DOS BRAÇOS É A DA CASA (item 34). A vinheta desenhava DOIS braços
 * numa espiral inventada (`TWIST`, linear em r) enquanto o céu que o
 * visitante navega logo depois tem QUATRO: a mesma tela prometia outra
 * galáxia. Agora a crista sai da espinha simétrica do modelo cartográfico
 * — `BACKBONE` em `cartography/galacticModel` —, quatro cristas de mesmo
 * pitch espaçadas 2π/4. Não é cópia científica (não há fase de maser,
 * barra, warp nem correção observada aqui): é a mesma FAMÍLIA de curva,
 * na mesma quiralidade, para o boot não contradizer o céu.
 */
const INV_TAN_PITCH = 1 / Math.tan((BACKBONE.pitchDeg * Math.PI) / 180);
/** raio do Sol em fração do raio do disco — a âncora do log da espiral */
const R_SOL = GALACTIC_MODEL.sunRadiusPc / GALACTIC_MODEL.diskRadiusPc;
/**
 * Daqui para dentro a espiral CONGELA: log-espiral enrola sem fim no
 * centro, e no modelo da casa a família mais interna começa a 2,2 kpc —
 * abaixo disso é bojo, e o gradiente quente cobre o congelamento.
 */
const R_MIN = 2_200 / GALACTIC_MODEL.diskRadiusPc;

/**
 * Azimute da crista do braço `k` no raio `r` (fração do disco).
 *
 * O X E O Y SÃO DE TELA, e o canvas tem y para BAIXO: o y do modelo entra
 * NEGADO, e é isso que põe a vinheta na vista do polo norte galáctico — a
 * de qualquer mapa face-on da Via Láctea, e a do céu da casa. MEDIDO
 * (fase da harmônica m=4 contra ln r, anel de 150–400 px): o céu da casa
 * fotografado do polo norte abre a −3,78 rad por e-fold e esta vinheta a
 * −4,44 (pitch aparente 12,7° contra os 12,5° do BACKBONE); a vinheta de
 * dois braços abria a +4,33 — sinal trocado, ou seja, o ESPELHO do céu.
 */
function noBraco(r: number, k: number, desvio: number) {
  const th =
    BACKBONE.phase0Rad +
    (k * 2 * Math.PI) / BACKBONE.armCount +
    Math.log(Math.max(r, R_MIN) / R_SOL) * INV_TAN_PITCH +
    desvio;
  return { x: r * Math.cos(th), y: -r * Math.sin(th) };
}

/** lado do bitmap da galáxia (espaço do modelo, girado no frame) */
const OFF_SIZE = 1400;
/** raio do disco dentro do bitmap — o resto é margem para a bruma */
const OFF_R = 640;
/** largura do fade de cada camada, em etapas */
const FADE = 1.2;
/**
 * Patamares de progresso em que os bitmaps são regravados. Um bake cheio
 * da galáxia foi MEDIDO em ~19 ms (18 mil sprites), então isto é um teto
 * de custo: no máximo ~100 bakes no carregamento inteiro, e os primeiros
 * saem bem mais baratos porque a maioria das partículas ainda nem acendeu.
 */
const BAKE_STEPS = 100;

interface Particle {
  x: number;
  y: number;
  /** tamanho em unidades de sprite */
  s: number;
  a: number;
  /** índice do sprite colorido */
  col: number;
  /** etapa em que esta partícula acende */
  at: number;
}

type DustMote = Omit<Particle, 'col'>;

/** LCG — a mesma semente desenha sempre a mesma galáxia */
function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function sprite(r: number, g: number, b: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  if (!x) return c;
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${r},${g},${b},1)`);
  gr.addColorStop(0.25, `rgba(${r},${g},${b},.55)`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  return c;
}

export class CartografiaCanvas {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  /** marfim · azul-acinzentado · marfim quente · H II rosado */
  private readonly sprites: HTMLCanvasElement[];
  private readonly spriteDark: HTMLCanvasElement;
  private readonly gal: Particle[] = [];
  private readonly dust: DustMote[] = [];
  private readonly halo: Particle[] = [];
  private readonly off = document.createElement('canvas');
  private readonly offHalo = document.createElement('canvas');

  private state: CartografiaState = {
    index: 1,
    total: 7,
    error: false,
    still: false,
    merging: false,
  };
  private dpr = 1;
  /** progresso suavizado (0…1) — o que revela as camadas */
  private p = 0;
  /** patamar já gravado nos bitmaps; evita regravar 60×/s */
  private baked = -1;
  /** revelação do último bake, e a partir de qual cada bitmap congela */
  private bakedReveal = -1;
  private galDone = 0;
  private haloDone = 0;
  private rot = -0.4;
  private last = 0;
  private raf = 0;
  private fadedFrames = 0;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Canvas 2D indisponível para a cartografia.');
    this.ctx = ctx;
    this.sprites = [
      sprite(232, 229, 224),
      sprite(198, 208, 226),
      sprite(242, 226, 200),
      sprite(255, 150, 160),
    ];
    this.spriteDark = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const x = c.getContext('2d');
      if (!x) return c;
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(8,6,4,.85)');
      g.addColorStop(1, 'rgba(8,6,4,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 64, 64);
      return c;
    })();
    this.buildModel();
    this.off.width = this.off.height = OFF_SIZE;
    this.resize();
    window.addEventListener('resize', this.resize);
    this.raf = requestAnimationFrame(this.frame);
  }

  setState(next: CartografiaState) {
    this.state = next;
    this.wake();
  }

  /** o laço para sozinho quando nada mais anima; toda mudança o reacende */
  private wake() {
    if (!this.raf && !this.disposed) {
      this.last = 0;
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    window.removeEventListener('resize', this.resize);
  }

  // ---------- modelo (determinístico) ----------
  private buildModel() {
    const rnd = rng(7);
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
    for (let i = 0; i < 18000; i++) {
      // um terço em bruma difusa, o resto cravado na crista do braço. Com
      // QUATRO cristas em vez de duas cada uma recebe metade das
      // partículas, e o braço apagava: a bruma cedeu população (era 0,45)
      // e a crista ficou ~40% mais estreita (era 0,05+0,06r). Medido no
      // anel de 60–150 px do quadro de boot — pico 202 nos dois braços,
      // 162 com a crista larga, 191 assim; o cinza MÉDIO do anel não se
      // mexe (69,8 → 69,7), então isto é contraste, não exposição.
      const haze = rnd() < 0.36;
      const r = Math.pow(rnd(), 0.58);
      const arm = i % BACKBONE.armCount;
      const spread = haze ? 0.55 : 0.03 + 0.036 * r;
      const cr = rnd();
      const inner = r < 0.32;
      // par dominante: os braços de índice ÍMPAR da espinha, como no
      // modelo (lá é `pairSign`/`renderWeight` — Sct-Cen e Perseu, a
      // dominância m=2 da população estelar evoluída). Quatro braços
      // IGUAIS seriam outra galáxia tanto quanto dois.
      const fall =
        (1 - r * 0.32) * (haze ? 0.72 : 1) * (arm % 2 ? 1 : 0.62);
      this.gal.push({
        ...noBraco(r, arm, ((gauss() * spread) / (0.3 + r)) * 2.2),
        s: 0.4 + rnd() * (inner ? 1.1 : 0.85),
        a: (0.12 + rnd() * 0.45) * fall,
        col: cr < 0.68 ? 0 : cr < 0.94 ? 1 : 2,
        // o bojo acende antes; os braços externos são a etapa seguinte
        at: inner ? 1.4 + rnd() * 1.4 : 2.6 + rnd() * 2.6,
      });
    }
    // regiões H II — pontos rosados discretos ao longo dos braços. SEM a
    // dominância m=2: o gás carrega os quatro braços parecidos (é o mesmo
    // 0,82 uniforme dos nós no gerador da galáxia)
    for (let i = 0; i < 120; i++) {
      const r = 0.35 + Math.pow(rnd(), 0.7) * 0.6;
      const arm = i % BACKBONE.armCount;
      this.gal.push({
        ...noBraco(r, arm, ((gauss() * 0.06) / (0.3 + r)) * 2.2),
        s: 1.2 + rnd() * 1.2,
        a: 0.08 + rnd() * 0.12,
        col: 3,
        at: 4.1 + rnd() * 1.2,
      });
    }
    // poeira escura: mosqueado fino seguindo os braços, meio passo à frente
    for (let i = 0; i < 700; i++) {
      const r = 0.16 + Math.pow(rnd(), 0.8) * 0.75;
      const arm = i % BACKBONE.armCount;
      this.dust.push({
        ...noBraco(r, arm, 0.05 + ((gauss() * 0.025) / (0.3 + r)) * 2.2),
        s: 3.5 + rnd() * 9,
        a: 0.08 + rnd() * 0.14,
        at: 2.1 + rnd() * 1.4,
      });
    }
    // halo de catálogo: pontos finos em espaço de TELA, a primeira camada
    for (let i = 0; i < 1700; i++) {
      this.halo.push({
        x: rnd(),
        y: rnd(),
        s: 0.28 + Math.pow(rnd(), 5) * 1.1,
        a: 0.1 + rnd() * 0.4,
        col: rnd() < 0.7 ? 0 : 1,
        at: rnd() * 1.6,
      });
    }
    // depois que a última partícula de um bitmap termina de acender ele
    // não muda mais — e regravá-lo vira desperdício puro
    const ultima = (ps: { at: number }[]) => ps.reduce((m, p) => Math.max(m, p.at), 0) + FADE;
    this.galDone = Math.max(ultima(this.gal), ultima(this.dust));
    this.haloDone = ultima(this.halo);
  }

  private resize = () => {
    const cv = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const w = Math.max(1, Math.round(cv.clientWidth * dpr));
    const h = Math.max(1, Math.round(cv.clientHeight * dpr));
    if (cv.width === w && cv.height === h && this.dpr === dpr) return;
    cv.width = w;
    cv.height = h;
    this.dpr = dpr;
    this.offHalo.width = w;
    this.offHalo.height = h;
    this.baked = -1;
    this.bakedReveal = -1;
    // um resize com a cena congelada precisa de um quadro novo — o buffer
    // recém-redimensionado nasce vazio
    this.wake();
  };

  /** 0→1 conforme a etapa `at` acende, ao longo de FADE etapas */
  private vis(at: number, reveal: number) {
    const d = reveal - at;
    return d <= 0 ? 0 : d >= FADE ? 1 : d / FADE;
  }

  private drawGal(reveal: number) {
    const c = OFF_SIZE / 2;
    const R = OFF_R;
    const x = this.off.getContext('2d');
    if (!x) return;
    x.clearRect(0, 0, OFF_SIZE, OFF_SIZE);
    // bojo — marfim quente, como nas recriações face-on
    const bo = Math.min(1, Math.max(0, (reveal - 1.2) / 3));
    if (bo > 0) {
      x.globalCompositeOperation = 'source-over';
      const g1 = x.createRadialGradient(c, c, 0, c, c, R * 0.3);
      g1.addColorStop(0, `rgba(250,242,224,${(0.95 * bo).toFixed(3)})`);
      g1.addColorStop(0.2, `rgba(230,214,188,${(0.34 * bo).toFixed(3)})`);
      g1.addColorStop(1, 'rgba(200,185,165,0)');
      x.fillStyle = g1;
      x.fillRect(0, 0, OFF_SIZE, OFF_SIZE);
      const g2 = x.createRadialGradient(c, c, 0, c, c, R * 1.02);
      g2.addColorStop(0, `rgba(210,196,178,${(0.11 * bo).toFixed(3)})`);
      g2.addColorStop(1, 'rgba(210,196,178,0)');
      x.fillStyle = g2;
      x.fillRect(0, 0, OFF_SIZE, OFF_SIZE);
    }
    x.globalCompositeOperation = 'lighter';
    for (const p of this.gal) {
      const v = this.vis(p.at, reveal);
      if (v <= 0) continue;
      const sz = p.s * 2.6;
      x.globalAlpha = p.a * v;
      x.drawImage(this.sprites[p.col], c + p.x * R - sz / 2, c + p.y * R - sz / 2, sz, sz);
    }
    // a poeira SUBTRAI: source-over com sprite quase preto sobre a luz
    x.globalCompositeOperation = 'source-over';
    for (const d of this.dust) {
      const v = this.vis(d.at, reveal);
      if (v <= 0) continue;
      const sz = d.s * 3.2;
      x.globalAlpha = d.a * v;
      x.drawImage(this.spriteDark, c + d.x * R - sz / 2, c + d.y * R - sz / 2, sz, sz);
    }
    x.globalAlpha = 1;
  }

  private drawHalo(reveal: number) {
    const x = this.offHalo.getContext('2d');
    if (!x) return;
    const w = this.offHalo.width;
    const h = this.offHalo.height;
    x.clearRect(0, 0, w, h);
    x.globalCompositeOperation = 'lighter';
    for (const p of this.halo) {
      const v = this.vis(p.at, reveal);
      if (v <= 0) continue;
      const sz = p.s * 1.6 * this.dpr;
      x.globalAlpha = p.a * v;
      x.drawImage(this.sprites[p.col], p.x * w - sz / 2, p.y * h - sz / 2, sz, sz);
    }
    x.globalAlpha = 1;
  }

  private frame = (t: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    const cv = this.canvas;
    if (!cv.width) return;
    const bruto = this.last ? (t - this.last) / 1000 : 0;
    this.last = t;
    const { index, total, error, still, merging } = this.state;
    // a falha congela a cena junto com o reduced-motion: nada gira sobre
    // uma cartografia que parou
    const frozen = still || error;

    const target = index / total;
    // O init BLOQUEIA a thread por segundos (bakes, buildGalaxy, compilação
    // dos shaders) e o rAF some junto. Por isso a revelação anda pelo tempo
    // REAL decorrido — com dt limitado a um quadro típico, ela ficava presa
    // atrás do carregamento e a etapa 07 chegava com a tela ainda vazia.
    // A rotação NÃO: um salto de giro de segundos apareceria como corte.
    this.p = frozen ? target : this.p + (target - this.p) * (1 - Math.exp(-Math.min(2, bruto) * 2.4));
    // o giro é HORÁRIO na tela (rot cresce, canvas com y para baixo), que
    // na vista do polo norte é o sentido em que a Via Láctea gira — e com
    // a espiral do `noBraco` isso deixa os braços ARRASTANDO, como devem
    if (!frozen) this.rot += Math.min(0.1, bruto) * 0.012;

    if (merging && this.fadedFrames > 90) {
      // o véu da intro já cobriu: para o laço até alguém mudar o estado
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      return;
    }
    this.fadedFrames = merging ? this.fadedFrames + 1 : 0;

    // regrava os bitmaps por PATAMAR, e só os que ainda têm o que acender:
    // um redesenho de 18 mil sprites por quadro em cima do init é caro
    const step = Math.round(this.p * BAKE_STEPS);
    if (step !== this.baked) {
      this.baked = step;
      const reveal = this.p * total;
      if (this.bakedReveal < this.galDone) this.drawGal(reveal);
      if (this.bakedReveal < this.haloDone) this.drawHalo(reveal);
      this.bakedReveal = reveal;
    }

    const x = this.ctx;
    const w = cv.width;
    const h = cv.height;
    x.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h * 0.4;
    const GR = Math.min(w * 0.62, h * 1.02);

    // grade cartográfica sutil — a única coisa desenhada em vetor
    const gA = (0.16 + this.p * 0.3) * (error ? 0.5 : 1);
    x.save();
    x.translate(cx, cy);
    x.scale(1, 0.82);
    x.rotate(-0.06);
    x.lineWidth = Math.max(1, this.dpr * 0.7);
    for (let i = 1; i <= 6; i++) {
      x.beginPath();
      x.arc(0, 0, (GR * i) / 6, 0, Math.PI * 2);
      x.strokeStyle = `rgba(150,180,255,${(gA * (i % 2 ? 0.1 : 0.055)).toFixed(3)})`;
      x.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      x.beginPath();
      x.moveTo(Math.cos(a) * GR * 0.12, Math.sin(a) * GR * 0.12);
      x.lineTo(Math.cos(a) * GR, Math.sin(a) * GR);
      x.strokeStyle = `rgba(150,180,255,${(gA * 0.045).toFixed(3)})`;
      x.stroke();
    }
    // varredura do levantamento — o único movimento além da rotação
    if (!frozen) {
      const sa = this.rot * 9;
      const grd = x.createLinearGradient(0, 0, Math.cos(sa) * GR, Math.sin(sa) * GR);
      grd.addColorStop(0, 'rgba(150,190,255,0)');
      grd.addColorStop(1, `rgba(150,190,255,${(gA * 0.5).toFixed(3)})`);
      x.beginPath();
      x.moveTo(0, 0);
      x.lineTo(Math.cos(sa) * GR, Math.sin(sa) * GR);
      x.strokeStyle = grd;
      x.lineWidth = Math.max(1, this.dpr);
      x.stroke();
    }
    x.restore();

    // halo de estrelas de catálogo (já em espaço de tela)
    x.drawImage(this.offHalo, 0, 0);

    // a galáxia: um drawImage do bitmap, inclinado e girando devagar
    x.save();
    x.translate(cx, cy);
    x.scale(1, 0.82);
    x.rotate(this.rot);
    x.globalCompositeOperation = 'lighter';
    x.drawImage(this.off, -GR, -GR, GR * 2, GR * 2);
    x.restore();
    x.globalCompositeOperation = 'source-over';

    // cena congelada (reduced-motion, ?shot=, erro): este quadro já é o
    // definitivo — redesenhá-lo a 60 Hz só gastaria bateria. setState e
    // resize reacendem o laço quando houver algo novo a compor.
    if (frozen) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  };
}
