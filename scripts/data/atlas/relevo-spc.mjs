// ============================================================
// O RELEVO SPC DO POLO SUL DE ENCÉLADO (R4, 13/10/2026) — o passo 2 da linha
// `completar-corpo` (medido primeiro) sobre o modelo de forma de placas da
// JPL: estereofotoclinometria de Park et al. 2024 (JGR Planets 129,
// e2023JE008054), a versão 2 de 100 m do polo sul, arquivo NAIF
// `cas_enceladus_ssd_spc_south100m_v2.bds` (DOI 10.17189/1520114). Puro e
// sem E/S: quem chama (`assaDoDemLocal`) lê os bytes e grava o resultado.
//
//  1. A LEITURA (`leDas`, `leDsk`): o arquivo é um DSK na arquitetura DAS
//     (NAIF, "DAS Required Reading" e "DSK Required Reading"): registro de
//     arquivo de 1024 bytes (palavra de identificação, formato BIG-/LTL-IEEE,
//     registros reservados e de comentário), diretórios de agrupamentos
//     ("clusters") de registros de um tipo só (caractere, d.p., inteiro), e os
//     três arranjos lógicos. Os segmentos são a lista ligada DLA no arranjo
//     inteiro (versão, cabeça, cauda; descritor de 8 inteiros); cada um traz o
//     descritor DSK de 24 d.p. e, no tipo 2, NV, NP, a grade de voxels, as
//     placas (3 inteiros a partir de 1) e os vértices (3 d.p., km, no
//     referencial do corpo IAU_ENCELADUS: x no meridiano 0, z no polo norte).
//  2. A GRADE (`rasterizaNoPolo`): as placas vão a uma grade azimutal
//     equidistante centrada no polo sul (ρ = R·(φ + 90°), u = ρ·sen λ, v =
//     −ρ·cos λ: o meridiano 0 para cima e o leste no sentido horário, a vista
//     de fora), interpolando dentro de cada placa a ALTURA de cada vértice: o
//     raio menos o elipsoide triaxial de Thomas 2016 (256,2 × 251,4 × 248,6
//     km, o mesmo a que o DEM de Schenk & McKinnon 2024 se refere). Célula sem
//     placa fica NaN (vazio).
//  3. O REGISTRO (`registraNoDem`): o SPC e o DEM concordam no relevo largo,
//     mas não no nível nem na inclinação do plano de referência; tira-se do SPC
//     o plano (nível e inclinação) que leva a banda larga dele (σ ≥ 8 km) à do
//     DEM nos ladrilhos BONS onde os dois existem.
//  4. A FUSÃO (`fundeNoDem`): dentro da cobertura o SPC substitui o DEM; numa
//     faixa na borda norte (59–62°S) e em volta dos buracos, a passagem é em
//     rampa suave sobre o SPC já levado ao largo do DEM por uma membrana
//     harmônica (`membranaHarmonica`): nenhum degrau, nem de nível nem de fino.
// ============================================================

import {
  desfocaComMascara,
  distanciaAoVazioKm,
  latitudeDaLinha,
  longitudeDaColuna,
  membranaHarmonica,
} from './relevo-inventado.mjs';

const RADIANOS = Math.PI / 180;
const BYTES_DO_REGISTRO = 1024;
const TIPO_CARACTERE = 1;
const TIPO_DP = 2;
const TIPO_INTEIRO = 3;
/** palavras por registro físico, por tipo */
const POR_REGISTRO = { [TIPO_CARACTERE]: 1024, [TIPO_DP]: 128, [TIPO_INTEIRO]: 256 };
/** o tipo seguinte e o anterior na ordem cíclica caractere → d.p. → inteiro (DAS Required Reading) */
const SEGUINTE = { [TIPO_CARACTERE]: TIPO_DP, [TIPO_DP]: TIPO_INTEIRO, [TIPO_INTEIRO]: TIPO_CARACTERE };
const ANTERIOR = { [TIPO_CARACTERE]: TIPO_INTEIRO, [TIPO_DP]: TIPO_CARACTERE, [TIPO_INTEIRO]: TIPO_DP };
/** a versão do formato DLA e o tamanho do descritor de segmento (dla.inc) */
const VERSAO_DLA = 1000000;
const TAMANHO_DO_DESCRITOR_DLA = 8;
const PONTEIRO_NULO = -1;
/** o descritor DSK (dskdsc.inc): 24 d.p. */
const TAMANHO_DO_DESCRITOR_DSK = 24;
/** tipo 2 (dsk02.inc): as placas no 11º inteiro do segmento, os vértices no 35º d.p. */
const INTEIRO_DAS_PLACAS = 10;
const DP_DOS_VERTICES = 34;

