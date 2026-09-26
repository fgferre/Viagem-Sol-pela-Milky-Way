// Serve: chão — o contador de ?fps=1 cria o <div> uma vez e o texto dele muda a cada meio segundo
// ============================================================
// A suíte roda em `environment: node` (vitest.config.ts) e `jsdom` não
// é dependência do projeto — sem `document` de verdade, este teste
// encena o mínimo dele em `globalThis`, mesma régua de `lib/idioma.test.ts`
// (`comStorage`/`semStorage` para `window`), e desfaz no fim.
// ============================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { montarContadorDeFps } from './contadorDeFps';

/** O <div> e o document mínimos que `montarContadorDeFps` precisa. */
function comDocumento() {
  const el = { style: {} as Record<string, string>, textContent: '' as string | null };
  const appendChild = vi.fn();
  (globalThis as { document?: unknown }).document = {
    createElement: vi.fn(() => el),
    body: { appendChild },
  };
  return { el, appendChild };
}

afterEach(() => {
  delete (globalThis as { document?: unknown }).document;
});

describe('montarContadorDeFps', () => {
  it('cria UM <div> e o anexa ao body, sem texto até o primeiro intervalo', () => {
    const { el, appendChild } = comDocumento();
    montarContadorDeFps();
    expect(appendChild).toHaveBeenCalledWith(el);
    expect(el.textContent).toBe('');
  });

  it('o texto só muda quando passam 500 ms, com fps e o bake mais recente', () => {
    const { el } = comDocumento();
    const atualizar = montarContadorDeFps();
    atualizar(0);
    atualizar(200);
    expect(el.textContent).toBe(''); // ainda dentro do primeiro intervalo
    atualizar(500, 16);
    expect(el.textContent).toBe('fps 6 · bake 16 ms');
    const textoDoPrimeiroIntervalo = el.textContent;
    atualizar(600);
    atualizar(1000, 8);
    expect(el.textContent).not.toBe(textoDoPrimeiroIntervalo);
    expect(el.textContent).toBe('fps 4 · bake 8 ms');
  });

  it('sem bake ainda, o texto não promete um número que não existe', () => {
    const { el } = comDocumento();
    const atualizar = montarContadorDeFps();
    atualizar(0);
    atualizar(500);
    expect(el.textContent).toBe('fps 4');
  });
});
