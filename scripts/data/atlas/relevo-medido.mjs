// ============================================================
// O RELEVO MEDIDO — o miolo da receita do Hipérion (forma de placas da Cassini → mapas de altura e normal, a cor da
// pintura de IA e os poços dela), puro e sem constante de corpo. Saiu de `relevo-e-cor-de-hiperion.mjs` (E1 de
// PLAN-LUAS-PEQUENAS.md) para as sete luas pequenas síncronas de Saturno; para o Hipérion, os mapas saem idênticos.
// ENTRA: o texto do modelo de placas (`<lua>_30k_plt.tab`, Thomas, Joseph & Ansty 2018), o referencial, o raio do app em
//   km (a unidade de `escala`/`vies`), a pintura em pixels crus e as leis dos poços; os tamanhos de grade e de mapa.
// O REFERENCIAL LOCAL é sempre o da malha do app (`orientacaoNaCena.ts`): +X = o meridiano-primo, +Y = o polo, +Z = +X×polo.
//   `pca` (Hipérion, rotação caótica): centroide de volume e eixos principais — X o mais comprido, Y o intermediário.
//   `iau` (as síncronas): o do próprio arquivo, sem PCA — longitude 0 = ponto sub-Saturno, Z = polo norte; o (X,Y,Z) do
//   corpo vai a (X, Z, −Y) da malha, porque a coluna Z do app é x̂×polo = −ŷ do corpo.
// A GRADE RADIAL é interna, na convenção NATURAL da malha (λ = atan2(z,x), linha 0 = sul) — o ESPELHO da casa —, e todo
//   mapa sai dela POR DIREÇÃO (`campoNaCasa`): u = λ_leste/360 + 0,5, linha 0 = norte, a coluna 0 em 180°E.
//   `gradeNaCasa` dá a mesma grade já na convenção da casa (a planta para a pintura), sem reamostrar.
// A PINTURA vem numa das duas convenções: `malha` (a do Hipérion, pintada sobre a grade espelhada) ou `casa`.
// ============================================================

import { assaNormais } from './gera-normal-de-dem.mjs';

const GRAUS = 180 / Math.PI;
const DEG_PARA_RAD = Math.PI / 180;

export const trava01 = (x) => Math.max(0, Math.min(1, x));
export const suave01 = (x) => {
  const t = trava01(x);
  return t * t * (3 - 2 * t);
};

// ------------------------------------------------------------
// 1. A forma: o .tab, o centroide, os eixos principais, o referencial
// ------------------------------------------------------------

/** O modelo de placas: "nV nF", nV linhas x y z (km), nF linhas de três índices a partir de 0. */
export function lePlt(texto) {
  const linhas = texto.split(/\r?\n/);
  let cursor = 0;
  const proxima = () => {
    while (cursor < linhas.length && linhas[cursor].trim() === '') cursor++;
    return linhas[cursor++];
  };
  const [nVertices, nFacetas] = proxima().trim().split(/\s+/).map(Number);
  const vx = new Float64Array(nVertices);
  const vy = new Float64Array(nVertices);
  const vz = new Float64Array(nVertices);
  for (let i = 0; i < nVertices; i++) {
    const p = proxima().trim().split(/\s+/).map(Number);
    vx[i] = p[0];
    vy[i] = p[1];
    vz[i] = p[2];
  }
  const fa = new Int32Array(nFacetas);
  const fb = new Int32Array(nFacetas);
  const fc = new Int32Array(nFacetas);
  for (let i = 0; i < nFacetas; i++) {
    const p = proxima().trim().split(/\s+/).map(Number);
    fa[i] = p[0];
    fb[i] = p[1];
    fc[i] = p[2];
  }
  return { vx, vy, vz, fa, fb, fc };
}

