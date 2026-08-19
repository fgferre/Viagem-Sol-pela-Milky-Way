// O JUIZ DO SOM NO NAVEGADOR — gesto, relógio, pausa, atos e `?mute=1`.
//
//   node scripts/visual/audio-smoke.mjs
//
// O Chrome do harness fica com a saída física mutada para não tocar na
// máquina durante CI, mas o AudioContext é real: estado, nós e automações são
// os mesmos do visitante. Cliques saem por CDP como gesto confiável.
import { abrirSessao, APP_PADRAO } from './chrome.mjs';

const APP = process.env.APP_URL || APP_PADRAO;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const falhas = [];

const conferir = (ok, texto) => {
  process.stdout.write(`${ok ? '  OK  ' : '  FALHA '} ${texto}\n`);
  if (!ok) falhas.push(texto);
};

async function esperar(sessao, expression, timeout = 6000) {
  const start = Date.now();
  while (Date.now() - start <= timeout) {
    if (await sessao.js(expression)) return Date.now() - start;
    await sleep(50);
  }
  return null;
}

async function clicar(sessao, expression, nome) {
  const rect = await sessao.js(`(() => {
    const element = ${expression};
    if (!element) return null;
    const b = element.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height };
  })()`);
  conferir(Boolean(rect && rect.w > 0 && rect.h > 0), `${nome}: controle visível`);
  if (!rect) return;
  await sessao.clicar(rect.x, rect.y);
}

const audio = (sessao) => sessao.js('window.__director.audio');

