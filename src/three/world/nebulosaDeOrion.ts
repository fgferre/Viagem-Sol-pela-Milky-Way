// ============================================================
// A NEBULOSA DE ÓRION (M42/M43) — o modelo físico e o trecho de
// shader que o raymarch da casa (`nebulaShaders.ts`) e a extinção das
// estrelas (`starShaders.ts`) leem. Um objeto só, nos três modos: a
// câmera é a única entrada.
//
// POR QUE GRADES ASSADAS DENTRO DO RAYMARCH DA CASA. O gás da casa é
// assado num cubo de 2 kpc com voxel de 15,6 pc; a parte brilhante de
// Órion tem ~1 pc e a pele ionizada ~0,1 pc. Então Órion tem as grades
// dela, assadas UMA VEZ na GPU a partir do modelo abaixo (`orCampo` e
// `orSuperficie`): uma fina no miolo, uma grossa na nuvem inteira e uma
// 2-D com a frente de ionização. O MESMO laço da casa, quando o raio
// entra na caixa de Órion, anda nelas com poucos passos largos, compõe em
// ordem (o que está na frente, Órion, o que está atrás) e devolve a
// transmissão — a nuvem molecular de trás apaga a faixa e o gás atrás
// dela. Avaliar o modelo e o ruído dele a cada passo custava ~11× a cena.
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
// GANHO: o brilho que chega à tela é o fluxo da estrela elevado a 0,3
// (lei fixa do objeto, a mesma de qualquer câmera — ver `GAMA_DO_BRILHO`).
// ============================================================
import { corDaLinhaDeEmissao } from '../luzDaCasa';
import { glslNumber } from '../glslNumber';

type Trio = [number, number, number];

/** θ¹ Ori (HD 37022, O6pe) como o catálogo da casa o desenha — a
 *  entrada nomeada `θ¹ Ori` de `public/data/stars_meta.json`; o teste
 *  cobra que as duas batem. A 414 pc: a paralaxe do Gaia erra nas quatro
 *  do Trapézio (336 a 438 pc entre elas), então o catálogo lhes dá a
 *  distância do grupo medida por VLBI (414 ± 7 pc, Menten et al. 2007;
 *  388 ± 5 pc em Kounkel et al. 2017). */
export const CENTRO_DE_ORION: Trio = [44.381, 409.7733, -38.8873];

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
/** A BORDA DA TIGELA: além de ~1 pc a parede continua subindo, de frente
 *  para a estrela, até uma borda a ~2,3 pc (a cavidade de ~4 pc de Pabst
 *  2019), mais alta a nordeste, onde a Baía Escura e M43 fecham o brilho,
 *  e baixa a sudoeste, por onde ela se abre (Güdel 2008); por fora da
 *  borda a face da nuvem desce de costas para a estrela. É essa parede
 *  larga, acesa, que dá o corpo da nebulosa vista daqui. Forma de autor:
 *  o centro da borda, o raio e as alturas. */
export const BORDA_DA_TIGELA = {
  centro: [-0.3, -0.6] as [number, number],
  raioPc: 2.3,
  alturaPc: 0.25,
  nordesteMenosSudoeste: 0.4,
};
/** quanto a face da nuvem desce por fora da borda (autor) */
const QUEDA_FORA_PC = 0.8;
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
  { de: 110, ate: 225, raioDe: 0.6, raioAte: 1.7, alturaPc: 0.35 },
  { de: 0, ate: -80, raioDe: 0.75, raioAte: 1.9, alturaPc: 0.3 },
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
  centro: [-0.45, -1.0, -0.3] as Trio,
  semiEixos: [2.1, 2.4, 1.8] as Trio,
  /** a pele acesa de dentro (raio normalizado e meia-largura) */
  pele: 0.67,
  meiaLarguraDaPele: 0.06,
  cascaDe: 0.7,
};
/** o véu: profundidade óptica V por pc na tampa (~0,5 pc de espessura
 *  sobre a estrela, τ ≈ 0,8 com o grumo médio — autor; a Baía Escura,
 *  7× mais) */
const KAPPA_DO_VEU = 0.7;
/** a nuvem molecular: V por pc no miolo (opaca em ~0,3 pc) e o reforço
 *  da camada comprimida logo atrás da frente (autor) */
const KAPPA_DA_NUVEM = 12;
/** a extensão da nuvem (semi-eixos L–O e N–S no céu, e o fundo médio):
 *  muito maior que a parte acesa, mais comprida de norte a sul como
 *  Órion A (autor) */
