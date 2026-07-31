import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  decodeSpiralAnchors,
  fitSpiralModel,
} from './lib/spiral-fit.mjs';

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);
const manifest = JSON.parse(
  await readFile(
    path.join(rootDirectory, 'public', 'data', 'galaxy', 'manifest.json'),
    'utf8'
  )
);
const modelPath = path.join(
  rootDirectory,
  'src',
  'three',
  'cartography',
  'spiralModel.json'
);
const currentModel = JSON.parse(await readFile(modelPath, 'utf8'));
const anchorAsset = manifest.assets.spiralAnchors;
const anchorBuffer = await readFile(
  path.join(rootDirectory, 'public', anchorAsset.file)
);
const anchors = decodeSpiralAnchors(
  anchorBuffer,
  anchorAsset,
  manifest.dictionaries.maserArm
);
const { model, metrics } = fitSpiralModel(currentModel, anchors);

await writeFile(modelPath, `${JSON.stringify(model, null, 2)}\n`);
console.log(
  `Fit BeSSeL: ${metrics.sampleCount} âncoras, residual mediano ` +
    `${metrics.medianResidualPc.toFixed(1)} pc, p90 ` +
    `${metrics.p90ResidualPc.toFixed(1)} pc.`
);
