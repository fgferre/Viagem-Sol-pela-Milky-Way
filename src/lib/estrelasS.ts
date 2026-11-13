// ============================================================
// AS ESTRELAS S — as estrelas que giram em volta de Sagittarius A✱
// (13/11/2026). Não estão no catálogo da casa: a 8 kpc, atrás de ~30
// magnitudes de poeira, só se veem no infravermelho, e nenhum catálogo
// visual as tem. A fonte é outra: as órbitas ajustadas a décadas de
// astrometria no infravermelho próximo.
//
// AS ÓRBITAS:
//   - S2: GRAVITY Collaboration 2020 (A&A 636, L5, tabela E.1), a mesma
//     de `buracoNegro.ts` (`ORBITA_S2`) — uma órbita, um dono;
//   - as outras: Gillessen et al. 2017 (ApJ 837, 30; arXiv:1611.09144),
//     tabela "Orbital parameters of the 40 stars", ajustadas no potencial
//     do ajuste "combinado" de S2 (R0 = 8,33 kpc, linha 3 da tabela de
//     ajustes). Entram as de tipo ESPECTRAL CEDO ('e', estrelas B) com
//     a < 1″ — o aglomerado S propriamente dito. As tardias (gigantes
//     vermelhas) e as sem tipo ficam de fora: a cor delas pediria uma
//     temperatura que nenhuma fonte aberta aqui dá.
//
// A CONVENÇÃO (a mesma de Sirius B, `posicaoDaCompanheira`): Thiele–Innes
// no céu visto do Sol — [norte, leste, para longe de nós] —, Ω contado do
// norte para o leste, e o nodo ascendente é onde a estrela se AFASTA de
// nós. Conferida contra a figura 2 de GRAVITY 2018 (arXiv:1807.09409): a
// velocidade radial de S2 sobe a +4.000 km/s antes do periastro de maio
// de 2018 e cai a −2.000 km/s depois (`estrelasS.test.ts`).
//
// O TAMANHO FÍSICO: o semieixo em segundos de arco vezes o R0 DA PRÓPRIA
// FONTE (8.246,7 pc para S2, 8.330 pc para as outras) — o par (a, P) de
// cada artigo é dinamicamente coerente só na distância dele. A casa põe
// o centro a 8.150 pc (Reid et al. 2019); vistas da Terra as órbitas
// saem ~1–2 % maiores no céu do que no artigo, e é só isso que muda.
//
// O BRILHO: Teff e raio MEDIDOS (espectro + modelos) para S1, S2, S4, S6,
// S8, S9 e S12 (Habibi et al. 2017, ApJ 847, 120, tabela de parâmetros).
// As outras são DERIVADAS de S9 pela magnitude K: mesma temperatura,
// raio escalado por 10^(−0,2·ΔmK) — todas são estrelas B da mesma
// família, e a poeira até elas é a mesma.
// ============================================================
import type { Orbita } from './atlas/estrelasVisitaveis';
import { posicaoDaCompanheira } from './atlas/estrelasVisitaveis';
import { ORBITA_S2 } from './buracoNegro';

/** R0 do ajuste combinado de Gillessen et al. 2017 (linha 3), pc */
const R0_GILLESSEN_2017_PC = 8330;
const FONTE_G17 = 'Gillessen et al. 2017 (ApJ 837, 30)';

export interface EstrelaS {
  /** o nome do artigo (S2 = "S0-2" na nomenclatura da UCLA) */
  readonly nome: string;
  readonly orbita: Orbita;
  /** o R0 em que o semieixo angular vira UA, pc */
  readonly r0DaFontePc: number;
  /** magnitude K observada (a tabela das órbitas) */
  readonly mK: number;
  readonly teffK: number;
  readonly raioRsol: number;
  /** Teff e raio medidos (Habibi 2017) ou derivados de S9 pela mK */
  readonly fisicaMedida: boolean;
}

/** os parâmetros físicos medidos — Habibi et al. 2017, ApJ 847, 120 */
const MEDIDAS_HABIBI: Readonly<Record<string, { teffK: number; raioRsol: number }>> = {
  S1: { teffK: 27450, raioRsol: 5.19 },
  S2: { teffK: 28513, raioRsol: 5.53 },
  S4: { teffK: 27288, raioRsol: 5.23 },
  S6: { teffK: 22932, raioRsol: 4.51 },
  S8: { teffK: 28274, raioRsol: 5.11 },
  S9: { teffK: 22202, raioRsol: 3.89 },
  S12: { teffK: 20882, raioRsol: 4.07 },
};
/** a âncora das derivadas: S9 (a mK dela na tabela das órbitas) */
const MK_DE_S9 = 15.1;

