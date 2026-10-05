// Serve: dono — o filme TOCANDO em vídeo, para ele decidir olhando: o seek mostra o roteiro, o play mostra o que ele vê
// Custo: sob demanda — ferramenta, não juiz: não entra em rodada nem em gate; o preço por quadro está no parágrafo CUSTO
// GRAVA O FILME TOCANDO, quadro a quadro, em Chrome headless, e entrega um mp4. Não julga imagem: só reprova a
// gravação que não chegou ao instante pedido (`|currentTime − ate| ≤ 2/fps`).
//
// POR QUE TOCANDO. `?t=`/`seek()` chama `rig.reset()` e salta: mostra o ROTEIRO, e foi assim que o atraso da câmera
// passou semanas escondido (24/09, item 225). Aqui o filme ANDA: `?t=<de>&shot=2` chega congelado e, depois de
// assentar, o gravador o solta por `window.__director.togglePause()` (nunca `play()`, que zera o filme). O salto
// do começo continua existindo: com `--de` > 0 o atraso da câmera só se forma depois de ~1–2 s tocando — para o
// play fiel, comece mais cedo e corte.
//
// O RELÓGIO. O app lê o timestamp do rAF no `THREE.Timer`; a bomba (abaixo) troca o rAF por uma FILA, e quem manda
// o filme andar é o gravador: 1000/fps ms de relógio virtual por quadro, sem depender da carga da máquina, e entre
// dois quadros o app não desenha nada. Três armadilhas já medidas:
//  · O integrador GRAMPEIA o passo (`grampoDoPasso`, 0,05 s): a 15 fps um passo de 1/15 s andaria só 0,05 s e o filme
//    sairia 25 % mais curto. Quando 1/fps passa do grampo o app roda vários passos menores por quadro e só o último
//    é fotografado (15 fps = 2 × 33,3 ms).
//  · Headless, nunca Chrome visível: coberto por outra janela o macOS congela o rAF (ver `fps-real.mjs`).
//  · O servidor serve o código que está no disco AGORA, e o HMR do vite derruba o laço do app quando alguém edita
//    um arquivo (04/10: toda gravação que caiu coincidiu com "hmr update" no log do servidor; a bomba cala o
//    canal de HMR da página). Grave com a árvore quieta, de preferência num servidor só seu.
//
// A FOTO. `Emulation.setDeviceMetricsOverride` fixa o quadro em largura×altura CSS e o `captureScreenshot` com
// `scale: 1` já sai em px físicos (largura·dpr); `optimizeForSpeed` baixou a foto de 1,35 s para 0,5 s em DPR 2 ao
// custo de um PNG 36 % maior. Os quadros vão para uma pasta temporária (apagada ao sair, até no Ctrl+C) e o ffmpeg
// monta o mp4 (libx264, yuv420p, crf 23; acima de 30 MiB — o que o celular aguenta — refaz com crf 26, 28 e 30). O
// mp4 nunca sobrescreve: se o nome existe, entra -v2, -v3… Duas gravações do mesmo trecho nem sempre saem iguais
// byte a byte (4 de 8 saíram; as outras ficam a ~50 dB de PSNR, com a mesma câmera — causa não investigada).
//
// CUSTO (medido em 04/10 neste Mac, M1; filme galáctico t=20→30, 1280×720, app em desenvolvimento): DPR 1 ≈ 0,19 s por
// quadro (foto 0,16 + passo 0,03) e PNG de 1,2 MB; DPR 2 ≈ 0,5 s por quadro e PNG de 4,6 MB (a granulação não
// comprime). Dez segundos a 30 fps em DPR 2 = 300 quadros ≈ 2,5 min e 1,4 GB de disco temporário; o filme inteiro
// (193 s, 30 fps, DPR 2) seria ≈ 48 min e ≈ 27 GB — conta, não medição: não grave o filme inteiro à toa.
//
//   node scripts/visual/filme-video.mjs --ate=30 [--de=0] [--fps=30] [--largura=1280] [--altura=720] [--dpr=2]
//     [--query='filme=solar'] [--app=URL] [--saida=caminho.mp4]
//   --app: padrão `APP_URL` ou o dev server de sempre (só dev: `window.__director` não existe num build);
//   --hud=1: grava COM o HUD (legendas, nomes, barra, botões) — abre `?t=<de>` sem `shot`; sem a flag abre
//   `?t=<de>&shot=2` (só a cena, para A/B de pixel);
//   --query: vai tal qual depois disso; --saida: padrão
//   capturas/viagem-solar/filme-<de>-<ate>-<commit7>.mp4
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GPU_FLAGS, lancarChrome, portaDoPerfil, ligarSocketCDP, esperarAssentar, comLinguaDoJuizNaUrl, dorme, APP_PADRAO,
} from './chrome.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (nome, padrao) => {
  const a = argv.find((x) => x.startsWith(`--${nome}=`));
  return a ? a.slice(nome.length + 3) : padrao;
};
const falhar = (msg) => {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
};
const USO = "uso: node scripts/visual/filme-video.mjs --ate=30 [--de=0] [--fps=30] [--largura=1280] [--altura=720] [--dpr=2] [--hud=1] [--query='filme=solar'] [--app=URL] [--saida=caminho.mp4]";

