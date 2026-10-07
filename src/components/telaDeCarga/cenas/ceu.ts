// Tela de carga "O céu se acende". O céu de inverno do sul visto de um deserto
// alto (Paranal, latitude -24,6°): cordilheira em silhueta embaixo,
// luminescência do ar sobre ela, estrelas reais e de campo acendendo uma a uma
// conforme a carga anda, a Via Láctea subindo do horizonte no meio da carga,
// constelações que se desenham e somem; no fim a vista sobe para a faixa e o
// céu esquenta num clarão dourado de aurora, pronto para virar a abertura (o
// Sol).
//
// Tudo é procedural e determinístico: o mapa da Via Láctea (em coordenadas
// galácticas) é assado uma vez na GPU ao montar; cada quadro é função de
// (t, suave, fim). Projeção estereográfica (conforme: as constelações mantêm
// a forma); a esfera celeste gira de verdade em torno do polo sul.
//
// O TEXTO NÃO É DESTA CENA (cena.ts), com uma exceção: os nomes das
// constelações. O protótipo punha o texto por cima, e o hospedeiro o refaz em
// HTML assim.
//
// 1) O BLOCO DE TEXTO. Três linhas empilhadas, na ordem: título "Mar de
//    Estrelas" (h1: Fraunces 300, 0,01 em, #f3eee4, linha 1,02, sem quebra,
//    sombra 0 0 28px rgba(2,3,8,.9) e 0 0 3px rgba(2,3,8,.7)); a frase da
//    etapa, 4 px abaixo do vão (Inter 0,8125 rem = 13 px, 0,02 em, #b9b2a6,
//    sombra 0 0 10px rgba(2,3,8,.9); quando a frase troca, as duas ficam
//    empilhadas na mesma célula e fundem a opacidade em 0,9 s); e o contador
//    (item 2). PAISAGEM (largura/altura ≥ 0,85): o bloco no canto de baixo à
//    direita, alinhado à direita, a 6vw da borda direita e a max(5,5vh, 26
//    px) da base; vão de 10 px entre as linhas; título de clamp(44 px,
//    5,4vw, 92 px). RETRATO (largura/altura < 0,85): o bloco centrado na
//    largura toda (esquerda 0, direita 0), a calc(4,2vh + área segura de
//    baixo) da base; vão de 8 px; título de clamp(34 px, 10,6vw, 52 px).
//    Opacidade (sem entrada, já nasce em 1): título 1 − smoothstep(0,62;
//    0,95; fim); frase e contador 1 − smoothstep(0; 0,35; fim). Nada recebe
//    toque (pointer-events: none).
//
// 2) O CONTADOR, a terceira linha do bloco: "133.514 de 328.749 estrelas".
//    n = round(328749 × suave^1,3), com suave limitado a 0..1; texto =
//    milhar(n) + " de " + milhar(328749) + " estrelas", milhar = ponto a cada
//    três dígitos (pt-BR; na outra língua, o separador dela). Estilo "miúdo"
//    do app: Inter 0,6875 rem = 11 px, 0,14 em, CAIXA-ALTA por CSS (o texto
//    fica em minúsculas), #85807a, números tabulares, sombra 0 0 10px
//    rgba(2,3,8,.9). Mesma opacidade da frase da etapa.
//
// 3) OS NOMES DAS CONSTELAÇÕES são desenhados AQUI, no quadro, a partir de
//    `recursos.rotulos`, com os ids 'cruzeiro' (Cruzeiro do Sul), 'escorpiao'
//    (Escorpião) e 'sagitario' (Sagitário). O hospedeiro rasteriza cada um na
//    thread principal, na língua de agora, em px do dispositivo (o mesmo `dpr`
//    de `redimensionar`), assim:
//      texto: o nome, em caixa-baixa como está escrito; fonte Fraunces itálico
//      300, 15 px (13 px no retrato, largura/altura < 0,85: ao cruzar esse
//      limite o hospedeiro rasteriza de novo), espaçamento 0,02 em (também
//      depois da última letra), linha normal da fonte, cor rgba(226,184,114,
//      .92), sombra por baixo 0 0 8px rgba(2,3,8,.95) (alfa da sombra
//      independente do alfa do texto; no canvas 2D o desfoque não acompanha a
//      escala, então shadowBlur = 8 × dpr).
//      bitmap: PREMULTIPLICADO (createImageBitmap de um canvas 2D, com
//      premultiplyAlpha: 'premultiply'). A caixa do texto mede (soma dos
//      avanços com o espaçamento) × (altura da linha normal); em volta dela
//      vai uma folga de FOLGA_ROTULO = 12 px de CSS, onde cabe o desfoque.
//      `largura` e `altura` (CSS) são as do bitmap inteiro, folga incluída
//      (caixa + 2 × 12). O bitmap tem (ceil(caixa.largura × dpr) + 2 × f) ×
//      (ceil(caixa.altura × dpr) + 2 × f) px, com f = round(12 × dpr), e o
//      canto de cima à esquerda da caixa do texto em (f, f) px do aparelho
//      (translate(f, f) e scale(dpr, dpr) antes de pintar).
//    A cena põe o nome ao lado da figura (a esquerda do Escorpião e a direita
//    do Sagitário na paisagem; embaixo do Cruzeiro, e de todos no retrato, ou
//    em cima quando não há espaço), no pixel inteiro mais próximo, com a
//    opacidade e o sumiço do protótipo; ele acompanha o céu que gira, nasce
//    com o desenho da figura e some com ela. Sem o bitmap, a cena segue sem o
//    nome.
import type { Cena, DefinicaoDaCena, EstadoDaCena, RecursosDaCena, RotuloPronto } from '../cena';

type Vec3 = [number, number, number];
/** matriz 3×3 em linhas (9 números) */
type Mat3 = number[];
type Uniformes = Record<string, WebGLUniformLocation | null>;
interface Programa {
  p: WebGLProgram;
  u: Uniformes;
}

const D = Math.PI / 180;
const LAT = -24.6;
/** folga de CSS em volta da caixa do texto de cada nome, para a sombra (ver o item 3 acima) */
const FOLGA_ROTULO = 12;

const ATRIBUTOS: WebGLContextAttributes = {
  alpha: false,
  antialias: false,
  depth: true,
  stencil: false,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance',
};

// ------------------------------------------------------------------
// Catálogo: nome, AR (h), Dec (°), magnitude V, índice B-V (J2000)
// ------------------------------------------------------------------
const ESTRELAS: [string, number, number, number, number][] = [
  // Escorpião
  ['Acrab', 16.0906, -19.806, 2.62, -0.07],
  ['Jabbah', 16.2001, -19.461, 4.0, 0.04],
  ['Dschubba', 16.0056, -22.622, 2.29, -0.12],
  ['Fang', 15.9809, -26.114, 2.89, -0.19],
  ['rhoSco', 15.9486, -29.214, 3.88, -0.2],
  ['Alniyat', 16.3531, -25.593, 2.89, 0.13],
  ['Antares', 16.4901, -26.432, 0.96, 1.83],
  ['Paikauhale', 16.598, -28.216, 2.82, -0.25],
  ['Larawag', 16.8361, -34.293, 2.29, 1.15],
  ['muSco', 16.8645, -38.047, 3.08, -0.2],
  ['zetaSco', 16.9097, -42.362, 3.62, 1.37],
  ['etaSco', 17.2025, -43.239, 3.33, 0.41],
  ['Sargas', 17.622, -42.998, 1.86, 0.4],
  ['iotaSco', 17.7931, -40.127, 2.99, 0.51],
  ['kappaSco', 17.7081, -39.03, 2.39, -0.22],
  ['Shaula', 17.5601, -37.104, 1.62, -0.22],
  ['Lesath', 17.5127, -37.296, 2.7, -0.22],
  // Sagitário (o Bule)
  ['Alnasl', 18.0968, -30.424, 2.98, 1.0],
  ['KausMedia', 18.3499, -29.828, 2.7, 1.38],
  ['KausAustralis', 18.4029, -34.385, 1.85, -0.03],
  ['KausBorealis', 18.4662, -25.422, 2.81, 1.04],
  ['phiSgr', 18.7609, -26.991, 3.17, -0.11],
  ['Nunki', 18.9211, -26.297, 2.05, -0.13],
  ['tauSgr', 19.1157, -27.67, 3.32, 1.19],
  ['Ascella', 19.0435, -29.88, 2.6, 0.08],
  ['etaSgr', 18.2938, -36.761, 3.11, 1.56],
  // Cruzeiro do Sul e as guardas
  ['Acrux', 12.4433, -63.099, 0.77, -0.24],
  ['Mimosa', 12.7953, -59.689, 1.25, -0.23],
  ['Gacrux', 12.5194, -57.113, 1.59, 1.6],
  ['Imai', 12.2524, -58.749, 2.79, -0.23],
  ['Ginan', 12.3561, -60.401, 3.59, 1.42],
  ['RigilKent', 14.66, -60.835, -0.27, 0.71],
  ['Hadar', 14.0637, -60.373, 0.61, -0.23],
  // vizinhança brilhante
  ['Menkent', 14.1114, -36.37, 2.06, 1.01],
  ['gamCen', 12.6918, -48.96, 2.17, -0.01],
  ['epsCen', 13.6648, -53.466, 2.3, -0.17],
  ['etaCen', 14.5918, -42.158, 2.31, -0.16],
  ['zetCen', 13.9256, -47.288, 2.55, -0.18],
  ['delCen', 12.1392, -50.722, 2.6, -0.12],
  ['iotCen', 13.3433, -36.712, 2.75, 0.04],
  ['alfLup', 14.6988, -47.388, 2.3, -0.15],
  ['betLup', 14.9755, -43.134, 2.68, -0.18],
  ['gamLup', 15.5858, -41.167, 2.78, -0.2],
  ['delLup', 15.3563, -40.648, 3.22, -0.22],
  ['Atria', 16.8111, -69.028, 1.91, 1.45],
  ['betTrA', 15.9191, -63.43, 2.85, 0.32],
  ['gamTrA', 15.3152, -68.68, 2.89, 0.0],
  ['alfCir', 14.7084, -64.975, 3.19, 0.24],
  ['Peacock', 20.4275, -56.735, 1.94, -0.12],
  ['alfAra', 17.5307, -49.876, 2.84, -0.17],
  ['betAra', 17.4217, -55.53, 2.85, 1.46],
  ['gamAra', 17.4232, -56.378, 3.31, -0.13],
  ['zetAra', 16.977, -55.99, 3.13, 1.6],
  ['alfMus', 12.6197, -69.136, 2.69, -0.2],
  ['betMus', 12.7711, -68.108, 3.04, -0.18],
  ['Canopus', 6.3992, -52.696, -0.74, 0.15],
  ['Miaplacidus', 9.22, -69.717, 1.68, 0.07],
  ['Avior', 8.3752, -59.51, 1.86, 1.28],
  ['Aspidiske', 9.2848, -59.275, 2.21, 0.18],
  ['theCar', 10.7159, -64.394, 2.76, -0.22],
  ['upsCar', 9.7853, -65.072, 2.97, 0.27],
  ['Regor', 8.159, -47.337, 1.83, -0.22],
  ['Alsephina', 8.745, -54.709, 1.96, 0.04],
  ['Suhail', 9.1333, -43.433, 2.21, 1.66],
  ['Markeb', 9.3686, -55.011, 2.47, -0.18],
  ['muVel', 10.7795, -49.42, 2.69, 0.9],
  ['Spica', 13.4199, -11.161, 0.97, -0.23],
  ['Sabik', 17.173, -15.725, 2.43, 0.06],
  ['zetOph', 16.6193, -10.567, 2.54, 0.02],
  ['theOph', 17.3664, -24.999, 3.27, -0.19],
  ['delOph', 16.2391, -3.694, 2.73, 1.58],
  ['Rasalhague', 17.5822, 12.56, 2.08, 0.15],
  ['Altair', 19.8464, 8.868, 0.76, 0.22],
  ['Fomalhaut', 22.9608, -29.622, 1.16, 0.09],
  ['Alnair', 22.1372, -46.961, 1.74, -0.13],
  ['alfTuc', 22.3083, -60.26, 2.86, 1.39],
  ['alfInd', 20.6261, -47.291, 3.11, 1.0],
  ['Achernar', 1.6286, -57.237, 0.46, -0.16],
  ['Zubenelgenubi', 14.848, -16.042, 2.75, 0.15],
  ['Zubeneschamali', 15.2834, -9.383, 2.61, -0.11],
  ['Arcturus', 14.261, 19.182, -0.05, 1.23],
  ['Vega', 18.6156, 38.784, 0.03, 0.0],
  ['Sirius', 6.7525, -16.716, -1.46, 0.0],
];

