// Serve: chão — o worker da carga que lança não deixa a tela de carregamento parada para sempre
// ============================================================
// O WORKER DA CARGA QUE LANÇA NÃO PRENDE O CARREGAMENTO (auditoria B,
// item 4). A exceção de um `onmessage` assíncrono não chega ao `onerror`
// da página: sem o erro devolvido como mensagem, a carga esperava para
// sempre e a tela de carregamento não saía.
// ============================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DUST_MAP_SIZE } from '../cartography/dustMap';

// a cadeia do gerador lê a URL da página no escopo do módulo
vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window = { location: { search: '' } };
});
const assarCarga = vi.fn();
vi.mock('../world/cadeiaDaCarga', () => ({ assarCarga: (...a: unknown[]) => assarCarga(...a) }));
vi.mock('../world/galaxy', () => ({ Galaxy: class {} }));

import { montarCarga } from './carregamento';

class WorkerFalso {
  static ultimo: WorkerFalso | null = null;
  terminado = false;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    WorkerFalso.ultimo = this;
  }
  postMessage() {
    // a cadeia lança lá dentro: o worker devolve o erro
    queueMicrotask(() => this.onmessage?.({ data: { erro: 'TypeError: import falhou' } }));
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

describe('montarCarga: o worker que devolve erro', () => {
  it('é encerrado e a carga segue pela reserva na thread', async () => {
    const mapa = () => new Uint8Array(DUST_MAP_SIZE * DUST_MAP_SIZE * 4);
    assarCarga.mockResolvedValue({
      poeira: mapa(),
      estrutura: mapa(),
      coberturaDaPoeira: 1,
      coberturaDeGas: 2,
      coberturaDeJovens: 3,
    });
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const carga = await montarCarga({
      catalogos: null,
      tier: 'performance',
      galaxia: 'classica',
      sorteios: null,
      aoAvancar: () => {},
    });
    expect(aviso).toHaveBeenCalledOnce();
    aviso.mockRestore();
    expect(WorkerFalso.ultimo!.terminado).toBe(true);
    expect(assarCarga).toHaveBeenCalledOnce();
    expect(carga.coberturaDeJovens).toBe(3);
  });
});
