// ============================================================
// `npm run data:poeira` (E1, item 2 do PLAN.md): lê o mapa de poeira 3D
// de Edenhofer et al. 2024 (mean_and_std_healpix.fits, ~3 GB, baixado
// sob demanda em `.cache/`), coleta a média em cada voxel de
// `GRADE_20PC` (scripts/data/lib/volume.mjs) por amostragem estratificada
// 8×8×8, grava `dust-near-20pc.bin`(+`.gz`) em float16, mescla o
// resultado no manifesto sem apagar os outros ativos, desenha duas
// projeções PNG de conferência e roda `compararComReferencia` contra a
// fixture do interpolador oficial.
//
// `npm run data:poeira-niveis` (E3c do PLAN.md) roda o MESMO arquivo com
// `--niveis`: a pirâmide n1/n2/n3 (10/5/2,5 pc) em tijolos 34³ sobre o
// bloco de 20 pc já publicado (`executarNiveis`, mais abaixo).
//
// NÃO faz parte da suíte: baixa 3 GB e roda ~400 M subamostras (a
// pirâmide, ~520 M). O dono roda com `npm run data:poeira` /
// `npm run data:poeira-niveis`; aqui só `main()`/`mainNiveis()` são
// pontos de entrada diretos — o resto é exportado para os testes.
// ============================================================
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, statSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import sharp from 'sharp';
import { abrirFits, lerColunaTabela, lerImagemInteira } from './lib/fits.mjs';
import { ang2pixNest, criarInterpolacaoNest } from './lib/healpix.mjs';
import { sha256 } from './lib/binary.mjs';
import {
  DIRETORIO_PIRAMIDE,
  GRADE_20PC,
  LIMITE_E_POR_PC,
  PIRAMIDE_POEIRA,
  TOLERANCIA_NIVEL,
  adicionarNivel,
  caminhoDoIndice,
  caminhoDoTijolo,
  coletarGrade,
  compararComReferencia,
  compararNivelComReferencia,
  criarCampo,
  deFloat16,
  dimsEmTijolos,
  gerarNivel,
  indiceDe,
  paraFloat16,
  validarPiramide,
} from './lib/volume.mjs';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const cacheDirectory = path.join(rootDirectory, '.cache', 'galaxy-data', 'edenhofer2024');
const caminhoFits = path.join(cacheDirectory, 'mean_and_std_healpix.fits');
const esperadoPath = path.join(cacheDirectory, 'ESPERADO.txt');
const publicDirectory = path.join(rootDirectory, 'public');
const outputDirectory = path.join(publicDirectory, 'data', 'galaxy');
const manifestPath = path.join(outputDirectory, 'manifest.json');
const fixturePath = path.join(rootDirectory, 'scripts', 'data', 'fixtures', 'edenhofer-referencia.json');
const fixtureNiveisPath = path.join(rootDirectory, 'scripts', 'data', 'fixtures', 'edenhofer-referencia-niveis.json');
const capturasDirectory = path.join(rootDirectory, 'capturas');

const ESCALA = 1000;
const NSIDE = 256;
const SUB = 8; // 8×8×8 subamostras por voxel

let tUltimaFase = Date.now();
function fase(nome) {
  const agora = Date.now();
  console.log(`  → ${nome}: ${((agora - tUltimaFase) / 1000).toFixed(1)}s`);
  tUltimaFase = agora;
}

/** Lê `SIZE md5:HASH URL` de ESPERADO.txt. */
export function parsearEsperado(texto) {
  const [tamanho, md5Rotulado, url] = texto.trim().split(/\s+/);
  return { tamanho: Number(tamanho), md5: md5Rotulado.replace(/^md5:/, ''), url };
}

/** md5 do arquivo inteiro, por streaming (o FITS tem ~3 GB, não cabe num Buffer só para isso). */
export async function md5DoArquivo(caminho) {
  const hash = createHash('md5');
  for await (const pedaco of createReadStream(caminho)) hash.update(pedaco);
  return hash.digest('hex');
}

/** Baixa `url` por streaming para `destino`, via um `.parcial` renomeado só ao final. */
export async function baixar(url, destino) {
  const parcial = `${destino}.parcial`;
  console.log(`baixando ${url}`);
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`baixar: HTTP ${resposta.status} ao buscar ${url}.`);
  const totalBytes = Number(resposta.headers.get('content-length')) || 0;
  await mkdir(path.dirname(destino), { recursive: true });
  const saida = createWriteStream(parcial);
  let recebidos = 0;
  let marcoMB = 0;
  const inicio = Date.now();
  for await (const pedaco of resposta.body) {
    await new Promise((resolve, reject) => saida.write(pedaco, (erro) => (erro ? reject(erro) : resolve())));
    recebidos += pedaco.length;
    const mb = recebidos / 1e6;
    if (mb - marcoMB >= 100) {
      marcoMB = mb;
      const segundos = (Date.now() - inicio) / 1000;
      const alvo = totalBytes ? ` / ${(totalBytes / 1e6).toFixed(0)} MB` : '';
      console.log(`  download: ${mb.toFixed(0)} MB${alvo} em ${segundos.toFixed(0)}s`);
    }
  }
  await new Promise((resolve, reject) => saida.end((erro) => (erro ? reject(erro) : resolve())));
  await rename(parcial, destino);
}

