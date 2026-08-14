#!/usr/bin/env node
// Reprova prosa bagunçada. Uma regra nova de documentação só vale se
// virar linha aqui. Exceções nascem junto: módulos vendorizados citam
// documentos do doador que esta casa nunca teve.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = join(import.meta.dirname, '..');

const DOCS_VIVOS = [
  'AGENTS.md',
  'CLAUDE.md',
  'Claude.md',
  'README.md',
  'docs/NORTE.md',
  'docs/PENDENCIAS.md',
  'docs/LEI-DA-ESTRELA.md',
  'docs/PLANO-ATLAS.md',
  'docs/GALACTIC_DATA_FOUNDATION.md',
  'docs/RENDERER_CARTOGRAPHY.md',
  'docs/reference/ASSETS.md',
  'docs/reference/EVOLUCAO.md',
  'docs/reference/VISUAL_TARGETS.md',
  'docs/reference/referencias-corpos/LEIA-ME.md',
];

const MORTOS = [
  'RETOMADA.md',
  'ESCALA-HONESTA.md',
  'DATA_ROADMAP.md',
  'ATLAS-ANTIPADROES.md',
  'ATLAS-LICENCAS.md',
  'ATLAS-CHECKLIST-PRE-FUSAO.md',
  'ECLIPSES-F2C.md',
];

const EXCECOES_PREFIXO = [
  'src/three/world/sol/',
  'scripts/docs-check.mjs',
];

function andar(dir, acc = []) {
  for (const nome of readdirSync(dir)) {
    if (nome === 'node_modules' || nome === 'dist' || nome === '.git' || nome === 'capturas') continue;
    const p = join(dir, nome);
    const st = statSync(p);
    if (st.isDirectory()) andar(p, acc);
    else acc.push(p);
  }
  return acc;
}

function ler(rel) {
  return readFileSync(join(RAIZ, rel), 'utf8');
}

function existe(rel) {
  try {
    statSync(join(RAIZ, rel));
    return true;
  } catch {
    return false;
  }
}

const erros = [];
const avisos = [];

for (const rel of DOCS_VIVOS) {
  if (!existe(rel)) {
    erros.push(`documento vivo ausente: ${rel}`);
    continue;
  }
  const texto = ler(rel);
  const linhas = texto.split('\n');
  linhas.forEach((linha, i) => {
    if (rel === 'AGENTS.md' && linha.includes('docs-antes-da-reforma')) return;
    for (const morto of MORTOS) {
      if (linha.includes(morto) && !linha.includes('docs-antes-da-reforma')) {
        erros.push(`${rel}:${i + 1} cita documento aposentado ${morto}`);
      }
    }
    const ptr = linha.match(/docs\/[\w./-]+\.md:\d+/);
    if (ptr && rel !== 'docs/reference/EVOLUCAO.md') {
      erros.push(`${rel}:${i + 1} ponteiro por linha (${ptr[0]}) — cite a peça`);
    }
  });
}

const fonte = andar(join(RAIZ, 'src')).concat(andar(join(RAIZ, 'scripts')));
const docRe = /docs\/[\w./-]+\.md/g;
for (const abs of fonte) {
  const rel = relative(RAIZ, abs);
  if (EXCECOES_PREFIXO.some((p) => rel.startsWith(p))) continue;
  const texto = readFileSync(abs, 'utf8');
  const linhas = texto.split('\n');
  linhas.forEach((linha, i) => {
    for (const morto of MORTOS) {
      if (linha.includes(morto)) {
        erros.push(`${rel}:${i + 1} cita documento aposentado ${morto}`);
      }
    }
    let m;
    const re = new RegExp(docRe.source, 'g');
    while ((m = re.exec(linha))) {
      const citado = m[0];
      if (!existe(citado) && !MORTOS.some((x) => citado.endsWith(x))) {
        avisos.push(`${rel}:${i + 1} cita ${citado} que não está no disco`);
      }
    }
  });
}

const n = DOCS_VIVOS.filter((d) => existe(d)).length;
if (n < 8) erros.push(`esperava ≥8 documentos vivos, achei ${n}`);

if (avisos.length) {
  console.warn('avisos:');
  for (const a of avisos) console.warn('  ', a);
}
if (erros.length) {
  console.error('docs-check falhou:');
  for (const e of erros) console.error('  ', e);
  process.exit(1);
}
console.log(`docs-check ok — ${n} documentos vivos, ${fonte.length} fontes varridas`);
