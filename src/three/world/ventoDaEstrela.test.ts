import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { NamedStar } from '../config';
import { estrelaComCorpo } from '../../lib/atlas/estrelaDoCatalogo';
import { estrelaVisitavelPorNome } from '../../lib/atlas/estrelasVisitaveis';
import {
  ANCORA_RIGEL,
  BRACOS_DO_VENTO,
  GRUMOS_DO_VENTO,
  NORMAL_DOS_BRACOS,
  PISO_DO_INSTRUMENTO,
  alfaDoGrumo,
  colunaDoVento,
  enrolamentoDosBracos,
  fatorNaImagem,
  joelhoDoPiso,
  modulacaoDoGrumo,
  momentoDaCelula,
  momentoDoGrumo,
  perfilDoBraco,
  tempoDeVoo,
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

describe('a imagem do gás: piso, grumos e braços', () => {
  it('o piso do instrumento: preto até 1 % do pico, sem degrau nem quina, e o vento de Rigel zera antes de 2,5 raios', () => {
    const f = 0.01;
    expect(joelhoDoPiso(0.5 * f, f)).toBe(0);
    expect(joelhoDoPiso(f, f)).toBe(0);
    // contínuo e de derivada contínua em 3f; acima, só desce 2f
    expect(joelhoDoPiso(3 * f - 1e-9, f)).toBeCloseTo(joelhoDoPiso(3 * f + 1e-9, f), 8);
    const d = (x: number) => (joelhoDoPiso(x + 1e-7, f) - joelhoDoPiso(x - 1e-7, f)) / 2e-7;
    expect(d(3 * f)).toBeCloseTo(1, 4);
    expect(d(f + 1e-6)).toBeLessThan(1e-3);
    expect(joelhoDoPiso(1, f)).toBeCloseTo(1 - 2 * f, 12);
    // o vento liso de Rigel: a coluna cai abaixo do piso entre 2 e 2,5 raios
    const g = gasDaEstrela(doCatalogo('Rigel'))!.vento!;
    const piso = PISO_DO_INSTRUMENTO * g.pico;
    expect(joelhoDoPiso(g.normal * colunaDoVento(2), piso)).toBeGreaterThan(0);
    expect(joelhoDoPiso(g.normal * colunaDoVento(2.5), piso)).toBe(0);
  });

  it('os grumos redistribuem: a modulação tem média 1 e ⟨m²⟩ = 1 + (f − 1)/N; o fator é o medido', () => {
    const G = GRUMOS_DO_VENTO;
    expect(G.fator).toBe(4);
    // o grumo na célula como o shader o desenha, na grade (centro deslocado pela folga, altura uniforme)
    const n = 40;
    let h1 = 0;
    let h2 = 0;
    const c = [G.folga, -G.folga, 0.5 * G.folga];
    for (let ia = 0; ia < 8; ia++) {
      const a = G.alturaMin + (1 - G.alturaMin) * ((ia + 0.5) / 8);
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
          for (let k = 0; k < n; k++) {
            const u = [(i + 0.5) / n - 0.5 - c[0], (j + 0.5) / n - 0.5 - c[1], (k + 0.5) / n - 0.5 - c[2]];
            const s = Math.max(0, 1 - (u[0] ** 2 + u[1] ** 2 + u[2] ** 2) / G.raio ** 2);
            const h = a * s ** G.perfil;
            h1 += h;
            h2 += h * h;
          }
    }
    const N = 8 * n ** 3;
    expect(h1 / N / momentoDaCelula(1)).toBeCloseTo(1, 2);
    expect(h2 / N / momentoDaCelula(2)).toBeCloseTo(1, 2);
    // a média e o segundo momento da modulação, pela célula e por uma volta da fase das contas
    const b = 1.5;
    let m1 = 0;
    let m2 = 0;
    const nq = 128;
    const hs = [
      [0, 1 - momentoDaCelula(1) ** 2 / momentoDaCelula(2)],
      [momentoDaCelula(2) / momentoDaCelula(1), momentoDaCelula(1) ** 2 / momentoDaCelula(2)],
    ] as const;
    for (let i = 0; i < nq; i++) {
      const q1 = (1 + Math.sin((2 * Math.PI * (i + 0.5)) / nq)) / 2;
      for (let j = 0; j < nq; j++) {
        const q2 = (1 + Math.sin((2 * Math.PI * (j + 0.5)) / nq)) / 2;
        for (const [h, peso] of hs) {
          const m = modulacaoDoGrumo(h, q1, q2, b);
          m1 += peso * m;
          m2 += peso * m * m;
        }
      }
    }
    expect(m1 / nq ** 2).toBeCloseTo(1, 6);
    expect(m2 / nq ** 2).toBeCloseTo(fatorNaImagem(b), 6);
    expect(fatorNaImagem(b) - 1).toBeCloseTo(3 / ((Math.PI * G.escala) / 2), 9);
    // o tempo de voo é contínuo no piso da velocidade e cresce como r + ln(r − 1) depois
    const rS = 1 / (1 - G.pisoDaVelocidade);
    expect(tempoDeVoo(rS - 1e-9)).toBeCloseTo(tempoDeVoo(rS + 1e-9), 6);
    expect(tempoDeVoo(3) - tempoDeVoo(2)).toBeCloseTo(1 + Math.log(2), 12);
    // fora de 3 raios, sem grumos: α = 0
    expect(alfaDoGrumo(fatorNaImagem(3))).toBe(0);
    expect(momentoDoGrumo(0)).toBeCloseTo(1, 12);
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
