// ============================================================
// Engine — renderer WebGL2 HDR, cena, câmera, loop e qualidade
// adaptativa (degrada pixel ratio / passos do raymarch se cair fps).
// ============================================================
import * as THREE from 'three';
import { sondarGl } from '../../lib/glProbe';
import { gravarPreferencia, lerPreferencias } from '../../lib/preferencias';
import { LIMIAR_SISTEMA_SOLAR_PC } from '../escala';

export type QualityLevel = 'cinema' | 'alta' | 'performance';

export type ToneMapMode = 'aces' | 'agx' | 'neutral' | 'linear';

export const TONE_MAPPINGS: Record<ToneMapMode, THREE.ToneMapping> = {
  aces: THREE.ACESFilmicToneMapping,
  agx: THREE.AgXToneMapping,
  neutral: THREE.NeutralToneMapping,
  linear: THREE.LinearToneMapping,
};

/**
 * O inverso do mapa acima: qual curva está viva no renderer. Existe
 * para o selo de honestidade poder LER o estado do instrumento em vez
 * de guardar uma segunda cópia dele — o dia em que as duas divergissem,
 * o selo estaria declarando o que não é.
 */
export function modoDoToneMapping(tm: THREE.ToneMapping): ToneMapMode {
  return (
    (Object.keys(TONE_MAPPINGS) as ToneMapMode[]).find((k) => TONE_MAPPINGS[k] === tm) ??
    'aces'
  );
}

/**
 * AS DUAS PORTAS DE GOSTO, lidas num lugar só — `?tone=` e `?exp=`.
 *
 * Elas existiam DUAS vezes no `App.tsx`: com guarda no caminho que fala
 * com o engine (`tone in TONE_MAPPINGS`, `Number.isFinite && > 0`) e SEM
 * guarda no inicializador do estado React, que é quem pinta o HUD. Com
 * `?exp=abc` o painel mostrava "Exposição · NaN" e um slider com
 * `value={NaN}`; com `?tone=foo` os quatro rádios ficavam desmarcados —
 * a tela mentindo sobre o que o instrumento aplica. Achado de auditoria
 * externa; o conserto é a lei UMA SÓ, aqui, no módulo que é dono das
 * duas (`setToneMapping`/`setExposure` moram logo abaixo).
 *
 * Devolvem `null` para "não pediram nada de válido" — quem chama é que
 * conhece o padrão, e é o mesmo contrato de `lerPortaJd`.
 */
export function lerPortaTom(bruto: string | null | undefined): ToneMapMode | null {
  // `Object.keys` e NÃO o `in` que a guarda antiga usava: `in` anda na
  // cadeia de protótipos, então `?tone=constructor` passava e o engine
  // recebia a função `Object` como curva de tonemapping. Achado ao
  // escrever o teste desta porta — o relatório não tinha visto.
  return (Object.keys(TONE_MAPPINGS) as ToneMapMode[]).find((m) => m === bruto) ?? null;
}

/**
 * Exposição em multiplicador do tempo de exposição. Só positivo finito
 * passa: 0 apagaria a tela e negativo não tem significado físico. Sem
 * teto de propósito — quem escreve `?exp=8` está estourando o quadro a
 * pedido, e a captura tem de poder.
 */
export function lerPortaExposicao(bruto: string | null | undefined): number | null {
  const v = Number(bruto);
  return Number.isFinite(v) && v > 0 ? v : null;
}

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

/**
 * Guarda mínima do near no domínio profundo: 1e-8 pc = 2,06e-3 UA ≈
 * 308 mil km (0,8× a distância Terra–Lua). Não é janela nem
 * calibração — é o anteparo contra `near = 0`, que a projeção não
 * suporta (a câmera pode parar na origem exata, onde o Sol está).
 * ONDE ELE MANDA, dito por extenso: a proporção `d·0,004` só fica
 * abaixo dele com a câmera a menos de 2,5e-6 pc = 0,52 UA do Sol —
 * dentro da órbita de Vênus. Acima disso quem governa é a proporção,
 * e é ela que abre o sistema solar.
 */
export const DEEP_NEAR_MIN_PC = 1e-8;

