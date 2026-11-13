// Serve: dono — o convite do Atlas só some por gesto feito depois que ele apareceu
import { describe, expect, it } from 'vitest';
import { conviteDoAtlasSome, type GestosDoAtlas } from './passosDoConvite';

const nada: GestosDoAtlas = { girou: false, foco: null, busca: false };

describe('o convite do Atlas some só por gesto feito DEPOIS dele', () => {
  it('a seleção que já existia (link com ?foco=) não o apaga', () => {
    const comSaturno = { ...nada, foco: 'saturn' };
    expect(conviteDoAtlasSome(comSaturno, comSaturno)).toBe(false);
  });

  it('escolher um astro depois que ele apareceu o apaga', () => {
    expect(conviteDoAtlasSome(nada, { ...nada, foco: 'mars' })).toBe(true);
  });

  it('"Rever o convite" com Saturno escolhido e já girado: fica até um gesto novo', () => {
    const antes = { girou: true, foco: 'saturn', busca: false };
    expect(conviteDoAtlasSome(antes, antes)).toBe(false);
    expect(conviteDoAtlasSome(antes, { ...antes, foco: 'jupiter' })).toBe(true);
    expect(conviteDoAtlasSome(antes, { ...antes, busca: true })).toBe(true);
  });
});
