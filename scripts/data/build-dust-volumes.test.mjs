// Serve: chão — o gerador do bloco e da pirâmide de poeira confere contra a referência antes de gravar e falha de verdade
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
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { gunzipSync } from 'node:zlib';
import {
  amostradorEdenhofer,
  amostradorEdenhoferBilinear,
  executar,
  executarNiveis,
  lerMapaEdenhofer,
} from './build-dust-volumes.mjs';
import { sha256 } from './lib/binary.mjs';
import { criarInterpolacaoNest, pix2vecNest } from './lib/healpix.mjs';
import {
  GRADE_20PC,
  adicionarNivel,
  centroDe,
  coletarGrade,
  compararNivelComReferencia,
  criarCampo,
  deFloat16,
  gerarNivel,
  gradeDoNivel,
  paraFloat16,
  tijoloExiste,
} from './lib/volume.mjs';

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

// Uma coluna mínima VÁLIDA (o conteúdo mínimo da fixture exige ≥ 1
// coluna com célula de índice válido): o bloco destes testes sai todo
// zero, então a referência de mesmo operador zero bate exatamente.
const COLUNA_ZERO = {
  nome: 'centro',
  l: 0,
  b: 0,
  rMin: 68.8119,
  rMax: 1244.5968,
  fino: 0,
  tubo: { media: 0, min: 0, max: 0 },
  celulas: [{ indice: [62, 62, 25], media: 0 }],
};

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
        colunas: [COLUNA_ZERO],
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
        colunas: [COLUNA_ZERO],
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

// ============================================================
// `executarNiveis` — a pirâmide (E3c), do FITS ao disco. FITS SINTÉTICO
// com o céu de verdade (NSIDE 256, 786.432 pixels) e só 3 cascas, cada
// uma uniforme: o mapa vira uma função de r — 0 dentro de 2 pc, rampa até
// o pico de 0,05 E/pc em r = 6 pc, queda até 20 pc, 0 depois —, então o
// valor esperado de cada célula sai de uma conta independente (a média
// da função nas 2³ subamostras), sem o interpolador. Pirâmide minúscula
// (tijolo de 4): n0 4×4×2 de 8 pc (o `.bin` do manifesto, coletado do
// mesmo FITS), n1 8×8×4 de 4 pc, n2 16×16×8 de 2 pc (r ≤ 10), n3
// 32×32×16 de 1 pc (r ≤ 8). O pico em r = 6 é uma dobra que o pai não
// acompanha: os tijolos que o cortam são gravados; os longe dele, não.
// ============================================================
const RAIOS_PIRAMIDE = [2, 6, 20];
const CASCAS_PIRAMIDE = [1e-4, 0.05, 1e-4];
const NPIX_256 = 12 * 256 * 256;
const N0_MINI = { nx: 4, ny: 4, nz: 2, voxelPc: 8, origemPc: [-16, -16, -8] };
const PIRAMIDE_MINI = {
  origemPc: [-16, -16, -8],
  tijolo: 4,
  limiarResiduo: 1e-3,
  subamostras: 2,
  niveis: [
    { nivel: 1, voxelPc: 4, dims: [8, 8, 4], raioPc: null },
    { nivel: 2, voxelPc: 2, dims: [16, 16, 8], raioPc: 10 },
    { nivel: 3, voxelPc: 1, dims: [32, 32, 16], raioPc: 8 },
  ],
};
const LADO_MINI = PIRAMIDE_MINI.tijolo + 2;

