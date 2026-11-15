// ============================================================
// AS PEDRAS DO ANEL EM 3D (`?pedras=3d`, 14/11) — de perto, o anel de
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
// O NOVO ENTRA AO LADO: sem o parâmetro a casa monta a lajota volumétrica
// de sempre (`lajotaDoAnel.ts`, visual aprovado) e o `ANEL_FRAG` sai byte a
// byte o de antes.
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
//     borda da janela (K = 256 tamanhos, ~3 px) o pedaço entra como PONTO
//     com a opacidade subindo de 0 a 1 em meia oitava; ele é sempre do
//     tamanho verdadeiro.
//
//  3. A CAMADA E AS ESTEIRAS. A espessura total é a medida em cada região
//     (`REGIOES_DAS_PEDRAS`); nos anéis A e B os pedaços se juntam nas
//     esteiras de autogravidade (`densidadeDaEsteira`).
//
//  4. O MOVIMENTO. O cisalhamento de Kepler no relógio do app, medido no
//     raio da câmera (relógio parado, pedra parada), e o giro próprio pela
//     agitação medida (`V_AGITACAO_KM_S`).
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
import { BODY_AXES } from '../../../lib/atlas/iauOrientation';
import type { QualityLevel } from '../../core/engine';

/** O interruptor: só `?pedras=3d` liga a peça nova. */
export const PEDRAS_3D: boolean =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('pedras') === '3d';

const KM_POR_RAIO = BODY_AXES.saturn[0]!;

/** GM de Saturno, km³/s² (JPL) — só para Ω(ρ) do cisalhamento. */
const GM_SATURNO = 37_931_207;

/** O RAIO DE REFERÊNCIA DO ARCO: s = R0·θ, logo além da borda do A (136 775 km). */
export const R0_KM = 138_600;

/**
 * OS TAMANHOS: o raio vai de `A_MIN_KM` = 0,5 cm a `A_MAX_KM` = 10 m, com
 * n(a) ∝ a⁻³ (Zebker, Marouf & Tyler 1985; Cuzzi et al. 2009; Harbison,
 * Thomas & Nicholson 2013). Nada maior existe no anel fora as luazinhas das
 * hélices, que não entram aqui.
 */
export const A_MIN_KM = 0.5e-5;
export const A_MAX_KM = 0.01;
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
 * A JANELA, em oitavas de distância (x = log2(d/s)): o pedaço entra em x = 8
 * (d = 256·s, onde ele mede 1/256 rad, ~3 px na lente de 58° em 800 px) com
 * opacidade 0 e fica opaco em x = 7,5. Ele não muda de tamanho, e não sai
 * mais de perto.
 */
export const X_ENTRA = 8;
export const X_PLENO = 7.5;
export const K_JANELA = 2 ** X_ENTRA;

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
export const TAU_TETO = (PEDRAS_POR_TIER.cinema * Math.PI * LN_FAIXA) / (6 * K_JANELA * K_JANELA);

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
}

