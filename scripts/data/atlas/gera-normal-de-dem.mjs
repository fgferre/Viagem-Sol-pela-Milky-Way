// ============================================================
// O MAPA DE NORMAIS DE UM CORPO, assado do DEM público dele
// (item 140 na Lua, item 141 em Mercúrio, Marte, Ceres e Vesta).
//
//   node scripts/data/atlas/gera-normal-de-dem.mjs moon
//   node scripts/data/atlas/gera-normal-de-dem.mjs mercury
//   node scripts/data/atlas/gera-normal-de-dem.mjs mars --manter
//   node scripts/data/atlas/gera-normal-de-dem.mjs moon --dem /caminho/ldem.tif
//   node scripts/data/atlas/gera-normal-de-dem.mjs vesta --varredura
//
// POR QUE ESTE SCRIPT EXISTE. Até o item 140 os corpos com mapa tinham
// só a COR, e o relevo deles era INVENTADO a partir dela (o bump por
// derivada do albedo da S2 do item 134): mancha escura virava buraco,
// mancha clara virava crista. Na Lua isso afundava os mares e levantava
// os raios de Tycho — palavras do dono: "não corresponde mais ao que
// observamos". O conserto é DADO, não shader: onde existe topografia
// medida e pública, a normal vem dela.
//
// UM SCRIPT, CINCO CORPOS (item 141). A tabela `CORPOS` é a única coisa
// que muda de um para o outro: a fonte, o raio de referência, a
// conversão que os metadados da fonte declaram e em que longitude a
// borda esquerda do DEM cai. A conta da normal, a guarda de alinhamento
// e a escrita são as mesmas para todos.
//
// A CONVERSÃO É A DO GDAL: valor = bruto × SCALE + OFFSET, que é o que
// o GeoTIFF declara em `GDALMetadata` (`role="scale"`/`role="offset"`).
// O que sai dela é ALTURA sobre o datum em três corpos (Lua, Mercúrio,
// Marte) e o RAIO EM METROS nos dois da Dawn (Ceres traz OFFSET 470000,
// Vesta guarda o raio direto no float) — a diferença é constante e some
// na derivada, mas o número impresso passa a querer dizer alguma coisa.
// A Lua declara aqui o par que o SVS publica em prosa (deslocamento
// +20.000, unidade 0,5 m) já na forma do GDAL: escala 0,5, offset
// −10.000. É a MESMA conta, e o produto dela sai byte a byte igual.
//
// O ELIPSOIDE JÁ ESTÁ NA GEOMETRIA (Ceres e Vesta). A malha da casa não
// é esfera: `normalDoCorpo` devolve a normal do ELIPSOIDE de `BODY_AXES`
// (Ceres 487,3×446; Vesta 289×280×229), e o mapa só a PERTURBA. Um DEM
// medido sobre esfera carrega a figura global inteira — em Vesta são 60
// km de achatamento num raio de 255, uma rampa sistemática de ~8° que a
// geometria JÁ desenha. Assar isso no mapa contaria a mesma forma duas
// vezes. Por isso, onde `eixosDaCasaKm` existe, o script SUBTRAI o raio
// do elipsoide de revolução da casa antes de derivar, e o que sobra é o
// relevo sobre a bola que a casa realmente desenha. O preço declarado:
// a subtração é AXISSIMÉTRICA (a equatorial é a média de a e b), então
// os 9 km entre os dois eixos equatoriais de Vesta ficam no resíduo
// (~0,6° de rampa), e a diferença entre o elipsoide da casa e o do dado
// (Ceres 487,3 contra os 482 que a Dawn mediu) também. Nos outros três
// o campo não existe e nada é subtraído: Mercúrio e a Lua são esferas em
// `BODY_AXES`, e o achatamento de Marte vale 0,2° contra um RMS de 1,94°.
//
// A CONTA. Normal em ESPAÇO TANGENTE sobre a esfera equiretangular, na
// convenção que `normalDoMapa` (corpos.ts) consome: x ao longo de +u
// (leste), y ao longo de +v (norte), z para fora. Para um campo de
// altura,
//
//     m = normalize(-dh/dLeste, -dh/dNorte, 1)
//
// com as derivadas em METROS POR METRO — as distâncias horizontais são
// as da esfera, não as do pixel: um passo em coluna vale
// R*cos(lat)*dLon e um passo em linha vale R*dLat. É isto que faz a
// amplitude ser FÍSICA: nenhum ganho entra aqui, e uma encosta de 8° no
// dado sai como 8° no mapa.
//
// O CLAMP DO POLO. `cos(lat)` vai a zero no polo e o passo leste some
// junto: na última linha de um mapa de 2048 os texels distam 2 m, e
// qualquer degrau de 1 m viraria uma parede. O denominador leste é
// preso no valor de 80° de latitude — acima disso a inclinação
// leste-oeste sai SUBESTIMADA, que é o preço declarado do
// equiretangular (e o próprio shader devolve a normal geométrica no
// polo, onde o frame degenera).
//
// A GUARDA DE ALINHAMENTO. O mapa de cor e o DEM têm de estar na MESMA
// convenção de longitude, senão o relevo cai fora — o defeito que o
// item 138 achou nas luas de Saturno, e o risco real de Vesta, cujos
// produtos da Dawn circulam em DOIS sistemas (o "Claudia" de operação e
// o da IAU, ~150° de diferença). `--varredura` mede as 72 defasagens de
// 5° e imprime o pico, que é como se acha o giro certo quando ele não é
// meia volta. A prova é medida em 720x360 e tem DUAS partes:
//
//   1. ENERGIA DE BORDA (universal): a correlação entre |∇altura| e
//      |∇albedo|. Onde há degrau de terreno há degrau de imagem, e o
//      sinal do degrau não importa — por isso esta medida funciona
//      mesmo onde o albedo NÃO acompanha a altura. A orientação
//      declarada tem de vencer a meia volta por pelo menos 0,05.
//      Medido: Lua 0,261 contra 0,008; Mercúrio 0,196 contra 0,021;
//      Marte 0,139 contra −0,016 (a varredura das 72 defasagens tem
//      pico agudo exatamente na declarada nos três).
//
//      O ALBEDO É SEMPRE O MAPA ENTREGUE. Na 2ª fase Ceres precisou de
//      exceção — o mapa da casa era o `2k_ceres_fictional`, que a
//      própria fonte declarava inventado, e correlacionar um DEM com uma
//      invenção não prova nada —, e a guarda media contra o mosaico real
//      da Dawn, baixado só para isso. A 3ª fase pôs esse mosaico NA
//      ÁRVORE como o mapa de cor de Ceres, e a exceção morreu: o que a
//      guarda compara é o que a tela mostra, nos cinco corpos.
//   2. CORRELAÇÃO COM SINAL (só onde ela é fato): na Lua, mares baixos
//      E escuros, terras altas E claras dão +0,61, e o item 140 assou
//      com o piso de +0,3. Em Mercúrio ela é NEGATIVA (−0,14) e em
//      Marte é fraca (+0,17): ali o albedo é composição e poeira, não
//      forma, e exigir sinal seria exigir uma física que não existe.
//      Por isso o piso é POR CORPO e só a Lua o tem.
//
// O DEM NÃO FICA NA ÁRVORE: é matéria-prima de dezenas ou centenas de
// MB para um produto de alguns MB, e o script o apaga ao terminar
// quando foi ele quem baixou (`--manter` segura, para quem reamostrar).
//
// A LEITURA POR FAIXAS (Mercúrio, Ceres, Vesta). O DEM da USGS de
// Mercúrio tem 23040x11520 e 530 MB — acima do teto de download desta
// casa; os da Dawn têm 466 MB (Ceres) e 597 MB (Vesta). Os três são
// GeoTIFF SEM COMPRESSÃO, uma tira por linha e tiras contíguas, então
// dá para ler pela rede SÓ as linhas que a grade de saída usa: 2 linhas
// de origem por linha de saída. Medido: Mercúrio 212 MiB em vez de 530
// MB (180 do assamento mais 32 da guarda). O preço é declarado — das
// 5,6 linhas de origem que cabem em cada linha de saída, a média usa 2;
// nas COLUNAS a média é completa (as 23040 entram). É borrão de
// latitude, não deslocamento. O leitor aceita 16 bits com sinal
// (Mercúrio, Ceres) e 32 bits em ponto flutuante (Vesta), que é o que
// os cabeçalhos declaram.
// ============================================================

