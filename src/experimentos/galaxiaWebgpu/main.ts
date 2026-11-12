// ============================================================
// ENSAIO WebGPU DA GALÁXIA DE PARTÍCULAS — página de teste, só de
// desenvolvimento (webgpu-galaxia.html na raiz; não entra no build nem é
// referenciada pelo app). Pergunta: desenhar em WebGPU resolve o grão a
// meia distância? Quantos milhões de partículas por quadro a máquina
// aguenta? Os dados são os do modo ?galaxia=particulas, sem reescrever o
// modelo; acima dos ~4 M do gerador, as partículas extras são FILHAS de
// cada mãe (ensaio 5) ou, com ?sorteios=N, sorteios independentes do mesmo
// modelo. Parâmetros: ?vista= ?pos= ?look= ?fov= ?w= ?h= ?k= (filhas por
// mãe) ?modo=deposito|quadrados ?borrifo=1 ?fatia= ?sorteios= ?expo=.
// ============================================================
import * as THREE from 'three';
import { loadGalacticAssets } from '../../three/cartography/galacticAssets';
import { GALACTIC_MODEL } from '../../three/cartography/galacticModel';
import { EX, EY, EZ, GAL } from '../../three/world/baseGalactica';
import { assarCarga } from '../../three/world/cadeiaDaCarga';
import {
  celulaDaParticula,
  CELULAS_DA_GRADE,
  gerarNuvensDePoeira,
  ladoDaChave,
  tauDasNuvens,
} from '../../three/world/geradorDaGalaxia';
import {
  WGSL_DEPOSITO,
  WGSL_LUZ,
  WGSL_QUADRADOS,
  WGSL_TOM_DA_TEXTURA,
  WGSL_TOM_DO_ACUMULADOR,
} from './wgsl';

const SEMENTE = 20260730; // a do app (director/carregamento.ts)
const GANHO = 7.99; // uFade da vista de fora: 1 + 6,99 (galaxy.ts)
const ESCALA = 65536; // ponto fixo do acumulador: 1 unidade de cena = 2^16
const VISTAS: Record<string, [number, number, number]> = {
  'de-cima': [-35149, -15040, 14294],
  inclinada: [-14414, 15521, 18777],
  media: [-10412, -2377, 5472],
  saindo: [-2603, -594, 1368],
  'de-lado': [2853, 36554, 18244],
};
type Modo = 'deposito' | 'quadrados';
interface Pedido {
  vista?: string;
  pos?: number[];
  look?: number[];
  w?: number;
  h?: number;
  k?: number;
  modo?: Modo;
  /** 1 = cada partícula deposita num só pixel sorteado (só no depósito) */
  borrifo?: number;
  /** a luz (extinção) de cada mãe é renovada a cada `fatia` quadros, uma
   *  fatia das mães por quadro; 1 = todas em todo quadro */
  fatia?: number;
}

const q = new URLSearchParams(window.location.search);
const numeros = (s: string | null) => {
  const v = (s ?? '').split(',').map(Number);
  return v.length === 3 && v.every(Number.isFinite) ? v : undefined;
};
const estado = {
  vista: q.get('vista') ?? 'media',
  pos: numeros(q.get('pos')),
  look: numeros(q.get('look')),
  fov: Number(q.get('fov')) || 58,
  w: Number(q.get('w')) || 1280,
  h: Number(q.get('h')) || 800,
  k: Number(q.get('k')) || 1,
  modo: (q.get('modo') === 'quadrados' ? 'quadrados' : 'deposito') as Modo,
  borrifo: Number(q.get('borrifo')) || 0,
  fatia: Number(q.get('fatia')) || 1,
  expo: Number(q.get('expo')) || 1.436, // exposição 1,02 do app na régua do neutro
};
const SORTEIOS = Math.max(1, Number(q.get('sorteios')) || 1);

const painel = document.getElementById('painel') as HTMLElement;
const diz = (t: string) => {
  painel.textContent = t;
};

