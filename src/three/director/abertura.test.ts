// Serve: chão — a abertura que pode ver a galáxia nasce com a camada WebGPU na carga, e a que não pode não
import { describe, expect, it } from 'vitest';
import type { NamedStar } from '../config';

// a cadeia do filme lê a URL da página no escopo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = { location: { search: '' } };
const { cenaDaAbertura } = await import('./abertura');
const { camadaWebgpuQuerida } = await import('../world/galaxy');

const nasce = (search: string) =>
  camadaWebgpuQuerida(
    cenaDaAbertura(search, (foco) =>
      foco === 'Sirius'
        ? { tipo: 'estrela', estrela: { n: 'Sirius', x: 2.6, y: 0, z: 0 } as NamedStar }
        : foco === 'saturn'
          ? { tipo: 'corpo', corpo: { id: 'saturn', nome: 'Saturno', classe: 'planeta', rUA: 9.5 } }
          : null
    )
  );

describe('a cena em que a visita abre, lida na carga (19/11/2026)', () => {
  it('a mesma precedência do useDirector: ?pos= > Atlas/?foco= > o filme em cena', () => {
    // a abertura padrão é o galáctico na intro, e o ?t= dele: nasce na carga
    expect(nasce('')).toBe(true);
    expect(nasce('?t=20')).toBe(true);
    // os filmes sem galáxia a revelar, na intro ou tocando: não nasce
    expect(nasce('?filme=solar')).toBe(false);
    expect(nasce('?filme=estelar&t=100&play=1')).toBe(false);
    // voo livre e Atlas: pela distância, e eles ganham do filme
    expect(nasce('?pos=0,0,3000&filme=solar')).toBe(true);
    expect(nasce('?pos=0,0,0.001&t=150')).toBe(false);
    expect(nasce('?atlas=1&t=150')).toBe(false);
    expect(nasce('?foco=Sirius')).toBe(true);
    expect(nasce('?atlas=1&foco=saturn')).toBe(false);
  });
});