const NUVEM = { lestePc: 5.5, nortePc: 9, fundoPc: 3.5 };
/** a amplitude do relevo da face da nuvem longe da parte acesa (autor) */
const RELEVO_DE_FORA_PC = 1.6;
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

/**
 * O GANHO DE TELA — a única parte de autor da luz. As LEIS (D⁻²,
 * cosseno, linhas, espalhamento) são físicas; o que a tela recebe é o
 * fluxo da estrela elevado a `GAMA_DO_BRILHO`, uma lei FIXA do objeto
 * (não depende de câmera, foco nem do que está na tela): o miolo a
 * 0,2 pc recebe 100× o fluxo da asa a 2 pc, e a tela mostra ~4×. Sem
 * ela as asas somem no preto ou o miolo estoura em branco; com 0,4 (a
 * 2ª versão) a parte larga sumia na chegada. Declarado na ficha.
 */
export const GAMA_DO_BRILHO = 0.3;
const GANHO_DA_CAMADA = 0.05;
const GANHO_DA_FRENTE_FINA = 0.02;
const GANHO_DO_DIFUSO = 0.03;
const GANHO_DA_ESTENDIDA = 0.12;
const GANHO_DO_INTERIOR = 0.015;
const GANHO_DE_M43 = 0.15;
const GANHO_DO_ESPALHADO = 0.01;
/** a parede é acesa até este tanto além da bolha do véu (o raio
 *  normalizado dela é multiplicado por isto; autor) */
const ALCANCE_DA_LUZ_NA_PAREDE = 0.72;
/** o passo mais curto da marcha em cada grade (pc): perto da resolução
 *  dela — mais curto que isso não acrescenta detalhe, só custo */
const PASSO_MINIMO_PC = { nucleo: 0.04, volume: 0.25 };

/** DEPURAÇÃO (`?orion=0`): o objeto inteiro desligado, para medir o que
 *  ele custa contra a mesma vista sem ele. Ausente, ligado. */
export const ORION_LIGADA =
  typeof window === 'undefined' || new URLSearchParams(window.location.search).get('orion') !== '0';
/** DEPURAÇÃO (`?orpartes=máscara`): só as partes ligadas na máscara —
 *  1 difuso, 2 face da bolha, 4 gás ralo, 8 luz espalhada, 16 véu,
 *  32 M43, 64 nuvem, 128 camada. Ausente, todas. */
const PARTES =
  typeof window === 'undefined' ? 255 : Number(new URLSearchParams(window.location.search).get('orpartes') ?? 255);
const parte = (bit: number) => ((PARTES & bit) !== 0 ? '1.0' : '0.0');

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
  // a tigela sobe até a borda e, por fora dela, a face da nuvem desce:
  // a borda é um anel em volta da parte acesa, não um planalto
  const bx = x - BORDA_DA_TIGELA.centro[0], by = y - BORDA_DA_TIGELA.centro[1];
  const eb = Math.sqrt(m00 * bx * bx + 2 * m01 * bx * by + m11 * by * by);
  const borda = BORDA_DA_TIGELA.alturaPc + 0.5 * BORDA_DA_TIGELA.nordesteMenosSudoeste * c;
  const R = BORDA_DA_TIGELA.raioPc;
  let z =
    -ESTRELA_NA_FRENTE_DA_MIF_PC +
    subida * (1 - g) +
    borda * smooth(0.45 * R, R, eb) -
    (QUEDA_FORA_PC + borda + subida) * smooth(R, 1.75 * R, eb);
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

// ---- As grades assadas -----------------------------------------------------
// Duas grades 3-D aninhadas e uma 2-D, assadas UMA VEZ na GPU (o modelo
// abaixo, ponto a ponto, num passe por fatia — o mesmo jeito do gás da
// casa) e lidas pela marcha com poucos passos largos, em vez de avaliar o
// modelo e o ruído dele a cada passo: o NÚCLEO fino (0,05 pc) cobre a
// bolha, a Barra e M43; o VOLUME grosso (~0,19 pc) cobre a nuvem toda; a
// SUPERFÍCIE (0,0125 pc) guarda a frente e o brilho da camada ionizada,
// fina demais para qualquer grade 3-D — ela é integrada exata na marcha.

export interface CaixaDeOrion {
  min: Trio;
  max: Trio;
  dims: Trio;
}
export const CAIXA_DO_NUCLEO: CaixaDeOrion = { min: [-3, -4, -1.6], max: [2.6, 2.4, 2.2], dims: [112, 128, 76] };
export const CAIXA_DO_VOLUME: CaixaDeOrion = { min: [-9, -13, -7.5], max: [9, 13, 4.5], dims: [96, 136, 64] };
/** a superfície cobre o xy do núcleo */
export const GRADE_DA_SUPERFICIE: [number, number] = [448, 512];

