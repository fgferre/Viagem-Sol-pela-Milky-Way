#!/usr/bin/env node
// ============================================================
// RELEVO E COR DE HIPÉRION — receita reprodutível das 3 imagens-FONTE
// que dão a Hipérion o mesmo tratamento de Mimas: deslocamento de vértice
// por mapa de ALTURA, luz por mapa de NORMAL, cor por mapa de COR — na
// convenção de mapas da casa.
//
// FONTES:
//   1. FORMA MEDIDA — Thomas, P., Joseph, J. & Ansty, T. (2018), "Saturn
//      Small Moon Shape Models V1.0" (Cassini ISS), PDS4,
//      DOI 10.26033/ewy3-jy61 — DOMÍNIO PÚBLICO.
//      https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/data/hyperion_30k_plt.tab
//      (14.636 vértices, 29.268 facetas.)
//   2. COR — uma pintura de IA (ILUSTRAÇÃO, não medição): dá a cor e,
//      por detecção de manchas escuras, os poços que viram cratera no
//      relevo. Nem a cor nem os poços são dado observacional.
//
// CONVENÇÃO LOCAL DA MALHA (mesma de `pilotoHiperionForma.ts`/`esculpido.ts`
// no branch piloto-hiperion, não versionada aqui): eixos principais a
// partir do centroide de VOLUME — X = eixo mais comprido, Y = intermediário
// (é o POLO da grade), Z = mais curto, destros; longitude da GRADE
// λ_grade = atan2(z,x), latitude lat = asin(y); raio normalizado por
// 135 km (raio médio de catálogo que a casa usa para Hipérion).
//
// CONVENÇÃO DA CASA (`src/three/world/corpos/orientacaoNaCena.ts:142`):
// mapas equiretangulares, u = λ/360 + 0,5 (Greenwich no centro), linha 0 =
// norte; a direção local de (λ leste, lat) é
//     (cos lat·cos λ, sin lat, −cos lat·sin λ).
// É o ESPELHO da grade (λ_grade = −λ: grade tem +Z em λ_grade=+90°, casa
// tem +Z em λ=−90°) — por isso todo valor sai daqui avaliado POR DIREÇÃO
// (grade e crateras na direção `d`, cor no (atan2, asin) de `d` dentro da
// SUA PRÓPRIA imagem), nunca por espelhamento manual de índice de coluna.
//
// USO:
//   node relevo-e-cor-de-hiperion.mjs [--tab <arquivo.tab>] [--cor <png>]
//     [--saida <diretório>] [--alinhamento <jpg>] [--limiar <num>]
//     [--pocos <json>]
//
// Sem --tab, baixa da URL do PDS acima (cache em $TMPDIR). Sem --cor, usa
// <saida>/hyperion-ia-original.png (a cópia que uma corrida anterior já
// deixou — permite reproduzir só com o que já está versionado). Sem
// --saida, escreve em ./fonte ao lado deste script. --alinhamento é
// opcional: se dado, escreve ali um JPEG de 1200px (hillshade da altura
// sobre a cor) só para conferência visual — não é uma das 4 saídas.
//
// POÇOS (crateras): por padrão, `detectaPocos`, abaixo, roda sobre --cor a
// cada chamada — a mesma detecção multi-escala usada no piloto (branch
// piloto-hiperion), portada para rodar em memória em vez de escrever
// direto no repositório; é o caminho que torna a receita reprodutível só
// de --tab + --cor. Ela É sensível ao limiar de aceitação (--limiar), que
// o piloto ajustou olhando o resultado e não deixou registrado — por isso
// --pocos aceita uma lista JÁ VALIDADA (mesmo formato de
// `hyperion-pocos.json`, `{crateras: [[x,y,z,raio,fundura,borda,escuridao],
// ...]}`) e pula a detecção quando dada, para reproduzir byte a byte um
// relevo já conferido.
//
// A FONTE DOS POÇOS DESTA CASA é `fonte/hyperion-pocos.json` — os 3.488
// aprovados no piloto (branch piloto-hiperion). A detecção embutida acima,
// no limiar padrão (`--limiar 0.010`), acha 5.175 e NÃO reproduz essa
// lista; rode com `--pocos fonte/hyperion-pocos.json` para repetir o
// relevo já conferido.
// ============================================================

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_DO_REPO = 'file:///Users/fgferre/Github/Viagem-Sol-pela-Milky-Way/';

// `sharp` é devDependency do REPOSITÓRIO; resolve contra o node_modules
// dele porque este script pode rodar de um rascunho fora da árvore
// (mesmo truque de `converte-hiperion.mjs`/`gradua-cor.mjs`).
const requireDoRepo = createRequire(new URL('package.json', RAIZ_DO_REPO));
const sharp = requireDoRepo('sharp');
// `assaNormais` é puro (sem efeito colateral no import — o `main` do
// módulo só roda quando ele é o arquivo executado diretamente).
const { assaNormais } = await import(
  new URL('scripts/data/atlas/gera-normal-de-dem.mjs', RAIZ_DO_REPO).href
);

console.time('total');

// ------------------------------------------------------------
// CLI
// ------------------------------------------------------------
const argv = process.argv.slice(2);
function argValor(nome, padrao) {
  const i = argv.indexOf(`--${nome}`);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : padrao;
}

const URL_TAB =
  'https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/data/hyperion_30k_plt.tab';
const CAMINHO_SAIDA = path.resolve(argValor('saida', path.join(AQUI, 'fonte')));
const CAMINHO_COR = path.resolve(
  argValor('cor', path.join(CAMINHO_SAIDA, 'hyperion-ia-original.png'))
);
const CAMINHO_ALINHAMENTO = argValor('alinhamento', null);
const LIMIAR_POCOS = Number(argValor('limiar', '0.010'));
// `--pocos <json>`: usa uma lista de crateras JÁ VALIDADA (mesmo formato de
// `hyperion-pocos.json`) em vez de detectar de novo — a detecção (abaixo)
// fica disponível para reproduzir do zero, mas uma lista conhecida evita
// depender do limiar exato (não documentado) que gerou uma lista aceita.
const CAMINHO_POCOS = argValor('pocos', null);

const CAMINHO_TAB_CACHE = path.join(os.tmpdir(), 'hyperion_30k_plt.tab');
let caminhoTab = argValor('tab', null);
if (!caminhoTab) {
  if (!existsSync(CAMINHO_TAB_CACHE)) {
    console.log(`baixando forma medida de ${URL_TAB} ...`);
    const resposta = await fetch(URL_TAB);
    if (!resposta.ok) throw new Error(`download da forma medida falhou: HTTP ${resposta.status}`);
    writeFileSync(CAMINHO_TAB_CACHE, Buffer.from(await resposta.arrayBuffer()));
  }
  caminhoTab = CAMINHO_TAB_CACHE;
}
if (!existsSync(CAMINHO_COR)) {
  throw new Error(`sem imagem de cor da IA em ${CAMINHO_COR} — passe --cor <png>.`);
}
console.log(`tab: ${caminhoTab}`);
console.log(`cor: ${CAMINHO_COR}`);
console.log(`saída: ${CAMINHO_SAIDA}`);