import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { giraColunasDeImagem } from './lib-texturas.mjs';

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
);

/**
 * OS CORPOS QUE TÊM DEM GLOBAL PÚBLICO. `offsetDoDado` e
 * `metrosPorUnidade` são a conversão que a PRÓPRIA fonte declara, NA
 * CONVENÇÃO DO GDAL (valor_m = bruto × unidade + offset); onde o
 * arquivo carrega os metadados, o script os lê e RECUSA a assar se
 * divergirem daqui.
 *
 * `longitudeDaBordaEsquerdaGraus` é onde a PRIMEIRA COLUNA do DEM cai em
 * longitude leste — a casa entrega texturas centradas em 0°, ou seja
 * com a borda esquerda em 180°, e o giro sai da diferença.
 *
 * `eixosDaCasaKm` só existe onde o elipsoide de `BODY_AXES` não é
 * esfera a ponto de importar (ver o cabeçalho): `a` é a média dos dois
 * eixos equatoriais e `c` o polar, e o raio desse elipsoide é subtraído
 * do dado antes de derivar, para não contar a figura global duas vezes.
 */
export const CORPOS = {
  moon: {
    nome: 'Lua',
    diretorio: 'moon',
    // A esfera de referência do LOLA.
    raioM: 1737400,
    // O SVS declara na página: dado deslocado em +20.000 para ficar
    // positivo, unidade de 0,5 m — na forma do GDAL, ×0,5 e −10.000.
    offsetDoDado: -10000,
    metrosPorUnidade: 0.5,
    longitudeDaBordaEsquerdaGraus: 180,
    // o número do item 140 — na Lua o albedo É forma (mar liso e
    // escuro, terra alta e clara)
    correlacaoMinima: 0.3,
    fonte: {
      tipo: 'imagem',
      nome: 'ldem_16_uint.tif',
      url: 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_16_uint.tif',
      descricao: 'LDEM do LOLA/LRO a 16 px/grau (CGI Moon Kit, NASA SVS)',
    },
  },

  mercury: {
    nome: 'Mercúrio',
    diretorio: 'mercury',
    // o raio local que o GeoTIFF declara na geokey 2057 (2439,4 km)
    raioM: 2439400,
    // GDALMetadata do próprio TIF: OFFSET 0, SCALE 0.5
    offsetDoDado: 0,
    metrosPorUnidade: 0.5,
    // o TIF nasce com o meridiano central em 180° (geokey 3088) e a
    // borda esquerda em 0°; a textura da casa é centrada em 0°
    longitudeDaBordaEsquerdaGraus: 0,
    fonte: {
      tipo: 'tif-por-faixas',
      nome: 'Mercury_Messenger_USGS_DEM_Global_665m_v2.tif',
      url: 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mercury_Messenger_USGS_DEM_Global_665m_v2.tif',
      descricao: 'MESSENGER Global DEM 665 m v2 (USGS Astrogeology)',
      /** linhas de origem lidas por linha de saída (ver o cabeçalho). */
      linhasPorSaida: 2,
      semDado: -32768,
    },
  },

  mars: {
    nome: 'Marte',
    diretorio: 'mars',
    // A_AXIS_RADIUS do rótulo PDS
    raioM: 3396000,
    // o rótulo diz UNIT = METER e não traz escala nem deslocamento
    offsetDoDado: 0,
    metrosPorUnidade: 1,
    // MEGDR nasce com a borda esquerda em 0° (CENTER_LONGITUDE 180)
    longitudeDaBordaEsquerdaGraus: 0,
    fonte: {
      tipo: 'cru-msb16',
      nome: 'megt90n000eb.img',
      url: 'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/megt90n000eb.img',
      rotulo:
        'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/megt90n000eb.lbl',
      descricao: 'MOLA MEGDR topografia global a 16 px/grau (MGS, PDS)',
      largura: 5760,
      altura: 2880,
    },
  },

  ceres: {
    nome: 'Ceres',
    diretorio: 'ceres',
    // a esfera de projeção que o rótulo PDS3 e a geokey 2057 declaram
    raioM: 470000,
    // GDALMetadata do TIF: OFFSET 470000, SCALE 1 — o texel é a ALTURA
    // sobre a esfera de 470 km e o offset a devolve como RAIO em metros
    offsetDoDado: 470000,
    metrosPorUnidade: 1,
    // CENTER_LONGITUDE 180 no rótulo, geokey 3088 = 180: borda esquerda
    // em 0°, como Mercúrio e Marte
    longitudeDaBordaEsquerdaGraus: 0,
    // BODY_AXES.ceres = [487,3, 487,3, 446] — já esférico em a e b
    eixosDaCasaKm: { a: 487.3, c: 446 },
    fonte: {
      tipo: 'tif-por-faixas',
      nome: 'Ceres_Dawn_FC_HAMO_DTM_DLR_Global_60ppd_Oct2016.tif',
      url: 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Ceres_Dawn_FC_HAMO_DTM_DLR_Global_60ppd_Oct2016.tif',
      descricao: 'Dawn FC HAMO DTM global 60 px/grau, 137 m (DLR, via USGS Astrogeology)',
      linhasPorSaida: 2,
      semDado: -32768,
    },
  },

  vesta: {
    nome: 'Vesta',
    diretorio: 'vesta',
    // a esfera de projeção do rótulo PDS3 (A=B=C=255 km); NÃO é o raio
    // do corpo, que é o elipsoide de `eixosDaCasaKm`
    raioM: 255000,
    // o TIF não traz GDALMetadata: o float32 já é o RAIO em metros
    // (medido: 279 km de média no equador, 224 no polo)
    offsetDoDado: 0,
    metrosPorUnidade: 1,
    // OS 150° DE VESTA, RESOLVIDOS NA COR (item 141, 3ª fase). Vesta tem
    // DOIS sistemas de longitude a 150° um do outro: o "Claudia" com que a
    // Dawn operou e o "Claudia Double Prime" que a IAU aprovou, que é o
    // que `iauOrientation.ts` usa para girar o corpo. Este DEM está na
    // IAU e o rótulo diz a verdade: CENTER_LONGITUDE 0 (geokey 3088 = 0),
    // borda esquerda em 180°, a mesma da casa — giro 0.
    // Na 2ª fase quem estava fora era o MAPA DE COR (o mosaico embutido
    // no modelo 3D da NASA, no sistema da sonda), e o relevo foi torcido
    // para acompanhá-lo (borda declarada em 30°). Agora a cor foi girada
    // −150° na aquisição (`baixa-texturas.mjs`) e os dois estão na IAU:
    // o relevo volta ao rótulo, e a face que o Sol ilumina numa data
    // também passa a ser a certa.
    longitudeDaBordaEsquerdaGraus: 180,
    // BODY_AXES.vesta = [289, 280, 229]; `a` é a média equatorial
    eixosDaCasaKm: { a: 284.5, c: 229 },
    fonte: {
      tipo: 'tif-por-faixas',
      nome: 'Vesta_Dawn_HAMO_DTM_DLR_Global_48ppd.tif',
      url: 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Vesta_Dawn_HAMO_DTM_DLR_Global_48ppd.tif',
      descricao: 'Dawn HAMO DTM global 48 px/grau, 93 m (DLR, via USGS Astrogeology)',
      linhasPorSaida: 2,
      // o GDALNoData do TIF é o menor float negativo
      semDado: -1e30,
    },
  },
};

