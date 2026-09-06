// ============================================================
// O INGLÊS DAS CONFISSÕES DA IMAGEM (item 130/F4).
//
// A ficha do objeto imprime, na seção "a imagem", cinco frases que não
// nascem em código de tela: a FONTE do mapa, a LICENÇA, a ATRIBUIÇÃO, o
// DEFEITO medido ("o defeito" / "o relevo admite") e a FORMA. Todas
// viajam no manifesto `public/data/atlas/texturas.json`, escritas em
// pt-BR — a fonte delas é a tabela `ORIGENS` do
// `gera-manifest-texturas.mjs` (fonte/licença/atribuição) e o
// `docs/reference/ASSETS.md` (defeito e forma). O app inteiro fala duas
// línguas desde a F1; estas frases eram o que faltava.
//
// O PORTUGUÊS É A CHAVE, e isto é o cadeado, não um detalhe de estilo.
// O `ASSETS.md` é documento pt-BR da casa e continua sendo a fonte única
// do veredito — traduzi-lo lá dentro criaria a segunda tabela que
// envelhece calada. Aqui a tradução pendura-se no TEXTO português: quem
// reescrever uma nota no `ASSETS.md`, ou uma fonte no `ORIGENS`, muda a
// chave, `emIngles` não acha o par e `npm run data:texturas` FALHA na
// hora. É o mesmo molde das legendas do filme (F3), pelo mesmo motivo.
//
// A VARIANTE É AMERICANA (color, center, catalog), como a `idioma/en.ts`
// e pelo mesmo motivo: é a variante da prosa original do dono e a da
// NASA, que é quem assina quase toda atribuição desta lista. Os NOMES
// PRÓPRIOS não se traduzem — NASA, USGS, DLR, PDS, PIA…, os nomes de
// arquivo do Solar System Scope, os nomes dos autores — e as licenças
// vão pelo nome oficial (CC BY 4.0 não vira nada; "domínio público" é
// "public domain", que é como a NASA a chama).
//
// Corpos e canais NÃO aparecem aqui: a chave é a frase, então uma
// entrada nova em `ORIGENS` que repita uma frase já traduzida não
// precisa de linha nenhuma neste arquivo.
// ============================================================