const RAIO_MEDIO_KM = 135; // raio médio de catálogo que a casa usa para Hipérion
const GRAUS = 180 / Math.PI;
const DEG_PARA_RAD = Math.PI / 180;

// ------------------------------------------------------------
// 1. FORMA MEDIDA — parser do .tab, volume/centroide, eixos principais
//    (PCA por Jacobi ponderada por área), grade radial 512×256 por
//    interseção raio-triângulo. Porta fiel de `converte-hiperion.mjs`
//    (fora do repositório, usado uma vez para o piloto).
// ------------------------------------------------------------
console.log('lendo forma medida...');
const textoTab = readFileSync(caminhoTab, 'utf8');
const linhasTab = textoTab.split(/\r?\n/);
let cursorTab = 0;
function proximaLinhaNaoVazia() {
  while (cursorTab < linhasTab.length && linhasTab[cursorTab].trim() === '') cursorTab++;
  return linhasTab[cursorTab++];
}
const [nVertices, nFacetas] = proximaLinhaNaoVazia().trim().split(/\s+/).map(Number);
const vx = new Float64Array(nVertices);
const vy = new Float64Array(nVertices);
const vz = new Float64Array(nVertices);
for (let i = 0; i < nVertices; i++) {
  const p = proximaLinhaNaoVazia().trim().split(/\s+/).map(Number);
  vx[i] = p[0];
  vy[i] = p[1];
  vz[i] = p[2];
}
const fa = new Int32Array(nFacetas);
const fb = new Int32Array(nFacetas);
const fc = new Int32Array(nFacetas);
for (let i = 0; i < nFacetas; i++) {
  const p = proximaLinhaNaoVazia().trim().split(/\s+/).map(Number);
  fa[i] = p[0];
  fb[i] = p[1];
  fc[i] = p[2];
}
console.log(`  vértices: ${nVertices}, facetas: ${nFacetas}`);

// volume + centroide (tetraedros a partir da origem)
let v6 = 0,
  cxAcc = 0,
  cyAcc = 0,
  czAcc = 0;
for (let i = 0; i < nFacetas; i++) {
  const ia = fa[i],
    ib = fb[i],
    ic = fc[i];
  const ax = vx[ia],
    ay = vy[ia],
    az = vz[ia];
  const bx = vx[ib],
    by = vy[ib],
    bz = vz[ib];
  const cx = vx[ic],
    cy = vy[ic],
    cz = vz[ic];
  const t6 = ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  v6 += t6;
  cxAcc += t6 * (ax + bx + cx);
  cyAcc += t6 * (ay + by + cy);
  czAcc += t6 * (az + bz + cz);
}
const centroide = { x: cxAcc / (4 * v6), y: cyAcc / (4 * v6), z: czAcc / (4 * v6) };

// eixos principais: covariância ponderada por área + Jacobi
function autovaloresEVetoresJacobi(matriz) {
  const n = 3;
  const a = matriz.map((linha) => linha.slice());
  const vet = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let sweep = 0; sweep < 100; sweep++) {
    let foraDaDiagonal = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) foraDaDiagonal += a[i][j] * a[i][j];
    if (foraDaDiagonal < 1e-24) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const sinalTheta = theta >= 0 ? 1 : -1;
        const t = sinalTheta / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        const app = a[p][p],
          aqq = a[q][q],
          apq = a[p][q];
        a[p][p] = app - t * apq;
        a[q][q] = aqq + t * apq;
        a[p][q] = 0;
        a[q][p] = 0;
        for (let i = 0; i < n; i++) {
          if (i !== p && i !== q) {
            const aip = a[i][p],
              aiq = a[i][q];
            a[i][p] = a[p][i] = c * aip - s * aiq;
            a[i][q] = a[q][i] = s * aip + c * aiq;
          }
        }
        for (let i = 0; i < n; i++) {
          const vip = vet[i][p],
            viq = vet[i][q];
          vet[i][p] = c * vip - s * viq;
          vet[i][q] = s * vip + c * viq;
        }
      }
    }
  }
  const autovalores = [a[0][0], a[1][1], a[2][2]];
  const autovetores = [0, 1, 2].map((k) => ({ x: vet[0][k], y: vet[1][k], z: vet[2][k] }));
  return { autovalores, autovetores };
}

let Sxx = 0,
  Syy = 0,
  Szz = 0,
  Sxy = 0,
  Sxz = 0,
  Syz = 0,
  areaTotal = 0;
for (let i = 0; i < nFacetas; i++) {
  const ia = fa[i],
    ib = fb[i],
    ic = fc[i];
  const ax = vx[ia] - centroide.x,
    ay = vy[ia] - centroide.y,
    az = vz[ia] - centroide.z;
  const bx = vx[ib] - centroide.x,
    by = vy[ib] - centroide.y,
    bz = vz[ib] - centroide.z;
  const cx = vx[ic] - centroide.x,
    cy = vy[ic] - centroide.y,
    cz = vz[ic] - centroide.z;
  const e1x = bx - ax,
    e1y = by - ay,
    e1z = bz - az;
  const e2x = cx - ax,
    e2y = cy - ay,
    e2z = cz - az;
  const crx = e1y * e2z - e1z * e2y;
  const cry = e1z * e2x - e1x * e2z;
  const crz = e1x * e2y - e1y * e2x;
  const area = 0.5 * Math.hypot(crx, cry, crz);
  const tx = (ax + bx + cx) / 3,
    ty = (ay + by + cy) / 3,
    tz = (az + bz + cz) / 3;
  Sxx += area * tx * tx;
  Syy += area * ty * ty;
  Szz += area * tz * tz;
  Sxy += area * tx * ty;
  Sxz += area * tx * tz;
  Syz += area * ty * tz;
  areaTotal += area;
}
Sxx /= areaTotal;
Syy /= areaTotal;
Szz /= areaTotal;
Sxy /= areaTotal;
Sxz /= areaTotal;
Syz /= areaTotal;

const { autovalores, autovetores } = autovaloresEVetoresJacobi([
  [Sxx, Sxy, Sxz],
  [Sxy, Syy, Syz],
  [Sxz, Syz, Szz],
]);
const ordem = [0, 1, 2].sort((i, j) => autovalores[j] - autovalores[i]);
let eixoX = autovetores[ordem[0]];
let eixoY = autovetores[ordem[1]];
if (eixoX.x < 0) eixoX = { x: -eixoX.x, y: -eixoX.y, z: -eixoX.z };
if (eixoY.y < 0) eixoY = { x: -eixoY.x, y: -eixoY.y, z: -eixoY.z };
const eixoZ = {
  x: eixoX.y * eixoY.z - eixoX.z * eixoY.y,
  y: eixoX.z * eixoY.x - eixoX.x * eixoY.z,
  z: eixoX.x * eixoY.y - eixoX.y * eixoY.x,
};