// ---- O shader ---------------------------------------------------------------

const v3 = (v: readonly number[]) => `vec3(${v.map(glslNumber).join(', ')})`;
const n = glslNumber;
const inv = (c: CaixaDeOrion) => v3(c.max.map((m, e) => 1 / (m - c.min[e])));
/** além disto da estrela (pc) a câmera não vê Órion apagar estrela
 *  nenhuma: o termo nem roda, e o caminho das estrelas é o de sempre */
export const ALCANCE_DA_EXTINCAO_PC = [40, 80] as const;

/** a luz da estrela espalhada pela poeira: o corpo negro de 39.000 K
 *  (θ¹ Ori C) puxado ao azul pela lei λ^−1,3 que a casa usa */
const COR_ESPALHADA: Trio = [0.55, 0.78, 1.0];

const GLSL_CORES = /* glsl */ `
const vec3 OR_COR_HALFA = ${v3(CORES_DAS_LINHAS.halfa)};
const vec3 OR_COR_NII = ${v3(CORES_DAS_LINHAS.nii)};
const vec3 OR_COR_HBETA = ${v3(CORES_DAS_LINHAS.hbeta)};
const vec3 OR_COR_OIII = ${v3(CORES_DAS_LINHAS.oiii)};
const vec3 OR_COR_FINA = ${v3(COR_DA_FRENTE_FINA)};
const vec3 OR_COR_ESPALHADA = ${v3(COR_ESPALHADA)};

// a cor da camada a uma distância d (soma das linhas por Hβ) — espelho de corDaFrente
vec3 orCorDaFrente(float d, float o3peso) {
  float x = d * ${n(1 / 0.5)};
  float fora = 1.0 - 1.0 / (1.0 + x * x);
  float o3 = o3peso * 3.5 / (1.0 + x * x);
  float n2 = ${n(HALFA_POR_HBETA)} * (0.15 + 0.3 * fora);
  return ${n(HALFA_POR_HBETA)} * OR_COR_HALFA + n2 * OR_COR_NII + OR_COR_HBETA + o3 * OR_COR_OIII;
}
`;

/**
 * O MODELO, PONTO A PONTO — o que o assado grava. Precisa de `fbm`
 * (GLSL_NOISE) antes dele. Tudo o que é desenhado sai daqui: a frente
 * (com as dobras e o relevo de fora), o brilho da camada sobre ela, o gás
 * difuso, a face de dentro da bolha, o gás ralo dentro dela, o véu, M43 e
 * a nuvem. As leis sem ruído têm espelho em TS, testado.
 */
