// ============================================================
// A ÓPTICA DAS DUAS LENTES DE CINEMA — os reflexos internos (fantasmas)
// saem do vidro de duas receitas reais, não de um desenho.
//
// Método: matrizes paraxiais de transferência de raio por fantasma de
// Lee & Eisemann 2013 ("Practical Real-Time Lens-Flare Rendering", CGF 32(4));
// enumeração dos fantasmas (duas reflexões) e camadas antirreflexo de
// Hullin, Eisemann, Seidel & Lee 2011 ("Physically-Based Real-Time Lens
// Flare Rendering", SIGGRAPH). Este módulo é puro: transforma a receita em
// coeficientes lineares por fantasma; `presets.ts` tira deles posição,
// tamanho e forma dos fantasmas desenhados.
//
// CONVENÇÃO (vale para o arquivo inteiro). Eixo óptico = z global; a luz
// entra em z = 0 (vértice da primeira superfície) andando para +z. Cada eixo
// transversal (x, y) é traçado à parte. Raio = (h, u): altura e inclinação
// u = dh/dz no referencial GLOBAL, também quando o raio volta para trás
// depois de uma reflexão. Nesta convenção:
//   transferência z1→z2:   [[1, z2−z1], [0, 1]]   (z2−z1 < 0 andando para trás)
//   refração n1→n2:        [[1, 0], [(n1−n2)·c/n2, n1/n2]]  nos DOIS sentidos,
//                          com n1 = meio de onde o raio vem
//   reflexão:              [[1, 0], [−2c, −1]]    (u' = −u − 2ch)
// c = 1/R, R > 0 = centro de curvatura atrás da superfície (sinal das patentes).
// Esférica: c nos dois eixos; cilindro X só em x; cilindro Y só em y.
//
// Fonte e tela: t = (tx, ty) é a inclinação dos raios que chegam da fonte
// (tangente da direção dela). A imagem principal cai no sensor em +f·t: lemos
// o sensor girado 180°, como toda câmera mostra. Pela simetria h→−h da lente
// isso só gira o polígono da íris, cuja orientação é escolha livre.
// ============================================================

export type NomeDaLente = 'redonda' | 'anamorfica';
export interface PorEixo {
  readonly x: number;
  readonly y: number;
}
export type PorCanal<T> = readonly [T, T, T];

/** Vermelho, verde e azul (nm), os de Lee & Eisemann 2013. */
export const COMPRIMENTOS_DE_ONDA_NM: PorCanal<number> = [650, 510, 475];

// Linhas de Fraunhofer da fórmula de Abbe (nm).
const LAMBDA_D = 587.56;
const LAMBDA_F = 486.13;
const LAMBDA_C = 656.27;

interface Vidro {
  readonly nd: number;
  readonly vd: number;
}

/**
 * Índice de refração por Cauchy de dois termos, n = A + B/λ², ajustado para
 * n(587,6) = nd e n(486,1) − n(656,3) = (nd − 1)/Vd. APROXIMAÇÃO: as patentes
 * dão só nd/Vd (a anamórfica com 3 casas), e Lee & Eisemann usam Sellmeier.
 */
export function indiceDeRefracao(nd: number, vd: number, lambdaNm: number): number {
  const b = (nd - 1) / vd / (1 / LAMBDA_F ** 2 - 1 / LAMBDA_C ** 2);
  return nd + b * (1 / lambdaNm ** 2 - 1 / LAMBDA_D ** 2);
}

const indiceDoMeio = (v: Vidro | null, lambdaNm: number) =>
  v ? indiceDeRefracao(v.nd, v.vd, lambdaNm) : 1;

// ------------------------------------------------------------
// CAMADAS ANTIRREFLEXO. As patentes não as publicam: o tipo e o λ0 de cada
// superfície são ESCOLHA NOSSA. Dois tipos:
//  'simples' — uma camada de quarto de onda (Hullin et al. 2011, §3.1):
//      n1 = max(√n_vidro, 1,38), d1 = λ0/(4·n1); mínimo em λ0, resíduo de
//      1–4 % nas pontas do visível (o reflexo colorido das lentes antigas).
//  'moderno' — o quarto–meio–quarto clássico de banda larga (Lockhart & King
//      1947): ar | MgF2 λ0/4 | ZrO2 λ0/2 | camada média λ0/4 | vidro. A média
//      tem n = 0,95·1,38·√n_vidro (≈ Al2O3 no vidro comum; misturas nos
//      densos): o 0,95 achata o fundo em W, e com λ0 = 540 o resíduo fica
//      ≤ 0,34 % de 450 a 650 nm em todos os vidros das duas receitas. O λ0
//      dá a cor do resíduo: baixo (~480) âmbar/vermelho, ~540 verde e o
//      menor, alto (~600) azul/violeta, com a ponta oposta a até ~1,4 % em
//      vidro denso. Um λ0 só para todas faria todo fantasma da mesma cor.
// Índices das camadas sem dispersão; incidência normal (aproximações).
// ------------------------------------------------------------
const N_MGF2 = 1.38;
const N_ZRO2 = 2.05;
const K_CAMADA_MEDIA = 0.95;

