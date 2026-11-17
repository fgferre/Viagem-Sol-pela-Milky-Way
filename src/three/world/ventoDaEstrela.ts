// ============================================================
// O GÁS EM VOLTA DAS QUENTES: o VENTO das supergigantes azuis e o DISCO das
// estrelas Be, como um instrumento os vê na linha Hα do hidrogênio. Uma
// máquina só: a emissão de recombinação, emissividade ∝ ρ², integrada na
// linha de visada; o campo de densidade é a soma do vento e do disco, cada
// um pelo dado da estrela. Aqui só as contas, puras; quem desenha é
// `stellarBody.ts` (a casca de `criarABordaDifusa`) e quem decide a fonte
// é `gasDaEstrela`.
//
//  · VENTO: ρ(r) ∝ Ṁ / (4π r² v(r)), v(r) = v∞·max((1 − R/r)^β, piso).
//    Ṁ e v∞: o MEDIDO vence (`VENTOS_MEDIDOS`); senão a receita de Vink,
//    de Koter & Lamers 2001 (A&A 369, 574), só dentro da faixa dela
//    (`ventoPelaReceita`). Abaixo de 12.500 K não há receita.
//  · O BRILHO, sem limiar físico: a fração do fluxo do gás sobre o do disco
//    é G·X/X_Rigel, X = (Ṁ/v∞)² / (R³·B656(Teff)) — a medida de emissão de
//    um vento ∝ (Ṁ/v∞)²/R³ (a área do disco, R², divide o volume, R³ · R⁻⁴
//    da densidade ao quadrado), sobre o contínuo de Planck em 656,3 nm.
//    G (`GANHO_DO_GAS`) é o único ganho, ARTÍSTICO, ancorado em Rigel: na
//    linha de Hα o diâmetro dela é 1,5× o do contínuo (Chesneau et al. 2010,
//    A&A 521, A5), o envelope pesa tanto quanto o disco num filtro estreito.
//    Abaixo de `LIMIAR_DE_DESENHO` o gás nem é construído.
//  · DISCO (dado da estrela, `discoDeGas`): ρ = ρ0·(r/R)^−n·exp(−z²/2H²),
//    H = H0·(r/R)^1,5 (Rivinius, Carciofi & Martayan 2013, A&ARv 21, 69); a
//    época por lista medida (`faseDoDisco`), nunca por ciclo inventado.
// ============================================================
import type { DiscoDeGas, EstrelaVisitavel } from '../../lib/atlas/estrelasVisitaveis';

/** GM do Sol (IAU 2015 B3, nominal), m³/s² */
const GM_SOL = 1.3271244e20;
/** o raio do Sol (IAU 2015 B3), m */
const RAIO_SOL_M = 6.957e8;

/** o vento de uma estrela: Ṁ em M☉/ano, v∞ em km/s, e de onde veio */
export interface Vento {
  readonly mdotMsolAno: number;
  readonly vInfKms: number;
  readonly p: 'medido' | 'derivado';
  readonly fonte: string;
}

const CHESNEAU_2014 = 'Chesneau et al. 2014, A&A 566, A125; Kaufer et al. 1996';
const AUFDENBERG_2002 = 'Aufdenberg et al. 2002, ApJ 570, 344';
export const FONTE_DA_RECEITA = 'Vink, de Koter & Lamers 2001, A&A 369, 574';

/**
 * OS VENTOS MEDIDOS, pelo nome no catálogo. Rigel: a média de 9,4 ± 0,9
 * (2006–07) e 7,6 ± 1,1 × 10⁻⁷ M☉/ano (2009–10), v∞ 230 km/s (Kaufer et
 * al. 1996, citado ali). Deneb: 8 ± 3 × 10⁻⁷, 225 km/s.
 */
