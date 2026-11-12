// ============================================================
// Sagittarius A* — passe de pós-processamento em dois estágios
// (shaders/blackHoleShaders.ts): MARCH em alvo com orçamento de
// pixels (o truque de custo da demo de referência, que limita o
// buffer a ~3,8 MP) + COMPOSITE em resolução nativa com deflexão
// analítica. A lente dobra a CENA REAL (é o tScene do composer).
//
// Custo longe do centro: ZERO — o passe fica enabled=false (o
// EffectComposer o pula por inteiro) e os shaders só compilam na
// primeira aproximação (~2,4 kpc, no meio do warp do mergulho —
// um hitch de um frame escondido pelo movimento).
//
// ESCALA ARTÍSTICA (documentada): o RS real de Sgr A* (4,15e6 M☉)
// é 4e-7 pc — invisível a qualquer distância de voo. Adotamos
// RS = 0,05 pc (~1,2e5× o real) para o disco de acreção (26 RS =
// 1,3 pc) ler como Gargantua no periastro de 1,5 pc (≈ 30 RS). A
// física do shader é adimensional em RS e não muda com a escala.
// A extinção real (~30 mag no visível até o centro) justifica o
// fade por distância. ?nobh=1 desliga; ?bhgain= e ?bhsteps= varrem.
//
// A DESCIDA AO BURACO REAL (12/11/2026) — UMA regra só, pela DISTÂNCIA
// da câmera ao centro, igual no Atlas, no voo livre e nos filmes (o
// universo é um só): de 1,4 pc para fora a escala inflada de sempre
// (o rasante do filme galáctico passa a 1,5 pc e sai igual, bit a bit);
// de 1,4 pc a 100 RS reais (8,5 UA) o RS desenhado desce, em escala
// logarítmica, do inflado ao verdadeiro (0,085 UA); dali para dentro o
// disco tem o tamanho real — ver `entregaDoBuraco`.
//
// ?bh= — BOTÃO TEMPORÁRIO, até o dono escolher o "de perto" pela prancha:
//   gargantua (padrão) — o disco deste shader, na escala real de perto;
//   lente — o buraco nu da lenteDoBuracoNegro.ts (a lente exata, sem
//           disco); o Gargantua apaga entre 1,4 e 0,14 pc e a lente assume;
//   ambos — de perto, a lente exata dobra o fundo e este shader desenha
//           só o disco e a sombra por cima (sem dobrar o fundo de novo).
// ============================================================
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { BH_VERT, BH_MARCH_FRAG, BH_COMPOSITE_FRAG } from '../shaders/blackHoleShaders';
import { GAL, EX, EY, EZ } from './baseGalactica';
import type { QualityLevel } from '../core/engine';
import { RS_SGR_A_PC } from '../../lib/buracoNegro';
import { RAIOS_DA_ENTREGA_DO_BURACO } from '../escala';

const RS_PC = 0.05;
// 26 RS (a demo usa 40 sobre céu PRETO): contra o fundo dourado do
// nosso núcleo, o anel externo do disco não brilha — vira silhueta; um
// disco mais compacto e mais translúcido lê como objeto, não mancha
const DISK_OUT_RS = 26;
// Fronteira integrado ↔ analítico. Ela trabalha na APROXIMAÇÃO e na
// saída (câmera a milhares de RS: quase a tela inteira pega o ramo
// barato) e é INERTE dentro de ~3 pc, DE PROPÓSITO: com o olhar preso
// no GC, b = |ro|·sin(φ) e o canto da tela dá b_max ≈ 22 RS no
// periastro — abaixo de DISK_OUT_RS (26) e da rampa externa do disco
// (começa em 16). Baixá-la o bastante para "acender" no clímax
// recortaria a borda do disco nos cantos. Duas auditorias já
// recomendaram recalibrar; a resposta medida é NÃO.
const MARCH_B_RS = 60;
// passos como os perfis da demo; orçamento de pixels do alvo do march
const STEPS: Record<QualityLevel, number> = { cinema: 460, alta: 320, performance: 200 };
const BUDGET: Record<QualityLevel, number> = { cinema: 2.6e6, alta: 1.7e6, performance: 1.0e6 };

export type ModoDoPerto = 'lente' | 'gargantua' | 'ambos';

