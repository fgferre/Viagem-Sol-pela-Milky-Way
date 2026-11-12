// ============================================================
// SAGITTARIUS A✱ EM ESCALA REAL — a física pura do buraco negro, sem
// three: os números da ficha, a deflexão EXATA de Schwarzschild que a
// lente usa (`three/world/lenteDoBuracoNegro.ts`) e a órbita de S2.
//
// Tudo em unidades de raio de Schwarzschild (RS = 2GM/c² = 1) onde não
// se diz outra coisa. A massa vem da GRAVITY (2022); a distância é a da
// casa (R0 = 8.150 pc, Reid et al. 2019), que é onde a galáxia desenhada
// põe o centro — a sombra sai das duas.
// ============================================================
import { resolverKepler } from './atlas/kepler';
import { UA_POR_PC } from './unidades';

/** massa, M☉ — GRAVITY Collaboration 2022, A&A 657, L12 (±0,25 %) */
export const MASSA_SGR_A_MSOL = 4.3e6;
/** 2GM/c² por massa solar, km (IAU: GM☉ = 1,327 124 4e20 m³/s²) */
const RS_POR_MSOL_KM = 2.953_250_077;
const UA_KM = 149_597_870.7;
/** o raio de Schwarzschild de Sgr A✱ em km, em UA e em pc */
export const RS_SGR_A_KM = RS_POR_MSOL_KM * MASSA_SGR_A_MSOL;
export const RS_SGR_A_UA = RS_SGR_A_KM / UA_KM;
export const RS_SGR_A_PC = RS_SGR_A_UA / UA_POR_PC;
/** a distância da casa ao centro, pc (Reid et al. 2019, a de `medidasDaGalaxia`) */
export const DISTANCIA_SGR_A_PC = 8150;

/** o parâmetro de impacto crítico, em RS: b_c = (3√3/2)·RS — a borda da sombra */
export const B_CRITICO = (3 * Math.sqrt(3)) / 2;
/** a esfera de fótons, em RS */
export const R_FOTONS = 1.5;

/** o diâmetro angular da sombra visto de longe, µas: 2·b_c·RS/D */
export function sombraEmMicroArcsec(distanciaPc: number = DISTANCIA_SGR_A_PC): number {
  const rad = (2 * B_CRITICO * RS_SGR_A_PC) / distanciaPc;
  return rad * (180 / Math.PI) * 3600e6;
}

/**
 * O RAIO ANGULAR EXATO da sombra para um observador PARADO a `rO` RS
 * (Synge 1966): sen θ = (b_c/rO)·√(1 − 1/rO).
 */
export function raioAngularDaSombra(rO: number): number {
  return Math.asin(Math.min(1, (B_CRITICO / rO) * Math.sqrt(Math.max(0, 1 - 1 / rO))));
}

// ---- a deflexão exata ------------------------------------------------
//
// A órbita da luz (u = 1/r): (du/dφ)² = 1/b² − u² + u³ = G(u). O raio
// que sai da câmera (raio rO, ângulo ψ com a vertical local, observador
// estático) tem b = rO·sen ψ/√(1 − 1/rO). O AZIMUTE que ele varre até o
// infinito é Φ; a direção de onde a luz chega é e = cos Φ·n + sen Φ·t
// (n: do buraco à câmera; t: a parte de d perpendicular a n). Sem
// gravidade Φ = ψ, e e = d.
//   saindo (cos ψ ≥ 0):  Φ = ∫₀^{uO} du/√G
//   entrando (b > b_c):  Φ = ∫₀^{uP} du/√G + ∫_{uO}^{uP} du/√G
// As duas com u = u₀(1 − s²), que tira a raiz do ponto de virada; e
// h(u₀) − h(u) = u₀s²·K, sem cancelamento (h = u² − u³).

/** K(u₀,u) = (h(u₀) − h(u)) / (u₀ − u) */
function kDe(u0: number, u: number): number {
  return u0 + u - u0 * u0 - u0 * u - u * u;
}

// Gauss–Legendre de 8 pontos em [−1, 1]
const GL_X = [
  -0.9602898564975363, -0.7966664774136267, -0.5255324099163290, -0.1834346424956498,
  0.1834346424956498, 0.525532409916329, 0.7966664774136267, 0.9602898564975363,
];
const GL_W = [
  0.1012285362903763, 0.2223810344533745, 0.3137066458778873, 0.3626837833783620,
  0.362683783378362, 0.3137066458778873, 0.2223810344533745, 0.1012285362903763,
];