const GLSL_ORION_MODELO = /* glsl */ `
const vec3 OR_BOLHA_C = ${v3(BOLHA.centro)};
const vec3 OR_BOLHA_INV = ${v3(BOLHA.semiEixos.map((v) => 1 / v))};

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
  float subida = ${n(SUBIDA_DA_PAREDE.media)} + ${n(0.5 * SUBIDA_DA_PAREDE.nordesteMenosSudoeste)} * c;
  vec2 b = xy - vec2(${n(BORDA_DA_TIGELA.centro[0])}, ${n(BORDA_DA_TIGELA.centro[1])});
  float eb = sqrt(${n(METRICA_DA_PAREDE[0])} * b.x * b.x + ${n(2 * METRICA_DA_PAREDE[1])} * b.x * b.y + ${n(METRICA_DA_PAREDE[2])} * b.y * b.y);
  float borda = ${n(BORDA_DA_TIGELA.alturaPc)} + ${n(0.5 * BORDA_DA_TIGELA.nordesteMenosSudoeste)} * c;
  float z = ${n(-ESTRELA_NA_FRENTE_DA_MIF_PC)} + subida * (1.0 - g) +
    borda * smoothstep(${n(0.45 * BORDA_DA_TIGELA.raioPc)}, ${n(BORDA_DA_TIGELA.raioPc)}, eb) -
    (${n(QUEDA_FORA_PC)} + borda + subida) * smoothstep(${n(BORDA_DA_TIGELA.raioPc)}, ${n(1.75 * BORDA_DA_TIGELA.raioPc)}, eb);
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

// as dobras da parede (~0,7 pc) entram na normal; o grão (~0,2 pc) só
// na altura; longe da parte acesa a face da nuvem ondula em grande
// escala — sem isso, vista de lado, ela é um planalto de borda reta
// (tudo inventado)
float orDobra(vec2 xy) { return 0.13 * (fbm(vec3(xy * 1.4, 3.7), 2) - 0.375); }
float orGrao(vec2 xy) { return 0.035 * (fbm(vec3(xy * 4.6, 8.1), 2) - 0.375); }
float orRelevoDeFora(vec2 xy) {
  return ${n(RELEVO_DE_FORA_PC)} * (fbm(vec3(xy * 0.3 + vec2(4.1, 1.9), 0.7), 3) - 0.4375) *
    smoothstep(1.8, 4.0, length(xy));
}
float orFrenteComDobras(vec2 xy) { return orAlturaLisa(xy) + orDobra(xy) + orRelevoDeFora(xy); }

// O DETALHE FINO (inventado, declarado): fios que ESCORREM para longe do
// Trapézio — ruído em coordenadas de direção (alta frequência de lado) e
// de log da distância (baixa frequência ao longo), torcido por um ruído
// largo para os fios curvarem; crista afiada; e um grão sem rumo, para
// não virar um sol de raios. Média ~1.
float orFios(vec3 q) {
  float r = max(length(q), 1e-3);
  vec3 torce = vec3(fbm(q * 1.6 + 1.7, 2), fbm(q * 1.6 + 8.3, 2), fbm(q * 1.6 + 4.1, 2)) - 0.375;
  vec3 P = (q / r + torce) * 8.0 + vec3(0.0, 0.0, log(r + 0.03) * 5.0);
  float a = 1.0 - abs(2.0 * fbm(P, 3) / 0.875 - 1.0);
  float b = 1.0 - abs(2.0 * fbm(P * 2.7 + q * 2.0 + 5.0, 2) / 0.75 - 1.0);
  float c = fbm(q * 3.3 + 17.0, 2);
  return (0.12 + 2.0 * a * a * a * a + 0.8 * b * b * b * b) * (0.7 + 0.8 * c);
}

// o raio normalizado da bolha do véu, com a borda roída por ruído largo
float orBolha(vec3 q) {
  float lobo = fbm(q * 0.55 + 23.0, 3);
  return length((q - OR_BOLHA_C) * OR_BOLHA_INV) *
    (0.8 + 0.4 * lobo + 0.3 * (fbm(q * 1.3 + 7.0, 3) - 0.4375) + 0.12 * (fbm(q * 4.0 + 3.0, 2) - 0.375));
}
// quanto da luz da estrela chega: 1 dentro da bolha; fora, o pouco que
// vaza pelos rasgos da casca, sumindo com a distância — o brilho acaba
// aos poucos, nunca numa borda
float orDentro(float s, float r) {
  float vaza = 0.05 * exp(-r * 0.6);
  return mix(vaza, 1.0, 1.0 - smoothstep(${n(BOLHA.pele - 0.12)}, ${n(BOLHA.cascaDe + 0.1)}, s));
}

// o traçado da Baía Escura: distância em raios da faixa
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

// O CORPO DA NUVEM MOLECULAR, 0..~2: muito maior que a parte acesa, mais
// comprido de norte a sul como Órion A, contorno torcido por um ruído
// largo (nunca um círculo), fundo irregular de ~2–5 pc e grumos por
// dentro (forma de autor)
float orMassa(vec3 q) {
  vec2 w = vec2(fbm(q * 0.16 + vec3(3.1, 0.0, 0.0), 3), fbm(q * 0.16 + vec3(0.0, 7.7, 0.0), 3)) - 0.4375;
  vec2 e = (q.xy + 6.0 * w) * vec2(${n(1 / NUVEM.lestePc)}, ${n(1 / NUVEM.nortePc)});
  float rr = length(e) * (0.75 + 0.6 * fbm(q * 0.45 + vec3(1.1, 0.0, 0.0), 3));
  // e some antes da borda da grade grossa, para a caixa nunca aparecer
  vec2 caixa = abs(q.xy) * vec2(${n(1 / CAIXA_DO_VOLUME.max[0])}, ${n(1 / CAIXA_DO_VOLUME.max[1])});
  float lado = (1.0 - smoothstep(0.45, 1.0, rr)) * (1.0 - smoothstep(0.75, 0.95, max(caixa.x, caixa.y)));
  if (lado <= 0.0) return 0.0;
  float fundo = ${n(-NUVEM.fundoPc)} * (0.55 + 0.9 * fbm(vec3(q.xy * 0.3 + 5.0, 2.2), 3));
  float embaixo = smoothstep(fundo - 0.9, fundo + 0.9, q.z);
  float grumo = 0.3 + 1.6 * fbm(q * 0.8 + vec3(9.0, 0.0, 0.0), 4);
  return lado * lado * embaixo * grumo;
}

// A SUPERFÍCIE num ponto (x, y): (altura da frente, 1/√(1+|∇z|²), brilho
// da camada, brilho da frente fina), o brilho já pela lei fixa do objeto
// — o Q/(4πd²)·cos da estrela (espelho de brilhoDaFrente/brilhoNaTela)
vec4 orSuperficie(vec2 xy) {
  const float e = 0.015;
  float z0 = orFrenteComDobras(xy);
  float zx = (orFrenteComDobras(xy + vec2(e, 0.0)) - z0) / e;
  float zy = (orFrenteComDobras(xy + vec2(0.0, e)) - z0) / e;
  float z = z0 + orGrao(xy);
  float nf = inversesqrt(1.0 + zx * zx + zy * zy);
  vec3 sup = vec3(xy, z);
  float r = length(sup);
  float d = max(r, ${n(ESTRELA_NA_FRENTE_DA_MIF_PC)});
  // n = (−zx, −zy, 1)·nf; a luz chega de −sup
  float cosInc = (zx * xy.x + zy * xy.y - z) * nf / d;
  // a grade acaba na borda do núcleo: o brilho some antes dela
  vec2 c = (xy - ${v3(CAIXA_DO_NUCLEO.min)}.xy) * ${inv(CAIXA_DO_NUCLEO)}.xy * 2.0 - 1.0;
  float borda = 1.0 - smoothstep(0.85, 0.98, max(abs(c.x), abs(c.y)));
  // a parede da tigela é acesa até a borda: a luz que chega a ela é a
  // da cavidade inteira, mais larga que a bolha do véu (autor)
  float luz = pow(max(cosInc, ${n(PISO_DA_INCIDENCIA)}) / (d * d), ${n(GAMA_DO_BRILHO)}) *
    orDentro(orBolha(sup) * ${n(ALCANCE_DA_LUZ_NA_PAREDE)} * (0.8 + 0.45 * fbm(vec3(xy * 0.6 + 31.0, 1.0), 3)), r) * borda;
  float f = orFios(sup);
  luz *= ${parte(128)};
  return vec4(z, nf, luz * f * ${n(GANHO_DA_CAMADA)}, luz * (0.5 + 0.5 * f) * ${n(GANHO_DA_FRENTE_FINA)});
}

// O VOLUME num ponto: (emissão RGB por pc, já na lei fixa; extinção V
// por pc). A camada fina NÃO entra aqui (é da superfície).
vec4 orCampo(vec3 q) {
  vec3 em = vec3(0.0);
  float K = 0.0;
  float h = q.z - (orFrenteComDobras(q.xy) + orGrao(q.xy));
  float r = length(q);
  if (h < 0.0) {
    // 6) a nuvem molecular, opaca, com a camada comprimida logo atrás da
    //    frente mais densa (autor) — 0,03 pc abaixo, para o borrão da
    //    grade não cobrir a camada acesa
    float hh = h + 0.03;
    if (hh < 0.0) K += ${parte(64)} * ${n(KAPPA_DA_NUVEM)} * orMassa(q) * smoothstep(0.0, -0.05, hh) * (1.0 + 4.0 * exp(hh * 4.0));
  } else if (length((q - OR_BOLHA_C) * OR_BOLHA_INV) < 2.2) {
    float s = orBolha(q);
    float den = orDentro(s, r);
    float f = orFios(q);
    // 2) o gás difuso da cavidade, com a bolha de alta ionização em volta
    //    da estrela (O'Dell & Abel 2025): mais [O III] que a parede
    // o gás que evapora da parede é mais denso junto dela e rareia ao
    // se afastar (o fluxo de fotoevaporação se espalha): a cavidade é
    // quase transparente, as paredes brilham — escala de autor
    float junto = exp(-h / (0.2 + 0.25 * r));
    float fluxoV = pow(1.0 / (r * r + 0.03), ${n(GAMA_DO_BRILHO)});
    em += ${parte(1)} * (orCorDaFrente(r, 1.6) - 0.5 * ${n(HALFA_POR_HBETA)} * OR_COR_HALFA) * (fluxoV * den * (0.25 + 0.75 * junto) * (0.4 + 0.6 * f) * ${n(GANHO_DO_DIFUSO)});
    // 3) a face de dentro da bolha, acesa: a Nebulosa Estendida — só as
    //    PAREDES, onde ela encosta na nuvem; a tampa (o véu) acende de leve
    float fluxoB = pow(1.0 / max(r * r, 0.04), ${n(GAMA_DO_BRILHO)});
    vec3 gB = (q - OR_BOLHA_C) * OR_BOLHA_INV * OR_BOLHA_INV;
    float parede = 1.0 - 0.3 * smoothstep(0.35, 0.8, abs(gB.z) / max(length(gB), 1e-4));
    float xp = (s - ${n(BOLHA.pele)}) * ${n(1 / BOLHA.meiaLarguraDaPele)};
    em += ${parte(2)} * orCorDaFrente(r, 1.0) * (fluxoB * exp(-xp * xp) * parede * f * ${n(GANHO_DA_ESTENDIDA)});
    // 3b) o gás ralo que enche a bolha: baixa ionização (autor)
    em += ${parte(4)} * orCorDaFrente(r, 0.3) * (fluxoB * den * junto * (0.3 + 0.7 * f) * ${n(GANHO_DO_INTERIOR)});
    // 4) o véu: a tampa da casca, poeira neutra que absorve e espalha a
    //    luz da estrela; concentrado na tampa da frente, ralo nos lados
    float casca = smoothstep(${n(BOLHA.cascaDe - 0.02)}, ${n(BOLHA.cascaDe + 0.06)}, s) * (1.0 - smoothstep(0.93, 1.03, s));
    if (casca > 0.0) {
      float tampa = smoothstep(-0.1, 0.5, (q.z - OR_BOLHA_C.z) * OR_BOLHA_INV.z / max(s, 0.1));
      float grumo = 0.1 + 1.1 * smoothstep(0.2, 0.62, fbm(q * 1.6 + 5.0, 3));
      float baia = 1.0 - smoothstep(0.45, 1.3, orBaia(q.xy) + 1.4 * (fbm(q * 4.0 + 2.0, 3) - 0.4375));
      // faixas largas de poeira na tampa: recortam o brilho de fora
      // (traçado inventado)
      float faixa = smoothstep(0.5, 0.85, 1.0 - abs(2.0 * fbm(q * 0.75 + 11.0, 3) / 0.875 - 1.0)) *
        smoothstep(0.4, 1.1, length(q.xy));
      float longeDeM43 = smoothstep(0.8, 1.3, length(q.xy - vec2(${n(M43.x)}, ${n(M43.y)})) * ${n(1 / M43.raio)});
      float rho = casca * longeDeM43 * (tampa * (grumo + 2.5 * faixa) + 3.0 * baia);
      K += ${parte(16)} * rho * ${n(KAPPA_DO_VEU)};
      // espalhada: Henyey–Greenstein g = 0,6 para quem olha do lado do
      // Sol (+z), meio a meio com a isotrópica — o assado é um só para
      // toda direção de olhar (aproximação)
      float cosE = q.z / max(r, 1e-3);
      float hg = 0.64 / pow(1.36 - 1.2 * cosE, 1.5);
      em += ${parte(8)} * OR_COR_ESPALHADA * (rho * ${n(KAPPA_DO_VEU)} * (0.5 + 0.5 * hg) * fluxoB * ${n(GANHO_DO_ESPALHADO)});
    }
  }
  // 5) M43: a bolha ionizada de NU Ori, só Hα/[N II], na face da nuvem
  vec3 c43 = q - vec3(${n(M43.x)}, ${n(M43.y)}, ${n(M43.z)});
  float r43 = dot(c43, c43) * ${n(1 / (M43.raio * M43.raio))};
  if (r43 < 1.0 && h > -0.02) {
    float m43 = (1.0 - smoothstep(0.35, 1.0, r43)) * pow(1.0 / (dot(c43, c43) + 0.004), ${n(GAMA_DO_BRILHO)}) *
      (0.1 + 0.9 * smoothstep(0.3, 0.7, fbm(q * 5.0 + 41.0, 3))) * orFios(q);
    em += ${parte(32)} * orCorDaFrente(1.2, 0.0) * (m43 * ${n(GANHO_DE_M43)});
  }
  return vec4(max(em, vec3(0.0)), K);
}
`;

