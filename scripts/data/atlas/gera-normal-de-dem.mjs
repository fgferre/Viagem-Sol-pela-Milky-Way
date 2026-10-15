// ============================================================
// O MAPA DE NORMAIS DE UM CORPO, assado do DEM público dele
// (item 140 na Lua, item 141 em Mercúrio, Marte, Ceres e Vesta; Plutão e
// Caronte em 01/10/2026).
//
//   node scripts/data/atlas/gera-normal-de-dem.mjs moon
//   node scripts/data/atlas/gera-normal-de-dem.mjs mercury
//   node scripts/data/atlas/gera-normal-de-dem.mjs mars --manter
//   node scripts/data/atlas/gera-normal-de-dem.mjs moon --dem /caminho/ldem.tif
//   node scripts/data/atlas/gera-normal-de-dem.mjs vesta --varredura
//   node scripts/data/atlas/gera-normal-de-dem.mjs pluto --varredura
//   node scripts/data/atlas/gera-normal-de-dem.mjs pluto --rede
//
// POR QUE ESTE SCRIPT EXISTE. Até o item 140 os corpos com mapa tinham
// só a COR, e o relevo deles era INVENTADO a partir dela (o bump por
// derivada do albedo da S2 do item 134): mancha escura virava buraco,
// mancha clara virava crista. Na Lua isso afundava os mares e levantava
// os raios de Tycho — palavras do dono: "não corresponde mais ao que
// observamos". O conserto é DADO, não shader: onde existe topografia
// medida e pública, a normal vem dela.
//
// UM SCRIPT, SETE CORPOS (item 141 e 01/10). A tabela `CORPOS` é a única coisa
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
// A MÉDIA DE ÁREA (a Terra, item 232, 08/10). `assaNormaisPorMediaDeArea`
// é a outra conta, para quem tem a grade FINA na mão (o ETOPO de 60″,
// `relevo-terra.mjs`): a normal de cada texel é a média do gradiente na
// célula, pelo fluxo da altura nas bordas, e não a diferença central numa
// grade já reduzida. Mesma convenção, mesmo clamp, mesma codificação; os
// corpos da tabela abaixo seguem com `assaNormais`, byte a byte.
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
// A LEITURA POR FAIXAS (Mercúrio, Ceres, Vesta, Plutão, Caronte). O DEM
// da USGS de Mercúrio tem 23040x11520 e 530 MB — acima do teto de
// download desta casa; os da Dawn têm 466 MB (Ceres) e 597 MB (Vesta), e
// os da New Horizons 591 MiB (Plutão) e 154 MiB (Caronte). Todos são
// GeoTIFF SEM COMPRESSÃO, uma tira por linha e tiras contíguas, então
// dá para ler pela rede SÓ as linhas que a grade de saída usa: 2 linhas
// de origem por linha de saída. Medido: Mercúrio 212 MiB em vez de 530
// MB (180 do assamento mais 32 da guarda). O preço é declarado — das
// 5,6 linhas de origem que cabem em cada linha de saída, a média usa 2;
// nas COLUNAS a média é completa (as 23040 entram). É borrão de
// latitude, não deslocamento. O leitor aceita 16 bits com sinal
// (Mercúrio, Ceres, Plutão, Caronte) e 32 bits em ponto flutuante
// (Vesta), que é o que os cabeçalhos declaram.
//
// O VAZIO SEM DADO (Plutão e Caronte, 01/10/2026). Os DEMs da New
// Horizons são PARCIAIS: ~45 % do globo em Plutão (o hemisfério do
// sobrevoo e a calota norte), ~44 % em Caronte (o hemisfério voltado para
// Plutão). O tapa-buraco põe o vazio em 0 m, e o degrau entre o dado e
// esse zero viraria uma PAREDE de normal em volta de tudo que foi medido.
// Onde a tabela declara `vazioInventado`:
//   - `mediaDeCaixa` marca o texel VAZIO: o que não teve amostra com
//     dado E também o PARCIAL, que teve alguma sem dado — a média dele
//     cobre só um pedaço da caixa, colado na borda do levantamento. O
//     preço é um texel a mais de borda e um "+" liso em volta de cada
//     furo interno;
//   - a máscara gira com o DEM (`orientar`, a mesma conta);
//   - o vazio ganha relevo INVENTADO (abaixo). Até 02/10 ele saía LISO:
//     `assaNormais` com a máscara dá a normal do terreno plano
//     (128,128,255) a todo texel cuja diferença central toca o vazio, e a
//     opção continua lá.
// Os cinco corpos de antes não declaram `vazioInventado` e assam como
// sempre, byte a byte. A GUARDA não usa a máscara (ela vê o vazio como
// 0 m): num corpo assim, rode com `--varredura` e confira que o pico cai
// em 0°.
//
// O RELEVO INVENTADO (Plutão e Caronte, PLAN-RELEVO.md, 02/10/2026). O
// mapa sai de `inventaRelevoDoCorpo` (`relevo-inventado.mjs`), a MESMA
// função das prévias que o dono aprova: as operações declaradas no medido,
// as medidas do lado medido, a síntese e as normais. As entradas: o cache
// das alturas, `fonte/<corpo>-lado-de-tras.json` (as unidades e as
// ESCOLHAS do dono: `completaBorrado` e os `alisamentos`, cada um com
// `ativo`), a `semente` do corpo e três tabelas pinadas por url e sha256
// (`vazioInventado.tabelas`, do Zenodo, guardadas em `.cache/relevo/fontes/`
// e recusadas se o sha256 não bater). O PORTÃO: o sha256 do RGB
// DECODIFICADO do normal.png tem de ser o de `vazioInventado.sha256Aprovado`
// para a chave das escolhas (`chaveDasEscolhas`, ex. "completa:1,sputnik:0");
// sem entrada, ou com outro hash, o script imprime o hash e NÃO grava. Ele
// imprime também a calibração, as versões (node, V8, sharp, libvips) e os
// sha256 do cache, do `map.jpg`, do JSON e das tabelas — o que é preciso
// para refazer o mesmo mapa.
//
// O CACHE DAS ALTURAS (Plutão e Caronte, 01/10/2026). Os dois DEMs vêm por
// faixas HTTP (591 e 154 MiB) e a rodada do relevo inventado assa várias
// vezes: as prévias e a final. Onde a tabela declara `cacheDeAlturas`, a
// leitura pela rede grava em `.cache/relevo/<corpo>-4096.*` o que o assamento
// consome — as alturas e a máscara do vazio JÁ na orientação da casa
// (`orientar`), em Float32 e Uint8 little-endian — e a grade de 720x360 da
// guarda, na orientação da FONTE. O cabeçalho `.json` leva o sha256 de cada
// parte e a fonte e o filtro de que ela saiu (linhas por saída, larguras,
// giro); as rodadas seguintes leem de lá, sem rede, e RECUSAM o que não bater
// (arquivo trocado ou cortado, outra fonte, outro filtro). A guarda reroda
// sobre a MESMA grade de 720 guardada, e o normal.png sai byte a byte o mesmo
// pelos dois caminhos. `--rede` força a leitura remota e regrava o cache.
//
// ENCÉLADO (R4 da régua, 13/10/2026, PLAN-REGUA-UNICA.md). O DEM global de
// 200 m (Schenk & McKinnon 2024) é o primeiro da tabela lido INTEIRO de um
// arquivo local (`tif-local`): 124 MB baixados para `.cache/relevo/` pelo
// terminal dele, lidos por `leTiffFloat32` (`relevo-reia.mjs`) e conferidos
// pela georreferência do próprio GeoTIFF (borda esquerda, topo e os 360°,
// `georreferenciaDoTiff`). É também o único que assa a ALTURA além da
// normal, porque Encélado desloca vértice (`RELEVO_DA_LUA`): 1024 px com a
// faixa inteira do DEM em 8 bits; a normal sai em 4096 pela MÉDIA DE ÁREA da
// grade fina (a conta da Terra), com a altura ÷ 1,2 — o ganho tangencial do
// shader devolve a encosta física, como em Reia. O que a tabela declara de
// diferente: nada a subtrair (o dado já é altura sobre o elipsoide triaxial
// de Thomas 2016, ≤ 0,4 km do da casa), a margem sem dado do arquivo
// (`margemSemDado`: a 1ª coluna e a 1ª linha, recortadas — em 0 m eram a
// parede da emenda 0°/360° e a do polo norte), as CALOTAS POLARES (abaixo) e,
// além da meia volta, a guarda recusa o DEM ESPELHADO (a longitude crescendo
// para o outro lado).
//
// AS CALOTAS POLARES (Encélado, R4). Perto do polo a coluna equiretangular
// mede R·cos φ·Δλ: a 89,9° são 30 cm, e o serrilhado de centímetros que a
// reprojeção do produtor deixa entre colunas vizinhas virava parede — faixas
// e riscos de 80°S ao polo, logo onde as listras de tigre o atravessam. A
// trava de 80° esconderia a parede jogando fora a encosta leste-oeste delas.
// Acima de `calotasPolares.deGraus` a normal sai de uma grade AZIMUTAL
// EQUIDISTANTE centrada no polo, no passo do próprio DEM (R·π/Hf, 197 m):
// a altura é lida ali uma vez (bilinear na grade fina; dentro do meio texel
// do polo, linear até a média da última linha), e a encosta de cada texel é
// a média do gradiente num retângulo em volta do centro dele — R·Δφ ao
// norte, a largura da célula a leste mas nunca menos que o passo do DEM —,
// pelo fluxo da altura nas quatro bordas, na direção leste/norte do texel
// (o leste corrigido pelo esticamento θ/sen θ da projeção). Entre
// `deGraus` e `ateGraus` as duas encostas se misturam por smoothstep.
//
// O SPC DO POLO SUL (Encélado, R4). Onde o modelo de placas de 100 m da JPL
// (Park et al. 2024; `spcDoPolo` na tabela, `relevo-spc.mjs`) cobre o terreno
// das listras de tigre, ele SUBSTITUI o DEM antes da altura, da normal e das
// calotas: lido do DSK pinado, levado à casa pelo giro medido, registrado no
// largo do DEM nos ladrilhos bons e fundido por rampa + membrana. O conserto
// dos ladrilhos ruins segue valendo fora do núcleo do SPC; no terreno das
// listras (SPT, até 55°S) o que o SPC não cobre e o DEM tem como ruído ou liso
// ganha o fino do próprio SPC por exemplo, e as listras fora dele as fatias
// medidas nas do SPC (`preencheSpt`); o ladrilho ruim que cruza os 55°S segue
// preenchido e se apaga em 24 km, e perto do DEM bom mais calmo o preenchido
// desce à energia dele. Por último, as bordas retas de ladrilho entre dois
// ladrilhos bons são recosturadas (`recosturaBordas`, 14/10/2026: a única
// mudança no Schenk bom, ~0,8 % da esfera em faixas de ±5 km).
// ============================================================

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BOM, CONSERTO_DE_ENCELADO, LISO, RUIDO, consertaDem, recosturaBordas, tracaListras } from './conserto-do-dem.mjs';
import { luminanciaDoRgb } from './crateras-pela-foto.mjs';
import { pesosDaCaixa } from './gera-horizonte.mjs';
import { LATITUDE_DE_SCHENK, giraColunasDeImagem, paraLatitudePlanetocentrica } from './lib-texturas.mjs';
import { inventaRelevoDoCorpo } from './relevo-inventado.mjs';
import { escalaEViesDaFaixa, quantizaNaFaixa } from './relevo-por-foto.mjs';
import { leTiffFloat32, reamostraParaACasa } from './relevo-reia.mjs';
import {
  SPC_DE_ENCELADO,
  amostraNaCasa,
  aplicaPlano,
  fundeNoDem,
  leDsk,
  mascarasDoSpc,
  partilhaDaArea,
  preencheSpt,
  rasterizaNoPolo,
  registraNoDem,
  spcNaCasa,
} from './relevo-spc.mjs';

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
 *
 * `vazioInventado` só existe onde o DEM é PARCIAL (Plutão, Caronte): o
 * vazio ganha relevo inventado com a `semente` fixa do corpo e as `tabelas`
 * pinadas (`arquivo` em `.cache/relevo/fontes/`, `url`, `sha256`), e o mapa
 * só é gravado se o sha256 do RGB decodificado for o de `sha256Aprovado`
 * para a chave das escolhas do JSON do corpo (ver o cabeçalho).
 *
 * `cacheDeAlturas` só existe onde ler o DEM pela rede custa centenas de
 * MiB (Plutão, Caronte): as alturas lidas ficam em `.cache/relevo/` e as
 * rodadas seguintes as releem de lá, conferidas por sha256 (ver o
 * cabeçalho).
 *
 * `spcDoPolo` só existe em Encélado: o modelo de placas do polo sul (DSK
 * pinado por sha256) que substitui o DEM onde cobre (ver o cabeçalho).
 *
 * `mapaDeAltura`, `ganhoDoShader` e `calotasPolares` só existem em Encélado (ver
 * o cabeçalho): a altura do vértice (largura, faixa do byte em km e o raio
 * que dá a escala e o viés de `RELEVO_DA_LUA`), o ganho tangencial que o
 * shader aplica à normal e a faixa de latitude em que a normal passa da conta
 * equiretangular para a das calotas polares.
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

  // OS DOIS DA NEW HORIZONS (01/10/2026): DEMs de 300 m do sobrevoo de
  // 2015, PARCIAIS — daí `vazioInventado` (ver o cabeçalho). Schenk et al.
  // 2018: Plutão em Icarus 314, 400 (doi:10.1016/j.icarus.2018.06.008),
  // Caronte em Icarus 315, 124 (doi:10.1016/j.icarus.2018.06.010). As
  // tabelas do relevo inventado: o catálogo de crateras de Robbins v2 e o
  // guia de regiões (Zenodo 8292107, 2023, doi:10.5281/zenodo.8292107) e as
  // profundidades de Ro21 (Zenodo 7753861, v1.1, doi:10.5281/zenodo.7753861).
  // `sha256Aprovado` sem a chave das escolhas = ainda não aprovado: o
  // gerador imprime o hash e não grava.
  pluto: {
    nome: 'Plutão',
    diretorio: 'pluto',
    // a esfera de referência do DEM (a de BODY_AXES.pluto)
    raioM: 1188300,
    // sem escala nem deslocamento: o int16 já é a altura em metros sobre
    // a esfera
    offsetDoDado: 0,
    metrosPorUnidade: 1,
    // meridiano central 180°: borda esquerda em 0°, a mesma meia volta do
    // mapa de cor (item 149)
    longitudeDaBordaEsquerdaGraus: 0,
    // dado em ~45 % do globo: de −50° a +89°, no equador só de 84° a 247°E,
    // acima de +60° em toda longitude
    vazioInventado: {
      // a semente das prévias de 02/10
      semente: 20261002,
      tabelas: {
        catalogo: {
          arquivo: 'robbins-v2 - Pluto Database.csv',
          url: 'https://zenodo.org/records/8292107/files/Supplementary%20Material%20-%20Pluto%20Database.csv?download=1',
          sha256: 'efa99337d53e346ef9fc11d5ab8ce9f67d0656b4cdbfb27b5e1cd6bd33ee02ca',
        },
        guia: {
          arquivo: 'robbins-v2 - Pluto Region Guide.csv',
          url: 'https://zenodo.org/records/8292107/files/Supplementary%20Material%20-%20Pluto%20Region%20Guide.csv?download=1',
          sha256: '10a639cc8f309dca0df6f5664cec36a4ad73449b279b4d7c4ab964b983fc27f3',
        },
        ro21: {
          arquivo: 'ro21 - Pluto Table, v1.1.csv',
          url: 'https://zenodo.org/records/7753861/files/Supplemental%20Material,%20Pluto%20Table,%20v1.1.csv?download=1',
          sha256: '2b230e61c79c8ac2bc537534e4e365621f39c0ad51fb2872507618431318e3da',
        },
      },
      // a palavra do dono (02/10/2026, Fotos 2 e 3): completar o borrado e
      // alisar o grão de Sputnik — o candidato `pluto-final-c1-s1`
      sha256Aprovado: {
        'completa:1,sputnik:1': '80d48040db6f96533459a63b2815f98571a2d3f8b1c7cabca1b70d1cd3a31f41',
      },
    },
    // o DEM (591 MiB) vem por faixas HTTP; o cache em `.cache/relevo/` serve a
    // rodada do relevo inventado — as prévias e o assamento final — e mantém
    // a guarda sobre os mesmos números
    cacheDeAlturas: true,
    fonte: {
      tipo: 'tif-por-faixas',
      nome: 'Pluto_NewHorizons_Global_DEM_300m_Jul2017_16bit.tif',
      url: 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Pluto_NewHorizons_Global_DEM_300m_Jul2017_16bit.tif',
      descricao: 'New Horizons LORRI–MVIC Global DEM 300 m de Plutão (USGS Astrogeology)',
      linhasPorSaida: 2,
      semDado: -32768,
    },
  },

  charon: {
    nome: 'Caronte',
    diretorio: 'charon',
    // a esfera de referência do DEM (a de BODY_AXES.charon)
    raioM: 606000,
    offsetDoDado: 0,
    metrosPorUnidade: 1,
    // meridiano central 0°, que já é a convenção da casa: giro 0
    longitudeDaBordaEsquerdaGraus: 180,
    // dado em ~44 % do globo: o hemisfério voltado para Plutão, de −42° a +89°
    vazioInventado: {
      semente: 20261002,
      tabelas: {
        catalogo: {
          arquivo: 'robbins-v2 - Charon Database.csv',
          url: 'https://zenodo.org/records/8292107/files/Supplementary%20Material%20-%20Charon%20Database.csv?download=1',
          sha256: '89ab321ca61b5a02c22c2c23c867857cf8ea3bc05c0a3564ade6fc372695a622',
        },
        guia: {
          arquivo: 'robbins-v2 - Charon Region Guide.csv',
          url: 'https://zenodo.org/records/8292107/files/Supplementary%20Material%20-%20Charon%20Region%20Guide.csv?download=1',
          sha256: '4095c47ecdf8550fed1995ef72cbde80d82d91ffa925659431bc8de3889c8bf9',
        },
        ro21: {
          arquivo: 'ro21 - Charon Table, v1.1.csv',
          url: 'https://zenodo.org/records/7753861/files/Supplemental%20Material,%20Charon%20Table,%20v1.1.csv?download=1',
          sha256: 'fc18b7991b32ab3a62b7ce8fd1f4c8d92de8b79c614bf1ae57fe831efce22885',
        },
      },
      // a palavra do dono (02/10/2026, Foto 3): completar o borrado — o
      // candidato v9
      sha256Aprovado: {
        'completa:1': '53b50dc091592034081b63608aadd504001b7774ab4d5123398aaf6f6a78ba45',
      },
    },
    // o DEM (154 MiB) vem por faixas HTTP; o mesmo cache de Plutão (ver acima)
    cacheDeAlturas: true,
    fonte: {
      tipo: 'tif-por-faixas',
      nome: 'Charon_NewHorizons_Global_DEM_300m_Jul2017_16bit.tif',
      url: 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Charon_NewHorizons_Global_DEM_300m_Jul2017_16bit.tif',
      descricao: 'New Horizons LORRI–MVIC Global DEM 300 m de Caronte (USGS Astrogeology)',
      linhasPorSaida: 2,
      semDado: -32768,
    },
  },

  // ENCÉLADO (R4, 13/10/2026): o DEM global de 200 m de Schenk & McKinnon
  // 2024 (Icarus 408, 115827, doi:10.1016/j.icarus.2023.115827), inteiro do
  // cache local (ver o cabeçalho). Até aqui o relevo dele vinha assado no
  // projeto Saturn e reduzido a 1024 px, o que apagava as listras de tigre.
  enceladus: {
    nome: 'Encélado',
    diretorio: 'enceladus',
    // o PASSO horizontal da normal: o raio médio (a·b·c)^⅓ de
    // BODY_AXES.enceladus (256,6 × 251,4 × 248,3), a ±3 % do arco real em
    // todo o corpo (o `a` erraria até 3 % só para cima)
    raioM: 252100,
    // o float32 é a ALTURA em km sobre o elipsoide triaxial de Thomas 2016
    // (256,2 × 251,4 × 248,6): nada a subtrair (sem `eixosDaCasaKm`), e o km
    // vira metro aqui
    offsetDoDado: 0,
    metrosPorUnidade: 1000,
    // 0…360: o layout Schenk põe o sub-Saturno na emenda e a casa o põe no
    // meio (a meia volta do item 138). Medido em 13/10 contra a altura de
    // antes (correlação 0,997 com a meia volta, 0,303 sem) e contra a borda
    // da foto (0,221 × 0,024). É a DECLARAÇÃO; a georreferência do GeoTIFF a
    // confere e recusa se divergir — e diz o mesmo: meridiano central 180°,
    // âncora em −805 000 m na esfera de 256,2 km; tirada a margem sem dado
    // (`fonte.margemSemDado`), a borda cai em +0,017° (0,4 px)
    longitudeDaBordaEsquerdaGraus: 0,
    // as listras de tigre passam de 80°S e atravessam o polo: acima de 60° a
    // normal sai da calota azimutal equidistante, inteira acima de 70° (ver
    // `assaNormaisPorMediaDeArea`), sem trava e sem parede
    calotasPolares: { deGraus: 60, ateGraus: 70 },
    // `ESCALA_DA_NORMAL_DO_RELEVO` (rochoso.ts): a altura entra ÷ 1,2 na
    // normal e a encosta na tela volta a ser a física, como em Reia
    ganhoDoShader: 1.2,
    // o vértice: 1024 px com a faixa INTEIRA do DEM em 8 bits (20 m por
    // degrau), em raios equatoriais de 256,6 km (BODY_AXES.enceladus[0])
    mapaDeAltura: { largura: 1024, faixaKm: { min: -2.73, max: 2.34 }, raioDoVerticeKm: 256.6 },
    // o DEM é colcha: ladrilhos de bolhas de estéreo e lisos ao lado do polo
    // sul, as listras de tigre dentro deles. `conserto-do-dem.mjs` os acha
    // contra o retrato da cor (o mosaico de Schenk, ainda com a sombra), deixa
    // neles só o que tem ≥ 8 km e as listras e crateras do traço na foto; os
    // ladrilhos bons saem byte a byte (13/10/2026), menos a faixa das bordas
    // retas de ladrilho recosturadas (14/10/2026). `fino`: 'liso' (o ruim
    // fica só com o largo medido, listras e crateras; a colcha por exemplo foi
    // julgada um retalho agitado), 'exemplo' ou 'foto' (fotoclinometria,
    // reprovada na validação de 14/10/2026 — ver o cabeçalho do conserto). O sha256 é o dos bytes do
    // arquivo; `latitude`: a foto vem planetográfica e é lida na latitude da
    // casa com o MESMO k do mapa de cor (14/10/2026), antes de tudo o que a usa
    consertoDoDem: {
      foto: 'scripts/data/atlas/fonte/enceladus-cor.jpg',
      sha256: '1bacd2c1dcf5581ecf60fde29e02bbb4b31b551733d1887ee7ea2fa2b976ddca',
      latitude: LATITUDE_DE_SCHENK.enceladus,
      fino: 'liso',
    },
    // o polo sul MEDIDO a 100 m: o modelo de placas por estereofotoclinometria
    // da JPL (Park et al. 2024, JGR Planets 129, e2023JE008054), versão 2 de
    // 2025; cobre 20 100 km² do terreno das listras (três das quatro), de 90°S
    // a 58–80°S. Substitui o DEM onde cobre (`relevo-spc.mjs`); o arquivo
    // baixado em 13/10/2026 (64 934 912 B), outro é recusado
    spcDoPolo: {
      nome: 'cas_enceladus_ssd_spc_south100m_v2.bds',
      url: 'https://naif.jpl.nasa.gov/pub/naif/CASSINI/misc/enceladus_park2023/cas_enceladus_ssd_spc_south100m_v2.bds',
      arquivo: '.cache/relevo/cas_enceladus_ssd_spc_south100m_v2.bds',
      sha256: '5f4e1fec2291b2dbb33eb61b39ffab017dc573eeae844c2dcebc383aeb6689ee',
    },
    fonte: {
      tipo: 'tif-local',
      nome: 'Enceladus_Cassini_DEM_global_200m_schenk2024.tif',
      url: 'https://asc-astropedia.s3.us-west-2.amazonaws.com/Enceladus/Cassini/Enceladus_Cassini_DEM_global_200m_schenk2024.tif',
      arquivo: '.cache/relevo/Enceladus_Cassini_DEM_global_200m_schenk2024.tif',
      descricao: 'DEM global de Encélado a 200 m (Schenk & McKinnon 2024, USGS Astropedia)',
      largura: 8049,
      altura: 4025,
      // o sem-dado de float do GDAL é o menor negativo; NaN também conta
      semDado: -1e30,
      // a 1ª coluna e a 1ª linha do arquivo são MARGEM, inteiras sem dado (as
      // 12 073 amostras: 8049 + 4025 − 1): a coluna se sobrepõe à última (as
      // duas caem em 0°/360°) e o centro da linha fica além do polo norte. Em
      // 0 m, viravam uma parede na emenda e outra no polo; recortadas, sobra a
      // grade 8048 × 4024 de 0,0447°, com o 2:1 exato
      margemSemDado: { esquerda: 1, topo: 1 },
      // o arquivo baixado em 13/10/2026 (129 613 723 B): outro é recusado
      sha256: '7c08c46238cde6528c9143f0c667d42cd3bc6ac60c572595a7e6cad2d6775f91',
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
 * UMA FAIXA DE BYTES do arquivo remoto, com até quatro tentativas e pausa
 * crescente: um assamento faz milhares de pedidos, e um soluço da rede
 * derrubava a leitura inteira (01/10/2026, Plutão: "fetch failed" no meio).
 * Resposta de tamanho errado também é falha — a faixa curta viraria
 * altura errada calada.
 */
async function lerFaixaRemota(url, ini, bytes, onde) {
  for (let tentativa = 1; ; tentativa += 1) {
    try {
      const r = await fetch(url, { headers: { Range: `bytes=${ini}-${ini + bytes - 1}` } });
      if (!r.ok && r.status !== 206) throw new Error(`HTTP ${r.status}`);
      const b = Buffer.from(await r.arrayBuffer());
      if (b.length !== bytes) throw new Error(`${b.length} B em vez de ${bytes}`);
      return b;
    } catch (erro) {
      if (tentativa >= 4) throw new Error(`${erro.message} ${onde} (4 tentativas)`);
      await new Promise((pronto) => setTimeout(pronto, 1000 * 2 ** (tentativa - 1)));
    }
  }
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
  const faixa = (ini, bytes) => lerFaixaRemota(url, ini, bytes, 'ao ler o cabeçalho');
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
 *
 * `vazio` é a MÁSCARA do texel sem dado (1/0): a caixa sem amostra com
 * dado e também a PARCIAL, com alguma amostra sem dado (ver o
 * cabeçalho). `vazios` continua contando só a primeira — é o número que
 * os corpos sem `vazioInventado` sempre imprimiram. A média não muda.
 */
export async function mediaDeCaixa(
  daLinha, origem, largura, altura, linhasPorSaida, semDado, preencheComAMedia
) {
  // sai em VALOR BRUTO da fonte; a conversão para metros é do chamador
  const media = new Float32Array(largura * altura);
  const vazio = new Uint8Array(largura * altura);
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
        const ii = Math.floor((i * largura) / origem.largura);
        // `<=` porque o sem-dado do float de Vesta é o menor negativo
        // que existe e não sobrevive à ida e volta pelo decimal do
        // GDALNoData; no inteiro de 16 bits o `<=` é o próprio `===`
        if (v <= semDado) {
          vazio[j * largura + ii] = 1;
          continue;
        }
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
      if (conta[i] === 0) {
        vazios += 1;
        vazio[j * largura + i] = 1;
      }
      media[j * largura + i] = conta[i] ? soma[i] / conta[i] : tapaBuraco;
    }
  }
  return { media, vazios, vazio };
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
  let vazio = null;

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
    ({ media: bruto, vazios, vazio } = await mediaDeCaixa(
      daLinha, origem, largura, altura, Number.POSITIVE_INFINITY, fonte.semDado, comRaio
    ));
  } else if (fonte.tipo === 'tif-por-faixas') {
    const { largura: LO, altura: AO, base, bytesPorAmostra, flutuante32 } = contexto.tif;
    const origem = { largura: LO, altura: AO };
    const daLinha = async (j0, n) => {
      const ini = base + j0 * LO * bytesPorAmostra;
      const bytes = n * LO * bytesPorAmostra;
      const b = await lerFaixaRemota(fonte.url, ini, bytes, `na linha ${j0}`);
      contexto.lidos += b.length;
      const fatia = flutuante32 ? new Float32Array(n * LO) : new Int16Array(n * LO);
      for (let k = 0; k < n * LO; k += 1) {
        fatia[k] = flutuante32 ? b.readFloatLE(k * 4) : b.readInt16LE(k * 2);
      }
      return fatia;
    };
    ({ media: bruto, vazios, vazio } = await mediaDeCaixa(
      daLinha, origem, largura, altura, fonte.linhasPorSaida, fonte.semDado, comRaio
    ));
  } else {
    throw new Error(`fonte de tipo desconhecido: ${fonte.tipo}`);
  }

  if (corpo.vazioInventado) {
    const n = vazio.reduce((soma, v) => soma + v, 0);
    console.log(
      `  ${n} texels sem dado na grade de ${largura} ` +
        `(${((100 * n) / (largura * altura)).toFixed(1)} %) → relevo inventado.`
    );
  } else if (vazios) {
    console.log(`  ${vazios} texels sem dado na grade de ${largura} — postos em 0.`);
  }
  const metros = new Float32Array(bruto.length);
  for (let k = 0; k < metros.length; k += 1) {
    metros[k] = bruto[k] * contexto.escala + contexto.offset;
  }
  if (corpo.eixosDaCasaKm) descontarElipsoideDaCasa(corpo, metros, largura, altura);
  return { metros, largura, altura, vazio };
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
 * varredura) sem reler a fonte, que é cara. `campo` troca o que gira: a
 * máscara do vazio (`grade.vazio`) vai pelo MESMO giro que os metros.
 */