/** Largura do mapa assado — a fonte da escada (2048/1024 saem dela). */
const LARGURA_ALVO = 4096;

/** Latitude onde o passo leste para de encolher (ver o cabeçalho). */
const LATITUDE_DO_CLAMP_RAD = (80 * Math.PI) / 180;

/** Quanto a orientação declarada tem de vencer a meia volta. */
export const MARGEM_DA_BORDA = 0.05;

/**
 * A longitude leste em que cai a PRIMEIRA COLUNA das texturas da casa.
 * Todas são equiretangulares centradas em 0°, então a borda é 180°.
 */
const LONGITUDE_ESQUERDA_DA_CASA = 180;

/** Passo da varredura de `--varredura`: 72 posições de 5°. */
const PASSO_DA_VARREDURA_GRAUS = 5;

/** Grade em que as duas medidas da guarda são feitas. */
const LARGURA_DA_GUARDA = 720;

const megabytes = (bytes) => `${(bytes / 1048576).toFixed(2)} MB`;

// ------------------------------------------------------------
// A MATÉRIA-PRIMA
// ------------------------------------------------------------

/** Baixa o DEM para o temporário do sistema, se ainda não estiver lá. */
async function garantirArquivo(fonte, caminhoDado) {
  if (caminhoDado) return { caminho: caminhoDado, baixado: false };
  const caminho = path.join(os.tmpdir(), fonte.nome);
  if (existsSync(caminho)) return { caminho, baixado: false };
  console.log(`baixando ${fonte.url} …`);
  const resposta = await fetch(fonte.url);
  if (!resposta.ok) throw new Error(`${fonte.nome}: HTTP ${resposta.status}`);
  await writeFile(caminho, Buffer.from(await resposta.arrayBuffer()));
  return { caminho, baixado: true };
}

