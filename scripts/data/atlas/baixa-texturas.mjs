#!/usr/bin/env node

// ============================================================
// Baixa as texturas-FONTE do atlas para public/textures/atlas/
// — o procedimento de download vendorizado do doador
// (atlas-orbital: download-textures.js + bake-earth-pbr.js) com
// os QUATRO defeitos conhecidos consertados (checklist pré-fusão
// item 15, todos vivos no doador até hoje):
//
//   1. Status HTTP checado ANTES de abrir o write-stream — no
//      doador um 404 deixava arquivo de 0 bytes em silêncio.
//   2. `close()` com callback antes do resolve — sem isso o
//      caller pode ler o arquivo antes de o SO drenar o buffer.
//   3. unlink do parcial em TODA falha (response, stream e
//      request) — nunca sobra meio-arquivo parecendo textura.
//   4. Handler de error na RESPONSE e no STREAM — o doador só
//      ouvia o request; um reset no meio do corpo vazava.
//
// E mais um, do item 13: redirects com LIMITE e allowlist de
// host (o doador seguia redirect para qualquer lugar).
//
// FONTES POR URL (a licença de cada entrada vive no manifest,
// gera-manifest-texturas.mjs; aqui é o procedimento):
//   - Solar System Scope — https://www.solarsystemscope.com/textures/
//     (CC BY 4.0; daymap/clouds/nightmap/moon vêm de
//     .../textures/download/<arquivo>).
//   - Roughness da Terra — via WAYBACK MACHINE (checklist item
//     14): o host canônico responde 403 a User-Agent não-browser;
//     o TIFF especular sai de web.archive.org e o bake converte
//     para jpg. ATENÇÃO: o roughness é o ESPECULAR INVERTIDO
//     (negate) — o SSS pinta oceano CLARO (=reflexivo) e o
//     roughnessMap do three espera 0=espelho; copiar sem inverter
//     dá oceano fosco e continente espelhado, plausível e errado.
//     A normal do SSS saiu em 07/10/2026: a da Terra nasce nesta
//     casa do relevo medido (ver `relevoTerra`, abaixo).
//   - NOAA NCEI — o ETOPO 2022 (doi 10.25921/fd45-gt74, CC0), a
//     grade de 60″ da superfície, que entra pelo CACHE conferida
//     por sha256 (`.cache/terra/FONTES.json`).
//   - NASA 3D resources — https://science.nasa.gov/3d-resources/
//     (fases futuras: Deimos etc.; nenhuma entrada nesta rodada).
//   - Projeto Saturn do dono — https://github.com/fgferre/Saturn
//     (item 138): os mosaicos globais Cassini de Paul Schenk
//     (PIA18434–18439, NASA/JPL-Caltech/SSI/LPI, domínio público)
//     graduados por ele, MAIS os mapas de altura/normal das mesmas
//     seis (item 134/S2, `public/textures/relief/<lua>_<canal>.png`) —
//     menos os de Jápeto (item 230) e os de Reia (PLAN-REIA.md), que
//     nascem nesta casa (ver `relevoJapeto` e `relevoReia`, abaixo). São
//     CATORZE entradas, e o `--offline` delas quer o diretório do
//     SATURN, não o do atlas-orbital: os mosaicos são
//     `public/textures/<lua>.jpg`. Todas levam
//     `giroDeLongitudeGraus: 180` — o layout Schenk põe o sub-Saturno
//     na emenda e a casa o põe no meio (a meia volta do item 138). A
//     proveniência de cada modelo mora em docs/reference/ASSETS.md.
//     Mesma família, item 141 (3ª fase): o mapa de cor de VESTA é o
//     mosaico da Dawn do modelo 3D da NASA GIRADO 150° para a IAU — o
//     produto original está no sistema "Claudia" com que a sonda operou,
//     e a casa orienta Vesta pelo outro.
//   - USGS Astrogeology — https://astrogeology.usgs.gov/ (bytes em
//     asc-pds-services.s3…, o mesmo host de onde `gera-normal-de-dem.mjs`
//     lê os DEMs). Entrou no item 141 (3ª fase) com o mosaico global da
//     Dawn para CERES, que substitui o `2k_ceres_fictional` do SSS — a
//     única textura da casa cuja própria fonte se declarava inventada.
//     Voltou no item 149 com o mosaico global de 300 m de CARONTE
//     (New Horizons, LORRI+MVIC, julho de 2017), e no item 230 com o de
//     500 m de EUROPA (Voyager–Galileo), que entra pelo CACHE (ver
//     `arquivoDoCache`). Pendente: o mosaico de Titã da bancada; crédito
//     redigido ANTES de qualquer promoção — docs/reference/ASSETS.md.
//   - NASA Photojournal — https://science.nasa.gov/photojournal/ (bytes
//     em assets.science.nasa.gov). Entrou no item 149 com o PIA11707, o
//     mapa global EM COR de PLUTÃO da Ralph/MVIC: é o único produto de
//     cor do sobrevoo de 2015 em cilíndrica simples, e o mosaico de
//     300 m do USGS, mais fino, é pancromático.
//
// MODO OFFLINE (o desta rodada): `--offline <dir-do-doador>`
// copia os MESMOS arquivos do doador local, ARQUIVO A ARQUIVO
// pela tabela FONTES — nunca a pasta em bloco, porque a pasta do
// doador carrega 90+ texturas de proveniência desigual e o que
// entra na casa é exatamente o que o manifest documenta. No modo
// offline os bytes são idênticos aos do doador (o PBR copia o jpg
// JÁ assado pelo bake de lá); no modo online o bake reencoda e os
// bytes mudam — o manifest re-mede sha/dimensões de qualquer
// forma, então os dois modos são igualmente auditáveis.
//
// Toda aquisição termina com validação por DECODIFICAÇÃO (sharp
// lê metadados): página de erro HTML salva como .jpg morre aqui,
// não três meses depois no navegador.
//
// A COR INVENTADA DE PLUTÃO E CARONTE (PLAN-COR.md, 02/10/2026): nas
// duas entradas com `corInventada`, o sul nunca fotografado e o lado de
// trás borrado saem de `inventaCorDoCorpo` (`cor-inventada.mjs`), a MESMA
// função das prévias que o dono escolhe por foto, e o map.jpg só é
// gravado se o sha256 do RGB dela for o aprovado — o PORTÃO, como o do
// relevo inventado em `gera-normal-de-dem.mjs` (ver `girarMapa`).
//
// A COR DE EUROPA (PLAN-EUROPA-JAPETO.md, item 230): a entrada com
// `corEuropa` lê o mosaico USGS de 500 m do cache (`arquivoDoCache`,
// conferido por sha256), reduz por média de área, dá a meia volta e pinta
// pela MESMA `corDeEuropa` (`cor-europa.mjs`) da prévia; o map.jpg só é
// gravado se o sha256 do RGB for o aprovado (`portaoDaCor`).
//
// O RELEVO DE JÁPETO (PLAN-EUROPA-JAPETO.md, item 230): as entradas
// `iapetus/height` e `iapetus/normal` não adquirem nada — o mapa de altura
// e o de normais saem do gerador `relevo-japeto.mjs` (crista do Gazetteer
// traçada na foto, crateras com nome e crateras detectadas no mapa de cor
// por `crateras-pela-foto.mjs`), pela MESMA sequência de chamadas da
// prévia, a partir do map.jpg da casa e do Gazetteer do cache, os dois
// conferidos por sha256. O PORTÃO aprova o CONJUNTO (`portaoDoRelevo`):
// altura, normal e os números (escala, viés, semente, leis), e a escala e o
// viés de `rochoso.ts` têm de ser os do candidato — senão nada é gravado.
//
// O RELEVO DE REIA (PLAN-REIA.md, etapa F): as entradas `rhea/height` e
// `rhea/normal` também não adquirem nada — saem do gerador `relevo-reia.mjs`
// pela MESMA sequência de chamadas da prévia (`previa-reia.mjs`): a BASE é o
// modelo de forma da Cassini (Weirich et al. 2025, o TIFF do cache conferido
// por sha256) e, por cima, as crateras finas detectadas no map.jpg da casa
// (pinado), completadas pela lei. O mesmo portão do conjunto, e os DOIS
// canais são gravados juntos pela primeira das duas entradas que a corrida
// encontra (`gravaRelevoDeReia`): nunca a altura de uma versão com a normal
// de outra.
//
// O RELEVO DA TERRA (07/10/2026; refeito no item 232, 08/10/2026,
// capturas/efeitos-timidos/relevo/): as entradas `earth/normal`,
// `earth/horizon` e `earth/horizon2` não adquirem nada — saem do gerador
// `relevo-terra.mjs` pela MESMA conta dos candidatos que ele aprovou pelas
// fotos: o ETOPO 2022 do cache (conferido por sha256), a água como
// espelho, e da grade FINA da fonte a normal em 8192 (a média de área do
// gradiente de cada célula) e o horizonte em 4096 (a marcha em cada
// amostra fina, a média do seno por célula; perto de dez minutos em oito
// fios). O mesmo portão do conjunto (os três canais e os números) e os TRÊS
// gravados juntos pela primeira das entradas que a corrida encontra
// (`gravaRelevoDaTerra`).
//
// ESCOPO OPCIONAL (o mesmo do otimiza-texturas): sem corpo nomeado, a
// tabela inteira; com corpos, só eles; com `corpo/canal`, só aquele canal
// (o relevo de Jápeto, o de Reia ou o da Terra sem refazer os mapas de cor;
// os do Saturn pedem `--offline`).
//
//   node scripts/data/atlas/baixa-texturas.mjs --offline ~/Github/atlas-orbital
//   node scripts/data/atlas/baixa-texturas.mjs            (rede, reprodutibilidade)
//   node scripts/data/atlas/baixa-texturas.mjs --offline ~/Github/atlas-orbital ceres vesta
//   node scripts/data/atlas/baixa-texturas.mjs iapetus/height iapetus/normal
//   node scripts/data/atlas/baixa-texturas.mjs rhea/height rhea/normal
//   node scripts/data/atlas/baixa-texturas.mjs earth/normal earth/horizon earth/horizon2
// ============================================================

import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { Y_MEDIO_ALVO, corDeEuropa, reduzPorMediaDeArea } from './cor-europa.mjs';
import { inventaCorDoCorpo } from './cor-inventada.mjs';
import { PARAMETROS_DA_DETECCAO, detectaCrateras, luminanciaDoRgb } from './crateras-pela-foto.mjs';
import { decideGravacao, lerCacheDeAlturas } from './gera-normal-de-dem.mjs';
import {
  CANAIS_DE_DADO, giraColunasDeImagem, hostPermitido, preencherVazioSemDado,
} from './lib-texturas.mjs';
import {
  CRISTA_DO_GAZETTEER, ESCOLHAS_DA_CRISTA, FAIXA_KM, FREQUENCIA_DOS_PERFIS, MONTES_DO_GAZETTEER,
  MORFOLOGIA_DAS_COM_NOME, MORFOLOGIA_DAS_DETECTADAS, RAIO_KM, RAREAMENTO_POR_LATITUDE, caminhoDaCristaPeloMapa,
  escalaEVies, geraRelevo, normalDoCampo, quantiza,
} from './relevo-japeto.mjs';
import * as Reia from './relevo-reia.mjs';
import * as Terra from './relevo-terra.mjs';

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
);
const destinoRaiz = path.join(rootDirectory, 'public', 'textures', 'atlas');

const SSS = 'https://www.solarsystemscope.com/textures/download';
// Snapshots Wayback herdados do bake-earth-pbr.js do doador (item 14).
const WAYBACK = 'https://web.archive.org/web';
// O host de BYTES do USGS Astrogeology (a página do produto mora em
// astrogeology.usgs.gov; os arquivos saem daqui) — o mesmo de onde
// `gera-normal-de-dem.mjs` lê os DEMs.
const USGS_BYTES = 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic';

// O RELEVO APROVADO DE JÁPETO, que as duas entradas `iapetus/height` e
// `iapetus/normal` dividem (um conjunto só: as duas gravam ou nenhuma).
// `candidato` é a pasta da prévia que ele escolheu, com o `parametros.json`
// que o portão confronta; `mapaDeCor` e `gazetteer` são as entradas do
// gerador, pinadas por sha256 (outro map.jpg daria outra crista e outras
// crateras); `sha256Aprovado`: os pixels decodificados da altura (1 canal),
// o RGB da normal e o JSON canônico dos números (`numerosDoRelevoDeJapeto`).
const RELEVO_DE_JAPETO = {
  candidato: 'capturas/europa-japeto/j1c/b-20km',
  semente: 230,
  alturaMaximaKm: 20,
  mapaDeCor: {
    arquivo: 'public/textures/atlas/iapetus/map.jpg',
    sha256: '104a1d8780e0d8dad58c2d617ed554680774cefdb65cce8f2149d1c7886468fb',
  },
  gazetteer: {
    arquivo: '.cache/japeto/iapetus-gazetteer.json',
    sha256: '425c9fc6eb806e81a42b49c8b7abf1548b6356066606d56a400ee3fb8433af1f',
  },
  sha256Aprovado: {
    height: 'f52c3753fbec8431fedd7c2b338c3c03d6b4ae0d6daf2bd962bb03c17d528b2f',
    normal: '86ae58035a9594e87c18a00c156a7b7338133cd43fc538f954fa47dd222f72b0',
    parametros: '4cf4ccf3375e677cef80a9a3fe003b3741710dd10fc6b872505e8857d75ddf11',
  },
};

