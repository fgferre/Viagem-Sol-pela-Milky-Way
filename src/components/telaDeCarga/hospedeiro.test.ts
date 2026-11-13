// ============================================================
// O WORKER DA CAPA MORRE COM ELA — o contrato de que o juiz de memória
// (`scripts/visual/memoria.mjs`, régua D) depende desde 13/11/2026: a tela
// de carga desenha num worker próprio, que vive enquanto a capa está na
// frente (além do sinal de assentar, de propósito) e some no máximo 1 s
// depois de ela desmontar. O juiz espera a capa sair e mais essa rede
// antes de contar workers; se a rede crescer, ele volta a contar a capa.
// ============================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./rodizio', () => ({ carregarCena: () => new Promise(() => {}) }));

import { montarTela } from './hospedeiro';

class WorkerFalso {
  static ultimo: WorkerFalso | null = null;
  mensagens: string[] = [];
  terminado = false;
  onmessage: unknown = null;
  onerror: unknown = null;
  constructor() {
    WorkerFalso.ultimo = this;
  }
  postMessage(m: { tipo: string }) {
    this.mensagens.push(m.tipo);
  }
  terminate() {
    this.terminado = true;
  }
}

const g = globalThis as Record<string, unknown>;
const NOMES = [
  'Worker',
  'OffscreenCanvas',
  'HTMLCanvasElement',
  'document',
  'window',
  'requestAnimationFrame',
  'cancelAnimationFrame',
];

beforeEach(() => {
  vi.useFakeTimers();
  const canvas = {
    className: '',
    remove: () => {},
    transferControlToOffscreen: () => ({}),
  };
  g.Worker = WorkerFalso;
  g.OffscreenCanvas = function OffscreenCanvas() {};
  g.HTMLCanvasElement = {
    prototype: { transferControlToOffscreen: () => ({}) },
  };
  g.document = { createElement: () => canvas };
  g.window = globalThis;
  g.requestAnimationFrame = () => 1;
  g.cancelAnimationFrame = () => {};
});

afterEach(() => {
  vi.useRealTimers();
  for (const n of NOMES) delete g[n];
});

describe('montarTela: o worker da capa', () => {
  it('soltar pede ao worker que feche e o termina no máximo 1 s depois', () => {
    const host = montarTela(
      { appendChild: () => {} } as unknown as HTMLElement,
      {
        id: 'nascer',
        foto: false,
        reduzido: false,
        largura: 800,
        altura: 600,
        dpr: 1,
        aoQuadro: () => {},
        aoPronto: () => {},
        refazerRotulos: () => {},
        aoAcabar: () => {},
      },
    );
    const w = WorkerFalso.ultimo!;
    expect(w.mensagens).toContain('iniciar');
    host.soltar();
    expect(w.mensagens).toContain('soltar');
    vi.advanceTimersByTime(1000);
    expect(w.terminado).toBe(true);
  });
});
