/**
 * TODA ESTRELA É UM LUGAR — o piloto (pilar 2 do NORTE, 12/11/2026).
 *
 * A ficha física das estrelas visitáveis, que ganham corpo pelo motor do
 * Sol (`three/world/stellarBody.ts`). O catálogo
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
import { RAIO_SOL_PC } from '../../three/escala';
import { AU_PARA_PC } from './frameGalactico';

export interface Numero {
  readonly v: number;
  readonly p: Procedencia;
  /** autor, ano, revista ou arXiv; para `derivado`, a lei usada. Sai
   *  IGUAL nas duas línguas, então é só citação: o método ("interferometria",
   *  "diâmetro + fluxo") vai em comentário ao lado — palavra solta aqui
   *  aparecia em português na ficha inglesa (crítica de 12/11; a prova é
   *  `ficha.test.ts`, "a fonte que sai igual nas duas línguas") */
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
  /** idade, em bilhões de anos — só onde há medida (asterossismologia) */
  readonly idadeGa?: Numero;
  readonly achatamento?: Achatamento;
  readonly superficie: Superficie;
  readonly companheira?: Companheira;
}

/** a Teff do Sol (K): a régua das concessões que só a física liga */
export const TEFF_DO_SOL_K = 5772;
const TEFF_SOL_K = TEFF_DO_SOL_K;

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
  teffK: { v: 3054, p: 'derivado', fonte: 'Boyajian et al. 2012, ApJ 757, 112' }, // diâmetro + fluxo
  raioRsol: { v: 0.1542, p: 'medido', fonte: 'Boyajian et al. 2012, ApJ 757, 112' }, // interferometria
  massaMsol: { v: 0.1221, p: 'derivado', fonte: 'Mann et al. 2015, ApJ 804, 64' }, // relação massa–M_K
  luminosidadeLsol: { v: 0.001567, p: 'derivado', fonte: 'Pineda et al. 2021, AJ 161, 172' },
  rotacaoDias: { v: 84.9, p: 'medido', fonte: 'Osorio et al. 2026, A&A 711, A116' }, // fotometria
  superficie: {
    granuloEmRaios: granulo(3054, 0.1542, 0.1221),
    // anãs M: convecção eficiente, contraste baixo (Beeck et al. 2013,
    // A&A 558, A48, simulações MURaM de 3000–4000 K)
    contrasteGranulos: { v: 0.04, p: 'derivado', fonte: 'Beeck et al. 2013, A&A 558, A48 (simulação)' },
    bordaU: { v: 0.7, p: 'derivado', fonte: CLARET },
    bordaDifusaRaios: { v: 1, p: 'derivado', fonte: 'fotosfera de anã: borda nítida' },
  },
};

const SIRIUS: EstrelaVisitavel = {
  id: 'sirius',
  nomeNoCatalogo: 'Sirius',
  hip: 32349,
  tipo: { texto: 'A1V', v: 0, p: 'medido', fonte: 'Gray et al. 2003, AJ 126, 2048' },
  teffK: { v: 9845, p: 'derivado', fonte: 'Davis et al. 2011, PASA 28, 58' }, // diâmetro + fluxo
  raioRsol: { v: 1.713, p: 'derivado', fonte: 'Davis et al. 2011, PASA 28, 58 (SUSI)' }, // diâmetro 6,04 mas + paralaxe
  massaMsol: { v: 2.063, p: 'medido', fonte: 'Bond et al. 2017, ApJ 840, 70' }, // órbita
  luminosidadeLsol: { v: 24.7, p: 'derivado', fonte: 'Davis et al. 2011, PASA 28, 58' },
  superficie: {
    granuloEmRaios: granulo(9845, 1.713, 2.063),
    // estrelas A: zona de convecção rasa, quase sem granulação visível
    contrasteGranulos: { v: 0.015, p: 'derivado', fonte: 'Tremblay et al. 2013, A&A 557, A7' },
    bordaU: { v: 0.5, p: 'derivado', fonte: CLARET },
    bordaDifusaRaios: { v: 1, p: 'derivado', fonte: 'fotosfera de anã: borda nítida' },
  },
  companheira: {
    nome: 'Sirius B',
    tipo: 'DA2',
    teffK: { v: 25369, p: 'derivado', fonte: 'Joyce et al. 2018, MNRAS 479, 1612 (HST)' }, // espectro
    raioRsol: { v: 0.0081, p: 'derivado', fonte: 'Joyce et al. 2018, MNRAS 479, 1612' },
    massaMsol: { v: 1.018, p: 'medido', fonte: 'Bond et al. 2017, ApJ 840, 70' }, // órbita
    orbita: {
      periodoAnos: 50.1284,
      periastroAno: 1994.5715,
      aSegArco: 7.4957,
      e: 0.59142,
      iGraus: 136.336,
      nodoGraus: 45.4,
      argPeriastroGraus: 149.161,
      fonte: 'Bond et al. 2017, ApJ 840, 70 (HST)', // astrometria
    },
  },
};

