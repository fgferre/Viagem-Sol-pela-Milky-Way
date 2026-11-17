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
import { giroDe, periodoDoGiroDias, wDaVelocidade, wDoPeriodo } from '../../three/world/giroDaEstrela';

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
  /** só onde há medida; sem ela, a lei única (`rotacaoDe`) */
  readonly rotacaoDias?: Numero;
  /** v·sen i, km/s — o giro mínimo (`achatamentoDe`) */
  readonly vSenIKms?: Numero;
  readonly orbita: Orbita;
}

/**
 * A companheira com a ÓRBITA medida mas sem tamanho nem temperatura medidos
 * (Dubhe B: o tipo dela vai de A3 a F7 conforme o autor). Entra na ficha;
 * não ganha corpo — desenhá-la pediria inventar o raio e a cor.
 */
export interface CompanheiraSemCorpo {
  readonly nome: string;
  readonly massaMsol?: Numero;
  readonly orbita: Orbita;
}

/** Forma de rotação rápida: elipsoide de Roche + escurecimento gravitacional. */
export interface Achatamento {
  readonly raioPolarRsol: Numero;
  readonly raioEquatorialRsol: Numero;
  readonly teffPoloK: Numero;
  readonly teffEquadorK: Numero;
  /** ângulo entre o eixo de rotação e a linha de visada da Terra (ausente:
   *  eixo desconhecido, o +Y do motor) */
  readonly inclinacaoGraus?: Numero;
  /** expoente de von Zeipel, T ∝ g^β — o do MODELO MEDIDO, que liga o polo
   *  ao equador pela lei do próprio artigo. Ausente no achatamento derivado:
   *  lá a temperatura por latitude é a de Espinosa Lara & Rieutord 2011, sem
   *  expoente (`perfilDeELR`) */
  readonly betaGravidade?: Numero;
  /** derivado de v·sen i com i = 90°: o achatamento MÍNIMO */
  readonly limiteInferior?: true;
  /** o giro derivado passou de Ω/Ω_c = 0,96 e foi grampeado (`TETO_DO_GIRO`) */
  readonly noTeto?: true;
}

