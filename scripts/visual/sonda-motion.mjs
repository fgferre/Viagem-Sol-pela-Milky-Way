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
//   node scripts/visual/sonda-motion.mjs --c5 --app=http://localhost:58697
//   node scripts/visual/sonda-motion.mjs --c5=v6,v7 --app=http://localhost:58697
//   node scripts/visual/sonda-motion.mjs --contorno --app=http://localhost:5180
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
import sharp from 'sharp';
import {
  lancarChrome, GPU_FLAGS, dorme, ligarSocketCDP, portaDoPerfil,
  comLinguaDoJuizNaUrl, esperarPor, esperarAssentar, esperarCapaSair,
} from './chrome.mjs';
import { semSobrescrever } from './luz-ab.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CAPTURAS = resolve(ROOT, 'capturas');
const FFMPEG = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg';

const argApp = process.argv.find((a) => a.startsWith('--app='));
const APP = argApp ? argApp.slice('--app='.length) : 'http://localhost:58697';
const QUERY = 'atlas=1&q=performance&lang=pt-BR';
// `--c5` usa o FILME (sem `?atlas=1`) nas cenas V1–V6 — a mesma língua e
// o mesmo preset "performance" do resto da sonda, só sem o Atlas.
const QUERY_FILME = 'lang=pt-BR&q=performance';
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
// `--c5` troca a corrida de sempre por OITO cenas (V1–V8) do que o C5
// já entregou (marcos do carregamento, aceno do CTA primário, o chrome
// do filme sumindo sozinho, o grupo "Mais", os ícones do transporte, a
// barra de progresso, a tela final, o acento de seleção no céu e a dica
// de ajuda): um clipe em velocidade normal + folha de contato por cena,
// como `--folha`/`--interrupcoes`, mais uma leva de checagens de DOM.
// Não é um gate de PASSA/FALHA — roda uma vez e relata os números.
// Opt-in: sem a flag, nada aqui muda.
// `--c5=v6,v7` (vírgula, sem espaço) roda só as cenas listadas — útil
// para reverificar UM conserto pontual sem pagar as oito de novo; sem
// valor, `--c5` sozinho continua rodando as OITO de sempre.
const argC5 = process.argv.find((a) => a === '--c5' || a.startsWith('--c5='));
const C5 = Boolean(argC5);
const C5_QUAIS = argC5 && argC5.includes('=')
  ? new Set(argC5.slice('--c5='.length).split(',').map((v) => v.trim()).filter(Boolean))
  : null; // null = todas as oito
// `--contorno` troca a corrida de sempre pelo A/B do C6 do plano de
// motion (docs/PLANO-MOTION-UI.md §7 e §12.5): o reflexo CSS de sempre
// (A) contra A + o protótipo de halo WebGL (B, `?contorno=webgl`,
// `three/core/contornoDaUi.ts`) na mesma abertura da aba Camadas —
// clipes recortados na borda, prova por luminância e custo pareado de
// GPU/quadro. Roda uma vez e relata os números, como `--c5`; não é
// PASSA/FALHA. Opt-in: sem a flag, nada aqui muda.
const CONTORNO = process.argv.includes('--contorno');

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
  // A NOSSA ABA — pelo id do próprio socket (`…/devtools/page/<targetId>`),
  // do mesmo jeito que `abrirSessao` (chrome.mjs) já faz; o vigia abaixo
  // usa este id para nunca fechar a própria aba por engano.
  const idDaAba = alvo.split('/').pop();

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

  // GRAVANDO — aceso por `gravarClipe` durante a janela de
  // `Page.startScreencast`; o vigia abaixo lê para NUNCA chamar
  // `Target.closeTarget`/`activateTarget` no meio de uma gravação (achado
  // ao rodar `--c5`: a reativação forçada no meio de um clipe corrompeu
  // os quadros e quebrou o `ffmpeg` — "Error sending frames to
  // consumers"). Adiar para a próxima varredura, 500ms depois, é mais
  // barato que arriscar o clipe.
  let gravando = false;
  // O VIEWPORT QUE A CENA QUER — `null` até algum chamador registrar um
  // com `marcarViewport` (opt-in: os modos de sempre nunca chamam, e o
  // vigia abaixo fica exatamente como antes para eles). `--c5` registra
  // 1440×900 uma vez, no início de `rodarC5`.
  let ultimoOverride = null;

  /**
   * O VIGIA DA ABA DA FRENTE (mesmo achado de `abrirSessao`,
   * chrome.mjs — comentário lá tem o histórico completo): sessões longas
   * correm o risco do Chrome headless abrir sozinho uma aba
   * `chrome://settings/help` e roubar o primeiro plano. Copiado aqui
   * porque `abrirSonda` é uma sessão própria, sem herdar de
   * `abrirSessao`; só chama `Target.activateTarget` quando FECHA uma
   * intrusa de verdade — a reafirmação incondicional de `abrirSessao`
   * (inócua lá) corrompeu um clipe aqui no meio de uma gravação.
   *
   * ACHADO NOVO, rodando `--c5` (o primeiro modo longo o bastante para
   * bater nisto): a intrusa nasce como uma SEGUNDA ABA da MESMA janela,
   * e isso é o bastante para o Chrome passar a reservar a faixa da
   * barra de abas — a área útil encolhe (medido: 900 -> 813px de
   * altura, os mesmos 87px "descontados pela barra" do achado de
   * 17/08 em `capturarCDP`) e NÃO VOLTA sozinha ao fechar a intrusa. Um
   * clipe gravado depois disso saía com 1440×813 — altura ÍMPAR, que o
   * `libx264` do `renderizarClipe` recusa ("Could not open encoder").
   * Por isso o vigia reaplica `ultimoOverride` (se alguém registrou um)
   * depois de fechar a intrusa — `setDeviceMetricsOverride` FORÇA a área
   * útil de volta ao tamanho pedido, ao contrário de só reativar a aba.
   */
  const vigiaDaFrente = setInterval(async () => {
    if (gravando) return;
    try {
      const { targetInfos } = await send('Target.getTargets');
      const intrusa = targetInfos.find(
        (t) => t.type === 'page' && t.targetId !== idDaAba && t.url.startsWith('chrome://')
      );
      if (intrusa) {
        process.stdout.write(
          `  ·     vigia: aba intrusa ${intrusa.url} fechada — a frente volta ao app\n`
        );
        await send('Target.closeTarget', { targetId: intrusa.targetId });
        await send('Target.activateTarget', { targetId: idDaAba });
        if (ultimoOverride) await send('Emulation.setDeviceMetricsOverride', ultimoOverride);
      }
    } catch { /* sessão fechando, ou socket já morto */ }
  }, 500);
  vigiaDaFrente.unref?.();

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
    marcarGravando: (v) => { gravando = v; },
    marcarViewport: (o) => { ultimoOverride = o; },
    fechar: () => { clearInterval(vigiaDaFrente); fecharSocket(); return encerrar(); },
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

/** o par mousePressed+mouseReleased em coordenadas EXPLÍCITAS — o miolo
 *  de `clicarReal`, que a V7 (`--c5`) também precisa: o ponto de clique
 *  vem de um rótulo achado no céu, não de um seletor de DOM. */
async function clicarEmPonto(sessao, x, y) {
  const base = {
    x, y, button: 'left', clickCount: 1, buttons: 1, pointerType: 'mouse',
  };
  await sessao.send('Input.dispatchMouseEvent', { ...base, type: 'mousePressed' });
  await sessao.send('Input.dispatchMouseEvent', { ...base, type: 'mouseReleased', buttons: 0 });
  return { x, y };
}

/** clique real de mouse (mousePressed+mouseReleased) no centro do alvo —
 *  o par que `Input.dispatchMouseEvent` gera é o que faz o Chrome
 *  decidir `:focus-visible` como um clique de verdade decidiria. */
