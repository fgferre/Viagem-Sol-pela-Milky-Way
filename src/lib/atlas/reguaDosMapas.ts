// ============================================================
// A RÉGUA DOS MAPAS — A TABELA ÚNICA (PLAN-REGUA-UNICA.md, etapa R2,
// 10/10/2026; a regra e os alvos de cada corpo vêm do estudo
// `capturas/regua-r2/estudo-da-regra.md`).
//
// O brilho e a cor MÉDIOS de cada corpo que reflete luz, na medida: a
// cadeia de dados (`scripts/data/atlas/regua-dos-mapas.mjs`, chamada por
// `baixa-texturas.mjs`) leva a média de cada mapa a estes números, e as luas
// esculpidas (`esculpido.ts`) escalam a família de regolito até eles. É o
// único lugar com estes números: a literatura de onde saem (p, índices de
// cor, fontes, confiança) mora em `docs/reference/MEDIDAS-DOS-CORPOS.md`, e
// o γ e a área comprimida de cada mapa, que a cadeia mede, em
// `reguaDosMapas.relatorio.json`, ao lado. A Terra fica fora desta etapa.
//
// O NÍVEL: p0, o albedo geométrico SEM o pico de oposição em 0,55 µm, sai de
// `valor / S` — `valor` é a grandeza medida que entra e `S` o pico que ela
// carrega, em ordem de preferência (estudo §2a):
//   1. sem pico, resolvido na superfície (equigonal VIMS, Lane & Irvine,
//      refletância normal de sonda): S = 1;
//   2. p de fase ≳ 1–2°, ou corpo sem pico de regolito (Tritão, os planetas,
//      Titã, Vênus): S = 1;
//   3. B0 da Cassini ISS a 30° (Hedman 2020, Lambert): S = 1,20;
//   4. p com o pico: luas de gelo do HST em oposição S = 1,57; TNOs em α→0
//      S = 1,19; luas de Urano do HST S = 1,3; rocha escura ou p de H,G
//      S = 1,28 (G = 0,12) a 1,21 (G = 0,32) — modelo de Bowell 1989, não
//      medida.
//
// A COR: B/G e R/G médios, as razões de refletância normalizadas pelo Sol
// nos três canais do app (443/550/641 nm). Dadas como razão, ou pelos
// índices medidos com as fórmulas do estudo §2b (`razaoBG`, `razaoRG`).
//
// O MATIZ (a política da fonte do mapa): 'foto' guarda a variação de cor da
// foto e só move a média (fonte em cor verdadeira no visível, ou cor
// construída sobre medida); 'tinta' faz o mapa virar luminância × uma tinta
// uniforme medida (fonte cinza, realçada em IV/UV, ou pintada por IA);
// 'esculpido' é a família de regolito procedural de `esculpido.ts`.
// ============================================================

/** As cores do Sol que normalizam os índices (Ramírez et al. 2012). */
const SOL_BV = 0.653;
const SOL_VRC = 0.352;

export type Matiz = 'foto' | 'tinta' | 'esculpido';

/** Uma caixa em latitude e longitude LESTE (graus; `lonE` anda para leste e pode dar a volta). */
export interface Regiao {
  nome: string;
  lat: readonly [number, number];
  lonE: readonly [number, number];
}

/** A segunda âncora medida: a razão das médias de G entre uma região clara e uma escura, que fixa o γ. */
export interface SegundaAncora {
  razao: number;
  clara: Regiao;
  escura: Regiao;
  fonte: string;
}

export interface MedidaDoCorpo {
  /** a grandeza medida que entra no nível */
  valor: number;
  /** o pico de oposição que `valor` carrega (p0 = valor / S) */
  S: number;
  fonteDoNivel: string;
  /** o nível repousa numa suposição ou numa média, não numa medida direta (a ficha o sela como derivado) */
  nivelDerivado?: true;
  /** B/G como razão, pelo B−V (Johnson) ou pela razão de filtros Cassini 420/568 nm */
  BG: number | { BV: number } | { r420: number };
  /** R/G como razão (inclusive Cassini 647/568 nm) ou pelo V−Rc (Cousins) */
  RG: number | { VRc: number };
  fonteDaCor: string;
  matiz: Matiz;
  /** de onde vem o mapa, que decide o matiz */
  fonteDoMapa: string;
  confianca: string;
  ancora?: SegundaAncora;
}

