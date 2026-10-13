// ============================================================
// O CONSERTO DO DEM — o passo 3 da linha `completar-corpo` sobre um DEM MEDIDO
// que é colcha de retalhos (Encélado, R4, 13/10/2026). Puro e sem E/S: quem
// chama (`assaDoDemLocal`) lê o DEM e a foto e grava o resultado.
//
// O DEFEITO. O DEM de 200 m de Schenk & McKinnon 2024 junta ladrilhos de
// estéreo de qualidade diferente. Uns trazem o terreno; outros são "bolhas":
// relevo forte de 2–8 km SEM direção (a foto no mesmo lugar é tão orientada
// quanto no resto), com bordas retas de ladrilho. Ao lado do polo sul há também
// ladrilhos lisos. As listras de tigre caem em ladrilho de bolhas.
//
// A MÁSCARA (`mascaraDeQualidade`, na grade de trabalho 4096 × 2048 = a da
// normal e a da foto). Por texel, numa janela gaussiana de 6 km:
//   - excesso de fino: ½·ln(E₁/E₃), E = encosta² do DEM na banda 1 (DoG σ
//     0,4–0,8 km, ondas de ~2–4 km) e na banda 3 (σ 1,6–3,2 km, ~10 km).
//     Medianas (capturas/r4-encelado/conserto/): remendo 52–172°E 1,70, polo
//     sul 78–88°S 1,65; terreno bom 0,92–1,28;
//   - orientação contra a foto: a coerência do tensor de estrutura do DEM na
//     banda 1 ÷ a da foto (remendo 0,25, terreno bom 0,45–0,55). Acima de
//     60–70° ela some: ali o DEM e a foto foram reamostrados de mosaicos
//     polares e dividem o mesmo arrasto (concordância 0,90 sobre as bolhas).
// nota = excesso − `pesoDaOrientacao`·(razão − `orientacaoTipica`), média
// de 12 km; ruído acima de `limiarDoRuido` (o meio dos patamares). A borda da
// média erra a borda reta do ladrilho por alguns km: na faixa de ±`bordaKm`
// cada texel vai para o lado cuja energia fina (janela de 1,5 km) ele tem.
// Liso: a encosta da banda 1 abaixo de `fracaoDoLiso` da do terreno bom
// vizinho. Ilhas menores que `ilhaMinimaKm2` são engolidas pelo entorno. O
// brilho da foto NÃO entra por correlação: medida em janelas de 8 km, a
// encosta do DEM explica < 1 % dele nas bandas finas (registro de km).
//
// O CONSERTO (`consertaNaGrade`), pela ordem de honestidade da linha:
//  1. MEDIDO: fora da máscara nada muda, byte a byte. Dentro, fica só a
//     escala que confere com o terreno bom: a média gaussiana de σ `corteKm`
//     (1,6 km: ondas ≳ 8 km), tirada SÓ dos texels ruins — a banda 3 do
//     remendo já tem a encosta do terreno bom (1,06° × 1,04°), a banda 2 ainda
//     tem 30–45 % a mais (o ruído).
//  2. INVENTADO: as bandas 0–2 que saíram voltam sintéticas — ruído de Gabor
//     esparso (ondas de 1,2, 2,4 e 4,8 km), metade alinhada com a direção que
//     a FOTO mostra ali (só abaixo de 60–70°), com os ganhos que dão, banda
//     DoG a banda DoG (as três se sobrepõem: mínimos quadrados sem negativo),
//     a encosta do terreno bom vizinho (média com máscara a 30 km, depois
//     120 km, depois a do corpo): a estatística é a de Encélado.
//  3. DERIVADO: crateras que a foto vê (`detectaCrateras`, rareadas pela regra
//     de Reia na mesma grade) entram por `completaCratera` — só a profundidade
//     que falta —, com o d/D medido nas crateras dos ladrilhos bons
//     (recentradas no DEM); as listras de tigre saem do traço na foto
//     (`tracaListras`) com o perfil medido (sulco 373 m, cristas 157 m).
//  4. COSTURA: a diferença entre o medido e o consertado nos texels bons vira
//     a borda de uma membrana harmônica (`membranaHarmonica`, e Gauss–Seidel
//     na faixa de 6 km) que a leva para dentro do remendo: nenhum degrau na
//     emenda, nem o desnível de ladrilho.
// A cobertura (medido / inventado / derivado) sai junto, com as frações.
// ============================================================

import { detectaCrateras, PARAMETROS_DA_DETECCAO } from './crateras-pela-foto.mjs';
import { amostraBilinear, desfocaComMascara, latitudeDaLinha, longitudeDaColuna, membranaHarmonica, recentraCratera } from './relevo-inventado.mjs';
import { completaCratera, morfologia, perfilGasto, profundidadeBordaFundo, rareiaPorLatitude, suave, texelEDiametroMinimo } from './relevo-por-foto.mjs';
import { RAREAMENTO_POR_LATITUDE, reamostraParaACasa } from './relevo-reia.mjs';

const RADIANOS = Math.PI / 180;

/** As classes da máscara de qualidade e da cobertura. */
export const BOM = 0;
export const RUIDO = 1;
export const LISO = 2;
export const VAZIO = 3;
export const MEDIDO = 0;
export const INVENTADO = 1;
export const DERIVADO = 2;

/** Os números do conserto de Encélado (os medidos dizem de onde vêm no cabeçalho e em `capturas/r4-encelado/conserto/`). */
export const CONSERTO_DE_ENCELADO = Object.freeze({
  larguraDeTrabalho: 4096,
  /** os σ (km) que cortam as bandas: 0 = h − G0,4; 1 = G0,4 − G0,8; 2 = G0,8 − G1,6; 3 = G1,6 − G3,2 */
  sigmasKm: Object.freeze([0.4, 0.8, 1.6, 3.2]),
  janelaKm: 6,
  suavizaKm: 12,
  pesoDaOrientacao: 0.5,
  orientacaoTipica: 0.45,
  orientacaoAteGraus: Object.freeze([60, 70]),
  limiarDoRuido: 1.45,
  fracaoDoLiso: 0.25,
  ilhaMinimaKm2: 1000,
  bordaKm: 8,
  bordaJanelaKm: 1.5,
  corteKm: 1.6,
  vizinhancaKm: Object.freeze([30, 120]),
  /** o ruído de Gabor de cada banda sintetizada (0, 1, 2): comprimento de onda e quantos núcleos se sobrepõem */
  gabor: Object.freeze({ lambdaKm: Object.freeze([1.2, 2.4, 4.8]), alongamento: 3, alinhamento: 0.5, sobreposicao: 8, ganhoMax: 4 }),
  semente: 20261013,
  margemKm: 4,
  membranaSigmaKm: 64,
  faixaDaCosturaKm: 6,
  passadasDaCostura: 200,
  crateras: Object.freeze({
    confiancaMin: PARAMETROS_DA_DETECCAO.confiancaMin,
    confiancaDaLei: 0.4,
    leiEntreKm: Object.freeze([5, 40]),
    leiMinimo: 10,
    dDPadrao: 0.1,
    bordaPorProfundidade: 0.2,
    desfoqueSigmaPorD: 0.1,
    fracaoRuimMin: 0.7,
    completar: Object.freeze({
      completaDesdeKm: 8,
      corteRR: Object.freeze([1.2, 1.5]),
      instrumento: Object.freeze({ bordaRR: Object.freeze([0.7, 1.2]), fundoAteRR: 0.3, azimutes: 36 }),
    }),
  }),
  listras: Object.freeze({
    raioDoPlanoKm: 110,
    passoKm: 0.4,
    sigmaKm: 1.0,
    zonaKm: 80,
    quantas: 4,
    separacaoKm: 20,
    faixaKm: 70,
    passoAoLongoKm: 2,
    meiaFatiaKm: 4,
    buscaKm: 3,
    fimRelativo: 0.25,
    maxAoLongoKm: 95,
    suavizaPontos: 4,
    sulcoM: 373,
    cristaM: 157,
    larguraKm: 2,
    cristaAKm: 2.2,
    pontaKm: 6,
  }),
});