// O RELEVO APROVADO DE REIA (PLAN-REIA.md, etapa F), que `rhea/height` e
// `rhea/normal` dividem. `candidato`: a pasta da prévia (`previa-reia.mjs`,
// passada R2b) com o `parametros.json` que o portão confronta — A, `…/a-1024`
// (1024×512), ou B, `…/b-2048` (2048×1024); `largura`/`altura`: a grade dele (outra
// grade, outros números: o portão recusa). `dtm`: o modelo de forma da
// Cassini no cache (o sha256 de `.cache/reia/FONTES.json`); `mapaDeCor`: de
// onde saem as crateras finas (outro mapa, outras crateras); os dois
// pinados. `sha256Aprovado`: os pixels da altura (1 canal), o RGB da normal e
// o JSON canônico dos números (`numerosDoRelevoDeReia`).
const RELEVO_DE_REIA = {
  candidato: 'capturas/reia/r2b/a-1024',
  largura: 1024,
  altura: 512,
  dtm: {
    arquivo: '.cache/reia/rhea_radius_g.tif',
    sha256: 'a4d49eb12bfe5c0d97513d3d4692c78c7b5dd7179f8c2097203a37a4834bb51d',
  },
  mapaDeCor: {
    arquivo: 'public/textures/atlas/rhea/map.jpg',
    sha256: 'be6556d01ce5d02fca72895e72e45d591833b19345c9e96b554a52b82ebf0212',
  },
  sha256Aprovado: {
    height: 'e30720c34adc452428fcfeee19ec2cd345637f0ee64be5e4d50ce83bf4d097e1',
    normal: '7cf17052d9b4aa32fe420679ab68601bdc87b2eb76bfc4f15d6c43f152205d4e',
    parametros: '92db84afa13152a98e6476bb1042ba3ee77ab854b34b8fb800918f3b4c1078cb',
  },
};

// O RELEVO APROVADO DA TERRA (item 232, 08/10/2026, pelas fotos "hoje ×
// depois" de `capturas/efeitos-timidos/juntos/`: a normal N2 e o horizonte
// H1), que `earth/normal`, `earth/horizon` e `earth/horizon2` dividem.
// `candidato`: a pasta dos candidatos, com o `parametros.json` que o portão
// confronta; `etopo`: o ETOPO 2022 no cache (o sha256 de
// `.cache/terra/FONTES.json`), pinado; as grades são as do gerador
// (`Terra.NORMAL`, `Terra.HORIZONTE`). `sha256Aprovado`: o RGB de cada um
// dos três canais e o JSON canônico dos números (`numerosDoRelevoDaTerra`).
// O conjunto de 07/10 (capturas/terra-nuvens/relevo/) volta pelo git.
const RELEVO_DA_TERRA = {
  candidato: 'capturas/efeitos-timidos/relevo',
  etopo: {
    arquivo: '.cache/terra/ETOPO_2022_v1_60s_N90W180_surface.tif',
    sha256: '9d27d4b8ea8e76977e2988bca667d7c8fa68b927355feffcddd6b4875a7fd08e',
  },
  sha256Aprovado: {
    normal: 'b664651ad295d2000e5b0e7186b67d0e21ab629435ece41ee748500a6e29d441',
    horizon: 'd2a6697620f525a15bc1c34f8d374d5cbeb5322f4937fb6f212a58bc4cb14753',
    horizon2: 'eba55c85dc54e3635ca8fb1687e18b56a303b5a0dd75b43e9032e2e2b98a8969',
    parametros: 'a80b463f1edbeedabe939e8522516b07fd0b5887f43d286263abcae2280344a7',
  },
};