/** o `?bh=` (ver o cabeçalho); ausente ou inválido = `gargantua` */
export function lerModoDoPerto(busca: string): ModoDoPerto {
  const v = new URLSearchParams(busca).get('bh');
  return v === 'lente' || v === 'ambos' ? v : 'gargantua';
}

export interface EntregaDoBuraco {
  /** o RS desenhado, em pc */
  rsPc: number;
  fade: number;
  /** a lente exata (`lenteDoBuracoNegro.ts`) pode ligar */
  lente: boolean;
  /** o fundo já chega dobrado pela lente: este passe não o dobra de novo */
  fundoDobrado: boolean;
}

/** de onde para dentro o RS desenhado começa a descer ao real, em pc */
export const INICIO_DA_DESCIDA_PC = 1.4;

/**
 * Quem desenha Sgr A✱ com a câmera a `dGC` pc do centro — e SÓ isso decide:
 * nenhum modo, nenhuma fase. Nunca os dois passes dobram o mesmo fundo: no
 * `lente` a lente só liga com o Gargantua já apagado; no `ambos`, a lente
 * dobra e o Gargantua só pinta disco e sombra.
 */
export function entregaDoBuraco(dGC: number, modo: ModoDoPerto): EntregaDoBuraco {
  const fade = 1 - THREE.MathUtils.smoothstep(dGC, 1400, 2400);
  const fim = RAIOS_DA_ENTREGA_DO_BURACO * RS_SGR_A_PC;
  let rsPc = RS_PC;
  if (dGC <= fim) rsPc = RS_SGR_A_PC;
  else if (dGC < INICIO_DA_DESCIDA_PC) {
    const t = Math.log(dGC / fim) / Math.log(INICIO_DA_DESCIDA_PC / fim);
    rsPc = RS_SGR_A_PC * Math.pow(RS_PC / RS_SGR_A_PC, t);
  }
  if (modo === 'lente') {
    const f = fade * THREE.MathUtils.smoothstep(dGC, INICIO_DA_DESCIDA_PC / 10, INICIO_DA_DESCIDA_PC);
    return { rsPc, fade: f, lente: f === 0, fundoDobrado: false };
  }
  const real = modo === 'ambos' && rsPc === RS_SGR_A_PC;
  return { rsPc, fade, lente: real, fundoDobrado: real };
}

const _q = new THREE.Vector3();
const _r = new THREE.Vector3();

function toLocal(v: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  // referencial do disco: y = polo galáctico (EZ da cena)
  return out.set(v.dot(EX), v.dot(EZ), v.dot(EY));
}

export class BlackHolePass extends Pass {
  private rtMarch: THREE.WebGLRenderTarget;
  private matMarch: THREE.ShaderMaterial;
  private matComposite: THREE.ShaderMaterial;
  private quad: FullScreenQuad;
  private quality: QualityLevel = 'cinema';
  private width = 1;
  private height = 1;
  private stepsOverride: number | null;
  /** o `?bh=` lido no boot (ver o cabeçalho) */
  readonly modoDoPerto: ModoDoPerto;

