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
// A ANATOMIA (referencial local, pc, origem em θ¹ Ori C como o
// catálogo da casa a desenha; x = leste, y = norte no céu, z = rumo ao
// Sol). Três volumes, todos com espessura — nada é pele infinitamente
// fina:
//  1. A NUVEM MOLECULAR (OMC-1 / Órion A): um corpo escuro muito maior
//     que a parte acesa, mais comprido de norte a sul, com borda roída e
//     fundo irregular; a face dela que a estrela enxerga é a frente de
//     ionização (MIF), uma parede côncava — mais alta a nordeste, onde a
//     Baía Escura e M43 fecham o brilho, baixa a sudoeste, por onde a
//     cavidade se abre — com a escarpa da Barra a sudeste.
//  2. A CAMADA IONIZADA sobre a MIF, com o brilho Q/(4πd²)·cos da
//     estrela; perto dela a camada tem ~0,1 pc, e engrossa para longe
//     (extrapolado: o gás que evapora da parede se espalha ao sair).
//     Na borda de baixo, a frente de ionização propriamente dita, fina e
//     vermelha ([N II], [S II], [O I]); embaixo dela, a poeira da região
//     de fotodissociação, e a nuvem.
//  3. A BOLHA DO VÉU: a casca de ~4 pc soprada pelo vento de θ¹ Ori C
//     (Pabst et al. 2019), deslocada para sudoeste, onde o plasma quente
//     escapa (Güdel et al. 2008). A face de dentro, acesa pelo Trapézio,
//     é a Nebulosa de Órion Estendida — vista de frente, as bordas da
//     casca viram as "asas"; a tampa da frente é o véu de poeira neutra,
//     onde fica a Baía Escura. Dentro dela, o gás difuso, com a bolha de
//     alta ionização ([O III]) em volta da estrela (O'Dell & Abel 2025).
//
// Medido, com a fonte aberta em cada número:
//  • θ¹ Ori C está ~0,2 pc NA FRENTE da frente de ionização principal
//    (MIF), e a camada que emite tem ~0,1 pc — O'Dell & Henney 2008,
//    arXiv:0810.4375.
//  • a cavidade ionizada tem ~0,7 pc de fundo e o véu neutro fica a
//    ~0,4 pc da estrela (van der Werf et al. 2013, arXiv:1211.0470); a
//    camada mais ionizada do véu a 1,3 pc (O'Dell et al. 2020,
//    arXiv:1906.07779).
//  • a bolha do vento: ~4 pc de diâmetro, casca de 2.600 M☉ (Pabst et
//    al. 2019, arXiv:1901.04221); o plasma de milhões de K enche a
//    extensão SUDOESTE da nebulosa (Güdel et al. 2008, arXiv:0712.0476);
//    a casca externa cobre a região de Huygens e a Nebulosa Estendida, e
//    perto da estrela há uma bolha central de alta ionização, aberta
//    para nós (O'Dell & Abel 2025, arXiv:2507.02147).
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
// INVENTADO e declarado na ficha: a forma exata da parede e da bolha
// fora desses pontos, o comprimento da Barra, o traçado da Baía Escura,
// o engrossar da camada com a distância e todo o detalhe fino (fios
// que escorrem para longe do Trapézio, dobras da parede) — ruído
// procedural, estatisticamente plausível, sem medida por trás. E o
// GANHO: o brilho que chega à tela cai como a RAIZ do fluxo da estrela
// (lei fixa do objeto, a mesma de qualquer câmera — ver `GAMA_DO_BRILHO`).
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
/** quanto a parede sobe até a borda: em média 0,55 pc (a cavidade tem
 *  ~0,7 pc de fundo até o véu, van der Werf 2013), mais alta a nordeste
 *  e baixa a sudoeste, por onde a cavidade se abre (forma de autor
 *  guiada por Güdel 2008 e O'Dell & Harris 2010) */
export const SUBIDA_DA_PAREDE = { media: 0.55, nordesteMenosSudoeste: 0.3 };
/** raio da curva da parede (forma de autor entre os pontos medidos) */
const RAIO_DA_PAREDE_PC = 1.1;
/** espessura e-folding da camada ionizada junto à estrela (~0,1 pc no
 *  total, O'Dell & Henney 2008); engrossa 80% por pc além de 0,25 pc
 *  (extrapolado: o fluxo de fotoevaporação se espalha ao sair) */
