// O JUIZ DE ACESSIBILIDADE DO HUD — em navegador real, por CDP.
//
//   node scripts/visual/a11y.mjs
//
// POR QUE UM JUIZ PRÓPRIO (Onda 5, decisão D7). O harness que a casa já
// tinha para julgar tela é o `rodada.mjs`, e ele NÃO pode julgar isto: ele
// captura com `?shot=2`, que é o modo em que o `.bare-mode` esconde o HUD
// inteiro — ele mede a CENA, e a acessibilidade mora justamente no que o
// `?shot=2` apaga. (E ele escreve no ledger `docs/reference/EVOLUCAO.md`;
// um gate de foco não tem por que deixar linha lá.) Este roda sem `shot=2`,
// sem tocar ledger nenhum, numa sessão de Chrome só.
//
// O QUE ELE COBRA, e o contrato é GENÉRICO — ele não conhece Ajustes,
// gaveta nem paleta de busca. Ele varre o contrato de DOM que
// `src/lib/dialogFocus.ts` publica:
//
//   data-abre-dialogo="nome"  no botão que abre
//   data-dialogo="nome"       no elemento do diálogo
//
// Para CADA gatilho que existir na página, nas quatro promessas do módulo:
//  1. o diálogo aparece com role="dialog" e aria-modal="true";
//  2. o foco ENTRA nele (quem abriu pelo teclado não fica perdido atrás);
//  3. o foco fica PRESO — Tab e Shift+Tab dão a volta dentro do diálogo,
//     nunca nos botões do filme que estão atrás;
//  4. Esc fecha e o foco VOLTA ao gatilho.
// Mais duas de higiene: nenhum diálogo órfão (sem gatilho declarado) e
// toda região `aria-live` da página com valor válido.
//
// Diálogo novo que nasça no módulo é julgado no mesmo dia, sem uma linha
// a mais aqui. Diálogo que nasça FORA do módulo não se declara e não é
// julgado — e é por isso que todo diálogo do Atlas nasce nele.
import { abrirSessao, APP_PADRAO } from './chrome.mjs';

const APP = process.env.APP_URL || APP_PADRAO;
const JANELA = process.env.JANELA || '1200x900';
// `?shot=1` (não `2`): congela transições e o relógio visual — o juiz não
// espera fade nenhum — e MANTÉM o HUD na tela, que é o objeto do juízo.
const PIN = 'q=cinema&shot=1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const falhas = [];
const conferir = (ok, texto) => {
  process.stdout.write(`${ok ? '  OK  ' : '  FALHA '} ${texto}\n`);
  if (!ok) falhas.push(texto);
};

/** O MESMO seletor de focáveis do módulo — a régua do juiz é a do juiz. */
const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), '
  + 'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\\"-1\\"])';

/**
 * O TAMANHO DE TODO TEXTO QUE ESTÁ NA TELA, por elemento. A chave leva
 * o índice porque duas peças da mesma classe (os botões da barra) têm
 * de casar uma a uma entre as duas medições — comparar conjuntos daria
 * "mudou" com um botão a mais e "não mudou" com um a menos.
 */
const MEDIR_FONTES = `(() => {
  const out = {};
  let i = 0;
  for (const e of document.querySelectorAll('.hud-root *')) {
    if (e.tagName === 'CANVAS') continue;
    const proprio = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!proprio) continue;
    const classe = typeof e.className === 'string' ? e.className : '';
    out[(i++) + ':' + e.tagName.toLowerCase() + '.' + (classe || '—')] =
      parseFloat(getComputedStyle(e).fontSize);
  }
  return out;
})()`;

/** Os `clamp(rem, vw, rem)` do `hud.css`, onde cada um existe. */
const MEDIR_CLAMPS = `(() => {
  const alvos = ['.caption-title', '.caption-sub', '.title-big', '.title-kicker',
    '.error-title', '.title-sub', '.cv-etapa-rotulo'];
  const out = {};
  for (const sel of alvos) {
    const e = document.querySelector(sel);
    if (e) out[sel] = parseFloat(getComputedStyle(e).fontSize);
  }
  return out;
})()`;

/** As peças do HUD que não podem sair da tela nem se atropelar. */
const MEDIR_QUEBRAS = `(() => {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const alvos = [
    '.controls-bar', '.atlas-contexto', '.atlas-selo', '.atlas-tempo',
    '.free-hint', '.ajustes', '.atlas-gaveta', '.progress-wrap', '.dest-line',
  ];
  const pecas = [];
  for (const sel of alvos) {
    for (const e of document.querySelectorAll(sel)) {
      const b = e.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      pecas.push({ sel, l: b.left, r: b.right, t: b.top, b: b.bottom });
    }
  }
  const foraDaTela = pecas
    .filter((p) => p.l < -1 || p.t < -1 || p.r > W + 1 || p.b > H + 1)
    .map((p) => p.sel + ' [' + [p.l, p.t, p.r, p.b].map((v) => Math.round(v)).join(',')
      + '] em ' + W + 'x' + H);
  const atropelos = [];
  for (let i = 0; i < pecas.length; i++) {
    for (let j = i + 1; j < pecas.length; j++) {
      const a = pecas[i];
      const c = pecas[j];
      // o painel de Ajustes é modal e nasce POR CIMA: sobrepor é o
      // desenho dele, não defeito
      if (a.sel === '.ajustes' || c.sel === '.ajustes') continue;
      if (a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b) atropelos.push(a.sel + ' × ' + c.sel);
    }
  }
  return { pecas: pecas.length, foraDaTela, atropelos };
})()`;

const dentroDoDialogo = (nome) => `(() => {
  const d = document.querySelector('[data-dialogo="${nome}"]');
  return Boolean(d && d.contains(document.activeElement));
})()`;

async function julgarDialogo(s, nome, onde) {
  // ABRE PELO TECLADO: o gatilho recebe o foco e é ele que dispara — é
  // esse o caminho em que a devolução do foco tem sentido.
  await s.js(`(() => {
    const b = document.querySelector('[data-abre-dialogo="${nome}"]');
    b.focus();
    b.click();
  })()`);
  await sleep(150);

  const info = await s.js(`(() => {
    const d = document.querySelector('[data-dialogo="${nome}"]');
    if (!d) return null;
    const foc = [...d.querySelectorAll('${FOCAVEIS}')]
      .filter((e) => e.getClientRects().length > 0);
    return {
      role: d.getAttribute('role'),
      modal: d.getAttribute('aria-modal'),
      rotulo: d.getAttribute('aria-label') || d.getAttribute('aria-labelledby') || '',
      dentro: d.contains(document.activeElement),
      focaveis: foc.length,
    };
  })()`);
  if (!info) {
    conferir(false, `${onde} · "${nome}": o gatilho não abriu diálogo nenhum`);
    return;
  }
  conferir(
    info.role === 'dialog' && info.modal === 'true',
    `${onde} · "${nome}": role="${info.role}" aria-modal="${info.modal}"`
  );
  conferir(Boolean(info.rotulo), `${onde} · "${nome}": tem nome acessível ("${info.rotulo}")`);
  conferir(info.dentro, `${onde} · "${nome}": o foco ENTRA no diálogo ao abrir`);

  // FOCO PRESO: uma volta inteira e mais duas — quem vaza, vaza no
  // primeiro Tab depois do último controle.
  let vazou = 0;
  for (let i = 0; i < info.focaveis + 2; i++) {
    await s.teclar('Tab');
    if (!(await s.js(dentroDoDialogo(nome)))) vazou++;
  }
  await s.teclar('Tab', { shift: true });
  if (!(await s.js(dentroDoDialogo(nome)))) vazou++;
  conferir(
    vazou === 0,
    `${onde} · "${nome}": foco preso em ${info.focaveis + 3} passos de Tab`
      + (vazou ? ` — vazou ${vazou}×` : '')
  );

  // Esc FECHA e o foco VOLTA ao gatilho
  await s.teclar('Escape');
  await sleep(150);
  const depois = await s.js(`(() => {
    const d = document.querySelector('[data-dialogo="${nome}"]');
    const g = document.querySelector('[data-abre-dialogo="${nome}"]');
    return {
      fechou: !d || d.getClientRects().length === 0,
      devolveu: document.activeElement === g,
      expandido: g && g.getAttribute('aria-expanded'),
    };
  })()`);
  conferir(depois.fechou, `${onde} · "${nome}": Esc fecha o diálogo`);
  conferir(depois.devolveu, `${onde} · "${nome}": o foco VOLTA ao gatilho`);
  conferir(
    depois.expandido === 'false',
    `${onde} · "${nome}": aria-expanded volta a "false" (está "${depois.expandido}")`
  );
}

