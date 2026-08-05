// ============================================================
// Campo acoplado de resposta do disco (RGBA, 512²):
//   R = resposta de gás/poeira (observada/derivada + lacunas inferidas)
//   G = resposta de formação estelar jovem (idem)
//   B = suporte espacial do gás/poeira
//   A = suporte espacial dos traçadores jovens
//
// Este mapa NÃO é uma simulação N-body/hidrodinâmica. Ele combina
// material observado com kernels proporcionais à resolução física e
// às incertezas. Nas lacunas, o esqueleto espiral ajustado aos masers
// funciona como proxy dos vales do potencial não axisimétrico; ruído
// determinístico atua apenas na escala de complexos não resolvidos.
// ============================================================
import * as THREE from 'three';
import type { GalacticAssets, CatalogueTable } from './galacticAssets';
import {
  DUST_MAP_HALF_EXTENT,
  DUST_MAP_SIZE,
} from './dustMap';
import { glMajorArms, glLocalArm } from './galacticModel';

export interface StructureBake {
  texture: THREE.DataTexture;
  gasResponse: Float32Array;
  youngResponse: Float32Array;
  gasSupport: Float32Array;
  youngSupport: Float32Array;
  gasCoverageFraction: number;
  youngCoverageFraction: number;
}

interface SplatTarget {
  field: Float32Array;
  support: Float32Array;
}

function splatGaussian(
  target: SplatTarget,
  xPc: number,
  yPc: number,
  sigmaPc: number,
  amplitude: number,
  confidence: number
) {
  const size = DUST_MAP_SIZE;
  const scale = size / (2 * DUST_MAP_HALF_EXTENT);
  const cx = (xPc + DUST_MAP_HALF_EXTENT) * scale;
  const cy = (yPc + DUST_MAP_HALF_EXTENT) * scale;
  const sigmaPx = Math.max(0.8, sigmaPc * scale);
  const reach = Math.ceil(sigmaPx * 2.8);
  const minX = Math.max(0, Math.floor(cx) - reach);
  const maxX = Math.min(size - 1, Math.floor(cx) + reach);
  const minY = Math.max(0, Math.floor(cy) - reach);
  const maxY = Math.min(size - 1, Math.floor(cy) + reach);
  const denominator = 2 * sigmaPx * sigmaPx;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const kernel = Math.exp(-(dx * dx + dy * dy) / denominator);
      const index = y * size + x;
      target.field[index] += amplitude * confidence * kernel;
      target.support[index] = Math.max(
        target.support[index],
        confidence * kernel
      );
    }
  }
}

function robustNormalize(field: Float32Array, fraction = 0.985) {
  // Float32Array.sort() é numérico e sem boxing. Array.from(field) criava
  // 262.144 doubles boxados e um segundo array no filter, para depois
  // ordenar pelo caminho de comparador do V8 — mesma resposta, ~5× o
  // tempo, duas vezes por bake, no meio do congelamento de carga.
  const positive = field.filter((value) => value > 0).sort();
  if (positive.length === 0) return;
  const scale =
    positive[Math.floor((positive.length - 1) * fraction)] || 1;
  for (let index = 0; index < field.length; index++) {
    field[index] = Math.sqrt(Math.min(1, field[index] / scale));
  }
}

