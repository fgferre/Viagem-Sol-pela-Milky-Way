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

// Teto físico da poeira: valor acima disso é voxel absurdo, não densidade
// real. O máximo do mapa bruto de Edenhofer a 5 pc é 0,185 E/pc e o do
// bloco de 20 pc (médias em voxels maiores) é 0,0162 E/pc; 1,0 deixa folga
// para níveis mais finos e ainda reprova um voxel absurdo. Comparado ao
// valor já convertido por `deFloat16` — que devolve E/pc, não E/pc×1000:
// a escala do disco só existe para a precisão do float16. Vale para o
// bloco e para cada tijolo da pirâmide (gerador e `verify-assets.mjs`).
export const LIMITE_E_POR_PC = 1.0;

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

/** Os bytes do disco são o `.buffer` de um `Float16Array`, sem troca de endianness. */
function exigirLittleEndian(quem) {
  if (os.endianness() !== 'LE') {
    throw new Error(`${quem}: exige plataforma little-endian.`);
  }
}

/**
 * Codifica densidades (E/pc) em `Float16Array` little-endian, na escala
 * do disco (`valor × escala`, tipicamente 1000). Só roda em plataforma
 * little-endian: o `.buffer` do typed array vira os bytes do `.bin` sem
 * nenhuma conversão de endianness.
 */
export function paraFloat16(valores, escala) {
  exigirLittleEndian('paraFloat16');
  const saida = new Float16Array(valores.length);
  for (let i = 0; i < valores.length; i += 1) saida[i] = valores[i] * escala;
  return saida;
}

/** Inverso de `paraFloat16`: bytes little-endian (Buffer ou typed array) → densidades (E/pc). */
export function deFloat16(buffer, escala) {
  const vista = ArrayBuffer.isView(buffer) ? buffer : new Uint8Array(buffer);
  // um Buffer (de `gunzipSync`, por exemplo) pode começar em byte ímpar do
  // ArrayBuffer dele, e o Float16Array exige alinhamento de 2: copia.
  const bytes = vista.byteOffset % 2 === 0 ? vista : new Uint8Array(vista);
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
  const { nx, ny, nz, voxelPc, origemPc } = volume.grade;
  const dentro =
    x >= origemPc[0] && x <= origemPc[0] + nx * voxelPc &&
    y >= origemPc[1] && y <= origemPc[1] + ny * voxelPc &&
    z >= origemPc[2] && z <= origemPc[2] + nz * voxelPc;
  if (!dentro) return 0;
  return interpolarClampado(volume, x, y, z);
}

/**
 * Trilinear de `volume` em (x,y,z) com as bordas clampadas nos centros
 * extremos — o CLAMP_TO_EDGE da GPU: fora da caixa, repete a borda (não
 * zera, ao contrário de `amostrar`). É o "trilinear do n0" da pirâmide.
 */
