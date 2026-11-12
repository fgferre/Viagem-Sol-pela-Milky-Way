// ============================================================
// A GALÁXIA DE PARTÍCULAS EM WebGPU — o motor. Recebe os sorteios do
// gerador (o buffer `bright` de sempre), guarda cada partícula em 20 bytes
// na GPU e desenha um quadro para uma câmera. Não conhece página nem app:
// quem chama dá a tela, a câmera e as opções (a página de teste em
// src/experimentos/galaxiaWebgpu e a camada do app, camadaWebgpu.ts).
// ============================================================
import * as THREE from 'three';
import { GALACTIC_MODEL } from '../../cartography/galacticModel';
import { EX, EY, EZ, GAL } from '../baseGalactica';
import {
  celulaDaParticula,
  CELULAS_DA_GRADE,
  gerarNuvensDePoeira,
  ladoDaChave,
  tauDasNuvens,
} from '../geradorDaGalaxia';
import { BYTES_DOS_UNIFORMES, WGSL_DEPOSITO, WGSL_EXTINCAO, WGSL_TOM } from './motorWgsl';

const ESCALA = 65536; // ponto fixo do acumulador: 1 unidade de cena = 2^16
const BYTES_DA_PARTICULA = 20;
const N_TAU = 1024;
const USO = { mapRead: 0x01, copySrc: 0x04, copyDst: 0x08, uniform: 0x40, storage: 0x80, queryResolve: 0x200 };

export interface CameraDoMotor {
  /** projeção × vista, coluna a coluna (o `elements` de um Matrix4) */
  viewProj: ArrayLike<number>;
  pos: ArrayLike<number>;
  tanMeioFov: number;
}
export interface OpcoesDoQuadro {
  /** filhas por partícula (1 = só as sorteadas) */
  k: number;
  /** 1 = um pixel sorteado por partícula em vez da tenda bilinear */
  borrifo: number;
  /** a extinção de cada partícula é renovada a cada `fatia` quadros */
  fatia: number;
  /** 1 = filtro [1 2 1]² antes do tom */
  filtro: number;
  expo: number;
  /** nível de detalhe: partículas por pixel do disco que bastam (0 = todas).
   *  De longe o motor usa só os primeiros sorteios, cada um uma amostra
   *  completa do modelo, e o seguinte entra aos poucos. */
  lod: number;
  /** o uFade da vista de fora (galaxy.ts): 1 + 6,99 */
  ganho: number;
}

/** rgb9e5: três mantissas de 9 bits e um expoente comum de 5 */
function rgb9e5(r: number, g: number, b: number): number {
  const m = Math.max(r, g, b);
  if (!(m > 0)) return 0;
  let e = Math.max(-16, Math.floor(Math.log2(m))) + 1 + 15;
  if (Math.round(m / 2 ** (e - 24)) > 511) e++;
  e = Math.min(e, 31);
  const s = 2 ** (e - 24);
  const q = (v: number) => Math.min(511, Math.max(0, Math.round(v / s)));
  return (q(r) | (q(g) << 9) | (q(b) << 18) | (e << 27)) >>> 0;
}

export class MotorDaGalaxia {
  /** partículas na GPU */
  total = 0;
  /** partículas desenhadas no último quadro (nível de detalhe) */
  usadas = 0;
  /** sorteios do gerador já recebidos */
  sorteios = 0;
  readonly erros: string[] = [];
  readonly temRelogio: boolean;
  largura = 0;
  altura = 0;

  private readonly gpu: GPUDevice;
  private readonly ctx: GPUCanvasContext;
  private readonly tela: HTMLCanvasElement | OffscreenCanvas;
  private readonly linear: boolean;
  private readonly formato: string;
  private readonly bufP: GPUBuffer;
  private readonly bufExt: GPUBuffer;
  private readonly bufEsp: GPUBuffer;
  private readonly bufU: GPUBuffer;
  private readonly pExt: GPUPipeline;
  private readonly pDep: GPUPipeline;
  private readonly pTom: GPUPipeline;
  private readonly gExt: GPUBindGroup;
  private gDep: GPUBindGroup | null = null;
  private gTom: GPUBindGroup | null = null;
  private bufAcc: GPUBuffer | null = null;
  private readonly relogio: GPUQuerySet | null;
  private readonly bufRelogio: GPUBuffer;
  private readonly bufLeitura: GPUBuffer;
  private readonly dadosU = new ArrayBuffer(BYTES_DOS_UNIFORMES);
  private readonly capacidade: number;
  private nQuadro = 0;
  /** total acumulado ao fim de cada sorteio */
  private readonly limites: number[] = [];

