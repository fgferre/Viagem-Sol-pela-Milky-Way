// ============================================================
// OS ROCHOSOS RESOLVIDOS (Onda 6, F3+F5) — Mercúrio, Vênus, Marte,
// Fobos, Deimos e as ~17 luas texturadas sob a MESMA lei da Terra e
// da Lua: uma classe genérica parametrizada por corpo, nascida do
// molde da Lua (lua.ts) com os dois ramos de BRDF que a fase pede.
//
// PROVENIÊNCIA: implementação NOVA, como as irmãs. Do doador
// atravessam como ESPEC: a lista dos 7 opt-in de Lommel-Seeliger
// (correção de fato 1 do desenho — aqui só Mercúrio é regolito;
// Vênus, Marte, Fobos e Deimos ficam na Lambert estática do
// doador) e a regra "planeta Lambertiano com textura real".
//
// AS QUATRO LEIS de terra.ts/lua.ts valem palavra por palavra
// (escalar único de luz, relógio do Director, orientação IAU
// medida, carga preguiçosa). O que muda por corpo é DADO:
//
//   - BRDF: 'ls' (Mercúrio + os 5 opt-in da F5 + os 4 da F7 —
//     Vesta, Palas, Hígia, Haumea; o C = 4/3 DERIVADO por
//     quadratura da Lua, importado de lua.ts, nunca redigitado)
//     ou 'lambert'.
//   - FIGURA: esfera ou elipsoide triaxial por BODY_AXES — a
//     escala anisotrópica mora na matriz, como o achatamento da
//     Terra. A NORMAL do elipsoide aqui é o gradiente EXATO
//     (x/a², y/c², z/b²): a aproximação de primeiro grau da Terra
//     (a/c em vez de a²/c²) erra 0,3% no achatamento terrestre,
//     mas em Fobos (a/c = 1,43) seria uma mentira geométrica.
//   - POSIÇÃO: os três planetas têm retrato congelado (o "sem
//     rede" honesto da Terra); Fobos e Deimos, como a Lua, só
//     nascem com a efeméride viva (Kepler composto com Marte —
//     a cadeia de posicaoHeliocentrica).
//   - CESSÃO: os três planetas têm ponto fotométrico na camada
//     (IDS_FOTOMETRIA) e cedem por dominância (D5), pelo MESMO
//     bloco da Terra; Fobos e Deimos, como a Lua, nascem
//     mesh↔nada aos 4 px do gate (pendência MH18, Onda 7).
//   - ECLIPSE: Fobos e Deimos ganharam o par na TABELA da lib
//     (data-only, F3) — a sombra de Marte. Os três planetas não
//     têm par: o fator fica neutro por construção da lib.
//
// VÊNUS É O TOPO DE NUVENS: o mapa é o 4k_venus_atmosphere (o que
// se vê do espaço). A superfície de radar NÃO entra — uma casca
// translúcida sobre ela fingiria enxergar através de 20 km de
// nuvem. A super-rotação das nuvens (4 dias) NÃO é modelada: o
// doador aplicava o 1,03 da Terra a qualquer casca, número sem
// fonte para Vênus — pendência declarada, textura gira com o W
// sólido IAU (retrógrado, que o kernel já carrega).
// ============================================================
import * as THREE from 'three';
import { CAMADA_DOS_OCULTADORES } from '../../core/post';
import { AU_KM } from '../../../lib/atlas/elementosOrbitais';
import {
  AU_PARA_PC,
  eclipticaParaEquatorial,
} from '../../../lib/atlas/frameGalactico';
import { BODY_AXES, IAU_ORIENTATIONS } from '../../../lib/atlas/iauOrientation';
import type { PoliticaDeLuz } from '../../../lib/atlas/luz';
import {
  GLSL_LUZ_DA_VISITA,
  escreverLuzDaVisita,
  ganhoDoGlobo,
  uniformsDaLuzDaVisita,
} from '../../../lib/atlas/luzDaVisita';
import {
  GLSL_SOMBRA_ECLIPSE,
  PARES_DE_ECLIPSE,
  criaSombraNaCena,
  resolveSombraNaCena,
} from '../../../lib/atlas/eclipse';
import type { FonteDeEfemerides } from '../planetas/planetas';
import type { CalibracaoDaCasa } from '../../estrela';
import {
  A_MAG_BASE_PC,
  DESLOCAMENTO_UA_PARA_PC,
  faseDoVertice,
  magDoVertice,
} from '../planetas/planetas';
import { FOTOMETRIA, aMagBaseDe } from '../planetas/fotometria';
import { RETRATO_2026 } from '../planetas/retrato2026';
import { RAMP_DURATION_MS, stepRampToward } from '../lodStellar';
import { psfPointSizePx } from '../../luzDaCasa';
import { diametroAparentePx } from './corpos';
import { LS_NORMALIZACAO_GLSL } from './lua';
import { LIMIAR_DO_GATE_PX, cessaoAlvo, gateBinario } from './terra';
import { CANAL_MAP, carregarCanaisDoCorpo, estadoAposFalha } from './texturas';
import type { EstadoDasTexturas, OpcoesDeTextura } from './texturas';
import {
  componentesNoFrameDoAnel,
  orientacaoDoCorpoNaCena,
  orientacaoInercialDoAnelNaCena,
} from './orientacaoNaCena';
import { RAIO_SOL_KM } from '../../escala';
import {
  escreverSombraDeEclipse,
  uniformsDeEclipseNeutros,
} from './eclipseNoMaterial';
import { ANEIS_CITADOS, ANEL_PROC_FRAG, ANEL_VERT } from './gigante';