function orientar(corpo, grade, defasagemExtraGraus = 0, campo = grade.metros) {
  const giro =
    LONGITUDE_ESQUERDA_DA_CASA - corpo.longitudeDaBordaEsquerdaGraus + defasagemExtraGraus;
  // o DEM é um canal (metros por texel) — a mesma conta que gira imagem
  return giraColunasDeImagem(campo, grade.largura, grade.altura, 1, giro);
}

// ------------------------------------------------------------
// O CACHE DAS ALTURAS
// ------------------------------------------------------------

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Grava num temporário e renomeia: o arquivo ou está inteiro ou não existe. */
async function gravarInteiro(arquivo, conteudo) {
  const temporario = `${arquivo}.tmp-${process.pid}`;
  await writeFile(temporario, conteudo);
  await rename(temporario, arquivo);
}

/**
 * GRAVA AS ALTURAS LIDAS (ver o cabeçalho). `partes` é `{ nome: Float32Array
 * | Uint8Array }`: cada uma vira os BYTES CRUS de `<nome>.<parte>.bin`, e o
 * `<nome>.json` leva o `cabecalho` de quem chama e, por parte, o tipo, o
 * tamanho e o sha256. Cada arquivo nasce num temporário e é renomeado, e o
 * cabeçalho vai POR ÚLTIMO: cache com cabeçalho está inteiro, e uma gravação
 * interrompida no meio não deixa cabeçalho nenhum. Não sabe de corpo.
 */