function pontoLocal(x, y, z) {
  const dx = x - centroide.x,
    dy = y - centroide.y,
    dz = z - centroide.z;
  return {
    x: dx * eixoX.x + dy * eixoX.y + dz * eixoX.z,
    y: dx * eixoY.x + dy * eixoY.y + dz * eixoY.z,
    z: dx * eixoZ.x + dy * eixoZ.y + dz * eixoZ.z,
  };
}

const localX = new Float64Array(nVertices);
const localY = new Float64Array(nVertices);
const localZ = new Float64Array(nVertices);
for (let i = 0; i < nVertices; i++) {
  const p = pontoLocal(vx[i], vy[i], vz[i]);
  localX[i] = p.x;
  localY[i] = p.y;
  localZ[i] = p.z;
}

// grade radial 512×256 (convenção NATURAL da malha: lon=atan2(z,x),
// lat=asin(y)) por interseção raio-triângulo, com balde de culling.
const NX = 512;
const NY = 256;
const PAD_DEG = 1.5;

function lonLatDe(x, y, z) {
  const r = Math.hypot(x, y, z);
  const lon = Math.atan2(z, x) * GRAUS;
  const lat = Math.asin(Math.max(-1, Math.min(1, y / r))) * GRAUS;
  return [lon, lat];
}
function idxLonFrac(lonGraus) {
  return ((lonGraus + 180) / 360) * NX - 0.5;
}
function idxLatFrac(latGraus) {
  return ((latGraus + 90) / 180) * NY - 0.5;
}

const balde = new Array(NX * NY);
for (let k = 0; k < balde.length; k++) balde[k] = [];

for (let i = 0; i < nFacetas; i++) {
  const ia = fa[i],
    ib = fb[i],
    ic = fc[i];
  const [lon0, lat0] = lonLatDe(localX[ia], localY[ia], localZ[ia]);
  const [lon1, lat1] = lonLatDe(localX[ib], localY[ib], localZ[ib]);
  const [lon2, lat2] = lonLatDe(localX[ic], localY[ic], localZ[ic]);
  let lons = [lon0, lon1, lon2];
  const lats = [lat0, lat1, lat2];
  const latMinBruto = Math.min(...lats);
  const latMaxBruto = Math.max(...lats);
  if (Math.max(...lons) - Math.min(...lons) > 180) {
    lons = lons.map((l) => (l < 0 ? l + 360 : l));
  }
  let lonMin = Math.min(...lons) - PAD_DEG;
  let lonMax = Math.max(...lons) + PAD_DEG;
  const latMin = Math.max(-90, latMinBruto - PAD_DEG);
  const latMax = Math.min(90, latMaxBruto + PAD_DEG);
  const lonCheia = latMax >= 89 || latMin <= -89;

  const jMin = Math.max(0, Math.floor(idxLatFrac(latMin)));
  const jMax = Math.min(NY - 1, Math.ceil(idxLatFrac(latMax)));
  if (lonCheia) {
    for (let j = jMin; j <= jMax; j++) {
      for (let ii = 0; ii < NX; ii++) balde[j * NX + ii].push(i);
    }
    continue;
  }
  const iMinF = Math.floor(idxLonFrac(lonMin));
  const iMaxF = Math.ceil(idxLonFrac(lonMax));
  for (let j = jMin; j <= jMax; j++) {
    for (let ii = iMinF; ii <= iMaxF; ii++) {
      const col = ((ii % NX) + NX) % NX;
      balde[j * NX + col].push(i);
    }
  }
}

function intersectaRaioTriangulo(dx, dy, dz, ax, ay, az, bx, by, bz, cx, cy, cz) {
  const e1x = bx - ax,
    e1y = by - ay,
    e1z = bz - az;
  const e2x = cx - ax,
    e2y = cy - ay,
    e2z = cz - az;
  const px = dy * e2z - dz * e2y;
  const py = dz * e2x - dx * e2z;
  const pz = dx * e2y - dy * e2x;
  const det = e1x * px + e1y * py + e1z * pz;
  if (Math.abs(det) < 1e-12) return null;
  const invDet = 1 / det;
  const tx = -ax,
    ty = -ay,
    tz = -az;
  const u = (tx * px + ty * py + tz * pz) * invDet;
  if (u < 0 || u > 1) return null;
  const qx = ty * e1z - tz * e1y,
    qy = tz * e1x - tx * e1z,
    qz = tx * e1y - ty * e1x;
  const v = (dx * qx + dy * qy + dz * qz) * invDet;
  if (v < 0 || u + v > 1) return null;
  const t = (e2x * qx + e2y * qy + e2z * qz) * invDet;
  return t;
}
function testaFacetas(dx, dy, dz, listaDeFacetas) {
  let melhor = -Infinity;
  let hits = 0;
  for (const i of listaDeFacetas) {
    const ia = fa[i],
      ib = fb[i],
      ic = fc[i];
    const t = intersectaRaioTriangulo(
      dx,
      dy,
      dz,
      localX[ia],
      localY[ia],
      localZ[ia],
      localX[ib],
      localY[ib],
      localZ[ib],
      localX[ic],
      localY[ic],
      localZ[ic]
    );
    if (t !== null && t > 1e-6) {
      hits++;
      if (t > melhor) melhor = t;
    }
  }
  return { melhor, hits };
}

const todasAsFacetas = Array.from({ length: nFacetas }, (_, i) => i);
const rKm = new Float64Array(NX * NY);
let raiosComZeroHits = 0;
for (let j = 0; j < NY; j++) {
  const phiDeg = -90 + (j + 0.5) * (180 / NY);
  const phi = phiDeg / GRAUS;
  for (let i = 0; i < NX; i++) {
    const lonDeg = -180 + (i + 0.5) * (360 / NX);
    const lon = lonDeg / GRAUS;
    const dx = Math.cos(phi) * Math.cos(lon);
    const dy = Math.sin(phi);
    const dz = Math.cos(phi) * Math.sin(lon);
    let { melhor, hits } = testaFacetas(dx, dy, dz, balde[j * NX + i]);
    if (hits === 0) ({ melhor, hits } = testaFacetas(dx, dy, dz, todasAsFacetas));
    if (hits === 0) raiosComZeroHits++;
    rKm[j * NX + i] = melhor;
  }
}
console.log(`  raios com 0 hits: ${raiosComZeroHits} (tem de ser 0)`);

let rMinGrade = Infinity,
  rMaxGrade = -Infinity;
const rNormGrade = new Float64Array(NX * NY);
for (let k = 0; k < rKm.length; k++) {
  const r = rKm[k] / RAIO_MEDIO_KM;
  rNormGrade[k] = r;
  if (r < rMinGrade) rMinGrade = r;
  if (r > rMaxGrade) rMaxGrade = r;
}
const qGrade = new Uint16Array(NX * NY);
for (let k = 0; k < rNormGrade.length; k++) {
  qGrade[k] = Math.round(((rNormGrade[k] - rMinGrade) / (rMaxGrade - rMinGrade)) * 65535);
}
console.log(
  `  grade medida 512×256: rMin=${rMinGrade.toFixed(6)} rMax=${rMaxGrade.toFixed(6)} (unidades de 135 km)`
);