function montarFitsRadial() {
  const primario = montarCabecalho([['SIMPLE', true], ['BITPIX', 8], ['NAXIS', 0], ['EXTEND', true]]);
  const cabecalhoImagem = montarCabecalho([
    ['XTENSION', 'IMAGE'], ['BITPIX', -32], ['NAXIS', 2],
    ['NAXIS1', NPIX_256], ['NAXIS2', CASCAS_PIRAMIDE.length], ['PCOUNT', 0], ['GCOUNT', 1],
    ['EXTNAME', 'MEAN'], ['NSIDE', 256], ['ORDERING', 'NESTED'],
  ]);
  const imagem = new Float32Array(NPIX_256 * CASCAS_PIRAMIDE.length);
  CASCAS_PIRAMIDE.forEach((v, casca) => imagem.fill(v, casca * NPIX_256, (casca + 1) * NPIX_256));
  const bruto = Buffer.from(imagem.buffer).swap32(); // FITS é big-endian
  const cabecalhoTabela = montarCabecalho([
    ['XTENSION', 'BINTABLE'], ['BITPIX', 8], ['NAXIS', 2],
    ['NAXIS1', 4], ['NAXIS2', RAIOS_PIRAMIDE.length], ['PCOUNT', 0], ['GCOUNT', 1],
    ['TFIELDS', 1], ['TTYPE1', 'radial pixel centers'], ['TFORM1', 'E'], ['EXTNAME', 'RADII'],
  ]);
  return Buffer.concat([
    primario,
    cabecalhoImagem, bruto, Buffer.alloc(paraBloco(bruto.length) - bruto.length),
    cabecalhoTabela, bufferFloatsBE(RAIOS_PIRAMIDE),
  ]);
}

/** A função de r do FITS radial, com os valores em float32 como no arquivo. */
function mapaRadial(r) {
  if (!(r >= RAIOS_PIRAMIDE[0] && r < RAIOS_PIRAMIDE.at(-1))) return 0;
  const i = r < RAIOS_PIRAMIDE[1] ? 0 : 1;
  const [v0, v1] = [Math.fround(CASCAS_PIRAMIDE[i]), Math.fround(CASCAS_PIRAMIDE[i + 1])];
  return v0 + (v1 - v0) * ((r - RAIOS_PIRAMIDE[i]) / (RAIOS_PIRAMIDE[i + 1] - RAIOS_PIRAMIDE[i]));
}

/** Média independente das 2³ subamostras (centro ± voxel/4) — a referência do teste. */
function mediaEsperada(centro, voxelPc) {
  let soma = 0;
  for (const dz of [-1, 1]) {
    for (const dy of [-1, 1]) {
      for (const dx of [-1, 1]) {
        const p = [centro[0] + (dx * voxelPc) / 4, centro[1] + (dy * voxelPc) / 4, centro[2] + (dz * voxelPc) / 4];
        soma += mapaRadial(Math.hypot(...p));
      }
    }
  }
  return soma / 8;
}

/** Fixture dos níveis: as primeiras 16 células de cada nível com centro na casca 4,5 ≤ r ≤ 7,5 (perto da dobra). */
function fixtureDosNiveis(mudar = (v) => v) {
  return {
    niveis: PIRAMIDE_MINI.niveis.map((nivel) => {
      const grade = gradeDoNivel(PIRAMIDE_MINI, nivel);
      const celulas = [];
      for (let k = 0; k < grade.nz && celulas.length < 16; k += 1) {
        for (let j = 0; j < grade.ny && celulas.length < 16; j += 1) {
          for (let i = 0; i < grade.nx && celulas.length < 16; i += 1) {
            const centro = centroDe(grade, i, j, k);
            const r = Math.hypot(...centro);
            if (r < 4.5 || r > 7.5) continue;
            celulas.push({ indice: [i, j, k], media: mudar(mediaEsperada(centro, nivel.voxelPc)), nanFracao: 0 });
          }
        }
      }
      return {
        nivel: nivel.nivel,
        grade: { dims: nivel.dims, voxelPc: nivel.voxelPc, origemPc: PIRAMIDE_MINI.origemPc },
        raioPc: nivel.raioPc,
        celulas,
      };
    }),
  };
}

