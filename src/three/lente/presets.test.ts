// Serve: dono — nas lentes redonda e anamórfica, posição, tamanho e forma dos reflexos desenhados vêm do vidro real (optica.ts)
import { describe, it, expect } from 'vitest';
import { presetDaLente, type Fantasma } from './presets';

describe('as receitas da lente', () => {
  it('a redonda e a anamórfica derivam da óptica fantasmas finitos, dentro do quadro e de tamanho são', () => {
    for (const nome of ['redonda', 'anamorfica'] as const) {
      const fantasmas = presetDaLente(nome).elementos.filter((e): e is Fantasma => e.tipo === 'fantasma');
      expect(fantasmas.length).toBe(7);
      for (const f of fantasmas) {
        const numeros = [f.p, f.tamanho, f.aspecto, f.rotacao, ...f.croma, ...(f.corte ? [f.corte.p, f.corte.raio] : [])];
        expect(numeros.every(Number.isFinite), `${nome} ${f.semente}`).toBe(true);
        expect(Math.abs(f.p)).toBeLessThan(2);
        expect(f.tamanho).toBeGreaterThan(0.03);
        expect(f.tamanho).toBeLessThan(0.4);
        if (nome === 'redonda') expect(f.aspecto).toBeCloseTo(1, 6);
        else expect(f.aspecto).toBeGreaterThan(0.25);
        expect(f.aspecto).toBeLessThanOrEqual(1);
        for (const c of f.croma) expect(Math.abs(c - 1)).toBeLessThanOrEqual(0.12 + 1e-12);
        if (f.corte) expect(f.corte.raio).toBeGreaterThan(1);
      }
    }
  });
});