async function clicarReal(sessao, seletor) {
  const r = await retanguloDe(sessao, seletor);
  if (!r) throw new Error(`clicarReal: "${seletor}" não encontrado`);
  return clicarEmPonto(sessao, r.x + r.width / 2, r.y + r.height / 2);
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
 *  `pressionarEscape`, acima; só o código nativo muda por tecla.
 *  `shift` (C5, `--c5`) manda o modificador do CDP (8 = Shift) para o
 *  Shift+Tab que devolve o foco ao gatilho do "Mais" — omitido, o
 *  comportamento de sempre não muda em nada. */
async function pressionarTecla(sessao, nome, { shift = false } = {}) {
  const TECLAS = { Tab: 9, Enter: 13, Backspace: 8 };
  const codigo = TECLAS[nome];
  if (!codigo) throw new Error(`pressionarTecla: tecla desconhecida "${nome}"`);
  const base = {
    key: nome, code: nome, windowsVirtualKeyCode: codigo, nativeVirtualKeyCode: codigo,
    modifiers: shift ? 8 : 0,
  };
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
  sessao.marcarGravando?.(true); // o vigia da aba intrusa (C5) espera a gravação acabar
  try {
    await executar();
  } finally {
    sessao.marcarGravando?.(false);
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

/** repete `fn` até `tentativas` vezes — rede de segurança da corrida
 *  `--c5`: o vigia da aba intrusa (`abrirSonda`) evita interferir no
 *  MEIO de uma gravação, mas se a intrusa aparecer bem no INÍCIO de uma
 *  cena (antes do vigia ter uma folga de 500ms para fechá-la), aquele
 *  clipe pode nascer com poucos ou nenhum quadro. Repetir a cena do
 *  zero é mais simples e mais honesto que adivinhar o instante exato. */
async function comRetentativa(fn, { tentativas = 2, pausaMs = 1000 } = {}) {
  let ultimoErro = null;
  for (let i = 1; i <= tentativas; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimoErro = e;
      process.stdout.write(`  ·     tentativa ${i}/${tentativas} da cena falhou: ${e.message}\n`);
      if (i < tentativas) await dorme(pausaMs);
    }
  }
  throw ultimoErro;
}

/** pressiona Tab repetidamente até `document.activeElement` casar com
 *  `seletor` (ou até `maxPresses`) — TECLA REAL, nunca `.focus()` por
 *  script: só o Tab de verdade decide `:focus-visible` como um Tab de
 *  verdade decidiria (mesma razão de `clicarReal`). Devolve quantos
 *  Tabs foram precisos, ou -1 se não achou dentro do teto. */
async function tabularAte(sessao, seletor, maxPresses = 30) {
  for (let i = 1; i <= maxPresses; i++) {
    await pressionarTecla(sessao, 'Tab');
    const acertou = await sessao.js(
      `Boolean(document.activeElement && document.activeElement.matches(${JSON.stringify(seletor)}))`
    );
    if (acertou) return i;
  }
  return -1;
}

// ============================================================
// `--c5` — OITO CENAS (V1–V8) do que o C5 já entregou: os marcos do
// carregamento piscando uma vez (`marcoReflexo`), o aceno do CTA
// primário na abertura e na tela final (`reflexoDeAbertura`,
// `--cta-atraso`), o chrome do filme sumindo sozinho por inatividade
// (`useChromeDoFilme`), o grupo "Mais" (`usePresenca`), os ícones do
// transporte (`assentaIcone`/`.realce-texto`), a barra de progresso
// (U10: engrossa em hover/foco/arrasto, o ponto persegue o
// preenchimento), a tela final e o botão "Ficar neste céu", o acento
// âmbar de 200ms quando a seleção troca no céu (`acentoDaSelecao`,
// `LabelCanvas.ts`) e a dica de ajuda ("?", `entraDica`). Cada cena
// grava um clipe em velocidade normal + folha de contato (o mesmo
// `gravarClipe` → `renderizarClipe` → `renderizarContato` das outras
// leituras) e amostra o DOM pelo PRÓPRIO estado, nunca pelo relógio da
// sonda — mas ao contrário de `--interrupcoes`/`--folha` isto não julga
// PASSA/FALHA: roda uma vez e relata os números medidos.
// ============================================================

function jsMarcoAgora() {
  return `(() => {
    const el = document.querySelector('.cv-marco.agora');
    if (!el) return { existe: false };
    const cs = getComputedStyle(el);
    return { existe: true, animationName: cs.animationName, className: el.className };
  })()`;
}

function jsCtaPrimario() {
  return `(() => {
    const btn = document.querySelector('.veil-btn--primario');
    if (!btn) return { existe: false };
    const cs = getComputedStyle(btn, '::after');
    return {
      existe: true,
      animationName: cs.animationName,
      animationDelay: cs.animationDelay,
      animationDuration: cs.animationDuration,
    };
  })()`;
}

/**
 * V1 — A ABERTURA: da navegação (sem `?atlas=1`) pelas etapas do
 * carregamento até o véu do título, com o aceno do CTA primário já
 * passado. A gravação começa ANTES do `Page.navigate` — só assim os
 * marcos do carregamento (`.cv-marco.agora`, cada um pisca uma vez só)
 * entram no clipe — e por isso um segundo laço, concorrente com a
 * navegação, amostra o marco "agora" a cada 40ms pelo mesmo socket CDP;
 * erros de `Runtime.evaluate` no meio da troca de documento são
 * esperados (o contexto antigo morre) e só descartam aquela amostra.
 */
async function cenaAberturaC5(sessao, commit, pasta) {
  const marcos = [];
  let coletando = true;
  const coletor = (async () => {
    while (coletando) {
      try {
        const m = await sessao.js(jsMarcoAgora());
        if (m?.existe) marcos.push(m);
      } catch { /* documento trocando — amostra descartada */ }
      await dorme(40);
    }
  })();

  let cta = null;
  const quadros = await gravarClipe(
    sessao,
    { largura: 1440, altura: 900, pastaQuadros: pasta },
    async () => {
      await sessao.ir(QUERY_FILME);
      await esperarCapaSair(sessao.send);
      // --cta-atraso (0,8s) + --t-reflexo (0,36s) do aceno, com folga
      await dorme(1400);
      cta = await sessao.js(jsCtaPrimario());
    }
  );
  coletando = false;
  await coletor;

  const clipe = renderizarClipe(quadros, resolve(CAPTURAS, `motion-c5-v1-abertura-${commit}.mp4`));
  const duracao = quadros[quadros.length - 1].ts - quadros[0].ts;
  const folha = renderizarContato(clipe, duracao, resolve(CAPTURAS, `motion-c5-v1-abertura-${commit}.png`));
  const marcosComReflexo = marcos.filter((m) => m.animationName.includes('marcoReflexo')).length;

  return {
    clipe, folha, quadros: quadros.length, marcosAmostrados: marcos.length, marcosComReflexo, cta,
  };
}

/** Navega para o filme (sem `?atlas=1`) e clica "Ver o filme" — o botão
 *  SECUNDÁRIO do véu (`aria-describedby="porta-filme"`; o PRIMÁRIO leva
 *  ao Atlas, não ao filme). Usada por V2–V6, que precisam da viagem
 *  tocando. */
async function iniciarFilmeC5(sessao) {
  let assentou = null;
  let ultimoErro = null;
  for (let tentativa = 1; tentativa <= 3 && !assentou; tentativa++) {
    try {
      assentou = await sessao.ir(QUERY_FILME);
    } catch (e) {
      ultimoErro = e;
      process.stdout.write(`tentativa ${tentativa}/3 de carregar o filme falhou: ${e.message}\n`);
      await dorme(500);
    }
  }
  if (!assentou) throw new Error(`o filme não carregou em 3 tentativas (${ultimoErro?.message})`);
  await esperarCapaSair(sessao.send);
  await clicarReal(sessao, '[aria-describedby="porta-filme"]');
  await esperarPor(
    { js: sessao.js },
    "document.querySelector('.hud-root')?.getAttribute('data-fase') === 'journey'",
    10000
  );
  await dorme(300);
}

/**
 * ACORDA O CHROME DO FILME (`useChromeDoFilme`) antes de uma cena que
 * precisa dele visível/clicável. Achado ao rodar `--c5`: `renderizarClipe`
 * e `renderizarContato` usam `spawnSync` (ffmpeg BLOQUEANTE) entre uma
 * cena e a próxima — o Node fica preso codificando por segundos de
 * parede enquanto o filme continua tocando e o ponteiro não se mexe, e
 * os 3s de inatividade (`ESPERA_DO_CHROME_MS`) vencem no meio disso. Sem
 * acordar antes, um clique em V3/V4/V5 podia cair num botão
 * `pointer-events: none` e atravessar até o céu por baixo — o clique
 * vira NO-OP, sem erro nenhum para acusar. Fica FORA de `gravarClipe`
 * de propósito: um gesto de despertar dentro do clipe poluiria a
 * gravação com um movimento que ninguém pediu para ver.
 */
async function acordarChromeDoFilme(sessao) {
  await moverMouse(sessao, 720, 450);
  await esperarPor(
    { js: sessao.js },
    "document.querySelector('.controls-bar')?.className.includes('hud-sumido') === false",
    2000
  );
  await dorme(150);
}

function jsBarraDoFilme() {
  return `(() => {
    const el = document.querySelector('.controls-bar');
    if (!el) return { existe: false };
    const cs = getComputedStyle(el);
    return {
      existe: true,
      sumida: el.className.includes('hud-sumido'),
      transitionDuration: cs.transitionDuration,
      opacity: cs.opacity,
    };
  })()`;
}

/**
 * V2 — O CHROME DO FILME SOME SOZINHO (`useChromeDoFilme`,
 * `ESPERA_DO_CHROME_MS = 3000`): com a viagem tocando e o ponteiro
 * parado, a barra de controles some por opacidade; o primeiro gesto a
 * traz de volta. A câmera grava em tempo real — a espera de uns 3s é o
 * PRÓPRIO comportamento sendo medido, não um `dorme` de conveniência
 * (por isso o teto de `esperarPor` é bem maior que os 3s nominais).
 */
async function cenaChromeC5(sessao, commit, pasta) {
  await sessao.js('window.__director.seek(20)');
  await acordarChromeDoFilme(sessao);
  const visivel = await sessao.js(jsBarraDoFilme());

  let escondida = null;
  let revelada = null;
  let escondidaDeNovo = null;
  const quadros = await gravarClipe(
    sessao,
    { largura: 1440, altura: 900, pastaQuadros: pasta },
    async () => {
      const escondeuAos = await esperarPor(
        { js: sessao.js }, "document.querySelector('.controls-bar')?.className.includes('hud-sumido') === true", 6000
      );
      escondida = { ...(await sessao.js(jsBarraDoFilme())), escondeuAos };

      await moverMouse(sessao, 720, 450); // revela — o primeiro gesto do ponteiro
      const revelouAos = await esperarPor(
        { js: sessao.js }, "document.querySelector('.controls-bar')?.className.includes('hud-sumido') === false", 2000
      );
      revelada = { ...(await sessao.js(jsBarraDoFilme())), revelouAos };

      // sem NOVO gesto — é o silêncio que deve escondê-la de novo
      const escondeuDeNovoAos = await esperarPor(
        { js: sessao.js }, "document.querySelector('.controls-bar')?.className.includes('hud-sumido') === true", 6000
      );
      escondidaDeNovo = { ...(await sessao.js(jsBarraDoFilme())), escondeuDeNovoAos };
    }
  );

  const clipe = renderizarClipe(quadros, resolve(CAPTURAS, `motion-c5-v2-chrome-${commit}.mp4`));
  const duracao = quadros[quadros.length - 1].ts - quadros[0].ts;
  const folha = renderizarContato(clipe, duracao, resolve(CAPTURAS, `motion-c5-v2-chrome-${commit}.png`));

  return {
    clipe, folha, quadros: quadros.length, visivel, escondida, revelada, escondidaDeNovo,
  };
}

function jsMais() {
  return `(() => {
    const gatilho = document.querySelector('[aria-controls="barra-mais-ferramentas"]');
    const painel = document.getElementById('barra-mais-ferramentas');
    const ae = document.activeElement;
    return {
      gatilhoExpandido: gatilho ? gatilho.getAttribute('aria-expanded') : null,
      painelExiste: Boolean(painel),
      painelClasse: painel ? painel.className : null,
      painelInert: painel ? painel.inert : null,
      foco: ae ? {
        tag: ae.tagName,
        ehOGatilho: ae === gatilho,
        dentroDoPainel: Boolean(painel && ae !== painel && painel.contains(ae)),
      } : null,
    };
  })()`;
}

/**
 * V3 — O GRUPO "MAIS" (`usePresenca`, `.filme-mais`): abre e fecha pelo
 * mouse, depois abre de novo, entra nele com Tab e fecha pelo TECLADO
 * de volta no próprio gatilho (Shift+Tab, Enter) — o mesmo contrato de
 * presença da Sanfona de Ajustes (`inert` na saída, foco devolvido ao
 * gatilho de quem abriu).
 */
async function cenaMaisC5(sessao, commit, pasta) {
  await acordarChromeDoFilme(sessao);
  const seletorGatilho = '[aria-controls="barra-mais-ferramentas"]';
  let aposAbrirMouse = [];
  let aposFecharMouse = [];
  let focoAposTab = null;
  let focoAposFechar = null;

  const quadros = await gravarClipe(
    sessao,
    { largura: 1440, altura: 900, pastaQuadros: pasta },
    async () => {
      const t0Abrir = Date.now();
      await clicarReal(sessao, seletorGatilho);
      aposAbrirMouse = await amostrarSequencia(sessao, t0Abrir, [16, 120, 300], jsMais);
      await dorme(400);

      const t0Fechar = Date.now();
      await clicarReal(sessao, seletorGatilho);
      aposFecharMouse = await amostrarSequencia(sessao, t0Fechar, [16, 120, 300], jsMais);
      await dorme(400);

      await clicarReal(sessao, seletorGatilho); // abre de novo
      await dorme(400);
      await pressionarTecla(sessao, 'Tab'); // entra no painel
      focoAposTab = await sessao.js(jsMais());
      await pressionarTecla(sessao, 'Tab', { shift: true }); // volta ao gatilho
      await pressionarTecla(sessao, 'Enter'); // fecha pelo teclado
      await dorme(350);
      focoAposFechar = await sessao.js(jsMais());
    }
  );

  const clipe = renderizarClipe(quadros, resolve(CAPTURAS, `motion-c5-v3-mais-${commit}.mp4`));
  const duracao = quadros[quadros.length - 1].ts - quadros[0].ts;
  const folha = renderizarContato(clipe, duracao, resolve(CAPTURAS, `motion-c5-v3-mais-${commit}.png`));

  return {
    clipe, folha, quadros: quadros.length, aposAbrirMouse, aposFecharMouse, focoAposTab, focoAposFechar,
  };
}

function jsTransporte() {
  return `(() => {
    const botoes = document.querySelectorAll('.filme-transporte button');
    const pausaBtn = botoes[0] || null;
    const taxaBtn = botoes[1] || null;
    const iconeAssenta = document.querySelector('.filme-transporte-icone-assenta');
    const rateSpan = taxaBtn ? taxaBtn.querySelector('span') : null;
    return {
      pausaAriaLabel: pausaBtn ? pausaBtn.getAttribute('aria-label') : null,
      iconeAssentaExiste: Boolean(iconeAssenta),
      iconeAnimationName: iconeAssenta ? getComputedStyle(iconeAssenta).animationName : null,
      rateTexto: rateSpan ? rateSpan.textContent : null,
      rateRealceTexto: rateSpan ? rateSpan.className.includes('realce-texto') : false,
    };
  })()`;
}

/**
 * V4 — TRANSPORTE: pausar, retomar, mudar a velocidade. O ícone de
 * pausa/retomar reassenta (`assentaIcone`, remontado por `key`) a cada
 * troca, e o número da taxa ganha `.realce-texto` do mesmo jeito que o
 * nome do alvo ganha na busca (C3). Termina devolvendo a taxa a 1× para
 * não vazar velocidade alta para as cenas seguintes.
 */
async function cenaTransporteC5(sessao, commit, pasta) {
  await acordarChromeDoFilme(sessao);
  const seletorPausa = '.filme-transporte button:nth-child(1)';
  const seletorTaxa = '.filme-transporte button:nth-child(2)';
  let aposPausar = [];
  let aposRetomar = [];
  let aposTaxa = [];

  const quadros = await gravarClipe(
    sessao,
    { largura: 1440, altura: 900, pastaQuadros: pasta },
    async () => {
      const t0p = Date.now();
      await clicarReal(sessao, seletorPausa);
      aposPausar = await amostrarSequencia(sessao, t0p, [16, 80, 200], jsTransporte);
      await dorme(300);

      const t0r = Date.now();
      await clicarReal(sessao, seletorPausa);
      aposRetomar = await amostrarSequencia(sessao, t0r, [16, 80, 200], jsTransporte);
      await dorme(300);

      const t0t = Date.now();
      await clicarReal(sessao, seletorTaxa);
      aposTaxa = await amostrarSequencia(sessao, t0t, [16, 80, 200], jsTransporte);

      // devolve 2×→4×→1×, para a cena seguinte herdar velocidade normal
      await dorme(300);
      await clicarReal(sessao, seletorTaxa);
      await dorme(300);
      await clicarReal(sessao, seletorTaxa);
      await dorme(300);
    }
  );

  const clipe = renderizarClipe(quadros, resolve(CAPTURAS, `motion-c5-v4-transporte-${commit}.mp4`));
  const duracao = quadros[quadros.length - 1].ts - quadros[0].ts;
  const folha = renderizarContato(clipe, duracao, resolve(CAPTURAS, `motion-c5-v4-transporte-${commit}.png`));

  return {
    clipe, folha, quadros: quadros.length, aposPausar, aposRetomar, aposTaxa,
  };
}

function jsProgresso() {
  return `(() => {
    const wrap = document.querySelector('.progress-wrap');
    if (!wrap) return { existe: false };
    const track = wrap.querySelector('.progress-track');
    const ponto = wrap.querySelector('.progress-ponto');
    const fill = wrap.querySelector('.progress-fill');
    const csWrap = getComputedStyle(wrap);
    const csTrack = getComputedStyle(track);
    const csPontoBefore = getComputedStyle(ponto, '::before');
    const rWrap = wrap.getBoundingClientRect();
    const rFill = fill.getBoundingClientRect();
    const fracao = Number.parseFloat(csWrap.getPropertyValue('--journey-progress')) || 0;
    const pontoX = rWrap.left + fracao * rWrap.width;
    return {
      existe: true,
      arrastando: wrap.getAttribute('data-arrastando') !== null,
      focoAtual: document.activeElement === wrap,
      trackTransform: csTrack.transform,
      pontoOpacity: csPontoBefore.opacity,
      distanciaPontoFillPx: Math.abs(rFill.right - pontoX),
    };
  })()`;
}

/**
 * V5 — A BARRA DE PROGRESSO (U10, `.progress-wrap`): a camada visual
 * engrossa (`scaleY(2.5)`) em hover real, foco por Tab e arrasto; o
 * ponto do arrasto só aparece (opacidade 1) em foco por teclado ou
 * arrasto; e o ponto persegue a ponta do preenchimento — lida a MESMA
 * fração `--journey-progress` do computado dos dois (em vez de tentar
 * medir o pseudo-elemento `::before` por `getBoundingClientRect`, que a
 * API do DOM não permite).
 */
async function cenaProgressoC5(sessao, commit, pasta) {
  await acordarChromeDoFilme(sessao);
  let hover = null;
  let tabsAteFoco = -1;
  let foco = null;
  let duranteArrasto = null;
  let aposSoltarCedo = null;
  let aposAssentar = null;

  const quadros = await gravarClipe(
    sessao,
    { largura: 1440, altura: 900, pastaQuadros: pasta },
    async () => {
      // 1) HOVER — mouse real sobre a barra
      const rBarra = await retanguloDe(sessao, '.progress-wrap');
      if (!rBarra) throw new Error('v5: ".progress-wrap" não encontrado');
      await moverMouse(sessao, rBarra.x + rBarra.width / 2, rBarra.y + rBarra.height / 2);
      await dorme(250); // var(--t-assenta) = 180ms, com folga
      hover = await sessao.js(jsProgresso());
      await moverMouse(sessao, 10, 10);
      await dorme(200);

      // 2) FOCO POR TECLADO — só o Tab real decide `:focus-visible`
      await sessao.js('document.activeElement && document.activeElement.blur()');
      tabsAteFoco = await tabularAte(sessao, '.progress-wrap', 30);
      await dorme(250);
      foco = await sessao.js(jsProgresso());

      // 3) ARRASTO — pressiona a ~20% da barra, arrasta até ~70%, solta
      const rBarra2 = await retanguloDe(sessao, '.progress-wrap');
      const y = rBarra2.y + rBarra2.height / 2;
      const x0 = rBarra2.x + rBarra2.width * 0.2;
      const x1 = rBarra2.x + rBarra2.width * 0.7;
      const base = { button: 'left', pointerType: 'mouse' };
      await sessao.send('Input.dispatchMouseEvent', {
        ...base, x: x0, y, type: 'mousePressed', buttons: 1, clickCount: 1,
      });
      for (let n = 1; n <= 8; n++) {
        const x = x0 + ((x1 - x0) * n) / 8;
        await sessao.send('Input.dispatchMouseEvent', { ...base, x, y, type: 'mouseMoved', buttons: 1 });
      }
      duranteArrasto = await sessao.js(jsProgresso());
      await sessao.send('Input.dispatchMouseEvent', { ...base, x: x1, y, type: 'mouseReleased', buttons: 0 });
      aposSoltarCedo = await sessao.js(jsProgresso());
      await dorme(300); // o deslize de 0,18s do preenchimento, com folga
      aposAssentar = await sessao.js(jsProgresso());
    }
  );

  const clipe = renderizarClipe(quadros, resolve(CAPTURAS, `motion-c5-v5-progresso-${commit}.mp4`));
  const duracao = quadros[quadros.length - 1].ts - quadros[0].ts;
  const folha = renderizarContato(clipe, duracao, resolve(CAPTURAS, `motion-c5-v5-progresso-${commit}.png`));

  return {
    clipe, folha, quadros: quadros.length, hover, tabsAteFoco, foco, duranteArrasto, aposSoltarCedo, aposAssentar,
  };
}

function jsBotaoFicarNesteCeu() {
  return `(() => {
    const veu = document.querySelector('.veil-end');
    const btn = veu ? veu.querySelector('.veil-btn--primario') : null;
    const veuEscondido = veu ? veu.className.includes('hidden-veil') : null;
    if (!btn) return { existe: false, veuEscondido };
    const cs = getComputedStyle(btn);
    const csAfter = getComputedStyle(btn, '::after');
    const r = btn.getBoundingClientRect();
    const noPonto = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return {
      existe: true,
      veuEscondido,
      disabled: btn.disabled,
      pointerEvents: cs.pointerEvents,
      clicavel: Boolean(noPonto && noPonto.closest('.veil-btn--primario') === btn),
      animationName: csAfter.animationName,
      animationDelay: csAfter.animationDelay,
      animationDuration: csAfter.animationDuration,
      // O RETÂNGULO JUNTO (conserto da V6): o rodapé tem a PRÓPRIA
      // entrada (a animação encerramento-entra, translateY(0.5rem)->0 no
      // MESMO atraso do aceno), então o botão ainda se desloca uns px
      // enquanto o aceno passa — um retângulo só do início recortaria
      // torto perto do fim. Cada amostra traz o seu, no mesmo instante.
      rect: { x: r.x, y: r.y, width: r.width, height: r.height },
    };
  })()`;
}

/**
 * V6 — A TELA FINAL: o `seek` (o mesmo instante de `filme-smoke.mjs`,
 * 192,8 — "os últimos 0,2s do corte") entra DENTRO da gravação, e não
 * antes dela. A 1ª leva assentava (`esperarAssentar`) FORA do clipe: a
 * fase tinha tempo de sobra para virar 'end', o véu de subir e até o
 * aceno inteiro de acontecer — sem câmera nenhuma ligada —, e a
 * amostragem, presa a só 4s depois do véu, terminava antes do rodapé
 * sequer nascer (o `--cta-atraso` dele é ATRASO_DO_RODAPE,
 * `encerramento.ts`, uns 8s). O clipe saía cortado no meio da citação,
 * sem "Ficar neste céu" nem o aceno dele aparecerem nunca. Agora a fase
 * 'end', o véu e o aceno INTEIRO do CTA (`::after`, `reflexoDeAbertura`)
 * ficam dentro da janela gravada. A JANELA não é um número decorado: sai
 * do PRÓPRIO computado do botão (`animationDelay`+`animationDuration`,
 * que É `--cta-atraso`) lido depois que o véu sobe — só ali a regra
 * `.veil:not(.hidden-veil) .veil-btn--primario::after` passa a valer e
 * o computado deixa de ser "none"/"0s".
 */
async function cenaFimC5(sessao, commit, pasta) {
  let chegouFimAos = null;
  let veuVisivelAos = null;
  let delayMs = 0;
  let duracaoMs = 0;
  let janelaMs = 0;
  let amostras = [];
  let tVeu = 0;

  const quadros = await gravarClipe(
    sessao,
    { largura: 1440, altura: 900, pastaQuadros: pasta },
    async () => {
      await sessao.js('window.__director.seek(192.8)');
      chegouFimAos = await esperarPor({ js: sessao.js }, "window.__director.captura.fase === 'end'", 15000);
      veuVisivelAos = await esperarPor(
        { js: sessao.js },
        "document.querySelector('.veil-end')?.className.includes('hidden-veil') === false",
        8000
      );
      tVeu = Date.now();
      const cta = await sessao.js(jsBotaoFicarNesteCeu());
      if (!cta.existe) throw new Error('v6: "Ficar neste céu" não existe depois do véu subir');
      delayMs = Math.round((Number.parseFloat(cta.animationDelay) || 0) * 1000);
      duracaoMs = Math.round((Number.parseFloat(cta.animationDuration) || 0) * 1000);
      if (delayMs <= 0) {
        throw new Error(`v6: animationDelay do CTA leu "${cta.animationDelay}" (esperava ~8s de ATRASO_DO_RODAPE)`);
      }
      // 900ms de folga: a viagem de ida e volta do CDP não pode cortar a
      // última amostra antes do aceno de fato terminar.
      janelaMs = delayMs + duracaoMs + 900;
      amostras = await amostrarSequencia(
        sessao, tVeu,
        [
          0,
          Math.round(delayMs / 2),
          delayMs,
          delayMs + Math.round(duracaoMs / 2),
          delayMs + duracaoMs,
          janelaMs,
        ],
        jsBotaoFicarNesteCeu
      );
    }
  );

  const clipe = renderizarClipe(quadros, resolve(CAPTURAS, `motion-c5-v6-fim-${commit}.mp4`));
  const duracao = quadros[quadros.length - 1].ts - quadros[0].ts;
  const folha = renderizarContato(clipe, duracao, resolve(CAPTURAS, `motion-c5-v6-fim-${commit}.png`));
  const sempreClicavel =
    amostras.length > 0 && amostras.every((a) => a.existe && !a.disabled && a.pointerEvents !== 'none' && a.clicavel);

  // A FAIXA DE RECORTES DO BOTÃO ao longo do aceno inteiro (pedido do
  // enunciado): `quadroMaisProximoDoAlvo` (a mesma régua do `--contorno`,
  // mais abaixo neste arquivo) acha o quadro cujo timestamp REAL do CDP
  // mais bate com cada instante amostrado — sem supor quadros igualmente
  // espaçados dentro da gravação.
  const recortes = amostras.filter((a) => a.rect).map((a, i) => {
    const quadro = quadroMaisProximoDoAlvo(quadros, tVeu, a.dtMs);
    const pad = 16;
    const x = Math.max(0, Math.round(a.rect.x) - pad);
    const y = Math.max(0, Math.round(a.rect.y) - pad);
    const largura = Math.round(a.rect.width) + pad * 2;
    const altura = Math.round(a.rect.height) + pad * 2;
    const destino = semSobrescrever(resolve(CAPTURAS, `motion-c5-v6-recorte${i + 1}-${commit}.png`));
    const r = spawnSync(FFMPEG, [
      '-y', '-i', quadro.arquivo,
      '-vf', `crop=${largura}:${altura}:${x}:${y}`,
      destino,
    ], { stdio: 'pipe' });
    if (r.status !== 0) {
      throw new Error(`ffmpeg (recorte v6) falhou (${r.status}): ${(r.stderr || '').toString().slice(-800)}`);
    }
    return destino;
  });

  return {
    clipe, folha, quadros: quadros.length, chegouFimAos, veuVisivelAos,
    delayMs, duracaoMs, janelaMs, amostras, sempreClicavel, recortes,
  };
}

/** o mesmo carregamento do Atlas que `rodarSequencia`/`rodarFolha` já
 *  usam — cópia local, porque a convenção deste arquivo é cada modo ter
 *  a sua, não uma abstração nova compartilhada entre todos. */
async function carregarAtlasC5(sessao) {
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
}

/**
 * UM CORPO com nome DESENHADO na tela (V7) — a mesma lista pública que
 * `a11y.mjs`/`a11y-celular.mjs` já leem (`rotulos.alvos`, "a última
 * projeção — a lista ÚNICA que o clique lê", `director/rotulos.ts`),
 * com `x`/`y` em FRAÇÃO 0..1 — a MESMA conta que `gestos.ts:onPointerUp`
 * faz de `clientX/innerWidth` antes de escolher, então multiplicar por
 * `innerWidth`/`innerHeight` aqui não é aproximação, é a régua que o
 * clique de verdade usa. Só candidatos com TEXTO (nunca um `icone`, que
 * não escreve nome nenhum) e confirmados por DOIS testes independentes:
 * `elementFromPoint` cai no canvas da cena (não numa gaveta por cima) e
 * `escada.chaveApontada` (o mesmo hit-test do hover, `director.ts`)
 * aponta para a MESMA chave. NUNCA o Sol (`corpo:sun`, peso 100 — o mais
 * alto da tabela depois do foco, então costuma vir primeiro): medido, o
 * clique nele reenquadra ~200px (não é um corpo qualquer, é a origem do
 * sistema) e a cor dele é ambarina por natureza, o que contaminaria
 * justamente a contagem de pixels âmbar que a V7 faz depois.
 */
async function acharCorpoDesenhado(sessao) {
  return sessao.js(`(() => {
    const alvos = window.__director?.rotulos?.alvos ?? [];
    for (const l of alvos) {
      if (!l.key || !l.key.startsWith('corpo:')) continue; // CHAVE_DE_CORPO, atlasConfig.ts
      if (l.key === 'corpo:sun') continue;
      if (l.desenhado !== true || (l.opacity ?? 0) < 0.15) continue;
      if (l.icone || l.textoInvisivel) continue;
      const x = Math.round(l.x * window.innerWidth);
      const y = Math.round(l.y * window.innerHeight);
      if (x <= 0 || y <= 0 || x >= window.innerWidth - 1 || y >= window.innerHeight - 1) continue;
      const noPonto = document.elementFromPoint(x, y);
      if (!noPonto || !noPonto.classList.contains('scene-canvas')) continue;
      const chave = window.__director.escada.chaveApontada(x / window.innerWidth, y / window.innerHeight);
      if (chave !== l.key) continue;
      return { key: l.key, name: l.name, x, y };
    }
    return null;
  })()`);
}

/** a cor do acento (`acentoDaSelecao`, `LabelCanvas.ts`) é #e2b872; a
 *  tolerância absorve o anti-serrilhado contra o fundo escuro sem
 *  confundir com o azul/violeta do céu ao redor. */
const COR_DO_ACENTO = [0xe2, 0xb8, 0x72];
const TOLERANCIA_DO_ACENTO = 55;

/** conta pixels a até `TOLERANCIA_DO_ACENTO` (distância euclidiana em
 *  RGB) de `COR_DO_ACENTO` num PNG — o recorte inteiro já É a "pequena
 *  região ao redor do marcador" (160×160px centrados nele), então não
 *  há um segundo raio para recortar por cima do recorte. */
async function contarPixelsAmbar(caminhoDoPng) {
  const { data, info } = await sharp(caminhoDoPng).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - COR_DO_ACENTO[0];
    const dg = data[i + 1] - COR_DO_ACENTO[1];
    const db = data[i + 2] - COR_DO_ACENTO[2];
    if (Math.sqrt(dr * dr + dg * dg + db * db) <= TOLERANCIA_DO_ACENTO) n++;
  }
  return { n, dePixels: info.width * info.height };
}

/** a posição projetada (px de viewport) do MESMO corpo, lida de novo —
 *  o acessório de depuração que a V7 usa para PERSEGUIR o marcador
 *  quadro a quadro, e não só achá-lo uma vez. */
function jsPosicaoDoRotulo(chave) {
  return `(() => {
    const l = (window.__director?.rotulos?.alvos ?? []).find((r) => r.key === ${JSON.stringify(chave)});
    return l
      ? { x: Math.round(l.x * window.innerWidth), y: Math.round(l.y * window.innerHeight) }
      : { x: null, y: null };
  })()`;
}

/**
 * V7 — O ACENTO DO CÉU: acha um NOME DE VERDADE já desenhado na tela
 * (`acharCorpoDesenhado`) e clica NELE — o mesmo ponto que
 * `a11y.mjs`/`a11y-celular.mjs` já usam para achar um rótulo de verdade
 * em vez de sortear um pixel. A 1ª gravação escolhia pela BUSCA (o
 * fluxo da C3), que seleciona pelo NOME sem saber se o marcador está em
 * quadro — Júpiter caiu fora, a câmera voou por segundos reenquadrando,
 * e os 200ms do acento (`acentoDaSelecao`, `LabelCanvas.ts`) passaram
 * inteiros fora da gravação. Clicando um nome que JÁ ESTÁ na tela
 * (vista padrão do Atlas, tour pulado, nada selecionado) a câmera não
 * VOA para lá — mas ainda REENQUADRA um pouco (a ficha que abre ao lado
 * muda a área útil, medido: um corpo qualquer derivou umas dezenas de
 * px em menos de 1s), o bastante para um recorte ESTÁTICO perder o
 * marcador antes mesmo do acento acabar (medido: 1 pixel âmbar nos
 * primeiros 160ms). Por isso a V7 PERSEGUE: `amostrarSequencia` relê a
 * posição projetada do MESMO corpo (`jsPosicaoDoRotulo`) em cada alvo
 * de ms, e cada recorte usa a posição DAQUELE instante, não a do clique.
 */
async function cenaAcentoC5(sessao, commit, pastaClipe) {
  const alvo = await acharCorpoDesenhado(sessao);
  if (!alvo) throw new Error('v7: nenhum nome de corpo desenhado e clicável na vista padrão do Atlas');

  const alvosMs = [0, 80, 160, 250, 500];
  let tClique = 0;
  let rastro = [];
  const quadros = await gravarClipe(
    sessao,
    { largura: 1440, altura: 900, pastaQuadros: pastaClipe },
    async () => {
      await dorme(150); // garante o screencast já armado antes do clique
      tClique = Date.now();
      await clicarEmPonto(sessao, alvo.x, alvo.y);
      await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_FICHA_PAINEL}'))`, 3000);
      rastro = await amostrarSequencia(sessao, tClique, alvosMs, () => jsPosicaoDoRotulo(alvo.key));
    }
  );

  const clipe = renderizarClipe(quadros, resolve(CAPTURAS, `motion-c5-v7-acento-${commit}.mp4`));
  const duracao = quadros[quadros.length - 1].ts - quadros[0].ts;
  const folha = renderizarContato(clipe, duracao, resolve(CAPTURAS, `motion-c5-v7-acento-${commit}.png`));

  // RECORTES EM RESOLUÇÃO CHEIA (160×160, pedido do enunciado), UM POR
  // AMOSTRA DO RASTRO — cada um centrado na posição TRACKED daquele
  // instante (ou na do clique, se o corpo sumiu da lista). O quadro vem
  // de `quadroMaisProximoDoAlvo` (a mesma régua do `--contorno`, mais
  // abaixo neste arquivo): o quadro cujo timestamp REAL do CDP mais bate
  // com o `dtMs` REAL da amostra (nunca o alvo nominal). Os alvos cobrem
  // os ~200ms do acento (`DURACAO_DO_ACENTO_MS`, LabelCanvas.ts) e um
  // instante bem depois, já apagado.
  const LADO = 160;
  const recortes = rastro.map((a, i) => {
    const cx = a.x ?? alvo.x;
    const cy = a.y ?? alvo.y;
    const x0 = Math.max(0, Math.min(1440 - LADO, Math.round(cx - LADO / 2)));
    const y0 = Math.max(0, Math.min(900 - LADO, Math.round(cy - LADO / 2)));
    const quadro = quadroMaisProximoDoAlvo(quadros, tClique, a.dtMs);
    const destino = semSobrescrever(resolve(CAPTURAS, `motion-c5-v7-recorte${i + 1}-${commit}.png`));
    const r = spawnSync(FFMPEG, [
      '-y', '-i', quadro.arquivo,
      '-vf', `crop=${LADO}:${LADO}:${x0}:${y0}`,
      destino,
    ], { stdio: 'pipe' });
    if (r.status !== 0) {
      throw new Error(`ffmpeg (recorte v7) falhou (${r.status}): ${(r.stderr || '').toString().slice(-800)}`);
    }
    return destino;
  });

  // A CONTAGEM DE PIXELS ÂMBAR em cada recorte — a medida que o
  // enunciado pede, não "parece que sim".
  const contagens = [];
  for (const arq of recortes) contagens.push(await contarPixelsAmbar(arq));

  const ultimoRastro = [...rastro].reverse().find((a) => a.x !== null) ?? null;
  const derivaPx = ultimoRastro ? Math.round(Math.hypot(ultimoRastro.x - alvo.x, ultimoRastro.y - alvo.y)) : null;

  return {
    clipe, folha, quadros: quadros.length, recortes, contagens, alvo, alvosMs, rastro, derivaPx,
  };
}

