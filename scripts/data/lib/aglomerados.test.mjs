// Serve: lei — estrela membro de aglomerado com paralaxe ruim vai para a distância do aglomerado, e a de paralaxe boa fica onde mediu
// ============================================================
// Revisão do catálogo (13/11/2026). Os casos sintéticos cobram a regra;
// os da tabela real (`aglomerados.json`) cobram o que a pessoa vê: as nove
// das Plêiades deixam de ser uma fila de 105 a 142 pc, o Trapézio deixa
// de ter 60 pc de fundo, e as Híades — que já estavam certas — não mudam.
// ============================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  acharMembro,
  distanciaDoMembro,
  distanciaEDoAglomerado,
  indexarMembros,
} from './aglomerados.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const TABELA = JSON.parse(readFileSync(join(AQUI, '..', 'aglomerados.json'), 'utf8'));

// um aglomerado de brinquedo a 100 pc: ϖ médio 10 mas, σ ≈ 0,1 mas, maré 0,5 mas
const BRINQUEDO = {
  id: 'brinquedo',
  distanciaPc: 100,
  paralaxeMediaMas: 10,
  r50Pc: 1.1774,
  rtPc: 5,
  membros: [
    ['111', 1, 10.05, 0.01, 1.0],
    ['222', 2, 9.0, 0.4, 2.5],
    [null, 3, null, null, null],
    ['444', 4, 5.0, 0.02, 1.0],
  ],
};

describe('a regra, num aglomerado de brinquedo', () => {
  const indice = indexarMembros([BRINQUEDO]);

  it('acha o membro pelo Gaia ou pelo HIP, e não acha quem não é membro', () => {
    expect(acharMembro(indice, { gaia: '111', hip: null })?.paralaxe).toBe(10.05);
    expect(acharMembro(indice, { gaia: '', hip: 3 })?.aglomerado.id).toBe('brinquedo');
    expect(acharMembro(indice, { gaia: '999', hip: 99 })).toBeNull();
  });

  it('a mesma estrela em dois aglomerados é erro da tabela', () => {
    expect(() => indexarMembros([BRINQUEDO, { ...BRINQUEDO, id: 'outro' }])).toThrow(/membro de/);
  });

  it('paralaxe boa fica onde mediu; paralaxe ruim vai para o aglomerado', () => {
    const boa = distanciaDoMembro(acharMembro(indice, { gaia: '111' }), 1000 / 10.05);
    expect(boa.regra).toBe('mistura');
    expect(boa.peso).toBeGreaterThan(0.95);
    expect(boa.distanciaPc).toBeCloseTo(1000 / 10.05, 0);
    expect(distanciaEDoAglomerado(boa)).toBe(false);

    const ruim = distanciaDoMembro(acharMembro(indice, { gaia: '222' }), 1000 / 9);
    expect(ruim.peso).toBeLessThan(0.05);
    expect(Math.abs(ruim.distanciaPc - 100)).toBeLessThan(0.5);
    expect(distanciaEDoAglomerado(ruim)).toBe(true);
  });

  it('sem paralaxe, a distância do aglomerado — declarada', () => {
    const r = distanciaDoMembro(acharMembro(indice, { hip: 3 }), 87);
    expect(r).toEqual({ distanciaPc: 100, regra: 'aglomerado', peso: 0 });
    expect(distanciaEDoAglomerado(r)).toBe(true);
  });

  it('paralaxe boa fora do raio de maré: a lista erra, a estrela fica onde está', () => {
    const r = distanciaDoMembro(acharMembro(indice, { gaia: '444' }), 200);
    expect(r).toEqual({ distanciaPc: 200, regra: 'fora', peso: 1 });
    expect(distanciaEDoAglomerado(r)).toBe(false);
  });
});

describe('a tabela real', () => {
  const indice = indexarMembros(TABELA.aglomerados);
  const porId = new Map(TABELA.aglomerados.map((a) => [a.id, a]));
  const distanciaPorHip = (hip) => {
    const membro = acharMembro(indice, { hip });
    expect(membro, `HIP ${hip}`).not.toBeNull();
    return distanciaDoMembro(membro, membro.paralaxe ? 1000 / membro.paralaxe : NaN);
  };

  it('toda fonte citada existe e todo aglomerado tem distância publicada', () => {
    for (const a of TABELA.aglomerados) {
      expect(a.distanciaPc, a.id).toBeGreaterThan(0);
      for (const sigla of a.fonte.split(' + ')) expect(TABELA.fontes[sigla], a.id).toBeTruthy();
    }
  });

  it('as nove das Plêiades saem de 105–142 pc para ±1,5 pc do aglomerado', () => {
    // Celaeno, Electra, Taygeta, Maia, Asterope, Merope, Alcyone, Atlas, Pleione
    const nove = [17489, 17499, 17531, 17573, 17579, 17608, 17702, 17847, 17851];
    const D = porId.get('pleiades').distanciaPc;
    for (const hip of nove) {
      const r = distanciaPorHip(hip);
      expect(r.regra, `HIP ${hip}`).not.toBe('fora');
      expect(Math.abs(r.distanciaPc - D), `HIP ${hip}`).toBeLessThan(1.5);
    }
    // Taygeta (paralaxe 9,54 ± 0,40, RUWE 2,3) era a pior: 105 pc
    expect(distanciaEDoAglomerado(distanciaPorHip(17531))).toBe(true);
  });

  it('o Trapézio inteiro na distância da Nebulosa de Órion', () => {
    const trapezio = porId.get('trapezio');
    for (const [gaia, hip] of trapezio.membros) {
      const r = distanciaDoMembro(acharMembro(indice, { gaia, hip }), 0);
      expect(r.distanciaPc).toBe(414);
      expect(distanciaEDoAglomerado(r)).toBe(true);
    }
  });

  it('as Híades, que já estavam certas, quase não mudam', () => {
    const hyades = porId.get('hyades');
    for (const membro of hyades.membros) {
      const [gaia, hip, paralaxe, erro, ruwe] = membro;
      if (!(ruwe < 1.4 && erro < 0.1)) continue;
      const r = distanciaDoMembro(acharMembro(indice, { gaia, hip }), 1000 / paralaxe);
      expect(Math.abs(r.distanciaPc - 1000 / paralaxe), gaia).toBeLessThan(0.5);
    }
  });
});
