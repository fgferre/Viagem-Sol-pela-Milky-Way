// ============================================================
// O CORPO DE ESTRELA — toda estrela é um lugar (pilar 2 do NORTE, piloto
// de 12/11/2026). UM shader paramétrico desenha a fotosfera de qualquer
// estrela a partir da física dela (`lib/atlas/estrelasVisitaveis.ts`);
// as quatro do piloto (Proxima, Sirius A+B, Betelgeuse, Vega) são as
// primeiras instâncias. O Sol NÃO passa por aqui: ele segue sendo o
// `StellarBody` (paleta H-alfa autorada), intocado.
//
// A LEI POR PONTO DA SUPERFÍCIE:
//  · a COR é corpo negro(T) × o FILTRO fotográfico do Sol (a paleta de
//    `sol/sun.js` sobre o corpo negro de 5.772 K, artística) elevado a
//    w(T): inteiro até 5.772 K, esmaecendo a 0 em 8.000 K — senão as
//    quentes sairiam laranja e a ordem física da cor se inverteria (ver
//    `pelaTemperatura`). T é a LOCAL (Vega: escurecimento gravitacional;
//    Proxima: manchas e erupções). A luminância é a RADIÂNCIA na banda de
//    render (`radianciaVisivelDeCorpoNegro`, a lei que `repartir` usa —
//    decisão L1 da Lei da Estrela: a estrela vive na banda visível, e é
//    nela que o ponto do catálogo é medido; a T⁴ bolométrica deixaria uma
//    M de 3.000 K 4× clara demais contra o próprio ponto);
//  · no BRILHO ASSISTIDO o corpo visitado ganha a exposição da visita
//    (`ganhoDaVisita`): o nível de tela do Sol × (radiância / a do Sol)^¼
//    — a ordem fica, ninguém sai lama nem estoura; no REAL, a radiância
//    verdadeira;
//  · a radiância vai à tela pela MESMA ponte do Sol: `radianciaDeTela`
//    com o raio do SOL (a unidade da casa é "a superfície do Sol"; o vão
//    é uma troca de unidade, não depende do raio de quem emite — usar o
//    raio da estrela erraria por (R☉/R)²), descida em stops pelo mesmo
//    filtro da fração do quadro (`overrideExpoente` de `repartir`) e
//    comprimida pela mesma `β·asinh(x/β)`. Nada depende do que está em
//    foco;
//  · borda: I = 1 − u(1 − μ);
//  · granulação: Worley 3D na esfera unitária, com a CONCESSÃO
//    CINEMATOGRÁFICA do próprio Sol (`ESCALA_CINEMATOGRAFICA_DOS_GRANULOS`,
//    abaixo): tamanho e contraste relativos ao que o shader do Sol mostra,
//    pela lei física dos dados; LOD de TELA só abaixo de ~2 px.
//
// OS DOIS RELÓGIOS (NORTE): a ROTAÇÃO sai da data simulada (lenta, sem
// acumular); o FERVER dos grânulos e as erupções saem do relógio de tela
// (rápido, 0 no modo foto).
//
// UM MOTOR SÓ: nenhum ramo por estrela, nenhum nome no shader nem no
// material. Cada traço liga por PARÂMETRO FÍSICO dos dados: grânulos por
// `granuloEmRaios`/`contrasteGranulos`, células gigantes pela presença de
// `celulasGigantesEmRaios`, manchas por `manchas`, erupções por
// `erupcoes`, borda difusa por `bordaDifusaRaios`, forma e escurecimento
// gravitacional por `achatamento`, a anã companheira por `companheira`.
//
// O QUE O SOL PRECISARIA PARA VIRAR INSTÂNCIA DESTE MOTOR (não feito): o
// ciclo de atividade pela data (regiões ativas, plage e manchas que nascem
// e migram — hoje só calotas fixas), a cromosfera assada e o fluxo
// magnético simulado (os bakes de `sol/granulation.js`/`chromo.js`), e o
// exterior: coroa volumétrica, proeminências, laços e CME.
//
// PRECISÃO: as estrelas estão a 1,3–153 pc da origem e os raios vão de
// 1,8e-10 a 1,7e-5 pc. Nenhuma posição de MUNDO entra no shader: o
// vértice é a esfera unitária, a translação e a escala vivem na
// `modelViewMatrix` (composta pelo three em float64 na CPU) e todo o
// resto é espaço de vista ou de objeto.
// ============================================================
import * as THREE from 'three';
import { GRANULO_SOL_EM_RAIOS } from '../../lib/atlas/estrelasVisitaveis';
import type { Achatamento, EstrelaVisitavel, Orbita } from '../../lib/atlas/estrelasVisitaveis';
import { RAIO_SOL_PC } from '../escala';
import {
  M_V_SOL_DO_CAMPO,
  TEFF_SOL_K,
  blackbodyLinear as blackbodyRgb,
  radianciaVisivelDeCorpoNegro,
} from '../luzDaCasa';
import { GLSL_COMPRESSAO, GLSL_STAR_COLOR, GLSL_STAR_PSF } from '../shaders/common';
import { BETA_DA_EMISSAO, STAR_FRAG } from '../shaders/starShaders';
import { GLSL_PONTO_NA_BORDA, GLSL_PONTO_NA_BORDA_VARYINGS } from '../shaders/pontoNaBorda';
import { AU_PARA_PC } from '../../lib/atlas/frameGalactico';
import type { PoliticaDeLuz } from '../../lib/atlas/luz';
import { SOL_FORA_DO_ACES, SOL_NO_ACES, TEFF_SEM_FILTRO_K } from './stellarBody';
import { porCurva } from '../core/engine';

const GRAU = Math.PI / 180;
const JD_J2000 = 2451545;
const DIAS_POR_ANO = 365.25;

// ─── AS PARTES PURAS (testadas sem GPU) ──────────────────────────────────

/**
 * A FORMA E A TEMPERATURA DE UMA ROTADORA RÁPIDA — modelo de Roche com
 * rotação rígida (massa central, Rp = 1, GM = 1). A razão Re/Rp medida
 * fixa Ω² = 2(1 − Rp/Re)/Re²; a superfície r(θ) sai de
 * 1/r + ½Ω²r²sin²θ = 1 (Newton), e g_eff é o gradiente do potencial.
 *
 * A temperatura é von Zeipel, T ∝ g_eff^β, NORMALIZADA nas duas pontas
 * medidas (polo e equador de Monnier 2012): o β efetivo que faz isso com
 * esta forma é 0,2307 contra os 0,231 publicados (0,1 %), porque o
 * modelo do artigo também ajusta a lei de escurecimento de borda.
 */
