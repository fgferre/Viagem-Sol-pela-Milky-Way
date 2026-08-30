// Serve: dono — a paleta acha, o ?foco= reabre a mesma vista e a ficha diz o que ele pediu
// Custo: 1,5 min (medido 30/08, F5 do item 113: esperas fixas → espera por estado)
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
//     quem chama `urlComMomento`) tem de deixar a MESMA estrela em
//     quadro. É a prova de que o link copiado reabre igual — e ela passa
//     pelo escritor de verdade, não por uma cópia do formato dentro do
//     teste. Desde os Ajustes C esse caminho NÃO recarrega mais: o
//     mundo novo entra por troca de ponteiro, e a exigência ficou mais
//     dura — antes bastava o documento novo reabrir no lugar certo,
//     agora o lugar certo tem de SOBREVIVER à troca sem recarga.
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
// 10. O ATALHO DO TECLADO (item 8): "/" e Ctrl+K abrem a paleta; o "/"
//     que abriu não vaza para o campo, e com ela aberta "/" é digitação.
import { abrirSessao, APP_PADRAO, dorme, esperarPor } from './chrome.mjs';

const APP = process.env.APP_URL || APP_PADRAO;
const JANELA = process.env.JANELA || '1200x900';
// `?shot=1`: congela transições e o relógio visual, e MANTÉM o HUD — o
// objeto do juízo é justamente a UI.
const PIN = 'q=cinema&shot=1';
const falhas = [];
const conferir = (ok, texto) => {
  process.stdout.write(`${ok ? '  OK  ' : '  FALHA '} ${texto}\n`);
  if (!ok) falhas.push(texto);
};

/**
 * QUEM ANUNCIA O ALVO: o cabeçalho da FICHA DO OBJETO, que abre sozinha com
 * a seleção. Sem seleção não há ficha, e a leitura sai VAZIA — que é o que a
 * prova 2 (`?foco=` que não acha) cobra: nada na tela, porque nada é o que a
 * casa sabe.
 */
const contexto = (s) =>
  s.js("(document.querySelector('.atlas-ficha-nome') || {}).textContent || ''");

