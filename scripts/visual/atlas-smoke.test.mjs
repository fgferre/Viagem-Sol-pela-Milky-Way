// Serve: chão — a prova 12 do smoke do Atlas (troca viva × boot das camadas da galáxia) reprova o que deve, sem subir Chrome
// O veredito PURO da prova 12 (destravar, 22/11/2026). O juiz inteiro dirige
// o Chrome e não roda aqui; o que decide a prova roda, com o CONTROLE
// NEGATIVO de cada cobrança, no molde de `memoria.test.mjs`.
import { describe, it, expect } from 'vitest';
import { julgarTrocaDaCamada } from './atlas-smoke.mjs';

// a foto do juiz na janela 1200×900 (medida na corrida de 22/11)
const total = 944756;
const m = (diferentes, maior = 1) => ({ diferentes, maior });
const zero = m(0, 0);
const MORTA = 'no modo partículas as lâminas do disco não acendem';
const julgar = (o) => julgarTrocaDaCamada({ flag: 'nogdust', vista: 't=60', total, ...o });

describe('a prova 12: a troca viva dá a imagem do boot, e a camada desenha', () => {
  it('passa com o pisca de 1/255 dentro do teto e a camada mudando 239.331 px (nogdust em t=60, medido)', () => {
    const v = julgar({ ruido: m(16), bootVivo: m(9), limpoVivo: m(239331, 191) });
    expect(v.provas.map((p) => p.ok)).toEqual([true, true]);
    expect(v.declaracao).toBe(null);
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