function jsDica(idDica) {
  return `(() => {
    const el = document.getElementById(${JSON.stringify(idDica)});
    if (!el) return { existe: false };
    const cs = getComputedStyle(el);
    return { existe: true, hidden: el.hidden, animationName: cs.animationName, opacity: cs.opacity };
  })()`;
}

/**
 * V8 — A DICA DE AJUDA ("?", `Ajuda.tsx`): o hover mostra (`entraDica`,
 * `--t-rapido` = 120ms) e a saída do mouse esconde de imediato — não há
 * saída animada, o atributo `hidden` alterna direto. Usa um "?" do
 * painel de Ajustes (o mesmo componente que a barra do tempo também
 * usa).
 */
async function cenaDicaC5(sessao, commit, pasta) {
  await pressionarEscape(sessao); // fecha a ficha do V7, se ainda aberta
  await dorme(300);
  await clicarReal(sessao, SEL_AJUSTES_GATILHO);
  await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_AJUSTES_PAINEL}'))`, 3000);
  await dorme(400); // assenta a entrada do painel antes de medir

  const seletorAjuda = `${SEL_AJUSTES_PAINEL} .hud-ajuda`;
  const rAjuda = await retanguloDe(sessao, seletorAjuda);
  if (!rAjuda) throw new Error(`v8: "${seletorAjuda}" não encontrado`);
  const idDica = await sessao.js(
    `document.querySelector(${JSON.stringify(seletorAjuda)})?.getAttribute('aria-controls') ?? null`
  );
  if (!idDica) throw new Error('v8: o "?" não tem aria-controls');

  let antes = null;
  let durante = [];
  let depois = [];
  const quadros = await gravarClipe(
    sessao,
    { largura: 1440, altura: 900, pastaQuadros: pasta },
    async () => {
      antes = await sessao.js(jsDica(idDica));
      const t0 = Date.now();
      await moverMouse(sessao, rAjuda.x + rAjuda.width / 2, rAjuda.y + rAjuda.height / 2);
      durante = await amostrarSequencia(sessao, t0, [16, 80, 200], () => jsDica(idDica));
      const t1 = Date.now();
      await moverMouse(sessao, 10, 10);
      depois = await amostrarSequencia(sessao, t1, [16, 80, 200], () => jsDica(idDica));
    }
  );

  const clipe = renderizarClipe(quadros, resolve(CAPTURAS, `motion-c5-v8-dica-${commit}.mp4`));
  const duracao = quadros[quadros.length - 1].ts - quadros[0].ts;
  const folha = renderizarContato(clipe, duracao, resolve(CAPTURAS, `motion-c5-v8-dica-${commit}.png`));

  return {
    clipe, folha, quadros: quadros.length, antes, durante, depois,
  };
}