// ------------------------------------------------------------
// Filtros na esfera (km verdadeiros) e o tensor de estrutura
// ------------------------------------------------------------

let uns = new Uint8Array(0);
function todos(n) {
  if (uns.length !== n) uns = new Uint8Array(n).fill(1);
  return uns;
}

/** A média gaussiana de σ `sigmaKm` (km verdadeiros, na esfera) de um campo sem vazio. */
export function media(campo, W, H, raioM, sigmaKm) {
  if (!(sigmaKm > 0)) return Float32Array.from(campo);
  return desfocaComMascara(campo, todos(W * H), W, H, raioM, sigmaKm).valor;
}

/**
 * O GRADIENTE em unidades por metro, leste e norte (linha 0 = norte), por
 * diferença central; o passo leste é R·cos φ·Δλ (o campo que chega aqui já
 * foi filtrado em km verdadeiros, liso em longitude perto do polo).
 */
export function gradiente(campo, W, H, raioM) {
  const gx = new Float32Array(W * H);
  const gy = new Float32Array(W * H);
  const dLon = (2 * Math.PI) / W;
  const passoN = (raioM * Math.PI) / H;
  for (let j = 0; j < H; j += 1) {
    const passoL = raioM * Math.cos(latitudeDaLinha(j, H)) * dLon;
    const jn = Math.max(0, j - 1);
    const js = Math.min(H - 1, j + 1);
    for (let i = 0; i < W; i += 1) {
      const k = j * W + i;
      const ie = i + 1 === W ? 0 : i + 1;
      const iw = i === 0 ? W - 1 : i - 1;
      gx[k] = (campo[j * W + ie] - campo[j * W + iw]) / (2 * passoL);
      gy[k] = (campo[jn * W + i] - campo[js * W + i]) / ((js - jn) * passoN);
    }
  }
  return { gx, gy };
}

/** A encosta² por texel: |∇campo|². */
function encosta2(campo, W, H, raioM) {
  const { gx, gy } = gradiente(campo, W, H, raioM);
  for (let k = 0; k < gx.length; k += 1) gx[k] = gx[k] * gx[k] + gy[k] * gy[k];
  return gx;
}

/**
 * O TENSOR DE ESTRUTURA do campo, médio numa janela de σ `janelaKm`: a
 * energia `E` (traço = encosta² média), a coerência `coh` (0 = sem direção, 1
 * = tudo paralelo) e (`c2`, `s2`) = (cos 2θ, sin 2θ), θ o rumo do gradiente a
 * partir do leste (as cristas correm a θ + 90°).
 */
export function tensor(campo, W, H, raioM, janelaKm) {
  const { gx, gy } = gradiente(campo, W, H, raioM);
  const n = W * H;
  const xx = new Float32Array(n);
  const xy = new Float32Array(n);
  const yy = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    xx[k] = gx[k] * gx[k];
    xy[k] = gx[k] * gy[k];
    yy[k] = gy[k] * gy[k];
  }
  const [a, b, c] = [xx, xy, yy].map((f) => media(f, W, H, raioM, janelaKm));
  const E = new Float32Array(n);
  const coh = new Float32Array(n);
  const c2 = new Float32Array(n);
  const s2 = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    const tr = a[k] + c[k];
    const d = Math.hypot(a[k] - c[k], 2 * b[k]);
    E[k] = tr;
    coh[k] = tr > 0 ? d / tr : 0;
    c2[k] = d > 0 ? (a[k] - c[k]) / d : 1;
    s2[k] = d > 0 ? (2 * b[k]) / d : 0;
  }
  return { E, coh, c2, s2 };
}

/** As bandas DoG de `campo` nos σ dados: [h − G(σ₀), G(σ₀) − G(σ₁), …]. */
function bandas(campo, W, H, raioM, sigmasKm) {
  const G = sigmasKm.map((s) => media(campo, W, H, raioM, s));
  return G.map((g, b) => {
    const de = b === 0 ? campo : G[b - 1];
    const o = new Float32Array(W * H);
    for (let k = 0; k < o.length; k += 1) o[k] = de[k] - g[k];
    return o;
  });
}

/** A área (km²) de cada linha de texel. */
function areaDaLinha(W, H, raioM) {
  const r = raioM / 1000;
  return Float64Array.from({ length: H }, (_, j) => {
    const a = Math.PI / 2 - (j * Math.PI) / H;
    const b = Math.PI / 2 - ((j + 1) * Math.PI) / H;
    return ((r * r * 2 * Math.PI) / W) * (Math.sin(a) - Math.sin(b));
  });
}

/** As frações de área (pesadas pela área do texel) de cada valor de `classe`. */
export function fracoesDeArea(classe, W, H, raioM, valores) {
  const area = areaDaLinha(W, H, raioM);
  const soma = new Float64Array(Math.max(...valores) + 1);
  let total = 0;
  for (let j = 0; j < H; j += 1) {
    for (let i = 0; i < W; i += 1) soma[classe[j * W + i]] += area[j];
    total += area[j] * W;
  }
  return Object.fromEntries(valores.map((v) => [v, soma[v] / total]));
}

// ------------------------------------------------------------
// A máscara de qualidade
// ------------------------------------------------------------

/**
 * Os componentes conexos (4-vizinhos, com a volta em longitude) de `alvo`
 * menores que `minKm2` trocam para `outro`. No lugar.
 */
function engoleIlhas(classe, W, H, raioM, ehAlvo, outro, minKm2) {
  const area = areaDaLinha(W, H, raioM);
  const visto = new Uint8Array(W * H);
  const fila = new Int32Array(W * H);
  for (let s = 0; s < W * H; s += 1) {
    if (visto[s] || !ehAlvo(classe[s])) continue;
    let ini = 0;
    let fim = 0;
    fila[fim++] = s;
    visto[s] = 1;
    let km2 = 0;
    while (ini < fim) {
      const k = fila[ini++];
      const j = (k / W) | 0;
      const i = k - j * W;
      km2 += area[j];
      const viz = [j * W + (i + 1 === W ? 0 : i + 1), j * W + (i === 0 ? W - 1 : i - 1), j > 0 ? k - W : -1, j < H - 1 ? k + W : -1];
      for (const q of viz) {
        if (q >= 0 && !visto[q] && ehAlvo(classe[q])) {
          visto[q] = 1;
          fila[fim++] = q;
        }
      }
    }
    if (km2 < minKm2) for (let t = 0; t < fim; t += 1) classe[fila[t]] = outro;
  }
}