  private constructor(
    gpu: GPUDevice, tela: HTMLCanvasElement | OffscreenCanvas, capacidade: number,
    pipelines: { ext: GPUPipeline; dep: GPUPipeline; tom: GPUPipeline }, formato: string
  ) {
    this.linear = formato === 'rgba16float';
    this.gpu = gpu;
    this.tela = tela;
    this.capacidade = capacidade;
    this.formato = formato;
    this.ctx = tela.getContext('webgpu') as unknown as GPUCanvasContext;
    gpu.addEventListener('uncapturederror', (e) => {
      const m = (e as Event & { error: { message: string } }).error.message;
      this.erros.push(m);
      console.error('[webgpu]', m);
    });
    this.temRelogio = gpu.features.has('timestamp-query');
    this.bufP = gpu.createBuffer({ size: capacidade * BYTES_DA_PARTICULA, usage: USO.storage | USO.copyDst });
    this.bufExt = gpu.createBuffer({ size: capacidade * 4, usage: USO.storage });
    this.bufEsp = gpu.createBuffer({ size: capacidade * 4, usage: USO.storage | USO.copyDst });
    this.bufU = gpu.createBuffer({ size: BYTES_DOS_UNIFORMES, usage: USO.uniform | USO.copyDst });

    // τ⊥ das nuvens de poeira: a mesma textura do modo só-partículas
    const tau = tauDasNuvens(gerarNuvensDePoeira(), N_TAU, GALACTIC_MODEL.diskRadiusPc);
    const meio = new Uint16Array(tau.length);
    for (let i = 0; i < tau.length; i++) meio[i] = THREE.DataUtils.toHalfFloat(tau[i]);
    const texTau = gpu.createTexture({ size: [N_TAU, N_TAU], format: 'r16float', usage: 0x04 | 0x02 });
    gpu.queue.writeTexture({ texture: texTau }, meio, { bytesPerRow: N_TAU * 2 }, [N_TAU, N_TAU]);

    this.pExt = pipelines.ext;
    this.pDep = pipelines.dep;
    this.pTom = pipelines.tom;
    this.gExt = this.liga(this.pExt, [
      { buffer: this.bufU }, { buffer: this.bufP }, { buffer: this.bufExt },
      texTau.createView(), gpu.createSampler({ magFilter: 'linear', minFilter: 'linear' }),
    ]);
    this.relogio = this.temRelogio ? gpu.createQuerySet({ type: 'timestamp', count: 6 }) : null;
    this.bufRelogio = gpu.createBuffer({ size: 48, usage: USO.queryResolve | USO.copySrc });
    this.bufLeitura = gpu.createBuffer({ size: 48, usage: USO.mapRead | USO.copyDst });
  }