/**
 * Porta fiel de `raioMedidoDoHiperion` (`pilotoHiperionForma.ts`, branch
 * piloto-hiperion): bilinear com wrap em longitude e clamp em latitude.
 */
function raioMedidoDoHiperion(p) {
  const r = Math.hypot(p.x, p.y, p.z) || 1;
  const lat = Math.asin(Math.max(-1, Math.min(1, p.y / r)));
  const lon = Math.atan2(p.z / r, p.x / r);
  const u = ((lon * GRAUS + 180) / 360) * NX - 0.5;
  const v = ((lat * GRAUS + 90) / 180) * NY - 0.5;
  const i0 = Math.floor(u);
  const j0Bruto = Math.floor(v);
  const fu = u - i0;
  const fv = v - j0Bruto;
  const j0 = Math.max(0, Math.min(NY - 1, j0Bruto));
  const j1 = Math.max(0, Math.min(NY - 1, j0Bruto + 1));
  const i0c = ((i0 % NX) + NX) % NX;
  const i1c = (((i0 + 1) % NX) + NX) % NX;
  const amostra = (i, j) => qGrade[j * NX + i];
  const q0 = amostra(i0c, j0) + (amostra(i1c, j0) - amostra(i0c, j0)) * fu;
  const q1 = amostra(i0c, j1) + (amostra(i1c, j1) - amostra(i0c, j1)) * fu;
  const qv = q0 + (q1 - q0) * fv;
  return rMinGrade + (qv / 65535) * (rMaxGrade - rMinGrade);
}

// ------------------------------------------------------------
// 2. POÇOS ESCUROS → CRATERAS — porta fiel de `detecta-pocos.mjs` (fora
//    do repositório), rodando em memória sobre --cor a cada chamada.
//    Blob detection multi-escala: DoG sobre log-luminância, normalizado
//    pelo desvio-padrão local (janela 3× a escala do blob), sigma
//    1,5–24px ×1,25, |lat|<=72°.
// ------------------------------------------------------------
if (!CAMINHO_POCOS) console.log('detectando poços escuros em', CAMINHO_COR, '...');
function sRGBparaLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
const TABELA_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) TABELA_LINEAR[i] = sRGBparaLinear(i);

