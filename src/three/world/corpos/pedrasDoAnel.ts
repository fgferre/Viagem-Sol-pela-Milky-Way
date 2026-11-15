// ============================================================
// AS PEDRAS DO ANEL EM 3D (`?pedras=3d`, 14/11) — de perto, o anel de
// Saturno se desfaz em pedaços de gelo SÓLIDOS, com forma, tamanho e
// sombra, e o disco liso cede a luz que eles passam a carregar.
//
// O PEDIDO, palavras dele (resumidas): "de perto os anéis parecem um disco
// plano e liso; conforme a câmera se aproxima, milhares de pedaços de gelo
// e rocha em 3D, de tamanhos e formatos variados, orbitando onde estão as
// faixas; a passagem tem de ser imperceptível, nada brotando do nada".
//
// O NOVO ENTRA AO LADO: sem o parâmetro a casa monta a lajota volumétrica
// de sempre (`lajotaDoAnel.ts`, visual aprovado) e o `ANEL_FRAG` sai byte a
// byte o de antes. Com ele, esta peça toma o lugar da lajota.
//
// O DESENHO, em quatro leis:
//
//  1. UMA POPULAÇÃO SÓ, POR OITAVAS. Os tamanhos seguem dN/ds ∝ s⁻³ (a lei
//     dos anéis de verdade: cada oitava de tamanho cobre a MESMA área), de
//     `S_MAX_KM` até `S_MAX_KM / 2^(OITAVAS−1)`. Cada oitava é um ladrilho
//     periódico de `PEDRAS_POR_TIER` pedras, de lado 2·K·s, centrado na
//     câmera: na borda (distância K·s) a pedra mede 1/K rad — poucos pixels
//     — e entra com TAMANHO ZERO, crescendo até o tamanho cheio a 0,55·K·s.
//     Descer acende oitavas cada vez mais finas a partir do sub-pixel; uma
//     pedra que apareceu não some de perto: ela cresce e sai do quadro.
//
//  2. O LADRILHO É POLAR E MORA EM VOLTA DA CÂMERA. As coordenadas são o
//     raio ρ e o arco s = R0·θ (R0 fixo, `R0_KM`), e o período em arco
//     divide a volta inteira (sem costura em θ = ±π). Tudo o que a GPU
//     soma é RELATIVO à câmera — a fração dela no ladrilho sai da CPU em
//     dupla precisão —, então a pedra de 2 m a 30 m da lente não treme: o
//     float32 só vê números pequenos. É o truque do ladrilho ancorado da
//     lajota, levado para perto.
//
//  3. O CISALHAMENTO DE KEPLER, MEDIDO NO RAIO DA CÂMERA. Cada pedra anda
//     no arco com Ω(ρ) − Ω(ρ_câmera): as de dentro ultrapassam, as de fora
//     ficam para trás. As integrais do cisalhamento (G, E) andam com o
//     relógio do app, na CPU, quadro a quadro — relógio parado, pedra
//     parada; mexer a câmera não mexe pedra nenhuma. Com o relógio
//     acelerado, o passo do quadro tem um TETO contínuo (`tanh`) para que
//     nenhuma pedra ande mais que ~1/5 do próprio tamanho por quadro.
//
//  4. A LUZ SE CONSERVA. O disco cede, em cada ponto, a fração da
//     profundidade óptica que as oitavas já resolvidas ali carregam
//     (`cessaoDoDisco`): de longe ele é o de hoje; dentro da lâmina, perto
//     da câmera, sobram só as pedras e o que se vê através delas.
//
// O QUE É EXAGERO está no cadastro de escala (`src/three/escala.ts`, id
// `pedras-do-anel-de-saturno`): as oitavas acima de ~10 m (até 6,4 km), a
// espessura que acompanha essas oitavas e o giro próprio.
//
// O FRAME é o do anel (o mesmo da lajota): plano XY, +Z o polo, unidade =
// raio equatorial; a matriz vem copiada do mesh do anel.
// ============================================================
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { BODY_AXES } from '../../../lib/atlas/iauOrientation';
import type { QualityLevel } from '../../core/engine';

/** O interruptor: só `?pedras=3d` liga a peça nova. */
export const PEDRAS_3D: boolean =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('pedras') === '3d';

const KM_POR_RAIO = BODY_AXES.saturn[0]!;

/** GM de Saturno, km³/s² (JPL) — só para Ω(ρ) do cisalhamento. */
const GM_SATURNO = 37_931_207;

/**
 * O RAIO DE REFERÊNCIA DO ARCO: s = R0·θ. Fica logo além da borda do A
 * (136 775 km), então o ladrilho só ENCOLHE no arco por ρ/R0 ≤ 1, e o
 * aceite da densidade devolve a diferença (ver `aceitaPedra`).
 */
export const R0_KM = 138_600;

/** quantas oitavas de tamanho — de 3,2 km até 1,56 m */
export const OITAVAS = 12;
/** o DIÂMETRO mínimo da oitava 0; cada oitava sorteia de s a 2s */
export const S_MAX_KM = 3.2;
/**
 * AS OITAVAS DE VERDADE: as três últimas (1,56 a 12,5 m), o tamanho das
 * maiores partículas medidas no anel. As de cima são AGLOMERADOS (a
 * "multidão" que a lajota já confessava): de longe uma pedra, de perto
 * ela se DESFAZ nas partes — ver `presencaDaOitava`.
 */
export const PRIMEIRA_OITAVA_REAL = 9;
/**
 * A JANELA, em oitavas de distância (x = log2(d/s)): a pedra entra em
 * x = 7 (d = 128·s, onde ela mede 1/128 rad, ~6 px na lente de 58° em
 * 800 px) com tamanho ZERO e termina de crescer em x = 6; o aglomerado
 * começa a se desfazer em x = 4 (~50 px) e some em x = 3 (~100 px). Os
 * quatro números são inteiros DE PROPÓSITO: com rampas de uma oitava e
 * janela de quatro, em toda distância há exatamente TRÊS oitavas inteiras
 * presentes (as rampas vizinhas se completam) — é o que deixa a conta da
 * luz fechar sem ondular.
 */
export const X_ENTRA = 7;
export const X_DESFAZ = 3;
export const PRESENTES = X_ENTRA - X_DESFAZ - 1;
/** a janela em tamanhos: 2^7 */
export const K_JANELA = 2 ** X_ENTRA;
/**
 * A MEIA-ESPESSURA da lâmina de cada oitava: 2,5 tamanhos, com piso de
 * 15 m — a lâmina das oitavas pequenas é a do anel de verdade (dezenas
 * de metros); a das grandes acompanha o exagero delas.
 */
const ESPESSURA_EM_TAMANHOS = 2.5;
const ESPESSURA_MINIMA_KM = 0.015;

/**
 * QUANTAS PEDRAS POR OITAVA, por tier. O tier de baixo é um PREFIXO do de
 * cima (a pedra (oitava, i) tem o mesmo sorteio em qualquer tier): menos
 * pedras é um campo mais ralo, não outro campo — a doutrina da lajota.
 */
export const PEDRAS_POR_TIER: Readonly<Record<QualityLevel, number>> = {
  cinema: 16384,
  alta: 8192,
  performance: 3072,
};

/**
 * A PROFUNDIDADE ÓPTICA QUE O CAMPO CHEIO CARREGA (tier cinema, em R0): as
 * três oitavas presentes × n·σ̄, com n = M/(2K·s)² por ladrilho e σ̄ a
 * seção média de uma pedra — (π/4)s² × E[x²] da lei s⁻³ em [1, 2)
 * (ln2/(3/8)) × 0,58 da forma achatada × 0,92 da rugosidade. Onde o perfil
 * pede mais que isto (o miolo do B), o campo satura: é o TETO declarado.
 */