export const VENTOS_MEDIDOS: Readonly<Record<string, Vento>> = {
  Rigel: { mdotMsolAno: 8.5e-7, vInfKms: 230, p: 'medido', fonte: CHESNEAU_2014 },
  Deneb: { mdotMsolAno: 8e-7, vInfKms: 225, p: 'medido', fonte: AUFDENBERG_2002 },
};

/** log⟨ρ⟩ na metalicidade do Sol (Vink et al. 2001, eq. 14) */
const LOG_RHO_MEDIO = -13.636;
/** a temperatura do salto de biestabilidade, K: 61,2 + 2,59·log⟨ρ⟩ kK (≈ 25,9 kK) */
export const TEFF_DO_SALTO_K = (61.2 + 2.59 * LOG_RHO_MEDIO) * 1000;

/**
 * O teto de Γe — ARTÍSTICO, sem fonte aberta: as gigantes e supergigantes do
 * catálogo levam uma massa TÍPICA declarada (`estrelaDoCatalogo`), baixa
 * para as mais luminosas; com ela Γe ia a 1, a velocidade de escape a zero e
 * o brilho do gás a milhares de vezes o do disco (τ CMa, ι Ori). Com o teto
 * a velocidade de escape nunca cai abaixo de 71 % da que a massa dá.
 */
export const TETO_DE_GAMA = 0.5;

/** a velocidade de escape efetiva, km/s: √(2GM(1 − Γe)/R), Γe = 2,6e-5·L/M (com teto, `TETO_DE_GAMA`) */
export function velocidadeDeEscape(lumLsol: number, massaMsol: number, raioRsol: number): number {
  const gama = Math.min(TETO_DE_GAMA, (2.6e-5 * lumLsol) / massaMsol);
  return Math.sqrt((2 * GM_SOL * massaMsol * (1 - gama)) / (raioRsol * RAIO_SOL_M)) / 1000;
}

/**
 * A RECEITA de Vink et al. 2001 (Z = Z☉), só na faixa dela: 12.500 a
 * 50.000 K; entre 22.500 e 27.500 K o lado é o da temperatura do salto
 * (`TEFF_DO_SALTO_K`); v∞/v_esc = 2,6 no lado quente e 1,3 no frio.
 * Fora da faixa, null.
 */
export function ventoPelaReceita(teffK: number, lumLsol: number, massaMsol: number, raioRsol: number): Vento | null {
  if (!(teffK >= 12500 && teffK <= 50000) || !(lumLsol > 0) || !(massaMsol > 0) || !(raioRsol > 0)) return null;
  if (teffK > 22500 && teffK <= 27500 ? teffK > TEFF_DO_SALTO_K : teffK > 27500) {
    const razao = 2.6;
    const lt = Math.log10(teffK / 40000);
    const logM =
      -6.697 +
      2.194 * Math.log10(lumLsol / 1e5) -
      1.313 * Math.log10(massaMsol / 30) -
      1.226 * Math.log10(razao / 2) +
      0.933 * lt -
      10.92 * lt * lt;
    return {
      mdotMsolAno: 10 ** logM,
      vInfKms: razao * velocidadeDeEscape(lumLsol, massaMsol, raioRsol),
      p: 'derivado',
      fonte: FONTE_DA_RECEITA,
    };
  }
  const razao = 1.3;
  const logM =
    -6.688 +
    2.21 * Math.log10(lumLsol / 1e5) -
    1.339 * Math.log10(massaMsol / 30) -
    1.601 * Math.log10(razao / 2) +
    1.07 * Math.log10(teffK / 20000);
  return {
    mdotMsolAno: 10 ** logM,
    vInfKms: razao * velocidadeDeEscape(lumLsol, massaMsol, raioRsol),
    p: 'derivado',
    fonte: FONTE_DA_RECEITA,
  };
}

/** o vento de uma estrela: o medido pelo nome vence; senão a receita */
export function ventoDe(nome: string, teffK: number, lumLsol: number, massaMsol: number, raioRsol: number): Vento | null {
  return VENTOS_MEDIDOS[nome] ?? ventoPelaReceita(teffK, lumLsol, massaMsol, raioRsol);
}

