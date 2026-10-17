// ============================================================
// AS LUAS ESCULPIDAS (item 134/S3) — desde 17/10/2026, só Febe.
//
// PROVENIÊNCIA: o ESCULPIDOR é código do PROJETO SATURN DO AUTOR
// (https://github.com/fgferre/Saturn, `src/scene/irregularMoonGeometry.ts`,
// `src/scene/proceduralMoonGeometry.ts` e o ramo 3D de `src/utils/noise.ts`),
// trazido com autorização dele e traduzido para o português da casa sem
// mudar uma conta: o mesmo icosaedro, o mesmo fbm de valor, o mesmo campo
// de crateras por semente, as mesmas quatro máscaras viajando como
// ATRIBUTO DE VÉRTICE. Os links de morfologia Cassini que ele cita corpo a
// corpo estão preservados abaixo, porque são a proveniência das razões de
// eixo, não decoração.
//
// O MATERIAL, ao contrário, é NOVO. O dele é `MeshStandardNodeMaterial` do
// TSL, com Hapke nenhum mas com o pipeline de luzes do three; esta casa não
// usa esse pipeline — a única luz direta é o Sol e o shader é próprio. O
// que atravessou foi a TABELA de famílias de regolito (`IRREGULAR_SURFACES`:
// cor de base, de fundo de cratera, de borda e de crista, com contraste e
// escalas de ruído), que é DADO; o modelo de luz aqui é o mesmo Lambert +
// `terminadorSuave` dos rochosos da casa, com o mesmo eclipse, a mesma
// `luzDaVisita` e o mesmo chunk de bump por derivada de tela que a S2 ligou
// em todo corpo sem atmosfera — a lei do dono de 02/09.
//
// POR QUE UMA GEOMETRIA E NÃO UM ELIPSOIDE. As pequenas de Saturno não
// são esferas achatadas (crista equatorial dos pastores do anel, o polo sul
// de Epimeteu rebaixado por um impacto antigo, as crateras de Febe). Um
// elipsoide com textura procedural mostraria a COR certa numa forma
// errada — e a forma é o fato que uma foto da Cassini confere.
//
// O QUE ESTA FORMA NÃO É: medida. As razões de eixo saem das dimensões
// publicadas (Cassini/NASA) onde elas existem; o campo de crateras é
// PROCEDURAL e determinístico por semente. A ficha do objeto diz isso na
// seção "a imagem", pela tabela `a forma` de `docs/reference/ASSETS.md` —
// é a mesma disciplina de confissão do −3 inventado dos anões.
//
// DETERMINISMO: `makeRng` é mulberry32 e o ruído é hash inteiro; a mesma
// semente dá a mesma malha em qualquer máquina e em qualquer sessão. O
// ab-identidade depende disso.
//
// HIPÉRION SAIU DAQUI EM 23/09/2026: a forma dele agora é MEDIDA (Cassini,
// Thomas/Joseph/Ansty 2018) por mapa de altura, na família dos rochosos
// com relevo (`rochoso.ts`, `RELEVO_DA_LUA`) — o mesmo caminho de Mimas.
// PÃ SAIU DAQUI EM 08/10/2026 pelo mesmo caminho (PLAN-LUAS-PEQUENAS.md):
// a forma medida pela Cassini, com o relevo fino das fotos. DAFNIS, ATLAS,
// PROMETEU, PANDORA, JANO E EPIMETEU SAÍRAM EM 17/10/2026, pela receita
// de Pã (a forma medida inteira no mapa de altura).
// ============================================================
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLSL_BUMP_DO_ALBEDO, GLSL_RUIDO_DE_VALOR } from './corpos';
import { GLSL_SOMBRA_ECLIPSE } from '../../../lib/atlas/eclipse';
import { GLSL_LUZ_DA_VISITA } from '../../../lib/atlas/luzDaVisita';
import { alvoDoMapa } from '../../../lib/atlas/reguaDosMapas';

// ------------------------------------------------------------
// RUÍDO — o ramo 3D de `utils/noise.ts` dele, verbatim na conta.
// ------------------------------------------------------------