/**
 * A ABERTURA — a única tela do app que este juiz nunca tinha aberto.
 * O contrato genérico do `dialogFocus` não a alcança: a fase `intro`
 * não tem barra de controles e portanto não tem UM gatilho de diálogo,
 * então `julgarPagina` sairia dizendo "0 gatilhos" e passaria. Era o
 * ponto cego que o item 60 (a terceira porta, o Atlas) obrigou a fechar:
 * mudança que só acontece na abertura precisa de vista que abra a
 * abertura.
 *
 * O que ele cobra, e cada linha é uma promessa que a tela faz:
 *  1. cada porta é um botão COM a sua linha de explicação, e o botão
 *     aponta para ela por `aria-describedby` — quem ouve a tela recebe
 *     as duas coisas juntas, e um `aria-describedby` pendurado em nada
 *     é pior que nenhum;
 *  2. NENHUMA porta é destacada em cor (decisão do dono: as três
 *     iguais) — cor, borda e fundo idênticos nas três;
 *  2b. e nenhuma é MAIOR que as outras — o mesmo retângulo nas três.
 *     O dono mediu isso a olho na foto ("botao explorar livremente está
 *     com tamanho diferente dos outros", 22/08) enquanto a linha 2
 *     passava limpa: tinta igual não é tamanho igual. A régua é
 *     `getBoundingClientRect`, e a cobrança vive no laço do `?ui=`
 *     porque a igualdade vem do CSS — CSS que só vale no tamanho de
 *     sempre não é igualdade, é coincidência;
 *  3. o Tab passa nas três, na ordem em que estão na tela;
 *  4. nada sai da tela, nem com o texto no maior degrau — três botões
 *     com três linhas embaixo é o estado mais alto que a abertura tem.
 */
async function julgarAbertura(s) {
  const assentou = await s.ir(PIN);
  conferir(assentou.via === 'sinal', `abertura: assentou por via=${assentou.via}`);
  const fase = await s.js('window.__director.captura.fase');
  conferir(fase === 'intro', `abertura: a fase da página é '${fase}'`);

  const portas = await s.js(`(() => {
    const el = document.querySelector('.veil-intro');
    if (!el) return null;
    return [...el.querySelectorAll('.abertura-porta')].map((p) => {
      const b = p.querySelector('button');
      const id = b && b.getAttribute('aria-describedby');
      const nota = id ? document.getElementById(id) : null;
      const cs = b ? getComputedStyle(b) : null;
      return {
        botao: b ? b.textContent.trim() : null,
        descrito: id,
        nota: nota ? nota.textContent.trim() : null,
        tinta: cs ? cs.color + '|' + cs.borderColor + '|' + cs.backgroundColor : null,
      };
    });
  })()`);
  conferir(
    Array.isArray(portas) && portas.length === 3,
    `abertura: ${portas ? portas.length : 0} porta(s) — ${(portas || []).map((p) => `"${p.botao}"`).join(' · ')}`
  );
  for (const p of portas || []) {
    conferir(
      Boolean(p.botao && p.descrito && p.nota),
      `abertura · "${p.botao}": a linha que diz o que é, e o botão aponta para ela`
        + ` (aria-describedby=${p.descrito} → "${p.nota}")`
    );
  }
  const tintas = [...new Set((portas || []).map((p) => p.tinta))];
  conferir(
    tintas.length === 1,
    `abertura: nenhuma porta destacada em cor — as três com a mesma tinta`
      + (tintas.length === 1 ? ` (${tintas[0]})` : ` — ${tintas.length} tintas: ${tintas.join(' vs ')}`)
  );

  // o Tab passa nas três, na ordem da tela
  await s.js("document.querySelector('.veil-intro').focus?.(); document.body.focus?.()");
  const andados = [];
  for (let i = 0; i < 8 && andados.length < 3; i++) {
    await s.teclar('Tab');
    const foco = await s.js(
      "(document.activeElement && document.activeElement.tagName === 'BUTTON')"
      + " ? document.activeElement.textContent.trim() : ''"
    );
    if (foco && !andados.includes(foco)) andados.push(foco);
  }
  const esperada = (portas || []).map((p) => p.botao);
  conferir(
    JSON.stringify(andados) === JSON.stringify(esperada),
    `abertura: o Tab passa nas três, na ordem da tela (${andados.join(' → ')})`
  );

  // o MESMO retângulo nas três, e nada sai da tela — nos dois degraus
  for (const fator of [1, 1.4]) {
    await s.ir(`ui=${fator}&${PIN}`);

    // O TAMANHO IGUAL (item 61). Arredondado ao centésimo porque o
    // layout devolve fração de pixel e duas larguras que só diferem no
    // 1e-13 são a MESMA largura. Mede-se nos DOIS degraus de propósito:
    // a igualdade vem do CSS, e CSS que só vale no tamanho de sempre
    // não é igualdade — é coincidência.
    const caixas = await s.js(`(() => {
      const out = [];
      for (const p of document.querySelectorAll('.veil-intro .abertura-porta')) {
        const b = p.querySelector('button');
        const r = b.getBoundingClientRect();
        out.push({ nome: b.textContent.trim(),
          caixa: r.width.toFixed(2) + '×' + r.height.toFixed(2) });
      }
      return out;
    })()`);
    const tamanhos = [...new Set(caixas.map((c) => c.caixa))];
    conferir(
      tamanhos.length === 1,
      `abertura com ui=${fator}: os três botões medem o MESMO retângulo`
        + (tamanhos.length === 1
          ? ` (${tamanhos[0]} px)`
          : ` — ${tamanhos.length} tamanhos: ${caixas.map((c) => `"${c.nome}" ${c.caixa}`).join(' vs ')}`)
    );

    const fora = await s.js(`(() => {
      const W = window.innerWidth; const H = window.innerHeight;
      const alvos = [...document.querySelectorAll('.veil-intro .abertura-porta, '
        + '.veil-intro .title-big, .veil-intro .journey-runtime')];
      return alvos.map((e) => { const b = e.getBoundingClientRect(); return {
        c: (typeof e.className === 'string' ? e.className : '').split(' ')[0],
        l: Math.round(b.left), t: Math.round(b.top),
        r: Math.round(b.right), b: Math.round(b.bottom) }; })
        .filter((p) => p.l < -1 || p.t < -1 || p.r > W + 1 || p.b > H + 1)
        .map((p) => p.c + ' [' + [p.l, p.t, p.r, p.b].join(',') + '] em ' + W + 'x' + H);
    })()`);
    conferir(
      fora.length === 0,
      `abertura com ui=${fator}: nada fora da tela` + (fora.length ? ` — ${fora.join(' · ')}` : '')
    );
  }

  // e a porta do Atlas leva ao Atlas — o MESMO `entrarNoAtlas` do portal
  // do pausar-e-olhar (item 60). Sem esta linha, um botão que não faz
  // nada passaria em todas as de cima.
  await s.ir(PIN);
  await s.js("[...document.querySelectorAll('.veil-intro button')]"
    + ".find((b) => b.textContent.trim() === 'Entrar no Atlas').click()");
  const entrou = await esperarPor(s, "window.__director.captura.fase === 'atlas'", 8000);
  conferir(
    entrou !== null,
    `abertura: "Entrar no Atlas" leva ao Atlas${entrou === null ? '' : ` (em ${entrou} ms)`}`
  );
}