/**
 * A estatística do TERRENO BOM em volta de cada texel: a média de `campo` só
 * nos texels `bom`, a σ `vizinhancaKm[0]`; onde ela viu pouco dado (peso <
 * 0,2), misturada com a de σ `vizinhancaKm[1]` e, sem nada, a mediana do
 * terreno bom do corpo inteiro.
 */
export function estatisticaVizinha(campo, bom, W, H, raioM, vizinhancaKm) {
  // a média do corpo: pesada pela área, fora das calotas de 75° (lá o passo
  // leste da grade é de metros e a encosta por texel não é confiável)
  let soma = 0;
  let peso = 0;
  for (let j = 0; j < H; j += 1) {
    const f = latitudeDaLinha(j, H);
    if (Math.abs(f) > 75 * RADIANOS) continue;
    for (let i = 0; i < W; i += 1) {
      const k = j * W + i;
      if (!bom[k]) continue;
      soma += Math.cos(f) * campo[k];
      peso += Math.cos(f);
    }
  }
  const global = peso > 0 ? soma / peso : 0;
  const [perto, longe] = vizinhancaKm.map((s) => desfocaComMascara(campo, bom, W, H, raioM, s));
  const o = new Float32Array(campo.length);
  for (let k = 0; k < o.length; k += 1) {
    const l = Number.isFinite(longe.valor[k]) ? longe.valor[k] : global;
    const wl = Math.min(1, longe.peso[k] / 0.2);
    const fundo = wl * l + (1 - wl) * global;
    const p = Number.isFinite(perto.valor[k]) ? perto.valor[k] : fundo;
    const wp = Math.min(1, perto.peso[k] / 0.2);
    o[k] = wp * p + (1 - wp) * fundo;
  }
  return o;
}

/**
 * A MÁSCARA DE QUALIDADE do DEM `h` (m) contra a foto `fotoLog` (log da
 * luminância), na mesma grade W×H da casa: `classe` (BOM, RUIDO, LISO, VAZIO
 * onde `vazio`), a `nota` do ruído e a orientação da foto na banda 1 (`foto`,
 * de `tensor`), que a síntese reaproveita. Ver o cabeçalho.
 */
export function mascaraDeQualidade({ h, fotoLog, W, H, raioM, vazio = null, p = CONSERTO_DE_ENCELADO }) {
  const n = W * H;
  const [, b1, , b3] = bandas(h, W, H, raioM, p.sigmasKm);
  const dem = tensor(b1, W, H, raioM, p.janelaKm);
  const E3 = media(encosta2(b3, W, H, raioM), W, H, raioM, p.janelaKm);
  const fb = bandas(fotoLog, W, H, raioM, p.sigmasKm.slice(0, 2))[1];
  const foto = tensor(fb, W, H, raioM, p.janelaKm);
  const bruta = new Float32Array(n);
  for (let j = 0; j < H; j += 1) {
    // perto dos polos o DEM e a foto foram reamostrados de mosaicos polares e
    // dividem o mesmo arrasto leste–oeste: a orientação deixa de dizer algo
    const w = 1 - suave(p.orientacaoAteGraus[0], p.orientacaoAteGraus[1], Math.abs(latitudeDaLinha(j, H)) / RADIANOS);
    for (let i = 0; i < W; i += 1) {
      const k = j * W + i;
      const excesso = 0.5 * Math.log(Math.max(dem.E[k], 1e-12) / Math.max(E3[k], 1e-12));
      bruta[k] = excesso - w * p.pesoDaOrientacao * (dem.coh[k] / Math.max(foto.coh[k], 0.2) - p.orientacaoTipica);
    }
  }
  const nota = media(bruta, W, H, raioM, p.suavizaKm);
  const classe = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) classe[k] = nota[k] > p.limiarDoRuido ? RUIDO : BOM;
  // o liso: a encosta da banda 1 bem abaixo da do terreno bom em volta
  const bom = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) bom[k] = classe[k] === BOM ? 1 : 0;
  const alvo = estatisticaVizinha(dem.E, bom, W, H, raioM, p.vizinhancaKm);
  for (let k = 0; k < n; k += 1) {
    if (classe[k] === BOM && dem.E[k] < p.fracaoDoLiso * p.fracaoDoLiso * alvo[k]) classe[k] = LISO;
  }
  engoleIlhas(classe, W, H, raioM, (c) => c !== BOM, BOM, p.ilhaMinimaKm2);
  engoleIlhas(classe, W, H, raioM, (c) => c === BOM, RUIDO, p.ilhaMinimaKm2);
  // a BORDA no degrau: a nota média de 12 km erra a borda reta do ladrilho por
  // alguns km; na faixa de ±`bordaKm` dela cada texel vai para o lado cuja
  // energia fina (janela de `bordaJanelaKm`) ele tem — o meio dos dois níveis
  const lE = media(encosta2(b1, W, H, raioM), W, H, raioM, p.bordaJanelaKm);
  for (let k = 0; k < n; k += 1) lE[k] = Math.log(Math.max(lE[k], 1e-14));
  const ruimAgora = Uint8Array.from(classe, (c) => (c === RUIDO ? 1 : 0));
  const bomAgora = Uint8Array.from(classe, (c) => (c === BOM ? 1 : 0));
  const dentro = desfocaComMascara(lE, ruimAgora, W, H, raioM, p.vizinhancaKm[0]).valor;
  const fora = desfocaComMascara(lE, bomAgora, W, H, raioM, p.vizinhancaKm[0]).valor;
  const faixa = media(Float32Array.from(ruimAgora), W, H, raioM, p.bordaKm / 2);
  for (let k = 0; k < n; k += 1) {
    if (!(faixa[k] > 0.02 && faixa[k] < 0.98) || classe[k] === LISO) continue;
    if (!Number.isFinite(dentro[k]) || !Number.isFinite(fora[k]) || dentro[k] <= fora[k]) continue;
    classe[k] = lE[k] > 0.5 * (dentro[k] + fora[k]) ? RUIDO : BOM;
  }
  engoleIlhas(classe, W, H, raioM, (c) => c !== BOM, BOM, p.ilhaMinimaKm2);
  engoleIlhas(classe, W, H, raioM, (c) => c === BOM, RUIDO, p.ilhaMinimaKm2);
  if (vazio) for (let k = 0; k < n; k += 1) if (vazio[k]) classe[k] = VAZIO;
  return { classe, nota, foto };
}

// ------------------------------------------------------------
// O ruído de Gabor orientado (o fino inventado)
// ------------------------------------------------------------