async function rodarC5(quais = null) {
  const roda = (v) => !quais || quais.has(v);
  mkdirSync(CAPTURAS, { recursive: true });
  const pastas = Object.fromEntries(
    ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'].map(
      (v) => [v, resolve(tmpdir(), `sonda-motion-c5-${v}-${process.pid}`)]
    )
  );
  let sessao = null;
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim().length > 0;

    sessao = await abrirSonda({ janela: '1440x900', prefixo: 'sonda-motion-c5' });
    const viewport = {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    };
    await sessao.send('Emulation.setDeviceMetricsOverride', viewport);
    // registra o viewport para o vigia da aba intrusa reaplicar depois de
    // fechar uma intrusa (ver o comentário em `abrirSonda`) — `--c5` não
    // troca de viewport em nenhuma cena, então um registro só já basta
    // para a corrida inteira.
    sessao.marcarViewport(viewport);
    const versaoChrome = await sessao.send('Browser.getVersion');

    const v1 = roda('v1') ? await comRetentativa(() => cenaAberturaC5(sessao, commit, pastas.v1)) : null;

    // V2–V6 precisam do filme TOCANDO (`iniciarFilmeC5`); só paga a
    // viagem até lá se alguma delas de fato vai rodar (`--c5=v7` sozinho
    // nunca entra aqui).
    if (roda('v2') || roda('v3') || roda('v4') || roda('v5') || roda('v6')) await iniciarFilmeC5(sessao);
    const v2 = roda('v2') ? await comRetentativa(() => cenaChromeC5(sessao, commit, pastas.v2)) : null;
    const v3 = roda('v3') ? await comRetentativa(() => cenaMaisC5(sessao, commit, pastas.v3)) : null;
    const v4 = roda('v4') ? await comRetentativa(() => cenaTransporteC5(sessao, commit, pastas.v4)) : null;
    const v5 = roda('v5') ? await comRetentativa(() => cenaProgressoC5(sessao, commit, pastas.v5)) : null;
    const v6 = roda('v6') ? await comRetentativa(() => cenaFimC5(sessao, commit, pastas.v6)) : null;

    if (roda('v7') || roda('v8')) await carregarAtlasC5(sessao);
    const v7 = roda('v7') ? await comRetentativa(() => cenaAcentoC5(sessao, commit, pastas.v7)) : null;
    const v8 = roda('v8') ? await comRetentativa(() => cenaDicaC5(sessao, commit, pastas.v8)) : null;

    const dpr = await sessao.js('window.devicePixelRatio');
    const relatorio = {
      meta: {
        commit,
        dirty,
        // O SERVIDOR É DE OUTRA ÁRVORE (isolada, item obrigatório do
        // enunciado): `commit`/`dirty` acima são desta sonda, não do
        // app que ela mede.
        appCommit: 'dcc08ea (servidor isolado, árvore limpa)',
        chrome: versaoChrome.product,
        app: APP,
        viewport: { width: 1440, height: 900 },
        dpr,
        idioma: 'pt-BR',
        preset: 'performance',
        cenas: quais ? [...quais].join(',') : 'v1-v8',
        geradoEm: new Date().toISOString(),
      },
      v1, v2, v3, v4, v5, v6, v7, v8,
    };
    const destinoJson = semSobrescrever(resolve(CAPTURAS, `motion-c5-${commit}.json`));
    writeFileSync(destinoJson, JSON.stringify(relatorio, null, 2));

    const linhas = [
      `=== sonda-motion c5 — commit ${commit}${dirty ? ' (dirty)' : ' (limpo)'} · app dcc08ea (servidor isolado) ===`,
      `Chrome ${versaoChrome.product} | mesa 1440x900 DPR${dpr} | pt-BR | q=performance`,
    ];
    if (v1) {
      linhas.push(
        `V1 abertura: ${v1.clipe} (${v1.quadros}q) — marcos amostrados=${v1.marcosAmostrados}, com marcoReflexo=${v1.marcosComReflexo}; `
          + `CTA ::after animation=${v1.cta?.animationName} delay=${v1.cta?.animationDelay} duration=${v1.cta?.animationDuration}`
      );
    }
    if (v2) {
      linhas.push(
        `V2 chrome do filme: ${v2.clipe} (${v2.quadros}q) — visível transitionDuration=${v2.visivel.transitionDuration}; `
          + `escondeu aos ${v2.escondida?.escondeuAos}ms (transitionDuration=${v2.escondida?.transitionDuration}); `
          + `revelou aos ${v2.revelada?.revelouAos}ms; escondeu de novo aos ${v2.escondidaDeNovo?.escondeuDeNovoAos}ms`
      );
    }
    if (v3) {
      linhas.push(
        `V3 "Mais": ${v3.clipe} (${v3.quadros}q) — abrir(mouse) classes=${v3.aposAbrirMouse.map((a) => a.painelClasse).join(' / ')}; `
          + `fechar(mouse) classes=${v3.aposFecharMouse.map((a) => `${a.painelClasse}${a.painelInert ? '[inert]' : ''}`).join(' / ')}; `
          + `Tab entrou no painel=${v3.focoAposTab?.foco?.dentroDoPainel}; fechar(teclado) foco voltou ao gatilho=${v3.focoAposFechar?.foco?.ehOGatilho}`
      );
    }
    if (v4) {
      linhas.push(
        `V4 transporte: ${v4.clipe} (${v4.quadros}q) — pausar animation=${v4.aposPausar.map((a) => a.iconeAnimationName).join('/')}; `
          + `retomar animation=${v4.aposRetomar.map((a) => a.iconeAnimationName).join('/')}; `
          + `taxa realce=${v4.aposTaxa.map((a) => a.rateRealceTexto).join('/')} texto=${v4.aposTaxa.map((a) => a.rateTexto).join('/')}`
      );
    }
    if (v5) {
      linhas.push(
        `V5 progresso: ${v5.clipe} (${v5.quadros}q) — hover transform=${v5.hover?.trackTransform}; `
          + `foco após ${v5.tabsAteFoco} Tabs, transform=${v5.foco?.trackTransform} pontoOpacity=${v5.foco?.pontoOpacity}; `
          + `durante o arrasto transform=${v5.duranteArrasto?.trackTransform} distância ponto↔fill=${v5.duranteArrasto?.distanciaPontoFillPx?.toFixed(2)}px; `
          + `logo ao soltar=${v5.aposSoltarCedo?.distanciaPontoFillPx?.toFixed(2)}px, assentado=${v5.aposAssentar?.distanciaPontoFillPx?.toFixed(2)}px`
      );
    }
    if (v6) {
      linhas.push(
        `V6 tela final: ${v6.clipe} (${v6.quadros}q) — chegou a 'end' aos ${v6.chegouFimAos}ms, véu visível aos ${v6.veuVisivelAos}ms; `
          + `aceno do CTA: delay=${v6.delayMs}ms duração=${v6.duracaoMs}ms (sweep ${v6.delayMs}→${v6.delayMs + v6.duracaoMs}ms depois do véu); `
          + `"Ficar neste céu" clicável em todas as ${v6.amostras.length} amostras=${v6.sempreClicavel} `
          + `(animation=${v6.amostras.map((a) => a.animationName).join('/')}); recortes=${v6.recortes.join(', ')}`
      );
    }
    if (v7) {
      linhas.push(
        `V7 acento no céu: alvo="${v7.alvo?.name}" (${v7.alvo?.key}) em (${v7.alvo?.x},${v7.alvo?.y}); `
          + `${v7.clipe} (${v7.quadros}q); deriva da câmera após o clique=${v7.derivaPx}px; `
          + `recortes(ms=${v7.alvosMs.join('/')})=${v7.recortes.join(', ')}; `
          + `pixels âmbar=${v7.contagens.map((c) => c.n).join('/')} de ${v7.contagens[0]?.dePixels ?? '?'} por recorte`
      );
    }
    if (v8) {
      linhas.push(
        `V8 dica de ajuda: ${v8.clipe} (${v8.quadros}q) — antes hidden=${v8.antes?.hidden}; `
          + `durante o hover animation=${v8.durante.map((a) => a.animationName).join('/')} hidden=${v8.durante.map((a) => a.hidden).join('/')}; `
          + `depois de sair hidden=${v8.depois.map((a) => a.hidden).join('/')}`
      );
    }
    linhas.push(`JSON: ${destinoJson}`);
    process.stdout.write(`${linhas.join('\n')}\n`);
  } catch (erro) {
    process.stdout.write(`BLOCKED: ${erro.stack || erro.message}\n`);
    process.exitCode = 1;
  } finally {
    if (sessao) await sessao.fechar();
    for (const p of Object.values(pastas)) rmSync(p, { recursive: true, force: true });
  }
}

