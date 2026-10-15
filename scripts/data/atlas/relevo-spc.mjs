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
//  5. O SPT POR EXEMPLO (`preencheSpt`, 14/10/2026): no terreno das listras
//     (até 55°S), o que o SPC não cobre e o DEM tem como ruído ou liso ganha o
//     fino do PRÓPRIO SPC — o mesmo tipo de terreno, medido a 100 m — em
//     retalhos girados para o rumo da foto, escolhidos pela encosta larga,
//     pela aspereza que a foto prevê e pelo erro na sobreposição, emendados
//     por corte de erro mínimo e membrana; as listras fora do SPC levam as
//     fatias medidas nas três do SPC ao longo do traço da foto.
// ============================================================

import { sorteador } from './conserto-do-dem.mjs';
import { corteDeErroMinimo, geometriaDoCorte, raioDoCorte } from './cor-inventada.mjs';
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
 * na borda a 1 em `bandaKm`) e o `nucleo` (peso 1: lá o SPC é tudo).
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
  const peso = new Float32Array(n);
  const nucleo = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) {
    if (!dentro[k]) continue;
    peso[k] = suave(0, p.bandaKm, distKm[k]);
    nucleo[k] = distKm[k] >= p.bandaKm ? 1 : 0;
  }
  return { dentro, distKm, peso, nucleo };
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
 * A PARTILHA DA ÁREA para a confissão: o SPC pelo `peso` (o da fusão, ou o de
 * `preencheSpt`); o resto, pela `cobertura` (MEDIDO 0 → DEM de Schenk,
 * INVENTADO 1 → alisado, DERIVADO 2 → derivado da foto, EXEMPLO_DO_SPC 3 →
 * inventado por exemplo do SPC). Frações da esfera.
 */
