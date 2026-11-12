/**
 * TODA ESTRELA É UM LUGAR — o piloto (pilar 2 do NORTE, 12/11/2026).
 *
 * A ficha física das quatro estrelas que ganham corpo. O catálogo
 * (`stars.bin`) sabe posição, luminosidade e B−V; não sabe raio, massa,
 * forma nem superfície. Estes números vêm de artigos, cada um com a sua
 * procedência no vocabulário do selo:
 *   - `medido`: observado direto (diâmetro interferométrico, órbita,
 *     espectro, paralaxe);
 *   - `derivado`: calculado de medidas por uma lei ou modelo;
 *   - `artistico`: escolha nossa, plausível, sem medida que a fixe.
 *
 * O que falta para valer para as 328 mil: um raio por estrela (hoje só
 * existe para quem tem diâmetro medido; o resto sairia de L e Teff por
 * Stefan-Boltzmann, e o catálogo não guarda Teff), uma massa (sai do
 * tipo espectral por relação massa-luminosidade) e a regra que decide
 * gigante × anã (classe de luminosidade no tipo espectral, que só os
 * `named` trazem). Ver o fim de `docs/LEI-DA-ESTRELA.md` (M3).
 */
import type { Procedencia } from '../../three/selo';

export interface Numero {
  readonly v: number;
  readonly p: Procedencia;
  /** autor, ano, revista ou arXiv; para `derivado`, a lei usada */
  readonly fonte: string;
}

export interface Orbita {
  /** período, anos */
  readonly periodoAnos: number;
  /** passagem pelo periastro, ano juliano decimal */
  readonly periastroAno: number;
  /** semieixo da órbita RELATIVA (B em torno de A), segundos de arco */
  readonly aSegArco: number;
  readonly e: number;
  readonly iGraus: number;
  /** longitude do nodo ascendente */
  readonly nodoGraus: number;
  /** argumento do periastro da secundária */
  readonly argPeriastroGraus: number;
  readonly fonte: string;
}

export interface Companheira {
  readonly nome: string;
  readonly tipo: string;
  readonly teffK: Numero;
  readonly raioRsol: Numero;
  readonly massaMsol: Numero;
  readonly orbita: Orbita;
}

/** Forma de rotação rápida: elipsoide de Roche + escurecimento gravitacional. */
export interface Achatamento {
  readonly raioPolarRsol: Numero;
  readonly raioEquatorialRsol: Numero;
  readonly teffPoloK: Numero;
  readonly teffEquadorK: Numero;
  /** ângulo entre o eixo de rotação e a linha de visada da Terra */
  readonly inclinacaoGraus: Numero;
  /** expoente de von Zeipel, T ∝ g^β */
  readonly betaGravidade: Numero;
}

export interface Superficie {
  /** tamanho típico do grânulo, em raios da estrela (`tamanhoDoGranulo`) */
  readonly granuloEmRaios: Numero;
  /** contraste de intensidade dos grânulos (rms, fração) */
  readonly contrasteGranulos: Numero;
  /**
   * Células gigantes de convecção (supergigantes vermelhas): poucas
   * células com tamanho da ordem do raio, por cima dos grânulos.
   */
  readonly celulasGigantesEmRaios?: Numero;
  /** escurecimento de borda linear na banda V: I(μ)/I(1) = 1 − u(1 − μ) */
  readonly bordaU: Numero;
  /** fração do disco coberta por manchas frias */
  readonly manchas: Numero;
  /** erupções frequentes (anãs M ativas) */
  readonly erupcoes: boolean;
  /** atmosfera estendida que borra a borda, em raios (1 = borda nítida) */
  readonly bordaDifusaRaios: Numero;
}

export interface EstrelaVisitavel {
  /** id estável do piloto */
  readonly id: string;
  /** `n` do catálogo (`stars_meta.json`), por onde a busca acha a estrela */
  readonly nomeNoCatalogo: string;
  /** ausente nas anfitriãs sem número Hipparcos (TRAPPIST-1, Kepler-186) */
  readonly hip?: number;
  readonly tipo: Numero & { readonly texto: string };
  readonly teffK: Numero;
  readonly raioRsol: Numero;
  readonly massaMsol: Numero;
  readonly luminosidadeLsol: Numero;
  readonly rotacaoDias?: Numero;
  readonly achatamento?: Achatamento;
  readonly superficie: Superficie;
  readonly companheira?: Companheira;
}

const TEFF_SOL_K = 5772;

