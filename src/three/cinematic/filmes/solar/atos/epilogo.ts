// O EPÍLOGO DO FILME SOLAR — a mesma luz (cena 24): do retrato de família,
// a 40 UA, o filme CORTA para casa, e o Sol nasce sobre o limbo azul da
// Terra. Pontos e números nomeados de `roteiros/solar/epilogo.json`.
import * as THREE from 'three';
import { CIMA_DA_ECLIPTICA, R_TERRA, SOL, TERRA, girar, perpendicular, rad, versor } from './geometria';

// ================= EPÍLOGO — A MESMA LUZ =================
// O nascer do Sol visto da órbita, no céu de JD_A (a Terra no pino). S
// aponta o Sol; NORTE é o norte da eclíptica (o cima do filme) ⊥ a S. A
// câmera sobe o meridiano da eclíptica que passa pelo ponto antissolar,
// para o norte — o mesmo gesto do prólogo, que subia o meridiano do Sol
// com o horizonte nivelado no ALTO do quadro; aqui o horizonte é o limbo
// da Terra, nivelado EMBAIXO, sem rolar a câmera, porque câmera, centro
// da Terra e Sol ficam no plano vertical do quadro. A `graus` do ponto
// antissolar e a `raio` raios, o Sol fica a (graus − ρ) acima do limbo,
// ρ = asin(1/raio) o raio aparente da Terra: o arco cruza ρ e o Sol sai
// de trás da Terra. A mira acompanha o limbo — fica sempre `c` graus
// acima dele, e girada para a esquerda em torno do cima —, então o limbo
// para no quadro e o Sol sobe por ele, no terço da direita.
const S = versor(SOL.clone().sub(TERRA));
const NORTE = perpendicular(CIMA_DA_ECLIPTICA, S);
const NOITE = S.clone().negate();
/** a direção, do centro da Terra, a `graus` do ponto antissolar, para o norte da eclíptica */
const naSubida = (graus: number) => girar(NOITE, NORTE, graus);
/** a direção a `graus` acima do Sol (negativo: abaixo), no plano vertical do quadro */
const acimaDoSol = (graus: number) => girar(S, NORTE, graus);

/**
 * O NASCER DO SOL: a distância ao centro da Terra (raios), a lente
 * (vertical, graus), onde o limbo fica no quadro (fração da meia altura,
 * negativa = abaixo do centro), quanto o Sol está escondido atrás dele no
 * começo (graus), onde ele termina no quadro (fração da meia altura) e a
 * que lado ele nasce (fração da meia largura do quadro de 16:9).
 * A lente é a do fim do retrato (12°): o Sol, a 1 UA, toma 0,54° — 32 px
 * num quadro de 720 —, e a 2,5 raios o limbo atravessa 87% da largura na
 * borda de baixo. O Sol nasce no terço da direita e o limbo, a 70% da
 * meia altura abaixo do centro, desce para a esquerda: assim o nascer
 * fica longe dos botões do filme (embaixo, no meio) e o limbo passa
 * sob as legendas (embaixo, à esquerda) — medido na gravação de 06/10.
 */
export const MESMA_LUZ = {
  raio: 2.5, lente: 12, limbo: -0.7, escondido: 0.6, solNoFim: 0.15, aDireita: 1 / 3,
} as const;
/** o raio aparente da Terra vista da câmera, em graus */
export const RHO = THREE.MathUtils.radToDeg(Math.asin(1 / MESMA_LUZ.raio));
const MEIA_ALTURA = Math.tan(rad(MESMA_LUZ.lente / 2));
/** o giro da mira para a esquerda do Sol, em torno do cima: põe o Sol em `aDireita` */
const GIRO = Math.atan(MESMA_LUZ.aDireita * MEIA_ALTURA * 16 / 9);
/** a altura, em graus, que cai a `fracao` da meia altura do centro do quadro, na coluna do Sol */
const naColunaDoSol = (fracao: number) =>
  THREE.MathUtils.radToDeg(Math.atan(fracao * MEIA_ALTURA * Math.cos(GIRO)));
/** quanto a mira fica acima do limbo, em graus */
const ACIMA_DO_LIMBO = naColunaDoSol(-MESMA_LUZ.limbo);
/** o Sol acima do limbo, em graus, no começo e no fim do plano */
export const SOL_SOBRE_O_LIMBO = {
  de: -MESMA_LUZ.escondido,
  ate: ACIMA_DO_LIMBO + naColunaDoSol(MESMA_LUZ.solNoFim),
} as const;
/** a mira para o Sol a `e` graus acima do limbo: `c − e` acima do Sol,
 *  girada `GIRO` para a esquerda, à distância do Sol */
const miraComOSolA = (e: number) => TERRA.clone().addScaledVector(
  acimaDoSol(ACIMA_DO_LIMBO - e).applyAxisAngle(NORTE, GIRO), TERRA.length());

/** os pontos nomeados do epílogo, em pc */
export const PONTOS_EPILOGO: Readonly<Record<string, THREE.Vector3>> = {
  mesmaLuzDe: naSubida(RHO + SOL_SOBRE_O_LIMBO.de), mesmaLuzPara: naSubida(RHO + SOL_SOBRE_O_LIMBO.ate),
  miraDaMesmaLuzDe: miraComOSolA(SOL_SOBRE_O_LIMBO.de), miraDaMesmaLuzPara: miraComOSolA(SOL_SOBRE_O_LIMBO.ate),
};

/** os números nomeados do epílogo: a distância em pc e a lente em graus */
export const NUMEROS_EPILOGO: Readonly<Record<string, number>> = {
  raioDaMesmaLuz: MESMA_LUZ.raio * R_TERRA, lenteDaMesmaLuz: MESMA_LUZ.lente,
};
