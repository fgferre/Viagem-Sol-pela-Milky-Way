// ============================================================
// A FORJA, botão GRAVIDADE (etapa 2, `?forja=1`): a camada de convecção de
// toda estrela sem dínamo por uma regra só, de Teff e log g. A regra
// decidida e as fontes estão em docs/LEI-DA-ESTRELA.md, seção 10; aqui só
// as contas, puras. Quem desenha é `stellarBody.ts` (`conveccao`).
// ============================================================

/** O raio do Sol, em Mm (IAU 2015 B3: 695.700 km). */
const RAIO_SOL_MM = 695.7;
const TEFF_SOL_K = 5772;
const LOG_G_SOL = 4.438;

/**
 * O TAMANHO DA CÉLULA DE CONVECÇÃO, em raios da estrela: o ajuste de
 * Trampedach et al. 2013 (arXiv 1303.1780) às 37 simulações 3D,
 * log₁₀(A/Mm) = 1,3210 log₁₀ Teff − 1,0970 log g + 0,0306. Abaixo de
 * log g ≈ 1 é EXTRAPOLADO (fora da grade).
 */
export function celulaRealEmRaios(teffK: number, logG: number, raioRsol: number): number {
  const aMm = Math.pow(10, 1.321 * Math.log10(teffK) - 1.097 * logG + 0.0306);
  return aMm / (raioRsol * RAIO_SOL_MM);
}

/** a célula do Sol pela mesma conta (~0,00194 R) */
const A_SOL = celulaRealEmRaios(TEFF_SOL_K, LOG_G_SOL, 1);
/** onde a célula na tela encontra a real */
const ENCONTRO = 0.1;
/** o grão do Sol aprovado na tela */
const CELULA_DO_SOL_NA_TELA = 1 / 30;
/** o expoente que leva 1/30 (em A☉) a 0,1 (em 0,1): ~0,279 */
const EXPOENTE_DA_TELA = Math.log(ENCONTRO / CELULA_DO_SOL_NA_TELA) / Math.log(ENCONTRO / A_SOL);

/**
 * A CÉLULA NA TELA, em raios — a concessão de sempre (o grão do Sol aparece
 * 17,8× maior) como curva contínua e crescente: (1/30)·(A/A☉)^p abaixo de
 * 0,1 R, a própria célula acima. ARTÍSTICO, declarado.
 */
export function celulaNaTelaEmRaios(aR: number): number {
  if (aR >= ENCONTRO) return aR;
  return CELULA_DO_SOL_NA_TELA * Math.pow(Math.max(aR, 0) / A_SOL, EXPOENTE_DA_TELA);
}

