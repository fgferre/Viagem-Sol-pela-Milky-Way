// ============================================================
// Fotometria dos pontos da camada `planetas` (D3): magnitude absoluta,
// cor e as duas leis puras que a camada vai usar. São os dez do retrato
// (o Sol e os nove) MAIS a Lua, que entrou em 30/08 pelo item 108 — e a
// diferença entre os dois grupos é o RETRATO, não a lei: a Lua não tem
// posição congelada (o retrato não tem satélites), então quem escreve
// onde o ponto dela está é o corpo resolvido, todo quadro. Ver
// {@link IDS_DOS_PONTOS}.
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
// FASE: Lambert é a esfera difusora ideal. MH18 (Mallama & Hilton
// 2018) é a polinomial POR CORPO no ponto fotométrico, com política
// de domínio (D10): DENTRO do α da EQUAÇÃO publicada, clamp na borda
// + emenda CONTÍNUA com Lambert fora (razão Φ_MH/Φ_L pinada na
// costura). O teto NÃO é o α máximo visto da Terra (3,1° Urano /
// 1,9° Netuno): a câmera voa por dentro do sistema. Saturno leva o
// termo de anel (−1,825 sin β + …) com β = √(βE βS) de mesmo sinal
// (Eq. 10). Plutão não tem MH18 — fica Lambert. A LUA tem lei própria
// [ALLEN76], que entra pela MESMA política de domínio: a polinomial
// dentro de 150°, a mesma emenda contínua com Lambert fora. É por isso
// que o despachante se chama `fatorDeFaseDoPonto` e não mais
// `fatorDeFaseMh18` — ele serve TRÊS leis, e o nome dizia uma.
//
// POR QUE LAMBERT NÃO SERVIRIA À LUA, e é a razão de a lei própria
// entrar junto com o ponto: no quarto (α = 90°) Lambert dá Φ = 0,50 e a
// Lua real dá 0,091 (Δm = 2,60 mag pela lei abaixo) — a Lua cheia é
// mais de cinco vezes mais brilhante do que a esfera difusora prevê, e
// o quarto, cinco vezes menos. É o surto de oposição do regolito, o
// mesmo fato fotométrico que o globo dela já respeita por
// Lommel-Seeliger (`corpos/lua.ts`).
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
//   [ALLEN76] Allen, C.W., "Astrophysical Quantities", 3ª ed. (1976) —
//          a lei clássica da magnitude da Lua,
//          V = −12,73 + 0,026·|α| + 4e−9·α⁴ (α em graus, disco cheio a
//          distância geocêntrica média), reproduzida desde então pelo
//          "Explanatory Supplement to the Astronomical Almanac"; e o
//          índice integrado do disco cheio B−V = +0,92.
//   [BES90] Bessell, M.S. 1990, PASP 102, 1181 — comprimentos de onda
//          efetivos do sistema Johnson-Cousins (B 0,44 µm, V 0,55 µm,
//          R_C 0,64 µm), usados SÓ na derivação do (V−R) da Lua.
// ============================================================

import { bvToColor } from '../../shaders/common';
import type { IdRetrato } from './retrato2026';
import { IDS_RETRATO, RETRATO_2026 } from './retrato2026';

/**
 * (B−V)☉ [R12] — o MESMO número que `SOL_BV` em `world/clarao.ts`, que
 * já pinta o clarão distante do Sol pela lei do catálogo. Lá ele é
 * EXPORTADO, então a igualdade entre os dois é pinada por import no
 * teste, não por regex sobre o fonte.
 */
export const BV_SOL = 0.653;

/** (V−R)C☉ [R12] — serve às razões de banda de Plutão e da Lua. */
export const VR_SOL = 0.352;

/** (B−V) do disco lunar CHEIO integrado [ALLEN76]. */
export const BV_LUA = 0.92;

