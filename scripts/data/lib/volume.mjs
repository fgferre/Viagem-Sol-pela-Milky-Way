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

const PASSO_COLUNA_PC = 5;

/** `grade` do volume bate com `gradeFixture` (`cabecalho.grade` da fixture: `{dims,voxelPc,origemPc}`)? Sem `gradeFixture`, conta como diferente. */
function gradeIgualAFixture(grade, gradeFixture) {
  if (!gradeFixture || !Array.isArray(gradeFixture.dims) || !Array.isArray(gradeFixture.origemPc)) return false;
  const [nx, ny, nz] = gradeFixture.dims;
  return (
    grade.nx === nx &&
    grade.ny === ny &&
    grade.nz === nz &&
    grade.voxelPc === gradeFixture.voxelPc &&
    grade.origemPc.length === gradeFixture.origemPc.length &&
    grade.origemPc.every((v, i) => v === gradeFixture.origemPc[i])
  );
}

/**
 * Volume esparso na mesma `grade`, só com as `celulas` (`{indice,media}`)
 * da referência preenchidas — o resto fica 0. Serve para reconstruir,
 * com o MESMO `integrarColuna` do bloco, a integral que o interpolador
 * oficial daria se só soubesse desses voxels: a referência de "mesmo
 * operador" de `compararComReferencia`.
 */
function volumeDeCelulas(grade, celulas) {
  const valores = new Float64Array(grade.nx * grade.ny * grade.nz);
  for (const { indice, media } of celulas) {
    const [i, j, k] = indice;
    valores[indiceDe(grade, i, j, k)] = media;
  }
  return { grade, valores };
}

/** `desvio/tolerancia`; sem margem (`tolerancia === 0`), só é 0 se `desvio` também for — nunca `0×Infinity = NaN`. */
function relativoComTolerancia(desvio, tolerancia) {
  if (tolerancia > 0) return desvio / tolerancia;
  return desvio === 0 ? 0 : Infinity;
}

/**
 * Compara `volume` com a fixture de referência do interpolador oficial
 * (`fixtures/edenhofer-referencia.json`). A fixture é amostrada para UMA
 * grade só (`fixture.cabecalho.grade`); se a grade de `volume` for outra
 * — outra resolução, outra origem —, o mesmo índice `[i,j,k]` não aponta
 * para o mesmo voxel nos dois lados, e a comparação não faz sentido:
 * devolve `{ aplicavel: false, motivo }` sem olhar voxeis nem colunas.
 *
 * Voxel (`fixture.voxeis`): residual normalizado pela tolerância —
 * `|atual−esperado| ≤ 0,05·esperado + 2e-6` (revisão de 28/09/2026: o
 * piso antigo de 3e-5, um terço da densidade média, dominava 27 dos 40
 * voxels da fixture real — a concordância medida é ≤ 0,6% e a
 * convergência 8³→16³ do gerador é ≤ 1,7%) —, com `esperado = 0` quando
 * `nanFracao === 1`. O interior de 68,8 pc não
 * reconstruído é zero por ESCOLHA do app (`coletar`, build-dust-volumes.
 * mjs), com transição de resolução de ~1 voxel na fronteira — a média
 * das subamostras atravessa a superfície —, não porque o dado meça
 * vazio; por isso o voxel de referência pode sair levemente > 0 mesmo
 * com centro dentro do raio interno.
 *
 * Coluna (`fixture.colunas`): quem REPROVA não é mais a faixa do tubo
 * (25 raios paralelos, `c.tubo`) — ela mede a variação real de um tubo
 * de 20 pc, não o erro do bloco — e por isso virou só PLAUSIBILIDADE
 * (`piorFaixa`, sempre reportado, nunca reprova). Quem reprova é
 * `referenciaMesmoOperador`: a integral (mesmo `integrarColuna`, mesmo
 * passo) de um volume esparso feito só das `c.celulas` que a fixture
 * amostrou com o MESMO operador do bloco (8×8×8 estratificado nos
 * voxels que a reconstrução trilinear toca) — a única diferença que
 * resta entre os dois lados é pixel HEALPix mais próximo (bloco) ×
 * vizinho angular interpolado bilinearmente (fixture). Aprovado quando
 * `|atual − referenciaMesmoOperador| ≤ 0,05·referenciaMesmoOperador`
 * (`piorDesvio`). Os três `aprovado`/`maximoRelativo ≤ 1` seguem a
 * mesma convenção (voxel e coluna).
 *
 * Antes de comparar, a fixture precisa ter conteúdo mínimo: `voxeis` e
 * `colunas` não vazios, cada `indice` dentro da grade e cada `media`
 * (voxel, tubo, célula) finita e ≥ 0 — sem isso os dois `aprovado`
 * ficavam verdadeiros por vacuidade (nenhum voxel/coluna para reprovar).
 * Falha aqui também é `{ aplicavel: false, motivo }`, nunca um "OK" por
 * falta de dado (revisão independente v2, item 3, 27/09/2026).
 */
