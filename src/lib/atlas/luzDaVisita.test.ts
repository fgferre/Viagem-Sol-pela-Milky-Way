// ============================================================
// A EXPOSIÇÃO DA VISITA (item 91) — os juízes da segunda lei de luz.
//
// O que este arquivo cobra, e por quê:
//
//  1. COBERTURA: os 38 corpos resolvidos têm distância de visita. Um
//     corpo esquecido não estoura — fica com a lei crua e some de novo,
//     em silêncio. Silêncio é o modo de falha que o item 91 veio matar.
//  2. AS TRÊS DECISÕES DO DONO, uma a uma: assistida ⇒ dia claro em
//     TODOS os visitados; real ⇒ E(d) bit a bit (a penumbra física de
//     verdade); e a compensação NÃO olha a câmera nem o relógio.
//  3. A CASA NÃO SE MEXE: Terra e Lua bit-idênticas ao que já estava na
//     tela, sob `Object.is`.
//  4. O RESÍDUO É FÍSICA: o produto não é 1 travado — um mundo no
//     periélio é mais claro que ele mesmo no afélio.
//  5. O NÚMERO QUE O SELO DIZ: `stopsDaVisita` bate com a definição
//     independente (log2 do ganho sobre a irradiância), corpo a corpo.
// ============================================================
import { describe, expect, it } from 'vitest';
import { ROCHOSOS } from '../../three/world/corpos/rochoso';
import { GIGANTES } from '../../three/world/corpos/gigante';
import { ANCORA_UA, ganhoFundido, irradianciaRelativa } from './luz';
import type { PoliticaDeLuz } from './luz';
import {
  COMPENSACAO_DA_VISITA,
  SEMIEIXO_DOS_PLANETAS_UA,
  compensacaoDaVisita,
  distanciaDaVisitaUA,
  ganhoDoGlobo,
  stopsDaVisita,
} from './luzDaVisita';

/** OS 38 RESOLVIDOS, derivados das listas vivas — nunca redigitados. */
const RESOLVIDOS: readonly string[] = [
  'earth',
  'moon',
  ...ROCHOSOS.map((r) => r.id),
  ...GIGANTES.map((g) => g.id),
];

/** A distância heliocêntrica VIVA plausível de cada família, para os
 *  testes que precisam de um `dUA` do tamanho certo. */
const dViva = (id: string) => distanciaDaVisitaUA(id)!;

describe('1. cobertura — nenhum dos 38 fica para trás', () => {
  it('são 38 corpos resolvidos, e é essa a lista que a lei tem de cobrir', () => {
    expect(RESOLVIDOS).toHaveLength(38);
    expect(new Set(RESOLVIDOS).size).toBe(38);
  });

  it.each(RESOLVIDOS)('%s tem distância de visita finita e positiva', (id) => {
    const d = distanciaDaVisitaUA(id);
    expect(d, `${id} sem distância de visita: voltaria ao carvão em silêncio`).not.toBeNull();
    expect(Number.isFinite(d!)).toBe(true);
    expect(d!).toBeGreaterThan(0);
    expect(COMPENSACAO_DA_VISITA[id]).toBeGreaterThan(0);
  });

  it('corpo desconhecido não estoura: cai na lei crua (compensação 1)', () => {
    expect(distanciaDaVisitaUA('betelgeuse')).toBeNull();
    expect(compensacaoDaVisita('betelgeuse', 'assistida')).toBe(1);
    expect(ganhoDoGlobo(9.5, 'betelgeuse', 'assistida')).toBe(ganhoFundido(9.5, 'assistida'));
  });

  it('as 20 luas herdam a distância do PAI — Titã expõe como Saturno', () => {
    for (const [lua, pai] of [
      ['titan', 'saturn'],
      ['enceladus', 'saturn'],
      ['europa', 'jupiter'],
      ['io', 'jupiter'],
      ['phobos', 'mars'],
      ['triton', 'neptune'],
      ['charon', 'pluto'],
      ['moon', 'earth'],
    ] as const) {
      expect(distanciaDaVisitaUA(lua), lua).toBe(distanciaDaVisitaUA(pai));
      expect(COMPENSACAO_DA_VISITA[lua], lua).toBe(COMPENSACAO_DA_VISITA[pai]);
    }
  });

  it('anões e asteroides usam o próprio semieixo, do dado que a casa já tinha', () => {
    expect(distanciaDaVisitaUA('eris')).toBeCloseTo(67.781, 3);
    expect(distanciaDaVisitaUA('quaoar')).toBeCloseTo(43.7, 3);
    expect(distanciaDaVisitaUA('vesta')).toBeCloseTo(2.361078966, 9);
    expect(distanciaDaVisitaUA('ceres')).toBeCloseTo(2.766360231, 9);
  });
});

