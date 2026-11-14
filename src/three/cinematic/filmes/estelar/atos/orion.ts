// O ATO 2 DO FILME ESTELAR — A NEBULOSA DE ÓRION, onde se nasce. Pontos e
// números nomeados de `roteiros/estelar/orion.json`, no molde do prólogo.
//
// O REFERENCIAL é o do modelo da nebulosa (`world/nebulosaDeOrion.ts`):
// origem em θ¹ Ori C, x = leste, y = norte no céu, z = rumo ao Sol. Ali a
// parede da nuvem é uma tigela de frente para o Sol, com a borda baixa a
// sudoeste — por onde a cavidade se abre — e a bolha do vento deslocada
// para sudoeste. O "cima" do filme (polo da eclíptica) cai a 29° do norte
// local: M43, ao norte, fica no alto do quadro.
import * as THREE from 'three';
import { CENTRO_DE_ORION, REFERENCIAL_DE_ORION } from '../../../../world/nebulosaDeOrion';

const CENTRO = new THREE.Vector3(...CENTRO_DE_ORION);
const { leste, norte, rumoAoSol } = REFERENCIAL_DE_ORION;
/** um ponto do referencial local (pc) na cena */
const local = (x: number, y: number, z: number) => CENTRO.clone()
  .addScaledVector(new THREE.Vector3(...leste), x)
  .addScaledVector(new THREE.Vector3(...norte), y)
  .addScaledVector(new THREE.Vector3(...rumoAoSol), z);

// ================= B2–B3 — O LADO ABERTO =================
// A tigela abre para o Sol: vista da reta Sol → estrela, ela é a forma das
// fotos — o leque curto a nordeste, o longo a sudoeste, M43 separada ao
// norte (conferido por foto contra duas vistas inclinadas para sudoeste, que
// achatam a tigela num olho de bordas riscadas). B2 olha dali quase parado,
// a 9 pc; B3 entra de frente até a boca da tigela, a ~3 pc da estrela, um
// pouco a sudoeste, por onde a borda é baixa.
const FORA = { de: 9, para: 8.4 };
const BOCA = local(-0.5, -0.8, 3.0);

// ================= B4 — NA BOCA DA TIGELA =================
// Um travelling lateral de sudoeste para sudeste, a ~3 pc, com o Trapézio
// no centro e as paredes em volta, deslizando contra ele (paralaxe). Mais
// fundo não serve: a 2 pc ou menos o gás em volta da câmera enche o quadro
// de névoa clara e o Trapézio some (fotos de 14/11, `e1/b4-50-t5.jpg`).
const FIM_DA_BOCA = local(0.4, -0.9, 2.7);

/** os pontos nomeados do Ato 2, em pc */
export const PONTOS_ORION: Readonly<Record<string, THREE.Vector3>> = {
  orionDeFora: local(0, 0, FORA.de),
  orionDeForaPerto: local(0, 0, FORA.para),
  bocaDeOrion: BOCA,
  fimDaBocaDeOrion: FIM_DA_BOCA,
};
