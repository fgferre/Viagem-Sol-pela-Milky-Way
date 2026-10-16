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
// imagem", o defeito de cada mapa, com o selo do que ele confessa —
// a cor de Ceres que não é medida, as emendas de Titã, a cor inferida
// de Europa, Vênus sem foto em luz visível — e a forma, também com
// selo, dos corpos que são elipsoide tendo malha publicada ou malha
// esculpida por código. Esses vereditos já moram, inteiros, em
// `docs/reference/ASSETS.md`; então é ELE que este gerador lê, numa
// seção de tabelas com título fixo. Copiá-los para cá criaria a
// segunda cópia que o próprio ASSETS existe para não ter — e seria a
// cópia que envelhece calada, porque quem edita o veredito edita o
// documento. O gerador FALHA se a seção sumir, se uma linha vier
// malformada, se citar um corpo/canal fora de `ORIGENS` ou uma forma de
// corpo fora de `fonte/corpos-fonte.json`.
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
import {
  analisarNomeDeTextura,
  conferirCorposDaForma,
  lerTabelasDaConfissao,
} from './lib-texturas.mjs';
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
// A citação que a NOAA pede para o ETOPO 2022 (`.cache/terra/FONTES.json`).
const ATRIBUICAO_ETOPO =
  'Relevo: NOAA National Centers for Environmental Information. 2022: ETOPO 2022 15 Arc-Second Global Relief Model. ' +
  'https://doi.org/10.25921/fd45-gt74 — a grade de 60″ da superfície. Mapa assado pelo app.';
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
  // 07/10/2026: o relevo MEDIDO da Terra (ETOPO 2022 da NOAA) no lugar da
  // normal artística do SSS, e a sombra das montanhas assada do mesmo
  // relevo. 'derivado': o produto publicado é a grade de ALTURA; a normal e
  // o horizonte são assados dela nesta casa (`relevo-terra.mjs`, pela
  // cadeia). A confissão mora no ASSETS.md.
  'earth/normal': {
    fonte:
      'ETOPO 2022 (NOAA NCEI), grade de 60″ da superfície — altura medida, reduzida por média de área pelo app, ' +
      'com a água no nível do espelho — mapa de NORMAIS',
    url: 'https://doi.org/10.25921/fd45-gt74',
    licenca: 'CC0 1.0 (domínio público)',
    atribuicao: ATRIBUICAO_ETOPO,
    proveniencia: 'derivado',
  },
  'earth/horizon': {
    fonte:
      'ETOPO 2022 (NOAA NCEI), grade de 60″ da superfície — altura medida, reduzida por média de área pelo app, ' +
      'com a água no nível do espelho — mapa de HORIZONTE (sombra de relevo assada, seis azimutes em RGB)',
    url: 'https://doi.org/10.25921/fd45-gt74',
    licenca: 'CC0 1.0 (domínio público)',
    atribuicao: ATRIBUICAO_ETOPO,
    proveniencia: 'derivado',
  },
  'earth/horizon2': {
    fonte:
      'ETOPO 2022 (NOAA NCEI), grade de 60″ da superfície — altura medida, reduzida por média de área pelo app, ' +
      'com a água no nível do espelho — mapa de HORIZONTE (sombra de relevo assada, seis azimutes em RGB)',
    url: 'https://doi.org/10.25921/fd45-gt74',
    licenca: 'CC0 1.0 (domínio público)',
    atribuicao: ATRIBUICAO_ETOPO,
    proveniencia: 'derivado',
  },
  'earth/roughness': {
    fonte:
      'Solar System Scope — 8k_earth_specular_map.tif via Wayback Machine, ' +
      'INVERTIDO (negate) para roughness — o SSS pinta oceano claro ' +
      '(=reflexivo) e o roughnessMap espera 0=espelho',
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
  // Fobos e Deimos (15/10/2026, `completar-corpo` passo 2): a forma MEDIDA
  // inteira vira mapa de altura, com a normal e os dois horizontes dela, e a
  // cor é a FOTO do Viking (cinza; a tinta e o nível são os da régua) —
  // Fobos registrada na forma pela medida. A confissão mora no ASSETS.md.
  'phobos/map': {
    fonte:
      'Mosaico global do Viking de Fobos (P. Stooke, controle da DLR) — USGS, 40 px/grau, registrado na forma medida',
    url: 'https://planetarymaps.usgs.gov/mosaic/Phobos_Viking_Mosaic_40ppd_DLRcontrol.tif',
    licenca: 'domínio público (NASA/USGS)',
    atribuicao:
      'Fotos: Viking Orbiter (NASA/JPL), mosaico de P. Stooke com o controle da DLR (USGS Astrogeology Science Center). Registro na forma, redução e cor pela régua do app (Felipe Ferreira).',
    proveniencia: 'medido',
  },
  'phobos/height': {
    fonte:
      'Modelo de forma de Fobos (Gaskell, SPC, 3,1 milhões de placas) — NASA PDS — mapa de ALTURA',
    url: 'https://sbnarchive.psi.edu/pds4/non_mission/gaskell.phobos.shape-model/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao:
      'Forma: R. Gaskell, Gaskell Phobos Shape Model V1.0 (NASA PDS Small Bodies Node, urn:nasa:pds:gaskell.phobos.shape-model). Mapa equiretangular assado pelo app (Felipe Ferreira).',
    proveniencia: 'medido',
  },
  'phobos/normal': {
    fonte:
      'Modelo de forma de Fobos (Gaskell, SPC, 3,1 milhões de placas) — NASA PDS — mapa de NORMAIS derivado da altura',
    url: 'https://sbnarchive.psi.edu/pds4/non_mission/gaskell.phobos.shape-model/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao:
      'Forma: R. Gaskell, Gaskell Phobos Shape Model V1.0 (NASA PDS Small Bodies Node, urn:nasa:pds:gaskell.phobos.shape-model). Mapa equiretangular assado pelo app (Felipe Ferreira).',
    proveniencia: 'medido',
  },
  'phobos/horizon': {
    fonte:
      'Modelo de forma de Fobos (Gaskell, SPC, 3,1 milhões de placas) — NASA PDS — mapa de HORIZONTE (sombra de relevo assada, seis azimutes em RGB)',
    url: 'https://sbnarchive.psi.edu/pds4/non_mission/gaskell.phobos.shape-model/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao:
      'Forma: R. Gaskell, Gaskell Phobos Shape Model V1.0 (NASA PDS Small Bodies Node, urn:nasa:pds:gaskell.phobos.shape-model). Mapa equiretangular assado pelo app (Felipe Ferreira).',
    proveniencia: 'medido',
  },
  'phobos/horizon2': {
    fonte:
      'Modelo de forma de Fobos (Gaskell, SPC, 3,1 milhões de placas) — NASA PDS — mapa de HORIZONTE (sombra de relevo assada, seis azimutes em RGB)',
    url: 'https://sbnarchive.psi.edu/pds4/non_mission/gaskell.phobos.shape-model/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao:
      'Forma: R. Gaskell, Gaskell Phobos Shape Model V1.0 (NASA PDS Small Bodies Node, urn:nasa:pds:gaskell.phobos.shape-model). Mapa equiretangular assado pelo app (Felipe Ferreira).',
    proveniencia: 'medido',
  },
  'deimos/map': {
    fonte:
      'Mosaico global do Viking de Deimos, com inserções da HiRISE (P. Stooke) — NASA PDS, 20 px/grau',
    url: 'https://sbnarchive.psi.edu/pds4/non_mission/small_bodies.stooke.maps/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao:
      'Fotos: Viking Orbiter (NASA/JPL) e MRO HiRISE (NASA/JPL/Universidade do Arizona), mosaico de P. Stooke (NASA PDS Small Bodies Node). Redução e cor pela régua do app (Felipe Ferreira).',
    proveniencia: 'medido',
  },
  'deimos/height': {
    fonte:
      'Modelo de forma de Deimos (Thomas 1993, Viking, grade de 5°) — NASA PDS / ESA SPICE — mapa de ALTURA',
    url: 'https://spiftp.esac.esa.int/data/SPICE/MARS-EXPRESS/kernels/dsk/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao:
      'Forma: P. Thomas (Viking), Small Body Shape Models (NASA PDS Small Bodies Node), no modelo de placas DEIMOS_K005_THO_V02 do SPICE da Mars Express (ESA). Mapa equiretangular assado pelo app (Felipe Ferreira), suavizado a 2° de arco.',
    proveniencia: 'medido',
  },
  'deimos/normal': {
    fonte:
      'Modelo de forma de Deimos (Thomas 1993, Viking, grade de 5°) — NASA PDS / ESA SPICE — mapa de NORMAIS derivado da altura',
    url: 'https://spiftp.esac.esa.int/data/SPICE/MARS-EXPRESS/kernels/dsk/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao:
      'Forma: P. Thomas (Viking), Small Body Shape Models (NASA PDS Small Bodies Node), no modelo de placas DEIMOS_K005_THO_V02 do SPICE da Mars Express (ESA). Mapa equiretangular assado pelo app (Felipe Ferreira), suavizado a 2° de arco.',
    proveniencia: 'medido',
  },
  'deimos/horizon': {
    fonte:
      'Modelo de forma de Deimos (Thomas 1993, Viking, grade de 5°) — NASA PDS / ESA SPICE — mapa de HORIZONTE (sombra de relevo assada, seis azimutes em RGB)',
    url: 'https://spiftp.esac.esa.int/data/SPICE/MARS-EXPRESS/kernels/dsk/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao:
      'Forma: P. Thomas (Viking), Small Body Shape Models (NASA PDS Small Bodies Node), no modelo de placas DEIMOS_K005_THO_V02 do SPICE da Mars Express (ESA). Mapa equiretangular assado pelo app (Felipe Ferreira), suavizado a 2° de arco.',
    proveniencia: 'medido',
  },
  'deimos/horizon2': {
    fonte:
      'Modelo de forma de Deimos (Thomas 1993, Viking, grade de 5°) — NASA PDS / ESA SPICE — mapa de HORIZONTE (sombra de relevo assada, seis azimutes em RGB)',
    url: 'https://spiftp.esac.esa.int/data/SPICE/MARS-EXPRESS/kernels/dsk/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao:
      'Forma: P. Thomas (Viking), Small Body Shape Models (NASA PDS Small Bodies Node), no modelo de placas DEIMOS_K005_THO_V02 do SPICE da Mars Express (ESA). Mapa equiretangular assado pelo app (Felipe Ferreira), suavizado a 2° de arco.',
    proveniencia: 'medido',
  },
  // ---- F4 (gigantes). Mesma linha SSS CC BY 4.0. O 8k_jupiter
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
  // 2k_europa sem licença NÃO entram; o mosaico Cassini de Titã fica
  // pendente da bancada (costuras). Europa: o mosaico USGS de 500 m
  // desde o item 230, com a cor inferida do brilho nesta casa.
  'io/map': {
    fonte: 'NASA 3D Resources — Io (B)',
    url: 'https://science.nasa.gov/3d-resources/jupiter-io-b/',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'europa/map': {
    fonte:
      'Voyager e Galileo SSI — mosaico global de Europa a 500 m (USGS Astrogeology, 19631×9816, em cinza), com a cor inferida pelo app a partir da foto em cor da Galileo PIA19048',
    url: 'https://planetarymaps.usgs.gov/mosaic/Europa_Voyager_GalileoSSI_global_mosaic_500m.tif',
    licenca: 'domínio público (NASA/USGS)',
    atribuicao:
      'Imagens: Voyager e Galileo SSI (NASA/JPL-Caltech); mosaico do USGS Astrogeology Science Center. Cor de referência: PIA19048 (NASA/JPL-Caltech/SETI Institute) e PIA00502 (NASA/JPL/DLR). Redução para 4096 px, giro de longitude, preenchimento do sul sem dado e cor inferida do brilho pelo app.',
    proveniencia: 'derivado',
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
      'Mosaico global Cassini de Mimas (Paul Schenk, PIA18437) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    url: 'https://github.com/fgferre/Saturn',
    licenca: 'domínio público (NASA/JPL-Caltech/SSI/LPI)',
    atribuicao:
      'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18437). Graduação de cor: projeto Saturn (Felipe Ferreira).',
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
      'Mosaico global Cassini de Tétis (Paul Schenk, PIA18439) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    url: 'https://github.com/fgferre/Saturn',
    licenca: 'domínio público (NASA/JPL-Caltech/SSI/LPI)',
    atribuicao:
      'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18439). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    proveniencia: 'derivado',
  },
  'dione/map': {
    fonte:
      'Mosaico global Cassini de Dione (Paul Schenk, PIA18434) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    url: 'https://github.com/fgferre/Saturn',
    licenca: 'domínio público (NASA/JPL-Caltech/SSI/LPI)',
    atribuicao:
      'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18434). Graduação de cor: projeto Saturn (Felipe Ferreira).',
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
    fonte: 'NASA 3D Resources — Titã (720×360, só a névoa; o mosaico Cassini ainda não entrou)',
    url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Saturn%20-%20Titan',
    licenca: 'NASA 3D Resources (uso livre)',
    atribuicao: 'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    proveniencia: 'medido',
  },
  'iapetus/map': {
    fonte:
      'Mosaico global Cassini de Jápeto (Paul Schenk, PIA18436) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    url: 'https://github.com/fgferre/Saturn',
    licenca: 'domínio público (NASA/JPL-Caltech/SSI/LPI)',
    atribuicao:
      'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18436). Graduação de cor: projeto Saturn (Felipe Ferreira).',
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
  'pluto/map': {
    fonte: 'New Horizons Ralph/MVIC — mapa global em cor de Plutão (PIA11707, 5926×2963)',
    url: 'https://science.nasa.gov/photojournal/pluto-color-map/',
    licenca: 'domínio público (NASA)',
    atribuicao:
      'Imagens: Ralph/MVIC da New Horizons no sobrevoo de 14 de julho de 2015 (NASA/Johns Hopkins APL/Southwest Research Institute). Giro de longitude e preenchimento do sul sem dado pelo app.',
    proveniencia: 'derivado',
  },
  'charon/map': {
    fonte:
      'New Horizons LORRI+MVIC — mosaico global de Caronte a 300 m (USGS Astrogeology, 12693×6347)',
    url: 'https://astrogeology.usgs.gov/search/map/charon_new_horizons_lorri_mvic_global_mosaic_300m',
    licenca: 'domínio público (NASA/USGS)',
    atribuicao:
      'Imagens: LORRI e Ralph/MVIC da New Horizons (NASA/Johns Hopkins APL/Southwest Research Institute); mosaico do USGS Astrogeology Science Center. Reamostragem para 8192 px e preenchimento do sul sem dado pelo app.',
    proveniencia: 'derivado',
  },
  'ceres/map': {
    fonte: 'Dawn FC — mosaico global de Ceres a 20 px/grau (DLR, via USGS Astrogeology)',
    url: 'https://astrogeology.usgs.gov/search/map/ceres_dawn_fc_hamo_global_mosaic_20ppd',
    licenca: 'domínio público (NASA/DLR/USGS)',
    atribuicao:
      'Imagens: Framing Camera da Dawn (NASA/JPL-Caltech/UCLA/MPS/DLR/IDA); mosaico do DLR Institute of Planetary Research, distribuído pelo USGS Astrogeology. Giro de longitude, tingimento uniforme e preenchimento do polo sul pelo app.',
    proveniencia: 'derivado',
  },
  // ---- F7 (asteroides). Vesta (16/10/2026, `completar-corpo` passos 2 a 5): a forma MEDIDA (o SPC da Dawn) vira
  // mapa de altura, com a normal (a figura dele + o fino do DTM da DLR) e os dois horizontes, e a imagem é o mosaico
  // F2 corrigido da DLR, sem sombra assada, com a cor das razões F8/F2 e F7/F2. A confissão mora no ASSETS.md.
  'vesta/map': {
    fonte:
      'Mosaico HAMO da Dawn no filtro F2 (555 nm), corrigido fotometricamente pela DLR, com a cor das razões F8/F2 e F7/F2 — NASA PDS, 74 px/grau',
    url: 'https://sbnarchive.psi.edu/pds3/dawn/fc/DWNVFC2_2/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao:
      'Imagens: Framing Camera da Dawn (NASA/JPL-Caltech/UCLA/MPS/DLR/IDA); mosaicos corrigidos do DLR Institute of Planetary Research (NASA PDS Small Bodies Node, DWNVFC2_2). Buracos de sombra tapados pela vizinhança, redução e cor pela régua do app (Felipe Ferreira).',
    proveniencia: 'medido',
  },
  'vesta/height': {
    fonte:
      'Modelo de forma de Vesta (SPC da equipe de gravidade da Dawn, 12,6 milhões de placas) — NASA NAIF — mapa de ALTURA',
    url: 'https://naif.jpl.nasa.gov/pub/naif/DAWN/kernels/dsk/',
    licenca: 'domínio público (NASA)',
    atribuicao:
      'Forma: R. S. Park et al., modelo SPC de Vesta da equipe de gravidade da Dawn (NASA/JPL, NAIF dawn_vesta_grv_icq1024_v1). Relevo fino: DTM HAMO de F. Preusker et al. (DLR, NASA PDS DWNVSPG_2). Mapa equiretangular assado pelo app (Felipe Ferreira).',
    proveniencia: 'medido',
  },
  'vesta/normal': {
    fonte:
      'Modelo de forma de Vesta (SPC da equipe de gravidade da Dawn, 12,6 milhões de placas) — NASA NAIF — mapa de NORMAIS: a figura do SPC com o relevo fino do DTM da DLR (64 px/grau)',
    url: 'https://naif.jpl.nasa.gov/pub/naif/DAWN/kernels/dsk/',
    licenca: 'domínio público (NASA)',
    atribuicao:
      'Forma: R. S. Park et al., modelo SPC de Vesta da equipe de gravidade da Dawn (NASA/JPL, NAIF dawn_vesta_grv_icq1024_v1). Relevo fino: DTM HAMO de F. Preusker et al. (DLR, NASA PDS DWNVSPG_2). Mapa equiretangular assado pelo app (Felipe Ferreira).',
    proveniencia: 'medido',
  },
  'vesta/horizon': {
    fonte:
      'Modelo de forma de Vesta (SPC da equipe de gravidade da Dawn, 12,6 milhões de placas) — NASA NAIF — mapa de HORIZONTE (sombra de relevo assada, seis azimutes em RGB)',
    url: 'https://naif.jpl.nasa.gov/pub/naif/DAWN/kernels/dsk/',
    licenca: 'domínio público (NASA)',
    atribuicao:
      'Forma: R. S. Park et al., modelo SPC de Vesta da equipe de gravidade da Dawn (NASA/JPL, NAIF dawn_vesta_grv_icq1024_v1). Relevo fino: DTM HAMO de F. Preusker et al. (DLR, NASA PDS DWNVSPG_2). Mapa equiretangular assado pelo app (Felipe Ferreira).',
    proveniencia: 'medido',
  },
  'vesta/horizon2': {
    fonte:
      'Modelo de forma de Vesta (SPC da equipe de gravidade da Dawn, 12,6 milhões de placas) — NASA NAIF — mapa de HORIZONTE (sombra de relevo assada, seis azimutes em RGB)',
    url: 'https://naif.jpl.nasa.gov/pub/naif/DAWN/kernels/dsk/',
    licenca: 'domínio público (NASA)',
    atribuicao:
      'Forma: R. S. Park et al., modelo SPC de Vesta da equipe de gravidade da Dawn (NASA/JPL, NAIF dawn_vesta_grv_icq1024_v1). Relevo fino: DTM HAMO de F. Preusker et al. (DLR, NASA PDS DWNVSPG_2). Mapa equiretangular assado pelo app (Felipe Ferreira).',
    proveniencia: 'medido',
  },
  // ---- Os seis sem foto de superfície (item 151): Hígia, Palas, Haumea,
  // Makemake, Éris e Quaoar não foram visitados por sonda nenhuma. O mapa
  // de cada um é uma ILUSTRAÇÃO gerada por IA a partir dos fatos
  // conhecidos — não há fonte fotográfica para citar, e a frase o diz.
  // Hígia trocou o gráfico científico do ESO/VLT (item 150, errado: era
  // figura com grade e barra de cores, não textura); os outros cinco
  // trocaram o `superficie: 'procedural'` (rochoso.ts).
  'hygiea/map': {
    fonte: 'Ilustração por IA generativa do autor a partir dos fatos conhecidos — não há foto da superfície de Hígia',
    url: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=Hygiea',
    licenca: 'imagem do autor (Felipe Ferreira), gerada com IA',
    atribuicao: 'imagem do autor (Felipe Ferreira), gerada com IA',
    proveniencia: 'derivado',
  },
  'pallas/map': {
    fonte: 'Ilustração por IA generativa do autor a partir dos fatos conhecidos — não há foto da superfície de Palas',
    url: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=Pallas',
    licenca: 'imagem do autor (Felipe Ferreira), gerada com IA',
    atribuicao: 'imagem do autor (Felipe Ferreira), gerada com IA',
    proveniencia: 'derivado',
  },
  'haumea/map': {
    fonte: 'Ilustração por IA generativa do autor a partir dos fatos conhecidos — não há foto da superfície de Haumea',
    url: 'https://science.nasa.gov/dwarf-planets/haumea/',
    licenca: 'imagem do autor (Felipe Ferreira), gerada com IA',
    atribuicao: 'imagem do autor (Felipe Ferreira), gerada com IA',
    proveniencia: 'derivado',
  },
  'makemake/map': {
    fonte: 'Ilustração por IA generativa do autor a partir dos fatos conhecidos — não há foto da superfície de Makemake',
    url: 'https://science.nasa.gov/dwarf-planets/makemake/',
    licenca: 'imagem do autor (Felipe Ferreira), gerada com IA',
    atribuicao: 'imagem do autor (Felipe Ferreira), gerada com IA',
    proveniencia: 'derivado',
  },
  'eris/map': {
    fonte: 'Ilustração por IA generativa do autor a partir dos fatos conhecidos — não há foto da superfície de Éris',
    url: 'https://science.nasa.gov/dwarf-planets/eris/',
    licenca: 'imagem do autor (Felipe Ferreira), gerada com IA',
    atribuicao: 'imagem do autor (Felipe Ferreira), gerada com IA',
    proveniencia: 'derivado',
  },
  'quaoar/map': {
    fonte: 'Ilustração por IA generativa do autor a partir dos fatos conhecidos — não há foto da superfície de Quaoar',
    url: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=Quaoar',
    licenca: 'imagem do autor (Felipe Ferreira), gerada com IA',
    atribuicao: 'imagem do autor (Felipe Ferreira), gerada com IA',
    proveniencia: 'derivado',
  },

  // ---- S2 do item 134 (2026-09-02): O RELEVO DAS LUAS, colhido do
  // projeto Saturn do dono. Os dois canais saem do MESMO dado — a altura
  // desloca o vértice e a normal gira a luz —, e por isso os dois são
  // 'derivado' até na FONTE: nenhum deles é um produto publicado, e sim
  // um mapa equiretangular ASSADO a partir do modelo de forma (ou, em
  // Jápeto, gerado por código; em Reia, o modelo medido completado por
  // código). A confissão de cada um mora na nota (ASSETS.md) e a ficha a
  // imprime na seção "a imagem".
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
  // R4 da régua (13/10/2026): o relevo de Encélado deixa o projeto Saturn e
  // nasce nesta casa do mesmo DEM (`gera-normal-de-dem.mjs`): a altura em
  // 1024 px com a faixa inteira e a normal em 4096. A página antiga do
  // Astropedia (`enceladus_dem_global_200m`) devolve 404.
  'enceladus/height': {
    fonte: 'DEM global de Encélado a 200 m — Schenk & McKinnon 2024 (USGS Astropedia) — mapa de ALTURA',
    url: 'https://astrogeology.usgs.gov/search/map/enceladus-cassini-global-dem-200m-schenk',
    licenca: 'domínio público, com citação obrigatória',
    atribuicao:
      'Topografia: Schenk & McKinnon 2024, Icarus 408, 115827, doi 10.1016/j.icarus.2023.115827, distribuída pelo USGS Astrogeology (Astropedia). Mapa assado pelo app.',
    proveniencia: 'derivado',
  },
  'enceladus/normal': {
    fonte: 'DEM global de Encélado a 200 m — Schenk & McKinnon 2024 (USGS Astropedia) — mapa de NORMAIS derivado da altura',
    url: 'https://astrogeology.usgs.gov/search/map/enceladus-cassini-global-dem-200m-schenk',
    licenca: 'domínio público, com citação obrigatória',
    atribuicao:
      'Topografia: Schenk & McKinnon 2024, Icarus 408, 115827, doi 10.1016/j.icarus.2023.115827, distribuída pelo USGS Astrogeology (Astropedia). Mapa assado pelo app.',
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
  // PLAN-REIA.md (07/10/2026): o relevo de Reia sai do sintético do projeto
  // Saturn e passa a nascer nesta casa (`relevo-reia.mjs`, pela cadeia) —
  // MEDIDO pelo modelo de forma da Cassini acima de ~30 km e completado com
  // crateras menores de perfil ESTIMADO: híbrido, por isso 'derivado'. A
  // confissão do que é cada coisa mora no ASSETS.md.
  'rhea/height': {
    fonte: 'Modelo de forma SPC de Reia — Weirich, Gaskell, Palmer & Domingue 2025 (NASA PDS SBN) — completado pelo app com as crateras menores do mosaico Cassini e a lei de Aponte-Hernández et al. 2021 — mapa de ALTURA',
    url: 'https://doi.org/10.26033/tqxb-q714',
    licenca: 'dado NASA PDS, com citação obrigatória; montagem: código do autor (Felipe Ferreira)',
    atribuicao:
      'Topografia: Weirich, J. R., Gaskell, R. W., Palmer, E. E. & Domingue, D. L. (2025), Rhea shape model and maps, Cassini ISS SPC, NASA PDS Small Bodies Node, doi 10.26033/tqxb-q714. Crateras menores que ~30 km: lugar e diâmetro pelo mosaico global Cassini de Paul Schenk (PIA18438, NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute); profundidade ESTIMADA pela lei de Aponte-Hernández et al. 2021. Montagem pelo app.',
    proveniencia: 'derivado',
  },
  'rhea/normal': {
    fonte: 'Modelo de forma SPC de Reia — Weirich, Gaskell, Palmer & Domingue 2025 (NASA PDS SBN) — completado pelo app com as crateras menores do mosaico Cassini e a lei de Aponte-Hernández et al. 2021 — mapa de NORMAIS derivado da altura',
    url: 'https://doi.org/10.26033/tqxb-q714',
    licenca: 'dado NASA PDS, com citação obrigatória; montagem: código do autor (Felipe Ferreira)',
    atribuicao:
      'Topografia: Weirich, J. R., Gaskell, R. W., Palmer, E. E. & Domingue, D. L. (2025), Rhea shape model and maps, Cassini ISS SPC, NASA PDS Small Bodies Node, doi 10.26033/tqxb-q714. Crateras menores que ~30 km: lugar e diâmetro pelo mosaico global Cassini de Paul Schenk (PIA18438, NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute); profundidade ESTIMADA pela lei de Aponte-Hernández et al. 2021. Montagem pelo app.',
    proveniencia: 'derivado',
  },
  // item 230 (07/10/2026): o relevo de Jápeto sai do projeto Saturn e passa
  // a nascer nesta casa (`relevo-japeto.mjs`, pela cadeia), inventado mas
  // ancorado no medido — a confissão do que é cada coisa mora no ASSETS.md.
  'iapetus/height': {
    fonte: 'Relevo de Jápeto gerado pelo app a partir do Gazetteer da IAU, Porco 2005, Giese 2008, Lopez Garcia 2014 e do mosaico Cassini (não existe DTM público) — mapa de ALTURA',
    url: 'https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/IAPETUS_nomenclature_center_pts.zip',
    licenca: 'código do autor (Felipe Ferreira); posições do Gazetteer da IAU e mosaico Cassini em domínio público',
    atribuicao:
      'Crista e crateras com nome: Gazetteer of Planetary Nomenclature (IAU/USGS). Altura da crista: Porco et al. 2005 e Giese et al. 2008; perfis: Lopez Garcia et al. 2014; profundidade das crateras ancorada em White et al. 2013. Caminho da crista e crateras sem nome: mosaico global Cassini de Paul Schenk (PIA18436, NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute). Relevo gerado pelo app — não é medida.',
    proveniencia: 'derivado',
  },
  'iapetus/normal': {
    fonte: 'Relevo de Jápeto gerado pelo app a partir do Gazetteer da IAU, Porco 2005, Giese 2008, Lopez Garcia 2014 e do mosaico Cassini (não existe DTM público) — mapa de NORMAIS derivado da altura',
    url: 'https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/IAPETUS_nomenclature_center_pts.zip',
    licenca: 'código do autor (Felipe Ferreira); posições do Gazetteer da IAU e mosaico Cassini em domínio público',
    atribuicao:
      'Crista e crateras com nome: Gazetteer of Planetary Nomenclature (IAU/USGS). Altura da crista: Porco et al. 2005 e Giese et al. 2008; perfis: Lopez Garcia et al. 2014; profundidade das crateras ancorada em White et al. 2013. Caminho da crista e crateras sem nome: mosaico global Cassini de Paul Schenk (PIA18436, NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute). Relevo gerado pelo app — não é medida.',
    proveniencia: 'derivado',
  },

  // ---- HIPÉRION (23/09/2026, item 134/S3 → relevo medido): a forma
  // inteira (Cassini — Thomas, Joseph & Ansty 2018) vira mapa de altura, a
  // normal deriva dele, e a cor é uma pintura por IA do autor sobre o
  // relevo medido — os poços dela viram as crateras do mapa de altura.
  'hyperion/map': {
    fonte:
      'Pintura por IA generativa do autor sobre o relevo medido de Hipérion, com a foto Cassini PIA07740 só como referência — não existe mapa de cor medido de Hipérion',
    url: 'https://science.nasa.gov/saturn/moons/hyperion/',
    licenca: 'imagem do autor (Felipe Ferreira), gerada com IA',
    atribuicao: 'imagem do autor (Felipe Ferreira), gerada com IA',
    proveniencia: 'derivado',
  },
  'hyperion/height': {
    fonte:
      'Modelo de forma de Hipérion (Thomas, Joseph & Ansty 2018, Cassini) — NASA PDS — mapa de ALTURA, com os poços tirados da pintura por IA',
    url: 'https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/',
    licenca: 'domínio público (NASA PDS); os poços: imagem do autor (Felipe Ferreira), gerada com IA',
    atribuicao:
      'Forma: P. Thomas, J. Joseph & T. Ansty, Saturn Small Moon Shape Models V1.0 (NASA PDS, DOI 10.26033/ewy3-jy61). Mapa equiretangular assado pelo app (Felipe Ferreira), com os poços da pintura por IA do autor.',
    proveniencia: 'derivado',
  },
  'hyperion/normal': {
    fonte:
      'Modelo de forma de Hipérion (Thomas, Joseph & Ansty 2018, Cassini) — NASA PDS — mapa de NORMAIS derivado da altura, com os poços tirados da pintura por IA',
    url: 'https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/',
    licenca: 'domínio público (NASA PDS); os poços: imagem do autor (Felipe Ferreira), gerada com IA',
    atribuicao:
      'Forma: P. Thomas, J. Joseph & T. Ansty, Saturn Small Moon Shape Models V1.0 (NASA PDS, DOI 10.26033/ewy3-jy61). Mapa equiretangular assado pelo app (Felipe Ferreira), com os poços da pintura por IA do autor.',
    proveniencia: 'derivado',
  },
  // item 226: o horizonte, 3 azimutes por canal em RGB (0/120/240° e
  // 60/180/300°), marchado sobre o mesmo raio da altura e da normal
  'hyperion/horizon': {
    fonte:
      'Modelo de forma de Hipérion (Thomas, Joseph & Ansty 2018, Cassini) — NASA PDS — mapa de HORIZONTE (sombra de relevo assada, seis azimutes em RGB), com os poços tirados da pintura por IA',
    url: 'https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/',
    licenca: 'domínio público (NASA PDS); os poços: imagem do autor (Felipe Ferreira), gerada com IA',
    atribuicao:
      'Forma: P. Thomas, J. Joseph & T. Ansty, Saturn Small Moon Shape Models V1.0 (NASA PDS, DOI 10.26033/ewy3-jy61). Mapa equiretangular assado pelo app (Felipe Ferreira), com os poços da pintura por IA do autor.',
    proveniencia: 'derivado',
  },
  'hyperion/horizon2': {
    fonte:
      'Modelo de forma de Hipérion (Thomas, Joseph & Ansty 2018, Cassini) — NASA PDS — mapa de HORIZONTE (sombra de relevo assada, seis azimutes em RGB), com os poços tirados da pintura por IA',
    url: 'https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/',
    licenca: 'domínio público (NASA PDS); os poços: imagem do autor (Felipe Ferreira), gerada com IA',
    atribuicao:
      'Forma: P. Thomas, J. Joseph & T. Ansty, Saturn Small Moon Shape Models V1.0 (NASA PDS, DOI 10.26033/ewy3-jy61). Mapa equiretangular assado pelo app (Felipe Ferreira), com os poços da pintura por IA do autor.',
    proveniencia: 'derivado',
  },

  // ---- PÃ (08/10/2026, PLAN-LUAS-PEQUENAS.md → relevo medido, a versão F
  // aprovada por ele): a forma inteira (Cassini — Thomas, Joseph & Ansty
  // 2018) vira mapa de altura, com o relevo fino de 28 fotos calibradas da
  // Cassini onde elas veem e INVENTADO no resto; a cor é uma pintura por IA
  // do autor sobre o relevo medido, calibrada pelo espectro medido. Híbrido:
  // 'derivado'. A confissão do que é cada coisa mora no ASSETS.md.
  'pan/map': {
    fonte:
      'Pintura por IA generativa do autor sobre o relevo medido de Pã, com o albedo fino de 28 fotos calibradas da Cassini onde elas veem e a cor calibrada pelo espectro medido em 4 filtros da Cassini e por Buratti et al. 2019 — não existe mapa de cor medido de Pã',
    url: 'https://science.nasa.gov/saturn/moons/pan/',
    licenca: 'imagem do autor (Felipe Ferreira), gerada com IA; fotos da Cassini em domínio público (NASA)',
    atribuicao:
      'Pintura: imagem do autor (Felipe Ferreira), gerada com IA. Albedo fino e cor: fotos calibradas da Cassini ISS (NASA/JPL-Caltech/Space Science Institute; PDS Ring-Moon Systems Node, COISS_2111) e Buratti et al. 2019 (Science). Montagem pelo app.',
    proveniencia: 'derivado',
  },
  'pan/height': {
    fonte:
      'Modelo de forma de Pã (Thomas, Joseph & Ansty 2018, Cassini) — NASA PDS — mapa de ALTURA, com o relevo fino de 28 fotos calibradas da Cassini e as 4 crateras que elas mostram',
    url: 'https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao:
      'Forma: P. Thomas, J. Joseph & T. Ansty, Saturn Small Moon Shape Models V1.0 (NASA PDS, DOI 10.26033/ewy3-jy61). Relevo fino e crateras: fotos calibradas da Cassini ISS (NASA/JPL-Caltech/Space Science Institute; PDS Ring-Moon Systems Node, COISS_2111). Mapa equiretangular assado pelo app (Felipe Ferreira); onde nenhuma foto vê, o relevo fino é inventado por código.',
    proveniencia: 'derivado',
  },
  'pan/normal': {
    fonte:
      'Modelo de forma de Pã (Thomas, Joseph & Ansty 2018, Cassini) — NASA PDS — mapa de NORMAIS derivado da altura, com o relevo fino de 28 fotos calibradas da Cassini e as 4 crateras que elas mostram',
    url: 'https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao:
      'Forma: P. Thomas, J. Joseph & T. Ansty, Saturn Small Moon Shape Models V1.0 (NASA PDS, DOI 10.26033/ewy3-jy61). Relevo fino e crateras: fotos calibradas da Cassini ISS (NASA/JPL-Caltech/Space Science Institute; PDS Ring-Moon Systems Node, COISS_2111). Mapa equiretangular assado pelo app (Felipe Ferreira); onde nenhuma foto vê, o relevo fino é inventado por código.',
    proveniencia: 'derivado',
  },
  'pan/horizon': {
    fonte:
      'Modelo de forma de Pã (Thomas, Joseph & Ansty 2018, Cassini) — NASA PDS — mapa de HORIZONTE (sombra de relevo assada, seis azimutes em RGB), com o relevo fino de 28 fotos calibradas da Cassini e as 4 crateras que elas mostram',
    url: 'https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao:
      'Forma: P. Thomas, J. Joseph & T. Ansty, Saturn Small Moon Shape Models V1.0 (NASA PDS, DOI 10.26033/ewy3-jy61). Relevo fino e crateras: fotos calibradas da Cassini ISS (NASA/JPL-Caltech/Space Science Institute; PDS Ring-Moon Systems Node, COISS_2111). Mapa equiretangular assado pelo app (Felipe Ferreira); onde nenhuma foto vê, o relevo fino é inventado por código.',
    proveniencia: 'derivado',
  },
  'pan/horizon2': {
    fonte:
      'Modelo de forma de Pã (Thomas, Joseph & Ansty 2018, Cassini) — NASA PDS — mapa de HORIZONTE (sombra de relevo assada, seis azimutes em RGB), com o relevo fino de 28 fotos calibradas da Cassini e as 4 crateras que elas mostram',
    url: 'https://sbnarchive.psi.edu/pds4/cassini/saturn_satellite_shape_models_V1_0/',
    licenca: 'domínio público (NASA PDS)',
    atribuicao:
      'Forma: P. Thomas, J. Joseph & T. Ansty, Saturn Small Moon Shape Models V1.0 (NASA PDS, DOI 10.26033/ewy3-jy61). Relevo fino e crateras: fotos calibradas da Cassini ISS (NASA/JPL-Caltech/Space Science Institute; PDS Ring-Moon Systems Node, COISS_2111). Mapa equiretangular assado pelo app (Felipe Ferreira); onde nenhuma foto vê, o relevo fino é inventado por código.',
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
      'normais assado pelo app.',
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
      'assado pelo app.',
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
      'v2. Mapa de normais assado pelo app.',
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
      'distribuída pelo USGS Astrogeology. Mapa de normais assado pelo app.',
    proveniencia: 'derivado',
  },

  // 01/10/2026: a mesma técnica em PLUTÃO e CARONTE, com os DEMs de 300 m
  // da New Horizons (Schenk et al. 2018). Os dois são PARCIAIS — menos da
  // metade do globo tem dado —, e o gerador põe a normal LISA no vazio e
  // na borda dele; a ficha confessa isso (ASSETS.md).
  'pluto/normal': {
    fonte:
      'New Horizons LORRI+MVIC — DEM global de Plutão a 300 m (USGS ' +
      'Astrogeology) — mapa de NORMAIS derivado da altura, em amplitude física',
    url: 'https://astrogeology.usgs.gov/search/map/pluto_new_horizons_lorri_mvic_global_dem_300m',
    licenca: 'domínio público (NASA/USGS)',
    atribuicao:
      'Topografia: Schenk et al. 2018, Icarus 314, 400, a partir das imagens ' +
      'LORRI e Ralph/MVIC da equipe New Horizons (NASA/JHUAPL/SwRI/LPI), ' +
      'distribuída pelo USGS Astrogeology Science Center. Mapa de normais ' +
      'assado pelo app.',
    proveniencia: 'derivado',
  },
  'charon/normal': {
    fonte:
      'New Horizons LORRI+MVIC — DEM global de Caronte a 300 m (USGS ' +
      'Astrogeology) — mapa de NORMAIS derivado da altura, em amplitude física',
    url: 'https://astrogeology.usgs.gov/search/map/charon_new_horizons_lorri_mvic_global_dem_300m',
    licenca: 'domínio público (NASA/USGS)',
    atribuicao:
      'Topografia: Schenk et al. 2018, Icarus 315, 124, a partir das imagens ' +
      'LORRI e Ralph/MVIC da equipe New Horizons (NASA/JHUAPL/SwRI/LPI), ' +
      'distribuída pelo USGS Astrogeology Science Center. Mapa de normais ' +
      'assado pelo app.',
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
const corposFonte = JSON.parse(
  await readFile(
    path.join(rootDirectory, 'scripts', 'data', 'atlas', 'fonte', 'corpos-fonte.json'),
    'utf8'
  )
);
conferirCorposDaForma(
  confissao.forma,
  new Set(corposFonte.corpos.map((c) => c.id)),
  assetsPath
);

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
    const confessada = confissao.imagem.get(`${corpo}/${canal}`);
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
      // O selo vai junto: é o tier do que a nota confessa (coluna `selo`
      // do ASSETS.md), e é ele que a ficha põe na linha da confissão; no
      // canal misto, as `partes` (a porcentagem da área por tier) também.
      ...(confessada
        ? {
            nota: bilingue(confessada.nota, `a nota de ${corpo}/${canal}`),
            seloDaNota: confessada.selo,
            ...(confessada.partes ? { partes: confessada.partes } : {}),
          }
        : {}),
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
    // campo de entrada: as luas esculpidas não têm textura nenhuma e não
    // teriam onde pendurar a nota. O que se confessa aqui é o MESH — o
    // elipsoide de BODY_AXES no lugar da malha irregular que existe
    // publicada, ou a malha esculpida por código (item 20). Cada forma é a
    // frase bilíngue de sempre (`pt`/`en`, que a ficha já lê) com o selo
    // ao lado, no mesmo nome da imagem: `seloDaNota` (e as `partes`, na
    // forma mista).
    formas: Object.fromEntries(
      [...confissao.forma]
        .sort(([a], [b]) => a.localeCompare(b, 'en'))
        .map(([id, { selo, nota, partes }]) => [
          id,
          { ...bilingue(nota, `a forma de ${id}`), seloDaNota: selo, ...(partes ? { partes } : {}) },
        ])
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
      `${Object.keys(manifest.formas).length} corpos com a forma confessada.`
  );
}

await main();
