// ============================================================
// A NEBULOSA DE ÓRION (M42/M43) — o modelo físico e o trecho de
// shader que o raymarch da casa (`nebulaShaders.ts`) e a extinção das
// estrelas (`starShaders.ts`) leem. Um objeto só, nos três modos: a
// câmera é a única entrada.
//
// POR QUE UM TRECHO PRÓPRIO DENTRO DO RAYMARCH DA CASA. O gás da casa é
// assado num cubo de 2 kpc com voxel de 15,6 pc e amostrado em passos
// de dezenas de parsecs a 400 pc da câmera; a parte brilhante de Órion
// tem ~1 pc e a pele ionizada ~0,1 pc. Nenhuma das duas grades a vê.
// Então o MESMO laço, quando o raio cruza a esfera de Órion, abre um
// sub-laço fino só ali, compõe em ordem (o que está na frente, Órion, o
// que está atrás) e devolve a transmissão — a nuvem molecular de trás
// apaga a faixa e o gás que ficam atrás dela.
//
// A GEOMETRIA (referencial local, pc, origem em θ¹ Ori C como o
// catálogo da casa a desenha; x = leste, y = norte no céu, z = rumo ao
// Sol). Medido, com a fonte aberta em cada número:
//  • θ¹ Ori C está ~0,2 pc NA FRENTE da frente de ionização principal
//    (MIF), e a camada que emite tem ~0,1 pc — O'Dell & Henney 2008,
//    arXiv:0810.4375.
//  • a cavidade ionizada tem ~0,7 pc de fundo e o véu neutro fica a
//    ~0,4 pc da estrela (van der Werf et al. 2013, arXiv:1211.0470); o
//    véu inteiro, 1–3 pc (Abel et al. 2004, astro-ph/0404399) — a laje
//    do véu vai de 0,4 a 1,3 pc, a camada mais ionizada de O'Dell et al.
//    2020 (arXiv:1906.07779) a 1,3 pc.
//  • a Barra é uma escarpa da nuvem vista quase de lado, ~2′ a SE de
//    θ¹ Ori C (Berné et al. 2022, arXiv:2201.05112; Pellegrini et al.
//    2009, arXiv:0811.1176).
//  • o brilho de Hβ cai com D⁻² perto da estrela e ~D⁻³ mais longe; a
//    densidade eletrônica ~D⁻²; além de ~5′ domina a luz ESPALHADA pela
//    poeira, mais azul; a Baía Escura fica logo a leste do Trapézio
//    (O'Dell & Harris 2010, arXiv:1008.1002).
//  • M43 é uma região H II redonda de 4,5′ em RA 5h35m31,8s,
//    Dec −5°17′57″, separada por uma faixa escura, acesa por NU Ori
//    (B0.5V), que não produz [O III] (Simón-Díaz et al. 2011,
//    arXiv:1103.3628; Pabst et al. 2020, arXiv:2005.03917).
//  • o tamanho total, 65′ no céu (a ficha do lugar).
// INVENTADO e declarado no selo: a forma exata da tigela fora desses
// pontos, o comprimento da Barra, o traçado da Baía Escura e todo o
// detalhe fino (filamentos, nós) — ruído procedural, estatisticamente
// plausível, sem medida por trás.
// ============================================================
import { corDaLinhaDeEmissao } from '../luzDaCasa';
import { glslNumber } from '../glslNumber';

type Trio = [number, number, number];

/** θ¹ Ori (HD 37022, O6pe) como o catálogo da casa o desenha — a
 *  entrada nomeada `θ¹ Ori` de `public/data/stars_meta.json`; o teste
 *  cobra que as duas batem. A 399,8 pc, dentro do intervalo medido por
 *  VLBI (388 ± 5 pc, Kounkel et al. 2017; 414 ± 7 pc, Menten et al. 2007). */
export const CENTRO_DE_ORION: Trio = [42.8554, 395.6872, -37.5505];

const norma = (v: Trio) => Math.hypot(v[0], v[1], v[2]);
const DIST_PC = norma(CENTRO_DE_ORION);
/** um minuto de arco no céu, em pc, à distância da estrela */
export const ARCMIN_PC = (DIST_PC * Math.PI) / (180 * 60);