export const CAMADA_IONIZADA = { pertoPc: 0.05, crescePorPc: 0.8 };
/** a frente de ionização propriamente dita: a borda de baixa
 *  ionização, ~0,015 pc (autor, guiado pelas camadas da Barra de
 *  Pellegrini 2009) */
const FRENTE_FINA_PC = 0.015;
/** a Barra: 2′ a SE da estrela (Berné 2022), escarpa de 0,25 pc */
export const BARRA = {
  distanciaPc: 2 * ARCMIN_PC,
  alturaPc: 0.25,
  /** a crista se curva para longe da estrela nas pontas (autor) */
  curvatura: 0.6,
  meiaLarguraDaSubidaPc: 0.03,
  meioComprimentoPc: 0.38,
  pontaPc: 0.28,
  /** atrás da escarpa a crista volta à parede (forma de autor) */
  descidaPc: [0.05, 0.3] as [number, number],
};
/**
 * AS ASAS: duas cristas da parede que sobem para o Sol em arco em volta
 * da estrela — a oeste (de norte, varrendo para sudoeste) e a leste (de
 * leste, varrendo para sul) —, e que, como a Barra, encaram a estrela e
 * acendem de lado. É o mecanismo físico da Barra repetido mais longe; o
 * traçado (ângulos em graus a partir do leste, rumo ao norte; raios e
 * alturas em pc) é de autor, guiado pela forma das fotos de M42.
 */
export const ASAS = [
  { de: 100, ate: 245, raioDe: 0.6, raioAte: 1.7, alturaPc: 0.35 },
  { de: 15, ate: -100, raioDe: 0.75, raioAte: 1.9, alturaPc: 0.3 },
] as const;
const asa = (r: number, angulo: number, a: (typeof ASAS)[number]) => {
  const k = Math.min(1, Math.max(0, (angulo - a.de) / (a.ate - a.de)));
  const ponta = smooth(0, 0.2, k) * (1 - smooth(0.75, 1, k));
  const u = r - (a.raioDe + (a.raioAte - a.raioDe) * k);
  return a.alturaPc * smooth(-0.06, 0.06, u) * (1 - smooth(0.1, 0.5, u)) * ponta;
};
/** a métrica da parede [m00, m01, m11]: 1,5× mais longa ao longo de
 *  NE–SW (autor, guiado pelo leque de SW de Güdel 2008) */
export const METRICA_DA_PAREDE: [number, number, number] = (() => {
  const a = 1 / (1.5 * 1.5); // ao longo de NE–SW
  const b = 1; // ao longo de NW–SE
  // eixo NE = (1, 1)/√2: M = a·nnᵀ + b·mmᵀ, m = (1, −1)/√2
  return [(a + b) / 2, (a - b) / 2, (a + b) / 2];
})();
/**
 * A BOLHA DO VÉU (Pabst et al. 2019: ~4 pc de diâmetro), um elipsoide
 * deslocado para sudoeste (Güdel 2008). O centro e os semi-eixos são de
 * autor, escolhidos para a tampa da frente cair sobre a estrela onde o
 * véu é medido: a casca neutra começa em `cascaDe` (raio normalizado) —
 * ~0,55 pc na frente de θ¹ Ori C (o véu a ~0,4 pc, van der Werf 2013) —
 * e termina em 1, ~1,1 pc na frente dela (a camada de 1,3 pc de O'Dell
 * 2020). A face de dentro, acesa, é a Nebulosa Estendida.
 */
export const BOLHA = {
  centro: [-0.45, -1.0, -0.5] as Trio,
  semiEixos: [2.1, 2.4, 1.8] as Trio,
  /** a pele acesa de dentro (raio normalizado e meia-largura) */
  pele: 0.73,
  meiaLarguraDaPele: 0.05,
  cascaDe: 0.76,
};
/** o véu: profundidade óptica V por pc na tampa (~0,5 pc de espessura
 *  sobre a estrela, τ ≈ 0,8 com o grumo médio — autor; a Baía Escura,
 *  7× mais) */
const KAPPA_DO_VEU = 1.6;
/** a nuvem molecular: V por pc no miolo (opaca em ~0,3 pc) e o reforço
 *  da camada comprimida logo atrás da frente (autor) */
const KAPPA_DA_NUVEM = 12;
/** a extensão da nuvem (semi-eixos L–O e N–S no céu, e o fundo): muito
 *  maior que a parte acesa, mais comprida de norte a sul como Órion A
 *  (autor) */
