// ============================================================
// Custo: ~25 s por corrida nesta máquina (medido 10/09) — a maior parte é
// a espera de assentamento inicial, que cai no teto de segurança por
// contagem de quadros (~14 s) em vez do sinal rápido do app; os gestos e
// os dois clipes somam só uns 12 s.
//
// A SONDA DE MOVIMENTO — C0 do plano de motion (docs/PLANO-MOTION-UI.md,
// §12.3 e "C0 — restabelecer uma referência verificável"). Não julga
// sozinha: registra o commit, repete SEMPRE a mesma sequência de gestos
// por CDP (mouse/teclado reais na mesa, dedo real no telefone) e produz
// um JSON com as medidas mais clipes em velocidade normal — para
// qualquer IA repetir a ação, saber que commit está vendo e comparar
// antes/depois sem depender de "eu vi na tela".
//
// Os nomes de campo (`painel`, `transform`, `inert`, `events`,
// `beforeRelease`, `drag`) seguem os dois JSONs do auditor de 10/09
// (`capturas/auditoria-motion-20260910*-16e852d.json`) onde fazia
// sentido reaproveitar — esta sonda estende aquela primeira sondagem
// manual para um script reproduzível, com mais instantes por gesto.
//
// Uso:
//   node scripts/visual/sonda-motion.mjs
//   node scripts/visual/sonda-motion.mjs --app=http://localhost:58697
//
// Saída (nomes inéditos — nunca sobrescreve, ver `semSobrescrever`):
//   capturas/motion-c0-<commit>.json       todas as amostras + metadados
//   capturas/motion-c0-mesa-<commit>.mp4   abrir/trocar/fechar (2a–2c)
//   capturas/motion-c0-toque-<commit>.mp4  abrir + arrastar + soltar (3)
// ============================================================
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';
import {
  lancarChrome, GPU_FLAGS, dorme, ligarSocketCDP, portaDoPerfil,
  comLinguaDoJuizNaUrl, esperarPor, esperarAssentar,
} from './chrome.mjs';
import { semSobrescrever } from './luz-ab.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CAPTURAS = resolve(ROOT, 'capturas');
const FFMPEG = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg';

const argApp = process.argv.find((a) => a.startsWith('--app='));
const APP = argApp ? argApp.slice('--app='.length) : 'http://localhost:58697';
const QUERY = 'atlas=1&q=performance&lang=pt-BR';
// `--sequencia` troca as seis provas E1–E6 (paralelas, sem história entre
// si) por UM fluxo contínuo só (C3, docs/PLANO-MOTION-UI.md linha 511:
// "mostrar uma sequência contínua Buscar Saturno → abrir seção → copiar
// link → mudar tempo"). Opt-in: sem a flag, o comportamento é o de
// sempre, intocado — ver o `if (!SEQUENCIA)` no fim do arquivo.
const SEQUENCIA = process.argv.includes('--sequencia');

const SEL_CAMADAS_GATILHO = '[data-abre-dialogo="camadas"]';
const SEL_AJUSTES_GATILHO = '[data-abre-dialogo="ajustes"]';
const SEL_CAMADAS_PAINEL = '[data-dialogo="camadas"]';
const SEL_AJUSTES_PAINEL = '[data-dialogo="ajustes"]';
const SEL_SEG_QUALIDADE = `${SEL_AJUSTES_PAINEL} .ajustes-seg[aria-label="Qualidade"]`;
const SEL_BUSCA_GATILHO = '[data-abre-dialogo="busca"]';
const SEL_BUSCA_PAINEL = '[data-dialogo="busca"]';
const SEL_FICHA_PAINEL = '[data-dialogo="ficha"]';
// OS SEIS TOKENS DE DESLOCAMENTO (movimento.test.ts, `TOKENS_DE_MOVIMENTO`
// + `--t-rapido`) que a gravação lenta da C3 multiplica por 6 — a mesma
// lista, e não um subconjunto, porque a sequência inteira (busca, ficha,
// sanfona, ajustes, tempo) usa as duas famílias de token.
const TOKENS_LENTOS = ['--t-entrada', '--t-assenta', '--t-reflexo', '--t-folha', '--t-pressao', '--t-rapido'];

// O CONTADOR DE QUADROS (para `esperarAssentar`) e O COLETOR DE EVENTOS
// (para as tabelas `events`, replicando o que o auditor de 10/09 leu à
// mão): todo `animationstart` da casa já é um `@keyframes` nomeado
// (`entraPainel`, `saiPainel`, `assentaIcone`...) — um só ouvinte global
// substitui uma sonda por keyframe.
const SCRIPT_INJETADO = `
window.__f = 0;
const _raf = window.requestAnimationFrame.bind(window);
window.requestAnimationFrame = (cb) => _raf((t) => { window.__f++; return cb(t); });
window.__eventosMotion = [];
document.addEventListener('animationstart', (e) => {
  const alvo = (typeof e.target.className === 'string') ? e.target.className : {};
  window.__eventosMotion.push({ time: e.timeStamp, name: e.animationName, target: alvo });
}, true);
`;

/**
 * UMA SESSÃO DE CHROME PRÓPRIA, e não `abrirSessao` de `chrome.mjs`: esta
 * sonda precisa de `Page.startScreencast` para os clipes (passo 5), e
 * `Page.screencastFrame` chega como EVENTO não solicitado — o
 * despachante de `abrirSessao` só repassa três eventos fixos (carga,
 * console, exceção) e descartaria os quadros sem nunca confirmá-los
 * (`Page.screencastFrameAck`), o que faz o Chrome parar de mandar depois
 * do primeiro. Por isso esta função reabre, com as MESMAS peças
 * exportadas por `chrome.mjs` (`lancarChrome`, `portaDoPerfil`,
 * `ligarSocketCDP`, `esperarAssentar`), um despachante que qualquer
 * chamador pode assinar com `onEvento`.
 */
