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
//   node scripts/visual/sonda-motion.mjs --folha --app=http://localhost:58697
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
// `--interrupcoes` troca a corrida de sempre por CINCO cenários de
// INTERROMPER um movimento no meio (I1–I5, o complemento do C1/C2/C3:
// aquelas provas rodam o gesto inteiro sem cutucar — estas cutucam de
// propósito). Cobre quatro formas de interrupção: fechar a sanfona
// "Avançado" no meio de uma abertura e reabri-la no meio de um
// fechamento; ligar "reduzir movimento" NO MEIO de uma transição
// (painel entrando/saindo, linha do tempo); redimensionar a janela sem
// cruzar o ponto de quebra do celular (760px) enquanto algo anima; e
// interromper a própria linha do tempo com um redimensionamento (I4) ou
// um Esc (I5). Cada cenário amostra com `amostrarSequencia` (dtMs REAL,
// nunca o nominal) e imprime PASSA/FALHA a partir dos números — não
// julga por fora, só mede. Opt-in: sem a flag, nada aqui muda.
const INTERRUPCOES = process.argv.includes('--interrupcoes');
// `--folha` troca a corrida de sempre por OITO cenários (F1–F8) da FOLHA
// GUIADA PELA MÃO no telefone (C4 do plano de motion, `useGavetas.ts`,
// `destinoDoArrasto`/`deslocamentoDaFolha`): a alça do cabeçalho
// (`.hud-cabecalho-eyebrow`, fora de qualquer botão) expande a compacta
// arrastando para cima e recolhe a expandida arrastando para baixo,
// seguindo o dedo até a decisão no soltar. Cobre as quatro guardas que
// não podem quebrar o gesto — um controle deslizante, um segundo dedo, a
// rolagem já dentro da expandida, e a paisagem baixa da MESA (onde a
// folha existe por `janelaBaixa`, não por `celular`, e o gesto não liga)
// — e amostra com `jsAmostraFolha` (estado, topo, transform, WAAPI,
// linha do tempo), como `rodarInterrupcoes`: PASSA/FALHA só a partir dos
// números medidos. Opt-in: sem a flag, nada aqui muda.
const FOLHA = process.argv.includes('--folha');

const SEL_CAMADAS_GATILHO = '[data-abre-dialogo="camadas"]';
const SEL_AJUSTES_GATILHO = '[data-abre-dialogo="ajustes"]';
const SEL_CAMADAS_PAINEL = '[data-dialogo="camadas"]';
const SEL_AJUSTES_PAINEL = '[data-dialogo="ajustes"]';
const SEL_SEG_QUALIDADE = `${SEL_AJUSTES_PAINEL} .ajustes-seg[aria-label="Qualidade"]`;
const SEL_BUSCA_GATILHO = '[data-abre-dialogo="busca"]';
const SEL_BUSCA_PAINEL = '[data-dialogo="busca"]';
const SEL_FICHA_PAINEL = '[data-dialogo="ficha"]';
// A ALÇA E O "DETALHES" DA FICHA (`--folha`) — a alça é o EYEBROW do
// cabeçalho (só texto, nenhum botão dentro: `pontoDaAlca` confere em
// tempo de execução antes de usar o ponto), "Detalhes" é o botão que
// expande a compacta sem arrasto nenhum (F7/F8).
const SEL_FICHA_EYEBROW = '.hud-cabecalho-eyebrow';
const SEL_FICHA_DETALHES = '.atlas-ficha-detalhes';
// A SANFONA "AVANÇADO" (I1) e A LINHA DO TEMPO (I2c, I4, I5) — únicos
// alvos novos desta sonda que não são um `[data-dialogo]`.
const SEL_AVANCADO_GATILHO = '[aria-controls="ajustes-avancado"]';
const SEL_AVANCADO_CORPO = '#ajustes-avancado';
const SEL_TEMPO_CABECALHO = '.atlas-tempo-cabecalho';
const SEL_TEMPO_LINHA = '.atlas-tempo-linha';
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

/** o CENTRO da alça (o eyebrow do cabeçalho da ficha,
 *  `.hud-cabecalho-eyebrow`) — o ponto onde o dedo começa o arrasto
 *  guiado (`--folha`, F1–F5 e F7). Confere por `elementFromPoint` que o
 *  ponto não caiu dentro de um botão — o eyebrow é só texto (o "?" e os
 *  botões são IRMÃOS dele, nunca filhos), mas a checagem é em tempo de
 *  execução, não por confiança na leitura do código; se cair, usa a
 *  borda esquerda do próprio cabeçalho, onde não há botão nenhum. */
async function pontoDaAlca(sessao) {
  const r = await retanguloDe(sessao, SEL_FICHA_EYEBROW);
  if (!r) throw new Error(`pontoDaAlca: "${SEL_FICHA_EYEBROW}" não encontrado`);
  let x = Math.round(r.x + r.width / 2);
  let y = Math.round(r.y + r.height / 2);
  const dentroDeBotao = await sessao.js(
    `Boolean(document.elementFromPoint(${x}, ${y})?.closest('button'))`
  );
  if (dentroDeBotao) {
    const cab = await retanguloDe(sessao, '.hud-cabecalho');
    if (!cab) throw new Error('pontoDaAlca: ".hud-cabecalho" não encontrado');
    x = Math.round(cab.x + 16);
    y = Math.round(cab.y + cab.height / 2);
  }
  return { x, y };
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
    const linhaDoTempo = document.timeline.currentTime;
    if (!el) return { existe: false, active: ativo, linhaDoTempo };
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
      // QUEM MOVE O PAINEL DESDE O C1 É A WAAPI (movimentoDaGaveta.ts) —
      // os campos de CSS acima ficam em "none"/"0s" o tempo todo. O estado
      // real é este: pendente (ainda sem quadro para começar), rodando,
      // terminada. E a linha do tempo do documento só anda quando o
      // navegador produz quadro: é ela que separa "a animação parou" de
      // "o Chrome da sonda não desenhou nada".
      waapi: el.getAnimations().map((a) => ({
        playState: a.playState,
        pending: a.pending,
        currentTime: a.currentTime === null ? null : Math.round(Number(a.currentTime)),
      })),
      linhaDoTempo,
      active: ativo,
    };
  })()`;
}

/** a leitura composta da FOLHA da ficha no celular (`--folha`): o mesmo
 *  molde de `jsAmostraPainel` (transform computado, WAAPI, linha do
 *  tempo), com o ESTADO (`data-ficha-estado`, compacta/expandida) e o
 *  TOPO (`getBoundingClientRect().top`) a mais — os dois campos que só
 *  esta folha tem e que o dedo persegue durante o arrasto guiado. */
function jsAmostraFolha() {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(SEL_FICHA_PAINEL)});
    const linhaDoTempo = document.timeline.currentTime;
    if (!el) return { existe: false, estado: null, top: null, transform: null, waapi: [], linhaDoTempo };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      existe: true,
      estado: el.getAttribute('data-ficha-estado'),
      top: r.top,
      transform: cs.transform,
      waapi: el.getAnimations().map((a) => ({
        playState: a.playState,
        pending: a.pending,
        currentTime: a.currentTime === null ? null : Math.round(Number(a.currentTime)),
      })),
      linhaDoTempo,
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

/** a leitura composta da SANFONA "Avançado" dos Ajustes (I1,
 *  `--interrupcoes`): existência, as classes (`abrindo`/`saindo`, que
 *  convivem — comentário de `usePresenca.ts`, "reabrir no meio da saída
 *  reinicia a entrada"), e o par que decide se o corte está ativo —
 *  `overflow` computado do `.sanfona-miolo` (nunca a classe, que só diz
 *  a INTENÇÃO) e as duas alturas (`sanfonaClientHeight` colapsada,
 *  `mioloScrollHeight` cheio) para enxergar o meio do caminho mesmo sem
 *  o overflow mudar. */
function jsAmostraSanfona() {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(SEL_AVANCADO_CORPO)});
    if (!el) return { existe: false };
    const miolo = el.querySelector('.sanfona-miolo');
    return {
      existe: true,
      className: el.className,
      overflow: miolo ? getComputedStyle(miolo).overflow : null,
      sanfonaClientHeight: el.clientHeight,
      mioloScrollHeight: miolo ? miolo.scrollHeight : null,
      linhaDoTempo: document.timeline.currentTime,
    };
  })()`;
}