export interface Superficie {
  /** tamanho típico do grânulo, em raios da estrela (`tamanhoDoGranulo`) */
  readonly granuloEmRaios: Numero;
  /** contraste de intensidade dos grânulos (rms, fração) */
  readonly contrasteGranulos: Numero;
  /** escurecimento de borda linear na banda V: I(μ)/I(1) = 1 − u(1 − μ) */
  readonly bordaU: Numero;
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
  /** v·sen i, km/s (espectro): sem período, o giro MÍNIMO (`achatamentoDe`) */
  readonly vSenIKms?: Numero;
  /** idade, em bilhões de anos — só onde há medida (asterossismologia) */
  readonly idadeGa?: Numero;
  readonly achatamento?: Achatamento;
  readonly superficie: Superficie;
  readonly companheira?: Companheira;
  readonly companheiraSemCorpo?: CompanheiraSemCorpo;
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
    contrasteGranulos: { v: 0.25, p: 'derivado', fonte: 'Chiavassa et al. 2010, A&A 515, A12 (simulação 3D)' },
    bordaU: { v: 0.8, p: 'derivado', fonte: CLARET },
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

/**
 * CAPELLA É UM PAR de gigantes amarelas a 0,74 UA uma da outra, uma volta a
 * cada 104 dias. O catálogo a traz como uma estrela só, "M1: comp" (o tipo
 * descreve o par), e a regra única a lia como gigante vermelha de 3.750 K e
 * 55 R☉. Todos os números de Torres, Claret, Pavlovski & Dotter 2015 (ApJ
 * 807, 26; arXiv:1505.07461), lidos no artigo em 16/11/2026: tabela 1 (a
 * órbita, astrometria + velocidades radiais) e tabela 3 (as duas estrelas).
 * A principal aqui é a Aa (a mais massiva e maior); a Ab é a companheira.
 */
const TORRES_2015 = 'Torres et al. 2015, ApJ 807, 26';
const CAPELLA: EstrelaVisitavel = {
  id: 'capella',
  nomeNoCatalogo: 'Capella',
  hip: 24608,
  tipo: { texto: 'G8 III', v: 0, p: 'medido', fonte: TORRES_2015 }, // o par é G8 III + G0 III
  teffK: { v: 4970, p: 'medido', fonte: TORRES_2015 }, // espectro (±50 K)
  raioRsol: { v: 11.98, p: 'medido', fonte: TORRES_2015 }, // diâmetro angular + paralaxe orbital (±0,57)
  massaMsol: { v: 2.5687, p: 'medido', fonte: TORRES_2015 }, // órbita (±0,0074)
  luminosidadeLsol: { v: 78.7, p: 'derivado', fonte: TORRES_2015 }, // ±4,2
  rotacaoDias: { v: 104, p: 'medido', fonte: TORRES_2015 }, // ±3 d: gira presa à órbita
  idadeGa: { v: 0.62, p: 'derivado', fonte: TORRES_2015 }, // 590–650 Ma, modelos de evolução
  superficie: superficiePelaTemperatura(4970, 11.98, 2.5687),
  companheira: {
    nome: 'Capella Ab',
    tipo: 'G0 III',
    teffK: { v: 5730, p: 'medido', fonte: TORRES_2015 }, // ±60 K
    raioRsol: { v: 8.83, p: 'medido', fonte: TORRES_2015 }, // ±0,33
    massaMsol: { v: 2.4828, p: 'medido', fonte: TORRES_2015 }, // ±0,0067
    rotacaoDias: { v: 8.5, p: 'medido', fonte: TORRES_2015 }, // ±0,2 d: ainda não freou
    orbita: {
      periodoAnos: 104.02128 / 365.25,
      // T do periastro HJD 2.448.147,6 (±2,6 d; a órbita é quase um círculo)
      periastroAno: 2000 + (2448147.6 - 2451545) / 365.25,
      aSegArco: 0.056442,
      e: 0.00089,
      iGraus: 137.156,
      nodoGraus: 40.522,
      // o artigo dá ω da primária (342,6°); a órbita relativa da secundária é ω + 180°
      argPeriastroGraus: 162.6,
      fonte: TORRES_2015,
    },
  },
};

/**
 * DUBHE É UMA GIGANTE LARANJA com uma companheira a ~22 UA, uma volta a cada
 * 44 anos. O catálogo a traz como "F7V comp" (o tipo é o da MISTURA das
 * duas luzes), e a regra única a relia como supergigante. Lidos nos artigos
 * em 16/11/2026:
 *   - raio, temperatura e luminosidade da principal: Baines et al. 2025 (AJ
 *     169, 293; arXiv:2506.02912), tabela 7 — diâmetro angular medido no
 *     NPOI (θ_LD 6,749 ± 0,008 mas) + paralaxe Hipparcos;
 *   - tipo, massas e a órbita: Gray 2018 (ApJ 869, 81). O tipo K0 III é o
 *     de uso (Gray prefere K0 II–III); as massas são as astrométricas de
 *     Gontcharov & Kiyaeva 2002 que ele cita (3,7 ± 0,4 e 2,5 ± 0,4 M☉), e
 *     ele mesmo as chama de incertas; a órbita é a visual de Scardia et al.
 *     2011 (speckle), copiada da tabela 2 dele com os valores PUBLICADOS.
 * A companheira não tem tamanho nem temperatura medidos (Gray não acha o
 * espectro dela; o tipo vai de A3 a F7 conforme o autor): fica só na ficha.
 * A rotação da principal tem só limite superior (< 1,35 ano): vale a lei.
 */
const BAINES_2025 = 'Baines et al. 2025, AJ 169, 293';
const GRAY_2018 = 'Gray 2018, ApJ 869, 81';
const DUBHE: EstrelaVisitavel = {
  id: 'dubhe',
  nomeNoCatalogo: 'Dubhe',
  hip: 54061,
  tipo: { texto: 'K0 III', v: 0, p: 'medido', fonte: GRAY_2018 },
  teffK: { v: 4810, p: 'derivado', fonte: BAINES_2025 }, // diâmetro + fluxo bolométrico (±22 K)
  raioRsol: { v: 27.33, p: 'medido', fonte: BAINES_2025 }, // +0,49 −0,50
  massaMsol: { v: 3.7, p: 'derivado', fonte: `Gontcharov & Kiyaeva 2002; ${GRAY_2018}` }, // ±0,4, astrometria
  luminosidadeLsol: { v: 360.8, p: 'derivado', fonte: BAINES_2025 },
  superficie: superficiePelaTemperatura(4810, 27.33, 3.7),
  companheiraSemCorpo: {
    nome: 'Dubhe B',
    massaMsol: { v: 2.5, p: 'derivado', fonte: `Gontcharov & Kiyaeva 2002; ${GRAY_2018}` }, // ±0,4
    orbita: {
      periodoAnos: 44.45,
      periastroAno: 2002.17,
      aSegArco: 0.59,
      e: 0.439,
      iGraus: 159.9,
      nodoGraus: 9.3,
      argPeriastroGraus: 232.8,
      fonte: `Scardia et al. 2011; ${GRAY_2018}`,
    },
  },
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
  },
};