function hashGrid(x: number, y: number) {
  let value =
    Math.imul(x | 0, 0x1f123bb5) ^ Math.imul(y | 0, 0x5f356495);
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  value ^= value >>> 12;
  return (value >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hashGrid(ix, iy);
  const b = hashGrid(ix + 1, iy);
  const c = hashGrid(ix, iy + 1);
  const d = hashGrid(ix + 1, iy + 1);
  const top = a + (b - a) * sx;
  const bottom = c + (d - c) * sx;
  return top + (bottom - top) * sy;
}

function fbm2(x: number, y: number) {
  let sum = 0;
  let amplitude = 0.5;
  for (let octave = 0; octave < 5; octave++) {
    sum += amplitude * valueNoise(x, y);
    x = x * 2.03 + 9.7;
    y = y * 2.03 + 17.3;
    amplitude *= 0.5;
  }
  return sum;
}

/**
 * Ruído RIDGED: `1 − |2n − 1|` elevado ao quadrado. O fbm comum tem
 * máximos arredondados e produz borrão; o ridged tem cristas finas, que é
 * o que lê como filamento. Somar gaussianas nunca gera filamento —
 * gaussiana é lisa por construção.
 */
function ridged(x: number, y: number) {
  let sum = 0;
  let amplitude = 0.5;
  let weight = 1;
  for (let octave = 0; octave < 5; octave++) {
    const n = 1 - Math.abs(2 * valueNoise(x, y) - 1);
    const shaped = n * n * weight;
    weight = Math.min(1, shaped * 1.6);
    sum += amplitude * shaped;
    x = x * 2.11 + 5.3;
    y = y * 2.11 + 13.7;
    amplitude *= 0.52;
  }
  return Math.min(1, sum * 1.35);
}

/**
 * Rede filamentar no REFERENCIAL ESPIRAL. Com u = ln R e v = θ − u/tan(p)
 * os braços viram retas horizontais; ruído de baixa frequência em u e alta
 * em v vira filamento ESTICADO ao longo do braço. O domain warping dobra e
 * ramifica as cristas, dando a rede curta e torta do alvo em vez de arcos
 * concêntricos.
 */
const SPIRAL_TAN_PITCH = Math.tan((12.5 * Math.PI) / 180);
function filamentField(radiusPc: number, theta: number) {
  const u = Math.log(Math.max(radiusPc, 300) / 8_150);
  const v = theta - u / SPIRAL_TAN_PITCH;
  // su > sv é o que importa: com a frequência ao longo do braço MENOR que
  // a transversal, cada crista se estende pela espiral inteira e o campo
  // vira riscos concêntricos (foi o primeiro resultado). Invertido, sai a
  // rede curta e ramificada. Calibrado olhando o campo direto, não o render.
  // sv=12 punha UMA crista na largura do braço, então a poeira saía como
  // uma linha fina por braço por mais que se alargasse o braço ou se
  // baixasse o limiar de aceitação. Com 26 cabem várias lado a lado: a
  // rede trançada do alvo.
  const su = u * 30.0;
  const sv = v * 26.0;
  const warpX = fbm2(su * 1.9 + 31.2, sv * 1.2 - 12.4) - 0.5;
  const warpY = fbm2(su * 1.9 - 7.9, sv * 1.2 + 22.1) - 0.5;
  return ridged(su + warpX * 1.4, sv + warpY * 1.4);
}

function depositMolecularClouds(
  target: SplatTarget,
  table: CatalogueTable
) {
  const { data, count, stride } = table;
  for (let index = 0; index < count; index++) {
    const offset = index * stride;
    if (data[offset + 10] < 0.5) continue;
    const radiusPc = THREE.MathUtils.clamp(data[offset + 3], 45, 420);
    const surfaceDensity = Math.max(0, data[offset + 5]);
    splatGaussian(
      target,
      data[offset],
      data[offset + 1],
      radiusPc * 1.35,
      Math.log1p(surfaceDensity),
      0.92
    );
  }
}

function depositLargeClouds(
  target: SplatTarget,
  table: CatalogueTable
) {
  const { data, count, stride } = table;
  for (let index = 0; index < count; index++) {
    const offset = index * stride;
    const density = Math.max(0, data[offset + 4]);
    const sigmaDensity = Math.max(0, data[offset + 5]);
    const sigmaDistance = Math.max(0, data[offset + 7]);
    const distance = Math.max(1, data[offset + 6]);
    const confidence =
      (density > 0 ? density / (density + sigmaDensity) : 0.25) /
      (1 + sigmaDistance / distance);
    splatGaussian(
      target,
      data[offset],
      data[offset + 1],
      THREE.MathUtils.clamp(data[offset + 3] * 1.2, 80, 650),
      Math.log1p(density),
      THREE.MathUtils.clamp(confidence, 0.12, 1)
    );
  }
}

function depositHii(target: SplatTarget, table: CatalogueTable) {
  const { data, count, stride } = table;
  for (let index = 0; index < count; index++) {
    const offset = index * stride;
    const relativeError = Math.max(0, data[offset + 6]);
    const classFactor = Math.abs(data[offset + 7] - 3) < 0.5 ? 1 : 0.65;
    const confidence = classFactor / (1 + relativeError * 2.2);
    splatGaussian(
      target,
      data[offset],
      data[offset + 1],
      THREE.MathUtils.clamp(data[offset + 3] * 2.2, 55, 230),
      1,
      confidence
    );
  }
}

function depositMasers(target: SplatTarget, table: CatalogueTable) {
  const { data, count, stride } = table;
  for (let index = 0; index < count; index++) {
    const offset = index * stride;
    const relativeError = Math.max(0, data[offset + 6]);
    if (relativeError >= 0.2) continue;
    splatGaussian(
      target,
      data[offset],
      data[offset + 1],
      125,
      1.3,
      1 / (1 + relativeError * 4)
    );
  }
}

function depositYoungClusters(
  target: SplatTarget,
  table: CatalogueTable
) {
  const { data, count, stride } = table;
  for (let index = 0; index < count; index++) {
    const offset = index * stride;
    const relativeError = Math.max(0, data[offset + 6]);
    const members = Math.max(0, data[offset + 8]);
    splatGaussian(
      target,
      data[offset],
      data[offset + 1],
      95,
      Math.log1p(members) * 0.32,
      1 / (1 + relativeError * 2)
    );
  }
}

function depositCepheids(target: SplatTarget, table: CatalogueTable) {
  const { data, count, stride } = table;
  for (let index = 0; index < count; index++) {
    const offset = index * stride;
    const distance = Math.max(1, data[offset + 3]);
    const relativeError = Math.max(0, data[offset + 4]) / distance;
    splatGaussian(
      target,
      data[offset],
      data[offset + 1],
      105,
      0.72,
      1 / (1 + relativeError * 3)
    );
  }
}

function depositGaiaObProxy(target: SplatTarget, table: CatalogueTable) {
  const { data, count, stride } = table;
  for (let index = 0; index < count; index++) {
    const offset = index * stride;
    const sigmaDistancePc = Math.max(0, data[offset + 4]);
    const magnitude = data[offset + 5];
    const confidence = THREE.MathUtils.clamp(data[offset + 8], 0.05, 1);
    const brightnessWeight = THREE.MathUtils.clamp(
      (17 - magnitude) / 8,
      0.22,
      1
    );
    splatGaussian(
      target,
      data[offset],
      data[offset + 1],
      THREE.MathUtils.clamp(48 + sigmaDistancePc * 0.18, 48, 190),
      brightnessWeight,
      confidence
    );
  }
}

function discCoverageFraction(support: Float32Array) {
  const half = DUST_MAP_SIZE / 2;
  let covered = 0;
  let total = 0;
  for (let y = 0; y < DUST_MAP_SIZE; y++) {
    for (let x = 0; x < DUST_MAP_SIZE; x++) {
      const dx = x + 0.5 - half;
      const dy = y + 0.5 - half;
      if (dx * dx + dy * dy > half * half) continue;
      total++;
      if (support[y * DUST_MAP_SIZE + x] > 0.05) covered++;
    }
  }
  return total > 0 ? covered / total : 0;
}

export function bakeGalacticStructureMap(
  assets: GalacticAssets | null,
  dustDensity: Float32Array,
  dustCoverage: Float32Array,
  /** crista de braços de gás já calculada pelo bake da poeira, na mesma
   *  grade e com os mesmos parâmetros (24/28, uniformWeights) */
  dustArmsField: Float64Array
): StructureBake {
  const length = DUST_MAP_SIZE * DUST_MAP_SIZE;
  const gas = new Float32Array(length);
  const young = new Float32Array(length);
  const gasSupport = new Float32Array(length);
  const youngSupport = new Float32Array(length);

  if (assets) {
    for (let index = 0; index < length; index++) {
      const coverage = dustCoverage[index];
      gas[index] = Math.max(0, (dustDensity[index] - 0.5) * 2) * coverage;
      gasSupport[index] = coverage;
    }
    const gasTarget = { field: gas, support: gasSupport };
    depositMolecularClouds(gasTarget, assets.molecularClouds);
    depositLargeClouds(gasTarget, assets.largeMolecularClouds);

    const youngTarget = { field: young, support: youngSupport };
    depositHii(youngTarget, assets.hiiRegions);
    depositMasers(youngTarget, assets.spiralAnchors);
    depositYoungClusters(youngTarget, assets.gaiaYoungClusters);
    depositCepheids(youngTarget, assets.gaiaYoungCepheids);
    depositGaiaObProxy(youngTarget, assets.gaiaObProxyStars);
  }

  robustNormalize(gas);
  robustNormalize(young);

  // Acoplamento observado ↔ inferido. O prior distante não inventa uma
  // distribuição de matéria independente: segue o esqueleto BeSSeL e usa
  // turbulência apenas na escala de complexos moleculares não resolvidos.
  const half = DUST_MAP_SIZE / 2;
  const texelPc = (2 * DUST_MAP_HALF_EXTENT) / DUST_MAP_SIZE;
  // Primeira passada calcula o campo inferido e acumula as médias; a
  // mistura só acontece na segunda, quando a escala já é conhecida.
  const inferredGasField = new Float32Array(length);
  const inferredYoungField = new Float32Array(length);
  let observedGasSum = 0;
  let observedGasCount = 0;
  let observedYoungSum = 0;
  let observedYoungCount = 0;
  let inferredGasSum = 0;
  let inferredYoungSum = 0;
  let discCount = 0;
  for (let index = 0; index < length; index++) {
    const xPc = ((index % DUST_MAP_SIZE) + 0.5 - half) * texelPc;
    const yPc =
      (Math.floor(index / DUST_MAP_SIZE) + 0.5 - half) * texelPc;
    const radiusPc = Math.hypot(xPc, yPc);
    if (radiusPc > DUST_MAP_HALF_EXTENT) {
      gas[index] = 0;
      young[index] = 0;
      continue;
    }
    const theta = Math.atan2(yPc, xPc);
    const px = xPc / DUST_MAP_HALF_EXTENT;
    const py = yPc / DUST_MAP_HALF_EXTENT;
    const complexNoise = fbm2(px * 24 + 13.7, py * 24 - 8.9);
    const cloudNoise = fbm2(px * 64 - 4.1, py * 64 + 19.3);
    const continuity = THREE.MathUtils.smoothstep(
      complexNoise * 0.68 + cloudNoise * 0.32,
      0.36,
      0.66
    );
    // uniformWeights: traçadores jovens seguem o GÁS, que é 4 braços
    // parecidos (Drimmel) — a dominância de 2 braços é só da emissão
    // estelar evoluída (renderWeight), que multiplica DEPOIS.
    // Vem pronto do bakeDustMap: mesma grade, mesmos parâmetros, mesma
    // expressão — recalcular aqui era ~215 ms de aritmética repetida.
    const arms = dustArmsField[index];
    // 55/59 é uma crista de 0,13 rad — três vezes mais estreita que o
    // braço estelar (24). A poeira ficava colada numa linha e lia como
    // arco fino; no alvo ela ocupa a largura do braço, com a rede
    // filamentar fazendo a subestrutura. O deslocamento de fase (borda
    // côncava) continua.
    // Deslocamento de UMA meia-largura do braço estelar (~0,29 rad), não
    // 0,065: com o campo quase em cima da crista, a poeira cobria o braço
    // em vez de esculpi-lo pela borda côncava, e adensar custava
    // contraste. Este offset e o centro da distribuição em galaxy.ts
    // precisam ficar do MESMO lado — estavam opostos.
    const dustArms = Math.min(
      1,
      glMajorArms(theta - 0.20, radiusPc, 26, true) +
        glLocalArm(theta - 0.19, radiusPc, 30)
    );
    // A fragmentação do gás agora vem da rede filamentar no referencial
    // espiral. `gasFragment` era smoothstep sobre fbm isotrópico: dava
    // manchas redondas, e a poeira amostrada nele saía como véu difuso
    // (ou, quando amostrada ao longo da espinha, como arco liso).
    const filament = filamentField(radiusPc, theta);
    // A formação estelar segue o gás: usar o MESMO campo aqui é o que dá
    // textura DENTRO do braço (complexos brilhantes alternando com vazios)
    // em vez de uma faixa lisa.
    const inferredYoung =
      arms * (0.1 + 0.9 * (continuity * 0.45 + filament * 0.55));
    const gasFragment = THREE.MathUtils.smoothstep(
      filament * 0.74 + cloudNoise * 0.26,
      0.30,
      0.64
    );
    const inferredGas = dustArms * gasFragment;
    // TETO na influência do observado. A cobertura APOGEE/CO é uma
    // pegada de survey heliocêntrica, não uma afirmação de que o outro
    // lado não tem poeira. Deixá-la dominar 100% onde cobre punha m=1 na
    // ABSORÇÃO — e como a intensidade é um produto (emissão × absorção),
    // m=4 × m=1 gera m=3 e m=5, que a medição mostrava em 0,157 e 0,109
    // contra 0,071 e 0,062 do alvo. O medido continua visível; só deixa
    // de ditar a simetria global.
    inferredGasField[index] = inferredGas;
    inferredYoungField[index] = inferredYoung;
    if (gasSupport[index] > 0.05) {
      observedGasSum += gas[index];
      observedGasCount++;
    }
    inferredGasSum += inferredGas;
    if (youngSupport[index] > 0.05) {
      observedYoungSum += young[index];
      observedYoungCount++;
    }
    inferredYoungSum += inferredYoung;
    discCount++;
  }

  // CASAR O NÍVEL MÉDIO antes de misturar.
  //
  // O survey diz ONDE a estrutura está, não que a nossa vizinhança tenha
  // mais poeira que o resto da galáxia. Mas os splats observados são
  // muito mais densos que o campo inferido (a normalização robusta usa o
  // percentil global, e os splats dominam esse percentil), então a região
  // coberta entrava sistematicamente mais escura — a mancha sob o bojo, e
  // um m=1 na absorção que intermodula com o m=4 e vaza para m=3.
  // Igualando as médias, sobra só a DIFERENÇA DE ESTRUTURA, que é a
  // informação real do catálogo.
  const gasLevel =
    observedGasCount > 0 && observedGasSum > 1e-6
      ? THREE.MathUtils.clamp(
          inferredGasSum / Math.max(discCount, 1) /
            (observedGasSum / observedGasCount),
          0.35,
          2.5
        )
      : 1;
  const youngLevel =
    observedYoungCount > 0 && observedYoungSum > 1e-6
      ? THREE.MathUtils.clamp(
          inferredYoungSum / Math.max(discCount, 1) /
            (observedYoungSum / observedYoungCount),
          0.35,
          2.5
        )
      : 1;

  for (let index = 0; index < length; index++) {
    if (inferredGasField[index] === 0 && gas[index] === 0) continue;
    // TETO na influência do observado. A cobertura APOGEE/CO é uma
    // pegada de survey heliocêntrica, não uma afirmação de que o outro
    // lado não tem poeira. Deixá-la dominar 100% onde cobre punha m=1 na
    // ABSORÇÃO — e como a intensidade é um produto (emissão × absorção),
    // m=4 × m=1 gera m=3 e m=5.
    // Testado 0,45 achando que a pegada do survey explicasse o m=1 que
    // subiu ao alinhar a poeira ao braço: não moveu (0,130→0,128). A
    // assimetria vem do alinhamento em si, não do catálogo, então fica
    // em 0,6, que respeita mais o medido.
    const gasMix = gasSupport[index] * 0.6;
    const youngMix = youngSupport[index] * 0.72;
    gas[index] =
      inferredGasField[index] * (1 - gasMix) +
      gas[index] * gasLevel * gasMix;
    young[index] =
      inferredYoungField[index] * (1 - youngMix) +
      young[index] * youngLevel * youngMix;
  }

  const pixels = new Uint8Array(length * 4);
  for (let index = 0; index < length; index++) {
    pixels[index * 4] = Math.round(Math.min(1, gas[index]) * 255);
    pixels[index * 4 + 1] = Math.round(Math.min(1, young[index]) * 255);
    pixels[index * 4 + 2] = Math.round(
      Math.min(1, gasSupport[index]) * 255
    );
    pixels[index * 4 + 3] = Math.round(
      Math.min(1, youngSupport[index]) * 255
    );
  }

  const texture = new THREE.DataTexture(
    pixels,
    DUST_MAP_SIZE,
    DUST_MAP_SIZE,
    THREE.RGBAFormat,
    THREE.UnsignedByteType
  );
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return {
    texture,
    gasResponse: gas,
    youngResponse: young,
    gasSupport,
    youngSupport,
    gasCoverageFraction: discCoverageFraction(gasSupport),
    youngCoverageFraction: discCoverageFraction(youngSupport),
  };
}