describe('executarNiveis — a pirâmide do FITS ao disco', () => {
  let raizPiramide;
  let caminhoFitsRadial;
  let bytesN0;

  beforeAll(() => {
    raizPiramide = mkdtempSync(join(tmpdir(), 'build-dust-piramide-'));
    caminhoFitsRadial = join(raizPiramide, 'radial.fits');
    writeFileSync(caminhoFitsRadial, montarFitsRadial());
    const { imagem, radii, nPix } = lerMapaEdenhofer(caminhoFitsRadial);
    const { valores } = coletarGrade(amostradorEdenhofer(imagem, radii, nPix), N0_MINI, 8);
    const f16 = paraFloat16(valores, 1000);
    bytesN0 = Buffer.from(f16.buffer, f16.byteOffset, f16.byteLength);
  });

  afterAll(() => {
    if (raizPiramide) rmSync(raizPiramide, { recursive: true, force: true });
  });

  /** `public/` minúsculo: o n0 e um manifesto só com ele. Devolve os caminhos. */
  function montarPublico({ shaDoManifesto = sha256(bytesN0) } = {}) {
    const publico = mkdtempSync(join(raizPiramide, 'publico-'));
    mkdirSync(join(publico, 'data', 'galaxy'), { recursive: true });
    writeFileSync(join(publico, 'data', 'galaxy', 'dust-near-20pc.bin'), bytesN0);
    const manifesto = {
      assets: {
        dustVolumeNear20pc: {
          kind: 'volume',
          file: 'data/galaxy/dust-near-20pc.bin',
          dims: [N0_MINI.nx, N0_MINI.ny, N0_MINI.nz],
          voxelPc: N0_MINI.voxelPc,
          originPc: N0_MINI.origemPc,
          scale: 1000,
          sha256: shaDoManifesto,
        },
      },
      sources: [],
    };
    const caminhoManifesto = join(publico, 'data', 'galaxy', 'manifest.json');
    writeFileSync(caminhoManifesto, JSON.stringify(manifesto));
    const caminhoFixture = join(publico, 'referencia-niveis.json');
    const velho = join(publico, 'data', 'galaxy', 'dust-piramide', 'n1', '9_9_9.bin.gz');
    mkdirSync(dirname(velho), { recursive: true });
    writeFileSync(velho, 'tijolo de uma rodada anterior');
    return { publico, caminhoManifesto, caminhoFixture, velho };
  }

  const rodar = (publico, caminhoFixture, caminhoFits = caminhoFitsRadial) =>
    executarNiveis({
      caminhoFits,
      caminhoFixtureNiveis: caminhoFixture,
      diretorioPublico: publico,
      piramide: PIRAMIDE_MINI,
      gradeN0: N0_MINI,
      dataGeracao: '2026-09-28',
    });

  it('aprovada: grava tijolos 6³ + índices + dustPyramid (por último), só os tijolos com resíduo, e troca a pasta inteira', async () => {
    const { publico, caminhoManifesto, caminhoFixture, velho } = montarPublico();
    writeFileSync(caminhoFixture, JSON.stringify(fixtureDosNiveis()));
    const { entrada } = await rodar(publico, caminhoFixture);

    // a pasta velha saiu inteira (o tijolo de uma rodada anterior não sobra)
    expect(existsSync(velho)).toBe(false);
    const manifesto = JSON.parse(readFileSync(caminhoManifesto, 'utf8'));
    expect(manifesto.dustPyramid).toEqual(entrada);
    expect(manifesto.dustPyramid.parentSha256).toBe(sha256(bytesN0));
    expect(manifesto.sources.some((s) => s.id === 'Edenhofer2024')).toBe(true);

    const listados = new Set();
    let mtimeMaisNovo = 0;
    let paiEsperado = sha256(bytesN0);
    let algumOmitido = false;
    for (const [posicao, nivel] of PIRAMIDE_MINI.niveis.entries()) {
      const declarado = entrada.levels[posicao];
      const bytesIndice = readFileSync(join(publico, declarado.index));
      expect(declarado.index).toBe(`data/galaxy/dust-piramide/n${nivel.nivel}.json`);
      expect(sha256(bytesIndice)).toBe(declarado.sha256);
      expect(bytesIndice.byteLength).toBe(declarado.bytes);
      listados.add(declarado.index);
      mtimeMaisNovo = Math.max(mtimeMaisNovo, statSync(join(publico, declarado.index)).mtimeMs);
      const indice = JSON.parse(bytesIndice.toString('utf8'));
      expect(indice.parent.sha256).toBe(paiEsperado);
      expect(indice.brickCore).toBe(4);
      expect(indice.brickHalo).toBe(1);
      expect(indice.radiusPc).toBe(nivel.raioPc);
      expect(indice.bricks.length).toBeGreaterThan(0);
      if (indice.bricks.length < indice.existingBricks) algumOmitido = true;
      const grade = gradeDoNivel(PIRAMIDE_MINI, nivel);
      for (const tijolo of indice.bricks) {
        expect(tijolo.file).toBe(`data/galaxy/dust-piramide/n${nivel.nivel}/${tijolo.b.join('_')}.bin.gz`);
        expect(tijoloExiste(grade, 4, nivel.raioPc, ...tijolo.b)).toBe(true);
        const gz = readFileSync(join(publico, tijolo.file));
        expect(sha256(gz)).toBe(tijolo.sha256);
        expect(gz.byteLength).toBe(tijolo.bytes);
        expect(gunzipSync(gz).byteLength).toBe(LADO_MINI ** 3 * 2);
        listados.add(tijolo.file);
        mtimeMaisNovo = Math.max(mtimeMaisNovo, statSync(join(publico, tijolo.file)).mtimeMs);
      }
      paiEsperado = declarado.sha256;
    }
    // esparsidade: a dobra grava tijolos; longe dela, algum ficou de fora
    expect(algumOmitido).toBe(true);
    // nada na pasta além do que os índices listam
    const naPasta = [];
    const varrer = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) varrer(join(dir, e.name));
        else naPasta.push(relative(publico, join(dir, e.name)));
      }
    };
    varrer(join(publico, 'data', 'galaxy', 'dust-piramide'));
    expect(new Set(naPasta)).toEqual(listados);
    // o manifesto é o último a mudar
    expect(statSync(caminhoManifesto).mtimeMs).toBeGreaterThanOrEqual(mtimeMaisNovo);
  }, 60_000);

  it('a aba de dois tijolos gravados vizinhos é a primeira camada do núcleo do outro, bit a bit', async () => {
    const { publico, caminhoFixture } = montarPublico();
    writeFileSync(caminhoFixture, JSON.stringify(fixtureDosNiveis()));
    const { entrada } = await rodar(publico, caminhoFixture);
    const indice = JSON.parse(readFileSync(join(publico, entrada.levels[0].index), 'utf8'));
    const cru = new Map(indice.bricks.map((t) => [t.b.join('_'), gunzipSync(readFileSync(join(publico, t.file)))]));
    const texel = (buf, sx, sy, sz) => buf.readUInt16LE(2 * (sx + LADO_MINI * (sy + LADO_MINI * sz)));
    let pares = 0;
    for (const t of indice.bricks) {
      const vizinho = cru.get([t.b[0] + 1, t.b[1], t.b[2]].join('_'));
      if (!vizinho) continue;
      const este = cru.get(t.b.join('_'));
      for (let sz = 1; sz <= 4; sz += 1) {
        for (let sy = 1; sy <= 4; sy += 1) {
          // aba +x deste (texel 5) = voxel de núcleo 0 do vizinho (texel 1), e vice-versa
          expect(texel(este, LADO_MINI - 1, sy, sz)).toBe(texel(vizinho, 1, sy, sz));
          expect(texel(vizinho, 0, sy, sz)).toBe(texel(este, LADO_MINI - 2, sy, sz));
        }
      }
      pares += 1;
    }
    expect(pares).toBeGreaterThan(0);
  }, 60_000);

  it('referência que reprova: lança com os números e nada muda em disco', async () => {
    const { publico, caminhoManifesto, caminhoFixture, velho } = montarPublico();
    writeFileSync(caminhoFixture, JSON.stringify(fixtureDosNiveis((v) => v * 2)));
    const manifestoAntes = readFileSync(caminhoManifesto, 'utf8');
    await expect(rodar(publico, caminhoFixture)).rejects.toThrow(/nível 1 FORA DA TOLERÂNCIA.*pior célula/);
    expect(readFileSync(caminhoManifesto, 'utf8')).toBe(manifestoAntes);
    expect(existsSync(velho)).toBe(true);
    expect(existsSync(join(publico, 'data', 'galaxy', 'dust-piramide.nova'))).toBe(false);
  }, 60_000);

  it('fixture ausente lança ANTES de ler o FITS; n0 que não é o do manifesto também não grava nada', async () => {
    const { publico, caminhoFixture, velho } = montarPublico();
    await expect(rodar(publico, caminhoFixture, join(publico, 'nao-existe.fits'))).rejects.toThrow(
      /fixture de referência dos níveis não encontrada/
    );
    expect(existsSync(velho)).toBe(true);

    const outro = montarPublico({ shaDoManifesto: 'f'.repeat(64) });
    writeFileSync(outro.caminhoFixture, JSON.stringify(fixtureDosNiveis()));
    await expect(rodar(outro.publico, outro.caminhoFixture)).rejects.toThrow(/SHA-256 diverge/);
    expect(existsSync(outro.velho)).toBe(true);
  }, 60_000);
});

