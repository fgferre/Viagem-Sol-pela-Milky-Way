import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  categoryCode,
  categoryDictionary,
  range,
  writeFloat32Asset,
} from './lib/binary.mjs';
import {
  GALACTIC_FRAME,
  galacticCoordinatesFromSourceName,
  heliocentricGalacticToProject,
  physicalRadiusPc,
} from './lib/galactic.mjs';
import { fetchGaiaTapTable } from './lib/gaia-tap.mjs';
import { fetchVizierTable, numeric } from './lib/vizier.mjs';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outputDirectory = path.join(rootDirectory, 'public', 'data', 'galaxy');
const cacheDirectory = path.join(rootDirectory, '.cache', 'galaxy-data');
const gaiaObQueryPath = path.join(
  rootDirectory,
  'scripts',
  'data',
  'queries',
  'gaia-dr3-ob-hot-stars.sql'
);
const refresh = process.argv.includes('--refresh');
const finiteOr = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);
const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

const catalogDefinitions = {
  dustDensity: {
    source: 'J/A+A/692/A255/finalmap',
    cacheName: 'apogee-dust-density',
    expectedColumns: ['GLON', 'GLAT', 'Distance', 'Density', 's_Density'],
    expectedCount: 196_503,
  },
  largeClouds: {
    source: 'J/A+A/692/A255/table1',
    cacheName: 'apogee-large-clouds',
    expectedColumns: [
      'GLON',
      'GLAT',
      'dcentre',
      'e_dcentre',
      'meanradius',
      'meandensity',
      'arm/association',
    ],
    expectedCount: 84,
  },
  molecularClouds: {
    source: 'J/ApJ/834/57/table1',
    cacheName: 'co-molecular-clouds',
    expectedColumns: [
      'GLON',
      'GLAT',
      'INF',
      'Dnear',
      'Dfar',
      'Rnear',
      'Rfar',
      'Mnear',
      'Mfar',
    ],
    expectedCount: 8_107,
  },
  spiralAnchors: {
    source: 'J/ApJ/885/131/table1',
    cacheName: 'bessel-masers',
    expectedColumns: ['Name', 'plx', 'e_plx', 'Arm', 'VLSR'],
    expectedCount: 199,
  },
  hiiRegions: {
    source: 'J/ApJS/212/1/wisecat',
    cacheName: 'wise-hii-regions',
    expectedColumns: [
      'WISE',
      'Cl',
      'GLON',
      'GLAT',
      'Rad',
      'Dist',
      'e_Dist',
      'Meth',
    ],
    expectedCount: 8_399,
  },
  gaiaClusters: {
    source: 'J/A+A/674/A37/table1',
    cacheName: 'gaia-dr3-open-clusters',
    expectedColumns: ['Cluster', 'GLON', 'GLAT', 'Nmemb', 'Plx', 'e_Plx', 'Age', 'nmag0'],
    expectedCount: 2_531,
  },
  gaiaCepheids: {
    source: 'J/A+A/674/A37/table2',
    cacheName: 'gaia-dr3-classical-cepheids',
    expectedColumns: [
      'GaiaDR3',
      'GLON',
      'GLAT',
      'Dist',
      'e_mu',
      '[Fe/H]',
      'e_[Fe/H]',
      'Flag',
      'logAge',
      'e_logAge',
    ],
    expectedCount: 3_306,
  },
};