// As três fontes (`fonteDoNivel`, `fonteDaCor`, `fonteDoMapa`) saem na ficha dos dois idiomas: são
// citações neutras (autor+ano, missão, grandeza, símbolo), sem prosa. O que a prosa dizia mora aqui, em
// comentário. `fonteDoMapa` não diz "em cinza" nem "em cor": isso é o `matiz` (tinta = fonte cinza).
// `S(H,G)` marca o pico de oposição tirado por modelo (Bowell 1989); a ficha o procura (`PICO_POR_MODELO`).

// mosaico global de Paul Schenk, realçado em IV/UV
const SCHENK = 'Cassini mosaic (Schenk)';
// pintura por IA na conta do dono; nada aqui é foto
const IA = 'AI painting';
// a família de regolito procedural de `esculpido.ts`
const ESCULPIDO = 'procedural regolith';

export const REGUA_DOS_MAPAS: Readonly<Record<string, MedidaDoCorpo>> = {
  // ---- planetas, a Lua e Marte
  mercury: {
    valor: 0.142, S: 1.28, fonteDoNivel: 'Mallama+2017 (p V); S(H,G)',
    BG: { BV: 0.97 }, RG: { VRc: 0.52 }, fonteDaCor: 'Mallama+2017 (B−V, MESSENGER)', // o B é sintético, do MESSENGER
    matiz: 'tinta', fonteDoMapa: 'Solar System Scope 8k (MESSENGER mosaic)', confianca: 'p alta, S média',
  },
  venus: {
    valor: 0.689, S: 1, fonteDoNivel: 'Mallama+2017 (p V)', // topo de nuvens, sem pico de regolito
    BG: { BV: 0.7 }, RG: { VRc: 0.35 }, fonteDaCor: 'Mallama+2017',
    matiz: 'tinta', fonteDoMapa: 'Solar System Scope 4k (atmosphere)', confianca: 'alta', // feições do UV, não do visível
  },
  moon: {
    valor: 0.113, S: 1, fonteDoNivel: 'Lane & Irvine 1973', // fase zero, sem o surto
    BG: { BV: 0.88 }, RG: { VRc: 0.538 },
    // o V−Rc é derivado (a inclinação do B−V estendida até Rc, fotometria.ts), não medido
    fonteDaCor: 'Thejll+2014 (B−V); V−Rc ≈ f(B−V)',
    matiz: 'tinta', fonteDoMapa: 'Solar System Scope 8k (LRO mosaic)', confianca: 'p alta, cor média/baixa',
  },
  mars: {
    valor: 0.17, S: 1, fonteDoNivel: 'Mallama+2017 (p V)',
    BG: { BV: 1.36 }, RG: { VRc: 0.82 }, fonteDaCor: 'Mallama+2017',
    matiz: 'foto', fonteDoMapa: 'Solar System Scope 8k (Viking)', confianca: 'alta',
  },
  phobos: {
    valor: 0.068, S: 1.28, fonteDoNivel: 'HRSC 538 nm (p); S(H,G)',
    BG: 0.91, RG: 1.07, fonteDaCor: 'Fornasier+2024 (7.9 %/100 nm)', // inclinação espectral
    matiz: 'tinta', fonteDoMapa: 'USGS Viking mosaic (Stooke, DLR control)', confianca: 'média',
  },
  deimos: {
    valor: 0.068, S: 1.28, fonteDoNivel: 'Thomas+1996 (p); S(H,G)',
    BG: 0.89, RG: 1.09, fonteDaCor: '9.6 %/100 nm', // inclinação espectral
    matiz: 'tinta', fonteDoMapa: 'Viking + HiRISE mosaic (Stooke, PDS)', confianca: 'média',
  },
  jupiter: {
    valor: 0.538, S: 1, fonteDoNivel: 'Mallama+2017 (p V)',
    BG: { BV: 0.86 }, RG: { VRc: 0.35 }, fonteDaCor: 'Mallama+2017',
    matiz: 'foto', fonteDoMapa: 'Solar System Scope 8k (Cassini)', confianca: 'alta',
  },
  saturn: {
    valor: 0.517, S: 1, fonteDoNivel: 'Mallama & Pavlov 2017 (p V)', // só do globo, sem os anéis
    BG: { BV: 1.07 }, RG: 1.08, fonteDaCor: 'Mallama+2017 (B−V); R/G (V−R Johnson 0.68)',
    matiz: 'foto', fonteDoMapa: 'Solar System Scope 8k', confianca: 'média-alta',
  },
  uranus: {
    valor: 0.488, S: 1, fonteDoNivel: 'Mallama+2017 (p V)',
    BG: { BV: 0.5 }, RG: { VRc: -0.27 }, fonteDaCor: 'Mallama+2017',
    matiz: 'foto', fonteDoMapa: 'Solar System Scope 2k', confianca: 'alta',
  },
  neptune: {
    valor: 0.442, S: 1, fonteDoNivel: 'Mallama+2017 (p V)',
    BG: { BV: 0.39 }, RG: { VRc: -0.33 }, fonteDaCor: 'Mallama+2017',
    matiz: 'foto', fonteDoMapa: 'Solar System Scope 2k (Voyager)', confianca: 'alta',
  },
  // ---- os galileanos (S = 1 suposto: se o p trouxer o pico, caem 20–30 %)
  io: {
    valor: 0.63, S: 1, fonteDoNivel: 'Simonelli & Veverka 1984; S = 1',
    nivelDerivado: true, // pico de oposição suposto ausente
    BG: { r420: 0.55 }, RG: 1.08, fonteDaCor: 'Mayorga+2020 (Cassini 420/568, 647/568 nm)',
    matiz: 'foto', fonteDoMapa: 'NASA 3D Resources (Galileo)', confianca: 'média',
  },
  europa: {
    valor: 0.67, S: 1, fonteDoNivel: 'Buratti & Veverka 1983; S = 1',
    nivelDerivado: true, // pico de oposição suposto ausente
    BG: { r420: 0.84 }, RG: 1.02, fonteDaCor: 'Mayorga+2020 (Cassini 420/568, 647/568 nm)',
    // o mosaico USGS em cinza, com a croma medida nas fotos PIA19048/PIA00502 (cor-europa.mjs)
    matiz: 'foto', fonteDoMapa: 'USGS mosaic; PIA19048, PIA00502', confianca: 'média',
  },
  ganymede: {
    valor: 0.43, S: 1, fonteDoNivel: 'Morrison & Morrison 1977; S = 1',
    nivelDerivado: true, // pico de oposição suposto ausente
    BG: { r420: 0.86 }, RG: 1.01, fonteDaCor: 'Mayorga+2020 (Cassini 420/568, 647/568 nm)',
    matiz: 'tinta', fonteDoMapa: 'NASA 3D Resources', confianca: 'média',
  },
  callisto: {
    valor: 0.17, S: 1, fonteDoNivel: 'Morrison & Morrison 1977; S = 1',
    nivelDerivado: true, // pico de oposição suposto ausente
    BG: { r420: 0.82 }, RG: 1.0, fonteDaCor: 'Mayorga+2020 (Cassini 420/568, 647/568 nm)',
    matiz: 'tinta', fonteDoMapa: 'NASA 3D Resources', confianca: 'média',
  },
  // ---- Saturno: as luas médias (nível alto, cor média-baixa: inclinações VIMS)
  mimas: {
    valor: 0.63, S: 1, fonteDoNivel: 'Filacchione+2022, VIMS equigonal 0.55 µm',
    BG: 0.89, RG: 0.98, fonteDaCor: 'VIMS',
    matiz: 'tinta', fonteDoMapa: SCHENK, confianca: 'nível alto, cor média-baixa',
  },
  enceladus: {
    valor: 0.89, S: 1, fonteDoNivel: 'Filacchione+2022, VIMS equigonal 0.55 µm',
    BG: 0.92, RG: 1.0, fonteDaCor: 'VIMS; IR3/UV3',
    matiz: 'tinta', fonteDoMapa: SCHENK, confianca: 'nível alto, cor média-baixa',
  },
  tethys: {
    valor: 0.74, S: 1, fonteDoNivel: 'Filacchione+2022, VIMS equigonal 0.55 µm',
    BG: 0.93, RG: 1.0, fonteDaCor: 'VIMS',
    matiz: 'tinta', fonteDoMapa: SCHENK, confianca: 'nível alto, cor média-baixa',
  },
  dione: {
    valor: 0.65, S: 1, fonteDoNivel: 'Filacchione+2022, VIMS equigonal 0.55 µm',
    BG: 0.92, RG: 1.0, fonteDaCor: 'VIMS',
    matiz: 'tinta', fonteDoMapa: SCHENK, confianca: 'nível alto, cor média-baixa',
  },
  rhea: {
    valor: 0.6, S: 1, fonteDoNivel: 'Filacchione+2022, VIMS equigonal 0.55 µm',
    BG: 0.9, RG: 1.0, fonteDaCor: 'VIMS',
    matiz: 'tinta', fonteDoMapa: SCHENK, confianca: 'nível alto, cor média-baixa',
  },
  titan: {
    valor: 0.215, S: 1, fonteDoNivel: 'Harris; NSSDC (p V)', // p V da névoa, sem pico de regolito
    BG: { BV: 1.3 }, RG: 1.46, fonteDaCor: 'Harris 1974 (B−V); R/G ≈', // B−V da resenha da NASA de 1974; R/G aproximado
    // o mapa é só a névoa laranja, 720×360 (ASSETS.md, titan/map), não a superfície no IV
    matiz: 'tinta', fonteDoMapa: 'NASA 3D Resources (haze, 720×360)', confianca: 'média',
  },
  hyperion: {
    valor: 0.44, S: 1.57, fonteDoNivel: 'Verbiscer+2018 (p); S: HST', // p só pela Wikipédia; S das luas de gelo do HST
    BG: 0.87, RG: 1.07, fonteDaCor: 'VIMS',
    matiz: 'tinta', fonteDoMapa: IA, confianca: 'baixa',
  },
  iapetus: {
    // as metades do mapa têm a mesma área: a média das duas âncoras é a média do corpo
    valor: (0.04 + 0.38) / 2, S: 1, fonteDoNivel: 'mean(Blackburn+2011, Buratti 2005)',
    nivelDerivado: true, // a média de duas âncoras de terreno, não uma medida do corpo
    BG: 0.9, RG: 1.03, fonteDaCor: 'VIMS',
    matiz: 'tinta', fonteDoMapa: SCHENK, confianca: 'baixa-média',
    ancora: {
      razao: 0.38 / 0.04,
      clara: { nome: 'o hemisfério traseiro (a metade clara do mapa)', lat: [-90, 90], lonE: [0, 180] },
      escura: { nome: 'o hemisfério dianteiro (Cassini Regio, a metade escura)', lat: [-90, 90], lonE: [180, 360] },
      fonte: 'clara 0,38 (Blackburn+2011, material claro), escura 0,04 (Buratti 2005, de 2ª mão); as metades do mapa, como no estudo',
    },
  },
  // ---- Saturno: as pequenas (B0 do ISS a 30°, Hedman 2020, salvo Dáfnis)
  phoebe: {
    valor: 0.0856, S: 1.28, fonteDoNivel: 'Miller+2011 (p V); S(H,G)', // p só pela Wikipédia
    BG: 1.03, RG: 0.98, fonteDaCor: 'Grav & Bauer 2007 (−2.5 %/100 nm)', // inclinação espectral
    matiz: 'esculpido', fonteDoMapa: ESCULPIDO, confianca: 'média',
  },
  pan: {
    valor: 0.649, S: 1.2, fonteDoNivel: 'Hedman+2020 (B0, 30°)',
    BG: 0.76, RG: 1.04, fonteDaCor: 'Buratti+2019, Hedman+2020', // o espectro medido (cor-alvo da versão F)
    // pintura por IA recolorida pela medida: o núcleo e a crista com as cores medidas
    matiz: 'foto', fonteDoMapa: 'AI painting; Buratti+2019, Hedman+2020 (color)',
    confianca: 'média',
  },
  daphnis: {
    valor: 0.91, S: 1.57, fonteDoNivel: 'Verbiscer+2018 (p); S: HST', // p só pela Wikipédia; S das luas de gelo do HST
    BG: 0.84, RG: 1.03, fonteDaCor: 'Buratti+2019 (IR3/UV3)',
    matiz: 'esculpido', fonteDoMapa: ESCULPIDO, confianca: 'baixa',
  },
  atlas: {
    valor: 0.625, S: 1.2, fonteDoNivel: 'Hedman+2020 (B0, 30°)',
    BG: 0.83, RG: 1.03, fonteDaCor: 'IR3/UV3; VIMS',
    matiz: 'esculpido', fonteDoMapa: ESCULPIDO, confianca: 'média',
  },
  prometheus: {
    valor: 0.793, S: 1.2, fonteDoNivel: 'Hedman+2020 (B0, 30°)',
    BG: 0.74, RG: 1.04, fonteDaCor: 'VIMS',
    matiz: 'esculpido', fonteDoMapa: ESCULPIDO, confianca: 'média',
  },
  pandora: {
    valor: 0.76, S: 1.2, fonteDoNivel: 'Hedman+2020 (B0, 30°)',
    BG: 0.81, RG: 1.03, fonteDaCor: 'IR3/UV3; VIMS',
    matiz: 'esculpido', fonteDoMapa: ESCULPIDO, confianca: 'média',
  },
  janus: {
    valor: 0.531, S: 1.2, fonteDoNivel: 'Hedman+2020 (B0, 30°)',
    BG: 0.87, RG: 1.04, fonteDaCor: 'VIMS',
    matiz: 'esculpido', fonteDoMapa: ESCULPIDO, confianca: 'média',
  },
  epimetheus: {
    valor: 0.463, S: 1.2, fonteDoNivel: 'Hedman+2020 (B0, 30°)',
    BG: 0.9, RG: 1.03, fonteDaCor: 'IR3/UV3 (VIMS-equiv.)',
    matiz: 'esculpido', fonteDoMapa: ESCULPIDO, confianca: 'média',
  },
  // ---- Urano: as cinco (HST, Karkoschka 2001 via DeColibus+2026; Miranda baixa)
  miranda: {
    // refletância normal 0,30–0,37 (de 2ª mão), o meio da faixa
    valor: 0.33, S: 1, fonteDoNivel: 'Buratti & Mosher 1991 (0.30–0.37)',
    nivelDerivado: true, // o meio de uma faixa publicada, não uma medida
    // a cor não é medida: Karkoschka a diz levemente azulada, sem número
    BG: 1, RG: 1, fonteDaCor: 'Karkoschka 2001 (qualitative); B/G = R/G = 1',
    matiz: 'tinta', fonteDoMapa: IA, confianca: 'baixa',
  },
  ariel: {
    valor: 0.532, S: 1.3, fonteDoNivel: 'HST F547M (p); S: HST', // S das luas de Urano
    BG: 1 / 1.025, RG: 1.024, fonteDaCor: 'HST (V/B, R/V)',
    matiz: 'tinta', fonteDoMapa: IA, confianca: 'média',
  },
  umbriel: {
    valor: 0.259, S: 1.3, fonteDoNivel: 'HST F547M (p); S: HST', // S das luas de Urano
    BG: 1 / 1.028, RG: 1.012, fonteDaCor: 'HST (V/B, R/V)',
    matiz: 'tinta', fonteDoMapa: IA, confianca: 'média',
  },
  titania: {
    valor: 0.347, S: 1.3, fonteDoNivel: 'HST F547M (p); S: HST', // S das luas de Urano
    BG: 1 / 1.044, RG: 1.03, fonteDaCor: 'HST (V/B, R/V)',
    matiz: 'tinta', fonteDoMapa: IA, confianca: 'média',
  },
  oberon: {
    valor: 0.314, S: 1.3, fonteDoNivel: 'HST F547M (p); S: HST', // S das luas de Urano
    BG: 1 / 1.052, RG: 1.036, fonteDaCor: 'HST (V/B, R/V)',
    matiz: 'tinta', fonteDoMapa: IA, confianca: 'média',
  },
  // ---- Netuno e Plutão
  triton: {
    valor: 0.72, S: 1, fonteDoNivel: 'Hicks & Buratti 2004 (p V)', // sem o pico estreito; de 2ª mão
    BG: { BV: 0.7 }, RG: 1, fonteDaCor: 'Pascu+2006 (B−V); R/G = 1', // R/G não medido
    matiz: 'tinta', fonteDoMapa: IA, confianca: 'média',
  },
  pluto: {
    valor: 0.51, S: 1.19, fonteDoNivel: 'Verbiscer+2022 (p V); S: TNO', // S dos TNOs (Tritão)
    BG: { BV: 0.954 }, RG: { VRc: 0.515 }, fonteDaCor: 'Buie+2010 (B−V); Hainaut+2012 (V−R)', // o B−V de Buie é só de Plutão
    // a cor da Ralph/MVIC; o sul e o lado de trás, inventados com retalhos e o tom dessa mesma cor (cor-inventada.mjs)
    matiz: 'foto', fonteDoMapa: 'PIA11707 (Ralph/MVIC)',
    confianca: 'média',
    ancora: {
      razao: 0.8 / 0.12,
      clara: { nome: 'Sputnik Planitia', lat: [5, 35], lonE: [165, 192] },
      escura: { nome: 'Cthulhu Macula', lat: [-10, 5], lonE: [95, 145] },
      fonte: 'Hofgartner+2023: Sputnik 0,80, Cthulhu 0,12 (bolométricos; só a razão entra); as caixas são o miolo de cada região no mapa',
    },
  },
  charon: {
    valor: 0.41, S: 1.19, fonteDoNivel: 'Verbiscer+2022 (p V); S: TNO', // S dos TNOs (Tritão)
    BG: { BV: 0.7315 }, RG: 1, fonteDaCor: 'Buie+2010 (B−V); R/G = 1', // R/G não medido
    // o mosaico em cinza; o sul, inventado, também em cinza
    matiz: 'tinta', fonteDoMapa: 'USGS mosaic 300 m (LORRI+MVIC)', confianca: 'média',
  },
  // ---- asteroides e anões de fora
  ceres: {
    valor: 0.09, S: 1.28, fonteDoNivel: 'Li+2006 (p V, SBDB); S(H,G)',
    BG: { BV: 0.713 }, RG: { VRc: 0.375 }, fonteDaCor: 'SBDB (B−V); V−R 0.375', // o V−R da tinta antiga (item 141)
    matiz: 'tinta', fonteDoMapa: 'USGS (Dawn FC mosaic)', confianca: 'alta',
  },
  vesta: {
    valor: 0.38, S: 1.21, fonteDoNivel: 'Li+2013 (p, Dawn FC 554 nm); S(H,G), G = 0.32',
    BG: { BV: 0.782 }, RG: 1.1, fonteDaCor: 'SBDB (B−V); R/G ≈ f(B−V)', // R/G derivado pela inclinação do B−V
    matiz: 'tinta', fonteDoMapa: 'NASA 3D Resources (Dawn mosaic)', confianca: 'alta',
  },
  pallas: {
    valor: 0.155, S: 1.28, fonteDoNivel: 'Vernazza+2021 (p, SBDB); S(H,G)',
    BG: { BV: 0.635 }, RG: 0.99, fonteDaCor: 'SBDB (B−V); R/G ≈ f(B−V)', // R/G derivado pela inclinação do B−V
    matiz: 'tinta', fonteDoMapa: IA, confianca: 'média',
  },
  hygiea: {
    valor: 0.0717, S: 1.28, fonteDoNivel: 'IRAS (p, SBDB); S(H,G)',
    BG: { BV: 0.696 }, RG: 1.03, fonteDaCor: 'SBDB (B−V); R/G ≈ f(B−V)', // R/G derivado pela inclinação do B−V
    matiz: 'tinta', fonteDoMapa: IA, confianca: 'média',
  },
  haumea: {
    valor: 0.51, S: 1.19, fonteDoNivel: 'Ortiz+2017 (p); S: TNO', // p da forma que o app desenha
    BG: { BV: 0.631 }, RG: { VRc: 0.37 }, fonteDaCor: 'Hainaut+2012',
    matiz: 'tinta', fonteDoMapa: IA, confianca: 'média',
  },
  makemake: {
    valor: 0.81, S: 1.19, fonteDoNivel: 'Brown 2013 (p); S: TNO',
    BG: { BV: 0.868 }, RG: { VRc: 0.449 }, fonteDaCor: 'Alvarez-Candal+2020', // do espectro
    matiz: 'tinta', fonteDoMapa: IA, confianca: 'média',
  },
  eris: {
    valor: 0.96, S: 1.19, fonteDoNivel: 'Sicardy+2011 (p); S: TNO',
    BG: 0.97, RG: 1.03, fonteDaCor: 'Alvarez-Candal+2011 (≈3 %/100 nm)', // do espectro; os índices brigam com ele
    matiz: 'tinta', fonteDoMapa: IA, confianca: 'média-alta',
  },
  quaoar: {
    valor: 0.109, S: 1.19, fonteDoNivel: 'Braga-Ribas+2013 (p); S: TNO',
    BG: { BV: 0.958 }, RG: { VRc: 0.65 }, fonteDaCor: 'Hainaut+2012',
    matiz: 'tinta', fonteDoMapa: IA, confianca: 'média',
  },
};