/** O elipsoide triaxial de Thomas et al. 2016 (km), a referência do DEM de Schenk & McKinnon 2024: a no meridiano 0. */
export const ELIPSOIDE_DE_THOMAS_KM = Object.freeze([256.2, 251.4, 248.6]);

// ------------------------------------------------------------
// 1. A leitura do DAS e do DSK
// ------------------------------------------------------------

const texto = (bytes, de, ate) => String.fromCharCode(...bytes.subarray(de, ate));

/**
 * UM ARQUIVO DAS (DAS Required Reading): o registro de arquivo, o comentário
 * e os três arranjos lógicos. `bytes` é Uint8Array/Buffer. O formato do
 * registro de arquivo (BIG-IEEE ou LTL-IEEE) decide a ordem dos bytes de tudo
 * o mais. Devolve `{ palavra, interno, formato, comentario, d, i, c }`.
 */
export function leDas(bytes) {
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const palavra = texto(bytes, 0, 8);
  if (!palavra.startsWith('DAS/')) throw new Error(`não é um arquivo DAS (palavra "${palavra}").`);
  const formato = texto(bytes, 84, 92);
  if (formato !== 'BIG-IEEE' && formato !== 'LTL-IEEE') throw new Error(`formato binário "${formato}" desconhecido.`);
  const pequeno = formato === 'LTL-IEEE';
  const inteiro = (deslocamento) => vista.getInt32(deslocamento, pequeno);
  const [reservados, , comentarios, caracteresDoComentario] = [68, 72, 76, 80].map(inteiro);
  if (bytes.byteLength % BYTES_DO_REGISTRO) throw new Error('o tamanho do arquivo não é múltiplo de 1024 bytes.');
  const total = bytes.byteLength / BYTES_DO_REGISTRO;
  const inicioDoComentario = (1 + reservados) * BYTES_DO_REGISTRO;
  const comentario = texto(bytes, inicioDoComentario, inicioDoComentario + caracteresDoComentario).replace(/\0/g, '\n');

  // os diretórios: [ponteiro para trás, para a frente, 3 × (mínimo, máximo), tipo do 1º agrupamento, contagens…]
  const registros = { [TIPO_CARACTERE]: [], [TIPO_DP]: [], [TIPO_INTEIRO]: [] };
  const ultimo = { [TIPO_CARACTERE]: 0, [TIPO_DP]: 0, [TIPO_INTEIRO]: 0 };
  let diretorio = 2 + reservados + comentarios;
  while (diretorio > 0) {
    if (diretorio > total) throw new Error(`o diretório ${diretorio} passa do fim do arquivo (${total} registros).`);
    const base = (diretorio - 1) * BYTES_DO_REGISTRO;
    const palavraDoDir = (k) => inteiro(base + 4 * k);
    for (const [t, k] of [[TIPO_CARACTERE, 3], [TIPO_DP, 5], [TIPO_INTEIRO, 7]]) {
      ultimo[t] = Math.max(ultimo[t], palavraDoDir(k));
    }
    let tipo = palavraDoDir(8);
    let registro = diretorio + 1;
    for (let k = 9; k < 256; k += 1) {
      const n = palavraDoDir(k);
      if (n === 0) break;
      if (k > 9) tipo = n > 0 ? SEGUINTE[tipo] : ANTERIOR[tipo];
      if (!POR_REGISTRO[tipo]) throw new Error(`tipo de agrupamento ${tipo} desconhecido no diretório ${diretorio}.`);
      for (let r = 0; r < Math.abs(n); r += 1) registros[tipo].push(registro + r);
      registro += Math.abs(n);
    }
    diretorio = palavraDoDir(1);
  }
  const arranjo = (t, Tipo, tamanho, le) => {
    const saida = new Tipo(ultimo[t]);
    if (registros[t].length * POR_REGISTRO[t] < ultimo[t]) throw new Error(`faltam registros do tipo ${t}.`);
    for (let a = 0; a < ultimo[t]; a += 1) {
      const r = registros[t][Math.floor(a / POR_REGISTRO[t])];
      saida[a] = le((r - 1) * BYTES_DO_REGISTRO + (a % POR_REGISTRO[t]) * tamanho);
    }
    return saida;
  };
  const d = arranjo(TIPO_DP, Float64Array, 8, (o) => vista.getFloat64(o, pequeno));
  const i = arranjo(TIPO_INTEIRO, Int32Array, 4, (o) => vista.getInt32(o, pequeno));
  const c = registros[TIPO_CARACTERE].map((r) => texto(bytes, (r - 1) * BYTES_DO_REGISTRO, r * BYTES_DO_REGISTRO)).join('').slice(0, ultimo[TIPO_CARACTERE]);
  return { palavra, interno: texto(bytes, 8, 68).trim(), formato, comentario, d, i, c };
}