/** Garante o FITS em `caminho`: baixa se faltar, sempre confere tamanho e md5 contra `esperadoPath`. */
export async function garantirMapa(caminho, caminhoEsperado) {
  const esperado = parsearEsperado(await readFile(caminhoEsperado, 'utf8'));
  if (!existsSync(caminho)) {
    await baixar(esperado.url, caminho);
  }
  const tamanhoReal = statSync(caminho).size;
  console.log(`mapa: ${(tamanhoReal / 1e9).toFixed(2)} GB (esperado ${(esperado.tamanho / 1e9).toFixed(2)} GB)`);
  if (tamanhoReal !== esperado.tamanho) {
    throw new Error(`garantirMapa: tamanho ${tamanhoReal} diverge do esperado ${esperado.tamanho}.`);
  }
  const md5Real = await md5DoArquivo(caminho);
  console.log(`md5: ${md5Real} (esperado ${esperado.md5})`);
  if (md5Real !== esperado.md5) {
    throw new Error(`garantirMapa: md5 ${md5Real} diverge do esperado ${esperado.md5}.`);
  }
}

/** Acha o HDU IMAGE "MEAN", NSIDE 256 / NEST (mesmo nome que `edenhofer_interp.get_sphere` usa). */
export function acharHduMedia(hdus) {
  const hdu = hdus.find((h) => h.tipo === 'IMAGE' && h.extname && h.extname.toLowerCase() === 'mean');
  if (!hdu) throw new Error('acharHduMedia: HDU "MEAN" não encontrado no FITS.');
  const ordering = String(hdu.cabecalho.ORDERING ?? '').trim().toLowerCase();
  if (hdu.cabecalho.NSIDE !== NSIDE || !ordering.startsWith('nest')) {
    throw new Error(
      `acharHduMedia: esperado NSIDE=${NSIDE}/NEST; achado NSIDE=${hdu.cabecalho.NSIDE}, ORDERING=${hdu.cabecalho.ORDERING}.`
    );
  }
  return hdu;
}

/** Acha o BINTABLE de coluna única "radial pixel centers" (os 516 centros de casca). */
export function acharTabelaCentros(hdus) {
  const hdu = hdus.find(
    (h) => h.tipo === 'BINTABLE' && h.colunas?.length === 1 && h.colunas[0].nome === 'radial pixel centers'
  );
  if (!hdu) throw new Error('acharTabelaCentros: tabela "radial pixel centers" não encontrada no FITS.');
  return hdu;
}

/** Índice `i` tal que `radii[i] ≤ r < radii[i+1]` (bin meio-aberto), por busca binária. */
export function buscarCasca(radii, r) {
  let lo = 0;
  let hi = radii.length - 2;
  while (lo < hi) {
    const meio = (lo + hi + 1) >> 1;
    if (radii[meio] <= r) lo = meio;
    else hi = meio - 1;
  }
  return lo;
}

/**
 * A densidade do mapa num ponto (x,y,z) heliocêntrico, em pc: pixel
 * HEALPix mais próximo + linear em r entre centros de casca vizinhos;
 * fora de [radii[0], radii.at(-1)) vale 0. Dentro de radii[0] (interior
 * de 68,8 pc): zero por escolha do app, com transição de resolução de
 * ~1 voxel na fronteira (a média das subamostras atravessa a
 * superfície) — não é "medido vazio". Fora de radii.at(-1): fora da
 * cobertura do mapa, esse zero é ausência real. Valor não finito sai
 * como está: quem coleta (`coletarGrade`) conta e zera. É o operador do
 * bloco de 20 pc (n0), que não muda; os níveis da pirâmide usam
 * `amostradorEdenhoferBilinear`.
 */
export function amostradorEdenhofer(imagem, radii, nPix) {
  const rMin = radii[0];
  const rMax = radii[radii.length - 1];
  return (px, py, pz) => {
    const r = Math.sqrt(px * px + py * py + pz * pz);
    if (!(r >= rMin && r < rMax)) return 0;
    const theta = Math.acos(pz / r);
    let phi = Math.atan2(py, px);
    if (phi < 0) phi += 2 * Math.PI;
    const pix = ang2pixNest(NSIDE, theta, phi);
    const casca = buscarCasca(radii, r);
    const r0 = radii[casca];
    const r1 = radii[casca + 1];
    const v0 = imagem[casca * nPix + pix];
    const v1 = imagem[(casca + 1) * nPix + pix];
    return v0 + (v1 - v0) * ((r - r0) / (r1 - r0));
  };
}

/**
 * O operador do interpolador OFICIAL (`interp_hp2rg` de
 * `edenhofer_interp.py`), o dos níveis da pirâmide: em cada uma das duas
 * cascas vizinhas, a interpolação bilinear HEALPix NEST (os 4 pixels e
 * pesos de `criarInterpolacaoNest`, os do healpy), e entre elas o linear
 * em r na forma do oficial, `(1 − w)·v0 + w·v1`. Fora de
 * [radii[0], radii.at(-1)) vale 0 — onde o oficial dá NaN, que a
 * referência também conta como 0. Quatro leituras por casca em vez de
 * uma: é o que faz cada célula bater com a referência na precisão do
 * float16, e não só na média.
 */
