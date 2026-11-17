// ============================================================
// A FORJA, botão GRAVIDADE: a camada de convecção de toda estrela
// sem dínamo por uma regra só, de Teff e log g. A regra decidida e as
// fontes estão em docs/LEI-DA-ESTRELA.md, seção 10; aqui só as contas,
// puras. Quem desenha é `stellarBody.ts` (o assado e `conveccaoDoAssado`).
// ============================================================

/** O raio do Sol, em Mm (IAU 2015 B3: 695.700 km). */
const RAIO_SOL_MM = 695.7;
const TEFF_SOL_K = 5772;
const LOG_G_SOL = 4.438;

/**
 * O TAMANHO DA CÉLULA DE CONVECÇÃO, em raios da estrela: o ajuste de
 * Trampedach et al. 2013 (arXiv 1303.1780) às 37 simulações 3D,
 * log₁₀(A/Mm) = 1,3210 log₁₀ Teff − 1,0970 log g + 0,0306. Abaixo de
 * log g ≈ 1 é EXTRAPOLADO (fora da grade).
 */
export function celulaRealEmRaios(teffK: number, logG: number, raioRsol: number): number {
  const aMm = Math.pow(10, 1.321 * Math.log10(teffK) - 1.097 * logG + 0.0306);
  return aMm / (raioRsol * RAIO_SOL_MM);
}

/** a célula do Sol pela mesma conta (~0,00194 R) */
const A_SOL = celulaRealEmRaios(TEFF_SOL_K, LOG_G_SOL, 1);
/** a célula a partir da qual a fervura tem o ritmo das gigantes de hoje */
const CELULA_DAS_GIGANTES = 0.1;
/** o grão do Sol aprovado na tela: o piso de visibilidade */
const CELULA_DO_SOL_NA_TELA = 1 / 30;

/**
 * A CÉLULA NA TELA, em raios — a concessão de sempre (o grão do Sol aparece
 * 17,8× maior) como um PISO de visibilidade contínuo:
 * A_tela = (A⁴ + (1/30)⁴)^¼. O grão que a tela não resolveria sobe ao grão
 * do Sol aprovado; onde o tamanho real já se vê (gigantes), a ampliação cai
 * a 1 (Arcturus ~1,13×, Aldebaran ~1,02×). ARTÍSTICO, declarado.
 */
export function celulaNaTelaEmRaios(aR: number): number {
  const a = Math.max(aR, 0);
  return Math.pow(a ** 4 + CELULA_DO_SOL_NA_TELA ** 4, 0.25);
}