/** o referencial local: leste, norte (no céu) e rumo ao Sol */
export const REFERENCIAL_DE_ORION = (() => {
  const [x, y, z] = CENTRO_DE_ORION;
  const alfa = Math.atan2(y, x);
  const delta = Math.asin(z / DIST_PC);
  const leste: Trio = [-Math.sin(alfa), Math.cos(alfa), 0];
  const norte: Trio = [-Math.sin(delta) * Math.cos(alfa), -Math.sin(delta) * Math.sin(alfa), Math.cos(delta)];
  const rumoAoSol: Trio = [-x / DIST_PC, -y / DIST_PC, -z / DIST_PC];
  return { leste, norte, rumoAoSol };
})();

/** cena → local (pc) */
export function paraLocal(p: Trio): Trio {
  const q: Trio = [p[0] - CENTRO_DE_ORION[0], p[1] - CENTRO_DE_ORION[1], p[2] - CENTRO_DE_ORION[2]];
  const { leste, norte, rumoAoSol } = REFERENCIAL_DE_ORION;
  const dot = (a: Trio) => q[0] * a[0] + q[1] * a[1] + q[2] * a[2];
  return [dot(leste), dot(norte), dot(rumoAoSol)];
}

/** um deslocamento no céu (leste, norte em minutos de arco) em pc locais */
export function noCeu(lesteArcmin: number, norteArcmin: number): [number, number] {
  return [lesteArcmin * ARCMIN_PC, norteArcmin * ARCMIN_PC];
}

// ---- Os números do modelo -------------------------------------------------

/** a estrela fica 0,2 pc na frente da MIF (O'Dell & Henney 2008) */
export const ESTRELA_NA_FRENTE_DA_MIF_PC = 0.2;
/** quanto a tigela sobe até a borda (a cavidade tem ~0,7 pc de fundo
 *  até o véu, van der Werf 2013: −0,2 → +0,35 sob o véu em +0,4) */
const SUBIDA_DA_TIGELA_PC = 0.55;
/** raio da curva da tigela (forma de autor entre os pontos medidos) */
const RAIO_DA_TIGELA_PC = 1.1;
/** espessura e-folding da pele ionizada (~0,1 pc no total, Pogge 1992
 *  via O'Dell & Henney 2008) */
export const PELE_IONIZADA_PC = 0.05;
/** a Barra: 2′ a SE da estrela (Berné 2022), escarpa de 0,35 pc */
export const BARRA = {
  distanciaPc: 2 * ARCMIN_PC,
  alturaPc: 0.25,
  /** a crista se curva para longe da estrela nas pontas (autor) */
  curvatura: 0.6,
  meiaLarguraDaSubidaPc: 0.03,
  meioComprimentoPc: 0.38,
  pontaPc: 0.28,
  /** atrás da escarpa a crista volta à tigela (forma de autor) */
  descidaPc: [0.05, 0.3] as [number, number],
};
/** a métrica da tigela [m00, m01, m11]: 1,5× mais longa ao longo de
 *  NE–SW (autor, guiado pelo leque de SW de Güdel 2008) */
export const METRICA_DA_TIGELA: [number, number, number] = (() => {
  const a = 1 / (1.5 * 1.5); // ao longo de NE–SW
  const b = 1; // ao longo de NW–SE
  // eixo NE = (1, 1)/√2: M = a·nnᵀ + b·mmᵀ, m = (1, −1)/√2
  return [(a + b) / 2, (a - b) / 2, (a + b) / 2];
})();
/** o véu: laje neutra de 0,4 a 1,3 pc na frente da estrela */
export const VEU = { de: 0.4, ate: 1.0, tau: 0.8 };
const RAIO_DO_VEU_PC = 3.6;
/** M43: centro do céu (RA 5h35m31,8s, Dec −5°17′57″) menos a estrela
 *  (RA 5h35m16,46s, Dec −5°23′22,8″), raio 2,25′ */
export const M43 = (() => {
  const dRaS = 31.8 - 16.46375;
  const dDecArcsec = (-5 * 3600 - 17 * 60 - 57) - (-5 * 3600 - 23 * 60 - 22.8486);
  const cosDec = Math.cos((-5.39 * Math.PI) / 180);
  const [x, y] = noCeu((dRaS * 15 * cosDec) / 60, dDecArcsec / 60);
  return { x, y, z: -0.05, raio: 2.25 * ARCMIN_PC };
})();
/** a Baía Escura e a faixa que a liga à faixa escura de M43: um traçado
 *  de autor (logo a leste do Trapézio → nordeste → descendo pelo oeste de
 *  M43), em pc locais, com o raio da faixa em cada vértice */