/** O centroide de VOLUME (tetraedros a partir da origem). */
export function centroideDeVolume({ vx, vy, vz, fa, fb, fc }) {
  let v6 = 0,
    cxAcc = 0,
    cyAcc = 0,
    czAcc = 0;
  for (let i = 0; i < fa.length; i++) {
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
  return { x: cxAcc / (4 * v6), y: cyAcc / (4 * v6), z: czAcc / (4 * v6) };
}

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

/** Os eixos principais (covariância das facetas pesada pela área, Jacobi): X o mais comprido (x>0), Y o intermediário (y>0), Z = X×Y. */
export function eixosPrincipais({ vx, vy, vz, fa, fb, fc }, centroide) {
  let Sxx = 0,
    Syy = 0,
    Szz = 0,
    Sxy = 0,
    Sxz = 0,
    Syz = 0,
    areaTotal = 0;
  for (let i = 0; i < fa.length; i++) {
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
  return { eixoX, eixoY, eixoZ };
}

/**
 * A malha no referencial LOCAL do app (km): `pca` = centroide de volume + eixos principais (Hipérion); `iau` = o
 * referencial do arquivo, origem e eixos como vieram, (X, Y, Z) do corpo → (X, Z, −Y) da malha. Devolve a malha local
 * (mesmas facetas) e, no `pca`, o centroide e os eixos.
 */
export function malhaNoReferencial(malha, referencial) {
  const { vx, vy, vz, fa, fb, fc } = malha;
  const n = vx.length;
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const z = new Float64Array(n);
  if (referencial === 'iau') {
    for (let i = 0; i < n; i++) {
      x[i] = vx[i];
      y[i] = vz[i];
      z[i] = -vy[i];
    }
    return { vx: x, vy: y, vz: z, fa, fb, fc };
  }
  if (referencial !== 'pca') throw new Error(`referencial desconhecido: ${referencial} (pca | iau)`);
  const centroide = centroideDeVolume(malha);
  const { eixoX, eixoY, eixoZ } = eixosPrincipais(malha, centroide);
  for (let i = 0; i < n; i++) {
    const dx = vx[i] - centroide.x,
      dy = vy[i] - centroide.y,
      dz = vz[i] - centroide.z;
    x[i] = dx * eixoX.x + dy * eixoX.y + dz * eixoX.z;
    y[i] = dx * eixoY.x + dy * eixoY.y + dz * eixoY.z;
    z[i] = dx * eixoZ.x + dy * eixoZ.y + dz * eixoZ.z;
  }
  return { vx: x, vy: y, vz: z, fa, fb, fc, centroide, eixos: { eixoX, eixoY, eixoZ } };
}

// ------------------------------------------------------------
// 2. A grade radial (convenção natural da malha) por interseção raio–triângulo a partir da origem local
// ------------------------------------------------------------

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

/**
 * O raio (km) da malha local em nx×ny direções: coluna i em λ = −180 + (i+½)·360/nx com λ = atan2(z,x), linha j em
 * lat = −90 + (j+½)·180/ny (linha 0 = SUL); o cruzamento mais distante, com balde de culling (folga `padGraus`) e, sem
 * cruzamento no balde, todas as facetas. `raiosComZeroHits` tem de dar 0 (corpo estrelado a partir da origem).
 */
export function gradeRadial({ vx, vy, vz, fa, fb, fc }, { nx = 512, ny = 256, padGraus = 1.5 } = {}) {
  const nFacetas = fa.length;
  const lonLatDe = (x, y, z) => {
    const r = Math.hypot(x, y, z);
    const lon = Math.atan2(z, x) * GRAUS;
    const lat = Math.asin(Math.max(-1, Math.min(1, y / r))) * GRAUS;
    return [lon, lat];
  };
  const idxLonFrac = (lonGraus) => ((lonGraus + 180) / 360) * nx - 0.5;
  const idxLatFrac = (latGraus) => ((latGraus + 90) / 180) * ny - 0.5;

  const balde = new Array(nx * ny);
  for (let k = 0; k < balde.length; k++) balde[k] = [];
  for (let i = 0; i < nFacetas; i++) {
    const ia = fa[i],
      ib = fb[i],
      ic = fc[i];
    const [lon0, lat0] = lonLatDe(vx[ia], vy[ia], vz[ia]);
    const [lon1, lat1] = lonLatDe(vx[ib], vy[ib], vz[ib]);
    const [lon2, lat2] = lonLatDe(vx[ic], vy[ic], vz[ic]);
    let lons = [lon0, lon1, lon2];
    const lats = [lat0, lat1, lat2];
    const latMinBruto = Math.min(...lats);
    const latMaxBruto = Math.max(...lats);
    if (Math.max(...lons) - Math.min(...lons) > 180) {
      lons = lons.map((l) => (l < 0 ? l + 360 : l));
    }
    const lonMin = Math.min(...lons) - padGraus;
    const lonMax = Math.max(...lons) + padGraus;
    const latMin = Math.max(-90, latMinBruto - padGraus);
    const latMax = Math.min(90, latMaxBruto + padGraus);
    const lonCheia = latMax >= 89 || latMin <= -89;
    const jMin = Math.max(0, Math.floor(idxLatFrac(latMin)));
    const jMax = Math.min(ny - 1, Math.ceil(idxLatFrac(latMax)));
    if (lonCheia) {
      for (let j = jMin; j <= jMax; j++) {
        for (let ii = 0; ii < nx; ii++) balde[j * nx + ii].push(i);
      }
      continue;
    }
    const iMinF = Math.floor(idxLonFrac(lonMin));
    const iMaxF = Math.ceil(idxLonFrac(lonMax));
    for (let j = jMin; j <= jMax; j++) {
      for (let ii = iMinF; ii <= iMaxF; ii++) {
        const col = ((ii % nx) + nx) % nx;
        balde[j * nx + col].push(i);
      }
    }
  }

  const testaFacetas = (dx, dy, dz, listaDeFacetas) => {
    let melhor = -Infinity;
    let hits = 0;
    for (const i of listaDeFacetas) {
      const ia = fa[i],
        ib = fb[i],
        ic = fc[i];
      const t = intersectaRaioTriangulo(dx, dy, dz, vx[ia], vy[ia], vz[ia], vx[ib], vy[ib], vz[ib], vx[ic], vy[ic], vz[ic]);
      if (t !== null && t > 1e-6) {
        hits++;
        if (t > melhor) melhor = t;
      }
    }
    return { melhor, hits };
  };

  const todasAsFacetas = Array.from({ length: nFacetas }, (_, i) => i);
  const rKm = new Float64Array(nx * ny);
  let raiosComZeroHits = 0;
  for (let j = 0; j < ny; j++) {
    const phi = (-90 + (j + 0.5) * (180 / ny)) / GRAUS;
    for (let i = 0; i < nx; i++) {
      const lon = (-180 + (i + 0.5) * (360 / nx)) / GRAUS;
      const dx = Math.cos(phi) * Math.cos(lon);
      const dy = Math.sin(phi);
      const dz = Math.cos(phi) * Math.sin(lon);
      let { melhor, hits } = testaFacetas(dx, dy, dz, balde[j * nx + i]);
      if (hits === 0) ({ melhor, hits } = testaFacetas(dx, dy, dz, todasAsFacetas));
      if (hits === 0) raiosComZeroHits++;
      rKm[j * nx + i] = melhor;
    }
  }
  return { rKm, nx, ny, raiosComZeroHits };
}

/** A grade em unidades do raio do app, quantizada em 16 bits entre o mínimo e o máximo (a que o deslocamento lê). */
export function quantizaGrade({ rKm, nx, ny }, raioKm) {
  let rMin = Infinity,
    rMax = -Infinity;
  const rNorm = new Float64Array(nx * ny);
  for (let k = 0; k < rKm.length; k++) {
    const r = rKm[k] / raioKm;
    rNorm[k] = r;
    if (r < rMin) rMin = r;
    if (r > rMax) rMax = r;
  }
  const q = new Uint16Array(nx * ny);
  for (let k = 0; k < rNorm.length; k++) {
    q[k] = Math.round(((rNorm[k] - rMin) / (rMax - rMin)) * 65535);
  }
  return { q, rMin, rMax, nx, ny };
}

/** O raio (unidades do app) da grade quantizada na direção `p` do referencial local: bilinear, volta em longitude, trava em latitude. */
export function raioDaGrade({ q, rMin, rMax, nx, ny }, p) {
  const r = Math.hypot(p.x, p.y, p.z) || 1;
  const lat = Math.asin(Math.max(-1, Math.min(1, p.y / r)));
  const lon = Math.atan2(p.z / r, p.x / r);
  const u = ((lon * GRAUS + 180) / 360) * nx - 0.5;
  const v = ((lat * GRAUS + 90) / 180) * ny - 0.5;
  const i0 = Math.floor(u);
  const j0Bruto = Math.floor(v);
  const fu = u - i0;
  const fv = v - j0Bruto;
  const j0 = Math.max(0, Math.min(ny - 1, j0Bruto));
  const j1 = Math.max(0, Math.min(ny - 1, j0Bruto + 1));
  const i0c = ((i0 % nx) + nx) % nx;
  const i1c = (((i0 + 1) % nx) + nx) % nx;
  const amostra = (i, j) => q[j * nx + i];
  const q0 = amostra(i0c, j0) + (amostra(i1c, j0) - amostra(i0c, j0)) * fu;
  const q1 = amostra(i0c, j1) + (amostra(i1c, j1) - amostra(i0c, j1)) * fu;
  const qv = q0 + (q1 - q0) * fv;
  return rMin + (qv / 65535) * (rMax - rMin);
}

/** Bilinear de um campo nx×ny da grade na direção UNITÁRIA `d` (o mesmo índice de `raioDaGrade`, sem quantização). */
export function amostraGrade(campo, nx, ny, d) {
  const u = ((Math.atan2(d.z, d.x) * GRAUS + 180) / 360) * nx - 0.5;
  const v = ((Math.asin(Math.max(-1, Math.min(1, d.y))) * GRAUS + 90) / 180) * ny - 0.5;
  const i0 = Math.floor(u);
  const j0Bruto = Math.floor(v);
  const fu = u - i0;
  const fv = v - j0Bruto;
  const j0 = Math.max(0, Math.min(ny - 1, j0Bruto));
  const j1 = Math.max(0, Math.min(ny - 1, j0Bruto + 1));
  const i0c = ((i0 % nx) + nx) % nx;
  const i1c = (i0c + 1) % nx;
  const g0 = campo[j0 * nx + i0c] + (campo[j0 * nx + i1c] - campo[j0 * nx + i0c]) * fu;
  const g1 = campo[j1 * nx + i0c] + (campo[j1 * nx + i1c] - campo[j1 * nx + i0c]) * fu;
  return g0 + (g1 - g0) * fv;
}

/**
 * Um campo da grade (convenção da malha) na convenção da CASA, sem reamostrar: a coluna da casa ic (λ leste) é a coluna
 * nx−1−ic da grade (λ = −λ leste) e a linha jc (de norte para sul) é a linha ny−1−jc — meia volta da imagem. É a
 * "planta" sobre a qual se pinta na convenção `casa`.
 */
export function gradeNaCasa(campo, nx, ny) {
  const saida = new campo.constructor(nx * ny);
  for (let jc = 0; jc < ny; jc++) {
    for (let ic = 0; ic < nx; ic++) saida[jc * nx + ic] = campo[(ny - 1 - jc) * nx + (nx - 1 - ic)];
  }
  return saida;
}

// ------------------------------------------------------------
// 3. Os poços escuros da pintura → crateras (DoG multi-escala sobre log-luminância, normalizado pelo desvio local)
// ------------------------------------------------------------

function sRGBparaLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
const TABELA_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) TABELA_LINEAR[i] = sRGBparaLinear(i);

/** As leis dos poços do Hipérion (o piloto, 22/09); `limiar` é o da aceitação do DoG. */
export const POCOS_DO_HIPERION = Object.freeze({
  limiar: 0.01,
  epsLog: 0.0012,
  epsStd: 0.05,
  latMaxGraus: 72,
  raioMin: 0.012,
  raioMax: 0.07,
  funduraPorRaio: 0.42,
  bordaPorRaio: 0.045,
});

/**
 * Os poços escuros da pintura (`data` cru, W×H, CH canais) em crateras [x, y, z, raio, fundura, borda, escuridão] —
 * centro unitário no referencial local, raio em corda, fundura e borda em fração do raio. `convencao` é a da pintura
 * (`malha` | `casa`); `leis` sobrepõe `POCOS_DO_HIPERION`.
 */
export function detectaPocos(data, W, H, CH, { convencao = 'malha', ...leis } = {}) {
  const { limiar, epsLog, epsStd, latMaxGraus, raioMin, raioMax, funduraPorRaio, bordaPorRaio } = { ...POCOS_DO_HIPERION, ...leis };
  const sinalZ = sinalDaConvencao(convencao);
  const luz = new Float32Array(W * H);
  for (let p = 0, i = 0; p < W * H; p++, i += CH) {
    const r = TABELA_LINEAR[data[i]];
    const g = TABELA_LINEAR[data[i + 1]];
    const b = TABELA_LINEAR[data[i + 2]];
    luz[p] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  const luzLog = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) luzLog[p] = Math.log(luz[p] + epsLog);

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
  const luzLogSq = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) luzLogSq[p] = luzLog[p] * luzLog[p];
  for (let i = 0; i < dog.length; i++) {
    const sigmaJanela = 3 * sigmaEfetivo[i];
    const media = borraGaussiana(luzLog, sigmaJanela);
    const mediaSq = borraGaussiana(luzLogSq, sigmaJanela);
    const d = dog[i];
    for (let p = 0; p < W * H; p++) {
      const variancia = Math.max(0, mediaSq[p] - media[p] * media[p]);
      d[p] = d[p] / (Math.sqrt(variancia) + epsStd);
    }
  }

  const linhaDaLat = (latGraus) => (90 - latGraus) * (H / 180) - 0.5;
  const linMinValida = Math.max(1, Math.ceil(linhaDaLat(latMaxGraus)));
  const linMaxValida = Math.min(H - 2, Math.floor(linhaDaLat(-latMaxGraus)));
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
        const xm = (((x - 1) % W) + W) % W;
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
    const cz = sinalZ * Math.cos(lat) * Math.sin(lon);
    const raioAngular = Math.SQRT2 * sigma * (Math.PI / H);
    const e = contrasteEscuridao(c.x, c.y, sigma);
    return { cx, cy, cz, raio: raioAngular, v: c.v, e };
  });
  const filtradasPorRaio = brutas.filter((b) => b.raio >= raioMin);
  for (const b of filtradasPorRaio) b.raio = Math.min(raioMax, b.raio);
  filtradasPorRaio.sort((a, b) => b.v - a.v);
  const aceitas = [];
  for (const cand of filtradasPorRaio) {
    let duplicata = false;
    for (const outra of aceitas) {
      const corda = Math.sqrt(Math.max(0, 2 * (1 - (cand.cx * outra.cx + cand.cy * outra.cy + cand.cz * outra.cz))));
      const razaoEscala = cand.raio > outra.raio ? cand.raio / outra.raio : outra.raio / cand.raio;
      if (corda < 0.5 * (cand.raio + outra.raio) && razaoEscala < 1.6) {
        duplicata = true;
        break;
      }
    }
    if (!duplicata) aceitas.push(cand);
  }
  const f = (r) => {
    if (r <= 0.03) return 1;
    if (r >= 0.07) return 0.3;
    return 1 - 0.7 * ((r - 0.03) / 0.04);
  };
  const arred = (n) => Math.round(n * 1e5) / 1e5;
  return aceitas.map((a) => {
    const raio = a.raio;
    const fundura = funduraPorRaio * raio * f(raio) * (0.7 + 0.6 * a.e);
    const borda = bordaPorRaio * raio;
    const escuridao = 0.5 + 0.5 * a.e;
    return [arred(a.cx), arred(a.cy), arred(a.cz), arred(raio), arred(fundura), arred(borda), arred(escuridao)];
  });
}