/** abre a paleta pelo gatilho, como quem clica nela */
async function abrirPaleta(s) {
  await s.js(`(() => {
    const b = document.querySelector('[data-abre-dialogo="busca"]');
    b.focus();
    b.click();
  })()`);
  await dorme(200);
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
  // a LINHA FECHADA do selo (item 61, 22/08): os dois eixos numa frase
  // só, que é o que fica na tela sem ninguém abrir nada
  const selo = await sessao.js(
    "document.querySelector('.atlas-selo-resumo').innerText.replace(/\\n/g, ' ')"
  );
  // o eixo ESCALA sai da GEOMETRIA: enquadrar uma estrela a 2,6 pc tira
  // o quadro do domínio profundo, e o selo tem de dizer isso sozinho —
  // sem que a porta precise se declarar desvio (ela é neutra)
  conferir(
    selo.includes('FORA DE ESCALA'),
    `e o selo conta a verdade da vista sem a porta se declarar ("${selo}")`
  );

  // ---- 1a: A FICHA DA ESTRELA (item 74, parte B, 22/08) ------------
  // Até aqui escolher uma estrela abria a ficha só com o CABEÇALHO — o
  // nome, a palavra "estrela" e o gesto de voltar. Agora ela diz o que o
  // catálogo mede. A prova pede as três coisas que só existem com o dado
  // NOVO atravessando: a designação de Bayer (a letra e a constelação
  // eram lidas na construção do catálogo e jogadas fora quando havia
  // nome próprio), a distância na escada da casa, e a temperatura, que é
  // a primeira conta de `stellarPhysics` a chegar à TELA.
  const daEstrela = JSON.parse(await sessao.js(`JSON.stringify(
    [...document.querySelectorAll('.atlas-ficha-linha')].map((d) => ({
      rotulo: d.querySelector('dt').textContent,
      valor: d.querySelector('.atlas-ficha-valor').textContent,
      proc: (d.querySelector('.atlas-ficha-proc') || {}).textContent || '',
    })))`));
  const linhaDe = (r) => daEstrela.find((l) => l.rotulo === r) || {};
  conferir(
    linhaDe('designação').valor === 'α Canis Majoris'
      && linhaDe('distância').valor === '8,6 anos-luz',
    `a ficha de Sirius diz a designação e a distância `
      + `("${linhaDe('designação').valor}" · "${linhaDe('distância').valor}")`
  );
  conferir(
    /^\d+ K$/.test(linhaDe('temperatura').valor || '')
      && linhaDe('temperatura').proc.startsWith('derivado')
      && linhaDe('catálogos').valor === 'HD 48915 · HIP 32349 · Gl 244A',
    `e a temperatura é derivada da cor, com os índices de catálogo ao lado `
      + `("${linhaDe('temperatura').valor}" ${linhaDe('temperatura').proc}; `
      + `"${linhaDe('catálogos').valor}")`
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

  // ---- 1c: o atalho do teclado abre a paleta (item 8) --------------
  // `/` (e Ctrl+K) moram no useAtalhos, com as guardas: diálogo aberto
  // fica com o teclado dele e alvo de texto não atalha. Aqui: o caminho
  // feliz das duas teclas, a prova de que o "/" que ABRIU não vazou
  // para o campo, e a de que com a paleta aberta "/" é digitação.
  await sessao.digitar('/');
  await dorme(200);
  const abriuPorBarra = await sessao.js(`(() => {
    const campo = document.querySelector('.atlas-busca-campo');
    return JSON.stringify({
      aberta: Boolean(document.querySelector('[data-dialogo="busca"]')),
      focada: document.activeElement === campo,
      valor: campo ? campo.value : null,
    });
  })()`);
  const porBarra = JSON.parse(abriuPorBarra);
  conferir(
    porBarra.aberta && porBarra.focada && porBarra.valor === '',
    `a tecla "/" abre a paleta com o campo focado e LIMPO (${abriuPorBarra})`
  );
  await sessao.digitar('/');
  const barraDigitou = await sessao.js(
    "document.querySelector('.atlas-busca-campo').value"
  );
  conferir(
    barraDigitou === '/',
    `com a paleta aberta, "/" é digitação, não atalho (campo "${barraDigitou}")`
  );
  await sessao.teclar('Escape');
  await dorme(200);
  const tecladoCtrlK = {
    key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75,
    nativeVirtualKeyCode: 75, modifiers: 2,
  };
  await sessao.send('Input.dispatchKeyEvent', { ...tecladoCtrlK, type: 'rawKeyDown' });
  await sessao.send('Input.dispatchKeyEvent', { ...tecladoCtrlK, type: 'keyUp' });
  await dorme(200);
  const porCtrlK = await sessao.js(
    'Boolean(document.querySelector(\'[data-dialogo="busca"]\'))'
  );
  conferir(porCtrlK, 'Ctrl+K abre a paleta pelo mesmo caminho');
  await sessao.teclar('Escape');
  await dorme(200);

  // ---- 2: porta que não acha não chuta -----------------------------
  // "alfa cen" é o caso REAL do dado: o nome próprio da IAU expulsou a
  // designação de Bayer, e nenhuma chave irmã pode ser fabricada.
  await sessao.ir(`foco=alfa%20cen&${PIN}`);
  const semPalpite = JSON.parse(await sessao.js(`JSON.stringify({
    nome: (document.querySelector('.atlas-ficha-nome') || {}).textContent || '',
    ficha: document.querySelector('.atlas-ficha') !== null,
    degrau: window.__director.escadaViva.degrau,
  })`));
  conferir(
    semPalpite.nome === '' && !semPalpite.ficha && semPalpite.degrau === 'sistema',
    `?foco= sem correspondência NÃO chuta: fica no sistema e não abre ficha `
      + `(degrau '${semPalpite.degrau}', ficha ${semPalpite.ficha})`
  );

  // ---- 3: ida e volta pelo escritor vivo ---------------------------
  // Escolhe na paleta e deixa o APP reescrever a URL: a troca de
  // qualidade espelha por `urlComMomento`, que é o mesmo texto que o
  // botão "copiar link" entrega. Se a porta não sair de lá com a chave
  // canônica, o link copiado cai noutro lugar e esta prova quebra.
  await sessao.ir(`atlas=1&${PIN}`);
  await abrirPaleta(sessao);
  await sessao.digitar('sirius');
  await dorme(300);
  await sessao.teclar('Enter');
  // espera por ESTADO (item 76): o fim do gesto é a paleta fechada e a
  // ficha do escolhido aberta — era um dorme(400) medindo a máquina
  await esperarPor(sessao, `(() => !document.querySelector('[data-dialogo="busca"]')
    && Boolean((document.querySelector('.atlas-ficha-nome') || {}).textContent))()`);
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
  const depoisDaTroca = await contexto(sessao);
  const faseDaVolta = await sessao.js('window.__director.captura.fase');
  const mundoDaVolta = await sessao.js('window.__director.captura.tierDoMundo');
  conferir(
    faseDaVolta === 'atlas' && depoisDaTroca === escolhido && mundoDaVolta === 'alta',
    `e o alvo SOBREVIVE à troca de tier, sem recarga (fase '${faseDaVolta}',`
      + ` mundo '${mundoDaVolta}', em quadro "${depoisDaTroca}")`
  );

  // ---- 4: o estado vazio, honesto ----------------------------------
  await sessao.ir(`atlas=1&${PIN}`);
  await abrirPaleta(sessao);
  await sessao.digitar('alfa cen');
  // espera por ESTADO: o aviso do vazio na tela é o fim da consulta —
  // era um dorme(400); se ele nunca vier, o estouro reprova nas linhas
  // de baixo, que é o veredito certo
  await esperarPor(
    sessao,
    "/nada com esse nome/.test((document.querySelector('.atlas-busca-aviso') || {}).textContent || '')"
  );
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
  await dorme(300);
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
  await dorme(300);
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
    await dorme(250);
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
  await dorme(300);
  await clicar('Explorar');
  // espera por ESTADO: a fase é o que o clique promete — era dorme(400)
  await esperarPor(sessao, "window.__director.captura.fase === 'free'");
  const aoVoltar = await sessao.js(`JSON.stringify({
    paleta: Boolean(document.querySelector('.atlas-busca')),
    foco: document.activeElement ? document.activeElement.className : null,
  })`);
  const v = JSON.parse(aoVoltar);
  conferir(
    abriuNoVoo && !v.paleta && v.foco !== 'atlas-busca-campo',
    `a paleta NÃO renasce ao reentrar na fase (${aoVoltar})`
  );

  // e o mesmo para a gaveta de camadas, que atravessava Atlas→filme→Atlas.
  // Desde o item 61 (22/08) ela EXISTE nos dois modos — então o que a
  // fecha não é mais "a fase nova não a hospeda", e sim a TRAVESSIA: véu,
  // câmera reposta e outro HUD não podem carregar junto um modal com o
  // foco preso dentro dele. A promessa medida é a mesma.
  await sessao.ir(`atlas=1&${PIN}`);
  await sessao.js("document.querySelector('[data-abre-dialogo=\"camadas\"]').click()");
  await dorme(200);
  const abriuNoAtlas = await sessao.js("Boolean(document.querySelector('.atlas-gaveta'))");
  await sessao.js('window.__director.partirDoAtlas()');
  await dorme(300);
  await sessao.js('window.__director.entrarNoAtlas({ instantaneo: true })');
  // espera por ESTADO: a travessia terminou quando a fase é atlas E o
  // sinal de prontidão acendeu (o véu em curso derruba o `pronto`) —
  // era dorme(400)
  await esperarPor(
    sessao,
    "window.__director.captura.fase === 'atlas' && window.__director.captura.pronto"
  );
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
  await dorme(300);
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

  // ---- A FICHA ABRE COM O ALVO (item 74, 22/08) --------------------
  // Escolher na paleta não anuncia mais o nome numa linha no alto: abre a
  // FICHA daquele corpo, com o nome, a classe e os números vivos dele. A
  // prova pede "Titã" de propósito — é uma LUA, o caso em que a ficha mede
  // a distância ao PAI e a escada mostra o degrau da lua.
  await abrirPaleta(sessao);
  await sessao.digitar('tita');
  await dorme(300);
  await sessao.teclar('Enter');
  await sessao.assentar();
  const naFicha = JSON.parse(await sessao.js(`JSON.stringify({
    nome: (document.querySelector('.atlas-ficha-nome') || {}).textContent || '',
    classe: (document.querySelector('.atlas-ficha-classe') || {}).textContent || '',
    corpoId: window.__director.escadaViva.corpoId,
    secoes: [...document.querySelectorAll('.atlas-ficha-titulo button')]
      .map((b) => b.innerText.trim().split(String.fromCharCode(10))[0]),
    primeiraLinha: (document.querySelector('.atlas-ficha-linha dt') || {}).textContent || '',
    valor: (document.querySelector('.atlas-ficha-valor') || {}).textContent || '',
  })`));
  conferir(
    naFicha.nome === 'Titã' && naFicha.classe === 'lua' && naFicha.corpoId === 'titan',
    `a paleta acha "tita" e a FICHA abre com ele ("${naFicha.nome}" · "${naFicha.classe}")`
  );
  conferir(
    naFicha.secoes.length >= 3
      && /SATURNO/i.test(naFicha.primeiraLinha)
      && /km/.test(naFicha.valor),
    `e a primeira seção é o AGORA, com a distância ao pai `
      + `("${naFicha.primeiraLinha}" = "${naFicha.valor}"; seções: ${naFicha.secoes.join(', ')})`
  );

  // O CLIQUE. Perto do centro do retângulo útil, no enquadramento da
  // órbita da Terra. Antes do conserto o clique ali não achava rótulo
  // nenhum (não havia rótulo de corpo) e nada acontecia.
  //
  // O QUE ELE FAZ MUDOU DUAS VEZES EM 22/08 (item 73). Primeiro
  // `?foco=terra` passou a pôr a TERRA no centro (e não o Sol com uma
  // esfera do tamanho da órbita dela), então o clique no centro cai na
  // própria Terra. Depois o clique simples passou a ESCOLHER sem mover,
  // e quem desce é o DUPLO — o par do padrão da indústria. O veredito
  // cobra os dois: o clique acha um corpo da lista única e a câmera
  // fica parada; o duplo desce o degrau, órbita → corpo.
  await sessao.ir(`foco=terra&${PIN}`);
  const nomesDosCorpos = JSON.parse(
    await sessao.js('JSON.stringify(window.__director.corpos.map((c) => c.nome))')
  );
  const tela = JSON.parse(
    await sessao.js('JSON.stringify({ w: window.innerWidth, h: window.innerHeight })')
  );
  const degrau = () => sessao.js('window.__director.escadaViva.degrau');
  const posDaCamera = async () =>
    JSON.parse(await sessao.js(
      'JSON.stringify(window.__director.engine.camera.position.toArray())'
    ));
  // a câmera "parada" se mede em FRAÇÃO do raio, não por igualdade de
  // texto: a pose atravessa a conta fechada de `giroQueProduz` e
  // volta com os últimos bits de float trocados (medido, 1e-11 do raio
  // — micrômetros numa vista de unidades astronômicas)
  const andou = (a, b) =>
    Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / Math.hypot(...b);
  const antesDoClique = await degrau();
  const cameraAntes = await posDaCamera();
  const px = Math.round(tela.w * 0.5);
  const py = Math.round(tela.h * 0.45);
  await sessao.clicar(px, py);
  await sessao.assentar();
  const depoisDoClique = await contexto(sessao);
  const degrauDepois = await degrau();
  const cameraDepois = await posDaCamera();
  conferir(
    // 11 desde a F2b; 13 F3; 30 F5; 36 F6; 39 F7 (+ Vesta/Palas/Hígia)
    nomesDosCorpos.length === 39
      && nomesDosCorpos.includes(depoisDoClique)
      && degrauDepois === antesDoClique
      && andou(cameraDepois, cameraAntes) < 1e-9,
    `clicar num corpo ESCOLHE e a câmera não sai do lugar ("${naTerra}"/`
      + `${antesDoClique} → "${depoisDoClique}"/${degrauDepois})`
  );
  // espera por ESTADO (item 76): o gesto COMEÇOU (a câmera saiu da pose)
  // e depois a cena ASSENTOU (a rampa derruba o `pronto` até o fim) —
  // era um dorme(1200) medindo a rampa pelo relógio de parede
  await sessao.js(
    'window.__poseAntesDoDuplo = window.__director.engine.camera.position.toArray().join()'
  );
  await sessao.duploClicar(px, py);
  await esperarPor(
    sessao,
    "window.__director.engine.camera.position.toArray().join() !== window.__poseAntesDoDuplo",
    5000
  );
  await sessao.assentar();
  const noDuplo = await contexto(sessao);
  const degrauDoDuplo = await degrau();
  conferir(
    degrauDoDuplo === 'corpo' && noDuplo === 'Terra'
      && andou(await posDaCamera(), cameraDepois) > 1e-3,
    `...e o DUPLO clique desce o degrau ("${noDuplo}"/${degrauDoDuplo})`
  );

  // ---- 9b: A LUA na busca (F2b, P-E10) -----------------------------
  // A nota fala a régua do par lua↔pai — quilômetros, nunca "0,0026 UA"
  // — e a escolha desce ao degrau "lua": a Lua em quadro COM a Terra
  // (PARENT_FRAMING_BIAS ganhou o consumidor). O rUA vem da EFEMÉRIDE
  // (o retrato não tem luas), então a prova espera a fonte viva.
  await sessao.ir(`atlas=1&${PIN}`);
  await abrirPaleta(sessao);
  await sessao.digitar('lua');
  // espera por ESTADO: a opção "Lua" na lista é o fim da consulta — era
  // dorme(400); o estouro reprova na linha de baixo
  await esperarPor(sessao, `[...document.querySelectorAll('[role="option"] .atlas-busca-nome')]
    .some((n) => n.textContent === 'Lua')`);
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
  // O LINK VIVO CARREGA A DISTÂNCIA: `foco=lua&d=…` (item 73, 22/08).
  // Era `foco=lua&ver=corpo`, e o degrau deixou de ser a grandeza que
  // descreve a vista quando a roda virou zoom contínuo — entre "no
  // corpo" e "no corpo, a 2,4 raios dele" a porta velha não distingue.
  // Aqui a roda anda ANTES do espelho, que é o que faz o link ter o que
  // contar; `?ver=` some da escrita e continua valendo na leitura.
  await sessao.js('window.__dAntesDaRoda = window.__director.atlas.distancia');
  for (let i = 0; i < 3; i++) {
    await sessao.js(`(() => document.querySelector('canvas').dispatchEvent(
      new WheelEvent('wheel', { deltaY: -100, deltaMode: 0, bubbles: true, cancelable: true })))()`);
  }
  // a inércia da roda é curta (meia-vida 87 ms, zona morta em ~0,7 s), e
  // ler a distância com o embalo andando compararia dois instantes. A
  // espera é por ESTADO (item 76): o gesto COMEÇOU (a distância saiu do
  // lugar — cada estalo consumido chama `perturbar`) e a cena ASSENTOU
  // (o sinal de prontidão exige quadros parados: o embalo morreu) — era
  // um dorme(1200) de relógio de parede
  await esperarPor(sessao, 'window.__director.atlas.distancia !== window.__dAntesDaRoda');
  await sessao.assentar();
  const emRaios = () =>
    sessao.js('window.__director.atlas.distancia / window.__director.atlas.raioDoAlvo');
  const raiosNaLua = await emRaios();
  await sessao.js(`(() => {
    const sel = document.querySelector('.controls-bar select');
    sel.value = 'alta';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sessao.assentar();
  const urlDaLua = await sessao.js('location.search');
  // e agora o link é ABERTO: o veredito é a vista que ele reproduz, não
  // o texto que ele carrega
  await sessao.ir(urlDaLua.replace(/^\?/, ''));
  await sessao.assentar();
  const voltouLua = await contexto(sessao);
  const raiosDeVolta = await emRaios();
  conferir(
    voltouLua === 'Lua'
      && urlDaLua.includes('foco=lua')
      && /[?&]d=/.test(urlDaLua)
      && !urlDaLua.includes('ver=')
      && Math.abs(raiosDeVolta / raiosNaLua - 1) < 5e-4,
    `a vista da Lua reproduz por URL com a DISTÂNCIA dentro (${urlDaLua} →`
      + ` "${voltouLua}" a ${raiosDeVolta.toFixed(4)} raios, contra`
      + ` ${raiosNaLua.toFixed(4)} medidos antes do link)`
  );

  // ---- 7: a paleta não vaza no ?shot=2 -----------------------------
  // Invariante da onda: o `.bare-mode` só esconde FILHOS DIRETOS de
  // `.hud-root`. Overlay novo aninhado (ou portalizado para o body)
  // entraria nas 18 vistas oficiais e o filme perderia pixel. A leva
  // não pega isto sozinha — lá o Atlas nem monta.
  await sessao.ir('atlas=1&q=cinema&shot=2');
  await sessao.js("document.querySelector('[data-abre-dialogo=\"busca\"]').click()");
  await dorme(200);
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

  // ---- 10: A PALETA NUM APARELHO, PELO DEDO (item 62) ---------------
  //
  // Tudo acima abre a paleta pelo TECLADO — a tecla "/" e o Ctrl+K —,
  // e num telefone não há nem uma nem outra. Lá a porta é a ALÇA ⌕
  // Buscar, e o que a abre é um DEDO: `Input.dispatchTouchEvent` num
  // aparelho vestido (`mobile: true` + toque emulado), que é o que
  // produz `pointerType: 'touch'`. A digitação continua sendo do
  // teclado de verdade (é o teclado do sistema no aparelho), e o que se
  // cobra é a cadeia inteira do dedo: a alça abre a folha, a busca acha,
  // a escolha enquadra e a FICHA do alvo sobe.
  const APARELHO = { width: 390, height: 844, deviceScaleFactor: 1, mobile: true };
  await sessao.send('Emulation.setDeviceMetricsOverride', APARELHO);
  await sessao.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await sessao.ir(`atlas=1&${PIN}`);
  await dorme(300);
  const alca = await sessao.js(`(() => {
    const b = document.querySelector('.atlas-alcas [data-abre-dialogo="busca"]');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return JSON.stringify({ x: Math.round(r.left + r.width / 2),
      y: Math.round(r.top + r.height / 2), alto: Math.round(r.height) });
  })()`);
  if (!alca) {
    conferir(false, 'toque: a alça ⌕ Buscar não existe a 390×844');
  } else {
    const p = JSON.parse(alca);
    const dedo = (type, touchPoints) =>
      sessao.send('Input.dispatchTouchEvent', { type, touchPoints });
    // Um toque de dedo ANDA: 12 px de quarteirão, o caso que o limiar de
    // mouse (6 px) reprovava. Os três eventos vão JUNTOS ao navegador —
    // um `await` por evento custa uma ida e volta de CDP, e medido no
    // `atlas-smoke` isso esticou o gesto sintético além de meio segundo,
    // que o app classifica como "segurar". Na mesma fila da sessão eles
    // chegam em ordem e o gesto dura microssegundos.
    // `touchPoints` é a lista do que CONTINUA encostado, não a do que
    // saiu: o fecho é a lista VAZIA. Ver a nota do `pincar` no
    // `atlas-smoke` — a leitura errada wedgeia o emulador de toque da
    // sessão inteira, calado.
    await Promise.all([
      dedo('touchStart', [{ x: p.x, y: p.y, id: 1 }]),
      dedo('touchMove', [{ x: p.x + 6, y: p.y + 6, id: 1 }]),
      dedo('touchEnd', []),
    ]);
    // espera por ESTADO: a folha aberta com o campo focado é o fim do
    // gesto — era dorme(400); o estouro reprova na leitura de baixo
    await esperarPor(sessao, `(() => {
      const c = document.querySelector('.atlas-busca-campo');
      return Boolean(c) && document.activeElement === c;
    })()`);
    const aberta = JSON.parse(await sessao.js(`JSON.stringify((() => {
      const campo = document.querySelector('.atlas-busca-campo');
      const f = document.querySelector('[data-dialogo="busca"]');
      const r = f ? f.getBoundingClientRect() : null;
      return { aberta: Boolean(f), focada: document.activeElement === campo,
        folha: r ? [Math.round(r.left), Math.round(r.top),
          Math.round(r.width), Math.round(r.height)] : null };
    })())`));
    conferir(
      aberta.aberta && aberta.focada && aberta.folha[2] === 390,
      `o DEDO abre a paleta pela alça ⌕ (alvo de ${p.alto} px de alto):`
        + ` folha [${aberta.folha ?? 'ausente'}] de borda a borda, campo focado`
        + ` ${aberta.focada}`
    );
    await sessao.digitar('netuno');
    await dorme(300);
    await sessao.teclar('Enter');
    await sessao.assentar();
    const noAparelho = JSON.parse(await sessao.js(`JSON.stringify({
      alvo: (document.querySelector('[data-abre-dialogo="ficha"]') || {}).textContent || '',
      ficha: [...document.querySelectorAll('[data-dialogo]')]
        .map((d) => d.getAttribute('data-dialogo')),
      foco: window.__director.escada.focoCorpoId,
    })`));
    conferir(
      noAparelho.foco === 'neptune'
        && noAparelho.ficha.length === 1 && noAparelho.ficha[0] === 'ficha',
      `...e a escolha enquadra e sobe a FICHA no lugar da paleta —`
        + ` foco "${noAparelho.foco}", alça "${noAparelho.alvo}",`
        + ` folhas: ${noAparelho.ficha.join(', ') || 'nenhuma'}`
    );
  }
  await sessao.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await sessao.send('Emulation.clearDeviceMetricsOverride');
} finally {
  sessao.fechar();
}

if (falhas.length) {
  process.stdout.write(`\nSMOKE DA BUSCA: ${falhas.length} falha(s)\n`);
  process.exit(1);
}
process.stdout.write('\nSMOKE DA BUSCA: tudo verde\n');
