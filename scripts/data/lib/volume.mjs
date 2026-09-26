// ============================================================
// Contrato do bloco de poeira de 20 pc (E1, item 1 do PLAN.md): a grade
// cartesiana heliocêntrica-galáctica, a codificação float16 do disco e
// as funções puras de amostragem/integração/comparação que o resto do
// E1 (coleta em `build-dust-volumes.mjs`, `verify-assets.mjs`,
// `build-galactic-assets.mjs`) reusa.
//
// "Volume", aqui, é sempre `{ grade, valores }`: `grade` é uma das
// constantes de grade abaixo (ou uma equivalente sintética, em teste) e
// `valores` é um array plano (Array, Float32Array ou Float64Array) de
// densidades JÁ DECODIFICADAS (E/pc), indexado por `indiceDe`. A ponte
// para os bytes do `.bin` (float16 × escala) é só `paraFloat16`/
// `deFloat16`; o resto do módulo nunca vê a codificação.
// ============================================================
/* global Float16Array:readonly */
import os from 'node:os';

/** Contrato do primeiro nível (Decisão 1 do PLAN.md): 125×125×50 a 20 pc, ±1250/±1250/±500 pc. */
export const GRADE_20PC = {
  nx: 125,
  ny: 125,
  nz: 50,
  voxelPc: 20,
  origemPc: [-1250, -1250, -500],
};

/** Índice plano `ix + nx·(iy + ny·iz)` do voxel (i,j,k) na grade. */
export function indiceDe(grade, i, j, k) {
  return i + grade.nx * (j + grade.ny * k);
}

/** Centro físico (pc) do voxel (i,j,k): `origem + (i + 0,5)·voxel`, eixo a eixo. */
export function centroDe(grade, i, j, k) {
  return [
    grade.origemPc[0] + (i + 0.5) * grade.voxelPc,
    grade.origemPc[1] + (j + 0.5) * grade.voxelPc,
    grade.origemPc[2] + (k + 0.5) * grade.voxelPc,
  ];
}

/** Índices [i, j, k] do voxel que contém o ponto (x,y,z); não clampa nem valida limites. */
export function indiceDoPonto(grade, x, y, z) {
  return [
    Math.floor((x - grade.origemPc[0]) / grade.voxelPc),
    Math.floor((y - grade.origemPc[1]) / grade.voxelPc),
    Math.floor((z - grade.origemPc[2]) / grade.voxelPc),
  ];
}

/**
 * Codifica densidades (E/pc) em `Float16Array` little-endian, na escala
 * do disco (`valor × escala`, tipicamente 1000). Só roda em plataforma
 * little-endian: o `.buffer` do typed array vira os bytes do `.bin` sem
 * nenhuma conversão de endianness.
 */
export function paraFloat16(valores, escala) {
  if (os.endianness() !== 'LE') {
    throw new Error('paraFloat16: exige plataforma little-endian.');
  }
  const saida = new Float16Array(valores.length);
  for (let i = 0; i < valores.length; i += 1) saida[i] = valores[i] * escala;
  return saida;
}

/** Inverso de `paraFloat16`: bytes little-endian (Buffer ou typed array) → densidades (E/pc). */
export function deFloat16(buffer, escala) {
  const bytes = ArrayBuffer.isView(buffer) ? buffer : new Uint8Array(buffer);
  const visao = new Float16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
  const saida = new Float64Array(visao.length);
  for (let i = 0; i < visao.length; i += 1) saida[i] = visao[i] / escala;
  return saida;
}

/** Índices/peso da interpolação num eixo: centros clampados nas bordas da caixa (sem extrapolar). */
function eixoContinuo(valor, origem, voxelPc, n) {
  const u = (valor - origem) / voxelPc - 0.5;
  if (u <= 0) return { i0: 0, i1: Math.min(1, n - 1), t: 0 };
  if (u >= n - 1) return { i0: Math.max(0, n - 2), i1: n - 1, t: 1 };
  const i0 = Math.floor(u);
  return { i0, i1: i0 + 1, t: u - i0 };
}

/** Amostragem trilinear de `volume` no ponto (x,y,z), em pc; fora da caixa devolve 0. */
export function amostrar(volume, x, y, z) {
  const { grade, valores } = volume;
  const { nx, ny, nz, voxelPc, origemPc } = grade;
  const dentro =
    x >= origemPc[0] && x <= origemPc[0] + nx * voxelPc &&
    y >= origemPc[1] && y <= origemPc[1] + ny * voxelPc &&
    z >= origemPc[2] && z <= origemPc[2] + nz * voxelPc;
  if (!dentro) return 0;
  const ex = eixoContinuo(x, origemPc[0], voxelPc, nx);
  const ey = eixoContinuo(y, origemPc[1], voxelPc, ny);
  const ez = eixoContinuo(z, origemPc[2], voxelPc, nz);
  const ler = (i, j, k) => valores[indiceDe(grade, i, j, k)];
  const c00 = ler(ex.i0, ey.i0, ez.i0) * (1 - ex.t) + ler(ex.i1, ey.i0, ez.i0) * ex.t;
  const c10 = ler(ex.i0, ey.i1, ez.i0) * (1 - ex.t) + ler(ex.i1, ey.i1, ez.i0) * ex.t;
  const c01 = ler(ex.i0, ey.i0, ez.i1) * (1 - ex.t) + ler(ex.i1, ey.i0, ez.i1) * ex.t;
  const c11 = ler(ex.i0, ey.i1, ez.i1) * (1 - ex.t) + ler(ex.i1, ey.i1, ez.i1) * ex.t;
  const c0 = c00 * (1 - ey.t) + c10 * ey.t;
  const c1 = c01 * (1 - ey.t) + c11 * ey.t;
  return c0 * (1 - ez.t) + c1 * ez.t;
}

