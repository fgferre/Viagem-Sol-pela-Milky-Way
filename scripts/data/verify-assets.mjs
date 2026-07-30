import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from './lib/binary.mjs';
import { heliocentricGalacticToProject } from './lib/galactic.mjs';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const publicDirectory = path.join(rootDirectory, 'public');
const manifestPath = path.join(publicDirectory, 'data', 'galaxy', 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

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

const [starBinary, starMetadataText] = await Promise.all([
  readFile(path.join(publicDirectory, 'data', 'stars.bin')),
  readFile(path.join(publicDirectory, 'data', 'stars_meta.json'), 'utf8'),
]);
const starMetadata = JSON.parse(starMetadataText);
const starStrideBytes = 6 * Float32Array.BYTES_PER_ELEMENT;
if (starBinary.byteLength !== starMetadata.count * starStrideBytes) {
  throw new Error('stars.bin diverge de stars_meta.json.');
}
if (
  starMetadata.sourceCount !==
  starMetadata.count + starMetadata.excluded.missingDistanceSentinel
) {
  throw new Error('A contabilidade do saneamento HYG está inconsistente.');
}

console.log(
  `Dados verificados: ${Object.keys(manifest.assets).length} ativos galácticos, ` +
    `${starMetadata.count} estrelas HYG utilizáveis.`
);