export interface Roche {
  /** raio em unidades do raio EQUATORIAL (1 no equador) */
  raio: number;
  teffK: number;
  /** normal externa em (radial, colatitude) — para a normal da malha */
  nr: number;
  nt: number;
}

export function rocheDe(colatRad: number, a: Achatamento): Roche {
  const re = a.raioEquatorialRsol.v / a.raioPolarRsol.v;
  const w2 = (2 * (1 - 1 / re)) / (re * re);
  const s = Math.sin(colatRad);
  const c = Math.cos(colatRad);
  let r = 1;
  for (let i = 0; i < 30; i++) {
    const f = 1 / r + 0.5 * w2 * r * r * s * s - 1;
    const df = -1 / (r * r) + w2 * r * s * s;
    const passo = f / df;
    r -= passo;
    if (Math.abs(passo) < 1e-14) break;
  }
  // ∂Φ/∂r e (1/r)∂Φ/∂θ de Φ = −1/r − ½Ω²r²sin²θ: o vetor aponta para FORA
  const gr = 1 / (r * r) - w2 * r * s * s;
  const gt = -w2 * r * s * c;
  const g = Math.hypot(gr, gt);
  const gEq = 1 / (re * re) - w2 * re;
  const tp = a.teffPoloK.v;
  const beta = Math.log(a.teffEquadorK.v / tp) / Math.log(gEq);
  return { raio: r / re, teffK: tp * Math.pow(g, beta), nr: gr / g, nt: gt / g };
}

/**
 * A POSIÇÃO DA COMPANHEIRA RELATIVA À PRINCIPAL (hoje: Sirius B), em pc na base da cena
 * (equatorial J2000), no instante `jd`. Kepler + Thiele–Innes sobre o
 * plano do céu na direção de A; o semieixo em UA é `aSegArco × dPc`
 * (1″ a 1 pc = 1 UA).
 *
 * O SINAL NA LINHA DE VISADA É AMBÍGUO em astrometria pura (a órbita e o
 * espelho dela pelo plano do céu dão o mesmo traço). Escolha declarada:
 * z = C·X + H·Y, com z > 0 = MAIS LONGE do Sol que A.
 */
export function posicaoDaCompanheira(
  jd: number,
  o: Orbita,
  direcaoDeA: readonly [number, number, number],
  dPc: number
): [number, number, number] {
  const anos = 2000 + (jd - JD_J2000) / DIAS_POR_ANO;
  let M = (2 * Math.PI * (anos - o.periastroAno)) / o.periodoAnos;
  M = M - 2 * Math.PI * Math.floor(M / (2 * Math.PI));
  const e = o.e;
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 50; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-14) break;
  }
  const X = Math.cos(E) - e;
  const Y = Math.sqrt(1 - e * e) * Math.sin(E);
  const aPc = o.aSegArco * dPc * AU_PARA_PC;
  const w = o.argPeriastroGraus * GRAU;
  const N = o.nodoGraus * GRAU;
  const inc = o.iGraus * GRAU;
  const A = aPc * (Math.cos(w) * Math.cos(N) - Math.sin(w) * Math.sin(N) * Math.cos(inc));
  const B = aPc * (Math.cos(w) * Math.sin(N) + Math.sin(w) * Math.cos(N) * Math.cos(inc));
  const F = aPc * (-Math.sin(w) * Math.cos(N) - Math.cos(w) * Math.sin(N) * Math.cos(inc));
  const G = aPc * (-Math.sin(w) * Math.sin(N) + Math.cos(w) * Math.cos(N) * Math.cos(inc));
  const C = aPc * Math.sin(w) * Math.sin(inc);
  const H = aPc * Math.cos(w) * Math.sin(inc);
  const norte = A * X + F * Y;
  const leste = B * X + G * Y;
  const fundo = C * X + H * Y;
  const [rx, ry, rz] = direcaoDeA;
  // a base do céu em A: leste = ẑ × r̂ (α crescente), norte = r̂ × leste
  const lx = -ry;
  const ly = rx;
  const ln = Math.hypot(lx, ly) || 1;
  const ex = lx / ln;
  const ey = ly / ln;
  const nx = -rz * ey;
  const ny = rz * ex;
  const nz = rx * ey - ry * ex;
  return [
    norte * nx + leste * ex + fundo * rx,
    norte * ny + leste * ey + fundo * ry,
    norte * nz + fundo * rz,
  ];
}

/** O raio físico de enquadramento (o EQUATORIAL, o maior), em pc. */
export function raioDaEstrelaPc(e: EstrelaVisitavel): number {
  return e.raioRsol.v * RAIO_SOL_PC;
}

/**
 * O EIXO DE ROTAÇÃO na base da cena. Vega: 6,2° da linha até o Sol
 * (medido — vemos quase o polo, como da Terra); o ÂNGULO DE POSIÇÃO da
 * inclinação é ARTÍSTICO (para o norte celeste). As outras não têm eixo
 * medido: o polo celeste norte, escolha artística declarada.
 */
export function eixoDeRotacao(e: EstrelaVisitavel, pos: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  if (!e.achatamento) return out.set(0, 0, 1);
  const r = pos.clone().normalize();
  const norte = new THREE.Vector3(0, 0, 1).addScaledVector(r, -r.z).normalize();
  const i = e.achatamento.inclinacaoGraus.v * GRAU;
  return out.copy(r).multiplyScalar(-Math.cos(i)).addScaledVector(norte, Math.sin(i)).normalize();
}

// ─── A RADIÂNCIA NA BANDA DE RENDER, tabelada para o GLSL ────────────────

/** Faixa da tabela em ln T: 2.000 a 40.000 K (o domínio do ajuste da cor). */
const LN_T_MIN = Math.log(2000);
const LN_T_MAX = Math.log(40000);
const N_TABELA = 64;
const DLN_T = (LN_T_MAX - LN_T_MIN) / (N_TABELA - 1);
/** ln(radiância visível) em passos iguais de ln T — a MESMA função de
 *  `luzDaCasa`, amostrada; entre amostras o erro de interpolação em
 *  log-log é < 0,1 % (curva suave). */
const TABELA_LN_RADIANCIA = Array.from({ length: N_TABELA }, (_, i) =>
  Math.log(radianciaVisivelDeCorpoNegro(Math.exp(LN_T_MIN + i * DLN_T)))
);

/** Temperatura das erupções (contínuo de flare de anã M, ~10⁴ K). */
const TEFF_DA_ERUPCAO_K = 10000;
/** Temperatura das manchas frias, em fração da fotosfera: 2.700 K numa
 *  anã M de 3.054 K (≈ 350 K abaixo — contraste típico de manchas de anã
 *  M ativa); ligada a qualquer estrela com `manchas` > 0. */