/**
 * O TAMANHO DO GRÂNULO, em raios da estrela. Os grânulos medem de 3 a 10
 * escalas de altura de pressão Hp (Tremblay, Ludwig, Freytag et al. 2013,
 * A&A 557, A7, grade CO5BOLD de 3600 a 13000 K), e Hp = kT/(μ m g) com
 * g = GM/R². Mantida a razão do Sol, o tamanho em raios vai com
 * T·R/M. A âncora é o grânulo solar, ~1,3 mil km de espaçamento
 * (1,87e-3 R☉).
 */
export const GRANULO_SOL_EM_RAIOS = 1.87e-3;
export function tamanhoDoGranulo(teffK: number, raioRsol: number, massaMsol: number): number {
  return GRANULO_SOL_EM_RAIOS * (teffK / TEFF_SOL_K) * (raioRsol / massaMsol);
}

/** Stefan-Boltzmann em unidades solares: L = R² (T/T☉)⁴. */
export function luminosidadeDe(raioRsol: number, teffK: number): number {
  return raioRsol * raioRsol * Math.pow(teffK / TEFF_SOL_K, 4);
}

const LEI_DO_GRANULO = 'tamanho ∝ Hp ∝ T·R/M (Tremblay et al. 2013, A&A 557, A7)';
const CLARET = 'banda V, tabelas de Claret 2000 (A&A 363, 1081), aproximado';

function granulo(teffK: number, raioRsol: number, massaMsol: number): Numero {
  return { v: tamanhoDoGranulo(teffK, raioRsol, massaMsol), p: 'derivado', fonte: LEI_DO_GRANULO };
}

const PROXIMA: EstrelaVisitavel = {
  id: 'proxima',
  nomeNoCatalogo: 'Proxima Centauri',
  hip: 70890,
  tipo: { texto: 'M5.5Ve', v: 0, p: 'medido', fonte: 'Bessell 1991, AJ 101, 662' },
  teffK: { v: 3054, p: 'derivado', fonte: 'Boyajian et al. 2012, ApJ 757, 112 (diâmetro + fluxo)' },
  raioRsol: { v: 0.1542, p: 'medido', fonte: 'Boyajian et al. 2012, ApJ 757, 112 (interferometria)' },
  massaMsol: { v: 0.1221, p: 'derivado', fonte: 'Mann et al. 2015, ApJ 804, 64 (relação massa–M_K)' },
  luminosidadeLsol: { v: 0.001567, p: 'derivado', fonte: 'Pineda et al. 2021, AJ 161, 172' },
  rotacaoDias: { v: 84.9, p: 'medido', fonte: 'Osorio et al. 2026, A&A 711, A116 (fotometria)' },
  superficie: {
    granuloEmRaios: granulo(3054, 0.1542, 0.1221),
    // anãs M: convecção eficiente, contraste baixo (Beeck et al. 2013,
    // A&A 558, A48, simulações MURaM de 3000–4000 K)
    contrasteGranulos: { v: 0.04, p: 'derivado', fonte: 'Beeck et al. 2013, A&A 558, A48 (simulação)' },
    bordaU: { v: 0.7, p: 'derivado', fonte: CLARET },
    // a modulação de brilho com a rotação prova manchas grandes; o
    // desenho delas é nosso
    manchas: { v: 0.08, p: 'artistico', fonte: 'modulação fotométrica de ~84 d prova manchas; padrão inventado' },
    erupcoes: true,
    bordaDifusaRaios: { v: 1, p: 'derivado', fonte: 'fotosfera de anã: borda nítida' },
  },
};

