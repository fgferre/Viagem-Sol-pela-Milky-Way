// ============================================================
// Leitor FITS mínimo (E1, item 3 do PLAN.md). Monta um FITS SINTÉTICO
// num diretório temporário (primário vazio + IMAGE 4×3 float32 BE com
// valores conhecidos + BINTABLE com uma coluna `E`) e confere byte a
// byte. A aritmética de offsets/tamanho é testada separada, com um
// cabeçalho SIMULADO do tamanho real do mapa de Edenhofer (786432×516,
// BITPIX -32, ~1,6 GB de dados) — sem tocar no arquivo de 3 GB, que
// não entra na suíte (decisão 6 do PLAN.md).
// ============================================================
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  abrirFits,
  arredondarParaBloco,
  lerColunaTabela,
  lerImagemInteira,
  lerLinhaImagem,
  tamanhoDadosHDU,
} from './fits.mjs';

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

const VALORES_IMAGEM = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // NAXIS1=4 (pixels), NAXIS2=3 (cascas)
const RAIOS = [10.5, 20.5, 30.5];

function montarFitsSintetico() {
  const primario = montarCabecalho([['SIMPLE', true], ['BITPIX', 8], ['NAXIS', 0], ['EXTEND', true]]);
  const cabecalhoImagem = montarCabecalho([
    ['XTENSION', 'IMAGE'], ['BITPIX', -32], ['NAXIS', 2],
    ['NAXIS1', 4], ['NAXIS2', 3], ['PCOUNT', 0], ['GCOUNT', 1], ['EXTNAME', 'MEAN'],
  ]);
  const cabecalhoTabela = montarCabecalho([
    ['XTENSION', 'BINTABLE'], ['BITPIX', 8], ['NAXIS', 2],
    ['NAXIS1', 4], ['NAXIS2', 3], ['PCOUNT', 0], ['GCOUNT', 1],
    ['TFIELDS', 1], ['TTYPE1', 'radial pixel centers'], ['TFORM1', 'E'], ['EXTNAME', 'RADII'],
  ]);
  return Buffer.concat([
    primario,
    cabecalhoImagem, bufferFloatsBE(VALORES_IMAGEM),
    cabecalhoTabela, bufferFloatsBE(RAIOS),
  ]);
}

let dir;
let hdus;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'fits-test-'));
  writeFileSync(join(dir, 'sintetico.fits'), montarFitsSintetico());
  hdus = abrirFits(join(dir, 'sintetico.fits'));
});

