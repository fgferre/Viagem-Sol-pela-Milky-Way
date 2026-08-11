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
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { CHROME, GPU_FLAGS, matarPerfil } from './chrome.mjs';

const LADO = process.argv[2] || 'antes';
const SO = process.argv[3];
const N = 2;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const VISTAS = [
  // O ATO DO SOL não tinha vista, e as duas alavancas que sobram na fila de
  // performance (nebulosa atrás da fotosfera, LUT do flick da coroa) vivem
  // inteiras aqui: t=0..12 para uma, t=0..~20 para a outra. Com a lista
  // começando em t=40, o gate era cego justamente para elas — e é o trecho
  // mais olhado do filme. t=6 pega o Sol grande na tela, com coroa, raias e
  // proeminências vivas.
  ['sol', '?t=6&shot=2'],
  ['interno', '?t=40&shot=2'],
  ['travessia', '?t=100&shot=2'],
  ['mergulho', '?t=180&shot=2'],
  ['edgeon', '?t=261&shot=2'],
  ['faceon', '?t=293&shot=2'],
  // RETRATO POR PADRÃO, não opt-in. Os três harnesses do repo capturam em 1:1
  // (rodada 1800x1800, sky 1440x1440, este 1800x1800), e defeito que dependa
  // do ASPECTO da tela é invisível para todos eles. Foi exatamente o caso da
  // margem lateral do recorte de sprite da galáxia: a versão errada passava
  // nas cinco vistas quadradas. Uma sonda que alguém precisa lembrar de rodar
  // não fecha buraco nenhum — por isso esta linha, e não uma variável de
  // ambiente. 700x1800 dá aspecto 0,40, abaixo do limiar onde a margem
  // derivada só da altura começa a apagar ponto.
  ['retrato', '?t=100&shot=2', '700x1800'],
  // ------------------------------------------------------------------
  // ONDA 3 — as vistas que faltavam para o motor estelar (PLANO-ATLAS.md:446
  // pede "Sol pixel-igual em 4 condições e heroes em 3 distâncias"; nenhuma
  // existia). `?t=` não serve: o instante amarra a distância ao trajeto da
  // hélice, e o que se quer medir é a DISTÂNCIA. `?pos=&look=` (App.tsx:137-145)
  // crava a câmera no ponto exato — aqui, olhando a origem (o Sol) ou a estrela.
  //
  // As 4 do Sol caem uma em cada regime do crossfade disco↔clarão
  // (lodStellar.ts): 0,10 pc = disco pleno (uWorldFade 1, uGain 0); 0,25 =
  // meio da rampa do disco (uWorldFade 0,5, uGain 0,77); 0,32 = o estouro,
  // logo antes do corte duro de custo `world > 0.02` que cai em 0,3249 pc
  // (uWorldFade 0,034, uGain 1, uCore 0,07 — é a vista que denuncia se
  // alguém mover uma casa decimal); 0,50 = estrela pura (grupo do disco
  // apagado, uGain e uCore em 1).
  ['soldisco', '?pos=0,0,0.1&look=0,0,0&shot=2'],
  ['solrampa', '?pos=0,0,0.25&look=0,0,0&shot=2'],
  ['solestouro', '?pos=0,0,0.32&look=0,0,0&shot=2'],
  ['solestrela', '?pos=0,0,0.5&look=0,0,0&shot=2'],
  // As de hero são Betelgeuse (152,67 pc de casa, a supergigante do Ato II),
  // a câmera na PRÓPRIA reta Sol→estrela. As três distâncias são os três
  // regimes do `farFade` do billboard (heroStars.ts:58, 320→900 pc): 200 pc
  // = presença 1; 600 = meio da rampa (0,526); 950 = presença 0, o hero não
  // desenha mais e só o ponto do catálogo sobra. As três ficam com dHome
  // abaixo de 1200, senão o corte de director.ts:885 desligaria o grupo
  // inteiro e as três vistas mediriam a mesma coisa (nada).
  //
  // E `hero8`, a QUARTA: medida antes de escolher as outras três, o
  // billboard de Betelgeuse tem RAIO de 0,45 px a 200 pc, 0,15 a 600 e 0,10
  // a 950 — o tamanho na tela é `uSize/(d·tan29°)` e não depende da lente
  // (o `uZoom` cancela o fov de propósito, heroStars.ts:14-16). Ou seja: as
  // três vistas do farFade são regimes do CONTRATO, mas nelas o hero é
  // sub-pixel, e a dupla-luz hero↔catálogo que a fase 3 vai desfazer não
  // aparece em nenhuma. A 8 pc o mesmo billboard tem 11,3 px de raio: é a
  // única em que se PODE ver o hero e o ponto do catálogo somando luz na
  // mesma posição — a vista que julga a decisão D2.
  //
  // [fase 3, correção de fato] "a única" vale para BETELGEUSE, não para
  // as 16. Perto de casa a soma de luz é a REGRA: a 0,06 pc oito das 16
  // têm billboard maior que o próprio ponto, e nas quatro vistas do Sol
  // é α Centauri (1,4 pc) quem soma as duas luzes dentro do quadro —
  // medido com `?dom=1`, são elas e a hero8 que mudam quando a cessão
  // liga. hero8 continua julgando a D2 em Betelgeuse; as do Sol julgam
  // o caso vizinho, que é o mais comum.
  ['hero200', '?pos=7.3677,349.6513,45.4654&look=3.1895,151.3642,19.682&shot=2'],
  ['hero600', '?pos=15.7242,746.2254,97.0322&look=3.1895,151.3642,19.682&shot=2'],
  ['hero950', '?pos=23.0362,1093.2277,142.1532&look=3.1895,151.3642,19.682&shot=2'],
  ['hero8', '?pos=3.0224,143.4327,18.6507&look=3.1895,151.3642,19.682&shot=2'],
];
const APP = process.env.APP_URL || 'http://127.0.0.1:5173';
// TIER FIXO, e ele não é preferência: sem `?q=` o `autoQuality` do engine
// rebaixa cinema→alta→performance sozinho assim que a média cai de 42 fps
// (engine.ts), e isso troca `nebulaSteps` 56→30 e o `pixelRatio` NO MEIO da
// espera de 700 quadros. Numa máquina que segura 60 fps o degrau nunca dispara
// e `q=cinema` é BIT-EXATO (mesmo tier, mesmo preset — só desliga o
// automático); numa que não segura, sem ele o gate compara duas imagens
// tiradas em qualidades diferentes e chama a diferença de regressão. Medido
// aqui: o app assenta em `performance` (raymarch de 30 passos) em toda
// captura, e o `nearCeiling` do engine ainda pode reacelerar para `alta`.
const PIN = '&q=cinema';
// EXTRA=&knob=1 anexa um parâmetro a TODAS as vistas — o A/B de um knob se faz
// com o mesmo binário dos dois lados, sem editar nada entre as capturas.
const EXTRA = process.env.EXTRA || '';
// JANELA=700x1800 muda o tamanho da captura. Existe porque os TRÊS harnesses do
// repo capturam em 1:1 (rodada 1800x1800, sky 1440x1440, este 1800x1800), e
// qualquer defeito que dependa do ASPECTO da tela é invisível para todos eles —
// o corte lateral de sprite é exatamente desse tipo.
// JANELA=LxA sobrescreve o tamanho de TODAS as vistas, para varredura ad hoc.
const ESTADO = resolve(tmpdir(), `ab-identidade-${LADO}.json`);
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