/** mulberry32: PRNG determinístico, o dele. */
function geradorDeSemente(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(ix: number, iy: number, iz: number, semente: number): number {
  let h = Math.imul(ix, 0x8da6b343) ^ Math.imul(iy, 0xd8163841) ^ Math.imul(iz, 0xcb1ab31f) ^ semente;
  h = Math.imul(h ^ (h >>> 13), 0x85ebca6b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function ruidoDeValor3D(x: number, y: number, z: number, semente: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
  let res = 0;
  for (let dz = 0; dz <= 1; dz++) {
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const w = (dx ? ux : 1 - ux) * (dy ? uy : 1 - uy) * (dz ? uz : 1 - uz);
        res += w * hash3(ix + dx, iy + dy, iz + dz, semente);
      }
    }
  }
  return res;
}

/** Ruído fractal 3D, saída ~[0,1]. */
function fbm3D(x: number, y: number, z: number, oitavas: number, semente: number): number {
  let soma = 0, amp = 0.5, freq = 1, norma = 0;
  for (let o = 0; o < oitavas; o++) {
    soma += ruidoDeValor3D(x * freq, y * freq, z * freq, semente + o * 57) * amp;
    norma += amp;
    amp *= 0.5;
    freq *= 2.05;
  }
  return soma / norma;
}

// ------------------------------------------------------------
// A FORMA DE CADA CORPO — dado dele, verbatim.
// ------------------------------------------------------------

interface CrateraCitada {
  centro: [number, number, number];
  raio: number;
  fundura: number;
  borda: number;
  escuridao: number;
}

export interface FormaEsculpida {
  /** densidade da malha: detail 18 = 7.220 triângulos antes do weld */
  detalhe: number;
  semente: number;
  /** razões semieixo/raio médio de catálogo em X/Y/Z locais (Y = polo) */
  eixos: [number, number, number];
  escalaMacro: number;
  forcaMacro: number;
  numeroDeCrateras: number;
  raioDaCratera: [number, number];
  funduraDaCratera: [number, number];
  bordaDaCratera: [number, number];
  /** >1 arredonda a bacia; perto de 1 preserva a parede de impacto */
  maciezDaCratera: number;
  escuridaoDoFundo: [number, number];
  crista?: { altura: number; potencia: number };
  craterasCitadas?: CrateraCitada[];
}

/**
 * A forma do projeto Saturn do autor que ficou, com a referência de
 * morfologia Cassini/NASA que ele anotou:
 *  - Febe (quase esférica, muito escura, capturada):
 *    https://science.nasa.gov/saturn/moons/phoebe/
 *
 * As razões de eixo usam as dimensões publicadas onde a Cassini as
 * resolveu; onde não há modelo de forma completo, são aproximações
 * VISUAIS conservadoras — nunca topografia de efeméride. A morfologia com
 * fonte é que é a régua.
 */
export const FORMAS_ESCULPIDAS: Record<string, FormaEsculpida> = {
  phoebe: {
    detalhe: 20, semente: 907, eixos: [1.03, 0.98, 1.00],
    escalaMacro: 2.5, forcaMacro: 0.065,
    numeroDeCrateras: 25, raioDaCratera: [0.10, 0.30], funduraDaCratera: [0.020, 0.085],
    bordaDaCratera: [0.002, 0.008], maciezDaCratera: 1.25, escuridaoDoFundo: [0.24, 0.66],
    craterasCitadas: [
      { centro: [0.22, 0.78, 0.58], raio: 0.43, fundura: 0.14, borda: 0.010, escuridao: 0.62 },
    ],
  },
};

/** Os ids esculpidos — só Febe desde 17/10/2026. */
export const IDS_ESCULPIDOS: readonly string[] = ['phoebe'];

// ------------------------------------------------------------
// O ESCULPIDOR
// ------------------------------------------------------------

interface Cratera {
  centro: THREE.Vector3;
  raio: number;
  fundura: number;
  borda: number;
  escuridao: number;
}

const trava01 = (x: number): number => Math.max(0, Math.min(1, x));
const suave01 = (x: number): number => {
  const t = trava01(x);
  return t * t * (3 - 2 * t);
};
const interp = (a: number, b: number, t: number): number => a + (b - a) * t;

function sortearCrateras(c: FormaEsculpida): Cratera[] {
  const rng = geradorDeSemente(c.semente ^ 0x6d2b79f5);
  const crateras: Cratera[] = (c.craterasCitadas ?? []).map((k) => ({
    centro: new THREE.Vector3(...k.centro).normalize(),
    raio: k.raio,
    fundura: k.fundura,
    borda: k.borda,
    escuridao: k.escuridao,
  }));

  for (let i = 0; i < c.numeroDeCrateras; i++) {
    let candidata: Cratera | null = null;
    // Rejeição de ruído-azul fraca: evita aglomerado em flor sem tirar a
    // superposição realista entre gerações de impacto.
    for (let tentativa = 0; tentativa < 48; tentativa++) {
      const z = rng() * 2 - 1;
      const theta = rng() * Math.PI * 2;
      const radial = Math.sqrt(Math.max(0, 1 - z * z));
      const tRaio = Math.pow(rng(), 1.65); // muitas pequenas, poucas grandes
      const raio = interp(c.raioDaCratera[0], c.raioDaCratera[1], tRaio);
      const tFundura = trava01(tRaio * 0.72 + rng() * 0.28);
      candidata = {
        centro: new THREE.Vector3(radial * Math.cos(theta), z, radial * Math.sin(theta)),
        raio,
        fundura: interp(c.funduraDaCratera[0], c.funduraDaCratera[1], tFundura),
        borda: interp(c.bordaDaCratera[0], c.bordaDaCratera[1], rng()),
        escuridao: interp(c.escuridaoDoFundo[0], c.escuridaoDoFundo[1], rng()),
      };
      const separada = crateras.every((outra) => {
        const corda = Math.sqrt(Math.max(0, 2 * (1 - candidata!.centro.dot(outra.centro))));
        return corda > (candidata!.raio + outra.raio) * 0.30;
      });
      if (separada) break;
    }
    if (candidata) crateras.push(candidata);
  }
  return crateras;
}

interface AmostraDeCratera {
  deslocamento: number;
  fundo: number;
  borda: number;
  cavidade: number;
}

function amostrarCrateras(
  p: THREE.Vector3,
  crateras: readonly Cratera[],
  maciez: number
): AmostraDeCratera {
  let baciaMaisFunda = 0;
  let bordaMaisAlta = 0;
  let fundo = 0;
  let borda = 0;
  let cavidade = 0;

  for (const k of crateras) {
    const corda = Math.sqrt(Math.max(0, 2 * (1 - p.dot(k.centro))));
    if (corda >= k.raio) continue;
    const t = corda / k.raio;
    const bacia = -Math.pow(Math.max(0, 1 - t * t), maciez) * k.fundura;
    // A transição parede/borda tem de cobrir vários anéis da tesselação:
    // uma máscara de um vértice só vira serra no close mesmo com normal
    // suave, e a Cassini mostra paredes largas de gelo exposto em Hipérion.
    const faixaDeBorda = suave01((t - 0.55) / 0.23) * (1 - suave01((t - 0.78) / 0.22));
    // Bordas superpostas não podem SOMAR em espinho: o impacto mais fundo
    // fica com a bacia e a borda local mais forte fica com o lábio.
    baciaMaisFunda = Math.min(baciaMaisFunda, bacia);
    bordaMaisAlta = Math.max(bordaMaisAlta, faixaDeBorda * k.borda);
    fundo = Math.max(fundo, (1 - suave01((t - 0.42) / 0.30)) * k.escuridao);
    borda = Math.max(borda, faixaDeBorda);
    cavidade = Math.max(cavidade, 1 - suave01((t - 0.12) / 0.88));
  }

  return {
    deslocamento: Math.max(-0.34, Math.min(0.07, baciaMaisFunda + bordaMaisAlta)),
    fundo: trava01(fundo),
    borda: trava01(borda),
    cavidade: trava01(cavidade),
  };
}

/**
 * A MALHA DE UM CORPO ESCULPIDO, em unidades do RAIO MÉDIO de `BODY_AXES`
 * — os eixos vêm multiplicados AQUI (é por isso que lá o corpo entra como
 * esfera: a razão de eixo não pode ser aplicada duas vezes).
 *
 * O WELD no fim é dele e tem motivo medido: `PolyhedronGeometry` é NÃO
 * indexada, então `computeVertexNormals` daria uma normal chapada por
 * triângulo mesmo com `flatShading` desligado. Estes corpos não usam UV,
 * então soldar as posições coincidentes e deixar o vértice compartilhado
 * receber a média é de graça.
 */
export function criaGeometriaEsculpida(id: string): THREE.BufferGeometry {
  const c = FORMAS_ESCULPIDAS[id];
  const geo = new THREE.IcosahedronGeometry(1, c.detalhe);
  const pos = geo.getAttribute('position');
  const fundo = new Float32Array(pos.count);
  const borda = new Float32Array(pos.count);
  const cavidade = new Float32Array(pos.count);
  const crista = new Float32Array(pos.count);
  const crateras = sortearCrateras(c);
  const p = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).normalize();
    const k = amostrarCrateras(p, crateras, c.maciezDaCratera);
    const macro = (fbm3D(
      p.x * c.escalaMacro + c.semente * 0.013,
      p.y * c.escalaMacro - c.semente * 0.009,
      p.z * c.escalaMacro + c.semente * 0.006,
      4,
      c.semente
    ) - 0.5) * c.forcaMacro;
    const radial = Math.max(0.56, 1 + macro + k.deslocamento);

    const equador = Math.hypot(p.x, p.z);
    const mascaraDaCrista = c.crista ? Math.pow(equador, c.crista.potencia) : 0;
    const alturaDaCrista = c.crista ? c.crista.altura * mascaraDaCrista : 0;
    const [ex, ey, ez] = c.eixos;
    pos.setXYZ(
      i,
      p.x * radial * (ex + alturaDaCrista),
      p.y * radial * ey,
      p.z * radial * (ez + alturaDaCrista)
    );
    fundo[i] = k.fundo;
    borda[i] = k.borda;
    cavidade[i] = k.cavidade;
    crista[i] = mascaraDaCrista;
  }

  pos.needsUpdate = true;
  geo.setAttribute('aFundoDeCratera', new THREE.BufferAttribute(fundo, 1));
  geo.setAttribute('aBordaDeCratera', new THREE.BufferAttribute(borda, 1));
  geo.setAttribute('aCavidade', new THREE.BufferAttribute(cavidade, 1));
  geo.setAttribute('aCrista', new THREE.BufferAttribute(crista, 1));
  geo.deleteAttribute('uv');
  geo.deleteAttribute('normal');
  const soldada = mergeVertices(geo, 1e-5);
  geo.dispose();
  soldada.computeVertexNormals();
  soldada.computeBoundingSphere();
  // a média do regolito sai desta malha, de graça, para `coresNaRegua`
  if (!MEDIAS_DO_REGOLITO.has(id)) MEDIAS_DO_REGOLITO.set(id, mediaDoRegolito(soldada, FAMILIAS_DE_REGOLITO[id]));
  return soldada;
}

