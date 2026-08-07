// Prova de que uma mudança NÃO mexeu na imagem: md5 das mesmas vistas antes
// e depois.
//
//   node scripts/visual/ab-identidade.mjs antes      # no HEAD, antes de editar
//   ...edita...
//   node scripts/visual/ab-identidade.mjs depois     # compara e dá o veredito
//   node scripts/visual/ab-identidade.mjs antes interno   # uma vista só
//
// POR QUE NÃO `--virtual-time-budget --screenshot`, que é como `rodada.mjs`
// captura: o orçamento de tempo virtual acelera TIMERS, não a REDE. Os ~6 MB
// de cartografia e o pool de nuvens-semente chegam antes ou depois dele
// conforme a sorte, e a MESMA vista sai em estados diferentes. Medido em
// 2026-08-07 no mesmo commit: t=100 devolveu a60fe9ce / 40f306d2 / effb3b85 em
// três capturas, com e sem `?q=cinema`, com orçamento de 16 s e de 32 s.
// Aqui a captura ESPERA: o log da cartografia e mais 700 quadros desenhados
// depois dele (~12 s, ou 45 refreshes do conjunto de nuvens-semente, que roda
// a cada 0,25 s). Com essa espera as cinco vistas repetem md5.
//
// LEIA O VEREDITO CERTO: md5 igual prova igualdade; md5 diferente NÃO prova
// diferença — pode ser captura não assentada. Por isso N capturas por lado e
// a marca INSTÁVEL quando um dos lados não repete. E "DIFERE" pede o passo
// seguinte, não a conclusão: rodar o diff de pixel. Diferença de 1 nível
// espalhada por dezenas de pixels é 1 ULP do compilador (reordenar aritmética
// ao mudar um `if` já basta), não conteúdo que sumiu.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const LADO = process.argv[2] || 'antes';
const SO = process.argv[3];
const N = 2;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const VISTAS = [
  ['interno', '?t=40&shot=2'],
  ['travessia', '?t=100&shot=2'],
  ['mergulho', '?t=180&shot=2'],
  ['edgeon', '?t=261&shot=2'],
  ['faceon', '?t=293&shot=2'],
];
const APP = process.env.APP_URL || 'http://127.0.0.1:5173';
// EXTRA=&knob=1 anexa um parâmetro a TODAS as vistas — o A/B de um knob se faz
// com o mesmo binário dos dois lados, sem editar nada entre as capturas.
const EXTRA = process.env.EXTRA || '';
// JANELA=700x1800 muda o tamanho da captura. Existe porque os TRÊS harnesses do
// repo capturam em 1:1 (rodada 1800x1800, sky 1440x1440, este 1800x1800), e
// qualquer defeito que dependa do ASPECTO da tela é invisível para todos eles —
// o corte lateral de sprite é exatamente desse tipo.
const [JW, JH] = (process.env.JANELA || '1800x1800').split('x');
const ESTADO = resolve(tmpdir(), `ab-identidade-${LADO}.json`);
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].find((p) => existsSync(p));
if (!CHROME) throw new Error('Chrome não encontrado');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let id = 0;
function rpc(ws, onEvent) {
  const waiting = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
    else if (m.method) onEvent(m);
  });
  return (method, params = {}) => new Promise((res, rej) => {
    const n = ++id;
    waiting.set(n, (m) => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}

async function capturar(query, porta, png) {
  const perfil = resolve(tmpdir(), `ab-${process.pid}-${porta}`);
  const chrome = spawn(CHROME, [
    '--headless=new', '--enable-gpu', '--use-gl=angle', '--use-angle=d3d11',
    '--hide-scrollbars', '--no-first-run', '--mute-audio',
    '--force-device-scale-factor=1', `--window-size=${JW},${JH}`,
    `--user-data-dir=${perfil}`, `--remote-debugging-port=${porta}`, 'about:blank',
  ], { stdio: 'ignore' });
  try {
    let url = null;
    for (let i = 0; i < 100 && !url; i++) {
      try {
        const r = await fetch(`http://127.0.0.1:${porta}/json/list`).then((x) => x.json());
        url = r.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
      } catch { /* Chrome ainda subindo */ }
      if (!url) await sleep(200);
    }
    if (!url) throw new Error('CDP não respondeu');
    const ws = new WebSocket(url);
    await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
    let cartografiaChegou = false;
    const send = rpc(ws, (m) => {
      if (m.method === 'Runtime.consoleAPICalled') {
        const txt = (m.params.args || []).map((a) => String(a.value ?? '')).join(' ');
        if (txt.includes('[cartografia]')) cartografiaChegou = true;
      }
    });
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: 'window.__f=0;const o=window.requestAnimationFrame.bind(window);'
        + 'window.requestAnimationFrame=(c)=>o((t)=>{window.__f++;return c(t)});',
    });
    await send('Page.navigate', { url: APP + '/' + query });
    const t0 = Date.now();
    let base = null;
    for (;;) {
      const r = await send('Runtime.evaluate', { expression: 'window.__f|0', returnByValue: true });
      const f = r.result.value;
      if (cartografiaChegou && base === null) base = f;
      if (base !== null && f - base > 700) break;
      if (Date.now() - t0 > 180000) throw new Error(`não assentou (cart=${cartografiaChegou}, f=${f})`);
      await sleep(250);
    }
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    // captura preta ou página de erro: um md5 estável de NADA passaria no teste
    if (buf.length < 40000) throw new Error(`captura suspeita de vazia (${buf.length} B)`);
    if (png) writeFileSync(png, buf);
    return createHash('md5').update(buf).digest('hex').slice(0, 12);
  } finally {
    chrome.kill();
    await sleep(400);
    try { rmSync(perfil, { recursive: true, force: true }); } catch { /* perfil preso */ }
  }
}

const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
if (!ping.includes('<div id="root"')) throw new Error(`dev server não respondeu em ${APP}`);

const md5 = {};
let porta = 9500 + (process.pid % 100);
for (const [nome, query] of VISTAS) {
  if (SO && nome !== SO) continue;
  md5[nome] = [];
  for (let k = 0; k < N; k++) {
    const png = SO ? resolve(ROOT, 'capturas', `ab-${LADO}-${nome}-${k}.png`) : null;
    md5[nome].push(await capturar(query + EXTRA, porta++, png));
  }
  console.log(`${nome.padEnd(10)} ${md5[nome].join(' ')}`);
}
writeFileSync(ESTADO, JSON.stringify(md5, null, 1));

if (LADO === 'depois') {
  const antes = JSON.parse(readFileSync(resolve(tmpdir(), 'ab-identidade-antes.json'), 'utf8'));
  let ok = true;
  for (const [nome] of VISTAS) {
    if (!md5[nome] || !antes[nome]) continue;
    const a = new Set(antes[nome]);
    const d = new Set(md5[nome]);
    const inter = [...a].filter((h) => d.has(h));
    const veredito = a.size > 1 || d.size > 1 ? 'INSTÁVEL' : inter.length ? 'IGUAL' : 'DIFERE';
    if (veredito !== 'IGUAL') ok = false;
    console.log(`${veredito.padEnd(9)} ${nome.padEnd(10)} antes=${[...a]} depois=${[...d]}`);
  }
  console.log(ok ? '\n>>> BIT-IDÊNTICO' : '\n>>> NÃO é bit-idêntico — rodar o diff de pixel antes de concluir');
}