/**
 * O CABEÇALHO DO GeoTIFF, lido por faixas — só o que a leitura remota
 * precisa. Recusa tudo que não seja o caso simples que ela sabe ler:
 * TIFF clássico little-endian, SEM compressão, uma tira por linha,
 * tiras contíguas e amostra de 16 bits com sinal (Mercúrio, Ceres) ou
 * 32 bits em ponto flutuante (Vesta). Também devolve o OFFSET/SCALE que
 * o GDALMetadata declara — é ele que manda na conversão, não a tabela.
 */
async function cabecalhoDoTifRemoto(url) {
  const faixa = async (ini, bytes) => {
    const r = await fetch(url, { headers: { Range: `bytes=${ini}-${ini + bytes - 1}` } });
    if (!r.ok && r.status !== 206) throw new Error(`HTTP ${r.status} ao ler o cabeçalho`);
    return Buffer.from(await r.arrayBuffer());
  };
  const cab = await faixa(0, 8);
  if (cab.toString('ascii', 0, 2) !== 'II' || cab.readUInt16LE(2) !== 42) {
    throw new Error('só sei ler TIFF clássico little-endian por faixas.');
  }
  const ifd = cab.readUInt32LE(4);
  const conta = (await faixa(ifd, 2)).readUInt16LE(0);
  const buf = await faixa(ifd + 2, conta * 12);
  const tags = new Map();
  for (let k = 0; k < conta; k += 1) {
    const o = k * 12;
    tags.set(buf.readUInt16LE(o), {
      tipo: buf.readUInt16LE(o + 2),
      conta: buf.readUInt32LE(o + 4),
      valor: buf.readUInt32LE(o + 8),
      curto: buf.readUInt16LE(o + 8),
    });
  }
  const curto = (t) => tags.get(t)?.curto;
  const largura = curto(256);
  const altura = curto(257);
  const bits = curto(258);
  const formato = curto(339); // 2 = inteiro com sinal, 3 = ponto flutuante
  const inteiro16 = bits === 16 && formato === 2;
  const flutuante32 = bits === 32 && formato === 3;
  if (!inteiro16 && !flutuante32) {
    throw new Error(`esperava 16 bits com sinal ou 32 em ponto flutuante; achei ${bits}/${formato}.`);
  }
  const bytesPorAmostra = bits / 8;
  if (curto(259) !== 1) throw new Error('esperava TIFF sem compressão.');
  if (curto(277) !== 1) throw new Error('esperava uma amostra por pixel.');
  if (curto(278) !== 1) throw new Error('esperava uma linha por tira.');
  const tiras = tags.get(273);
  const inicios = await faixa(tiras.valor, tiras.conta * 4);
  const base = inicios.readUInt32LE(0);
  for (let j = 1; j < tiras.conta; j += 1) {
    if (inicios.readUInt32LE(j * 4) !== base + j * largura * bytesPorAmostra) {
      throw new Error(`tira ${j} fora da sequência — a leitura por faixas não serve.`);
    }
  }
  let offset = 0;
  let escala = 1;
  const gdal = tags.get(42112);
  if (gdal) {
    const texto = (await faixa(gdal.valor, gdal.conta)).toString('ascii');
    offset = Number(/name="OFFSET"[^>]*>([^<]+)</.exec(texto)?.[1] ?? 0);
    escala = Number(/name="SCALE"[^>]*>([^<]+)</.exec(texto)?.[1] ?? 1);
  }
  return { largura, altura, base, offset, escala, bytesPorAmostra, flutuante32 };
}