const BETELGEUSE: EstrelaVisitavel = {
  id: 'betelgeuse',
  nomeNoCatalogo: 'Betelgeuse',
  hip: 27989,
  tipo: { texto: 'M1–M2 Ia-ab', v: 0, p: 'medido', fonte: 'Keenan & McNeil 1989, ApJS 71, 245' },
  teffK: { v: 3600, p: 'medido', fonte: 'Levesque & Massey 2020, ApJL 891, L37' }, // espectro
  raioRsol: { v: 764, p: 'derivado', fonte: 'Joyce et al. 2020, ApJ 902, 63' }, // modelos + pulsação
  massaMsol: { v: 18, p: 'derivado', fonte: 'Joyce et al. 2020, ApJ 902, 63 (16,5–19)' },
  luminosidadeLsol: { v: 87100, p: 'derivado', fonte: 'Joyce et al. 2020, ApJ 902, 63' },
  rotacaoDias: { v: 36 * 365.25, p: 'derivado', fonte: 'Kervella et al. 2018, A&A 609, A67 (ALMA)' }, // v sin i 5,5 km/s
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
    // a camada molecular (MOLsphere) a ~1,3 raio borra a borda no
    // infravermelho (Perrin et al. 2004, A&A 418, 675)
    bordaDifusaRaios: { v: 1.3, p: 'medido', fonte: 'Perrin et al. 2004, A&A 418, 675' }, // interferometria
  },
};

/**
 * ALDEBARAN (14/11/2026, o Ato 4 do filme estelar): a gigante laranja no
 * caminho das Híades ao Sol — o que o Sol será. Superfície pela lei de
 * classe das anfitriãs (`superficiePelaTemperatura`): sem simulação própria
 * publicada, nem células gigantes nem borda difusa (campo sem fonte fica de
 * fora). Sem dínamo de tipo solar: gigante fria além da linha de Linsky &
 * Haisch (log g ≈ 1,2), como Betelgeuse.
 */
const ALDEBARAN_R = 45.1;
const ALDEBARAN_T = 3900;
const ALDEBARAN_M = 1.16;
const HATZES_2015 = 'Hatzes et al. 2015, A&A 580, A31';
const FARR_2018 = 'Farr et al. 2018, ApJL 865, L20';
const ALDEBARAN: EstrelaVisitavel = {
  id: 'aldebaran',
  nomeNoCatalogo: 'Aldebaran',
  hip: 21421,
  // o tipo MK do atlas de Perkins (de memória — conferir no catálogo)
  tipo: { texto: 'K5+ III', v: 0, p: 'medido', fonte: 'Keenan & McNeil 1989, ApJS 71, 245' },
  teffK: { v: ALDEBARAN_T, p: 'medido', fonte: HATZES_2015 }, // espectro
  raioRsol: { v: ALDEBARAN_R, p: 'derivado', fonte: HATZES_2015 }, // diâmetro angular + paralaxe
  massaMsol: { v: ALDEBARAN_M, p: 'derivado', fonte: FARR_2018 }, // asterossismologia (TESS/K2) + modelos
  // L = R² (T/T☉)⁴ com o raio e a Teff de Hatzes 2015 (`luminosidadeDe`)
  luminosidadeLsol: { v: luminosidadeDe(ALDEBARAN_R, ALDEBARAN_T), p: 'derivado', fonte: HATZES_2015 },
  // a modulação de ~520 d da velocidade radial, que os autores atribuem à
  // rotação (manchas); INCERTO — derivado, não medido direto
  rotacaoDias: { v: 520, p: 'derivado', fonte: HATZES_2015 },
  idadeGa: { v: 6.4, p: 'derivado', fonte: FARR_2018 }, // asterossismologia + modelos
  superficie: superficiePelaTemperatura(ALDEBARAN_T, ALDEBARAN_R, ALDEBARAN_M),
};