console.log(`Baixando catálogos VizieR${refresh ? ' (cache ignorado)' : ''}...`);
const catalogEntries = await Promise.all(
  Object.entries(catalogDefinitions).map(async ([key, definition]) => {
    const result = await fetchVizierTable({
      ...definition,
      cacheDirectory,
      refresh,
    });
    if (result.rows.length !== definition.expectedCount) {
      throw new Error(
        `${definition.source}: ${result.rows.length} registros; ` +
          `o snapshot validado possui ${definition.expectedCount}.`
      );
    }
    console.log(
      `${definition.source}: ${result.rows.length} registros ` +
        `(${result.fromCache ? 'cache' : 'rede'}).`
    );
    return [key, result.rows];
  })
);
const catalogs = Object.fromEntries(catalogEntries);
const gaiaOb = await fetchGaiaTapTable({
  queryPath: gaiaObQueryPath,
  cacheName: 'gaia-dr3-ob-proxy-stars',
  cacheDirectory,
  refresh,
  expectedColumns: [
    'source_id',
    'random_index',
    'l',
    'b',
    'r_med_photogeo',
    'r_lo_photogeo',
    'r_hi_photogeo',
    'phot_g_mean_mag',
    'bp_rp',
    'teff_gspphot',
    'teff_esphs',
    'ruwe',
    'parallax_over_error',
    'visibility_periods_used',
  ],
});
if (gaiaOb.rows.length < 80_000) {
  throw new Error(
    `Gaia OB proxy retornou ${gaiaOb.rows.length} registros; ` +
      'o gate mínimo é 80.000.'
  );
}
console.log(
  `Gaia DR3 OB proxy: ${gaiaOb.rows.length} registros ` +
    `(${gaiaOb.fromCache ? 'cache' : 'rede'}).`
);

const negativeDustSamples = catalogs.dustDensity.filter(
  (row) => numeric(row, 'Density') < 0
).length;
// A DISTÂNCIA HELIOCÊNTRICA SAI DO ARQUIVO E FICA SÓ NO DIAGNÓSTICO.
// Ela é |posição − Sol| com o Sol num lugar declarado no manifesto: uma
// subtração guardada em disco. E `s_Density` chega ao renderer
// PRÉ-DIGERIDA em `densityConfidence` — a política de incerteza continua
// satisfeita, e guardar o número cru ao lado do resultado é redundância,
// não preservação. Poda de 2026-08-21; o racional inteiro está no
// `NORTE.md`, e a coluna crua volta do VizieR quando alguém precisar dela.
const dustDistancesPc = [];
const dustRecords = catalogs.dustDensity.map((row) => {
  const distancePc = numeric(row, 'Distance');
  dustDistancesPc.push(distancePc);
  const rawDensity = numeric(row, 'Density');
  const density = Math.max(0, rawDensity);
  const sigma = Math.max(0, numeric(row, 's_Density'));
  const [x, y, z] = heliocentricGalacticToProject(
    numeric(row, 'GLON'),
    numeric(row, 'GLAT'),
    distancePc
  );
  const confidence = density > 0 ? density / (density + sigma) : 0;
  return [x, y, z, density, confidence];
});

const largeCloudArmDictionary = categoryDictionary(
  catalogs.largeClouds.map((row) => row['arm/association'])
);
const largeCloudRecords = catalogs.largeClouds.map((row) => {
  const distancePc = numeric(row, 'dcentre') * 1_000;
  const [x, y, z] = heliocentricGalacticToProject(
    numeric(row, 'GLON'),
    numeric(row, 'GLAT'),
    distancePc
  );
  return [
    x,
    y,
    z,
    Math.max(0, finiteOr(numeric(row, 'meanradius'))),
    Math.max(0, numeric(row, 'meandensity')),
    Math.max(0, finiteOr(numeric(row, 'e_meandensity'))),
    distancePc,
    Math.max(0, finiteOr(numeric(row, 'e_dcentre'))) * 1_000,
    categoryCode(largeCloudArmDictionary, row['arm/association']),
  ];
});

let molecularCloudsOutsideRendererBounds = 0;
const molecularCloudRecords = catalogs.molecularClouds.map((row) => {
  const far = numeric(row, 'INF') === 1;
  const distancePc = numeric(row, far ? 'Dfar' : 'Dnear') * 1_000;
  const radiusPc = numeric(row, far ? 'Rfar' : 'Rnear');
  const massSolar = numeric(row, far ? 'Mfar' : 'Mnear');
  const [x, y, z] = heliocentricGalacticToProject(
    numeric(row, 'GLON'),
    numeric(row, 'GLAT'),
    distancePc
  );
  const galactocentricRadiusPc = Math.hypot(x, y);
  const rendererRecommended =
    distancePc >= 100 &&
    distancePc <= 30_000 &&
    galactocentricRadiusPc <= 30_000 &&
    Math.abs(z) <= 3_000 &&
    radiusPc <= 500;
  if (!rendererRecommended) molecularCloudsOutsideRendererBounds += 1;
  return [
    x,
    y,
    z,
    radiusPc,
    massSolar,
    Math.max(0, numeric(row, 'Sigma')),
    Math.max(0, numeric(row, 'SigV')),
    distancePc,
    far ? 1 : 0,
    galactocentricRadiusPc,
    rendererRecommended ? 1 : 0,
  ];
});

