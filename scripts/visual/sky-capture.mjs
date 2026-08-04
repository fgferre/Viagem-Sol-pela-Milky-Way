// Captura as 6 faces do cubo do céu a partir do Sol (juiz da vista
// interna). Cada face: ?pos=0,0,0&look=<dir>&fov=90&nosun=1&shot=2 em
// janela quadrada — o FreeRoam canoniza a orientação (yaw/pitch no
// referencial galáctico + up galáctico), e o harness replica essa
// matemática exata para costurar.
import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'sky');
mkdirSync(OUT, { recursive: true });
const APP = 'http://127.0.0.1:5173';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

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

let seq = Date.now() % 100000;
for (const f of FACES) {
  const look = f.dir.map((v) => v.toFixed(9)).join(',');
  // mesma rede do rodada.mjs: face velha no lugar costura um céu que não é
  // o deste código e o skyError sai plausível
  const png = resolve(OUT, `face_${f.nome}.png`);
  if (existsSync(png)) rmSync(png);
  const r = spawnSync(CHROME, [
    '--headless=new', '--enable-gpu', '--use-gl=angle', '--use-angle=d3d11',
    '--hide-scrollbars', '--no-first-run',
    `--user-data-dir=${resolve(OUT, '.p' + seq++)}`,
    '--window-size=1440,1440', '--virtual-time-budget=16000',
    `--screenshot=${png}`,
    // nohero=1: os clarões das estrelas-herói são camada CINEMATOGRÁFICA;
    // com eles, Sirius/αCen/Capella viram picos espúrios no perfil da faixa.
    // kneeamt=1&knee=0.02&exp=4.4: REVELAÇÃO fotométrica do gate (não é o
    // look do app!) — o panorama ESO é astrofoto com stretch asinh a ~3% do
    // pico; medir sem o stretch equivalente compara curva de tom, não céu
    // (provado 2026-08-03: bulgeAnti 19,1→5,52 com alvo 5,57; zero clipping)
    `${APP}/?pos=0,0,0&look=${look}&fov=90&nosun=1&nohero=1&kneeamt=1&knee=0.02&exp=4.4&shot=2`,
  ], { encoding: 'utf8', timeout: 120000 });
  if (r.error) throw new Error(`Chrome não executou: ${r.error.message}`);
  if (r.status !== 0) {
    throw new Error(`face ${f.nome}: Chrome saiu com status ${r.status}: ${(r.stderr || '').trim().slice(-400)}`);
  }
  if (!existsSync(png)) throw new Error(`face ${f.nome}: Chrome não gravou ${png}`);
  console.log(`face_${f.nome}.png ok`);
}