/**
 * Limiar aparente da LUA rochosa. O gate do planeta (4 px) nasceria
 * Io/Europa/Ganimedes (37/10/11 px) no retrato oficial de Júpiter e
 * Tétis/Titã no de Saturno — as 4 vistas da F4 deixariam de ser
 * bit-idênticas. 48 px é 12× o limiar: Caronte na vista
 * plutao-caronte (~63 px) entra; Io no retrato de Júpiter (37 px)
 * fica de fora.
 */
export const LIMIAR_LUA_ROCHOSA_PX = 48;

/** Os dois BRDFs da fase — Lommel-Seeliger (regolito) ou Lambert. */
export type BrdfDoRochoso = 'ls' | 'lambert';

/** A configuração de um corpo rochoso — dado, nunca ramo novo. */
export interface ConfigDoRochoso {
  readonly id: string;
  readonly brdf: BrdfDoRochoso;
  /** F6: Haumea/Makemake/Éris/Quaoar — o −3 inventado; sem mapa. */
  readonly superficie?: 'mapa' | 'procedural';
}

/**
 * OS ROCHOSOS DA F3+F5, na ordem do Sol para fora. A lista é o
 * DADO VIVO que o Director percorre para construir, ticar e
 * descartar — a "lista dos corpos construídos, nunca redigitada"
 * que a escada consulta (director.ts, `podeAproximar`).
 * Vanth/Weywot NÃO entram: sem textura/licença não nasce mesh.
 */
export const ROCHOSOS: readonly ConfigDoRochoso[] = [
  { id: 'mercury', brdf: 'ls' },
  { id: 'venus', brdf: 'lambert' },
  { id: 'mars', brdf: 'lambert' },
  { id: 'phobos', brdf: 'lambert' },
  { id: 'deimos', brdf: 'lambert' },
  { id: 'io', brdf: 'ls' },
  { id: 'europa', brdf: 'ls' },
  { id: 'ganymede', brdf: 'ls' },
  { id: 'callisto', brdf: 'ls' },
  { id: 'mimas', brdf: 'lambert' },
  { id: 'enceladus', brdf: 'ls' },
  { id: 'tethys', brdf: 'lambert' },
  { id: 'dione', brdf: 'lambert' },
  { id: 'rhea', brdf: 'lambert' },
  { id: 'titan', brdf: 'lambert' },
  { id: 'iapetus', brdf: 'lambert' },
  { id: 'miranda', brdf: 'lambert' },
  { id: 'ariel', brdf: 'lambert' },
  { id: 'umbriel', brdf: 'lambert' },
  { id: 'titania', brdf: 'lambert' },
  { id: 'oberon', brdf: 'lambert' },
  { id: 'triton', brdf: 'lambert' },
  { id: 'pluto', brdf: 'lambert' },
  { id: 'charon', brdf: 'lambert' },
  { id: 'ceres', brdf: 'lambert' },
  { id: 'vesta', brdf: 'ls' },
  { id: 'pallas', brdf: 'ls', superficie: 'procedural' },
  { id: 'hygiea', brdf: 'ls' },
  { id: 'haumea', brdf: 'ls', superficie: 'procedural' },
  { id: 'makemake', brdf: 'lambert', superficie: 'procedural' },
  { id: 'eris', brdf: 'lambert', superficie: 'procedural' },
  { id: 'quaoar', brdf: 'lambert', superficie: 'procedural' },
];

/** Raios do corpo em pc — BODY_AXES (a fonte única) pelos
 *  conversores únicos; nenhum literal novo de comprimento. */
export function raiosDoRochosoPc(id: string): { a: number; c: number; b: number } {
  const [aKm, bKm, cKm] = BODY_AXES[id];
  return {
    a: (aKm / AU_KM) * AU_PARA_PC,
    c: (cKm / AU_KM) * AU_PARA_PC,
    b: (bKm / AU_KM) * AU_PARA_PC,
  };
}

