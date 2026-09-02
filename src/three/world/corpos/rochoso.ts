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
import { A_MAG_BASE_PC, DESLOCAMENTO_UA_PARA_PC } from '../planetas/planetas';
import { FOTOMETRIA, aMagBaseDe } from '../planetas/fotometria';
import { RETRATO_2026 } from '../planetas/retrato2026';
import { RAMP_DURATION_MS, stepRampToward } from '../lodStellar';
import {
  GLSL_ALTURA_DO_ALBEDO,
  GLSL_BUMP_DO_ALBEDO,
  GLSL_GRAO_DO_CLOSE,
  GLSL_RUIDO_DE_VALOR,
  diametroAparentePx,
  escalaDoBumpDoAlbedo,
} from './corpos';
import { LS_NORMALIZACAO_GLSL } from './lua';
import { LIMIAR_DO_GATE_PX, alvoDaCessaoDoCorpo, gateBinario } from './terra';
import {
  CANAL_ALTURA,
  CANAL_MAP,
  CANAL_NORMAL,
  type Seguradores,
  TexturasDoCorpo,
} from './texturas';
import type { OpcoesDeTextura } from './texturas';
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
import {
  ESCULPIDO_FRAG,
  ESCULPIDO_VERT,
  criaGeometriaEsculpida,
  uniformsDoEsculpido,
} from './esculpido';
import { PlumasDeEncelado, atividadeDasMares } from './plumas';
import type { QuadroDasPlumas } from './plumas';


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
  /**
   * F6: Haumea/Makemake/Éris/Quaoar — o −3 inventado; sem mapa.
   * S3 (item 134): `esculpido` é o terceiro caminho — sem mapa E sem
   * esfera, malha própria com o campo de crateras nos atributos
   * (`esculpido.ts`). É o único que troca a GEOMETRIA.
   */
  readonly superficie?: 'mapa' | 'procedural' | 'esculpido';
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
  // S3 (item 134) — as nove esculpidas de Saturno. Todas `lambert` com o
  // `terminadorSuave` da casa: o disco chato de Lommel-Seeliger é o fato
  // que uma FOTO confere, e não há foto destes nove com que conferir —
  // o que existe é a forma, e a forma está na malha.
  { id: 'pan', brdf: 'lambert', superficie: 'esculpido' },
  { id: 'daphnis', brdf: 'lambert', superficie: 'esculpido' },
  { id: 'atlas', brdf: 'lambert', superficie: 'esculpido' },
  { id: 'prometheus', brdf: 'lambert', superficie: 'esculpido' },
  { id: 'pandora', brdf: 'lambert', superficie: 'esculpido' },
  { id: 'janus', brdf: 'lambert', superficie: 'esculpido' },
  { id: 'epimetheus', brdf: 'lambert', superficie: 'esculpido' },
  { id: 'hyperion', brdf: 'lambert', superficie: 'esculpido' },
  { id: 'phoebe', brdf: 'lambert', superficie: 'esculpido' },
];

/**
 * O RELEVO POR LUA (item 134/S2) — `span`/`bias` como FRAÇÃO DO RAIO,
 * copiados do `relief.json` do projeto Saturn do dono. O raio do vértice
 * vira `1 + vies + altura·escala`: o viés é negativo para que a média
 * fique no raio nominal de `BODY_AXES` (a esfera não engorda).
 *
 * SÓ SEIS LUAS PORQUE SÓ SEIS TÊM MAPA. Quatro saem de modelo de forma
 * MEDIDO (Mimas e Tétis por SPC de Gaskell, Encélado pelo DEM de Schenk &
 * McKinnon 2024, Dione pelo DTM de Weirich et al. 2025); Reia e Jápeto
 * NÃO TÊM DTM público e o relevo deles é SINTÉTICO, gerado por código no
 * projeto dele — entra por decisão do dono e é confessado onde o
 * visitante lê (ficha do objeto, seção "a imagem", linha "relevo"), com o
 * texto nascendo em `docs/reference/ASSETS.md`.
 *
 * Mimas puxa 10 % do raio: Herschel é um terço do diâmetro dela, e é essa
 * a foto que o limbo tinha de mostrar e a esfera lisa não mostrava.
 */