// ---- A tabela de fontes desta rodada (F2a: Terra + Lua). As fases
// seguintes fazem APPEND aqui — uma linha por arquivo, com a URL de
// reprodutibilidade e o nome que o arquivo tem no doador local.
// `bake` marca as entradas cujo caminho online baixa um TIFF e assa
// (roughness: grayscale + NEGATE — a inversão do item 14); no offline
// elas copiam o jpg já assado do doador.
// Exportada para a prova de que a cadeia reproduz uma prévia aprovada.
export const FONTES = [
  {
    corpo: 'earth',
    canal: 'map',
    url: `${SSS}/8k_earth_daymap.jpg`,
    nomeNoDoador: '8k_earth_daymap.jpg',
  },
  {
    corpo: 'earth',
    canal: 'clouds',
    url: `${SSS}/8k_earth_clouds.jpg`,
    nomeNoDoador: '8k_earth_clouds.jpg',
  },
  {
    corpo: 'earth',
    canal: 'night',
    url: `${SSS}/8k_earth_nightmap.jpg`,
    nomeNoDoador: '8k_earth_nightmap.jpg',
  },
  // O RELEVO MEDIDO DA TERRA (07/10/2026; da grade fina desde o item 232):
  // a normal artística do SSS (`8k_earth_normal_map`) saiu; a normal e os
  // dois mapas de horizonte saem do gerador `relevo-terra.mjs`
  // (`relevoDaTerra`) a partir do ETOPO 2022 do cache, na grade e na
  // convenção da casa, sem giro. A url é a do ETOPO, que entra pelo cache.
  ...['normal', 'horizon', 'horizon2'].map((canal) => ({
    corpo: 'earth',
    canal,
    url: Terra.ETOPO.url,
    relevoTerra: RELEVO_DA_TERRA,
  })),
  {
    corpo: 'earth',
    canal: 'roughness',
    url: `${WAYBACK}/2025/https://www.solarsystemscope.com/textures/download/8k_earth_specular_map.tif`,
    nomeNoDoador: '8k_earth_roughness_map.jpg',
    bake: 'roughness',
  },
  {
    corpo: 'moon',
    canal: 'map',
    url: `${SSS}/8k_moon.jpg`,
    nomeNoDoador: '8k_moon.jpg',
  },
  // ---- F3 (rochosos). Vênus entra pelo TOPO DE NUVENS — é o que se
  // vê do espaço; a superfície de radar (8k_venus_surface) NÃO entra:
  // renderizá-la sob uma casca translúcida fingiria transparência que
  // a atmosfera real não tem (dito no commit da fase).
  {
    corpo: 'mercury',
    canal: 'map',
    url: `${SSS}/8k_mercury.jpg`,
    nomeNoDoador: '8k_mercury.jpg',
  },
  {
    corpo: 'venus',
    canal: 'map',
    url: `${SSS}/4k_venus_atmosphere.jpg`,
    nomeNoDoador: '4k_venus_atmosphere.jpg',
  },
  {
    corpo: 'mars',
    canal: 'map',
    url: `${SSS}/8k_mars.jpg`,
    nomeNoDoador: '8k_mars.jpg',
  },
  {
    corpo: 'phobos',
    canal: 'map',
    url: 'https://science.nasa.gov/resource/phobos-mars-moon-3d-model/',
    nomeNoDoador: 'phobos_nasa_3d_resource.jpg',
  },
  {
    corpo: 'deimos',
    canal: 'map',
    url: 'https://science.nasa.gov/resource/deimos-mars-moon-3d-model/',
    nomeNoDoador: 'deimos_nasa_3d_resource.jpg',
  },
  // ---- F4 (gigantes). SSS CC BY 4.0, a mesma linha Terra/Lua/
  // Mercúrio. Urano/Netuno entram pelo incumbente 2k (não há 8k SSS).
  // Júpiteres sem licença clara no doador (jupiter_vgr1_2025.jpg etc.)
  // NÃO entram.
  {
    corpo: 'jupiter',
    canal: 'map',
    url: `${SSS}/8k_jupiter.jpg`,
    nomeNoDoador: '8k_jupiter.jpg',
  },
  {
    corpo: 'saturn',
    canal: 'map',
    url: `${SSS}/8k_saturn.jpg`,
    nomeNoDoador: '8k_saturn.jpg',
  },
  {
    corpo: 'uranus',
    canal: 'map',
    url: `${SSS}/2k_uranus.jpg`,
    nomeNoDoador: '2k_uranus.jpg',
  },
  {
    corpo: 'neptune',
    canal: 'map',
    url: `${SSS}/2k_neptune.jpg`,
    nomeNoDoador: '2k_neptune.jpg',
  },
  // ---- F5 (luas em lote). NASA 3D Resources, a mesma linha
  // Fobos/Deimos: crédito NASA/JPL-Caltech redigido. Os 2k_titan /
  // 2k_europa do doador NÃO entram (licença não documentada). O mosaico
  // Cassini de Titã fica de fora (bancada: monocromático com costuras —
  // pendência nomeada, não promoção). Titã NASA 3D tem 49 KB (720×360):
  // o piso de 50 KB da tabela cederia um falso-negativo.
  {
    corpo: 'io',
    canal: 'map',
    url: 'https://science.nasa.gov/3d-resources/jupiter-io-b/',
    nomeNoDoador: 'io_nasa_3d_resource.jpg',
  },
  // EUROPA (item 230, PLAN-EUROPA-JAPETO.md): o mosaico USGS Voyager–Galileo
  // de 500 m (19631×9816, um canal, 0 = sem dado) no lugar do mapa NASA 3D,
  // que era ele mesmo em cinza, reduzido e esticado. O host não está na
  // allowlist do download, de propósito: a fonte entra pelo CACHE, conferida
  // por sha256; a falta dele ou outro hash param a entrada, que diz de onde
  // baixar.
  // A borda esquerda do mosaico está em 0°E (provado por Pwyll, Tyre e
  // Callanish na etapa E0): giro 180 − 0 = 180. A redução é a média de área
  // só do que tem dado (`reduzPorMediaDeArea`, não o lanczos nem o
  // tapa-buraco por valor), e o sul sem dado é preenchido por coluna dentro
  // de `corDeEuropa`. A palavra dele (07/10/2026, prancha do E0): o tom
  // meio-termo; a receita (a) é a do E1 (candidato `a-meio`).
  {
    corpo: 'europa',
    canal: 'map',
    url: 'https://planetarymaps.usgs.gov/mosaic/Europa_Voyager_GalileoSSI_global_mosaic_500m.tif',
    arquivoDoCache: {
      arquivo: '.cache/europa/Europa_Voyager_GalileoSSI_global_mosaic_500m.tif',
      sha256: 'a323f0c9ccb47d5af9902ea8297fe81f9a9708795645b80801f103c3f7c9a624',
    },
    giroDeLongitudeGraus: 180,
    larguraDoDestino: 4096,
    corEuropa: {
      tom: 'meio',
      sha256Aprovado: {
        'receita:a,tom:meio': '9d2b9b096e366372fdc5ad3ea0235595e400b22a3fd950b89f75752066fb1a0e',
      },
    },
  },
  {
    corpo: 'ganymede',
    canal: 'map',
    url: 'https://science.nasa.gov/3d-resources/',
    nomeNoDoador: 'ganymede_nasa_3d_resource.jpg',
  },
  {
    corpo: 'callisto',
    canal: 'map',
    url: 'https://science.nasa.gov/3d-resources/',
    nomeNoDoador: 'callisto_nasa_3d_resource.jpg',
  },
  // ---- AS SEIS DO PROJETO SATURN (item 138) e o RELEVO delas (item
  // 134/S2). Tudo o que sai de lá — os seis mosaicos e os doze mapas de
  // altura/normal — vem no layout Schenk, com o sub-Saturno na EMENDA; as
  // texturas desta casa são centradas em 0°, ou seja borda esquerda em
  // 180°. Daí `giroDeLongitudeGraus: 180` nas dezoito: é a MEIA VOLTA que
  // o 138 aplicou aos arquivos à mão (`np.roll` de W/2) e que a tabela
  // não declarava — sem ela, reaquirir devolvia o relevo no antípoda do
  // albedo, que foi o defeito daquele item.
  //
  // DECLARADO, e não re-medido: os arquivos que estão na árvore hoje
  // nasceram da aquisição à mão da S2 mais o giro do 138, não deste
  // caminho. As entradas abaixo reconstroem o procedimento (arquivo do
  // doador → meia volta → largura da casa); o sha do manifest é prova dos
  // bytes em disco, não de que este caminho os reproduz byte a byte.
  {
    corpo: 'mimas',
    canal: 'map',
    url: 'https://github.com/fgferre/Saturn',
    nomeNoDoador: 'mimas.jpg',
    giroDeLongitudeGraus: 180,
    // a única cujo mosaico não vem na largura da casa: 6356 px custariam
    // 108 MB de VRAM contra 45, e a 1080 px de disco o 4096 já dá 1,9
    // texel por pixel (ASSETS.md, "alvo de pixels")
    larguraDoDestino: 4096,
  },
  {
    corpo: 'enceladus',
    canal: 'map',
    url: 'https://github.com/fgferre/Saturn',
    nomeNoDoador: 'enceladus.jpg',
    giroDeLongitudeGraus: 180,
  },
  {
    corpo: 'tethys',
    canal: 'map',
    url: 'https://github.com/fgferre/Saturn',
    nomeNoDoador: 'tethys.jpg',
    giroDeLongitudeGraus: 180,
  },
  {
    corpo: 'dione',
    canal: 'map',
    url: 'https://github.com/fgferre/Saturn',
    nomeNoDoador: 'dione.jpg',
    giroDeLongitudeGraus: 180,
  },
  {
    corpo: 'rhea',
    canal: 'map',
    url: 'https://github.com/fgferre/Saturn',
    nomeNoDoador: 'rhea.jpg',
    giroDeLongitudeGraus: 180,
  },
  {
    corpo: 'titan',
    canal: 'map',
    url: 'https://science.nasa.gov/3d-resources/',
    nomeNoDoador: 'titan_nasa_3d_resource.jpg',
    minimoBytes: 40_000,
  },
  {
    corpo: 'iapetus',
    canal: 'map',
    url: 'https://github.com/fgferre/Saturn',
    nomeNoDoador: 'iapetus.jpg',
    giroDeLongitudeGraus: 180,
  },
  // O RELEVO DAS SEIS (item 134/S2): `height` e `normal` de cada uma, em
  // 1024×512 — o mesmo `public/textures/relief/` do projeto Saturn, a
  // mesma meia volta. Encélado é o único que vem em 2048 e desce para a
  // largura da casa. A proveniência de cada modelo (Gaskell, Schenk &
  // McKinnon, Weirich) mora em docs/reference/ASSETS.md e no manifest, não
  // aqui. Jápeto saiu desta lista no item 230 e Reia no PLAN-REIA.md: o
  // relevo das duas nasce nesta casa (logo abaixo).
  ...['mimas', 'enceladus', 'tethys', 'dione'].flatMap((corpo) =>
    ['height', 'normal'].map((canal) => ({
      corpo,
      canal,
      url: 'https://github.com/fgferre/Saturn',
      nomeNoDoador: `relief/${corpo}_${canal}.png`,
      giroDeLongitudeGraus: 180,
      larguraDoDestino: 1024,
    }))
  ),
  // O RELEVO DE JÁPETO (item 230, PLAN-EUROPA-JAPETO.md): não existe DTM
  // público, e o sintético do Saturn punha a crista no antípoda. Os dois
  // canais saem do gerador `relevo-japeto.mjs` (`relevoDeJapeto`), na
  // grade e na convenção da casa — sem giro: a coluna i já cai em
  // (180 + (i+½)·360/W) °E, e o mapa de cor de onde saem o caminho da crista
  // e as crateras detectadas é o map.jpg da casa, já girado. A palavra dele
  // (07/10/2026, prancha da J1): a crista de vinte quilômetros, candidato B —
  // o da passada J1c (crateras da foto, com nome gastas, detectadas rareadas
  // acima de 45°), em `RELEVO_DE_JAPETO`.
  ...['height', 'normal'].map((canal) => ({
    corpo: 'iapetus',
    canal,
    url: 'https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/IAPETUS_nomenclature_center_pts.zip',
    relevoJapeto: RELEVO_DE_JAPETO,
  })),
  // O RELEVO DE REIA (PLAN-REIA.md, etapa F): o sintético do Saturn não
  // acertava nem Mamaldi nem Tirawa, e Reia TEM modelo de forma público. Os
  // dois canais saem do gerador `relevo-reia.mjs` (`relevoDeReia`): o DTM da
  // Cassini (Weirich et al. 2025) como base, medido, e as crateras finas que
  // a foto mostra e ele não resolve, completadas pela lei; na grade e na
  // convenção da casa, sem giro (a meia volta do DTM está no gerador). A url
  // é a do DTM, que entra pelo cache.
  ...['height', 'normal'].map((canal) => ({
    corpo: 'rhea',
    canal,
    url: Reia.DTM.url,
    relevoReia: RELEVO_DE_REIA,
  })),
  // ---- As cinco de Urano e Tritão (itens 147/148): a Voyager 2 só viu o
  // hemisfério sul das cinco (1986) e ~40 % de Tritão (1989); a NASA 3D
  // deixa o resto PRETO, e em 2026 o Sol ilumina o norte de Urano — a lua
  // saía como disco preto no lado do dia. Por decisão dele (148: "não quero
  // montagem, use a que gerei"), o mapa INTEIRO de cada uma é a imagem
  // gerada por IA na conta dele a partir de uma AMOSTRA com o vazio em tom
  // liso (`amostra-para-ia.mjs`): Miranda do mapa NASA 3D, as outras quatro
  // dos mosaicos de Schenk (LPI, 2020), Tritão do mapa NASA/LPI de 600 m.
  // Fontes LOCAIS guardadas no repositório; a ficha confessa que nada é
  // medida.
  {
    corpo: 'miranda',
    canal: 'map',
    url: 'https://science.nasa.gov/3d-resources/',
    arquivoLocal: 'fonte/miranda-ia.png',
  },
  {
    corpo: 'ariel',
    canal: 'map',
    url: 'https://hdl.handle.net/20.500.11753/1687',
    arquivoLocal: 'fonte/ariel-ia.png',
  },
  {
    corpo: 'umbriel',
    canal: 'map',
    url: 'https://hdl.handle.net/20.500.11753/1687',
    arquivoLocal: 'fonte/umbriel-ia.png',
  },
  {
    corpo: 'titania',
    canal: 'map',
    url: 'https://hdl.handle.net/20.500.11753/1687',
    arquivoLocal: 'fonte/titania-ia.png',
  },
  {
    corpo: 'oberon',
    canal: 'map',
    url: 'https://hdl.handle.net/20.500.11753/1687',
    arquivoLocal: 'fonte/oberon-ia.png',
  },
  {
    corpo: 'triton',
    canal: 'map',
    url: 'https://science.nasa.gov/photojournal/map-of-triton',
    arquivoLocal: 'fonte/triton-ia.png',
  },
  // ---- F6 (anões). Plutão e Caronte: os mosaicos globais da New Horizons
  // (item 149) no lugar dos mapas NASA 3D de 720×360, que eram ANTERIORES
  // ao sobrevoo de 2015 — não traziam a Sputnik Planitia nem a Mordor
  // Macula, e correlacionam 0,31 e 0,09 com os mosaicos reais: não havia
  // geografia neles. É a mesma figura do `2k_ceres_fictional`, com a
  // diferença de que estes não confessavam. Ceres: o mosaico REAL da Dawn
  // (item 141, 3ª fase). Haumea/Makemake/Eris/Quaoar NÃO baixam mapa
  // (procedurais).
  //
  // O SUL DOS DOIS NÃO FOI FOTOGRAFADO: no sobrevoo o polo sul do sistema
  // estava em noite polar, e os mosaicos deixam a calota em preto puro —
  // daí `preencherVazio` (a receita do item 147, tom médio liso, sem
  // esticar o nível), confessado na ficha. Desde a rodada da cor
  // (PLAN-COR.md), o tapa-buraco é só o passo de antes: `corInventada`
  // refaz o sul e o lado de trás borrado com a semente e a variante das
  // prévias, e `sha256Aprovado` sem a chave das escolhas (`sul:1,borrado:1`)
  // = ainda não aprovado: o gerador imprime o hash e não grava. Desde a
  // rodada da sombra (PLAN-SOMBRA.md), `semSombra` tira a sombra assada das
  // fotos e a do inventado, e a chave é `sul:1,borrado:1,sombra:1`.
  {
    corpo: 'pluto',
    canal: 'map',
    // PIA11707, o mapa global EM COR da Ralph/MVIC (5926×2963). O layout é
    // o mesmo do mosaico USGS de 300 m, que é georreferenciado e declara
    // meridiano central 180° (geokey 3088) — medido, os dois casam na
    // IDENTIDADE com giro 0 e r = 0,981. Borda esquerda em 0°E, então o
    // giro para a convenção da casa (borda em 180°) é 180 − 0 = 180.
    url: 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia11/pia11707/PIA11707.tif',
    giroDeLongitudeGraus: 180,
    preencherVazio: true,
    // a palavra do dono (02/10/2026, prancha das três opções): a variante
    // "serena", que vale também como o grau de mosqueado do lado de trás
    // a palavra dele (02/10/2026, por prancha): o sul na variante "serena" e o
    // lado de trás com o detalhe fino refeito — o candidato M1+M2 fotografado
    // a palavra dele (03/10/2026, por prancha, PLAN-SOMBRA.md): "aprovado, tira a
    // sombra do sul também" — sem a sombra assada, o candidato v5 fotografado
    corInventada: {
      semente: 20261002,
      variante: 'serena',
      semSombra: true,
      sha256Aprovado: {
        'sul:1,borrado:1,sombra:1': '113d8a42654fb3b2641b131ee62e330269b3e15238e67caecc467ef057312494',
      },
    },
  },
  {
    corpo: 'charon',
    canal: 'map',
    // O mosaico global de 300 m (12693×6347, UM canal): não existe mapa
    // global em cor de Caronte, e inventar matiz aqui seria voltar ao mapa
    // que saiu. O GeoTIFF declara meridiano central 0° (geokey 3088), que
    // JÁ é a convenção da casa — giro 0, e é por isso que o campo aparece
    // com zero em vez de sumir: o zero é medido, não é ausência de exame.
    url: `${USGS_BYTES}/Charon_NewHorizons_Global_Mosaic_300m_Jul2017_8bit.tif`,
    giroDeLongitudeGraus: 0,
    larguraDoDestino: 8192,
    preencherVazio: true,
    // a palavra do dono (02/10/2026, prancha da M1): o sul aprovado, sem
    // variante — e a cor segue cinza: os retalhos vêm do próprio mosaico
    // a palavra dele (02/10/2026, por prancha): o sul aprovado e o lado de
    // trás com o detalhe fino refeito — o candidato M1+M2 fotografado
    // a palavra dele (03/10/2026, por prancha, PLAN-SOMBRA.md): "aprovado, tira a
    // sombra do sul também" — sem a sombra assada, o candidato v5 fotografado
    corInventada: {
      semente: 20261002,
      semSombra: true,
      sha256Aprovado: {
        'sul:1,borrado:1,sombra:1': '4536b08a8e0530efe1ad8d639e2da641c4115eaab9ac797597318f9c9a65b77b',
      },
    },
  },
  {
    corpo: 'ceres',
    canal: 'map',
    url: `${USGS_BYTES}/Ceres_Dawn_FC_DLR_global_20ppd_Oct2015.tif`,
    // sem par no doador: este mosaico nunca passou por ele, então a
    // entrada baixa da fonte também no modo --offline
    bake: 'mosaico-ceres',
  },
  // ---- F7 (asteroides). Vesta: mosaico Dawn embutido no modelo
  // NASA Science (crédito NASA/JPL-Caltech/UCLA/MPS/DLR/IDA). Modelos
  // GLB/OBJ (DAMIT CC BY / NASA) ficam pendentes (sem GLTFLoader/
  // OBJLoader na casa).
  {
    corpo: 'vesta',
    canal: 'map',
    url: 'https://science.nasa.gov/resource/vesta-3d-model/',
    nomeNoDoador: 'vesta_dawn_embedded.png',
    // OS 150° DE VESTA (item 141, 3ª fase). O mosaico do modelo 3D da
    // NASA está no sistema "Claudia" com que a Dawn operou, e a casa
    // orienta Vesta pela IAU (`iauOrientation.ts`, sistema "Claudia
    // Double Prime"): a borda esquerda dele cai em 330°E da IAU, não em
    // 180°. O giro que a põe na convenção da casa é 180 − 330 = −150.
    giroDeLongitudeGraus: -150,
  },
  // ---- Os seis sem foto de superfície (item 151): nenhuma sonda visitou
  // Hígia, Palas, Haumea, Makemake, Éris ou Quaoar. Hígia usava um
  // GRÁFICO científico do ESO/VLT com grade e barra de cores por cima
  // (item 150, errado — não é textura); os outros cinco eram
  // `superficie: 'procedural'` (rochoso.ts). Cada um agora é uma
  // ILUSTRAÇÃO gerada por IA (ChatGPT do dono) a partir dos fatos
  // conhecidos — tamanho, albedo, cor, crateras vistas de longe —, fonte
  // LOCAL (`arquivoLocal`), com o brilho casado ao albedo geométrico pelo
  // bake `ilustracao-ia` (a receita e o ganho de cada corpo moram acima,
  // `ALBEDO_DA_ILUSTRACAO`). `url` é a página da NASA sobre o corpo (ou o
  // JPL Small-Body Database quando não há página dedicada) — não a fonte
  // do mapa, que não existe.
  {
    corpo: 'hygiea',
    canal: 'map',
    url: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=Hygiea',
    arquivoLocal: 'fonte/hygiea-ia.png',
    bake: 'ilustracao-ia',
  },
  {
    corpo: 'pallas',
    canal: 'map',
    url: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=Pallas',
    arquivoLocal: 'fonte/pallas-ia.png',
    bake: 'ilustracao-ia',
  },
  {
    corpo: 'haumea',
    canal: 'map',
    url: 'https://science.nasa.gov/dwarf-planets/haumea/',
    arquivoLocal: 'fonte/haumea-ia.png',
    bake: 'ilustracao-ia',
  },
  {
    corpo: 'makemake',
    canal: 'map',
    url: 'https://science.nasa.gov/dwarf-planets/makemake/',
    arquivoLocal: 'fonte/makemake-ia.png',
    bake: 'ilustracao-ia',
  },
  {
    corpo: 'eris',
    canal: 'map',
    url: 'https://science.nasa.gov/dwarf-planets/eris/',
    arquivoLocal: 'fonte/eris-ia.png',
    bake: 'ilustracao-ia',
  },
  {
    corpo: 'quaoar',
    canal: 'map',
    url: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=Quaoar',
    arquivoLocal: 'fonte/quaoar-ia.png',
    bake: 'ilustracao-ia',
  },
  // ---- Hipérion sai das esculpidas em 23/09/2026 (item 134/S3 → relevo
  // medido): a forma inteira (Cassini, Thomas/Joseph/Ansty 2018) vira mapa
  // de ALTURA, com o mapa de NORMAIS derivado dela — as duas fontes LOCAIS
  // já nascem na convenção da casa (sem giro). A cor é a pintura por IA do
  // dono sobre o relevo medido, como as ilustradas de `ilustracao-ia`.
  {
    corpo: 'hyperion',
    canal: 'map',
    url: 'https://science.nasa.gov/saturn/moons/hyperion/',
    arquivoLocal: 'fonte/hyperion-ia.png',
    bake: 'ilustracao-ia',
  },
  {
    corpo: 'hyperion',
    canal: 'height',
    url: 'https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/data/hyperion_30k_plt.tab',
    arquivoLocal: 'fonte/hyperion-altura.png',
  },
  {
    corpo: 'hyperion',
    canal: 'normal',
    url: 'https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/data/hyperion_30k_plt.tab',
    arquivoLocal: 'fonte/hyperion-normal.png',
  },
  // item 226: o mapa de HORIZONTE (sombra de relevo assada da mesma forma
  // + poços), dois RGB de 3 azimutes cada, sem alfa.
  {
    corpo: 'hyperion',
    canal: 'horizon',
    url: 'https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/data/hyperion_30k_plt.tab',
    arquivoLocal: 'fonte/hyperion-horizon.png',
  },
  {
    corpo: 'hyperion',
    canal: 'horizon2',
    url: 'https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/data/hyperion_30k_plt.tab',
    arquivoLocal: 'fonte/hyperion-horizon2.png',
  },
  // ---- Pã sai das esculpidas em 08/10/2026 (PLAN-LUAS-PEQUENAS.md, a versão
  // F aprovada por ele): a forma medida (Cassini, Thomas/Joseph/Ansty 2018)
  // como mapa de ALTURA, com o relevo fino das fotos calibradas da Cassini,
  // a NORMAL e os dois HORIZONTES dela — as fontes LOCAIS são os bytes
  // aprovados (`capturas/luas-pequenas/pa/f/gera-f.mjs`), já na convenção da
  // casa (sem giro). A COR já vem nivelada e calibrada pelo espectro medido:
  // entra SEM bake (o `ilustracao-ia` a nivelaria de novo), só reencodada.
  {
    corpo: 'pan',
    canal: 'map',
    url: 'https://science.nasa.gov/saturn/moons/pan/',
    arquivoLocal: 'fonte/pan-cor.png',
  },
  {
    corpo: 'pan',
    canal: 'height',
    url: 'https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/data/pan_30k_plt.tab',
    arquivoLocal: 'fonte/pan-altura.png',
  },
  {
    corpo: 'pan',
    canal: 'normal',
    url: 'https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/data/pan_30k_plt.tab',
    arquivoLocal: 'fonte/pan-normal.png',
  },
  {
    corpo: 'pan',
    canal: 'horizon',
    url: 'https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/data/pan_30k_plt.tab',
    arquivoLocal: 'fonte/pan-horizon.png',
  },
  {
    corpo: 'pan',
    canal: 'horizon2',
    url: 'https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/data/pan_30k_plt.tab',
    arquivoLocal: 'fonte/pan-horizon2.png',
  },
];

