// O PORTAL DO ATLAS EM NAVEGADOR REAL — ida e volta, medida em PIXEL.
//
//   node scripts/visual/atlas-smoke.mjs
//
// Três provas, numa sessão de Chrome só (mesma GPU, mesmo contexto —
// comparar md5 entre processos diferentes não prova portal nenhum):
//
//  1. IDA E VOLTA. Pausa a viagem num instante, entra no Atlas, parte.
//     Cobra `journeyT` EXATO (Object.is, não "perto") e o md5 do quadro
//     ANTES de entrar igual ao md5 DEPOIS de partir. O escalar sozinho
//     não bastava: o `seek()` zera o olhar do pausar-e-olhar e o tick
//     zera o latch do disco fora da viagem — o pixel é quem denuncia.
//  2. PRONTIDÃO NA FASE NOVA. A captura dentro do Atlas tem de assentar
//     por `via=sinal`. Se ela cair no teto de segurança (`via=quadros`),
//     o getter `captura` não aprendeu a fase e todo gate futuro do Atlas
//     estaria medindo espera cega — o modo caro de falhar.
//  3. SOL REPRODUZÍVEL. Entrar no Atlas a partir de t=10 e a partir de
//     t=250 tem de dar o MESMO md5. A dramaturgia do ciclo solar é
//     monótona em `journeyT`; sem o pino do Atlas cada entrada daria um
//     Sol diferente e nenhuma vista do modo seria reproduzível.
//
// Método herdado do `ab-identidade`: `?q=cinema` pinado (senão o
// autoQuality troca o tier no meio da espera), `?shot=2` (só a cena),
// e o SINAL de prontidão do próprio app no lugar de espera cega.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { rmSync } from 'node:fs';
import {
  CHROME, GPU_FLAGS, matarPerfil, portaDoPerfil, esperarAssentar, APP_PADRAO,
} from './chrome.mjs';

