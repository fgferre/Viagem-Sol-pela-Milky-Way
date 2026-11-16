/**
 * A FICHA FÍSICA DE QUALQUER ESTRELA COM NOME (M3 de `docs/LEI-DA-ESTRELA.md`).
 *
 * As 15 de `estrelasVisitaveis.ts` têm ficha escrita à mão, de artigos. As
 * outras ~1,7 mil estrelas com nome do catálogo (`stars_meta.json`, `named`)
 * só trazem magnitude aparente, distância, B−V e o tipo espectral em texto.
 * Daqui sai uma ficha pela MESMA regra para todas, sem caso por estrela:
 *   1. M_V = m − 5 log10(d/10); a classe de luminosidade pelo texto ou, sem
 *      ela, pela posição no diagrama H-R (`descriptorFromCatalog`, a
 *      inferência da biblioteca); Teff pelo tipo espectral NA ESCALA DA
 *      CLASSE (anã, gigante, supergigante) ou, sem tipo, pelo B−V
 *      (Ballesteros 2012);
 *   2. L pela correção bolométrica (Flower 1996 corrigida por Torres 2010; nas
 *      anãs frias, Pecaut & Mamajek 2013); R por Stefan-Boltzmann;
 *   3. massa: anãs e subgigantes pela relação massa-luminosidade de Eker et
 *      al. (2018); gigantes e supergigantes por um valor típico DECLARADO
 *      (artístico — cor e brilho não fixam a massa de uma estrela evoluída);
 *      anã branca não entra (sem lei de superfície: fica ponto de luz);
 *   4. coerência: a gravidade (log g) tem de caber na classe que o rótulo
 *      diz; se não cabe, o rótulo é descartado e a estrela é refeita como se
 *      não o tivesse; se ainda não cabe, null;
 *   5. superfície pela lei de classe das anfitriãs; rotação e atividade pelas
 *      leis únicas (`rotacaoDe`, `atividadeDe`), que leem esta ficha.
 * Da biblioteca `stellarPhysics` só se usam o leitor do tipo, a Teff pela cor
 * e a inferência da classe: o raio dela vem da luminosidade visual sem
 * correção bolométrica, e a tabela de Teff dela ignora a classe (dá a uma
 * gigante K5 a Teff de uma anã K5, ~500 K quente demais).
 */
import type { NamedStar } from '../../three/config';
import {
  descriptorFromCatalog,
  parseSpectralClass,
  temperatureFromBV,
  temperatureFromSpect,
  type LuminosityClass,
  type SpectralClass,
} from './stellarPhysics';
import {
  ESTRELAS_VISITAVEIS,
  TEFF_DO_SOL_K,
  estrelaVisitavelPorNome,
  logGravidade,
  superficiePelaTemperatura,
  type EstrelaVisitavel,
  type Numero,
} from './estrelasVisitaveis';

// ─── as escalas tipo → Teff, por classe ─────────────────────────────────────

/** o índice do tipo: O0 = 0, B0 = 10, … M9 = 69 (subclasse fracionária vale) */
const LETRAS_MK = 'OBAFGKM';
type Escala = readonly (readonly [indice: number, teffK: number])[];
const tp = (tipo: string): number => LETRAS_MK.indexOf(tipo[0]) * 10 + Number(tipo.slice(1));

/**
 * ANÃS (V, IV, VI): Pecaut & Mamajek 2013 (ApJS 208, 9), a tabela de anãs
 * mantida por Mamajek, O3–M9 — coluna Teff CONFERIDA em 16/11/2026 contra a
 * versão 2022.04.16 do arquivo (EEM_dwarf_UBVIJHK_colors_Teff.txt). Também
 * serve às gigantes mais quentes que G5 e às supergigantes mais quentes que
 * B0, onde as escalas de gigante não existem e a diferença de classe é
 * pequena.
 */
