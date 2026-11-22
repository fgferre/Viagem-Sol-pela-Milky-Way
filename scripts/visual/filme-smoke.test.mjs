// Serve: chão — a cobrança "a capa não apaga com o tempo" do filme-smoke reprova o apagão de 8a054fbe, sem subir Chrome
// As contas PURAS da cobrança da capa (destravar, 22/11/2026, item xvii). O
// juiz inteiro abre o app e não roda aqui; o que decide o veredito roda. Os
// números dos casos são os MEDIDOS na capa a 1200×900 (q=cinema, pt-BR):
// a ponta com o conserto (c88ecf0a) e a cópia sem ele (92740eaa).
import { describe, it, expect } from 'vitest';
import { julgarCapaAcesa, medirQuadroDaCapa } from './filme-smoke.mjs';

const ACESA = {
  inicio: { luz: 89.2, estrelas: 95, relogio: 2.04, solPx: 672.3 },
  fim: { luz: 88.5, estrelas: 146, relogio: 40.52, solPx: 672.3 },
};

describe('o veredito da capa', () => {
  it('passa a capa que ficou acesa depois de 40 s de Sol', () => {
    expect(julgarCapaAcesa(ACESA)).toEqual([]);
  });

  it('reprova o apagão medido sem o conserto: a luz cai à da poeira e as estrelas somem', () => {
    const f = julgarCapaAcesa({ ...ACESA, fim: { luz: 9.0, estrelas: 0, relogio: 40.51, solPx: 672.3 } });
    expect(f).toHaveLength(2);
    expect(f[0]).toContain('a luz do quadro caiu');
    expect(f[1]).toContain('as estrelas caíram');
  });

  it('reprova o relógio parado (o shot=1), que passaria sem ter visto a ejeção', () => {
    const parado = { ...ACESA.inicio, relogio: 0 };
    expect(julgarCapaAcesa({ inicio: parado, fim: parado })).toEqual([
      expect.stringContaining('o relógio do Sol não andou'),
    ]);
  });
});

describe('a medida do quadro', () => {
  it('conta os pontos fora do Sol e não conta o brilho difuso nem o que está no disco', () => {
    const W = 40, H = 20, C = 3;
    const data = new Uint8Array(W * H * C).fill(8);
    const pinta = (x, y, v) => data.fill(v, (y * W + x) * C, (y * W + x) * C + C);
    pinta(5, 5, 200); pinta(12, 14, 120); pinta(20, 5, 90); // três estrelas
    pinta(33, 10, 200); // no disco do Sol (centro 33,10, raio 4)
    for (let x = 4; x < 16; x++) pinta(x, 10, 60); // uma faixa larga: sem anel escuro, não é estrela
    const m = medirQuadroDaCapa(data, W, H, C, { x: 33, y: 10, raioPx: 4 });
    expect(m.estrelas).toBe(3);
    expect(m.luz).toBeGreaterThan(8);
  });
});