export async function gravarCacheDeAlturas(dir, nome, cabecalho, partes) {
  // os bytes saem como a memória os guarda, e a leitura os entende como little-endian
  if (os.endianness() !== 'LE') {
    throw new Error('o cache das alturas é little-endian e esta máquina não é.');
  }
  await mkdir(dir, { recursive: true });
  const descricao = {};
  for (const [parte, dados] of Object.entries(partes)) {
    const tipo = dados instanceof Float32Array ? 'f32' : dados instanceof Uint8Array ? 'u8' : '';
    if (!tipo) throw new Error(`parte "${parte}": o cache só guarda Float32Array e Uint8Array.`);
    const bytes = Buffer.from(dados.buffer, dados.byteOffset, dados.byteLength);
    const arquivo = `${nome}.${parte}.bin`;
    await gravarInteiro(path.join(dir, arquivo), bytes);
    descricao[parte] = {
      tipo, comprimento: dados.length, bytes: bytes.length, sha256: sha256(bytes), arquivo,
    };
  }
  const json = { versao: 1, endianness: 'LE', ...cabecalho, partes: descricao };
  await gravarInteiro(path.join(dir, `${nome}.json`), `${JSON.stringify(json, null, 2)}\n`);
}

/**
 * LÊ O CACHE DAS ALTURAS: `null` se não há cabeçalho. Cada parte é conferida
 * contra o tamanho e o sha256 do cabeçalho, e o que não bater (arquivo
 * trocado ou cortado) RECUSA em vez de assar com altura errada. Os bytes são
 * COPIADOS para um ArrayBuffer próprio: o Buffer do disco pode vir de um
 * pool, fora do alinhamento de 4 bytes que o Float32Array exige.
 */
export async function lerCacheDeAlturas(dir, nome) {
  const arquivoDoCabecalho = path.join(dir, `${nome}.json`);
  if (!existsSync(arquivoDoCabecalho)) return null;
  const cabecalho = JSON.parse(await readFile(arquivoDoCabecalho, 'utf8'));
  const partes = {};
  for (const [parte, meta] of Object.entries(cabecalho.partes)) {
    const arquivo = path.join(dir, meta.arquivo);
    const bytes = await readFile(arquivo);
    if (bytes.length !== meta.bytes || sha256(bytes) !== meta.sha256) {
      throw new Error(`cache corrompido em ${arquivo} — rode com --rede`);
    }
    const copia = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length);
    partes[parte] = meta.tipo === 'f32' ? new Float32Array(copia) : new Uint8Array(copia);
  }
  return { cabecalho, partes };
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

/**
 * O ALBEDO DA GUARDA em 720x360. É o MAPA ENTREGUE, que já está na
 * convenção da casa: a aquisição (`baixa-texturas.mjs`) é quem gira mapa de
 * cor que nasce em outro sistema de longitude, e o que chega aqui é o que a
 * tela mostra.
 */
async function albedoDaGuarda(mapaDeCor) {
  const L = LARGURA_DA_GUARDA;
  return Float64Array.from(
    await sharp(mapaDeCor, { limitInputPixels: false })
      .resize(L, L / 2, { fit: 'fill' })
      .greyscale()
      .raw()
      .toBuffer()
  );
}

/**
 * O ESPELHO (Encélado): a melhor energia de borda do DEM com as colunas
 * invertidas — a longitude crescendo para o outro lado — nas 72 defasagens.
 * A meia volta não pega este defeito; a varredura também não, porque só
 * gira. `grade` na orientação da FONTE, como a da guarda. Pura.
 */