/** Confere o rótulo PDS contra a tabela — os metadados mandam. */
async function conferirRotuloPds(corpo) {
  const resposta = await fetch(corpo.fonte.rotulo);
  if (!resposta.ok) throw new Error(`rótulo: HTTP ${resposta.status}`);
  const texto = await resposta.text();
  const campo = (nome) => new RegExp(`${nome}\\s*=\\s*"?([^"\\s<]+)`).exec(texto)?.[1];
  const esperado = {
    LINE_SAMPLES: String(corpo.fonte.largura),
    LINES: String(corpo.fonte.altura),
    SAMPLE_TYPE: 'MSB_INTEGER',
    SAMPLE_BITS: '16',
    A_AXIS_RADIUS: String(corpo.raioM / 1000),
  };
  for (const [nome, valor] of Object.entries(esperado)) {
    const lido = campo(nome);
    // número compara por VALOR ("3396.0" é 3396); texto compara igual
    const bate = Number.isNaN(Number(valor))
      ? lido === valor
      : Number(lido) === Number(valor);
    if (!bate) {
      throw new Error(`o rótulo diz ${nome} = ${lido}, a tabela espera ${valor} — não asso.`);
    }
  }
  console.log(
    `rótulo PDS conferido: ${esperado.LINE_SAMPLES}x${esperado.LINES}, ` +
      `${esperado.SAMPLE_TYPE} de ${esperado.SAMPLE_BITS} bits, raio ${esperado.A_AXIS_RADIUS} km.`
  );
}

// ------------------------------------------------------------
// A ALTURA EM METROS, na grade que se pedir
// ------------------------------------------------------------

/**
 * A MÉDIA DE CAIXA de uma grade crua para a grade de saída. `daLinha`
 * entrega os valores BRUTOS de uma linha de origem (já sem endianness);
 * `linhasPorSaida` limita quantas linhas de origem entram na média de
 * cada linha de saída — é o botão que a leitura remota usa para não
 * baixar o arquivo inteiro.
 */
async function mediaDeCaixa(
  daLinha, origem, largura, altura, linhasPorSaida, semDado, preencheComAMedia
) {
  // sai em VALOR BRUTO da fonte; a conversão para metros é do chamador
  const media = new Float32Array(largura * altura);
  let vazios = 0;
  for (let j = 0; j < altura; j += 1) {
    const j0 = Math.floor((j * origem.altura) / altura);
    const j1 = Math.max(j0 + 1, Math.floor(((j + 1) * origem.altura) / altura));
    const usadas = Math.min(j1 - j0, linhasPorSaida);
    const soma = new Float64Array(largura);
    const conta = new Float64Array(largura);
    const linhas = await daLinha(j0, usadas);
    for (let l = 0; l < usadas; l += 1) {
      for (let i = 0; i < origem.largura; i += 1) {
        const v = linhas[l * origem.largura + i];
        // `<=` porque o sem-dado do float de Vesta é o menor negativo
        // que existe e não sobrevive à ida e volta pelo decimal do
        // GDALNoData; no inteiro de 16 bits o `<=` é o próprio `===`
        if (v <= semDado) continue;
        const ii = Math.floor((i * largura) / origem.largura);
        soma[ii] += v;
        conta[ii] += 1;
      }
    }
    // O TAPA-BURACO. Zero é um valor legítimo para ALTURA sobre o datum
    // (Lua, Mercúrio, Marte) e um absurdo para RAIO (Ceres e Vesta:
    // seria um texel no centro do corpo, um penhasco de 470 km). Onde a
    // fonte guarda raio, o buraco recebe a média da própria linha —
    // relevo zero naquela latitude — e onde guarda altura, o zero de
    // sempre, para não mexer no que já está assado.
    let somaDaLinha = 0;
    let contaDaLinha = 0;
    for (let i = 0; i < largura; i += 1) {
      if (conta[i]) {
        somaDaLinha += soma[i] / conta[i];
        contaDaLinha += 1;
      }
    }
    const tapaBuraco = preencheComAMedia && contaDaLinha ? somaDaLinha / contaDaLinha : 0;
    for (let i = 0; i < largura; i += 1) {
      if (conta[i] === 0) vazios += 1;
      media[j * largura + i] = conta[i] ? soma[i] / conta[i] : tapaBuraco;
    }
  }
  return { media, vazios };
}

/**
 * A altura em metros do corpo, numa grade de `largura` x `largura/2`, NA
 * ORIENTAÇÃO DA FONTE. Quem gira é `orientar` — a guarda precisa das
 * duas orientações e a fonte é cara de ler (Mercúrio vem pela rede).
 */