const ESCALA_ANAS: Escala = [
  [tp('O3'), 44900], [tp('O5'), 41400], [tp('O7'), 37100], [tp('O9'), 33300],
  [tp('B0'), 31400], [tp('B1'), 26000], [tp('B2'), 20600], [tp('B3'), 17000],
  [tp('B5'), 15700], [tp('B8'), 12300], [tp('B9'), 10700], [tp('A0'), 9700],
  [tp('A2'), 8800], [tp('A3'), 8600], [tp('A5'), 8100], [tp('A7'), 7760],
  [tp('F0'), 7220], [tp('F2'), 6820], [tp('F5'), 6550], [tp('F8'), 6180],
  [tp('G0'), 5930], [tp('G2'), 5770], [tp('G5'), 5660], [tp('G8'), 5480],
  [tp('K0'), 5270], [tp('K2'), 5100], [tp('K5'), 4440], [tp('K7'), 4100],
  [tp('M0'), 3850], [tp('M1'), 3660], [tp('M2'), 3560], [tp('M3'), 3430],
  [tp('M4'), 3210], [tp('M5'), 3060], [tp('M6'), 2810], [tp('M7'), 2680],
  [tp('M8'), 2570], [tp('M9'), 2380],
];

/**
 * GIGANTES (III, II), G5–M6: van Belle et al. 2021 (ApJ 922, 163), tabela
 * 12 — a temperatura MEDIDA por interferometria, média por tipo. CONFERIDA
 * em 16/11/2026. Entram as linhas com 4 estrelas ou mais (G0, G1 e K3 têm
 * uma só e ficam de fora; no lugar de K3 entram K3,25 e K3,5), M0 pelo
 * ajuste do próprio artigo (3.816 K, a linha medida está vazia) e M6 com
 * duas estrelas, a última: depois dela a tabela tem uma estrela por tipo e
 * deixa de cair. Entre F5 e G5 não há medida: a reta entre a anã F5 e a
 * gigante G5, declarado. Mais quente que F5: a escala de anãs.
 */
const ESCALA_GIGANTES: Escala = [
  [tp('F5'), 6550], [tp('G5'), 4963], [tp('G8'), 4781], [tp('K0'), 4715],
  [tp('K1'), 4634], [tp('K1.25'), 4528], [tp('K1.5'), 4424], [tp('K2'), 4387],
  [tp('K3.25'), 4183], [tp('K3.5'), 4063], [tp('K4'), 3951], [tp('K5'), 3911],
  [tp('M0'), 3816], [tp('M1'), 3777], [tp('M2'), 3617], [tp('M3'), 3559],
  [tp('M4'), 3466], [tp('M5'), 3381], [tp('M5.5'), 3301], [tp('M6'), 3112],
];

/**
 * SUPERGIGANTES (0, Ia, Ib, I), B0–M5. CONFERIDAS em 16/11/2026: B0–B3 de
 * Crowther, Lennon & Walborn 2006 (A&A 446, 279, tabela 4, média adotada das
 * Ia); K1–M5 de Levesque et al. 2005 (ApJ 628, 973, tabela 5). NÃO
 * CONFERIDAS, de memória: B5 e B8 (fora da tabela de Crowther) e o trecho
 * A–G, que interpola supergigantes medidas (Deneb A2 8.500 K, Canopus F0
 * 7.350 K, Polaris F7 6.000 K). Mais quente que B0: a escala de anãs.
 */
const ESCALA_SUPERGIGANTES: Escala = [
  [tp('B0'), 27500], [tp('B1'), 21500], [tp('B2'), 18500], [tp('B3'), 15500],
  [tp('B5'), 13600], [tp('B8'), 12100], [tp('A0'), 9700], [tp('A2'), 8500],
  [tp('F0'), 7350], [tp('F5'), 6400], [tp('F8'), 5800], [tp('G0'), 5500],
  [tp('G5'), 4900], [tp('G8'), 4600], [tp('K1'), 4100], [tp('K3'), 4015],
  [tp('K5'), 3840], [tp('M0'), 3790], [tp('M1'), 3745], [tp('M2'), 3660],
  [tp('M3'), 3605], [tp('M4'), 3535], [tp('M5'), 3450],
];

