// A BUSCA E O DEEP-LINK DO FOCO, em navegador real (Onda 5, F3).
//
//   node scripts/visual/busca-smoke.mjs
//
// O QUE ESTE HARNESS COBRE, e por que não cabe nos outros: o juiz de
// a11y (`a11y.mjs`) já julga a paleta como DIÁLOGO — foco preso, Esc,
// devolução, setas e Enter na listbox. O que falta é o que a paleta faz
// DEPOIS de escolher e o que o link carrega, e isso é assunto de
// produto, não de acessibilidade:
//
//  1. `?foco=` ABRE o Atlas com a estrela em quadro (a porta implica o
//     modo: focar é coisa que só existe lá) — e a vista é IDEMPOTENTE:
//     enquadrar o mesmo nome de novo não move a câmera um bit. Sem isso
//     o link não reproduz a vista de quem o copiou.
//  2. `?foco=` que não acha NÃO CHUTA: o Atlas abre no enquadramento de
//     abertura e a linha de contexto diz o sistema, não uma estrela
//     parecida.
//  3. IDA E VOLTA pelo escritor VIVO: escolher na paleta e deixar o app
//     reescrever a própria URL (o caminho da troca de qualidade, que é
//     quem chama `urlComMomento`) tem de devolver, depois do reload, a
//     MESMA estrela em quadro. É a prova de que o link copiado reabre
//     igual — e ela passa pelo escritor de verdade, não por uma cópia
//     do formato dentro do teste.
//  4. O ESTADO VAZIO é honesto: diz o que não achou e mostra o que
//     funciona.
//  5. NO VOO LIVRE a mesma paleta VOA — o verbo é da fase, e o rótulo
//     promete o que a fase faz.
//  6. LATÊNCIA POR TECLA, medida de dois jeitos (a conta pura sobre o
//     índice completo e a ponta-a-ponta até a lista mudar na tela).
//  7. A paleta NÃO VAZA no `?shot=2` (o `.bare-mode` só esconde filhos
//     diretos de `.hud-root` — overlay portalizado para o body entraria
//     nas 18 vistas oficiais).
//  8. OS OVERLAYS SÃO DA FASE que os hospeda: sair dela e voltar não os
//     faz renascer sozinhos, nem com o foco preso dentro deles.
//  9. OS DEZ CORPOS DO SISTEMA são alvo de verdade: `?foco=terra`
//     resolve, a paleta os acha pelo nome pt-BR, a escolha enquadra a
//     ÓRBITA e o clique no rótulo faz o mesmo.
import { abrirSessao, APP_PADRAO } from './chrome.mjs';

const APP = process.env.APP_URL || APP_PADRAO;
const JANELA = process.env.JANELA || '1200x900';
// `?shot=1`: congela transições e o relógio visual, e MANTÉM o HUD — o
// objeto do juízo é justamente a UI.
const PIN = 'q=cinema&shot=1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const falhas = [];
const conferir = (ok, texto) => {
  process.stdout.write(`${ok ? '  OK  ' : '  FALHA '} ${texto}\n`);
  if (!ok) falhas.push(texto);
};

const contexto = (s) =>
  s.js("(document.querySelector('.atlas-contexto-nome') || {}).textContent || ''");

/** abre a paleta pelo gatilho, como quem clica nela */
async function abrirPaleta(s) {
  await s.js(`(() => {
    const b = document.querySelector('[data-abre-dialogo="busca"]');
    b.focus();
    b.click();
  })()`);
  await sleep(200);
}

const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
if (!ping.includes('<div id="root"')) throw new Error(`dev server não respondeu em ${APP}`);

