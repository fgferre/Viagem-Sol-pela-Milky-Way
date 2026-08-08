// Onde está o Chrome e com que backend ele desenha — um lugar só.
//
// Os quatro harnesses (rodada, ab-identidade, sky-capture, gpu-profile) subiam
// Chrome cada um com a sua cópia da lista de caminhos e do `--use-angle`. Eram
// quatro cópias do MESMO contrato de lançamento, e num clone macOS as quatro
// falhavam junto: nenhum gate do projeto rodava nesta máquina.
//
// O backend NÃO é detalhe de conveniência: `d3d11` só existe no Windows e
// `metal` só no macOS. Passar o backend errado faz o Chrome cair para
// SwiftShader (CPU) SEM ERRO — o headless sobe, a captura sai, e o md5 é de
// uma imagem que nenhuma GPU desenhou. Por isso a escolha é por plataforma e
// não uma constante: gate que degrada em silêncio é pior que gate que quebra.
//
// E `matarPerfil`, porque `chrome.kill()` NÃO basta: o processo que o Node
// gera é só o browser: os helpers de GPU e renderer são filhos que sobrevivem
// ao pai. Medido nesta máquina — depois de quatro invocações do gpu-profile
// havia 14 Chrome órfãos vivos, e eles não são inertes: disputam a MESMA GPU
// que o harness está medindo. A baseline caiu de 20,0 para 8,0 fps entre a
// primeira e a quarta execução, e a mesma vista devolveu 196 e 588 ms de
// total. `rodada.mjs` já tinha a limpeza — só que só no ramo `win32`, e a
// morte silenciosa dos outros três harnesses estava embutida no valor que
// eles imprimiam. Regra: quem sobe Chrome mata pelo `user-data-dir`, sempre.
import { existsSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const CAMINHOS = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  win32: [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/chromium-browser'],
};

const ANGLE = { darwin: 'metal', win32: 'd3d11', linux: 'gl' };

export const CHROME = (CAMINHOS[process.platform] ?? []).find((p) => existsSync(p));
if (!CHROME) throw new Error(`Chrome não encontrado (${process.platform})`);

/** Flags de GPU comuns a todos os harnesses, com o backend da plataforma. */
export const GPU_FLAGS = [
  '--headless=new',
  '--enable-gpu',
  '--use-gl=angle',
  `--use-angle=${ANGLE[process.platform] ?? 'default'}`,
];

/**
 * Mata TODO processo cuja linha de comando cite este `user-data-dir` — o
 * browser e os helpers que sobrevivem a ele. Casa pelo perfil, e não pelo
 * nome, para nunca encostar no Chrome que o usuário está usando.
 */
/**
 * Captura uma vista por CDP, esperando a cena ASSENTAR — a alternativa a
 * `--virtual-time-budget --screenshot`, que neste Chrome/macOS simplesmente
 * NÃO TERMINA: medido, uma janela de 400×400 com 8 s de orçamento ficou mais
 * de 6 min sem sair e sem gravar PNG. O laço de rAF do app nunca deixa o
 * tempo virtual chegar ao teto, e o `--screenshot` só dispara quando ele
 * chega. O cabeçalho de `ab-identidade.mjs` já dizia por outro motivo que o
 * orçamento virtual é régua ruim (adianta TIMER, não REDE); aqui ele é régua
 * nenhuma.
 *
 * Espera o log da cartografia e mais `quadros` quadros DESENHADOS, que é o
 * que faz a mesma vista repetir md5.
 */
export async function capturarCDP({ url, largura, altura, porta, quadros = 700, teto = 300000 }) {
  const perfil = resolve(tmpdir(), `cdp-${process.pid}-${porta}`);
  const chrome = spawn(CHROME, [
    ...GPU_FLAGS,
    '--hide-scrollbars', '--no-first-run', '--mute-audio',
    '--force-device-scale-factor=1', `--window-size=${largura},${altura}`,
    `--user-data-dir=${perfil}`, `--remote-debugging-port=${porta}`, 'about:blank',
  ], { stdio: 'ignore' });
  const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
  let seq = 0;
  try {
    let alvo = null;
    for (let i = 0; i < 100 && !alvo; i++) {
      try {
        const r = await fetch(`http://127.0.0.1:${porta}/json/list`).then((x) => x.json());
        alvo = r.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
      } catch { /* Chrome ainda subindo */ }
      if (!alvo) await dorme(200);
    }
    if (!alvo) throw new Error('CDP não respondeu');
    const ws = new WebSocket(alvo);
    await new Promise((r, j) => {
      const relogio = setTimeout(() => j(new Error('WebSocket do CDP não abriu em 30 s')), 30000);
      ws.addEventListener('open', () => { clearTimeout(relogio); r(); });
      ws.addEventListener('error', () => { clearTimeout(relogio); j(new Error('WebSocket falhou')); });
    });
    const esperando = new Map();
    let cartografia = false;
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.id && esperando.has(m.id)) { esperando.get(m.id)(m); esperando.delete(m.id); }
      else if (m.method === 'Runtime.consoleAPICalled') {
        const txt = (m.params.args || []).map((a) => String(a.value ?? '')).join(' ');
        if (txt.includes('[cartografia]')) cartografia = true;
      }
    });
    const send = (method, params = {}) => new Promise((res, rej) => {
      const n = ++seq;
      esperando.set(n, (m) => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)));
      ws.send(JSON.stringify({ id: n, method, params }));
    });
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: 'window.__f=0;const o=window.requestAnimationFrame.bind(window);'
        + 'window.requestAnimationFrame=(c)=>o((t)=>{window.__f++;return c(t)});',
    });
    await send('Page.navigate', { url });
    const t0 = Date.now();
    let base = null;
    for (;;) {
      const r = await send('Runtime.evaluate', { expression: 'window.__f|0', returnByValue: true });
      const f = r.result.value;
      if (cartografia && base === null) base = f;
      if (base !== null && f - base > quadros) break;
      if (Date.now() - t0 > teto) throw new Error(`não assentou (cart=${cartografia}, f=${f})`);
      await dorme(250);
    }
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    if (buf.length < 40000) throw new Error(`captura suspeita de vazia (${buf.length} B)`);
    return buf;
  } finally {
    chrome.kill();
    matarPerfil(perfil);
    await dorme(400);
    try { rmSync(perfil, { recursive: true, force: true }); } catch { /* perfil preso */ }
  }
}

export function matarPerfil(perfil) {
  if (process.platform === 'win32') {
    spawnSync('powershell', ['-NoProfile', '-Command',
      `Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | ` +
      `Where-Object { $_.CommandLine -like '*${perfil.replace(/\\/g, '\\\\')}*' } | ` +
      `ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`,
    ], { stdio: 'ignore' });
  } else {
    // -f casa a linha inteira; o perfil tem o PID do harness, então é único
    spawnSync('pkill', ['-f', perfil], { stdio: 'ignore' });
  }
}