/** interpolação linear no índice; null antes da primeira âncora, a última depois */
function naEscala(e: Escala, i: number): number | null {
  if (i < e[0][0]) return null;
  for (let k = 1; k < e.length; k++) {
    const [i1, t1] = e[k];
    if (i <= i1) {
      const [i0, t0] = e[k - 1];
      return t0 + ((t1 - t0) * (i - i0)) / (i1 - i0);
    }
  }
  return e[e.length - 1][1];
}

const SUPERGIGANTES = new Set<LuminosityClass>(['0', 'Ia', 'Ib', 'I']);
const GIGANTES = new Set<LuminosityClass>(['III', 'II']);

function teffPeloTipo(c: SpectralClass, sub: number, classe: LuminosityClass): { v: number; fonte: string } {
  const letra = LETRAS_MK.indexOf(c);
  // anã branca e anãs marrons (L, T, Y): a tabela da biblioteca
  if (letra < 0) return { v: temperatureFromSpect(c, sub), fonte: ALLEN };
  const i = letra * 10 + sub;
  if (SUPERGIGANTES.has(classe)) {
    const t = naEscala(ESCALA_SUPERGIGANTES, i);
    if (t !== null) return { v: t, fonte: LEVESQUE_CROWTHER };
  } else if (GIGANTES.has(classe)) {
    const t = naEscala(ESCALA_GIGANTES, i);
    if (t !== null) return { v: t, fonte: VAN_BELLE };
  }
  return { v: naEscala(ESCALA_ANAS, i) ?? ESCALA_ANAS[0][1], fonte: PECAUT_MAMAJEK };
}

// ─── a correção bolométrica ─────────────────────────────────────────────────

/**
 * BC_V(Teff) de Flower (1996, ApJ 469, 355), com os coeficientes corrigidos
 * por Torres (2010, AJ 140, 1158, tabela 1): três polinômios em log Teff.
 * A amostra de Flower vai de ~3.000 a ~50.000 K (log Teff 3,48–4,70); fora
 * dela o polinômio diverge (−24 mag a 2.000 K), então a Teff é PRESA a essa
 * faixa só para a correção — declarado. Torres pede M_bol☉ = 4,73 com estes
 * coeficientes (a escala de BC dele põe o Sol em BC ≈ −0,08).
 */
const BC_FLOWER_TORRES: readonly (readonly number[])[] = [
  // log Teff < 3,70
  [-0.190537291496456e5, 0.155144866764412e5, -0.421278819301717e4, 0.381476328422343e3],
  // 3,70 ≤ log Teff < 3,90
  [-0.370510203809015e5, 0.385672629965804e5, -0.150651486316025e5, 0.261724637119416e4, -0.170623810323864e3],
  // log Teff ≥ 3,90
  [
    -0.118115450538963e6, 0.137145973583929e6, -0.636233812100225e5, 0.147412923562646e5,
    -0.170587278406872e4, 0.78873172180499e2,
  ],
];
const TEFF_MIN_DA_BC_K = 3000;
const TEFF_MAX_DA_BC_K = 50000;
const M_BOL_DO_SOL = 4.73;

function bcFlowerTorres(teffK: number): number {
  const l = Math.log10(Math.min(TEFF_MAX_DA_BC_K, Math.max(TEFF_MIN_DA_BC_K, teffK)));
  const c = BC_FLOWER_TORRES[l < 3.7 ? 0 : l < 3.9 ? 1 : 2];
  let s = 0;
  for (let i = c.length - 1; i >= 0; i--) s = s * l + c[i];
  return s;
}

