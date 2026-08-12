// ============================================================
// Fotometria dos 10 pontos da camada `planetas` (D3): magnitude
// absoluta, cor e as duas leis puras que a camada vai usar.
//
// A DOUTRINA. A Onda 4 não infla planeta nenhum (D1): um corpo aparece
// quando o BRILHO APARENTE dele manda, como no céu de verdade. As 328k
// estrelas do campo já vivem assim; os planetas entram na MESMA lei, e
// é por isso que este arquivo só produz magnitudes e cores — nenhum
// tamanho, nenhum escalar didático, nenhuma exposição própria.
//
// DUAS LEIS, DECLARADAS SEPARADAS (`lei` por linha). Misturar as duas
// num campo `H` só seria erro esperando acontecer:
//
//   'planetaria' — H é V(1,0): a magnitude V que o corpo teria a 1 UA
//     do Sol, 1 UA do observador, ângulo de fase 0. A conta completa é
//         m = H + 5·log10(r_UA) + 5·log10(d_obs_UA) − 2,5·log10(Φ(α))
//     e o primeiro par vira `aMagBase` (atributo por corpo, congelado
//     do retrato) porque r é FIXO na época fixa.
//
//   'estelar' — H é M_V, a magnitude absoluta a 10 pc, e a conta é
//         m = M_V + 5·log10(d_pc/10).
//     Só o Sol usa esta; é a lei do CAMPO (o vertex do catálogo).
//
// EQUIVALÊNCIA COM O CAMPO — E A DIFERENÇA MEDIDA DE 0,02 mag. O
// desenho da onda diz que `m = 4,83 + 5·log10(d_pc/10)` é "a MESMA lei
// de `catalogApparentMag`" (lodStellar.ts) com logLum 0. Medido:
// `catalogApparentMag(0, d) = −0,15 + 5·log10(d)`, que é
// `4,85 + 5·log10(d/10)` — o ponto-zero do campo da casa equivale a
// M_V☉ = 4,85, não 4,83. As duas leis têm a MESMA forma e diferem por
// 0,02 mag CONSTANTE (0,9% de fluxo, invisível a olho e a pixel), e a
// diferença é PINADA em fotometria.test.ts para não virar deriva
// silenciosa. Quem escreve o shader do Sol-ponto usa o ponto-zero do
// campo (senão o Sol e as estrelas ao redor deixam de ser comparáveis
// entre si, que é o ponto inteiro da fotometria relativa da D3);
// M_V☉ = 4,83 fica aqui como o valor PUBLICADO de referência.
//
// A COR. Luz de planeta é luz do Sol refletida, então a cor tem dois
// fatores e este arquivo mantém os dois separados:
//   cor = corSolar ⊙ razaoBanda,
// com `razaoBanda` = refletância nas bandas (R, V, B) NORMALIZADA pela
// banda V — o canal verde vale 1 por construção, porque V é
// exatamente a banda em que a magnitude acima é medida. Assim o brilho
// vem da magnitude e SÓ da magnitude; a cor não o contamina.
//   - Para os 8 planetas a razão sai dos ALBEDOS GEOMÉTRICOS POR BANDA
//     publicados (fonte por linha).
//   - Para Plutão, que não tem albedo por banda publicado no mesmo
//     trabalho, sai dos ÍNDICES DE COR (B−V, V−R) contra os do Sol:
//     ρ_B/ρ_V = 10^(−0,4·[(B−V) − (B−V)☉]),
//     ρ_R/ρ_V = 10^(+0,4·[(V−R) − (V−R)☉]).
//   - Para o Sol a razão é [1, 1, 1] POR DEFINIÇÃO: ele é o iluminante.
// O invariante que o teste cobra é a ORDEM DOS CANAIS (Marte r>g>b,
// Urano e Netuno b>g>r, Terra b>r…), nunca o valor exato — a ordem é
// física, o valor é calibração.
//
// FASE LAMBERTIANA É APROXIMAÇÃO, DITO EM VOZ ALTA. `faseLambertiana`
// = (1+cos α)/2 é a lei de uma esfera difusora ideal. Nenhum planeta é
// isso: Mercúrio tem retroespalhamento forte perto de α=0, Vênus tem
// o ponto de inflexão de espalhamento frontal a ~163°, e Saturno tem
// os anéis. As polinomiais por corpo de Mallama & Hilton (2018) são
// PENDÊNCIA NOMEADA DA ONDA 6. Na janela desta onda o observador está
// quase sempre entre o Sol e o corpo ou muito longe dele, onde a
// aproximação vale bem.
//
// FONTES (por linha na tabela abaixo):
//   [MH18] Mallama, A. & Hilton, J.L. 2018, "Computing apparent
//          planetary magnitudes for The Astronomical Almanac",
//          Astronomy and Computing 25, 10–24 (arXiv:1808.01973). O
//          número citado é o termo constante da equação de cada corpo,
//          na forma V = 5·log10(rd) + V(1,0) + termos de fase.
//   [MKP17] Mallama, A., Krobusek, B. & Pavlov, H. 2017,
//          "Comprehensive wide-band magnitudes and albedos for the
//          planets…", Icarus 282, 19–33 (arXiv:1609.05048), Tabela 7
//          (albedos geométricos Johnson-Cousins U B V R I RC IC).
//   [R12]  Ramírez, I. et al. 2012, "The UBV(RI)C colors of the Sun",
//          ApJ 752, 5: (B−V)☉ = 0,653 ± 0,005 e (V−R)C☉ = 0,352 ±
//          0,007.
//   [SBDB] NASA/JPL Small-Body Database, objeto 134340 Pluto,
//          parâmetro H (ref. MPO966248), consultado em 2026-08-11 —
//          [MH18] não cobre Plutão.
//   [RBF94] Reinsch, K., Burwitz, V. & Festou, M.C. 1994, Icarus 108,
//          209: B−V = 0,846 ± 0,010 e V−R = 0,462 ± 0,021 para o par
//          Plutão+Caronte integrado numa rotação (valores citados
//          apud Lorenzi et al. 2016, A&A 585, A131, §1).
// ============================================================

