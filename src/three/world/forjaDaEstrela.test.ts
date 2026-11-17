import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RAIO_DO_SOL_NA_CENA } from '../escala';
import {
  celulaNaTelaEmRaios,
  celulaRealEmRaios,
  contrasteDaConveccao,
  desordemDaConveccao,
  fracaoEscura,
  larguraDaBordaEmMu,
  larguraDoAssado,
  pesoDaEscalaProfunda,
  picoDasCelulasQuentes,
  raioDaAtmosferaEmRaios,
  regraDaForja,
  ritmoDaFervura,
} from './forjaDaEstrela';
import {
  GANHO_DO_INSTRUMENTO,
  RELEVO_DAS_GIGANTES,
  SOL_PARAMS,
  calibracaoDaForja,
  cirurgiaDaEstrela,
  cirurgiaDoAssado,
  cirurgiaDoSmear,
  glslDoAssadoDaForja,
  cirurgiaDoRelevoDasGigantes,
  cirurgiasDaFotosfera,
  forjaDe,
  frenteDaAtmosfera,
  literalGlsl,
  pesoDoFiltro,
  tierDaEstrela,
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

  it('na tela, um piso contínuo: o grão do Sol fica em 1/30, as gigantes no tamanho real', () => {
    // (A⁴ + (1/30)⁴)^¼: no Sol o termo real é (30·A☉)⁴ ≈ 1,1e-5 → +2,9e-6
    const sol = celulaNaTelaEmRaios(celulaRealEmRaios(5772, 4.438, 1));
    expect(Math.abs(sol * 30 - 1)).toBeLessThan(3e-6);
    const arcturus = celulaRealEmRaios(4450, 1.89, 22.97);
    expect(celulaNaTelaEmRaios(arcturus) / arcturus).toBeGreaterThan(1.1);
    expect(celulaNaTelaEmRaios(arcturus) / arcturus).toBeLessThan(1.16);
    const aldebaran = celulaRealEmRaios(3900, 1.19, 45.1);
    expect(celulaNaTelaEmRaios(aldebaran) / aldebaran).toBeLessThan(1.03);
    expect(celulaNaTelaEmRaios(0.12) / 0.12).toBeLessThan(1.002);
    expect(celulaNaTelaEmRaios(0.05)).toBeLessThan(celulaNaTelaEmRaios(0.06));
    expect(celulaNaTelaEmRaios(0)).toBeCloseTo(1 / 30, 12);
  });

  it('a desordem segue o Mach de Ludwig & Kučinskas: 0 no Sol, 1 a log g 1, linear entre', () => {
    expect(desordemDaConveccao(4.438)).toBe(0);
    expect(desordemDaConveccao(4.8)).toBe(0);
    expect(desordemDaConveccao(1.0)).toBeCloseTo(1, 12);
    expect(desordemDaConveccao(-0.07)).toBe(1);
    // Mach 3,9 no meio do caminho
    expect(desordemDaConveccao((4.438 + 1) / 2)).toBeCloseTo(0.5, 12);
    expect(desordemDaConveccao(1.89)).toBeCloseTo((4.438 - 1.89) / 3.438, 12);
    expect(regraDaForja(3600, -0.07, 764).desordem).toBe(1);
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

  it('a textura alcança a fração escura da regra, até 0,34 (8.000 K)', () => {
    const quente = calibracaoDaForja(fracaoEscura(8000));
    // com a faixa fina, só as células quase chapadas descem a 0,34 — ainda
    // dentro da tabela medida, sem bater na ponta (1,2)
    expect(quente.k).toBeGreaterThan(0.9);
    expect(quente.k).toBeLessThan(1.2);
    // a 0,5 (as frias): o domo estreito, k perto de zero
    expect(calibracaoDaForja(0.5).k).toBeGreaterThanOrEqual(0);
    expect(calibracaoDaForja(0.5).k).toBeLessThan(0.1);
    // medida no assado: a desordem quase não muda a estatística
    expect(Math.abs(calibracaoDaForja(0.5, 1).s - calibracaoDaForja(0.5, 0).s)).toBeLessThan(0.005);
  });

  it('a fervura: o ritmo de hoje na célula do Sol, o das gigantes a partir de 0,1 R', () => {
    expect(ritmoDaFervura(celulaRealEmRaios(5772, 4.438, 1))).toBeCloseTo(1, 12);
    expect(ritmoDaFervura(0.12)).toBeCloseTo(1 / 6, 12);
    expect(ritmoDaFervura(0.01)).toBeLessThan(1);
  });

  it('a escala profunda: zero a log g ≥ 1, inteira a ≤ −0,3, Betelgeuse (−0,07) acima de 0,9', () => {
    expect(pesoDaEscalaProfunda(1.0)).toBe(0);
    expect(pesoDaEscalaProfunda(1.9)).toBe(0);
    expect(pesoDaEscalaProfunda(-0.3)).toBe(1);
    expect(pesoDaEscalaProfunda(-0.6)).toBe(1);
    expect(pesoDaEscalaProfunda(-0.07)).toBeGreaterThan(0.9);
    expect(pesoDaEscalaProfunda(-0.07)).toBeLessThan(1);
  });

  it('o assado: ~8 texels por célula na tela, potência de 2 entre 512 e 2048', () => {
    // Arcturus (célula na tela ~0,042 R): 8·2π/0,042 ≈ 1.197 → 1.024
    expect(larguraDoAssado(0.042)).toBe(1024);
    // as supergigantes (~0,12 R): 419 → o piso, 512
    expect(larguraDoAssado(0.12)).toBe(512);
    // o grão do Sol na tela (1/30): 1.508 → 2.048, o teto
    expect(larguraDoAssado(1 / 30)).toBe(2048);
    expect(larguraDoAssado(1e-4)).toBe(2048);
    for (const a of [0.01, 0.03, 0.05, 0.08, 0.2]) {
      const w = larguraDoAssado(a);
      expect(Math.log2(w) % 1).toBe(0);
    }
  });

  it('a célula quente da supergigante: 1,42× o brilho na banda H (Haubois 2009) → δ ≈ 0,15 a 3.600 K', () => {
    const d = picoDasCelulasQuentes(3600);
    expect(d).toBeGreaterThan(0.14);
    expect(d).toBeLessThan(0.16);
    // a conta de volta: B_H(T(1+δ))/B_H(T) = 0,085/0,06
    const x = 14388 / (1.65 * 3600);
    expect(Math.expm1(x) / Math.expm1(x / (1 + d))).toBeCloseTo(0.085 / 0.06, 6);
  });

  it('a borda macia: μ_w = √(2·Hp/R), Hp = A/10 — Betelgeuse ~0,15, Arcturus ~0,08', () => {
    expect(larguraDaBordaEmMu(0.12)).toBeCloseTo(Math.sqrt(0.024), 12);
    expect(regraDaForja(3600, -0.07, 764).bordaEmMu).toBeCloseTo(0.155, 2);
    const arcturus = regraDaForja(4450, 1.89, 25.4).bordaEmMu;
    expect(arcturus).toBeGreaterThan(0.07);
    expect(arcturus).toBeLessThan(0.1);
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

  it('a estrela quente (contraste zero, acima de ~9.300 K) fica com o desenho de hoje', () => {
    for (const teffK of [9600, 9940, 12100, 25000]) {
      expect(forjaDe({ ...bet, teffK, logG: 4.0 }, true)).toBeNull();
    }
    expect(forjaDe({ ...bet, teffK: 7650, logG: 4.16 }, true)).not.toBeNull();
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

  it('ligada: bake plano, a convecção dela no lugar das gigantes e da granulação viva, sem relevo', () => {
    const c = cirurgiasDaFotosfera(sunJs, sunJs, bet, forjaDe(bet, true))!;
    expect(c.relevo).toBe(0);
    expect(c.fragment).toContain('uMaxK*mix(0.39, 0.20, close))*0.000000;');
    expect(c.fragment.split('conveccaoDoAssado(st, sp, t)').length - 1).toBe(1);
    // o assado em duas leituras com a troca suave, sem a fervura por ruído
    expect(c.fragment).toContain('vec4 st = mix(texture2D(uChromoFarP, buv), texture2D(uChromoFar, buv), uBakeMix);');
    expect(c.fragment).not.toContain('texture2D(uChromoTex,');
    expect(c.fragment).toContain('  vec2 buv = vUvV;');
    // o instrumento do Sol: a temperatura entra no calor da rampa (cor e
    // brilho, o creme no topo), com o limbo do filtro; numa fria (peso 1)
    // sem a razão de Planck nem a borda do contínuo
    expect(c.fragment).toContain('  color *= mix(0.16, 1.42, smoothstep(0.04, 1.08, heat));');
    expect(c.fragment).toContain(`heat = clamp(heat + ${literalGlsl(GANHO_DO_INSTRUMENTO)}*(rForja - 1.0), 0.0, 1.24);`);
    expect(c.fragment).toContain('vec3(1.0, 0.86, 0.62), 0.550000 * smoothstep(0.72, 1.12, heat));');
    expect(c.fragment).toContain('  color.g *= 1.0 - edge*0.30;');
    expect(c.fragment).not.toContain('razaoDePlanck(');
    // numa quente o peso do filtro desce (`pesoDoFiltro`) e o contínuo de
    // Planck entra na mesma medida, sem corte
    const quente = { ...bet, teffK: 7650, logG: 4.16 };
    const w = pesoDoFiltro(7650);
    const q = cirurgiasDaFotosfera(sunJs, sunJs, quente, forjaDe(quente, true))!.fragment;
    expect(q).toContain(`heat = clamp(heat + ${literalGlsl(w * GANHO_DO_INSTRUMENTO)}*(rForja - 1.0)`);
    expect(q).toContain(`, rForja), vec3(1.0), ${literalGlsl(w)});`);
    expect(q).toContain(`, ${literalGlsl(1 - w)});`);
    expect(c.fragment).not.toContain('celulasGigantesNaTela(sp');
    expect(c.fragment).not.toContain('granulacaoViva(sp');
    // a borda macia, na largura da regra, até o piso da frente da casca
    const r = forjaDe(bet, true)!;
    expect(c.fragment).toContain(
      `color *= mix(${literalGlsl(frenteDaAtmosfera(r.atmosferaEmRaios))}, 1.0, smoothstep(0.0, max(${literalGlsl(r.bordaEmMu)}, `
    );
    // sem atmosfera estendida (anã quente), a borda vai a zero
    const ana = { ...bet, teffK: 7650, logG: 4.16 };
    expect(cirurgiasDaFotosfera(sunJs, sunJs, ana, forjaDe(ana, true))!.fragment).toContain('  color *= smoothstep(0.0, max(');
    // sem relevo nenhum: o vertex é o de antes
    expect(c.vertex).toBe(sunJs);
  });

  it('o assado da Forja: o main da cromosfera dá lugar ao da convecção, levada pelo escoamento', () => {
    const r = forjaDe(bet, true)!;
    const cromosfera = 'uniform float uTime;\nfloat ajuda(){ return 1.0; }\nvoid main(){\n  gl_FragColor = vec4(uGranFreq*1.45);\n}\n';
    const f = cirurgiaDoAssado(cromosfera, r);
    expect(f.startsWith('uniform float uTime;\nfloat ajuda(){ return 1.0; }\n')).toBe(true);
    expect(f).not.toContain('uGranFreq*1.45');
    expect(f.split('void main(){').length - 1).toBe(1);
    expect(f).toContain('escoamentoDaForja(sp)');
    expect(f).toContain('texture2D(uSimTex,');
    expect(cirurgiaDoSmear(cromosfera)).toContain('gl_FragColor = texture2D(uSrc, vUv);');
    expect(() => cirurgiaDoAssado('sem main', r)).toThrow();
  });

  it('a borda desce até a casca rente: inteira numa supergigante, 0,7·1,6·excesso/0,3 numa rasa', () => {
    expect(frenteDaAtmosfera(1.3)).toBe(1);
    expect(frenteDaAtmosfera(1.04)).toBeCloseTo(0.7 * 1.6 * (0.04 / 0.3), 12);
    expect(frenteDaAtmosfera(1)).toBe(0);
  });

  it('as células quentes enormes só entram no assado de quem tem a escala profunda', () => {
    const r = forjaDe(bet, true)!;
    const sup = glslDoAssadoDaForja(r);
    expect(sup).toContain('float quente = 0.0;');
    // o pico na unidade de z: δ_quente/δ, com δ = contraste/4
    expect(sup).toContain(literalGlsl((r.picoQuente / (r.contraste / 4)) * r.pesoProfundo));
    const gig = { ...bet, logG: 1.19, teffK: 3900 };
    expect(glslDoAssadoDaForja(forjaDe(gig, true)!)).not.toContain('quente');
  });

  it('o tier leva o assado da regra', () => {
    const r = forjaDe(bet, true)!;
    const tier = { fbm: 5, seg: 128, simW: 768, simH: 384, simStep: 1 / 22, prom: 6, chromo: 1024, granFreq: 30, lic7: true, loops: 12, larc: 7, lseg: 36, cstep: 22, cmestep: 16, cmen: 1024 };
    expect(tierDaEstrela(tier, bet, r).chromo).toBe(r.assado);
    expect(tierDaEstrela(tier, bet).chromo).toBe(256);
  });
});