export const BAIA_ESCURA: readonly [number, number, number][] = [
  [0.07, 0.02, 0.05],
  [0.3, 0.12, 0.17],
  [0.62, 0.18, 0.24],
  [0.36, 0.42, 0.1],
  [0.3, 0.9, 0.08],
];
/** o que a casa chama de "o objeto": a esfera que o raio testa */
export const RAIO_DE_ORION_PC = 5.5;
/** a nuvem molecular atrás da MIF: opaca dentro deste raio no céu */
const RAIO_DA_NUVEM_PC = 4.6;
const FUNDO_DA_NUVEM_PC = 2.5;
/** o envelope da nebulosa visível (65′ no céu ≈ 3,8 pc de raio),
 *  alongado para SW, onde o gás quente se espalha (Güdel et al. 2008,
 *  arXiv:0712.0476) */
const RAIO_DO_ENVELOPE_PC = 3.4;
const ALONGAMENTO_SW = 1.6;
/** e encurtado para NE, onde a Baía Escura e a faixa de M43 fecham o
 *  brilho (O'Dell & Harris 2010) — proporção de autor */
const ENCURTAMENTO_NE = 0.6;

/** OS GANHOS DE TELA — a única parte de autor da luz: as LEIS (D⁻²,
 *  cosseno, linhas, espalhamento) são físicas, a exposição é escolha,
 *  como o tempo de exposição de uma foto longa */
const GANHO_DA_FRENTE = 0.25;
/** a exposição logarítmica (ver o fim de `orMarcha`): tela =
 *  ganho·ln(1 + L/joelho) */
export const EXPOSICAO_LOG = { ganho: 0.1, joelho: 0.01 };
const GANHO_DE_M43 = 3.0;
const GANHO_DO_ESPALHADO = 0.03;

// ---- As leis, em TS (espelho testado do GLSL) ----------------------------

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const dSmooth = (a: number, b: number, x: number) => {
  const t = (x - a) / (b - a);
  return t <= 0 || t >= 1 ? 0 : (6 * t * (1 - t)) / (b - a);
};
const SE: [number, number] = [Math.SQRT1_2, -Math.SQRT1_2];
const NE: [number, number] = [Math.SQRT1_2, Math.SQRT1_2];

/**
 * A ALTURA DA FRENTE DE IONIZAÇÃO (MIF) sobre o plano da estrela, em pc,
 * e o gradiente — uma tigela côncava aberta para o Sol (o "blister"),
 * mais a escarpa da Barra a SE. Abaixo dela, a nuvem molecular.
 */
export function alturaDaFrente(x: number, y: number): { z: number; gx: number; gy: number } {
  // a tigela é mais comprida no eixo NE–SW (o leque de SW): métrica
  // elíptica e2 = xᵀMx, ∇e2 = 2Mx
  const [m00, m01, m11] = METRICA_DA_TIGELA;
  const e2 = m00 * x * x + 2 * m01 * x * y + m11 * y * y;
  const g = Math.exp(-e2 / (RAIO_DA_TIGELA_PC * RAIO_DA_TIGELA_PC));
  let z = -ESTRELA_NA_FRENTE_DA_MIF_PC + SUBIDA_DA_TIGELA_PC * (1 - g);
  const k = (SUBIDA_DA_TIGELA_PC * g * 2) / (RAIO_DA_TIGELA_PC * RAIO_DA_TIGELA_PC);
  let gx = k * (m00 * x + m01 * y);
  let gy = k * (m01 * x + m11 * y);
  const v = x * NE[0] + y * NE[1];
  const u = x * SE[0] + y * SE[1] - BARRA.distanciaPc - BARRA.curvatura * v * v;
  // ∂u/∂(x, y) = SE − 2κv·NE
  const ux = SE[0] - 2 * BARRA.curvatura * v * NE[0];
  const uy = SE[1] - 2 * BARRA.curvatura * v * NE[1];
  const w = BARRA.meiaLarguraDaSubidaPc;
  // a escarpa sobe de uma vez e desce devagar atrás dela (uma crista,
  // não um planalto sem fim)
  const queda = 1 - smooth(BARRA.descidaPc[0], BARRA.descidaPc[1], u);
  const s = smooth(-w, w, u) * queda;
  const ds = dSmooth(-w, w, u) * queda - smooth(-w, w, u) * dSmooth(BARRA.descidaPc[0], BARRA.descidaPc[1], u);
  const L = 1 - smooth(BARRA.meioComprimentoPc - BARRA.pontaPc, BARRA.meioComprimentoPc, Math.abs(v));
  const dL = -dSmooth(BARRA.meioComprimentoPc - BARRA.pontaPc, BARRA.meioComprimentoPc, Math.abs(v)) * Math.sign(v);
  z += BARRA.alturaPc * s * L;
  gx += BARRA.alturaPc * (ds * L * ux + s * dL * NE[0]);
  gy += BARRA.alturaPc * (ds * L * uy + s * dL * NE[1]);
  return { z, gx, gy };
}