const FRACAO_TEFF_DA_MANCHA = 2700 / 3054;
/** A penumbra fica a esta fração do caminho da fotosfera até a umbra
 *  (em temperatura) — artístico, para ela ler como o anel claro das
 *  manchas do Sol, bem mais clara que a umbra. */
const PENUMBRA_NO_CAMINHO_DA_UMBRA = 0.35;

// Estatística dos dois padrões abaixo (`campoDeCelulas` com ferver e
// empeno, na ESFERA na escala de uso), medida por Monte Carlo com
// 2,4·10⁶ amostras (o das gigantes, com 4·10⁵): média e desvio antes da
// normalização. Normalizar por elas faz o contraste pedido ser RMS.
const CAMPO_GRANULO = { media: 0.5234, desvio: 0.3005 };
const CAMPO_GIGANTE = { media: 0.0092, desvio: 0.3142 };
/** O ganho de TELA das células gigantes sobre o contraste medido (ver o
 *  fragment) — ARTÍSTICO, calibrado na tela contra as imagens do VLT/SPHERE
 *  (Montargès et al. 2021): manchas claras a ~1,3–1,5× a média e regiões
 *  escuras até ~0,6×, medidas no disco já com a borda escurecida. */
// (medido na captura de 12/11, em valor de pixel: percentis 1–99 do disco
// sobre o perfil radial, 0,60–1,49). Passa de 1 porque a ponte de tela
// (asinh) e a curva de tom achatam o contraste em log.
const GANHO_DAS_GIGANTES_NA_TELA = 3.6;
// o limite do filtro mora com a gêmea em JS da lei (`stellarBody.ts`)
export { TEFF_SEM_FILTRO_K };

/**
 * A CONCESSÃO CINEMATOGRÁFICA DOS GRÂNULOS — a MESMA que o Sol já faz, e
 * declarada como artística no selo. O shader do Sol (`sol/sun.js`) mostra
 * a textura de convecção na frequência `granFreq` sobre a esfera unitária
 * (22/30/34 nos três tiers de `stellarBody.ts`): célula visível de ~1/30
 * do raio, contra os 1,87e-3 R☉ do grânulo real — ~18× maior. Sem a
 * concessão, a disco cheio toda anã seria um disco liso ao lado de um Sol
 * granulado, e um corpo nunca pode parecer mais pobre que o vizinho.
 *
 * Cada estrela herda o MESMO fator, e a lei física relativa fica de pé:
 * o tamanho na tela é `granuloEmRaios × ESCALA` (Proxima ~0,67× o do Sol,
 * Sirius ~1,4×, Vega ~2×). TETO: um grânulo para de crescer em 0,1 R
 * (passado isso deixa de ser granulação e vira célula gigante — é o caso
 * de Betelgeuse, cujas células gigantes reais de 0,6 R não precisam de
 * concessão nenhuma); nunca fica MENOR que o físico.
 */
export const GRANULO_DO_SOL_NA_TELA_EM_RAIOS = 1 / 30;
export const ESCALA_CINEMATOGRAFICA_DOS_GRANULOS =
  GRANULO_DO_SOL_NA_TELA_EM_RAIOS / GRANULO_SOL_EM_RAIOS;
const TETO_DO_GRANULO_NA_TELA_EM_RAIOS = 0.1;
/**
 * O contraste, pela mesma concessão: o que o shader do Sol MOSTRA (a
 * disciplina tonal de `sun.js` dá spread de 0,10–0,16 no disco cheio —
 * tomamos 0,13) para o contraste real do Sol (~0,15), e cada estrela
 * escala por `contrasteGranulos / 0,15`. As estrelas A (0,015) ficam
 * tênues mas presentes.
 */
export const CONTRASTE_DO_SOL_NA_TELA = 0.13;
export const CONTRASTE_REAL_DO_SOL = 0.15;

export function granuloNaTelaEmRaios(granuloEmRaios: number): number {
  return Math.max(
    granuloEmRaios,
    Math.min(granuloEmRaios * ESCALA_CINEMATOGRAFICA_DOS_GRANULOS, TETO_DO_GRANULO_NA_TELA_EM_RAIOS)
  );
}

export function contrasteNaTela(contraste: number): number {
  return (contraste * CONTRASTE_DO_SOL_NA_TELA) / CONTRASTE_REAL_DO_SOL;
}

/**
 * O EXPOENTE DO BRILHO ASSISTIDO — ARTÍSTICO, declarado. A estrela
 * visitada aparece no nível de tela do Sol escalado por (radiância
 * visível / a do Sol)^¼: Proxima ~0,37×, Betelgeuse ~0,51×, Sirius
 * ~1,6×, Vega ~1,6×. A ordem física fica; a M não sai lama e a A não
 * estoura. É a "exposição de foto" da visita que os planetas já têm
 * (`lib/atlas/luzDaVisita.ts`), aplicada à fotosfera.
 */
export const EXPOENTE_DO_BRILHO_ASSISTIDO = 0.25;

/**
 * O ganho que leva a radiância verdadeira de uma fotosfera ao nível da
 * visita: 1 no modo REAL; no ASSISTIDO, rad^(¼ − 1). Propriedade do
 * CORPO (a Teff dele), não do foco da câmera. Quem o aplica é a rampa do
 * filtro (`ganho^(1 − g)`): com o disco pequeno (g = 1) a emissão é a
 * verdadeira e a troca com o ponto conserva a luz.
 */
export function ganhoDaVisita(teffK: number, politica: PoliticaDeLuz): number {
  if (politica === 'real') return 1;
  return Math.pow(radianciaVisivelDeCorpoNegro(teffK), EXPOENTE_DO_BRILHO_ASSISTIDO - 1);
}

/** Grupos de manchas vivos ao mesmo tempo, e manchas por grupo (a líder
 *  e até duas seguidoras, como os pares do Sol) — artístico. */
const GRUPOS_DE_MANCHAS = 6;
const MANCHAS_POR_GRUPO = 3;
const MAX_MANCHAS = GRUPOS_DE_MANCHAS * MANCHAS_POR_GRUPO;
/** A vida de um grupo, em dias da DATA simulada (o relógio lento) —
 *  artístico: manchas de anã M ativa duram meses (Doppler imaging). */
const VIDA_DO_GRUPO_DIAS = 240;
/** A faixa de latitude dos grupos, em graus (artístico). */
const LATITUDE_DOS_GRUPOS_GRAUS: readonly [number, number] = [10, 60];
/** O raio que conta para a área coberta, em raios de umbra: o meio da
 *  rampa da penumbra (1,28 → 2,4 r no shader). */
const RAIO_DA_AREA_EM_UMBRAS = 1.84;