/** pt-BR → inglês americano. A chave é o texto português, literal. */
export const EM_INGLES = new Map([
  // ---- licenças (nome oficial; CC BY não se traduz) -----------------
  ['CC BY 4.0', 'CC BY 4.0'],
  ['NASA images and media usage guidelines', 'NASA images and media usage guidelines'],
  ['NASA 3D Resources (uso livre)', 'NASA 3D Resources (free to use)'],
  ['domínio público (NASA)', 'public domain (NASA)'],
  ['domínio público (NASA PDS)', 'public domain (NASA PDS)'],
  ['domínio público (NASA/USGS)', 'public domain (NASA/USGS)'],
  ['domínio público (NASA/DLR/USGS)', 'public domain (NASA/DLR/USGS)'],
  [
    'domínio público (NASA/JPL-Caltech/SSI/LPI)',
    'public domain (NASA/JPL-Caltech/SSI/LPI)',
  ],
  ['domínio público, com citação obrigatória', 'public domain, citation required'],
  ['código do autor (Felipe Ferreira)', "the author's own code (Felipe Ferreira)"],
  // a marca da política do dono (hoje zero entradas; o verify cobra zero)
  ['nao-resolvida', 'unresolved'],

  // ---- fontes: Solar System Scope ----------------------------------
  ['Solar System Scope — 8k_earth_daymap', 'Solar System Scope — 8k_earth_daymap'],
  ['Solar System Scope — 8k_earth_clouds', 'Solar System Scope — 8k_earth_clouds'],
  ['Solar System Scope — 8k_earth_nightmap', 'Solar System Scope — 8k_earth_nightmap'],
  ['Solar System Scope — 8k_mercury', 'Solar System Scope — 8k_mercury'],
  ['Solar System Scope — 8k_mars', 'Solar System Scope — 8k_mars'],
  ['Solar System Scope — 8k_moon', 'Solar System Scope — 8k_moon'],
  ['Solar System Scope — 8k_jupiter', 'Solar System Scope — 8k_jupiter'],
  ['Solar System Scope — 8k_saturn', 'Solar System Scope — 8k_saturn'],
  [
    'Solar System Scope — 4k_venus_atmosphere (topo de nuvens)',
    'Solar System Scope — 4k_venus_atmosphere (cloud tops)',
  ],
  [
    'Solar System Scope — 2k_uranus (incumbente; sem 8k SSS)',
    'Solar System Scope — 2k_uranus (incumbent; SSS has no 8k)',
  ],
  [
    'Solar System Scope — 2k_neptune (incumbente; sem 8k SSS)',
    'Solar System Scope — 2k_neptune (incumbent; SSS has no 8k)',
  ],
  [
    'Solar System Scope — 8k_earth_normal_map.tif via Wayback Machine, reencodado jpg (bake-earth-pbr do doador)',
    'Solar System Scope — 8k_earth_normal_map.tif via the Wayback Machine, re-encoded to jpg (bake-earth-pbr, from the donor project)',
  ],
  [
    'Solar System Scope — 8k_earth_specular_map.tif via Wayback Machine, INVERTIDO (negate) para roughness — o SSS pinta oceano claro (=reflexivo) e o roughnessMap espera 0=espelho (checklist item 14)',
    'Solar System Scope — 8k_earth_specular_map.tif via the Wayback Machine, INVERTED (negate) into roughness — SSS paints the ocean light (= reflective) and roughnessMap expects 0 = mirror (checklist item 14)',
  ],

  // ---- fontes: NASA 3D Resources -----------------------------------
  ['NASA 3D Resources — Io (B)', 'NASA 3D Resources — Io (B)'],
  ['NASA 3D Resources — Miranda', 'NASA 3D Resources — Miranda'],
  // item 148 — Miranda redesenhada por IA pelo dono
  [
    'Reconstrução por IA generativa do autor sobre o mosaico Voyager 2 de Ariel (Schenk, LPI 2020)',
    "The author's generative-AI reconstruction over the Voyager 2 mosaic of Ariel (Schenk, LPI 2020)",
  ],
  [
    'Reconstrução por IA generativa do autor sobre o mosaico Voyager 2 de Umbriel (Schenk, LPI 2020)',
    "The author's generative-AI reconstruction over the Voyager 2 mosaic of Umbriel (Schenk, LPI 2020)",
  ],
  [
    'Reconstrução por IA generativa do autor sobre o mosaico Voyager 2 de Titânia (Schenk, LPI 2020)',
    "The author's generative-AI reconstruction over the Voyager 2 mosaic of Titania (Schenk, LPI 2020)",
  ],
  [
    'Reconstrução por IA generativa do autor sobre o mosaico Voyager 2 de Oberon (Schenk, LPI 2020)',
    "The author's generative-AI reconstruction over the Voyager 2 mosaic of Oberon (Schenk, LPI 2020)",
  ],
  [
    'imagem do autor (Felipe Ferreira), gerada com IA sobre o mosaico de Paul Schenk (LPI, sem linha de licença; uso com crédito)',
    "the author's image (Felipe Ferreira), generated with AI over Paul Schenk's mosaic (LPI, no licence line; use with credit)",
  ],
  [
    'Textura: mosaico Voyager 2 de Paul Schenk (Lunar and Planetary Institute, 2020; NASA/JPL) redesenhado por IA generativa pelo autor, com o hemisfério norte inventado — não é medida.',
    "Texture: Paul Schenk's Voyager 2 mosaic (Lunar and Planetary Institute, 2020; NASA/JPL) redrawn by generative AI by the author, with the northern hemisphere invented — not a measurement.",
  ],
  [
    'Reconstrução por IA generativa do autor sobre o mapa global de Tritão da Voyager 2 (NASA/JPL-Caltech/LPI, 600 m)',
    "The author's generative-AI reconstruction over the Voyager 2 global map of Triton (NASA/JPL-Caltech/LPI, 600 m)",
  ],
  [
    'imagem do autor (Felipe Ferreira), gerada com IA sobre o mapa NASA/JPL-Caltech/LPI (uso livre)',
    "the author's image (Felipe Ferreira), generated with AI over the NASA/JPL-Caltech/LPI map (free to use)",
  ],
  [
    'Textura: mapa global de Tritão (NASA/JPL-Caltech/Lunar and Planetary Institute, Voyager 2) redesenhado por IA generativa pelo autor, com a parte nunca vista inventada — não é medida.',
    'Texture: the global map of Triton (NASA/JPL-Caltech/Lunar and Planetary Institute, Voyager 2) redrawn by generative AI by the author, with the never-seen part invented — not a measurement.',
  ],
  [
    'o mapa inteiro é um redesenho por IA generativa: a parte fotografada segue o mapa da Voyager 2 (1989), o resto, nunca visto, é inventado — nada aqui é medida',
    'the whole map is a generative-AI redraw: the photographed part follows the Voyager 2 map (1989), the rest, never seen, is invented — nothing here is a measurement',
  ],
  [
    'Reconstrução por IA generativa do autor sobre o mapa NASA 3D Resources — Miranda',
    "The author's generative-AI reconstruction over the NASA 3D Resources map — Miranda",
  ],
  [
    'imagem do autor (Felipe Ferreira), gerada com IA sobre NASA 3D Resources (uso livre)',
    "the author's image (Felipe Ferreira), generated with AI over NASA 3D Resources (free to use)",
  ],
  [
    'Textura: mosaico Voyager 2 (NASA 3D Resources — NASA/JPL-Caltech) redesenhado por IA generativa pelo autor, com o hemisfério norte inventado — não é medida.',
    'Texture: the Voyager 2 mosaic (NASA 3D Resources — NASA/JPL-Caltech) redrawn by generative AI by the author, with the northern hemisphere invented — not a measurement.',
  ],
  ['NASA 3D Resources — Ariel', 'NASA 3D Resources — Ariel'],
  ['NASA 3D Resources — Umbriel', 'NASA 3D Resources — Umbriel'],
  ['NASA 3D Resources — Oberon', 'NASA 3D Resources — Oberon'],
  ['NASA 3D Resources — Calisto', 'NASA 3D Resources — Callisto'],
  ['NASA 3D Resources — Ganimedes', 'NASA 3D Resources — Ganymede'],
  ['NASA 3D Resources — Titânia', 'NASA 3D Resources — Titania'],
  ['NASA 3D Resources — Tritão', 'NASA 3D Resources — Triton'],
  // ---- o defeito: Plutão e Caronte (item 149) -----------------------
  [
    'mapa em cor real da New Horizons, mas o polo sul estava em noite polar no sobrevoo de 2015: 30 % do mapa nunca foi fotografado e entrou liso, com o tom médio do que a sonda viu',
    "a real color map from New Horizons, but the south pole was in polar night during the 2015 flyby: 30% of the map was never photographed and came in flat, with the average tone of what the spacecraft did see",
  ],
  [
    'mosaico real da New Horizons, e sem cor: não existe mapa global em cor de Caronte — e o polo sul, em noite polar no sobrevoo, é mais um terço que entrou liso, com o tom médio do que a sonda viu',
    'a real New Horizons mosaic, and colorless: there is no global color map of Charon — and the south pole, in polar night during the flyby, is another third that came in flat, with the average tone of what the spacecraft did see',
  ],

  // ---- fontes: New Horizons (item 149) ------------------------------
  [
    'New Horizons Ralph/MVIC — mapa global em cor de Plutão (PIA11707, 5926×2963)',
    'New Horizons Ralph/MVIC — global color map of Pluto (PIA11707, 5926×2963)',
  ],
  [
    'New Horizons LORRI+MVIC — mosaico global de Caronte a 300 m (USGS Astrogeology, 12693×6347)',
    'New Horizons LORRI+MVIC — global mosaic of Charon at 300 m (USGS Astrogeology, 12693×6347)',
  ],
  [
    'Imagens: Ralph/MVIC da New Horizons no sobrevoo de 14 de julho de 2015 (NASA/Johns Hopkins APL/Southwest Research Institute). Giro de longitude e preenchimento do sul sem dado nesta casa (baixa-texturas.mjs).',
    'Images: New Horizons Ralph/MVIC on the July 14, 2015 flyby (NASA/Johns Hopkins APL/Southwest Research Institute). Longitude rotation and filling of the south with no data done here (baixa-texturas.mjs).',
  ],
  [
    'Imagens: LORRI e Ralph/MVIC da New Horizons (NASA/Johns Hopkins APL/Southwest Research Institute); mosaico do USGS Astrogeology Science Center. Reamostragem para 8192 px e preenchimento do sul sem dado nesta casa (baixa-texturas.mjs).',
    'Images: New Horizons LORRI and Ralph/MVIC (NASA/Johns Hopkins APL/Southwest Research Institute); mosaic by the USGS Astrogeology Science Center. Resampling to 8192 px and filling of the south with no data done here (baixa-texturas.mjs).',
  ],
  [
    'NASA 3D Resources — modelo 3D de Fobos (textura)',
    'NASA 3D Resources — 3D model of Phobos (texture)',
  ],
  [
    'NASA 3D Resources — modelo 3D de Deimos (textura)',
    'NASA 3D Resources — 3D model of Deimos (texture)',
  ],
  [
    'NASA 3D Resources — Europa (mapa global; mono declarado)',
    'NASA 3D Resources — Europa (global map; monochrome, declared)',
  ],
  [
    'NASA 3D Resources — Titã (720×360, névoa; mosaico Cassini fica pendente da bancada)',
    'NASA 3D Resources — Titan (720×360, haze only; the Cassini mosaic is still pending on the bench)',
  ],

  // ---- fontes: mosaicos Cassini graduados no projeto Saturn ---------
  [
    'Mosaico global Cassini de Mimas (Paul Schenk, PIA18434) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    'Cassini global mosaic of Mimas (Paul Schenk, PIA18434) — IR/UV enhanced color, graded to natural color in the Saturn project',
  ],
  [
    'Mosaico global Cassini de Encélado (Paul Schenk, PIA18435) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    'Cassini global mosaic of Enceladus (Paul Schenk, PIA18435) — IR/UV enhanced color, graded to natural color in the Saturn project',
  ],
  [
    'Mosaico global Cassini de Tétis (Paul Schenk, PIA18436) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    'Cassini global mosaic of Tethys (Paul Schenk, PIA18436) — IR/UV enhanced color, graded to natural color in the Saturn project',
  ],
  [
    'Mosaico global Cassini de Dione (Paul Schenk, PIA18437) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    'Cassini global mosaic of Dione (Paul Schenk, PIA18437) — IR/UV enhanced color, graded to natural color in the Saturn project',
  ],
  [
    'Mosaico global Cassini de Reia (Paul Schenk, PIA18438) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    'Cassini global mosaic of Rhea (Paul Schenk, PIA18438) — IR/UV enhanced color, graded to natural color in the Saturn project',
  ],
  [
    'Mosaico global Cassini de Jápeto (Paul Schenk, PIA18439) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    'Cassini global mosaic of Iapetus (Paul Schenk, PIA18439) — IR/UV enhanced color, graded to natural color in the Saturn project',
  ],

  // ---- fontes: Ceres e Vesta ----------------------------------------
  [
    'Dawn FC — mosaico global de Ceres a 20 px/grau (DLR, via USGS Astrogeology)',
    'Dawn FC — global mosaic of Ceres at 20 px/degree (DLR, via USGS Astrogeology)',
  ],
  [
    'NASA Science / Dawn — mosaico de Vesta embutido no modelo 3D, girado 150° do sistema "Claudia" da sonda para o meridiano da IAU (item 141, 3ª fase)',
    'NASA Science / Dawn — Vesta mosaic embedded in the 3D model, rotated 150° from the spacecraft\'s "Claudia" system to the IAU prime meridian (item 141, 3rd phase)',
  ],

  // ---- fontes: os seis sem foto de superfície, ilustrados por IA
  // (item 151) — Hígia, Palas, Haumea, Makemake, Éris e Quaoar.
  [
    'Ilustração por IA generativa do autor a partir dos fatos conhecidos — não há foto da superfície de Hígia',
    "The author's generative-AI illustration from the known facts — there is no photo of Hygiea's surface",
  ],
  [
    'Ilustração por IA generativa do autor a partir dos fatos conhecidos — não há foto da superfície de Palas',
    "The author's generative-AI illustration from the known facts — there is no photo of Pallas's surface",
  ],
  [
    'Ilustração por IA generativa do autor a partir dos fatos conhecidos — não há foto da superfície de Haumea',
    "The author's generative-AI illustration from the known facts — there is no photo of Haumea's surface",
  ],
  [
    'Ilustração por IA generativa do autor a partir dos fatos conhecidos — não há foto da superfície de Makemake',
    "The author's generative-AI illustration from the known facts — there is no photo of Makemake's surface",
  ],
  [
    'Ilustração por IA generativa do autor a partir dos fatos conhecidos — não há foto da superfície de Éris',
    "The author's generative-AI illustration from the known facts — there is no photo of Eris's surface",
  ],
  [
    'Ilustração por IA generativa do autor a partir dos fatos conhecidos — não há foto da superfície de Quaoar',
    "The author's generative-AI illustration from the known facts — there is no photo of Quaoar's surface",
  ],
  [
    'imagem do autor (Felipe Ferreira), gerada com IA',
    "the author's image (Felipe Ferreira), generated with AI",
  ],

  // ---- fontes: relevo (altura e normais) ---------------------------
  [
    'Modelo de forma SPC V2.0 de Mimas (Gaskell) — NASA PDS — mapa de ALTURA',
    'SPC V2.0 shape model of Mimas (Gaskell) — NASA PDS — HEIGHT map',
  ],
  [
    'Modelo de forma SPC V2.0 de Mimas (Gaskell) — NASA PDS — mapa de NORMAIS derivado da altura',
    'SPC V2.0 shape model of Mimas (Gaskell) — NASA PDS — NORMAL map derived from the height',
  ],
  [
    'Modelo de forma SPC V1.0 de Tétis (Gaskell) — NASA PDS — mapa de ALTURA',
    'SPC V1.0 shape model of Tethys (Gaskell) — NASA PDS — HEIGHT map',
  ],
  [
    'Modelo de forma SPC V1.0 de Tétis (Gaskell) — NASA PDS — mapa de NORMAIS derivado da altura',
    'SPC V1.0 shape model of Tethys (Gaskell) — NASA PDS — NORMAL map derived from the height',
  ],
  [
    'DEM global de Encélado a 200 m — Schenk & McKinnon 2024 (USGS Astropedia) — mapa de ALTURA',
    'Global DEM of Enceladus at 200 m — Schenk & McKinnon 2024 (USGS Astropedia) — HEIGHT map',
  ],
  [
    'DEM global de Encélado a 200 m — Schenk & McKinnon 2024 (USGS Astropedia) — mapa de NORMAIS derivado da altura',
    'Global DEM of Enceladus at 200 m — Schenk & McKinnon 2024 (USGS Astropedia) — NORMAL map derived from the height',
  ],
  [
    'DTM SPC de Dione — Weirich et al. 2025 (NASA PDS SBN) — mapa de ALTURA',
    'SPC DTM of Dione — Weirich et al. 2025 (NASA PDS SBN) — HEIGHT map',
  ],
  [
    'DTM SPC de Dione — Weirich et al. 2025 (NASA PDS SBN) — mapa de NORMAIS derivado da altura',
    'SPC DTM of Dione — Weirich et al. 2025 (NASA PDS SBN) — NORMAL map derived from the height',
  ],
  [
    'Relevo SINTÉTICO de Reia — gerado por código no projeto Saturn (não existe DTM público) — mapa de ALTURA',
    'SYNTHETIC relief of Rhea — generated by code in the Saturn project (no public DTM exists) — HEIGHT map',
  ],
  [
    'Relevo SINTÉTICO de Reia — gerado por código no projeto Saturn (não existe DTM público) — mapa de NORMAIS derivado da altura',
    'SYNTHETIC relief of Rhea — generated by code in the Saturn project (no public DTM exists) — NORMAL map derived from the height',
  ],
  [
    'Relevo SINTÉTICO de Jápeto — gerado por código no projeto Saturn (não existe DTM público), com a crista equatorial real modelada — mapa de ALTURA',
    'SYNTHETIC relief of Iapetus — generated by code in the Saturn project (no public DTM exists), with the real equatorial ridge modeled — HEIGHT map',
  ],
  [
    'Relevo SINTÉTICO de Jápeto — gerado por código no projeto Saturn (não existe DTM público) — mapa de NORMAIS derivado da altura',
    'SYNTHETIC relief of Iapetus — generated by code in the Saturn project (no public DTM exists) — NORMAL map derived from the height',
  ],
  [
    'LDEM do LOLA/LRO a 16 pixels por grau (CGI Moon Kit, NASA SVS) — mapa de NORMAIS derivado da altura, em amplitude física',
    'LOLA/LRO LDEM at 16 pixels per degree (CGI Moon Kit, NASA SVS) — NORMAL map derived from the height, at physical amplitude',
  ],
  [
    'MESSENGER Global DEM 665 m v2 (USGS Astrogeology) — mapa de NORMAIS derivado da altura, em amplitude física',
    'MESSENGER Global DEM 665 m v2 (USGS Astrogeology) — NORMAL map derived from the height, at physical amplitude',
  ],
  [
    'MOLA MEGDR a 16 pixels por grau (megt90n000eb, PDS Geosciences) — mapa de NORMAIS derivado da altura, em amplitude física',
    'MOLA MEGDR at 16 pixels per degree (megt90n000eb, PDS Geosciences) — NORMAL map derived from the height, at physical amplitude',
  ],
  [
    'Dawn FC HAMO DTM global 137 m (DLR, via USGS Astrogeology) — mapa de NORMAIS derivado da altura, em amplitude física',
    'Dawn FC HAMO global DTM 137 m (DLR, via USGS Astrogeology) — NORMAL map derived from the height, at physical amplitude',
  ],
  [
    'Dawn HAMO DTM global 93 m (DLR, via USGS Astrogeology) — mapa de NORMAIS derivado do raio, em amplitude física',
    'Dawn HAMO global DTM 93 m (DLR, via USGS Astrogeology) — NORMAL map derived from the radius, at physical amplitude',
  ],

  // ---- atribuições (o crédito redigido que a licença exige) --------
  [
    'Texturas: Solar System Scope (solarsystemscope.com/textures), CC BY 4.0.',
    'Textures: Solar System Scope (solarsystemscope.com/textures), CC BY 4.0.',
  ],
  [
    'Textura: NASA 3D Resources — NASA/JPL-Caltech.',
    'Texture: NASA 3D Resources — NASA/JPL-Caltech.',
  ],
  [
    'Textura: NASA/JPL-Caltech/UCLA/MPS/DLR/IDA — Dawn. Giro de longitude nesta casa (baixa-texturas.mjs).',
    'Texture: NASA/JPL-Caltech/UCLA/MPS/DLR/IDA — Dawn. Longitude rotation done in this house (baixa-texturas.mjs).',
  ],
  [
    'Imagens: Framing Camera da Dawn (NASA/JPL-Caltech/UCLA/MPS/DLR/IDA); mosaico do DLR Institute of Planetary Research, distribuído pelo USGS Astrogeology. Giro de longitude, tingimento uniforme e preenchimento do polo sul nesta casa (baixa-texturas.mjs).',
    'Images: Dawn Framing Camera (NASA/JPL-Caltech/UCLA/MPS/DLR/IDA); mosaic by the DLR Institute of Planetary Research, distributed by USGS Astrogeology. Longitude rotation, uniform tinting and south-pole infill done in this house (baixa-texturas.mjs).',
  ],
  [
    'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18434). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    'Mosaic: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18434). Color grading: Saturn project (Felipe Ferreira).',
  ],
  [
    'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18435). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    'Mosaic: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18435). Color grading: Saturn project (Felipe Ferreira).',
  ],
  [
    'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18436). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    'Mosaic: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18436). Color grading: Saturn project (Felipe Ferreira).',
  ],
  [
    'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18437). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    'Mosaic: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18437). Color grading: Saturn project (Felipe Ferreira).',
  ],
  [
    'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18438). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    'Mosaic: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18438). Color grading: Saturn project (Felipe Ferreira).',
  ],
  [
    'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18439). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    'Mosaic: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18439). Color grading: Saturn project (Felipe Ferreira).',
  ],
  [
    'Forma: R. Gaskell, SPC V2.0 (NASA PDS). Mapa equiretangular assado no projeto Saturn (Felipe Ferreira).',
    'Shape: R. Gaskell, SPC V2.0 (NASA PDS). Equirectangular map baked in the Saturn project (Felipe Ferreira).',
  ],
  [
    'Forma: R. Gaskell, SPC V1.0 (NASA PDS). Mapa equiretangular assado no projeto Saturn (Felipe Ferreira).',
    'Shape: R. Gaskell, SPC V1.0 (NASA PDS). Equirectangular map baked in the Saturn project (Felipe Ferreira).',
  ],
  [
    'Topografia: Schenk & McKinnon 2024, Icarus 408, 115827 (USGS Astropedia). Mapa assado no projeto Saturn (Felipe Ferreira).',
    'Topography: Schenk & McKinnon 2024, Icarus 408, 115827 (USGS Astropedia). Map baked in the Saturn project (Felipe Ferreira).',
  ],
  [
    'Topografia: Weirich et al. 2025 (NASA PDS SBN). Mapa assado no projeto Saturn (Felipe Ferreira).',
    'Topography: Weirich et al. 2025 (NASA PDS SBN). Map baked in the Saturn project (Felipe Ferreira).',
  ],
  [
    'Relevo gerado por código no projeto Saturn (Felipe Ferreira) — não é medida.',
    'Relief generated by code in the Saturn project (Felipe Ferreira) — not a measurement.',
  ],
  [
    'Topografia: NASA/Goddard Space Flight Center Scientific Visualization Studio, a partir do LOLA (Lunar Reconnaissance Orbiter). Mapa de normais assado nesta casa (gera-normal-de-dem.mjs).',
    'Topography: NASA/Goddard Space Flight Center Scientific Visualization Studio, from LOLA (Lunar Reconnaissance Orbiter). Normal map baked in this house (gera-normal-de-dem.mjs).',
  ],
  [
    'Topografia: USGS Astrogeology Science Center, a partir das imagens estéreo da MDIS (MESSENGER, NASA/JHUAPL/Carnegie). Mapa de normais assado nesta casa (gera-normal-de-dem.mjs).',
    'Topography: USGS Astrogeology Science Center, from the MDIS stereo imaging (MESSENGER, NASA/JHUAPL/Carnegie). Normal map baked in this house (gera-normal-de-dem.mjs).',
  ],
  [
    'Topografia: MGS MOLA Science Team (D. E. Smith, NASA/GSFC), MEGDR v2. Mapa de normais assado nesta casa (gera-normal-de-dem.mjs).',
    'Topography: MGS MOLA Science Team (D. E. Smith, NASA/GSFC), MEGDR v2. Normal map baked in this house (gera-normal-de-dem.mjs).',
  ],
  [
    'Topografia: DLR Institute of Planetary Research, a partir das imagens da Framing Camera (Dawn, NASA/JPL-Caltech/UCLA/MPS/DLR/IDA), distribuída pelo USGS Astrogeology. Mapa de normais assado nesta casa (gera-normal-de-dem.mjs).',
    'Topography: DLR Institute of Planetary Research, from the Framing Camera imaging (Dawn, NASA/JPL-Caltech/UCLA/MPS/DLR/IDA), distributed by USGS Astrogeology. Normal map baked in this house (gera-normal-de-dem.mjs).',
  ],

  // ---- "o defeito" e "o relevo admite" (tabela `a imagem` do ASSETS)
  // A vírgula decimal do português vira PONTO aqui: "2,7 km" é "2.7 km".
  [
    'mosaico real da Dawn, mas fotografado no filtro claro: a cor é um tingimento uniforme desta casa, e o polo sul, que a sonda pegou em noite polar, foi preenchido com a média da faixa de latitude vizinha',
    'a real Dawn mosaic, but shot through the clear filter: the color is a uniform tint applied in this house, and the south pole, which the spacecraft caught in polar night, was filled in with the average of the neighboring latitude band',
  ],
  [
    '720×360, só a névoa laranja: o mosaico Cassini de mais resolução mostra emendas de longitude na esfera e não entrou',
    '720×360, the orange haze and nothing else: the higher-resolution Cassini mosaic shows longitude seams on the sphere and did not make it in',
  ],
  [
    'mapa global monocromático: o mosaico USGS de mais resolução traz 68 linhas pretas de vazio sobre o polo sul e não entrou',
    'a monochrome global map: the higher-resolution USGS mosaic carries 68 black lines of missing data over the south pole and did not make it in',
  ],
  // item 147 — as cinco de Urano (uma frase só) e Tritão
  [
    'o mapa inteiro é um redesenho por IA generativa: o sul segue o mosaico da Voyager 2 (1986), o norte, nunca visto, é inventado — nada aqui é medida',
    'the whole map is a generative-AI redraw: the south follows the Voyager 2 mosaic (1986), the north, never seen, is invented — nothing here is a measurement',
  ],
  [
    'só o hemisfério sul foi fotografado (Voyager 2, 1986): o norte, nunca visto, entra liso, no tom médio do que a sonda viu',
    'only the southern hemisphere was photographed (Voyager 2, 1986): the north, never seen, comes in flat, in the mean tone of what the probe saw',
  ],
  [
    'a Voyager 2 fotografou cerca de 40 % de Tritão (1989): o resto, nunca visto, entra liso, no tom médio do que a sonda viu',
    'Voyager 2 photographed about 40 % of Triton (1989): the rest, never seen, comes in flat, in the mean tone of what the probe saw',
  ],
  // item 151 — os seis sem foto de superfície (uma frase só)
  [
    'não existe foto da superfície: o mapa é uma ilustração por IA generativa a partir dos fatos conhecidos (tamanho, albedo, cor, crateras vistas de longe) — nada aqui é medida',
    'there is no photo of the surface: the map is a generative-AI illustration from the known facts (size, albedo, color, craters seen from afar) — nothing here is a measurement',
  ],
  [
    'é o topo de nuvens, não o chão: a superfície de Vênus não tem foto em luz visível — o que existe é radar, e radar não é cor',
    'this is the cloud tops, not the ground: the surface of Venus has no photograph in visible light — what exists is radar, and radar is not color',
  ],
  [
    'DEM de 200 m reamostrado para 1024 px: o que se vê é a forma geral, não a fratura individual do polo sul',
    'a 200 m DEM resampled to 1024 px: what you see is the overall shape, not the individual fracture at the south pole',
  ],
  [
    'relevo SINTÉTICO: não existe DTM público de Reia — o campo de crateras foi gerado por código no projeto Saturn do autor, e não é medida',
    "SYNTHETIC relief: no public DTM of Rhea exists — the crater field was generated by code in the author's Saturn project, and is not a measurement",
  ],
  [
    'relevo SINTÉTICO: não existe DTM público de Jápeto — o campo de crateras foi gerado por código no projeto Saturn do autor (só a crista equatorial é feição real, modelada), e não é medida',
    "SYNTHETIC relief: no public DTM of Iapetus exists — the crater field was generated by code in the author's Saturn project (only the equatorial ridge is a real feature, modeled), and is not a measurement",
  ],
  [
    'topografia real do LRO reamostrada para 4096 px: cada texel cobre ~2,7 km, então o que a luz desenha é a cratera, não a pedra dentro dela',
    'real LRO topography resampled to 4096 px: each texel covers ~2.7 km, so what the light draws is the crater, not the rock inside it',
  ],
  [
    'topografia real da MESSENGER reamostrada de 665 m para 4096 px: cada texel cobre ~3,7 km, e a média de latitude usou 2 das 5,6 linhas de origem',
    'real MESSENGER topography resampled from 665 m to 4096 px: each texel covers ~3.7 km, and the latitude average used 2 of the 5.6 source rows',
  ],
  [
    'topografia real do MOLA a 16 pixels por grau: cada texel cobre ~5,2 km, então o que a luz desenha é o vulcão e o cânion, nunca a duna',
    'real MOLA topography at 16 pixels per degree: each texel covers ~5.2 km, so what the light draws is the volcano and the canyon, never the dune',
  ],
  [
    'topografia real da Dawn reamostrada de 137 m para 4096 px: cada texel cobre 0,73 km, o mais fino da casa, e a média de latitude usou 2 das 5,3 linhas de origem',
    'real Dawn topography resampled from 137 m to 4096 px: each texel covers 0.73 km, the finest in the house, and the latitude average used 2 of the 5.3 source rows',
  ],
  [
    'topografia real da Dawn sobre um elipsoide de revolução: Vesta tem três eixos diferentes, e os 9 km entre os dois equatoriais ficam na luz como rampa suave',
    'real Dawn topography over an ellipsoid of revolution: Vesta has three different axes, and the 9 km between the two equatorial ones sit in the light as a gentle ramp',
  ],

  // ---- "a forma" (tabela `a forma` do ASSETS) ----------------------
  [
    'elipsoide, sem malha: a forma irregular medida pela Dawn existe publicada e esta casa ainda não a carrega',
    'an ellipsoid, no mesh: the irregular shape measured by Dawn is published, and this house does not load it yet',
  ],
  [
    'elipsoide, sem malha: a forma irregular do DAMIT existe publicada e esta casa ainda não a carrega',
    'an ellipsoid, no mesh: the irregular shape from DAMIT is published, and this house does not load it yet',
  ],
  [
    'elipsoide, sem malha: a forma irregular medida por ocultação existe publicada e esta casa ainda não a carrega',
    'an ellipsoid, no mesh: the irregular shape measured by occultation is published, and this house does not load it yet',
  ],
  [
    'geometria esculpida por código a partir das dimensões Cassini — não é medida ponto a ponto: as crateras são procedurais',
    'geometry sculpted by code from the Cassini dimensions — not measured point by point: the craters are procedural',
  ],
]);

/**
 * O PAR BILÍNGUE de uma frase da confissão. Falta de tradução LANÇA: a
 * alternativa seria emitir o português no campo inglês, e uma ficha em
 * inglês com uma linha em português é pior do que não publicar.
 *
 * `onde` entra só para a mensagem apontar a tabela que precisa da linha.
 */
export function bilingue(texto, onde) {
  if (texto === null || texto === undefined) return texto;
  const en = EM_INGLES.get(texto);
  if (en === undefined) {
    throw new Error(
      `scripts/data/atlas/texturas-em-ingles.mjs: sem inglês para ${onde} — ` +
        `"${texto}". O português é a CHAVE: frase nova (ou reescrita) precisa ` +
        'da linha correspondente aqui.'
    );
  }
  return { pt: texto, en };
}
