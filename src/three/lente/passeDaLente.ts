// ============================================================
// O PASSE DA LENTE — os fantasmas da lente de cinema escolhida (Ajustes ·
// Lente), acesos pelo Sol, no HDR do quadro.
//
// Onde: no `Post`, logo depois do `ClaraoDoCampo` e antes do knee/ACES —
// depois do bloom, para fantasma não florescer. Soma no readBuffer como o
// clarão (needsSwap falso). Com `nenhuma` o passe fica `enabled = false` e a
// cadeia é a de sempre, byte a byte.
//
// Como: cada fantasma guardado por `optica.ts` é um quad instanciado, a
// caixa que une os três canais (a mesma de `quadNoEcra`) mais a margem do
// borrão, desenhado num alvo HDR de MEIA resolução. A caixa sai da CPU a
// cada quadro, e só entram no desenho os fantasmas que somariam algo à tela
// e cuja caixa toca o quadro (`escolherOsVivos`). O alvo entra no quadro
// por upsample bilinear (fantasma é macio, e o celular paga a metade do
// preenchimento). Por pixel e por canal: pixel → mm do sensor → altura de
// entrada h = (s − Bs·t)/As por eixo → margem do disco frontal e margem da
// íris (`margemDaIris` em Aa·h + Ba·t), as duas com borda macia → ganho do
// canal × amplitude × cor do Sol.
//
// A borda macia mede max(1 px do quadro, o borrão do disco do Sol
// |Bs|·α no sensor): fonte extensa espalha cada fantasma — é isso que
// engrossa o risco da anamórfica e apaga as linhas em foco. Fantasma mais
// fino que a borda num eixo cresce até ela, com o ganho dividido na mesma
// razão (energia conservada).
// ============================================================

import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { ganhoDoGlobo } from '../../lib/atlas/luzDaVisita';
import type { PoliticaDeLuz } from '../../lib/atlas/luz';
import type { ModoDaLente } from '../core/engine';
import { RAIO_DO_SOL_NA_CENA } from '../escala';
import { bvToColor } from '../shaders/common';
import { SOL_BV } from '../world/clarao';
import { escalaDoCampo, lente, type Lente, type NomeDaLente } from './optica';

/**
 * G — o brilho do Sol na entrada da lente, o MESMO para as duas lentes
 * (mesmo Sol, mesmo sensor; o que as distingue é vidro e revestimento).
 * Calibrado na foto P1 (perto da Terra, Sol a 1/3 da meia-largura): o
 * fantasma compacto mais forte da redonda em ~0,19 de valor de tela depois
 * do ACES, e o céu preto erguido em ≤ 0,02 no meio (mediana 0, p90 0,024).
 * Refeito com o limiar de desenho, que apaga o véu dos fantasmas largos
 * abaixo de 0,003 cada (era 50 sem ele).
 */
export const G_DA_LENTE = 65;

/** Até aqui (UA) a lente vê o Sol como na Terra; além, ele vira estrela: (50/d)². */
export const UA_DO_FIM_DA_LENTE = 50;

/** A fonte fora do quadro: cheia até 1,3× a meia-diagonal do quadro nativo (em t da lente), zero em 1,6×. */
const DIAGONAL_CHEIA = 1.3;
const DIAGONAL_ZERO = 1.6;

/**
 * O LIMIAR DE DESENHO, em HDR na exposição 1 (divide-se pela exposição do
 * quadro). Fantasma cujo pico — o maior canal de ganho × amplitude × cor do
 * Sol, um teto do que o fragmento soma — fica abaixo disto somaria menos de
 * 0,003 de valor de tela num céu preto, e não é desenhado. Derivado uma vez
 * para o ACES do OutputPass (three.js): x·exposição/0,6 → RRTAndODTFit →
 * sRGB, com cinza (as matrizes de entrada e saída do ACES o preservam).
 * Tela 0,003 = linear 0,003/12,92 = 2,32e-4, que a curva alcança em
 * v = 4,955e-3; x = v·0,6 = 2,973e-3 (2,91e-3 na exposição 1,02 de sempre).
 */
