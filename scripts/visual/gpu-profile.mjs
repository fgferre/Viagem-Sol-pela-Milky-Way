// Preço de cada PASSE do quadro, medido na GPU.
//
//   node scripts/visual/gpu-profile.mjs "?t=100" 15 1920 1080 1
//   node scripts/visual/gpu-profile.mjs "?t=100" 15 1920 1080 2 cru
//
// Argumentos: query, segundos de janela, largura, altura, devicePixelRatio,
// e "cru" para contar só quadros (controle sem instrumento). Requer o vite dev
// em 127.0.0.1:5173. Sobe UMA instância de Chrome e a mata no fim.
//
// POR QUE TIMER QUERY, E NÃO ABLAÇÃO + rAF: sob vsync o rAF entrega 16,7 ms
// para qualquer quadro que CAIBA no orçamento, então ablação por relógio de
// apresentação não mede nada até o app já estar quebrado — foi assim que a
// medição de 2026-07-31 concluiu "não há gargalo" de um quadro que usa 96% da
// GPU. `EXT_disjoint_timer_query_webgl2` mede o tempo que a GPU passou DENTRO
// de cada draw, e em pós-processamento um programa é exatamente um passe.
//
// LIMITES REAIS: mede DRAWS, não `clear`/blit/upload; um quadro com poucos
// draws pesados é bem medido, um com muito trabalho fora de draw não. O total
// é conferível — quando ele cruza 16,67 ms os quadros caem, e foi assim que
// esta medida se validou (16,15 ms → 60,0 fps; 16,92 ms → 56,3 fps).
import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const QUERY = process.argv[2] || '?t=100';
const SECONDS = Number(process.argv[3] || 15);
const W = Number(process.argv[4] || 1920);
const H = Number(process.argv[5] || 1080);
// o app usa pixelRatio = min(dPR, teto do preset), então dPR 2 em cinema é o
// buffer 4× maior — o único regime em que a cadeia de pós escala de verdade
const DPR = Number(process.argv[6] || 1);
const CRU = process.argv[7] === 'cru';
const PORT = 9300 + (process.pid % 200);
const APP = (process.env.APP_URL || 'http://127.0.0.1:5173') + '/' + QUERY;

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].find((p) => existsSync(p));
if (!CHROME) throw new Error('Chrome não encontrado');