const GLSL_FOTOSFERA_COMUM = /* glsl */ `
uniform float uLnRad[${N_TABELA}];
${GLSL_STAR_COLOR}
${GLSL_COMPRESSAO}

// a radiância visível da casa (Sol = 1), interpolada em ln-ln
float radianciaVisivel(float T) {
  float x = clamp((log(T) - ${LN_T_MIN.toFixed(8)}) / ${DLN_T.toFixed(8)}, 0.0, ${(N_TABELA - 1).toFixed(1)} - 0.001);
  int i = int(floor(x));
  float f = x - float(i);
  return exp(mix(uLnRad[i], uLnRad[i + 1], f));
}
// A RECEITA DO SOL. A paleta é o FILTRO FOTOGRÁFICO do Sol (a rampa
// H-alfa de \`sol/sun.js\`, calibrada contra fotos — ARTÍSTICA, baseada em
// foto), lida dos uniforms que \`stellarBody.ts\` publica para a curva viva
// (\`SOL_NO_ACES\`/\`SOL_FORA_DO_ACES\`, por \`porCurva\`).
uniform vec3 uCorFria;
uniform vec3 uCorQuente;
uniform vec3 uCorDoLimbo;
uniform vec3 uPaleta;
/** o ganho da exposição da visita (ver \`ganhoDaVisita\`), 1 no modo real */
uniform float uExposicao;
vec3 paletaDoSol(float heat) {
  vec3 c = mix(uCorFria, uCorQuente, smoothstep(0.15, 1.05, heat));
  return c * mix(0.16, 1.42, smoothstep(0.04, 1.08, heat)) * uPaleta;
}
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
// o corpo negro da casa com luminância 1 (só a cromaticidade)
vec3 corpoNegroUnitario(float T) {
  vec3 b = max(blackbodyLinear(T), vec3(1e-4));
  return b / dot(b, LUMA);
}
// A COR DA ESTRELA: cor(T) = corpoNegro(T) × (paleta / corpoNegro(5772))^w(T).
// O quociente é o FILTRO do Sol (o "look" fotográfico dele, artístico).
// Multiplicar a paleta laranja por uma razão de corpo negro nunca deixa
// uma estrela quente azul — a ordem física da cor sairia invertida —,
// então o filtro ESMAECE nas quentes: w = 1 até 5.772 K, cai suave a 0 em
// 8.000 K (artístico, declarado). A estrutura da receita fica (a rampa de
// calor dos grânulos, o avermelhamento e o fio do limbo): a luminância é
// a da paleta, só a cromaticidade muda. A 5.772 K é a receita exata.
vec3 pelaTemperatura(vec3 C, float T) {
  float Y = max(dot(C, LUMA), 1e-6);
  vec3 filtro = max(C / (Y * corpoNegroUnitario(${TEFF_SOL_K.toFixed(1)})), vec3(1e-4));
  float w = 1.0 - smoothstep(${TEFF_SOL_K.toFixed(1)}, ${TEFF_SEM_FILTRO_K.toFixed(1)}, T);
  vec3 c = corpoNegroUnitario(T) * pow(filtro, vec3(w));
  return Y * c / max(dot(c, LUMA), 1e-6);
}
// a borda do Sol (sun.js): o escurecimento linear leva o u DA ESTRELA
// (Claret); o avermelhamento e o fio cromosférico são os da receita, o
// fio já levado à temperatura da estrela
vec3 bordaDoSol(vec3 c, float mu, float u, float T) {
  float um = max(1.0 - mu, 0.0);
  c *= (1.0 - u) + u * mu;
  float edge = pow(um, 1.7);
  c.g *= 1.0 - edge * 0.30;
  c.b *= 1.0 - edge * 0.50;
  c *= 1.0 - edge * 0.15;
  return c + pelaTemperatura(uCorDoLimbo * uPaleta, T) * pow(um, 3.5) * 1.15;
}
// a luminância de uma superfície a T sobre a receita (Sol = 1)
float brilhoDe(float T) {
  return radianciaVisivel(T) * uExposicao;
}
`;

const VERT_CORPO = /* glsl */ `
attribute float aTeff;
varying vec3 vObj;
varying vec3 vNormalV;
varying vec3 vPosV;
varying float vTeff;
void main() {
  vObj = position;
  vTeff = aTeff;
  vNormalV = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vPosV = mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG_CORPO = /* glsl */ `
precision highp float;
${GLSL_FOTOSFERA_COMUM}
uniform float uFator;
uniform float uBeta;
uniform float uPeso;
uniform float uBordaU;
uniform float uGranulo;
uniform float uContraste;
uniform float uGigante;
uniform float uContrasteGigante;
uniform float uTempo;
uniform vec4 uManchas[${MAX_MANCHAS}];
uniform float uTeffMancha;
uniform float uTeffPenumbra;
uniform float uErupcoes;
varying vec3 vObj;
varying vec3 vNormalV;
varying vec3 vPosV;
varying float vTeff;

vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}

// o ponto de cada célula FERVENDO no relógio de tela
vec3 pontoDaCelula(vec3 o, vec3 h, float t) {
  return o + 0.5 + 0.45 * sin(6.2831853 * h + t * (0.5 + h));
}
// um empeno suave do domínio tira a cara de mosaico (amplitude em células)
vec3 empeno(vec3 p, float t, float amp) {
  return p + amp * sin(p.yzx * 1.7 + t * 0.1);
}
// O CAMPO DE CÉLULAS: uma gaussiana por célula (Worley "mole"), somada
// sobre as 27 vizinhas — liso em todo lugar, sem a aresta de F2 − F1 que
// fazia lama rachada. Amplitude por célula: base + (1 − base)·h^k; com
// \`corte\` > 0, BIMODAL — base abaixo do corte, 1 acima (degrau suave).
float campoDeCelulas(vec3 p, float t, float sigma, float k, float base, float amp, float corte) {
  p = empeno(p, t, amp);
  vec3 c = floor(p);
  vec3 f = p - c;
  float G = 0.0;
  for (int i = -1; i <= 1; i++)
  for (int j = -1; j <= 1; j++)
  for (int l = -1; l <= 1; l++) {
    vec3 o = vec3(float(i), float(j), float(l));
    vec3 h = hash33(c + o);
    vec3 q = pontoDaCelula(o, h, t) - f;
    float a = corte > 0.0
      ? mix(base, 1.0, smoothstep(corte - 0.12, corte + 0.12, h.x))
      : base + (1.0 - base) * pow(max(h.x, 1e-4), k);
    G += a * exp(-dot(q, q) / (sigma * sigma));
  }
  return G;
}
// grânulo MOLE, como o do Sol: almofadas largas (σ = 0,5 célula, todas
// acesas, amplitude 0,5–1) que se fundem em vielas de gradiente, nunca
// fio. Normalizado a média 0 e desvio 1.
float granulo(vec3 p, float t) {
  return (campoDeCelulas(p, t, 0.5, 1.0, 0.5, 0.35, 0.0) - ${CAMPO_GRANULO.media.toFixed(4)}) / ${CAMPO_GRANULO.desvio.toFixed(4)};
}
// AS CÉLULAS GIGANTES de uma supergigante (o que o VLT/SPHERE mostrou
// durante o Grande Escurecimento — Montargès et al. 2021, Nature 594,
// 365 — e as simulações 3D de Chiavassa et al. 2010, A&A 515, A12;
// Haubois et al. 2009, A&A 508, 923): POUCAS manchas claras, grandes e
// moles, com regiões escuras largas entre elas. Gaussianas de σ = 0,45
// célula com amplitude BIMODAL COM SINAL (artístico): ~45 % das células
// acendem (+1), o resto afunda (−0,6) — as regiões escuras descem abaixo
// da média em vez de serem só o piso entre manchas claras. A soma dá
// manchas claras e escuras moles, sem a costura que um σ maior abriria
// (o laço só vê as 27 vizinhas). Normalizado a média 0 e desvio 1.
float gigante(vec3 p, float t) {
  return (campoDeCelulas(p, t, 0.45, 1.0, -0.6, 0.1, 0.55) - ${CAMPO_GIGANTE.media.toFixed(4)}) / ${CAMPO_GIGANTE.desvio.toFixed(4)};
}