// ------------------------------------------------------------
// A FAMÍLIA DE REGOLITO — dado dele (`IRREGULAR_SURFACES`).
// ------------------------------------------------------------

export interface FamiliaDeRegolito {
  semente: number;
  base: readonly [number, number, number];
  fundo: readonly [number, number, number];
  borda: readonly [number, number, number];
  crista: readonly [number, number, number];
  escalaMacro: number;
  escalaMicro: number;
  contraste: number;
  misturaFundo: number;
  misturaBorda: number;
  misturaCrista: number;
  escurecerCavidade: number;
  /** oclusão da cavidade — morde só a LANTERNA, que é o que AO significa */
  oclusao: number;
  /** amplitude do bump em FRAÇÃO DO RAIO — o `bumpStrength` dele */
  forcaBump: number;
}

/**
 * A família dele que ficou (Febe). Desde a régua (PLAN-REGUA-UNICA.md, R2) só as
 * PROPORÇÕES entre base, fundo, borda e crista valem: o nível e a cor média
 * de cada corpo são os medidos da tabela única (`reguaDosMapas.ts`), postos
 * por `coresNaRegua` — os números absolutos daqui não chegam ao shader.
 */
export const FAMILIAS_DE_REGOLITO: Record<string, FamiliaDeRegolito> = {
  phoebe: {
    semente: 9.07, base: [0.090, 0.082, 0.073], fundo: [0.032, 0.027, 0.023],
    borda: [0.16, 0.145, 0.125], crista: [0.090, 0.082, 0.073],
    escalaMacro: 3.6, escalaMicro: 13, contraste: 0.24,
    misturaFundo: 0.70, misturaBorda: 0.58, misturaCrista: 0,
    escurecerCavidade: 0.075, oclusao: 0.18, forcaBump: 0.016,
  },
};