/**
 * OS SEGMENTOS DE UM DSK em DAS (DSK Required Reading): a lista ligada DLA do
 * arranjo inteiro e, de cada segmento, o descritor DSK (`superficie`,
 * `centro`, `classe`, `tipo`, `quadro`, `sistema`, `limites` [3 × mín/máx]) e,
 * no tipo 2, `nv`, `np`, `vertices` (Float64Array 3·nv, km) e `placas`
 * (Int32Array 3·np, índices A PARTIR DE 0). Confere a versão do DLA e que toda
 * placa aponta para um vértice que existe.
 */
export function leDsk(bytes) {
  const das = leDas(bytes);
  if (!das.palavra.startsWith('DAS/DSK')) throw new Error(`não é um DSK (palavra "${das.palavra}").`);
  const { d, i } = das;
  if (i[0] !== VERSAO_DLA) throw new Error(`versão DLA ${i[0]}, esperava ${VERSAO_DLA}.`);
  const segmentos = [];
  for (let p = i[1]; p !== PONTEIRO_NULO; ) {
    const [, adiante, ibase, isize, dbase, dsize] = i.subarray(p - 1, p - 1 + TAMANHO_DO_DESCRITOR_DLA);
    const dsc = d.subarray(dbase, dbase + TAMANHO_DO_DESCRITOR_DSK);
    const segmento = {
      superficie: dsc[0],
      centro: dsc[1],
      classe: dsc[2],
      tipo: dsc[3],
      quadro: dsc[4],
      sistema: dsc[5],
      limites: Array.from(dsc.subarray(16, 22)),
    };
    if (segmento.tipo === 2) {
      const nv = i[ibase];
      const np = i[ibase + 1];
      if (DP_DOS_VERTICES + 3 * nv > dsize || INTEIRO_DAS_PLACAS + 3 * np > isize) {
        throw new Error(`o segmento declara ${nv} vértices e ${np} placas, mais do que cabe nele.`);
      }
      const vertices = Float64Array.from(d.subarray(dbase + DP_DOS_VERTICES, dbase + DP_DOS_VERTICES + 3 * nv));
      const placas = new Int32Array(3 * np);
      for (let k = 0; k < 3 * np; k += 1) {
        const v = i[ibase + INTEIRO_DAS_PLACAS + k];
        if (v < 1 || v > nv) throw new Error(`a placa ${Math.floor(k / 3) + 1} aponta para o vértice ${v} de ${nv}.`);
        placas[k] = v - 1;
      }
      Object.assign(segmento, { nv, np, vertices, placas });
    }
    segmentos.push(segmento);
    p = adiante;
  }
  return { comentario: das.comentario, interno: das.interno, formato: das.formato, segmentos };
}

// ------------------------------------------------------------
// 2. A grade polar
// ------------------------------------------------------------

/** O raio (km) do elipsoide `eixos` [a, b, c] na direção unitária (x, y, z): a no x, c no polo. */
export function raioDoElipsoide(x, y, z, [a, b, c] = ELIPSOIDE_DE_THOMAS_KM) {
  return 1 / Math.sqrt((x / a) ** 2 + (y / b) ** 2 + (z / c) ** 2);
}

/** (u, v) km no plano polar sul de raio `raioKm` de (lat, lonE) em graus — u à direita, v para baixo. */
export function noPlanoPolar(latGraus, lonGraus, raioKm) {
  const rho = raioKm * (latGraus + 90) * RADIANOS;
  const l = lonGraus * RADIANOS;
  return [rho * Math.sin(l), -rho * Math.cos(l)];
}

/** (lat, lonE) em graus de (u, v) km no plano polar sul. */
export function doPlanoPolar(u, v, raioKm) {
  return [Math.hypot(u, v) / raioKm / RADIANOS - 90, Math.atan2(u, -v) / RADIANOS];
}