export function amostradorEdenhoferBilinear(imagem, radii, nPix) {
  const rMin = radii[0];
  const rMax = radii[radii.length - 1];
  const interpolar = criarInterpolacaoNest(NSIDE);
  const pixels = new Int32Array(4);
  const pesos = new Float64Array(4);
  return (px, py, pz) => {
    const r = Math.sqrt(px * px + py * py + pz * pz);
    if (!(r >= rMin && r < rMax)) return 0;
    let phi = Math.atan2(py, px);
    if (phi < 0) phi += 2 * Math.PI;
    interpolar(Math.acos(pz / r), phi, pixels, pesos);
    const casca = buscarCasca(radii, r);
    const base0 = casca * nPix;
    const base1 = base0 + nPix;
    let v0 = 0;
    let v1 = 0;
    for (let m = 0; m < 4; m += 1) {
      v0 += imagem[base0 + pixels[m]] * pesos[m];
      v1 += imagem[base1 + pixels[m]] * pesos[m];
    }
    const w = (r - radii[casca]) / (radii[casca + 1] - radii[casca]);
    return (1 - w) * v0 + w * v1;
  };
}

/**
 * Coleta a média de cada voxel de `GRADE_20PC`: 8×8×8 subamostras
 * estratificadas (`coletarGrade`) do `amostradorEdenhofer`.
 */
export function coletar(imagem, radii, nPix) {
  const inicio = Date.now();
  let proximoMarco = 0.1;
  const { valores, naoFinitas } = coletarGrade(
    amostradorEdenhofer(imagem, radii, nPix),
    GRADE_20PC,
    SUB,
    (processados, total) => {
      while (processados / total >= proximoMarco - 1e-9) {
        const segundos = (Date.now() - inicio) / 1000;
        console.log(`  coleta: ${Math.round(proximoMarco * 100)}% (${processados}/${total} voxels) em ${segundos.toFixed(1)}s`);
        proximoMarco += 0.1;
      }
    }
  );
  return { valoresGrid: valores, nanSubsamples: naoFinitas };
}

/** Abre o FITS, lê os centros de casca e a média inteira (~1,6 GB) e fecha o arquivo. */
export function lerMapaEdenhofer(caminhoFits) {
  const hdus = abrirFits(caminhoFits);
  const hduMedia = acharHduMedia(hdus);
  const tabelaCentros = acharTabelaCentros(hdus);
  const radii = lerColunaTabela(tabelaCentros, 'radial pixel centers', { exigirFinito: true });
  const nPix = hduMedia.naxisn[0];
  if (radii.length !== hduMedia.naxisn[1]) {
    hdus.fechar();
    throw new Error(`lerMapaEdenhofer: ${radii.length} centros de casca não batem com NAXIS2=${hduMedia.naxisn[1]}.`);
  }
  console.log(`raios: ${radii.length} cascas, ${radii[0].toFixed(4)}–${radii[radii.length - 1].toFixed(4)} pc`);
  const imagem = lerImagemInteira(hduMedia);
  hdus.fechar();
  return { imagem, radii, nPix };
}

/** Se `caminho` já existe, devolve `-v2`/`-v3`/… ao lado; nunca sobrescreve. */
export function proximoCaminhoLivre(caminho) {
  if (!existsSync(caminho)) return caminho;
  const ext = path.extname(caminho);
  const base = path.basename(caminho, ext);
  const dir = path.dirname(caminho);
  for (let v = 2; ; v += 1) {
    const candidato = path.join(dir, `${base}-v${v}${ext}`);
    if (!existsSync(candidato)) return candidato;
  }
}

const PALETA_INFERNO = [
  [0, 0, 4], [40, 11, 84], [101, 21, 110], [159, 42, 99],
  [212, 72, 66], [245, 125, 21], [250, 193, 39], [252, 255, 164],
];

/** Cor RGB (0–255) na paleta "inferno" para `log10(valor)` normalizado entre `lo` e `hi`. */
export function corInferno(valor, lo, hi) {
  const log = Math.log10(Math.max(valor, 1e-12));
  const t = Math.min(1, Math.max(0, (log - lo) / (hi - lo)));
  const x = t * (PALETA_INFERNO.length - 1);
  const i = Math.min(Math.floor(x), PALETA_INFERNO.length - 2);
  const w = x - i;
  const a = PALETA_INFERNO[i];
  const b = PALETA_INFERNO[i + 1];
  return [
    Math.floor(a[0] + (b[0] - a[0]) * w),
    Math.floor(a[1] + (b[1] - a[1]) * w),
    Math.floor(a[2] + (b[2] - a[2]) * w),
  ];
}

/** Percentil `p` (0–100) de um array JÁ ORDENADO, por interpolação linear (convenção do numpy). */
export function percentil(valoresOrdenados, p) {
  const n = valoresOrdenados.length;
  if (n === 0) return 0;
  if (n === 1) return valoresOrdenados[0];
  const posicao = (p / 100) * (n - 1);
  const i0 = Math.floor(posicao);
  const i1 = Math.min(i0 + 1, n - 1);
  const fracao = posicao - i0;
  return valoresOrdenados[i0] * (1 - fracao) + valoresOrdenados[i1] * fracao;
}

/** [lo, hi] em log10, dos percentis 2 e 99,7 das colunas positivas (escala da paleta). */
export function limitesLog(valoresPositivos) {
  const ordenados = Float64Array.from(valoresPositivos).sort();
  return [Math.log10(percentil(ordenados, 2)), Math.log10(percentil(ordenados, 99.7))];
}

