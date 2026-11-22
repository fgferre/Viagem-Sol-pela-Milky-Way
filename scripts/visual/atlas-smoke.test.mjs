// Serve: chão — as provas do smoke do Atlas que comparam fotos pelo teto de ruído (a 12 e os pares de 1, 15b e 18) reprovam o que devem, sem subir Chrome
// Os vereditos PUROS da prova 12 e dos pares de fotos (destravar, 22/11/2026).
// O juiz inteiro dirige o Chrome e não roda aqui; o que decide a prova roda,
// com o CONTROLE NEGATIVO de cada cobrança, no molde de `memoria.test.mjs`.
import { describe, it, expect } from 'vitest';
import { julgarPar, julgarTrocaDaCamada } from './atlas-smoke.mjs';

// a foto do juiz na janela 1200×900 (medida na corrida de 22/11)
const total = 944756;
// `acima`: os px que passam de 1/255 (≤ `diferentes`); nas diferenças de verdade abaixo, todos
const m = (diferentes, maior = 1, acima = 0) => ({ diferentes, maior, acima });
const zero = m(0, 0);
const MORTA = 'no modo partículas as lâminas do disco não acendem';
const julgar = (o) => julgarTrocaDaCamada({ flag: 'nogdust', vista: 't=60', total, ...o });

describe('a prova 12: a troca viva dá a imagem do boot, e a camada desenha', () => {
  it('passa com o pisca de 1/255 dentro do teto e a camada mudando 239.331 px (nogdust em t=60, medido)', () => {
    const v = julgar({ ruido: m(16), bootVivo: m(9), limpoVivo: m(239331, 191, 239331) });
    expect(v.provas.map((p) => p.ok)).toEqual([true, true]);
    expect(v.declaracao).toBe(null);
  });

  it('CONTROLE NEGATIVO: a camada que muda a vista fora do teto, mas não 10× acima dele, reprova', () => {
    expect(julgar({ ruido: zero, bootVivo: zero, limpoVivo: m(1, 2, 1) }).provas[1].ok).toBe(false);
    expect(julgar({ ruido: zero, bootVivo: zero, limpoVivo: m(2000, 40, 2000) }).provas[1].ok).toBe(false);
  });

  it('CONTROLE NEGATIVO: a troca viva diferente do boot reprova', () => {
    const v = julgar({ ruido: zero, bootVivo: m(5, 3), limpoVivo: m(239331, 191) });
    expect(v.provas[0].ok).toBe(false);
  });

  it('CONTROLE NEGATIVO: a camada que não muda a vista reprova — senão o boot = vivo passa de graça', () => {
    const v = julgar({ ruido: zero, bootVivo: zero, limpoVivo: m(2) });
    expect(v.provas[1].ok).toBe(false);
    expect(v.provas[1].texto).toContain('REALMENTE muda');
  });

  it('CONTROLE NEGATIVO: o par do mesmo estado acima do teto reprova dizendo que a vista não é determinística', () => {
    const v = julgar({ ruido: m(400, 1), bootVivo: zero, limpoVivo: m(239331, 191) });
    expect(v.provas).toHaveLength(1);
    expect(v.provas[0].ok).toBe(false);
    expect(v.provas[0].texto).toContain('a vista não é determinística');
  });

  it('a camada sem desenho é DECLARADA com o número medido, e não reprova', () => {
    const v = julgarTrocaDaCamada({
      flag: 'nodisc', vista: 't=60', total, ruido: zero, bootVivo: m(1), limpoVivo: m(1), morta: MORTA,
    });
    expect(v.provas.map((p) => p.ok)).toEqual([true]);
    expect(v.declaracao).toContain('NÃO DESENHA NADA');
    expect(v.declaracao).toContain('1 px de 944756');
  });

  it('CONTROLE NEGATIVO: a camada declarada sem desenho que MUDA a vista reprova — a declaração caducou', () => {
    const v = julgarTrocaDaCamada({
      flag: 'nodisc', vista: 't=60', total, ruido: zero, bootVivo: zero, limpoVivo: m(5000, 40), morta: MORTA,
    });
    expect(v.declaracao).toBe(null);
    expect(v.provas[1].ok).toBe(false);
    expect(v.provas[1].texto).toContain('caducou');
  });
});

describe('os pares de fotos das provas 1, 3, 15b e 18, pelo teto de ruído', () => {
  const par = (sentido, d) => julgarPar({ rotulo: 'par', sentido, total, ...d });

  it('"igual": o pisca de 1/255 em 173 px (t=250, medido) passa; uma diferença de verdade reprova', () => {
    expect(par('igual', m(173)).ok).toBe(true);
    expect(par('igual', m(5, 3)).ok).toBe(false);
    expect(par('igual', m(400, 1)).ok).toBe(false);
  });

  it('CONTROLE NEGATIVO de "diferente": o pisca de 1/255 dentro do teto reprova; a diferença de verdade passa', () => {
    expect(par('diferente', m(173)).ok).toBe(false);
    expect(par('diferente', m(5000, 40, 5000)).ok).toBe(true);
  });

  it('CONTROLE NEGATIVO: 1 px a 2/255 não é diferente, nem 2.000 px a 40/255 (fora do teto, abaixo de 10× ele)', () => {
    expect(par('diferente', m(1, 2, 1)).ok).toBe(false);
    expect(par('diferente', m(2000, 40, 2000)).ok).toBe(false);
  });

  it('CONTROLE NEGATIVO: o par "igual" de duas fotos pretas e o "diferente" contra uma preta NÃO MEDEM', () => {
    const igual = par('igual', { ...zero, pretas: 2 });
    expect(igual.ok).toBe(false);
    expect(igual.texto).toContain('NÃO MEDE');
    const diferente = par('diferente', { ...m(944756, 90, 944756), pretas: 1 });
    expect(diferente.ok).toBe(false);
    expect(diferente.texto).toContain('NÃO MEDE');
  });
});

describe('a prova 12 com foto toda preta', () => {
  it('CONTROLE NEGATIVO: o ruído de duas fotos pretas NÃO MEDE, e nada mais se compara', () => {
    const v = julgar({ ruido: { ...zero, pretas: 2 }, bootVivo: zero, limpoVivo: m(239331, 191, 239331) });
    expect(v.provas).toHaveLength(1);
    expect(v.provas[0].ok).toBe(false);
    expect(v.provas[0].texto).toContain('NÃO MEDE');
    // a foto preta é da captura: chamá-la de vista não determinística acusaria o app
    expect(v.provas[0].texto).not.toContain('a vista não é determinística');
  });
});