const LIMIAR_NA_EXPOSICAO_1 = 2.973e-3;

/**
 * A LEI DA INTENSIDADE, num lugar só:
 *   amplitude = G × visibilidade × ganhoDoGlobo(d, política, roteiro) × fadeLonge(d)
 * Na luz assistida o globo vale 1 (a câmera está exposta para o mundo que
 * visita, então o reflexo lê igual na Terra e em Saturno); na luz real vale
 * E(d). `fadeLonge` = 1 até 50 UA e (50/d)² além. Sempre finita e ≥ 0.
 */
export function amplitudeDaLente(
  dUA: number,
  politica: PoliticaDeLuz,
  roteiro: number,
  visibilidade: number
): number {
  const fadeLonge = dUA > UA_DO_FIM_DA_LENTE ? (UA_DO_FIM_DA_LENTE / dUA) ** 2 : 1;
  const vis = Math.min(1, Math.max(0, Number.isFinite(visibilidade) ? visibilidade : 0));
  const a = G_DA_LENTE * vis * ganhoDoGlobo(dUA, politica, roteiro) * fadeLonge;
  return Number.isFinite(a) && a > 0 ? a : 0;
}

const VERTICE = /* glsl */ `
  in vec4 aA0; in vec4 aB0;
  in vec4 aA1; in vec4 aB1;
  in vec4 aA2; in vec4 aB2;
  in vec3 aGanho;
  in vec4 aCaixa; // mm do sensor: lo.xy, hi.xy
  uniform vec2 uSensorParaNdc;
  out vec2 vS;
  flat out vec4 vA0; flat out vec4 vB0;
  flat out vec4 vA1; flat out vec4 vB1;
  flat out vec4 vA2; flat out vec4 vB2;
  flat out vec3 vGanho;

  void main() {
    vA0 = aA0; vB0 = aB0; vA1 = aA1; vB1 = aB1; vA2 = aA2; vB2 = aB2; vGanho = aGanho;
    vS = mix(aCaixa.xy, aCaixa.zw, position.xy);
    gl_Position = vec4(vS * uSensorParaNdc, 0.0, 1.0);
  }
`;