function detectaPocos(data, W, H, CH, limiar) {
  const luz = new Float32Array(W * H);
  for (let p = 0, i = 0; p < W * H; p++, i += CH) {
    const r = TABELA_LINEAR[data[i]];
    const g = TABELA_LINEAR[data[i + 1]];
    const b = TABELA_LINEAR[data[i + 2]];
    luz[p] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  const EPS_LOG = Number(process.env.EPS_LOG || 0.0012);
  const luzLog = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) luzLog[p] = Math.log(luz[p] + EPS_LOG);

  function tamanhosDaCaixa(sigma, n) {
    const wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
    let wl = Math.floor(wIdeal);
    if (wl % 2 === 0) wl -= 1;
    const wu = wl + 2;
    const mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
    const m = Math.round(mIdeal);
    const tamanhos = [];
    for (let i = 0; i < n; i++) tamanhos.push(i < m ? wl : wu);
    return tamanhos;
  }
  function boxBlurH(src, dst, w, h, r) {
    if (r <= 0) {
      dst.set(src);
      return;
    }
    const inv = 1 / (2 * r + 1);
    for (let y = 0; y < h; y++) {
      const linha = y * w;
      let soma = 0;
      for (let x = -r; x <= r; x++) soma += src[linha + (((x % w) + w) % w)];
      for (let x = 0; x < w; x++) {
        dst[linha + x] = soma * inv;
        const sai = (((x - r) % w) + w) % w;
        const entra = (((x + r + 1) % w) + w) % w;
        soma += src[linha + entra] - src[linha + sai];
      }
    }
  }
  function boxBlurV(src, dst, w, h, r) {
    if (r <= 0) {
      dst.set(src);
      return;
    }
    const inv = 1 / (2 * r + 1);
    for (let x = 0; x < w; x++) {
      let soma = 0;
      for (let y = -r; y <= r; y++) soma += src[Math.max(0, Math.min(h - 1, y)) * w + x];
      for (let y = 0; y < h; y++) {
        dst[y * w + x] = soma * inv;
        const sai = Math.max(0, Math.min(h - 1, y - r));
        const entra = Math.max(0, Math.min(h - 1, y + r + 1));
        soma += src[entra * w + x] - src[sai * w + x];
      }
    }
  }
  function borraGaussiana(src, sigma) {
    const [r1, r2, r3] = tamanhosDaCaixa(sigma, 3).map((w) => (w - 1) / 2);
    const a = new Float32Array(src.length);
    const b = new Float32Array(src.length);
    boxBlurH(src, a, W, H, r1);
    boxBlurV(a, b, W, H, r1);
    boxBlurH(b, a, W, H, r2);
    boxBlurV(a, b, W, H, r2);
    boxBlurH(b, a, W, H, r3);
    boxBlurV(a, b, W, H, r3);
    return b;
  }

  const SIGMA_MIN = 1.5,
    SIGMA_MAX = 24,
    PASSO = 1.25;
  const sigmas = [];
  for (let s = SIGMA_MIN; s <= SIGMA_MAX + 1e-9; s *= PASSO) sigmas.push(s);

  const borrados = sigmas.map((s) => borraGaussiana(luzLog, s));

  const dog = [];
  const sigmaEfetivo = [];
  for (let i = 0; i < sigmas.length - 1; i++) {
    const d = new Float32Array(W * H);
    const a = borrados[i],
      b = borrados[i + 1];
    for (let p = 0; p < W * H; p++) d[p] = b[p] - a[p];
    dog.push(d);
    sigmaEfetivo.push(Math.sqrt(sigmas[i] * sigmas[i + 1]));
  }

  const EPS_STD = Number(process.env.EPS_STD || 0.05);
  const luzLogSq = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) luzLogSq[p] = luzLog[p] * luzLog[p];
  for (let i = 0; i < dog.length; i++) {
    const sigmaJanela = 3 * sigmaEfetivo[i];
    const media = borraGaussiana(luzLog, sigmaJanela);
    const mediaSq = borraGaussiana(luzLogSq, sigmaJanela);
    const d = dog[i];
    for (let p = 0; p < W * H; p++) {
      const variancia = Math.max(0, mediaSq[p] - media[p] * media[p]);
      d[p] = d[p] / (Math.sqrt(variancia) + EPS_STD);
    }
  }

  function linhaDaLat(latGraus) {
    return (90 - latGraus) * (H / 180) - 0.5;
  }
  const linMinValida = Math.max(1, Math.ceil(linhaDaLat(72)));
  const linMaxValida = Math.min(H - 2, Math.floor(linhaDaLat(-72)));

  const candidatos = [];
  for (let i = 1; i < dog.length - 1; i++) {
    const abaixo = dog[i - 1],
      meio = dog[i],
      acima = dog[i + 1];
    for (let y = linMinValida; y <= linMaxValida; y++) {
      const linha = y * W;
      const linhaCima = (y - 1) * W;
      const linhaBaixo = (y + 1) * W;
      for (let x = 0; x < W; x++) {
        const v = meio[linha + x];
        if (v <= limiar) continue;
        const xm = ((x - 1) % W + W) % W;
        const xp = (x + 1) % W;
        let maximo = true;
        for (const camada of [abaixo, meio, acima]) {
          for (const ly of [linhaCima, linha, linhaBaixo]) {
            for (const lx of [xm, x, xp]) {
              if (camada === meio && lx === x && ly === linha) continue;
              if (camada[ly + lx] > v) {
                maximo = false;
                break;
              }
            }
            if (!maximo) break;
          }
          if (!maximo) break;
        }
        if (maximo) candidatos.push({ x, y, i, v });
      }
    }
  }

  function amostraBilinear(campo, x, y) {
    const x0 = Math.floor(x),
      y0 = Math.max(0, Math.min(H - 1, Math.floor(y)));
    const y1 = Math.max(0, Math.min(H - 1, y0 + 1));
    const fx = x - x0,
      fy = y - Math.floor(y);
    const x0c = ((x0 % W) + W) % W,
      x1c = (((x0 + 1) % W) + W) % W;
    const v00 = campo[y0 * W + x0c],
      v10 = campo[y0 * W + x1c];
    const v01 = campo[y1 * W + x0c],
      v11 = campo[y1 * W + x1c];
    return v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;
  }
  function contrasteEscuridao(cx, cy, sigma) {
    const passo = Math.max(1, Math.floor(sigma / 6));
    const rDisco = Math.max(1, sigma * 0.6);
    const rInterna = sigma * 1.3,
      rExterna = sigma * 2.4;
    let somaDisco = 0,
      nDisco = 0,
      somaAnel = 0,
      nAnel = 0;
    const alcance = Math.ceil(rExterna);
    for (let dy = -alcance; dy <= alcance; dy += passo) {
      for (let dx = -alcance; dx <= alcance; dx += passo) {
        const d = Math.hypot(dx, dy);
        if (d > rExterna) continue;
        const valor = amostraBilinear(luz, cx + dx, cy + dy);
        if (d <= rDisco) {
          somaDisco += valor;
          nDisco++;
        } else if (d >= rInterna) {
          somaAnel += valor;
          nAnel++;
        }
      }
    }
    const mediaDisco = nDisco ? somaDisco / nDisco : 0;
    const mediaAnel = nAnel ? somaAnel / nAnel : mediaDisco;
    const e = mediaAnel > 1e-5 ? (mediaAnel - mediaDisco) / mediaAnel : 0;
    return Math.max(0, Math.min(1, e));
  }

  const brutas = candidatos.map((c) => {
    const sigma = sigmaEfetivo[c.i];
    const lonGraus = -180 + (c.x + 0.5) * (360 / W);
    const latGraus = 90 - (c.y + 0.5) * (180 / H);
    const lon = (lonGraus * Math.PI) / 180;
    const lat = (latGraus * Math.PI) / 180;
    const cx = Math.cos(lat) * Math.cos(lon);
    const cy = Math.sin(lat);
    const cz = Math.cos(lat) * Math.sin(lon);
    const raioAngular = Math.SQRT2 * sigma * (Math.PI / H);
    const e = contrasteEscuridao(c.x, c.y, sigma);
    return { cx, cy, cz, raio: raioAngular, v: c.v, e };
  });

  const filtradasPorRaio = brutas.filter((b) => b.raio >= 0.012);
  for (const b of filtradasPorRaio) b.raio = Math.min(0.07, b.raio);

  filtradasPorRaio.sort((a, b) => b.v - a.v);
  const aceitas = [];
  for (const cand of filtradasPorRaio) {
    let duplicata = false;
    for (const outra of aceitas) {
      const corda = Math.sqrt(
        Math.max(0, 2 * (1 - (cand.cx * outra.cx + cand.cy * outra.cy + cand.cz * outra.cz)))
      );
      const razaoEscala = cand.raio > outra.raio ? cand.raio / outra.raio : outra.raio / cand.raio;
      if (corda < 0.5 * (cand.raio + outra.raio) && razaoEscala < 1.6) {
        duplicata = true;
        break;
      }
    }
    if (!duplicata) aceitas.push(cand);
  }

  function f(r) {
    if (r <= 0.03) return 1;
    if (r >= 0.07) return 0.3;
    return 1 - 0.7 * ((r - 0.03) / 0.04);
  }
  return aceitas.map((a) => {
    const raio = a.raio;
    const fundura = 0.42 * raio * f(raio) * (0.7 + 0.6 * a.e);
    const borda = 0.045 * raio;
    const escuridao = 0.5 + 0.5 * a.e;
    const arred = (n) => Math.round(n * 1e5) / 1e5;
    return [arred(a.cx), arred(a.cy), arred(a.cz), arred(raio), arred(fundura), arred(borda), arred(escuridao)];
  });
}

let crateraArrays;
if (CAMINHO_POCOS) {
  console.log(`  usando lista de poços já validada: ${CAMINHO_POCOS}`);
  crateraArrays = JSON.parse(readFileSync(CAMINHO_POCOS, 'utf8')).crateras;
} else {
  const { data: dataCor, info: infoCor } = await sharp(CAMINHO_COR)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  crateraArrays = detectaPocos(dataCor, infoCor.width, infoCor.height, infoCor.channels, LIMIAR_POCOS);
}
console.log(`  crateras: ${crateraArrays.length}`);
const crateras = crateraArrays.map(([x, y, z, raio, fundura, borda, escuridao]) => ({
  centro: { x, y, z },
  raio,
  fundura,
  borda,
  escuridao,
}));

// balde de crateras (mesmo de `esculpido.ts`) — consulta de 1 célula só
const BALDE_LON = 64,
  BALDE_LAT = 32;