export function partilhaDaArea(cobertura, peso, W, H) {
  const soma = { spc: 0, schenk: 0, alisado: 0, derivado: 0, exemplo: 0 };
  const nomes = ['schenk', 'alisado', 'derivado', 'exemplo'];
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

// ------------------------------------------------------------
// 4. O terreno das listras (SPT) por exemplo do SPC
// ------------------------------------------------------------

/**
 * Os números do SPT de Encélado (de onde vêm: `capturas/r4-encelado/spt/`).
 * O plano polar é o do SPC (azimutal equidistante, u à direita, v para baixo,
 * o meridiano 0 para cima) na longitude DA CASA.
 */
export const SPT_DE_ENCELADO = Object.freeze({
  passoKm: 0.2,
  /** o plano cobre o limite, a saída do preenchimento e meio retalho (55° + 24 km + 8 km do polo ≈ 42,3°) */
  ateGraus: 43,
  /**
   * o limite do SPT (`limiteDoSpt`, o das listras) e a SAÍDA do preenchimento (`pesoDoPreenchimento`): o ruim
   * segue preenchido além do limite e se apaga em `foraKm` (o ladrilho de bolhas cruza os 55°S; em círculo de 8 km,
   * o pedaço de fora ficava liso, uma placa chapada ao lado da textura)
   */
  limite: Object.freeze({ latGraus: -55, rampaKm: 8, foraKm: 24 }),
  /**
   * o largo que fica (σ da média que o separa do fino trocado). No núcleo do SPC o DEM ruim correlaciona 0,15–0,30
   * com o SPC em todas as bandas de 0,4 a 12,8 km; até σ 3,2 km tem a energia do SPC, acima 1,5–4× menos. Com 4 km
   * a colcha saiu amassada (o retalho que leva ondas de ~25 km não cabe entre as listras): fica o corte do conserto
   */
  corteKm: 1.6,
  rumo: Object.freeze({ bandaKm: Object.freeze([0.8, 1.6]), janelaKm: 8, coerenciaMin: 0.1 }),
  encostaKm: 6,
  /**
   * a aspereza (a energia local do fino) que a foto prevê: no SPC, ln E do relevo × ln E da foto correlacionam 0,88.
   * Perto do DEM bom mais calmo que ela, o alvo desce até a dele (a média dela a σ `doBomKm`) e sobe de volta à da
   * foto em `aoBomKm`: o preenchido não encosta cheio num ladrilho liso (a costura reta viraria troca de textura)
   */
  aspereza: Object.freeze({ bandaKm: Object.freeze([0.4, 1.6]), janelaKm: 4, aoBomKm: 24, doBomKm: 6 }),
  retalho: Object.freeze({
    larguraKm: 8,
    sobreposicaoKm: 2,
    candidatos: 600,
    preSelecao: 120,
    melhores: 3,
    folgaKm: 1,
    repeticaoKm: 20,
    mesmaOrigemKm: 8,
    pesoDaFoto: 0.5,
    pesoLivre: 0.25,
    passadas: 300,
  }),
  listras: Object.freeze({
    meiaLarguraKm: 12,
    alinhaKm: 2,
    foraKm: Object.freeze([8, 12]),
    cristaKm: Object.freeze([1, 5]),
    corredorKm: 4,
    rampaForaDoSpcKm: 6,
    rampaDoMedidoKm: 3,
    pontaKm: 6,
    nucleoKm: 4,
    passoDaSequenciaKm: 2,
  }),
  semente: 20261014,
});

/** A classe nova da cobertura: inventado por exemplo do SPC (as outras são as de `conserto-do-dem.mjs`). */
export const EXEMPLO_DO_SPC = 3;

/** O plano polar do SPT: N×N células de `passoKm` até `ateGraus` do polo. */
export function planoDoSpt(raioKm, p = SPT_DE_ENCELADO) {
  return { N: 2 * Math.ceil((raioKm * p.ateGraus * RADIANOS) / p.passoKm), passoKm: p.passoKm, raioKm };
}

/** A célula fracionária (centro da célula k em x = k) do ponto (u, v) km do plano. */
const celula = (plano, u) => u / plano.passoKm + plano.N / 2 - 0.5;
/** O km do plano do centro da célula x. */
const kmDaCelula = (plano, x) => (x + 0.5 - plano.N / 2) * plano.passoKm;

/** Bilinear num campo do plano N×N na célula fracionária (x, y); NaN fora. */
export function noPlanoPolarBilinear(f, N, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  if (x0 < 0 || y0 < 0 || x0 >= N - 1 || y0 >= N - 1) return NaN;
  const fx = x - x0;
  const fy = y - y0;
  const k = y0 * N + x0;
  return (f[k] * (1 - fx) + f[k + 1] * fx) * (1 - fy) + (f[k + N] * (1 - fx) + f[k + N + 1] * fx) * fy;
}

/** Um campo Wc×Hc da casa levado ao plano: bilinear, ou o texel que contém o ponto (`vizinho`). */
export function casaNoPlano(campo, Wc, Hc, plano, vizinho = false) {
  const { N, raioKm } = plano;
  const saida = new Float32Array(N * N);
  for (let y = 0; y < N; y += 1) {
    const v = kmDaCelula(plano, y);
    for (let x = 0; x < N; x += 1) {
      const [lat, lon] = doPlanoPolar(kmDaCelula(plano, x), v, raioKm);
      if (!vizinho) {
        saida[y * N + x] = amostraNaCasa(campo, Wc, Hc, lat, lon);
        continue;
      }
      const j = Math.min(Hc - 1, Math.floor(((90 - lat) / 180) * Hc));
      const i = Math.floor((((((lon - 180) % 360) + 360) % 360) / 360) * Wc) % Wc;
      saida[y * N + x] = campo[j * Wc + i];
    }
  }
  return saida;
}

/** Os raios das três caixas que imitam a gaussiana de σ (células) (Kovesi). */
function caixasDaGaussiana(sigma) {
  const ideal = Math.sqrt(4 * sigma * sigma + 1);
  let wl = Math.floor(ideal);
  if (wl % 2 === 0) wl -= 1;
  const m = Math.round((12 * sigma * sigma - 3 * wl * wl - 12 * wl - 9) / (-4 * wl - 4));
  return [0, 1, 2].map((i) => ((i < m ? wl : wl + 2) - 1) / 2);
}

/** Uma passada de caixa de raio r (média; fora do plano conta zero), nas linhas ou nas colunas. */
function passaCaixa(a, N, r, horizontal) {
  const o = new Float64Array(N * N);
  const w = 1 / (2 * r + 1);
  for (let l = 0; l < N; l += 1) {
    const at = (t) => (horizontal ? a[l * N + t] : a[t * N + l]);
    let s = 0;
    for (let t = 0; t <= Math.min(r, N - 1); t += 1) s += at(t);
    for (let t = 0; t < N; t += 1) {
      o[horizontal ? l * N + t : t * N + l] = s * w;
      if (t + r + 1 < N) s += at(t + r + 1);
      if (t - r >= 0) s -= at(t - r);
    }
  }
  return o;
}

/** A média gaussiana (três caixas) de σ `sigmaCel` células de um campo do plano; com `mascara`, só dela (NaN onde não alcança). */
export function borraNoPlano(v, N, sigmaCel, mascara = null) {
  let num = new Float64Array(N * N);
  let den = new Float64Array(N * N);
  for (let k = 0; k < N * N; k += 1) {
    if ((mascara && !mascara[k]) || !Number.isFinite(v[k])) continue;
    num[k] = v[k];
    den[k] = 1;
  }
  for (const r of caixasDaGaussiana(sigmaCel)) {
    for (const h of [true, false]) {
      num = passaCaixa(num, N, r, h);
      den = passaCaixa(den, N, r, h);
    }
  }
  return Float32Array.from(num, (s, k) => (den[k] > 1e-3 ? s / den[k] : NaN));
}

/** A distância (células) de cada célula à mais próxima de `alvo` (transformada exata de Felzenszwalb & Huttenlocher). */
export function distanciaNoPlano(alvo, N) {
  const INF = 1e20;
  const f = Float64Array.from(alvo, (a) => (a ? 0 : INF));
  const linha = new Float64Array(N);
  const d = new Float64Array(N);
  const vv = new Int32Array(N);
  const z = new Float64Array(N + 1);
  const passa = (le, escreve) => {
    for (let l = 0; l < N; l += 1) {
      for (let t = 0; t < N; t += 1) linha[t] = f[le(l, t)];
      let k = 0;
      vv[0] = 0;
      z[0] = -INF;
      z[1] = INF;
      for (let q = 1; q < N; q += 1) {
        let s = (linha[q] + q * q - (linha[vv[k]] + vv[k] * vv[k])) / (2 * q - 2 * vv[k]);
        while (s <= z[k]) {
          k -= 1;
          s = (linha[q] + q * q - (linha[vv[k]] + vv[k] * vv[k])) / (2 * q - 2 * vv[k]);
        }
        k += 1;
        vv[k] = q;
        z[k] = s;
        z[k + 1] = INF;
      }
      k = 0;
      for (let q = 0; q < N; q += 1) {
        while (z[k + 1] < q) k += 1;
        d[q] = (q - vv[k]) ** 2 + linha[vv[k]];
      }
      for (let t = 0; t < N; t += 1) f[escreve(l, t)] = d[t];
    }
  };
  passa((l, t) => l * N + t, (l, t) => l * N + t);
  passa((l, t) => t * N + l, (l, t) => t * N + l);
  return Float32Array.from(f, (x) => Math.sqrt(x));
}

/**
 * O RUMO no plano: o tensor de estrutura da banda `rumo.bandaKm` de `campo`
 * (o log da foto, ou a altura), médio a σ `rumo.janelaKm`: `theta` (o rumo
 * do gradiente, rad, no quadro u→, v↓ do plano; as feições correm a theta +
 * 90°), `coh` e a `banda`.
 */
export function rumoNoPlano(campo, plano, p = SPT_DE_ENCELADO) {
  const { N, passoKm } = plano;
  const [a, b] = p.rumo.bandaKm.map((s) => borraNoPlano(campo, N, s / passoKm));
  const banda = Float32Array.from(a, (x, k) => x - b[k]);
  const xx = new Float32Array(N * N);
  const xy = new Float32Array(N * N);
  const yy = new Float32Array(N * N);
  for (let y = 1; y < N - 1; y += 1) {
    for (let x = 1; x < N - 1; x += 1) {
      const k = y * N + x;
      const gx = banda[k + 1] - banda[k - 1];
      const gy = banda[k + N] - banda[k - N];
      if (!Number.isFinite(gx + gy)) continue;
      xx[k] = gx * gx;
      xy[k] = gx * gy;
      yy[k] = gy * gy;
    }
  }
  const [A, B, C] = [xx, xy, yy].map((f) => borraNoPlano(f, N, p.rumo.janelaKm / passoKm));
  const theta = new Float32Array(N * N);
  const coh = new Float32Array(N * N);
  for (let k = 0; k < N * N; k += 1) {
    const tr = A[k] + C[k];
    const d = Math.hypot(A[k] - C[k], 2 * B[k]);
    theta[k] = 0.5 * Math.atan2(2 * B[k], A[k] - C[k]);
    coh[k] = tr > 0 ? d / tr : 0;
  }
  return { theta, coh, banda };
}

/**
 * O LIMITE DO SPT: a cadeia circumpolar de escarpas e dobras a ~55°S que
 * cerca o terreno renovado do polo sul (Porco et al. 2006, Science 311, 1393)
 * — `limite.latGraus`, numa rampa de `limite.rampaKm` centrada nele: o peso
 * no plano, 1 dentro, 0 fora. Procurado na foto como o anel de lineamentos
 * circunferenciais por longitude, o pico se espalhou pela faixa inteira de
 * 50–62°S (capturas/r4-encelado/spt/): fica a latitude da literatura.
 */
export function limiteDoSpt(plano, p = SPT_DE_ENCELADO) {
  const { N, raioKm } = plano;
  const rhoLim = (p.limite.latGraus + 90) * RADIANOS * raioKm;
  const meia = p.limite.rampaKm / 2;
  const peso = new Float32Array(N * N);
  for (let y = 0; y < N; y += 1) {
    const v = kmDaCelula(plano, y);
    for (let x = 0; x < N; x += 1) peso[y * N + x] = 1 - suave(-meia, meia, Math.hypot(kmDaCelula(plano, x), v) - rhoLim);
  }
  return peso;
}

/**
 * O PESO DO PREENCHIMENTO no plano: 1 dentro do limite do SPT, e fora dele um
 * smoothstep de 1 a 0 em `limite.foraKm` — o ruim que cruza o limite segue
 * preenchido e se apaga numa faixa larga, sem borda em círculo.
 */
export function pesoDoPreenchimento(plano, p = SPT_DE_ENCELADO) {
  const { N, raioKm } = plano;
  const rhoLim = (p.limite.latGraus + 90) * RADIANOS * raioKm;
  const peso = new Float32Array(N * N);
  for (let y = 0; y < N; y += 1) {
    const v = kmDaCelula(plano, y);
    for (let x = 0; x < N; x += 1) peso[y * N + x] = 1 - suave(0, p.limite.foraKm, Math.hypot(kmDaCelula(plano, x), v) - rhoLim);
  }
  return peso;
}

/** Os traços (pontos com lat, lonE) no plano: [[{ u, v, s }]], s o comprimento de arco (km) desde o 1º ponto. */
export function tracosNoPlano(linhas, raioKm) {
  return linhas.map((linha) => {
    let s = 0;
    return linha.map((q, k) => {
      const [u, v] = noPlanoPolar(q.lat, q.lonE, raioKm);
      if (k > 0) {
        const [u0, v0] = noPlanoPolar(linha[k - 1].lat, linha[k - 1].lonE, raioKm);
        s += Math.hypot(u - u0, v - v0);
      }
      return { u, v, s };
    });
  });
}

/** A normal unitária (através) do traço no ponto q: a tangente pelos vizinhos, girada de 90°. */
function normalDoTraco(traco, q) {
  const a = traco[Math.max(0, q - 1)];
  const b = traco[Math.min(traco.length - 1, q + 1)];
  const l = Math.hypot(b.u - a.u, b.v - a.v) || 1;
  return [-(b.v - a.v) / l, (b.u - a.u) / l];
}

/**
 * UMA FATIA ATRAVÉS do traço no ponto q: `campo` (plano) amostrado de −D a
 * +D (D = `meiaLarguraKm`) no passo do plano, deslocada para pôr o mínimo
 * dentro de ±`alinhaKm` no centro (se `alinha`), sem a reta ajustada nas
 * pontas (`foraKm`). `aceita(x, y)` diz se a célula pode entrar. Devolve a
 * fatia (Float64Array 2D/passo + 1) ou null.
 */
export function fatiaDaListra(campo, plano, traco, q, p = SPT_DE_ENCELADO, { alinha = true, aceita = null } = {}) {
  const L = p.listras;
  const { N, passoKm } = plano;
  const n = Math.round(L.meiaLarguraKm / passoKm);
  const a = alinha ? Math.round(L.alinhaKm / passoKm) : 0;
  const [nu, nv] = normalDoTraco(traco, q);
  const { u, v } = traco[q];
  const crua = new Float64Array(2 * (n + a) + 1);
  for (let t = -(n + a); t <= n + a; t += 1) {
    const x = celula(plano, u + t * passoKm * nu);
    const y = celula(plano, v + t * passoKm * nv);
    if (aceita && !aceita(Math.round(x), Math.round(y))) return null;
    const h = noPlanoPolarBilinear(campo, N, x, y);
    if (!Number.isFinite(h)) return null;
    crua[t + n + a] = h;
  }
  let desvio = 0;
  if (alinha) {
    let menor = Infinity;
    for (let t = -a; t <= a; t += 1) {
      const m = (crua[n + a + t - 1] + crua[n + a + t] + crua[n + a + t + 1]) / 3;
      if (m < menor) {
        menor = m;
        desvio = t;
      }
    }
  }
  const fatia = new Float64Array(2 * n + 1);
  for (let t = -n; t <= n; t += 1) fatia[t + n] = crua[t + desvio + n + a];
  // a reta das pontas
  const [f0, f1] = L.foraKm.map((d) => Math.round(d / passoKm));
  let [s0, s1, s2, s3, s4] = [0, 0, 0, 0, 0];
  for (let t = -n; t <= n; t += 1) {
    if (Math.abs(t) < f0 || Math.abs(t) > f1) continue;
    s0 += 1;
    s1 += t;
    s2 += t * t;
    s3 += fatia[t + n];
    s4 += t * fatia[t + n];
  }
  const b = (s0 * s4 - s1 * s3) / (s0 * s2 - s1 * s1);
  const c = (s3 - b * s1) / s0;
  for (let t = -n; t <= n; t += 1) fatia[t + n] -= c + b * t;
  return fatia;
}

/** A profundidade da fatia: a média das duas cristas (máximo de cada lado entre `cristaKm`) menos o centro. */
function profundidadeDaFatia(fatia, passoKm, p) {
  const n = (fatia.length - 1) / 2;
  const [c0, c1] = p.listras.cristaKm.map((d) => Math.round(d / passoKm));
  let [e, d] = [-Infinity, -Infinity];
  for (let t = c0; t <= c1; t += 1) {
    e = Math.max(e, fatia[n - t]);
    d = Math.max(d, fatia[n + t]);
  }
  return { crista: (e + d) / 2, sulco: (e + d) / 2 - fatia[n] };
}

/**
 * O PERFIL MEDIDO DAS LISTRAS no SPC: em cada ponto dos traços cuja fatia
 * inteira cai na cobertura (`cobre`; `campo` a altura registrada), a fatia
 * alinhada no sulco, sem a reta das pontas. Devolve `{ perfil (a média de
 * todas: as três listras do SPC), sequencia: [{ s, fatia }] (as fatias de
 * cada traço na ordem, em sequência; s o arco acumulado, `passoDaSequenciaKm`
 * entre um traço e o seguinte), fatias, porTraco, sulcoM, cristaM,
 * cristaACristaKm, larguraKm (do perfil médio), sulcoDaFatiaM (a mediana
 * fatia a fatia) }`, ou null sem fatia.
 */
export function perfilMedidoDasListras({ campo, cobre, plano, tracos, p = SPT_DE_ENCELADO }) {
  const { N, passoKm } = plano;
  const aceita = (x, y) => x >= 0 && y >= 0 && x < N && y < N && cobre[y * N + x] === 1;
  const n = Math.round(p.listras.meiaLarguraKm / passoKm);
  const soma = new Float64Array(2 * n + 1);
  const sequencia = [];
  const porTraco = [];
  const sulcos = [];
  let s0 = 0;
  for (const traco of tracos) {
    let m = 0;
    let ultimo = null;
    for (let q = 0; q < traco.length; q += 1) {
      const fatia = fatiaDaListra(campo, plano, traco, q, p, { aceita });
      if (!fatia) continue;
      for (let t = 0; t <= 2 * n; t += 1) soma[t] += fatia[t];
      if (ultimo !== null) s0 += traco[q].s - ultimo;
      ultimo = traco[q].s;
      sequencia.push({ s: s0, fatia });
      sulcos.push(profundidadeDaFatia(fatia, passoKm, p).sulco);
      m += 1;
    }
    porTraco.push(m);
    if (m) s0 += p.listras.passoDaSequenciaKm;
  }
  if (!sequencia.length) return null;
  const perfil = Float64Array.from(soma, (v) => v / sequencia.length);
  const { crista, sulco } = profundidadeDaFatia(perfil, passoKm, p);
  const [c0, c1] = p.listras.cristaKm.map((d) => Math.round(d / passoKm));
  let [ie, id] = [c0, c0];
  for (let t = c0; t <= c1; t += 1) {
    if (perfil[n - t] > perfil[n - ie]) ie = t;
    if (perfil[n + t] > perfil[n + id]) id = t;
  }
  let [me, md] = [0, 0];
  while (me < n && perfil[n - me] < perfil[n] + sulco / 2) me += 1;
  while (md < n && perfil[n + md] < perfil[n] + sulco / 2) md += 1;
  return {
    perfil,
    sequencia,
    fatias: sequencia.length,
    porTraco,
    sulcoM: sulco,
    cristaM: crista,
    cristaACristaKm: (ie + id) * passoKm,
    larguraKm: (me + md) * passoKm,
    sulcoDaFatiaM: [...sulcos].sort((a, b) => a - b)[sulcos.length >> 1],
    comprimentoKm: s0,
  };
}

/** O valor de uma fatia (Float64Array de −D a +D no passo do plano) em d km (com sinal); 0 além. */
function naFatia(fatia, passoKm, d) {
  const n = (fatia.length - 1) / 2;
  const t = d / passoKm + n;
  if (t <= 0 || t >= 2 * n) return 0;
  const t0 = Math.floor(t);
  return fatia[t0] * (1 - (t - t0)) + fatia[t0 + 1] * (t - t0);
}

/**
 * AS LISTRAS POR EXEMPLO DAS DO SPC, no plano: para cada traço, onde ele
 * passa no que se troca (`pode`, peso 0–1 por célula), a fatia através no
 * arco s é a das listras MEDIDAS (`medido.sequencia`, a partir de um ponto
 * sorteado, interpolada entre fatias vizinhas: a variação ao longo é a delas)
 * até `nucleoKm` do traço, e o perfil médio além (a textura em volta é da
 * colcha) — menos o perfil médio que o `campo` já tem ali (as fatias sem
 * alinhar nos pontos de peso > ½): na média ao longo, o resultado é o
 * perfil medido. Afinado a zero entre `foraKm` e nas pontas (`pontaKm`).
 * Devolve `{ corte (m, a somar), corredor (Uint8: |d| < cristaKm[1]), base: [perfil já presente por traço] }`.
 */
export function cortaListras({ campo, pode, plano, tracos, medido, p = SPT_DE_ENCELADO, sorteia = Math.random }) {
  const { N, passoKm } = plano;
  const L = p.listras;
  const corte = new Float32Array(N * N);
  const corredor = new Uint8Array(N * N);
  const { sequencia, perfil } = medido;
  const total = medido.comprimentoKm;
  const base = [];
  /** a fatia medida no arco f (km) da sequência, com a volta; d com sinal */
  const daSequencia = (f, d) => {
    const g = ((f % total) + total) % total;
    let q = 0;
    while (q + 1 < sequencia.length && sequencia[q + 1].s <= g) q += 1;
    const [a, b] = [sequencia[q], sequencia[(q + 1) % sequencia.length]];
    const vao = (q + 1 < sequencia.length ? b.s : total) - a.s;
    const t = vao > 0 ? Math.min(1, (g - a.s) / vao) : 0;
    const v = naFatia(a.fatia, passoKm, d) * (1 - t) + naFatia(b.fatia, passoKm, d) * t;
    const m = naFatia(perfil, passoKm, d);
    return m + (v - m) * (1 - suave(L.nucleoKm - 1, L.nucleoKm + 1, Math.abs(d)));
  };
  const afina = (d) => 1 - suave(L.foraKm[0], L.foraKm[1], Math.abs(d));
  for (const traco of tracos) {
    if (traco.length < 2) {
      base.push(null);
      continue;
    }
    const comprimento = traco[traco.length - 1].s;
    const pesoNoPonto = (q) => {
      const x = Math.round(celula(plano, traco[q].u));
      const y = Math.round(celula(plano, traco[q].v));
      return x >= 0 && y >= 0 && x < N && y < N ? pode[y * N + x] : 0;
    };
    // o perfil que o campo já tem onde o traço entra
    const n = Math.round(L.meiaLarguraKm / passoKm);
    const soma = new Float64Array(2 * n + 1);
    let fatias = 0;
    for (let q = 0; q < traco.length; q += 1) {
      if (pesoNoPonto(q) <= 0.5) continue;
      const fatia = fatiaDaListra(campo, plano, traco, q, p, { alinha: false });
      if (!fatia) continue;
      for (let t = 0; t <= 2 * n; t += 1) soma[t] += fatia[t];
      fatias += 1;
    }
    if (!fatias) {
      base.push(null);
      continue;
    }
    const presente = Float64Array.from(soma, (v) => v / fatias);
    base.push(presente);
    const inicio = sorteia() * total;
    // cada célula perto do traço: o segmento mais perto, d com sinal (a normal de `normalDoTraco`) e s
    const alcance = L.meiaLarguraKm;
    let [uMin, uMax, vMin, vMax] = [Infinity, -Infinity, Infinity, -Infinity];
    for (const q of traco) {
      uMin = Math.min(uMin, q.u);
      uMax = Math.max(uMax, q.u);
      vMin = Math.min(vMin, q.v);
      vMax = Math.max(vMax, q.v);
    }
    const x0 = Math.max(0, Math.floor(celula(plano, uMin - alcance)));
    const x1 = Math.min(N - 1, Math.ceil(celula(plano, uMax + alcance)));
    const y0 = Math.max(0, Math.floor(celula(plano, vMin - alcance)));
    const y1 = Math.min(N - 1, Math.ceil(celula(plano, vMax + alcance)));
    for (let y = y0; y <= y1; y += 1) {
      const v = kmDaCelula(plano, y);
      for (let x = x0; x <= x1; x += 1) {
        const k = y * N + x;
        if (!(pode[k] > 0)) continue;
        const u = kmDaCelula(plano, x);
        let melhor = Infinity;
        let s = 0;
        let d = 0;
        for (let q = 0; q + 1 < traco.length; q += 1) {
          const A = traco[q];
          const B = traco[q + 1];
          const du = B.u - A.u;
          const dv = B.v - A.v;
          const l2 = du * du + dv * dv;
          const t = l2 > 0 ? Math.min(1, Math.max(0, ((u - A.u) * du + (v - A.v) * dv) / l2)) : 0;
          const dist = Math.hypot(u - A.u - t * du, v - A.v - t * dv);
          if (dist < melhor) {
            melhor = dist;
            s = A.s + t * (B.s - A.s);
            d = l2 > 0 ? ((u - A.u) * -dv + (v - A.v) * du) / Math.sqrt(l2) : dist;
          }
        }
        if (melhor >= alcance) continue;
        const w = pode[k] * suave(0, L.pontaKm, Math.min(s, comprimento - s));
        if (!(w > 0)) continue;
        corte[k] += w * afina(d) * (daSequencia(inicio + s, d) - naFatia(presente, passoKm, d));
        if (melhor < L.cristaKm[1]) corredor[k] = 1;
      }
    }
  }
  return { corte, corredor, base };
}

/**
 * A COLCHA DO SPT (Efros & Freeman 2001, como `colcha` e a transferência de
 * `cor-inventada.mjs`) no plano: o `fino` (h − largo) nas células `alvo` vem
 * em retalhos quadrados de `retalho.larguraKm`, a cada largura −
 * `sobreposicaoKm`, dos que estão mais perto do conhecido para longe. Cada um
 * copia o fino do SPC (`doador`) de uma das `origens` (células cujo retalho
 * girado inteiro + `folgaKm` cai no SPC e longe das listras), girado para que
 * o rumo da foto na origem caia no do alvo (`rumo.theta`; meia volta
 * sorteada; sem coerência, giro sorteado). A escolha: `candidatos` origens
 * sorteadas (fora as já usadas a menos de `mesmaOrigemKm` por um retalho a
 * menos de `repeticaoKm` daqui); delas as `preSelecao` de encosta larga
 * (`encLog`) e de ASPEREZA (`asperezaLog`: a energia local do fino; no alvo,
 * a que a foto prevê) mais parecidas, cada uma em unidades do seu desvio no
 * conjunto; delas, sorteada entre as `melhores` de menor erro
 * na sobreposição (Σ(velho − novo)² ÷ Σ(velho² + novo²)) com o que já está
 * (o fino conhecido — o SPC, os ladrilhos bons — e os retalhos postos;
 * `preposto`: alvo que já começa coberto, que o corte pode atravessar). A
 * emenda: o corte de erro mínimo em curva fechada (`corteDeErroMinimo`), e
 * dentro dele uma membrana (Laplace, SOR) que leva a diferença velho − novo
 * da borda para dentro: nenhum degrau. `conhecido` é o fino fora do alvo
 * (nunca muda). Com `energiaAlvo` (NaN onde não vale) e a `energiaDoDoador`
 * por célula, o retalho entra multiplicado por √(alvo ÷ doador), nunca acima
 * de 1. Devolve `{ fino, retalhos: [{ alvo: [u, v], origem: [u, v], giro, erro }] }`.
 */
export function colchaDoSpt({ conhecido, alvo, preposto = null, informa, doador, origens, rumo, encLog, asperezaLog, guia, plano, p = SPT_DE_ENCELADO, sorteia, energiaAlvo = null, energiaDoDoador = null }) {
  const { N, passoKm } = plano;
  const e = p.retalho;
  const meio = e.larguraKm / 2 / passoKm;
  const Hh = Math.ceil(meio) + 2;
  const G = 2 * Hh + 1;
  const geo = geometriaDoCorte(meio, Hh);
  const fino = Float32Array.from(conhecido);
  const posto = Uint8Array.from(alvo, (a, k) => (a && !(preposto && preposto[k]) ? 0 : 1));
  const custo = new Float64Array(G * G);
  const coberto = new Uint8Array(G * G);
  const fixo = new Uint8Array(G * G);
  const conta = new Uint8Array(G * G);
  const novo = new Float64Array(G * G);
  const velho = new Float64Array(G * G);
  const omega = new Uint8Array(G * G);
  const corr = new Float64Array(G * G);
  const retalhos = [];
  /** os retalhos postos, por balde de `repeticaoKm` (a regra de repetição só olha os vizinhos) */
  const baldes = new Map();
  const { theta, coh } = rumo;
  const desvioPadrao = (f) => {
    const m = origens.reduce((s, o) => s + f[o], 0) / origens.length;
    return Math.sqrt(origens.reduce((s, o) => s + (f[o] - m) ** 2, 0) / origens.length) || 1;
  };
  const [dpEnc, dpAsp] = [desvioPadrao(encLog), desvioPadrao(asperezaLog)];
  const poe = (kc) => {
    const cx = kc % N;
    const cy = (kc / N) | 0;
    let falta = false;
    for (let b = 0; b < G; b += 1) {
      for (let a = 0; a < G; a += 1) {
        const q = b * G + a;
        const x = cx + a - Hh;
        const y = cy + b - Hh;
        if (x < 0 || y < 0 || x >= N || y >= N) {
          [coberto[q], fixo[q], conta[q], velho[q]] = [1, 1, 0, 0];
          continue;
        }
        const k = y * N + x;
        fixo[q] = alvo[k] ? 0 : 1;
        coberto[q] = posto[k];
        conta[q] = posto[k] && (alvo[k] || informa[k]) ? 1 : 0;
        velho[q] = fino[k];
        if (!posto[k] && Math.abs(a - Hh) <= meio && Math.abs(b - Hh) <= meio) falta = true;
      }
    }
    if (!falta) return;
    const [uc, vc] = [kmDaCelula(plano, cx), kmDaCelula(plano, cy)];
    // os candidatos, fora as origens usadas por retalhos a menos de `repeticaoKm` daqui
    const [bu, bv] = [Math.floor(uc / e.repeticaoKm), Math.floor(vc / e.repeticaoKm)];
    const vizinhos = [];
    for (let a = -1; a <= 1; a += 1) {
      for (let b = -1; b <= 1; b += 1) {
        for (const r of baldes.get(`${bu + a},${bv + b}`) ?? []) {
          if (Math.hypot(r.alvo[0] - uc, r.alvo[1] - vc) < e.repeticaoKm) vizinhos.push(r.origem);
        }
      }
    }
    const lista = [];
    for (let t = 0; t < e.candidatos; t += 1) {
      const o = origens[Math.floor(sorteia() * origens.length)];
      const [uo, vo] = [kmDaCelula(plano, o % N), kmDaCelula(plano, (o / N) | 0)];
      if (!vizinhos.some(([u, v]) => Math.hypot(u - uo, v - vo) < e.mesmaOrigemKm)) lista.push(o);
    }
    if (!lista.length) for (let t = 0; t < e.melhores; t += 1) lista.push(origens[Math.floor(sorteia() * origens.length)]);
    const distancia = (o) => Math.abs(encLog[o] - encLog[kc]) / dpEnc + Math.abs(asperezaLog[o] - asperezaLog[kc]) / dpAsp;
    lista.sort((x, y) => distancia(x) - distancia(y));
    // perto do DEM bom o alvo pede menos energia que a do doador: o retalho entra escalado para ela (nunca acima de 1)
    const ganhoDe = (o) =>
      energiaAlvo && Number.isFinite(energiaAlvo[kc]) ? Math.min(1, Math.sqrt(energiaAlvo[kc] / Math.max(energiaDoDoador[o], 1e-6))) : 1;
    const opcoes = lista.slice(0, e.preSelecao).map((o) => {
      const ganho = ganhoDe(o);
      const giro =
        coh[kc] >= p.rumo.coerenciaMin && coh[o] >= p.rumo.coerenciaMin
          ? theta[o] - theta[kc] + (sorteia() < 0.5 ? Math.PI : 0)
          : sorteia() * 2 * Math.PI;
      const [c, s] = [Math.cos(giro), Math.sin(giro)];
      const [ox, oy] = [o % N, (o / N) | 0];
      let [erro, energia, erroG, energiaG] = [0, 0, 0, 0];
      for (let b = 0; b < G; b += 2) {
        for (let a = 0; a < G; a += 2) {
          const q = b * G + a;
          if (Math.abs(a - Hh) > meio || Math.abs(b - Hh) > meio) continue;
          const [dx, dy] = [a - Hh, b - Hh];
          const [xo, yo] = [ox + c * dx - s * dy, oy + s * dx + c * dy];
          const gt = guia[(cy + b - Hh) * N + cx + a - Hh];
          const gd = noPlanoPolarBilinear(guia, N, xo, yo);
          if (Number.isFinite(gt + gd)) {
            erroG += (gt - gd) ** 2;
            energiaG += gt * gt + gd * gd;
          }
          if (!conta[q]) continue;
          const n = ganho * noPlanoPolarBilinear(doador, N, xo, yo);
          erro += (n - velho[q]) ** 2;
          energia += n * n + velho[q] * velho[q];
        }
      }
      const eG = energiaG > 0 ? erroG / energiaG : 1;
      return { o, giro, ganho, erro: energia > 0 ? (1 - e.pesoDaFoto) * (erro / energia) + e.pesoDaFoto * eG : eG };
    });
    opcoes.sort((x, y) => x.erro - y.erro);
    const escolha = opcoes[Math.floor(sorteia() * Math.min(e.melhores, opcoes.length))];
    const [c, s] = [Math.cos(escolha.giro), Math.sin(escolha.giro)];
    const [ox, oy] = [escolha.o % N, (escolha.o / N) | 0];
    for (let b = 0; b < G; b += 1) {
      for (let a = 0; a < G; a += 1) {
        const [dx, dy] = [a - Hh, b - Hh];
        const v = noPlanoPolarBilinear(doador, N, ox + c * dx - s * dy, oy + s * dx + c * dy);
        novo[b * G + a] = Number.isFinite(v) ? escolha.ganho * v : 0;
        custo[b * G + a] = coberto[b * G + a] ? (novo[b * G + a] - velho[b * G + a]) ** 2 : 0;
      }
    }
    // o corte de erro mínimo e a região nova
    corteDeErroMinimo(geo, custo, coberto, fixo);
    const dentro = [];
    for (let b = 1; b < G - 1; b += 1) {
      for (let a = 1; a < G - 1; a += 1) {
        const q = b * G + a;
        const [dx, dy] = [a - Hh, b - Hh];
        omega[q] = 0;
        if (fixo[q] || Math.abs(dx) > meio || Math.abs(dy) > meio) continue;
        if (!coberto[q] || Math.hypot(dx, dy) < raioDoCorte(geo, dx, dy)) {
          omega[q] = 1;
          dentro.push(q);
        }
      }
    }
    // a membrana: Laplace em Ω com a diferença velho − novo na borda coberta (Neumann no descoberto)
    let soma = 0;
    let nb = 0;
    for (const q of dentro) {
      for (const r of [q - 1, q + 1, q - G, q + G]) {
        if (omega[r] || !coberto[r]) continue;
        soma += velho[r] - novo[r];
        nb += 1;
      }
    }
    const inicio = nb ? soma / nb : 0;
    for (const q of dentro) corr[q] = inicio;
    if (nb) {
      for (let it = 0; it < e.passadas; it += 1) {
        for (const q of dentro) {
          let t = 0;
          let m = 0;
          for (const r of [q - 1, q + 1, q - G, q + G]) {
            if (omega[r]) {
              t += corr[r];
              m += 1;
            } else if (coberto[r]) {
              t += velho[r] - novo[r];
              m += 1;
            }
          }
          if (m) corr[q] += 1.9 * (t / m - corr[q]);
        }
      }
    }
    for (const q of dentro) {
      const k = (cy + ((q / G) | 0) - Hh) * N + cx + (q % G) - Hh;
      if (!alvo[k]) continue;
      fino[k] = novo[q] + corr[q];
      posto[k] = 1;
    }
    const feito = { alvo: [uc, vc], origem: [kmDaCelula(plano, ox), kmDaCelula(plano, oy)], giro: escolha.giro, erro: escolha.erro };
    retalhos.push(feito);
    const chave = `${bu},${bv}`;
    if (!baldes.has(chave)) baldes.set(chave, []);
    baldes.get(chave).push(feito);
  };
  // os centros: a grade de passo largura − sobreposição sobre o alvo, do mais perto do conhecido para longe
  const doAlvo = distanciaNoPlano(alvo, N);
  const doConhecido = distanciaNoPlano(posto, N);
  const passo = Math.round((e.larguraKm - e.sobreposicaoKm) / passoKm);
  const x0 = Math.floor(sorteia() * passo);
  const y0 = Math.floor(sorteia() * passo);
  const centros = [];
  for (let y = y0; y < N; y += passo) for (let x = x0; x < N; x += passo) if (doAlvo[y * N + x] <= meio) centros.push(y * N + x);
  centros.sort((a, b) => doConhecido[a] - doConhecido[b]);
  for (const k of centros) poe(k);
  for (let k = 0; k < N * N; k += 1) if (alvo[k] && !posto[k]) poe(k);
  return { fino, retalhos };
}

/** A reta y = a + b·x de mínimos quadrados e a correlação r. */
function retaDeMinimosQuadrados(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let [sxy, sxx, syy] = [0, 0, 0];
  for (let i = 0; i < n; i += 1) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  const b = sxy / sxx;
  return { a: my - b * mx, b, r: sxy / Math.sqrt(sxx * syy) };
}

/** As células do plano a menos de meia célula de algum traço (para a distância às listras). */
function celulasDosTracos(tracos, plano) {
  const { N, passoKm } = plano;
  const m = new Uint8Array(N * N);
  for (const traco of tracos) {
    for (let q = 0; q + 1 < traco.length; q += 1) {
      const [A, B] = [traco[q], traco[q + 1]];
      const passos = Math.ceil((2 * Math.hypot(B.u - A.u, B.v - A.v)) / passoKm) + 1;
      for (let t = 0; t <= passos; t += 1) {
        const x = Math.round(celula(plano, A.u + ((B.u - A.u) * t) / passos));
        const y = Math.round(celula(plano, A.v + ((B.v - A.v) * t) / passos));
        if (x >= 0 && y >= 0 && x < N && y < N) m[y * N + x] = 1;
      }
    }
  }
  return m;
}

/**
 * O SPT POR EXEMPLO (o passo 3 da linha `completar-corpo`, "nada vê →
 * inventar com as estatísticas do PRÓPRIO corpo"), depois da fusão: no plano
 * polar do SPT, o terreno das listras que o SPC NÃO cobre e que o DEM só tem
 * como ruído ou liso ganha o fino do próprio SPC — o mesmo tipo de terreno,
 * medido a 100 m. Convenção da casa: `metros` e `spcFino` Wf×Hf (o SPC
 * registrado, NaN fora), as `mascaras` do SPC, a `qualidade` do DEM, a
 * `cobertura` do conserto e a `luminancia` da foto W×H; `linhas` os traços
 * das listras na foto (`tracaListras`).
 *  1. O ALVO: ruim no DEM, fora da cobertura do SPC (e na beira dela, onde a
 *     fusão pesa < `pesoLivre`), dentro do limite do SPT e, além dele, onde o
 *     ruim continua, até `limite.foraKm` (`pesoDoPreenchimento`: lá o
 *     preenchido se apaga no liso devagar).
 *  2. O LARGO que fica: a média de σ `corteKm` do que a fusão deu. O fino
 *     conhecido: o do SPC dentro da cobertura (também na rampa da fusão, onde
 *     o DEM é ruim: lá ele entra inteiro, não em rampa), o resto do que está.
 *  3. A COLCHA (`colchaDoSpt`) só com origens no SPC, longe das listras; perto
 *     do DEM bom mais calmo que a foto pede, o alvo desce à energia dele e o
 *     retalho entra escalado para ela, voltando à da foto em `aspereza.aoBomKm`.
 *  4. AS LISTRAS (`perfilMedidoDasListras`, `cortaListras`): o perfil medido
 *     nas três do SPC, ao longo dos traços da foto, onde o alvo está.
 * Fora do ruim e no núcleo do SPC nada muda, byte a byte. Devolve `{ metros,
 * cobertura (com EXEMPLO_DO_SPC), pesoDoSpc (o peso da partilha: o da fusão,
 * 1 no ruim coberto), relatorio }`.
 */
export function preencheSpt({ metros, spcFino, Wf, Hf, mascaras, qualidade, cobertura, luminancia, linhas, W, H, raioM, p = SPT_DE_ENCELADO }) {
  const raioKm = raioM / 1000;
  const plano = planoDoSpt(raioKm, p);
  const { N, passoKm } = plano;
  const n = N * N;
  const sorteia = sorteador(p.semente);
  const cur = casaNoPlano(metros, Wf, Hf, plano);
  const spc = casaNoPlano(spcFino, Wf, Hf, plano);
  const dentro = casaNoPlano(mascaras.dentro, W, H, plano, true);
  const pesoDaFusao = casaNoPlano(mascaras.peso, W, H, plano);
  const nucleo = casaNoPlano(mascaras.nucleo, W, H, plano, true);
  const ruim = Uint8Array.from(casaNoPlano(qualidade, W, H, plano, true), (q) => (q !== 0 ? 1 : 0));
  const fotoLog = casaNoPlano(Float32Array.from(luminancia, (l) => Math.log(l + 0.003)), W, H, plano);
  const daFoto = rumoNoPlano(fotoLog, plano, p);
  const spt = limiteDoSpt(plano, p);
  const preenche = pesoDoPreenchimento(plano, p);
  // 2. o largo e o fino conhecido
  const sigma = p.corteKm / passoKm;
  const largo = borraNoPlano(cur, N, sigma);
  const cobre = Uint8Array.from(spc, (v) => (Number.isFinite(v) ? 1 : 0));
  const largoDoSpc = borraNoPlano(spc, N, sigma, cobre);
  const conhecido = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    const f = spc[k] - largoDoSpc[k];
    conhecido[k] = dentro[k] && Number.isFinite(f) ? f : Number.isFinite(cur[k] - largo[k]) ? cur[k] - largo[k] : 0;
  }
  // o alvo: o ruim fora da cobertura e, na beira dela (peso da fusão < `retalho.pesoLivre`), o que o corte pode
  // atravessar (começa com o fino do SPC): a emenda não fica na borda reta do modelo. Na escolha do retalho conta
  // todo o conhecido em volta — o SPC, o DEM bom e o liso de fora, que puxa o retalho da saída para o calmo
  const alvo = new Uint8Array(n);
  const preposto = new Uint8Array(n);
  const informa = new Uint8Array(n).fill(1);
  for (let k = 0; k < n; k += 1) {
    const beira = dentro[k] && pesoDaFusao[k] < p.retalho.pesoLivre;
    alvo[k] = preenche[k] > 0 && ruim[k] && (!dentro[k] || beira) ? 1 : 0;
    preposto[k] = alvo[k] && dentro[k] ? 1 : 0;
  }
  // 3. as origens: o retalho girado inteiro + folga no SPC, longe das listras
  const tracos = tracosNoPlano(linhas, raioKm);
  const doTraco = distanciaNoPlano(celulasDosTracos(tracos, plano), N);
  const invalido = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) {
    invalido[k] = !cobre[k] || !dentro[k] || doTraco[k] * passoKm < p.listras.corredorKm ? 1 : 0;
  }
  const doInvalido = distanciaNoPlano(invalido, N);
  const raioDoRetalho = (p.retalho.larguraKm / 2) * Math.SQRT2 + p.retalho.folgaKm;
  const origens = [];
  for (let y = 0; y < N; y += 3) {
    for (let x = 0; x < N; x += 3) if (doInvalido[y * N + x] * passoKm >= raioDoRetalho) origens.push(y * N + x);
  }
  if (!origens.length) throw new Error('nenhuma origem no SPC longe das listras: o retalho não cabe.');
  const doador = Float32Array.from(spc, (v, k) => (cobre[k] ? v - largoDoSpc[k] : NaN));
  // o rumo: na origem o do RELEVO do SPC (medido); no alvo o da foto menos o desvio foto − relevo medido no SPC
  const doRelevo = rumoNoPlano(Float32Array.from(spc, (v) => (Number.isFinite(v) ? v : 0)), plano, p);
  const longeDaBorda = distanciaNoPlano(Uint8Array.from(cobre, (c) => 1 - c), N);
  let [dc, ds, dn] = [0, 0, 0];
  for (let k = 0; k < n; k += 1) {
    if (longeDaBorda[k] * passoKm < 2 * p.rumo.janelaKm) continue;
    const d = 2 * (daFoto.theta[k] - doRelevo.theta[k]);
    dc += daFoto.coh[k] * doRelevo.coh[k] * Math.cos(d);
    ds += daFoto.coh[k] * doRelevo.coh[k] * Math.sin(d);
    dn += daFoto.coh[k] * doRelevo.coh[k];
  }
  const desvio = 0.5 * Math.atan2(ds, dc);
  const rumo = {
    theta: Float32Array.from(daFoto.theta, (t, k) => (cobre[k] && dentro[k] ? doRelevo.theta[k] : t - desvio)),
    coh: Float32Array.from(daFoto.coh, (c, k) => (cobre[k] && dentro[k] ? doRelevo.coh[k] : c)),
  };
  // a encosta larga (o largo que fica), média a σ `encostaKm`, em log
  const enc = new Float32Array(n);
  for (let y = 1; y < N - 1; y += 1) {
    for (let x = 1; x < N - 1; x += 1) {
      const k = y * N + x;
      enc[k] = ((largo[k + 1] - largo[k - 1]) ** 2 + (largo[k + N] - largo[k - N]) ** 2) / (2 * passoKm * 1000) ** 2;
    }
  }
  const encLog = Float32Array.from(borraNoPlano(enc, N, p.encostaKm / passoKm), (v) => Math.log(Math.max(v, 1e-12)));
  // a aspereza: a energia local do fino do SPC (σ `aspereza.janelaKm`) e, fora dele, a que a energia local da foto
  // (banda `aspereza.bandaKm`) prevê pela reta ajustada no SPC (log × log)
  const A = p.aspereza;
  const [fa, fb] = A.bandaKm.map((s) => borraNoPlano(fotoLog, N, s / passoKm));
  const energiaDaFoto = borraNoPlano(Float32Array.from(fa, (v, k) => (v - fb[k]) ** 2), N, A.janelaKm / passoKm);
  const energiaDoSpc = borraNoPlano(Float32Array.from(doador, (v) => v * v), N, A.janelaKm / passoKm, cobre);
  const xs = [];
  const ys = [];
  for (let k = 0; k < n; k += 7) {
    if (!cobre[k] || longeDaBorda[k] * passoKm < 3 * A.janelaKm) continue;
    xs.push(Math.log(energiaDaFoto[k]));
    ys.push(Math.log(energiaDoSpc[k]));
  }
  const ajuste = retaDeMinimosQuadrados(xs, ys);
  const asperezaLog = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    asperezaLog[k] =
      cobre[k] && dentro[k] ? Math.log(Math.max(energiaDoSpc[k], 1e-12)) : ajuste.a + ajuste.b * Math.log(Math.max(energiaDaFoto[k], 1e-12));
  }
  // perto do DEM bom (fora do SPC): a energia dele, e o alvo puxado para ela onde ela é menor que a da foto
  const bomFora = Uint8Array.from(ruim, (r, k) => (!r && !dentro[k] ? 1 : 0));
  const doBomFora = distanciaNoPlano(bomFora, N);
  const energiaDoBom = borraNoPlano(Float32Array.from(conhecido, (v) => v * v), N, A.doBomKm / passoKm, bomFora);
  const energiaAlvo = new Float32Array(n).fill(NaN);
  for (let k = 0; k < n; k += 1) {
    if (!alvo[k] || !(energiaDoBom[k] > 0)) continue;
    const a = suave(0, A.aoBomKm, doBomFora[k] * passoKm);
    const alvoLog = a * asperezaLog[k] + (1 - a) * Math.min(asperezaLog[k], Math.log(energiaDoBom[k]));
    if (alvoLog >= asperezaLog[k] - 1e-6) continue;
    asperezaLog[k] = alvoLog;
    energiaAlvo[k] = Math.exp(alvoLog);
  }
  const guia = Float32Array.from(fa, (v, k) => v - fb[k]);
  const colcha = colchaDoSpt({
    conhecido,
    alvo,
    preposto,
    informa,
    doador,
    origens,
    rumo,
    encLog,
    asperezaLog,
    guia,
    plano,
    p,
    sorteia,
    energiaAlvo,
    energiaDoDoador: energiaDoSpc,
  });
  // 4. as listras
  const medido = perfilMedidoDasListras({ campo: spc, cobre: Uint8Array.from(cobre, (c, k) => c & dentro[k]), plano, tracos, p });
  const doDentro = distanciaNoPlano(dentro, N);
  const doBom = distanciaNoPlano(Uint8Array.from(ruim, (r) => 1 - r), N);
  const pode = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    if (!alvo[k]) continue;
    pode[k] =
      spt[k] *
      suave(0, p.listras.rampaForaDoSpcKm, doDentro[k] * passoKm) *
      suave(0, p.listras.rampaDoMedidoKm, doBom[k] * passoKm);
  }
  const campo = Float32Array.from(largo, (v, k) => v + colcha.fino[k]);
  const listras = medido
    ? cortaListras({ campo, pode, plano, tracos, medido, p, sorteia })
    : { corte: new Float32Array(n), corredor: new Uint8Array(n), base: [] };
  // a diferença a somar no que se troca: ruim, fora do núcleo, pelo peso do preenchimento
  const delta = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    if (!ruim[k] || nucleo[k] || !(preenche[k] > 0)) continue;
    delta[k] = preenche[k] * (campo[k] + listras.corte[k] - cur[k]);
  }
  const saida = Float32Array.from(metros);
  const ateLat = p.ateGraus - 90;
  for (let j = 0; j < Hf; j += 1) {
    const lat = latitudeDaLinha(j, Hf) / RADIANOS;
    if (lat > ateLat) continue;
    const jw = Math.min(H - 1, Math.floor(((j + 0.5) * H) / Hf));
    for (let i = 0; i < Wf; i += 1) {
      const kw = jw * W + Math.min(W - 1, Math.floor(((i + 0.5) * W) / Wf));
      if (qualidade[kw] === 0 || mascaras.nucleo[kw]) continue;
      const [u, v] = noPlanoPolar(lat, longitudeDaColuna(i, Wf), raioKm);
      const d = noPlanoPolarBilinear(delta, N, celula(plano, u), celula(plano, v));
      if (Number.isFinite(d)) saida[j * Wf + i] = metros[j * Wf + i] + d;
    }
  }
  // a cobertura e o peso da partilha na grade de trabalho
  const novaCobertura = Uint8Array.from(cobertura);
  const pesoDoSpc = Float32Array.from(mascaras.peso);
  let alvoKm2 = 0;
  for (let j = 0; j < H; j += 1) {
    const lat = latitudeDaLinha(j, H) / RADIANOS;
    if (lat > ateLat) continue;
    for (let i = 0; i < W; i += 1) {
      const kw = j * W + i;
      if (qualidade[kw] === 0 || mascaras.nucleo[kw]) continue;
      if (mascaras.dentro[kw] && mascaras.peso[kw] >= p.retalho.pesoLivre) {
        pesoDoSpc[kw] = 1;
        continue;
      }
      pesoDoSpc[kw] = 0;
      const [u, v] = noPlanoPolar(lat, longitudeDaColuna(i, W), raioKm);
      const [x, y] = [Math.round(celula(plano, u)), Math.round(celula(plano, v))];
      if (x < 0 || y < 0 || x >= N || y >= N) continue;
      const k = y * N + x;
      if (listras.corredor[k]) novaCobertura[kw] = 2;
      else if (preenche[k] >= 0.5) novaCobertura[kw] = EXEMPLO_DO_SPC;
    }
  }
  for (let k = 0; k < n; k += 1) if (alvo[k]) alvoKm2 += passoKm * passoKm;
  return {
    metros: saida,
    cobertura: novaCobertura,
    pesoDoSpc,
    plano: { antes: cur, delta, alvo, spt, preenche, fino: colcha.fino, largo, corte: listras.corte, tracos, medido },
    relatorio: {
      corteKm: p.corteKm,
      alvoKm2,
      origens: origens.length,
      desvioDoRumoGraus: +((desvio * 180) / Math.PI).toFixed(1),
      concordanciaDoRumo: +(Math.hypot(dc, ds) / dn).toFixed(2),
      asperezaPelaFoto: { r: +ajuste.r.toFixed(2), inclinacao: +ajuste.b.toFixed(2) },
      retalhos: colcha.retalhos.length,
      erroMediano: [...colcha.retalhos.map((r) => r.erro)].sort((a, b) => a - b)[colcha.retalhos.length >> 1],
      listras: medido && {
        fatias: medido.fatias,
        porTraco: medido.porTraco,
        sulcoM: Math.round(medido.sulcoM),
        sulcoDaFatiaM: Math.round(medido.sulcoDaFatiaM),
        cristaM: Math.round(medido.cristaM),
        cristaACristaKm: +medido.cristaACristaKm.toFixed(1),
        larguraKm: +medido.larguraKm.toFixed(1),
        presente: listras.base.map((b) => (b ? Math.round(profundidadeDaFatia(b, passoKm, p).sulco) : null)),
      },
      retalhosDetalhe: colcha.retalhos,
    },
  };
}
