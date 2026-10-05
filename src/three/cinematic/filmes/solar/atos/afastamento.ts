// O ATO IV DO FILME SOLAR — o afastamento: o recuo de Saturno, o ponto azul
// pálido e o fecho. Pontos e números nomeados de `roteiros/solar/afastamento.json`.
import * as THREE from 'three';
import { EZ } from '../../../../world/baseGalactica';
import { SATURNO, TERRA, UA, ate, versor } from './geometria';
import { POSTAL_2 } from './saturno';

// ================= ATO IV — O AFASTAMENTO =================
// Tudo se alinha por uma direção G do PLANO GALÁCTICO: o fecho recua do
// Sol por ela olhando o Sol, então a faixa da Via Láctea atravessa o
// quadro passando por ele. G fica a 90° da Terra (vista do Sol), para o
// ponto azul pálido sair o mais longe possível do clarão, do lado de
// Saturno. A saída recua de Saturno em linha reta pelo lado do dia (o
// mesmo rumo do fim do postal) até 0,3 UA; daí o cruzeiro abre até
// 38,5 UA por G, e Saturno e o Sol vão se juntando no quadro.
const G_DO_AFASTAMENTO = (() => {
  const g = versor(new THREE.Vector3().crossVectors(EZ, versor(TERRA)));
  return g.dot(SATURNO) > 0 ? g : g.negate();
})();
const SAIDA_DE_SATURNO = SATURNO.clone().addScaledVector(ate(SATURNO, POSTAL_2), 0.3 * UA);
export const D_INICIO_DA_TRASEIRA_UA = 38.5;
export const D_FIM_DA_TRASEIRA_UA = 41;
const AFASTAMENTO = G_DO_AFASTAMENTO.clone().multiplyScalar(D_INICIO_DA_TRASEIRA_UA * UA);
const PONTO_AZUL = G_DO_AFASTAMENTO.clone().multiplyScalar(D_FIM_DA_TRASEIRA_UA * UA);
/** onde o fecho pousa, em pc do Sol, no mesmo rumo: a 1 pc o Sol tem
 *  magnitude −0,2 — uma estrela entre as mais brilhantes, não um disco */
export const D_DO_FECHO_PC = 1;
const ENTRE_ESTRELAS = G_DO_AFASTAMENTO.clone().multiplyScalar(D_DO_FECHO_PC);

/** os pontos nomeados do ato IV, em pc */
export const PONTOS_AFASTAMENTO: Readonly<Record<string, THREE.Vector3>> = {
  saidaDeSaturno: SAIDA_DE_SATURNO, afastamento: AFASTAMENTO, pontoAzul: PONTO_AZUL,
  entreEstrelas: ENTRE_ESTRELAS,
};

/** o ato IV não tem números nomeados */
export const NUMEROS_AFASTAMENTO: Readonly<Record<string, number>> = {};
