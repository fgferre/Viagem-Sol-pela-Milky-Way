// Serve: dono — o voo livre recebe bem: convite, furo ancorado, captura de ponteiro opt-in e nenhuma tecla presa
// Custo: 0,6 min
// O SMOKE DO VOO LIVRE — convite, Spotlight e captura de ponteiro (F5).
//
//   node scripts/visual/voo-smoke.mjs
//
// POR QUE UM TERCEIRO HARNESS, e não mais provas no `atlas-smoke`: aquele
// é o smoke do PORTAL (entrar no Atlas, partir, o pixel da volta) e o
// `a11y.mjs` é o juiz dos DIÁLOGOS. Isto aqui é um terceiro assunto — o
// voo livre — e amontoá-lo num dos dois faria o veredito de um cobrir a
// falha do outro. Mesma sessão de Chrome só, mesmo driver (`chrome.mjs`).
//
// O QUE ELE COBRA:
//  1. o convite abre na PRIMEIRA entrada no voo livre, com os três passos;
//  2. o furo do Spotlight está ANCORADO no alvo real (o retângulo medido
//     do `[data-spot]`, não um número escrito à mão);
//  3. "entendi" grava `conviteVisto` e a RECARGA não o traz de volta;
//  4. ele é filho DIRETO de `.hud-root` e some em `?shot=2` — sem isso
//     ele entraria nas 18 vistas oficiais;
//  5. a captura de ponteiro é OPT-IN: nada tranca sozinho;
//  6. o BACKOFF engata de verdade — depois de três `pointerlockerror` o
//     clique deixa de virar pedido (contado no próprio
//     `requestPointerLock`) — e o escopo dele é o MODO, não a sessão:
//     sair do voo livre e voltar zera a conta;
//  7. o unlock solta TODAS as teclas — a defesa que impede a nave de sair
//     voando sozinha quando o `keyup` não chega;
//  8. nada nosso disputa o Esc, que é quem devolve o ponteiro;
//  9. `prefers-reduced-motion` tira a única transição do convite.
//
// A CAPTURA DE VERDADE NÃO SE ENCENA AQUI: o Chrome headless NEGA
// `requestPointerLock` (medido — o pedido volta como `pointerlockerror`).
// Por isso as provas 6, 7 e 8 dirigem os MESMOS eventos que o navegador
// dispararia (`pointerlockerror`, `pointerlockchange`) em vez de fingir
// que o lock aconteceu: o que se cobra é a reação do app, que é a parte
// que é nossa.
import { abrirSessao, APP_PADRAO, dorme } from './chrome.mjs';

const APP = process.env.APP_URL || APP_PADRAO;
const JANELA = process.env.JANELA || '1200x900';
// `?pos=` é a porta do voo livre que o harness já usa (precedência
// declarada na F1: ela ganha até do `?atlas=1`); `?q=cinema` pinado.
const VOO = 'pos=0,0,0.1&look=0,0,0&q=cinema';
const falhas = [];
const conferir = (ok, texto) => {
  process.stdout.write(`${ok ? '  OK  ' : '  FALHA '} ${texto}\n`);
  if (!ok) falhas.push(texto);
};

const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
if (!ping.includes('<div id="root"')) throw new Error(`dev server não respondeu em ${APP}`);

const sessao = await abrirSessao({ janela: JANELA, app: APP, prefixo: 'voo-smoke' });
const js = (e) => sessao.js(e);

