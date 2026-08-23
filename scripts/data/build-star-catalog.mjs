// ============================================================
// Catálogo estelar — AT-HYG v4.0 (posições Gaia DR3) com a
// fotometria do HYG v4.4 mandando no extremo brilhante.
//
// POR QUE DUAS FONTES. O subset AT-HYG normaliza TODA magnitude
// para Tycho (mag_src "T"): VT, não V, e o `ci` vira BT−VT. Para
// as estrelas brilhantes o Tycho satura — Sirius sai −1,088 onde
// o V real é −1,44, e o BT−VT das 100 mais brilhantes vem VAZIO.
// O HYG v4.4 carrega o V do Hipparcos (Sirius −1,44, idêntico ao
// binário que este script substitui) mas ficou preso à paralaxe
// do Hipparcos: distância máxima 990 pc, uma parede.
// A junção pelo id HYG pega o melhor dos dois: posição e
// distância do Gaia, fotometria do Hipparcos onde ela existe,
// transformação Tycho→Johnson no preenchimento fraco (onde ela é
// válida e o erro é ~0,05 mag).
//
// FORMATO DE SAÍDA ("sc1"): 9 bytes por estrela em cinco seções
// contíguas, não interleaved — decodificação são cinco views
// sobre o mesmo ArrayBuffer. Float32 stride 6 custaria 24 B/estrela
// (7,6 MiB para 330 k) e comprime mal (medido: gzip só tira 17%).
// A magnitude aparente do binário antigo não entra: o runtime a
// RECALCULA da posição da câmera, então guardá-la era peso morto.
//
//   npm run data:stars            (usa o cache em .cache/star-catalog)
//   npm run data:stars -- --refresh   (rebaixa as fontes)
// ============================================================
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outputDirectory = path.join(rootDirectory, 'public', 'data');
const cacheDirectory = path.join(rootDirectory, '.cache', 'star-catalog');
const refresh = process.argv.includes('--refresh');

// O codeberg serve estes arquivos por Git LFS: o caminho /raw/ devolve
// o ponteiro de 133 bytes, o /media/ devolve o conteúdo.
const SOURCES = {
  athyg: {
    url: 'https://codeberg.org/astronexus/athyg/media/branch/main/data/subsets/athyg_40_reduced_m10.csv.gz',
    file: 'athyg_40_reduced_m10.csv.gz',
    catalogue: 'AT-HYG v4.0, subset até magnitude 10',
    license: 'CC BY-SA 4.0',
    home: 'https://codeberg.org/astronexus/athyg',
  },
  hyg: {
    url: 'https://codeberg.org/astronexus/hyg/media/branch/main/data/hyg/CURRENT/hyg_v44.csv.gz',
    file: 'hyg_v44.csv.gz',
    catalogue: 'HYG v4.4',
    license: 'CC BY-SA 4.0',
    home: 'https://codeberg.org/astronexus/hyg',
  },
};

// ---- contrato do formato: os mesmos números vivem em src/three/config.ts
export const FORMAT = 'sc1';
const LOGD_MIN = -0.5; // 0,316 pc
const LOGD_MAX = 4.0; // 10 kpc
// logLum = 0,4·(4,85 − M_V), então os limites de M_V abaixo (−10 a 20)
// pedem esta faixa; apertá-la CLAMPA em silêncio (custou uma rodada)
const LUM_MIN = -6.5;
const LUM_MAX = 6.5;
const CI_MIN = -0.6;
const CI_MAX = 3.0;

// ---- limites de sanidade do dado
const MAX_DIST_PC = 5000; // além disto a paralaxe Gaia DR3 não sustenta 3D
const MIN_ABS_MAG = -10; // nenhuma estrela isolada é mais luminosa
const MAX_ABS_MAG = 20;

const GREEK = {
  Alp: 'α', Bet: 'β', Gam: 'γ', Del: 'δ', Eps: 'ε', Zet: 'ζ', Eta: 'η',
  The: 'θ', Iot: 'ι', Kap: 'κ', Lam: 'λ', Mu: 'μ', Nu: 'ν', Xi: 'ξ',
  Omi: 'ο', Pi: 'π', Rho: 'ρ', Sig: 'σ', Tau: 'τ', Ups: 'υ', Phi: 'φ',
  Chi: 'χ', Psi: 'ψ', Ome: 'ω',
};

/**
 * A LETRA DE BAYER SOZINHA — "α", "γ²". Separada de `greekName` em 22/08
 * porque ela passou a ser DADO e não só rótulo: a estrela de nome próprio
 * ("Sirius") perdia a designação inteira, e a ficha do objeto (item 74)
 * precisa dizer "α Canis Majoris" ao lado do nome que a pessoa conhece.
 */
