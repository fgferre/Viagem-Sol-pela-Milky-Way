// ============================================================
// `executar` — o núcleo testável do builder (E1, revisão item 1): a
// fixture é exigida ANTES de calcular o bloco; reprovação lança com os
// números e não toca em disco; só a aprovação grava `.bin`/`.gz` e, por
// ÚLTIMO, o manifesto. Sem o FITS de 3 GB aqui: um FITS SINTÉTICO
// MINÚSCULO (mesmo escritor de cartões/blocos que `lib/fits.test.mjs`
// usa), com raios [0.001, 2.0] pc — abaixo do menor r que qualquer
// subamostra da grade real (125×125×50, centros a partir de ~2,17 pc da
// origem) pode alcançar —, então `coletar` nunca entra no ramo caro
// (HEALPix/interpolação) e o bloco sai todo zero em <1 s.
// ============================================================
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { executar } from './build-dust-volumes.mjs';
import { GRADE_20PC } from './lib/volume.mjs';

const TAMANHO_BLOCO = 2880;

function paraBloco(n) {
  const resto = n % TAMANHO_BLOCO;
  return resto === 0 ? n : n + (TAMANHO_BLOCO - resto);
}

function cartao(chave, valor) {
  if (chave === 'END') return 'END'.padEnd(80, ' ');
  let texto;
  if (typeof valor === 'boolean') texto = valor ? 'T' : 'F';
  else if (typeof valor === 'number') texto = String(valor);
  else texto = `'${String(valor).padEnd(8, ' ')}'`;
  return `${chave.padEnd(8, ' ')}= ${texto.padStart(20, ' ')}`.padEnd(80, ' ').slice(0, 80);
}

function montarCabecalho(cartoes) {
  const texto = [...cartoes.map(([k, v]) => cartao(k, v)), cartao('END')].join('');
  return Buffer.from(texto.padEnd(paraBloco(texto.length), ' '), 'latin1');
}

function bufferFloatsBE(valores) {
  const bruto = Buffer.alloc(valores.length * 4);
  valores.forEach((v, i) => bruto.writeFloatBE(v, i * 4));
  return Buffer.concat([bruto, Buffer.alloc(paraBloco(bruto.length) - bruto.length)]);
}

// nPix=1, 2 cascas — o conteúdo da imagem nunca é lido de verdade (ver
// cabeçalho acima): com raios tão pequenos, nenhuma subamostra da grade
// real cai em [rMin,rMax) e o valor fica sempre 0 antes de olhar pixel.
const RAIOS = [0.001, 2.0];
const VALORES_IMAGEM = [0, 0];

function montarFitsMinusculo() {
  const primario = montarCabecalho([['SIMPLE', true], ['BITPIX', 8], ['NAXIS', 0], ['EXTEND', true]]);
  const cabecalhoImagem = montarCabecalho([
    ['XTENSION', 'IMAGE'], ['BITPIX', -32], ['NAXIS', 2],
    ['NAXIS1', 1], ['NAXIS2', 2], ['PCOUNT', 0], ['GCOUNT', 1],
    ['EXTNAME', 'MEAN'], ['NSIDE', 256], ['ORDERING', 'NESTED'],
  ]);
  const cabecalhoTabela = montarCabecalho([
    ['XTENSION', 'BINTABLE'], ['BITPIX', 8], ['NAXIS', 2],
    ['NAXIS1', 4], ['NAXIS2', 2], ['PCOUNT', 0], ['GCOUNT', 1],
    ['TFIELDS', 1], ['TTYPE1', 'radial pixel centers'], ['TFORM1', 'E'], ['EXTNAME', 'RADII'],
  ]);
  return Buffer.concat([
    primario,
    cabecalhoImagem, bufferFloatsBE(VALORES_IMAGEM),
    cabecalhoTabela, bufferFloatsBE(RAIOS),
  ]);
}

const GRADE_FIXTURE = { dims: [GRADE_20PC.nx, GRADE_20PC.ny, GRADE_20PC.nz], voxelPc: GRADE_20PC.voxelPc, origemPc: GRADE_20PC.origemPc };

let dir;
let caminhoFits;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'build-dust-volumes-'));
  caminhoFits = join(dir, 'sintetico.fits');
  writeFileSync(caminhoFits, montarFitsMinusculo());
});

afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

/** `{assets:{},sources:[]}` mínimo — o que `executar` espera achar já existindo em `caminhoManifesto`. */
function escreverManifestoMinimo(caminho) {
  writeFileSync(caminho, JSON.stringify({ assets: {}, sources: [] }));
}