export const RELEVO_DA_LUA: Readonly<Record<string, { escala: number; vies: number }>> = {
  mimas: { escala: 0.10200225260766879, vies: -0.04611062610562858 },
  enceladus: { escala: 0.009472107707579332, vies: -0.005141926965558401 },
  tethys: { escala: 0.03387224437534385, vies: -0.016188330361680364 },
  dione: { escala: 0.01065032313122289, vies: -0.005189992373296278 },
  // S2b — Reia e Jápeto entram por ORDEM DELE (02/09): "queremos o relevo
  // sobressaído, sabemos que Reia não é uma esfera, ela é acidentada". As
  // duas são o caso SINTÉTICO (sem DTM público), confessado na ficha; as
  // amplitudes são as do `relief.json` dele, sem corte.
  rhea: { escala: 0.02632461314614639, vies: -0.018329572914844723 },
  iapetus: { escala: 0.026878580907480177, vies: -0.017520709781114384 },
};

/**
 * A MALHA DENSA que o deslocamento exige. A esfera de 128×64 da casa tem
 * 1,4° por segmento no equador — larga demais para uma cratera de 130 km
 * aparecer NO LIMBO, que é o defeito que a S2 conserta. 256×128 iguala o
 * nível `ultra` dele e amostra o mapa de 1024 px a 4:1.
 *
 * NÃO HÁ LOD DE ESFERA, e é medição e não preguiça: o LOD dele existe
 * porque as luas dele são desenhadas SEMPRE, até com dois pixels. Aqui o
 * `LIMIAR_LUA_ROCHOSA_PX` já corta a lua fora do quadro abaixo de 48 px
 * de diâmetro — pela régua dele (razão distância/raio) a lua da casa
 * nunca passa de ~45, e os níveis médio e grosso dele NUNCA seriam
 * escolhidos. Um seletor com três níveis aqui seria código morto com
 * histerese. Ver o relatório da S2.
 */
const SEGMENTOS_COM_RELEVO: readonly [number, number] = [256, 128];

/** A escala TANGENCIAL do mapa de normais — o 1,2 dele (`normalScale`). */
const ESCALA_DA_NORMAL_DO_RELEVO = 1.2;

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

/**
 * O VERTEX DO RELEVO (item 134/S2) — deslocamento RADIAL por mapa de
 * altura, a receita dele (`moonMaterials.ts`): raio = 1 + viés +
 * altura·escala, com os dois em fração do raio. Fica num shader SEPARADO
 * do `ROCHOSO_VERT` de propósito: quem não tem relevo continua com o
 * vertex de sempre, sem sampler nem multiplicação a mais, e o A/B do
 * corpo sem relevo é bit-idêntico por construção.
 *
 * `texture2D` no vertex é leitura de nível 0 (GLSL ES 1.00 não aceita
 * viés de mip no estágio de vértice) — é o que se quer: o deslocamento
 * tem de ser o MESMO para todo vértice, venha a câmera de onde vier, ou
 * a silhueta pulsaria com a distância.
 */
const ROCHOSO_VERT_RELEVO = /* glsl */ `
uniform sampler2D uMapaAltura;
uniform vec2 uRelevo;  // (escala, viés) em fração do raio — relief.json dele
varying vec3 vLocal;   // posição DESLOCADA, ainda em raios de a
varying vec2 vUv;
void main() {
  vUv = uv;
  float h = texture2D(uMapaAltura, uv).r;
  vLocal = position * (1.0 + uRelevo.y + h * uRelevo.x);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(vLocal, 1.0);
}
`;

