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
 * A MAIOR CÉLULA QUENTE, largura a meio brilho em raios: a mancha de
 * Betelgeuse de Montargès et al. 2016 (arXiv 1602.05108), "a hot spot on the
 * photosphere that has a characteristic width of one stellar radius": na
 * Tabela 3, gaussianas de 21,76 ± 2,02, 18,42 ± 2,42 e 29,48 ± 6,26 mas de
 * largura a meio brilho em discos de 42,94–44,06 mas (0,84 a 1,34 raio), com
 * peso de 0,13, 0,08 e 0,22 do fluxo (jan/2012, fev/2013, jan/2014; o texto
 * dá 7 %, 3 %, 19 % e 6 % em quatro épocas). No pico de Haubois e com o perfil do desenho, ela
 * carrega ~10 % do fluxo na banda H (`fracaoDoFluxoNaBanda`), dentro do
 * medido; as outras células ficam no tamanho da de Haubois (0,5 R).
 */
export const LARGURA_DA_MANCHA_MAIOR_EM_RAIOS = 1;

/**
 * A FRAÇÃO DO FLUXO a mais que uma célula quente põe na banda, de frente e
 * plana: (razão − 1)·∫p·2πr dr / π, com o perfil do desenho p(d) =
 * 1 − smoothstep(0,5·a, 1,3·a, d) (meio brilho em 0,9·a, a = largura/1,8).
 */
export function fracaoDoFluxoNaBanda(larguraEmRaios: number, razao: number): number {
  const a = larguraEmRaios / 1.8;
  const n = 2000;
  let soma = 0;
  for (let i = 0; i < n; i++) {
    const d = ((i + 0.5) / n) * 1.3 * a;
    const x = Math.min(1, Math.max(0, (d - 0.5 * a) / (0.8 * a)));
    soma += (1 - x * x * (3 - 2 * x)) * d * ((1.3 * a) / n);
  }
  return (razao - 1) * 2 * soma;
}

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
 * O PICO DAS CÉLULAS QUENTES ENORMES das supergigantes, δ = ΔT/T, de UMA
 * mancha medida numa banda: a razão do brilho da mancha sobre o médio NAQUELA
 * banda, levada a δ pela lei de Planck, B(T(1+δ))/B(T) = razão, resolvida por
 * bisseção. Razão ≤ 1 (ou não finita) dá δ = 0. A REGRA, para quem não tem a
 * sua medida (`MANCHA_DE_HAUBOIS`): a mancha de Betelgeuse de Haubois et al.
 * 2009 (A&A 508, 923; IOTA, banda H, 1,65 µm), 8,5 % do fluxo em ~6 % da área
 * — 1,42× o brilho médio na banda H, δ ≈ 0,15 a 3.600 K (~+540 K); no
 * visível o mesmo δ sai ~2,6× mais claro (a mancha quase branca das imagens
 * do ESO). A medida da estrela vence a regra (`celulaQuenteDe`).
 */
export const FLUXO_DA_MANCHA_QUENTE = 0.085;
export const AREA_DA_MANCHA_QUENTE = 0.06;
/** uma mancha quente numa banda: a razão sobre o brilho médio e o comprimento de onda (µm) */
export interface ManchaNaBanda {
  readonly razao: number;
  readonly lambdaUm: number;
}
export const MANCHA_DE_HAUBOIS: ManchaNaBanda = {
  razao: FLUXO_DA_MANCHA_QUENTE / AREA_DA_MANCHA_QUENTE,
  lambdaUm: 1.65,
};
/** o comprimento de onda do visível (V), µm, para dizer a mancha na ficha */
export const LAMBDA_DO_VISIVEL_UM = 0.55;

/** B(T(1+δ))/B(T) no comprimento de onda λ (µm): o brilho de quem é δ mais quente */
export function razaoDePlanckNaBanda(teffK: number, delta: number, lambdaUm: number): number {
  const x = 14388 / (lambdaUm * teffK);
  return Math.expm1(x) / Math.expm1(x / (1 + delta));
}

export function picoDasCelulasQuentes(teffK: number, mancha: ManchaNaBanda = MANCHA_DE_HAUBOIS): number {
  const alvo = mancha.razao;
  if (!(alvo > 1) || !Number.isFinite(alvo) || !(teffK > 0) || !(mancha.lambdaUm > 0)) return 0;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (razaoDePlanckNaBanda(teffK, m, mancha.lambdaUm) < alvo) lo = m;
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
  /** o pico δ das células quentes enormes (`picoDasCelulasQuentes`): o da mancha medida, ou a regra */
  readonly picoQuente: number;
  /** o pico pela regra na mesma Teff (a mancha de Haubois): a régua do acabamento por dentro da célula */
  readonly picoDaRegra: number;
  /** a mancha é MEDIDA nesta estrela (não a regra): o peso por gravidade não a escala */
  readonly celulaMedida: boolean;
}