/** `malha` (a convenção natural da grade: +Z em λ=+90°) ou `casa` (+Z em λ leste = −90°): o sinal de z na direção do texel. */
function sinalDaConvencao(convencao) {
  if (convencao === 'malha') return 1;
  if (convencao === 'casa') return -1;
  throw new Error(`convenção da pintura desconhecida: ${convencao} (malha | casa)`);
}

// ------------------------------------------------------------
// 4. As crateras no relevo — balde de 64×32 (o de `esculpido.ts`) e o deslocamento radial
// ------------------------------------------------------------

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

/** As crateras em arrays [x,y,z,raio,fundura,borda,escuridão] (`detectaPocos`, `<lua>-pocos.json`) no balde de consulta. */
export function baldeDeCrateras(crateraArrays) {
  const balde = [];
  for (let k = 0; k < BALDE_LON * BALDE_LAT; k++) balde.push([]);
  for (const [x, y, z, raio, fundura, borda, escuridao] of crateraArrays) {
    const k = { centro: { x, y, z }, raio, fundura, borda, escuridao };
    for (const [col, lin] of celulasTocadasPelaTampa(x, y, z, raio)) balde[lin * BALDE_LON + col].push(k);
  }
  return balde;
}

/** O deslocamento (fração do raio local) das crateras na direção unitária `d`: a bacia mais funda + a borda mais alta, em [−0,34; 0,07]. */
export function deslocamentoDasCrateras(d, balde, maciez = 1) {
  const [col, lin] = celulaDoBalde(d.x, d.y, d.z);
  let baciaMaisFunda = 0;
  let bordaMaisAlta = 0;
  for (const k of balde[lin * BALDE_LON + col]) {
    const corda = Math.sqrt(Math.max(0, 2 * (1 - (d.x * k.centro.x + d.y * k.centro.y + d.z * k.centro.z))));
    if (corda >= k.raio) continue;
    const t = corda / k.raio;
    const bacia = -Math.pow(Math.max(0, 1 - t * t), maciez) * k.fundura;
    const faixaDeBorda = suave01((t - 0.55) / 0.23) * (1 - suave01((t - 0.78) / 0.22));
    baciaMaisFunda = Math.min(baciaMaisFunda, bacia);
    bordaMaisAlta = Math.max(bordaMaisAlta, faixaDeBorda * k.borda);
  }
  return Math.max(-0.34, Math.min(0.07, baciaMaisFunda + bordaMaisAlta));
}

