// O PRÓLOGO DO FILME ESTELAR — o Sol na metade da vida, e a pergunta que
// leva a Órion. Pontos e números nomeados de `roteiros/estelar/prologo.json`.
//
// O MOLDE PARA OS ATOS: cada lugar do quadro é um PONTO com nome (um
// Vector3 em pc), cada distância ou ângulo que o roteiro usa é um NÚMERO com
// nome; o JSON só fala esses nomes, e a conta de onde eles vêm mora aqui, com
// o porquê ao lado. Estrelas e lugares já são pontos sem escrever nada
// (`../estrelas.ts`, os ids da Busca em `../montar.ts`).
import * as THREE from 'three';
import { CIMA_DA_ECLIPTICA, EQUINOCIO, R_SOL, UA, girar, versor } from '../../solar/atos/geometria';
import { ESTRELAS_DO_FILME } from '../estrelas';

// ================= P1 — O SOL, RENTE =================
// O mesmo chão do prólogo do solar, que o dono aprovou: o meridiano da
// eclíptica que passa pelo equinócio (+X), onde o Sol desenhado tem as
// faixas de manchas, subindo para o norte — o cima do filme —, o horizonte
// nivelado sem rolar. Mais curto (8 s): o voo cobre 26° em vez de 36°, e não
// desce de 2,2 raios (a régua de 05/10: abaixo de 1,5 raio vira borrão).
/** a direção no meridiano do voo, `graus` ao norte da eclíptica */
const noMeridiano = (graus: number) => girar(EQUINOCIO, CIMA_DA_ECLIPTICA, graus);
const VOO_DO_SOL = { de: -40, para: -14, raioDe: 2.6 * R_SOL, raioPara: 2.2 * R_SOL };
/** a mira, no chão: começa quase sob a câmera, acaba logo aquém do limbo */
const MIRA_DO_VOO_DO_SOL = { de: -33, para: 16 };
const FIM_DO_VOO_DO_SOL = noMeridiano(VOO_DO_SOL.para).multiplyScalar(VOO_DO_SOL.raioPara);

// ================= P2 e P3 — ÓRION VISTA DE CASA =================
// A câmera sai do Sol de RÉ, olhando o disco encolher (tamanho = afastar), e
// vira para Órion; pousa no MIRANTE, na reta Sol→Órion, com o Sol bem atrás
// dela: de lá Órion é a de qualquer quintal (2.000 UA não mudam paralaxe
// nenhuma a 150 pc), e nada do Sol entra no quadro. A direção do voo gira do
// meridiano do P1 para a de Órion devagar no começo (`launch` no JSON): perto
// do Sol isso seria órbita; longe, é só rumo.
/** o centro da figura de Órion vista daqui: Alnilam, a do meio do cinturão */
const RUMO_DE_ORION = versor(ESTRELAS_DO_FILME.Alnilam);
const DISTANCIA_DO_MIRANTE = 2000 * UA;
const MIRANTE = RUMO_DE_ORION.clone().multiplyScalar(DISTANCIA_DO_MIRANTE);

/** os pontos nomeados do prólogo, em pc */
export const PONTOS_PROLOGO: Readonly<Record<string, THREE.Vector3>> = {
  vooDoSolDe: noMeridiano(VOO_DO_SOL.de),
  vooDoSolPara: noMeridiano(VOO_DO_SOL.para),
  miraDoVooDoSolDe: noMeridiano(MIRA_DO_VOO_DO_SOL.de).multiplyScalar(R_SOL),
  miraDoVooDoSolPara: noMeridiano(MIRA_DO_VOO_DO_SOL.para).multiplyScalar(R_SOL),
  fimDoVooDoSol: FIM_DO_VOO_DO_SOL,
  mirante: MIRANTE,
};

/** os números nomeados do prólogo: distâncias em pc */
export const NUMEROS_PROLOGO: Readonly<Record<string, number>> = {
  raioDoVooDoSolDe: VOO_DO_SOL.raioDe,
  raioDoVooDoSolPara: VOO_DO_SOL.raioPara,
};
