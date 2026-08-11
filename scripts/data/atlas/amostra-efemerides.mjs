#!/usr/bin/env node

// ============================================================
// Amostrador de efemérides — converte as teorias analíticas do
// atlas-orbital em TABELAS embarcadas (runtime → offline, a conversão
// que o PLANO-ATLAS exige para a Onda 2: o navegador não avalia VSOP87
// a cada frame; ele interpola uma tabela auditada no build).
//
// FONTES (astronomia@4.2.0, o MESMO pacote e as MESMAS teorias que o
// doador rodava ao vivo):
//   - 8 planetas: astronomia/planetposition + data/vsop87D<planeta>
//     (heliocêntrico esférico, eclíptica J2000 via position2000).
//   - Plutão: astronomia/pluto (Meeus cap. 37, heliocêntrico).
//   - Lua: astronomia/elp + data/elpMppDe (GEOCÊNTRICA, km → AU).
// Cartesiano SEM nenhum remap Y-up: o frame de tudo aqui é eclíptica
// média J2000; quem quiser o Y-up da cena remapeia na borda (doutrina
// da casa desde kepler.ts).
//
// CICATRIZ HERDADA 1 (sanitizeVsopSeries, vendorizada verbatim de
// atlas-orbital/src/lib/orbital/analytical/vsop87Planets.ts:44-76):
// astronomia 4.2.0 embarca linhas [NaN,NaN,NaN] em vsop87Duranus e
// vsop87Dneptune; sem o filtro, um único NaN envenena o Horner inteiro
// e Netuno sai a ~0° em vez de ~347°. As linhas filtradas são contadas
// e registradas no manifest (medido nesta máquina: uranus 1, neptune 3).
//
// CICATRIZ NOVA 2 (desvio declarado do prompt da onda): o passo pedido
// para Mercúrio era 6 dias, mas o erro Hermite MEDIDO no periélio foi
// 1,67e-4 AU — 3,3× o orçamento de 5e-5 que a própria onda fixa como
// oráculo. O limiar não afrouxa (regra da casa); o passo cede: o erro
// escala com h⁴, e h=4 d mede 3,4e-5 AU (folga 1,5×). Os demais passos
// pedidos passaram todos com folga na medição.
//
// AUTO-GATE NO DADO (padrão do spiralModel.json: os números de
// aceitação moram junto do dado, não num teste distante): para cada
// corpo, ≥200 instantes pseudo-aleatórios de semente FIXA são avaliados
// pela interpolação Hermite cúbica (lendo a tabela Float32 exatamente
// como o runtime lê) e comparados à teoria direta em Float64. O máximo
// vira `erroMedidoAu` no manifest, o orçamento vira `orcamentoErroAu`,
// e estourar o orçamento LANÇA — o .bin nunca nasce mentindo. A fórmula
// Hermite existe aqui e em src/lib/atlas/efemerides.ts (fronteira
// script/runtime não importa módulo); uma divergência entre as duas
// seria pega pelos oráculos Horizons de regressao.test.ts.
//
// VELOCIDADES: diferença central ±0,01 dia sobre a teoria (erro ~h²/6
// da terceira derivada, ordens abaixo do orçamento). Elas são parte do
// formato: a Hermite cúbica precisa de posição E velocidade nos nós.
//
// SAÍDA: um único .bin Float32 [x,y,z,vx,vy,vz]×N por corpo, corpos
// concatenados com offsets no manifest (o padrão de views do sc1:
// decodificar é criar uma view por corpo sobre o mesmo ArrayBuffer).
// O .gz irmão NÃO é gerado aqui: scripts/data/compress-assets.mjs já
// varre public/data/**.bin (rode `npm run data:pack` depois); o
// verify-assets.mjs cobra que o par exista e descomprima bit-idêntico.
//
//   npm run data:atlas
// ============================================================

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import planetposition from 'astronomia/planetposition';
import pluto from 'astronomia/pluto';
import elp from 'astronomia/elp';
import vsop87Dmercury from 'astronomia/data/vsop87Dmercury';
import vsop87Dvenus from 'astronomia/data/vsop87Dvenus';
import vsop87Dearth from 'astronomia/data/vsop87Dearth';
import vsop87Dmars from 'astronomia/data/vsop87Dmars';
import vsop87Djupiter from 'astronomia/data/vsop87Djupiter';
import vsop87Dsaturn from 'astronomia/data/vsop87Dsaturn';
import vsop87Duranus from 'astronomia/data/vsop87Duranus';
import vsop87Dneptune from 'astronomia/data/vsop87Dneptune';
import elpMppDe from 'astronomia/data/elpMppDe';

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
);
const outputDirectory = path.join(rootDirectory, 'public', 'data', 'atlas');