export type TipoDeRevestimento = 'simples' | 'moderno';
export interface Camada {
  readonly n: number;
  /** espessura (nm) */
  readonly d: number;
}

/** As camadas, do ar para o vidro, projetadas para o vidro de índice `nVidro` (linha d). */
export function pilhaDoRevestimento(tipo: TipoDeRevestimento, nVidro: number, lambda0: number): Camada[] {
  const quarto = (n: number): Camada => ({ n, d: lambda0 / (4 * n) });
  if (tipo === 'simples') return [quarto(Math.max(Math.sqrt(nVidro), N_MGF2))];
  return [quarto(N_MGF2), { n: N_ZRO2, d: lambda0 / (2 * N_ZRO2) }, quarto(K_CAMADA_MEDIA * N_MGF2 * Math.sqrt(nVidro))];
}

/**
 * Refletância de uma pilha de filmes finos entre o ar e o vidro, pelo método
 * da matriz característica, em incidência normal. Sem absorção a matriz tem a
 * forma [[m11, i·m12], [i·m21, m22]] com m reais, e a refletância é a mesma
 * vista dos dois lados.
 */
export function refletanciaDaPilha(pilha: readonly Camada[], nVidro: number, lambdaNm: number): number {
  let m11 = 1;
  let m12 = 0;
  let m21 = 0;
  let m22 = 1;
  for (const { n, d } of pilha) {
    const fase = (2 * Math.PI * n * d) / lambdaNm;
    const co = Math.cos(fase);
    const si = Math.sin(fase);
    [m11, m12, m21, m22] = [
      m11 * co - m12 * n * si,
      (m11 * si) / n + m12 * co,
      m21 * co + m22 * n * si,
      m22 * co - (m21 * si) / n,
    ];
  }
  const re1 = m11 - m22 * nVidro;
  const im1 = m12 * nVidro - m21;
  const re2 = m11 + m22 * nVidro;
  const im2 = m12 * nVidro + m21;
  return (re1 * re1 + im1 * im1) / (re2 * re2 + im2 * im2);
}

type Forma = 'esfera' | 'cilindroX' | 'cilindroY' | 'plano' | 'diafragma';

interface Superficie {
  readonly nome: string;
  readonly forma: Forma;
  /** mm; Infinity para plano e diafragma */
  readonly raio: number;
  /** mm até a próxima superfície; na última, até o sensor (NaN = foco paraxial) */
  readonly ate: number;
  /** meio DEPOIS da superfície; null = ar */
  readonly vidro: Vidro | null;
  /** semidiâmetro livre (mm) */
  readonly semiDiametro: number;
  /** camada antirreflexo; null = interface colada (Fresnel puro) ou diafragma */
  readonly revestimento: { readonly tipo: TipoDeRevestimento; readonly lambda0: number } | null;
}

interface Receita {
  readonly nome: NomeDaLente;
  readonly superficies: readonly Superficie[];
  readonly fNumero: number;
  readonly laminas: number;
  /** 0 = lâminas retas, 1 = círculo (ver `margemDaIris`) */
  readonly curvaturaDaIris: number;
  /** meia-altura do quadro nativo da lente no sensor (mm) */
  readonly meiaAlturaNativa: number;
}

const moderno = (lambda0: number) => ({ tipo: 'moderno', lambda0 }) as const;
const simples = (lambda0: number) => ({ tipo: 'simples', lambda0 }) as const;

// ------------------------------------------------------------
// REDONDA — duplo Gauss da Agfa (Lautenbacher & Brendel), US 2,784,643,
// Exemplo 1 (PDF p. 3, col. 3), https://patents.google.com/patent/US2784643A/en.
// Impressa com f = 1, abertura 1:1,8; aqui ×50 (f = 50 mm). OCR: r3 = +0,39269.
// Posição do diafragma e semidiâmetros: modelo COMSOL da mesma lente (Smith,
// "Modern Lens Design", p. 323) em f = 100,2, Tabela 1:
// https://doc.comsol.com/6.0/doc/com.comsol.help.models.roptics.double_gauss_lens/double_gauss_lens.html
// — diafragma a 10,990 depois de S5 e 13,000 antes de S6; semidiâmetros ×50/100,2.
// Íris de 9 lâminas (Zeiss Master Prime, cinelenswiki), curvas como nas
// objetivas de cinema modernas: quase redonda, com um leve indício de 9 lados.
// Quadro nativo: o full frame 24×36 (meia-altura 12 mm).
//
// CAMADAS (ESCOLHA NOSSA): 'moderno' em toda superfície ar–vidro — é a lente
// discreta —, λ0 espalhado em 480–600 nm e intercalado para variar a cor do
// resíduo de cada fantasma.
// ------------------------------------------------------------
const ESCALA_AGFA = 50;
const CLARO_COMSOL = 50 / 100.2;
const FRACAO_DO_DIAFRAGMA = 10.99 / (10.99 + 13.0);
const AGFA_L1: Vidro = { nd: 1.71785, vd: 47.9 };
const AGFA_L2: Vidro = { nd: 1.6662, vd: 48.7 };
const AGFA_L3: Vidro = { nd: 1.67197, vd: 32.3 };