// ============================================================
// `--contorno` — C6 do plano de motion (docs/PLANO-MOTION-UI.md §7 e
// §12.5): o A/B do halo WebGL de borda (`three/core/contornoDaUi.ts`,
// `?contorno=webgl`) contra o reflexo CSS de sempre
// (`reflexoDeAbertura`, `01-base.css`, que roda nos dois lados — esta
// sonda nunca o desliga). Quatro peças, na ordem do enunciado:
//   1) dois clipes (A sem a flag, B com ela) recortados na FAIXA da
//      borda esquerda/superior do painel (60px fora + 20px dentro),
//      só os 450ms depois do clique, mais UMA imagem lado a lado (A em
//      cima, B embaixo, mesmos instantes relativos ao clique);
//   2) prova por luminância: a faixa 4–20px fora da borda ESQUERDA tem
//      de clarear mais em B que em A enquanto o halo está vivo e
//      voltar a bater com A depois de ~450ms — e ficar no nível de A
//      também em B com `&shot=1` e com "reduzir movimento" ligado (os
//      dois portões que `App.tsx`/`Director` já fecham por código;
//      isto é a PROVA, não a implementação);
//   3) custo pareado: o tempo de GPU do desenho do halo (só existe em
//      B — o mesmo truque de `EXT_disjoint_timer_query_webgl2` de
//      `gpu-profile.mjs`, reescrito aqui porque aquele arquivo dispara
//      um Chrome property ao ser importado, não é uma função) e a
//      distribuição do tempo de quadro (rAF) nos 450ms depois de CADA
//      abertura, A×B, dez aberturas cada — abrindo/fechando a aba
//      Camadas dez vezes, sempre esperando a saída terminar (só assim
//      `montada` volta a `null` e o próximo clique é de novo um
//      nascimento "do nada", o único gatilho que o C6 liga).
// Roda uma vez e relata os números — não é PASSA/FALHA como
// `--interrupcoes`/`--folha`: o veredito de adoção é do dono (aceite
// do C6, linha 542), a régua só mede.
// ============================================================

