// As heroes RESGATADAS (item 44, 16/08): a arte do filme de 30/07, de
// volta byte a byte. Os oráculos cobram a identidade da peça exumada —
// a escolha por magnitude, o tamanho de autor e a lente de referência —
// para a próxima reforma não a descaracterizar em silêncio de novo.
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { NamedStar } from '../config';
import { HeroStars, TAN_DA_LENTE_PADRAO } from './heroStars';

function estrela(n: string, m: number, x = 1, y = 0, z = 0): NamedStar {
  return { n, m, d: 10, x, y, z, ci: 0.5 } as NamedStar;
}

describe('as heroes resgatadas — a arte do filme', () => {
  const named = [
    estrela('Sirius', -1.46, 2.6),
    estrela('Fraca', 5.2, 50),
    estrela('Vega', 0.03, 7.7),
    estrela('Media', 2.9, 20),
  ];

  it('escolhe as mais brilhantes por magnitude, Sirius primeiro', () => {
    const h = new HeroStars(named);
    expect(h.chosen[0].n).toBe('Sirius');
    expect(h.chosen.map((s) => s.n)).toContain('Vega');
    h.dispose();
  });

  it('o tamanho é o de AUTOR de 30/07: 0,08·10^(−0,3·m) pc — e Sirius é a maior', () => {
    const h = new HeroStars(named);
    expect(h.sizePc[0]).toBeCloseTo(0.08 * Math.pow(10, -0.3 * -1.46), 12);
    for (let i = 1; i < h.sizePc.length; i++) {
      expect(h.sizePc[0]).toBeGreaterThanOrEqual(h.sizePc[i]);
    }
    h.dispose();
  });

  it('a lente de referência é tan(29°), a mesma conta da era do filme', () => {
    expect(TAN_DA_LENTE_PADRAO).toBeCloseTo(Math.tan((29 * Math.PI) / 180), 15);
  });

  it('update publica a distância câmera↔estrela que foi ao uniform', () => {
    const h = new HeroStars(named);
    h.update(1, new THREE.Vector3(0, 0, 0), TAN_DA_LENTE_PADRAO);
    expect(h.camDistPc[0]).toBeCloseTo(2.6, 6);
    h.dispose();
  });

  it('billboards aditivos, sem escrita de profundidade — como no filme', () => {
    const h = new HeroStars(named);
    h.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const m = o.material as THREE.ShaderMaterial;
        expect(m.blending).toBe(THREE.AdditiveBlending);
        expect(m.depthWrite).toBe(false);
      }
    });
    h.dispose();
  });
});