interface Figura {
  /** id do nome em `recursos.rotulos`; null quando a figura não leva nome */
  rotulo: string | null;
  /** janela em "suave": começa a desenhar, termina, começa a sumir, sumiu */
  janela: [number, number, number, number];
  segs: [string, string][];
}

const FIGURAS: Figura[] = [
  {
    rotulo: 'cruzeiro',
    janela: [0.3, 0.38, 0.5, 0.6],
    segs: [
      ['Gacrux', 'Acrux'],
      ['Imai', 'Mimosa'],
    ],
  },
  {
    rotulo: null,
    janela: [0.34, 0.41, 0.5, 0.6],
    segs: [['RigilKent', 'Hadar']],
  },
  {
    rotulo: 'escorpiao',
    janela: [0.42, 0.56, 0.64, 0.74],
    segs: [
      ['Acrab', 'Dschubba'],
      ['Jabbah', 'Acrab'],
      ['Dschubba', 'Fang'],
      ['Fang', 'rhoSco'],
      ['Dschubba', 'Alniyat'],
      ['Alniyat', 'Antares'],
      ['Antares', 'Paikauhale'],
      ['Paikauhale', 'Larawag'],
      ['Larawag', 'muSco'],
      ['muSco', 'zetaSco'],
      ['zetaSco', 'etaSco'],
      ['etaSco', 'Sargas'],
      ['Sargas', 'iotaSco'],
      ['iotaSco', 'kappaSco'],
      ['kappaSco', 'Shaula'],
      ['Shaula', 'Lesath'],
    ],
  },
  {
    rotulo: 'sagitario',
    janela: [0.56, 0.68, 0.76, 0.86],
    segs: [
      ['Alnasl', 'KausMedia'],
      ['Alnasl', 'KausAustralis'],
      ['KausMedia', 'KausAustralis'],
      ['KausMedia', 'KausBorealis'],
      ['KausBorealis', 'phiSgr'],
      ['KausMedia', 'phiSgr'],
      ['KausAustralis', 'Ascella'],
      ['Ascella', 'phiSgr'],
      ['phiSgr', 'Nunki'],
      ['Nunki', 'tauSgr'],
      ['tauSgr', 'Ascella'],
    ],
  },
];

/** de que lado da figura o nome fica ('' = a figura não tem nome) */
type Lado = 'baixo' | '' | 'esq' | 'dir';

interface Layout {
  lst: number;
  az: number;
  alt: number;
  /** fração da altura, de baixo */
  horizonte: number;
  escala: (w: number, h: number) => number;
  /** altura máx. das serras, fração da altura da tela */
  serra: number;
  freqSerra: number;
  /** azimute da cúpula do observatório (° a partir do norte) */
  cupula: number;
  vulcao: [number, number];
  /** um lado por figura, na ordem de FIGURAS */
  rotulos: Lado[];
  fimAz: number;
  fimAlt: number;
  fimZoom: number;
}

// Composições: paisagem (arco diagonal do bojo ao Cruzeiro) e retrato
// (a faixa sobe quase na vertical do horizonte ao zênite).
const LAYOUTS: { paisagem: Layout; retrato: Layout } = {
  paisagem: {
    lst: 13.0,
    az: 140,
    alt: 0,
    horizonte: 0.044,
    escala: (w, h) => Math.min(w / 2.18, h / 1.36),
    serra: 0.135,
    freqSerra: 1.0,
    cupula: 127,
    vulcao: [101, 20],
    rotulos: ['baixo', '', 'esq', 'dir'],
    fimAz: 121,
    fimAlt: 46,
    fimZoom: 1.45,
  },
  retrato: {
    lst: 17.4,
    az: 205,
    alt: 40,
    horizonte: 0.055,
    escala: (w, h) => Math.min(w / 1.03, h / 2.22),
    serra: 0.105,
    freqSerra: 1.6,
    cupula: 214,
    vulcao: [189, 22],
    rotulos: ['baixo', '', 'baixo', 'baixo'],
    fimAz: 200,
    fimAlt: 68,
    fimZoom: 1.25,
  },
};