/**
 * AS PLACAS NA GRADE POLAR SUL: N×N células de `passoKm` até a colatitude
 * `ateGraus` (centro da célula (x, y) em u = (x + ½ − N/2)·passo), cada
 * célula com a ALTURA (m) interpolada na placa que cobre o centro dela — o
 * raio menos o elipsoide `eixosKm` em cada vértice. Onde duas placas cobrem a
 * célula (o modelo é de classe 2, pode ter dobra), fica a mais alta. Sem
 * placa: NaN. Devolve `{ alturaM, N, passoKm, raioKm }`.
 */
export function rasterizaNoPolo({ vertices, placas, eixosKm = ELIPSOIDE_DE_THOMAS_KM, raioKm, passoKm, ateGraus }) {
  const N = 2 * Math.ceil((raioKm * ateGraus * RADIANOS) / passoKm);
  const nv = vertices.length / 3;
  const gx = new Float64Array(nv);
  const gy = new Float64Array(nv);
  const hm = new Float64Array(nv);
  for (let k = 0; k < nv; k += 1) {
    const [x, y, z] = [vertices[3 * k], vertices[3 * k + 1], vertices[3 * k + 2]];
    const r = Math.hypot(x, y, z);
    const [lat, lon] = [Math.asin(z / r) / RADIANOS, Math.atan2(y, x) / RADIANOS];
    const [u, v] = noPlanoPolar(lat, lon, raioKm);
    gx[k] = u / passoKm + N / 2 - 0.5;
    gy[k] = v / passoKm + N / 2 - 0.5;
    hm[k] = 1000 * (r - raioDoElipsoide(x / r, y / r, z / r, eixosKm));
  }
  const alturaM = new Float32Array(N * N).fill(NaN);
  const eps = 1e-9;
  for (let p = 0; p < placas.length; p += 3) {
    const [a, b, c] = [placas[p], placas[p + 1], placas[p + 2]];
    const [ax, ay, bx, by, cx, cy] = [gx[a], gy[a], gx[b], gy[b], gx[c], gy[c]];
    const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(det) < 1e-12) continue;
    const x0 = Math.max(0, Math.ceil(Math.min(ax, bx, cx) - eps));
    const x1 = Math.min(N - 1, Math.floor(Math.max(ax, bx, cx) + eps));
    const y0 = Math.max(0, Math.ceil(Math.min(ay, by, cy) - eps));
    const y1 = Math.min(N - 1, Math.floor(Math.max(ay, by, cy) + eps));
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const wa = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / det;
        const wb = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / det;
        const wc = 1 - wa - wb;
        if (wa < -eps || wb < -eps || wc < -eps) continue;
        const h = wa * hm[a] + wb * hm[b] + wc * hm[c];
        const k = y * N + x;
        if (!(alturaM[k] >= h)) alturaM[k] = h;
      }
    }
  }
  // as frestas: célula vazia com os quatro vizinhos cheios (o centro caiu entre placas por arredondamento) leva a média
  const frestas = [];
  for (let y = 1; y < N - 1; y += 1) {
    for (let x = 1; x < N - 1; x += 1) {
      const k = y * N + x;
      const viz = [alturaM[k - 1], alturaM[k + 1], alturaM[k - N], alturaM[k + N]];
      if (Number.isNaN(alturaM[k]) && viz.every(Number.isFinite)) frestas.push([k, (viz[0] + viz[1] + viz[2] + viz[3]) / 4]);
    }
  }
  for (const [k, h] of frestas) alturaM[k] = h;
  return { alturaM, N, passoKm, raioKm };
}

/** O valor da grade polar em (lat, lonE) graus, bilinear; NaN se um dos quatro vizinhos é vazio ou está fora. */
export function amostraNoPolo({ alturaM, N, passoKm, raioKm }, latGraus, lonGraus) {
  const [u, v] = noPlanoPolar(latGraus, lonGraus, raioKm);
  const x = u / passoKm + N / 2 - 0.5;
  const y = v / passoKm + N / 2 - 0.5;
  const [x0, y0] = [Math.floor(x), Math.floor(y)];
  if (x0 < 0 || y0 < 0 || x0 >= N - 1 || y0 >= N - 1) return NaN;
  const [fx, fy] = [x - x0, y - y0];
  const k = y0 * N + x0;
  return (
    (alturaM[k] * (1 - fx) + alturaM[k + 1] * fx) * (1 - fy) + (alturaM[k + N] * (1 - fx) + alturaM[k + N + 1] * fx) * fy
  );
}

// ------------------------------------------------------------
// 3. O registro e a fusão
// ------------------------------------------------------------