/** Gerador pseudoaleatório determinístico (mulberry32): () → [0, 1). */
export function sorteador(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Os vetores unitários dos centros dos texels: por linha (cos φ, sin φ), por coluna (cos λ, sin λ). */
function geometria(W, H) {
  const cf = new Float64Array(H);
  const sf = new Float64Array(H);
  for (let j = 0; j < H; j += 1) {
    const f = latitudeDaLinha(j, H);
    cf[j] = Math.cos(f);
    sf[j] = Math.sin(f);
  }
  const cl = new Float64Array(W);
  const sl = new Float64Array(W);
  for (let i = 0; i < W; i += 1) {
    const l = longitudeDaColuna(i, W) * RADIANOS;
    cl[i] = Math.cos(l);
    sl[i] = Math.sin(l);
  }
  return { cf, sf, cl, sl };
}

/**
 * RUÍDO DE GABOR ESPARSO na `regiao` (1 = entra): núcleos
 * exp(−u²/2Lu² − v²/2Lv²)·cos(2πv/λ + fase), Lv = λ/2, Lu = `alongamento`·Lv,
 * sorteados por Poisson com `sobreposicao` núcleos cobrindo cada ponto; uma
 * fração `alinhamento[j]` (por linha) deles tem o v (através das cristas) no rumo do
 * gradiente da foto (`c2`, `s2` = cos 2θ, sin 2θ), o resto em rumo sorteado.
 * Medido no plano tangente de cada núcleo (vale no polo). Determinístico.
 */
export function ruidoDeGabor({ W, H, raioM, regiao, lambdaKm, alongamento, alinhamento, sobreposicao, c2, s2, semente }) {
  const R = raioM / 1000;
  const { cf, sf, cl, sl } = geometria(W, H);
  const area = areaDaLinha(W, H, raioM);
  const Lv = lambdaKm / 2;
  const Lu = alongamento * Lv;
  const densidade = sobreposicao / (2 * Math.PI * Lu * Lv);
  const alcance = 3 * Lu;
  const dLat = Math.PI / H;
  const dLon = (2 * Math.PI) / W;
  const sorteia = sorteador(semente);
  const campo = new Float32Array(W * H);
  for (let j = 0; j < H; j += 1) {
    const chance = densidade * area[j];
    for (let i = 0; i < W; i += 1) {
      const k = j * W + i;
      if (!regiao[k]) continue;
      const u0 = sorteia();
      if (u0 >= chance) continue;
      // o núcleo: o centro do texel, o rumo, o sinal e a fase
      const P = [cf[j] * cl[i], cf[j] * sl[i], sf[j]];
      const e = [-sl[i], cl[i], 0];
      const nn = [-sf[j] * cl[i], -sf[j] * sl[i], cf[j]];
      const teta = sorteia() < alinhamento[j] ? 0.5 * Math.atan2(s2[k], c2[k]) : sorteia() * Math.PI;
      const [ct, st] = [Math.cos(teta), Math.sin(teta)];
      const a = [ct * e[0] + st * nn[0], ct * e[1] + st * nn[1], ct * e[2] + st * nn[2]];
      const b = [-st * e[0] + ct * nn[0], -st * e[1] + ct * nn[1], -st * e[2] + ct * nn[2]];
      const fase = sorteia() * 2 * Math.PI;
      const sinal = sorteia() < 0.5 ? -1 : 1;
      const dj = Math.ceil(alcance / (R * dLat)) + 1;
      for (let q = Math.max(0, j - dj); q <= Math.min(H - 1, j + dj); q += 1) {
        const meia = Math.ceil(alcance / (R * Math.max(cf[q], 1e-9) * dLon)) + 1;
        const [t0, t1] = 2 * meia >= W ? [-W / 2, W / 2 - 1] : [-meia, meia];
        for (let t = t0; t <= t1; t += 1) {
          const c = (((i + t) % W) + W) % W;
          const Q0 = cf[q] * cl[c] - P[0];
          const Q1 = cf[q] * sl[c] - P[1];
          const Q2 = sf[q] - P[2];
          const u = R * (Q0 * b[0] + Q1 * b[1] + Q2 * b[2]);
          const v = R * (Q0 * a[0] + Q1 * a[1] + Q2 * a[2]);
          if (Math.abs(u) > alcance || Math.abs(v) > alcance) continue;
          campo[q * W + c] += sinal * Math.exp(-0.5 * ((u * u) / (Lu * Lu) + (v * v) / (Lv * Lv))) * Math.cos((2 * Math.PI * v) / lambdaKm + fase);
        }
      }
    }
  }
  return campo;
}

/** A dilatação de `mascara` por `km` (média gaussiana > 0,02 a σ km/2, mais a própria). */
function dilata(mascara, W, H, raioM, km) {
  const f = new Float32Array(mascara.length);
  for (let k = 0; k < f.length; k += 1) f[k] = mascara[k] ? 1 : 0;
  const m = media(f, W, H, raioM, km / 2);
  const o = new Uint8Array(mascara.length);
  for (let k = 0; k < o.length; k += 1) o[k] = mascara[k] || m[k] > 0.02 ? 1 : 0;
  return o;
}

/**
 * AS BANDAS FINAS INVENTADAS (0 a `corte` − 1): um ruído de Gabor por banda,
 * com os ganhos texel a texel que fazem a encosta² medida em cada banda DoG
 * (janela `janelaKm`, somadas as sobras da `base` que fica) igual a
 * `alvos[b]` (a do terreno bom vizinho). Devolve a soma, em metros.
 */
export function bandaFinaInventada({ W, H, raioM, regiao, alvos, base, foto, p = CONSERTO_DE_ENCELADO }) {
  const n = W * H;
  const soma = new Float32Array(n);
  const nb = alvos.length;
  // a direção da foto só vale onde a máscara confia nela (o arrasto polar a anula)
  const alinhamento = Float32Array.from({ length: H }, (_, j) =>
    p.gabor.alinhamento * (1 - suave(p.orientacaoAteGraus[0], p.orientacaoAteGraus[1], Math.abs(latitudeDaLinha(j, H)) / RADIANOS))
  );
  const ruidos = alvos.map((_, b) => {
    const bruto = ruidoDeGabor({
      W, H, raioM, regiao,
      lambdaKm: p.gabor.lambdaKm[b],
      alongamento: p.gabor.alongamento,
      alinhamento,
      sobreposicao: p.gabor.sobreposicao,
      c2: foto.c2,
      s2: foto.s2,
      semente: p.semente + 7919 * b,
    });
    // o Gabor já é de banda estreita (±1/π da frequência): passado pela DoG,
    // ganharia a cauda fina dela, que a banda 0 mede e o terreno bom não tem
    return bruto;
  });
  // as bandas DoG se sobrepõem: a encosta medida na banda b é a soma das que
  // cada ruído c (e a base que fica) deixa nela. Os ganhos² saem do sistema
  // nb × nb, sem negativos, texel a texel
  const energias = (f) => bandas(f, W, H, raioM, p.sigmasKm.slice(0, nb)).map((bd) => media(encosta2(bd, W, H, raioM), W, H, raioM, p.janelaKm));
  const A = ruidos.map(energias);
  const B = energias(base);
  const ganhos = ruidos.map(() => new Float32Array(n));
  const M = Array.from({ length: nb }, () => new Float64Array(nb));
  const t = new Float64Array(nb);
  for (let k = 0; k < n; k += 1) {
    if (!regiao[k]) continue;
    // cada banda pesa pelo próprio alvo: o erro que conta é o relativo
    for (let b = 0; b < nb; b += 1) {
      const alvo = Math.max(0, alvos[b][k] - B[b][k]);
      const w = alvo > 0 ? 1 / alvo : 0;
      t[b] = alvo * w;
      for (let c = 0; c < nb; c += 1) M[b][c] = A[c][b][k] * w;
    }
    const x = minimosQuadradosPositivos(M, t);
    for (let c = 0; c < nb; c += 1) ganhos[c][k] = Math.sqrt(x[c]);
  }
  ganhos.forEach((g, c) => {
    const amostras = [];
    for (let k = 0; k < n; k += 31) if (g[k] > 0) amostras.push(g[k]);
    amostras.sort((x, y) => x - y);
    // na beira da região o ruído afina e o ganho subiria sem teto
    const teto = p.gabor.ganhoMax * (amostras[amostras.length >> 1] ?? 1);
    for (let k = 0; k < n; k += 1) if (g[k] > 0) soma[k] += ruidos[c][k] * Math.min(teto, g[k]);
  });
  return soma;
}

/**
 * Mínimos quadrados com x ≥ 0 para um sistema pequeno M·x ≈ t (M quadrada,
 * nb ≤ 4): todos os conjuntos ativos, o viável de menor resíduo.
 */
export function minimosQuadradosPositivos(M, t) {
  const m = t.length;
  let melhor = new Float64Array(m);
  let menor = t.reduce((s, v) => s + v * v, 0);
  for (let S = 1; S < 1 << m; S += 1) {
    const cols = [];
    for (let c = 0; c < m; c += 1) if (S & (1 << c)) cols.push(c);
    const q = cols.length;
    // as equações normais (MᵀM)·x = Mᵀt nas colunas do conjunto
    const N = Array.from({ length: q }, (_, a) => {
      const linha = new Float64Array(q + 1);
      for (let b = 0; b < q; b += 1) for (let r = 0; r < m; r += 1) linha[b] += M[r][cols[a]] * M[r][cols[b]];
      for (let r = 0; r < m; r += 1) linha[q] += M[r][cols[a]] * t[r];
      return linha;
    });
    let ok = true;
    for (let a = 0; a < q && ok; a += 1) {
      let piv = a;
      for (let b = a + 1; b < q; b += 1) if (Math.abs(N[b][a]) > Math.abs(N[piv][a])) piv = b;
      [N[a], N[piv]] = [N[piv], N[a]];
      if (!(Math.abs(N[a][a]) > 1e-300)) ok = false;
      for (let b = 0; b < q && ok; b += 1) {
        if (b === a) continue;
        const f = N[b][a] / N[a][a];
        for (let c = a; c <= q; c += 1) N[b][c] -= f * N[a][c];
      }
    }
    if (!ok) continue;
    const x = new Float64Array(m);
    cols.forEach((c, a) => {
      x[c] = N[a][q] / N[a][a];
    });
    if (x.some((v) => v < 0)) continue;
    let res = 0;
    for (let r = 0; r < m; r += 1) {
      let s = -t[r];
      for (let c = 0; c < m; c += 1) s += M[r][c] * x[c];
      res += s * s;
    }
    if (res < menor) {
      menor = res;
      melhor = x;
    }
  }
  return melhor;
}

// ------------------------------------------------------------
// O derivado da foto: crateras e listras de tigre
// ------------------------------------------------------------

/** O ponto a `distKm` no rumo `rumo` (rad, de N para L) de (lat, lonE) em graus: [lat em rad, lonE em graus]. */
function destino(lat, lonE, distKm, rumo, raioKm) {
  const d = distKm / raioKm;
  const f1 = lat * RADIANOS;
  const f2 = Math.asin(Math.sin(f1) * Math.cos(d) + Math.cos(f1) * Math.sin(d) * Math.cos(rumo));
  const dl = Math.atan2(Math.sin(rumo) * Math.sin(d) * Math.cos(f1), Math.cos(d) - Math.sin(f1) * Math.sin(f2));
  return [f2, lonE + dl / RADIANOS];
}

/** O texel (j, i) do centro (lat, lonE em graus) na grade da casa. */
function texelDe(lat, lonE, W, H) {
  const j = Math.min(H - 1, Math.max(0, Math.floor(((90 - lat) / 180) * H)));
  const i = Math.floor(((((lonE - 180) % 360) + 360) % 360) / 360 * W) % W;
  return j * W + i;
}

/**
 * A LEI d/D DE ENCÉLADO, medida no DEM (km) nas crateras que a foto vê em
 * terreno BOM (`leiEntreKm`, confiança ≥ `confiancaDaLei`), pelo mesmo
 * instrumento de `completaCratera`: `{ dD (mediana), n }` — sem `leiMinimo`
 * crateras, a padrão.
 */
export function leiDasCraterasBoas(crateras, km, classe, W, H, raioKm, pc) {
  const grade = { metros: km, vazio: new Uint8Array(0), largura: W, altura: H, raioM: raioKm * 1000 };
  const razoes = [];
  const desvios = [];
  for (const c of crateras) {
    const D = c.diametro_km;
    if (D < pc.leiEntreKm[0] || D > pc.leiEntreKm[1] || c.confianca < pc.confiancaDaLei) continue;
    if (classe[texelDe(c.lat, c.lonE, W, H)] !== BOM) continue;
    // a foto e o DEM não se registram ao km: o centro vem da simetria no DEM (até 0,25·D)
    const centro = recentraCratera(grade, c.lat, c.lonE, D / 2);
    if (!centro) continue;
    desvios.push(centro.desvioKm);
    const d = profundidadeBordaFundo((rho, rumo) => amostraBilinear(grade, ...destino(centro.lat, centro.lon, (rho * D) / 2, rumo, raioKm)), pc.completar.instrumento);
    razoes.push(d / D);
  }
  const mediana = (v) => [...v].sort((a, b) => a - b)[v.length >> 1];
  if (razoes.length < pc.leiMinimo) return { dD: pc.dDPadrao, n: razoes.length, desvioKm: desvios.length ? mediana(desvios) : null };
  return { dD: mediana(razoes), n: razoes.length, desvioKm: mediana(desvios) };
}

/** A fração dos texels do disco de raio D/2 em volta de (lat, lonE) que é ruim. */
function fracaoRuimNoDisco(c, ruim, W, H, raioKm) {
  let s = 0;
  let t = 0;
  for (let r = 0; r <= 1; r += 0.25) {
    for (let a = 0; a < 16; a += 1) {
      const [f, l] = destino(c.lat, c.lonE, (r * c.diametro_km) / 2, (a * Math.PI) / 8, raioKm);
      s += ruim[texelDe(f / RADIANOS, l, W, H)];
      t += 1;
    }
  }
  return s / t;
}

/**
 * O PLANO POLAR SUL (azimutal equidistante): x, y em km a partir do polo, x =
 * ρ·sen λ, y = ρ·cos λ, ρ a distância ao polo pela superfície.
 */
function doPlano(x, y, raioKm) {
  return { lat: -90 + Math.hypot(x, y) / raioKm / RADIANOS, lonE: ((Math.atan2(x, y) / RADIANOS) % 360 + 360) % 360 };
}

/** Amostra bilinear de um campo da casa em (lat, lonE) graus. */
function amostra(campo, W, H, lat, lonE) {
  const u = (((((lonE - 180) % 360) + 360) % 360) / 360) * W - 0.5;
  const v = ((90 - lat) / 180) * H - 0.5;
  const i0 = Math.floor(u);
  const j0 = Math.max(0, Math.min(H - 2, Math.floor(v)));
  const fu = u - i0;
  const fv = Math.max(0, Math.min(1, v - j0));
  const a = ((i0 % W) + W) % W;
  const b = (a + 1) % W;
  const r0 = campo[j0 * W + a] * (1 - fu) + campo[j0 * W + b] * fu;
  const r1 = campo[(j0 + 1) * W + a] * (1 - fu) + campo[(j0 + 1) * W + b] * fu;
  return r0 * (1 - fv) + r1 * fv;
}

/** Borrão gaussiano separável num plano N×N (bordas presas). */
function borraPlano(f, N, sigmaPx) {
  const r = Math.ceil(3 * sigmaPx);
  const w = Array.from({ length: 2 * r + 1 }, (_, q) => Math.exp(-0.5 * ((q - r) / sigmaPx) ** 2));
  const s = w.reduce((x, y) => x + y, 0);
  const tmp = new Float32Array(N * N);
  const out = new Float32Array(N * N);
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      let a = 0;
      for (let q = -r; q <= r; q += 1) a += w[q + r] * f[y * N + Math.min(N - 1, Math.max(0, x + q))];
      tmp[y * N + x] = a / s;
    }
  }
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      let a = 0;
      for (let q = -r; q <= r; q += 1) a += w[q + r] * tmp[Math.min(N - 1, Math.max(0, y + q)) * N + x];
      out[y * N + x] = a / s;
    }
  }
  return out;
}