async function julgarPagina(s, query, onde) {
  const assentou = await s.ir(`${query}&${PIN}`);
  conferir(assentou.via === 'sinal', `${onde}: assentou por via=${assentou.via}`);
  const fase = await s.js('window.__director.captura.fase');
  conferir(fase === onde, `${onde}: a fase da página é '${fase}'`);

  const nomes = await s.js(
    "[...document.querySelectorAll('[data-abre-dialogo]')]"
    + ".map((b) => b.getAttribute('data-abre-dialogo'))"
  );
  conferir(nomes.length > 0, `${onde}: ${nomes.length} gatilho(s) de diálogo declarado(s): ${nomes.join(', ')}`);
  for (const nome of nomes) await julgarDialogo(s, nome, onde);

  // nenhum diálogo ÓRFÃO: um diálogo sem gatilho declarado é um diálogo
  // que este juiz não tem como abrir — e portanto não julga
  const orfaos = await s.js(`(() => {
    const gat = new Set([...document.querySelectorAll('[data-abre-dialogo]')]
      .map((b) => b.getAttribute('data-abre-dialogo')));
    return [...document.querySelectorAll('[data-dialogo]')]
      .map((d) => d.getAttribute('data-dialogo'))
      .filter((n) => !gat.has(n));
  })()`);
  conferir(orfaos.length === 0, `${onde}: nenhum diálogo sem gatilho (órfãos: ${orfaos.join(', ') || 'nenhum'})`);

  // regiões vivas: valor válido e papel compatível
  const vivas = await s.js(`[...document.querySelectorAll('[aria-live]')].map((e) => ({
    v: e.getAttribute('aria-live'),
    papel: e.getAttribute('role') || '',
    classe: e.className,
    texto: (e.textContent || '').trim().slice(0, 40),
  }))`);
  const invalidas = vivas.filter((r) => r.v !== 'polite' && r.v !== 'assertive');
  conferir(
    invalidas.length === 0,
    `${onde}: ${vivas.length} região(ões) aria-live, todas com valor válido`
  );
  return vivas;
}

/**
 * Espera uma condição VALER no navegador e devolve em quantos ms ela
 * valeu (`null` no estouro). O número entra no log de propósito: gate
 * que espera sem dizer quanto esperou esconde a piora do dia em que ela
 * começar.
 */
async function esperarPor(s, expressao, teto = 3000) {
  const t0 = Date.now();
  for (;;) {
    if (await s.js(expressao)) return Date.now() - t0;
    if (Date.now() - t0 > teto) return null;
    await sleep(50);
  }
}

/**
 * A LISTBOX DA PALETA DE BUSCA (F3), pelo teclado e só pelo teclado.
 *
 * O padrão é o combobox: o foco NÃO entra na lista — ele fica na caixa
 * de texto, e a opção corrente é apontada por `aria-activedescendant`.
 * É a escolha certa para uma lista que muda a cada tecla, e é também a
 * que mais falha calada: basta o `aria-activedescendant` apontar para
 * um `id` que não existe (ou parar de acompanhar as setas) para quem
 * ouve a tela deixar de saber o que está escolhido, sem nada quebrar na
 * tela de quem enxerga.
 */
async function julgarListbox(s) {
  await s.js(`(() => {
    const b = document.querySelector('[data-abre-dialogo="busca"]');
    b.focus();
    b.click();
  })()`);
  await sleep(150);
  // digitação de VERDADE (tecla a tecla, com código nativo): é o único
  // caminho que passa pelo mesmo `onChange` que o visitante usa
  await s.digitar('tau');
  await sleep(300);

  const estado = () => s.js(`(() => {
    const campo = document.querySelector('.atlas-busca-campo');
    const ops = [...document.querySelectorAll('[role="option"]')];
    const apontado = campo && campo.getAttribute('aria-activedescendant');
    return {
      n: ops.length,
      valor: campo ? campo.value : null,
      naCaixa: document.activeElement === campo,
      apontado,
      // o índice pelo aria-selected E o índice pelo id apontado: os dois
      // têm de ser o mesmo, senão a tela e o leitor discordam
      porSelecionado: ops.findIndex((o) => o.getAttribute('aria-selected') === 'true'),
      porApontado: ops.findIndex((o) => o.id === apontado),
      nomes: ops.map((o) => o.querySelector('.atlas-busca-nome').textContent),
    };
  })()`);

  const inicial = await estado();
  conferir(
    inicial.valor === 'tau' && inicial.n > 2,
    `busca: digitar "tau" tecla a tecla acende ${inicial.n} opções (campo="${inicial.valor}")`
  );
  conferir(
    inicial.naCaixa,
    'busca: o foco fica na CAIXA — a lista é apontada, não focada'
  );
  conferir(
    inicial.porSelecionado === 0 && inicial.porApontado === 0,
    `busca: a primeira opção nasce escolhida (aria-selected ${inicial.porSelecionado},`
      + ` aria-activedescendant ${inicial.porApontado})`
  );

  await s.teclar('ArrowDown');
  await s.teclar('ArrowDown');
  const desceu = await estado();
  conferir(
    desceu.porSelecionado === 2 && desceu.porApontado === 2,
    `busca: duas setas para baixo escolhem a terceira ("${desceu.nomes[2]}")`
  );
  await s.teclar('ArrowUp');
  const subiu = await estado();
  conferir(
    subiu.porSelecionado === 1 && subiu.porApontado === 1,
    `busca: a seta para cima volta uma ("${subiu.nomes[1]}")`
  );

  // Enter CONFIRMA: a paleta fecha, o foco volta ao gatilho e o que a
  // linha de contexto anuncia é o nome que estava escolhido — a prova
  // de que a tecla escolheu a estrela certa, e não a primeira da lista.
  //
  // ESPERA MEDIDA e não `sleep` fixo: o Enter dispara trabalho de
  // câmera antes do fechamento, e no Atlas o quadro custa ~100 ms
  // (1200×900 com a galáxia inteira). Um prazo cego aqui é gate que
  // acende vermelho por carga da máquina — e, o que é pior, que acende
  // verde quando a máquina está rápida e o defeito existe.
  const alvo = subiu.nomes[1];
  await s.teclar('Enter');
  const fechouEm = await esperarPor(s, "!document.querySelector('[data-dialogo=\"busca\"]')");
  conferir(fechouEm !== null, `busca: Enter fecha a paleta (em ${fechouEm} ms)`);
  const devolveuEm = await esperarPor(
    s,
    'document.activeElement === document.querySelector(\'[data-abre-dialogo="busca"]\')'
  );
  // quem ficou com o foco, quando não foi o gatilho: falha que não diz
  // onde o foco parou custa uma sessão de navegador para ser lida
  const comOFoco = await s.js(
    "document.activeElement.tagName + ' [' + (document.activeElement.innerText||'').trim().slice(0, 24) + ']'"
  );
  conferir(
    devolveuEm !== null,
    `busca: e devolve o foco ao gatilho (em ${devolveuEm} ms; com o foco: ${comOFoco})`
  );
  const contexto = await s.js(
    "(document.querySelector('.atlas-contexto-nome') || {}).textContent || ''"
  );
  conferir(
    contexto === alvo,
    `busca: o Enter enquadrou a opção ESCOLHIDA ("${alvo}" → em quadro "${contexto}")`
  );
}