/** a sanfona está ANIMANDO nesta amostra? Pelo estado dela, e não pelo
 *  relógio da sonda: saindo, ou com a caixa menor que o conteúdo. O
 *  cronômetro da sonda não serve para isso — com a gravação ligada a
 *  página às vezes fica sem quadro e um alvo de "+400 ms" cai no meio
 *  da animação (medido: a reabertura só começou aos ~450 ms). */
const sanfonaAnimando = (a) =>
  a.existe && (a.className.includes('saindo') || a.sanfonaClientHeight < a.mioloScrollHeight - 1);

/** o `transform` computado da linha do tempo (I2c, `--interrupcoes`) —
 *  só o campo que aquele passo precisa, para não confundir com a leitura
 *  cheia de `jsAmostraTempo` (que é sobre `.atlas-tempo-botoes`, não
 *  `.atlas-tempo-linha`). */
function jsTransformDaLinhaDoTempo() {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(SEL_TEMPO_LINHA)});
    return { transform: el ? getComputedStyle(el).transform : null };
  })()`;
}

/** o `y` da linha do tempo (I4/I5, `--interrupcoes`) — o FLIP de
 *  `HudDoAtlas.tsx` anima esta linha por `translateY`, então a posição
 *  na tela (não o transform bruto) é o que conta um salto de verdade. */
function jsYDaLinhaDoTempo() {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(SEL_TEMPO_LINHA)});
    return { y: el ? el.getBoundingClientRect().y : null };
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

/**
 * `--interrupcoes` — CINCO cenários de INTERROMPER um movimento no meio
 * (I1–I5, o complemento de C1/C2/C3: aquelas provas rodam o gesto
 * inteiro sem cutucar no meio, estas cutucam de propósito). Cada
 * cenário tem o seu próprio `t0` e usa `amostrarSequencia` para o
 * `dtMs` REAL — o mesmo padrão de `rodarSequencia`, só que sem um fluxo
 * único: os cinco são independentes, e cada um decide sozinho se PASSA
 * ou FALHA a partir dos números medidos, sem espera extra para o
 * veredito bater.
 */
async function rodarInterrupcoes() {
  mkdirSync(CAPTURAS, { recursive: true });
  const pastaSanfona = resolve(tmpdir(), `sonda-motion-int-sanfona-${process.pid}`);
  const pastaTempo = resolve(tmpdir(), `sonda-motion-int-tempo-${process.pid}`);
  let sessao = null;
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim().length > 0;

    sessao = await abrirSonda({ janela: '1440x900', prefixo: 'sonda-motion-int' });
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    const versaoChrome = await sessao.send('Browser.getVersion');

    // NAVEGAÇÃO com até 3 tentativas — mesma régua do bloco padrão
    // (abaixo de `if (!SEQUENCIA)`): "Chrome não sobe" e "app não
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
    if (!assentou) throw new Error(`o app não carregou em 3 tentativas (${ultimoErro?.message})`);
    process.stdout.write(`app assentou por "${assentou.via}" em ${assentou.ms}ms\n`);
    await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_CAMADAS_GATILHO}'))`, 10000);
    await pularTour(sessao);
    await dorme(300);

    const dpr = await sessao.js('window.devicePixelRatio');

    // espera até `t0 + alvoMs` (nunca negativo) — o mesmo cálculo que
    // `amostrarSequencia` já faz por amostra, aqui isolado porque estes
    // cenários intercalam UMA AÇÃO (o clique, o resize, o "reduzir
    // movimento") entre amostras, e não só amostras em fila.
    const esperarAte = async (t0, alvoMs) => {
      const resta = alvoMs - (Date.now() - t0);
      if (resta > 0) await dorme(resta);
    };
    // "a entrada assentou" — `transform: none` (CSS) OU a WAAPI vazia ou
    // toda `finished` (o dono do movimento desde o C1, `movimentoDaGaveta.ts`)
    // — nunca `existe === false`, que aqui é falha (um painel que estava
    // ENTRANDO tem de existir).
    const emRepouso = (amostra) => {
      if (amostra.existe === false) return false;
      if (amostra.transform === 'none') return true;
      return (amostra.waapi ?? []).length === 0 || amostra.waapi.every((w) => w.playState === 'finished');
    };

    // ---------------------------------------------------------------
    // I1 — a sanfona "Avançado": fechar no meio de uma ABERTURA e
    // REABRIR no meio de um FECHAMENTO (o `abrindo`/`saindo` que
    // convivem, comentário de `usePresenca.ts`). O corte
    // (`overflow: hidden` do `.sanfona-miolo`) só pode existir ENQUANTO
    // anima — em repouso, aberta OU fechada, tem de sumir.
    // ---------------------------------------------------------------
    await clicarReal(sessao, SEL_AJUSTES_GATILHO);
    await dorme(400);
    await clicarReal(sessao, SEL_AVANCADO_GATILHO); // abre
    await dorme(400);
    const i1RepousoAberta = await sessao.js(jsAmostraSanfona());

    const t0Fechar1 = Date.now();
    await clicarReal(sessao, SEL_AVANCADO_GATILHO); // fecha, sem interromper
    const i1Fechar1 = await amostrarSequencia(sessao, t0Fechar1, [20, 80, 150], jsAmostraSanfona);
    await dorme(400); // assenta fechada antes do gesto que entra no clipe

    let i1Aos20 = null;
    let i1Reentrada = [];
    const quadrosSanfona = await gravarClipe(
      sessao,
      { largura: 1440, altura: 900, pastaQuadros: pastaSanfona },
      async () => {
        await clicarReal(sessao, SEL_AVANCADO_GATILHO); // abre de novo
        await dorme(400);
        const t0Fechar2 = Date.now();
        await clicarReal(sessao, SEL_AVANCADO_GATILHO); // fecha de novo
        // aos 20ms a reabertura (60ms) ainda não aconteceu — esta
        // amostra tem de sair ANTES do clique, senão mede o efeito
        // errado.
        await esperarAte(t0Fechar2, 20);
        i1Aos20 = { alvoMs: 20, dtMs: Date.now() - t0Fechar2, ...(await sessao.js(jsAmostraSanfona())) };
        await esperarAte(t0Fechar2, 60);
        await clicarReal(sessao, SEL_AVANCADO_GATILHO); // reabre NO MEIO da saída
        i1Reentrada = await amostrarSequencia(sessao, t0Fechar2, [100, 400], jsAmostraSanfona);
      }
    );
    const clipeSanfona = renderizarClipe(quadrosSanfona, resolve(CAPTURAS, `motion-interrupcoes-sanfona-${commit}.mp4`));
    const duracaoSanfona = quadrosSanfona[quadrosSanfona.length - 1].ts - quadrosSanfona[0].ts;
    const folhaSanfona = renderizarContato(
      clipeSanfona,
      duracaoSanfona,
      resolve(CAPTURAS, `motion-interrupcoes-sanfona-${commit}.png`)
    );

    // O REPOUSO DEPOIS DA REABERTURA é lido quando a gravação já parou e o
    // clipe já foi montado — a animação (--t-entrada) acabou há muito; é
    // uma amostra de repouso, não uma espera para o veredito passar
    const i1RepousoReaberta = await sessao.js(jsAmostraSanfona());
    // cada amostra é julgada pelo PRÓPRIO estado (`sanfonaAnimando`):
    // animando → corte ligado; em repouso → corte desligado
    const i1Amostras = [...i1Fechar1, i1Aos20, ...i1Reentrada].filter((a) => a?.existe);
    const i1AnimandoEscondeu = i1Amostras
      .filter(sanfonaAnimando)
      .every((a) => a.overflow === 'hidden');
    const i1RepousoVisivel = [i1RepousoAberta, i1RepousoReaberta, ...i1Amostras.filter((a) => !sanfonaAnimando(a))]
      .every((a) => !a.existe || a.overflow === 'visible');
    const i1ReabriuDeVerdade = i1RepousoReaberta.existe && !sanfonaAnimando(i1RepousoReaberta);
    const i1Passa = i1AnimandoEscondeu && i1RepousoVisivel && i1ReabriuDeVerdade;

    // fecha os Ajustes antes do I2 (deixa o app limpo para o próximo gesto)
    await pressionarEscape(sessao);
    await dorme(400);

    // ---------------------------------------------------------------
    // I2 — "reduzir movimento" ligado NO MEIO da transição: painel
    // saindo, painel entrando, linha do tempo entrando. Ligar
    // `prefers-reduced-motion: reduce` no meio tem de travar o
    // movimento EM CURSO, não só bloquear o próximo.
    // ---------------------------------------------------------------
    const ligarReduzido = () => sessao.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    const desligarReduzido = () => sessao.send('Emulation.setEmulatedMedia', { features: [] });

    // (a) painel SAINDO
    await clicarReal(sessao, SEL_CAMADAS_GATILHO);
    await dorme(400);
    const t0I2a = Date.now();
    await clicarReal(sessao, `${SEL_CAMADAS_PAINEL} .hud-fechar`);
    await esperarAte(t0I2a, 40);
    const t1I2a = Date.now();
    await ligarReduzido();
    const i2aAmostras = await amostrarSequencia(sessao, t1I2a, [10, 60], () => jsAmostraPainel(SEL_CAMADAS_PAINEL));
    await desligarReduzido();
    await dorme(300);
    const i2aAos60 = i2aAmostras[1];
    // "no pior caso" ainda presente, mas inerte — nunca interativo
    const i2aSumiu = i2aAos60.existe === false || i2aAos60.inert === true;
    const i2aFocoVoltou = i2aAos60.active?.gatilho === 'camadas';
    const i2aPassa = i2aSumiu && i2aFocoVoltou;

    // (b) painel ENTRANDO
    const t0I2b = Date.now();
    await clicarReal(sessao, SEL_CAMADAS_GATILHO);
    await esperarAte(t0I2b, 40);
    const t1I2b = Date.now();
    await ligarReduzido();
    // +10 fica no registro, mas quem julga é +60 — a mesma régua do (a):
    // a página só fica sabendo da preferência nova no PRÓXIMO quadro (o
    // evento `change` da media query nasce no passo de renderização), e
    // aos 10 ms esse quadro ainda não tinha chegado (medido: a WAAPI da
    // entrada ainda em 17 ms, sem um quadro entre o comando e a amostra)
    const [i2bAos10, i2bAmostra] = await amostrarSequencia(sessao, t1I2b, [10, 60], () => jsAmostraPainel(SEL_CAMADAS_PAINEL));
    await desligarReduzido();
    await pressionarEscape(sessao);
    await dorme(400);
    const i2bPassa = emRepouso(i2bAmostra);

    // (c) linha do tempo ENTRANDO (hover)
    const rectCabecalhoI2 = await retanguloDe(sessao, SEL_TEMPO_CABECALHO);
    const t0I2c = Date.now();
    await moverMouse(sessao, rectCabecalhoI2.x + rectCabecalhoI2.width / 2, rectCabecalhoI2.y + rectCabecalhoI2.height / 2);
    await esperarAte(t0I2c, 40);
    const t1I2c = Date.now();
    await ligarReduzido();
    // mesma régua do (b): julga no quadro seguinte (+60), guarda o +10
    const [i2cAos10, i2cAmostra] = await amostrarSequencia(sessao, t1I2c, [10, 60], jsTransformDaLinhaDoTempo);
    await desligarReduzido();
    await moverMouse(sessao, 10, 10);
    await dorme(1000);
    const i2cPassa = i2cAmostra.transform === 'none';

    const i2Passa = i2aPassa && i2bPassa && i2cPassa;

    // ---------------------------------------------------------------
    // I3 — redimensionar a janela NO MEIO de uma transição, sem cruzar
    // os 760px do ponto de quebra do celular — a mesma guarda de
    // "reduzir movimento" (I2) vale para resize: as duas são formas de
    // "o navegador decidiu que este movimento não vai terminar como
    // começou".
    // ---------------------------------------------------------------
    // (a) mesa, painel SAINDO
    await clicarReal(sessao, SEL_CAMADAS_GATILHO);
    await dorme(400);
    const t0I3a = Date.now();
    await clicarReal(sessao, `${SEL_CAMADAS_PAINEL} .hud-fechar`);
    await esperarAte(t0I3a, 40);
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    const t1I3a = Date.now();
    const [i3aAmostra] = await amostrarSequencia(sessao, t1I3a, [10], () => jsAmostraPainel(SEL_CAMADAS_PAINEL));
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    const i3aPassa = i3aAmostra.existe === false;

    // (b) mesa, painel ENTRANDO
    const t0I3b = Date.now();
    await clicarReal(sessao, SEL_CAMADAS_GATILHO);
    await esperarAte(t0I3b, 40);
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: 1300, height: 850, deviceScaleFactor: 1, mobile: false,
    });
    const t1I3b = Date.now();
    const [i3bAmostra] = await amostrarSequencia(sessao, t1I3b, [10], () => jsAmostraPainel(SEL_CAMADAS_PAINEL));
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    await pressionarEscape(sessao);
    await dorme(400);
    const i3bPassa = emRepouso(i3bAmostra);

    // (c) celular, painel SAINDO — só a ALTURA muda (844→700): a
    // LARGURA (390) nunca cruza os 760px que definem o layout de
    // celular.
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    await sessao.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await dorme(300);
    await sessao.js(`document.querySelector('${SEL_CAMADAS_GATILHO}').click()`);
    await dorme(400);
    const t0I3c = Date.now();
    await sessao.js(`(() => {
      const b = document.querySelector('${SEL_CAMADAS_PAINEL} .hud-fechar');
      if (b) b.click();
      return Boolean(b);
    })()`);
    await esperarAte(t0I3c, 40);
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 700, deviceScaleFactor: 1, mobile: true,
    });
    const t1I3c = Date.now();
    const [i3cAmostra] = await amostrarSequencia(sessao, t1I3c, [10], () => jsAmostraPainel(SEL_CAMADAS_PAINEL));
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    await sessao.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    const i3cPassa = i3cAmostra.existe === false;

    const i3Passa = i3aPassa && i3bPassa && i3cPassa;

    // ---------------------------------------------------------------
    // I4 — a linha do tempo depois de UM REDIMENSIONAMENTO (mesa): não
    // pode saltar de onde estava — o FLIP de `HudDoAtlas.tsx` tem de
    // repartir do topo medido DEPOIS do resize, não de um "antes" que já
    // não existe.
    // ---------------------------------------------------------------
    const rectCabecalhoI4a = await retanguloDe(sessao, SEL_TEMPO_CABECALHO);
    await moverMouse(
      sessao,
      rectCabecalhoI4a.x + rectCabecalhoI4a.width / 2,
      rectCabecalhoI4a.y + rectCabecalhoI4a.height / 2
    );
    await dorme(700); // abre — garante fechada-depois-aberta, não confia no estado anterior
    await moverMouse(sessao, 10, 10);
    await dorme(1000); // fecha (o respiro de ~350ms, com folga)

    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: 1440, height: 760, deviceScaleFactor: 1, mobile: false,
    });
    await dorme(400);
    const y0I4 = await sessao.js(
      `document.querySelector('${SEL_TEMPO_LINHA}')?.getBoundingClientRect().y ?? null`
    );

    let i4Amostras = [];
    const rectCabecalhoI4b = await retanguloDe(sessao, SEL_TEMPO_CABECALHO);
    const quadrosTempo = await gravarClipe(
      sessao,
      { largura: 1440, altura: 760, pastaQuadros: pastaTempo },
      async () => {
        const t0I4 = Date.now();
        await moverMouse(
          sessao,
          rectCabecalhoI4b.x + rectCabecalhoI4b.width / 2,
          rectCabecalhoI4b.y + rectCabecalhoI4b.height / 2
        );
        i4Amostras = await amostrarSequencia(sessao, t0I4, [15, 60, 150, 450], jsYDaLinhaDoTempo);
      }
    );
    const clipeTempo = renderizarClipe(quadrosTempo, resolve(CAPTURAS, `motion-interrupcoes-tempo-${commit}.mp4`));

    const y15 = i4Amostras.find((a) => a.alvoMs === 15)?.y ?? null;
    const y450 = i4Amostras.find((a) => a.alvoMs === 450)?.y ?? null;
    const i4SemSalto = y0I4 !== null && y15 !== null && Math.abs(y15 - y0I4) <= 8;
    const i4Assentou = y0I4 !== null && y450 !== null && y450 < y0I4;
    const i4Passa = i4SemSalto && i4Assentou;

    await moverMouse(sessao, 10, 10);
    await dorme(1000);
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    await dorme(400);

    // ---------------------------------------------------------------
    // I5 — interromper a PRÓPRIA linha do tempo com um Esc: clicar trava
    // aberta (`alternarPresa`), o Esc solta as três travas de uma vez
    // (`presa`/`hover`/`foco`, `HudDoAtlas.tsx`) — não pode saltar na
    // volta nem ficar presa aberta.
    // ---------------------------------------------------------------
    await moverMouse(sessao, 10, 10);
    await dorme(500); // garante fechada antes de medir o repouso de referência
    const yRepousoFechadaI5 = await sessao.js(
      `document.querySelector('${SEL_TEMPO_LINHA}')?.getBoundingClientRect().y ?? null`
    );

    const t0I5 = Date.now();
    await clicarReal(sessao, SEL_TEMPO_CABECALHO); // trava aberta
    await esperarAte(t0I5, 80);
    const yPreI5 = await sessao.js(
      `document.querySelector('${SEL_TEMPO_LINHA}')?.getBoundingClientRect().y ?? null`
    );
    const t1I5 = Date.now();
    await pressionarEscape(sessao);
    const i5Amostras = await amostrarSequencia(sessao, t1I5, [15, 500], jsYDaLinhaDoTempo);
    const yPostI5 = i5Amostras.find((a) => a.alvoMs === 15)?.y ?? null;
    const y500I5 = i5Amostras.find((a) => a.alvoMs === 500)?.y ?? null;
    const i5SemSalto = yPreI5 !== null && yPostI5 !== null && Math.abs(yPostI5 - yPreI5) <= 12;
    const i5Assentou =
      y500I5 !== null && yRepousoFechadaI5 !== null && Math.abs(y500I5 - yRepousoFechadaI5) <= 8;
    const i5Passa = i5SemSalto && i5Assentou;

    // ---------------------------------------------------------------
    // RELATÓRIO
    // ---------------------------------------------------------------
    const relatorio = {
      meta: {
        commit, dirty, chrome: versaoChrome.product, app: APP, query: QUERY,
        viewport: { width: 1440, height: 900 }, dpr, geradoEm: new Date().toISOString(),
      },
      i1: {
        repousoAberta: i1RepousoAberta,
        fechar1: i1Fechar1,
        fechar2ReabreNoMeio: [i1Aos20, ...i1Reentrada],
        repousoReaberta: i1RepousoReaberta,
        passa: i1Passa,
        clipe: clipeSanfona,
        folha: folhaSanfona,
      },
      i2: {
        a: { amostras: i2aAmostras, passa: i2aPassa },
        b: { aos10: i2bAos10, amostra: i2bAmostra, passa: i2bPassa },
        c: { aos10: i2cAos10, amostra: i2cAmostra, passa: i2cPassa },
        passa: i2Passa,
      },
      i3: {
        a: { amostra: i3aAmostra, passa: i3aPassa },
        b: { amostra: i3bAmostra, passa: i3bPassa },
        c: { amostra: i3cAmostra, passa: i3cPassa },
        passa: i3Passa,
      },
      i4: {
        y0: y0I4, amostras: i4Amostras, passa: i4Passa, clipe: clipeTempo,
      },
      i5: {
        yRepousoFechada: yRepousoFechadaI5, yPre: yPreI5, amostras: i5Amostras, passa: i5Passa,
      },
    };
    const destinoJson = semSobrescrever(resolve(CAPTURAS, `motion-interrupcoes-${commit}.json`));
    writeFileSync(destinoJson, JSON.stringify(relatorio, null, 2));

    const linhas = [
      `=== sonda-motion interrupções — commit ${commit}${dirty ? ' (dirty)' : ' (limpo)'} ===`,
      `Chrome ${versaoChrome.product} | mesa 1440x900 DPR${dpr} | pt-BR | q=performance`,
      `I1 sanfona (fechar/reabrir no meio): repouso aberta=${i1RepousoAberta.overflow}, `
        + `fechar 20/80/150ms=${i1Fechar1.map((a) => a.overflow).join('/')}, `
        + `reentrada 20/100/400ms=${[i1Aos20, ...i1Reentrada].map((a) => `${a?.overflow}${a && sanfonaAnimando(a) ? '(animando)' : '(repouso)'}@${a?.dtMs}ms`).join(' / ')}, `
        + `repouso reaberta=${i1RepousoReaberta.overflow} — `
        + `${i1Passa ? 'PASSA' : 'FALHA'}`,
      `I2 reduzir movimento no meio: a) saindo existe@60ms=${i2aAos60.existe} inert=${i2aAos60.inert} foco=${i2aAos60.active?.gatilho ?? '-'} `
        + `(${i2aPassa ? 'PASSA' : 'FALHA'}) `
        + `b) entrando transform=${i2bAmostra.transform} waapi=${JSON.stringify(i2bAmostra.waapi)} (${i2bPassa ? 'PASSA' : 'FALHA'}) `
        + `c) linha do tempo transform=${i2cAmostra.transform} (${i2cPassa ? 'PASSA' : 'FALHA'}) — `
        + `${i2Passa ? 'PASSA' : 'FALHA'}`,
      `I3 resize no meio sem cruzar 760px: a) mesa saindo existe@10ms=${i3aAmostra.existe} (${i3aPassa ? 'PASSA' : 'FALHA'}) `
        + `b) mesa entrando transform=${i3bAmostra.transform} waapi=${JSON.stringify(i3bAmostra.waapi)} (${i3bPassa ? 'PASSA' : 'FALHA'}) `
        + `c) celular saindo existe@10ms=${i3cAmostra.existe} (${i3cPassa ? 'PASSA' : 'FALHA'}) — `
        + `${i3Passa ? 'PASSA' : 'FALHA'}`,
      `I4 linha do tempo após resize: Y0=${y0I4} y(+15)=${y15} (Δ=${y0I4 !== null && y15 !== null ? Math.abs(y15 - y0I4).toFixed(1) : '?'}px) y(+450)=${y450} — `
        + `${i4Passa ? 'PASSA' : 'FALHA'}`,
      `I5 interromper a linha com Esc: y_pre=${yPreI5} y_post(+15ms)=${yPostI5} (Δ=${yPreI5 !== null && yPostI5 !== null ? Math.abs(yPostI5 - yPreI5).toFixed(1) : '?'}px) y(+500ms)=${y500I5} repouso fechada=${yRepousoFechadaI5} — `
        + `${i5Passa ? 'PASSA' : 'FALHA'}`,
      `clipe sanfona: ${clipeSanfona} (${quadrosSanfona.length} quadros)`,
      `folha sanfona: ${folhaSanfona}`,
      `clipe linha do tempo: ${clipeTempo} (${quadrosTempo.length} quadros)`,
      `JSON: ${destinoJson}`,
    ];
    process.stdout.write(`${linhas.join('\n')}\n`);
  } catch (erro) {
    process.stdout.write(`BLOCKED: ${erro.stack || erro.message}\n`);
    process.exitCode = 1;
  } finally {
    if (sessao) await sessao.fechar();
    rmSync(pastaSanfona, { recursive: true, force: true });
    rmSync(pastaTempo, { recursive: true, force: true });
  }
}