// [nome, a″, e, i°, Ω°, ω°, tP (ano), T (anos), mK] — Gillessen et al.
// 2017, tabela das órbitas, as de tipo 'e' com a < 1″, exceto S2 (abaixo)
const TABELA_G17: readonly (readonly [string, number, number, number, number, number, number, number, number])[] = [
  ['S1', 0.595, 0.556, 119.14, 342.04, 122.3, 2001.8, 166.0, 14.7],
  ['S4', 0.357, 0.3905, 80.33, 258.84, 290.8, 1957.4, 77.0, 14.4],
  ['S6', 0.6574, 0.84, 87.24, 85.07, 116.23, 2108.61, 192.0, 15.4],
  ['S8', 0.4047, 0.8031, 74.37, 315.43, 346.7, 1983.64, 92.9, 14.5],
  ['S9', 0.2724, 0.644, 82.41, 156.6, 150.6, 1976.71, 51.3, 15.1],
  ['S12', 0.2987, 0.8883, 33.56, 230.1, 317.9, 1995.59, 58.9, 15.5],
  ['S13', 0.2641, 0.425, 24.7, 74.5, 245.2, 2004.86, 49.0, 15.8],
  ['S14', 0.2863, 0.9761, 100.59, 226.38, 334.59, 2000.12, 55.3, 15.7],
  ['S18', 0.2379, 0.471, 110.67, 49.11, 349.46, 1993.86, 41.9, 16.7],
  ['S19', 0.52, 0.75, 71.96, 344.6, 155.2, 2005.39, 135, 16.0],
  ['S23', 0.253, 0.56, 48.0, 249, 39.0, 2024.7, 45.8, 17.8],
  ['S29', 0.428, 0.728, 105.8, 161.96, 346.5, 2025.96, 101.0, 16.7],
  ['S31', 0.449, 0.5497, 109.03, 137.16, 308.0, 2018.07, 108, 15.7],
  ['S42', 0.95, 0.567, 67.16, 196.14, 35.8, 2008.24, 335, 17.5],
  ['S60', 0.3877, 0.7179, 126.87, 170.54, 29.37, 2023.89, 87.1, 16.3],
  ['S71', 0.973, 0.899, 74.0, 35.16, 337.8, 1695, 346, 16.1],
  ['S175', 0.414, 0.9867, 88.53, 326.83, 68.52, 2009.51, 96.2, 17.5],
];

function fisicaDe(nome: string, mK: number): Pick<EstrelaS, 'teffK' | 'raioRsol' | 'fisicaMedida'> {
  const medida = MEDIDAS_HABIBI[nome];
  if (medida) return { ...medida, fisicaMedida: true };
  const s9 = MEDIDAS_HABIBI.S9;
  return { teffK: s9.teffK, raioRsol: s9.raioRsol * 10 ** (-0.2 * (mK - MK_DE_S9)), fisicaMedida: false };
}

const S2: EstrelaS = {
  nome: 'S2',
  orbita: {
    periodoAnos: ORBITA_S2.periodoAnos,
    periastroAno: ORBITA_S2.periastroAno,
    aSegArco: ORBITA_S2.aMas / 1000,
    e: ORBITA_S2.e,
    iGraus: ORBITA_S2.iGraus,
    nodoGraus: ORBITA_S2.omegaGrandeGraus,
    argPeriastroGraus: ORBITA_S2.omegaGraus,
    fonte: 'GRAVITY Collaboration 2020 (A&A 636, L5)',
  },
  r0DaFontePc: ORBITA_S2.r0DaFontePc,
  mK: 13.95,
  ...fisicaDe('S2', 13.95),
};

/** as estrelas S desenhadas, S2 primeiro */
export const ESTRELAS_S: readonly EstrelaS[] = [
  S2,
  ...TABELA_G17.map(([nome, a, e, i, W, w, tP, T, mK]) => ({
    nome,
    orbita: {
      periodoAnos: T,
      periastroAno: tP,
      aSegArco: a,
      e,
      iGraus: i,
      nodoGraus: W,
      argPeriastroGraus: w,
      fonte: FONTE_G17,
    },
    r0DaFontePc: R0_GILLESSEN_2017_PC,
    mK,
    ...fisicaDe(nome, mK),
  })),
];

/** o dia juliano de um ano decimal (a régua de `posicaoDaCompanheira`) */
export function jdDoAno(ano: number): number {
  return 2451545 + (ano - 2000) * 365.25;
}

/**
 * Onde a estrela está em relação a Sgr A✱ no dia juliano `jd`, em pc, nos
 * eixos da CENA (equatorial J2000). `direcaoDoCentro` é o vetor unitário
 * Sol→Sgr A✱ da cena: é nele que a base do céu (norte, leste, fundo) se
 * apoia.
 */
export function posicaoDaEstrelaS(
  jd: number,
  estrela: EstrelaS,
  direcaoDoCentro: readonly [number, number, number]
): [number, number, number] {
  return posicaoDaCompanheira(jd, estrela.orbita, direcaoDoCentro, estrela.r0DaFontePc);
}