// ruído de valor 3D em [−1, 1] (o contorno irregular das manchas)
float ruido(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(hash33(i).x, hash33(i + vec3(1.0, 0.0, 0.0)).x, f.x);
  float b = mix(hash33(i + vec3(0.0, 1.0, 0.0)).x, hash33(i + vec3(1.0, 1.0, 0.0)).x, f.x);
  float c = mix(hash33(i + vec3(0.0, 0.0, 1.0)).x, hash33(i + vec3(1.0, 0.0, 1.0)).x, f.x);
  float d = mix(hash33(i + vec3(0.0, 1.0, 1.0)).x, hash33(i + vec3(1.0)).x, f.x);
  return 2.0 * mix(mix(a, b, f.y), mix(c, d, f.y), f.z) - 1.0;
}

// a amplitude que a TELA deixa ver: célula < 2 px vira a média
float lodDeTela(float celula, float pegada) {
  return smoothstep(2.0, 4.0, celula / max(pegada, 1e-12));
}

void main() {
  vec3 dir = normalize(vObj);
  float pegada = length(fwidth(vObj));
  float T = vTeff;
  float umbra = 0.0;
  float pen = 0.0;

  // manchas frias (Proxima): a RECEITA DO SOL (\`sol/sun.js\`) — umbra
  // escura até 0,55–1 r, penumbra em platô até 1,28 r caindo até 2,4 r
  // (razão visível ~1:2), contorno irregular por ruído; w = raio da umbra
  for (int k = 0; k < ${MAX_MANCHAS}; k++) {
    vec4 m = uManchas[k];
    if (m.w <= 0.0) continue;
    float cv = dot(dir, m.xyz);
    // corda² = 2(1 − cos) ≤ arco²: fora de 2,6 r a mancha não contribui
    if (2.0 * (1.0 - cv) > 6.76 * m.w * m.w) continue;
    float d = acos(clamp(cv, -1.0, 1.0));
    d *= 1.0 + 0.16 * ruido(dir * 22.0 + m.xyz * 9.0) + 0.06 * ruido(dir * 55.0 - m.xyz * 4.0);
    float ui = 1.0 - smoothstep(0.55 * m.w, m.w, d);
    float pi = clamp(1.0 - smoothstep(1.28 * m.w, 2.4 * m.w, d) - ui, 0.0, 1.0);
    umbra = max(umbra, ui);
    pen = max(pen, pi);
  }
  T = mix(T, uTeffPenumbra, pen * (1.0 - umbra));
  T = mix(T, uTeffMancha, umbra);

  // granulação (+ células gigantes da supergigante), com LOD de tela
  float gran = 1.0;
  if (uContraste > 0.0) {
    float a = lodDeTela(uGranulo, pegada);
    if (a > 0.0) gran += uContraste * a * granulo(dir / uGranulo, uTempo * 0.3);
  }
  // as células gigantes modulam o BRILHO em log (exp), não pela rampa de
  // calor: com o desvio de 0,25 a rampa satura nas manchas claras (o topo
  // do smoothstep) e a curva de tom achata o resto — medido na tela, o
  // contraste saía 0,07, abaixo do Sol (0,10). Em log a mancha clara
  // continua clara e a região escura entre elas continua larga e lisa.
  // Ganho de TELA ${GANHO_DAS_GIGANTES_NA_TELA.toFixed(1)}× (artístico, medido — ver a constante)
  float gig = 0.0;
  if (uGigante > 0.0) {
    float a = lodDeTela(uGigante, pegada);
    float K = ${GANHO_DAS_GIGANTES_NA_TELA.toFixed(2)} * uContrasteGigante * a;
    // − K²/2: a média de exp(K·z) volta a ~1 — o disco, na média, fica na
    // luminância da lei; as células só redistribuem a luz
    if (a > 0.0) gig = K * gigante(dir / uGigante + 17.0, uTempo * 0.05) - 0.5 * K * K;
  }
  // o "heat" da receita do Sol: a granulação desloca o calor em torno do
  // meio da rampa. Ganho 0,5 porque a rampa de brilho da receita
  // (0,16→1,42 em smoothstep) já dobra o desvio no meio dela — com 0,5 o
  // contraste que sai na tela volta a ser o pedido
  float heat = 0.52 + 0.5 * (gran - 1.0);
  float mu = max(dot(normalize(vNormalV), normalize(-vPosV)), 0.0);
  vec3 luz = bordaDoSol(pelaTemperatura(paletaDoSol(heat), T), mu, uBordaU, T) * brilhoDe(T) * exp(gig);

  // erupções (Proxima): manchas quentes que acendem e apagam em segundos
  // de tela — três sítios, períodos primos entre si, posições sorteadas
  // por ciclo. Padrão artístico; a temperatura (~10⁴ K) é a do contínuo.
  if (uErupcoes > 0.0) {
    float f = 0.0;
    for (int k = 0; k < 3; k++) {
      float P = 9.0 + 4.0 * float(k);
      float tt = uTempo + 0.6 + 3.7 * float(k);
      float n = floor(tt / P);
      float tl = tt - n * P;
      float env = tl < 0.25 ? tl / 0.25 : exp(-(tl - 0.25) / 1.2);
      vec3 h = hash33(vec3(n * 1.37 + 0.5, float(k) * 7.1 + 0.3, 3.3));
      vec3 c = normalize(h * 2.0 - 1.0 + vec3(1e-3));
      float s = exp(-(1.0 - dot(dir, c)) / (0.04 * 0.04));
      f = max(f, env * s);
    }
    float Te = ${TEFF_DA_ERUPCAO_K.toFixed(1)};
    luz = mix(luz, pelaTemperatura(paletaDoSol(1.0), Te) * brilhoDe(Te), f);
  }

  gl_FragColor = vec4(comprimir3(luz * uFator, uBeta) * uPeso, 1.0);
}
`;

// a ATMOSFERA ESTENDIDA (Betelgeuse): casca aditiva até `bordaDifusaRaios`,
// desenhada pelas faces de TRÁS — atrás do disco a profundidade da
// fotosfera a apaga, fora dele sobra o anel; vale com a câmera dentro.
const VERT_CASCA = /* glsl */ `
varying vec3 vPosV;
varying vec3 vCentroV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vPosV = mv.xyz;
  vCentroV = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG_CASCA = /* glsl */ `
precision highp float;
${GLSL_FOTOSFERA_COMUM}
uniform float uFator;
uniform float uBeta;
uniform float uPeso;
uniform float uBordaU;
uniform float uRaio;
uniform float uBordaDifusa;
uniform float uTeff;
varying vec3 vPosV;
varying vec3 vCentroV;
void main() {
  vec3 d = normalize(vPosV);
  float b = length(vCentroV - dot(vCentroV, d) * d) / uRaio;
  // contínua com a borda do disco em b = 1 (metade da luz do limbo) e
  // apagando até a borda difusa medida
  float fora = 1.0 - smoothstep(1.0, uBordaDifusa, b);
  float perfil = fora * fora * step(1.0, b);
  // a cor é a da FACE no limbo (μ = 0, o avermelhamento inteiro da
  // receita, sem o fio cromosférico), para o halo sair avermelhado e
  // emendar sem costura com metade da luz da borda
  vec3 L = pelaTemperatura(paletaDoSol(0.52), uTeff) * (1.0 - uBordaU);
  L *= vec3(1.0, 0.70, 0.50) * 0.85;
  L *= brilhoDe(uTeff) * 0.5 * perfil;
  gl_FragColor = vec4(comprimir3(L * uFator, uBeta) * uPeso, 1.0);
}
`;