const NUVEM = { lestePc: 4.2, nortePc: 6.5, fundoPc: 2.4 };
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
 *  de autor (logo a leste do Trapézio → nordeste → passando ao sul e a
 *  oeste de M43, por baixo dela), em pc locais, com o raio da faixa em cada vértice */
export const BAIA_ESCURA: readonly [number, number, number][] = [
  [0.06, 0.03, 0.04],
  [0.25, 0.1, 0.14],
  [0.48, 0.22, 0.17],
  [0.35, 0.36, 0.07],
  [0.05, 0.42, 0.06],
];
/** o que a casa chama de "o objeto": a esfera que o raio testa — maior
 *  que a nuvem, para a borda dela ser a do gás e nunca a da esfera */
export const RAIO_DE_ORION_PC = 7.5;

/**
 * O GANHO DE TELA — a única parte de autor da luz. As LEIS (D⁻²,
 * cosseno, linhas, espalhamento) são físicas; o que a tela recebe é o
 * fluxo da estrela elevado a `GAMA_DO_BRILHO`, uma lei FIXA do objeto
 * (não depende de câmera, foco nem do que está na tela): o miolo a
 * 0,2 pc recebe 100× o fluxo da asa a 2 pc, e a tela mostra ~6×. Sem
 * ela as asas somem no preto ou o miolo estoura em branco. Declarado na
 * ficha.
 */
export const GAMA_DO_BRILHO = 0.4;
const GANHO_DA_CAMADA = 0.035;
const GANHO_DA_FRENTE_FINA = 0.02;
const GANHO_DO_DIFUSO = 0.012;
const GANHO_DA_ESTENDIDA = 0.3;
const GANHO_DE_M43 = 0.15;
const GANHO_DO_ESPALHADO = 0.01;

/** DEPURAÇÃO (`?orion=0`): o objeto inteiro desligado, para medir o que
 *  ele custa contra a mesma vista sem ele. Ausente, ligado. */
const ORION_LIGADA =
  typeof window === 'undefined' || new URLSearchParams(window.location.search).get('orion') !== '0';

// ---- As leis, em TS (espelho testado do GLSL) ----------------------------

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const SE: [number, number] = [Math.SQRT1_2, -Math.SQRT1_2];
const NE: [number, number] = [Math.SQRT1_2, Math.SQRT1_2];

/**
 * A ALTURA DA FRENTE DE IONIZAÇÃO (MIF) sobre o plano da estrela, em pc,
 * sem o detalhe fino — uma parede côncava aberta para o Sol (o
 * "blister"), mais alta a nordeste e baixa a sudoeste, mais a escarpa da
 * Barra a SE. Abaixo dela, a nuvem molecular. O shader acende pela
 * normal desta MESMA conta (diferença finita).
 */
export function alturaDaFrente(x: number, y: number): number {
  const [m00, m01, m11] = METRICA_DA_PAREDE;
  const e2 = m00 * x * x + 2 * m01 * x * y + m11 * y * y;
  const g = Math.exp(-e2 / (RAIO_DA_PAREDE_PC * RAIO_DA_PAREDE_PC));
  const r = Math.hypot(x, y);
  const c = (x * NE[0] + y * NE[1]) / Math.max(r, 1e-4);
  const subida = SUBIDA_DA_PAREDE.media + 0.5 * SUBIDA_DA_PAREDE.nordesteMenosSudoeste * c;
  let z = -ESTRELA_NA_FRENTE_DA_MIF_PC + subida * (1 - g);
  const v = x * NE[0] + y * NE[1];
  const u = x * SE[0] + y * SE[1] - BARRA.distanciaPc - BARRA.curvatura * v * v;
  const w = BARRA.meiaLarguraDaSubidaPc;
  // a escarpa sobe de uma vez e desce devagar atrás dela (uma crista,
  // não um planalto sem fim)
  const s = smooth(-w, w, u) * (1 - smooth(BARRA.descidaPc[0], BARRA.descidaPc[1], u));
  const L = 1 - smooth(BARRA.meioComprimentoPc - BARRA.pontaPc, BARRA.meioComprimentoPc, Math.abs(v));
  z += BARRA.alturaPc * s * L;
  const graus = (Math.atan2(y, x) * 180) / Math.PI;
  z += asa(r, graus < 0 ? graus + 360 : graus, ASAS[0]) + asa(r, graus, ASAS[1]);
  return z;
}

/** o raio normalizado da bolha do véu num ponto local (sem o ruído da
 *  borda): < `BOLHA.pele` dentro, ~1 na borda de fora */