const MAXIMO_DE_REDIRECTS = 5;
// Menor fonte legítima da tabela tem centenas de KB; abaixo disso é
// página de erro ou truncamento (mesmo espírito do MIN_TIFF_BYTES do
// doador, aplicado a tudo).
const MINIMO_DE_BYTES = 50_000;

/**
 * Download com os 4 consertos do cabeçalho. Resolve com o caminho
 * gravado; em QUALQUER falha o parcial é removido antes do reject.
 */
function baixar(url, destino, redirectsRestantes = MAXIMO_DE_REDIRECTS) {
  return new Promise((resolve, reject) => {
    if (!hostPermitido(url)) {
      reject(new Error(`Host fora da allowlist: ${url}`));
      return;
    }
    const requisicao = https.get(
      url,
      // O host canônico do SSS responde 403 a UA não-browser (item 14);
      // um UA de navegador comum evita o falso-negativo.
      { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36' } },
      (resposta) => {
        const { statusCode } = resposta;
        // Redirect: com limite e revalidando a allowlist na URL nova.
        if ([301, 302, 303, 307, 308].includes(statusCode)) {
          resposta.resume();
          if (redirectsRestantes <= 0) {
            reject(new Error(`Redirects demais a partir de ${url}`));
            return;
          }
          const alvo = resposta.headers.location;
          if (!alvo) {
            reject(new Error(`Redirect sem Location em ${url}`));
            return;
          }
          resolve(baixar(new URL(alvo, url).href, destino, redirectsRestantes - 1));
          return;
        }
        // CONSERTO 1: o status decide ANTES de existir write-stream —
        // um 404 aqui não deixa rastro em disco.
        if (statusCode !== 200) {
          resposta.resume();
          reject(new Error(`HTTP ${statusCode} em ${url}`));
          return;
        }
        const stream = createWriteStream(destino);
        const falhar = (erro) => {
          stream.destroy();
          // CONSERTO 3: parcial nunca sobrevive a uma falha.
          unlink(destino).catch(() => {}).finally(() => reject(erro));
        };
        // CONSERTO 4: error na response E no stream.
        resposta.on('error', falhar);
        stream.on('error', falhar);
        stream.on('finish', () => {
          // CONSERTO 2: close com callback — só resolve com o arquivo
          // integralmente drenado para o SO.
          stream.close((erro) => (erro ? falhar(erro) : resolve(destino)));
        });
        resposta.pipe(stream);
      }
    );
    requisicao.on('error', (erro) => {
      unlink(destino).catch(() => {}).finally(() => reject(erro));
    });
  });
}

/** Valida que o arquivo decodifica como imagem e tem tamanho plausível. */
async function validarImagem(caminho, minimo = MINIMO_DE_BYTES) {
  const { size } = await stat(caminho);
  if (size < minimo) {
    await unlink(caminho);
    throw new Error(`${caminho}: só ${size} bytes — página de erro ou truncamento.`);
  }
  const meta = await sharp(caminho).metadata();
  return { bytes: size, largura: meta.width, altura: meta.height, formato: meta.format };
}

/**
 * A FONTE QUE ENTRA PELO CACHE (`arquivoDoCache`, item 230): o arquivo em
 * `<raiz>/<arquivo>` tem de existir e ter o sha256 pinado — outro arquivo
 * mudaria o mapa calado. Faltou ou não bate: ERRO dizendo de onde baixar
 * (`url`; o host não está na allowlist de `baixar`, e é de propósito).
 * Devolve o caminho absoluto.
 */
export async function conferirArquivoDoCache({ corpo, canal, url, arquivoDoCache }) {
  const { arquivo, sha256: pinado } = arquivoDoCache;
  const caminho = path.resolve(rootDirectory, arquivo);
  const comoBaixar = `baixe ${url} para ${arquivo} (fora da allowlist do download: a fonte entra pelo cache)`;
  const hash = createHash('sha256');
  try {
    for await (const pedaco of createReadStream(caminho)) hash.update(pedaco);
  } catch (erro) {
    if (erro.code !== 'ENOENT') throw erro;
    throw new Error(`${corpo}/${canal}: falta ${arquivo} — ${comoBaixar}.`);
  }
  const obtido = hash.digest('hex');
  if (obtido !== pinado) {
    throw new Error(
      `${corpo}/${canal}: ${arquivo} tem sha256 ${obtido}, o pinado é ${pinado} — não asso com outro arquivo; ${comoBaixar}.`
    );
  }
  return caminho;
}

/**
 * Bake do roughness da Terra (vendorizado de bake-earth-pbr.js, item 14).
 * A INVERSÃO: especular do SSS (oceano claro = reflexivo) vira roughness
 * (0 = espelho) por negate. Opções idênticas às do bake do doador para
 * minimizar divergência entre os modos.
 */
async function assarRoughness(tiffPath, destino) {
  await sharp(await readFile(tiffPath))
    .grayscale()
    .negate({ alpha: false })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(destino);
}

/**
 * O MOSAICO DA DAWN VIRA O MAPA DE COR DE CERES (item 141, 3ª fase).
 * O produto do USGS é 7383×3691 em UM canal (a Framing Camera fotografou
 * Ceres no filtro claro — não existe cor de Ceres em imagem, e inventá-la
 * seria voltar ao `2k_ceres_fictional` que este mosaico substitui).
 *
 * Duas coisas são feitas aqui, e só duas:
 *
 *   1. O GIRO. O GeoTIFF declara meridiano central 180° (geokey 3088) com
 *      a borda esquerda em 0°E — conferido por olho na cratera Occator,
 *      que cai exatamente em 239,3°E / 19,9°N. As texturas da casa são
 *      centradas em 0°, ou seja borda esquerda em 180°: o giro é 180°, o
 *      MESMO que `gera-normal-de-dem.mjs` aplica ao DTM. É isto que faz o
 *      relevo medido e a mancha caírem no mesmo lugar.
 *   2. O TINGIMENTO UNIFORME, declarado. O cinza vira cor por um fator
 *      por canal tirado dos índices de cor publicados de Ceres contra os
 *      do Sol (B−V 0,71 contra 0,65; V−R 0,375 contra 0,352), que é o
 *      quanto o corpo é mais vermelho que a luz que o ilumina:
 *      R 1,021 / G 1,000 / B 0,946. É pouco de propósito — Ceres é quase
 *      neutro, e o marrom vistoso do mapa antigo era invenção.
 *
 * O NÍVEL NÃO É MEXIDO: o mosaico entra com o brilho que o USGS publicou
 * (média 118/255), sem esticar nem escurecer para "parecer" albedo 0,09.
 *
 * O TERCEIRO PASSO, que só o polo sul exige: a Dawn mapeou Ceres com o
 * polo sul em NOITE POLAR, e o mosaico traz 3,6 % de texels sem dado ali
 * (abaixo de −84°, pretos). Deixá-los seria a mancha negra no polo que fez
 * a bancada RECUSAR o mosaico de Europa (ASSETS.md); por isso o buraco é
 * preenchido — e o preenchimento é POLAR e declarado: só acima de |80°| de
 * latitude, e só com a MÉDIA da última faixa de latitude que tem dado.
 * Fora dos polos nada é tocado: os 0,04 % de texels escuros que sobram no
 * resto do globo são sombra de cratera, que é medida.
 */
const TINTA_DE_CERES = [1.021, 1.0, 0.946];
const LARGURA_DO_MAPA_DE_CERES = 4096;
const SEM_DADO_ATE = 4;
const LATITUDE_DO_PREENCHIMENTO = 80;

/**
 * Tapa o buraco de noite polar com a média da faixa de latitude mais
 * próxima que tem dado, caminhando do equador para cada polo.
 */
function preencherPolosSemDado(cinza, largura, altura) {
  const meio = Math.floor(altura / 2);
  for (const sentido of [-1, 1]) {
    let media = 0;
    for (let j = meio; j >= 0 && j < altura; j += sentido) {
      const lat = 90 - ((j + 0.5) / altura) * 180;
      let soma = 0;
      let validos = 0;
      for (let i = 0; i < largura; i += 1) {
        const v = cinza[j * largura + i];
        if (v >= SEM_DADO_ATE) {
          soma += v;
          validos += 1;
        }
      }
      if (validos > largura / 2) media = Math.round(soma / validos);
      if (Math.abs(lat) < LATITUDE_DO_PREENCHIMENTO) continue;
      for (let i = 0; i < largura; i += 1) {
        if (cinza[j * largura + i] < SEM_DADO_ATE) cinza[j * largura + i] = media;
      }
    }
  }
}

async function assarMosaicoDeCeres(tifPath, destino) {
  const largura = LARGURA_DO_MAPA_DE_CERES;
  const altura = largura / 2;
  const cinza = await sharp(tifPath, { limitInputPixels: false })
    .resize(largura, altura, { fit: 'fill', kernel: 'lanczos3' })
    .greyscale()
    .raw()
    .toBuffer();
  preencherPolosSemDado(cinza, largura, altura);
  // 180° de 4096 são 2048 colunas exatas — o giro não arredonda nada
  const girado = giraColunasDeImagem(cinza, largura, altura, 1, 180);
  const rgb = Buffer.allocUnsafe(girado.length * 3);
  for (let k = 0; k < girado.length; k += 1) {
    for (let c = 0; c < 3; c += 1) {
      rgb[k * 3 + c] = Math.min(255, Math.round(girado[k] * TINTA_DE_CERES[c]));
    }
  }
  await sharp(rgb, { raw: { width: largura, height: altura, channels: 3 } })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toFile(destino);
}

/**
 * O NÍVEL CASADO COM O ALBEDO (item 151). Hígia, Palas, Haumea, Makemake,
 * Éris e Quaoar não têm foto de superfície nenhuma: o mapa inteiro é uma
 * ILUSTRAÇÃO gerada por IA (ChatGPT do dono) a partir dos fatos conhecidos
 * (tamanho, albedo, cor, crateras vistas de longe). A IA não sabe o albedo
 * geométrico do corpo — o brilho que ela escolhe é estético, não físico —
 * e por isso a média do mapa é MEDIDA em linear (a luz soma em linear, não
 * em sRGB) e escalada por um ganho até bater no albedo declarado: mesmo
 * raciocínio do tingimento uniforme de Ceres (`assarMosaicoDeCeres`), mas
 * em BRILHO, não em matiz. O ganho não é aplicado à mão (edição de
 * imagem): é medido e gravado no log a cada corrida, e o `ASSETS.md`
 * confessa o número.
 */
const ALBEDO_DA_ILUSTRACAO = {
  hygiea: 0.07,
  pallas: 0.16,
  haumea: 0.7,
  makemake: 0.8,
  // 0,96 medido é o mais brilhante do Sistema Solar depois de Encélado;
  // grampeado em 0,9 para o mapa não estourar em branco puro (item 151).
  eris: 0.9,
  quaoar: 0.11,
  // 0,30 medido, grampeado em 0,26 para o percentil 99 do mapa não estourar
  // — o mesmo cuidado de Éris (23/09/2026).
  hyperion: 0.26,
};

function srgbParaLinear(canal) {
  const c = canal / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function linearParaSrgb(linear) {
  const c = linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
}

async function assarIlustracaoIA(origem, destino, corpo) {
  const albedoAlvo = ALBEDO_DA_ILUSTRACAO[corpo];
  if (albedoAlvo === undefined) {
    throw new Error(`assarIlustracaoIA: sem albedo declarado para ${corpo} (item 151)`);
  }
  const { data, info } = await sharp(origem, { limitInputPixels: false })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let somaLinear = 0;
  for (let i = 0; i < data.length; i += 1) somaLinear += srgbParaLinear(data[i]);
  const medioLinear = somaLinear / data.length;
  const ganho = albedoAlvo / Math.max(medioLinear, 1e-6);
  const saida = Buffer.allocUnsafe(data.length);
  for (let i = 0; i < data.length; i += 1) {
    saida[i] = linearParaSrgb(srgbParaLinear(data[i]) * ganho);
  }
  console.log(
    `${corpo}/map (ilustração IA): média linear ${medioLinear.toFixed(4)} → ganho ` +
      `${ganho.toFixed(3)} → albedo-alvo ${albedoAlvo}.`
  );
  await sharp(saida, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toFile(destino);
}

/**
 * Gira um mapa já adquirido para a convenção de longitude da casa, na
 * largura que a casa quer (`larguraDoDestino`; sem ela, a da fonte).
 *
 * O ENCODE segue o CANAL: `height` e `normal` são DADO e saem em PNG —
 * jpg neles erra 8/255 na altura, que são 0,64 km de relevo falso (a
 * mesma medida que fez `otimiza-texturas.mjs` recusar o webp com perda
 * para `CANAIS_DE_DADO`). Cor sai em jpg, como o resto da tabela.
 *
 * `preencherVazio` (item 149, a receita do 147) tapa o hemisfério que a
 * sonda não viu com o tom médio do que foi fotografado — a decisão inteira
 * mora em `preencherVazioSemDado`, aqui só a chamada e o log com a conta,
 * que é o número que o `ASSETS.md` declara.
 *
 * ELE VEM ANTES DA REAMOSTRAGEM: reduzir primeiro cria, na borda de cada
 * buraco, um degrau de lanczos que já não conta como "sem dado" e portanto
 * nunca seria tapado — um fio escuro em volta do remendo. No tamanho da
 * fonte o remendo entra inteiro e a redução só o mistura com a vizinhança.
 *
 * E A JANELA MEDE-SE EM GRAUS, não em texels. O padrão de
 * `preencherVazioSemDado` (raio 7) nasceu em mapas de 1440 px, onde 15×15
 * texels são 3,8° de longitude; nos mosaicos da New Horizons, de 5926 e
 * 12693 px, os mesmos 15×15 são 0,4° — janela pequena demais, que chama de
 * "vazio GRANDE" qualquer buraco entre imagens e o tapa com a média GLOBAL
 * do mapa. Em Caronte isso pintava manchas CLARAS (tom 118) no meio do
 * terreno escuro do hemisfério anti-Plutão: pior que o buraco. Com a
 * janela em graus só o vazio grande na escala do GLOBO — a calota polar —
 * qualifica, e o buraco pequeno fica como o USGS o publicou.
 *
 * A COR INVENTADA (`corInventada`: Plutão e Caronte, PLAN-COR.md) entra
 * DEPOIS do giro e ANTES do jpg (`inventaCorDoMapa`), e o jpg é o do RGB
 * que o portão aprovou. Ela mede o vazio no mosaico CRU, antes do
 * tapa-buraco e da redução: a cópia sai antes de `preencherVazioSemDado`,
 * que escreve em cima. Exportada para a prova de que a cadeia reproduz a
 * prévia, que a chama com o destino fora de `public/`.
 *
 * A COR DE EUROPA (`corEuropa`, item 230) entra no mesmo ponto, por
 * `pintaEuropa`, que tem a redução própria antes do giro.
 */
const GRAUS_DA_JANELA_DO_VAZIO = 14;
export async function girarMapa(origem, destino, canal, opcoes = {}) {
  const { pixels, info } = await pixelsDoMapa(origem, opcoes);
  const saida = sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  });
  await (CANAIS_DE_DADO.has(canal)
    ? saida.png({ compressionLevel: 9, adaptiveFiltering: false })
    : saida.jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true })
  ).toFile(destino);
}