/** ∫₀^S f, em fatias geométricas a partir de 0 (o pico mora em s → 0) */
function integrar(f: (s: number) => number, S: number): number {
  if (S <= 0) return 0;
  let soma = 0;
  let a = 0;
  let b = S * 1e-8;
  for (;;) {
    const m = 0.5 * (a + b);
    const h = 0.5 * (b - a);
    for (let i = 0; i < 8; i++) soma += GL_W[i] * f(m + h * GL_X[i]) * h;
    if (b >= S) break;
    a = b;
    b = Math.min(S, b * 2);
  }
  return soma;
}

/** a raiz uP de h(u) = 1/b², no ramo u < 2/3 (b > b_c) */
function pontoDeVirada(b: number): number {
  const alvo = 1 / (b * b);
  let lo = 0;
  let hi = 2 / 3;
  for (let i = 0; i < 80; i++) {
    const m = 0.5 * (lo + hi);
    if (m * m - m * m * m < alvo) lo = m;
    else hi = m;
  }
  return 0.5 * (lo + hi);
}

/** b do raio que sai a ψ de um observador estático em rO (RS) */
export function parametroDeImpacto(psi: number, rO: number): number {
  return (rO * Math.sin(psi)) / Math.sqrt(1 - 1 / rO);
}

/**
 * O AZIMUTE DE ESCAPE Φ (rad) do raio que sai da câmera em rO (RS) com
 * ângulo ψ (rad) da vertical local — `Infinity` se ele cai no buraco.
 */
export function azimuteDeEscape(psi: number, rO: number): number {
  const uO = 1 / rO;
  if (Math.cos(psi) >= 0) {
    // saindo: sem ponto de virada; G(uO) = uO²(1 − uO)·cot²ψ
    const sen = Math.sin(psi);
    if (sen <= 0) return 0;
    const cot = Math.cos(psi) / sen;
    const gO = uO * uO * (1 - uO) * cot * cot;
    return integrar((s) => {
      const u = uO * (1 - s * s);
      return (2 * uO * s) / Math.sqrt(gO + uO * s * s * kDe(uO, u));
    }, 1);
  }
  const b = parametroDeImpacto(psi, rO);
  if (b <= B_CRITICO) return Infinity;
  const uP = pontoDeVirada(b);
  const f = (s: number) => (2 * Math.sqrt(uP)) / Math.sqrt(Math.max(kDe(uP, uP * (1 - s * s)), 1e-300));
  const sO = Math.sqrt(Math.max(0, 1 - uO / uP));
  return integrar(f, 1) + integrar(f, sO);
}

/** a deflexão de infinito a infinito, α(b) = 2∫₀^{uP} du/√G − π */
export function deflexaoTotal(b: number): number {
  if (b <= B_CRITICO) return Infinity;
  const uP = pontoDeVirada(b);
  const f = (s: number) => (2 * Math.sqrt(uP)) / Math.sqrt(Math.max(kDe(uP, uP * (1 - s * s)), 1e-300));
  return 2 * integrar(f, 1) - Math.PI;
}

/** quantas amostras por linha da tabela da lente */
export const AMOSTRAS_DA_TABELA = 256;

export interface TabelaDaLente {
  rO: number;
  /**
   * GUARDA A DOBRA δ = Φ − ψ, não Φ: ψ o shader tem exato, e δ é lisa
   * nas duas réguas (Φ inteiro tem a curvatura de ψ, que a interpolação
   * linear erraria em 5e-4 rad perto de 90°).
   * linha 0: δ(ψ) saindo, ψ = (π/2)(1 − (1 − i/(n−1))²) — mais densa perto
   * de 90°, onde o raio rasante é o que mais dobra; linha 1: δ(x) entrando,
   * x = ln(γ − γs) uniforme em [xMin, xMax] (γ = π − ψ: o ângulo do raio
   * à direção do buraco; γs: o raio angular da sombra)
   */
  dados: Float32Array;
  gamaSombra: number;
  xMin: number;
  xMax: number;
}

/**
 * A TABELA da lente para uma distância rO (RS) — 2 × 256 integrais, poucos ms.
 * A linha de entrada é em x = ln(γ − γs) porque perto da sombra Φ
 * cresce como −ln(b − b_c), e b − b_c anda linear com γ − γs: em x ela é
 * quase reta, e no outro extremo (γ → 90°) x continua liso — o que uma
 * régua em b não seria (b tem máximo em 90°).
 */
