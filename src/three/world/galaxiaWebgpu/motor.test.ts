// Serve: chão — o motor da galáxia WebGPU que falha depois de pedir o dispositivo o destrói antes de repassar o erro
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

describe('MotorDaGalaxia.criar', () => {
  it('um shader recusado depois do requestDevice destrói o dispositivo e repassa o erro', async () => {
    const destroy = vi.fn();
    const dispositivo = {
      destroy,
      createShaderModule: () => ({
        getCompilationInfo: async () => ({ messages: [{ type: 'error', lineNum: 3, message: 'recusado' }] }),
      }),
    };
    const adaptador = {
      features: new Set<string>(),
      limits: { maxBufferSize: 1, maxStorageBufferBindingSize: 1 },
      requestDevice: async () => dispositivo,
    };
    vi.stubGlobal('window', { location: { search: '' } });
    vi.stubGlobal('navigator', {
      gpu: { requestAdapter: async () => adaptador, getPreferredCanvasFormat: () => 'bgra8unorm' },
    });
    const { MotorDaGalaxia } = await import('./motor');
    await expect(MotorDaGalaxia.criar({} as HTMLCanvasElement, 100, true)).rejects.toThrow('tom:3 recusado');
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
