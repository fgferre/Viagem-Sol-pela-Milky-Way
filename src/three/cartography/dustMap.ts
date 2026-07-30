// ============================================================
// Bake do mapa APOGEE (Rezaei Kh. et al. 2024) em uma textura
// galactocêntrica 2D: R = densidade de poeira tonemapeada,
// G = cobertura observacional (0 = sem dados → procedural).
//
// A poeira galáctica é fina (~100–150 pc de escala vertical);
// vista das distâncias de câmera deste app, a estrutura XY é o
// que se lê. O colapso vertical usa peso exp(-|z|/220) e o perfil
// vertical volta analiticamente no shader. Os 196k pontos são
// amostras esparsas: o blur separável fecha os vãos de amostragem
// sem inventar estrutura além da resolução real do mapa.
// ============================================================
import * as THREE from 'three';
import type { CatalogueTable } from './galacticAssets';

export const DUST_MAP_SIZE = 512;
/** meia-aresta do domínio (pc) — igual a rendererDiskRadiusPc. */
export const DUST_MAP_HALF_EXTENT = 16_800;
/** escala vertical do colapso (pc). */
const VERTICAL_SCALE = 220;
/** ganho do contraste log-local (lanes = excesso sobre o entorno). */
const CONTRAST_GAIN = 0.55;

interface DustBake {
  texture: THREE.DataTexture;
  /** fração de texels do disco com cobertura > 0 (diagnóstico). */
  coverageFraction: number;
}

function boxBlurInPlace(field: Float32Array, size: number, radius: number) {
  const tmp = new Float32Array(field.length);
  // horizontal
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      let n = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = x + k;
        if (xx < 0 || xx >= size) continue;
        sum += field[y * size + xx];
        n++;
      }
      tmp[y * size + x] = sum / n;
    }
  }
  // vertical
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      let n = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = y + k;
        if (yy < 0 || yy >= size) continue;
        sum += tmp[yy * size + x];
        n++;
      }
      field[y * size + x] = sum / n;
    }
  }
}

/**
 * Núcleo puro do bake (testável sem WebGL): retorna os canais
 * densidade (0..1) e cobertura (0..1) num grid size×size.
 */
export function bakeDustChannels(
  table: CatalogueTable,
  size = DUST_MAP_SIZE,
  halfExtent = DUST_MAP_HALF_EXTENT
): { density: Float32Array; coverage: Float32Array } {
  const { data, count, stride } = table;
  const weighted = new Float32Array(size * size); // Σ w·d
  const weights = new Float32Array(size * size); // Σ w
  const scale = size / (2 * halfExtent);

  for (let i = 0; i < count; i++) {
    const o = i * stride;
    const x = data[o];
    const y = data[o + 1];
    const z = data[o + 2];
    const density = data[o + 3];
    const confidence = data[o + 6];
    const ix = Math.floor((x + halfExtent) * scale);
    const iy = Math.floor((y + halfExtent) * scale);
    if (ix < 0 || ix >= size || iy < 0 || iy >= size) continue;
    const w = Math.max(confidence, 0.02) * Math.exp(-Math.abs(z) / VERTICAL_SCALE);
    const idx = iy * size + ix;
    weighted[idx] += w * density;
    weights[idx] += w;
  }

  // Blur dos ACUMULADORES (não da razão) = interpolação ponderada
  // correta entre amostras vizinhas. Duas passadas ≈ kernel
  // triangular de ~9 texels (~590 pc) — compatível com a resolução
  // efetiva do mapa APOGEE, e mata o speckle de amostragem esparsa.
  boxBlurInPlace(weighted, size, 2);
  boxBlurInPlace(weights, size, 2);
  boxBlurInPlace(weighted, size, 2);
  boxBlurInPlace(weights, size, 2);

  // Média REGIONAL (mesmos acumuladores, kernel largo ~2,6 kpc).
  // O canal R guarda o CONTRASTE log-local: densidade acima do
  // entorno regional. Isso auto-calibra a escala absoluta (as
  // densidades APOGEE variam ordens de magnitude), e os gradientes
  // de larga escala — inclusive a borda do box do survey — se
  // cancelam em vez de virar uma mancha retangular no disco.
  const regionalWeighted = weighted.slice();
  const regionalWeights = weights.slice();
  boxBlurInPlace(regionalWeighted, size, 10);
  boxBlurInPlace(regionalWeights, size, 10);
  boxBlurInPlace(regionalWeighted, size, 10);
  boxBlurInPlace(regionalWeights, size, 10);

  // Peso de referência data-driven: média dos texels não vazios
  // (no campo regional, para uma borda de cobertura suave).
  let sumW = 0;
  let nonZero = 0;
  for (let i = 0; i < regionalWeights.length; i++) {
    if (regionalWeights[i] > 1e-6) {
      sumW += regionalWeights[i];
      nonZero++;
    }
  }
  const referenceWeight = nonZero > 0 ? (sumW / nonZero) * 0.5 : 1;

  const density = new Float32Array(size * size);
  const coverage = new Float32Array(size * size);
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i];
    const wr = regionalWeights[i];
    if (w <= 1e-6 || wr <= 1e-6) continue;
    const local = weighted[i] / w;
    const regional = regionalWeighted[i] / wr;
    const contrast = Math.log1p(local) - Math.log1p(regional);
    density[i] = Math.min(1, Math.max(0, 0.5 + contrast * CONTRAST_GAIN));
    const c = wr / referenceWeight;
    coverage[i] = c >= 1 ? 1 : c * c * (3 - 2 * c);
  }
  return { density, coverage };
}

export function bakeDustMap(table: CatalogueTable): DustBake {
  const size = DUST_MAP_SIZE;
  const { density, coverage } = bakeDustChannels(table);

  const pixels = new Uint8Array(size * size * 2);
  let covered = 0;
  let discTexels = 0;
  const half = size / 2;
  for (let i = 0; i < size * size; i++) {
    pixels[i * 2] = Math.min(255, Math.round(density[i] * 255));
    pixels[i * 2 + 1] = Math.min(255, Math.round(coverage[i] * 255));
    // a fração reportada é sobre o DISCO inscrito, não o quadrado
    const dx = (i % size) + 0.5 - half;
    const dy = Math.floor(i / size) + 0.5 - half;
    if (dx * dx + dy * dy <= half * half) {
      discTexels++;
      if (coverage[i] > 0.02) covered++;
    }
  }

  const texture = new THREE.DataTexture(
    pixels,
    size,
    size,
    THREE.RGFormat,
    THREE.UnsignedByteType
  );
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return { texture, coverageFraction: discTexels > 0 ? covered / discTexels : 0 };
}