/**
 * A NORMAL DO MAPA, em espaço tangente sobre a esfera equiretangular.
 *
 * O FRAME É ANALÍTICO e não vem de atributo: a parametrização da
 * `SphereGeometry` do three é conhecida, e dela sai `T = ŷ × n̂` (leste,
 * o sentido de +u) e `B = n̂ × T` (norte, o sentido de +v) — as duas
 * derivadas exatas da malha. Calcular tangentes por atributo custaria um
 * pré-passo de geometria para o mesmo resultado.
 *
 * NOS POLOS O FRAME DEGENERA (ŷ × n̂ → 0) e a função devolve a normal
 * geométrica: um pixel de polo sem relevo é menos errado que uma normal
 * dividida por zero.
 *
 * A APROXIMAÇÃO DECLARADA: nas luas triaxiais o `T` exato não é
 * exatamente `ŷ × n̂`; em Mimas (a/b = 1,05) o erro de direção fica
 * abaixo de 3°, e o que ele desloca é a SOMBRA dentro da cratera, não a
 * silhueta (essa vem do vértice).
 */
const GLSL_NORMAL_DO_MAPA = /* glsl */ `
uniform sampler2D uMapaNormal;
uniform float uRelevoNormal;  // 0 desliga; a escala tangencial dele é 1,2
vec3 normalDoMapa(vec3 n, vec2 uv) {
  if (uRelevoNormal <= 0.0) return n;
  vec3 t = cross(vec3(0.0, 1.0, 0.0), n);
  float lt = length(t);
  if (lt < 1.0e-4) return n;
  t /= lt;
  vec3 b = cross(n, t);
  vec3 m = texture2D(uMapaNormal, uv).rgb * 2.0 - 1.0;
  return normalize(m.x * uRelevoNormal * t + m.y * uRelevoNormal * b + m.z * n);
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
${GLSL_ALTURA_DO_ALBEDO}
${GLSL_BUMP_DO_ALBEDO}
${GLSL_NORMAL_DO_MAPA}
${GLSL_RUIDO_DE_VALOR}
${GLSL_GRAO_DO_CLOSE}
void main() {
  vec3 n = normalDoCorpo(vLocal, uNormalEsc);
  vec3 pElip = vLocal * uEscalaLocal;
  vec3 albedo = texture2D(uMapaDia, vUv).rgb;
  // B2: com mapa de relevo, a normal vem MEDIDA e o bump do albedo
  // não entra — seriam duas fontes para a mesma cratera. B1 é o
  // substituto de quem não tem mapa (uRelevoNormal == 0).
  n = uRelevoNormal > 0.0
    ? normalDoMapa(n, vUv)
    : normalComBumpDoAlbedo(n, pElip, alturaDoAlbedo(albedo));
  // E: o grão do close, DEPOIS da normal — o ruído não é relevo
  albedo *= graoDoClose(vUv, vLocal);
  float ndotlGeo = dot(n, uDirSolLocal);
  vec3 sombras = fatorDeEclipse(pElip, n, ndotlGeo);
  vec3 luzSol = vec3(terminadorSuave(ndotlGeo)) * uLuzGanho * sombras;
  vec3 fill = lanternaDeLeitura(n, normSeguro(uCamLocal - pElip), sombras);
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
${GLSL_ALTURA_DO_ALBEDO}
${GLSL_BUMP_DO_ALBEDO}
${GLSL_NORMAL_DO_MAPA}
${GLSL_RUIDO_DE_VALOR}
${GLSL_GRAO_DO_CLOSE}
void main() {
  vec3 n = normalDoCorpo(vLocal, uNormalEsc);
  vec3 pElip = vLocal * uEscalaLocal;
  vec3 albedo = texture2D(uMapaDia, vUv).rgb;
  // B2: com mapa de relevo, a normal vem MEDIDA e o bump do albedo
  // não entra — seriam duas fontes para a mesma cratera. B1 é o
  // substituto de quem não tem mapa (uRelevoNormal == 0).
  n = uRelevoNormal > 0.0
    ? normalDoMapa(n, vUv)
    : normalComBumpDoAlbedo(n, pElip, alturaDoAlbedo(albedo));
  // E: o grão do close, DEPOIS da normal — o ruído não é relevo
  albedo *= graoDoClose(vUv, vLocal);
  vec3 dirCam = normSeguro(uCamLocal - pElip);
  float mu0 = clamp(dot(n, uDirSolLocal), 0.0, 1.0);
  float mu = clamp(dot(n, dirCam), 0.0, 1.0);
  float ls = ${LS_NORMALIZACAO_GLSL} * mu0 / max(mu0 + mu, 1.0e-4);
  vec3 sombras = fatorDeEclipse(pElip, n, mu0);
  vec3 luzSol = vec3(ls * uLuzGanho) * sombras;
  gl_FragColor = vec4(
    albedo * luzDoGlobo(luzSol, lanternaDeLeitura(n, dirCam, sombras)), 1.0
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
${GLSL_RUIDO_DE_VALOR}
void main() {
  vec3 n = normalDoCorpo(vLocal, uNormalEsc);
  vec3 pElip = vLocal * uEscalaLocal;
  float ndotlGeo = dot(n, uDirSolLocal);
  float g = 0.5 * ruido(vLocal * 3.0) + 0.3 * ruido(vLocal * 7.0) + 0.2 * ruido(vLocal * 15.0);
  vec3 albedo = uAlbedoBase * (0.72 + 0.56 * g);
  vec3 sombras = fatorDeEclipse(pElip, n, ndotlGeo);
  vec3 luzSol = vec3(terminadorSuave(ndotlGeo)) * uLuzGanho * sombras;
  vec3 fill = lanternaDeLeitura(n, normSeguro(uCamLocal - pElip), sombras);
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
${GLSL_RUIDO_DE_VALOR}
void main() {
  vec3 n = normalDoCorpo(vLocal, uNormalEsc);
  vec3 pElip = vLocal * uEscalaLocal;
  float g = 0.5 * ruido(vLocal * 3.0) + 0.3 * ruido(vLocal * 7.0) + 0.2 * ruido(vLocal * 15.0);
  vec3 albedo = uAlbedoBase * (0.72 + 0.56 * g);
  vec3 dirCam = normSeguro(uCamLocal - pElip);
  float mu0 = clamp(dot(n, uDirSolLocal), 0.0, 1.0);
  float mu = clamp(dot(n, dirCam), 0.0, 1.0);
  float ls = ${LS_NORMALIZACAO_GLSL} * mu0 / max(mu0 + mu, 1.0e-4);
  vec3 sombras = fatorDeEclipse(pElip, n, mu0);
  vec3 luzSol = vec3(ls * uLuzGanho) * sombras;
  gl_FragColor = vec4(
    albedo * luzDoGlobo(luzSol, lanternaDeLeitura(n, dirCam, sombras)), 1.0
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
  /** o Atlas está focado neste corpo (ou na lua dele) — um dos três que
   *  SEGURAM os texels (`Seguradores`, texturas.ts). */
  focoDoAtlas: boolean;
  /** o roteiro do filme declarou este corpo — o segurador monotônico. */
  pedidoDoRoteiro: boolean;
  politica: PoliticaDeLuz;
  /** o relógio de PAREDE do app em segundos — só a carência da descarga
   *  o consome (`CARENCIA_DA_DESCARGA_S`). */
  tS: number;
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

  /** o estado das texturas — a casa dele é o pipeline (`texturas.ts`) */
  private readonly texturas: TexturasDoCorpo;
  /** o registro dos três seguradores, REUSADO por tick (M4 da casa) */
  private readonly seguram: Seguradores = { tela: false, foco: false, filme: false };
  private disposto = false;

  private geometria: THREE.BufferGeometry | null = null;
  private superficie: THREE.Mesh | null = null;
  private matSuperficie: THREE.ShaderMaterial | null = null;
  private geoAnel: THREE.RingGeometry | null = null;
  private anel: THREE.Mesh | null = null;
  private matAnel: THREE.ShaderMaterial | null = null;
  /** S4 (item 134): só Encélado tem jatos — ver `plumas.ts`. */
  private plumas: PlumasDeEncelado | null = null;
  /** o quadro das plumas, REUSADO (zero alocação por tick, M4 da casa) */
  private quadroDasPlumas: QuadroDasPlumas | null = null;
  /** o tier VIVO, lido na hora (a mesma regra da textura): a dose de
   *  grãos da pluma é alocação, e alocação lê o tier antes de alocar. */
  private readonly tier: OpcoesDoRochoso['tier'];
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

  constructor(opcoes: OpcoesDoRochoso) {
    this.config = opcoes.config;
    const { a, c, b } = raiosDoRochosoPc(this.config.id);
    this.raioA = a;
    this.razaoC = c / a;
    this.razaoB = b / a;
    this.ehPlaneta = this.config.id in RETRATO_2026;
    this.tier = opcoes.tier;
    this.group.visible = false;
    this.texturas = new TexturasDoCorpo({
      corpo: this.config.id,
      // superfície PROCEDURAL não tem imagem para pedir: lista vazia, e
      // o corpo nasce pronto no primeiro gatilho sem tocar a rede
      canais:
        this.config.superficie !== undefined && this.config.superficie !== 'mapa'
          ? []
          : this.config.id in RELEVO_DA_LUA
            ? [CANAL_MAP, CANAL_ALTURA, CANAL_NORMAL]
            : [CANAL_MAP],
      rede: opcoes,
      oQueNaoNasce: 'o corpo não nasce nesta sessão',
      publicar: (porCanal) => {
        this.garantirCasca();
        // o procedural chega com o lote VAZIO — o shader dele não lê mapa
        const u = this.matSuperficie!.uniforms;
        const tex = porCanal.get('map');
        if (tex) {
          u.uMapaDia.value = tex;
          const img = tex.image as { width?: number; height?: number } | undefined;
          (u.uTamanhoDoMapa.value as THREE.Vector2).set(img?.width ?? 0, img?.height ?? 0);
        }
        // o lote é ATÔMICO (texturas.ts): ou vieram os três, ou nenhum
        const alt = porCanal.get('height');
        if (alt) u.uMapaAltura.value = alt;
        const nrm = porCanal.get('normal');
        if (nrm) u.uMapaNormal.value = nrm;
      },
      // o procedural nunca chega aqui (não há texel residente para
      // soltar), mas o uniform dele também não existe — a guarda serve
      // aos dois
      soltar: () => {
        const u = this.matSuperficie?.uniforms;
        if (!u) return;
        u.uMapaDia.value = null;
        (u.uTamanhoDoMapa.value as THREE.Vector2).set(0, 0);
        u.uMapaAltura.value = null;
        u.uMapaNormal.value = null;
      },
    });
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

    // OS MESMOS TRÊS SEGURADORES das irmãs (lei 4, item 115): tela, foco
    // do Atlas e roteiro do filme; o último a soltar abre a carência.
    this.seguram.tela = this.armado;
    this.seguram.foco = q.focoDoAtlas;
    this.seguram.filme = q.pedidoDoRoteiro;
    this.texturas.aoTick(this.seguram, q.tS);

    const emQuadro =
      this.armado &&
      q.ligado &&
      this.texturas.pronta &&
      Number.isFinite(this.centro.x);
    e.emQuadro = emQuadro;
    e.carregando = this.texturas.carregando;
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
      const alvo = alvoDaCessaoDoCorpo(
        base, this.centro, q.camPosPc, dPc, diametroPx, emQuadro, q.psf, q.screenHPx
      );
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
    escreverLuzDaVisita(u, q.politica, 0);
    // a sombra do eclipse — o mesmo fio das irmãs (sem deriva: casca única)
    escreverSombraDeEclipse(u, this.sombra, this.vX, this.vY, this.vZ, 0);

    // S4 — OS JATOS. Mesma matriz da casca (mesmo frame IAU, mesma
    // escala do elipsoide: as fissuras ficam grudadas nas listras) e os
    // MESMOS dois vetores locais do globo; a pluma segue a exposição da
    // visita pelo `ganho`, como a superfície.
    if (this.plumas && this.quadroDasPlumas) {
      this.plumas.pontos.matrix.copy(sup.matrix);
      const p = this.quadroDasPlumas;
      p.dirSolLocal.set(sLx, sLy, sLz);
      p.camLocal.set(cLx, cLy, cLz);
      p.luzGanho = ganho;
      p.atividade = atividadeDasMares(this.jdEscrito);
      p.alturaPx = q.screenHPx;
      p.tier = this.tier();
      this.plumas.atualizar(p);
    }

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
    // A MALHA DENSA só nasce onde há relevo (SEGMENTOS_COM_RELEVO diz por
    // que não há LOD); o resto da casa fica na esfera de sempre.
    const relevo = RELEVO_DA_LUA[this.config.id];
    // S3: o corpo ESCULPIDO troca a esfera pela malha própria — é o único
    // caminho desta classe em que a figura não mora na escala da matriz.
    const esculpido = this.config.superficie === 'esculpido';
    this.geometria = esculpido
      ? criaGeometriaEsculpida(this.config.id)
      : relevo
        ? new THREE.SphereGeometry(1, ...SEGMENTOS_COM_RELEVO)
        : new THREE.SphereGeometry(1, 128, 64);
    const procedural = this.config.superficie === 'procedural';
    const albedo = ALBEDO_PROCEDURAL[this.config.id] ?? [0.5, 0.5, 0.5];
    this.matSuperficie = new THREE.ShaderMaterial({
      vertexShader: esculpido
        ? ESCULPIDO_VERT
        : relevo
          ? ROCHOSO_VERT_RELEVO
          : ROCHOSO_VERT,
      fragmentShader: esculpido
        ? ESCULPIDO_FRAG
        : procedural
          ? this.config.brdf === 'ls'
            ? ROCHOSO_PROC_LS_FRAG
            : ROCHOSO_PROC_FRAG
          : this.config.brdf === 'ls'
            ? ROCHOSO_LS_FRAG
            : ROCHOSO_LAMBERT_FRAG,
      uniforms: {
        uMapaDia: { value: null },
        // B1 — o interruptor por corpo; procedural não tem mapa de onde
        // tirar gradiente, e o shader dele nem declara o bloco
        uBumpAlbedo: { value: procedural ? 0 : escalaDoBumpDoAlbedo(this.config.id) },
        // S3: cor/fundo/borda/crista da família de regolito. Só o corpo
        // esculpido lê estes; nos outros o bloco nem existe no shader.
        ...(esculpido ? uniformsDoEsculpido(this.config.id) : {}),
        // B2 — o relevo medido. Sem entrada em RELEVO_DA_LUA os três
        // ficam neutros e nenhum sampler é lido.
        uMapaAltura: { value: null },
        uMapaNormal: { value: null },
        uRelevo: {
          value: new THREE.Vector2(relevo?.escala ?? 0, relevo?.vies ?? 0),
        },
        uRelevoNormal: { value: relevo ? ESCALA_DA_NORMAL_DO_RELEVO : 0 },
        // E — o gate do grão. Quem escreve o tamanho VERDADEIRO é quem
        // publica o mapa (a variante do tier manda, não o manifesto);
        // (0,0) é "ainda não veio" e o chunk devolve 1 exato.
        uTamanhoDoMapa: { value: new THREE.Vector2(0, 0) },
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

    // S4 — os jatos nascem com a casca e morrem com ela; o gate deles é
    // o do corpo (48 px), porque são filhos do mesmo grupo.
    if (this.config.id === 'enceladus') {
      this.plumas = new PlumasDeEncelado();
      this.quadroDasPlumas = {
        dirSolLocal: new THREE.Vector3(),
        camLocal: new THREE.Vector3(),
        luzGanho: 1,
        atividade: 1,
        alturaPx: 1080,
        tier: 'cinema',
      };
      this.group.add(this.plumas.pontos);
    }

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

  dispose() {
    this.disposto = true;
    this.group.clear();
    this.geometria?.dispose();
    this.matSuperficie?.dispose();
    this.geoAnel?.dispose();
    this.matAnel?.dispose();
    this.plumas?.dispose();
    this.texturas.dispose();
  }
}