const SIRIUS: EstrelaVisitavel = {
  id: 'sirius',
  nomeNoCatalogo: 'Sirius',
  hip: 32349,
  tipo: { texto: 'A1V', v: 0, p: 'medido', fonte: 'Gray et al. 2003, AJ 126, 2048' },
  teffK: { v: 9845, p: 'derivado', fonte: 'Davis et al. 2011, PASA 28, 58 (diâmetro + fluxo)' },
  raioRsol: { v: 1.713, p: 'derivado', fonte: 'Davis et al. 2011, PASA 28, 58 (diâmetro SUSI 6,04 mas + paralaxe)' },
  massaMsol: { v: 2.063, p: 'medido', fonte: 'Bond et al. 2017, ApJ 840, 70 (órbita)' },
  luminosidadeLsol: { v: 24.7, p: 'derivado', fonte: 'Davis et al. 2011, PASA 28, 58' },
  superficie: {
    granuloEmRaios: granulo(9845, 1.713, 2.063),
    // estrelas A: zona de convecção rasa, quase sem granulação visível
    contrasteGranulos: { v: 0.015, p: 'derivado', fonte: 'Tremblay et al. 2013, A&A 557, A7 (contraste cai acima de ~7000 K)' },
    bordaU: { v: 0.5, p: 'derivado', fonte: CLARET },
    manchas: { v: 0, p: 'derivado', fonte: 'estrela A sem dínamo convectivo: sem manchas' },
    erupcoes: false,
    bordaDifusaRaios: { v: 1, p: 'derivado', fonte: 'fotosfera de anã: borda nítida' },
  },
  companheira: {
    nome: 'Sirius B',
    tipo: 'DA2',
    teffK: { v: 25369, p: 'derivado', fonte: 'Joyce et al. 2018, MNRAS 479, 1612 (espectro HST)' },
    raioRsol: { v: 0.0081, p: 'derivado', fonte: 'Joyce et al. 2018, MNRAS 479, 1612' },
    massaMsol: { v: 1.018, p: 'medido', fonte: 'Bond et al. 2017, ApJ 840, 70 (órbita)' },
    orbita: {
      periodoAnos: 50.1284,
      periastroAno: 1994.5715,
      aSegArco: 7.4957,
      e: 0.59142,
      iGraus: 136.336,
      nodoGraus: 45.4,
      argPeriastroGraus: 149.161,
      fonte: 'Bond et al. 2017, ApJ 840, 70 (astrometria HST)',
    },
  },
};

const BETELGEUSE: EstrelaVisitavel = {
  id: 'betelgeuse',
  nomeNoCatalogo: 'Betelgeuse',
  hip: 27989,
  tipo: { texto: 'M1–M2 Ia-ab', v: 0, p: 'medido', fonte: 'Keenan & McNeil 1989, ApJS 71, 245' },
  teffK: { v: 3600, p: 'medido', fonte: 'Levesque & Massey 2020, ApJL 891, L37 (espectro)' },
  raioRsol: { v: 764, p: 'derivado', fonte: 'Joyce et al. 2020, ApJ 902, 63 (modelos + pulsação)' },
  massaMsol: { v: 18, p: 'derivado', fonte: 'Joyce et al. 2020, ApJ 902, 63 (16,5–19)' },
  luminosidadeLsol: { v: 87100, p: 'derivado', fonte: 'Joyce et al. 2020, ApJ 902, 63' },
  rotacaoDias: { v: 36 * 365.25, p: 'derivado', fonte: 'Kervella et al. 2018, A&A 609, A67 (ALMA, v sin i 5,5 km/s)' },
  superficie: {
    granuloEmRaios: granulo(3600, 764, 18),
    // poucas células do tamanho da estrela: previstas por Schwarzschild
    // (1975), reproduzidas nas simulações 3D (Freytag et al. 2002;
    // Chiavassa et al. 2010, A&A 515, A12) e vistas como 2–3 manchas
    // claras nas imagens interferométricas (Haubois et al. 2009, A&A
    // 508, 923; Montargès et al. 2021, Nature 594, 365)
    celulasGigantesEmRaios: { v: 0.6, p: 'derivado', fonte: 'Chiavassa et al. 2010, A&A 515, A12 (simulação 3D)' },
    contrasteGranulos: { v: 0.25, p: 'derivado', fonte: 'Chiavassa et al. 2010, A&A 515, A12 (simulação 3D)' },
    bordaU: { v: 0.8, p: 'derivado', fonte: CLARET },
    manchas: { v: 0, p: 'derivado', fonte: 'o padrão é de convecção, não de manchas magnéticas' },
    erupcoes: false,
    // a camada molecular (MOLsphere) a ~1,3 raio borra a borda no
    // infravermelho (Perrin et al. 2004, A&A 418, 675)
    bordaDifusaRaios: { v: 1.3, p: 'medido', fonte: 'Perrin et al. 2004, A&A 418, 675 (interferometria)' },
  },
};