/**
 * O BRILHO DA PELE IONIZADA num ponto da frente: o equilíbrio de
 * fotoionização põe na frente uma medida de emissão proporcional aos
 * fótons ionizantes que chegam — Q/(4πd²) vezes o cosseno da incidência.
 * Numa tigela cuja frente se inclina para longe da estrela isso dá o D⁻²
 * perto e o ~D⁻³ longe que O'Dell & Harris (2010) medem. Unidade: 1 na
 * frente perpendicular a 1 pc. `d` tem piso no fundo da tigela (0,2 pc).
 */
/** a frente de costas para a estrela ainda recebe a luz difusa do gás
 *  (a recombinação devolve fótons ionizantes em toda direção) — autor */
export const PISO_DA_INCIDENCIA = 0.08;

export function brilhoDaFrente(dPc: number, cosIncidencia: number): number {
  const d = Math.max(dPc, ESTRELA_NA_FRENTE_DA_MIF_PC);
  return Math.max(cosIncidencia, PISO_DA_INCIDENCIA) / (d * d);
}

/**
 * [O III] 5007 por Hβ: alto onde a estrela é perto (a zona de alta
 * ionização, a casca aberta de [O III] em volta do Trapézio — O'Dell &
 * Henney 2008), caindo para fora; zero em M43 (NU Ori é fria demais).
 * O valor de pico (3,5) e a escala (0,5 pc) são aproximação de autor.
 */
export function razaoOIII(dPc: number): number {
  return 3.5 / (1 + (dPc / 0.5) ** 2);
}

/** Hα/Hβ = 2,86, recombinação caso B a 10⁴ K (Osterbrock & Ferland) */
export const HALFA_POR_HBETA = 2.86;

/** as cores das linhas por unidade de energia (RGB linear) */
export const CORES_DAS_LINHAS = {
  halfa: corDaLinhaDeEmissao(656.3),
  nii: corDaLinhaDeEmissao(658.4),
  hbeta: corDaLinhaDeEmissao(486.1),
  oiii: corDaLinhaDeEmissao(500.7),
};

/** a cor da pele a uma distância d da estrela (soma das linhas, por Hβ);
 *  [N II]/Hα sobe para fora, onde a ionização é mais baixa */
export function corDaFrente(dPc: number, comOIII = true): Trio {
  const o3 = comOIII ? razaoOIII(dPc) : 0;
  const n2 = HALFA_POR_HBETA * (0.15 + 0.3 * (1 - 1 / (1 + (dPc / 0.5) ** 2)));
  const c = CORES_DAS_LINHAS;
  return [0, 1, 2].map(
    (i) => HALFA_POR_HBETA * c.halfa[i] + n2 * c.nii[i] + c.hbeta[i] + o3 * c.oiii[i]
  ) as Trio;
}

// ---- O shader -------------------------------------------------------------

const v3 = (v: readonly number[]) => `vec3(${v.map(glslNumber).join(', ')})`;
const n = glslNumber;

/** a luz da estrela espalhada pela poeira: o corpo negro de 39.000 K
 *  (θ¹ Ori C) puxado ao azul pela lei λ^−1,3 que a casa usa */
const COR_ESPALHADA: Trio = [0.55, 0.78, 1.0];

/**
 * O TRECHO GLSL comum: o referencial, a frente, a nuvem e a coluna de
 * extinção pela nuvem molecular (para as estrelas). Precisa de `fbm`
 * (GLSL_NOISE) antes dele.
 */