async function lerAlturaEmMetros(corpo, contexto, largura) {
  const altura = largura / 2;
  const { fonte } = corpo;
  // onde há elipsoide da casa a subtrair, o valor da fonte é RAIO — e é
  // esse o caso em que o buraco não pode virar zero (ver `mediaDeCaixa`)
  const comRaio = Boolean(corpo.eixosDaCasaKm);
  let bruto;
  let vazios = 0;

  if (fonte.tipo === 'imagem') {
    const { data } = await sharp(contexto.caminho, { limitInputPixels: false })
      // sem isto o sharp entrega o TIFF de 16 bits rebaixado a 8 (medido:
      // a faixa inteira do LDEM colapsava em 26..132)
      .toColourspace('grey16')
      .resize(largura, altura, { fit: 'fill', kernel: 'lanczos3' })
      .raw({ depth: 'ushort' })
      .toBuffer({ resolveWithObject: true });
    const cru = new Uint16Array(data.buffer, data.byteOffset, largura * altura);
    bruto = new Float32Array(largura * altura);
    for (let k = 0; k < bruto.length; k += 1) bruto[k] = cru[k];
  } else if (fonte.tipo === 'cru-msb16') {
    const arquivo = contexto.bytes;
    const origem = { largura: fonte.largura, altura: fonte.altura };
    const daLinha = async (j0, n) => {
      const fatia = new Int16Array(n * origem.largura);
      for (let l = 0; l < n; l += 1) {
        for (let i = 0; i < origem.largura; i += 1) {
          fatia[l * origem.largura + i] = arquivo.readInt16BE(((j0 + l) * origem.largura + i) * 2);
        }
      }
      return fatia;
    };
    ({ media: bruto, vazios } = await mediaDeCaixa(
      daLinha, origem, largura, altura, Number.POSITIVE_INFINITY, fonte.semDado, comRaio
    ));
  } else if (fonte.tipo === 'tif-por-faixas') {
    const { largura: LO, altura: AO, base, bytesPorAmostra, flutuante32 } = contexto.tif;
    const origem = { largura: LO, altura: AO };
    const daLinha = async (j0, n) => {
      const ini = base + j0 * LO * bytesPorAmostra;
      const bytes = n * LO * bytesPorAmostra;
      const r = await fetch(fonte.url, {
        headers: { Range: `bytes=${ini}-${ini + bytes - 1}` },
      });
      if (!r.ok && r.status !== 206) throw new Error(`HTTP ${r.status} na linha ${j0}`);
      const b = Buffer.from(await r.arrayBuffer());
      contexto.lidos += b.length;
      const fatia = flutuante32 ? new Float32Array(n * LO) : new Int16Array(n * LO);
      for (let k = 0; k < n * LO; k += 1) {
        fatia[k] = flutuante32 ? b.readFloatLE(k * 4) : b.readInt16LE(k * 2);
      }
      return fatia;
    };
    ({ media: bruto, vazios } = await mediaDeCaixa(
      daLinha, origem, largura, altura, fonte.linhasPorSaida, fonte.semDado, comRaio
    ));
  } else {
    throw new Error(`fonte de tipo desconhecido: ${fonte.tipo}`);
  }

  if (vazios) console.log(`  ${vazios} texels sem dado na grade de ${largura} — postos em 0.`);
  const metros = new Float32Array(bruto.length);
  for (let k = 0; k < metros.length; k += 1) {
    metros[k] = bruto[k] * contexto.escala + contexto.offset;
  }
  if (corpo.eixosDaCasaKm) descontarElipsoideDaCasa(corpo, metros, largura, altura);
  return { metros, largura, altura };
}

/**
 * SUBTRAI O ELIPSOIDE QUE A GEOMETRIA JÁ DESENHA (ver o cabeçalho). O
 * campo entra como RAIO em metros e sai como o relevo sobre o
 * elipsoide de revolução da casa — a única forma que `normalDoCorpo` já
 * conhece. A latitude é a planetocêntrica da linha, a mesma que
 * `assaNormais` usa.
 */
function descontarElipsoideDaCasa(corpo, metros, largura, altura) {
  const a = corpo.eixosDaCasaKm.a * 1000;
  const c = corpo.eixosDaCasaKm.c * 1000;
  for (let j = 0; j < altura; j += 1) {
    const lat = Math.PI / 2 - ((j + 0.5) / altura) * Math.PI;
    const co = Math.cos(lat);
    const si = Math.sin(lat);
    const raio = (a * c) / Math.hypot(c * co, a * si);
    for (let i = 0; i < largura; i += 1) metros[j * largura + i] -= raio;
  }
}

/**
 * A grade na convenção do mapa de cor. `defasagemExtraGraus` é o que a
 * guarda usa para experimentar outras posições (meia volta, ou as 72 da
 * varredura) sem reler a fonte, que é cara.
 */
function orientar(corpo, grade, defasagemExtraGraus = 0) {
  const giro =
    LONGITUDE_ESQUERDA_DA_CASA - corpo.longitudeDaBordaEsquerdaGraus + defasagemExtraGraus;
  // o DEM é um canal (metros por texel) — a mesma conta que gira imagem
  return giraColunasDeImagem(grade.metros, grade.largura, grade.altura, 1, giro);
}

// ------------------------------------------------------------
// A GUARDA DE ALINHAMENTO
// ------------------------------------------------------------

function pearson(a, b) {
  const n = a.length;
  let ma = 0;
  let mb = 0;
  for (let k = 0; k < n; k += 1) {
    ma += a[k];
    mb += b[k];
  }
  ma /= n;
  mb /= n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let k = 0; k < n; k += 1) {
    const x = a[k] - ma;
    const y = b[k] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  return num / Math.sqrt(da * db);
}

/** |∇campo| por diferença central, com a longitude dando a volta. */
function energiaDeBorda(campo, largura, altura) {
  const saida = new Float64Array(campo.length);
  for (let j = 1; j < altura - 1; j += 1) {
    for (let i = 0; i < largura; i += 1) {
      const leste =
        campo[j * largura + ((i + 1) % largura)] -
        campo[j * largura + ((i - 1 + largura) % largura)];
      const norte = campo[(j + 1) * largura + i] - campo[(j - 1) * largura + i];
      saida[j * largura + i] = Math.hypot(leste, norte);
    }
  }
  return saida;
}

/**
 * AS TRÊS MEDIDAS da guarda, sem I/O — as duas energias de borda (a
 * orientação declarada e a meia volta) e a correlação com sinal.
 */
export function medirAlinhamento(declarada, outra, albedo, largura, altura) {
  const bordaAlb = energiaDeBorda(albedo, largura, altura);
  return {
    bordaDeclarada: pearson(energiaDeBorda(declarada, largura, altura), bordaAlb),
    bordaOutra: pearson(energiaDeBorda(outra, largura, altura), bordaAlb),
    comSinal: pearson(declarada, albedo),
  };
}