/** interpolação linear por pontos (x crescente), constante fora */
function porPontos(pontos: readonly (readonly [number, number])[], x: number): number {
  if (x <= pontos[0]![0]) return pontos[0]![1];
  for (let i = 1; i < pontos.length; i++) {
    const [x1, y1] = pontos[i]!;
    if (x <= x1) {
      const [x0, y0] = pontos[i - 1]!;
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return pontos[pontos.length - 1]![1];
}

/**
 * O contraste rms das ANÃS por Teff: Beeck et al. 2013 (arXiv 1308.4874:
 * M2V a F3V) e Steffen et al. 2005 (astro-ph/0509464: 8.000 e 8.500 K).
 */
const CONTRASTE_DAS_ANAS: readonly (readonly [number, number])[] = [
  [3689, 0.0217],
  [3905, 0.0355],
  [4368, 0.069],
  [4856, 0.0804],
  [5764, 0.157],
  [6893, 0.203],
  [8000, 0.127],
  [8500, 0.079],
];
/** as gigantes frias: do Sol à gigante de 3.660 K e log g 1 de Ludwig & Kučinskas 2012 (18 %) */
const CONTRASTE_DAS_GIGANTES: readonly (readonly [number, number])[] = [
  [3660, 0.18],
  [5772, 0.157],
];
const LOG_G_DA_GIGANTE = 1.0;

function contrasteDasAnas(teffK: number): number {
  const [xa, ya] = CONTRASTE_DAS_ANAS[CONTRASTE_DAS_ANAS.length - 2]!;
  const [xb, yb] = CONTRASTE_DAS_ANAS[CONTRASTE_DAS_ANAS.length - 1]!;
  // acima de 8.500 K, a reta dos dois últimos até zero (~9.300 K): sem
  // envelope convectivo não há granulação — EXTRAPOLADO
  if (teffK > xb) return Math.max(0, yb + ((teffK - xb) / (xb - xa)) * (yb - ya));
  return porPontos(CONTRASTE_DAS_ANAS, teffK);
}

/**
 * O CONTRASTE RMS da convecção (intensidade bolométrica): a curva das anãs
 * em Teff; abaixo da Teff do Sol, misturada em log g (4,438 → 1,0) rumo à
 * reta das gigantes frias. Gigante quente: sem medida, vale a das anãs.
 */
export function contrasteDaConveccao(teffK: number, logG: number): number {
  const ana = contrasteDasAnas(teffK);
  if (teffK >= TEFF_SOL_K) return ana;
  const s = Math.min(1, Math.max(0, (LOG_G_SOL - logG) / (LOG_G_SOL - LOG_G_DA_GIGANTE)));
  return ana + s * (porPontos(CONTRASTE_DAS_GIGANTES, teffK) - ana);
}

/**
 * O RAIO DA ATMOSFERA ESTENDIDA, em raios, por log g: anã 1,0; Arcturus
 * 1,04 (log g 1,66; Ohnaka & Morales Marín 2018); supergigante 1,3 em
 * log g 0 (Montargès 2014; Ohnaka 2009, 2013). Só nas frias: o excesso é
 * inteiro abaixo de 4.500 K (Linsky & Haisch) e zero em 5.000 K — rampa
 * ARTÍSTICA.
 */
const ATMOSFERA_POR_LOG_G: readonly (readonly [number, number])[] = [
  [0.0, 1.3],
  [1.66, 1.04],
  [LOG_G_SOL, 1.0],
];
export function raioDaAtmosferaEmRaios(teffK: number, logG: number): number {
  const r = porPontos(ATMOSFERA_POR_LOG_G, logG);
  const peso = Math.min(1, Math.max(0, (5000 - teffK) / 500));
  return 1 + (r - 1) * peso;
}

/**
 * A FRAÇÃO ESCURA da convecção — a fração da área abaixo da intensidade
 * média: ~0,53 no Sol e ~0,34 a 8.000 K nas simulações 3D (Steffen et al.
 * 2005, astro-ph/0509464). Aqui 0,5 até a Teff do Sol, linear até 0,34 a
 * 8.000 K, constante acima (o contraste já vai a zero).
 */
export function fracaoEscura(teffK: number): number {
  const x = Math.min(1, Math.max(0, (teffK - TEFF_SOL_K) / (8000 - TEFF_SOL_K)));
  return 0.5 + x * (0.34 - 0.5);
}

/**
 * O RITMO DA FERVURA relativo ao da granulação viva de hoje: 1 na célula do
 * Sol, o das células gigantes de hoje (1/6: os centros delas andam a
 * 0,05·(0,5 + h) por unidade de tempo, os da granulação viva a 0,3·(0,5 + h))
 * a partir de 0,1 R, linear em log do tamanho REAL entre os dois — célula
 * maior ferve mais devagar. ARTÍSTICO, declarado.
 */
export function ritmoDaFervura(aR: number): number {
  const x = Math.min(1, Math.max(0, Math.log(aR / A_SOL) / Math.log(ENCONTRO / A_SOL)));
  return 1 + x * (1 / 6 - 1);
}

/** O RELEVO, em raios: uma escala de altura, Hp ≈ A/10 (Trampedach: A/Hp de 9 a 13), da célula REAL */
export function relevoEmRaios(aR: number): number {
  return aR / 10;
}

export interface RegraDaForja {
  readonly celulaRealEmRaios: number;
  readonly celulaNaTelaEmRaios: number;
  readonly contraste: number;
  readonly atmosferaEmRaios: number;
  readonly relevoEmRaios: number;
  readonly fracaoEscura: number;
  readonly ritmo: number;
}

/** O botão GRAVIDADE inteiro, de Teff, log g e raio. */
export function regraDaForja(teffK: number, logG: number, raioRsol: number): RegraDaForja {
  const a = celulaRealEmRaios(teffK, logG, raioRsol);
  return {
    celulaRealEmRaios: a,
    celulaNaTelaEmRaios: celulaNaTelaEmRaios(a),
    contraste: contrasteDaConveccao(teffK, logG),
    atmosferaEmRaios: raioDaAtmosferaEmRaios(teffK, logG),
    relevoEmRaios: relevoEmRaios(a),
    fracaoEscura: fracaoEscura(teffK),
    ritmo: ritmoDaFervura(a),
  };
}
