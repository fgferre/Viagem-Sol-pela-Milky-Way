// ============================================================
// A BASE GALÁCTICA da cena — o frame galactocêntrico em THREE.
//
// GAL (direções e distâncias medidas), a tríade EX/EY/EZ e o ÚNICO
// caminho válido binário→cena (galactocentricToScene). Morava em
// galaxy.ts; saiu porque journey, blackHole, labels, observedClouds e
// starForges importavam 1.192 linhas para usar 4 vetores. As medidas
// de ancoragem vêm da FOLHA medidasDaGalaxia (corte 10 — importar o
// modelo inteiro de 932 linhas por três números era o mesmo
// desperdício voltando pela porta dos fundos). A variante zero-THREE
// mora em lib/atlas/frameGalactico.ts (contrato próprio).
//
// E o ENVELOPE DO DISCO (`dentroDoDisco`), que é a mesma base lida como
// pergunta: "este ponto ainda está dentro da galáxia?". Subiu para cá
// em 21/08, quando ganhou o segundo leitor — o roteiro, que precisa do
// segundo em que a viagem sai (ver `T_SAIDA_DO_DISCO`).
// ============================================================
import * as THREE from 'three';
import { MEDIDAS_DA_GALAXIA } from '../cartography/medidasDaGalaxia';

export const GAL = {
  /** direção Sol → centro galáctico (Sgr A*, equatorial) */
  DIR_GC: new THREE.Vector3(-0.0548755604, -0.8734370902, -0.4838350155),
  /** polo galáctico norte (equatorial) */
  NGP: new THREE.Vector3(-0.867666149, -0.1980763734, 0.4559837762),
  /** distância Sol → centro (pc) */
  R_SUN: MEDIDAS_DA_GALAXIA.sunRadiusPc,
  /** raio do disco estelar procedural (pc) */
  DISK_RADIUS: MEDIDAS_DA_GALAXIA.diskRadiusPc,
  /** posição do centro galáctico na cena */
  GC_POS: new THREE.Vector3(),
};
GAL.GC_POS
  .copy(GAL.DIR_GC)
  .multiplyScalar(GAL.R_SUN)
  .addScaledVector(GAL.NGP, -MEDIDAS_DA_GALAXIA.sunHeightPc);

// base galactocêntrica: X aponta do centro para o Sol, Z é o polo norte.
// Exportada porque é o ÚNICO caminho válido binário→cena: os ativos de
// public/data/galaxy usam exatamente esta base (+Y → l=270°).
export const EZ = GAL.NGP.clone().normalize();
export const EX = GAL.DIR_GC.clone().negate().addScaledVector(EZ, GAL.DIR_GC.dot(EZ)).normalize();
export const EY = new THREE.Vector3().crossVectors(EZ, EX).normalize();

/**
 * QUANTO A CÂMERA AINDA ESTÁ DENTRO DO DISCO — 1 dentro, 0 fora, com as
 * duas bordas suaves (espessura 600→2100 pc, raio 16.800→20.500 pc). É o
 * envelope que liga o ambiente local (nebulosa, faixa interna) e apaga o
 * cartão da galáxia, e a Via Láctea não é um plano: a conta é em R e z
 * galactocêntricos, nunca na distância do Sol.
 *
 * Mora AQUI, e não no tick do director, porque tem dois leitores: o
 * quadro (que decide o que desenhar) e o roteiro (que precisa saber em
 * que segundo a viagem sai do disco — `T_SAIDA_DO_DISCO`, journey.ts).
 * Duas cópias da mesma conta divergiriam no primeiro ajuste de borda.
 */
export function dentroDoDisco(pos: THREE.Vector3): number {
  const qx = pos.x - GAL.GC_POS.x;
  const qy = pos.y - GAL.GC_POS.y;
  const qz = pos.z - GAL.GC_POS.z;
  const zg = Math.abs(qx * EZ.x + qy * EZ.y + qz * EZ.z);
  const rg = Math.hypot(qx * EX.x + qy * EX.y + qz * EX.z, qx * EY.x + qy * EY.y + qz * EY.z);
  return (
    (1 - THREE.MathUtils.smoothstep(zg, 600, 2100)) *
    (1 - THREE.MathUtils.smoothstep(rg, 16800, 20500))
  );
}

/** abaixo disto a viagem conta como FORA do disco (arma o latch) */
export const LIMIAR_FORA_DO_DISCO = 0.001;

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