/** 1 AU em km (IAU 2012) — o mesmo literal de elementosOrbitais.ts. */
const AU_KM = 149597870.7;

// Janela da tabela: 1950-01-01 a 2050-01-01, escala TDB.
// 2433282.5 → 2469807.5 = 36 525 dias. A janela regenera quando a
// Decisão 2 do plano fixar o orçamento de payload.
const JD_INICIO = 2433282.5;
const JD_FIM = 2469807.5;
const ISO_INICIO = '1950-01-01T00:00:00 TDB';
const ISO_FIM = '2050-01-01T00:00:00 TDB';

// ------------------------------------------------------------
// VENDORIZADO VERBATIM de atlas-orbital
// src/lib/orbital/analytical/vsop87Planets.ts:44-76 (comentário incluso;
// só o tipo TS `Vsop87Series` cai por este arquivo ser .mjs).
// ------------------------------------------------------------
/**
 * Remove corrupt `[NaN, NaN, NaN]` rows from the VSOP87D series.
 *
 * astronomia 4.2.0 ships vsop87Duranus.js and vsop87Dneptune.js with a
 * handful of NaN-filled rows (likely produced by the upstream conversion
 * script when a coefficient underflowed). A single NaN poisons the entire
 * Horner evaluation, yielding absurd longitudes (Neptune came back at
 * ~0° instead of ~347°). Filtering those rows is safe: each row is an
 * independent periodic term, and the omitted contributions are by
 * construction smaller than any term the original table kept.
 */
function sanitizeVsopSeries(data) {
  const clean = (block) => {
    const out = {};
    for (const key of Object.keys(block)) {
      out[key] = block[key].filter(
        (row) =>
          Array.isArray(row) &&
          row.length >= 3 &&
          Number.isFinite(row[0]) &&
          Number.isFinite(row[1]) &&
          Number.isFinite(row[2])
      );
    }
    return out;
  };
  return {
    ...data,
    L: clean(data.L),
    B: clean(data.B),
    R: clean(data.R),
  };
}

/** Conta as linhas que sanitizeVsopSeries filtraria — para o manifest. */
function contarLinhasInvalidas(data) {
  let n = 0;
  for (const bloco of ['L', 'B', 'R']) {
    for (const key of Object.keys(data[bloco])) {
      for (const row of data[bloco][key]) {
        if (
          !Array.isArray(row) ||
          row.length < 3 ||
          !Number.isFinite(row[0]) ||
          !Number.isFinite(row[1]) ||
          !Number.isFinite(row[2])
        ) {
          n++;
        }
      }
    }
  }
  return n;
}

const SERIES_VSOP = {
  mercury: vsop87Dmercury,
  venus: vsop87Dvenus,
  earth: vsop87Dearth,
  mars: vsop87Dmars,
  jupiter: vsop87Djupiter,
  saturn: vsop87Dsaturn,
  uranus: vsop87Duranus,
  neptune: vsop87Dneptune,
};

const linhasNaNFiltradas = {};
const planetas = {};
for (const [id, serie] of Object.entries(SERIES_VSOP)) {
  linhasNaNFiltradas[`vsop87D${id}`] = contarLinhasInvalidas(serie);
  planetas[id] = new planetposition.Planet(sanitizeVsopSeries(serie));
}
const lua = new elp.Moon(elpMppDe);

/** Esférico eclíptico (rad, rad, AU) → cartesiano eclíptico J2000. */
function esfericoParaCartesiano(lonRad, latRad, rangeAU) {
  const cosLat = Math.cos(latRad);
  return [
    rangeAU * cosLat * Math.cos(lonRad),
    rangeAU * cosLat * Math.sin(lonRad),
    rangeAU * Math.sin(latRad),
  ];
}

/** Posição da teoria direta em Float64, AU, eclíptica J2000. */
function posicaoTeoria(id, jdTdb) {
  if (id === 'pluto') {
    const { lon, lat, range } = pluto.heliocentric(jdTdb);
    return esfericoParaCartesiano(lon, lat, range);
  }
  if (id === 'moon') {
    const { x, y, z } = lua.positionXYZ(jdTdb);
    return [x / AU_KM, y / AU_KM, z / AU_KM];
  }
  const { lon, lat, range } = planetas[id].position2000(jdTdb);
  return esfericoParaCartesiano(lon, lat, range);
}