const VEGA: EstrelaVisitavel = {
  id: 'vega',
  nomeNoCatalogo: 'Vega',
  hip: 91262,
  tipo: { texto: 'A0Va', v: 0, p: 'medido', fonte: 'Gray et al. 2003, AJ 126, 2048' },
  // a média do disco; a forma real está em `achatamento`
  teffK: { v: 9600, p: 'derivado', fonte: 'média da superfície do modelo de Monnier et al. 2012' },
  raioRsol: { v: 2.726, p: 'medido', fonte: 'Monnier et al. 2012, ApJL 761, L3 (raio equatorial, CHARA/MIRC)' },
  massaMsol: { v: 2.15, p: 'derivado', fonte: 'Monnier et al. 2012, ApJL 761, L3' },
  luminosidadeLsol: { v: 47.2, p: 'derivado', fonte: 'Monnier et al. 2012, ApJL 761, L3' },
  rotacaoDias: { v: 0.71, p: 'derivado', fonte: 'Monnier et al. 2012, ApJL 761, L3' },
  achatamento: {
    raioPolarRsol: { v: 2.418, p: 'medido', fonte: 'Monnier et al. 2012, ApJL 761, L3 (CHARA/MIRC)' },
    raioEquatorialRsol: { v: 2.726, p: 'medido', fonte: 'Monnier et al. 2012, ApJL 761, L3 (CHARA/MIRC)' },
    teffPoloK: { v: 10070, p: 'medido', fonte: 'Monnier et al. 2012, ApJL 761, L3' },
    teffEquadorK: { v: 8910, p: 'medido', fonte: 'Monnier et al. 2012, ApJL 761, L3' },
    inclinacaoGraus: { v: 6.2, p: 'medido', fonte: 'Monnier et al. 2012, ApJL 761, L3' },
    betaGravidade: { v: 0.231, p: 'medido', fonte: 'Monnier et al. 2012, ApJL 761, L3' },
  },
  superficie: {
    granuloEmRaios: granulo(9600, 2.6, 2.15),
    contrasteGranulos: { v: 0.015, p: 'derivado', fonte: 'Tremblay et al. 2013, A&A 557, A7 (contraste cai acima de ~7000 K)' },
    bordaU: { v: 0.5, p: 'derivado', fonte: CLARET },
    manchas: { v: 0, p: 'derivado', fonte: 'estrela A sem dínamo convectivo: sem manchas' },
    erupcoes: false,
    bordaDifusaRaios: { v: 1, p: 'derivado', fonte: 'fotosfera de anã: borda nítida' },
  },
};

/**
 * AS ANFITRIÃS DOS EXOPLANETAS (`lib/exoplanetas.ts`, 12/11/2026): as
 * estrelas dos primeiros sistemas planetários entram pelo MESMO motor das
 * quatro do piloto. A ficha física é a da tabela PSCompPars do NASA
 * Exoplanet Archive (consultada em 12/11/2026), salvo onde dito; a
 * superfície sai da física pela temperatura, como nas quatro:
 *   - grânulo pela lei de Tremblay (T·R/M);
 *   - contraste: anã M 0,04 (Beeck et al. 2013), F/G/K 0,15 (o do Sol,
 *     `CONTRASTE_REAL_DO_SOL`), A 0,015 (Tremblay et al. 2013);
 *   - borda de Claret aproximada por classe (M 0,7 · K 0,72 · G 0,62 ·
 *     F 0,55 · A 0,5);
 *   - manchas: só onde a atividade foi medida, com o padrão inventado;
 *     sem medida, disco limpo — escolha declarada (`artistico`).
 * Rotação e achatamento não entram (sem medida no arquivo usada aqui).
 */
const PSCOMP = 'NASA Exoplanet Archive, PSCompPars (12/11/2026)';
const ARTE_SEM_MANCHAS = 'sem medida de manchas: disco limpo, escolha nossa';

function anfitria(c: {
  id: string;
  nome: string;
  hip?: number;
  tipo: string;
  teffK: number;
  raioRsol: number;
  massaMsol: number;
  lum: number;
  fonte?: string;
  manchas?: { v: number; fonte: string };
  erupcoes?: boolean;
}): EstrelaVisitavel {
  const fonte = c.fonte ?? PSCOMP;
  const T = c.teffK;
  const contraste =
    T < 3900
      ? { v: 0.04, p: 'derivado' as const, fonte: 'Beeck et al. 2013, A&A 558, A48 (simulação)' }
      : T < 7000
        ? { v: 0.15, p: 'derivado' as const, fonte: 'como o Sol (estrela F/G/K); Tremblay et al. 2013, A&A 557, A7' }
        : { v: 0.015, p: 'derivado' as const, fonte: 'Tremblay et al. 2013, A&A 557, A7 (contraste cai acima de ~7000 K)' };
  const u = T < 3900 ? 0.7 : T < 5300 ? 0.72 : T < 6200 ? 0.62 : T < 7500 ? 0.55 : 0.5;
  return {
    id: c.id,
    nomeNoCatalogo: c.nome,
    ...(c.hip === undefined ? {} : { hip: c.hip }),
    tipo: { texto: c.tipo, v: 0, p: 'medido', fonte },
    teffK: { v: T, p: 'medido', fonte },
    raioRsol: { v: c.raioRsol, p: 'medido', fonte },
    massaMsol: { v: c.massaMsol, p: 'derivado', fonte },
    luminosidadeLsol: { v: c.lum, p: 'derivado', fonte },
    superficie: {
      granuloEmRaios: granulo(T, c.raioRsol, c.massaMsol),
      contrasteGranulos: contraste,
      bordaU: { v: u, p: 'derivado', fonte: CLARET },
      manchas: c.manchas
        ? { v: c.manchas.v, p: 'artistico', fonte: c.manchas.fonte }
        : { v: 0, p: 'artistico', fonte: ARTE_SEM_MANCHAS },
      erupcoes: c.erupcoes ?? false,
      bordaDifusaRaios: { v: 1, p: 'derivado', fonte: 'fotosfera de anã: borda nítida' },
    },
  };
}