export function tabelaDaLente(rO: number): TabelaDaLente {
  const n = AMOSTRAS_DA_TABELA;
  const dados = new Float32Array(2 * n);
  for (let i = 0; i < n; i++) {
    const t = 1 - i / (n - 1);
    const psi = (Math.PI / 2) * (1 - t * t);
    dados[i] = azimuteDeEscape(psi, rO) - psi;
  }
  const gamaSombra = raioAngularDaSombra(rO);
  const xMin = Math.log(Math.max(gamaSombra * 1e-7, 1e-12));
  const xMax = Math.log(Math.PI / 2 - gamaSombra);
  for (let i = 0; i < n; i++) {
    const x = xMin + (xMax - xMin) * (i / (n - 1));
    const psi = Math.PI - (gamaSombra + Math.exp(x));
    dados[n + i] = azimuteDeEscape(psi, rO) - psi;
  }
  return { rO, dados, gamaSombra, xMin, xMax };
}

/** a leitura da tabela como o shader a faz — para os testes medirem o erro */
export function lerTabela(t: TabelaDaLente, psi: number): number {
  const n = AMOSTRAS_DA_TABELA;
  const interp = (linha: number, x: number) => {
    const xc = Math.min(n - 1, Math.max(0, x));
    const i = Math.min(n - 2, Math.floor(xc));
    const f = xc - i;
    return t.dados[linha * n + i] * (1 - f) + t.dados[linha * n + i + 1] * f;
  };
  if (Math.cos(psi) >= 0) return psi + interp(0, (1 - Math.sqrt(Math.max(0, 1 - psi / (Math.PI / 2)))) * (n - 1));
  const gama = Math.PI - psi;
  if (gama <= t.gamaSombra) return Infinity;
  const x = Math.log(gama - t.gamaSombra);
  return psi + interp(1, ((x - t.xMin) / (t.xMax - t.xMin)) * (n - 1));
}

// ---- S2 --------------------------------------------------------------

/**
 * A ÓRBITA DE S2 — GRAVITY Collaboration 2020, A&A 636, L5, tabela E.1
 * (a em mas na R0 deles, 8.246,7 pc; o semieixo físico sai daí).
 */
export const ORBITA_S2 = {
  aMas: 125.058,
  r0DaFontePc: 8246.7,
  e: 0.884649,
  iGraus: 134.567,
  omegaGrandeGraus: 228.171,
  omegaGraus: 66.263,
  periodoAnos: 16.0455,
  periastroAno: 2018.379,
} as const;

/** semieixo de S2, UA (1″ a 1 pc = 1 UA) */
export const A_S2_UA = (ORBITA_S2.aMas / 1000) * ORBITA_S2.r0DaFontePc;
export const PERIASTRO_S2_UA = A_S2_UA * (1 - ORBITA_S2.e);
export const APOASTRO_S2_UA = A_S2_UA * (1 + ORBITA_S2.e);

/**
 * S2 no ano decimal dado, em UA, nos eixos do CÉU visto do Sol:
 * [norte, leste, para longe de nós] (convenção de Thiele–Innes).
 */
export function posicaoDeS2NoCeu(ano: number): [number, number, number] {
  const o = ORBITA_S2;
  const g = Math.PI / 180;
  const M = (2 * Math.PI * (ano - o.periastroAno)) / o.periodoAnos;
  const E = resolverKepler(M, o.e);
  const nu = 2 * Math.atan2(Math.sqrt(1 + o.e) * Math.sin(E / 2), Math.sqrt(1 - o.e) * Math.cos(E / 2));
  const r = A_S2_UA * (1 - o.e * Math.cos(E));
  const u = nu + o.omegaGraus * g;
  const W = o.omegaGrandeGraus * g;
  const i = o.iGraus * g;
  return [
    r * (Math.cos(u) * Math.cos(W) - Math.sin(u) * Math.sin(W) * Math.cos(i)),
    r * (Math.cos(u) * Math.sin(W) + Math.sin(u) * Math.cos(W) * Math.cos(i)),
    r * Math.sin(u) * Math.sin(i),
  ];
}

/** distância de S2 ao buraco no ano dado, UA */
export function distanciaDeS2(ano: number): number {
  const p = posicaoDeS2NoCeu(ano);
  return Math.hypot(p[0], p[1], p[2]);
}
