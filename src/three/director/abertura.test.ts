// Serve: chão — o link que abre longe de casa nasce com a camada WebGPU na carga, e o que abre em casa não
import { describe, expect, it } from 'vitest';
import type { NamedStar } from '../config';

// a cadeia do filme lê a URL da página no escopo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = { location: { search: '' } };
const { distanciaDaAberturaPc } = await import('./abertura');
const { LIMIAR_SISTEMA_SOLAR_PC } = await import('../escala');

const longe = (search: string) =>
  distanciaDaAberturaPc(search, (foco) =>
    foco === 'Sirius'
      ? { tipo: 'estrela', estrela: { n: 'Sirius', x: 2.6, y: 0, z: 0 } as NamedStar }
      : foco === 'saturn'
        ? { tipo: 'corpo', corpo: { id: 'saturn', nome: 'Saturno', classe: 'planeta', rUA: 9.5 } }
        : null
  ) > LIMIAR_SISTEMA_SOLAR_PC;

describe('onde a visita abre, lido na carga (19/11/2026)', () => {
  it('a mesma precedência do useDirector: ?pos= > Atlas/?foco= > ?t= > a abertura do filme', () => {
    // a abertura padrão e o solar inteiro moram em casa
    expect(longe('')).toBe(false);
    expect(longe('?filme=solar&t=200')).toBe(false);
    // o galáctico lá fora (a vista de fora, t=150) e a câmera posta longe
    expect(longe('?t=150')).toBe(true);
    expect(longe('?t=150&play=1')).toBe(true);
    expect(longe('?pos=0,0,3000')).toBe(true);
    // ?pos= ganha de tudo; o Atlas ganha do instante
    expect(longe('?pos=0,0,0.001&t=150')).toBe(false);
    expect(longe('?atlas=1&t=150')).toBe(false);
    // ?foco=: a estrela longe, o corpo em casa
    expect(longe('?foco=Sirius')).toBe(true);
    expect(longe('?atlas=1&foco=saturn')).toBe(false);
  });
});