const DE = Number(flag('de', '0'));
const ATE = Number(flag('ate')); // obrigatório: ausente vira NaN
const FPS = Number(flag('fps', '30'));
const LARGURA = Number(flag('largura', '1280'));
const ALTURA = Number(flag('altura', '720'));
const DPR = Number(flag('dpr', '2'));
const QUERY = flag('query', '').replace(/^[?&]+/, '');
const HUD = flag('hud', '0') === '1';
const APP = flag('app', process.env.APP_URL || APP_PADRAO).replace(/\/+$/, '');
if (![DE, ATE, FPS, LARGURA, ALTURA, DPR].every(Number.isFinite) || DE < 0 || ATE <= DE || FPS <= 0 || DPR <= 0) falhar(USO);
const QUADROS = Math.round((ATE - DE) * FPS);
if (QUADROS < 1) falhar(`${USO}\n--ate=${ATE} está a menos de meio quadro de --de=${DE}`);
// yuv420p pede dimensões pares: o erro tem de vir ANTES de uma gravação inteira, não do ffmpeg no fim
const PX_L = LARGURA * DPR;
const PX_A = ALTURA * DPR;
if (![PX_L, PX_A].every((n) => Number.isInteger(n) && n % 2 === 0)) falhar('largura×dpr e altura×dpr têm de ser inteiros pares (yuv420p)');
if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) falhar('ffmpeg não encontrado no PATH');
// servidor fora do ar: erro em 1 s, não os 3 min de `esperarAssentar` olhando uma página de erro
if (!(await fetch(APP, { signal: AbortSignal.timeout(5000) }).then((r) => r.ok, () => false))) {
  falhar(`o app não responde em ${APP} — suba o dev server (npx vite) ou passe --app=URL`);
}

// o mp4 nunca sobrescreve: capturas/ guarda a única cópia de cada prova (AGENTS.md) — se existe, entra -v2, -v3…
const commit = spawnSync('git', ['rev-parse', '--short=7', 'HEAD'], { cwd: RAIZ, encoding: 'utf8' }).stdout?.trim() || 'sem-git';
const pedido = resolve(flag('saida', join(RAIZ, 'capturas', 'viagem-solar', `filme-${DE}-${ATE}-${commit}.mp4`)));
let SAIDA = pedido;
for (let n = 2; existsSync(SAIDA); n++) SAIDA = pedido.replace(/(\.mp4)?$/i, `-v${n}.mp4`);