/** Soma em z (coluna "de cima"), já orientada: linha 0 = X máximo, coluna 0 = Y máximo. */
export function projecaoDeCima(valoresGrid) {
  const { nx, ny, nz, voxelPc } = GRADE_20PC;
  const rgb = Buffer.alloc(nx * ny * 3);
  const somas = new Float64Array(nx * ny);
  for (let iy = 0; iy < ny; iy += 1) {
    for (let ix = 0; ix < nx; ix += 1) {
      let soma = 0;
      for (let iz = 0; iz < nz; iz += 1) soma += valoresGrid[indiceDe(GRADE_20PC, ix, iy, iz)];
      somas[ix + nx * iy] = soma * voxelPc;
    }
  }
  const positivos = [];
  for (const v of somas) if (v > 0) positivos.push(v);
  const [lo, hi] = limitesLog(positivos);
  for (let ix = 0; ix < nx; ix += 1) {
    const linha = nx - 1 - ix; // X para CIMA
    for (let iy = 0; iy < ny; iy += 1) {
      const coluna = ny - 1 - iy; // Y (l=90°) para a ESQUERDA
      const [r, g, b] = corInferno(somas[ix + nx * iy], lo, hi);
      const off = (linha * ny + coluna) * 3;
      rgb[off] = r;
      rgb[off + 1] = g;
      rgb[off + 2] = b;
    }
  }
  return { rgb, largura: ny, altura: nx };
}

/** Soma em y (coluna "de lado"), já orientada: linha 0 = Z máximo, coluna 0 = X mínimo. */
export function projecaoDeLado(valoresGrid) {
  const { nx, ny, nz, voxelPc } = GRADE_20PC;
  const rgb = Buffer.alloc(nx * nz * 3);
  const somas = new Float64Array(nx * nz);
  for (let iz = 0; iz < nz; iz += 1) {
    for (let ix = 0; ix < nx; ix += 1) {
      let soma = 0;
      for (let iy = 0; iy < ny; iy += 1) soma += valoresGrid[indiceDe(GRADE_20PC, ix, iy, iz)];
      somas[ix + nx * iz] = soma * voxelPc;
    }
  }
  const positivos = [];
  for (const v of somas) if (v > 0) positivos.push(v);
  const [lo, hi] = limitesLog(positivos);
  for (let iz = 0; iz < nz; iz += 1) {
    const linha = nz - 1 - iz; // Z para CIMA
    for (let ix = 0; ix < nx; ix += 1) {
      const coluna = ix; // X para a DIREITA
      const [r, g, b] = corInferno(somas[ix + nx * iz], lo, hi);
      const off = (linha * nx + coluna) * 3;
      rgb[off] = r;
      rgb[off + 1] = g;
      rgb[off + 2] = b;
    }
  }
  return { rgb, largura: nx, altura: nz };
}

async function salvarProjecaoPng({ rgb, largura, altura }, larguraFinal, alturaFinal, caminho) {
  const destino = proximoCaminhoLivre(caminho);
  await mkdir(path.dirname(destino), { recursive: true });
  await sharp(rgb, { raw: { width: largura, height: altura, channels: 3 } })
    .resize(larguraFinal, alturaFinal, { kernel: 'linear', fit: 'fill' })
    .png()
    .toFile(destino);
  console.log(`  projeção: ${path.relative(rootDirectory, destino)}`);
}

/**
 * Núcleo testável do builder (E1, revisão item 1): calcula o bloco,
 * codifica em float16 e COMPARA COM A FIXTURE EM MEMÓRIA antes de
 * gravar qualquer coisa. Fixture ausente ou reprovação → lança e nada é
 * gravado em `diretorioSaida`/`caminhoManifesto`; só depois de aprovar é
 * que `.bin`/`.gz` são gravados e, por último, o manifesto (mesclado a
 * partir do que já existir em `caminhoManifesto`). `main()` só resolve
 * os caminhos reais (+ `garantirMapa`) e chama isto.
 */