// ------------------------------------------------------------
// Configuração por corpo. `centro` usa os MESMOS ids de corpo do resto
// do sistema ('sun'/'earth', nunca "sol"/"terra" — vocabulário duplo de
// id é exatamente o bug que a regra M6 existe para impedir).
// `semente` é FIXA por corpo: o gate é reproduzível bit a bit.
// ------------------------------------------------------------
const CORPOS = [
  // passo 4 e não 6: cicatriz 2 do cabeçalho (periélio de Mercúrio).
  { id: 'mercury', teoria: 'VSOP87D', centro: 'sun', passoDias: 4, orcamentoErroAu: 5e-5, semente: 101 },
  { id: 'venus', teoria: 'VSOP87D', centro: 'sun', passoDias: 12, orcamentoErroAu: 5e-5, semente: 102 },
  { id: 'earth', teoria: 'VSOP87D', centro: 'sun', passoDias: 12, orcamentoErroAu: 5e-5, semente: 103 },
  { id: 'mars', teoria: 'VSOP87D', centro: 'sun', passoDias: 24, orcamentoErroAu: 5e-5, semente: 104 },
  { id: 'jupiter', teoria: 'VSOP87D', centro: 'sun', passoDias: 48, orcamentoErroAu: 1e-4, semente: 105 },
  { id: 'saturn', teoria: 'VSOP87D', centro: 'sun', passoDias: 48, orcamentoErroAu: 1e-4, semente: 106 },
  { id: 'uranus', teoria: 'VSOP87D', centro: 'sun', passoDias: 48, orcamentoErroAu: 1e-4, semente: 107 },
  { id: 'neptune', teoria: 'VSOP87D', centro: 'sun', passoDias: 48, orcamentoErroAu: 1e-4, semente: 108 },
  { id: 'pluto', teoria: 'Pluto-Meeus', centro: 'sun', passoDias: 48, orcamentoErroAu: 1e-4, semente: 109 },
  { id: 'moon', teoria: 'ELP-MPP02-trunc', centro: 'earth', passoDias: 3, orcamentoErroAu: 5e-6, semente: 110 },
];

/**
 * PRNG mulberry32 — determinístico, semente de 32 bits. O gate precisa
 * dos MESMOS instantes a cada regeneração para o erroMedidoAu do
 * manifest ser comparável entre commits.
 */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------
// Amostragem. n = ceil(janela/passo) + 1: o último nó pode passar até
// um passo além de JD_FIM (a janela VÁLIDA continua JD_INICIO..JD_FIM;
// o nó extra só garante que o último segmento Hermite exista inteiro).
// Toda teoria aqui aguenta a folga: VSOP até 6000, Pluto-Meeus até
// 2099, ELP até 3000.
// ------------------------------------------------------------
const tabelas = [];
let totalFloats = 0;
for (const corpo of CORPOS) {
  const n = Math.ceil((JD_FIM - JD_INICIO) / corpo.passoDias) + 1;
  const dados = new Float32Array(n * 6);
  for (let i = 0; i < n; i++) {
    const jd = JD_INICIO + i * corpo.passoDias;
    const p = posicaoTeoria(corpo.id, jd);
    const pAntes = posicaoTeoria(corpo.id, jd - 0.01);
    const pDepois = posicaoTeoria(corpo.id, jd + 0.01);
    for (let k = 0; k < 3; k++) {
      dados[i * 6 + k] = p[k];
      dados[i * 6 + 3 + k] = (pDepois[k] - pAntes[k]) / 0.02;
    }
  }
  tabelas.push({ corpo, n, dados, offsetFloats: totalFloats });
  totalFloats += n * 6;
}