export function melhorBordaDoEspelho(corpo, grade, albedo) {
  const { largura: L, altura: A, metros } = grade;
  const espelhada = new Float64Array(metros.length);
  for (let j = 0; j < A; j += 1) {
    for (let i = 0; i < L; i += 1) espelhada[j * L + i] = metros[j * L + L - 1 - i];
  }
  const bordaAlb = energiaDeBorda(albedo, L, A);
  let melhor = -Infinity;
  for (let d = 0; d < 360; d += PASSO_DA_VARREDURA_GRAUS) {
    const girada = orientar(corpo, grade, d, espelhada);
    melhor = Math.max(melhor, pearson(energiaDeBorda(girada, L, A), bordaAlb));
  }
  return melhor;
}

/**
 * `gradeDaGuarda` é `{ metros, largura, altura }` de 720x360, NA ORIENTAÇÃO
 * DA FONTE: quem chama a lê da fonte ou do cache das alturas, e a guarda
 * mede os mesmos números nos dois casos. Devolve as medidas.
 */
async function guardaDeAlinhamento(corpo, gradeDaGuarda, mapaDeCor, varredura) {
  const L = LARGURA_DA_GUARDA;
  const A = L / 2;
  const declarada = orientar(corpo, gradeDaGuarda);
  const outra = orientar(corpo, gradeDaGuarda, 180);
  const alb = await albedoDaGuarda(mapaDeCor);
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
      const valor = pearson(energiaDeBorda(orientar(corpo, gradeDaGuarda, d), L, A), bordaAlb);
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
  return medidas;
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

/**
 * A NORMAL de cada texel por diferença central. `vazio` (opcional) é a
 * máscara de `mediaDeCaixa`, na mesma grade e no mesmo giro de `metros`:
 * o texel cuja conta toca um vazio — ele mesmo ou um dos quatro vizinhos
 * — sai liso e fica fora do RMS e da máxima, e `lisos` os conta. Sem
 * `vazio`, a conta e os bytes são os de sempre.
 *
 * `travaNoSul: false` tira a trava de 80° do passo leste nas linhas do
 * hemisfério SUL (passo verdadeiro R·cos φ·Δλ): é o polo sul INVENTADO do
 * relevo de Caronte, contínuo em 3D, onde não há preenchimento a esconder.
 * O norte, e todo o resto sem a opção, sai byte a byte como sempre.
 */
export function assaNormais(metros, largura, altura, raioM, vazio, { travaNoSul = true } = {}) {
  const dLon = (2 * Math.PI) / largura;
  const dLat = Math.PI / altura;
  const passoNorte = raioM * dLat;
  const passoLesteMinimo = raioM * Math.cos(LATITUDE_DO_CLAMP_RAD) * dLon;
  const rgb = Buffer.allocUnsafe(largura * altura * 3);
  let somaDeclive2 = 0;
  let maiorDeclive = 0;
  let lisos = 0;
  for (let j = 0; j < altura; j += 1) {
    const lat = Math.PI / 2 - ((j + 0.5) / altura) * Math.PI;
    const passoLeste =
      travaNoSul || lat >= 0
        ? Math.max(raioM * Math.cos(lat) * dLon, passoLesteMinimo)
        : raioM * Math.cos(lat) * dLon;
    const jNorte = Math.max(0, j - 1); // a linha de cima é o NORTE
    const jSul = Math.min(altura - 1, j + 1);
    // nos polos a diferença atravessa só uma linha, não duas
    const vaoNorte = (jSul - jNorte) * passoNorte;
    for (let i = 0; i < largura; i += 1) {
      const iLeste = (i + 1) % largura; // longitude dá a volta
      const iOeste = (i - 1 + largura) % largura;
      if (
        vazio &&
        (vazio[j * largura + i] ||
          vazio[j * largura + iLeste] ||
          vazio[j * largura + iOeste] ||
          vazio[jNorte * largura + i] ||
          vazio[jSul * largura + i])
      ) {
        // a normal do terreno plano, a mesma que a conta dá a declive zero
        const k = (j * largura + i) * 3;
        rgb[k] = 128;
        rgb[k + 1] = 128;
        rgb[k + 2] = 255;
        lisos += 1;
        continue;
      }
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
  const comDado = largura * altura - lisos;
  const rms = comDado ? Math.sqrt(somaDeclive2 / comDado) : 0;
  return {
    rgb,
    rmsGraus: (Math.atan(rms) * 180) / Math.PI,
    maxGraus: (Math.atan(Math.sqrt(maiorDeclive)) * 180) / Math.PI,
    lisos,
  };
}

/** Amostras da altura em cada borda do retângulo da calota (bilinear: 4 bastam). */
const AMOSTRAS_POR_BORDA = 4;

/**
 * A CALOTA POLAR (Encélado, ver o cabeçalho). A altura da grade fina
 * `alturaM` (Wf·Hf metros, coluna 0 em −180°, linha 0 no norte) é lida uma
 * vez numa grade AZIMUTAL EQUIDISTANTE centrada no polo (`sul` escolhe qual),
 * no passo do DEM (R·π/Hf), até a colatitude `ateColatitudeRad`, com x = ρ·cos λ
 * e y = ρ·sen λ: bilinear na grade fina, com volta em longitude; entre o polo
 * e o centro da linha fina mais perto dele (meio texel), linear em ρ até a
 * média dessa linha, que é a altura do polo. Devolve `(fi, lambda,
 * larguraLesteM, alturaNorteM) → [dh/dLeste, dh/dNorte]`, em metros por metro:
 * a média do gradiente no retângulo leste × norte em volta de (fi, lambda),
 * pelo fluxo da altura nas quatro bordas (`AMOSTRAS_POR_BORDA` em cada,
 * bilinear na grade da calota). No plano o leste estica θ/sen θ (θ, a
 * colatitude), e o retângulo é desenhado esticado para cobrir a largura
 * verdadeira. Pura.
 */
export function calotaPolar(alturaM, Wf, Hf, raioM, { sul, ateColatitudeRad }) {
  const h = alturaM;
  const passo = (raioM * Math.PI) / Hf;
  const mediaDaLinha = (r) => {
    let s = 0;
    for (let i = 0; i < Wf; i += 1) s += h[r * Wf + i];
    return s / Wf;
  };
  const [poloNorte, poloSul] = [mediaDaLinha(0), mediaDaLinha(Hf - 1)];
  const naFina = (fi, lambda) => {
    const u = ((lambda + Math.PI) / (2 * Math.PI)) * Wf - 0.5;
    const u0 = Math.floor(u);
    const fu = u - u0;
    const i0 = ((u0 % Wf) + Wf) % Wf;
    const i1 = (i0 + 1) % Wf;
    const linha = (r) => h[r * Wf + i0] * (1 - fu) + h[r * Wf + i1] * fu;
    const v = ((Math.PI / 2 - fi) / Math.PI) * Hf - 0.5;
    if (v < 0) return poloNorte + (linha(0) - poloNorte) * (2 * v + 1);
    if (v > Hf - 1) return poloSul + (linha(Hf - 1) - poloSul) * (2 * (Hf - 1 - v) + 1);
    const r0 = Math.min(Hf - 2, Math.floor(v));
    const fv = v - r0;
    return linha(r0) * (1 - fv) + linha(r0 + 1) * fv;
  };
  const M = Math.ceil((raioM * ateColatitudeRad) / passo) + 2;
  const N = 2 * M + 1;
  const grade = new Float64Array(N * N);
  for (let b = 0; b < N; b += 1) {
    const y = (b - M) * passo;
    for (let a = 0; a < N; a += 1) {
      const x = (a - M) * passo;
      const colat = Math.hypot(x, y) / raioM;
      grade[b * N + a] = naFina(sul ? colat - Math.PI / 2 : Math.PI / 2 - colat, Math.atan2(y, x));
    }
  }
  const naCalota = (x, y) => {
    const a = Math.min(N - 1, Math.max(0, x / passo + M));
    const b = Math.min(N - 1, Math.max(0, y / passo + M));
    const a0 = Math.min(N - 2, Math.floor(a));
    const b0 = Math.min(N - 2, Math.floor(b));
    const [fa, fb] = [a - a0, b - b0];
    const k = b0 * N + a0;
    return (grade[k] * (1 - fa) + grade[k + 1] * fa) * (1 - fb) + (grade[k + N] * (1 - fa) + grade[k + N + 1] * fa) * fb;
  };
  return (fi, lambda, larguraLesteM, alturaNorteM) => {
    const colat = sul ? fi + Math.PI / 2 : Math.PI / 2 - fi;
    const [c, s] = [Math.cos(lambda), Math.sin(lambda)];
    const [px, py] = [raioM * colat * c, raioM * colat * s];
    // o leste e o norte do texel no plano: o norte se afasta do polo sul e
    // se aproxima do norte
    const [ex, ey] = [-s, c];
    const [nx, ny] = sul ? [c, s] : [-c, -s];
    const larguraNoPlano = (larguraLesteM * colat) / Math.sin(colat);
    let [leste, oeste, norte, doSul] = [0, 0, 0, 0];
    for (let k = 0; k < AMOSTRAS_POR_BORDA; k += 1) {
      const f = (k + 0.5) / AMOSTRAS_POR_BORDA - 0.5;
      const [ax, ay] = [px + f * alturaNorteM * nx, py + f * alturaNorteM * ny];
      leste += naCalota(ax + (larguraNoPlano / 2) * ex, ay + (larguraNoPlano / 2) * ey);
      oeste += naCalota(ax - (larguraNoPlano / 2) * ex, ay - (larguraNoPlano / 2) * ey);
      const [bx, by] = [px + f * larguraNoPlano * ex, py + f * larguraNoPlano * ey];
      norte += naCalota(bx + (alturaNorteM / 2) * nx, by + (alturaNorteM / 2) * ny);
      doSul += naCalota(bx - (alturaNorteM / 2) * nx, by - (alturaNorteM / 2) * ny);
    }
    return [
      (leste - oeste) / AMOSTRAS_POR_BORDA / larguraLesteM,
      (norte - doSul) / AMOSTRAS_POR_BORDA / alturaNorteM,
    ];
  };
}

/**
 * A NORMAL PELA MÉDIA DE ÁREA DO GRADIENTE (a Terra, item 232, 08/10) —
 * a normal de cada texel W×H sai da grade FINA de alturas (`alturaM`,
 * Wf·Hf metros, a mesma convenção, sem giro), e não de uma grade já
 * reduzida. Pelo teorema da divergência, a média do gradiente na célula é
 * o fluxo da altura pelas bordas: o leste é ∫dφ[h(λ1) − h(λ0)] / (R·Δλ·
 * (sen φN − sen φS)) e o norte (h na borda norte − h na borda sul)/(R·Δφ).
 * A altura numa borda sai da interpolação linear entre os centros finos
 * que a cercam (ao longo da derivada) e da média de caixa ao longo dela
 * (`pesosDaCaixa`); a média em φ da borda leste/oeste é pesada pela
 * sobreposição das linhas finas. O denominador leste é preso no valor de
 * 80° como em `assaNormais`, e a codificação é a mesma, ganho físico 1,0.
 * Com a diferença central numa grade reduzida, a encosta de uma célula se
 * apoiava nas médias das vizinhas e saía alisada; aqui ela é a da célula
 * (no ETOPO, declive RMS da terra 1,99° contra 1,43° do 8192 reduzido —
 * `capturas/efeitos-timidos/relevo/numeros.md`). `{ rgb, rmsGraus, maxGraus }`.
 *
 * `calotas: { deGraus, ateGraus }` (Encélado) leva as linhas acima de `deGraus`
 * para a conta das CALOTAS POLARES (`calotaPolar`, ver o cabeçalho): a encosta
 * do texel é a média do gradiente na grade azimutal equidistante, misturada à
 * de cá por smoothstep até `ateGraus`, inteira dali ao polo — onde a trava
 * deixa de valer. Sem a opção, os bytes são os de sempre.
 */
export function assaNormaisPorMediaDeArea(alturaM, Wf, Hf, W, H, raioM, { calotas } = {}) {
  const h = alturaM;
  const rx = Wf / W;
  const ry = Hf / H;
  const dLon = (2 * Math.PI) / W;
  const dLat = Math.PI / H;
  const cosTrava = Math.cos(LATITUDE_DO_CLAMP_RAD);
  // as duas calotas cobrem até `deGraus` mais a borda do retângulo do texel
  const doPolo = calotas && {
    de: (calotas.deGraus * Math.PI) / 180,
    ate: (calotas.ateGraus * Math.PI) / 180,
    norte: calotaPolar(h, Wf, Hf, raioM, { sul: false, ateColatitudeRad: ((90 - calotas.deGraus) * Math.PI) / 180 + 2 * dLat }),
    sul: calotaPolar(h, Wf, Hf, raioM, { sul: true, ateColatitudeRad: ((90 - calotas.deGraus) * Math.PI) / 180 + 2 * dLat }),
  };
  const passoDoDem = (raioM * Math.PI) / Hf;
  // a borda OESTE da coluna e, em coordenada de centro fino (o centro k em k + 0,5)
  const k0 = new Int32Array(W);
  const k1 = new Int32Array(W);
  const fk = new Float64Array(W);
  for (let e = 0; e < W; e += 1) {
    const t = e * rx - 0.5;
    const f0 = Math.floor(t);
    fk[e] = t - f0;
    k0[e] = ((f0 % Wf) + Wf) % Wf;
    k1[e] = (k0[e] + 1) % Wf;
  }
  const P = pesosDaCaixa(W, Wf);
  // a borda horizontal b (latitude 90° − b·Δφ): a interpolação entre as duas
  // linhas finas que a cercam, em média de caixa sobre cada coluna de saída
  const bordaHorizontal = (b) => {
    const y = b * ry - 0.5;
    const r0f = Math.floor(y);
    const f = y - r0f;
    const r0 = Math.max(0, Math.min(Hf - 1, r0f)) * Wf;
    const r1 = Math.max(0, Math.min(Hf - 1, r0f + 1)) * Wf;
    const borda = new Float64Array(W);
    for (let I = 0; I < W; I += 1) {
      let s = 0;
      for (let p = P.ini[I]; p < P.ini[I + 1]; p += 1) {
        const k = P.col[p];
        s += P.w[p] * (h[r0 + k] * (1 - f) + h[r1 + k] * f);
      }
      borda[I] = s;
    }
    return borda;
  };
  const rgb = Buffer.alloc(W * H * 3);
  const oeste = new Float64Array(W);
  let norte = bordaHorizontal(0);
  let somaDeclive2 = 0;
  let maiorDeclive = 0;
  for (let j = 0; j < H; j += 1) {
    oeste.fill(0);
    const v0 = j * ry;
    const v1 = v0 + ry;
    for (let r = Math.floor(v0); r < Math.ceil(v1); r += 1) {
      const w = (Math.min(v1, r + 1) - Math.max(v0, r)) / ry;
      if (w <= 1e-9) continue;
      const base = Math.min(Hf - 1, r) * Wf;
      for (let e = 0; e < W; e += 1) oeste[e] += w * (h[base + k0[e]] * (1 - fk[e]) + h[base + k1[e]] * fk[e]);
    }
    const sul = bordaHorizontal(j + 1);
    const fiN = Math.PI / 2 - j * dLat;
    const cj = Math.max((Math.sin(fiN) - Math.sin(fiN - dLat)) / dLat, cosTrava);
    const passoLeste = raioM * dLon * cj;
    const passoNorte = raioM * dLat;
    // o peso da calota na linha (0 aquém de `de`, 1 além de `ate`) e o
    // retângulo do texel: R·Δφ ao norte, a largura da célula a leste, nunca
    // menos que o passo do DEM
    const fi = fiN - dLat / 2;
    const t = doPolo ? Math.min(1, Math.max(0, (Math.abs(fi) - doPolo.de) / (doPolo.ate - doPolo.de))) : 0;
    const pesoDaCalota = t * t * (3 - 2 * t);
    const calota = fi > 0 ? doPolo?.norte : doPolo?.sul;
    const larguraLeste = Math.max(raioM * dLon * Math.cos(fi), passoDoDem);
    for (let i = 0; i < W; i += 1) {
      // a borda leste da coluna i é a oeste da seguinte, com a volta
      let x = -(oeste[(i + 1) % W] - oeste[i]) / passoLeste;
      let y = -(norte[i] - sul[i]) / passoNorte;
      if (pesoDaCalota > 0) {
        const [dhLeste, dhNorte] = calota(fi, -Math.PI + (i + 0.5) * dLon, larguraLeste, passoNorte);
        x += pesoDaCalota * (-dhLeste - x);
        y += pesoDaCalota * (-dhNorte - y);
      }
      const declive2 = x * x + y * y;
      somaDeclive2 += declive2;
      if (declive2 > maiorDeclive) maiorDeclive = declive2;
      const inv = 1 / Math.sqrt(declive2 + 1);
      const k = (j * W + i) * 3;
      rgb[k] = Math.max(0, Math.min(255, Math.round((x * inv * 0.5 + 0.5) * 255)));
      rgb[k + 1] = Math.max(0, Math.min(255, Math.round((y * inv * 0.5 + 0.5) * 255)));
      rgb[k + 2] = Math.max(0, Math.min(255, Math.round((inv * 0.5 + 0.5) * 255)));
    }
    norte = sul;
  }
  return {
    rgb,
    rmsGraus: (Math.atan(Math.sqrt(somaDeclive2 / (W * H))) * 180) / Math.PI,
    maxGraus: (Math.atan(Math.sqrt(maiorDeclive)) * 180) / Math.PI,
  };
}

// ------------------------------------------------------------
// O DEM LOCAL (Encélado, R4)
// ------------------------------------------------------------

/**
 * A GEORREFERÊNCIA de um GeoTIFF clássico little-endian, em graus: onde cai
 * a borda esquerda e o topo, e quanto a grade cobre. Lê ModelPixelScale
 * (33550), ModelTiepoint (33922) e as chaves do GeoKeyDirectory (34735, com
 * os duplos de 34736): modelo (1024: 2 = geográfico, em graus; senão
 * equirretangular em metros), PixelIsPoint (1025 = 2, meio pixel), o raio
 * (2057), o meridiano central (3088 ou 3080), o paralelo de escala (3078) e
 * o falso leste/norte (3082/3083). Sem o raio, a grade cobre 360° por
 * hipótese. Sem as duas tags, `null`. Pura.
 */
export function georreferenciaDoTiff(bytes, largura, altura) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ifd = v.getUint32(4, true);
  const tags = new Map();
  for (let n = 0, e = ifd + 2; n < v.getUint16(ifd, true); n += 1, e += 12) {
    const tipo = v.getUint16(e + 2, true);
    const tam = { 3: 2, 4: 4, 12: 8 }[tipo];
    if (!tam) continue;
    const conta = v.getUint32(e + 4, true);
    const ini = conta * tam <= 4 ? e + 8 : v.getUint32(e + 8, true);
    const le = (k) =>
      tipo === 3
        ? v.getUint16(ini + 2 * k, true)
        : tipo === 4
          ? v.getUint32(ini + 4 * k, true)
          : v.getFloat64(ini + 8 * k, true);
    tags.set(v.getUint16(e, true), Array.from({ length: conta }, (_, k) => le(k)));
  }
  const escala = tags.get(33550);
  const ancora = tags.get(33922);
  if (!escala || !ancora) return null;
  const chave = new Map();
  const dir = tags.get(34735) ?? [0, 0, 0, 0];
  const duplos = tags.get(34736) ?? [];
  for (let k = 0; k < dir[3]; k += 1) {
    const [id, onde, , valor] = dir.slice(4 + 4 * k, 8 + 4 * k);
    if (onde === 0) chave.set(id, valor);
    else if (onde === 34736) chave.set(id, duplos[valor]);
  }
  const [sx, sy] = escala;
  const [i0, j0, , x0, y0] = ancora;
  const meio = chave.get(1025) === 2 ? 0.5 : 0;
  const geografica = chave.get(1024) === 2;
  const raioM = geografica ? null : (chave.get(2057) ?? null);
  const centralGraus = geografica ? 0 : (chave.get(3088) ?? chave.get(3080) ?? 0);
  const cosParalelo = Math.cos(((chave.get(3078) ?? 0) * Math.PI) / 180);
  const grausLat = geografica ? 1 : raioM ? 180 / (Math.PI * raioM) : 360 / (largura * sx);
  const grausLon = geografica ? 1 : grausLat / cosParalelo;
  const falso = (k) => (geografica ? 0 : (chave.get(k) ?? 0));
  return {
    bordaEsquerdaGraus: centralGraus + (x0 - (i0 + meio) * sx - falso(3082)) * grausLon,
    topoGraus: (y0 + (j0 + meio) * sy - falso(3083)) * grausLat,
    larguraGraus: largura * sx * grausLon,
    alturaGraus: altura * sy * grausLat,
    raioM,
    centralGraus,
    pixelEPonto: meio > 0,
    geografica,
  };
}

/** Diferença de longitudes em (−180, 180]. */
const difLon = (a, b) => ((((a - b) % 360) + 540) % 360) - 180;

/**
 * O VEREDITO DA GEORREFERÊNCIA, sem I/O: a borda esquerda do GeoTIFF tem de
 * ser a declarada a menos de um pixel da fonte, e a grade tem de ser a global
 * (360° de largura, topo em +90°, 180° de altura, à mesma tolerância).
 * Recusa dizendo o número que a tabela pediria.
 */
export function conferirGeorreferencia(corpo, geo, largura, altura) {
  const pxLon = 360 / largura;
  const pxLat = 180 / altura;
  if (Math.abs(difLon(geo.bordaEsquerdaGraus, corpo.longitudeDaBordaEsquerdaGraus)) > pxLon) {
    const proposta = ((Math.round(geo.bordaEsquerdaGraus) % 360) + 360) % 360;
    throw new Error(
      `o GeoTIFF põe a borda esquerda em ${geo.bordaEsquerdaGraus.toFixed(3)}°E e a tabela ` +
        `diz ${corpo.longitudeDaBordaEsquerdaGraus}° — com a guarda de acordo, a declaração é ` +
        `longitudeDaBordaEsquerdaGraus: ${proposta}. Não asso.`
    );
  }
  if (
    Math.abs(geo.larguraGraus - 360) > pxLon ||
    Math.abs(geo.topoGraus - 90) > pxLat ||
    Math.abs(geo.alturaGraus - 180) > 2 * pxLat
  ) {
    throw new Error(
      `o GeoTIFF não é a grade global: ${geo.larguraGraus.toFixed(3)}° de largura, topo em ` +
        `${geo.topoGraus.toFixed(3)}°, ${geo.alturaGraus.toFixed(3)}° de altura. Não asso.`
    );
  }
}

/**
 * O DEM LOCAL EM METROS, na grade e na orientação da FONTE. `bytes` é o
 * GeoTIFF inteiro: `leTiffFloat32` o lê, a largura e a altura têm de ser as
 * declaradas, a margem `fonte.margemSemDado` (as primeiras colunas e linhas)
 * tem de ser TODA sem dado e é recortada — a georreferência anda junto —, a
 * georreferência (se houver) é conferida na grade recortada, e cada valor vira
 * metro pela conversão da tabela. Sem dado (≤ `semDado`, ou NaN) vira 0 m —
 * o nível do elipsoide — e é contado. Um DEM que passa do DOBRO da faixa do
 * byte não está na unidade declarada, e é recusado. Pura.
 */
export function lerDemLocal(bytes, corpo) {
  const { fonte, mapaDeAltura } = corpo;
  const lido = leTiffFloat32(bytes);
  if (lido.largura !== fonte.largura || lido.altura !== fonte.altura) {
    throw new Error(`o DEM tem ${lido.largura}x${lido.altura}, a tabela declara ${fonte.largura}x${fonte.altura} — não asso.`);
  }
  const { esquerda = 0, topo = 0 } = fonte.margemSemDado ?? {};
  const largura = lido.largura - esquerda;
  const altura = lido.altura - topo;
  const valores = new Float32Array(largura * altura);
  for (let j = 0; j < lido.altura; j += 1) {
    for (let i = 0; i < lido.largura; i += 1) {
      const v = lido.valores[j * lido.largura + i];
      if (j >= topo && i >= esquerda) valores[(j - topo) * largura + i - esquerda] = v;
      else if (v > fonte.semDado && Number.isFinite(v)) {
        throw new Error(`a margem declarada sem dado tem dado na coluna ${i}, linha ${j} — não asso.`);
      }
    }
  }
  let geo = georreferenciaDoTiff(bytes, lido.largura, lido.altura);
  if (geo) {
    const [pxLon, pxLat] = [geo.larguraGraus / lido.largura, geo.alturaGraus / lido.altura];
    geo = {
      ...geo,
      bordaEsquerdaGraus: geo.bordaEsquerdaGraus + esquerda * pxLon,
      topoGraus: geo.topoGraus - topo * pxLat,
      larguraGraus: largura * pxLon,
      alturaGraus: altura * pxLat,
    };
    conferirGeorreferencia(corpo, geo, largura, altura);
  }
  let semDado = 0;
  let minM = Infinity;
  let maxM = -Infinity;
  for (let k = 0; k < valores.length; k += 1) {
    const v = valores[k];
    if (!(v > fonte.semDado) || !Number.isFinite(v)) {
      valores[k] = 0;
      semDado += 1;
      continue;
    }
    const m = v * corpo.metrosPorUnidade + corpo.offsetDoDado;
    valores[k] = m;
    if (m < minM) minM = m;
    if (m > maxM) maxM = m;
  }
  const { min, max } = mapaDeAltura.faixaKm;
  if (minM < 2000 * min || maxM > 2000 * max) {
    throw new Error(
      `o DEM vai de ${(minM / 1000).toFixed(2)} a ${(maxM / 1000).toFixed(2)} km, além do dobro da ` +
        `faixa (${min} a ${max} km) — o dado não está na unidade declarada. Não asso.`
    );
  }
  return { metros: valores, largura, altura, semDado, minM, maxM, geo };
}

/**
 * A ALTURA E A NORMAL do DEM local (`lerDemLocal`), na convenção da casa:
 * a grade fina girada pela borda declarada; a ALTURA, a média de área dela
 * em `larguraDaAltura` px, em km, no byte da faixa (`quantizaNaFaixa`); a
 * NORMAL, `assaNormaisPorMediaDeArea` em `larguraDaNormal` px sobre a mesma
 * grade presa à faixa e ÷ `ganhoDoShader`, no passo de `raioM`, com as
 * calotas polares da tabela. `presos` conta as amostras finas fora da faixa. Pura.
 */
export function relevoDoDem(fina, corpo, { larguraDaNormal = LARGURA_ALVO, larguraDaAltura = corpo.mapaDeAltura.largura } = {}) {
  const { metros, largura: Wf, altura: Hf } = fina;
  const { faixaKm, raioDoVerticeKm } = corpo.mapaDeAltura;
  const giro = LONGITUDE_ESQUERDA_DA_CASA - corpo.longitudeDaBordaEsquerdaGraus;
  const casa = giraColunasDeImagem(metros, Wf, Hf, 1, giro);

  const Wa = larguraDaAltura;
  const km = reamostraParaACasa(casa, Wf, Hf, Wa, Wa / 2, LONGITUDE_ESQUERDA_DA_CASA).map((m) => m / 1000);
  const { bytes, abaixo, acima } = quantizaNaFaixa(km, faixaKm);

  const [lo, hi] = [faixaKm.min * 1000, faixaKm.max * 1000];
  const presa = new Float32Array(casa.length);
  let presos = 0;
  for (let k = 0; k < casa.length; k += 1) {
    const m = casa[k];
    if (m < lo || m > hi) presos += 1;
    presa[k] = Math.min(hi, Math.max(lo, m)) / corpo.ganhoDoShader;
  }
  const Wn = larguraDaNormal;
  const normal = assaNormaisPorMediaDeArea(presa, Wf, Hf, Wn, Wn / 2, corpo.raioM, { calotas: corpo.calotasPolares });
  return {
    altura: { bytes, largura: Wa, altura: Wa / 2, abaixo, acima },
    normal: { ...normal, largura: Wn, altura: Wn / 2 },
    presos,
    escalaEVies: escalaEViesDaFaixa(faixaKm, raioDoVerticeKm),
  };
}

/**
 * A ENCOSTA FÍSICA por faixa de latitude, lida do RGB assado (`ganho` é o
 * do shader): `[{ faixa, rmsGraus, maxGraus }]`. É a conta que diz se o polo
 * sem trava saiu com parede.
 */
function encostaPorFaixa(rgb, largura, altura, ganho, faixas) {
  return faixas.map(([de, ate]) => {
    let soma = 0;
    let n = 0;
    let max = 0;
    for (let j = 0; j < altura; j += 1) {
      const lat = 90 - ((j + 0.5) / altura) * 180;
      if (lat > Math.max(de, ate) || lat < Math.min(de, ate)) continue;
      for (let i = 0; i < largura; i += 1) {
        const k = (j * largura + i) * 3;
        const [x, y, z] = [rgb[k], rgb[k + 1], rgb[k + 2]].map((b) => (b / 255) * 2 - 1);
        const s = (ganho * Math.hypot(x, y)) / z;
        soma += s * s;
        n += 1;
        if (s > max) max = s;
      }
    }
    const graus = (s) => (Math.atan(s) * 180) / Math.PI;
    return { faixa: `${de}…${ate}°`, rmsGraus: graus(Math.sqrt(soma / n)), maxGraus: graus(max) };
  });
}

/**
 * O SPC DO POLO SUL (`spcDoPolo`): lê o DSK do cache, confere o sha256
 * pinado e o que o descritor diz (Encélado, IAU_ENCELADUS, placas, raios de
 * 247 a 251 km), e rasteriza as placas na grade polar de `SPC_DE_ENCELADO`.
 */
async function lerSpcDoPolo(corpo) {
  const { spcDoPolo: fonte, raioM } = corpo;
  const caminho = path.join(rootDirectory, fonte.arquivo);
  if (!existsSync(caminho)) {
    throw new Error(`sem o SPC em ${fonte.arquivo} — baixe-o antes: curl -L --fail -o ${fonte.arquivo} ${fonte.url}`);
  }
  const bytes = await readFile(caminho);
  if (sha256(bytes) !== fonte.sha256) throw new Error(`o sha256 do SPC não é o pinado (${fonte.sha256}) — não asso.`);
  const { segmentos, formato } = leDsk(bytes);
  const placas = segmentos.filter((s) => s.tipo === 2);
  if (placas.length !== 1 || placas[0].centro !== 602 || placas[0].quadro !== 10040) {
    throw new Error('o DSK não é um segmento de placas de Encélado no IAU_ENCELADUS — não asso.');
  }
  const s = placas[0];
  const [rMin, rMax] = s.limites.slice(4);
  if (!(rMin > 247 && rMax < 251)) throw new Error(`raios de ${rMin} a ${rMax} km fora do polo sul de Encélado — não asso.`);
  const p = SPC_DE_ENCELADO;
  const grade = rasterizaNoPolo({ vertices: s.vertices, placas: s.placas, raioKm: raioM / 1000, passoKm: p.passoKm, ateGraus: p.ateGraus });
  const cheias = grade.alturaM.reduce((n, h) => n + (Number.isFinite(h) ? 1 : 0), 0);
  console.log(
    `SPC do polo sul (${formato}): ${s.nv} vértices, ${s.np} placas, raios ${rMin.toFixed(2)}–${rMax.toFixed(2)} km; ` +
      `${Math.round(cheias * p.passoKm * p.passoKm)} km² cobertos na grade polar de ${1000 * p.passoKm} m.`
  );
  return grade;
}

/**
 * O CONSERTO E O SPC NA CASA (puro; `casa` o DEM fino em m, `luminancia` a
 * foto na grade de trabalho, `grade` a do SPC ou null): o conserto dos
 * ladrilhos ruins com o núcleo do SPC protegido; o registro (a guarda do giro
 * e o plano nos ladrilhos bons), a fusão e o SPT por exemplo do SPC, com as
 * listras pelo traço da foto (`preencheSpt`); por último, as bordas retas de
 * ladrilho entre dois ladrilhos bons recosturadas (`recosturaBordas`: a única
 * mudança no Schenk bom). Devolve `{ metros, conserto, spc, spt, recostura,
 * partilha }` — a partilha da área da esfera em SPC, Schenk medido, alisado,
 * derivado da foto e inventado por exemplo do SPC.
 */
export function consertaComSpc({ casa, largura, altura, luminancia, corpo, grade = null }) {
  const p = SPC_DE_ENCELADO;
  const W = CONSERTO_DE_ENCELADO.larguraDeTrabalho;
  const Ht = W / 2;
  const raioM = corpo.raioM;
  const fino = grade ? spcNaCasa(grade, largura, altura, p.giroGraus) : null;
  const mascaras = fino ? mascarasDoSpc(fino, largura, altura, W, Ht, raioM, p) : null;
  const conserto = consertaDem({
    metros: casa,
    largura,
    altura,
    luminancia,
    raioM,
    fino: corpo.consertoDoDem.fino,
    protegido: mascaras?.nucleo,
  });
  // as bordas retas de ladrilho entre dois bons (fora do SPC), recosturadas por último, sobre o que ficou em volta
  const recostura = (metros) =>
    conserto.bordas
      ? recosturaBordas({
          metros,
          Wf: largura,
          Hf: altura,
          bordas: conserto.bordas,
          livre: Uint8Array.from(conserto.qualidade, (c, k) => (c === BOM && !mascaras?.dentro[k] ? 1 : 0)),
          W,
          H: Ht,
          raioM,
        })
      : { metros, texels: 0, km2: 0 };
  if (!grade) {
    const r = recostura(conserto.metros);
    return {
      metros: r.metros,
      conserto,
      spc: null,
      recostura: { texels: r.texels, km2: r.km2 },
      partilha: partilhaDaArea(conserto.cobertura, null, W, Ht),
    };
  }
  const texel = (lat, lonE) => {
    const j = Math.min(Ht - 1, Math.floor(((90 - lat) / 180) * Ht));
    return j * W + (Math.floor(((((lonE - 180) % 360) + 360) % 360) / 360 * W) % W);
  };
  const registro = registraNoDem({
    grade,
    demEm: (lat, lonE) => amostraNaCasa(casa, largura, altura, lat, lonE),
    bomEm: (lat, lonE) => conserto.qualidade[texel(lat, lonE)] === BOM,
    p,
  });
  const { declarado, semGiro, espelho } = registro.correlacao;
  if (!(declarado > Math.max(semGiro, espelho) + p.registro.margem)) {
    throw new Error(
      `o SPC no giro declarado de ${p.giroGraus}° casa com o DEM em ${declarado.toFixed(3)}, sem giro em ` +
        `${semGiro.toFixed(3)}, espelhado em ${espelho.toFixed(3)} — o registro não confere. Não asso.`
    );
  }
  const spcFino = spcNaCasa(aplicaPlano(grade, registro.plano), largura, altura, p.giroGraus);
  const f = fundeNoDem({ metros: conserto.metros, spcFino, Wf: largura, Hf: altura, mascaras, W, H: Ht, raioM, p });
  const traco = tracaListras({ fotoLog: Float32Array.from(luminancia, (l) => Math.log(l + 0.003)), W, H: Ht, raioM });
  const spt = preencheSpt({
    metros: f.metros,
    spcFino,
    Wf: largura,
    Hf: altura,
    mascaras,
    qualidade: conserto.qualidade,
    cobertura: conserto.cobertura,
    luminancia,
    linhas: traco.linhas,
    W,
    H: Ht,
    raioM,
  });
  const r = recostura(spt.metros);
  return {
    metros: r.metros,
    conserto,
    spc: { registro, mascaras, correcao: f.correcao },
    spt: spt.relatorio,
    recostura: { texels: r.texels, km2: r.km2 },
    partilha: partilhaDaArea(spt.cobertura, spt.pesoDoSpc, W, Ht),
  };
}

/**
 * O DEM CONSERTADO (`consertaComSpc`): lê o retrato da cor pinado em
 * `consertoDoDem`, na latitude da casa (`paraLatitudePlanetocentrica` com a
 * `latitude` declarada: a máscara, as crateras e o traço das listras leem a
 * foto daqui), e o SPC de `spcDoPolo`, leva a grade fina à casa, conserta
 * e funde, e a traz de volta à orientação da fonte — o resto da cadeia não
 * muda. Conta a partilha da área.
 */
async function consertarODem(corpo, fina) {
  const { foto, sha256: pinado, latitude, fino } = corpo.consertoDoDem;
  const bytes = await readFile(path.join(rootDirectory, foto));
  if (sha256(bytes) !== pinado) throw new Error(`o retrato ${foto} não é o pinado (${pinado}) — não conserto.`);
  const { data, info } = await sharp(bytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const naCasa = paraLatitudePlanetocentrica(data, info.width, info.height, info.channels, latitude);
  const luminancia = luminanciaDoRgb(naCasa, info.width, info.height, info.channels);
  const giro = LONGITUDE_ESQUERDA_DA_CASA - corpo.longitudeDaBordaEsquerdaGraus;
  const { largura, altura } = fina;
  const casa = giraColunasDeImagem(fina.metros, largura, altura, 1, giro);
  const grade = corpo.spcDoPolo ? await lerSpcDoPolo(corpo) : null;
  const r = consertaComSpc({ casa, largura, altura, luminancia, corpo, grade });
  const pct = (x) => `${(100 * x).toFixed(1)} %`;
  const { classes, lei, crateras } = r.conserto.relatorio;
  console.log(
    `conserto (fino ${fino}): ruído ${pct(classes[RUIDO])}, liso ${pct(classes[LISO])} da área fora do núcleo do SPC; ` +
      `crateras: d/D ${lei.dD.toFixed(3)} (${lei.n} nos ladrilhos bons), ${crateras.noRuim} completadas no ruim.`
  );
  if (r.spc) {
    const { registro } = r.spc;
    const c = registro.correlacao;
    console.log(
      `SPC registrado: giro ${SPC_DE_ENCELADO.giroGraus}° (banda média ${c.declarado.toFixed(3)}, sem giro ` +
        `${c.semGiro.toFixed(3)}, espelho ${c.espelho.toFixed(3)}); plano ${registro.plano.map((v) => v.toFixed(2)).join(', ')} ` +
        `(m, m/km${registro.inclinacao ? '' : '; só o nível, os bons não sustentam inclinação'}) em ` +
        `${Math.round(registro.areaBonsKm2)} km² de ladrilhos bons, resíduo do largo ` +
        `${registro.rmsAntesM.toFixed(0)} → ${registro.rmsDepoisM.toFixed(0)} m.`
    );
  }
  if (r.spt) {
    const { alvoKm2, retalhos, origens, desvioDoRumoGraus, concordanciaDoRumo, asperezaPelaFoto, listras: l } = r.spt;
    console.log(
      `SPT por exemplo do SPC: ${Math.round(alvoKm2)} km² de alvo, ${retalhos} retalhos de ${origens} origens; rumo da ` +
        `foto − relevo ${desvioDoRumoGraus}° (concordância ${concordanciaDoRumo}); aspereza pela foto r ${asperezaPelaFoto.r}; ` +
        `listras: ${l.fatias} fatias medidas, sulco ${l.sulcoM} m na média (${l.sulcoDaFatiaM} m fatia a fatia), ` +
        `crista ${l.cristaM} m, ${l.cristaACristaKm} km de crista a crista.`
    );
  }
  const a = r.partilha;
  console.log(
    `área da esfera: medido ${pct(a.schenk)} (Schenk & McKinnon 2024) + ${pct(a.spc)} (SPC, Park et al. 2024), ` +
      `inventado por exemplo do SPC ${pct(a.exemplo)}, derivado da foto ${pct(a.derivado)}, alisado ${pct(a.alisado)}.`
  );
  console.log(
    `bordas de ladrilho recosturadas no Schenk bom: ${Math.round(r.recostura.km2)} km² ` +
      `(${pct(r.recostura.km2 / (4 * Math.PI * (corpo.raioM / 1000) ** 2))} da esfera, ${r.recostura.texels} texels finos) — ` +
      'a única mudança no DEM bom.'
  );
  return { ...fina, metros: giraColunasDeImagem(r.metros, largura, altura, 1, -giro) };
}

/**
 * ASSA ENCÉLADO (ver o cabeçalho): lê o DEM do cache (ou de `--dem`),
 * confere o sha256 pinado, a georreferência, a guarda (meia volta e, aqui,
 * o espelho) e grava `height.png` (cinza, 8 bits) e `normal.png` (RGB) em
 * `destino`.
 */
export async function assaDoDemLocal(corpo, destino, mapaDeCor, { varredura, caminhoDado }) {
  const { fonte } = corpo;
  const caminho = caminhoDado || path.join(rootDirectory, fonte.arquivo);
  const relativo = path.relative(rootDirectory, caminho);
  if (!existsSync(caminho)) {
    throw new Error(`sem o DEM em ${relativo} — baixe-o antes: curl -L --fail -o ${relativo} ${fonte.url}`);
  }
  const bytes = await readFile(caminho);
  const hash = sha256(bytes);
  console.log(`${fonte.descricao}: ${relativo} (${megabytes(bytes.length)}), sha256 ${hash}.`);
  if (fonte.sha256 && hash !== fonte.sha256) {
    throw new Error(`o sha256 do DEM não é o pinado (${fonte.sha256}) — outro arquivo, não asso.`);
  }
  if (!fonte.sha256) console.log('  sha256 ainda não pinado: com a palavra dele, entra em CORPOS.enceladus.fonte.sha256.');

  const fina = lerDemLocal(bytes, corpo);
  const { geo } = fina;
  console.log(
    geo
      ? `georreferência: borda esquerda ${geo.bordaEsquerdaGraus.toFixed(4)}°E, topo ${geo.topoGraus.toFixed(4)}°, ` +
          `${geo.larguraGraus.toFixed(4)}° × ${geo.alturaGraus.toFixed(4)}°, raio ${geo.raioM ?? 'ausente'} m, ` +
          `meridiano central ${geo.centralGraus}°${geo.pixelEPonto ? ', PixelIsPoint' : ''} — confere com a tabela.`
      : 'georreferência: o TIFF não traz ModelPixelScale/ModelTiepoint — quem decide a borda é a guarda.'
  );
  console.log(
    `alturas: ${(fina.minM / 1000).toFixed(3)} a ${(fina.maxM / 1000).toFixed(3)} km; ` +
      `${fina.semDado} amostras sem dado (postas em 0 m).`
  );

  // ---- a guarda: a meia volta (a de sempre) e o espelho
  const L = LARGURA_DA_GUARDA;
  // na orientação da FONTE: a borda da casa como borda da fonte é giro nenhum
  const gradeDaGuarda = {
    metros: reamostraParaACasa(fina.metros, fina.largura, fina.altura, L, L / 2, LONGITUDE_ESQUERDA_DA_CASA),
    largura: L,
    altura: L / 2,
  };
  const { bordaDeclarada } = await guardaDeAlinhamento(corpo, gradeDaGuarda, mapaDeCor, varredura);
  const espelho = melhorBordaDoEspelho(corpo, gradeDaGuarda, await albedoDaGuarda(mapaDeCor));
  console.log(`espelho: melhor energia de borda ${espelho.toFixed(4)} nas 72 defasagens.`);
  if (!(bordaDeclarada > espelho)) {
    throw new Error(
      `o DEM ESPELHADO casa melhor com a cor (${espelho.toFixed(4)} contra ${bordaDeclarada.toFixed(4)}) — ` +
        'a longitude cresce para o outro lado. Não asso.'
    );
  }

  // ---- o conserto dos ladrilhos ruins (ver `consertoDoDem` na tabela)
  const medida = corpo.consertoDoDem ? await consertarODem(corpo, fina) : fina;

  // ---- a altura e a normal
  const r = relevoDoDem(medida, corpo);
  const { altura: alt, normal } = r;
  const fisico = (graus) => (Math.atan(corpo.ganhoDoShader * Math.tan((graus * Math.PI) / 180)) * 180) / Math.PI;
  console.log(
    `altura: ${alt.largura}x${alt.altura}, faixa ${corpo.mapaDeAltura.faixaKm.min} a ` +
      `${corpo.mapaDeAltura.faixaKm.max} km, ${alt.abaixo + alt.acima} texels saturados; ` +
      `${r.presos} amostras finas presas à faixa na normal.`
  );
  console.log(
    `RELEVO_DA_LUA.${corpo.diretorio} (rochoso.ts) tem de ser { escala: ${r.escalaEVies.escala}, ` +
      `vies: ${r.escalaEVies.vies} } — o juiz do gerador cobra.`
  );
  console.log(
    `normal: ${normal.largura}x${normal.altura}, inclinação física RMS ${fisico(normal.rmsGraus).toFixed(2)}°, ` +
      `máxima ${fisico(normal.maxGraus).toFixed(2)}° (mapa ÷ ${corpo.ganhoDoShader}, ganho do shader).`
  );
  const faixas = [[-30, 30], [-60, -70], [-70, -80], [-80, -85], [-85, -89], [-89, -90], [60, 70], [80, 85], [89, 90]];
  for (const f of encostaPorFaixa(normal.rgb, normal.largura, normal.altura, corpo.ganhoDoShader, faixas)) {
    console.log(`  ${f.faixa}: RMS ${f.rmsGraus.toFixed(2)}°, máxima ${f.maxGraus.toFixed(2)}°`);
  }

  await mkdir(destino, { recursive: true });
  const opcoes = { compressionLevel: 9, adaptiveFiltering: false };
  for (const [nome, dados, canais, l, a] of [
    ['height.png', Buffer.from(alt.bytes), 1, alt.largura, alt.altura],
    ['normal.png', normal.rgb, 3, normal.largura, normal.altura],
  ]) {
    const saida = path.join(destino, nome);
    await sharp(dados, { raw: { width: l, height: a, channels: canais } }).png(opcoes).toFile(saida);
    const { size } = await stat(saida);
    console.log(`assado: ${path.relative(rootDirectory, saida)} ${l}x${a} (${megabytes(size)}).`);
  }
}

// ------------------------------------------------------------
// O RELEVO INVENTADO (Plutão e Caronte)
// ------------------------------------------------------------

/**
 * UMA TABELA PINADA do relevo inventado (`vazioInventado.tabelas`): lida de
 * `<dir>/<arquivo>` ou, sem ela, baixada da `url` pinada e guardada lá. Nos
 * dois caminhos o sha256 tem de ser o pinado, senão RECUSA — outra versão da
 * tabela mudaria as crateras caladas. Devolve `{ texto, sha256 }`.
 */
async function garantirTabela(dir, { arquivo, url, sha256: pinado }) {
  const caminho = path.join(dir, arquivo);
  const guardada = existsSync(caminho);
  let bytes;
  if (guardada) {
    bytes = await readFile(caminho);
  } else {
    console.log(`baixando ${url} …`);
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`${arquivo}: HTTP ${resposta.status} em ${url}`);
    bytes = Buffer.from(await resposta.arrayBuffer());
  }
  const obtido = sha256(bytes);
  if (obtido !== pinado) {
    throw new Error(
      `${guardada ? caminho : url}: sha256 ${obtido}, o pinado é ${pinado} — não asso com outra tabela.`
    );
  }
  if (!guardada) {
    await mkdir(dir, { recursive: true });
    await gravarInteiro(caminho, bytes);
  }
  return { texto: bytes.toString('utf8'), sha256: obtido };
}

/**
 * O PORTÃO DO RELEVO INVENTADO: o normal.png só é gravado se o sha256 do RGB
 * DECODIFICADO (`sha256`) for o aprovado (`aprovados` =
 * `vazioInventado.sha256Aprovado`) para a chave das escolhas do JSON do corpo
 * (`chave`, de `chaveDasEscolhas`). Pura: `{ grava, mensagem }`.
 */
export function decideGravacao({ nome, chave, sha256: obtido, aprovados = {} }) {
  const aprovado = aprovados[chave];
  if (aprovado === obtido) {
    return { grava: true, mensagem: `${nome}: RGB aprovado para "${chave}" (sha256 ${obtido}) — gravo o normal.png.` };
  }
  if (aprovado === undefined) {
    return {
      grava: false,
      mensagem:
        `${nome}: RGB ainda não aprovado para "${chave}" (sha256 ${obtido}) — o normal.png NÃO foi gravado. ` +
        `Com o sim do dono, este hash entra em vazioInventado.sha256Aprovado["${chave}"].`,
    };
  }
  return {
    grava: false,
    mensagem:
      `${nome}: o RGB (sha256 ${obtido}) não é o aprovado para "${chave}" (${aprovado}) — ` +
      'o normal.png NÃO foi gravado: o relevo mudou desde a aprovação.',
  };
}

/**
 * O MAPA DE UM CORPO COM `vazioInventado` (ver o cabeçalho): as tabelas
 * pinadas, `inventaRelevoDoCorpo` com o JSON e a semente do corpo, a
 * impressão do que refaz o mapa e o PORTÃO — o PNG é codificado e
 * decodificado, e o sha256 do RGB decodificado passa por `decideGravacao`;
 * recusado, o erro leva a mensagem e nada é gravado. Devolve o que
 * `assaNormais` devolve e o `png` conferido, que é o que vai para o disco.
 */
async function assaOVazioInventado(id, corpo, grade, mapaDeCor) {
  const v = corpo.vazioInventado;
  const tabelas = {};
  const entradas = [];
  for (const [nome, pino] of Object.entries(v.tabelas)) {
    const tabela = await garantirTabela(path.join(rootDirectory, '.cache', 'relevo', 'fontes'), pino);
    tabelas[nome] = tabela.texto;
    entradas.push([tabela.sha256, pino.arquivo]);
  }
  const arquivoDaFonte = path.join(rootDirectory, 'scripts', 'data', 'atlas', 'fonte', `${id}-lado-de-tras.json`);
  const bytesDaFonte = await readFile(arquivoDaFonte);
  const fonte = JSON.parse(bytesDaFonte.toString('utf8'));
  const crus = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
  entradas.unshift(
    [sha256(crus(grade.metros)), 'as alturas (o cache, metros)'],
    [sha256(crus(grade.vazio)), 'a máscara do vazio (o cache, vazio)'],
    [sha256(await readFile(mapaDeCor)), path.relative(rootDirectory, mapaDeCor)],
    [sha256(bytesDaFonte), path.relative(rootDirectory, arquivoDaFonte)]
  );
  console.log(
    `versões: node ${process.version}, V8 ${process.versions.v8}, ` +
      `sharp ${sharp.versions.sharp}, libvips ${sharp.versions.vips}`
  );
  console.log('sha256 das entradas:');
  for (const [hash, nome] of entradas) console.log(`  ${hash}  ${nome}`);

  const t0 = Date.now();
  const segundos = () => `${Math.round((Date.now() - t0) / 1000)} s`;
  const { rgb, chave, relatorio } = inventaRelevoDoCorpo({
    id,
    grade,
    fonte,
    tabelas,
    semente: v.semente,
    opcoes: { registra: (m) => console.log(`  [${segundos()}] ${m}`) },
  });
  console.log(
    `relevo inventado: escolhas "${chave}", semente ${v.semente}, ` +
      `${relatorio.naoFinitos} valores não finitos, ${segundos()}.`
  );
  console.log('calibração (núcleo de cada unidade no vazio contra o medido nas regiões-fonte dela):');
  for (const [quando, lista] of [['antes', relatorio.antes], ['depois', relatorio.depois]]) {
    for (const m of lista ?? []) {
      console.log(
        `  ${quando} ${m.id}: ` +
          (m.semNucleo
            ? 'sem núcleo'
            : `inclinação RMS ${m.rmsGraus.toFixed(2)}° / alvo ${m.rmsAlvo.toFixed(2)}° = ` +
              `${m.razaoRms.toFixed(3)}; S(d) até 30 km ${m.razaoSMin.toFixed(2)}–${m.razaoSMax.toFixed(2)} do alvo`)
      );
    }
  }
  if (relatorio.escalasDaColcha) {
    console.log(
      `  colcha reescalada: ${JSON.stringify(relatorio.escalasDaColcha)}; ` +
        `meio da colcha: ${JSON.stringify(relatorio.escalasDoMeioDaColcha)}`
    );
  }

  const { largura, altura } = grade;
  const png = await sharp(rgb, { raw: { width: largura, height: altura, channels: 3 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  if (info.width !== largura || info.height !== altura || info.channels !== 3) {
    throw new Error(`o PNG decodificado saiu ${info.width}x${info.height}x${info.channels} — não gravo.`);
  }
  const decisao = decideGravacao({
    nome: corpo.nome, chave, sha256: sha256(data), aprovados: v.sha256Aprovado,
  });
  if (!decisao.grava) throw new Error(decisao.mensagem);
  console.log(decisao.mensagem);
  return { rgb, ...relatorio.normais, lisos: 0, png };
}

// ------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const manter = argv.includes('--manter');
  const varredura = argv.includes('--varredura');
  const rede = argv.includes('--rede');
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

  // Encélado: o DEM inteiro do arquivo local, altura e normal (ver o cabeçalho)
  if (corpo.fonte.tipo === 'tif-local') {
    await assaDoDemLocal(corpo, destino, mapaDeCor, { varredura, caminhoDado });
    console.log(
      `agora: node scripts/data/atlas/otimiza-texturas.mjs ${corpo.diretorio} && ` +
        'node scripts/data/atlas/gera-manifest-texturas.mjs'
    );
    return;
  }

  // o cache das alturas (ver o cabeçalho): achado e conferido, dispensa a rede
  const dirDoCache = path.join(rootDirectory, '.cache', 'relevo');
  const nomeDoCache = `${corpo.diretorio}-${LARGURA_ALVO}`;
  const caminhoDoCache = path.relative(rootDirectory, path.join(dirDoCache, nomeDoCache));
  const giroGraus =
    (((LONGITUDE_ESQUERDA_DA_CASA - corpo.longitudeDaBordaEsquerdaGraus) % 360) + 360) % 360;
  const cache =
    corpo.cacheDeAlturas && !rede ? await lerCacheDeAlturas(dirDoCache, nomeDoCache) : null;
  if (cache) {
    const c = cache.cabecalho;
    if (
      c.fonte?.url !== corpo.fonte.url ||
      c.linhasPorSaida !== corpo.fonte.linhasPorSaida ||
      c.larguraAlvo !== LARGURA_ALVO ||
      c.larguraDaGuarda !== LARGURA_DA_GUARDA ||
      c.giroGraus !== giroGraus ||
      c.conversao?.offsetDoDado !== corpo.offsetDoDado ||
      c.conversao?.metrosPorUnidade !== corpo.metrosPorUnidade ||
      c.conversao?.semDado !== corpo.fonte.semDado
    ) {
      throw new Error('cache de outra fonte ou de outro filtro — rode com --rede');
    }
  }

  const contexto = {
    offset: corpo.offsetDoDado,
    escala: corpo.metrosPorUnidade,
    lidos: 0,
  };
  let baixado = false;

  if (cache) {
    console.log(`alturas do cache: ${caminhoDoCache} (gravado em ${cache.cabecalho.criadoEm})`);
  } else if (corpo.fonte.tipo === 'tif-por-faixas') {
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

  const largura = LARGURA_ALVO;
  const altura = LARGURA_ALVO / 2;
  // o que `assaNormais` consome: alturas e máscara do vazio JÁ na orientação da casa
  let metrosDaCasa;
  let vazioDaCasa;
  if (cache) {
    // a guarda reroda sobre a MESMA grade de 720 que o cache guardou
    const { metros, vazio, guarda } = cache.partes;
    await guardaDeAlinhamento(
      corpo,
      { metros: guarda, largura: LARGURA_DA_GUARDA, altura: LARGURA_DA_GUARDA / 2 },
      mapaDeCor,
      varredura
    );
    metrosDaCasa = metros;
    vazioDaCasa = vazio;
  } else {
    // ---- a guarda de alinhamento, ANTES de assar 8 milhões de pixels
    const gradeDaGuarda = await lerAlturaEmMetros(corpo, contexto, LARGURA_DA_GUARDA);
    await guardaDeAlinhamento(corpo, gradeDaGuarda, mapaDeCor, varredura);

    const grade = await lerAlturaEmMetros(corpo, contexto, LARGURA_ALVO);
    metrosDaCasa = orientar(corpo, grade);
    vazioDaCasa = corpo.vazioInventado ? orientar(corpo, grade, 0, grade.vazio) : undefined;
    if (corpo.cacheDeAlturas) {
      const { tif } = contexto;
      await gravarCacheDeAlturas(
        dirDoCache,
        nomeDoCache,
        {
          corpo: id,
          fonte: { url: corpo.fonte.url, nome: corpo.fonte.nome },
          origem: {
            largura: tif.largura,
            altura: tif.altura,
            bytesPorAmostra: tif.bytesPorAmostra,
          },
          linhasPorSaida: corpo.fonte.linhasPorSaida,
          conversao: {
            offsetDoDado: corpo.offsetDoDado,
            metrosPorUnidade: corpo.metrosPorUnidade,
            semDado: corpo.fonte.semDado,
          },
          larguraAlvo: LARGURA_ALVO,
          alturaAlvo: LARGURA_ALVO / 2,
          larguraDaGuarda: LARGURA_DA_GUARDA,
          giroGraus,
          orientacao: { metros: 'casa', vazio: 'casa', guarda: 'fonte' },
          criadoEm: new Date().toISOString(),
        },
        { metros: metrosDaCasa, vazio: vazioDaCasa, guarda: gradeDaGuarda.metros }
      );
      console.log(`cache gravado: ${caminhoDoCache}`);
    }
  }
  // Plutão e Caronte: o vazio ganha o relevo inventado, e o mapa passa pelo portão
  const assado = corpo.vazioInventado
    ? await assaOVazioInventado(
      id,
      corpo,
      { metros: metrosDaCasa, vazio: vazioDaCasa, largura, altura, raioM: raioDoPassoM(corpo) },
      mapaDeCor
    )
    : assaNormais(metrosDaCasa, largura, altura, raioDoPassoM(corpo), vazioDaCasa);
  const { rgb, rmsGraus, maxGraus, lisos } = assado;
  console.log(
    `inclinação: RMS ${rmsGraus.toFixed(2)}°, máxima ${maxGraus.toFixed(2)}° ` +
      '(amplitude FÍSICA, ganho 1,0 — nenhum exagero entra aqui)' +
      (lisos
        ? `, medida só onde há dado: ${lisos} texels ` +
          `(${((100 * lisos) / (largura * altura)).toFixed(1)} %) saem lisos — ` +
          'o vazio e o anel de um texel em volta dele.'
        : '.')
  );

  await mkdir(destino, { recursive: true });
  const saida = path.join(destino, 'normal.png');
  if (assado.png) {
    // o PNG que passou pelo portão, byte a byte
    await writeFile(saida, assado.png);
  } else {
    await sharp(rgb, { raw: { width: largura, height: altura, channels: 3 } })
      .png({ compressionLevel: 9, adaptiveFiltering: false })
      .toFile(saida);
  }
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