const VEGA: EstrelaVisitavel = {
  id: 'vega',
  nomeNoCatalogo: 'Vega',
  hip: 91262,
  tipo: { texto: 'A0Va', v: 0, p: 'medido', fonte: 'Gray et al. 2003, AJ 126, 2048' },
  // a média do disco; a forma real está em `achatamento`
  teffK: { v: 9600, p: 'derivado', fonte: 'Monnier et al. 2012, ApJL 761, L3' }, // média da superfície do modelo
  raioRsol: { v: 2.726, p: 'medido', fonte: 'Monnier et al. 2012, ApJL 761, L3 (CHARA/MIRC)' }, // raio equatorial
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
    contrasteGranulos: { v: 0.015, p: 'derivado', fonte: 'Tremblay et al. 2013, A&A 557, A7' },
    bordaU: { v: 0.5, p: 'derivado', fonte: CLARET },
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
 * A atividade (manchas, ciclo, erupções, laços) sai da rotação pela lei de
 * Rossby (`atividadeDe`); sem período medido, a rotação é a da lei única
 * `rotacaoDe`. Achatamento não entra: β Pic gira rápido (v sen i ≈ 130 km/s)
 * mas o arquivo não guarda v sen i nem a inclinação — fica redonda.
 */
// a data em ISO: "12/11/2026" lê 11 de dezembro em inglês
const PSCOMP = 'NASA Exoplanet Archive, PSCompPars (2026-11-12)';
// fontes só como citação (a ficha sai nas duas línguas): Tremblay 2013 = o
// contraste da granulação cai acima de ~7000 K; Vida 2017 = fotometria K2

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
  rotacaoDias?: Numero;
}): EstrelaVisitavel {
  const fonte = c.fonte ?? PSCOMP;
  const T = c.teffK;
  return {
    id: c.id,
    nomeNoCatalogo: c.nome,
    ...(c.hip === undefined ? {} : { hip: c.hip }),
    tipo: { texto: c.tipo, v: 0, p: 'medido', fonte },
    teffK: { v: T, p: 'medido', fonte },
    raioRsol: { v: c.raioRsol, p: 'medido', fonte },
    massaMsol: { v: c.massaMsol, p: 'derivado', fonte },
    luminosidadeLsol: { v: c.lum, p: 'derivado', fonte },
    ...(c.rotacaoDias ? { rotacaoDias: c.rotacaoDias } : {}),
    superficie: superficiePelaTemperatura(T, c.raioRsol, c.massaMsol),
  };
}

/** A SUPERFÍCIE PELA LEI DE CLASSE (a do comentário acima): o grânulo de
 *  Tremblay, o contraste e a borda de Claret pela temperatura, borda nítida */
export function superficiePelaTemperatura(T: number, raioRsol: number, massaMsol: number): Superficie {
  const contraste =
    T < 3900
      ? { v: 0.04, p: 'derivado' as const, fonte: 'Beeck et al. 2013, A&A 558, A48 (simulação)' }
      : T < 7000
        ? { v: 0.15, p: 'derivado' as const, fonte: 'como o Sol (estrela F/G/K); Tremblay et al. 2013, A&A 557, A7' }
        : { v: 0.015, p: 'derivado' as const, fonte: 'Tremblay et al. 2013, A&A 557, A7' };
  const u = T < 3900 ? 0.7 : T < 5300 ? 0.72 : T < 6200 ? 0.62 : T < 7500 ? 0.55 : 0.5;
  return {
    granuloEmRaios: granulo(T, raioRsol, massaMsol),
    contrasteGranulos: contraste,
    bordaU: { v: u, p: 'derivado', fonte: CLARET },
    bordaDifusaRaios: { v: 1, p: 'derivado', fonte: 'fotosfera sem atmosfera estendida medida: borda nítida' },
  };
}