  constructor() {
    super();
    this.enabled = false;
    this.needsSwap = true;
    const query = new URLSearchParams(window.location.search);
    const gain = Number.parseFloat(query.get('bhgain') ?? '');
    const steps = Number.parseInt(query.get('bhsteps') ?? '', 10);
    this.stepsOverride = Number.isFinite(steps) ? steps : null;
    this.modoDoPerto = lerModoDoPerto(window.location.search);

    const shared = {
      uRoL: { value: new THREE.Vector3() },
      uRightL: { value: new THREE.Vector3() },
      uUpL: { value: new THREE.Vector3() },
      uFwdL: { value: new THREE.Vector3() },
      uTanHalf: { value: 0.55 },
      uAspect: { value: 16 / 9 },
      uFade: { value: 0 },
      uMarchB: { value: MARCH_B_RS },
      uFundoDobrado: { value: 0 },
    };
    // uniforms COMPARTILHADOS por referência: um set alimenta os dois materiais
    this.matMarch = new THREE.ShaderMaterial({
      vertexShader: BH_VERT,
      fragmentShader: BH_MARCH_FRAG,
      uniforms: {
        ...shared,
        tScene: { value: null },
        uTime: { value: 0 },
        // sobre o fundo claro do núcleo o disco precisa OFUSCAR a névoa
        uGain: { value: Number.isFinite(gain) ? gain : 2.4 },
        uSteps: { value: this.stepsOverride ?? STEPS.cinema },
        uRotSign: { value: 1 },
        uDin: { value: 2.75 },
        uDout: { value: DISK_OUT_RS },
        uDopMax: { value: 1.85 },
        uOpNear: { value: 0.9 },
        uOpFar: { value: 0.55 },
        uDiskBright: { value: 1.0 },
        uRotSpeed: { value: 1.0 },
      },
    });
    this.matComposite = new THREE.ShaderMaterial({
      vertexShader: BH_VERT,
      fragmentShader: BH_COMPOSITE_FRAG,
      uniforms: {
        ...shared,
        tScene: { value: null },
        tMarch: { value: null },
      },
    });
    this.quad = new FullScreenQuad(this.matMarch);
    this.rtMarch = new THREE.WebGLRenderTarget(2, 2, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      // quad de tela cheia: não há profundidade a testar, e o alvo vive
      // do início ao fim do filme com o orçamento de pixels inteiro
      depthBuffer: false,
      stencilBuffer: false,
    });
  }

  /** distância BH↔câmera em RS por pc (o director calcula o fade) */
  static readonly RS_PC = RS_PC;

  /** os dois estágios, para a pré-compilação sob o véu (director.init) */
  get warmupMaterials(): THREE.Material[] {
    return [this.matMarch, this.matComposite];
  }

  setQuality(q: QualityLevel) {
    this.quality = q;
    if (this.stepsOverride === null) {
      this.matMarch.uniforms.uSteps.value = STEPS[q];
    }
    this.resizeMarchTarget();
  }

  setSize(width: number, height: number) {
    this.width = Math.max(width, 1);
    this.height = Math.max(height, 1);
    this.resizeMarchTarget();
  }

  private resizeMarchTarget() {
    // alvo do march limitado pelo orçamento; nunca maior que a tela
    const px = this.width * this.height;
    const s = Math.min(1, Math.sqrt(BUDGET[this.quality] / Math.max(px, 1)));
    this.rtMarch.setSize(
      Math.max(2, Math.round(this.width * s)),
      Math.max(2, Math.round(this.height * s))
    );
  }

  /** chamado pelo director a cada frame em que o passe está vivo */
  updateFrame(
    camPos: THREE.Vector3,
    camera: THREE.PerspectiveCamera,
    time: number,
    fade: number,
    rsPc: number = RS_PC,
    fundoDobrado = false
  ) {
    this.enabled = fade > 0.001;
    if (!this.enabled) return;
    const u = this.matMarch.uniforms;
    u.uFade.value = fade;
    u.uFundoDobrado.value = fundoDobrado ? 1 : 0;
    u.uTime.value = time;
    u.uTanHalf.value = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    u.uAspect.value = camera.aspect;
    _q.copy(camPos).sub(GAL.GC_POS).divideScalar(rsPc);
    toLocal(_q, u.uRoL.value as THREE.Vector3);
    _r.setFromMatrixColumn(camera.matrixWorld, 0);
    toLocal(_r, u.uRightL.value as THREE.Vector3);
    _r.setFromMatrixColumn(camera.matrixWorld, 1);
    toLocal(_r, u.uUpL.value as THREE.Vector3);
    _r.setFromMatrixColumn(camera.matrixWorld, 2).negate(); // câmera olha por −z
    toLocal(_r, u.uFwdL.value as THREE.Vector3);
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget
  ) {
    // estágio 1: integração no alvo orçado
    this.matMarch.uniforms.tScene.value = readBuffer.texture;
    this.quad.material = this.matMarch;
    renderer.setRenderTarget(this.rtMarch);
    this.quad.render(renderer);

    // estágio 2: composição em resolução nativa
    this.matComposite.uniforms.tScene.value = readBuffer.texture;
    this.matComposite.uniforms.tMarch.value = this.rtMarch.texture;
    this.quad.material = this.matComposite;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  dispose() {
    this.rtMarch.dispose();
    this.matMarch.dispose();
    this.matComposite.dispose();
    this.quad.dispose();
  }
}
