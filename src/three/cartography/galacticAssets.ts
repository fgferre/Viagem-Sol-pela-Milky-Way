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
import { fetchBinary } from '../config';

/**
 * O que o runtime LÊ do manifesto — e a ausência do `sha256` aqui é
 * deliberada: divergência de contrato ACEITA, escrita para não voltar
 * como achado.
 *
 * O campo existe em cada ativo do `manifest.json` e quem o cobra é o
 * `scripts/data/verify-assets.mjs`, OFFLINE: ele confere o sha de cada
 * `.bin`, e desde a auditoria de 2026-08-12 também o `.bin.gz` que o
 * visitante realmente baixa (gunzip + sha contra o cru). Aqui o runtime
 * fica com `count × stride × 4`, que é a checagem barata que pega
 * truncamento e `.gz` de outro tamanho.
 *
 * O que a divergência custa, dito por inteiro: corrupção do MESMO
 * tamanho passa. O que a paga: hospedagem estática (nenhum
 * intermediário reescreve bytes) e uma soma dos ~7 MB destes oito
 * binários em WASM/JS a cada boot, que sairia do orçamento do primeiro
 * quadro para defender um caso que a hospedagem já defende. (Eram 10 MB
 * até a poda das colunas mortas de 2026-08-21.) Se um dia os ativos
 * vierem de fonte não confiável, esta é a linha que muda.
 *
 * O `fields` também fica de fora, e quem o cobra é o mesmo verificador
 * offline: os leitores indexam por NÚMERO (`data[o + 4]`), então é lá que
 * se prova que cada índice cravado ainda aponta para o campo certo.
 */
interface ManifestAsset {
  /** ausente nos catálogos Float32 — só os volumes (E1) declaram 'volume'. */
  kind?: 'table';
  file: string;
  count: number;
  strideFloat32: number;
  byteLength: number;
}

/**
 * Um descritor de VOLUME do manifesto (E1: `dust-near-20pc.bin` e o que
 * vier depois) — `loadGalacticAssets` só lê este formato, nunca baixa os
 * bytes; quem baixa é `carregarVolumeDePoeira`, chamado pelo director só
 * quando a cartografia está ligada.
 */
export interface ManifestVolume {
  kind: 'volume';
  file: string;
  dims: [number, number, number];
  voxelPc: number;
  originPc: [number, number, number];
  scale: number;
  type: string;
  byteLength: number;
  sha256: string;
  innerRadiusPc: number;
  outerRadiusPc: number;
}

interface GalaxyManifest {
  schemaVersion: number;
  assets: Record<string, ManifestAsset | ManifestVolume>;
}

/** Um catálogo bruto: `count` registros de `stride` floats. */
export interface CatalogueTable {
  data: Float32Array;
  count: number;
  stride: number;
}

export interface GalacticAssets {
  /** APOGEE — amostras 3D de densidade de poeira (stride 5). */
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
  /** Amostra proxy de estrelas quentes Gaia DR3 (stride 7). */
  gaiaObProxyStars: CatalogueTable;
}

const REQUIRED: Array<keyof GalacticAssets> = [
  'dustDensity',
  'largeMolecularClouds',
  'molecularClouds',
  'spiralAnchors',
  'hiiRegions',
  'gaiaYoungClusters',
  'gaiaYoungCepheids',
  'gaiaObProxyStars',
];