const LIMITE_BYTES = 30 * 1024 * 1024; // acima disso o vídeo não chega ao celular (29/09)
const PRAZO_MS = 180000; // um quadro que não sai em 3 min é aba congelada ou Chrome travado: erro, não espera eterna
const virgula = (n, d = 2) => n.toFixed(d).replace('.', ',');
const comPrazo = (promessa, rotulo) => {
  let relogio;
  const estouro = new Promise((_, rej) => {
    relogio = setTimeout(() => rej(new Error(`${rotulo}: sem resposta em ${PRAZO_MS / 1000} s (aba em segundo plano ou Chrome travado?)`)), PRAZO_MS);
  });
  return Promise.race([promessa, estouro]).finally(() => clearTimeout(relogio));
};

// A BOMBA DE rAF. Todo pedido de quadro do app cai numa FILA (e o cancelamento a respeita). Enquanto `manual` é
// falso, um laço no rAF real esvazia a fila com o relógio real — o app carrega e assenta como sempre. Com
// `manual` verdadeiro a fila só anda quando o gravador manda (`passar`): um rAF REAL, relógio virtual +`passo`
// por esvaziamento, tudo o que o app pediu roda uma vez. Entre dois quadros o app não desenha nada, então a
// foto é o quadro que o play desenharia, e o passo fixo não depende da carga da máquina.
// O CANAL DE HMR DO VITE FICA MUDO: arquivo editado com o servidor de pé derrubava o laço do app no meio da
// gravação (04/10) — mudo, a página fica no código com que nasceu.
const BOMBA = `(() => {
  const B = (window.__bomba = { fila: new Map(), lote: null, id: 0, manual: false, t: 0, passo: 1000 / 30 });
  const o = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { B.fila.set(++B.id, cb); return B.id; };
  window.cancelAnimationFrame = (id) => { B.fila.delete(id); B.lote?.delete(id); };
  const rodar = (t) => {
    const lote = (B.lote = B.fila);
    B.fila = new Map();
    let feitos = 0;
    for (const cb of lote.values()) {
      feitos++;
      try { cb(t); } catch (e) { console.error(e); }
    }
    B.lote = null;
    return feitos;
  };
  const volta = (tReal) => { o(volta); if (!B.manual) { B.t = tReal; rodar(tReal); } };
  o(volta);
  B.passar = (k) => new Promise((ok) => o(() => {
    let feitos = 0;
    for (let i = 0; i < k; i++) { B.t += B.passo; feitos = rodar(B.t); }
    ok(feitos);
  }));
  B.esperar = (k) => new Promise((ok) => { const f = () => (--k > 0 ? o(f) : ok()); o(f); });
  const mudo = { addEventListener() {}, removeEventListener() {}, send() {}, close() {}, readyState: 3 };
  window.WebSocket = new Proxy(window.WebSocket, {
    construct: (alvo, args) => (args[1] === 'vite-hmr' ? mudo : Reflect.construct(alvo, args)),
  });
})();`;