const normalizedMaserArm = (arm) => (arm === '???' ? '' : arm);
// PARALAXE POSITIVA, como nos aglomerados jovens logo abaixo. Sem o
// filtro, `1000/plx` com plx ≤ 0 devolve distância NEGATIVA e o maser
// aparece ESPELHADO pelo Sol — dado finito, plausível para o encoder
// (que só rejeita NaN) e capaz de puxar o fit BeSSeL sem ninguém ver.
// Nos 199 do snapshot de hoje toda plx é positiva (mínima 0,049 mas),
// então isto não move um byte do publicado; é a próxima regeneração que
// ele defende. Achado de auditoria externa (2026-08-12).
const maserRows = catalogs.spiralAnchors.filter((row) => numeric(row, 'plx') > 0);
// o dicionário nasce das linhas que SOBRARAM (precedente do H II logo
// abaixo): filtrar depois de numerar deixaria código de braço sem nenhum
// registro apontando para ele
const maserArmDictionary = categoryDictionary(
  maserRows.map((row) => normalizedMaserArm(row.Arm))
);
const maserRecords = maserRows.map((row) => {
  const coordinates = galacticCoordinatesFromSourceName(row.Name);
  if (!coordinates) throw new Error(`Nome BeSSeL sem coordenadas galácticas: ${row.Name}`);
  const parallaxMas = numeric(row, 'plx');
  const parallaxErrorMas = numeric(row, 'e_plx');
  const distancePc = 1_000 / parallaxMas;
  const [x, y, z] = heliocentricGalacticToProject(...coordinates, distancePc);
  return [
    x,
    y,
    z,
    distancePc,
    parallaxMas,
    parallaxErrorMas,
    parallaxErrorMas / parallaxMas,
    categoryCode(maserArmDictionary, normalizedMaserArm(row.Arm)),
    numeric(row, 'VLSR'),
  ];
});

const hiiWithDistance = catalogs.hiiRegions.filter(
  (row) => Number.isFinite(numeric(row, 'Dist')) && numeric(row, 'Dist') > 0
);
const normalizedHiiClass = (value) => (value === '?' ? '' : value);
const hiiClassDictionary = categoryDictionary(
  hiiWithDistance.map((row) => normalizedHiiClass(row.Cl))
);
const hiiMethodDictionary = categoryDictionary(hiiWithDistance.map((row) => row.Meth));
const hiiRecords = hiiWithDistance.map((row) => {
  const distancePc = numeric(row, 'Dist') * 1_000;
  const distanceErrorPc = Math.max(0, numeric(row, 'e_Dist')) * 1_000 || 0;
  const [x, y, z] = heliocentricGalacticToProject(
    numeric(row, 'GLON'),
    numeric(row, 'GLAT'),
    distancePc
  );
  return [
    x,
    y,
    z,
    physicalRadiusPc(numeric(row, 'Rad'), distancePc),
    distancePc,
    distanceErrorPc,
    distanceErrorPc / distancePc,
    categoryCode(hiiClassDictionary, normalizedHiiClass(row.Cl)),
    categoryCode(hiiMethodDictionary, row.Meth),
  ];
});