try {
  // ---- 1 e 2: o convite e o furo ancorado no alvo REAL -------------
  const chegada = await sessao.ir(`${VOO}&shot=1`);
  conferir(chegada.via === 'sinal', `voo livre: assentou por via=${chegada.via}`);
  conferir(
    (await js('window.__director.captura.fase')) === 'free',
    'voo livre: a fase é "free"'
  );
  conferir(
    (await js("!!document.querySelector('.spotlight')")) === true,
    'o convite abre na PRIMEIRA entrada no voo livre'
  );
  conferir(
    (await js("document.querySelector('.spotlight').parentElement.classList.contains('hud-root')"))
      === true,
    'o convite é filho DIRETO de .hud-root (a regra do .bare-mode só alcança esses)'
  );

  /** o furo do Spotlight contra o retângulo medido do alvo declarado */
  const ancoragem = () => js(`(() => {
    const cartaz = document.querySelector('.spotlight-cartao');
    const furos = [...document.querySelectorAll('.spotlight-mascara rect')]
      .filter((r) => r.getAttribute('width') !== '100%');
    if (!furos.length) return null;
    const f = furos[0];
    const caixa = (el) => { const b = el.getBoundingClientRect();
      return { x: b.left, y: b.top, w: b.width, h: b.height }; };
    const spots = [...document.querySelectorAll('[data-spot]')].map((e) => ({
      nome: e.getAttribute('data-spot'), ...caixa(e),
    }));
    const furo = {
      x: +f.getAttribute('x'), y: +f.getAttribute('y'),
      w: +f.getAttribute('width'), h: +f.getAttribute('height'),
    };
    // de qual alvo este furo é? o que casa em folga constante nos 4 lados
    const dono = spots.find((s) =>
      Math.abs((s.x - furo.x) - (s.y - furo.y)) < 0.5
      && Math.abs((furo.w - s.w) - (furo.h - s.h)) < 0.5
      && s.x - furo.x > 0 && furo.w - s.w > 0);
    return {
      texto: (document.querySelector('.convite-texto') || {}).innerText || '',
      dono: dono ? dono.nome : null,
      folga: dono ? +(dono.x - furo.x).toFixed(2) : null,
      cartazVisivel: !!cartaz && cartaz.getBoundingClientRect().width > 0,
      spots: spots.map((s) => s.nome).join(','),
    };
  })()`);

  const passo1 = await ancoragem();
  conferir(
    passo1 !== null && passo1.dono === 'olhar' && passo1.folga > 0,
    `passo 1 aponta o alvo REAL "${passo1?.dono}" com folga de ${passo1?.folga} px`
      + ` — "${passo1?.texto}" (alvos na página: ${passo1?.spots})`
  );
  conferir(passo1?.cartazVisivel === true, 'passo 1: o cartão do convite está na tela');

  const adiante = async (rotulo) => {
    await js(
      `[...document.querySelectorAll('.convite-linha button')]`
      + `.find((b) => b.innerText.trim().toLowerCase() === '${rotulo}').click()`
    );
    await dorme(150);
  };

  await adiante('continuar');
  const passo2 = await ancoragem();
  conferir(
    passo2?.dono === 'voar' && passo2.texto !== passo1.texto,
    `passo 2 muda de alvo e de texto: "${passo2?.dono}" — "${passo2?.texto}"`
  );
  await adiante('continuar');
  const passo3 = await ancoragem();
  conferir(
    passo3?.dono === 'visitar' && passo3.texto !== passo2.texto,
    `passo 3 muda de alvo e de texto: "${passo3?.dono}" — "${passo3?.texto}"`
  );

  // ---- 3: fechar GRAVA, e a recarga não traz de volta --------------
  await adiante('entendi');
  conferir(
    (await js("!!document.querySelector('.spotlight')")) === false,
    'o convite fecha no "entendi"'
  );
  conferir(
    /"conviteVisto":true/.test(await js("localStorage.getItem('viagem-prefs') || ''")),
    `"conviteVisto" gravado: ${await js("localStorage.getItem('viagem-prefs')")}`
  );
  await sessao.ir(`${VOO}&shot=1`);
  conferir(
    (await js("!!document.querySelector('.spotlight')")) === false,
    'RECARGA no mesmo perfil: o convite NÃO reaparece'
  );
  // E ELE NÃO INVADE O ATLAS — que desde 22/08 (item 73) tem o SEU,
  // com os gestos de lá e a chave `conviteAtlasVisto` própria. O que
  // este veredito guarda é a fronteira: o convite do voo livre ensina
  // WASD, e no Atlas o WASD não voa. Quem julga o convite do Atlas por
  // inteiro é o `a11y.mjs`; aqui basta ver que o texto é OUTRO.
  await js("localStorage.removeItem('viagem-prefs')");
  await sessao.ir('atlas=1&q=cinema&shot=1');
  const noAtlas = await js(`(() => {
    const t = (document.querySelector('.convite-texto') || {}).innerText || '';
    return JSON.stringify({
      existe: !!document.querySelector('.spotlight'),
      texto: t,
      conta: (document.querySelector('.convite-conta') || {}).innerText || '',
    });
  })()`);
  const doAtlas = JSON.parse(noAtlas);
  conferir(
    doAtlas.existe && !/w a s d/i.test(doAtlas.texto) && /4/.test(doAtlas.conta),
    `o convite do voo livre não invade o Atlas — lá o roteiro é outro`
      + ` ("${doAtlas.conta.trim()}" · "${doAtlas.texto}")`
  );
  // ...e fechar o do Atlas não marca o do voo livre como visto
  await js(`[...document.querySelectorAll('.convite-linha button')]
    .find((b) => b.textContent.trim() === 'pular').click()`);
  await sessao.ir(`${VOO}&shot=1`);
  conferir(
    (await js("!!document.querySelector('.spotlight')")) === true,
    'e pular o do Atlas NÃO consome o do voo livre — são duas chaves'
  );
  await js("localStorage.removeItem('viagem-prefs')");

  // ---- 4: o bare-mode o apaga (as 18 vistas não o veem) ------------
  await sessao.ir(`${VOO}&shot=2`);
  const bare = await js(`(() => {
    const s = document.querySelector('.spotlight');
    return { existe: !!s, retangulos: s ? s.getClientRects().length : -1 };
  })()`);
  conferir(
    bare.existe && bare.retangulos === 0,
    `?shot=2: o convite está montado e NÃO desenha (retângulos=${bare.retangulos})`
  );

  // ---- 5, 6: o opt-in e o backoff ---------------------------------
  await sessao.ir(`${VOO}&shot=1`);
  conferir(
    (await js('String(document.pointerLockElement)')) === 'null'
      && (await js('window.__director.capturaDePonteiro.ativa')) === false,
    'a captura é OPT-IN: nada tranca o ponteiro sozinho ao entrar no voo livre'
  );
  conferir(
    (await js("document.querySelector('.free-hint-captura').innerText.toLowerCase()"))
      .includes('capturar o ponteiro'),
    'a UI diz ONDE se captura — o botão vive na dica de voo'
  );

  // o contador entra no lugar do `requestPointerLock` do canvas: o que se
  // mede é se o CLIQUE vira PEDIDO, não se o Chrome headless topa trancar
  // (ele não topa — ver o cabeçalho)
  await js(`(() => {
    const c = document.querySelector('.scene-canvas');
    window.__pedidos = 0;
    c.requestPointerLock = () => { window.__pedidos++; };
  })()`);
  const clicarBotao = () => js("document.querySelector('.free-hint-captura').click()");
  await clicarBotao();
  conferir((await js('window.__pedidos')) === 1, 'o clique no botão vira UM pedido de captura');

  await js("for (let i = 0; i < 3; i++) document.dispatchEvent(new Event('pointerlockerror'))");
  await dorme(120);
  const negado = await js(`JSON.stringify({
    erros: window.__director.capturaDePonteiro.estado.erros,
    desistiu: window.__director.capturaDePonteiro.desistiu,
    rotulo: document.querySelector('.free-hint-captura').innerText,
    travado: document.querySelector('.free-hint-captura').disabled,
  })`);
  const n = JSON.parse(negado);
  conferir(
    n.erros === 3 && n.desistiu === true,
    `BACKOFF: três pointerlockerror e a captura desiste (erros=${n.erros})`
  );
  await clicarBotao();
  conferir(
    (await js('window.__pedidos')) === 1,
    'depois de desistir, o clique NÃO vira pedido novo (o pedido eterno é o defeito)'
  );
  conferir(
    n.travado === true && !n.rotulo.toLowerCase().includes('capturar o ponteiro'),
    `e a UI diz a verdade em vez de oferecer o que não entrega: "${n.rotulo}"`
  );

  // ...MAS O ESCOPO É O MODO, NÃO A SESSÃO. É o do doador, palavra por
  // palavra ("counter resets on successful lock + on `surfaceModeActive`
  // flipping false"), e a razão é medida: `pointerlockerror` também
  // dispara em negativas TRANSITÓRIAS (pedido logo depois de um
  // `exitPointerLock`, documento sem foco, gesto que o navegador não
  // contou). Sem esta volta, três ciclos rápidos de Esc-e-clicar matavam
  // o opt-in até a RECARGA — que dentro do Atlas custa o estado inteiro
  // — num navegador que suporta a captura perfeitamente.
  await js('window.__director.entrarNoAtlas({ instantaneo: true })');
  await dorme(200);
  await js('window.__director.enterFreeRoam()');
  await dorme(300);
  const reaberto = await js(`JSON.stringify({
    erros: window.__director.capturaDePonteiro.estado.erros,
    desistiu: window.__director.capturaDePonteiro.desistiu,
    travado: document.querySelector('.free-hint-captura').disabled,
    rotulo: document.querySelector('.free-hint-captura').innerText,
  })`);
  const r = JSON.parse(reaberto);
  conferir(
    r.erros === 0 && r.desistiu === false && r.travado === false
      && r.rotulo.toLowerCase().includes('capturar o ponteiro'),
    `SAIR DO MODO zera a conta: a captura volta a se oferecer (${reaberto})`
  );

  // ---- 7: o unlock solta TODAS as teclas ---------------------------
  // TUDO numa expressão só, de propósito: entre uma chamada de CDP e a
  // seguinte cabe um quadro, e um quadro com a tecla presa deixa inércia
  // no `vel` — a prova mediria a inércia em vez do conjunto de teclas.
  await sessao.ir(`${VOO}&shot=1`);
  const teclas = JSON.parse(await js(`JSON.stringify((() => {
    const andando = () => window.__director.captura.andando;
    const antes = andando();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    const segurando = andando();
    document.dispatchEvent(new Event('pointerlockchange'));
    return { antes, segurando, depois: andando() };
  })())`));
  conferir(
    teclas.antes === false && teclas.segurando === true && teclas.depois === false,
    `o unlock solta TODAS as teclas (parado=${teclas.antes},`
      + ` com W=${teclas.segurando}, depois do unlock=${teclas.depois})`
  );

  // ---- 8: ninguém disputa o Esc -----------------------------------
  // Quem devolve o ponteiro é o NAVEGADOR; o que é nosso é não brigar
  // com ele e reagir ao unlock. As duas metades, nesta ordem.
  const esc = JSON.parse(await js(`JSON.stringify((() => {
    const ev = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape',
      bubbles: true, cancelable: true });
    document.body.dispatchEvent(ev);
    return { impedido: ev.defaultPrevented };
  })())`));
  conferir(
    esc.impedido === false,
    'nada no voo livre dá preventDefault no Esc — a tecla que devolve o ponteiro é do navegador'
  );
  const volta = JSON.parse(await js(`JSON.stringify((() => {
    document.dispatchEvent(new Event('pointerlockchange'));
    return { ativa: window.__director.capturaDePonteiro.ativa };
  })())`));
  await dorme(120);
  conferir(
    volta.ativa === false
      && (await js("document.querySelector('.free-hint-captura').disabled")) === false,
    'depois do unlock a captura volta a se oferecer (o botão destrava)'
  );

  // ---- 9: reduced-motion ------------------------------------------
  // Sem `?shot=` (o modo foto já zera transição por conta própria — aqui
  // o que se mede é a promessa do prefers-reduced-motion).
  await js("localStorage.removeItem('viagem-prefs')");
  await sessao.ir(VOO);
  const transicaoNormal = await js(
    "getComputedStyle(document.querySelector('.spotlight')).transitionDuration"
  );
  conferir(
    transicaoNormal !== '0s',
    `sem reduced-motion o convite entra por fade (transition ${transicaoNormal})`
  );
  await sessao.reduzirMovimento();
  await js("localStorage.removeItem('viagem-prefs')");
  await sessao.ir(VOO);
  const reduzido = JSON.parse(await js(`JSON.stringify({
    transicao: getComputedStyle(document.querySelector('.spotlight')).transitionDuration,
    opacidade: getComputedStyle(document.querySelector('.spotlight')).opacity,
  })`));
  conferir(
    reduzido.transicao === '0s' && reduzido.opacidade === '1',
    `reduced-motion: a troca é INSTANTÂNEA (transition ${reduzido.transicao},`
      + ` opacidade ${reduzido.opacidade})`
  );
} finally {
  sessao.fechar();
}

if (falhas.length) {
  process.stdout.write(`\nSMOKE DO VOO LIVRE: ${falhas.length} falha(s)\n`);
  process.exit(1);
}
process.stdout.write('\nSMOKE DO VOO LIVRE: tudo verde\n');
