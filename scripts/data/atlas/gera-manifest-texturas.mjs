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
// A CONFISSÃO SAI DO ASSETS.md (item 74 parte B, 2026-08-22, que
// fecha os itens 19 e 20). A ficha do objeto imprime, na seção "a
// imagem", o defeito MEDIDO de cada mapa — a cor de Ceres que não é
// medida, as emendas de Titã, as 68 linhas de Europa, Vênus sem foto
// em luz visível — e a forma dos quatro corpos que são elipsoide
// tendo malha publicada. Esses vereditos já moram, inteiros, em
// `docs/reference/ASSETS.md`; então é ELE que este gerador lê, numa
// seção de tabelas com título fixo. Copiá-los para cá criaria a
// segunda cópia que o próprio ASSETS existe para não ter — e seria a
// cópia que envelhece calada, porque quem edita o veredito edita o
// documento. O gerador FALHA se a seção sumir, se uma linha vier
// malformada ou se citar um corpo/canal fora de `ORIGENS`.
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
import { analisarNomeDeTextura, lerTabelasDaConfissao } from './lib-texturas.mjs';
import { bilingue } from './texturas-em-ingles.mjs';

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
    fonte:
      'Mosaico global Cassini de Mimas (Paul Schenk, PIA18434) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    url: 'https://github.com/fgferre/Saturn',
    licenca: 'domínio público (NASA/JPL-Caltech/SSI/LPI)',
    atribuicao:
      'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18434). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    proveniencia: 'derivado',
  },
  'enceladus/map': {
    fonte:
      'Mosaico global Cassini de Encélado (Paul Schenk, PIA18435) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    url: 'https://github.com/fgferre/Saturn',
    licenca: 'domínio público (NASA/JPL-Caltech/SSI/LPI)',
    atribuicao:
      'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18435). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    proveniencia: 'derivado',
  },
  'tethys/map': {
    fonte:
      'Mosaico global Cassini de Tétis (Paul Schenk, PIA18436) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    url: 'https://github.com/fgferre/Saturn',
    licenca: 'domínio público (NASA/JPL-Caltech/SSI/LPI)',
    atribuicao:
      'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18436). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    proveniencia: 'derivado',
  },
  'dione/map': {
    fonte:
      'Mosaico global Cassini de Dione (Paul Schenk, PIA18437) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    url: 'https://github.com/fgferre/Saturn',
    licenca: 'domínio público (NASA/JPL-Caltech/SSI/LPI)',
    atribuicao:
      'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18437). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    proveniencia: 'derivado',
  },
  'rhea/map': {
    fonte:
      'Mosaico global Cassini de Reia (Paul Schenk, PIA18438) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    url: 'https://github.com/fgferre/Saturn',
    licenca: 'domínio público (NASA/JPL-Caltech/SSI/LPI)',
    atribuicao:
      'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18438). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    proveniencia: 'derivado',
  },
  'titan/map': {
    fonte: 'NASA 3D Resources — Titã (720×360, névoa; mosaico Cassini fica pendente da bancada)',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Saturn%20-%20Titan',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'iapetus/map': {
    fonte:
      'Mosaico global Cassini de Jápeto (Paul Schenk, PIA18439) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    url: 'https://github.com/fgferre/Saturn',
    licenca: 'domínio público (NASA/JPL-Caltech/SSI/LPI)',
    atribuicao:
      'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18439). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    proveniencia: 'derivado',
  },
  'miranda/map': {
    fonte: 'Reconstrução por IA generativa do autor sobre o mapa NASA 3D Resources — Miranda',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Uranus%20-%20Miranda',
    licenca: 'imagem do autor (Felipe Ferreira), gerada com IA sobre NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: mosaico Voyager 2 (NASA 3D Resources — NASA/JPL-Caltech) redesenhado por IA generativa pelo autor, com o hemisfério norte inventado — não é medida.',
    proveniencia: 'derivado',
  },
  'ariel/map': {
    fonte: 'Reconstrução por IA generativa do autor sobre o mosaico Voyager 2 de Ariel (Schenk, LPI 2020)',
    url: 'https://hdl.handle.net/20.500.11753/1687',
    licenca: 'imagem do autor (Felipe Ferreira), gerada com IA sobre o mosaico de Paul Schenk (LPI, sem linha de licença; uso com crédito)',
    atribuicao: 'Textura: mosaico Voyager 2 de Paul Schenk (Lunar and Planetary Institute, 2020; NASA/JPL) redesenhado por IA generativa pelo autor, com o hemisfério norte inventado — não é medida.',
    proveniencia: 'derivado',
  },
  'umbriel/map': {
    fonte: 'Reconstrução por IA generativa do autor sobre o mosaico Voyager 2 de Umbriel (Schenk, LPI 2020)',
    url: 'https://hdl.handle.net/20.500.11753/1687',
    licenca: 'imagem do autor (Felipe Ferreira), gerada com IA sobre o mosaico de Paul Schenk (LPI, sem linha de licença; uso com crédito)',
    atribuicao: 'Textura: mosaico Voyager 2 de Paul Schenk (Lunar and Planetary Institute, 2020; NASA/JPL) redesenhado por IA generativa pelo autor, com o hemisfério norte inventado — não é medida.',
    proveniencia: 'derivado',
  },
  'titania/map': {
    fonte: 'Reconstrução por IA generativa do autor sobre o mosaico Voyager 2 de Titânia (Schenk, LPI 2020)',
    url: 'https://hdl.handle.net/20.500.11753/1687',
    licenca: 'imagem do autor (Felipe Ferreira), gerada com IA sobre o mosaico de Paul Schenk (LPI, sem linha de licença; uso com crédito)',
    atribuicao: 'Textura: mosaico Voyager 2 de Paul Schenk (Lunar and Planetary Institute, 2020; NASA/JPL) redesenhado por IA generativa pelo autor, com o hemisfério norte inventado — não é medida.',
    proveniencia: 'derivado',
  },
  'oberon/map': {
    fonte: 'Reconstrução por IA generativa do autor sobre o mosaico Voyager 2 de Oberon (Schenk, LPI 2020)',
    url: 'https://hdl.handle.net/20.500.11753/1687',
    licenca: 'imagem do autor (Felipe Ferreira), gerada com IA sobre o mosaico de Paul Schenk (LPI, sem linha de licença; uso com crédito)',
    atribuicao: 'Textura: mosaico Voyager 2 de Paul Schenk (Lunar and Planetary Institute, 2020; NASA/JPL) redesenhado por IA generativa pelo autor, com o hemisfério norte inventado — não é medida.',
    proveniencia: 'derivado',
  },
  'triton/map': {
    fonte: 'Reconstrução por IA generativa do autor sobre o mapa global de Tritão da Voyager 2 (NASA/JPL-Caltech/LPI, 600 m)',
    url: 'https://science.nasa.gov/photojournal/map-of-triton',
    licenca: 'imagem do autor (Felipe Ferreira), gerada com IA sobre o mapa NASA/JPL-Caltech/LPI (uso livre)',
    atribuicao: 'Textura: mapa global de Tritão (NASA/JPL-Caltech/Lunar and Planetary Institute, Voyager 2) redesenhado por IA generativa pelo autor, com a parte nunca vista inventada — não é medida.',
    proveniencia: 'derivado',
  },
  // ---- F6 (anões). Plutão e Caronte: os mosaicos da New Horizons desde o
  // item 149 — os mapas NASA 3D de 720×360 eram anteriores ao sobrevoo de
  // 2015 e não tinham geografia nenhuma. Ceres: mosaico REAL da Dawn desde
  // o item 141, 3ª fase — o `2k_ceres_fictional` do SSS, que a própria
  // fonte declarava invenção, saiu da árvore.
  // Procedurais (Haumea/Makemake/Eris) sem mapa.
  'pluto/map': {
    fonte: 'New Horizons Ralph/MVIC — mapa global em cor de Plutão (PIA11707, 5926×2963)',
    url: 'https://science.nasa.gov/photojournal/pluto-color-map/',
    licenca: 'domínio público (NASA)',
    atribuicao:
      'Imagens: Ralph/MVIC da New Horizons no sobrevoo de 14 de julho de 2015 (NASA/Johns Hopkins APL/Southwest Research Institute). Giro de longitude e preenchimento do sul sem dado nesta casa (baixa-texturas.mjs).',
    proveniencia: 'derivado',
  },
  'charon/map': {
    fonte:
      'New Horizons LORRI+MVIC — mosaico global de Caronte a 300 m (USGS Astrogeology, 12693×6347)',
    url: 'https://astrogeology.usgs.gov/search/map/charon_new_horizons_lorri_mvic_global_mosaic_300m',
    licenca: 'domínio público (NASA/USGS)',
    atribuicao:
      'Imagens: LORRI e Ralph/MVIC da New Horizons (NASA/Johns Hopkins APL/Southwest Research Institute); mosaico do USGS Astrogeology Science Center. Reamostragem para 8192 px e preenchimento do sul sem dado nesta casa (baixa-texturas.mjs).',
    proveniencia: 'derivado',
  },
  'ceres/map': {
    fonte: 'Dawn FC — mosaico global de Ceres a 20 px/grau (DLR, via USGS Astrogeology)',
    url: 'https://astrogeology.usgs.gov/search/map/ceres_dawn_fc_hamo_global_mosaic_20ppd',
    licenca: 'domínio público (NASA/DLR/USGS)',
    atribuicao:
      'Imagens: Framing Camera da Dawn (NASA/JPL-Caltech/UCLA/MPS/DLR/IDA); mosaico do DLR Institute of Planetary Research, distribuído pelo USGS Astrogeology. Giro de longitude, tingimento uniforme e preenchimento do polo sul nesta casa (baixa-texturas.mjs).',
    proveniencia: 'derivado',
  },
  // ---- F7 (asteroides). Vesta Dawn (NASA Science 3D model);
  // Hígia VLT CC BY 4.0. Palas sem mapa licenciado.
  'vesta/map': {
    fonte:
      'NASA Science / Dawn — mosaico de Vesta embutido no modelo 3D, girado 150° do sistema "Claudia" da sonda para o meridiano da IAU (item 141, 3ª fase)',
    url: 'https://science.nasa.gov/resource/vesta-3d-model/',
    licenca: 'NASA images and media usage guidelines',
    atribuicao:
      'Textura: NASA/JPL-Caltech/UCLA/MPS/DLR/IDA — Dawn. Giro de longitude nesta casa (baixa-texturas.mjs).',
    proveniencia: 'derivado',
  },
  'hygiea/map': {
    fonte: 'ESO VLT — mapa de Hígia (2017–2018), Wikimedia CC BY 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Hygiea_VLT_2017-2018_map.png',
    licenca: 'CC BY 4.0',
    atribuicao: 'Textura: ESO / VLT / Vernazza et al. — CC BY 4.0.',
    proveniencia: 'medido',
  },

  // ---- S2 do item 134 (2026-09-02): O RELEVO DAS LUAS, colhido do
  // projeto Saturn do dono. Os dois canais saem do MESMO dado — a altura
  // desloca o vértice e a normal gira a luz —, e por isso os dois são
  // 'derivado' até na FONTE: nenhum deles é um produto publicado, e sim
  // um mapa equiretangular ASSADO a partir do modelo de forma (ou, em
  // Reia e Jápeto, gerado por código). A confissão do sintético mora na
  // nota (ASSETS.md) e a ficha a imprime na seção "a imagem".
  'mimas/height': {
    fonte: 'Modelo de forma SPC V2.0 de Mimas (Gaskell) — NASA PDS — mapa de ALTURA',
    url: 'https://sbn.psi.edu/pds/shape-models/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao: 'Forma: R. Gaskell, SPC V2.0 (NASA PDS). Mapa equiretangular assado no projeto Saturn (Felipe Ferreira).',
    proveniencia: 'derivado',
  },
  'mimas/normal': {
    fonte: 'Modelo de forma SPC V2.0 de Mimas (Gaskell) — NASA PDS — mapa de NORMAIS derivado da altura',
    url: 'https://sbn.psi.edu/pds/shape-models/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao: 'Forma: R. Gaskell, SPC V2.0 (NASA PDS). Mapa equiretangular assado no projeto Saturn (Felipe Ferreira).',
    proveniencia: 'derivado',
  },
  'tethys/height': {
    fonte: 'Modelo de forma SPC V1.0 de Tétis (Gaskell) — NASA PDS — mapa de ALTURA',
    url: 'https://sbn.psi.edu/pds/shape-models/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao: 'Forma: R. Gaskell, SPC V1.0 (NASA PDS). Mapa equiretangular assado no projeto Saturn (Felipe Ferreira).',
    proveniencia: 'derivado',
  },
  'tethys/normal': {
    fonte: 'Modelo de forma SPC V1.0 de Tétis (Gaskell) — NASA PDS — mapa de NORMAIS derivado da altura',
    url: 'https://sbn.psi.edu/pds/shape-models/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao: 'Forma: R. Gaskell, SPC V1.0 (NASA PDS). Mapa equiretangular assado no projeto Saturn (Felipe Ferreira).',
    proveniencia: 'derivado',
  },
  'enceladus/height': {
    fonte: 'DEM global de Encélado a 200 m — Schenk & McKinnon 2024 (USGS Astropedia) — mapa de ALTURA',
    url: 'https://astrogeology.usgs.gov/search/map/enceladus_dem_global_200m',
    licenca: 'domínio público, com citação obrigatória',
    atribuicao: 'Topografia: Schenk & McKinnon 2024, Icarus 408, 115827 (USGS Astropedia). Mapa assado no projeto Saturn (Felipe Ferreira).',
    proveniencia: 'derivado',
  },
  'enceladus/normal': {
    fonte: 'DEM global de Encélado a 200 m — Schenk & McKinnon 2024 (USGS Astropedia) — mapa de NORMAIS derivado da altura',
    url: 'https://astrogeology.usgs.gov/search/map/enceladus_dem_global_200m',
    licenca: 'domínio público, com citação obrigatória',
    atribuicao: 'Topografia: Schenk & McKinnon 2024, Icarus 408, 115827 (USGS Astropedia). Mapa assado no projeto Saturn (Felipe Ferreira).',
    proveniencia: 'derivado',
  },
  'dione/height': {
    fonte: 'DTM SPC de Dione — Weirich et al. 2025 (NASA PDS SBN) — mapa de ALTURA',
    url: 'https://sbn.psi.edu/pds/shape-models/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao: 'Topografia: Weirich et al. 2025 (NASA PDS SBN). Mapa assado no projeto Saturn (Felipe Ferreira).',
    proveniencia: 'derivado',
  },
  'dione/normal': {
    fonte: 'DTM SPC de Dione — Weirich et al. 2025 (NASA PDS SBN) — mapa de NORMAIS derivado da altura',
    url: 'https://sbn.psi.edu/pds/shape-models/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao: 'Topografia: Weirich et al. 2025 (NASA PDS SBN). Mapa assado no projeto Saturn (Felipe Ferreira).',
    proveniencia: 'derivado',
  },
  // S2b (2026-09-02): Reia e Jápeto voltam. Não há DTM público das duas, e
  // o relevo delas é GERADO POR CÓDIGO no projeto Saturn — não é medida.
  // A confissão sai daqui para a ficha pela nota do ASSETS.md.
  'rhea/height': {
    fonte: 'Relevo SINTÉTICO de Reia — gerado por código no projeto Saturn (não existe DTM público) — mapa de ALTURA',
    url: 'https://github.com/fgferre/Saturn',
    licenca: 'código do autor (Felipe Ferreira)',
    atribuicao: 'Relevo gerado por código no projeto Saturn (Felipe Ferreira) — não é medida.',
    proveniencia: 'derivado',
  },
  'rhea/normal': {
    fonte: 'Relevo SINTÉTICO de Reia — gerado por código no projeto Saturn (não existe DTM público) — mapa de NORMAIS derivado da altura',
    url: 'https://github.com/fgferre/Saturn',
    licenca: 'código do autor (Felipe Ferreira)',
    atribuicao: 'Relevo gerado por código no projeto Saturn (Felipe Ferreira) — não é medida.',
    proveniencia: 'derivado',
  },
  'iapetus/height': {
    fonte: 'Relevo SINTÉTICO de Jápeto — gerado por código no projeto Saturn (não existe DTM público), com a crista equatorial real modelada — mapa de ALTURA',
    url: 'https://github.com/fgferre/Saturn',
    licenca: 'código do autor (Felipe Ferreira)',
    atribuicao: 'Relevo gerado por código no projeto Saturn (Felipe Ferreira) — não é medida.',
    proveniencia: 'derivado',
  },
  'iapetus/normal': {
    fonte: 'Relevo SINTÉTICO de Jápeto — gerado por código no projeto Saturn (não existe DTM público) — mapa de NORMAIS derivado da altura',
    url: 'https://github.com/fgferre/Saturn',
    licenca: 'código do autor (Felipe Ferreira)',
    atribuicao: 'Relevo gerado por código no projeto Saturn (Felipe Ferreira) — não é medida.',
    proveniencia: 'derivado',
  },

  // ---- ITEM 140 (2026-09-03): O RELEVO DA LUA, medido. Até aqui a Lua
  // tinha SÓ o mapa de cor, e o relevo dela era derivado dele (o bump do
  // albedo da S2) — invenção que afundava os mares e levantava os raios
  // de Tycho. Agora a normal vem da topografia do LRO, que é o melhor
  // dado de terreno que existe fora da Terra. 'derivado' porque o
  // produto publicado é o mapa de ALTURA: a normal é assada dele aqui,
  // por `scripts/data/atlas/gera-normal-de-dem.mjs`.
  'moon/normal': {
    fonte:
      'LDEM do LOLA/LRO a 16 pixels por grau (CGI Moon Kit, NASA SVS) — ' +
      'mapa de NORMAIS derivado da altura, em amplitude física',
    url: 'https://svs.gsfc.nasa.gov/4720',
    licenca: 'domínio público (NASA)',
    atribuicao:
      'Topografia: NASA/Goddard Space Flight Center Scientific Visualization ' +
      'Studio, a partir do LOLA (Lunar Reconnaissance Orbiter). Mapa de ' +
      'normais assado nesta casa (gera-normal-de-dem.mjs).',
    proveniencia: 'derivado',
  },

  // ---- ITEM 141 (2026-09-03): a mesma técnica em MERCÚRIO e MARTE. Os
  // dois recebiam o bump do albedo (0,02 do raio — em Marte, 68 km de
  // relevo falso) e agora recebem a topografia medida. Mesmo caminho da
  // Lua: DEM público, normal assada em amplitude física, luz só.
  'mercury/normal': {
    fonte:
      'MESSENGER Global DEM 665 m v2 (USGS Astrogeology) — mapa de ' +
      'NORMAIS derivado da altura, em amplitude física',
    url: 'https://astrogeology.usgs.gov/search/map/mercury_messenger_usgs_dem_global_665m_v2',
    licenca: 'domínio público (NASA/USGS)',
    atribuicao:
      'Topografia: USGS Astrogeology Science Center, a partir das imagens ' +
      'estéreo da MDIS (MESSENGER, NASA/JHUAPL/Carnegie). Mapa de normais ' +
      'assado nesta casa (gera-normal-de-dem.mjs).',
    proveniencia: 'derivado',
  },
  'mars/normal': {
    fonte:
      'MOLA MEGDR a 16 pixels por grau (megt90n000eb, PDS Geosciences) — ' +
      'mapa de NORMAIS derivado da altura, em amplitude física',
    url: 'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/',
    licenca: 'domínio público (NASA)',
    atribuicao:
      'Topografia: MGS MOLA Science Team (D. E. Smith, NASA/GSFC), MEGDR ' +
      'v2. Mapa de normais assado nesta casa (gera-normal-de-dem.mjs).',
    proveniencia: 'derivado',
  },
  // ITEM 141, segunda fase: os dois corpos da Dawn. Ceres ganha relevo
  // MEDIDO por baixo de um mapa de cor que a fonte declara inventado — a
  // forma passa a ser fato mesmo onde a tinta não é.
  'ceres/normal': {
    fonte:
      'Dawn FC HAMO DTM global 137 m (DLR, via USGS Astrogeology) — mapa ' +
      'de NORMAIS derivado da altura, em amplitude física',
    url: 'https://astrogeology.usgs.gov/search/map/ceres_dawn_fc_hamo_dtm_global_137m',
    licenca: 'domínio público (NASA/DLR/USGS)',
    atribuicao:
      'Topografia: DLR Institute of Planetary Research, a partir das ' +
      'imagens da Framing Camera (Dawn, NASA/JPL-Caltech/UCLA/MPS/DLR/IDA), ' +
      'distribuída pelo USGS Astrogeology. Mapa de normais assado nesta ' +
      'casa (gera-normal-de-dem.mjs).',
    proveniencia: 'derivado',
  },
  'vesta/normal': {
    fonte:
      'Dawn HAMO DTM global 93 m (DLR, via USGS Astrogeology) — mapa de ' +
      'NORMAIS derivado do raio, em amplitude física',
    url: 'https://astrogeology.usgs.gov/search/map/vesta_dawn_hamo_dtm_global_93m',
    licenca: 'domínio público (NASA/DLR/USGS)',
    atribuicao:
      'Topografia: DLR Institute of Planetary Research, a partir das ' +
      'imagens da Framing Camera (Dawn, NASA/JPL-Caltech/UCLA/MPS/DLR/IDA), ' +
      'distribuída pelo USGS Astrogeology. Mapa de normais assado nesta ' +
      'casa (gera-normal-de-dem.mjs).',
    proveniencia: 'derivado',
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

const assetsPath = path.join(rootDirectory, 'docs', 'reference', 'ASSETS.md');
const confissao = lerTabelasDaConfissao(await readFile(assetsPath, 'utf8'), assetsPath);
for (const chave of confissao.imagem.keys()) {
  if (!ORIGENS[chave]) {
    throw new Error(
      `${assetsPath}: a nota de "${chave}" não casa com nenhuma entrada de ORIGENS.`
    );
  }
}

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
    const nota = confissao.imagem.get(`${corpo}/${canal}`);
    entradas.push({
      corpo,
      canal,
      arquivo: path.relative(publicDirectory, arquivo),
      larguraPx: meta.width,
      alturaPx: meta.height,
      bytes: size,
      sha256: sha256(await readFile(arquivo)),
      // BILÍNGUE desde o item 130/F4: a ficha imprime estas frases, e a
      // ficha fala duas línguas. O `url` não é frase — fica só. O
      // português continua sendo a CHAVE da tradução (ver
      // `texturas-em-ingles.mjs`), então reescrever uma linha de
      // `ORIGENS` sem traduzi-la FALHA aqui em vez de publicar calada.
      origem: {
        fonte: bilingue(declarada.fonte, `origem.fonte de ${corpo}/${canal}`),
        url: declarada.url,
        licenca: bilingue(declarada.licenca, `origem.licenca de ${corpo}/${canal}`),
        atribuicao: bilingue(
          declarada.atribuicao,
          `origem.atribuicao de ${corpo}/${canal}`
        ),
      },
      proveniencia: ehFonte ? declarada.proveniencia : 'derivado',
      // O DEFEITO É DA IMAGEM, não da variante: a escada de tamanhos e o
      // webp saem do MESMO mapa, e o polo preenchido de Ceres continua
      // preenchido em 512 px. A nota acompanha todas as variantes, e a
      // ausência dela é a declaração de que a bancada não achou defeito.
      ...(nota ? { nota: bilingue(nota, `a nota de ${corpo}/${canal}`) } : {}),
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
    confissao: 'docs/reference/ASSETS.md § A CONFISSÃO NA TELA',
    // A FORMA NÃO É UMA VARIANTE, e por isso ela é chave de topo e não
    // campo de entrada: Palas e Haumea não têm textura nenhuma (superfície
    // procedural em `rochoso.ts`) e não teriam onde pendurar a nota. O que
    // se confessa aqui é o MESH — o elipsoide de BODY_AXES no lugar da
    // malha irregular que existe publicada (item 20).
    formas: Object.fromEntries(
      [...confissao.forma]
        .sort(([a], [b]) => a.localeCompare(b, 'en'))
        .map(([id, nota]) => [id, bilingue(nota, `a forma de ${id}`)])
    ),
    entradas,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const totalBytes = entradas.reduce((soma, e) => soma + e.bytes, 0);
  const naoResolvidas = entradas.filter(
    (e) => e.origem.licenca.pt === 'nao-resolvida'
  ).length;
  const comNota = new Set(entradas.filter((e) => e.nota).map((e) => `${e.corpo}/${e.canal}`));
  console.log(
    `texturas.json: ${entradas.length} variantes, ` +
      `${(totalBytes / 1048576).toFixed(2)} MB em disco, ` +
      `${naoResolvidas} com origem não resolvida, ` +
      `${comNota.size} canais com defeito confessado (${[...comNota].join(', ')}), ` +
      `${Object.keys(manifest.formas).length} corpos elipsoide sem malha.`
  );
}

await main();