const youngClusterRows = catalogs.gaiaClusters.filter(
  (row) => numeric(row, 'Age') < 8 && numeric(row, 'Plx') > 0
);
const youngClusterRecords = youngClusterRows.map((row) => {
  const parallaxMas = numeric(row, 'Plx');
  const parallaxErrorMas = Math.max(0, numeric(row, 'e_Plx'));
  const distancePc = 1_000 / parallaxMas;
  const [x, y, z] = heliocentricGalacticToProject(
    numeric(row, 'GLON'),
    numeric(row, 'GLAT'),
    distancePc
  );
  return [
    x,
    y,
    z,
    distancePc,
    parallaxMas,
    parallaxErrorMas,
    parallaxErrorMas / parallaxMas,
    numeric(row, 'Age'),
    numeric(row, 'Nmemb'),
    numeric(row, 'nmag0'),
  ];
});

const youngCepheidRows = catalogs.gaiaCepheids.filter(
  (row) => numeric(row, 'logAge') < Math.log10(200_000_000)
);
const youngCepheidRecords = youngCepheidRows.map((row) => {
  const distancePc = numeric(row, 'Dist') * 1_000;
  const distanceModulusError = Math.max(0, numeric(row, 'e_mu'));
  const sigmaDistancePc = distancePc * (Math.LN10 / 5) * distanceModulusError;
  const [x, y, z] = heliocentricGalacticToProject(
    numeric(row, 'GLON'),
    numeric(row, 'GLAT'),
    distancePc
  );
  return [
    x,
    y,
    z,
    distancePc,
    sigmaDistancePc,
    numeric(row, 'logAge'),
    Math.max(0, numeric(row, 'e_logAge')),
    finiteOr(numeric(row, '[Fe/H]')),
    Math.max(0, finiteOr(numeric(row, 'e_[Fe/H]'))),
    numeric(row, 'Flag'),
  ];
});

// TRÊS COLUNAS NÃO VÃO MAIS PARA O ARQUIVO, e cada uma por um motivo:
// `r_med_photogeo` é derivável da posição (mesma conta da poeira acima);
// `random_index` virava um `randomSeed` que o shader parou de ler quando a
// cor das cem mil passou a sair da temperatura medida; e `bp_rp` é a cor
// OBSERVADA, já avermelhada pela poeira, que o renderer NÃO PODE usar
// porque aplica a própria extinção pelo `tauMap` — usá-la avermelharia
// duas vezes. As três continuam VIVAS na consulta: `bp_rp` e
// `random_index` entram no WHERE/ORDER que define a amostra, e é a
// consulta, publicada em `queries/gaia-dr3-ob-hot-stars.sql` e citada no
// manifesto, que reproduz qualquer coluna de origem. O que a poda tira é
// a CÓPIA que o visitante baixava sem ninguém ler.
const gaiaObDistancesPc = [];
const gaiaObProxyRecords = gaiaOb.rows.map((row) => {
  const distancePc = numeric(row, 'r_med_photogeo');
  gaiaObDistancesPc.push(distancePc);
  const lowerPc = numeric(row, 'r_lo_photogeo');
  const upperPc = numeric(row, 'r_hi_photogeo');
  const sigmaDistancePc = Math.max(
    distancePc - lowerPc,
    upperPc - distancePc,
    0
  );
  const [x, y, z] = heliocentricGalacticToProject(
    numeric(row, 'l'),
    numeric(row, 'b'),
    distancePc
  );
  const ruwe = numeric(row, 'ruwe');
  const parallaxOverError = numeric(row, 'parallax_over_error');
  const relativeDistanceError = sigmaDistancePc / distancePc;
  const astrometricConfidence =
    clamp((1.4 - ruwe) / 0.4, 0.2, 1) *
    clamp(parallaxOverError / 20, 0.25, 1);
  const temperature = Number.isFinite(numeric(row, 'teff_esphs'))
    ? numeric(row, 'teff_esphs')
    : numeric(row, 'teff_gspphot');
  return [
    x,
    y,
    z,
    sigmaDistancePc,
    numeric(row, 'phot_g_mean_mag'),
    temperature,
    astrometricConfidence / (1 + relativeDistanceError * 3),
  ];
});

