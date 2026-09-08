// Serve: lei — a reserva da ficha (Lote 3, PLAN-UI.md §6, item 225) soma
// sem mexer no que já existia
// ============================================================
// QUATRO PROMESSAS, e nenhuma mais: (a) sem `extra` (ou com os dois campos
// a 0) o resultado é BIT A BIT o de antes — é disso que as provas de
// `?foco` e os md5 do `atlas-smoke` dependem; (b) `extra.base` soma na
// BASE e `extra.direita` soma na DIREITA, nos dois ramos (mesa e
// telefone); (c) valor não finito ou negativo vira 0, nunca NaN nem
// recuo de câmera por lixo de medição; (d) a régua de abas (Lote 4½) é
// reserva PERMANENTE da direita na mesa — 56 px × `ui` sobre a largura
// — e não existe no telefone.
// ============================================================
import { describe, expect, it } from 'vitest';
import { retanguloUtilDoAtlas, LARGURA_DE_MESA_PX } from './retanguloDoAtlas';
import { LARGURA_DO_CELULAR_PX } from '../../lib/uiScale';

describe('retanguloUtilDoAtlas — a reserva da ficha (item 225)', () => {
  it('sem extra é BIT A BIT o de antes, na mesa e no telefone', () => {
    const mesaSemExtra = retanguloUtilDoAtlas(1, LARGURA_DE_MESA_PX);
    const mesaComExtraNulo = retanguloUtilDoAtlas(1, LARGURA_DE_MESA_PX, undefined);
    const mesaComZeros = retanguloUtilDoAtlas(1, LARGURA_DE_MESA_PX, { base: 0, direita: 0 });
    expect(mesaComExtraNulo).toEqual(mesaSemExtra);
    expect(mesaComZeros).toEqual(mesaSemExtra);

    const celularSemExtra = retanguloUtilDoAtlas(1, LARGURA_DO_CELULAR_PX);
    const celularComZeros = retanguloUtilDoAtlas(1, LARGURA_DO_CELULAR_PX, {
      base: 0,
      direita: 0,
    });
    expect(celularComZeros).toEqual(celularSemExtra);
  });

  it('com extra, soma direita e base — nos dois ramos', () => {
    const base = retanguloUtilDoAtlas(1, LARGURA_DE_MESA_PX);
    const comExtra = retanguloUtilDoAtlas(1, LARGURA_DE_MESA_PX, { base: 0.05, direita: 0.3 });
    expect(comExtra.direita).toBeCloseTo(base.direita + 0.3, 12);
    expect(comExtra.base).toBeCloseTo(base.base + 0.05, 12);
    // topo e esquerda são estranhos à ficha — nenhum dos dois se move
    expect(comExtra.topo).toBe(base.topo);
    expect(comExtra.esquerda).toBe(base.esquerda);

    const baseCelular = retanguloUtilDoAtlas(1, LARGURA_DO_CELULAR_PX);
    const celularComExtra = retanguloUtilDoAtlas(1, LARGURA_DO_CELULAR_PX, {
      base: 0.12,
      direita: 0.4,
    });
    expect(celularComExtra.direita).toBeCloseTo(baseCelular.direita + 0.4, 12);
    expect(celularComExtra.base).toBeCloseTo(baseCelular.base + 0.12, 12);
  });

  it('a régua de abas reserva 56 px × ui da direita na mesa, e nada no telefone', () => {
    // a mesma conta de `REGUA_LARGURA_PX` (retanguloDoAtlas.ts): 3,5rem
    // da `.atlas-regua` (04-atlas.css), sem folga — os dois leem 56
    expect(retanguloUtilDoAtlas(1, 1440).direita).toBeCloseTo(56 / 1440, 12);
    expect(retanguloUtilDoAtlas(1.4, 1440).direita).toBeCloseTo((56 * 1.4) / 1440, 12);
    // a fração ACOMPANHA a largura: a régua é px fixo, não vw
    expect(retanguloUtilDoAtlas(1, 1200).direita).toBeCloseTo(56 / 1200, 12);
    // no telefone a fileira de alças é o fichário — direita continua 0
    expect(retanguloUtilDoAtlas(1, LARGURA_DO_CELULAR_PX).direita).toBe(0);
  });

  it('valor não finito ou negativo em extra vira 0, não NaN', () => {
    const base = retanguloUtilDoAtlas(1, LARGURA_DE_MESA_PX);
    for (const lixo of [NaN, -0.2, -Infinity, Infinity]) {
      const comLixo = retanguloUtilDoAtlas(1, LARGURA_DE_MESA_PX, {
        base: lixo,
        direita: lixo,
      });
      expect(comLixo).toEqual(base);
    }
  });
});