const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
if (!ping.includes('<div id="root"')) throw new Error(`dev server não respondeu em ${APP}`);

const sessao = await abrirSessao({ janela: JANELA, app: APP, prefixo: 'a11y' });
try {
  // A ABERTURA, que é por onde o visitante entra — e que este juiz não
  // abria (item 60).
  await julgarAbertura(sessao);

  // O FILME PAUSADO: é lá que o painel de Ajustes sempre viveu, e é a
  // prova de que a reforma do D7 não é privilégio do modo novo.
  await julgarPagina(sessao, 't=100', 'journey');

  // O ATLAS: os diálogos do modo novo, pelo mesmo contrato.
  const vivasAtlas = await julgarPagina(sessao, 'atlas=1', 'atlas');
  conferir(
    vivasAtlas.some((r) => r.papel === 'status' && r.v === 'polite' && r.texto),
    'atlas: há região viva com role="status" e texto'
      + ` (${vivasAtlas.map((r) => `${r.papel || '—'}:"${r.texto}"`).join(' · ')})`
  );

  // A REGIÃO VIVA É VIVA MESMO: mudar o foco do Atlas muda o que ela
  // anuncia. Sem esta prova, um `aria-live` sobre texto imóvel passaria
  // como acessibilidade — é o modo educado de não dizer nada.
  const antes = await sessao.js(
    "(document.querySelector('.atlas-contexto')||{}).innerText||''"
  );
  const tinta = await sessao.js(`(() => {
    const c = document.querySelector('.label-canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    for (let y = 0; y < c.height; y += 2) {
      for (let x = 0; x < c.width; x += 2) {
        if (d[(y * c.width + x) * 4 + 3] > 200) return { x, y };
      }
    }
    return null;
  })()`);
  if (!tinta) {
    conferir(false, 'atlas: nenhum rótulo desenhado para clicar');
  } else {
    await sessao.clicar(tinta.x, tinta.y);
    await sessao.assentar();
    const depois = await sessao.js(
      "(document.querySelector('.atlas-contexto')||{}).innerText||''"
    );
    conferir(
      Boolean(antes) && depois !== antes,
      `atlas: a linha de contexto MUDA com o foco ("${antes.replace(/\n/g, ' ')}"`
        + ` → "${depois.replace(/\n/g, ' ')}")`
    );
    // E O SELO ACOMPANHA O MESMO GESTO. Visitar uma estrela leva a
    // câmera a dezenas de parsecs, onde o 1:1 ficou para trás — o selo
    // tem de dizer FORA DE ESCALA na hora, e não um enquadramento
    // depois. Até a F6 ele lia a câmera do enquadramento anterior e
    // declarava a vista velha.
    //
    // O GESTO QUE VIAJA VIROU O DUPLO CLIQUE em 22/08 (item 73): o
    // clique simples passou a ESCOLHER sem mover a câmera, e é por isso
    // que a linha de contexto acima muda com um clique só e o selo, que
    // fala de DISTÂNCIA, precisa dos dois. A promessa medida é a mesma
    // de sempre — o selo declara a vista NOVA, não a anterior.
    // e o alvo é uma ESTRELA, escolhida da lista viva em vez de sorteada
    // pelo primeiro pixel com tinta: dentro do sistema solar nenhum
    // duplo clique tira a câmera de 0,001 pc, e o que este veredito
    // mede é justamente sair dele
    const daEstrela = JSON.parse(await sessao.js(`JSON.stringify((() => {
      const l = window.__director.rotulos.alvos.find(
        (r) => r.desenhado === true && !r.key.startsWith('corpo:')
      );
      return l ? { x: Math.round(l.x * window.innerWidth),
        y: Math.round(l.y * window.innerHeight), nome: l.name } : null;
    })())`));
    await sessao.duploClicar(daEstrela.x, daEstrela.y);
    await sleep(1200);
    await sessao.assentar();
    const seloLonge = await sessao.js(`(() => {
      const s = window.__director.selo;
      return JSON.stringify({ pc: s.distanciaPc });
    })()`);
    const longe = JSON.parse(seloLonge);
    const escalaLonge = await sessao.js(
      "document.querySelector('.atlas-selo-linha strong').textContent"
    );
    conferir(
      longe.pc > 1 && escalaLonge === 'FORA DE ESCALA',
      `atlas: depois de visitar, o selo declara a vista NOVA — ${longe.pc.toFixed(1)} pc,`
        + ` "${escalaLonge}"`
    );
  }
  // ---- o selo de honestidade (D1) ---------------------------------
  // Este bloco julga o selo NA ABERTURA. A F3 descobriu que ele passava
  // por sorte quando rodava depois de uma prova que move a câmera (lia
  // ESCALA REAL só porque o HUD ainda não tinha sido redesenhado); a F6
  // consertou a causa raiz (o selo acompanha a câmera na hora) e o
  // `sessao.ir()` logo abaixo é o que GARANTE a vista de abertura,
  // independente da ordem das provas. Um gate que depende de o desenho
  // atrasar não julga nada.
  // O TESTE PURO (`selo.test.ts`) cobra que nenhum controle possa
  // desmentir o selo; aqui a mesma promessa é cobrada no navegador, com
  // os controles de verdade: desligar uma camada na gaveta tem de mover
  // o selo, e clicar na linha BRILHO tem de trazê-lo de volta.
  // volta ao ENQUADRAMENTO DE ABERTURA: a prova do selo é sobre a vista
  // com que o Atlas abre, e a prova acima deixou a câmera numa estrela
  await sessao.ir(`atlas=1&${PIN}`);
  const lerSelo = () => sessao.js(`(() => {
    const s = document.querySelector('.atlas-selo');
    if (!s) return null;
    const [escala, brilho] = [...s.querySelectorAll('.atlas-selo-linha')];
    return {
      escala: escala.querySelector('strong').textContent,
      brilho: brilho.querySelector('strong').textContent,
      detalhe: brilho.querySelector('em').textContent,
      brilhoClicavel: !brilho.disabled,
      escalaClicavel: !escala.disabled,
    };
  })()`);

  const inicial = await lerSelo();
  // DESDE O M2 a abertura do Atlas declara o BRILHO ASSISTIDO: a faixa
  // é comprimida na emissão para mundos distantes continuarem visíveis
  // (é a LEI da luz, não um desvio por quadro), e a política de luz dos
  // corpos nasce `assistida` (E^σ — Onda 6, D2), com a copy leiga no
  // detalhe do selo. Um Atlas que abrisse dizendo BRILHO REAL sobre uma
  // imagem tratada seria o selo mentindo — que é o defeito que ele
  // existe para não ter. (A GRADAÇÃO POR CONTEXTO da era F6 morreu no
  // M1 — o vigia dela mudou de alvo, logo abaixo.)
  conferir(
    inicial !== null && inicial.escala === 'ESCALA REAL'
      && inicial.brilho === 'BRILHO ASSISTIDO'
      && /faixa comprimida/.test(inicial.detalhe),
    `selo na abertura: "${inicial?.escala}" · "${inicial?.brilho}" — ${inicial?.detalhe}`
  );
  // A ASSISTÊNCIA NOVA DO ATLAS É DECLARADA ONDE O VISITANTE LÊ (M2 +
  // a dose por fase de 17/08): o rodapé de proveniência do selo NOMEIA
  // o clarão como artístico. E a gradação morta não pode ressuscitar no
  // estado — o vigia de CÓDIGO é simbolosProibidos.test; este é o de
  // runtime (item 48).
  const rodape = await sessao.js(
    "(document.querySelector('.atlas-selo')||{innerText:''}).innerText.replace(/\\n/g,' ')"
  );
  const gradacaoMorta = await sessao.js('String(window.__director.selo.gradacao)');
  conferir(
    /artístico:.*clarão/.test(rodape) && gradacaoMorta === 'undefined',
    'selo: o rodapé declara o clarão como artístico, e a gradação segue morta'
  );
  conferir(
    inicial !== null && inicial.brilhoClicavel && !inicial.escalaClicavel,
    'selo: a linha com o que desfazer é controle; a que está em real, não'
  );

  await sessao.js("document.querySelector('[data-abre-dialogo=\"camadas\"]').click()");
  await sleep(150);
  await sessao.js(`(() => {
    const g = document.querySelector('[data-dialogo="camadas"]');
    g.querySelector('input[type=checkbox]').click();
  })()`);
  await sleep(200);
  const sujo = await lerSelo();
  conferir(
    sujo.brilho === 'BRILHO ASSISTIDO' && /camada desligada/.test(sujo.detalhe),
    `selo depois de desligar uma camada na gaveta: "${sujo.brilho}" — ${sujo.detalhe}`
  );
  conferir(sujo.brilhoClicavel, 'selo: com desvio desfazível, a linha BRILHO vira controle');

  await sessao.js("document.querySelector('.atlas-selo-linha:nth-of-type(2)').click()");
  await sleep(250);
  const voltou = await lerSelo();
  const urlLimpa = await sessao.js('location.search');
  const camadasVivas = await sessao.js(
    'JSON.stringify(window.__director.selo.camadasEscondidas)'
  );
  conferir(
    voltou.brilho === 'BRILHO REAL' && camadasVivas === '[]',
    `selo: clicar na linha BRILHO volta ao real ("${voltou.brilho}", escondidas=`
      + `${camadasVivas})`
  );
  conferir(
    !urlLimpa.includes('nocat') && urlLimpa.includes('atlas')
      // a luz tem contrato de default vivo: a volta ESCREVE ?luz=real
      // para sobreviver à recarga (Onda 6, D2). O ?grad= morreu no M1
      // e não pode voltar à URL.
      && urlLimpa.includes('luz=real') && !urlLimpa.includes('grad'),
    `selo: a volta limpa a porta, escreve a luz e preserva o modo (${urlLimpa})`
  );

  // A LINHA-CONTROLE PRÓPRIA da luz — todo caminho que altera o
  // resultado tem de poder ser desligado pelo link: `?luz=real` faz o
  // Atlas abrir com o 1/d² cru nos corpos — e aí o selo diz REAL, que
  // é a verdade daquela vista. (O `?grad=` morreu no M1 junto com a
  // gradação por contexto.)
  await sessao.ir(`atlas=1&luz=real&${PIN}`);
  const semAssistencia = await lerSelo();
  conferir(
    semAssistencia.brilho === 'BRILHO REAL',
    `?luz=real: o Atlas abre sem assistência e o selo diz "${semAssistencia.brilho}"`
  );

  // ---- O SELO ACOMPANHA O TIER NO ATO (item 10) --------------------
  // A queixa era "o selo pode atrasar até 3 segundos; só atualiza
  // quando a interface redesenha". O redesenho é DISPARADO por todo
  // escritor de insumo do selo desde o corte 6 (onQuality → React) e a
  // F6 (enquadrarAgora move a câmera ANTES de avisar o HUD); medido em
  // 2026-08-18: 1–2 ms entre setQuality e o DOM. Esta prova vigia a
  // FIAÇÃO — um tier que mudasse a imagem sem mover o selo na tela
  // seria o selo mentindo por atraso, que é a doença do item.
  await sessao.js("window.__director.setQuality('alta')");
  const tierNaTela = await esperarPor(
    sessao,
    "document.querySelector('.atlas-selo').innerText.includes('amostragem abaixo de cinema')"
  );
  conferir(
    tierNaTela !== null && tierNaTela < 1000,
    `selo: a troca de tier aparece na tela no ato (${tierNaTela} ms)`
  );
  await sessao.js("window.__director.setQuality('cinema')");
  const tierVoltou = await esperarPor(
    sessao,
    "!document.querySelector('.atlas-selo').innerText.includes('amostragem')"
  );
  conferir(
    tierVoltou !== null,
    `selo: a volta a cinema tira o desvio da tela (${tierVoltou} ms)`
  );

  // ---- A ESCADA DE NAVEGAÇÃO (F2b/D7) -----------------------------
  // Os dois botões novos da ContextLine com nome acessível pt-BR, o
  // gesto de descer, o Esc que sobe UM degrau — e a interação declarada
  // com os diálogos: diálogo aberto come o Esc PRIMEIRO.
  await sessao.ir(`foco=terra&${PIN}`);
  const escadaBotoes = await sessao.js(`(() => {
    const ctx = document.querySelector('.atlas-contexto');
    const botoes = [...ctx.querySelectorAll('button')];
    return botoes.map((b) => b.getAttribute('aria-label'));
  })()`);
  conferir(
    escadaBotoes.length === 2
      && /^Aproximar: enquadrar Terra/.test(escadaBotoes[0] || '')
      && /sistema solar/.test(escadaBotoes[1] || ''),
    `escada: os dois botões têm aria-label pt-BR (${JSON.stringify(escadaBotoes)})`
  );
  // descer: "aproximar" enquadra o CORPO com raio físico — a câmera sai
  // de ~6,3 UA do Sol para ~0,0006 UA da Terra
  await sessao.js(`(() => {
    [...document.querySelectorAll('.atlas-contexto button')]
      .find((b) => /Aproximar/.test(b.getAttribute('aria-label'))).click();
  })()`);
  await sessao.assentar();
  const desceu = await sessao.js(`JSON.stringify({
    ver: window.__director.verDaEscada,
    degrau: window.__director.escadaViva.degrau,
    contexto: (document.querySelector('.atlas-contexto-nome') || {}).textContent,
  })`);
  const d1 = JSON.parse(desceu);
  conferir(
    d1.ver === 'corpo' && d1.degrau === 'corpo' && d1.contexto === 'Terra',
    `escada: "aproximar" desce ao degrau corpo (${desceu})`
  );
  // o degrau reproduz por URL (espelho): a recarga com ?ver=corpo volta
  // ao MESMO degrau
  await sessao.ir(`foco=terra&ver=corpo&${PIN}`);
  const porUrl = await sessao.js('window.__director.escadaViva.degrau');
  conferir(porUrl === 'corpo', `escada: ?foco=terra&ver=corpo reproduz o degrau ('${porUrl}')`);
  // DIÁLOGO ABERTO COME O Esc PRIMEIRO: com a gaveta aberta, Esc fecha
  // a gaveta e o degrau NÃO se move
  await sessao.js(`(() => {
    const b = document.querySelector('[data-abre-dialogo="camadas"]');
    b.focus();
    b.click();
  })()`);
  await sleep(150);
  await sessao.teclar('Escape');
  await sleep(200);
  const aposDialogo = await sessao.js(`JSON.stringify({
    gaveta: Boolean(document.querySelector('[data-dialogo="camadas"]')),
    degrau: window.__director.escadaViva.degrau,
  })`);
  const d2 = JSON.parse(aposDialogo);
  conferir(
    !d2.gaveta && d2.degrau === 'corpo',
    `escada: o Esc com diálogo aberto fecha o DIÁLOGO e não sobe degrau (${aposDialogo})`
  );
  // agora sim: Esc livre sobe UM degrau por vez — corpo → órbita → sistema
  await sessao.teclar('Escape');
  await sessao.assentar();
  const sub1 = await sessao.js('window.__director.escadaViva.degrau');
  await sessao.teclar('Escape');
  await sessao.assentar();
  const sub2 = await sessao.js(`JSON.stringify({
    degrau: window.__director.escadaViva.degrau,
    contexto: (document.querySelector('.atlas-contexto-nome') || {}).textContent,
    botoes: [...document.querySelectorAll('.atlas-contexto button')].length,
  })`);
  const d3 = JSON.parse(sub2);
  conferir(
    sub1 === 'orbita' && d3.degrau === 'sistema' && d3.contexto === 'Sistema solar'
      && d3.botoes === 0,
    `escada: Esc sobe um degrau por vez (corpo → '${sub1}' → '${d3.degrau}'), e no sistema os botões somem`
  );

  // ---- O CONVITE DO ATLAS (item 73, 22/08) ------------------------
  // Ele é IRMÃO do convite do voo livre — a mecânica é a mesma peça
  // (`Spotlight`), e o `voo-smoke` já a julga inteira lá. O que muda, e
  // é o que se mede aqui, é o CONTEÚDO e a CHAVE: quatro passos com os
  // gestos do Atlas, e `conviteAtlasVisto` própria, para que ver um
  // convite não faça o visitante pular o outro.
  //
  // A prova começa com o storage LIMPO: convite é marca de primeira
  // visita, e as provas acima já entraram no modo várias vezes.
  await sessao.js("window.localStorage.removeItem('viagem-prefs')");
  await sessao.ir(`atlas=1&${PIN}`);
  const convite = JSON.parse(await sessao.js(`JSON.stringify((() => {
    const spot = document.querySelector('.spotlight');
    const furo = [...document.querySelectorAll('.spotlight-mascara rect')]
      .map((r) => ({ w: Number(r.getAttribute('width')), h: Number(r.getAttribute('height')) }))
      .find((r) => Number.isFinite(r.w) && r.w > 0 && r.w < window.innerWidth);
    const alvo = document.querySelector('[data-spot="girar"]');
    return {
      existe: Boolean(spot),
      filhaDireta: Boolean(spot && spot.parentElement.classList.contains('hud-root')),
      texto: (document.querySelector('.convite-texto') || {}).innerText || '',
      conta: (document.querySelector('.convite-conta') || {}).innerText || '',
      furoLargura: furo ? furo.w : null,
      alvoLargura: alvo ? Math.round(alvo.getBoundingClientRect().width) : null,
    };
  })())`));
  conferir(
    convite.existe && convite.filhaDireta,
    'atlas: o convite abre na PRIMEIRA entrada e é filho DIRETO de .hud-root'
  );
  conferir(
    // o `innerText` volta MAIÚSCULO: a caixa alta é do CSS do cartão
    /^1 de 4$/i.test(convite.conta.trim()) && /girar/i.test(convite.texto),
    `atlas: o convite tem os QUATRO gestos do modo ("${convite.conta.trim()}" ·`
      + ` "${convite.texto}")`
  );
  // o furo é ANCORADO no pedaço REAL da dica do rodapé: sem isso o
  // convite apontaria um lugar onde não há nada a lembrar depois
  conferir(
    convite.furoLargura !== null && convite.alvoLargura !== null
      && Math.abs(convite.furoLargura - convite.alvoLargura - 16) <= 2,
    `atlas: o furo é o retângulo do "arraste — girar" da dica`
      + ` (${convite.furoLargura} px de furo sobre ${convite.alvoLargura} px de alvo`
      + ` + 8 de folga de cada lado)`
  );
  // "continuar" três vezes chega ao último passo, e "entendi" fecha e
  // grava a chave PRÓPRIA — não a do voo livre
  for (let i = 0; i < 3; i++) {
    await sessao.js(`[...document.querySelectorAll('.convite-linha button')]
      .find((b) => b.textContent.trim() === 'continuar').click()`);
    await sleep(120);
  }
  const noQuarto = await sessao.js(
    "(document.querySelector('.convite-conta')||{}).innerText||''"
  );
  await sessao.js(`[...document.querySelectorAll('.convite-linha button')]
    .find((b) => b.textContent.trim() === 'entendi').click()`);
  await sleep(200);
  const prefs = await sessao.js("window.localStorage.getItem('viagem-prefs') || ''");
  conferir(
    /^4 de 4$/i.test(noQuarto.trim())
      && (await sessao.js("!!document.querySelector('.spotlight')")) === false
      && /"conviteAtlasVisto":true/.test(prefs)
      && !/"conviteVisto":true/.test(prefs),
    `atlas: o "entendi" fecha e grava a chave PRÓPRIA (${prefs})`
  );
  await sessao.ir(`atlas=1&${PIN}`);
  conferir(
    (await sessao.js("!!document.querySelector('.spotlight')")) === false,
    'atlas: RECARGA no mesmo perfil — o convite NÃO reaparece'
  );
  await sessao.js("window.localStorage.removeItem('viagem-prefs')");

  // ---- o retângulo útil cobre o HUD REAL --------------------------
  // A declaração vive no TS (`retanguloUtilDoAtlas`) e as alturas, no
  // CSS. Sem esta prova as duas só se encontrariam a olho — e o alvo
  // começaria a ser enquadrado por baixo do selo sem ninguém notar.
  await sessao.ir(`atlas=1&${PIN}`);
  await medirCobertura(sessao, 'ui = 1 (o de sempre)');
  // ...e com a LINHA DA ESCADA na tela (F2b): com um corpo em foco a
  // ContextLine carrega os dois botões e é o estado mais alto do topo —
  // é ELE que a fração declarada tem de cobrir
  await sessao.ir(`foco=terra&${PIN}`);
  await medirCobertura(sessao, 'ui = 1 com a linha da escada');
  await sessao.ir(`atlas=1&${PIN}`);

  // ---- A ESCALA DA UI (`?ui=`, F6) --------------------------------
  await julgarEscalaDaUi(sessao);

  // ---- a listbox da busca, pelo TECLADO (F3) ----------------------
  // O contrato genérico do `dialogFocus` já cobrou foco preso, Esc e
  // devolução da paleta junto com os outros diálogos. O que ele NÃO
  // pode cobrar é o que só a paleta tem: uma lista que não recebe foco
  // e é apontada por `aria-activedescendant`. Sem esta prova, a paleta
  // poderia estar acessível "no papel" (o Tab não vaza) e inutilizável
  // pelo teclado — que é o caminho de quem mais precisa dela.
  await sessao.ir(`atlas=1&${PIN}`);
  await julgarListbox(sessao);

  // O VOO LIVRE, desde a F5: o painel de Ajustes ganhou uma seção que só
  // existe nesta fase ("rever o convite"), e o convite dos três gestos
  // fica na tela ao lado dele. Sem julgar a fase, uma seção nova podia
  // quebrar o foco preso do painel sem ninguém ver; e um convite que
  // roubasse o foco não apareceria em prova nenhuma.
  await julgarPagina(sessao, 'pos=0,0,0.1&look=0,0,0', 'free');
} finally {
  sessao.fechar();
}