import { bvToColor } from '../../shaders/common';
import type { IdRetrato } from './retrato2026';
import { IDS_RETRATO, RETRATO_2026 } from './retrato2026';

/**
 * (B−V)☉ [R12] — o MESMO número que `SOL_BV` em `heroStars.ts:107`,
 * que já pinta o clarão distante do Sol pela lei do catálogo. Lá ele
 * não é exportado; a igualdade entre os dois é pinada por teste de
 * texto-fonte para a redigitação não poder divergir em silêncio.
 */
export const BV_SOL = 0.653;

/** (V−R)C☉ [R12] — só serve à razão de banda de Plutão. */
export const VR_SOL = 0.352;

/**
 * Cor do Sol em RGB linear pela lei ÚNICA de cor da casa
 * (`bvToColor`, Ballesteros 2012 + corpo negro). É o iluminante de
 * todo o resto desta tabela.
 */
export const COR_SOLAR_LINEAR: readonly [number, number, number] = bvToColor(BV_SOL);

/** Qual das duas leis de magnitude o corpo obedece (ver cabeçalho). */
export type LeiFotometrica = 'planetaria' | 'estelar';

export interface LinhaFotometria {
  readonly id: string;
  readonly lei: LeiFotometrica;
  /** V(1,0) para `lei: 'planetaria'`; M_V para `lei: 'estelar'`. */
  readonly H: number;
  /** Refletância relativa nas bandas (R, V, B), normalizada em V. */
  readonly razaoBanda: readonly [number, number, number];
  /** RGB linear = `COR_SOLAR_LINEAR ⊙ razaoBanda`. */
  readonly corLinear: readonly [number, number, number];
}

/**
 * Albedos geométricos Johnson-Cousins [MKP17, Tab. 7] → razão de
 * refletância (R, V, B) normalizada em V.
 */
function razaoDeAlbedo(
  albedoB: number,
  albedoV: number,
  albedoR: number
): [number, number, number] {
  return [albedoR / albedoV, 1, albedoB / albedoV];
}

/**
 * Índices de cor observados → razão de refletância (R, V, B),
 * normalizada em V, descontando a cor do PRÓPRIO Sol (a luz que o
 * corpo reflete já vem colorida do iluminante).
 */
function razaoDeIndices(bMenosV: number, vMenosR: number): [number, number, number] {
  return [10 ** (0.4 * (vMenosR - VR_SOL)), 1, 10 ** (-0.4 * (bMenosV - BV_SOL))];
}

function linha(
  id: string,
  lei: LeiFotometrica,
  H: number,
  razaoBanda: [number, number, number]
): LinhaFotometria {
  return {
    id,
    lei,
    H,
    razaoBanda,
    corLinear: [
      COR_SOLAR_LINEAR[0] * razaoBanda[0],
      COR_SOLAR_LINEAR[1] * razaoBanda[1],
      COR_SOLAR_LINEAR[2] * razaoBanda[2],
    ],
  };
}

/**
 * Os 10 corpos da camada. FONTE POR LINHA — cada número tem de poder
 * ser rastreado até um trabalho publicado sem sair deste arquivo.
 */
