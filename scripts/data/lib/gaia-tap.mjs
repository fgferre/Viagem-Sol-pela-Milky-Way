import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const GAIA_TAP_ASYNC =
  'https://gea.esac.esa.int/tap-server/tap/async';

function parseCsv(text, expectedColumns) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('Resposta Gaia TAP sem registros.');
  const columns = lines[0].split(',');
  for (const column of expectedColumns) {
    if (!columns.includes(column)) {
      throw new Error(`Resposta Gaia TAP sem a coluna ${column}.`);
    }
  }
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    if (cells.length !== columns.length) {
      throw new Error(
        `Linha Gaia TAP com ${cells.length} células; esperadas ${columns.length}.`
      );
    }
    return Object.fromEntries(
      columns.map((column, index) => [column, cells[index]])
    );
  });
}

async function tapRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'user-agent': 'mar-de-estrelas-data-pipeline/1.0',
      ...options.headers,
    },
    signal: AbortSignal.timeout(60_000),
  });
  return response;
}

async function launchJob(query) {
  const body = new URLSearchParams({
    REQUEST: 'doQuery',
    LANG: 'ADQL',
    FORMAT: 'csv',
    QUERY: query,
  });
  const response = await tapRequest(GAIA_TAP_ASYNC, {
    method: 'POST',
    body,
    redirect: 'manual',
  });
  if (response.status !== 303) {
    throw new Error(
      `Gaia TAP async: HTTP ${response.status} ${response.statusText}`
    );
  }
  const location = response.headers.get('location');
  if (!location) throw new Error('Gaia TAP async sem URL do job.');
  const jobUrl = new URL(location, GAIA_TAP_ASYNC).href;
  const run = await tapRequest(`${jobUrl}/phase`, {
    method: 'POST',
    body: new URLSearchParams({ PHASE: 'RUN' }),
  });
  if (!run.ok) {
    throw new Error(`Gaia TAP não iniciou o job: HTTP ${run.status}.`);
  }
  return jobUrl;
}

async function waitForJob(jobUrl) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30 * 60_000) {
    const response = await tapRequest(`${jobUrl}/phase`);
    if (!response.ok) {
      throw new Error(`Gaia TAP phase: HTTP ${response.status}.`);
    }
    const phase = (await response.text()).trim();
    if (phase === 'COMPLETED') return;
    if (['ERROR', 'ABORTED', 'UNKNOWN'].includes(phase)) {
      let detail = '';
      try {
        detail = await (await tapRequest(`${jobUrl}/error`)).text();
      } catch {
        // A fase já é suficiente quando o endpoint de erro não responde.
      }
      throw new Error(`Gaia TAP terminou em ${phase}: ${detail.slice(0, 800)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error('Gaia TAP excedeu 30 minutos.');
}

export async function fetchGaiaTapTable({
  queryPath,
  cacheName,
  cacheDirectory,
  expectedColumns,
  refresh = false,
}) {
  const cachePath = path.join(cacheDirectory, `${cacheName}.csv`);
  if (!refresh) {
    try {
      const cached = await readFile(cachePath, 'utf8');
      return { rows: parseCsv(cached, expectedColumns), fromCache: true };
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  const query = await readFile(queryPath, 'utf8');
  const jobUrl = await launchJob(query);
  console.log(`Gaia TAP: job ${jobUrl.split('/').at(-1)} em execução...`);
  await waitForJob(jobUrl);
  const result = await tapRequest(`${jobUrl}/results/result`);
  if (!result.ok) {
    throw new Error(`Gaia TAP result: HTTP ${result.status}.`);
  }
  const text = await result.text();
  const rows = parseCsv(text, expectedColumns);
  await mkdir(cacheDirectory, { recursive: true });
  await writeFile(cachePath, text);
  return { rows, fromCache: false };
}
