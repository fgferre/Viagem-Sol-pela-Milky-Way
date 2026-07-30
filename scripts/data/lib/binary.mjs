import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

function encodeFloat32LittleEndian(records, stride) {
  const output = Buffer.allocUnsafe(records.length * stride * Float32Array.BYTES_PER_ELEMENT);
  let offset = 0;
  for (const record of records) {
    if (record.length !== stride) {
      throw new Error(`Registro com stride ${record.length}; esperado ${stride}.`);
    }
    for (const value of record) {
      if (!Number.isFinite(value)) throw new Error(`Valor binário não finito: ${value}`);
      output.writeFloatLE(value, offset);
      offset += Float32Array.BYTES_PER_ELEMENT;
    }
  }
  return output;
}

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function writeFloat32Asset(outputDirectory, fileName, records, fields) {
  const buffer = encodeFloat32LittleEndian(records, fields.length);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, fileName), buffer);
  return {
    file: `data/galaxy/${fileName}`,
    count: records.length,
    strideFloat32: fields.length,
    byteLength: buffer.byteLength,
    sha256: sha256(buffer),
    fields,
  };
}

export function categoryDictionary(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function categoryCode(dictionary, value) {
  const index = dictionary.indexOf(value);
  return index < 0 ? 0 : index + 1;
}

export function range(values) {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  return Number.isFinite(minimum) ? [minimum, maximum] : [null, null];
}