const APP = process.env.APP_URL || APP_PADRAO;
const PIN = 'shot=2&q=cinema';
const JANELA = process.env.JANELA || '1200x900';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let seq = 0;
function rpc(ws, onEvent) {
  const esperando = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && esperando.has(m.id)) { esperando.get(m.id)(m); esperando.delete(m.id); }
    else if (m.method) onEvent(m);
  });
  return (method, params = {}) => new Promise((res, rej) => {
    const n = ++seq;
    esperando.set(n, (m) => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}

async function abrir() {
  const [w, h] = JANELA.split('x');
  const perfil = resolve(tmpdir(), `atlas-smoke-${process.pid}`);
  const chrome = spawn(CHROME, [
    ...GPU_FLAGS,
    '--hide-scrollbars', '--no-first-run', '--mute-audio',
    '--force-device-scale-factor=1', `--window-size=${w},${h}`,
    `--user-data-dir=${perfil}`, '--remote-debugging-port=0', 'about:blank',
  ], { stdio: 'ignore' });
  const porta = await portaDoPerfil(perfil);
  let alvo = null;
  for (let i = 0; i < 100 && !alvo; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${porta}/json/list`).then((x) => x.json());
      alvo = r.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
    } catch { /* Chrome ainda subindo */ }
    if (!alvo) await sleep(200);
  }
  if (!alvo) throw new Error('CDP não respondeu');
  const ws = new WebSocket(alvo);
  await new Promise((r, j) => {
    const relogio = setTimeout(() => j(new Error('WebSocket do CDP não abriu em 30 s')), 30000);
    ws.addEventListener('open', () => { clearTimeout(relogio); r(); });
    ws.addEventListener('error', () => { clearTimeout(relogio); j(new Error('WebSocket falhou')); });
  });
  let cartografia = false;
  const send = rpc(ws, (m) => {
    if (m.method === 'Runtime.consoleAPICalled') {
      const txt = (m.params.args || []).map((a) => String(a.value ?? '')).join(' ');
      if (txt.includes('[cartografia]')) cartografia = true;
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.__f=0;const o=window.requestAnimationFrame.bind(window);'
      + 'window.requestAnimationFrame=(c)=>o((t)=>{window.__f++;return c(t)});',
  });
  const fechar = () => {
    chrome.kill();
    matarPerfil(perfil);
    try { rmSync(perfil, { recursive: true, force: true }); } catch { /* preso */ }
  };
  return {
    send,
    fechar,
    ir: async (query) => {
      cartografia = false;
      await send('Page.navigate', { url: `${APP}/?${query}` });
      // o rAF contador morre com o documento; a navegação recria tudo
      return esperarAssentar({ send, cartografia: () => cartografia, quadros: 700, teto: 180000 });
    },
    assentar: () =>
      esperarAssentar({ send, cartografia: () => true, quadros: 700, teto: 180000 }),
    js: async (expr) => {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      if (r.exceptionDetails) throw new Error(`js: ${r.exceptionDetails.text}`);
      return r.result.value;
    },
    md5: async () => {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const buf = Buffer.from(shot.data, 'base64');
      if (buf.length < 20000) throw new Error(`captura suspeita de vazia (${buf.length} B)`);
      return createHash('md5').update(buf).digest('hex').slice(0, 12);
    },
  };
}

const falhas = [];
const conferir = (ok, texto) => {
  process.stdout.write(`${ok ? '  OK  ' : '  FALHA '} ${texto}\n`);
  if (!ok) falhas.push(texto);
};

const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
if (!ping.includes('<div id="root"')) throw new Error(`dev server não respondeu em ${APP}`);

const sessao = await abrir();
try {
  // ---- 1, 2 e 3: ida e volta, prontidão, e o Sol reproduzível ------
  // Os DOIS instantes não são redundância: t=10 deixa a câmera do filme
  // ainda dentro dos 2 pc de casa (o raio em que a LUT do raymarch se
  // reusa) e t=250 a deixa a 20 kpc. Foi essa dupla que denunciou a LUT
  // herdada do trajeto — com um instante só, o gate passava mentindo.
  const doAtlas = new Map();
  for (const T of [10, 100, 250]) {
    await sessao.ir(`t=${T}&${PIN}`);
    const antesFase = await sessao.js('window.__director.captura.fase');
    const antesT = await sessao.js('window.__director.currentTime');
    const antes = await sessao.md5();
    conferir(antesFase === 'journey', `t=${T}: parte de 'journey' congelada em t=${antesT}`);

    await sessao.js('window.__director.entrarNoAtlas()');
    const dentro = await sessao.assentar();
    const faseDentro = await sessao.js('window.__director.captura.fase');
    const md5Atlas = await sessao.md5();
    doAtlas.set(T, md5Atlas);
    conferir(faseDentro === 'atlas', `t=${T}: entrou — fase = '${faseDentro}'`);
    conferir(
      dentro.via === 'sinal',
      `t=${T}: captura em 'atlas' por via=${dentro.via} em ${(dentro.ms / 1000).toFixed(1)}s`
    );
    conferir(md5Atlas !== antes, `t=${T}: o Atlas é OUTRA vista (${md5Atlas} ≠ ${antes})`);

    await sessao.js('window.__director.partirDoAtlas()');
    await sessao.assentar();
    const depoisFase = await sessao.js('window.__director.captura.fase');
    const depoisT = await sessao.js('window.__director.currentTime');
    const depois = await sessao.md5();
    conferir(depoisFase === 'journey', `t=${T}: partiu — fase = '${depoisFase}'`);
    conferir(Object.is(antesT, depoisT), `t=${T}: journeyT EXATO na volta (${depoisT})`);
    conferir(antes === depois, `t=${T}: pixel idêntico antes/depois — ${antes} vs ${depois}`);
  }
  const vistas = [...new Set(doAtlas.values())];
  conferir(
    vistas.length === 1,
    `Sol reproduzível: ${[...doAtlas].map(([t, h]) => `t=${t} ${h}`).join(' · ')}`
  );

  // ---- 4: o deep-link e o "Partir" sem viagem anterior -------------
  await sessao.ir(`atlas=1&${PIN}`);
  const faseLink = await sessao.js('window.__director.captura.fase');
  conferir(faseLink === 'atlas', `?atlas=1 abre no Atlas: fase = '${faseLink}'`);
  await sessao.js('window.__director.partirDoAtlas()');
  await sessao.assentar();
  const semViagem = await sessao.js('window.__director.captura.fase');
  conferir(semViagem === 'intro', `"Partir" sem viagem anterior volta ao título: '${semViagem}'`);

  // ---- 5: ?pos= ganha de ?atlas=1 (precedência declarada) ----------
  await sessao.ir(`pos=0,0,0.1&look=0,0,0&atlas=1&${PIN}`);
  const faseComPos = await sessao.js('window.__director.captura.fase');
  conferir(faseComPos === 'free', `?pos= ganha de ?atlas=1: fase = '${faseComPos}'`);
} finally {
  sessao.fechar();
}

if (falhas.length) {
  process.stdout.write(`\nSMOKE DO ATLAS: ${falhas.length} falha(s)\n`);
  process.exit(1);
}
process.stdout.write('\nSMOKE DO ATLAS: tudo verde\n');