if (falhas.length) {
  process.stdout.write(`\nJUIZ DE A11Y: ${falhas.length} falha(s)\n`);
  process.exit(1);
}
process.stdout.write('\nJUIZ DE A11Y: tudo verde\n');

// ============================================================
// O RETÂNGULO ÚTIL e A ESCALA DA UI — as duas provas que a F6 trouxe,
// em funções porque agora rodam mais de uma vez (uma por tamanho de
// texto).
// ============================================================

async function medirCobertura(s, quando, cobra = true, fatorUi = 1) {
  const cobertura = await s.js(`(() => {
    const H = window.innerHeight;
    const util = window.__director.retanguloUtil;
    const medir = (sel) => {
      const e = document.querySelector(sel);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      if (b.height === 0) return null;
      return { sel, topo: b.bottom / H, base: (H - b.top) / H };
    };
    const pecas = [
      '.atlas-contexto', '.controls-bar', '.atlas-selo', '.free-hint',
      // a máquina do tempo entrou na base pela F4: sem esta linha o
      // juiz mediria um HUD que não é mais o que está na tela
      '.atlas-tempo',
    ].map(medir).filter(Boolean);
    const noTopo = pecas.filter((p) => p.topo < 0.5);
    const naBase = pecas.filter((p) => p.topo >= 0.5);
    return {
      util,
      largura: window.innerWidth,
      noTopo: noTopo.length,
      naBase: naBase.length,
      topoMedido: Math.max(...noTopo.map((p) => p.topo)),
      baseMedida: Math.max(...naBase.map((p) => p.base)),
      pecas: pecas.map((p) => p.sel + ':' + p.topo.toFixed(3) + '/' + p.base.toFixed(3)),
    };
  })()`);
  const sobra = 1 - cobertura.topoMedido - cobertura.baseMedida;
  // JANELA MUITO BAIXA, ou abaixo da faixa declarada
  // (`LARGURA_UTIL_MINIMA_PX`): a medição é REGISTRO, não gate. A
  // declaração é fração de ALTURA e não sabe da altura da janela, então
  // num viewport de 450 px a mesma peça de HUD é o dobro de fração; e
  // abaixo da faixa o HUD do Atlas troca de arranjo (uma coluna só, de
  // borda a borda — fatia 6 do CSS), onde a base é maior de propósito.
  // O número sai daqui em vez de sair de um adjetivo.
  if (!cobra) {
    process.stdout.write(
      `  ·     retângulo útil (${quando}, ${cobertura.largura} px de largura): `
        + `topo ${cobertura.topoMedido.toFixed(3)}/${cobertura.util.topo.toFixed(3)} · `
        + `base ${cobertura.baseMedida.toFixed(3)}/${cobertura.util.base.toFixed(3)} · `
        + `sobra ${(sobra * 100).toFixed(1)}% — REGISTRO (fora da faixa declarada)\n`
    );
    return;
  }
  // MEDIU ALGUMA COISA? Com `noTopo` (ou `naBase`) vazio, `Math.max()`
  // devolve −Infinity e as duas provas abaixo passam imprimindo "medido
  // -Infinity" — HUD ausente vira indistinguível de HUD coberto, que é
  // o modo de falha que a casa nomeou como o pior ("gate que degrada em
  // silêncio é pior que gate que quebra", chrome.mjs). Basta `?atlas=1`
  // deixar de entrar na fase, ou um seletor mudar de nome.
  const onde = `${quando}, ${cobertura.largura} px de largura`;
  conferir(
    cobertura.noTopo > 0 && cobertura.naBase > 0,
    `retângulo útil (${onde}): mediu ${cobertura.noTopo} peça(s) no topo e `
      + `${cobertura.naBase} na base (${cobertura.pecas.join(' · ') || 'NENHUMA'})`
  );
  conferir(
    cobertura.topoMedido <= cobertura.util.topo,
    `retângulo útil (${onde}): topo declarado ${cobertura.util.topo.toFixed(3)} ≥ medido `
      + `${cobertura.topoMedido.toFixed(3)}`
  );
  conferir(
    cobertura.baseMedida <= cobertura.util.base,
    `retângulo útil (${onde}): base declarada `
      + `${cobertura.util.base.toFixed(3)} ≥ medida ${cobertura.baseMedida.toFixed(3)} `
      + `(${cobertura.pecas.join(' · ')})`
  );
  // O PISO DOUTRINÁRIO, sobre o MEDIDO e não sobre a declaração. Ele
  // vivia no vitest, cobrando o número declarado — e ali virou catraca:
  // a declaração paga folga por cima do medido, então o piso pinava "o
  // número de hoje menos um fio" e a próxima peça de HUD o baixaria de
  // novo com derivação escrita, sem ninguém ver a linha ser cruzada.
  // Aqui ele afirma o que realmente importa: o HUD REAL não come mais
  // da metade da altura do quadro. Passar disso não é HUD, é moldura.
  //
  // NO TEXTO DE FÁBRICA (fator ≤ 1). Com `?ui=` acima de 1 o visitante
  // trocou quadro por texto de propósito, e o contrato dessa troca é a
  // DECLARAÇÃO — `retanguloUtilDoAtlas` recebe o fator, a câmera recua,
  // e as duas provas acima cobram declarado ≥ medido. Um piso fixo por
  // cima da ampliação puniria exatamente quem pediu o texto grande: a
  // 1200×900 com ×1,4 o HUD mede ~50,4% por aritmética do próprio
  // pedido, com a declaração verde. O piso nasceu cobrando TODA medição
  // e nunca tinha visto uma rodada completa (a primeira, item 48,
  // acusou a própria régua). Na ampliação a sobra fica como REGISTRO.
  if (fatorUi > 1) {
    process.stdout.write(
      `  ·     retângulo útil (${onde}): o HUD deixa ${(sobra * 100).toFixed(1)}% da altura `
        + `livre — registro (texto ampliado: a declaração é o contrato)\n`
    );
    return;
  }
  conferir(
    sobra > 0.5,
    `retângulo útil (${onde}): o HUD REAL deixa ${(sobra * 100).toFixed(1)}% da altura `
      + `livre (piso doutrinário: mais da metade)`
  );
}

