// ============================================================
// Director — orquestra engine, mundo e cinemática.
// API consumida pelo React: eventos de legenda/progresso/fase.
// ============================================================
import * as THREE from 'three';
import { Engine } from './core/engine';
import type { QualityLevel } from './core/engine';
import { Post } from './core/post';
import { StarField } from './world/stars';
import { Nebula } from './world/nebula';
import { NovoSol } from './world/novoSol';
import { Dust } from './world/dust';
import { projectLabels, projectForced } from './world/labels';
import type { StarLabel } from './world/labels';
import { HeroStars, SunStar } from './world/heroStars';
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
import { bakeGalacticStructureMap } from './cartography/structureMap';
import { JourneyRig, FreeRoam } from './cinematic/cameraRig';
import { REVEAL_T } from './cinematic/journey';
import { BlackHolePass } from './world/blackHole';
import { loadStarData, WORLD } from './config';
import type { StarsMeta } from './config';

// A fotosfera fica na origem do mundo — o grupo do Sol só é escalado.
const ORIGEM = new THREE.Vector3(0, 0, 0);

export type Phase = 'loading' | 'intro' | 'journey' | 'end' | 'free';

interface DirectorEvents {
  onPhase: (p: Phase) => void;
  onCaption: (index: number, caption: string, sub?: string) => void;
  onProgress: (k: number) => void;
  onLabels: (labels: StarLabel[]) => void;
  onWarp: (k: number) => void;
  onQuality: (quality: QualityLevel) => void;
  /** linha de rumo ("→ DESTINO · distância viva"); vazio = esconder */
  onDest: (text: string) => void;
  /** etapa viva do carregamento — o rótulo que o véu mostra */
  onStage: (text: string) => void;
}

export class Director {
  /** o painel de ajustes mexe em tom e exposição ao vivo */
  readonly engine: Engine;
  private post: Post;
  private nebula: Nebula;
  private stars!: StarField;
  private heroes!: HeroStars;
  private sunStar!: SunStar;
  private galaxy!: Galaxy;
  private observedClouds: ObservedClouds | null = null;
  private starForges: StarForges | null = null;
  private wrappedStars!: WrappedStars;
  private dustMapTexture: THREE.Texture | null = null;
  private structureMapTexture: THREE.Texture | null = null;
  /** nuvens do catálogo em coords de cena: x,y,z,raio,amp por registro */
  private seedCloudPool: Float32Array | null = null;
  private seedCloudScratch = new Float32Array(32 * 5);
  private seedCloudTimer = 0;
  private sun: NovoSol;
  private dust: Dust;
  private blackHole: BlackHolePass | null = null;
  private bgColor = new THREE.Color(0x000106);
  private rig = new JourneyRig();
  private roam: FreeRoam;
  private meta!: StarsMeta;
  /** última projeção de rótulos — alvo do clicar-para-visitar */
  private lastLabels: StarLabel[] = [];
  private prevLabelKeys = new Set<string>();
  private lastDest = '';
  private destTimer = 0;
  private pauseDragging = false;
  private pauseLastX = 0;
  private pauseLastY = 0;

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
  /** multiplicador do relógio da viagem (1× · 2× · 4×) */
  playbackRate = 1;
  private noNebula = false;
  private deepBg = new THREE.Color(0x010208);
  /** ?shot=1 congela o tempo visual — capturas determinísticas */
  private shotMode = false;
  /** prefers-reduced-motion: sem shake, sem pulso de warp/CA */
  private reducedMotion = false;
  /** toggles de debug: ?nogal=1&nosun=1&nodust=1&nohero=1&nocat=1 */
  private hide = new Set<string>();
  /** ?exp= na query desliga a auto-exposição (App.tsx aplica o valor fixo) */
  private expOverride = false;
  private events: DirectorEvents;
  private readonly abortController = new AbortController();
  private readonly debug = new URLSearchParams(window.location.search);
  private disposed = false;
  /** pré-compilação em voo; o dispose do renderer espera por ela */
  private warmup: Promise<unknown> | null = null;
  /** download disparado no construtor, consumido pelo init */
  private readonly assets: ReturnType<Director['startLoading']>;

