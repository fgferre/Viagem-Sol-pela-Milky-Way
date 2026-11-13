// Serve: chão — a galáxia de partículas devolve à placa o que criou quando o mundo é refeito, e a captura só espera a camada WebGPU onde ela desenha
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

async function galaxiaDeTeste() {
  vi.stubGlobal('window', { location: { search: '' } });
  const { Galaxy } = await import('./galaxy');
  // duas partículas de disco (tipo 0) bastam para haver células
  const bright = new Float32Array(16);
  bright.set([0, 0, 0, 1, 1, 1, 2, 1], 0);
  bright.set([100, 0, 0, 1, 1, 1, 2, 1], 8);
  const mapa = new THREE.DataTexture(new Uint8Array(4), 1, 1);
  return new Galaxy({ bright, brightCount: 2 }, mapa, mapa, { soParticulas: true, tetoLodMilhoes: 1 });
}

describe('Galaxy.dispose (13/11/2026)', () => {
  it('solta a textura das células do nível de detalhe — sem ela cada troca de qualidade deixava uma textura na placa', async () => {
    const galaxia = await galaxiaDeTeste();
    const celulas = (galaxia as unknown as { lod: { textura: THREE.Texture } }).lod.textura;
    const soltou = vi.fn();
    celulas.addEventListener('dispose', soltou);
    galaxia.dispose();
    expect(soltou).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});

describe('a captura espera a camada WebGPU só onde ela desenha (13/11/2026)', () => {
  it('de dentro do disco a camada a caminho não segura a captura; de fora, segura', async () => {
    const galaxia = await galaxiaDeTeste();
    galaxia.ligarWebgpu(new Promise(() => {})); // a camada nunca chega
    const cam = new THREE.Vector3(0, 0, 0);
    // dentro do disco: só a faixa local (externalFade 0) — a camada não entra
    galaxia.update(cam, 720, 0.55, 0, 0, 0, 0.76);
    expect(galaxia.desenhoEmVoo).toBe(false);
    // na borda (externalFade 0,6, o filme em t=148) ela ainda não entra
    galaxia.update(cam, 720, 0.55, 0, 0.6, 0, 0.3);
    expect(galaxia.desenhoEmVoo).toBe(false);
    // de fora (externalFade 1) ela é toda a luz das partículas: espera
    galaxia.update(cam, 720, 0.55, 0, 1, 0, 0);
    expect(galaxia.desenhoEmVoo).toBe(true);
    galaxia.dispose();
    vi.unstubAllGlobals();
  });
});