await mkdir(outputDirectory, { recursive: true });
const assets = {
  dustDensity: await writeFloat32Asset(
    outputDirectory,
    'dust-density.bin',
    dustRecords,
    ['xPc', 'yPc', 'zPc', 'particleDensityCm3', 'densityConfidence']
  ),
  largeMolecularClouds: await writeFloat32Asset(
    outputDirectory,
    'large-molecular-clouds.bin',
    largeCloudRecords,
    [
      'xPc',
      'yPc',
      'zPc',
      'radiusPc',
      'particleDensityCm3',
      'sigmaDensityCm3',
      'heliocentricDistancePc',
      'sigmaDistancePc',
      'armAssociationCode',
    ]
  ),
  molecularClouds: await writeFloat32Asset(
    outputDirectory,
    'molecular-clouds.bin',
    molecularCloudRecords,
    [
      'xPc',
      'yPc',
      'zPc',
      'radiusPc',
      'massSolar',
      'surfaceDensitySolarPerPc2',
      'sigmaVelocityKmPerS',
      'heliocentricDistancePc',
      'farDistanceFlag',
      'galactocentricRadiusPc',
      'rendererRecommended',
    ]
  ),
  spiralAnchors: await writeFloat32Asset(
    outputDirectory,
    'spiral-anchors.bin',
    maserRecords,
    [
      'xPc',
      'yPc',
      'zPc',
      'heliocentricDistancePc',
      'parallaxMas',
      'sigmaParallaxMas',
      'relativeParallaxError',
      'armCode',
      'vLsrKmPerS',
    ]
  ),
  hiiRegions: await writeFloat32Asset(
    outputDirectory,
    'hii-regions.bin',
    hiiRecords,
    [
      'xPc',
      'yPc',
      'zPc',
      'radiusPc',
      'heliocentricDistancePc',
      'sigmaDistancePc',
      'relativeDistanceError',
      'classCode',
      'distanceMethodCode',
    ]
  ),
  gaiaYoungClusters: await writeFloat32Asset(
    outputDirectory,
    'gaia-young-clusters.bin',
    youngClusterRecords,
    [
      'xPc',
      'yPc',
      'zPc',
      'heliocentricDistancePc',
      'parallaxMas',
      'sigmaParallaxMas',
      'relativeParallaxError',
      'logAgeYears',
      'memberCount',
      'brightMemberCount',
    ]
  ),
  gaiaYoungCepheids: await writeFloat32Asset(
    outputDirectory,
    'gaia-young-cepheids.bin',
    youngCepheidRecords,
    [
      'xPc',
      'yPc',
      'zPc',
      'heliocentricDistancePc',
      'sigmaDistancePc',
      'logAgeYears',
      'sigmaLogAgeYears',
      'metallicityDex',
      'sigmaMetallicityDex',
      'inferredMetallicityFlag',
    ]
  ),
  gaiaObProxyStars: await writeFloat32Asset(
    outputDirectory,
    'gaia-ob-proxy-stars.bin',
    gaiaObProxyRecords,
    [
      'xPc',
      'yPc',
      'zPc',
      'sigmaDistancePc',
      'photGMeanMag',
      'effectiveTemperatureK',
      'astrometricConfidence',
    ]
  ),
};