/**
 * O PESO DAS CÉLULAS QUENTES no desenho (o pico, o alisamento por dentro e a
 * ponta HDR): a mancha MEDIDA entra inteira; a da regra, pelo peso da escala
 * profunda (`pesoDaEscalaProfunda`), contínuo em log g.
 */
export function pesoDasCelulasQuentes(r: Pick<RegraDaForja, 'celulaMedida' | 'pesoProfundo'>): number {
  return r.celulaMedida ? 1 : Math.min(1, Math.max(0, r.pesoProfundo));
}

/** O botão GRAVIDADE inteiro, de Teff, log g e raio; a mancha quente medida, quando há. */
export function regraDaForja(
  teffK: number,
  logG: number,
  raioRsol: number,
  mancha?: ManchaNaBanda
): RegraDaForja {
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
    picoQuente: picoDasCelulasQuentes(teffK, mancha ?? MANCHA_DE_HAUBOIS),
    picoDaRegra: picoDasCelulasQuentes(teffK),
    celulaMedida: mancha !== undefined,
  };
}

/**
 * A REGIÃO FRIA DE UM ESCURECIMENTO (`EscurecimentoMedido` da ficha), em
 * números de desenho: por época (ano decimal), a borda nas imagens (raios ao
 * longo do lado escuro), a razão T_fria/T_fotosfera do modelo do artigo e a
 * direção do lado escuro no céu (ângulo de posição, graus). A estrela leva a
 * razão, não a temperatura absoluta: a fotosfera do modelo (3.700 K em
 * Betelgeuse) não é a Teff da ficha (3.600 K). Quem anda no tempo é o
 * director (linear entre as épocas, `faseDoDisco`).
 *
 * O DESENHO (`cirurgiaDaEstrela`, `manchaFria`): dentro da região, a
 * temperatura É a dela — a razão entra pela lei de Planck por canal e pelo
 * TiO da Forja na temperatura local, o brilho das células cede
 * (`brilhoDasCelulasNaRegiaoFria`), ficando as faixas e a textura, e a
 * célula quente some do assado (o pico e o alisamento por dentro), voltando
 * a rede comum; a rampa do instrumento vê só a convecção em volta da média dela
 * (o ganho do instrumento sobre a queda inteira não tem fonte e afundava a
 * rampa no pé). A BORDA é larga e irregular: segue o campo das células da
 * própria Forja.
 */
export interface EscurecimentoDoMotor {
  readonly borda: readonly (readonly [number, number])[];
  readonly razaoT: readonly (readonly [number, number])[];
  readonly anguloGraus: readonly (readonly [number, number])[];
}

/**
 * A meia largura da borda da região fria, em raios no disco projetado (a
 * borda inteira ~0,3 R), e quanto o campo das células a desloca por desvio
 * (limitado a ±2σ: ±0,12 R). ARTÍSTICAS, declaradas na ficha — as imagens
 * do SPHERE, com o feixe de ~24 mas num disco de 42 mas, não resolvem a borda.
 */
export const BORDA_DA_MANCHA_FRIA = 0.15;
export const BORDA_PELAS_CELULAS = 0.06;

/** a borda de quem não tem região fria: além do disco inteiro, com a borda larga e o deslocamento */
export const CORDA_SEM_MANCHA = 2;

/** a borda além da qual nada da região fria toca o disco */
export const BORDA_FORA_DO_DISCO = 1 + BORDA_DA_MANCHA_FRIA + 2 * BORDA_PELAS_CELULAS;

/**
 * O BRILHO DAS CÉLULAS NA REGIÃO FRIA: o desvio positivo δ da temperatura
 * local (as células claras e as quentes enormes) vira δ/(1 + 2δ/σ), com σ o
 * desvio de uma célula comum na tela, e nunca passa de σ/2; as faixas (δ < 0)
 * ficam, e com elas a textura. Uma célula comum (δ = σ) sai a um terço e a
 * quente de Haubois (δ ≈ 5σ) a 0,45σ, quase no nível das comuns: a região
 * medida a 3.400 K não tem célula a +15 % dentro dela (com o teto em σ, a
 * quente virava um platô liso mais claro que tudo em volta). ARTÍSTICO na
 * forma, declarado.
 */
export function brilhoDasCelulasNaRegiaoFria(delta: number, sigma: number): number {
  return delta > 0 ? delta / (1 + (2 * delta) / sigma) : delta;
}

