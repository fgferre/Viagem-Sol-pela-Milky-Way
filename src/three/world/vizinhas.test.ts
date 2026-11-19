// Serve: chão — o trabalhador das vizinhas que lança não deixa o carregamento parado para sempre
// ============================================================
// O TRABALHADOR DAS VIZINHAS QUE LANÇA NÃO PRENDE O CARREGAMENTO
// (auditoria B, item 4): o erro volta como mensagem, e o sorteio segue
// pela mesma reserva na thread que o `onerror` usa.
// ============================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./geradorDasVizinhas', () => ({ gerarVizinhas: (escala: number) => [{ escala }] }));

import { sortearVizinhas } from './vizinhas';

class WorkerFalso {
  static ultimo: WorkerFalso | null = null;
  terminado = false;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    WorkerFalso.ultimo = this;
  }
  postMessage() {
    queueMicrotask(() => this.onmessage?.({ data: { erro: 'RangeError: sem memória' } }));
  }
  terminate() {
    this.terminado = true;
  }
}

const g = globalThis as Record<string, unknown>;
beforeEach(() => {
  g.Worker = WorkerFalso;
});
afterEach(() => {
  delete g.Worker;
});

describe('sortearVizinhas: o trabalhador que devolve erro', () => {
  it('é encerrado e o sorteio sai pela reserva na thread', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const vizinhas = await sortearVizinhas(2);
    expect(aviso).toHaveBeenCalledOnce();
    aviso.mockRestore();
    expect(WorkerFalso.ultimo!.terminado).toBe(true);
    expect(vizinhas).toEqual([{ escala: 2 }]);
  });
});