const manifest = {
  schemaVersion: 1,
  encoding: 'Float32 little-endian, tightly packed',
  coordinateFrame: {
    units: 'parsec',
    origin: 'Galactic Center',
    xAxis: 'from Galactic Center toward the Sun',
    yAxis: 'toward Galactic longitude l=270 degrees (right-handed project basis)',
    zAxis: 'toward the north Galactic pole',
    sun: [GALACTIC_FRAME.sunRadiusPc, 0, GALACTIC_FRAME.sunHeightPc],
    rendererDiskRadiusPc: GALACTIC_FRAME.diskRadiusPc,
  },
  policy: {
    measured:
      'Values are transformed from the cited catalogues; no procedural points are written here.',
    uncertainty:
      'Source uncertainties and distance-method codes reach the renderer, raw or ' +
      'pre-digested into a confidence column; the published assets carry only the ' +
      'columns the renderer reads, and the cited catalogues and query reproduce ' +
      'every source column.',
    inferred:
      'Unobserved space must be filled by a separately identified statistical model, never presented as measured.',
  },
  assets,
  dictionaries: {
    largeCloudArmAssociation: { 0: 'unknown', ...Object.fromEntries(largeCloudArmDictionary.map((v, i) => [i + 1, v])) },
    maserArm: { 0: 'unknown', ...Object.fromEntries(maserArmDictionary.map((v, i) => [i + 1, v])) },
    hiiClass: { 0: 'unknown', ...Object.fromEntries(hiiClassDictionary.map((v, i) => [i + 1, v])) },
    hiiDistanceMethod: { 0: 'unknown', ...Object.fromEntries(hiiMethodDictionary.map((v, i) => [i + 1, v])) },
  },
  diagnostics: {
    dustNegativeSamplesClampedToZero: negativeDustSamples,
    dustDistancePc: range(dustDistancesPc),
    molecularCloudsOutsideRendererBounds,
    molecularCloudDistancePc: range(molecularCloudRecords.map((record) => record[7])),
    hiiRowsWithoutAdoptedDistance: catalogs.hiiRegions.length - hiiRecords.length,
    gaiaYoungClusterAgeCut: 'log10(age/yr) < 8',
    gaiaYoungCepheidAgeCut: 'log10(age/yr) < log10(200000000)',
    gaiaObProxySelection:
      'Drimmel hot-star cuts plus Bailer-Jones photogeometric distance, |Z| < 300 pc, RUWE < 1.4, parallax_over_error > 5, visibility_periods_used >= 10; uniform random_index subset, not the paper sample',
    gaiaObProxyDistancePc: range(gaiaObDistancesPc),
  },
  sources: [
    {
      id: 'RezaeiKh2024',
      role: '3D dust-density backbone and 84 large molecular clouds',
      catalogue: 'J/A+A/692/A255',
      paper: 'https://doi.org/10.1051/0004-6361/202449255',
      vizier: 'https://cdsarc.cds.unistra.fr/viz-bin/cat/J/A%2BA/692/A255',
    },
    {
      id: 'MivilleDeschenes2017',
      role: 'CO-derived catalogue of 8107 molecular clouds',
      catalogue: 'J/ApJ/834/57',
      paper: 'https://doi.org/10.3847/1538-4357/834/1/57',
      vizier: 'https://cdsarc.cds.unistra.fr/viz-bin/cat/J/ApJ/834/57',
    },
    {
      id: 'Reid2019',
      role: '199 high-mass star-forming regions with trigonometric parallaxes',
      catalogue: 'J/ApJ/885/131',
      paper: 'https://doi.org/10.3847/1538-4357/ab4a11',
      vizier: 'https://cdsarc.cds.unistra.fr/viz-bin/cat/J/ApJ/885/131',
    },
    {
      id: 'Anderson2014',
      role: 'WISE Galactic H II regions; only rows with adopted distances are exported',
      catalogue: 'J/ApJS/212/1',
      paper: 'https://doi.org/10.1088/0067-0049/212/1/1',
      vizier: 'https://cdsarc.cds.unistra.fr/viz-bin/cat/J/ApJS/212/1',
    },
    {
      id: 'GaiaDrimmel2023',
      role: 'Young open clusters and Classical Cepheids used to map spiral structure',
      catalogue: 'J/A+A/674/A37',
      paper: 'https://doi.org/10.1051/0004-6361/202243797',
      vizier: 'https://cdsarc.cds.unistra.fr/viz-bin/cat/J/A%2BA/674/A37',
    },
    {
      id: 'GaiaDr3ObProxy2026',
      role:
        'Reproducible proxy sample of hot stars; not the 579577-object Drimmel paper sample',
      catalogue:
        'gaiadr3.gaia_source + gaiadr3.astrophysical_parameters + external.gaiaedr3_distance',
      query: 'scripts/data/queries/gaia-dr3-ob-hot-stars.sql',
      archive: 'https://gea.esac.esa.int/archive/',
      paper: 'https://doi.org/10.1051/0004-6361/202243797',
      distancePaper: 'https://doi.org/10.3847/1538-3881/abd806',
    },
  ],
};

await writeFile(
  path.join(outputDirectory, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`
);
console.log(`Ativos escritos em ${path.relative(rootDirectory, outputDirectory)}.`);