const agfa = (
  nome: string,
  r: number,
  t: number,
  vidro: Vidro | null,
  claro: number,
  lambda0: number | null,
): Superficie => ({
  nome,
  forma: Number.isFinite(r) ? 'esfera' : 'plano',
  raio: r * ESCALA_AGFA,
  ate: t * ESCALA_AGFA,
  vidro,
  semiDiametro: claro * CLARO_COMSOL,
  revestimento: lambda0 === null ? null : moderno(lambda0),
});

const REDONDA: Receita = {
  nome: 'redonda',
  fNumero: 1.8,
  laminas: 9,
  curvaturaDaIris: 0.75,
  meiaAlturaNativa: 12,
  superficies: [
    agfa('S1', 0.7505, 0.09002, AGFA_L1, 33.0, 530),
    agfa('S2', 2.70684, 0.001, null, 33.0, 590),
    agfa('S3', 0.39269, 0.16507, AGFA_L2, 27.5, 480),
    agfa('S4', Infinity, 0.01996, AGFA_L3, 24.5, null),
    agfa('S5', 0.25649, 0.23992 * FRACAO_DO_DIAFRAGMA, null, 19.5, 560),
    { ...agfa('DIAFRAGMA', Infinity, 0.23992 * (1 - FRACAO_DO_DIAFRAGMA), null, 18.6, null), forma: 'diafragma' },
    agfa('S6', -0.3187, 0.07026, AGFA_L3, 18.5, 500),
    agfa('S7', Infinity, 0.08982, AGFA_L1, 21.0, null),
    agfa('S8', -0.43515, 0.001, null, 21.0, 600),
    agfa('S9', 2.21163, 0.07984, AGFA_L2, 23.0, 510),
    agfa('S10', -0.88794, NaN, null, 23.0, 570),
  ],
};

// ------------------------------------------------------------
// ANAMÓRFICA — Iain A. Neil / Cooke Optics, US 9,341,827 B2 (2016), exemplo
// (família Cooke Anamorphic/i); tabelas só no Certificado de Correção,
// https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9341827
// (PDF p. 23–24 de 25). f/2,4; foco no infinito (vãos F1). EFL Y/X impressas
// 42,47 / 21,47; X é o eixo comprimido. nd/Vd decodificados do código de 6
// dígitos (3 casas). Sensor plano a 36,067 de S29 (a patente o curva).
// Íris: não publicada; 15 lâminas retas, quase redonda (ARRI/Zeiss Master
// Anamorphic). Quadro nativo: meia-altura de imagem da patente, 8,91 mm.
//
// CAMADAS (ESCOLHA NOSSA, a patente não as publica): 'simples' com λ0 em
// 665 nm, cujo resíduo reflete azul, SÓ em S7, a face da frente do grupo que
// comprime; 'moderno' em todo o resto, λ0 espalhado em 480–600 nm, com três
// exceções escolhidas pelo que cada par desenha:
//  - S6 e S9, os parceiros de S7 no risco horizontal (S6–S7 e S7–S9), em
//    595–600 nm, para o risco sair AZUL;
//  - S8 e S13 (o véu ciano de S7–S8, S7–S13, S8–S13 quando eram simples),
//    S3 e S26 (S3–S26, quase em foco: a linha vertical de alto a baixo) e
//    S14 e S15 (S14–S15, a faixa vertical azul pela coluna do Sol) em
//    540 nm, o menor resíduo.
// ------------------------------------------------------------
const S_LAL8: Vidro = { nd: 1.713, vd: 53.9 };
const S_LAL59: Vidro = { nd: 1.734, vd: 51.5 };
const S_BSL7: Vidro = { nd: 1.516, vd: 64.1 };
const S_FPL51: Vidro = { nd: 1.497, vd: 81.6 };
const SF57: Vidro = { nd: 1.847, vd: 23.8 };
const S_LAL12: Vidro = { nd: 1.678, vd: 55.3 };
const S_LAH58: Vidro = { nd: 1.883, vd: 40.8 };
const ZF7LHT: Vidro = { nd: 1.805, vd: 25.5 };
const S_BSM71: Vidro = { nd: 1.649, vd: 53.0 };
const HZLAF55A: Vidro = { nd: 1.835, vd: 42.7 };

const cooke = (
  nome: string,
  forma: Forma,
  ate: number,
  raio: number,
  vidro: Vidro | null,
  semiDiametro: number,
  revestimento: Superficie['revestimento'],
): Superficie => ({ nome, forma, raio, ate, vidro, semiDiametro, revestimento });

