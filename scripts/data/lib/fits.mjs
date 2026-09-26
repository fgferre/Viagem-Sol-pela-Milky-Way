// ============================================================
// Leitor FITS mínimo (E1, item 1 do PLAN.md) — restrito ao que o mapa
// de poeira de Edenhofer et al. 2024 usa: HDUs PRIMARY vazio, IMAGE
// float32 big-endian (a esfera HEALPix × distância) e BINTABLE com
// colunas escalares E/D (os raios das cascas). Nada de tipos inteiros,
// random groups, CONTINUE ou compressão — se o mapa um dia usar algo
// disso, o erro claro abaixo avisa antes de ler lixo.
//
// Offsets e tamanhos são sempre `Number` (nunca bitwise de 32 bits):
// o arquivo do mapa tem ~3,25 GB e os offsets das últimas extensões
// passam de 2 GB, onde `x | 0` e `x << n` truncam e corrompem o valor.
// ============================================================
import { closeSync, fstatSync, openSync, readSync } from 'node:fs';

const TAMANHO_CARTAO = 80;
const TAMANHO_BLOCO = 2880;
const CARTOES_POR_BLOCO = TAMANHO_BLOCO / TAMANHO_CARTAO;
const BYTES_POR_COLUNA = { E: 4, D: 8 };

/** Arredonda `bytes` para o próximo múltiplo de 2880 (padding dos blocos FITS). */
export function arredondarParaBloco(bytes) {
  const resto = bytes % TAMANHO_BLOCO;
  return resto === 0 ? bytes : bytes + (TAMANHO_BLOCO - resto);
}

/**
 * Tamanho em bytes da área de dados de um HDU, pela fórmula geral do
 * padrão FITS: GCOUNT × (PCOUNT + ∏ NAXISn) × |BITPIX|/8. Cobre IMAGE
 * (PCOUNT=0, GCOUNT=1) e BINTABLE (BITPIX=8, GCOUNT=1) com a mesma
 * conta. NAXIS=0 (o primário vazio) não tem dado: retorna 0.
 */
export function tamanhoDadosHDU(cabecalho) {
  const naxis = cabecalho.NAXIS ?? 0;
  if (naxis === 0) return 0;
  const bitpix = cabecalho.BITPIX;
  if (!Number.isFinite(bitpix)) throw new Error(`BITPIX ausente ou inválido: ${bitpix}.`);
  const gcount = cabecalho.GCOUNT ?? 1;
  const pcount = cabecalho.PCOUNT ?? 0;
  let produto = 1;
  for (let n = 1; n <= naxis; n += 1) {
    const valor = cabecalho[`NAXIS${n}`];
    if (!Number.isInteger(valor) || valor < 0) throw new Error(`NAXIS${n} inválido: ${valor}.`);
    produto *= valor;
  }
  return gcount * (pcount + produto) * (Math.abs(bitpix) / 8);
}

function interpretarCartao(texto) {
  const chave = texto.slice(0, 8).trim();
  if (chave === 'END') return { chave: 'END', valor: undefined };
  if (chave === '' || chave === 'COMMENT' || chave === 'HISTORY') {
    return { chave: chave || 'COMMENT', valor: texto.slice(8).trim() };
  }
  if (texto.slice(8, 10) !== '= ') return { chave, valor: undefined };
  const resto = texto.slice(10).trimStart();
  let valor;
  if (resto.startsWith("'")) {
    let i = 1;
    let str = '';
    while (i < resto.length) {
      if (resto[i] === "'") {
        if (resto[i + 1] === "'") {
          str += "'";
          i += 2;
          continue;
        }
        i += 1;
        break;
      }
      str += resto[i];
      i += 1;
    }
    valor = str.trimEnd();
  } else {
    const barra = resto.indexOf('/');
    const textoValor = (barra >= 0 ? resto.slice(0, barra) : resto).trim();
    if (textoValor === 'T') valor = true;
    else if (textoValor === 'F') valor = false;
    // notação Fortran de expoente ('1.2D+04'); rara em FITS escrito por
    // astropy, mas o padrão permite e Number() sozinho dá NaN nela.
    else valor = Number(textoValor.replace(/D([+-]?\d+)$/i, 'E$1'));
  }
  return { chave, valor };
}

function lerCabecalho(fd, offsetInicial, tamanhoArquivo, caminho) {
  const cabecalho = {};
  const bloco = Buffer.allocUnsafe(TAMANHO_BLOCO);
  let offset = offsetInicial;
  let terminou = false;
  while (!terminou) {
    if (offset + TAMANHO_BLOCO > tamanhoArquivo) {
      throw new Error(`FITS truncado: cabeçalho sem END em ${caminho} (bloco no offset ${offset}).`);
    }
    const lidos = readSync(fd, bloco, 0, TAMANHO_BLOCO, offset);
    if (lidos !== TAMANHO_BLOCO) {
      throw new Error(`Leitura incompleta do bloco de cabeçalho em ${caminho} (offset ${offset}).`);
    }
    for (let c = 0; c < CARTOES_POR_BLOCO; c += 1) {
      const texto = bloco.toString('latin1', c * TAMANHO_CARTAO, (c + 1) * TAMANHO_CARTAO);
      const { chave, valor } = interpretarCartao(texto);
      if (chave === 'END') {
        terminou = true;
        break;
      }
      if (chave !== 'COMMENT' && chave !== 'HISTORY') cabecalho[chave] = valor;
    }
    offset += TAMANHO_BLOCO;
  }
  return { cabecalho, offsetFimCabecalho: offset };
}

