// Serve: dono — o reflexo da lente de cinema segue uma lei só de brilho, e com "nenhuma" o quadro é o de sempre
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { irradianciaRelativa } from '../../lib/atlas/luz';
import { G_DA_LENTE, PasseDaLente, amplitudeDaLente } from './passeDaLente';

describe('o passe da lente', () => {
  it('a amplitude: assistida constante até 50 UA e (50/d)² além; real = E(d); visibilidade zero apaga', () => {
    const rel = (d: number, p: 'assistida' | 'real', vis = 1) => amplitudeDaLente(d, p, 0, vis) / G_DA_LENTE;
    for (const d of [0.4, 1, 9.5, 30, 50]) expect(rel(d, 'assistida')).toBeCloseTo(1, 12);
    expect(rel(100, 'assistida')).toBeCloseTo(0.25, 12);
    expect(rel(500, 'assistida')).toBeCloseTo(0.01, 12);
    for (const d of [1, 9.5]) expect(rel(d, 'real')).toBeCloseTo(irradianciaRelativa(d), 12);
    expect(amplitudeDaLente(1, 'assistida', 0, 0)).toBe(0);
  });

  it('com "nenhuma" o passe fica desligado, com a luz cheia', () => {
    const passe = new PasseDaLente(new THREE.PerspectiveCamera(50, 16 / 9));
    passe.definirLente('redonda');
    passe.atualizar(1, 'assistida', 0, 1, 1, [1, 1, 1]);
    expect(passe.enabled).toBe(true);
    passe.definirLente('nenhuma');
    passe.atualizar(1, 'assistida', 0, 1, 1, [1, 1, 1]);
    expect(passe.enabled).toBe(false);
    passe.dispose();
  });
});
