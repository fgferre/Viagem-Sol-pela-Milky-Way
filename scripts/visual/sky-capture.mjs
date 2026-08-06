// Gate da vista interna: captura as 6 faces do cubo do céu a partir do
// Sol, costura, mede contra o panorama ESO e imprime os termos.
//
//   node scripts/visual/sky-capture.mjs                 # baseline
//   node scripts/visual/sky-capture.mjs nowrap "&nowrap=1"   # ablação
//   node scripts/visual/sky-capture.mjs --perfil        # + perfil por longitude
//
// Cada face: ?pos=0,0,0&look=<dir>&fov=90&shot=2 em janela quadrada — o
// FreeRoam canoniza a orientação (yaw/pitch no referencial galáctico +
// up galáctico), e sky-measure.html replica essa matemática para costurar.
//
// A MEDIÇÃO mora aqui de propósito. Capturar e medir eram dois comandos,
// e o segundo (um Chrome com file:// e --dump-dom) foi reescrito do zero
// em pelo menos duas rodadas porque vivia no scratchpad. Um comando só.
import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, rmSync, readFileSync, openSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MEASURE = resolve(ROOT, 'scripts/visual/sky-measure.html');
const REF = resolve(ROOT, 'docs/reference/eso-gigagalaxy-panorama.jpg');
const APP = process.env.APP_URL || 'http://127.0.0.1:5173';
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].find((p) => existsSync(p));
if (!CHROME) throw new Error('Chrome não encontrado');

const args = process.argv.slice(2).filter((a) => a !== '--perfil');
const comPerfil = process.argv.includes('--perfil');
const tag = args[0] || 'base';
const extra = args[1] || '';
const OUT = resolve(process.cwd(), tag === 'base' ? 'sky' : `sky_${tag}`);
mkdirSync(OUT, { recursive: true });

// base galáctica (idêntica a galaxy.ts)
const N = [-0.867666149, -0.1980763734, 0.4559837762]; // polo norte
const DIRGC = [-0.0548755604, -0.8734370902, -0.4838350155]; // Sol→centro
const A = DIRGC.map((v) => -v); // anticentro (FRAME_A do rig)
const B = [
  N[1] * A[2] - N[2] * A[1],
  N[2] * A[0] - N[0] * A[2],
  N[0] * A[1] - N[1] * A[0],
]; // cross(N, A) = FRAME_B

const FACES = [
  { nome: 'gc', dir: DIRGC }, // l=0
  { nome: 'anti', dir: A }, // l=180
  { nome: 'l90', dir: B.map((v) => -v) }, // l=90 = -FRAME_B
  { nome: 'l270', dir: B }, // l=270
  { nome: 'npole', dir: N }, // b=+90
  { nome: 'spole', dir: N.map((v) => -v) }, // b=-90
];