/**
 * AS ANÃS FRIAS: a parte fria de Flower vem de gigantes e sai forte demais
 * para anã M (~1 mag a 3.100 K). Abaixo de 4.400 K, nas anãs (V, VI), a
 * coluna BC_V de Pecaut & Mamajek 2013 (ApJS 208, 9; M0V–M9V, CONFERIDA em
 * 16/11/2026 contra a versão 2022.04.16), com a primeira âncora no valor de Flower em 4.400 K
 * para a emenda ser contínua (as duas escalas já concordam em K5V).
 */
const TEFF_DA_EMENDA_K = 4400;
const BC_ANAS_FRIAS: readonly (readonly [teffK: number, bc: number])[] = [
  [TEFF_DA_EMENDA_K, bcFlowerTorres(TEFF_DA_EMENDA_K)],
  [3850, -1.15], [3660, -1.42], [3560, -1.62], [3430, -1.93], [3210, -2.51],
  [3060, -3.11], [2810, -4.13], [2680, -4.99], [2570, -5.65], [2380, -5.86],
];

function correcaoBolometrica(teffK: number, classe: LuminosityClass = 'III'): number {
  if (!(teffK < TEFF_DA_EMENDA_K && (classe === 'V' || classe === 'VI'))) return bcFlowerTorres(teffK);
  for (let k = 1; k < BC_ANAS_FRIAS.length; k++) {
    const [t1, b1] = BC_ANAS_FRIAS[k];
    if (teffK >= t1) {
      const [t0, b0] = BC_ANAS_FRIAS[k - 1];
      return b0 + ((b1 - b0) * (teffK - t0)) / (t1 - t0);
    }
  }
  return BC_ANAS_FRIAS[BC_ANAS_FRIAS.length - 1][1];
}

// ─── a massa ────────────────────────────────────────────────────────────────

/**
 * A relação massa-luminosidade da sequência principal de Eker et al. (2018,
 * MNRAS 479, 5491, tabela 4): log L = a log M + b em seis faixas, calibrada
 * em binárias destacadas de 0,179 a 31 M☉. A inversa anda pelas faixas em
 * ordem; onde duas faixas não se tocam (degraus de ~0,07 dex em 0,72 e 7 M☉)
 * a massa fica na borda. Fora da calibração, a primeira e a última faixa são
 * ESTENDIDAS (declarado) até o limite da queima de H (0,075 M☉) e 150 M☉.
 */
const MLR_EKER: readonly { readonly ate: number; readonly a: number; readonly b: number }[] = [
  { ate: 0.45, a: 2.028, b: -0.976 },
  { ate: 0.72, a: 4.572, b: -0.102 },
  { ate: 1.05, a: 5.743, b: -0.007 },
  { ate: 2.4, a: 4.329, b: 0.01 },
  { ate: 7, a: 3.967, b: 0.093 },
  { ate: 150, a: 2.865, b: 1.105 },
];
const MASSA_MIN_MSOL = 0.075;

function massaPelaLuminosidade(lumLsol: number): number {
  const logL = Math.log10(lumLsol);
  let de = MASSA_MIN_MSOL;
  for (const f of MLR_EKER) {
    const logLNoTopo = f.a * Math.log10(f.ate) + f.b;
    if (logL <= logLNoTopo || f === MLR_EKER[MLR_EKER.length - 1]) {
      const m = Math.pow(10, (logL - f.b) / f.a);
      return Math.min(f.ate, Math.max(de, m));
    }
    de = f.ate;
  }
  return de;
}

/**
 * A MASSA TÍPICA DAS ESTRELAS EVOLUÍDAS — ARTÍSTICA, declarada: cor e brilho
 * não fixam a massa de uma gigante (a mesma L serve a massas muito
 * diferentes). Valores medianos por classe, escolhidos para dar log g
 * plausível: gigantes frias ~1,5 M☉ (a mediana das gigantes K com
 * asterossismologia), log g ≈ 2–3; supergigantes frias 12–20 M☉, log g ≈ 0–1.
 * As quentes (≥ 10.000 K, O/B) mal saíram da sequência principal e são bem
 * mais pesadas na mesma classe, por isso uma segunda coluna.
 */