/**
 * (V−R)C da Lua — **DERIVADO**, e a derivação é a honestidade desta
 * linha: [ALLEN76] publica o (B−V) do disco cheio e não o (V−R) no
 * mesmo sistema, então redigitar um segundo índice seria inventar dado.
 * O que existe de fato é o AVERMELHAMENTO do regolito maduro, que sobe
 * quase linear com o comprimento de onda no visível; a derivação toma a
 * MESMA inclinação (mag por µm) que o excesso de (B−V) sobre o Sol
 * mede, e a estende de V até R_C pelos comprimentos efetivos [BES90]:
 *
 *     (V−R) = (V−R)☉ + [(B−V)_Lua − (B−V)☉] · (λR − λV)/(λV − λB)
 *
 * Dá 0,570 — a Lua tan-acinzentada, r > g > b, que é o único invariante
 * que o teste cobra (a ORDEM é física; o valor é calibração).
 * APROXIMAÇÃO DECLARADA: os dois índices são do disco CHEIO, e a Lua
 * avermelha com a fase — o ponto não modela isso.
 */
export const VR_LUA = VR_SOL + (BV_LUA - BV_SOL) * ((0.64 - 0.55) / (0.55 - 0.44));

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

  // H: [MH18] Eq. 10 — GLOBO + ANÉIS em α=0, B=0. Os termos de
  // inclinação do anel e de fase saem de `deltaMagMh18`.
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

  // A LUA (item 108, 30/08) — o primeiro corpo desta tabela SEM retrato
  // congelado. H: V(1,0) = +0,21 [ALLEN76], que é a mesma lei do
  // −12,73 dela re-referenciada a 1 UA / 1 UA (a equivalência é oráculo
  // em `fotometria.test.ts`, com a distância média de 384.400 km — o
  // número mora lá, no juiz, e não aqui em duplicata). Cor: os índices
  // do disco cheio, com o (V−R) DERIVADO — ver {@link VR_LUA}.
  moon: linha('moon', 'planetaria', 0.21, razaoDeIndices(BV_LUA, VR_LUA)),
};

/** Os 10 ids do RETRATO congelado: o Sol e os nove. */
export const IDS_FOTOMETRIA = ['sun', ...IDS_RETRATO] as const;

/**
 * OS CORPOS COM PONTO E SEM RETRATO — hoje só a Lua (item 108).
 *
 * O retrato congelado não tem satélites, então o vértice de um corpo
 * daqui NÃO nasce posicionado e a máquina do tempo desta camada não o
 * move: quem escreve onde ele está é o CORPO RESOLVIDO, todo quadro
 * (`Planetas.escreverPontoDeCorpo`, chamado pelo `palco.ts`). É a única
 * fonte que honra o PINO do filme — a camada perguntaria à efeméride e
 * poria o ponto onde a Lua não está sempre que o relógio for
 * sequestrado por um `?jd=`, que é exatamente o defeito que a segunda
 * perna do item 108 acabou de consertar no globo.
 */
export const IDS_SEM_RETRATO = ['moon'] as const;

/**
 * OS VÉRTICES DA CAMADA, na ORDEM do buffer — o retrato primeiro, os
 * sem-retrato depois. A ordem importa e é contrato: `orbitas.ts`, os
 * rótulos e o selo indexam por `IDS_FOTOMETRIA`/`CORPOS_DO_SISTEMA`, e
 * só continuam certos porque os dez seguem sendo o PREFIXO desta lista.
 */
export const IDS_DOS_PONTOS = [...IDS_FOTOMETRIA, ...IDS_SEM_RETRATO] as const;

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
 * (α = 0), 0 em conjunção (α = π). Continua sendo o fallback FORA
 * do domínio MH18 (emenda contínua, razão pinada na costura).
 */
export function faseLambertiana(alphaRad: number): number {
  return (1 + Math.cos(alphaRad)) / 2;
}

/**
 * Teto do domínio publicado de cada lei de fase, em graus. Fora: clamp
 * na borda + Lambert × (Φ|borda / Φ_L|borda). Oito linhas são [MH18]; a
 * da Lua é [ALLEN76].
 */
export const DOMINIO_DA_FASE: Record<string, number> = {
  mercury: 170,
  venus: 179,
  earth: 180,
  mars: 50,
  jupiter: 12,
  saturn: 6.5,
  // Eq. 15 (Voyager) vale até 154°; 3,1° é só o máximo geocêntrico.
  uranus: 154,
  // Eq. 17 vale até 133° (último full-disk Voyager); 1,9° é geocêntrico.
  neptune: 133,
  // [ALLEN76] é publicada para o disco cheio até ~150°; além disso a
  // Lua é uma foice fina e o α cresce rumo à conjunção, onde a emenda
  // com Lambert já manda (e Lambert vai a 0 na conjunção, que é a
  // resposta certa: Lua nova não brilha).
  moon: 150,
};