function colunasDaTabela(cabecalho) {
  const tfields = cabecalho.TFIELDS ?? 0;
  const colunas = [];
  let offsetByte = 0;
  for (let i = 1; i <= tfields; i += 1) {
    const forma = String(cabecalho[`TFORM${i}`] ?? '').trim();
    const nomeCru = cabecalho[`TTYPE${i}`];
    const nome = nomeCru != null ? String(nomeCru).trim() : null;
    const casamento = /^(\d*)([A-Za-z])$/.exec(forma);
    if (!casamento) throw new Error(`TFORM${i} não reconhecido: ${JSON.stringify(forma)}.`);
    const repeticao = casamento[1] ? Number(casamento[1]) : 1;
    const tipo = casamento[2].toUpperCase();
    const tamanhoByte = BYTES_POR_COLUNA[tipo];
    if (tamanhoByte == null) {
      throw new Error(`Coluna ${nome ?? i}: tipo TFORM ${tipo} não suportado (só E/D, escalar).`);
    }
    if (repeticao !== 1) {
      throw new Error(`Coluna ${nome ?? i}: repetição ${repeticao} não suportada (só escalar, 1${tipo}).`);
    }
    colunas.push({ indice: i, nome, forma, tipo, offsetByte, tamanhoByte });
    offsetByte += tamanhoByte;
  }
  return colunas;
}

/**
 * Abre um arquivo FITS e devolve a LISTA de HDUs (cada um com cabeçalho,
 * EXTNAME, BITPIX, NAXIS/NAXISn, offset e tamanho de dados). O
 * descritor do arquivo fica aberto, compartilhado por todos os HDUs,
 * para as leituras de dado sob demanda; `hdus.fechar()` o libera.
 */
export function abrirFits(caminho) {
  const fd = openSync(caminho, 'r');
  const tamanhoArquivo = fstatSync(fd).size;
  const hdus = [];
  let offset = 0;
  let numero = 0;
  while (offset < tamanhoArquivo) {
    const { cabecalho, offsetFimCabecalho } = lerCabecalho(fd, offset, tamanhoArquivo, caminho);
    const tipo = numero === 0 ? 'PRIMARY' : String(cabecalho.XTENSION ?? '').trim();
    const naxis = cabecalho.NAXIS ?? 0;
    const naxisn = [];
    for (let n = 1; n <= naxis; n += 1) naxisn.push(cabecalho[`NAXIS${n}`]);
    const tamanhoDados = tamanhoDadosHDU(cabecalho);
    const offsetDados = offsetFimCabecalho;
    if (offsetDados + tamanhoDados > tamanhoArquivo) {
      throw new Error(
        `FITS truncado: HDU ${numero} precisa de ${offsetDados + tamanhoDados} bytes; ` +
          `${caminho} tem ${tamanhoArquivo}.`
      );
    }
    const proximoOffset = offsetDados + arredondarParaBloco(tamanhoDados);
    hdus.push({
      numero,
      tipo,
      extname: cabecalho.EXTNAME != null ? String(cabecalho.EXTNAME).trim() : null,
      bitpix: cabecalho.BITPIX,
      naxis,
      naxisn,
      cabecalho,
      offsetDados,
      tamanhoDados,
      proximoOffset,
      caminho,
      tamanhoArquivo,
      colunas: tipo === 'BINTABLE' ? colunasDaTabela(cabecalho) : null,
      fd,
    });
    offset = proximoOffset;
    numero += 1;
  }
  // Propriedade extra num array: não aparece em map/forEach/for-of nem em
  // JSON.stringify (que só serializa os índices), só em uso explícito.
  hdus.fechar = () => closeSync(fd);
  return hdus;
}

function validarImagemFloat32(hdu, nomeFuncao) {
  if (hdu.tipo === 'BINTABLE') throw new Error(`${nomeFuncao}: HDU ${hdu.numero} é BINTABLE, não imagem.`);
  if (hdu.bitpix !== -32 && hdu.bitpix !== -64) {
    throw new Error(
      `${nomeFuncao}: BITPIX ${hdu.bitpix} não é ponto flutuante FITS válido (só -32 ou -64) no HDU ${hdu.numero}.`
    );
  }
  if (hdu.bitpix === -64) {
    throw new Error(`${nomeFuncao}: BITPIX -64 (float64) não implementado; o mapa usado é -32.`);
  }
  if (hdu.naxis !== 2) throw new Error(`${nomeFuncao}: espera NAXIS=2; HDU ${hdu.numero} tem NAXIS=${hdu.naxis}.`);
}