/** Os números do SPC do polo sul de Encélado (de onde vêm: `capturas/r4-encelado/spc/`). */
export const SPC_DE_ENCELADO = Object.freeze({
  /** a grade polar: 100 m (a do modelo) até 35° do polo */
  passoKm: 0.1,
  ateGraus: 35,
  /** λ do DEM = λ do SPC + giro: 29 blocos de 32 km, correlação da banda média 0,14 → 0,30, resíduo 0,51 km RMS */
  giroGraus: 1.3,
  registro: Object.freeze({
    passoKm: 0.5,
    sigmaLargoKm: 8,
    bandaMediaKm: Object.freeze([0.5, 3]),
    /** o giro declarado tem de vencer o sem giro e o espelho por esta margem de correlação */
    margem: 0.05,
    /**
     * a inclinação só entra se os ladrilhos bons se espalham por este desvio (km) nos dois eixos do plano; senão só o
     * nível (em Encélado os bons dentro do SPC são um aglomerado de 16 × 6 km a 66°S: a inclinação dele sairia de
     * 2,7 m/km, 380 m de um lado ao outro do SPC, sem nada que a sustente)
     */
    dispersaoMinimaKm: 20,
  }),
  /** a rampa da borda (3° de arco, a faixa 59–62°S do plano) e o anel onde a membrana prende o largo do DEM */
  bandaKm: 13.2,
  anelKm: 2,
  rampaDasListrasKm: 6,
  sigmaLargoKm: 8,
  membranaSigmaKm: 64,
});

/** Média gaussiana com máscara num plano n×n (σ em células); NaN onde o filtro não alcança a máscara. */
function borraComMascara(v, m, n, sigma) {
  const r = Math.ceil(3 * sigma);
  const k = Float64Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-((i - r) ** 2) / (2 * sigma * sigma)));
  const num = new Float64Array(n * n);
  const den = new Float64Array(n * n);
  for (let i = 0; i < n * n; i += 1) {
    if (m[i]) {
      num[i] = v[i];
      den[i] = 1;
    }
  }
  const passa = (a, horizontal) => {
    const o = new Float64Array(n * n);
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        let s = 0;
        for (let t = Math.max(-r, -(horizontal ? x : y)); t <= Math.min(r, n - 1 - (horizontal ? x : y)); t += 1) {
          s += k[t + r] * a[horizontal ? y * n + x + t : (y + t) * n + x];
        }
        o[y * n + x] = s;
      }
    }
    return o;
  };
  const N = passa(passa(num, true), false);
  const D = passa(passa(den, true), false);
  return Float64Array.from(N, (s, i) => (D[i] > 1e-3 ? s / D[i] : NaN));
}

function pearson(a, b, m) {
  let n = 0;
  let [sa, sb, saa, sbb, sab] = [0, 0, 0, 0, 0];
  for (let i = 0; i < a.length; i += 1) {
    if (!m[i] || !Number.isFinite(a[i]) || !Number.isFinite(b[i])) continue;
    n += 1;
    sa += a[i];
    sb += b[i];
    saa += a[i] * a[i];
    sbb += b[i] * b[i];
    sab += a[i] * b[i];
  }
  return (sab / n - (sa / n) * (sb / n)) / Math.sqrt((saa / n - (sa / n) ** 2) * (sbb / n - (sb / n) ** 2));
}

/**
 * O REGISTRO DO SPC NO DEM, no plano polar a `registro.passoKm`: `demEm(lat,
 * lonE)` lê o DEM (m) no quadro da casa, `bomEm(lat, lonE)` diz se o ladrilho
 * é BOM na máscara de qualidade. A GUARDA: a correlação da banda média do SPC
 * com a do DEM no giro declarado, sem giro e no espelho. O PLANO: nos bons, a
 * diferença das bandas largas (σ `sigmaLargoKm`, ambas na mesma cobertura) por
 * mínimos quadrados em a + b·u + c·v (m, u e v em km no plano do SPC) — ou
 * só o nível a, se os bons não se espalham por `dispersaoMinimaKm`. Na fusão
 * o plano quase não pesa (é harmônico: a membrana o refaria da borda); ele
 * diz o quanto os dois dados discordam no largo. Devolve `{ plano,
 * inclinacao, correlacao, bons, areaBonsKm2, rmsAntesM, rmsDepoisM }`.
 */