const ANAMORFICA: Receita = {
  nome: 'anamorfica',
  fNumero: 2.4,
  laminas: 15,
  curvaturaDaIris: 0,
  meiaAlturaNativa: 8.91,
  superficies: [
    cooke('S2', 'esfera', 5.2, 126.302, S_LAL8, 44.81, moderno(530)),
    cooke('S3', 'esfera', 36.814, 97.245, null, 41.68, moderno(540)),
    cooke('S4', 'esfera', 3.8, 353.064, S_LAL59, 33.93, moderno(480)),
    cooke('S5', 'esfera', 6.883, 92.759, null, 31.4, moderno(560)),
    cooke('S6', 'plano', 3.5, Infinity, S_BSL7, 25.26, moderno(595)),
    cooke('S7', 'cilindroX', 14.839, 42.117, null, 24.37, simples(665)),
    cooke('S8', 'cilindroX', 3.45, -32.15, S_FPL51, 22.9, moderno(540)),
    cooke('S9', 'plano', 5.746, Infinity, null, 22.76, moderno(600)),
    cooke('S10', 'cilindroY', 27.94, -173.155, SF57, 22.59, moderno(510)),
    cooke('S11', 'cilindroY', 0.63, -162.219, null, 23.3, moderno(570)),
    cooke('S12', 'plano', 12.51, Infinity, S_LAL12, 23.21, moderno(540)),
    cooke('S13', 'cilindroX', 0.653, -61.868, null, 22.89, moderno(540)),
    cooke('S14', 'cilindroY', 9.576, 50.915, S_LAH58, 22.28, moderno(540)),
    cooke('S15', 'cilindroY', 1.26, 46.847, null, 20.82, moderno(540)),
    cooke('S16', 'esfera', 7.688, 53.607, SF57, 20.27, moderno(520)),
    cooke('S17', 'esfera', 2.459, 31.937, null, 17.95, moderno(550)),
    cooke('S18', 'esfera', 10.712, 33.809, S_LAL8, 18.17, moderno(485)),
    cooke('S19', 'esfera', 0.25, -417.944, null, 17.14, moderno(595)),
    cooke('S20', 'esfera', 13.716, 34.017, ZF7LHT, 15.42, moderno(505)),
    cooke('S21', 'esfera', 13.684, 26.11, null, 10.05, moderno(565)),
    cooke('S22', 'diafragma', 8.868, Infinity, null, 7.51, null),
    cooke('S23', 'esfera', 2.64, -18.475, ZF7LHT, 6.73, moderno(515)),
    cooke('S24', 'esfera', 8.997, 82.967, S_BSM71, 8.2, null),
    cooke('S25', 'esfera', 0.14, -31.527, null, 10.85, moderno(575)),
    cooke('S26', 'esfera', 3.432, -121.596, HZLAF55A, 11.49, moderno(540)),
    cooke('S27', 'esfera', 0.1, -38.403, null, 12.03, moderno(585)),
    cooke('S28', 'esfera', 3.447, 84.972, HZLAF55A, 12.67, moderno(525)),
    cooke('S29', 'esfera', 36.067, -179.044, null, 13.2, moderno(545)),
  ],
};

// ------------------------------------------------------------
// O TRAÇADO
// ------------------------------------------------------------
type Matriz = readonly [number, number, number, number]; // [A, B, C, D]
type Eixo = 'x' | 'y';

const mult = (p: Matriz, q: Matriz): Matriz => [
  p[0] * q[0] + p[1] * q[2],
  p[0] * q[1] + p[1] * q[3],
  p[2] * q[0] + p[3] * q[2],
  p[2] * q[1] + p[3] * q[3],
];

function curvatura(s: Superficie, eixo: Eixo): number {
  if (s.forma === 'esfera') return 1 / s.raio;
  if (s.forma === 'cilindroX') return eixo === 'x' ? 1 / s.raio : 0;
  if (s.forma === 'cilindroY') return eixo === 'y' ? 1 / s.raio : 0;
  return 0;
}

interface Visita {
  readonly k: number;
  readonly sentido: 1 | -1;
  readonly reflete: boolean;
}

/** Ordem das superfícies visitadas: direto (par null) ou reflexão em j e depois em i. */
function visitas(n: number, par: readonly [number, number] | null): Visita[] {
  const v: Visita[] = [];
  const ida = (de: number, ate: number) => {
    for (let k = de; k < ate; k++) v.push({ k, sentido: 1, reflete: false });
  };
  if (!par) {
    ida(0, n);
    return v;
  }
  const [i, j] = par;
  ida(0, j);
  v.push({ k: j, sentido: 1, reflete: true });
  for (let k = j - 1; k > i; k--) v.push({ k, sentido: -1, reflete: false });
  v.push({ k: i, sentido: -1, reflete: true });
  ida(i + 1, n);
  return v;
}

interface Percurso {
  /** da entrada (h, t) ao plano da última superfície, depois dela */
  readonly sistema: Matriz;
  /** da entrada ao sensor */
  readonly sensor: Matriz;
  /** da entrada a cada passagem pelo plano do diafragma, em ordem */
  readonly travessias: readonly Matriz[];
  /** altura por unidade de h de entrada em cada superfície tocada, e o semidiâmetro dela */
  readonly aberturas: readonly { readonly a: number; readonly raio: number }[];
}

interface Geometria {
  readonly receita: Receita;
  readonly z: readonly number[];
  readonly zSensor: number;
}