const ANFITRIAS: readonly EstrelaVisitavel[] = [
  anfitria({
    id: 'trappist-1', nome: 'TRAPPIST-1', tipo: 'M8.0 V', teffK: 2566, raioRsol: 0.1192, massaMsol: 0.0898,
    lum: 10 ** -3.25727,
    // a modulação do K2, junto com as erupções (de memória)
    rotacaoDias: { v: 3.3, p: 'medido', fonte: 'Vida et al. 2017, ApJ 841, 124' },
  }),
  anfitria({ id: '51-peg', nome: 'Helvetios', hip: 113357, tipo: 'G5 V', teffK: 5761, raioRsol: 1.19, massaMsol: 1.07, lum: 10 ** 0.13631 }),
  anfitria({ id: '55-cnc', nome: 'Copernicus', hip: 43587, tipo: 'G8 V', teffK: 5198, raioRsol: 0.98, massaMsol: 1.015, lum: 10 ** -0.19695 }),
  anfitria({ id: 'tau-cet', nome: 'τ Cet', hip: 8102, tipo: 'G8.5 V', teffK: 5310, raioRsol: 0.83, massaMsol: 0.783, lum: 10 ** -0.30539 }),
  anfitria({ id: 'eps-eri', nome: 'Ran', hip: 16537, tipo: 'K2 V', teffK: 5020, raioRsol: 0.759, massaMsol: 0.82, lum: 10 ** -0.41928 }),
  anfitria({ id: 'kepler-186', nome: 'Kepler-186', tipo: 'M1 V', teffK: 3788, raioRsol: 0.472, massaMsol: 0.478, lum: 10 ** -1.385 }),
  anfitria({ id: 'hd-189733', nome: 'HD 189733', hip: 98505, tipo: 'K2 V', teffK: 5052, raioRsol: 0.75, massaMsol: 0.79, lum: 10 ** -0.46119 }),
  anfitria({
    id: 'fomalhaut', nome: 'Fomalhaut', hip: 113368, tipo: 'A3 V', teffK: 8590, raioRsol: 1.842, massaMsol: 1.92, lum: 16.63,
    // números transcritos de memória do artigo — falta conferir no PDF
    fonte: 'Mamajek 2012, ApJL 754, L20',
  }),
  anfitria({ id: 'bet-pic', nome: 'β Pic', hip: 27321, tipo: 'A6 V', teffK: 8039, raioRsol: 1.544, massaMsol: 1.789, lum: 10 ** 0.95282 }),
];

/**
 * As quatro do piloto. Vega e não Rigel: a forma achatada e o equador
 * mais frio de Vega foram MEDIDOS por interferometria (Monnier 2012) a
 * 7,7 pc; Rigel está a 260 ± 20 pc sem paralaxe boa, e a luminosidade
 * dela varia de 61 mil a 363 mil sóis conforme o método.
 */
export const ESTRELAS_VISITAVEIS: readonly EstrelaVisitavel[] = [
  PROXIMA, SIRIUS, BETELGEUSE, VEGA, ...ANFITRIAS,
  // no fim, para não mudar a vaga de clarão de quem já estava (`2 × índice`)
  ALDEBARAN,
];

export function estrelaVisitavelPorNome(nomeNoCatalogo: string): EstrelaVisitavel | null {
  return ESTRELAS_VISITAVEIS.find((e) => e.nomeNoCatalogo === nomeNoCatalogo) ?? null;
}

// ─── A ATIVIDADE MAGNÉTICA PELA FÍSICA (o motor do Sol para outra estrela) ──

/** O período de rotação do Sol que esta régua usa (o mesmo do motor:
 *  Carrington sideral, `SOL_ROT_PERIOD_DAYS` de `stellarBody.ts`). */