/** Planck em 656,3 nm, sem as constantes (só a razão entre estrelas importa): 1/(e^(hc/λkT) − 1) */
export function planck656(teffK: number): number {
  return 1 / Math.expm1(0.014387769 / 656.3e-9 / teffK);
}

/** X = (Ṁ/v∞)² / (R³·B656(Teff)) — a medida de emissão do vento sobre o contínuo */
export function medidaDoVento(v: Vento, raioRsol: number, teffK: number): number {
  const q = v.mdotMsolAno / v.vInfKms;
  return (q * q) / (raioRsol ** 3 * planck656(teffK));
}

/**
 * A ÂNCORA: Rigel pela ficha da regra única (`estrelaDoCatalogo`: B8Ia,
 * 12.100 K, 67,7 R☉) e o vento medido dela — em Rigel a fração vale G (o
 * teste confere a ficha contra estes números).
 */
export const ANCORA_RIGEL = { teffK: 12100, raioRsol: 67.7 } as const;
const X_RIGEL = medidaDoVento(VENTOS_MEDIDOS.Rigel, ANCORA_RIGEL.raioRsol, ANCORA_RIGEL.teffK);

/**
 * O GANHO DO GÁS — o único número de brilho, ARTÍSTICO, por imagem: a
 * fração do fluxo do disco que o gás de Rigel carrega na vista de
 * instrumento (1 = o gás inteiro com o mesmo fluxo do disco). O disco de
 * uma Be usa o mesmo G × a fase. 0,3 (17/11, por imagem): com 1 o rosa
 * estourava rente à borda e o brilho lavava o quadro inteiro de Rigel; com
 * 0,3 o anel de Rigel lê e Alnilam (1,5 × o disco) ainda não apaga o céu.
 */
export const GANHO_DO_GAS = 0.3;
/** o limiar de DESENHO (não físico): abaixo de 1/400 do fluxo do disco, meio degrau de tela, o gás nem nasce */
export const LIMIAR_DE_DESENHO = 1 / 400;

/**
 * O TETO DO GÁS: ele nunca carrega mais fluxo que o próprio disco. A base é
 * a medida que existe do pico da linha: em Achernar ativa o pico de Hα fica
 * sempre ≲ 1,3–1,5 do contínuo (Kervella et al. 2022; Rivinius et al. 2013),
 * ou seja, a emissão do gás no centro da linha não passa de ~1 vez o
 * contínuo da estrela.
 */
export const TETO_DO_GAS = 1;

/**
 * A fração do fluxo do disco que o vento carrega. Até o vento de Rigel (a
 * âncora, x = 1) é linear na medida de emissão: G·x. Acima, cresce com o
 * LOGARITMO, G·(1 + ln x): uma linha que já é opticamente espessa não fica
 * mais brilhante na proporção de ρ² (a parte chata da curva de crescimento);
 * sem isso Alnilam saía com 5× e ζ Pup com 10× o gás de Rigel. Contínua e
 * com a mesma inclinação em x = 1; teto em `TETO_DO_GAS`.
 */
export function fracaoDoVento(v: Vento, raioRsol: number, teffK: number): number {
  const x = medidaDoVento(v, raioRsol, teffK) / X_RIGEL;
  return Math.min(TETO_DO_GAS, GANHO_DO_GAS * (x <= 1 ? x : 1 + Math.log(x)));
}

/**
 * O PERFIL DO VENTO, ARTÍSTICO, declarado: β e o piso da lei de
 * velocidade, e a cauda que leva a emissão a zero até 3,2 raios (a linha
 * sonda até 3). Com ρ² a emissão de um vento com velocidade constante cai
 * como b⁻³ na tela, e o raio de meia altura não passa de 2^⅓ ≈ 1,26 —
 * qualquer β; os 1,5 raio medidos em Rigel (1,75 em Deneb) são de uma
 * linha opticamente espessa perto da base. β = 3 com piso de 0,1 v∞ é o
 * mais perto que a lei chega (meia altura em ~1,24 raio).
 */