/**
 * O INSTRUMENTO DE GPU/QUADRO, injetado por
 * `Page.addScriptToEvaluateOnNewDocument` (uma vez por sessão — CDP
 * reaplica sozinho em CADA navegação seguinte). Mesma técnica de
 * `gpu-profile.mjs` (timer query por draw, rótulo pelo texto do
 * shader), reescrita aqui porque IMPORTAR aquele arquivo dispararia o
 * Chrome dele — o cabeçalho desta sonda pede exatamente o contrário.
 * Dois desvios do original: (a) só um rótulo interessa —
 * `distanciaAoRetangulo`, função só do fragment shader do halo
 * (`contornoDaUi.ts`) — o resto vira `outro` e é descartado; (b) o
 * embrulho do `requestAnimationFrame` roda SEMPRE, mesmo sem a
 * extensão — o tempo de quadro (rAF) não depende dela, só o tempo de
 * GPU depende.
 */
const SCRIPT_GPU_HALO = `
window.__contornoProf = { ready: 0, ext: 0, err: null, halo: [], rafAbs: [] };
(() => {
  const G = window.__contornoProf;
  const origGet = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    const gl = origGet.call(this, type, attrs);
    if (gl && !G.ready && this.isConnected && (type === 'webgl2' || type === 'webgl')) {
      try { instrument(gl, type === 'webgl2'); } catch (e) { G.err = String((e && e.stack) || e); }
    }
    return gl;
  };
  function instrument(gl, is2) {
    G.ready = 1;
    const ext = gl.getExtension(is2 ? 'EXT_disjoint_timer_query_webgl2' : 'EXT_disjoint_timer_query');
    G.ext = ext ? 1 : 0;
    let poll = () => {};
    if (ext) {
      const TE = ext.TIME_ELAPSED_EXT;
      const src = new WeakMap();
      const shaders = new WeakMap();
      const label = new WeakMap();
      const oSrc = gl.shaderSource.bind(gl);
      gl.shaderSource = (sh, s) => { src.set(sh, s); oSrc(sh, s); };
      const oAtt = gl.attachShader.bind(gl);
      gl.attachShader = (p, sh) => {
        const a = shaders.get(p) || [];
        a.push(sh);
        shaders.set(p, a);
        oAtt(p, sh);
      };
      const labelOf = (p) => {
        let l = label.get(p);
        if (l) return l;
        const s = (shaders.get(p) || []).map((sh) => src.get(sh) || '').join('\\n');
        l = s.includes('distanciaAoRetangulo') ? 'halo:contorno' : 'outro';
        label.set(p, l);
        return l;
      };
      let cur = null;
      const oUse = gl.useProgram.bind(gl);
      gl.useProgram = (p) => { cur = p; oUse(p); };
      const free = [];
      const pending = [];
      let active = null;
      const nomes = ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements'];
      for (const nome of nomes) {
        if (typeof gl[nome] !== 'function') continue;
        const orig = gl[nome].bind(gl);
        gl[nome] = function (...a) {
          if (active) return orig(...a);
          const q = free.pop() || gl.createQuery();
          try { gl.beginQuery(TE, q); active = q; } catch (e) { return orig(...a); }
          const r = orig(...a);
          gl.endQuery(TE);
          active = null;
          pending.push({ q, l: cur ? labelOf(cur) : 'semPrograma' });
          return r;
        };
      }
      poll = () => {
        while (pending.length) {
          const r = pending[0];
          if (!gl.getQueryParameter(r.q, gl.QUERY_RESULT_AVAILABLE)) break;
          pending.shift();
          const dis = gl.getParameter(ext.GPU_DISJOINT_EXT);
          const ns = gl.getQueryParameter(r.q, gl.QUERY_RESULT);
          free.push(r.q);
          if (dis) continue;
          if (r.l === 'halo:contorno') G.halo.push({ ns, t: performance.now() });
        }
      };
    }
    const oRAF = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => oRAF((t) => {
      poll();
      G.rafAbs.push(t);
      return cb(t);
    });
  }
})();
`;

/** p50/p95 (ou o que `p` pedir, 0..1) — `null` sem amostra nenhuma, o
 *  caso esperado do halo em A (a flag nem existe lá). */
function percentilDe(valores, p) {
  if (!valores.length) return null;
  const s = [...valores].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
}

/** o quadro (de `gravarClipe`) cujo instante REAL (`ts`, segundos,
 *  `Page.screencastFrame.metadata.timestamp`) mais se aproxima de
 *  `t0Ms + alvoMs` — `t0Ms` é `Date.now()` do Node, a mesma base de
 *  época (UTC, unix) que o CDP usa nesse campo, por isso a comparação
 *  é direta, sem segundo relógio para reconciliar. */