/**
 * O TRAÇO DAS LISTRAS DE TIGRE na foto (`fotoLog`, grade da casa): no plano
 * polar sul, o detector de vale (o maior autovalor da hessiana do log
 * borrado a `sigmaKm`, positivo no sulco escuro); o rumo comum das listras é
 * o do tensor desse vale na `zonaKm` em volta do polo; o perfil através delas
 * na fatia central dá os `quantas` picos mais fortes, separados de
 * `separacaoKm`, e cada um é seguido ao longo, fatia a fatia (±`buscaKm`), até
 * o vale cair abaixo de `fimRelativo` do dele. Devolve
 * `{ linhas: [[{ x, y, lat, lonE }]], rumoGraus }`.
 */
export function tracaListras({ fotoLog, W, H, raioM, p = CONSERTO_DE_ENCELADO }) {
  const L = p.listras;
  const R = raioM / 1000;
  const N = 2 * Math.ceil(L.raioDoPlanoKm / L.passoKm);
  const xy = (q) => (q + 0.5) * L.passoKm - L.raioDoPlanoKm;
  const plano = new Float32Array(N * N);
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const g = doPlano(xy(x), xy(y), R);
      plano[y * N + x] = amostra(fotoLog, W, H, g.lat, g.lonE);
    }
  }
  const s = borraPlano(plano, N, L.sigmaKm / L.passoKm);
  const vale = new Float32Array(N * N);
  const psi = new Float32Array(N * N);
  let tc = 0;
  let ts = 0;
  for (let y = 1; y < N - 1; y += 1) {
    for (let x = 1; x < N - 1; x += 1) {
      const k = y * N + x;
      const hxx = s[k + 1] - 2 * s[k] + s[k - 1];
      const hyy = s[k + N] - 2 * s[k] + s[k - N];
      const hxy = 0.25 * (s[k + N + 1] - s[k + N - 1] - s[k - N + 1] + s[k - N - 1]);
      const m = 0.5 * (hxx + hyy);
      const d = Math.hypot(0.5 * (hxx - hyy), hxy);
      const l1 = m + d;
      const l2 = m - d;
      vale[k] = Math.max(0, l1 - Math.abs(l2));
      psi[k] = 0.5 * Math.atan2(2 * hxy, hxx - hyy);
      if (Math.hypot(xy(x), xy(y)) < L.zonaKm) {
        tc += vale[k] * Math.cos(2 * psi[k]);
        ts += vale[k] * Math.sin(2 * psi[k]);
      }
    }
  }
  const rumo = 0.5 * Math.atan2(ts, tc);
  const [cr, sr] = [Math.cos(rumo), Math.sin(rumo)];
  // a grade (ao longo u, através v) do vale alinhado
  const nu = Math.ceil((2 * L.maxAoLongoKm) / L.passoAoLongoKm) + 1;
  const nv = Math.ceil((2 * L.faixaKm) / L.passoKm) + 1;
  const soma = new Float32Array(nu * nv);
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const k = y * N + x;
      if (Math.cos(psi[k] - rumo) ** 2 < 0.75) continue;
      const v = xy(x) * cr + xy(y) * sr;
      const u = -xy(x) * sr + xy(y) * cr;
      if (Math.abs(v) > L.faixaKm) continue;
      const iv = Math.round((v + L.faixaKm) / L.passoKm);
      const lo = Math.ceil((u - L.meiaFatiaKm + L.maxAoLongoKm) / L.passoAoLongoKm);
      const hi = Math.floor((u + L.meiaFatiaKm + L.maxAoLongoKm) / L.passoAoLongoKm);
      for (let iu = Math.max(0, lo); iu <= Math.min(nu - 1, hi); iu += 1) soma[iu * nv + iv] += vale[k];
    }
  }
  // o perfil suavizado de cada fatia (±1 km através)
  const perfil = (iu) => {
    const o = new Float32Array(nv);
    const r = Math.round(1 / L.passoKm);
    for (let iv = 0; iv < nv; iv += 1) {
      let a = 0;
      for (let q = -r; q <= r; q += 1) a += soma[iu * nv + Math.min(nv - 1, Math.max(0, iv + q))];
      o[iv] = a;
    }
    return o;
  };
  const meio = (nu - 1) >> 1;
  const central = perfil(meio);
  const picos = [];
  for (let iv = 1; iv < nv - 1; iv += 1) if (central[iv] >= central[iv - 1] && central[iv] > central[iv + 1]) picos.push(iv);
  picos.sort((a, b) => central[b] - central[a]);
  const escolhidos = [];
  for (const iv of picos) {
    if (escolhidos.every((e) => Math.abs(e - iv) * L.passoKm >= L.separacaoKm)) escolhidos.push(iv);
    if (escolhidos.length === L.quantas) break;
  }
  escolhidos.sort((a, b) => a - b);
  const busca = Math.round(L.buscaKm / L.passoKm);
  const linhas = escolhidos.map((iv0) => {
    const forca = central[iv0];
    const pontos = [[meio, iv0]];
    for (const passo of [1, -1]) {
      let iv = iv0;
      let fracos = 0;
      for (let iu = meio + passo; iu >= 0 && iu < nu; iu += passo) {
        const pf = perfil(iu);
        let melhor = iv;
        for (let q = Math.max(0, iv - busca); q <= Math.min(nv - 1, iv + busca); q += 1) if (pf[q] > pf[melhor]) melhor = q;
        if (pf[melhor] < L.fimRelativo * forca) {
          fracos += 1;
          if (fracos >= 3) break;
          continue;
        }
        fracos = 0;
        iv = melhor;
        if (passo > 0) pontos.push([iu, iv]);
        else pontos.unshift([iu, iv]);
      }
    }
    // o traço anda em degraus de 0,4 km através: a média móvel tira o zigue-zague
    const m = L.suavizaPontos;
    return pontos.map(([iu], q) => {
      const viz = pontos.slice(Math.max(0, q - m), q + m + 1);
      const u = iu * L.passoAoLongoKm - L.maxAoLongoKm;
      const v = (viz.reduce((s, [, iv]) => s + iv, 0) / viz.length) * L.passoKm - L.faixaKm;
      const x = v * cr - u * sr;
      const y = v * sr + u * cr;
      return { x, y, ...doPlano(x, y, R) };
    });
  });
  return { linhas, rumoGraus: rumo / RADIANOS };
}