export const TAU_TETO =
  (PRESENTES * PEDRAS_POR_TIER.cinema * (Math.PI / 4) * (Math.LN2 / 0.375) * 0.58 * 0.92) /
  (4 * K_JANELA * K_JANELA);

export interface Oitava {
  /** diâmetro mínimo, km */
  s: number;
  /** raio da janela, km (= K·s) */
  janela: number;
  /** lado radial do ladrilho, km (= 2·janela) */
  ladoRadial: number;
  /** lado do ladrilho no arco, km — divide 2π·R0 exato */
  ladoNoArco: number;
  /** quantos ladrilhos fecham a volta */
  voltas: number;
  /** meia-espessura da lâmina, km */
  meiaEspessura: number;
}

export const TABELA_DE_OITAVAS: readonly Oitava[] = Array.from({ length: OITAVAS }, (_, o) => {
  const s = S_MAX_KM / 2 ** o;
  const janela = K_JANELA * s;
  const ladoRadial = 2 * janela;
  const voltas = Math.round((2 * Math.PI * R0_KM) / ladoRadial);
  return {
    s,
    janela,
    ladoRadial,
    ladoNoArco: (2 * Math.PI * R0_KM) / voltas,
    voltas,
    meiaEspessura: Math.max(ESPESSURA_MINIMA_KM, ESPESSURA_EM_TAMANHOS * s),
  };
});

const grampo = (x: number) => Math.min(1, Math.max(0, x));

/**
 * A PRESENÇA da oitava `o` a `dKm` da câmera (na régua do ladrilho), em
 * área: entra (0 → 1) de x = 7 a x = 6, e — só nos aglomerados — se
 * desfaz (1 → 0) de x = 4 a x = 3. A pedra cresce com √ disto (a área é
 * que conta a luz) e o aglomerado se esburaca na mesma fração. É a mesma
 * conta do vértice.
 */
export function presencaDaOitava(o: number, dKm: number): number {
  const x = Math.log2(Math.max(dKm, 1e-12) / TABELA_DE_OITAVAS[o]!.s);
  const entra = grampo(X_ENTRA - x);
  const fica = o >= PRIMEIRA_OITAVA_REAL ? 1 : grampo(x - X_DESFAZ);
  return entra * fica;
}

/**
 * QUANTO DO DISCO AS PEDRAS JÁ CARREGAM a `dKm` da câmera: cada oitava
 * presente carrega um terço da profundidade óptica (a lei s⁻³ dá a mesma
 * parte a cada oitava). 0 longe, 1 onde as três estão inteiras.
 */
export function cessaoDoDisco(dKm: number): number {
  let f = 0;
  for (let o = 0; o < OITAVAS; o++) f += presencaDaOitava(o, dKm);
  return Math.min(f / PRESENTES, 1);
}

/**
 * O ALFA DO DISCO DEPOIS DA CESSÃO — conserva a TRANSMISSÃO: o disco fica
 * com τ·(1 − F), e é o resto que as pedras carregam. F = 0 devolve o alfa
 * de hoje, exato.
 */
export function alfaCedido(alfa: number, f: number): number {
  if (f <= 0) return alfa;
  return 1 - Math.max(1 - alfa, 1e-4) ** (1 - Math.min(f, 1));
}

/**
 * A PARCELA DAS PEDRAS (segunda volta): quanto da cessão o disco de fato
 * entrega, pela ALTURA da câmera. O anel visto de 20 km ainda é uma lâmina
 * contínua de grãos menores que um pixel: as pedras resolvidas assumem só
 * `PARCELA_NO_ALTO` da luz e o disco segue atrás e entre elas como a
 * multidão não resolvida. Dos `H_CEDE_KM` para baixo o resto vai cedendo,
 * contínuo e monotônico na escala log da altura, até a borda da lâmina de
 * verdade (`ESPESSURA_MINIMA_KM`), onde sobra só o que as pedras carregam.
 */
export const PARCELA_NO_ALTO = 0.35;
export const H_CEDE_KM = 2;
export function parcelaDasPedras(alturaKm: number): number {
  const h = Math.max(Math.abs(alturaKm), 1e-9);
  const t = grampo(Math.log2(H_CEDE_KM / h) / Math.log2(H_CEDE_KM / ESPESSURA_MINIMA_KM));
  return PARCELA_NO_ALTO + (1 - PARCELA_NO_ALTO) * t * t * (3 - 2 * t);
}

/**
 * O GRÃO DA LÂMINA: a força da folha de grãos (`FolhaDeGraos`), 0 acima de
 * `H_CEDE_KM`, inteira três oitavas de altura abaixo (250 m).
 */
export function forcaDoGrao(alturaKm: number): number {
  const h = Math.max(Math.abs(alturaKm), 1e-9);
  const t = grampo(Math.log2(H_CEDE_KM / h) / 3);
  return t * t * (3 - 2 * t);
}

/**
 * A NÉVOA DA LÂMINA: de raspão (μ = |z|/d pequeno) o disco não cede — a
 * lâmina vista de lado é a multidão inteira, uma faixa macia no horizonte
 * do anel. A altura da conta tem piso de duas lâminas (30 m): o vPos do
 * disco só tem ~15 m de precisão a 2 raios, e com a câmera a 3 m o μ
 * pontilhava de pixel em pixel. E sobre as pedras, a fração `NEVOA_K` da profundidade óptica do
 * trecho de raio que corre dentro da lâmina (o resto já está nelas).
 */
export const MU_RASANTE = 0.04;
export const NEVOA_K = 0.25;

/**
 * O ACEITE DA DENSIDADE: a pedra fica se o sorteio cair abaixo de
 * τ·ρ/(R0·TAU_TETO). O ρ/R0 devolve o encolhimento do ladrilho no arco;
 * τ = 0 (divisão vazia, fora do anel) não aceita pedra nenhuma.
 */
export function aceitaPedra(tau: number, rhoKm: number, sorteio: number): boolean {
  return sorteio * TAU_TETO * R0_KM < tau * rhoKm;
}

/** Ω kepleriano a `rhoKm` do centro, rad/s */
function omega(rhoKm: number): number {
  return Math.sqrt(GM_SATURNO / (rhoKm * rhoKm * rhoKm));
}

/**
 * O TETO DO PASSO DO RELÓGIO (s de app por quadro): a pedra na borda da
 * janela anda no arco 1,5·Ω·R0/ρ · K·s por segundo; um quinto do tamanho
 * por quadro é o limite. É o mesmo número em toda oitava (a janela anda
 * com o tamanho).
 */
export function tetoDoPasso(rhoKm: number): number {
  return 0.2 / (1.5 * omega(rhoKm) * (R0_KM / rhoKm) * K_JANELA);
}

/** o período do giro próprio (s de app) — escolha de cinema, declarada */
const PERIODO_DO_GIRO_S = 6 * 3600;

const glslF = (x: number) => x.toExponential(9);

/**
 * O MATERIAL DE GELO (segunda volta, 14/11) — os números que o vértice, o
 * fragmento e o teste dividem. O gelo espalha luz por dentro: o terminador
 * "dá a volta" (`ENVOLVE`, a luz embrulhada), e o lado da noite nunca fica
 * preto — o anel em volta ilumina a pedra com a própria cor
 * (`AMBIENTE_DO_ANEL`, apagado com a sombra do globo até o piso
 * `PISO_DA_NOITE`), e o globo com a cor quente dele.
 */