async function fetchTable(
  base: string,
  asset: ManifestAsset,
  signal?: AbortSignal
): Promise<CatalogueTable> {
  // pelo .gz com fallback para o cru (fetchBinary); a checagem de tamanho
  // logo abaixo é quem valida a descompressão — byte a mais ou a menos barra
  const buffer = await fetchBinary(`${base}${asset.file}`, signal);
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
 * OS MAPAS CHEGARAM? — o desfecho da última carga, guardado porque
 * alguém precisa DIZER isso na tela.
 *
 * A falha graciosa do cabeçalho tinha um preço que ninguém pagava: o
 * `catch` abaixo escreve um `console.warn`, a cena cai inteira para
 * procedural e o SELO DE HONESTIDADE continuava imprimindo "medido:
 * catálogo e efeméride" sobre uma galáxia inventada — provado em
 * 2026-08-21 bloqueando o manifesto e os `.bin`. Um selo que não sabe
 * quando a medida sumiu é decoração.
 *
 * POR QUE AQUI, e não num campo do `EstadoDaVista` do Director: esta
 * função é a ÚNICA que sabe se a rede entregou. O `catalogos` do
 * Director é derivada dela (`Boolean(galactic) && cartMode !== 'off'`)
 * — e `false` como valor inicial cobre o terceiro caminho de graça:
 * com `?cart=off` a carga nem é chamada, e a cartografia é procedural
 * do mesmo jeito.
 */
let mapasChegaram = false;

/** A cartografia desta sessão é MEDIDA (os mapas chegaram) ou procedural? */
export function cartografiaMedida(): boolean {
  return mapasChegaram;
}

/**
 * Carrega todos os catálogos em paralelo. Retorna null se qualquer
 * parte faltar — o chamador decide seguir só com o procedural.
 *
 * `volumes` (E2) são só os DESCRITORES do manifesto (`kind === 'volume'`)
 * — nunca os bytes: quem baixa um volume é `carregarVolumeDePoeira`,
 * chamada pelo director depois que este resultado chega. Um manifesto
 * sem nenhum volume (ou um schema mais velho) devolve `volumes: {}`, sem
 * afetar `mapasChegaram` nem o restante da carga — a poeira medida é
 * estritamente opcional em cima da cartografia já opcional.
 */
export async function loadGalacticAssets(
  signal?: AbortSignal
): Promise<(GalacticAssets & { volumes: Record<string, ManifestVolume> }) | null> {
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
        // REQUIRED só lista catálogos — nunca um nome de volume (kind
        // 'volume'); o cast cobre a união sem alargar a assinatura de
        // fetchTable para um caso que ele nunca recebe.
        return fetchTable(base, asset as ManifestAsset, signal);
      })
    );
    const result = {} as Record<keyof GalacticAssets, CatalogueTable>;
    REQUIRED.forEach((name, index) => {
      result[name] = tables[index];
    });
    const volumes: Record<string, ManifestVolume> = {};
    for (const [name, asset] of Object.entries(manifest.assets)) {
      if (asset.kind === 'volume') volumes[name] = asset;
    }
    mapasChegaram = true;
    return { ...result, volumes } as GalacticAssets & { volumes: Record<string, ManifestVolume> };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    mapasChegaram = false;
    console.warn('[cartografia] ativos observacionais indisponíveis — cena procedural.', error);
    return null;
  }
}

/** Um volume de poeira medida já em memória: bits crus de float16
 *  little-endian (`dados[i]` é o half-float, não o valor decodificado —
 *  ver `poeiraMedida`/`poeiraDensidadeApp` em shaders/common.ts), do
 *  tamanho exato que `descritor.dims` exige. */
export interface VolumeDePoeira {
  descritor: ManifestVolume;
  dados: Uint16Array;
}

/**
 * Baixa e valida UM volume de poeira medida (E2: `dust-near-20pc.bin`,
 * descrito em `loadGalacticAssets(...).volumes`). Falha graciosa como
 * todo o resto deste módulo, mas SEM tocar em `mapasChegaram` — a
 * poeira medida é um extra opcional sobre uma cartografia que já é
 * opcional por si só, e um bloco ausente/corrompido nunca deve apagar
 * o selo "medido" dos catálogos que chegaram direito. Nunca lança
 * (nem AbortError): qualquer falha vira `console.warn` + `null`, e o
 * chamador (director.ts) trata `null` como "poeira desligada".
 */
export async function carregarVolumeDePoeira(
  base: string,
  descritor: ManifestVolume,
  signal?: AbortSignal
): Promise<VolumeDePoeira | null> {
  try {
    if (descritor.type !== 'float16') {
      throw new Error(`${descritor.file}: tipo "${descritor.type}" não é float16.`);
    }
    const [nx, ny, nz] = descritor.dims;
    const esperado = nx * ny * nz * 2;
    if (descritor.byteLength !== esperado) {
      throw new Error(
        `${descritor.file}: manifesto declara ${descritor.byteLength} bytes; dims exigem ${esperado}.`
      );
    }
    const buffer = await fetchBinary(`${base}${descritor.file}`, signal);
    if (buffer.byteLength !== esperado) {
      throw new Error(`${descritor.file}: ${buffer.byteLength} bytes; esperado ${esperado}.`);
    }
    return { descritor, dados: new Uint16Array(buffer) };
  } catch (error) {
    console.warn('[poeira] volume indisponível — poeira medida desligada.', error);
    return null;
  }
}