function quadroMaisProximoDoAlvo(quadros, t0Ms, alvoMs) {
  let melhor = null;
  let menorDif = Infinity;
  for (const q of quadros) {
    const dif = Math.abs(q.ts * 1000 - (t0Ms + alvoMs));
    if (dif < menorDif) { menorDif = dif; melhor = q; }
  }
  return melhor;
}

/** a luminância MÉDIA (`YAVG`, 0–255) de uma região de um PNG — prova
 *  se B clareia uma faixa que A não alcança. `signalstats` calcula,
 *  `metadata=print:file=-` manda o valor para STDOUT (não o log de
 *  sempre do ffmpeg, que vai para stderr). */
function luminanciaMediaPng(arquivoPng, { x, y, largura, altura }) {
  const r = spawnSync(FFMPEG, [
    '-i', arquivoPng,
    '-vf', `crop=${largura}:${altura}:${x}:${y},signalstats,metadata=print:file=-`,
    '-f', 'null', '-',
  ], { stdio: 'pipe' });
  if (r.status !== 0) {
    throw new Error(`ffmpeg (luminância) falhou (${r.status}): ${(r.stderr || '').toString().slice(-800)}`);
  }
  const m = /lavfi\.signalstats\.YAVG=([\d.]+)/.exec((r.stdout || '').toString());
  if (!m) throw new Error(`luminância: YAVG não encontrado em ${arquivoPng}`);
  return Number.parseFloat(m[1]);
}

/** arredonda para PAR — a mesma exigência que já derrubou um clipe
 *  desta sonda antes (comentário de `abrirSonda`, "altura ÍMPAR, que o
 *  libx264 recusa"): o recorte do C6 vira `-pix_fmt yuv420p` de novo. */
const parPixel = (n) => {
  const r = Math.round(n);
  return r % 2 === 0 ? r : r - 1;
};

/** a faixa do RECORTE (clipes `-a-`/`-b-`): 60px fora + 20px dentro na
 *  horizontal (a borda ESQUERDA), 60px de folga acima do topo até o pé
 *  do painel (cobre também a borda de CIMA, e o percurso inteiro do
 *  ponto quente que desce a esquerda — seção 7/12.5 do plano). */
function faixaDoRecorte(painel) {
  const FORA = 60;
  const DENTRO = 20;
  const x = Math.max(0, Math.round(painel.x - FORA));
  const y = Math.max(0, Math.round(painel.y - FORA));
  const x1 = painel.x + DENTRO;
  const y1 = painel.y + painel.height + FORA;
  const largura = Math.min(parPixel(x1 - x), 1440 - x);
  const altura = Math.min(parPixel(y1 - y), 900 - y);
  return { x, y, largura, altura };
}

/** a faixa da PROVA por luminância: 16px de largura, 4–20px fora da
 *  borda ESQUERDA de repouso — fora do DOM opaco do painel (regra 5 da
 *  seção 7: o halo só existe onde a página não pintou nada), altura
 *  inteira do painel (o termo `base` do shader não decai com Y, só a
 *  intensidade geral do envelope de tempo — qualquer Y already mostra
 *  a diferença). */
function faixaDeLuminancia(painel) {
  return {
    x: Math.max(0, Math.round(painel.x - 20)),
    y: Math.round(painel.y),
    largura: 16,
    altura: Math.max(2, Math.round(painel.height)),
  };
}

/** recorta ESPACIALMENTE (a faixa da borda) e no TEMPO (janela relativa
 *  ao clique, calculada por quem chama) um clipe já bruto — o clipe
 *  final `-a-`/`-b-` do C6. */
function recortarClipeContorno(clipeOrigem, retangulo, { inicioSeg, duracaoSeg }, destinoFinal) {
  const destino = semSobrescrever(destinoFinal);
  const r = spawnSync(FFMPEG, [
    '-y', '-i', clipeOrigem,
    '-ss', Math.max(0, inicioSeg).toFixed(3), '-t', duracaoSeg.toFixed(3),
    '-vf', `crop=${retangulo.largura}:${retangulo.altura}:${retangulo.x}:${retangulo.y}`,
    '-pix_fmt', 'yuv420p',
    destino,
  ], { stdio: 'pipe' });
  if (r.status !== 0) {
    throw new Error(`ffmpeg (recorte c6) falhou (${r.status}): ${(r.stderr || '').toString().slice(-800)}`);
  }
  return destino;
}

/** UMA imagem, A empilhado sobre B, nos MESMOS instantes relativos ao
 *  clique: `QUADROS_LADO` colunas por clipe (`tile=Nx1`, o mesmo par
 *  fps-calculado/tile de `renderizarContato`), depois `vstack`. */
function ladoALadoContorno(clipeA, clipeB, janelaSegundos, destinoFinal) {
  const QUADROS_LADO = 5;
  const fps = (QUADROS_LADO + 1) / Math.max(janelaSegundos, 0.1);
  const destino = semSobrescrever(destinoFinal);
  const r = spawnSync(FFMPEG, [
    '-y', '-i', clipeA, '-i', clipeB,
    '-filter_complex',
    `[0:v]fps=${fps.toFixed(4)},tile=${QUADROS_LADO}x1[a];`
      + `[1:v]fps=${fps.toFixed(4)},tile=${QUADROS_LADO}x1[b];`
      + '[a][b]vstack=inputs=2[saida]',
    '-map', '[saida]', '-frames:v', '1',
    destino,
  ], { stdio: 'pipe' });
  if (r.status !== 0) {
    throw new Error(`ffmpeg (lado a lado c6) falhou (${r.status}): ${(r.stderr || '').toString().slice(-800)}`);
  }
  return destino;
}

/** área do quad (px², DPR 1) a partir do retângulo do painel — a mesma
 *  conta de `contornoDaUi.ts` (`MARGEM_DO_QUAD_PX = SIGMA_PX * 4 = 48`,
 *  o quad cresce 48px para cada lado nos dois eixos). */
const areaDoQuadPx = (r) => (r.width + 96) * (r.height + 96);