/** O raio final (unidades do app) na direção `d`: a grade medida × (1 + as crateras); sem balde, só a grade. */
export function raioComPocos(gradeQ, balde, d, maciez = 1) {
  const rMedido = raioDaGrade(gradeQ, d);
  return balde ? rMedido * (1 + deslocamentoDasCrateras(d, balde, maciez)) : rMedido;
}

// ------------------------------------------------------------
// 5. Os mapas na convenção da casa: altura (escala/viés) e normal
// ------------------------------------------------------------

/** A direção local de (λ leste, lat) em graus — `direcaoLocalDeLonLat` de `orientacaoNaCena.ts` (a SphereGeometry do three). */
export function direcaoLocalDeLonLat(lonEastDeg, latDeg) {
  const lon = lonEastDeg * DEG_PARA_RAD;
  const lat = latDeg * DEG_PARA_RAD;
  const cosLat = Math.cos(lat);
  return { x: cosLat * Math.cos(lon), y: Math.sin(lat), z: -cosLat * Math.sin(lon) };
}

/** `valorEm(d)` em cada texel W×H da casa: linha 0 = norte, coluna i em λ leste = (i+½)·360/W − 180 (a coluna 0 em 180°E). */
export function campoNaCasa(W, H, valorEm) {
  const campo = new Float64Array(W * H);
  for (let j = 0; j < H; j++) {
    const phi = 90 - (j + 0.5) * (180 / H);
    for (let i = 0; i < W; i++) {
      const lon = (i + 0.5) * (360 / W) - 180;
      campo[j * W + i] = valorEm(direcaoLocalDeLonLat(lon, phi));
    }
  }
  return campo;
}