export function compararComReferencia(volume, fixture) {
  const gradeFixture = fixture?.cabecalho?.grade;
  if (!gradeIgualAFixture(volume.grade, gradeFixture)) {
    const { nx, ny, nz, voxelPc } = volume.grade;
    const motivo = gradeFixture
      ? `grade do volume (${nx}×${ny}×${nz} @ ${voxelPc} pc) difere da grade da fixture ` +
        `(${gradeFixture.dims.join('×')} @ ${gradeFixture.voxelPc} pc).`
      : 'fixture sem cabecalho.grade — aplica-se só ao bloco (grade/resolução) que a gerou.';
    return { aplicavel: false, motivo };
  }

  const { nx: gnx, ny: gny, nz: gnz } = volume.grade;
  const dims = [gnx, gny, gnz];
  const indiceValido = (indice) =>
    Array.isArray(indice) &&
    indice.length === 3 &&
    indice.every((v, eixo) => Number.isInteger(v) && v >= 0 && v < dims[eixo]);
  const finitoNaoNegativo = (v) => Number.isFinite(v) && v >= 0;

  if (!Array.isArray(fixture.voxeis) || fixture.voxeis.length < 1) {
    return { aplicavel: false, motivo: 'fixture sem voxeis (lista vazia) — nada para comparar.' };
  }
  if (!Array.isArray(fixture.colunas) || fixture.colunas.length < 1) {
    return { aplicavel: false, motivo: 'fixture sem colunas (lista vazia) — nada para comparar.' };
  }
  for (const v of fixture.voxeis) {
    if (!indiceValido(v.indice)) {
      return { aplicavel: false, motivo: `voxel com índice fora da grade (${JSON.stringify(v.indice)}).` };
    }
    if (!finitoNaoNegativo(v.media)) {
      return { aplicavel: false, motivo: `voxel ${JSON.stringify(v.indice)} com media inválida (${v.media}).` };
    }
  }
  for (const c of fixture.colunas) {
    if (!finitoNaoNegativo(c.tubo?.media)) {
      return { aplicavel: false, motivo: `coluna "${c.nome}" com tubo.media inválido (${c.tubo?.media}).` };
    }
    for (const cel of c.celulas ?? []) {
      if (!indiceValido(cel.indice)) {
        return {
          aplicavel: false,
          motivo: `coluna "${c.nome}": célula com índice fora da grade (${JSON.stringify(cel.indice)}).`,
        };
      }
      if (!finitoNaoNegativo(cel.media)) {
        return {
          aplicavel: false,
          motivo: `coluna "${c.nome}": célula ${JSON.stringify(cel.indice)} com media inválida (${cel.media}).`,
        };
      }
    }
  }

  let voxelRelativo = 0;
  let voxelPior = null;
  for (const v of fixture.voxeis) {
    const [i, j, k] = v.indice;
    const esperado = v.nanFracao === 1 ? 0 : v.media;
    const atual = volume.valores[indiceDe(volume.grade, i, j, k)];
    const tolerancia = 0.05 * Math.abs(esperado) + 2e-6;
    const relativo = Math.abs(atual - esperado) / tolerancia;
    if (relativo > voxelRelativo) {
      voxelRelativo = relativo;
      voxelPior = { indice: v.indice, esperado, atual };
    }
  }

  let colunaRelativo = 0;
  let colunaPiorDesvio = null;
  let colunaFaixaRelativo = 0;
  let colunaPiorFaixa = null;
  for (const c of fixture.colunas) {
    const atual = integrarColuna(volume, c.l, c.b, c.rMin, c.rMax, PASSO_COLUNA_PC);

    const referencia = volumeDeCelulas(volume.grade, c.celulas ?? []);
    const referenciaMesmoOperador = integrarColuna(referencia, c.l, c.b, c.rMin, c.rMax, PASSO_COLUNA_PC);
    const desvioAbs = Math.abs(atual - referenciaMesmoOperador);
    const toleranciaColuna = 0.05 * Math.abs(referenciaMesmoOperador);
    const desvioRelativo = relativoComTolerancia(desvioAbs, toleranciaColuna);
    if (colunaPiorDesvio === null || desvioRelativo >= colunaRelativo) {
      colunaRelativo = desvioRelativo;
      colunaPiorDesvio = { nome: c.nome, atual, referenciaMesmoOperador, desvioRelativo };
    }

    const razaoMedia = atual / c.tubo.media;
    const folga = 0.02 * (c.tubo.max - c.tubo.min);
    const distanciaFora = Math.max(0, c.tubo.min - atual, atual - c.tubo.max);
    const relativoFaixa = relativoComTolerancia(distanciaFora, folga);
    if (colunaPiorFaixa === null || relativoFaixa >= colunaFaixaRelativo) {
      colunaFaixaRelativo = relativoFaixa;
      colunaPiorFaixa = { nome: c.nome, esperadoFaixa: [c.tubo.min, c.tubo.max], atual, razaoMedia };
    }
  }

  return {
    aplicavel: true,
    voxel: { maximoRelativo: voxelRelativo, aprovado: voxelRelativo <= 1, pior: voxelPior },
    coluna: {
      maximoRelativo: colunaRelativo,
      aprovado: colunaRelativo <= 1,
      piorDesvio: colunaPiorDesvio,
      piorFaixa: colunaPiorFaixa,
    },
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