export const PERFIL_DO_VENTO = { beta: 3, piso: 0.1, caudaDe: 2.2, fim: 3.2 } as const;
/**
 * AS ESTRUTURAS QUE GIRAM COM A ESTRELA (Rigel: variação de 20–25 % em
 * meses, fases de regiões de interação corrotantes; Chesneau et al. 2014):
 * dois braços espirais no plano do equador, ρ × (1 + a·sen²θ·cos(2φ − k(r − 1))).
 * A amplitude `a` faz a emissividade variar ±25 % no equador (medido); a
 * forma (dois braços, o enrolamento k, o peso sen²θ) é ARTÍSTICA.
 */
export const BRACOS_DO_VENTO = { amplitude: 0.12, enrolamento: 1.6 } as const;

function suave(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** a emissividade do vento (sem os braços) a r raios do centro, na unidade do desenho */
export function emissividadeDoVento(r: number): number {
  const rr = Math.max(r, 1);
  const w = Math.max(Math.pow(Math.max(1 - 1 / rr, 0), PERFIL_DO_VENTO.beta), PERFIL_DO_VENTO.piso);
  return (1 - suave(PERFIL_DO_VENTO.caudaDe, PERFIL_DO_VENTO.fim, rr)) / (rr ** 4 * w * w);
}

/** ∫ 4π r² ε(r) dr de 1 até o fim: a luz inteira do vento na unidade do desenho */
export function integralDoVento(): number {
  let s = 0;
  const n = 8000;
  const h = (PERFIL_DO_VENTO.fim - 1) / n;
  for (let i = 0; i < n; i++) {
    const r = 1 + (i + 0.5) * h;
    s += 4 * Math.PI * r * r * emissividadeDoVento(r) * h;
  }
  return s;
}

/** o fluxo do disco da estrela, em unidades da intensidade do centro e do raio: π(1 − u/3) */
export function fluxoDoDisco(bordaU: number): number {
  return Math.PI * (1 - bordaU / 3);
}

/** a cauda do disco de gás em volta do raio externo: de 0,85 a 1,15 × ele (ARTÍSTICO) */
export const CAUDA_DO_DISCO = { de: 0.85, ate: 1.15 } as const;

/** o disco em números de desenho */
export interface DiscoDoMotor {
  /** raio externo, em raios equatoriais */
  readonly raioExterno: number;
  /** H0 = tan(meia abertura na base), em raios */
  readonly h0: number;
  /** o expoente n da densidade */
  readonly expoente: number;
  /** a função da época: (ano, fase) em ordem */
  readonly epocas: readonly (readonly [ano: number, fase: number])[];
  /** a luz do disco na fase 1, na unidade do desenho (G·fluxo do disco ÷ ∫ε dV) */
  readonly normal: number;
}

/** o gás que o motor desenha: o vento e/ou o disco, já em números de desenho */
export interface GasDoMotor {
  readonly vento?: {
    /** a fração do fluxo do disco (G·X/X_Rigel) */
    readonly fracao: number;
    /** a emissividade × isto dá a luz certa (fração·fluxo do disco ÷ ∫ε dV) */
    readonly normal: number;
  };
  readonly disco?: DiscoDoMotor;
}

/** a emissividade do disco de gás no plano (z = 0) a rc raios do eixo, já integrada em z: rc^(−2n)·H√π·cauda */
function colunaDoDisco(rc: number, d: Pick<DiscoDoMotor, 'raioExterno' | 'h0' | 'expoente'>): number {
  const r = Math.max(rc, 1);
  const h = d.h0 * r ** 1.5;
  const cauda = 1 - suave(CAUDA_DO_DISCO.de * d.raioExterno, CAUDA_DO_DISCO.ate * d.raioExterno, r);
  return r ** (-2 * d.expoente) * h * Math.sqrt(Math.PI) * cauda;
}

/** ∫ ε dV do disco de gás com ρ0 = 1 (a gaussiana em z: ∫e^(−z²/H²)dz = H√π) */
export function integralDoDisco(d: Pick<DiscoDoMotor, 'raioExterno' | 'h0' | 'expoente'>): number {
  let s = 0;
  const fim = CAUDA_DO_DISCO.ate * d.raioExterno;
  const n = 8000;
  const h = (fim - 1) / n;
  for (let i = 0; i < n; i++) {
    const r = 1 + (i + 0.5) * h;
    s += 2 * Math.PI * r * colunaDoDisco(r, d) * h;
  }
  return s;
}

/** o ano (decimal) de uma data juliana: 2000 + (jd − 2451545)/365,25 */
export function anoDoJd(jd: number): number {
  return 2000 + (jd - 2451545) / 365.25;
}

/**
 * A FASE DO DISCO num ano, pela lista medida (linear entre as épocas).
 * Fora da janela vale a ponta mais próxima: o ciclo de uma Be não é regular
 * (Faes 2015), e nada de periodicidade inventada.
 */
export function faseDoDisco(epocas: readonly (readonly [number, number])[], ano: number): number {
  if (epocas.length === 0 || !Number.isFinite(ano)) return 0;
  if (ano <= epocas[0][0]) return epocas[0][1];
  for (let i = 1; i < epocas.length; i++) {
    const [a1, f1] = epocas[i];
    if (ano <= a1) {
      const [a0, f0] = epocas[i - 1];
      return a1 > a0 ? f0 + ((f1 - f0) * (ano - a0)) / (a1 - a0) : f1;
    }
  }
  return epocas[epocas.length - 1][1];
}

/** o disco da ficha em números de desenho */
export function discoDoMotor(d: DiscoDeGas, bordaU: number): DiscoDoMotor {
  const base = {
    raioExterno: d.raioExternoEmRaios.v,
    h0: Math.tan((d.meiaAberturaGraus.v * Math.PI) / 180),
    expoente: d.expoenteDaDensidade.v,
  };
  return {
    ...base,
    epocas: d.epocas.map((e) => [e.ano, e.fase] as const),
    normal: (GANHO_DO_GAS * fluxoDoDisco(bordaU)) / integralDoDisco(base),
  };
}

/** o vento de uma estrela da ficha (o medido pelo nome vence), ou null */
export function ventoDaFicha(e: EstrelaVisitavel): Vento | null {
  return ventoDe(e.nomeNoCatalogo, e.teffK.v, e.luminosidadeLsol.v, e.massaMsol.v, e.raioRsol.v);
}

/** a fração do vento que o motor desenharia (0 se abaixo do limiar de desenho ou sem vento) */
export function fracaoDesenhadaDoVento(e: EstrelaVisitavel): number {
  const v = ventoDaFicha(e);
  if (!v) return 0;
  const f = fracaoDoVento(v, e.raioRsol.v, e.teffK.v);
  return f >= LIMIAR_DE_DESENHO ? f : 0;
}

/** o gás de uma estrela em números de desenho, ou null (o texto do shader fica o de antes) */
export function gasDaEstrela(e: EstrelaVisitavel): GasDoMotor | null {
  const u = e.superficie.bordaU.v;
  const f = fracaoDesenhadaDoVento(e);
  const vento = f > 0 ? { fracao: f, normal: (f * fluxoDoDisco(u)) / integralDoVento() } : undefined;
  const disco = e.discoDeGas && GANHO_DO_GAS >= LIMIAR_DE_DESENHO ? discoDoMotor(e.discoDeGas, u) : undefined;
  if (!vento && !disco) return null;
  return { ...(vento ? { vento } : {}), ...(disco ? { disco } : {}) };
}
