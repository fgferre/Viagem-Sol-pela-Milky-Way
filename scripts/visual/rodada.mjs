// Captura de rodada: as duas vistas que correspondem às fotos de referência
// reais (face-on e edge-on), mais a linha de números que vai para o git.
//
// As imagens ficam em capturas/ (fora do git — AGENTS.md regra 5). O que se
// versiona é docs/reference/EVOLUCAO.md: uma linha por rodada, diffável, que
// responde "aproximou ou afastou?" com número em vez de impressão.
//
//   node scripts/visual/rodada.mjs 3 "soma de populações"
//
// Requer o vite dev em 127.0.0.1:5173. Sobe UMA instância de Chrome e a mata
// no fim, inclusive se der erro — GPU headless esquecida viva é caro.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = resolve(ROOT, 'capturas');
const LEDGER = resolve(ROOT, 'docs/reference/EVOLUCAO.md');
const METRIC = resolve(ROOT, 'scripts/visual/measure-similarity.html');
const APP = process.env.APP_URL || 'http://127.0.0.1:5173';

// As duas vistas espelham docs/reference/gaia-2025-{face-on,edge-on}-5k.jpg
const VIEWS = [
  { nome: 'faceon', t: 170 },
  { nome: 'edgeon', t: 158 },
];

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].find((p) => existsSync(p));
if (!CHROME) throw new Error('Chrome não encontrado');

const round = String(process.argv[2] || '').padStart(2, '0');
const nota = process.argv.slice(3).join(' ') || '';
if (!round || round === '00') throw new Error('uso: node scripts/visual/rodada.mjs <n> "nota"');

const PROFILE = resolve(OUT, '.chrome-profile');
mkdirSync(OUT, { recursive: true });