/** o vértice do assado: um quadrado que cobre o alvo */
export const ORION_ASSADO_VERT = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/** o fragment do assado de uma grade 3-D: uma fatia por desenho */
export const orionAssadoFrag = (c: CaixaDeOrion, noise: string) => /* glsl */ `
precision highp float;
uniform float uFatia;
${noise}
${GLSL_CORES}
${GLSL_ORION_MODELO}
void main() {
  vec3 u = vec3(gl_FragCoord.xy, uFatia + 0.5) / vec3(${c.dims.map((d) => n(d)).join(', ')});
  gl_FragColor = orCampo(${v3(c.min)} + u * ${v3(c.max.map((m, e) => m - c.min[e]))});
}
`;

/** o fragment do assado da superfície */
export const orionSuperficieFrag = (noise: string) => /* glsl */ `
precision highp float;
${noise}
${GLSL_CORES}
${GLSL_ORION_MODELO}
void main() {
  vec2 u = gl_FragCoord.xy / vec2(${GRADE_DA_SUPERFICIE.map((d) => n(d)).join(', ')});
  vec3 mn = ${v3(CAIXA_DO_NUCLEO.min)};
  vec3 mx = ${v3(CAIXA_DO_NUCLEO.max)};
  gl_FragColor = orSuperficie(mn.xy + u * (mx.xy - mn.xy));
}
`;

