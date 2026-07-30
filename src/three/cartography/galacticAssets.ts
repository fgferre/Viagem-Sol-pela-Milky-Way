// ============================================================
// Loader dos ativos cartográficos observacionais.
//
// Lê public/data/galaxy/manifest.json e os binários Float32 LE
// descritos nele. Tudo aqui é `observed`/`derived` — nenhuma
// posição procedural nasce neste módulo. As coordenadas ficam na
// base galactocêntrica do projeto (+X centro→Sol, +Y → l=270°,
// +Z polo norte); a conversão para a cena acontece UMA vez, no
// consumidor, via galactocentricToScene() de world/galaxy.ts.
//
// A falha é graciosa: sem manifesto ou com binário corrompido a
// cena continua 100% procedural (camada `inferred`), como antes.
// ============================================================

interface ManifestAsset {
  file: string;
  count: number;
  strideFloat32: number;
  byteLength: number;
}

interface GalaxyManifest {
  schemaVersion: number;
  assets: Record<string, ManifestAsset>;
}

/** Um catálogo bruto: `count` registros de `stride` floats. */
export interface CatalogueTable {
  data: Float32Array;
  count: number;
  stride: number;
}

export interface GalacticAssets {
  /** APOGEE — amostras 3D de densidade de poeira (stride 7). */
  dustDensity: CatalogueTable;
  /** 84 grandes complexos moleculares (stride 9). */
  largeMolecularClouds: CatalogueTable;
  /** 8.107 nuvens CO (stride 11) — usar rendererRecommended. */
  molecularClouds: CatalogueTable;
  /** 199 masers BeSSeL com paralaxe trigonométrica (stride 9). */
  spiralAnchors: CatalogueTable;
  /** 1.413 regiões H II WISE com distância adotada (stride 9). */
  hiiRegions: CatalogueTable;
  /** 988 aglomerados jovens Gaia DR3 (stride 10). */
  gaiaYoungClusters: CatalogueTable;
  /** 2.806 Cefeidas jovens Gaia DR3 (stride 10). */
  gaiaYoungCepheids: CatalogueTable;
}

const REQUIRED: Array<keyof GalacticAssets> = [
  'dustDensity',
  'largeMolecularClouds',
  'molecularClouds',
  'spiralAnchors',
  'hiiRegions',
  'gaiaYoungClusters',
  'gaiaYoungCepheids',
];

async function fetchTable(
  base: string,
  asset: ManifestAsset,
  signal?: AbortSignal
): Promise<CatalogueTable> {
  const response = await fetch(`${base}${asset.file}`, { signal });
  if (!response.ok) {
    throw new Error(`${asset.file}: HTTP ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  const expected = asset.count * asset.strideFloat32 * 4;
  if (buffer.byteLength !== expected) {
    throw new Error(
      `${asset.file}: ${buffer.byteLength} bytes; manifesto exige ${expected}.`
    );
  }
  return {
    data: new Float32Array(buffer),
    count: asset.count,
    stride: asset.strideFloat32,
  };
}

/**
 * Carrega todos os catálogos em paralelo. Retorna null se qualquer
 * parte faltar — o chamador decide seguir só com o procedural.
 */
export async function loadGalacticAssets(
  signal?: AbortSignal
): Promise<GalacticAssets | null> {
  const base = import.meta.env.BASE_URL;
  try {
    const manifestResponse = await fetch(`${base}data/galaxy/manifest.json`, { signal });
    if (!manifestResponse.ok) {
      throw new Error(`manifest.json: HTTP ${manifestResponse.status}`);
    }
    const manifest = (await manifestResponse.json()) as GalaxyManifest;
    const tables = await Promise.all(
      REQUIRED.map((name) => {
        const asset = manifest.assets[name];
        if (!asset) throw new Error(`manifesto sem o ativo "${name}".`);
        return fetchTable(base, asset, signal);
      })
    );
    const result = {} as Record<keyof GalacticAssets, CatalogueTable>;
    REQUIRED.forEach((name, index) => {
      result[name] = tables[index];
    });
    return result as GalacticAssets;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    console.warn('[cartografia] ativos observacionais indisponíveis — cena procedural.', error);
    return null;
  }
}
