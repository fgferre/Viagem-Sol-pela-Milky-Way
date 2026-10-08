import { describe, expect, it } from 'vitest';
import { RAIO_DO_AR_KM, transmitanciaDoSolVisto } from './arMedido';

describe('transmitanciaDoSolVisto — o Sol visto da câmera através do ar', () => {
  // câmera a 1,15 raio sobre o equador (eixo x), polo em z, o Sol na direção s
  const v = [1.15 * RAIO_DO_AR_KM, 0, 0];
  const polo = [0, 0, 1];
  const rumoAoRasante = (hKm: number) => {
    // s tangente à esfera de raio R + h, descendo rumo à Terra (−x) pelo plano xy
    const k = (RAIO_DO_AR_KM + hKm) / v[0];
    return [-Math.sqrt(1 - k * k), k, 0];
  };
  /** o raio aparente do Sol a 1 UA */
  const RHO = 0.004652;

  it('raio que se afasta da Terra: 1 exato; e o disco longe do ar também', () => {
    expect(transmitanciaDoSolVisto(v, [1, 0, 0], polo, RHO)).toEqual([1, 1, 1]);
    expect(transmitanciaDoSolVisto(v, rumoAoRasante(400), polo, RHO)).toEqual([1, 1, 1]);
  });

  it('raio rente ao chão: vermelho fundo; batendo na Terra: 0', () => {
    const [r, g, b] = transmitanciaDoSolVisto(v, rumoAoRasante(1e-6), polo, 0);
    expect(r).toBeGreaterThan(0.01);
    expect(r).toBeLessThan(0.1);
    expect(g / r).toBeLessThan(0.15);
    expect(b / r).toBeLessThan(1e-3);
    expect(transmitanciaDoSolVisto(v, rumoAoRasante(-5), polo, 0)).toEqual([0, 0, 0]);
  });

  it('o disco: com o centro já atrás do limbo, a borda de cima ainda passa, vermelha', () => {
    const [r, g, b] = transmitanciaDoSolVisto(v, rumoAoRasante(-5), polo, RHO);
    expect(r).toBeGreaterThan(0.05);
    expect(g / r).toBeLessThan(0.5);
    expect(b / r).toBeLessThan(0.1);
    // o disco inteiro abaixo do limbo (~17 km de raio em altura rasante): 0
    expect(transmitanciaDoSolVisto(v, rumoAoRasante(-40), polo, RHO)).toEqual([0, 0, 0]);
  });
});