export function raioNaBolha(p: Trio): number {
  const { centro, semiEixos } = BOLHA;
  return Math.hypot(...([0, 1, 2].map((i) => (p[i] - centro[i]) / semiEixos[i]) as Trio));
}

/** a espessura e-folding da camada ionizada a uma distância d da estrela */
export function espessuraDaCamada(dPc: number): number {
  return CAMADA_IONIZADA.pertoPc * (1 + CAMADA_IONIZADA.crescePorPc * Math.max(dPc - 0.25, 0));
}

/**
 * O BRILHO DA CAMADA IONIZADA num ponto da frente: o equilíbrio de
 * fotoionização põe na frente uma medida de emissão proporcional aos
 * fótons ionizantes que chegam — Q/(4πd²) vezes o cosseno da incidência.
 * Numa parede que se inclina para longe da estrela isso dá o D⁻² perto e
 * o ~D⁻³ longe que O'Dell & Harris (2010) medem. Unidade: 1 na frente
 * perpendicular a 1 pc. `d` tem piso no fundo da parede (0,2 pc).
 */
/** a frente de costas para a estrela ainda recebe a luz difusa do gás
 *  (a recombinação devolve fótons ionizantes em toda direção) — autor */
export const PISO_DA_INCIDENCIA = 0.08;

export function brilhoDaFrente(dPc: number, cosIncidencia: number): number {
  const d = Math.max(dPc, ESTRELA_NA_FRENTE_DA_MIF_PC);
  return Math.max(cosIncidencia, PISO_DA_INCIDENCIA) / (d * d);
}

/** o que a tela recebe de um fluxo: a lei fixa `GAMA_DO_BRILHO` */
export function brilhoNaTela(fluxo: number): number {
  return fluxo ** GAMA_DO_BRILHO;
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
  sii: corDaLinhaDeEmissao(671.6),
  oi: corDaLinhaDeEmissao(630.0),
};

/** a cor da camada a uma distância d da estrela (soma das linhas, por
 *  Hβ); [N II]/Hα sobe para fora, onde a ionização é mais baixa */
export function corDaFrente(dPc: number, comOIII = true): Trio {
  const o3 = comOIII ? razaoOIII(dPc) : 0;
  const n2 = HALFA_POR_HBETA * (0.15 + 0.3 * (1 - 1 / (1 + (dPc / 0.5) ** 2)));
  const c = CORES_DAS_LINHAS;
  return [0, 1, 2].map(
    (i) => HALFA_POR_HBETA * c.halfa[i] + n2 * c.nii[i] + c.hbeta[i] + o3 * c.oiii[i]
  ) as Trio;
}

/** a borda de baixa ionização (a frente fina): [N II], [S II] e [O I]
 *  — proporções de autor, só a cor (o brilho vem do fluxo) */
const COR_DA_FRENTE_FINA: Trio = [0, 1, 2].map(
  (i) => CORES_DAS_LINHAS.nii[i] + 0.6 * CORES_DAS_LINHAS.sii[i] + 0.3 * CORES_DAS_LINHAS.oi[i] + 0.5 * CORES_DAS_LINHAS.halfa[i]
) as Trio;

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
const bool OR_LIGADO = ${ORION_LIGADA ? 'true' : 'false'};
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