const VENUS_COSTURA_DEG = 163.7;

/** Δm DENTRO do domínio. α em graus; B (Saturno) em radianos. Oito
 *  corpos por [MH18]; a Lua por [ALLEN76]. */
export function deltaMagDeFase(
  id: string,
  alphaDeg: number,
  BsatRad = 0
): number {
  const a = alphaDeg;
  switch (id) {
    case 'mercury':
      return (
        6.328e-2 * a -
        1.6336e-3 * a * a +
        3.3644e-5 * a ** 3 -
        3.4265e-7 * a ** 4 +
        1.6893e-9 * a ** 5 -
        3.0334e-12 * a ** 6
      );
    case 'venus':
      return a <= VENUS_COSTURA_DEG
        ? -1.044e-3 * a + 3.687e-4 * a * a - 2.814e-6 * a ** 3 + 8.938e-9 * a ** 4
        : 240.44228 - 2.81914 * a + 8.39034e-3 * a * a;
    case 'earth':
      return -1.06e-3 * a + 2.054e-4 * a * a;
    case 'mars':
      return 2.267e-2 * a - 1.302e-4 * a * a;
    case 'jupiter':
      return -3.7e-4 * a + 6.16e-4 * a * a;
    case 'saturn': {
      const sB = Math.sin(BsatRad);
      return -1.825 * sB + 0.026 * a - 0.378 * sB * Math.exp(-2.25 * a);
    }
    case 'uranus':
      return 6.587e-3 * a + 1.049e-4 * a * a;
    case 'neptune':
      // [MH18] Eq. 17, válida até 133°.
      return 7.944e-3 * a + 9.617e-5 * a * a;
    case 'moon':
      // [ALLEN76]: V = −12,73 + 0,026·|α| + 4e−9·α⁴. O termo constante
      // é o H (V(1,0) = +0,21, na tabela acima); aqui fica só a fase.
      return 0.026 * a + 4e-9 * a ** 4;
    default:
      return 0;
  }
}

/**
 * Inclinação efetiva do anel de Saturno [MH18] Eq. 10: √(βE βS)
 * quando βE e βS têm o mesmo sinal; 0 quando o Sol ilumina um lado
 * e o observador vê o outro (anel de contraluz, quase apagado).
 * Os dois ângulos entram na mesma unidade; a saída também.
 */
export function betaEfetivoAnel(betaE: number, betaS: number): number {
  if (betaE === 0 || betaS === 0) return 0;
  if (Math.sign(betaE) !== Math.sign(betaS)) return 0;
  return Math.sign(betaE) * Math.sqrt(Math.abs(betaE * betaS));
}

function phiDeDeltaMag(dm: number): number {
  return 10 ** (-0.4 * dm);
}

/**
 * Fator de fase Φ do PONTO (D10) — o DESPACHANTE ÚNICO das três leis.
 * Dentro do domínio: 10^(−0,4 Δm). Fora: Lambert × (Φ / Φ_L) na borda
 * — C0, razão pinada. Corpo sem lei publicada (Sol, Plutão): Lambert.
 *
 * Chamava-se `fatorDeFaseMh18` até 30/08 e o nome passou a mentir no
 * commit em que a Lua entrou com [ALLEN76]: o despachante nunca foi da
 * MH18, ele é do PONTO — a MH18 é uma das leis que ele serve.
 */
export function fatorDeFaseDoPonto(
  id: string,
  alphaRad: number,
  BsatRad = 0
): number {
  if (!(id in DOMINIO_DA_FASE)) return faseLambertiana(alphaRad);
  const a = Math.abs(alphaRad);
  const aDeg = (a * 180) / Math.PI;
  const teto = DOMINIO_DA_FASE[id];
  if (aDeg <= teto) return phiDeDeltaMag(deltaMagDeFase(id, aDeg, BsatRad));
  const tetoRad = (teto * Math.PI) / 180;
  const phiBorda = phiDeDeltaMag(deltaMagDeFase(id, teto, BsatRad));
  const lambertBorda = faseLambertiana(tetoRad);
  // Na conjunção Lambert vai a 0: a razão não é definida — CLAMP.
  if (lambertBorda < 1e-6) return phiBorda;
  return faseLambertiana(a) * (phiBorda / lambertBorda);
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