/**
 * AS OUTRAS TRÊS ROTADORAS COM FORMA MEDIDA (16/11/2026), pelo molde de Vega:
 * os raios, as temperaturas de polo e equador e a inclinação são os do modelo
 * de interferometria de cada uma. O tipo é o do catálogo do app. A Teff da
 * ficha é a MÉDIA DA SUPERFÍCIE do modelo (∫T⁴dS sobre a forma de Roche com
 * T ∝ g^β entre as duas pontas), e o período sai do giro do modelo
 * (w² = 2(Re/Rp − 1), Ω = w·√(GM/Re³)): Altair 8,6 h, Régulo 15,0 h,
 * Achernar 37,6 h. Conferência das contas: a luminosidade integrada do
 * modelo dá 342 L☉ em Régulo (o artigo: 341; o de Altair não dá a
 * luminosidade, e os 10,4 L☉ da ficha são os da integral), e Ω/Ω_c dá
 * 0,923, 0,964 e 0,98 (os artigos: 0,923, 0,962 e 0,98).
 */
// as fontes só como citação (a ficha sai nas duas línguas); o que cada
// número é está no comentário ao lado
const TIPO_DO_CATALOGO = 'HYG 4.4';
// arXiv 0706.0867, Tabela 1, a coluna do modelo de β livre: inclinação
// 57,2 ± 1,9°, Rp 1,634 ± 0,011, Re 2,029 ± 0,007 R☉, polo 8.450 ± 140 K,
// equador 6.860 ± 150 K, β 0,190 ± 0,012, ω 0,923 (conferida em 16/11; a
// coluna de β fixo em 0,25 dá 62,7°, 1,661/2,022 R☉ e 8.710/6.850 K)
const MONNIER_2007 = 'Monnier et al. 2007, Science 317, 342 (CHARA/MIRC)';
const ALTAIR: EstrelaVisitavel = {
  id: 'altair',
  nomeNoCatalogo: 'Altair',
  hip: 97649,
  tipo: { texto: 'A7IV-V', v: 0, p: 'medido', fonte: TIPO_DO_CATALOGO },
  teffK: { v: 7570, p: 'derivado', fonte: MONNIER_2007 }, // média da superfície do modelo
  raioRsol: { v: 2.029, p: 'medido', fonte: MONNIER_2007 }, // raio equatorial
  massaMsol: { v: 1.791, p: 'derivado', fonte: MONNIER_2007 },
  luminosidadeLsol: { v: 10.4, p: 'derivado', fonte: MONNIER_2007 }, // integrada sobre a superfície do modelo
  rotacaoDias: { v: 0.3598, p: 'derivado', fonte: MONNIER_2007 }, // o giro do modelo, Ω/Ω_c = 0,923
  achatamento: {
    raioPolarRsol: { v: 1.634, p: 'medido', fonte: MONNIER_2007 },
    raioEquatorialRsol: { v: 2.029, p: 'medido', fonte: MONNIER_2007 },
    teffPoloK: { v: 8450, p: 'medido', fonte: MONNIER_2007 },
    teffEquadorK: { v: 6860, p: 'medido', fonte: MONNIER_2007 },
    inclinacaoGraus: { v: 57.2, p: 'medido', fonte: MONNIER_2007 },
    betaGravidade: { v: 0.19, p: 'medido', fonte: MONNIER_2007 },
  },
  superficie: superficiePelaTemperatura(7570, 2.029, 1.791),
};

