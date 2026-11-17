import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { NamedStar } from '../config';
import { estrelaComCorpo } from '../../lib/atlas/estrelaDoCatalogo';
import { estrelaVisitavelPorNome } from '../../lib/atlas/estrelasVisitaveis';
import {
  ANCORA_RIGEL,
  BRACOS_DO_VENTO,
  NORMAL_DOS_BRACOS,
  PISO_DO_INSTRUMENTO,
  colunaDoVento,
  enrolamentoDosBracos,
  fimDaCauda,
  joelhoDoPiso,
  perfilDoBraco,
  raioDaLinhaDe,
  GAMA_MAXIMO_DA_RECEITA,
  GANHO_DO_GAS,
  LIMIAR_DE_DESENHO,
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
    expect(ach.disco?.raioExterno).toBe(1.7);
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

  it('a emissividade é finita e cai para fora (sem NaN rente à borda), e zera no fim da cauda', () => {
    const fim = fimDaCauda(1.5);
    expect(Number.isFinite(emissividadeDoVento(1, fim))).toBe(true);
    expect(emissividadeDoVento(0.5, fim)).toBe(emissividadeDoVento(1, fim));
    expect(emissividadeDoVento(1.3, fim)).toBeLessThan(emissividadeDoVento(1.1, fim));
    expect(emissividadeDoVento(fim, fim)).toBe(0);
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

describe('a imagem do gás: o halo curto, o piso e os braços', () => {
  it('o piso do instrumento: preto até 1 % do pico, sem degrau nem quina', () => {
    const f = 0.01;
    expect(joelhoDoPiso(0.5 * f, f)).toBe(0);
    expect(joelhoDoPiso(f, f)).toBe(0);
    // contínuo e de derivada contínua em 3f; acima, só desce 2f
    expect(joelhoDoPiso(3 * f - 1e-9, f)).toBeCloseTo(joelhoDoPiso(3 * f + 1e-9, f), 8);
    const d = (x: number) => (joelhoDoPiso(x + 1e-7, f) - joelhoDoPiso(x - 1e-7, f)) / 2e-7;
    expect(d(3 * f)).toBeCloseTo(1, 4);
    expect(d(f + 1e-6)).toBeLessThan(1e-3);
    expect(joelhoDoPiso(1, f)).toBeCloseTo(1 - 2 * f, 12);
  });

  it('o halo chega ao piso no raio da linha: 1,5 em Rigel e 1,75 em Deneb (medidos), 1,5 na receita (o de Rigel)', () => {
    expect(raioDaLinhaDe('Rigel')).toMatchObject({ v: 1.5, p: 'medido' });
    expect(raioDaLinhaDe('Deneb')).toMatchObject({ v: 1.75, p: 'medido' });
    expect(raioDaLinhaDe('Naos')).toMatchObject({ v: 1.5, p: 'derivado' });
    for (const [nome, raio] of [['Rigel', 1.5], ['Deneb', 1.75], ['Naos', 1.5]] as const) {
      const g = gasDaEstrela(doCatalogo(nome))!.vento!;
      const piso = PISO_DO_INSTRUMENTO * g.pico;
      expect(g.fim).toBe(fimDaCauda(raio));
      // aceso logo antes do raio, preto a partir dele, e a coluna desce lisa (sem degrau)
      expect(joelhoDoPiso(g.normal * colunaDoVento(raio - 0.05, g.fim), piso)).toBeGreaterThan(0);
      expect(joelhoDoPiso(g.normal * colunaDoVento(raio + 0.005, g.fim), piso)).toBe(0);
      let antes = Infinity;
      for (let b = 1; b <= raio; b += 0.01) {
        const c = colunaDoVento(b, g.fim, 1500);
        expect(c).toBeLessThan(antes);
        expect(antes === Infinity || c / antes > 0.85).toBe(true);
        antes = c;
      }
    }
  });

  it('os braços só com giro MEDIDO: Rigel (período artístico) não tem; a mesma ficha com giro medido tem', () => {
    const rigel = doCatalogo('Rigel');
    expect(gasDaEstrela(rigel)!.vento!.enrolamento).toBeUndefined();
    const medido = { ...rigel, rotacaoDias: { v: 40, p: 'medido' as const, fonte: 'teste' } };
    expect(gasDaEstrela(medido)!.vento!.enrolamento).toBeCloseTo(
      enrolamentoDosBracos(rigel.raioRsol.v, 40, VENTOS_MEDIDOS.Rigel.vInfKms),
      12
    );
    const derivado = { ...rigel, rotacaoDias: { v: 40, p: 'derivado' as const, fonte: 'teste' } };
    expect(gasDaEstrela(derivado)!.vento!.enrolamento).toBeUndefined();
  });

  it('os braços: contraste de densidade 2,6 (emissão 2,6² entre o centro do braço e o vão), luz total a da regra', () => {
    const c = BRACOS_DO_VENTO.contraste;
    expect(c).toBe(2.6);
    const em = (dPhi: number) => (1 + (c - 1) * perfilDoBraco(dPhi, 0)) ** 2;
    expect(em(0) / em(Math.PI / 2)).toBeCloseTo(c * c, 2);
    expect(em(Math.PI)).toBeCloseTo(em(0), 12);
    // a média da emissão na esfera × a normal = 1
    let s = 0;
    const n = 400;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) s += (1 + (c - 1) * perfilDoBraco((2 * Math.PI * (j + 0.5)) / n, -1 + (2 * (i + 0.5)) / n)) ** 2;
    expect((s / (n * n)) * NORMAL_DOS_BRACOS).toBeCloseTo(1, 3);
    // o enrolamento é v_eq/v∞: 1 R☉ em 1 dia a 50,6 km/s dá 1 rad por raio
    expect(enrolamentoDosBracos(1, 1, (2 * Math.PI * 695700) / 86400)).toBeCloseTo(1, 9);
    expect(enrolamentoDosBracos(10, undefined, 300)).toBe(0);
  });
});