export const ENVOLVE = 0.2;
export const AMBIENTE_DO_ANEL = 0.05;
export const PISO_DA_NOITE = 0.012;
/** a cor do brilho de Saturno sobre as pedras: o bege do globo, luminância 1 (escolha declarada) */
const COR_DE_SATURNO = [1.05, 0.99, 0.9] as const;

/**
 * A LUZ QUE UMA FACE RECEBE, por unidade do albedo: Sol embrulhado com a
 * sombra do globo, globo embrulhado e o ambiente do anel. É a mesma conta
 * do fragmento (sem fase, brilho especular e relevo), e o teste cobra dela
 * que o lado da noite nunca é zero.
 */
export function luzDaFace(cosSol: number, cosGlobo: number, sombra: number, irrGlobo: number): number {
  const envolve = (c: number) => Math.max((c + ENVOLVE) / (1 + ENVOLVE), 0);
  return (
    envolve(cosSol) * sombra +
    envolve(cosGlobo) * irrGlobo +
    AMBIENTE_DO_ANEL * (0.25 + 0.75 * sombra) +
    PISO_DA_NOITE
  );
}

const VERT_DAS_PEDRAS = /* glsl */ `
uniform sampler2D uMapaAnel;
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform vec2 uEixo;
uniform float uRhoCamKm;
uniform float uZCamKm;
uniform float uLuzGanho;
uniform float uKPolar;
uniform float uSolAngRad;
uniform float uNearKm;
uniform int uPorOitava;
uniform float uFr[${OITAVAS}];
uniform float uFs[${OITAVAS}];
uniform float uGi[${OITAVAS}];
uniform float uGf[${OITAVAS}];
uniform float uGiro;

varying vec3 vVista;
varying vec3 vNormal;
varying vec3 vSol;
varying vec3 vGlobo;
varying vec3 vTinta;
varying vec3 vNevoaCor;
varying vec3 vLocal;
varying vec4 vLuz;
varying vec2 vFica;

const float PI = 3.14159265358979;
const float R0 = ${glslF(R0_KM)};
const float K_JANELA = ${glslF(K_JANELA)};
const float S_MAX = ${glslF(S_MAX_KM)};
const float X_ENTRA = ${glslF(X_ENTRA)};
const float X_DESFAZ = ${glslF(X_DESFAZ)};
const int PRIMEIRA_REAL = ${PRIMEIRA_OITAVA_REAL};
const float TAU_TETO = ${glslF(TAU_TETO)};
const float ESP_TAM = ${glslF(ESPESSURA_EM_TAMANHOS)};
const float ESP_MIN = ${glslF(ESPESSURA_MINIMA_KM)};
const float NEVOA_K = ${glslF(NEVOA_K)};
const float LADO_NO_ARCO[${OITAVAS}] = float[${OITAVAS}](${TABELA_DE_OITAVAS.map((o) => glslF(o.ladoNoArco)).join(', ')});
// as seis direções dos lóbulos (meio icosaedro, uma de cada par oposto);
// cada uma empurra ou puxa a pedra dos DOIS lados, com amplitudes próprias
const vec3 LOBOS[6] = vec3[6](
  vec3(0.0, 0.5257311, 0.8506508), vec3(0.0, 0.5257311, -0.8506508),
  vec3(0.5257311, 0.8506508, 0.0), vec3(0.5257311, -0.8506508, 0.0),
  vec3(0.8506508, 0.0, 0.5257311), vec3(0.8506508, 0.0, -0.5257311)
);
CONSTANTES_DO_ANEL
SOMBRA_DO_PLANETA

// o sorteio é INTEIRO (exato em qualquer GPU): a mesma pedra em todo
// fornecedor e em todo tier
uint misturar(uint x) {
  x ^= x >> 16; x *= 0x7feb352du;
  x ^= x >> 15; x *= 0x846ca68bu;
  x ^= x >> 16;
  return x;
}
float sorteio(uint base, uint k) {
  return float(misturar(base ^ misturar(k * 0x9e3779b9u + 0x632be5abu)) >> 8) / 16777216.0;
}
// quatro números de um sorteio só, em [-1, 1]
vec4 quatro(uint base, uint k) {
  uint h = misturar(base ^ misturar(k * 0x9e3779b9u + 0x632be5abu));
  return vec4(float(h & 0xffu), float((h >> 8) & 0xffu), float((h >> 16) & 0xffu), float(h >> 24))
    / 127.5 - 1.0;
}
vec3 girarQ(vec4 q, vec3 v) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}
vec3 direcao(uint base, uint k) {
  float z = 2.0 * sorteio(base, k) - 1.0;
  float a = 2.0 * PI * sorteio(base, k + 1u);
  return vec3(sqrt(max(1.0 - z * z, 0.0)) * vec2(cos(a), sin(a)), z);
}

// A FORMA DA PEDRA: uma "batata" — a esfera com seis pares de lóbulos
// macios (amplitude e nitidez por pedra), achatada em três eixos, e em
// parte das pedras um ou dois cortes planos (as faces de fratura). A
// normal sai ANALÍTICA, numa avaliação só: para a superfície d·r(d), ela é
// d − ∇r/r (o gradiente tangente); na face do corte, a do plano; e o
// achatamento a leva por 1/eixos.
vec4 qA; vec4 qB; vec4 qC; float lP; vec4 corte1; vec4 corte2; vec3 eixosF;
void forma(vec3 d, out vec3 p, out vec3 n) {
  float r = 1.0;
  vec3 n0 = d;
#if OITAVA_BASE >= ${PRIMEIRA_OITAVA_REAL}
  // os lóbulos só nas pedras de verdade: o aglomerado nunca passa de
  // ~100 px, e no icosaedro cru os lóbulos nem caberiam (é o barato)
  float am[6] = float[6](qA.x, qA.y, qA.z, qA.w, qB.x, qB.y);
  float an[6] = float[6](qB.z, qB.w, qC.x, qC.y, qC.z, qC.w);
  float e2 = exp(-2.0 * lP);
  vec3 g = vec3(0.0);
  for (int k = 0; k < 6; k++) {
    float ep = exp(lP * (dot(d, LOBOS[k]) - 1.0));
    float em = e2 / ep;
    r += am[k] * ep + an[k] * em;
    g += (lP * (am[k] * ep - an[k] * em)) * LOBOS[k];
  }
  n0 = d - (g - dot(g, d) * d) / r;
#endif
  float k1 = dot(d, corte1.xyz);
  if (k1 > 0.05 && corte1.w < r * k1) { r = corte1.w / k1; n0 = corte1.xyz; }
  float k2 = dot(d, corte2.xyz);
  if (k2 > 0.05 && corte2.w < r * k2) { r = corte2.w / k2; n0 = corte2.xyz; }
  p = d * r * eixosF;
  n = normalize(n0 / eixosF);
}

void fora() {
  vVista = vec3(0.0); vNormal = vec3(0.0, 0.0, 1.0); vSol = vec3(0.0); vGlobo = vec3(0.0);
  vTinta = vec3(0.0); vNevoaCor = vec3(0.0); vLocal = vec3(0.0);
  vLuz = vec4(0.0); vFica = vec2(0.0);
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}

void main() {
  // as duas malhas (aglomerados e pedras de verdade) desenham faixas de
  // oitavas diferentes — OITAVA_BASE vem do material
  int k = gl_InstanceID / uPorOitava;
  int i = gl_InstanceID - k * uPorOitava;
  int o = OITAVA_BASE + k;
  uint base = misturar(uint(i) ^ (uint(o) << 24));
  float s = S_MAX * exp2(-float(o));
  float W = K_JANELA * s;
  float lado = 2.0 * W;
  float ladoArco = LADO_NO_ARCO[o];
  float meia = max(ESP_MIN, ESP_TAM * s);

  // O RAIO: a imagem da pedra mais perto da câmera. O sorteio radial é
  // quantizado em 1/65 536 do ladrilho para o cisalhamento fechar em
  // inteiros (ver o arco).
  uint q = misturar(base ^ 0x51ed27u) & 0xffffu;
  float a = float(q) / 65536.0;
  float f = uFr[o];
  float dk = floor(f - a + 0.5);
  float dRho = (dk + a - f) * lado;

  // O ARCO, com o cisalhamento: g·(dk + a) mod 1, com g = gi + gf e a
  // parte inteira de g já reduzida a 65 536 — gi·q em uint é exato.
  float cis = float((uint(uGi[o]) * q) & 0xffffu) / 65536.0 + uGf[o] * (dk + a);
  float dSig = sorteio(base, 2u) + cis + uFs[o];
  dSig -= floor(dSig + 0.5);
  float dS = dSig * ladoArco;

  // a lâmina: triangular, mais densa no plano. Com a câmera FORA da
  // lâmina desta oitava (mais de uma espessura), as pedras ficam do lado
  // dela: o disco que segue atrás (a multidão não resolvida) não as vela
  // como fantasmas. A dobra é contínua — dentro da lâmina ela some.
  float z = (sorteio(base, 3u) + sorteio(base, 4u) - 1.0) * meia;
  z = mix(z, sign(uZCamKm) * abs(z), clamp(abs(uZCamKm) / meia - 1.0, 0.0, 1.0));
  float dz = z - uZCamKm;

  // A PRESENÇA (\`presencaDaOitava\`), na régua do ladrilho (≥ a distância
  // de verdade): zero onde a pedra troca de imagem, e é por isso que
  // nada estala. Entra crescendo do zero; o aglomerado, perto, se desfaz.
  float dT = sqrt(dRho * dRho + dS * dS + dz * dz);
  float xo = log2(max(dT, 1.0e-12) / s);
  float entra = clamp(X_ENTRA - xo, 0.0, 1.0);
  float fica = o >= PRIMEIRA_REAL ? 1.0 : clamp(xo - X_DESFAZ, 0.0, 1.0);
  if (entra * fica <= 0.0) { fora(); return; }
  float cresce = sqrt(entra);

  // A DENSIDADE do perfil medido (o mesmo do disco)
  float rhoKm = uRhoCamKm + dRho;
  float u = ((rhoKm / KM_POR_RAIO - R_INT) / (R_EXT - R_INT)) * U_ESCALA + U_BASE;
  vec4 perfil = (u < 0.0 || u > 1.0) ? vec4(0.0) : textureLod(uMapaAnel, vec2(u, 0.5), 0.0);
  vec3 regiao = regiaoDoAnel(rhoKm);
  float tau = perfil.a < 0.004 ? 0.0 : tauDaOpacidade(perfil.a) * regiao.z;
  if (sorteio(base, 5u) * TAU_TETO * R0 >= tau * rhoKm) { fora(); return; }

  // o lugar, RELATIVO À CÂMERA, sem nenhuma soma de número grande
  // em SÉRIE, não em sin/cos: |θ| < 3e-3 rad, e o sin da GPU (Metal, via
  // ANGLE) devolvia ZERO para ângulo negativo minúsculo — metade do campo
  // empilhava numa parede na linha da câmera (medido na prancha v2)
  float dTh = dS / R0;
  float th2 = dTh * dTh;
  float senTh = dTh * (1.0 - th2 / 6.0);
  float umMenosCos = 0.5 * th2 * (1.0 - th2 / 12.0);
  float x = dRho * (1.0 - umMenosCos) - uRhoCamKm * umMenosCos;
  float y = rhoKm * senTh;
  vec3 er = vec3(uEixo, 0.0);
  vec3 et = vec3(-uEixo.y, uEixo.x, 0.0);
  vec3 off = er * x + et * y + vec3(0.0, 0.0, dz);
  float dist = length(off);

  // o tamanho: s⁻³ dentro da oitava (inversa da acumulada em [1, 2))
  float raioCheio = 0.5 * s / sqrt(1.0 - 0.75 * sorteio(base, 6u));
  // colada na lente a pedra seria cortada pelo NEAR: ela encolhe antes
  float perto = smoothstep(uNearKm, 3.0 * uNearKm, dist - raioCheio);
  float raio = raioCheio * cresce * perto;
  if (raio <= 0.0) { fora(); return; }

  // A FORMA (\`forma\`): os parâmetros desta pedra
  float caroco = 0.06 + 0.12 * sorteio(base, 21u);
  // lóbulos quase só para fora (amplitude em [−0,4; 1]): covas fundas
  // liam como "olhos"
  qA = (quatro(base, 22u) * 0.7 + 0.3) * caroco;
  qB = (quatro(base, 23u) * 0.7 + 0.3) * caroco;
  qC = (quatro(base, 24u) * 0.7 + 0.3) * caroco;
  lP = 1.5 + 2.5 * sorteio(base, 26u);
  float fratura = sorteio(base, 20u);
  corte1 = fratura < 0.55 ? vec4(direcao(base, 27u), 0.6 + 0.3 * sorteio(base, 29u)) : vec4(0.0, 0.0, 1.0, 9.0);
  corte2 = fratura < 0.25 ? vec4(direcao(base, 30u), 0.65 + 0.3 * sorteio(base, 32u)) : vec4(0.0, 0.0, 1.0, 9.0);
  eixosF = vec3(1.0, 0.6 + 0.35 * sorteio(base, 8u), 0.42 + 0.35 * sorteio(base, 9u));
  vec3 local;
  vec3 nLocal;
  forma(normalize(position), local, nLocal);
  vLocal = local + vec3(sorteio(base, 17u), sorteio(base, 18u), sorteio(base, 19u)) * 37.0;
  float u1 = sorteio(base, 10u);
  float t1a = 2.0 * PI * sorteio(base, 11u);
  float t2a = 2.0 * PI * sorteio(base, 12u);
  vec4 qr = vec4(
    sqrt(1.0 - u1) * sin(t1a), sqrt(1.0 - u1) * cos(t1a),
    sqrt(u1) * sin(t2a), sqrt(u1) * cos(t2a)
  );
  local = girarQ(qr, local);
  nLocal = girarQ(qr, nLocal);
  // o GIRO PRÓPRIO: um eixo por pedra, 1 a 3 voltas por período
  vec3 eixoGiro = direcao(base, 13u);
  float voltas = floor(sorteio(base, 15u) * 6.0) - 2.5;
  float ang = 2.0 * PI * fract(uGiro * sign(voltas) * (abs(voltas) + 0.5) + sorteio(base, 16u));
  float ca = cos(ang);
  float sa = sin(ang);
  local = local * ca + cross(eixoGiro, local) * sa + eixoGiro * dot(eixoGiro, local) * (1.0 - ca);
  nLocal = nLocal * ca + cross(eixoGiro, nLocal) * sa + eixoGiro * dot(eixoGiro, nLocal) * (1.0 - ca);
  vec3 pKm = off + local * raio;

  // PARA A TELA: só a parte LINEAR da matriz — a câmera é a origem da
  // vista, e o deslocamento já é relativo a ela. A vista sai em km para o
  // fragmento tirar a normal da faceta sem cair em número desnormal.
  float raioMundo = length((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  mat3 R = mat3(modelViewMatrix) / raioMundo;
  vVista = R * pKm;
  vNormal = R * nLocal;
  gl_Position = projectionMatrix * vec4(vVista * (raioMundo / KM_POR_RAIO), 1.0);

  // A LUZ: Sol com a sombra do globo, e o brilho do globo (planetshine) —
  // a irradiância é a mesma conta de \`planetshineNoAnel\`, numa face
  vec3 pAbs = uCamLocal + off / KM_POR_RAIO;
  vSol = normalize(R * uDirSolLocal);
  vGlobo = normalize(R * -pAbs);
  vec3 razao = perfil.rgb / COR_B_DO_PERFIL;
  vec3 tinta = COR_DO_GELO
    * (razao / max(dot(razao, vec3(0.2126, 0.7152, 0.0722)), 1.0e-4));
  if (dot(tinta, tinta) < 1.0e-6) tinta = COR_DO_GELO;
  tinta *= regiao.x;
  // 1,5 = 1 / (2/3): o disco de uma esfera de Lambert em oposição tem
  // média 2/3 do brilho de face — assim o campo em retro bate com o I/F
  // âncora do disco que ele substitui
  vec3 base3 = tinta * IF_RETRO * 1.5 * uLuzGanho;
  // O ALBEDO POR PEDRA: do gelo limpo (claro, quase branco) ao gelo sujo
  // (bege mais escuro e mais saturado), com a média na cor medida do anel
  float sujo = sorteio(base, 33u);
  float lumT = max(dot(tinta, vec3(0.2126, 0.7152, 0.0722)), 1.0e-4);
  vec3 limpo = mix(tinta, vec3(lumT), 0.8) * 1.15;
  vec3 encardido = tinta * 0.82;
  vTinta = mix(limpo, encardido, sujo) * (IF_RETRO * 1.5 * uLuzGanho * 0.88);
  float sombra = sombraDoPlaneta(pAbs);
  float rr = max(length(pAbs.xy), 1.001);
  vec3 pHat = vec3(pAbs.xy, 0.0) / rr;
  float alfaFase = acos(clamp(dot(uDirSolLocal, pHat), -1.0, 1.0));
  float fi = (sin(alfaFase) + (PI - alfaFase) * cos(alfaFase)) / PI;
  float irrGlobo = ALBEDO_GEO * fi / (rr * rr);

  // A NÉVOA DA LÂMINA: a multidão não resolvida entre a pedra e a lente —
  // a profundidade óptica do trecho do raio que corre DENTRO da lâmina de
  // verdade (|z| < ESP_MIN), com uma fração NEVOA_K dela (o resto já está
  // nas pedras). De cima ela é nada; de dentro, uma faixa no horizonte.
  float zc = uZCamKm;
  float zp = uZCamKm + dz;
  // a névoa conta numa faixa de duas lâminas (a multidão fina se espalha
  // além do miolo de ESP_MIN)
  float hn = 2.0 * ESP_MIN;
  float nevoa = 0.0;
  vNevoaCor = vec3(0.0);
  // só com a câmera a menos de 100 m do plano há névoa a contar
  if (abs(zc) < 0.1) {
    float dentro;
    if (abs(dz) < 1.0e-7) dentro = abs(zc) < hn ? dist : 0.0;
    else dentro = dist * max(min(max(zc, zp), hn) - max(min(zc, zp), -hn), 0.0) / abs(dz);
    // τ grampeado em 1: no miolo do B a névoa apagaria a forma das pedras
    nevoa = 1.0 - exp(-NEVOA_K * min(tau, 1.0) / (2.0 * hn) * dentro);
    float hgV = hgDoAnel(clamp(dot(vSol, normalize(vVista)), -1.0, 1.0));
    vNevoaCor = base3 * (0.5 * sombra * hgV + 0.35 * irrGlobo + ${glslF(AMBIENTE_DO_ANEL)});
  }
  vLuz = vec4(sombra, irrGlobo, 0.25 + 0.3 * step(fratura, 0.55), nevoa);
  vFica = vec2(fica, raio);
}
`;