async function capturar(query, porta, png, janela) {
  const [jw, jh] = (janela || process.env.JANELA || '1800x1800').split('x');
  let efetivo = '?';
  const perfil = resolve(tmpdir(), `ab-${process.pid}-${porta}`);
  const chrome = spawn(CHROME, [
    ...GPU_FLAGS,
    '--hide-scrollbars', '--no-first-run', '--mute-audio',
    '--force-device-scale-factor=1', `--window-size=${jw},${jh}`,
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
    // COM TIMEOUT, e ele já custou uma bateria inteira: se o alvo do CDP morre
    // entre o /json/list e o handshake, nem `open` nem `error` disparam. A
    // promessa fica pendente para sempre, o Node fica sem handles, e o processo
    // SAI com um aviso de "unsettled top-level await" — três vistas capturadas,
    // nenhuma gravada, e um veredito que nunca vem.
    await new Promise((r, j) => {
      const relogio = setTimeout(() => j(new Error('WebSocket do CDP não abriu em 30 s')), 30000);
      ws.addEventListener('open', () => { clearTimeout(relogio); r(); });
      ws.addEventListener('error', (e) => { clearTimeout(relogio); j(new Error('WebSocket: ' + e.message)); });
    });
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
    // buffer EFETIVO, não a janela pedida: 700x1800 vira 684x1705 depois da
    // barra de rolagem e do chrome do headless, e é o buffer que decide o
    // aspecto que o shader vê
    const buf0 = await send('Runtime.evaluate', {
      expression: "(()=>{const c=document.querySelector('canvas');"
        + "return c?c.width+'x'+c.height:'?'})()",
      returnByValue: true,
    });
    efetivo = buf0.result.value;
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    // captura preta ou página de erro: um md5 estável de NADA passaria no teste
    if (buf.length < 40000) throw new Error(`captura suspeita de vazia (${buf.length} B)`);
    if (png) writeFileSync(png, buf);
    return createHash('md5').update(buf).digest('hex').slice(0, 12) + '@' + efetivo;
  } finally {
    chrome.kill();
    matarPerfil(perfil);
    await sleep(400);
    try { rmSync(perfil, { recursive: true, force: true }); } catch { /* perfil preso */ }
  }
}

const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
if (!ping.includes('<div id="root"')) throw new Error(`dev server não respondeu em ${APP}`);

// RETOMA o que já está em disco em vez de começar do zero. Uma bateria são
// ~20 min de GPU, e antes disto uma captura travada no meio jogava fora TODAS
// as vistas já medidas — inclusive as boas. Com o estado gravado por vista,
// re-rodar o mesmo lado só refaz o que falta, e `ab-identidade.mjs antes
// edgeon` deixa de apagar as outras cinco (o filtro `SO` escrevia um estado
// com uma vista só).
const md5 = existsSync(ESTADO) && !process.env.DOZERO
  ? JSON.parse(readFileSync(ESTADO, 'utf8'))
  : {};
let porta = 9500 + (process.pid % 100);
for (const [nome, query, janela] of VISTAS) {
  if (SO && nome !== SO) continue;
  if (md5[nome]?.length === N && !SO) {
    console.log(`${nome.padEnd(10)} ${md5[nome].join(' ')}  (de disco)`);
    continue;
  }
  md5[nome] = [];
  for (let k = 0; k < N; k++) {
    // capturas/ é gitignored e não existe em clone novo — criar aqui, senão
    // a única forma de OLHAR a diferença (o diff de pixel) morre no open()
    const png = SO ? resolve(ROOT, 'capturas', `ab-${LADO}-${nome}-${k}.png`) : null;
    if (png) mkdirSync(resolve(ROOT, 'capturas'), { recursive: true });
    // uma segunda chance por captura: o Chrome headless morre no arranque de
    // vez em quando, e perder a bateria por isso é caro demais
    let hash = null;
    for (let tent = 1; tent <= 2 && hash === null; tent++) {
      try {
        hash = await capturar(query + PIN + EXTRA, porta++, png, janela);
      } catch (e) {
        console.log(`  ${nome} ${k} tentativa ${tent} falhou: ${e.message}`);
        if (tent === 2) throw e;
      }
    }
    md5[nome].push(hash);
  }
  console.log(`${nome.padEnd(10)} ${md5[nome].join(' ')}`);
  // por VISTA, não no fim: o estado sobrevive a uma queda no meio
  writeFileSync(ESTADO, JSON.stringify(md5, null, 1));
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