const TEFF_DAS_EVOLUIDAS_QUENTES_K = 10000;
const MASSA_TIPICA: Partial<Record<LuminosityClass, readonly [fria: number, quente: number]>> = {
  III: [1.5, 6],
  II: [4, 10],
  Ib: [12, 15],
  I: [12, 15],
  Ia: [20, 25],
  '0': [25, 40],
};

// ─── a coerência ────────────────────────────────────────────────────────────

/**
 * A GRAVIDADE QUE CADA CLASSE ADMITE (log g, cgs): sequência principal
 * 3,5–5,6 (do fim da queima de H nas O às anãs M tardias, ~5,3); subgigantes
 * 3,0–4,6; gigantes −1,0–4,0 (das AGB às gigantes B); supergigantes
 * −1,5–3,6 (das vermelhas às O, Martins et al. 2005); anãs brancas 6,5–9,5.
 * Nas evoluídas a massa é típica (artística, até ~2× fora = 0,3 dex), então
 * a faixa delas ganha 0,3 dex de cada lado. Fora disso o rótulo contradiz o
 * brilho (ex.: um "Ia" de 1,2 R☉, um "K5 V" com luminosidade de gigante) —
 * erro de rótulo ou de distância no catálogo.
 */
const FOLGA_DA_MASSA_TIPICA = 0.3;
const LOG_G_DA_CLASSE: Record<LuminosityClass, readonly [number, number]> = {
  V: [3.5, 5.6],
  VI: [3.5, 5.6],
  IV: [3.0, 4.6],
  III: [-1.0 - FOLGA_DA_MASSA_TIPICA, 4.0 + FOLGA_DA_MASSA_TIPICA],
  II: [-1.0 - FOLGA_DA_MASSA_TIPICA, 4.0 + FOLGA_DA_MASSA_TIPICA],
  Ib: [-1.5 - FOLGA_DA_MASSA_TIPICA, 3.6 + FOLGA_DA_MASSA_TIPICA],
  I: [-1.5 - FOLGA_DA_MASSA_TIPICA, 3.6 + FOLGA_DA_MASSA_TIPICA],
  Ia: [-1.5 - FOLGA_DA_MASSA_TIPICA, 3.6 + FOLGA_DA_MASSA_TIPICA],
  '0': [-1.5 - FOLGA_DA_MASSA_TIPICA, 3.6 + FOLGA_DA_MASSA_TIPICA],
  VII: [6.5, 9.5],
};

// ─── a regra ────────────────────────────────────────────────────────────────

/**
 * A FAIXA EM QUE A FICHA É CONFIÁVEL: Teff de 2.300 K (as anãs M mais frias
 * que a tabela MK alcança antes das anãs marrons) a 60.000 K (acima das O
 * mais quentes); raio de 0,005 R☉ (anã branca pesada) a 2.000 R☉ (as maiores
 * supergigantes vermelhas medidas). Fora disso é erro de dado, não estrela.
 */
const TEFF_MIN_K = 2300;
const TEFF_MAX_K = 60000;
const RAIO_MIN_RSOL = 0.005;
const RAIO_MAX_RSOL = 2000;

const ALLEN = 'Allen 2000, Astrophysical Quantities (4th ed.)';
const PECAUT_MAMAJEK = 'Pecaut & Mamajek 2013, ApJS 208, 9';
const VAN_BELLE = 'van Belle et al. 2021, ApJ 922, 163';
const LEVESQUE_CROWTHER = 'Levesque et al. 2005, ApJ 628, 973; Crowther et al. 2006, A&A 446, 279';
const BALLESTEROS = 'Ballesteros 2012, EPL 97, 34008';
const BC_FONTES = 'Flower 1996, ApJ 469, 355; Torres 2010, AJ 140, 1158; Pecaut & Mamajek 2013, ApJS 208, 9';
const STEFAN_BOLTZMANN = `Stefan-Boltzmann; ${BC_FONTES}`;
const EKER = 'Eker et al. 2018, MNRAS 479, 5491';
const CATALOGO = 'HYG database v4.4';