  constructor(canvas: HTMLCanvasElement, events: DirectorEvents) {
    this.events = events;
    this.engine = new Engine(canvas);
    // A REDE PRIMEIRO. O prime do Sol (logo abaixo) são ~550 draws
    // offscreen síncronos, e ele não depende de um byte dos ativos — mas
    // como os fetches só nasciam no init(), os dois trabalhos rodavam em
    // SÉRIE. Disparados aqui, o prime e a compilação passam a acontecer
    // POR CIMA do download. init() só espera esta promise.
    this.assets = this.startLoading();
    // a promise agora nasce ANTES de quem a consome: se um dispose() vier
    // entre o construtor e o init(), o abort rejeitaria sem ninguém
    // ouvindo. Este ramo só cala o warning; o init continua vendo o erro.
    void this.assets.catch(() => {});
    this.post = new Post(this.engine.renderer, this.engine.scene, this.engine.camera);
    this.nebula = new Nebula(0.5);
    // Sol procedural transplantado (vivo: sim + bake + ciclo); o prime
    // do construtor compila os quads offscreen com RT amarrado
    this.sun = new NovoSol(this.engine.renderer, this.engine.camera, this.engine.quality);
    this.dust = new Dust();
    this.roam = new FreeRoam(canvas, this.engine.camera);
    this.engine.onQuality((quality) => {
      this.nebula.setScale(quality === 'performance' ? 0.35 : 0.5);
      // passos do raymarch: aqui e não no tick. Reescrever o mesmo valor
      // 60×/s era ruído; quem muda o preset é quem tem de aplicá-lo — o
      // auto-quality passa por aqui, e o default do Nebula (44) NÃO é o
      // do cinema (56), então o valor inicial também vem daqui.
      this.nebula.setSteps(this.engine.preset.nebulaSteps);
      // o preset de grão era config morta — nunca chegava ao shader
      this.post.setGrain(this.engine.preset.grain);
      this.blackHole?.setQuality(quality);
      this.events.onQuality(quality);
    });
    // o Engine já aplicou a qualidade no próprio construtor, antes destes
    // ouvintes existirem — o estado inicial precisa ser semeado à mão
    this.nebula.setSteps(this.engine.preset.nebulaSteps);
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
    this.expOverride = this.debug.has('exp');
    this.reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const k of [
      'nogal', 'nosun', 'nodust', 'nohero', 'nocat', 'nomarker', 'nocart', 'nowrap',
      // bissecção do ?nocart: nuvens CO e forjas separadamente
      'noco', 'noforge', 'nobh',
    ]) {
      if (this.debug.has(k)) this.hide.add(k);
    }

    // pausar-e-olhar: com a viagem pausada, arrastar olha ao redor;
    // no play a mira volta sozinha ao enquadramento do filme
    canvas.addEventListener('pointerdown', this.onPausePointerDown);
    window.addEventListener('pointermove', this.onPausePointerMove);
    window.addEventListener('pointerup', this.onPausePointerUp);

    // clique curto no voo livre → mini-viagem até a estrela nomeada
    this.roam.onTap = (x, y) => this.tryVisit(x, y);