function conferirFinito(array, contexto) {
  for (let i = 0; i < array.length; i += 1) {
    if (!Number.isFinite(array[i])) throw new Error(`${contexto}: valor não finito (${array[i]}) no índice ${i}.`);
  }
}

/**
 * Lê a linha `i` (casca) de uma imagem 2D float32 big-endian: NAXIS1 =
 * pixels HEALPix, NAXIS2 = cascas radiais. Devolve um `Float32Array`
 * de NAXIS1 elementos, já na ordem nativa (o BE do arquivo é convertido
 * valor a valor por `readFloatBE`, sem depender do endian do host).
 */
export function lerLinhaImagem(hdu, i, { exigirFinito = false } = {}) {
  validarImagemFloat32(hdu, 'lerLinhaImagem');
  const [naxis1, naxis2] = hdu.naxisn;
  if (!Number.isInteger(i) || i < 0 || i >= naxis2) {
    throw new Error(`lerLinhaImagem: linha ${i} fora do intervalo [0, ${naxis2}) no HDU ${hdu.numero}.`);
  }
  const bytesLinha = naxis1 * 4;
  const offset = hdu.offsetDados + i * bytesLinha;
  const bruto = Buffer.allocUnsafe(bytesLinha);
  const lidos = readSync(hdu.fd, bruto, 0, bytesLinha, offset);
  if (lidos !== bytesLinha) {
    throw new Error(`lerLinhaImagem: leitura incompleta da linha ${i} do HDU ${hdu.numero} (lidos ${lidos} de ${bytesLinha}).`);
  }
  const saida = new Float32Array(naxis1);
  for (let p = 0; p < naxis1; p += 1) saida[p] = bruto.readFloatBE(p * 4);
  if (exigirFinito) conferirFinito(saida, `lerLinhaImagem HDU ${hdu.numero} linha ${i}`);
  return saida;
}

/**
 * Lê a imagem 2D completa (todas as cascas) num único `Float32Array`
 * de NAXIS1×NAXIS2 elementos, linha a linha (1,6 GB cabem no Node 25).
 */
export function lerImagemInteira(hdu, { exigirFinito = false } = {}) {
  validarImagemFloat32(hdu, 'lerImagemInteira');
  const [naxis1, naxis2] = hdu.naxisn;
  const saida = new Float32Array(naxis1 * naxis2);
  for (let linha = 0; linha < naxis2; linha += 1) {
    saida.set(lerLinhaImagem(hdu, linha), linha * naxis1);
  }
  if (exigirFinito) conferirFinito(saida, `lerImagemInteira HDU ${hdu.numero}`);
  return saida;
}

function encontrarColuna(hdu, nomeOuIndice) {
  if (!hdu.colunas) throw new Error(`lerColunaTabela: HDU ${hdu.numero} não tem colunas (não é BINTABLE).`);
  const coluna =
    typeof nomeOuIndice === 'number'
      ? hdu.colunas[nomeOuIndice - 1]
      : hdu.colunas.find((c) => c.nome === nomeOuIndice);
  if (!coluna) throw new Error(`lerColunaTabela: coluna ${JSON.stringify(nomeOuIndice)} não encontrada no HDU ${hdu.numero}.`);
  return coluna;
}

/**
 * Lê uma coluna escalar (`TFORMn` = 'E' ou 'D') de um HDU BINTABLE,
 * por nome (TTYPEn) ou índice 1-based. Devolve sempre `Float64Array`,
 * uma entrada por linha.
 */
export function lerColunaTabela(hdu, nomeOuIndice, { exigirFinito = false } = {}) {
  if (hdu.tipo !== 'BINTABLE') throw new Error(`lerColunaTabela: HDU ${hdu.numero} não é BINTABLE (é ${hdu.tipo}).`);
  const coluna = encontrarColuna(hdu, nomeOuIndice);
  const bytesLinha = hdu.naxisn[0] ?? 0;
  const linhas = hdu.naxisn[1] ?? 0;
  const tamanhoTabela = bytesLinha * linhas;
  const bruto = Buffer.allocUnsafe(tamanhoTabela);
  const lidos = readSync(hdu.fd, bruto, 0, tamanhoTabela, hdu.offsetDados);
  if (lidos !== tamanhoTabela) {
    throw new Error(`lerColunaTabela: leitura incompleta do HDU ${hdu.numero} (lidos ${lidos} de ${tamanhoTabela}).`);
  }
  const saida = new Float64Array(linhas);
  for (let linha = 0; linha < linhas; linha += 1) {
    const offset = linha * bytesLinha + coluna.offsetByte;
    saida[linha] = coluna.tipo === 'E' ? bruto.readFloatBE(offset) : bruto.readDoubleBE(offset);
  }
  if (exigirFinito) conferirFinito(saida, `lerColunaTabela HDU ${hdu.numero} coluna ${JSON.stringify(nomeOuIndice)}`);
  return saida;
}
