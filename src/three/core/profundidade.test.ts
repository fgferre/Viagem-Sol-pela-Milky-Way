import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { alemDoFundo, foraDoAlcance } from './profundidade';

/** a câmera como o renderer a deixa depois do primeiro desenho com a invertida */
function camera(invertida: boolean, near: number, far: number): THREE.PerspectiveCamera {
  const c = new THREE.PerspectiveCamera(58, 16 / 9, near, far);
  (c as unknown as { _reversedDepth: boolean })._reversedDepth = invertida;
  c.updateProjectionMatrix();
  c.updateMatrixWorld();
  return c;
}

/** [z na vista (negativo = à frente), além do fundo ou atrás da câmera?, fora do alcance?] */
function casos(near: number, far: number): [number, boolean, boolean][] {
  return [
    [-near * 0.5, false, true], // aquém do near
    [-near * 1.5, false, false],
    [-Math.sqrt(near * far), false, false],
    [-far * 0.5, false, false],
    [-far * 2, true, true], // além do far
    [near * 2, true, true], // atrás da câmera, rente
    [far * 0.01, true, true], // atrás da câmera, longe
  ];
}

function conferir(c: THREE.PerspectiveCamera) {
  for (const [z, alem, fora] of casos(c.near, c.far)) {
    const ndc = new THREE.Vector3(0, 0, z).project(c);
    expect(alemDoFundo(ndc.z, c), `alemDoFundo, z = ${z}`).toBe(alem);
    expect(foraDoAlcance(ndc.z, c), `foraDoAlcance, z = ${z}`).toBe(fora);
  }
}

describe('quem lê o z de project(camera) pergunta a `core/profundidade`', () => {
  it('no par de recorte da abertura as duas convenções respondem igual', () => {
    conferir(camera(false, 0.001, 60000));
    conferir(camera(true, 0.001, 60000));
  });

  it('encostada numa superfície (near de 3 m, far de 60.000 pc) a invertida segue certa', () => {
    // na convenção de sempre este par não cabe nem em float64: o z de quem
    // está 600 pc atrás da câmera sai 1,0 exato e o teste `z > 1` o deixa passar
    conferir(camera(true, 9.66e-17, 60000));
    const comum = camera(false, 9.66e-17, 60000);
    expect(new THREE.Vector3(0, 0, 600).project(comum).z).toBe(1);
  });
});