const FRAG_DAS_PEDRAS = /* glsl */ `
precision highp float;
varying vec3 vVista;
varying vec3 vNormal;
varying vec3 vSol;
varying vec3 vGlobo;
varying vec3 vTinta;
varying vec3 vNevoaCor;
varying vec3 vLocal;
varying vec4 vLuz;
varying vec2 vFica;
const float ENVOLVE = ${glslF(ENVOLVE)};
const float AMBIENTE_DO_ANEL = ${glslF(AMBIENTE_DO_ANEL)};
const float PISO_DA_NOITE = ${glslF(PISO_DA_NOITE)};
const vec3 COR_DE_SATURNO = vec3(${COR_DE_SATURNO.join(', ')});
CAMADA_DO_ANEL
RUIDO
float envolver(float c) { return max((c + ENVOLVE) / (1.0 + ENVOLVE), 0.0); }
void main() {
  // o AGLOMERADO se desfaz em grãos: a fração que fica é a presença dele
  if (vFica.x < 1.0 && ruido(vLocal * 2.5) >= vFica.x) discard;
  vec3 v = -vVista / max(length(vVista), 1.0e-30);
  vec3 dpx = dFdx(vVista);
  vec3 dpy = dFdy(vVista);
  // a normal da FACETA (pela derivada) misturada à LISA (pela forma): um
  // pouco de aresta em toda pedra, mais nas que têm face de fratura
  vec3 c = cross(dpx, dpy);
  vec3 nf = c / max(length(c), 1.0e-30);
  if (dot(nf, v) < 0.0) nf = -nf;
  vec3 ns = vNormal / max(length(vNormal), 1.0e-30);
  vec3 n = normalize(mix(ns, nf, vLuz.z));
  // O RELEVO: duas oitavas de ruído no quadro da pedra (proporcional ao
  // tamanho dela), cada uma apagada quando a célula cai abaixo de ~2 px —
  // sem cintilar de longe. A normal se inclina pela derivada de tela da
  // altura (Mikkelsen 2010, relevo sem tangentes).
  float pegada = length(fwidth(vLocal));
  float h = 0.0;
  float amp = 0.5;
  float fr = 2.2;
  float manchas = 0.0;
  for (int k = 0; k < 2; k++) {
    float w = 1.0 - smoothstep(0.25, 0.6, pegada * fr);
    // as oitavas crescem em frequência: apagada uma, as outras também
    if (w <= 0.0) break;
    float r = ruido(vLocal * fr);
    if (k == 0) manchas = r;
    h += amp * w * (r - 0.5);
    fr *= 2.4;
    amp *= 0.55;
  }
  float hKm = h * vFica.y * 0.3;
  vec3 r1 = cross(dpy, n);
  vec3 r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dFdx(hKm) * r1 + dFdy(hKm) * r2);
  vec3 nb = abs(det) * n - grad;
  n = nb / max(length(nb), 1.0e-30);

  float nl = dot(n, vSol);
  // retroespalhamento: a fase do próprio anel (1 em retro), com o surto
  // de oposição do gelo
  float cosV = clamp(dot(vSol, v), -1.0, 1.0);
  float fase = hgDoAnel(-cosV) * (1.0 + 0.3 * exp(-sqrt(max(2.0 * (1.0 - cosV), 0.0)) / 0.05));
  // o terminador macio: a luz que entra pelo gelo sai azulada do lado de lá
  float dif = envolver(nl);
  vec3 tom = mix(vec3(0.86, 0.95, 1.08), vec3(1.0), smoothstep(-0.1, 0.35, nl));
  vec3 albedo = vTinta * (0.86 + 0.28 * manchas);
  vec3 cor = albedo * tom * (dif * fase * vLuz.x);
  // o brilho especular: pequeno, só nas faces viradas para o Sol
  vec3 meio = normalize(vSol + v);
  float brilho = pow(max(dot(n, meio), 0.0), 60.0) * step(0.0, nl);
  cor += vec3(dot(vTinta, vec3(0.2126, 0.7152, 0.0722))) * (0.35 * brilho * vLuz.x);
  // o globo (cor quente) e o ambiente do anel — o lado da noite nunca é zero
  cor += albedo * COR_DE_SATURNO * (envolver(dot(n, vGlobo)) * vLuz.y);
  cor += albedo * (AMBIENTE_DO_ANEL * (0.25 + 0.75 * vLuz.x) + PISO_DA_NOITE);
  // de dentro da lâmina, a multidão entre a pedra e a lente
  cor = mix(cor, vNevoaCor, vLuz.w);
  gl_FragColor = vec4(cor, 1.0);
}
`;

