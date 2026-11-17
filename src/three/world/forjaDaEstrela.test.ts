import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RAIO_DO_SOL_NA_CENA } from '../escala';
import {
  BORDA_FORA_DO_DISCO,
  CORDA_SEM_MANCHA,
  brilhoDasCelulasNaRegiaoFria,
  direcaoNoCeu,
  celulaNaTelaEmRaios,
  celulaRealEmRaios,
  contrasteDaConveccao,
  contrasteNaTela,
  desordemDaConveccao,
  fracaoDoFluxoNaBanda,
  fracaoEscura,
  LAMBDA_DO_VISIVEL_UM,
  LARGURA_DA_MANCHA_MAIOR_EM_RAIOS,
  MANCHA_DE_HAUBOIS,
  razaoDePlanckNaBanda,
  larguraDaBordaEmMu,
  larguraDoAssado,
  pesoDaEscalaProfunda,
  pesoDasCelulasQuentes,
  picoDasCelulasQuentes,
  raioDaAtmosferaEmRaios,
  regraDaForja,
  ritmoDaFervura,
  TEFF_DA_SAIDA_DA_REDE_K,
  TEFF_SEM_CONVECCAO_K,
  pesoDaLisa,
  pesoDoPico,
} from './forjaDaEstrela';
import {
  GANHO_DO_INSTRUMENTO,
  PONTA_DAS_CELULAS_QUENTES,
  SOL_PARAMS,
  TIO_DA_FORJA,
  calibracaoDaForja,
  cirurgiaDaEstrela,
  cirurgiaDoAssado,
  cirurgiaDoSmear,
  glslDoAssadoDaForja,
  cirurgiasDaFotosfera,
  forjaDe,
  frenteDaAtmosfera,
  literalGlsl,
  pesoDoFiltro,
  pesoDoTiO,
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

  it('o piso na tela: Fomalhaut (8.590 K) sobe ao piso; Altair, as frias e o zero ficam como são', () => {
    expect(contrasteNaTela(contrasteDaConveccao(8590, 4.19), 8590)).toBe(0.14);
    const altair = contrasteDaConveccao(7700, 4.18);
    expect(contrasteNaTela(altair, 7700)).toBe(altair);
    expect(contrasteNaTela(contrasteDaConveccao(3900, 1.19), 3900)).toBe(contrasteDaConveccao(3900, 1.19));
    expect(contrasteNaTela(0, 9500)).toBe(0);
  });

  it('sem degrau: o piso sai por rampa de 8.700 K até a convecção sumir, e a regra do pico e a lisa entram de zero', () => {
    const naTela = (T: number) => contrasteNaTela(contrasteDaConveccao(T, 4.2), T);
    expect(naTela(8700)).toBe(0.14);
    // contínuo e nunca crescente até o zero em `TEFF_SEM_CONVECCAO_K`: nenhum salto de uma estrela à vizinha
    for (let T = 8700; T < TEFF_SEM_CONVECCAO_K + 20; T += 5) {
      expect(naTela(T + 5)).toBeLessThanOrEqual(naTela(T));
      expect(naTela(T) - naTela(T + 5)).toBeLessThan(0.004);
      expect(naTela(T)).toBeGreaterThanOrEqual(contrasteDaConveccao(T, 4.2));
    }
    expect(naTela(TEFF_SEM_CONVECCAO_K - 1)).toBeLessThan(0.001);
    expect(naTela(TEFF_SEM_CONVECCAO_K + 1)).toBe(0);
    // as duas rampas: 0 nas pontas de baixo, 1 de `TEFF_SEM_CONVECCAO_K` em diante, sem salto
    expect(pesoDoPico(8000)).toBe(0);
    expect(pesoDaLisa(8590)).toBe(0); // Fomalhaut guarda a rede inteira
    expect(pesoDaLisa(TEFF_DA_SAIDA_DA_REDE_K)).toBe(0);
    for (const f of [pesoDoPico, pesoDaLisa]) {
      expect(f(TEFF_SEM_CONVECCAO_K)).toBe(1);
      expect(f(30000)).toBe(1);
      for (let T = 7900; T < 9400; T += 5) expect(Math.abs(f(T + 5) - f(T))).toBeLessThan(0.02);
    }
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

  it('a mancha medida numa banda, por Planck: Antares (Ohnaka, 2,3 µm) e Montargès 2017 (1,65 µm) dão o mesmo no visível', () => {
    const v = (T: number, d: number) => razaoDePlanckNaBanda(T, d, LAMBDA_DO_VISIVEL_UM);
    // a conta escrita à mão, a 3.745 K
    const k3 = picoDasCelulasQuentes(3745, { razao: 1.03, lambdaUm: 2.3 });
    expect(k3).toBeCloseTo(0.0145, 3);
    expect(v(3745, k3)).toBeCloseTo(1.105, 2);
    const k4 = picoDasCelulasQuentes(3745, { razao: 1.04, lambdaUm: 2.3 });
    expect(k4).toBeCloseTo(0.0194, 3);
    expect(v(3745, k4)).toBeCloseTo(1.142, 2);
    const h3 = picoDasCelulasQuentes(3745, { razao: 1.03, lambdaUm: 1.65 });
    expect(h3).toBeCloseTo(0.0116, 3);
    expect(v(3745, h3)).toBeCloseTo(1.083, 2);
    // Betelgeuse pela de Haubois: a mesma conta de antes, bit a bit
    const bet = picoDasCelulasQuentes(3600, MANCHA_DE_HAUBOIS);
    expect(bet).toBe(picoDasCelulasQuentes(3600));
    expect(bet).toBeCloseTo(0.148, 3);
    expect(v(3600, bet)).toBeCloseTo(2.55, 1);
    // a de Antares (o meio do teto de Ohnaka) e a conferência de Montargès 2017: as duas entre 1,05× e 1,15×
    for (const d of [picoDasCelulasQuentes(3745, { razao: 1.035, lambdaUm: 2.3 }), h3]) {
      expect(v(3745, d)).toBeGreaterThan(1.05);
      expect(v(3745, d)).toBeLessThan(1.15);
    }
    // a guarda: razão ≤ 1 ou não finita dá δ = 0 (nunca NaN)
    for (const razao of [1, 0.9, 0, -1, NaN, Infinity]) {
      expect(picoDasCelulasQuentes(3600, { razao, lambdaUm: 2.3 })).toBe(0);
    }
    expect(picoDasCelulasQuentes(3600, { razao: 1.03, lambdaUm: 0 })).toBe(0);
  });

  it('a mancha MEDIDA entra inteira; a da regra, pelo peso da gravidade, sem degrau em log g 1', () => {
    // medida: peso 1 em qualquer log g; regra: o peso da escala profunda
    expect(pesoDasCelulasQuentes(regraDaForja(3745, 0.2, 680, MANCHA_DE_HAUBOIS))).toBe(1);
    expect(pesoDasCelulasQuentes(regraDaForja(3745, 0.2, 680))).toBeCloseTo(pesoDaEscalaProfunda(0.2), 12);
    // a regra a peso 1 e a medida igual à regra saem com o MESMO texto (só o peso as separa)
    const raio = 700;
    expect(glslDoAssadoDaForja(regraDaForja(3600, -0.5, raio))).toBe(glslDoAssadoDaForja(regraDaForja(3600, -0.5, raio, MANCHA_DE_HAUBOIS)));
    // logo abaixo de log g 1 as células quentes nascem quase sem nada: alisamento e pico ~0
    const r = regraDaForja(3900, 0.999, 60);
    expect(pesoDasCelulasQuentes(r)).toBeLessThan(1e-5);
    const txt = glslDoAssadoDaForja(r);
    const coef = /mix\(a\.x, [^,]+, ([^ ]+) \* quente\)/.exec(txt);
    expect(coef).not.toBeNull();
    expect(Math.abs(parseFloat(coef![1]))).toBeLessThan(1e-4);
    // e acima de log g 1 o bloco nem existe
    expect(glslDoAssadoDaForja(regraDaForja(3900, 1.01, 60))).not.toContain('float quente');
  });

  it('a maior célula quente, 1 R a meio brilho no pico de Haubois, leva parte do fluxo H dentro dos 3–19 % de Montargès 2016', () => {
    const f = fracaoDoFluxoNaBanda(LARGURA_DA_MANCHA_MAIOR_EM_RAIOS, MANCHA_DE_HAUBOIS.razao);
    expect(f).toBeGreaterThan(0.03);
    expect(f).toBeLessThan(0.19);
    // o valor: ~10 % (entre os pesos 0,08 e 0,13 da Tabela 3 de Montargès 2016)
    expect(f).toBeGreaterThan(0.09);
    expect(f).toBeLessThan(0.115);
    // as de hoje, no tamanho da de Haubois, levam menos que a média das épocas (8,75 %)
    expect(fracaoDoFluxoNaBanda(0.675, MANCHA_DE_HAUBOIS.razao)).toBeLessThan(0.0875);
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
  };

  it('só vale com log g e sem dínamo — nunca no Sol', () => {
    expect(forjaDe({ ...bet, logG: undefined })).toBeNull();
    expect(forjaDe(SOL_PARAMS)).toBeNull();
    expect(forjaDe({ ...bet, dinamo: true })).toBeNull();
    expect(forjaDe(bet)).not.toBeNull();
  });

  it('a estrela quente (contraste zero, acima de ~9.300 K) fica com o desenho de hoje', () => {
    for (const teffK of [9600, 9940, 12100, 25000]) {
      expect(forjaDe({ ...bet, teffK, logG: 4.0 })).toBeNull();
    }
    expect(forjaDe({ ...bet, teffK: 7650, logG: 4.16 })).not.toBeNull();
  });

  it('o shader gerado fora da Forja é o texto do caminho de antes, cirurgia a cirurgia', () => {
    const fria = { ...bet, teffK: 9600, logG: 4.0 };
    expect(forjaDe(fria)).toBeNull();
    const antes = {
      contraste: 0.4,
      bordaU: 0.5,
      semDinamo: true,
      gravidade: false,
      avermelhamento: pesoDoFiltro(9600),
      teffK: 9600,
      continuo: 1 - pesoDoFiltro(9600),
    };
    expect(cirurgiasDaFotosfera(sunJs, sunJs, fria, forjaDe(fria))).toEqual({
      fragment: cirurgiaDaEstrela(sunJs, antes),
      vertex: sunJs,
      relevo: 0.4,
    });
    // o Sol e uma estrela com dínamo, fora da Forja: o caminho de antes
    expect(cirurgiasDaFotosfera(sunJs, sunJs, SOL_PARAMS, forjaDe(SOL_PARAMS))).toBeNull();
    const comDinamo = { ...bet, dinamo: true };
    expect(cirurgiasDaFotosfera(sunJs, sunJs, comDinamo, forjaDe(comDinamo))).toEqual(
      cirurgiasDaFotosfera(sunJs, sunJs, comDinamo, null)
    );
  });

  it('bake plano, a convecção dela no lugar da granulação viva, sem relevo', () => {
    const c = cirurgiasDaFotosfera(sunJs, sunJs, bet, forjaDe(bet))!;
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
    expect(c.fragment).toContain(`float calorDaForja = heat + ${literalGlsl(GANHO_DO_INSTRUMENTO)}*(rForja - 1.0);`);
    expect(c.fragment).toContain('  heat = clamp(calorDaForja, 0.0, 1.24);');
    expect(c.fragment).toContain('vec3(1.0, 0.86, 0.62), 0.550000 * smoothstep(0.72, 1.12, heat));');
    expect(c.fragment).toContain('  color.g *= 1.0 - edge*0.30;');
    expect(c.fragment).not.toContain('razaoDePlanck(');
    // numa quente o peso do filtro desce (`pesoDoFiltro`) e o contínuo de
    // Planck entra na mesma medida, sem corte
    const quente = { ...bet, teffK: 7650, logG: 4.16 };
    const w = pesoDoFiltro(7650);
    const q = cirurgiasDaFotosfera(sunJs, sunJs, quente, forjaDe(quente))!.fragment;
    expect(q).toContain(`float calorDaForja = heat + ${literalGlsl(w * GANHO_DO_INSTRUMENTO)}*(rForja - 1.0);`);
    expect(q).toContain(`, rForja), vec3(1.0), ${literalGlsl(w)});`);
    expect(q).toContain(`, ${literalGlsl(1 - w)});`);
    expect(c.fragment).not.toContain('granulacaoViva(sp');
    // a borda macia, na largura da regra, até o piso da frente da casca — e,
    // onde a borda de verdade é mais fina que o piso de 1,5 px, mais rasa na
    // proporção (largura real / desenhada), para o pixel mostrar a média
    const r = forjaDe(bet)!;
    const bordaDe = (x: NonNullable<ReturnType<typeof forjaDe>>) =>
      `  color *= mix(max(${literalGlsl(frenteDaAtmosfera(x.atmosferaEmRaios))}, 1.0 - min(1.0, ${literalGlsl(x.bordaEmMu * x.bordaEmMu)}/max(pisoDaBorda, 1e-9))), 1.0, ` +
      `smoothstep(0.0, max(${literalGlsl(x.bordaEmMu)}, sqrt(pisoDaBorda)), mu));`;
    expect(c.fragment).toContain('  float pisoDaBorda = 3.0*fwidth(sqrt(max(0.0, 1.0 - mu*mu)));\n' + bordaDe(r));
    // sem atmosfera estendida (anã quente) a mesma linha, com a frente em
    // zero: a queda inteira só de perto, onde a borda passa de 1,5 px
    const ana = { ...bet, teffK: 7650, logG: 4.16 };
    const ra = forjaDe(ana)!;
    expect(frenteDaAtmosfera(ra.atmosferaEmRaios)).toBe(0);
    expect(cirurgiasDaFotosfera(sunJs, sunJs, ana, ra)!.fragment).toContain(bordaDe(ra));
    // sem relevo nenhum: o vertex é o de antes
    expect(c.vertex).toBe(sunJs);
  });

  it('o assado da Forja: o main da cromosfera dá lugar ao da convecção, levada pelo escoamento', () => {
    const r = forjaDe(bet)!;
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
    const r = forjaDe(bet)!;
    const sup = glslDoAssadoDaForja(r);
    expect(sup).toContain('float quente = 0.0;');
    // o pico na unidade de z: δ_quente/δ, com δ = contraste/4
    expect(sup).toContain(literalGlsl((r.picoQuente / (r.contraste / 4)) * r.pesoProfundo));
    const gig = { ...bet, logG: 1.19, teffK: 3900 };
    expect(glslDoAssadoDaForja(forjaDe(gig)!)).not.toContain('quente');
    // a regra alisa por dentro inteira; a mancha medida fraca (Antares), na proporção do pico
    expect(r.picoQuente).toBe(r.picoDaRegra);
    expect(sup).toContain(`${literalGlsl(0.6)} * quente)`);
    const fraca = forjaDe({ ...bet, manchaQuente: { razao: 1.035, lambdaUm: 2.3 } })!;
    expect(fraca.picoQuente / fraca.picoDaRegra).toBeLessThan(0.15);
    expect(glslDoAssadoDaForja(fraca)).toContain(`${literalGlsl((0.6 * fraca.picoQuente) / fraca.picoDaRegra)} * quente)`);
  });

  it('o TiO pela temperatura local: 0 em 4.000 K, 1 em 3.000 K; a ponta HDR só com células quentes', () => {
    expect(pesoDoTiO(4450)).toBe(0);
    expect(pesoDoTiO(4000)).toBe(0);
    expect(pesoDoTiO(3500)).toBeCloseTo(0.75, 12);
    expect(pesoDoTiO(3000)).toBe(1);
    expect(pesoDoTiO(2500)).toBe(1);
    const tio = `exp(-${literalGlsl(TIO_DA_FORJA)} * xTiO * (2.0 - xTiO) * vec3(0.0, 1.0, 1.0))`;
    const ponta = 'smoothstep(' + literalGlsl(PONTA_DAS_CELULAS_QUENTES.de) + ', ' + literalGlsl(PONTA_DAS_CELULAS_QUENTES.ate) + ', calorDaForja)';
    const fr = (p: StellarParams) => cirurgiasDaFotosfera(sunJs, sunJs, p, forjaDe(p))!.fragment;
    // a supergigante: TiO por pixel e a ponta pesada pela escala profunda
    const f = fr(bet);
    expect(f).toContain(`float xTiO = clamp((4000.0 - ${literalGlsl(bet.teffK)}*rForja) / 1000.0, 0.0, 1.0);`);
    expect(f).toContain(tio);
    const w = forjaDe(bet)!.pesoProfundo;
    expect(f).toContain(`color *= 1.0 + ${literalGlsl(PONTA_DAS_CELULAS_QUENTES.ganho * w)} * ${ponta};`);
    // a gigante sem escala profunda: TiO sim, ponta não
    const gig = fr({ ...bet, logG: 1.19, teffK: 3900 });
    expect(gig).toContain(tio);
    expect(gig).not.toContain(ponta);
    // a anã quente: nenhum pixel abaixo de 4.000 K, nem um nem outro
    const ana = fr({ ...bet, teffK: 7650, logG: 4.16 });
    expect(ana).not.toContain('xTiO');
    expect(ana).not.toContain(ponta);
  });

  it('o tier leva o assado da regra', () => {
    const r = forjaDe(bet)!;
    const tier = { fbm: 5, seg: 128, simW: 768, simH: 384, simStep: 1 / 22, prom: 6, chromo: 1024, granFreq: 30, lic7: true, loops: 12, larc: 7, lseg: 36, cstep: 22, cmestep: 16, cmen: 1024 };
    expect(tierDaEstrela(tier, bet, r).chromo).toBe(r.assado);
    expect(tierDaEstrela(tier, bet).chromo).toBe(256);
  });
});

describe('a região fria de um escurecimento — a borda, as células e o céu da Terra', () => {
  it('sem região, nem a borda larga deslocada pelas células toca o disco (o ponto mais além é 1)', () => {
    expect(BORDA_FORA_DO_DISCO).toBeCloseTo(1.27, 12);
    expect(CORDA_SEM_MANCHA).toBeGreaterThan(BORDA_FORA_DO_DISCO);
  });

  it('dentro dela as células claras e a quente cedem, contínuas; as faixas ficam', () => {
    const s = 0.04;
    expect(brilhoDasCelulasNaRegiaoFria(-0.1, s)).toBe(-0.1);
    expect(brilhoDasCelulasNaRegiaoFria(0, s)).toBe(0);
    expect(brilhoDasCelulasNaRegiaoFria(s, s)).toBeCloseTo(s / 3, 12);
    // a quente enorme (5σ) sai abaixo de σ/2, e nada passa de σ/2
    expect(brilhoDasCelulasNaRegiaoFria(5 * s, s)).toBeCloseTo((5 * s) / 11, 12);
    expect(brilhoDasCelulasNaRegiaoFria(1e3, s)).toBeLessThan(s / 2);
    // contínua e crescente perto de zero
    expect(brilhoDasCelulasNaRegiaoFria(1e-9, s)).toBeCloseTo(1e-9, 15);
  });

  it('o norte é a declinação crescente e o leste a ascensão reta crescente, vistos da Terra (Betelgeuse)', () => {
    // ICRS cartesiano: x para α = 0, z para o polo norte
    const versorEquatorial = (raDeg: number, decDeg: number) => {
      const [a, d] = [(raDeg * Math.PI) / 180, (decDeg * Math.PI) / 180];
      return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
    };
    const ra = 88.79293899;
    const dec = 7.407064;
    // a base da cena é essa: o lugar de Betelgeuse no catálogo do app cai em (α, δ) a menos de 0,01°
    const named = JSON.parse(readFileSync(new URL('../../../public/data/stars_meta.json', import.meta.url), 'utf8')).named;
    const b = named.find((s: { n: string }) => s.n === 'Betelgeuse');
    const u = [b.x, b.y, b.z].map((v: number) => v / Math.hypot(b.x, b.y, b.z));
    const cosSep = u.reduce((s: number, v: number, i: number) => s + v * versorEquatorial(ra, dec)[i], 0);
    expect((Math.acos(Math.min(1, cosSep)) * 180) / Math.PI).toBeLessThan(0.01);
    const p = versorEquatorial(ra, dec).map((x) => x * 152) as [number, number, number];
    const passo = 1e-4;
    const dif = (a: readonly number[], b: readonly number[]) => {
      const v = a.map((x, i) => x - b[i]);
      const l = Math.hypot(...v);
      return v.map((x) => x / l);
    };
    const norte = dif(versorEquatorial(ra, dec + passo), versorEquatorial(ra, dec));
    const leste = dif(versorEquatorial(ra + passo, dec), versorEquatorial(ra, dec));
    const casa = (a: readonly number[], b: readonly number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
    expect(casa(direcaoNoCeu(p, 0), norte)).toBeCloseTo(1, 7);
    expect(casa(direcaoNoCeu(p, 90), leste)).toBeCloseTo(1, 7);
    // o sul de dezembro e janeiro, e o sudoeste de março: entre o sul e o oeste
    expect(casa(direcaoNoCeu(p, 180), norte)).toBeCloseTo(-1, 7);
    const so = direcaoNoCeu(p, 225);
    expect(casa(so, norte)).toBeCloseTo(-Math.SQRT1_2, 6);
    expect(casa(so, leste)).toBeCloseTo(-Math.SQRT1_2, 6);
    // no plano do céu (perpendicular à linha de visada) e unitária
    for (const a of [0, 37, 180, 225]) {
      const d = direcaoNoCeu(p, a);
      expect(Math.hypot(...d)).toBeCloseTo(1, 12);
      expect(casa(d, p) / 152).toBeCloseTo(0, 12);
    }
    // no polo não há norte: uma direção finita, nunca NaN
    expect(direcaoNoCeu([0, 0, 5], 180).every(Number.isFinite)).toBe(true);
  });

  it('o texto da fotosfera só muda com o escurecimento, e só dentro de MANCHA_FRIA', () => {
    const sunJs = readFileSync(new URL('./sol/sun.js', import.meta.url), 'utf8');
    const bet: StellarParams = { ...SOL_PARAMS, teffK: 3600, dinamo: false, logG: -0.33, radiusPc: 764 * RAIO_DO_SOL_NA_CENA };
    const r = forjaDe(bet)!;
    const sem = cirurgiasDaFotosfera(sunJs, '', bet, r)!.fragment;
    const esc = { borda: [[2019.8, 1.3]], razaoT: [[2019.8, 1]], anguloGraus: [[2019.8, 180]] } as const;
    const com = cirurgiasDaFotosfera(sunJs, '', { ...bet, escurecimento: esc }, r)!.fragment;
    expect(sem).not.toContain('uManchaFria');
    // sem o define, o pré-processador devolve o texto de antes
    expect(com.replace(/#ifdef MANCHA_FRIA\n[^#]*#endif\n/g, '')).toBe(sem);
    expect(com.match(/#ifdef MANCHA_FRIA/g)).toHaveLength(3);
    // a borda larga, deslocada pelo campo das células (±2σ)
    expect(com).toContain('smoothstep(uManchaFria.w - 0.150000, uManchaFria.w + 0.150000, dot(N, uManchaFria.xyz) + 0.060000*clamp(dForja / ');
    // a mesma conta de `brilhoDasCelulasNaRegiaoFria`
    expect(com).toContain('dForja > 0.0 ? dForja / (1.0 + 2.0 * dForja / ');
    // as células cedem antes da rampa; a razão das temperaturas entra depois, por Planck e pelo TiO
    expect(com.indexOf('float mFria')).toBeLessThan(com.indexOf('float calorDaForja'));
    expect(com.indexOf('float xTiOFria')).toBeGreaterThan(com.indexOf('float xTiO ='));
    expect(com.indexOf('razaoDePlanck(vec3(')).toBeLessThan(com.indexOf('color *= (1.0-limbU) + limbU*mu;'));
    // a razão de Planck é definida uma vez só
    expect(com.match(/vec3 razaoDePlanck\(/g)).toHaveLength(1);
    // o assado: a célula quente (o pico e o alisamento por dentro) some na região fria, só com o define
    const assado = glslDoAssadoDaForja(r, undefined, true);
    expect(glslDoAssadoDaForja(r, undefined, false)).toBe(glslDoAssadoDaForja(r));
    expect(assado.replace(/#ifdef MANCHA_FRIA\n[^#]*#endif\n?/g, '')).toBe(glslDoAssadoDaForja(r));
    expect(assado).toContain('quente *= 1.0 - smoothstep(uManchaFriaAssado.w - 0.150000, uManchaFriaAssado.w + 0.150000, dot(sp, uManchaFriaAssado.xyz));');
    expect(assado.indexOf('quente *= 1.0 - smoothstep')).toBeLessThan(assado.indexOf('a.x = mix(a.x'));
    // sem a Forja não há onde a mancha morar
    const quente = { ...SOL_PARAMS, teffK: 9845, dinamo: false, contrasteRelativoAoSol: 0 };
    expect(cirurgiasDaFotosfera(sunJs, '', { ...quente, escurecimento: esc }, null)!.fragment).not.toContain('MANCHA_FRIA');
  });
});
