import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const binaryPath = path.join(rootDirectory, 'public', 'data', 'stars.bin');
const metadataPath = path.join(rootDirectory, 'public', 'data', 'stars_meta.json');
const stride = 6;
const missingDistanceThresholdPc = 90_000;

const [binary, metadataText] = await Promise.all([
  readFile(binaryPath),
  readFile(metadataPath, 'utf8'),
]);
if (binary.byteLength % (stride * Float32Array.BYTES_PER_ELEMENT) !== 0) {
  throw new Error('stars.bin não possui stride Float32 x6.');
}

const values = new Float32Array(
  binary.buffer,
  binary.byteOffset,
  binary.byteLength / Float32Array.BYTES_PER_ELEMENT
);
const kept = [];
let excludedThisRun = 0;
for (let offset = 0; offset < values.length; offset += stride) {
  const distance = Math.hypot(values[offset], values[offset + 1], values[offset + 2]);
  if (distance >= missingDistanceThresholdPc) {
    excludedThisRun += 1;
    continue;
  }
  for (let field = 0; field < stride; field += 1) kept.push(values[offset + field]);
}

const metadata = JSON.parse(metadataText);
const previouslyExcluded = metadata.excluded?.missingDistanceSentinel ?? 0;
const sourceCount = metadata.sourceCount ?? metadata.count;
metadata.count = kept.length / stride;
metadata.sourceCount = sourceCount;
metadata.excluded = {
  missingDistanceSentinel: previouslyExcluded + excludedThisRun,
  thresholdPc: missingDistanceThresholdPc,
  reason:
    'O HYG usa aproximadamente 100000 pc quando a distância é ausente; esses registros não são estrelas cartografadas do disco.',
};

if (excludedThisRun > 0) {
  const sanitized = Buffer.allocUnsafe(kept.length * Float32Array.BYTES_PER_ELEMENT);
  kept.forEach((value, index) => sanitized.writeFloatLE(value, index * 4));
  await writeFile(binaryPath, sanitized);
}
await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

console.log(
  `HYG: ${sourceCount} registros de origem; ${metadata.count} utilizáveis; ` +
    `${metadata.excluded.missingDistanceSentinel} sentinelas excluídas.`
);
