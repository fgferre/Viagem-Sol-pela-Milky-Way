import { describe, expect, it } from 'vitest';
import { achatamentoDe, estrelaVisitavelPorNome, rotacaoDe } from '../../lib/atlas/estrelasVisitaveis';
import {
  LIMIAR_DO_ACHATAMENTO,
  TETO_DO_GIRO,
  W_NO_TETO,
  giroDe,
  giroSobreCritico,
  periodoDoGiroDias,
  razaoDosRaios,
  temperaturasDeELR,
  wDaRazaoDosRaios,
  wDaVelocidade,
  wDoPeriodo,
} from './giroDaEstrela';

/** a 2 %, a tolerância das contas de conferência */
const perto = (x: number, alvo: number) => expect(Math.abs(x / alvo - 1)).toBeLessThan(0.02);

describe('o giro da estrela — Roche + Espinosa Lara & Rieutord 2011', () => {
  it('as três rotadoras medidas: w, Te/Tp de ELR e Ω/Ω_c pela razão dos raios', () => {
    for (const [re, rp, w, razaoT, critico] of [
      [2.726, 2.418, 0.5047, 0.8922, 0.7746], // Vega (Monnier 2012)
      [2.029, 1.634, 0.6953, 0.8143, 0.9232], // Altair
      [4.21, 3.22, 0.7842, 0.7715, 0.9636], // Regulus
    ] as const) {
      const wm = wDaRazaoDosRaios(re / rp);
      perto(wm, w);
      const t = temperaturasDeELR(wm, re, 1);
      perto(t.equador / t.polo, razaoT);
      perto(giroSobreCritico(wm), critico);
    }
  });

  it('Capella Ab (P 8,5 d, 2,48 M☉, 8,83 R☉) sai ~2,6 % achatada; o Sol (25,4 d) fica redondo', () => {
    const ab = giroDe(wDoPeriodo(8.5, 2.4828, 8.83), 8.83, 78)!;
    perto(ab.raioEquatorialRsol / ab.raioPolarRsol - 1, 0.026);
    expect(ab.noTeto).toBe(false);
    const wSol = wDoPeriodo(25.38, 1, 1);
    expect(razaoDosRaios(wSol) - 1).toBeLessThan(2e-5);
    expect(giroDe(wSol, 1, 1)).toBeNull();
  });

  it('o limiar: logo abaixo de Re/Rp − 1 = 2e-4 é redonda, logo acima achata', () => {
    const wLimiar = Math.sqrt(2 * LIMIAR_DO_ACHATAMENTO);
    expect(giroDe(wLimiar * 0.999, 1, 1)).toBeNull();
    const g = giroDe(wLimiar * 1.001, 1, 1)!;
    expect(g.raioEquatorialRsol / g.raioPolarRsol - 1).toBeGreaterThan(LIMIAR_DO_ACHATAMENTO);
    // sem NaN logo acima do limiar, e o polo mais quente que o equador
    expect(Number.isFinite(g.betaGravidade)).toBe(true);
    expect(g.teffPoloK).toBeGreaterThan(g.teffEquadorK);
  });

  it('o teto: Ω/Ω_c ≤ 0,96, grampeado e marcado (Regulus passa; Vega não)', () => {
    perto(giroSobreCritico(W_NO_TETO), TETO_DO_GIRO);
    const regulus = giroDe(wDaRazaoDosRaios(4.21 / 3.22), 3.7, 350)!;
    expect(regulus.noTeto).toBe(true);
    expect(regulus.giroSobreCritico).toBeCloseTo(TETO_DO_GIRO, 10);
    expect(giroDe(wDaRazaoDosRaios(2.726 / 2.418), 2.6, 47)!.noTeto).toBe(false);
    // além da quebra (por período ou velocidade): grampeado, finito
    for (const w of [wDoPeriodo(0.01, 1, 1), wDaVelocidade(5000, 1, 1)]) {
      const g = giroDe(w, 1, 1)!;
      expect(g.noTeto).toBe(true);
      expect(Number.isFinite(g.teffEquadorK) && g.teffEquadorK > 0).toBe(true);
    }
  });

  it('período e v·sen i dão o MESMO giro para a mesma estrela (β Pic, 130 km/s)', () => {
    const w = wDaVelocidade(130, 1.789, 1.544);
    const p = periodoDoGiroDias(w, 1.789, 1.544);
    expect(wDoPeriodo(p, 1.789, 1.544)).toBeCloseTo(w, 9);
    // e o período é o de 2πRe/v
    const re = giroDe(w, 1.544, 9)!.raioEquatorialRsol * 6.957e5;
    perto(p, (2 * Math.PI * re) / 130 / 86400);
  });

  it('a regra na ficha (`achatamentoDe`): medido vale como está; v·sen i é o mínimo; sem giro dos dados, redonda', () => {
    const vega = estrelaVisitavelPorNome('Vega')!;
    expect(achatamentoDe(vega)).toBe(vega.achatamento);
    const bpic = achatamentoDe(estrelaVisitavelPorNome('β Pic')!)!;
    expect(bpic.limiteInferior).toBe(true);
    expect(bpic.inclinacaoGraus?.v).toBe(90);
    expect(bpic.raioEquatorialRsol.p).toBe('derivado');
    // o período de v·sen i é um limite superior, derivado
    expect(rotacaoDe(estrelaVisitavelPorNome('β Pic')!).p).toBe('derivado');
    // Proxima tem período medido, mas abaixo do limiar; Sirius e Fomalhaut
    // só têm a lei `rotacaoDe`, que nunca achata
    for (const nome of ['Proxima Centauri', 'Sirius', 'Fomalhaut']) {
      expect(achatamentoDe(estrelaVisitavelPorNome(nome)!)).toBeUndefined();
    }
  });

  it('a âncora é a Teff média da ficha: num giro lento polo e equador a cercam, feche ou não a luminosidade da ficha', () => {
    for (const nome of ['Betelgeuse', 'Aldebaran', 'Capella']) {
      const e = estrelaVisitavelPorNome(nome)!;
      const a = achatamentoDe(e)!;
      expect(a.teffPoloK.v).toBeGreaterThan(e.teffK.v);
      expect(a.teffEquadorK.v).toBeLessThan(e.teffK.v);
      expect(a.teffPoloK.v / a.teffEquadorK.v - 1).toBeLessThan(0.005);
    }
  });
});