/**
 * NEAR PLANE, PIECEWISE PELO LIMIAR DO DOMÍNIO PROFUNDO (decisão D5 da
 * Onda 4). Puro e exportado para o oráculo: o gate desta fase é a
 * IGUALDADE BIT A BIT acima do limiar, e ela se prova sem GPU.
 *
 * ACIMA de `LIMIAR_SISTEMA_SOLAR_PC` a fórmula é a de sempre, verbatim, com os
 * três literais intocados — inclusive o piso de 0,001 pc (= 206,3 UA),
 * que é o que faz as 15 vistas antigas e o filme inteiro (piso
 * 0,0631506 pc) saírem sem um pixel de diferença:
 *   near cap 40 pc (era 500): no free-roam profundo o near de
 *   centenas de pc comia o campo estelar envolvente. far mínimo
 *   60 kpc: com 9 kpc, metade distante da faixa era clipada mesmo
 *   em casa. Quase tudo é aditivo sem depthWrite — a precisão de
 *   depth não é o gargalo aqui.
 *
 * ABAIXO do limiar o piso SAI: a 150 UA da câmera o near de 206 UA
 * clipava o sistema solar inteiro — era o obstáculo mais duro do
 * domínio de escala aninhado, e some com esta linha. Sobra a mesma
 * proporcionalidade de sempre (0,4% da distância), agora até o fim.
 *
 * O DEGRAU NA FRONTEIRA é declarado, não acidental: em 0,05 pc o near
 * cai de 0,001 para 0,0002 pc de uma vez (o piso deixa de valer).
 * Ninguém vê — e desde a Onda 6 a razão é CONTA, não premissa: a
 * antiga ("não há geometria entre 41 e 206 UA") morreu quando o palco
 * local pôs corpos resolvidos no domínio profundo. A conta: quem cruza
 * a fronteira está a 0,05 pc = 10.313 UA da âncora mais próxima, e
 * todo corpo do retrato orbita a ≤ 40 UA do Sol (Plutão, o mais
 * distante, a 35,4) — o corpo mais próximo possível fica a ≥ 10.273 UA
 * da câmera, 49 vezes além da faixa de 41–206 UA que o degrau
 * toca; o disco artístico do Sol (2.269 UA de raio) fica a ≥ 8.044 UA.
 * Pinada em `engine.test.ts`. O que o degrau custa é uma reconstrução
 * de matriz de projeção ao cruzar o limiar — a mesma que o guarda de
 * 5% do `updateClip` já dosa.
 *
 * O PALCO LOCAL (Onda 6, F0 — D1): com um corpo RESOLVIDO em quadro o
 * near passa a acompanhar a superfície mais próxima, com a MESMA
 * proporção de sempre (0,4% da distância) — o regime é o termo
 * proporcional, nunca o piso. O piso deixa de ser o do Sol
 * (`DEEP_NEAR_MIN_PC` = 308 mil km, absurdo ao lado de Fobos) e deriva
 * do RAIO do corpo: metade dele, a mesma ordem do anteparo que a casa
 * já usa na origem (1e-8 pc ≈ 0,44 raio solar) — para Fobos (11 km =
 * 3,6e-13 pc) dá a rede de segurança de ~1e-13 pc do desenho da onda.
 * É anteparo contra `d_superfície ≤ 0` (câmera tocando ou dentro do
 * corpo), nunca calibração. `dSuperficiePc`/`raioPc` NaN ou ausentes =
 * sem corpo em quadro, e o par (near, far) é BIT-IDÊNTICO ao vigente:
 * NaN reprova toda comparação e o ramo novo nem executa (pino de
 * neutralidade em `engine.test.ts` — é ele que sustenta o 18/18 da F0).
 */
export function nearPlanePc(
  distFromSun: number,
  dSuperficiePc = Number.NaN,
  raioPc = Number.NaN
): number {
  const semCorpo =
    distFromSun >= LIMIAR_SISTEMA_SOLAR_PC
      ? THREE.MathUtils.clamp(distFromSun * 0.004, 0.001, 40)
      : Math.max(distFromSun * 0.004, DEEP_NEAR_MIN_PC);
  if (!(Number.isFinite(dSuperficiePc) && Number.isFinite(raioPc) && raioPc > 0)) {
    return semCorpo;
  }
  return Math.min(semCorpo, Math.max(dSuperficiePc * 0.004, raioPc * 0.5));
}

