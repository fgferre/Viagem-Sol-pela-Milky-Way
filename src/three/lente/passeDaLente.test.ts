// Serve: dono — o reflexo da lente de cinema segue uma lei só de brilho, e com "nenhuma" o quadro é o de sempre
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { irradianciaRelativa } from '../../lib/atlas/luz';
import {
  DISCO_ASSUNTO,
  G_DA_LENTE,
  PasseDaLente,
  amplitudeDaLente,
  lenteComOSolDeRaio,
  multiplicadorDaForca,
} from './passeDaLente';

describe('o passe da lente', () => {
  it('a amplitude: assistida constante até 50 UA e (50/d)² além; real = E(d); visibilidade zero apaga', () => {
    const rel = (d: number, p: 'assistida' | 'real', vis = 1) => amplitudeDaLente(d, p, 0, vis) / G_DA_LENTE;
    for (const d of [0.4, 1, 9.5, 30, 50]) expect(rel(d, 'assistida')).toBeCloseTo(1, 12);
    expect(rel(100, 'assistida')).toBeCloseTo(0.25, 12);
    expect(rel(500, 'assistida')).toBeCloseTo(0.01, 12);
    for (const d of [1, 9.5]) expect(rel(d, 'real')).toBeCloseTo(irradianciaRelativa(d), 12);
    expect(amplitudeDaLente(1, 'assistida', 0, 0)).toBe(0);
  });

  it('a força: 100 % é ×1 exato, linear na faixa da barra, presa nas pontas, e lixo é ×1', () => {
    expect(Object.is(multiplicadorDaForca(100), 1)).toBe(true);
    expect(multiplicadorDaForca(25)).toBe(0.25);
    expect(multiplicadorDaForca(150)).toBe(1.5);
    expect(multiplicadorDaForca(200)).toBe(2);
    expect(multiplicadorDaForca(5)).toBe(0.25);
    expect(multiplicadorDaForca(900)).toBe(2);
    for (const ruim of [NaN, Infinity, -Infinity]) expect(multiplicadorDaForca(ruim)).toBe(1);
  });

  it('o Sol assunto do quadro: lente inteira com o disco pequeno, nenhuma com ele grande, sem degrau no meio', () => {
    const [a, b] = DISCO_ASSUNTO;
    expect(lenteComOSolDeRaio(0.005)).toBe(1); // ~1 UA a 50°: disco de 1 % da altura
    expect(lenteComOSolDeRaio(a / 2)).toBe(1);
    expect(lenteComOSolDeRaio(b / 2)).toBe(0);
    expect(lenteComOSolDeRaio(0.5)).toBe(0);
    let antes = 1;
    for (let k = 0; k <= 40; k++) {
      const v = lenteComOSolDeRaio((a / 2) * (b / a) ** (k / 40));
      expect(v).toBeLessThanOrEqual(antes);
      expect(antes - v).toBeLessThan(0.1);
      antes = v;
    }
  });

  it('com "nenhuma" o passe fica desligado, com a luz cheia', () => {
    const passe = new PasseDaLente(new THREE.PerspectiveCamera(50, 16 / 9));
    passe.definirLente('redonda');
    passe.atualizar(1, 'assistida', 0, 1, [1, 1, 1]);
    expect(passe.enabled).toBe(true);
    passe.definirLente('nenhuma');
    passe.atualizar(1, 'assistida', 0, 1, [1, 1, 1]);
    expect(passe.enabled).toBe(false);
    passe.dispose();
  });
});