describe('executar — fixture ausente: lança e nada é gravado', () => {
  it('lança ANTES de tentar ler o FITS (a ordem é: fixture primeiro)', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'build-dust-volumes-ausente-'));
    const diretorioSaida = join(raiz, 'saida');
    const caminhoManifesto = join(raiz, 'manifest.json');
    try {
      await expect(
        executar({
          // caminho do FITS que NÃO EXISTE: se o código lesse o FITS antes
          // de checar a fixture, o erro seria outro (ENOENT do fs), não o
          // da fixture — provando a ordem exigida pela revisão E1 item 1.
          caminhoFits: join(raiz, 'nao-existe.fits'),
          caminhoFixture: join(raiz, 'nao-existe.json'),
          diretorioSaida,
          caminhoManifesto,
        })
      ).rejects.toThrow(/fixture.*não encontrada/i);
      expect(existsSync(diretorioSaida)).toBe(false);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  }, 30_000);
});

describe('executar — fixture que reprova: lança com os números, nada muda em disco', () => {
  it('mantém o .bin e o manifesto anteriores intactos', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'build-dust-volumes-reprova-'));
    const diretorioSaida = join(raiz, 'saida');
    mkdirSync(diretorioSaida, { recursive: true });
    const caminhoManifesto = join(raiz, 'manifest.json');
    const caminhoFixture = join(raiz, 'edenhofer-referencia.json');

    const binAnterior = Buffer.from('marca-antiga-do-bin');
    const destinoBin = join(diretorioSaida, 'dust-near-20pc.bin');
    writeFileSync(destinoBin, binAnterior);
    const manifestoAnterior = JSON.stringify({ assets: { marcador: true }, sources: [] });
    writeFileSync(caminhoManifesto, manifestoAnterior);
    writeFileSync(
      caminhoFixture,
      JSON.stringify({
        cabecalho: { grade: GRADE_FIXTURE },
        // o bloco sai todo zero (ver raios minúsculos no cabeçalho do
        // FITS sintético); esta fixture espera 5 — reprova por certo.
        voxeis: [{ indice: [0, 0, 0], media: 5, nanFracao: 0 }],
        colunas: [],
      })
    );

    try {
      await expect(
        executar({ caminhoFits, caminhoFixture, diretorioSaida, caminhoManifesto })
      ).rejects.toThrow(/FORA DA TOLERÂNCIA/);
      expect(readFileSync(destinoBin)).toEqual(binAnterior);
      expect(readFileSync(caminhoManifesto, 'utf8')).toBe(manifestoAnterior);
      expect(existsSync(`${destinoBin}.gz`)).toBe(false);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  }, 30_000);
});

describe('executar — fixture que aprova: grava .bin/.gz e o manifesto é o ÚLTIMO a mudar', () => {
  it('grava os dois artefatos e mescla o manifesto, nessa ordem', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'build-dust-volumes-aprova-'));
    const diretorioSaida = join(raiz, 'saida');
    const caminhoManifesto = join(raiz, 'manifest.json');
    const caminhoFixture = join(raiz, 'edenhofer-referencia.json');
    escreverManifestoMinimo(caminhoManifesto);
    writeFileSync(
      caminhoFixture,
      JSON.stringify({
        cabecalho: { grade: GRADE_FIXTURE },
        // o bloco sai todo zero; esta fixture espera exatamente 0.
        voxeis: [{ indice: [0, 0, 0], media: 0, nanFracao: 0 }],
        colunas: [],
      })
    );

    const saida = await executar({ caminhoFits, caminhoFixture, diretorioSaida, caminhoManifesto });
    expect(saida.nanSubsamples).toBe(0);
    expect(saida.resultado.aplicavel).toBe(true);
    expect(saida.resultado.voxel.aprovado).toBe(true);

    const destinoBin = join(diretorioSaida, 'dust-near-20pc.bin');
    const contagemVoxels = GRADE_20PC.nx * GRADE_20PC.ny * GRADE_20PC.nz;
    expect(statSync(destinoBin).size).toBe(contagemVoxels * 2); // float16
    expect(existsSync(`${destinoBin}.gz`)).toBe(true);

    const manifesto = JSON.parse(readFileSync(caminhoManifesto, 'utf8'));
    expect(manifesto.assets.dustVolumeNear20pc.kind).toBe('volume');
    expect(manifesto.assets.dustVolumeNear20pc.count).toBe(contagemVoxels);
    expect(manifesto.sources.some((s) => s.id === 'Edenhofer2024')).toBe(true);

    const mtimeBin = statSync(destinoBin).mtimeMs;
    const mtimeGz = statSync(`${destinoBin}.gz`).mtimeMs;
    const mtimeManifesto = statSync(caminhoManifesto).mtimeMs;
    expect(mtimeGz).toBeGreaterThanOrEqual(mtimeBin);
    expect(mtimeManifesto).toBeGreaterThanOrEqual(mtimeGz);

    rmSync(raiz, { recursive: true, force: true });
  }, 30_000);
});