/**
 * Os pesos do perfil da listra: o sulco gaussiano de largura total a meia
 * altura `larguraKm` e as duas cristas iguais a ±`cristaAKm`, com as
 * amplitudes que dão a crista `cristaM` acima do entorno e `sulcoM` da crista
 * ao fundo. Devolve d (km) → metros.
 */
export function perfilDaListra(L) {
  const s = L.larguraKm / 2.3548;
  const g = (d) => Math.exp(-0.5 * (d / s) ** 2);
  const e = g(L.cristaAKm);
  const e2 = g(2 * L.cristaAKm);
  // crista: Ac·(1 + e2) − As·e = cristaM; fundo: 2·Ac·e − As; crista − fundo = sulcoM
  const [a11, a12, a21, a22] = [1 + e2, -e, 1 + e2 - 2 * e, 1 - e];
  const det = a11 * a22 - a12 * a21;
  const Ac = (L.cristaM * a22 - a12 * L.sulcoM) / det;
  const As = (a11 * L.sulcoM - a21 * L.cristaM) / det;
  return (d) => Ac * (g(d - L.cristaAKm) + g(d + L.cristaAKm)) - As * g(d);
}

/**
 * O RELEVO DAS LISTRAS na grade da casa (m): o perfil pela distância ao traço
 * mais próximo (no plano polar), afinado nas pontas em `pontaKm`, e o
 * `corredor` (1 onde o perfil passa de 1 m).
 */