async function rodarContorno() {
  mkdirSync(CAPTURAS, { recursive: true });
  const pastaA = resolve(tmpdir(), `sonda-motion-contorno-a-${process.pid}`);
  const pastaB = resolve(tmpdir(), `sonda-motion-contorno-b-${process.pid}`);
  let sessao = null;
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim().length > 0;

    sessao = await abrirSonda({ janela: '1440x900', prefixo: 'sonda-motion-contorno' });
    const viewport = {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    };
    await sessao.send('Emulation.setDeviceMetricsOverride', viewport);
    sessao.marcarViewport(viewport);
    const versaoChrome = await sessao.send('Browser.getVersion');
    await sessao.send('Page.addScriptToEvaluateOnNewDocument', { source: SCRIPT_GPU_HALO });

    const carregar = async (query) => {
      let assentou = null;
      let ultimoErro = null;
      for (let tentativa = 1; tentativa <= 3 && !assentou; tentativa++) {
        try {
          assentou = await sessao.ir(query);
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

    // UMA abertura GRAVADA (passo 1) — o painel some de novo antes de
    // devolver, para a página ficar limpa para as dez do passo 3, na
    // MESMA navegação.
    const capturarAbertura = async (pasta) => {
      let t0Ms = 0;
      const quadros = await gravarClipe(
        sessao,
        { largura: 1440, altura: 900, pastaQuadros: pasta },
        async () => {
          await dorme(150); // quadros "de antes", para o recorte ter contexto
          await clicarReal(sessao, SEL_CAMADAS_GATILHO);
          t0Ms = Date.now();
          await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_CAMADAS_PAINEL}'))`, 3000);
          await dorme(600); // 450ms pedidos + folga além do teto do halo (400ms)
        }
      );
      const painel = await retanguloDe(sessao, SEL_CAMADAS_PAINEL);
      await clicarReal(sessao, `${SEL_CAMADAS_PAINEL} .hud-fechar`);
      await esperarPor({ js: sessao.js }, `document.querySelector('${SEL_CAMADAS_PAINEL}') === null`, 3000);
      await dorme(200);
      return { quadros, t0Ms, painel };
    };

    // DEZ aberturas SEM gravação (passo 3, custo) — marca o clique no
    // relógio DA PÁGINA (`performance.now()`, a base do `rAF`/GPU do
    // instrumento), espera a janela medida, fecha e ESPERA A SAÍDA
    // TERMINAR antes da próxima: sem isso `montada` não volta a `null`
    // e o próximo clique seria uma TROCA, não um nascimento — e o C6
    // nunca ligaria de novo (`App.tsx`, guarda `anterior !== null`).
    const medirCusto = async () => {
      const t0sPerf = [];
      for (let i = 0; i < 10; i++) {
        await clicarReal(sessao, SEL_CAMADAS_GATILHO);
        t0sPerf.push(await sessao.js('performance.now()'));
        await dorme(600);
        await clicarReal(sessao, `${SEL_CAMADAS_PAINEL} .hud-fechar`);
        await esperarPor({ js: sessao.js }, `document.querySelector('${SEL_CAMADAS_PAINEL}') === null`, 3000);
        await dorme(150);
      }
      const prof = await sessao.js('window.__contornoProf');
      return { t0sPerf, prof };
    };

    // uma foto só (`Page.captureScreenshot`) para `&shot=1` e para
    // "reduzir movimento" — os dois não têm abertura animada nenhuma
    // para recortar no tempo, e os dois portões já são código
    // (`semMovimento()`/`Director.shotMode`); isto só fotografa o
    // resultado.
    const medirSemHalo = async ({ query, reduzido, arquivo }) => {
      await carregar(query);
      if (reduzido) {
        await sessao.send('Emulation.setEmulatedMedia', {
          features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
        });
      }
      await clicarReal(sessao, SEL_CAMADAS_GATILHO);
      await esperarPor({ js: sessao.js }, `Boolean(document.querySelector('${SEL_CAMADAS_PAINEL}'))`, 3000);
      await dorme(200); // o pico do halo (60ms), se existisse, já teria passado
      const shot = await sessao.send('Page.captureScreenshot', { format: 'png' });
      const painel = await retanguloDe(sessao, SEL_CAMADAS_PAINEL);
      if (reduzido) await sessao.send('Emulation.setEmulatedMedia', { features: [] });
      if (!painel) throw new Error('painel de Camadas não encontrado (shot/reduzido)');
      writeFileSync(arquivo, Buffer.from(shot.data, 'base64'));
      return luminanciaMediaPng(arquivo, faixaDeLuminancia(painel));
    };

    process.stdout.write('  ·     A (CSS só)…\n');
    await carregar(QUERY);
    const capA = await capturarAbertura(pastaA);
    const custoA = await medirCusto();

    process.stdout.write('  ·     B (CSS + halo WebGL)…\n');
    await carregar(`${QUERY}&contorno=webgl`);
    const capB = await capturarAbertura(pastaB);
    const custoB = await medirCusto();

    if (!capA.painel || !capB.painel) {
      throw new Error('painel de Camadas não encontrado ao medir o retângulo de repouso');
    }

    // A REFERÊNCIA de cada checagem é o MESMO modo (shot/reduzido) SEM a
    // flag — não o repouso "ao vivo" de A: medido (11/09), `shot=1`
    // sozinho já muda a cena determinística nesta faixa (27,5 contra
    // ~22 "ao vivo"), sem `contorno=webgl` nenhum — comparar B contra o
    // repouso ao vivo teria acusado um halo que não existe.
    process.stdout.write('  ·     shot=1, sem a flag (referência)…\n');
    const luminanciaShotA = await medirSemHalo({
      query: `${QUERY}&shot=1`, reduzido: false, arquivo: resolve(pastaA, 'still-shot.png'),
    });
    process.stdout.write('  ·     B com &shot=1…\n');
    const luminanciaShotB = await medirSemHalo({
      query: `${QUERY}&contorno=webgl&shot=1`, reduzido: false, arquivo: resolve(pastaB, 'still-shot.png'),
    });
    process.stdout.write('  ·     reduzir-movimento, sem a flag (referência)…\n');
    const luminanciaReduzidoA = await medirSemHalo({
      query: QUERY, reduzido: true, arquivo: resolve(pastaA, 'still-reduzido.png'),
    });
    process.stdout.write('  ·     B com reduzir-movimento…\n');
    const luminanciaReduzidoB = await medirSemHalo({
      query: `${QUERY}&contorno=webgl`, reduzido: true, arquivo: resolve(pastaB, 'still-reduzido.png'),
    });

    // ---- passo 1: clipes recortados + lado a lado ----
    const brutoA = renderizarClipe(capA.quadros, resolve(pastaA, 'bruto.mp4'));
    const brutoB = renderizarClipe(capB.quadros, resolve(pastaB, 'bruto.mp4'));
    const janelaA = { inicioSeg: capA.t0Ms / 1000 - capA.quadros[0].ts, duracaoSeg: 0.45 };
    const janelaB = { inicioSeg: capB.t0Ms / 1000 - capB.quadros[0].ts, duracaoSeg: 0.45 };
    const clipeA = recortarClipeContorno(
      brutoA, faixaDoRecorte(capA.painel), janelaA, resolve(CAPTURAS, `motion-c6-a-${commit}.mp4`)
    );
    const clipeB = recortarClipeContorno(
      brutoB, faixaDoRecorte(capB.painel), janelaB, resolve(CAPTURAS, `motion-c6-b-${commit}.mp4`)
    );
    const ladoALado = ladoALadoContorno(
      clipeA, clipeB, 0.45, resolve(CAPTURAS, `motion-c6-lado-a-lado-${commit}.png`)
    );

    // ---- passo 2: prova por luminância ----
    const ALVOS_MS = [100, 200, 300, 600];
    const luminanciaEm = (cap) => Object.fromEntries(ALVOS_MS.map((alvoMs) => {
      const q = quadroMaisProximoDoAlvo(cap.quadros, cap.t0Ms, alvoMs);
      return [`t${alvoMs}`, q ? luminanciaMediaPng(q.arquivo, faixaDeLuminancia(cap.painel)) : null];
    }));
    const luminanciaA = luminanciaEm(capA);
    const luminanciaB = luminanciaEm(capB);

    // ---- passo 3: custo pareado ----
    const dentroDeAlgumaAbertura = (t, t0sPerf) => t0sPerf.some((t0) => t >= t0 && t <= t0 + 450);
    const haloMs = custoB.prof.halo
      .filter((h) => dentroDeAlgumaAbertura(h.t, custoB.t0sPerf))
      .map((h) => h.ns / 1e6);
    const frameTimeDe = ({ t0sPerf, prof }) => {
      const deltas = [];
      for (let i = 1; i < prof.rafAbs.length; i++) {
        if (dentroDeAlgumaAbertura(prof.rafAbs[i], t0sPerf)) deltas.push(prof.rafAbs[i] - prof.rafAbs[i - 1]);
      }
      return deltas;
    };
    const frameTimeA = frameTimeDe(custoA);
    const frameTimeB = frameTimeDe(custoB);

    const relatorio = {
      meta: {
        commit,
        dirty,
        // O SERVIDOR É DE OUTRA ÁRVORE (isolada, item obrigatório do
        // enunciado): `commit`/`dirty` acima são desta sonda, não do
        // app que ela mede.
        appCommit: 'dcc08ea (servidor isolado, árvore limpa)',
        chrome: versaoChrome.product,
        app: APP,
        viewport: { width: 1440, height: 900 },
        dpr: 1,
        idioma: 'pt-BR',
        preset: 'performance',
        geradoEm: new Date().toISOString(),
      },
      clipes: { a: clipeA, b: clipeB, ladoALado },
      recorte: { a: faixaDoRecorte(capA.painel), b: faixaDoRecorte(capB.painel) },
      areaDoQuadPx: { a: areaDoQuadPx(capA.painel), b: areaDoQuadPx(capB.painel) },
      luminancia: {
        faixaPx: '4–20px fora da borda esquerda, largura 16px, altura do painel',
        a: luminanciaA,
        b: luminanciaB,
        // referência = MESMO modo (shot/reduzido) sem `contorno=webgl` —
        // não o repouso "ao vivo" de `a` acima (ver comentário no ponto
        // de coleta, mais acima nesta função).
        shot: { a: luminanciaShotA, b: luminanciaShotB },
        reduzido: { a: luminanciaReduzidoA, b: luminanciaReduzidoB },
      },
      custo: {
        extDisponivel: { a: Boolean(custoA.prof.ext), b: Boolean(custoB.prof.ext) },
        haloGpuMs: {
          amostras: haloMs.length,
          p50: percentilDe(haloMs, 0.5),
          p95: percentilDe(haloMs, 0.95),
        },
        haloDesenhouEmA: custoA.prof.halo.length, // esperado 0 — a flag nem existe em A
        frameTimeMs: {
          a: { amostras: frameTimeA.length, p50: percentilDe(frameTimeA, 0.5), p95: percentilDe(frameTimeA, 0.95) },
          b: { amostras: frameTimeB.length, p50: percentilDe(frameTimeB, 0.5), p95: percentilDe(frameTimeB, 0.95) },
        },
        aberturas: 10,
        janelaMs: 450,
      },
    };
    const destinoJson = semSobrescrever(resolve(CAPTURAS, `motion-c6-${commit}.json`));
    writeFileSync(destinoJson, JSON.stringify(relatorio, null, 2));

    const fmt = (n, casas = 1) => (n === null || n === undefined ? '-' : n.toFixed(casas));
    const linhas = [
      `=== sonda-motion c6 (halo WebGL × CSS) — commit ${commit}${dirty ? ' (dirty)' : ' (limpo)'} · app dcc08ea (servidor isolado) ===`,
      `Chrome ${versaoChrome.product} | mesa 1440x900 DPR1 | pt-BR | q=performance`,
      `clipe A: ${clipeA}`,
      `clipe B: ${clipeB}`,
      `lado a lado: ${ladoALado}`,
      `luminância (YAVG 0-255, faixa 4-20px fora da borda esquerda) — `
        + `A: 100ms=${fmt(luminanciaA.t100)} 200ms=${fmt(luminanciaA.t200)} 300ms=${fmt(luminanciaA.t300)} 600ms=${fmt(luminanciaA.t600)} | `
        + `B: 100ms=${fmt(luminanciaB.t100)} 200ms=${fmt(luminanciaB.t200)} 300ms=${fmt(luminanciaB.t300)} 600ms=${fmt(luminanciaB.t600)}`,
      `shot=1 — sem a flag: ${fmt(luminanciaShotA)} | B: ${fmt(luminanciaShotB)} `
        + `(a referência é o PRÓPRIO shot=1 sem a flag, não o repouso ao vivo de A: `
        + `medido, shot=1 sozinho já muda essa faixa para ~27 contra ~22 ao vivo)`,
      `reduzir-movimento — sem a flag: ${fmt(luminanciaReduzidoA)} | B: ${fmt(luminanciaReduzidoB)}`,
      `GPU do halo (só existe em B) — ${relatorio.custo.haloGpuMs.amostras} amostras, `
        + `p50=${fmt(relatorio.custo.haloGpuMs.p50, 3)}ms p95=${fmt(relatorio.custo.haloGpuMs.p95, 3)}ms `
        + `(halo desenhou em A: ${relatorio.custo.haloDesenhouEmA} vezes — esperado 0) `
        + `[EXT_disjoint_timer_query_webgl2 disponível: A=${relatorio.custo.extDisponivel.a} B=${relatorio.custo.extDisponivel.b}]`,
      `tempo de quadro nos 450ms após cada abertura (rAF, ms), 10 aberturas cada — `
        + `A: ${frameTimeA.length} amostras p50=${fmt(relatorio.custo.frameTimeMs.a.p50, 2)} p95=${fmt(relatorio.custo.frameTimeMs.a.p95, 2)} | `
        + `B: ${frameTimeB.length} amostras p50=${fmt(relatorio.custo.frameTimeMs.b.p50, 2)} p95=${fmt(relatorio.custo.frameTimeMs.b.p95, 2)}`,
      'números crus deste Mac, cabeça headless: sob vsync o rAF só entrega múltiplos de ~16,7ms — uma '
        + 'diferença de custo menor que isso pode não aparecer no tempo de quadro mesmo existindo na GPU '
        + '(mesmo ponto do comentário `SEM_VSYNC` em gpu-profile.mjs); por isso o p50/p95 da GPU acima é '
        + 'a medida mais confiável do custo do passe em si.',
      `área do quad (retângulo do painel + 48px de margem por lado, DPR 1) — A: ${areaDoQuadPx(capA.painel)}px² B: ${areaDoQuadPx(capB.painel)}px²`,
      `JSON: ${destinoJson}`,
    ];
    process.stdout.write(`${linhas.join('\n')}\n`);
  } catch (erro) {
    process.stdout.write(`BLOCKED: ${erro.stack || erro.message}\n`);
    process.exitCode = 1;
  } finally {
    if (sessao) await sessao.fechar();
    rmSync(pastaA, { recursive: true, force: true });
    rmSync(pastaB, { recursive: true, force: true });
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
} else if (C5) {
  await rodarC5(C5_QUAIS);
} else if (CONTORNO) {
  await rodarContorno();
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
