// Serve: lei — o relevo por foto (item 230): o byte volta a km em meio degrau, e o que passa da faixa satura e é contado
import { describe, expect, it } from 'vitest';
import { desquantizaNaFaixa, quantizaNaFaixa } from './relevo-por-foto.mjs';

const FAIXA = { min: -14, max: 22 };

describe('relevo por foto', () => {
  it('quantiza em [−14, +22] km e volta a km em ±½ degrau; o que passa da faixa satura e é contado', () => {
    const degrau = (FAIXA.max - FAIXA.min) / 255;
    const km = Float64Array.from({ length: 1001 }, (_, i) => FAIXA.min + (i * (FAIXA.max - FAIXA.min)) / 1000);
    const { bytes, abaixo, acima } = quantizaNaFaixa(km, FAIXA);
    expect(abaixo + acima).toBe(0);
    km.forEach((v, i) => expect(Math.abs(desquantizaNaFaixa(bytes[i], FAIXA) - v)).toBeLessThanOrEqual(degrau / 2 + 1e-9));
    const fora = quantizaNaFaixa(Float64Array.from([-20, 30]), FAIXA);
    expect([fora.abaixo, fora.acima, ...fora.bytes]).toEqual([1, 1, 0, 255]);
  });
});