function percorrer(g: Geometria, eixo: Eixo, lambdaNm: number, par: readonly [number, number] | null): Percurso {
  const sup = g.receita.superficies;
  const nDepois = sup.map((s) => indiceDoMeio(s.vidro, lambdaNm));
  const nAntes = nDepois.map((_, k) => (k > 0 ? nDepois[k - 1] : 1));
  let m: Matriz = [1, 0, 0, 1];
  let z = 0;
  const travessias: Matriz[] = [];
  const aberturas: { a: number; raio: number }[] = [];
  const ir = (zNovo: number) => {
    m = mult([1, zNovo - z, 0, 1], m);
    z = zNovo;
  };
  for (const { k, sentido, reflete } of visitas(sup.length, par)) {
    const s = sup[k];
    ir(g.z[k]);
    if (s.forma === 'diafragma') {
      travessias.push(m);
      continue;
    }
    aberturas.push({ a: m[0], raio: s.semiDiametro });
    const c = curvatura(s, eixo);
    if (reflete) {
      m = mult([1, 0, -2 * c, -1], m);
    } else {
      const [n1, n2] = sentido > 0 ? [nAntes[k], nDepois[k]] : [nDepois[k], nAntes[k]];
      m = mult([1, 0, ((n1 - n2) * c) / n2, n1 / n2], m);
    }
  }
  const sistema = m;
  ir(g.zSensor);
  return { sistema, sensor: m, travessias, aberturas };
}

/** Posições z dos vértices; o sensor no foco paraxial (linha d, eixo y) quando a receita não o dá. */
function geometria(receita: Receita): Geometria {
  const z: number[] = [];
  let acc = 0;
  for (const s of receita.superficies) {
    z.push(acc);
    acc += s.ate;
  }
  const ultimo = receita.superficies[receita.superficies.length - 1];
  if (Number.isFinite(ultimo.ate)) return { receita, z, zSensor: acc };
  const zUltimo = z[z.length - 1];
  const prov = percorrer({ receita, z, zSensor: zUltimo }, 'y', LAMBDA_D, null).sistema;
  return { receita, z, zSensor: zUltimo - prov[0] / prov[2] };
}

/** Refletância da superfície k em λ: colada = Fresnel puro entre os dois vidros; ar–vidro = a pilha dela. */
function refletanciaDaSuperficie(sup: readonly Superficie[], k: number, lambdaNm: number): number {
  const s = sup[k];
  const antes = k > 0 ? sup[k - 1].vidro : null;
  const nAntes = indiceDoMeio(antes, lambdaNm);
  const nDepois = indiceDoMeio(s.vidro, lambdaNm);
  if (!s.revestimento) return ((nAntes - nDepois) / (nAntes + nDepois)) ** 2;
  const vidro = s.vidro ?? antes;
  const pilha = pilhaDoRevestimento(s.revestimento.tipo, vidro ? vidro.nd : 1, s.revestimento.lambda0);
  return refletanciaDaPilha(pilha, Math.max(nAntes, nDepois), lambdaNm);
}

// ------------------------------------------------------------
// OS FANTASMAS
// ------------------------------------------------------------

/**
 * Um fantasma: luz que reflete na superfície j, volta, reflete na i (< j) e
 * segue ao sensor. Para a fonte em t e um raio de entrada na altura h (dentro
 * do disco frontal), por eixo e canal:
 *   no diafragma  q = Aa·h + Ba·t   (tem de cair dentro do polígono da íris)
 *   no sensor     p = As·h + Bs·t
 */
export interface Fantasma {
  /** nomes das duas superfícies que refletem, [i, j], i antes de j */
  readonly superficies: readonly [string, string];
  /** quantas vezes o caminho cruza o plano do diafragma (1 ou 3) e qual delas recorta (1, 2 ou 3) */
  readonly travessias: number;
  readonly travessiaUsada: number;
  readonly As: PorCanal<PorEixo>;
  readonly Bs: PorCanal<PorEixo>;
  /** |Aa| tem piso PISO_AA (sinal mantido): diafragma em foco do fantasma não recorta */
  readonly Aa: PorCanal<PorEixo>;
  readonly Ba: PorCanal<PorEixo>;
  /** R_i·R_j por canal */
  readonly refletancia: PorCanal<number>;
  /** irradiância do fantasma por unidade de irradiância de entrada: R_i·R_j / max(|As_x·As_y|, EPS_AREA) */
  readonly ganho: PorCanal<number>;
  /** a nota da triagem (energia dentro do quadro, ver `metricaDaTriagem`) */
  readonly metrica: number;
}

export interface Lente {
  readonly nome: NomeDaLente;
  /** distâncias focais paraxiais na linha d (mm) */
  readonly focal: PorEixo;
  /** S = f_y / f_x: 1 na redonda, ≈ 1,98 na anamórfica */
  readonly esmagamento: number;
  readonly fNumero: number;
  /** semidiâmetro livre da primeira superfície (mm): o disco de entrada */
  readonly raioFrontal: number;
  /** raio da íris (mm), vértices do polígono sobre este círculo */
  readonly raioDaIris: number;
  readonly laminas: number;
  /** ângulo de um vértice da íris (rad, a partir de +x) */
  readonly rotacaoDaIris: number;
  /** curvatura das lâminas: 0 = retas, 1 = círculo (ver `margemDaIris`) */
  readonly curvaturaDaIris: number;
  /** meia-altura do quadro nativo da lente no sensor (mm), ver `escalaDoCampo` */
  readonly meiaAlturaNativa: number;
  /** distância do último vértice ao sensor (mm) */
  readonly focoPosterior: number;
  /** todos os pares enumerados, os descartados por não chegarem ao sensor, e os guardados (mais fortes primeiro) */
  readonly totalDeFantasmas: number;
  readonly descartados: number;
  readonly fantasmas: readonly Fantasma[];
}