const sessao = await abrirSessao({ janela: JANELA, app: APP, prefixo: 'busca-smoke' });
try {
  // ---- 1: a porta abre o modo, com a estrela em quadro -------------
  const entrou = await sessao.ir(`foco=hd48915&${PIN}`);
  conferir(entrou.via === 'sinal', `?foco= assentou por via=${entrou.via}`);
  const fase = await sessao.js('window.__director.captura.fase');
  conferir(fase === 'atlas', `?foco= sozinha ABRE o Atlas (fase '${fase}')`);
  const alvo = await contexto(sessao);
  conferir(alvo === 'Sirius', `?foco=hd48915 põe Sirius em quadro (em quadro: "${alvo}")`);
  const selo = await sessao.js(
    "document.querySelector('.atlas-selo-linha strong').textContent"
  );
  // o eixo ESCALA sai da GEOMETRIA: enquadrar uma estrela a 2,6 pc tira
  // o quadro do domínio profundo, e o selo tem de dizer isso sozinho —
  // sem que a porta precise se declarar desvio (ela é neutra)
  conferir(
    selo === 'FORA DE ESCALA',
    `e o selo conta a verdade da vista sem a porta se declarar ("${selo}")`
  );

  // ---- 1b: a mesma porta duas vezes dá a MESMA vista ---------------
  // O Atlas ENQUADRA (a câmera é posta, não voa), então o raio de
  // enquadramento tem de ser propriedade do ALVO. Enquanto ele saía da
  // distância à CÂMERA, o segundo clique no mesmo nome enquadrava metade
  // do raio do primeiro (a câmera já se aproximara), e o link `?foco=`
  // reproduzia a vista do primeiro clique, nunca a que estava na tela.
  const camera = () =>
    sessao.js('window.__director.engine.camera.position.toArray().join()');
  const vista1 = await camera();
  await sessao.js("window.__director.visitarEstrela(window.__director.nomeadas.find((s) => s.hd === 48915))");
  await sessao.assentar();
  const vista2 = await camera();
  await sessao.js("window.__director.visitarEstrela(window.__director.nomeadas.find((s) => s.hd === 48915))");
  await sessao.assentar();
  const vista3 = await camera();
  conferir(
    vista1 === vista2 && vista2 === vista3,
    `enquadrar a MESMA estrela três vezes dá a MESMA câmera (${vista1} · ${vista2} · ${vista3})`
  );

  // ---- 2: porta que não acha não chuta -----------------------------
  // "alfa cen" é o caso REAL do dado: o nome próprio da IAU expulsou a
  // designação de Bayer, e nenhuma chave irmã pode ser fabricada.
  await sessao.ir(`foco=alfa%20cen&${PIN}`);
  const semPalpite = await contexto(sessao);
  conferir(
    semPalpite === 'Sistema solar',
    `?foco= sem correspondência NÃO chuta: fica no sistema ("${semPalpite}")`
  );

  // ---- 3: ida e volta pelo escritor vivo ---------------------------
  // Escolhe na paleta e deixa o APP reescrever a URL: a troca de
  // qualidade recarrega por `urlComMomento`, que é o mesmo texto que o
  // botão "copiar link" entrega. Se a porta não sair de lá com a chave
  // canônica, o reload cai noutro lugar e esta prova quebra.
  await sessao.ir(`atlas=1&${PIN}`);
  await abrirPaleta(sessao);
  await sessao.digitar('sirius');
  await sleep(300);
  await sessao.teclar('Enter');
  await sleep(400);
  const escolhido = await contexto(sessao);
  conferir(escolhido === 'Sirius', `a paleta enquadra o que se escolhe ("${escolhido}")`);

  await sessao.js(`(() => {
    const sel = document.querySelector('.controls-bar select');
    sel.value = 'alta';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sessao.assentar();
  const urlDaVolta = await sessao.js('location.search');
  conferir(
    urlDaVolta.includes('foco=hd48915'),
    `o link vivo carrega a chave canônica do foco (${urlDaVolta})`
  );
  const depoisDoReload = await contexto(sessao);
  const faseDaVolta = await sessao.js('window.__director.captura.fase');
  conferir(
    faseDaVolta === 'atlas' && depoisDoReload === escolhido,
    `e reabre IGUAL depois do reload (fase '${faseDaVolta}', em quadro "${depoisDoReload}")`
  );

  // ---- 4: o estado vazio, honesto ----------------------------------
  await sessao.ir(`atlas=1&${PIN}`);
  await abrirPaleta(sessao);
  await sessao.digitar('alfa cen');
  await sleep(400);
  const vazio = await sessao.js(`(() => ({
    opcoes: document.querySelectorAll('[role="option"]').length,
    aviso: (document.querySelector('.atlas-busca-aviso') || {}).textContent || '',
  }))()`);
  conferir(vazio.opcoes === 0, `"alfa cen" não acende opção nenhuma (${vazio.opcoes})`);
  conferir(
    /nada com esse nome/.test(vazio.aviso) && /sirius/.test(vazio.aviso),
    `e o vazio diz o que não achou E o que funciona: "${vazio.aviso}"`
  );

  // ---- 5: no VOO LIVRE, a mesma paleta VOA -------------------------
  // O verbo é da fase, e a promessa está escrita no rótulo: no Atlas o
  // Enter "enquadra", no voo livre ele "voa até lá". Sem esta prova a
  // paleta poderia estar servindo a segunda fase só de enfeite — o
  // botão prometendo um voo que ninguém dispara.
  await sessao.ir(`pos=0,0,0.1&look=0,0,0&${PIN}`);
  const faseDoVoo = await sessao.js('window.__director.captura.fase');
  const antesDoVoo = await sessao.js(
    'window.__director.engine.camera.position.toArray().join()'
  );
  await abrirPaleta(sessao);
  await sessao.digitar('sirius');
  await sleep(300);
  // o rótulo se lê COM resultados na tela: sem eles a linha viva está
  // ensinando o que se pode digitar, e não prometendo verbo nenhum
  const rotulo = await sessao.js(
    "(document.querySelector('.atlas-busca-aviso') || {}).textContent || ''"
  );
  await sessao.teclar('Enter');
  await sessao.assentar();
  const depoisDoVoo = await sessao.js(
    'window.__director.engine.camera.position.toArray().join()'
  );
  conferir(
    faseDoVoo === 'free' && antesDoVoo !== depoisDoVoo,
    `no voo livre a escolha VOA: a câmera saiu de (${antesDoVoo}) para (${depoisDoVoo})`
  );
  conferir(
    /voa at[ée] l[áa]/.test(rotulo),
    `e o rótulo promete o verbo da fase, não o do Atlas ("${rotulo}")`
  );

  // ---- 6: a latência por tecla, das duas formas --------------------
  // (a) A CONTA PURA sobre o índice COMPLETO, medida dentro da página
  // com o mesmo módulo que a UI usa (o dev server serve o fonte, então
  // não há segunda cópia da lib no caminho) e com as 1.726 nomeadas que
  // o Director carregou. As consultas são as caras: uma letra só varre
  // e casa em quase tudo.
  //
  // O import vem numa chamada à parte porque o `Runtime.evaluate` da
  // sessão não espera promessa: a medição tem de ser SÍNCRONA quando
  // roda, senão o que volta é um `Promise` vazio e o gate mede nada.
  await sessao.js(
    "(() => { import('/src/lib/buscaEstrelas.ts').then((m) => { window.__lib = m; }); })()"
  );
  await sleep(300);
  const puro = await sessao.js(`(() => {
    const m = window.__lib;
    const nomeadas = window.__director.nomeadas;
    const t0 = performance.now();
    const indice = m.construirIndice(nomeadas);
    const construcao = performance.now() - t0;
    const medir = (q) => {
      const N = 200;
      const t = performance.now();
      for (let i = 0; i < N; i++) m.buscar(q, indice, 8);
      return (performance.now() - t) / N;
    };
    return {
      estrelas: nomeadas.length,
      chaves: indice.porChave.size,
      construcao,
      a: medir('a'), si: medir('si'), siri: medir('siri'), hd: medir('hd 48915'),
    };
  })()`);
  const pior = Math.max(puro.a, puro.si, puro.siri, puro.hd);
  process.stdout.write(
    `  ·     índice: ${puro.estrelas} estrelas / ${puro.chaves} chaves`
      + ` em ${puro.construcao.toFixed(1)} ms (uma vez só)\n`
      + `  ·     por tecla: "a" ${puro.a.toFixed(3)} ms · "si" ${puro.si.toFixed(3)} ms`
      + ` · "siri" ${puro.siri.toFixed(3)} ms · "hd 48915" ${puro.hd.toFixed(3)} ms\n`
  );
  // o teto é folgado de propósito: o que ele pega é uma REGRESSÃO de
  // ordem de grandeza (a varredura das 206k chaves que a lib recusou
  // custava 27-32 ms por tecla no doador), não a variação da máquina
  conferir(pior < 5, `a conta por tecla fica abaixo de 5 ms (pior: ${pior.toFixed(3)} ms)`);

  // (b) PONTA A PONTA: da tecla até a lista mudar na tela. Inclui o
  // React, o `useDeferredValue` e a espera pelo quadro — e é por isso
  // que ela é maior: no Atlas o quadro custa ~100 ms nesta janela, e a
  // lista só aparece quando ele sai. É o número que o visitante sente.
  await sessao.ir(`atlas=1&${PIN}`);
  await abrirPaleta(sessao);
  await sessao.js(`(() => {
    window.__lat = [];
    window.__t0 = 0;
    const campo = document.querySelector('.atlas-busca-campo');
    campo.addEventListener('keydown', () => { window.__t0 = performance.now(); }, true);
    new MutationObserver(() => {
      if (!window.__t0) return;
      const t = window.__t0;
      window.__t0 = 0;
      // o quadro em que a mudança JÁ ESTÁ na tela
      requestAnimationFrame(() => window.__lat.push(performance.now() - t));
    }).observe(document.querySelector('[role="listbox"]'), {
      childList: true, subtree: true, characterData: true,
    });
  })()`);
  // "tau cet" e não "sirius" de propósito: cada tecla desta consulta
  // MUDA o conjunto de resultados. Onde o conjunto não muda, o React não
  // toca no DOM e não há mutação para observar — o que é a resposta
  // certa (a tecla custou só a varredura), mas não dá medida. Por isso o
  // gate compara as duas contas: teclas digitadas e mudanças de lista.
  const CONSULTA = 'tau cet';
  for (const ch of CONSULTA) {
    await sessao.digitar(ch);
    await sleep(250);
  }
  const lat = await sessao.js('window.__lat');
  const ordenadas = [...lat].sort((x, y) => x - y);
  const mediana = ordenadas[Math.floor(ordenadas.length / 2)] ?? Number.NaN;
  process.stdout.write(
    `  ·     ponta a ponta: ${lat.map((v) => v.toFixed(0)).join(' · ')} ms`
      + ` (${CONSULTA.length} teclas, ${lat.length} mudanças de lista)\n`
  );
  conferir(
    lat.length >= 4 && mediana < 250,
    `a lista acompanha a digitação (mediana ${mediana.toFixed(0)} ms`
      + ` em ${lat.length} mudanças de ${CONSULTA.length} teclas)`
  );

  // ---- 8: os overlays são da FASE que os hospeda -------------------
  // A presença é `busca && hud.busca`: o `hud.*` some com a fase, e o
  // estado de aberto NÃO sumia. Resultado medido antes do conserto: sair
  // do voo livre com a paleta aberta e voltar a ele a fazia RENASCER —
  // e, pior, `useDialogFocus` punha o foco na caixa de texto, onde a
  // guarda de alvo de formulário do rig engole o WASD. O visitante
  // entrava para voar e as teclas de voar viravam texto.
  await sessao.ir(`pos=0,0,0.1&look=0,0,0&${PIN}`);
  await abrirPaleta(sessao);
  const abriuNoVoo = await sessao.js("Boolean(document.querySelector('.atlas-busca'))");
  const clicar = (texto) =>
    sessao.js(`(() => {
      [...document.querySelectorAll('.controls-bar button')]
        .find((b) => b.innerText.toUpperCase().includes(${JSON.stringify(texto.toUpperCase())}))
        .click();
    })()`);
  await clicar('Reviver');
  await sleep(300);
  await clicar('Explorar');
  await sleep(400);
  const aoVoltar = await sessao.js(`JSON.stringify({
    paleta: Boolean(document.querySelector('.atlas-busca')),
    foco: document.activeElement ? document.activeElement.className : null,
  })`);
  const v = JSON.parse(aoVoltar);
  conferir(
    abriuNoVoo && !v.paleta && v.foco !== 'atlas-busca-campo',
    `a paleta NÃO renasce ao reentrar na fase (${aoVoltar})`
  );

  // e o mesmo para a gaveta de camadas, que atravessava Atlas→filme→Atlas
  await sessao.ir(`atlas=1&${PIN}`);
  await sessao.js("document.querySelector('[data-abre-dialogo=\"camadas\"]').click()");
  await sleep(200);
  const abriuNoAtlas = await sessao.js("Boolean(document.querySelector('.atlas-gaveta'))");
  await sessao.js('window.__director.partirDoAtlas()');
  await sleep(300);
  await sessao.js('window.__director.entrarNoAtlas({ instantaneo: true })');
  await sleep(400);
  const gaveta = await sessao.js("Boolean(document.querySelector('.atlas-gaveta'))");
  conferir(
    abriuNoAtlas && !gaveta,
    `a gaveta NÃO renasce ao reentrar no Atlas (abriu=${abriuNoAtlas}, voltou=${gaveta})`
  );

  // ---- 9: OS DEZ CORPOS SÃO ALVO — rótulo, busca e deep-link -------
  // Até a revisão de olhos frescos o "Atlas navegável do sistema solar"
  // tinha os dez DESENHADOS e nenhum era alvo de nada: buscar "Netuno"
  // caía no estado vazio, `?foco=terra` não resolvia e clicar num corpo
  // não fazia coisa alguma. Três linhas da matriz do PLANO com destino
  // nesta onda.
  const emUA = () =>
    sessao.js('window.__director.engine.camera.position.length() * 206264.80624548031');

  await sessao.ir(`foco=terra&${PIN}`);
  const naTerra = await contexto(sessao);
  const distTerra = Number(await emUA());
  conferir(
    naTerra === 'Terra',
    `?foco=terra abre o Atlas com a Terra em quadro (em quadro: "${naTerra}")`
  );
  // enquadra a ÓRBITA (1 UA) e não o corpo: 1 × 1,2 / sen(11,06°) ≈ 6,3 UA
  conferir(
    distTerra > 5 && distTerra < 8,
    `e enquadra a ÓRBITA dela: a câmera fica a ${distTerra.toFixed(2)} UA do Sol`
  );

  // a paleta acha pelo nome pt-BR, sem acento, e a escolha ENQUADRA
  await abrirPaleta(sessao);
  await sessao.digitar('netuno');
  await sleep(300);
  const listaCorpo = await sessao.js(`(() => {
    const o = document.querySelector('[role="option"]');
    return o ? o.textContent : '';
  })()`);
  await sessao.teclar('Enter');
  await sessao.assentar();
  const emNetuno = await contexto(sessao);
  const distNetuno = Number(await emUA());
  conferir(
    emNetuno === 'Netuno' && /planeta/.test(listaCorpo) && /UA/.test(listaCorpo),
    `a paleta acha "netuno" e a escolha ENQUADRA ("${listaCorpo}" → "${emNetuno}")`
  );
  conferir(
    distNetuno > distTerra * 20,
    `e a órbita dele é outra escala: ${distNetuno.toFixed(0)} UA contra ${distTerra.toFixed(1)}`
  );
  const urlDoCorpo = await sessao.js('location.search');
  await sessao.js(`(() => {
    const sel = document.querySelector('.controls-bar select');
    sel.value = 'alta';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sessao.assentar();
  const voltouNetuno = await contexto(sessao);
  conferir(
    voltouNetuno === 'Netuno'
      && (await sessao.js('location.search')).includes('foco=netuno'),
    `e o link vivo carrega o corpo e reabre nele (${urlDoCorpo} → "${voltouNetuno}")`
  );

  // O CLIQUE. Perto do centro do retângulo útil, no enquadramento da
  // órbita da Terra, quem está é um dos dez — o Sol na mira e os
  // interiores em volta. Antes do conserto o clique ali não achava
  // rótulo nenhum (não havia rótulo de corpo) e nada acontecia.
  await sessao.ir(`foco=terra&${PIN}`);
  const nomesDosCorpos = JSON.parse(
    await sessao.js('JSON.stringify(window.__director.corpos.map((c) => c.nome))')
  );
  const tela = JSON.parse(
    await sessao.js('JSON.stringify({ w: window.innerWidth, h: window.innerHeight })')
  );
  await sessao.clicar(Math.round(tela.w * 0.5), Math.round(tela.h * 0.45));
  await sessao.assentar();
  const depoisDoClique = await contexto(sessao);
  conferir(
    // 11 desde a F2b (os dez do retrato + a Lua, P-E10); 13 desde a F3
    // (+ Fobos e Deimos); 30 desde a F5 (+ 17 luas texturadas)
    nomesDosCorpos.length === 30
      && (nomesDosCorpos.includes(depoisDoClique) || depoisDoClique === 'Sistema solar')
      && depoisDoClique !== naTerra,
    `clicar num corpo ENQUADRA por ele ("${naTerra}" → "${depoisDoClique}")`
  );

  // ---- 9b: A LUA na busca (F2b, P-E10) -----------------------------
  // A nota fala a régua do par lua↔pai — quilômetros, nunca "0,0026 UA"
  // — e a escolha desce ao degrau "lua": a Lua em quadro COM a Terra
  // (PARENT_FRAMING_BIAS ganhou o consumidor). O rUA vem da EFEMÉRIDE
  // (o retrato não tem luas), então a prova espera a fonte viva.
  await sessao.ir(`atlas=1&${PIN}`);
  await abrirPaleta(sessao);
  await sessao.digitar('lua');
  await sleep(400);
  const listaLua = await sessao.js(`(() => {
    const ops = [...document.querySelectorAll('[role="option"]')];
    const daLua = ops.find((o) => o.querySelector('.atlas-busca-nome').textContent === 'Lua');
    return daLua ? daLua.textContent : '';
  })()`);
  conferir(
    /mil km/.test(listaLua) && !/UA/.test(listaLua),
    `a paleta acha a Lua com a nota em QUILÔMETROS ("${listaLua}")`
  );
  await sessao.teclar('Enter');
  await sessao.assentar();
  const naLua = await contexto(sessao);
  conferir(naLua === 'Lua', `a escolha põe a LUA em quadro ("${naLua}")`);
  // o link vivo carrega o degrau: foco=lua&ver=corpo (espelho, ?jd)
  await sessao.js(`(() => {
    const sel = document.querySelector('.controls-bar select');
    sel.value = 'alta';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sessao.assentar();
  const urlDaLua = await sessao.js('location.search');
  const voltouLua = await contexto(sessao);
  conferir(
    voltouLua === 'Lua' && urlDaLua.includes('foco=lua') && urlDaLua.includes('ver=corpo'),
    `o degrau da Lua reproduz por URL (${urlDaLua} → "${voltouLua}")`
  );

  // ---- 7: a paleta não vaza no ?shot=2 -----------------------------
  // Invariante da onda: o `.bare-mode` só esconde FILHOS DIRETOS de
  // `.hud-root`. Overlay novo aninhado (ou portalizado para o body)
  // entraria nas 18 vistas oficiais e o filme perderia pixel. A leva
  // não pega isto sozinha — lá o Atlas nem monta.
  await sessao.ir('atlas=1&q=cinema&shot=2');
  await sessao.js("document.querySelector('[data-abre-dialogo=\"busca\"]').click()");
  await sleep(200);
  const nua = await sessao.js(`(() => {
    const e = document.querySelector('.atlas-busca');
    return {
      existe: Boolean(e),
      filhaDireta: Boolean(e && e.parentElement.classList.contains('hud-root')),
      desenhada: Boolean(e && e.getClientRects().length > 0),
    };
  })()`);
  conferir(
    nua.existe && nua.filhaDireta && !nua.desenhada,
    `a paleta é filha direta de .hud-root e o ?shot=2 a esconde (${JSON.stringify(nua)})`
  );
} finally {
  sessao.fechar();
}

if (falhas.length) {
  process.stdout.write(`\nSMOKE DA BUSCA: ${falhas.length} falha(s)\n`);
  process.exit(1);
}
process.stdout.write('\nSMOKE DA BUSCA: tudo verde\n');