// ------------------------------------------------------------------
// utilidades
// ------------------------------------------------------------------
function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));
const sstep = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
function eqVec(raH: number, decD: number): Vec3 {
  const ra = raH * 15 * D;
  const de = decD * D;
  return [Math.cos(de) * Math.cos(ra), Math.cos(de) * Math.sin(ra), Math.sin(de)];
}
// equatorial -> galáctico (J2000), linhas
const G: [Vec3, Vec3, Vec3] = [
  [-0.0548755604, -0.8734370902, -0.4838350155],
  [0.4941094279, -0.44482963, 0.7469822445],
  [-0.867666149, -0.1980763734, 0.4559837762],
];
function galParaEq(g: Vec3): Vec3 {
  return [
    G[0][0] * g[0] + G[1][0] * g[1] + G[2][0] * g[2],
    G[0][1] * g[0] + G[1][1] * g[1] + G[2][1] * g[2],
    G[0][2] * g[0] + G[1][2] * g[1] + G[2][2] * g[2],
  ];
}
// matriz 3x3 em linhas (array de 9)
function mul3(a: Mat3, b: Mat3): Mat3 {
  const r = new Array<number>(9);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return r;
}
const transp = (m: Mat3): Mat3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
function eqParaEnu(lstH: number): Mat3 {
  const L = lstH * 15 * D;
  const p = LAT * D;
  const cL = Math.cos(L);
  const sL = Math.sin(L);
  const cp = Math.cos(p);
  const sp = Math.sin(p);
  return [-sL, cL, 0, -sp * cL, -sp * sL, cp, cp * cL, cp * sL, sp];
}
function baseCamera(azD: number, altD: number): Mat3 {
  const az = azD * D;
  const al = altD * D;
  const f = [Math.cos(al) * Math.sin(az), Math.cos(al) * Math.cos(az), Math.sin(al)];
  const r = [Math.cos(az), -Math.sin(az), 0];
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  return [r[0], r[1], r[2], u[0], u[1], u[2], f[0], f[1], f[2]]; // ENU -> câmera
}
const MAT_G: Mat3 = [...G[0], ...G[1], ...G[2]];
// cor de estrela pelo índice B-V
const TAB_BV: [number, number, number, number][] = [
  [-0.4, 0.62, 0.71, 1.0],
  [-0.2, 0.71, 0.79, 1.0],
  [0.0, 0.84, 0.88, 1.0],
  [0.3, 0.97, 0.96, 1.0],
  [0.6, 1.0, 0.93, 0.84],
  [0.9, 1.0, 0.86, 0.71],
  [1.2, 1.0, 0.79, 0.59],
  [1.5, 1.0, 0.71, 0.47],
  [1.9, 1.0, 0.6, 0.36],
];
function corBV(bvCru: number): Vec3 {
  const bv = clamp(bvCru, -0.4, 1.9);
  for (let i = 1; i < TAB_BV.length; i++) {
    if (bv <= TAB_BV[i][0]) {
      const a = TAB_BV[i - 1];
      const b = TAB_BV[i];
      const t = (bv - a[0]) / (b[0] - a[0]);
      return [mix(a[1], b[1], t), mix(a[2], b[2], t), mix(a[3], b[3], t)];
    }
  }
  const u = TAB_BV[TAB_BV.length - 1];
  return [u[1], u[2], u[3]];
}
// serras: cristas por ruído 1D (calculadas em JS uma vez por composição)
function h1(i: number): number {
  let u = (i + 65536) >>> 0;
  u = (Math.imul(u, 747796405) + 2891336453) >>> 0;
  u = Math.imul(((u >>> ((u >>> 28) + 4)) ^ u) >>> 0, 277803737) >>> 0;
  u = ((u >>> 22) ^ u) >>> 0;
  return u / 4294967295;
}
function vn1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = h1(i);
  return a + (h1(i + 1) - a) * u;
}
function crista(x: number, sem: number): number {
  let s = 0;
  let a = 0.5;
  let fr = 1;
  for (let i = 0; i < 6; i++) {
    let n = vn1(x * fr + sem * 17.31);
    n = 1 - Math.abs(2 * n - 1);
    s += a * n * n;
    fr *= 2.13;
    a *= 0.47;
  }
  return s;
}
const N_SERRA = 8192;
function alturasSerras(H: number, freq: number, vAz: number, vLarg: number): Float32Array {
  const out = new Float32Array(N_SERRA * 4);
  for (let j = 0; j < N_SERRA; j++) {
    const az = -Math.PI + (2 * Math.PI * j) / N_SERRA;
    const x = az * freq;
    let longe = H * (0.42 + 0.62 * crista(x * 1.25, 1));
    let dv = Math.abs(az - vAz);
    dv = Math.min(dv, 2 * Math.PI - dv) / vLarg;
    longe = Math.max(longe, H * Math.min(1.02 * Math.pow(Math.max(1 - dv, 0), 1.35), 0.97));
    out[j * 4] = longe;
    out[j * 4 + 1] = H * (0.2 + 0.55 * crista(x * 2.0, 2));
    out[j * 4 + 2] = H * 0.4 * crista(x * 3.3, 3);
  }
  return out;
}

// ------------------------------------------------------------------
// GLSL
// ------------------------------------------------------------------
const RUIDO = `
uvec3 pcg3(uvec3 v){
  v = v*1664525u + 1013904223u;
  v.x += v.y*v.z; v.y += v.z*v.x; v.z += v.x*v.y;
  v ^= v >> 16u;
  v.x += v.y*v.z; v.y += v.z*v.x; v.z += v.x*v.y;
  return v;
}
vec3 grad3(vec3 i){
  uvec3 u = pcg3(uvec3(ivec3(i) + 32768));
  return vec3(u) * (2.0/4294967295.0) - 1.0;
}
float gn(vec3 p){
  vec3 i = floor(p); vec3 f = p - i;
  vec3 u = f*f*f*(f*(f*6.0-15.0)+10.0);
  float a = dot(grad3(i), f);
  float b = dot(grad3(i+vec3(1,0,0)), f-vec3(1,0,0));
  float c = dot(grad3(i+vec3(0,1,0)), f-vec3(0,1,0));
  float d = dot(grad3(i+vec3(1,1,0)), f-vec3(1,1,0));
  float e = dot(grad3(i+vec3(0,0,1)), f-vec3(0,0,1));
  float g = dot(grad3(i+vec3(1,0,1)), f-vec3(1,0,1));
  float h = dot(grad3(i+vec3(0,1,1)), f-vec3(0,1,1));
  float k = dot(grad3(i+vec3(1,1,1)), f-vec3(1,1,1));
  return mix(mix(mix(a,b,u.x), mix(c,d,u.x), u.y), mix(mix(e,g,u.x), mix(h,k,u.x), u.y), u.z);
}
`;

// ruído barato por quadro: valor suavizado lido de uma textura 3D 64³
const RUIDO_TEX = `
uniform highp sampler3D uRuido;
float vr(vec3 p){
  vec3 i = floor(p); vec3 f = p - i;
  f = f*f*(3.0 - 2.0*f);
  return (texture(uRuido, (i + f + 0.5)*(1.0/64.0)).r*2.0 - 1.0)*0.6;
}
`;