// uma asa: crista em arco (espelho de \`asa\`)
float orAsa(float r, float th, float th0, float th1, float R0, float R1, float A) {
  float k = clamp((th - th0) / (th1 - th0), 0.0, 1.0);
  float ponta = smoothstep(0.0, 0.2, k) * (1.0 - smoothstep(0.75, 1.0, k));
  float u = r - mix(R0, R1, k);
  return A * smoothstep(-0.06, 0.06, u) * (1.0 - smoothstep(0.1, 0.5, u)) * ponta;
}
// a frente sem detalhe — espelho de alturaDaFrente
float orAlturaLisa(vec2 xy) {
  const vec2 SE = vec2(0.70710678, -0.70710678);
  const vec2 NE = vec2(0.70710678, 0.70710678);
  vec2 Mxy = vec2(${n(METRICA_DA_PAREDE[0])} * xy.x + ${n(METRICA_DA_PAREDE[1])} * xy.y,
                  ${n(METRICA_DA_PAREDE[1])} * xy.x + ${n(METRICA_DA_PAREDE[2])} * xy.y);
  float g = exp(-dot(xy, Mxy) * ${n(1 / (RAIO_DA_PAREDE_PC * RAIO_DA_PAREDE_PC))});
  float c = dot(xy, NE) / max(length(xy), 1e-4);
  float z = ${n(-ESTRELA_NA_FRENTE_DA_MIF_PC)} +
    (${n(SUBIDA_DA_PAREDE.media)} + ${n(0.5 * SUBIDA_DA_PAREDE.nordesteMenosSudoeste)} * c) * (1.0 - g);
  float v = dot(xy, NE);
  float u = dot(xy, SE) - ${n(BARRA.distanciaPc)} - ${n(BARRA.curvatura)} * v * v;
  float s = smoothstep(${n(-BARRA.meiaLarguraDaSubidaPc)}, ${n(BARRA.meiaLarguraDaSubidaPc)}, u) *
    (1.0 - smoothstep(${n(BARRA.descidaPc[0])}, ${n(BARRA.descidaPc[1])}, u));
  float L = 1.0 - smoothstep(${n(BARRA.meioComprimentoPc - BARRA.pontaPc)}, ${n(BARRA.meioComprimentoPc)}, abs(v));
  float r = length(xy);
  float th = degrees(atan(xy.y, xy.x));
${ASAS.map((a, i) => `  z += orAsa(r, ${i === 0 ? 'th < 0.0 ? th + 360.0 : th' : 'th'}, ${n(a.de)}, ${n(a.ate)}, ${n(a.raioDe)}, ${n(a.raioAte)}, ${n(a.alturaPc)});`).join('\n')}
  return z + ${n(BARRA.alturaPc)} * s * L;
}

// o corpo da nuvem molecular: 0..1, muito maior que a parte acesa, mais
// comprido de norte a sul, borda roída e fundo irregular (inventados) —
// a mesma conta na extinção das estrelas e no raymarch
float orMassa(vec3 q) {
  float ruido = fbm(q * 0.35 + 2.3, 2);
  vec2 e = vec2(q.x * ${n(1 / NUVEM.lestePc)}, q.y * ${n(1 / NUVEM.nortePc)});
  float rr = length(e) * (0.75 + 0.65 * ruido);
  float lado = 1.0 - smoothstep(0.35, 1.0, rr);
  float fundo = smoothstep(${n(-NUVEM.fundoPc - 0.7)}, ${n(-NUVEM.fundoPc + 0.7)}, q.z + 1.6 * (ruido - 0.375));
  return lado * lado * lado * fundo;
}
// a densidade da nuvem atrás da frente (h < 0): a camada comprimida logo
// atrás da frente é mais densa (autor)
float orNuvem(vec3 q, float h) {
  return smoothstep(0.0, -0.05, h) * orMassa(q) * (1.0 + 4.0 * exp(h * 4.0));
}

// a profundidade óptica (V) pela nuvem molecular no segmento a→b (cena)
float orColunaDaNuvem(vec3 a, vec3 b) {
  if (!OR_LIGADO) return 0.0;
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
    tau += orNuvem(q, q.z - orAlturaLisa(q.xy)) * dt;
  }
  return tau * ${n(KAPPA_DA_NUVEM)};
}
`;

/**
 * O SUB-LAÇO DO RAYMARCH. Devolve (rgb emitido, transmissão) no trecho
 * do raio dentro da esfera. A camada ionizada e a frente fina são
 * integradas EXATAS por segmento (perfil exponencial em h, h linear no
 * passo) — não há banda nem que o passo pule a camada; o passo é
 * adaptativo, fino perto da frente, da pele da bolha e da estrela.
 */
export const GLSL_ORION_MARCHA = /* glsl */ `
const vec3 OR_COR_HALFA = ${v3(CORES_DAS_LINHAS.halfa)};
const vec3 OR_COR_NII = ${v3(CORES_DAS_LINHAS.nii)};
const vec3 OR_COR_HBETA = ${v3(CORES_DAS_LINHAS.hbeta)};
const vec3 OR_COR_OIII = ${v3(CORES_DAS_LINHAS.oiii)};
const vec3 OR_COR_FINA = ${v3(COR_DA_FRENTE_FINA)};
const vec3 OR_COR_ESPALHADA = ${v3(COR_ESPALHADA)};
const vec3 OR_BOLHA_C = ${v3(BOLHA.centro)};
const vec3 OR_BOLHA_INV = ${v3(BOLHA.semiEixos.map((v) => 1 / v))};