// ------------------------------------------------------------
// A RÉGUA (PLAN-REGUA-UNICA.md, R2) — o nível e a cor média da família
// ------------------------------------------------------------

type CoresDoRegolito = Pick<FamiliaDeRegolito, 'base' | 'fundo' | 'borda' | 'crista'>;

/**
 * A MÉDIA DO ALBEDO da superfície esculpida, canal a canal [R, G, B], por
 * ÁREA da malha (`geo`, a de `criaGeometriaEsculpida`): em cada vértice, o
 * encadeamento do `ESCULPIDO_FRAG` com as quatro máscaras dele e o ruído na
 * ESPERANÇA; em cada triângulo, a média dos três vértices.
 *
 * O RUÍDO NA ESPERANÇA, e por que é honesto: as duas bandas de fbm do shader
 * são simétricas em torno de ½ e o albedo é afim em cada uma (o fator macro
 * vale 1 + contraste·(2·macro − 1), o micro 0,08·micro + 0,96), e o que vem
 * depois (crista, cavidade, fundo, borda) é afim no albedo — então a média do
 * albedo é a desta conta com os dois fatores em 1. O que fica de fora é a
 * REALIZAÇÃO do ruído nesta superfície (umas centenas de células de fbm:
 * estimado em menos de 1 % da média), que o JS não reproduz — o hash do
 * shader é o `sin` em float32 da GPU.
 */
