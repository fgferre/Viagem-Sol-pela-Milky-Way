import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from './lib/binary.mjs';
import { heliocentricGalacticToProject } from './lib/galactic.mjs';
import {
  decodeSpiralAnchors,
  evaluateSpiralModel,
} from './lib/spiral-fit.mjs';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const publicDirectory = path.join(rootDirectory, 'public');
const manifestPath = path.join(publicDirectory, 'data', 'galaxy', 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const spiralModel = JSON.parse(
  await readFile(
    path.join(
      rootDirectory,
      'src',
      'three',
      'cartography',
      'spiralModel.json'
    ),
    'utf8'
  )
);

const coordinateCases = [
  { input: [0, 0, 100], expected: [8_050, 0, 5.5] },
  { input: [90, 0, 100], expected: [8_150, -100, 5.5] },
  { input: [270, 0, 100], expected: [8_150, 100, 5.5] },
  { input: [0, 90, 100], expected: [8_150, 0, 105.5] },
];
for (const { input, expected } of coordinateCases) {
  const actual = heliocentricGalacticToProject(...input);
  actual.forEach((value, index) => {
    if (Math.abs(value - expected[index]) > 1e-8) {
      throw new Error(
        `Transformação galáctica incorreta para (${input.join(', ')}): ` +
          `${actual.join(', ')}.`
      );
    }
  });
}

for (const [assetName, asset] of Object.entries(manifest.assets)) {
  const assetPath = path.join(publicDirectory, asset.file);
  const buffer = await readFile(assetPath);
  const expectedBytes = asset.count * asset.strideFloat32 * Float32Array.BYTES_PER_ELEMENT;
  if (buffer.byteLength !== expectedBytes || asset.byteLength !== expectedBytes) {
    throw new Error(
      `${assetName}: ${buffer.byteLength} bytes; manifest/schema exigem ${expectedBytes}.`
    );
  }
  if (sha256(buffer) !== asset.sha256) {
    throw new Error(`${assetName}: SHA-256 diverge do manifesto.`);
  }
  for (let offset = 0; offset < buffer.byteLength; offset += 4) {
    if (!Number.isFinite(buffer.readFloatLE(offset))) {
      throw new Error(`${assetName}: Float32 não finito no byte ${offset}.`);
    }
  }
}

const gaiaObAsset = manifest.assets.gaiaObProxyStars;
if (
  !gaiaObAsset ||
  gaiaObAsset.count < 80_000 ||
  gaiaObAsset.strideFloat32 !== 10
) {
  throw new Error(
    'Gaia OB proxy ausente, abaixo de 80.000 registros ou com stride inválido.'
  );
}
const gaiaObBuffer = await readFile(
  path.join(publicDirectory, gaiaObAsset.file)
);
for (
  let offset = 0;
  offset < gaiaObBuffer.byteLength;
  offset += gaiaObAsset.strideFloat32 * 4
) {
  const zPc = gaiaObBuffer.readFloatLE(offset + 2 * 4);
  const confidence = gaiaObBuffer.readFloatLE(offset + 8 * 4);
  if (Math.abs(zPc - 5.5) >= 300.01) {
    throw new Error(`Gaia OB proxy viola |Z| < 300 pc no byte ${offset}.`);
  }
  if (confidence < 0 || confidence > 1) {
    throw new Error(
      `Gaia OB proxy possui confiança fora de 0..1 no byte ${offset}.`
    );
  }
}

const spiralAnchorAsset = manifest.assets.spiralAnchors;
const spiralAnchorBuffer = await readFile(
  path.join(publicDirectory, spiralAnchorAsset.file)
);
const spiralAnchors = decodeSpiralAnchors(
  spiralAnchorBuffer,
  spiralAnchorAsset,
  manifest.dictionaries.maserArm
);
const spiralMetrics = evaluateSpiralModel(spiralModel, spiralAnchors);
const spiralGate = spiralModel.gate;
if (spiralMetrics.sampleCount !== spiralGate.expectedSampleCount) {
  throw new Error(
    `Fit BeSSeL usa ${spiralMetrics.sampleCount} âncoras; ` +
      `esperadas ${spiralGate.expectedSampleCount}.`
  );
}
if (
  spiralMetrics.medianResidualPc > spiralGate.maxMedianResidualPc ||
  spiralMetrics.p90ResidualPc > spiralGate.maxP90ResidualPc ||
  spiralMetrics.withinOneWidth < spiralGate.minWithinOneWidth
) {
  throw new Error(
    `Fit BeSSeL fora do gate: mediana ` +
      `${spiralMetrics.medianResidualPc.toFixed(1)} pc, p90 ` +
      `${spiralMetrics.p90ResidualPc.toFixed(1)} pc, ` +
      `${spiralMetrics.withinOneWidth} dentro de uma largura.`
  );
}

const [starBinary, starMetadataText] = await Promise.all([
  readFile(path.join(publicDirectory, 'data', 'stars.bin')),
  readFile(path.join(publicDirectory, 'data', 'stars_meta.json'), 'utf8'),
]);
const starMetadata = JSON.parse(starMetadataText);
if (starMetadata.format !== 'sc1') {
  throw new Error(`stars_meta.json com formato "${starMetadata.format}"; esperado "sc1".`);
}
if (starBinary.byteLength !== starMetadata.count * starMetadata.bytesPerStar) {
  throw new Error('stars.bin diverge de stars_meta.json.');
}
// o contrato que as cascas procedurais leem para NÃO repetir o catálogo
if (!(starMetadata.magLimit > 0) || !(starMetadata.horizonPc > 0)) {
  throw new Error('stars_meta.json sem magLimit/horizonPc — o corte das cascas fica cego.');
}
if (!starMetadata.sources?.every((s) => s.sha256 && s.license && s.url)) {
  throw new Error('stars_meta.json sem proveniência completa (url, licença, sha256).');
}
// a quantização é o único ponto onde o catálogo perde informação: se
// alguém apertar uma faixa em build-star-catalog.mjs, ela CLAMPA em
// silêncio e o erro explode. Aqui ele grita.
if (starMetadata.quantization.maxPositionErrorPc > 1) {
  throw new Error('Erro de posição da quantização acima de 1 pc.');
}
if (starMetadata.quantization.maxLogLumError > 0.001) {
  throw new Error('Erro de luminosidade da quantização acima de 0,001 dex.');
}
// Onda 1a/1g: toda nomeada carrega ci (é a lei de cor única — sem ele a
// hero volta à tabela por classe), e a identidade, quando presente, tem
// de ser plausível (HD/HIP inteiros positivos, Gliese com prefixo).
{
  const [ciMin, ciMax] = starMetadata.ranges.ci;
  for (const s of starMetadata.named) {
    if (!Number.isFinite(s.ci) || s.ci < ciMin - 0.5 || s.ci > ciMax + 0.5) {
      throw new Error(`Nomeada "${s.n}" sem ci plausível (${s.ci}).`);
    }
    if (s.hd !== undefined && (!Number.isInteger(s.hd) || s.hd <= 0)) {
      throw new Error(`Nomeada "${s.n}" com HD inválido (${s.hd}).`);
    }
    if (s.hip !== undefined && (!Number.isInteger(s.hip) || s.hip <= 0)) {
      throw new Error(`Nomeada "${s.n}" com HIP inválido (${s.hip}).`);
    }
    if (s.gl !== undefined && !/^(Gl|GJ|NN|Wo)\s/.test(s.gl)) {
      throw new Error(`Nomeada "${s.n}" com Gliese sem prefixo canônico ("${s.gl}").`);
    }
  }
  // âncora de regressão: se Sirius perder a identidade, o build quebrou
  const sirius = starMetadata.named.find((s) => s.n === 'Sirius');
  if (!sirius || sirius.hd !== 48915 || sirius.hip !== 32349) {
    throw new Error('Sirius sem HD 48915 / HIP 32349 — identidade do sidecar quebrada.');
  }
}

console.log(
  `Dados verificados: ${Object.keys(manifest.assets).length} ativos galácticos, ` +
    `${starMetadata.count} estrelas de catálogo (${starMetadata.named.length} nomeadas, ` +
    `horizonte ${starMetadata.horizonPc} pc); fit BeSSeL ` +
    `${spiralMetrics.medianResidualPc.toFixed(1)} pc (p90 ` +
    `${spiralMetrics.p90ResidualPc.toFixed(1)} pc).`
);
