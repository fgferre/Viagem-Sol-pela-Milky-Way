// "reduzir movimento" ligado NO MEIO de um véu em curso assenta o véu
// no MESMO quadro, como o ramo instantâneo de `atravessar` — o mesmo
// contrato das gavetas: a preferência que muda ao vivo vale no próximo
// tique, não só na partida.
import { describe, it, expect, vi } from 'vitest';
import { VeuDoAtlas } from './veu';

const montar = () => {
  const onVeu = vi.fn();
  const veu = new VeuDoAtlas({ onVeu, perturbar: vi.fn() });
  return { veu, onVeu };
};

describe('VeuDoAtlas: instantâneo assenta um véu em curso', () => {
  it('em curso, um tique instantâneo assenta em 0 e chama a ação pendente uma vez só', () => {
    const { veu, onVeu } = montar();
    const acao = vi.fn();

    veu.atravessar(false, acao);
    veu.tique(0.1, false);
    const [k] = onVeu.mock.calls.at(-1)!;
    expect(k).toBeGreaterThan(0);
    expect(k).toBeLessThan(1);
    expect(acao).not.toHaveBeenCalled();

    veu.tique(0.016, true);
    expect(onVeu).toHaveBeenLastCalledWith(0);
    expect(acao).toHaveBeenCalledTimes(1);
    expect(veu.emCurso).toBe(false);

    onVeu.mockClear();
    veu.tique(0.016, true);
    expect(onVeu).not.toHaveBeenCalled();
    expect(acao).toHaveBeenCalledTimes(1);
  });
});