/**
 * A CESSÃO DO DISCO EM GLSL — entra no `ANEL_FRAG` só com `?pedras=3d`.
 * `uCamDasPedras` = (ρ da câmera em km, θ dela, altura em km, a fração do
 * campo que o tier desenha vezes a parcela da altura, `parcelaDasPedras` —
 * 0 com as pedras fora do desenho). A distância
 * é a da régua do ladrilho, como no vértice das pedras. O disco cede só o
 * que as pedras de fato carregam: onde o perfil pede mais que o teto do
 * campo (o miolo do B) ou o tier desenha menos pedras, o resto fica nele —
 * a transmissão da soma é a de hoje em toda altura.
 */
export const GLSL_CESSAO_DAS_PEDRAS = /* glsl */ `
uniform vec4 uCamDasPedras;
float cederAsPedras(float alfa, vec3 p, float tau) {
  if (uCamDasPedras.w <= 0.0) return alfa;
  float rKm = length(p.xy) * KM_POR_RAIO;
  float dRho = rKm - uCamDasPedras.x;
  // o ângulo envolvido sem sin/cos (ver o vértice das pedras)
  float dTh = atan(p.y, p.x) - uCamDasPedras.y;
  dTh -= 6.28318530718 * floor((dTh + 3.14159265359) / 6.28318530718);
  float dS = dTh * ${glslF(R0_KM)};
  float d = sqrt(dRho * dRho + dS * dS + uCamDasPedras.z * uCamDasPedras.z);
  float f = 0.0;
  for (int o = 0; o < ${OITAVAS}; o++) {
    float x = log2(max(d, 1.0e-12) / (${glslF(S_MAX_KM)} * exp2(-float(o))));
    float fica = o >= ${PRIMEIRA_OITAVA_REAL} ? 1.0 : clamp(x - ${glslF(X_DESFAZ)}, 0.0, 1.0);
    f += clamp(${glslF(X_ENTRA)} - x, 0.0, 1.0) * fica;
  }
  f = min(f / ${glslF(PRESENTES)}, 1.0)
    * min(1.0, ${glslF(TAU_TETO * R0_KM)} / (max(rKm, 1.0) * max(tau, 1.0e-4)))
    * uCamDasPedras.w
    * (1.0 - exp(-max(abs(uCamDasPedras.z), ${glslF(2 * ESPESSURA_MINIMA_KM)}) / max(d, 1.0e-9) / ${glslF(MU_RASANTE)}));
  if (f <= 0.0) return alfa;
  return 1.0 - pow(max(1.0 - alfa, 1.0e-4), 1.0 - f);
}
`;

