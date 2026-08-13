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
//   - USGS Astrogeology — https://astrogeology.usgs.gov/
//     (fases futuras: mosaicos Titan/Europa da bancada; crédito
//     redigido ANTES de qualquer promoção — ATLAS-LICENCAS.md).
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
//   node scripts/data/atlas/baixa-texturas.mjs --offline ~/Github/atlas-orbital
//   node scripts/data/atlas/baixa-texturas.mjs            (rede, reprodutibilidade)
// ============================================================

import { createWriteStream } from 'node:fs';
import { copyFile, mkdir, readFile, stat, unlink } from 'node:fs/promises';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { hostPermitido } from './lib-texturas.mjs';

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
    url: 'https://science.nasa.gov/3d-resources/',
    nomeNoDoador: 'mimas_nasa_3d_resource.jpg',
  },
  {
    corpo: 'enceladus',
    canal: 'map',
    url: 'https://science.nasa.gov/3d-resources/',
    nomeNoDoador: 'enceladus_nasa_3d_resource.jpg',
  },
  {
    corpo: 'tethys',
    canal: 'map',
    url: 'https://science.nasa.gov/3d-resources/',
    nomeNoDoador: 'tethys_nasa_3d_resource.jpg',
  },
  {
    corpo: 'dione',
    canal: 'map',
    url: 'https://science.nasa.gov/3d-resources/',
    nomeNoDoador: 'dione_nasa_3d_resource.jpg',
  },
  {
    corpo: 'rhea',
    canal: 'map',
    url: 'https://science.nasa.gov/3d-resources/',
    nomeNoDoador: 'rhea_nasa_3d_resource.jpg',
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
    url: 'https://science.nasa.gov/3d-resources/',
    nomeNoDoador: 'iapetus_nasa_3d_resource.jpg',
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
  // redigido. Ceres: SSS CC BY 4.0 mas FICTIONAL na fonte (não há
  // NASA 3D nem 2k real no SSS); mosaico Dawn USGS fica pendente.
  // Haumea/Makemake/Eris/Quaoar NÃO baixam mapa (procedurais).
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
    url: `${SSS}/2k_ceres_fictional.jpg`,
    nomeNoDoador: 'ceres_sss_fictional.jpg',
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

async function main() {
  const argumentos = process.argv.slice(2);
  const indiceOffline = argumentos.indexOf('--offline');
  const diretorioDoador =
    indiceOffline >= 0 ? argumentos[indiceOffline + 1] : null;
  if (indiceOffline >= 0 && !diretorioDoador) {
    throw new Error('--offline exige o diretório do doador (ex.: ~/Github/atlas-orbital).');
  }

  let totalBytes = 0;
  for (const fonte of FONTES) {
    const diretorioDestino = path.join(destinoRaiz, fonte.corpo);
    await mkdir(diretorioDestino, { recursive: true });
    // A extensão do destino é sempre a do artefato final (o bake
    // converte TIFF→jpg; as demais fontes já são jpg/png na origem;
    // URL de PÁGINA — o caso NASA 3D, que só existe no modo offline —
    // herda a extensão do nome no doador).
    const extensao = fonte.bake
      ? 'jpg'
      : path.extname(new URL(fonte.url).pathname).slice(1) ||
        path.extname(fonte.nomeNoDoador).slice(1);
    const destino = path.join(diretorioDestino, `${fonte.canal}.${extensao}`);

    if (diretorioDoador) {
      // ---- offline: cópia ARQUIVO A ARQUIVO do doador (nunca a pasta).
      const origem = path.join(diretorioDoador, 'public', 'textures', fonte.nomeNoDoador);
      await copyFile(origem, destino);
    } else if (fonte.bake) {
      // ---- online com bake: TIFF do Wayback para tmp, assa, descarta.
      const tmp = path.join(
        os.tmpdir(),
        `atlas-tex-${fonte.corpo}-${fonte.canal}.tif`
      );
      await baixar(fonte.url, tmp);
      try {
        await assarPbr(tmp, destino, fonte.bake);
      } finally {
        await unlink(tmp).catch(() => {});
      }
    } else {
      await baixar(fonte.url, destino);
    }

    const medido = await validarImagem(destino, fonte.minimoBytes ?? MINIMO_DE_BYTES);
    totalBytes += medido.bytes;
    console.log(
      `${fonte.corpo}/${fonte.canal}: ${medido.largura}x${medido.altura} ` +
        `${medido.formato}, ${(medido.bytes / 1048576).toFixed(2)} MB ` +
        `(${diretorioDoador ? 'offline, doador' : 'rede'}).`
    );
  }
  console.log(
    `${FONTES.length} fontes em public/textures/atlas/, ` +
      `${(totalBytes / 1048576).toFixed(2)} MB. ` +
      'Agora: npm run data:texturas (escada + webp + manifest).'
  );
}

await main();