const VS_TELA = `#version 300 es
layout(location = 0) in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// Mapa da Via Láctea em (l, b): RGB = luz antes da poeira, A = poeira.
const FS_ASSAR = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uTam;
uniform vec3 uFaixa;
out vec4 cor;
${RUIDO}
float sq(float x){ return x*x; }
float blob(vec2 p, vec2 c, vec2 s){ vec2 d = (p - c)/s; return exp(-dot(d,d)); }
float seg(vec2 p, vec2 a, vec2 b, float w){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
  float d = length(pa - ba*h)/w;
  return exp(-d*d);
}
float fbm(vec3 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 7; i++){ s += a*gn(p); p = p*2.03 + vec3(3.1,1.7,5.3); a *= 0.5; }
  return s;
}
float rfbm(vec3 p){
  float s = 0.0, a = 0.55;
  for (int i = 0; i < 6; i++){ float n = 1.0 - abs(gn(p))*1.7; n = max(n, 0.0); s += a*n*n; p = p*2.11 + vec3(1.3,7.1,2.9); a *= 0.5; }
  return s;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uTam;
  float l = mix(uFaixa.x, uFaixa.y, uv.x);
  float b = mix(-uFaixa.z, uFaixa.z, uv.y);
  vec3 p = vec3(cos(b)*cos(l), cos(b)*sin(l), sin(b));
  float L = degrees(l), B = degrees(b);
  vec2 P = vec2(L, B);
  vec3 w = vec3(gn(p*3.0 + vec3(1.3,0.0,0.0)), gn(p*3.0 + vec3(0.0,7.1,0.0)), gn(p*3.0 + vec3(0.0,0.0,4.7)));
  vec3 q = p + 0.06*w;
  vec3 qa = vec3(q.x, q.y, q.z*2.3);          // alongado ao longo do plano
  vec2 Pw = P + vec2(gn(q*8.0 + 2.0), gn(q*8.0 + 8.0))*2.2 + vec2(gn(q*21.0 + 1.0), gn(q*21.0 + 6.0))*0.7;

  // disco: brilho ao longo de l, manchado, e espessura
  float lp = 0.30 + 0.62*exp(-sq(L/30.0)) + 0.30*exp(-sq((L + 73.0)/11.0))
           + 0.18*exp(-sq((L - 27.0)/7.0)) + 0.14*exp(-sq((L + 40.0)/14.0))
           + 0.12*exp(-sq((L + 58.0)/9.0)) + 0.08*exp(-sq((L + 95.0)/18.0));
  lp *= 0.55 + 0.9*smoothstep(-0.3, 0.3, fbm(vec3(q.x, q.y, q.z*0.35)*3.2 + 5.0));
  float hh = 2.3 + 3.2*exp(-sq(L/24.0));
  float Bw = B + 1.1*gn(q*5.0) + 0.6*gn(q*15.0);
  float disco = lp * (0.84*exp(-sq(Bw/hh)) + 0.16*exp(-abs(Bw)/(2.4*hh)));
  // bojo (a caixa amendoada do centro, mais visível ao sul do plano)
  float rb = length(vec2(L/14.0, (B + 2.2)/9.5));
  float bojo = 1.8*exp(-pow(rb, 1.2)*1.25) + 0.6*exp(-rb*rb*5.0);
  // nuvens de estrelas: aglomerado em várias escalas
  float c1 = fbm(qa*5.5);
  float c2 = fbm(q*19.0 + 4.0);
  float c3 = fbm(q*55.0 + 9.0);
  float nuvem = max(0.06, 0.6 + 1.7*c1) * (0.55 + 1.05*(c2 + 0.5)) * (0.72 + 0.6*(c3 + 0.5));
  nuvem += 1.3*blob(Pw, vec2(2.0, -4.8), vec2(4.6, 2.8));    // Grande Nuvem de Sagitário
  nuvem += 1.0*blob(Pw, vec2(12.0, -0.8), vec2(1.2, 0.8));   // M24
  nuvem += 0.7*blob(Pw, vec2(27.5, -2.6), vec2(3.2, 2.2));   // Nuvem do Escudo
  nuvem += 0.5*blob(Pw, vec2(-31.0, -1.6), vec2(4.0, 2.0));  // Nuvem da Régua
  nuvem += 0.5*blob(Pw, vec2(-73.0, -0.8), vec2(5.0, 2.0));  // Carina
  float I = (disco + bojo) * nuvem;

  vec3 cDisco = vec3(0.94, 0.91, 0.86);
  vec3 cBojo = vec3(1.0, 0.74, 0.46);
  vec3 cJovem = vec3(0.78, 0.87, 1.0);
  float fb = clamp(bojo/(disco + bojo + 1e-3), 0.0, 1.0);
  float jovem = clamp(blob(P, vec2(-72.0, 0.0), vec2(22.0, 5.0)) + 0.6*blob(P, vec2(-52.0, 0.0), vec2(12.0, 4.0)), 0.0, 1.0);
  vec3 col = mix(cDisco, cBojo, fb);
  col = mix(col, cJovem, jovem*0.6);
  vec3 em = col * I;

  // nebulosas de emissão (rosadas, com textura) e de reflexão em Rho Ophiuchi
  float neb = 0.0;
  neb += 1.0*blob(Pw*0.3 + P*0.7, vec2(6.0, -1.2), vec2(0.6, 0.4));      // Lagoa
  neb += 0.6*blob(P, vec2(7.0, -0.25), vec2(0.3, 0.3));                  // Trífida
  neb += 0.7*blob(P, vec2(15.1, -0.7), vec2(0.4, 0.3));                  // Ômega
  neb += 0.5*blob(P, vec2(17.0, 0.8), vec2(0.45, 0.35));                 // Águia
  neb += 0.5*blob(P, vec2(-8.9, 0.7), vec2(0.8, 0.5));                   // Pata de Gato
  neb += 0.45*blob(P, vec2(-7.0, 0.9), vec2(0.7, 0.45));                 // Guerra e Paz
  neb += 0.5*blob(P, vec2(-16.7, 0.8), vec2(0.9, 0.5));                  // Camarão
  neb += 1.3*blob(Pw*0.4 + P*0.6, vec2(-72.4, -0.6), vec2(1.4, 0.9));    // Carina
  neb += 0.4*blob(P, vec2(-75.2, -1.3), vec2(0.6, 0.5));
  neb *= smoothstep(0.15, 0.75, rfbm(q*45.0 + 3.0)) * 1.6;
  em += vec3(1.0, 0.34, 0.46) * neb * 0.9;
  float rhoTex = 0.5 + 0.8*rfbm(q*30.0 + 7.0);
  float antares = blob(Pw*0.3 + P*0.7, vec2(-8.0, 15.1), vec2(1.6, 1.3));
  float rhoAzul = blob(Pw*0.3 + P*0.7, vec2(-6.6, 16.6), vec2(1.0, 0.8));
  float sigmaVerm = blob(Pw*0.3 + P*0.7, vec2(-8.8, 17.4), vec2(1.1, 0.9));
  em += (vec3(1.0, 0.72, 0.38)*antares*0.55 + vec3(0.42, 0.6, 1.0)*rhoAzul*0.5 + vec3(1.0, 0.34, 0.42)*sigmaVerm*0.35)*rhoTex;

  // poeira
  float tau = 0.0;
  // faixa escura central, ondulada e interrompida
  float laneB = 0.4 + 0.8*sin(radians(L)*3.0 + 1.0) + 1.3*gn(q*5.0) + 0.6*gn(q*13.0);
  float laneW = (0.8 + 1.6*exp(-sq(L/24.0))) * (0.6 + 0.8*smoothstep(-0.3, 0.3, gn(q*4.0 + 7.0)));
  float laneA = 0.35 + 0.9*smoothstep(-0.2, 0.3, gn(vec3(q.x, q.y, q.z*0.3)*7.0 + 3.0));
  tau += 2.6*laneA*exp(-sq((B - laneB)/laneW)) * (0.55 + 0.9*smoothstep(-0.3, 0.4, fbm(qa*16.0)));
  // a Grande Fenda (do Escudo para o norte)
  float fenda = smoothstep(-4.0, 8.0, L) * (1.0 - smoothstep(55.0, 80.0, L));
  float fendaB = 2.4 + 0.05*L + 1.4*gn(q*6.0);
  float fendaW = 1.6 + 1.8*smoothstep(0.0, 25.0, L);
  tau += 2.6*fenda*exp(-sq((B - fendaB)/fendaW)) * (0.45 + 0.9*smoothstep(-0.3, 0.4, fbm(qa*11.0 + 2.0)));
  // manchas escuras alongadas perto do plano
  tau += 1.7*exp(-sq(B/6.5)) * smoothstep(0.08, 0.42, fbm(qa*6.5 + 4.0));
  // poeira em manchas ao norte do núcleo (Ofiúco)
  float nucleo = exp(-sq(L/20.0)) * smoothstep(-1.0, 3.0, B) * (1.0 - smoothstep(9.0, 22.0, B));
  tau += 1.8*nucleo*smoothstep(0.05, 0.4, fbm(q*8.0 + 11.0));
  // nuvens escuras conhecidas (com bordas rasgadas)
  float fil = 0.45 + 0.9*smoothstep(-0.35, 0.35, fbm(q*20.0 + 5.0));
  tau += 1.5*seg(Pw, vec2(-7.5, 7.8), vec2(-1.5, 3.8), 1.0)*fil;   // haste do Cachimbo
  tau += 1.7*blob(Pw, vec2(-4.2, 7.2), vec2(1.9, 1.5))*fil;        // fornilho (B78)
  tau += 1.2*seg(Pw, vec2(-1.0, 5.0), vec2(4.5, 10.5), 1.3)*fil;   // Cavalo Escuro
  tau += 1.0*seg(Pw, vec2(1.0, 3.5), vec2(7.0, 6.0), 1.1)*fil;
  tau += 1.6*blob(Pw, vec2(-6.2, 16.0), vec2(2.2, 1.8))*fil;       // Rho Ophiuchi
  tau += 1.1*seg(Pw, vec2(-5.0, 16.0), vec2(8.0, 20.0), 0.9)*fil;  // fios de Ofiúco
  tau += 0.9*seg(Pw, vec2(-5.0, 15.0), vec2(6.0, 12.5), 0.8)*fil;
  tau += 0.7*seg(Pw, vec2(-3.0, 17.5), vec2(3.0, 23.0), 0.7)*fil;
  tau += 1.8*blob(Pw, vec2(-58.8, -0.9), vec2(3.0, 2.4))*(0.7 + 0.5*rfbm(q*20.0));  // Saco de Carvão
  tau *= 1.0 - 0.7*clamp(neb, 0.0, 1.0);
  tau *= 0.85 + 0.3*(fbm(q*40.0) + 0.5);
  tau = max(tau, 0.0);

  cor = vec4(sqrt(clamp(em/6.0, 0.0, 1.0)), sqrt(clamp(tau/7.0, 0.0, 1.0)));
}
`;

