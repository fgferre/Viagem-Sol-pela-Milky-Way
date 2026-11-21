import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { alemDoFundo, foraDoAlcance, ordemDosOpacos, ordemDosTransparentes } from './profundidade';

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

describe('a ordem de desenho sob a profundidade invertida', () => {
  // o z de recorte da invertida CAI com a distância: 3 é o mais perto, 1 o mais longe
  const item = (id: number, renderOrder: number, z: number, material = 1, groupOrder = 0) => ({
    id,
    groupOrder,
    renderOrder,
    z,
    material: { id: material },
  });
  /** o que o three faz com a ordenação sob medida: ordena e VIRA a lista */
  const comoOThree = <T>(lista: T[], ordem: (a: T, b: T) => number) =>
    [...lista].sort((a, b) => ordem(b, a)).reverse();

  it('a ordem pedida manda, e só o empate olha a distância', () => {
    const disco = item(1, 0, 2);
    const folha = item(2, 10, 1);
    const nevoa = item(3, 11, 3);
    const longe = item(4, 0, 1);
    expect(comoOThree([nevoa, folha, longe, disco], ordemDosTransparentes).map((i) => i.id)).toEqual([4, 1, 2, 3]);
    const perto = item(5, 0, 3);
    const outroMaterial = item(6, 0, 3, 2);
    const antes = item(7, -1, 1, 9);
    expect(comoOThree([outroMaterial, longe, perto, antes], ordemDosOpacos).map((i) => i.id)).toEqual([7, 5, 4, 6]);
  });

  it('o three ainda vira a lista inteira: quando isto falhar, as ordens de `prepararAInvertida` têm de sair', () => {
    const fonte = readFileSync('node_modules/three/src/renderers/webgl/WebGLRenderLists.js', 'utf8');
    expect(fonte).toMatch(/if \( reversedDepth \) \{\s*opaque\.reverse\(\);\s*transmissive\.reverse\(\);\s*transparent\.reverse\(\);/);
  });
});