async function iniciar() {
  if (!navigator.gpu) throw new Error('este navegador não tem WebGPU');
  const adaptador = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adaptador) throw new Error('WebGPU sem adaptador');
  const pedir = ['timestamp-query', 'float32-blendable'].filter((f) => adaptador.features.has(f));
  const gpu = await adaptador.requestDevice({
    requiredFeatures: pedir,
    requiredLimits: {
      maxBufferSize: adaptador.limits.maxBufferSize,
      maxStorageBufferBindingSize: adaptador.limits.maxStorageBufferBindingSize,
    },
  });
  const erros: string[] = [];
  gpu.addEventListener('uncapturederror', (e) => {
    const m = (e as Event & { error: { message: string } }).error.message;
    erros.push(m);
    console.error('[webgpu]', m);
  });
  const temRelogio = gpu.features.has('timestamp-query');
  const somaEm32 = gpu.features.has('float32-blendable');

  // ---------- os dados: o modelo do app, sem reescrever ----------
  diz('gerando a galáxia…');
  const catalogos = await loadGalacticAssets();
  let bright = new Float32Array(0);
  let total = 0;
  for (let s = 0; s < SORTEIOS; s++) {
    const carga = await assarCarga(
      { seed: SEMENTE + s * 7919, catalogos, populationScale: 1, soParticulas: true },
      () => {}
    );
    if (s === 0) {
      bright = new Float32Array(carga.brightCount * 8 * SORTEIOS);
      bright.set(carga.bright.subarray(0, carga.brightCount * 8));
      total = carga.brightCount;
      continue;
    }
    // sorteio extra: só as populações contínuas (as das células); estrela
    // jovem, nó H II, aglomerado, halo e núcleo são indivíduos do 1º sorteio
    for (let i = 0; i < carga.brightCount; i++) {
      if (celulaDaParticula(carga.bright, i) === CELULAS_DA_GRADE) continue;
      bright.set(carga.bright.subarray(i * 8, i * 8 + 8), total * 8);
      total++;
    }
  }
  // espaçamento local das mães (pc): 1/√Σ da célula; 0 = indivíduo, sem filhas
  const chaves = new Uint16Array(total);
  const porChave = new Map<number, number>();
  for (let i = 0; i < total; i++) {
    const c = celulaDaParticula(bright, i);
    chaves[i] = c;
    porChave.set(c, (porChave.get(c) ?? 0) + 1);
  }
  const esp = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const c = chaves[i];
    if (c === CELULAS_DA_GRADE) continue;
    esp[i] = ladoDaChave(c) / Math.sqrt(porChave.get(c) ?? 1);
    bright[i * 8 + 7] /= SORTEIOS;
  }
  const N_TAU = 1024;
  const tau = tauDasNuvens(gerarNuvensDePoeira(), N_TAU, GALACTIC_MODEL.diskRadiusPc);
  const tauMeio = new Uint16Array(tau.length);
  for (let i = 0; i < tau.length; i++) tauMeio[i] = THREE.DataUtils.toHalfFloat(tau[i]);

  // ---------- GPU: buffers fixos ----------
  const USO = { storage: 0x80, copyDst: 0x08, copySrc: 0x04, uniform: 0x40, mapRead: 0x01, queryResolve: 0x200 };
  const bufMaes = gpu.createBuffer({ size: total * 32, usage: USO.storage | USO.copyDst });
  gpu.queue.writeBuffer(bufMaes, 0, bright.subarray(0, total * 8));
  const bufEsp = gpu.createBuffer({ size: total * 4, usage: USO.storage | USO.copyDst });
  gpu.queue.writeBuffer(bufEsp, 0, esp);
  const bufLuz = gpu.createBuffer({ size: total * 16, usage: USO.storage });
  const bufU = gpu.createBuffer({ size: 176, usage: USO.uniform | USO.copyDst });
  const texTau = gpu.createTexture({
    size: [N_TAU, N_TAU],
    format: 'r16float',
    usage: 0x04 | 0x02, // TEXTURE_BINDING | COPY_DST
  });
  gpu.queue.writeTexture({ texture: texTau }, tauMeio, { bytesPerRow: N_TAU * 2 }, [N_TAU, N_TAU]);
  const amostrador = gpu.createSampler({ magFilter: 'linear', minFilter: 'linear' });

  const tela = document.getElementById('tela') as HTMLCanvasElement;
  const ctx = tela.getContext('webgpu') as unknown as GPUCanvasContext;
  const formatoDaTela = navigator.gpu.getPreferredCanvasFormat();
  const formatoDaSoma = somaEm32 ? 'rgba32float' : 'rgba16float';

  const modulo = async (code: string, nome: string) => {
    const m = gpu.createShaderModule({ code });
    const info = await m.getCompilationInfo();
    for (const msg of info.messages) {
      if (msg.type === 'error') throw new Error(`${nome}:${msg.lineNum} ${msg.message}`);
    }
    return m;
  };
  const pLuz = gpu.createComputePipeline({
    layout: 'auto',
    compute: { module: await modulo(WGSL_LUZ, 'luz'), entryPoint: 'main' },
  });
  const pDeposito = gpu.createComputePipeline({
    layout: 'auto',
    compute: { module: await modulo(WGSL_DEPOSITO, 'deposito'), entryPoint: 'main' },
  });
  const mQuadrados = await modulo(WGSL_QUADRADOS, 'quadrados');
  const pQuadrados = gpu.createRenderPipeline({
    layout: 'auto',
    vertex: { module: mQuadrados, entryPoint: 'vs' },
    fragment: {
      module: mQuadrados,
      entryPoint: 'fs',
      targets: [
        {
          format: formatoDaSoma,
          blend: {
            color: { srcFactor: 'one', dstFactor: 'one' },
            alpha: { srcFactor: 'one', dstFactor: 'one' },
          },
        },
      ],
    },
    primitive: { topology: 'triangle-strip' },
  });
  const tom = async (code: string, nome: string) => {
    const m = await modulo(code, nome);
    return gpu.createRenderPipeline({
      layout: 'auto',
      vertex: { module: m, entryPoint: 'vs' },
      fragment: { module: m, entryPoint: 'fs', targets: [{ format: formatoDaTela }] },
      primitive: { topology: 'triangle-list' },
    });
  };
  const pTomAcc = await tom(WGSL_TOM_DO_ACUMULADOR, 'tom do acumulador');
  const pTomTex = await tom(WGSL_TOM_DA_TEXTURA, 'tom da textura');

  const liga = (p: GPUPipeline, entradas: unknown[]) =>
    gpu.createBindGroup({
      layout: p.getBindGroupLayout(0),
      entries: entradas.map((resource, binding) => ({ binding, resource })),
    });
  const gLuz = liga(pLuz, [{ buffer: bufU }, { buffer: bufMaes }, { buffer: bufLuz }, texTau.createView(), amostrador]);

  // ---------- GPU: o que depende do tamanho do quadro ----------
  let bufAcc: GPUBuffer | null = null;
  let texSoma: GPUTexture | null = null;
  let gDeposito: GPUBindGroup, gQuadrados: GPUBindGroup, gTomAcc: GPUBindGroup, gTomTex: GPUBindGroup;
  let vistaDaSoma: GPUTextureView;
  let largura = 0;
  let altura = 0;
  const redimensionar = (w: number, h: number) => {
    if (w === largura && h === altura) return;
    largura = w;
    altura = h;
    tela.width = w;
    tela.height = h;
    ctx.configure({ device: gpu, format: formatoDaTela, alphaMode: 'opaque' });
    bufAcc?.destroy();
    texSoma?.destroy();
    bufAcc = gpu.createBuffer({ size: w * h * 16, usage: USO.storage | USO.copyDst });
    texSoma = gpu.createTexture({ size: [w, h], format: formatoDaSoma, usage: 0x10 | 0x04 });
    vistaDaSoma = texSoma.createView();
    const comuns = [{ buffer: bufU }, { buffer: bufMaes }, { buffer: bufLuz }, { buffer: bufEsp }];
    gDeposito = liga(pDeposito, [...comuns, { buffer: bufAcc }]);
    gQuadrados = liga(pQuadrados, comuns);
    gTomAcc = liga(pTomAcc, [{ buffer: bufU }, { buffer: bufAcc }]);
    gTomTex = liga(pTomTex, [{ buffer: bufU }, vistaDaSoma]);
  };

  // ---------- relógio da GPU ----------
  const relogio = temRelogio ? gpu.createQuerySet({ type: 'timestamp', count: 6 }) : null;
  const bufRelogio = gpu.createBuffer({ size: 48, usage: USO.queryResolve | USO.copySrc });
  const bufLeitura = gpu.createBuffer({ size: 48, usage: USO.mapRead | USO.copyDst });
  const marca = (i: number) =>
    relogio
      ? { timestampWrites: { querySet: relogio, beginningOfPassWriteIndex: i, endOfPassWriteIndex: i + 1 } }
      : {};

  const camera = new THREE.PerspectiveCamera(58, 1, 1, 400000);
  const dadosU = new ArrayBuffer(176);
  const uF = new Float32Array(dadosU);
  const uI = new Uint32Array(dadosU);

  let nQuadro = 0;
  /** codifica e envia um quadro; com `medir`, resolve o relógio no fim */
  const quadro = (medir = false) => {
    const pos = estado.pos ?? VISTAS[estado.vista] ?? VISTAS.media;
    const look = estado.look ?? GAL.GC_POS.toArray();
    redimensionar(estado.w, estado.h);
    camera.fov = estado.fov;
    camera.aspect = largura / altura;
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.up.copy(EZ);
    camera.lookAt(look[0], look[1], look[2]);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const vp = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    uF.set(vp.elements, 0);
    uF.set([pos[0], pos[1], pos[2], altura], 16);
    uF.set([EX.x, EX.y, EX.z, Math.tan(THREE.MathUtils.degToRad(estado.fov) / 2)], 20);
    uF.set([EY.x, EY.y, EY.z, GANHO], 24);
    uF.set([EZ.x, EZ.y, EZ.z, 0.6], 28);
    uF.set([GAL.GC_POS.x, GAL.GC_POS.y, GAL.GC_POS.z, ESCALA], 32);
    uF.set([largura, altura, estado.expo, (40 * altura) / 1080], 36);
    uI[40] = total;
    uI[41] = estado.k;
    uI[42] = estado.borrifo;
    const porFatia = Math.ceil(total / estado.fatia);
    uI[43] = (nQuadro++ % estado.fatia) * porFatia;
    gpu.queue.writeBuffer(bufU, 0, dadosU);

    const grupos = Math.ceil(total / 256);
    const enc = gpu.createCommandEncoder();
    let p = enc.beginComputePass(marca(0));
    p.setPipeline(pLuz);
    p.setBindGroup(0, gLuz);
    p.dispatchWorkgroups(Math.ceil(porFatia / 256));
    p.end();
    const alvoDaTela = {
      colorAttachments: [
        { view: ctx.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] },
      ],
    };
    if (estado.modo === 'deposito') {
      enc.clearBuffer(bufAcc as GPUBuffer);
      p = enc.beginComputePass(marca(2));
      p.setPipeline(pDeposito);
      p.setBindGroup(0, gDeposito);
      p.dispatchWorkgroups(grupos);
      p.end();
      p = enc.beginRenderPass({ ...alvoDaTela, ...marca(4) });
      p.setPipeline(pTomAcc);
      p.setBindGroup(0, gTomAcc);
    } else {
      p = enc.beginRenderPass({
        colorAttachments: [{ view: vistaDaSoma, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }],
        ...marca(2),
      });
      p.setPipeline(pQuadrados);
      p.setBindGroup(0, gQuadrados);
      p.draw(4, total * estado.k);
      p.end();
      p = enc.beginRenderPass({ ...alvoDaTela, ...marca(4) });
      p.setPipeline(pTomTex);
      p.setBindGroup(0, gTomTex);
    }
    p.draw(3);
    p.end();
    if (medir && relogio) {
      enc.resolveQuerySet(relogio, 0, 6, bufRelogio, 0);
      enc.copyBufferToBuffer(bufRelogio, 0, bufLeitura, 0, 48);
    }
    gpu.queue.submit([enc.finish()]);
  };

  const aplicar = (pedido: Pedido) => {
    if (pedido.vista) {
      estado.vista = pedido.vista;
      estado.pos = undefined;
      estado.look = undefined;
    }
    Object.assign(estado, pedido);
  };
  const mediana = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];

  /** ms por quadro: os três passos pelo relógio da GPU e o intervalo real
   *  entre quadros seguidos sem vsync (envio → GPU terminou) */
  const medir = async (pedido: Pedido, quadros = 12) => {
    aplicar(pedido);
    for (let i = 0; i < Math.max(3, estado.fatia); i++) quadro();
    await gpu.queue.onSubmittedWorkDone();
    const passos: number[][] = [[], [], []];
    const parede: number[] = [];
    for (let i = 0; i < quadros; i++) {
      const t0 = performance.now();
      quadro(true);
      await gpu.queue.onSubmittedWorkDone();
      parede.push(performance.now() - t0);
      if (!relogio) continue;
      await bufLeitura.mapAsync(USO.mapRead);
      const t = new BigInt64Array(bufLeitura.getMappedRange().slice(0));
      bufLeitura.unmap();
      for (let j = 0; j < 3; j++) passos[j].push(Number(t[j * 2 + 1] - t[j * 2]) / 1e6);
    }
    const [luz, desenho, tomMs] = passos.map((v) => (v.length ? mediana(v) : NaN));
    return {
      vista: estado.vista, modo: estado.modo, borrifo: estado.borrifo, fatia: estado.fatia, w: largura, h: altura,
      milhoes: (total * estado.k) / 1e6,
      luz, desenho, tom: tomMs, gpu: luz + desenho + tomMs,
      parede: mediana(parede),
      erros: erros.splice(0),
    };
  };

  /** desenha e devolve o PNG do quadro (data URL) */
  const foto = async (pedido: Pedido) => {
    aplicar(pedido);
    for (let i = 0; i < estado.fatia; i++) quadro();
    const url = tela.toDataURL('image/png');
    await gpu.queue.onSubmittedWorkDone();
    return url;
  };

  /** grão de uma imagem: em cada trecho [x, y, lado], a média, sobre as
   *  caixas de 9 px, de desvio ÷ média da luminância (Rec. 709 nos 8 bits) */
  const grao = async (url: string, trechos: number[][]) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const c2 = c.getContext('2d') as CanvasRenderingContext2D;
    c2.drawImage(img, 0, 0);
    return trechos.map(([x0, y0, lado]) => {
      const d = c2.getImageData(x0, y0, lado, lado).data;
      let soma = 0;
      let caixas = 0;
      for (let by = 0; by + 9 <= lado; by += 9) {
        for (let bx = 0; bx + 9 <= lado; bx += 9) {
          let s = 0;
          let s2 = 0;
          for (let y = by; y < by + 9; y++) {
            for (let x = bx; x < bx + 9; x++) {
              const o = (y * lado + x) * 4;
              const l = 0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2];
              s += l;
              s2 += l * l;
            }
          }
          const m = s / 81;
          if (m > 0) {
            soma += Math.sqrt(Math.max(s2 / 81 - m * m, 0)) / m;
            caixas++;
          }
        }
      }
      return caixas ? soma / caixas : NaN;
    });
  };

  const info = {
    particulas: total,
    sorteios: SORTEIOS,
    relogio: temRelogio,
    soma: formatoDaSoma,
    adaptador: adaptador.info ? `${adaptador.info.vendor} ${adaptador.info.architecture}` : '?',
    catalogos: Boolean(catalogos),
  };
  const mostrar = async () => {
    const m = await medir({}, 6);
    diz(
      `${m.vista} · ${m.modo} · ${m.milhoes.toFixed(1)} M · ${m.w}×${m.h} · ` +
        `GPU ${m.gpu.toFixed(1)} ms (luz ${m.luz.toFixed(1)} + desenho ${m.desenho.toFixed(1)} + tom ${m.tom.toFixed(1)}) · ` +
        `quadro ${m.parede.toFixed(1)} ms${m.erros.length ? ` · ERRO ${m.erros[0]}` : ''}`
    );
    quadro();
  };
  for (const id of ['vista', 'k', 'modo'] as const) {
    const sel = document.getElementById(id) as HTMLSelectElement;
    sel.value = String(estado[id]);
    sel.addEventListener('change', () => {
      aplicar(id === 'k' ? { k: Number(sel.value) } : id === 'modo' ? { modo: sel.value as Modo } : { vista: sel.value });
      void mostrar();
    });
  }
  await mostrar();
  Object.assign(window, { __gw: { info, medir, foto, grao } });
}

iniciar().catch((e: unknown) => {
  diz(`falhou: ${e instanceof Error ? e.message : String(e)}`);
  Object.assign(window, { __gwErro: String(e) });
  console.error(e);
});