const FRAGMENTO = /* glsl */ `
  precision highp float;
  uniform vec2 uT;
  uniform float uAlfa;
  uniform vec2 uMmPorPx;
  uniform vec2 uRaios;
  uniform vec4 uIris; // laminas, rotacao, curvatura, —
  uniform vec3 uCor;
  in vec2 vS;
  flat in vec4 vA0; flat in vec4 vB0;
  flat in vec4 vA1; flat in vec4 vB1;
  flat in vec4 vA2; flat in vec4 vB2;
  flat in vec3 vGanho;
  layout(location = 0) out highp vec4 corDoFantasma;

  const float PI = 3.141592653589793;

  // margemDaIris (optica.ts) e o gradiente dela em q, exato dentro do setor
  float margemDaIris(vec2 q, out vec2 grad) {
    float r = uRaios.y;
    float setor = 2.0 * PI / uIris.x;
    float qx = abs(q.x) < 1e-20 ? 1e-20 : q.x;
    float fi = atan(q.y, qx) - uIris.y;
    float angulo = uIris.y + setor * floor(fi / setor) + 0.5 * setor;
    vec2 n = vec2(cos(angulo), sin(angulo));
    float x = dot(q, n);
    float a = r * cos(0.5 * setor);
    float b = r * sin(0.5 * setor);
    float k = uIris.z;
    float D = sqrt(max(r * r - k * k * b * b, 1e-12));
    float arco = (dot(q, q) - 2.0 * a * x + a * a - b * b) / (2.0 * D);
    grad = -n - k * (q - a * n) / D;
    return a - x - k * arco;
  }

  // borda macia de uma margem m cujo gradiente em px do quadro é g; a
  // largura é a do borrão do Sol (elipse de semieixos e, em px) na direção
  // da normal, nunca menos que 1 px
  float borda(float m, vec2 g, vec2 e) {
    float gl = length(g);
    vec2 n = g / max(gl, 1e-12);
    float w = max(1.0, length(e * n));
    return smoothstep(-w, w, m / max(gl, 1e-12));
  }

  float canal(vec4 A, vec4 B) {
    vec2 As = A.xy, Aa = A.zw, Bs = B.xy, Ba = B.zw;
    vec2 as_ = sign(As) * max(abs(As), vec2(1e-9)) + step(abs(As), vec2(0.0)) * 1e-9;
    vec2 aa = max(abs(Aa), vec2(1e-6));
    vec2 w1 = abs(As) * uRaios.x;
    vec2 w2 = abs(As) * uRaios.y / aa;
    vec2 iris = vec2(1.0) - step(w1, w2);
    vec2 centro = (Bs - iris * As * Ba * sign(Aa) / aa) * uT;
    vec2 meiaPx = min(w1, w2) / uMmPorPx;
    vec2 e = abs(Bs) * uAlfa / uMmPorPx;
    vec2 w = max(vec2(1.0), e);
    // eixo fino: cresce até a borda, ganho na razão inversa
    vec2 fino = vec2(1.0) - step(w, meiaPx);
    vec2 cresce = max(meiaPx, w);
    vec2 energia = mix(vec2(1.0), meiaPx / cresce, fino);
    vec2 dpx = abs(vS - centro) / uMmPorPx;
    vec2 caixa = mix(vec2(1.0), smoothstep(-w, w, cresce - dpx), fino);
    float cob = energia.x * energia.y * caixa.x * caixa.y;
    // a altura de entrada; no eixo fino ela fica no centro da caixa
    vec2 hc = -iris * Ba * sign(Aa) * uT / aa;
    vec2 h = mix((vS - Bs * uT) / as_, hc, fino);
    vec2 J = (vec2(1.0) - fino) * uMmPorPx / as_;
    float hl = max(length(h), 1e-9);
    cob *= borda(uRaios.x - hl, -(h / hl) * J, e);
    vec2 gq;
    float mI = margemDaIris(Aa * h + Ba * uT, gq);
    cob *= borda(mI, gq * Aa * J, e);
    return cob;
  }

  void main() {
    vec3 c = vec3(canal(vA0, vB0), canal(vA1, vB1), canal(vA2, vB2)) * vGanho * uCor;
    // teto de 1e3 por fantasma (já branco depois do ACES): a SOMA dos até
    // 48 fantasmas fica abaixo do máximo do half-float (65504) e
    // nunca vira Inf no alvo — com a luz real perto do Sol a amplitude cresce como 1/d²
    corDoFantasma = vec4(min(max(c, vec3(0.0)), vec3(1.0e3)), 1.0);
  }
`;