async function abrirSonda({ janela, prefixo }) {
  const [w, h] = janela.split('x').map(Number);
  const perfil = resolve(tmpdir(), `${prefixo}-${process.pid}`);
  const { encerrar } = lancarChrome({
    perfil,
    args: [
      ...GPU_FLAGS,
      '--hide-scrollbars', '--no-first-run', '--mute-audio',
      '--force-device-scale-factor=1', `--window-size=${w},${h}`,
      '--remote-debugging-port=0', 'about:blank',
    ],
  });
  const porta = await portaDoPerfil(perfil);
  let alvo = null;
  for (let i = 0; i < 100 && !alvo; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${porta}/json/list`).then((x) => x.json());
      alvo = r.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
    } catch { /* Chrome ainda subindo */ }
    if (!alvo) await dorme(200);
  }
  if (!alvo) throw new Error('CDP não respondeu');

  const ouvintes = new Set();
  let carregou = false;
  let cartografiaVista = false;
  const { send, fechar: fecharSocket } = await ligarSocketCDP(alvo, (m) => {
    if (m.method === 'Page.loadEventFired') carregou = true;
    if (m.method === 'Runtime.consoleAPICalled') {
      const txt = (m.params.args || []).map((a) => String(a.value ?? '')).join(' ');
      if (txt.includes('[cartografia]')) cartografiaVista = true;
    }
    for (const fn of ouvintes) fn(m);
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: SCRIPT_INJETADO });

  const js = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`js: ${r.exceptionDetails.text}`);
    return r.result.value;
  };

  const ir = async (query) => {
    carregou = false;
    cartografiaVista = false;
    await send('Page.navigate', {
      url: comLinguaDoJuizNaUrl(`${APP}/${query ? `?${query}` : ''}`),
    });
    const t0 = Date.now();
    while (!carregou) {
      if (Date.now() - t0 > 30000) throw new Error(`?${query}: o documento novo não carregou`);
      await dorme(20);
    }
    return esperarAssentar({ send, cartografia: () => cartografiaVista, quadros: 700, teto: 180000 });
  };

  return {
    send,
    js,
    ir,
    onEvento: (fn) => { ouvintes.add(fn); return () => ouvintes.delete(fn); },
    fechar: () => { fecharSocket(); return encerrar(); },
  };
}

async function retanguloDe(sessao, seletor) {
  return sessao.js(`(() => {
    const el = document.querySelector(${JSON.stringify(seletor)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  })()`);
}

/** clique real de mouse (mousePressed+mouseReleased) no centro do alvo —
 *  o par que `Input.dispatchMouseEvent` gera é o que faz o Chrome
 *  decidir `:focus-visible` como um clique de verdade decidiria. */
async function clicarReal(sessao, seletor) {
  const r = await retanguloDe(sessao, seletor);
  if (!r) throw new Error(`clicarReal: "${seletor}" não encontrado`);
  const x = r.x + r.width / 2;
  const y = r.y + r.height / 2;
  const base = {
    x, y, button: 'left', clickCount: 1, buttons: 1, pointerType: 'mouse',
  };
  await sessao.send('Input.dispatchMouseEvent', { ...base, type: 'mousePressed' });
  await sessao.send('Input.dispatchMouseEvent', { ...base, type: 'mouseReleased', buttons: 0 });
  return { x, y };
}

async function moverMouse(sessao, x, y) {
  await sessao.send('Input.dispatchMouseEvent', {
    x, y, type: 'mouseMoved', pointerType: 'mouse', buttons: 0,
  });
}

async function pressionarEscape(sessao) {
  const base = {
    key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27,
  };
  await sessao.send('Input.dispatchKeyEvent', { ...base, type: 'rawKeyDown' });
  await sessao.send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
}

/** teclas nomeadas que a sonda padrão não precisava (Tab/Enter/Backspace
 *  do fluxo da C3, `--sequencia`) — mesmo par rawKeyDown/keyUp de
 *  `pressionarEscape`, acima; só o código nativo muda por tecla. */
async function pressionarTecla(sessao, nome) {
  const TECLAS = { Tab: 9, Enter: 13, Backspace: 8 };
  const codigo = TECLAS[nome];
  if (!codigo) throw new Error(`pressionarTecla: tecla desconhecida "${nome}"`);
  const base = { key: nome, code: nome, windowsVirtualKeyCode: codigo, nativeVirtualKeyCode: codigo };
  await sessao.send('Input.dispatchKeyEvent', { ...base, type: 'rawKeyDown' });
  await sessao.send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
}

/** digita tecla a tecla — mesmo molde de `abrirSessao().digitar`
 *  (chrome.mjs): `text` é o que faz o Chrome inserir o caractere e
 *  disparar o `input` que o React escuta. Esta sonda tem sessão própria
 *  (comentário acima de `abrirSonda`) e por isso não herda o método. */
async function digitarTexto(sessao, texto) {
  for (const ch of texto) {
    const vk = ch.toUpperCase().charCodeAt(0);
    const base = {
      key: ch, text: ch, unmodifiedText: ch,
      windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk,
    };
    await sessao.send('Input.dispatchKeyEvent', { ...base, type: 'keyDown' });
    await sessao.send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
  }
}

/** dedo de verdade — mesmo molde de `arrastarNaFolha` em
 *  `a11y-celular.mjs`: toque perto do topo da folha (a alça), `passos`
 *  `touchMove` incrementais e SEM soltar — quem chama decide QUANDO
 *  soltar, para poder fotografar o instante `beforeRelease`. */
async function tocarEArrastar(sessao, seletor, percursoPx, passos = 12) {
  const ponto = await sessao.js(`(() => {
    const f = document.querySelector(${JSON.stringify(seletor)});
    if (!f) return null;
    const b = f.getBoundingClientRect();
    return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + 12) };
  })()`);
  if (!ponto) throw new Error(`tocarEArrastar: "${seletor}" não encontrado`);
  await sessao.send('Input.dispatchTouchEvent', {
    type: 'touchStart', touchPoints: [{ x: ponto.x, y: ponto.y }],
  });
  for (let n = 1; n <= passos; n++) {
    await sessao.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: ponto.x, y: ponto.y + Math.round((percursoPx * n) / passos) }],
    });
  }
}

async function tocarSoltar(sessao) {
  const t0 = Date.now();
  await sessao.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  return t0;
}

async function limparEventos(sessao) { await sessao.js('window.__eventosMotion.length = 0'); }
async function lerEventos(sessao) { return sessao.js('window.__eventosMotion'); }

/** a leitura composta de UM painel `[data-dialogo]`: retângulo, `inert`,
 *  transform/animação computados e uma descrição curta do foco — os
 *  mesmos quatro campos que os dois JSONs do auditor guardam por
 *  instante (`panel`, `transform`, `inert`, `active`). */
function jsAmostraPainel(seletor) {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(seletor)});
    const ae = document.activeElement;
    const ativo = ae ? {
      tag: ae.tagName,
      cls: (typeof ae.className === 'string' ? ae.className : ''),
      gatilho: (ae.getAttribute && ae.getAttribute('data-abre-dialogo')) || null,
    } : null;
    if (!el) return { existe: false, active: ativo };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      existe: true,
      inert: el.inert,
      rect: { x: r.x, y: r.y, width: r.width, height: r.height },
      transform: cs.transform,
      animationName: cs.animationName,
      animationDuration: cs.animationDuration,
      transitionProperty: cs.transitionProperty,
      transitionDuration: cs.transitionDuration,
      active: ativo,
    };
  })()`;
}

/** a máquina do tempo não é `[data-dialogo]` — corpo + opacidade + a
 *  linha da data (para flagrar salto no primeiro quadro, item do
 *  passo 2f). */
function jsAmostraTempo() {
  return `(() => {
    const corpo = document.querySelector('.atlas-tempo-botoes');
    const dataEl = document.querySelector('.atlas-tempo-data');
    const dr = dataEl ? dataEl.getBoundingClientRect() : null;
    const dataRect = dr ? { x: dr.x, y: dr.y } : null;
    if (!corpo) return { existe: false, dataRect };
    const cs = getComputedStyle(corpo);
    return {
      existe: true,
      sumindo: corpo.classList.contains('sumindo'),
      opacity: cs.opacity,
      transform: cs.transform,
      animationName: cs.animationName,
      dataRect,
    };
  })()`;
}

/** amostra em `alvosMs` relativos a `t0` (o instante do comando) — cada
 *  amostra guarda o `dtMs` REAL decorrido, nunca o nominal, porque a
 *  viagem de ida e volta do CDP nunca bate exato com o alvo. */
async function amostrarSequencia(sessao, t0, alvosMs, construirJs) {
  const amostras = [];
  for (const alvoMs of alvosMs) {
    const espera = alvoMs - (Date.now() - t0);
    if (espera > 0) await dorme(espera);
    const dtMs = Date.now() - t0;
    const dado = await sessao.js(construirJs());
    amostras.push({ alvoMs, dtMs, ...dado });
  }
  return amostras;
}

async function pularTour(sessao) {
  await dorme(300); // dá tempo do convite (Spotlight) montar
  return sessao.js(`(() => {
    const b = document.querySelector('.convite-linha button:not(.convite-adiante)');
    if (!b) return false;
    b.click();
    return true;
  })()`);
}

/**
 * GRAVA UM CLIPE em velocidade normal: liga `Page.startScreencast` e
 * confirma cada quadro (`screencastFrameAck` — sem o ACK o Chrome para
 * de mandar depois do primeiro). `executar` é quem faz o gesto por
 * dentro da gravação, e é POR ISSO que o quadro só é GRAVADO EM DISCO
 * depois de `executar` terminar: medido nesta sonda, um
 * `writeFileSync` de ~1440×900 dentro do ouvinte competia pelo laço do
 * Node com os `dorme()` das amostras cronometradas do PRÓPRIO passo
 * seguinte e atrasava uma amostra "aos 40 ms" para 137 ms. Guardar só
 * o base64 (nenhuma E/S) durante a janela medida e decodificar/escrever
 * depois resolveu — as amostras de `abrirCamadas` (primeiro passo, sem
 * fila de quadro nenhuma na frente) já saíam exatas antes deste
 * conserto, o que apontou a causa.
 */
async function gravarClipe(sessao, { largura, altura, pastaQuadros }, executar) {
  mkdirSync(pastaQuadros, { recursive: true });
  const brutos = [];
  const parar = sessao.onEvento((m) => {
    if (m.method !== 'Page.screencastFrame') return;
    brutos.push({ base64: m.params.data, ts: m.params.metadata.timestamp });
    sessao.send('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {});
  });
  await sessao.send('Page.startScreencast', {
    format: 'png', everyNthFrame: 1, maxWidth: largura, maxHeight: altura,
  });
  try {
    await executar();
  } finally {
    await sessao.send('Page.stopScreencast');
    parar();
  }
  return brutos.map(({ base64, ts }, i) => {
    const arquivo = resolve(pastaQuadros, `q${String(i).padStart(4, '0')}.png`);
    writeFileSync(arquivo, Buffer.from(base64, 'base64'));
    return { arquivo, ts };
  });
}

/** concat do ffmpeg com a duração REAL de cada quadro (nunca esticada) —
 *  o truque do último arquivo repetido sem `duration` é o jeito
 *  documentado do próprio ffmpeg de não perder a duração do quadro
 *  final. */
function renderizarClipe(quadros, destinoFinal) {
  if (quadros.length < 2) {
    throw new Error(`poucos quadros para um clipe (${quadros.length})`);
  }
  const arquivoLista = resolve(dirname(quadros[0].arquivo), 'lista.txt');
  const linhas = [];
  for (let i = 0; i < quadros.length; i++) {
    const dur = i < quadros.length - 1
      ? Math.max(0.001, quadros[i + 1].ts - quadros[i].ts)
      : Math.max(0.001, quadros[i].ts - quadros[i - 1].ts);
    linhas.push(`file '${quadros[i].arquivo}'`);
    linhas.push(`duration ${dur.toFixed(3)}`);
  }
  linhas.push(`file '${quadros[quadros.length - 1].arquivo}'`);
  writeFileSync(arquivoLista, `${linhas.join('\n')}\n`);
  const destino = semSobrescrever(destinoFinal);
  const r = spawnSync(FFMPEG, [
    '-y', '-f', 'concat', '-safe', '0', '-i', arquivoLista,
    '-vsync', 'vfr', '-pix_fmt', 'yuv420p', destino,
  ], { stdio: 'pipe' });
  if (r.status !== 0) {
    throw new Error(`ffmpeg falhou (${r.status}): ${(r.stderr || '').toString().slice(-800)}`);
  }
  return destino;
}

/** UMA FOLHA DE CONTATO (grade de miniaturas) do clipe LENTO, para
 *  inspeção humana sem abrir o vídeo — `fps` é CALCULADO, não fixo, para
 *  que os 5×4 = 20 quadros do `tile` cubram o clipe INTEIRO: um `fps=4`
 *  fixo (o exemplo do enunciado) só cobriria os primeiros 5 s de um
 *  clipe de dezenas de segundos, que é exatamente o tamanho de uma
 *  gravação ×6. A margem de +2 quadros evita que o `tile` fique um
 *  quadro curto por arredondamento (ffmpeg não completa a grade sem
 *  entrada suficiente). */
function renderizarContato(clipe, duracaoSegundos, destinoFinal) {
  const QUADROS_DA_GRADE = 20; // tile=5x4
  const fps = (QUADROS_DA_GRADE + 2) / Math.max(duracaoSegundos, 1);
  const destino = semSobrescrever(destinoFinal);
  const r = spawnSync(FFMPEG, [
    '-y', '-i', clipe,
    '-vf', `fps=${fps.toFixed(4)},scale=480:-1,tile=5x4`,
    '-frames:v', '1',
    destino,
  ], { stdio: 'pipe' });
  if (r.status !== 0) {
    throw new Error(`ffmpeg (folha de contato) falhou (${r.status}): ${(r.stderr || '').toString().slice(-800)}`);
  }
  return destino;
}

/**
 * `--sequencia` (C3, docs/PLANO-MOTION-UI.md linha 511) — UM fluxo
 * contínuo (busca → ficha → seção → copiar link → tempo) em vez das seis
 * provas isoladas de sempre, gravado duas vezes: em velocidade normal (o
 * clipe de aceite, e a corrida que registra as checagens de DOM) e em
 * câmera lenta (os seis tokens de deslocamento ×6 em `.hud-root`, só
 * para o olho humano inspecionar quadro a quadro — os mesmos gestos não
 * mudam o que fica verdadeiro no DOM, só a velocidade da transição).
 * O MESMO `executarFluxo` roda as duas vezes; só `fatorEspera` muda, para
 * as esperas acompanharem as transições ×6 sem apressar a segunda
 * gravação nem inventar um segundo fluxo para manter igual ao primeiro.
 */
async function rodarSequencia() {
  mkdirSync(CAPTURAS, { recursive: true });
  const pastaNormal = resolve(tmpdir(), `sonda-motion-seq-${process.pid}`);
  const pastaLenta = resolve(tmpdir(), `sonda-motion-seq-lenta-${process.pid}`);
  let sessao = null;
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim().length > 0;

    sessao = await abrirSonda({ janela: '1440x900', prefixo: 'sonda-motion-seq' });
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    // SEM ISTO o Chrome recusa `navigator.clipboard.writeText` em
    // automação — "Copiar link deste instante" falharia sempre, e o anel
    // de sucesso (`.realce-anel`) nunca acenderia para a sonda ver.
    await sessao.send('Browser.grantPermissions', {
      origin: APP,
      permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
    });
    const versaoChrome = await sessao.send('Browser.getVersion');

    const carregarApp = async () => {
      let assentou = null;
      let ultimoErro = null;
      for (let tentativa = 1; tentativa <= 3 && !assentou; tentativa++) {
        try {
          assentou = await sessao.ir(QUERY);
        } catch (e) {
          ultimoErro = e;
          process.stdout.write(`tentativa ${tentativa}/3 de carregar o app falhou: ${e.message}\n`);
          await dorme(500);
        }
      }
      if (!assentou) throw new Error(`o app não carregou em 3 tentativas (${ultimoErro?.message})`);
      await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_CAMADAS_GATILHO}'))`, 10000);
      await pularTour(sessao);
      await dorme(300);
    };

    await carregarApp();

    // OS SEIS TOKENS ×6 (só na segunda gravação) — lidos do COMPUTADO em
    // `.hud-root` e escritos de volta por `style` (especificidade maior
    // que a declaração de `:root`, então vence sem tocar no CSS). Nunca
    // hardcoded: os valores-base acabaram de mudar de mão nesta mesma
    // rodada (C3e, `--t-pressao` deixou de ser `transform` e virou
    // `scale`, mas o NÚMERO do token não mudou — mesmo assim, ler é mais
    // barato que confiar em memorizar).
    const desacelerar = () => sessao.js(`(() => {
      const raiz = document.querySelector('.hud-root') || document.documentElement;
      const cs = getComputedStyle(raiz);
      const tokens = ${JSON.stringify(TOKENS_LENTOS)};
      for (const tok of tokens) {
        const atual = cs.getPropertyValue(tok).trim();
        const n = Number.parseFloat(atual);
        if (Number.isNaN(n)) continue;
        const unidade = atual.slice(String(n).length) || 'ms';
        raiz.style.setProperty(tok, (n * 6) + unidade);
      }
      return true;
    })()`);

    const checagens = {};

    /**
     * O FLUXO ÚNICO (C3) — as seis paradas do enunciado, na ordem. Só as
     * esperas escalam com `fatorEspera` (1× na gravação normal, 6× na
     * lenta); os cliques e a digitação não precisam de régua própria
     * porque `esperarPor` já espera o DOM confirmar — o que muda de
     * velocidade é só quanto tempo aquele poll pode levar antes do teto.
     * `registrar` grava em `checagens` só na corrida normal: a lenta
     * repete os MESMOS gestos (é por isso que existe), então checar de
     * novo só re-confirmaria o que a primeira já viu.
     */
    const executarFluxo = async ({ fatorEspera, registrar }) => {
      const pausa = (ms) => dorme(ms * fatorEspera);
      const teto = (ms) => ms * fatorEspera + 2000;
      const guardar = (chave, valor) => { if (registrar) checagens[chave] = valor; };

      // 1) BUSCAR SATURNO — "sat" mostra resultado de verdade, "zzqq"
      // mostra o vazio (uma vez, per enunciado), "saturno" + Enter
      // confirma e abre a ficha.
      await clicarReal(sessao, SEL_BUSCA_GATILHO);
      await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_BUSCA_PAINEL}'))`, teto(3000));
      await digitarTexto(sessao, 'sat');
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('${SEL_BUSCA_PAINEL}')?.getAttribute('data-conteudo') === 'resultados'`,
        teto(2000)
      );
      for (let i = 0; i < 3; i++) await pressionarTecla(sessao, 'Backspace');
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('${SEL_BUSCA_PAINEL}')?.getAttribute('data-conteudo') === 'destinos'`,
        teto(2000)
      );
      await digitarTexto(sessao, 'zzqq');
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('${SEL_BUSCA_PAINEL}')?.getAttribute('data-conteudo') === 'vazio'`,
        teto(2000)
      );
      guardar('buscaSemResultado', true);
      for (let i = 0; i < 4; i++) await pressionarTecla(sessao, 'Backspace');
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('${SEL_BUSCA_PAINEL}')?.getAttribute('data-conteudo') === 'destinos'`,
        teto(2000)
      );
      await digitarTexto(sessao, 'saturno');
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('${SEL_BUSCA_PAINEL}')?.getAttribute('data-conteudo') === 'resultados'`,
        teto(2000)
      );
      await pausa(300);
      await pressionarTecla(sessao, 'Enter');
      await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_FICHA_PAINEL}'))`, teto(5000));
      await pausa(300);

      // 2) ESCOLHER JÚPITER DA MESMA FORMA — troca de verdade: é aqui que
      // o nome e o trecho de contexto confirmam com `.realce-texto`
      // (a primeira escolha, acima, nasce sem "de onde trocar").
      await clicarReal(sessao, SEL_BUSCA_GATILHO);
      await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_BUSCA_PAINEL}'))`, teto(3000));
      await digitarTexto(sessao, 'jupiter');
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('${SEL_BUSCA_PAINEL}')?.getAttribute('data-conteudo') === 'resultados'`,
        teto(2000)
      );
      await pausa(300);
      await pressionarTecla(sessao, 'Enter');
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('.atlas-ficha-nome > span')?.className.includes('realce-texto') === true`,
        teto(5000)
      );
      guardar('nomeRealceTexto', await sessao.js(
        `document.querySelector('.atlas-ficha-nome > span')?.className.includes('realce-texto') ?? null`
      ));
      guardar('contextoRealceTexto', await sessao.js(
        `document.querySelector('.atlas-contexto-alvo > span')?.className.includes('realce-texto') ?? null`
      ));

      // 3) ABRIR UMA SEÇÃO FECHADA DA FICHA — a seta gira 0→90°; o Tab
      // (6, "o teclado também funciona") entra aqui, sempre, mesmo se
      // por acaso não houver seção fechada para abrir.
      const idSecaoFechada = await sessao.js(
        `document.querySelector('.atlas-ficha-titulo button[aria-expanded="false"]')?.getAttribute('aria-controls') ?? null`
      );
      if (idSecaoFechada) {
        await clicarReal(sessao, '.atlas-ficha-titulo button[aria-expanded="false"]');
      }
      await pressionarTecla(sessao, 'Tab');
      if (idSecaoFechada) {
        await esperarPor(
          { js: sessao.js },
          `document.querySelector('.atlas-ficha-titulo button[aria-controls="${idSecaoFechada}"]')?.getAttribute('aria-expanded') === 'true'`,
          teto(3000)
        );
        await pausa(200);
        guardar('secaoAberta', await sessao.js(`(() => {
          const b = document.querySelector('.atlas-ficha-titulo button[aria-controls="${idSecaoFechada}"]');
          if (!b) return null;
          const seta = b.querySelector('.atlas-ficha-seta');
          return { expandida: b.getAttribute('aria-expanded'), rotate: seta ? getComputedStyle(seta).rotate : null };
        })()`));
      } else {
        guardar('secaoAberta', null);
      }

      // 4) AJUSTES → "Copiar link deste instante" — sucesso acende o
      // anel. `.ajustes-acoes > .ajustes-copiar` (filho DIRETO) e não só
      // `.ajustes-copiar`: "Rever o convite" é a MESMA classe, mas mora
      // um nível mais fundo (`.ajustes-item.ajustes-acao`), e no Atlas
      // (`onReverConvite` também vive ali) o `querySelector` acharia ele
      // primeiro.
      await clicarReal(sessao, SEL_AJUSTES_GATILHO);
      await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_AJUSTES_PAINEL}'))`, teto(3000));
      await pausa(200);
      await clicarReal(sessao, '.ajustes-acoes > .ajustes-copiar');
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('.ajustes-copiar .realce-anel') !== null`,
        teto(3000)
      );
      guardar('copiarAnel', await sessao.js(`document.querySelector('.ajustes-copiar .realce-anel') !== null`));
      guardar('copiarEstado', await sessao.js(
        `document.querySelector('.ajustes-copiar-estado')?.textContent ?? null`
      ));

      // 5) FECHAR COM ESC; PASSAR O MOUSE NA MÁQUINA DO TEMPO, AVANÇAR,
      // TROCAR A VELOCIDADE E VOLTAR AO VIVO (se o botão existir).
      const dataAntes = await sessao.js(
        `document.querySelector('.atlas-tempo-data')?.getBoundingClientRect().top ?? null`
      );
      await pressionarEscape(sessao);
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('${SEL_AJUSTES_PAINEL}') === null`,
        teto(3000)
      );
      const linhaDoTempo = await retanguloDe(sessao, '.atlas-tempo');
      if (linhaDoTempo) {
        await moverMouse(sessao, linhaDoTempo.x + linhaDoTempo.width / 2, linhaDoTempo.y + linhaDoTempo.height / 2);
        await esperarPor(
          { js: sessao.js },
          `getComputedStyle(document.querySelector('.atlas-tempo-botoes')).opacity === '1'`,
          teto(3000)
        );
      }
      const dataDepois = await sessao.js(
        `document.querySelector('.atlas-tempo-data')?.getBoundingClientRect().top ?? null`
      );
      guardar('linhaDaData', { antes: dataAntes, depois: dataDepois });

      await clicarReal(sessao, '[aria-label="Avançar no tempo"]');
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('.atlas-tempo-nudge-futuro') !== null`,
        teto(3000)
      );
      guardar('avancarNudge', await sessao.js(`document.querySelector('.atlas-tempo-nudge-futuro') !== null`));

      await clicarReal(sessao, '.atlas-tempo-taxa');
      await pausa(300);

      const aoVivoExiste = await sessao.js(`document.querySelector('[aria-label="Seguir o tempo real"]') !== null`);
      if (aoVivoExiste) {
        await clicarReal(sessao, '[aria-label="Seguir o tempo real"]');
        await pausa(300);
      }
    };

    // (a) VELOCIDADE NORMAL — o clipe de aceite, e a corrida que registra
    // as checagens de DOM.
    const quadrosNormais = await gravarClipe(
      sessao,
      { largura: 1440, altura: 900, pastaQuadros: pastaNormal },
      () => executarFluxo({ fatorEspera: 1, registrar: true })
    );
    const clipeNormal = renderizarClipe(quadrosNormais, resolve(CAPTURAS, `motion-c3-sequencia-${commit}.mp4`));

    // (b) CÂMERA LENTA — reabre do zero (o estado de busca/ficha/ajustes
    // do passo anterior não importa aqui) e só ENTÃO desacelera os seis
    // tokens: desacelerar ANTES da carga trocaria também a entrada do
    // painel inicial, que ninguém pediu para ver lenta.
    await carregarApp();
    await desacelerar();
    const quadrosLentos = await gravarClipe(
      sessao,
      { largura: 1440, altura: 900, pastaQuadros: pastaLenta },
      () => executarFluxo({ fatorEspera: 6, registrar: false })
    );
    const clipeLento = renderizarClipe(
      quadrosLentos,
      resolve(CAPTURAS, `motion-c3-sequencia-lenta-${commit}.mp4`)
    );
    const duracaoLenta = quadrosLentos[quadrosLentos.length - 1].ts - quadrosLentos[0].ts;
    const folha = renderizarContato(
      clipeLento,
      duracaoLenta,
      resolve(CAPTURAS, `motion-c3-folha-${commit}.png`)
    );

    const relatorio = {
      meta: {
        commit, dirty, chrome: versaoChrome.product, app: APP, query: QUERY,
        geradoEm: new Date().toISOString(),
      },
      checagens,
      clipeNormal, clipeLento, folha,
    };
    const destinoJson = semSobrescrever(resolve(CAPTURAS, `motion-c3-sequencia-${commit}.json`));
    writeFileSync(destinoJson, JSON.stringify(relatorio, null, 2));

    const linhas = [
      `=== sonda-motion c3 sequência — commit ${commit}${dirty ? ' (dirty)' : ' (limpo)'} ===`,
      `clipe normal: ${clipeNormal} (${quadrosNormais.length} quadros)`,
      `clipe lento: ${clipeLento} (${quadrosLentos.length} quadros, ${duracaoLenta.toFixed(1)}s)`,
      `folha de contato: ${folha}`,
      `busca "zzqq" mostrou vazio: ${checagens.buscaSemResultado === true}`,
      `nome (Saturno→Júpiter) ganhou .realce-texto: ${checagens.nomeRealceTexto === true}`,
      `trecho de contexto ganhou .realce-texto: ${checagens.contextoRealceTexto === true}`,
      `seção da ficha: aria-expanded=${checagens.secaoAberta?.expandida ?? '?'} rotate=${checagens.secaoAberta?.rotate ?? '?'}`,
      `copiar link: anel=${checagens.copiarAnel === true} estado="${checagens.copiarEstado ?? ''}"`,
      `"Avançar no tempo" ganhou a classe de nudge: ${checagens.avancarNudge === true}`,
      `linha da data: topo ${checagens.linhaDaData?.antes ?? '?'} → ${checagens.linhaDaData?.depois ?? '?'}`,
      `JSON: ${destinoJson}`,
    ];
    process.stdout.write(`${linhas.join('\n')}\n`);
  } catch (erro) {
    process.stdout.write(`BLOCKED: ${erro.stack || erro.message}\n`);
    process.exitCode = 1;
  } finally {
    if (sessao) await sessao.fechar();
    rmSync(pastaNormal, { recursive: true, force: true });
    rmSync(pastaLenta, { recursive: true, force: true });
  }
}

// ============================================================
// A CORRIDA
// ============================================================
// SEM REINDENTAR o bloco padrão abaixo (C3, `--sequencia`): é a corrida
// INTEIRA de sempre, só posta atrás de `if (!SEQUENCIA)` — reindentar
// ~330 linhas por estética arriscava mais erro de transcrição do que
// resolvia, e o enunciado pede o comportamento de sempre "exatamente
// como está", não o arquivo mais bonito.
if (!SEQUENCIA) {
mkdirSync(CAPTURAS, { recursive: true });
const pastaQuadrosMesa = resolve(tmpdir(), `sonda-motion-mesa-${process.pid}`);
const pastaQuadrosToque = resolve(tmpdir(), `sonda-motion-toque-${process.pid}`);

try {
  const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim().length > 0;

  const sessao = await abrirSonda({ janela: '1440x900', prefixo: 'sonda-motion' });
  try {
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    const versaoChrome = await sessao.send('Browser.getVersion');

    // NAVEGAÇÃO com até 3 tentativas — "Chrome não sobe" e "app não
    // carrega" são achados que se reportam, não se escondem num loop.
    let assentou = null;
    let ultimoErro = null;
    for (let tentativa = 1; tentativa <= 3 && !assentou; tentativa++) {
      try {
        assentou = await sessao.ir(QUERY);
      } catch (e) {
        ultimoErro = e;
        process.stdout.write(`tentativa ${tentativa}/3 de carregar o app falhou: ${e.message}\n`);
        await dorme(500);
      }
    }
    if (!assentou) {
      throw new Error(`o app não carregou em 3 tentativas (${ultimoErro?.message})`);
    }
    process.stdout.write(`app assentou por "${assentou.via}" em ${assentou.ms}ms\n`);
    await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_CAMADAS_GATILHO}'))`, 10000);
    await pularTour(sessao);
    await dorme(300);

    const dpr = await sessao.js('window.devicePixelRatio');
    const viewportInicial = await sessao.js('({ w: window.innerWidth, h: window.innerHeight })');

    // ---------------------------------------------------------------
    // MESA — 1440×900, DPR 1, mouse/teclado reais por CDP
    // ---------------------------------------------------------------
    const mesa = {};
    const quadrosMesa = await gravarClipe(
      sessao,
      { largura: 1440, altura: 900, pastaQuadros: pastaQuadrosMesa },
      async () => {
        // a) abrir Camadas
        await limparEventos(sessao);
        const t0a = Date.now();
        await clicarReal(sessao, SEL_CAMADAS_GATILHO);
        mesa.abrirCamadas = {
          amostras: await amostrarSequencia(sessao, t0a, [45, 120, 450], () => jsAmostraPainel(SEL_CAMADAS_PAINEL)),
          eventos: await lerEventos(sessao),
        };

        // b) trocar para Ajustes com Camadas aberta (E3)
        await limparEventos(sessao);
        const t0b = Date.now();
        await clicarReal(sessao, SEL_AJUSTES_GATILHO);
        mesa.trocarAjustes = {
          amostras: await amostrarSequencia(sessao, t0b, [50, 120, 450], () => jsAmostraPainel(SEL_AJUSTES_PAINEL)),
          eventos: await lerEventos(sessao),
        };

        // c) fechar com Escape (E2)
        await limparEventos(sessao);
        const t0c = Date.now();
        await pressionarEscape(sessao);
        mesa.fecharEscape = {
          amostras: await amostrarSequencia(sessao, t0c, [40, 120, 450], () => jsAmostraPainel(SEL_AJUSTES_PAINEL)),
          eventos: await lerEventos(sessao),
        };
      }
    );
    mesa.clipe = renderizarClipe(quadrosMesa, resolve(CAPTURAS, `motion-c0-mesa-${commit}.mp4`));

    // reabre Ajustes (fora da gravação) para os passos e) e d) —
    // invertidos de propósito: d) solta o dedo LONGE do botão para não
    // fechar por baixo do que e) ainda precisa medir.
    await clicarReal(sessao, SEL_AJUSTES_GATILHO);
    await dorme(500);

    // e) segmentado "Qualidade": escolhe outra opção e mede o filete
    const antesSeg = await sessao.js(`(() => {
      const g = document.querySelector(${JSON.stringify(SEL_SEG_QUALIDADE)});
      const on = g && g.querySelector(':scope > .on');
      return on ? on.textContent.trim() : null;
    })()`);
    const t0e = Date.now();
    await clicarReal(sessao, `${SEL_SEG_QUALIDADE} button:not(.on):not(:disabled)`);
    const amostrasSeg = await amostrarSequencia(sessao, t0e, [45, 120, 450], () => `(() => {
      const g = document.querySelector(${JSON.stringify(SEL_SEG_QUALIDADE)});
      if (!g) return { existe: false };
      const cs = getComputedStyle(g);
      const on = g.querySelector(':scope > .on');
      const gRect = g.getBoundingClientRect();
      const bRect = on ? on.getBoundingClientRect() : null;
      return {
        existe: true,
        segX: cs.getPropertyValue('--seg-x').trim(),
        segW: cs.getPropertyValue('--seg-w').trim(),
        onTexto: on ? on.textContent.trim() : null,
        botaoRelativoX: bRect ? bRect.x - gRect.x : null,
        botaoLargura: bRect ? bRect.width : null,
      };
    })()`);
    mesa.segmentadoQualidade = { antes: antesSeg, amostras: amostrasSeg };

    // d) segurar o fechar do Ajustes (E4) — solta longe de propósito
    const rectFecharAntes = await retanguloDe(sessao, `${SEL_AJUSTES_PAINEL} .hud-fechar`);
    const cx = rectFecharAntes.x + rectFecharAntes.width / 2;
    const cy = rectFecharAntes.y + rectFecharAntes.height / 2;
    await sessao.send('Input.dispatchMouseEvent', {
      x: cx, y: cy, type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse',
    });
    await dorme(180);
    const rectFecharDurante = await retanguloDe(sessao, `${SEL_AJUSTES_PAINEL} .hud-fechar`);
    // o DESENHO de dentro (o ícone), que é quem deve afundar desde o C2 —
    // a caixa acima tem de ficar igual, e este tem de encolher
    const rectIconeDurante = await retanguloDe(sessao, `${SEL_AJUSTES_PAINEL} .hud-fechar > *`);
    await sessao.send('Input.dispatchMouseEvent', {
      x: cx, y: cy - 100, type: 'mouseMoved', pointerType: 'mouse', buttons: 1,
    });
    await sessao.send('Input.dispatchMouseEvent', {
      x: cx, y: cy - 100, type: 'mouseReleased', button: 'left', buttons: 0, pointerType: 'mouse',
    });
    await dorme(450);
    const rectFecharDepois = await retanguloDe(sessao, `${SEL_AJUSTES_PAINEL} .hud-fechar`);
    const rectIconeDepois = await retanguloDe(sessao, `${SEL_AJUSTES_PAINEL} .hud-fechar > *`);
    mesa.segurarFechar = {
      antes: rectFecharAntes,
      durante: rectFecharDurante,
      depois: rectFecharDepois,
      iconeDurante: rectIconeDurante,
      iconeDepois: rectIconeDepois,
    };

    // fecha de vez (Escape) antes de passar à máquina do tempo
    await pressionarEscape(sessao);
    await dorme(500);

    // f) hover na máquina do tempo (abre/fecha sozinha)
    const linhaDoTempo = await retanguloDe(sessao, '.atlas-tempo');
    let tempoEntrada = null;
    let tempoSaida = null;
    if (linhaDoTempo) {
      const t0f1 = Date.now();
      await moverMouse(sessao, linhaDoTempo.x + linhaDoTempo.width / 2, linhaDoTempo.y + linhaDoTempo.height / 2);
      tempoEntrada = await amostrarSequencia(sessao, t0f1, [45, 120, 450], jsAmostraTempo);
      const t0f2 = Date.now();
      await moverMouse(sessao, 10, 10);
      tempoSaida = await amostrarSequencia(sessao, t0f2, [45, 120, 360, 500], jsAmostraTempo);
    }
    mesa.maquinaDoTempo = { entrada: tempoEntrada, saida: tempoSaida };

    // ---------------------------------------------------------------
    // TELEFONE — 390×844, toque emulado
    // ---------------------------------------------------------------
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    await sessao.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await dorme(300);

    const telefone = { viewportInicial: { width: 390, height: 844, dpr: 1 } };
    const quadrosToque = await gravarClipe(
      sessao,
      { largura: 390, altura: 844, pastaQuadros: pastaQuadrosToque },
      async () => {
        await sessao.js(`document.querySelector('${SEL_CAMADAS_GATILHO}').click()`);
        await dorme(400);
        const antes = await sessao.js(jsAmostraPainel(SEL_CAMADAS_PAINEL));
        await tocarEArrastar(sessao, SEL_CAMADAS_PAINEL, 115, 12);
        const beforeRelease = await sessao.js(`(() => {
          const f = document.querySelector(${JSON.stringify(SEL_CAMADAS_PAINEL)});
          if (!f) return null;
          const r = f.getBoundingClientRect();
          return { inline: f.getAttribute('style'), rect: { x: r.x, y: r.y, width: r.width, height: r.height } };
        })()`);
        await limparEventos(sessao);
        const tSolta = await tocarSoltar(sessao);
        telefone.arrastarESoltar = {
          antes,
          beforeRelease,
          // o 500 confere que a saída TERMINA e desmonta — sem ele, uma folha
          // que escorrega até fora da tela e fica presa lá passaria por boa
          amostras: await amostrarSequencia(sessao, tSolta, [13, 18, 60, 150, 300, 500], () => jsAmostraPainel(SEL_CAMADAS_PAINEL)),
          eventos: await lerEventos(sessao),
        };
      }
    );
    telefone.clipe = renderizarClipe(quadrosToque, resolve(CAPTURAS, `motion-c0-toque-${commit}.mp4`));

    // reabre e fecha pelo botão, girando DURANTE a saída (E6) — fora da
    // gravação: só o arrasto (passo 3) entra no clipe.
    await sessao.js(`document.querySelector('${SEL_CAMADAS_GATILHO}').click()`);
    await dorme(400);
    await sessao.js(`(() => {
      const b = document.querySelector('${SEL_CAMADAS_PAINEL} .hud-fechar');
      if (b) b.click();
      return Boolean(b);
    })()`);
    await dorme(30); // a saída (saiPainel, ~260ms) já começou
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: 844, height: 390, deviceScaleFactor: 1, mobile: true,
    });
    const tGiro = Date.now();
    const [amostraGiro] = await amostrarSequencia(sessao, tGiro, [100], () => jsAmostraPainel(SEL_CAMADAS_PAINEL));
    telefone.reabrirEGirar = { viewportGirado: { width: 844, height: 390 }, amostra: amostraGiro };

    // ---------------------------------------------------------------
    // MOVIMENTO REDUZIDO — mesa de novo, prefers-reduced-motion: reduce
    // ---------------------------------------------------------------
    await sessao.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    await sessao.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await dorme(150);
    await sessao.js(`document.querySelector('${SEL_CAMADAS_GATILHO}').click()`);
    await dorme(400);
    // O PRÓPRIO `.hud-interruptor` transita com `--t-rapido` (fundo/borda);
    // é o `::after` (a bolinha) quem usa `--t-normal` (transform/fundo) —
    // o achado do auditor (E5) é sobre a BOLINHA, não sobre a caixa: sem
    // ler o `::after` esta amostra mede o token errado.
    const reducedMotion = await sessao.js(`(() => {
      const chk = document.querySelector('${SEL_CAMADAS_PAINEL} .hud-interruptor');
      if (!chk) return null;
      const cs = getComputedStyle(chk);
      const csDepois = getComputedStyle(chk, '::after');
      return {
        checked: chk.checked,
        transitionDuration: cs.transitionDuration,
        transitionProperty: cs.transitionProperty,
        bolinhaTransitionDuration: csDepois.transitionDuration,
        bolinhaTransitionProperty: csDepois.transitionProperty,
        tokenRapido: cs.getPropertyValue('--t-rapido').trim(),
        tokenEntrada: cs.getPropertyValue('--t-entrada').trim(),
        tokenNormal: cs.getPropertyValue('--t-normal').trim(),
      };
    })()`);

    // ---------------------------------------------------------------
    // RELATÓRIO
    // ---------------------------------------------------------------
    const relatorio = {
      meta: {
        commit,
        dirty,
        chrome: versaoChrome.product,
        userAgent: versaoChrome.userAgent,
        app: APP,
        query: QUERY,
        idioma: 'pt-BR',
        preset: 'performance',
        ui: 'default (sem ?ui=)',
        viewportInicial,
        dpr,
        geradoEm: new Date().toISOString(),
      },
      mesa: { viewport: { width: 1440, height: 900, dpr: 1 }, ...mesa },
      telefone,
      reducedMotion: { camadasInterruptor: reducedMotion },
    };
    const destinoJson = semSobrescrever(resolve(CAPTURAS, `motion-c0-${commit}.json`));
    writeFileSync(destinoJson, JSON.stringify(relatorio, null, 2));

    // ---------------------------------------------------------------
    // RESUMO
    // ---------------------------------------------------------------
    const em = (amostras, alvoMs) => amostras.find((a) => a.alvoMs === alvoMs) || amostras[0];
    const e1 = telefone.arrastarESoltar.amostras;
    // "cedo" é o PRIMEIRO instante em que já sumiu, não o primeiro
    // checkpoint da lista — os alvos (13/18/60/150/300ms) são
    // crescentes, então o primeiro `existe:false` na ordem já é o mais
    // cedo que a sonda flagrou.
    const e1UltimoPresente = [...e1].reverse().find((a) => a.existe === true);
    const e1PrimeiroAusente = e1.find((a) => a.existe === false);
    const e1ReproduzCedo = Boolean(e1PrimeiroAusente && e1PrimeiroAusente.alvoMs <= 60);
    const e2 = em(mesa.fecharEscape.amostras, 40);
    const e2Reproduz = e2.existe === true && e2.active?.tag === 'BODY';
    const e3 = em(mesa.trocarAjustes.amostras, 50);
    // DESLOCADO EM RELAÇÃO A ONDE ASSENTA, e não em relação à borda da
    // tela: o Ajustes mora em x≈944 numa janela de 1440, então "x > 100"
    // acusava o próprio lugar de repouso como recomeço.
    const e3Assentado = mesa.trocarAjustes.amostras[mesa.trocarAjustes.amostras.length - 1];
    const e3OffsetX = e3.existe && e3Assentado?.existe ? e3.rect.x - e3Assentado.rect.x : null;
    const e3Reproduz = e3OffsetX !== null && Math.abs(e3OffsetX) > 4;
    const iconeDurante = mesa.segurarFechar.iconeDurante;
    const iconeDepois = mesa.segurarFechar.iconeDepois;
    const e4Encolhe = rectFecharDurante.width < rectFecharAntes.width - 0.5;
    const e5Reproduz = reducedMotion && Number.parseFloat(reducedMotion.bolinhaTransitionDuration) > 0.05;
    const e6Reproduz = amostraGiro.existe === true && amostraGiro.inert === true;

    const linhas = [
      `=== sonda-motion c0 — commit ${commit}${dirty ? ' (dirty)' : ' (limpo)'} ===`,
      `Chrome ${versaoChrome.product} | mesa 1440x900 DPR${dpr} | pt-BR | q=performance`,
      `clipe mesa: ${mesa.clipe} (${quadrosMesa.length} quadros)`,
      `clipe toque: ${telefone.clipe} (${quadrosToque.length} quadros)`,
      `E1 folha solta (toque): presente aos ${e1UltimoPresente ? e1UltimoPresente.dtMs.toFixed(1) : '—'}ms, `
        + `ausente aos ${e1PrimeiroAusente ? e1PrimeiroAusente.dtMs.toFixed(1) : 'nunca (ficou até o fim)'}ms `
        + `(transição declarada ${e1UltimoPresente?.transitionDuration ?? '?'}) — `
        + `${e1ReproduzCedo ? 'reproduz (some bem antes da transição acabar)' : e1PrimeiroAusente ? 'não reproduz' : 'PRESA (a saída não desmontou)'}`,
      `E2 foco no Esc (mesa): aos ${e2.dtMs}ms active=${e2.active?.tag}/${e2.active?.gatilho ?? '-'} painel=${e2.existe} — `
        + `${e2Reproduz ? 'reproduz (foco em BODY, painel ainda visível)' : 'não reproduz'}`,
      `E3 troca Camadas→Ajustes (mesa): aos ${e3.dtMs}ms deslocado ${e3OffsetX}px do repouso — `
        + `${e3Reproduz ? 'reproduz (recomeça deslocado)' : 'não reproduz (já assentado)'}`,
      `E4 caixa do fechar sob pressão: antes ${rectFecharAntes.width.toFixed(2)}px, durante ${rectFecharDurante.width.toFixed(2)}px, depois ${rectFecharDepois.width.toFixed(2)}px — `
        + `${e4Encolhe ? 'reproduz (encolhe sob pressão)' : 'não reproduz'}`
        + ` | ícone ${iconeDurante ? iconeDurante.width.toFixed(2) : '?'}px pressionado × ${iconeDepois ? iconeDepois.width.toFixed(2) : '?'}px solto`,
      `E5 reduced motion (bolinha do interruptor de Camadas, ::after): transitionDuration=${reducedMotion?.bolinhaTransitionDuration ?? '?'} (caixa=${reducedMotion?.transitionDuration}/--t-rapido=${reducedMotion?.tokenRapido}, --t-entrada=${reducedMotion?.tokenEntrada}, --t-normal=${reducedMotion?.tokenNormal}) — `
        + `${e5Reproduz ? 'reproduz (a bolinha ainda transiciona por --t-normal)' : 'não reproduz'}`,
      `E6 giro durante a saída (toque): aos ${amostraGiro.dtMs}ms existe=${amostraGiro.existe} inert=${amostraGiro.inert} animation=${amostraGiro.animationName} — `
        + `${e6Reproduz ? 'reproduz (ainda executando a saída antiga)' : 'não reproduz'}`,
      `segmentado "Qualidade": ${antesSeg} → ${amostrasSeg[amostrasSeg.length - 1]?.onTexto}, --seg-x/--seg-w em ${JSON.stringify(amostrasSeg[amostrasSeg.length - 1]?.segX)}/${JSON.stringify(amostrasSeg[amostrasSeg.length - 1]?.segW)}`,
      `máquina do tempo (hover): entrada opacity ${tempoEntrada?.[0]?.opacity}→${tempoEntrada?.[tempoEntrada.length - 1]?.opacity}, saída ${tempoSaida?.[0]?.opacity}→${tempoSaida?.[tempoSaida.length - 1]?.opacity}, existe no fim=${tempoSaida?.[tempoSaida.length - 1]?.existe}`,
      `JSON: ${destinoJson}`,
    ];
    process.stdout.write(`${linhas.join('\n')}\n`);
  } finally {
    await sessao.fechar();
  }
} catch (erro) {
  process.stdout.write(`BLOCKED: ${erro.stack || erro.message}\n`);
  process.exitCode = 1;
} finally {
  rmSync(pastaQuadrosMesa, { recursive: true, force: true });
  rmSync(pastaQuadrosToque, { recursive: true, force: true });
}
} else {
  await rodarSequencia();
}