function celulaDoBalde(x, y, z) {
  const r = Math.hypot(x, y, z) || 1;
  const lat = Math.asin(Math.max(-1, Math.min(1, y / r)));
  const lon = Math.atan2(z / r, x / r);
  const colBruta = Math.floor(((lon + Math.PI) / (2 * Math.PI)) * BALDE_LON);
  const col = ((colBruta % BALDE_LON) + BALDE_LON) % BALDE_LON;
  const lin = Math.max(0, Math.min(BALDE_LAT - 1, Math.floor(((lat + Math.PI / 2) / Math.PI) * BALDE_LAT)));
  return [col, lin];
}
function celulasTocadasPelaTampa(x, y, z, raioChord) {
  const r = Math.hypot(x, y, z) || 1;
  const latC = Math.asin(Math.max(-1, Math.min(1, y / r)));
  const lonC = Math.atan2(z / r, x / r);
  const theta = 2 * Math.asin(Math.max(0, Math.min(1, raioChord / 2)));
  const folga = theta * 0.25 + (2 * Math.PI) / BALDE_LAT;
  const thetaComFolga = theta + folga;
  const latMin = Math.max(-Math.PI / 2, latC - thetaComFolga);
  const latMax = Math.min(Math.PI / 2, latC + thetaComFolga);
  const linMin = Math.max(0, Math.floor(((latMin + Math.PI / 2) / Math.PI) * BALDE_LAT));
  const linMax = Math.min(BALDE_LAT - 1, Math.ceil(((latMax + Math.PI / 2) / Math.PI) * BALDE_LAT));
  const tocaPoloNorte = latMax >= Math.PI / 2 - 1e-6;
  const tocaPoloSul = latMin <= -Math.PI / 2 + 1e-6;
  const saida = [];
  for (let lin = linMin; lin <= linMax; lin++) {
    if ((tocaPoloNorte && lin === BALDE_LAT - 1) || (tocaPoloSul && lin === 0)) {
      for (let col = 0; col < BALDE_LON; col++) saida.push([col, lin]);
      continue;
    }
    const latExtrema = Math.min(Math.abs(latC) + thetaComFolga, Math.PI / 2 - 1e-3);
    const cosLat = Math.cos(latExtrema);
    const meiaLargura = cosLat < 0.05 ? Math.PI : Math.min(Math.PI, thetaComFolga / cosLat);
    if (meiaLargura >= Math.PI - 1e-9) {
      for (let col = 0; col < BALDE_LON; col++) saida.push([col, lin]);
      continue;
    }
    const colMinF = ((lonC - meiaLargura + Math.PI) / (2 * Math.PI)) * BALDE_LON;
    const colMaxF = ((lonC + meiaLargura + Math.PI) / (2 * Math.PI)) * BALDE_LON;
    const colMin = Math.floor(colMinF) - 1;
    const colMax = Math.ceil(colMaxF) + 1;
    for (let col = colMin; col <= colMax; col++) {
      saida.push([((col % BALDE_LON) + BALDE_LON) % BALDE_LON, lin]);
    }
  }
  return saida;
}
function montaBaldeDeAmostragem(lista) {
  const balde = [];
  for (let k = 0; k < BALDE_LON * BALDE_LAT; k++) balde.push([]);
  for (const k of lista) {
    for (const [col, lin] of celulasTocadasPelaTampa(k.centro.x, k.centro.y, k.centro.z, k.raio)) {
      balde[lin * BALDE_LON + col].push(k);
    }
  }
  return balde;
}
const baldeDeCrateras = montaBaldeDeAmostragem(crateras);
const MACIEZ_CALIBRADA = 1.0; // `CRATERAS_CALIBRADAS_HIPERION.maciezDaCratera` em esculpido.ts

const trava01 = (x) => Math.max(0, Math.min(1, x));
const suave01 = (x) => {
  const t = trava01(x);
  return t * t * (3 - 2 * t);
};

/** porta de `amostrarCrateras` (esculpido.ts) — só o deslocamento (não as
 *  máscaras de cor, que este piloto não usa). */
function amostrarCrateras(p, listaDeCrateras, maciez) {
  let baciaMaisFunda = 0;
  let bordaMaisAlta = 0;
  for (const k of listaDeCrateras) {
    const corda = Math.sqrt(
      Math.max(0, 2 * (1 - (p.x * k.centro.x + p.y * k.centro.y + p.z * k.centro.z)))
    );
    if (corda >= k.raio) continue;
    const t = corda / k.raio;
    const bacia = -Math.pow(Math.max(0, 1 - t * t), maciez) * k.fundura;
    const faixaDeBorda = suave01((t - 0.55) / 0.23) * (1 - suave01((t - 0.78) / 0.22));
    baciaMaisFunda = Math.min(baciaMaisFunda, bacia);
    bordaMaisAlta = Math.max(bordaMaisAlta, faixaDeBorda * k.borda);
  }
  return Math.max(-0.34, Math.min(0.07, baciaMaisFunda + bordaMaisAlta));
}

// ------------------------------------------------------------
// 3. DIREÇÃO DA CASA + RAIO ESCULPIDO — `direcaoLocalDeLonLat` porta
//    `orientacaoNaCena.ts:142`; `raioEsculpidoNormalizado` é
//    grade(d)·(1+deslocamento(d)), a MESMA combinação de
//    `criaGeometriaHiperionCalibrada` (esculpido.ts).
// ------------------------------------------------------------
function direcaoLocalDeLonLat(lonEastDeg, latDeg) {
  const lon = lonEastDeg * DEG_PARA_RAD;
  const lat = latDeg * DEG_PARA_RAD;
  const cosLat = Math.cos(lat);
  return { x: cosLat * Math.cos(lon), y: Math.sin(lat), z: -cosLat * Math.sin(lon) };
}
function raioEsculpidoNormalizado(d) {
  const rMedido = raioMedidoDoHiperion(d);
  const [col, lin] = celulaDoBalde(d.x, d.y, d.z);
  const deslocamento = amostrarCrateras(d, baldeDeCrateras[lin * BALDE_LON + col], MACIEZ_CALIBRADA);
  return rMedido * (1 + deslocamento);
}

// ------------------------------------------------------------
// 4. hyperion-altura.png — 1024×512, 8 bits, h=(r-rMin)/(rMax-rMin)
// ------------------------------------------------------------
console.log('gerando altura (1024×512)...');
const ALT_W = 1024,
  ALT_H = 512;
const campoAltura = new Float64Array(ALT_W * ALT_H);
let rMin = Infinity,
  rMax = -Infinity;
for (let j = 0; j < ALT_H; j++) {
  const phi = 90 - (j + 0.5) * (180 / ALT_H);
  for (let i = 0; i < ALT_W; i++) {
    const lon = (i + 0.5) * (360 / ALT_W) - 180;
    const r = raioEsculpidoNormalizado(direcaoLocalDeLonLat(lon, phi));
    campoAltura[j * ALT_W + i] = r;
    if (r < rMin) rMin = r;
    if (r > rMax) rMax = r;
  }
}
const escala = rMax - rMin;
const vies = rMin - 1;
const alturaBuf = Buffer.alloc(ALT_W * ALT_H);
for (let k = 0; k < campoAltura.length; k++) {
  alturaBuf[k] = Math.max(0, Math.min(255, Math.round(((campoAltura[k] - rMin) / escala) * 255)));
}
await sharp(alturaBuf, { raw: { width: ALT_W, height: ALT_H, channels: 1 } })
  .toColourspace('b-w') // 1 canal de verdade — sem isto o sharp expande p/ sRGB 3 canais
  .png()
  .toFile(path.join(CAMINHO_SAIDA, 'hyperion-altura.png'));