const perfil = resolve(tmpdir(), `filme-video-${process.pid}`);
const pasta = mkdtempSync(join(tmpdir(), 'filme-video-q-'));
// os quadros somem em qualquer saída — inclusive o Ctrl+C, que o vigia do chrome.mjs encerra com process.exit
process.on('exit', () => rmSync(pasta, { recursive: true, force: true }));
const { encerrar } = lancarChrome({
  perfil,
  args: [...GPU_FLAGS, '--disable-gpu-vsync', '--disable-frame-rate-limit', '--hide-scrollbars', '--no-first-run',
    '--mute-audio', `--force-device-scale-factor=${DPR}`, `--window-size=${LARGURA},${ALTURA}`,
    '--remote-debugging-port=0', 'about:blank'],
});
let sock = null;
let msTotal = 0;
let msPasso = 0;
let msFoto = 0;
let tFinal = 0;
const avisos = [];
try {
  const porta = await portaDoPerfil(perfil);
  let alvo = null;
  for (let i = 0; i < 100 && !alvo; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${porta}/json/list`).then((x) => x.json());
      alvo = r.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
    } catch { /* Chrome subindo */ }
    if (!alvo) await dorme(200);
  }
  if (!alvo) throw new Error('CDP não respondeu');
  let cartografia = false;
  sock = await ligarSocketCDP(alvo, (m) => {
    if (m.method === 'Runtime.consoleAPICalled') {
      const txt = (m.params.args || []).map((a) => String(a.value ?? a.description ?? '')).join(' ');
      if (txt.includes('[cartografia]')) cartografia = true;
      if (m.params.type === 'error') avisos.push(txt);
    } else if (m.method === 'Runtime.exceptionThrown') {
      avisos.push(`exceção: ${m.params.exceptionDetails?.exception?.description ?? m.params.exceptionDetails?.text ?? '?'}`);
    }
  });
  const { send } = sock;
  const js = async (expressao) => {
    const r = await send('Runtime.evaluate', { expression: expressao, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`js: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  // a janela útil é menor que --window-size (a barra do navegador sai dela): o override fixa o quadro em
  // largura×altura CSS exatos, no DPR pedido — e a foto sai em px físicos (largura·dpr), com `scale: 1`
  await send('Emulation.setDeviceMetricsOverride', { width: LARGURA, height: ALTURA, deviceScaleFactor: DPR, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: BOMBA });
  await send('Page.navigate', { url: comLinguaDoJuizNaUrl(`${APP}/?t=${DE}${HUD ? '' : '&shot=2'}${QUERY ? `&${QUERY}` : ''}`) });
  const assentou = await esperarAssentar({ send, cartografia: () => cartografia, quadros: 700, teto: 180000 });
  process.stdout.write(`assentou por ${assentou.via} em ${virgula(assentou.ms / 1000, 1)}s · fase=${assentou.fase ?? '?'}\n`);

  const info = await js(`(() => {
    const d = window.__director;
    if (!d || typeof d.togglePause !== 'function') return null;
    return { fase: d.captura.fase, parado: d.freezeJourney, t: d.currentTime, duracao: d.journeyDuration,
      grampo: d.grampoDoPasso, w: innerWidth, h: innerHeight };
  })()`);
  if (!info) throw new Error('sem window.__director: ele só existe no dev server (vite), não num build');
  if (info.fase !== 'journey' || !info.parado) {
    throw new Error(`o filme não chegou congelado no instante pedido (fase=${info.fase}, parado=${info.parado}) — o --query desvia o filme?`);
  }
  if (Math.abs(info.t - DE) > 0.01) throw new Error(`o filme abriu em t=${info.t}, não em --de=${DE} (o filme dura ${info.duracao} s)`);
  if (ATE > info.duracao) throw new Error(`--ate=${ATE} passa do fim do filme (${info.duracao} s)`);
  if (info.w !== LARGURA || info.h !== ALTURA) throw new Error(`a janela útil é ${info.w}×${info.h}, não ${LARGURA}×${ALTURA}`);
  // O INTEGRADOR GRAMPEIA o passo em `grampoDoPasso` (0,05 s): um quadro de 1/15 s andaria só 0,05 s e o filme
  // gravado ficaria mais curto que o pedido. Quando o quadro do vídeo é maior que o grampo, o app roda SUB
  // passos menores por quadro (só o último é fotografado).
  const SUB = Math.max(1, Math.ceil(1 / FPS / info.grampo - 1e-9));

  // ARMA com o filme ainda parado, e só então solta: nenhum quadro de relógio real entra na gravação
  await js(`window.__bomba.passo = ${1000 / FPS / SUB}; window.__bomba.manual = true; true`);
  const solto = await js('(() => { const d = window.__director; if (d.freezeJourney) d.togglePause(); return !d.freezeJourney; })()');
  if (!solto) throw new Error('togglePause não soltou o filme');

  process.stdout.write(`gravando ${QUADROS} quadros (t ${virgula(DE)} → ${virgula(ATE)} s a ${FPS} fps, ${SUB} passo(s) de ${virgula(1000 / FPS / SUB, 1)} ms por quadro)…\n`);
  const marco = Math.max(1, Math.round(QUADROS / 10));
  const t0 = performance.now();
  for (let i = 1; i <= QUADROS; i++) {
    const a = performance.now();
    const feitos = await comPrazo(
      js(`window.__bomba.passar(${SUB}).then((n) => window.__bomba.esperar(2).then(() => n))`), `quadro ${i}/${QUADROS}`
    );
    if (!feitos) throw new Error(`quadro ${i}: o app não pediu nenhum rAF — o laço dele parou (contexto WebGL perdido, exceção no quadro ou página recarregada)`);
    const b = performance.now();
    const foto = await comPrazo(
      send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, clip: { x: 0, y: 0, width: info.w, height: info.h, scale: 1 } }),
      `foto do quadro ${i}/${QUADROS}`
    );
    const png = Buffer.from(foto.data, 'base64');
    if (png.readUInt32BE(16) !== PX_L || png.readUInt32BE(20) !== PX_A) {
      throw new Error(`quadro ${i}: a foto saiu ${png.readUInt32BE(16)}×${png.readUInt32BE(20)}, não ${PX_L}×${PX_A}`);
    }
    writeFileSync(join(pasta, `q${String(i).padStart(5, '0')}.png`), png);
    const c = performance.now();
    msPasso += b - a;
    msFoto += c - b;
    if (i % marco === 0 && i < QUADROS) process.stdout.write(`  ${i}/${QUADROS} · ${Math.round((c - t0) / i)} ms/quadro\n`);
  }
  msTotal = performance.now() - t0;
  tFinal = await js('window.__director.currentTime');
} finally {
  // o que o app gritou vale mais ainda quando a gravação cai: é a explicação do laço que parou
  if (avisos.length) process.stderr.write(`aviso: o app registrou ${avisos.length} erro(s) no console durante a gravação — o primeiro: ${avisos[0].slice(0, 400)}\n`);
  sock?.fechar();
  await encerrar({ carencia: 400 });
}