vec3 orCorDaFrente(float d, float o3peso) {
  float x = d * ${n(1 / 0.5)};
  float fora = 1.0 - 1.0 / (1.0 + x * x);
  float o3 = o3peso * 3.5 / (1.0 + x * x);
  float n2 = ${n(HALFA_POR_HBETA)} * (0.15 + 0.3 * fora);
  return ${n(HALFA_POR_HBETA)} * OR_COR_HALFA + n2 * OR_COR_NII + OR_COR_HBETA + o3 * OR_COR_OIII;
}

// as dobras da parede (inventadas): a grande (~0,7 pc) entra na normal —
// as dobras que encaram a estrela acendem, as de costas apagam; a fina
// (~0,2 pc) só na altura
float orDobra(vec2 xy) { return 0.13 * (fbm(vec3(xy * 1.4, 3.7), 2) - 0.375); }
// a frente: (z, dz/dx, dz/dy), normal por diferença finita da MESMA conta
vec3 orFrente(vec2 xy) {
  const float e = 0.015;
  float z0 = orAlturaLisa(xy) + orDobra(xy);
  float zx = orAlturaLisa(xy + vec2(e, 0.0)) + orDobra(xy + vec2(e, 0.0));
  float zy = orAlturaLisa(xy + vec2(0.0, e)) + orDobra(xy + vec2(0.0, e));
  float fina = 0.035 * (fbm(vec3(xy * 4.6, 8.1), 2) - 0.375);
  return vec3(z0 + fina, (zx - z0) / e, (zy - z0) / e);
}

// ∫ g(h)/H ao longo de um passo com h linear de h0 a h1, g = e^(−h/H)
// acima da frente (a camada) e e^(h/0,01) abaixo dela (o gás ionizado
// acaba de uma vez dentro da nuvem); a coluna perpendicular vale 1
float orG(float h, float H) {
  return h >= 0.0 ? H * (1.0 - exp(-h / H)) : 0.01 * (exp(h * 100.0) - 1.0);
}
float orPele(float h0, float h1, float dt, float H) {
  if (abs(h1 - h0) < 1e-4) {
    float hm = 0.5 * (h0 + h1);
    return dt * (hm >= 0.0 ? exp(-hm / H) : exp(hm * 100.0)) / H;
  }
  return dt * (orG(h1, H) - orG(h0, H)) / ((h1 - h0) * H);
}

// O DETALHE FINO (inventado, declarado): fios que ESCORREM para longe do
// Trapézio — ruído em coordenadas de direção (alta frequência de lado) e
// de log da distância (baixa frequência ao longo), torcido por um ruído
// largo para os fios curvarem; crista afiada. Média ~1.
float orFios(vec3 q, float r) {
  vec3 u = q / max(r, 1e-3);
  vec3 torce = vec3(fbm(q * 1.6 + 1.7, 2), fbm(q * 1.6 + 8.3, 2), fbm(q * 1.6 + 4.1, 2)) - 0.375;
  vec3 P = (u + torce * 1.0) * 8.0 + vec3(0.0, 0.0, log(r + 0.03) * 5.0);
  float a = 1.0 - abs(2.0 * fbm(P, 3) / 0.875 - 1.0);
  float b = 1.0 - abs(2.0 * fbm(P * 2.7 + q * 2.0 + 5.0, 2) / 0.75 - 1.0);
  // e um grão sem rumo, para os fios não virarem um sol de raios
  float c = fbm(q * 3.3 + 17.0, 2);
  return (0.25 + 1.4 * a * a * a + 0.6 * b * b * b * b) * (0.45 + 1.45 * c);
}

// o traçado da Baía Escura: 0..1, borda roída por ruído (inventado)
float orBaia(vec2 xy) {
  float m = 1e9;
${BAIA_ESCURA.slice(0, -1)
  .map((a, i) => {
    const b = BAIA_ESCURA[i + 1];
    return `  { vec2 A = vec2(${n(a[0])}, ${n(a[1])}); vec2 B = vec2(${n(b[0])}, ${n(b[1])});
    vec2 ab = B - A; float k = clamp(dot(xy - A, ab) / dot(ab, ab), 0.0, 1.0);
    m = min(m, length(xy - A - ab * k) / mix(${n(a[2])}, ${n(b[2])}, k)); }`;
  })
  .join('\n')}
  return m;
}

