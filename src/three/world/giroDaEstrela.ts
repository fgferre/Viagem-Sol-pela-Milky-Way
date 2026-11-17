// ============================================================
// O GIRO DA ESTRELA: o achatamento de rotação e o escurecimento
// gravitacional de QUALQUER estrela por uma regra só, do giro, da massa e
// do raio. Antes era um caso escrito à mão (Vega). Modelo de Roche (massa
// central, rotação rígida) com as temperaturas de polo e equador de
// Espinosa Lara & Rieutord 2011 (A&A 533, A43; arXiv 1109.3038, "ELR").
// Aqui só as contas, puras; quem decide a fonte do giro é `achatamentoDe`
// (`lib/atlas/estrelasVisitaveis.ts`) e quem desenha é `stellarBody.ts`.
//
// Unidades de ELR: w = Ω/Ω_k, com Ω_k = √(GM/Re³). Roche dá
// Re/Rp = 1 + w²/2, e o giro crítico Ω_c = √(8GM/27Rp³) dá
// (Ω/Ω_c)² = 27w²/(2 + w²)³.
//
// O RAIO DA FICHA é o MÉDIO, o de VOLUME IGUAL (convenção declarada):
// R³ = Re²·Rp, logo Re = R·(1 + w²/2)^⅓ e Rp = Re/(1 + w²/2).
// ============================================================

/** GM do Sol (IAU 2015 B3, nominal), m³/s² */
const GM_SOL = 1.3271244e20;
/** o raio do Sol (IAU 2015 B3: 695.700 km), m */
const RAIO_SOL_M = 6.957e8;
const TEFF_SOL_K = 5772;
const DIA_S = 86400;

/**
 * O LIMIAR DO ACHATAMENTO: abaixo de Re/Rp − 1 = 2e-4 a estrela é REDONDA
 * e vai pelo caminho de sempre, bit a bit. O degrau no limiar é invisível
 * por construção: no mais perto que a câmera chega (1,5 raio, fov ~42°) o
 * disco tem raio ~2.500 px numa tela de 2.160 px de altura, e 2e-4 disso
 * é meio pixel; a diferença de temperatura polo/equador ali é ~1e-4·T,
 * menos de meio degrau de 8 bits no brilho. O Sol fica em ~1e-5.
 */
export const LIMIAR_DO_ACHATAMENTO = 2e-4;

/**
 * O TETO DO GIRO DERIVADO, Ω/Ω_c ≤ 0,96: acima disso o modelo de Roche
 * perto da quebra (equador sem gravidade, Te → 0) não é desenho honesto.
 * Só para os casos derivados; quem passa é grampeado e marcado.
 */
export const TETO_DO_GIRO = 0.96;

/** Re/Rp de Roche */
export function razaoDosRaios(w: number): number {
  return 1 + 0.5 * w * w;
}

/** Ω/Ω_c = √(27w²/(2 + w²)³) */
export function giroSobreCritico(w: number): number {
  const w2 = w * w;
  return Math.sqrt((27 * w2) / (2 + w2) ** 3);
}

/** o w de uma forma medida: w² = 2(Re/Rp − 1) */
export function wDaRazaoDosRaios(reSobreRp: number): number {
  return Math.sqrt(2 * Math.max(0, reSobreRp - 1));
}

/** o w do teto: 27x/(2 + x)³ = 0,96² com x = w² (crescente em [0, 1]) */
export const W_NO_TETO = (() => {
  const alvo = TETO_DO_GIRO * TETO_DO_GIRO;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 80; i++) {
    const x = (lo + hi) / 2;
    if ((27 * x) / (2 + x) ** 3 < alvo) lo = x;
    else hi = x;
  }
  return Math.sqrt((lo + hi) / 2);
})();

/**
 * O w DE UM PERÍODO (Ω = 2π/P) sobre a massa e o raio médio: com
 * q = Ω²R³/GM, w² = q/(1 − q/2) (conta fechada). Além da quebra (w ≥ 1,
 * q ≥ ⅔) devolve 1; quem grampeia é `giroDe`.
 */
export function wDoPeriodo(periodoDias: number, massaMsol: number, raioRsol: number): number {
  const omega = (2 * Math.PI) / (periodoDias * DIA_S);
  const R = raioRsol * RAIO_SOL_M;
  const q = (omega * omega * R * R * R) / (massaMsol * GM_SOL);
  if (!(q < 2 / 3)) return 1;
  return Math.sqrt(q / (1 - q / 2));
}