// Roda ANTES de qualquer script da página: embrulha getContext e, dentro dele,
// cada draw entre beginQuery/endQuery. O rótulo vem do PROGRAMA ligado no
// momento do draw; os tokens abaixo o traduzem para nome de passe. Programa sem
// token sai como `cena#N[uniformes]` — é assinatura suficiente para batizar
// pelo `grep` do uniforme em `src/three`.
const INSTRUMENT = `(() => {
  const G = (window.__prof = { ready: 0, ext: 0, frames: 0, calls: 0, drops: 0,
                               byLabel: {}, rafDt: [], err: null });
  const TOKENS = [
    ['asinh3', 'pos:knee'],
    ['uGrain', 'pos:film'],
    ['luminosityThreshold', 'pos:bloom-prefiltro'],
    ['lerpBloomFactor', 'pos:bloom-composite'],
    ['gaussianPdf', 'pos:bloom-blur'],
    ['KERNEL_RADIUS', 'pos:bloom-blur'],
    ['toneMappingExposure', 'pos:output(ACES+sRGB)'],
    // CopyShader: o blend ADITIVO do bloom no buffer do composer. Sem este
    // token ele sai como programa de cena e o pós fica 0,05 ms menor.
    ['opacity * texel', 'pos:bloom-blend'],
    ['uMaxPx', 'cena:galaxia(pontos)'],
    ['uCamFwd', 'cena:nebulosa(raymarch)'],
    ['uLayerAlpha', 'cena:laminas-poeira'],
    ['uCell', 'cena:wrappedStars'],
    ['uMarchB', 'cena:buracoNegro'],
    ['uZoom', 'cena:heroStars'],
  ];
  const origGet = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    const gl = origGet.call(this, type, attrs);
    if (gl && !G.ready && (type === 'webgl2' || type === 'webgl')) {
      try { instrument(gl, type === 'webgl2'); } catch (e) { G.err = String((e && e.stack) || e); }
    }
    return gl;
  };

  function instrument(gl, is2) {
    G.ready = 1;
    const ext = gl.getExtension(is2 ? 'EXT_disjoint_timer_query_webgl2'
                                    : 'EXT_disjoint_timer_query');
    G.ext = !!ext;
    if (!ext) return;
    const TE = ext.TIME_ELAPSED_EXT;

    const src = new WeakMap(), shaders = new WeakMap(), label = new WeakMap();
    let progSeq = 0;
    const oSrc = gl.shaderSource.bind(gl);
    gl.shaderSource = (sh, s) => { src.set(sh, s); oSrc(sh, s); };
    const oAtt = gl.attachShader.bind(gl);
    gl.attachShader = (p, sh) => {
      const a = shaders.get(p) || []; a.push(sh); shaders.set(p, a); oAtt(p, sh);
    };
    function labelOf(p) {
      let l = label.get(p);
      if (l) return l;
      const s = (shaders.get(p) || []).map((sh) => src.get(sh) || '').join('\\n');
      for (const [tok, name] of TOKENS) if (s.includes(tok)) { l = name; break; }
      if (!l) {
        const us = [...new Set((s.match(/uniform\\s+\\w+\\s+(u[A-Za-z0-9_]+)/g) || [])
          .map((m) => m.split(/\\s+/).pop()))].slice(0, 6);
        l = 'cena#' + (++progSeq) + (us.length ? '[' + us.join(',') + ']' : '');
      }
      label.set(p, l);
      return l;
    }

    let cur = null;
    const oUse = gl.useProgram.bind(gl);
    gl.useProgram = (p) => { cur = p; oUse(p); };

    const free = [], pending = [];
    let active = null;
    for (const name of (${CRU} ? [] : ['drawArrays', 'drawElements', 'drawArraysInstanced',
                        'drawElementsInstanced', 'drawRangeElements'])) {
      if (typeof gl[name] !== 'function') continue;
      const orig = gl[name].bind(gl);
      gl[name] = function (...a) {
        G.calls++;
        // beginQuery não aninha; se houver um ativo, desenha sem medir
        if (active) { G.drops++; return orig(...a); }
        const q = free.pop() || gl.createQuery();
        try { gl.beginQuery(TE, q); active = q; } catch { G.drops++; return orig(...a); }
        const r = orig(...a);
        gl.endQuery(TE); active = null;
        pending.push({ q, l: cur ? labelOf(cur) : 'semPrograma' });
        return r;
      };
    }

    function poll() {
      while (pending.length) {
        const r = pending[0];
        if (!gl.getQueryParameter(r.q, gl.QUERY_RESULT_AVAILABLE)) break;
        pending.shift();
        const dis = gl.getParameter(ext.GPU_DISJOINT_EXT);
        const ns = gl.getQueryParameter(r.q, gl.QUERY_RESULT);
        free.push(r.q);
        // resultado disjunto é lixo (a GPU trocou de contexto no meio)
        if (dis) { G.drops++; continue; }
        const b = G.byLabel[r.l] || (G.byLabel[r.l] = { ns: 0, n: 0 });
        b.ns += ns; b.n++;
      }
    }

    let last = 0;
    const oRAF = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => oRAF((t) => {
      poll();
      G.frames++;
      if (last) G.rafDt.push(t - last);
      last = t;
      return cb(t);
    });
  }
})();`;

const PROFILE = resolve(tmpdir(), `gpuprof-${process.pid}`);
const chrome = spawn(CHROME, [
  '--headless=new', '--enable-gpu', '--use-gl=angle', '--use-angle=d3d11',
  '--hide-scrollbars', '--no-first-run', '--mute-audio',
  `--force-device-scale-factor=${DPR}`, `--window-size=${W},${H}`,
  `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${PORT}`,
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function endpoint() {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((x) => x.json());
      const page = r.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* Chrome ainda subindo */ }
    await sleep(200);
  }
  throw new Error('CDP não respondeu');
}