/**
 * A ESCALA DA UI (`?ui=`, F6). Quatro promessas:
 *  1. o tamanho do texto MUDA, e muda pelo fator pedido, em TODO texto
 *     que está na tela — inclusive nos `clamp(rem, vw, rem)`, que antes
 *     ignoravam a raiz;
 *  2. o HUD não quebra no maior degrau, nem com o ZOOM do navegador por
 *     cima dele (que é o mesmo problema com outro nome: viewport em px
 *     de CSS encolhendo enquanto o texto não encolhe);
 *  3. o tamanho vive na URL e NUNCA no storage;
 *  4. o retângulo útil do Atlas continua cobrindo o HUD nos extremos da
 *     faixa — texto maior, HUD mais alto, câmera mais atrás.
 */
async function julgarEscalaDaUi(s) {
  const GRANDE = 1.4;
  // as três telas cobrem famílias diferentes de `font-size`: a
  // cartografia do carregamento, o HUD do filme e o do Atlas
  const TELAS = [
    ['loader=galaxy', 'carregamento'],
    ['t=100', 'filme'],
    ['atlas=1', 'atlas'],
  ];
  let cobertos = 0;
  for (const [query, onde] of TELAS) {
    await s.ir(`${query}&${PIN}`);
    const base = await s.js(MEDIR_FONTES);
    const clampsBase = await s.js(MEDIR_CLAMPS);
    await s.ir(`${query}&ui=${GRANDE}&${PIN}`);
    const grande = await s.js(MEDIR_FONTES);
    const clamps = await s.js(MEDIR_CLAMPS);
    const chaves = Object.keys(base);
    const fugiram = chaves.filter(
      (k) => !(k in grande) || Math.abs(grande[k] / base[k] - GRANDE) > 0.01
    );
    conferir(
      chaves.length > 0 && fugiram.length === 0,
      `?ui=${GRANDE} em '${onde}': ${chaves.length} elementos com texto, todos ×${GRANDE}`
        + (fugiram.length
          ? ` — ${fugiram.length} fora: ${fugiram
              .slice(0, 4)
              .map((k) => `${k} ${base[k]}→${grande[k] ?? '?'}`)
              .join(' · ')}`
          : ` (${Math.min(...chaves.map((k) => base[k]))}–`
            + `${Math.max(...chaves.map((k) => base[k]))} px → `
            + `${Math.min(...chaves.map((k) => grande[k]))}–`
            + `${Math.max(...chaves.map((k) => grande[k]))} px)`)
    );
    cobertos += chaves.length;

    // OS NOVE `clamp` são o alvo declarado do gate: eles vivem nos
    // títulos mais proeminentes, e eram justamente os que ficavam
    // parados. Cobrados por seletor, um a um, onde cada um existe.
    const seletores = Object.keys(clampsBase);
    if (seletores.length) {
      const parados = seletores.filter(
        (sel) => Math.abs(clamps[sel] / clampsBase[sel] - GRANDE) > 0.01
      );
      conferir(
        parados.length === 0,
        `clamp(rem, vw, rem) em '${onde}': ${seletores.length} seletor(es) ×${GRANDE} `
          + `(${seletores.map((sel) => `${sel} ${clampsBase[sel]}→${clamps[sel]}`).join(' · ')})`
      );
    }
  }
  conferir(cobertos > 0, `escala da UI: ${cobertos} medições de font-size nas três telas`);

  // ---- o HUD não quebra ------------------------------------------
  // com o painel ABERTO, que é a peça mais alta que a casa tem
  for (const fator of [1, GRANDE]) {
    await s.ir(`atlas=1&ajustes=1&ui=${fator}&${PIN}`);
    const q = await s.js(MEDIR_QUEBRAS);
    conferir(
      q.foraDaTela.length === 0 && q.atropelos.length === 0,
      `ui=${fator}: ${q.pecas} peças do HUD, nenhuma fora da tela nem atropelada`
        + (q.foraDaTela.length ? ` — fora: ${q.foraDaTela.join(' · ')}` : '')
        + (q.atropelos.length ? ` — atropelo: ${q.atropelos.join(' · ')}` : '')
    );
  }

  // ---- e o ZOOM do navegador por cima do maior degrau -------------
  // Zoom de navegador é isto: o viewport em px de CSS encolhe e o
  // conteúdo em px de dispositivo fica do mesmo tamanho. Quem vive em
  // `vw`/`vh` acompanha; quem vive em `rem` cresce na tela. É o pior
  // caso do texto grande, e é onde um HUD mal ancorado sai da tela.
  for (const zoom of [1.5, 2]) {
    await s.send('Emulation.setDeviceMetricsOverride', {
      width: Math.round(1200 / zoom),
      height: Math.round(900 / zoom),
      deviceScaleFactor: zoom,
      mobile: false,
    });
    await s.ir(`atlas=1&ajustes=1&ui=${GRANDE}&${PIN}`);
    const q = await s.js(MEDIR_QUEBRAS);
    conferir(
      q.foraDaTela.length === 0 && q.atropelos.length === 0,
      `zoom ${zoom * 100}% com ui=${GRANDE}: ${q.pecas} peças inteiras na tela`
        + (q.foraDaTela.length ? ` — fora: ${q.foraDaTela.join(' · ')}` : '')
        + (q.atropelos.length ? ` — atropelo: ${q.atropelos.join(' · ')}` : '')
    );
    // E O RETÂNGULO ÚTIL AQUI TAMBÉM — como REGISTRO. Estas duas janelas
    // (800 e 600 px de CSS) são BAIXAS antes de serem estreitas (600 e
    // 450 px de altura), e a declaração é fração de altura: ali a mesma
    // faixa de HUD vale o dobro. O número existe para o ganho aparecer —
    // foi ele que mostrou o conserto do item 9 na janela de 600 px, onde
    // a sobra saiu de −13,6% para 3,7%.
    await medirCobertura(s, `ui = ${GRANDE} com zoom ${zoom * 100}%`, false);
    // OS DOIS `clamp` QUE SÓ EXISTEM NA QUEBRA ESTREITA do CSS — os
    // últimos dos nove, e os únicos que nenhuma medição em tela de mesa
    // alcança. A 600×450 as duas regras estão de pé (largura ≤ 760 e
    // altura ≤ 480 em paisagem), e a tela do carregamento é onde o
    // título delas existe.
    if (zoom === 2) {
      const medir = `(() => {
        const e = document.querySelector('.cv-titulo .title-big');
        const r = document.querySelector('.cv-etapa-rotulo');
        return {
          largura: window.innerWidth,
          titulo: e ? parseFloat(getComputedStyle(e).fontSize) : null,
          rotulo: r ? parseFloat(getComputedStyle(r).fontSize) : null,
        };
      })()`;
      await s.ir(`loader=galaxy&ui=1&${PIN}`);
      const um = await s.js(medir);
      await s.ir(`loader=galaxy&ui=${GRANDE}&${PIN}`);
      const grande = await s.js(medir);
      conferir(
        um.largura < 760 && um.titulo !== null
          && Math.abs(grande.titulo / um.titulo - GRANDE) < 0.01
          && Math.abs(grande.rotulo / um.rotulo - GRANDE) < 0.01,
        `quebra estreita (${um.largura} px de CSS de largura): `
          + `título ${um.titulo}→${grande.titulo} · rótulo ${um.rotulo}→${grande.rotulo}`
      );
    }
  }
  await s.send('Emulation.clearDeviceMetricsOverride');

  // ---- a URL manda, o storage não sabe de nada --------------------
  await s.ir(`atlas=1&ajustes=1&${PIN}`);
  await s.js(`(() => {
    const b = [...document.querySelectorAll('[data-dialogo="ajustes"] button')]
      .find((e) => e.textContent.trim() === '120%');
    b.click();
  })()`);
  await sleep(200);
  const depois = await s.js(`({
    url: location.search,
    raiz: getComputedStyle(document.documentElement).getPropertyValue('--ui').trim(),
    storage: JSON.stringify(Object.entries(localStorage)),
  })`);
  conferir(
    depois.url.includes('ui=1.2') && depois.raiz === '1.2',
    `o painel escreve o tamanho na URL (${depois.url}) e na raiz (--ui: ${depois.raiz})`
  );
  conferir(
    !depois.storage.includes('ui') && !depois.storage.includes('1.2'),
    `o tamanho NÃO vai ao storage (${depois.storage})`
  );

  // ---- e o retângulo útil do Atlas segue cobrindo o HUD -----------
  for (const fator of [0.85, GRANDE]) {
    await s.ir(`atlas=1&ui=${fator}&${PIN}`);
    await medirCobertura(s, `ui = ${fator}`, true, fator);
  }

  // ---- OS DOIS EIXOS DA DECLARAÇÃO, e não um só -------------------
  // A quebra da barra de controles é fenômeno de LARGURA×TEXTO (o
  // `max-width: 60vw` do hud.css), e até este conserto a declaração de
  // `atlasRig.ts` só recebia o fator de `?ui=` — a frase "o juiz mede os
  // extremos da faixa e cobra declarado ≥ medido" valia para os extremos
  // do TEXTO, não para os da LARGURA, que é onde o fenômeno mora.
  //
  // A faixa de validade é DECLARADA no código (`LARGURA_UTIL_MINIMA_PX`)
  // e lida DE LÁ, pelo dev server, e não redigitada aqui: o número tem
  // um dono só. Precedente: o `busca-smoke` importa a lib da busca na
  // própria página para medir com o módulo que a UI usa.
  await s.js(
    "(() => { import('/src/three/cinematic/atlasRig.ts').then((m) => { window.__rig = m; }); })()"
  );
  await sleep(400);
  const minima = await s.js('window.__rig.LARGURA_UTIL_MINIMA_PX');
  conferir(
    Number.isFinite(minima) && minima > 0,
    `a faixa de validade da declaração é um número: ≥ ${minima} px de largura de CSS`
  );
  for (const largura of [minima, 1000, 1200]) {
    for (const fator of [1, 1.25, GRANDE]) {
      await s.send('Emulation.setDeviceMetricsOverride', {
        width: largura, height: 900, deviceScaleFactor: 1, mobile: false,
      });
      await s.ir(`atlas=1&ui=${fator}&${PIN}`);
      await medirCobertura(s, `ui = ${fator}`, true, fator);
    }
  }
  await s.send('Emulation.clearDeviceMetricsOverride');
}
