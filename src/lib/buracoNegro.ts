// ============================================================
// SAGITTARIUS A✱ EM ESCALA REAL — a física pura do buraco negro, sem
// three: os números da ficha (massa, horizonte, sombra) e a órbita de S2.
// O raio de Schwarzschild daqui é também o do buraco desenhado de perto
// (`three/world/blackHole.ts`).
//
// Tudo em unidades de raio de Schwarzschild (RS = 2GM/c² = 1) onde não
// se diz outra coisa. A massa vem da GRAVITY (2022); a distância é a da
// casa (R0 = 8.150 pc, Reid et al. 2019), que é onde a galáxia desenhada
// põe o centro — a sombra sai das duas.
// ============================================================
import { AU_KM } from './atlas/elementosOrbitais';
import { AU_PARA_PC } from './atlas/frameGalactico';
import { resolverKepler } from './atlas/kepler';

/** massa, M☉ — GRAVITY Collaboration 2022, A&A 657, L12 (±0,25 %) */
export const MASSA_SGR_A_MSOL = 4.3e6;
/** 2GM/c² por massa solar, km (IAU: GM☉ = 1,327 124 4e20 m³/s²) */
const RS_POR_MSOL_KM = 2.953_250_077;
/** o raio de Schwarzschild de Sgr A✱ em km, em UA e em pc — a conta de
 *  `kmParaPc` (`three/escala.ts`), letra a letra: o cadastro de escala
 *  cobra fator 1 exato deste número */
export const RS_SGR_A_KM = RS_POR_MSOL_KM * MASSA_SGR_A_MSOL;
export const RS_SGR_A_UA = RS_SGR_A_KM / AU_KM;
export const RS_SGR_A_PC = RS_SGR_A_UA * AU_PARA_PC;
/** a distância da casa ao centro, pc (Reid et al. 2019, a de `medidasDaGalaxia`) */
export const DISTANCIA_SGR_A_PC = 8150;

/** o parâmetro de impacto crítico, em RS: b_c = (3√3/2)·RS — a borda da sombra */
export const B_CRITICO = (3 * Math.sqrt(3)) / 2;

/** o diâmetro angular da sombra visto de longe, µas: 2·b_c·RS/D */
export function sombraEmMicroArcsec(distanciaPc: number = DISTANCIA_SGR_A_PC): number {
  const rad = (2 * B_CRITICO * RS_SGR_A_PC) / distanciaPc;
  return rad * (180 / Math.PI) * 3600e6;
}

// ---- S2 --------------------------------------------------------------

/**
 * A ÓRBITA DE S2 — GRAVITY Collaboration 2020, A&A 636, L5, tabela E.1
 * (a em mas na R0 deles, 8.246,7 pc; o semieixo físico sai daí).
 */
export const ORBITA_S2 = {
  aMas: 125.058,
  r0DaFontePc: 8246.7,
  e: 0.884649,
  iGraus: 134.567,
  omegaGrandeGraus: 228.171,
  omegaGraus: 66.263,
  periodoAnos: 16.0455,
  periastroAno: 2018.379,
} as const;

/** semieixo de S2, UA (1″ a 1 pc = 1 UA) */
export const A_S2_UA = (ORBITA_S2.aMas / 1000) * ORBITA_S2.r0DaFontePc;
export const PERIASTRO_S2_UA = A_S2_UA * (1 - ORBITA_S2.e);
export const APOASTRO_S2_UA = A_S2_UA * (1 + ORBITA_S2.e);

/**
 * S2 no ano decimal dado, em UA, nos eixos do CÉU visto do Sol:
 * [norte, leste, para longe de nós] (convenção de Thiele–Innes).
 */
export function posicaoDeS2NoCeu(ano: number): [number, number, number] {
  const o = ORBITA_S2;
  const g = Math.PI / 180;
  const M = (2 * Math.PI * (ano - o.periastroAno)) / o.periodoAnos;
  const E = resolverKepler(M, o.e);
  const nu = 2 * Math.atan2(Math.sqrt(1 + o.e) * Math.sin(E / 2), Math.sqrt(1 - o.e) * Math.cos(E / 2));
  const r = A_S2_UA * (1 - o.e * Math.cos(E));
  const u = nu + o.omegaGraus * g;
  const W = o.omegaGrandeGraus * g;
  const i = o.iGraus * g;
  return [
    r * (Math.cos(u) * Math.cos(W) - Math.sin(u) * Math.sin(W) * Math.cos(i)),
    r * (Math.cos(u) * Math.sin(W) + Math.sin(u) * Math.cos(W) * Math.cos(i)),
    r * Math.sin(u) * Math.sin(i),
  ];
}

/** distância de S2 ao buraco no ano dado, UA */
export function distanciaDeS2(ano: number): number {
  const p = posicaoDeS2NoCeu(ano);
  return Math.hypot(p[0], p[1], p[2]);
}
