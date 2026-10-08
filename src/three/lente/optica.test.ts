// Serve: dono — os reflexos das duas lentes de cinema saem do vidro de receitas reais (US 2,784,643 e US 9,341,827), não de um desenho
import { describe, it, expect } from 'vitest';
import { MAX_FANTASMAS, lente, pilhaDoRevestimento, quadNoEcra, refletanciaDaPilha } from './optica';

const perto = (obtido: number, esperado: number, tolRel: number) =>
  expect(Math.abs(obtido / esperado - 1)).toBeLessThanOrEqual(tolRel);

describe('a óptica das lentes de cinema', () => {
  it('as receitas transcritas reproduzem as focais paraxiais publicadas', () => {
    perto(lente('redonda').focal.x, 50, 0.01);
    perto(lente('redonda').focal.y, 50, 0.01);
    perto(lente('anamorfica').focal.y, 42.47, 0.01);
    perto(lente('anamorfica').focal.x, 21.47, 0.01);
  });

  it('a camada simples tem o mínimo em λ0 e a moderna reflete menos de 0,5 % de 450 a 650 nm', () => {
    for (const lambda0 of [460, 550, 680]) {
      const R = (l: number) => refletanciaDaPilha(pilhaDoRevestimento('simples', 1.72, lambda0), 1.72, l);
      let minimo = Infinity;
      let onde = 0;
      for (let l = 400; l <= 800; l += 0.5) {
        if (R(l) < minimo) [minimo, onde] = [R(l), l];
      }
      expect(Math.abs(onde - lambda0)).toBeLessThanOrEqual(0.5);
      for (let l = 450; l <= 680; l += 1) {
        expect(R(l)).toBeGreaterThan(0);
        expect(R(l)).toBeLessThan(0.06);
      }
    }
    // os vidros das duas receitas, a moderna no seu λ0 central
    for (const nd of [1.497, 1.516, 1.649, 1.6662, 1.67197, 1.678, 1.713, 1.71785, 1.734, 1.805, 1.835, 1.847, 1.883]) {
      const pilha = pilhaDoRevestimento('moderno', nd, 540);
      for (let l = 450; l <= 650; l += 1) expect(refletanciaDaPilha(pilha, nd, l)).toBeLessThan(0.005);
    }
  });

  it('em ±40° todo fantasma guardado é finito, e na redonda o centro cai na reta centro–fonte', () => {
    const aspecto = 16 / 9;
    const casos = [8, 50, 75].flatMap((graus) =>
      (['redonda', 'anamorfica'] as const).map((nome) => ({ nome, fovY: (graus * Math.PI) / 180 })),
    );
    for (const { nome, fovY } of casos) {
      const tan = Math.tan(fovY / 2);
      const l = lente(nome);
      expect(l.fantasmas.length).toBeGreaterThan(0);
      expect(l.fantasmas.length).toBeLessThanOrEqual(MAX_FANTASMAS);
      for (const f of l.fantasmas) {
        const numeros = [f.As, f.Bs, f.Aa, f.Ba].flatMap((t) => t.flatMap((e) => [e.x, e.y]));
        expect([...numeros, ...f.ganho, ...f.refletancia].every(Number.isFinite)).toBe(true);
        for (const graus of [0, 10, 25, 40]) {
          for (let azimute = 0; azimute < 360; azimute += 30) {
            const tx = Math.tan((graus * Math.PI) / 180) * Math.cos((azimute * Math.PI) / 180);
            const ty = Math.tan((graus * Math.PI) / 180) * Math.sin((azimute * Math.PI) / 180);
            for (let canal = 0; canal < 3; canal++) {
              const q = quadNoEcra(l, f, canal, tx, ty, fovY, aspecto);
              expect([q.cx, q.cy, q.mx, q.my].every(Number.isFinite)).toBe(true);
              expect(Math.min(q.mx, q.my)).toBeGreaterThanOrEqual(0);
              if (nome !== 'redonda') continue;
              const sx = tx / (aspecto * tan);
              const sy = ty / tan;
              const cruz = q.cx * sy - q.cy * sx;
              expect(Math.abs(cruz)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.hypot(q.cx, q.cy) * Math.hypot(sx, sy)));
            }
          }
        }
      }
    }
  });
});