export function relevoDasListras(linhas, W, H, raioM, p = CONSERTO_DE_ENCELADO) {
  const L = p.listras;
  const R = raioM / 1000;
  const perfil = perfilDaListra(L);
  const alcance = L.cristaAKm + 3 * (L.larguraKm / 2.3548);
  const segmentos = [];
  for (const linha of linhas) {
    let s0 = 0;
    const total = linha.slice(1).reduce((t, q, k) => t + Math.hypot(q.x - linha[k].x, q.y - linha[k].y), 0);
    for (let k = 0; k + 1 < linha.length; k += 1) {
      const [a, b] = [linha[k], linha[k + 1]];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      segmentos.push({ a, b, len, s0, total });
      s0 += len;
    }
  }
  const campo = new Float32Array(W * H);
  const corredor = new Uint8Array(W * H);
  for (let j = Math.max(0, Math.floor(H * (1 - L.raioDoPlanoKm / (Math.PI * R))) - 1); j < H; j += 1) {
    const lat = 90 - ((j + 0.5) / H) * 180;
    const rho = (90 + lat) * RADIANOS * R;
    if (rho > L.raioDoPlanoKm) continue;
    for (let i = 0; i < W; i += 1) {
      const lon = longitudeDaColuna(i, W) * RADIANOS;
      const x = rho * Math.sin(lon);
      const y = rho * Math.cos(lon);
      let melhor = Infinity;
      let ponta = 0;
      for (const sg of segmentos) {
        const { a, b, len } = sg;
        if (x < Math.min(a.x, b.x) - alcance || x > Math.max(a.x, b.x) + alcance) continue;
        if (y < Math.min(a.y, b.y) - alcance || y > Math.max(a.y, b.y) + alcance) continue;
        const t = len > 0 ? Math.min(1, Math.max(0, ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / (len * len))) : 0;
        const d = Math.hypot(x - a.x - t * (b.x - a.x), y - a.y - t * (b.y - a.y));
        if (d < melhor) {
          melhor = d;
          const s = sg.s0 + t * len;
          ponta = suave(0, L.pontaKm, Math.min(s, sg.total - s));
        }
      }
      if (melhor > alcance) continue;
      const v = ponta * perfil(melhor);
      campo[j * W + i] = v;
      if (Math.abs(v) > 1) corredor[j * W + i] = 1;
    }
  }
  return { campo, corredor };
}

// ------------------------------------------------------------
// O conserto inteiro
// ------------------------------------------------------------

/**
 * O CONSERTO NA GRADE DE TRABALHO (W×H, convenção da casa): `h` o DEM em
 * metros (área média da grade fina), `fotoLog` o log da luminância e
 * `luminancia` a linear da foto, na mesma grade. Devolve o campo consertado
 * (igual a `h` nos texels BOM), a `classe`, a `cobertura` (MEDIDO /
 * INVENTADO / DERIVADO) e o relatório das escolhas medidas.
 */