export function mediaDoRegolito(
  geo: THREE.BufferGeometry,
  f: FamiliaDeRegolito
): [number, number, number] {
  const pos = geo.getAttribute('position');
  const indice = geo.getIndex();
  const mascaras = ['aFundoDeCratera', 'aBordaDeCratera', 'aCavidade', 'aCrista'].map((n) => geo.getAttribute(n));
  const [mFundo, mBorda, mCavidade, mCrista] = mascaras;
  const albedo = new Float64Array(3 * pos.count);
  for (let v = 0; v < pos.count; v++) {
    for (let c = 0; c < 3; c++) {
      let a = interp(f.base[c], f.crista[c], mCrista.getX(v) * f.misturaCrista);
      a *= 1 - mCavidade.getX(v) * f.escurecerCavidade;
      a = interp(a, f.fundo[c], mFundo.getX(v) * f.misturaFundo);
      a = interp(a, f.borda[c], mBorda.getX(v) * f.misturaBorda);
      albedo[3 * v + c] = trava01(a);
    }
  }
  const vertice = (k: number): number => (indice ? indice.getX(k) : k);
  const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const soma: [number, number, number] = [0, 0, 0];
  let area = 0;
  for (let t = 0; t < (indice ? indice.count : pos.count); t += 3) {
    const v = [vertice(t), vertice(t + 1), vertice(t + 2)];
    a.fromBufferAttribute(pos, v[0]);
    b.fromBufferAttribute(pos, v[1]).sub(a);
    c.fromBufferAttribute(pos, v[2]).sub(a);
    const s = b.cross(c).length() / 2;
    area += s;
    for (let k = 0; k < 3; k++) soma[k] += (s * (albedo[3 * v[0] + k] + albedo[3 * v[1] + k] + albedo[3 * v[2] + k])) / 3;
  }
  return [soma[0] / area, soma[1] / area, soma[2] / area];
}

/** A média do regolito de cada corpo com as cores DELE, medida na primeira malha que `criaGeometriaEsculpida` faz. */
const MEDIAS_DO_REGOLITO = new Map<string, readonly [number, number, number]>();

/**
 * AS CORES DA FAMÍLIA NA RÉGUA: base, fundo, borda e crista escaladas JUNTAS,
 * um fator por canal, até a média por área da superfície (`mediaDoRegolito`)
 * dar p0 em G e p0·R/G, p0·B/G em R e B (`alvoDoMapa`, a tabela única) — o
 * nível e a tinta medidos, com o desenho da família (as proporções) intacto. O
 * albedo é linear nas quatro cores juntas, então o fator acerta a média em
 * uma conta.
 */