/**
 * O w DE UMA VELOCIDADE EQUATORIAL sobre a massa e o raio médio:
 * w² = (v²R/GM)·(1 + w²/2)^⅓, por ponto fixo (crescente a partir de
 * w² = v²R/GM; contrai bem abaixo da quebra). Além dela devolve 1.
 */
export function wDaVelocidade(vKms: number, massaMsol: number, raioRsol: number): number {
  const v = vKms * 1e3;
  const k = (v * v * raioRsol * RAIO_SOL_M) / (massaMsol * GM_SOL);
  let w2 = k;
  for (let i = 0; i < 200; i++) {
    if (!(w2 < 1)) return 1;
    const novo = k * Math.cbrt(1 + w2 / 2);
    const passo = Math.abs(novo - w2);
    w2 = novo;
    if (passo < 1e-15) break;
  }
  return w2 < 1 ? Math.sqrt(w2) : 1;
}

/** o raio equatorial, em R☉, pelo raio médio de volume igual */
export function raioEquatorialDe(w: number, raioRsol: number): number {
  return raioRsol * Math.cbrt(razaoDosRaios(w));
}

/** o período, em dias, de um giro w sobre a massa e o raio médio: Ω = w·√(GM/Re³) */
export function periodoDoGiroDias(w: number, massaMsol: number, raioRsol: number): number {
  const re = raioEquatorialDe(w, raioRsol) * RAIO_SOL_M;
  const omega = w * Math.sqrt((massaMsol * GM_SOL) / (re * re * re));
  return (2 * Math.PI) / omega / DIA_S;
}

/**
 * AS TEMPERATURAS DE POLO E EQUADOR de ELR 2011 (formas fechadas), com
 * T0 = 5.772 K·(L/Re²)^¼ (L e Re em unidades solares):
 * Te = T0·(1 − w²)^(1/12) e Tp = T0·√((2 + w²)/2)·exp(⁴⁄₃·w²/(2 + w²)³).
 * Vale para w < 1 (o teto garante).
 */
export function temperaturasDeELR(
  w: number,
  raioEquatorialRsol: number,
  luminosidadeLsol: number
): { polo: number; equador: number } {
  const w2 = w * w;
  const t0 = TEFF_SOL_K * Math.pow(luminosidadeLsol / (raioEquatorialRsol * raioEquatorialRsol), 0.25);
  return {
    polo: t0 * Math.sqrt((2 + w2) / 2) * Math.exp(((4 / 3) * w2) / (2 + w2) ** 3),
    equador: t0 * Math.pow(1 - w2, 1 / 12),
  };
}

/** O giro derivado de uma estrela, pronto para a forma e a cor. */
export interface Giro {
  readonly w: number;
  /** Ω/Ω_c depois do teto */
  readonly giroSobreCritico: number;
  /** o w pedido passou do teto e foi grampeado */
  readonly noTeto: boolean;
  readonly raioEquatorialRsol: number;
  readonly raioPolarRsol: number;
  readonly teffPoloK: number;
  readonly teffEquadorK: number;
  /** o β de von Zeipel (T ∝ g^β) que liga as duas pontas */
  readonly betaGravidade: number;
}

/**
 * O GIRO DERIVADO de um w (de `wDoPeriodo` ou `wDaVelocidade`), do raio
 * médio e da luminosidade: o teto (Ω/Ω_c ≤ 0,96, grampeado e marcado), o
 * limiar (abaixo dele, `null`: redonda) e a forma e as temperaturas.
 */
export function giroDe(wPedido: number, raioRsol: number, luminosidadeLsol: number): Giro | null {
  const noTeto = wPedido > W_NO_TETO;
  const w = noTeto ? W_NO_TETO : Math.max(0, wPedido);
  const razao = razaoDosRaios(w);
  if (!(razao - 1 >= LIMIAR_DO_ACHATAMENTO)) return null;
  const re = raioEquatorialDe(w, raioRsol);
  const { polo, equador } = temperaturasDeELR(w, re, luminosidadeLsol);
  // g_eq/g_polo = (Rp/Re)²·(1 − w²): os dois logaritmos são negativos
  // e longe de zero acima do limiar
  const gEqSobrePolo = (1 - w * w) / (razao * razao);
  return {
    w,
    giroSobreCritico: giroSobreCritico(w),
    noTeto,
    raioEquatorialRsol: re,
    raioPolarRsol: re / razao,
    teffPoloK: polo,
    teffEquadorK: equador,
    betaGravidade: Math.log(equador / polo) / Math.log(gEqSobrePolo),
  };
}