vec4 orMarcha(vec3 roCena, vec3 rdCena, float jitter, int passos) {
  vec3 acc = vec3(0.0);
  float T = 1.0;
  if (!OR_LIGADO) return vec4(acc, T);
  vec3 o = orLocal(roCena);
  vec3 d = orDir(rdCena);
  vec2 iv = orIntervalo(o, d);
  if (iv.y <= iv.x) return vec4(acc, T);
  // fora de 3 kpc o objeto é menor que um pixel do alvo de meia resolução
  if (dot(o, o) > 9.0e6) return vec4(acc, T);
  float escala = 70.0 / float(passos);
  float t = iv.x;
  vec3 q = o + d * t;
  vec3 f = orFrente(q.xy);
  float hPrev = (q.z - f.x) * inversesqrt(1.0 + dot(f.yz, f.yz));
  float sPrev = length((q - OR_BOLHA_C) * OR_BOLHA_INV);
  float rPrev = length(q);
  bool primeiro = true;
  for (int i = 0; i < 128; i++) {
    if (i >= passos || t >= iv.y || T < 0.01) break;
    // o passo: fino perto da frente, da pele da bolha e da estrela
    float dt = min(min(0.4 * abs(hPrev) + 0.012, 0.8 * abs(sPrev - ${n(BOLHA.pele)}) + 0.03), 0.35 * rPrev + 0.02);
    dt = clamp(dt, 0.012, 0.45) * escala;
    if (primeiro) { dt *= 0.25 + jitter; primeiro = false; }
    dt = min(dt, iv.y - t);
    t += dt;
    q = o + d * t;
    f = orFrente(q.xy);
    float hNow = (q.z - f.x) * inversesqrt(1.0 + dot(f.yz, f.yz));
    float r = length(q);
    // a bolha do véu, com a borda roída por um ruído largo (inventado)
    float lobo = fbm(q * 0.55 + 23.0, 3);
    float s = length((q - OR_BOLHA_C) * OR_BOLHA_INV) *
      (0.8 + 0.4 * lobo + 0.3 * (fbm(q * 1.3 + 7.0, 3) - 0.44) + 0.12 * (fbm(q * 4.0 + 3.0, 2) - 0.375));
    // fora da bolha a parede ainda recebe um pouco da luz (o que vaza
    // pelos rasgos da casca), e some com a distância: o brilho acaba
    // aos poucos, nunca numa borda
    float dentro = mix(0.05 * exp(-r * 0.6), 1.0,
      1.0 - smoothstep(${n(BOLHA.pele - 0.12)}, ${n(BOLHA.cascaDe + 0.1)}, s));
    float fios = orFios(q, r);

    // 1) a camada ionizada sobre a frente: Q/(4πd²)·cos, e a frente fina
    vec3 nrm = normalize(vec3(-f.y, -f.z, 1.0));
    vec3 sup = vec3(q.xy, f.x);
    float dSup = max(length(sup), ${n(ESTRELA_NA_FRENTE_DA_MIF_PC)});
    float cosInc = dot(nrm, -sup) / dSup;
    float fluxo = pow(max(cosInc, ${n(PISO_DA_INCIDENCIA)}) / (dSup * dSup), ${n(GAMA_DO_BRILHO)});
    float H = ${n(CAMADA_IONIZADA.pertoPc)} * (1.0 + ${n(CAMADA_IONIZADA.crescePorPc)} * max(dSup - 0.25, 0.0));
    float camada = orPele(hPrev, hNow, dt, H);
    float fina = orPele(hPrev, hNow, dt, ${n(FRENTE_FINA_PC)});
    acc += T * fluxo * dentro * (
      orCorDaFrente(dSup, 0.5) * (camada * fios * ${n(GANHO_DA_CAMADA)}) +
      OR_COR_FINA * (fina * (0.5 + 0.5 * fios) * ${n(GANHO_DA_FRENTE_FINA)}));

    float tauVeu = 0.0;
    if (hNow > 0.0) {
      // 2) o gás difuso da cavidade, com a bolha de alta ionização em
      //    volta da estrela (O'Dell & Abel 2025)
      float fluxoV = pow(1.0 / (r * r + 0.03), ${n(GAMA_DO_BRILHO)});
      // a zona quente fica em cima da camada: o difuso é mais [O III]
      // que a parede, e a cor se separa em profundidade
      acc += T * (orCorDaFrente(r, 1.6) - 0.5 * ${n(HALFA_POR_HBETA)} * OR_COR_HALFA) * (fluxoV * dentro * (0.4 + 0.6 * fios) * dt * ${n(GANHO_DO_DIFUSO)});
      // 3) a face de dentro da bolha, acesa: a Nebulosa Estendida —
      //    vista de frente, as bordas dela viram as asas
      float xp = (s - ${n(BOLHA.pele)}) * ${n(1 / BOLHA.meiaLarguraDaPele)};
      // só as PAREDES da bolha, onde ela encosta na nuvem; a tampa da
      // frente (o véu) é neutra e fina, e acesa só de leve (autor)
      vec3 gB = (q - OR_BOLHA_C) * OR_BOLHA_INV * OR_BOLHA_INV;
      float parede = 1.0 - 0.85 * smoothstep(0.35, 0.8, abs(gB.z) / max(length(gB), 1e-4));
      float peleB = exp(-xp * xp) * parede;
      if (peleB > 0.01) {
        float fluxoB = pow(1.0 / max(r * r, 0.04), ${n(GAMA_DO_BRILHO)});
        acc += T * orCorDaFrente(r, 1.0) * (fluxoB * peleB * fios * dt * ${n(GANHO_DA_ESTENDIDA)});
      }
      // 4) o véu: a tampa da casca, poeira neutra que absorve e espalha a
      //    luz da estrela (para a frente, Henyey–Greenstein g = 0,6);
      //    concentrada na tampa da frente, rala nos lados
      float casca = smoothstep(${n(BOLHA.cascaDe - 0.02)}, ${n(BOLHA.cascaDe + 0.06)}, s) * (1.0 - smoothstep(0.93, 1.03, s));
      if (casca > 0.0) {
        float tampa = smoothstep(-0.1, 0.5, (q.z - OR_BOLHA_C.z) * OR_BOLHA_INV.z / max(s, 0.1));
        float grumo = 0.1 + 1.1 * smoothstep(0.2, 0.62, fbm(q * 1.6 + 5.0, 3));
        float baia = 1.0 - smoothstep(0.45, 1.3, orBaia(q.xy) + 1.4 * (fbm(q * 4.0 + 2.0, 3) - 0.44));
        // faixas largas de poeira na tampa: elas recortam o brilho de
        // fora em asas (traçado inventado)
        float faixa = smoothstep(0.5, 0.85, 1.0 - abs(2.0 * fbm(q * 0.75 + 11.0, 3) / 0.875 - 1.0)) *
          smoothstep(0.4, 1.1, length(q.xy));
        float longeDeM43 = smoothstep(0.8, 1.3, length(q.xy - vec2(${n(M43.x)}, ${n(M43.y)})) * ${n(1 / M43.raio)});
        float rho = casca * longeDeM43 * (tampa * (grumo + 2.5 * faixa) + 1.1 * baia);
        tauVeu = rho * dt * ${n(KAPPA_DO_VEU)};
        float cosEsp = dot(q / max(r, 1e-3), d);
        float hg = 0.64 / pow(1.36 - 1.2 * cosEsp, 1.5);
        acc += T * OR_COR_ESPALHADA * ((1.0 - exp(-tauVeu)) * hg * pow(1.0 / max(r * r, 0.04), ${n(GAMA_DO_BRILHO)}) * ${n(GANHO_DO_ESPALHADO)});
      }
    }

    // 5) M43: a bolha ionizada de NU Ori, só Hα/[N II], também na face da
    //    nuvem (meia esfera acima da frente), com fios próprios
    vec3 c43 = q - vec3(${n(M43.x)}, ${n(M43.y)}, ${n(M43.z)});
    float r43 = dot(c43, c43) * ${n(1 / (M43.raio * M43.raio))};
    if (r43 < 1.0 && hNow > -0.02) {
      // a luz de NU Ori cai com a distância a ela (a mesma lei fixa) e o
      // gás tem fios e grumos próprios (inventados)
      float m43 = (1.0 - smoothstep(0.35, 1.0, r43)) * pow(1.0 / (dot(c43, c43) + 0.004), ${n(GAMA_DO_BRILHO)}) *
        (0.1 + 0.9 * smoothstep(0.3, 0.7, fbm(q * 5.0 + 41.0, 3))) * fios;
      acc += T * orCorDaFrente(1.2, 0.0) * (m43 * dt * ${n(GANHO_DE_M43)});
    }

    // 6) a nuvem molecular: opaca, com a borda de fora rala e roída
    float tauNuvem = hNow < 0.0 ? orNuvem(q, hNow) * dt * ${n(KAPPA_DA_NUVEM)} : 0.0;
    T *= exp(-(tauVeu + tauNuvem));
    hPrev = hNow;
    sPrev = s;
    rPrev = r;
  }
  return vec4(acc, T);
}
`;