/**
 * `--folha` — OITO cenários (F1–F8) da FOLHA GUIADA PELA MÃO no celular
 * (C4 do plano de motion, `useGavetas.ts`): a alça do cabeçalho
 * (`.hud-cabecalho-eyebrow`, fora de qualquer botão) expande a compacta
 * arrastando para cima e recolhe a expandida arrastando para baixo,
 * seguindo o dedo (`deslocamentoDaFolha`) até a decisão no soltar
 * (`destinoDoArrasto`); quatro guardas — um controle deslizante, um
 * segundo dedo, a rolagem já dentro da expandida, e a paisagem baixa da
 * MESA (`compactavel` por `janelaBaixa`, nunca cruzando os 760px de
 * `celular`) — não podem quebrar nem travar a folha. Cada cenário
 * amostra com `jsAmostraFolha` e decide PASSA/FALHA pelos próprios
 * números, como `rodarInterrupcoes` — nenhuma espera extra para o
 * veredito bater.
 */
async function rodarFolha() {
  mkdirSync(CAPTURAS, { recursive: true });
  const pastaClipe = resolve(tmpdir(), `sonda-motion-folha-${process.pid}`);
  let sessao = null;
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim().length > 0;
    const num = (n) => (typeof n === 'number' ? n.toFixed(1) : String(n));

    sessao = await abrirSonda({ janela: '1440x900', prefixo: 'sonda-motion-folha' });
    // O TELEFONE DESDE O PRIMEIRO CARREGAMENTO, e não trocado depois (o
    // padrão do modo default): o override de CDP vale para o alvo
    // inteiro e sobrevive a `Page.navigate`, então marcar antes da
    // primeira `ir()` já entrega a folha no layout que ela testa, sem
    // uma passagem pela mesa no meio.
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    await sessao.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    const versaoChrome = await sessao.send('Browser.getVersion');
    const dpr = await sessao.js('window.devicePixelRatio');

    // `?foco=saturno` ABRE A FICHA DIRETO (`useEspelhoDaUrl.ts`,
    // `chaveDoFoco`) — o mesmo atalho que `atlas-smoke.mjs` já usa, sem
    // repetir o fluxo de busca+Enter da C3 (`--sequencia`).
    const queryComFoco = `${QUERY}&foco=saturno`;

    const carregarFichaDeSaturno = async () => {
      let assentou = null;
      let ultimoErro = null;
      for (let tentativa = 1; tentativa <= 3 && !assentou; tentativa++) {
        try {
          assentou = await sessao.ir(queryComFoco);
        } catch (e) {
          ultimoErro = e;
          process.stdout.write(`tentativa ${tentativa}/3 de carregar o app falhou: ${e.message}\n`);
          await dorme(500);
        }
      }
      if (!assentou) throw new Error(`o app não carregou em 3 tentativas (${ultimoErro?.message})`);
      await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_FICHA_PAINEL}'))`, 10000);
      await pularTour(sessao);
      await esperarPor(
        { js: sessao.js },
        `document.querySelector('${SEL_FICHA_PAINEL}')?.getAttribute('data-ficha-estado') === 'compacta'`,
        5000
      );
      await dorme(300);
    };

    await carregarFichaDeSaturno();

    // ---------------------------------------------------------------
    // F1 + F2 — UM clipe só: expandir e recolher pela alça
    // ---------------------------------------------------------------
    const top0 = (await sessao.js(jsAmostraFolha())).top;

    let f1Move6 = null;
    let f1Move12 = null;
    let f1PosSolta = [];
    let f2Move6 = null;
    let f2Move12 = null;
    let f2PosSolta = [];

    const quadrosClipe = await gravarClipe(
      sessao,
      { largura: 390, altura: 844, pastaQuadros: pastaClipe },
      async () => {
        // F1 — expandir: 12 `touchMove` para cima totalizando 140 px
        const pontoF1 = await pontoDaAlca(sessao);
        await sessao.send('Input.dispatchTouchEvent', {
          type: 'touchStart', touchPoints: [{ x: pontoF1.x, y: pontoF1.y }],
        });
        for (let n = 1; n <= 12; n++) {
          const y = pontoF1.y - Math.round((140 * n) / 12);
          await sessao.send('Input.dispatchTouchEvent', {
            type: 'touchMove', touchPoints: [{ x: pontoF1.x, y }],
          });
          if (n === 6) f1Move6 = { passo: n, ...(await sessao.js(jsAmostraFolha())) };
          if (n === 12) f1Move12 = { passo: n, ...(await sessao.js(jsAmostraFolha())) };
        }
        const t0F1 = await tocarSoltar(sessao);
        f1PosSolta = await amostrarSequencia(sessao, t0F1, [16, 120, 300, 600], jsAmostraFolha);

        // F2 — recolher: a alça já está lá em cima (a ficha expandiu),
        // por isso o ponto é medido DE NOVO — um dedo novo, 12
        // `touchMove` para baixo totalizando 140 px
        const pontoF2 = await pontoDaAlca(sessao);
        await sessao.send('Input.dispatchTouchEvent', {
          type: 'touchStart', touchPoints: [{ x: pontoF2.x, y: pontoF2.y }],
        });
        for (let n = 1; n <= 12; n++) {
          const y = pontoF2.y + Math.round((140 * n) / 12);
          await sessao.send('Input.dispatchTouchEvent', {
            type: 'touchMove', touchPoints: [{ x: pontoF2.x, y }],
          });
          if (n === 6) f2Move6 = { passo: n, ...(await sessao.js(jsAmostraFolha())) };
          if (n === 12) f2Move12 = { passo: n, ...(await sessao.js(jsAmostraFolha())) };
        }
        const t0F2 = await tocarSoltar(sessao);
        f2PosSolta = await amostrarSequencia(sessao, t0F2, [16, 120, 300, 600], jsAmostraFolha);
      }
    );
    const clipe = renderizarClipe(quadrosClipe, resolve(CAPTURAS, `motion-folha-${commit}.mp4`));
    const duracaoClipe = quadrosClipe[quadrosClipe.length - 1].ts - quadrosClipe[0].ts;
    const folhaContato = renderizarContato(clipe, duracaoClipe, resolve(CAPTURAS, `motion-folha-${commit}.png`));

    // F1 PASSA: aos 12 movimentos a folha já segue o dedo (a zona morta
    // de 16px é comida uma vez só), o repouso final é
    // expandida/transform none/sem WAAPI correndo, e o topo subiu bem
    // acima do repouso da compacta.
    const esperadoTopoMove12 = top0 - (140 - 16);
    const f1Segue =
      f1Move12 && f1Move12.top !== null && Math.abs(f1Move12.top - esperadoTopoMove12) <= 8;
    const f1Final = f1PosSolta[f1PosSolta.length - 1] ?? null;
    const f1SemAnimando =
      f1Final && ((f1Final.waapi ?? []).length === 0 || f1Final.waapi.every((w) => w.playState === 'finished'));
    const f1EstadoFinalOk =
      f1Final && f1Final.estado === 'expandida' && f1Final.transform === 'none' && f1SemAnimando;
    const f1SubiuBem = f1Final && f1Final.top !== null && f1Final.top < top0 - 50;
    const f1Passa = Boolean(f1Segue && f1EstadoFinalOk && f1SubiuBem);

    // F2 PASSA: repouso final compacta/transform none, o topo volta a
    // ~top0, e nenhuma amostra depois de soltar RECUA (o topo só pode
    // crescer rumo a top0 — um recuo é o "flash" da folha inteira antes
    // de assentar). SEM checar WAAPI vazia aqui, ao contrário do F1: a
    // COMPACTA declara `height`/`max-height` própria (09-celular.css,
    // ".atlas-ficha[data-ficha-estado]"), então virar compacta acende
    // uma transição de CSS própria (a caixa encolhendo até 10rem) que
    // ainda corre por até 260ms DEPOIS do transform já estar assentado —
    // uma animação real, mas de ALTURA, não de POSIÇÃO; exigir "nenhuma"
    // aqui reprovaria a folha por um comportamento que o próprio CSS
    // pede (medido: currentTime ainda em ~250ms aos +600ms). A
    // EXPANDIDA (F1) não declara `height` própria — só ela pode exigir
    // WAAPI vazia com segurança.
    const f2Final = f2PosSolta[f2PosSolta.length - 1] ?? null;
    const f2EstadoFinalOk = f2Final && f2Final.estado === 'compacta' && f2Final.transform === 'none';
    const f2VoltouAoTopo = f2Final && f2Final.top !== null && Math.abs(f2Final.top - top0) <= 4;
    const toposF2 = f2PosSolta.map((a) => a.top).filter((t) => t !== null);
    const f2SemSalto = toposF2.every((t, i) => i === 0 || t >= toposF2[i - 1] - 4);
    const f2Passa = Boolean(f2EstadoFinalOk && f2VoltouAoTopo && f2SemSalto);

    // ---------------------------------------------------------------
    // F3 — arrasto curto (40 px para cima): volta para compacta
    // ---------------------------------------------------------------
    const pontoF3 = await pontoDaAlca(sessao);
    await sessao.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: pontoF3.x, y: pontoF3.y }],
    });
    for (let n = 1; n <= 12; n++) {
      const y = pontoF3.y - Math.round((40 * n) / 12);
      await sessao.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pontoF3.x, y }] });
    }
    const t0F3 = await tocarSoltar(sessao);
    const f3Amostras = await amostrarSequencia(sessao, t0F3, [16, 120, 300, 600], jsAmostraFolha);
    const f3Final = f3Amostras[f3Amostras.length - 1];
    const f3Passa = Boolean(f3Final && f3Final.estado === 'compacta' && f3Final.transform === 'none');

    // ---------------------------------------------------------------
    // F4 — fechar pela alça (140 px para baixo, a partir da compacta)
    // ---------------------------------------------------------------
    const pontoF4 = await pontoDaAlca(sessao);
    await sessao.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: pontoF4.x, y: pontoF4.y }],
    });
    for (let n = 1; n <= 12; n++) {
      const y = pontoF4.y + Math.round((140 * n) / 12);
      await sessao.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pontoF4.x, y }] });
    }
    const t0F4 = await tocarSoltar(sessao);
    const f4Amostras = await amostrarSequencia(sessao, t0F4, [16, 120, 300, 600], jsAmostraFolha);
    const f4Final = f4Amostras[f4Amostras.length - 1];
    const f4Passa = Boolean(f4Final && f4Final.existe === false);

    // ---------------------------------------------------------------
    // F5 — um segundo dedo no meio do arrasto: devolve ao começo
    // ---------------------------------------------------------------
    await carregarFichaDeSaturno(); // reabre a ficha (F4 acabou de fechá-la)
    const pontoF5 = await pontoDaAlca(sessao);
    await sessao.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: pontoF5.x, y: pontoF5.y }],
    });
    let yF5 = pontoF5.y;
    for (let n = 1; n <= 12; n++) {
      yF5 = pontoF5.y - Math.round((100 * n) / 12);
      await sessao.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pontoF5.x, y: yF5 }] });
    }
    const t0F5 = Date.now();
    // O SEGUNDO DEDO É UM `touchStart` COM OS DOIS PONTOS (o protocolo
    // pede a lista INTEIRA de toques ativos, não só o novo) — é isto que
    // `comecar()` em `useGavetas.ts` lê como `e.touches.length > 1` e
    // devolve a folha ao começo (`desfazer`), sem esperar o `touchEnd`.
    await sessao.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: pontoF5.x, y: yF5 }, { x: pontoF5.x + 40, y: yF5 }],
    });
    await tocarSoltar(sessao);
    const f5Amostras = await amostrarSequencia(sessao, t0F5, [16, 120, 300, 600], jsAmostraFolha);
    const f5Final = f5Amostras[f5Amostras.length - 1];
    const f5Passa = Boolean(f5Final && f5Final.estado === 'compacta' && f5Final.transform === 'none');

    // ---------------------------------------------------------------
    // F6 — um controle deslizante nunca começa o arrasto da folha
    // ---------------------------------------------------------------
    await sessao.js(`document.querySelector('${SEL_AJUSTES_GATILHO}').click()`);
    await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_AJUSTES_PAINEL}'))`, 5000);
    await dorme(400); // assenta a entrada (--t-folha) antes do toque
    const seletorSlider = `${SEL_AJUSTES_PAINEL} input[type="range"]`;
    const rSlider = await retanguloDe(sessao, seletorSlider);
    if (!rSlider) throw new Error(`F6: "${seletorSlider}" não encontrado`);
    const pontoSlider = {
      x: Math.round(rSlider.x + rSlider.width / 2),
      y: Math.round(rSlider.y + rSlider.height / 2),
    };
    const f6Durante = [];
    await sessao.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: pontoSlider.x, y: pontoSlider.y }],
    });
    for (let n = 1; n <= 12; n++) {
      const x = pontoSlider.x + Math.round((60 * n) / 12);
      const y = pontoSlider.y + Math.round((60 * n) / 12);
      await sessao.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      if (n === 6 || n === 12) {
        f6Durante.push({ passo: n, ...(await sessao.js(jsAmostraPainel(SEL_AJUSTES_PAINEL))) });
      }
    }
    const t0F6 = await tocarSoltar(sessao);
    const f6PosSolta = await amostrarSequencia(
      sessao, t0F6, [16, 120, 300, 600], () => jsAmostraPainel(SEL_AJUSTES_PAINEL)
    );
    const f6TudoNone = [...f6Durante, ...f6PosSolta].every((a) => a.transform === 'none');
    const f6AjustesAberto = f6PosSolta[f6PosSolta.length - 1]?.existe === true;
    const f6Passa = Boolean(f6TudoNone && f6AjustesAberto);

    // ---------------------------------------------------------------
    // F7 — expandida e rolada: a alça ainda fecha (a rolagem não entra
    // na conta quando o gesto começa NELA, `useGavetas.ts`)
    // ---------------------------------------------------------------
    await carregarFichaDeSaturno(); // ficha compacta de novo (Ajustes fechou a da F6)
    await sessao.js(`document.querySelector('${SEL_FICHA_DETALHES}')?.click()`);
    await esperarPor(
      { js: sessao.js },
      `document.querySelector('${SEL_FICHA_PAINEL}')?.getAttribute('data-ficha-estado') === 'expandida'`,
      5000
    );
    await dorme(400); // assenta a expansão antes de rolar
    await sessao.js(`(() => {
      const el = document.querySelector('${SEL_FICHA_PAINEL}');
      if (el) el.scrollTop = 200;
    })()`);
    const scrollTopAntesDoArrasto = await sessao.js(
      `document.querySelector('${SEL_FICHA_PAINEL}')?.scrollTop ?? null`
    );
    const pontoF7 = await pontoDaAlca(sessao);
    await sessao.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: pontoF7.x, y: pontoF7.y }],
    });
    for (let n = 1; n <= 12; n++) {
      const y = pontoF7.y + Math.round((140 * n) / 12);
      await sessao.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pontoF7.x, y }] });
    }
    const t0F7 = await tocarSoltar(sessao);
    const f7Amostras = await amostrarSequencia(sessao, t0F7, [16, 120, 300, 600], jsAmostraFolha);
    const f7Final = f7Amostras[f7Amostras.length - 1];
    const f7Passa = Boolean(f7Final && f7Final.estado === 'compacta' && f7Final.transform === 'none');

    // ---------------------------------------------------------------
    // F8 — paisagem baixa da MESA (844×390): `compactavel` por
    // `janelaBaixa`, não por `celular` (760px nunca é cruzado) — o
    // gesto da alça não existe aqui (o efeito de `useGavetas.ts` só liga
    // com `celular`); só confere que nada quebrou.
    // ---------------------------------------------------------------
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: 844, height: 390, deviceScaleFactor: 1, mobile: true,
    });
    await carregarFichaDeSaturno();
    const f8Antes = await sessao.js(
      `document.querySelector('${SEL_FICHA_PAINEL}')?.getAttribute('data-ficha-estado') ?? null`
    );
    await sessao.js(`document.querySelector('${SEL_FICHA_DETALHES}')?.click()`);
    await dorme(400);
    const f8Depois = await sessao.js(
      `document.querySelector('${SEL_FICHA_PAINEL}')?.getAttribute('data-ficha-estado') ?? null`
    );

    // ---------------------------------------------------------------
    // RELATÓRIO
    // ---------------------------------------------------------------
    const relatorio = {
      meta: {
        commit,
        dirty,
        // O SERVIDOR É DE OUTRA ÁRVORE (isolada, item obrigatório do
        // enunciado): `commit`/`dirty` acima são desta sonda, não do app
        // que ela mede — os dois podem divergir, e é por isso que o app
        // ganha o campo dele, à parte.
        appCommit: '793df4d (servidor isolado, árvore limpa)',
        chrome: versaoChrome.product,
        app: APP,
        query: queryComFoco,
        viewport: { width: 390, height: 844 },
        dpr,
        geradoEm: new Date().toISOString(),
      },
      f1: {
        top0, move6: f1Move6, move12: f1Move12, posSolta: f1PosSolta, passa: f1Passa,
      },
      f2: {
        move6: f2Move6, move12: f2Move12, posSolta: f2PosSolta, semSalto: f2SemSalto, passa: f2Passa,
      },
      f3: { amostras: f3Amostras, passa: f3Passa },
      f4: { amostras: f4Amostras, passa: f4Passa },
      f5: { amostras: f5Amostras, passa: f5Passa },
      f6: {
        durante: f6Durante,
        posSolta: f6PosSolta,
        tudoTransformNone: f6TudoNone,
        ajustesAberto: f6AjustesAberto,
        passa: f6Passa,
      },
      f7: { scrollTopAntesDoArrasto, amostras: f7Amostras, passa: f7Passa },
      f8: { antes: f8Antes, depois: f8Depois },
      clipe,
      folhaContato,
    };
    const destinoJson = semSobrescrever(resolve(CAPTURAS, `motion-folha-${commit}.json`));
    writeFileSync(destinoJson, JSON.stringify(relatorio, null, 2));

    const linhas = [
      `=== sonda-motion folha — commit ${commit}${dirty ? ' (dirty)' : ' (limpo)'} · app 793df4d (servidor isolado) ===`,
      `Chrome ${versaoChrome.product} | celular 390x844 DPR${dpr} | pt-BR | q=performance | foco=saturno`,
      `clipe F1+F2: ${clipe} (${quadrosClipe.length} quadros)`,
      `folha de contato: ${folhaContato}`,
      `F1 expandir: top0=${num(top0)} move12.top=${num(f1Move12?.top)} esperado≈${num(esperadoTopoMove12)} `
        + `(${f1Segue ? 'segue o dedo' : 'NÃO segue'}) final estado=${f1Final?.estado} transform=${f1Final?.transform} `
        + `top=${num(f1Final?.top)} — ${f1Passa ? 'PASSA' : 'FALHA'}`,
      `F2 recolher: final estado=${f2Final?.estado} transform=${f2Final?.transform} top=${num(f2Final?.top)} `
        + `(top0=${num(top0)}) topos pós-soltar=${toposF2.map((t) => t.toFixed(1)).join('/')} `
        + `(${f2SemSalto ? 'sem recuo' : 'COM RECUO'}) — ${f2Passa ? 'PASSA' : 'FALHA'}`,
      `F3 arrasto curto (40px): final estado=${f3Final?.estado} transform=${f3Final?.transform} — `
        + `${f3Passa ? 'PASSA' : 'FALHA'}`,
      `F4 fechar (140px): final existe=${f4Final?.existe} — ${f4Passa ? 'PASSA' : 'FALHA'}`,
      `F5 segundo dedo: final estado=${f5Final?.estado} transform=${f5Final?.transform} — `
        + `${f5Passa ? 'PASSA' : 'FALHA'}`,
      `F6 controle deslizante: transform sempre none=${f6TudoNone}, Ajustes aberto ao fim=${f6AjustesAberto} — `
        + `${f6Passa ? 'PASSA' : 'FALHA'}`,
      `F7 expandida+rolada (scrollTop=${scrollTopAntesDoArrasto}): final estado=${f7Final?.estado} `
        + `transform=${f7Final?.transform} — ${f7Passa ? 'PASSA' : 'FALHA'}`,
      `F8 paisagem baixa 844x390: data-ficha-estado antes=${f8Antes} depois=${f8Depois}`,
      `JSON: ${destinoJson}`,
    ];
    process.stdout.write(`${linhas.join('\n')}\n`);
  } catch (erro) {
    process.stdout.write(`BLOCKED: ${erro.stack || erro.message}\n`);
    process.exitCode = 1;
  } finally {
    if (sessao) await sessao.fechar();
    rmSync(pastaClipe, { recursive: true, force: true });
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
if (FOLHA) {
  await rodarFolha();
} else if (INTERRUPCOES) {
  await rodarInterrupcoes();
} else if (!SEQUENCIA) {
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
    // PRESA SÓ SE O RELÓGIO DA PÁGINA ANDOU (reauditoria de 11/09): numa
    // rodada a folha ficou no ponto da soltura de 13 a 501 ms, e a mesma
    // base, repetida com e sem gravação, em Chrome visível e headless,
    // sempre saiu e desmontou antes dos 500 ms. A saída fica PENDENTE até
    // o próximo quadro (medido: nenhum quadro nos primeiros ~45 ms depois
    // de soltar, em toda configuração); se o Chrome da sonda para de
    // desenhar, a linha do tempo do documento para junto e nada anda com
    // ela. Sem esta conta a sonda chamava de defeito um navegador parado.
    const e1Primeira = e1[0];
    const e1Ultima = e1[e1.length - 1];
    const e1RelogioMs =
      typeof e1Primeira?.linhaDoTempo === 'number' && typeof e1Ultima?.linhaDoTempo === 'number'
        ? e1Ultima.linhaDoTempo - e1Primeira.linhaDoTempo
        : null;
    const e1ParedeMs = e1Ultima && e1Primeira ? e1Ultima.dtMs - e1Primeira.dtMs : 0;
    const e1SemQuadros = !e1PrimeiroAusente && e1RelogioMs !== null && e1RelogioMs < e1ParedeMs / 2;
    const e1Waapi = e1UltimoPresente?.waapi?.[0];
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
        + `(WAAPI por último: ${e1Waapi ? `${e1Waapi.playState}${e1Waapi.pending ? ' pendente' : ''} em ${e1Waapi.currentTime}ms` : 'nenhuma'}; `
        + `linha do tempo da página andou ${e1RelogioMs === null ? '?' : Math.round(e1RelogioMs)}ms em ${e1ParedeMs}ms de relógio) — `
        + `${e1ReproduzCedo ? 'reproduz (some bem antes da transição acabar)'
          : e1PrimeiroAusente ? 'não reproduz'
          : e1SemQuadros ? 'INCONCLUSIVO (o Chrome da sonda quase não desenhou quadro: a saída ficou pendente, não presa — repita a rodada)'
          : 'PRESA (a página desenhou e a saída não desmontou)'}`,
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