/**
 * Os pixels que `girarMapa` codifica, em memória — `{ pixels, info }`, o RGB
 * que o portão aprovou quando há portão. Exportada para a prova por hash, que
 * não grava nada.
 */
export async function pixelsDoMapa(
  origem,
  { giroGraus = 0, larguraDoDestino, preencherVazio = false, rotulo = '', corpo, corInventada, corEuropa } = {}
) {
  if (corEuropa) return pintaEuropa(origem, { giroGraus, larguraDoDestino, rotulo, corEuropa });
  let entrada = sharp(origem, { limitInputPixels: false }).removeAlpha();
  let mosaicoCru = null;
  if (preencherVazio) {
    const cru = await entrada.raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = cru.info;
    if (corInventada) {
      mosaicoCru = { pixels: Buffer.from(cru.data), largura: width, altura: height, canais: channels, giroGraus };
    }
    const raio = Math.round((width * GRAUS_DA_JANELA_DO_VAZIO) / 360);
    const conta = preencherVazioSemDado(cru.data, width, height, channels, { raio });
    const texels = width * height;
    console.log(
      `${rotulo}: ${((100 * conta.semDado) / texels).toFixed(1)} % sem dado, ` +
        `${((100 * conta.preenchidos) / texels).toFixed(1)} % preenchidos ` +
        `com o tom ${conta.tom.join('/')}.`
    );
    entrada = sharp(cru.data, { raw: { width, height, channels } });
  }
  if (larguraDoDestino) {
    entrada = entrada.resize(larguraDoDestino, larguraDoDestino / 2, {
      fit: 'fill',
      kernel: 'lanczos3',
    });
  }
  const { data, info } = await entrada.raw().toBuffer({ resolveWithObject: true });
  const girado = giraColunasDeImagem(
    data, info.width, info.height, info.channels, giroGraus
  );
  const pixels = corInventada
    ? await inventaCorDoMapa({ origem, rotulo, corpo, corInventada, cru: mosaicoCru, cor: girado, info })
    : girado;
  return { pixels, info };
}

/**
 * O PASSO DA COR DE EUROPA de `pixelsDoMapa` (item 230): o mosaico de UM
 * canal reduzido por `reduzPorMediaDeArea` (a média de área só do que tem
 * dado — o lanczos misturaria o 0 do vazio na borda dele), girado como
 * qualquer mapa da tabela e pintado por `corDeEuropa` com a receita (a), o
 * tom da entrada e a exposição pinada (`Y_MEDIO_ALVO`): a MESMA função das
 * prévias do E1, que esta cadeia reproduz byte a byte
 * (`capturas/europa-japeto/ferramentas/prova-cadeia-europa.mjs`). O sul sem
 * dado é preenchido por coluna lá dentro. Imprime versões e contas e passa
 * pelo PORTÃO (`portaoDaCor`, chave `receita:a,tom:<tom>`): recusado, o erro
 * leva a mensagem e o map.jpg NÃO é gravado.
 */
async function pintaEuropa(origem, { giroGraus, larguraDoDestino, rotulo, corEuropa }) {
  if (!larguraDoDestino) throw new Error(`${rotulo}: a cor de Europa pede larguraDoDestino.`);
  const { data, info } = await sharp(origem, { limitInputPixels: false })
    .extractChannel(0)
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 1) throw new Error(`${rotulo}: esperava o mosaico de um canal (${info.channels}).`);
  const largura = larguraDoDestino;
  const altura = largura / 2;
  const reduzido = reduzPorMediaDeArea(data, info.width, info.height, largura);
  const cinza = giraColunasDeImagem(reduzido, largura, altura, 1, giroGraus);
  const chave = `receita:a,tom:${corEuropa.tom}`;
  console.log(
    `${rotulo}: cor de Europa, ${chave}, mosaico ${info.width}×${info.height} → ${largura}×${altura}; ` +
      `versões: node ${process.version}, V8 ${process.versions.v8}, sharp ${sharp.versions.sharp}, ` +
      `libvips ${sharp.versions.vips}`
  );
  const r = corDeEuropa({ cinza, largura, altura, receita: 'a', tom: corEuropa.tom, yMedioAlvo: Y_MEDIO_ALVO });
  const preenchidos = r.preenchido.reduce((s, v) => s + v, 0);
  console.log(
    `  ganho linear ${r.ganho.toFixed(4)}, ${r.saturados} texels saturados, ` +
      `${preenchidos} preenchidos no sul, ${r.encolhidos} com a croma encolhida pela gama`
  );
  const portao = portaoDaCor({ rotulo, chave, rgb: r.rgb, aprovados: corEuropa.sha256Aprovado, campo: 'corEuropa' });
  if (!portao.grava) throw new Error(portao.mensagem);
  console.log(portao.mensagem);
  return {
    pixels: Buffer.from(r.rgb.buffer, r.rgb.byteOffset, r.rgb.length),
    info: { width: largura, height: altura, channels: 3 },
  };
}

/**
 * O PASSO DA COR INVENTADA de `girarMapa`: as entradas de
 * `inventaCorDoCorpo` (`cor-inventada.mjs`) montadas como a prévia as monta
 * (`capturas/cor-inventada/ferramentas/m2/previa-m2.mjs`, que esta cadeia
 * reproduz byte a byte) — a cor na grade da casa (tapada, reduzida e
 * girada); o mosaico CRU e o giro, de onde saem as máscaras do vazio; o
 * `normal.png` da casa, o relevo inventado da rodada anterior (a função o
 * reamostra); o JSON do relevo do corpo, com as unidades e os pesos delas;
 * a semente e a variante da entrada; e o lado de trás borrado (`borrado`,
 * a M2). Imprime o que refaz o mapa — versões, sha256 das entradas,
 * semente e variante — e passa pelo PORTÃO (`portaoDaCor`): recusado, o
 * erro leva a mensagem e o map.jpg NÃO é gravado. Devolve o RGB a codificar.
 * Com `corInventada.semSombra` (PLAN-SOMBRA.md), a sombra assada sai: o vazio
 * do DEM medido vem do cache das alturas do relevo (`.cache/relevo/<corpo>-4096`,
 * o que `gera-normal-de-dem.mjs` grava; sem ele, erro) e a chave ganha `,sombra:1`.
 */
async function inventaCorDoMapa({ origem, rotulo, corpo, corInventada, cru, cor, info }) {
  const arquivoDaNormal = path.join(destinoRaiz, corpo, 'normal.png');
  const arquivoDaFonte = path.join(
    path.dirname(fileURLToPath(import.meta.url)), 'fonte', `${corpo}-lado-de-tras.json`
  );
  const bytesDaFonte = await readFile(arquivoDaFonte);
  const normal = await sharp(arquivoDaNormal).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  console.log(
    `${rotulo}: cor inventada, semente ${corInventada.semente}, ` +
      `variante ${corInventada.variante ?? '(nenhuma)'}; versões: node ${process.version}, ` +
      `V8 ${process.versions.v8}, sharp ${sharp.versions.sharp}, libvips ${sharp.versions.vips}`
  );
  console.log('sha256 das entradas:');
  for (const [bytes, nome] of [
    [await readFile(origem), 'o mosaico cru, como adquirido'],
    [await readFile(arquivoDaNormal), path.relative(rootDirectory, arquivoDaNormal)],
    [bytesDaFonte, path.relative(rootDirectory, arquivoDaFonte)],
  ]) {
    console.log(`  ${createHash('sha256').update(bytes).digest('hex')}  ${nome}`);
  }
  let medido = null;
  if (corInventada.semSombra) {
    const cache = await lerCacheDeAlturas(path.join(rootDirectory, '.cache', 'relevo'), `${corpo}-4096`);
    if (!cache) {
      throw new Error(`${rotulo}: sem a sombra assada pede o cache das alturas do relevo (.cache/relevo/${corpo}-4096); rode antes o relevo (gera-normal-de-dem.mjs ${corpo}).`);
    }
    medido = { vazio: cache.partes.vazio, largura: cache.cabecalho.larguraAlvo, altura: cache.cabecalho.alturaAlvo };
    console.log(`  ${cache.cabecalho.partes.vazio.sha256}  o vazio do DEM medido (cache .cache/relevo/${corpo}-4096)`);
  }
  const { cor: rgb, chave } = inventaCorDoCorpo({
    id: corpo,
    cor: new Uint8Array(cor.buffer, cor.byteOffset, cor.length),
    largura: info.width,
    altura: info.height,
    canais: info.channels,
    cru,
    normais: { pixels: normal.data, largura: normal.info.width, altura: normal.info.height },
    fonte: JSON.parse(bytesDaFonte.toString('utf8')),
    semente: corInventada.semente,
    opcoes: {
      registra: (m) => console.log(`  ${m}`),
      variante: corInventada.variante,
      borrado: true,
      ...(medido ? { semSombra: true, medido } : {}),
    },
  });
  const portao = portaoDaCor({ rotulo, chave, rgb, aprovados: corInventada.sha256Aprovado });
  if (!portao.grava) throw new Error(portao.mensagem);
  console.log(portao.mensagem);
  return Buffer.from(rgb.buffer, rgb.byteOffset, rgb.length);
}

/**
 * O PORTÃO DA COR INVENTADA: o map.jpg só é gravado se o sha256 do RGB que
 * `inventaCorDoCorpo` devolve for o de `corInventada.sha256Aprovado` para a
 * chave das escolhas (`chave`, `sul:1,borrado:1`) — o RGB da função, não o
 * do jpg decodificado, que o codificador muda (o mozjpeg mexe ±1 DN até
 * fora do alvo). A decisão é a do portão do relevo (`decideGravacao`), com
 * a mensagem trazida ao map.jpg. Pura: `{ grava, mensagem, sha256 }`.
 * `campo` é o da entrada que guarda os aprovados (`corEuropa` em Europa).
 */
export function portaoDaCor({ rotulo, chave, rgb, aprovados, campo = 'corInventada' }) {
  const sha256 = createHash('sha256').update(rgb).digest('hex');
  const { grava, mensagem } = decideGravacao({ nome: rotulo, chave, sha256, aprovados });
  return {
    grava,
    sha256,
    mensagem: mensagem
      .replace('o normal.png', 'o map.jpg')
      .replace('vazioInventado.sha256Aprovado', `${campo}.sha256Aprovado`)
      .replace('o relevo mudou', 'a cor mudou'),
  };
}

/**
 * As opções de `girarMapa` que uma linha de FONTES pede — uma função só, para
 * a prova por hash chamar a cadeia com exatamente o que a cadeia usa.
 */
export function opcoesDoMapa(fonte) {
  return {
    giroGraus: fonte.giroDeLongitudeGraus,
    larguraDoDestino: fonte.larguraDoDestino,
    preencherVazio: fonte.preencherVazio,
    rotulo: `${fonte.corpo}/${fonte.canal}`,
    corpo: fonte.corpo,
    corInventada: fonte.corInventada,
    corEuropa: fonte.corEuropa,
  };
}

// ---- O RELEVO DE JÁPETO (item 230) -----------------------------------

/**
 * O RELEVO DE JÁPETO EM MEMÓRIA — a sequência de chamadas da prévia
 * (`capturas/europa-japeto/ferramentas/previa-japeto.mjs`), que esta cadeia
 * reproduz byte a byte (`prova-cadeia-japeto.mjs`, ao lado dela): o caminho
 * da crista na linha clara do mapa de cor, as crateras detectadas no mesmo
 * mapa, as crateras com nome do Gazetteer, `geraRelevo` com a semente e a
 * altura aprovadas, a altura em 8 bits (`quantiza`) e a normal do MESMO
 * campo (`normalDoCampo`). `rgb`: o map.jpg decodificado (`{ data, info }`
 * do sharp); `gazetteer`: as feições do JSON do cache. Antes, confere que a
 * crista e os montes do módulo são os do Gazetteer (outra tabela, outra
 * crista) e que o rareamento por latitude para onde o detector para.
 * Pura; `{ height, normal, numeros, relevo, deteccao }`.
 */