export function coresNaRegua(id: string): CoresDoRegolito {
  if (!MEDIAS_DO_REGOLITO.has(id)) criaGeometriaEsculpida(id).dispose();
  const media = MEDIAS_DO_REGOLITO.get(id);
  if (!media) throw new Error(`régua: ${id} não é esculpida.`);
  const f = FAMILIAS_DE_REGOLITO[id];
  const { p0, BG, RG } = alvoDoMapa(id);
  const fator = [p0 * RG, p0, p0 * BG].map((alvo, c) => alvo / media[c]);
  const escala = (cor: readonly [number, number, number]) =>
    [cor[0] * fator[0], cor[1] * fator[1], cor[2] * fator[2]] as const;
  return { base: escala(f.base), fundo: escala(f.fundo), borda: escala(f.borda), crista: escala(f.crista) };
}

// ------------------------------------------------------------
// GLSL
// ------------------------------------------------------------

/**
 * O VERTEX DO ESCULPIDO. Duas diferenças para o `ROCHOSO_VERT`: a normal
 * vem da MALHA (o corpo não é elipsoide, então o gradiente analítico não
 * serve) e as quatro máscaras de cratera viajam como atributo — é o que
 * faz o piso escuro ficar DENTRO da bacia em vez de virar um padrão
 * celular pintado por cima.
 */