console.log(`  rMin=${rMin.toFixed(6)} rMax=${rMax.toFixed(6)} escala=${escala.toFixed(6)} vies=${vies.toFixed(6)}`);

// ------------------------------------------------------------
// 5. hyperion-normal.png — 2048×1024, campo calculado DIRETO nessa
//    resolução (não upsample da altura). metros = R·ln(r_km·1000/R): o
//    log deixa a declividade exata numa superfície radial de relevo
//    grande (Hipérion varia de -34% a +7% do raio local).
// ------------------------------------------------------------
console.log('gerando normal (2048×1024)...');
const NRM_W = 2048,
  NRM_H = 1024;
const R_M = 135000; // metros — mesmo raio médio, em metros
const metros = new Float64Array(NRM_W * NRM_H);
for (let j = 0; j < NRM_H; j++) {
  const phi = 90 - (j + 0.5) * (180 / NRM_H);
  for (let i = 0; i < NRM_W; i++) {
    const lon = (i + 0.5) * (360 / NRM_W) - 180;
    const rNorm = raioEsculpidoNormalizado(direcaoLocalDeLonLat(lon, phi));
    const rKm = rNorm * RAIO_MEDIO_KM;
    metros[j * NRM_W + i] = R_M * Math.log((rKm * 1000) / R_M);
  }
}
const { rgb: normalRgb, rmsGraus, maxGraus } = assaNormais(metros, NRM_W, NRM_H, R_M);
const caminhoNormalPng = path.join(CAMINHO_SAIDA, 'hyperion-normal.png');
await sharp(normalRgb, { raw: { width: NRM_W, height: NRM_H, channels: 3 } }).png().toFile(caminhoNormalPng);
console.log(`  declive rms=${rmsGraus.toFixed(2)}° máx=${maxGraus.toFixed(2)}°`);

// ------------------------------------------------------------
// 6. hyperion-ia.png — a pintura da IA GRADUADA (porta de
//    `gradua-cor.mjs`: desestica os polos, desatura 40% em luz linear)
//    e reamostrada para a convenção da casa por DIREÇÃO (nunca por
//    espelhar índice de coluna à mão).
// ------------------------------------------------------------
console.log('gerando cor (2048×1024)...');
function linParaSRGB(v) {
  v = Math.max(0, Math.min(1, v));
  return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055));
}
async function graduaCorEmLinear(caminho) {
  const { data, info } = await sharp(caminho).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width,
    H = info.height;
  const lin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const L = [new Float64Array(W * H), new Float64Array(W * H), new Float64Array(W * H)];
  for (let i = 0; i < W * H; i++) for (let k = 0; k < 3; k++) L[k][i] = lin(data[3 * i + k]);
  const S0 = 1.5;
  for (let j = 0; j < H; j++) {
    const lat = ((90 - ((j + 0.5) * 180) / H) * Math.PI) / 180;
    const sigma = Math.abs(lat) > (55 * Math.PI) / 180 ? S0 * (1 / Math.max(Math.cos(lat), 1e-3) - 1) : 0;
    if (sigma < 0.3) continue;
    const R = Math.min(Math.floor(W / 2), Math.ceil(3 * sigma));
    const peso = [];
    let soma = 0;
    for (let d = -R; d <= R; d++) {
      const w = Math.exp(-(d * d) / (2 * sigma * sigma));
      peso.push(w);
      soma += w;
    }
    for (let k = 0; k < 3; k++) {
      const linha = L[k].slice(j * W, j * W + W);
      for (let i = 0; i < W; i++) {
        let acc = 0;
        for (let d = -R; d <= R; d++) acc += peso[d + R] * linha[(i + d + W) % W];
        L[k][j * W + i] = acc / soma;
      }
    }
  }
  const SAT = 0.6;
  for (let i = 0; i < W * H; i++) {
    const Y = 0.2126 * L[0][i] + 0.7152 * L[1][i] + 0.0722 * L[2][i];
    for (let k = 0; k < 3; k++) L[k][i] = Y + (L[k][i] - Y) * SAT;
  }
  return { L, W, H };
}
function amostraBilinearCor(L, Wsrc, Hsrc, u, v) {
  const x0 = Math.floor(u),
    y0raw = Math.floor(v);
  const fx = u - x0,
    fy = v - y0raw;
  const y0 = Math.max(0, Math.min(Hsrc - 1, y0raw));
  const y1 = Math.max(0, Math.min(Hsrc - 1, y0raw + 1));
  const x0c = ((x0 % Wsrc) + Wsrc) % Wsrc;
  const x1c = (((x0 + 1) % Wsrc) + Wsrc) % Wsrc;
  const out = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const v00 = L[k][y0 * Wsrc + x0c],
      v10 = L[k][y0 * Wsrc + x1c];
    const v01 = L[k][y1 * Wsrc + x0c],
      v11 = L[k][y1 * Wsrc + x1c];
    out[k] = v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;
  }
  return out;
}

const { L: corLinear, W: corW, H: corH } = await graduaCorEmLinear(CAMINHO_COR);
const COR_W = 2048,
  COR_H = 1024;
const corBuf = Buffer.alloc(COR_W * COR_H * 3);
for (let j = 0; j < COR_H; j++) {
  const phi = 90 - (j + 0.5) * (180 / COR_H);
  for (let i = 0; i < COR_W; i++) {
    const lon = (i + 0.5) * (360 / COR_W) - 180;
    const d = direcaoLocalDeLonLat(lon, phi);
    const lonGrade = Math.atan2(d.z, d.x) * GRAUS;
    const latGrade = Math.asin(Math.max(-1, Math.min(1, d.y))) * GRAUS;
    const u = ((lonGrade + 180) / 360) * corW - 0.5;
    const v = ((90 - latGrade) / 180) * corH - 0.5;
    const [r, g, b] = amostraBilinearCor(corLinear, corW, corH, u, v);
    const k = (j * COR_W + i) * 3;
    corBuf[k] = linParaSRGB(r);
    corBuf[k + 1] = linParaSRGB(g);
    corBuf[k + 2] = linParaSRGB(b);
  }
}
await sharp(corBuf, { raw: { width: COR_W, height: COR_H, channels: 3 } })
  .png()
  .toFile(path.join(CAMINHO_SAIDA, 'hyperion-ia.png'));