const ROTACAO_SOL_DIAS = 25.38;
/** Faixa de massa em que a calibração de τ vale (Wright et al. 2011). */
const MASSA_MIN_WRIGHT = 0.09;
const MASSA_MAX_WRIGHT = 1.36;
/** Ro de saturação e expoente do regime não saturado (Wright et al. 2011). */
const RO_SATURACAO = 0.13;
const EXPOENTE_ROSSBY = -2.7;
/** Acima desta temperatura não há envelope convectivo que sustente dínamo. */
export const TEFF_SEM_ENVELOPE_K = 7000;
/**
 * O FALLBACK DECLARADO fora da calibração (supergigantes, gigantes, massas
 * fora de 0,09–1,36 M☉): atividade BAIXA, 1 % da do Sol em L_X/L_bol —
 * ARTÍSTICO. Betelgeuse não tem dínamo do tipo solar medido; não há lei a
 * extrapolar, e zero apagaria o motor inteiro.
 */
export const ATIVIDADE_FORA_DA_CALIBRACAO = 0.01;
/**
 * A COMPRESSÃO da razão física para o `activityLevel` do motor (que
 * multiplica os knobs `spots`/`cycle`): nivel = razão^0,3 — ARTÍSTICO,
 * declarado. A razão em L_X/L_bol varia ~4 ordens entre estrelas; o knob
 * do motor foi calibrado num Sol só, e Proxima (~11× o Sol pela lei) sai ~2×.
 */
export const EXPOENTE_DO_NIVEL_DE_ATIVIDADE = 0.3;

/**
 * O LIMITE DA QUEIMA DE HIDROGÊNIO (~0,075 M☉): entre ele e a borda de
 * Wright (0,09) τ é o da borda — declarado. TRAPPIST-1 (0,0898 M☉) fica
 * 0,2 % abaixo da borda; uma anã M8 totalmente convectiva como as de 0,09.
 */
const MASSA_DA_QUEIMA_DE_H = 0.075;

/**
 * O tempo de renovação convectiva, em dias — Wright et al. 2011 (ApJ 743,
 * 48), eq. 11: log τ = 1,16 − 1,49 log(M/M☉) − 0,54 log²(M/M☉), válida em
 * 0,09–1,36 M☉; de 0,075 a 0,09 vale a da borda (`MASSA_DA_QUEIMA_DE_H`).
 * Fora disso devolve null.
 */
export function tempoConvectivoDias(massaMsol: number): number | null {
  if (!(massaMsol >= MASSA_DA_QUEIMA_DE_H && massaMsol <= MASSA_MAX_WRIGHT)) return null;
  const l = Math.log10(Math.max(massaMsol, MASSA_MIN_WRIGHT));
  return Math.pow(10, 1.16 - 1.49 * l - 0.54 * l * l);
}

/** O número de Rossby do Sol na régua acima (P☉ / τ(1 M☉) ≈ 1,76). */
const RO_SOL = ROTACAO_SOL_DIAS / tempoConvectivoDias(1)!;

export interface AtividadeMagnetica {
  /** número de Rossby P_rot/τ (null: sem envelope ou fora da calibração) */
  readonly rossby: number | null;
  /** L_X/L_bol relativa ao Sol (Sol = 1) */
  readonly razao: number;
  /** o `activityLevel` do motor: razao^EXPOENTE (Sol = 1) */
  readonly nivel: number;
  readonly regime: 'sem envelope' | 'saturado' | 'nao saturado' | 'fora da calibracao';
}

/**
 * A ATIVIDADE MAGNÉTICA pela rotação e pela massa (Wright et al. 2011):
 * L_X/L_bol ∝ Ro^−2,7 abaixo da saturação, constante para Ro < 0,13;
 * normalizada pelo Sol (M = 1, P = 25,38 d → 1 exato: (Ro/Ro☉) = 1).
 * Sem envelope convectivo (T ≳ 7.000 K) → 0. Fora da faixa de massa ou sem
 * período → o fallback declarado.
 */
export function atividadeMagnetica(
  teffK: number,
  massaMsol: number,
  rotacaoDias: number | undefined
): AtividadeMagnetica {
  if (teffK >= TEFF_SEM_ENVELOPE_K) return { rossby: null, razao: 0, nivel: 0, regime: 'sem envelope' };
  const tau = tempoConvectivoDias(massaMsol);
  if (tau === null || !(rotacaoDias !== undefined && rotacaoDias > 0)) {
    return {
      rossby: null,
      razao: ATIVIDADE_FORA_DA_CALIBRACAO,
      nivel: Math.pow(ATIVIDADE_FORA_DA_CALIBRACAO, EXPOENTE_DO_NIVEL_DE_ATIVIDADE),
      regime: 'fora da calibracao',
    };
  }
  const rossby = rotacaoDias / tau;
  const saturado = rossby < RO_SATURACAO;
  const razao = Math.pow((saturado ? RO_SATURACAO : rossby) / RO_SOL, EXPOENTE_ROSSBY);
  return {
    rossby,
    razao,
    nivel: Math.pow(razao, EXPOENTE_DO_NIVEL_DE_ATIVIDADE),
    regime: saturado ? 'saturado' : 'nao saturado',
  };
}