/** O raio (unidades do app) em 8 bits, h = (r − rMin)/(rMax − rMin); o par do vértice: raio = 1 + viés + h·escala. */
export function alturaEmBytes(campo) {
  let rMin = Infinity,
    rMax = -Infinity;
  for (let k = 0; k < campo.length; k++) {
    if (campo[k] < rMin) rMin = campo[k];
    if (campo[k] > rMax) rMax = campo[k];
  }
  const escala = rMax - rMin;
  const vies = rMin - 1;
  const bytes = Buffer.alloc(campo.length);
  for (let k = 0; k < campo.length; k++) {
    bytes[k] = Math.max(0, Math.min(255, Math.round(((campo[k] - rMin) / escala) * 255)));
  }
  return { bytes, rMin, rMax, escala, vies };
}

/**
 * A normal do raio final (unidades do app) W×H: metros = R·ln(r·R_km·1000/R), com R = o raio do app em metros — o log
 * deixa a declividade exata numa superfície radial de relevo grande —, e `assaNormais` (gera-normal-de-dem.mjs).
 */
export function normalDoRaio(raio, W, H, raioKm) {
  const R_M = raioKm * 1000;
  const metros = new Float64Array(W * H);
  for (let k = 0; k < raio.length; k++) {
    const rKm = raio[k] * raioKm;
    metros[k] = R_M * Math.log((rKm * 1000) / R_M);
  }
  return { ...assaNormais(metros, W, H, R_M), metros };
}

