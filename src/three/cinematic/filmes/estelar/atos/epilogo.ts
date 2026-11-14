// O EPÍLOGO DO FILME ESTELAR — a volta ao Sol. Pontos e números nomeados de
// `roteiros/estelar/epilogo.json`; ele parte de onde o Ato 5 pousa
// (`sistemaAberto`, TRAPPIST-1 visto do alto, rolado para deitar as órbitas).
import * as THREE from 'three';
import { R_SOL, UA, ate } from '../../solar/atos/geometria';
import { ESTRELAS_DO_FILME } from '../estrelas';
import { PONTOS_FICAM } from './ficam';

const SOL = new THREE.Vector3(0, 0, 0);
const TRAPPIST = ESTRELAS_DO_FILME['TRAPPIST-1'];

// ================= F1 — A VOLTA =================
// Como a saída de Próxima b: primeiro a câmera se afasta do sistema (a conta
// centrada na estrela, de 0,12 a `LONGE_DE_TRAPPIST` UA), de ré e virando
// para casa; depois os 12 pc centrados no Sol, de frente — ele nasce ponto
// amarelo e cresce — até `PERTO_DO_SOL` raios, freando.
const LONGE_DE_TRAPPIST = 300;
const PARA_CASA = ate(TRAPPIST, SOL);
const SAIDA_DE_TRAPPIST = TRAPPIST.clone().addScaledVector(PARA_CASA, LONGE_DE_TRAPPIST * UA);
/** a câmera chega pelo lado de TRAPPIST-1: no plano da eclíptica, o Sol de pé */
const DE_CASA_PARA_TRAPPIST = PARA_CASA.clone().negate();

// ================= F2 — NA METADE DO CAMINHO =================
// Não o voo rente do prólogo (lá a câmera subia um meridiano a 2,2 raios):
// aqui ela chega de frente, para, e recua devagar com o disco inteiro no
// quadro, de `PERTO_DO_SOL` a `RECUO` raios.
const PERTO_DO_SOL = 6;
const RECUO = 7.5;

/** os pontos nomeados do epílogo, em pc */
export const PONTOS_EPILOGO: Readonly<Record<string, THREE.Vector3>> = {
  saidaDeTrappist: SAIDA_DE_TRAPPIST,
  pertoDoSol: DE_CASA_PARA_TRAPPIST.clone().multiplyScalar(PERTO_DO_SOL * R_SOL),
  recuoDoSol: DE_CASA_PARA_TRAPPIST.clone().multiplyScalar(RECUO * R_SOL),
};

/** os números nomeados do epílogo */
export const NUMEROS_EPILOGO: Readonly<Record<string, number>> = {
  /** a lente do Sol: chega e fica nela */
  lenteDoSol: 40,
};

/** para os testes */
export const EPILOGO = { PERTO_DO_SOL, RECUO, partida: PONTOS_FICAM.sistemaAberto } as const;