// ------------------------------------------------------------
// Auto-gate: Hermite cúbica da tabela Float32 vs teoria direta.
// ------------------------------------------------------------
const AMOSTRAS_GATE = 200;
for (const tabela of tabelas) {
  const { corpo, n, dados } = tabela;
  const h = corpo.passoDias;
  const aleatorio = mulberry32(corpo.semente);
  let pior = 0;
  for (let s = 0; s < AMOSTRAS_GATE; s++) {
    const jd = JD_INICIO + aleatorio() * (JD_FIM - JD_INICIO);
    const i = Math.min(Math.floor((jd - JD_INICIO) / h), n - 2);
    const t = (jd - (JD_INICIO + i * h)) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    const exato = posicaoTeoria(corpo.id, jd);
    let erro2 = 0;
    for (let k = 0; k < 3; k++) {
      const p0 = dados[i * 6 + k];
      const v0 = dados[i * 6 + 3 + k];
      const p1 = dados[(i + 1) * 6 + k];
      const v1 = dados[(i + 1) * 6 + 3 + k];
      const valor = h00 * p0 + h10 * h * v0 + h01 * p1 + h11 * h * v1;
      erro2 += (valor - exato[k]) ** 2;
    }
    pior = Math.max(pior, Math.sqrt(erro2));
  }
  tabela.erroMedidoAu = pior;
  if (pior > corpo.orcamentoErroAu) {
    throw new Error(
      `Gate de interpolação estourou para ${corpo.id}: erro medido ` +
        `${pior.toExponential(3)} AU > orçamento ${corpo.orcamentoErroAu} AU ` +
        `(passo ${h} d). Não afrouxe o orçamento — diminua o passo.`
    );
  }
}

// ------------------------------------------------------------
// Escrita: .bin único + manifest com offsets, gate e proveniência.
// ------------------------------------------------------------
const binario = new Float32Array(totalFloats);
for (const { dados, offsetFloats } of tabelas) {
  binario.set(dados, offsetFloats);
}
const bytes = Buffer.from(binario.buffer);
const sha256 = createHash('sha256').update(bytes).digest('hex');

const versaoAstronomia = JSON.parse(
  readFileSync(
    path.join(rootDirectory, 'node_modules', 'astronomia', 'package.json'),
    'utf8'
  )
).version;

const manifest = {
  formato: 'ef1',
  frame: 'ecliptica-J2000',
  escalaTempo: 'TDB',
  unidades: { posicao: 'AU', velocidade: 'AU/dia' },
  layout: '[x,y,z,vx,vy,vz] Float32 × n por corpo, corpos concatenados',
  janela: {
    jdInicio: JD_INICIO,
    jdFim: JD_FIM,
    isoInicio: ISO_INICIO,
    isoFim: ISO_FIM,
  },
  corpos: Object.fromEntries(
    tabelas.map(({ corpo, n, offsetFloats, erroMedidoAu }) => [
      corpo.id,
      {
        teoria: corpo.teoria,
        centro: corpo.centro,
        passoDias: corpo.passoDias,
        n,
        offsetFloats,
        orcamentoErroAu: corpo.orcamentoErroAu,
        erroMedidoAu,
        amostrasGate: AMOSTRAS_GATE,
        sementeGate: corpo.semente,
      },
    ])
  ),
  proveniencia: {
    pacote: `astronomia@${versaoAstronomia}`,
    teorias: {
      planetas: 'VSOP87D (position2000, heliocêntrico esférico → cartesiano)',
      pluto: 'Pluto-Meeus (Meeus cap. 37, heliocêntrico)',
      moon: 'ELP-MPP02-trunc (geocêntrica, km → AU com AU_KM=149597870.7)',
    },
    linhasNaNFiltradas,
    velocidade: 'diferença central ±0,01 dia sobre a teoria',
  },
  sha256,
};

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(path.join(outputDirectory, 'efemerides.bin'), bytes);
writeFileSync(
  path.join(outputDirectory, 'efemerides_meta.json'),
  `${JSON.stringify(manifest, null, 2)}\n`
);

for (const { corpo, n, erroMedidoAu } of tabelas) {
  console.log(
    `${corpo.id.padEnd(8)} ${corpo.teoria.padEnd(16)} passo ${String(
      corpo.passoDias
    ).padStart(2)} d  n=${String(n).padStart(5)}  erro ${erroMedidoAu
      .toExponential(2)
      .padStart(8)} ≤ ${corpo.orcamentoErroAu.toExponential(0)} AU`
  );
}
console.log(
  `\nefemerides.bin: ${(bytes.length / 1048576).toFixed(2)} MB ` +
    `(${totalFloats} floats, ${tabelas.length} corpos, ${ISO_INICIO} → ${ISO_FIM}).\n` +
    `Linhas NaN filtradas: ${Object.entries(linhasNaNFiltradas)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ') || 'nenhuma'}.\n` +
    `Lembrete: rode \`npm run data:pack\` para gerar o .gz irmão.`
);