// ------------------------------------------------------------
// 6. A cor da pintura: polos desesticados, saturação contida, reamostragem por direção, borda clara pelo declive
// ------------------------------------------------------------

/**
 * A pintura (sRGB cru, 3 canais) em luz linear, com os polos desesticados (gaussiana leste-oeste de σ = s0·(1/cos lat − 1)
 * px acima de `poloDesdeGraus`) e a saturação levada a `saturacao` (rumo à luminância).
 */
export function graduaCorEmLinear(data, W, H, { saturacao = 0.6, poloDesdeGraus = 55, s0 = 1.5 } = {}) {
  const lin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const L = [new Float64Array(W * H), new Float64Array(W * H), new Float64Array(W * H)];
  for (let i = 0; i < W * H; i++) for (let k = 0; k < 3; k++) L[k][i] = lin(data[3 * i + k]);
  for (let j = 0; j < H; j++) {
    const lat = ((90 - ((j + 0.5) * 180) / H) * Math.PI) / 180;
    const sigma = Math.abs(lat) > (poloDesdeGraus * Math.PI) / 180 ? s0 * (1 / Math.max(Math.cos(lat), 1e-3) - 1) : 0;
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
  for (let i = 0; i < W * H; i++) {
    const Y = 0.2126 * L[0][i] + 0.7152 * L[1][i] + 0.0722 * L[2][i];
    for (let k = 0; k < 3; k++) L[k][i] = Y + (L[k][i] - Y) * saturacao;
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

/** A cor linear graduada (`graduaCorEmLinear`) reamostrada para W×H da casa por DIREÇÃO, lida na convenção da pintura. */
export function corNaCasa({ L, W: corW, H: corH }, W, H, convencao) {
  const sinalZ = sinalDaConvencao(convencao);
  const saida = [new Float64Array(W * H), new Float64Array(W * H), new Float64Array(W * H)];
  for (let j = 0; j < H; j++) {
    const phi = 90 - (j + 0.5) * (180 / H);
    for (let i = 0; i < W; i++) {
      const lon = (i + 0.5) * (360 / W) - 180;
      const d = direcaoLocalDeLonLat(lon, phi);
      const lonPintura = Math.atan2(sinalZ * d.z, d.x) * GRAUS;
      const latPintura = Math.asin(Math.max(-1, Math.min(1, d.y))) * GRAUS;
      const u = ((lonPintura + 180) / 360) * corW - 0.5;
      const v = ((90 - latPintura) / 180) * corH - 0.5;
      const rgb = amostraBilinearCor(L, corW, corH, u, v);
      const p = j * W + i;
      for (let k = 0; k < 3; k++) saida[k][p] = rgb[k];
    }
  }
  return saida;
}

/**
 * O declive da forma MEDIDA em escala grande (graus) na grade da malha, contra o ELIPSOIDE TRIAXIAL que melhor se
 * ajusta a ela (senão as pontas de um corpo alongado contariam como encosta): 1/r² = A·dx² + B·dy² + C·dz² por mínimos
 * quadrados lineares pesados por cos lat, sobre a grade sem poços; resíduo ρ = ln(r/r_elipsoide) suavizado por
 * gaussiana de σ = `sigmaGraus` de arco (nas linhas, σ em células ∝ 1/cos lat, travado em 80°); declive = atan(|∇ρ|
 * por radiano de arco). Devolve também o elipsoide (unidades do app) e o rms de ρ, para o registro.
 */
export function declivesDaFormaEmGrande({ q, rMin, rMax, nx, ny }, sigmaGraus) {
  const cosTrava = Math.cos(80 * DEG_PARA_RAD);
  const latDaLinha = (j) => (-90 + (j + 0.5) * (180 / ny)) * DEG_PARA_RAD;
  const raioDaCelula = (k) => rMin + (q[k] / 65535) * (rMax - rMin);
  const quadrados = (j, i) => {
    const lat = latDaLinha(j);
    const lon = (-180 + (i + 0.5) * (360 / nx)) * DEG_PARA_RAD;
    const c = Math.cos(lat);
    return [(c * Math.cos(lon)) ** 2, Math.sin(lat) ** 2, (c * Math.sin(lon)) ** 2];
  };
  const M = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const vetor = [0, 0, 0];
  for (let j = 0; j < ny; j++) {
    const peso = Math.cos(latDaLinha(j));
    for (let i = 0; i < nx; i++) {
      const qd = quadrados(j, i);
      const alvo = 1 / raioDaCelula(j * nx + i) ** 2;
      for (let a = 0; a < 3; a++) {
        vetor[a] += peso * qd[a] * alvo;
        for (let b = 0; b < 3; b++) M[a][b] += peso * qd[a] * qd[b];
      }
    }
  }
  const det3 = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const detM = det3(M);
  const [A, B, C] = [0, 1, 2].map((col) => det3(M.map((linha, a) => linha.map((x, b) => (b === col ? vetor[a] : x)))) / detM);
  const m = new Float64Array(nx * ny);
  let somaRho2 = 0,
    somaPeso = 0;
  for (let j = 0; j < ny; j++) {
    const peso = Math.cos(latDaLinha(j));
    for (let i = 0; i < nx; i++) {
      const [qx, qy, qz] = quadrados(j, i);
      const rho = Math.log(raioDaCelula(j * nx + i) * Math.sqrt(A * qx + B * qy + C * qz));
      m[j * nx + i] = rho;
      somaRho2 += peso * rho * rho;
      somaPeso += peso;
    }
  }
  const sigmaLat = sigmaGraus / (180 / ny);
  const nucleo = (sigma, alcance) => {
    const w = [];
    let soma = 0;
    for (let d = -alcance; d <= alcance; d++) {
      w.push(Math.exp(-(d * d) / (2 * sigma * sigma)));
      soma += w[w.length - 1];
    }
    return w.map((x) => x / soma);
  };
  const aoLongo = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const sigma = sigmaLat / Math.max(Math.cos(latDaLinha(j)), cosTrava);
    const alcance = Math.min(nx >> 1, Math.ceil(3 * sigma));
    const w = nucleo(sigma, alcance);
    for (let i = 0; i < nx; i++) {
      let acc = 0;
      for (let d = -alcance; d <= alcance; d++) acc += w[d + alcance] * m[j * nx + ((i + d + nx) % nx)];
      aoLongo[j * nx + i] = acc;
    }
  }
  const alcanceLat = Math.ceil(3 * sigmaLat);
  const wLat = nucleo(sigmaLat, alcanceLat);
  const suave = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      let acc = 0;
      for (let d = -alcanceLat; d <= alcanceLat; d++) {
        acc += wLat[d + alcanceLat] * aoLongo[Math.max(0, Math.min(ny - 1, j + d)) * nx + i];
      }
      suave[j * nx + i] = acc;
    }
  }
  const dLon = (2 * Math.PI) / nx;
  const passoNorte = Math.PI / ny;
  const declive = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const passoLeste = Math.max(Math.cos(latDaLinha(j)), cosTrava) * dLon;
    const jSul = Math.max(0, j - 1);
    const jNorte = Math.min(ny - 1, j + 1);
    for (let i = 0; i < nx; i++) {
      const gLeste = (suave[j * nx + ((i + 1) % nx)] - suave[j * nx + ((i - 1 + nx) % nx)]) / (2 * passoLeste);
      const gNorte = (suave[jNorte * nx + i] - suave[jSul * nx + i]) / ((jNorte - jSul) * passoNorte);
      declive[j * nx + i] = Math.atan(Math.hypot(gLeste, gNorte)) * GRAUS;
    }
  }
  return {
    declive,
    elipsoide: { a: 1 / Math.sqrt(A), b: 1 / Math.sqrt(B), c: 1 / Math.sqrt(C) },
    rmsRho: Math.sqrt(somaRho2 / somaPeso),
  };
}

