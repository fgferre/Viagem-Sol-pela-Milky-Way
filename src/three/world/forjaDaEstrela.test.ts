import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RAIO_DO_SOL_NA_CENA } from '../escala';
import {
  celulaNaTelaEmRaios,
  celulaRealEmRaios,
  contrasteDaConveccao,
  fracaoEscura,
  raioDaAtmosferaEmRaios,
  regraDaForja,
  ritmoDaFervura,
} from './forjaDaEstrela';
import {
  RELEVO_DAS_GIGANTES,
  SOL_PARAMS,
  cirurgiaDaEstrela,
  cirurgiaDoRelevoDaForja,
  cirurgiaDoRelevoDasGigantes,
  cirurgiasDaFotosfera,
  forjaDe,
  pesoDoFiltro,
  type StellarParams,
} from './stellarBody';

describe('a Forja, botão GRAVIDADE — a regra', () => {
  it('a célula do Sol é a do ajuste de Trampedach: 1,35 Mm e ~2 milhões na face', () => {
    const a = celulaRealEmRaios(5772, 4.438, 1);
    expect(a * 695.7).toBeCloseTo(1.35, 1);
    expect(Math.abs((a * 695.7) / 1.35 - 1)).toBeLessThan(0.01);
    expect(Math.abs(8 / (a * a) / 2.1e6 - 1)).toBeLessThan(0.05);
  });

  it('a gigante de Ludwig & Kučinskas (3.660 K, log g 1): ~4,4 Gm', () => {
    const r = 300;
    expect(Math.abs((celulaRealEmRaios(3660, 1, r) * r * 695.7) / 4400 - 1)).toBeLessThan(0.05);
  });

  it('na tela, o grão do Sol é 1/30 e a curva encontra a célula real em 0,1, crescente', () => {
    expect(celulaNaTelaEmRaios(celulaRealEmRaios(5772, 4.438, 1))).toBeCloseTo(1 / 30, 12);
    expect(celulaNaTelaEmRaios(0.1 - 1e-9)).toBeCloseTo(0.1, 6);
    expect(celulaNaTelaEmRaios(0.05)).toBeLessThan(celulaNaTelaEmRaios(0.06));
  });

  it('o contraste das anãs reproduz os pontos medidos e é zero sem envelope', () => {
    const pontos = [
      [3689, 0.0217],
      [3905, 0.0355],
      [4368, 0.069],
      [4856, 0.0804],
      [5764, 0.157],
      [6893, 0.203],
      [8000, 0.127],
      [8500, 0.079],
    ] as const;
    for (const [t, c] of pontos) expect(contrasteDaConveccao(t, 4.6)).toBeCloseTo(c, 10);
    expect(contrasteDaConveccao(9500, 4.0)).toBe(0);
  });

  it('a atmosfera estendida: 1 na anã, 1,3 na supergigante fria, 1 a 5.000 K', () => {
    expect(raioDaAtmosferaEmRaios(3600, 4.6)).toBe(1);
    expect(raioDaAtmosferaEmRaios(3600, 0)).toBeCloseTo(1.3, 12);
    expect(raioDaAtmosferaEmRaios(3600, -0.5)).toBeCloseTo(1.3, 12);
    expect(raioDaAtmosferaEmRaios(5000, -0.5)).toBe(1);
  });

  it('a fração escura: 0,5 até o Sol, 0,34 a 8.000 K (Steffen 2005), linear entre', () => {
    expect(fracaoEscura(3600)).toBe(0.5);
    expect(fracaoEscura(8000)).toBeCloseTo(0.34, 12);
    expect(fracaoEscura((5772 + 8000) / 2)).toBeCloseTo(0.42, 12);
    expect(fracaoEscura(9500)).toBeCloseTo(0.34, 12);
  });

  it('a fervura: o ritmo de hoje na célula do Sol, o das gigantes a partir de 0,1 R', () => {
    expect(ritmoDaFervura(celulaRealEmRaios(5772, 4.438, 1))).toBeCloseTo(1, 12);
    expect(ritmoDaFervura(0.12)).toBeCloseTo(1 / 6, 12);
    expect(ritmoDaFervura(0.01)).toBeLessThan(1);
  });
});

describe('a Forja desligada não muda nada', () => {
  const sunJs = readFileSync(new URL('./sol/sun.js', import.meta.url), 'utf8');
  // uma supergigante sem dínamo com os campos do caminho aprovado de hoje
  const bet: StellarParams = {
    ...SOL_PARAMS,
    nome: 'teste',
    radiusPc: 764 * RAIO_DO_SOL_NA_CENA,
    teffK: 3600,
    dinamo: false,
    logG: -0.5,
    contrasteRelativoAoSol: 0.4,
    bordaU: 0.5,
    celulasGigantes: { tamanhoEmRaios: 0.6, contraste: 0.25 },
    bordaDifusaRaios: 1.3,
  };

  it('só vale com o interruptor, com log g e sem dínamo — nunca no Sol', () => {
    expect(forjaDe(bet, false)).toBeNull();
    expect(forjaDe(SOL_PARAMS, true)).toBeNull();
    expect(forjaDe({ ...bet, dinamo: true }, true)).toBeNull();
    expect(forjaDe(bet, true)).not.toBeNull();
  });

  it('o shader gerado sem a Forja é o texto do caminho de antes, cirurgia a cirurgia', () => {
    // o que `operarAFotosfera` montava antes da Forja, literal
    const antes = {
      contraste: 0.4,
      bordaU: 0.5,
      semDinamo: true,
      gravidade: false,
      avermelhamento: pesoDoFiltro(3600),
      gigantes: { tamanhoEmRaios: 0.6, contraste: 0.25 },
      teffK: 3600,
      continuo: 1 - pesoDoFiltro(3600),
    };
    expect(cirurgiasDaFotosfera(sunJs, sunJs, bet, forjaDe(bet, false))).toEqual({
      fragment: cirurgiaDaEstrela(sunJs, antes),
      vertex: cirurgiaDoRelevoDasGigantes(sunJs, 0.6, RELEVO_DAS_GIGANTES),
      relevo: 0.4,
    });
    // o Sol e uma estrela com dínamo, com o interruptor LIGADO: o mesmo de sem ele
    expect(cirurgiasDaFotosfera(sunJs, sunJs, SOL_PARAMS, forjaDe(SOL_PARAMS, true))).toBeNull();
    const comDinamo = { ...bet, dinamo: true };
    expect(cirurgiasDaFotosfera(sunJs, sunJs, comDinamo, forjaDe(comDinamo, true))).toEqual(
      cirurgiasDaFotosfera(sunJs, sunJs, comDinamo, null)
    );
  });

  it('ligada: bake plano, a convecção dela no lugar das gigantes e da granulação viva', () => {
    const c = cirurgiasDaFotosfera(sunJs, sunJs, bet, forjaDe(bet, true))!;
    expect(c.relevo).toBe(0);
    expect(c.fragment).toContain('uMaxK*mix(0.39, 0.20, close))*0.000000;');
    expect(c.fragment.split('conveccao(sp/').length - 1).toBe(1);
    expect(c.fragment).not.toContain('celulasGigantesNaTela(sp');
    expect(c.fragment).not.toContain('granulacaoViva(sp');
    expect(c.vertex).toContain('conveccaoGrande(normalize(position)');
    expect(c.vertex).not.toContain('celulaGigante(normalize(position)');
    // o vertex não pode ter derivadas de tela
    expect(cirurgiaDoRelevoDaForja('n * uDispScale + pmSum', regraDaForja(3600, -0.5, 764), 0.01)).not.toContain('fwidth');
  });
});