export const GLSL_ORION_BASE = /* glsl */ `
const vec3 OR_C = ${v3(CENTRO_DE_ORION)};
const vec3 OR_E = ${v3(REFERENCIAL_DE_ORION.leste)};
const vec3 OR_N = ${v3(REFERENCIAL_DE_ORION.norte)};
const vec3 OR_W = ${v3(REFERENCIAL_DE_ORION.rumoAoSol)};
const float OR_RAIO = ${n(RAIO_DE_ORION_PC)};

vec3 orLocal(vec3 p) { vec3 q = p - OR_C; return vec3(dot(q, OR_E), dot(q, OR_N), dot(q, OR_W)); }
vec3 orDir(vec3 v) { return vec3(dot(v, OR_E), dot(v, OR_N), dot(v, OR_W)); }

// o trecho [t0, t1] do raio (local) dentro da esfera de Órion; t1 < t0 = fora
vec2 orIntervalo(vec3 o, vec3 d) {
  float b = dot(o, d);
  float c = dot(o, o) - OR_RAIO * OR_RAIO;
  float h = b * b - c;
  if (h <= 0.0) return vec2(1.0, -1.0);
  h = sqrt(h);
  return vec2(max(-b - h, 0.0), -b + h);
}

// a frente: (z, dz/dx, dz/dy) — espelho de alturaDaFrente
float orS(float a, float b, float x) { return smoothstep(a, b, x); }
float orDS(float a, float b, float x) {
  float t = (x - a) / (b - a);
  return (t <= 0.0 || t >= 1.0) ? 0.0 : 6.0 * t * (1.0 - t) / (b - a);
}
vec3 orFrente(vec2 xy) {
  const vec2 SE = vec2(0.70710678, -0.70710678);
  const vec2 NE = vec2(0.70710678, 0.70710678);
  vec2 Mxy = vec2(${n(METRICA_DA_TIGELA[0])} * xy.x + ${n(METRICA_DA_TIGELA[1])} * xy.y,
                  ${n(METRICA_DA_TIGELA[1])} * xy.x + ${n(METRICA_DA_TIGELA[2])} * xy.y);
  float g = exp(-dot(xy, Mxy) * ${n(1 / (RAIO_DA_TIGELA_PC * RAIO_DA_TIGELA_PC))});
  float z = ${n(-ESTRELA_NA_FRENTE_DA_MIF_PC)} + ${n(SUBIDA_DA_TIGELA_PC)} * (1.0 - g);
  vec2 grad = Mxy * (${n((2 * SUBIDA_DA_TIGELA_PC) / (RAIO_DA_TIGELA_PC * RAIO_DA_TIGELA_PC))} * g);
  float v = dot(xy, NE);
  float u = dot(xy, SE) - ${n(BARRA.distanciaPc)} - ${n(BARRA.curvatura)} * v * v;
  vec2 du = SE - ${n(2 * BARRA.curvatura)} * v * NE;
  float s0 = orS(${n(-BARRA.meiaLarguraDaSubidaPc)}, ${n(BARRA.meiaLarguraDaSubidaPc)}, u);
  float queda = 1.0 - orS(${n(BARRA.descidaPc[0])}, ${n(BARRA.descidaPc[1])}, u);
  float s = s0 * queda;
  float ds = orDS(${n(-BARRA.meiaLarguraDaSubidaPc)}, ${n(BARRA.meiaLarguraDaSubidaPc)}, u) * queda -
    s0 * orDS(${n(BARRA.descidaPc[0])}, ${n(BARRA.descidaPc[1])}, u);
  float a0 = ${n(BARRA.meioComprimentoPc - BARRA.pontaPc)};
  float a1 = ${n(BARRA.meioComprimentoPc)};
  float L = 1.0 - orS(a0, a1, abs(v));
  float dL = -orDS(a0, a1, abs(v)) * sign(v);
  z += ${n(BARRA.alturaPc)} * s * L;
  grad += ${n(BARRA.alturaPc)} * (ds * L * du + s * dL * NE);
  return vec3(z, grad);
}

// a nuvem molecular atrás da frente: densidade 0..1 (sem detalhe — a
// mesma conta na extinção das estrelas e no raymarch)
float orNuvem(vec3 q, float h) {
  // a borda não é um círculo: o raio respira com um ruído largo
  // (inventado) e a coluna afina para fora em vez de cortar
  float r = length(q.xy) * (0.8 + 0.4 * fbm(q * 0.45 + 2.3, 2));
  float lado = 1.0 - smoothstep(${n(RAIO_DA_NUVEM_PC * 0.45)}, ${n(RAIO_DA_NUVEM_PC)}, r);
  float fundo = smoothstep(${n(-FUNDO_DA_NUVEM_PC)}, ${n(-FUNDO_DA_NUVEM_PC + 0.6)}, q.z);
  return smoothstep(0.0, -0.03, h) * lado * lado * lado * fundo;
}

// a profundidade óptica (V) pela nuvem molecular no segmento a→b (cena)
float orColunaDaNuvem(vec3 a, vec3 b) {
  vec3 o = orLocal(a);
  vec3 dv = orDir(b - a);
  float len = length(dv);
  if (len < 1e-6) return 0.0;
  vec3 d = dv / len;
  vec2 iv = orIntervalo(o, d);
  float t1 = min(iv.y, len);
  if (t1 <= iv.x) return 0.0;
  float dt = (t1 - iv.x) / 8.0;
  float tau = 0.0;
  for (int i = 0; i < 8; i++) {
    vec3 q = o + d * (iv.x + (float(i) + 0.5) * dt);
    vec3 f = orFrente(q.xy);
    tau += orNuvem(q, q.z - f.x) * dt;
  }
  return tau * 40.0;
}
`;

