// Serve: chão — Esc com o menu "Filmes"/"Mais" aberto e o foco fora dele
// fecha o menu e NÃO sobe um degrau do Atlas por baixo (auditoria, item 11)
// ============================================================
// O runner é `node`, sem DOM: o `useEffect` roda na hora (mock do React)
// e a janela e o documento são de mentira — o ouvinte é o de verdade.
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react', () => ({ useEffect: (efeito: () => void) => efeito() }));

let ouvinte: ((e: KeyboardEvent) => void) | null = null;
let menuAberto = false;
Object.assign(globalThis, {
  window: {
    addEventListener: (_tipo: string, fn: (e: KeyboardEvent) => void) => (ouvinte = fn),
    removeEventListener: () => {},
  },
  document: {
    querySelector: (seletor: string) =>
      seletor.startsWith('#barra-mais-ferramentas') && menuAberto ? {} : null,
  },
});

const { useAtalhos } = await import('./useAtalhos');

const esc = () => {
  const evento = {
    key: 'Escape',
    code: 'Escape',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    defaultPrevented: false,
    target: null,
    preventDefault: () => (evento.defaultPrevented = true),
  };
  ouvinte?.(evento as unknown as KeyboardEvent);
  return evento;
};

describe('useAtalhos — o Esc com o menu dos filmes aberto', () => {
  const subirDegrau = vi.fn(() => true);
  const fecharMenu = vi.fn();
  beforeEach(() => {
    subirDegrau.mockClear();
    fecharMenu.mockClear();
    const director = { fase: 'atlas', subirDegrau };
    useAtalhos(
      { current: director } as never,
      () => {},
      () => {},
      fecharMenu
    );
  });

  it('menu aberto: fecha o menu e a escada fica onde está', () => {
    menuAberto = true;
    expect(esc().defaultPrevented).toBe(true);
    expect(fecharMenu).toHaveBeenCalledTimes(1);
    expect(subirDegrau).not.toHaveBeenCalled();
  });

  it('menu fechado: o Esc sobe o degrau, como sempre', () => {
    menuAberto = false;
    esc();
    expect(fecharMenu).not.toHaveBeenCalled();
    expect(subirDegrau).toHaveBeenCalledTimes(1);
  });
});
