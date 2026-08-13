#!/usr/bin/env node

// ============================================================
// Gera public/data/atlas/texturas.json — o manifest de texturas
// do atlas: UMA entrada por VARIANTE em public/textures/atlas/,
// com dimensões MEDIDAS pelo sharp (nunca pelo nome — a
// armadilha que cegou Júpiter/Urano no doador por três meses:
// `8k_jupiter.jpg` tinha 4096 px e ninguém mediu), bytes,
// sha256 e ORIGEM por entrada.
//
// POLÍTICA DE LICENÇA (decisão do DONO, abertura da Onda 6,
// 2026-08-12): o app é grátis, open-source e educativo — textura
// em tudo, a melhor possível; licença/origem documentada com o
// MELHOR que se achar POR ENTRADA (afirmação só vale como linha
// deste manifest com fonte, nunca de memória — emenda P-E13);
// origem NÃO RESOLVIDA entra MARCADA (`proveniencia:
// 'nao-resolvida'`, licença 'nao-resolvida') em vez de ficar de
// fora. Atribuições obrigatórias (CC BY, USGS com crédito
// redigido, NASA) preservadas SEMPRE — o verify cobra atribuição
// não-vazia em toda licença que a exige.
//
// PROVENIÊNCIA por entrada:
//   - 'medido'        — bytes da fonte declarada, como publicados
//                       por ela (só re-hospedados aqui);
//   - 'derivado'      — saiu de um processamento nosso ou do
//                       doador (reamostragem da escada, webp,
//                       o roughness = especular INVERTIDO do
//                       bake — checklist item 14);
//   - 'nao-resolvida' — a política do dono acima: entra, marcada.
//
// DETERMINÍSTICO: sem timestamp, entradas ordenadas por
// (corpo, canal, arquivo); rodar de novo com a árvore parada
// produz JSON bit-idêntico (disciplina do stars.bin/corpos.json).
//
//   node scripts/data/atlas/gera-manifest-texturas.mjs
// ============================================================

import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { sha256 } from '../lib/binary.mjs';
import { analisarNomeDeTextura } from './lib-texturas.mjs';

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
);
const publicDirectory = path.join(rootDirectory, 'public');
const texturasRaiz = path.join(publicDirectory, 'textures', 'atlas');
const manifestPath = path.join(publicDirectory, 'data', 'atlas', 'texturas.json');

// ---- Origem por corpo/canal. As fases seguintes fazem APPEND.
// `proveniencia` aqui é a da FONTE (`<canal>.<ext>`); toda variante
// derivada dela (escada/webp) rebaixa para 'derivado' na emissão.
const ATRIBUICAO_SSS =
  'Texturas: Solar System Scope (solarsystemscope.com/textures), CC BY 4.0.';