/**
 * A ROTAÇÃO DE UMA ESTRELA VISITÁVEL — a lei ÚNICA para quem não tem período
 * medido (12/11):
 *  · medido nos dados → ele;
 *  · com envelope convectivo e τ calibrado → o NÚMERO DE ROSSBY DO SOL,
 *    P = Ro☉·τ(M) (`derivado`): estrelas de campo, velhas, convergem para
 *    perto dele — o freio magnético enfraquece em Ro ≈ Ro☉ (van Saders et
 *    al. 2016, Nature 529, 181). Dá atividade 1, "como o Sol", às anfitriãs
 *    G/K/M sem medida;
 *  · sem envelope (estrelas A) ou fora da calibração → o período do Sol,
 *    ARTÍSTICO (o disco de uma estrela A é liso: o giro não se vê).
 */
export function rotacaoDe(e: EstrelaVisitavel): Numero {
  if (e.rotacaoDias) return e.rotacaoDias;
  const tau = e.teffK.v < TEFF_SEM_ENVELOPE_K ? tempoConvectivoDias(e.massaMsol.v) : null;
  if (tau !== null) {
    return {
      v: RO_SOL * tau,
      p: 'derivado',
      fonte: 'número de Rossby do Sol × τ de Wright et al. 2011 (van Saders et al. 2016, Nature 529, 181)',
    };
  }
  return { v: ROTACAO_SOL_DIAS, p: 'artistico', fonte: 'sem período medido: o do Sol, escolha nossa' };
}

/**
 * A ATIVIDADE DE UMA ESTRELA VISITÁVEL pela rotação da lei única
 * (`rotacaoDe`). Quem gira pelo Rossby do Sol tem atividade EXATAMENTE 1
 * (a conta Ro☉·τ/τ não volta ao mesmo bit, e 1 é o que o motor pula).
 */
export function atividadeDe(e: EstrelaVisitavel): AtividadeMagnetica {
  const r = rotacaoDe(e);
  if (!e.rotacaoDias && r.p === 'derivado') return { rossby: RO_SOL, razao: 1, nivel: 1, regime: 'nao saturado' };
  return atividadeMagnetica(e.teffK.v, e.massaMsol.v, e.rotacaoDias?.v);
}

/**
 * A LINHA DE LINSKY & HAISCH (1979, ApJL 229, L27): gigantes e
 * supergigantes frias (aqui: log g < 3,5 e Teff < 4.500 K) não têm coroa
 * quente nem dínamo de tipo solar — no lugar, vento frio e uma atmosfera
 * molecular estendida. As duas fronteiras são aproximadas da linha (K1–K3
 * III), declaradas.
 */
const LOG_G_DAS_GIGANTES = 3.5;
const TEFF_DA_LINHA_DE_LINSKY_HAISCH_K = 4500;
const LOG_G_DO_SOL = 4.438;

/** log g (cgs) pela massa e pelo raio: g ∝ M/R² ancorado no Sol. */
export function logGravidade(massaMsol: number, raioRsol: number): number {
  return LOG_G_DO_SOL + Math.log10(massaMsol / (raioRsol * raioRsol));
}

/**
 * O DÍNAMO DE TIPO SOLAR (o portão `dinamo` do motor do Sol): envelope
 * convectivo (Teff < `TEFF_SEM_ENVELOPE_K`) E não estar além da linha de
 * Linsky & Haisch. Sem ele o motor não constrói manchas, ciclo, laços,
 * proeminências, espículas, erupções, CME nem coroa quente.
 */