const ANFITRIAS: readonly EstrelaVisitavel[] = [
  anfitria({
    id: 'trappist-1', nome: 'TRAPPIST-1', tipo: 'M8.0 V', teffK: 2566, raioRsol: 0.1192, massaMsol: 0.0898,
    lum: 10 ** -3.25727,
    manchas: { v: 0.05, fonte: 'erupções e manchas vistas pelo K2 (Vida et al. 2017, ApJ 841, 124); padrão inventado' },
    erupcoes: true,
  }),
  anfitria({ id: '51-peg', nome: 'Helvetios', hip: 113357, tipo: 'G5 V', teffK: 5761, raioRsol: 1.19, massaMsol: 1.07, lum: 10 ** 0.13631 }),
  anfitria({ id: '55-cnc', nome: 'Copernicus', hip: 43587, tipo: 'G8 V', teffK: 5198, raioRsol: 0.98, massaMsol: 1.015, lum: 10 ** -0.19695 }),
  anfitria({ id: 'tau-cet', nome: 'τ Cet', hip: 8102, tipo: 'G8.5 V', teffK: 5310, raioRsol: 0.83, massaMsol: 0.783, lum: 10 ** -0.30539 }),
  anfitria({
    id: 'eps-eri', nome: 'Ran', hip: 16537, tipo: 'K2 V', teffK: 5020, raioRsol: 0.759, massaMsol: 0.82, lum: 10 ** -0.41928,
    manchas: { v: 0.03, fonte: 'manchas medidas pela fotometria do MOST (Croll et al. 2006, ApJ 648, 607); padrão inventado' },
  }),
  anfitria({ id: 'kepler-186', nome: 'Kepler-186', tipo: 'M1 V', teffK: 3788, raioRsol: 0.472, massaMsol: 0.478, lum: 10 ** -1.385 }),
  anfitria({
    id: 'hd-189733', nome: 'HD 189733', hip: 98505, tipo: 'K2 V', teffK: 5052, raioRsol: 0.75, massaMsol: 0.79, lum: 10 ** -0.46119,
    manchas: { v: 0.02, fonte: 'manchas cruzadas nos trânsitos (Pont et al. 2008, MNRAS 385, 109); padrão inventado' },
  }),
  anfitria({
    id: 'fomalhaut', nome: 'Fomalhaut', hip: 113368, tipo: 'A3 V', teffK: 8590, raioRsol: 1.842, massaMsol: 1.92, lum: 16.63,
    fonte: 'Mamajek 2012, ApJL 754, L20 (de memória)',
  }),
  anfitria({ id: 'bet-pic', nome: 'β Pic', hip: 27321, tipo: 'A6 V', teffK: 8039, raioRsol: 1.544, massaMsol: 1.789, lum: 10 ** 0.95282 }),
];

/**
 * As quatro do piloto. Vega e não Rigel: a forma achatada e o equador
 * mais frio de Vega foram MEDIDOS por interferometria (Monnier 2012) a
 * 7,7 pc; Rigel está a 260 ± 20 pc sem paralaxe boa, e a luminosidade
 * dela varia de 61 mil a 363 mil sóis conforme o método.
 */
export const ESTRELAS_VISITAVEIS: readonly EstrelaVisitavel[] = [PROXIMA, SIRIUS, BETELGEUSE, VEGA, ...ANFITRIAS];

export function estrelaVisitavelPorNome(nomeNoCatalogo: string): EstrelaVisitavel | null {
  return ESTRELAS_VISITAVEIS.find((e) => e.nomeNoCatalogo === nomeNoCatalogo) ?? null;
}