type TipoLido = { spectralClass: SpectralClass; subclass: number; luminosityClass: LuminosityClass | null };

/**
 * O TEXTO DO TIPO, normalizado onde a biblioteca erra: o prefixo minúsculo
 * "d"/"sd" da notação de Mount Wilson (dM4, dG2, sdM4) quer dizer anã e
 * subanã — a biblioteca o lê como anã branca ("D..."). O "D" maiúsculo
 * continua sendo anã branca.
 */
function lerTipo(s: string): TipoLido | null {
  const mw = /^(sd|d)([OBAFGKM].*)$/.exec(s.trim());
  if (mw) {
    const p = parseSpectralClass(mw[2]);
    return p && { ...p, luminosityClass: mw[1] === 'sd' ? 'VI' : 'V' };
  }
  return parseSpectralClass(s);
}

function slug(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
}

/** a letra MK pela Teff: a escala de anãs lida ao contrário */
function tipoPelaTemperatura(teffK: number): string {
  const k = ESCALA_ANAS.findIndex(([, t]) => t <= teffK);
  if (k <= 0) return k === 0 ? 'O' : 'M';
  const [i0, t0] = ESCALA_ANAS[k - 1];
  const [i1, t1] = ESCALA_ANAS[k];
  return LETRAS_MK[Math.floor((i0 + ((i1 - i0) * (t0 - teffK)) / (t0 - t1)) / 10)];
}

/**
 * A ficha por um caminho: com o rótulo (`tipo` lido) ou sem ele (cor e
 * posição no H-R). `coerente` diz se a gravidade cabe na classe usada.
 */
function calcular(
  n: NamedStar,
  tipo: TipoLido | null
): { ficha: EstrelaVisitavel; coerente: boolean } | null {
  const temCor = typeof n.ci === 'number' && Number.isFinite(n.ci);
  const mv = n.m - 5 * Math.log10(n.d / 10);
  // o tipo só fixa a Teff com o dígito da subclasse; sem ele, a cor
  const pelaClasse = tipo !== null && Number.isFinite(tipo.subclass);
  if (!pelaClasse && !temCor) return null;
  const classe: LuminosityClass =
    tipo?.luminosityClass ??
    (temCor ? descriptorFromCatalog({ bv: n.ci!, spect: null, absmag: mv }).luminosityClass : 'V');
  const teff = pelaClasse
    ? teffPeloTipo(tipo.spectralClass, tipo.subclass, classe)
    : { v: temperatureFromBV(n.ci!), fonte: BALLESTEROS };

  const lum = Math.pow(10, -0.4 * (mv + correcaoBolometrica(teff.v, classe) - M_BOL_DO_SOL));
  const raio = Math.sqrt(lum) * Math.pow(TEFF_DO_SOL_K / teff.v, 2);
  if (!Number.isFinite(lum) || !Number.isFinite(raio)) return null;
  if (!(teff.v >= TEFF_MIN_K && teff.v <= TEFF_MAX_K && raio >= RAIO_MIN_RSOL && raio <= RAIO_MAX_RSOL)) return null;

  const tipica = MASSA_TIPICA[classe];
  const massa: Numero = tipica
    ? // sem fonte: nenhuma medida fixa este número (o selo artístico diz isso)
      { v: tipica[teff.v >= TEFF_DAS_EVOLUIDAS_QUENTES_K ? 1 : 0], p: 'artistico', fonte: '' }
    : { v: massaPelaLuminosidade(lum), p: 'derivado', fonte: EKER };
  if (!Number.isFinite(massa.v) || massa.v <= 0) return null;
  const [gMin, gMax] = LOG_G_DA_CLASSE[classe];
  const logG = logGravidade(massa.v, raio);

  const texto = (n.s ?? '').trim();
  return {
    coerente: logG >= gMin && logG <= gMax,
    ficha: {
      id: n.hip !== undefined ? `hip-${n.hip}` : `cat-${slug(n.n)}`,
      nomeNoCatalogo: n.n,
      ...(n.hip === undefined ? {} : { hip: n.hip }),
      tipo: tipo
        ? { texto, v: 0, p: 'medido', fonte: CATALOGO }
        : { texto: `${tipoPelaTemperatura(teff.v)} ${classe}`, v: 0, p: 'derivado', fonte: BALLESTEROS },
      teffK: { v: teff.v, p: 'derivado', fonte: teff.fonte },
      raioRsol: { v: raio, p: 'derivado', fonte: STEFAN_BOLTZMANN },
      massaMsol: massa,
      luminosidadeLsol: { v: lum, p: 'derivado', fonte: BC_FONTES },
      superficie: superficiePelaTemperatura(teff.v, raio, massa.v),
    },
  };
}

