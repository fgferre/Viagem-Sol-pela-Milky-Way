// ============================================================
// Bake do mapa galactocêntrico 2D (RGBA):
//   R = contraste log-local da poeira APOGEE (0,5 = neutro)
//   G = cobertura observacional (0 = sem dados → procedural)
//   B = fator de braços procedural (galMajorArms+galLocalArm)
//   A = warp do disco normalizado (±820 pc)
//
// B/A trocam ~40 transcendentais POR AMOSTRA do raymarch por um
// único fetch — mesma função determinística, 65 pc/texel resolve
// a largura dos braços com folga. São canais `inferred`; R/G são
// `derived` do APOGEE. O colapso vertical usa peso exp(-|z|/220)
// e o perfil vertical volta analiticamente no shader.
//
// O bake é CPU PURA e devolve o RGBA cru: quem o veste de textura é
// quem tem GPU (`texturaDoMapa`, director/carregamento.ts). É o que
// deixa este arquivo rodar dentro do worker da carga.
// ============================================================
import type { CatalogueTable } from './galacticAssets';
import { glMajorArms, glLocalArm, warpHeightPc } from './galacticModel';
import { MEDIDAS_DA_GALAXIA } from './medidasDaGalaxia';

export const DUST_MAP_SIZE = 512;
/** meia-aresta do domínio (pc) — É o raio do disco, não um número parecido. */
export const DUST_MAP_HALF_EXTENT = MEDIDAS_DA_GALAXIA.diskRadiusPc;
/** escala vertical do colapso (pc). */
const VERTICAL_SCALE = 220;
/** ganho do contraste log-local (lanes = excesso sobre o entorno). */
const CONTRAST_GAIN = 0.55;

interface DustBake {
  /** RGBA 512² pronto para virar DataTexture na thread que tem GPU. */
  pixels: Uint8Array;
  /** contraste log-local de poeira (0..1, 0,5 = neutro). */
  density: Float32Array;
  /** fração de texels do disco com cobertura > 0 (diagnóstico). */
  coverageFraction: number;
  /** canal de cobertura cru (0..1, size²) — consumido pelo gerador
   *  procedural para CEDER onde o observado cobre. */
  coverage: Float32Array;
  /** crista de braços de GÁS (0..1, size²) na MESMA grade. O structure
   *  map recalculava este campo idêntico — ~90 transcendentais por
   *  texel, 262 k texels, duas vezes, no bloqueio de carga. Float64
   *  porque lá o valor entra em conta como double: Float32 arredondaria
   *  e a mudança deixaria de ser bit-idêntica. */
  arms: Float64Array;
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
function bakeDustChannels(
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
    // stride 5: xPc, yPc, zPc, particleDensityCm3, densityConfidence.
    // A confiança JÁ É a incerteza: o build a calcula como
    // `d / (d + s_Density)`, e por isso a coluna crua de sigma não viaja.
    const confidence = data[o + 4];
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

  // Peso de referência data-driven: média dos texels não vazios do
  // campo LOCAL — a cobertura deve declarar observação apenas onde HÁ
  // amostras locais; derivá-la do campo regional (blur de 2,6 kpc)
  // marcava ~10% da área como "coberta" sem nenhuma amostra.
  let sumW = 0;
  let nonZero = 0;
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] > 1e-6) {
      sumW += weights[i];
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
    const c = w / referenceWeight;
    coverage[i] = c >= 1 ? 1 : c * c * (3 - 2 * c);
  }
  return { density, coverage };
}

/**
 * Gera o mapa completo. `table` null (APOGEE ausente/cart=off) produz
 * R/G zerados — os canais procedurais B/A existem sempre, pois o
 * envelope de gás do raymarch depende deles.
 */
export function bakeDustMap(table: CatalogueTable | null): DustBake {
  const size = DUST_MAP_SIZE;
  const { density, coverage } = table
    ? bakeDustChannels(table)
    : {
        density: new Float32Array(size * size),
        coverage: new Float32Array(size * size),
      };

  const pixels = new Uint8Array(size * size * 4);
  const armsField = new Float64Array(size * size);
  let covered = 0;
  let discTexels = 0;
  const half = size / 2;
  const texelPc = (2 * DUST_MAP_HALF_EXTENT) / size;
  for (let i = 0; i < size * size; i++) {
    const dx = (i % size) + 0.5 - half;
    const dy = Math.floor(i / size) + 0.5 - half;
    const xPc = dx * texelPc;
    const yPc = dy * texelPc;
    const radiusPc = Math.hypot(xPc, yPc);
    const theta = Math.atan2(yPc, xPc);
    // envelope de GÁS do raymarch: 4 braços parecidos (uniformWeights)
    const arms = Math.min(
      glMajorArms(theta, radiusPc, 24, true) + glLocalArm(theta, radiusPc, 28),
      1
    );
    armsField[i] = arms;
    const warp = warpHeightPc(radiusPc, theta) / 820; // -1..1

    pixels[i * 4] = Math.min(255, Math.round(density[i] * 255));
    pixels[i * 4 + 1] = Math.min(255, Math.round(coverage[i] * 255));
    pixels[i * 4 + 2] = Math.min(255, Math.round(arms * 255));
    pixels[i * 4 + 3] = Math.min(255, Math.round((warp * 0.5 + 0.5) * 255));

    // a fração reportada é sobre o DISCO inscrito, não o quadrado
    if (dx * dx + dy * dy <= half * half) {
      discTexels++;
      if (coverage[i] > 0.02) covered++;
    }
  }

  return {
    pixels,
    density,
    coverageFraction: discTexels > 0 ? covered / discTexels : 0,
    coverage,
    arms: armsField,
  };
}
