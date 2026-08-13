// O instrumento de z-fighting sem GPU: o sintético tem de ter dentes.
import { describe, expect, it } from 'vitest';
import {
  LIMIAR_ALTERNANTE,
  alinharRgba,
  autoTesteSintetico,
  contarAlternantes,
  deltaPixel,
} from './z-fighting.mjs';

describe('contarAlternantes', () => {
  const px = (r, g, b) => {
    const a = new Uint8ClampedArray(8);
    a[0] = r;
    a[1] = g;
    a[2] = b;
    a[3] = 255;
    a[4] = 10;
    a[5] = 10;
    a[6] = 10;
    a[7] = 255;
    return a;
  };

  it('três quadros iguais: zero alternantes', () => {
    const a = px(40, 40, 40);
    expect(contarAlternantes([a, a, a])).toBe(0);
  });

  it('um pixel que salta 10→200 conta UM', () => {
    const a = px(10, 10, 10);
    const b = px(200, 200, 200);
    expect(contarAlternantes([a, b, a])).toBe(1);
  });

  it('AA de 3 níveis NÃO conta (abaixo do limiar)', () => {
    const a = px(40, 40, 40);
    const b = px(43, 42, 41);
    expect(LIMIAR_ALTERNANTE).toBeGreaterThan(8);
    expect(contarAlternantes([a, b, a])).toBe(0);
  });

  it('M5: faixa inteira colada tem de acusar', () => {
    const n = 16;
    const a = new Uint8ClampedArray(n * 4);
    const b = new Uint8ClampedArray(n * 4);
    for (let i = 0; i < n; i++) {
      a[i * 4] = 20;
      a[i * 4 + 1] = 80;
      a[i * 4 + 2] = 20;
      a[i * 4 + 3] = 255;
      b[i * 4] = 200;
      b[i * 4 + 1] = 200;
      b[i * 4 + 2] = 200;
      b[i * 4 + 3] = 255;
    }
    expect(contarAlternantes([a, b, a])).toBe(n);
  });
});

describe('alinharRgba', () => {
  it('deslocar 1 px e realinhar devolve o original nos pixels internos', () => {
    const W = 4;
    const H = 2;
    const src = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      src[i * 4] = i * 20;
      src[i * 4 + 1] = 50;
      src[i * 4 + 2] = 50;
      src[i * 4 + 3] = 255;
    }
    const shifted = alinharRgba(src, W, H, -1, 0);
    const back = alinharRgba(shifted, W, H, 1, 0);
    // coluna interna x=2: veio de x=1 do shifted, que veio de x=0 do src? 
    // shifted(x) = src(x-(-1)) = src(x+1). back(x) = shifted(x-1) = src(x).
    for (let y = 0; y < H; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = (y * W + x) * 4;
        expect(back[i]).toBe(src[i]);
      }
    }
  });
});

describe('deltaPixel e o auto-teste', () => {
  it('chebyshev lê o canal que mais anda', () => {
    const a = new Uint8ClampedArray([10, 10, 10, 255]);
    const b = new Uint8ClampedArray([10, 50, 10, 255]);
    expect(deltaPixel(a, b, 0)).toBe(40);
  });

  it('o sintético do harness passa — nulo, um, sabotado', () => {
    const r = autoTesteSintetico();
    expect(r.nulo).toBe(0);
    expect(r.um).toBe(1);
    expect(r.sabotado).toBeGreaterThan(0);
    expect(r.passou).toBe(true);
  });
});