// o instante em que o filme PAROU tem de ser o pedido: sem isso o vídeo é de outro trecho e ninguém vê
const erro = Math.abs(tFinal - ATE);
if (erro > 2 / FPS) throw new Error(`o filme parou em t=${tFinal} s, não em --ate=${ATE} (erro ${erro} s > ${2 / FPS} s)`);

const codificar = (crf) => {
  const r = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-framerate', String(FPS),
    '-i', join(pasta, 'q%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', String(crf),
    '-movflags', '+faststart', SAIDA], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg falhou (crf ${crf}): ${r.stderr}`);
  return statSync(SAIDA).size;
};
mkdirSync(dirname(SAIDA), { recursive: true });
let crf = 23;
let bytes = codificar(crf);
for (const maior of [26, 28, 30]) {
  if (bytes <= LIMITE_BYTES) break;
  rmSync(SAIDA); // o arquivo da tentativa anterior é desta corrida
  crf = maior;
  bytes = codificar(crf);
}

process.stdout.write(
  `${QUADROS} quadros · ${virgula(QUADROS / FPS)} s a ${FPS} fps · ${virgula(bytes / 1048576, 1)} MiB (crf ${crf})`
  + `${bytes > LIMITE_BYTES ? ' — ACIMA de 30 MiB mesmo no crf 30' : ''} · ${SAIDA}\n`
  + `filme parou em t=${virgula(tFinal, 3)} s (pedido ${virgula(ATE, 3)}; erro ${virgula(erro, 3)} s, tolerância ${virgula(2 / FPS, 3)} s)`
  + ` · ${Math.round(msTotal / QUADROS)} ms/quadro (passo ${Math.round(msPasso / QUADROS)} + foto ${Math.round(msFoto / QUADROS)})\n`
);
