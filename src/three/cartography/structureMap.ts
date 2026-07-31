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
  const positive = Array.from(field).filter((value) => value > 0);
  if (positive.length === 0) return;
  positive.sort((a, b) => a - b);
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
  dustCoverage: Float32Array
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
    const arms = Math.min(
      1,
      glMajorArms(theta, radiusPc, 24) +
        glLocalArm(theta, radiusPc, 28)
    );
    const dustArms = Math.min(
      1,
      glMajorArms(theta - 0.065, radiusPc, 55) +
        glLocalArm(theta - 0.045, radiusPc, 59)
    );
    const inferredYoung = arms * (0.1 + 0.9 * continuity);
    const gasFragment = THREE.MathUtils.smoothstep(
      complexNoise * 0.42 + cloudNoise * 0.58,
      0.43,
      0.73
    );
    const inferredGas = dustArms * gasFragment;
    gas[index] =
      inferredGas * (1 - gasSupport[index]) +
      gas[index] * gasSupport[index];
    young[index] =
      inferredYoung * (1 - youngSupport[index]) +
      young[index] * youngSupport[index];
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