/**
 * A FOLHA DE GRÃOS (segunda volta): abaixo de `H_CEDE_KM` o disco que resta
 * não pode ler como plano liso. Uma folha no plano do anel, centrada na
 * câmera (o mesmo truque do relativo à câmera das pedras), SOMA à luz do
 * disco pontos de grão em três tamanhos de célula (`CELULAS_DO_GRAO_KM`).
 * O sorteio é por célula INTEIRA e periódica em `GRAO_PERIODO` células, com
 * a fração da câmera no período tirada na CPU em dupla precisão: o grão é
 * estável no mundo — mexer a câmera não o faz piscar. Cada tamanho só
 * aparece quando a célula passa de ~2 px (abaixo disso ele é a média que o
 * disco já desenha), e a folha toda pesa `forcaDoGrao`.
 */
export const CELULAS_DO_GRAO_KM = [0.0015, 0.006, 0.024] as const;
const GRAO_PERIODO = 1024;
/** o alcance da folha, km — além disso o maior grão já é sub-pixel */
const RAIO_DA_FOLHA_KM = 40;

const VERT_DA_FOLHA = /* glsl */ `
uniform sampler2D uMapaAnel;
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform vec2 uEixo;
uniform float uRhoCamKm;
uniform float uZCamKm;
uniform float uLuzGanho;
uniform float uKPolar;
uniform float uSolAngRad;
uniform float uForcaGrao;
varying vec2 vGrao;
varying vec3 vCorGrao;
const float PI = 3.14159265358979;
CONSTANTES_DO_ANEL
SOMBRA_DO_PLANETA
void main() {
  vec3 er = vec3(uEixo, 0.0);
  vec3 et = vec3(-uEixo.y, uEixo.x, 0.0);
  vec3 off = er * position.x + et * position.y + vec3(0.0, 0.0, -uZCamKm);
  float rhoKm = length(vec2(uRhoCamKm + position.x, position.y));
  float u = ((rhoKm / KM_POR_RAIO - R_INT) / (R_EXT - R_INT)) * U_ESCALA + U_BASE;
  vec4 perfil = (u < 0.0 || u > 1.0) ? vec4(0.0) : textureLod(uMapaAnel, vec2(u, 0.5), 0.0);
  vec3 regiao = regiaoDoAnel(rhoKm);
  float tau = perfil.a < 0.004 ? 0.0 : tauDaOpacidade(perfil.a) * regiao.z;
  vec3 razao = perfil.rgb / COR_B_DO_PERFIL;
  vec3 tinta = COR_DO_GELO
    * (razao / max(dot(razao, vec3(0.2126, 0.7152, 0.0722)), 1.0e-4));
  if (dot(tinta, tinta) < 1.0e-6) tinta = COR_DO_GELO;
  tinta *= regiao.x;
  vec3 pAbs = uCamLocal + off / KM_POR_RAIO;
  float rr = max(length(pAbs.xy), 1.001);
  vec3 pHat = vec3(pAbs.xy, 0.0) / rr;
  float alfaFase = acos(clamp(dot(uDirSolLocal, pHat), -1.0, 1.0));
  float fi = (sin(alfaFase) + (PI - alfaFase) * cos(alfaFase)) / PI;
  vec3 vista = normalize(-off);
  float hg = hgDoAnel(clamp(-dot(uDirSolLocal, vista), -1.0, 1.0));
  // de raspão o grão vira moiré: ele some quando a folha fica de lado
  float mu = abs(uZCamKm) / max(length(off), 1.0e-9);
  vCorGrao = tinta * IF_RETRO * uLuzGanho * uForcaGrao * min(tau, 1.0) * smoothstep(0.1, 0.35, mu)
    * (sombraDoPlaneta(pAbs) * hg + 0.5 * ALBEDO_GEO * fi / (rr * rr));
  vGrao = position.xy;
  float raioMundo = length((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  mat3 R = mat3(modelViewMatrix) / raioMundo;
  gl_Position = projectionMatrix * vec4((R * off) * (raioMundo / KM_POR_RAIO), 1.0);
}
`;