export function relevoDeJapeto({ rgb, gazetteer, semente, alturaMaximaKm, largura = 1024, altura = 512 }) {
  if (PARAMETROS_DA_DETECCAO.latMaxGraus !== RAREAMENTO_POR_LATITUDE.latMaxDaDeteccaoGraus) {
    throw new Error('relevo de Jápeto: o detector para em outra latitude que o rareamento (latMaxGraus ≠ latMaxDaDeteccaoGraus).');
  }
  const feicao = (nome) => {
    const f = gazetteer.find((x) => x.nome === nome);
    if (!f) throw new Error(`relevo de Jápeto: ${nome} não está no Gazetteer.`);
    return f;
  };
  const longe = (a, b, tolerancia) => Math.abs(a - b) > tolerancia;
  for (const [chave, [a, b]] of Object.entries(CRISTA_DO_GAZETTEER)) {
    const f = feicao(`${chave[0].toUpperCase()}${chave.slice(1)} Montes`);
    if (longe(f.ext_lonE_min, a, 0.05) || longe(f.ext_lonE_max, b, 0.05)) {
      throw new Error(`relevo de Jápeto: ${f.nome} vai de ${f.ext_lonE_min} a ${f.ext_lonE_max}°E no Gazetteer, o gerador diz ${a}–${b}.`);
    }
  }
  for (const m of MONTES_DO_GAZETTEER) {
    const f = feicao(m.nome);
    if (longe(f.lonE, m.lonE, 0.05) || longe(f.diametro_km, m.diametroKm, 0.5)) {
      throw new Error(`relevo de Jápeto: ${m.nome} está em ${f.lonE}°E com ${f.diametro_km} km no Gazetteer, o gerador diz ${m.lonE}°E e ${m.diametroKm} km.`);
    }
  }
  const nomeadas = gazetteer
    .filter((f) => f.tipo === 'crater')
    .map((f) => ({ nome: f.nome, lat: f.lat, lonE: f.lonE, diametroKm: f.diametro_km }));
  const { width: W, height: H, channels } = rgb.info;
  const caminho = caminhoDaCristaPeloMapa({ rgb: rgb.data, largura: W, altura: H, canais: channels, larguraDaGrade: largura });
  const deteccao = detectaCrateras(luminanciaDoRgb(rgb.data, W, H, channels), { W, H, raioKm: RAIO_KM });
  const relevo = geraRelevo({ largura, altura, semente, alturaMaximaKm, caminho: caminho.lat, nomeadas, detectadas: deteccao.crateras });
  return {
    height: quantiza(relevo.km),
    normal: normalDoCampo(relevo.km, largura, altura),
    numeros: numerosDoRelevoDeJapeto({ semente, alturaMaximaKm, largura, altura, deteccao: deteccao.parametros }),
    relevo,
    deteccao,
  };
}

/**
 * OS NÚMEROS QUE O PORTÃO APROVA junto dos pixels: os que o pixel não
 * carrega e mudam a silhueta (a escala e o viés do vértice, a faixa do byte,
 * o raio) e os que refazem o campo (semente, alvo, grade, as escolhas da
 * crista, as frequências dos perfis, a forma gasta das crateras com nome e
 * das detectadas, o rareamento por latitude e os parâmetros do detector).
 * O sha256 é o do `jsonCanonico` disto.
 */
export function numerosDoRelevoDeJapeto({ semente, alturaMaximaKm, largura, altura, deteccao }) {
  const { escala, vies } = escalaEVies();
  return {
    escala,
    vies,
    semente,
    alturaMaximaKm,
    grade: { largura, altura, raioKm: RAIO_KM },
    faixaKm: { min: FAIXA_KM.min, max: FAIXA_KM.max },
    leis: {
      crista: ESCOLHAS_DA_CRISTA,
      perfis: FREQUENCIA_DOS_PERFIS,
      comNome: MORFOLOGIA_DAS_COM_NOME,
      detectadas: MORFOLOGIA_DAS_DETECTADAS,
      rareamento: RAREAMENTO_POR_LATITUDE,
      deteccao,
    },
  };
}

/**
 * Os mesmos números, lidos do `parametros.json` que a prévia gravou (o
 * rareamento, das faixas que ela registrou: a primeira começa no limite da
 * referência, e a última acaba onde o detector para).
 */
export function numerosDoCandidato(p) {
  const faixas = p.craterasDetectadas.rareamentoPorLatitude.faixas;
  return {
    escala: p.quantizacao.rochosoTs.escala,
    vies: p.quantizacao.rochosoTs.vies,
    semente: p.semente,
    alturaMaximaKm: p.alvo.alturaDaCristaKm,
    grade: { largura: p.grade.largura, altura: p.grade.altura, raioKm: p.grade.raioKm },
    faixaKm: { min: p.quantizacao.hminKm, max: p.quantizacao.hmaxKm },
    leis: {
      crista: p.leis.crista.escolhas,
      perfis: p.leis.crista.frequenciaDosPerfis,
      comNome: p.leis.crateras.comNome.escolhas,
      detectadas: p.leis.crateras.detectadas.escolhas,
      rareamento: {
        referenciaAteGraus: faixas[0].deGraus,
        faixaGraus: faixas[0].ateGraus - faixas[0].deGraus,
        latMaxDaDeteccaoGraus: faixas[faixas.length - 1].ateGraus,
      },
      deteccao: p.craterasDetectadas.parametros,
    },
  };
}