/**
 * Piso de |As_x·As_y| no ganho. Um fantasma em foco perfeito (As → 0) teria
 * irradiância infinita; na lente real as aberrações, que o modelo paraxial
 * não vê, o espalham. 1e-4 = como se o feixe chegasse ao sensor com ao menos
 * 1 % do tamanho que tinha na entrada, em cada eixo (≈ 0,14 mm para a pupila
 * de f/1,8 da redonda).
 */
export const EPS_AREA = 1e-4;
/** Piso de |Aa| (sinal mantido), para a íris recuada ao espaço de entrada ficar finita. */
export const PISO_AA = 1e-6;
/** Teto de fantasmas guardados por lente. */
export const MAX_FANTASMAS = 48;
/** Corte relativo da triagem: abaixo de 1e-3 da nota do mais forte, o fantasma não aparece. */
const CORTE_RELATIVO = 1e-3;
/**
 * "Não chega ao sensor de modo são": no eixo (t = 0), os semidiâmetros das
 * superfícies tocadas (e as travessias do diafragma que não recortam)
 * deixam passar menos que esta fração do raio que o disco frontal e a íris
 * deixam, em algum eixo. O modelo de Lee & Eisemann ignora essas bordas;
 * aqui elas só servem para descartar o fantasma que o vidro real apagaria.
 */
const FRACAO_MINIMA_SEM_VINHETA = 0.1;
/** Quadro de referência da triagem: 16:9 (com o quadro nativo, o FOV se cancela). */
const FOV_Y_REFERENCIA = (50 * Math.PI) / 180;
const ASPECTO_REFERENCIA = 16 / 9;

const VERDE = 1;

/**
 * A FORMA DA ÍRIS, num lugar só: margem com sinal (mm; ≥ 0 = dentro) até a
 * borda de um polígono regular de `laminas` lados, vértices no círculo `raio`
 * (um deles no ângulo `rotacao`), com lados em arco de círculo de raio
 * raio/`curvatura` (0 = lâminas retas, 1 = círculo). No referencial do setor,
 * x ao longo da normal do lado, o arco passa pelos vértices (a, ±b),
 * a = r·cos(π/N), b = r·sen(π/N), e dentro ⇔
 *   x + κ·(|q|² − 2a·x + a² − b²) / (2·√(r² − κ²·b²)) ≤ a.
 * A margem é a distância exata com κ = 0 e ≈ distância perto da borda; sem
 * ramos, porta para o GLSL em poucas linhas.
 */
export function margemDaIris(
  qx: number,
  qy: number,
  raio: number,
  laminas: number,
  rotacao: number,
  curvatura: number,
): number {
  const setor = (2 * Math.PI) / laminas;
  const fi = Math.atan2(qy, qx) - rotacao;
  const psi = fi - setor * Math.floor(fi / setor) - setor / 2;
  const q2 = qx * qx + qy * qy;
  const x = Math.sqrt(q2) * Math.cos(psi);
  const a = raio * Math.cos(setor / 2);
  const b = raio * Math.sin(setor / 2);
  const arco = (q2 - 2 * a * x + a * a - b * b) / (2 * Math.sqrt(raio * raio - curvatura * curvatura * b * b));
  return a - x - curvatura * arco;
}

/** O raio do diafragma `q` (mm) passa pela íris desta lente. */
export const dentroDaIris = (lente: Lente, qx: number, qy: number): boolean =>
  margemDaIris(qx, qy, lente.raioDaIris, lente.laminas, lente.rotacaoDaIris, lente.curvaturaDaIris) >= 0;

const comPiso = (a: number) => (Math.abs(a) < PISO_AA ? (a < 0 ? -PISO_AA : PISO_AA) : a);

export interface QuadNdc {
  /** centro em NDC */
  readonly cx: number;
  readonly cy: number;
  /** meias-larguras em NDC */
  readonly mx: number;
  readonly my: number;
}

/**
 * Por eixo, a caixa mais justa das duas que contêm o fantasma: a imagem do
 * disco frontal (centro Bs·t, meia-largura |As|·rF) ou a imagem da íris
 * recuada à entrada (centro (Bs − As·Ba/Aa)·t, meia-largura |As|·rI/|Aa|).
 * As duas são independentes de t na largura e lineares em t no centro.
 */
function eixoDoQuad(as: number, bs: number, aa: number, ba: number, t: number, rF: number, rI: number) {
  const w1 = Math.abs(as) * rF;
  const w2 = (Math.abs(as) * rI) / Math.abs(aa);
  const iris = w2 < w1 ? 1 : 0;
  return { centro: (bs - (iris * as * ba) / aa) * t, meia: Math.min(w1, w2) };
}

/**
 * APROXIMAÇÃO DECLARADA: o quadro do app é mapeado sobre o quadro NATIVO da
 * lente, qualquer que seja o FOV do app (os filmes vão de 8° a 75°), para o
 * reflexo ser o desenho da própria lente no próprio quadro. A tangente da
 * fonte no app vira t_lente = k·t_app, k = (h_nat/f_y)/tan(fovY/2), o mesmo
 * fator nos dois eixos — isotrópico, então a imagem principal da fonte ainda
 * cai exatamente onde o app a projeta. O render usa t_lente em As·h + Bs·t e
 * Aa·h + Ba·t.
 */