function bayerGlifo(bayer) {
  const [letter, index] = bayer.split('-');
  const glyph = GREEK[letter];
  if (!glyph) return '';
  return `${glyph}${index ? `¹²³⁴⁵⁶⁷⁸⁹`[Number(index) - 1] ?? index : ''}`;
}

function greekName(bayer, con) {
  const glifo = bayerGlifo(bayer);
  if (!glifo || !con) return '';
  return `${glifo} ${con}`;
}

/** split de CSV ciente de aspas — o HYG cita campos e o proper pode ter vírgula */
function splitCsv(line) {
  const out = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(field); field = ''; }
    else field += c;
  }
  out.push(field);
  return out;
}

async function fetchSource(key) {
  const source = SOURCES[key];
  const cached = path.join(cacheDirectory, source.file);
  let gz;
  if (!refresh && existsSync(cached)) {
    gz = await readFile(cached);
    process.stdout.write(`${source.catalogue}: cache.\n`);
  } else {
    const response = await fetch(source.url);
    if (!response.ok) throw new Error(`${source.url}: HTTP ${response.status}`);
    gz = Buffer.from(await response.arrayBuffer());
    // VALIDA ANTES DE GRAVAR. O cache era escrito direto do socket: um
    // download truncado (rede caindo no meio) deixava um .csv.gz
    // corrompido no .cache, e TODAS as runs seguintes falhavam nele —
    // até alguém descobrir o `--refresh` manual. Achado de auditoria
    // externa (2026-08-12). O gunzip é a prova barata de que o arquivo
    // chegou inteiro, e ele já ia rodar duas linhas abaixo.
    try {
      gunzipSync(gz);
    } catch (error) {
      throw new Error(
        `${source.url}: download incompleto ou corrompido (${error.message}) — ` +
          'nada foi gravado no cache; rode de novo.'
      );
    }
    await mkdir(cacheDirectory, { recursive: true });
    await writeFile(cached, gz);
    process.stdout.write(`${source.catalogue}: ${gz.byteLength} bytes da rede.\n`);
  }
  const text = gunzipSync(gz).toString('utf8');
  const lines = text.split('\n');
  const header = splitCsv(lines[0]);
  const index = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
  return {
    lines,
    index,
    provenance: {
      catalogue: source.catalogue,
      url: source.url,
      home: source.home,
      license: source.license,
      sha256: createHash('sha256').update(gz).digest('hex'),
      compressedBytes: gz.byteLength,
    },
  };
}

const number = (value) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

// ---------------------------------------------------------------
// 1. HYG v4.4 — a fotometria de referência, indexada pelo id HYG
// ---------------------------------------------------------------
const hyg = await fetchSource('hyg');
const photometry = new Map();
for (let k = 1; k < hyg.lines.length; k++) {
  if (!hyg.lines[k]) continue;
  const c = splitCsv(hyg.lines[k]);
  const id = c[hyg.index.id];
  if (!id || id === '0') continue; // o Sol do HYG; o nosso é outro assunto
  const v = number(c[hyg.index.mag]);
  if (v === null) continue;
  photometry.set(id, {
    v,
    ci: number(c[hyg.index.ci]),
    spect: (c[hyg.index.spect] ?? '').trim(),
    // identidade de catálogo (Onda 1g): o HYG v4.4 é a AUTORIDADE dos ids.
    // Medido contra o AT-HYG nas nomeadas: HIP crava 100%, mas o HD diverge
    // em 28 (o AT-HYG dá 148479 para Antares — o HD da componente B) e o
    // Gliese do AT-HYG vem sem o prefixo ("244A" em vez de "Gl 244A").
    hd: number(c[hyg.index.hd]),
    hip: number(c[hyg.index.hip]),
    gl: (c[hyg.index.gl] ?? '').trim(),
  });
}
process.stdout.write(`HYG v4.4: ${photometry.size} estrelas com V.\n`);

// ---------------------------------------------------------------
// 2. AT-HYG — a lista mestre: posição e distância do Gaia DR3
// ---------------------------------------------------------------
const athyg = await fetchSource('athyg');
const A = athyg.index;

const excluded = {
  sol: 0,
  semDistancia: 0,
  alemDoHorizonte: 0,
  semCor: 0,
  luminosidadeImplausivel: 0,
};
const stars = [];
const named = [];
let fromHyg = 0;
let fromTycho = 0;