export function interpolarClampado(volume, x, y, z) {
  const { grade, valores } = volume;
  const { nx, ny, nz, voxelPc, origemPc } = grade;
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
 * A coleta (E1, Decisão 6 do PLAN.md): cada voxel de `grade` é a média de
 * `sub³` subamostras estratificadas de `amostrador(x,y,z)` (E/pc num
 * ponto), nos pontos `quina + (s + 0,5)·voxel/sub` de cada eixo —
 * 8³ no bloco de 20 pc, 2³ (centro ± voxel/4) em cada nível da pirâmide.
 * Subamostra não finita conta como 0 e é contada em `naoFinitas`.
 * `aoTerminarFatia(processados, total)` (opcional) roda a cada fatia z.
 * Devolve `valores` (Float32Array, índice `indiceDe` da própria grade).
 */
export function coletarGrade(amostrador, grade, sub, aoTerminarFatia) {
  const { nx, ny, nz, voxelPc, origemPc } = grade;
  const passoSub = voxelPc / sub;
  const porVoxel = sub * sub * sub;
  const valores = new Float32Array(nx * ny * nz);
  let naoFinitas = 0;
  for (let iz = 0; iz < nz; iz += 1) {
    const cantoZ = origemPc[2] + iz * voxelPc;
    for (let iy = 0; iy < ny; iy += 1) {
      const cantoY = origemPc[1] + iy * voxelPc;
      for (let ix = 0; ix < nx; ix += 1) {
        const cantoX = origemPc[0] + ix * voxelPc;
        let soma = 0;
        for (let sz = 0; sz < sub; sz += 1) {
          const pz = cantoZ + (sz + 0.5) * passoSub;
          for (let sy = 0; sy < sub; sy += 1) {
            const py = cantoY + (sy + 0.5) * passoSub;
            for (let sx = 0; sx < sub; sx += 1) {
              const valor = amostrador(cantoX + (sx + 0.5) * passoSub, py, pz);
              if (Number.isFinite(valor)) soma += valor;
              else naoFinitas += 1;
            }
          }
        }
        valores[ix + nx * (iy + ny * iz)] = soma / porVoxel;
      }
    }
    if (aoTerminarFatia) aoTerminarFatia((iz + 1) * nx * ny, nx * ny * nz);
  }
  return { valores, naoFinitas };
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
 * Preserva no manifesto NOVO os ativos `kind === 'volume'`, a pirâmide
 * (`dustPyramid`) e as `sources` do manifesto ANTIGO que o novo ainda
 * não tem — `build-galactic-assets.mjs` reescreve o manifesto inteiro e
 * só sabe escrever Float32 (`writeFloat32Asset`), então os volumes
 * float16 e a pirâmide se perderiam a cada rodada sem isso. Muta e
 * devolve `manifestoNovo`; sem manifesto antigo, é a identidade (só
 * garante `assets`/`sources`).
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
  if (manifestoAntigo.dustPyramid && !('dustPyramid' in manifestoNovo)) {
    manifestoNovo.dustPyramid = manifestoAntigo.dustPyramid;
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

// ============================================================
// A PIRÂMIDE DE NÍVEIS (E3c do PLAN.md, DECISÃO de 28/09): n1 = 10 pc na
// caixa inteira, n2 = 5 pc onde r ≤ 900 pc, n3 = 2,5 pc onde r ≤ 450 pc;
// o pai do n1 é o bloco de 20 pc (n0, `dust-near-20pc.bin`, intocado).
// Referencial, eixos, índice e centros de voxel iguais aos do bloco, e a
// mesma origem (a quina −1250, −1250, −500): cada voxel do pai se divide
// em 2×2×2 do filho. Cada nível é cortado em tijolos de 32³ voxels de
// núcleo, gravados com uma aba de 1 voxel em cada face (34³), para o
// filtro trilinear da GPU funcionar dentro do atlas.
//
// O CAMPO de um nível é o que a GPU mostra nele: dentro de um tijolo
// gravado, o trilinear do tijolo (aba inclusa); num tijolo omitido ou
// que não existe, o campo do pai; no n0, o trilinear do bloco com as
// bordas clampadas. "Trilinear do pai", abaixo, é sempre esse campo.
//
// As regras do contrato, com as leituras que ele deixava abertas:
// - existe o tijolo cujo núcleo, recortado à caixa, toca a região do
//   nível (esfera r ≤ raio em volta do Sol; a caixa inteira sem raio), e
//   todo voxel dele dentro da caixa é MEDIDO (média de 2³ subamostras
//   estratificadas do operador do interpolador oficial,
//   `amostradorEdenhoferBilinear`) — inclusive o que passa do raio;
// - fora do nível — voxel fora da caixa (núcleo ou aba) ou aba num
//   tijolo que não existe — vale o trilinear do pai, com o ponto levado
//   antes à face mais próxima da caixa (o CLAMP_TO_EDGE);
// - a aba dentro do nível copia, bit a bit, o voxel MEDIDO do vizinho,
//   gravado ou omitido: os bytes de um tijolo não dependem da escolha
//   feita para o vizinho, e o tijolo gravado mostra o nível verdadeiro
//   até a face;
// - o tijolo só é gravado se max |nível − trilinear do pai| no núcleo
//   ≥ limiar (1e-3 E/pc), com os dois lados como a GPU os vê (o nível já
//   em float16; o pai decodificado do disco); omitido, a GPU cai no pai.
// ============================================================

/** O contrato da pirâmide (E3c do PLAN.md). O pai do nível 1 é `GRADE_20PC`. */
export const PIRAMIDE_POEIRA = {
  origemPc: [-1250, -1250, -500],
  tijolo: 32,
  limiarResiduo: 1e-3,
  subamostras: 2,
  niveis: [
    { nivel: 1, voxelPc: 10, dims: [250, 250, 100], raioPc: null },
    { nivel: 2, voxelPc: 5, dims: [500, 500, 200], raioPc: 900 },
    { nivel: 3, voxelPc: 2.5, dims: [1000, 1000, 400], raioPc: 450 },
  ],
};

/** Pasta da pirâmide, relativa a `public/` (como o `file` dos ativos do manifesto). */
export const DIRETORIO_PIRAMIDE = 'data/galaxy/dust-piramide';

/** `data/galaxy/dust-piramide/n<k>.json` — o índice do nível k. */
export function caminhoDoIndice(k) {
  return `${DIRETORIO_PIRAMIDE}/n${k}.json`;
}

/** `data/galaxy/dust-piramide/n<k>/<bi>_<bj>_<bk>.bin.gz` — o tijolo b do nível k. */
export function caminhoDoTijolo(k, [bi, bj, bk]) {
  return `${DIRETORIO_PIRAMIDE}/n${k}/${bi}_${bj}_${bk}.bin.gz`;
}

/** A grade (no formato de `GRADE_20PC`) de um nível da pirâmide. */
export function gradeDoNivel(piramide, nivel) {
  const [nx, ny, nz] = nivel.dims;
  return { nx, ny, nz, voxelPc: nivel.voxelPc, origemPc: piramide.origemPc };
}

/** Lança se a pirâmide não dividir cada voxel do pai em 2×2×2 a partir da mesma origem do n0. */
export function validarPiramide(piramide, gradeN0) {
  const iguais = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  if (!iguais(piramide.origemPc, gradeN0.origemPc)) {
    throw new Error(
      `validarPiramide: origem ${piramide.origemPc.join(',')} difere da do n0 (${gradeN0.origemPc.join(',')}).`
    );
  }
  if (!Number.isInteger(piramide.tijolo) || piramide.tijolo < 1) {
    throw new Error(`validarPiramide: tijolo de ${piramide.tijolo} voxels.`);
  }
  let pai = { voxelPc: gradeN0.voxelPc, dims: [gradeN0.nx, gradeN0.ny, gradeN0.nz] };
  piramide.niveis.forEach((nivel, i) => {
    if (nivel.nivel !== i + 1) {
      throw new Error(`validarPiramide: a posição ${i} tem o nível ${nivel.nivel}; esperado ${i + 1}.`);
    }
    if (nivel.voxelPc * 2 !== pai.voxelPc || !iguais(nivel.dims, pai.dims.map((d) => d * 2))) {
      throw new Error(
        `validarPiramide: o nível ${nivel.nivel} (${nivel.voxelPc} pc, ${nivel.dims.join('×')}) não divide ` +
          `cada voxel do pai (${pai.voxelPc} pc, ${pai.dims.join('×')}) em 2×2×2.`
      );
    }
    if (nivel.raioPc !== null && !(nivel.raioPc > 0)) {
      throw new Error(`validarPiramide: raio ${nivel.raioPc} no nível ${nivel.nivel}.`);
    }
    pai = nivel;
  });
}

/** Tijolos por eixo: `ceil(n / tijolo)` (o último pode passar da caixa). */
export function dimsEmTijolos(grade, tijolo) {
  return [Math.ceil(grade.nx / tijolo), Math.ceil(grade.ny / tijolo), Math.ceil(grade.nz / tijolo)];
}

/**
 * O tijolo (bi,bj,bk) existe no nível? Existe quando o núcleo dele,
 * recortado à caixa, toca a esfera r ≤ `raioPc` em volta do Sol (a
 * origem do referencial); com `raioPc === null`, todo tijolo da grade
 * existe. Índice fora da grade de tijolos → não existe.
 */
export function tijoloExiste(grade, tijolo, raioPc, bi, bj, bk) {
  const n = [grade.nx, grade.ny, grade.nz];
  const nb = dimsEmTijolos(grade, tijolo);
  const b = [bi, bj, bk];
  let distancia2 = 0;
  for (let eixo = 0; eixo < 3; eixo += 1) {
    if (!Number.isInteger(b[eixo]) || b[eixo] < 0 || b[eixo] >= nb[eixo]) return false;
    const lo = grade.origemPc[eixo] + tijolo * b[eixo] * grade.voxelPc;
    const hi = grade.origemPc[eixo] + Math.min(n[eixo], tijolo * (b[eixo] + 1)) * grade.voxelPc;
    const d = Math.max(lo, 0, -hi);
    distancia2 += d * d;
  }
  return raioPc === null || distancia2 <= raioPc * raioPc;
}

/** Os tijolos que existem no nível, em ordem de índice linear `bi + nbx·(bj + nby·bk)`. */
export function tijolosDoNivel(grade, tijolo, raioPc) {
  const [nbx, nby, nbz] = dimsEmTijolos(grade, tijolo);
  const lista = [];
  for (let bk = 0; bk < nbz; bk += 1) {
    for (let bj = 0; bj < nby; bj += 1) {
      for (let bi = 0; bi < nbx; bi += 1) {
        if (tijoloExiste(grade, tijolo, raioPc, bi, bj, bk)) lista.push([bi, bj, bk]);
      }
    }
  }
  return lista;
}

/** O campo da pirâmide a partir do n0 (`{grade, valores}` já decodificado). */
export function criarCampo(volumeN0) {
  return { n0: volumeN0, niveis: [] };
}

/**
 * Acrescenta o próximo nível ao campo: `gravados` é a lista
 * `{ b: [bi,bj,bk], dados }`, com `dados` os (tijolo+2)³ valores do
 * tijolo JÁ decodificados (E/pc, índice `sx + lado·(sy + lado·sz)`).
 * Tijolo fora da lista (omitido ou inexistente) cai no pai.
 */
export function adicionarNivel(campo, grade, tijolo, gravados) {
  const nb = dimsEmTijolos(grade, tijolo);
  const pagina = new Int32Array(nb[0] * nb[1] * nb[2]).fill(-1);
  const dados = [];
  for (const { b, dados: valores } of gravados) {
    pagina[b[0] + nb[0] * (b[1] + nb[1] * b[2])] = dados.length;
    dados.push(valores);
  }
  campo.niveis.push({ grade, tijolo, nb, pagina, dados });
}

function limitar(v, lo, hi) {
  if (v < lo) return lo;
  return v > hi ? hi : v;
}

/**
 * O campo do nível `k` em (x,y,z), em pc — o que a GPU mostra: desce do
 * nível k ao 1 até achar o tijolo gravado que contém o ponto e faz o
 * trilinear dentro dele (aba inclusa); sem tijolo gravado em nenhum,
 * o trilinear clampado do n0. Ponto fora da caixa vai antes à face.
 */
export function valorNoCampo(campo, k, x, y, z) {
  for (let n = k; n >= 1; n -= 1) {
    const { grade, tijolo, nb, pagina, dados } = campo.niveis[n - 1];
    const { voxelPc, origemPc } = grade;
    const gx = limitar((x - origemPc[0]) / voxelPc, 0, grade.nx);
    const gy = limitar((y - origemPc[1]) / voxelPc, 0, grade.ny);
    const gz = limitar((z - origemPc[2]) / voxelPc, 0, grade.nz);
    const bi = Math.min(Math.floor(gx / tijolo), nb[0] - 1);
    const bj = Math.min(Math.floor(gy / tijolo), nb[1] - 1);
    const bk = Math.min(Math.floor(gz / tijolo), nb[2] - 1);
    const vaga = pagina[bi + nb[0] * (bj + nb[1] * bk)];
    if (vaga < 0) continue;
    // voxel global g ↔ posição g − tijolo·b + 1 no tijolo gravado; o
    // texel m tem centro em m + 0,5, daí o +0,5 da coordenada contínua.
    return trilinearNoTijolo(
      dados[vaga],
      tijolo + 2,
      gx - tijolo * bi + 0.5,
      gy - tijolo * bj + 0.5,
      gz - tijolo * bk + 0.5
    );
  }
  return interpolarClampado(campo.n0, x, y, z);
}

/** Trilinear num tijolo gravado de `lado`³ texels; `u` em [0,5; lado − 1,5] não sai do tijolo. */
function trilinearNoTijolo(valores, lado, ux, uy, uz) {
  const i = Math.floor(ux);
  const j = Math.floor(uy);
  const k = Math.floor(uz);
  const tx = ux - i;
  const ty = uy - j;
  const tz = uz - k;
  const a = i + lado * (j + lado * k);
  const dy = lado;
  const dz = lado * lado;
  const c00 = valores[a] * (1 - tx) + valores[a + 1] * tx;
  const c10 = valores[a + dy] * (1 - tx) + valores[a + dy + 1] * tx;
  const c01 = valores[a + dz] * (1 - tx) + valores[a + dz + 1] * tx;
  const c11 = valores[a + dy + dz] * (1 - tx) + valores[a + dy + dz + 1] * tx;
  const c0 = c00 * (1 - ty) + c10 * ty;
  const c1 = c01 * (1 - ty) + c11 * ty;
  return c0 * (1 - tz) + c1 * tz;
}

/**
 * Gera um nível inteiro em memória: coleta o núcleo de cada tijolo que
 * existe (`amostrador(x,y,z)` → E/pc: o mapa na geração, um analítico
 * em teste), mede o resíduo contra o campo do pai (`campo`, que já tem
 * os níveis anteriores), grava só os tijolos acima do limiar e monta a
 * aba deles. Não mexe no `campo`: quem chama faz `adicionarNivel` com os
 * `gravados` antes do próximo nível. Cada gravado traz `bytes` (os
 * (tijolo+2)³ float16 LE × `escala`, o `.bin` do tijolo antes do gzip) e
 * `dados` (os mesmos valores decodificados, como a GPU e o `verify` os
 * leem).
 */
export function gerarNivel({ amostrador, campo, piramide, nivel, escala, aoProgredir }) {
  exigirLittleEndian('gerarNivel');
  const T = piramide.tijolo;
  const lado = T + 2;
  const k = nivel.nivel;
  const grade = gradeDoNivel(piramide, nivel);
  const { nx, ny, nz, voxelPc, origemPc } = grade;
  const nb = dimsEmTijolos(grade, T);
  const centro = (g, eixo) => origemPc[eixo] + (g + 0.5) * voxelPc;
  const lista = tijolosDoNivel(grade, T, nivel.raioPc);
  const nucleos = new Map(); // índice linear do tijolo → núcleo T³ em float16 × escala
  const aGravar = [];
  let naoFinitas = 0;
  let maiorResiduoOmitido = 0;

  lista.forEach(([bi, bj, bk], n) => {
    const i0 = T * bi;
    const j0 = T * bj;
    const k0 = T * bk;
    const ni = Math.min(T, nx - i0);
    const nj = Math.min(T, ny - j0);
    const nk = Math.min(T, nz - k0);
    const medido = coletarGrade(
      amostrador,
      {
        nx: ni,
        ny: nj,
        nz: nk,
        voxelPc,
        origemPc: [origemPc[0] + i0 * voxelPc, origemPc[1] + j0 * voxelPc, origemPc[2] + k0 * voxelPc],
      },
      piramide.subamostras
    );
    naoFinitas += medido.naoFinitas;
    const nucleo = new Float16Array(T * T * T);
    let residuo = 0;
    for (let lz = 0; lz < T; lz += 1) {
      const z = centro(k0 + lz, 2);
      for (let ly = 0; ly < T; ly += 1) {
        const y = centro(j0 + ly, 1);
        for (let lx = 0; lx < T; lx += 1) {
          const pai = valorNoCampo(campo, k - 1, centro(i0 + lx, 0), y, z);
          const li = lx + T * (ly + T * lz);
          const dentroDaCaixa = lx < ni && ly < nj && lz < nk;
          nucleo[li] = (dentroDaCaixa ? medido.valores[lx + ni * (ly + nj * lz)] : pai) * escala;
          const desvio = Math.abs(nucleo[li] / escala - pai);
          if (desvio > residuo) residuo = desvio;
        }
      }
    }
    nucleos.set(bi + nb[0] * (bj + nb[1] * bk), nucleo);
    if (residuo >= piramide.limiarResiduo) aGravar.push({ b: [bi, bj, bk], residuo });
    else if (residuo > maiorResiduoOmitido) maiorResiduoOmitido = residuo;
    if (aoProgredir) aoProgredir(n + 1, lista.length);
  });

  const gravados = aGravar.map(({ b, residuo }) => {
    const [bi, bj, bk] = b;
    const escalado = new Float16Array(lado * lado * lado);
    for (let sz = 0; sz < lado; sz += 1) {
      const gz = T * bk - 1 + sz;
      const vz = Math.floor(gz / T);
      for (let sy = 0; sy < lado; sy += 1) {
        const gy = T * bj - 1 + sy;
        const vy = Math.floor(gy / T);
        for (let sx = 0; sx < lado; sx += 1) {
          const gx = T * bi - 1 + sx;
          const vx = Math.floor(gx / T);
          const destino = sx + lado * (sy + lado * sz);
          const proprio = vx === bi && vy === bj && vz === bk;
          const dentroDaCaixa = gx >= 0 && gx < nx && gy >= 0 && gy < ny && gz >= 0 && gz < nz;
          const fonte = proprio || dentroDaCaixa ? nucleos.get(vx + nb[0] * (vy + nb[1] * vz)) : undefined;
          escalado[destino] = fonte
            ? fonte[gx - T * vx + T * (gy - T * vy + T * (gz - T * vz))]
            : valorNoCampo(campo, k - 1, centro(gx, 0), centro(gy, 1), centro(gz, 2)) * escala;
        }
      }
    }
    const bytes = Buffer.from(escalado.buffer, escalado.byteOffset, escalado.byteLength);
    return { b, residuo, bytes, dados: deFloat16(bytes, escala) };
  });

  return {
    nivel: k,
    grade,
    raioPc: nivel.raioPc,
    tijolosExistentes: lista.length,
    gravados,
    naoFinitas,
    maiorResiduoOmitido,
  };
}

/**
 * Tolerância da referência por nível, CÉLULA A CÉLULA (revisão de 28/09):
 * os níveis coletam com o operador do interpolador oficial
 * (`amostradorEdenhoferBilinear`, os pesos do healpy provados pela
 * fixture `healpix-interp-nside256.json`), então entre a célula gravada e
 * a referência só resta o float16 do disco — meio ulp, no máximo 2⁻¹¹ ≈
 * 4,9e-4 relativo (2,98e-11 E/pc no subnormal). Folga:
 * `celulaRelativa·max(atual, ref) + celulaAbsoluta`, um teto garantido
 * de 0,49 da folga no certo. Medido em dados sintéticos
 * (build-dust-volumes.test.mjs, céu HEALPix com nuvens de 2–6 pc a
 * ~200 pc, pixel da ordem do voxel), pior célula em folgas: certo 0,47
 * (n1) e 0,48 (n2) em tijolo gravado; um voxel de deslocamento ≥ 627, o
 * espelho ≥ 900, a unidade ×1,01 ≥ 10,3 e ×1000 ou ÷1000 ≥ 999; o
 * operador antigo (pixel mais próximo) 140–177. Célula em tijolo
 * OMITIDO mostra o pai: ganha o limiar do resíduo de folga (medido ≤ 0,95).
 * Menos de `minimoEmTijoloGravado` células em tijolo gravado → a
 * referência não prova o nível.
 */
export const TOLERANCIA_NIVEL = {
  celulaRelativa: 1e-3,
  celulaAbsoluta: 1e-9,
  minimoEmTijoloGravado: 8,
};

/**
 * Compara o nível `k` do `campo` (os níveis 1..k já acrescentados) com a
 * referência do nível (`fixture.niveis[i]` de
 * `fixtures/edenhofer-referencia-niveis.json`: `{nivel, grade, raioPc,
 * celulas: [{indice, media, nanFracao}]}`, cada `media` a média de 2³
 * subamostras estratificadas do interpolador oficial no voxel do nível).
 * O valor comparado é o campo no centro do voxel — o voxel gravado,
 * quando o tijolo foi gravado; o pai, quando foi omitido. Referência
 * ausente, de outra grade, vazia, com célula inválida ou fora do nível
 * → `{ aplicavel: false, motivo }`, nunca um "OK" por falta de dado.
 */
export function compararNivelComReferencia(campo, piramide, k, referencia) {
  const nivel = piramide.niveis[k - 1];
  const grade = gradeDoNivel(piramide, nivel);
  const camada = campo.niveis[k - 1];
  if (!referencia) return { aplicavel: false, motivo: `a referência não tem o nível ${k}.` };
  if (!gradeIgualAFixture(grade, referencia.grade) || referencia.raioPc !== nivel.raioPc) {
    return {
      aplicavel: false,
      motivo:
        `grade/raio da referência do nível ${k} (${JSON.stringify(referencia.grade)}, raio ${referencia.raioPc}) ` +
        `diferem do contrato (${grade.nx}×${grade.ny}×${grade.nz} @ ${grade.voxelPc} pc, raio ${nivel.raioPc}).`,
    };
  }
  if (!Array.isArray(referencia.celulas) || referencia.celulas.length < 1) {
    return { aplicavel: false, motivo: `referência do nível ${k} sem células — nada para comparar.` };
  }
  const dims = [grade.nx, grade.ny, grade.nz];
  const T = piramide.tijolo;
  const tolerancia = TOLERANCIA_NIVEL;
  let maximoRelativo = 0;
  let pior = null;
  let emTijoloGravado = 0;
  for (const celula of referencia.celulas) {
    const { indice, media } = celula;
    const valido =
      Array.isArray(indice) &&
      indice.length === 3 &&
      indice.every((v, eixo) => Number.isInteger(v) && v >= 0 && v < dims[eixo]);
    if (!valido) {
      return { aplicavel: false, motivo: `nível ${k}: célula com índice fora da grade (${JSON.stringify(indice)}).` };
    }
    if (!Number.isFinite(media) || media < 0) {
      return { aplicavel: false, motivo: `nível ${k}: célula ${JSON.stringify(indice)} com media inválida (${media}).` };
    }
    const b = indice.map((v) => Math.floor(v / T));
    if (!tijoloExiste(grade, T, nivel.raioPc, ...b)) {
      return { aplicavel: false, motivo: `nível ${k}: célula ${JSON.stringify(indice)} fora do nível.` };
    }
    const gravada = camada.pagina[b[0] + camada.nb[0] * (b[1] + camada.nb[1] * b[2])] >= 0;
    const esperado = celula.nanFracao === 1 ? 0 : media;
    const atual = valorNoCampo(campo, k, ...centroDe(grade, ...indice));
    const desvio = Math.abs(atual - esperado);
    const folga =
      tolerancia.celulaRelativa * Math.max(atual, esperado) +
      tolerancia.celulaAbsoluta +
      (gravada ? 0 : piramide.limiarResiduo);
    const relativo = desvio / folga;
    if (pior === null || relativo > maximoRelativo) {
      maximoRelativo = relativo;
      pior = { indice, esperado, atual, gravada };
    }
    if (gravada) emTijoloGravado += 1;
  }
  if (emTijoloGravado < tolerancia.minimoEmTijoloGravado) {
    return {
      aplicavel: false,
      motivo:
        `nível ${k}: só ${emTijoloGravado} das ${referencia.celulas.length} células caem em tijolo gravado ` +
        `(mínimo ${tolerancia.minimoEmTijoloGravado}) — a referência não prova o nível.`,
    };
  }
  return {
    aplicavel: true,
    celulas: referencia.celulas.length,
    emTijoloGravado,
    maximoRelativo,
    pior,
    aprovado: maximoRelativo <= 1,
  };
}
