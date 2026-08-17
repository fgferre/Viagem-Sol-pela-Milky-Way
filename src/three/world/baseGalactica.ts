// ============================================================
// A BASE GALÁCTICA da cena — o frame galactocêntrico em THREE.
//
// GAL (direções e distâncias medidas), a tríade EX/EY/EZ e o ÚNICO
// caminho válido binário→cena (galactocentricToScene). Morava em
// galaxy.ts; saiu porque journey, blackHole, labels, observedClouds e
// starForges importavam 1.192 linhas para usar 4 vetores. A variante
// zero-THREE mora em lib/atlas/frameGalactico.ts (contrato próprio).
// ============================================================
import * as THREE from 'three';
import { GALACTIC_MODEL } from '../cartography/galacticModel';

export const GAL = {
  /** direção Sol → centro galáctico (Sgr A*, equatorial) */
  DIR_GC: new THREE.Vector3(-0.0548755604, -0.8734370902, -0.4838350155),
  /** polo galáctico norte (equatorial) */
  NGP: new THREE.Vector3(-0.867666149, -0.1980763734, 0.4559837762),
  /** distância Sol → centro (pc) */
  R_SUN: GALACTIC_MODEL.sunRadiusPc,
  /** raio do disco estelar procedural (pc) */
  DISK_RADIUS: GALACTIC_MODEL.diskRadiusPc,
  /** posição do centro galáctico na cena */
  GC_POS: new THREE.Vector3(),
};
GAL.GC_POS
  .copy(GAL.DIR_GC)
  .multiplyScalar(GAL.R_SUN)
  .addScaledVector(GAL.NGP, -GALACTIC_MODEL.sunHeightPc);

// base galactocêntrica: X aponta do centro para o Sol, Z é o polo norte.
// Exportada porque é o ÚNICO caminho válido binário→cena: os ativos de
// public/data/galaxy usam exatamente esta base (+Y → l=270°).
export const EZ = GAL.NGP.clone().normalize();
export const EX = GAL.DIR_GC.clone().negate().addScaledVector(EZ, GAL.DIR_GC.dot(EZ)).normalize();
export const EY = new THREE.Vector3().crossVectors(EZ, EX).normalize();

/** Converte coordenadas galactocêntricas do projeto (pc) para a cena. */
export function galactocentricToScene(
  lx: number,
  ly: number,
  lz: number,
  out: THREE.Vector3
): THREE.Vector3 {
  return out.set(
    GAL.GC_POS.x + EX.x * lx + EY.x * ly + EZ.x * lz,
    GAL.GC_POS.y + EX.y * lx + EY.y * ly + EZ.y * lz,
    GAL.GC_POS.z + EX.z * lx + EY.z * ly + EZ.z * lz
  );
}