export function consertaNaGrade({ h, fotoLog, luminancia, W, H, raioM, vazio = null, p = CONSERTO_DE_ENCELADO, listras = true }) {
  const n = W * H;
  const raioKm = raioM / 1000;
  const { classe, foto } = mascaraDeQualidade({ h, fotoLog, W, H, raioM, vazio, p });
  const ruim = new Uint8Array(n);
  const bom = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) {
    ruim[k] = classe[k] === BOM ? 0 : 1;
    bom[k] = 1 - ruim[k];
  }
  // 1. o medido que fica: a média de σ `corteKm` só dos texels ruins
  const base = desfocaComMascara(h, ruim, W, H, raioM, p.corteKm).valor;
  // 2. o fino inventado com a estatística do terreno bom vizinho
  const corte = p.sigmasKm.indexOf(p.corteKm);
  const finas = bandas(h, W, H, raioM, p.sigmasKm.slice(0, corte + 1));
  const alvos = finas.map((b) => estatisticaVizinha(encosta2(b, W, H, raioM), bom, W, H, raioM, p.vizinhancaKm));
  const regiao = dilata(ruim, W, H, raioM, p.margemKm);
  for (let k = 0; k < n; k += 1) if (!Number.isFinite(base[k])) base[k] = h[k];
  const fina = bandaFinaInventada({ W, H, raioM, regiao, alvos, base, foto, p });
  const R = new Float32Array(n);
  for (let k = 0; k < n; k += 1) R[k] = regiao[k] ? base[k] + fina[k] : h[k];
  const cobertura = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) cobertura[k] = ruim[k] ? INVENTADO : MEDIDO;
  // 3a. as crateras que a foto vê, sobre o ruim
  const pc = p.crateras;
  // o detector infla a contagem acima de 30° nesta grade (4096 × 2048, medido em Reia): rareadas antes de tudo
  const vistas = rareiaPorLatitude(detectaCrateras(luminancia, { W, H, raioKm }).crateras, RAREAMENTO_POR_LATITUDE, raioKm).mantidas;
  const lei = leiDasCraterasBoas(vistas, Float32Array.from(h, (m) => m / 1000), classe, W, H, raioKm, pc);
  const leiDeForma = {
    simplesAteKm: Infinity, simplesProfundidadePorD: lei.dD, complexaProfundidadeKm: 0, complexaExpoente: 1,
    bordaPorProfundidade: pc.bordaPorProfundidade, fundoRR: { base: 0, porDecada: 0, max: 0 },
    picoAcimaDeKm: Infinity, picoPorProfundidade: 0, picoRR: 0.15, terracosAcimaDeKm: Infinity, terracos: 0,
  };
  const { dMinKm } = texelEDiametroMinimo(W, raioKm);
  const noRuim = vistas
    .filter((c) => c.diametro_km >= dMinKm && c.confianca >= pc.confiancaMin && fracaoRuimNoDisco(c, ruim, W, H, raioKm) >= pc.fracaoRuimMin)
    .sort((a, b) => b.diametro_km - a.diametro_km);
  const km = Float64Array.from(R, (m) => m / 1000);
  const completadas = noRuim.map((d) => {
    const m = morfologia(d.diametro_km, 1, leiDeForma);
    const c = { lat: d.lat, lonE: d.lonE, diametroKm: d.diametro_km, morfologia: m, perfil: perfilGasto(m, pc.desfoqueSigmaPorD) };
    return { ...d, ...completaCratera(km, W, H, c, raioKm, pc.completar) };
  });
  for (let k = 0; k < n; k += 1) if (ruim[k]) R[k] = km[k] * 1000;
  for (const c of completadas) {
    const f0 = c.lat * RADIANOS;
    const rr = (pc.completar.corteRR[1] * c.diametro_km) / 2;
    const dj = Math.ceil((rr / raioKm / Math.PI) * H) + 1;
    const j0 = texelDe(c.lat, c.lonE, W, H);
    for (let q = Math.max(0, ((j0 / W) | 0) - dj); q <= Math.min(H - 1, ((j0 / W) | 0) + dj); q += 1) {
      const fq = latitudeDaLinha(q, H);
      for (let i = 0; i < W; i += 1) {
        const k = q * W + i;
        if (!ruim[k]) continue;
        const lq = longitudeDaColuna(i, W) * RADIANOS;
        const cos = Math.sin(fq) * Math.sin(f0) + Math.cos(fq) * Math.cos(f0) * Math.cos(lq - c.lonE * RADIANOS);
        if (Math.acos(Math.min(1, cos)) * raioKm < rr) cobertura[k] = DERIVADO;
      }
    }
  }
  // 3b. as listras de tigre pelo traço da foto, só onde o DEM é ruim
  let traco = null;
  let listrasNoRuim = 0;
  if (listras) {
    traco = tracaListras({ fotoLog, W, H, raioM, p });
    const { campo, corredor } = relevoDasListras(traco.linhas, W, H, raioM, p);
    let noCorredor = 0;
    for (let k = 0; k < n; k += 1) {
      if (!corredor[k]) continue;
      noCorredor += 1;
      if (!ruim[k]) continue;
      listrasNoRuim += 1;
      R[k] += campo[k];
      cobertura[k] = DERIVADO;
    }
    listrasNoRuim = noCorredor ? listrasNoRuim / noCorredor : 0;
  }
  // 4. a costura: a diferença medido − consertado nos bons, levada pela membrana
  const anel = dilata(ruim, W, H, raioM, 1.2);
  const dif = new Float32Array(n);
  const noAnel = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) {
    if (anel[k] && !ruim[k]) {
      noAnel[k] = 1;
      dif[k] = h[k] - R[k];
    }
  }
  const fundo = desfocaComMascara(dif, noAnel, W, H, raioM, p.membranaSigmaKm / 2).valor;
  for (let k = 0; k < n; k += 1) if (bom[k] && !noAnel[k]) dif[k] = Number.isFinite(fundo[k]) ? fundo[k] : 0;
  const c = membranaHarmonica(dif, bom, W, H, raioM, p.membranaSigmaKm);
  // a membrana em níveis acerta a emenda só a ~8 texels; na faixa de
  // `faixaDaCosturaKm` dentro do ruim, Gauss–Seidel até a borda valer exata
  const perto = media(Float32Array.from(bom), W, H, raioM, p.faixaDaCosturaKm / 2);
  const faixa = [];
  for (let k = 0; k < n; k += 1) if (ruim[k] && perto[k] > 0.005) faixa.push(k);
  const [le, no, su] = [new Float64Array(H), new Float64Array(H), new Float64Array(H)];
  for (let j = 0; j < H; j += 1) {
    const cf = Math.max(Math.cos(latitudeDaLinha(j, H)), 1e-6);
    le[j] = 1 / (cf * cf * ((2 * Math.PI) / W) ** 2);
    no[j] = j > 0 ? Math.cos(Math.PI / 2 - (j * Math.PI) / H) / (cf * (Math.PI / H) ** 2) : 0;
    su[j] = j < H - 1 ? Math.cos(Math.PI / 2 - ((j + 1) * Math.PI) / H) / (cf * (Math.PI / H) ** 2) : 0;
  }
  for (let passada = 0; passada < p.passadasDaCostura; passada += 1) {
    for (const k of faixa) {
      const j = (k / W) | 0;
      const i = k - j * W;
      let s = le[j] * (c[j * W + (i + 1 === W ? 0 : i + 1)] + c[j * W + (i === 0 ? W - 1 : i - 1)]);
      if (no[j]) s += no[j] * c[k - W];
      if (su[j]) s += su[j] * c[k + W];
      c[k] = s / (2 * le[j] + no[j] + su[j]);
    }
  }
  const campo = Float32Array.from(h);
  for (let k = 0; k < n; k += 1) if (ruim[k]) campo[k] = R[k] + c[k];
  return {
    campo,
    classe,
    cobertura,
    relatorio: {
      lei,
      crateras: { vistas: vistas.length, noRuim: completadas.length, completadas },
      listras: traco ? { rumoGraus: traco.rumoGraus, linhas: traco.linhas.map((l) => l.length), fracaoNoRuim: listrasNoRuim } : null,
      classes: fracoesDeArea(classe, W, H, raioM, [BOM, RUIDO, LISO, VAZIO]),
      cobertura: fracoesDeArea(cobertura, W, H, raioM, [MEDIDO, INVENTADO, DERIVADO]),
    },
    traco,
  };
}

/**
 * O DEM FINO CONSERTADO (convenção da casa, Wf×Hf em metros): a grade de
 * trabalho (`larguraDeTrabalho`, média de área) passa por `consertaNaGrade`;
 * cada texel fino cujo texel de trabalho é BOM sai BYTE A BYTE igual, e os
 * outros recebem o campo consertado por interpolação bilinear. `luminancia`
 * já na grade de trabalho. Devolve `{ metros, ...consertaNaGrade }`.
 */
export function consertaDem({ metros, largura: Wf, altura: Hf, luminancia, raioM, p = CONSERTO_DE_ENCELADO, listras = true }) {
  const W = p.larguraDeTrabalho;
  const H = W / 2;
  const h = Float32Array.from(reamostraParaACasa(metros, Wf, Hf, W, H, 180));
  const fotoLog = Float32Array.from(luminancia, (l) => Math.log(l + 0.003));
  const r = consertaNaGrade({ h, fotoLog, luminancia, W, H, raioM, p, listras });
  const saida = Float32Array.from(metros);
  for (let j = 0; j < Hf; j += 1) {
    const y = ((j + 0.5) * H) / Hf;
    const jw = Math.min(H - 1, Math.floor(y));
    const y0 = Math.min(H - 2, Math.max(0, Math.floor(y - 0.5)));
    const fy = Math.min(1, Math.max(0, y - 0.5 - y0));
    for (let i = 0; i < Wf; i += 1) {
      const x = ((i + 0.5) * W) / Wf;
      if (r.classe[jw * W + Math.min(W - 1, Math.floor(x))] === BOM) continue;
      const x0 = Math.floor(x - 0.5);
      const fx = x - 0.5 - x0;
      const a = ((x0 % W) + W) % W;
      const b = (a + 1) % W;
      const c = r.campo;
      saida[j * Wf + i] =
        (c[y0 * W + a] * (1 - fx) + c[y0 * W + b] * fx) * (1 - fy) + (c[(y0 + 1) * W + a] * (1 - fx) + c[(y0 + 1) * W + b] * fx) * fy;
    }
  }
  return { metros: saida, ...r };
}