export function registraNoDem({ grade, demEm, bomEm, p = SPC_DE_ENCELADO }) {
  const { alturaM, N, passoKm, raioKm } = grade;
  const f = Math.round(p.registro.passoKm / passoKm);
  const n = Math.floor(N / f);
  const passo = passoKm * f;
  const P = new Float64Array(n * n).fill(NaN);
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      let s = 0;
      let c = 0;
      for (let b = 0; b < f; b += 1) {
        for (let a = 0; a < f; a += 1) {
          const v = alturaM[(y * f + b) * N + x * f + a];
          if (Number.isFinite(v)) {
            s += v;
            c += 1;
          }
        }
      }
      if (c === f * f) P[y * n + x] = s / c;
    }
  }
  // o centro da célula grossa (x, y) no plano: a média dos centros finos do bloco
  const uDe = (x) => ((x + 0.5) * f - N / 2) * passoKm;
  const cobre = Uint8Array.from(P, (v) => (Number.isFinite(v) ? 1 : 0));
  const casos = { declarado: (lon) => lon + p.giroGraus, semGiro: (lon) => lon, espelho: (lon) => -lon + p.giroGraus };
  const [s1, s2] = p.registro.bandaMediaKm.map((s) => s / passo);
  const dog = (v) => {
    const a = borraComMascara(v, cobre, n, s1);
    const b = borraComMascara(v, cobre, n, s2);
    return Float64Array.from(a, (x, i) => x - b[i]);
  };
  const medioP = dog(P);
  const correlacao = {};
  let D = null;
  let bom = null;
  for (const [nome, lonT] of Object.entries(casos)) {
    const Dc = new Float64Array(n * n);
    const Bc = new Uint8Array(n * n);
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const [lat, lon] = doPlanoPolar(uDe(x), uDe(y), raioKm);
        Dc[y * n + x] = demEm(lat, lonT(lon));
        Bc[y * n + x] = bomEm(lat, lonT(lon)) ? 1 : 0;
      }
    }
    correlacao[nome] = pearson(medioP, dog(Dc), cobre);
    if (nome === 'declarado') [D, bom] = [Dc, Bc];
  }
  const sigma = p.registro.sigmaLargoKm / passo;
  const GP = borraComMascara(P, cobre, n, sigma);
  const GD = borraComMascara(D, cobre, n, sigma);
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const y3 = [0, 0, 0];
  const usados = [];
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const i = y * n + x;
      const d = GD[i] - GP[i];
      if (!cobre[i] || !bom[i] || !Number.isFinite(d)) continue;
      const phi = [1, uDe(x), uDe(y)];
      usados.push([d, phi]);
      for (let a = 0; a < 3; a += 1) {
        y3[a] += phi[a] * d;
        for (let b = 0; b < 3; b += 1) A[a][b] += phi[a] * phi[b];
      }
    }
  }
  const media = (k) => usados.reduce((s, [, phi]) => s + phi[k], 0) / usados.length;
  const desvio = (k) => Math.sqrt(usados.reduce((s, [, phi]) => s + (phi[k] - media(k)) ** 2, 0) / usados.length);
  const inclinacao = Math.min(desvio(1), desvio(2)) >= p.registro.dispersaoMinimaKm;
  const plano = inclinacao ? resolve3(A, y3) : [y3[0] / A[0][0], 0, 0];
  const rms = (g) => Math.sqrt(usados.reduce((s, [d, phi]) => s + (d - g(phi)) ** 2, 0) / usados.length);
  return {
    plano,
    inclinacao,
    correlacao,
    bons: usados.length,
    areaBonsKm2: usados.length * passo * passo,
    rmsAntesM: rms(() => usados.reduce((s, [d]) => s + d, 0) / usados.length),
    rmsDepoisM: rms((phi) => plano[0] + plano[1] * phi[1] + plano[2] * phi[2]),
  };
}

function resolve3(A, b) {
  const M = A.map((linha, i) => [...linha, b[i]]);
  for (let i = 0; i < 3; i += 1) {
    let piv = i;
    for (let k = i + 1; k < 3; k += 1) if (Math.abs(M[k][i]) > Math.abs(M[piv][i])) piv = k;
    [M[i], M[piv]] = [M[piv], M[i]];
    for (let k = 0; k < 3; k += 1) {
      if (k === i) continue;
      const fator = M[k][i] / M[i][i];
      for (let j = i; j < 4; j += 1) M[k][j] -= fator * M[i][j];
    }
  }
  return [0, 1, 2].map((i) => M[i][3] / M[i][i]);
}

/** A grade com o plano `[a, b, c]` (m, m/km) do registro SOMADO: o SPC no nível e na inclinação do DEM. */
export function aplicaPlano(grade, [a, b, c]) {
  const { alturaM, N, passoKm } = grade;
  const saida = new Float32Array(alturaM.length);
  for (let y = 0; y < N; y += 1) {
    const v = (y + 0.5 - N / 2) * passoKm;
    for (let x = 0; x < N; x += 1) {
      const u = (x + 0.5 - N / 2) * passoKm;
      saida[y * N + x] = alturaM[y * N + x] + a + b * u + c * v;
    }
  }
  return { ...grade, alturaM: saida };
}