// arXiv 1105.0740
const CHE_2011 = 'Che et al. 2011, ApJ 732, 68 (CHARA/MIRC)';
const REGULUS: EstrelaVisitavel = {
  id: 'regulus',
  nomeNoCatalogo: 'Regulus',
  hip: 49669,
  tipo: { texto: 'B7V', v: 0, p: 'medido', fonte: TIPO_DO_CATALOGO },
  teffK: { v: 12730, p: 'derivado', fonte: CHE_2011 }, // média da superfície do modelo
  raioRsol: { v: 4.21, p: 'medido', fonte: CHE_2011 }, // raio equatorial
  massaMsol: { v: 4.15, p: 'derivado', fonte: CHE_2011 },
  luminosidadeLsol: { v: 341, p: 'derivado', fonte: CHE_2011 },
  rotacaoDias: { v: 0.6264, p: 'derivado', fonte: CHE_2011 }, // o giro do modelo, Ω/Ω_c = 0,962
  achatamento: {
    raioPolarRsol: { v: 3.22, p: 'medido', fonte: CHE_2011 },
    raioEquatorialRsol: { v: 4.21, p: 'medido', fonte: CHE_2011 },
    teffPoloK: { v: 14520, p: 'medido', fonte: CHE_2011 },
    teffEquadorK: { v: 11010, p: 'medido', fonte: CHE_2011 },
    inclinacaoGraus: { v: 86.3, p: 'medido', fonte: CHE_2011 },
    betaGravidade: { v: 0.188, p: 'medido', fonte: CHE_2011 },
  },
  superficie: superficiePelaTemperatura(12730, 4.21, 4.15),
};

// Achernar: a forma, a inclinação e o β são de Domiciano de Souza et al. 2014
// (A&A 569, A10; VLTI/PIONIER), lidos em Kervella et al. 2022, que os cita
// (a página do artigo de 2014 não abriu); a massa (dinâmica, da órbita da
// companheira), a luminosidade e a Teff média são de Kervella 2022. As
// temperaturas de polo e equador NÃO foram lidas no artigo: saem do β medido
// e da luminosidade sobre a forma de Roche (a Teff média que a conta devolve,
// 15.544 K, bate com os 15.539 K medidos). Ficou de fora o conjunto anterior
// (Domiciano de Souza et al. 2012, VLTI/AMBER), mais antigo. O disco de gás
// da estrela Be não é daqui.
// arXiv 2209.07537
const KERVELLA_2022 = 'Kervella et al. 2022, A&A 667, A111';
const DOMICIANO_2014 = `Domiciano de Souza et al. 2014, A&A 569, A10 (VLTI/PIONIER); ${KERVELLA_2022}`;
const ACHERNAR: EstrelaVisitavel = {
  id: 'achernar',
  nomeNoCatalogo: 'Achernar',
  hip: 7588,
  tipo: { texto: 'B3Vp', v: 0, p: 'medido', fonte: TIPO_DO_CATALOGO },
  teffK: { v: 15539, p: 'derivado', fonte: KERVELLA_2022 },
  raioRsol: { v: 9.16, p: 'medido', fonte: DOMICIANO_2014 }, // raio equatorial
  massaMsol: { v: 5.99, p: 'medido', fonte: KERVELLA_2022 },
  luminosidadeLsol: { v: 3493, p: 'derivado', fonte: KERVELLA_2022 },
  rotacaoDias: { v: 1.568, p: 'derivado', fonte: DOMICIANO_2014 }, // o giro da forma medida
  achatamento: {
    raioPolarRsol: { v: 6.785, p: 'derivado', fonte: DOMICIANO_2014 }, // Re/Rp = 1,35 ± 0,07
    raioEquatorialRsol: { v: 9.16, p: 'medido', fonte: DOMICIANO_2014 },
    teffPoloK: { v: 17740, p: 'derivado', fonte: DOMICIANO_2014 }, // β medido e luminosidade sobre a forma de Roche
    teffEquadorK: { v: 13150, p: 'derivado', fonte: DOMICIANO_2014 }, // β medido e luminosidade sobre a forma de Roche
    inclinacaoGraus: { v: 60.6, p: 'medido', fonte: DOMICIANO_2014 },
    betaGravidade: { v: 0.166, p: 'medido', fonte: DOMICIANO_2014 },
  },
  superficie: superficiePelaTemperatura(15539, 9.16, 5.99),
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
 * `rotacaoDe`. O achatamento sai da regra única (`achatamentoDe`): β Pic
 * gira rápido, e a v·sen i medida (130 km/s, Royer et al. 2007) dá o giro
 * MÍNIMO, com o eixo a 90° da linha de visada.
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
  vSenIKms?: Numero;
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
    ...(c.vSenIKms ? { vSenIKms: c.vSenIKms } : {}),
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
  anfitria({
    id: 'bet-pic', nome: 'β Pic', hip: 27321, tipo: 'A6 V', teffK: 8039, raioRsol: 1.544, massaMsol: 1.789, lum: 10 ** 0.95282,
    vSenIKms: { v: 130, p: 'medido', fonte: 'Royer et al. 2007, A&A 463, 671; Hoeijmakers et al. 2018, A&A 617, A144' },
  }),
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
  CAPELLA,
  DUBHE,
  ALTAIR,
  REGULUS,
  ACHERNAR,
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
  // só v·sen i: P = 2πRe/v com i = 90°, um LIMITE SUPERIOR do período (com
  // o w grampeado no teto, o período do giro desenhado)
  if (e.vSenIKms && e.vSenIKms.v > 0) {
    const w = giroDaFicha(e)?.w ?? wDaVelocidade(e.vSenIKms.v, e.massaMsol.v, e.raioRsol.v);
    return {
      v: periodoDoGiroDias(w, e.massaMsol.v, e.raioRsol.v),
      p: 'derivado',
      fonte: e.vSenIKms.fonte,
    };
  }
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
  if (!e.rotacaoDias && !e.vSenIKms && r.p === 'derivado') return { rossby: RO_SOL, razao: 1, nivel: 1, regime: 'nao saturado' };
  // com só v·sen i, o período é um limite superior: a atividade, um mínimo
  return atividadeMagnetica(e.teffK.v, e.massaMsol.v, e.rotacaoDias?.v ?? (e.vSenIKms ? r.v : undefined));
}

