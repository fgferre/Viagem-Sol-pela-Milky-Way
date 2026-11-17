import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { NamedStar } from '../config';
import { estrelaComCorpo } from '../../lib/atlas/estrelaDoCatalogo';
import { estrelaVisitavelPorNome } from '../../lib/atlas/estrelasVisitaveis';
import {
  ANCORA_RIGEL,
  GAMA_MAXIMO_DA_RECEITA,
  GANHO_DO_GAS,
  LIMIAR_DE_DESENHO,
  PERFIL_DO_VENTO,
  TEFF_DO_SALTO_K,
  TETO_DO_GAS,
  VENTOS_MEDIDOS,
  anoDoJd,
  emissividadeDoVento,
  faseDoDisco,
  fatorDeEddington,
  fracaoDesenhadaDoVento,
  fracaoDoVento,
  gasDaEstrela,
  velocidadeDeEscape,
  ventoDe,
  ventoPelaReceita,
} from './ventoDaEstrela';

const named = (
  JSON.parse(
    readFileSync(fileURLToPath(new URL('../../../public/data/stars_meta.json', import.meta.url)), 'utf8')
  ) as { named: NamedStar[] }
).named;
const doCatalogo = (nome: string) => estrelaComCorpo(nome, named)!;

describe('o vento das quentes — Vink, de Koter & Lamers 2001', () => {
  it('a receita confere com a conta de mão nos pontos de referência dela', () => {
    // lado quente, L = 1e5, M = 30, 40 kK: −6,697 − 1,226·log(2,6/2)
    const q = ventoPelaReceita(40000, 1e5, 30, 10)!;
    expect(Math.log10(q.mdotMsolAno)).toBeCloseTo(-6.697 - 1.226 * Math.log10(1.3), 6);
    expect(q.vInfKms / velocidadeDeEscape(1e5, 30, 10)).toBeCloseTo(2.6, 9);
    // lado frio, 20 kK: −6,688 − 1,601·log(1,3/2)
    const f = ventoPelaReceita(20000, 1e5, 30, 10)!;
    expect(Math.log10(f.mdotMsolAno)).toBeCloseTo(-6.688 - 1.601 * Math.log10(0.65), 6);
    // v_esc de mão: Γe = 2,6e-5·1e5/30 = 0,0867; √(2GM(1−Γe)/R) = 617,7·√(30·0,9133/10) km/s
    expect(velocidadeDeEscape(1e5, 30, 10)).toBeCloseTo(617.7 * Math.sqrt(3 * (1 - 2.6 / 30)), 0);
  });

  it('o salto de biestabilidade decide o lado entre 22,5 e 27,5 kK; fora da faixa, nada', () => {
    expect(TEFF_DO_SALTO_K).toBeCloseTo(25883, 0);
    const razao = (t: number) => ventoPelaReceita(t, 1e5, 30, 20)!.vInfKms / velocidadeDeEscape(1e5, 30, 20);
    expect(razao(26500)).toBeCloseTo(2.6, 9);
    expect(razao(25000)).toBeCloseTo(1.3, 9);
    expect(ventoPelaReceita(12400, 1e5, 30, 20)).toBeNull();
    expect(ventoPelaReceita(50001, 1e5, 30, 20)).toBeNull();
  });

  it('o medido vence a receita (Rigel e Deneb)', () => {
    expect(ventoDe('Rigel', 30000, 1e5, 30, 20)).toBe(VENTOS_MEDIDOS.Rigel);
    expect(VENTOS_MEDIDOS.Rigel.mdotMsolAno).toBe(8.5e-7);
    expect(ventoDe('Deneb', 8500, 46000, 20, 99)?.vInfKms).toBe(225);
  });

  it('o brilho é relativo a Rigel: na ficha dela vale G', () => {
    const rigel = doCatalogo('Rigel');
    expect(rigel.teffK.v).toBe(ANCORA_RIGEL.teffK);
    expect(Math.abs(rigel.raioRsol.v / ANCORA_RIGEL.raioRsol - 1)).toBeLessThan(0.005);
    expect(Math.abs(fracaoDoVento(VENTOS_MEDIDOS.Rigel, rigel.raioRsol.v, rigel.teffK.v) / GANHO_DO_GAS - 1)).toBeLessThan(0.02);
  });

  it('o limiar de desenho: Deneb e Naos ganham gás; Régulo, Sírius, Vega e o Sol nem o constroem', () => {
    expect(fracaoDesenhadaDoVento(doCatalogo('Deneb'))).toBeGreaterThan(LIMIAR_DE_DESENHO);
    expect(fracaoDesenhadaDoVento(doCatalogo('Naos'))).toBeGreaterThan(LIMIAR_DE_DESENHO);
    for (const nome of ['Regulus', 'Sirius', 'Vega', 'Altair', 'Betelgeuse', 'Fomalhaut', 'Spica']) {
      expect(gasDaEstrela(doCatalogo(nome))).toBeNull();
    }
    // Achernar tem a receita (B3, 15,5 kK), mas o vento fica abaixo do limiar: só o disco
    const ach = gasDaEstrela(estrelaVisitavelPorNome('Achernar')!)!;
    expect(ach.vento).toBeUndefined();
    expect(ach.disco?.raioExterno).toBe(2);
  });

  it('o gás tem teto: acima do vento de Rigel cresce com o logaritmo e nunca passa do fluxo do disco', () => {
    const rigel = VENTOS_MEDIDOS.Rigel!;
    const f = (k: number) => fracaoDoVento({ ...rigel, mdotMsolAno: rigel.mdotMsolAno * k }, ANCORA_RIGEL.raioRsol, ANCORA_RIGEL.teffK);
    // linear até a âncora (a medida de emissão vai com Ṁ²)...
    expect(f(0.5)).toBeCloseTo(GANHO_DO_GAS / 4, 12);
    expect(f(1)).toBeCloseTo(GANHO_DO_GAS, 12);
    // ...sem quina em x = 1, logarítmico depois, e com teto
    expect(f(1.001) - f(1)).toBeCloseTo(f(1) - f(0.999), 4);
    expect(f(2)).toBeCloseTo(GANHO_DO_GAS * (1 + Math.log(4)), 12);
    expect(f(1000)).toBe(TETO_DO_GAS);
    for (const n of named) {
      const e = estrelaComCorpo(n.n, named);
      if (e) expect(fracaoDesenhadaDoVento(e)).toBeLessThanOrEqual(TETO_DO_GAS);
    }
    // fora da grade da receita em Γe (0,041 a 0,434): sem vento, e nenhum NaN nem com Γe ≥ 1
    expect(fatorDeEddington(800000, 15)).toBeGreaterThan(1);
    expect(ventoPelaReceita(33300, 800000, 15, 27)).toBeNull();
    expect(velocidadeDeEscape(800000, 15, 27)).toBe(0);
    expect(ventoPelaReceita(33300, 800000, 60, 27)).not.toBeNull();
    expect(fatorDeEddington(800000, 60)).toBeLessThan(GAMA_MAXIMO_DA_RECEITA);
    for (const nome of ['τ CMa', 'Alnilam', 'α Cam']) expect(gasDaEstrela(doCatalogo(nome))).toBeNull();
    expect(gasDaEstrela(doCatalogo('Naos'))).not.toBeNull();
  });

  it('a emissividade é finita e cai para fora (sem NaN rente à borda)', () => {
    expect(Number.isFinite(emissividadeDoVento(1))).toBe(true);
    expect(emissividadeDoVento(0.5)).toBe(emissividadeDoVento(1));
    expect(emissividadeDoVento(1.5)).toBeLessThan(emissividadeDoVento(1.1));
    expect(emissividadeDoVento(PERFIL_DO_VENTO.fim)).toBe(0);
  });
});

describe('a época do disco de Achernar, pela lista medida', () => {
  const ep = estrelaVisitavelPorNome('Achernar')!.discoDeGas!.epocas.map((e) => [e.ano, e.fase] as const);
  it('sem disco antes de 2013; cheio em set/2014; segura o último estado depois de 2015', () => {
    expect(faseDoDisco(ep, 2005)).toBe(0);
    expect(faseDoDisco(ep, 2012)).toBe(0);
    expect(faseDoDisco(ep, 2013.86)).toBeCloseTo(0.5, 2);
    expect(faseDoDisco(ep, anoDoJd(2456921.5))).toBeCloseTo(1, 2); // 23/09/2014
    expect(faseDoDisco(ep, anoDoJd(2461041.5))).toBe(1); // jan/2026
    expect(faseDoDisco([], 2014)).toBe(0);
  });
});