// Céu, Via Láctea, serras e cúpula (escreve profundidade: serra na frente).
const FS_CEU = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform vec2 uRes;
uniform vec2 uC;
uniform float uK;
uniform mat3 uCam2Enu;
uniform mat3 uCam2Gal;
uniform sampler2D uMW;
uniform vec3 uFaixa;
uniform float uT, uNoite, uMwVis, uFrente, uOuro, uGanho;
uniform vec4 uSerra;   // altura (rad), livre, azimute da cúpula (rad, do sul), raio da cúpula (rad)
uniform highp sampler2D uSerraTex;  // alturas das três serras por azimute (rad), 8192 amostras
out vec4 cor;
${RUIDO_TEX}
vec3 serras(float az){
  float u = (az + 3.14159265)*(8192.0/6.28318531) - 0.5;
  float i0 = floor(u);
  float t = u - i0;
  int a0 = int(mod(i0, 8192.0));
  int a1 = int(mod(i0 + 1.0, 8192.0));
  vec3 h0 = texelFetch(uSerraTex, ivec2(a0 & 2047, a0 >> 11), 0).rgb;
  vec3 h1 = texelFetch(uSerraTex, ivec2(a1 & 2047, a1 >> 11), 0).rgb;
  return mix(h0, h1, t);
}
float ign(vec2 p){ return fract(52.9829189*fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float cobre(float h, float a, float px){ return clamp((h - a)/px + 0.5, 0.0, 1.0); }
void main(){
  vec2 P = (gl_FragCoord.xy - uC)/uK;
  float r2 = dot(P, P);
  vec3 c = vec3(4.0*P, 4.0 - r2)/(4.0 + r2);
  vec3 d = uCam2Enu*c;
  float sa = clamp(d.z, -1.0, 1.0);
  float a = asin(sa);
  float azS = abs(d.x) + abs(d.y) < 1e-7 ? 0.0 : atan(-d.x, -d.y);
  float px = 1.0/(uK*(1.0 + 0.25*r2));
  float za = max(a, 0.0);

  // gradiente: crepúsculo azul profundo -> noite azul-negra
  float hor = exp(-za*3.0);
  vec3 cz = mix(vec3(0.0042, 0.0085, 0.0250), vec3(0.00075, 0.0013, 0.0042), uNoite);
  vec3 ch = mix(vec3(0.030, 0.054, 0.110), vec3(0.0052, 0.0080, 0.0165), uNoite);
  vec3 col = mix(cz, ch, hor);
  // luminescência do ar: faixa verde baixa, morna rente ao horizonte, ondas lentas
  float ag = smoothstep(-0.02, 0.07, a) * exp(-za/0.17);
  float onda = 0.75 + 0.25*sin(azS*9.0 - za*38.0 + uT*0.06)*sin(azS*4.3 + za*21.0 - uT*0.04 + 1.3);
  onda *= 0.8 + 0.4*(vr(vec3(azS*3.0, za*9.0, uT*0.015)) + 0.5);
  vec3 agCol = vec3(0.0080, 0.0230, 0.0110)*onda + vec3(0.0160, 0.0095, 0.0036)*exp(-za/0.04);
  col += agCol * ag * (0.2 + 0.8*uNoite);
  // resto do crepúsculo a oeste
  float oeste = 0.5 + 0.5*cos(azS - 1.5708);
  col += (1.0 - uNoite)*oeste*oeste*(vec3(0.034, 0.024, 0.020)*exp(-za/0.09) + vec3(0.004, 0.010, 0.020)*exp(-za/0.4));

  // Via Láctea
  float am = 1.0/(max(sa, 0.0) + 0.025*exp(-11.0*max(sa, 0.0)));
  if (uMwVis > 0.001){
    vec3 g = uCam2Gal*c;
    float l = abs(g.x) + abs(g.y) < 1e-7 ? 0.0 : atan(g.y, g.x);
    float b = asin(clamp(g.z, -1.0, 1.0));
    vec2 uv = vec2((l - uFaixa.x)/(uFaixa.y - uFaixa.x), (b + uFaixa.z)/(2.0*uFaixa.z));
    float win = smoothstep(0.0, 0.05, uv.x)*(1.0 - smoothstep(0.95, 1.0, uv.x))
              * smoothstep(0.0, 0.06, uv.y)*(1.0 - smoothstep(0.94, 1.0, uv.y));
    float fr = uFrente < 1.94 ? a + 0.13*vr(g*2.6 + 3.0) + 0.05*vr(g*8.0) : a;
    float vis = (1.0 - smoothstep(uFrente - 0.42, uFrente + 0.04, fr)) * uMwVis * win;
    if (vis > 0.001){
      vec4 tx = texture(uMW, clamp(uv, 0.0, 1.0));
      vec3 em = tx.rgb*tx.rgb*6.0;
      float tau = tx.a*tx.a*7.0;
      vec3 gg = g*150.0;
      float n1 = vr(gg);
      float n2 = vr(gg*2.3 + 11.0);
      float fino = 1.0 - smoothstep(0.0007, 0.0014, px);
      em *= 0.88 + 0.26*n1 + 0.12*n2*fino;
      tau *= 0.84 + 0.42*vr(gg*1.3 + 5.0) + 0.24*n2*fino;
      vec3 T = exp(-max(tau, 0.0)*vec3(1.0, 1.24, 1.58));
      vec3 mw = em*T*vis*uGanho;
      vec3 ext = exp(-(am - 1.0)*vec3(0.10, 0.15, 0.24));
      col += mw*ext;
    }
  }

  // clarão dourado do desfecho
  vec2 dq = (gl_FragCoord.xy - 0.5*uRes)/min(uRes.x*1.25, uRes.y);
  float rg = dot(dq, dq);
  vec3 ouro = vec3(0.85, 0.42, 0.11)*exp(-rg*26.0) + vec3(0.40, 0.165, 0.035)*exp(-rg*7.5) + vec3(0.06, 0.024, 0.006)*exp(-rg*2.0);
  col = mix(col, col*vec3(1.15, 0.94, 0.70)*(1.0 - 0.4*uOuro) + ouro*uOuro, uOuro);

  // serras: longe (azulada, com vulcão e cúpula), meio, perto (quase preta)
  float prof = 1.0;
  float H = uSerra.x;
  if (a < H*1.25 + 4.0*px){
    vec3 hs = serras(azS);
    float hL = hs.r;
    float dx = azS - uSerra.z;
    float R = uSerra.w;
    float cup = 0.0;
    if (abs(dx) < 10.0*R){
      float hd = serras(uSerra.z).r + 0.1*R;
      float plano = 1.0 - smoothstep(2.4*R, 7.0*R, abs(dx));
      hL = mix(hL, hd, plano);
      float topo = hd + 0.75*R;
      cup = clamp((R - length(vec2(dx, max(a - topo, 0.0))))/px + 0.5, 0.0, 1.0);
      float dx2 = dx - 2.9*R;
      float topo2 = hd + 0.45*R;
      cup = max(cup, clamp((0.6*R - length(vec2(dx2, max(a - topo2, 0.0))))/px + 0.5, 0.0, 1.0));
      float dx3 = dx + 2.7*R;
      cup = max(cup, min(cobre(0.8*R, abs(dx3), px), cobre(hd + 0.6*R, a, px)));
    }
    float hM = hs.g;
    float hP = hs.b;
    float cL = max(cobre(hL, a, px), cup);
    float cM = cobre(hM, a, px);
    float cP = cobre(hP, a, px);
    vec3 baseS = mix(vec3(0.024, 0.042, 0.085), vec3(0.0042, 0.0058, 0.0100), uNoite);
    baseS = mix(baseS, vec3(0.05, 0.03, 0.014), uOuro);
    vec3 sL = baseS*0.62*(1.0 + 0.45*(1.0 - clamp(a/max(hL, 1e-4), 0.0, 1.0)));
    vec3 sM = baseS*0.30*(1.0 + 0.3*(1.0 - clamp(a/max(hM, 1e-4), 0.0, 1.0)));
    vec3 sP = baseS*0.08*(0.9 + 0.3*vr(vec3(azS*60.0, a*60.0, 1.0)));
    col = mix(col, sL, cL);
    col = mix(col, sM, cM);
    col = mix(col, sP, cP);
    if (max(cL, max(cM, cP)) > 0.5) prof = 0.25;
  }
  gl_FragDepth = prof;
  col = 1.0 - exp(-col*1.08);
  vec3 o = pow(max(col, vec3(0.0)), vec3(1.0/2.2));
  o += (ign(gl_FragCoord.xy) + ign(gl_FragCoord.xy + vec2(47.0, 17.0)) - 1.0)/255.0;
  cor = vec4(o, 1.0);
}
`;

const VS_ESTRELA = `#version 300 es
precision highp float;
in vec3 aDir;
in vec3 aCor;
in vec4 aProp; // magnitude, limiar, semente, tipo (0 campo, 1 faixa)
uniform mat3 uEq2Cam;
uniform vec3 uEqUp;
uniform vec2 uRes;
uniform vec2 uC;
uniform float uK, uDpr, uS, uT, uMwVis, uFrente, uFlash, uBrilho, uCintila, uNoite;
uniform mat3 uEq2Gal;
uniform float uMaxPt;
out vec3 vCor;
out float vSig;
out float vHalo;
out float vHs;
out float vTam;
${RUIDO_TEX}
void main(){
  vec3 c = uEq2Cam*aDir;
  float sa = dot(uEqUp, aDir);
  gl_PointSize = 0.0;
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  vCor = vec3(0.0); vSig = 1.0; vHalo = 0.0; vHs = 1.0; vTam = 1.0;
  if (c.z < -0.2 || sa < -0.02) return;
  vec2 P = 2.0*c.xy/(1.0 + c.z);
  vec2 px = uC + P*uK;
  if (any(lessThan(px, vec2(-40.0))) || any(greaterThan(px, uRes + 40.0))) return;
  float m = aProp.x;
  float a = asin(clamp(sa, -1.0, 1.0));
  float vis, flash = 0.0;
  if (aProp.w < 0.5){
    float dd = uS - aProp.y;
    vis = smoothstep(0.0, 0.010, dd);
    if (dd > 0.0) flash = exp(-dd/0.016)*uFlash;
  } else {
    vec3 g = uEq2Gal*aDir;
    float fr = uFrente < 1.94 ? a + 0.13*vr(g*2.6 + 3.0) + 0.05*vr(g*8.0) : a;
    float mask = (1.0 - smoothstep(uFrente - 0.42, uFrente + 0.04, fr))*uMwVis;
    vis = smoothstep(aProp.y - 0.18, aProp.y, mask);
    float dd = mask - aProp.y;
    if (dd > 0.0) flash = exp(-dd/0.05)*uFlash*0.6;
  }
  if (vis <= 0.0) return;
  float s0 = max(sa, 0.0);
  float am = 1.0/(s0 + 0.025*exp(-11.0*s0));
  float ext = exp(-0.19*(am - 1.0));
  vec3 aver = exp(-(am - 1.0)*vec3(0.02, 0.06, 0.13));
  float baixo = 1.0 - smoothstep(0.05, 0.45, a);
  float sem = aProp.z;
  float tw = sin(uT*(9.0 + 7.0*sem) + sem*40.0)*sin(uT*(3.3 + 2.0*sem) + sem*17.0);
  float cint = 1.0 + baixo*0.6*tw*uCintila;
  float F = 4.0*pow(10.0, -0.2*(m - 1.0));
  F *= ext*cint*vis*uBrilho*mix(0.6, 1.0, uNoite);
  if (aProp.w > 0.5) F *= 0.95;
  float sat = mix(0.5, 0.95, 1.0 - smoothstep(1.0, 4.5, m));
  vec3 cc = mix(vec3(1.0), aCor, sat)*aver;
  float sig = max(0.62, uDpr*(0.45 + 0.20*clamp(2.5 - m, 0.0, 3.5)));
  sig *= 1.0 + 0.6*flash;
  float pico = F*uDpr*uDpr/(6.2832*sig*sig);
  pico = min(pico, 2.5)*(1.0 + 2.0*flash);
  float hb = clamp(pow(10.0, -0.3*(m - 1.6)), 0.0, 4.0);
  float halo = (m < 3.4 ? 0.05*hb : 0.0)*ext*vis*uBrilho + 0.12*flash*min(F*0.3, 1.0);
  float hs = uDpr*(1.4 + 1.6*clamp(2.4 - m, 0.0, 3.2));
  float tam = max(4.4*sig + 1.5, halo > 0.0 ? 6.0*hs + 2.0 : 0.0);
  gl_PointSize = min(tam, uMaxPt);
  gl_Position = vec4(px/uRes*2.0 - 1.0, 0.0, 1.0);
  vCor = cc*pico;
  vSig = sig;
  vHalo = halo;
  vHs = hs;
  vTam = gl_PointSize;
}
`;
const FS_ESTRELA = `#version 300 es
precision highp float;
in vec3 vCor;
in float vSig;
in float vHalo;
in float vHs;
in float vTam;
out vec4 cor;
void main(){
  vec2 q = (gl_PointCoord - 0.5)*vTam;
  float r2 = dot(q, q);
  float r = sqrt(r2);
  float borda = 1.0 - smoothstep(0.38*vTam, 0.5*vTam, r);
  float nucleo = exp(-0.5*r2/(vSig*vSig));
  float halo = vHalo*exp(-r/vHs);
  vec3 tom = vCor/max(max(vCor.r, max(vCor.g, vCor.b)), 1e-4);
  vec3 c = (vCor*nucleo + tom*halo)*borda;
  cor = vec4(c, 1.0);
}
`;

// linhas finas das constelações e o meteoro (quads instanciados)
const VS_LINHA = `#version 300 es
precision highp float;
in vec2 aQuad;
in vec3 aA;
in vec3 aB;
in vec4 aSeg; // figura, s0, s1, tipo (0 linha, 1 meteoro)
uniform mat3 uEq2Cam;
uniform vec2 uRes;
uniform vec2 uC;
uniform float uK, uDpr, uMeteoro;
uniform vec4 uDesenho;
uniform vec4 uAlfa;
out float vAtr;
out float vMeia;
out float vAl;
out float vT;
out float vTipo;
vec2 proj(vec3 v, out float z){ vec3 c = uEq2Cam*v; z = c.z; return uC + 2.0*c.xy/(1.0 + c.z)*uK; }
void main(){
  float za, zb;
  vec2 pa = proj(aA, za);
  vec2 pb = proj(aB, zb);
  int f = int(aSeg.x + 0.5);
  float tipo = aSeg.w;
  float fr = 1.0, al = 0.0, gap = 0.0, meia = 0.0;
  if (tipo < 0.5){
    fr = clamp((uDesenho[f] - aSeg.y)/max(aSeg.z - aSeg.y, 1e-4), 0.0, 1.0);
    al = uAlfa[f];
    gap = 5.0*uDpr;
    meia = 0.55*uDpr;
  } else {
    al = uMeteoro;
    meia = 0.9*uDpr;
  }
  vec2 dv = pb - pa;
  float len = length(dv);
  vec2 dir = len > 1e-3 ? dv/len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float L = max(len - 2.0*gap, 0.0)*fr;
  if (za < -0.2 || zb < -0.2 || L < 0.5 || al < 0.002){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vAl = 0.0; vAtr = 0.0; vMeia = 1.0; vT = 0.0; vTipo = 0.0; return; }
  float w = meia + 1.2;
  vec2 p = pa + dir*(gap + aQuad.x*L) + nrm*aQuad.y*w;
  gl_Position = vec4(p/uRes*2.0 - 1.0, 0.0, 1.0);
  vAtr = aQuad.y*w;
  vMeia = meia;
  vAl = al;
  vT = aQuad.x;
  vTipo = tipo;
}
`;
const FS_LINHA = `#version 300 es
precision highp float;
in float vAtr;
in float vMeia;
in float vAl;
in float vT;
in float vTipo;
out vec4 cor;
void main(){
  float meia = vMeia;
  vec3 c;
  float a;
  if (vTipo < 0.5){
    a = clamp(meia + 0.5 - abs(vAtr), 0.0, 1.0);
    c = vec3(0.89, 0.74, 0.47)*0.55;
  } else {
    float cauda = pow(vT, 2.2);
    meia *= 0.35 + 0.65*vT;
    a = clamp(meia + 0.5 - abs(vAtr), 0.0, 1.0)*cauda;
    c = mix(vec3(0.55, 0.85, 0.75), vec3(1.0, 0.97, 0.9), vT)*0.85;
  }
  cor = vec4(c*a*vAl, 1.0);
}
`;

// nome de constelação: um retângulo no pixel inteiro do aparelho, um texel do bitmap por pixel
const VS_ROTULO = `#version 300 es
uniform vec4 uRet;  // x, y (do topo), largura, altura, em px do aparelho
uniform vec2 uRes;
void main(){
  vec2 c = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1));
  vec2 px = uRet.xy + c*uRet.zw;
  gl_Position = vec4(px.x/uRes.x*2.0 - 1.0, 1.0 - px.y/uRes.y*2.0, 0.0, 1.0);
}
`;
const FS_ROTULO = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uTex;
uniform vec4 uRet;
uniform vec2 uRes;
uniform float uOp;
out vec4 cor;
void main(){
  ivec2 t = ivec2(int(gl_FragCoord.x) - int(uRet.x), int(uRes.y) - 1 - int(gl_FragCoord.y) - int(uRet.y));
  cor = texelFetch(uTex, t, 0)*uOp;
}
`;

