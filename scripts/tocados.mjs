// O portão rápido do commit (item 99, lei §12): testes dos arquivos
// tocados, mais os transversais que a fiação irmã não alcança.
//
//   node scripts/tocados.mjs
//
// O cadastro da luz e os símbolos proibidos vigiam o FONTE INTEIRO;
// um shader novo não tem `.test.ts` irmão que os dispare — foi assim
// que o item 70 deixou `pontoNaBorda.ts` fora do cadastro com a suíte
// "dos tocados" verde.

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', cwd: ROOT }).trim();
}

function tocados() {
  const vsHead = git(['diff', '--name-only', 'HEAD']);
  const outros = git(['ls-files', '--others', '--exclude-standard']);
  return [...new Set(`${vsHead}\n${outros}`.split('\n').map((s) => s.trim()).filter(Boolean))];
}

function irmao(arquivo) {
  if (arquivo.endsWith('.test.ts') || arquivo.endsWith('.test.mjs')) return arquivo;
  const candidatos = [];
  if (arquivo.endsWith('.ts')) candidatos.push(arquivo.replace(/\.ts$/, '.test.ts'));
  if (arquivo.endsWith('.tsx')) candidatos.push(arquivo.replace(/\.tsx$/, '.test.ts'));
  if (arquivo.endsWith('.mjs')) candidatos.push(arquivo.replace(/\.mjs$/, '.test.mjs'));
  return candidatos.find((c) => existsSync(resolve(ROOT, c))) ?? null;
}

function transversais(arquivo) {
  const out = [];
  if (
    arquivo.startsWith('src/three/shaders/')
    || arquivo.startsWith('src/three/world/')
    || arquivo.startsWith('src/three/core/')
    || arquivo === 'src/three/cadastroDeRepresentacoes.ts'
  ) {
    out.push('src/three/cadastroDeRepresentacoes.test.ts');
  }
  if (arquivo.startsWith('src/three/') || arquivo.startsWith('src/lib/')) {
    out.push('src/three/simbolosProibidos.test.ts');
  }
  if (
    arquivo === 'src/three/atlasConfig.ts'
    || arquivo.startsWith('src/components/HudDoAtlas')
  ) {
    out.push('src/three/atlasConfig.test.ts');
  }
  return out;
}

function noVitest(arquivo) {
  return arquivo.endsWith('.test.ts') || arquivo.endsWith('.test.mjs');
}

const testes = new Set();
for (const arquivo of tocados()) {
  const ir = irmao(arquivo);
  if (ir && noVitest(ir) && existsSync(resolve(ROOT, ir))) testes.add(ir);
  for (const t of transversais(arquivo)) {
    if (existsSync(resolve(ROOT, t))) testes.add(t);
  }
}

const lista = [...testes].sort();
if (lista.length === 0) {
  process.stdout.write('nenhum teste irmão dos arquivos tocados\n');
  process.exit(0);
}
process.stdout.write(`testes dos tocados (${lista.length}):\n${lista.map((t) => `  ${t}`).join('\n')}\n`);
const r = spawnSync('npx', ['vitest', 'run', ...lista], {
  cwd: ROOT,
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
