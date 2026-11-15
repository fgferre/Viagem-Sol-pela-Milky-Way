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
 * A NÉVOA DA LÂMINA: de raspão (μ = |z|/d pequeno) o disco não cede — a
 * lâmina vista de lado é a multidão inteira, uma faixa macia no horizonte
 * do anel. A altura da conta tem piso de duas lâminas (30 m): o vPos do
 * disco só tem ~15 m de precisão a 2 raios, e com a câmera a 3 m o μ
 * pontilhava de pixel em pixel. E sobre as pedras, a fração `NEVOA_K` da profundidade óptica do
 * trecho de raio que corre dentro da lâmina (o resto já está nelas).
 */
export const MU_RASANTE = 0.04;
export const NEVOA_K = 0.25;
/** a opacidade máxima que o disco guarda com a câmera dentro da lâmina (`cederAsPedras`) */
export const NEVOA_DO_DISCO = 0.7;

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

/** o sorteio inteiro do vértice (`misturar` no GLSL), bit a bit */
function misturar(x: number): number {
  x = (x ^ (x >>> 16)) >>> 0;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/**
 * O MATERIAL DE GELO (terceira volta, 14/11) — os números que o vértice, o
 * fragmento e o teste dividem. A luz do Sol é DURA: o terminador quase não
 * dá a volta (`ENVOLVE`), e o lado da noite fica quase preto — só o anel
 * em volta (`AMBIENTE_DO_ANEL`, apagado com a sombra do globo até o piso
 * `PISO_DA_NOITE`) e o globo, com a cor quente dele, o aquecem. Sem o
 * globo, a noite fica abaixo de 15 % do dia (o teste cobra).
 */
export const ENVOLVE = 0.05;
export const AMBIENTE_DO_ANEL = 0.03;
export const PISO_DA_NOITE = 0.006;

/**
 * A SOMBRA MÚTUA, estatística: a pedra mais funda na lâmina, do lado
 * oposto ao Sol, recebe menos Sol que a de cima. Com F a fração da lâmina
 * entre ela e a face do Sol (uniforme sobre as pedras), o Sol direto vale
 * 1 + `SOMBRA_MUTUA`·w·(1 − 2F): média 1 exata — o nível do campo segue
 * ancorado no I/F do disco — e limites [0,5; 1,5]. O peso w sobe com
 * τ/sen(elevação do Sol) e satura em 1.
 */
export const SOMBRA_MUTUA = 0.5;
export function sombraMutua(fracaoAcima: number, peso: number): number {
  return 1 + SOMBRA_MUTUA * grampo(peso) * (1 - 2 * grampo(fracaoAcima));
}

/**
 * O CORTE, em oitavas de distância (x = log2(d/s)): além dele a pedra é um
 * PONTO (um vértice só, o corpo acertado no fragmento); aquém, uma MALHA
 * escolhida na CPU. O raio dela na tela no corte: ~12 px (o aglomerado,
 * sem caroços, corta meia oitava antes, a ~17 px: a malha custa por
 * vértice).
 */
export const X_CORTE = 5.5;

/**
 * OS DOIS TIPOS DE PEDRA (quarta volta), sorteados por pedra:
 *
 *  - o BLOCO: gelo único e anguloso — o elipsoide alongado ou achatado,
 *    quatro faces de fratura planas (arestas de verdade na silhueta e na
 *    luz) e relevo fino por cima;
 *  - o MONTE: `MEMBROS` bolas de tamanhos bem diferentes — um miolo, três
 *    grandes que dominam, quatro médias e miúdas nos vãos —, unidas por um
 *    máximo suave (vale macio, não risco) e sombreadas pela oclusão das
 *    vizinhas. É a forma da malha (a silhueta) e é o que se desfaz: perto,
 *    o aglomerado vira as bolas de verdade, que encolhem e somem uma a uma.
 *
 * As pedras de verdade são blocos na fração `FRACAO_DE_BLOCOS`; os
 * aglomerados (os exagerados) são sempre montes. Por faixa, só o corte
 * ponto/malha (ver `X_CORTE`).
 */
const MATERIAIS = {
  aglomerado: { corte: 5 },
  real: { corte: X_CORTE },
} as const;
export const FRACAO_DE_BLOCOS = 0.8;
/** o piso da fração acesa do disco de uma pedra na correção de fase (`luzDaPedra`) */
export const FASE_PISO = 0.5;
export const MEMBROS = 12;
/** as bolas que o aglomerado que se desfaz desenha (o miolo, as três grandes e as quatro médias) */
const BOLAS_DO_DESFAZ = 8;
/**
 * A ÁREA DE CADA TIPO: a luz do campo (`TAU_TETO`, a cessão do disco) foi
 * medida com a seção do elipsoide da terceira volta (0,61 do disco de raio
 * 1, média sobre orientações, Monte Carlo); as faces do bloco e o vão entre
 * as bolas do monte tiram área (bloco 0,48 de longe e 0,43 de perto com as
 * sete faces; monte 0,42 com quatro bolas e 0,46 com doze). Cada tipo
 * cresce √(0,61/área) — o campo cobre o céu como antes e o nível não cai.
 * (longe, perto): perto sobe com os lóbulos, sem estalo na troca.
 */
const ESCALA_DO_BLOCO = [1.124, 1.195] as const;
const ESCALA_DO_MONTE = [1.212, 1.15] as const;
/**
 * a média da oclusão das vizinhas no monte, pesada pela área (Monte Carlo
 * sobre 200 montes sorteados): o albedo é dividido por ela (o nível não cai)
 */
const AO_MEDIO_DO_MONTE = 0.98;
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

/**
 * O SORTEIO, no vértice e no fragmento (o aglomerado que se desfaz refaz
 * os membros por pixel). É INTEIRO (exato em qualquer GPU, e o mesmo da
 * CPU em `misturar`): a mesma pedra em todo fornecedor e em todo tier.
 * E O MONTE: `membro(base, k)` devolve o centro (no quadro da pedra, antes
 * do achatamento) e o raio do membro k, e em `lim` o limiar em que ele
 * some ao se desfazer (o miolo por último).
 */
const GLSL_SORTEIO = /* glsl */ `
const float PI = 3.14159265358979;
const int MEMBROS = ${MEMBROS};
const int BOLAS_DO_DESFAZ = ${BOLAS_DO_DESFAZ};
uint misturar(uint x) {
  x ^= x >> 16; x *= 0x7feb352du;
  x ^= x >> 15; x *= 0x846ca68bu;
  x ^= x >> 16;
  return x;
}
// quatro números de 8 bits de um sorteio só, em [0, 1]
vec4 quatro(uint h) {
  return vec4(float(h & 0xffu), float((h >> 8) & 0xffu), float((h >> 16) & 0xffu), float(h >> 24)) / 255.0;
}
vec3 direcao(float z01, float a01) {
  float z = 2.0 * z01 - 1.0;
  float a = 2.0 * PI * a01;
  return vec3(sqrt(max(1.0 - z * z, 0.0)) * vec2(cos(a), sin(a)), z);
}
// 0: o miolo; 1–3: as grandes, que dominam; 4–7: as médias; 8–11: as
// miúdas, meio enterradas no miolo (moram nos vãos entre as grandes)
vec4 membro(uint base, int k, out float lim, out float sujo) {
  uint h = misturar(base ^ (0x632be5abu + uint(k) * 0x9e3779b9u));
  vec4 r = quatro(h);
  float dist;
  float raio;
  if (k == 0) { dist = 0.1 * r.z; raio = 0.5 + 0.06 * r.w; }
  else if (k < 4) { dist = 0.42 + 0.12 * r.z; raio = 0.36 + 0.14 * r.w; }
  else if (k < 8) { dist = 0.55 + 0.1 * r.z; raio = 0.2 + 0.1 * r.w; }
  else { raio = 0.09 + 0.07 * r.w; dist = 0.5 + 0.6 * raio + 0.05 * r.z; }
  uint h2 = misturar(h);
  lim = k == 0 ? 0.32 : 0.36 + 0.64 * float(h2 & 0xffffu) / 65535.0;
  sujo = float(h2 >> 16) / 65535.0;
  // ×1,12: a área média do monte é a do elipsoide do ponto (a luz fecha)
  return vec4(direcao(r.x, r.y) * dist, raio) * 1.12;
}
`;

/**
 * O VÉRTICE COMUM às duas formas de desenhar uma pedra (terceira volta): os
 * uniformes, o sorteio e `lugar` — quem é a pedra, onde está, se aparece —,
 * os parâmetros da forma e a luz que ela recebe. O PONTO (`VERT_DO_PONTO`)
 * desenha uma pedra por vértice: o fragmento acerta o raio de visada no
 * corpo dela (`FRAG_DO_PONTO`). A MALHA (`VERT_DA_MALHA`) desenha as
 * pedras de perto, com lóbulos de verdade na silhueta.
 */
const GLSL_PEDRA_COMUM = /* glsl */ `
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
uniform int uAtivas;
uniform float uPxPorRad;
uniform float uFr[${OITAVAS}];
uniform float uFs[${OITAVAS}];
uniform float uGi[${OITAVAS}];
uniform float uGf[${OITAVAS}];
uniform float uGiro;

varying vec3 vSol;
varying vec3 vGlobo;
varying vec3 vTinta;
varying vec3 vNevoaCor;
varying vec4 vLuz;
varying vec4 vFica;
flat varying vec4 vSemente;

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
const float SOMBRA_MUTUA = ${glslF(SOMBRA_MUTUA)};
const float LADO_NO_ARCO[${OITAVAS}] = float[${OITAVAS}](${TABELA_DE_OITAVAS.map((o) => glslF(o.ladoNoArco)).join(', ')});
CONSTANTES_DO_ANEL
SOMBRA_DO_PLANETA
${GLSL_SORTEIO}
vec3 girarQ(vec4 q, vec3 v) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

// o que \`lugar\` deixa para o resto do vértice
int gO;
uint gBase;
float gS;
float gXo;
float gFica;
float gZ0;
float gTau;
float gDist;
float gRaio;
float gPx;
vec3 gOff;
vec3 gCV;
vec4 gPerfil;
vec3 gRegiao;
mat3 gR;
float gRaioMundo;

// QUEM É, ONDE ESTÁ E SE APARECE. Falso = nada a desenhar.
bool lugar(int o, int i) {
  gO = o;
  uint base = misturar(uint(i) ^ (uint(o) << 24));
  gBase = base;
  float s = S_MAX * exp2(-float(o));
  gS = s;
  float lado = 2.0 * K_JANELA * s;
  float meia = max(ESP_MIN, ESP_TAM * s);
  // os sorteios do lugar, juntos: h0 = (raio, tamanho), h1 = arco,
  // h2 = altura na lâmina, h3 = densidade
  uint h0 = misturar(base ^ 0x51ed27u);
  uint h1 = misturar(base ^ 0x2c1b3c6du);
  uint h2 = misturar(base ^ 0x7a3f91c5u);

  // O RAIO: a imagem da pedra mais perto da câmera. O sorteio radial é
  // quantizado em 1/65 536 do ladrilho para o cisalhamento fechar em
  // inteiros (ver o arco).
  uint q = h0 & 0xffffu;
  float a = float(q) / 65536.0;
  float f = uFr[o];
  float dk = floor(f - a + 0.5);
  float dRho = (dk + a - f) * lado;

  // O ARCO, com o cisalhamento: g·(dk + a) mod 1, com g = gi + gf e a
  // parte inteira de g já reduzida a 65 536 — gi·q em uint é exato.
  float cis = float((uint(uGi[o]) * q) & 0xffffu) / 65536.0 + uGf[o] * (dk + a);
  float dSig = float(h1 >> 8) / 16777216.0 + cis + uFs[o];
  dSig -= floor(dSig + 0.5);
  float dS = dSig * LADO_NO_ARCO[o];

  // a lâmina: triangular, mais densa no plano. Com a câmera FORA da
  // lâmina desta oitava (mais de uma espessura), as pedras ficam do lado
  // dela: o disco que segue atrás (a multidão não resolvida) não as vela
  // como fantasmas. A dobra é contínua — dentro da lâmina ela some.
  float z0 = (float(h2 & 0xffffu) + float(h2 >> 16) + 1.0) / 65536.0 - 1.0;
  gZ0 = z0;
  float z = mix(z0 * meia, sign(uZCamKm) * abs(z0) * meia, clamp(abs(uZCamKm) / meia - 1.0, 0.0, 1.0));
  float dz = z - uZCamKm;

  // A PRESENÇA (\`presencaDaOitava\`), na régua do ladrilho (≥ a distância
  // de verdade): zero onde a pedra troca de imagem, e é por isso que
  // nada estala. Entra crescendo do zero; o aglomerado, perto, se desfaz.
  float dT = sqrt(dRho * dRho + dS * dS + dz * dz);
  float xo = log2(max(dT, 1.0e-12) / s);
  gXo = xo;
  float entra = clamp(X_ENTRA - xo, 0.0, 1.0);
  gFica = o >= PRIMEIRA_REAL ? 1.0 : clamp(xo - X_DESFAZ, 0.0, 1.0);
  if (entra * gFica <= 0.0) return false;
  // o PONTO e a MALHA são complementares EXATOS pelo mesmo xo
#ifdef MALHA
  if (xo >= X_CORTE) return false;
#else
  if (xo < X_CORTE) return false;
#endif

  // o lugar, RELATIVO À CÂMERA, sem nenhuma soma de número grande
  // em SÉRIE, não em sin/cos: |θ| < 3e-3 rad, e o sin da GPU (Metal, via
  // ANGLE) devolvia ZERO para ângulo negativo minúsculo — metade do campo
  // empilhava numa parede na linha da câmera (medido na prancha v2)
  float rhoKm = uRhoCamKm + dRho;
  float dTh = dS / R0;
  float th2 = dTh * dTh;
  float senTh = dTh * (1.0 - th2 / 6.0);
  float umMenosCos = 0.5 * th2 * (1.0 - th2 / 12.0);
  float x = dRho * (1.0 - umMenosCos) - uRhoCamKm * umMenosCos;
  float y = rhoKm * senTh;
  vec3 er = vec3(uEixo, 0.0);
  vec3 et = vec3(-uEixo.y, uEixo.x, 0.0);
  gOff = er * x + et * y + vec3(0.0, 0.0, dz);

  // FORA DO QUADRO, NADA MAIS: a esfera envolvente contra os quatro
  // planos da lente, antes de qualquer conta de forma ou de luz
  gRaioMundo = length((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  gR = mat3(modelViewMatrix) / gRaioMundo;
  gCV = gR * gOff;
  // o tamanho: s⁻³ dentro da oitava (inversa da acumulada em [1, 2))
  float raioCheio = 0.5 * s / sqrt(1.0 - 0.75 * float(h0 >> 16) / 65536.0);
  float rB = 1.9 * raioCheio;
  float p00 = projectionMatrix[0][0];
  float p11 = projectionMatrix[1][1];
  float fz = -gCV.z;
  if (fz < -rB || abs(gCV.x) * p00 - fz > rB * sqrt(p00 * p00 + 1.0)
      || abs(gCV.y) * p11 - fz > rB * sqrt(p11 * p11 + 1.0)) return false;

  // A DENSIDADE do perfil medido (o mesmo do disco)
  float u = ((rhoKm / KM_POR_RAIO - R_INT) / (R_EXT - R_INT)) * U_ESCALA + U_BASE;
  gPerfil = (u < 0.0 || u > 1.0) ? vec4(0.0) : textureLod(uMapaAnel, vec2(u, 0.5), 0.0);
  gRegiao = regiaoDoAnel(rhoKm);
  gTau = gPerfil.a < 0.004 ? 0.0 : tauDaOpacidade(gPerfil.a) * gRegiao.z;
  if (float(misturar(base ^ 0x1b873593u) & 0xffffu) / 65536.0 * TAU_TETO * R0 >= gTau * rhoKm) return false;

  gDist = length(gOff);
  // colada na lente a pedra seria cortada pelo NEAR: ela encolhe antes
  float perto = smoothstep(uNearKm, 3.0 * uNearKm, gDist - raioCheio);
  gRaio = raioCheio * sqrt(entra) * perto;
  if (gRaio <= 0.0) return false;
  // o raio NA TELA, em px: decide o que se paga (lóbulos, borda roída)
  gPx = gRaio * uPxPorRad / max(fz, gRaio);
  return true;
}

// A FORMA (quarta volta): o BLOCO é o elipsoide alongado ou achatado com
// quatro faces de fratura planas e, só na malha, mais três faces e lóbulos
// fracos; o MONTE é, de longe, o miolo e as três grandes e, na malha, as
// médias e as miúdas brotando do miolo. Aqui, os parâmetros desta pedra.
vec4 cortes[4];
vec3 eixosF;
float bloco;
// a escala da área do tipo (\`ESCALA_DO_BLOCO\`, \`ESCALA_DO_MONTE\`), de longe (0) a perto (1)
float escalaDoTipo(float perto) {
  return bloco > 0.5
    ? mix(${glslF(ESCALA_DO_BLOCO[0])}, ${glslF(ESCALA_DO_BLOCO[1])}, perto)
    : mix(${glslF(ESCALA_DO_MONTE[0])}, ${glslF(ESCALA_DO_MONTE[1])}, perto);
}
float lP;
vec4 qGiro;
vec3 eixoGiro;
float angGiro;
void parametrosDaForma() {
  uint base = gBase;
  vec4 r4 = quatro(misturar(base ^ 0x68e31da4u)); // giro inicial (3) e nitidez
  vec4 r5 = quatro(misturar(base ^ 0xb5297a4du)); // eixo do giro (2), voltas, fase
  vec4 r6 = quatro(misturar(base ^ 0x1b56c4e9u)); // eixos (2), tipo
  lP = 1.5 + 2.5 * r4.w;
  bloco = gO >= PRIMEIRA_REAL && r6.z < ${glslF(FRACAO_DE_BLOCOS)} ? 1.0 : 0.0;
  // no bloco, as faces (normal, distância); no monte, o miolo e as três
  // grandes (centro, raio) — o que o ponto desenha de longe
  for (int k = 0; k < 4; k++) {
    if (bloco > 0.5) {
      vec4 rc = quatro(misturar(base ^ (0x9e3779b1u + uint(k) * 0x165667b1u)));
      cortes[k] = vec4(direcao(rc.x, rc.y), 0.5 + 0.32 * rc.z);
    } else {
      float lim;
      float sj;
      cortes[k] = membro(base, k, lim, sj);
    }
  }
  // o bloco vai do alongado ao achatado; o monte é mais redondo
  eixosF = bloco > 0.5
    ? vec3(1.0, 0.5 + 0.45 * r6.x, 0.32 + 0.4 * r6.y)
    : vec3(1.0, 0.72 + 0.25 * r6.x, 0.55 + 0.3 * r6.y);
  qGiro = vec4(
    sqrt(1.0 - r4.x) * sin(2.0 * PI * r4.y), sqrt(1.0 - r4.x) * cos(2.0 * PI * r4.y),
    sqrt(r4.x) * sin(2.0 * PI * r4.z), sqrt(r4.x) * cos(2.0 * PI * r4.z)
  );
  // o GIRO PRÓPRIO: um eixo por pedra, 1 a 3 voltas por período
  eixoGiro = direcao(r5.x, r5.y);
  float voltas = floor(min(r5.z, 0.999) * 6.0) - 2.5;
  angGiro = 2.0 * PI * fract(uGiro * sign(voltas) * (abs(voltas) + 0.5) + r5.w);
  uint hs = misturar(base ^ 0xd3a2646cu);
  vSemente = vec4(vec3(float(hs & 0x3ffu), float((hs >> 10) & 0x3ffu), float(hs >> 20)) * (37.0 / 1023.0), bloco);
}
// do quadro da pedra para o do anel (giro inicial e giro próprio)
vec3 girar(vec3 v) {
  v = girarQ(qGiro, v);
  float ca = cos(angGiro);
  float sa = sin(angGiro);
  return v * ca + cross(eixoGiro, v) * sa + eixoGiro * dot(eixoGiro, v) * (1.0 - ca);
}

// A LUZ: Sol com a sombra do globo e o brilho do globo (planetshine) — a
// irradiância é a mesma conta de \`planetshineNoAnel\`, numa face —, a
// sombra mútua, a névoa da lâmina e o albedo desta pedra
void luzDaPedra(vec3 vistaKm) {
  vec3 pAbs = uCamLocal + gOff / KM_POR_RAIO;
  vSol = normalize(gR * uDirSolLocal);
  vGlobo = normalize(gR * -pAbs);
  vec3 razao = gPerfil.rgb / COR_B_DO_PERFIL;
  vec3 tinta = COR_DO_GELO
    * (razao / max(dot(razao, vec3(0.2126, 0.7152, 0.0722)), 1.0e-4));
  if (dot(tinta, tinta) < 1.0e-6) tinta = COR_DO_GELO;
  tinta *= gRegiao.x;
  // 1,5 = 1 / (2/3): o disco de uma esfera de Lambert em oposição tem
  // média 2/3 do brilho de face — assim o campo em retro bate com o I/F
  // âncora do disco que ele substitui
  vec3 base3 = tinta * IF_RETRO * 1.5 * uLuzGanho;
  // O ALBEDO POR PEDRA: do gelo limpo (claro, levemente azulado) ao gelo
  // sujo (bege mais escuro e mais saturado), com a média na cor medida
  float sujo = float(misturar(gBase ^ 0x3c6ef372u) & 0xffffu) / 65536.0;
  float lumT = max(dot(tinta, vec3(0.2126, 0.7152, 0.0722)), 1.0e-4);
  vec3 limpo = mix(tinta, vec3(lumT), 0.8) * vec3(0.97, 1.0, 1.05) * 1.15;
  vec3 encardido = tinta * vec3(1.03, 0.98, 0.9) * 0.8;
  vTinta = mix(limpo, encardido, sujo) * (IF_RETRO * 1.5 * uLuzGanho * 0.88);
  // A FASE DO CORPO (quarta volta): a curva de fase do anel já é a do
  // campo de pedras inteiro; uma pedra de Lambert vista a uma fase α mostra
  // só a fração Φ(α) = (sen α + (π − α)·cos α)/π do disco aceso. Sem
  // devolver isso a pedra contava a fase duas vezes e o campo escurecia
  // com a luz dura (medido: −15 a −26 %). Teto de 2× contra a luz.
  float cosA = clamp(dot(vSol, -vistaKm / max(length(vistaKm), 1.0e-30)), -1.0, 1.0);
  float alfaV = acos(cosA);
  vTinta /= max((sin(alfaV) + (PI - alfaV) * cosA) / PI, ${glslF(FASE_PISO)});
  float sombra = sombraDoPlaneta(pAbs);
  float rr = max(length(pAbs.xy), 1.001);
  vec3 pHat = vec3(pAbs.xy, 0.0) / rr;
  float alfaFase = acos(clamp(dot(uDirSolLocal, pHat), -1.0, 1.0));
  float fi = (sin(alfaFase) + (PI - alfaFase) * cos(alfaFase)) / PI;
  float irrGlobo = ALBEDO_GEO * fi / (rr * rr);

  // A SOMBRA MÚTUA, estatística (\`sombraMutua\`): a fração F da lâmina
  // entre a pedra e a face do Sol (a acumulada da triangular, uniforme
  // sobre as pedras) tira luz da funda e dá à de cima, com média 1
  float z0 = gZ0;
  float cdf = z0 < 0.0 ? 0.5 * (1.0 + z0) * (1.0 + z0) : 1.0 - 0.5 * (1.0 - z0) * (1.0 - z0);
  float F = uDirSolLocal.z >= 0.0 ? 1.0 - cdf : cdf;
  float senE = abs(uDirSolLocal.z) / max(length(uDirSolLocal), 1.0e-9);
  float forca = clamp(0.6 * min(gTau, 1.5) / max(senE, 0.05), 0.0, 1.0);
  float mutua = 1.0 + SOMBRA_MUTUA * forca * (1.0 - 2.0 * F);

  // A NÉVOA DA LÂMINA: a multidão não resolvida entre a pedra e a lente —
  // a profundidade óptica do trecho do raio que corre DENTRO da lâmina de
  // verdade (|z| < ESP_MIN), com uma fração NEVOA_K dela (o resto já está
  // nas pedras). De cima ela é nada; de dentro, uma faixa no horizonte.
  float zc = uZCamKm;
  float zp = uZCamKm + gOff.z;
  float dz = gOff.z;
  // a névoa conta numa faixa de duas lâminas (a multidão fina se espalha
  // além do miolo de ESP_MIN)
  float hn = 2.0 * ESP_MIN;
  float nevoa = 0.0;
  vNevoaCor = vec3(0.0);
  // só com a câmera a menos de 100 m do plano há névoa a contar
  if (abs(zc) < 0.1) {
    float dentro;
    if (abs(dz) < 1.0e-7) dentro = abs(zc) < hn ? gDist : 0.0;
    else dentro = gDist * max(min(max(zc, zp), hn) - max(min(zc, zp), -hn), 0.0) / abs(dz);
    // τ grampeado em 1: no miolo do B a névoa apagaria a forma das pedras
    nevoa = 1.0 - exp(-NEVOA_K * min(gTau, 1.0) / (2.0 * hn) * dentro);
    float hgV = hgDoAnel(clamp(dot(vSol, normalize(vistaKm)), -1.0, 1.0));
    vNevoaCor = base3 * (0.5 * sombra * hgV + 0.35 * irrGlobo + ${glslF(AMBIENTE_DO_ANEL)});
  }
  vLuz = vec4(sombra, irrGlobo, mutua, nevoa);
}

void foraComum() {
  vSol = vec3(0.0); vGlobo = vec3(0.0); vTinta = vec3(0.0); vNevoaCor = vec3(0.0);
  vLuz = vec4(0.0); vFica = vec4(0.0); vSemente = vec4(0.0);
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

/**
 * A MALHA DE PERTO: os ids que a CPU escolheu (`aId`, ver
 * `escolherDePerto`), com a forma de perto acesa de x = `X_CORTE` (zero, o
 * mesmo corpo do ponto: nada estala na troca) a uma oitava mais perto. O
 * BLOCO tem a normal analítica e marca as faces de fratura (o fragmento as
 * desenha planas, com aresta); o MONTE tem a normal por diferença finita do
 * casco e a oclusão das vizinhas por vértice (o vale macio).
 */
const VERT_DA_MALHA = /* glsl */ `
attribute float aId;
varying vec3 vVista;
varying vec3 vNormal;
varying vec3 vLocal;
// (oclusão das vizinhas ÷ a média, sujeira do membro, 1 na face de fratura)
varying vec3 vMonte;
${GLSL_PEDRA_COMUM}
RUIDO
// as seis direções dos lóbulos (meio icosaedro, uma de cada par oposto);
// cada uma empurra ou puxa a pedra dos DOIS lados, com amplitudes próprias
const vec3 LOBOS[6] = vec3[6](
  vec3(0.0, 0.5257311, 0.8506508), vec3(0.0, 0.5257311, -0.8506508),
  vec3(0.5257311, 0.8506508, 0.0), vec3(0.5257311, -0.8506508, 0.0),
  vec3(0.8506508, 0.0, 0.5257311), vec3(0.8506508, 0.0, -0.5257311)
);
vec4 qA; vec4 qB; vec4 qC; float lobos;
// as três faces que só a malha tem (acesas de x = X_CORTE para perto)
vec4 cortesX[3];
vec4 mm[MEMBROS];
float mSujo[MEMBROS];
// O BLOCO na direção d: lóbulos fracos (normal analítica: d − ∇r/r) e as
// quatro faces de fratura, onde a normal é a do plano
float raioDoBloco(vec3 d, out vec3 n0, out float face) {
  float r = 1.0;
  n0 = d;
  face = 0.0;
  if (lobos > 0.0) {
    float am[6] = float[6](qA.x, qA.y, qA.z, qA.w, qB.x, qB.y);
    float an[6] = float[6](qB.z, qB.w, qC.x, qC.y, qC.z, qC.w);
    float e2 = exp(-2.0 * lP);
    vec3 g = vec3(0.0);
    for (int k = 0; k < 6; k++) {
      float ep = exp(lP * (dot(d, LOBOS[k]) - 1.0));
      float em = e2 / ep;
      r += lobos * (am[k] * ep + an[k] * em);
      g += (lobos * lP * (am[k] * ep - an[k] * em)) * LOBOS[k];
    }
    n0 = d - (g - dot(g, d) * d) / r;
  }
  for (int k = 0; k < 7; k++) {
    vec4 c = k < 4 ? cortes[k] : vec4(cortesX[k - 4].xyz, mix(1.6, cortesX[k - 4].w, lobos));
    float kc = dot(d, c.xyz);
    if (kc > 0.05 && c.w < r * kc) { r = c.w / kc; n0 = c.xyz; face = 1.0; }
  }
  return r;
}
// O MONTE na direção d: o máximo suave (p = 16) das saídas do raio d pelas
// bolas; onde o raio passa ao lado de uma bola a saída segue decrescendo
// (sem degrau). A normal sai ANALÍTICA, numa passada só (d − ∇r/r, como a
// dos lóbulos; a raiz tem piso para a parede ao lado de uma bola não
// virar navalha). Em \`dono\`, o membro que manda.
float raioDoMonte(vec3 d, out vec3 n0, out int dono) {
  float s = 0.0;
  float melhor = -1.0;
  vec3 g = vec3(0.0);
  dono = 0;
  for (int k = 0; k < MEMBROS; k++) {
    vec3 c = mm[k].xyz;
    float b = dot(d, c);
    float disc = b * b - dot(c, c) + mm[k].w * mm[k].w;
    float raiz = sqrt(abs(disc));
    float f = b + sign(disc) * raiz;
    if (f <= 0.0) continue;
    if (f > melhor) { melhor = f; dono = k; }
    float f2 = f * f; f2 *= f2; f2 *= f2; f2 *= f2;
    s += f2;
    // ∂f/∂d = c·(1 ± b/raiz), pesado por f¹⁵
    g += (f2 / f) * (1.0 + sign(disc) * b / max(raiz, 0.08)) * c;
  }
  float r = pow(max(s, 1.0e-30), 1.0 / 16.0);
  g *= r / max(s, 1.0e-30);
  n0 = d - (g - dot(g, d) * d) / r;
  return r;
}
void main() {
  int id = int(aId + 0.5);
  int k = id / uPorOitava;
  if (!lugar(OITAVA_BASE + k, id - k * uPorOitava)) {
    foraComum(); vVista = vec3(0.0); vNormal = vec3(0.0, 0.0, 1.0); vLocal = vec3(0.0); vMonte = vec3(1.0, 0.5, 0.0);
    return;
  }
  parametrosDaForma();
  lobos = clamp(X_CORTE - gXo, 0.0, 1.0);
  vec3 d = normalize(position);
  vec3 u;
  vec3 nU;
  vec3 monte = vec3(1.0, 0.5, 0.0);
#ifdef DESFAZ
  // O AGLOMERADO QUE SE DESFAZ: cada instância é UMA BOLA (o membro
  // gl_InstanceID mod BOLAS_DO_DESFAZ da pedra aId: o miolo, as grandes e
  // as médias; as miúdas ficam no monte inteiro). Ela encolhe um pouco com as
  // outras e some no próprio limiar; abrem-se vãos entre bolas de verdade,
  // sem descarte (a GPU segue escondendo o que fica atrás).
  int kM = gl_InstanceID - (gl_InstanceID / BOLAS_DO_DESFAZ) * BOLAS_DO_DESFAZ;
  float lim;
  float sj;
  vec4 m = membro(gBase, kM, lim, sj);
  m.w *= smoothstep(lim - 0.32, lim, gFica) * (0.8 + 0.2 * gFica);
  if (m.w <= 0.0) {
    foraComum(); vVista = vec3(0.0); vNormal = vec3(0.0, 0.0, 1.0); vLocal = vec3(0.0); vMonte = vec3(1.0, 0.5, 0.0);
    return;
  }
  nU = d;
  u = m.xyz + d * m.w;
  // a oclusão pelo miolo e pelas grandes que ainda estão lá
  float occ = 0.0;
  for (int j = 0; j < 4; j++) {
    if (j == kM) continue;
    float lj;
    float sjj;
    vec4 o = membro(gBase, j, lj, sjj);
    o.w *= smoothstep(lj - 0.32, lj, gFica) * (0.8 + 0.2 * gFica);
    vec3 v = o.xyz - u;
    float l2 = max(dot(v, v), 1.0e-4);
    occ += o.w * o.w / l2 * max(dot(nU, v), 0.0) * inversesqrt(l2);
  }
  monte.xy = vec2(clamp(1.0 - 0.6 * occ, 0.35, 1.0) / ${glslF(AO_MEDIO_DO_MONTE)}, sj);
#else
  if (bloco > 0.5) {
    if (lobos > 0.0) {
      float caroco = 0.04 + 0.08 * quatro(misturar(gBase ^ 0x1b56c4e9u)).w;
      qA = (quatro(misturar(gBase ^ 0x85ebca6bu)) * 1.4 - 0.4) * caroco;
      qB = (quatro(misturar(gBase ^ 0xc2b2ae35u)) * 1.4 - 0.4) * caroco;
      qC = (quatro(misturar(gBase ^ 0x27d4eb2fu)) * 1.4 - 0.4) * caroco;
      for (int j = 0; j < 3; j++) {
        vec4 rc = quatro(misturar(gBase ^ (0x3c6ef372u + uint(j) * 0x165667b1u)));
        cortesX[j] = vec4(direcao(rc.x, rc.y), 0.55 + 0.25 * rc.z);
      }
    }
    float face;
    u = d * raioDoBloco(d, nU, face);
    monte.z = face;
  } else {
    float lim;
    for (int j = 0; j < MEMBROS; j++) {
      mm[j] = membro(gBase, j, lim, mSujo[j]);
      // as médias e as miúdas brotam do miolo (zero no corte: o corpo do ponto)
      if (j >= 4) mm[j] *= lobos;
    }
    int dono;
    u = d * raioDoMonte(d, nU, dono);
    nU = normalize(dot(nU, d) < 0.05 ? d : nU);
    // a oclusão das vizinhas (a de uma esfera vista de um ponto): o membro
    // que contém o ponto fica atrás da face e não conta
    float occ = 0.0;
    for (int j = 0; j < MEMBROS; j++) {
      vec3 v = mm[j].xyz - u;
      float l2 = max(dot(v, v), 1.0e-4);
      occ += mm[j].w * mm[j].w / l2 * max(dot(nU, v), 0.0) * inversesqrt(l2);
    }
    float ao = clamp(1.0 - 0.6 * occ, 0.35, 1.0) / ${glslF(AO_MEDIO_DO_MONTE)};
    monte.xy = vec2(mix(1.0, ao, lobos), mix(0.5, mSujo[dono], lobos));
  }
#endif
  vec3 local = u * eixosF;
  vec3 nLocal = normalize(nU / eixosF);
  vLocal = local;
  // A SILHUETA DO BLOCO: um relevo fraco desloca o casco fora das faces
  // (o fragmento só sombreia: descartar a borda desligava a remoção de
  // superfícies escondidas e dobrava o custo — medido). Zero na troca com o
  // ponto, como os lóbulos.
  float desl = 0.0;
  if (bloco > 0.5 && lobos > 0.0) desl = lobos * 0.07 * (ruido(local * 1.8 + vSemente.xyz) - 0.5) * (1.0 - monte.z);
  vec3 pKm = gOff + girar(local * (1.0 + desl)) * (gRaio * escalaDoTipo(lobos));
  // PARA A TELA: só a parte LINEAR da matriz — a câmera é a origem da
  // vista, e o deslocamento já é relativo a ela
  vVista = gR * pKm;
  vNormal = gR * girar(nLocal);
  vMonte = monte;
  gl_Position = projectionMatrix * vec4(vVista * (gRaioMundo / KM_POR_RAIO), 1.0);
  luzDaPedra(vVista);
  vFica = vec4(gFica, gRaio, gPx, 0.0);
}
`;

/**
 * O PONTO: uma pedra por vértice, o quadrado do tamanho dela na tela — o
 * desenho barato de todas as que ficam além de x = `X_CORTE`. As
 * oitavas vêm da mais FINA para a mais grossa (as finas moram mais perto:
 * o quadro sai quase da frente para trás). O fragmento recebe o corpo
 * inteiro (centro, giro, eixos e as faces do bloco) e acerta nele o raio
 * de visada.
 */
const VERT_DO_PONTO = /* glsl */ `
flat varying vec3 vCentro;
flat varying mat3 vGiro;
flat varying vec3 vEixos;
flat varying vec4 vCortes[4];
flat varying vec4 vProj;
${GLSL_PEDRA_COMUM}
void main() {
  int id = gl_VertexID;
  int k = id / uPorOitava;
  int o = OITAVA_BASE + clamp(uAtivas - OITAVA_BASE, 1, QUANTAS) - 1 - k;
  if (!lugar(o, id - k * uPorOitava)) {
    foraComum(); gl_PointSize = 0.0;
    return;
  }
  parametrosDaForma();
  float raioI = gRaio * escalaDoTipo(0.0);
  vCentro = gCV;
  // o giro inteiro, do quadro da pedra para a vista
  vGiro = gR * mat3(girar(vec3(1.0, 0.0, 0.0)), girar(vec3(0.0, 1.0, 0.0)), girar(vec3(0.0, 0.0, 1.0)));
  vEixos = eixosF;
  for (int j = 0; j < 4; j++) vCortes[j] = cortes[j];
  vProj = vec4(projectionMatrix[0][0], projectionMatrix[1][1], projectionMatrix[2][0], projectionMatrix[2][1]);
  gl_Position = projectionMatrix * vec4(gCV * (gRaioMundo / KM_POR_RAIO), 1.0);
  gl_PointSize = 2.0 * raioI * uPxPorRad / max(-gCV.z, raioI) + 1.5;
  luzDaPedra(gCV);
  vFica = vec4(gFica, gRaio, gPx, raioI);
}
`;

const FRAG_COMUM = /* glsl */ `
precision highp float;
precision highp int;
varying vec3 vSol;
varying vec3 vGlobo;
varying vec3 vTinta;
varying vec3 vNevoaCor;
varying vec4 vLuz;
varying vec4 vFica;
flat varying vec4 vSemente;
const float ENVOLVE = ${glslF(ENVOLVE)};
const float AMBIENTE_DO_ANEL = ${glslF(AMBIENTE_DO_ANEL)};
const float PISO_DA_NOITE = ${glslF(PISO_DA_NOITE)};
const vec3 COR_DE_SATURNO = vec3(${COR_DE_SATURNO.join(', ')});
CAMADA_DO_ANEL
RUIDO
float envolver(float c) { return max((c + ENVOLVE) / (1.0 + ENVOLVE), 0.0); }

// A COR DE UM PIXEL DA PEDRA: \`vista\` o ponto em km na vista, \`ns\` a
// normal lisa, \`p\` o ponto no quadro da pedra (raio ~1), \`ao\` a oclusão
// das vizinhas (já dividida pela média), \`sujo\` o gelo do membro. Quem
// descarta é o chamador, depois das derivadas.
vec3 sombrear(vec3 vista, vec3 ns, vec3 p, float ao, float sujo) {
  vec3 v = -vista / max(length(vista), 1.0e-30);
  vec3 dpx = dFdx(vista);
  vec3 dpy = dFdy(vista);
  // a pegada do pixel no quadro da pedra: tudo o que é menor que ~2 px se
  // apaga — sem cintilar de longe
  float pegada = max(length(fwidth(p)), 1.0e-6);
  bool bloco = vSemente.w > 0.5;

  // O RELEVO: no bloco, fino (o gelo fraturado, sem células); no monte, a
  // pele encaroçada de cada membro. Cada escala some com a pegada.
  float hL = 0.0;
  if (!bloco) {
    float wG = 1.0 - smoothstep(0.25, 0.6, pegada * 2.2);
    if (wG > 0.0) hL += wG * 0.26 * (ruido(p * 2.2 + vSemente.yzx) - 0.5);
  }
  float wM = bloco ? 1.0 - smoothstep(0.25, 0.6, pegada * 3.0) : 0.0;
  if (wM > 0.0) hL += wM * 0.05 * (ruido(p * 3.0 + vSemente.xyz) - 0.5);
  float wF = 1.0 - smoothstep(0.25, 0.6, pegada * 13.0);
  if (wF > 0.0) hL += wF * (bloco ? 0.022 : 0.04) * (ruido(p * 13.0 + vSemente.zxy) - 0.5);
  // gelo limpo (claro, levemente azulado) ou sujo (bege) por membro; o
  // bloco já sorteou o dele inteiro
  vec3 tintaM = bloco ? vec3(1.0) : mix(vec3(1.04, 0.99, 0.9) * 0.82, vec3(0.98, 1.0, 1.04) * 1.16, sujo);

  // O RELEVO pela derivada de tela da altura (Mikkelsen 2010, relevo sem
  // tangentes) — antes de qualquer descarte, para a derivada valer
  float hKm = hL * vFica.y;
  vec3 r1 = cross(dpy, ns);
  vec3 r2 = cross(ns, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dFdx(hKm) * r1 + dFdy(hKm) * r2);
  vec3 nb = abs(det) * ns - grad;
  vec3 n = nb / max(length(nb), 1.0e-30);

  float nl = dot(n, vSol);
  // retroespalhamento: a fase do próprio anel (1 em retro), com o surto
  // de oposição do gelo
  float cosV = clamp(dot(vSol, v), -1.0, 1.0);
  float fase = hgDoAnel(-cosV) * (1.0 + 0.3 * exp(-sqrt(max(2.0 * (1.0 - cosV), 0.0)) / 0.05));
  // o terminador DURO: a luz que entra pelo gelo sai azulada só na beira
  float dif = envolver(nl);
  vec3 tom = mix(vec3(0.82, 0.93, 1.1), vec3(1.0), smoothstep(-0.05, 0.25, nl));
  vec3 albedo = vTinta * tintaM * ao;
  // a sombra mútua (vLuz.z) pesa só no Sol direto
  vec3 cor = albedo * tom * (dif * fase * vLuz.x * vLuz.z);
  // o brilho especular: pequeno, só nas faces viradas para o Sol (mais
  // vivo na face plana do bloco)
  vec3 meio = normalize(vSol + v);
  float brilho = pow(max(dot(n, meio), 0.0), 60.0) * step(0.0, nl);
  cor += vec3(dot(vTinta, vec3(0.2126, 0.7152, 0.0722))) * (0.35 * brilho * vLuz.x * vLuz.z * min(ao, 1.0));
  // o globo (cor quente) e o ambiente do anel — o lado da noite fica quase
  // preto, aquecido só pelo globo
  cor += albedo * COR_DE_SATURNO * (envolver(dot(n, vGlobo)) * vLuz.y);
  cor += albedo * (AMBIENTE_DO_ANEL * (0.25 + 0.75 * vLuz.x) + PISO_DA_NOITE);
  // de dentro da lâmina, a multidão entre a pedra e a lente
  return mix(cor, vNevoaCor, vLuz.w);
}
`;

/**
 * O FRAGMENTO DA MALHA. Na face de fratura do bloco a normal é a do plano
 * (a derivada da posição: a face sai lisa e a aresta, dura).
 */
const FRAG_DA_MALHA = /* glsl */ `
${FRAG_COMUM}
varying vec3 vVista;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec3 vMonte;
void main() {
  vec3 ns = vNormal / max(length(vNormal), 1.0e-30);
  // a normal da face plana, fora de qualquer desvio (a derivada pede o
  // fluxo uniforme)
  vec3 nf = normalize(cross(dFdx(vVista), dFdy(vVista)));
  // na face e nos triângulos que a tocam (a aresta sai viva, não chanfrada)
  if (vMonte.z > 0.01) ns = dot(nf, ns) < 0.0 ? -nf : nf;
  vec3 vista = vVista;
  vec3 p = vLocal;
  float ao = vMonte.x;
  float sujo = vMonte.y;
  gl_FragColor = vec4(sombrear(vista, ns, p, ao, sujo), 1.0);
}
`;

const FRAG_DO_PONTO = /* glsl */ `
${FRAG_COMUM}
uniform vec4 uTela;
flat varying vec3 vCentro;
flat varying mat3 vGiro;
flat varying vec3 vEixos;
flat varying vec4 vCortes[4];
flat varying vec4 vProj;
void main() {
  // o RAIO DE VISADA deste pixel, na vista (a câmera na origem)
  vec2 ndc = (gl_FragCoord.xy - uTela.xy) / uTela.zw * 2.0 - 1.0;
  vec3 d = normalize(vec3((ndc.x + vProj.z) / vProj.x, (ndc.y + vProj.w) / vProj.y, -1.0));
  // no quadro da pedra, com o achatamento desfeito: a esfera unitária
  // cortada pelos planos de fratura
  mat3 Mt = transpose(vGiro);
  vec3 qo = (Mt * -vCentro) / vFica.w / vEixos;
  vec3 qd = (Mt * d) / vFica.w / vEixos;
  float a = dot(qd, qd);
  float b = dot(qo, qd);
  float disc = b * b - a * (dot(qo, qo) - 1.0);
  // longe do corpo (o canto do quadrado), nada a sombrear
  if (dot(qo, qo) - b * b / a > 1.6) discard;
  float t0 = (-b - sqrt(max(disc, 0.0))) / a;
  float t1 = (-b + sqrt(max(disc, 0.0))) / a;
  vec3 nq = qo + t0 * qd;
  bool acerta;
  if (vSemente.w > 0.5) {
    for (int k = 0; k < 4; k++) {
      vec4 c = vCortes[k];
      float nd = dot(c.xyz, qd);
      float no = dot(c.xyz, qo);
      float tp = (c.w - no) / (abs(nd) > 1.0e-12 ? nd : 1.0e-12);
      if (nd < 0.0) { if (tp > t0) { t0 = tp; nq = c.xyz; } }
      else t1 = min(t1, tp);
    }
    acerta = disc >= 0.0 && t0 <= t1;
  } else {
    // o MONTE de longe: a bola mais próxima entre o miolo e as três grandes
    t0 = 1.0e30;
    for (int k = 0; k < 4; k++) {
      vec4 m = vCortes[k];
      vec3 oc = qo - m.xyz;
      float bm = dot(oc, qd);
      float dm = bm * bm - a * (dot(oc, oc) - m.w * m.w);
      if (dm < 0.0) continue;
      float tm = (-bm - sqrt(dm)) / a;
      if (tm < t0) { t0 = tm; nq = (qo + tm * qd - m.xyz) / m.w; }
    }
    acerta = t0 < 1.0e29;
  }
  // fora do corpo, o ponto mais perto do raio, para a derivada seguir lisa
  float t = acerta ? t0 : -b / a;
  vec3 q = qo + t * qd;
  if (!acerta) nq = q;
  vec3 p = q * vEixos;
  vec3 ns = normalize(vGiro * normalize(nq / vEixos));
  vec3 c = sombrear(d * t, ns, p, 1.0, 0.5);
  if (!acerta) discard;
  gl_FragColor = vec4(c, 1.0);
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
  // a oitava o está em x = x0 + o: só contam as de x < 7 que ainda não se
  // desfizeram (x > 3, ou de verdade) — no máximo cinco seguidas, a partir
  // da primeira com x > 2 ou da primeira de verdade (um log2 só por pixel)
  float x0 = log2(max(d, 1.0e-12) / ${glslF(S_MAX_KM)});
  int o0 = clamp(int(floor(${glslF(X_DESFAZ)} - x0)), 0, ${PRIMEIRA_OITAVA_REAL});
  float f = 0.0;
  for (int k = 0; k < 5; k++) {
    int o = o0 + k;
    if (o >= ${OITAVAS}) break;
    float x = x0 + float(o);
    float fica = o >= ${PRIMEIRA_OITAVA_REAL} ? 1.0 : clamp(x - ${glslF(X_DESFAZ)}, 0.0, 1.0);
    f += clamp(${glslF(X_ENTRA)} - x, 0.0, 1.0) * fica;
  }
  f = min(f / ${glslF(PRESENTES)}, 1.0)
    * min(1.0, ${glslF(TAU_TETO * R0_KM)} / (max(rKm, 1.0) * max(tau, 1.0e-4)))
    * uCamDasPedras.w
    * (1.0 - exp(-max(abs(uCamDasPedras.z), ${glslF(2 * ESPESSURA_MINIMA_KM)}) / max(d, 1.0e-9) / ${glslF(MU_RASANTE)}));
  float a = f <= 0.0 ? alfa : 1.0 - pow(max(1.0 - alfa, 1.0e-4), 1.0 - f);
  // DE DENTRO DA LÂMINA (quarta volta) o disco é só um plano, e no B — onde
  // ele fica com o que passa do teto do campo — era uma parede bege de
  // borda dura no horizonte. Ali ele vira névoa: rala perto, mais densa a
  // uma ou duas centenas de metros, e se desfaz rente ao horizonte (a altura tem o piso
  // de duas lâminas: o vPos do disco não resolve menos que isso).
  float zc = abs(uCamDasPedras.z);
  float dentro = 1.0 - smoothstep(${glslF(2 * ESPESSURA_MINIMA_KM)}, ${glslF(6 * ESPESSURA_MINIMA_KM)}, zc);
  if (dentro > 0.0) {
    float nevoa = ${glslF(NEVOA_DO_DISCO)}
      * smoothstep(0.0, 0.05, max(zc, ${glslF(2 * ESPESSURA_MINIMA_KM)}) / max(d, 1.0e-9))
      * (1.0 - exp(-d / 0.08));
    a = mix(a, min(a, nevoa), dentro);
  }
  return a;
}
`;

/**
 * O GRÃO DO DISCO (quarta volta): abaixo de `H_GRAO_KM` o disco atrás das
 * pedras não pode ler como chapa lisa. Uma folha no plano do anel, centrada
 * na câmera (o mesmo truque do relativo à câmera das pedras), MULTIPLICA a
 * luz do disco por um grão auto-semelhante: oitavas de célula de
 * `GRAO_BASE_KM`·2^k, e em cada pixel só as duas cuja célula mede de ~2 a
 * ~7 px, com pesos cos² que somam 1 (descer troca de oitava sem estalo).
 * Cada célula tem um grão — uma cúpula com lado claro e lado escuro pela
 * mesma direção do Sol, e um albedo próprio —, e as duas parcelas têm
 * média ZERO (o gradiente de uma cúpula que se anula na borda soma zero; o
 * albedo é simétrico): o disco escurece num lado do grão o que clareia no
 * outro, e a média fica a de hoje. O sorteio é por célula inteira e
 * periódica, com a fração da câmera no período tirada na CPU em dupla
 * precisão: o grão é estável no mundo. As pedras de poucos pixels nascem
 * do tamanho desse grão.
 */
export const H_GRAO_KM = 1600;
const GRAO_BASE_KM = 0.001;
const GRAO_OITAVAS = 18;
const GRAO_PERIODO = 1024;
/** a força do grão sobre a luz do disco (multiplica 1 ± isto) */
export const GRAO_AMPLITUDE = 0.45;

/** a força do grão pela altura: 0 em `H_GRAO_KM`, inteira uma oitava abaixo */
export function forcaDoGrao(alturaKm: number): number {
  const h = Math.max(Math.abs(alturaKm), 1e-9);
  const t = grampo(Math.log2(H_GRAO_KM / h));
  return t * t * (3 - 2 * t);
}

/** o alcance da folha: além de ~30 alturas ela já está de raspão e apagada */
export function raioDaFolhaKm(alturaKm: number): number {
  return Math.max(40, 30 * Math.abs(alturaKm));
}

const VERT_DA_FOLHA = /* glsl */ `
uniform sampler2D uMapaAnel;
uniform vec2 uEixo;
uniform float uRhoCamKm;
uniform float uZCamKm;
uniform float uForcaGrao;
uniform float uRaioFolha;
varying vec2 vGrao;
varying float vAmp;
CONSTANTES_DO_ANEL
void main() {
  vec2 xy = position.xy * uRaioFolha;
  vec3 er = vec3(uEixo, 0.0);
  vec3 et = vec3(-uEixo.y, uEixo.x, 0.0);
  vec3 off = er * xy.x + et * xy.y + vec3(0.0, 0.0, -uZCamKm);
  float rhoKm = length(vec2(uRhoCamKm + xy.x, xy.y));
  // as coordenadas do grão RELATIVAS à câmera, sem subtrair números
  // grandes: o raio e o arco em R0 (o mesmo arco das pedras)
  float dRho = (xy.x * (2.0 * uRhoCamKm + xy.x) + xy.y * xy.y) / (rhoKm + uRhoCamKm);
  vGrao = vec2(dRho, ${glslF(R0_KM)} * atan(xy.y, uRhoCamKm + xy.x));
  float u = ((rhoKm / KM_POR_RAIO - R_INT) / (R_EXT - R_INT)) * U_ESCALA + U_BASE;
  vec4 perfil = (u < 0.0 || u > 1.0) ? vec4(0.0) : textureLod(uMapaAnel, vec2(u, 0.5), 0.0);
  float tau = perfil.a < 0.004 ? 0.0 : tauDaOpacidade(perfil.a) * regiaoDoAnel(rhoKm).z;
  // de raspão o grão vira moiré: ele some quando a folha fica de lado
  float mu = abs(uZCamKm) / max(length(off), 1.0e-9);
  vAmp = ${glslF(GRAO_AMPLITUDE)} * uForcaGrao * min(tau, 1.0) * smoothstep(0.03, 0.15, mu);
  float raioMundo = length((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  mat3 R = mat3(modelViewMatrix) / raioMundo;
  gl_Position = projectionMatrix * vec4((R * off) * (raioMundo / KM_POR_RAIO), 1.0);
}
`;

const FRAG_DA_FOLHA = /* glsl */ `
precision highp float;
precision highp int;
uniform vec2 uGraoCam[${GRAO_OITAVAS}];
uniform vec3 uDirSolLocal;
uniform vec2 uEixo;
uniform float uZCamKm;
varying vec2 vGrao;
varying float vAmp;
uint misturar(uint x) {
  x ^= x >> 16; x *= 0x7feb352du;
  x ^= x >> 15; x *= 0x846ca68bu;
  x ^= x >> 16;
  return x;
}
void main() {
  vec2 fw = fwidth(vGrao);
  float pegada = max(max(fw.x, fw.y), 1.0e-12);
  // o Sol no quadro do grão (raio, arco); do lado sem Sol a luz atravessa
  // o anel e o relevo quase não aparece
  vec2 L = vec2(dot(uDirSolLocal.xy, uEixo), dot(uDirSolLocal.xy, vec2(-uEixo.y, uEixo.x)));
  vec2 inclina = L / max(abs(uDirSolLocal.z), 0.2) * (uDirSolLocal.z * uZCamKm >= 0.0 ? 1.0 : 0.35);
  float t0 = log2(pegada / ${glslF(GRAO_BASE_KM)});
  int k0 = int(ceil(t0 + 0.8));
  float g = 0.0;
  for (int j = 0; j < 2; j++) {
    int k = k0 + j;
    if (k < 0 || k >= ${GRAO_OITAVAS}) continue;
    // t = log2(célula/pegada) em [0,8; 2,8]: cos² centrado em 1,8 — as duas
    // oitavas somam peso 1
    float w = cos(1.5707963 * (float(k) - t0 - 1.8));
    w *= w;
    vec2 q = (vGrao + uGraoCam[k]) / (${glslF(GRAO_BASE_KM)} * exp2(float(k)));
    vec2 ii = floor(q);
    vec2 ff = q - ii;
    ii = mod(ii, ${GRAO_PERIODO}.0);
    uint h = misturar(uint(ii.x) * 0x8da6b343u ^ misturar(uint(ii.y) + uint(k) * 0x68e31da4u));
    vec4 r = vec4(float(h & 0xffu), float((h >> 8) & 0xffu), float((h >> 16) & 0xffu), float(h >> 24)) / 255.0;
    float rg = 0.2 + 0.15 * r.z;
    vec2 e = (ff - 0.35 - 0.3 * r.xy) / rg;
    float r2 = dot(e, e);
    if (r2 >= 1.0) continue;
    // a cúpula (1 − r²)², de altura meio raio: o gradiente se anula na
    // borda e soma zero; o lado virado ao Sol clareia, o outro escurece
    float b = 1.0 - r2;
    float lado = clamp(dot(2.0 * b * e, inclina), -1.0, 1.0);
    g += w * (0.5 * (2.0 * r.w - 1.0) * b * b + lado);
  }
  // o disco já está no quadro: 2·cor·destino (a mistura multiplica)
  gl_FragColor = vec4(vec3(0.5 * max(1.0 + vAmp * g, 0.0)), 1.0);
}
`;

/** a malha da folha: anéis em escala log de 10⁻⁵ a 1 (o raio sai do uniforme) */
function geometriaDaFolha(): THREE.BufferGeometry {
  const aneis = 56;
  const lados = 96;
  const pos: number[] = [0, 0, 0];
  for (let k = 0; k < aneis; k++) {
    const r = 1e-5 ** (1 - k / (aneis - 1));
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
  /** `GLSL_RUIDO_DE_VALOR` — os caroços das pedras de verdade */
  glslRuido: string;
  rInt: number;
  rExt: number;
}

/** a faixa de raio em que as pedras podem existir (a da lajota, com folga da janela maior) */
const RAIO_MIN_KM = 55_000;
const RAIO_MAX_KM = 160_000;

/**
 * UMA FAIXA DE OITAVAS (terceira volta). O custo do quadro é o número de
 * vértices que a GPU invoca — medido: ~1,5 ns cada mesmo saindo na
 * primeira linha —, então nada de malha para todas as instâncias:
 *
 *  - os PONTOS: um vértice por pedra, todas as do ladrilho; o vértice
 *    descarta as de x < `X_CORTE` e o fragmento acerta o corpo;
 *  - as MALHAS de perto: só os ids que a CPU escolheu no quadro
 *    (`escolherDePerto`): as da janela x < `X_CORTE` (com folga) que caem
 *    no cone da lente. O vértice da malha descarta as de x ≥ `X_CORTE`
 *    pelo MESMO teste do ponto: nenhuma pedra sai nos dois, nenhuma falta.
 *
 * As malhas, pelo `detail` do icosaedro do three (1 → 42 vértices, 7 →
 * 642), cada uma até o seu x (a CPU escolhe a primeira que serve).
 */
const MALHAS: Readonly<Record<Tipo, readonly { detalhe: number; ate: number; desfaz?: true }[]>> = {
  // o aglomerado que se desfaz (x < 4) tem malha própria: uma bola de 42
  // vértices por membro. O monte inteiro pede vértices para a silhueta dos
  // membros perto (162 até x = 4,5); longe, 42 bastam
  aglomerado: [
    { detalhe: 1, ate: X_DESFAZ + 1.05, desfaz: true },
    { detalhe: 2, ate: 4.5 },
    { detalhe: 1, ate: MATERIAIS.aglomerado.corte },
  ],
  real: [
    { detalhe: 3, ate: 4.5 },
    { detalhe: 1, ate: MATERIAIS.real.corte },
  ],
};
/** a folga da escolha da CPU sobre o corte (a GPU faz a conta em float32) */
const FOLGA_DA_ESCOLHA = 1.03;
/** o id cabe abaixo disto na chave da ordem (9 oitavas × 16 384 < 2¹⁸) */
const CHAVE = 2 ** 18;
/** a folga do cone da lente na CPU, em rad (a câmera lida pode ser a do quadro anterior) */
const FOLGA_DO_CONE = 0.12;

type Tipo = keyof typeof MATERIAIS;

/** os ids de uma oitava ordenados pelo sorteio radial — estático, uma vez */
interface OrdemDaOitava {
  q: Uint16Array;
  i: Uint16Array;
  arco: Float64Array;
  z0: Float32Array;
}

function ordemDaOitava(o: number): OrdemDaOitava {
  const n = PEDRAS_POR_TIER.cinema;
  const q = new Uint16Array(n);
  const arco = new Float64Array(n);
  const z0 = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const base = misturar((i ^ (o << 24)) >>> 0);
    q[i] = misturar((base ^ 0x51ed27) >>> 0) & 0xffff;
    arco[i] = (misturar((base ^ 0x2c1b3c6d) >>> 0) >>> 8) / 16777216;
    const h2 = misturar((base ^ 0x7a3f91c5) >>> 0);
    z0[i] = ((h2 & 0xffff) + (h2 >>> 16) + 1) / 65536 - 1;
  }
  const ids = Array.from({ length: n }, (_, i) => i).sort((x, y) => q[x]! - q[y]!);
  return {
    q: Uint16Array.from(ids, (i) => q[i]!),
    i: Uint16Array.from(ids),
    arco: Float64Array.from(ids, (i) => arco[i]!),
    z0: Float32Array.from(ids, (i) => z0[i]!),
  };
}

function molde(detalhe: number): THREE.BufferGeometry {
  // os vértices SOLDADOS, para a forma por vértice não rachar a pedra
  const ico = new THREE.IcosahedronGeometry(1, detalhe);
  ico.deleteAttribute('normal');
  ico.deleteAttribute('uv');
  const m = mergeVertices(ico);
  ico.dispose();
  return m;
}

/** o primeiro índice com q ≥ alvo (busca binária) */
function primeiroComQ(q: Uint16Array, alvo: number): number {
  let lo = 0;
  let hi = q.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (q[m]! < alvo) lo = m + 1;
    else hi = m;
  }
  return lo;
}

/** o que a escolha da CPU precisa do quadro */
interface Lente {
  /** do quadro do anel girado para a câmera (er, et, ez) para a vista, linha a linha */
  m: Float64Array;
  p00: number;
  p11: number;
  /** sem câmera ainda: sem cone */
  ok: boolean;
}

class Faixa {
  readonly pontos: THREE.Points;
  readonly malhas: THREE.Mesh[];
  readonly primeira: number;
  readonly quantas: number;
  private readonly ates: number[];
  private readonly corte: number;
  private readonly ordens: OrdemDaOitava[];
  private readonly ids: THREE.InstancedBufferAttribute[];
  /** as chaves da ordem da frente para trás: log da distância e o id */
  private readonly chaves: Float64Array[];

  constructor(
    primeira: number,
    quantas: number,
    tipo: Tipo,
    material: (malha: boolean, desfaz?: boolean) => THREE.ShaderMaterial
  ) {
    this.primeira = primeira;
    this.quantas = quantas;
    this.ordens = Array.from({ length: quantas }, (_, k) => ordemDaOitava(primeira + k));
    const g = new THREE.BufferGeometry();
    // só a contagem importa: o vértice é a pedra (gl_VertexID)
    g.setAttribute('position', new THREE.BufferAttribute(new Uint8Array(quantas * PEDRAS_POR_TIER.cinema), 1));
    g.setDrawRange(0, 0);
    this.pontos = new THREE.Points(g, material(false));
    this.pontos.frustumCulled = false;
    this.pontos.visible = false;
    // a capacidade: o dobro da conta média da janela de perto, por oitava
    this.corte = MATERIAIS[tipo].corte;
    const r = (2 ** this.corte * FOLGA_DA_ESCOLHA) / K_JANELA;
    const cap = quantas * (Math.ceil(PEDRAS_POR_TIER.cinema * Math.min(1, 2 * r * r)) + 256);
    this.ates = MALHAS[tipo].map((m) => m.ate);
    // no aglomerado que se desfaz cada pedra são `BOLAS_DO_DESFAZ` instâncias
    // (as bolas): o id avança uma vez a cada `BOLAS_DO_DESFAZ`
    this.ids = MALHAS[tipo].map(({ desfaz }) => {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1, false, desfaz ? BOLAS_DO_DESFAZ : 1);
      a.setUsage(THREE.DynamicDrawUsage);
      return a;
    });
    this.chaves = MALHAS[tipo].map(() => new Float64Array(cap));
    this.malhas = MALHAS[tipo].map(({ detalhe, desfaz }, k) => {
      const m = molde(detalhe);
      const geo = new THREE.InstancedBufferGeometry();
      geo.index = m.index;
      geo.setAttribute('position', m.getAttribute('position'));
      geo.setAttribute('aId', this.ids[k]!);
      geo.instanceCount = 0;
      const malha = new THREE.Mesh(geo, material(true, desfaz));
      // o ladrilho segue a câmera: nenhuma esfera envolvente o descreve
      malha.frustumCulled = false;
      malha.visible = false;
      return malha;
    });
  }

  /** os pontos: todas as pedras das oitavas ativas desta faixa */
  acenderPontos(ativas: number, porOitava: number) {
    const n = Math.min(Math.max(ativas - this.primeira, 0), this.quantas);
    this.pontos.geometry.setDrawRange(0, n * porOitava);
    this.pontos.visible = n > 0;
  }

  /**
   * AS CANDIDATAS DE PERTO, sem avaliar todas: o sorteio radial é estático,
   * então a janela radial é um trecho contíguo da ordem (com a volta em 1);
   * nele, o arco sai das mesmas contas do vértice (`uGi`, `uGf`, `uFs`), e
   * o cone da lente (com folga) tira as de fora do quadro. Superconjunto
   * das de x < `X_CORTE` que a GPU desenharia: a distância no plano nunca
   * passa da de verdade.
   */
  escolherDePerto(
    ativas: number,
    porOitava: number,
    rhoKm: number,
    zKm: number,
    lente: Lente,
    fr: Float32Array,
    fs: Float32Array,
    gi: Float32Array,
    gf: Float32Array
  ) {
    const ns = this.ids.map(() => 0);
    const nOit = Math.min(Math.max(ativas - this.primeira, 0), this.quantas);
    const m = lente.m;
    const s00 = Math.sqrt(lente.p00 * lente.p00 + 1);
    const s11 = Math.sqrt(lente.p11 * lente.p11 + 1);
    for (let k = nOit - 1; k >= 0; k--) {
      const o = this.primeira + k;
      const t = TABELA_DE_OITAVAS[o]!;
      const raio = 2 ** this.corte * t.s * FOLGA_DA_ESCOLHA;
      const raio2 = raio * raio;
      const meiaJanela = raio / t.ladoRadial;
      const f = fr[o]!;
      const ord = this.ordens[k]!;
      const lado = t.ladoRadial;
      const ladoArco = t.ladoNoArco;
      const meia = t.meiaEspessura;
      const dobra = grampo(Math.abs(zKm) / meia - 1);
      const sinal = Math.sign(zKm);
      const rB = 1.9 * t.s;
      const lo = Math.floor((f - meiaJanela) * 65536);
      const hi = Math.ceil((f + meiaJanela) * 65536);
      // o trecho [lo, hi] em q, aberto em até dois pedaços pela volta
      const trechos: [number, number][] =
        lo < 0 ? [[lo + 65536, 65535], [0, hi]] : hi > 65535 ? [[lo, 65535], [0, hi - 65536]] : [[lo, hi]];
      for (const [a0, a1] of trechos) {
        for (let j = primeiroComQ(ord.q, a0); j < ord.q.length && ord.q[j]! <= a1; j++) {
          const i = ord.i[j]!;
          if (i >= porOitava) continue;
          const q = ord.q[j]!;
          const a = q / 65536;
          const dk = Math.floor(f - a + 0.5);
          const cis = ((gi[o]! * q) & 0xffff) / 65536 + gf[o]! * (dk + a);
          let sig = ord.arco[j]! + cis + fs[o]!;
          sig -= Math.floor(sig + 0.5);
          const dS = sig * ladoArco;
          if (Math.abs(dS) >= raio) continue;
          const dRho = (dk + a - f) * lado;
          const h2 = dRho * dRho + dS * dS;
          if (h2 >= raio2) continue;
          const z0 = ord.z0[j]!;
          const z = (1 - dobra) * z0 * meia + dobra * sinal * Math.abs(z0) * meia;
          const dz = z - zKm;
          if (lente.ok) {
            const th = dS / R0_KM;
            const x = (rhoKm + dRho) * Math.cos(th) - rhoKm;
            const y = (rhoKm + dRho) * Math.sin(th);
            const vx = m[0]! * x + m[1]! * y + m[2]! * dz;
            const vy = m[3]! * x + m[4]! * y + m[5]! * dz;
            const fz = -(m[6]! * x + m[7]! * y + m[8]! * dz);
            const folga = rB + FOLGA_DO_CONE * Math.sqrt(h2 + dz * dz);
            if (fz < -folga || Math.abs(vx) * lente.p00 - fz > folga * s00 || Math.abs(vy) * lente.p11 - fz > folga * s11) {
              continue;
            }
          }
          const logD = 0.5 * Math.log2(h2 + dz * dz);
          const xo = logD - Math.log2(t.s);
          let qual = 0;
          while (qual < this.ates.length - 1 && xo >= this.ates[qual]!) qual++;
          const ch = this.chaves[qual]!;
          if (ns[qual]! < ch.length) ch[ns[qual]!++] = Math.floor((logD + 40) * 256) * CHAVE + k * porOitava + i;
        }
      }
    }
    // DA FRENTE PARA TRÁS: o teste de profundidade poupa o fragmento das
    // que ficam atrás (a borda roída descarta, e o descarte desliga a
    // remoção de superfícies escondidas da GPU)
    this.malhas.forEach((malha, k) => {
      const n = ns[k]!;
      const ch = this.chaves[k]!.subarray(0, n).sort();
      const v = this.ids[k]!.array as Float32Array;
      for (let j = 0; j < n; j++) v[j] = ch[j]! % CHAVE;
      (malha.geometry as THREE.InstancedBufferGeometry).instanceCount = n * this.ids[k]!.meshPerAttribute;
      malha.visible = n > 0;
      if (n > 0) {
        const a = this.ids[k]!;
        a.clearUpdateRanges();
        a.addUpdateRange(0, n);
        a.needsUpdate = true;
      }
    });
  }

  dispose() {
    for (const m of [this.pontos, ...this.malhas]) {
      m.geometry.dispose();
      (m.material as THREE.ShaderMaterial).dispose();
    }
  }
}

export class PedrasDoAnel {
  /** o grupo das faixas — a matriz do anel mora nele */
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
  /** a folha do grão do disco (`O GRÃO DO DISCO` no texto acima) */
  private readonly folha: THREE.Mesh;
  private readonly graoCam = Array.from({ length: GRAO_OITAVAS }, () => new THREE.Vector2());
  /** a última câmera que desenhou as pedras — a escolha de perto lê o cone dela */
  private camera: THREE.Camera | null = null;
  private readonly lente: Lente = { m: new Float64Array(9), p00: 1, p11: 1, ok: false };
  private readonly m4 = new THREE.Matrix4();
  private readonly tela = new THREE.Vector4();

  constructor(opcoes: OpcoesDasPedras) {
    const constantes = `${opcoes.glslConstantesDoAnel}
${opcoes.glslRegiaoDoAnel}
${opcoes.glslCamadaDoAnel}
const float R_INT = ${opcoes.rInt};
const float R_EXT = ${opcoes.rExt};`;
    const vertice = (v: string) =>
      v
        .replace('CONSTANTES_DO_ANEL', constantes)
        .replace('SOMBRA_DO_PLANETA', opcoes.glslSombraDoPlaneta)
        .replace('RUIDO', opcoes.glslRuido);
    const fragmento = (f: string) =>
      f.replace('CAMADA_DO_ANEL', opcoes.glslCamadaDoAnel).replace('RUIDO', opcoes.glslRuido);

    // UM objeto de uniformes, dividido por todas as malhas
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
      uAtivas: { value: 0 },
      uPxPorRad: { value: 400 },
      uTela: { value: this.tela },
      uFr: { value: this.fr },
      uFs: { value: this.fs },
      uGi: { value: this.gi },
      uGf: { value: this.gf },
      uGiro: { value: 0 },
      uForcaGrao: { value: 0 },
      uRaioFolha: { value: 40 },
      uGraoCam: { value: this.graoCam },
    };
    const material = (primeira: number, quantas: number, tipo: Tipo) => (malha: boolean, desfaz?: boolean) => {
      const m = MATERIAIS[tipo];
      return new THREE.ShaderMaterial({
        vertexShader: vertice(malha ? VERT_DA_MALHA : VERT_DO_PONTO),
        fragmentShader: fragmento(malha ? FRAG_DA_MALHA : FRAG_DO_PONTO),
        defines: {
          OITAVA_BASE: primeira,
          QUANTAS: quantas,
          X_CORTE: glslF(m.corte),
          ...(malha ? { MALHA: 1 } : {}),
          ...(desfaz ? { DESFAZ: 1 } : {}),
        },
        uniforms: this.uniforms,
        transparent: false,
        depthWrite: true,
        depthTest: true,
      });
    };
    this.faixas = [
      new Faixa(0, PRIMEIRA_OITAVA_REAL, 'aglomerado', material(0, PRIMEIRA_OITAVA_REAL, 'aglomerado')),
      new Faixa(
        PRIMEIRA_OITAVA_REAL,
        OITAVAS - PRIMEIRA_OITAVA_REAL,
        'real',
        material(PRIMEIRA_OITAVA_REAL, OITAVAS - PRIMEIRA_OITAVA_REAL, 'real')
      ),
    ];
    // DA FRENTE PARA TRÁS: as malhas de perto, das finas para as grossas;
    // os pontos (que descartam) por último, depois das que a GPU sabe esconder
    const [aglo, reais] = this.faixas as [Faixa, Faixa];
    const ordem: THREE.Object3D[] = [...reais.malhas, ...aglo.malhas.slice(1), aglo.malhas[0]!, reais.pontos, aglo.pontos];
    ordem.forEach((m, k) => {
      m.renderOrder = k - ordem.length;
      // o raio na tela (px por radiano) e a janela sai do alvo em que o
      // quadro é desenhado; a câmera fica para a escolha do próximo quadro
      m.onBeforeRender = (renderer, _cena, camera) => {
        renderer.getCurrentViewport(this.tela);
        this.uniforms.uPxPorRad!.value = 0.5 * this.tela.w * camera.projectionMatrix.elements[5]!;
        this.camera = camera;
      };
      this.malha.add(m);
    });
    this.folha = new THREE.Mesh(
      geometriaDaFolha(),
      new THREE.ShaderMaterial({
        vertexShader: vertice(VERT_DA_FOLHA),
        fragmentShader: FRAG_DA_FOLHA,
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        // o grão MULTIPLICA o que o disco já pôs no quadro: 2·cor·destino
        // (o fator 2 deixa a cor da folha abaixo de 1 em qualquer alvo)
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.DstColorFactor,
        blendDst: THREE.SrcColorFactor,
        blendSrcAlpha: THREE.ZeroFactor,
        blendDstAlpha: THREE.OneFactor,
        side: THREE.DoubleSide,
      })
    );
    // DEPOIS do disco (é a luz dele que o grão modula)
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

  /** o cone da lente no quadro do anel girado para a câmera (er, et, ez) */
  private lerLente(theta: number) {
    const cam = this.camera;
    this.lente.ok = cam !== null;
    if (!cam) return;
    const e = this.m4.multiplyMatrices(cam.matrixWorldInverse, this.malha.matrixWorld).elements;
    const esc = Math.hypot(e[0]!, e[1]!, e[2]!) || 1;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    // as colunas da vista para er = (c, s, 0), et = (−s, c, 0), ez
    for (let lin = 0; lin < 3; lin++) {
      const x = e[lin]! / esc;
      const y = e[4 + lin]! / esc;
      const z = e[8 + lin]! / esc;
      this.lente.m[lin * 3] = x * c + y * s;
      this.lente.m[lin * 3 + 1] = -x * s + y * c;
      this.lente.m[lin * 3 + 2] = z;
    }
    this.lente.p00 = cam.projectionMatrix.elements[0]!;
    this.lente.p11 = cam.projectionMatrix.elements[5]!;
  }

  atualizar(q: QuadroDasPedras) {
    const c = q.camLocal;
    const rhoKm = Math.hypot(c.x, c.y) * KM_POR_RAIO;
    const zKm = c.z * KM_POR_RAIO;
    const noAnel = rhoKm > RAIO_MIN_KM && rhoKm < RAIO_MAX_KM;
    const ativas = noAnel ? PedrasDoAnel.oitavasAtivas(zKm) : 0;
    const forca = noAnel ? forcaDoGrao(zKm) : 0;
    this.malha.visible = ativas > 0 || forca > 0;
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
    this.lerLente(theta);
    for (const f of this.faixas) {
      f.acenderPontos(ativas, porOitava);
      f.escolherDePerto(ativas, porOitava, rhoKm, zKm, this.lente, this.fr, this.fs, this.gi, this.gf);
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
    u.uAtivas!.value = ativas;
    u.uGiro!.value = this.giro;
    this.cessao.set(rhoKm, theta, zKm, ativas > 0 ? (porOitava / PEDRAS_POR_TIER.cinema) * parcelaDasPedras(zKm) : 0);
    u.uForcaGrao!.value = forca;
    u.uRaioFolha!.value = raioDaFolhaKm(zKm);
    this.folha.visible = forca > 0;
    this.graoCam.forEach((v, k) => {
      const periodo = GRAO_BASE_KM * 2 ** k * GRAO_PERIODO;
      const m = (x: number) => x - periodo * Math.floor(x / periodo);
      v.set(m(rhoKm), m(R0_KM * theta));
    });
  }

  dispose() {
    for (const f of this.faixas) f.dispose();
    this.folha.geometry.dispose();
    (this.folha.material as THREE.ShaderMaterial).dispose();
  }
}