/** B/G da medida: a razão, 10^(−0,4[(B−V) − (B−V)☉]) ou (420/568)^0,85 (estudo §2b). */
export function razaoBG(bg: MedidaDoCorpo['BG']): number {
  if (typeof bg === 'number') return bg;
  if ('BV' in bg) return 10 ** (-0.4 * (bg.BV - SOL_BV));
  return bg.r420 ** 0.85;
}

/** R/G da medida: a razão ou 10^(0,4[(V−Rc) − (V−Rc)☉]) (estudo §2b). */
export function razaoRG(rg: MedidaDoCorpo['RG']): number {
  if (typeof rg === 'number') return rg;
  return 10 ** (0.4 * (rg.VRc - SOL_VRC));
}

export interface AlvoDoMapa {
  p0: number;
  BG: number;
  RG: number;
  matiz: Matiz;
  ancora?: SegundaAncora;
}

/** O alvo da régua para um corpo: p0 = valor / S e as razões de cor. Corpo fora da tabela: erro. */
export function alvoDoMapa(id: string): AlvoDoMapa {
  const m = REGUA_DOS_MAPAS[id];
  if (!m) throw new Error(`régua: ${id} não está na tabela (reguaDosMapas.ts).`);
  return {
    p0: m.valor / m.S,
    BG: razaoBG(m.BG),
    RG: razaoRG(m.RG),
    matiz: m.matiz,
    ...(m.ancora ? { ancora: m.ancora } : {}),
  };
}
