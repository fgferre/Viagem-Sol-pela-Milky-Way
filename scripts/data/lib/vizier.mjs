import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const VIZIER_ENDPOINT = 'https://vizier.cds.unistra.fr/viz-bin/asu-tsv';

function dataLines(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

function parseVizierTsv(text, expectedColumns = []) {
  const lines = dataLines(text);
  const headerIndex = lines.findIndex(
    (line) =>
      line.includes('\t') &&
      expectedColumns.every((column) => line.split('\t').includes(column))
  );
  if (headerIndex < 0) {
    throw new Error(
      `Resposta VizieR inválida: cabeçalho não contém ${expectedColumns.join(', ')}.`
    );
  }

  const columns = lines[headerIndex].split('\t');
  const rows = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (/^-+(?:\t-+)+$/.test(line.trim())) continue;
    const cells = line.split('\t');
    if (cells.length !== columns.length || !/^\s*\d+\s*$/.test(cells[0])) continue;
    rows.push(Object.fromEntries(columns.map((column, index) => [column, cells[index].trim()])));
  }
  if (rows.length === 0) throw new Error('Resposta VizieR sem registros.');
  return rows;
}

export async function fetchVizierTable({
  source,
  cacheName,
  cacheDirectory,
  expectedColumns,
  refresh = false,
}) {
  const cachePath = path.join(cacheDirectory, `${cacheName}.tsv`);
  if (!refresh) {
    try {
      const cached = await readFile(cachePath, 'utf8');
      return { rows: parseVizierTsv(cached, expectedColumns), fromCache: true };
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  const url = new URL(VIZIER_ENDPOINT);
  url.searchParams.set('-source', source);
  url.searchParams.set('-out.all', '1');
  url.searchParams.set('-out.max', 'unlimited');

  const response = await fetch(url, {
    headers: { 'user-agent': 'mar-de-estrelas-data-pipeline/1.0' },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    throw new Error(`VizieR ${source}: HTTP ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const rows = parseVizierTsv(text, expectedColumns);
  await mkdir(cacheDirectory, { recursive: true });
  await writeFile(cachePath, text);
  return { rows, fromCache: false };
}

export function numeric(row, column) {
  const value = Number.parseFloat(row[column]);
  return Number.isFinite(value) ? value : Number.NaN;
}
