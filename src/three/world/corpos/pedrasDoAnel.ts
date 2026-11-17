// ============================================================
// AS PEDRAS DO ANEL EM 3D (14/11, o padrão; `?pedras=0` volta à lajota) — de perto, o anel de
// Saturno se desfaz nos pedaços de gelo que ele é, e o disco liso cede a
// luz que eles passam a carregar.
//
// A REGRA (sétima volta, do dono): o app só mostra o que existe. Cada
// número abaixo vem de medida e cita a fonte; o que ninguém mediu (o lugar
// e a forma de cada pedaço) é SORTEADO com as estatísticas medidas e está
// confessado no cadastro de escala (`src/three/escala.ts`, id
// `pedras-do-anel-de-saturno`). NADA NO MUNDO DEPENDE DA CÂMERA: o pedaço
// de id i tem o mesmo lugar, tamanho e forma de onde quer que se olhe — a
// câmera só ESCOLHE quais pedaços desenhar.
//
// O DE ANTES FICA AO LADO: com `?pedras=0` a casa monta a lajota
// volumétrica de antes (`lajotaDoAnel.ts`) e o `ANEL_FRAG` sai byte a byte
// o de antes.
//
// O DESENHO:
//
//  1. OS TAMANHOS MEDIDOS. Raio de 0,5 cm a 10 m, n(a) ∝ a⁻³ (Zebker et al.
//     1985; Cuzzi et al. 2009; Harbison et al. 2013), em `OITAVAS` oitavas de
//     diâmetro (10–20 m a 2–4 cm). Cada oitava carrega ln2/ln(a_max/a_min)
//     da profundidade óptica (`FRACAO_POR_OITAVA`); abaixo de 2 cm (~9 %)
//     nada se resolve. A conta da densidade é `pedacosPorArea`.
//
//  2. O LADRILHO EM VOLTA DA CÂMERA (só a escolha). Cada oitava é um
//     ladrilho periódico POLAR — raio ρ e arco s = R0·θ, o período no arco
//     divide a volta — de `PEDRAS_POR_TIER` pedaços e lado 2·K·s. Tudo o que
//     a GPU soma é relativo à câmera (a fração dela no ladrilho sai da CPU
//     em dupla precisão): o pedaço de 2 cm a 1 m da lente não treme. Na
//     borda da janela (K = 512 tamanhos, ~1–2 px de raio) o pedaço entra como
//     PONTO com a opacidade subindo de 0 a 1 numa oitava; ele é sempre do
//     tamanho verdadeiro. A janela passa do ladrilho: além dele, as imagens
//     vizinhas do mesmo ladrilho (`IMAGENS`).
//
//  3. A CAMADA E AS ESTEIRAS. A espessura total é a medida em cada região
//     (`ANEL_DE_SATURNO.regioes`, descricaoDoAnel.ts); nos anéis A e B os pedaços se juntam nas
//     esteiras de autogravidade (`densidadeDaEsteira`).
//
//  4. O MOVIMENTO. O cisalhamento de Kepler no relógio do app, medido no
//     raio da câmera (relógio parado, pedra parada), e o giro próprio pela
//     agitação, que não é medida (equipartição, `V_AGITACAO_KM_S`).
//
//  5. A LUZ SE CONSERVA. O disco cede, em cada ponto, a fração de τ das
//     oitavas resolvidas ali (`cessaoDoDisco`); de dentro da camada o disco
//     vira a névoa dos pedaços não resolvidos (`tauDaNevoa`).
//
// O FRAME é o do anel (o mesmo da lajota): plano XY, +Z o polo, unidade =
// raio equatorial; a matriz vem copiada do mesh do anel. O sentido orbital
// é +θ (o cisalhamento do código: as de dentro ultrapassam para +s).
// ============================================================
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { QualityLevel } from '../../core/engine';
import { ANEL_DE_SATURNO, regiaoDoAnelCpu } from './descricaoDoAnel';

/**
 * O interruptor — as pedras 3D são o padrão desde que o dono as aprovou
 * pela prancha (`capturas/aneis-de-perto-14-11/`). `?pedras=0` devolve a
 * lajota e o disco de antes, byte a byte; `?pedras=3d` segue aceito. Fora
 * do navegador (testes em Node, sem `window`) vale o padrão: as pedras.
 */
export const PEDRAS_3D: boolean =
  typeof window === 'undefined' ||
  new URLSearchParams(window.location.search).get('pedras') !== '0';

const KM_POR_RAIO = ANEL_DE_SATURNO.raioEquatorialKm;

/** GM de Saturno (`ANEL_DE_SATURNO.gmKm3s2`) — só para Ω(ρ) do cisalhamento. */
const GM_SATURNO = ANEL_DE_SATURNO.gmKm3s2;

/** O RAIO DE REFERÊNCIA DO ARCO: s = R0·θ, logo além da borda do A (136 775 km). */
export const R0_KM = 138_600;

/** OS TAMANHOS medidos (`ANEL_DE_SATURNO.pedacos`): o raio vai de `A_MIN_KM` = 0,5 cm a `A_MAX_KM` = 10 m, n(a) ∝ a⁻³ */
const A_MIN_KM = ANEL_DE_SATURNO.pedacos.raioMinKm;
const A_MAX_KM = ANEL_DE_SATURNO.pedacos.raioMaxKm;
const LN_FAIXA = Math.log(A_MAX_KM / A_MIN_KM);
/** quantas oitavas de diâmetro se desenham: 10–20 m até 1,95–3,9 cm */
export const OITAVAS = 10;
/** o DIÂMETRO mínimo da oitava 0 (10 m); cada oitava sorteia o diâmetro de s a 2s */
export const S_MAX_KM = A_MAX_KM;
/** a parte de τ que cada oitava carrega (a lei a⁻³ dá a mesma a cada uma) */
export const FRACAO_POR_OITAVA = Math.LN2 / LN_FAIXA;
/** a parte de τ abaixo da menor oitava (raio < 0,98 cm), que nunca se resolve: ~9 % */
export const FRACAO_NAO_RESOLVIDA = Math.log(S_MAX_KM / 2 ** OITAVAS / A_MIN_KM) / LN_FAIXA;

/**
 * QUANTOS PEDAÇOS POR km² têm raio em [a, 2a), onde o perfil medido dá a
 * profundidade óptica τ: com n(a) = C·a⁻³ entre a_min e a_max, τ = ∫πa²n da
 * = π·C·ln(a_max/a_min), e a contagem da oitava é 3τ / (8π·ln(a_max/a_min)·a²).
 */
export function pedacosPorArea(tau: number, aKm: number): number {
  return (3 * tau) / (8 * Math.PI * LN_FAIXA * aKm * aKm);
}

/**
 * A JANELA, em oitavas de distância (x = log2(d/s)): o pedaço entra em
 * x = 9 (d = 512·s, onde o raio equivalente dele mede ~0,9–1,8 px na lente
 * de 58° em 800 px: nasce como grão) com opacidade 0 e fica opaco uma oitava
 * dentro, em x = 8. Ele não muda de tamanho, e não sai mais de perto. (O
 * alvo era 9,5, ~1 px; o custo dos vértices não coube — volta r20.)
 */
export const X_ENTRA = 9;
export const X_PLENO = 8;
export const K_JANELA = 2 ** X_ENTRA;
/**
 * O LADRILHO (meio lado, em tamanhos): o mundo de cada oitava é periódico,
 * de lado 2·K_LADRILHO·s. Era a janela de antes (x = 8); a janela maior não
 * muda o mundo — desenha mais imagens do MESMO ladrilho (`IMAGENS`).
 */
export const K_LADRILHO = 256;
/**
 * AS IMAGENS DO LADRILHO que a janela alcança (radial, arco), a da câmera
 * primeiro: o raio da janela (512·s) passa do meio lado (256·s) mas fica
 * aquém de 1,5 lado (768·s), então as oito vizinhas bastam.
 */