// ============================================================
// O operador dos níveis é o do interpolador OFICIAL (E3c, revisão de
// 28/09). CÉU SINTÉTICO em memória (NSIDE 256, 9 cascas de 180 a 220 pc,
// só os pixels perto do eixo x preenchidos): nuvens gaussianas de 2–6 pc
// sobre um piso, com textura de pixel de ±20%, amostradas nos centros
// dos pixels como o mapa real. Pirâmide minúscula LONGE do Sol (caixa
// x 184–216, |y| ≤ 16, |z| ≤ 8 pc; n1 de 4 pc, n2 de 2 pc), onde o pixel
// (~0,8 pc) é da ordem do voxel, como no mapa real. A referência é uma
// transcrição independente do `interp_hp2rg` (l e b por arctan2, em
// graus e de volta, NaN fora das cascas contado como 0) sobre os mesmos
// pesos do healpy (provados em healpix.test.mjs): célula a célula, o
// nível gravado bate na precisão do float16, e deslocamento de um voxel,
// espelho, unidade e o operador antigo reprovam com margem.
// ============================================================
const RAIOS_CEU = [180, 185, 190, 195, 200, 205, 210, 215, 220];
const NUVENS_CEU = [
  // [x, y, z, sigma (pc), pico (E/pc)]
  [193, -6, 1, 2, 0.05],
  [201, 5, -3, 3, 0.03],
  [207, -9, 4, 6, 0.012],
  [197, 10, 2, 2.5, 0.02],
];
const N0_LONGE = { nx: 4, ny: 4, nz: 2, voxelPc: 8, origemPc: [184, -16, -8] };
const PIRAMIDE_LONGE = {
  origemPc: [184, -16, -8],
  tijolo: 4,
  limiarResiduo: 1e-3,
  subamostras: 2,
  niveis: [
    { nivel: 1, voxelPc: 4, dims: [8, 8, 4], raioPc: null },
    { nivel: 2, voxelPc: 2, dims: [16, 16, 8], raioPc: null },
  ],
};

