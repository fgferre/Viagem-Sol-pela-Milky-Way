// ============================================================
// Pós-processamento — bloom HDR (Unreal) + gradação de filme.
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { Pass } from 'three/addons/postprocessing/Pass.js';
import { FILM_SHADER } from '../shaders/dustShaders';

// KNEE pré-ACES (rodada 19): compressão asinh do compósito HDR — o tone
// map de divulgação da referência (Lupton 2004; Filmic/AgX) comprime
// 1,5–2 dex acima de um knee em ~3% do pico, e é ISSO (não perfil de
// massa) que faz o R90 dela chegar a 0,55·R_disco. Por camada não
// funciona: cada sprite aditivo é minúsculo e asinh(x)≈x — a compressão
// tem de ver a soma. uAmt segue a rampa da galáxia (interior intocado).
// ?knee= (β em luz linear; ausente = desligado) e ?kneemode=lum|rgb —
// rgb dessatura altas-luzes como filme; lum preserva o matiz do halo.
const KNEE_SHADER = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uAmt: { value: 0 },
    uBeta: { value: 0.3 },
    uMode: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uAmt;
    uniform float uBeta;
    uniform float uMode;
    varying vec2 vUv;
    // GLSL não tem asinh nativo
    vec3 asinh3(vec3 v) { return log(v + sqrt(v * v + 1.0)); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 x = max(c.rgb, 0.0);
      vec3 knee;
      if (uMode > 0.5) {
        knee = uBeta * asinh3(x / uBeta);
      } else {
        float y = dot(x, vec3(0.2126, 0.7152, 0.0722));
        float ky = uBeta * asinh3(vec3(y / uBeta)).x;
        knee = x * (y > 1e-6 ? ky / y : 1.0);
      }
      gl_FragColor = vec4(mix(x, knee, uAmt), c.a);
    }
  `,
};

export class Post {
  readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
  private film: ShaderPass;
  private knee: ShaderPass;
  private kneeOn = false;
  private outputPass!: OutputPass;
  private renderer: THREE.WebGLRenderer;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.72, // força
      0.58, // raio
      0.82 // limiar — preserva a fotosfera e faz estrelas HDR florescerem
    );
    this.composer.addPass(this.bloom);

    // knee asinh no HDR composto (depois do bloom, antes do ACES).
    // Default LIGADO com β=0,45 (rodada 20: com chromsat=0,5 na extinção,
    // knee 0,45 + exp 1,05 venceu os DOIS gates — edge 0,8275, face
    // 0,0517). ?knee=0 desliga; ?knee=β varre; ?kneemode=lum|rgb.
    this.knee = new ShaderPass(KNEE_SHADER as never);
    const q = new URLSearchParams(window.location.search);
    const raw = q.get('knee');
    const beta = raw === null ? 0.45 : parseFloat(raw);
    this.kneeOn = Number.isFinite(beta) && beta > 0;
    if (this.kneeOn) {
      (this.knee.uniforms as Record<string, { value: number }>).uBeta.value = beta;
      (this.knee.uniforms as Record<string, { value: number }>).uMode.value =
        q.get('kneemode') === 'lum' ? 0 : 1;
    }
    // ?kneeamt= força o amount (a rampa galaxyFade zera o knee DENTRO
    // da galáxia; o gate do céu interno precisa varrê-lo de dentro)
    const rawAmt = q.get('kneeamt');
    this.forcedAmt = rawAmt === null ? null : parseFloat(rawAmt);
    if (this.kneeOn && this.forcedAmt !== null && Number.isFinite(this.forcedAmt)) {
      (this.knee.uniforms as Record<string, { value: number }>).uAmt.value = this.forcedAmt;
    }
    this.knee.enabled = this.kneeOn;
    this.composer.addPass(this.knee);

    // OutputPass (ACES + sRGB) ANTES da gradação: grão, vinheta e
    // elevação de negros operam em espaço de DISPLAY, como autorados.
    // Antes do tonemap, o joelho do ACES esmagava o lift e o grão.
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
    this.film = new ShaderPass(FILM_SHADER as never);
    this.composer.addPass(this.film);
  }

  /**
   * Sgr A* entra logo depois da cena e ANTES do bloom: o disco de
   * acreção floresce como qualquer fonte HDR. O insertPass não
   * dimensiona o passe novo — repassamos o tamanho atual do buffer.
   */
  addBlackHole(pass: Pass) {
    this.composer.insertPass(pass, 1);
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    pass.setSize(size.x, size.y);
  }

  /** amplitude do grão por preset de qualidade */
  setGrain(v: number) {
    (this.film.uniforms as Record<string, { value: number }>).uGrain.value = v;
  }

  setSize(w: number, h: number) {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
  }

  private galaxyMode = 0;
  private forcedAmt: number | null = null;

  /**
   * Modo galáxia (0..1): o bojo é uma fonte HDR enorme — sem
   * moderação o bloom engole a tela inteira. Sobe o limiar e
   * baixa a força conforme a galáxia domina o quadro.
   */
  setGalaxy(k: number) {
    this.galaxyMode = k;
    // o knee segue a mesma rampa da vista externa que a auto-exposição
    if (this.kneeOn) {
      (this.knee.uniforms as Record<string, { value: number }>).uAmt.value =
        this.forcedAmt ?? k;
    }
  }

  /** Pulso de bloom durante acelerações da viagem (0..1). */
  setWarp(k: number) {
    const g = this.galaxyMode;
    // moderação mais firme na vista externa: o bojo é uma fonte HDR
    // enorme e virava uma bola branca que engolia barra e fendas
    this.bloom.strength = (0.72 - 0.34 * g) * (1 + k * 0.4);
    this.bloom.threshold = 0.82 + 0.52 * g;
    this.bloom.radius = 0.58 - 0.18 * g;
    (this.film.uniforms as Record<string, { value: number }>).uCA.value =
      0.00012 + k * 0.00042;
  }

  render(time: number) {
    (this.film.uniforms as Record<string, { value: number }>).uTime.value = time;
    this.composer.render();
  }

  dispose() {
    // EffectComposer.dispose() NÃO dispõe os passes: o UnrealBloom
    // sozinho retém 11 render targets HDR na VRAM
    this.bloom.dispose();
    this.film.dispose();
    this.knee.dispose();
    this.outputPass.dispose();
    this.composer.dispose();
  }
}