export const ESCULPIDO_VERT = /* glsl */ `
attribute float aFundoDeCratera;
attribute float aBordaDeCratera;
attribute float aCavidade;
attribute float aCrista;
varying vec3 vLocal;    // posição na malha, em raios médios
varying vec3 vNormal;   // normal da MALHA (média dos vértices soldados)
varying vec4 vCratera;  // (fundo, borda, cavidade, crista)
void main() {
  vLocal = position;
  vNormal = normal;
  vCratera = vec4(aFundoDeCratera, aBordaDeCratera, aCavidade, aCrista);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * O FRAGMENTO DO ESCULPIDO — Lambert + `terminadorSuave`, o mesmo modelo
 * de luz do `ROCHOSO_LAMBERT_FRAG` (com o mesmo eclipse, a mesma
 * `luzDaVisita` e a mesma lanterna de leitura do item 93). O que muda é de
 * onde vem o albedo:
 *
 *   base ← duas bandas de ruído (macro dá a mancha, micro dá o grão)
 *        → crista de acreção → escurecimento da cavidade
 *        → fundo de cratera  → borda de cratera
 *
 * — a MESMA ordem de mistura dele, com as máscaras vindas do vértice.
 *
 * A OCLUSÃO morde só a LANTERNA e nunca o Sol: sombra de cavidade sob luz
 * direta já é o que a normal da malha resolve, e subtraí-la de novo do
 * termo direto contaria a mesma sombra duas vezes.
 *
 * O BUMP É O CHUNK DA CASA (`normalComBumpDoAlbedo`, da S2), com a
 * amplitude por corpo DELE (`bumpStrength`, 0,3 % a 2,5 % do raio): a lei
 * do dono de 02/09 vale aqui — corpo sem atmosfera mostra relevo.
 */
export const ESCULPIDO_FRAG = /* glsl */ `
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uLuzGanho;
uniform vec3 uCorBase;
uniform vec3 uCorFundo;
uniform vec3 uCorBorda;
uniform vec3 uCorCrista;
uniform vec4 uMisturas;   // (fundo, borda, crista, escurecerCavidade)
uniform vec4 uRegolito;   // (escalaMacro, escalaMicro, contraste, oclusão)
uniform float uSemente;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec4 vCratera;
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_SOMBRA_ECLIPSE}
${GLSL_LUZ_DA_VISITA}
${GLSL_BUMP_DO_ALBEDO}
${GLSL_RUIDO_DE_VALOR}
// AS DUAS BANDAS DELE, oitava por oitava. O mx_fractal_noise_float do
// TSL soma oitavas CENTRADAS EM ZERO e NÃO normaliza pela soma das
// amplitudes — é dessa soma que sai a amplitude do relevo. A tradução da
// S3 usara três oitavas normalizadas de ruído em [0,1], e a conta da
// diferença é o que o dono viu: a altura de bump saía com desvio 0,080
// contra 0,302 destas bandas, e a oitava mais fina parava em 4,2× a
// escala de base contra 17,7× (o grão fino sumia, e o relevo com ele).
// Aqui as oitavas são as dele: macro 5
// com lacunaridade 2,05 e ganho 0,52, micro 4 com 2,12 e 0,48.
float bandaFbm(vec3 p, int oitavas, float lacunaridade, float ganho) {
  float soma = 0.0;
  float amp = 1.0;
  float freq = 1.0;
  for (int o = 0; o < 5; o++) {
    if (o >= oitavas) break;
    soma += amp * (2.0 * ruido(p * freq) - 1.0);
    amp *= ganho;
    freq *= lacunaridade;
  }
  return soma;
}
void main() {
  vec3 n = normSeguro(vNormal);
  vec3 d = normSeguro(vLocal);
  vec3 off = vec3(uSemente * 0.73, uSemente * -0.41, uSemente * 0.57);
  float macroBruto = bandaFbm(d * uRegolito.x + off, 5, 2.05, 0.52);
  float microBruto = bandaFbm(d * uRegolito.y + off * 3.1, 4, 2.12, 0.48);
  float macro = clamp(macroBruto * 0.5 + 0.5, 0.0, 1.0);
  float micro = clamp(microBruto * 0.5 + 0.5, 0.0, 1.0);
  vec3 albedo = mix(uCorBase * (1.0 - uRegolito.z), uCorBase * (1.0 + uRegolito.z), macro);
  albedo *= micro * 0.08 + 0.96;
  albedo = mix(albedo, uCorCrista, vCratera.w * uMisturas.z);
  albedo *= 1.0 - vCratera.z * uMisturas.w;
  albedo = mix(albedo, uCorFundo, vCratera.x * uMisturas.x);
  albedo = mix(albedo, uCorBorda, vCratera.y * uMisturas.y);
  albedo = clamp(albedo, 0.0, 1.0);
  // O BUMP LÊ O RUÍDO, NÃO O ALBEDO — e a diferença é medida (foto do
  // primeiro tiro de Hipérion, 02/09): as máscaras de cratera viajam por
  // VÉRTICE, então dentro de um triângulo elas são lineares e o gradiente
  // de tela fica CONSTANTE por face; alimentar o bump com elas
  // transformava a malha de 8.820 faces num mosaico de facetas duras.
  // As duas bandas de fbm são contínuas na superfície inteira — e são a
  // MESMA altura de bump que ele usa: macro*0,62 + micro*0,38, sobre as
  // bandas BRUTAS (centradas em zero), que é onde mora a amplitude.
  n = normalComBumpDoAlbedo(n, vLocal, macroBruto * 0.62 + microBruto * 0.38);
  float ndotlGeo = dot(n, uDirSolLocal);
  vec3 sombras = fatorDeEclipse(vLocal, n, ndotlGeo);
  vec3 luzSol = vec3(terminadorSuave(ndotlGeo)) * uLuzGanho * sombras;
  vec3 fill = lanternaDeLeitura(n, normSeguro(uCamLocal - vLocal), sombras)
    * (1.0 - vCratera.z * uRegolito.w);
  gl_FragColor = vec4(albedo * luzDoGlobo(luzSol, fill), 1.0);
}
`;

/** Os uniformes de família de um corpo esculpido — dado virando uniform, as cores na régua. */
export function uniformsDoEsculpido(id: string): Record<string, { value: unknown }> {
  const f = FAMILIAS_DE_REGOLITO[id];
  const cores = coresNaRegua(id);
  return {
    uCorBase: { value: new THREE.Vector3(...cores.base) },
    uCorFundo: { value: new THREE.Vector3(...cores.fundo) },
    uCorBorda: { value: new THREE.Vector3(...cores.borda) },
    uCorCrista: { value: new THREE.Vector3(...cores.crista) },
    uMisturas: {
      value: new THREE.Vector4(
        f.misturaFundo, f.misturaBorda, f.misturaCrista, f.escurecerCavidade
      ),
    },
    uRegolito: {
      value: new THREE.Vector4(f.escalaMacro, f.escalaMicro, f.contraste, f.oclusao),
    },
    uSemente: { value: f.semente },
    // a amplitude do bump é DELE, corpo a corpo — o padrão de 2 % da casa
    // é grosso demais para uma lua de 4 km de raio como Dáfnis
    uBumpAlbedo: { value: f.forcaBump },
  };
}
