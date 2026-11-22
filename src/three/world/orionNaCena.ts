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
  CENTRO_DE_ORION,
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
  /** 1 com a caixa de Órion no quadro (ver `marcarOrionNoQuadro`) */
  uOrNaVista: { value: 0 },
};
UNIFORMES_DE_ORION.uOrSup.value.needsUpdate = true;

/** o nome da cena do assado (o teste da nebulosa separa estes desenhos) */
export const CENA_DO_ASSADO_DE_ORION = 'orion-assado';
/** quantos desenhos o assado faz: a superfície e uma fatia por camada */
export const DESENHOS_DO_ASSADO_DE_ORION = 1 + CAIXA_DO_NUCLEO.dims[2] + CAIXA_DO_VOLUME.dims[2];

/** as grades vivem no contexto de um renderer: um renderer novo assa de novo */
let assadaPara: THREE.WebGLRenderer | null = null;
let alvos: THREE.RenderTarget[] = [];

/**
 * Os três materiais do assado (superfície, núcleo, volume), um trio por
 * renderer: o aquecimento sob o véu (director.init, grupo `comNormal`)
 * compila ESTAS instâncias e o assado desenha com elas — descartar uma
 * aquecida antes de assar soltaria o programa e o assado recompilaria
 * síncrono. Por renderer porque dois Directors podem coexistir (o velho
 * ainda desmontando): um não descarta o trio que o outro aquece.
 */
const materiaisPorRenderer = new WeakMap<THREE.WebGLRenderer, THREE.ShaderMaterial[]>();

const materialDoAssado = (frag: string) =>
  new THREE.ShaderMaterial({
    vertexShader: ORION_ASSADO_VERT,
    fragmentShader: frag,
    uniforms: { uFatia: { value: 0 } },
    depthTest: false,
    depthWrite: false,
  });

/**
 * O trio do assado deste renderer, criado na primeira pergunta (vazio com
 * Órion desligada ou já assada para ele). Vive até o assado ou até
 * `descartarMateriaisDoAssadoDeOrion`.
 */
export function materiaisDoAssadoDeOrion(renderer: THREE.WebGLRenderer): THREE.ShaderMaterial[] {
  if (!ORION_LIGADA || assadaPara === renderer) return [];
  let trio = materiaisPorRenderer.get(renderer);
  if (!trio) {
    trio = [
      materialDoAssado(orionSuperficieFrag(GLSL_NOISE)),
      materialDoAssado(orionAssadoFrag(CAIXA_DO_NUCLEO, GLSL_NOISE)),
      materialDoAssado(orionAssadoFrag(CAIXA_DO_VOLUME, GLSL_NOISE)),
    ];
    materiaisPorRenderer.set(renderer, trio);
  }
  return trio;
}

/** solta o trio que não chegou a assar (dispose/desistência do Director) */
export function descartarMateriaisDoAssadoDeOrion(renderer: THREE.WebGLRenderer) {
  for (const m of materiaisPorRenderer.get(renderer) ?? []) m.dispose();
  materiaisPorRenderer.delete(renderer);
}

/**
 * Assa as três grades se ainda não assou para este renderer — chamada pela
 * nebulosa antes do raymarch. Devolve true no quadro em que assou (o céu
 * de antes fica velho). ~140 desenhos pequenos, uma vez na vida do app.
 */
export function assarOrionSePreciso(renderer: THREE.WebGLRenderer): boolean {
  if (assadaPara === renderer || !ORION_LIGADA) return false;
  // o trio aquecido sob o véu (ou um novo, no `?shot=`): pegar ANTES de
  // marcar o renderer como assado, que esvazia a pergunta
  const [mSup, mNucleo, mVolume] = materiaisDoAssadoDeOrion(renderer);
  assadaPara = renderer;
  for (const a of alvos) a.dispose();
  const cena = new THREE.Scene();
  cena.name = CENA_DO_ASSADO_DE_ORION;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  cena.add(quad);
  const prev = renderer.getRenderTarget();

  const sup = new THREE.WebGLRenderTarget(...GRADE_DA_SUPERFICIE, opcoes);
  quad.material = mSup;
  renderer.setRenderTarget(sup);
  renderer.render(cena, camera);

  const grade = (c: CaixaDeOrion, m: THREE.ShaderMaterial) => {
    const rt = new THREE.WebGL3DRenderTarget(...c.dims, opcoes);
    quad.material = m;
    for (let fatia = 0; fatia < c.dims[2]; fatia++) {
      m.uniforms.uFatia.value = fatia;
      renderer.setRenderTarget(rt, fatia);
      renderer.render(cena, camera);
    }
    return rt;
  };
  const nucleo = grade(CAIXA_DO_NUCLEO, mNucleo);
  const volume = grade(CAIXA_DO_VOLUME, mVolume);
  renderer.setRenderTarget(prev);
  quad.geometry.dispose();
  // assado: o trio já cumpriu o papel e solta os programas
  descartarMateriaisDoAssadoDeOrion(renderer);

  alvos = [sup, nucleo, volume];
  const u = UNIFORMES_DE_ORION;
  u.uOrSup.value = sup.texture;
  u.uOrNucleo.value = nucleo.texture;
  u.uOrVolume.value = volume.texture;
  u.uOrPronta.value = 1;
  return true;
}

const _m = new THREE.Matrix4();
const _quadro = new THREE.Frustum();
const _centro = new THREE.Vector3(...CENTRO_DE_ORION);
/** a esfera que contém a caixa grossa inteira (meia diagonal) */
const RAIO_DA_CAIXA = 0.5 * Math.hypot(
  ...CAIXA_DO_VOLUME.max.map((m, e) => m - CAIXA_DO_VOLUME.min[e])
) + Math.hypot(...CAIXA_DO_VOLUME.max.map((m, e) => (m + CAIXA_DO_VOLUME.min[e]) / 2));

/**
 * A caixa de Órion está no quadro? Só os quatro lados do tronco (o raymarch
 * não tem plano de fundo, e a câmera dentro da esfera também conta). Fora
 * do quadro o raymarch usa o laço de antes, texto por texto. Devolve true
 * quando a resposta muda (o céu de antes fica velho).
 */
export function marcarOrionNoQuadro(camera: THREE.PerspectiveCamera): boolean {
  _m.copy(camera.matrixWorld).invert().premultiply(camera.projectionMatrix);
  _quadro.setFromProjectionMatrix(_m);
  let dentro = true;
  for (let i = 0; i < 4; i++) if (_quadro.planes[i].distanceToPoint(_centro) < -RAIO_DA_CAIXA) dentro = false;
  const v = dentro ? 1 : 0;
  const mudou = v !== UNIFORMES_DE_ORION.uOrNaVista.value;
  UNIFORMES_DE_ORION.uOrNaVista.value = v;
  return mudou;
}