// O PONTO DA ANÃ BRANCA: sub-pixel em todo quadro em que A é disco, então
// ela ganha o ponto da PSF da casa (o MESMO `starPSF`/`STAR_FRAG` do
// campo, tamanho de INSTRUMENTO — declarado), com a magnitude da física
// dela (R² × radiância visível, ponto-zero do campo) e a distância da
// câmera em float64 (uniform), nunca de posição de mundo no shader.
const VERT_PONTO = /* glsl */ `
uniform float uM;
uniform float uScreenH;
uniform float uExpoM0;
uniform float uSigmaPx;
uniform float uPr2;
uniform float uPeso;
uniform vec3 uCor;
varying vec3 vColor;
varying float vSigma;
varying float vPeak;
${GLSL_PONTO_NA_BORDA_VARYINGS}
${GLSL_STAR_PSF}
${GLSL_PONTO_NA_BORDA}
void main() {
  float size; float peak; float sigmaFrac;
  starPSF(uM, uExpoM0, uSigmaPx, uScreenH, size, peak, sigmaFrac);
  vColor = uCor;
  vSigma = sigmaFrac;
  vPeak = peak * uPeso * uPr2;
  gl_Position = projectionMatrix * (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0));
  gl_PointSize = size;
  prenderPontoNoClip(uScreenH);
}
`;

// ─── A MALHA ──────────────────────────────────────────────────────────────

/** Os parâmetros físicos de UMA superfície (estrela principal ou companheira). */
export interface Fotosfera {
  readonly id: string;
  readonly teffK: number;
  readonly raioRsol: number;
  readonly rotacaoDias: number | null;
  readonly achatamento: Achatamento | null;
  readonly bordaU: number;
  readonly granuloEmRaios: number;
  readonly contraste: number;
  readonly gigantesEmRaios: number;
  readonly manchas: number;
  readonly erupcoes: boolean;
  readonly bordaDifusaRaios: number;
}

export function fotosferaDe(e: EstrelaVisitavel): Fotosfera {
  const s = e.superficie;
  return {
    id: e.id,
    teffK: e.teffK.v,
    raioRsol: e.raioRsol.v,
    rotacaoDias: e.rotacaoDias?.v ?? null,
    achatamento: e.achatamento ?? null,
    bordaU: s.bordaU.v,
    granuloEmRaios: granuloNaTelaEmRaios(s.granuloEmRaios.v),
    contraste: contrasteNaTela(s.contrasteGranulos.v),
    gigantesEmRaios: s.celulasGigantesEmRaios?.v ?? 0,
    manchas: s.manchas.v,
    erupcoes: s.erupcoes,
    bordaDifusaRaios: s.bordaDifusaRaios.v,
  };
}

/** A companheira como fotosfera: anã branca, borda de Claret aproximada
 *  (u ≈ 0,3 no óptico para DA quente — escolha declarada), sem grânulos. */
export function fotosferaDaCompanheira(e: EstrelaVisitavel): Fotosfera | null {
  const c = e.companheira;
  if (!c) return null;
  return {
    id: `${e.id}-b`,
    teffK: c.teffK.v,
    raioRsol: c.raioRsol.v,
    rotacaoDias: null,
    achatamento: null,
    bordaU: 0.3,
    granuloEmRaios: 0,
    contraste: 0,
    gigantesEmRaios: 0,
    manchas: 0,
    erupcoes: false,
    bordaDifusaRaios: 1,
  };
}