describe('2. decisão 1 do dono — dia claro em TODOS os corpos visitados', () => {
  it.each(RESOLVIDOS)(
    '%s: à distância característica, o ganho assistido é ~1 (a exposição de foto)',
    (id) => {
      const g = ganhoDoGlobo(dViva(id), id, 'assistida');
      expect(g, `${id} saiu de 1 na própria distância`).toBeCloseTo(1, 12);
    }
  );

  it('Saturno sai do carvão: 0,207 vira ~1 — o fator ~4,8× que o dono vê', () => {
    const d = 9.5185438390236552; // a rUA do retrato 2026
    const antes = ganhoFundido(d, 'assistida');
    const depois = ganhoDoGlobo(d, 'saturn', 'assistida');
    expect(antes).toBeCloseTo(0.2065, 4);
    expect(depois).toBeCloseTo(1.0013, 4);
    expect(depois / antes).toBeCloseTo(4.848, 3);
  });

  it('e a visita DOMA quem está perto demais: Mercúrio cai de ~1,7 para ~0,9', () => {
    const d = 0.46254827132617393;
    expect(ganhoFundido(d, 'assistida')).toBeCloseTo(1.71550, 5);
    expect(ganhoDoGlobo(d, 'mercury', 'assistida')).toBeCloseTo(0.883, 3);
  });
});

describe('3. decisão 2 do dono — `real` conserva a penumbra FÍSICA', () => {
  it.each(RESOLVIDOS)('%s em `real` é E(d) BIT A BIT: a compensação é 1 exato', (id) => {
    const d = dViva(id);
    expect(compensacaoDaVisita(id, 'real')).toBe(1);
    expect(Object.is(ganhoDoGlobo(d, id, 'real'), irradianciaRelativa(d))).toBe(true);
  });

  it('em `real` Saturno é MUITO mais escuro que a Terra — a posição 1:1', () => {
    const saturno = ganhoDoGlobo(9.5185438390236552, 'saturn', 'real');
    const terra = ganhoDoGlobo(0.98332668220797514, 'earth', 'real');
    expect(saturno).toBeCloseTo(0.011037, 6);
    expect(terra / saturno).toBeGreaterThan(90);
  });

  it('em `assistida` a mesma dupla fica junta — é a foto, e o selo a declara', () => {
    const saturno = ganhoDoGlobo(9.5185438390236552, 'saturn', 'assistida');
    const terra = ganhoDoGlobo(0.98332668220797514, 'earth', 'assistida');
    expect(Math.abs(Math.log2(terra / saturno))).toBeLessThan(0.1);
  });
});

describe('4. a casa não se mexe — Terra e Lua bit a bit como antes do 91', () => {
  it('a distância da visita da Terra É a âncora da lei, e por isso a compensação é 1', () => {
    expect(SEMIEIXO_DOS_PLANETAS_UA.earth).toBe(ANCORA_UA);
    expect(compensacaoDaVisita('earth', 'assistida')).toBe(1);
    expect(compensacaoDaVisita('moon', 'assistida')).toBe(1);
  });

  it.each(['earth', 'moon'])(
    '%s: o ganho novo é o MESMO double do antigo, em toda a faixa e nas duas políticas',
    (id) => {
      for (const d of [0.9832, 0.98332668220797514, 1, 1.0167, Number.NaN]) {
        for (const politica of ['assistida', 'real'] as PoliticaDeLuz[]) {
          expect(
            Object.is(ganhoDoGlobo(d, id, politica), ganhoFundido(d, politica)),
            `${id} d=${d} ${politica}`
          ).toBe(true);
        }
      }
    }
  );
});

