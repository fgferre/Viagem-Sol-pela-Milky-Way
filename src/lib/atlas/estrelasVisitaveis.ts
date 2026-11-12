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
  readonly hip: number;
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
 * As quatro do piloto. Vega e não Rigel: a forma achatada e o equador
 * mais frio de Vega foram MEDIDOS por interferometria (Monnier 2012) a
 * 7,7 pc; Rigel está a 260 ± 20 pc sem paralaxe boa, e a luminosidade
 * dela varia de 61 mil a 363 mil sóis conforme o método.
 */
export const ESTRELAS_VISITAVEIS: readonly EstrelaVisitavel[] = [PROXIMA, SIRIUS, BETELGEUSE, VEGA];

export function estrelaVisitavelPorNome(nomeNoCatalogo: string): EstrelaVisitavel | null {
  return ESTRELAS_VISITAVEIS.find((e) => e.nomeNoCatalogo === nomeNoCatalogo) ?? null;
}