/**
 * O TRECHO GLSL comum: o referencial, a caixa e a coluna de extinção
 * pela nuvem e pelo véu (para as estrelas), lida da grade grossa.
 */
export const GLSL_ORION_BASE = /* glsl */ `
const bool OR_LIGADO = ${ORION_LIGADA ? 'true' : 'false'};
const vec3 OR_C = ${v3(CENTRO_DE_ORION)};
const vec3 OR_E = ${v3(REFERENCIAL_DE_ORION.leste)};
const vec3 OR_N = ${v3(REFERENCIAL_DE_ORION.norte)};
const vec3 OR_W = ${v3(REFERENCIAL_DE_ORION.rumoAoSol)};
const vec3 OR_V_MIN = ${v3(CAIXA_DO_VOLUME.min)};
const vec3 OR_V_MAX = ${v3(CAIXA_DO_VOLUME.max)};
const vec3 OR_V_INV = ${inv(CAIXA_DO_VOLUME)};
uniform highp sampler3D uOrVolume;
uniform float uOrPronta;

vec3 orLocal(vec3 p) { vec3 q = p - OR_C; return vec3(dot(q, OR_E), dot(q, OR_N), dot(q, OR_W)); }
vec3 orDir(vec3 v) { return vec3(dot(v, OR_E), dot(v, OR_N), dot(v, OR_W)); }

// o trecho [t0, t1] do raio (local, d unitário) dentro de uma caixa; t1 <= t0 = fora
vec2 orCaixa(vec3 o, vec3 d, vec3 mn, vec3 mx) {
  vec3 sd = vec3(d.x < 0.0 ? -1.0 : 1.0, d.y < 0.0 ? -1.0 : 1.0, d.z < 0.0 ? -1.0 : 1.0);
  vec3 iv = sd / max(abs(d), vec3(1e-7));
  vec3 a = (mn - o) * iv;
  vec3 b = (mx - o) * iv;
  vec3 lo = min(a, b);
  vec3 hi = max(a, b);
  return vec2(max(max(lo.x, lo.y), max(lo.z, 0.0)), min(min(hi.x, hi.y), hi.z));
}

// a profundidade óptica (V) pela nuvem e pelo véu no segmento a→b (cena)
float orColunaDaNuvem(vec3 a, vec3 b) {
  vec3 o = orLocal(a);
  vec3 dv = orDir(b - a);
  float len = length(dv);
  if (len < 1e-6) return 0.0;
  vec3 d = dv / len;
  vec2 iv = orCaixa(o, d, OR_V_MIN, OR_V_MAX);
  float t1 = min(iv.y, len);
  if (t1 <= iv.x) return 0.0;
  float dt = (t1 - iv.x) / 8.0;
  float tau = 0.0;
  for (int i = 0; i < 8; i++) {
    vec3 q = o + d * (iv.x + (float(i) + 0.5) * dt);
    tau += textureLod(uOrVolume, (q - OR_V_MIN) * OR_V_INV, 0.0).a;
  }
  return tau * dt;
}
`;