/** O VEREDITO, sem I/O: passa calado ou joga o erro que impede o assamento. */
export function conferirAlinhamento(corpo, medidas) {
  if (!(medidas.bordaDeclarada > medidas.bordaOutra + MARGEM_DA_BORDA)) {
    throw new Error(
      `a orientação declarada não vence a meia volta por ${MARGEM_DA_BORDA} ` +
        '— o DEM e o mapa de cor não estão na mesma convenção de longitude, não asso.'
    );
  }
  if (corpo.correlacaoMinima !== undefined && !(medidas.comSinal > corpo.correlacaoMinima)) {
    throw new Error(
      `correlação com sinal ${medidas.comSinal.toFixed(4)} abaixo de ` +
        `${corpo.correlacaoMinima} — não asso.`
    );
  }
}

async function guardaDeAlinhamento(corpo, contexto, mapaDeCor, varredura) {
  const L = LARGURA_DA_GUARDA;
  const A = L / 2;
  const grade = await lerAlturaEmMetros(corpo, contexto, L);
  const declarada = orientar(corpo, grade);
  const outra = orientar(corpo, grade, 180);
  // O albedo é o MAPA ENTREGUE, que já está na convenção da casa: a
  // aquisição (`baixa-texturas.mjs`) é quem gira mapa de cor que nasce em
  // outro sistema de longitude, e o que chega aqui é o que a tela mostra.
  const alb = Float64Array.from(
    await sharp(mapaDeCor, { limitInputPixels: false })
      .resize(L, A, { fit: 'fill' })
      .greyscale()
      .raw()
      .toBuffer()
  );
  const medidas = medirAlinhamento(declarada, outra, alb, L, A);
  const { bordaDeclarada, bordaOutra, comSinal } = medidas;
  const bordaAlb = energiaDeBorda(alb, L, A);
  const giro = LONGITUDE_ESQUERDA_DA_CASA - corpo.longitudeDaBordaEsquerdaGraus;
  console.log(
    `guarda (${L}x${A}): energia de borda ${bordaDeclarada.toFixed(4)} na orientação ` +
      `declarada (giro de ${((giro % 360) + 360) % 360}°) contra ` +
      `${bordaOutra.toFixed(4)} na meia volta; correlação com sinal ${comSinal.toFixed(4)}.`
  );

  if (varredura) {
    const linhas = [];
    let pico = { defasagem: 0, valor: -Infinity };
    for (let d = 0; d < 360; d += PASSO_DA_VARREDURA_GRAUS) {
      const valor = pearson(energiaDeBorda(orientar(corpo, grade, d), L, A), bordaAlb);
      if (valor > pico.valor) pico = { defasagem: d, valor };
      linhas.push(`${String(d).padStart(3)}° ${valor.toFixed(4)}`);
    }
    console.log(`varredura das ${linhas.length} defasagens (energia de borda):`);
    for (let k = 0; k < linhas.length; k += 6) console.log(`  ${linhas.slice(k, k + 6).join('  ')}`);
    console.log(
      `pico em ${pico.defasagem}° sobre a declarada (${pico.valor.toFixed(4)}) — ` +
        `0° quer dizer que a declaração está certa.`
    );
  }
  conferirAlinhamento(corpo, medidas);
}

// ------------------------------------------------------------
// O ASSAMENTO
// ------------------------------------------------------------

/**
 * O RAIO QUE DÁ A ESCALA HORIZONTAL. É o da esfera de projeção da fonte,
 * menos onde a casa desenha um elipsoide: ali o passo tem de ser o da
 * bola desenhada, e o raio médio dela ((2a+c)/3) é a régua. Em Vesta a
 * esfera de projeção do dado tem 255 km e a bola da casa 266 — usar a
 * primeira deixaria toda encosta 4 % mais íngreme do que é.
 */
function raioDoPassoM(corpo) {
  if (!corpo.eixosDaCasaKm) return corpo.raioM;
  const { a, c } = corpo.eixosDaCasaKm;
  return ((2 * a + c) / 3) * 1000;
}

export function assaNormais(metros, largura, altura, raioM) {
  const dLon = (2 * Math.PI) / largura;
  const dLat = Math.PI / altura;
  const passoNorte = raioM * dLat;
  const passoLesteMinimo = raioM * Math.cos(LATITUDE_DO_CLAMP_RAD) * dLon;
  const rgb = Buffer.allocUnsafe(largura * altura * 3);
  let somaDeclive2 = 0;
  let maiorDeclive = 0;
  for (let j = 0; j < altura; j += 1) {
    const lat = Math.PI / 2 - ((j + 0.5) / altura) * Math.PI;
    const passoLeste = Math.max(raioM * Math.cos(lat) * dLon, passoLesteMinimo);
    const jNorte = Math.max(0, j - 1); // a linha de cima é o NORTE
    const jSul = Math.min(altura - 1, j + 1);
    // nos polos a diferença atravessa só uma linha, não duas
    const vaoNorte = (jSul - jNorte) * passoNorte;
    for (let i = 0; i < largura; i += 1) {
      const iLeste = (i + 1) % largura; // longitude dá a volta
      const iOeste = (i - 1 + largura) % largura;
      const dhLeste =
        (metros[j * largura + iLeste] - metros[j * largura + iOeste]) / (2 * passoLeste);
      const dhNorte = (metros[jNorte * largura + i] - metros[jSul * largura + i]) / vaoNorte;
      const x = -dhLeste;
      const y = -dhNorte;
      const inv = 1 / Math.sqrt(x * x + y * y + 1);
      const declive2 = x * x + y * y;
      somaDeclive2 += declive2;
      if (declive2 > maiorDeclive) maiorDeclive = declive2;
      const k = (j * largura + i) * 3;
      rgb[k] = Math.max(0, Math.min(255, Math.round((x * inv * 0.5 + 0.5) * 255)));
      rgb[k + 1] = Math.max(0, Math.min(255, Math.round((y * inv * 0.5 + 0.5) * 255)));
      rgb[k + 2] = Math.max(0, Math.min(255, Math.round((inv * 0.5 + 0.5) * 255)));
    }
  }
  const rms = Math.sqrt(somaDeclive2 / (largura * altura));
  return {
    rgb,
    rmsGraus: (Math.atan(rms) * 180) / Math.PI,
    maxGraus: (Math.atan(Math.sqrt(maiorDeclive)) * 180) / Math.PI,
  };
}

