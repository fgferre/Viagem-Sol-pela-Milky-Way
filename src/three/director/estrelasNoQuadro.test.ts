// Serve: lei — os parâmetros do motor do Sol pela física de cada estrela visitável, o eixo de Vega e a exposição da visita
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { EXPOENTE_DAS_QUENTES, EXPOENTE_DO_BRILHO_ASSISTIDO, eixoDeRotacao, ganhoDaVisita, parametrosDoMotor } from './estrelasNoQuadro';
import { ESTRELAS_VISITAVEIS, estrelaVisitavelPorNome } from '../../lib/atlas/estrelasVisitaveis';
import { radianciaVisivelDeCorpoNegro } from '../luzDaCasa';

describe('toda estrela visitável vira parâmetros do MESMO motor, sem nome', () => {
  it('cada uma tem raio, período e atividade finitos', () => {
    for (const e of ESTRELAS_VISITAVEIS) {
      const p = parametrosDoMotor(e);
      expect(p.radiusPc).toBeGreaterThan(0);
      expect(Number.isFinite(p.rotPeriodDays) && p.rotPeriodDays > 0).toBe(true);
      expect(Number.isFinite(p.activityLevel)).toBe(true);
      expect(p.foraDaOrigem).toBe(true);
    }
  });
  it('Betelgeuse: sem dínamo, células gigantes e borda difusa dos dados; grânulos tênues', () => {
    const b = parametrosDoMotor(estrelaVisitavelPorNome('Betelgeuse')!);
    expect(b.dinamo).toBe(false);
    expect(b.celulasGigantes).toEqual({ tamanhoEmRaios: 0.6, contraste: 0.25 });
    expect(b.bordaDifusaRaios).toBe(1.3);
    expect(b.contrasteRelativoAoSol).toBeCloseTo((0.25 * 0.2) / 0.15, 12);
    expect(b.veu).toBeUndefined();
  });
  it('a quente leva o véu (a luz que a exposição não põe no disco) e o piso da granulação', () => {
    const s = parametrosDoMotor(estrelaVisitavelPorNome('Sirius')!);
    expect(s.veu).toBeCloseTo(1 - ganhoDaVisita(9845, 'assistida'), 12);
    expect(s.veu!).toBeGreaterThan(0.5);
    expect(s.contrasteRelativoAoSol).toBeCloseTo(0.04 / 0.15, 12);
    // mais fria que o Sol (51 Peg, 5.761 K): nenhum véu
    expect(parametrosDoMotor(estrelaVisitavelPorNome('Helvetios')!).veu).toBeUndefined();
  });
  it('as anãs não levam células gigantes nem borda difusa', () => {
    const p = parametrosDoMotor(estrelaVisitavelPorNome('Proxima Centauri')!);
    expect(p.celulasGigantes).toBeUndefined();
    expect(p.bordaDifusaRaios).toBeUndefined();
    expect(p.dinamo).toBe(true);
  });
});

describe('o eixo de Vega (Monnier 2012)', () => {
  it('fica a 6,2° da linha até o Sol', () => {
    const pos = new THREE.Vector3(0.9605, -5.9082, 4.8097);
    const eixo = eixoDeRotacao(estrelaVisitavelPorNome('Vega')!, pos, new THREE.Vector3());
    const paraOSol = pos.clone().normalize().negate();
    expect((eixo.angleTo(paraOSol) * 180) / Math.PI).toBeCloseTo(6.2, 9);
  });
});

describe('a exposição da visita: o nível do Sol × (radiância / a do Sol)^e', () => {
  it('no assistido a M sobe e a quente sobe a ⅖; no real nada muda', () => {
    const nivel = (nome: string) => {
      const e = estrelaVisitavelPorNome(nome)!;
      return radianciaVisivelDeCorpoNegro(e.teffK.v) * ganhoDaVisita(e.teffK.v, 'assistida');
    };
    expect(EXPOENTE_DO_BRILHO_ASSISTIDO).toBe(0.25);
    expect(nivel('Proxima Centauri')).toBeCloseTo(0.372, 2);
    expect(nivel('Betelgeuse')).toBeCloseTo(0.51, 2);
    // a quente sobe a ⅖: o ¼ passa a ⅖ junto com o filtro do Sol
    expect(nivel('Sirius')).toBeCloseTo(radianciaVisivelDeCorpoNegro(9845) ** EXPOENTE_DAS_QUENTES, 12);
    expect(EXPOENTE_DAS_QUENTES).toBe(0.4);
    expect(nivel('Proxima Centauri')).toBeLessThan(nivel('Betelgeuse'));
    expect(nivel('Betelgeuse')).toBeLessThan(1);
    expect(nivel('Sirius')).toBeGreaterThan(2);
    expect(ganhoDaVisita(5772, 'assistida')).toBe(1);
    expect(ganhoDaVisita(3054, 'real')).toBe(1);
  });
});
