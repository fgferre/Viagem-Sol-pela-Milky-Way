// ============================================================
// ÓRION NA CENA: as três grades de `nebulosaDeOrion.ts`, assadas UMA VEZ
// na GPU (um passe por fatia, como o gás da casa), e os uniforms que o
// raymarch da casa (`nebula.ts`) e as estrelas (`stars.ts`) dividem — um
// objeto só, lido pelos dois. Antes do assado, `uOrPronta` = 0 e nada de
// Órion é desenhado.
// ============================================================
import * as THREE from 'three';
import { GLSL_NOISE } from '../shaders/common';
import {
  CAIXA_DO_NUCLEO,
  CAIXA_DO_VOLUME,
  GRADE_DA_SUPERFICIE,
  ORION_LIGADA,
  ORION_ASSADO_VERT,
  orionAssadoFrag,
  orionSuperficieFrag,
  type CaixaDeOrion,
} from './nebulosaDeOrion';

const opcoes = {
  format: THREE.RGBAFormat,
  type: THREE.HalfFloatType,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  depthBuffer: false,
} as const;

const vazia3D = () => {
  const t = new THREE.Data3DTexture(new Uint16Array(4), 1, 1, 1);
  t.format = THREE.RGBAFormat;
  t.type = THREE.HalfFloatType;
  t.needsUpdate = true;
  return t;
};

/** os uniforms de Órion — os MESMOS objetos em todo material que os lê */
export const UNIFORMES_DE_ORION = {
  uOrSup: { value: new THREE.DataTexture(new Uint16Array(4), 1, 1, THREE.RGBAFormat, THREE.HalfFloatType) as THREE.Texture },
  uOrNucleo: { value: vazia3D() as THREE.Texture },
  uOrVolume: { value: vazia3D() as THREE.Texture },
  uOrPronta: { value: 0 },
};
UNIFORMES_DE_ORION.uOrSup.value.needsUpdate = true;

let assada = false;

/**
 * Assa as três grades se ainda não assou — chamada pela nebulosa antes do
 * raymarch. Devolve true no quadro em que assou (o céu de antes fica
 * velho). ~280 desenhos de tela cheia pequena, uma vez na vida do app.
 */
export function assarOrionSePreciso(renderer: THREE.WebGLRenderer): boolean {
  if (assada || !ORION_LIGADA) return false;
  assada = true;
  const cena = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  cena.add(quad);
  const prev = renderer.getRenderTarget();
  const material = (frag: string) =>
    new THREE.ShaderMaterial({
      vertexShader: ORION_ASSADO_VERT,
      fragmentShader: frag,
      uniforms: { uFatia: { value: 0 } },
      depthTest: false,
      depthWrite: false,
    });

  const sup = new THREE.WebGLRenderTarget(...GRADE_DA_SUPERFICIE, opcoes);
  quad.material = material(orionSuperficieFrag(GLSL_NOISE));
  renderer.setRenderTarget(sup);
  renderer.render(cena, camera);
  (quad.material as THREE.ShaderMaterial).dispose();

  const grade = (c: CaixaDeOrion) => {
    const rt = new THREE.WebGL3DRenderTarget(...c.dims, opcoes);
    const m = material(orionAssadoFrag(c, GLSL_NOISE));
    quad.material = m;
    for (let fatia = 0; fatia < c.dims[2]; fatia++) {
      m.uniforms.uFatia.value = fatia;
      renderer.setRenderTarget(rt, fatia);
      renderer.render(cena, camera);
    }
    m.dispose();
    return rt;
  };
  const nucleo = grade(CAIXA_DO_NUCLEO);
  const volume = grade(CAIXA_DO_VOLUME);
  renderer.setRenderTarget(prev);
  quad.geometry.dispose();

  const u = UNIFORMES_DE_ORION;
  u.uOrSup.value = sup.texture;
  u.uOrNucleo.value = nucleo.texture;
  u.uOrVolume.value = volume.texture;
  u.uOrPronta.value = 1;
  return true;
}