// ------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const manter = argv.includes('--manter');
  const varredura = argv.includes('--varredura');
  const iDem = argv.indexOf('--dem');
  const caminhoDado = iDem >= 0 ? path.resolve(argv[iDem + 1]) : '';
  const id = argv.find((a, k) => !a.startsWith('--') && !(iDem >= 0 && k === iDem + 1));
  const corpo = CORPOS[id ?? ''];
  if (!corpo) {
    throw new Error(`diga o corpo: ${Object.keys(CORPOS).join(' | ')}.`);
  }

  const destino = path.join(rootDirectory, 'public', 'textures', 'atlas', corpo.diretorio);
  // o albedo CONTRA O QUAL a guarda mede é sempre o MAPA ENTREGUE
  const mapaDeCor = ['map.jpg', 'map.png', 'map_4096.jpg']
    .map((n) => path.join(destino, n))
    .find((p) => existsSync(p));
  if (!mapaDeCor) {
    throw new Error(`sem o mapa de cor em ${destino} — a guarda de alinhamento precisa dele.`);
  }

  const contexto = {
    offset: corpo.offsetDoDado,
    escala: corpo.metrosPorUnidade,
    lidos: 0,
  };
  let baixado = false;

  if (corpo.fonte.tipo === 'tif-por-faixas') {
    const tif = await cabecalhoDoTifRemoto(corpo.fonte.url);
    console.log(
      `${corpo.fonte.descricao}: ${tif.largura}x${tif.altura} por faixas — ` +
        `metadados dizem offset ${tif.offset}, escala ${tif.escala}.`
    );
    if (tif.offset !== corpo.offsetDoDado || tif.escala !== corpo.metrosPorUnidade) {
      throw new Error(
        `os metadados do TIF (offset ${tif.offset}, escala ${tif.escala}) divergem da ` +
          `tabela (${corpo.offsetDoDado}, ${corpo.metrosPorUnidade}) — não asso.`
      );
    }
    contexto.tif = tif;
  } else {
    if (corpo.fonte.rotulo) await conferirRotuloPds(corpo);
    const arquivo = await garantirArquivo(corpo.fonte, caminhoDado);
    contexto.caminho = arquivo.caminho;
    baixado = arquivo.baixado;
    if (corpo.fonte.tipo === 'cru-msb16') {
      contexto.bytes = await readFile(contexto.caminho);
      const esperado = corpo.fonte.largura * corpo.fonte.altura * 2;
      if (contexto.bytes.length !== esperado) {
        throw new Error(`${corpo.fonte.nome}: ${contexto.bytes.length} B, esperava ${esperado}.`);
      }
    }
    console.log(`${corpo.fonte.descricao}: ${contexto.caminho}.`);
  }

  // ---- a guarda de alinhamento, ANTES de assar 8 milhões de pixels
  await guardaDeAlinhamento(corpo, contexto, mapaDeCor, varredura);

  const grade = await lerAlturaEmMetros(corpo, contexto, LARGURA_ALVO);
  const { largura, altura } = grade;
  const { rgb, rmsGraus, maxGraus } = assaNormais(
    orientar(corpo, grade), largura, altura, raioDoPassoM(corpo)
  );
  console.log(
    `inclinação: RMS ${rmsGraus.toFixed(2)}°, máxima ${maxGraus.toFixed(2)}° ` +
      '(amplitude FÍSICA, ganho 1,0 — nenhum exagero entra aqui).'
  );

  await mkdir(destino, { recursive: true });
  const saida = path.join(destino, 'normal.png');
  await sharp(rgb, { raw: { width: largura, height: altura, channels: 3 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(saida);
  const { size } = await stat(saida);
  console.log(
    `assado: ${path.relative(rootDirectory, saida)} ${largura}x${altura} (${megabytes(size)}).`
  );
  if (contexto.lidos) console.log(`rede: ${megabytes(contexto.lidos)} lidos por faixas.`);

  if (baixado && !manter) {
    await unlink(contexto.caminho);
    console.log(`matéria-prima apagada: ${contexto.caminho} (use --manter para segurá-la).`);
  }
  console.log(
    `agora: node scripts/data/atlas/otimiza-texturas.mjs ${corpo.diretorio} && ` +
      'node scripts/data/atlas/gera-manifest-texturas.mjs'
  );
}

// só a LINHA DE COMANDO assa; importado (o juiz de `gera-normal-de-dem.test.mjs`)
// o arquivo é uma biblioteca de funções puras e nada roda.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((erro) => {
    console.error(erro.message);
    process.exitCode = 1;
  });
}