export const TABELA_DE_OITAVAS: readonly Oitava[] = Array.from({ length: OITAVAS }, (_, o) => {
  const s = S_MAX_KM / 2 ** o;
  const janela = K_JANELA * s;
  const ladoRadial = 2 * janela;
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
 * O ACEITE DA DENSIDADE: o pedaço fica se o sorteio cair abaixo de
 * τ·ρ/(R0·TAU_TETO). O ρ/R0 devolve o encolhimento do ladrilho no arco;
 * τ = 0 (divisão vazia, fora do anel) não aceita pedaço nenhum.
 */
export function aceitaPedra(tau: number, rhoKm: number, sorteio: number): boolean {
  return sorteio * TAU_TETO * R0_KM < tau * rhoKm;
}

/**
 * AS REGIÕES DOS PEDAÇOS, nas fronteiras de `REGIOES_DO_ANEL` (gigante.ts;
 * o teste cobra a igualdade): a ESPESSURA TOTAL da camada, km — A ~6–10 m
 * (Colwell et al. 2006; Hedman et al. 2007): 8 m; C 1,9–5,6 m (Baillié et
 * al. 2011): 4 m; divisão de Cassini 2–20 m (Tiscareno et al. 2007): 10 m;
 * o B não foi medido: 8 m, o do A, adotado — e a FORÇA DAS ESTEIRAS, 1 só
 * no A e no B (ausentes no C e na divisão: Colwell 2006, Hedman 2007).
 */
export const REGIOES_DAS_PEDRAS: readonly { km: number; meia: number; espessura: number; esteira: number }[] = [
  { km: 0, meia: 0, espessura: 0.004, esteira: 0 },
  { km: 74490, meia: 150, espessura: 0.004, esteira: 0 },
  { km: 91980, meia: 300, espessura: 0.008, esteira: 1 },
  { km: 117580, meia: 60, espessura: 0.01, esteira: 0 },
  { km: 121450, meia: 650, espessura: 0.008, esteira: 1 },
  { km: 136775, meia: 60, espessura: 0.008, esteira: 0 },
];

/** a espessura total da camada (km) e a força das esteiras em `km` — o gêmeo de `regiaoDasPedras` no GLSL */
export function regiaoDasPedras(km: number): { espessura: number; esteira: number } {
  let espessura = REGIOES_DAS_PEDRAS[0]!.espessura;
  let esteira = REGIOES_DAS_PEDRAS[0]!.esteira;
  for (let k = 1; k < REGIOES_DAS_PEDRAS.length; k++) {
    const r = REGIOES_DAS_PEDRAS[k]!;
    const a = REGIOES_DAS_PEDRAS[k - 1]!;
    const s = suave(r.km - r.meia, r.km + r.meia, km);
    espessura += (r.espessura - a.espessura) * s;
    esteira += (r.esteira - a.esteira) * s;
  }
  return { espessura, esteira };
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
 * +s), inclinadas `anguloDaEsteira` da direção orbital; filamentos
 * irregulares e grumosos de poucas vezes o espaçamento, com vãos quase
 * vazios entre eles; razão altura/largura 0,1–0,37 — da ordem da própria
 * camada, e por isso a esteira não ganha altura própria aqui.
 *
 * A CONSTRUÇÃO: um RUÍDO DE GABOR — a soma de `NUCLEOS_POR_CELULA` núcleos
 * por célula, cada um um trem de cristas de comprimento λ ao longo da
 * normal n = (cos φ, sen φ), sob um envelope compacto alongado nas cristas
 * (`ENVELOPE_XI_KM` × `ENVELOPE_ETA_KM`), num lugar e numa fase sorteados.
 * O ponto lê as 2×2 células mais perto: o envelope cabe em meia célula,
 * então nenhuma fronteira de célula aparece. Da soma complexa Z = Σ e·e^{iψ}
 * = |Z|·e^{iΦ} sai o deslocamento ao longo de n, δ = (λ/π)·arg 1/(1 − w),
 * w = γ·Z·|Z|/(|Z|² + E0) (a forma da onda em `GAMA_DA_ESTEIRA`): uma onda de
 * fase e amplitude que vagueiam (os filamentos se formam, se fundem e se
 * desfazem; onde |Z| é pequeno o campo acalma). A densidade é
 * 1/(1 + ∂δ/∂n) com a derivada analítica — média 1 (a massa só anda), e o
 * mapa é inversível porque ∂δ/∂n > −1 (o teste cobra). O disco lê a MESMA
 * densidade (`densidadeDaEsteira`) no ponto final.
 */
export const LAMBDA_DA_ESTEIRA_KM = 0.06;
export const CELULA_DA_ESTEIRA_KM = 0.3;
/** a célula no arco, em s = R0·θ: a física (s·ρ/R0) passa de 0,29 km no B interno */
const CELULA_NO_ARCO_ALVO_KM = 0.45;
const CELULAS_NA_VOLTA = Math.round((2 * Math.PI * R0_KM) / CELULA_NO_ARCO_ALVO_KM);
const CELULA_NO_ARCO_KM = (2 * Math.PI * R0_KM) / CELULAS_NA_VOLTA;
/** os núcleos de Gabor por célula e o envelope (meio-eixos, km): cruzando e ao longo das cristas */
const NUCLEOS_POR_CELULA = 10;
const ENVELOPE_XI_KM = 0.12;
const ENVELOPE_ETA_KM = 0.15;
/** o piso E0 da amplitude (|Z|² médio ~0,7 no A): abaixo dele o campo acalma */
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
/** o deslocamento máximo de um pedaço pela esteira, km (|arg 1/(1 − w)| ≤ asen γ) */
const DESLOCAMENTO_MAXIMO_KM = (2 * Math.asin(GAMA_DA_ESTEIRA) * LAMBDA_DA_ESTEIRA_KM) / (2 * Math.PI) + 0.0005;
const GRAU = Math.PI / 180;

/**
 * O ÂNGULO DAS ESTEIRAS com a direção orbital, rad: ~18° no A médio subindo
 * a ~24° no A externo (Hedman et al. 2007; Ferrari et al. 2009). No B,
 * 22° — o meio da faixa medida de 18° a 26°, adotado.
 */
export function anguloDaEsteira(km: number): number {
  return (22 - 4 * suave(117580, 121450, km) + 6 * suave(128000, 134000, km)) * GRAU;
}

/** o sorteio inteiro do vértice (`misturar` no GLSL), bit a bit */
function misturar(x: number): number {
  x = (x ^ (x >>> 16)) >>> 0;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/**
 * (δ, ∂δ/∂n) da esteira no ponto (ρ, s = R0·θ), km — o gêmeo de `esteira` no
 * GLSL (lá relativo à câmera, aqui absoluto: a mesma conta).
 */
function esteiraEm(rhoKm: number, sKm: number): [number, number] {
  const amp = regiaoDasPedras(rhoKm).esteira;
  if (amp <= 0) return [0, 0];
  const ang = anguloDaEsteira(rhoKm);
  const nr = Math.cos(ang);
  const ns = Math.sin(ang);
  const uR = rhoKm / CELULA_DA_ESTEIRA_KM;
  const uS = sKm / CELULA_NO_ARCO_KM;
  const r0 = Math.floor(uR - 0.5);
  const s0 = Math.floor(uS - 0.5);
  const tr = uR - r0;
  const ts = uS - s0;
  const escS = (CELULA_NO_ARCO_KM * rhoKm) / R0_KM;
  const k = (2 * Math.PI) / LAMBDA_DA_ESTEIRA_KM;
  const ix2 = 1 / (ENVELOPE_XI_KM * ENVELOPE_XI_KM);
  const ie2 = 1 / (ENVELOPE_ETA_KM * ENVELOPE_ETA_KM);
  // Z = Σ e·e^{iψ} (zc, zs) e a derivada ao longo de n (dc, ds)
  let zc = 0;
  let zs = 0;
  let dc = 0;
  let ds = 0;
  for (let a = 0; a < 2; a++) {
    for (let b = 0; b < 2; b++) {
      const iR = r0 + a;
      const iS = (((s0 + b) % CELULAS_NA_VOLTA) + CELULAS_NA_VOLTA) % CELULAS_NA_VOLTA;
      const hc = misturar((Math.imul(iR, 0x8da6b343) ^ misturar((iS + 0x68e31da4) >>> 0)) >>> 0);
      for (let j = 0; j < NUCLEOS_POR_CELULA; j++) {
        const h = misturar((hc ^ Math.imul(j + 1, 0x9e3779b9)) >>> 0);
        const xr = (tr - a - (h & 0x3ff) / 1024) * CELULA_DA_ESTEIRA_KM;
        const xs = (ts - b - ((h >>> 10) & 0x3ff) / 1024) * escS;
        const xi = xr * nr + xs * ns;
        const eta = xs * nr - xr * ns;
        const q = xi * xi * ix2 + eta * eta * ie2;
        if (q >= 1) continue;
        const m = 1 - q;
        const e = m * m * m;
        const eXi = -6 * m * m * xi * ix2;
        const psi = k * xi + (2 * Math.PI * (h >>> 20)) / 4096;
        const c = Math.cos(psi);
        const sn = Math.sin(psi);
        zc += e * c;
        zs += e * sn;
        dc += eXi * c - e * k * sn;
        ds += eXi * sn + e * k * c;
      }
    }
  }
  // w = γ·Z·|Z|/(|Z|² + E0) e a derivada dela ao longo de n; δ = (2/k)·arg 1/(1 − w)
  const z2 = zc * zc + zs * zs;
  const A = z2 + PISO_DA_AMPLITUDE;
  const r = Math.max(Math.sqrt(z2), 1e-9);
  const dr = (zc * dc + zs * ds) / r;
  const g = (amp * GAMA_DA_ESTEIRA) / A;
  const f = dr / r - (2 * r * dr) / A;
  const wr = g * r * zc;
  const wi = g * r * zs;
  const dwr = g * r * (dc + zc * f);
  const dwi = g * r * (ds + zs * f);
  const um = 1 - wr;
  return [(2 / k) * Math.atan2(wi, um), ((2 / k) * (dwi * um + dwr * wi)) / (um * um + wi * wi)];
}

/** o ESTIRAMENTO do mapa da esteira no lugar sorteado (ρ, s): 1 + ∂δ/∂n — o mapa é inversível se for > 0 */
export function estiramentoDaEsteira(sKm: number, rhoKm: number): number {
  return 1 + esteiraEm(rhoKm, sKm)[1];
}

/** O DESLOCAMENTO de um pedaço cujo lugar sorteado é (ρ, s): (Δρ, Δs em R0·θ), km */
export function deslocamentoDaEsteira(sKm: number, rhoKm: number): [number, number] {
  const [d] = esteiraEm(rhoKm, sKm);
  const ang = anguloDaEsteira(rhoKm);
  return [d * Math.cos(ang), (d * Math.sin(ang) * R0_KM) / rhoKm];
}

/**
 * A DENSIDADE DAS ESTEIRAS no ponto (s = R0·θ, ρ), de média 1: o ponto de
 * origem pelo inverso do deslocamento (Newton ao longo de n — o mapa é
 * monotônico, 1 + ∂δ/∂n ≥ 0,1), e a densidade 1/(1 + ∂δ/∂n) lá. Vale 1 fora
 * do A e do B.
 */
export function densidadeDaEsteira(sKm: number, rhoKm: number): number {
  if (regiaoDasPedras(rhoKm).esteira <= 0) return 1;
  const ang = anguloDaEsteira(rhoKm);
  const nr = Math.cos(ang);
  const ns = (Math.sin(ang) * R0_KM) / rhoKm;
  let u = 0;
  let dn = 0;
  for (let k = 0; k < 8; k++) {
    const [d, dnk] = esteiraEm(rhoKm - u * nr, sKm - u * ns);
    dn = dnk;
    u -= (u - d) / (1 + dnk);
    u = Math.max(-DESLOCAMENTO_MAXIMO_KM, Math.min(DESLOCAMENTO_MAXIMO_KM, u));
  }
  dn = esteiraEm(rhoKm - u * nr, sKm - u * ns)[1];
  return 1 / (1 + dn);
}

/** Ω kepleriano a `rhoKm` do centro, rad/s */
function omega(rhoKm: number): number {
  return Math.sqrt(GM_SATURNO / (rhoKm * rhoKm * rhoKm));
}

/**
 * O TETO DO PASSO DO RELÓGIO (s de app por quadro): o pedaço na borda da
 * janela anda no arco 1,5·Ω·R0/ρ · K·s por segundo; um quinto do tamanho
 * por quadro é o limite. É o mesmo número em toda oitava.
 */
export function tetoDoPasso(rhoKm: number): number {
  return 0.2 / (1.5 * omega(rhoKm) * (R0_KM / rhoKm) * K_JANELA);
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
 * escolha da imagem do ladrilho mais perto dela.
 */
export function lugarDaPedra(
  o: number,
  i: number,
  cam: { rhoKm: number; theta: number; zKm: number },
  g = 0,
  e = 0
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
  const dk = Math.floor(fr[o]! - a + 0.5);
  const dRho = (dk + a - fr[o]!) * t.ladoRadial;
  const cis = ((gi[o]! * q) % 65536) / 65536 + gf[o]! * (dk + a);
  let sig = (h1 >>> 8) / 16777216 + cis + fs[o]!;
  sig -= Math.floor(sig + 0.5);
  const raioKm = (0.5 * t.s) / Math.sqrt(1 - (0.75 * (h0 >>> 16)) / 65536);
  const rhoKm = cam.rhoKm + dRho;
  const z0 = ((h2 & 0xffff) + (h2 >>> 16) + 1) / 65536 - 1;
  const volta = 2 * Math.PI * R0_KM;
  let sKm = R0_KM * cam.theta + sig * t.ladoNoArco;
  const [eR, eS] = deslocamentoDaEsteira(sKm, rhoKm);
  sKm = (((sKm + eS) % volta) + volta) % volta;
  return { rhoKm: rhoKm + eR, sKm, zKm: alturaNaCamada(z0, raioKm, regiaoDasPedras(rhoKm).espessura), raioKm };
}

/**
 * O GIRO PRÓPRIO: não medido; supõe-se equipartição com a agitação — a
 * velocidade aleatória entre vizinhos, ~1 mm/s, a mesma que dá a camada de
 * ~8 m (H ~ v/Ω). Velocidade angular ≈ v/a em torno de um eixo sorteado,
 * contada em voltas inteiras por `PERIODO_DO_GIRO_S` (o relógio fica preciso
 * no float32; o erro da contagem é < 3 % no pedaço de 10 m).
 */
export const V_AGITACAO_KM_S = 1e-6;
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
 * A SOMBRA MÚTUA, estatística: o pedaço mais fundo na camada, do lado
 * oposto ao Sol, recebe menos Sol que o de cima. Com F a fração da camada
 * entre ele e a face do Sol (uniforme sobre os pedaços), o Sol direto vale
 * 1 + `SOMBRA_MUTUA`·w·(1 − 2F): média 1 exata e limites [0,5; 1,5]. O
 * peso w sobe com τ/sen(elevação do Sol) e satura em 1.
 */
export const SOMBRA_MUTUA = 0.5;
export function sombraMutua(fracaoAcima: number, peso: number): number {
  return 1 + SOMBRA_MUTUA * grampo(peso) * (1 - 2 * grampo(fracaoAcima));
}

/**
 * O CORTE, em oitavas de distância: além dele o pedaço é um PONTO (um
 * vértice só, o corpo acertado no fragmento); aquém, uma MALHA escolhida na
 * CPU.
 */
export const X_CORTE = 5.5;

/**
 * AS FORMAS: a de cada pedaço não foi medida. O modelo aceito é que os
 * grandes são AGREGADOS efêmeros de pedaços menores (Davis et al. 1984):
 * acima de `DIAMETRO_DOS_MONTES_KM` (~2,5 m) todo pedaço é MONTE — doze bolas
 * de tamanhos bem diferentes, unidas por um máximo suave, e de perto dezenas
 * de submembros pela lei dos tamanhos (`subMembros`); abaixo, a maioria é
 * BLOCO — gelo único e anguloso, de perto um poliedro de 8 a 14 faces
 * (`planosDoBloco`).
 * Nenhum bloco entre os grandes: um monólito de 20 m com faces planas lia
 * como uma tábua na frente de Saturno, e o modelo não o sustenta.
 */
export const DIAMETRO_DOS_MONTES_KM = 0.0025;
const BLOCOS_ENTRE_OS_GRANDES = 0;
const BLOCOS_ENTRE_OS_PEQUENOS = 0.8;
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
 * De longe o poliedro é o de quinas vivas; de perto, as arestas
 * arredondam. O alongado e o achatado vêm dos eixos da pedra, como antes.
 */
const PLANOS_DO_BLOCO = [8, 14] as const;
/** o expoente do mínimo suave das faces: a aresta arredonda ~2 % do raio */
const P_DA_ARESTA = 40;
/** as linhas de cada variante na textura das formas: uA, uB, nA, nB, (oclusão, sujeira) */
const LINHAS_DA_FORMA = 5;
const BASE_DO_BLOCO = 0x2545f491;
const BASE_DO_MONTE = 0x9e3779b9;
/** as bolas do monte de longe (o miolo e as três grandes) */
const BOLAS_A_VALER = 4;
/**
 * O TETO DAS MALHAS PELO TAMANHO NA TELA: abaixo deste raio em px o pedaço
 * é ponto, mesmo dentro de x < `X_CORTE`. A forma de perto acende só acima
 * de 2× isto: nada estala.
 */
export const PX_CORTE = 12;
/** as células do ruído de relevo por lado da textura (`texturaDoRelevo`) */
const CELULAS_DO_RELEVO = 16;
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
const ESCALA_DO_MONTE = [1.212, 1.15] as const;
/** a cor do brilho de Saturno sobre as pedras: o bege do globo, luminância 1 (escolha declarada) */
const COR_DE_SATURNO = [1.05, 0.99, 0.9] as const;

/**
 * A LUZ QUE UMA FACE RECEBE, por unidade do albedo: Sol embrulhado com a
 * sombra do globo, a luz do anel em volta (`lamina`: o I/F do próprio
 * disco naquele ponto, ver `luzDaPedra`) só onde o Sol não chega, o globo
 * e o ambiente. É a mesma conta do fragmento (sem fase, brilho e relevo).
 */
export function luzDaFace(cosSol: number, cosGlobo: number, sombra: number, irrGlobo: number, poloAbs = 0, lamina = 0): number {
  const envolve = (c: number) => Math.max((c + ENVOLVE) / (1 + ENVOLVE), 0);
  return (
    envolve(cosSol) * sombra +
    lamina * (1 - 0.6 * poloAbs) * (1 - Math.min(envolve(cosSol), 1)) +
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
/** o raio da casca da névoa, km — além de todos os pedaços desenhados (a janela maior tem 2,56 km) */
const RAIO_DA_NEVOA_KM = 3;
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
 * antes de qualquer pedaço se resolver (a janela maior tem 2,56 km) —, e
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
// 0: o miolo; 1–3: as grandes, que dominam; 4–7: as médias; 8–11: as
// miúdas, meio enterradas no miolo (moram nos vãos entre as grandes)
vec4 membro(uint base, int k) {
  uint h = misturar(base ^ (0x632be5abu + uint(k) * 0x9e3779b9u));
  vec4 r = quatro(h);
  float dist;
  float raio;
  if (k == 0) { dist = 0.1 * r.z; raio = 0.5 + 0.06 * r.w; }
  else if (k < 4) { dist = 0.42 + 0.12 * r.z; raio = 0.36 + 0.14 * r.w; }
  else if (k < 8) { dist = 0.55 + 0.1 * r.z; raio = 0.2 + 0.1 * r.w; }
  else { raio = 0.09 + 0.07 * r.w; dist = 0.5 + 0.6 * raio + 0.05 * r.z; }
  // ×1,12: a área média do monte é a do elipsoide do ponto (a luz fecha)
  return vec4(direcao(r.x, r.y) * dist, raio) * 1.12;
}
// a variante da forma desta pedra (\`baseDaVariante\` na CPU)
int gVar;
uint baseDaForma(bool bloco, uint base) {
  gVar = int(misturar(base ^ 0x5bd1e995u) % ${VARIANTES}u);
  return misturar(uint(gVar) + (bloco ? ${BASE_DO_BLOCO >>> 0}u : ${BASE_DO_MONTE >>> 0}u));
}
`;

const glslRegioes = (campo: 'espessura' | 'esteira') =>
  REGIOES_DAS_PEDRAS.slice(1)
    .map((r, k) => {
      const a = REGIOES_DAS_PEDRAS[k]!;
      return `${glslF(r[campo] - a[campo])} * smoothstep(${glslF(r.km - r.meia)}, ${glslF(r.km + r.meia)}, km)`;
    })
    .join(' + ');

/**
 * AS CONTAS PURAS DOS PEDAÇOS EM GLSL (sem uniforme): a região, o ângulo das
 * esteiras, a cessão pela distância, o peso e a profundidade óptica da
 * névoa. Entram nas pedras e, com `?pedras=3d`, no `ANEL_FRAG`.
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
  return vec2(${glslF(REGIOES_DAS_PEDRAS[0]!.espessura)} + ${glslRegioes('espessura')},
    ${glslF(REGIOES_DAS_PEDRAS[0]!.esteira)} + ${glslRegioes('esteira')});
}
// \`anguloDaEsteira\` na CPU
float anguloDaEsteira(float km) {
  return (22.0 - 4.0 * smoothstep(117580.0, 121450.0, km) + 6.0 * smoothstep(128000.0, 134000.0, km)) * ${glslF(GRAU)};
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
 * AS ESTEIRAS EM GLSL, relativas à câmera: `uCelCam` = (fração da câmera na
 * célula radial, idem no arco, índice da célula radial, idem no arco), da
 * CPU em dupla precisão. (δ, ∂δ/∂n) em (dRho, dS) km da câmera — o gêmeo de
 * `esteiraEm`.
 */
const GLSL_ESTEIRA = /* glsl */ `
uniform vec4 uCelCam;
const float LAMBDA = ${glslF(LAMBDA_DA_ESTEIRA_KM)};
const float CEL_R = ${glslF(CELULA_DA_ESTEIRA_KM)};
const float CEL_S = ${glslF(CELULA_NO_ARCO_KM)};
const float N_CEL = ${glslF(CELULAS_NA_VOLTA)};
// de Z = Σ e·e^{iψ} e da derivada dele ao longo de n, (δ, ∂δ/∂n)
vec2 ondaDaEsteira(vec4 z, float amp) {
  const float K_ONDA = 2.0 * PI / LAMBDA;
  float z2 = dot(z.xy, z.xy);
  float A = z2 + ${glslF(PISO_DA_AMPLITUDE)};
  float r = max(sqrt(z2), 1.0e-9);
  float dr = dot(z.xy, z.zw) / r;
  float g = amp * ${glslF(GAMA_DA_ESTEIRA)} * r / A;
  vec2 w = g * z.xy;
  vec2 dw = g * (z.zw + z.xy * (dr / r - 2.0 * r * dr / A));
  float um = 1.0 - w.x;
  return 2.0 / K_ONDA * vec2(atan(w.y, um), (dw.y * um + dw.x * w.y) / (um * um + w.y * w.y));
}
vec2 esteira(float dRho, float dS, float rhoKm, vec2 n, float amp) {
  if (amp <= 0.0) return vec2(0.0);
  float uR = uCelCam.x + dRho / CEL_R;
  float uS = uCelCam.y + dS / CEL_S;
  float r0 = floor(uR - 0.5);
  float s0 = floor(uS - 0.5);
  float tr = uR - r0;
  float ts = uS - s0;
  float escS = CEL_S * rhoKm / P_R0;
  const float K_ONDA = 2.0 * PI / LAMBDA;
  const float IX2 = ${glslF(1 / (ENVELOPE_XI_KM * ENVELOPE_XI_KM))};
  const float IE2 = ${glslF(1 / (ENVELOPE_ETA_KM * ENVELOPE_ETA_KM))};
  vec4 z = vec4(0.0);
  for (int a = 0; a < 2; a++) {
    for (int b = 0; b < 2; b++) {
      uint iR = uint(uCelCam.z + r0 + float(a));
      uint iS = uint(mod(uCelCam.w + s0 + float(b), N_CEL));
      uint hc = misturar((iR * 0x8da6b343u) ^ misturar(iS + 0x68e31da4u));
      for (int j = 0; j < ${NUCLEOS_POR_CELULA}; j++) {
        uint h = misturar(hc ^ (uint(j + 1) * 0x9e3779b9u));
        float xr = (tr - float(a) - float(h & 0x3ffu) / 1024.0) * CEL_R;
        float xs = (ts - float(b) - float((h >> 10) & 0x3ffu) / 1024.0) * escS;
        float xi = xr * n.x + xs * n.y;
        float eta = xs * n.x - xr * n.y;
        float q = xi * xi * IX2 + eta * eta * IE2;
        if (q >= 1.0) continue;
        float m = 1.0 - q;
        float e = m * m * m;
        float eXi = -6.0 * m * m * xi * IX2;
        float psi = K_ONDA * xi + 2.0 * PI * float(h >> 20) / 4096.0;
        float c = cos(psi);
        float sn = sin(psi);
        z += vec4(e * c, e * sn, eXi * c - e * K_ONDA * sn, eXi * sn + e * K_ONDA * c);
      }
    }
  }
  return ondaDaEsteira(z, amp);
}
// A MESMA SOMA só com os núcleos que alcançam o ponto de partida, com o
// ponto andado u ao longo de n: o ξ de cada núcleo cai de u, o η fica, e a
// fase gira K·u (\`cand\`: ξ0, η0²/E², cos e sen da fase em u = 0)
const int CAND = 10;
vec4 cand[CAND];
int nCand;
vec2 esteiraDosEscolhidos(float u, float amp) {
  const float K_ONDA = 2.0 * PI / LAMBDA;
  const float IX2 = ${glslF(1 / (ENVELOPE_XI_KM * ENVELOPE_XI_KM))};
  float cu = cos(K_ONDA * u);
  float su = sin(K_ONDA * u);
  vec4 z = vec4(0.0);
  for (int c = 0; c < CAND; c++) {
    if (c >= nCand) break;
    float xi = cand[c].x - u;
    float q = xi * xi * IX2 + cand[c].y;
    if (q >= 1.0) continue;
    float m = 1.0 - q;
    float e = m * m * m;
    float eXi = -6.0 * m * m * xi * IX2;
    float cs = cand[c].z * cu + cand[c].w * su;
    float sn = cand[c].w * cu - cand[c].z * su;
    z += vec4(e * cs, e * sn, eXi * cs - e * K_ONDA * sn, eXi * sn + e * K_ONDA * cs);
  }
  return ondaDaEsteira(z, amp);
}
// \`densidadeDaEsteira\` na CPU: Newton ao longo de n até o ponto de origem.
// O ponto anda no máximo \`DESLOCAMENTO_MAXIMO_KM\` ao longo de n, então só
// os núcleos das 2×2 células do ponto de partida que o alcançam com essa
// folga entram nas somas (os de fora delas ficam a mais de meia célula, além
// do envelope); com mais de \`CAND\` deles, a soma inteira. O Newton para
// quando o passo some.
float densidadeDaEsteira(float dRho, float dS, float rhoKm, vec2 n, float amp) {
  if (amp <= 0.0) return 1.0;
  float ns = n.y * P_R0 / rhoKm;
  float uR = uCelCam.x + dRho / CEL_R;
  float uS = uCelCam.y + dS / CEL_S;
  float r0 = floor(uR - 0.5);
  float s0 = floor(uS - 0.5);
  float tr = uR - r0;
  float ts = uS - s0;
  float escS = CEL_S * rhoKm / P_R0;
  // (1 + d/0,12)², d o deslocamento máximo: o alcance do envelope com a folga
  const float Q_FOLGA = ${glslF((1 + DESLOCAMENTO_MAXIMO_KM / Math.min(ENVELOPE_XI_KM, ENVELOPE_ETA_KM)) ** 2 * 1.01)};
  const float IX2 = ${glslF(1 / (ENVELOPE_XI_KM * ENVELOPE_XI_KM))};
  const float IE2 = ${glslF(1 / (ENVELOPE_ETA_KM * ENVELOPE_ETA_KM))};
  const float K_ONDA = 2.0 * PI / LAMBDA;
  nCand = 0;
  bool cheio = false;
  for (int a = 0; a < 2; a++) {
    for (int b = 0; b < 2; b++) {
      uint iR = uint(uCelCam.z + r0 + float(a));
      uint iS = uint(mod(uCelCam.w + s0 + float(b), N_CEL));
      uint hc = misturar((iR * 0x8da6b343u) ^ misturar(iS + 0x68e31da4u));
      for (int j = 0; j < ${NUCLEOS_POR_CELULA}; j++) {
        uint h = misturar(hc ^ (uint(j + 1) * 0x9e3779b9u));
        float xr = (tr - float(a) - float(h & 0x3ffu) / 1024.0) * CEL_R;
        float xs = (ts - float(b) - float((h >> 10) & 0x3ffu) / 1024.0) * escS;
        float xi = xr * n.x + xs * n.y;
        float eta = xs * n.x - xr * n.y;
        float qe = eta * eta * IE2;
        if (xi * xi * IX2 + qe >= Q_FOLGA) continue;
        if (nCand == CAND) cheio = true;
        else {
          float psi = K_ONDA * xi + 2.0 * PI * float(h >> 20) / 4096.0;
          vec4 c4 = vec4(xi, qe, cos(psi), sin(psi));
          for (int c = 0; c < CAND; c++) if (c == nCand) cand[c] = c4;
          nCand++;
        }
      }
    }
  }
  float u = 0.0;
  vec2 e;
  for (int k = 0; k < 6; k++) {
    e = cheio ? esteira(dRho - u * n.x, dS - u * ns, rhoKm, n, amp) : esteiraDosEscolhidos(u, amp);
    float u2 = clamp(u - (u - e.x) / (1.0 + e.y), ${glslF(-DESLOCAMENTO_MAXIMO_KM)}, ${glslF(DESLOCAMENTO_MAXIMO_KM)});
    if (u2 == u) break;
    u = u2;
  }
  e = cheio ? esteira(dRho - u * n.x, dS - u * ns, rhoKm, n, amp) : esteiraDosEscolhidos(u, amp);
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

varying vec3 vSol;
varying vec3 vGlobo;
varying vec3 vTinta;
varying vec3 vNevoaCor;
varying vec4 vLuz;
varying vec4 vFica;
varying float vLamina;
flat varying vec4 vSemente;
#if defined(MALHA)
// a névoa da câmera (cor, (τ, espessura, teto, peso), luz): o fragmento
// da malha integra a dele pelo próprio raio de visada
flat varying vec3 vNevoaCor0;
flat varying vec4 vNevoaCam;
flat varying vec2 vNevoaLuz;
#endif

const float R0 = ${glslF(R0_KM)};
const float K_JANELA = ${glslF(K_JANELA)};
const float S_MAX = ${glslF(S_MAX_KM)};
const float X_ENTRA = ${glslF(X_ENTRA)};
const float X_PLENO = ${glslF(X_PLENO)};
const float TAU_TETO = ${glslF(TAU_TETO)};
const float ESCALA_EQ = ${glslF(ESCALA_EQUIVALENTE)};
const float SOMBRA_MUTUA = ${glslF(SOMBRA_MUTUA)};
const float LADO_NO_ARCO[${OITAVAS}] = float[${OITAVAS}](${TABELA_DE_OITAVAS.map((o) => glslF(o.ladoNoArco)).join(', ')});
CONSTANTES_DO_ANEL
SOMBRA_DO_PLANETA
${GLSL_SORTEIO}
${GLSL_PURO_DAS_PEDRAS}
${GLSL_ESTEIRA}
${GLSL_LUZ_DA_NEVOA}
vec3 girarQ(vec4 q, vec3 v) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

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
bool lugar(int o, int i) {
  gO = o;
  uint base = misturar(uint(i) ^ (uint(o) << 24));
  gBase = base;
  float s = S_MAX * exp2(-float(o));
  float lado = 2.0 * K_JANELA * s;
  // os sorteios do lugar, juntos: h0 = (raio, tamanho), h1 = arco,
  // h2 = altura na camada, e um da densidade
  uint h0 = misturar(base ^ 0x51ed27u);
  uint h1 = misturar(base ^ 0x2c1b3c6du);
  uint h2 = misturar(base ^ 0x7a3f91c5u);

  // O RAIO: a imagem do pedaço mais perto da câmera. O sorteio radial é
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
  // o PONTO opaco, o que ESMAECE e a MALHA são complementares exatos
#if defined(MALHA)
  if (xo >= X_CORTE) return false;
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
  float ang = anguloDaEsteira(rhoKm);
  vec2 n = vec2(cos(ang), sin(ang));
  float del = esteira(dRho, dS, rhoKm, n, reg.y).x;
  dRho += del * n.x;
  dS += del * n.y * R0 / rhoKm;
  rhoKm = uRhoCamKm + dRho;

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
#if defined(PRE_PASSO)
  // o pré-passo para aqui: o que vem depois depende da lente
  gRaio = raio;
  vFica = vec4(p, raio, 0.0, 0.0);
  return true;
#else
  return noQuadro(raio, p, xo);
#endif
}

// A FORMA: o BLOCO é o elipsoide alongado ou achatado com quatro faces de
// fratura planas e, só na malha, mais três faces e lóbulos fracos; o MONTE
// é, de longe, o miolo e as três grandes e, na malha, as médias e as miúdas
// brotando do miolo. Aqui, os parâmetros deste pedaço.
vec4 cortes[4];
vec3 eixosF;
float bloco;
// a escala da área do tipo (\`ESCALA_DO_BLOCO\`, \`ESCALA_DO_MONTE\`), de longe (0) a perto (1)
float escalaDoTipo(float perto) {
  return ESCALA_EQ * (bloco > 0.5
    ? mix(${glslF(ESCALA_DO_BLOCO[0])}, ${glslF(ESCALA_DO_BLOCO[1])}, perto)
    : mix(${glslF(ESCALA_DO_MONTE[0])}, ${glslF(ESCALA_DO_MONTE[1])}, perto));
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
  // os grandes são na maioria montes (agregados, Davis et al. 1984)
  bloco = r6.z < (2.0 * gRaio > ${glslF(DIAMETRO_DOS_MONTES_KM)} ? ${glslF(BLOCOS_ENTRE_OS_GRANDES)} : ${glslF(BLOCOS_ENTRE_OS_PEQUENOS)}) ? 1.0 : 0.0;
  // A FORMA é a da variante: no monte, o miolo e as três grandes (centro,
  // raio) — o que o ponto desenha de longe, e a forma \`A\` da malha
  // assada; no bloco, as faces da variante (\`PLANOS\`, no fragmento)
  uint vb = baseDaForma(bloco > 0.5, base);
#ifndef MALHA
  for (int k = 0; k < 4; k++) cortes[k] = bloco > 0.5 ? vec4(0.0) : membro(vb, k);
#endif
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
  vSemente = vec4(vec3(float(hs & 0x3ffu), float((hs >> 10) & 0x3ffu), float(hs >> 20)) * (37.0 / 1023.0), bloco > 0.5 ? 1.0 + float(gVar) : 0.0);
}
// do quadro da pedra para o do anel (giro inicial e giro próprio)
vec3 girar(vec3 v) {
  v = girarQ(qGiro, v);
  return v * gCosGiro + cross(eixoGiro, v) * gSenGiro + eixoGiro * dot(eixoGiro, v) * (1.0 - gCosGiro);
}

// A FASE DO CORPO: a curva de fase do anel já é a do campo inteiro; um
// pedaço de Lambert visto a uma fase α mostra só a fração Φ(α) do disco
// aceso — sem devolver isso a fase contaria duas vezes. Teto de 2×.
void faseDoCorpo(vec3 vistaKm) {
  float cosA = clamp(dot(vSol, -vistaKm / max(length(vistaKm), 1.0e-30)), -1.0, 1.0);
  float alfaV = acos(cosA);
  vTinta /= max((sqrt(1.0 - cosA * cosA) + (PI - alfaV) * cosA) / PI, ${glslF(FASE_PISO)});
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
  // O ALBEDO POR PEDAÇO: do gelo limpo (claro, levemente azulado) ao gelo
  // sujo (bege mais escuro e mais saturado), com a média na cor medida. O
  // 1,5 = 1 / (2/3): o disco de uma esfera de Lambert em oposição tem
  // média 2/3 do brilho de face — o campo em retro bate com o I/F do disco
  float sujo = float(misturar(gBase ^ 0x3c6ef372u) & 0xffffu) / 65536.0;
  float lumT = max(dot(tinta, vec3(0.2126, 0.7152, 0.0722)), 1.0e-4);
  vec3 limpo = mix(tinta, vec3(lumT), 0.8) * vec3(0.97, 1.0, 1.05) * 1.15;
  vec3 encardido = tinta * vec3(1.03, 0.98, 0.9) * 0.8;
  vTinta = mix(limpo, encardido, sujo) * (IF_RETRO * 1.5 * uLuzGanho * 0.88);
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

  // A SOMBRA MÚTUA, estatística (\`sombraMutua\`)
  float z0 = gZ0;
  float cdf = z0 < 0.0 ? 0.5 * (1.0 + z0) * (1.0 + z0) : 1.0 - 0.5 * (1.0 - z0) * (1.0 - z0);
  float F = uDirSolLocal.z >= 0.0 ? 1.0 - cdf : cdf;
  float senE = abs(uDirSolLocal.z) / max(length(uDirSolLocal), 1.0e-9);
  float forca = clamp(0.6 * min(gTau, 1.5) / max(senE, 0.05), 0.0, 1.0);
  float mutua = 1.0 + SOMBRA_MUTUA * forca * (1.0 - 2.0 * F);

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
    nevoa = peso * (1.0 - exp(-tauDaNevoa(uZCamKm, dir.z, gDist, cam3.y, cam3.x, cam3.z)));
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
  gVar = codigo % ${VARIANTES};
  bloco = codigo >= ${VARIANTES} ? 1.0 : 0.0;
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
varying vec3 vNoAnel;
varying vec3 vLocal;
varying vec3 vNLocal;
flat varying mat3 vGiroM;
// (oclusão das vizinhas ÷ a média, sujeira do membro)
varying vec2 vMonte;
// 1 no triângulo com os três vértices no plano de uma face do bloco
varying float vPlano;
${GLSL_PEDRA_COMUM}
uniform int uBase;
void main() {
  int id = int(aId + 0.5);
  int k = id / uPorOitava;
  int j = 1 + uBase + gl_InstanceID;
  bool pronto = uPrePronto != 0;
  if (pronto ? !lugarPronto(k, id - k * uPorOitava, j) : !lugar(k, id - k * uPorOitava)) {
    foraComum(); vVista = vec3(0.0); vNoAnel = vec3(0.0); vLocal = vec3(0.0); vNLocal = vec3(0.0, 0.0, 1.0); vGiroM = mat3(1.0); vMonte = vec2(1.0, 0.5); vPlano = 0.0;
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
  vMonte = bloco > 0.5 ? vec2(1.0, 0.5) : vec2(mix(1.0, extra.x, lobos), mix(0.5, extra.y, lobos));
  vPlano = bloco < 0.5 ? 0.0 : lobos >= 1.0 ? extra.z : lobos <= 0.0 ? extra.w : extra.z * extra.w;
  gl_Position = comProfundidade(projectionMatrix * vec4(vVista * (gRaioMundo / KM_POR_RAIO), 1.0));
  if (pronto) luzPronta(vVista, j);
  else luzDaPedra(vVista);
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
  if (!lugar(k, id - k * uPorOitava)) return;
  parametrosDaForma();
  luzDaPedra(vec3(0.0));
  if (banda == 0) vSaida = vec4(gOff, vFica.x);
  else if (banda == 1) vSaida = qGiro;
  else if (banda == 2) vSaida = vec4(eixoGiro, gCosGiro);
  else if (banda == 3) vSaida = vec4(gSenGiro, gRaio, gXo, float(gVar) + ${glslF(VARIANTES)} * bloco);
  else if (banda == 4) vSaida = vec4(eixosF, vLamina);
  else if (banda == 5) vSaida = vec4(vTinta, vLuz.x);
  else vSaida = vec4(vLuz.y, vLuz.z, 0.0, 0.0);
}
`;

const FRAG_DO_PRE_PASSO = /* glsl */ `
precision highp float;
flat varying vec4 vSaida;
void main() {
  gl_FragColor = vSaida;
}
`;

/** a textura do pré-passo: largura e faixas (uma por \`vec4\` do pedaço) */
const PRE_W = 256;
const PRE_BANDAS = 7;

/**
 * O PONTO: um pedaço por vértice, o quadrado do tamanho dele na tela — o
 * desenho barato de todos os que ficam além de x = `X_CORTE`. As oitavas vêm
 * da mais FINA para a mais grossa (as finas moram mais perto). O fragmento
 * recebe o corpo inteiro (centro, giro, eixos e as faces do bloco) e acerta
 * nele o raio de visada. Com `ESMAECE`, só os que estão entrando (opacidade
 * < 1), misturados por cima do disco.
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
  int o = clamp(uAtivas, 1, ${OITAVAS}) - 1 - k;
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
  gl_Position = comProfundidade(projectionMatrix * vec4(gCV * (gRaioMundo / KM_POR_RAIO), 1.0));
  // o teto de 48 px da casa (POINTS acima de 64 trava o Mac); o ponto mais
  // largo que o corte de PX_CORTE deixa passar fica em ~43 px
  gl_PointSize = min(2.0 * raioI * uPxPorRad / max(-gCV.z, raioI) + 1.5, 48.0);
  luzDaPedra(gCV);
  vFica.w = raioI;
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
varying float vLamina;
flat varying vec4 vSemente;
const float ENVOLVE = ${glslF(ENVOLVE)};
const float AMBIENTE_DO_ANEL = ${glslF(AMBIENTE_DO_ANEL)};
const float PISO_DA_NOITE = ${glslF(PISO_DA_NOITE)};
// o polo do anel na vista (a luz do anel em volta chega pelo plano dele)
uniform vec3 uPoloVista;
const vec3 COR_DE_SATURNO = vec3(${COR_DE_SATURNO.join(', ')});
uniform sampler2D uRelevo;
CAMADA_DO_ANEL
float envolver(float c) { return max((c + ENVOLVE) / (1.0 + ENVOLVE), 0.0); }

// O RELEVO POR TEXTURA: a altura e a inclinação dela, em três planos no
// quadro da pedra (pesos |n|⁴); \`esc\` em células por raio. A célula
// de 8 a 4 px se apaga pela PEGADA dela na tela — o desvio de +2 no
// mipmap que fazia isso lia, no pedaço grande, um nível de 2 texels por
// célula, e o relevo saía em degraus.
vec3 relevo(vec3 p, vec3 w, float esc, float amp) {
  vec3 c = p * esc;
  float pegada = max(length(dFdx(c)), length(dFdy(c)));
  amp *= 1.0 - smoothstep(${glslF(1 / 8)}, ${glslF(1 / 4)}, pegada);
  vec4 tx = texture(uRelevo, c.yz / ${glslF(CELULAS_DO_RELEVO)});
  vec4 ty = texture(uRelevo, c.zx / ${glslF(CELULAS_DO_RELEVO)});
  vec4 tz = texture(uRelevo, c.xy / ${glslF(CELULAS_DO_RELEVO)});
  vec2 gx = (tx.gb - 0.5) * 3.0;
  vec2 gy = (ty.gb - 0.5) * 3.0;
  vec2 gz = (tz.gb - 0.5) * 3.0;
  return (amp * esc) * (w.x * vec3(0.0, gx.x, gx.y) + w.y * vec3(gy.y, 0.0, gy.x) + w.z * vec3(gz.x, gz.y, 0.0));
}

// A COR DE UM PIXEL DO PEDAÇO: \`vista\` o ponto em km na vista, \`p\` o ponto
// no quadro da pedra (raio ~1), \`nl0\` a normal lisa nesse quadro, \`giro\`
// do quadro da pedra para a vista, \`ao\` a oclusão das vizinhas (já
// dividida pela média), \`sujo\` o gelo do membro.
vec3 sombrear(vec3 vista, vec3 p, vec3 nl0, mat3 giro, float ao, float sujo) {
  vec3 v = -vista / max(length(vista), 1.0e-30);
  bool bloco = vSemente.w > 0.5;
  vec3 w = nl0 * nl0;
  w *= w;
  w /= w.x + w.y + w.z;
  vec3 q = p + vSemente.xyz;
  vec3 nb = nl0;
  // o pedaço de poucos px (\`vFica.z\`, o raio na tela) não paga relevo
  if (vFica.z > 4.0) {
    // (décima volta: a forma de perto já tem os caroços e as faces; o
    // relevo largo, que neles lia como cera e gesso batido, afina)
    vec3 g = relevo(q, w, bloco ? 3.0 : 2.2, bloco ? 0.03 : mix(0.26, 0.12, clamp(vFica.z / ${glslF(PX_CORTE)} - 1.0, 0.0, 1.0)));
    // o monte grande é de mais pedaços: o relevo fino é mais fundo nele,
    // e ganha uma oitava a mais (0 a 2,5 m de diâmetro, 1 a 20 m)
    float grande = bloco ? 0.0 : clamp(log2(2.0 * vFica.y / ${glslF(DIAMETRO_DOS_MONTES_KM)}) / 3.0, 0.0, 1.0);
    if (vFica.z > 12.0) g += relevo(q.zxy + vSemente.zxy, w.zxy, 13.0, bloco ? 0.022 : 0.04 * (1.0 + grande)).yzx;
    if (vFica.z > 40.0 && grande > 0.0) g += relevo(q.yzx + vSemente.yzx, w.yzx, 41.0, 0.016 * grande).zxy;
    nb -= g - dot(g, nl0) * nl0;
  }
  vec3 n = normalize(giro * nb);
  // gelo limpo ou sujo por membro; o bloco já sorteou o dele inteiro
  vec3 tintaM = bloco ? vec3(1.0) : mix(vec3(1.04, 0.99, 0.9) * 0.82, vec3(0.98, 1.0, 1.04) * 1.16, sujo);

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
  // o brilho especular: pequeno, só nas faces viradas para o Sol
  vec3 meio = normalize(vSol + v);
  float brilho = pow(max(dot(n, meio), 0.0), 60.0) * step(0.0, nl);
  cor += vec3(dot(vTinta, vec3(0.2126, 0.7152, 0.0722))) * (0.35 * brilho * vLuz.x * vLuz.z * min(ao, 1.0));
  // o globo (cor quente) e o ambiente do anel
  cor += albedo * COR_DE_SATURNO * (envolver(dot(n, vGlobo)) * vLuz.y);
  cor += albedo * (AMBIENTE_DO_ANEL * (0.25 + 0.75 * vLuz.x) + PISO_DA_NOITE);
  // a luz do anel em volta no lado da noite (\`vLamina\`, o I/F do disco ali)
  cor += albedo * (vLamina * (1.0 - 0.6 * abs(dot(n, uPoloVista))) * (1.0 - min(dif, 1.0)));
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
varying vec3 vNoAnel;
varying vec3 vLocal;
varying vec3 vNLocal;
flat varying mat3 vGiroM;
varying vec2 vMonte;
varying float vPlano;
flat varying vec3 vNevoaCor0;
flat varying vec4 vNevoaCam;
flat varying vec2 vNevoaLuz;
${GLSL_PURO_DAS_PEDRAS}
${GLSL_LUZ_DA_NEVOA.slice(GLSL_LUZ_DA_NEVOA.indexOf('// a luz da multidão'))}
void main() {
  // NA FACE de fratura, a normal é a do plano dos três vértices: a beira
  // da face segue a linha dos vértices levados à aresta, sem os dentes que
  // a normal interpolada de um triângulo meio dentro, meio fora fazia
  vec3 nl0 = normalize(vNLocal);
  vec3 nPlano = cross(dFdx(vLocal), dFdy(vLocal));
  if (vPlano > 0.999 && dot(nPlano, nPlano) > 0.0) {
    nPlano = normalize(nPlano);
    nl0 = dot(nPlano, nl0) < 0.0 ? -nPlano : nPlano;
  }
  vec3 cor = sombrear(vVista, vLocal, nl0, vGiroM, vMonte.x, vMonte.y);
  // A NÉVOA entre a lente e ESTE ponto do pedaço, pelo raio de visada dele
  // (\`tauDaNevoa\`, a mesma conta da casca): macia com a elevação
  if (vNevoaCam.w > 0.0) {
    float L = length(vNoAnel);
    vec3 dir = vNoAnel / max(L, 1.0e-30);
    float a = vNevoaCam.w * (1.0 - exp(-tauDaNevoa(uZCamKm, dir.z, L, vNevoaCam.y, vNevoaCam.x, vNevoaCam.z)));
    cor = mix(cor, corDaNevoa(vNevoaCor0, vNevoaLuz, dir), a);
  }
  gl_FragColor = vec4(cor, 1.0);
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
// as faces dos blocos, \`PLANOS_DO_BLOCO[1]\` por variante (as que sobram, longe)
const vec4 PLANOS[${VARIANTES * PLANOS_DO_BLOCO[1]}] = vec4[](${Array.from(
  { length: VARIANTES },
  (_, v) => {
    const p = planosDoBloco(baseDaVariante(true, v));
    while (p.length < PLANOS_DO_BLOCO[1]) p.push([0, 0, 1, 1e3]);
    return p.map((c) => `vec4(${c.map(glslF).join(', ')})`).join(', ');
  },
).join(', ')});
void main() {
  // o RAIO DE VISADA deste pixel, na vista (a câmera na origem)
  vec2 ndc = (gl_FragCoord.xy - uTela.xy) / uTela.zw * 2.0 - 1.0;
  vec3 d = normalize(vec3((ndc.x + vProj.z) / vProj.x, (ndc.y + vProj.w) / vProj.y, -1.0));
  // no quadro da pedra, com o achatamento desfeito: a esfera unitária
  // (o envelope; o bloco é o poliedro dentro dela)
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
  // fora do corpo, o ponto mais perto do raio: a textura do relevo segue
  // lisa no quadrado de pixels da borda (o descarte vem depois)
  float t = acerta ? t0 : -b / a;
  vec3 q = qo + t * qd;
  if (!acerta) nq = q;
  vec3 c = sombrear(d * t, q * vEixos, normalize(nq / vEixos), vGiro, 1.0, 0.5);
  if (!acerta) discard;
  // a opacidade da entrada (1 no ponto opaco; o que esmaece mistura)
  gl_FragColor = vec4(c, vFica.x);
}
`;

/**
 * A CESSÃO DO DISCO EM GLSL — entra no `ANEL_FRAG` só com `?pedras=3d`.
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
  return a * (1.0 - pesoDaNevoa(uCamDasPedras.z, regiaoDasPedras(uCamDasPedras.x).x));
}
`;

/**
 * O VÉRTICE DO DISCO com `?pedras=3d`: o de sempre (`ANEL_VERT`) mais o
 * ponto relativo à câmera em km, com a câmera em duas partes (a parte
 * float32 e o resto, da CPU em dupla precisão) — a cessão lê a distância
 * à câmera sem os ~15 m de grão do vPos.
 */
export const ANEL_VERT_DAS_PEDRAS = /* glsl */ `
uniform vec3 uCamAltaDasPedras;
uniform vec3 uCamRestoDasPedras;
varying vec3 vPos;
varying vec3 vRelDasPedras;
void main() {
  vPos = position;
  vRelDasPedras = (position - uCamAltaDasPedras) * ${glslF(KM_POR_RAIO)} - uCamRestoDasPedras;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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
  float ang = anguloDaEsteira(rhoKm);
  vec2 n = vec2(cos(ang), sin(ang));
  // A PEGADA do pixel atravessando as cristas, nos dois eixos da tela
  float xi = vGrao.x * n.x + vGrao.y * (rhoKm / P_R0) * n.y;
  float pegada = abs(dFdx(xi)) + abs(dFdy(xi));
  float amp = reg.y * uForcaEsteira * (1.0 - smoothstep(0.125, 0.25, pegada / LAMBDA));
  float u = ((rhoKm / KM_POR_RAIO - R_INT) / (R_EXT - R_INT)) * U_ESCALA + U_BASE;
  vec4 perfil = (u < 0.0 || u > 1.0) ? vec4(0.0) : textureLod(uMapaAnel, vec2(u, 0.5), 0.0);
  if (amp <= 0.0 || perfil.a < 0.004) discard;
  float D = densidadeDaEsteira(vGrao.x, vGrao.y, rhoKm, n, amp);
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
  float a = pesoDaNevoa(uZCamKm, vCamada.y)
    * (1.0 - exp(-tauDaNevoa(uZCamKm, d.z, ${glslF(ALCANCE_DA_NEVOA_KM)}, vCamada.y, vCamada.x, vCamada.z)));
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

/** a faixa de raio em que os pedaços podem existir (a da lajota) */
const RAIO_MIN_KM = 55_000;
const RAIO_MAX_KM = 160_000;

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

function ordemDaOitava(o: number): OrdemDaOitava {
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
  const ids = Array.from({ length: n }, (_, i) => i).sort((x, y) => q[x]! - q[y]!);
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
    return { r, n: planos[dono]!.slice(0, 3), dono };
  }
  let s = 0;
  let melhor = 0;
  let dono = -1;
  const g = [0, 0, 0];
  planos.forEach((c, k) => {
    const t = dot3(d, c) / c[3]!;
    if (t <= 0) return;
    const tp = t ** (p - 1);
    s += tp * t;
    for (let j = 0; j < 3; j++) g[j]! += (tp * c[j]!) / c[3]!;
    if (t > melhor) {
      melhor = t;
      dono = k;
    }
  });
  return { r: s ** (-1 / p), n: unir(g), dono };
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
const dot3 = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
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
function arestasNasLinhas(ds: number[][], idx: ArrayLike<number>, rotulo: (d: number[]) => number): {
  dirs: number[][];
  movido: boolean[];
} {
  const dirs = ds.map((d) => d.slice());
  const movido = ds.map(() => false);
  const rot = ds.map(rotulo);
  const vistas = new Set<number>();
  const n = ds.length;
  for (let j = 0; j < idx.length; j += 3) {
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
 * OS SUBMEMBROS DO MONTE (décima volta): um agregado de 20 m é um monte de
 * milhares de pedaços menores, e doze bolas lisas fundidas liam como cera
 * derretida. Sobre os doze membros, `SUBMEMBROS` sorteados com a lei dos
 * próprios pedaços (n(s) ∝ s⁻³, raio de `S_SUB` em unidades do monte),
 * cada um meio enterrado na superfície que os doze fazem; como os
 * pedaços soltos, a maioria (`BLOCOS_ENTRE_OS_PEQUENOS`) é bloco — um dos
 * poliedros das variantes, espelhado ao acaso —, o resto é bola. A malha
 * fica só com os que ela resolve (`sMin`): os mesmos sorteios em toda
 * malha, as menores com os maiores deles.
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
    // bloco (a variante e o espelho de cada eixo) ou bola (−1)
    const tipo =
      (h2 & 0xff) / 256 < BLOCOS_ENTRE_OS_PEQUENOS
        ? (h2 >>> 8) % VARIANTES
        : -1;
    const esp = [0, 1, 2].map((j) => ((h2 >>> (12 + j)) & 1 ? -1 : 1));
    out.push([d[0] * fundo, d[1] * fundo, d[2] * fundo, s, sujo, tipo, ...esp]);
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
  if (!bloco) {
    const disc = b * b - lc * lc + m[3]! * m[3]!;
    return b + Math.sign(disc) * Math.sqrt(Math.abs(disc));
  }
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
 * O MONTE DE PERTO na direção d: o máximo suave (`P_DO_MONTE`) das saídas
 * pelos doze membros e pelos submembros (a normal sai da malha: as faces
 * dos blocos não têm a conta fechada das bolas).
 */
function raioDoMonteDePerto(u: number[], doze: number[][], sub: number[][]) {
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
  doze.forEach((m, k) => {
    const b = dot3(u, m);
    const disc = b * b - dot3(m, m) + m[3]! * m[3]!;
    soma(b + Math.sign(disc) * Math.sqrt(Math.abs(disc)), k);
  });
  sub.forEach((m, k) => soma(saidaDoSub(u, m), doze.length + k));
  return { r: Math.max(s, 1e-30) ** (1 / P_DO_MONTE), dono };
}

/**
 * Assa as `2 × VARIANTES` formas sobre o molde de `detalhe` numa textura
 * (largura = vértices, `LINHAS_DA_FORMA` linhas por variante; os blocos
 * primeiro). Na face de fratura a normal é a do plano: a face sai lisa e a
 * aresta, dura, sem derivada de tela.
 */
export function assarFormas(detalhe: number): { geo: THREE.BufferGeometry; tex: THREE.DataTexture } {
  const geo = molde(detalhe);
  const pos = geo.getAttribute('position');
  const idx = geo.index!.array;
  const n = pos.count;
  const altura = 2 * VARIANTES * LINHAS_DA_FORMA;
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
  const aoMonte: number[][] = [];
  for (let t = 0; t < 2; t++) {
    const bloco = t === 0;
    for (let v = 0; v < VARIANTES; v++) {
      const vb = baseDaVariante(bloco, v);
      const l0 = (t * VARIANTES + v) * LINHAS_DA_FORMA;
      if (bloco) {
        const planos = planosDoBloco(vb);
        const semente = quatro(misturar((vb ^ 0xd3a2646c) >>> 0)).map(
          (x) => 37 * x,
        );
        // as arestas nas linhas, em cada forma (`arestasNasLinhas`)
        const linA = arestasNasLinhas(
          ds,
          idx,
          (d) => raioDoPoliedro(d, planos, Infinity).dono,
        );
        const linB = arestasNasLinhas(
          ds,
          idx,
          (d) => raioDoPoliedro(d, planos).dono,
        );
        ds.forEach((_, i) => {
          // de longe, o poliedro de quinas vivas: todo vértice numa face
          const dA = linA.dirs[i]!;
          const a = raioDoPoliedro(dA, planos, Infinity);
          por(
            l0,
            i,
            dA.map((x) => x * a.r),
          );
          por(l0 + 2, i, a.n);
          // de perto, as arestas arredondadas e um relevo fino (±1 %) nas
          // faces: a fratura não é um plano de vidro
          const d = linB.dirs[i]!;
          const b = raioDoPoliedro(d, planos);
          const rel =
            1 +
            0.02 *
              (ruidoCPU(
                d[0]! * b.r * 5 + semente[0]!,
                d[1]! * b.r * 5 + semente[1]!,
                d[2]! * b.r * 5 + semente[2]!,
              ) -
                0.5);
          por(
            l0 + 1,
            i,
            d.map((x) => x * b.r * rel),
          );
          por(l0 + 3, i, b.n);
          // (ao, sujo, no plano na forma de perto — nenhum: a aresta é
          // arredondada —, idem na de longe — todos)
          por(l0 + 4, i, [1, 0.5, 0]);
          dado[((l0 + 4) * n + i) * 4 + 3] = 1;
        });
      } else {
        const todos = Array.from({ length: MEMBROS }, (_, k) => membro(vb, k));
        const poucos = todos.map((m, k) =>
          k < BOLAS_A_VALER ? m : [0, 0, 0, 0, 0.5],
        );
        const sub = subMembros(vb, todos, sMin);
        const tudo = [...todos, ...sub];
        const uB: number[][] = [];
        const donos: number[] = [];
        let r2Antes = 0;
        let r2 = 0;
        ds.forEach((d, i) => {
          const a = raioDoMonte(d, poucos);
          por(l0, i, d.map((x) => x * a.r));
          por(l0 + 2, i, a.n);
          r2Antes += raioDoMonte(d, todos).r ** 2;
          const b = raioDoMonteDePerto(d, todos, sub);
          r2 += b.r * b.r;
          uB.push(d.map((x) => x * b.r));
          donos.push(b.dono);
        });
        // a normal da malha (a soma das faces em volta de cada vértice)
        const nB = ds.map(() => [0, 0, 0]);
        for (let j = 0; j < idx.length; j += 3) {
          const [a, b, c] = [uB[idx[j]!]!, uB[idx[j + 1]!]!, uB[idx[j + 2]!]!];
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
        ds.forEach((d, i) => {
          const u = uB[i]!;
          let nn = unir(nB[i]!);
          if (dot3(nn, d) < 0.05) nn = d;
          nB[i] = nn;
          // a oclusão das vizinhas (a de uma esfera vista de um ponto): os
          // vales entre os submembros ficam em sombra
          let occ = 0;
          for (const m of tudo) {
            const w = [m[0]! - u[0]!, m[1]! - u[1]!, m[2]! - u[2]!];
            const l2 = Math.max(dot3(w, w), 1e-4);
            occ +=
              (((m[3]! * m[3]!) / l2) * Math.max(dot3(nn, w), 0)) /
              Math.sqrt(l2);
          }
          const ao = Math.min(Math.max(1 - 0.6 * occ, 0.35), 1);
          aoMonte.push([l0 + 4, i, ao, dot3(u, u)]);
          por(l0 + 4, i, [ao, tudo[donos[i]!]![4]!, 0]);
        });
        // o tamanho é o de antes: o quadrado médio do raio, o da forma de doze
        const k = Math.sqrt(r2Antes / r2);
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
  }
  // a oclusão dividida pela média dela pesada pela área (r²): o albedo médio
  // do monte fica o mesmo, com ou sem os submembros desta malha
  let somaAo = 0;
  let somaP = 0;
  for (const [, , ao, w] of aoMonte) {
    somaAo += ao! * w!;
    somaP += w!;
  }
  for (const [l, i, ao] of aoMonte)
    dado[(l! * n + i!) * 4] = ao! / (somaAo / somaP);
  const tex = new THREE.DataTexture(
    dado,
    n,
    altura,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  tex.needsUpdate = true;
  return { geo, tex };
}

/**
 * O RELEVO DO FRAGMENTO (quinta volta): um ruído de valor periódico de
 * `CELULAS_DO_RELEVO` células por lado, nascido aqui, com mipmaps — o
 * mipmap apaga o que fica menor que o pixel (sem cintilar de longe, sem o
 * quadriculado 2×2 da derivada de tela). R = altura; G, B = a inclinação
 * analítica dela, por célula (÷ 3, + 0,5).
 */
function texturaDoRelevo(): THREE.DataTexture {
  const N = 128;
  const c = N / CELULAS_DO_RELEVO;
  const no = (i: number, j: number) =>
    misturar((Math.imul(i % CELULAS_DO_RELEVO, 0x8da6b343) ^ Math.imul(j % CELULAS_DO_RELEVO, 0xd8163841) ^ 0x51ed27) >>> 0) / 4294967296;
  const dado = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const gx = (x + 0.5) / c, gy = (y + 0.5) / c;
      const i = Math.floor(gx), j = Math.floor(gy);
      const fx = gx - i, fy = gy - j;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const n00 = no(i, j), n10 = no(i + 1, j), n01 = no(i, j + 1), n11 = no(i + 1, j + 1);
      const h = (n00 + (n10 - n00) * sx) * (1 - sy) + (n01 + (n11 - n01) * sx) * sy;
      const dx = 6 * fx * (1 - fx) * ((n10 - n00) * (1 - sy) + (n11 - n01) * sy);
      const dy = 6 * fy * (1 - fy) * ((n01 - n00) * (1 - sx) + (n11 - n10) * sx);
      const o = (y * N + x) * 4;
      dado[o] = Math.round(255 * h);
      dado[o + 1] = Math.round(255 * Math.min(Math.max(dx / 3 + 0.5, 0), 1));
      dado[o + 2] = Math.round(255 * Math.min(Math.max(dy / 3 + 0.5, 0), 1));
      dado[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(dado, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
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

type Desenho = 'ponto' | 'esmaece' | 'malha' | 'pre';

/** a capacidade de cada malha de perto: o dobro da conta média da janela de perto, por oitava */
function capacidadeDePerto(): number {
  const r = (2 ** X_CORTE * FOLGA_DA_ESCOLHA) / K_JANELA;
  return OITAVAS * (Math.ceil(PEDRAS_POR_TIER.cinema * Math.min(1, 2 * r * r)) + 256);
}
/** as linhas de cada faixa da textura do pré-passo (o texel 0 e as três malhas cheias) */
function linhasDoPrePasso(): number {
  return Math.ceil((1 + MALHAS.length * capacidadeDePerto()) / PRE_W);
}

class Faixa {
  /** os pontos opacos e os que estão entrando (a mesma geometria) */
  readonly pontos: THREE.Points;
  readonly esmaece: THREE.Points;
  /** as de perto, da frente para trás em x */
  readonly malhas: THREE.Mesh[];
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

  constructor(material: (desenho: Desenho, formas?: THREE.DataTexture) => THREE.ShaderMaterial) {
    this.ordens = Array.from({ length: OITAVAS }, (_, o) => ordemDaOitava(o));
    const g = new THREE.BufferGeometry();
    // só a contagem importa: o vértice é o pedaço (gl_VertexID)
    g.setAttribute('position', new THREE.BufferAttribute(new Uint8Array(OITAVAS * PEDRAS_POR_TIER.cinema), 1));
    g.setDrawRange(0, 0);
    // A ESFERA ENVOLVENTE À MÃO: sem ela o three a calcula ao ordenar a cena
    // lendo y e z do atributo de um componente — o último vértice lê
    // `undefined`, que vai parar num Vector3 do próprio three, e a partir
    // daí TODO Vector3 da página passa a guardar os campos sem o atalho de
    // número (o planejador da galáxia dobrava de ~4 para ~9 ms por quadro).
    // Ninguém a usa: os pontos não são recortados e a ordem é a de `renderOrder`.
    g.boundingSphere = new THREE.Sphere();
    this.pontos = new THREE.Points(g, material('ponto'));
    this.esmaece = new THREE.Points(g, material('esmaece'));
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
      const malha = new THREE.Mesh(geo, material('malha', f.tex));
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

  /** os pontos: todos os pedaços das oitavas ativas */
  acenderPontos(ativas: number, porOitava: number) {
    const n = Math.min(Math.max(ativas, 0), OITAVAS);
    this.pontos.geometry.setDrawRange(0, n * porOitava);
    this.pontos.visible = n > 0;
    this.esmaece.visible = n > 0;
  }

  /**
   * AS CANDIDATAS DE PERTO, sem avaliar todas: o sorteio radial é estático,
   * então a janela radial é um trecho contíguo da ordem (com a volta em 1);
   * nele, o arco sai das mesmas contas do vértice (`uGi`, `uGf`, `uFs`), e
   * o cone da lente (com folga, e com o deslocamento máximo da esteira) tira
   * as de fora do quadro. Superconjunto das de x < `X_CORTE` que a GPU
   * desenharia.
   */
  escolherDePerto(
    ativas: number,
    porOitava: number,
    rhoKm: number,
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
          if (lente.ok) {
            const th = dS / R0_KM;
            const x = (rhoKm + dRho) * Math.cos(th) - rhoKm;
            const y = (rhoKm + dRho) * Math.sin(th);
            const vx = m[0]! * x + m[1]! * y + m[2]! * dz;
            const vy = m[3]! * x + m[4]! * y + m[5]! * dz;
            const fz = -(m[6]! * x + m[7]! * y + m[8]! * dz);
            const folga = 2.5 * rc + DESLOCAMENTO_MAXIMO_KM + FOLGA_DO_CONE * Math.sqrt(h2 + dz * dz);
            if (fz < -folga || Math.abs(vx) * lente.p00 - fz > folga * s00 || Math.abs(vy) * lente.p11 - fz > folga * s11) {
              continue;
            }
            // o teto de \`PX_CORTE\` (o raio na tela, por cima): o de poucos px
            // fica no ponto e a malha não paga os vértices dele
            const fzC = fz - DESLOCAMENTO_MAXIMO_KM - FOLGA_DO_CONE * Math.sqrt(h2 + dz * dz);
            if ((rq * lente.pxPorRad) / Math.max(fzC, rq) < PX_CORTE) continue;
            px = (rq * lente.pxPorRad) / Math.max(fz, rq);
          }
          const logD = 0.5 * Math.log2(h2 + dz * dz);
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
      (malha.material as THREE.ShaderMaterial).uniforms.uBase!.value = base;
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
    for (const m of [this.pontos, ...this.malhas, this.pre]) m.geometry.dispose();
    for (const m of [this.pontos, this.esmaece, ...this.malhas, this.pre]) (m.material as THREE.ShaderMaterial).dispose();
    for (const f of FORMAS.values()) {
      f.geo.dispose();
      f.tex.dispose();
    }
    FORMAS.clear();
  }
}

export class PedrasDoAnel {
  /** o grupo dos desenhos — a matriz do anel mora nele */
  readonly malha = new THREE.Group();

  private readonly faixa: Faixa;
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
  private readonly folha: THREE.Mesh;
  private readonly nevoa: THREE.Mesh;
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

  constructor(private readonly opcoes: OpcoesDasPedras) {
    const constantes = `${opcoes.glslConstantesDoAnel}
${opcoes.glslRegiaoDoAnel}
${opcoes.glslCamadaDoAnel}
const float R_INT = ${opcoes.rInt};
const float R_EXT = ${opcoes.rExt};`;
    const vertice = (v: string) =>
      v
        .replace('CONSTANTES_DO_ANEL', constantes)
        .replace('SOMBRA_DO_PLANETA', opcoes.glslSombraDoPlaneta);
    const fragmento = (f: string) =>
      f.replace('CAMADA_DO_ANEL', opcoes.glslCamadaDoAnel);

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
      uCelCam: { value: new THREE.Vector4() },
      uForcaEsteira: { value: 0 },
      uRaioFolha: { value: 40 },
      uFundoFolha: { value: -0.02 },
      uRelevo: { value: texturaDoRelevo() },
      uPoloVista: { value: new THREE.Vector3(0, 0, 1) },
      uPre: { value: null },
      uPrePronto: { value: 0 },
    };
    const pre = { PRE_W, PRE_H: linhasDoPrePasso(), PRE_BANDAS };
    const material = (desenho: Desenho, formas?: THREE.DataTexture) => {
      const malha = desenho === 'malha';
      const esmaece = desenho === 'esmaece';
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
      return new THREE.ShaderMaterial({
        vertexShader: vertice(malha ? VERT_DA_MALHA : VERT_DO_PONTO),
        fragmentShader: fragmento(malha ? FRAG_DA_MALHA : FRAG_DO_PONTO),
        defines: {
          X_CORTE: glslF(X_CORTE),
          ...(malha ? { MALHA: 1, ...pre } : {}),
          ...(esmaece ? { ESMAECE: 1 } : {}),
        },
        // os uniformes divididos, mais a forma assada desta malha
        uniforms: formas ? { ...this.uniforms, uFormas: { value: formas }, uBase: { value: 0 } } : this.uniforms,
        // os que estão entrando misturam por cima do disco, sem escrever
        // profundidade; o resto é opaco
        transparent: esmaece,
        depthWrite: !esmaece,
        depthTest: true,
      });
    };
    this.faixa = new Faixa(material);
    // DA FRENTE PARA TRÁS: as malhas de perto; os pontos (que descartam) por
    // último, depois das que a GPU sabe esconder
    const ordem: THREE.Object3D[] = [...this.faixa.malhas, this.faixa.pontos];
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
    this.faixa.esmaece.onBeforeRender = (renderer, _cena, camera) => lerTela(renderer, camera);
    this.folha = new THREE.Mesh(
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
    this.nevoa = new THREE.Mesh(
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
    this.folha.renderOrder = 10;
    this.nevoa.renderOrder = 11;
    this.faixa.esmaece.renderOrder = 12;
    for (const m of [this.folha, this.nevoa]) {
      m.frustumCulled = false;
      m.visible = false;
    }
    this.malha.add(this.folha, this.nevoa, this.faixa.esmaece);
    this.cenaPre.add(this.faixa.pre);
    this.malha.matrixAutoUpdate = false;
    this.malha.visible = false;
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
    const espessura = regiaoDasPedras(rhoKm).espessura;
    const ativas = noAnel ? PedrasDoAnel.oitavasAtivas(zKm) : 0;
    const forca = noAnel ? forcaDaEsteiraNoDisco(zKm, espessura) : 0;
    const peso = noAnel ? pesoDaNevoa(zKm, espessura) : 0;
    this.malha.visible = ativas > 0 || forca > 0;
    const fracao = PEDRAS_POR_TIER[q.tier] / PEDRAS_POR_TIER.cinema;
    this.cessao.w = ativas > 0 ? fracao : 0;
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
    if (!this.malha.visible) return;

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
    this.faixa.acenderPontos(ativas, porOitava);
    this.faixa.escolherDePerto(ativas, porOitava, rhoKm, zKm, espessura, this.lente, this.fr, this.fs, this.gi, this.gf, this.tauMaximo, q.tier === 'performance' ? 1 : 0);
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
    // a câmera na célula das esteiras, em dupla precisão
    const uR = rhoKm / CELULA_DA_ESTEIRA_KM;
    const uS = (theta / (2 * Math.PI)) * CELULAS_NA_VOLTA;
    (u.uCelCam!.value as THREE.Vector4).set(uR - Math.floor(uR), uS - Math.floor(uS), Math.floor(uR), Math.floor(uS));
    u.uForcaEsteira!.value = forca;
    u.uRaioFolha!.value = raioDaFolhaKm(zKm);
    // do outro lado da camada, além do maior pedaço (o eixo maior passa de a)
    u.uFundoFolha!.value = -(Math.sign(zKm) || 1) * (0.5 * espessura + 2 * A_MAX_KM);
    // no telefone as esteiras ficam só nos pedaços: a folha do disco (a
    // conta mais cara por pixel) não é desenhada, e o disco fica na média
    this.folha.visible = forca > 0 && q.tier !== 'performance';
    this.nevoa.visible = peso > 0;
    this.prePasso();
  }

  /**
   * O PRÉ-PASSO: com malha de perto no quadro, a conta de cada pedaço dela
   * vai para a textura antes do desenho, com os uniformes deste quadro. Sem
   * quem desenhe ainda ou sem alvo em float, a malha faz a conta ela mesma.
   */
  private prePasso() {
    const r = this.renderer;
    const u = this.uniforms.uPrePronto!;
    u.value = 0;
    if (!r || this.faixa.nPre <= 1 || !r.extensions.has('EXT_color_buffer_float')) return;
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
  }

  dispose() {
    this.faixa.dispose();
    this.alvoPre?.dispose();
    (this.uniforms.uRelevo!.value as THREE.Texture).dispose();
    for (const m of [this.folha, this.nevoa]) {
      m.geometry.dispose();
      (m.material as THREE.ShaderMaterial).dispose();
    }
  }
}