export async function executar({ caminhoFits, caminhoFixture, diretorioSaida, caminhoManifesto }) {
  // (a) a fixture é exigida ANTES de ler o FITS/coletar: sem ela, nada
  // se compara, e o erro precisa ser claro e imediato — não um "pulei a
  // comparação" silencioso (revisão E1, item 1).
  if (!existsSync(caminhoFixture)) {
    throw new Error(`executar: fixture de referência não encontrada em ${caminhoFixture}; nada foi gravado.`);
  }
  const fixture = JSON.parse(await readFile(caminhoFixture, 'utf8'));

  const { imagem, radii, nPix } = lerMapaEdenhofer(caminhoFits);
  fase('leitura do FITS (~1,6 GB)');

  const { valoresGrid, nanSubsamples } = coletar(imagem, radii, nPix);
  console.log(`subamostras não finitas: ${nanSubsamples}`);
  fase('coleta (8×8×8 subamostras por voxel)');

  // (b) codifica e compara EM MEMÓRIA — nenhuma escrita em disco até aqui.
  const codificado = paraFloat16(valoresGrid, ESCALA);
  const buffer = Buffer.from(codificado.buffer, codificado.byteOffset, codificado.byteLength);
  const hash = sha256(buffer);
  fase('codificação float16');

  const volume = { grade: GRADE_20PC, valores: deFloat16(buffer, ESCALA) };
  const resultado = compararComReferencia(volume, fixture);
  if (!resultado.aplicavel) {
    throw new Error(`executar: fixture não se aplica à grade do bloco atual (${resultado.motivo}); nada foi gravado.`);
  }
  const piorFaixa = resultado.coluna.piorFaixa;
  const piorDesvio = resultado.coluna.piorDesvio;
  const faixaTexto = piorFaixa
    ? `${piorFaixa.nome} razão p/ média do tubo ${piorFaixa.razaoMedia.toFixed(2)}` +
      (piorFaixa.atual < piorFaixa.esperadoFaixa[0] || piorFaixa.atual > piorFaixa.esperadoFaixa[1]
        ? ' — FORA DA FAIXA do tubo (plausibilidade, não reprova)'
        : ' — dentro da faixa do tubo')
    : '—';
  const desvioTexto = piorDesvio ? `${piorDesvio.nome} desvio relativo ${piorDesvio.desvioRelativo.toFixed(3)}` : '—';
  // (c) reprovação: lança com os números, sem tocar em disco.
  if (!resultado.voxel.aprovado || !resultado.coluna.aprovado) {
    throw new Error(
      `executar: comparação com a fixture Edenhofer FORA DA TOLERÂNCIA — ` +
        `voxel máximo relativo ${resultado.voxel.maximoRelativo.toFixed(3)}; ` +
        `coluna máximo relativo ${resultado.coluna.maximoRelativo.toFixed(3)} (pior desvio: ${desvioTexto}; ` +
        `faixa do tubo: ${faixaTexto}). Nada foi gravado.`
    );
  }
  console.log(
    `comparação com a fixture — voxel: máximo relativo ${resultado.voxel.maximoRelativo.toFixed(3)} ` +
      `(dentro da tolerância); coluna: máximo relativo ${resultado.coluna.maximoRelativo.toFixed(3)} ` +
      `(dentro da tolerância; pior desvio: ${desvioTexto}; faixa do tubo (plausibilidade): ${faixaTexto}).`
  );
  if (fixture.convergencia) {
    console.log(
      `convergência 8³→16³ (40 voxels): máximo relativo ${fixture.convergencia.maxRelativo.toFixed(3)}, ` +
        `médio relativo ${fixture.convergencia.medioRelativo.toFixed(3)}.`
    );
  }
  fase('comparação com a fixture');

  // (d) só agora, aprovado, grava: .bin, .gz e por ÚLTIMO o manifesto.
  await mkdir(diretorioSaida, { recursive: true });
  const destinoBin = path.join(diretorioSaida, 'dust-near-20pc.bin');
  await writeFile(destinoBin, buffer);
  await writeFile(`${destinoBin}.gz`, gzipSync(buffer, { level: 9 }));
  console.log(`gravado: ${destinoBin} (${(buffer.byteLength / 1e6).toFixed(2)} MB), sha256 ${hash}`);
  fase('escrita do .bin/.gz');

  const manifest = JSON.parse(await readFile(caminhoManifesto, 'utf8'));
  manifest.assets.dustVolumeNear20pc = {
    kind: 'volume',
    file: 'data/galaxy/dust-near-20pc.bin',
    dims: [GRADE_20PC.nx, GRADE_20PC.ny, GRADE_20PC.nz],
    count: valoresGrid.length,
    voxelPc: GRADE_20PC.voxelPc,
    originPc: GRADE_20PC.origemPc,
    frame: 'heliocentric-galactic: x→GC (l=0,b=0), y→l=90°, z→NGP; index ix + nx*(iy + ny*iz)',
    unit: 'E_ZGR23 per pc',
    scale: ESCALA,
    type: 'float16',
    byteLength: buffer.byteLength,
    sha256: hash,
    innerRadiusPc: radii[0],
    outerRadiusPc: radii[radii.length - 1],
    method:
      'nearest HEALPix pixel + linear in r between shell centres; 8×8×8 stratified subsamples per voxel; ' +
      'inner 68.8 pc left at zero by app choice, with a ~1-voxel resolution transition at the boundary ' +
      '(the average straddles the surface), not a measured absence',
    nanSubsamples,
    generated: new Date().toISOString().slice(0, 10),
    source: 'Edenhofer2024',
    license: 'CC-BY-4.0',
  };
  if (!manifest.sources.some((s) => s.id === 'Edenhofer2024')) {
    manifest.sources.push({
      id: 'Edenhofer2024',
      role: '3D dust extinction density (mean map) within 1.25 kpc of the Sun',
      paper: 'https://doi.org/10.1051/0004-6361/202347628',
      archive: 'https://doi.org/10.5281/zenodo.10658339',
      license: 'CC-BY-4.0',
    });
  }
  await writeFile(caminhoManifesto, `${JSON.stringify(manifest, null, 2)}\n`);
  fase('manifesto mesclado');

  return { valoresGrid, nanSubsamples, buffer, hash, resultado };
}

