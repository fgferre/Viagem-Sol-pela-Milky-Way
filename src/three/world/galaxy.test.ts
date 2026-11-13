// Serve: chão — a galáxia de partículas devolve à placa tudo o que criou quando o mundo é refeito (troca de qualidade)
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

describe('Galaxy.dispose (13/11/2026)', () => {
  it('solta a textura das células do nível de detalhe — sem ela cada troca de qualidade deixava uma textura na placa', async () => {
    vi.stubGlobal('window', { location: { search: '' } });
    const { Galaxy } = await import('./galaxy');
    // duas partículas de disco (tipo 0) bastam para haver células
    const bright = new Float32Array(16);
    bright.set([0, 0, 0, 1, 1, 1, 2, 1], 0);
    bright.set([100, 0, 0, 1, 1, 1, 2, 1], 8);
    const mapa = new THREE.DataTexture(new Uint8Array(4), 1, 1);
    const galaxia = new Galaxy({ bright, brightCount: 2 }, mapa, mapa, {
      soParticulas: true,
      tetoLodMilhoes: 1,
    });
    const celulas = (galaxia as unknown as { lod: { textura: THREE.Texture } }).lod.textura;
    const soltou = vi.fn();
    celulas.addEventListener('dispose', soltou);
    galaxia.dispose();
    expect(soltou).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
