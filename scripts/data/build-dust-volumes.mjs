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
// NÃO faz parte da suíte: baixa 3 GB e roda ~400 M subamostras. O dono
// roda com `npm run data:poeira`; aqui só `main()` é o ponto de entrada
// direto — as outras funções são exportadas para uso futuro em teste.
// ============================================================
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, statSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import sharp from 'sharp';
import { abrirFits, lerColunaTabela, lerImagemInteira } from './lib/fits.mjs';
import { ang2pixNest } from './lib/healpix.mjs';
import { sha256 } from './lib/binary.mjs';
import { GRADE_20PC, compararComReferencia, deFloat16, indiceDe, paraFloat16 } from './lib/volume.mjs';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const cacheDirectory = path.join(rootDirectory, '.cache', 'galaxy-data', 'edenhofer2024');
const caminhoFits = path.join(cacheDirectory, 'mean_and_std_healpix.fits');
const esperadoPath = path.join(cacheDirectory, 'ESPERADO.txt');
const outputDirectory = path.join(rootDirectory, 'public', 'data', 'galaxy');
const destinoBin = path.join(outputDirectory, 'dust-near-20pc.bin');
const manifestPath = path.join(outputDirectory, 'manifest.json');
const fixturePath = path.join(rootDirectory, 'scripts', 'data', 'fixtures', 'edenhofer-referencia.json');
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
 * Coleta a média de cada voxel de `GRADE_20PC`: 8×8×8 subamostras
 * estratificadas, pixel HEALPix mais próximo + linear em r entre
 * centros de casca vizinhos; fora de [radii[0], radii.at(-1)) vale 0
 * (interior não reconstruído / exterior da cobertura).
 */
export function coletar(imagem, radii, nPix) {
  const { nx, ny, nz, voxelPc, origemPc } = GRADE_20PC;
  const rMin = radii[0];
  const rMax = radii[radii.length - 1];
  const passoSub = voxelPc / SUB;
  const valoresGrid = new Float32Array(nx * ny * nz);
  const totalVoxels = nx * ny * nz;
  let nanSubsamples = 0;
  let processados = 0;
  let proximoMarco = Math.ceil(totalVoxels / 10);
  const inicio = Date.now();

  for (let iz = 0; iz < nz; iz += 1) {
    const cantoZ = origemPc[2] + iz * voxelPc;
    for (let iy = 0; iy < ny; iy += 1) {
      const cantoY = origemPc[1] + iy * voxelPc;
      for (let ix = 0; ix < nx; ix += 1) {
        const cantoX = origemPc[0] + ix * voxelPc;
        let soma = 0;
        for (let sz = 0; sz < SUB; sz += 1) {
          const pz = cantoZ + (sz + 0.5) * passoSub;
          for (let sy = 0; sy < SUB; sy += 1) {
            const py = cantoY + (sy + 0.5) * passoSub;
            for (let sx = 0; sx < SUB; sx += 1) {
              const px = cantoX + (sx + 0.5) * passoSub;
              const r = Math.sqrt(px * px + py * py + pz * pz);
              let valor = 0;
              if (r >= rMin && r < rMax) {
                const theta = Math.acos(pz / r);
                let phi = Math.atan2(py, px);
                if (phi < 0) phi += 2 * Math.PI;
                const pix = ang2pixNest(NSIDE, theta, phi);
                const casca = buscarCasca(radii, r);
                const r0 = radii[casca];
                const r1 = radii[casca + 1];
                const v0 = imagem[casca * nPix + pix];
                const v1 = imagem[(casca + 1) * nPix + pix];
                valor = v0 + (v1 - v0) * ((r - r0) / (r1 - r0));
                if (!Number.isFinite(valor)) {
                  valor = 0;
                  nanSubsamples += 1;
                }
              }
              soma += valor;
            }
          }
        }
        valoresGrid[indiceDe(GRADE_20PC, ix, iy, iz)] = soma / (SUB * SUB * SUB);
        processados += 1;
      }
    }
    while (processados >= proximoMarco && proximoMarco <= totalVoxels) {
      const percentual = Math.round((proximoMarco / totalVoxels) * 100);
      const segundos = (Date.now() - inicio) / 1000;
      console.log(`  coleta: ${percentual}% (${proximoMarco}/${totalVoxels} voxels) em ${segundos.toFixed(1)}s`);
      proximoMarco += Math.ceil(totalVoxels / 10);
    }
  }
  return { valoresGrid, nanSubsamples };
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

export async function main() {
  const t0 = Date.now();
  await garantirMapa(caminhoFits, esperadoPath);
  fase('verificação do FITS (tamanho + md5)');

  const hdus = abrirFits(caminhoFits);
  const hduMedia = acharHduMedia(hdus);
  const tabelaCentros = acharTabelaCentros(hdus);
  const radii = lerColunaTabela(tabelaCentros, 'radial pixel centers', { exigirFinito: true });
  const nPix = hduMedia.naxisn[0];
  if (radii.length !== hduMedia.naxisn[1]) {
    throw new Error(`main: ${radii.length} centros de casca não batem com NAXIS2=${hduMedia.naxisn[1]}.`);
  }
  console.log(`raios: ${radii.length} cascas, ${radii[0].toFixed(4)}–${radii[radii.length - 1].toFixed(4)} pc`);
  fase('abrir FITS + tabela de raios');

  const imagem = lerImagemInteira(hduMedia);
  fase('leitura da imagem (~1,6 GB)');

  const { valoresGrid, nanSubsamples } = coletar(imagem, radii, nPix);
  hdus.fechar();
  console.log(`subamostras não finitas: ${nanSubsamples}`);
  fase('coleta (8×8×8 subamostras por voxel)');

  const codificado = paraFloat16(valoresGrid, ESCALA);
  const buffer = Buffer.from(codificado.buffer, codificado.byteOffset, codificado.byteLength);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(destinoBin, buffer);
  await writeFile(`${destinoBin}.gz`, gzipSync(buffer, { level: 9 }));
  const hash = sha256(buffer);
  console.log(`gravado: ${path.relative(rootDirectory, destinoBin)} (${(buffer.byteLength / 1e6).toFixed(2)} MB), sha256 ${hash}`);
  fase('codificação float16 + escrita do .bin/.gz');

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
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
    method: 'nearest HEALPix pixel + linear in r between shell centres; 8×8×8 stratified subsamples per voxel',
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
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fase('manifesto mesclado');

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

  if (existsSync(fixturePath)) {
    const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
    const volume = { grade: GRADE_20PC, valores: deFloat16(buffer, ESCALA) };
    const resultado = compararComReferencia(volume, fixture);
    console.log(
      `comparação com a fixture — voxel: máximo relativo ${resultado.voxel.maximoRelativo.toFixed(3)} ` +
        `(${resultado.voxel.aprovado ? 'dentro da tolerância' : 'FORA DA TOLERÂNCIA'}); ` +
        `coluna: máximo relativo ${resultado.coluna.maximoRelativo.toFixed(3)} ` +
        `(${resultado.coluna.aprovado ? 'dentro da tolerância' : 'FORA DA TOLERÂNCIA'}).`
    );
  } else {
    console.log('fixture de referência não encontrada; pulei a comparação.');
  }
  fase('comparação com a fixture');

  console.log(`total: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  });
}
