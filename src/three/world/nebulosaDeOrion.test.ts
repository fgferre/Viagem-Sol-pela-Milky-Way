import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { corDaLinhaDeEmissao } from '../luzDaCasa';
import { lugarDaTabela } from './lugaresDoCeu';
import {
  ARCMIN_PC,
  BARRA,
  BOLHA,
  CENTRO_DE_ORION,
  ESTRELA_NA_FRENTE_DA_MIF_PC,
  M43,
  REFERENCIAL_DE_ORION,
  alturaDaFrente,
  brilhoDaFrente,
  brilhoNaTela,
  corDaFrente,
  espessuraDaCamada,
  paraLocal,
  raioNaBolha,
  razaoOIII,
} from './nebulosaDeOrion';

const meta = JSON.parse(
  readFileSync(new URL('../../../public/data/stars_meta.json', import.meta.url), 'utf8')
) as { named: { n: string; x: number; y: number; z: number; s: string }[] };

describe('a nebulosa de Órion', () => {
  it('nasce em volta de θ¹ Ori C onde o catálogo o desenha, e o lugar da busca é o mesmo ponto', () => {
    const estrela = meta.named.find((s) => s.n === 'θ¹ Ori');
    expect(estrela?.s).toMatch(/^O6/);
    expect([estrela!.x, estrela!.y, estrela!.z]).toEqual(CENTRO_DE_ORION);
    const alvo = lugarDaTabela('nebulosa-de-orion')?.alvo;
    expect(alvo && 'pc' in alvo ? alvo.pc : null).toEqual(CENTRO_DE_ORION);
  });

  it('o referencial é ortonormal e o eixo z aponta para o Sol', () => {
    const { leste, norte, rumoAoSol } = REFERENCIAL_DE_ORION;
    const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    for (const [a, b] of [[leste, norte], [leste, rumoAoSol], [norte, rumoAoSol]]) expect(dot(a, b)).toBeCloseTo(0, 12);
    for (const v of [leste, norte, rumoAoSol]) expect(dot(v, v)).toBeCloseTo(1, 12);
    expect(paraLocal([0, 0, 0])[2]).toBeCloseTo(Math.hypot(...CENTRO_DE_ORION), 9);
  });

  it('a frente fica 0,2 pc atrás da estrela, sobe para o Sol e se abre para sudoeste', () => {
    const h = 1e-5;
    expect(alturaDaFrente(0, 0)).toBeCloseTo(-ESTRELA_NA_FRENTE_DA_MIF_PC, 9);
    expect(Math.abs(alturaDaFrente(h, 0) - alturaDaFrente(-h, 0)) / (2 * h)).toBeLessThan(1e-3);
    // a 1 pc, a parede a nordeste é mais alta que a de sudoeste: a
    // cavidade se abre por onde o gás quente escapa (Güdel 2008)
    const a = Math.SQRT1_2;
    expect(alturaDaFrente(a, a)).toBeGreaterThan(alturaDaFrente(-a, -a) + 0.08);
    expect(alturaDaFrente(-a, -a)).toBeGreaterThan(alturaDaFrente(0, 0));
  });

  it('a Barra é uma escarpa a 2′ a sudeste: sobe quase de lado ali e em nenhum outro rumo', () => {
    const se = (u: number) => alturaDaFrente(u * Math.SQRT1_2, -u * Math.SQRT1_2);
    const nw = (u: number) => alturaDaFrente(-u * Math.SQRT1_2, u * Math.SQRT1_2);
    const d = BARRA.distanciaPc;
    expect(d).toBeCloseTo(2 * ARCMIN_PC, 12);
    expect(se(d + 0.03) - se(d - 0.03)).toBeGreaterThan(0.15);
    expect(nw(d + 0.03) - nw(d - 0.03)).toBeLessThan(0.02);
  });

  it('a bolha do véu tem ~4 pc e a tampa dela cai sobre a estrela onde o véu é medido', () => {
    // Pabst et al. 2019: ~4 pc de diâmetro
    const [a, b] = BOLHA.semiEixos;
    expect(a + b).toBeGreaterThan(3.8);
    expect(a + b).toBeLessThan(5);
    // deslocada para sudoeste (Güdel 2008)
    expect(BOLHA.centro[0]).toBeLessThan(0);
    expect(BOLHA.centro[1]).toBeLessThan(0);
    // na linha da estrela, a casca neutra vai de ~0,4–0,6 pc a ~1,1–1,3 pc
    // na frente dela (van der Werf 2013; O'Dell et al. 2020)
    const zEm = (alvo: number) => {
      let lo = 0, hi = 3;
      for (let i = 0; i < 60; i++) {
        const m = (lo + hi) / 2;
        if (raioNaBolha([0, 0, m]) < alvo) lo = m; else hi = m;
      }
      return lo;
    };
    expect(zEm(BOLHA.cascaDe)).toBeGreaterThan(0.4);
    expect(zEm(BOLHA.cascaDe)).toBeLessThan(0.65);
    expect(zEm(1)).toBeGreaterThan(1.0);
    expect(zEm(1)).toBeLessThan(1.35);
  });

  it('a camada ionizada tem ~0,1 pc junto à estrela e engrossa para longe', () => {
    expect(2 * espessuraDaCamada(0.2)).toBeCloseTo(0.1, 9);
    expect(espessuraDaCamada(2)).toBeGreaterThan(2 * espessuraDaCamada(0.2));
  });

  it('a lei fixa do brilho na tela: 100× de fluxo viram 100^0,4 ≈ 6,3×', () => {
    expect(brilhoNaTela(brilhoDaFrente(0.2, 1)) / brilhoNaTela(brilhoDaFrente(2, 1))).toBeCloseTo(100 ** 0.4, 9);
  });

  it('a pele ionizada brilha com Q/(4πd²)·cos: D⁻² e cosseno, com piso no fundo da tigela', () => {
    expect(brilhoDaFrente(0.5, 1) / brilhoDaFrente(1, 1)).toBeCloseTo(4, 9);
    expect(brilhoDaFrente(1, 0.5) / brilhoDaFrente(1, 1)).toBeCloseTo(0.5, 9);
    expect(brilhoDaFrente(0.05, 1)).toBe(brilhoDaFrente(ESTRELA_NA_FRENTE_DA_MIF_PC, 1));
  });

  it('as cores vêm das linhas: Hα vermelho, [O III] verde-azulado e mais brilhante ao olho por energia', () => {
    const ha = corDaLinhaDeEmissao(656.3);
    const o3 = corDaLinhaDeEmissao(500.7);
    for (const c of [ha, o3]) for (const v of c) expect(v).toBeGreaterThanOrEqual(0);
    expect(ha[0]).toBeGreaterThan(5 * Math.max(ha[1], ha[2]));
    expect(o3[1]).toBeGreaterThan(o3[0]);
    const Y = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    expect(Y(o3)).toBeGreaterThan(3 * Y(ha));
    // perto da estrela o [O III] pesa mais: a frente é mais verde lá
    expect(razaoOIII(0.2)).toBeGreaterThan(razaoOIII(2));
    const verde = (c: number[]) => c[1] / c[0];
    expect(verde(corDaFrente(0.2))).toBeGreaterThan(verde(corDaFrente(2)));
  });

  it('M43 fica onde o céu a põe: ~3,8′ a leste e ~5,4′ ao norte da estrela', () => {
    expect(M43.x / ARCMIN_PC).toBeCloseTo(3.82, 1);
    expect(M43.y / ARCMIN_PC).toBeCloseTo(5.43, 1);
    expect(M43.raio).toBeCloseTo(2.25 * ARCMIN_PC, 12);
  });
});