/** sorteio determinístico em [0, 1) de um inteiro (mulberry32) */
function sorteioDe(n: number): number {
  let t = (n + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * As manchas frias pela RECEITA DO SOL: `GRUPOS_DE_MANCHAS` grupos, cada
 * um com uma líder e até duas seguidoras menores atrás dela em longitude
 * (como os pares de Hale), em faixas de latitude dos dois hemisférios.
 * Cada grupo nasce, cresce e morre em `VIDA_DO_GRUPO_DIAS` da data
 * (envelope sin², fases defasadas igualmente — a soma dos envelopes é
 * constante) e renasce noutro lugar com tamanho 0, sem salto. A área
 * total (dentro de `RAIO_DA_AREA_EM_UMBRAS`) é SEMPRE a `fracao` da
 * esfera. Padrão ARTÍSTICO — a fração é a que a modulação fotométrica
 * sustenta. Escreve em `out` (raio da umbra no w; 0 = sem mancha).
 */
export function manchasDe(fracao: number, jd: number, out?: THREE.Vector4[]): THREE.Vector4[] {
  const res = out ?? Array.from({ length: MAX_MANCHAS }, () => new THREE.Vector4());
  for (const v of res) v.set(0, 0, 0, 0);
  if (!(fracao > 0) || !Number.isFinite(jd)) return res;
  const [latMin, latMax] = LATITUDE_DOS_GRUPOS_GRAUS;
  const pesos: number[] = [];
  const geo: [number, number, number, number][] = [];
  for (let g = 0; g < GRUPOS_DE_MANCHAS; g++) {
    const fase = (jd - JD_J2000) / VIDA_DO_GRUPO_DIAS + g / GRUPOS_DE_MANCHAS;
    const ciclo = Math.floor(fase);
    const env = Math.sin(Math.PI * (fase - ciclo)) ** 2;
    const s = (k: number) => sorteioDe(((ciclo * 977 + g * 131) | 0) * 8 + k);
    const lat = (s(0) < 0.5 ? -1 : 1) * (latMin + (latMax - latMin) * s(1)) * GRAU;
    const lon = s(2) * 2 * Math.PI;
    const tamanho = 0.4 + 0.6 * s(3);
    const membros = 1 + Math.floor(s(4) * MANCHAS_POR_GRUPO);
    for (let m = 0; m < MANCHAS_POR_GRUPO; m++) {
      const i = g * MANCHAS_POR_GRUPO + m;
      const f = m === 0 ? 1 : m < membros ? 0.35 + 0.3 * s(5 + m) : 0;
      pesos[i] = tamanho * env * f * f;
      geo[i] = [lat, lon, m, s(8 + m)];
    }
  }
  const soma = pesos.reduce((a, b) => a + b, 0);
  if (!(soma > 0)) return res;
  // a líder de cada grupo, para as seguidoras se arrumarem atrás dela
  let lider = 0;
  for (let i = 0; i < MAX_MANCHAS; i++) {
    if (!(pesos[i] > 0)) continue;
    const area = (fracao * pesos[i]) / soma; // fração da esfera: (1 − cos α)/2
    const r = Math.acos(1 - 2 * area) / RAIO_DA_AREA_EM_UMBRAS;
    let [lat, lon] = geo[i];
    const [, , m, s] = geo[i];
    if (m === 0) lider = r;
    else {
      // atrás da líder: 2–3 raios de líder por posição, um pouco ao polo
      lon -= ((2.2 + 0.8 * s) * m * lider) / Math.max(Math.cos(lat), 0.3);
      lat += Math.sign(lat) * 0.4 * lider * (s - 0.3);
    }
    res[i].set(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon), r);
  }
  return res;
}

type Receita = Readonly<Record<'corFria' | 'corQuente' | 'limbo' | 'paleta', THREE.Vector3>>;
/** a receita do Sol no ACES, com o ganho no nome que o shader lê */
const RECEITA_NO_ACES = { ...SOL_NO_ACES, paleta: SOL_NO_ACES.ganho };

const SEGMENTOS_LARGURA = 192;
const SEGMENTOS_ALTURA = 96;

function geometriaDa(f: Fotosfera): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, SEGMENTOS_LARGURA, SEGMENTOS_ALTURA);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const nor = geo.getAttribute('normal') as THREE.BufferAttribute;
  const teff = new Float32Array(pos.count);
  const a = f.achatamento;
  for (let i = 0; i < pos.count; i++) {
    if (!a) {
      teff[i] = f.teffK;
      continue;
    }
    // o eixo de rotação é o +Y do objeto: colatitude = acos(y)
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const colat = Math.acos(Math.max(-1, Math.min(1, y)));
    const r = rocheDe(colat, a);
    pos.setXYZ(i, x * r.raio, y * r.raio, z * r.raio);
    teff[i] = r.teffK;
    // normal de Roche: radial + componente na direção da colatitude
    // (θ̂ = (y·x/s, −s, y·z/s)); no hemisfério sul o θ̂ inverte junto
    const s = Math.hypot(x, z);
    if (s > 1e-9) {
      const tx = (y * x) / s;
      const ty = -s;
      const tz = (y * z) / s;
      nor.setXYZ(i, r.nr * x + r.nt * tx, r.nr * y + r.nt * ty, r.nr * z + r.nt * tz);
    }
  }
  geo.setAttribute('aTeff', new THREE.BufferAttribute(teff, 1));
  return geo;
}

/** Os uniforms comuns da emissão (a ponte de tela e o peso da lei). */
function uniformesDaEmissao(f: Fotosfera) {
  return {
    uLnRad: { value: TABELA_LN_RADIANCIA },
    uFator: { value: 1 },
    uBeta: { value: BETA_DA_EMISSAO },
    uPeso: { value: 0 },
    uBordaU: { value: f.bordaU },
    uCorFria: { value: SOL_FORA_DO_ACES.corFria.clone() },
    uCorQuente: { value: SOL_FORA_DO_ACES.corQuente.clone() },
    uCorDoLimbo: { value: SOL_FORA_DO_ACES.limbo.clone() },
    uPaleta: { value: SOL_FORA_DO_ACES.paleta.clone() },
    uExposicao: { value: 1 },
  };
}

/**
 * UMA estrela com corpo: a fotosfera (+ a atmosfera estendida, quando a
 * física pede). O grupo é posicionado e girado pelo dono a cada quadro;
 * a escala é o raio EQUATORIAL em pc.
 */
export class CorpoDeEstrela {
  readonly group = new THREE.Group();
  readonly malha: THREE.Mesh;
  readonly raioPc: number;
  private readonly mat: THREE.ShaderMaterial;
  private readonly casca: THREE.Mesh | null = null;
  private readonly matCasca: THREE.ShaderMaterial | null = null;
  private readonly eixo = new THREE.Vector3();
  private readonly qEixo = new THREE.Quaternion();
  private readonly qGiro = new THREE.Quaternion();
  private static readonly Y = new THREE.Vector3(0, 1, 0);

  readonly fotosfera: Fotosfera;