const chrome = (extraArgs, saida) => {
  if (saida && existsSync(saida)) rmSync(saida);
  const r = spawnSync(CHROME, [
    '--headless=new', '--enable-gpu', '--use-gl=angle', '--use-angle=d3d11',
    '--hide-scrollbars', '--no-first-run', ...extraArgs,
  ], { encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw new Error(`Chrome não executou: ${r.error.message}`);
  if (r.status !== 0) {
    throw new Error(`Chrome saiu com status ${r.status}: ${(r.stderr || '').trim().slice(-400)}`);
  }
  if (saida && !existsSync(saida)) throw new Error(`Chrome não gravou ${saida}`);
  return r;
};

const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
if (!/<div id="root"/.test(ping)) throw new Error(`o app não respondeu em ${APP} — suba o dev server`);

let seq = 0;
for (const f of FACES) {
  const png = resolve(OUT, `face_${f.nome}.png`);
  chrome([
    `--user-data-dir=${OUT}/.p${seq++}`,
    '--window-size=1440,1440', '--virtual-time-budget=16000', `--screenshot=${png}`,
    // nohero=1: os clarões das estrelas-herói são camada CINEMATOGRÁFICA;
    // com eles, Sirius/αCen/Capella viram picos espúrios no perfil da faixa.
    // kneeamt=1&knee=0.02&exp=4.4: REVELAÇÃO fotométrica do gate (não é o
    // look do app!) — o panorama ESO é astrofoto com stretch asinh a ~3% do
    // pico; medir sem o stretch equivalente compara curva de tom, não céu
    // (provado 2026-08-03: bulgeAnti 19,1→5,52 com alvo 5,57; zero clipping)
    `${APP}/?pos=0,0,0&look=${f.dir.map((v) => v.toFixed(9)).join(',')}` +
      `&fov=90&nosun=1&nohero=1&kneeamt=1&knee=0.02&exp=4.4&shot=2${extra}`,
  ], png);
  process.stdout.write(`face_${f.nome}.png ok\n`);
}

const dom = resolve(OUT, 'dom.html');
if (existsSync(dom)) rmSync(dom);
spawnSync(CHROME, [
  '--headless=new', '--enable-gpu', '--use-gl=angle', '--use-angle=d3d11',
  '--allow-file-access-from-files', '--no-first-run', `--user-data-dir=${OUT}/.pm`,
  '--window-size=900,900', '--virtual-time-budget=25000', '--dump-dom',
  `file:///${MEASURE.replace(/\\/g, '/')}?dir=${OUT.replace(/\\/g, '/')}` +
    `&ref=${REF.replace(/\\/g, '/')}`,
], { timeout: 180000, stdio: ['ignore', openSync(dom, 'w'), 'ignore'] });

const bloco = readFileSync(dom, 'utf8').match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
if (!bloco) throw new Error('a métrica não devolveu resultado — confira o dev server e a referência');
const j = JSON.parse(bloco[1].replace(/&quot;/g, '"'));
const O = j.ours;
const R = j.ref;
const curva = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;
const media = (a) => a.reduce((s, v) => s + v, 0) / a.length;
// os mesmos seis termos que somam o skyError em sky-measure.html
const termos = {
  espessura: curva(O.thick, R.thick) / media(R.thick),
  perfil: curva(O.nprof, R.nprof),
  cor: Math.abs(O.colour - R.colour),
  purpura: Math.abs(O.purp - R.purp),
  // a fenda é comparada bin a bin desde a rodada 37: o escalar
  // (média das profundidades) era cego ao LUGAR do vale e cancelava
  // uma anticorrelação quase perfeita — ver o cabeçalho do sky-measure
  fenda: curva(O.riftProf, R.riftProf),
  bojoAnti: Math.abs(O.bulgeAnti - R.bulgeAnti) / R.bulgeAnti,
};
const total = Object.values(termos).reduce((a, b) => a + b, 0);
console.log(`\nskyError ${j.skyError}  (${tag}${extra ? ' ' + extra : ''})`);
for (const [k, v] of Object.entries(termos).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(10)} ${v.toFixed(4)}  ${((100 * v) / total).toFixed(0)}%`);
}
console.log(
  `  bulgeAnti ${O.bulgeAnti} (alvo ${R.bulgeAnti}) · rift ${O.rift} (${R.rift}) · ` +
    `colour ${O.colour} (${R.colour}) · purp ${O.purp} (${R.purp})`
);

if (comPerfil) {
  // o perfil é NORMALIZADO pela própria média: comparação de FORMA.
  // Ablação redistribui — ler bin a bin, nunca só o agregado.
  const n = O.nprof.length;
  const lon = (i) => Math.round(-180 + (360 * (i + 0.5)) / n);
  console.log('\n  l      nosso    ref     dif');
  for (let i = 0; i < n; i++) {
    const d = O.nprof[i] - R.nprof[i];
    const barra = (d > 0 ? '+' : '-').repeat(Math.min(20, Math.round(Math.abs(d) * 10)));
    console.log(
      `  ${String(lon(i)).padStart(5)} ${O.nprof[i].toFixed(2).padStart(7)}` +
        ` ${R.nprof[i].toFixed(2).padStart(7)} ${(d > 0 ? '+' : '') + d.toFixed(2)}  ${barra}`
    );
  }
  // a fenda por longitude, com a latitude do vale ao lado. b = ±10,1°
  // significa que o mínimo caiu na BORDA da busca — ou seja, vale nenhum.
  const lr = [];
  for (let i = 0; i < n; i++) {
    const l = ((i + 0.5) / n) * 360 - 180;
    if (l >= -35 && l <= 45) lr.push(Math.round(l));
  }
  console.log('\n  l    fenda   ref     dif   |   b do vale (nosso/ref)');
  for (let k = 0; k < lr.length; k++) {
    const d = O.riftProf[k] - R.riftProf[k];
    console.log(
      `  ${String(lr[k]).padStart(5)} ${O.riftProf[k].toFixed(3).padStart(7)}` +
        ` ${R.riftProf[k].toFixed(3).padStart(7)} ${(d > 0 ? '+' : '') + d.toFixed(3)}` +
        `   |  ${O.riftB[k].toFixed(1).padStart(6)} ${R.riftB[k].toFixed(1).padStart(6)}`
    );
  }
}
