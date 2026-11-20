// Serve: chão — o realce confirma a escolha do visitante, não a troca de língua
// O runner é `node`, sem DOM: a decisão é pura (`passoDoRealce`).
import { describe, expect, it } from 'vitest';
import { passoDoRealce } from './useRealce';

describe('passoDoRealce', () => {
  const nasce = { valor: 'Terra', calado: 'pt', vezes: 0 };

  it('trocar de alvo conta; ficar no mesmo não', () => {
    expect(passoDoRealce(nasce, 'Marte', 'pt').vezes).toBe(1);
    expect(passoDoRealce(nasce, 'Terra', 'pt')).toBe(nasce);
  });

  it('o nome que muda JUNTO com a língua não conta, e o alvo seguinte volta a contar', () => {
    const emIngles = passoDoRealce(nasce, 'Earth', 'en');
    expect(emIngles).toEqual({ valor: 'Earth', calado: 'en', vezes: 0 });
    expect(passoDoRealce(emIngles, 'Mars', 'en').vezes).toBe(1);
  });
});