function densidadeDoCeu(x, y, z) {
  let v = 1e-4;
  for (const [cx, cy, cz, s, pico] of NUVENS_CEU) {
    const d2 = (x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2;
    v += pico * Math.exp(-d2 / (2 * s * s));
  }
  return v;
}

function montarCeu() {
  const imagem = new Float32Array(RAIOS_CEU.length * NPIX_256);
  for (let pix = 0; pix < NPIX_256; pix += 1) {
    const [nx, ny, nz] = pix2vecNest(256, pix);
    if (nx < 0.95) continue;
    const textura = 1 + 0.2 * Math.sin(pix * 12.9898);
    RAIOS_CEU.forEach((r, casca) => {
      imagem[casca * NPIX_256 + pix] = densidadeDoCeu(r * nx, r * ny, r * nz) * textura;
    });
  }
  return imagem;
}

describe('os níveis coletam com o operador do interpolador oficial — célula a célula na precisão do float16', () => {
  const imagem = montarCeu();
  const interpolar = criarInterpolacaoNest(256);
  const pixels = new Int32Array(4);
  const pesos = new Float64Array(4);
  /** Um ponto pelo `interp_hp2rg` oficial, transcrito: NaN fora de [primeira, última casca). */
  function oficial(x, y, z) {
    const r1 = x ** 2 + y ** 2;
    const r = Math.sqrt(r1 + z ** 2);
    const i = RAIOS_CEU.findIndex((r0, n) => r0 <= r && r < RAIOS_CEU[n + 1]);
    if (i < 0) return NaN;
    const lGraus = (Math.atan2(y, x) * 180) / Math.PI;
    const bGraus = (Math.atan2(z, Math.sqrt(r1)) * 180) / Math.PI;
    interpolar(Math.PI / 2 - (bGraus * Math.PI) / 180, (lGraus * Math.PI) / 180, pixels, pesos);
    let vl = 0;
    let vr = 0;
    for (let m = 0; m < 4; m += 1) {
      vl += imagem[i * NPIX_256 + pixels[m]] * pesos[m];
      vr += imagem[(i + 1) * NPIX_256 + pixels[m]] * pesos[m];
    }
    const w = (r - RAIOS_CEU[i]) / (RAIOS_CEU[i + 1] - RAIOS_CEU[i]);
    return (1 - w) * vl + w * vr;
  }
  /** A referência de um nível: média das 2³ subamostras (centro ± voxel/4) do oficial, NaN como 0. */
  function referenciaDoNivel(nivel, escolher = (celulas) => celulas) {
    const grade = gradeDoNivel(PIRAMIDE_LONGE, nivel);
    const celulas = [];
    for (let k = 0; k < grade.nz; k += 1) {
      for (let j = 0; j < grade.ny; j += 1) {
        for (let i = 0; i < grade.nx; i += 1) {
          const c = centroDe(grade, i, j, k);
          let soma = 0;
          for (const dz of [-1, 1]) {
            for (const dy of [-1, 1]) {
              for (const dx of [-1, 1]) {
                const v = oficial(c[0] + (dx * nivel.voxelPc) / 4, c[1] + (dy * nivel.voxelPc) / 4, c[2] + (dz * nivel.voxelPc) / 4);
                soma += Number.isNaN(v) ? 0 : v;
              }
            }
          }
          celulas.push({ indice: [i, j, k], media: soma / 8, nanFracao: 0 });
        }
      }
    }
    return {
      nivel: nivel.nivel,
      grade: { dims: nivel.dims, voxelPc: nivel.voxelPc, origemPc: PIRAMIDE_LONGE.origemPc },
      raioPc: nivel.raioPc,
      celulas: escolher(celulas),
    };
  }
  /** Como o gerador Python escolhe: 40 entre os 10% mais densos e 32 entre os demais (aqui, em passo fixo). */
  function comoOPython(celulas) {
    const ordem = [...celulas].sort((a, b) => b.media - a.media);
    const densos = ordem.slice(0, Math.max(40, Math.ceil(ordem.length / 10)));
    const resto = ordem.slice(densos.length);
    const passo = (lista, n) => lista.filter((_, m) => m % Math.max(1, Math.floor(lista.length / n)) === 0).slice(0, n);
    return [...passo(densos, 40), ...passo(resto, 32)];
  }
  function gerarPiramide(amostrador) {
    const n0 = coletarGrade(amostradorEdenhofer(imagem, RAIOS_CEU, NPIX_256), N0_LONGE, 8).valores;
    const campo = criarCampo({ grade: N0_LONGE, valores: deFloat16(paraFloat16(n0, 1000), 1000) });
    for (const nivel of PIRAMIDE_LONGE.niveis) {
      const gerado = gerarNivel({ amostrador, campo, piramide: PIRAMIDE_LONGE, nivel, escala: 1000 });
      adicionarNivel(campo, gerado.grade, PIRAMIDE_LONGE.tijolo, gerado.gravados);
    }
    return campo;
  }
  const campo = gerarPiramide(amostradorEdenhoferBilinear(imagem, RAIOS_CEU, NPIX_256));
  const comparar = (k, referencia) => compararNivelComReferencia(campo, PIRAMIDE_LONGE, k, referencia);
  const mover = (referencia, mudarIndice, mudarMedia = (v) => v) => {
    const dims = referencia.grade.dims;
    const celulas = referencia.celulas
      .map((c) => ({ ...c, indice: mudarIndice(c.indice, dims), media: mudarMedia(c.media) }))
      .filter((c) => c.indice.every((v, eixo) => v >= 0 && v < dims[eixo]));
    return { ...referencia, celulas };
  };

  it('certo: toda célula dos dois níveis passa; a de tijolo gravado fica abaixo de 0,5 da folga (o teto do meio ulp do float16)', () => {
    for (const nivel of PIRAMIDE_LONGE.niveis) {
      const { nb, pagina } = campo.niveis[nivel.nivel - 1];
      const gravada = ({ indice }) => {
        const [bi, bj, bk] = indice.map((v) => Math.floor(v / PIRAMIDE_LONGE.tijolo));
        return pagina[bi + nb[0] * (bj + nb[1] * bk)] >= 0;
      };
      // todas: as de tijolo omitido mostram o pai e ganham o limiar do resíduo (medido ≤ 0,95 da folga)
      expect(comparar(nivel.nivel, referenciaDoNivel(nivel)).aprovado).toBe(true);
      // medido: 0,47 (n1, 256 células) e 0,48 (n2, 1.472) nas de tijolo gravado
      const soGravadas = comparar(nivel.nivel, referenciaDoNivel(nivel, (celulas) => celulas.filter(gravada)));
      expect(soGravadas.emTijoloGravado).toBeGreaterThan(200);
      expect(soGravadas.maximoRelativo).toBeLessThan(0.5);
      expect(comparar(nivel.nivel, referenciaDoNivel(nivel, comoOPython)).aprovado).toBe(true);
    }
  });

  it('um voxel de deslocamento (6 sentidos), o espelho (3 eixos) e a unidade (×1,01, ×1000, ÷1000) reprovam com margem', () => {
    // medido (pior célula, em folgas): deslocado ≥ 627, espelho ≥ 900, ×1,01 ≥ 10,3, ×1000 e ÷1000 ≥ 999
    for (const nivel of PIRAMIDE_LONGE.niveis) {
      const referencia = referenciaDoNivel(nivel, comoOPython);
      const k = nivel.nivel;
      const deslocados = [];
      for (let eixo = 0; eixo < 3; eixo += 1) {
        for (const passo of [-1, 1]) {
          deslocados.push(comparar(k, mover(referencia, (ind) => ind.map((v, e) => (e === eixo ? v + passo : v)))).maximoRelativo);
        }
      }
      const espelhos = [0, 1, 2].map(
        (eixo) => comparar(k, mover(referencia, (ind, dims) => ind.map((v, e) => (e === eixo ? dims[e] - 1 - v : v)))).maximoRelativo
      );
      const unidades = [1.01, 1000, 1e-3].map((f) => comparar(k, mover(referencia, (ind) => ind, (v) => v * f)).maximoRelativo);
      for (const r of [...deslocados, ...espelhos]) expect(r).toBeGreaterThan(100);
      for (const r of unidades) expect(r).toBeGreaterThan(5);
    }
  });

  it('o operador antigo (pixel HEALPix mais próximo) reprova célula a célula — a comparação separa os dois operadores', () => {
    // medido: 140 (n1) e 177 (n2) folgas — até ~18% numa célula, como os 20–36% do mapa real
    const antigo = gerarPiramide(amostradorEdenhofer(imagem, RAIOS_CEU, NPIX_256));
    for (const nivel of PIRAMIDE_LONGE.niveis) {
      const r = compararNivelComReferencia(antigo, PIRAMIDE_LONGE, nivel.nivel, referenciaDoNivel(nivel, comoOPython));
      expect(r.maximoRelativo).toBeGreaterThan(20);
    }
  });
});
