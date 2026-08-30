// Serve: chão — o veredito do pop na borda reprova queda de golpe, aprova saída suave e não finge medir o que não cruzou
// O juiz do ponto na borda, sem Chrome: curvas fabricadas com a
// resposta ao lado.
import { describe, expect, it } from 'vitest';
import { UA_POR_PC as UA_DA_FONTE } from '../../src/lib/unidades';
import {
  SOLEIRA_DO_POP,
  UA_POR_PC,
  caixaDaEstrela,
  julgarSaida,
  luzDaFaixa,
} from './ponto-na-borda.mjs';

describe('o UA redigitado é o da fonte', () => {
  it('bate com lib/unidades', () => {
    expect(UA_POR_PC).toBe(UA_DA_FONTE);
  });
});

describe('a caixa da estrela', () => {
  it('ndc y=0 cai no meio; ndc y=+1 no topo do PNG', () => {
    const meio = caixaDaEstrela(1128, 1080, 0);
    expect((meio.y0 + meio.y1) / 2).toBeCloseTo(540, 5);
    expect(meio.x1 - meio.x0).toBe(48);
    const topo = caixaDaEstrela(1128, 1080, 1);
    expect(topo.y0).toBe(0);
  });
});

describe('a luz da faixa', () => {
  it('média e pico saem do retângulo pedido, não do quadro inteiro', () => {
    const cinza = new Float32Array([
      0, 0, 9, 9,
      0, 0, 1, 3,
    ]);
    const { media, pico, n } = luzDaFaixa(cinza, 4, 2, { x0: 2, x1: 4, y0: 0, y1: 2 });
    expect(n).toBe(4);
    expect(pico).toBe(9);
    expect(media).toBe((9 + 9 + 1 + 3) / 4);
  });
});

describe('o veredito — pop reprova, saída suave aprova, e não medir também reprova', () => {
  it('uma queda de metade num passo é pop', () => {
    const curva = [
      { ndcX: 0.92, luz: 40 },
      { ndcX: 0.96, luz: 38 },
      { ndcX: 0.99, luz: 36 },
      { ndcX: 1.01, luz: 4 },
      { ndcX: 1.04, luz: 3 },
    ];
    const v = julgarSaida(curva);
    expect(v.pop).toBe(true);
    expect(v.aprovado).toBe(false);
    expect(v.maiorQueda).toBeGreaterThanOrEqual(SOLEIRA_DO_POP);
  });

  it('uma descida aos poucos atravessando a borda passa', () => {
    const curva = [
      { ndcX: 0.92, luz: 40 },
      { ndcX: 0.96, luz: 36 },
      { ndcX: 0.99, luz: 28 },
      { ndcX: 1.01, luz: 18 },
      { ndcX: 1.03, luz: 10 },
      { ndcX: 1.06, luz: 4 },
    ];
    const v = julgarSaida(curva);
    expect(v.pop).toBe(false);
    expect(v.aprovado).toBe(true);
    expect(v.luzFora / v.luzDentro).toBeGreaterThan(0.5);
  });

  it('sem cruzar a borda o juiz não finge que mediu', () => {
    const v = julgarSaida([
      { ndcX: 0.2, luz: 40 },
      { ndcX: 0.3, luz: 39 },
      { ndcX: 0.4, luz: 38 },
      { ndcX: 0.5, luz: 37 },
    ]);
    expect(v.aprovado).toBe(false);
    expect(v.motivo).toMatch(/não cruzou/);
  });

  it('faixa preta não é estrela na borda', () => {
    const v = julgarSaida([
      { ndcX: 0.92, luz: 1 },
      { ndcX: 0.96, luz: 1 },
      { ndcX: 1.01, luz: 0.5 },
      { ndcX: 1.04, luz: 0.4 },
    ]);
    expect(v.aprovado).toBe(false);
    expect(v.motivo).toMatch(/sem estrela/);
  });
});