describe('5. NÃO é auto-exposição — a lei não olha o quadro', () => {
  it('a compensação é a MESMA em qualquer instante da órbita e de qualquer câmera', () => {
    // a assinatura não tem câmera nem tempo: a única entrada é o corpo
    expect(compensacaoDaVisita.length).toBe(2);
    // e o valor é o da tabela assada na carga, não um cálculo por quadro
    for (const id of RESOLVIDOS) {
      expect(compensacaoDaVisita(id, 'assistida')).toBe(COMPENSACAO_DA_VISITA[id]);
    }
  });

  it('O RESÍDUO É FÍSICA: o mesmo mundo mais perto do Sol fica mais claro', () => {
    // Éris hoje anda perto do afélio (~95 UA contra semieixo 67,8): o
    // globo dela sai ABAIXO do próprio 1, e isso é a distância a falar
    const noAfelio = ganhoDoGlobo(95, 'eris', 'assistida');
    const naMedia = ganhoDoGlobo(67.781, 'eris', 'assistida');
    const noPerielio = ganhoDoGlobo(38, 'eris', 'assistida');
    expect(noAfelio).toBeLessThan(naMedia);
    expect(naMedia).toBeLessThan(noPerielio);
    expect(noAfelio).toBeCloseTo(0.79, 2);
    // e continua ESTRITAMENTE crescente com a proximidade — a
    // monotonicidade da lei original sobrevive ao produto
    for (const id of RESOLVIDOS) {
      const d = dViva(id);
      expect(ganhoDoGlobo(d * 1.1, id, 'assistida')).toBeLessThan(
        ganhoDoGlobo(d, id, 'assistida')
      );
    }
  });

  it('distância não-finita devolve o neutro 1, como a lei sempre fez', () => {
    for (const politica of ['assistida', 'real'] as PoliticaDeLuz[]) {
      expect(ganhoDoGlobo(Number.NaN, 'saturn', politica)).toBe(1);
      expect(ganhoDoGlobo(Number.POSITIVE_INFINITY, 'titan', politica)).toBe(1);
    }
    expect(stopsDaVisita(Number.NaN, 'saturn', 'assistida')).toBeNull();
  });
});

describe('6. o que o selo declara — os passos de luz, corpo a corpo', () => {
  it('em `real` não há nada a declarar: 0 EXATO', () => {
    for (const id of RESOLVIDOS) {
      expect(stopsDaVisita(dViva(id), id, 'real')).toBe(0);
    }
  });

  it('bate com a definição independente: log2(ganho / E(d))', () => {
    for (const id of RESOLVIDOS) {
      const d = dViva(id);
      const esperado = Math.log2(
        ganhoDoGlobo(d, id, 'assistida') / irradianciaRelativa(d)
      );
      expect(stopsDaVisita(d, id, 'assistida')!, id).toBeCloseTo(esperado, 12);
    }
  });

  it('os números que o selo vai mostrar, um por um', () => {
    const stops = (id: string, d = dViva(id)) => stopsDaVisita(d, id, 'assistida')!;
    expect(stops('saturn', 9.5185438390236552)).toBeCloseTo(6.5, 1);
    expect(stops('titan', 9.5185438390236552)).toBeCloseTo(6.5, 1);
    expect(stops('jupiter', 5.2118928954384449)).toBeCloseTo(4.8, 1);
    expect(stops('neptune', 29.884744842988464)).toBeCloseTo(9.8, 1);
    expect(stops('eris', 95)).toBeCloseTo(12.8, 1);
    // e a âncora não gasta nada — a Terra sai em ~0
    expect(Math.abs(stops('earth', 0.98332668220797514))).toBeLessThan(0.05);
    // Mercúrio é NEGATIVO: a visita gasta luz para BAIXO
    expect(stops('mercury', 0.46254827132617393)).toBeCloseTo(-2.4, 1);
  });
});