export async function main() {
  const t0 = Date.now();
  await garantirMapa(caminhoFits, esperadoPath);
  fase('verificação do FITS (tamanho + md5)');

  const { valoresGrid } = await executar({
    caminhoFits,
    caminhoFixture: fixturePath,
    diretorioSaida: outputDirectory,
    caminhoManifesto: manifestPath,
  });

  await salvarProjecaoPng(
    projecaoDeCima(valoresGrid),
    500,
    500,
    path.join(capturasDirectory, 'poeira-bloco-20pc-de-cima.png')
  );
  await salvarProjecaoPng(
    projecaoDeLado(valoresGrid),
    1000,
    400,
    path.join(capturasDirectory, 'poeira-bloco-20pc-de-lado.png')
  );
  fase('projeções PNG');

  console.log(`total: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

// ============================================================
// A PIRÂMIDE (E3c do PLAN.md) — `npm run data:poeira-niveis`. O contrato
// e as regras (aba, esparsidade por resíduo, fora do nível) estão em
// `lib/volume.mjs` (`PIRAMIDE_POEIRA`, `gerarNivel`); aqui é o FITS, a
// validação em memória, os arquivos e o manifesto.
// ============================================================

const DESCRICAO_REGIAO =
  'bricks whose core, clipped to the box, touches r <= radiusPc around the Sun (the whole box when null); ' +
  'every in-box voxel of an existing brick is measured, also beyond the radius';
const DESCRICAO_FORA =
  'voxel outside the box (core or halo) or halo in a brick that does not exist: parent trilinear, ' +
  'the point first clamped to the box faces (CLAMP_TO_EDGE)';
const DESCRICAO_ABA =
  'inside the level the halo copies the neighbour measured voxel bit for bit, stored or omitted neighbour alike';
const DESCRICAO_ESPARSIDADE =
  'a brick is stored only if max |level - parent trilinear| over its core >= residualThreshold (level in float16, ' +
  'parent decoded as on disk); an omitted brick renders as its parent';

/**
 * JSON do índice legível e estável: cabeçalho indentado, um tijolo por
 * linha (a lista chega a centenas de entradas).
 */
function textoDoIndice(indice) {
  const { bricks, ...cabecalho } = indice;
  const linhas = bricks.map((t) => `    ${JSON.stringify(t)}`).join(',\n');
  const esqueleto = JSON.stringify({ ...cabecalho, bricks: [] }, null, 2);
  return `${esqueleto.replace('"bricks": []', () => `"bricks": [\n${linhas}\n  ]`)}\n`;
}

/**
 * Os arquivos da pirâmide EM MEMÓRIA (gzip nível 9 de cada tijolo,
 * sha256 e bytes do `.bin.gz`, um índice por nível) e a entrada
 * `dustPyramid` do manifesto. `niveis` é a saída de `gerarNivel`, em
 * ordem; `n0` é `{ file, sha256 }` do bloco de 20 pc sobre o qual a
 * pirâmide foi gerada — o índice do n1 aponta para ele, o de cada nível
 * seguinte para o sha256 do índice anterior, e o manifesto para os três.
 */
export function montarArtefatosDaPiramide(niveis, { piramide, escala, n0, gerado }) {
  const arquivos = [];
  const levels = [];
  let pai = { level: 0, asset: 'dustVolumeNear20pc', file: n0.file, sha256: n0.sha256 };
  for (const nivel of niveis) {
    const k = nivel.nivel;
    let bytesDosTijolos = 0;
    const bricks = nivel.gravados.map(({ b, bytes }) => {
      const gz = gzipSync(bytes, { level: 9 });
      const file = caminhoDoTijolo(k, b);
      arquivos.push({ relativo: file, conteudo: gz });
      bytesDosTijolos += gz.byteLength;
      return { b, file, bytes: gz.byteLength, sha256: sha256(gz) };
    });
    const lado = piramide.tijolo + 2;
    const indice = {
      level: k,
      voxelPc: nivel.grade.voxelPc,
      originPc: nivel.grade.origemPc,
      dims: [nivel.grade.nx, nivel.grade.ny, nivel.grade.nz],
      radiusPc: nivel.raioPc,
      brickCore: piramide.tijolo,
      brickHalo: 1,
      brickDims: dimsEmTijolos(nivel.grade, piramide.tijolo),
      scale: escala,
      type: 'float16',
      unit: 'E_ZGR23 per pc',
      frame:
        'heliocentric-galactic: x→GC (l=0,b=0), y→l=90°, z→NGP; voxel centres at originPc + (i + 0.5)·voxelPc',
      brickLayout:
        `gzip of ${lado}×${lado}×${lado} float16 LE (${lado ** 3 * 2} bytes), index sx + ${lado}·(sy + ${lado}·sz); ` +
        `stored voxel s is level voxel ${piramide.tijolo}·b − 1 + s (s = 0 and ${lado - 1} are the halo)`,
      parent: pai,
      region: DESCRICAO_REGIAO,
      outsideLevel: DESCRICAO_FORA,
      halo: DESCRICAO_ABA,
      sparsity: DESCRICAO_ESPARSIDADE,
      residualThreshold: piramide.limiarResiduo,
      subsamples: piramide.subamostras,
      method:
        `mean of ${piramide.subamostras}×${piramide.subamostras}×${piramide.subamostras} stratified subsamples ` +
        'per voxel of the official interpolator (interp_hp2rg): bilinear HEALPix NEST (healpy get_interp_weights) ' +
        'on the two neighbouring shells + linear in r between shell centres',
      existingBricks: nivel.tijolosExistentes,
      maxOmittedResidual: nivel.maiorResiduoOmitido,
      nanSubsamples: nivel.naoFinitas,
      generated: gerado,
      source: 'Edenhofer2024',
      license: 'CC-BY-4.0',
      bricks,
    };
    const conteudo = Buffer.from(textoDoIndice(indice), 'utf8');
    const arquivoIndice = caminhoDoIndice(k);
    arquivos.push({ relativo: arquivoIndice, conteudo });
    const shaIndice = sha256(conteudo);
    levels.push({
      level: k,
      index: arquivoIndice,
      bytes: conteudo.byteLength,
      sha256: shaIndice,
      voxelPc: nivel.grade.voxelPc,
      radiusPc: nivel.raioPc,
      existingBricks: nivel.tijolosExistentes,
      storedBricks: bricks.length,
      brickBytes: bytesDosTijolos,
    });
    pai = { level: k, index: arquivoIndice, sha256: shaIndice };
  }
  const entrada = {
    kind: 'volume-pyramid',
    parent: 'dustVolumeNear20pc',
    parentSha256: n0.sha256,
    directory: DIRETORIO_PIRAMIDE,
    levels,
    brickFiles:
      'gzip only (.bin.gz): without DecompressionStream the fine levels are unavailable and dustVolumeNear20pc stays',
    generated: gerado,
    source: 'Edenhofer2024',
    license: 'CC-BY-4.0',
  };
  return { arquivos, entrada };
}

/**
 * Grava a pirâmide inteira numa pasta nova e troca de uma vez: a antiga
 * (e com ela todo tijolo que deixou de ser gravado) só sai depois que a
 * nova está completa no disco.
 */
async function gravarPiramide(diretorioPublico, arquivos) {
  const destino = path.join(diretorioPublico, ...DIRETORIO_PIRAMIDE.split('/'));
  const nova = `${destino}.nova`;
  const velha = `${destino}.velha`;
  await rm(nova, { recursive: true, force: true });
  for (const { relativo, conteudo } of arquivos) {
    const alvo = path.join(nova, ...path.posix.relative(DIRETORIO_PIRAMIDE, relativo).split('/'));
    await mkdir(path.dirname(alvo), { recursive: true });
    await writeFile(alvo, conteudo);
  }
  await rm(velha, { recursive: true, force: true });
  if (existsSync(destino)) await rename(destino, velha);
  await rename(nova, destino);
  await rm(velha, { recursive: true, force: true });
}

/** Mesma grade (dims, voxel, origem) que a do contrato? */
function gradeDoAtivoIgual(ativo, grade) {
  return (
    Array.isArray(ativo.dims) &&
    ativo.dims.join(',') === [grade.nx, grade.ny, grade.nz].join(',') &&
    ativo.voxelPc === grade.voxelPc &&
    Array.isArray(ativo.originPc) &&
    ativo.originPc.join(',') === grade.origemPc.join(',')
  );
}

/**
 * Núcleo testável da pirâmide. Na ordem: (a) o contrato e a fixture de
 * referência dos níveis, ANTES de ler o FITS; (b) o n0 — o bloco de 20 pc
 * do manifesto, conferido pelo sha256; (c) o mapa; (d) os níveis, em
 * ordem, cada um sobre o campo do anterior; (e) a validação EM MEMÓRIA —
 * faixa de cada tijolo gravado (finito, ≥ 0, ≤ `LIMITE_E_POR_PC`) e a
 * referência de cada nível; reprovação lança com os números e NADA é
 * gravado; (f) os arquivos em memória; (g) só então a pasta
 * `dust-piramide/` (nova, trocada de uma vez) e, por ÚLTIMO, o
 * manifesto. `piramide`/`gradeN0` são o contrato; os testes passam uma
 * pirâmide minúscula.
 */
export async function executarNiveis({
  caminhoFits,
  caminhoFixtureNiveis,
  diretorioPublico,
  piramide = PIRAMIDE_POEIRA,
  gradeN0 = GRADE_20PC,
  dataGeracao = new Date().toISOString().slice(0, 10),
}) {
  validarPiramide(piramide, gradeN0);
  if (!existsSync(caminhoFixtureNiveis)) {
    throw new Error(
      `executarNiveis: fixture de referência dos níveis não encontrada em ${caminhoFixtureNiveis} ` +
        '(scripts/data/fixtures/gera-referencia-edenhofer.py niveis); nada foi gravado.'
    );
  }
  const fixture = JSON.parse(await readFile(caminhoFixtureNiveis, 'utf8'));
  const referenciaDe = (k) => (Array.isArray(fixture.niveis) ? fixture.niveis.find((n) => n.nivel === k) : undefined);
  for (const nivel of piramide.niveis) {
    const referencia = referenciaDe(nivel.nivel);
    // a mesma conferência de grade que `compararNivelComReferencia` faz no
    // fim, aqui antes do FITS: fixture de outro contrato falha em segundos
    const grade = referencia?.grade;
    const bate =
      grade &&
      JSON.stringify(grade.dims) === JSON.stringify(nivel.dims) &&
      grade.voxelPc === nivel.voxelPc &&
      JSON.stringify(grade.origemPc) === JSON.stringify(piramide.origemPc) &&
      referencia.raioPc === nivel.raioPc;
    if (!bate) {
      throw new Error(
        `executarNiveis: a fixture não tem o nível ${nivel.nivel} deste contrato ` +
          `(${nivel.dims.join('×')} @ ${nivel.voxelPc} pc, raio ${nivel.raioPc}); nada foi gravado.`
      );
    }
  }

  const caminhoManifesto = path.join(diretorioPublico, 'data', 'galaxy', 'manifest.json');
  const manifesto = JSON.parse(await readFile(caminhoManifesto, 'utf8'));
  const ativoN0 = manifesto.assets?.dustVolumeNear20pc;
  if (ativoN0?.kind !== 'volume' || !gradeDoAtivoIgual(ativoN0, gradeN0)) {
    throw new Error(
      'executarNiveis: o manifesto não tem o bloco de 20 pc do contrato (dustVolumeNear20pc) — ' +
        'rode npm run data:poeira antes; nada foi gravado.'
    );
  }
  const bytesN0 = await readFile(path.join(diretorioPublico, ativoN0.file));
  if (sha256(bytesN0) !== ativoN0.sha256) {
    throw new Error(
      `executarNiveis: ${ativoN0.file} no disco não é o do manifesto (SHA-256 diverge) — ` +
        'rode npm run data:verify; nada foi gravado.'
    );
  }
  const escala = ativoN0.scale;
  const campo = criarCampo({ grade: gradeN0, valores: deFloat16(bytesN0, escala) });
  fase('contrato, fixture e bloco de 20 pc');

  const { imagem, radii, nPix } = lerMapaEdenhofer(caminhoFits);
  const amostrador = amostradorEdenhoferBilinear(imagem, radii, nPix);
  fase('leitura do FITS (~1,6 GB)');

  const niveis = [];
  for (const nivel of piramide.niveis) {
    const inicio = Date.now();
    let proximoMarco = 0.1;
    const resultadoNivel = gerarNivel({
      amostrador,
      campo,
      piramide,
      nivel,
      escala,
      aoProgredir: (feitos, total) => {
        while (feitos / total >= proximoMarco - 1e-9) {
          const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
          console.log(`  n${nivel.nivel}: ${Math.round(proximoMarco * 100)}% (${feitos}/${total} tijolos) em ${segundos}s`);
          proximoMarco += 0.1;
        }
      },
    });
    adicionarNivel(campo, resultadoNivel.grade, piramide.tijolo, resultadoNivel.gravados);
    niveis.push(resultadoNivel);
    console.log(
      `n${nivel.nivel} (${nivel.voxelPc} pc, raio ${nivel.raioPc ?? 'caixa inteira'}): ` +
        `${resultadoNivel.tijolosExistentes} tijolos no nível, ${resultadoNivel.gravados.length} gravados; ` +
        `maior resíduo omitido ${resultadoNivel.maiorResiduoOmitido.toExponential(2)} E/pc; ` +
        `subamostras não finitas ${resultadoNivel.naoFinitas}`
    );
    fase(`nível ${nivel.nivel}`);
  }

  for (const nivel of niveis) {
    for (const { b, dados } of nivel.gravados) {
      for (let i = 0; i < dados.length; i += 1) {
        const v = dados[i];
        if (!Number.isFinite(v) || v < 0 || v > LIMITE_E_POR_PC) {
          throw new Error(
            `executarNiveis: n${nivel.nivel} tijolo ${b.join('_')} com valor fora da faixa ` +
              `(${v} E/pc no índice ${i}; teto ${LIMITE_E_POR_PC}). Nada foi gravado.`
          );
        }
      }
    }
    const resultado = compararNivelComReferencia(campo, piramide, nivel.nivel, referenciaDe(nivel.nivel));
    if (!resultado.aplicavel) {
      throw new Error(
        `executarNiveis: a referência do nível ${nivel.nivel} não se aplica (${resultado.motivo}) Nada foi gravado.`
      );
    }
    const texto =
      `pior célula ${resultado.maximoRelativo.toFixed(2)} da folga ` +
      `(${100 * TOLERANCIA_NIVEL.celulaRelativa}% + ${TOLERANCIA_NIVEL.celulaAbsoluta} E/pc; máx 1) ` +
      `(${JSON.stringify(resultado.pior.indice)}: ${resultado.pior.atual.toExponential(3)} × ` +
      `referência ${resultado.pior.esperado.toExponential(3)}), ` +
      `${resultado.emTijoloGravado}/${resultado.celulas} células em tijolo gravado`;
    if (!resultado.aprovado) {
      throw new Error(
        `executarNiveis: nível ${nivel.nivel} FORA DA TOLERÂNCIA contra o interpolador oficial — ${texto}. ` +
          'Nada foi gravado.'
      );
    }
    console.log(`referência do n${nivel.nivel}: ${texto}.`);
  }
  fase('validação em memória (faixa + referência)');

  const { arquivos, entrada } = montarArtefatosDaPiramide(niveis, {
    piramide,
    escala,
    n0: { file: ativoN0.file, sha256: ativoN0.sha256 },
    gerado: dataGeracao,
  });
  fase('gzip + sha256 + índices');

  await gravarPiramide(diretorioPublico, arquivos);
  const manifestoFinal = JSON.parse(await readFile(caminhoManifesto, 'utf8'));
  manifestoFinal.dustPyramid = entrada;
  manifestoFinal.sources ??= [];
  if (!manifestoFinal.sources.some((s) => s.id === 'Edenhofer2024')) {
    manifestoFinal.sources.push({
      id: 'Edenhofer2024',
      role: '3D dust extinction density (mean map) within 1.25 kpc of the Sun',
      paper: 'https://doi.org/10.1051/0004-6361/202347628',
      archive: 'https://doi.org/10.5281/zenodo.10658339',
      license: 'CC-BY-4.0',
    });
  }
  await writeFile(caminhoManifesto, `${JSON.stringify(manifestoFinal, null, 2)}\n`);
  for (const nivel of entrada.levels) {
    console.log(
      `gravado n${nivel.level}: ${nivel.storedBricks} tijolos, ${(nivel.brickBytes / 1048576).toFixed(1)} MB gz ` +
        `(${nivel.index})`
    );
  }
  fase('escrita da pirâmide + manifesto');
  return { niveis, entrada };
}

export async function mainNiveis() {
  const t0 = Date.now();
  await garantirMapa(caminhoFits, esperadoPath);
  fase('verificação do FITS (tamanho + md5)');
  const { entrada } = await executarNiveis({
    caminhoFits,
    caminhoFixtureNiveis: fixtureNiveisPath,
    diretorioPublico: publicDirectory,
  });
  const megabytes = entrada.levels.reduce((soma, n) => soma + n.brickBytes, 0) / 1048576;
  console.log(
    `total: ${((Date.now() - t0) / 1000).toFixed(1)}s; pirâmide ${megabytes.toFixed(1)} MB; ` +
      `pico de memória ${(process.resourceUsage().maxRSS / 1048576).toFixed(2)} GB`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  (process.argv.includes('--niveis') ? mainNiveis : main)().catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  });
}
