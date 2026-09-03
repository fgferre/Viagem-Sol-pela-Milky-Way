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
//   - PBR da Terra (normal + roughness) — via WAYBACK MACHINE
//     (checklist item 14): o host canônico responde 403 a
//     User-Agent não-browser; os TIFFs de normal/especular saem
//     de web.archive.org e o bake converte para jpg. ATENÇÃO: o
//     roughness é o ESPECULAR INVERTIDO (negate) — o SSS pinta
//     oceano CLARO (=reflexivo) e o roughnessMap do three espera
//     0=espelho; copiar sem inverter dá oceano fosco e continente
//     espelhado, plausível e errado.
//   - NASA 3D resources — https://science.nasa.gov/3d-resources/
//     (fases futuras: Deimos etc.; nenhuma entrada nesta rodada).
//   - Projeto Saturn do dono — https://github.com/fgferre/Saturn
//     (item 138): os mosaicos globais Cassini de Paul Schenk
//     (PIA18434–18439, NASA/JPL-Caltech/SSI/LPI, domínio público)
//     graduados por ele. São SEIS entradas — mimas, enceladus,
//     tethys, dione, rhea e iapetus —, e o `--offline` delas quer o
//     diretório do SATURN, não o do atlas-orbital: os nomes são
//     `public/textures/<lua>.jpg`. Os mapas de altura/normal das
//     mesmas seis (item 134/S2) nunca entraram nesta tabela; a
//     proveniência dos dois casos mora em docs/reference/ASSETS.md.
//     Mesma família, item 141 (3ª fase): o mapa de cor de VESTA é o
//     mosaico da Dawn do modelo 3D da NASA GIRADO 150° para a IAU — o
//     produto original está no sistema "Claudia" com que a sonda operou,
//     e a casa orienta Vesta pelo outro.
//   - USGS Astrogeology — https://astrogeology.usgs.gov/ (bytes em
//     asc-pds-services.s3…, o mesmo host de onde `gera-normal-de-dem.mjs`
//     lê os DEMs). Entrou no item 141 (3ª fase) com o mosaico global da
//     Dawn para CERES, que substitui o `2k_ceres_fictional` do SSS — a
//     única textura da casa cuja própria fonte se declarava inventada.
//     Pendentes: mosaicos Titan/Europa da bancada; crédito redigido
//     ANTES de qualquer promoção — docs/reference/ASSETS.md.
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
// ESCOPO OPCIONAL (o mesmo do otimiza-texturas): sem corpo nomeado, a
// tabela inteira; com corpos, só eles.
//
//   node scripts/data/atlas/baixa-texturas.mjs --offline ~/Github/atlas-orbital
//   node scripts/data/atlas/baixa-texturas.mjs            (rede, reprodutibilidade)
//   node scripts/data/atlas/baixa-texturas.mjs --offline ~/Github/atlas-orbital ceres vesta
// ============================================================

import { createWriteStream } from 'node:fs';
import { copyFile, mkdir, readFile, stat, unlink } from 'node:fs/promises';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { giraColunasDeImagem, hostPermitido } from './lib-texturas.mjs';

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