  constructor(fotosfera: Fotosfera) {
    this.fotosfera = fotosfera;
    this.raioPc = fotosfera.raioRsol * RAIO_SOL_PC;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT_CORPO,
      fragmentShader: FRAG_CORPO,
      uniforms: {
        ...uniformesDaEmissao(fotosfera),
        uGranulo: { value: fotosfera.granuloEmRaios },
        // Betelgeuse: o contraste medido nas simulações (0,25) é o das
        // células GIGANTES, que dominam a imagem; os grânulos pequenos
        // por cima são TÊNUES (15 % dele — escolha artística declarada)
        uContraste: {
          value: fotosfera.gigantesEmRaios > 0 ? fotosfera.contraste * 0.15 : fotosfera.contraste,
        },
        uGigante: { value: fotosfera.gigantesEmRaios },
        uContrasteGigante: { value: fotosfera.contraste },
        uTempo: { value: 0 },
        uManchas: { value: manchasDe(fotosfera.manchas, JD_J2000) },
        uTeffMancha: { value: fotosfera.teffK * FRACAO_TEFF_DA_MANCHA },
        uTeffPenumbra: {
          value: fotosfera.teffK * (1 - PENUMBRA_NO_CAMINHO_DA_UMBRA * (1 - FRACAO_TEFF_DA_MANCHA)),
        },
        uErupcoes: { value: fotosfera.erupcoes ? 1 : 0 },
      },
    });
    this.malha = new THREE.Mesh(geometriaDa(fotosfera), this.mat);
    this.malha.frustumCulled = false;
    this.group.add(this.malha);
    if (fotosfera.bordaDifusaRaios > 1) {
      this.matCasca = new THREE.ShaderMaterial({
        vertexShader: VERT_CASCA,
        fragmentShader: FRAG_CASCA,
        uniforms: {
          ...uniformesDaEmissao(fotosfera),
          uRaio: { value: this.raioPc },
          uBordaDifusa: { value: fotosfera.bordaDifusaRaios },
          uTeff: { value: fotosfera.teffK },
        },
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      });
      this.casca = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), this.matCasca);
      this.casca.scale.setScalar(fotosfera.bordaDifusaRaios);
      this.casca.frustumCulled = false;
      this.casca.renderOrder = 1;
      this.group.add(this.casca);
    }
    this.group.scale.setScalar(this.raioPc);
    this.group.visible = false;
  }

  /**
   * Pose e emissão do quadro. `posPc` em float64; o giro sai da DATA
   * (`jd`, relógio lento) e o ferver do relógio de tela (`tempoS`).
   */
  escrever(q: {
    posPc: THREE.Vector3;
    eixo: THREE.Vector3;
    jd: number;
    tempoS: number;
    fator: number;
    peso: number;
    /** o ganho da exposição da visita (`ganhoDaVisita`), já na rampa do filtro */
    exposicao: number;
    /** a curva viva: a receita do Sol troca de calibração com ela */
    toneMapping: THREE.ToneMapping;
  }) {
    this.group.position.copy(q.posPc);
    this.eixo.copy(q.eixo);
    this.qEixo.setFromUnitVectors(CorpoDeEstrela.Y, this.eixo);
    const p = this.fotosfera.rotacaoDias;
    let fase = 0;
    if (p && Number.isFinite(q.jd)) {
      const voltas = (q.jd - JD_J2000) / p;
      fase = (voltas - Math.floor(voltas)) * 2 * Math.PI;
    }
    this.qGiro.setFromAxisAngle(CorpoDeEstrela.Y, fase);
    this.group.quaternion.copy(this.qEixo).multiply(this.qGiro);
    const fator = Number.isFinite(q.fator) && q.fator > 0 ? q.fator : 1;
    const peso = Number.isFinite(q.peso) ? Math.min(1, Math.max(0, q.peso)) : 0;
    const receita = porCurva<Receita>(q.toneMapping, RECEITA_NO_ACES, SOL_FORA_DO_ACES);
    for (const m of [this.mat, this.matCasca]) {
      if (!m) continue;
      m.uniforms.uFator.value = fator;
      m.uniforms.uPeso.value = peso;
      m.uniforms.uExposicao.value = Number.isFinite(q.exposicao) && q.exposicao > 0 ? q.exposicao : 1;
      (m.uniforms.uCorFria.value as THREE.Vector3).copy(receita.corFria);
      (m.uniforms.uCorQuente.value as THREE.Vector3).copy(receita.corQuente);
      (m.uniforms.uCorDoLimbo.value as THREE.Vector3).copy(receita.limbo);
      (m.uniforms.uPaleta.value as THREE.Vector3).copy(receita.paleta);
    }
    this.mat.uniforms.uTempo.value = Number.isFinite(q.tempoS) ? q.tempoS : 0;
    if (this.fotosfera.manchas > 0 && Number.isFinite(q.jd)) {
      manchasDe(this.fotosfera.manchas, q.jd, this.mat.uniforms.uManchas.value as THREE.Vector4[]);
    }
  }

  dispose() {
    this.malha.geometry.dispose();
    this.mat.dispose();
    this.casca?.geometry.dispose();
    this.matCasca?.dispose();
  }
}

/** A magnitude absoluta V de uma fotosfera, no ponto-zero do CAMPO. */
export function magnitudeAbsolutaDe(f: Fotosfera): number {
  const lum = f.raioRsol * f.raioRsol * radianciaVisivelDeCorpoNegro(f.teffK);
  return M_V_SOL_DO_CAMPO - 2.5 * Math.log10(lum);
}

/** O ponto de luz de uma estrela sub-pixel (Sirius B) — ver `VERT_PONTO`. */
export class PontoDeEstrela {
  readonly points: THREE.Points;
  private readonly mat: THREE.ShaderMaterial;
  private readonly mAbs: number;

  constructor(f: Fotosfera, expoM0: number, sigmaPx: number) {
    this.mAbs = magnitudeAbsolutaDe(f);
    const [r, g, b] = blackbodyRgb(f.teffK);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT_PONTO,
      fragmentShader: STAR_FRAG,
      uniforms: {
        uM: { value: 30 },
        uScreenH: { value: 1080 },
        uExpoM0: { value: expoM0 },
        uSigmaPx: { value: sigmaPx },
        uPr2: { value: 1 },
        uPeso: { value: 1 },
        uCor: { value: new THREE.Vector3(r, g, b) },
        uBeta: { value: BETA_DA_EMISSAO },
        uArteDaCruz: { value: 1 },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      transparent: true,
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 7;
    this.points.visible = false;
  }

  escrever(q: { posPc: THREE.Vector3; distPc: number; screenH: number; pr2: number; peso: number }) {
    this.points.position.copy(q.posPc);
    const d = Math.max(q.distPc, 1e-15);
    const u = this.mat.uniforms;
    u.uM.value = this.mAbs + 5 * Math.log10(d) - 5;
    u.uScreenH.value = q.screenH;
    u.uPr2.value = q.pr2;
    u.uPeso.value = Number.isFinite(q.peso) ? Math.min(1, Math.max(0, q.peso)) : 1;
  }

  dispose() {
    this.points.geometry.dispose();
    this.mat.dispose();
  }
}

