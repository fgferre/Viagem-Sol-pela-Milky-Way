import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { WebGLExtensions } from 'three/src/renderers/webgl/WebGLExtensions.js';
import { WebGLState } from 'three/src/renderers/webgl/WebGLState.js';
import { alemDoFundo, foraDoAlcance, igualarAConvencao, ordemDosOpacos, ordemDosTransparentes, prepararAInvertida } from './profundidade';

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

describe('prepararAInvertida', () => {
  /**
   * O pedaço do WebGLRenderer que a preparação toca, com o ESTADO DE VERDADE
   * do three (`WebGLState`: o cache que decide o que chega ao GL e o `reset`
   * que a ejeção do Sol chama) sobre um `gl` FALSO, que só anota o valor de
   * limpeza e o controle de recorte. Nasce como o `WebGLRenderer` nasce
   * (`setReversed(true)` logo depois do estado, quando há a extensão) e o
   * `resetState` faz com a profundidade o que o dele faz (`state.reset()`).
   */
  const renderer = (invertida: boolean) => {
    const anotado = { clearDepth: [] as number[], recorte: [] as string[] };
    const constantes = new Map<string, number>();
    const constante = (nome: string) => {
      if (!constantes.has(nome)) constantes.set(nome, constantes.size + 1);
      return constantes.get(nome)!;
    };
    const gl = new Proxy({}, {
      get: (_, nome) => {
        if (typeof nome !== 'string') return undefined;
        if (nome === 'canvas') return { width: 4, height: 4 };
        if (nome === 'clearDepth') return (v: number) => anotado.clearDepth.push(v);
        if (nome === 'getParameter') {
          return (p: number) =>
            p === constante('VERSION') ? 'WebGL 2.0' : p === constante('MAX_COMBINED_TEXTURE_IMAGE_UNITS') ? 16 : [0, 0, 4, 4];
        }
        return /^[A-Z0-9_]+$/.test(nome) ? constante(nome) : () => null;
      },
    });
    const clipControl = {
      LOWER_LEFT_EXT: 1,
      ZERO_TO_ONE_EXT: 2,
      NEGATIVE_ONE_TO_ONE_EXT: 3,
      clipControlEXT: (_origem: number, z: number) => anotado.recorte.push(z === 2 ? '0..1' : '-1..1'),
    };
    const state = new WebGLState(gl as WebGL2RenderingContext, { get: () => clipControl } as unknown as WebGLExtensions);
    if (invertida) state.buffers.depth.setReversed(true);
    const r = {
      capabilities: { reversedDepthBuffer: invertida },
      setOpaqueSort: () => {},
      setTransparentSort: () => {},
      resetState: () => state.reset(),
      state,
    };
    return { r: r as unknown as THREE.WebGLRenderer, anotado };
  };

  it('a câmera nasce invertida e o reset do three (a ejeção do Sol o chama) não desliga a invertida', () => {
    const { r, anotado } = renderer(true);
    const cam = new THREE.PerspectiveCamera(58, 16 / 9, 0.001, 60000);
    prepararAInvertida(r, cam);
    expect(cam.reversedDepth).toBe(true);
    r.resetState();
    expect(r.state.buffers.depth.getReversed()).toBe(true);
    expect(anotado.recorte.at(-1)).toBe('0..1');
  });

  it('depois do reset o GL limpa a profundidade em 0, o fundo da invertida (em 1 nada passa no teste e a cena apaga)', () => {
    const { r, anotado } = renderer(true);
    prepararAInvertida(r, new THREE.PerspectiveCamera(58, 16 / 9, 0.001, 60000));
    expect(anotado.clearDepth.at(-1)).toBe(0);
    r.resetState();
    expect(anotado.clearDepth.at(-1)).toBe(0);
    r.resetState();
    expect(anotado.clearDepth.at(-1)).toBe(0);
  });

  it('a cópia da câmera (a larga do clarão) sai na convenção da original, não na de sempre', () => {
    const { r } = renderer(true);
    const cam = new THREE.PerspectiveCamera(58, 16 / 9, 0.001, 60000);
    prepararAInvertida(r, cam);
    const copia = new THREE.PerspectiveCamera();
    copia.copy(cam, false);
    expect(copia.reversedDepth).toBe(false);
    igualarAConvencao(copia, cam);
    copia.updateProjectionMatrix();
    expect(copia.reversedDepth).toBe(true);
    expect(copia.projectionMatrix.equals(cam.projectionMatrix)).toBe(true);
  });

  it('sem a extensão não toca em nada', () => {
    const { r } = renderer(false);
    const reset = r.resetState;
    const cam = new THREE.PerspectiveCamera(58, 16 / 9, 0.001, 60000);
    prepararAInvertida(r, cam);
    expect(cam.reversedDepth).toBe(false);
    expect(r.resetState).toBe(reset);
  });
});