    this.engine.onTick((t, dt) => this.tick(t, dt));
  }

  /**
   * catálogo HYG + ativos cartográficos em paralelo; os segundos são
   * progressivos — sem eles a cena continua procedural.
   * ?cart=off não baixa os ~6 MB que ninguém consumiria.
   */
  private startLoading() {
    const cartMode: CartographyMode =
      this.debug.get('cart') === 'off'
        ? 'off'
        : this.debug.get('cart') === 'obs'
          ? 'observed'
          : 'blend';
    return Promise.all([
      loadStarData(this.abortController.signal),
      cartMode === 'off'
        ? Promise.resolve(null)
        : loadGalacticAssets(this.abortController.signal),
    ]).then(([stars, galactic]) => ({ stars, galactic, cartMode }));
  }

  /**
   * Rótulo de etapa + fôlego para o browser PINTAR o rótulo. O init tem
   * ~5 s de CPU síncrona (bakes 1,6 s + buildGalaxy 3,27 s) e o loader
   * congelava junto — parecia travado exatamente enquanto mais trabalhava.
   * Barra por byte não conserta (a rede é a fatia pequena; ela pararia em
   * 100%). setTimeout(0) e não rAF: em aba de fundo o rAF é estrangulado
   * e o init nunca terminaria. O conserto DEFINITIVO é o Worker (fila
   * 2026-08-05, item 2); isto é o que dá para honestamente prometer sem ele:
   * o espectador vê O QUE está acontecendo, entre um congelamento e outro.
   */
  private async stage(text: string) {
    this.events.onStage(text);
    await new Promise<void>((r) => setTimeout(r, 0));
  }

  async init() {
    await this.stage('recebendo os catálogos…');
    const {
      stars: { stars: starArrays, meta },
      galactic,
      cartMode,
    } = await this.assets;
    if (this.disposed) return;
    this.meta = meta;
    await this.stage('acordando 328.749 estrelas…');

    // expoM0 é o "tempo de exposição": a magnitude aparente cujo pico de
    // PSF chega a 1. Com 3,5 as ~40 estrelas mais brilhantes do céu
    // saturam e ganham disco e spikes; o resto fica sub-saturado, que é
    // o que devolve ao campo os 8,6 mag de faixa dinâmica do catálogo.
    // O halo buildFarStars (mag 7,2–10,6 estático no Sol) morreu na
    // unificação 2: as cascas de wrappedStars cobrem essa população em
    // QUALQUER ponto do disco, com a mesma PSF e anti-dupla-contagem.
    this.stars = new StarField(starArrays, { expoM0: 3.5, sigmaPx: 0.85, tau: 0.045 });
    this.heroes = new HeroStars(this.meta.named);
    // o Sol sob a mesma lei dos heróis: de longe é estrela, não bola
    // (magnitude viva pela distância; o nearFade cede ao disco de perto)
    this.sunStar = new SunStar();
    this.engine.scene.add(this.sunStar.quad);

    // O mapa é bakeado SEMPRE: os canais B/A (braços/warp) alimentam
    // o envelope de gás do raymarch mesmo sem APOGEE (R/G zerados).
    const cartOn = Boolean(galactic) && cartMode !== 'off';
    await this.stage('assando a poeira do disco…');
    const dustBake = bakeDustMap(cartOn && galactic ? galactic.dustDensity : null);
    this.dustMapTexture = dustBake.texture;
    await this.stage('acoplando braços e warp…');
    const structureBake = bakeGalacticStructureMap(
      cartOn ? galactic : null,
      dustBake.density,
      dustBake.coverage,
      dustBake.arms
    );
    this.structureMapTexture = structureBake.texture;
    await this.stage('semeando quatro milhões de estrelas…');
    this.galaxy = new Galaxy(
      buildGalaxy(
        20260730,
        {
          gasResponse: structureBake.gasResponse,
          gasSupport: structureBake.gasSupport,
          youngResponse: structureBake.youngResponse,
          youngSupport: structureBake.youngSupport,
          size: DUST_MAP_SIZE,
          halfExtentPc: DUST_MAP_HALF_EXTENT,
        },
        this.engine.quality === 'performance' ? 0.28 : 1
      ),
      dustBake.texture,
      structureBake.texture
    );
    this.galaxy.setCartography(
      this.debug.has('discoff') ? 'off' : galactic ? cartMode : 'off'
    );
    // congela as lâminas (estáticas) em texturas — depois do modo
    await this.stage('revelando as lâminas do disco…');
    this.galaxy.bakeDiscLayers(this.engine.renderer);
    const tauTex = this.galaxy.tauMapTexture;
    this.nebula.setDustMap(dustBake.texture, cartOn ? 1 : 0);
    if (galactic && cartMode !== 'off') {
      this.observedClouds = new ObservedClouds(
        galactic.molecularClouds,
        galactic.largeMolecularClouds
      );
      this.starForges = new StarForges(galactic);
      // Extinção por coluna das forjas: a auditoria da rodada 26 achou a
      // chamada ANTES da criação (?. engolia em silêncio) — ela NUNCA
      // ligou, e toda a dosagem edge das rodadas 15–25 foi calibrada com
      // as forjas sem extinção. Ligar sob a dosagem atual foi MEDIDO:
      // edge 0,6441 → 0,7862 (thickRatio 0,050→0,040 quebra) e face
      // 0,0333 → 0,0301 (melhora). Fica DESLIGADA por padrão até a
      // rodada de re-dosagem sob o regime corrigido; ?forgetau=1 liga
      // para varrer. Detalhe no NORTE.
      if (tauTex && this.debug.has('forgetau')) {
        this.starForges.setTauMap(tauTex);
      }
      this.engine.scene.add(this.observedClouds.mesh);
      this.engine.scene.add(this.starForges.points);
      this.buildSeedCloudPool(galactic);
      if (dustBake) {
        console.info(
          `[cartografia] APOGEE ${(dustBake.coverageFraction * 100).toFixed(1)}% ` +
            'do disco; campo acoplado com ' +
            `${(structureBake.gasCoverageFraction * 100).toFixed(1)}% ` +
            'de suporte material e ' +
            `${(structureBake.youngCoverageFraction * 100).toFixed(1)}% ` +
            'de suporte em traçadores jovens.'
        );
      }
    }
    if (this.disposed) return;

    // canais B/A do dust map alimentam a densidade das cascas (1 fetch
    // no lugar dos braços/warp analíticos por vértice — medido +5 ms)
    this.wrappedStars = new WrappedStars(this.dustMapTexture, {
      magLimit: this.meta.magLimit,
      horizonPc: this.meta.horizonPc,
    });
    this.engine.scene.add(this.wrappedStars.points);
    // Sagittarius A* — passe de pós que só liga perto do centro
    // (custo ZERO desligado: o composer o pula; shader compila na
    // primeira aproximação). Ver blackHole.ts.
    this.blackHole = new BlackHolePass();
    this.blackHole.setQuality(this.engine.quality);
    this.post.addBlackHole(this.blackHole);
    this.engine.scene.add(this.stars.points);
    this.engine.scene.add(this.sun.group);
    this.engine.scene.add(this.dust.points);
    this.engine.scene.add(this.heroes.group);
    this.engine.scene.add(this.galaxy.group);
    this.engine.scene.background = this.nebula.texture;
    this.engine.scene.backgroundIntensity = 1.0;

    // Pré-compilação sob o véu: sem ela, o primeiro uso de cada programa
    // espera o link do ANGLE/FXC bloqueando a thread (medido a frio:
    // ~10–15 s congelados na intro; e o BH compilava sozinho no meio do
    // mergulho, t≈187). KHR_parallel_shader_compile compila em threads
    // do driver — aqui só se espera, com a thread viva. Os quads de pós
    // (nebulosa, BH) não estão na cena: entram por uma cena descartável.
    // Captura (?shot=) pula: o polling queimaria o virtual-time-budget,
    // e sob tempo virtual o stall síncrono de sempre não custa nada.
    if (!this.shotMode) {
      await this.stage('compilando os shaders…');
      const warm = new THREE.Scene();
      // a chave de programa inclui a PRESENÇA do atributo normal
      // (vertexNormals): o quad da nebulosa é PlaneGeometry (tem normal),
      // o FullScreenQuad do BH é um triângulo só com position+uv — cada
      // material precisa compilar contra a geometria que vai usá-lo
      const warmGeo = new THREE.PlaneGeometry(2, 2);
      const warmGeoBH = new THREE.PlaneGeometry(2, 2);
      warmGeoBH.deleteAttribute('normal');
      for (const m of this.nebula.warmupMaterials) {
        warm.add(new THREE.Mesh(warmGeo, m));
      }
      for (const m of [
        ...(this.blackHole?.warmupMaterials ?? []),
        ...this.post.warmupMaterials,
      ]) {
        warm.add(new THREE.Mesh(warmGeoBH, m));
      }
      // A chave de programa do three inclui o colorSpace de SAÍDA, que é
      // "tela" quando nenhum render target está amarrado — e no frame real
      // tudo renderiza DENTRO do composer (linear). Compilar sem RT gera a
      // variante errada e o primeiro frame re-linka tudo (medido: 8,7 s).
      const warmRt = new THREE.WebGLRenderTarget(2, 2);
      this.engine.renderer.setRenderTarget(warmRt);
      try {
        // guardado porque o dispose PRECISA esperar por ele: o
        // compileAsync do three faz polling por setTimeout lendo
        // `materialProperties.currentProgram`, e renderer.dispose()
        // apaga essas propriedades — o polling seguinte estoura com
        // "isReady of undefined", fora de qualquer try/catch nosso
        this.warmup = Promise.all([
          this.engine.renderer.compileAsync(this.engine.scene, this.engine.camera),
          this.engine.renderer.compileAsync(warm, this.engine.camera),
        ]);
        await this.warmup;
      } finally {
        this.warmup = null;
        this.engine.renderer.setRenderTarget(null);
        warmRt.dispose();
        warmGeo.dispose();
        warmGeoBH.dispose();
      }
      if (this.disposed) return;
    }

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
    // captura/deep-link: sem slerp de entrada — orientação exata no frame 1
    this.roam.snapCanonical();
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
    this.playbackRate = 1;
    this.leftDisk = false;
    this.rig.reset();
    this.rig.paused = false;
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

  /** instante atual da viagem — para gravar o momento num link */
  get currentTime() {
    return this.journeyT;
  }

  /** pausa/retoma a viagem; retorna o novo estado (true = pausado) */
  togglePause(): boolean {
    if (this.phase !== 'journey') return false;
    this.freezeJourney = !this.freezeJourney;
    this.rig.paused = this.freezeJourney;
    return this.freezeJourney;
  }

  /** início do Ato IV — o botão "Ver a galáxia" salta para cá */
  get revealTime() {
    return REVEAL_T;
  }

  /**
   * Troca AO VIVO uma camada cuja flag o tick lê a cada quadro — o
   * painel de ajustes não precisa recarregar a página para elas.
   * (nodisc/nogdust/noglow seguem exigindo reload: são lidas no bake.)
   */
  setLayerHidden(flag: string, hidden: boolean) {
    if (flag === 'nonebula') {
      this.noNebula = hidden;
      return;
    }
    if (hidden) this.hide.add(flag);
    else this.hide.delete(flag);
  }

  // ---- pausar-e-olhar (viagem congelada) -------------------------
  private get pauseLookActive() {
    return this.phase === 'journey' && this.freezeJourney;
  }

  private onPausePointerDown = (event: PointerEvent) => {
    if (!this.pauseLookActive) return;
    this.pauseDragging = true;
    this.pauseLastX = event.clientX;
    this.pauseLastY = event.clientY;
  };

  private onPausePointerMove = (event: PointerEvent) => {
    if (!this.pauseDragging || !this.pauseLookActive) return;
    this.rig.addLookDelta(
      event.clientX - this.pauseLastX,
      event.clientY - this.pauseLastY
    );
    this.pauseLastX = event.clientX;
    this.pauseLastY = event.clientY;
  };

  private onPausePointerUp = () => {
    this.pauseDragging = false;
  };

  /** etiqueta forçada do assunto do shot ('SOL' | 'SGR' | nome HYG) */
  private resolveForcedLabel(cam: THREE.PerspectiveCamera, name: string): StarLabel | null {
    if (name === 'SOL') {
      return projectForced(cam, 'SOL', 'G2V', { x: 0, y: 0, z: 0 }, 'sol-home');
    }
    if (name === 'SGR') {
      return projectForced(cam, 'Sagittarius A✱', 'SMBH', GAL.GC_POS, 'sgr-a');
    }
    const star = this.meta.named.find((s) => s.n === name);
    return star ? projectForced(cam, star.n, star.s, star, star.n) : null;
  }

  /** "→ DESTINO · distância viva" — só emite quando o texto muda */
  private emitDest(dest: string | undefined, camPos: THREE.Vector3) {
    let text = '';
    if (dest) {
      const target =
        dest === 'SGR' ? GAL.GC_POS : this.meta?.named.find((s) => s.n === dest);
      if (target) {
        const d = camPos.distanceTo(
          target instanceof THREE.Vector3
            ? target
            : new THREE.Vector3(target.x, target.y, target.z)
        );
        const al = d * 3.262;
        const fmt =
          al < 100
            ? `${al.toFixed(1)} AL`
            : al < 10_000
              ? `${Math.round(al)} AL`
              : `${(al / 1000).toFixed(1)} MIL AL`;
        const label = dest === 'SGR' ? 'SAGITTARIUS A✱' : dest.toUpperCase();
        text = `→ ${label} · ${fmt}`;
      }
    }
    // aparecer/sumir é imediato; o contador vivo atualiza a 4 Hz
    const changedKind = (text === '') !== (this.lastDest === '');
    if (text !== this.lastDest && (changedKind || this.destTimer > 0.25)) {
      this.lastDest = text;
      this.destTimer = 0;
      this.events.onDest(text);
    }
  }

  /** clique curto no voo livre: viaja até o rótulo mais próximo */
  private tryVisit(x: number, y: number) {
    if (this.phase !== 'free' || !this.meta) return;
    let best: StarLabel | null = null;
    let bestD = 0.0035; // ~6% da tela ao quadrado
    for (const label of this.lastLabels) {
      if (label.opacity < 0.15) continue;
      const dx = label.x - x;
      const dy = label.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = label;
      }
    }
    if (!best) return;
    if (best.key === 'sgr-a') {
      this.roam.startVisit({ pos: GAL.GC_POS.clone(), arriveDist: 7 });
      return;
    }
    const star =
      best.key === 'sol-home'
        ? { n: 'Sol', x: 0, y: 0, z: 0 }
        : this.meta.named.find((s) => s.n === best.name);
    if (!star) return;
    const pos = new THREE.Vector3(star.x, star.y, star.z);
    this.roam.startVisit({
      pos,
      arriveDist: THREE.MathUtils.clamp(
        pos.distanceTo(this.engine.camera.position) * 0.08,
        0.8,
        9
      ),
    });
  }

  /** scrub pela barra de progresso (fração 0..1) */
  seekFraction(fraction: number) {
    if (this.phase === 'end') this.play();
    this.seek(THREE.MathUtils.clamp(fraction, 0, 1) * this.rig.duration);
  }

  /** setas ←/→: salta para o capítulo anterior/seguinte (as legendas) */
  skipChapter(dir: 1 | -1) {
    if (this.phase !== 'journey') return;
    const times = this.rig.ticks.map((k) => k.t * this.rig.duration);
    if (dir > 0) {
      const next = times.find((x) => x > this.journeyT + 0.5);
      if (next !== undefined) this.seek(next);
    } else {
      // como em players de vídeo: volta ao início do capítulo atual;
      // apertando de novo (perto do início), ao anterior
      const prevs = times.filter((x) => x < this.journeyT - 2.5);
      this.seek(prevs.length ? prevs[prevs.length - 1] : 0);
    }
  }

  /** 1× → 2× → 4× → 1× */
  cyclePlaybackRate(): number {
    this.playbackRate = this.playbackRate >= 4 ? 1 : this.playbackRate * 2;
    return this.playbackRate;
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

  /**
   * Exposição escolhida à mão (painel ou ?exp=) DESLIGA a auto-exposição por
   * rampa — sem o latch o tick reescrevia o valor no quadro seguinte e o
   * controle ao vivo não fazia nada (o link com ?exp= só funcionava recarregando).
   */
  setExposure(v: number) {
    this.expOverride = true;
    this.engine.setExposure(v);
  }

  get progressTicks(): { t: number; text: string }[] {
    return this.rig.ticks;
  }

  private tick(rawTime: number, dt: number) {
    // tempo VISUAL: congelado no modo foto (grão, pulsos, coroa e
    // deriva da poeira idênticos entre capturas do mesmo instante)
    const time = this.shotMode ? 0 : rawTime;
    const cam = this.engine.camera;
    let warp = 0;

    if (this.phase === 'journey') {
      if (!this.freezeJourney) this.journeyT += dt * this.playbackRate;
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
    const dGC = cam.position.distanceTo(GAL.GC_POS);
    // o near acompanha a âncora mais PRÓXIMA (Sol ou centro galáctico):
    // na rasante de Sgr A* o near de dezenas de pc comeria o buraco negro
    this.engine.updateClip(Math.min(dHome, dGC));

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

    this.destTimer += dt;
    // nuvens-semente do raymarch + cavidade do observador itinerante
    this.seedCloudTimer += dt;
    if (this.seedCloudTimer > 0.25) {
      this.seedCloudTimer = 0;
      // o MESMO 0,02 do gate do raymarch lá embaixo: abaixo dele o
      // `nebula.render` não roda, e varrer o pool de nuvens-semente
      // alimentava um shader que ninguém ia executar
      if (nebulaFade > 0.02) this.updateSeedClouds(cam.position);
    }
    // a MESMA cavidade em todos os consumidores da densidade: raymarch,
    // extinção das estrelas e brilho da poeira próxima
    const cavityGate = THREE.MathUtils.smoothstep(dHome, 600, 1300);
    this.nebula.setCavity(cam.position, cavityGate);
    this.stars?.setCavity(cam.position, cavityGate);
    this.dust.setCavity(cam.position, cavityGate);

    if (this.debug.has('dbgfade')) {
      console.log(
        `[dbgfade] dHome=${dHome.toFixed(0)} gal=${galaxyFade.toFixed(2)} ` +
          `loc=${localFade.toFixed(2)} hide=[${[...this.hide].join(',')}] ` +
          `galVis=${this.galaxy?.group.visible} phase=${this.phase} jt=${this.journeyT.toFixed(1)}`
      );
    }

    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    this.stars?.update(cam.position, hPx);
    const catFade = this.hide.has('nocat') ? 0 : localFade;
    this.wrappedStars?.update(
      cam.position,
      hPx,
      this.hide.has('nowrap') ? 0 : 1,
      catFade
    );
    this.stars?.setFade(catFade);
    this.dust.setFade(this.hide.has('nodust') ? 0 : localFade);
    this.nebula.setFade(nebulaFade);
    // heroes esmaecem a zero em farFade (900 pc) — além disso os
    // draws são garantidamente invisíveis
    if (this.heroes) {
      this.heroes.group.visible = !this.hide.has('nohero') && dHome < 1200;
    }
    this.heroes?.update(time, cam.position, tanHalfFov);
    this.sun.group.visible = !this.hide.has('nosun');
    // a PSF do Sol vive FORA do group (o group some no crossfade) — só
    // ?nosun a desliga
    this.sunStar.quad.visible = !this.hide.has('nosun');
    this.sunStar.update(time, dHome, tanHalfFov);
    // journeyT dirige a dramaturgia do ciclo (mínimo→máximo na hélice)
    this.sun.update(time, this.engine.camera, this.journeyT);
    // DEPOIS do update, porque é lá que o `world > 0.02` decide se o grupo
    // some. A fotosfera está na ORIGEM (o grupo do Sol só é escalado, nunca
    // posicionado) e seu raio de mundo é WORLD.sunRadius por construção
    // (esfera de 2,2 do doador × escala WORLD.sunRadius/2,2). Enquanto ela
    // estiver na cena, o raymarch da nebulosa não precisa integrar o que ela
    // cobre — ver o cone em nebula.ts.
    this.nebula.setSunOccluder(ORIGEM, this.sun.group.visible ? WORLD.sunRadius : 0);
    this.dust.update(cam.position, hPx, time);
    // Sgr A*: só de perto (a extinção real esconde o centro de longe);
    // as capturas de medição ficam a 24/33 kpc — fade 0, passe desligado
    this.blackHole?.updateFrame(
      cam.position,
      cam,
      time,
      this.hide.has('nobh') ? 0 : 1 - THREE.MathUtils.smoothstep(dGC, 1400, 2400)
    );
    // AUTO-EXPOSIÇÃO: a vista externa é outro assunto fotográfico. A
    // rodada 18 venceu com 1,40 (sem knee); a rodada 20, com o knee
    // asinh no pós e chromsat na extinção assumindo a compressão, mediu
    // o ótimo CONJUNTO em 1,05 (edge 0,8275, face 0,0517 — os dois
    // recordes). Dentro do disco (fade 0) fica o 1,02 de sempre — a
    // vista interna não tem gate e satura fácil de branco.
    if (!this.expOverride) {
      this.engine.setExposure(1.02 + 0.03 * galaxyFade);
    }
    // ?galstat=1 — quantos dos 4,02 M pontos da galáxia estão DENTRO do
    // frustum. Roda uma vez, no primeiro quadro, e guarda em window.__galstat.
    // Existe porque o custo do passe é LINEAR na contagem submetida (medido:
    // 1,22 ms por milhão, intercepto zero), então esta fração é o outro fator
    // do produto — e sem ela qualquer conta sobre recorte é fé. Medido:
    // 2,55% em t=0 · 2,00% em t=100 · 49,3% em t=180 · 99,98% no face-on.
    if (this.debug.has('galstat') && !(window as unknown as { __galstat?: unknown }).__galstat) {
      const pts = (this.galaxy as unknown as { brightPts?: THREE.Points })?.brightPts;
      if (pts) {
        const fr = new THREE.Frustum().setFromProjectionMatrix(
          new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)
        );
        const pos = pts.geometry.attributes.position;
        const v = new THREE.Vector3();
        // margem: ponto FORA do frustum ainda aparece pelo tamanho dele (até
        // uMaxPx = 20 px). A 8 kpc, 10 px valem ~37 pc; 50 é folga honesta.
        const sp = new THREE.Sphere(new THREE.Vector3(), 50);
        let dentro = 0;
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i);
          sp.center.copy(v);
          if (fr.intersectsSphere(sp)) dentro++;
        }
        (window as unknown as { __galstat: unknown }).__galstat = {
          total: pos.count, dentro, pct: +((100 * dentro) / pos.count).toFixed(2),
        };
      }
    }
    this.galaxy?.update(
      cam.position,
      hPx,
      tanHalfFov,
      time,
      this.hide.has('nogal') ? 0 : galaxyFade,
      this.hide.has('nomarker') ? 0 : markerFade,
      this.hide.has('nogal') ? 0 : localBandFade
    );
    // Nuvens moleculares já entram integradas no structureMap da vista
    // externa. Billboards 3D ficam só no disco, onde a paralaxe comunica
    // profundidade; no zoom-out duplicavam o dado como buracos circulares.
    // Traçadores estelares continuam visíveis em ambas as escalas.
    const cartHidden = this.hide.has('nocart') || this.hide.has('nogal');
    this.observedClouds?.update(
      tanHalfFov,
      // As nuvens CO medidas são as fendas REAIS da Via Láctea; ficarem
      // em fade 0 na vista externa era jogar fora a tonalidade delas
      // justamente na vista que a mostra melhor.
      // soma, não max: rampas complementares (ver galaxy.ts, mesmo defeito)
      cartHidden || this.hide.has('noco')
        ? 0
        : galaxyFade * 0.55 + localBandFade * 0.72
    );
    this.starForges?.update(
      cam.position,
      hPx,
      tanHalfFov,
      time,
      cartHidden || this.hide.has('noforge')
        ? 0
        : galaxyFade + localBandFade * 0.6
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
    // (7 projeções + um canvas 2D pequeno: custo desprezível).
    // Na viagem, menos rótulos (cinema); no voo livre, mais (são os
    // alvos do clicar-para-visitar).
    if ((this.phase === 'journey' || this.phase === 'free') && this.meta) {
      if (this.phase === 'journey') {
        // REGRA EDITORIAL da revisão: o assunto do beat sempre tem nome
        // (target, etiqueta forçada, sem fades) e o fundo fica mudo
        // (quiet) ou limitado a 2 durante o beat. SOL e Sagittarius A✱
        // são sempre isentos do filtro de centro.
        const meta = this.rig.metaAt(this.journeyT);
        let labels = meta.quiet
          ? []
          : projectLabels(cam, this.meta.named, 4, this.prevLabelKeys).filter(
              (l) => {
                if (l.key === 'sol-home' || l.key === 'sgr-a') return true;
                const dx = l.x - 0.5;
                const dy = l.y - 0.5;
                return dx * dx + dy * dy > 0.012; // ~11% do quadro
              }
            );
        if (dHome < 1.5 && !meta.target) labels = [];
        if (meta.target) {
          const forced: StarLabel[] = [];
          for (const name of meta.target) {
            const l = this.resolveForcedLabel(cam, name);
            if (l) forced.push(l);
          }
          const keys = new Set(forced.map((l) => l.key));
          labels = labels.filter((l) => !keys.has(l.key)).slice(0, 2);
          labels.push(...forced);
        }
        this.lastLabels = labels;
        // linha de rumo com distância viva
        this.emitDest(meta.dest, cam.position);
      } else {
        this.lastLabels = projectLabels(cam, this.meta.named, 7, this.prevLabelKeys);
        this.emitDest(undefined, cam.position);
      }
      this.prevLabelKeys = new Set(this.lastLabels.map((l) => l.key));
      this.events.onLabels(this.lastLabels);
    } else if (this.phase !== 'journey') {
      this.lastLabels = [];
      this.events.onLabels([]);
      this.emitDest(undefined, cam.position);
    }

    this.post.setGalaxy(galaxyFade);
    this.post.setWarp(this.reducedMotion ? 0 : warp);
    // gate 0.02: na casca externa do fade a contribuição é invisível
    // pós-ACES, mas o raymarch custaria integral
    if (this.noNebula || nebulaFade <= 0.02) {
      // longe de casa o céu é o preto profundo — a galáxia é a luz
      this.engine.scene.background = this.noNebula ? this.deepBg : this.bgColor;
    } else {
      this.engine.scene.background = this.nebula.texture;
      this.nebula.render(this.engine.renderer, cam);
    }
    this.post.render(time);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    // aborta JÁ (os fetches em voo não interessam mais); o resto pode
    // esperar
    this.abortController.abort();
    // A pré-compilação do three faz polling por setTimeout lendo
    // `materialProperties.currentProgram` de cada material da lista.
    // Qualquer material.dispose() nosso remove essas propriedades e o
    // polling seguinte estoura com "isReady of undefined" — dentro de um
    // timer, fora de qualquer try/catch. Então o teardown INTEIRO espera
    // o warm-up assentar. (Só aparecia em dev: a limpeza do efeito do
    // React durante o Fast Refresh caía no meio da carga.)
    if (this.warmup) {
      void this.warmup.catch(() => {}).then(() => this.teardown());
      return;
    }
    this.teardown();
  }

  private teardown() {
    // `disposed` já está travado: um passo que estoure NÃO pode levar
    // junto o resto do teardown. Sem isto, uma exceção no meio deixava
    // o Engine vivo — RAF rodando uma cena zumbi e o contexto WebGL
    // preso para sempre, porque a segunda chamada retorna no início.
    const step = (label: string, fn: () => void) => {
      try {
        fn();
      } catch (error) {
        console.warn(`[dispose] ${label} falhou; seguindo.`, error);
      }
    };
    step('roam', () => this.roam.dispose());
    step('listeners', () => {
      this.engine.renderer.domElement.removeEventListener('pointerdown', this.onPausePointerDown);
      window.removeEventListener('pointermove', this.onPausePointerMove);
      window.removeEventListener('pointerup', this.onPausePointerUp);
    });
    step('blackHole', () => this.blackHole?.dispose());
    // recursos do mundo ANTES do renderer: material descartado depois
    // de renderer.dispose() não chama deleteProgram
    step('stars', () => this.stars?.dispose());
    step('heroes', () => this.heroes?.dispose());
    step('galaxy', () => this.galaxy?.dispose());
    step('observedClouds', () => this.observedClouds?.dispose());
    step('starForges', () => this.starForges?.dispose());
    step('wrappedStars', () => this.wrappedStars?.dispose());
    step('dustMap', () => this.dustMapTexture?.dispose());
    step('structureMap', () => this.structureMapTexture?.dispose());
    step('sun', () => this.sun.dispose());
    // sunStar nasce depois do await do init: falha de carga chega aqui
    // com ele indefinido
    step('sunStar', () => this.sunStar?.dispose());
    step('dust', () => this.dust.dispose());
    step('nebula', () => this.nebula.dispose());
    step('post', () => this.post.dispose());
    step('engine', () => this.engine.dispose());
  }
}