/**
 * Integral trapezoidal de `volume` ao longo da direção galáctica (l,b),
 * em graus, de `rMin` a `rMax` (pc), com passo aproximado `passoPc`
 * (mesma convenção da fixture: soma de amostras ao longo do raio, a
 * partir do Sol na origem da grade).
 */
export function integrarColuna(volume, l, b, rMin, rMax, passoPc) {
  const lr = (l * Math.PI) / 180;
  const br = (b * Math.PI) / 180;
  const dx = Math.cos(br) * Math.cos(lr);
  const dy = Math.cos(br) * Math.sin(lr);
  const dz = Math.sin(br);
  const distancia = rMax - rMin;
  const passos = Math.max(1, Math.ceil(distancia / passoPc));
  const h = distancia / passos;
  let soma = 0;
  for (let n = 0; n <= passos; n += 1) {
    const r = rMin + n * h;
    const valor = amostrar(volume, dx * r, dy * r, dz * r);
    soma += (n === 0 || n === passos ? 0.5 : 1) * valor;
  }
  return soma * h;
}

const TOLERANCIA_COLUNA = 0.15;
const PASSO_COLUNA_PC = 5;

/**
 * Compara `volume` com a fixture de referência do interpolador oficial
 * (`fixtures/edenhofer-referencia.json`): residual por voxel
 * (`fixture.voxeis`; `nanFracao === 1` tem que valer 0) e por coluna
 * (`fixture.colunas`, integral de `rMin` a `rMax` = `fixture.cabecalho.
 * raiosPc`). Os dois relativos devolvidos já vêm NORMALIZADOS pela
 * tolerância da Decisão 1/E1 do PLAN.md — voxel `|v−media| ≤
 * 0,15·media + 3e-5`, coluna relativo ≤ 0,15 —, então `aprovado` é
 * sempre `maximoRelativo ≤ 1`.
 */
export function compararComReferencia(volume, fixture) {
  let voxelRelativo = 0;
  let voxelPior = null;
  for (const v of fixture.voxeis) {
    const [i, j, k] = v.indice;
    const esperado = v.nanFracao === 1 ? 0 : v.media;
    const atual = volume.valores[indiceDe(volume.grade, i, j, k)];
    const tolerancia = 0.15 * Math.abs(esperado) + 3e-5;
    const relativo = Math.abs(atual - esperado) / tolerancia;
    if (relativo > voxelRelativo) {
      voxelRelativo = relativo;
      voxelPior = { indice: v.indice, esperado, atual };
    }
  }

  let colunaRelativo = 0;
  let colunaPior = null;
  const [rMin, rMax] = fixture.cabecalho.raiosPc;
  for (const c of fixture.colunas) {
    const atual = integrarColuna(volume, c.l, c.b, rMin, rMax, PASSO_COLUNA_PC);
    const relativo =
      Math.abs(atual - c.integral) / (TOLERANCIA_COLUNA * Math.max(Math.abs(c.integral), 1e-9));
    if (relativo > colunaRelativo) {
      colunaRelativo = relativo;
      colunaPior = { nome: c.nome, l: c.l, b: c.b, esperado: c.integral, atual };
    }
  }

  return {
    voxel: { maximoRelativo: voxelRelativo, aprovado: voxelRelativo <= 1, pior: voxelPior },
    coluna: { maximoRelativo: colunaRelativo, aprovado: colunaRelativo <= 1, pior: colunaPior },
  };
}

/**
 * Preserva no manifesto NOVO os ativos `kind === 'volume'` e as
 * `sources` do manifesto ANTIGO que o novo ainda não tem —
 * `build-galactic-assets.mjs` reescreve o manifesto inteiro e só sabe
 * escrever Float32 (`writeFloat32Asset`), então os volumes float16 se
 * perderiam a cada rodada sem isso. Muta e devolve `manifestoNovo`; sem
 * manifesto antigo, é a identidade (só garante `assets`/`sources`).
 */
export function preservarVolumes(manifestoNovo, manifestoAntigo) {
  manifestoNovo.assets ??= {};
  manifestoNovo.sources ??= [];
  if (!manifestoAntigo) return manifestoNovo;
  for (const [nome, asset] of Object.entries(manifestoAntigo.assets ?? {})) {
    if (asset.kind === 'volume' && !(nome in manifestoNovo.assets)) {
      manifestoNovo.assets[nome] = asset;
    }
  }
  const idsNovos = new Set(manifestoNovo.sources.map((s) => s.id));
  for (const source of manifestoAntigo.sources ?? []) {
    if (!idsNovos.has(source.id)) {
      manifestoNovo.sources.push(source);
      idsNovos.add(source.id);
    }
  }
  return manifestoNovo;
}