/** JSON com as chaves em ordem — o mesmo texto para os mesmos números. */
export function jsonCanonico(valor) {
  return JSON.stringify(valor, (_, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v
  );
}

/** As folhas que diferem entre dois objetos de números: `["leis.crista.vaoKm.0: 3 ≠ 4", …]`. */
export function diferencasDosNumeros(obtidos, esperados) {
  const folhas = (valor, prefixo, saida) => {
    if (valor && typeof valor === 'object') {
      for (const [k, v] of Object.entries(valor)) folhas(v, prefixo ? `${prefixo}.${k}` : k, saida);
    } else saida.set(prefixo, valor);
    return saida;
  };
  const a = folhas(obtidos, '', new Map());
  const b = folhas(esperados, '', new Map());
  return [...new Set([...a.keys(), ...b.keys()])]
    .filter((k) => a.get(k) !== b.get(k))
    .sort()
    .map((k) => `${k}: ${a.get(k)} ≠ ${b.get(k)}`);
}

/** A escala e o viés do `corpo` (Jápeto, Reia) em `RELEVO_DA_LUA` (`rochoso.ts`), lidos do texto. */
export async function escalaEViesDoApp(corpo = 'iapetus') {
  const arquivo = path.join(rootDirectory, 'src', 'three', 'world', 'corpos', 'rochoso.ts');
  const m = new RegExp(`\\b${corpo}:\\s*\\{\\s*escala:\\s*([-+.\\deE]+),\\s*vies:\\s*([-+.\\deE]+)`).exec(await readFile(arquivo, 'utf8'));
  if (!m) throw new Error(`relevo: não achei "${corpo}: { escala, vies }" em ${path.relative(rootDirectory, arquivo)}.`);
  return { escala: Number(m[1]), vies: Number(m[2]) };
}

/**
 * O PORTÃO DO RELEVO (Jápeto, Reia, Terra): grava só se o CONJUNTO for o
 * aprovado — os números da cadeia iguais aos do `parametros.json` do
 * candidato, a escala e o viés de `rochoso.ts` iguais aos do candidato
 * (`doApp`; a Terra não desloca vértice e não o passa), e os sha256 de cada
 * um dos `canais` e dos números iguais aos de `sha256Aprovado` da entrada.
 * Um só que falhe e nenhum dos canais é gravado: uma escala nova mudaria a
 * silhueta sem mudar um pixel. Pura: `{ grava, mensagem }`.
 */
export function portaoDoRelevo({ rotulo, candidato, obtidos, aprovados = {}, numeros, doCandidato, doApp, canais = ['height', 'normal'] }) {
  const chaves = [...canais, 'parametros'];
  const problemas = [
    ...diferencasDosNumeros(numeros, doCandidato).map((d) => `os números da cadeia diferem do parametros.json do candidato em ${d}`),
    ...(doApp ? ['escala', 'vies'] : [])
      .filter((k) => doApp[k] !== doCandidato[k])
      .map((k) => `rochoso.ts traz ${k === 'vies' ? 'viés' : k} ${doApp[k]}, o candidato ${doCandidato[k]}`),
  ];
  const faltam = chaves.filter((k) => !aprovados[k]);
  const lista = chaves.map((k) => `${k} ${obtidos[k]}`).join(', ');
  if (!problemas.length && faltam.length) {
    return {
      grava: false,
      mensagem:
        `${rotulo}: o relevo ainda não aprovado (${faltam.join(', ')} sem hash; obtidos: ${lista}) — NADA foi gravado. ` +
        'Com o sim do dono, os hashes entram no sha256Aprovado do relevo (RELEVO_DE_JAPETO, RELEVO_DE_REIA, RELEVO_DA_TERRA).',
    };
  }
  for (const k of chaves) {
    if (aprovados[k] && obtidos[k] !== aprovados[k]) problemas.push(`${k}: sha256 ${obtidos[k]}, o aprovado é ${aprovados[k]}`);
  }
  if (problemas.length) {
    return {
      grava: false,
      mensagem:
        `${rotulo}: o relevo NÃO é o do candidato aprovado (${candidato}) — NADA foi gravado:\n  ` + problemas.join('\n  '),
    };
  }
  return { grava: true, mensagem: `${rotulo}: o conjunto aprovado (${candidato}: ${lista}) — gravo.` };
}

const RELEVOS_FEITOS = new Map();
/**
 * O conjunto de Jápeto pronto para gravar — as entradas conferidas, o
 * relevo, os dois PNG codificados e DECODIFICADOS de volta (o que vai ao
 * disco é o que o portão aprovou) e os sha256. Feito uma vez por processo
 * para as duas entradas (a detecção custa); o portão roda a cada chamada.
 */
async function conjuntoDeJapeto(config, rotulo) {
  const chave = jsonCanonico({ ...config, sha256Aprovado: null });
  if (!RELEVOS_FEITOS.has(chave)) RELEVOS_FEITOS.set(chave, fazConjuntoDeJapeto(config, rotulo));
  return RELEVOS_FEITOS.get(chave);
}

async function fazConjuntoDeJapeto(config, rotulo) {
  const bytesDoMapa = await conferePinado(rotulo, config.mapaDeCor, 'o caminho da crista e as crateras detectadas saem dele: outro mapa, outro relevo');
  const bytesDoGazetteer = await conferePinado(
    rotulo,
    config.gazetteer,
    'a tabela do Gazetteer da IAU (o shapefile IAPETUS_nomenclature_center_pts, lido para JSON; ver .cache/japeto/FONTES.json)'
  );
  const candidato = await parametrosDoCandidato(rotulo, config.candidato);
  console.log(
    `${rotulo}: relevo de Jápeto, semente ${config.semente}, crista de ${config.alturaMaximaKm} km; versões: node ${process.version}, ` +
      `V8 ${process.versions.v8}, sharp ${sharp.versions.sharp}, libvips ${sharp.versions.vips}`
  );
  const rgb = await sharp(bytesDoMapa).raw().toBuffer({ resolveWithObject: true });
  const r = relevoDeJapeto({ rgb, gazetteer: JSON.parse(bytesDoGazetteer.toString('utf8')), semente: config.semente, alturaMaximaKm: config.alturaMaximaKm });
  const { largura: W, altura: H } = r.numeros.grade;
  const ultima = r.relevo.passadas[r.relevo.passadas.length - 1];
  console.log(
    `  crista ${ultima.alturaDaCrista.km.toFixed(2)} km em ${ultima.alturaDaCrista.lonE.toFixed(2)}°E; ${r.deteccao.crateras.length} crateras detectadas ` +
      `(${r.relevo.detectadas.length} entram), ${r.relevo.colocadas.length} com nome; ${r.height.abaixo + r.height.acima} texels saturados`
  );
  return {
    ...(await pngsDoRelevo(rotulo, r, W, H)),
    numeros: r.numeros,
    doCandidato: numerosDoCandidato(candidato),
  };
}

/**
 * Os dois PNG de um relevo gerado (`r`: `{ height: { bytes }, normal: { rgb
 * }, numeros }`), codificados e DECODIFICADOS de volta — o que vai ao disco
 * é o que o portão aprovou —, e os três sha256: os pixels da altura (1
 * canal), o RGB da normal e o JSON canônico dos números.
 */
async function pngsDoRelevo(rotulo, r, W, H) {
  const pngDaAltura = await sharp(Buffer.from(r.height.bytes), { raw: { width: W, height: H, channels: 1 } })
    .toColourspace('b-w').png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer();
  const pngDaNormal = await sharp(r.normal.rgb, { raw: { width: W, height: H, channels: 3 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer();
  const sha = (b) => createHash('sha256').update(b).digest('hex');
  const voltaDaAltura = await sharp(pngDaAltura).greyscale().raw().toBuffer({ resolveWithObject: true });
  const voltaDaNormal = await sharp(pngDaNormal).raw().toBuffer({ resolveWithObject: true });
  const obtidos = { height: sha(Buffer.from(r.height.bytes)), normal: sha(r.normal.rgb), parametros: sha(jsonCanonico(r.numeros)) };
  if (voltaDaAltura.info.channels !== 1 || sha(voltaDaAltura.data) !== obtidos.height) throw new Error(`${rotulo}: o height.png decodificado não é a altura do gerador.`);
  if (voltaDaNormal.info.channels !== 3 || sha(voltaDaNormal.data) !== obtidos.normal) throw new Error(`${rotulo}: o normal.png decodificado não é a normal do gerador.`);
  return { png: { height: pngDaAltura, normal: pngDaNormal }, obtidos };
}

/** O `parametros.json` da pasta do candidato aprovado; faltou: erro dizendo o que ele é. */
async function parametrosDoCandidato(rotulo, pasta) {
  const arquivo = path.join(rootDirectory, pasta, 'parametros.json');
  try {
    return JSON.parse(await readFile(arquivo, 'utf8'));
  } catch (erro) {
    if (erro.code !== 'ENOENT') throw erro;
    throw new Error(`${rotulo}: falta ${path.relative(rootDirectory, arquivo)}, o registro do candidato aprovado — o portão confronta os números com ele.`);
  }
}

/** sha256 de um arquivo da raiz, pinado; faltou ou não bate: erro dizendo o que ele é. */
async function conferePinado(rotulo, { arquivo, sha256: pinado }, oQueE) {
  let bytes;
  try {
    bytes = await readFile(path.resolve(rootDirectory, arquivo));
  } catch (erro) {
    if (erro.code !== 'ENOENT') throw erro;
    throw new Error(`${rotulo}: falta ${arquivo} — ${oQueE}.`);
  }
  const obtido = createHash('sha256').update(bytes).digest('hex');
  if (obtido !== pinado) {
    throw new Error(`${rotulo}: ${arquivo} tem sha256 ${obtido}, o pinado é ${pinado} — ${oQueE}; não asso com outro arquivo.`);
  }
  return bytes;
}

/**
 * O PASSO DO RELEVO DE JÁPETO de uma entrada (`height` ou `normal`): o
 * conjunto, o portão e, aprovado, o PNG do canal em `destino`. Recusado, o
 * erro leva a mensagem e nada é gravado. Exportada para a prova por hash,
 * que a chama com o destino fora de `public/`.
 */
export async function gravaRelevoDeJapeto(fonte, destino) {
  const rotulo = `${fonte.corpo}/${fonte.canal}`;
  const config = fonte.relevoJapeto;
  const conjunto = await conjuntoDeJapeto(config, rotulo);
  const portao = portaoDoRelevo({
    rotulo,
    candidato: config.candidato,
    obtidos: conjunto.obtidos,
    aprovados: config.sha256Aprovado,
    numeros: conjunto.numeros,
    doCandidato: conjunto.doCandidato,
    doApp: await escalaEViesDoApp(),
  });
  if (!portao.grava) throw new Error(portao.mensagem);
  console.log(portao.mensagem);
  await writeFile(destino, conjunto.png[fonte.canal]);
}

// ---- O RELEVO DE REIA (PLAN-REIA.md, etapa F) ------------------------

/**
 * As grades cuja UNIÃO dá a faixa do byte, como na prévia: A (1024) e B
 * (2048) saem com a mesma faixa — a mesma escala e o mesmo viés em
 * `rochoso.ts` —, e a de um depende do campo do outro. Na ordem da prévia.
 */
const GRADES_DA_FAIXA_DE_REIA = [[2048, 1024], [1024, 512]];

/**
 * O RELEVO DE REIA EM MEMÓRIA — a sequência de chamadas da prévia
 * (`capturas/reia/ferramentas/previa-reia.mjs`), que esta cadeia reproduz
 * byte a byte (`prova-cadeia-reia.mjs`, ao lado dela): as crateras
 * detectadas no map.jpg (`detectaCrateras`, como `r2-detecta.mjs`), em cada
 * grade de `GRADES_DA_FAIXA_DE_REIA` o relevo do DTM com as finas
 * completadas (`geraRelevo`) e a faixa dele (`faixaDoCampo`); a faixa do
 * byte é a união; na grade pedida, a altura em 8 bits (`quantiza`) e a
 * normal do MESMO campo (`normalDoCampo`). `tif`: os bytes do TIFF do DTM;
 * `rgb`: o map.jpg decodificado (`{ data, info }` do sharp); `dtmSha256`: o
 * sha256 conferido do TIFF, que vai aos números. Pura; `{ height, normal,
 * numeros, relevo, faixa, saturados, deteccao }`.
 */
export function relevoDeReia({ tif, rgb, dtmSha256, largura, altura }) {
  const { width: W, height: H, channels } = rgb.info;
  const deteccao = detectaCrateras(luminanciaDoRgb(rgb.data, W, H, channels), { W, H, raioKm: Reia.RAIO_KM });
  const campos = GRADES_DA_FAIXA_DE_REIA.map(([w, h]) => {
    const relevo = Reia.geraRelevo({ largura: w, altura: h, dtmKm: Reia.relevoDoDtm(tif, w, h), detectadas: deteccao.crateras });
    return { relevo, faixa: Reia.faixaDoCampo(relevo.km, w, h) };
  });
  const escolhido = campos.find((c) => c.relevo.largura === largura && c.relevo.altura === altura);
  if (!escolhido) {
    throw new Error(`relevo de Reia: a grade ${largura}×${altura} não é uma das da faixa (${GRADES_DA_FAIXA_DE_REIA.map((g) => g.join('×')).join(', ')}).`);
  }
  const faixa = { min: Math.min(...campos.map((c) => c.faixa.min)), max: Math.max(...campos.map((c) => c.faixa.max)) };
  const { km } = escolhido.relevo;
  return {
    height: Reia.quantiza(km, faixa),
    normal: Reia.normalDoCampo(km, largura, altura, faixa),
    numeros: numerosDoRelevoDeReia({ largura, altura, faixa, regraDaFaixa: escolhido.faixa.medida, dtmSha256, deteccao: deteccao.parametros }),
    relevo: escolhido.relevo,
    faixa,
    saturados: Reia.saturacoes(km, largura, altura, faixa),
    deteccao,
  };
}

/**
 * OS NÚMEROS QUE O PORTÃO APROVA junto dos pixels de Reia: os que o pixel
 * não carrega e mudam a silhueta (a escala e o viés do vértice, a faixa do
 * byte e a regra que a derivou, o raio e os eixos — o relevo em km ÷ a, a
 * exceção ASSUMIDA) e os que refazem o campo: o DTM (sha256, grade, borda
 * esquerda, os 360/2222 °/px que contrariam o rótulo, a latitude
 * planetocêntrica — as exceções cartográficas), o X, a lei de forma, o
 * desgaste, o completar, a duplicata, o rareamento e o detector. O sha256 é
 * o do `jsonCanonico` disto.
 */
export function numerosDoRelevoDeReia({ largura, altura, faixa, regraDaFaixa, dtmSha256, deteccao }) {
  const { escala, vies } = Reia.escalaEVies(faixa);
  const { margemKm, passoKm, poloGraus } = regraDaFaixa;
  const { bordaEsquerdaLonE, grausPorPixel, latitude } = Reia.DTM;
  return {
    escala,
    vies,
    grade: { largura, altura, raioKm: Reia.RAIO_KM, eixosKm: Reia.EIXOS_KM },
    dtm: { sha256: dtmSha256, largura: Reia.DTM.largura, altura: Reia.DTM.altura, bordaEsquerdaLonE, grausPorPixel, latitude },
    faixaKm: { min: faixa.min, max: faixa.max, margemKm, passoKm, poloGraus },
    xKm: Reia.X_KM,
    leis: {
      forma: Reia.LEI_DE_FORMA,
      desfoqueSigmaPorD: Reia.DESFOQUE_SIGMA_POR_D,
      completar: Reia.COMPLETAR,
      duplicata: Reia.DUPLICATA,
      rareamento: Reia.RAREAMENTO_POR_LATITUDE,
      deteccao,
    },
  };
}

/** Os mesmos números de Reia, lidos do `parametros.json` que a prévia gravou. */
export function numerosDoCandidatoDeReia(p) {
  const { margemKm, passoKm, poloGraus } = p.quantizacao.comoFoiDerivada.medidaA;
  const { sha256Conferido, largura, altura, bordaEsquerdaLonE, grausPorPixel, latitude } = p.base.fonte;
  return {
    escala: p.quantizacao.rochosoTs.escala,
    vies: p.quantizacao.rochosoTs.vies,
    grade: { largura: p.grade.largura, altura: p.grade.altura, raioKm: p.grade.raioKm, eixosKm: p.grade.eixosKm },
    dtm: { sha256: sha256Conferido, largura, altura, bordaEsquerdaLonE, grausPorPixel, latitude },
    faixaKm: { min: p.quantizacao.hminKm, max: p.quantizacao.hmaxKm, margemKm, passoKm, poloGraus },
    xKm: p.crateras.X_km,
    leis: {
      forma: p.leis.forma,
      desfoqueSigmaPorD: p.leis.desfoque.sigmaPorD,
      completar: Object.fromEntries(Object.entries(p.leis.completar).filter(([k]) => k !== 'o_que')),
      duplicata: p.crateras.filtro.duplicata.regra,
      rareamento: p.crateras.rareamento.regra,
      deteccao: p.crateras.detector.parametros,
    },
  };
}

/**
 * O conjunto de Reia pronto para gravar (`fonte`: uma das duas entradas) —
 * o TIFF do DTM conferido (`conferirArquivoDoCache`) e o map.jpg pinado, o
 * relevo, os dois PNG decodificados de volta e os sha256. Feito uma vez por
 * processo para as duas entradas (a detecção custa minutos); o portão roda a
 * cada chamada. Exportada para a prova por hash.
 */
export async function conjuntoDeReia(fonte) {
  const chave = jsonCanonico({ ...fonte.relevoReia, sha256Aprovado: null });
  if (!RELEVOS_FEITOS.has(chave)) RELEVOS_FEITOS.set(chave, fazConjuntoDeReia(fonte));
  return RELEVOS_FEITOS.get(chave);
}

async function fazConjuntoDeReia(fonte) {
  const rotulo = `${fonte.corpo}/${fonte.canal}`;
  const config = fonte.relevoReia;
  const tif = await readFile(await conferirArquivoDoCache({ ...fonte, arquivoDoCache: config.dtm }));
  const bytesDoMapa = await conferePinado(rotulo, config.mapaDeCor, 'as crateras finas são detectadas nele: outro mapa, outras crateras');
  const candidato = await parametrosDoCandidato(rotulo, config.candidato);
  console.log(
    `${rotulo}: relevo de Reia, DTM da Cassini + crateras finas pela foto, ${config.largura}×${config.altura} (a detecção leva minutos); ` +
      `versões: node ${process.version}, V8 ${process.versions.v8}, sharp ${sharp.versions.sharp}, libvips ${sharp.versions.vips}`
  );
  const rgb = await sharp(bytesDoMapa).raw().toBuffer({ resolveWithObject: true });
  const r = relevoDeReia({ tif, rgb, dtmSha256: config.dtm.sha256, largura: config.largura, altura: config.altura });
  console.log(
    `  ${r.deteccao.crateras.length} crateras detectadas, ${r.relevo.completadas.length} completadas sobre o DTM; faixa ${r.faixa.min}..${r.faixa.max} km; ` +
      `${r.saturados.abaixo + r.saturados.acima} texels saturados (${r.saturados.foraDoPolo} fora do polo)`
  );
  return {
    ...(await pngsDoRelevo(rotulo, r, config.largura, config.altura)),
    numeros: r.numeros,
    doCandidato: numerosDoCandidatoDeReia(candidato),
  };
}

const PARES_GRAVADOS = new Set();
/**
 * Os PNG de um conjunto aprovado (`png[canal]`) na pasta de `destino`, TODOS
 * de uma vez: cada um vai a um temporário na mesma pasta e só então são
 * renomeados por cima dos de antes. A segunda entrada da mesma corrida acha
 * o conjunto gravado (pasta + hashes) e não regrava.
 */
async function gravaOsCanaisJuntos(rotulo, destino, { png, obtidos }, mensagem) {
  const pasta = path.dirname(destino);
  const par = `${pasta}|${jsonCanonico(obtidos)}`;
  if (PARES_GRAVADOS.has(par)) {
    console.log(`${rotulo}: já gravado junto com os outros canais nesta corrida.`);
    return;
  }
  const canais = Object.keys(png);
  console.log(`${mensagem} (${canais.join(', ')} juntos)`);
  const temporario = (canal) => path.join(pasta, `.${canal}.png.${process.pid}.tmp`);
  try {
    for (const canal of canais) await writeFile(temporario(canal), png[canal]);
    for (const canal of canais) await rename(temporario(canal), path.join(pasta, `${canal}.png`));
  } finally {
    for (const canal of canais) await unlink(temporario(canal)).catch(() => {});
  }
  PARES_GRAVADOS.add(par);
}

/**
 * O PASSO DO RELEVO DE REIA: o conjunto, o portão e, aprovado, os DOIS PNG
 * (`height.png` e `normal.png` na pasta de `destino`) de uma vez — pela
 * primeira das duas entradas que a corrida encontra, com qualquer escopo (a
 * revisão de 07/10: um canal por chamada deixava uma interrupção misturar
 * versões; `gravaOsCanaisJuntos`). Recusado, o erro leva a mensagem e nada é
 * gravado. Exportada para a prova por hash, que a chama fora de `public/`.
 */
export async function gravaRelevoDeReia(fonte, destino) {
  const rotulo = `${fonte.corpo}/${fonte.canal}`;
  const config = fonte.relevoReia;
  const conjunto = await conjuntoDeReia(fonte);
  const portao = portaoDoRelevo({
    rotulo,
    candidato: config.candidato,
    obtidos: conjunto.obtidos,
    aprovados: config.sha256Aprovado,
    numeros: conjunto.numeros,
    doCandidato: conjunto.doCandidato,
    doApp: await escalaEViesDoApp('rhea'),
  });
  if (!portao.grava) throw new Error(portao.mensagem);
  await gravaOsCanaisJuntos(rotulo, destino, conjunto, portao.mensagem);
}

// ---- O RELEVO DA TERRA (07/10/2026; item 232, 08/10/2026) ---------------

/** Os canais do conjunto da Terra, que o portão aprova e a cadeia grava juntos. */
const CANAIS_DA_TERRA = ['normal', 'horizon', 'horizon2'];

/**
 * O RELEVO DA TERRA EM MEMÓRIA — a conta dos candidatos do item 232
 * (`capturas/efeitos-timidos/relevo/ferramentas/assa.mjs`, modos
 * `superficie`, `normais` e `horizonte`), que esta cadeia reproduz byte a
 * byte: o ETOPO lido e levado à superfície (`leEtopo`: os lagos com fundo
 * sobem ao espelho, o resto abaixo de 0 m vai a 0 m) e, da grade FINA dele,
 * a normal na grade de `Terra.NORMAL` e o horizonte na de `Terra.HORIZONTE`
 * (em fios; perto de dez minutos em oito). `tif`: os bytes do TIFF;
 * `etopoSha256`: o sha256 conferido dele, que vai aos números. Sem E/S;
 * `{ rgb, grades, numeros, normal, superficie }` — `rgb[canal]` com W·H·3
 * bytes na `grades[canal]`.
 */
export async function relevoDaTerra({ tif, etopoSha256 }) {
  const { NORMAL, HORIZONTE } = Terra;
  const etopo = Terra.leEtopo(tif);
  const fina = [etopo.metros, etopo.largura, etopo.altura];
  const normal = Terra.normalDaTerra(...fina, NORMAL.largura, NORMAL.altura);
  const { horizon, horizon2 } = await Terra.horizonteDaTerra(...fina, HORIZONTE.largura, HORIZONTE.altura);
  const grade = ({ largura, altura }) => ({ largura, altura });
  return {
    rgb: { normal: normal.rgb, horizon, horizon2 },
    grades: { normal: grade(NORMAL), horizon: grade(HORIZONTE), horizon2: grade(HORIZONTE) },
    numeros: numerosDoRelevoDaTerra({ etopoSha256, superficie: etopo.superficie }),
    normal: { rmsGraus: normal.rmsGraus, maxGraus: normal.maxGraus },
    superficie: etopo.superficie,
  };
}

const lagosDaSuperficie = (lagos) => lagos.map(({ nome, nivelM, areaKm2, fundoM }) => ({ nome, nivelM, areaKm2, fundoM }));

/**
 * OS NÚMEROS QUE O PORTÃO APROVA junto dos pixels da Terra: os que refazem
 * o campo e o pixel não carrega — o ETOPO (sha256, grade, borda esquerda, o
 * valor sem dado), o raio, a marcha do horizonte (grade de saída, as faixas
 * de passo em texels da FONTE, onde ela anda, e o número de passos) — e o
 * que a água virou nesta corrida (cada lago com fundo: nível, área enchida,
 * fundo; quantas amostras abaixo do mar foram a 0 m), que muda se a
 * semente, o nível ou a guarda de um lago mudar. O sha256 é o do
 * `jsonCanonico` disto.
 */
export function numerosDoRelevoDaTerra({ etopoSha256, superficie }) {
  const { largura, altura, bordaEsquerdaLonE, semDado } = Terra.ETOPO;
  const { HORIZONTE } = Terra;
  return {
    fonte: { sha256: etopoSha256, largura, altura, bordaEsquerdaLonE, semDado },
    raioKm: Terra.RAIO_KM,
    superficie: { lagos: lagosDaSuperficie(superficie.lagos), abaixoDoMar: superficie.abaixoDoMar },
    horizonte: {
      grade: [HORIZONTE.largura, HORIZONTE.altura],
      faixas: HORIZONTE.faixas.map((f) => [...f]),
      passos: Terra.angulosDoHorizonte(largura).length,
    },
  };
}

/** Os mesmos números da Terra, lidos do `parametros.json` que os candidatos gravaram. */
export function numerosDoCandidatoDaTerra(p) {
  const { sha256, largura, altura, bordaEsquerdaLonE, semDado } = p.fonte;
  const { faixas, passos } = p.horizonte.marcha;
  return {
    fonte: { sha256, largura, altura, bordaEsquerdaLonE, semDado },
    raioKm: p.raioKm,
    superficie: { lagos: lagosDaSuperficie(p.superficie.lagos), abaixoDoMar: p.superficie.abaixoDoMar },
    horizonte: { grade: p.horizonte.grade, faixas, passos },
  };
}

/**
 * Os PNG RGB de um relevo gerado (`rgb[canal]`, W·H·3 bytes na grade
 * `grades[canal]`), codificados com as opções da casa e DECODIFICADOS de
 * volta — o que vai ao disco é o que o portão aprovou —, e o sha256 do RGB
 * de cada canal.
 */
async function pngsRgbDoRelevo(rotulo, rgb, grades) {
  const sha = (b) => createHash('sha256').update(b).digest('hex');
  const png = {};
  const obtidos = {};
  for (const [canal, bytes] of Object.entries(rgb)) {
    const { largura, altura } = grades[canal];
    const cru = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    png[canal] = await sharp(cru, { raw: { width: largura, height: altura, channels: 3 } })
      .png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer();
    const volta = await sharp(png[canal]).raw().toBuffer({ resolveWithObject: true });
    obtidos[canal] = sha(cru);
    if (volta.info.channels !== 3 || sha(volta.data) !== obtidos[canal]) throw new Error(`${rotulo}: o ${canal}.png decodificado não é o ${canal} do gerador.`);
  }
  return { png, obtidos };
}

/**
 * O conjunto da Terra pronto para gravar (`fonte`: uma das três entradas) —
 * o TIFF do ETOPO conferido (`conferirArquivoDoCache`), o relevo, os três
 * PNG decodificados de volta e os sha256 (os três RGB e os números). Feito
 * uma vez por processo para as três entradas (a leitura e o horizonte
 * custam); o portão roda a cada chamada. Exportada para a prova por hash.
 */
export async function conjuntoDaTerra(fonte) {
  const chave = jsonCanonico({ ...fonte.relevoTerra, sha256Aprovado: null });
  if (!RELEVOS_FEITOS.has(chave)) RELEVOS_FEITOS.set(chave, fazConjuntoDaTerra(fonte));
  return RELEVOS_FEITOS.get(chave);
}

async function fazConjuntoDaTerra(fonte) {
  const rotulo = `${fonte.corpo}/${fonte.canal}`;
  const config = fonte.relevoTerra;
  const tif = await readFile(await conferirArquivoDoCache({ ...fonte, arquivoDoCache: config.etopo }));
  const candidato = await parametrosDoCandidato(rotulo, config.candidato);
  console.log(
    `${rotulo}: relevo da Terra, ETOPO 2022 de 60″ → normal ${Terra.NORMAL.largura}×${Terra.NORMAL.altura} e horizonte ` +
      `${Terra.HORIZONTE.largura}×${Terra.HORIZONTE.altura} da grade fina (leva perto de dez minutos em oito fios; ` +
      `${os.availableParallelism()} aqui); ` +
      `versões: node ${process.version}, V8 ${process.versions.v8}, sharp ${sharp.versions.sharp}, libvips ${sharp.versions.vips}`
  );
  const r = await relevoDaTerra({ tif, etopoSha256: config.etopo.sha256 });
  console.log(
    `  lagos ao espelho: ${r.superficie.lagos.map((l) => `${l.nome} ${l.areaKm2} km²`).join(', ')}; ` +
      `${r.superficie.abaixoDoMar} amostras abaixo do mar a 0 m; normal: declive RMS ${r.normal.rmsGraus.toFixed(3)}°, máximo ${r.normal.maxGraus.toFixed(2)}°`
  );
  const { png, obtidos } = await pngsRgbDoRelevo(rotulo, r.rgb, r.grades);
  return {
    png,
    obtidos: { ...obtidos, parametros: createHash('sha256').update(jsonCanonico(r.numeros)).digest('hex') },
    numeros: r.numeros,
    doCandidato: numerosDoCandidatoDaTerra(candidato),
  };
}

/**
 * O PASSO DO RELEVO DA TERRA: o conjunto, o portão (os três canais e os
 * números; sem escala do app — o relevo da Terra só gira a luz e faz
 * sombra, não desloca vértice) e, aprovado, os TRÊS PNG (`normal.png`,
 * `horizon.png`, `horizon2.png` na pasta de `destino`) de uma vez, pela
 * primeira das três entradas que a corrida encontra, com qualquer escopo
 * (`gravaOsCanaisJuntos`). Recusado, o erro leva a mensagem e nada é
 * gravado. Exportada para a prova por hash, que a chama fora de `public/`.
 */
export async function gravaRelevoDaTerra(fonte, destino) {
  const rotulo = `${fonte.corpo}/${fonte.canal}`;
  const config = fonte.relevoTerra;
  const conjunto = await conjuntoDaTerra(fonte);
  const portao = portaoDoRelevo({
    rotulo,
    candidato: config.candidato,
    obtidos: conjunto.obtidos,
    aprovados: config.sha256Aprovado,
    numeros: conjunto.numeros,
    doCandidato: conjunto.doCandidato,
    canais: CANAIS_DA_TERRA,
  });
  if (!portao.grava) throw new Error(portao.mensagem);
  await gravaOsCanaisJuntos(rotulo, destino, conjunto, portao.mensagem);
}

async function main() {
  const argumentos = process.argv.slice(2);
  const indiceOffline = argumentos.indexOf('--offline');
  const diretorioDoador =
    indiceOffline >= 0 ? argumentos[indiceOffline + 1] : null;
  if (indiceOffline >= 0 && !diretorioDoador) {
    throw new Error('--offline exige o diretório do doador (ex.: ~/Github/atlas-orbital).');
  }

  // ESCOPO OPCIONAL, o mesmo do otimiza-texturas: sem corpo nomeado a
  // tabela inteira é adquirida; com corpos, só eles — é o que evita
  // rebaixar 30 texturas para trocar uma; com `corpo/canal`, só aquele
  // canal (o relevo de Jápeto sem o map.jpg, que pede o doador).
  const escopo = new Set(
    argumentos.filter(
      (a, k) => !a.startsWith('--') && !(indiceOffline >= 0 && k === indiceOffline + 1)
    )
  );

  let totalBytes = 0;
  let adquiridas = 0;
  for (const fonte of FONTES) {
    if (escopo.size > 0 && !escopo.has(fonte.corpo) && !escopo.has(`${fonte.corpo}/${fonte.canal}`)) continue;
    const diretorioDestino = path.join(destinoRaiz, fonte.corpo);
    await mkdir(diretorioDestino, { recursive: true });
    // A extensão do destino é sempre a do artefato final — todo PASSO DA
    // CASA (bake do PBR, mosaico de Ceres, giro de Vesta e das seis luas)
    // entrega jpg, MENOS os canais de dado, que saem em png; as demais
    // fontes já chegam jpg/png na origem; URL de PÁGINA — o caso NASA 3D e
    // o do projeto Saturn, que só existem no modo offline — herda a
    // extensão do nome no doador.
    // Fonte LOCAL (item 148): o arquivo já mora no repositório
    // (`scripts/data/atlas/fonte/`) e só é reencodado no formato do canal.
    const passoDaCasa =
      fonte.bake || fonte.giroDeLongitudeGraus !== undefined || fonte.arquivoLocal
      || fonte.preencherVazio || fonte.relevoJapeto || fonte.relevoReia || fonte.relevoTerra;
    const extensao = passoDaCasa
      ? (CANAIS_DE_DADO.has(fonte.canal) ? 'png' : 'jpg')
      : path.extname(new URL(fonte.url).pathname).slice(1) ||
        path.extname(fonte.nomeNoDoador).slice(1);
    const destino = path.join(diretorioDestino, `${fonte.canal}.${extensao}`);

    // ---- aquisição: o arquivo CRU chega ao lugar onde vai ser trabalhado
    // (o próprio destino quando não há passo da casa; o temporário quando há).
    const cru = passoDaCasa
      ? path.join(
          os.tmpdir(),
          `atlas-tex-${fonte.corpo}-${fonte.canal}${
            path.extname(new URL(fonte.url).pathname) ||
            path.extname(fonte.nomeNoDoador ?? '.bin')
          }`
        )
      : destino;
    // Offline: cópia ARQUIVO A ARQUIVO do doador (nunca a pasta). Entrada
    // SEM par no doador — o mosaico Dawn de Ceres e os dois da New Horizons
    // (item 149) — baixa da fonte mesmo aqui: o doador nunca as teve, e
    // fingir o contrário quebraria o modo. Entrada com `arquivoDoCache`
    // (item 230) não baixa nunca, nem copia do doador: confere e copia.
    if (fonte.relevoJapeto || fonte.relevoReia || fonte.relevoTerra) {
      // nada a adquirir (item 230, PLAN-REIA.md, relevo da Terra): o gerador
      // lê o map.jpg da casa e o Gazetteer, o DTM ou o ETOPO do cache,
      // conferidos por sha256 no passo
    } else if (fonte.arquivoDoCache) {
      await copyFile(await conferirArquivoDoCache(fonte), cru);
    } else if (fonte.arquivoLocal) {
      await copyFile(
        path.resolve(path.dirname(fileURLToPath(import.meta.url)), fonte.arquivoLocal), cru
      );
    } else if (diretorioDoador && fonte.nomeNoDoador) {
      await copyFile(
        path.join(diretorioDoador, 'public', 'textures', fonte.nomeNoDoador), cru
      );
    } else {
      await baixar(fonte.url, cru);
    }

    // ---- o passo da casa, quando existe
    if (passoDaCasa) {
      try {
        if (fonte.relevoJapeto) await gravaRelevoDeJapeto(fonte, destino);
        else if (fonte.relevoReia) await gravaRelevoDeReia(fonte, destino);
        else if (fonte.relevoTerra) await gravaRelevoDaTerra(fonte, destino);
        else if (fonte.arquivoLocal && !fonte.bake) {
          await girarMapa(cru, destino, fonte.canal, {
            larguraDoDestino: fonte.larguraDoDestino,
          });
        } else if (fonte.bake === 'mosaico-ceres') await assarMosaicoDeCeres(cru, destino);
        else if (fonte.bake === 'ilustracao-ia') await assarIlustracaoIA(cru, destino, fonte.corpo);
        else if (fonte.bake === 'roughness') await assarRoughness(cru, destino);
        else await girarMapa(cru, destino, fonte.canal, opcoesDoMapa(fonte));
      } finally {
        await unlink(cru).catch(() => {});
      }
    }

    const medido = await validarImagem(destino, fonte.minimoBytes ?? MINIMO_DE_BYTES);
    totalBytes += medido.bytes;
    adquiridas += 1;
    console.log(
      `${fonte.corpo}/${fonte.canal}: ${medido.largura}x${medido.altura} ` +
        `${medido.formato}, ${(medido.bytes / 1048576).toFixed(2)} MB ` +
        `(${fonte.relevoJapeto || fonte.relevoReia || fonte.relevoTerra ? 'gerado nesta casa' : fonte.arquivoDoCache ? 'cache local' : diretorioDoador && fonte.nomeNoDoador ? 'offline, doador' : 'rede'}).`
    );
  }
  console.log(
    `${adquiridas} fontes em public/textures/atlas/, ` +
      `${(totalBytes / 1048576).toFixed(2)} MB. ` +
      'Agora: npm run data:texturas (escada + webp + manifest).'
  );
}

// só a LINHA DE COMANDO adquire; importado (o portão da cor em
// `cor-inventada.test.mjs`, a prova de reprodução) o arquivo não roda nada.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