/**
 * A posição heliocêntrica em UA (eclíptica J2000): efeméride viva
 * quando há fonte; o RETRATO congelado quando não há E o corpo é
 * planeta (o estado honesto do "sem rede", idêntico ao da camada);
 * null para lua sem fonte (não há luas no retrato — o contrato da
 * Lua, palavra por palavra).
 */
export function posicaoDoRochosoUA(
  id: string,
  jdTdb: number,
  fonte: FonteDeEfemerides | null
): { x: number; y: number; z: number } | null {
  if (fonte && Number.isFinite(jdTdb)) {
    return fonte.posicaoHeliocentrica(id, jdTdb);
  }
  const v = (RETRATO_2026 as Record<string, { vetorUA: readonly number[] }>)[id];
  return v ? { x: v.vetorUA[0], y: v.vetorUA[1], z: v.vetorUA[2] } : null;
}

// ------------------------------------------------------------
// GLSL — os dois BRDFs, shaders próprios no padrão da casa.
// ------------------------------------------------------------

const ROCHOSO_VERT = /* glsl */ `
varying vec3 vLocal; // posição na ESFERA UNITÁRIA (a figura mora na matriz)
varying vec2 vUv;
void main() {
  vLocal = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GLSL_NORMAL_ELIPSOIDE = /* glsl */ `