/**
 * FAR PLANE — inalterado pela Onda 4, e é de propósito: o que muda no
 * domínio profundo é o quão PERTO se enxerga, não o quão longe. Fica
 * como função só para o oráculo poder julgar o PAR (near, far) que o
 * `updateClip` entrega, que é o que o gate promete.
 */
export function farPlanePc(distFromSun: number): number {
  return THREE.MathUtils.clamp(distFromSun * 12, 60000, 400000);
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
  /** a media query armada no DPR vivo — trocar de monitor a dispara */
  private vigiaDeDpr: MediaQueryList | null = null;

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
    //
    // Precedência URL > storage > detecção (Onda 1f): a URL segue soberana —
    // inclusive sobre o teto de GL, porque os gates fixam ?q= e a captura tem
    // de enxergar o que a tela enxerga. Sem ?q=, vale o último veredito
    // MEDIDO sobre este aparelho (tierQueRodou, gravado pelo monitor de fps);
    // por fim, a detecção por touch/tela. O teto de GL (Onda 1e) só REBAIXA,
    // e só quando o renderer se NOMEIA software (SwiftShader, llvmpipe…) —
    // string ilegível não é veredito.
    const qParam = new URLSearchParams(window.location.search).get('q');
    const q = (['cinema', 'alta', 'performance'] as const).find((v) => v === qParam);
    let inicial = q ?? lerPreferencias().tierQueRodou ?? defaultQualityForDevice();
    if (!q && sondarGl().rendererSoftware === true) inicial = 'performance';
    this.applyQuality(inicial, q !== undefined);
    this.resize();
    window.addEventListener('resize', this.resize);
    this.armarVigiaDeDpr();
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
   * Desde a Onda 6 o `min()` aceita a superfície resolvida mais
   * próxima (o Director a lê do palco local): NaN/ausente = o par de
   * sempre, bit a bit — ver `nearPlanePc`.
   */
  updateClip(distFromSun: number, dSuperficiePc = Number.NaN, raioCorpoPc = Number.NaN) {
    const near = nearPlanePc(distFromSun, dSuperficiePc, raioCorpoPc);
    const far = farPlanePc(distFromSun);
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
    this.aplicarNitidez();
    this.qualityFns.forEach((fn) => fn(q));
  }

  /**
   * A NITIDEZ DO QUADRO (item 6): o pixel ratio é o MENOR entre o teto
   * do tier e o DPR do monitor ATUAL — relido a cada aplicação, nunca
   * guardado. Chamada pelo `applyQuality` e pelo vigia de DPR: arrastar
   * a janela para outro monitor (ou mudar o zoom) reafia a cena sem
   * recarregar, como os rótulos já faziam. O resto do pipeline não
   * precisa saber: quem depende de resolução lê `getPixelRatio()` por
   * quadro — a invariância de resolução da casa.
   */
  private aplicarNitidez() {
    const pr = Math.min(window.devicePixelRatio || 1, this.preset.pixelRatio);
    this.renderer.setPixelRatio(pr);
    this.resize();
  }

  /**
   * O VIGIA DE DPR — uma media query armada no valor VIVO; ela dispara
   * exatamente quando `devicePixelRatio` deixa de ser o que era (troca
   * de monitor, zoom do navegador), e aí a nitidez é reaplicada e o
   * vigia re-armado no valor novo. `once` porque a query velha vira
   * mentira no instante em que dispara. Não passa por `applyQuality`:
   * trocar de tela não é opinião sobre tier nem desliga o auto-quality.
   */
  private armarVigiaDeDpr() {
    if (typeof window.matchMedia !== 'function') return;
    this.vigiaDeDpr = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`
    );
    this.vigiaDeDpr.addEventListener('change', this.aoMudarDpr, { once: true });
  }

  private aoMudarDpr = () => {
    this.aplicarNitidez();
    this.armarVigiaDeDpr();
  };

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
          const antes = this.quality;
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
          // o veredito MEDIDO sobrevive à recarga: é ele que decide a
          // alocação da próxima visita (Onda 1f). Só o monitor grava —
          // ?q= explícito e detecção não são medição.
          if (this.quality !== antes) gravarPreferencia('tierQueRodou', this.quality);
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
    this.vigiaDeDpr?.removeEventListener('change', this.aoMudarDpr);
    this.timer.dispose();
    this.renderer.dispose();
  }
}