const sessao = await abrirSessao({ janela: '1200x900', app: APP, prefixo: 'audio-smoke' });
try {
  await sessao.send('Emulation.setDeviceMetricsOverride', {
    width: 1200,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Fluxo normal: o contexto não nasce no carregamento nem na tela de título.
  const intro = await sessao.ir('q=cinema&shot=1');
  conferir(intro.via === 'sinal', `abertura assentou por ${intro.via}`);
  let state = await audio(sessao);
  conferir(state.started === false, 'a tela de título não cria AudioContext');
  conferir(state.contextState === 'uninitialized', 'a trilha nasce sem contexto');
  conferir(state.muted === false, 'sem ?mute=1 o filme nasce com som disponível');

  await clicar(
    sessao,
    "[...document.querySelectorAll('.veil-intro button')].find((b) => b.textContent.includes('Iniciar'))",
    'Iniciar a viagem'
  );
  const iniciou = await esperar(
    sessao,
    "window.__director.fase === 'journey' && window.__director.audio.started && window.__director.audio.contextState === 'running'"
  );
  conferir(iniciou !== null, `o gesto iniciou a viagem e o áudio em ${iniciou ?? '—'} ms`);
  state = await audio(sessao);
  conferir(state.active && state.masterTarget > 0, 'o ato CASA está audível com o relógio andando');
  conferir(state.frame.act === 'casa', `o primeiro gesto soa o ato “${state.frame.act}”`);

  await clicar(sessao, "document.querySelector('[aria-label=\"Pausar a viagem\"]')", 'Pausar');
  const pausou = await esperar(
    sessao,
    '!window.__director.audio.active && window.__director.audio.masterTarget === 0'
  );
  conferir(pausou !== null, `pausa silenciou a trilha em ${pausou ?? '—'} ms`);
  state = await audio(sessao);
  conferir(state.contextState === 'running', 'pausar não destrói nem suspende o contexto');

  // Seek usa o mesmo relógio e troca a instrumentação sem recriar nós.
  for (const [t, act] of [[84, 'orion'], [209, 'mergulho'], [289, 'revelacao']]) {
    await sessao.js(`window.__director.seek(${t})`);
    const mudou = await esperar(sessao, `window.__director.audio.frame.act === '${act}'`);
    conferir(mudou !== null, `seek t=${t} selecionou o ato ${act}`);
  }
  state = await audio(sessao);
  conferir(state.started && state.contextState === 'running', 'os quatro atos compartilham um contexto contínuo');
  conferir(state.frame.shimmerGain > state.frame.gravityGain, 'a revelação troca pressão por abertura harmônica');

  await clicar(sessao, "document.querySelector('[aria-label=\"Retomar a viagem\"]')", 'Retomar');
  const retomou = await esperar(sessao, 'window.__director.audio.active && window.__director.audio.masterTarget > 0');
  conferir(retomou !== null, `retomar devolveu a trilha em ${retomou ?? '—'} ms`);

  await clicar(sessao, "document.querySelector('[data-sound-toggle]')", 'Desligar o som');
  const mutou = await esperar(
    sessao,
    "window.__director.audio.muted && window.__director.audio.masterTarget === 0 && new URLSearchParams(location.search).get('mute') === '1'"
  );
  conferir(mutou !== null, `o controle desligou e escreveu ?mute=1 em ${mutou ?? '—'} ms`);
  const pressedOff = await sessao.js("document.querySelector('[data-sound-toggle]')?.getAttribute('aria-pressed')");
  conferir(pressedOff === 'false', 'o botão declara som desligado para leitor de tela');

  await clicar(sessao, "document.querySelector('[data-sound-toggle]')", 'Ligar o som');
  const desmutou = await esperar(
    sessao,
    "!window.__director.audio.muted && window.__director.audio.masterTarget > 0 && !new URLSearchParams(location.search).has('mute')"
  );
  conferir(desmutou !== null, `o controle religou sem recriar a viagem em ${desmutou ?? '—'} ms`);
  await clicar(sessao, "document.querySelector('[aria-label=\"Pausar a viagem\"]')", 'Pausar antes da recarga');
  await esperar(sessao, '!window.__director.audio.active');

  // Porta muda: nem o clique de início cria contexto enquanto o gosto é mudo.
  const mutedIntro = await sessao.ir('q=cinema&shot=1&mute=1');
  conferir(mutedIntro.via === 'sinal', `abertura muda assentou por ${mutedIntro.via}`);
  state = await audio(sessao);
  conferir(state.muted && !state.started, '?mute=1 nasce mudo e sem AudioContext');
  await clicar(
    sessao,
    "[...document.querySelectorAll('.veil-intro button')].find((b) => b.textContent.includes('Iniciar'))",
    'Iniciar a viagem muda'
  );
  const viagemMuda = await esperar(sessao, "window.__director.fase === 'journey'");
  conferir(viagemMuda !== null, 'o mute não impede a imagem de começar');
  state = await audio(sessao);
  conferir(state.muted && !state.started && state.masterTarget === 0, 'o gesto respeita ?mute=1 integralmente');

  await clicar(sessao, "document.querySelector('[data-sound-toggle]')", 'Ligar depois de ?mute=1');
  const ligouDepois = await esperar(
    sessao,
    "window.__director.audio.started && !window.__director.audio.muted && window.__director.audio.contextState === 'running'"
  );
  conferir(ligouDepois !== null, `o próprio botão fornece o gesto para ligar em ${ligouDepois ?? '—'} ms`);
  await clicar(sessao, "document.querySelector('[aria-label=\"Pausar a viagem\"]')", 'Pausar a viagem ligada');
  await esperar(sessao, '!window.__director.audio.active');

  // Deep-link/captura chama play internamente, mas não é gesto do usuário.
  const deepLink = await sessao.ir('q=cinema&shot=1&t=84');
  conferir(deepLink.via === 'sinal', `deep-link assentou por ${deepLink.via}`);
  state = await audio(sessao);
  conferir(state.frame.act === 'orion' && state.time === 84, 'o som busca o mesmo t=84 da imagem');
  conferir(!state.started && state.contextState === 'uninitialized', 'deep-link não burla a política de autoplay');
  conferir(!state.active && state.masterTarget === 0, 'captura congelada permanece silenciosa');

  await clicar(sessao, "document.querySelector('[aria-label=\"Retomar a viagem\"]')", 'Retomar o deep-link');
  const retomouDeepLink = await esperar(
    sessao,
    "window.__director.audio.started && window.__director.audio.contextState === 'running' && window.__director.audio.active"
  );
  conferir(retomouDeepLink !== null, `o gesto de retomar liberou o áudio em ${retomouDeepLink ?? '—'} ms`);
  state = await audio(sessao);
  conferir(state.frame.act === 'orion' && state.masterTarget > 0, 'a retomada soa o mesmo ato do quadro');
  await clicar(sessao, "document.querySelector('[aria-label=\"Pausar a viagem\"]')", 'Pausar o deep-link');
  await esperar(sessao, '!window.__director.audio.active');

  const gritos = sessao.gritos();
  conferir(gritos.length === 0, `nenhum erro ou aviso no console (${gritos.length})`);
} finally {
  sessao.fechar();
}

if (falhas.length) {
  process.stderr.write(`\n${falhas.length} falha(s) no gate do áudio.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('\nÁUDIO OK — gesto, quatro atos, pausa, seek e mute conferidos.\n');
}
