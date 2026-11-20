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
const desenhos: { pedirWebgpu?: (() => unknown) | null }[] = [];
vi.mock('../world/galaxy', () => ({
  Galaxy: class {
    constructor(_c: unknown, _p: unknown, _e: unknown, desenho: (typeof desenhos)[number]) {
      desenhos.push(desenho);
    }
  },
}));
const criar = vi.fn(() => ({ pronta: new Promise(() => {}), atrasou: new Promise(() => {}) }));
vi.mock('../world/galaxiaWebgpu/camadaWebgpu', () => ({
  CamadaWebgpu: { criar: (...a: unknown[]) => criar(...(a as [])) },
  webgpuFalhouNestaPagina: () => false,
}));

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
      camadaQuerida: false,
      aoAvancar: () => {},
    });
    expect(aviso).toHaveBeenCalledOnce();
    aviso.mockRestore();
    expect(WorkerFalso.ultimo!.terminado).toBe(true);
    expect(assarCarga).toHaveBeenCalledOnce();
    expect(carga.coberturaDeJovens).toBe(3);
  });
});

describe('montarCarga: a camada WebGPU só quando querida (19/11/2026)', () => {
  it('na carga em que não é querida ela não nasce nem assa os sorteios extras; a galáxia a pede quando passar a ser', async () => {
    const mapa = () => new Uint8Array(DUST_MAP_SIZE * DUST_MAP_SIZE * 4);
    assarCarga.mockReset();
    assarCarga.mockResolvedValue({ poeira: mapa(), estrutura: mapa(), pacote: {} });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await montarCarga({
      catalogos: null,
      tier: 'performance',
      galaxia: 'webgpu',
      sorteios: 3,
      camadaQuerida: false,
      aoAvancar: () => {},
    });
    // só a principal
    expect(assarCarga).toHaveBeenCalledOnce();
    expect(criar).not.toHaveBeenCalled();
    // passou a ser querida: a principal outra vez (com as nuvens) e os dois sorteios extras
    desenhos.at(-1)!.pedirWebgpu!();
    await new Promise((r) => setTimeout(r, 0));
    expect(criar).toHaveBeenCalledOnce();
    expect(assarCarga).toHaveBeenCalledTimes(4);
    expect(assarCarga.mock.calls[1][0]).toMatchObject({ seed: assarCarga.mock.calls[0][0].seed, nuvens: true });
    vi.restoreAllMocks();
  });
});