// gradiente exato do elipsoide (x/a², y/c², z/b²) em unidades de a:
// uNormalEsc = (1, a²/c², a²/b²) — esfera ⇒ (1,1,1) exato
vec3 normalDoCorpo(vec3 p, vec3 esc) { return normSeguro(p * esc); }
`;

/**
 * LAMBERT — Vênus, Marte, Fobos, Deimos e as luas sem opt-in de
 * regolito: difusa cos(incidência) e nada mais (a esfera Lambertiana
 * estática do doador). O eclipse entra pelo chunk único da lib, SÓ
 * na direta, depois do BRDF.
 *
 * ITEM 93 — a superfície Lambert dos rochosos é uma das três famílias
 * que o contrato manda pôr sob a logística do Eyes (§4.3), e todas as
 * famílias daqui recebem a lanterna de leitura. Em `real` os dois
 * uniformes são 0 e o fragmento devolve o Lambert cru de antes.
 */
export const ROCHOSO_LAMBERT_FRAG = /* glsl */ `
uniform sampler2D uMapaDia;
uniform vec3 uDirSolLocal;  // corpo→Sol, frame LOCAL (unitário)
uniform vec3 uCamLocal;     // câmera no frame local, em raios de a
uniform float uLuzGanho;    // ganhoDoGlobo(dUA da CADEIA) — o escalar único
uniform vec3 uNormalEsc;    // (1, a²/c², a²/b²): gradiente do elipsoide
uniform vec3 uEscalaLocal;  // (1, c/a, b/a): ponto real do elipsoide
varying vec3 vLocal;
varying vec2 vUv;
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_NORMAL_ELIPSOIDE}
${GLSL_SOMBRA_ECLIPSE}
${GLSL_LUZ_DA_VISITA}
void main() {
  vec3 n = normalDoCorpo(vLocal, uNormalEsc);
  vec3 pElip = vLocal * uEscalaLocal;
  float ndotlGeo = dot(n, uDirSolLocal);
  vec3 albedo = texture2D(uMapaDia, vUv).rgb;
  vec3 luzSol =
    vec3(terminadorSuave(ndotlGeo)) * uLuzGanho * fatorDeEclipse(pElip, n, ndotlGeo);
  float fill = lanternaDeLeitura(n, normSeguro(uCamLocal - pElip));
  gl_FragColor = vec4(albedo * luzDoGlobo(luzSol, fill), 1.0);
}
`;

/**
 * LOMMEL-SEELIGER — Mercúrio, os 5 opt-in da F5 e os 4 da F7
 * (Vesta/Palas/Hígia + Haumea, só o BRDF): a MESMA lei, com o
 * C = 4/3 importado da Lua (a derivação por quadratura mora em
 * lua.test.ts e cobre TODOS os consumidores — o literal é UM só).
 *
 * ITEM 93 — AQUI NÃO ENTRA A LOGÍSTICA, e é decisão do contrato (§4.3):
 * o disco chato de LS é o fato que se confere contra uma fotografia, e
 * o Eyes, que usa Phong até na Lua, é PIOR nisto. Entra só a LANTERNA
 * DE LEITURA, e ela chega junto com o teto de 1 — que não morde o
 * realce de limbo do LS (`luzDoGlobo`), então o disco não perde a borda
 * dura que o define.
 */
export const ROCHOSO_LS_FRAG = /* glsl */ `
uniform sampler2D uMapaDia;
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uLuzGanho;
uniform vec3 uNormalEsc;
uniform vec3 uEscalaLocal;
varying vec3 vLocal;
varying vec2 vUv;
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_NORMAL_ELIPSOIDE}
${GLSL_SOMBRA_ECLIPSE}
${GLSL_LUZ_DA_VISITA}
void main() {
  vec3 n = normalDoCorpo(vLocal, uNormalEsc);
  vec3 pElip = vLocal * uEscalaLocal;
  vec3 albedo = texture2D(uMapaDia, vUv).rgb;
  vec3 dirCam = normSeguro(uCamLocal - pElip);
  float mu0 = clamp(dot(n, uDirSolLocal), 0.0, 1.0);
  float mu = clamp(dot(n, dirCam), 0.0, 1.0);
  float ls = ${LS_NORMALIZACAO_GLSL} * mu0 / max(mu0 + mu, 1.0e-4);
  vec3 luzSol = vec3(ls * uLuzGanho) * fatorDeEclipse(pElip, n, mu0);
  gl_FragColor = vec4(
    albedo * luzDoGlobo(luzSol, lanternaDeLeitura(n, dirCam)), 1.0
  );
}
`;

/**
 * PROCEDURAL (F6) — o −3 inventado do doador, declarado. Sem mapa:
 * albedo = cor-base + ruído 3 oitavas. Lambert + eclipse como as irmãs
 * — e, no item 93, a MESMA logística e a MESMA lanterna do Lambert
 * texturado: o que separa este shader do outro é de onde vem o albedo,
 * nunca o modelo de luz.
 */
export const ROCHOSO_PROC_FRAG = /* glsl */ `
uniform vec3 uAlbedoBase;
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uLuzGanho;
uniform vec3 uNormalEsc;
uniform vec3 uEscalaLocal;
varying vec3 vLocal;
varying vec2 vUv;
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_NORMAL_ELIPSOIDE}
${GLSL_SOMBRA_ECLIPSE}
${GLSL_LUZ_DA_VISITA}
float hash31(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}
float ruido(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i);
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  return mix(mix(nx00, nx10, f.y), mix(nx01, nx11, f.y), f.z);
}
void main() {
  vec3 n = normalDoCorpo(vLocal, uNormalEsc);
  vec3 pElip = vLocal * uEscalaLocal;
  float ndotlGeo = dot(n, uDirSolLocal);
  float g = 0.5 * ruido(vLocal * 3.0) + 0.3 * ruido(vLocal * 7.0) + 0.2 * ruido(vLocal * 15.0);
  vec3 albedo = uAlbedoBase * (0.72 + 0.56 * g);
  vec3 luzSol =
    vec3(terminadorSuave(ndotlGeo)) * uLuzGanho * fatorDeEclipse(pElip, n, ndotlGeo);
  float fill = lanternaDeLeitura(n, normSeguro(uCamLocal - pElip));
  gl_FragColor = vec4(albedo * luzDoGlobo(luzSol, fill), 1.0);
}
`;

/**
 * PROCEDURAL + LS (F7) — o mesmo −3, com o C = 4/3 importado da
 * Lua. Palas (sem mapa licenciado) e Haumea (corpo da F6, só o
 * BRDF muda: a casa não refaz a figura). Como no LS texturado, o item
 * 93 lhe dá a LANTERNA e NÃO lhe dá a logística.
 */
export const ROCHOSO_PROC_LS_FRAG = /* glsl */ `
uniform vec3 uAlbedoBase;
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uLuzGanho;
uniform vec3 uNormalEsc;
uniform vec3 uEscalaLocal;
varying vec3 vLocal;
varying vec2 vUv;
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_NORMAL_ELIPSOIDE}
${GLSL_SOMBRA_ECLIPSE}
${GLSL_LUZ_DA_VISITA}
float hash31(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}
float ruido(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i);
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  return mix(mix(nx00, nx10, f.y), mix(nx01, nx11, f.y), f.z);
}
void main() {
  vec3 n = normalDoCorpo(vLocal, uNormalEsc);
  vec3 pElip = vLocal * uEscalaLocal;
  float g = 0.5 * ruido(vLocal * 3.0) + 0.3 * ruido(vLocal * 7.0) + 0.2 * ruido(vLocal * 15.0);
  vec3 albedo = uAlbedoBase * (0.72 + 0.56 * g);
  vec3 dirCam = normSeguro(uCamLocal - pElip);
  float mu0 = clamp(dot(n, uDirSolLocal), 0.0, 1.0);
  float mu = clamp(dot(n, dirCam), 0.0, 1.0);
  float ls = ${LS_NORMALIZACAO_GLSL} * mu0 / max(mu0 + mu, 1.0e-4);
  vec3 luzSol = vec3(ls * uLuzGanho) * fatorDeEclipse(pElip, n, mu0);
  gl_FragColor = vec4(
    albedo * luzDoGlobo(luzSol, lanternaDeLeitura(n, dirCam)), 1.0
  );
}
`;

/** Cores-base do −3 inventado (doador proceduralSurface / celestialBodies). */
export const ALBEDO_PROCEDURAL: Record<string, readonly [number, number, number]> = {
  haumea: [0.91, 0.835, 0.769],
  makemake: [0.831, 0.647, 0.455],
  eris: [0.941, 0.902, 0.824],
  quaoar: [0.533, 0.329, 0.259],
  // Palas: sem mapa licenciado — o #8C8578 do doador.
  pallas: [0.549, 0.522, 0.471],
};

// ------------------------------------------------------------
// A classe — o molde é a Lua; o que a Terra tem a mais (cessão,
// retrato) entra como ramo de DADO (planeta × lua), nunca cópia.
// ------------------------------------------------------------

/** O que o Director entrega por tick. */
export interface QuadroDoRochoso {
  jdTdb: number;
  fonte: FonteDeEfemerides | null;
  camPosPc: THREE.Vector3;
  screenHPx: number;
  fovDeg: number;
  ligado: boolean;
  atlasQuente: boolean;
  politica: PoliticaDeLuz;
  /** os três de PLANETA (a cessão suave, D5); luas ignoram. */
  dtS: number;
  psf: CalibracaoDaCasa;
  salto: boolean;
}

export interface EstadoDoRochoso {
  emQuadro: boolean;
  carregando: boolean;
  gateArmado: boolean;
  cede: number;
  emRampa: boolean;
  raioPc: number;
  centroPc: THREE.Vector3;
  diametroPx: number;
  /** distância heliocêntrica da CADEIA, em UA; NaN sem posição. */
  rUA: number;
}

/** O bloco comum de textura (`OpcoesDeTextura`) mais a ficha do corpo —
 *  a classe é genérica, o `config` é o que a instancia. */
export interface OpcoesDoRochoso extends OpcoesDeTextura {
  config: ConfigDoRochoso;
}

export class RochosoResolvido {
  readonly group = new THREE.Group();

  private readonly config: ConfigDoRochoso;
  private readonly raioA: number;
  private readonly razaoC: number; // c/a
  private readonly razaoB: number; // b/a
  /** planeta ⇒ retrato congelado de fallback + cessão do ponto (D5) */
  private readonly ehPlaneta: boolean;

  private readonly centro = new THREE.Vector3(Number.NaN, Number.NaN, Number.NaN);
  private jdEscrito = Number.NaN;
  private fonteEscrita: FonteDeEfemerides | null = null;
  private rUA = Number.NaN;
  private armado = false;

  /** a sombra do eclipse (F3: Fobos/Deimos ← Marte), no cache de
   *  jd/fonte — scratch único (out-parameter), como nas irmãs */
  private readonly sombra = criaSombraNaCena();

  private texturas: EstadoDasTexturas = 'fria';
  private recargas = 0;
  private readonly texturasVivas: THREE.Texture[] = [];
  private disposto = false;

  private geometria: THREE.SphereGeometry | null = null;
  private superficie: THREE.Mesh | null = null;
  private matSuperficie: THREE.ShaderMaterial | null = null;
  private geoAnel: THREE.RingGeometry | null = null;
  private anel: THREE.Mesh | null = null;
  private matAnel: THREE.ShaderMaterial | null = null;
  private readonly mRx = new THREE.Matrix4().makeRotationX(-Math.PI / 2);

  // rascunhos reusados — zero alocação por quadro (M4 da casa)
  private readonly vX = new THREE.Vector3();
  private readonly vY = new THREE.Vector3();
  private readonly vZ = new THREE.Vector3();
  private readonly vAnelX = new THREE.Vector3();
  private readonly vAnelY = new THREE.Vector3();
  private readonly vAnelZ = new THREE.Vector3();
  private readonly vTmp = new THREE.Vector3();
  private readonly vSol = new THREE.Vector3();
  private readonly vEscala = new THREE.Vector3();
  private readonly estado: EstadoDoRochoso;

  /** o estado do último tick — somente leitura; o centro é VIVO. */
  get estadoVivo(): Readonly<EstadoDoRochoso> {
    return this.estado;
  }

  /** o id da casa ('mercury'…'deimos') — o Director registra por ele. */
  get id(): string {
    return this.config.id;
  }

  /** planeta (retrato + cessão do ponto) × lua (sem fonte, não nasce). */
  get planeta(): boolean {
    return this.ehPlaneta;
  }

  private readonly opcoes: OpcoesDoRochoso;

  constructor(opcoes: OpcoesDoRochoso) {
    this.opcoes = opcoes;
    this.config = opcoes.config;
    const { a, c, b } = raiosDoRochosoPc(this.config.id);
    this.raioA = a;
    this.razaoC = c / a;
    this.razaoB = b / a;
    this.ehPlaneta = this.config.id in RETRATO_2026;
    this.group.visible = false;
    this.estado = {
      emQuadro: false,
      carregando: false,
      gateArmado: false,
      cede: 0,
      emRampa: false,
      raioPc: a,
      centroPc: this.centro,
      diametroPx: Number.NaN,
      rUA: Number.NaN,
    };
  }

  /**
   * O TICK — a mesma ordem das irmãs: posição (cache por jd E fonte)
   * → diâmetro aparente → gate → gatilho de textura → matriz e
   * uniforms (só em quadro). Sem posição (lua sem efeméride) o
   * centro fica NaN e nada entra em quadro — o contrato da Lua.
   */
  atualizar(q: QuadroDoRochoso): EstadoDoRochoso {
    const e = this.estado;
    if (this.disposto) return e;

    let saltoDeData = false;
    if (
      (q.jdTdb !== this.jdEscrito || q.fonte !== this.fonteEscrita) &&
      Number.isFinite(q.jdTdb)
    ) {
      saltoDeData = true;
      this.jdEscrito = q.jdTdb;
      this.fonteEscrita = q.fonte;
      const p = posicaoDoRochosoUA(this.config.id, q.jdTdb, q.fonte);
      if (p) {
        this.rUA = Math.hypot(p.x, p.y, p.z);
        const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
        this.centro.set(eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC);
        // O ECLIPSE (F2c/F3): o par da TABELA, no MESMO relógio do
        // quadro — sem fonte viva não há eclipsador medido, e corpo
        // sem par fica neutro por construção da lib
        const eclipsadorId = PARES_DE_ECLIPSE[this.config.id];
        if (q.fonte && eclipsadorId) {
          const pEcl = q.fonte.posicaoHeliocentrica(eclipsadorId, q.jdTdb);
          resolveSombraNaCena(
            this.config.id,
            [p.x, p.y, p.z],
            [pEcl.x, pEcl.y, pEcl.z],
            this.sombra
          );
        } else {
          this.sombra.ativo = false;
        }
      } else {
        this.rUA = Number.NaN;
        this.centro.set(Number.NaN, Number.NaN, Number.NaN);
        this.sombra.ativo = false;
      }
    }
    e.rUA = this.rUA;

    const dPc = q.camPosPc.distanceTo(this.centro);
    const diametroPx = diametroAparentePx(this.raioA, dPc, q.screenHPx, q.fovDeg);
    e.diametroPx = diametroPx;

    this.armado = gateBinario(
      this.armado,
      this.ehPlaneta
        ? diametroPx
        : diametroPx * (LIMIAR_DO_GATE_PX / LIMIAR_LUA_ROCHOSA_PX)
    );

    // o MESMO gatilho duplo das irmãs (lei 4): gate armado OU fase atlas
    if (this.texturas === 'fria' && (this.armado || q.atlasQuente)) {
      this.iniciarCarga();
    }

    const emQuadro =
      this.armado &&
      q.ligado &&
      this.texturas === 'pronta' &&
      Number.isFinite(this.centro.x);
    e.emQuadro = emQuadro;
    e.carregando = this.texturas === 'buscando';
    e.gateArmado = this.armado;
    this.group.visible = emQuadro;

    // A CESSÃO SUAVE do ponto fotométrico (D5) — só PLANETA tem ponto
    // na camada; a conta é a da Terra, palavra por palavra, com o H do
    // corpo (FOTOMETRIA) e a MESMA base da camada (efeméride viva com
    // fonte, retrato sem ela).
    if (this.ehPlaneta) {
      const base = q.fonte
        ? aMagBaseDe(FOTOMETRIA[this.config.id].H, this.rUA) + DESLOCAMENTO_UA_PARA_PC
        : A_MAG_BASE_PC[this.config.id];
      const fase = faseDoVertice(
        this.centro.x, this.centro.y, this.centro.z,
        q.camPosPc.x, q.camPosPc.y, q.camPosPc.z
      );
      const halo = psfPointSizePx(
        magDoVertice(base, dPc, fase),
        q.psf.expoM0,
        q.psf.sigmaPx,
        q.screenHPx
      );
      const alvo = cessaoAlvo(emQuadro, diametroPx, halo);
      e.cede =
        q.salto || saltoDeData
          ? alvo
          : stepRampToward(e.cede, alvo, q.dtS, RAMP_DURATION_MS);
      e.emRampa = e.cede !== alvo;
    }

    if (emQuadro) this.posicionar(q);
    return e;
  }

  /** matriz + uniforms do quadro — só roda com o mesh em quadro. */
  private posicionar(q: QuadroDoRochoso) {
    const { colunaX, colunaY, colunaZ } = orientacaoDoCorpoNaCena(
      IAU_ORIENTATIONS[this.config.id],
      this.jdEscrito
    );
    this.vX.set(colunaX[0], colunaX[1], colunaX[2]);
    this.vY.set(colunaY[0], colunaY[1], colunaY[2]);
    this.vZ.set(colunaZ[0], colunaZ[1], colunaZ[2]);

    // a figura (esfera ou triaxial) mora na escala da matriz — a
    // geometria é sempre a esfera unitária (a lição da Terra)
    const sup = this.superficie!;
    sup.matrix
      .makeBasis(this.vX, this.vY, this.vZ)
      .scale(this.vEscala.set(this.raioA, this.raioA * this.razaoC, this.raioA * this.razaoB))
      .setPosition(this.centro);

    // frame local (CPU em float64): câmera em raios de a, Sol unitário
    // a exposição da visita (item 91, reescrita no 93): Sol = 1 em
    // `assistida`, E(d) em `real`. O anel de Quaoar recebe o mesmo
    // `ganho` — e nenhuma lanterna. Ver `luzDaVisita.ts`.
    const ganho = ganhoDoGlobo(this.rUA, q.politica);
    // ONDE ESTÁ O SOL, uma vez só por corpo: a ORIGEM da cena. O anel
    // de Quaoar bebe DESTE vetor — tinha um segundo cálculo idêntico
    // só para ele (item 91).
    const dirSol = this.vSol.copy(this.centro).multiplyScalar(-1);
    const norma = Math.max(dirSol.length(), 1e-30);
    dirSol.multiplyScalar(1 / norma);
    const sLx = dirSol.dot(this.vX);
    const sLy = dirSol.dot(this.vY);
    const sLz = dirSol.dot(this.vZ);

    const delta = this.vTmp.copy(q.camPosPc).sub(this.centro);
    const cLx = delta.dot(this.vX) / this.raioA;
    const cLy = delta.dot(this.vY) / this.raioA;
    const cLz = delta.dot(this.vZ) / this.raioA;

    const u = this.matSuperficie!.uniforms;
    (u.uDirSolLocal.value as THREE.Vector3).set(sLx, sLy, sLz);
    (u.uCamLocal.value as THREE.Vector3).set(cLx, cLy, cLz);
    u.uLuzGanho.value = ganho;
    // a lanterna de leitura e o `s` do terminador (item 93), pelo único
    // escritor da casa — as três famílias de BRDF desta classe recebem
    // os MESMOS dois uniformes; quem decide o que fazer com eles é o
    // fragmento (a LS ignora o `s`).
    escreverLuzDaVisita(u, q.politica);
    // a sombra do eclipse — o mesmo fio das irmãs (sem deriva: casca única)
    escreverSombraDeEclipse(u, this.sombra, this.vX, this.vY, this.vZ, 0);

    if (this.anel && this.matAnel) {
      const inercial = orientacaoInercialDoAnelNaCena(
        IAU_ORIENTATIONS[this.config.id],
        this.jdEscrito
      );
      this.vAnelX.set(inercial.colunaX[0], inercial.colunaX[1], inercial.colunaX[2]);
      this.vAnelY.set(inercial.colunaY[0], inercial.colunaY[1], inercial.colunaY[2]);
      this.vAnelZ.set(inercial.colunaZ[0], inercial.colunaZ[1], inercial.colunaZ[2]);
      this.anel.matrix
        .makeBasis(this.vAnelX, this.vAnelY, this.vAnelZ)
        .scale(this.vEscala.set(this.raioA, this.raioA, this.raioA))
        .multiply(this.mRx)
        .setPosition(this.centro);
      // A MESMA ponte do anel de Saturno — e o mesmo conserto: as
      // componentes no frame da RingGeometry são a INVERSA de Rx(−π/2).
      // O erro estava copiado aqui; agora só existe uma função (item 91).
      const ua = this.matAnel.uniforms;
      componentesNoFrameDoAnel(
        dirSol, this.vAnelX, this.vAnelY, this.vAnelZ,
        ua.uDirSolLocal.value as THREE.Vector3
      );
      componentesNoFrameDoAnel(
        delta, this.vAnelX, this.vAnelY, this.vAnelZ,
        ua.uCamLocal.value as THREE.Vector3
      ).divideScalar(this.raioA);
      ua.uLuzGanho.value = ganho;
      ua.uSolAngRad.value = RAIO_SOL_KM / Math.max(this.rUA * AU_KM, 1e-30);
    }
  }

  /** geometria + material + mesh, UMA vez, na primeira necessidade. */
  private garantirCasca() {
    if (this.geometria || this.disposto) return;
    this.geometria = new THREE.SphereGeometry(1, 128, 64);
    const procedural = this.config.superficie === 'procedural';
    const albedo = ALBEDO_PROCEDURAL[this.config.id] ?? [0.5, 0.5, 0.5];
    this.matSuperficie = new THREE.ShaderMaterial({
      vertexShader: ROCHOSO_VERT,
      fragmentShader: procedural
        ? this.config.brdf === 'ls'
          ? ROCHOSO_PROC_LS_FRAG
          : ROCHOSO_PROC_FRAG
        : this.config.brdf === 'ls'
          ? ROCHOSO_LS_FRAG
          : ROCHOSO_LAMBERT_FRAG,
      uniforms: {
        uMapaDia: { value: null },
        uAlbedoBase: { value: new THREE.Vector3(albedo[0], albedo[1], albedo[2]) },
        uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
        uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
        uLuzGanho: { value: 1 },
        // o gradiente EXATO do elipsoide (o cabeçalho diz por que não
        // é a aproximação de primeiro grau da Terra)
        uNormalEsc: {
          value: new THREE.Vector3(1, 1 / (this.razaoC * this.razaoC), 1 / (this.razaoB * this.razaoB)),
        },
        uEscalaLocal: { value: new THREE.Vector3(1, this.razaoC, this.razaoB) },
        ...uniformsDaLuzDaVisita(),
        ...uniformsDeEclipseNeutros(),
      },
      // corpo resolvido OPACO: escreve e testa o depth do palco (F0)
      depthWrite: true,
      depthTest: true,
      transparent: false,
    });
    this.superficie = new THREE.Mesh(this.geometria, this.matSuperficie);
    // globo opaco = ocultador do rascunho do campo (item 47): estrela
    // atrás dele não deposita clarão. Anel/atmosfera/nuvens ficam fora.
    this.superficie.layers.enable(CAMADA_DOS_OCULTADORES);
    this.superficie.matrixAutoUpdate = false;
    this.group.add(this.superficie);

    if (this.config.id === 'quaoar') {
      const anel = ANEIS_CITADOS.quaoar;
      this.geoAnel = new THREE.RingGeometry(anel.rInt, anel.rExt, 192);
      this.matAnel = new THREE.ShaderMaterial({
        vertexShader: ANEL_VERT,
        fragmentShader: ANEL_PROC_FRAG,
        uniforms: {
          uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
          uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
          uLuzGanho: { value: 1 },
          uKPolar: { value: this.razaoC },
          uSolAngRad: { value: 0 },
          uAnelRaios: { value: new THREE.Vector2(anel.rInt, anel.rExt) },
          uModo: { value: 2 },
        },
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      });
      this.anel = new THREE.Mesh(this.geoAnel, this.matAnel);
      this.anel.matrixAutoUpdate = false;
      this.group.add(this.anel);
    }
  }

  /** a carga preguiçosa — UM canal (`map`), pela transação única; corpo
   *  procedural não tem o que baixar e nasce pronto no mesmo passo. */
  private iniciarCarga() {
    this.texturas = 'buscando';
    if (this.config.superficie === 'procedural') {
      this.garantirCasca();
      this.texturas = 'pronta';
      return;
    }
    const id = this.config.id;
    void carregarCanaisDoCorpo(id, [CANAL_MAP], this.opcoes, () => this.disposto)
      .then((porCanal) => {
        // cancelada no caminho: o lote já foi descartado lá dentro
        if (!porCanal) return;
        // e o microtask entre a chegada e esta linha ainda cabe um
        // `dispose()` do Director — o lote não fica sem dono
        if (this.disposto) {
          for (const t of porCanal.values()) t.dispose();
          return;
        }
        const tex = porCanal.get('map')!;
        this.garantirCasca();
        this.matSuperficie!.uniforms.uMapaDia.value = tex;
        this.texturasVivas.push(tex);
        this.texturas = 'pronta';
      })
      .catch(() => {
        if (this.disposto) return;
        const r = estadoAposFalha(this.recargas, id, 'o corpo não nasce nesta sessão');
        this.recargas = r.recargas;
        this.texturas = r.texturas;
      });
  }

  dispose() {
    this.disposto = true;
    this.group.clear();
    this.geometria?.dispose();
    this.matSuperficie?.dispose();
    this.geoAnel?.dispose();
    this.matAnel?.dispose();
    for (const t of this.texturasVivas) t.dispose();
    this.texturasVivas.length = 0;
  }
}