/** o giro derivado dos dados (`giroDaEstrela.ts`): o período da ficha ou a v·sen i */
function giroDaFicha(e: EstrelaVisitavel) {
  const M = e.massaMsol.v;
  const R = e.raioRsol.v;
  // a âncora é a Teff MÉDIA da ficha (a que dá a cor e o brilho do corpo): a
  // luminosidade que entra é a de Stefan-Boltzmann do raio e da Teff, não a
  // da ficha — medidas em separado, as três nem sempre fecham, e a sobra
  // escurecia ou clareava o disco inteiro (Betelgeuse, 1 %)
  const L = luminosidadeDe(R, e.teffK.v);
  if (e.rotacaoDias) return giroDe(wDoPeriodo(e.rotacaoDias.v, M, R), R, L);
  if (e.vSenIKms && e.vSenIKms.v > 0) return giroDe(wDaVelocidade(e.vSenIKms.v, M, R), R, L);
  return null;
}

/**
 * O ACHATAMENTO DE UMA ESTRELA VISITÁVEL — a regra ÚNICA (16/11):
 *  · o MODELO MEDIDO (interferometria: `achatamento`) vale como está (Vega);
 *  · senão o giro DOS DADOS, pela forma de Roche e as temperaturas de
 *    Espinosa Lara & Rieutord 2011 (`giroDaEstrela.ts`), sobre a massa e o
 *    raio médio da ficha: (b) o período da ficha (`rotacaoDias`, qualquer
 *    procedência — NUNCA a lei `rotacaoDe`, que inventa um período para a
 *    atividade e achataria gigantes à toa), eixo desconhecido (o +Y do
 *    motor, o de sempre); (c) só v·sen i: i = 90°, o achatamento MÍNIMO;
 *  · abaixo do limiar (`LIMIAR_DO_ACHATAMENTO`) ou sem giro: redonda.
 */
export function achatamentoDe(e: EstrelaVisitavel): Achatamento | undefined {
  if (e.achatamento) return e.achatamento;
  const g = giroDaFicha(e);
  if (!g) return undefined;
  const entrada = e.rotacaoDias ? e.rotacaoDias.fonte : (e.vSenIKms?.fonte ?? '');
  const d = (v: number): Numero => ({
    v,
    p: 'derivado',
    fonte: `Espinosa Lara & Rieutord 2011, A&A 533, A43; ${entrada}`,
  });
  return {
    raioPolarRsol: d(g.raioPolarRsol),
    raioEquatorialRsol: d(g.raioEquatorialRsol),
    teffPoloK: d(g.teffPoloK),
    teffEquadorK: d(g.teffEquadorK),
    ...(e.rotacaoDias
      ? {}
      : {
          inclinacaoGraus: { v: 90, p: 'artistico', fonte: '' },
          limiteInferior: true,
        }),
    ...(g.noTeto ? { noTeto: true } : {}),
  };
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

/**
 * O raio físico de enquadramento e de piso da câmera, em pc: o EQUATORIAL, o
 * maior. Numa achatada pela regra (`achatamentoDe`) o raio da ficha é o
 * médio, e o equatorial sai do achatamento — senão a câmera parava até 12 %
 * para dentro do equador (no teto do giro).
 */
export function raioDaEstrelaPc(e: EstrelaVisitavel): number {
  return (achatamentoDe(e)?.raioEquatorialRsol.v ?? e.raioRsol.v) * RAIO_SOL_PC;
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