/**
 * O SUB-LAÇO DO RAYMARCH. Devolve (rgb emitido, transmissão) no trecho
 * do raio dentro da esfera. A pele ionizada é integrada EXATA por
 * segmento (perfil exponencial em h, h linear no passo) — não há banda
 * nem que o passo pule a camada de 0,1 pc; o passo é adaptativo, fino
 * perto da frente e largo na cavidade.
 */
export const GLSL_ORION_MARCHA = /* glsl */ `
const vec3 OR_COR_HALFA = ${v3(CORES_DAS_LINHAS.halfa)};
const vec3 OR_COR_NII = ${v3(CORES_DAS_LINHAS.nii)};
const vec3 OR_COR_HBETA = ${v3(CORES_DAS_LINHAS.hbeta)};
const vec3 OR_COR_OIII = ${v3(CORES_DAS_LINHAS.oiii)};
const vec3 OR_COR_ESPALHADA = ${v3(COR_ESPALHADA)};

vec3 orCorDaFrente(float d, float o3peso) {
  float x = d * ${n(1 / 0.5)};
  float fora = 1.0 - 1.0 / (1.0 + x * x);
  float o3 = o3peso * 3.5 / (1.0 + x * x);
  float n2 = ${n(HALFA_POR_HBETA)} * (0.15 + 0.3 * fora);
  return ${n(HALFA_POR_HBETA)} * OR_COR_HALFA + n2 * OR_COR_NII + OR_COR_HBETA + o3 * OR_COR_OIII;
}

// ∫ g(h) ao longo de um passo com h linear de h0 a h1, g = e^(−h/H) acima
// da frente (a pele ionizada) e e^(h/Hi) abaixo dela (o gás ionizado
// acaba de uma vez dentro da nuvem). G é a primitiva, G(0) = 0.
float orG(float h) {
  return h >= 0.0
    ? ${n(PELE_IONIZADA_PC)} * (1.0 - exp(-h * ${n(1 / PELE_IONIZADA_PC)}))
    : 0.01 * (exp(h * 100.0) - 1.0);
}
float orPele(float h0, float h1, float dt) {
  if (abs(h1 - h0) < 1e-4) {
    float hm = 0.5 * (h0 + h1);
    return dt * (hm >= 0.0 ? exp(-hm * ${n(1 / PELE_IONIZADA_PC)}) : exp(hm * 100.0));
  }
  return dt * (orG(h1) - orG(h0)) / (h1 - h0);
}

// o traçado da Baía Escura: 0..1
float orBaia(vec2 xy) {
  float m = 0.0;
  // a borda da faixa ondula (inventado)
  xy += (vec2(fbm(vec3(xy * 6.0, 1.0), 2), fbm(vec3(xy * 6.0, 7.0), 2)) - 0.375) * 0.12;
${BAIA_ESCURA.slice(0, -1)
  .map((a, i) => {
    const b = BAIA_ESCURA[i + 1];
    return `  { vec2 A = vec2(${n(a[0])}, ${n(a[1])}); vec2 B = vec2(${n(b[0])}, ${n(b[1])});
    vec2 ab = B - A; float k = clamp(dot(xy - A, ab) / dot(ab, ab), 0.0, 1.0);
    float rr = mix(${n(a[2])}, ${n(b[2])}, k);
    m = max(m, 1.0 - smoothstep(0.0, rr * 1.3, length(xy - A - ab * k))); }`;
  })
  .join('\n')}
  return m;
}

vec4 orMarcha(vec3 roCena, vec3 rdCena, float jitter, int passos) {
  vec3 o = orLocal(roCena);
  vec3 d = orDir(rdCena);
  vec2 iv = orIntervalo(o, d);
  vec3 acc = vec3(0.0);
  float T = 1.0;
  if (iv.y <= iv.x) return vec4(acc, T);
  // fora de 3 kpc o objeto é menor que um pixel do alvo de meia resolução
  if (dot(o, o) > 9.0e6) return vec4(acc, T);
  float escala = 70.0 / float(passos);
  float t = iv.x;
  vec3 q = o + d * t;
  vec3 f = orFrente(q.xy);
  float hPrev = (q.z - f.x) * inversesqrt(1.0 + dot(f.yz, f.yz));
  bool primeiro = true;
  for (int i = 0; i < 128; i++) {
    if (i >= passos || t >= iv.y || T < 0.01) break;
    float dt = clamp(0.4 * abs(hPrev) + 0.012, 0.012, 0.35) * escala;
    if (primeiro) { dt *= 0.25 + jitter; primeiro = false; }
    dt = min(dt, iv.y - t);
    float tm = t + dt * 0.5;
    t += dt;
    q = o + d * t;
    vec3 qm = o + d * tm;
    f = orFrente(q.xy);
    // o detalhe fino: a frente ondula em ~0,2 e ~0,05 pc (inventado)
    float ond = (fbm(q * 6.0 + 3.1, 2) - 0.375) * 0.11 + (fbm(q * 23.0 + 9.7, 2) - 0.375) * 0.02;
    float hNow = (q.z - f.x + ond) * inversesqrt(1.0 + dot(f.yz, f.yz));
    float dist = max(length(qm), ${n(ESTRELA_NA_FRENTE_DA_MIF_PC)});
    // envelope: a nebulosa visível acaba em ~65′, alongada para SW
    vec2 sw = vec2(qm.x + qm.y, qm.y - qm.x) * 0.70710678;
    vec2 el = vec2(sw.x * (sw.x < 0.0 ? ${n(1 / ALONGAMENTO_SW)} : ${n(1 / ENCURTAMENTO_NE)}), sw.y);
    // a borda não é um círculo: lóbulos por direção (inventados)
    vec2 dirEl = el / max(length(el), 1e-4);
    float lobo = fbm(vec3(dirEl * 1.6, 0.5) + 23.0, 3);
    float rel = length(el) * ${n(1 / RAIO_DO_ENVELOPE_PC)} / (0.45 + 1.3 * lobo);
    float envelope = exp(-rel * rel * rel) * (1.0 - smoothstep(3.6, 5.2, length(qm)));

    // 1) a pele ionizada sobre a frente: Q/(4πd²)·cos(incidência)
    vec3 nrm = normalize(vec3(-f.y, -f.z, 1.0));
    vec3 sup = vec3(qm.xy, f.x);
    float cosInc = dot(nrm, -sup) / max(length(sup), 1e-3);
    // O DETALHE (inventado, declarado): frentes em ARCO em volta da
    // estrela — as dobras da frente que encaram a estrela acendem e as de
    // costas apagam, e vistas de frente viram os arcos e as "asas". Ruído
    // em coordenadas polares em torno de θ¹ Ori C (cos/sen do ângulo, sem
    // costura), crista afiada, mais um véu de fios finos.
    float rr = length(qm.xy);
    vec2 dirXY = qm.xy / max(rr, 1e-4);
    vec3 polar = vec3(dirXY * 1.7, log(rr + 0.08) * 3.2 + qm.z * 1.5);
    polar += (vec3(fbm(qm * 1.1 + 4.0, 2), fbm(qm * 1.1 + 9.0, 2), fbm(qm * 1.1 + 13.0, 2)) - 0.375) * 2.4;
    float arco = 1.0 - abs(2.0 * fbm(polar + 31.0, 3) / 0.875 - 1.0);
    arco *= arco * arco;
    float fios = 0.04 + 2.4 * arco * (0.35 + fbm(qm * 7.0 + 17.0, 2));
    float pele = orPele(hPrev, hNow, dt) * ${n(1 / PELE_IONIZADA_PC)};
    float fluxo = max(cosInc, ${n(PISO_DA_INCIDENCIA)}) / (dist * dist);
    acc += T * orCorDaFrente(dist, 1.0) * (pele * fluxo * fios * envelope * ${n(GANHO_DA_FRENTE)});

    // 2) M43: a esfera ionizada de NU Ori, só Hα/[N II]
    vec3 c43 = qm - vec3(${n(M43.x)}, ${n(M43.y)}, ${n(M43.z)});
    float r43 = dot(c43, c43) * ${n(1 / (M43.raio * M43.raio))};
    if (r43 < 1.0) {
      float m43 = (1.0 - r43) * (0.5 + fbm(qm * 9.0 + 41.0, 2));
      acc += T * orCorDaFrente(1.2, 0.0) * (m43 * dt * ${n(GANHO_DE_M43)});
    }

    // 3) o véu: poeira neutra na frente, que absorve e espalha a luz da
    //    estrela (para a frente, Henyey–Greenstein g = 0,6)
    // o véu é a casca da bolha soprada pelo vento da estrela (Pabst 2020):
    // uma cúpula baixa que encontra a tigela na borda da nebulosa
    float rv = min(length(qm.xy) * ${n(1 / RAIO_DO_VEU_PC)}, 1.0);
    float zv = ${n(VEU.de)} * sqrt(1.0 - rv * rv) + ${n(0.35)} * rv;
    float laje = smoothstep(zv - 0.06, zv + 0.06, qm.z) *
      (1.0 - smoothstep(zv + ${n(VEU.ate - VEU.de - 0.15)}, zv + ${n(VEU.ate - VEU.de + 0.15)}, qm.z));
    float tauVeu = 0.0;
    if (laje > 0.0) {
      float grumo = 0.08 + 1.9 * smoothstep(0.22, 0.6, fbm(qm * 1.3 + 5.0, 3));
      float baia = orBaia(qm.xy) * (0.6 + 0.8 * fbm(qm * 8.0 + 2.0, 2));
      float rho = laje * envelope * (grumo + 4.0 * baia);
      tauVeu = rho * dt * ${n(VEU.tau / (VEU.ate - VEU.de))};
      float cosEsp = dot(normalize(qm), -d);
      float hg = 0.64 / pow(1.36 - 1.2 * cosEsp, 1.5);
      // espalhamento simples que satura: a poeira grossa não brilha mais
      // que a fina, só tapa mais
      // a luz da estrela já chega gasta pela poeira do véu entre ela e o
      // ponto (a coluna local, na direção da estrela): a poeira grossa só
      // acende na face de baixo e some por cima — a Baía Escura é escura
      float tauEntrada = rho * ${n(VEU.tau / (VEU.ate - VEU.de))} * max(qm.z - zv + 0.06, 0.0) * dist / max(qm.z, 0.05);
      acc += T * OR_COR_ESPALHADA * ((1.0 - exp(-tauVeu)) * exp(-tauEntrada) * hg / (dist * dist) * ${n(GANHO_DO_ESPALHADO)});
    }
    // 4) a nuvem molecular: opaca
    float tauNuvem = orNuvem(q, hNow) * dt * 40.0;
    float tau = tauVeu + tauNuvem;
    T *= exp(-tau);
    hPrev = hNow;
  }
  // A EXPOSIÇÃO DE FOTO LONGA: a lei D⁻² dá ~600× entre o miolo e a borda
  // de 65′; a tela mostra em LOG, como um empilhamento HDR das fotos
  // profundas (declarado no selo) — cada década de brilho vale o mesmo
  float lum = dot(acc, vec3(0.2126, 0.7152, 0.0722));
  if (lum > 1e-7) acc *= ${n(EXPOSICAO_LOG.ganho)} * log(1.0 + lum * ${n(1 / EXPOSICAO_LOG.joelho)}) / lum;
  return vec4(acc, T);
}
`;