export const FOTOMETRIA: Record<string, LinhaFotometria> = {
  // O Sol é o iluminante: razão de banda [1,1,1] por definição, e M_V
  // publicado de 4,83 (ver a nota de equivalência de 0,02 mag no
  // cabeçalho — o shader usa o ponto-zero do campo, não este).
  sun: linha('sun', 'estelar', 4.83, [1, 1, 1]),

  // H: [MH18] Eq. 2. Albedos B/V/R: [MKP17] 0,105 / 0,142 / 0,172.
  // Cinza-ardósia levemente quente: r > g > b, contraste baixo.
  mercury: linha('mercury', 'planetaria', -0.613, razaoDeAlbedo(0.105, 0.142, 0.172)),

  // H: [MH18] Eq. 3 (α < 163,7°). Albedos: [MKP17] 0,658 / 0,689 / 0,708.
  // Branco-creme das nuvens de ácido sulfúrico: quase neutro, r > b.
  venus: linha('venus', 'planetaria', -4.384, razaoDeAlbedo(0.658, 0.689, 0.708)),

  // H: [MH18] Eq. 5. Albedos: [MKP17] 0,512 / 0,434 / 0,418.
  // O ponto azul pálido — B acima de V acima de R.
  earth: linha('earth', 'planetaria', -3.99, razaoDeAlbedo(0.512, 0.434, 0.418)),

  // H: [MH18] Eq. 6 (α < 50°). Albedos: [MKP17] 0,088 / 0,170 / 0,288.
  // O óxido de ferro: r > g > b com a maior separação da tabela.
  mars: linha('mars', 'planetaria', -1.601, razaoDeAlbedo(0.088, 0.17, 0.288)),

  // H: [MH18] Eq. 8 (α < 12°). Albedos: [MKP17] 0,443 / 0,538 / 0,495.
  // Bege das bandas: V é o pico (g > r > b), com r > b.
  jupiter: linha('jupiter', 'planetaria', -9.395, razaoDeAlbedo(0.443, 0.538, 0.495)),

  // H: [MH18] Eq. 10 — GLOBO + ANÉIS. Os termos de inclinação do anel
  // e de fase da mesma equação NÃO entram nesta onda: o corpo é um
  // ponto sub-resolvido, e a variação de anel é pendência da Onda 6.
  // Albedos: [MKP17] 0,339 / 0,499 / 0,568. Palha dourada: r > g > b.
  saturn: linha('saturn', 'planetaria', -8.914, razaoDeAlbedo(0.339, 0.499, 0.568)),

  // H: [MH18] Eq. 14. Albedos: [MKP17] 0,561 / 0,488 / 0,202.
  // O metano come o vermelho: b > g > r, ciano.
  uranus: linha('uranus', 'planetaria', -7.11, razaoDeAlbedo(0.561, 0.488, 0.202)),

  // H: [MH18] Eq. 17. Albedos: [MKP17] 0,562 / 0,442 / 0,181.
  // Mesma química, mais funda: b > g > r, azul mais saturado que Urano.
  neptune: linha('neptune', 'planetaria', -7.0, razaoDeAlbedo(0.562, 0.442, 0.181)),

  // H: [SBDB] (o H do sistema H,G, que a α = 0 É V(1,0); Plutão é visto
  // da Terra a α < 1,9°, onde a correção de fase é desprezível).
  // Cor: [RBF94] B−V = 0,846, V−R = 0,462 — tolinas avermelhadas,
  // r > g > b.
  pluto: linha('pluto', 'planetaria', -0.55, razaoDeIndices(0.846, 0.462)),
};

/** Os 10 ids da camada: o Sol e os nove do retrato. */
export const IDS_FOTOMETRIA = ['sun', ...IDS_RETRATO] as const;

/**
 * `aMagBase = H + 5·log10(r_UA)` — a metade da lei planetária que a
 * época fixa congela. Vira atributo por vértice: no shader só sobram
 * a distância do observador e a fase.
 */
export function aMagBaseDe(H: number, rUA: number): number {
  return H + 5 * Math.log10(rUA);
}

/**
 * `aMagBase` dos nove, com o r_UA vindo DA EFEMÉRIDE (retrato2026.ts).
 * Se o retrato mudar, isto muda — é o elo que o teste-sentinela cobra.
 */
export const A_MAG_BASE: Record<IdRetrato, number> = Object.fromEntries(
  IDS_RETRATO.map((id) => [id, aMagBaseDe(FOTOMETRIA[id].H, RETRATO_2026[id].rUA)])
) as Record<IdRetrato, number>;

/**
 * Função de fase de uma esfera Lambertiana ideal: 1 em oposição
 * (α = 0), 0 em conjunção (α = π). **APROXIMAÇÃO DECLARADA** — a
 * polinomial por corpo de [MH18] é pendência da Onda 6 (ver cabeçalho).
 */
export function faseLambertiana(alphaRad: number): number {
  return (1 + Math.cos(alphaRad)) / 2;
}

/**
 * Magnitude V aparente de um corpo de lei planetária.
 * `faseLambert` é o FATOR de fase (saída de `faseLambertiana`), não a
 * penalidade em magnitude: fator 1 não cobra nada, fator 0 apaga o
 * corpo (devolve +Infinity — quem desenha decide o piso).
 */
export function magAparente(
  aMagBase: number,
  dObsUA: number,
  faseLambert: number
): number {
  return aMagBase + 5 * Math.log10(dObsUA) - 2.5 * Math.log10(faseLambert);
}

/**
 * Magnitude V aparente de um corpo de lei estelar (só o Sol):
 * `m = M_V + 5·log10(d_pc/10)`. Mesma forma de `catalogApparentMag`
 * (lodStellar.ts) com logLum 0, deslocada dos 0,02 mag de ponto-zero
 * medidos e pinados em teste (ver cabeçalho).
 */
export function magAparenteEstelar(mAbsV: number, dPc: number): number {
  return mAbsV + 5 * Math.log10(dPc / 10);
}