const FRAG_DA_FOLHA = /* glsl */ `
precision highp float;
uniform vec2 uGraoCam[3];
varying vec2 vGrao;
varying vec3 vCorGrao;
uint misturar(uint x) {
  x ^= x >> 16; x *= 0x7feb352du;
  x ^= x >> 15; x *= 0x846ca68bu;
  x ^= x >> 16;
  return x;
}
float graos(vec2 g, float celula, float pegada, uint sal) {
  float w = smoothstep(2.5, 6.0, celula / max(pegada, 1.0e-12));
  if (w <= 0.0) return 0.0;
  vec2 q = g / celula;
  vec2 ii = floor(q);
  vec2 ff = q - ii;
  ii = mod(ii, ${GRAO_PERIODO}.0);
  uint h = misturar(uint(ii.x) * 0x8da6b343u ^ misturar(uint(ii.y) + sal));
  vec2 c = vec2(float(h & 0xffu), float((h >> 8) & 0xffu)) / 255.0 * 0.5 + 0.25;
  float b = float((h >> 16) & 0xffu) / 255.0;
  return w * b * b * b * (1.0 - smoothstep(0.0, 0.16, length(ff - c)));
}
void main() {
  float pegada = length(fwidth(vGrao));
  float g = graos(vGrao + uGraoCam[0], ${glslF(CELULAS_DO_GRAO_KM[0])}, pegada, 0x68e31da4u)
    + 0.75 * graos(vGrao + uGraoCam[1], ${glslF(CELULAS_DO_GRAO_KM[1])}, pegada, 0xb5297a4du)
    + 0.55 * graos(vGrao + uGraoCam[2], ${glslF(CELULAS_DO_GRAO_KM[2])}, pegada, 0x1b56c4e9u);
  gl_FragColor = vec4(vCorGrao * g, 1.0);
}
`;

