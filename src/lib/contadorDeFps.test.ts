// Serve: chão — o contador de ?fps=1 cria o <div> uma vez, o texto muda a cada meio segundo e descartar() o remove
// ============================================================
// A suíte roda em `environment: node` (vitest.config.ts) e `jsdom` não
// é dependência do projeto — sem `document`/`window` de verdade, este
// teste encena o mínimo deles em `globalThis`, mesma régua de
// `lib/idioma.test.ts` (`comStorage`/`semStorage` para `window`), e
// desfaz no fim.
// ============================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { montarContadorDeFps } from './contadorDeFps';

/** O <div> mínimo que `montarContadorDeFps` precisa, com um `remove()`
 *  observável — é o que prova que `descartar` tira o mostrador da tela. */
function comDocumento() {
  let removido = false;
  const el = {
    style: {} as Record<string, string>,
    textContent: '' as string | null,
    remove: () => {
      removido = true;
    },
  };
  const appendChild = vi.fn();
  (globalThis as { document?: unknown }).document = {
    createElement: vi.fn(() => el),
    body: { appendChild },
  };
  return { el, appendChild, foiRemovido: () => removido };
}

/** `window.__poeira` mínimo — omitido, o contador mostra 0 ms nos dois
 *  campos (a mesma guarda de `Nebula.bake`: nunca um número inventado). */
function comPoeira(valores?: { bakeCpuMs?: number; quadroMaxMs?: number }) {
  (globalThis as { window?: unknown }).window = valores ? { __poeira: valores } : {};
}

afterEach(() => {
  delete (globalThis as { document?: unknown }).document;
  delete (globalThis as { window?: unknown }).window;
});

describe('montarContadorDeFps', () => {
  it('cria UM <div> e o anexa ao body, sem texto até o primeiro intervalo', () => {
    const { el, appendChild } = comDocumento();
    comPoeira();
    montarContadorDeFps();
    expect(appendChild).toHaveBeenCalledWith(el);
    expect(el.textContent).toBe('');
  });

  it('o texto só muda quando passam 500 ms, com fps e os dois custos de window.__poeira', () => {
    const { el } = comDocumento();
    comPoeira({ bakeCpuMs: 16, quadroMaxMs: 24 });
    const { atualizar } = montarContadorDeFps();
    atualizar(0);
    atualizar(200);
    expect(el.textContent).toBe(''); // ainda dentro do primeiro intervalo
    atualizar(500);
    expect(el.textContent).toBe('fps 6 · quadro máx 24 ms · bake(CPU) 16 ms');
    const textoDoPrimeiroIntervalo = el.textContent;
    comPoeira({ bakeCpuMs: 8, quadroMaxMs: 12 });
    atualizar(600);
    atualizar(1000);
    expect(el.textContent).not.toBe(textoDoPrimeiroIntervalo);
    expect(el.textContent).toBe('fps 4 · quadro máx 12 ms · bake(CPU) 8 ms');
  });

  it('sem window.__poeira ainda, o texto não inventa um número — 0 ms nos dois', () => {
    const { el } = comDocumento();
    comPoeira();
    const { atualizar } = montarContadorDeFps();
    atualizar(0);
    atualizar(500);
    expect(el.textContent).toBe('fps 4 · quadro máx 0 ms · bake(CPU) 0 ms');
  });

  it('descartar remove o <div> da tela', () => {
    const { foiRemovido } = comDocumento();
    comPoeira();
    const { descartar } = montarContadorDeFps();
    expect(foiRemovido()).toBe(false);
    descartar();
    expect(foiRemovido()).toBe(true);
  });
});