/** o WebGL devolve `null` quando não consegue criar o objeto (contexto perdido, sem memória) */
function obter<T>(objeto: T | null, nome: string): T {
  if (!objeto) throw new Error('WebGL: não criou ' + nome);
  return objeto;
}

export const ceu: DefinicaoDaCena = {
  id: 'ceu',
  duracaoFinal: 2.8,
  criar(canvas: HTMLCanvasElement | OffscreenCanvas, recursos?: RecursosDaCena): Cena {
    const contexto = canvas.getContext('webgl2', ATRIBUTOS);
    if (!contexto) throw new Error('WebGL2 indisponível');
    const gl: WebGL2RenderingContext = contexto;

    function compilar(vs: string, fs: string): Programa {
      const p = obter(gl.createProgram(), 'programa');
      const fontes: [number, string][] = [
        [gl.VERTEX_SHADER, vs],
        [gl.FRAGMENT_SHADER, fs],
      ];
      for (const [tipo, src] of fontes) {
        const s = obter(gl.createShader(tipo), 'shader');
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
          const log = gl.getShaderInfoLog(s);
          gl.deleteShader(s);
          throw new Error('shader: ' + log);
        }
        gl.attachShader(p, s);
        gl.deleteShader(s);
      }
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
        throw new Error('programa: ' + gl.getProgramInfoLog(p));
      }
      const u: Uniformes = {};
      const n: number = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) || 0;
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i);
        if (info) u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name);
      }
      return { p, u };
    }

    const faixaPonto = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array | null;
    const maxPt = Math.min(256, (faixaPonto && faixaPonto[1]) || 64);
    const progCeu = compilar(VS_TELA, FS_CEU);
    const progAssar = compilar(VS_TELA, FS_ASSAR);
    const progEst = compilar(VS_ESTRELA, FS_ESTRELA);
    const progLin = compilar(VS_LINHA, FS_LINHA);
    const progRot = compilar(VS_ROTULO, FS_ROTULO);

    // triângulo de tela cheia
    const vaoTela = obter(gl.createVertexArray(), 'vao');
    gl.bindVertexArray(vaoTela);
    const bufTela = obter(gl.createBuffer(), 'buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, bufTela);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // --- assa o mapa da Via Láctea ---
    const FAIXA = [-150 * D, 90 * D, 45 * D];
    const MW_W = 2048;
    const MW_H = 768;
    const texMW = obter(gl.createTexture(), 'textura');
    gl.bindTexture(gl.TEXTURE_2D, texMW);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, MW_W, MW_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = obter(gl.createFramebuffer(), 'framebuffer');
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texMW, 0);
    gl.viewport(0, 0, MW_W, MW_H);
    gl.useProgram(progAssar.p);
    gl.uniform2f(progAssar.u.uTam, MW_W, MW_H);
    gl.uniform3f(progAssar.u.uFaixa, FAIXA[0], FAIXA[1], FAIXA[2]);
    gl.bindVertexArray(vaoTela);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const px = new Uint8Array(MW_W * MW_H * 4);
    gl.readPixels(0, 0, MW_W, MW_H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);

    // ruído 3D (valor por célula) e as alturas das serras
    const texRuido = obter(gl.createTexture(), 'textura');
    gl.bindTexture(gl.TEXTURE_3D, texRuido);
    {
      const rr = mulberry32(77);
      const v = new Uint8Array(64 * 64 * 64);
      for (let i = 0; i < v.length; i++) v[i] = Math.floor(rr() * 256);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, 64, 64, 64, 0, gl.RED, gl.UNSIGNED_BYTE, v);
    }
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    for (const w of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, w, gl.REPEAT);
    const texSerra = obter(gl.createTexture(), 'textura');
    gl.bindTexture(gl.TEXTURE_2D, texSerra);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    let chaveSerra = '';
    const azSul = (az: number): number => (((az - 180 + 540) % 360) - 180) * D;

    // --- estrelas ---
    const rnd = mulberry32(20261007);
    const dados: number[] = [];
    const porNome: Record<string, Vec3> = {};
    for (const [nome, ra, de, m, bv] of ESTRELAS) {
      const v = eqVec(ra, de);
      porNome[nome] = v;
      const x = clamp((m + 0.5) / 3.6, 0, 1);
      const thr = 0.003 + 0.05 * Math.pow(x, 1.3) + rnd() * 0.006;
      dados.push(...v, ...corBV(bv), m, thr, rnd(), 0);
    }
    // campo: todo o céu, mais denso perto do plano galáctico
    const N_CAMPO = 40000;
    for (let i = 0; i < N_CAMPO; i++) {
      let l: number;
      let b: number;
      for (;;) {
        l = rnd() * 2 * Math.PI;
        b = Math.asin(rnd() * 2 - 1);
        const dens = 0.4 + 0.6 * Math.exp(-Math.abs(b) / (13 * D));
        if (rnd() < dens) break;
      }
      let m: number;
      do m = 8.1 + Math.log10(Math.max(1e-9, rnd())) / 0.42;
      while (m < 3.6);
      const bv = rnd() < 0.55 ? 0.55 + (rnd() + rnd() + rnd() - 1.5) * 0.55 : 1.12 + (rnd() + rnd() - 1) * 0.4;
      const v = galParaEq([Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b)]);
      const x = clamp((m - 3.6) / 4.5 + (rnd() - 0.5) * 0.05, 0, 1);
      const thr = 0.05 + 0.9 * Math.pow(x, 0.85);
      dados.push(...v, ...corBV(bv), m, thr, rnd(), 0);
    }
    // estrelas miúdas da faixa, sorteadas pelo próprio mapa assado
    {
      const CW = MW_W / 4;
      const CH = MW_H / 4;
      const pesos = new Float64Array(CW * CH);
      const cores = new Float32Array(CW * CH * 3);
      let soma = 0;
      for (let cy = 0; cy < CH; cy++) {
        const b = mix(-FAIXA[2], FAIXA[2], (cy * 4 + 2) / MW_H);
        const cb = Math.cos(b);
        for (let cx = 0; cx < CW; cx++) {
          let acc = 0;
          let r = 0;
          let g = 0;
          let bl = 0;
          for (let yy = 0; yy < 4; yy++)
            for (let xx = 0; xx < 4; xx++) {
              const o = ((cy * 4 + yy) * MW_W + cx * 4 + xx) * 4;
              const er = (px[o] / 255) ** 2 * 6;
              const eg = (px[o + 1] / 255) ** 2 * 6;
              const eb = (px[o + 2] / 255) ** 2 * 6;
              const tau = (px[o + 3] / 255) ** 2 * 7;
              const tr = Math.exp(-tau * 1.15);
              acc += (0.3 * er + 0.6 * eg + 0.1 * eb) * tr;
              r += er * Math.exp(-tau);
              g += eg * Math.exp(-tau * 1.24);
              bl += eb * Math.exp(-tau * 1.58);
            }
          const k = cy * CW + cx;
          const w = Math.pow(acc / 16, 1.1) * cb;
          pesos[k] = w;
          soma += w;
          const mx = Math.max(r, g, bl, 1e-6);
          cores[k * 3] = r / mx;
          cores[k * 3 + 1] = g / mx;
          cores[k * 3 + 2] = bl / mx;
        }
      }
      const cdf = new Float64Array(CW * CH);
      let a = 0;
      for (let i = 0; i < cdf.length; i++) {
        a += pesos[i] / soma;
        cdf[i] = a;
      }
      const N_FAIXA = 60000;
      for (let i = 0; i < N_FAIXA; i++) {
        const u = rnd();
        let lo = 0;
        let hi = cdf.length - 1;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (cdf[mid] < u) lo = mid + 1;
          else hi = mid;
        }
        const cx = lo % CW;
        const cy = (lo / CW) | 0;
        const l = mix(FAIXA[0], FAIXA[1], (cx + rnd()) / CW);
        const b = mix(-FAIXA[2], FAIXA[2], (cy + rnd()) / CH);
        const v = galParaEq([Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b)]);
        const t = rnd();
        const tint = corBV(0.35 + t * 1.2);
        const c = [cores[lo * 3] * tint[0], cores[lo * 3 + 1] * tint[1], cores[lo * 3 + 2] * tint[2]];
        const mx = Math.max(c[0], c[1], c[2], 1e-6);
        const m = Math.max(7.2, 10.9 + Math.log10(Math.max(1e-9, rnd())) / 0.55);
        dados.push(...v, c[0] / mx, c[1] / mx, c[2] / mx, m, 0.12 + 0.88 * rnd(), rnd(), 1);
      }
    }
    const nEstrelas = dados.length / 10;
    const vaoEst = obter(gl.createVertexArray(), 'vao');
    gl.bindVertexArray(vaoEst);
    const bufEst = obter(gl.createBuffer(), 'buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, bufEst);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dados), gl.STATIC_DRAW);
    const atributosEst: [string, number, number][] = [
      ['aDir', 3, 0],
      ['aCor', 3, 12],
      ['aProp', 4, 24],
    ];
    for (const [nome, tam, off] of atributosEst) {
      const l = gl.getAttribLocation(progEst.p, nome);
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, tam, gl.FLOAT, false, 40, off);
    }

    // --- linhas das constelações + meteoro ---
    const segDados: number[] = [];
    const pontosDaFigura: Vec3[][] = [];
    FIGURAS.forEach((fig, fi) => {
      const comp = fig.segs.map(([a, b]) => {
        const va = porNome[a];
        const vb = porNome[b];
        return Math.acos(clamp(va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2], -1, 1));
      });
      const tot = comp.reduce((s, x) => s + x, 0);
      pontosDaFigura.push([...new Set(fig.segs.flat())].map((n) => porNome[n]));
      let acc = 0;
      fig.segs.forEach(([a, b], i) => {
        const s0 = acc / tot;
        acc += comp[i];
        segDados.push(...porNome[a], ...porNome[b], fi, s0, acc / tot, 0);
      });
    });
    const nSeg = segDados.length / 10;
    segDados.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 1); // meteoro (atualizado por quadro)
    const segArr = new Float32Array(segDados);
    const vaoLin = obter(gl.createVertexArray(), 'vao');
    gl.bindVertexArray(vaoLin);
    const bufQuad = obter(gl.createBuffer(), 'buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, bufQuad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, -1, 1, -1, 0, 1, 1, 1]), gl.STATIC_DRAW);
    const lq = gl.getAttribLocation(progLin.p, 'aQuad');
    gl.enableVertexAttribArray(lq);
    gl.vertexAttribPointer(lq, 2, gl.FLOAT, false, 0, 0);
    const bufSeg = obter(gl.createBuffer(), 'buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, bufSeg);
    gl.bufferData(gl.ARRAY_BUFFER, segArr, gl.DYNAMIC_DRAW);
    const atributosLin: [string, number, number][] = [
      ['aA', 3, 0],
      ['aB', 3, 12],
      ['aSeg', 4, 24],
    ];
    for (const [nome, tam, off] of atributosLin) {
      const l = gl.getAttribLocation(progLin.p, nome);
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, tam, gl.FLOAT, false, 40, off);
      gl.vertexAttribDivisor(l, 1);
    }
    gl.bindVertexArray(null);

    // --- os nomes das constelações: uma textura por id, enviada de novo só quando o bitmap troca ---
    const texRotulos = new Map<string, { tex: WebGLTexture; bitmap: ImageBitmap | null }>();
    function enviarRotulo(id: string, r: RotuloPronto): WebGLTexture | null {
      if (r.bitmap.width === 0 || r.bitmap.height === 0) return null;
      let m = texRotulos.get(id);
      if (!m) {
        m = { tex: obter(gl.createTexture(), 'textura'), bitmap: null };
        texRotulos.set(id, m);
      }
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, m.tex);
      if (m.bitmap !== r.bitmap) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, r.bitmap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        m.bitmap = r.bitmap;
      }
      return m.tex;
    }
    /** (x, y) é a âncora em px de CSS, do canto de cima à esquerda; (ax, ay) a fração da caixa do texto que recua dela */
    function desenharRotulo(id: string, r: RotuloPronto, op: number, x: number, y: number, ax: number, ay: number): void {
      if (!enviarRotulo(id, r)) return;
      const caixaX = x + ax * (r.largura - 2 * FOLGA_ROTULO);
      const caixaY = y + ay * (r.altura - 2 * FOLGA_ROTULO);
      const folga = Math.round(FOLGA_ROTULO * DPR);
      const esq = Math.round(caixaX * DPR) - folga;
      const topo = Math.round(caixaY * DPR) - folga;
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(progRot.p);
      gl.uniform1i(progRot.u.uTex, 3);
      gl.uniform4f(progRot.u.uRet, esq, topo, r.bitmap.width, r.bitmap.height);
      gl.uniform2f(progRot.u.uRes, canvas.width, canvas.height);
      gl.uniform1f(progRot.u.uOp, op);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disable(gl.BLEND);
    }

    let vivo = true;
    let W = 1;
    let Hh = 1;
    let DPR = 1;
    let lay = LAYOUTS.paisagem;

    function redimensionar(w: number, h: number, dpr: number): void {
      W = w;
      Hh = h;
      DPR = dpr;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      const ret = w / h < 0.85;
      lay = ret ? LAYOUTS.retrato : LAYOUTS.paisagem;
      const H = (lay.serra * h) / lay.escala(w, h);
      const chave = `${ret}:${H.toFixed(5)}`;
      if (chave !== chaveSerra) {
        chaveSerra = chave;
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, texSerra);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA32F,
          2048,
          4,
          0,
          gl.RGBA,
          gl.FLOAT,
          alturasSerras(H, lay.freqSerra, azSul(lay.vulcao[0]), lay.vulcao[1] * D),
        );
      }
    }

    function quadro(e: EstadoDaCena): void {
      if (!vivo || gl.isContextLost()) return;
      const s = clamp(e.suave, 0, 1);
      const fim = clamp(e.fim, 0, 1);
      const lento = e.reduzido ? 0.25 : 1;
      const ta = e.t * lento;
      const cw = canvas.width;
      const ch = canvas.height;

      // câmera: sobe para a faixa no desfecho
      const ef = fim * fim * fim * (fim * (fim * 6 - 15) + 10);
      const kCss0 = lay.escala(W, Hh);
      const kCss = kCss0 * mix(1, lay.fimZoom, ef);
      const camAlt = mix(lay.alt, lay.fimAlt, ef);
      const camAz = mix(lay.az, lay.fimAz, ef);
      // centro da projeção: horizonte na altura pedida (lente deslocada)
      const yH = lay.horizonte * Hh + 2 * Math.tan((lay.alt * D) / 2) * kCss0;
      const yC = mix(yH, 0.5 * Hh, ef);
      const k = kCss * DPR;
      const C = [0.5 * cw, yC * DPR];
      const lst = lay.lst + (ta * 0.2) / 15;
      const E2H = eqParaEnu(lst);
      const B = baseCamera(camAz, camAlt);
      const eq2cam = mul3(B, E2H);
      const cam2enu = transp(B);
      const cam2gal = mul3(MAT_G, mul3(transp(E2H), cam2enu));

      // tempo do céu
      const noite = sstep(0.0, 0.5, s);
      const mwVis = sstep(0.24, 0.52, s) * (1 - 0.35 * sstep(0.4, 1, fim));
      const frente = mix(-0.2, 1.95, sstep(0.26, 0.8, s));
      const ouro = sstep(0.08, 1.0, fim);
      const brilhoEst = 1 - 0.8 * sstep(0.25, 1.0, fim);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, cw, ch);
      gl.clearDepth(1);
      gl.clear(gl.DEPTH_BUFFER_BIT);

      // céu + serras
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.ALWAYS);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      const u = progCeu.u;
      gl.useProgram(progCeu.p);
      gl.uniform2f(u.uRes, cw, ch);
      gl.uniform2f(u.uC, C[0], C[1]);
      gl.uniform1f(u.uK, k);
      gl.uniformMatrix3fv(u.uCam2Enu, true, cam2enu);
      gl.uniformMatrix3fv(u.uCam2Gal, true, cam2gal);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texMW);
      gl.uniform1i(u.uMW, 0);
      gl.uniform3f(u.uFaixa, FAIXA[0], FAIXA[1], FAIXA[2]);
      gl.uniform1f(u.uT, ta);
      gl.uniform1f(u.uNoite, noite);
      gl.uniform1f(u.uMwVis, mwVis);
      gl.uniform1f(u.uFrente, frente);
      gl.uniform1f(u.uOuro, ouro);
      gl.uniform1f(u.uGanho, 0.115 * (1 + 0.25 * ouro));
      const hSerra = (lay.serra * Hh) / kCss0;
      gl.uniform4f(u.uSerra, hSerra, 0, azSul(lay.cupula), 5.5 / kCss0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_3D, texRuido);
      gl.uniform1i(u.uRuido, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, texSerra);
      gl.uniform1i(u.uSerraTex, 2);
      gl.bindVertexArray(vaoTela);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // estrelas (atrás das serras pela profundidade)
      gl.depthFunc(gl.LESS);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      const v = progEst.u;
      gl.useProgram(progEst.p);
      gl.uniformMatrix3fv(v.uEq2Cam, true, eq2cam);
      gl.uniform3f(v.uEqUp, E2H[6], E2H[7], E2H[8]);
      gl.uniform2f(v.uRes, cw, ch);
      gl.uniform2f(v.uC, C[0], C[1]);
      gl.uniform1f(v.uK, k);
      gl.uniform1f(v.uDpr, DPR);
      gl.uniform1f(v.uS, s);
      gl.uniform1f(v.uT, ta);
      gl.uniform1f(v.uMwVis, mwVis);
      gl.uniform1f(v.uFrente, frente);
      gl.uniform1f(v.uFlash, e.reduzido ? 0 : 1);
      gl.uniform1f(v.uBrilho, brilhoEst);
      gl.uniform1f(v.uCintila, e.reduzido ? 0.3 : 1);
      gl.uniform1f(v.uNoite, noite);
      gl.uniformMatrix3fv(v.uEq2Gal, true, MAT_G);
      gl.uniform1f(v.uMaxPt, maxPt);
      gl.uniform1i(v.uRuido, 1);
      gl.bindVertexArray(vaoEst);
      gl.drawArrays(gl.POINTS, 0, nEstrelas);

      // constelações e meteoro
      const desenho = [0, 0, 0, 0];
      const alfa = [0, 0, 0, 0];
      FIGURAS.forEach((f, i) => {
        const j = f.janela;
        desenho[i] = clamp((s - j[0]) / (j[1] - j[0]), 0, 1);
        alfa[i] = sstep(j[0], j[0] + 0.015, s) * (1 - sstep(j[2], j[3], s)) * (1 - fim);
      });
      let met = 0;
      if (!e.reduzido) {
        const PER = 6.5;
        const i = Math.floor(e.t / PER);
        const hr = mulberry32(i * 7919 + 13);
        const ok = hr() < 0.6;
        const ini = i * PER + 0.8 + hr() * 4.2;
        const dur = 0.55 + hr() * 0.35;
        const fase = (e.t - ini) / dur;
        if (ok && fase > 0 && fase < 1) {
          const az0 = (camAz + (hr() - 0.5) * 70) * D;
          const al0 = (34 + hr() * 26) * D;
          const ang = (hr() < 0.5 ? -1 : 1) * (25 + hr() * 40) * D;
          const comp = (9 + hr() * 8) * D;
          const enu = (az: number, al: number): Vec3 => [
            Math.cos(al) * Math.sin(az),
            Math.cos(al) * Math.cos(az),
            Math.sin(al),
          ];
          const pontoEm = (x: number): Vec3 => enu(az0 + (Math.sin(ang) * x) / Math.cos(al0), al0 - Math.cos(ang) * x);
          const cabeca = fase * comp;
          const cauda = Math.max(0, cabeca - Math.min(cabeca, 6 * D));
          const H2E = transp(E2H);
          const paraEq = (p: Vec3): Vec3 => [
            H2E[0] * p[0] + H2E[1] * p[1] + H2E[2] * p[2],
            H2E[3] * p[0] + H2E[4] * p[1] + H2E[5] * p[2],
            H2E[6] * p[0] + H2E[7] * p[1] + H2E[8] * p[2],
          ];
          const pa = paraEq(pontoEm(cauda));
          const pb = paraEq(pontoEm(cabeca));
          segArr.set([...pa, ...pb, 0, 0, 1, 1], nSeg * 10);
          met = Math.pow(Math.sin(Math.PI * fase), 0.8) * 0.75 * (1 - fim);
        }
      }
      const li = progLin.u;
      gl.useProgram(progLin.p);
      gl.uniformMatrix3fv(li.uEq2Cam, true, eq2cam);
      gl.uniform2f(li.uRes, cw, ch);
      gl.uniform2f(li.uC, C[0], C[1]);
      gl.uniform1f(li.uK, k);
      gl.uniform1f(li.uDpr, DPR);
      gl.uniform1f(li.uMeteoro, met);
      gl.uniform4fv(li.uDesenho, desenho);
      gl.uniform4fv(li.uAlfa, alfa);
      gl.bindVertexArray(vaoLin);
      if (met > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, bufSeg);
        gl.bufferSubData(gl.ARRAY_BUFFER, nSeg * 40, segArr.subarray(nSeg * 10));
      }
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nSeg + (met > 0 ? 1 : 0));
      gl.bindVertexArray(null);

      // nomes das constelações, por cima de tudo (o protótipo os punha em HTML sobre o canvas)
      FIGURAS.forEach((f, i) => {
        const rotulo = f.rotulo ? recursos?.rotulos.get(f.rotulo) : undefined;
        if (!f.rotulo || !rotulo) return;
        const a = alfa[i] * sstep(0.2, 0.7, desenho[i]);
        if (a < 0.005) return;
        let x0 = Infinity;
        let x1 = -Infinity;
        let y0 = Infinity;
        let y1 = -Infinity;
        for (const v3 of pontosDaFigura[i]) {
          const x = eq2cam[0] * v3[0] + eq2cam[1] * v3[1] + eq2cam[2] * v3[2];
          const y = eq2cam[3] * v3[0] + eq2cam[4] * v3[1] + eq2cam[5] * v3[2];
          const z = eq2cam[6] * v3[0] + eq2cam[7] * v3[1] + eq2cam[8] * v3[2];
          const X = C[0] / DPR + ((2 * x) / (1 + z)) * kCss;
          const Y = Hh - (C[1] / DPR + ((2 * y) / (1 + z)) * kCss);
          x0 = Math.min(x0, X);
          x1 = Math.max(x1, X);
          y0 = Math.min(y0, Y);
          y1 = Math.max(y1, Y);
        }
        const lado = lay.rotulos[i];
        let LX = (x0 + x1) / 2;
        let LY = (y0 + y1) / 2;
        let ax = -0.5;
        if (lado === 'esq') {
          LX = x0 - 16;
          ax = -1;
        } else if (lado === 'dir') {
          LX = x1 + 16;
          ax = 0;
        } else LY = y1 + 22 < Hh * 0.76 ? y1 + 22 : y0 - 22;
        // o protótipo dava `translate(LX, LY)` com uma casa decimal e opacidade com três
        desenharRotulo(f.rotulo, rotulo, Number((a * 0.9).toFixed(3)), Number(LX.toFixed(1)), Number(LY.toFixed(1)), ax, -0.5);
      });
    }

    function soltar(): void {
      vivo = false;
      try {
        for (const t of [texMW, texRuido, texSerra]) gl.deleteTexture(t);
        for (const m of texRotulos.values()) gl.deleteTexture(m.tex);
        texRotulos.clear();
        for (const b of [bufTela, bufEst, bufQuad, bufSeg]) gl.deleteBuffer(b);
        for (const va of [vaoTela, vaoEst, vaoLin]) gl.deleteVertexArray(va);
        for (const pr of [progCeu, progAssar, progEst, progLin, progRot]) gl.deleteProgram(pr.p);
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      } catch (err) {
        console.error(err);
      }
      canvas.width = 1;
      canvas.height = 1;
    }

    return { redimensionar, quadro, soltar };
  },
};