/**
 * O SPC NA GRADE FINA DA CASA (Wf×Hf, coluna 0 = 180°E, linha 0 = norte): a
 * grade polar amostrada no centro de cada texel, na longitude do SPC (a da
 * casa menos o giro). NaN fora da cobertura.
 */
export function spcNaCasa(grade, Wf, Hf, giroGraus) {
  const saida = new Float32Array(Wf * Hf).fill(NaN);
  const ateGraus = (grade.N / 2) * grade.passoKm / grade.raioKm / RADIANOS;
  for (let j = 0; j < Hf; j += 1) {
    const lat = latitudeDaLinha(j, Hf) / RADIANOS;
    if (lat > ateGraus - 90) continue;
    for (let i = 0; i < Wf; i += 1) saida[j * Wf + i] = amostraNoPolo(grade, lat, longitudeDaColuna(i, Wf) - giroGraus);
  }
  return saida;
}

/** A média de área de um campo fino Wf×Hf na grade W×H (mesma convenção); NaN se um texel fino que entra é NaN. */
function mediaDeArea(fino, Wf, Hf, W, H) {
  const saida = new Float64Array(W * H);
  const [sx, sy] = [Wf / W, Hf / H];
  for (let y = 0; y < H; y += 1) {
    const [v0, v1] = [y * sy, (y + 1) * sy];
    for (let x = 0; x < W; x += 1) {
      const [u0, u1] = [x * sx, (x + 1) * sx];
      let s = 0;
      for (let j = Math.floor(v0); j < Math.ceil(v1); j += 1) {
        const wy = Math.min(v1, j + 1) - Math.max(v0, j);
        if (wy <= 1e-9) continue;
        for (let i = Math.floor(u0); i < Math.ceil(u1); i += 1) {
          const wx = Math.min(u1, i + 1) - Math.max(u0, i);
          if (wx > 1e-9) s += wx * wy * fino[j * Wf + i];
        }
      }
      saida[y * W + x] = s / (sx * sy);
    }
  }
  return saida;
}

/**
 * AS MÁSCARAS DA COBERTURA na grade de trabalho W×H: `dentro` (o texel inteiro
 * coberto pelo SPC fino), `distKm` (até o fora), o `peso` da rampa (suave de 0
 * na borda a 1 em `bandaKm`), o `nucleo` (peso 1: lá o SPC é tudo) e o peso
 * das `listras` traçadas na foto: 0 dentro, de 0 na borda a 1 a
 * `rampaDasListrasKm` fora — a listra do traço acaba antes do SPC, sem parede
 * e sem dobrar a listra medida (o traço da foto erra a posição em alguns km).
 */
export function mascarasDoSpc(spcFino, Wf, Hf, W, H, raioM, p = SPC_DE_ENCELADO) {
  const media = mediaDeArea(spcFino, Wf, Hf, W, H);
  const n = W * H;
  const dentro = new Uint8Array(n);
  const fora = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) {
    dentro[k] = Number.isFinite(media[k]) ? 1 : 0;
    fora[k] = 1 - dentro[k];
  }
  const distKm = distanciaAoVazioKm(fora, W, H, raioM);
  const foraKm = distanciaAoVazioKm(dentro, W, H, raioM);
  const peso = new Float32Array(n);
  const nucleo = new Uint8Array(n);
  const listras = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    if (!dentro[k]) {
      listras[k] = suave(0, p.rampaDasListrasKm, foraKm[k]);
      continue;
    }
    peso[k] = suave(0, p.bandaKm, distKm[k]);
    nucleo[k] = distKm[k] >= p.bandaKm ? 1 : 0;
  }
  return { dentro, distKm, peso, nucleo, listras };
}

const suave = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Bilinear de um campo W×H da casa no ponto fracionário (x, y) em texels (centro do texel em +0,5), com a volta. */
function bilinearNaCasa(campo, W, H, x, y) {
  const x0 = Math.floor(x - 0.5);
  const fx = x - 0.5 - x0;
  const y0 = Math.min(H - 2, Math.max(0, Math.floor(y - 0.5)));
  const fy = Math.min(1, Math.max(0, y - 0.5 - y0));
  const a = ((x0 % W) + W) % W;
  const b = (a + 1) % W;
  return (
    (campo[y0 * W + a] * (1 - fx) + campo[y0 * W + b] * fx) * (1 - fy) +
    (campo[(y0 + 1) * W + a] * (1 - fx) + campo[(y0 + 1) * W + b] * fx) * fy
  );
}