/**
 * A MARCHA NO RAYMARCH DA CASA. Devolve (rgb emitido, transmissão) no
 * trecho do raio dentro da caixa grossa: passos largos na grade grossa,
 * mais curtos na fina, e a camada ionizada integrada EXATA entre dois
 * passos (perfil exponencial na altura sobre a frente lida da
 * superfície) — a camada não some nem bandeia por o passo ser largo.
 */
export const GLSL_ORION_MARCHA = /* glsl */ `
uniform sampler2D uOrSup;
uniform highp sampler3D uOrNucleo;
uniform float uOrNaVista;
const vec3 OR_N_MIN = ${v3(CAIXA_DO_NUCLEO.min)};
const vec3 OR_N_MAX = ${v3(CAIXA_DO_NUCLEO.max)};
const vec3 OR_N_INV = ${inv(CAIXA_DO_NUCLEO)};
${GLSL_CORES}

// ∫ g(h)/H ao longo de um passo com h linear de h0 a h1, g = e^(−h/H)
// acima da frente (a camada) e e^(h/0,01) abaixo dela; a coluna
// perpendicular vale 1
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

// a altura sobre a frente num ponto do núcleo, e a superfície lida
float orAltura(vec3 q, out vec4 s) {
  s = textureLod(uOrSup, (q.xy - OR_N_MIN.xy) * OR_N_INV.xy, 0.0);
  return (q.z - s.x) * s.y;
}

// um trecho do raio [ta, tb] numa das grades, em passos de ~dtAlvo
void orTrecho(vec3 o, vec3 d, float ta, float tb, float dtAlvo, float jitter, bool nucleo,
              inout vec3 acc, inout float T) {
  float len = tb - ta;
  if (len <= 0.0 || T < 0.01) return;
  int passos = int(min(ceil(len / dtAlvo), 96.0));
  float dt = len / float(passos);
  vec4 s;
  float hPrev = nucleo ? orAltura(o + d * ta, s) : 0.0;
  for (int i = 0; i < 96; i++) {
    if (i >= passos || T < 0.01) break;
    vec3 q = o + d * (ta + (float(i) + jitter) * dt);
    vec4 v;
    if (nucleo) {
      v = textureLod(uOrNucleo, (q - OR_N_MIN) * OR_N_INV, 0.0);
      // 1) a camada ionizada sobre a frente e a frente fina, exatas
      float h = orAltura(q, s);
      float dS = max(length(vec3(q.xy, s.x)), ${n(ESTRELA_NA_FRENTE_DA_MIF_PC)});
      float H = ${n(CAMADA_IONIZADA.pertoPc)} * (1.0 + ${n(CAMADA_IONIZADA.crescePorPc)} * max(dS - 0.25, 0.0));
      float dtc = i == 0 ? dt * jitter : dt;
      acc += T * (orCorDaFrente(dS, 0.5) * (orPele(hPrev, h, dtc, H) * s.z) +
                  OR_COR_FINA * (orPele(hPrev, h, dtc, ${n(FRENTE_FINA_PC)}) * s.w));
      hPrev = h;
    } else {
      v = textureLod(uOrVolume, (q - OR_V_MIN) * OR_V_INV, 0.0);
    }
    // 2–6) o volume: emissão com a absorção do próprio passo
    float tau = v.a * dt;
    float k = tau > 1e-3 ? (1.0 - exp(-tau)) / tau : 1.0;
    acc += T * v.rgb * (dt * k);
    T *= exp(-tau);
  }
}

vec4 orMarcha(vec3 roCena, vec3 rdCena, float jitter, int passos) {
  vec3 acc = vec3(0.0);
  float T = 1.0;
  if (!OR_LIGADO || uOrPronta < 0.5) return vec4(acc, T);
  vec3 o = orLocal(roCena);
  // fora de 3 kpc o objeto é menor que um pixel do alvo de meia resolução
  if (dot(o, o) > 9.0e6) return vec4(acc, T);
  vec3 d = orDir(rdCena);
  vec2 iv = orCaixa(o, d, OR_V_MIN, OR_V_MAX);
  if (iv.y <= iv.x) return vec4(acc, T);
  vec2 ivN = orCaixa(o, d, OR_N_MIN, OR_N_MAX);
  float dtV = max((iv.y - iv.x) / float(passos / 2), ${n(PASSO_MINIMO_PC.volume)});
  if (ivN.y <= ivN.x) {
    orTrecho(o, d, iv.x, iv.y, dtV, jitter, false, acc, T);
    return vec4(acc, T);
  }
  float dtN = max((ivN.y - ivN.x) / float(passos), ${n(PASSO_MINIMO_PC.nucleo)});
  orTrecho(o, d, iv.x, ivN.x, dtV, jitter, false, acc, T);
  orTrecho(o, d, ivN.x, ivN.y, dtN, jitter, true, acc, T);
  orTrecho(o, d, ivN.y, iv.y, dtV, jitter, false, acc, T);
  return vec4(acc, T);
}
`;