export function temDinamoSolar(e: { teffK: Numero; massaMsol: Numero; raioRsol: Numero }): boolean {
  if (e.teffK.v >= TEFF_SEM_ENVELOPE_K) return false;
  const gigante = logGravidade(e.massaMsol.v, e.raioRsol.v) < LOG_G_DAS_GIGANTES;
  return !(gigante && e.teffK.v < TEFF_DA_LINHA_DE_LINSKY_HAISCH_K);
}

// ─── AS PARTES PURAS DO CORPO (vindas do motor simples, apagado em 12/11) ──

/** O raio físico de enquadramento (o EQUATORIAL, o maior), em pc. */
export function raioDaEstrelaPc(e: EstrelaVisitavel): number {
  return e.raioRsol.v * RAIO_SOL_PC;
}

/**
 * A CONCESSÃO CINEMATOGRÁFICA DOS GRÂNULOS — a MESMA que o Sol já faz, e
 * declarada como artística no selo. O motor do Sol mostra a textura de
 * convecção na frequência `granFreq` sobre a esfera unitária (22/30/34 nos
 * três tiers): célula visível de ~1/30 do raio, contra os 1,87e-3 R☉ do
 * grânulo real — ~18× maior. Sem a concessão, a disco cheio toda anã seria
 * um disco liso ao lado de um Sol granulado.
 *
 * Cada estrela herda o MESMO fator, e a lei física relativa fica de pé: o
 * tamanho na tela é `granuloEmRaios × ESCALA` (Proxima ~0,67× o do Sol,
 * Sirius ~1,4×, Vega ~2×). TETO: um grânulo para de crescer em 0,1 R
 * (passado isso deixa de ser granulação e vira célula gigante — é o caso de
 * Betelgeuse, cujas células gigantes reais de 0,6 R não precisam de
 * concessão nenhuma); nunca fica MENOR que o físico.
 */
export const GRANULO_DO_SOL_NA_TELA_EM_RAIOS = 1 / 30;
const ESCALA_CINEMATOGRAFICA_DOS_GRANULOS = GRANULO_DO_SOL_NA_TELA_EM_RAIOS / GRANULO_SOL_EM_RAIOS;
const TETO_DO_GRANULO_NA_TELA_EM_RAIOS = 0.1;

export function granuloNaTelaEmRaios(granuloEmRaios: number): number {
  return Math.max(
    granuloEmRaios,
    Math.min(granuloEmRaios * ESCALA_CINEMATOGRAFICA_DOS_GRANULOS, TETO_DO_GRANULO_NA_TELA_EM_RAIOS)
  );
}

/** O contraste rms real da granulação do Sol (a régua do contraste relativo). */
export const CONTRASTE_REAL_DO_SOL = 0.15;

/**
 * O PISO DO CONTRASTE NA TELA — a concessão gêmea da do tamanho do grânulo,
 * ARTÍSTICA, declarada: nenhuma superfície com zona convectiva sai mais lisa
 * que a da anã M (0,04, Beeck et al. 2013). As estrelas A têm zonas finas de
 * ionização do H e do He que as simulações 3D e o "flicker" do Kepler dão
 * como granulação de baixo contraste (~1–2 %, Tremblay et al. 2013; Kallinger
 * & Matthews 2010) — invisível no disco; o piso a EXTRAPOLA para a tela.
 * Não vale para a anã branca (a companheira: contraste 0).
 */
export const PISO_DO_CONTRASTE_NA_TELA = 0.04;

/**
 * Sob as CÉLULAS GIGANTES, os grânulos pequenos são TÊNUES: o contraste
 * medido nas simulações (0,25 em Betelgeuse) é o das gigantes, que dominam a
 * imagem; os grânulos por cima levam 20 % dele — ARTÍSTICO, declarado
 * (a segunda escala, visível de perto sem cobrir as células).
 */
export const FRACAO_DOS_GRANULOS_SOB_AS_GIGANTES = 0.2;

const GRAU = Math.PI / 180;
const JD_J2000 = 2451545;
const DIAS_POR_ANO = 365.25;

/**
 * A POSIÇÃO DA COMPANHEIRA RELATIVA À PRINCIPAL (hoje: Sirius B), em pc na
 * base da cena (equatorial J2000), no instante `jd`. Kepler + Thiele–Innes
 * sobre o plano do céu na direção de A; o semieixo em UA é `aSegArco × dPc`
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
