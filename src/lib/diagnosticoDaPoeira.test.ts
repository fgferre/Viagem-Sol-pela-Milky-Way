// Serve: chão — window.__poeira sempre nasce com os seis campos, sem apagar os que já existem
// ============================================================
// UM inicializador para `window.__poeira` (revisão independente v2,
// 27/09) — antes, `Nebula.bake` e `Director.tick` criavam o objeto cada
// um por conta própria, só com os campos que lhes interessavam. A ORDEM
// entre os dois decidia se o segundo a rodar herdava um objeto PARCIAL
// do primeiro e explodia ao empurrar num array ausente (a sequência
// exata está reproduzida em `nebula.test.ts`, bloco "window.__poeira").
// `environment: node` (vitest.config.ts): sem `window` de verdade, este
// arquivo encena o mínimo dele em `globalThis`, mesma régua de
// `lib/contadorDeFps.test.ts`, e desfaz no fim.
// ============================================================
import { afterEach, describe, expect, it } from 'vitest';
import { diagnosticoDaPoeira, estatisticasDeQuadro } from './diagnosticoDaPoeira';

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

const CAMPOS_PADRAO = {
  bakesMs: [] as number[],
  bakeCpuMs: 0,
  bakes: 0,
  quadroMaxMs: 0,
  quadroP95Ms: 0,
  quadroMaxDesdeMarcaMs: 0,
  quadros: 0,
};

describe('diagnosticoDaPoeira', () => {
  it('sem `window` (Node/testes): devolve um objeto local com os oito campos, sem lançar', () => {
    expect(() => diagnosticoDaPoeira()).not.toThrow();
    expect(diagnosticoDaPoeira()).toEqual({ ...CAMPOS_PADRAO, reiniciar: expect.any(Function) });
  });

  it('`window.__poeira` ausente: cria o objeto com os oito campos', () => {
    const janela: { __poeira?: unknown } = {};
    (globalThis as { window?: unknown }).window = janela;
    const d = diagnosticoDaPoeira();
    expect(d).toEqual({ ...CAMPOS_PADRAO, reiniciar: expect.any(Function) });
    // é o MESMO objeto que passa a morar em window.__poeira — os dois
    // escritores (Nebula.bake/Director.tick) mutam o que isto devolve.
    expect(janela.__poeira).toBe(d);
  });

  it('`window.__poeira` parcial (só `quadroMaxMs`, o caso que travava o bake): ganha os campos que faltam sem perder o que já tinha', () => {
    (globalThis as { window?: unknown }).window = { __poeira: { quadroMaxMs: 1 } };
    const d = diagnosticoDaPoeira();
    expect(d.quadroMaxMs).toBe(1); // preservado
    expect(d.bakesMs).toEqual([]); // ganho, sem lançar ao empurrar depois
    expect(d.bakeCpuMs).toBe(0);
    expect(d.bakes).toBe(0);
    expect(d.quadroP95Ms).toBe(0);
    expect(d.quadroMaxDesdeMarcaMs).toBe(0);
    expect(d.quadros).toBe(0);
    expect(d.reiniciar).toBeInstanceOf(Function);
  });

  it('duas chamadas devolvem o MESMO objeto — muta window.__poeira, nunca recria', () => {
    (globalThis as { window?: unknown }).window = {};
    const d1 = diagnosticoDaPoeira();
    d1.bakeCpuMs = 5;
    d1.bakesMs.push(5);
    const d2 = diagnosticoDaPoeira();
    expect(d2).toBe(d1);
    expect(d2.bakeCpuMs).toBe(5);
    expect(d2.bakesMs).toEqual([5]);
  });

  // ITEM C (revisão independente v2, 27/09): o console chama
  // `window.__poeira.reiniciar()` para medir só o próximo trecho de
  // voo — zera o máximo acumulado e os dois contadores, sem tocar no
  // resto (a janela recente, os custos do bake).
  it('reiniciar() zera quadroMaxDesdeMarcaMs, quadros e bakes, sem tocar no resto', () => {
    (globalThis as { window?: unknown }).window = {};
    const d = diagnosticoDaPoeira();
    d.quadroMaxDesdeMarcaMs = 42;
    d.quadros = 900;
    d.bakes = 7;
    d.quadroMaxMs = 12;
    d.bakeCpuMs = 3;

    d.reiniciar();

    expect(d.quadroMaxDesdeMarcaMs).toBe(0);
    expect(d.quadros).toBe(0);
    expect(d.bakes).toBe(0);
    // a janela recente e o custo do bake não são "contadores" — reiniciar
    // não é um segundo boot da sessão
    expect(d.quadroMaxMs).toBe(12);
    expect(d.bakeCpuMs).toBe(3);
  });

  it('reiniciar() também funciona no objeto local sem `window` (Node/testes)', () => {
    const d = diagnosticoDaPoeira();
    d.quadroMaxDesdeMarcaMs = 10;
    d.quadros = 5;
    d.bakes = 2;
    d.reiniciar();
    expect(d.quadroMaxDesdeMarcaMs).toBe(0);
    expect(d.quadros).toBe(0);
    expect(d.bakes).toBe(0);
  });
});

describe('estatisticasDeQuadro', () => {
  it('lista vazia (antes do primeiro intervalo medido): os dois zerados', () => {
    expect(estatisticasDeQuadro([])).toEqual({ maxMs: 0, p95Ms: 0 });
  });

  it('p95 e máximo de uma lista conhecida, fora de ordem', () => {
    // ordenada: [1,2,3,4,5] — máx = 5; p95 = índice floor(0,95×4)=3 → 4
    expect(estatisticasDeQuadro([5, 1, 4, 2, 3])).toEqual({ maxMs: 5, p95Ms: 4 });
  });
});
