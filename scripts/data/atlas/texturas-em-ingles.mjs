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
  [
    'código do autor (Felipe Ferreira); posições do Gazetteer da IAU e mosaico Cassini em domínio público',
    "the author's own code (Felipe Ferreira); IAU Gazetteer positions and Cassini mosaic in the public domain",
  ],
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
  // ---- o defeito: Plutão e Caronte (item 149; a cor inventada, PLAN-COR.md) ----
  [
    'mapa em cor real da New Horizons; o polo sul estava em noite polar no sobrevoo de 2015, e os 30 % nunca fotografados levam cor INVENTADA por código, não medida: pedaços da cor real das planícies crateradas fotografadas, escolhidos pelo relevo inventado, sobre um tom que continua o da borda fotografada; no lado de trás, visto só de longe, a foto fica na escala em que a sonda a resolveu e o detalhe mais fino é inventado da mesma forma; a sombra do relevo que as fotos traziam saiu onde o relevo medido a explica (a luz do app faz a sombra), e a mais fina, que o relevo medido não alcança, continua na foto',
    'real-color New Horizons map; the south pole was in polar night during the 2015 flyby, and the 30 % never imaged carry color INVENTED by code, not a measurement: pieces of the real color of the imaged cratered plains, chosen by the invented relief, over a tone that continues the imaged edge; on the far side, seen only from afar, the image stays at the scale the probe resolved it and the finer detail is invented the same way; the relief shading the images carried was removed where the measured relief explains it (the app\'s light casts the shading), and the finest shading, beyond what the measured relief resolves, stays in the image',
  ],
  [
    'mosaico real da New Horizons, e sem cor: não existe mapa global em cor de Caronte; o terço sul, em noite polar no sobrevoo, leva cor INVENTADA por código, não medida: pedaços da planície real fotografada, escolhidos pelo relevo inventado, sobre um tom que continua o da borda fotografada; no lado de trás, visto só de longe, a foto fica na escala em que a sonda a resolveu e o detalhe mais fino é inventado da mesma forma; a sombra do relevo que as fotos traziam saiu onde o relevo medido a explica (a luz do app faz a sombra), e a mais fina, que o relevo medido não alcança, continua na foto',
    'real New Horizons mosaic, and without color: no global color map of Charon exists; the southern third, in polar night during the flyby, carries color INVENTED by code, not a measurement: pieces of the real imaged plain, chosen by the invented relief, over a tone that continues the imaged edge; on the far side, seen only from afar, the image stays at the scale the probe resolved it and the finer detail is invented the same way; the relief shading the images carried was removed where the measured relief explains it (the app\'s light casts the shading), and the finest shading, beyond what the measured relief resolves, stays in the image',
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
    'NASA 3D Resources — Titã (720×360, névoa; mosaico Cassini fica pendente da bancada)',
    'NASA 3D Resources — Titan (720×360, haze only; the Cassini mosaic is still pending on the bench)',
  ],

  // ---- Europa (item 230, PLAN-EUROPA-JAPETO.md): o mosaico USGS de 500 m
  // e a cor inferida do brilho — fonte, atribuição e o defeito
  [
    'Voyager e Galileo SSI — mosaico global de Europa a 500 m (USGS Astrogeology, 19631×9816, em cinza), com a cor inferida nesta casa a partir da foto em cor da Galileo PIA19048',
    'Voyager and Galileo SSI — global mosaic of Europa at 500 m (USGS Astrogeology, 19631×9816, grayscale), with the color inferred here from the Galileo color image PIA19048',
  ],
  [
    'Imagens: Voyager e Galileo SSI (NASA/JPL-Caltech); mosaico do USGS Astrogeology Science Center. Cor de referência: PIA19048 (NASA/JPL-Caltech/SETI Institute) e PIA00502 (NASA/JPL/DLR). Redução para 4096 px, giro de longitude, preenchimento do sul sem dado e cor inferida do brilho nesta casa (baixa-texturas.mjs, cor-europa.mjs).',
    'Images: Voyager and Galileo SSI (NASA/JPL-Caltech); mosaic by the USGS Astrogeology Science Center. Reference color: PIA19048 (NASA/JPL-Caltech/SETI Institute) and PIA00502 (NASA/JPL/DLR). Reduction to 4096 px, longitude rotation, filling of the south with no data, and color inferred from the brightness done here (baixa-texturas.mjs, cor-europa.mjs).',
  ],
  [
    'mosaico real da Voyager e da Galileo a 500 m, mas em cinza: o brilho é medido e a cor não — não existe mapa global em cor de Europa; a cor é INFERIDA do brilho nesta casa: o gelo claro quase neutro e o material escuro avermelhado das linhas, os dois medidos na foto em cor da Galileo de um hemisfério, misturados conforme o brilho de cada ponto, mais o amarelado do hemisfério que vem atrás na órbita; o hemisfério da frente nunca foi fotografado em cor, e a calota sul sem imagem (a partir de 77 a 84° sul) foi preenchida com o tom da faixa vizinha',
    'real Voyager and Galileo mosaic at 500 m, but in gray: the brightness is measured and the color is not — no global color map of Europa exists; the color is INFERRED from the brightness here: the nearly neutral bright ice and the reddish dark material of the lines, both measured in a Galileo color image of one hemisphere, blended according to the brightness of each point, plus the yellowish tint of the hemisphere that trails in its orbit; the leading hemisphere was never imaged in color, and the south cap with no images (from 77 to 84° south) was filled with the tone of the neighboring band',
  ],

  // ---- fontes: mosaicos Cassini graduados no projeto Saturn ---------
  [
    'Mosaico global Cassini de Mimas (Paul Schenk, PIA18437) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    'Cassini global mosaic of Mimas (Paul Schenk, PIA18437) — IR/UV enhanced color, graded to natural color in the Saturn project',
  ],
  [
    'Mosaico global Cassini de Encélado (Paul Schenk, PIA18435) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    'Cassini global mosaic of Enceladus (Paul Schenk, PIA18435) — IR/UV enhanced color, graded to natural color in the Saturn project',
  ],
  [
    'Mosaico global Cassini de Tétis (Paul Schenk, PIA18439) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    'Cassini global mosaic of Tethys (Paul Schenk, PIA18439) — IR/UV enhanced color, graded to natural color in the Saturn project',
  ],
  [
    'Mosaico global Cassini de Dione (Paul Schenk, PIA18434) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    'Cassini global mosaic of Dione (Paul Schenk, PIA18434) — IR/UV enhanced color, graded to natural color in the Saturn project',
  ],
  [
    'Mosaico global Cassini de Reia (Paul Schenk, PIA18438) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    'Cassini global mosaic of Rhea (Paul Schenk, PIA18438) — IR/UV enhanced color, graded to natural color in the Saturn project',
  ],
  [
    'Mosaico global Cassini de Jápeto (Paul Schenk, PIA18436) — cor realçada IR/UV, graduada para cor natural no projeto Saturn',
    'Cassini global mosaic of Iapetus (Paul Schenk, PIA18436) — IR/UV enhanced color, graded to natural color in the Saturn project',
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

  // ---- fontes: Hipérion (item 134/S3 → relevo medido, 23/09/2026) ---
  [
    'Pintura por IA generativa do autor sobre o relevo medido de Hipérion, com a foto Cassini PIA07740 só como referência — não existe mapa de cor medido de Hipérion',
    "The author's generative-AI painting over the measured relief of Hyperion, with the Cassini photo PIA07740 only as a reference — there is no measured color map of Hyperion",
  ],
  [
    'Modelo de forma de Hipérion (Thomas, Joseph & Ansty 2018, Cassini) — NASA PDS — mapa de ALTURA, com os poços tirados da pintura por IA',
    'Shape model of Hyperion (Thomas, Joseph & Ansty 2018, Cassini) — NASA PDS — HEIGHT map, with the pits taken from the AI painting',
  ],
  [
    'Modelo de forma de Hipérion (Thomas, Joseph & Ansty 2018, Cassini) — NASA PDS — mapa de NORMAIS derivado da altura, com os poços tirados da pintura por IA',
    'Shape model of Hyperion (Thomas, Joseph & Ansty 2018, Cassini) — NASA PDS — NORMAL map derived from the height, with the pits taken from the AI painting',
  ],
  [
    'Modelo de forma de Hipérion (Thomas, Joseph & Ansty 2018, Cassini) — NASA PDS — mapa de HORIZONTE (sombra de relevo assada, seis azimutes em RGB), com os poços tirados da pintura por IA',
    'Shape model of Hyperion (Thomas, Joseph & Ansty 2018, Cassini) — NASA PDS — HORIZON map (baked relief shadow, six azimuths in RGB), with the pits taken from the AI painting',
  ],
  [
    'domínio público (NASA PDS); os poços: imagem do autor (Felipe Ferreira), gerada com IA',
    "public domain (NASA PDS); the pits: the author's image (Felipe Ferreira), generated with AI",
  ],
  [
    'Forma: P. Thomas, J. Joseph & T. Ansty, Saturn Small Moon Shape Models V1.0 (NASA PDS, DOI 10.26033/ewy3-jy61). Mapa equiretangular assado nesta casa (Felipe Ferreira), com os poços da pintura por IA do autor.',
    "Shape: P. Thomas, J. Joseph & T. Ansty, Saturn Small Moon Shape Models V1.0 (NASA PDS, DOI 10.26033/ewy3-jy61). Equirectangular map baked in this house (Felipe Ferreira), with the pits from the author's AI painting.",
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
  // item 230: o relevo de Jápeto nasce nesta casa, inventado e ancorado no medido
  [
    'Relevo de Jápeto gerado nesta casa por relevo-japeto.mjs a partir do Gazetteer da IAU, Porco 2005, Giese 2008, Lopez Garcia 2014 e do mosaico Cassini (não existe DTM público) — mapa de ALTURA',
    'Relief of Iapetus generated here by relevo-japeto.mjs from the IAU Gazetteer, Porco 2005, Giese 2008, Lopez Garcia 2014, and the Cassini mosaic (no public DTM exists) — HEIGHT map',
  ],
  [
    'Relevo de Jápeto gerado nesta casa por relevo-japeto.mjs a partir do Gazetteer da IAU, Porco 2005, Giese 2008, Lopez Garcia 2014 e do mosaico Cassini (não existe DTM público) — mapa de NORMAIS derivado da altura',
    'Relief of Iapetus generated here by relevo-japeto.mjs from the IAU Gazetteer, Porco 2005, Giese 2008, Lopez Garcia 2014, and the Cassini mosaic (no public DTM exists) — NORMAL map derived from the height',
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
  [
    'New Horizons LORRI+MVIC — DEM global de Plutão a 300 m (USGS Astrogeology) — mapa de NORMAIS derivado da altura, em amplitude física',
    'New Horizons LORRI+MVIC — global DEM of Pluto at 300 m (USGS Astrogeology) — NORMAL map derived from the height, at physical amplitude',
  ],
  [
    'New Horizons LORRI+MVIC — DEM global de Caronte a 300 m (USGS Astrogeology) — mapa de NORMAIS derivado da altura, em amplitude física',
    'New Horizons LORRI+MVIC — global DEM of Charon at 300 m (USGS Astrogeology) — NORMAL map derived from the height, at physical amplitude',
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
    'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18437). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    'Mosaic: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18437). Color grading: Saturn project (Felipe Ferreira).',
  ],
  [
    'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18435). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    'Mosaic: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18435). Color grading: Saturn project (Felipe Ferreira).',
  ],
  [
    'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18439). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    'Mosaic: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18439). Color grading: Saturn project (Felipe Ferreira).',
  ],
  [
    'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18434). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    'Mosaic: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18434). Color grading: Saturn project (Felipe Ferreira).',
  ],
  [
    'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18438). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    'Mosaic: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18438). Color grading: Saturn project (Felipe Ferreira).',
  ],
  [
    'Mosaico: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18436). Graduação de cor: projeto Saturn (Felipe Ferreira).',
    'Mosaic: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Paul Schenk, PIA18436). Color grading: Saturn project (Felipe Ferreira).',
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
    'Crista e crateras com nome: Gazetteer of Planetary Nomenclature (IAU/USGS). Altura da crista: Porco et al. 2005 e Giese et al. 2008; perfis: Lopez Garcia et al. 2014; profundidade das crateras ancorada em White et al. 2013. Caminho da crista e crateras sem nome: mosaico global Cassini de Paul Schenk (PIA18436, NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute). Relevo gerado nesta casa (relevo-japeto.mjs, crateras-pela-foto.mjs) — não é medida.',
    'Ridge and named craters: Gazetteer of Planetary Nomenclature (IAU/USGS). Ridge height: Porco et al. 2005 and Giese et al. 2008; profiles: Lopez Garcia et al. 2014; crater depth anchored on White et al. 2013. Ridge path and unnamed craters: Cassini global mosaic by Paul Schenk (PIA18436, NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute). Relief generated here (relevo-japeto.mjs, crateras-pela-foto.mjs) — not a measurement.',
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
  [
    'Topografia: Schenk et al. 2018, Icarus 314, 400, a partir das imagens LORRI e Ralph/MVIC da equipe New Horizons (NASA/JHUAPL/SwRI/LPI), distribuída pelo USGS Astrogeology Science Center. Mapa de normais assado nesta casa (gera-normal-de-dem.mjs).',
    'Topography: Schenk et al. 2018, Icarus 314, 400, from the LORRI and Ralph/MVIC imaging of the New Horizons Team (NASA/JHUAPL/SwRI/LPI), distributed by the USGS Astrogeology Science Center. Normal map baked in this house (gera-normal-de-dem.mjs).',
  ],
  [
    'Topografia: Schenk et al. 2018, Icarus 315, 124, a partir das imagens LORRI e Ralph/MVIC da equipe New Horizons (NASA/JHUAPL/SwRI/LPI), distribuída pelo USGS Astrogeology Science Center. Mapa de normais assado nesta casa (gera-normal-de-dem.mjs).',
    'Topography: Schenk et al. 2018, Icarus 315, 124, from the LORRI and Ralph/MVIC imaging of the New Horizons Team (NASA/JHUAPL/SwRI/LPI), distributed by the USGS Astrogeology Science Center. Normal map baked in this house (gera-normal-de-dem.mjs).',
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
    'não existe mapa de altura medido de Jápeto: este relevo é INVENTADO por código nesta casa, ancorado no que foi medido — a crista do equador está nas longitudes do catálogo da IAU e no caminho que a foto da Cassini mostra, com até 20 km, a altura medida pelas sondas; as 55 crateras com nome estão no lugar e no tamanho do catálogo, e as outras onde a foto da Cassini as mostra; o perfil da crista, a profundidade de cada cratera (dada por uma regra pelo tamanho) e o chão liso entre elas são inventados',
    'no measured height map of Iapetus exists: this relief is INVENTED by code here, anchored on what was measured — the equatorial ridge sits at the longitudes of the IAU catalog and along the path the Cassini image shows, up to 20 km high, the height the spacecraft measured; the 55 named craters sit at the place and size given by the catalog, and the others where the Cassini image shows them; the ridge profile, the depth of each crater (set by a rule from its size), and the smooth ground between them are invented',
  ],
  // item 134/S3 → relevo medido de Hipérion (23/09/2026)
  [
    'não existe mapa de cor de Hipérion publicado (ela gira de modo caótico): o mapa é uma pintura por IA generativa sobre o relevo medido, com uma mancha em estrela apagada e as encostas íngremes clareadas nesta casa — nada na cor é medida',
    'there is no published color map of Hyperion (it spins chaotically): the map is a generative-AI painting over the measured relief, with one star-shaped blotch erased and the steep slopes brightened here — nothing in the color is a measurement',
  ],
  [
    'a forma é medida pela Cassini, mas os 3.488 poços cavados nela não são: saem das manchas escuras da pintura por IA',
    'the shape is measured by Cassini, but the 3,488 pits carved into it are not: they come from the dark spots of the AI painting',
  ],
  // item 226 — o horizonte de Hipérion (a mesma frase nos dois canais)
  [
    'a sombra, em seis azimutes, é assada da forma medida pela Cassini, mas a dos 3.488 poços não é medida: eles saem das manchas escuras da pintura por IA',
    'the shadow, in six azimuths, is baked from the shape measured by Cassini, but that of the 3,488 pits is not measured: they come from the dark spots of the AI painting',
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
  // 01–02/10/2026 — o relevo da New Horizons: medido em menos da metade do
  // globo, inventado por código no resto (PLAN-RELEVO.md)
  [
    'topografia real da New Horizons reamostrada de 300 m para 4096 px: cada texel cobre ~1,8 km, a média de latitude usou 2 das 6,1 linhas de origem, e só o hemisfério do sobrevoo e a calota norte têm mapa de altura — menos da metade do globo; o resto é relevo INVENTADO por código, não medida: pedaços do terreno medido do mesmo tipo, postos onde o mapa geológico das fotos da aproximação põe cada terreno, com as crateras reais do catálogo no lugar (Simonelli com o perfil medido da bacia Burney) e as menores sorteadas pela estatística do lado medido; o sul, quase sem imagem, é palpite; no lado medido, as emendas e o detalhe fino do dado borrado ou ruim foram refeitos sobre a forma medida, e o grão de ruído da planície Sputnik foi alisado',
    'real New Horizons topography resampled from 300 m to 4096 px: each texel covers ~1.8 km, the latitude average used 2 of the 6.1 source rows, and only the flyby hemisphere and the north cap have a height map — less than half the globe; the rest is relief INVENTED by code, not a measurement: pieces of measured terrain of the same kind, placed where the geological map from the approach images puts each terrain, with the real catalog craters in place (Simonelli with the measured profile of the Burney basin) and the smaller ones drawn from the statistics of the measured side; the south, almost unimaged, is a guess; on the measured side, the seams and the fine detail of blurred or bad data were redone over the measured shape, and the noise grain of Sputnik Planitia was smoothed',
  ],
  [
    'topografia real da New Horizons reamostrada de 300 m para 4096 px: cada texel cobre ~0,9 km, a média de latitude usou 2 das 3,1 linhas de origem, e só o hemisfério voltado para Plutão tem mapa de altura — menos da metade do globo; o resto é relevo INVENTADO por código, não medida: pedaços do terreno medido do mesmo tipo, postos por um mapa de terrenos que é palpite guiado pelas escarpas e crateras vistas nas fotos da aproximação, com as crateras reais do catálogo no lugar, as menores sorteadas pela estatística do lado medido e as escarpas e crateras candidatas do artigo traçadas; o sul, sem imagem de dia, é palpite; no lado medido, as emendas e o detalhe fino do dado borrado ou ruim foram refeitos sobre a forma medida',
    'real New Horizons topography resampled from 300 m to 4096 px: each texel covers ~0.9 km, the latitude average used 2 of the 3.1 source rows, and only the Pluto-facing hemisphere has a height map — less than half the globe; the rest is relief INVENTED by code, not a measurement: pieces of measured terrain of the same kind, placed by a terrain map that is a guess guided by the scarps and craters seen in the approach images, with the real catalog craters in place, the smaller ones drawn from the statistics of the measured side, and the scarps and candidate craters of the paper traced; the south, never imaged in daylight, is a guess; on the measured side, the seams and the fine detail of blurred or bad data were redone over the measured shape',
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
  // 30/09/2026 — Fobos e Deimos confessam o elipsoide (erro achado na
  // pesquisa de 22/09: o manifesto `formas` não os cobria)
  [
    'elipsoide, sem malha: só os três eixos medidos (27 × 22 × 18 km) — o modelo de forma irregular (Viking/MRO, NASA PDS) existe publicado e esta casa ainda não o carrega',
    'an ellipsoid, no mesh: only the three measured axes (27 × 22 × 18 km) — the irregular shape model (Viking/MRO, NASA PDS) is published, and this house does not load it yet',
  ],
  [
    'elipsoide, sem malha: só os três eixos medidos (15 × 12 × 11 km) — o modelo de forma irregular (Viking/MRO, NASA PDS) existe publicado e esta casa ainda não o carrega',
    'an ellipsoid, no mesh: only the three measured axes (15 × 12 × 11 km) — the irregular shape model (Viking/MRO, NASA PDS) is published, and this house does not load it yet',
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