const SOMA = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tLente;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tLente, vUv).rgb;
      gl_FragColor = vec4(min(max(c, vec3(0.0)), vec3(1.0e3)), 0.0);
    }
  `,
};

const somaHdr = {
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  depthTest: false,
  depthWrite: false,
} as const;

/**
 * Os fantasmas de uma lente na GPU, como atributos instanciados: por canal
 * (As.x, As.y, Aa.x, Aa.y) e (Bs.x, Bs.y, Ba.x, Ba.y), o ganho RGB e a caixa.
 * Só os VIVOS do quadro ocupam o começo dos buffers; `vivos[k]` é o índice
 * em `lente.fantasmas` da instância k.
 */
interface FantasmasNaGpu {
  readonly lente: Lente;
  readonly geometria: THREE.InstancedBufferGeometry;
  readonly vivos: Int32Array;
  nVivos: number;
}

function fantasmasNaGpu(l: Lente): FantasmasNaGpu {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3)
  );
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const n = l.fantasmas.length;
  const dinamico = (tamanho: number) =>
    new THREE.InstancedBufferAttribute(new Float32Array(n * tamanho), tamanho).setUsage(
      THREE.DynamicDrawUsage
    );
  for (let c = 0; c < 3; c++) {
    g.setAttribute(`aA${c}`, dinamico(4));
    g.setAttribute(`aB${c}`, dinamico(4));
  }
  g.setAttribute('aGanho', dinamico(3));
  g.setAttribute('aCaixa', dinamico(4));
  g.instanceCount = 0;
  return { lente: l, geometria: g, vivos: new Int32Array(n), nVivos: 0 };
}

/** Copia os fantasmas vivos para o começo dos buffers (só quando a lista muda). */
function subirOsVivos(gpu: FantasmasNaGpu) {
  const g = gpu.geometria;
  for (let c = 0; c < 3; c++) {
    const A = g.getAttribute(`aA${c}`) as THREE.InstancedBufferAttribute;
    const B = g.getAttribute(`aB${c}`) as THREE.InstancedBufferAttribute;
    for (let k = 0; k < gpu.nVivos; k++) {
      const f = gpu.lente.fantasmas[gpu.vivos[k]];
      A.setXYZW(k, f.As[c].x, f.As[c].y, f.Aa[c].x, f.Aa[c].y);
      B.setXYZW(k, f.Bs[c].x, f.Bs[c].y, f.Ba[c].x, f.Ba[c].y);
    }
    A.needsUpdate = true;
    B.needsUpdate = true;
  }
  const ganho = g.getAttribute('aGanho') as THREE.InstancedBufferAttribute;
  for (let k = 0; k < gpu.nVivos; k++) {
    const f = gpu.lente.fantasmas[gpu.vivos[k]];
    ganho.setXYZ(k, f.ganho[0], f.ganho[1], f.ganho[2]);
  }
  ganho.needsUpdate = true;
}

/**
 * Por eixo, a caixa de um canal em mm do sensor, somada a [lo, hi]: a de
 * `quadNoEcra`, crescida até a borda macia (e px) e estendida pela própria
 * borda mais 2 px (o texel da meia resolução), em `estende` px.
 */
function eixoDaCaixa(
  as: number, bs: number, aa_: number, ba: number,
  t: number, rF: number, rI: number, mmPorPx: number, e: number, estende: number,
  loHi: number[], eixo: number
) {
  const aa = Math.max(Math.abs(aa_), 1e-6);
  const w1 = Math.abs(as) * rF;
  const w2 = (Math.abs(as) * rI) / aa;
  const iris = w2 < w1 ? 1 : 0;
  const centro = (bs - (iris * as * ba * Math.sign(aa_)) / aa) * t;
  const ext = (Math.max(Math.min(w1, w2) / mmPorPx, 1, e) + estende) * mmPorPx;
  loHi[eixo] = Math.min(loHi[eixo], centro - ext);
  loHi[eixo + 2] = Math.max(loHi[eixo + 2], centro + ext);
}

const COR_DO_SOL = bvToColor(SOL_BV);

export class PasseDaLente extends Pass {
  private readonly camera: THREE.Camera;
  private modo: ModoDaLente = 'nenhuma';
  private amplitude = 0;
  private readonly naGpu = new Map<NomeDaLente, FantasmasNaGpu>();
  private readonly loHi = [0, 0, 0, 0];
  private readonly material: THREE.ShaderMaterial;
  private readonly malha: THREE.Mesh;
  private readonly cenaDosFantasmas = new THREE.Scene();
  private readonly cameraNula = new THREE.Camera();
  private readonly soma: THREE.ShaderMaterial;
  private readonly quad: FullScreenQuad;
  private readonly alvo: THREE.WebGLRenderTarget;
  private readonly corDeLimpezaVelha = new THREE.Color();
  private readonly sol = new THREE.Vector3();
  private alturaPx = 1;

  constructor(camera: THREE.Camera) {
    super();
    this.camera = camera;
    this.needsSwap = false;
    this.enabled = false;
    this.material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERTICE,
      fragmentShader: FRAGMENTO,
      uniforms: {
        uT: { value: new THREE.Vector2() },
        uAlfa: { value: 0 },
        uMmPorPx: { value: new THREE.Vector2(1, 1) },
        uSensorParaNdc: { value: new THREE.Vector2(1, 1) },
        uRaios: { value: new THREE.Vector2(1, 1) },
        uIris: { value: new THREE.Vector4(6, 0, 0, 0) },
        uCor: { value: new THREE.Vector3() },
      },
      ...somaHdr,
    });
    this.malha = new THREE.Mesh(new THREE.InstancedBufferGeometry(), this.material);
    this.malha.frustumCulled = false;
    this.cenaDosFantasmas.add(this.malha);
    this.soma = new THREE.ShaderMaterial({
      uniforms: { tLente: { value: null } },
      ...SOMA,
      ...somaHdr,
    });
    this.quad = new FullScreenQuad(this.soma);
    this.alvo = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      depthBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    this.alvo.texture.name = 'PasseDaLente.meiaResolucao';
    this.soma.uniforms.tLente.value = this.alvo.texture;
  }

  definirLente(modo: ModoDaLente) {
    this.modo = modo;
    if (modo === 'nenhuma') {
      this.enabled = false;
      return;
    }
    let gpu = this.naGpu.get(modo);
    if (!gpu) {
      gpu = fantasmasNaGpu(lente(modo));
      this.naGpu.set(modo, gpu);
    }
    this.malha.geometry = gpu.geometria;
    const l = gpu.lente;
    const u = this.material.uniforms;
    (u.uRaios.value as THREE.Vector2).set(l.raioFrontal, l.raioDaIris);
    (u.uIris.value as THREE.Vector4).set(l.laminas, l.rotacaoDaIris, l.curvaturaDaIris, 0);
  }

  /** A luz deste quadro (o Director, ao lado de `setWarp`). */
  atualizar(dUA: number, politica: PoliticaDeLuz, roteiro: number, visibilidade: number) {
    this.amplitude = amplitudeDaLente(dUA, politica, roteiro, visibilidade);
    if (this.modo === 'nenhuma') {
      this.enabled = false;
      return;
    }
    this.enabled = this.amplitude > 0;
  }

  /** Recebe px de BUFFER do composer; o alvo é a metade. */
  setSize(largura: number, altura: number) {
    this.alturaPx = Math.max(1, altura);
    this.alvo.setSize(Math.max(1, Math.ceil(largura / 2)), Math.max(1, Math.ceil(altura / 2)));
  }

  /**
   * A geometria do Sol neste quadro, com a câmera do render: t da lente,
   * raio angular α e o desvanecer fora do quadro. Devolve 0 quando o Sol
   * está atrás, longe demais do quadro, ou a câmera não é perspectiva.
   */
  private geometriaDoSol(l: Lente): number {
    const cam = this.camera;
    if (!(cam instanceof THREE.PerspectiveCamera)) return 0;
    this.sol.set(0, 0, 0).applyMatrix4(cam.matrixWorldInverse);
    const dist = this.sol.length();
    const frente = -this.sol.z;
    if (!(dist > 0) || !(frente > 1e-9 * dist)) return 0;
    const k = escalaDoCampo(l, THREE.MathUtils.degToRad(cam.getEffectiveFOV()));
    const tx = (k * this.sol.x) / frente;
    const ty = (k * this.sol.y) / frente;
    const meiaDiagonal = (l.meiaAlturaNativa / l.focal.y) * Math.hypot(cam.aspect, 1);
    const r = Math.hypot(tx, ty) / meiaDiagonal;
    const x = Math.min(1, Math.max(0, (r - DIAGONAL_CHEIA) / (DIAGONAL_ZERO - DIAGONAL_CHEIA)));
    const campo = 1 - x * x * (3 - 2 * x);
    if (!(campo > 0)) return 0;
    const seno = Math.min(0.999, RAIO_DO_SOL_NA_CENA / dist);
    const u = this.material.uniforms;
    (u.uT.value as THREE.Vector2).set(tx, ty);
    u.uAlfa.value = k * Math.tan(Math.asin(seno));
    const h = l.meiaAlturaNativa;
    (u.uMmPorPx.value as THREE.Vector2).set(
      (2 * h) / (l.esmagamento * this.alturaPx),
      (2 * h) / this.alturaPx
    );
    (u.uSensorParaNdc.value as THREE.Vector2).set(l.esmagamento / (cam.aspect * h), 1 / h);
    const a = this.amplitude * campo;
    (u.uCor.value as THREE.Vector3).set(a * COR_DO_SOL[0], a * COR_DO_SOL[1], a * COR_DO_SOL[2]);
    return campo;
  }

  /**
   * Escolhe os fantasmas deste quadro e escreve a caixa de cada um: fica de
   * fora quem tem o pico abaixo do limiar de desenho (na exposição do
   * quadro) e quem tem a caixa toda fora do quadro. Devolve quantos ficam.
   */
  private escolherOsVivos(gpu: FantasmasNaGpu, exposicao: number): number {
    const u = this.material.uniforms;
    const t = u.uT.value as THREE.Vector2;
    const alfa = u.uAlfa.value as number;
    const mm = u.uMmPorPx.value as THREE.Vector2;
    const ndc = u.uSensorParaNdc.value as THREE.Vector2;
    const cor = u.uCor.value as THREE.Vector3;
    const { raioFrontal: rF, raioDaIris: rI } = gpu.lente;
    const limiar = LIMIAR_NA_EXPOSICAO_1 / Math.max(exposicao, 1e-6);
    const caixa = gpu.geometria.getAttribute('aCaixa') as THREE.InstancedBufferAttribute;
    const loHi = this.loHi;
    let n = 0;
    let mudou = false;
    gpu.lente.fantasmas.forEach((f, i) => {
      const g = f.ganho;
      if (Math.max(g[0] * cor.x, g[1] * cor.y, g[2] * cor.z) < limiar) return;
      loHi.fill(Infinity, 0, 2).fill(-Infinity, 2, 4);
      for (let c = 0; c < 3; c++) {
        const As = f.As[c], Bs = f.Bs[c], Aa = f.Aa[c], Ba = f.Ba[c];
        const ex = (Math.abs(Bs.x) * alfa) / mm.x;
        const ey = (Math.abs(Bs.y) * alfa) / mm.y;
        const estende = Math.max(1, ex, ey) + 2;
        eixoDaCaixa(As.x, Bs.x, Aa.x, Ba.x, t.x, rF, rI, mm.x, ex, estende, loHi, 0);
        eixoDaCaixa(As.y, Bs.y, Aa.y, Ba.y, t.y, rF, rI, mm.y, ey, estende, loHi, 1);
      }
      if (loHi[2] * ndc.x < -1 || loHi[0] * ndc.x > 1 || loHi[3] * ndc.y < -1 || loHi[1] * ndc.y > 1) return;
      caixa.setXYZW(n, loHi[0], loHi[1], loHi[2], loHi[3]);
      if (gpu.vivos[n] !== i) mudou = true;
      gpu.vivos[n++] = i;
    });
    if (mudou || n !== gpu.nVivos) {
      gpu.nVivos = n;
      subirOsVivos(gpu);
    }
    caixa.needsUpdate = true;
    gpu.geometria.instanceCount = n;
    return n;
  }

  render(
    renderer: THREE.WebGLRenderer,
    _writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget
  ) {
    if (this.modo === 'nenhuma') return;
    const gpu = this.naGpu.get(this.modo);
    if (!gpu || this.geometriaDoSol(gpu.lente) <= 0) return;
    if (this.escolherOsVivos(gpu, renderer.toneMappingExposure) === 0) return;
    const limpavaSozinho = renderer.autoClear;
    renderer.autoClear = false;
    renderer.getClearColor(this.corDeLimpezaVelha);
    const alphaVelho = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(this.alvo);
    renderer.clear(true, false, false);
    renderer.render(this.cenaDosFantasmas, this.cameraNula);
    renderer.setRenderTarget(readBuffer);
    this.quad.render(renderer);
    renderer.setClearColor(this.corDeLimpezaVelha, alphaVelho);
    renderer.autoClear = limpavaSozinho;
  }

  dispose() {
    for (const gpu of this.naGpu.values()) gpu.geometria.dispose();
    this.material.dispose();
    this.soma.dispose();
    this.quad.dispose();
    this.alvo.dispose();
  }
}