for (let k = 1; k < athyg.lines.length; k++) {
  const line = athyg.lines[k];
  if (!line) continue;
  const c = splitCsv(line);
  const dist = number(c[A.dist]);
  if (dist === null || dist <= 0) { excluded.semDistancia++; continue; }
  if (dist < 1e-3) { excluded.sol++; continue; }
  if (dist > MAX_DIST_PC) { excluded.alemDoHorizonte++; continue; }

  const hygId = c[A.hyg];
  const ref = hygId ? photometry.get(hygId) : undefined;
  const tychoMag = number(c[A.mag]);
  const tychoCi = number(c[A.ci]);

  // Transformação Tycho-2 → Johnson (ESA SP-1200 vol. 1, §1.3):
  // V = VT − 0,090·(BT−VT) e B−V = 0,850·(BT−VT). Válida em
  // −0,25 < BT−VT < 2,0; fora disso o valor é preso na borda.
  let v = null;
  let ci = null;
  if (ref && ref.ci !== null) {
    v = ref.v;
    ci = ref.ci;
    fromHyg++;
  } else if (tychoCi !== null && tychoMag !== null) {
    const bt = Math.min(Math.max(tychoCi, -0.25), 2.0);
    v = tychoMag - 0.09 * bt;
    ci = 0.85 * bt;
    fromTycho++;
  } else if (ref) {
    // tem V do Hipparcos mas nenhuma cor em lugar nenhum
    v = ref.v;
    ci = null;
    fromHyg++;
  }
  if (v === null || ci === null) { excluded.semCor++; continue; }

  const absMag = v - 5 * Math.log10(dist) + 5;
  if (!(absMag > MIN_ABS_MAG && absMag < MAX_ABS_MAG)) {
    excluded.luminosidadeImplausivel++;
    continue;
  }

  const x = number(c[A.x0]);
  const y = number(c[A.y0]);
  const z = number(c[A.z0]);
  if (x === null || y === null || z === null) { excluded.semDistancia++; continue; }

  stars.push({ x, y, z, dist, logLum: 0.4 * (4.85 - absMag), ci });

  // ---- nomes: só o que uma pessoa reconhece. Flamsteed ("31 Cyg")
  // fica de fora — são 1,7 k etiquetas de valor baixo e o HUD mostra
  // no máximo 7 por quadro, com preferência por PROXIMIDADE: sem o
  // tier, um número de Flamsteed perto empurraria Deneb para fora.
  const proper = (c[A.proper] ?? '').trim();
  const bayer = (c[A.bayer] ?? '').trim();
  const con = (c[A.con] ?? '').trim();
  const label = proper || (bayer ? greekName(bayer, con) : '');
  if (label) {
    // ci nas nomeadas (Onda 1a): o mesmo B-V que já vai ao binário — é ele
    // que unifica a cor das heroes com a lei do catálogo (bvToColor).
    // Identidade de catálogo (Onda 1g): HD/HIP numéricos e Gliese textual,
    // lidos das colunas que o AT-HYG já carrega. Emitida SÓ para as
    // nomeadas — o default declarado da Decisão 2; as 328k esperam.
    const entry = {
      n: label,
      x, y, z,
      m: Number(v.toFixed(3)),
      s: (ref?.spect || c[A.spect] || '').trim(),
      d: Number(dist.toFixed(4)),
      t: proper ? 0 : 1,
      ci: Number(ci.toFixed(3)),
    };
    // EXCLUSIVAMENTE do HYG v4.4 — sem fallback para as colunas do AT-HYG:
    // o fallback reintroduziria em silêncio, numa regeneração futura, o
    // exato bug que esta onda corrigiu (28 HDs divergentes — o AT-HYG dá o
    // HD da componente B de Antares — e Gliese sem prefixo canônico).
    // Estrela sem par no HYG fica sem id, com o campo AUSENTE — honesto.
    const hd = ref?.hd ?? null;
    const hip = ref?.hip ?? null;
    const gl = ref?.gl || '';
    if (hd !== null) entry.hd = hd;
    if (hip !== null) entry.hip = hip;
    if (gl) entry.gl = gl;
    // A DESIGNAÇÃO DE BAYER E A CONSTELAÇÃO (item 74, parte B, 22/08). Elas
    // sempre foram LIDAS aqui e descartadas: `label` juntava as duas numa
    // string e, quando havia nome próprio, jogava as duas fora. "Sirius"
    // saía sem a menor pista de que é a α do Cão Maior. Agora atravessam
    // como campos, e a ficha as remonta ("α Canis Majoris"); a sigla de três
    // letras é a do HYG, e `lib/atlas/constelacoes.ts` a expande no runtime.
    const glifo = bayer ? bayerGlifo(bayer) : '';
    if (glifo) entry.b = glifo;
    if (con) entry.c = con;
    named.push(entry);
  }
}

