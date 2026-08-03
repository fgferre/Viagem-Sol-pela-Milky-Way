// Captura as 6 faces do cubo do céu a partir do Sol (juiz da vista
// interna). Cada face: ?pos=0,0,0&look=<dir>&fov=90&nosun=1&shot=2 em
// janela quadrada — o FreeRoam canoniza a orientação (yaw/pitch no
// referencial galáctico + up galáctico), e o harness replica essa
// matemática exata para costurar.
import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
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
  const r = spawnSync(CHROME, [
    '--headless=new', '--enable-gpu', '--use-gl=angle', '--use-angle=d3d11',
    '--hide-scrollbars', '--no-first-run',
    `--user-data-dir=${resolve(OUT, '.p' + seq++)}`,
    '--window-size=1440,1440', '--virtual-time-budget=16000',
    `--screenshot=${resolve(OUT, `face_${f.nome}.png`)}`,
    `${APP}/?pos=0,0,0&look=${look}&fov=90&nosun=1&shot=2`,
  ], { encoding: 'utf8', timeout: 120000 });
  console.log(`face_${f.nome}.png exit=${r.status}`);
}