/**
 * UMA DIREÇÃO NO CÉU DE QUEM VÊ DA TERRA, na base da cena (equatorial ICRS,
 * +Z o polo norte celeste), em volta de uma estrela na posição `pos` (pc, a
 * partir do Sol): o ângulo de posição do norte para o leste. Norte é o polo
 * projetado no plano do céu, leste = norte × (a linha de visada), o sentido
 * da ascensão reta crescente. Unitária. No polo (sem norte), o +X.
 */
export function direcaoNoCeu(pos: readonly [number, number, number], anguloGraus: number): [number, number, number] {
  const l = Math.hypot(pos[0], pos[1], pos[2]);
  const rho = Math.hypot(pos[0], pos[1]);
  if (!(l > 0) || !(rho > 1e-12 * l)) return [1, 0, 0];
  const [rx, ry, rz] = [pos[0] / l, pos[1] / l, pos[2] / l];
  const s = rho / l;
  // norte: ẑ − (ẑ·r̂) r̂, normalizado (|·| = √(1 − rz²) = s); leste: ẑ × r̂ / s
  const norte = [(-rz * rx) / s, (-rz * ry) / s, (1 - rz * rz) / s];
  const leste = [-ry / s, rx / s, 0];
  const a = (anguloGraus * Math.PI) / 180;
  const c = Math.cos(a);
  const n = Math.sin(a);
  return [c * norte[0] + n * leste[0], c * norte[1] + n * leste[1], c * norte[2] + n * leste[2]];
}

/**
 * O TiO DA FORJA, CONTÍNUO NA TEMPERATURA LOCAL. Schiavon & Barbuy 1999
 * (astro-ph/9807325): abaixo de ~4.000 K as bandas do TiO são a principal
 * opacidade de 6.000 a 10.000 Å; o índice EW6000 (6.145–6.541 Å) cresce a
 * partir de ~4.000 K e satura abaixo de ~3.000 K (o γ Δv = 0, ~7.150 Å,
 * abaixo de ~3.200 K). O peso vai de 0 em 4.000 K a 1 em 3.000 K, com
 * x = (4.000 − T)/1.000 e p = x(2 − x): cresce já em 4.000 K e chega
 * deitado em 3.000 K (a saturação). A forma é ARTÍSTICA, declarada; as
 * pontas são as da fonte. T é a temperatura LOCAL (Teff·r), então a mesma
 * lei vale na média da estrela e nas faixas — mais frias, absorvem mais e
 * ficam vermelho-escuras; as células quentes escapam dele.
 */
export function pesoDoTiO(tK: number): number {
  const x = Math.min(1, Math.max(0, (4000 - tK) / 1000));
  return x * (2 - x);
}

/**
 * A FORÇA DO TiO DA FORJA: os canais G e B levam exp(−k·p(T)). k = 1,1 é
 * escolhido pelo resultado (ARTÍSTICO, declarado; o k = 8 das gigantes de
 * antes não tinha âncora): na Teff, Aldebaran (3.900 K) 0,81 no verde
 * (laranja), Antares (3.745 K) 0,61 e Betelgeuse (3.600 K) 0,49
 * (vermelho-alaranjado; o Antares do ESO, eso1726, tem R/G ~1,86 na tela, e
 * o nosso, medido na volta 6a, ~1,83); Arcturus (4.450 K) só nas faixas
 * mais fundas. Os canais são os da tela: a banda do EW6000 cai no vermelho
 * de 0,61 µm, mas a imagem colorizada perde o verde e o azul.
 */
export const TIO_DA_FORJA = 1.1;

/** os comprimentos de onda efetivos dos canais R, G, B (µm) e c₂ = hc/k (µm·K) */
export const LAMBDA_DOS_CANAIS_UM = [0.61, 0.55, 0.465] as const;
export const C2_UM_K = 14388;

/**
 * O ESCURO DA REGIÃO FRIA no visível: quantas vezes uma região a `razaoT`
 * da temperatura local sai mais escura que a vizinhança, na luminância da
 * tela (Rec. 709, antes da curva de tom) — a mesma lei que o desenho usa:
 * Planck por canal e o TiO da Forja na temperatura local. É o número que a
 * ficha diz; a curva de tom ainda o aperta na tela.
 */
export function escuroDaRegiaoFria(teffK: number, razaoT: number): number {
  if (!(teffK > 0) || !(razaoT > 0)) return 1;
  const fria = teffK * razaoT;
  const tio = Math.exp(-TIO_DA_FORJA * (pesoDoTiO(fria) - pesoDoTiO(teffK)));
  const canal = (l: number, i: number) =>
    (Math.expm1(C2_UM_K / (l * teffK)) / Math.expm1(C2_UM_K / (l * fria))) * (i > 0 ? tio : 1);
  const [r, g, b] = LAMBDA_DOS_CANAIS_UM.map(canal) as [number, number, number];
  return 1 / (0.2126 * r + 0.7152 * g + 0.0722 * b);
}