const escalaDoCampo = (lente: Lente, fovY: number): number =>
  lente.meiaAlturaNativa / lente.focal.y / Math.tan(fovY / 2);

/**
 * Onde o fantasma cai na tela, para a fonte nas tangentes do APP (tx, ty).
 * Câmera do app: perspectiva retilínea com FOV vertical `fovY` (rad) e
 * `aspecto`. Meia-altura do sensor virtual = h_nat da lente; x do sensor é
 * desesmagado por S = f_y/f_x e dividido por aspecto·h_nat; y por h_nat.
 */
export function quadNoEcra(
  lente: Lente,
  f: Fantasma,
  canal: number,
  tx: number,
  ty: number,
  fovY: number,
  aspecto: number,
): QuadNdc {
  const k = escalaDoCampo(lente, fovY);
  const h = lente.meiaAlturaNativa;
  const sx = lente.esmagamento / (aspecto * h);
  const As = f.As[canal], Bs = f.Bs[canal], Aa = f.Aa[canal], Ba = f.Ba[canal];
  const x = eixoDoQuad(As.x, Bs.x, Aa.x, Ba.x, k * tx, lente.raioFrontal, lente.raioDaIris);
  const y = eixoDoQuad(As.y, Bs.y, Aa.y, Ba.y, k * ty, lente.raioFrontal, lente.raioDaIris);
  return { cx: x.centro * sx, cy: y.centro / h, mx: x.meia * sx, my: y.meia / h };
}

/** Área (mm²) do disco frontal cujos raios passam pela íris, fonte em tangentes da LENTE, por amostragem em grade. */
function areaQuePassa(lente: Lente, f: Fantasma, tx: number, ty: number): number {
  const n = 40;
  const r = lente.raioFrontal;
  const passo = (2 * r) / n;
  const Aa = f.Aa[VERDE], Ba = f.Ba[VERDE];
  let conta = 0;
  for (let a = 0; a < n; a++) {
    const hx = -r + (a + 0.5) * passo;
    for (let b = 0; b < n; b++) {
      const hy = -r + (b + 0.5) * passo;
      if (hx * hx + hy * hy > r * r) continue;
      const qx = Aa.x * hx + Ba.x * tx;
      const qy = Aa.y * hy + Ba.y * ty;
      if (dentroDaIris(lente, qx, qy)) conta++;
    }
  }
  return conta * passo * passo;
}

/** Fração da caixa do fantasma dentro do quadro [−1, 1]². */
function fracaoNoQuadro(q: QuadNdc): number {
  const ox = Math.max(0, Math.min(1, q.cx + q.mx) - Math.max(-1, q.cx - q.mx));
  const oy = Math.max(0, Math.min(1, q.cy + q.my) - Math.max(-1, q.cy - q.my));
  const area = 4 * q.mx * q.my;
  if (area <= 0) return Math.abs(q.cx) <= 1 && Math.abs(q.cy) <= 1 ? 1 : 0;
  return (ox * oy) / area;
}

/**
 * A nota da triagem: energia do fantasma dentro do quadro = ganho médio ×
 * área visível = média_c(R_i·R_j) × (área de entrada que passa pela íris) ×
 * (fração da caixa dentro do quadro), somada para a fonte no centro e no meio
 * campo (meio caminho do canto, NDC (0,5; 0,5)), no quadro de referência.
 */
function metricaDaTriagem(lente: Lente, f: Fantasma): number {
  const tan = Math.tan(FOV_Y_REFERENCIA / 2);
  const k = escalaDoCampo(lente, FOV_Y_REFERENCIA);
  const meioCampo: readonly [number, number] = [0.5 * ASPECTO_REFERENCIA * tan, 0.5 * tan];
  const r = (f.refletancia[0] + f.refletancia[1] + f.refletancia[2]) / 3;
  let soma = 0;
  for (const [tx, ty] of [[0, 0], meioCampo] as const) {
    const q = quadNoEcra(lente, f, VERDE, tx, ty, FOV_Y_REFERENCIA, ASPECTO_REFERENCIA);
    soma += r * areaQuePassa(lente, f, k * tx, k * ty) * fracaoNoQuadro(q);
  }
  return soma;
}

const porEixo = (x: number, y: number): PorEixo => ({ x, y });
const tripla = <T>(fn: (c: number) => T): PorCanal<T> => [fn(0), fn(1), fn(2)];

