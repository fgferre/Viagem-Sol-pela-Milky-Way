// Serve: dono — o custo dos testes tem teto e cada juiz declara a quem serve (item 99)
//
// Censo dos juízes. Cada teste e cada juiz responde "a quem sirvo":
// decisão do dono, lei física, ou chão de regressão. Quem não responde
// aparece como SEM DONO — nesta fatia a amostra com Serve é cobrada;
// o resto se classifica nas fatias seguintes, e ninguém morre em silêncio.
//
//   node scripts/censo-dos-juizes.mjs
//
// O teto da rodada visual é o do item 57 (~15 min). Juiz novo declara
// Serve e Custo, ou aposenta/funde alguém.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TETO_DA_RODADA_MIN = 15;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** dono = decisão dele; lei = física/contrato; chão = regressão. */
export const SERVE_RE = /^\/\/ Serve:\s*(dono|lei|chão)\s+[—–-]\s+\S+/m;

const FERRAMENTAS = new Set(['diff-pixel.mjs', 'gpu-profile.mjs']);
const HARNESS = new Set(['chrome.mjs']);

export const AMOSTRA_COM_SERVE = [
  'src/three/atlasConfig.test.ts',
  'src/three/cadastroDeRepresentacoes.test.ts',
  'src/three/simbolosProibidos.test.ts',
  'scripts/visual/chrome.test.mjs',
  'scripts/visual/atlas-smoke.mjs',
  'scripts/visual/a11y.mjs',
  'scripts/censo-dos-juizes.test.mjs',
];

function andar(dir, acc = []) {
  for (const nome of readdirSync(dir)) {
    if (nome === 'node_modules' || nome === 'dist' || nome === '.git') continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) andar(caminho, acc);
    else acc.push(caminho);
  }
  return acc;
}

export function lerServe(fonte) {
  const m = fonte.match(SERVE_RE);
  if (!m) return null;
  return { classe: m[1], linha: m[0].slice(3) };
}

function contarCasos(fonte) {
  const m = fonte.match(/(?:^|\n)\s*it\s*\(/g);
  return m ? m.length : 0;
}

function rel(caminho) {
  return relative(ROOT, caminho).replaceAll('\\', '/');
}

function entradaDe(caminho) {
  const fonte = readFileSync(caminho, 'utf8');
  const serve = lerServe(fonte);
  const r = rel(caminho);
  const base = r.split('/').pop();
  let papel = 'teste';
  if (r.startsWith('scripts/visual/') && r.endsWith('.mjs') && !r.endsWith('.test.mjs')) {
    if (HARNESS.has(base)) papel = 'harness';
    else if (FERRAMENTAS.has(base)) papel = 'ferramenta';
    else papel = 'juiz';
  }
  const custo = fonte.match(/^\/\/ Custo:\s*(.+)$/m)?.[1]?.trim() ?? null;
  return {
    arquivo: r,
    papel,
    casos: r.endsWith('.test.ts') || r.endsWith('.test.mjs') ? contarCasos(fonte) : 0,
    serve: serve ? serve.classe : null,
    frase: serve ? serve.linha : null,
    custo,
  };
}

export function censo() {
  const todos = andar(join(ROOT, 'src')).concat(andar(join(ROOT, 'scripts')));
  const testes = todos
    .filter((c) => c.endsWith('.test.ts') || c.endsWith('.test.mjs'))
    .map(entradaDe)
    .sort((a, b) => a.arquivo.localeCompare(b.arquivo));
  const visuais = todos
    .filter((c) => {
      const r = rel(c);
      return r.startsWith('scripts/visual/') && r.endsWith('.mjs') && !r.endsWith('.test.mjs');
    })
    .map(entradaDe)
    .sort((a, b) => a.arquivo.localeCompare(b.arquivo));
  return { testes, visuais };
}

export function amostraSemServe(lista) {
  return AMOSTRA_COM_SERVE.filter((a) => {
    const e = lista.find((x) => x.arquivo === a);
    return !e || !e.serve;
  });
}

function main() {
  const { testes, visuais } = censo();
  const casos = testes.reduce((n, t) => n + t.casos, 0);
  const testesCom = testes.filter((t) => t.serve).length;
  const juizes = visuais.filter((v) => v.papel === 'juiz');
  const juizesCom = juizes.filter((j) => j.serve).length;
  const amostraFura = amostraSemServe([...testes, ...visuais]);

  process.stdout.write(`Censo dos juízes (item 99) — teto da rodada visual: ${TETO_DA_RODADA_MIN} min\n`);
  process.stdout.write(`testes: ${testes.length} arquivos, ${casos} casos, ${testesCom} com Serve\n`);
  process.stdout.write(`juízes visuais: ${juizes.length}, ${juizesCom} com Serve\n`);
  process.stdout.write(`amostra sem Serve: ${amostraFura.length === 0 ? 'nenhuma' : amostraFura.join(', ')}\n`);
  const semDono = [...testes, ...juizes].filter((e) => !e.serve);
  process.stdout.write(`sem dono (fatias seguintes): ${semDono.length}\n`);
  if (amostraFura.length) process.exit(1);
}

const este = fileURLToPath(import.meta.url);
const chamado = process.argv[1] ? resolve(process.argv[1]) : '';
if (este === chamado) main();