// Perfil NOVO por invocação: com user-data-dir compartilhado o Chrome entrega
// a linha de comando ao processo já vivo e a segunda captura sai idêntica à
// primeira, silenciosamente. Custa alguns MB de disco e vale a corretude.
let seq = 0;
function chrome(args) {
  const r = spawnSync(CHROME, [
    '--headless=new', '--enable-gpu', '--use-gl=angle', '--use-angle=d3d11',
    '--hide-scrollbars', '--no-first-run', `--user-data-dir=${PROFILE}-${seq++}`,
    ...args,
  ], { encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
  return r.stdout || '';
}

try {
  // O dev server já caiu no meio de uma rodada e o Chrome fotografou a página
  // de ERR_CONNECTION_REFUSED: as duas vistas saíram idênticas e a métrica
  // devolveu números plausíveis para uma imagem que não era a galáxia. Um
  // ledger só vale se ele grita quando a medida é lixo.
  const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
  if (!/Mar de Estrelas|<div id="root"/.test(ping)) {
    throw new Error(`o app não respondeu em ${APP} — suba o dev server antes`);
  }

  for (const v of VIEWS) {
    // shot=2 = modo foto SEM HUD: botões e rótulos entrariam no cálculo
    chrome([
      '--window-size=900,900', '--virtual-time-budget=16000',
      `--screenshot=${resolve(OUT, `rodada_${round}_${v.nome}.png`)}`,
      `${APP}/?t=${v.t}&shot=2`,
    ]);
    process.stdout.write(`rodada_${round}_${v.nome}.png\n`);
  }

  // segunda rede: face-on e edge-on não podem sair iguais. Se saírem, o
  // Chrome entregou a linha de comando a um processo vivo e não navegou.
  const [a, b] = VIEWS.map((v) => readFileSync(resolve(OUT, `rodada_${round}_${v.nome}.png`)));
  if (a.length === b.length && a.equals(b)) {
    throw new Error('as duas vistas saíram idênticas — a navegação não aconteceu');
  }

  const medir = (png, extra = '') => {
    const dom = chrome([
      '--allow-file-access-from-files', '--window-size=900,900',
      '--virtual-time-budget=14000', '--dump-dom',
      `file:///${METRIC.replace(/\\/g, '/')}?a=${png.replace(/\\/g, '/')}${extra}`,
    ]);
    const bloco = dom.match(/\{\s*"(harmonicError|edgeError)"[\s\S]*?\n\}/);
    if (!bloco) throw new Error('métrica não devolveu JSON — o dev server está de pé?');
    return JSON.parse(bloco[0].replace(/<[^>]*>/g, ''));
  };
  const m = medir(resolve(OUT, `rodada_${round}_faceon.png`));
  const e = medir(resolve(OUT, `rodada_${round}_edgeon.png`), '&mode=edge');
  const faixa = (a) => {
    // mesma faixa do discMean: 0,25–1,05 R90, em anéis de 1,5·R90/24
    const s = a.filter((_, i) => { const r = ((i + 0.5) / 24) * 1.5; return r >= 0.25 && r <= 1.05; });
    return s.reduce((x, y) => x + y, 0) / s.length;
  };
  const linha = `| ${round} | ${m.harmonicError.toFixed(4)} | ${m.ours.discMean.toFixed(4)} | `
    + `${m.ours.grain.toFixed(4)} | ${faixa(m.ours.purp).toFixed(4)} | ${nota} |`;

  const alvos = `| — | 0 | ${m.ref.discMean.toFixed(4)} | ${m.ref.grain.toFixed(4)} | `
    + `${faixa(m.ref.purp).toFixed(4)} | **alvo (foto real)** |`;

  let doc = existsSync(LEDGER) ? readFileSync(LEDGER, 'utf8') : `# Evolução por rodada

Uma linha por rodada de implementação, medida contra as fotos reais em
\`gaia-2025-face-on-5k.jpg\` pela métrica de \`measure-similarity.html\`.
Gerado por \`node scripts/visual/rodada.mjs <n> "nota"\`.

As capturas ficam em \`capturas/\` e **não** são versionadas (AGENTS.md regra 5):
o que responde "aproximou ou afastou" é o número, não o PNG. Para a revisão
final, as imagens locais e esta tabela se leem juntas.

\`harmonicError\` menor é melhor; as outras três buscam o alvo.

| rodada | harmonicError | discMean | grain | purp | o que mudou |
|---|---|---|---|---|---|
${alvos}
`;
  // a linha face-on entra no FIM da PRIMEIRA tabela — não no fim do
  // arquivo, que depois da rodada 12 é a tabela edge-on
  if (!doc.includes(`\n| ${round} |`)) {
    const cut = doc.indexOf('\n## Edge-on');
    doc = cut < 0
      ? doc.trimEnd() + '\n' + linha + '\n'
      : doc.slice(0, cut).trimEnd() + '\n' + linha + '\n' + doc.slice(cut);
  }

  // Edge-on: a física vertical tem gate próprio (espessura, faixa escura,
  // warp, razão axial, cor por altura) — modos de falha disjuntos da face-on.
  const linhaE = `| ${round} | ${e.edgeError.toFixed(4)} | ${e.ours.thickRatio.toFixed(4)} | `
    + `${e.ours.axialRatio.toFixed(4)} | ${e.ours.laneDepth.toFixed(4)} | `
    + `${e.ours.warpAmp.toFixed(4)} | ${nota} |`;
  const alvosE = `| — | 0 | ${e.ref.thickRatio.toFixed(4)} | ${e.ref.axialRatio.toFixed(4)} | `
    + `${e.ref.laneDepth.toFixed(4)} | ${e.ref.warpAmp.toFixed(4)} | **alvo (foto real)** |`;
  if (!doc.includes('## Edge-on')) {
    doc = doc.trimEnd() + `

## Edge-on

\`edgeError\` menor é melhor (medida \`?mode=edge\` contra
\`gaia-2025-edge-on-5k.jpg\`); as outras buscam o alvo.

| rodada | edgeError | thickRatio | axialRatio | laneDepth | warpAmp | o que mudou |
|---|---|---|---|---|---|---|
${alvosE}
`;
  }
  if (!doc.match(new RegExp(`## Edge-on[\\s\\S]*\\n\\| ${round} \\|`))) {
    doc = doc.trimEnd() + '\n' + linhaE + '\n';
  }
  writeFileSync(LEDGER, doc);
  process.stdout.write('\n' + linha + '\n' + alvos + '\n' + linhaE + '\n' + alvosE + '\n');
} finally {
  // mata só o que este script subiu — casa pelo user-data-dir
  if (process.platform === 'win32') {
    spawn('powershell', ['-NoProfile', '-Command',
      `Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | ` +
      `Where-Object { $_.CommandLine -like '*${PROFILE.replace(/\\/g, '\\\\')}*' } | ` +
      `ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`,
    ], { stdio: 'ignore', detached: true }).unref();
  }
}