afterAll(() => {
  hdus?.fechar();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe('abrirFits — estrutura dos HDUs', () => {
  it('lê os 3 HDUs (primário vazio, imagem, tabela) com cabeçalho e offsets certos', () => {
    expect(hdus).toHaveLength(3);
    expect(hdus[0].tipo).toBe('PRIMARY');
    expect(hdus[0].tamanhoDados).toBe(0);
    expect(hdus[1].tipo).toBe('IMAGE');
    expect(hdus[1].extname).toBe('MEAN');
    expect(hdus[1].bitpix).toBe(-32);
    expect(hdus[1].naxisn).toEqual([4, 3]);
    expect(hdus[1].tamanhoDados).toBe(48); // 4*3*4 bytes
    expect(hdus[2].tipo).toBe('BINTABLE');
    expect(hdus[2].extname).toBe('RADII');
    expect(hdus[2].colunas).toEqual([
      { indice: 1, nome: 'radial pixel centers', forma: 'E', tipo: 'E', offsetByte: 0, tamanhoByte: 4 },
    ]);
    // layout em blocos de 2880: primário | cabeçalho imagem | dado imagem
    // (48 B, com padding) | cabeçalho tabela | dado tabela
    expect(hdus[1].offsetDados).toBe(TAMANHO_BLOCO * 2); // 5760
    expect(hdus[1].proximoOffset).toBe(TAMANHO_BLOCO * 3); // 8640: dado de 48 B cabe em 1 bloco
    expect(hdus[2].offsetDados).toBe(TAMANHO_BLOCO * 4); // 11520: +1 bloco do cabeçalho da tabela
    expect(hdus[2].offsetDados % TAMANHO_BLOCO).toBe(0);
  });
});

describe('lerLinhaImagem / lerImagemInteira', () => {
  it('lê cada linha (casca) float32 BE na ordem certa', () => {
    expect([...lerLinhaImagem(hdus[1], 0)]).toEqual([1, 2, 3, 4]);
    expect([...lerLinhaImagem(hdus[1], 1)]).toEqual([5, 6, 7, 8]);
    expect([...lerLinhaImagem(hdus[1], 2)]).toEqual([9, 10, 11, 12]);
  });

  it('lê a imagem inteira igual à concatenação das linhas', () => {
    const cheia = lerImagemInteira(hdus[1]);
    expect(cheia).toBeInstanceOf(Float32Array);
    expect([...cheia]).toEqual(VALORES_IMAGEM);
  });

  it('rejeita linha fora do intervalo e HDU que não é imagem', () => {
    expect(() => lerLinhaImagem(hdus[1], 3)).toThrow(/fora do intervalo/);
    expect(() => lerLinhaImagem(hdus[2], 0)).toThrow(/BINTABLE/);
  });

  it('rejeita BITPIX que não é ponto flutuante (só -32/-64 são válidos)', () => {
    const primario = montarCabecalho([['SIMPLE', true], ['BITPIX', 8], ['NAXIS', 0]]);
    const cabecalhoInt = montarCabecalho([
      ['XTENSION', 'IMAGE'], ['BITPIX', 16], ['NAXIS', 2],
      ['NAXIS1', 4], ['NAXIS2', 3], ['PCOUNT', 0], ['GCOUNT', 1],
    ]);
    const dadosInt = Buffer.alloc(paraBloco(4 * 3 * 2));
    const caminho = join(dir, 'bitpix-invalido.fits');
    writeFileSync(caminho, Buffer.concat([primario, cabecalhoInt, dadosInt]));
    const outros = abrirFits(caminho);
    expect(() => lerLinhaImagem(outros[1], 0)).toThrow(/-32 ou -64/);
    outros.fechar();
  });
});

describe('lerColunaTabela', () => {
  it('lê a coluna por nome e por índice 1-based, sempre em Float64Array', () => {
    const porNome = lerColunaTabela(hdus[2], 'radial pixel centers');
    const porIndice = lerColunaTabela(hdus[2], 1);
    expect(porNome).toBeInstanceOf(Float64Array);
    expect([...porNome]).toEqual(RAIOS);
    expect([...porIndice]).toEqual(RAIOS);
  });

  it('rejeita coluna inexistente e HDU que não é tabela', () => {
    expect(() => lerColunaTabela(hdus[2], 'não existe')).toThrow(/não encontrada/);
    expect(() => lerColunaTabela(hdus[1], 1)).toThrow(/não é BINTABLE/);
  });
});

describe('exigirFinito — validação de valor, só quando pedido', () => {
  it('por padrão deixa passar NaN; com exigirFinito, lança erro claro', () => {
    const valoresComNaN = [1, 2, Number.NaN, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const primario = montarCabecalho([['SIMPLE', true], ['BITPIX', 8], ['NAXIS', 0]]);
    const cabecalhoImagem = montarCabecalho([
      ['XTENSION', 'IMAGE'], ['BITPIX', -32], ['NAXIS', 2],
      ['NAXIS1', 4], ['NAXIS2', 3], ['PCOUNT', 0], ['GCOUNT', 1],
    ]);
    const caminho = join(dir, 'com-nan.fits');
    writeFileSync(caminho, Buffer.concat([primario, cabecalhoImagem, bufferFloatsBE(valoresComNaN)]));
    const comNaN = abrirFits(caminho);
    expect(Number.isNaN(lerLinhaImagem(comNaN[1], 0)[2])).toBe(true);
    expect(() => lerLinhaImagem(comNaN[1], 0, { exigirFinito: true })).toThrow(/não finito/);
    expect(() => lerImagemInteira(comNaN[1], { exigirFinito: true })).toThrow(/não finito/);
    comNaN.fechar();
  });
});

describe('erros claros de cabeçalho', () => {
  it('recusa arquivo sem END em bloco nenhum', () => {
    const semEnd = [cartao('SIMPLE', true), cartao('BITPIX', 8), cartao('NAXIS', 0)].join('');
    const caminho = join(dir, 'sem-end.fits');
    writeFileSync(caminho, Buffer.from(semEnd.padEnd(TAMANHO_BLOCO, ' '), 'latin1'));
    expect(() => abrirFits(caminho)).toThrow(/sem END/);
  });

  it('recusa arquivo truncado antes do fim dos dados que o cabeçalho declara', () => {
    const completo = montarFitsSintetico();
    const necessario = hdus[2].offsetDados + hdus[2].tamanhoDados;
    const caminho = join(dir, 'truncado.fits');
    writeFileSync(caminho, completo.subarray(0, necessario - 1));
    expect(() => abrirFits(caminho)).toThrow(/truncado/);
  });
});

describe('aritmética de offsets — sem ler dado (o FITS de 3 GB não entra na suíte)', () => {
  it('calcula o tamanho de dados do HDU real do mapa (786432×516, BITPIX -32) como Number exato', () => {
    const tamanho = tamanhoDadosHDU({ NAXIS: 2, NAXIS1: 786432, NAXIS2: 516, BITPIX: -32 });
    expect(tamanho).toBe(1_623_195_648);
    expect(arredondarParaBloco(tamanho) % TAMANHO_BLOCO).toBe(0);
  });

  it('um offset desse porte se corromperia num bitwise de 32 bits — por isso Number, nunca `| 0`', () => {
    const tamanho = tamanhoDadosHDU({ NAXIS: 2, NAXIS1: 786432, NAXIS2: 516, BITPIX: -32 });
    const offsetBase = 2_000_000_000; // um HDU anterior qualquer, dentro do arquivo de 3 GB
    const proximoOffset = offsetBase + tamanho;
    expect(proximoOffset).toBe(3_623_195_648);
    expect(proximoOffset).toBeGreaterThan(2 ** 31);
    // a armadilha que este módulo evita: bitwise de 32 bits trunca/inverte o sinal
    expect(proximoOffset | 0).not.toBe(proximoOffset);
  });

  it('HDU vazio (NAXIS=0, o primário) não tem dado', () => {
    expect(tamanhoDadosHDU({ NAXIS: 0, BITPIX: 8 })).toBe(0);
  });
});