/** A dose da borda clara (0–1) em W×H da casa: 0 abaixo de `semBrilhoGraus` de declive grande, 1 a partir de `cheioGraus`. */
export function doseDaEncosta(declive, nx, ny, W, H, semBrilhoGraus, cheioGraus) {
  return campoNaCasa(W, H, (d) => trava01((amostraGrade(declive, nx, ny, d) - semBrilhoGraus) / (cheioGraus - semBrilhoGraus)));
}

/** Luz linear → byte sRGB, travado em [0, 1]. */
export function linParaSRGB(v) {
  v = Math.max(0, Math.min(1, v));
  return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055));
}

/** A cor de volta a sRGB (RGB intercalado) com a borda clara: cor × (1 + `brilho`·dose). */
export function corEmSRGB(cor, dose, brilho) {
  const n = dose.length;
  const bytes = Buffer.alloc(n * 3);
  let texelsComDose = 0,
    somaDose = 0;
  for (let p = 0; p < n; p++) {
    const ganho = 1 + brilho * dose[p];
    if (dose[p] > 0) texelsComDose++;
    somaDose += dose[p];
    for (let k = 0; k < 3; k++) bytes[p * 3 + k] = linParaSRGB(cor[k][p] * ganho);
  }
  return { bytes, texelsComDose, somaDose };
}