  /** `null` quando o navegador não tem WebGPU (ou não entrega adaptador) */
  static async criar(
    tela: HTMLCanvasElement | OffscreenCanvas, capacidade: number,
    /** saída linear em rgba16float (para virar textura do app) em vez de imagem pronta */
    linear = false
  ): Promise<MotorDaGalaxia | null> {
    if (!navigator.gpu) return null;
    const adaptador = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adaptador) return null;
    const gpu = await adaptador.requestDevice({
      requiredFeatures: ['timestamp-query'].filter((f) => adaptador.features.has(f)),
      requiredLimits: {
        maxBufferSize: adaptador.limits.maxBufferSize,
        maxStorageBufferBindingSize: adaptador.limits.maxStorageBufferBindingSize,
      },
    });
    const modulo = async (code: string, nome: string) => {
      const m = gpu.createShaderModule({ code });
      for (const msg of (await m.getCompilationInfo()).messages) {
        if (msg.type === 'error') throw new Error(`${nome}:${msg.lineNum} ${msg.message}`);
      }
      return m;
    };
    const formato = linear ? 'rgba16float' : navigator.gpu.getPreferredCanvasFormat();
    const mTom = await modulo(WGSL_TOM, 'tom');
    return new MotorDaGalaxia(gpu, tela, capacidade, {
      ext: gpu.createComputePipeline({
        layout: 'auto', compute: { module: await modulo(WGSL_EXTINCAO, 'extinção'), entryPoint: 'main' },
      }),
      dep: gpu.createComputePipeline({
        layout: 'auto', compute: { module: await modulo(WGSL_DEPOSITO, 'depósito'), entryPoint: 'main' },
      }),
      tom: gpu.createRenderPipeline({
        layout: 'auto',
        vertex: { module: mTom, entryPoint: 'vs' },
        fragment: { module: mTom, entryPoint: 'fs', targets: [{ format: formato }] },
        primitive: { topology: 'triangle-list' },
      }),
    }, formato);
  }

  private liga(p: GPUPipeline, entradas: unknown[]) {
    return this.gpu.createBindGroup({
      layout: p.getBindGroupLayout(0),
      entries: entradas.map((resource, binding) => ({ binding, resource })),
    });
  }

  /**
   * Um sorteio do gerador (`bright`, stride 8) entra na GPU em 20 bytes por
   * partícula. Do primeiro vêm também os indivíduos (estrela jovem, nó
   * H II, aglomerado, halo, núcleo); dos seguintes só as populações
   * contínuas, que passam a dividir a luz pelo número de sorteios.
   */
  acrescentar(bright: Float32Array, n: number) {
    const primeiro = this.sorteios === 0;
    const dados = new ArrayBuffer(n * BYTES_DA_PARTICULA);
    const f = new Float32Array(dados);
    const u = new Uint32Array(dados);
    const esp = new Float32Array(n);
    const chaves = new Uint16Array(n);
    const porChave = new Uint32Array(65536);
    for (let i = 0; i < n; i++) porChave[(chaves[i] = celulaDaParticula(bright, i))]++;
    let m = 0;
    for (let i = 0; i < n; i++) {
      const individuo = chaves[i] === CELULAS_DA_GRADE;
      if (individuo && !primeiro) continue;
      const o = i * 8;
      const d = m * 5;
      f[d] = bright[o];
      f[d + 1] = bright[o + 1];
      f[d + 2] = bright[o + 2];
      f[d + 3] = bright[o + 6];
      const a = bright[o + 7];
      u[d + 4] = rgb9e5(bright[o + 3] * a, bright[o + 4] * a, bright[o + 5] * a);
      // espaçamento local (pc) para as filhas: 1/√Σ da célula; 0 = indivíduo
      esp[m] = individuo ? 0 : ladoDaChave(chaves[i]) / Math.sqrt(porChave[chaves[i]]);
      m++;
    }
    if (this.total + m > this.capacidade) throw new Error('motor: capacidade de partículas excedida');
    this.gpu.queue.writeBuffer(this.bufP, this.total * BYTES_DA_PARTICULA, new Uint8Array(dados, 0, m * BYTES_DA_PARTICULA));
    this.gpu.queue.writeBuffer(this.bufEsp, this.total * 4, esp.subarray(0, m));
    this.total += m;
    this.limites.push(this.total);
    this.sorteios++;
    this.nQuadro = 0; // a extinção das novas ainda não foi calculada
  }

  private redimensionar(w: number, h: number) {
    if (w === this.largura && h === this.altura) return;
    this.largura = w;
    this.altura = h;
    this.tela.width = w;
    this.tela.height = h;
    this.ctx.configure({
      device: this.gpu, format: this.formato, alphaMode: 'opaque',
      ...(this.linear ? { toneMapping: { mode: 'extended' } } : {}),
    });
    this.bufAcc?.destroy();
    this.bufAcc = this.gpu.createBuffer({ size: w * h * 16, usage: USO.storage | USO.copyDst });
    this.gDep = this.liga(this.pDep, [
      { buffer: this.bufU }, { buffer: this.bufP }, { buffer: this.bufExt },
      { buffer: this.bufEsp }, { buffer: this.bufAcc },
    ]);
    this.gTom = this.liga(this.pTom, [{ buffer: this.bufU }, { buffer: this.bufAcc }]);
  }

  /** codifica e envia um quadro; com `medir`, resolve o relógio no fim */
  quadro(camera: CameraDoMotor, w: number, h: number, op: OpcoesDoQuadro, medir = false) {
    if (!this.total) return;
    this.redimensionar(w, h);
    const uF = new Float32Array(this.dadosU);
    const uI = new Uint32Array(this.dadosU);
    // NÍVEL DE DETALHE: quantos sorteios dão `lod` partículas por pixel do
    // disco (raio do modelo, inclinado por μ) na distância da câmera
    let s = this.sorteios;
    if (op.lod > 0) {
      const dc = new THREE.Vector3(camera.pos[0], camera.pos[1], camera.pos[2]).sub(GAL.GC_POS);
      const dist = Math.max(dc.length(), 1);
      const pcPorPx = (2 * camera.tanMeioFov * dist) / h;
      const mu = Math.max(Math.abs(dc.dot(EZ)) / dist, 0.15);
      const pixels = (Math.PI * GALACTIC_MODEL.diskRadiusPc ** 2 * mu) / (pcPorPx * pcPorPx);
      s = Math.min(Math.max((op.lod * pixels) / this.limites[0], 1), this.sorteios);
    }
    const cheios = Math.floor(s);
    const usados = this.limites[Math.ceil(s) - 1];
    // a extinção cobre TODAS (um sorteio que entra já chega com a sua); o
    // primeiro quadro depois de um sorteio novo renova tudo de uma vez
    const fatia = this.nQuadro < 1 ? 1 : Math.max(1, op.fatia);
    const porFatia = Math.ceil(this.total / fatia);
    const linha = 32768 * 256; // invocações por linha do despacho
    const despacho = (n: number) => {
      const grupos = Math.ceil(n / 256);
      return [Math.min(grupos, 32768), Math.ceil(grupos / 32768)] as const;
    };
    uF.set(Array.from(camera.viewProj), 0);
    uF.set([camera.pos[0], camera.pos[1], camera.pos[2], h], 16);
    uF.set([EX.x, EX.y, EX.z, camera.tanMeioFov], 20);
    uF.set([EY.x, EY.y, EY.z, op.ganho], 24);
    uF.set([EZ.x, EZ.y, EZ.z, 0.6], 28);
    uF.set([GAL.GC_POS.x, GAL.GC_POS.y, GAL.GC_POS.z, ESCALA], 32);
    uF.set([w, h, op.expo, (40 * h) / 1080], 36);
    uI[40] = usados;
    uI[41] = op.k;
    uI[42] = op.borrifo;
    uI[43] = (this.nQuadro % fatia) * porFatia;
    uI[44] = op.filtro;
    uI[45] = linha;
    uF[46] = 1 / s;
    uF[48] = this.linear ? 1 : 0;
    uF[49] = (s - cheios) / s;
    uI[50] = this.limites[cheios - 1];
    uI[51] = this.total;
    this.nQuadro++;
    this.usadas = usados;
    this.gpu.queue.writeBuffer(this.bufU, 0, this.dadosU);

    const marca = (i: number) =>
      this.relogio
        ? { timestampWrites: { querySet: this.relogio, beginningOfPassWriteIndex: i, endOfPassWriteIndex: i + 1 } }
        : {};
    const enc = this.gpu.createCommandEncoder();
    let p = enc.beginComputePass(marca(0));
    p.setPipeline(this.pExt);
    p.setBindGroup(0, this.gExt);
    p.dispatchWorkgroups(...despacho(porFatia));
    p.end();
    enc.clearBuffer(this.bufAcc as GPUBuffer);
    p = enc.beginComputePass(marca(2));
    p.setPipeline(this.pDep);
    p.setBindGroup(0, this.gDep as GPUBindGroup);
    p.dispatchWorkgroups(...despacho(usados));
    p.end();
    p = enc.beginRenderPass({
      colorAttachments: [
        { view: this.ctx.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] },
      ],
      ...marca(4),
    });
    p.setPipeline(this.pTom);
    p.setBindGroup(0, this.gTom as GPUBindGroup);
    p.draw(3);
    p.end();
    if (medir && this.relogio) {
      enc.resolveQuerySet(this.relogio, 0, 6, this.bufRelogio, 0);
      enc.copyBufferToBuffer(this.bufRelogio, 0, this.bufLeitura, 0, 48);
    }
    this.gpu.queue.submit([enc.finish()]);
  }

  /** solta o dispositivo e, com ele, todos os buffers */
  destruir() {
    this.gpu.destroy();
  }

  /** a GPU terminou tudo o que foi enviado */
  terminou() {
    return this.gpu.queue.onSubmittedWorkDone();
  }

  /** ms dos passos do último quadro medido: extinção, depósito, tom */
  async lerRelogio(): Promise<number[]> {
    if (!this.relogio) return [NaN, NaN, NaN];
    await this.bufLeitura.mapAsync(USO.mapRead);
    const t = new BigInt64Array(this.bufLeitura.getMappedRange().slice(0));
    this.bufLeitura.unmap();
    return [0, 1, 2].map((j) => Number(t[j * 2 + 1] - t[j * 2]) / 1e6);
  }
}