function montarLente(receita: Receita): Lente {
  const g = geometria(receita);
  const sup = receita.superficies;
  const direto = (eixo: Eixo) => percorrer(g, eixo, LAMBDA_D, null);
  const dx = direto('x'), dy = direto('y');
  const focal = porEixo(-1 / dx.sistema[2], -1 / dy.sistema[2]);
  // Pupila de entrada pelo f-número (eixo y, o da focal nominal); a íris é a
  // imagem dela no plano do diafragma: r_íris = |A_diafragma|·f_y/(2N).
  const raioDaIris = Math.abs(dy.travessias[0][0]) * (focal.y / (2 * receita.fNumero));
  const base = {
    nome: receita.nome,
    focal,
    esmagamento: focal.y / focal.x,
    fNumero: receita.fNumero,
    raioFrontal: sup[0].semiDiametro,
    raioDaIris,
    laminas: receita.laminas,
    rotacaoDaIris: Math.PI / 2,
    curvaturaDaIris: receita.curvaturaDaIris,
    meiaAlturaNativa: receita.meiaAlturaNativa,
    focoPosterior: g.zSensor - g.z[g.z.length - 1],
  };

  const opticas = sup.map((s, k) => (s.forma === 'diafragma' ? -1 : k)).filter((k) => k >= 0);
  const candidatos: Fantasma[] = [];
  let total = 0;
  let descartados = 0;
  for (let a = 0; a < opticas.length; a++) {
    for (let b = a + 1; b < opticas.length; b++) {
      total++;
      const par: readonly [number, number] = [opticas[a], opticas[b]];
      const caminhos = COMPRIMENTOS_DE_ONDA_NM.map((l) => ({
        x: percorrer(g, 'x', l, par),
        y: percorrer(g, 'y', l, par),
      }));
      // Travessia que recorta: com várias passagens pelo plano do diafragma,
      // a de maior |Aa_x·Aa_y| (verde) — a íris recuada à entrada fica menor
      // ali. No eixo as íris recuadas são concêntricas, e a interseção delas
      // É a menor: exato em t = 0, aproximado fora (Lee & Eisemann recortam
      // por uma abertura só).
      const v = caminhos[VERDE];
      let usada = 0;
      for (let k = 1; k < v.x.travessias.length; k++) {
        const area = (m: number) => Math.abs(v.x.travessias[m][0] * v.y.travessias[m][0]);
        if (area(k) > area(usada)) usada = k;
      }
      const f: Fantasma = {
        superficies: [sup[par[0]].nome, sup[par[1]].nome],
        travessias: v.x.travessias.length,
        travessiaUsada: usada + 1,
        As: tripla((c) => porEixo(caminhos[c].x.sensor[0], caminhos[c].y.sensor[0])),
        Bs: tripla((c) => porEixo(caminhos[c].x.sensor[1], caminhos[c].y.sensor[1])),
        Aa: tripla((c) =>
          porEixo(comPiso(caminhos[c].x.travessias[usada][0]), comPiso(caminhos[c].y.travessias[usada][0])),
        ),
        Ba: tripla((c) => porEixo(caminhos[c].x.travessias[usada][1], caminhos[c].y.travessias[usada][1])),
        refletancia: tripla((c) => {
          const l = COMPRIMENTOS_DE_ONDA_NM[c];
          return refletanciaDaSuperficie(sup, par[0], l) * refletanciaDaSuperficie(sup, par[1], l);
        }),
        ganho: [0, 0, 0],
        metrica: 0,
      };
      const ganho = tripla(
        (c) => f.refletancia[c] / Math.max(Math.abs(f.As[c].x * f.As[c].y), EPS_AREA),
      );
      // Sanidade: números finitos e o vidro real não apaga o fantasma no eixo.
      const vinheta = (p: Percurso, aa: number) => {
        const rIF = Math.min(base.raioFrontal, raioDaIris / Math.abs(aa));
        let rElem = Infinity;
        for (const ab of p.aberturas) rElem = Math.min(rElem, ab.raio / Math.abs(ab.a));
        p.travessias.forEach((m, k) => {
          if (k !== usada) rElem = Math.min(rElem, raioDaIris / Math.abs(m[0]));
        });
        return rElem < FRACAO_MINIMA_SEM_VINHETA * rIF;
      };
      const numeros = [f.As, f.Bs, f.Aa, f.Ba].flatMap((t) => t.flatMap((e) => [e.x, e.y]));
      if (
        !numeros.every(Number.isFinite) ||
        !ganho.every(Number.isFinite) ||
        vinheta(v.x, f.Aa[VERDE].x) ||
        vinheta(v.y, f.Aa[VERDE].y)
      ) {
        descartados++;
        continue;
      }
      candidatos.push({ ...f, ganho });
    }
  }
  const semFantasmas: Lente = { ...base, totalDeFantasmas: total, descartados, fantasmas: [] };
  const notados = candidatos
    .map((f) => ({ ...f, metrica: metricaDaTriagem(semFantasmas, f) }))
    .sort((p, q) => q.metrica - p.metrica);
  const corte = (notados[0]?.metrica ?? 0) * CORTE_RELATIVO;
  const fantasmas = notados.filter((f) => f.metrica >= corte && f.metrica > 0).slice(0, MAX_FANTASMAS);
  return { ...semFantasmas, fantasmas };
}

const RECEITAS: Record<NomeDaLente, Receita> = { redonda: REDONDA, anamorfica: ANAMORFICA };
const cache = new Map<NomeDaLente, Lente>();

/** A lente calculada (uma vez) a partir da receita. */
export function lente(nome: NomeDaLente): Lente {
  let l = cache.get(nome);
  if (!l) {
    l = montarLente(RECEITAS[nome]);
    cache.set(nome, l);
  }
  return l;
}