let id = 0;
function rpc(ws) {
  const waiting = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
  });
  return (method, params = {}) => new Promise((res, rej) => {
    const n = ++id;
    waiting.set(n, (m) => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}

try {
  const ws = new WebSocket(await endpoint());
  await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
  const send = rpc(ws);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: INSTRUMENT });
  await send('Page.navigate', { url: APP });

  // o init é síncrono e pesado (bakes + buildGalaxy ≈ 5 s). Espera por QUADROS,
  // não por relógio: janela curta mede pico de arranque, não o quadro.
  const t0 = Date.now();
  for (;;) {
    const r = await send('Runtime.evaluate', {
      expression: 'JSON.stringify({f:window.__prof?window.__prof.frames:-1,'
        + 'e:window.__prof?window.__prof.ext:-1,err:window.__prof&&window.__prof.err})',
      returnByValue: true,
    });
    const s = JSON.parse(r.result.value);
    if (s.err) throw new Error('instrumento: ' + s.err);
    if (s.f > 120) break;
    if (Date.now() - t0 > 90000) throw new Error(`app não desenhou (frames=${s.f}, ext=${s.e})`);
    await sleep(500);
  }
  // zera: o arranque tem compilação e upload que não são o quadro de regime
  await send('Runtime.evaluate', {
    expression: 'window.__prof.byLabel={};window.__prof.frames=0;'
      + 'window.__prof.calls=0;window.__prof.drops=0;window.__prof.rafDt=[]',
  });
  await sleep(SECONDS * 1000);
  const out = await send('Runtime.evaluate', {
    expression: 'JSON.stringify(window.__prof)', returnByValue: true,
  });
  const buf = await send('Runtime.evaluate', {
    expression: "(()=>{const c=document.querySelector('canvas');"
      + "return c?c.width+'x'+c.height:'sem canvas'})()",
    returnByValue: true,
  });
  const p = JSON.parse(out.result.value);
  if (!p.ext) throw new Error('EXT_disjoint_timer_query_webgl2 ausente — sem medida');
  // callsPerFrame ≈ 0 significa que o app parou de renderizar e a linha não
  // mede nada; já invalidou uma rodada inteira antes de virar checagem
  const cpf = p.calls / p.frames;
  if (!CRU && cpf < 1) throw new Error(`app parou de desenhar (calls/frame ${cpf.toFixed(2)})`);

  const dt = p.rafDt.slice().sort((a, b) => a - b);
  const q = (f) => (dt.length ? dt[Math.floor(f * (dt.length - 1))].toFixed(1) : '-');
  const rows = Object.entries(p.byLabel)
    .map(([l, b]) => ({ l, ms: b.ns / 1e6 / p.frames, n: b.n / p.frames }))
    .sort((a, b) => b.ms - a.ms);
  const total = rows.reduce((s, r) => s + r.ms, 0);
  const pos = rows.filter((r) => r.l.startsWith('pos:')).reduce((s, r) => s + r.ms, 0);

  console.log(`${QUERY}  buffer ${buf.result.value}  dPR ${DPR}${CRU ? '  [CRU]' : ''}`);
  console.log(`${p.frames} quadros em ${SECONDS}s = ${(p.frames / SECONDS).toFixed(1)} fps`
    + `  | rAF p50 ${q(0.5)} p90 ${q(0.9)} p99 ${q(0.99)}`
    + `  | calls/quadro ${cpf.toFixed(1)}  descartes ${p.drops}`);
  if (CRU) process.exit(0);
  console.log(`GPU ${total.toFixed(3)} ms/quadro  |  POS ${pos.toFixed(3)} ms `
    + `(${(100 * pos / total).toFixed(1)}%)`);
  for (const r of rows) {
    console.log('  ' + r.l.slice(0, 44).padEnd(44) + r.ms.toFixed(3).padStart(8)
      + ' ms  x' + r.n.toFixed(1));
  }
} finally {
  chrome.kill();
  await sleep(500);
  try { rmSync(PROFILE, { recursive: true, force: true }); } catch { /* perfil preso */ }
}
