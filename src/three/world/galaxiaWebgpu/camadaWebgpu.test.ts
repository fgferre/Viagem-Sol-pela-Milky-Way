// Serve: chão — com nada mudando no que vai à placa, a galáxia WebGPU não redesenha nem sobe a textura de novo; qualquer mudança (ou fatia pendente) redesenha
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { CamadaWebgpu } from './camadaWebgpu';
import type { MotorDaGalaxia } from './motor';

// a placa de mentira: toda peça devolve outra peça; só a fila conta os envios
const peca = (): unknown =>
  new Proxy(() => {}, { get: (_, p) => (p === 'then' ? undefined : peca()), apply: () => peca() });

async function bancada() {
  vi.stubGlobal('window', { location: { search: '' } });
  const { CamadaWebgpu: Camada } = await import('./camadaWebgpu');
  const { MotorDaGalaxia: MotorReal } = await import('./motor');
  const fila = { writeBuffer: vi.fn(), writeTexture: vi.fn(), submit: vi.fn() };
  const gpu = new Proxy({}, { get: (_, p) => (p === 'queue' ? fila : peca()) });
  const tela = { width: 2, height: 2, getContext: () => peca() };
  const Motor = MotorReal as unknown as new (...a: unknown[]) => MotorDaGalaxia;
  const pipelines = { ext: peca(), dep: peca(), tom: peca(), dobra: peca() };
  const motor = new Motor(gpu, tela, 100, pipelines, 'rgba16float', new Uint16Array(4));
  const sorteio = () => ({ dados: new ArrayBuffer(20 * 10), esp: new Uint32Array(10), m: 10 });
  motor.acrescentarPacote(sorteio());
  const camada = new (Camada as unknown as new (m: MotorDaGalaxia, t: unknown) => CamadaWebgpu)(motor, tela);
  const textura = (camada.mesh.material as THREE.ShaderMaterial).uniforms.uGalaxia.value as THREE.Texture;
  const camera = new THREE.PerspectiveCamera(50, 2, 1, 1e6);
  camera.position.set(8000, 300, 20);
  const estado = { w: 64, h: 32, ganho: 1, op: { k: 1, borrifo: 0, filtro: 0, lod: 0, fatia: 1, pesoFixo: 1, pesoPerto: 0 } };
  const update = () => camada.update(camera, estado.w, estado.h, 0.5, estado.ganho, 1, estado.op);
  return { fila, camera, estado, update, textura, mais: () => motor.acrescentarPacote(sorteio()) };
}

describe('a galáxia WebGPU parada não redesenha', () => {
  it('dois quadros iguais enviam um só e sobem a textura uma vez; câmera, tamanho, ganho e sorteio novo redesenham', async () => {
    const { fila, camera, estado, update, textura, mais } = await bancada();
    const v0 = textura.version;
    update();
    update();
    expect(fila.submit).toHaveBeenCalledTimes(1);
    expect(textura.version).toBe(v0 + 1);
    // o tremor do filme pausado nos últimos dígitos da dupla precisão não muda o float32
    camera.position.x += 1e-9;
    update();
    expect(fila.submit).toHaveBeenCalledTimes(1);
    const mudancas = [
      () => camera.position.x++,
      () => (estado.w = 80),
      () => (estado.ganho = 0.5),
      () => (estado.op = { ...estado.op, k: 2 }),
      mais,
    ];
    for (const mudar of mudancas) {
      const antes = fila.submit.mock.calls.length;
      mudar();
      update();
      update();
      expect(fila.submit).toHaveBeenCalledTimes(antes + 1);
    }
    expect(textura.version).toBe(v0 + 1 + mudancas.length);
  });

  it('com a extinção em fatias, carrega num envio só e, depois de mexer a câmera, redesenha até a última fatia assentar', async () => {
    const { fila, camera, estado, update } = await bancada();
    estado.op = { ...estado.op, fatia: 4 };
    // o 1º quadro calcula a extinção inteira (fatia 1): a troca para 4 não é mudança
    for (let i = 0; i < 6; i++) update();
    expect(fila.submit).toHaveBeenCalledTimes(1);
    camera.position.x++;
    for (let i = 0; i < 6; i++) update();
    expect(fila.submit).toHaveBeenCalledTimes(1 + 4);
  });
});

describe('a carga abortada não é falha do WebGPU (auditoria R3, M8)', () => {
  it('a principal que rejeita com AbortError destrói o dispositivo, devolve null e não marca a página', async () => {
    const destroy = vi.fn();
    const dispositivo = {
      destroy,
      createShaderModule: () => ({ getCompilationInfo: async () => ({ messages: [] }) }),
      createComputePipelineAsync: async () => ({}),
      createRenderPipelineAsync: async () => ({}),
    };
    const adaptador = {
      features: new Set<string>(),
      limits: { maxBufferSize: 1, maxStorageBufferBindingSize: 1 },
      requestDevice: async () => dispositivo,
    };
    vi.stubGlobal('window', { location: { search: '' }, setTimeout: () => 0 });
    vi.stubGlobal('OffscreenCanvas', class {});
    vi.stubGlobal('navigator', { gpu: { requestAdapter: async () => adaptador } });
    const { CamadaWebgpu: Camada, webgpuFalhouNestaPagina, esquecerQuedaDoWebgpu } = await import('./camadaWebgpu');
    esquecerQuedaDoWebgpu();
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const principal = Promise.reject(new DOMException('a carga foi abortada', 'AbortError'));
    const pedida = Camada.criar(principal, 2, () => new Promise(() => {}));
    expect(await pedida.pronta).toBeNull();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(webgpuFalhouNestaPagina()).toBe(false);
    expect(aviso).not.toHaveBeenCalled();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