export const IMAGENS: readonly (readonly [number, number])[] = [
  [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * QUANTOS PEDAÇOS POR OITAVA, por tier. O tier de baixo é um PREFIXO do de
 * cima (o pedaço (oitava, i) tem o mesmo sorteio em qualquer tier): menos
 * pedaços é um campo mais ralo, e o resto fica no disco.
 */
export const PEDRAS_POR_TIER: Readonly<Record<QualityLevel, number>> = {
  cinema: 16384,
  alta: 8192,
  performance: 3072,
};

/** os ids de cada oitava em células de `CELULA` (ver `celulasDaOitava`) */
export const CELULA = 32;
const CELULAS = PEDRAS_POR_TIER.cinema / CELULA;
/** células por faixa radial (as de uma faixa dividem o arco) */
const CELULAS_POR_FAIXA = 8;
const FAIXAS = CELULAS / CELULAS_POR_FAIXA;
/** a folga das contas da GPU em float32, em frações do ladrilho */
const FOLGA_DO_FLOAT = 1e-5;

/**
 * A ÁREA MÉDIA DO CORPO desenhado, em unidades do disco de raio 1 (Monte
 * Carlo sobre orientações, terceira volta; os tipos são acertados a ela por
 * `ESCALA_DO_BLOCO` e `ESCALA_DO_MONTE`). O raio `a` de cada pedaço é o da
 * esfera de MESMA seção média: o corpo é desenhado com raio a/√0,61 — o
 * eixo maior passa de a, a sombra que ele faz no céu é a de πa².
 */
const AREA_MEDIA_DO_CORPO = 0.61;
const ESCALA_EQUIVALENTE = 1 / Math.sqrt(AREA_MEDIA_DO_CORPO);

/**
 * A PROFUNDIDADE ÓPTICA QUE O CAMPO CHEIO CARREGA (tier cinema, em R0): M
 * pedaços por ladrilho de (2K·s)², seção média π·(2ln2/3)·s² na lei a⁻³ de
 * raio em [s/2, s), dá FRACAO_POR_OITAVA·τ por oitava até τ = M·π·ln(a_max/
 * a_min)/(6K²) ≈ 1. Onde o perfil pede mais (o B), o campo satura e o resto
 * fica no disco: é o TETO declarado.
 */
export const TAU_TETO = (PEDRAS_POR_TIER.cinema * Math.PI * LN_FAIXA) / (6 * K_LADRILHO * K_LADRILHO);

export interface Oitava {
  /** diâmetro mínimo, km */
  s: number;
  /** raio da janela, km (= K·s) */
  janela: number;
  /** lado radial do ladrilho, km (= 2·K_LADRILHO·s) */
  ladoRadial: number;
  /** lado do ladrilho no arco, km — divide 2π·R0 exato */
  ladoNoArco: number;
  /** quantos ladrilhos fecham a volta */
  voltas: number;
}

export const TABELA_DE_OITAVAS: readonly Oitava[] = Array.from({ length: OITAVAS }, (_, o) => {
  const s = S_MAX_KM / 2 ** o;
  const janela = K_JANELA * s;
  const ladoRadial = 2 * K_LADRILHO * s;
  const voltas = Math.round((2 * Math.PI * R0_KM) / ladoRadial);
  return { s, janela, ladoRadial, ladoNoArco: (2 * Math.PI * R0_KM) / voltas, voltas };
});

const grampo = (x: number) => Math.min(1, Math.max(0, x));
const suave = (a: number, b: number, x: number) => {
  const t = grampo((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * A PRESENÇA (a opacidade) da oitava `o` a `dKm` da câmera, na régua do
 * ladrilho: 0 na borda da janela (x = 8), 1 de x = 7,5 para perto. É a
 * mesma conta do vértice.
 */
export function presencaDaOitava(o: number, dKm: number): number {
  const x = Math.log2(Math.max(dKm, 1e-12) / TABELA_DE_OITAVAS[o]!.s);
  return grampo((X_ENTRA - x) / (X_ENTRA - X_PLENO));
}

/**
 * QUANTO DE τ OS PEDAÇOS RESOLVIDOS CARREGAM a `dKm` da câmera: a parte de
 * cada oitava pela presença dela. 0 longe; no máximo 1 − `FRACAO_NAO_RESOLVIDA`.
 */
export function cessaoDoDisco(dKm: number): number {
  let f = 0;
  for (let o = 0; o < OITAVAS; o++) f += presencaDaOitava(o, dKm);
  return f * FRACAO_POR_OITAVA;
}

/**
 * O ALFA DO DISCO DEPOIS DA CESSÃO — conserva a TRANSMISSÃO: o disco fica
 * com τ·(1 − F), e é o resto que os pedaços carregam. F = 0 devolve o alfa
 * de hoje, exato.
 */
export function alfaCedido(alfa: number, f: number): number {
  if (f <= 0) return alfa;
  return 1 - Math.max(1 - alfa, 1e-4) ** (1 - Math.min(f, 1));
}

/**
 * A PASSAGEM DISCO → NÉVOA (`pesoDaNevoa`, de 8 a 32 m do plano) reparte a
 * PROFUNDIDADE ÓPTICA: o disco fica com (1 − peso) da dele e a névoa com
 * peso·τ, e as transmissões se multiplicam — com os dois opacos o raio
 * segue opaco. O gêmeo do fim de `cederAsPedras` no GLSL.
 */
export function alfaComANevoa(alfa: number, peso: number): number {
  if (peso <= 0) return alfa;
  return 1 - Math.max(1 - alfa, 1e-4) ** (1 - Math.min(peso, 1));
}

/**
 * O ACEITE DA DENSIDADE: o pedaço fica se o sorteio cair abaixo de
 * τ·ρ/(R0·TAU_TETO). O ρ/R0 devolve o encolhimento do ladrilho no arco;
 * τ = 0 (divisão vazia, fora do anel) não aceita pedaço nenhum.
 */
export function aceitaPedra(tau: number, rhoKm: number, sorteio: number): boolean {
  return sorteio * TAU_TETO * R0_KM < tau * rhoKm;
}

/**
 * A ALTURA DO CENTRO do pedaço de raio `aKm` na camada de espessura `hKm`,
 * pelo sorteio z0 ∈ [−1, 1] (triangular, mais denso no plano): o centro fica
 * dentro da camada, e o pedaço maior que ela fica centrado no plano.
 */
export function alturaNaCamada(z0: number, aKm: number, hKm: number): number {
  return z0 * 0.5 * hKm * grampo(1 - (2 * aKm) / hKm);
}

/**
 * AS ESTEIRAS DE AUTOGRAVIDADE (self-gravity wakes), só nos anéis A e B —
 * nunca fotografadas: vêm de ocultações (Colwell et al. 2006, 2007; Hedman
 * et al. 2007) e das simulações de N corpos (Salo et al. 2004; Michikoshi
 * et al. 2015). Espaçamento `LAMBDA_DA_ESTEIRA_KM` ~60 m; ARRASTADAS
 * (trailing: quem está mais para fora fica para trás no sentido orbital,
 * +s), inclinadas ~21° da direção orbital (18–24° no A, 18–26° no B
 * medidos); filamentos irregulares e grumosos de poucas vezes o
 * espaçamento, com vãos quase vazios entre eles; razão altura/largura
 * 0,1–0,37 — da ordem da própria camada, e por isso a esteira não ganha
 * altura própria aqui.
 *
 * A CONSTRUÇÃO: um campo complexo Z = A·e^{iψ} — a portadora de
 * comprimento λ ao longo da normal n sob um envelope A, ruído complexo
 * filtrado (o espectro gaussiano de um núcleo alongado nas cristas,
 * `ENVELOPE_XI_KM` × `ENVELOPE_ETA_KM`). Dele sai o deslocamento ao longo de
 * n, δ = (λ/π)·arg 1/(1 − w), w = γ·Z·|Z|/(|Z|² + E0) (a forma da onda em
 * `GAMA_DA_ESTEIRA`): uma onda de fase e amplitude que vagueiam (os
 * filamentos se formam, se fundem e se desfazem; onde |Z| é pequeno o campo
 * acalma). A densidade é 1/(1 + ∂δ/∂n) com a derivada analítica — média 1
 * (a massa só anda), e o mapa é inversível porque ∂δ/∂n > −1 (o teste
 * cobra).
 *
 * O CAMPO MORA NUM LADRILHO PERIÓDICO (`campoDaEsteira`), feito aqui uma vez:
 * (δ, ∂δ/∂n) em `TEXELS_DA_ESTEIRA`² texels de `TEXEL_DA_ESTEIRA_KM`, lidos
 * pela mesma leitura bilinear na CPU, no vértice dos pedaços e na folha do
 * disco — uma fonte só, e o lugar de cada pedaço é o mesmo nos três. O
 * ladrilho fica nas coordenadas do anel: ρ e o arco s·ρref/R0, com ρref o
 * raio de referência de cada anel (`VOLTAS_DA_ESTEIRA`: um número inteiro de
 * ladrilhos por volta, então o campo fecha na volta). Num ρ longe de ρref o
 * arco do ladrilho estica (±12 % no B): o espaçamento e o ângulo andam pouco.
 */
/** o lado do ladrilho (km) e os texels por lado */
const LADO_DA_ESTEIRA_KM = 8.192;
const TEXELS_DA_ESTEIRA = 2048;
export const TEXEL_DA_ESTEIRA_KM = LADO_DA_ESTEIRA_KM / TEXELS_DA_ESTEIRA;
/** a portadora numa frequência inteira do ladrilho: (128, 49) ondas por lado, ~60 m a 20,9° */
const ONDAS_DA_ESTEIRA = [128, 49] as const;
const ONDAS_NA_NORMAL = Math.hypot(ONDAS_DA_ESTEIRA[0], ONDAS_DA_ESTEIRA[1]);
export const LAMBDA_DA_ESTEIRA_KM = LADO_DA_ESTEIRA_KM / ONDAS_NA_NORMAL;
/** a normal das cristas no ladrilho, (radial, arco) */
const NORMAL_DA_ESTEIRA = [ONDAS_DA_ESTEIRA[0] / ONDAS_NA_NORMAL, ONDAS_DA_ESTEIRA[1] / ONDAS_NA_NORMAL] as const;
/** os ladrilhos por volta no B e no A (ρref ≈ 105 000 e 129 000 km); a troca fica na divisão de Cassini, onde não há esteira */
const VOLTAS_DA_ESTEIRA = [
  Math.round((2 * Math.PI * 105_000) / LADO_DA_ESTEIRA_KM),
  Math.round((2 * Math.PI * 129_000) / LADO_DA_ESTEIRA_KM),
] as const;
const TROCA_DA_ESTEIRA_KM = 119_000;
/** km do ladrilho por km de s = R0·θ (ρref/R0), no B e no A */
const ARCO_DA_ESTEIRA = VOLTAS_DA_ESTEIRA.map((n) => (n * LADO_DA_ESTEIRA_KM) / (2 * Math.PI * R0_KM));
/** os meio-eixos do núcleo (km): cruzando e ao longo das cristas */
const ENVELOPE_XI_KM = 0.12;
const ENVELOPE_ETA_KM = 0.15;
/** o |Z|² médio, e o piso E0 da amplitude: abaixo dele o campo acalma */
const Z2_MEDIO = 0.75;
const PISO_DA_AMPLITUDE = 0.3;
/**
 * A FORMA DA ONDA: o mapa do círculo de Möbius, Φ → Φ + 2·arg 1/(1 − γ·e^{iΦ})
 * — o estiramento ao longo de n vai de β = (1 + γ)/(1 − γ) num trecho
 * estreito (o vão, densidade 1/β) a 1/β em quase toda a volta (a esteira
 * larga e densa) e nunca chega a zero: pico:vale até β² onde a onda está
 * cheia. Aqui γ = `GAMA_DA_ESTEIRA`·|Z|²/(|Z|² + E0): zero onde |Z| se anula
 * (o deslocamento fica liso nos nós da fase, e o mapa não dobra).
 */
const GAMA_DA_ESTEIRA = 0.66;
/** a maior força das esteiras (a do B) */
const FORCA_MAXIMA_DA_ESTEIRA = Math.max(...ANEL_DE_SATURNO.regioes.map((r) => r.esteira));
/** o deslocamento máximo de um pedaço pela esteira, km (|arg 1/(1 − w)| ≤ asen γ) */
const DESLOCAMENTO_MAXIMO_KM =
  (FORCA_MAXIMA_DA_ESTEIRA * 2 * Math.asin(GAMA_DA_ESTEIRA) * LAMBDA_DA_ESTEIRA_KM) / (2 * Math.PI) + 0.0005;

/** o sorteio inteiro do vértice (`misturar` no GLSL), bit a bit */
function misturar(x: number): number {
  x = (x ^ (x >>> 16)) >>> 0;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/**
 * O ASSADO EM FATIAS: as contas pesadas (o ladrilho das esteiras, o grão,
 * as formas) são geradores que cedem a vez a cada trecho de poucos ms; a
 * versão de uma vez só esgota o mesmo gerador — os mesmos números, bit a
 * bit, em qualquer dos dois caminhos.
 */
type Passos<T> = Generator<void, T, void>;
function drenar<T>(g: Passos<T>): T {
  for (;;) {
    const r = g.next();
    if (r.done) return r.value;
  }
}

/** a FFT complexa inversa (sinal +), no lugar, de `n` números em re/im[off + k·passo] */
function fftInversa(re: Float64Array, im: Float64Array, off: number, passo: number, n: number) {
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const a = off + i * passo;
      const b = off + j * passo;
      const tr = re[a]!;
      const ti = im[a]!;
      re[a] = re[b]!;
      im[a] = im[b]!;
      re[b] = tr;
      im[b] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const wr = Math.cos((2 * Math.PI) / len);
    const wi = Math.sin((2 * Math.PI) / len);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const a = off + (i + j) * passo;
        const b = a + (len / 2) * passo;
        const xr = re[b]! * cr - im[b]! * ci;
        const xi = re[b]! * ci + im[b]! * cr;
        re[b] = re[a]! - xr;
        im[b] = im[a]! - xi;
        re[a] = re[a]! + xr;
        im[a] = im[a]! + xi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

/**
 * O LADRILHO DAS ESTEIRAS, uma vez: (δ/λ, ∂δ/∂n) em meia precisão, RG. O
 * envelope A e ∂A/∂n saem de uma FFT de `M`² (o espectro do núcleo em volta
 * de zero, ruído complexo sorteado por `misturar`), lidos em bilinear no
 * texel (o envelope tem 6+ amostras na menor onda); a portadora, exata.
 */
let campo: Uint16Array | null = null;
function campoDaEsteira(): Uint16Array {
  return campo ?? drenar(campoDaEsteiraEmPassos());
}
function* campoDaEsteiraEmPassos(): Passos<Uint16Array> {
  if (campo) return campo;
  const N = TEXELS_DA_ESTEIRA;
  const M = 512;
  const L = LADO_DA_ESTEIRA_KM;
  const [nx, ny] = NORMAL_DA_ESTEIRA;
  const sXi = ENVELOPE_XI_KM / Math.sqrt(6);
  const sEta = ENVELOPE_ETA_KM / Math.sqrt(6);
  const ar = new Float64Array(M * M);
  const ai = new Float64Array(M * M);
  const br = new Float64Array(M * M);
  const bi = new Float64Array(M * M);
  for (let b = 0; b < M; b++) {
    for (let a = 0; a < M; a++) {
      const fa = (a < M / 2 ? a : a - M) / L;
      const fb = (b < M / 2 ? b : b - M) / L;
      const fn = fa * nx + fb * ny;
      const ft = fb * nx - fa * ny;
      const h = Math.exp(-2 * Math.PI * Math.PI * (sXi * sXi * fn * fn + sEta * sEta * ft * ft));
      if (h < 1e-6) continue;
      const s1 = misturar((Math.imul(a, 0x8da6b343) ^ misturar((b + 0x68e31da4) >>> 0)) >>> 0);
      const s2 = misturar((s1 ^ 0x9e3779b9) >>> 0);
      const r = Math.sqrt(-2 * Math.log(((s1 >>> 8) + 1) / 16777217)) * h;
      const fase = (2 * Math.PI * (s2 >>> 8)) / 16777216;
      const k = b * M + a;
      ar[k] = r * Math.cos(fase);
      ai[k] = r * Math.sin(fase);
      // ∂/∂n: × 2πi·fn
      br[k] = -2 * Math.PI * fn * ai[k]!;
      bi[k] = 2 * Math.PI * fn * ar[k]!;
    }
    if ((b & 63) === 63) yield;
  }
  for (const [re, im] of [[ar, ai], [br, bi]] as const) {
    for (let y = 0; y < M; y++) {
      fftInversa(re, im, y * M, 1, M);
      if ((y & 63) === 63) yield;
    }
    for (let x = 0; x < M; x++) {
      fftInversa(re, im, x, M, M);
      if ((x & 63) === 63) yield;
    }
  }
  let soma = 0;
  for (let k = 0; k < M * M; k++) soma += ar[k]! * ar[k]! + ai[k]! * ai[k]!;
  const esc = Math.sqrt((Z2_MEDIO * M * M) / soma);
  const kOnda = (2 * Math.PI) / LAMBDA_DA_ESTEIRA_KM;
  // a portadora, separável: e^{2πi(m·i + p·j)/N}
  const pr = new Float64Array(2 * N);
  const pi = new Float64Array(2 * N);
  for (let i = 0; i < N; i++) {
    for (let e = 0; e < 2; e++) {
      const ang = (2 * Math.PI * ONDAS_DA_ESTEIRA[e]! * i) / N;
      pr[e * N + i] = Math.cos(ang);
      pi[e * N + i] = Math.sin(ang);
    }
  }
  const dado = new Uint16Array(N * N * 2);
  const passo = N / M;
  for (let j = 0; j < N; j++) {
    const y0 = Math.floor(j / passo);
    const fy = j / passo - y0;
    const y1 = (y0 + 1) % M;
    for (let i = 0; i < N; i++) {
      const x0 = Math.floor(i / passo);
      const fx = i / passo - x0;
      const x1 = (x0 + 1) % M;
      const k00 = y0 * M + x0;
      const k10 = y0 * M + x1;
      const k01 = y1 * M + x0;
      const k11 = y1 * M + x1;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;
      const lin = (v: Float64Array) => esc * (v[k00]! * w00 + v[k10]! * w10 + v[k01]! * w01 + v[k11]! * w11);
      const Ar = lin(ar);
      const Ai = lin(ai);
      const Br = lin(br) - kOnda * Ai;
      const Bi = lin(bi) + kOnda * Ar;
      const cr = pr[i]! * pr[N + j]! - pi[i]! * pi[N + j]!;
      const ci = pr[i]! * pi[N + j]! + pi[i]! * pr[N + j]!;
      // Z e a derivada dele ao longo de n (dc, ds)
      const zc = Ar * cr - Ai * ci;
      const zs = Ar * ci + Ai * cr;
      const dc = Br * cr - Bi * ci;
      const ds = Br * ci + Bi * cr;
      // w = γ·Z·|Z|/(|Z|² + E0) e a derivada dela ao longo de n; δ = (2/k)·arg 1/(1 − w)
      const z2 = zc * zc + zs * zs;
      const A = z2 + PISO_DA_AMPLITUDE;
      const r = Math.max(Math.sqrt(z2), 1e-9);
      const dr = (zc * dc + zs * ds) / r;
      const g = GAMA_DA_ESTEIRA / A;
      const f = dr / r - (2 * r * dr) / A;
      const wr = g * r * zc;
      const wi = g * r * zs;
      const dwr = g * r * (dc + zc * f);
      const dwi = g * r * (ds + zs * f);
      const um = 1 - wr;
      const o = 2 * (j * N + i);
      dado[o] = THREE.DataUtils.toHalfFloat(((2 / kOnda) * Math.atan2(wi, um)) / LAMBDA_DA_ESTEIRA_KM);
      dado[o + 1] = THREE.DataUtils.toHalfFloat(((2 / kOnda) * (dwi * um + dwr * wi)) / (um * um + wi * wi));
    }
    if ((j & 15) === 15) yield;
  }
  campo ??= dado;
  return campo;
}

/** a textura do ladrilho (a GPU lê os mesmos números da CPU) */
function texturaDaEsteira(): THREE.DataTexture {
  const N = TEXELS_DA_ESTEIRA;
  const tex = new THREE.DataTexture(campoDaEsteira(), N, N, THREE.RGFormat, THREE.HalfFloatType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/** o ponto (ρ, s = R0·θ) no ladrilho, em ladrilhos (radial, arco) */
function noLadrilho(rhoKm: number, sKm: number): [number, number] {
  const anel = rhoKm < TROCA_DA_ESTEIRA_KM ? 0 : 1;
  return [rhoKm / LADO_DA_ESTEIRA_KM, (sKm * ARCO_DA_ESTEIRA[anel]!) / LADO_DA_ESTEIRA_KM];
}

/**
 * (δ km, ∂δ/∂n) no ponto do ladrilho (em ladrilhos), sem a força: a leitura
 * bilinear dos texels — o gêmeo de `deslocamentoNoLadrilho` no GLSL (que só
 * lê o δ, com `texelFetch`)
 */
function lerLadrilho(u: number, v: number): [number, number] {
  const N = TEXELS_DA_ESTEIRA;
  const dado = campoDaEsteira();
  const px = (u - Math.floor(u)) * N - 0.5;
  const py = (v - Math.floor(v)) * N - 0.5;
  const i0 = Math.floor(px);
  const j0 = Math.floor(py);
  const fx = px - i0;
  const fy = py - j0;
  const i1 = (i0 + 1 + N) % N;
  const j1 = (j0 + 1 + N) % N;
  const ia = (i0 + N) % N;
  const ja = (j0 + N) % N;
  const h = THREE.DataUtils.fromHalfFloat;
  const t = (i: number, j: number, c: number) => h(dado[2 * (j * N + i) + c]!);
  const lin = (c: number) =>
    (t(ia, ja, c) * (1 - fx) + t(i1, ja, c) * fx) * (1 - fy) + (t(ia, j1, c) * (1 - fx) + t(i1, j1, c) * fx) * fy;
  return [lin(0) * LAMBDA_DA_ESTEIRA_KM, lin(1)];
}

/** (δ, ∂δ/∂n) da esteira no ponto (ρ, s = R0·θ), km, com a força da região */
function esteiraEm(rhoKm: number, sKm: number): [number, number] {
  const amp = regiaoDoAnelCpu(rhoKm).esteira;
  if (amp <= 0) return [0, 0];
  const [u, v] = noLadrilho(rhoKm, sKm);
  const [d, dn] = lerLadrilho(u, v);
  return [amp * d, amp * dn];
}

/** o passo em s de 1 km do ladrilho ao longo de n (o arco do ladrilho → R0·θ) */
function arcoDaNormal(rhoKm: number): number {
  return NORMAL_DA_ESTEIRA[1] / ARCO_DA_ESTEIRA[rhoKm < TROCA_DA_ESTEIRA_KM ? 0 : 1]!;
}

/** o ESTIRAMENTO do mapa da esteira no lugar sorteado (ρ, s): 1 + ∂δ/∂n — o mapa é inversível se for > 0 */
export function estiramentoDaEsteira(sKm: number, rhoKm: number): number {
  return 1 + esteiraEm(rhoKm, sKm)[1];
}

/** O DESLOCAMENTO de um pedaço cujo lugar sorteado é (ρ, s): (Δρ, Δs em R0·θ), km */
export function deslocamentoDaEsteira(sKm: number, rhoKm: number): [number, number] {
  const [d] = esteiraEm(rhoKm, sKm);
  return [d * NORMAL_DA_ESTEIRA[0], d * arcoDaNormal(rhoKm)];
}

/**
 * A DENSIDADE DAS ESTEIRAS no ponto (s = R0·θ, ρ), de média 1: o ponto de
 * origem pelo inverso do deslocamento (Newton ao longo de n — o mapa é
 * monotônico, 1 + ∂δ/∂n > 0), e a densidade 1/(1 + ∂δ/∂n) lá. Vale 1 fora
 * do A e do B.
 */
export function densidadeDaEsteira(sKm: number, rhoKm: number): number {
  if (regiaoDoAnelCpu(rhoKm).esteira <= 0) return 1;
  const nr = NORMAL_DA_ESTEIRA[0];
  const ns = arcoDaNormal(rhoKm);
  let u = 0;
  for (let k = 0; k < 8; k++) {
    const [d, dnk] = esteiraEm(rhoKm - u * nr, sKm - u * ns);
    u -= (u - d) / (1 + dnk);
    u = Math.max(-DESLOCAMENTO_MAXIMO_KM, Math.min(DESLOCAMENTO_MAXIMO_KM, u));
  }
  return 1 / (1 + esteiraEm(rhoKm - u * nr, sKm - u * ns)[1]);
}

/** Ω kepleriano a `rhoKm` do centro, rad/s */
function omega(rhoKm: number): number {
  return Math.sqrt(GM_SATURNO / (rhoKm * rhoKm * rhoKm));
}

/**
 * O TETO DO PASSO DO RELÓGIO (s de app por quadro): o pedaço na borda da
 * borda do ladrilho anda no arco 1,5·Ω·R0/ρ · K·s por segundo; um quinto do
 * tamanho por quadro é o limite. É o mesmo número em toda oitava.
 */
export function tetoDoPasso(rhoKm: number): number {
  return 0.2 / (1.5 * omega(rhoKm) * (R0_KM / rhoKm) * K_LADRILHO);
}

/**
 * AS FASES DO LADRILHO de cada oitava para a câmera em (ρ, θ), com as
 * integrais do cisalhamento (g, e): a fração da câmera no ladrilho radial
 * (`fr`), a fase do arco (`fs`) e o fator do cisalhamento em parte inteira
 * (mod 65 536) e fracionária (`gi`, `gf`). É o que o vértice lê.
 */
export function fasesDoLadrilho(
  rhoKm: number,
  theta: number,
  g: number,
  e: number,
  fr: Float32Array | Float64Array,
  fs: Float32Array | Float64Array,
  gi: Float32Array | Float64Array,
  gf: Float32Array | Float64Array
) {
  for (let o = 0; o < OITAVAS; o++) {
    const t = TABELA_DE_OITAVAS[o]!;
    const kc = Math.floor(rhoKm / t.ladoRadial);
    fr[o] = rhoKm / t.ladoRadial - kc;
    const go = g * (t.ladoRadial / t.ladoNoArco);
    const sigma = (theta / (2 * Math.PI)) * t.voltas;
    const fase = go * kc - e / t.ladoNoArco - sigma;
    fs[o] = fase - Math.floor(fase);
    const gInt = Math.floor(go);
    gi[o] = ((gInt % 65536) + 65536) % 65536;
    gf[o] = go - gInt;
  }
}

/**
 * O LUGAR DE UM PEDAÇO, na CPU e em dupla precisão — a mesma conta do
 * vértice (`lugar`), sem a escolha: (ρ, s = R0·θ em [0, 2πR0), z) do centro,
 * com a esteira, e o raio a. Nenhum termo lê a posição da câmera além da
 * escolha da imagem do ladrilho: a mais perto dela, deslocada de `img`
 * ladrilhos (radial, arco).
 */
export function lugarDaPedra(
  o: number,
  i: number,
  cam: { rhoKm: number; theta: number; zKm: number },
  g = 0,
  e = 0,
  img: readonly [number, number] = [0, 0]
): { rhoKm: number; sKm: number; zKm: number; raioKm: number } {
  const fr = new Float64Array(OITAVAS);
  const fs = new Float64Array(OITAVAS);
  const gi = new Float64Array(OITAVAS);
  const gf = new Float64Array(OITAVAS);
  fasesDoLadrilho(cam.rhoKm, cam.theta, g, e, fr, fs, gi, gf);
  const t = TABELA_DE_OITAVAS[o]!;
  const base = misturar((i ^ (o << 24)) >>> 0);
  const h0 = misturar((base ^ 0x51ed27) >>> 0);
  const h1 = misturar((base ^ 0x2c1b3c6d) >>> 0);
  const h2 = misturar((base ^ 0x7a3f91c5) >>> 0);
  const q = h0 & 0xffff;
  const a = q / 65536;
  const dk = Math.floor(fr[o]! - a + 0.5) + img[0];
  const dRho = (dk + a - fr[o]!) * t.ladoRadial;
  const cis = ((gi[o]! * q) % 65536) / 65536 + gf[o]! * (dk + a);
  let sig = (h1 >>> 8) / 16777216 + cis + fs[o]!;
  sig -= Math.floor(sig + 0.5);
  sig += img[1];
  const raioKm = (0.5 * t.s) / Math.sqrt(1 - (0.75 * (h0 >>> 16)) / 65536);
  const rhoKm = cam.rhoKm + dRho;
  const z0 = ((h2 & 0xffff) + (h2 >>> 16) + 1) / 65536 - 1;
  const volta = 2 * Math.PI * R0_KM;
  let sKm = R0_KM * cam.theta + sig * t.ladoNoArco;
  const [eR, eS] = deslocamentoDaEsteira(sKm, rhoKm);
  sKm = (((sKm + eS) % volta) + volta) % volta;
  return { rhoKm: rhoKm + eR, sKm, zKm: alturaNaCamada(z0, raioKm, regiaoDoAnelCpu(rhoKm).espessura), raioKm };
}

/**
 * O GIRO PRÓPRIO: não medido; supõe-se equipartição com a agitação — a
 * velocidade aleatória entre vizinhos, ~1 mm/s (`ANEL_DE_SATURNO.pedacos`).
 * Velocidade angular ≈ v/a em torno de um eixo sorteado,
 * contada em voltas inteiras por `PERIODO_DO_GIRO_S` (o relógio fica preciso
 * no float32; o erro da contagem é < 3 % no pedaço de 10 m).
 */
const V_AGITACAO_KM_S = ANEL_DE_SATURNO.pedacos.agitacaoKmS;
const PERIODO_DO_GIRO_S = 2 ** 20;

/** a velocidade angular do giro próprio do pedaço de raio `aKm`, rad/s */
export function giroProprio(aKm: number): number {
  const voltas = Math.max(1, Math.round(((V_AGITACAO_KM_S / aKm) * PERIODO_DO_GIRO_S) / (2 * Math.PI)));
  return (2 * Math.PI * voltas) / PERIODO_DO_GIRO_S;
}

const glslF = (x: number) => x.toExponential(9);

/**
 * O MATERIAL DE GELO — os números que o vértice, o fragmento e o teste
 * dividem. A luz do Sol é DURA: o terminador quase não dá a volta
 * (`ENVOLVE`), e o lado da noite fica quase preto — só o anel em volta, o
 * globo com a cor quente dele e um piso o aquecem.
 */
export const ENVOLVE = 0.05;
export const AMBIENTE_DO_ANEL = 0.03;
export const PISO_DA_NOITE = 0.006;

/**
 * O SOL NA CAMADA: o Sol que chega a um pedaço passa pelos pedaços entre
 * ele e a face do Sol. Com F a fração da camada acima dele nessa direção
 * (uniforme sobre os pedaços) e μ0 o seno da elevação do Sol, a fração que
 * passa é e^(−τ·F/μ0) — a mesma lei da névoa (`nevoaDaCamera`). Os pedaços
 * desenhados são vistos sem os não resolvidos à frente (esses estão no
 * disco e na névoa), então o quadro soma TODOS por igual: a lei é dividida
 * pela média dela em F, μ0/τ·(1 − e^(−τ/μ0)), e a média do conjunto fica 1,
 * a do disco que ele substitui (sem degrau na cessão). O de cima fica claro,
 * o fundo, na penumbra. x = τ/μ0 tem teto em `X_DO_SOL`: além dele o de
 * cima teria de brilhar mais que 3× a face ao Sol só para pagar a média.
 */
export const X_DO_SOL = 3;
export function atenuacaoDoSol(fracaoAcima: number, tau: number, mu0: number): number {
  const x = Math.min(Math.max(tau, 0) / Math.max(mu0, 1e-3), X_DO_SOL);
  if (x < 1e-4) return 1;
  return (Math.exp(-x * grampo(fracaoAcima)) * x) / -Math.expm1(-x);
}

/**
 * A SOMBRA DE CADA PEDAÇO SOBRE A CAMADA (vigésima segunda volta). O Sol
 * no anel é baixo (a elevação e nunca passa de ~27°), e cada pedaço tira a
 * luz direta de um cilindro de raio a que parte dele para longe do Sol. A
 * matéria que ele sombreia é a da camada (o disco, os não resolvidos),
 * espalhada na espessura H: na coluna do ponto (u, v) do plano — u ao longo
 * do rumo para longe do Sol, v na transversal, os dois a partir do centro
 * do pedaço — a fração sombreada S é o trecho da coluna dentro do cilindro
 * (e atrás do terminador), dividido por H. No plano médio o corte do
 * cilindro é a elipse de semieixos a (transversal) e a/sen e (ao longo do
 * rumo), deslocada de z·cot e pela altura z do pedaço (`elipseDaSombra`); a
 * espessura espalha essa elipse num rastro de até (a + H·cos e)/sen e — a
 * borda é a da camada, não a do Sol: a penumbra do Sol (0,056° de diâmetro
 * em Saturno) dá ~1 cm a 10 m, desprezível aqui.
 *
 * As sombras de um quadro se compõem pelo produto T = Π(1 − k·p·S) (p a
 * presença do pedaço, a mesma da cessão). A média de T num campo de Poisson
 * é e^(−E), E = Σ_o k·τ_o·p_o·G_o (`esperadoDaSombra`), e é ela que sai da
 * conta estatística: o disco multiplica a luz direta por T/e^(−E). A média
 * fica a de antes, e onde não há pedaço resolvido nada muda.
 */
/** as oitavas que fazem sombra explícita: abaixo delas a sombra de um pedaço tira menos de ~4 % da coluna de 8 m (2a/H), e elas ficam na conta estatística (salvaguarda minha, pelo custo) */
export const OITAVAS_DA_SOMBRA = 6;
/** o piso do seno da elevação do Sol na sombra: o mesmo piso de μ0 do disco (0,02, ~1,1°) — com o Sol no plano o rastro iria ao infinito */
export const SEN_MIN_DA_SOMBRA = 0.02;
/**
 * o teto de E, a profundidade óptica média das sombras explícitas: metade
 * de `X_DO_SOL` (a mesma salvaguarda: e^(−x/2) é a média do pedaço miúdo).
 * Acima dele as sombras clareiam por k = teto/E, e a parte iluminada nunca
 * passa de e^1,5 ≈ 4,5× a média
 */
export const TETO_DA_SOMBRA = X_DO_SOL / 2;

/** a fração S da coluna (u, v) sombreada; `b` = √(a² − v²), a meia largura do cilindro na altura do ponto */
export function colunaDaSombra(u: number, b: number, zs: number, h: number, senE: number, cosE: number): number {
  const c = Math.max(cosE, 1e-3);
  const lo = Math.max(zs + (-b - u * senE) / c, -0.5 * h);
  const hi = Math.min(zs + (b - u * senE) / c, zs + (u * c) / senE, 0.5 * h);
  return Math.max(hi - lo, 0) / h;
}

/**
 * O CORTE DA SOMBRA NO PLANO MÉDIO do pedaço em `p` (km, quadro do anel,
 * z = altura na camada) de raio `a`, com o Sol na direção `sol`: o centro,
 * o rumo para longe do Sol e os semieixos.
 */
export function elipseDaSombra(
  p: readonly [number, number, number],
  a: number,
  sol: readonly [number, number, number]
): { centro: [number, number]; rumo: [number, number]; maior: number; menor: number; senE: number } {
  const l = Math.hypot(sol[0], sol[1], sol[2]);
  const senE = Math.max(Math.abs(sol[2]) / l, SEN_MIN_DA_SOMBRA);
  const cosE = Math.sqrt(1 - senE * senE);
  const lh = Math.hypot(sol[0], sol[1]) || 1;
  const rumo: [number, number] = [-sol[0] / lh, -sol[1] / lh];
  const zs = p[2] * (sol[2] >= 0 ? 1 : -1);
  const desloca = (zs * cosE) / senE;
  return { centro: [p[0] + rumo[0] * desloca, p[1] + rumo[1] * desloca], rumo, maior: a / senE, menor: a, senE };
}

/** ∫S dA · H: o volume da camada que o pedaço (raio a, altura zs para o lado do Sol) sombreia — a integral no disco do terminador */
export function volumeDaSombra(a: number, zs: number, h: number, senE: number): number {
  const cosE = Math.sqrt(Math.max(1 - senE * senE, 0));
  const n = 32;
  let v = 0;
  for (let k = 0; k < n; k++) {
    const r = a * (-1 + (2 * (k + 0.5)) / n);
    v += 2 * Math.sqrt(a * a - r * r) * Math.min(Math.max(zs + r * cosE + 0.5 * h, 0), h);
  }
  return (v * (2 * a)) / n / senE;
}

/**
 * G_o: a sombra média da oitava o sobre a camada por unidade de τ dela —
 * E[∫S dA]/E[πa²], na lei de tamanhos e de alturas do vértice. Para o
 * pedaço miúdo, 1/(2 sen e); o grande, maior que a camada, sombreia menos.
 */
export function fatoresDaSombra(senE: number, h: number): number[] {
  return Array.from({ length: OITAVAS_DA_SOMBRA }, (_, o) => {
    const s = TABELA_DE_OITAVAS[o]!.s;
    let num = 0;
    let den = 0;
    const na = 12;
    const nz = 12;
    for (let i = 0; i < na; i++) {
      const a = (0.5 * s) / Math.sqrt(1 - (0.75 * (i + 0.5)) / na);
      den += a * a;
      for (let j = 0; j < nz; j++) {
        // a altura triangular do vértice (z0 ∈ [−1, 1]), pela inversa da acumulada
        const t = (j + 0.5) / nz;
        const z0 = t < 0.5 ? Math.sqrt(2 * t) - 1 : 1 - Math.sqrt(2 * (1 - t));
        num += volumeDaSombra(a, alturaNaCamada(z0, a, h), h, senE) / h / (Math.PI * nz);
      }
    }
    return num / den;
  });
}

/** k: a força das sombras explícitas onde o campo carrega `tauCampo`, com o teto de E */
export function forcaDaSombra(tauCampo: number, g: readonly number[]): number {
  const soma = g.reduce((x, y) => x + y, 0);
  return Math.min(1, TETO_DA_SOMBRA / Math.max(tauCampo * FRACAO_POR_OITAVA * soma, 1e-9));
}

/** E: a média de −ln T que as sombras explícitas deixam, com as presenças das oitavas que as fazem (e o peso de cada uma no nível de detalhe, `pesoDaSombra`; 1 sem ele) */
export function esperadoDaSombra(tauCampo: number, presencas: readonly number[], g: readonly number[], pesos?: readonly number[]): number {
  let e = 0;
  for (let o = 0; o < OITAVAS_DA_SOMBRA; o++) e += (presencas[o] ?? 0) * g[o]! * (pesos?.[o] ?? 1);
  return forcaDaSombra(tauCampo, g) * tauCampo * FRACAO_POR_OITAVA * e;
}

/**
 * O NÍVEL DE DETALHE DA SOMBRA (vigésima terceira volta). Vista de longe e
 * rasante, a sombra de um pedaço fica mais fina que um pixel e vira risco:
 * ali ela volta para a conta estatística. O peso é função da largura da
 * sombra NA TELA, no ponto do plano em que ela cai — o eixo menor da elipse
 * projetada (`ladoDaSombraNaTela`), com o raio típico da oitava
 * (`RAIO_DA_SOMBRA_POR_S`), não o do pedaço: assim o triângulo da máscara e
 * a média E do disco usam a MESMA função no mesmo pixel e a luz média fica
 * exata. O que existe no mundo não muda; só quem desenha a sombra.
 */
/**
 * a largura (px, da máscara = do quadro) abaixo da qual a sombra é toda
 * estatística, e acima da qual é toda explícita — salvaguarda, não medida:
 * começou em 0,75 e 1,5 px, e a foto a 50 m acima do anel ainda mostrava
 * riscos de sombras de 1,5 a 3 px na faixa rasante; o dobro os tira
 */
export const SOMBRA_PX_SOME = 1.5;
export const SOMBRA_PX_INTEIRA = 3;
/** o raio típico da oitava, em s: E[a³]/E[a²] na lei de tamanhos do vértice (a = s/2 · (1 − 0,75u)^−½) = (1/3)/(ln 4/3) */
export const RAIO_DA_SOMBRA_POR_S = 1 / 3 / (Math.log(4) / 3);

/** o peso da sombra explícita pela largura dela na tela, px */
export function pesoDaSombra(px: number): number {
  return suave(SOMBRA_PX_SOME, SOMBRA_PX_INTEIRA, px);
}

/**
 * px por km de raio: o semieixo menor, na tela, da elipse da sombra (a na
 * transversal, a/sen e ao longo do `rumo`) no ponto `rel` do plano (km,
 * relativo à câmera, quadro do anel). Os valores singulares da projeção:
 * σ₁σ₂ = |ŵz|/sen e (a área) e σ₁² + σ₂² = F.
 */
export function ladoDaSombraNaTela(rel: readonly [number, number, number], rumo: readonly [number, number], senE: number, pxPorRad: number): number {
  const d = Math.max(Math.hypot(rel[0], rel[1], rel[2]), 1e-9);
  const wx = rel[0] / d;
  const wy = rel[1] / d;
  const wz = rel[2] / d;
  const s = Math.max(senE, 1e-3);
  const wt = -wx * rumo[1] + wy * rumo[0];
  const wr = wx * rumo[0] + wy * rumo[1];
  const f = Math.max(1 - wt * wt, 0) + Math.max(1 - wr * wr, 0) / (s * s);
  const d2 = (wz * wz) / (s * s);
  return (Math.sqrt((2 * d2) / Math.max(f + Math.sqrt(Math.max(f * f - 4 * d2, 0)), 1e-12)) * pxPorRad) / d;
}

/**
 * O CORTE, em oitavas de distância: além dele o pedaço é um PONTO (um
 * vértice só, o corpo acertado no fragmento); aquém, uma MALHA escolhida na
 * CPU.
 */
export const X_CORTE = 5.5;

/**
 * AS FORMAS: a de cada pedaço não foi medida. O modelo aceito é que os
 * pedaços são AGREGADOS efêmeros de pedaços menores (Davis et al. 1984):
 * eles se tocam a ~1 mm/s, colam e se soltam, e não se fraturam. Acima de
 * `DIAMETRO_DOS_MONTES_KM` (~2,5 m) todo pedaço é MONTE — doze membros de
 * tamanhos bem diferentes e, de perto, dezenas de submembros pela lei dos
 * tamanhos (`subMembros`); abaixo, a maioria é AGREGADO PEQUENO — de 2 a 12
 * membros pela mesma lei (`membrosDoAgregado`). O BLOCO (gelo único, de
 * perto um poliedro de cantos gastos, `planosDoBloco`) fica minoria entre
 * os pequenos: nada no modelo pede um estilhaço de arestas vivas.
 * Nenhum bloco entre os grandes: um monólito de 20 m com faces planas lia
 * como uma tábua na frente de Saturno, e o modelo não o sustenta.
 */
export const DIAMETRO_DOS_MONTES_KM = 0.0025;
const BLOCOS_ENTRE_OS_GRANDES = 0;
export const BLOCOS_ENTRE_OS_PEQUENOS = 0.15;
/** o piso da fração acesa do disco de uma pedra na correção de fase (`luzDaPedra`) */
export const FASE_PISO = 0.5;
export const MEMBROS = 12;
/** as formas assadas de cada tipo (ver `assarFormas`) */
export const VARIANTES = 8;
/**
 * OS PLANOS DO BLOCO (décima volta): um estilhaço de gelo é anguloso por
 * inteiro — o elipsoide com um ou dois cortes lia como queijo cortado. O
 * bloco é a interseção de `PLANOS_DO_BLOCO` (8 a 14) semiespaços: as
 * normais saem de uma rede de Fibonacci girada ao acaso e sacudida (elas
 * cobrem a esfera, e o poliedro fecha), a distância de cada face, sorteada;
 * o canto mais longe toca a esfera unitária (o ponto desenha dentro dela).
 * De longe o poliedro é o de quinas vivas; de perto, os cantos são GASTOS
 * (as colisões lentas lascam e recobrem o canto, não o afiam) e as faces
 * abaulam de leve (`ABAULADO`). O alongado e o achatado vêm dos eixos da
 * pedra, como antes.
 */
const PLANOS_DO_BLOCO = [8, 14] as const;
/** o expoente do mínimo suave das faces: a aresta recua ~7 % do raio, o canto ~10 % */
const P_DA_ARESTA = 10;
/** o abaulado da face no meio dela, em fração do raio (zero na aresta) */
const ABAULADO = 0.05;
/** as linhas de cada variante na textura das formas: uA, uB, nA, nB, (oclusão, sujeira) */
const LINHAS_DA_FORMA = 5;
const BASE_DO_BLOCO = 0x2545f491;
const BASE_DO_MONTE = 0x9e3779b9;
/** as bolas da régua do tamanho (o miolo e as três grandes: a forma de longe até a décima quinta volta) */
const BOLAS_A_VALER = 4;
/** os membros de cada variante do agregado pequeno, de 2 a 12 (`osAgregados`), e o raio do menor (o maior é 1) */
const MEMBROS_DO_AGREGADO = [2, 3, 4, 5, 6, 8, 10, 12] as const;
const MENOR_DO_AGREGADO = 0.3;
/** as direções da conta das áreas (uma rede de Fibonacci) */
const DIRECOES_DA_AREA = Array.from({ length: 400 }, (_, k) => {
  const z = 1 - (2 * (k + 0.5)) / 400;
  const s = Math.sqrt(1 - z * z);
  return [s * Math.cos(k * 2.399963), s * Math.sin(k * 2.399963), z];
});
let agregados: { membros: number[][][]; escala: number[]; r2Perto: number[] } | null = null;
/**
 * O TETO DAS MALHAS PELO TAMANHO NA TELA: abaixo deste raio em px o pedaço
 * é ponto, mesmo dentro de x < `X_CORTE`. A forma de perto acende só acima
 * de 2× isto: nada estala.
 */
export const PX_CORTE = 12;
/**
 * abaixo deste raio na tela (px) o ponto é a esfera de mesma seção média,
 * sem a marcha até a forma: o grão que a janela maior traz custava a marcha
 * em cada pixel dele (salvaguarda minha, não medida: a forma de longe não
 * se resolve abaixo de ~2–3 px)
 */
export const PX_DA_ESFERA = 2.5;
/** as direções por lado do mapa da forma de longe (`formasDeLonge`) */
const LADO_DE_LONGE = 24;
/** os grãos por lado do ladrilho do grão (`texturaDoRelevo`) e os voxels por lado dele */
const CELULAS_DO_RELEVO = 8;
const VOXELS_DO_RELEVO = 64;
/**
 * O GRÃO: a lei dos tamanhos medida segue até o centímetro, então a
 * superfície de um pedaço é a dos pedaços menores que o compõem — grãos
 * meio enterrados, cobertos de geada (o regolito de gelo, fosco), com
 * frestas entre eles. Três escalas em grãos por raio do pedaço (os maiores
 * que isso a malha já desenha, como membros): no de 1 m, grãos de ~17, 6 e
 * 2 cm; no monte de 20 m, de ~1,7 m, 55 e 20 cm.
 * (Décima sexta volta) O grão era um Voronoi em 2D projetado em três
 * planos: a altura f2 − f1 tem cristas retas DENTRO de cada célula (onde o
 * segundo vizinho troca) — o "papel amassado" — e a projeção esticava nas
 * faces que a mistura dos três planos não cobria por igual. Agora o grão é
 * SÓLIDO, em 3D, sem projeção: um grão por célula, sacudido, e a altura em
 * cada ponto é a da cúpula mais alta ali, R·(1 − d²/R²)^1,5 — redonda no
 * topo, sem quina na borda; onde duas se encontram fica a fresta (um vale,
 * não uma crista). O mesmo em qualquer orientação da face.
 */
const ESCALAS_DO_GRAO = [6, 18, 54] as const;
/** a altura da cúpula sobre o raio dela (meio enterrada e coberta de geada): salvaguarda minha, não medida */
const ALTURA_DO_GRAO = 0.4;
/** a inclinação na textura vai até ± isto (a cúpula chega a 1,5) */
const INCLINACAO_DO_GRAO = 1.6;
/** a régua da fresta (`normaDoSol`): as direções do Sol por lado do mapa octaédrico, e as faixas do cosseno do Sol na envoltória (de C0 em PASSO), por variante */
const LADO_DA_NORMA = 8;
const FAIXAS_DA_NORMA = 23;
const C0_DA_NORMA = -0.1;
const PASSO_DA_NORMA = 0.05;
/** o escuro da fresta: o albedo cai isto por unidade de altura abaixo da média (a fresta vê menos céu) */
const ESCURO_DA_FRESTA = 0.35;
/** a textura do grão (`texturaDoRelevo`) e a altura média dela */
let grao: { dado: Uint8Array; n: number; media: number } | null = null;
function dadoDoGrao() {
  return grao ?? drenar(dadoDoGraoEmPassos());
}
function* dadoDoGraoEmPassos(): Passos<{ dado: Uint8Array; n: number; media: number }> {
  if (grao) return grao;
  const n = VOXELS_DO_RELEVO;
  const C = CELULAS_DO_RELEVO;
  const c = n / C;
  const alt = new Float32Array(n * n * n);
  const inc = new Float32Array(n * n * n * 3);
  for (let k = 0; k < C; k++)
    for (let j = 0; j < C; j++) {
      for (let i = 0; i < C; i++) {
        const h = misturar((Math.imul(i, 0x8da6b343) ^ Math.imul(j, 0xd8163841) ^ Math.imul(k, 0xcb1ab31f) ^ 0x51ed27) >>> 0);
        const r = quatro(h);
        const centro = [i + 0.15 + 0.7 * r[0], j + 0.15 + 0.7 * r[1], k + 0.15 + 0.7 * r[2]];
        // o raio da cúpula, em células: de 0,55 a 0,9 (as vizinhas se tocam)
        const R = 0.55 + 0.35 * r[3];
        const lo = centro.map((x) => Math.floor((x - R) * c));
        const hi = centro.map((x) => Math.ceil((x + R) * c));
        for (let z = lo[2]!; z <= hi[2]!; z++)
          for (let y = lo[1]!; y <= hi[1]!; y++)
            for (let x = lo[0]!; x <= hi[0]!; x++) {
              const d = [(x + 0.5) / c - centro[0]!, (y + 0.5) / c - centro[1]!, (z + 0.5) / c - centro[2]!];
              const u2 = (d[0]! * d[0]! + d[1]! * d[1]! + d[2]! * d[2]!) / (R * R);
              if (u2 >= 1) continue;
              const a = R * (1 - u2) ** 1.5;
              const o = (((z + n) % n) * n + ((y + n) % n)) * n + ((x + n) % n);
              if (a <= alt[o]!) continue;
              alt[o] = a;
              // a inclinação da cúpula: −3·√(1 − u²)·d/R
              const g = (-3 * Math.sqrt(1 - u2)) / R;
              for (let e = 0; e < 3; e++) inc[o * 3 + e] = g * d[e]!;
            }
      }
      yield;
    }
  const dado = new Uint8Array(n * n * n * 4);
  let soma = 0;
  for (let o = 0; o < n * n * n; o++) {
    // a altura sobre a da maior cúpula (0,9)
    const v = Math.min(alt[o]! / 0.9, 1);
    soma += Math.round(255 * v) / 255;
    dado[o * 4] = Math.round(255 * v);
    for (let e = 0; e < 3; e++)
      dado[o * 4 + 1 + e] = Math.round(255 * Math.min(Math.max(inc[o * 3 + e]! / (2 * INCLINACAO_DO_GRAO) + 0.5, 0), 1));
  }
  grao ??= { dado, n, media: soma / (n * n * n) };
  return grao;
}
/**
 * A ÁREA DE CADA TIPO: a seção do elipsoide é 0,61 do disco de raio 1; as
 * faces do bloco e o vão entre as bolas do monte tiram área. Cada tipo
 * cresce √(0,61/área) (longe, perto) — a seção média fica a do elipsoide.
 * O bloco poliedro (décima volta) mora dentro da esfera unitária e tem ~43 %
 * da área do de antes: 1,124 × √(11,39/4,91) de longe, e de perto a mesma
 * conta sobre a área dele (4,76, as arestas arredondadas) — longe e perto
 * do mesmo tamanho.
 */
const ESCALA_DO_BLOCO = [1.711, 1.739] as const;
export const ESCALA_DO_MONTE = [1.212, 1.15] as const;
/**
 * a cor do brilho de Saturno sobre as pedras, luminância 1: o azul pela cor
 * do globo, B−V ≈ 1,04 (valor de tabela, referência a conferir) contra 0,65
 * do Sol — o azul refletido cai 10^(−0,4·0,39) ≈ 0,70 do verde; o vermelho
 * sobre o verde fica o de antes (1,06, escolha declarada, sem medida aqui)
 */
const COR_DE_SATURNO = [1.07, 1.009, 0.704] as const;

/**
 * A LUZ QUE UMA FACE RECEBE, por unidade do albedo: Sol embrulhado com a
 * sombra do globo, a luz do anel em volta (`lamina`: o I/F do próprio
 * disco naquele ponto, ver `luzDaPedra`) só onde o Sol não chega, o globo
 * e o ambiente; `sol` é o que a fresta do agregado deixa entrar
 * (`solAberto`). É a mesma conta do fragmento (sem fase, brilho e relevo).
 */
export function luzDaFace(cosSol: number, cosGlobo: number, sombra: number, irrGlobo: number, poloAbs = 0, lamina = 0, sol = 1): number {
  const envolve = (c: number) => Math.max((c + ENVOLVE) / (1 + ENVOLVE), 0);
  const direto = envolve(cosSol) * sol;
  return (
    direto * sombra +
    lamina * (1 - 0.6 * poloAbs) * (1 - Math.min(direto, 1)) +
    envolve(cosGlobo) * irrGlobo +
    AMBIENTE_DO_ANEL * (0.25 + 0.75 * sombra) +
    PISO_DA_NOITE
  );
}

/**
 * DE DENTRO DA CAMADA o disco liso não serve (um plano visto de lado): ele
 * passa a vez à NÉVOA — a multidão dos pedaços não resolvidos, integrada na
 * fatia da camada ao longo de cada raio de visada. O peso da névoa é 1 com
 * a câmera dentro da camada (|h| < H) e 0 a quatro espessuras; o disco leva
 * o complemento.
 */
export function pesoDaNevoa(alturaKm: number, espessuraKm: number): number {
  return 1 - suave(espessuraKm, 4 * espessuraKm, Math.abs(alturaKm));
}
/** o raio da casca da névoa, km — além de todos os pedaços desenhados (a janela maior tem 5,12 km) */
const RAIO_DA_NEVOA_KM = 8;
/** até onde a névoa integra um raio de visada, km */
export const ALCANCE_DA_NEVOA_KM = 1000;

/**
 * A PROFUNDIDADE ÓPTICA DA NÉVOA num raio de visada que sai da altura `h`
 * com componente vertical `dz` (unitário), até `L` km: só o trecho dentro da
 * fatia |z| < esp/2, com τ/esp por km, menos a parte das oitavas que já
 * estão desenhadas até onde cada uma se resolve (o meio da rampa de
 * entrada), na fração `teto` que o campo carrega. O gêmeo de `tauDaNevoa`
 * no GLSL.
 */
export function tauDaNevoa(h: number, dz: number, L: number, esp: number, tau: number, teto: number): number {
  let lo: number;
  let hi: number;
  if (Math.abs(dz) < 1e-6) {
    if (Math.abs(h) >= 0.5 * esp) return 0;
    lo = 0;
    hi = L;
  } else {
    const t1 = (-0.5 * esp - h) / dz;
    const t2 = (0.5 * esp - h) / dz;
    lo = Math.max(Math.min(t1, t2), 0);
    hi = Math.min(Math.max(t1, t2), L);
  }
  if (hi <= lo) return 0;
  let soma = hi - lo;
  for (let o = 0; o < OITAVAS; o++) {
    const lo2 = S_MAX_KM * 2 ** (X_ENTRA - 0.5 * (X_ENTRA - X_PLENO) - o);
    soma -= FRACAO_POR_OITAVA * teto * Math.max(Math.min(hi, lo2) - lo, 0);
  }
  return (tau / esp) * Math.max(soma, 0);
}

/**
 * AS ESTEIRAS NO DISCO aparecem abaixo de `H_ESTEIRA_KM` (de 25 a 20 km) —
 * antes de qualquer pedaço se resolver (a janela maior tem 5,12 km) —, e
 * somem quando o espaçamento cai de 8 para 4 px: o filamento é fino (tem
 * harmônicos bem acima do espaçamento), e no limite de 2 px de antes ele
 * saía como pontilhado e tracinhos regulares (a 16 km, 2,7 px).
 */
export const H_ESTEIRA_KM = 25;
export function forcaDaEsteiraNoDisco(alturaKm: number, espessuraKm: number): number {
  return (1 - suave(0.8 * H_ESTEIRA_KM, H_ESTEIRA_KM, Math.abs(alturaKm))) * (1 - pesoDaNevoa(alturaKm, espessuraKm));
}

/**
 * A PROFUNDIDADE DOS PEDAÇOS: a distância `d` ao plano da lente que entra na
 * função de profundidade da projeção (near `n`). Identidade de 2n para
 * longe; de `PERTO_MINIMO_KM` a 2n comprime linear em [n·(1 + folga), 2n] —
 * monótona, então a ordem entre pedaços fica e nenhum é cortado pelo near
 * do app (12–32 m, que segue intocado). A folga tira o pedaço da beira
 * exata do recorte. O gêmeo de `comProfundidade` no vértice.
 */
export const PERTO_MINIMO_KM = 5e-5;
const FOLGA_DO_RECORTE = 1e-3;
export function distanciaDaProfundidade(d: number, n: number, dMin = PERTO_MINIMO_KM): number {
  if (d <= 0 || d >= 2 * n || 2 * n <= dMin) return d;
  const t = grampo((d - dMin) / (2 * n - dMin));
  return (1 + FOLGA_DO_RECORTE) * n + t * (2 * n - (1 + FOLGA_DO_RECORTE) * n);
}

/** O SORTEIO, no vértice e no fragmento: INTEIRO (exato em qualquer GPU, e o mesmo da CPU em `misturar`). */
const GLSL_SORTEIO = /* glsl */ `
const float PI = 3.14159265358979;
const int MEMBROS = ${MEMBROS};
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
// a variante da forma desta pedra (\`baseDaVariante\` na CPU): os
// agregados pequenos são as variantes de monte \`VARIANTES\` em diante
int gVar;
uint baseDaForma(bool bloco, bool pequeno, uint base) {
  gVar = int(misturar(base ^ 0x5bd1e995u) % ${VARIANTES}u) + (pequeno && !bloco ? ${VARIANTES} : 0);
  return misturar(uint(gVar) + (bloco ? ${BASE_DO_BLOCO >>> 0}u : ${BASE_DO_MONTE >>> 0}u));
}
ASSADOS_DAS_PEDRAS
`;

const glslRegioes = (campo: 'espessura' | 'esteira') =>
  ANEL_DE_SATURNO.regioes.slice(1)
    .map((r, k) => {
      const a = ANEL_DE_SATURNO.regioes[k]!;
      return `${glslF(r[campo] - a[campo])} * smoothstep(${glslF(r.km - r.meia)}, ${glslF(r.km + r.meia)}, km)`;
    })
    .join(' + ');

/**
 * AS CONTAS PURAS DOS PEDAÇOS EM GLSL (sem uniforme): a região, a cessão
 * pela distância, o peso e a profundidade óptica da névoa. Entram nas pedras e, sem `?pedras=0`, no `ANEL_FRAG`.
 */
const GLSL_PURO_DAS_PEDRAS = /* glsl */ `
const float P_R0 = ${glslF(R0_KM)};
const float P_S_MAX = ${glslF(S_MAX_KM)};
const float P_X_ENTRA = ${glslF(X_ENTRA)};
const float P_RAMPA = ${glslF(1 / (X_ENTRA - X_PLENO))};
const float P_FRACAO = ${glslF(FRACAO_POR_OITAVA)};
const float P_TAU_TETO = ${glslF(TAU_TETO)};
// (espessura total da camada km, força das esteiras) — \`regiaoDasPedras\` na CPU
vec2 regiaoDasPedras(float km) {
  return vec2(${glslF(ANEL_DE_SATURNO.regioes[0]!.espessura)} + ${glslRegioes('espessura')},
    ${glslF(ANEL_DE_SATURNO.regioes[0]!.esteira)} + ${glslRegioes('esteira')});
}
// \`cessaoDoDisco\` na CPU: a parte de τ das oitavas resolvidas a d km
float cessaoDasPedras(float d) {
  float x0 = log2(max(d, 1.0e-12) / P_S_MAX);
  float f = 0.0;
  for (int o = 0; o < ${OITAVAS}; o++) f += clamp((P_X_ENTRA - x0 - float(o)) * P_RAMPA, 0.0, 1.0);
  return f * P_FRACAO;
}
// a parte de τ que o campo de fato carrega (o teto do campo × a fração do tier)
float tetoDoCampo(float rhoKm, float tau, float fracaoDoTier) {
  return min(1.0, P_TAU_TETO * P_R0 * fracaoDoTier / (max(rhoKm, 1.0) * max(tau, 1.0e-4)));
}
// \`pesoDaNevoa\` na CPU
float pesoDaNevoa(float h, float esp) {
  return 1.0 - smoothstep(esp, 4.0 * esp, abs(h));
}
// A PROFUNDIDADE ÓPTICA DA NÉVOA num raio de visada que sai da altura h com
// componente vertical dz (unitário), até L km: só o trecho dentro da fatia
// |z| < esp/2, com τ/esp por km — menos a parte das oitavas que já estão
// desenhadas até onde cada uma se resolve (o meio da rampa de entrada).
float tauDaNevoa(float h, float dz, float L, float esp, float tau, float teto) {
  float lo;
  float hi;
  if (abs(dz) < 1.0e-6) {
    if (abs(h) >= 0.5 * esp) return 0.0;
    lo = 0.0; hi = L;
  } else {
    float t1 = (-0.5 * esp - h) / dz;
    float t2 = (0.5 * esp - h) / dz;
    lo = max(min(t1, t2), 0.0);
    hi = min(max(t1, t2), L);
  }
  if (hi <= lo) return 0.0;
  float soma = hi - lo;
  for (int o = 0; o < ${OITAVAS}; o++) {
    float lo2 = P_S_MAX * exp2(P_X_ENTRA - 0.5 / P_RAMPA - float(o));
    soma -= P_FRACAO * teto * max(min(hi, lo2) - lo, 0.0);
  }
  return tau / esp * max(soma, 0.0);
}
`;

/**
 * AS SOMBRAS EXPLÍCITAS, o que o vértice delas e o disco dividem (depois de
 * `GLSL_PURO_DAS_PEDRAS`): os G_o do quadro (`fatoresDaSombra`), a força k
 * (`forcaDaSombra`) e a soma das presenças pesadas por G_o.
 */
const GLSL_PESO_DA_SOMBRA = /* glsl */ `
// o nível de detalhe da sombra (\`pesoDaSombra\`, \`ladoDaSombraNaTela\`)
float pesoDaSombra(float px) {
  return smoothstep(${glslF(SOMBRA_PX_SOME)}, ${glslF(SOMBRA_PX_INTEIRA)}, px);
}
float ladoDaSombraNaTela(vec3 rel, vec2 rumo, float senE, float pxPorRad) {
  float d = max(length(rel), 1.0e-9);
  vec3 w = rel / d;
  float s = max(senE, 1.0e-3);
  float wt = dot(w.xy, vec2(-rumo.y, rumo.x));
  float wr = dot(w.xy, rumo);
  float f = max(1.0 - wt * wt, 0.0) + max(1.0 - wr * wr, 0.0) / (s * s);
  float d2 = w.z * w.z / (s * s);
  return sqrt(2.0 * d2 / max(f + sqrt(max(f * f - 4.0 * d2, 0.0)), 1.0e-12)) * pxPorRad / d;
}
// a largura da sombra típica da oitava o, px, com lado = \`ladoDaSombraNaTela\`
float larguraDaSombra(int o, float lado) {
  return ${glslF(2 * RAIO_DA_SOMBRA_POR_S * S_MAX_KM)} * exp2(-float(o)) * lado;
}
`;

const GLSL_SOMBRA_COMUM = /* glsl */ `
uniform float uSombraG[${OITAVAS_DA_SOMBRA}];
${GLSL_PESO_DA_SOMBRA}
// somaG = Σ G_o
float forcaDaSombra(float campo, float somaG) {
  return min(1.0, ${glslF(TETO_DA_SOMBRA)} / max(campo * P_FRACAO * somaG, 1.0e-9));
}
// Σ p_o·gp_o, com gp_o = G_o·peso_o no pixel (\`pesoDaSombra\`)
float presencasDaSombra(float d, float gp[${OITAVAS_DA_SOMBRA}]) {
  float x0 = log2(max(d, 1.0e-12) / P_S_MAX);
  float f = 0.0;
  for (int o = 0; o < ${OITAVAS_DA_SOMBRA}; o++) f += clamp((P_X_ENTRA - x0 - float(o)) * P_RAMPA, 0.0, 1.0) * gp[o];
  return f;
}
`;

/**
 * AS ESTEIRAS EM GLSL, relativas à câmera: `uEstCam` = (a câmera no
 * ladrilho: radial, arco no B, arco no A — as frações, da CPU em dupla
 * precisão). O vértice dos pedaços lê o δ pela mesma leitura bilinear da CPU
 * (`texelFetch` nos quatro texels: o lugar do pedaço é o da CPU); a folha
 * lê (δ, ∂δ/∂n) pelo filtro da placa.
 */
const GLSL_ESTEIRA = /* glsl */ `
uniform highp sampler2D uEsteira;
uniform vec4 uEstCam;
const float LAMBDA = ${glslF(LAMBDA_DA_ESTEIRA_KM)};
const float EST_LADO = ${glslF(LADO_DA_ESTEIRA_KM)};
const int EST_N = ${TEXELS_DA_ESTEIRA};
const vec2 EST_NORMAL = vec2(${glslF(NORMAL_DA_ESTEIRA[0])}, ${glslF(NORMAL_DA_ESTEIRA[1])});
const float EST_TROCA = ${glslF(TROCA_DA_ESTEIRA_KM)};
const vec2 EST_ARCO = vec2(${glslF(ARCO_DA_ESTEIRA[0]!)}, ${glslF(ARCO_DA_ESTEIRA[1]!)});
// km do ladrilho por km de s = R0·θ no raio rhoKm (\`ARCO_DA_ESTEIRA\`)
float arcoDaEsteira(float rhoKm) {
  return rhoKm < EST_TROCA ? EST_ARCO.x : EST_ARCO.y;
}
// (dRho, dS) km da câmera no ladrilho, em ladrilhos (\`noLadrilho\` na CPU)
vec2 noLadrilho(float dRho, float dS, float rhoKm) {
  bool b = rhoKm < EST_TROCA;
  return vec2(uEstCam.x + dRho / EST_LADO, (b ? uEstCam.y : uEstCam.z) + dS * (b ? EST_ARCO.x : EST_ARCO.y) / EST_LADO);
}
// o δ km no ponto do ladrilho, sem a força (\`lerLadrilho\` na CPU)
float deslocamentoNoLadrilho(vec2 t) {
  vec2 p = fract(t) * float(EST_N) - 0.5;
  vec2 c = floor(p);
  vec2 f = p - c;
  ivec2 i0 = (ivec2(c) + EST_N) & (EST_N - 1);
  ivec2 i1 = (i0 + 1) & (EST_N - 1);
  float a = mix(texelFetch(uEsteira, i0, 0).r, texelFetch(uEsteira, ivec2(i1.x, i0.y), 0).r, f.x);
  float b = mix(texelFetch(uEsteira, ivec2(i0.x, i1.y), 0).r, texelFetch(uEsteira, i1, 0).r, f.x);
  return mix(a, b, f.y) * LAMBDA;
}
// \`densidadeDaEsteira\` na CPU: Newton ao longo de n até o ponto de origem,
// com (δ, ∂δ/∂n) pelo filtro da placa; para quando o passo some
float densidadeDaEsteira(vec2 t, float amp) {
  if (amp <= 0.0) return 1.0;
  vec2 nT = EST_NORMAL / EST_LADO;
  float u = 0.0;
  vec2 e;
  for (int k = 0; k < 6; k++) {
    e = amp * textureLod(uEsteira, t - u * nT, 0.0).rg * vec2(LAMBDA, 1.0);
    float u2 = clamp(u - (u - e.x) / max(1.0 + e.y, 0.05), ${glslF(-DESLOCAMENTO_MAXIMO_KM)}, ${glslF(DESLOCAMENTO_MAXIMO_KM)});
    if (abs(u2 - u) < 1.0e-6) break;
    u = u2;
  }
  e = amp * textureLod(uEsteira, t - u * nT, 0.0).rg;
  return 1.0 / max(1.0 + e.y, 0.05);
}
`;

/**
 * A NÉVOA vista da câmera: τ, espessura e teto do campo no raio da câmera, a
 * cor-base (a tinta do perfil) e (Sol que penetra na camada × sombra do
 * globo, brilho do globo). Vale para a casca da névoa e para a névoa entre
 * cada pedaço e a lente — a mesma conta.
 */
const GLSL_LUZ_DA_NEVOA = /* glsl */ `
void nevoaDaCamera(out vec3 cor0, out vec3 camada3, out vec2 luz) {
  float rho = uRhoCamKm;
  float u = ((rho / KM_POR_RAIO - R_INT) / (R_EXT - R_INT)) * U_ESCALA + U_BASE;
  vec4 perfil = (u < 0.0 || u > 1.0) ? vec4(0.0) : textureLod(uMapaAnel, vec2(u, 0.5), 0.0);
  vec3 reg = regiaoDoAnel(rho);
  float tau = perfil.a < 0.004 ? 0.0 : tauDaOpacidade(perfil.a) * reg.z;
  vec3 razao = perfil.rgb / COR_B_DO_PERFIL;
  vec3 tinta = COR_DO_GELO * (razao / max(dot(razao, vec3(0.2126, 0.7152, 0.0722)), 1.0e-4));
  if (dot(tinta, tinta) < 1.0e-6) tinta = COR_DO_GELO;
  cor0 = tinta * reg.x * IF_RETRO * uLuzGanho;
  camada3 = vec3(tau, regiaoDasPedras(rho).x, tetoDoCampo(rho, tau, uFracaoDoTier));
  // o Sol dentro da camada: a média de e^(−τ_acima/μ0) na espessura
  float mu0 = max(abs(uDirSolLocal.z) / max(length(uDirSolLocal), 1.0e-9), 0.02);
  float pen = tau > 1.0e-4 ? mu0 / tau * (1.0 - exp(-tau / mu0)) : 1.0;
  float rr = max(length(uCamLocal.xy), 1.001);
  vec3 pHat = vec3(uCamLocal.xy, 0.0) / rr;
  float alfaFase = acos(clamp(dot(normalize(uDirSolLocal), pHat), -1.0, 1.0));
  float fi = (sin(alfaFase) + (PI - alfaFase) * cos(alfaFase)) / PI;
  luz = vec2(sombraDoPlaneta(uCamLocal) * pen, ALBEDO_GEO * fi / (rr * rr));
}
// a luz da multidão na direção dir: o espalhamento simples de uma camada
// espessa vista de raspão (2·fase, a camada de \`camadaDeParticulas\` com μ → 0)
vec3 corDaNevoa(vec3 cor0, vec2 luz, vec3 dir) {
  return cor0 * (2.0 * hgDoAnel(dot(normalize(uDirSolLocal), dir)) * luz.x + 0.35 * luz.y + ${glslF(AMBIENTE_DO_ANEL)});
}
`;

/**
 * O VÉRTICE COMUM às duas formas de desenhar um pedaço: os uniformes, o
 * sorteio e `lugar` — quem é, onde está, se aparece —, os parâmetros da
 * forma e a luz que ele recebe. O PONTO desenha um pedaço por vértice (o
 * fragmento acerta o raio de visada no corpo); a MALHA, os de perto.
 */
/**
 * O QUE O PEDAÇO PASSA DO VÉRTICE AO FRAGMENTO. Na malha LEVE (`PRE_FRAG`,
 * quando há pré-passo) nada disto é varying: é igual no pedaço inteiro, e o
 * custo da malha era o que cada um dos milhares de vértices escrevia; o
 * fragmento lê do pré-passo pelo índice do pedaço (`lerOPedaco`). Os nomes
 * ficam, como variáveis comuns: as contas são as mesmas.
 */
const GLSL_VARYINGS_DO_PEDACO = /* glsl */ `
#if defined(PRE_FRAG)
#define DO_PEDACO
#define FLAT_DO_PEDACO
#else
#define DO_PEDACO varying
#define FLAT_DO_PEDACO flat varying
#endif
DO_PEDACO vec3 vSol;
DO_PEDACO vec3 vGlobo;
DO_PEDACO vec3 vTinta;
DO_PEDACO vec3 vNevoaCor;
DO_PEDACO vec4 vLuz;
DO_PEDACO vec4 vFica;
DO_PEDACO float vLamina;
FLAT_DO_PEDACO vec4 vSemente;
#if defined(MALHA)
// a névoa da câmera (cor, (τ, espessura, teto, peso), luz): o fragmento
// da malha integra a dele pelo próprio raio de visada
FLAT_DO_PEDACO vec3 vNevoaCor0;
FLAT_DO_PEDACO vec4 vNevoaCam;
FLAT_DO_PEDACO vec2 vNevoaLuz;
// o pedaço no quadro do anel e o giro dele para a vista
DO_PEDACO vec3 vNoAnel;
FLAT_DO_PEDACO mat3 vGiroM;
#endif
#if defined(PRE_FRAG)
// o divisor da fase do corpo (\`divisorDaFase\`) varia no pedaço: vai, invertido
varying float vFase;
flat varying int vPedaco;
#endif
`;

/** o giro do pedaço (giro inicial \`q\` e o próprio, em torno de \`eixo\`) — vértice e fragmento */
const GLSL_GIRO_DO_PEDACO = /* glsl */ `
vec3 girarQ(vec4 q, vec3 v) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}
vec3 girarPedaco(vec4 q, vec3 eixo, float c, float s, vec3 v) {
  v = girarQ(q, v);
  return v * c + cross(eixo, v) * s + eixo * dot(eixo, v) * (1.0 - c);
}
`;

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
uniform float uFracaoDoTier;
uniform int uPorOitava;
uniform int uAtivas;
uniform float uPxPorRad;
uniform float uFr[${OITAVAS}];
uniform float uFs[${OITAVAS}];
uniform float uGi[${OITAVAS}];
uniform float uGf[${OITAVAS}];
uniform float uGiro;
// as sombras: (rumo para longe do Sol no plano, sen e, cos e)
uniform vec4 uSombraSol;

${GLSL_VARYINGS_DO_PEDACO}

const float R0 = ${glslF(R0_KM)};
const float K_LADRILHO = ${glslF(K_LADRILHO)};
const float S_MAX = ${glslF(S_MAX_KM)};
const float X_ENTRA = ${glslF(X_ENTRA)};
const float X_PLENO = ${glslF(X_PLENO)};
const float TAU_TETO = ${glslF(TAU_TETO)};
const float ESCALA_EQ = ${glslF(ESCALA_EQUIVALENTE)};
const float X_DO_SOL = ${glslF(X_DO_SOL)};
const float LADO_NO_ARCO[${OITAVAS}] = float[${OITAVAS}](${TABELA_DE_OITAVAS.map((o) => glslF(o.ladoNoArco)).join(', ')});
CONSTANTES_DO_ANEL
SOMBRA_DO_PLANETA
${GLSL_SORTEIO}
${GLSL_PURO_DAS_PEDRAS}
${GLSL_SOMBRA_COMUM}
${GLSL_ESTEIRA}
${GLSL_LUZ_DA_NEVOA}
${GLSL_GIRO_DO_PEDACO}

// o que \`lugar\` deixa para o resto do vértice
int gO;
uint gBase;
float gXo;
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

// FORA DO QUADRO, NADA MAIS: a esfera envolvente contra os quatro planos
// da lente, e o teto das malhas pelo raio na tela — o pedaço em \`gOff\`
bool noQuadro(float raio, float p, float xo) {
  gRaioMundo = length((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  gR = mat3(modelViewMatrix) / gRaioMundo;
  gCV = gR * gOff;
  float rB = 2.5 * raio;
  float p00 = projectionMatrix[0][0];
  float p11 = projectionMatrix[1][1];
  float fz = -gCV.z;
  if (fz < -rB || abs(gCV.x) * p00 - fz > rB * sqrt(p00 * p00 + 1.0)
      || abs(gCV.y) * p11 - fz > rB * sqrt(p11 * p11 + 1.0)) return false;

  gDist = length(gOff);
  gRaio = raio;
  // o raio NA TELA, em px: decide o que se paga (lóbulos, relevo)
  gPx = gRaio * ESCALA_EQ * uPxPorRad / max(fz, gRaio);
  // o teto das malhas pelo tamanho na tela (\`PX_CORTE\`): o mesmo teste nos dois
#if defined(MALHA)
  if (gPx < ${glslF(PX_CORTE)}) return false;
#else
  if (xo < X_CORTE && gPx >= ${glslF(PX_CORTE)}) return false;
#endif
  vFica = vec4(p, gRaio, gPx, 0.0);
  return true;
}

// QUEM É, ONDE ESTÁ E SE APARECE. Falso = nada a desenhar.
bool lugar(int o, int i, ivec2 img) {
  gO = o;
  uint base = misturar(uint(i) ^ (uint(o) << 24));
  gBase = base;
  float s = S_MAX * exp2(-float(o));
  float lado = 2.0 * K_LADRILHO * s;
  // os sorteios do lugar, juntos: h0 = (raio, tamanho), h1 = arco,
  // h2 = altura na camada, e um da densidade
  uint h0 = misturar(base ^ 0x51ed27u);

  // O RAIO: a imagem do pedaço mais perto da câmera, deslocada de \`img\`
  // ladrilhos. O sorteio radial é quantizado em 1/65 536 do ladrilho para o
  // cisalhamento fechar em inteiros (ver o arco).
  uint q = h0 & 0xffffu;
  float a = float(q) / 65536.0;
  float f = uFr[o];
  float dk = floor(f - a + 0.5) + float(img.x);
  float dRho = (dk + a - f) * lado;
  // o alcance da janela no plano (a altura só soma distância): quem fica
  // além dele já no raio sai antes dos outros sorteios
  float alcance2 = exp2(2.0 * X_ENTRA) * s * s;
  if (dRho * dRho >= alcance2) return false;
  uint h1 = misturar(base ^ 0x2c1b3c6du);

  // O ARCO, com o cisalhamento: g·(dk + a) mod 1, com g = gi + gf e a
  // parte inteira de g já reduzida a 65 536 — gi·q em uint é exato.
  float cis = float((uint(uGi[o]) * q) & 0xffffu) / 65536.0 + uGf[o] * (dk + a);
  float dSig = float(h1 >> 8) / 16777216.0 + cis + uFs[o];
  dSig -= floor(dSig + 0.5);
  float dS = (dSig + float(img.y)) * LADO_NO_ARCO[o];
  if (dRho * dRho + dS * dS >= alcance2) return false;
  uint h2 = misturar(base ^ 0x7a3f91c5u);

  // o TAMANHO: o raio a, lei a⁻³ dentro da oitava (inversa da acumulada)
  float raio = 0.5 * s / sqrt(1.0 - 0.75 * float(h0 >> 16) / 65536.0);
  // A CAMADA (\`alturaNaCamada\`): triangular, mais densa no plano
  float rhoKm = uRhoCamKm + dRho;
  vec2 reg = regiaoDasPedras(rhoKm);
  float z0 = (float(h2 & 0xffffu) + float(h2 >> 16) + 1.0) / 65536.0 - 1.0;
  gZ0 = z0;
  float dz = z0 * 0.5 * reg.x * clamp(1.0 - 2.0 * raio / reg.x, 0.0, 1.0) - uZCamKm;

  // A PRESENÇA (\`presencaDaOitava\`), na régua do ladrilho: zero onde o
  // pedaço troca de imagem, e é por isso que nada estala
  float xo = log2(max(sqrt(dRho * dRho + dS * dS + dz * dz), 1.0e-12) / s);
  gXo = xo;
  float p = clamp((X_ENTRA - xo) / (X_ENTRA - X_PLENO), 0.0, 1.0);
  if (p <= 0.0) return false;
#if !defined(PRE_PASSO)
  // FORA DO QUADRO, JÁ AQUI: o cone da lente antes do perfil, da esteira e
  // da luz, no lugar sem a esteira — a folga cobre o empurrão máximo dela,
  // a curvatura do arco (s²/2R0) e o maior corpo, então só sai quem
  // \`noQuadro\` também tiraria
  {
    float rmc = length((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
    vec3 cv = (mat3(modelViewMatrix) / rmc) * (vec3(uEixo, 0.0) * dRho
      + vec3(-uEixo.y, uEixo.x, 0.0) * (dS * (uRhoCamKm + dRho) / R0) + vec3(0.0, 0.0, dz));
    float d2c = dRho * dRho + dS * dS;
    float rF = 2.5 * raio + ${glslF(1.5 * DESLOCAMENTO_MAXIMO_KM)} + 4.0e-6 * d2c + 1.0e-4;
#if defined(SOMBRA)
    // a sombra de quem está fora do quadro pode cair dentro: o rastro inteiro de folga
    rF += (raio + reg.x * uSombraSol.w) / uSombraSol.z;
#endif
    float c00 = projectionMatrix[0][0];
    float c11 = projectionMatrix[1][1];
    if (-cv.z < -rF || abs(cv.x) * c00 + cv.z > rF * sqrt(c00 * c00 + 1.0)
        || abs(cv.y) * c11 + cv.z > rF * sqrt(c11 * c11 + 1.0)) return false;
  }
#endif
  // o PONTO opaco, o que ESMAECE e a MALHA são complementares exatos
#if defined(MALHA)
  if (xo >= X_CORTE) return false;
#elif defined(SOMBRA)
  // a sombra é de todo pedaço presente, opaco ou entrando
#elif defined(ESMAECE)
  if (p >= 1.0) return false;
#else
  if (p < 1.0) return false;
#endif

  // A DENSIDADE do perfil medido (o mesmo do disco), no lugar sorteado
  float u = ((rhoKm / KM_POR_RAIO - R_INT) / (R_EXT - R_INT)) * U_ESCALA + U_BASE;
  gPerfil = (u < 0.0 || u > 1.0) ? vec4(0.0) : textureLod(uMapaAnel, vec2(u, 0.5), 0.0);
  gRegiao = regiaoDoAnel(rhoKm);
  gTau = gPerfil.a < 0.004 ? 0.0 : tauDaOpacidade(gPerfil.a) * gRegiao.z;
  if (float(misturar(base ^ 0x1b873593u) & 0xffffu) / 65536.0 * TAU_TETO * R0 >= gTau * rhoKm) return false;

  // A ESTEIRA: o pedaço anda ao longo da normal das cristas
  if (reg.y > 0.0) {
    float del = reg.y * deslocamentoNoLadrilho(noLadrilho(dRho, dS, rhoKm));
    float arco = arcoDaEsteira(rhoKm);
    dRho += del * EST_NORMAL.x;
    dS += del * EST_NORMAL.y / arco;
    rhoKm = uRhoCamKm + dRho;
  }

  // o lugar, RELATIVO À CÂMERA, sem nenhuma soma de número grande
  // em SÉRIE, não em sin/cos: |θ| < 3e-3 rad, e o sin da GPU (Metal, via
  // ANGLE) devolvia ZERO para ângulo negativo minúsculo
  float dTh = dS / R0;
  float th2 = dTh * dTh;
  float senTh = dTh * (1.0 - th2 / 6.0);
  float umMenosCos = 0.5 * th2 * (1.0 - th2 / 12.0);
  float x = dRho * (1.0 - umMenosCos) - uRhoCamKm * umMenosCos;
  float y = rhoKm * senTh;
  vec3 er = vec3(uEixo, 0.0);
  vec3 et = vec3(-uEixo.y, uEixo.x, 0.0);
  gOff = er * x + et * y + vec3(0.0, 0.0, dz);
#if defined(PRE_PASSO) || defined(SOMBRA)
  // o pré-passo (e a sombra) para aqui: o que vem depois depende da lente
  gRaio = raio;
  vFica = vec4(p, raio, 0.0, 0.0);
  return true;
#else
  return noQuadro(raio, p, xo);
#endif
}

// A FORMA: o BLOCO é o poliedro da variante; o MONTE e o AGREGADO são, de
// longe, a forma de perto filtrada e, na malha, a de perto inteira. Aqui,
// os parâmetros deste pedaço.
vec3 eixosF;
float bloco;
// a escala da área do tipo (\`ESCALA_DO_BLOCO\`, \`ESCALA_DO_MONTE\`), de longe (0) a perto (1)
float escalaDoTipo(float perto) {
  return ESCALA_EQ * (bloco > 0.5
    ? mix(${glslF(ESCALA_DO_BLOCO[0])}, ${glslF(ESCALA_DO_BLOCO[1])}, perto)
    : mix(${glslF(ESCALA_DO_MONTE[0])}, ${glslF(ESCALA_DO_MONTE[1])}, perto)
      * (gVar >= ${VARIANTES} ? ESCALA_DO_AGREGADO[gVar - ${VARIANTES}] : 1.0));
}
vec4 qGiro;
vec3 eixoGiro;
float gCosGiro;
float gSenGiro;
void parametrosDaForma() {
  uint base = gBase;
  vec4 r4 = quatro(misturar(base ^ 0x68e31da4u)); // giro inicial (3)
  vec4 r5 = quatro(misturar(base ^ 0xb5297a4du)); // eixo do giro (2), fase
  vec4 r6 = quatro(misturar(base ^ 0x1b56c4e9u)); // eixos (2), tipo
  // quase todos são agregados (Davis et al. 1984): montes acima de ~2,5 m,
  // agregados de poucos membros abaixo; o bloco é minoria entre os pequenos
  bool pequeno = 2.0 * gRaio <= ${glslF(DIAMETRO_DOS_MONTES_KM)};
  bloco = r6.z < (pequeno ? ${glslF(BLOCOS_ENTRE_OS_PEQUENOS)} : ${glslF(BLOCOS_ENTRE_OS_GRANDES)}) ? 1.0 : 0.0;
  // A FORMA é a da variante: no monte e no agregado, a de perto filtrada
  // (\`formasDeLonge\`, no fragmento do ponto, e a forma \`A\` da malha
  // assada); no bloco, as faces da variante (\`PLANOS\`, no fragmento)
  baseDaForma(bloco > 0.5, pequeno, base);
  // o bloco vai do alongado ao achatado; o monte é mais redondo
  eixosF = bloco > 0.5
    ? vec3(1.0, 0.5 + 0.45 * r6.x, 0.32 + 0.4 * r6.y)
    : vec3(1.0, 0.72 + 0.25 * r6.x, 0.55 + 0.3 * r6.y);
  qGiro = vec4(
    sqrt(1.0 - r4.x) * sin(2.0 * PI * r4.y), sqrt(1.0 - r4.x) * cos(2.0 * PI * r4.y),
    sqrt(r4.x) * sin(2.0 * PI * r4.z), sqrt(r4.x) * cos(2.0 * PI * r4.z)
  );
  // O GIRO PRÓPRIO (\`giroProprio\`): v/a em voltas inteiras por período,
  // em torno de um eixo sorteado
  eixoGiro = direcao(r5.x, r5.y);
  float voltas = max(1.0, floor(${glslF(V_AGITACAO_KM_S * PERIODO_DO_GIRO_S / (2 * Math.PI))} / gRaio + 0.5));
  float angGiro = 2.0 * PI * fract(uGiro * voltas + r5.w);
  gCosGiro = cos(angGiro);
  gSenGiro = sin(angGiro);
  uint hs = misturar(base ^ 0xd3a2646cu);
  // w: 1 + a variante no bloco; −(1 + a variante) no monte e no agregado
  vSemente = vec4(vec3(float(hs & 0x3ffu), float((hs >> 10) & 0x3ffu), float(hs >> 20)) * (37.0 / 1023.0), (1.0 + float(gVar)) * (bloco > 0.5 ? 1.0 : -1.0));
}
// do quadro da pedra para o do anel (giro inicial e giro próprio)
vec3 girar(vec3 v) {
  return girarPedaco(qGiro, eixoGiro, gCosGiro, gSenGiro, v);
}

// A FASE DO CORPO: a curva de fase do anel já é a do campo inteiro; um
// pedaço de Lambert visto a uma fase α mostra só a fração Φ(α) do disco
// aceso — sem devolver isso a fase contaria duas vezes. Teto de 2×.
float divisorDaFase(vec3 vistaKm) {
  float cosA = clamp(dot(vSol, -vistaKm / max(length(vistaKm), 1.0e-30)), -1.0, 1.0);
  float alfaV = acos(cosA);
  return max((sqrt(1.0 - cosA * cosA) + (PI - alfaV) * cosA) / PI, ${glslF(FASE_PISO)});
}
void faseDoCorpo(vec3 vistaKm) {
  vTinta /= divisorDaFase(vistaKm);
}

// A LUZ: Sol com a sombra do globo e o brilho do globo (planetshine), a
// luz do anel em volta, a sombra mútua, a névoa e o albedo deste pedaço
void luzDaPedra(vec3 vistaKm) {
  vec3 pAbs = uCamLocal + gOff / KM_POR_RAIO;
#if !defined(PRE_PASSO)
  vSol = normalize(gR * uDirSolLocal);
  vGlobo = normalize(gR * -pAbs);
#endif
  vec3 razao = gPerfil.rgb / COR_B_DO_PERFIL;
  vec3 tinta = COR_DO_GELO
    * (razao / max(dot(razao, vec3(0.2126, 0.7152, 0.0722)), 1.0e-4));
  if (dot(tinta, tinta) < 1.0e-6) tinta = COR_DO_GELO;
  tinta *= gRegiao.x;
  // O ALBEDO POR PEDAÇO: a cor medida do anel ali, com ±8 % de brilho de
  // um pedaço a outro (mais ou menos poeira no gelo; a média é a de antes,
  // 0,975). O 1,5 = 1 / (2/3): o disco de uma esfera de Lambert em oposição
  // tem média 2/3 do brilho de face — o campo em retro bate com o I/F do disco
  float sujo = float(misturar(gBase ^ 0x3c6ef372u) & 0xffffu) / 65536.0;
  vTinta = tinta * ((1.08 - 0.16 * sujo) * 0.975 * IF_RETRO * 1.5 * uLuzGanho * 0.88);
#if !defined(PRE_PASSO)
  faseDoCorpo(vistaKm);
#endif
  float sombra = sombraDoPlaneta(pAbs);
  float rr = max(length(pAbs.xy), 1.001);
  vec3 pHat = vec3(pAbs.xy, 0.0) / rr;
  float alfaFase = acos(clamp(dot(uDirSolLocal, pHat), -1.0, 1.0));
  float fi = (sin(alfaFase) + (PI - alfaFase) * cos(alfaFase)) / PI;
  float irrGlobo = ALBEDO_GEO * fi / (rr * rr);

  // A LUZ DO ANEL EM VOLTA no lado da noite: o I/F do próprio disco ali,
  // visto de lado (μ = 0,5, fase de 90°), a média do lado aceso e do lado
  // sem luz, apagado com a sombra do globo
  float mu0 = max(abs(uDirSolLocal.z) / max(length(uDirSolLocal), 1.0e-9), 0.02);
  vec2 cA = camadaDeParticulas(gTau, mu0, 0.5, hgDoAnel(0.0), 1.0);
  vec2 cB = camadaDeParticulas(gTau, mu0, 0.5, hgDoAnel(0.0), -1.0);
  vLamina = IF_RETRO * 0.5 * (cA.x * cA.y + cB.x * cB.y) * sombra;

  // O SOL NA CAMADA (\`atenuacaoDoSol\`): e^(−τF/μ0) ÷ a média dela em F
  float z0 = gZ0;
  float cdf = z0 < 0.0 ? 0.5 * (1.0 + z0) * (1.0 + z0) : 1.0 - 0.5 * (1.0 - z0) * (1.0 - z0);
  float F = uDirSolLocal.z >= 0.0 ? 1.0 - cdf : cdf;
  float senE = abs(uDirSolLocal.z) / max(length(uDirSolLocal), 1.0e-9);
  float xSol = min(max(gTau, 0.0) / max(senE, 1.0e-3), X_DO_SOL);
  float mutua = xSol < 1.0e-4 ? 1.0 : exp(-xSol * clamp(F, 0.0, 1.0)) * xSol / (1.0 - exp(-xSol));

  // A NÉVOA entre o pedaço e a lente: os não resolvidos no trecho do raio
  // que corre dentro da camada (\`tauDaNevoa\`), com o peso da névoa
  float nevoa = 0.0;
  vNevoaCor = vec3(0.0);
#if !defined(PRE_PASSO)
  vec3 cor0;
  vec3 cam3;
  vec2 luzN;
  float hc = regiaoDasPedras(uRhoCamKm).x;
  float peso = pesoDaNevoa(uZCamKm, hc);
  if (peso > 0.0) {
    nevoaDaCamera(cor0, cam3, luzN);
#if defined(MALHA)
    // o pedaço grande atravessa muitos graus de elevação: a névoa medida
    // no centro dele o pintava inteiro de uma cor só, de borda dura
    vNevoaCor0 = cor0;
    vNevoaCam = vec4(cam3, peso);
    vNevoaLuz = luzN;
#else
    vec3 dir = gOff / max(gDist, 1.0e-12);
    nevoa = 1.0 - exp(-peso * tauDaNevoa(uZCamKm, dir.z, gDist, cam3.y, cam3.x, cam3.z));
    vNevoaCor = corDaNevoa(cor0, luzN, dir);
#endif
  }
#if defined(MALHA)
  else vNevoaCam = vec4(0.0);
#endif
#endif
  vLuz = vec4(sombra, irrGlobo, mutua, nevoa);
}

#if defined(MALHA)
// O PRÉ-PASSO (\`PedrasDoAnel.prePasso\`): tudo o que é do pedaço e não da
// lente — o lugar com a esteira, a forma e a luz — sai UMA vez por pedaço
// numa textura, em \`PRE_BANDAS\` faixas de um texel; a malha lê em vez de
// refazer a conta em cada um dos seus milhares de vértices. A mesma conta,
// no mesmo float32: o desenho é o mesmo. O texel 0 guarda a névoa da câmera.
uniform highp sampler2D uPre;
uniform int uPrePronto;
vec4 lerPre(int j, int banda) {
  return texelFetch(uPre, ivec2(j % PRE_W, banda * PRE_H + j / PRE_W), 0);
}
#if !defined(PRE_PASSO)
bool lugarPronto(int o, int i, int j) {
  vec4 b0 = lerPre(j, 0);
  if (b0.w <= 0.0) return false;
  gOff = b0.xyz;
  vec4 b3 = lerPre(j, 3);
  gXo = b3.z;
  if (!noQuadro(b3.y, b0.w, b3.z)) return false;
  vec4 b2 = lerPre(j, 2);
  qGiro = lerPre(j, 1);
  eixoGiro = b2.xyz;
  gCosGiro = b2.w;
  gSenGiro = b3.x;
  eixosF = lerPre(j, 4).xyz;
  int codigo = int(b3.w + 0.5);
  gVar = codigo % ${2 * VARIANTES};
  bloco = codigo >= ${2 * VARIANTES} ? 1.0 : 0.0;
  gBase = misturar(uint(i) ^ (uint(o) << 24));
  uint hs = misturar(gBase ^ 0xd3a2646cu);
  vSemente = vec4(vec3(float(hs & 0x3ffu), float((hs >> 10) & 0x3ffu), float(hs >> 20)) * (37.0 / 1023.0), bloco > 0.5 ? 1.0 + float(gVar) : 0.0);
  return true;
}
void luzPronta(vec3 vistaKm, int j) {
  vec3 pAbs = uCamLocal + gOff / KM_POR_RAIO;
  vSol = normalize(gR * uDirSolLocal);
  vGlobo = normalize(gR * -pAbs);
  vec4 b5 = lerPre(j, 5);
  vec4 b6 = lerPre(j, 6);
  vTinta = b5.xyz;
  faseDoCorpo(vistaKm);
  vLamina = lerPre(j, 4).w;
  vNevoaCor = vec3(0.0);
  vec4 n0 = lerPre(0, 0);
  if (n0.w > 0.0) {
    vNevoaCor0 = n0.xyz;
    vNevoaCam = vec4(lerPre(0, 1).xyz, n0.w);
    vNevoaLuz = lerPre(0, 2).xy;
  } else vNevoaCam = vec4(0.0);
  vLuz = vec4(b5.w, b6.x, b6.y, 0.0);
}
#endif
#endif

// A PROFUNDIDADE SÓ DOS PEDAÇOS (\`distanciaDaProfundidade\`): o recorte do
// app fica em 12–32 m (a precisão é para o globo), e o pedaço de
// centímetros só se resolve a poucos metros. A posição na tela é a da
// projeção; o z é escrito à mão pela própria função de profundidade da
// lente com a distância comprimida de [5 cm, 2n] para [n, 2n] — nada é
// cortado, a ordem entre os pedaços fica, e o resto da cena não muda.
vec4 comProfundidade(vec4 pos) {
  float p22 = projectionMatrix[2][2];
  float p32 = projectionMatrix[3][2];
  float n = p32 / (p22 - 1.0);
  float d = pos.w;
  float dMin = ${glslF(PERTO_MINIMO_KM)} * gRaioMundo / KM_POR_RAIO;
  if (d <= 0.0 || d >= 2.0 * n || 2.0 * n <= dMin) return pos;
  float g = mix(${glslF(1 + FOLGA_DO_RECORTE)} * n, 2.0 * n, clamp((d - dMin) / (2.0 * n - dMin), 0.0, 1.0));
  pos.z = (-p22 + p32 / g) * d;
  return pos;
}

void foraComum() {
  vSol = vec3(0.0); vGlobo = vec3(0.0); vTinta = vec3(0.0); vNevoaCor = vec3(0.0);
  vLuz = vec4(0.0); vFica = vec4(0.0); vSemente = vec4(0.0); vLamina = 0.0;
#if defined(MALHA)
  vNevoaCor0 = vec3(0.0); vNevoaCam = vec4(0.0); vNevoaLuz = vec2(0.0);
#endif
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

/**
 * A MALHA DE PERTO: os ids que a CPU escolheu (`aId`, ver
 * `escolherDePerto`), com a forma ASSADA da variante (`assarFormas`): o
 * vértice lê as duas formas pelo `gl_VertexID` e as mistura por `lobos`
 * (zero em x = `X_CORTE` ou no teto de `PX_CORTE`: o mesmo corpo do ponto,
 * nada estala), e põe o pedaço no lugar com o giro e os eixos dele.
 */
const VERT_DA_MALHA = /* glsl */ `
uniform highp sampler2D uFormas;
attribute float aId;
varying vec3 vVista;
varying vec3 vLocal;
varying vec3 vNLocal;
// (oclusão das vizinhas ÷ a média, sujeira do membro, o Sol que a fresta deixa entrar)
varying vec3 vMonte;
// 1 no triângulo com os três vértices no plano de uma face do bloco
varying float vPlano;
${GLSL_PEDRA_COMUM}
uniform int uBase;
// a régua da fresta desta malha (\`normaDoSol\`)
uniform highp sampler3D uNormaDaMalha;
void main() {
  int id = int(aId + 0.5);
  int k = id / uPorOitava;
  int j = 1 + uBase + gl_InstanceID;
#if defined(PRE_FRAG)
  const bool pronto = true;
  vPedaco = j;
#else
  bool pronto = uPrePronto != 0;
#endif
  if (pronto ? !lugarPronto(k, id - k * uPorOitava, j) : !lugar(k, id - k * uPorOitava, ivec2(0))) {
    foraComum(); vVista = vec3(0.0); vNoAnel = vec3(0.0); vLocal = vec3(0.0); vNLocal = vec3(0.0, 0.0, 1.0); vGiroM = mat3(1.0); vMonte = vec3(1.0, 0.5, 1.0); vPlano = 0.0;
#if defined(PRE_FRAG)
    vFase = 1.0;
#endif
    return;
  }
  if (!pronto) parametrosDaForma();
  float lobos = min(clamp(X_CORTE - gXo, 0.0, 1.0), clamp(gPx / ${glslF(PX_CORTE)} - 1.0, 0.0, 1.0));
  int linha = (int(1.0 - bloco) * ${VARIANTES} + gVar) * ${LINHAS_DA_FORMA};
  vec3 uA = texelFetch(uFormas, ivec2(gl_VertexID, linha), 0).xyz;
  vec3 uB = texelFetch(uFormas, ivec2(gl_VertexID, linha + 1), 0).xyz;
  vec3 nA = texelFetch(uFormas, ivec2(gl_VertexID, linha + 2), 0).xyz;
  vec3 nB = texelFetch(uFormas, ivec2(gl_VertexID, linha + 3), 0).xyz;
  vec4 extra = texelFetch(uFormas, ivec2(gl_VertexID, linha + 4), 0);
  vec3 local = mix(uA, uB, lobos) * eixosF;
  vec3 nLocal = normalize(mix(nA, nB, lobos) / eixosF);
  vLocal = local;
  vNLocal = nLocal;
  mat3 giro = gR * mat3(girar(vec3(1.0, 0.0, 0.0)), girar(vec3(0.0, 1.0, 0.0)), girar(vec3(0.0, 0.0, 1.0)));
  vGiroM = giro;
  vec3 pKm = gOff + girar(local) * (gRaio * escalaDoTipo(lobos));
  // PARA A TELA: só a parte LINEAR da matriz — a câmera é a origem da
  // vista, e o deslocamento já é relativo a ela
  vVista = gR * pKm;
  vNoAnel = pKm;
  // a oclusão vai da do ponto (\`formasDeLonge\`, o céu aberto em extra.w)
  // à desta malha (extra.x), com a forma: na troca o pedaço é o mesmo
  vMonte = bloco > 0.5 ? vec3(1.0, 0.5, 1.0)
    : vec3(mix((0.4 + 0.6 * extra.w) / AO_DE_LONGE[gVar / ${VARIANTES}], extra.x, lobos), mix(0.5, extra.y, lobos), 1.0);
  vPlano = bloco < 0.5 ? 0.0 : lobos >= 1.0 ? extra.z : lobos <= 0.0 ? extra.w : extra.z * extra.w;
  gl_Position = comProfundidade(projectionMatrix * vec4(vVista * (gRaioMundo / KM_POR_RAIO), 1.0));
#if defined(PRE_FRAG)
  vSol = normalize(gR * uDirSolLocal);
  vFase = 1.0 / divisorDaFase(vVista);
#else
  if (pronto) luzPronta(vVista, j);
  else luzDaPedra(vVista);
#endif
  // a fresta do agregado: a normal da forma de longe (a envoltória) faz as
  // vezes da direção aberta ao céu; o céu aberto vai do do ponto (extra.w)
  // ao desta malha (extra.z), cada um pela sua régua
  if (bloco < 0.5) {
    float cs = dot(normalize(giro * (nA / eixosF)), vSol);
    // o Sol no quadro da forma (o achatamento desfeito)
    vec3 s = normalize((transpose(giro) * vSol) / eixosF);
    vMonte.z = mix(solDaFresta(uNormaDeLonge, gVar, s, cs, extra.w), solDaFresta(uNormaDaMalha, gVar, s, cs, extra.z), lobos);
  }
}
`;

/**
 * O PRÉ-PASSO DAS MALHAS: um ponto de um pixel por pedaço escolhido (o id
 * vem em \`position.x\`; −1 é a névoa da câmera, no texel 0) e uma instância
 * por faixa da textura. O ponto que não fica escreve zero (\`w\` = 0: a
 * malha não desenha).
 */
const VERT_DO_PRE_PASSO = /* glsl */ `
flat varying vec4 vSaida;
${GLSL_PEDRA_COMUM}
void main() {
  int j = gl_VertexID;
  int banda = gl_InstanceID;
  gl_PointSize = 1.0;
  gl_Position = vec4(
    (float(j % PRE_W) + 0.5) / float(PRE_W) * 2.0 - 1.0,
    (float(banda * PRE_H + j / PRE_W) + 0.5) / float(PRE_BANDAS * PRE_H) * 2.0 - 1.0,
    0.0, 1.0);
  vSaida = vec4(0.0);
  if (position.x < 0.0) {
    float peso = pesoDaNevoa(uZCamKm, regiaoDasPedras(uRhoCamKm).x);
    if (peso > 0.0) {
      vec3 cor0;
      vec3 cam3;
      vec2 luzN;
      nevoaDaCamera(cor0, cam3, luzN);
      vSaida = banda == 0 ? vec4(cor0, peso) : banda == 1 ? vec4(cam3, 0.0) : vec4(luzN, 0.0, 0.0);
    }
    return;
  }
  int id = int(position.x + 0.5);
  int k = id / uPorOitava;
  if (!lugar(k, id - k * uPorOitava, ivec2(0))) return;
  parametrosDaForma();
  luzDaPedra(vec3(0.0));
  if (banda == 0) vSaida = vec4(gOff, vFica.x);
  else if (banda == 1) vSaida = qGiro;
  else if (banda == 2) vSaida = vec4(eixoGiro, gCosGiro);
  else if (banda == 3) vSaida = vec4(gSenGiro, gRaio, gXo, float(gVar) + ${glslF(2 * VARIANTES)} * bloco);
  else if (banda == 4) vSaida = vec4(eixosF, vLamina);
  else if (banda == 5) vSaida = vec4(vTinta, vLuz.x);
  else {
    // a semente do relevo (\`vSemente\`) em duas partes inteiras exatas no float
    uint hs = misturar(gBase ^ 0xd3a2646cu);
    vSaida = vec4(vLuz.y, vLuz.z, float(hs & 0xfffffu), float(hs >> 20));
  }
}
`;

const FRAG_DO_PRE_PASSO = /* glsl */ `
precision highp float;
flat varying vec4 vSaida;
void main() {
  gl_FragColor = vSaida;
}
`;

/**
 * A SOMBRA DE CADA PEDAÇO NA TELA (`colunaDaSombra`): um triângulo por
 * pedaço, no plano médio, cobrindo o rastro dele (com a folga de um pixel e
 * meio); o fragmento soma −ln(1 − k·p·S) numa textura do tamanho do quadro,
 * que o disco lê antes de se desenhar (`sombraDasPedras`). As células são
 * as dos pontos, com a folga do rastro (`acenderSombra`).
 */
const VERT_DA_SOMBRA = /* glsl */ `
attribute float aCelula;
uniform highp sampler2D uPermutacao;
varying vec2 vUV;
varying vec3 vRel;
flat varying vec4 vPar;
flat varying float vOitava;
${GLSL_PEDRA_COMUM}
const ivec2 IMAGENS[${IMAGENS.length}] = ivec2[${IMAGENS.length}](${IMAGENS.map(([r, a]) => `ivec2(${r}, ${a})`).join(', ')});
void main() {
  vUV = vec2(0.0);
  vRel = vec3(0.0);
  vPar = vec4(0.0);
  vOitava = 0.0;
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  int codigo = int(aCelula + 0.5);
  int celula = codigo % ${CELULAS};
  int io = codigo / ${CELULAS};
  int o = io % ${OITAVAS};
  int img = io / ${OITAVAS};
  int k = gl_VertexID / 3;
  int canto = gl_VertexID - 3 * k;
  int p = o * ${PEDRAS_POR_TIER.cinema} + celula * ${CELULA} + k;
  int id = int(texelFetch(uPermutacao, ivec2(p & 511, p >> 9), 0).r + 0.5);
  if (!lugar(o, id, IMAGENS[img])) return;
  float rho = uRhoCamKm + dot(gOff.xy, uEixo);
  float H = regiaoDasPedras(rho).x;
  float somaG = 0.0;
  for (int j = 0; j < ${OITAVAS_DA_SOMBRA}; j++) somaG += uSombraG[j];
  float kp = forcaDaSombra(gTau * tetoDoCampo(rho, gTau, uFracaoDoTier), somaG) * vFica.x;
  if (kp <= 0.0) return;
  float senE = uSombraSol.z;
  float cosE = uSombraSol.w;
  // a altura do centro para o lado do Sol
  float zs = (gOff.z + uZCamKm) * (uDirSolLocal.z >= 0.0 ? 1.0 : -1.0);
  // um pixel e meio no pedaço, km: a folga do filtro do fragmento
  float m = 1.5 * length(gOff) / max(uPxPorRad, 1.0);
  float a = gRaio;
  float u0 = -a * senE - m;
  float u1 = (a + (0.5 * H + zs) * cosE) / senE + m;
  float w = a + m;
  vec2 rumo = uSombraSol.xy;
  // o nível de detalhe (\`pesoDaSombra\`): sem triângulo se nem o ponto mais
  // perto do rastro chega à largura mínima — a largura cai como ~1/d² na
  // vista rasante, e perto (d < 2·rastro) não se corta
  float extensao = u1 - u0 + 2.0 * w;
  vec3 pc = vec3(gOff.xy, -uZCamKm);
  float dc = length(pc);
  if (dc > 2.0 * extensao) {
    float perto = dc / (dc - extensao);
    if (larguraDaSombra(o, ladoDaSombraNaTela(pc, rumo, senE, uPxPorRad)) * perto * perto < ${glslF(SOMBRA_PX_SOME)}) return;
  }
  // e o peso inteiro sem conta no fragmento quando a largura passa do teto
  // em todo o rastro: o piso de \`ladoDaSombraNaTela\` é |ŵz|/(σ₁·sen e)
  // por px/d, com σ₁ ≤ √(1 + 1/sen²e) e d ≤ dc + extensão
  float dMax = dc + extensao;
  float ladoMin = uZCamKm * uPxPorRad / (dMax * dMax * sqrt(senE * senE + 1.0));
  vOitava = larguraDaSombra(o, abs(ladoMin)) >= ${glslF(SOMBRA_PX_INTEIRA)} ? -1.0 : float(o);
  // o triângulo que cobre o retângulo [u0, u1] × [−w, w]
  vec2 uv = canto == 0 ? vec2(u0, -w) : canto == 1 ? vec2(2.0 * u1 - u0, -w) : vec2(u0, 3.0 * w);
  vec3 P = vec3(gOff.xy + rumo * uv.x + vec2(-rumo.y, rumo.x) * uv.y, -uZCamKm);
  vRel = P;
  float raioMundo = length((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  gl_Position = projectionMatrix * vec4((mat3(modelViewMatrix) / raioMundo * P) * (raioMundo / KM_POR_RAIO), 1.0);
  vUV = uv;
  vPar = vec4(a, zs, H, kp);
}
`;

const FRAG_DA_SOMBRA = /* glsl */ `
precision highp float;
uniform vec4 uSombraSol;
uniform float uPxPorRad;
varying vec2 vUV;
varying vec3 vRel;
flat varying vec4 vPar;
flat varying float vOitava;
${GLSL_PESO_DA_SOMBRA}
// a primitiva de √(a² − t²)
float areaDoCorte(float t, float a) {
  float c = clamp(t, -a, a);
  return 0.5 * (c * sqrt(max(a * a - c * c, 0.0)) + a * a * asin(clamp(c / a, -1.0, 1.0)));
}
void main() {
  float a = vPar.x;
  if (vPar.w <= 0.0 || a <= 0.0) discard;
  // a meia largura do cilindro na média do pixel em v (o rastro mais fino
  // que o pixel fica mais largo e mais fraco, com a mesma área)
  float wv = fwidth(vUV.y);
  float b = wv < 1.0e-3 * a
    ? sqrt(max(a * a - vUV.y * vUV.y, 0.0))
    : (areaDoCorte(vUV.y + 0.5 * wv, a) - areaDoCorte(vUV.y - 0.5 * wv, a)) / wv;
  if (b <= 0.0) discard;
  float senE = uSombraSol.z;
  float c = max(uSombraSol.w, 1.0e-3);
  float zs = vPar.y;
  float H = vPar.z;
  float lo = max(zs + (-b - vUV.x * senE) / c, -0.5 * H);
  float hi = min(min(zs + (b - vUV.x * senE) / c, zs + vUV.x * c / senE), 0.5 * H);
  float S = max(hi - lo, 0.0) / H;
  if (S <= 0.0) discard;
  // o nível de detalhe no ponto do plano deste pixel: a mesma função que o disco usa na média E
  float peso = vOitava < 0.0 ? 1.0 : pesoDaSombra(larguraDaSombra(int(vOitava + 0.5), ladoDaSombraNaTela(vRel, uSombraSol.xy, uSombraSol.z, uPxPorRad)));
  if (peso <= 0.0) discard;
  gl_FragColor = vec4(-log(max(1.0 - vPar.w * peso * S, 1.0e-4)), 0.0, 0.0, 1.0);
}
`;

/** a textura do pré-passo: largura e faixas (uma por \`vec4\` do pedaço) */
const PRE_W = 256;
const PRE_BANDAS = 7;

/**
 * O ponto é desenhado CRU (\`RawShaderMaterial\`): no fragmento, a diretiva
 * da profundidade que só cresce (\`EXT_conservative_depth\`) tem de vir antes
 * de qualquer declaração, e o prefixo do three começa por elas. Este é o
 * prefixo dele, o que os shaders do ponto usam.
 */
const PREFIXO_CRU = /* glsl */ `
precision highp float;
precision highp int;
${['sampler2D', 'samplerCube', 'sampler3D', 'sampler2DArray', 'sampler2DShadow', 'samplerCubeShadow', 'sampler2DArrayShadow']
  .concat(['isampler', 'usampler'].flatMap((s) => ['2D', '3D', 'Cube', '2DArray'].map((d) => s + d)))
  .map((s) => `precision highp ${s};`)
  .join('\n')}
#define texture2D texture
`;
const PREFIXO_DO_VERTICE_CRU = /* glsl */ `${PREFIXO_CRU}
#define attribute in
#define varying out
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
in vec3 position;
`;

/**
 * O PONTO: um pedaço por vértice, o quadrado do tamanho dele na tela — o
 * desenho barato de todos os que ficam além de x = `X_CORTE`. As oitavas vêm
 * da mais FINA para a mais grossa (as finas moram mais perto). O fragmento
 * recebe o corpo inteiro (centro, giro, eixos e as faces do bloco) e acerta
 * nele o raio de visada. Com `ESMAECE`, só os que estão entrando (opacidade
 * < 1), misturados por cima do disco.
 */
const VERT_DO_PONTO = /* glsl */ `${PREFIXO_DO_VERTICE_CRU}
flat varying vec3 vCentro;
flat varying mat3 vGiro;
flat varying vec3 vEixos;
flat varying vec4 vProj;
// do km da vista para a unidade do mundo
flat varying float vMundo;
${GLSL_PEDRA_COMUM}
// a célula: (imagem·OITAVAS + oitava)·CELULAS + célula; o id, pela permutação
in float aCelula;
uniform highp sampler2D uPermutacao;
const ivec2 IMAGENS[${IMAGENS.length}] = ivec2[${IMAGENS.length}](${IMAGENS.map(([r, a]) => `ivec2(${r}, ${a})`).join(', ')});
void main() {
  // o vértice é (célula, pedaço da célula); a CPU escolheu as células
  int codigo = int(aCelula + 0.5);
  int celula = codigo % ${CELULAS};
  int io = codigo / ${CELULAS};
  int o = io % ${OITAVAS};
  int img = io / ${OITAVAS};
  int p = o * ${PEDRAS_POR_TIER.cinema} + celula * ${CELULA} + gl_VertexID;
  int id = int(texelFetch(uPermutacao, ivec2(p & 511, p >> 9), 0).r + 0.5);
  if (!lugar(o, id, IMAGENS[img])) {
    foraComum(); gl_PointSize = 0.0;
    return;
  }
  parametrosDaForma();
  float raioI = gRaio * escalaDoTipo(0.0);
  vCentro = gCV;
  // o giro inteiro, do quadro da pedra para a vista
  vGiro = gR * mat3(girar(vec3(1.0, 0.0, 0.0)), girar(vec3(0.0, 1.0, 0.0)), girar(vec3(0.0, 0.0, 1.0)));
  vEixos = eixosF;
  vProj = vec4(projectionMatrix[0][0], projectionMatrix[1][1], projectionMatrix[2][0], projectionMatrix[2][1]);
  vMundo = gRaioMundo / KM_POR_RAIO;
  // o quadrado cobre a forma de longe inteira (\`RAIO_DE_LONGE\`)
  float raioQ = raioI * RAIO_DE_LONGE;
  // a posição é a do centro; a profundidade, a da FRENTE da esfera que
  // envolve o corpo (a mesma conta do fragmento): nenhum pixel acertado fica
  // mais perto que ela, e é o que deixa a GPU descartar antes de sombrear
  // (\`depth_greater\`); o fragmento escreve a do ponto acertado
  gl_Position = projectionMatrix * vec4(gCV * vMundo, 1.0);
  float p22 = projectionMatrix[2][2];
  float p32 = projectionMatrix[3][2];
  float pn = p32 / (p22 - 1.0);
  float pMin = ${glslF(PERTO_MINIMO_KM)} * vMundo;
  // (a meia espessura dela ao longo da visada: a esfera achatada e girada)
  float frente = raioQ * length(vEixos * vec3(vGiro[0][2], vGiro[1][2], vGiro[2][2]));
  float pd = max((-gCV.z - ${glslF(1.02)} * frente) * vMundo, 0.5 * pMin);
  if (pd < 2.0 * pn && 2.0 * pn > pMin)
    pd = mix(${glslF(1 + FOLGA_DO_RECORTE)} * pn, 2.0 * pn, clamp((pd - pMin) / (2.0 * pn - pMin), 0.0, 1.0));
  gl_Position.z = max(p32 / pd - p22, -1.0) * gl_Position.w;
  // o teto de 48 px da casa (POINTS acima de 64 trava o Mac)
  gl_PointSize = min(2.0 * raioQ * uPxPorRad / max(-gCV.z, raioQ) + 1.5, 48.0);
  luzDaPedra(gCV);
  vFica.w = raioI;
}
`;

const FRAG_COMUM = /* glsl */ `
precision highp float;
precision highp int;
${GLSL_VARYINGS_DO_PEDACO}
const float ENVOLVE = ${glslF(ENVOLVE)};
const float AMBIENTE_DO_ANEL = ${glslF(AMBIENTE_DO_ANEL)};
const float PISO_DA_NOITE = ${glslF(PISO_DA_NOITE)};
// o polo do anel na vista (a luz do anel em volta chega pelo plano dele)
uniform vec3 uPoloVista;
const vec3 COR_DE_SATURNO = vec3(${COR_DE_SATURNO.join(', ')});
uniform highp sampler3D uRelevo;
CAMADA_DO_ANEL
ASSADOS_DAS_PEDRAS
float envolver(float c) { return max((c + ENVOLVE) / (1.0 + ENVOLVE), 0.0); }

// O GRÃO SÓLIDO (\`texturaDoRelevo\`): as cúpulas de grão e a inclinação
// delas, lidas em 3D no quadro da pedra (sem projeção: nada estica);
// \`esc\` em grãos por raio. Devolve a inclinação (xyz) e a fresta (w: a
// altura menos a média, pela força — negativa na fresta). O grão de 8 a
// 4 px se apaga pela PEGADA dele na tela.
vec4 relevo(vec3 p, float esc, float amp) {
  vec3 c = p * esc;
  float pegada = max(length(dFdx(c)), length(dFdy(c)));
  float forca = 1.0 - smoothstep(${glslF(1 / 8)}, ${glslF(1 / 4)}, pegada);
  vec4 t = texture(uRelevo, c / ${glslF(CELULAS_DO_RELEVO)});
  return vec4((amp * forca * ${glslF(2 * INCLINACAO_DO_GRAO)}) * (t.gba - 0.5), forca * (t.r - ALTURA_MEDIA_DO_GRAO));
}

// A COR DE UM PIXEL DO PEDAÇO: \`vista\` o ponto em km na vista, \`p\` o ponto
// no quadro da pedra (raio ~1), \`nl0\` a normal lisa nesse quadro, \`giro\`
// do quadro da pedra para a vista, \`ao\` a oclusão das vizinhas (já
// dividida pela média), \`sujo\` o gelo do membro.
vec3 sombrear(vec3 vista, vec3 p, vec3 nl0, mat3 giro, float ao, float sujo, float sol) {
  vec3 v = -vista / max(length(vista), 1.0e-30);
  bool bloco = vSemente.w > 0.5;
  vec3 q = p + vSemente.xyz;
  vec3 nb = nl0;
  // O GRÃO: o pedaço é feito de pedaços menores, até o centímetro (a lei
  // dos tamanhos medida segue abaixo do que a malha resolve) — o empedrado
  // em três escalas presas ao tamanho do pedaço (\`ESCALAS_DO_GRAO\` grãos
  // por raio), na normal e no escuro das frestas. O bloco, gelo único, tem
  // só a geada fina (as duas escalas menores, rasas). O pedaço de poucos px
  // (\`vFica.z\`, o raio na tela) não paga grão: cada escala só entra a
  // partir de 2× os grãos por raio, em px — abaixo disso a pegada dela passa
  // de 1/4 e a força já é zero (com folga de 2× para a perspectiva)
  float fresta = 0.0;
  if (vFica.z > (bloco ? ${glslF(2 * ESCALAS_DO_GRAO[1])} : ${glslF(2 * ESCALAS_DO_GRAO[0])})) {
    vec4 g = bloco ? vec4(0.0)
      : relevo(q, ${glslF(ESCALAS_DO_GRAO[0])}, ${glslF(ALTURA_DO_GRAO)});
    if (vFica.z > ${glslF(2 * ESCALAS_DO_GRAO[1])}) g += relevo(q.zxy + vSemente.zxy, ${glslF(ESCALAS_DO_GRAO[1])},
      (bloco ? 0.25 : 1.0) * ${glslF(ALTURA_DO_GRAO)}).yzxw;
    if (vFica.z > ${glslF(2 * ESCALAS_DO_GRAO[2])}) g += relevo(q.yzx + vSemente.yzx, ${glslF(ESCALAS_DO_GRAO[2])},
      (bloco ? 0.25 : 1.0) * ${glslF(ALTURA_DO_GRAO)}).zxyw;
    // DE RASPÃO o relevo da normal mente (sem o grão esconder o de trás, a
    // cúpula vista de lado vira risco): ele cede abaixo de ~20° da face
    // (salvaguarda minha, não medida)
    g *= smoothstep(0.08, 0.35, abs(dot(normalize(giro * nl0), v)));
    nb -= g.xyz - dot(g.xyz, nl0) * nl0;
    fresta = (bloco ? 0.25 : 1.0) * g.w;
  }
  // A LUZ pela normal com grão SEM normalizar: o comprimento dela é a área
  // da encosta do grão sobre a da face (lei da área projetada), e a média
  // de dot(nU, s) na face é a de dot(nl0, s) — o grão redistribui a luz,
  // não tira (normalizada, ela escurecia o pedaço ~10 % com o Sol de frente)
  vec3 nU = giro * nb;
  vec3 n = normalize(nU);
  // o gelo de cada membro (±8 %, a média de antes) e o escuro das frestas
  // (média 1: a altura do grão menos a média dela)
  vec3 tintaM = vec3((bloco ? 1.0 : 0.985 * (0.92 + 0.16 * sujo)) * max(1.0 + ${glslF(ESCURO_DA_FRESTA)} * fresta, 0.3));

  float nl = dot(nU, vSol);
  // retroespalhamento: a fase do próprio anel (1 em retro), com o surto
  // de oposição do gelo
  float cosV = clamp(dot(vSol, v), -1.0, 1.0);
  float fase = hgDoAnel(-cosV) * (1.0 + 0.3 * exp(-sqrt(max(2.0 * (1.0 - cosV), 0.0)) / 0.05));
  // o terminador DURO: a luz que entra pelo gelo sai azulada só na beira
  float dif = envolver(nl);
  vec3 tom = mix(vec3(0.82, 0.93, 1.1), vec3(1.0), smoothstep(-0.05, 0.25, nl));
  vec3 albedo = vTinta * tintaM * ao;
  // o Sol na camada (vLuz.z, \`atenuacaoDoSol\`) e o que a fresta do
  // próprio agregado deixa entrar (\`sol\`, \`solAberto\`) pesam só no Sol direto
  dif *= sol;
  vec3 cor = albedo * tom * (dif * fase * vLuz.x * vLuz.z);
  // (sem brilho especular: o gelo do anel é fosco, coberto de grão — o
  // surto de oposição acima é o brilho que ele tem)
  // o globo (cor quente) e o ambiente do anel
  cor += albedo * COR_DE_SATURNO * (envolver(dot(nU, vGlobo)) * vLuz.y);
  cor += albedo * (AMBIENTE_DO_ANEL * (0.25 + 0.75 * vLuz.x) + PISO_DA_NOITE);
  // a luz do anel em volta onde o Sol não chega — no lado da noite e na
  // penumbra do fundo da camada (\`vLamina\`, o I/F do disco ali)
  cor += albedo * (vLamina * (1.0 - 0.6 * abs(dot(n, uPoloVista))) * (1.0 - min(dif * min(vLuz.z, 1.0), 1.0)));
  // de dentro da camada, a multidão entre o pedaço e a lente
  return mix(cor, vNevoaCor, vLuz.w);
}
`;

/**
 * O FRAGMENTO DA MALHA. Na face de fratura do bloco a normal é a do plano
 * (a derivada da posição: a face sai lisa e a aresta, dura).
 */
const FRAG_DA_MALHA = /* glsl */ `
${FRAG_COMUM}
uniform vec3 uDirSolLocal;
uniform float uZCamKm;
varying vec3 vVista;
varying vec3 vLocal;
varying vec3 vNLocal;
varying vec3 vMonte;
varying float vPlano;
${GLSL_PURO_DAS_PEDRAS}
${GLSL_LUZ_DA_NEVOA.slice(GLSL_LUZ_DA_NEVOA.indexOf('// a luz da multidão'))}
#if defined(PRE_FRAG)
// O PEDAÇO PELO PRÉ-PASSO: as mesmas contas que o vértice fazia (\`noQuadro\`,
// \`lugarPronto\`, \`luzPronta\`, o giro), agora uma vez por pixel
uniform highp sampler2D uPre;
uniform mat4 modelViewMatrix;
uniform vec3 uCamLocal;
uniform float uPxPorRad;
${GLSL_GIRO_DO_PEDACO}
vec4 lerPre(int j, int banda) {
  return texelFetch(uPre, ivec2(j % PRE_W, banda * PRE_H + j / PRE_W), 0);
}
void lerOPedaco() {
  int j = vPedaco;
  vec4 b0 = lerPre(j, 0);
  vec4 b1 = lerPre(j, 1);
  vec4 b2 = lerPre(j, 2);
  vec4 b3 = lerPre(j, 3);
  vec4 b4 = lerPre(j, 4);
  vec4 b5 = lerPre(j, 5);
  vec4 b6 = lerPre(j, 6);
  float raioMundo = length((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  mat3 gR = mat3(modelViewMatrix) / raioMundo;
  vec3 cv = gR * b0.xyz;
  vFica = vec4(b0.w, b3.y, b3.y * ${glslF(ESCALA_EQUIVALENTE)} * uPxPorRad / max(-cv.z, b3.y), 0.0);
  vSol = normalize(gR * uDirSolLocal);
  vGlobo = normalize(gR * -(uCamLocal + b0.xyz / ${glslF(KM_POR_RAIO)}));
  vTinta = b5.xyz * vFase;
  vLamina = b4.w;
  vNevoaCor = vec3(0.0);
  vLuz = vec4(b5.w, b6.x, b6.y, 0.0);
  int codigo = int(b3.w + 0.5);
  uint hs = uint(b6.z) | (uint(b6.w) << 20);
  vSemente = vec4(vec3(float(hs & 0x3ffu), float((hs >> 10) & 0x3ffu), float(hs >> 20)) * (37.0 / 1023.0), codigo >= ${2 * VARIANTES} ? 1.0 + float(codigo % ${2 * VARIANTES}) : 0.0);
  vec4 n0 = lerPre(0, 0);
  if (n0.w > 0.0) {
    vNevoaCor0 = n0.xyz;
    vNevoaCam = vec4(lerPre(0, 1).xyz, n0.w);
    vNevoaLuz = lerPre(0, 2).xy;
  } else vNevoaCam = vec4(0.0);
  vGiroM = gR * mat3(girarPedaco(b1, b2.xyz, b2.w, b3.x, vec3(1.0, 0.0, 0.0)),
    girarPedaco(b1, b2.xyz, b2.w, b3.x, vec3(0.0, 1.0, 0.0)),
    girarPedaco(b1, b2.xyz, b2.w, b3.x, vec3(0.0, 0.0, 1.0)));
  // o ponto no quadro do anel: a vista girada de volta (gR é ortonormal)
  vNoAnel = vVista * gR;
}
#endif
void main() {
#if defined(PRE_FRAG)
  lerOPedaco();
#endif
  // NA FACE de fratura, a normal é a do plano dos três vértices: a beira
  // da face segue a linha dos vértices levados à aresta, sem os dentes que
  // a normal interpolada de um triângulo meio dentro, meio fora fazia
  vec3 nl0 = normalize(vNLocal);
  vec3 nPlano = cross(dFdx(vLocal), dFdy(vLocal));
  if (vPlano > 0.999 && dot(nPlano, nPlano) > 0.0) {
    nPlano = normalize(nPlano);
    nl0 = dot(nPlano, nl0) < 0.0 ? -nPlano : nPlano;
  }
  vec3 cor = sombrear(vVista, vLocal, nl0, vGiroM, vMonte.x, vMonte.y, vMonte.z);
  // A NÉVOA entre a lente e ESTE ponto do pedaço, pelo raio de visada dele
  // (\`tauDaNevoa\`, a mesma conta da casca): macia com a elevação
  if (vNevoaCam.w > 0.0) {
    float L = length(vNoAnel);
    vec3 dir = vNoAnel / max(L, 1.0e-30);
    float a = 1.0 - exp(-vNevoaCam.w * tauDaNevoa(uZCamKm, dir.z, L, vNevoaCam.y, vNevoaCam.x, vNevoaCam.z));
    cor = mix(cor, corDaNevoa(vNevoaCor0, vNevoaLuz, dir), a);
  }
  gl_FragColor = vec4(cor, 1.0);
}
`;

const FRAG_DO_PONTO = /* glsl */ `
PROFUNDIDADE_SO_CRESCE
${PREFIXO_CRU}
#define varying in
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
${FRAG_COMUM}
uniform vec4 uTela;
uniform mat4 projectionMatrix;
flat varying vec3 vCentro;
flat varying mat3 vGiro;
flat varying vec3 vEixos;
flat varying vec4 vProj;
// do km da vista para a unidade do mundo
flat varying float vMundo;
uniform sampler2D uLonge;
// A FORMA DE LONGE (\`formasDeLonge\`) na direção d, da linha da variante:
// (a normal, o raio); a linha + ${2 * VARIANTES} traz o céu aberto (x)
vec4 deLonge(int linha, vec3 d) {
  vec2 p = d.xy / (abs(d.x) + abs(d.y) + abs(d.z));
  if (d.z < 0.0) p = (1.0 - abs(p.yx)) * vec2(p.x >= 0.0 ? 1.0 : -1.0, p.y >= 0.0 ? 1.0 : -1.0);
  const float N = ${glslF(LADO_DE_LONGE)};
  vec2 s = clamp((p * 0.5 + 0.5) * N - 0.5, 0.0, N - 1.0);
  return texture(uLonge, vec2((s.x + 0.5) / N, (float(linha) * N + s.y + 0.5) / ${glslF(4 * VARIANTES * LADO_DE_LONGE)}));
}
void main() {
  // o RAIO DE VISADA deste pixel, na vista (a câmera na origem)
  vec2 ndc = (gl_FragCoord.xy - uTela.xy) / uTela.zw * 2.0 - 1.0;
  vec3 d = normalize(vec3((ndc.x + vProj.z) / vProj.x, (ndc.y + vProj.w) / vProj.y, -1.0));
  mat3 Mt = transpose(vGiro);
  float t;
  vec3 c;
  if (vFica.z < ${glslF(PX_DA_ESFERA)}) {
    // O GRÃO DE POUCOS PX: a esfera de raio a, a de MESMA seção média do
    // corpo (\`ESCALA_EQUIVALENTE\`), sem a marcha até a forma; a oclusão e a
    // fresta pela média (1) — o mesmo brilho médio, sem o desenho da forma,
    // que a essa escala não se resolve
    float bs = dot(vCentro, d);
    float ds = bs * bs - dot(vCentro, vCentro) + vFica.y * vFica.y;
    if (ds < 0.0) discard;
    t = bs - sqrt(ds);
    vec3 nv = (d * t - vCentro) / vFica.y;
    c = sombrear(d * t, (Mt * nv) * (vFica.y / vFica.w), Mt * nv, vGiro, 1.0, 0.5, 1.0);
  } else {
  // no quadro da pedra, com o achatamento desfeito: a esfera unitária
  // (o envelope; o bloco é o poliedro dentro dela)
  vec3 qo = (Mt * -vCentro) / vFica.w / vEixos;
  vec3 qd = (Mt * d) / vFica.w / vEixos;
  float a = dot(qd, qd);
  float b = dot(qo, qd);
  float disc = b * b - a * (dot(qo, qo) - 1.0);
  // longe do corpo (o canto do quadrado), nada a sombrear
  if (dot(qo, qo) - b * b / a > 1.6 * RAIO_DE_LONGE * RAIO_DE_LONGE) discard;
  float t0 = (-b - sqrt(max(disc, 0.0))) / a;
  float t1 = (-b + sqrt(max(disc, 0.0))) / a;
  vec3 nq = qo + t0 * qd;
  bool acerta;
  float ao = 1.0;
  float sol = 1.0;
  if (vSemente.w > 0.5) {
    // o BLOCO de longe: o poliedro da variante (\`planosDoBloco\`), dentro
    // da esfera unitária
    int v0 = (int(vSemente.w + 0.5) - 1) * ${PLANOS_DO_BLOCO[1]};
    for (int k = 0; k < ${PLANOS_DO_BLOCO[1]}; k++) {
      vec4 c = PLANOS[v0 + k];
      float nd = dot(c.xyz, qd);
      float no = dot(c.xyz, qo);
      float tp = (c.w - no) / (abs(nd) > 1.0e-12 ? nd : 1.0e-12);
      if (nd < 0.0) { if (tp > t0) { t0 = tp; nq = c.xyz; } }
      else t1 = min(t1, tp);
    }
    acerta = disc >= 0.0 && t0 <= t1;
  } else {
    // o MONTE e o AGREGADO de longe: o corpo estrelado do mapa da forma de
    // longe. O raio de visada anda da entrada na esfera que o envolve até
    // o ponto mais perto do centro, em seis passos, e o primeiro ponto
    // dentro do corpo é refinado por três bissecções
    int linha = int(-vSemente.w + 0.5) - 1;
    float dR = b * b - a * (dot(qo, qo) - RAIO_DE_LONGE * RAIO_DE_LONGE);
    float tIn = (-b - sqrt(max(dR, 0.0))) / a;
    float tA = tIn;
    float tB = -b / a;
    vec4 m = vec4(0.0, 0.0, 1.0, 1.0);
    acerta = false;
    for (int k = 1; k <= 6 && dR >= 0.0; k++) {
      float tk = mix(tIn, -b / a, float(k) / 6.0);
      m = deLonge(linha, qo + tk * qd);
      if (length(qo + tk * qd) <= m.w) { acerta = true; tB = tk; break; }
      tA = tk;
    }
    for (int k = 0; k < 3 && acerta; k++) {
      float tm = 0.5 * (tA + tB);
      vec4 mm = deLonge(linha, qo + tm * qd);
      if (length(qo + tm * qd) <= mm.w) { tB = tm; m = mm; } else tA = tm;
    }
    t0 = tB;
    nq = normalize(m.xyz);
    float vis = clamp(deLonge(linha + ${2 * VARIANTES}, qo + tB * qd).x, 0.0, 1.0);
    // a oclusão das vizinhas pela fração de céu aberto (a mesma conta das
    // malhas, ÷ a média do tipo) e o Sol que a fresta deixa entrar
    ao = (0.4 + 0.6 * vis) / AO_DE_LONGE[linha / ${VARIANTES}];
    sol = solDaFresta(uNormaDeLonge, linha, normalize((Mt * vSol) / vEixos), dot(normalize(vGiro * (nq / vEixos)), vSol), vis);
  }
  // fora do corpo, o ponto mais perto do raio: a textura do relevo segue
  // lisa no quadrado de pixels da borda (o descarte vem depois)
  // sem grão (\`sombrear\`) ninguém pede derivada ao vizinho: quem não
  // acerta sai já
  if (!acerta && vFica.z <= ${glslF(2 * ESCALAS_DO_GRAO[0])}) discard;
  t = acerta ? t0 : -b / a;
  vec3 q = qo + t * qd;
  if (!acerta) nq = q;
  c = sombrear(d * t, q * vEixos, normalize(nq / vEixos), vGiro, ao, 0.5, sol);
  if (!acerta) discard;
  }
  // A PROFUNDIDADE DO PONTO ACERTADO, não a do centro (\`comProfundidade\`):
  // com a do centro, o vizinho menor cujo centro está mais perto da lente
  // se pintava por cima do pedaço inteiro — as manchas mais escuras do
  // ponto que a malha não tinha
  float pd = -d.z * t * vMundo;
  float p22 = projectionMatrix[2][2];
  float p32 = projectionMatrix[3][2];
  float pn = p32 / (p22 - 1.0);
  float pMin = ${glslF(PERTO_MINIMO_KM)} * vMundo;
  if (pd > 0.0 && pd < 2.0 * pn && 2.0 * pn > pMin)
    pd = mix(${glslF(1 + FOLGA_DO_RECORTE)} * pn, 2.0 * pn, clamp((pd - pMin) / (2.0 * pn - pMin), 0.0, 1.0));
  gl_FragDepth = 0.5 * (p32 / max(pd, 1.0e-30) - p22) + 0.5;
  // a opacidade da entrada (1 no ponto opaco; o que esmaece mistura)
  gl_FragColor = vec4(c, vFica.x);
}
`;

/**
 * A CESSÃO DO DISCO EM GLSL — entra no `ANEL_FRAG` salvo com `?pedras=0`.
 * `uCamDasPedras` = (ρ da câmera em km, θ dela, altura em km, a fração do
 * campo que o tier desenha — 0 com os pedaços fora do desenho). A distância
 * é a da régua do ladrilho, como no vértice. O disco cede só o que os
 * pedaços de fato carregam: a parte das oitavas resolvidas ali, até o teto
 * do campo (no B o resto fica nele). De dentro da camada ele passa a vez à
 * névoa (`pesoDaNevoa`).
 */
export const GLSL_CESSAO_DAS_PEDRAS = /* glsl */ `
uniform vec4 uCamDasPedras;
varying vec3 vRelDasPedras;
${GLSL_PURO_DAS_PEDRAS}
float cederAsPedras(float alfa, float tau) {
  if (uCamDasPedras.w <= 0.0) return alfa;
  // o ponto RELATIVO À CÂMERA (\`ANEL_VERT_DAS_PEDRAS\`), nos eixos dela:
  // o vPos do disco só tem ~15 m de precisão a 2 raios, e a 20 m de altura
  // isso desenhava a cessão em blocos
  vec2 er = vec2(cos(uCamDasPedras.y), sin(uCamDasPedras.y));
  float x = dot(vRelDasPedras.xy, er);
  float y = dot(vRelDasPedras.xy, vec2(-er.y, er.x));
  float rhoC = uCamDasPedras.x;
  float rKm = length(vec2(rhoC + x, y));
  float dRho = (x * (2.0 * rhoC + x) + y * y) / (rKm + rhoC);
  float dS = P_R0 * atan(y, rhoC + x);
  float d = sqrt(dRho * dRho + dS * dS + uCamDasPedras.z * uCamDasPedras.z);
  float f = cessaoDasPedras(d) * tetoDoCampo(rKm, tau, uCamDasPedras.w);
  float a = f <= 0.0 ? alfa : 1.0 - pow(max(1.0 - alfa, 1.0e-4), 1.0 - f);
  // \`alfaComANevoa\` na CPU: a passagem disco → névoa (8 a 32 m do plano) reparte a PROFUNDIDADE
  // ÓPTICA, não o alfa: o disco fica com (1 − peso)·τ e a névoa com peso·τ,
  // e as transmissões se multiplicam. Repartir o alfa deixava vazar até ~25 %
  // no meio da passagem com os dois opacos (g1: 3,3 % a 5° de visada, a 20 m
  // do plano, contra 0,9 %)
  float peso = pesoDaNevoa(uCamDasPedras.z, regiaoDasPedras(uCamDasPedras.x).x);
  return peso <= 0.0 ? a : 1.0 - pow(max(1.0 - a, 1.0e-4), 1.0 - peso);
}
// A SOMBRA DOS PEDAÇOS SOBRE A LUZ DIRETA DO DISCO: T/e^(−E), com T da
// textura das sombras (−ln T, \`VERT_DA_SOMBRA\`) e E a média dela
// (\`esperadoDaSombra\`). As presenças são as de quem faz sombra AQUI: os
// pedaços do lado do Sol, a até (H/2)·cot e — três pontos no meio de terços
// iguais do trecho (a altura do pedaço tomada no plano: aproximação minha)
${GLSL_SOMBRA_COMUM}
uniform highp sampler2D uSombraDasPedras;
// (ligada, (H/2)·cot e com o H da câmera, Σ G_o, —) e (o rumo para longe do Sol no plano, sen e, px por radiano da máscara)
uniform vec4 uSombraNoDisco;
uniform vec4 uSombraRumo;
float sombraDasPedras(float tau) {
  if (uSombraNoDisco.x <= 0.0) return 1.0;
  ivec2 px = ivec2(gl_FragCoord.xy);
  ivec2 n = textureSize(uSombraDasPedras, 0);
  if (px.x >= n.x || px.y >= n.y) return 1.0;
  vec2 q = vRelDasPedras.xy;
  // o nível de detalhe no ponto deste pixel, como no triângulo da máscara:
  // onde nem a sombra da oitava maior chega à largura mínima, a máscara
  // também não tem nada e tudo fica na conta estatística
  float lado = ladoDaSombraNaTela(vec3(q, uCamDasPedras.z), uSombraRumo.xy, uSombraRumo.z, uSombraRumo.w);
  if (larguraDaSombra(0, lado) <= ${glslF(SOMBRA_PX_SOME)}) return 1.0;
  float gp[${OITAVAS_DA_SOMBRA}];
  for (int o = 0; o < ${OITAVAS_DA_SOMBRA}; o++) gp[o] = uSombraG[o] * pesoDaSombra(larguraDaSombra(o, lado));
  float od = texelFetch(uSombraDasPedras, px, 0).r;
  vec2 er = vec2(cos(uCamDasPedras.y), sin(uCamDasPedras.y));
  float rKm = length(vec2(uCamDasPedras.x + dot(q, er), dot(q, vec2(-er.y, er.x))));
  float campo = tau * tetoDoCampo(rKm, tau, uCamDasPedras.w);
  float t0 = uSombraNoDisco.y;
  float z2 = uCamDasPedras.z * uCamDasPedras.z;
  float s = 0.0;
  for (int j = 0; j < 3; j++) {
    vec2 qj = q - uSombraRumo.xy * (t0 * (2.0 * float(j) + 1.0) / 6.0);
    s += presencasDaSombra(sqrt(dot(qj, qj) + z2), gp);
  }
  float esperado = forcaDaSombra(campo, uSombraNoDisco.z) * campo * P_FRACAO * s / 3.0;
  return exp(esperado - od);
}
`;

/** os uniformes do disco para a sombra dos pedaços (`sombraDasPedras`): o gigante os cria, `PedrasDoAnel.sombraNoDisco` os enche */
export function uniformesDaSombraNoDisco(): Record<string, THREE.IUniform> {
  return {
    uSombraDasPedras: { value: null },
    uSombraNoDisco: { value: new THREE.Vector4() },
    uSombraRumo: { value: new THREE.Vector4(1, 0, 1, 0) },
    uSombraG: { value: new Float32Array(OITAVAS_DA_SOMBRA) },
  };
}

/**
 * O VÉRTICE DO DISCO com as pedras (sem `?pedras=0`): o de sempre (`ANEL_VERT`) mais o
 * ponto relativo à câmera em km, com a câmera em duas partes (a parte
 * float32 e o resto, da CPU em dupla precisão) — a cessão lê a distância
 * à câmera sem os ~15 m de grão do vPos.
 */
export const ANEL_VERT_DAS_PEDRAS = /* glsl */ `
uniform vec3 uCamAltaDasPedras;
uniform vec3 uCamRestoDasPedras;
varying vec3 vPos;
varying vec3 vRelDasPedras;
flat varying vec4 vProjDoDisco;
flat varying vec4 vProfDoDisco;
flat varying vec3 vPoloDoDisco;
void main() {
  vPos = position;
  vRelDasPedras = (position - uCamAltaDasPedras) * ${glslF(KM_POR_RAIO)} - uCamRestoDasPedras;
  // o que \`profundidadeDoDisco\` lê: a lente, a altura da câmera (km), a
  // unidade do mundo por km e o polo do anel na vista
  vProjDoDisco = vec4(projectionMatrix[0][0], projectionMatrix[1][1], projectionMatrix[2][0], projectionMatrix[2][1]);
  float raioMundo = length(mat3(modelViewMatrix)[0]);
  vProfDoDisco = vec4(projectionMatrix[2][2], projectionMatrix[3][2],
    raioMundo / ${glslF(KM_POR_RAIO)}, uCamAltaDasPedras.z * ${glslF(KM_POR_RAIO)} + uCamRestoDasPedras.z);
  vPoloDoDisco = normalize(mat3(modelViewMatrix) * vec3(0.0, 0.0, 1.0));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * A PROFUNDIDADE DO DISCO, do raio de visada do pixel (g1, 16/11). O near
 * acompanha a câmera rente ao anel (mm a m) e o far vai à galáxia: com os
 * vértices do disco a milhares de km, o z do recorte (w − 2n) perde o 2n no
 * float32, e o triângulo cortado pelo near sai com a profundidade perto de
 * 1 — a do globo. Medido: o disco OPACO à força, a 520 m do plano, deixava
 * passar 47 % de Saturno a 1° de visada (contra 0 %), em manchas que seguem
 * o arredondamento da profundidade do globo. A conta daqui é a dos pedaços
 * (\`FRAG_DO_PONTO\`): o ponto do plano z = 0 no raio deste pixel, a
 * distância à lente dele e a mesma compressão perto do near — o disco e os
 * pedaços se ordenam pela mesma régua. Sem o raio no plano (de raspão no
 * float) fica a profundidade do vértice.
 *
 * O GLOBO NA FRENTE vai por conta: além de n/6·10⁻⁸ (67 km com o near de
 * 4 mm) qualquer profundidade arredonda para 1, a do globo também, e o anel
 * de trás passaria por cima dele. O segmento lente→ponto que toca o
 * elipsoide (o achatamento \`uKPolar\`, a mesma conta de \`sombraDoPlaneta\`)
 * é descartado.
 */
export const GLSL_PROFUNDIDADE_DO_DISCO = /* glsl */ `
uniform vec4 uTelaDoDisco;
flat varying vec4 vProjDoDisco;
flat varying vec4 vProfDoDisco;
flat varying vec3 vPoloDoDisco;
bool globoNaFrente(vec3 ponto) {
  float k = max(uKPolar, 1.0e-4);
  vec3 o = vec3(uCamLocal.xy, uCamLocal.z / k);
  vec3 s = vec3(ponto.xy, ponto.z / k) - o;
  float a = dot(s, s);
  float b = dot(o, s);
  float disc = b * b - a * (dot(o, o) - 1.0);
  if (disc <= 0.0 || a <= 0.0) return false;
  float t = (-b - sqrt(disc)) / a;
  return t > 0.0 && t < 1.0;
}
void profundidadeDoDisco() {
  gl_FragDepth = gl_FragCoord.z;
  if (uTelaDoDisco.z <= 0.0) return;
  vec2 ndc = (gl_FragCoord.xy - uTelaDoDisco.xy) / uTelaDoDisco.zw * 2.0 - 1.0;
  vec3 d = normalize(vec3((ndc.x + vProjDoDisco.z) / vProjDoDisco.x, (ndc.y + vProjDoDisco.w) / vProjDoDisco.y, -1.0));
  // até o plano: t km ao longo do raio (a câmera a vProfDoDisco.w km dele)
  float t = -vProfDoDisco.w / dot(d, vPoloDoDisco);
  if (!(t > 0.0) || t > 1.0e9) return;
  float pd = -d.z * t * vProfDoDisco.z;
  float p22 = vProfDoDisco.x;
  float p32 = vProfDoDisco.y;
  float pn = p32 / (p22 - 1.0);
  float pMin = ${glslF(PERTO_MINIMO_KM)} * vProfDoDisco.z;
  if (pd > 0.0 && pd < 2.0 * pn && 2.0 * pn > pMin)
    pd = mix(${glslF(1 + FOLGA_DO_RECORTE)} * pn, 2.0 * pn, clamp((pd - pMin) / (2.0 * pn - pMin), 0.0, 1.0));
  gl_FragDepth = 0.5 * (p32 / max(pd, 1.0e-30) - p22) + 0.5;
}
`;

/**
 * AS ESTEIRAS NO DISCO: abaixo de `H_ESTEIRA_KM` o disco mostra as mesmas
 * esteiras que os pedaços desenham, antes de qualquer pedaço se resolver. O
 * vPos do disco só tem ~15 m de precisão a 2 raios — menos que um quarto
 * de esteira —, então quem desenha é uma FOLHA centrada na câmera, com as
 * coordenadas relativas a ela: a folha MULTIPLICA a luz que o disco já pôs
 * no quadro pela razão entre o brilho da camada com τ·D e com τ (τ o que o
 * disco guarda ali depois da cessão, D a densidade da esteira), apagada
 * quando o espaçamento cai de 8 para 4 px nos dois eixos. Ela mora do
 * OUTRO lado da camada (`uFundoFolha`, além do maior pedaço), sobre o mesmo
 * raio de visada: todo pedaço fica na frente dela, e só o disco é tocado.
 */
const VERT_DA_FOLHA = /* glsl */ `
uniform vec2 uEixo;
uniform float uRhoCamKm;
uniform float uZCamKm;
uniform float uRaioFolha;
uniform float uFundoFolha;
varying vec2 vGrao;
varying vec3 vRel;
CONSTANTES_DO_ANEL
void main() {
  // o ponto do PLANO do anel, relativo à câmera, sem subtrair números grandes
  vec2 xy = position.xy * uRaioFolha;
  float rhoKm = length(vec2(uRhoCamKm + xy.x, xy.y));
  float dRho = (xy.x * (2.0 * uRhoCamKm + xy.x) + xy.y * xy.y) / (rhoKm + uRhoCamKm);
  vGrao = vec2(dRho, ${glslF(R0_KM)} * atan(xy.y, uRhoCamKm + xy.x));
  vRel = vec3(xy, -uZCamKm);
  // e a folha no fundo, no mesmo raio de visada
  float t = uZCamKm / (uZCamKm - uFundoFolha);
  vec3 er = vec3(uEixo, 0.0);
  vec3 et = vec3(-uEixo.y, uEixo.x, 0.0);
  vec3 off = (er * xy.x + et * xy.y) / t + vec3(0.0, 0.0, uFundoFolha - uZCamKm);
  float raioMundo = length((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  mat3 R = mat3(modelViewMatrix) / raioMundo;
  gl_Position = projectionMatrix * vec4((R * off) * (raioMundo / KM_POR_RAIO), 1.0);
}
`;

const FRAG_DA_FOLHA = /* glsl */ `
precision highp float;
precision highp int;
uniform sampler2D uMapaAnel;
uniform vec3 uDirSolLocal;
uniform float uRhoCamKm;
uniform float uZCamKm;
uniform float uFracaoDoTier;
uniform float uForcaEsteira;
varying vec2 vGrao;
varying vec3 vRel;
CONSTANTES_DO_ANEL
${GLSL_SORTEIO}
${GLSL_PURO_DAS_PEDRAS}
${GLSL_ESTEIRA}
void main() {
  float rhoKm = uRhoCamKm + vGrao.x;
  vec2 reg = regiaoDasPedras(rhoKm);
  // A PEGADA do pixel atravessando as cristas, nos dois eixos da tela
  float xi = vGrao.x * EST_NORMAL.x + vGrao.y * arcoDaEsteira(rhoKm) * EST_NORMAL.y;
  float pegada = abs(dFdx(xi)) + abs(dFdy(xi));
  float amp = reg.y * uForcaEsteira * (1.0 - smoothstep(0.125, 0.25, pegada / LAMBDA));
  float u = ((rhoKm / KM_POR_RAIO - R_INT) / (R_EXT - R_INT)) * U_ESCALA + U_BASE;
  vec4 perfil = (u < 0.0 || u > 1.0) ? vec4(0.0) : textureLod(uMapaAnel, vec2(u, 0.5), 0.0);
  if (amp <= 0.0 || perfil.a < 0.004) discard;
  float D = densidadeDaEsteira(noLadrilho(vGrao.x, vGrao.y, rhoKm), amp);
  float tau = tauDaOpacidade(perfil.a) * regiaoDoAnel(rhoKm).z;
  float d = sqrt(vGrao.x * vGrao.x + vGrao.y * vGrao.y + uZCamKm * uZCamKm);
  float td = tau * (1.0 - cessaoDasPedras(d) * tetoDoCampo(rhoKm, tau, uFracaoDoTier));
  float mu0 = max(abs(uDirSolLocal.z) / max(length(uDirSolLocal), 1.0e-9), 0.02);
  float mu = max(abs(vRel.z) / max(length(vRel), 1.0e-9), 0.02);
  float lado = uDirSolLocal.z * uZCamKm;
  vec2 c0 = camadaDeParticulas(td, mu0, mu, 1.0, lado);
  vec2 c1 = camadaDeParticulas(td * D, mu0, mu, 1.0, lado);
  float m = c1.x * c1.y / max(c0.x * c0.y, 1.0e-6);
  // o disco já está no quadro: 2·cor·destino (a mistura multiplica)
  gl_FragColor = vec4(vec3(0.5 * clamp(m, 0.0, 2.0)), 1.0);
}
`;

/** o alcance da folha: além de ~30 alturas ela já está de raspão e apagada */
export function raioDaFolhaKm(alturaKm: number): number {
  return Math.max(40, 30 * Math.abs(alturaKm));
}

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

/**
 * A CASCA DA NÉVOA: uma esfera de `RAIO_DA_NEVOA_KM` em volta da câmera,
 * vista por dentro, atrás de todos os pedaços desenhados. Cada pixel integra
 * a névoa do seu raio de visada (`tauDaNevoa`) até o alcance: lisa, sem
 * pontilhado; olhando para cima ou para baixo ela some, no horizonte da
 * camada ela fecha.
 */
const VERT_DA_NEVOA = /* glsl */ `
uniform sampler2D uMapaAnel;
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uRhoCamKm;
uniform float uLuzGanho;
uniform float uKPolar;
uniform float uSolAngRad;
uniform float uFracaoDoTier;
varying vec3 vDir;
flat varying vec3 vCor0;
flat varying vec3 vCamada;
flat varying vec2 vLuzN;
CONSTANTES_DO_ANEL
SOMBRA_DO_PLANETA
const float PI = 3.14159265358979;
${GLSL_PURO_DAS_PEDRAS}
${GLSL_LUZ_DA_NEVOA}
void main() {
  vDir = position;
  nevoaDaCamera(vCor0, vCamada, vLuzN);
  float raioMundo = length((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  mat3 R = mat3(modelViewMatrix) / raioMundo;
  gl_Position = projectionMatrix * vec4((R * (position * ${glslF(RAIO_DA_NEVOA_KM)})) * (raioMundo / KM_POR_RAIO), 1.0);
}
`;

const FRAG_DA_NEVOA = /* glsl */ `
precision highp float;
uniform vec3 uDirSolLocal;
uniform float uZCamKm;
varying vec3 vDir;
flat varying vec3 vCor0;
flat varying vec3 vCamada;
flat varying vec2 vLuzN;
CAMADA_DO_ANEL
${GLSL_PURO_DAS_PEDRAS}
${GLSL_LUZ_DA_NEVOA.slice(GLSL_LUZ_DA_NEVOA.indexOf('// a luz da multidão'))}
void main() {
  vec3 d = normalize(vDir);
  float a = 1.0 - exp(-pesoDaNevoa(uZCamKm, vCamada.y)
    * tauDaNevoa(uZCamKm, d.z, ${glslF(ALCANCE_DA_NEVOA_KM)}, vCamada.y, vCamada.x, vCamada.z));
  if (a <= 0.0) discard;
  gl_FragColor = vec4(corDaNevoa(vCor0, vLuzN, d), a);
}
`;

/** O que o corpo entrega por quadro — o quadro da lajota, mais o relógio. */
export interface QuadroDasPedras {
  dirSolLocal: THREE.Vector3;
  /** a câmera no frame do anel, em raios equatoriais */
  camLocal: THREE.Vector3;
  luzGanho: number;
  solAngRad: number;
  kPolar: number;
  tier: QualityLevel;
  /** o relógio do app (dia juliano) — o cisalhamento anda com ele */
  jd: number;
  /** o Atlas escolheu o planeta (15/11): o assado anda em fatias mesmo de longe */
  destinoDoAtlas?: boolean;
  /** o destino do Atlas é o ponto do anel: fatias largas, e nunca de uma vez */
  anelNoDestino?: boolean;
}

export interface OpcoesDasPedras {
  glslSombraDoPlaneta: string;
  /** `GLSL_CONSTANTES_DO_ANEL` */
  glslConstantesDoAnel: string;
  /** `GLSL_REGIAO_DO_ANEL` (traz `KM_POR_RAIO` e `regiaoDoAnel`) */
  glslRegiaoDoAnel: string;
  /** `GLSL_CAMADA_DO_ANEL` (`tauDaOpacidade`, `hgDoAnel`) */
  glslCamadaDoAnel: string;
  rInt: number;
  rExt: number;
  /** a régua do perfil (`U_PERFIL_ESCALA`, `U_PERFIL_BASE`) e o fator de τ da região (`regiaoDoAnelCpu`) */
  uEscala: number;
  uBase: number;
  fatorTau: (km: number) => number;
}

/** a faixa de raio em que os pedaços podem existir (`ANEL_DE_SATURNO.pedacos`) */
const RAIO_MIN_KM = ANEL_DE_SATURNO.pedacos.rhoMinKm;
const RAIO_MAX_KM = ANEL_DE_SATURNO.pedacos.rhoMaxKm;
/**
 * O GATILHO DO ASSADO (nível de detalhe): a câmera a menos disto da faixa
 * de raio dos pedaços (~11 raios de Saturno). As esteiras do disco acendem
 * a 25 km do plano e os pedaços a ~5 km, mas a câmera do filme solar vai
 * de 2 400 km a 25 km em ~5 s, e o assado leva ~1,6 s de CPU em fatias de
 * ~8 ms: 200 quadros, mais de 10 s a 20 fps. Daqui o filme tem ~14 s (do
 * começo do ato até as esteiras); quem só olha Saturno de perto paga as
 * fatias, nunca uma trava.
 */
const GATILHO_DO_ASSADO_KM = 700_000;
/** a CPU que o assado toma por quadro, ms (`assarUmPouco`) */
export const FATIA_DO_ASSADO_MS = 8;
/**
 * A FATIA DA CHEGADA AO ANEL, ms (15/11): com o ponto do anel por destino
 * (o botão "Anéis" da ficha, o `?foco=aneis-de-saturno`), o que falta do
 * assado corre pela rampa da câmera e depois dela, nunca num quadro só —
 * os pedaços entram alguns décimos de segundo depois, e até lá o disco
 * não lhes cede nada (`cessao.w`), então não há buraco. O quadro fica
 * perto dos 50 ms em vez do segundo inteiro de tela parada.
 */
export const FATIA_DA_CHEGADA_MS = 30;
/** a distância da câmera à faixa de raio dos pedaços, no plano do anel, km */
function distanciaDoAnelKm(rhoKm: number, zKm: number): number {
  return Math.hypot(Math.max(RAIO_MIN_KM - rhoKm, rhoKm - RAIO_MAX_KM, 0), zKm);
}

/**
 * AS MALHAS DE PERTO, pelo `detail` do icosaedro do three (3 → 162
 * vértices, 7 → 642, 19 → 4002), cada uma a partir do seu raio NA TELA, em
 * px (a CPU escolhe a primeira que serve): a volta do pedaço fica em
 * ~20, 40 e 100 lados, e o lado do triângulo não passa de ~6 px até 100 px
 * de raio. Pela distância em tamanhos (x) o pedaço de 100 px saía com 40
 * lados, e a aresta das faces e o contorno saíam em degraus. O custo do
 * quadro é o número de vértices que a GPU invoca, então só os ids que a
 * CPU escolheu ganham malha.
 */
const MALHAS: readonly { detalhe: number; px: number }[] = [
  { detalhe: 19, px: 40 },
  { detalhe: 7, px: 14 },
  { detalhe: 3, px: 0 },
];
/** a folga da escolha da CPU sobre o corte (a GPU faz a conta em float32) */
const FOLGA_DA_ESCOLHA = 1.03;
/** o id cabe abaixo disto na chave da ordem (10 oitavas × 16 384 < 2¹⁸) */
const CHAVE = 2 ** 18;
/** a folga do cone da lente na CPU, em rad (a câmera lida pode ser a do quadro anterior) */
const FOLGA_DO_CONE = 0.12;

/** os ids de uma oitava ordenados pelo sorteio radial — estático, uma vez */
interface OrdemDaOitava {
  q: Uint16Array;
  i: Uint16Array;
  /** o raio a ÷ s (o sorteio de tamanho do vértice) */
  raio: Float32Array;
  arco: Float64Array;
  z0: Float32Array;
}

function* ordemDaOitava(o: number): Passos<OrdemDaOitava> {
  const n = PEDRAS_POR_TIER.cinema;
  const q = new Uint16Array(n);
  const raio = new Float32Array(n);
  const arco = new Float64Array(n);
  const z0 = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const base = misturar((i ^ (o << 24)) >>> 0);
    const h0 = misturar((base ^ 0x51ed27) >>> 0);
    q[i] = h0 & 0xffff;
    raio[i] = 0.5 / Math.sqrt(1 - (0.75 * (h0 >>> 16)) / 65536);
    arco[i] = (misturar((base ^ 0x2c1b3c6d) >>> 0) >>> 8) / 16777216;
    const h2 = misturar((base ^ 0x7a3f91c5) >>> 0);
    z0[i] = ((h2 & 0xffff) + (h2 >>> 16) + 1) / 65536 - 1;
  }
  yield;
  const ids = Array.from({ length: n }, (_, i) => i).sort((x, y) => q[x]! - q[y]!);
  yield;
  return {
    q: Uint16Array.from(ids, (i) => q[i]!),
    i: Uint16Array.from(ids),
    raio: Float32Array.from(ids, (i) => raio[i]!),
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

/**
 * AS FORMAS ASSADAS (quinta volta). A forma de perto saía do vértice — doze
 * membros, lóbulos, cortes e dezenas de sorteios em cada um dos vértices de
 * cada pedra, quadro a quadro: ~1 ms por malha com poucas centenas de
 * instâncias. Agora ela é assada UMA VEZ, na mesma receita, em
 * `VARIANTES` blocos e `VARIANTES` montes; cada pedra sorteia a variante e
 * fica com o giro e a escala não uniforme (os eixos) dela. O vértice só lê
 * a forma (`texelFetch` pelo `gl_VertexID`) e a põe no lugar.
 *
 * Cada variante guarda as DUAS formas: a do ponto (`A`: o bloco com as
 * quatro faces, o monte com o miolo e as três grandes — o mesmo corpo que o
 * fragmento do ponto acerta) e a de perto (`B`: o poliedro do bloco; os
 * doze membros e os submembros que a malha resolve). O vértice mistura as
 * duas pela mesma lei de antes (`lobos`): nada estala na troca.
 */

function quatro(h: number): [number, number, number, number] {
  return [(h & 0xff) / 255, ((h >>> 8) & 0xff) / 255, ((h >>> 16) & 0xff) / 255, (h >>> 24) / 255];
}
function direcao(z01: number, a01: number): [number, number, number] {
  const z = 2 * z01 - 1;
  const a = 2 * Math.PI * a01;
  const s = Math.sqrt(Math.max(1 - z * z, 0));
  return [s * Math.cos(a), s * Math.sin(a), z];
}
/** `membro` do GLSL, bit a bit: (cx, cy, cz, raio), e a sujeira do membro (assada) */
export function membro(base: number, k: number): number[] {
  const h = misturar((base ^ ((0x632be5ab + Math.imul(k, 0x9e3779b9)) >>> 0)) >>> 0);
  const r = quatro(h);
  let dist: number;
  let raio: number;
  if (k === 0) { dist = 0.1 * r[2]; raio = 0.5 + 0.06 * r[3]; }
  else if (k < 4) { dist = 0.42 + 0.12 * r[2]; raio = 0.36 + 0.14 * r[3]; }
  else if (k < 8) { dist = 0.55 + 0.1 * r[2]; raio = 0.2 + 0.1 * r[3]; }
  else { raio = 0.09 + 0.07 * r[3]; dist = 0.5 + 0.6 * raio + 0.05 * r[2]; }
  const h2 = misturar(h);
  const d = direcao(r[0], r[1]);
  return [d[0] * dist * 1.12, d[1] * dist * 1.12, d[2] * dist * 1.12, raio * 1.12, (h2 >>> 16) / 65535];
}
/** a semente da forma da variante v (`baseDaForma` no GLSL) */
export function baseDaVariante(bloco: boolean, v: number): number {
  return misturar((v + (bloco ? BASE_DO_BLOCO : BASE_DO_MONTE)) >>> 0);
}
function girarPorQuaternio(q: number[], v: number[]): number[] {
  const [x, y, z, w] = q as [number, number, number, number];
  const t = [
    2 * (y * v[2]! - z * v[1]!),
    2 * (z * v[0]! - x * v[2]!),
    2 * (x * v[1]! - y * v[0]!),
  ];
  return [
    v[0]! + w * t[0]! + y * t[2]! - z * t[1]!,
    v[1]! + w * t[1]! + z * t[0]! - x * t[2]!,
    v[2]! + w * t[2]! + x * t[1]! - y * t[0]!,
  ];
}
function planosDoBloco(vb: number): number[][] {
  const r0 = quatro(misturar((vb ^ 0x7f4a7c15) >>> 0));
  const n =
    PLANOS_DO_BLOCO[0] +
    Math.min(
      Math.floor(r0[0] * (PLANOS_DO_BLOCO[1] - PLANOS_DO_BLOCO[0] + 1)),
      PLANOS_DO_BLOCO[1] - PLANOS_DO_BLOCO[0],
    );
  const q = [
    Math.sqrt(1 - r0[1]) * Math.sin(2 * Math.PI * r0[2]),
    Math.sqrt(1 - r0[1]) * Math.cos(2 * Math.PI * r0[2]),
    Math.sqrt(r0[1]) * Math.sin(2 * Math.PI * r0[3]),
    Math.sqrt(r0[1]) * Math.cos(2 * Math.PI * r0[3]),
  ];
  const c: number[][] = [];
  for (let k = 0; k < n; k++) {
    const r = quatro(
      misturar((vb ^ ((0x2c1b3c6d + Math.imul(k, 0x297a2d39)) >>> 0)) >>> 0),
    );
    const z = 1 - (2 * (k + 0.5)) / n;
    const a = k * 2.399963;
    const s = Math.sqrt(1 - z * z);
    const base = girarPorQuaternio(q, [s * Math.cos(a), s * Math.sin(a), z]);
    const sac = direcao(r[0], r[1]);
    c.push([
      ...unir([0, 1, 2].map((j) => base[j]! + 0.4 * sac[j]!)),
      0.7 + 0.3 * r[2],
    ]);
  }
  // os cantos: os encontros de três faces que as outras não cortam
  let rMax = 0;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let e = b + 1; e < n; e++) {
        const [A, B, C] = [c[a]!, c[b]!, c[e]!];
        const bc = [
          B[1]! * C[2]! - B[2]! * C[1]!,
          B[2]! * C[0]! - B[0]! * C[2]!,
          B[0]! * C[1]! - B[1]! * C[0]!,
        ];
        const det = A[0]! * bc[0]! + A[1]! * bc[1]! + A[2]! * bc[2]!;
        if (Math.abs(det) < 1e-9) continue;
        const ca = [
          C[1]! * A[2]! - C[2]! * A[1]!,
          C[2]! * A[0]! - C[0]! * A[2]!,
          C[0]! * A[1]! - C[1]! * A[0]!,
        ];
        const ab = [
          A[1]! * B[2]! - A[2]! * B[1]!,
          A[2]! * B[0]! - A[0]! * B[2]!,
          A[0]! * B[1]! - A[1]! * B[0]!,
        ];
        const x = [0, 1, 2].map(
          (j) => (A[3]! * bc[j]! + B[3]! * ca[j]! + C[3]! * ab[j]!) / det,
        );
        if (
          c.every(
            (p) =>
              p[0]! * x[0]! + p[1]! * x[1]! + p[2]! * x[2]! <= p[3]! + 1e-9,
          )
        )
          rMax = Math.max(rMax, Math.hypot(x[0]!, x[1]!, x[2]!));
      }
  for (const p of c) p[3] = p[3]! / rMax;
  return c;
}
/**
 * O BLOCO na direção d: o mínimo suave das faces (de longe, `p` infinito: o
 * mínimo), a normal do gradiente e a face dona
 */
function raioDoPoliedro(d: number[], planos: number[][], p = P_DA_ARESTA) {
  if (!Number.isFinite(p)) {
    let r = Infinity;
    let dono = -1;
    planos.forEach((c, k) => {
      const kc = dot3(d, c);
      if (kc > 1e-9 && c[3]! / kc < r) {
        r = c[3]! / kc;
        dono = k;
      }
    });
    return { r, n: planos[dono]!.slice(0, 3), dono, abaulado: 0 };
  }
  let s = 0;
  let melhor = 0;
  let segunda = 0;
  let dono = -1;
  const g = [0, 0, 0];
  planos.forEach((c, k) => {
    const t = dot3(d, c) / c[3]!;
    if (t <= 0) return;
    const tp = t ** (p - 1);
    s += tp * t;
    for (let j = 0; j < 3; j++) g[j]! += (tp * c[j]!) / c[3]!;
    if (t > melhor) {
      segunda = melhor;
      melhor = t;
      dono = k;
    } else if (t > segunda) segunda = t;
  });
  // o abaulado: zero na aresta (as duas faces mais perto empatam), cheio
  // no meio da face
  const meio = Math.min(Math.max((1 - segunda / melhor) / 0.3, 0), 1);
  return { r: s ** (-1 / p), n: unir(g), dono, abaulado: meio * meio * (3 - 2 * meio) };
}
/** o ruído de valor da CPU (o relevo da silhueta do bloco), em [0, 1] */
function ruidoCPU(x: number, y: number, z: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const s = (t: number) => t * t * (3 - 2 * t);
  const fx = s(x - ix), fy = s(y - iy), fz = s(z - iz);
  const h = (a: number, b: number, c: number) =>
    misturar((Math.imul(a, 0x8da6b343) ^ Math.imul(b, 0xd8163841) ^ Math.imul(c, 0xcb1ab31f)) >>> 0) / 4294967296;
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(
    l(l(h(ix, iy, iz), h(ix + 1, iy, iz), fx), l(h(ix, iy + 1, iz), h(ix + 1, iy + 1, iz), fx), fy),
    l(l(h(ix, iy, iz + 1), h(ix + 1, iy, iz + 1), fx), l(h(ix, iy + 1, iz + 1), h(ix + 1, iy + 1, iz + 1), fx), fy),
    fz
  );
}
function dot3(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
}
function unir(v: number[]): number[] {
  const l = Math.hypot(v[0]!, v[1]!, v[2]!) || 1;
  return [v[0]! / l, v[1]! / l, v[2]! / l];
}

/** O MONTE na direção d: o máximo suave (p = 16 de longe) das saídas pelas bolas, com a normal analítica */
function raioDoMonte(d: number[], mm: number[][], p = 16) {
  let s = 0;
  let melhor = -1;
  let dono = 0;
  const g = [0, 0, 0];
  mm.forEach((m, k) => {
    if (m[3]! <= 0) return;
    const b = dot3(d, m);
    const disc = b * b - dot3(m, m) + m[3]! * m[3]!;
    const raiz = Math.sqrt(Math.abs(disc));
    const sg = Math.sign(disc);
    const f = b + sg * raiz;
    if (f <= 0) return;
    if (f > melhor) {
      melhor = f;
      dono = k;
    }
    const fp = f ** p;
    s += fp;
    const w = (fp / f) * (1 + (sg * b) / Math.max(raiz, 0.08));
    for (let j = 0; j < 3; j++) g[j]! += w * m[j]!;
  });
  const r = Math.max(s, 1e-30) ** (1 / p);
  const k = r / Math.max(s, 1e-30);
  const gd = dot3(g, d) * k;
  let n = unir([0, 1, 2].map((j) => d[j]! - (g[j]! * k - gd * d[j]!) / r));
  if (dot3(n, d) < 0.05) n = d;
  return { r, n, dono };
}

/**
 * AS ARESTAS NAS LINHAS (sexta volta): os vértices do icosaedro não caem
 * onde dois planos de fratura se encontram (nem onde o plano encontra o
 * casco), e a aresta saía em DEGRAUS, de vértice em vértice. Em cada aresta
 * da malha cujas pontas caem em partes diferentes da forma, a fronteira é
 * achada por bissecção no arco entre elas, e a ponta mais perto dela vai
 * para lá (cada vértice anda uma vez só). A aresta da pedra passa a correr
 * por vértices. Só na hora de assar: nenhum custo por quadro.
 */
function* arestasNasLinhas(ds: number[][], idx: ArrayLike<number>, rotulo: (d: number[]) => number): Passos<{
  dirs: number[][];
  movido: boolean[];
}> {
  const dirs = ds.map((d) => d.slice());
  const movido = ds.map(() => false);
  const rot = ds.map(rotulo);
  yield;
  const vistas = new Set<number>();
  const n = ds.length;
  for (let j = 0; j < idx.length; j += 3) {
    if (j % 3072 === 3069) yield;
    for (let e = 0; e < 3; e++) {
      const a = idx[j + e]!;
      const b = idx[j + ((e + 1) % 3)]!;
      const chave = Math.min(a, b) * n + Math.max(a, b);
      if (vistas.has(chave) || rot[a] === rot[b]) continue;
      vistas.add(chave);
      const da = ds[a]!;
      const db = ds[b]!;
      const em = (t: number) => unir([0, 1, 2].map((k) => da[k]! + (db[k]! - da[k]!) * t));
      let lo = 0;
      let hi = 1;
      for (let it = 0; it < 24; it++) {
        const m = 0.5 * (lo + hi);
        if (rotulo(em(m)) === rot[a]) lo = m;
        else hi = m;
      }
      const t = 0.5 * (lo + hi);
      // o mais perto vai à linha; se ele já foi, o outro (toda aresta que
      // cruza a linha ganha um vértice nela)
      let q = t < 0.5 ? a : b;
      if (movido[q]) q = q === a ? b : a;
      if (movido[q]) continue;
      dirs[q] = em(t);
      movido[q] = true;
    }
  }
  return { dirs, movido };
}

/**
 * OS MEMBROS IRREGULARES (décima quinta volta): um membro liso lia como
 * bolha de cera. Cada membro do monte, do agregado e cada submembro que não
 * é bloco é um elipsoide (eixos de 0,6 a 1) deformado por um ruído de baixa
 * frequência (±`RUIDO_DO_MEMBRO`) — uma pedra de pilha de entulho, não uma
 * gota. Os campos de um membro: centro (0–2), raio (3), sujeira (4), tipo
 * (5: −1 irregular, ≥ 0 a variante do bloco), espelho (6–8), eixos (9–11) e
 * a semente do ruído (12–14).
 */
const RUIDO_DO_MEMBRO = 0.3;
function irregularidade(h: number): number[] {
  const r = quatro(misturar((h ^ 0x27d4eb2f) >>> 0));
  const r2 = quatro(misturar((h ^ 0x165667b1) >>> 0));
  const e = [1, 0.7 + 0.3 * r[0]!, 0.6 + 0.3 * r[1]!];
  // qual eixo é o longo, o médio e o curto
  const giro = Math.min(Math.floor(r[2]! * 3), 2);
  return [e[giro]!, e[(giro + 1) % 3]!, e[(giro + 2) % 3]!, 37 * r2[0]!, 37 * r2[1]!, 37 * r2[2]!];
}
/** o raio do membro na direção l (do centro dele), em unidades do raio */
function formaDoMembro(l: number[], m: number[]): number {
  const e =
    1 /
    Math.sqrt((l[0]! / m[9]!) ** 2 + (l[1]! / m[10]!) ** 2 + (l[2]! / m[11]!) ** 2);
  const ruido = ruidoCPU(1.7 * l[0]! + m[12]!, 1.7 * l[1]! + m[13]!, 1.7 * l[2]! + m[14]!);
  return e * (1 + 2 * RUIDO_DO_MEMBRO * (ruido - 0.5));
}
/** a saída do raio d (da origem) pelo membro irregular m (contínua fora dele, como a da bola) */
function saidaIrregular(d: number[], m: number[]): number {
  const lc2 = dot3(m, m);
  const b = dot3(d, m);
  let raio = m[3]!;
  let t = 0;
  for (let it = 0; it < 3; it++) {
    const disc = b * b - lc2 + raio * raio;
    t = b + Math.sign(disc) * Math.sqrt(Math.abs(disc));
    const p = [t * d[0]! - m[0]!, t * d[1]! - m[1]!, t * d[2]! - m[2]!];
    const lp = Math.hypot(p[0]!, p[1]!, p[2]!);
    if (lp < 1e-9) break;
    raio = m[3]! * formaDoMembro([p[0]! / lp, p[1]! / lp, p[2]! / lp], m);
  }
  const disc = b * b - lc2 + raio * raio;
  return b + Math.sign(disc) * Math.sqrt(Math.abs(disc));
}
/** os doze membros do monte (`membro`), irregulares */
function membrosDoMonte(vb: number): number[][] {
  return Array.from({ length: MEMBROS }, (_, k) => [
    ...membro(vb, k),
    -1, 1, 1, 1,
    ...irregularidade((vb + Math.imul(k, 0x9e3779b9)) >>> 0),
  ]);
}

/**
 * OS AGREGADOS PEQUENOS (décima quinta volta): abaixo de ~2,5 m o pedaço é,
 * na maioria, um agregado de poucos membros (`MEMBROS_DO_AGREGADO`, um
 * número por variante, de 2 a 12), com os tamanhos pela lei dos próprios
 * pedaços (n(s) ∝ s⁻³, de `MENOR_DO_AGREGADO` ao maior) e cada membro colado
 * ao que já há, numa direção sorteada, com 55 % do raio para dentro (eles se
 * juntam a ~1 mm/s e se achatam no contato). O tamanho: as quatro maiores
 * bolas dentro do raio 1 (a régua de antes), e a área média vem de
 * `ESCALA_DO_AGREGADO` sobre a do monte.
 */
function r2Medio(f: (d: number[]) => number): number {
  let s = 0;
  for (const d of DIRECOES_DA_AREA) s += f(d) ** 2;
  return s / DIRECOES_DA_AREA.length;
}
function osAgregados() {
  return agregados ?? drenar(osAgregadosEmPassos());
}
function* osAgregadosEmPassos(): Passos<{ membros: number[][][]; escala: number[]; r2Perto: number[] }> {
  if (agregados) return agregados;
  // o monte: o quadrado médio do raio da forma de longe (quatro bolas) e o
  // da de perto (as doze), na média das variantes
  let r2LongeMonte = 0;
  let r2PertoMonte = 0;
  for (let v = 0; v < VARIANTES; v++) {
    const todos = Array.from({ length: MEMBROS }, (_, k) => membro(baseDaVariante(false, v), k));
    r2LongeMonte += r2Medio((d) => raioDoMonte(d, todos.slice(0, BOLAS_A_VALER)).r) / VARIANTES;
    r2PertoMonte += r2Medio((d) => raioDoMonte(d, todos).r) / VARIANTES;
    yield;
  }
  const membros: number[][][] = [];
  const escala: number[] = [];
  const r2Perto: number[] = [];
  const [a2, b2] = [MENOR_DO_AGREGADO ** -2, 1];
  for (let v = 0; v < VARIANTES; v++) {
    const vb = baseDaVariante(false, VARIANTES + v);
    const n = MEMBROS_DO_AGREGADO[v]!;
    const sorteios = Array.from({ length: n }, (_, k) =>
      misturar((vb ^ ((0x3c6ef372 + Math.imul(k, 0x9e3779b9)) >>> 0)) >>> 0),
    );
    const tamanho = (h: number) => (b2 + quatro(h)[2]! * (a2 - b2)) ** -0.5;
    sorteios.sort((x, y) => tamanho(y) - tamanho(x));
    const ms: number[][] = [];
    for (const h of sorteios) {
      const r = quatro(h);
      const s = tamanho(h);
      let c = [0, 0, 0];
      if (ms.length > 0) {
        const d = direcao(r[0]!, r[1]!);
        let fora = 0;
        for (const m of ms) {
          const b = dot3(d, m);
          const disc = b * b - dot3(m, m) + m[3]! * m[3]!;
          if (disc > 0) fora = Math.max(fora, b + Math.sqrt(disc));
        }
        c = d.map((x) => x * (fora + 0.45 * s));
      }
      ms.push([...c, s, r[3]!, -1, 1, 1, 1, ...irregularidade(h)]);
    }
    // o centro de massa na origem, e as quatro maiores dentro do raio 1
    let vol = 0;
    const cm = [0, 0, 0];
    for (const m of ms) {
      const w = m[3]! ** 3;
      vol += w;
      for (let j = 0; j < 3; j++) cm[j]! += w * m[j]!;
    }
    for (const m of ms) for (let j = 0; j < 3; j++) m[j]! -= cm[j]! / vol;
    let ext = 0;
    for (const m of ms.slice(0, BOLAS_A_VALER)) ext = Math.max(ext, Math.hypot(m[0]!, m[1]!, m[2]!) + m[3]!);
    for (const m of ms) for (let j = 0; j < 4; j++) m[j]! /= ext;
    const longe = r2Medio((d) => raioDoMonte(d, ms.slice(0, BOLAS_A_VALER)).r);
    membros.push(ms);
    escala.push(Math.sqrt(r2LongeMonte / longe));
    r2Perto.push((longe * r2PertoMonte) / r2LongeMonte);
    yield;
  }
  agregados ??= { membros, escala, r2Perto };
  return agregados;
}
/**
 * A FORMA DE LONGE (décima sexta volta): de longe o monte era as quatro
 * maiores bolas e lia como pipoca, e na troca para a malha virava outro
 * corpo. Agora é a forma DE PERTO, filtrada: os membros irregulares, sem
 * os submembros (`S_MIN_DE_LONGE`), num mapa octaédrico de
 * `LADO_DE_LONGE`² direções por variante (16 linhas: os montes, depois os
 * agregados). O ponto acerta esse corpo estrelado e a forma `A` das malhas
 * é ele mesmo, lido no mapa como a GPU lê: ponto → malha não estala. O
 * tamanho é o da de perto (o quadrado médio do raio da de doze bolas) na
 * escala de perto: × `ESCALA_DO_MONTE[1] / [0]`, porque a malha e o ponto
 * aplicam a escala de longe. Cada texel: a normal e o raio; o céu aberto
 * vis (a oclusão das vizinhas, a mesma conta das malhas) vai num segundo
 * bloco de linhas — dentro do comprimento da normal, a média bilinear de
 * normais tortas o encurtava e o ponto escurecia, manchado, nas juntas dos
 * membros. A normal vai inteira, não em octaedro: a média bilinear de
 * dois lados da dobra do octaedro apontava para dentro.
 */
/** o menor submembro da forma de longe: o da malha de 162 vértices (`assarFormas`) — nenhum; com os de 642 o mapa de 24² saía ruidoso */
const S_MIN_DE_LONGE = 1.25 * Math.sqrt(((4 * Math.PI) / (2 * 162 - 4)) * (4 / Math.sqrt(3)));
function octaedro(d: number[]): [number, number] {
  const s = Math.abs(d[0]!) + Math.abs(d[1]!) + Math.abs(d[2]!);
  const x = d[0]! / s;
  const y = d[1]! / s;
  if (d[2]! >= 0) return [x, y];
  return [(1 - Math.abs(y)) * (x >= 0 ? 1 : -1), (1 - Math.abs(x)) * (y >= 0 ? 1 : -1)];
}
function doOctaedro(x: number, y: number): number[] {
  const z = 1 - Math.abs(x) - Math.abs(y);
  if (z >= 0) return unir([x, y, z]);
  return unir([(1 - Math.abs(y)) * (x >= 0 ? 1 : -1), (1 - Math.abs(x)) * (y >= 0 ? 1 : -1), z]);
}
/** a fração de céu aberto num ponto u da forma, de normal n, pela oclusão das vizinhas (`assarFormas`) */
function ceuAberto(u: number[], n: number[], tudo: number[][]): number {
  let occ = 0;
  for (const m of tudo) {
    const w = [m[0]! - u[0]!, m[1]! - u[1]!, m[2]! - u[2]!];
    const l2 = Math.max(dot3(w, w), 1e-4);
    occ += (((m[3]! * m[3]!) / l2) * Math.max(dot3(n, w), 0)) / Math.sqrt(l2);
  }
  return Math.min(Math.max(1 - occ, 0), 1);
}
let longe: {
  dado: Float32Array;
  raioMaximo: number;
  aoMedio: [number, number];
  normaDoSol: number[];
  texNorma: THREE.Data3DTexture | null;
  tex: THREE.DataTexture | null;
} | null = null;
function formasDeLonge() {
  return longe ?? drenar(formasDeLongeEmPassos());
}
function* formasDeLongeEmPassos(): Passos<NonNullable<typeof longe>> {
  if (longe) return longe;
  const N = LADO_DE_LONGE;
  // duas vezes as linhas: (normal, raio), depois (céu aberto, -, -, -)
  const dado = new Float32Array(2 * 2 * VARIANTES * N * N * 4);
  const ceu = 2 * VARIANTES * N * N * 4;
  const ag = yield* osAgregadosEmPassos();
  let raioMaximo = 1;
  const somaAo = [0, 0];
  const somaP = [0, 0];
  const normas: number[] = [];
  for (let t = 1; t < 3; t++) {
    for (let v = 0; v < VARIANTES; v++) {
      const monte = t === 1;
      const vb = baseDaVariante(false, monte ? v : VARIANTES + v);
      const todos = monte ? membrosDoMonte(vb) : ag.membros[v]!;
      const sub = monte ? subMembros(vb, todos, S_MIN_DE_LONGE) : [];
      const tudo = [...todos, ...sub];
      const P: number[][] = [];
      let r2 = 0;
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
          const d = doOctaedro(((i + 0.5) / N) * 2 - 1, ((j + 0.5) / N) * 2 - 1);
          const r = raioDoMonteDePerto(d, todos, sub).r;
          r2 += r * r;
          P.push(d.map((x) => x * r));
          if (i === N - 1 && j % 6 === 5) yield;
        }
      const r2Antes = monte ? r2Medio((d) => raioDoMonte(d, todos).r) : ag.r2Perto[v]!;
      // o mapa octaédrico tem a mesma área por texel só perto disso: a média
      // pesa cada texel por igual (a diferença fica abaixo de 1 % no tamanho)
      const k = Math.sqrt(r2Antes / (r2 / (N * N))) * (ESCALA_DO_MONTE[1] / ESCALA_DO_MONTE[0]);
      const linha = (t - 1) * VARIANTES + v;
      const pontos: number[][] = [];
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
          // a normal pelas vizinhas no mapa (de um lado só na borda), para fora
          const em = (a: number, b: number) => P[Math.min(Math.max(b, 0), N - 1) * N + Math.min(Math.max(a, 0), N - 1)]!;
          const u = em(i, j);
          const ex = [0, 1, 2].map((q) => em(i + 1, j)[q]! - em(i - 1, j)[q]!);
          const ey = [0, 1, 2].map((q) => em(i, j + 1)[q]! - em(i, j - 1)[q]!);
          let n = unir([ex[1]! * ey[2]! - ex[2]! * ey[1]!, ex[2]! * ey[0]! - ex[0]! * ey[2]!, ex[0]! * ey[1]! - ex[1]! * ey[0]!]);
          const d = unir(u);
          if (dot3(n, d) < 0) n = n.map((x) => -x);
          if (dot3(n, d) < 0.05) n = d;
          const vis = ceuAberto(u, n, tudo);
          const r = Math.hypot(u[0]!, u[1]!, u[2]!) * k;
          raioMaximo = Math.max(raioMaximo, r);
          somaAo[t - 1]! += (0.4 + 0.6 * vis) * r * r;
          somaP[t - 1]! += r * r;
          pontos.push([...n, ...n, vis, r * r]);
          const o = ((linha * N + j) * N + i) * 4;
          for (let q = 0; q < 3; q++) dado[o + q] = n[q]!;
          dado[o + 3] = r;
          dado[ceu + o] = vis;
        }
      yield;
      normas.push(...(yield* normaDoSolEmPassos(pontos)));
    }
  }
  longe ??= {
    dado,
    raioMaximo,
    aoMedio: [somaAo[0]! / somaP[0]!, somaAo[1]! / somaP[1]!],
    normaDoSol: normas,
    texNorma: null,
    tex: null,
  };
  return longe;
}
/** a forma de longe na direção d, lida no mapa como a GPU lê (bilinear, presa na linha): a direção × raio, a normal e o céu aberto */
function lerDeLonge(linha: number, d: number[]): { u: number[]; n: number[]; vis: number } {
  const { dado } = formasDeLonge();
  const N = LADO_DE_LONGE;
  const p = octaedro(d);
  const sx = Math.min(Math.max((p[0] * 0.5 + 0.5) * N - 0.5, 0), N - 1);
  const sy = Math.min(Math.max((p[1] * 0.5 + 0.5) * N - 0.5, 0), N - 1);
  const i0 = Math.min(Math.floor(sx), N - 2);
  const j0 = Math.min(Math.floor(sy), N - 2);
  const fx = sx - i0;
  const fy = sy - j0;
  const c = [0, 0, 0, 0];
  let vis = 0;
  for (const [di, dj, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]] as const) {
    const o = ((linha * N + j0 + dj) * N + i0 + di) * 4;
    for (let q = 0; q < 4; q++) c[q]! += w * dado[o + q]!;
    vis += w * dado[2 * VARIANTES * N * N * 4 + o]!;
  }
  const l = Math.hypot(c[0]!, c[1]!, c[2]!);
  return { u: d.map((x) => x * c[3]!), n: [c[0]! / l, c[1]! / l, c[2]! / l], vis };
}
function texturaDeLonge(): THREE.DataTexture {
  const l = formasDeLonge();
  if (l.tex) return l.tex;
  const meio = new Uint16Array(l.dado.length);
  for (let k = 0; k < l.dado.length; k++) meio[k] = THREE.DataUtils.toHalfFloat(l.dado[k]!);
  const tex = new THREE.DataTexture(meio, LADO_DE_LONGE, 4 * VARIANTES * LADO_DE_LONGE, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  l.tex = tex;
  return tex;
}

/**
 * A FRESTA DO AGREGADO (décima sexta volta): a oclusão das vizinhas
 * escurecia toda a luz por igual, e o Sol, duro, chegava ao fundo de toda
 * fresta. Um ponto que vê a fração `vis` do céu vê um cone de mesmo ângulo
 * sólido, cos θ = 1 − vis, em torno da direção aberta — a normal da forma
 * de longe (a envoltória). O Sol direto passa só dentro do cone; a borda
 * de ±0,15 em cosseno é salvaguarda minha (o cone é uma aproximação, não
 * medida). Em ponto aberto (vis = 1) fica o terminador da envoltória.
 * Ele é dividido pela régua do pedaço (`normaDoSol`): o pedaço inteiro
 * reflete o mesmo de antes com qualquer Sol — o brilho
 * do campo foi casado com o I/F medido do disco, que já traz a sombra
 * das partículas sobre si —, só que com o contraste das frestas.
 */
export function solAberto(cosEnvoltoria: number, vis: number): number {
  const c = 1 - vis;
  return suave(c - 0.15, c + 0.15, cosEnvoltoria);
}
/**
 * A RÉGUA DA FRESTA (décima sétima volta): dividir pela média de todas as
 * direções do Sol (0,98) falhava com o Sol BAIXO sobre a face: com o Sol a
 * cos c da envoltória, só passa quem vê mais que 1 − c do céu — em c = 0,
 * uns 40 % da área —, e a face rasante perdia até 60 % do Sol, que a média
 * não devolvia (com o Sol alto ela devolvia demais); e quem vê o pedaço de
 * lado ou de baixo vê justamente as faces rasantes. Agora a divisão é por
 * N, por VARIANTE, pela direção s do Sol no quadro dela e pela faixa de c:
 * o Sol direto que os pontos daquela faixa recebem com fresta sobre o de
 * sem fresta, Σ w·env(n·s)·`solAberto`(c) ÷ Σ w·env(n·s) (n a normal, w a
 * área). A fresta só tira de um ponto o que dá a outro da mesma elevação
 * do Sol no mesmo pedaço, e o pedaço reflete o de antes de qualquer lado.
 * `pontos` = (n, e — a normal da envoltória —, céu aberto, área); devolve
 * `FAIXAS_DA_NORMA` mapas octaédricos de `LADO_DA_NORMA`² direções.
 */
export function normaDoSol(pontos: readonly (readonly number[])[]): number[] {
  return drenar(normaDoSolEmPassos(pontos));
}
function* normaDoSolEmPassos(pontos: readonly (readonly number[])[]): Passos<number[]> {
  const L = LADO_DA_NORMA;
  const F = FAIXAS_DA_NORMA;
  const env = (c: number) => Math.max((c + ENVOLVE) / (1 + ENVOLVE), 0);
  const t = new Array<number>(F * L * L).fill(1);
  for (let j = 0; j < L; j++)
    for (let i = 0; i < L; i++) {
      const sd = doOctaedro(((i + 0.5) / L) * 2 - 1, ((j + 0.5) / L) * 2 - 1);
      const com = new Float64Array(F);
      const sem = new Float64Array(F);
      for (const q of pontos) {
        const d = q[7]! * env(q[0]! * sd[0]! + q[1]! * sd[1]! + q[2]! * sd[2]!);
        if (d <= 0) continue;
        const c = q[3]! * sd[0]! + q[4]! * sd[1]! + q[5]! * sd[2]!;
        const so = solAberto(c, q[6]!);
        // nas duas faixas vizinhas, pela distância (a GPU interpola igual)
        const x = Math.min(Math.max((c - C0_DA_NORMA) / PASSO_DA_NORMA, 0), F - 1);
        const k = Math.min(Math.floor(x), F - 2);
        const f = x - k;
        sem[k]! += (1 - f) * d;
        com[k]! += (1 - f) * d * so;
        sem[k + 1]! += f * d;
        com[k + 1]! += f * d * so;
      }
      for (let k = 0; k < F; k++) if (sem[k]! > 0) t[(k * L + j) * L + i] = com[k]! / sem[k]!;
      // o que nenhuma faixa devolve (a face voltada ao Sol com a envoltória
      // de costas: ali ninguém recebe Sol) volta ao pedaço inteiro
      let total = 0;
      let deveria = 0;
      for (const q of pontos) {
        const d = q[7]! * env(q[0]! * sd[0]! + q[1]! * sd[1]! + q[2]! * sd[2]!);
        if (d <= 0) continue;
        const c = q[3]! * sd[0]! + q[4]! * sd[1]! + q[5]! * sd[2]!;
        const x = Math.min(Math.max((c - C0_DA_NORMA) / PASSO_DA_NORMA, 0), F - 1);
        const k = Math.min(Math.floor(x), F - 2);
        const f = x - k;
        const n = (1 - f) * t[(k * L + j) * L + i]! + f * t[((k + 1) * L + j) * L + i]!;
        total += (d * solAberto(c, q[6]!)) / Math.max(n, 0.05);
        deveria += d;
      }
      if (total > 0) for (let k = 0; k < F; k++) t[(k * L + j) * L + i]! *= total / deveria;
      if (pontos.length > 1000) yield;
    }
  return t;
}
/** a régua em textura 3D (meia precisão, filtrada): x, y a direção do Sol; z a faixa do cosseno, as 16 variantes uma depois da outra */
function texturaDaNorma(t: readonly number[]): THREE.Data3DTexture {
  const meio = new Uint16Array(t.length);
  for (let k = 0; k < t.length; k++) meio[k] = THREE.DataUtils.toHalfFloat(t[k]!);
  const tex = new THREE.Data3DTexture(meio, LADO_DA_NORMA, LADO_DA_NORMA, t.length / (LADO_DA_NORMA * LADO_DA_NORMA));
  tex.format = THREE.RedFormat;
  tex.type = THREE.HalfFloatType;
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
const GLSL_SOL_ABERTO = /* glsl */ `
float solAberto(float cosEnvoltoria, float vis) {
  float c = 1.0 - vis;
  return smoothstep(c - 0.15, c + 0.15, cosEnvoltoria);
}
// a régua da fresta da forma de longe (\`normaDoSol\`)
uniform highp sampler3D uNormaDeLonge;
// o Sol que a fresta deixa (\`solAberto\`, c o cosseno do Sol na envoltória)
// ÷ N da variante \`linha\` (0 a ${2 * VARIANTES - 1}) na régua \`t\`, com o Sol em s (no quadro da forma)
float solDaFresta(highp sampler3D t, int linha, vec3 s, float c, float vis) {
  vec2 p = s.xy / (abs(s.x) + abs(s.y) + abs(s.z));
  if (s.z < 0.0) p = (1.0 - abs(p.yx)) * vec2(p.x >= 0.0 ? 1.0 : -1.0, p.y >= 0.0 ? 1.0 : -1.0);
  const float L = ${glslF(LADO_DA_NORMA)};
  const float F = ${glslF(FAIXAS_DA_NORMA)};
  vec2 q = clamp((p * 0.5 + 0.5) * L - 0.5, 0.0, L - 1.0) + 0.5;
  float z = clamp((c - ${glslF(C0_DA_NORMA)}) / ${glslF(PASSO_DA_NORMA)}, 0.0, F - 1.0) + 0.5;
  float n = texture(t, vec3(q / L, (float(linha) * F + z) / ${glslF(2 * VARIANTES * FAIXAS_DA_NORMA)})).r;
  return solAberto(c, vis) / max(n, 0.05);
}
`;

/**
 * O QUE SÓ SE ASSA COM AS PEDRAS MONTADAS: as constantes do GLSL que saem de
 * contas (a escala dos agregados, a altura média do grão, as faces dos
 * blocos, o raio e a oclusão média da forma de longe) entram no lugar de
 * `ASSADOS_DAS_PEDRAS` quando os materiais são montados — a carga do módulo
 * não assa nada.
 */
let assados: string | null = null;
function glslAssado(): string {
  if (assados) return assados;
  const l = formasDeLonge();
  assados = `
// a área do agregado sobre a do monte, por variante (\`osAgregados\`)
const float ESCALA_DO_AGREGADO[${VARIANTES}] = float[](${osAgregados().escala.map(glslF).join(', ')});
// a altura média do grão (\`dadoDoGrao\`)
const float ALTURA_MEDIA_DO_GRAO = ${glslF(dadoDoGrao().media)};
// as faces dos blocos, \`PLANOS_DO_BLOCO[1]\` por variante (as que sobram, longe)
const vec4 PLANOS[${VARIANTES * PLANOS_DO_BLOCO[1]}] = vec4[](${Array.from({ length: VARIANTES }, (_, v) => {
    const p = planosDoBloco(baseDaVariante(true, v));
    while (p.length < PLANOS_DO_BLOCO[1]) p.push([0, 0, 1, 1e3]);
    return p.map((c) => `vec4(${c.map(glslF).join(', ')})`).join(', ');
  }).join(', ')});
// o maior raio da forma de longe e a oclusão média dela, monte e agregado (\`formasDeLonge\`)
const float RAIO_DE_LONGE = ${glslF(l.raioMaximo)};
const float AO_DE_LONGE[2] = float[](${l.aoMedio.map(glslF).join(', ')});
${GLSL_SOL_ABERTO}`;
  return assados;
}

/**
 * OS SUBMEMBROS DO MONTE (décima volta): um agregado de 20 m é um monte de
 * milhares de pedaços menores. Sobre os doze membros, `SUBMEMBROS`
 * sorteados com a lei dos próprios pedaços (n(s) ∝ s⁻³, raio de `S_SUB` em
 * unidades do monte), cada um meio enterrado na superfície que os doze
 * fazem; como os pedaços soltos, uma minoria (`BLOCOS_ENTRE_OS_PEQUENOS`) é
 * bloco — um dos poliedros das variantes, espelhado ao acaso —, o resto é
 * membro irregular (`formaDoMembro`). A malha fica só com os que ela
 * resolve (`sMin`): os mesmos sorteios em toda malha, as menores com os
 * maiores deles.
 */
const SUBMEMBROS = 320;
const S_SUB = [0.055, 0.34] as const;
/** o expoente do máximo suave do monte de perto: vales mais fundos que os de longe */
const P_DO_MONTE = 56;
/** o bloco de raio s dentro do monte: o poliedro (canto em 1) × s × isto, a área da bola de raio s */
const BLOCO_NO_MONTE = 1.6;
let planosDasVariantes: number[][][] | null = null;
function subMembros(vb: number, todos: number[][], sMin: number): number[][] {
  const out: number[][] = [];
  const [a2, b2] = [S_SUB[0] ** -2, S_SUB[1] ** -2];
  for (let k = 0; k < SUBMEMBROS; k++) {
    const h = misturar(
      (vb ^ ((0x5851f42d + Math.imul(k, 0x4c957f2d)) >>> 0)) >>> 0,
    );
    const r = quatro(h);
    const s = (b2 + r[2] * (a2 - b2)) ** -0.5;
    if (s < sMin) continue;
    const d = direcao(r[0], r[1]);
    const base = raioDoMonte(d, todos, P_DO_MONTE);
    const fundo = base.r - (0.15 + 0.3 * r[3]) * s;
    // o gelo dele: o do membro onde ele pousa, com um pouco de sorteio
    const h2 = misturar(h);
    const sujo = 0.6 * todos[base.dono]![4]! + 0.4 * ((h2 >>> 16) / 65535);
    // bloco (a variante e o espelho de cada eixo) ou irregular (−1)
    const tipo =
      (h2 & 0xff) / 256 < BLOCOS_ENTRE_OS_PEQUENOS
        ? (h2 >>> 8) % VARIANTES
        : -1;
    const esp = [0, 1, 2].map((j) => ((h2 >>> (12 + j)) & 1 ? -1 : 1));
    out.push([d[0] * fundo, d[1] * fundo, d[2] * fundo, s, sujo, tipo, ...esp, ...irregularidade(h2)]);
  }
  return out;
}
/** a saída do raio d (da origem) pelo submembro m; a mais funda, fora dele (contínua na borda); null longe */
function saidaDoSub(d: number[], m: number[]): number | null {
  const lc = Math.hypot(m[0]!, m[1]!, m[2]!);
  const b = dot3(d, m);
  const bloco = m[5]! >= 0;
  const alcance = (1.3 * m[3]! * (bloco ? BLOCO_NO_MONTE : 1)) / lc;
  if (alcance < 1 && b < lc * Math.sqrt(1 - alcance * alcance)) return null;
  if (!bloco) return saidaIrregular(d, m);
  planosDasVariantes ??= Array.from({ length: VARIANTES }, (_, v) =>
    planosDoBloco(baseDaVariante(true, v)),
  );
  let te = -Infinity;
  let tx = Infinity;
  for (const c of planosDasVariantes[m[5]!]!) {
    const nx = c[0]! * m[6]!;
    const ny = c[1]! * m[7]!;
    const nz = c[2]! * m[8]!;
    const hh =
      c[3]! * m[3]! * BLOCO_NO_MONTE + nx * m[0]! + ny * m[1]! + nz * m[2]!;
    const nd = nx * d[0]! + ny * d[1]! + nz * d[2]!;
    if (nd > 1e-9) tx = Math.min(tx, hh / nd);
    else if (nd < -1e-9) te = Math.max(te, hh / nd);
  }
  return te <= tx ? tx : 2 * tx - te;
}
/**
 * O MONTE (ou o agregado) DE PERTO na direção d: o máximo suave
 * (`P_DO_MONTE`) das saídas pelos membros irregulares e pelos submembros
 * (a normal sai da malha).
 */
function raioDoMonteDePerto(u: number[], membros: number[][], sub: number[][]) {
  let s = 0;
  let melhor = -1;
  let dono = 0;
  const soma = (f: number | null, k: number) => {
    if (f === null || f <= 0) return;
    s += f ** P_DO_MONTE;
    if (f > melhor) {
      melhor = f;
      dono = k;
    }
  };
  membros.forEach((m, k) => soma(saidaIrregular(u, m), k));
  sub.forEach((m, k) => soma(saidaDoSub(u, m), membros.length + k));
  return { r: Math.max(s, 1e-30) ** (1 / P_DO_MONTE), dono };
}
/** a normal de cada vértice da malha u (a soma das faces em volta), para fora */
function normaisDaMalha(u: number[][], idx: ArrayLike<number>, ds: number[][]): number[][] {
  const nB = u.map(() => [0, 0, 0]);
  for (let j = 0; j < idx.length; j += 3) {
    const [a, b, c] = [u[idx[j]!]!, u[idx[j + 1]!]!, u[idx[j + 2]!]!];
    const e1 = [0, 1, 2].map((q) => b[q]! - a[q]!);
    const e2 = [0, 1, 2].map((q) => c[q]! - a[q]!);
    const cr = [
      e1[1]! * e2[2]! - e1[2]! * e2[1]!,
      e1[2]! * e2[0]! - e1[0]! * e2[2]!,
      e1[0]! * e2[1]! - e1[1]! * e2[0]!,
    ];
    for (const q of [idx[j]!, idx[j + 1]!, idx[j + 2]!])
      for (let e = 0; e < 3; e++) nB[q]![e]! += cr[e]!;
  }
  return nB.map((v, i) => {
    const nn = unir(v);
    return dot3(nn, ds[i]!) < 0.05 ? ds[i]! : nn;
  });
}
/** o expoente das arestas do bloco de antes (vivas): o tamanho do bloco de perto fica o dele */
const P_DA_ARESTA_VIVA = 40;

/**
 * Assa as `3 × VARIANTES` formas sobre o molde de `detalhe` numa textura
 * (largura = vértices, `LINHAS_DA_FORMA` linhas por variante): os blocos,
 * os montes e os agregados pequenos. Na forma de longe do bloco a normal é
 * a do plano (quinas vivas, sem derivada de tela); nas de perto, a da malha.
 */
export function assarFormas(detalhe: number): { geo: THREE.BufferGeometry; tex: THREE.DataTexture } {
  return drenar(assarFormasEmPassos(detalhe));
}
/** os vértices entre duas cessões da vez (`Passos`) */
const VERTICES_POR_PASSO = 256;
function* assarFormasEmPassos(detalhe: number): Passos<{ geo: THREE.BufferGeometry; tex: THREE.DataTexture }> {
  const geo = molde(detalhe);
  const pos = geo.getAttribute('position');
  const idx = geo.index!.array;
  const n = pos.count;
  const altura = 3 * VARIANTES * LINHAS_DA_FORMA;
  const dado = new Float32Array(n * altura * 4);
  const por = (linha: number, i: number, v: ArrayLike<number>) => {
    const o = (linha * n + i) * 4;
    dado[o] = v[0]!; dado[o + 1] = v[1]!; dado[o + 2] = v[2]!; dado[o + 3] = 0;
  };
  const ds = Array.from({ length: n }, (_, i) =>
    unir([pos.getX(i), pos.getY(i), pos.getZ(i)]),
  );
  // o menor submembro que a malha desenha: 1,25 lado de triângulo
  const sMin =
    1.25 * Math.sqrt(((4 * Math.PI) / (2 * n - 4)) * (4 / Math.sqrt(3)));
  const ag = yield* osAgregadosEmPassos();
  yield* formasDeLongeEmPassos();
  const normas: number[] = [];
  for (let t = 0; t < 3; t++) {
    const aoDoTipo: number[][] = [];
    for (let v = 0; v < VARIANTES; v++) {
      const l0 = (t * VARIANTES + v) * LINHAS_DA_FORMA;
      if (t === 0) {
        const vb = baseDaVariante(true, v);
        const planos = planosDoBloco(vb);
        const semente = quatro(misturar((vb ^ 0xd3a2646c) >>> 0)).map(
          (x) => 37 * x,
        );
        // as arestas nas linhas, em cada forma (`arestasNasLinhas`)
        const linA = yield* arestasNasLinhas(
          ds,
          idx,
          (d) => raioDoPoliedro(d, planos, Infinity).dono,
        );
        yield;
        const linB = yield* arestasNasLinhas(
          ds,
          idx,
          (d) => raioDoPoliedro(d, planos).dono,
        );
        yield;
        const uB: number[][] = [];
        let r2Viva = 0;
        let r2 = 0;
        for (let i = 0; i < n; i++) {
          // de longe, o poliedro de quinas vivas: todo vértice numa face
          const dA = linA.dirs[i]!;
          const a = raioDoPoliedro(dA, planos, Infinity);
          por(
            l0,
            i,
            dA.map((x) => x * a.r),
          );
          por(l0 + 2, i, a.n);
          // de perto, os cantos gastos, as faces abauladas e um relevo
          // fino (±1 %): a face não é um plano de vidro
          const d = linB.dirs[i]!;
          const b = raioDoPoliedro(d, planos);
          const rel =
            (1 + ABAULADO * b.abaulado) *
            (1 +
              0.02 *
                (ruidoCPU(
                  d[0]! * b.r * 5 + semente[0]!,
                  d[1]! * b.r * 5 + semente[1]!,
                  d[2]! * b.r * 5 + semente[2]!,
                ) -
                  0.5));
          uB.push(d.map((x) => x * b.r * rel));
          r2 += (b.r * rel) ** 2;
          r2Viva += raioDoPoliedro(d, planos, P_DA_ARESTA_VIVA).r ** 2;
          // (ao, sujo, no plano na forma de perto — nenhum —, idem na de
          // longe — todos)
          por(l0 + 4, i, [1, 0.5, 0]);
          dado[((l0 + 4) * n + i) * 4 + 3] = 1;
          if (i % VERTICES_POR_PASSO === VERTICES_POR_PASSO - 1) yield;
        }
        // o tamanho é o do bloco de arestas vivas (a área da escala do tipo)
        const k = Math.sqrt(r2Viva / r2);
        const nB = normaisDaMalha(uB, idx, ds);
        ds.forEach((_, i) => {
          por(l0 + 1, i, uB[i]!.map((x) => x * k));
          por(l0 + 3, i, nB[i]!);
        });
        yield;
      } else {
        const monte = t === 1;
        const vb = baseDaVariante(false, monte ? v : VARIANTES + v);
        const todos = monte ? membrosDoMonte(vb) : ag.membros[v]!;
        const sub = monte ? subMembros(vb, todos, sMin) : [];
        const tudo = [...todos, ...sub];
        const uB: number[][] = [];
        const donos: number[] = [];
        const visDeLonge: number[] = [];
        const nDeLonge: number[][] = [];
        const pontos: number[][] = [];
        let r2Antes = 0;
        let r2 = 0;
        for (let i = 0; i < n; i++) {
          const d = ds[i]!;
          // de longe, a forma do ponto (\`formasDeLonge\`), lida no mapa
          const a = lerDeLonge((t - 1) * VARIANTES + v, d);
          por(l0, i, a.u);
          por(l0 + 2, i, a.n);
          visDeLonge.push(a.vis);
          nDeLonge.push(a.n);
          if (monte) r2Antes += raioDoMonte(d, todos).r ** 2;
          const b = raioDoMonteDePerto(d, todos, sub);
          r2 += b.r * b.r;
          uB.push(d.map((x) => x * b.r));
          donos.push(b.dono);
          if (i % VERTICES_POR_PASSO === VERTICES_POR_PASSO - 1) yield;
        }
        if (!monte) r2Antes = ag.r2Perto[v]! * n;
        const nB = normaisDaMalha(uB, idx, ds);
        yield;
        for (let i = 0; i < n; i++) {
          const u = uB[i]!;
          const nn = nB[i]!;
          // a oclusão das vizinhas (a de uma esfera vista de um ponto): os
          // vales entre os membros ficam em sombra
          let occ = 0;
          for (const m of tudo) {
            const w = [m[0]! - u[0]!, m[1]! - u[1]!, m[2]! - u[2]!];
            const l2 = Math.max(dot3(w, w), 1e-4);
            occ +=
              (((m[3]! * m[3]!) / l2) * Math.max(dot3(nn, w), 0)) /
              Math.sqrt(l2);
          }
          const ao = Math.min(Math.max(1 - 0.6 * occ, 0.35), 1);
          aoDoTipo.push([l0 + 4, i, ao, dot3(u, u)]);
          // (ao, sujo, a fração de céu aberto — \`solAberto\` —, a do ponto)
          const vis = Math.min(Math.max(1 - occ, 0), 1);
          por(l0 + 4, i, [ao, tudo[donos[i]!]![4]!, vis]);
          dado[((l0 + 4) * n + i) * 4 + 3] = visDeLonge[i]!;
          pontos.push([...nn, ...nDeLonge[i]!, vis, dot3(u, u)]);
          if (i % VERTICES_POR_PASSO === VERTICES_POR_PASSO - 1) yield;
        }
        // o tamanho é o de antes: o quadrado médio do raio, o da forma de doze
        const k = Math.sqrt(r2Antes / r2);
        normas.push(...(yield* normaDoSolEmPassos(pontos)));
        ds.forEach((_, i) => {
          por(
            l0 + 1,
            i,
            uB[i]!.map((x) => x * k),
          );
          por(l0 + 3, i, nB[i]!);
        });
      }
    }
    // a oclusão dividida pela média dela pesada pela área (r²), por tipo:
    // o albedo médio fica o mesmo, com ou sem os membros desta malha
    let somaAo = 0;
    let somaP = 0;
    for (const [, , ao, w] of aoDoTipo) {
      somaAo += ao! * w!;
      somaP += w!;
    }
    for (const [l, i, ao] of aoDoTipo)
      dado[(l! * n + i!) * 4] = ao! / (somaAo / somaP);
  }
  const tex = new THREE.DataTexture(
    dado,
    n,
    altura,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  tex.needsUpdate = true;
  tex.userData.normaDoSol = normas;
  tex.userData.texNorma = texturaDaNorma(tex.userData.normaDoSol as number[]);
  return { geo, tex };
}

/**
 * O GRÃO DO FRAGMENTO: o bloco periódico de `CELULAS_DO_RELEVO`³ grãos
 * (`dadoDoGrao`), em 3D, com mipmaps — o mipmap apaga o que fica menor que
 * o pixel (sem cintilar de longe). R = altura; G, B, A = a inclinação dela
 * em x, y, z (÷ 2·`INCLINACAO_DO_GRAO`, + 0,5).
 */
function texturaDoRelevo(): THREE.Data3DTexture {
  const { dado, n } = dadoDoGrao();
  const tex = new THREE.Data3DTexture(dado, n, n, n);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
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
  /** px por radiano do último quadro (o teto de \`PX_CORTE\`) */
  pxPorRad: number;
  /** sem câmera ainda: sem cone */
  ok: boolean;
}

/** as formas assadas, uma vez por detalhe */
const FORMAS = new Map<number, { geo: THREE.BufferGeometry; tex: THREE.DataTexture }>();
function formasDe(detalhe: number) {
  let f = FORMAS.get(detalhe);
  if (!f) FORMAS.set(detalhe, (f = assarFormas(detalhe)));
  return f;
}

/** a malha de perto lê o pedaço do pré-passo; a 'reserva' faz a conta ela mesma (sem alvo em float) */
type Desenho = 'ponto' | 'esmaece' | 'malha' | 'reserva' | 'pre' | 'sombra';

/** a capacidade de cada malha de perto: o dobro da conta média da janela de perto, por oitava */
function capacidadeDePerto(): number {
  const r = (2 ** X_CORTE * FOLGA_DA_ESCOLHA) / K_LADRILHO;
  return OITAVAS * (Math.ceil(PEDRAS_POR_TIER.cinema * Math.min(1, 2 * r * r)) + 256);
}
/** as linhas de cada faixa da textura do pré-passo (o texel 0 e as três malhas cheias) */
function linhasDoPrePasso(): number {
  return Math.ceil((1 + MALHAS.length * capacidadeDePerto()) / PRE_W);
}

/**
 * AS CÉLULAS DO LADRILHO: os ids de cada oitava em blocos de `CELULA`, cada
 * bloco um retalho do ladrilho (uma faixa radial, um trecho do arco). Só a
 * ORDEM DE DESENHO muda (a identidade e o lugar de cada pedaço são os de
 * sempre): o vértice lê o id pela permutação, e a CPU desenha por quadro só
 * as células que tocam a janela e o cone da lente. Os grupos de ids de cada
 * tier (os prefixos de `PEDRAS_POR_TIER`) têm células próprias.
 */

export interface CelulasDaOitava {
  /** os ids na ordem do desenho */
  ids: Uint16Array;
  /** o sorteio radial (a = q/65 536) de cada faixa, mínimo e máximo */
  aMin: Float64Array;
  aMax: Float64Array;
  /** o sorteio do arco (h1 >> 8)/2²⁴ de cada célula, mínimo e máximo */
  hMin: Float64Array;
  hMax: Float64Array;
}

export function celulasDaOitava(o: number): CelulasDaOitava {
  return drenar(celulasDaOitavaEmPassos(o));
}
function* celulasDaOitavaEmPassos(o: number): Passos<CelulasDaOitava> {
  const n = PEDRAS_POR_TIER.cinema;
  const a = new Float64Array(n);
  const h = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const base = misturar((i ^ (o << 24)) >>> 0);
    a[i] = (misturar((base ^ 0x51ed27) >>> 0) & 0xffff) / 65536;
    h[i] = (misturar((base ^ 0x2c1b3c6d) >>> 0) >>> 8) / 16777216;
  }
  yield;
  const ids = new Uint16Array(n);
  const por = CELULA * CELULAS_POR_FAIXA;
  const cortes = [0, PEDRAS_POR_TIER.performance, PEDRAS_POR_TIER.alta, PEDRAS_POR_TIER.cinema];
  for (let g = 0; g + 1 < cortes.length; g++) {
    const grupo = Array.from({ length: cortes[g + 1]! - cortes[g]! }, (_, k) => cortes[g]! + k).sort((x, y) => a[x]! - a[y]!);
    for (let f = 0; f < grupo.length; f += por) {
      const faixa = grupo.slice(f, f + por).sort((x, y) => h[x]! - h[y]!);
      ids.set(faixa, cortes[g]! + f);
    }
    yield;
  }
  const aMin = new Float64Array(FAIXAS).fill(1);
  const aMax = new Float64Array(FAIXAS);
  const hMin = new Float64Array(CELULAS).fill(1);
  const hMax = new Float64Array(CELULAS);
  for (let j = 0; j < n; j++) {
    const i = ids[j]!;
    const c = Math.floor(j / CELULA);
    const f = Math.floor(c / CELULAS_POR_FAIXA);
    aMin[f] = Math.min(aMin[f]!, a[i]!);
    aMax[f] = Math.max(aMax[f]!, a[i]!);
    hMin[c] = Math.min(hMin[c]!, h[i]!);
    hMax[c] = Math.max(hMax[c]!, h[i]!);
  }
  return { ids, aMin, aMax, hMin, hMax };
}

/** o que a vista de cada quadro precisa para escolher as células */
export interface VistaDasCelulas {
  ativas: number;
  /** pedaços por oitava do tier (um prefixo, múltiplo de `CELULA · CELULAS_POR_FAIXA`) */
  porOitava: number;
  rhoKm: number;
  zKm: number;
  /** a maior espessura da camada que a janela alcança */
  espessuraKm: number;
  lente: Lente | null;
  fr: ArrayLike<number>;
  fs: ArrayLike<number>;
  gi: ArrayLike<number>;
  gf: ArrayLike<number>;
  /** a folga a mais do cone, km: o rastro da sombra (`acenderSombra`) */
  folgaKm?: number;
}

/**
 * A CAIXA (radial r0..r1, arco s0..s1, km a partir da câmera, no lugar sem a
 * esteira) contra a janela e o cone: bit 1 = algum pedaço dela pode sair
 * opaco (x ≤ `X_PLENO`), bit 2 = algum pode estar esmaecendo (`X_PLENO` < x
 * < `X_ENTRA`). Superconjunto do que o vértice desenha: a presença é a mesma
 * conta (o lugar antes da esteira), e o cone leva a folga do cone do vértice
 * (o maior corpo, a esteira, a curvatura) mais a da câmera lida.
 */
function caixaDaJanela(v: VistaDasCelulas, s: number, r0: number, r1: number, s0: number, s1: number): number {
  const meia = 0.5 * v.espessuraKm;
  const dzMin = Math.max(Math.abs(v.zKm) - meia, 0);
  const dzMax = Math.abs(v.zKm) + meia;
  const pr = Math.max(r0, 0, -r1);
  const pa = Math.max(s0, 0, -s1);
  const min2 = pr * pr + pa * pa + dzMin * dzMin;
  const pleno = 2 ** (2 * X_PLENO) * s * s;
  const entra = 2 ** (2 * X_ENTRA) * s * s;
  if (min2 >= entra * (1 + 1e-4)) return 0;
  const max2 = Math.max(r0 * r0, r1 * r1) + Math.max(s0 * s0, s1 * s1) + dzMax * dzMax;
  let bits = 0;
  if (min2 <= pleno * (1 + 1e-4)) bits |= 1;
  if (max2 >= pleno * (1 - 1e-4)) bits |= 2;
  const lente = v.lente;
  if (!bits || !lente?.ok) return bits;
  const m9 = lente.m;
  const d2 = r0 * r0 + r1 * r1 + s0 * s0 + s1 * s1;
  const folga = 2.5 * s + 1.5 * DESLOCAMENTO_MAXIMO_KM + 4e-6 * d2 + 1e-4 + FOLGA_DO_CONE * Math.sqrt(max2) + (v.folgaKm ?? 0);
  const s00 = folga * Math.sqrt(lente.p00 * lente.p00 + 1);
  const s11 = folga * Math.sqrt(lente.p11 * lente.p11 + 1);
  let fora = 0b11111;
  const za = meia - v.zKm;
  const zb = -meia - v.zKm;
  for (let canto = 0; canto < 8; canto++) {
    const x = canto & 1 ? r1 : r0;
    const y = ((canto & 2 ? s1 : s0) * (v.rhoKm + x)) / R0_KM;
    const z = canto & 4 ? zb : za;
    const vx = m9[0]! * x + m9[1]! * y + m9[2]! * z;
    const vy = m9[3]! * x + m9[4]! * y + m9[5]! * z;
    const fz = -(m9[6]! * x + m9[7]! * y + m9[8]! * z);
    if (fz >= -folga) fora &= ~1;
    if (vx * lente.p00 - fz <= s00) fora &= ~2;
    if (-vx * lente.p00 - fz <= s00) fora &= ~4;
    if (vy * lente.p11 - fz <= s11) fora &= ~8;
    if (-vy * lente.p11 - fz <= s11) fora &= ~16;
    if (!fora) return bits;
  }
  return fora ? 0 : bits;
}

/**
 * AS CÉLULAS QUE O QUADRO PAGA, por imagem do ladrilho (`IMAGENS`) e
 * oitava (da mais fina para a mais grossa): o código (imagem·OITAVAS +
 * oitava)·CELULAS + célula vai para `opacos` ou `esmaece` (ou os dois; com
 * `unir`, toda célula com algum pedaço presente vai só para `opacos`).
 * Devolve quantas em cada. O lugar de cada id é a conta do vértice: o raio
 * (dk + a − f)·lado, com o dk da volta do ladrilho, e o arco h + g·a + gf·dk
 * + fs (mod 1), com o cisalhamento g reduzido ao inteiro mais perto de zero.
 */
export function celulasDoQuadro(
  v: VistaDasCelulas,
  celulas: readonly CelulasDaOitava[],
  opacos: Float32Array,
  esmaece: Float32Array,
  unir = false
): [number, number] {
  const nOit = Math.min(Math.max(v.ativas, 0), OITAVAS);
  const faixas = Math.floor(v.porOitava / (CELULA * CELULAS_POR_FAIXA));
  let nOp = 0;
  let nEs = 0;
  const arcos = [0, 0, 0, 0];
  const bitsDaCelula = new Int32Array(CELULAS_POR_FAIXA);

  for (let m = 0; m < IMAGENS.length; m++) {
    const [jr, ja] = IMAGENS[m]!;
    for (let o = nOit - 1; o >= 0; o--) {
      const t = TABELA_DE_OITAVAS[o]!;
      const lado = t.ladoRadial;
      const ladoArco = t.ladoNoArco;
      // a imagem inteira primeiro
      if (!caixaDaJanela(v, t.s, (jr - 0.5) * lado, (jr + 0.5) * lado, (ja - 0.5) * ladoArco, (ja + 0.5) * ladoArco)) continue;
      const f = v.fr[o]!;
      const gi = v.gi[o]!;
      const g = (gi >= 32768 ? gi - 65536 : gi) + v.gf[o]!;
      const cel = celulas[o]!;
      const codigo = (m * OITAVAS + o) * CELULAS;
      for (let b = 0; b < faixas; b++) {
        const a0 = cel.aMin[b]! - FOLGA_DO_FLOAT;
        const a1 = cel.aMax[b]! + FOLGA_DO_FLOAT;
        // o dk da volta do ladrilho: a faixa que a cruza vira dois trechos
        const dkA = Math.floor(f - a0 + 0.5);
        const dkB = Math.floor(f - a1 + 0.5);
        const corte = dkA === dkB ? a1 : f + 0.5 - dkA;
        bitsDaCelula.fill(0);
        for (let p = 0; p < (dkA === dkB ? 1 : 2); p++) {
          const p0 = p === 0 ? a0 : corte;
          const p1 = p === 0 ? corte : a1;
          const dk = (p === 0 ? dkA : dkB) + jr;
          const r0 = (dk + p0 - f) * lado;
          const r1 = (dk + p1 - f) * lado;
          // a faixa inteira (o arco todo) antes das células
          if (!caixaDaJanela(v, t.s, r0, r1, (ja - 0.5) * ladoArco, (ja + 0.5) * ladoArco)) continue;
          const c0 = v.gf[o]! * dk + v.fs[o]! + Math.min(g * p0, g * p1);
          const largo = Math.abs(g) * (p1 - p0);
          for (let c = 0; c < CELULAS_POR_FAIXA; c++) {
            const k = b * CELULAS_POR_FAIXA + c;
            const w = cel.hMax[k]! - cel.hMin[k]! + largo + 2 * FOLGA_DO_FLOAT;
            let n = 0;
            if (w >= 1) {
              arcos[0] = -0.5;
              arcos[1] = 0.5;
              n = 1;
            } else {
              let lo = cel.hMin[k]! + c0 - FOLGA_DO_FLOAT;
              lo -= Math.floor(lo + 0.5);
              arcos[0] = lo;
              arcos[1] = Math.min(lo + w, 0.5);
              n = 1;
              if (lo + w > 0.5) {
                arcos[2] = -0.5;
                arcos[3] = lo + w - 1;
                n = 2;
              }
            }
            for (let q = 0; q < n; q++)
              bitsDaCelula[c] |= caixaDaJanela(v, t.s, r0, r1, (arcos[2 * q]! + ja) * ladoArco, (arcos[2 * q + 1]! + ja) * ladoArco);
          }
        }
        for (let c = 0; c < CELULAS_POR_FAIXA; c++) {
          const x = bitsDaCelula[c]!;
          const k = codigo + b * CELULAS_POR_FAIXA + c;
          if (unir) {
            if (x) opacos[nOp++] = k;
          } else {
            if (x & 1) opacos[nOp++] = k;
            if (x & 2) esmaece[nEs++] = k;
          }
        }
      }
    }
  }
  return [nOp, nEs];
}

class Faixa {
  /** os pontos opacos e os que estão entrando: uma instância por célula (`celulasDoQuadro`) */
  readonly pontos: THREE.Points;
  readonly esmaece: THREE.Points;
  /** as células de cada oitava e a permutação delas (o id de cada vértice da célula) */
  readonly celulas: CelulasDaOitava[];
  readonly permutacao: THREE.DataTexture;
  private readonly codigos: THREE.InstancedBufferAttribute[];
  /** as de perto, da frente para trás em x */
  readonly malhas: THREE.Mesh[];
  /** o desenho de cada malha com o pré-passo e o de reserva, sem ele */
  private readonly leves: THREE.ShaderMaterial[] = [];
  private readonly reservas: THREE.ShaderMaterial[] = [];
  private readonly pxs: number[];
  private readonly ordens: OrdemDaOitava[];
  private readonly ids: THREE.InstancedBufferAttribute[];
  /** as chaves da ordem da frente para trás: log da distância e o id */
  private readonly chaves: Float64Array[];
  /** o pré-passo: um ponto por pedaço das malhas (o id; o primeiro é a névoa da câmera) */
  readonly pre: THREE.Points;
  private readonly preIds: THREE.BufferAttribute;
  /** quantos pontos o pré-passo desenha agora (1 = só a névoa: nenhuma malha) */
  nPre = 1;
  /** as sombras: um triângulo por pedaço das células de `acenderSombra` (desenhadas fora do quadro, no alvo delas) */
  readonly sombra: THREE.Mesh;
  private readonly codigosDaSombra: THREE.InstancedBufferAttribute;

  constructor(
    material: (desenho: Desenho, formas?: THREE.DataTexture) => THREE.ShaderMaterial,
    ordens: OrdemDaOitava[],
    celulas: CelulasDaOitava[]
  ) {
    this.ordens = ordens;
    // a ordem de desenho: os ids de cada oitava por célula, numa textura
    this.celulas = celulas;
    const largura = 512;
    const perm = new Float32Array(OITAVAS * PEDRAS_POR_TIER.cinema);
    this.celulas.forEach((c, o) => perm.set(c.ids, o * PEDRAS_POR_TIER.cinema));
    this.permutacao = new THREE.DataTexture(perm, largura, perm.length / largura, THREE.RedFormat, THREE.FloatType);
    this.permutacao.needsUpdate = true;
    // só a contagem importa: o vértice é (célula, pedaço da célula) (gl_InstanceID, gl_VertexID)
    const contagem = new THREE.BufferAttribute(new Uint8Array(CELULA), 1);
    this.codigos = [];
    const pontos = (desenho: Desenho) => {
      const g = new THREE.InstancedBufferGeometry();
      g.setAttribute('position', contagem);
      const codigos = new THREE.InstancedBufferAttribute(new Float32Array(IMAGENS.length * OITAVAS * CELULAS), 1, false, 1);
      codigos.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('aCelula', codigos);
      g.instanceCount = 0;
      this.codigos.push(codigos);
      // A ESFERA ENVOLVENTE À MÃO: sem ela o three a calcula ao ordenar a cena
      // lendo y e z do atributo de um componente — o último vértice lê
      // `undefined`, que vai parar num Vector3 do próprio three, e a partir
      // daí TODO Vector3 da página passa a guardar os campos sem o atalho de
      // número (o planejador da galáxia dobrava de ~4 para ~9 ms por quadro).
      // Ninguém a usa: os pontos não são recortados e a ordem é a de `renderOrder`.
      g.boundingSphere = new THREE.Sphere();
      return new THREE.Points(g, material(desenho));
    };
    this.pontos = pontos('ponto');
    this.esmaece = pontos('esmaece');
    const gs = new THREE.InstancedBufferGeometry();
    gs.setAttribute('position', new THREE.BufferAttribute(new Uint8Array(3 * CELULA), 1));
    this.codigosDaSombra = new THREE.InstancedBufferAttribute(new Float32Array(IMAGENS.length * OITAVAS * CELULAS), 1, false, 1);
    this.codigosDaSombra.setUsage(THREE.DynamicDrawUsage);
    gs.setAttribute('aCelula', this.codigosDaSombra);
    gs.instanceCount = 0;
    gs.boundingSphere = new THREE.Sphere();
    this.sombra = new THREE.Mesh(gs, material('sombra'));
    this.sombra.frustumCulled = false;
    this.sombra.matrixAutoUpdate = false;
    for (const p of [this.pontos, this.esmaece]) {
      p.frustumCulled = false;
      p.visible = false;
    }
    const cap = capacidadeDePerto();
    this.pxs = MALHAS.map((m) => m.px);
    this.ids = MALHAS.map(() => {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1, false, 1);
      a.setUsage(THREE.DynamicDrawUsage);
      return a;
    });
    this.chaves = MALHAS.map(() => new Float64Array(cap));
    this.malhas = MALHAS.map(({ detalhe }, k) => {
      const f = formasDe(detalhe);
      const geo = new THREE.InstancedBufferGeometry();
      geo.index = f.geo.index;
      geo.setAttribute('position', f.geo.getAttribute('position'));
      geo.setAttribute('aId', this.ids[k]!);
      geo.instanceCount = 0;
      this.leves.push(material('malha', f.tex));
      this.reservas.push(material('reserva', f.tex));
      const malha = new THREE.Mesh(geo, this.reservas[k]!);
      // o ladrilho segue a câmera: nenhuma esfera envolvente o descreve
      malha.frustumCulled = false;
      malha.visible = false;
      return malha;
    });
    const ids = new Float32Array(1 + MALHAS.length * cap);
    ids[0] = -1;
    this.preIds = new THREE.BufferAttribute(ids, 1);
    this.preIds.setUsage(THREE.DynamicDrawUsage);
    const gp = new THREE.InstancedBufferGeometry();
    gp.setAttribute('position', this.preIds);
    gp.instanceCount = PRE_BANDAS;
    gp.setDrawRange(0, 1);
    // à mão, pelo mesmo motivo dos pontos (o atributo tem um componente)
    gp.boundingSphere = new THREE.Sphere();
    this.pre = new THREE.Points(gp, material('pre'));
    this.pre.frustumCulled = false;
  }

  /** com o pré-passo pronto, as malhas leem dele; sem, fazem a conta elas mesmas */
  usarPrePasso(pronto: boolean) {
    this.malhas.forEach((m, k) => {
      m.material = (pronto ? this.leves : this.reservas)[k]!;
    });
  }

  /** os pontos: as células que `celulasDoQuadro` escolheu */
  acenderPontos(vista: VistaDasCelulas) {
    const [op, es] = this.codigos.map((c) => c.array as Float32Array);
    const ns = celulasDoQuadro(vista, this.celulas, op!, es!);
    [this.pontos, this.esmaece].forEach((p, k) => {
      const n = ns[k]!;
      (p.geometry as THREE.InstancedBufferGeometry).instanceCount = n;
      p.visible = n > 0;
      if (n > 0) {
        const a = this.codigos[k]!;
        a.clearUpdateRanges();
        a.addUpdateRange(0, n);
        a.needsUpdate = true;
      }
    });
  }

  /** as sombras: as células com algum pedaço presente, das oitavas e com a folga que a vista traz */
  acenderSombra(vista: VistaDasCelulas) {
    const a = this.codigosDaSombra;
    const op = a.array as Float32Array;
    const n = celulasDoQuadro(vista, this.celulas, op, op, true)[0];
    (this.sombra.geometry as THREE.InstancedBufferGeometry).instanceCount = n;
    this.sombra.visible = n > 0;
    if (n > 0) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, n);
      a.needsUpdate = true;
    }
  }

  /**
   * AS CANDIDATAS DE PERTO, sem avaliar todas: o sorteio radial é estático,
   * então a janela radial é um trecho contíguo da ordem (com a volta em 1);
   * nele, o arco sai das mesmas contas do vértice (`uGi`, `uGf`, `uFs`), e
   * o cone da lente (com folga), no lugar com a esteira, tira as de fora do
   * quadro. Superconjunto das de x < `X_CORTE` que a GPU
   * desenharia.
   */
  escolherDePerto(
    ativas: number,
    porOitava: number,
    rhoKm: number,
    /** a câmera no arco, R0·θ km (o ladrilho das esteiras) */
    sCamKm: number,
    zKm: number,
    espessuraKm: number,
    lente: Lente,
    fr: Float32Array,
    fs: Float32Array,
    gi: Float32Array,
    gf: Float32Array,
    tauMaximo: ((rhoKm: number) => number) | null,
    /** a primeira malha que o tier paga (o telefone não paga a mais fina) */
    malhaMaisFina: number
  ) {
    const ns = this.ids.map(() => 0);
    const nOit = Math.min(Math.max(ativas, 0), OITAVAS);
    const m = lente.m;
    const s00 = Math.sqrt(lente.p00 * lente.p00 + 1);
    const s11 = Math.sqrt(lente.p11 * lente.p11 + 1);
    for (let o = nOit - 1; o >= 0; o--) {
      const t = TABELA_DE_OITAVAS[o]!;
      const raio = 2 ** X_CORTE * t.s * FOLGA_DA_ESCOLHA;
      const raio2 = raio * raio;
      const meiaJanela = raio / t.ladoRadial;
      const f = fr[o]!;
      const ord = this.ordens[o]!;
      const lado = t.ladoRadial;
      const ladoArco = t.ladoNoArco;
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
          // O ACEITE DA DENSIDADE (o mesmo sorteio do vértice) contra o maior
          // τ das caixas vizinhas do perfil: um superconjunto do que a GPU
          // aceita — a malha não paga os vértices de quem ela recusaria
          if (tauMaximo) {
            const rho = rhoKm + dRho;
            const base = misturar((i ^ (o << 24)) >>> 0);
            const sorteio = (misturar((base ^ 0x1b873593) >>> 0) & 0xffff) / 65536;
            if (sorteio * TAU_TETO * R0_KM >= tauMaximo(rho) * rho * 1.01) continue;
          }
          const rc = ord.raio[j]! * t.s;
          const dz = alturaNaCamada(ord.z0[j]!, rc, espessuraKm) - zKm;
          // o raio na tela, px: decide a malha (sem a lente, pela distância)
          const rq = rc * ESCALA_EQUIVALENTE;
          let px = (rq * lente.pxPorRad) / Math.max(Math.sqrt(h2 + dz * dz), rq);
          let d2 = h2 + dz * dz;
          if (lente.ok) {
            // O PRIMEIRO TESTE, folgado e barato: o lugar sorteado, com o
            // deslocamento máximo da esteira de folga
            let th = dS / R0_KM;
            let x = (rhoKm + dRho) * Math.cos(th) - rhoKm;
            let y = (rhoKm + dRho) * Math.sin(th);
            let vx = m[0]! * x + m[1]! * y + m[2]! * dz;
            let vy = m[3]! * x + m[4]! * y + m[5]! * dz;
            let fz = -(m[6]! * x + m[7]! * y + m[8]! * dz);
            let folga = 2.5 * rc + DESLOCAMENTO_MAXIMO_KM + FOLGA_DO_CONE * Math.sqrt(d2);
            if (fz < -folga || Math.abs(vx) * lente.p00 - fz > folga * s00 || Math.abs(vy) * lente.p11 - fz > folga * s11) {
              continue;
            }
            // o teto de \`PX_CORTE\` (o raio na tela, por cima): o de poucos px
            // fica no ponto e a malha não paga os vértices dele
            if ((rq * lente.pxPorRad) / Math.max(fz - DESLOCAMENTO_MAXIMO_KM - FOLGA_DO_CONE * Math.sqrt(d2), rq) < PX_CORTE) continue;
            // O LUGAR COM A ESTEIRA (a conta de \`lugarDaPedra\`): o cone justo,
            // só com a folga da câmera do quadro anterior, e o raio na tela
            const [eR, eS] = deslocamentoDaEsteira(sCamKm + dS, rhoKm + dRho);
            th = (dS + eS) / R0_KM;
            x = (rhoKm + dRho + eR) * Math.cos(th) - rhoKm;
            y = (rhoKm + dRho + eR) * Math.sin(th);
            vx = m[0]! * x + m[1]! * y + m[2]! * dz;
            vy = m[3]! * x + m[4]! * y + m[5]! * dz;
            fz = -(m[6]! * x + m[7]! * y + m[8]! * dz);
            d2 = x * x + y * y + dz * dz;
            folga = 2.5 * rc + FOLGA_DO_CONE * Math.sqrt(d2);
            if (fz < -folga || Math.abs(vx) * lente.p00 - fz > folga * s00 || Math.abs(vy) * lente.p11 - fz > folga * s11) {
              continue;
            }
            if ((rq * lente.pxPorRad) / Math.max(fz - FOLGA_DO_CONE * Math.sqrt(d2), rq) < PX_CORTE) continue;
            px = (rq * lente.pxPorRad) / Math.max(fz, rq);
          }
          const logD = 0.5 * Math.log2(d2);
          let qual = malhaMaisFina;
          while (qual < this.pxs.length - 1 && px < this.pxs[qual]!) qual++;
          const ch = this.chaves[qual]!;
          if (ns[qual]! < ch.length) ch[ns[qual]!++] = Math.floor((logD + 40) * 256) * CHAVE + o * porOitava + i;
        }
      }
    }
    // DA FRENTE PARA TRÁS: o teste de profundidade poupa o fragmento das
    // que ficam atrás. Os ids vão também, em fila, para o pré-passo.
    const pre = this.preIds.array as Float32Array;
    let base = 0;
    this.malhas.forEach((malha, k) => {
      const n = ns[k]!;
      const ch = this.chaves[k]!.subarray(0, n).sort();
      const v = this.ids[k]!.array as Float32Array;
      for (let j = 0; j < n; j++) v[j] = pre[1 + base + j] = ch[j]! % CHAVE;
      this.leves[k]!.uniforms.uBase!.value = this.reservas[k]!.uniforms.uBase!.value = base;
      base += n;
      (malha.geometry as THREE.InstancedBufferGeometry).instanceCount = n;
      malha.visible = n > 0;
      if (n > 0) {
        const a = this.ids[k]!;
        a.clearUpdateRanges();
        a.addUpdateRange(0, n);
        a.needsUpdate = true;
      }
    });
    this.nPre = 1 + base;
    this.pre.geometry.setDrawRange(0, this.nPre);
    if (base > 0) {
      this.preIds.clearUpdateRanges();
      this.preIds.addUpdateRange(1, base);
      this.preIds.needsUpdate = true;
    }
  }

  dispose() {
    for (const m of [this.pontos, this.esmaece, ...this.malhas, this.pre, this.sombra]) m.geometry.dispose();
    for (const m of [this.pontos, this.esmaece, this.pre, this.sombra]) (m.material as THREE.ShaderMaterial).dispose();
    this.permutacao.dispose();
    for (const m of [...this.leves, ...this.reservas]) m.dispose();
    for (const f of FORMAS.values()) {
      f.geo.dispose();
      f.tex.dispose();
      (f.tex.userData.texNorma as THREE.Texture).dispose();
    }
    FORMAS.clear();
  }
}

export class PedrasDoAnel {
  /** o grupo dos desenhos — a matriz do anel mora nele */
  readonly malha = new THREE.Group();

  /** os desenhos: null até o assado terminar (`assarUmPouco`, `assarJa`) */
  private faixa: Faixa | null = null;
  /** o assado em andamento (começa com a câmera rumo ao anel) */
  private passos: Passos<void> | null = null;
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
  /** (ρ km, θ, altura km, fração do campo que o tier desenha) — o que o disco lê para ceder */
  readonly cessao = new THREE.Vector4(0, 0, 0, 0);
  /** a câmera no frame do anel em duas partes: a float32 (raios) e o resto (km) — o disco lê */
  readonly camAlta = new THREE.Vector3();
  readonly camResto = new THREE.Vector3();
  /** a folha das esteiras do disco e a casca da névoa */
  private folha: THREE.Mesh | null = null;
  private nevoa: THREE.Mesh | null = null;
  /** a última câmera que desenhou os pedaços — a escolha de perto lê o cone dela */
  private camera: THREE.Camera | null = null;
  private readonly lente: Lente = { m: new Float64Array(9), p00: 1, p11: 1, pxPorRad: 400, ok: false };
  private readonly m4 = new THREE.Matrix4();
  private readonly tela = new THREE.Vector4();
  /** o pré-passo das malhas: quem desenha (lido do quadro anterior), o alvo e a cena dele */
  private renderer: THREE.WebGLRenderer | null = null;
  private alvoPre: THREE.WebGLRenderTarget | null = null;
  private readonly cenaPre = new THREE.Scene();
  private readonly cameraPre = new THREE.Camera();
  /** o maior τ perto de um raio, do perfil medido (null até o perfil chegar) */
  private tauMaximo: ((rhoKm: number) => number) | null = null;
  /**
   * AS SOMBRAS (`colunaDaSombra`): o alvo do tamanho do quadro, a cena dele,
   * se valem neste quadro, se já foram desenhadas, e os G_o (guardados pela
   * elevação e pela espessura)
   */
  private alvoSombra: THREE.WebGLRenderTarget | null = null;
  private readonly cenaSombra = new THREE.Scene();
  private sombraAtiva = false;
  private espessuraDaSombra = 0;
  private readonly chaveDosG = [Number.NaN, Number.NaN];
  private readonly corAntes = new THREE.Color();

  private readonly opcoes: OpcoesDasPedras;

  /**
   * NADA PESADO AQUI: abrir Saturno não paga o assado. Só os uniformes (as
   * texturas assadas entram em `montar`); o grupo fica vazio e escondido
   * até o assado terminar.
   */
  constructor(opcoes: OpcoesDasPedras) {
    this.opcoes = opcoes;
    // UM objeto de uniformes, dividido por todos os desenhos
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
      uFracaoDoTier: { value: 1 },
      uPorOitava: { value: PEDRAS_POR_TIER.cinema },
      uAtivas: { value: 0 },
      uPxPorRad: { value: 400 },
      uTela: { value: this.tela },
      uFr: { value: this.fr },
      uFs: { value: this.fs },
      uGi: { value: this.gi },
      uGf: { value: this.gf },
      uGiro: { value: 0 },
      uEsteira: { value: null },
      uEstCam: { value: new THREE.Vector4() },
      uForcaEsteira: { value: 0 },
      uRaioFolha: { value: 40 },
      uFundoFolha: { value: -0.02 },
      uRelevo: { value: null },
      uLonge: { value: null },
      uNormaDeLonge: { value: null },
      uPoloVista: { value: new THREE.Vector3(0, 0, 1) },
      uPre: { value: null },
      uPrePronto: { value: 0 },
      uPermutacao: { value: null },
      uSombraSol: { value: new THREE.Vector4(1, 0, 0.5, Math.sqrt(0.75)) },
      uSombraG: { value: new Float32Array(OITAVAS_DA_SOMBRA) },
    };
    this.malha.matrixAutoUpdate = false;
    this.malha.visible = false;
  }

  /** com o assado terminado, os desenhos existem */
  get pronto(): boolean {
    return this.faixa !== null;
  }

  /**
   * O ASSADO EM FATIAS: as contas em cache do módulo (o ladrilho das
   * esteiras, o grão, os agregados, a forma de longe, as formas das três
   * malhas), as ordens e as células de cada oitava, e por fim `montar`.
   */
  private *passosDoAssado(): Passos<void> {
    yield* campoDaEsteiraEmPassos();
    yield* dadoDoGraoEmPassos();
    yield* formasDeLongeEmPassos();
    texturaDeLonge();
    yield;
    for (const { detalhe } of MALHAS) {
      if (FORMAS.has(detalhe)) continue;
      const f = yield* assarFormasEmPassos(detalhe);
      if (!FORMAS.has(detalhe)) FORMAS.set(detalhe, f);
    }
    const ordens: OrdemDaOitava[] = [];
    const celulas: CelulasDaOitava[] = [];
    for (let o = 0; o < OITAVAS; o++) {
      ordens.push(yield* ordemDaOitava(o));
      celulas.push(yield* celulasDaOitavaEmPassos(o));
    }
    this.montar(ordens, celulas);
  }

  /**
   * assa por até `orcamentoMs` de CPU: ao menos um passo, e o seguinte só
   * se o tempo que o anterior levou ainda cabe (os passos são de poucos ms)
   */
  assarUmPouco(orcamentoMs: number) {
    if (this.faixa) return;
    const g = (this.passos ??= this.passosDoAssado());
    const t0 = performance.now();
    let antes = t0;
    let passo = 0;
    for (;;) {
      if (g.next().done || this.faixa) break;
      const agora = performance.now();
      passo = agora - antes;
      antes = agora;
      if (agora - t0 + passo > orcamentoMs) break;
    }
  }

  /** assa o que falta de uma vez (a câmera chegou antes do assado: melhor um engasgo que um buraco) */
  assarJa() {
    if (this.faixa) return;
    drenar((this.passos ??= this.passosDoAssado()));
  }

  /** os desenhos, com tudo assado: barato (texturas embrulham o que já está em cache) */
  private montar(ordens: OrdemDaOitava[], celulas: CelulasDaOitava[]) {
    const opcoes = this.opcoes;
    const constantes = `${opcoes.glslConstantesDoAnel}
${opcoes.glslRegiaoDoAnel}
${opcoes.glslCamadaDoAnel}
const float R_INT = ${opcoes.rInt};
const float R_EXT = ${opcoes.rExt};`;
    const vertice = (v: string) =>
      v
        .replace('CONSTANTES_DO_ANEL', constantes)
        .replace('SOMBRA_DO_PLANETA', opcoes.glslSombraDoPlaneta)
        .replace('ASSADOS_DAS_PEDRAS', glslAssado());
    const fragmento = (f: string) =>
      f.replace('CAMADA_DO_ANEL', opcoes.glslCamadaDoAnel).replace('ASSADOS_DAS_PEDRAS', glslAssado());

    const u = this.uniforms;
    u.uEsteira!.value = texturaDaEsteira();
    u.uRelevo!.value = texturaDoRelevo();
    u.uLonge!.value = texturaDeLonge();
    u.uNormaDeLonge!.value = formasDeLonge().texNorma ??= texturaDaNorma(formasDeLonge().normaDoSol);
    const pre = { PRE_W, PRE_H: linhasDoPrePasso(), PRE_BANDAS };
    const material = (desenho: Desenho, formas?: THREE.DataTexture) => {
      const malha = desenho === 'malha' || desenho === 'reserva';
      const esmaece = desenho === 'esmaece';
      if (desenho === 'sombra') {
        // −ln T SOMA: a ordem dos triângulos não importa
        return new THREE.ShaderMaterial({
          vertexShader: vertice(VERT_DA_SOMBRA),
          fragmentShader: FRAG_DA_SOMBRA,
          defines: { X_CORTE: glslF(X_CORTE), SOMBRA: 1 },
          uniforms: this.uniforms,
          blending: THREE.CustomBlending,
          blendEquation: THREE.AddEquation,
          blendSrc: THREE.OneFactor,
          blendDst: THREE.OneFactor,
          depthTest: false,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        });
      }
      if (desenho === 'pre') {
        return new THREE.ShaderMaterial({
          vertexShader: vertice(VERT_DO_PRE_PASSO),
          fragmentShader: FRAG_DO_PRE_PASSO,
          defines: { X_CORTE: glslF(X_CORTE), MALHA: 1, PRE_PASSO: 1, ...pre },
          uniforms: this.uniforms,
          blending: THREE.NoBlending,
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
        });
      }
      const m = new (malha ? THREE.ShaderMaterial : THREE.RawShaderMaterial)({
        ...(malha ? {} : { glslVersion: THREE.GLSL3 }),
        vertexShader: vertice(malha ? VERT_DA_MALHA : VERT_DO_PONTO),
        fragmentShader: fragmento(malha ? FRAG_DA_MALHA : FRAG_DO_PONTO),
        defines: {
          X_CORTE: glslF(X_CORTE),
          ...(malha ? { MALHA: 1, ...pre } : {}),
          ...(desenho === 'malha' ? { PRE_FRAG: 1 } : {}),
          ...(esmaece ? { ESMAECE: 1 } : {}),
        },
        // os uniformes divididos, mais a forma assada desta malha
        uniforms: formas
          ? { ...this.uniforms, uFormas: { value: formas }, uBase: { value: 0 }, uNormaDaMalha: { value: formas.userData.texNorma as THREE.Data3DTexture } }
          : this.uniforms,
        // os que estão entrando misturam por cima do disco, sem escrever
        // profundidade; o resto é opaco
        transparent: esmaece,
        depthWrite: !esmaece,
        depthTest: true,
      });
      // a profundidade do ponto acertado nunca fica mais perto que a do
      // vértice (a frente do corpo): com a extensão, a GPU descarta antes de
      // sombrear o que está atrás; sem ela, a mesma imagem, mais cara
      if (!malha)
        m.onBeforeCompile = (s, r) => {
          s.fragmentShader = s.fragmentShader.replace(
            'PROFUNDIDADE_SO_CRESCE',
            r.extensions.has('EXT_conservative_depth')
              ? '#extension GL_EXT_conservative_depth : enable\nlayout (depth_greater) out highp float gl_FragDepth;'
              : ''
          );
        };
      return m;
    };
    const faixa = new Faixa(material, ordens, celulas);
    this.uniforms.uPermutacao!.value = faixa.permutacao;
    // DA FRENTE PARA TRÁS: as malhas de perto; os pontos (que descartam) por
    // último, depois das que a GPU sabe esconder
    const ordem: THREE.Object3D[] = [...faixa.malhas, faixa.pontos];
    const lerTela = (renderer: THREE.WebGLRenderer, camera: THREE.Camera) => {
      // o raio na tela (px por radiano) e a janela saem do alvo em que o
      // quadro é desenhado; a câmera fica para a escolha do próximo quadro
      renderer.getCurrentViewport(this.tela);
      this.uniforms.uPxPorRad!.value = 0.5 * this.tela.w * camera.projectionMatrix.elements[5]!;
      this.camera = camera;
      this.renderer = renderer;
    };
    ordem.forEach((m, k) => {
      m.renderOrder = k - ordem.length;
      m.onBeforeRender = (renderer, _cena, camera) => lerTela(renderer, camera);
      this.malha.add(m);
    });
    faixa.esmaece.onBeforeRender = (renderer, _cena, camera) => lerTela(renderer, camera);
    const folha = new THREE.Mesh(
      geometriaDaFolha(),
      new THREE.ShaderMaterial({
        vertexShader: vertice(VERT_DA_FOLHA),
        fragmentShader: vertice(fragmento(FRAG_DA_FOLHA)),
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        // a folha MULTIPLICA o que o disco já pôs no quadro: 2·cor·destino
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
    const nevoa = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 48),
      new THREE.ShaderMaterial({
        vertexShader: vertice(VERT_DA_NEVOA),
        fragmentShader: fragmento(FRAG_DA_NEVOA),
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.BackSide,
      })
    );
    // DEPOIS do disco: a folha (é a luz dele que ela modula), a névoa (atrás
    // de todos os pedaços) e os que estão entrando (na frente dela)
    folha.renderOrder = 10;
    nevoa.renderOrder = 11;
    faixa.esmaece.renderOrder = 12;
    for (const m of [folha, nevoa]) {
      m.frustumCulled = false;
      m.visible = false;
    }
    this.malha.add(folha, nevoa, faixa.esmaece);
    this.cenaPre.add(faixa.pre);
    this.cenaSombra.add(faixa.sombra);
    this.folha = folha;
    this.nevoa = nevoa;
    this.faixa = faixa;
  }

  ligarPerfil(textura: THREE.DataTexture) {
    this.uniforms.uMapaAnel!.value = textura;
    // o maior τ das quatro caixas que a leitura linear do vértice pode
    // misturar (e uma de folga de cada lado), sem o fator da região
    const { data, width } = textura.image as { data: Uint8Array; width: number };
    const tau = new Float32Array(width);
    for (let k = 0; k < width; k++) {
      const alfa = data[4 * k + 3]! / 255;
      tau[k] = alfa < 0.004 ? 0 : -Math.log(Math.max(1 - alfa, 1e-3));
    }
    const maximo = new Float32Array(width);
    for (let k = 0; k < width; k++) {
      let m = 0;
      for (let d = -2; d <= 2; d++) m = Math.max(m, tau[Math.min(Math.max(k + d, 0), width - 1)]!);
      maximo[k] = m;
    }
    const { rInt, rExt, uEscala, uBase, fatorTau } = this.opcoes;
    this.tauMaximo = (rhoKm: number) => {
      const u = ((rhoKm / KM_POR_RAIO - rInt) / (rExt - rInt)) * uEscala + uBase;
      if (u < 0 || u > 1) return 0;
      const k = Math.min(Math.max(Math.floor(u * width), 0), width - 1);
      return maximo[k]! * fatorTau(rhoKm) * 1.001;
    };
  }

  fixarNoAnel(matriz: THREE.Matrix4) {
    this.malha.matrix.copy(matriz);
  }

  /** quantas oitavas a câmera alcança: as maiores primeiro, um prefixo */
  static oitavasAtivas(alturaKm: number): number {
    let n = 0;
    for (const o of TABELA_DE_OITAVAS) {
      // a camada mais o maior pedaço: ~20 m de folga
      if (o.janela > Math.abs(alturaKm) - 0.02) n++;
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
    (this.uniforms.uPoloVista!.value as THREE.Vector3).set(e[8]! / esc, e[9]! / esc, e[10]! / esc).normalize();
    this.lente.p00 = cam.projectionMatrix.elements[0]!;
    this.lente.p11 = cam.projectionMatrix.elements[5]!;
    this.lente.pxPorRad = this.uniforms.uPxPorRad!.value as number;
  }

  atualizar(q: QuadroDasPedras) {
    const c = q.camLocal;
    const rhoKm = Math.hypot(c.x, c.y) * KM_POR_RAIO;
    const zKm = c.z * KM_POR_RAIO;
    const noAnel = rhoKm > RAIO_MIN_KM && rhoKm < RAIO_MAX_KM;
    const espessura = regiaoDoAnelCpu(rhoKm).espessura;
    const ativas = noAnel ? PedrasDoAnel.oitavasAtivas(zKm) : 0;
    const forca = noAnel ? forcaDaEsteiraNoDisco(zKm, espessura) : 0;
    const peso = noAnel ? pesoDaNevoa(zKm, espessura) : 0;
    // O ASSADO É NÍVEL DE DETALHE: em fatias com a câmera rumo ao anel; de
    // uma vez se ela chegou antes (teletransporte, seek de filme)
    if (!this.faixa) {
      if (q.anelNoDestino) this.assarUmPouco(FATIA_DA_CHEGADA_MS);
      else if (ativas > 0 || forca > 0) this.assarJa();
      else if (q.destinoDoAtlas || distanciaDoAnelKm(rhoKm, zKm) < GATILHO_DO_ASSADO_KM) {
        this.assarUmPouco(FATIA_DO_ASSADO_MS);
      }
    }
    const faixa = this.faixa;
    this.malha.visible = faixa !== null && (ativas > 0 || forca > 0);
    this.sombraAtiva = false;
    const fracao = PEDRAS_POR_TIER[q.tier] / PEDRAS_POR_TIER.cinema;
    this.cessao.w = faixa && ativas > 0 ? fracao : 0;
    // a câmera do disco em duas partes vale SEMPRE: a direção de vista do
    // disco sai dela, e do alto (nada desenhado) ela ficava parada na
    // origem — o disco era visto do centro de Saturno e saía escuro
    const [ax, ay, az] = [Math.fround(c.x), Math.fround(c.y), Math.fround(c.z)];
    this.camAlta.set(ax, ay, az);
    this.camResto.set(
      (c.x - ax) * KM_POR_RAIO,
      (c.y - ay) * KM_POR_RAIO,
      (c.z - az) * KM_POR_RAIO,
    );

    // O RELÓGIO: o passo do quadro, com teto contínuo. Fora do desenho o
    // relógio é só lembrado — ninguém vê o pedaço andar.
    const dtBruto = Number.isFinite(q.jd) && Number.isFinite(this.jdAntes)
      ? (q.jd - this.jdAntes) * 86400
      : 0;
    this.jdAntes = q.jd;
    if (!this.malha.visible || !faixa) return;

    const teto = tetoDoPasso(rhoKm);
    const dt = teto * Math.tanh(dtBruto / teto);
    const om = omega(rhoKm);
    // R0·Ω'(ρc) = −1,5·Ω·R0/ρc
    const taxa = -1.5 * om * (R0_KM / rhoKm);
    this.g += taxa * dt;
    this.e += taxa * rhoKm * dt;
    this.giro = (((this.giro + dt / PERIODO_DO_GIRO_S) % 1) + 1) % 1;

    let theta = Math.atan2(c.y, c.x);
    if (theta < 0) theta += 2 * Math.PI;
    fasesDoLadrilho(rhoKm, theta, this.g, this.e, this.fr, this.fs, this.gi, this.gf);

    const porOitava = PEDRAS_POR_TIER[q.tier];
    this.lerLente(theta);
    // a maior espessura que a janela (≤ 1,5 ladrilho da maior oitava) alcança
    const alcance = 1.5 * TABELA_DE_OITAVAS[0]!.ladoRadial;
    const espessuraKm = Math.max(espessura, regiaoDoAnelCpu(rhoKm - alcance).espessura, regiaoDoAnelCpu(rhoKm + alcance).espessura);
    faixa.acenderPontos({ ativas, porOitava, rhoKm, zKm, espessuraKm, lente: this.lente, fr: this.fr, fs: this.fs, gi: this.gi, gf: this.gf });
    faixa.escolherDePerto(ativas, porOitava, rhoKm, R0_KM * theta, zKm, espessura, this.lente, this.fr, this.fs, this.gi, this.gf, this.tauMaximo, q.tier === 'performance' ? 1 : 0);
    const u = this.uniforms;
    (u.uDirSolLocal!.value as THREE.Vector3).copy(q.dirSolLocal);
    (u.uCamLocal!.value as THREE.Vector3).copy(c);
    (u.uEixo!.value as THREE.Vector2).set(Math.cos(theta), Math.sin(theta));
    u.uRhoCamKm!.value = rhoKm;
    u.uZCamKm!.value = zKm;
    u.uLuzGanho!.value = q.luzGanho;
    u.uKPolar!.value = q.kPolar;
    u.uSolAngRad!.value = q.solAngRad;
    u.uFracaoDoTier!.value = fracao;
    u.uPorOitava!.value = porOitava;
    u.uAtivas!.value = ativas;
    u.uGiro!.value = this.giro;
    this.cessao.set(rhoKm, theta, zKm, ativas > 0 ? fracao : 0);
    // a câmera no ladrilho das esteiras (radial, arco no B, no A), em dupla precisão
    const fr = (x: number) => x - Math.floor(x);
    const [vB, vA] = ARCO_DA_ESTEIRA.map((a) => fr((R0_KM * theta * a) / LADO_DA_ESTEIRA_KM));
    (u.uEstCam!.value as THREE.Vector4).set(fr(rhoKm / LADO_DA_ESTEIRA_KM), vB, vA, 0);
    u.uForcaEsteira!.value = forca;
    u.uRaioFolha!.value = raioDaFolhaKm(zKm);
    // do outro lado da camada, além do maior pedaço (o eixo maior passa de a)
    u.uFundoFolha!.value = -(Math.sign(zKm) || 1) * (0.5 * espessura + 2 * A_MAX_KM);
    this.folha!.visible = forca > 0;
    this.nevoa!.visible = peso > 0;

    // AS SOMBRAS: o Sol no plano do anel, os G_o e as células, com a folga
    // do rastro mais longo (o maior pedaço na camada mais espessa). O nível
    // performance fica sem elas (a conta estatística inteira), e de dentro
    // da camada o disco já passou a vez à névoa.
    const L = q.dirSolLocal;
    const senE = Math.max(Math.abs(L.z) / (L.length() || 1), SEN_MIN_DA_SOMBRA);
    const cosE = Math.sqrt(1 - senE * senE);
    const lh = Math.hypot(L.x, L.y) || 1;
    (u.uSombraSol!.value as THREE.Vector4).set(-L.x / lh, -L.y / lh, senE, cosE);
    this.espessuraDaSombra = espessura;
    const chave = this.chaveDosG;
    if (!(Math.abs(senE - chave[0]!) <= 1e-4 * senE) || espessura !== chave[1]) {
      (u.uSombraG!.value as Float32Array).set(fatoresDaSombra(senE, espessura));
      chave[0] = senE;
      chave[1] = espessura;
    }
    const r = this.renderer;
    this.sombraAtiva = q.tier !== 'performance' && ativas > 0 && peso < 1 && r !== null && r.extensions.has('EXT_color_buffer_float');
    faixa.sombra.visible = false;
    if (this.sombraAtiva) {
      this.alvoSombra ??= new THREE.WebGLRenderTarget(1, 1, {
        type: THREE.HalfFloatType,
        format: THREE.RedFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: false,
        generateMipmaps: false,
      });
      faixa.acenderSombra({
        ativas: Math.min(ativas, OITAVAS_DA_SOMBRA),
        porOitava,
        rhoKm,
        zKm,
        espessuraKm,
        lente: this.lente,
        fr: this.fr,
        fs: this.fs,
        gi: this.gi,
        gf: this.gf,
        folgaKm: (A_MAX_KM + espessuraKm * cosE) / senE,
      });
      this.desenharSombra(faixa);
    }
    this.prePasso(faixa);
  }

  /**
   * O DISCO LÊ AS SOMBRAS (`sombraDasPedras`): os uniformes que o gigante
   * criou com `uniformesDaSombraNoDisco`, cheios a cada quadro depois de
   * `atualizar`.
   */
  sombraNoDisco(ua: Record<string, THREE.IUniform>) {
    const sol = this.uniforms.uSombraSol!.value as THREE.Vector4;
    ua.uSombraDasPedras!.value = this.alvoSombra?.texture ?? null;
    const g = this.uniforms.uSombraG!.value as Float32Array;
    (ua.uSombraNoDisco!.value as THREE.Vector4).set(
      this.sombraAtiva && this.alvoSombra ? 1 : 0,
      (0.5 * this.espessuraDaSombra * sol.w) / sol.z,
      g.reduce((x, y) => x + y, 0),
      0
    );
    (ua.uSombraG!.value as Float32Array).set(g);
    // a máscara tem o tamanho do quadro: os px por radiano dela são os do quadro
    (ua.uSombraRumo!.value as THREE.Vector4).set(sol.x, sol.y, sol.z, this.uniforms.uPxPorRad!.value as number);
  }

  /**
   * AS SOMBRAS DO QUADRO, no alvo do tamanho do último quadro, com a câmera
   * dele já no lugar deste: ANTES do desenho do quadro, como o pré-passo —
   * no meio dele, a troca de alvo partia o passe da placa (+1 ms medido).
   */
  private desenharSombra(faixa: Faixa) {
    const r = this.renderer;
    const cam = this.camera;
    const alvo = this.alvoSombra;
    if (!r || !cam || !alvo) return;
    const w = Math.max(this.tela.z, 1);
    const h = Math.max(this.tela.w, 1);
    if (alvo.width !== w || alvo.height !== h) alvo.setSize(w, h);
    cam.updateMatrixWorld();
    this.malha.updateWorldMatrix(true, false);
    const s = faixa.sombra;
    s.matrix.copy(this.malha.matrixWorld);
    s.matrixWorldNeedsUpdate = true;
    const antes = r.getRenderTarget();
    const limpa = r.autoClear;
    r.getClearColor(this.corAntes);
    const alfa = r.getClearAlpha();
    r.setRenderTarget(alvo);
    r.setClearColor(0x000000, 0);
    r.clear(true, false, false);
    r.autoClear = false;
    if (s.visible) r.render(this.cenaSombra, cam);
    r.autoClear = limpa;
    r.setClearColor(this.corAntes, alfa);
    r.setRenderTarget(antes);
  }

  /**
   * O PRÉ-PASSO: com malha de perto no quadro, a conta de cada pedaço dela
   * vai para a textura antes do desenho, com os uniformes deste quadro. Sem
   * quem desenhe ainda ou sem alvo em float, a malha faz a conta ela mesma.
   */
  private prePasso(faixa: Faixa) {
    const r = this.renderer;
    const u = this.uniforms.uPrePronto!;
    u.value = 0;
    faixa.usarPrePasso(false);
    if (!r || faixa.nPre <= 1 || !r.extensions.has('EXT_color_buffer_float')) return;
    if (!this.alvoPre) {
      this.alvoPre = new THREE.WebGLRenderTarget(PRE_W, PRE_BANDAS * linhasDoPrePasso(), {
        type: THREE.FloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: false,
        generateMipmaps: false,
      });
      this.uniforms.uPre!.value = this.alvoPre.texture;
    }
    const antes = r.getRenderTarget();
    r.setRenderTarget(this.alvoPre);
    r.render(this.cenaPre, this.cameraPre);
    r.setRenderTarget(antes);
    u.value = 1;
    faixa.usarPrePasso(true);
  }

  dispose() {
    this.passos = null;
    this.alvoPre?.dispose();
    this.alvoSombra?.dispose();
    if (!this.faixa) return;
    this.faixa.dispose();
    (this.uniforms.uRelevo!.value as THREE.Texture).dispose();
    (this.uniforms.uLonge!.value as THREE.Texture).dispose();
    (this.uniforms.uNormaDeLonge!.value as THREE.Texture).dispose();
    if (longe) longe.tex = longe.texNorma = null;
    (this.uniforms.uEsteira!.value as THREE.Texture).dispose();
    for (const m of [this.folha!, this.nevoa!]) {
      m.geometry.dispose();
      (m.material as THREE.ShaderMaterial).dispose();
    }
  }
}