/**
 * A ficha de uma estrela do catálogo pela regra única; null quando não dá
 * para confiar (sem distância, sem tipo nem cor, tipo que as escalas não
 * cobrem — Wolf-Rayet, carbono, S, peculiar —, número não finito, fora da
 * faixa acima, ou incoerente com e sem o rótulo): a estrela segue ponto de
 * luz. Rótulo incoerente com o brilho: vale o brilho, e o tipo vira derivado.
 */
export function estrelaDoCatalogo(n: NamedStar): EstrelaVisitavel | null {
  if (!(n.d > 0) || !Number.isFinite(n.m)) return null;
  const texto = (n.s ?? '').trim();
  const tipoLido = texto ? lerTipo(texto) : null;
  // texto presente que as escalas não leem: a cor desses tipos não é a de
  // uma fotosfera normal (linhas de emissão, carbono, avermelhamento)
  if (texto && !tipoLido) return null;
  // ANÃ BRANCA: a conta dá raio e temperatura, mas o motor a desenharia
  // com a superfície do Sol (grãos, manchas, coroa) — vista em Van Maanen
  // em 16/11, um Sol em miniatura que ela não é. Sem lei de superfície
  // para elas, fica ponto de luz (Sirius B tem a sua, escrita à mão).
  if (tipoLido?.spectralClass === 'WD') return null;
  const pelo = calcular(n, tipoLido);
  if (pelo?.coerente) return pelo.ficha;
  if (!tipoLido) return null;
  const semRotulo = calcular(n, null);
  return semRotulo?.coerente ? semRotulo.ficha : null;
}

/** a companheira de uma escrita à mão (Sirius B) já tem corpo, na órbita
 *  dela: nem corpo nem ficha física pela regra única */
export function ehCompanheiraDesenhada(nome: string): boolean {
  return ESTRELAS_VISITAVEIS.some((e) => e.companheira?.nome === nome);
}

const memoria = new Map<string, EstrelaVisitavel | null>();

/**
 * A ficha de uma estrela pelo nome: a escrita à mão SEMPRE vence; sem ela, a
 * da regra única, guardada por nome. A companheira de uma escrita à mão
 * (Sirius B) já tem corpo, na órbita dela: não ganha um segundo.
 */
export function estrelaComCorpo(nome: string, named: readonly NamedStar[]): EstrelaVisitavel | null {
  const autoral = estrelaVisitavelPorNome(nome);
  if (autoral) return autoral;
  if (ehCompanheiraDesenhada(nome)) return null;
  if (memoria.has(nome)) return memoria.get(nome)!;
  const n = named.find((s) => s.n === nome);
  const ficha = n ? estrelaDoCatalogo(n) : null;
  memoria.set(nome, ficha);
  return ficha;
}