/** interpolação linear por pontos (x crescente), constante fora */
function porPontos(pontos: readonly (readonly [number, number])[], x: number): number {
  if (x <= pontos[0]![0]) return pontos[0]![1];
  for (let i = 1; i < pontos.length; i++) {
    const [x1, y1] = pontos[i]!;
    if (x <= x1) {
      const [x0, y0] = pontos[i - 1]!;
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return pontos[pontos.length - 1]![1];
}

/**
 * O contraste rms das ANÃS por Teff: Beeck et al. 2013 (arXiv 1308.4874:
 * M2V a F3V) e Steffen et al. 2005 (astro-ph/0509464: 8.000 e 8.500 K).
 */
const CONTRASTE_DAS_ANAS: readonly (readonly [number, number])[] = [
  [3689, 0.0217],
  [3905, 0.0355],
  [4368, 0.069],
  [4856, 0.0804],
  [5764, 0.157],
  [6893, 0.203],
  [8000, 0.127],
  [8500, 0.079],
];
/** as gigantes frias: do Sol à gigante de 3.660 K e log g 1 de Ludwig & Kučinskas 2012 (18 %) */
const CONTRASTE_DAS_GIGANTES: readonly (readonly [number, number])[] = [
  [3660, 0.18],
  [5772, 0.157],
];
const LOG_G_DA_GIGANTE = 1.0;

function contrasteDasAnas(teffK: number): number {
  const [xa, ya] = CONTRASTE_DAS_ANAS[CONTRASTE_DAS_ANAS.length - 2]!;
  const [xb, yb] = CONTRASTE_DAS_ANAS[CONTRASTE_DAS_ANAS.length - 1]!;
  // acima de 8.500 K, a reta dos dois últimos até zero (~9.300 K): sem
  // envelope convectivo não há granulação — EXTRAPOLADO
  if (teffK > xb) return Math.max(0, yb + ((teffK - xb) / (xb - xa)) * (yb - ya));
  return porPontos(CONTRASTE_DAS_ANAS, teffK);
}

/**
 * O CONTRASTE RMS da convecção (intensidade bolométrica): a curva das anãs
 * em Teff; abaixo da Teff do Sol, misturada em log g (4,438 → 1,0) rumo à
 * reta das gigantes frias. Gigante quente: sem medida, vale a das anãs.
 */
export function contrasteDaConveccao(teffK: number, logG: number): number {
  const ana = contrasteDasAnas(teffK);
  if (teffK >= TEFF_SOL_K) return ana;
  const s = Math.min(1, Math.max(0, (LOG_G_SOL - logG) / (LOG_G_SOL - LOG_G_DA_GIGANTE)));
  return ana + s * (porPontos(CONTRASTE_DAS_GIGANTES, teffK) - ana);
}

/**
 * A QUENTE É LISA: sem envelope convectivo (contraste zero pela regra, acima
 * de ~9.300 K) não há granulação a desenhar — o que se vê é a borda, a forma
 * e o gradiente do polo ao equador. A zona de convecção do ferro, abaixo da
 * superfície das mais luminosas (acima de ~10^3,2 L☉ na Galáxia; Cantiello
 * et al. 2009, A&A 499, 279), dá velocidade (1–10 km/s) e tamanho de célula
 * (~1 escala de altura de pressão, ~1/130 do raio), mas nenhum contraste de
 * brilho na fotosfera: sem esse número, nada é desenhado. Até 17/11 um piso
 * artístico de 4 % punha nelas um mosqueado sem fonte.
 */
export function semConveccaoNaSuperficie(teffK: number, logG: number): boolean {
  return contrasteDaConveccao(teffK, logG) <= 0;
}

/** A Teff em que a reta das anãs chega a contraste zero (~9.320 K): daí para
 *  cima a estrela é lisa (`semConveccaoNaSuperficie`). */
export const TEFF_SEM_CONVECCAO_K = (() => {
  const [xa, ya] = CONTRASTE_DAS_ANAS[CONTRASTE_DAS_ANAS.length - 2]!;
  const [xb, yb] = CONTRASTE_DAS_ANAS[CONTRASTE_DAS_ANAS.length - 1]!;
  return xb + (yb * (xb - xa)) / (ya - yb);
})();

/** Acima desta temperatura o filtro fotográfico do Sol já esmaeceu inteiro
 *  (`pesoDoFiltro`, no motor) — artístico, declarado. */
export const TEFF_SEM_FILTRO_K = 8000;

/** O peso da regra do pico da exposição (no diretor): 0 até 8.000 K, 1 de
 *  `TEFF_SEM_CONVECCAO_K` em diante. */
export function pesoDoPico(teffK: number): number {
  const t = Math.min(1, Math.max(0, (teffK - TEFF_SEM_FILTRO_K) / (TEFF_SEM_CONVECCAO_K - TEFF_SEM_FILTRO_K)));
  return t * t * (3 - 2 * t);
}

/**
 * A SAÍDA DA REDE E A ENTRADA DA PONTA, uma rampa só: 0 até
 * `TEFF_DA_SAIDA_DA_REDE_K`, 1 de `TEFF_SEM_CONVECCAO_K` em diante. Com ela
 * o piso da granulação sai (`contrasteNaTela`) e a ponta branca do pico
 * entra (no motor), sem degrau nenhum nos ~9.320 K. Começa na segunda metade
 * da entrada do pico porque as duas juntas se anulam: a ponta inteira sobre
 * a rede inteira a lavava (Fomalhaut, 8.590 K: 0,89 % → 0,33 % na tela);
 * primeiro o disco desce com a rede ainda legível, depois a rede sai e a
 * ponta entra. ARTÍSTICO: onde começa.
 */
export const TEFF_DA_SAIDA_DA_REDE_K = 8700;
export function pesoDaLisa(teffK: number): number {
  const t = Math.min(
    1,
    Math.max(0, (teffK - TEFF_DA_SAIDA_DA_REDE_K) / (TEFF_SEM_CONVECCAO_K - TEFF_DA_SAIDA_DA_REDE_K))
  );
  return t * t * (3 - 2 * t);
}

/**
 * O PISO NA TELA do contraste — a concessão das quentes com envelope fino
 * (a superfície não sai lisa), na régua da Forja. Acima de ~7.800 K o contraste real cai
 * rumo a zero e, sem o filtro do Sol, a razão de Planck sozinha o deixa
 * invisível (Fomalhaut a 8.590 K: 0,46 % rms na tela contra 0,9 % do
 * caminho de antes). O desenho usa max(contraste, piso): contínuo na
 * temperatura, nenhuma estrela fria nem Altair (0,148) muda. O valor é o
 * que devolve a Fomalhaut a visibilidade de antes — ARTÍSTICO, declarado na
 * ficha. O piso SAI pela rampa `pesoDaLisa` (de 8.700 K até a convecção
 * sumir): o desenho chega a zero junto com o contraste real, sem cair de
 * 14 % a nada de uma estrela para a vizinha.
 */
export const PISO_DA_FORJA_NA_TELA = 0.14;
export function contrasteNaTela(contraste: number, teffK: number): number {
  return contraste > 0 ? Math.max(contraste, PISO_DA_FORJA_NA_TELA * (1 - pesoDaLisa(teffK))) : 0;
}
/** as fontes do contraste real (`contrasteDaConveccao`), para o selo da ficha */
export const LEI_DO_CONTRASTE = 'Beeck et al. 2013; Steffen et al. 2005';

/**
 * A DESORDEM DA CONVECÇÃO, 0 a 1, por log g: o escoamento fica mais violento
 * quando a gravidade cai — Mach horizontal máximo de ~1,8 no Sol e ~6,0 na
 * gigante de log g 1 (Ludwig & Kučinskas 2012, arXiv 1211.7304), linear em
 * log g entre as duas âncoras; a desordem é (Ma − 1,8)/(6,0 − 1,8), presa em
 * [0, 1]. Ela comanda a torção do domínio, a quebra das faixas em plumas e
 * as regiões mais quentes e mais frias da textura; a forma é ARTÍSTICA.
 */
const MACH_DO_SOL = 1.8;
const MACH_DA_GIGANTE = 6.0;
export function desordemDaConveccao(logG: number): number {
  const mach = MACH_DO_SOL + ((LOG_G_SOL - logG) / (LOG_G_SOL - LOG_G_DA_GIGANTE)) * (MACH_DA_GIGANTE - MACH_DO_SOL);
  return Math.min(1, Math.max(0, (mach - MACH_DO_SOL) / (MACH_DA_GIGANTE - MACH_DO_SOL)));
}

/**
 * O RAIO DA ATMOSFERA ESTENDIDA, em raios, por log g: anã 1,0; Arcturus
 * 1,04 (log g 1,66; Ohnaka & Morales Marín 2018); supergigante 1,3 em
 * log g 0 (Montargès 2014; Ohnaka 2009, 2013). Só nas frias: o excesso é
 * inteiro abaixo de 4.500 K (Linsky & Haisch) e zero em 5.000 K — rampa
 * ARTÍSTICA.
 */
const ATMOSFERA_POR_LOG_G: readonly (readonly [number, number])[] = [
  [0.0, 1.3],
  [1.66, 1.04],
  [LOG_G_SOL, 1.0],
];
/** as fontes da regra acima, para o selo da ficha */
export const LEI_DA_ATMOSFERA = 'Ohnaka & Morales Marín 2018; Montargès et al. 2014; Ohnaka et al. 2009';
export function raioDaAtmosferaEmRaios(teffK: number, logG: number): number {
  const r = porPontos(ATMOSFERA_POR_LOG_G, logG);
  const peso = Math.min(1, Math.max(0, (5000 - teffK) / 500));
  return 1 + (r - 1) * peso;
}

/**
 * A FRAÇÃO ESCURA da convecção — a fração da área abaixo da intensidade
 * média: ~0,53 no Sol e ~0,34 a 8.000 K nas simulações 3D (Steffen et al.
 * 2005, astro-ph/0509464). Aqui 0,5 até a Teff do Sol, linear até 0,34 a
 * 8.000 K, constante acima (o contraste já vai a zero).
 */
export function fracaoEscura(teffK: number): number {
  const x = Math.min(1, Math.max(0, (teffK - TEFF_SOL_K) / (8000 - TEFF_SOL_K)));
  return 0.5 + x * (0.34 - 0.5);
}

/**
 * O RITMO DA FERVURA relativo ao da granulação viva de hoje: 1 na célula do
 * Sol, o das células gigantes de hoje (1/6: os centros delas andam a
 * 0,05·(0,5 + h) por unidade de tempo, os da granulação viva a 0,3·(0,5 + h))
 * a partir de 0,1 R, linear em log do tamanho REAL entre os dois — célula
 * maior ferve mais devagar. ARTÍSTICO, declarado.
 */
export function ritmoDaFervura(aR: number): number {
  const x = Math.min(1, Math.max(0, Math.log(aR / A_SOL) / Math.log(CELULA_DAS_GIGANTES / A_SOL)));
  return 1 + x * (1 / 6 - 1);
}

/**
 * A ESCALA PROFUNDA, em raios: as fotos das gigantes de gravidade baixíssima
 * mostram POUCAS células enormes por cima dos grânulos — π¹ Gru, célula de
 * ~1/4 do diâmetro (ESO eso1741, Paladini et al. 2018); Betelgeuse, mancha
 * quente de ~1 raio (Montargès et al. 2016, arXiv 1602.05108) e, na simulação
 * CO5BOLD, estruturas de 5–15 mas mais UMA célula de ~30 mas num disco de
 * ~43 mas (Chiavassa et al. 2010, arXiv 1003.1407); poucas células grandes e
 * grânulos pequenos (Freytag et al. 2002). O tamanho é fixo: o diâmetro da de
 * π¹ Gru (Betelgeuse dá 0,5–1 R).
 */
export const CELULA_PROFUNDA_EM_RAIOS = 0.5;

/**
 * O PESO DA ESCALA PROFUNDA por log g: zero a log g ≥ 1,0, onde a grade de
 * Trampedach ainda vale (Ludwig & Kučinskas 2012: só grânulos, ~400, a
 * log g 1), inteiro a log g ≤ −0,3 (as supergigantes vermelhas), smoothstep
 * entre os dois.
 */
export function pesoDaEscalaProfunda(logG: number): number {
  const x = Math.min(1, Math.max(0, (1.0 - logG) / 1.3));
  return x * x * (3 - 2 * x);
}

/**
 * A LARGURA DA BORDA, em μ: a borda amacia na espessura da fotosfera, uma
 * escala de altura Hp ≈ A/10 da célula REAL (Trampedach: A/Hp de 9 a 13);
 * a linha de visada rasante atravessa Hp/R em ρ, μ_w = √(2·Hp/R).
 * Betelgeuse ~0,15, Arcturus ~0,09. A forma (smoothstep) é ARTÍSTICA.
 */
export function larguraDaBordaEmMu(aR: number): number {
  return Math.sqrt((2 * aR) / 10);
}

/**
 * A LARGURA DO ASSADO da convecção (a textura equirretangular que o motor do
 * Sol já assa, `sol/chromo.js`): ~8 texels por célula NA TELA no equador,
 * 8·2π/A_tela, levada à potência de 2 mais próxima (em log₂) e presa entre
 * 512 e 2048. A altura é a metade. Custo, não física: abaixo de ~8 texels a
 * célula perde a borda; o detalhe mais fino que isso vem por pixel, de perto.
 */
export function larguraDoAssado(celulaNaTelaEmRaios: number): number {
  const alvo = (8 * 2 * Math.PI) / Math.max(celulaNaTelaEmRaios, 1e-6);
  return Math.min(2048, Math.max(512, 2 ** Math.round(Math.log2(alvo))));
}

/**
 * O PICO DAS CÉLULAS QUENTES ENORMES das supergigantes, δ = ΔT/T: a mancha de
 * Betelgeuse de Haubois et al. 2009 (A&A 508, 923; IOTA, banda H, 1,65 µm)
 * carrega 8,5 % do fluxo em ~6 % da área — 1,42× o brilho médio
 * NA BANDA H. Pela lei de Planck naquela banda, B(T(1+δ))/B(T) = 1,42 dá
 * δ ≈ 0,15 a 3.600 K (~+540 K); no visível o mesmo δ sai ~2,6× mais claro
 * (a mancha quase branca das imagens do ESO). Resolvido por bisseção.
 */
export const FLUXO_DA_MANCHA_QUENTE = 0.085;
export const AREA_DA_MANCHA_QUENTE = 0.06;
const LAMBDA_DA_BANDA_H_UM = 1.65;
export function picoDasCelulasQuentes(teffK: number): number {
  const alvo = FLUXO_DA_MANCHA_QUENTE / AREA_DA_MANCHA_QUENTE;
  const x = 14388 / (LAMBDA_DA_BANDA_H_UM * teffK);
  const razao = (d: number) => Math.expm1(x) / Math.expm1(x / (1 + d));
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (razao(m) < alvo) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

export interface RegraDaForja {
  readonly celulaRealEmRaios: number;
  readonly celulaNaTelaEmRaios: number;
  readonly contraste: number;
  /** o contraste que o desenho usa (`contrasteNaTela`) */
  readonly contrasteNaTela: number;
  readonly atmosferaEmRaios: number;
  readonly fracaoEscura: number;
  readonly ritmo: number;
  /** o peso da escala profunda (`pesoDaEscalaProfunda`), 0 a 1 */
  readonly pesoProfundo: number;
  /** a largura da borda em μ (`larguraDaBordaEmMu`) */
  readonly bordaEmMu: number;
  /** a desordem do escoamento (`desordemDaConveccao`), 0 a 1 */
  readonly desordem: number;
  /** a largura do assado em texels (`larguraDoAssado`) */
  readonly assado: number;
  /** o pico δ das células quentes enormes (`picoDasCelulasQuentes`) */
  readonly picoQuente: number;
}

/** O botão GRAVIDADE inteiro, de Teff, log g e raio. */
export function regraDaForja(teffK: number, logG: number, raioRsol: number): RegraDaForja {
  const a = celulaRealEmRaios(teffK, logG, raioRsol);
  return {
    celulaRealEmRaios: a,
    celulaNaTelaEmRaios: celulaNaTelaEmRaios(a),
    contraste: contrasteDaConveccao(teffK, logG),
    contrasteNaTela: contrasteNaTela(contrasteDaConveccao(teffK, logG), teffK),
    atmosferaEmRaios: raioDaAtmosferaEmRaios(teffK, logG),
    fracaoEscura: fracaoEscura(teffK),
    ritmo: ritmoDaFervura(a),
    pesoProfundo: pesoDaEscalaProfunda(logG),
    bordaEmMu: larguraDaBordaEmMu(a),
    desordem: desordemDaConveccao(logG),
    assado: larguraDoAssado(celulaNaTelaEmRaios(a)),
    picoQuente: picoDasCelulasQuentes(teffK),
  };
}