/** Bilinear de um campo W×H da casa em (lat, lonE) graus. */
export function amostraNaCasa(campo, W, H, latGraus, lonGraus) {
  return bilinearNaCasa(campo, W, H, ((((lonGraus - 180) % 360) + 360) % 360 / 360) * W, ((90 - latGraus) / 180) * H);
}

/**
 * A FUSÃO (convenção da casa): `metros` o DEM fino (já consertado fora do
 * SPC), `spcFino` o SPC registrado na mesma grade (NaN fora), `mascaras` as de
 * `mascarasDoSpc` na grade de trabalho W×H. No anel de `anelKm` junto da borda,
 * a CORREÇÃO c = largo do DEM − largo do SPC (σ `sigmaLargoKm`, na mesma
 * cobertura); para dentro ela segue harmônica (`membranaHarmonica`), e o SPC
 * corrigido entra pelo peso da rampa: h = DEM + peso·(SPC + c − DEM). Na borda o
 * peso é 0 (nenhum degrau); no núcleo o resultado é o SPC (mais a membrana,
 * que só leva o nível). Devolve `{ metros, correcao }`.
 */
export function fundeNoDem({ metros, spcFino, Wf, Hf, mascaras, W, H, raioM, p = SPC_DE_ENCELADO }) {
  const n = W * H;
  const { dentro, distKm, peso } = mascaras;
  const Dw = Float32Array.from(mediaDeArea(metros, Wf, Hf, W, H));
  const Sw = Float32Array.from(mediaDeArea(spcFino, Wf, Hf, W, H), (v) => (Number.isFinite(v) ? v : 0));
  const Ld = desfocaComMascara(Dw, dentro, W, H, raioM, p.sigmaLargoKm).valor;
  const Ls = desfocaComMascara(Sw, dentro, W, H, raioM, p.sigmaLargoKm).valor;
  const anel = new Uint8Array(n);
  const dif = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    if (dentro[k] && distKm[k] < p.anelKm) {
      anel[k] = 1;
      dif[k] = Ld[k] - Ls[k];
    }
  }
  // fora, a diferença do anel estendida e lisa: só serve de borda à membrana
  const fundo = desfocaComMascara(dif, anel, W, H, raioM, p.membranaSigmaKm / 2).valor;
  const dado = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) {
    if (dentro[k] && !anel[k]) continue;
    dado[k] = 1;
    if (!anel[k]) dif[k] = Number.isFinite(fundo[k]) ? fundo[k] : 0;
  }
  const correcao = membranaHarmonica(dif, dado, W, H, raioM, p.membranaSigmaKm);
  const saida = Float32Array.from(metros);
  for (let j = 0; j < Hf; j += 1) {
    const y = ((j + 0.5) * H) / Hf;
    for (let i = 0; i < Wf; i += 1) {
      const k = j * Wf + i;
      const s = spcFino[k];
      if (!Number.isFinite(s)) continue;
      const x = ((i + 0.5) * W) / Wf;
      const w = bilinearNaCasa(peso, W, H, x, y);
      if (w <= 0) continue;
      saida[k] = metros[k] + w * (s + bilinearNaCasa(correcao, W, H, x, y) - metros[k]);
    }
  }
  return { metros: saida, correcao };
}

/**
 * A PARTILHA DA ÁREA para a confissão: o SPC pelo peso da rampa; o resto, pela
 * `cobertura` do conserto (MEDIDO 0 → DEM de Schenk, INVENTADO 1 → alisado,
 * DERIVADO 2 → derivado da foto). Frações da esfera.
 */
export function partilhaDaArea(cobertura, peso, W, H) {
  const soma = { spc: 0, schenk: 0, alisado: 0, derivado: 0 };
  const nomes = ['schenk', 'alisado', 'derivado'];
  let total = 0;
  for (let j = 0; j < H; j += 1) {
    const area = Math.cos(latitudeDaLinha(j, H));
    for (let i = 0; i < W; i += 1) {
      const k = j * W + i;
      const w = peso ? peso[k] : 0;
      soma.spc += area * w;
      soma[nomes[cobertura[k]]] += area * (1 - w);
      total += area;
    }
  }
  for (const nome of Object.keys(soma)) soma[nome] /= total;
  return soma;
}