const ORIGENS = {
  'earth/map': {
    fonte: 'Solar System Scope — 8k_earth_daymap',
    url: 'https://www.solarsystemscope.com/textures/download/8k_earth_daymap.jpg',
    licenca: 'CC BY 4.0',
    atribuicao: ATRIBUICAO_SSS,
    proveniencia: 'medido',
  },
  'earth/clouds': {
    fonte: 'Solar System Scope — 8k_earth_clouds',
    url: 'https://www.solarsystemscope.com/textures/download/8k_earth_clouds.jpg',
    licenca: 'CC BY 4.0',
    atribuicao: ATRIBUICAO_SSS,
    proveniencia: 'medido',
  },
  'earth/night': {
    fonte: 'Solar System Scope — 8k_earth_nightmap',
    url: 'https://www.solarsystemscope.com/textures/download/8k_earth_nightmap.jpg',
    licenca: 'CC BY 4.0',
    atribuicao: ATRIBUICAO_SSS,
    proveniencia: 'medido',
  },
  'earth/normal': {
    fonte:
      'Solar System Scope — 8k_earth_normal_map.tif via Wayback Machine, ' +
      'reencodado jpg (bake-earth-pbr do doador)',
    url: 'https://web.archive.org/web/2024/https://www.solarsystemscope.com/textures/download/8k_earth_normal_map.tif',
    licenca: 'CC BY 4.0',
    atribuicao: ATRIBUICAO_SSS,
    // derivado JÁ na fonte: TIFF→jpg é reencode nosso/do doador.
    proveniencia: 'derivado',
  },
  'earth/roughness': {
    fonte:
      'Solar System Scope — 8k_earth_specular_map.tif via Wayback Machine, ' +
      'INVERTIDO (negate) para roughness — o SSS pinta oceano claro ' +
      '(=reflexivo) e o roughnessMap espera 0=espelho (checklist item 14)',
    url: 'https://web.archive.org/web/2025/https://www.solarsystemscope.com/textures/download/8k_earth_specular_map.tif',
    licenca: 'CC BY 4.0',
    atribuicao: ATRIBUICAO_SSS,
    proveniencia: 'derivado',
  },
  'moon/map': {
    fonte: 'Solar System Scope — 8k_moon',
    url: 'https://www.solarsystemscope.com/textures/download/8k_moon.jpg',
    licenca: 'CC BY 4.0',
    atribuicao: ATRIBUICAO_SSS,
    proveniencia: 'medido',
  },
  // ---- F3 (rochosos). Vênus é o TOPO DE NUVENS (o que se vê do
  // espaço); a superfície de radar do SSS não entra — dito na FONTES.
  'mercury/map': {
    fonte: 'Solar System Scope — 8k_mercury',
    url: 'https://www.solarsystemscope.com/textures/download/8k_mercury.jpg',
    licenca: 'CC BY 4.0',
    atribuicao: ATRIBUICAO_SSS,
    proveniencia: 'medido',
  },
  'venus/map': {
    fonte: 'Solar System Scope — 4k_venus_atmosphere (topo de nuvens)',
    url: 'https://www.solarsystemscope.com/textures/download/4k_venus_atmosphere.jpg',
    licenca: 'CC BY 4.0',
    atribuicao: ATRIBUICAO_SSS,
    proveniencia: 'medido',
  },
  'mars/map': {
    fonte: 'Solar System Scope — 8k_mars',
    url: 'https://www.solarsystemscope.com/textures/download/8k_mars.jpg',
    licenca: 'CC BY 4.0',
    atribuicao: ATRIBUICAO_SSS,
    proveniencia: 'medido',
  },
  // Fobos/Deimos: textura dos modelos 3D da NASA (a página é a fonte;
  // o arquivo nasceu no doador por extração manual do pacote glTF).
  'phobos/map': {
    fonte: 'NASA 3D Resources — modelo 3D de Fobos (textura)',
    url: 'https://science.nasa.gov/resource/phobos-mars-moon-3d-model/',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'deimos/map': {
    fonte: 'NASA 3D Resources — modelo 3D de Deimos (textura)',
    url: 'https://science.nasa.gov/resource/deimos-mars-moon-3d-model/',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  // ---- F4 (gigantes + anel). Mesma linha SSS CC BY 4.0. O 8k_jupiter
  // do SSS mede 4096 px (a armadilha do nome — o manifest re-mede).
  'jupiter/map': {
    fonte: 'Solar System Scope — 8k_jupiter',
    url: 'https://www.solarsystemscope.com/textures/download/8k_jupiter.jpg',
    licenca: 'CC BY 4.0',
    atribuicao: ATRIBUICAO_SSS,
    proveniencia: 'medido',
  },
  'saturn/map': {
    fonte: 'Solar System Scope — 8k_saturn',
    url: 'https://www.solarsystemscope.com/textures/download/8k_saturn.jpg',
    licenca: 'CC BY 4.0',
    atribuicao: ATRIBUICAO_SSS,
    proveniencia: 'medido',
  },
  'saturn/ring': {
    fonte: 'Solar System Scope — 8k_saturn_ring_alpha (placa alpha)',
    url: 'https://www.solarsystemscope.com/textures/download/8k_saturn_ring_alpha.png',
    licenca: 'CC BY 4.0',
    atribuicao: ATRIBUICAO_SSS,
    proveniencia: 'medido',
  },
  'uranus/map': {
    fonte: 'Solar System Scope — 2k_uranus (incumbente; sem 8k SSS)',
    url: 'https://www.solarsystemscope.com/textures/download/2k_uranus.jpg',
    licenca: 'CC BY 4.0',
    atribuicao: ATRIBUICAO_SSS,
    proveniencia: 'medido',
  },
  'neptune/map': {
    fonte: 'Solar System Scope — 2k_neptune (incumbente; sem 8k SSS)',
    url: 'https://www.solarsystemscope.com/textures/download/2k_neptune.jpg',
    licenca: 'CC BY 4.0',
    atribuicao: ATRIBUICAO_SSS,
    proveniencia: 'medido',
  },
  // ---- F5 (luas). NASA 3D Resources, crédito redigido. 2k_titan /
  // 2k_europa sem licença NÃO entram; mosaicos USGS/Cassini ficam
  // pendentes da bancada (Titã: costuras; Europa: 68 linhas pretas).
  'io/map': {
    fonte: 'NASA 3D Resources — Io (B)',
    url: 'https://science.nasa.gov/3d-resources/jupiter-io-b/',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'europa/map': {
    fonte: 'NASA 3D Resources — Europa (mapa global; mono declarado)',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Jupiter%20-%20Europa',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'ganymede/map': {
    fonte: 'NASA 3D Resources — Ganimedes',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Jupiter%20-%20Ganymede',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'callisto/map': {
    fonte: 'NASA 3D Resources — Calisto',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Jupiter%20-%20Callisto',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'mimas/map': {
    fonte: 'NASA 3D Resources — Mimas',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Saturn%20-%20Mimas',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'enceladus/map': {
    fonte: 'NASA 3D Resources — Encélado',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Saturn%20-%20Enceladus',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'tethys/map': {
    fonte: 'NASA 3D Resources — Tétis',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Saturn%20-%20Tethys',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'dione/map': {
    fonte: 'NASA 3D Resources — Dione',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Saturn%20-%20Dione',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'rhea/map': {
    fonte: 'NASA 3D Resources — Reia',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Saturn%20-%20Rhea',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'titan/map': {
    fonte: 'NASA 3D Resources — Titã (720×360, névoa; mosaico Cassini fica pendente da bancada)',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Saturn%20-%20Titan',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'iapetus/map': {
    fonte: 'NASA 3D Resources — Jápeto',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Saturn%20-%20Iapetus',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'miranda/map': {
    fonte: 'NASA 3D Resources — Miranda',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Uranus%20-%20Miranda',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'ariel/map': {
    fonte: 'NASA 3D Resources — Ariel',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Uranus%20-%20Ariel',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'umbriel/map': {
    fonte: 'NASA 3D Resources — Umbriel',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Uranus%20-%20Umbriel',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'titania/map': {
    fonte: 'NASA 3D Resources — Titânia',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Uranus%20-%20Titania',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'oberon/map': {
    fonte: 'NASA 3D Resources — Oberon',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Uranus%20-%20Oberon',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'triton/map': {
    fonte: 'NASA 3D Resources — Tritão',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Neptune%20-%20Triton',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  // ---- F6 (anões). NASA 3D para Plutão/Caronte. Ceres SSS
  // fictional (CC BY 4.0) — a fonte admite invenção; mosaico Dawn
  // USGS fica pendente. Procedurais (Haumea/Makemake/Eris) sem mapa.
  'pluto/map': {
    fonte: 'NASA 3D Resources — Plutão (720×360)',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Pluto',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'charon/map': {
    fonte: 'NASA 3D Resources — Caronte (720×360)',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Pluto%20-%20Charon',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'ceres/map': {
    fonte: 'Solar System Scope — 2k_ceres_fictional (inventado na fonte; mosaico Dawn USGS pendente)',
    url: 'https://www.solarsystemscope.com/textures/download/2k_ceres_fictional.jpg',
    licenca: 'CC BY 4.0',
    atribuicao: ATRIBUICAO_SSS,
    proveniencia: 'medido',
  },
  // ---- F7 (asteroides). Vesta Dawn (NASA Science 3D model);
  // Hígia VLT CC BY 4.0. Palas sem mapa licenciado.
  'vesta/map': {
    fonte: 'NASA Science / Dawn — mosaico de Vesta embutido no modelo 3D',
    url: 'https://science.nasa.gov/resource/vesta-3d-model/',
    licenca: 'NASA images and media usage guidelines',
    atribuicao: 'Textura: NASA/JPL-Caltech/UCLA/MPS/DLR/IDA — Dawn.',
    proveniencia: 'medido',
  },
  'hygiea/map': {
    fonte: 'ESO VLT — mapa de Hígia (2017–2018), Wikimedia CC BY 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Hygiea_VLT_2017-2018_map.png',
    licenca: 'CC BY 4.0',
    atribuicao: 'Textura: ESO / VLT / Vernazza et al. — CC BY 4.0.',
    proveniencia: 'medido',
  },
};

// A marca da política do dono: arquivo presente sem linha em ORIGENS
// não fica de fora nem derruba o build — entra ASSIM, e o registro
// da onda herda a pendência por este texto.
const ORIGEM_NAO_RESOLVIDA = {
  fonte: null,
  url: null,
  licenca: 'nao-resolvida',
  atribuicao: null,
  proveniencia: 'nao-resolvida',
};

async function listarArquivos(diretorio) {
  const resultado = [];
  const entradas = (await readdir(diretorio, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name, 'en')
  );
  for (const entrada of entradas) {
    const alvo = path.join(diretorio, entrada.name);
    if (entrada.isDirectory()) resultado.push(...(await listarArquivos(alvo)));
    else resultado.push(alvo);
  }
  return resultado;
}

async function main() {
  const entradas = [];
  for (const arquivo of await listarArquivos(texturasRaiz)) {
    const corpo = path.basename(path.dirname(arquivo));
    const { canal, ehFonte } = analisarNomeDeTextura(path.basename(arquivo));
    const origem = ORIGENS[`${corpo}/${canal}`];
    if (!origem) {
      console.warn(
        `AVISO: ${corpo}/${path.basename(arquivo)} sem origem em ORIGENS — ` +
          'entra MARCADA como nao-resolvida (política do dono).'
      );
    }
    const declarada = origem ?? ORIGEM_NAO_RESOLVIDA;
    // Dimensões MEDIDAS — o nome do arquivo nunca é fonte de verdade.
    const meta = await sharp(arquivo).metadata();
    const { size } = await stat(arquivo);
    entradas.push({
      corpo,
      canal,
      arquivo: path.relative(publicDirectory, arquivo),
      larguraPx: meta.width,
      alturaPx: meta.height,
      bytes: size,
      sha256: sha256(await readFile(arquivo)),
      origem: {
        fonte: declarada.fonte,
        url: declarada.url,
        licenca: declarada.licenca,
        atribuicao: declarada.atribuicao,
      },
      proveniencia: ehFonte ? declarada.proveniencia : 'derivado',
    });
  }

  entradas.sort(
    (a, b) =>
      a.corpo.localeCompare(b.corpo, 'en') ||
      a.canal.localeCompare(b.canal, 'en') ||
      a.arquivo.localeCompare(b.arquivo, 'en')
  );

  const manifest = {
    formato: 'texturas-atlas-v1',
    geradoPor: 'scripts/data/atlas/gera-manifest-texturas.mjs',
    entradas,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const totalBytes = entradas.reduce((soma, e) => soma + e.bytes, 0);
  const naoResolvidas = entradas.filter(
    (e) => e.origem.licenca === 'nao-resolvida'
  ).length;
  console.log(
    `texturas.json: ${entradas.length} variantes, ` +
      `${(totalBytes / 1048576).toFixed(2)} MB em disco, ` +
      `${naoResolvidas} com origem não resolvida.`
  );
}

await main();