// ---- A tabela de fontes desta rodada (F2a: Terra + Lua). As fases
// seguintes fazem APPEND aqui — uma linha por arquivo, com a URL de
// reprodutibilidade e o nome que o arquivo tem no doador local.
// `bake` marca as entradas cujo caminho online baixa um TIFF e assa
// (normal: reencode jpg; roughness: grayscale + NEGATE — a inversão
// do item 14); no offline elas copiam o jpg já assado do doador.
const FONTES = [
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
  {
    corpo: 'earth',
    canal: 'normal',
    url: `${WAYBACK}/2024/https://www.solarsystemscope.com/textures/download/8k_earth_normal_map.tif`,
    nomeNoDoador: '8k_earth_normal_map.jpg',
    bake: 'normal',
  },
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
  // ---- F4 (gigantes + anel). SSS CC BY 4.0, a mesma linha Terra/Lua/
  // Mercúrio. Urano/Netuno entram pelo incumbente 2k (não há 8k SSS).
  // A placa do anel é o alpha 8k (W5-B do doador). Júpiteres sem
  // licença clara no doador (jupiter_vgr1_2025.jpg etc.) NÃO entram.
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
    corpo: 'saturn',
    canal: 'ring',
    url: `${SSS}/8k_saturn_ring_alpha.png`,
    nomeNoDoador: '8k_saturn_ring_alpha.png',
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
  // 2k_europa do doador NÃO entram (licença não documentada). Os
  // mosaicos USGS/Cassini ficam de fora nesta fase (bancada: Titã
  // monocromático com costuras; Europa com 68 linhas pretas no polo
  // sul — pendência nomeada, não promoção). Titã NASA 3D tem 49 KB
  // (720×360): o piso de 50 KB da tabela cederia um falso-negativo.
  {
    corpo: 'io',
    canal: 'map',
    url: 'https://science.nasa.gov/3d-resources/jupiter-io-b/',
    nomeNoDoador: 'io_nasa_3d_resource.jpg',
  },
  {
    corpo: 'europa',
    canal: 'map',
    url: 'https://science.nasa.gov/3d-resources/',
    nomeNoDoador: 'europa_nasa_3d_resource.jpg',
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
  {
    corpo: 'mimas',
    canal: 'map',
    url: 'https://github.com/fgferre/Saturn',
    nomeNoDoador: 'mimas.jpg',
  },
  {
    corpo: 'enceladus',
    canal: 'map',
    url: 'https://github.com/fgferre/Saturn',
    nomeNoDoador: 'enceladus.jpg',
  },
  {
    corpo: 'tethys',
    canal: 'map',
    url: 'https://github.com/fgferre/Saturn',
    nomeNoDoador: 'tethys.jpg',
  },
  {
    corpo: 'dione',
    canal: 'map',
    url: 'https://github.com/fgferre/Saturn',
    nomeNoDoador: 'dione.jpg',
  },
  {
    corpo: 'rhea',
    canal: 'map',
    url: 'https://github.com/fgferre/Saturn',
    nomeNoDoador: 'rhea.jpg',
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
  },
  {
    corpo: 'miranda',
    canal: 'map',
    url: 'https://science.nasa.gov/3d-resources/',
    nomeNoDoador: 'miranda_nasa_3d_resource.jpg',
  },
  {
    corpo: 'ariel',
    canal: 'map',
    url: 'https://science.nasa.gov/3d-resources/',
    nomeNoDoador: 'ariel_nasa_3d_resource.jpg',
  },
  {
    corpo: 'umbriel',
    canal: 'map',
    url: 'https://science.nasa.gov/3d-resources/',
    nomeNoDoador: 'umbriel_nasa_3d_resource.jpg',
  },
  {
    corpo: 'titania',
    canal: 'map',
    url: 'https://science.nasa.gov/3d-resources/',
    nomeNoDoador: 'titania_nasa_3d_resource.jpg',
  },
  {
    corpo: 'oberon',
    canal: 'map',
    url: 'https://science.nasa.gov/3d-resources/',
    nomeNoDoador: 'oberon_nasa_3d_resource.jpg',
  },
  {
    corpo: 'triton',
    canal: 'map',
    url: 'https://science.nasa.gov/3d-resources/',
    nomeNoDoador: 'triton_nasa_3d_resource.jpg',
  },
  // ---- F6 (anões). Plutão/Caronte: NASA 3D Resources, crédito
  // redigido. Ceres: o mosaico REAL da Dawn (item 141, 3ª fase) no
  // lugar do `2k_ceres_fictional` que a própria fonte declarava
  // inventado. Haumea/Makemake/Eris/Quaoar NÃO baixam mapa (procedurais).
  {
    corpo: 'pluto',
    canal: 'map',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Pluto',
    nomeNoDoador: 'pluto_nasa_3d_resource.jpg',
  },
  {
    corpo: 'charon',
    canal: 'map',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Pluto%20-%20Charon',
    nomeNoDoador: 'charon_nasa_3d_resource.jpg',
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
  // NASA Science (crédito NASA/JPL-Caltech/UCLA/MPS/DLR/IDA). Hígia:
  // mapa VLT ESO CC BY 4.0. Palas sem mapa com licença — não entra.
  // Modelos GLB/OBJ (DAMIT CC BY / NASA) ficam pendentes (sem
  // GLTFLoader/OBJLoader na casa).
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
  {
    corpo: 'hygiea',
    canal: 'map',
    url: 'https://commons.wikimedia.org/wiki/File:Hygiea_VLT_2017-2018_map.png',
    nomeNoDoador: 'hygiea_vlt_2017_2018_map.png',
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

/** Bake do PBR da Terra (vendorizado de bake-earth-pbr.js, item 14). */
async function assarPbr(tiffPath, destino, tipo) {
  const fonte = sharp(await readFile(tiffPath));
  if (tipo === 'roughness') {
    // A INVERSÃO: especular do SSS (oceano claro = reflexivo) vira
    // roughness (0 = espelho) por negate. Opções idênticas às do
    // bake do doador para minimizar divergência entre os modos.
    await fonte
      .grayscale()
      .negate({ alpha: false })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(destino);
  } else {
    await fonte
      .jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true })
      .toFile(destino);
  }
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

/** Gira um mapa já adquirido para a convenção de longitude da casa. */
async function girarMapa(origem, destino, giroGraus) {
  const { data, info } = await sharp(origem, { limitInputPixels: false })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const girado = giraColunasDeImagem(
    data, info.width, info.height, info.channels, giroGraus
  );
  await sharp(girado, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toFile(destino);
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
  // rebaixar 30 texturas para trocar uma.
  const escopo = new Set(
    argumentos.filter(
      (a, k) => !a.startsWith('--') && !(indiceOffline >= 0 && k === indiceOffline + 1)
    )
  );

  let totalBytes = 0;
  let adquiridas = 0;
  for (const fonte of FONTES) {
    if (escopo.size > 0 && !escopo.has(fonte.corpo)) continue;
    const diretorioDestino = path.join(destinoRaiz, fonte.corpo);
    await mkdir(diretorioDestino, { recursive: true });
    // A extensão do destino é sempre a do artefato final — todo PASSO DA
    // CASA (bake do PBR, mosaico de Ceres, giro de Vesta) entrega jpg; as
    // demais fontes já chegam jpg/png na origem; URL de PÁGINA — o caso
    // NASA 3D, que só existe no modo offline — herda a extensão do nome
    // no doador.
    const passoDaCasa = fonte.bake || fonte.giroDeLongitudeGraus !== undefined;
    const extensao = passoDaCasa
      ? 'jpg'
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
    // SEM par no doador — o mosaico Dawn de Ceres — baixa da fonte mesmo
    // aqui: o doador nunca a teve, e fingir o contrário quebraria o modo.
    if (diretorioDoador && fonte.nomeNoDoador) {
      await copyFile(
        path.join(diretorioDoador, 'public', 'textures', fonte.nomeNoDoador), cru
      );
    } else {
      await baixar(fonte.url, cru);
    }

    // ---- o passo da casa, quando existe
    if (passoDaCasa) {
      try {
        if (fonte.bake === 'mosaico-ceres') await assarMosaicoDeCeres(cru, destino);
        else if (fonte.bake) await assarPbr(cru, destino, fonte.bake);
        else await girarMapa(cru, destino, fonte.giroDeLongitudeGraus);
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
        `(${diretorioDoador && fonte.nomeNoDoador ? 'offline, doador' : 'rede'}).`
    );
  }
  console.log(
    `${adquiridas} fontes em public/textures/atlas/, ` +
      `${(totalBytes / 1048576).toFixed(2)} MB. ` +
      'Agora: npm run data:texturas (escada + webp + manifest).'
  );
}

await main();