// ------------------------------------------------------------
// 7. hyperion-ia-original.png (cópia) + hyperion-pocos.json
// ------------------------------------------------------------
const destinoOriginal = path.join(CAMINHO_SAIDA, 'hyperion-ia-original.png');
if (path.resolve(destinoOriginal) !== path.resolve(CAMINHO_COR)) {
  copyFileSync(CAMINHO_COR, destinoOriginal);
}
writeFileSync(
  path.join(CAMINHO_SAIDA, 'hyperion-pocos.json'),
  JSON.stringify({
    fonte:
      'poços escuros detectados em hyperion-ia-original.png (pintura por IA, ilustração — não ' +
      'medição) por blob detection multi-escala sobre log-luminância, resposta dividida pelo ' +
      'desvio-padrão local (janela 3× a escala do blob) — DoG normalizado por escala e por ' +
      'contraste local, sigma 1.5-24px ×1.25, |lat|<=72°; gerado por ' +
      'scripts/data/atlas/relevo-e-cor-de-hiperion.mjs',
    crateras: crateraArrays,
  }) + '\n'
);

// ------------------------------------------------------------
// 8. CONFERÊNCIAS — quiralidade, espelho, ângulo do normal decodificado
// ------------------------------------------------------------
console.log('--- conferências ---');
function raioKmEm(lon, lat) {
  return raioEsculpidoNormalizado(direcaoLocalDeLonLat(lon, lat)) * RAIO_MEDIO_KM;
}
const rMaisX = raioKmEm(0, 0);
const rMenosX = raioKmEm(180, 0);
const rPoloNorte = raioKmEm(0, 90);
const rPoloSul = raioKmEm(0, -90);
console.log(`quiralidade: λ=0°,φ=0° (+X)=${rMaisX.toFixed(1)}km (≈174.3) | λ=180° (−X)=${rMenosX.toFixed(1)}km (≈182.0)`);
console.log(`             polo norte (+Y)=${rPoloNorte.toFixed(1)}km (≈143.5) | polo sul (−Y)=${rPoloSul.toFixed(1)}km (≈137.1)`);

const craterZPos = crateras.find((c) => c.centro.z > 0);
let espelhoLambda = null;
if (craterZPos) {
  espelhoLambda = Math.atan2(-craterZPos.centro.z, craterZPos.centro.x) * GRAUS;
  console.log(
    `espelho: cratera z=${craterZPos.centro.z.toFixed(4)}>0 → λ_casa=${espelhoLambda.toFixed(2)}° ` +
      `(${espelhoLambda < 0 ? 'OK, <0' : 'FALHOU, deveria ser <0'})`
  );
}

function normalAnaliticaEm(camposMetros, W, H, R, i, j) {
  const dLon = (2 * Math.PI) / W;
  const dLat = Math.PI / H;
  const passoNorte = R * dLat;
  const LAT_CLAMP = (80 * Math.PI) / 180; // LATITUDE_DO_CLAMP_RAD em gera-normal-de-dem.mjs
  const passoLesteMinimo = R * Math.cos(LAT_CLAMP) * dLon;
  const lat = Math.PI / 2 - ((j + 0.5) / H) * Math.PI;
  const passoLeste = Math.max(R * Math.cos(lat) * dLon, passoLesteMinimo);
  const jNorte = Math.max(0, j - 1);
  const jSul = Math.min(H - 1, j + 1);
  const vaoNorte = (jSul - jNorte) * passoNorte;
  const iLeste = (i + 1) % W;
  const iOeste = (i - 1 + W) % W;
  const dhLeste = (camposMetros[j * W + iLeste] - camposMetros[j * W + iOeste]) / (2 * passoLeste);
  const dhNorte = (camposMetros[jNorte * W + i] - camposMetros[jSul * W + i]) / vaoNorte;
  const x = -dhLeste,
    y = -dhNorte;
  const inv = 1 / Math.sqrt(x * x + y * y + 1);
  return { x: x * inv, y: y * inv, z: inv };
}
function anguloEntreGraus(a, b) {
  const na = Math.hypot(a.x, a.y, a.z) || 1;
  const nb = Math.hypot(b.x, b.y, b.z) || 1;
  const dot = Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y + a.z * b.z) / (na * nb)));
  return Math.acos(dot) * GRAUS;
}

const { data: normalLidoDoDisco } = await sharp(caminhoNormalPng).raw().toBuffer({ resolveWithObject: true });
const pontosDeChecagem = [
  [NRM_W >> 1, NRM_H >> 1],
  [300, 150],
  [1700, 700],
];
for (const [tx, ty] of pontosDeChecagem) {
  const k = (ty * NRM_W + tx) * 3;
  const decodificado = {
    x: (normalLidoDoDisco[k] / 255) * 2 - 1,
    y: (normalLidoDoDisco[k + 1] / 255) * 2 - 1,
    z: (normalLidoDoDisco[k + 2] / 255) * 2 - 1,
  };
  const analitico = normalAnaliticaEm(metros, NRM_W, NRM_H, R_M, tx, ty);
  const erro = anguloEntreGraus(decodificado, analitico);
  console.log(`  normal (${tx},${ty}): erro angular decodificado-vs-analítico = ${erro.toFixed(3)}°`);
}

// ------------------------------------------------------------
// 9. Alinhamento visual (opcional): hillshade da altura sobre a cor
// ------------------------------------------------------------
if (CAMINHO_ALINHAMENTO) {
  console.log('gerando imagem de alinhamento...');
  function normalizarVec(x, y, z) {
    const n = Math.hypot(x, y, z) || 1;
    return { x: x / n, y: y / n, z: z / n };
  }
  const luzDirecao = normalizarVec(-0.5, 0.5, 0.7);
  const hillBuf = Buffer.alloc(NRM_W * NRM_H * 3);
  for (let j = 0; j < NRM_H; j++) {
    for (let i = 0; i < NRM_W; i++) {
      const n = normalAnaliticaEm(metros, NRM_W, NRM_H, R_M, i, j);
      const sombreado = Math.max(0, n.x * luzDirecao.x + n.y * luzDirecao.y + n.z * luzDirecao.z);
      const luzFinal = 0.3 + 0.7 * sombreado;
      const k = (j * NRM_W + i) * 3;
      hillBuf[k] = Math.max(0, Math.min(255, Math.round(corBuf[k] * luzFinal)));
      hillBuf[k + 1] = Math.max(0, Math.min(255, Math.round(corBuf[k + 1] * luzFinal)));
      hillBuf[k + 2] = Math.max(0, Math.min(255, Math.round(corBuf[k + 2] * luzFinal)));
    }
  }
  const alturaJpg = Math.round((NRM_H / NRM_W) * 1200);
  await sharp(hillBuf, { raw: { width: NRM_W, height: NRM_H, channels: 3 } })
    .resize(1200, alturaJpg)
    .jpeg({ quality: 90 })
    .toFile(CAMINHO_ALINHAMENTO);
  console.log(`  escrito: ${CAMINHO_ALINHAMENTO}`);
}

console.log(
  JSON.stringify(
    {
      rMin,
      rMax,
      escala,
      vies,
      quiralidadeKm: { maisX: rMaisX, menosX: rMenosX, poloNorte: rPoloNorte, poloSul: rPoloSul },
      espelhoLambda,
      numCrateras: crateras.length,
      normalRmsGraus: rmsGraus,
      normalMaxGraus: maxGraus,
    },
    null,
    2
  )
);
console.timeEnd('total');
