// O PRÓLOGO DO FILME SOLAR — o fogo: a superfície do Sol, o disco inteiro e
// a partida. Pontos e números nomeados de `roteiros/solar/prologo.json`.
import * as THREE from 'three';
import { CIMA_DA_ECLIPTICA, EQUINOCIO, R_SOL, girar } from './geometria';

// ================= PRÓLOGO — O FOGO =================
// O Sol é a origem. O Sol desenhado gira no Y da cena (`stellarBody.ts`,
// não pelo polo IAU), então as faixas de manchas ficam perto do plano
// y = 0; o +X da cena (o equinócio) está nesse plano E no da eclíptica.
// O voo sobe o meridiano da eclíptica que passa pelo +X, para o norte —
// o cima do filme —, e por isso o horizonte entra NIVELADO no alto do
// quadro sem rolar a câmera. A régua das fotos de 05/10 (`sol-de-perto`):
// a 2 raios com lente de 58° a rede fica nítida; com 25°, 2 raios é o
// limite; abaixo de 1,5 raio vira borrão — o voo não desce de 2 raios.
/** a direção no meridiano do voo, `graus` ao norte da eclíptica */
const noMeridiano = (graus: number) => girar(EQUINOCIO, CIMA_DA_ECLIPTICA, graus);
/** o voo rasante: desce de 2,6 a 2,12 raios subindo o meridiano */
const VOO_DO_SOL = { de: -46, para: -10, raioDe: 2.6 * R_SOL, raioPara: 2.12 * R_SOL };
/** a mira do voo, na superfície: no começo o chão quase sob a câmera (a
 *  granulação enche o quadro); no fim o chão logo aquém do limbo, que
 *  fica no alto do quadro com a franja vermelha e a coroa */
const MIRA_DO_VOO_DO_SOL = { de: -39.5, para: 20.6 };
const FIM_DO_VOO_DO_SOL = noMeridiano(VOO_DO_SOL.para).multiplyScalar(VOO_DO_SOL.raioPara);
/** o recuo pousa aqui: o disco inteiro, visto do equador do Sol desenhado,
 *  a 5 raios (com a lente de 50°, o disco toma ~46% da altura do quadro e
 *  as manchas ainda se leem) */
const DISCO_DO_SOL = noMeridiano(0).multiplyScalar(5 * R_SOL);

/** os pontos nomeados do prólogo, em pc */
export const PONTOS_PROLOGO: Readonly<Record<string, THREE.Vector3>> = {
  vooDoSolDe: noMeridiano(VOO_DO_SOL.de), vooDoSolPara: noMeridiano(VOO_DO_SOL.para),
  miraDoVooDoSolDe: noMeridiano(MIRA_DO_VOO_DO_SOL.de).multiplyScalar(R_SOL),
  miraDoVooDoSolPara: noMeridiano(MIRA_DO_VOO_DO_SOL.para).multiplyScalar(R_SOL),
  fimDoVooDoSol: FIM_DO_VOO_DO_SOL, discoDoSol: DISCO_DO_SOL,
};

/** os números nomeados do prólogo: distâncias em pc */
export const NUMEROS_PROLOGO: Readonly<Record<string, number>> = {
  raioDoVooDoSolDe: VOO_DO_SOL.raioDe, raioDoVooDoSolPara: VOO_DO_SOL.raioPara,
};