/** a malha da folha: anéis em escala log de 1 m a `RAIO_DA_FOLHA_KM` em volta da câmera */
function geometriaDaFolha(): THREE.BufferGeometry {
  const aneis = 56;
  const lados = 96;
  const pos: number[] = [0, 0, 0];
  for (let k = 0; k < aneis; k++) {
    const r = 0.001 * (RAIO_DA_FOLHA_KM / 0.001) ** (k / (aneis - 1));
    for (let j = 0; j < lados; j++) {
      const a = (2 * Math.PI * j) / lados;
      pos.push(r * Math.cos(a), r * Math.sin(a), 0);
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < lados; j++) idx.push(0, 1 + j, 1 + ((j + 1) % lados));
  for (let k = 0; k < aneis - 1; k++) {
    for (let j = 0; j < lados; j++) {
      const a = 1 + k * lados + j;
      const b = 1 + k * lados + ((j + 1) % lados);
      idx.push(a, a + lados, b, b, a + lados, b + lados);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

/** O que o corpo entrega por quadro — o quadro da lajota, mais o relógio. */
export interface QuadroDasPedras {
  dirSolLocal: THREE.Vector3;
  /** a câmera no frame do anel, em raios equatoriais */
  camLocal: THREE.Vector3;
  luzGanho: number;
  solAngRad: number;
  kPolar: number;
  /** o NEAR do quadro em raios equatoriais */
  nearRaios: number;
  tier: QualityLevel;
  /** o relógio do app (dia juliano) — o cisalhamento anda com ele */
  jd: number;
}

export interface OpcoesDasPedras {
  glslSombraDoPlaneta: string;
  /** `GLSL_CONSTANTES_DO_ANEL` */
  glslConstantesDoAnel: string;
  /** `GLSL_REGIAO_DO_ANEL` (traz `KM_POR_RAIO` e `regiaoDoAnel`) */
  glslRegiaoDoAnel: string;
  /** `GLSL_CAMADA_DO_ANEL` (`tauDaOpacidade`, `hgDoAnel`) */
  glslCamadaDoAnel: string;
  /** `GLSL_RUIDO_DE_VALOR` — o ruído que esburaca o aglomerado */
  glslRuido: string;
  rInt: number;
  rExt: number;
}

/** a faixa de raio em que as pedras podem existir (a da lajota, com folga da janela maior) */
const RAIO_MIN_KM = 55_000;
const RAIO_MAX_KM = 160_000;

/**
 * UMA MALHA INSTANCIADA por faixa de oitavas: o molde dela, quantas
 * oitavas tem e a primeira. Os aglomerados nunca passam de ~100 px (eles
 * se desfazem antes): o icosaedro subdividido uma vez (42) já tira a
 * silhueta de dado; as pedras de verdade chegam a encher a tela e ganham
 * o subdividido três vezes (162), para os lóbulos lerem como corpo.
 */
/** a subdivisão do icosaedro das pedras de verdade (1 → 42 vértices, 2 → 92, 3 → 162) */
const DETALHE_DAS_REAIS = 1;

class Faixa {
  readonly geometria = new THREE.InstancedBufferGeometry();
  readonly malha: THREE.Mesh;
  private readonly molde: THREE.BufferGeometry;
  readonly primeira: number;
  readonly quantas: number;

  constructor(primeira: number, quantas: number, detalhe: number, material: THREE.ShaderMaterial) {
    this.primeira = primeira;
    this.quantas = quantas;
    // os vértices SOLDADOS, para a rugosidade por vértice não rachar a pedra
    const ico = new THREE.IcosahedronGeometry(1, detalhe);
    ico.deleteAttribute('normal');
    ico.deleteAttribute('uv');
    this.molde = mergeVertices(ico);
    ico.dispose();
    this.geometria.index = this.molde.index;
    this.geometria.setAttribute('position', this.molde.getAttribute('position'));
    this.geometria.instanceCount = 0;
    this.malha = new THREE.Mesh(this.geometria, material);
    // o ladrilho segue a câmera: nenhuma esfera envolvente o descreve
    this.malha.frustumCulled = false;
  }

  dispose() {
    this.molde.dispose();
    this.geometria.dispose();
    (this.malha.material as THREE.ShaderMaterial).dispose();
  }
}

export class PedrasDoAnel {
  /** o grupo das duas faixas — a matriz do anel mora nele */
  readonly malha = new THREE.Group();

  private readonly faixas: readonly Faixa[];
  private readonly uniforms: Record<string, THREE.IUniform>;
  /** as integrais do cisalhamento e do giro, em dupla precisão */
  private g = 0;
  private e = 0;
  private giro = 0;
  private jdAntes = Number.NaN;
  private readonly fr = new Float32Array(OITAVAS);
  private readonly fs = new Float32Array(OITAVAS);
  private readonly gi = new Float32Array(OITAVAS);
  private readonly gf = new Float32Array(OITAVAS);
  /** (ρ km, θ, altura km, fração do campo que o tier desenha × parcela da altura) — o que o disco lê para ceder */
  readonly cessao = new THREE.Vector4(0, 0, 0, 0);
  /** a folha de grãos da lâmina (`FolhaDeGraos` no texto acima) */
  private readonly folha: THREE.Mesh;
  private readonly graoCam = CELULAS_DO_GRAO_KM.map(() => new THREE.Vector2());

  constructor(opcoes: OpcoesDasPedras) {
    const vert = VERT_DAS_PEDRAS.replace(
      'CONSTANTES_DO_ANEL',
      `${opcoes.glslConstantesDoAnel}
${opcoes.glslRegiaoDoAnel}
${opcoes.glslCamadaDoAnel}
const float R_INT = ${opcoes.rInt};
const float R_EXT = ${opcoes.rExt};`
    ).replace('SOMBRA_DO_PLANETA', opcoes.glslSombraDoPlaneta);
    const frag = FRAG_DAS_PEDRAS.replace('CAMADA_DO_ANEL', opcoes.glslCamadaDoAnel).replace(
      'RUIDO',
      opcoes.glslRuido
    );

    // UM objeto de uniformes, dividido pelas duas faixas
    this.uniforms = {
      uMapaAnel: { value: null },
      uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
      uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
      uEixo: { value: new THREE.Vector2(1, 0) },
      uRhoCamKm: { value: 0 },
      uZCamKm: { value: 0 },
      uLuzGanho: { value: 1 },
      uKPolar: { value: 1 },
      uSolAngRad: { value: 0 },
      uNearKm: { value: 0 },
      uPorOitava: { value: PEDRAS_POR_TIER.cinema },
      uFr: { value: this.fr },
      uFs: { value: this.fs },
      uGi: { value: this.gi },
      uGf: { value: this.gf },
      uGiro: { value: 0 },
      uForcaGrao: { value: 0 },
      uGraoCam: { value: this.graoCam },
    };
    const material = (base: number) =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        defines: { OITAVA_BASE: base },
        uniforms: this.uniforms,
        transparent: false,
        depthWrite: true,
        depthTest: true,
      });
    this.faixas = [
      new Faixa(0, PRIMEIRA_OITAVA_REAL, 0, material(0)),
      new Faixa(
        PRIMEIRA_OITAVA_REAL,
        OITAVAS - PRIMEIRA_OITAVA_REAL,
        DETALHE_DAS_REAIS,
        material(PRIMEIRA_OITAVA_REAL)
      ),
    ];
    for (const f of this.faixas) this.malha.add(f.malha);
    const constantes = `${opcoes.glslConstantesDoAnel}
${opcoes.glslRegiaoDoAnel}
${opcoes.glslCamadaDoAnel}
const float R_INT = ${opcoes.rInt};
const float R_EXT = ${opcoes.rExt};`;
    this.folha = new THREE.Mesh(
      geometriaDaFolha(),
      new THREE.ShaderMaterial({
        vertexShader: VERT_DA_FOLHA.replace('CONSTANTES_DO_ANEL', constantes).replace(
          'SOMBRA_DO_PLANETA',
          opcoes.glslSombraDoPlaneta
        ),
        fragmentShader: FRAG_DA_FOLHA,
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    // soma DEPOIS do disco (que a atenuaria se viesse por cima)
    this.folha.renderOrder = 10;
    this.folha.frustumCulled = false;
    this.folha.visible = false;
    this.malha.add(this.folha);
    this.malha.matrixAutoUpdate = false;
    this.malha.visible = false;
  }

  ligarPerfil(textura: THREE.DataTexture) {
    this.uniforms.uMapaAnel!.value = textura;
  }

  fixarNoAnel(matriz: THREE.Matrix4) {
    this.malha.matrix.copy(matriz);
  }

  /** quantas oitavas a câmera alcança: as maiores primeiro, um prefixo */
  static oitavasAtivas(alturaKm: number): number {
    let n = 0;
    for (const o of TABELA_DE_OITAVAS) {
      if (o.janela > Math.abs(alturaKm) - o.meiaEspessura) n++;
      else break;
    }
    return n;
  }

  atualizar(q: QuadroDasPedras) {
    const c = q.camLocal;
    const rhoKm = Math.hypot(c.x, c.y) * KM_POR_RAIO;
    const zKm = c.z * KM_POR_RAIO;
    const ativas =
      rhoKm > RAIO_MIN_KM && rhoKm < RAIO_MAX_KM ? PedrasDoAnel.oitavasAtivas(zKm) : 0;
    this.malha.visible = ativas > 0;
    this.cessao.w = ativas > 0 ? 1 : 0;

    // O RELÓGIO: o passo do quadro, com teto contínuo. Fora do desenho o
    // relógio é só lembrado — ninguém vê a pedra andar.
    const dtBruto = Number.isFinite(q.jd) && Number.isFinite(this.jdAntes)
      ? (q.jd - this.jdAntes) * 86400
      : 0;
    this.jdAntes = q.jd;
    if (!this.malha.visible) return;

    const teto = tetoDoPasso(rhoKm);
    const dt = teto * Math.tanh(dtBruto / teto);
    const om = omega(rhoKm);
    // R0·Ω'(ρc) = −1,5·Ω·R0/ρc
    const taxa = -1.5 * om * (R0_KM / rhoKm);
    this.g += taxa * dt;
    this.e += taxa * rhoKm * dt;
    this.giro = (this.giro + dt / PERIODO_DO_GIRO_S) % 1;

    let theta = Math.atan2(c.y, c.x);
    if (theta < 0) theta += 2 * Math.PI;
    for (let o = 0; o < OITAVAS; o++) {
      const t = TABELA_DE_OITAVAS[o]!;
      const kc = Math.floor(rhoKm / t.ladoRadial);
      this.fr[o] = rhoKm / t.ladoRadial - kc;
      const g = this.g * (t.ladoRadial / t.ladoNoArco);
      const sigma = (theta / (2 * Math.PI)) * t.voltas;
      const fase = g * kc - this.e / t.ladoNoArco - sigma;
      this.fs[o] = fase - Math.floor(fase);
      const gInt = Math.floor(g);
      this.gi[o] = ((gInt % 65536) + 65536) % 65536;
      this.gf[o] = g - gInt;
    }

    const porOitava = PEDRAS_POR_TIER[q.tier];
    for (const f of this.faixas) {
      const n = Math.min(Math.max(ativas - f.primeira, 0), f.quantas);
      f.geometria.instanceCount = n * porOitava;
      f.malha.visible = n > 0;
    }
    const u = this.uniforms;
    (u.uDirSolLocal!.value as THREE.Vector3).copy(q.dirSolLocal);
    (u.uCamLocal!.value as THREE.Vector3).copy(c);
    (u.uEixo!.value as THREE.Vector2).set(Math.cos(theta), Math.sin(theta));
    u.uRhoCamKm!.value = rhoKm;
    u.uZCamKm!.value = zKm;
    u.uLuzGanho!.value = q.luzGanho;
    u.uKPolar!.value = q.kPolar;
    u.uSolAngRad!.value = q.solAngRad;
    u.uNearKm!.value = q.nearRaios * KM_POR_RAIO;
    u.uPorOitava!.value = porOitava;
    u.uGiro!.value = this.giro;
    this.cessao.set(rhoKm, theta, zKm, (porOitava / PEDRAS_POR_TIER.cinema) * parcelaDasPedras(zKm));
    const forca = forcaDoGrao(zKm);
    u.uForcaGrao!.value = forca;
    this.folha.visible = forca > 0;
    CELULAS_DO_GRAO_KM.forEach((c, k) => {
      const periodo = c * GRAO_PERIODO;
      const m = (x: number) => x - periodo * Math.floor(x / periodo);
      this.graoCam[k]!.set(m(rhoKm), m(rhoKm * theta));
    });
  }

  dispose() {
    for (const f of this.faixas) f.dispose();
    this.folha.geometry.dispose();
    (this.folha.material as THREE.ShaderMaterial).dispose();
  }
}