// nomes duplicados (componentes do mesmo sistema) só confundem o rótulo
const seenNames = new Set();
const namedUnique = named
  .sort((a, b) => a.t - b.t || a.m - b.m)
  .filter((s) => (seenNames.has(s.n) ? false : (seenNames.add(s.n), true)));

// ---------------------------------------------------------------
// 3. Codificação
// ---------------------------------------------------------------
const count = stars.length;
const buffer = Buffer.alloc(count * 9);
const lon = new Uint16Array(buffer.buffer, buffer.byteOffset, count);
const lat = new Uint16Array(buffer.buffer, buffer.byteOffset + count * 2, count);
const logd = new Uint16Array(buffer.buffer, buffer.byteOffset + count * 4, count);
const lum = new Uint16Array(buffer.buffer, buffer.byteOffset + count * 6, count);
const ciBytes = new Uint8Array(buffer.buffer, buffer.byteOffset + count * 8, count);

const quantize = (value, min, max, steps) =>
  Math.round(Math.min(Math.max((value - min) / (max - min), 0), 1) * steps);

let maxPosError = 0;
let maxLumError = 0;
for (let i = 0; i < count; i++) {
  const s = stars[i];
  const ra = Math.atan2(s.y, s.x);
  const dec = Math.asin(Math.min(Math.max(s.z / s.dist, -1), 1));
  lon[i] = quantize(ra < 0 ? ra + 2 * Math.PI : ra, 0, 2 * Math.PI, 65535);
  lat[i] = quantize(dec, -Math.PI / 2, Math.PI / 2, 65535);
  logd[i] = quantize(Math.log10(s.dist), LOGD_MIN, LOGD_MAX, 65535);
  lum[i] = quantize(s.logLum, LUM_MIN, LUM_MAX, 65535);
  ciBytes[i] = quantize(s.ci, CI_MIN, CI_MAX, 255);

  // erro real da quantização, medido no próprio build (não estimado)
  const ra2 = (lon[i] / 65535) * 2 * Math.PI;
  const dec2 = (lat[i] / 65535) * Math.PI - Math.PI / 2;
  const d2 = 10 ** (LOGD_MIN + (logd[i] / 65535) * (LOGD_MAX - LOGD_MIN));
  const dx = d2 * Math.cos(dec2) * Math.cos(ra2) - s.x;
  const dy = d2 * Math.cos(dec2) * Math.sin(ra2) - s.y;
  const dz = d2 * Math.sin(dec2) - s.z;
  maxPosError = Math.max(maxPosError, Math.hypot(dx, dy, dz));
  maxLumError = Math.max(
    maxLumError,
    Math.abs(LUM_MIN + (lum[i] / 65535) * (LUM_MAX - LUM_MIN) - s.logLum)
  );
}

const horizonPc = stars.reduce((m, s) => Math.max(m, s.dist), 0);
const meta = {
  format: FORMAT,
  count,
  bytesPerStar: 9,
  /** raio do que o catálogo de fato cobre — as cascas procedurais leem
   *  daqui até onde PARAR de suprimir estrelas (ver wrappedStars.ts) */
  horizonPc: Number(horizonPc.toFixed(1)),
  /** magnitude aparente limite da fonte, vista do Sol */
  magLimit: 10,
  ranges: { logd: [LOGD_MIN, LOGD_MAX], lum: [LUM_MIN, LUM_MAX], ci: [CI_MIN, CI_MAX] },
  photometry: { fromHyg, fromTycho },
  excluded,
  quantization: {
    maxPositionErrorPc: Number(maxPosError.toFixed(4)),
    maxLogLumError: Number(maxLumError.toFixed(6)),
  },
  sources: [athyg.provenance, hyg.provenance],
  named: namedUnique,
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, 'stars.bin'), buffer);
await writeFile(
  path.join(outputDirectory, 'stars_meta.json'),
  `${JSON.stringify(meta, null, 2)}\n`
);

process.stdout.write(
  `Catálogo: ${count} estrelas (${(buffer.byteLength / 1024 / 1024).toFixed(2)} MiB), ` +
    `${namedUnique.length} nomeadas; fotometria HYG ${fromHyg} / Tycho ${fromTycho}; ` +
    `horizonte ${meta.horizonPc} pc; erro de posição ≤ ${meta.quantization.maxPositionErrorPc} pc, ` +
    `de luminosidade ≤ ${meta.quantization.maxLogLumError} dex.\n` +
    `Excluídas: ${JSON.stringify(excluded)}\n`
);
