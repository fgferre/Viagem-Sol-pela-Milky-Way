// Serve: dono — o HUD se usa de teclado e no telefone, e a gaveta não mente o número de camadas
// Custo: 4,5 min (medido 30/08, F5a/F5b do item 113: `?ui=`/viewport ao vivo — ~40 recargas a menos; era 6,1.
// A aposta `q=performance` nos boots de DOM foi MEDIDA e DESCARTADA: pouparia 0,8 min (< 1 min do piso)
// e derrubou 2 vereditos da perna do celular — o cinema fica.)
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
import { readFileSync } from 'node:fs';
import { abrirSessao, APP_PADRAO, dorme, esperarPor } from './chrome.mjs';
// A PERNA DO CELULAR mora em arquivo próprio desde 23/08 (§11 do AGENTS):
// eram 546 linhas com seis partes e constantes próprias dentro deste juiz.
// Ela recebe daqui as ferramentas comuns — `conferir`, `medirCobertura` e o
// `PIN` —, que continuam existindo em UM lugar só.
import { julgarCelular } from './a11y-celular.mjs';

const APP = process.env.APP_URL || APP_PADRAO;
const JANELA = process.env.JANELA || '1200x900';
// `?shot=1` (não `2`): congela transições e o relógio visual — o juiz não
// espera fade nenhum — e MANTÉM o HUD na tela, que é o objeto do juízo.
const PIN = 'q=cinema&shot=1';
/**
 * O TETO DA LINHA FECHADA do selo, em px de CSS a `ui = 1` — a medida de
 * ÁREA que o item 61 trouxe (a derivação inteira está em
 * `julgarAreaDoSelo`, lá embaixo). Mora aqui em cima porque `const` não
 * sobe: a função é chamada antes desta linha no corpo do módulo, e
 * declarar o número junto dela dava ReferenceError.
 */
const TETO_DA_LINHA_PX = 24;
const N_CAMADAS = (() => {
  const bloco = readFileSync(new URL('../../src/three/atlasConfig.ts', import.meta.url), 'utf8')
    .match(/export const CAMADAS:[\s\S]*?\n\];/)?.[0];
  const n = (bloco?.match(/\bflag:/g) || []).length;
  if (n < 1) throw new Error('CAMADAS não achada em atlasConfig.ts');
  return n;
})();


const falhas = [];
const conferir = (ok, texto) => {
  process.stdout.write(`${ok ? '  OK  ' : '  FALHA '} ${texto}\n`);
  if (!ok) falhas.push(texto);
};

/**
 * TROCA A ESCALA DA UI AO VIVO — o caminho do próprio app
 * (`trocarEscalaUi` em useEspelhoDaUrl.ts): o `--ui` entra pela porta
 * única do módulo (`aplicarEscalaDaUi`) e o Director é avisado
 * (`escalaDaUiMudou` → perturbar, então `assentar()` funciona depois).
 * O import é o MESMO módulo que a UI consome (o dev server serve o
 * fonte; precedente: o atlasRig e a lib da busca no busca-smoke), logo
 * não nasce segunda cópia do estado.
 *
 * F5a do item 113: onde a navegação só variava `?ui=` (ou o tamanho da
 * janela), a recarga virou mudança viva — como no produto, onde o painel
 * troca o texto sem recarregar. CADA FAMÍLIA mantém UMA navegação
 * boot-por-URL com `?ui=` na porta: é ela que segue provando o contrato
 * "a UI vive na URL, nunca no storage".
 */
async function trocarUiAoVivo(s, fator) {
  await s.js(
    "(() => { if (!window.__uiScale) import('/src/lib/uiScale.ts').then((m) => { window.__uiScale = m; }); })()"
  );
  await esperarPor(s, 'Boolean(window.__uiScale)');
  await s.js(
    `(() => { window.__uiScale.aplicarEscalaDaUi(${fator}); window.__director.escalaDaUiMudou(); })()`
  );
}

/**
 * TROCA A VIEWPORT AO VIVO: o override do CDP dispensa recarga — o app
 * responde pelo ouvinte de resize (engine.onResize → perturbar) e o CSS
 * reflui sozinho. A espera é por ESTADO: o documento VIU o tamanho novo.
 */
async function mudarJanela(s, w, h, mobile = false) {
  await s.send('Emulation.setDeviceMetricsOverride', {
    width: w, height: h, deviceScaleFactor: 1, mobile,
  });
  await esperarPor(s, `window.innerWidth === ${w} && window.innerHeight === ${h}`);
}

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
    '.controls-bar', '.atlas-ficha', '.atlas-selo', '.atlas-tempo',
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
  await dorme(150);

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
  await dorme(150);
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
 *  5. no aparelho de 390×844 com texto em 140%, nada encolhe: o véu
 *     transborda e ROLA, com a tarja inteira no início e o tempo inteiro
 *     no fim (item 87, decisão do dono em 25/08).
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

  // O CASO EXATO QUE ABRIU O ITEM 87. `mobile: true` importa: é a página
  // no aparelho, não só uma janela estreita. A prova cobra as duas
  // extremidades, porque `overflow-y: auto` sozinho ainda deixaria o topo
  // inalcançável se o flex continuasse centralizando conteúdo excedente.
  await s.send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
  });
  await s.ir(`ui=1.4&${PIN}`);
  const rolagem = await s.js(`(() => {
    const veu = document.querySelector('.veil-intro');
    const topo = document.querySelector('.veil-intro .title-kicker');
    const rodape = document.querySelector('.veil-intro .journey-runtime');
    const caixa = (e) => { const r = e.getBoundingClientRect(); return {
      topo: r.top, base: r.bottom,
    }; };
    const inicio = {
      scrollTop: veu.scrollTop,
      topo: caixa(topo),
      rodape: caixa(rodape),
    };
    veu.scrollTop = veu.scrollHeight;
    const fim = {
      scrollTop: veu.scrollTop,
      topo: caixa(topo),
      rodape: caixa(rodape),
    };
    return {
      altura: veu.clientHeight,
      conteudo: veu.scrollHeight,
      overflowY: getComputedStyle(veu).overflowY,
      inicio,
      fim,
    };
  })()`);
  conferir(
    rolagem.overflowY === 'auto' && rolagem.conteudo > rolagem.altura,
    `abertura 390×844 ui=1.4: o véu não encolhe — ${rolagem.conteudo} px de conteúdo`
      + ` em ${rolagem.altura} px, com rolagem ${rolagem.overflowY}`
  );
  conferir(
    rolagem.inicio.scrollTop === 0 && rolagem.inicio.topo.topo >= -1
      && rolagem.inicio.topo.base <= rolagem.altura + 1,
    `abertura 390×844 ui=1.4: a tarja de cima está inteira no início`
      + ` [${rolagem.inicio.topo.topo.toFixed(1)}, ${rolagem.inicio.topo.base.toFixed(1)}]`
  );
  conferir(
    rolagem.fim.scrollTop > 0 && rolagem.fim.rodape.topo >= -1
      && rolagem.fim.rodape.base <= rolagem.altura + 1,
    `abertura 390×844 ui=1.4: a rolagem alcança o rodapé inteiro`
      + ` [${rolagem.fim.rodape.topo.toFixed(1)}, ${rolagem.fim.rodape.base.toFixed(1)}]`
  );
  await s.send('Emulation.clearDeviceMetricsOverride');

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
 * A GAVETA DE CAMADAS, nos DOIS modos (item 61, 22/08).
 *
 * O que ela era: seis linhas no Atlas, enquanto as MESMAS camadas
 * viviam também no painel de Ajustes, todas as dezessete de então, em
 * qualquer fase.
 * Palavras do dono: *"atlas - camadas e ajustes concorrem"*. Agora a
 * porta é uma só, e é esta — então ela tem de existir onde o painel
 * existia, e mostrar a tabela INTEIRA.
 *
 * As três cobranças, e cada uma mede uma promessa da tela:
 *  1. AS 19 (item 77, 23/08, trouxe as linhas de órbita; item 82,
 *     24/08, os nomes na tela), todas com rótulo — uma caixa sem nome
 *     é um controle que ninguém sabe o que faz, e era assim que as
 *     quatro só-URL viviam antes do item 33;
 *  2. TRÊS FAMÍLIAS que repartem as 19 sem sobra, cada uma com nome
 *     acessível próprio (`role="group"` + `aria-label`): quem ouve a
 *     tela recebe o mapa, não dezenove caixas em fila;
 *  3. A CONTAGEM DIZ A VERDADE — o "n/m" do título bate com as caixas
 *     realmente marcadas. Número decorado seria a gaveta contando outra
 *     coisa que não a cena, que é a doença que o selo existe para não
 *     ter.
 *
 * A quarta promessa — desligar uma camada MOVE O SELO — mora no bloco
 * do selo, que é de quem ela fala.
 *
 * Assume a página já na fase certa (roda depois do `julgarPagina`), e
 * devolve a gaveta FECHADA como a encontrou.
 */
async function julgarGavetaDeCamadas(s, onde) {
  await s.js("document.querySelector('[data-abre-dialogo=\"camadas\"]').click()");
  await dorme(200);
  const g = await s.js(`(() => {
    const d = document.querySelector('[data-dialogo="camadas"]');
    if (!d) return null;
    const linha = '.atlas-gaveta-linha';
    return {
      caixas: d.querySelectorAll(linha + ' input[type=checkbox]').length,
      semNome: [...d.querySelectorAll(linha)]
        .filter((l) => !l.textContent.trim()).length,
      familias: [...d.querySelectorAll('.atlas-gaveta-familia')].map((f) => ({
        rotulo: f.getAttribute('aria-label') || '',
        papel: f.getAttribute('role') || '',
        conta: (f.querySelector('.atlas-gaveta-conta') || {}).textContent || '',
        linhas: f.querySelectorAll(linha).length,
        ligadas: [...f.querySelectorAll('input[type=checkbox]')]
          .filter((i) => i.checked).length,
      })),
    };
  })()`);
  if (!g) {
    conferir(false, `${onde} · camadas: a gaveta não abriu`);
    return;
  }
  conferir(
    g.caixas === N_CAMADAS && g.semNome === 0,
    `${onde} · camadas: ${g.caixas} caixas na gaveta, ${g.semNome} sem rótulo`
  );
  const soma = g.familias.reduce((n, f) => n + f.linhas, 0);
  conferir(
    g.familias.length === 3 && soma === N_CAMADAS
      && g.familias.every((f) => f.papel === 'group' && f.rotulo),
    `${onde} · camadas: três famílias repartem as ${soma}`
      + ` — ${g.familias.map((f) => f.rotulo || '(sem nome)').join(' · ')}`
  );
  const mentem = g.familias.filter((f) => f.conta !== `${f.ligadas}/${f.linhas}`);
  conferir(
    mentem.length === 0,
    `${onde} · camadas: a contagem de cada família bate com as caixas marcadas`
      + ` (${g.familias.map((f) => f.conta).join(' · ')})`
      + (mentem.length ? ` — mente em ${mentem.map((f) => f.rotulo).join(', ')}` : '')
  );
  await s.teclar('Escape');
  await dorme(150);
}

/**
 * O CHROME DO FILME SOME SOZINHO (item 61, 22/08).
 *
 * A resposta do dono aos mockups, em duas palavras: *"2) somem
 * sozinhos"*. As quatro promessas, e cada uma é um caso da tela:
 *  1. COM O FILME CORRENDO, três segundos parado e o chrome sai — a
 *     barra de controles e a barra de capítulos em opacidade 0;
 *  2. SEM MEXER NA CAIXA: a mesma largura e a mesma altura de antes. A
 *     altura da barra alimenta `--barra-fim` e o retângulo que os
 *     rótulos contornam; tirá-la do fluxo daria um pulo na geometria do
 *     HUD no meio do filme;
 *  3. E SEM COMER O CLIQUE: `pointer-events: none` enquanto invisível,
 *     nos filhos também — a barra é uma caixa `fixed` que recebe
 *     ponteiro em toda a área mesmo transparente;
 *  4. VOLTA AO PRIMEIRO GESTO, e PAUSADO NUNCA SOME.
 *
 * E o que NÃO some: a LEGENDA do beat, que é conteúdo. Um gate que só
 * medisse o desaparecimento passaria com a tela inteira apagada.
 *
 * O relógio é o de PAREDE, não o do filme: sob `?shot=1` o tempo da
 * viagem congela, e a espera aqui é `dorme()` de verdade. O `?shot=1`
 * também mata as transições, então a opacidade medida é 0 ou 1 — nunca
 * um meio-termo de crossfade.
 */
async function julgarChromeDoFilme(s) {
  const MEDIR = `(() => {
    const ler = (sel) => {
      const e = document.querySelector(sel);
      if (!e) return null;
      const cs = getComputedStyle(e);
      const b = e.getBoundingClientRect();
      return {
        opacidade: Number(cs.opacity),
        ponteiro: cs.pointerEvents,
        classe: typeof e.className === 'string' ? e.className : '',
        caixa: Math.round(b.width) + 'x' + Math.round(b.height),
      };
    };
    return {
      barra: ler('.controls-bar'),
      trilho: ler('.progress-wrap'),
      // o RODAPÉ do filme, que é onde a legenda do beat e a dica do
      // pausar-e-olhar moram: ele existe em toda a fase 'journey', e a
      // legenda vai e vem com a janela do roteiro — medir a legenda
      // seria medir o corte, não o chrome
      rodape: ler('.filme-rodape'),
      pausado: window.__director.pausado,
      fase: window.__director.captura.fase,
    };
  })()`;
  // A ESPERA, com folga de meio segundo para o relógio do navegador
  const PARADO = 3600;

  // ---- 1. PAUSADO: o chrome fica, e fica para sempre ---------------
  // `?t=` sozinho congela a viagem (contrato das capturas), então esta
  // é a tela de quem apertou pausa.
  await s.ir(`t=100&${PIN}`);
  const pausadoAntes = await s.js(MEDIR);
  await dorme(PARADO);
  const pausadoDepois = await s.js(MEDIR);
  conferir(
    pausadoAntes.pausado === true && pausadoDepois.barra.opacidade === 1
      && pausadoDepois.trilho.opacidade === 1,
    `chrome do filme PAUSADO: ${PARADO} ms parado e a barra segue em`
      + ` ${pausadoDepois.barra.opacidade} (trilho ${pausadoDepois.trilho.opacidade})`
  );

  // ---- 2. CORRENDO: some depois de 3 s ------------------------------
  // o Espaço é o gesto do visitante para retomar, e passa pelo MESMO
  // caminho do botão (`useAtalhos` → `togglePause` → o estado do React)
  const ESPACO = {
    key: ' ', code: 'Space', windowsVirtualKeyCode: 32,
    nativeVirtualKeyCode: 32, text: ' ', unmodifiedText: ' ',
  };
  await s.send('Input.dispatchKeyEvent', { ...ESPACO, type: 'keyDown' });
  await s.send('Input.dispatchKeyEvent', { ...ESPACO, type: 'keyUp' });
  await dorme(300);
  const correndo = await s.js(MEDIR);
  conferir(
    correndo.pausado === false && correndo.fase === 'journey'
      && correndo.barra.opacidade === 1,
    `chrome do filme: o Espaço retomou a viagem e a barra está na tela`
      + ` (pausado ${correndo.pausado}, opacidade ${correndo.barra.opacidade})`
  );
  await dorme(PARADO);
  const sumiu = await s.js(MEDIR);
  conferir(
    sumiu.barra.opacidade === 0 && sumiu.trilho.opacidade === 0,
    `chrome do filme: ${PARADO} ms sem gesto e ele SAI — barra`
      + ` ${sumiu.barra.opacidade}, trilho ${sumiu.trilho.opacidade}`
  );
  conferir(
    sumiu.barra.caixa === correndo.barra.caixa
      && sumiu.trilho.caixa === correndo.trilho.caixa,
    `chrome do filme: a CAIXA fica onde estava (barra ${sumiu.barra.caixa},`
      + ` trilho ${sumiu.trilho.caixa}) — a altura dela é geometria do HUD`
  );
  conferir(
    sumiu.barra.ponteiro === 'none' && sumiu.trilho.ponteiro === 'none'
      && /hud-sumido/.test(sumiu.barra.classe),
    `chrome do filme: invisível não come o clique no céu`
      + ` (pointer-events ${sumiu.barra.ponteiro}/${sumiu.trilho.ponteiro})`
  );
  conferir(
    sumiu.rodape !== null && sumiu.rodape.opacidade === 1
      && !/hud-sumido/.test(sumiu.rodape.classe),
    `chrome do filme: o RODAPÉ (legenda + dica) não é chrome e continua na`
      + ` tela — opacidade ${sumiu.rodape?.opacidade}, classe`
      + ` "${sumiu.rodape?.classe}"`
  );

  // ---- 3. O PRIMEIRO GESTO TRAZ DE VOLTA ---------------------------
  // um movimento de ponteiro de verdade, que é o gesto mais barato que
  // o visitante faz — e o que um `click` faria de diferente (mexer na
  // cena) não é o que se mede aqui
  await s.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: 600, y: 450, buttons: 0, pointerType: 'mouse',
  });
  await dorme(300);
  const voltou = await s.js(MEDIR);
  conferir(
    voltou.barra.opacidade === 1 && voltou.trilho.opacidade === 1
      && voltou.barra.ponteiro !== 'none',
    `chrome do filme: o primeiro movimento do ponteiro o traz de volta`
      + ` (${voltou.barra.opacidade}, pointer-events ${voltou.barra.ponteiro})`
  );
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
  await dorme(150);
  // digitação de VERDADE (tecla a tecla, com código nativo): é o único
  // caminho que passa pelo mesmo `onChange` que o visitante usa
  await s.digitar('tau');
  await dorme(300);

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
  // ESPERA MEDIDA e não `dorme` fixo: o Enter dispara trabalho de
  // câmera antes do fechamento, e no Atlas o quadro custa ~100 ms
  // (1200×900 com a galáxia inteira). Um prazo cego aqui é gate que
  // acende vermelho por carga da máquina — e, o que é pior, que acende
  // verde quando a máquina está rápida e o defeito existe.
  const alvo = subiu.nomes[1];
  await s.teclar('Enter');
  const fechouEm = await esperarPor(s, "!document.querySelector('[data-dialogo=\"busca\"]')");
  conferir(fechouEm !== null, `busca: Enter fecha a paleta (em ${fechouEm} ms)`);
  // PARA ONDE O FOCO VAI, e ele MUDOU DE DESTINO no item 74 — de
  // propósito, e é a mudança certa. Até 22/08 a paleta devolvia o foco ao
  // "⌕ Buscar" porque não havia nada para onde entregá-lo; agora escolher
  // um alvo ABRE A FICHA dele, e o foco passa ao diálogo NOVO, como manda
  // qualquer padrão de diálogo: quem escolheu quer ler o que escolheu, não
  // voltar ao botão de procurar.
  //
  // A promessa que continua de pé, e é ela que se cobra aqui, é que o foco
  // NÃO SE PERDE: ele tem de acabar DENTRO de um diálogo aberto, nunca no
  // `<body>` — que é onde ele cai quando um gatilho desmonta junto com a
  // peça. As quatro promessas do diálogo novo (entra, fica preso, Esc
  // fecha, volta ao gatilho) são cobradas de ponta a ponta em
  // `julgarDialogo`, na ficha como em qualquer outro.
  const foiParaAFicha = await esperarPor(
    s,
    "Boolean(document.querySelector('.atlas-ficha')"
      + ' && document.querySelector(\'.atlas-ficha\').contains(document.activeElement))'
  );
  const comOFoco = await s.js(
    "document.activeElement.tagName + ' [' + (document.activeElement.innerText||'').trim().slice(0, 24) + ']'"
  );
  conferir(
    foiParaAFicha !== null,
    `busca: e o foco passa para a FICHA do alvo escolhido (em ${foiParaAFicha} ms; com o foco: ${comOFoco})`
  );
  // O QUE ANUNCIA O ALVO é o cabeçalho da FICHA, que abre sozinha com a
  // seleção — inclusive para estrela.
  const contexto = await s.js(
    "(document.querySelector('.atlas-ficha-nome') || {}).textContent || ''"
  );
  conferir(
    contexto === alvo,
    `busca: o Enter enquadrou a opção ESCOLHIDA ("${alvo}" → na ficha "${contexto}")`
  );
}

/**
 * AS DUAS FERRAMENTAS DO ATLAS, e a saída que só existe quando há para
 * onde voltar (item 61, 23/08).
 *
 * A frase do dono que virou código: *"o modo atlas na minha visão deveria
 * ser o modo único, a viagem na verdade para mim é só uma ferramenta do
 * modo atlas"*. Até aqui a barra do Atlas tinha UMA porta — "Partir" —, e
 * "Partir" sem filme atrás devolvia a TELA DE TÍTULO: o modo confessando
 * ser o secundário. Agora ele oferece ▶ Ver o filme e ↗ Explorar, e a
 * saída ↩ Voltar ao filme só monta quando o portal guardou um instante.
 *
 * O QUE SE COBRA: os rótulos, a ORDEM do Tab (a barra é o que ela lê), a
 * ausência da saída sem filme guardado e a presença dela com filme, e —
 * no telefone — que a barra de cima continue UMA linha. Esta última não é
 * estética: a altura dessa barra É o topo declarado do retângulo útil
 * (`SAIDA_FRACAO`, desde que a tarja saiu do telefone em 24/08), e uma
 * barra que cresce move a câmera calada.
 */
async function julgarFerramentasDoAtlas(s) {
  const LER = `JSON.stringify([...document.querySelectorAll('.controls-bar button')]
    .map((b) => b.textContent.trim()))`;
  const ALTURA = `(() => { const b = document.querySelector('.controls-bar');
    if (!b) return null; const r = b.getBoundingClientRect();
    const tops = new Set([...b.querySelectorAll('button')]
      .map((x) => Math.round(x.getBoundingClientRect().top)));
    return { h: +r.height.toFixed(1), linhas: tops.size }; })()`;

  // 1. SEM FILME ATRÁS (o `?atlas=1` puro, que é a porta da abertura)
  await s.ir(`atlas=1&foco=terra&${PIN}`);
  await s.assentar();
  const semFilme = JSON.parse(await s.js(LER));
  conferir(
    semFilme.includes('▶ Ver o filme') && semFilme.includes('↗ Explorar'),
    `atlas: as duas ferramentas estão na barra (${semFilme.join(' · ')})`
  );
  conferir(
    !semFilme.some((t) => t.includes('Voltar ao filme')),
    'atlas sem filme guardado: NÃO oferece "↩ Voltar ao filme" — não há para onde voltar'
  );
  // e a ORDEM do Tab é a da tela, como manda a casa
  const ordem = JSON.parse(await s.js(
    `JSON.stringify([...document.querySelectorAll('.controls-bar button')]
      .map((b) => ({ t: b.textContent.trim(), x: Math.round(b.getBoundingClientRect().left) })))`
  ));
  const porTela = [...ordem].sort((a, b) => a.x - b.x).map((b) => b.t);
  conferir(
    JSON.stringify(porTela) === JSON.stringify(ordem.map((b) => b.t)),
    `atlas: o Tab anda na ordem da tela (${porTela.join(' → ')})`
  );

  // 2. COM FILME ATRÁS — o portal do pausar-e-olhar
  await s.ir(`t=100&${PIN}`);
  await s.js('window.__director.entrarNoAtlas()');
  await s.assentar();
  const comFilme = JSON.parse(await s.js(LER));
  conferir(
    comFilme.some((t) => t.includes('Voltar ao filme')),
    `atlas vindo do filme: a saída existe e diz para onde vai (${comFilme.join(' · ')})`
  );

  // 3. O FIM DO FILME oferece "Ficar aqui" — a coda vira Atlas na pose.
  // A fase `end` não se alcança por `?t=`: ela é o roteiro CHEGANDO ao
  // fim, então o juiz solta o relógio meio segundo antes e ESPERA a fase
  // (nunca um número de ms — a régua da casa).
  await s.ir(`t=192.5&play=1&${PIN}`);
  const chegou = await esperarPor(s, "window.__director.captura.fase === 'end'", 15000);
  conferir(chegou !== null, `o filme chega ao fim e a fase vira 'end' (${chegou} ms)`);
  const noFim = JSON.parse(await s.js(
    `JSON.stringify([...document.querySelectorAll('.veil-end button')]
      .map((b) => b.textContent.trim()))`
  ));
  conferir(
    noFim.includes('Ficar aqui'),
    `o véu do fim oferece as TRÊS saídas (${noFim.join(' · ')})`
  );
  // ...e ela LEVA a câmera: entrar dali pousa na pose da coda, não na
  // vista de abertura a 224 UA
  const antesDoFim = JSON.parse(await s.js(
    'JSON.stringify(window.__director.engine.camera.position.toArray())'
  ));
  await s.js("[...document.querySelectorAll('.veil-end button')]"
    + ".find((b) => b.textContent.trim() === 'Ficar aqui').click()");
  await s.assentar();
  const depoisDoFim = JSON.parse(await s.js(
    'JSON.stringify(window.__director.engine.camera.position.toArray())'
  ));
  const raio = Math.hypot(...antesDoFim);
  const desvio = Math.hypot(...antesDoFim.map((v, i) => v - depoisDoFim[i]));
  conferir(
    (await s.js('window.__director.captura.fase')) === 'atlas' && desvio / raio < 1e-9,
    `"Ficar aqui" entra no Atlas NA POSE da coda — desvio`
      + ` ${(desvio / raio).toExponential(2)} do raio, degrau`
      + ` '${await s.js('window.__director.escadaViva.degrau')}'`
  );

  // 4. O TELEFONE: a barra de cima continua UMA linha nos quatro cantos
  for (const [w, h] of [[390, 844], [320, 568]]) {
    for (const ui of [1, 1.4]) {
      await s.send('Emulation.setDeviceMetricsOverride', {
        width: w, height: h, deviceScaleFactor: 1, mobile: true,
      });
      await s.ir(`atlas=1&ui=${ui}&${PIN}`);
      await s.assentar();
      const m = await s.js(ALTURA);
      conferir(
        m !== null && m.linhas === 1,
        `${w}×${h} ui=${ui}: a barra do Atlas é UMA linha (${m ? m.linhas : '?'} linha(s),`
          + ` ${m ? m.h : '?'} px) — ela é o topo do modo e a altura dela é o topo declarado`
      );
    }
  }
  await s.send('Emulation.clearDeviceMetricsOverride');
}

const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
if (!ping.includes('<div id="root"')) throw new Error(`dev server não respondeu em ${APP}`);

// O VIGIA DA ABA DA FRENTE vem DE GRAÇA com a sessão desde 30/08: ele
// nasceu aqui (é este o juiz mais longo da casa, e foi nele que a aba
// `chrome://settings/help` do Chrome desatualizado roubou o primeiro
// plano duas vezes) e mudou para `abrirSessao` no mesmo dia — a intrusa
// é do navegador, não deste juiz. A doutrina inteira e o que foi medido
// estão na docstring dele em `chrome.mjs`.
const sessao = await abrirSessao({ janela: JANELA, app: APP, prefixo: 'a11y' });
try {
  // A ABERTURA, que é por onde o visitante entra — e que este juiz não
  // abria (item 60).
  await julgarAbertura(sessao);

  // O FILME PAUSADO: é lá que o painel de Ajustes sempre viveu, e é a
  // prova de que a reforma do D7 não é privilégio do modo novo.
  await julgarPagina(sessao, 't=100', 'journey');
  // …e a GAVETA DE CAMADAS existe AQUI desde o item 61: era o painel de
  // Ajustes que servia as camadas ao filme, e com elas fora dele o filme
  // ficaria sem nenhuma se a gaveta fosse só do Atlas.
  await julgarGavetaDeCamadas(sessao, 'journey');
  // …e o CHROME do filme, que some sozinho desde o item 61 — esta é a
  // única prova da casa que roda com o relógio da viagem SOLTO.
  await julgarChromeDoFilme(sessao);

  // AS DUAS FERRAMENTAS DO ATLAS e a saída condicional (item 61, 23/08).
  await julgarFerramentasDoAtlas(sessao);

  // O ATLAS: os diálogos do modo novo, pelo mesmo contrato. Com `?foco=` de
  // propósito desde o item 74 — a ficha do objeto é o quarto diálogo e só
  // existe quando há SELEÇÃO, e sem ela o juiz não teria o que abrir.
  const vivasAtlas = await julgarPagina(sessao, 'atlas=1&foco=terra', 'atlas');
  await julgarGavetaDeCamadas(sessao, 'atlas');
  conferir(
    vivasAtlas.some((r) => r.papel === 'status' && r.v === 'polite' && r.texto),
    'atlas: há região viva com role="status" e texto'
      + ` (${vivasAtlas.map((r) => `${r.papel || '—'}:"${r.texto}"`).join(' · ')})`
  );

  // A REGIÃO VIVA É VIVA MESMO: mudar o foco do Atlas muda o que ela
  // anuncia. Sem esta prova, um `aria-live` sobre texto imóvel passaria
  // como acessibilidade — é o modo educado de não dizer nada.
  // A FICHA PRECISA ESTAR ABERTA para ser lida, e a prova da gaveta de
  // camadas, logo acima, a fechou — é o que "uma gaveta de cada vez"
  // significa, e é comportamento de produto, não defeito. Reabri-la pelo
  // gatilho é o gesto do visitante.
  await sessao.js(`(() => {
    const b = document.querySelector('[data-abre-dialogo="ficha"]');
    if (b && b.getAttribute('aria-expanded') !== 'true') b.click();
  })()`);
  await dorme(200);
  const antes = await sessao.js(
    "(document.querySelector('.atlas-ficha-nome')||{}).textContent||''"
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
      "(document.querySelector('.atlas-ficha-nome')||{}).textContent||''"
    );
    conferir(
      Boolean(antes) && depois !== antes,
      `atlas: o nome na ficha MUDA com o foco ("${antes}" → "${depois}")`
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
    await dorme(1200);
    await sessao.assentar();
    const seloLonge = await sessao.js(`(() => {
      const s = window.__director.selo;
      return JSON.stringify({ pc: s.distanciaPc });
    })()`);
    const longe = JSON.parse(seloLonge);
    // a LINHA FECHADA é o que está na tela desde o item 61: os dois
    // eixos numa frase só, sem precisar abrir nada
    const escalaLonge = await sessao.js(
      "document.querySelector('.atlas-selo-resumo').innerText.replace(/\\n/g, ' ')"
    );
    conferir(
      longe.pc > 1 && escalaLonge.includes('FORA DE ESCALA'),
      `atlas: depois de visitar, o selo declara a vista NOVA — ${longe.pc.toFixed(1)} pc,`
        + ` "${escalaLonge}"`
    );
  }
  // ---- o selo de honestidade (D1), DOBRADO EM UMA LINHA (item 61) --
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
  //
  // O QUE MUDOU EM 22/08 (item 61): o selo FECHA. O que está na tela o
  // tempo inteiro é UMA linha — os dois eixos, a bolinha do pior deles e
  // a seta —, e o resto (a tese, as duas linhas-controle, os culpados e a
  // procedência) mora numa gaveta que sobe ao clique. As cobranças de
  // sempre passam a valer sobre a gaveta ABERTA; as novas são sobre a
  // linha fechada: ela nomeia os dois eixos sem abrir nada, declara
  // `aria-expanded`, mede UMA linha de altura, e a gaveta de CAMADAS não
  // pode mais cobri-la.
  // volta ao ENQUADRAMENTO DE ABERTURA: a prova do selo é sobre a vista
  // com que o Atlas abre, e a prova acima deixou a câmera numa estrela
  await sessao.ir(`atlas=1&${PIN}`);

  /** o que a LINHA FECHADA diz — o único texto do selo que fica na tela */
  const lerResumo = () => sessao.js(`(() => {
    const r = document.querySelector('.atlas-selo-resumo');
    if (!r) return null;
    const b = r.getBoundingClientRect();
    return {
      texto: r.innerText.replace(/\\n/g, ' ').replace(/\\s+/g, ' ').trim(),
      expandido: r.getAttribute('aria-expanded'),
      controla: r.getAttribute('aria-controls'),
      alto: Math.round(b.height),
      largo: Math.round(b.width),
      // com o selo fechado NÃO pode haver linha-controle na tela: elas
      // são o conteúdo da gaveta, e vê-las fechado seria o selo aberto
      // com outro nome
      linhasNaTela: document.querySelectorAll('.atlas-selo-linha').length,
      ui: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui')) || 1,
    };
  })()`);

  /** abre a gaveta do selo (se já não estiver) e lê o que ela mostra */
  const abrirSelo = async () => {
    if (!(await sessao.js("document.querySelector('.atlas-selo-detalhe') !== null"))) {
      await sessao.js("document.querySelector('.atlas-selo-resumo').click()");
      await dorme(200);
    }
    return sessao.js(`(() => {
      const d = document.querySelector('.atlas-selo-detalhe');
      if (!d) return null;
      const [escala, brilho] = [...d.querySelectorAll('.atlas-selo-linha')];
      return {
        escala: escala.querySelector('strong').textContent,
        brilho: brilho.querySelector('strong').textContent,
        detalhe: brilho.querySelector('em').textContent,
        brilhoClicavel: !brilho.disabled,
        escalaClicavel: !escala.disabled,
        culpados: [...d.querySelectorAll('.atlas-selo-culpados li')]
          .map((e) => e.textContent),
        tudo: d.innerText.replace(/\\n/g, ' '),
      };
    })()`);
  };

  // 1. A LINHA FECHADA. Ela é o selo para quem só olha: os dois eixos
  //    numa frase, e a promessa de que há mais atrás dela.
  const fechado = await lerResumo();
  conferir(
    fechado !== null && /ESCALA REAL/.test(fechado.texto)
      && /BRILHO ASSISTIDO/.test(fechado.texto),
    `selo fechado: uma linha com os dois eixos — "${fechado?.texto}"`
  );
  conferir(
    fechado !== null && fechado.expandido === 'false'
      && fechado.controla === 'atlas-selo-detalhe' && fechado.linhasNaTela === 0,
    `selo fechado: aria-expanded="${fechado?.expandido}", aria-controls`
      + `="${fechado?.controla}", ${fechado?.linhasNaTela} linha(s)-controle na tela`
  );

  // 2. ABERTO: tudo que o selo dizia antes continua sendo dito, e é
  //    aqui que se cobra.
  const inicial = await abrirSelo();
  // DESDE O M2 a abertura do Atlas declara o BRILHO ASSISTIDO: a política
  // de luz dos corpos nasce `assistida` (Onda 6, D2), com a copy leiga no
  // detalhe do selo. Um Atlas que abrisse dizendo BRILHO REAL sobre uma
  // imagem tratada seria o selo mentindo — que é o defeito que ele
  // existe para não ter. (A GRADAÇÃO POR CONTEXTO da era F6 morreu no
  // M1 — o vigia dela mudou de alvo, logo abaixo.)
  //
  // A COPY MUDOU NO ITEM 91 (25/08), e este vigia muda com ela. Ele pinava
  // `faixa comprimida`, que era a copy da lei do PONTO — e o ponto nunca
  // passou por esta política. Quem `assistida` governa é o GLOBO visitado,
  // e a frase nova diz o que ele realmente faz. Pinar a frase, e não só o
  // rótulo do eixo, continua sendo o certo: é o texto que o visitante lê
  // que precisa envelhecer junto com a lei.
  conferir(
    inicial !== null && inicial.escala === 'ESCALA REAL'
      && inicial.brilho === 'BRILHO ASSISTIDO'
      && /exposto para a luz que ELE recebe/.test(inicial.detalhe),
    `selo aberto na abertura: "${inicial?.escala}" · "${inicial?.brilho}" — ${inicial?.detalhe}`
  );
  const aberto = await lerResumo();
  conferir(
    aberto !== null && aberto.expandido === 'true' && aberto.linhasNaTela === 2,
    `selo aberto: aria-expanded="${aberto?.expandido}" e as DUAS linhas-controle na tela`
      + ` (${aberto?.linhasNaTela})`
  );
  // A ASSISTÊNCIA NOVA DO ATLAS É DECLARADA ONDE O VISITANTE LÊ (M2 +
  // a dose por fase de 17/08): o rodapé de proveniência do selo NOMEIA
  // o clarão como artístico. E a gradação morta não pode ressuscitar no
  // estado — o vigia de CÓDIGO é simbolosProibidos.test; este é o de
  // runtime (item 48).
  const gradacaoMorta = await sessao.js('String(window.__director.selo.gradacao)');
  conferir(
    /artístico:.*clarão/.test(inicial.tudo) && gradacaoMorta === 'undefined',
    'selo: o rodapé declara o clarão como artístico, e a gradação segue morta'
  );
  conferir(
    inicial.brilhoClicavel && !inicial.escalaClicavel,
    'selo: a linha com o que desfazer é controle; a que está em real, não'
  );

  // 3. AS TRÊS SAÍDAS da gaveta: a própria linha, Esc e clique fora.
  await sessao.js("document.querySelector('.atlas-selo-resumo').click()");
  await dorme(200);
  const porClique = await lerResumo();
  // ENTER de verdade: `sessao.teclar` manda `rawKeyDown`, que dispara o
  // evento e NÃO executa a ação padrão do navegador — com ele um
  // `<button>` nunca é ativado pelo teclado, e a prova passaria a medir o
  // harness em vez do HUD. `keyDown` com `text` é o Enter que o Chrome
  // entrega a um controle nativo.
  const ENTER = {
    key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r',
  };
  await sessao.js("document.querySelector('.atlas-selo-resumo').focus()");
  await sessao.send('Input.dispatchKeyEvent', { ...ENTER, type: 'keyDown' });
  await sessao.send('Input.dispatchKeyEvent', { ...ENTER, type: 'keyUp' });
  await dorme(200);
  const porEnter = await lerResumo();
  // ESC NÃO PODE FAZER DUAS COISAS: dentro do Atlas ele também sobe um
  // degrau da escada (`useAtalhos`), e um Esc que fechasse a gaveta E
  // movesse a câmera junto seria um gesto com dois donos. Por isso a
  // distância é medida dos dois lados da tecla.
  const antesDoEsc = await sessao.js('window.__director.selo.distanciaPc');
  await sessao.teclar('Escape');
  await dorme(250);
  const porEsc = await lerResumo();
  const depoisDoEsc = await sessao.js('window.__director.selo.distanciaPc');
  conferir(
    porClique.expandido === 'false' && porEnter.expandido === 'true'
      && porEsc.expandido === 'false',
    'selo: a linha fecha no clique, abre no Enter e fecha no Esc'
      + ` (${porClique.expandido} → ${porEnter.expandido} → ${porEsc.expandido})`
  );
  conferir(
    antesDoEsc === depoisDoEsc,
    `selo: o Esc que fecha a gaveta NÃO sobe a escada — a vista fica em`
      + ` ${Number(depoisDoEsc).toFixed(6)} pc (era ${Number(antesDoEsc).toFixed(6)})`
  );
  await sessao.js("document.querySelector('.atlas-selo-resumo').click()");
  await dorme(150);
  await sessao.clicar(60, Math.round(0.5 * 900));
  await dorme(250);
  const porFora = await lerResumo();
  conferir(
    porFora.expandido === 'false',
    `selo: clicar fora fecha a gaveta (aria-expanded="${porFora.expandido}")`
  );

  // 4. OS CONTROLES DE VERDADE: desligar uma camada move o selo, e o
  //    clique na linha BRILHO desfaz.
  await sessao.js("document.querySelector('[data-abre-dialogo=\"camadas\"]').click()");
  await dorme(150);
  // A CAIXA É NOMEADA no veredito: com as 18 na gaveta em três famílias
  // (item 61), "a primeira caixa" deixou de dizer qual camada foi — e
  // veredito que não nomeia o sujeito custa uma sessão de navegador para
  // ser lido.
  const desligada = await sessao.js(`(() => {
    const l = document.querySelector('[data-dialogo="camadas"] .atlas-gaveta-linha');
    l.querySelector('input[type=checkbox]').click();
    return l.textContent.trim();
  })()`);
  await dorme(200);
  const sujo = await abrirSelo();
  conferir(
    sujo.brilho === 'BRILHO ASSISTIDO' && /camada desligada/.test(sujo.detalhe),
    `selo depois de desligar "${desligada}" na gaveta: "${sujo.brilho}" — ${sujo.detalhe}`
  );
  conferir(sujo.brilhoClicavel, 'selo: com desvio desfazível, a linha BRILHO vira controle');

  await sessao.js(`(() => {
    const [, brilho] = [...document.querySelectorAll('.atlas-selo-detalhe .atlas-selo-linha')];
    brilho.click();
  })()`);
  await dorme(250);
  const voltou = await abrirSelo();
  const resumoDaVolta = await lerResumo();
  const urlLimpa = await sessao.js('location.search');
  const camadasVivas = await sessao.js(
    'JSON.stringify(window.__director.selo.camadasEscondidas)'
  );
  conferir(
    voltou.brilho === 'BRILHO REAL' && camadasVivas === '[]'
      // …e a LINHA FECHADA conta a mesma história: são as duas superfícies
      // do mesmo veredito, e uma que ficasse para trás seria o selo
      // mentindo por atraso (a doença do item 10)
      && /BRILHO REAL/.test(resumoDaVolta.texto),
    `selo: clicar na linha BRILHO volta ao real ("${voltou.brilho}", escondidas=`
      + `${camadasVivas}, linha fechada: "${resumoDaVolta.texto}")`
  );
  conferir(
    !urlLimpa.includes('nocat') && urlLimpa.includes('atlas')
      // a luz tem contrato de default vivo: a volta ESCREVE ?luz=real
      // para sobreviver à recarga (Onda 6, D2). O ?grad= morreu no M1
      // e não pode voltar à URL.
      && urlLimpa.includes('luz=real') && !urlLimpa.includes('grad'),
    `selo: a volta limpa a porta, escreve a luz e preserva o modo (${urlLimpa})`
  );

  // 4b. A PORTA DE DUAS VIAS (decisão 3 do dono, item 91 — 25/08). Até
  //     aqui esta linha só tinha IDA: chegando em BRILHO REAL ela ficava
  //     DESABILITADA, e a única volta à luz assistida era editar `?luz=`
  //     na URL e recarregar. Um selo que é o controle da vista não pode
  //     ser porta de mão única — e este juiz, que já dirigia o selo por
  //     clique, cobria só metade do gesto.
  //
  //     A regra: enquanto sobrar algo a desfazer, o clique desfaz; quando
  //     não sobra mais nada, o MESMO clique devolve a assistência. Aqui a
  //     vista já está limpa (a volta acima desfez a camada e a luz), então
  //     este segundo clique tem de virar o gesto do avesso — AO VIVO, sem
  //     recarga —, e a URL tem de espelhar apagando a chave, porque
  //     `assistida` é o padrão e a URL desta casa é espelho, não painel.
  conferir(
    voltou.brilhoClicavel,
    'selo: em BRILHO REAL a linha CONTINUA sendo controle — é a volta que não existia'
  );
  await sessao.js(`(() => {
    const [, brilho] = [...document.querySelectorAll('.atlas-selo-detalhe .atlas-selo-linha')];
    brilho.click();
  })()`);
  await dorme(250);
  const reassistido = await abrirSelo();
  const resumoDaReassistencia = await lerResumo();
  const urlDaVolta = await sessao.js('location.search');
  const luzViva = await sessao.js('String(window.__director.selo.luz)');
  conferir(
    reassistido.brilho === 'BRILHO ASSISTIDO' && luzViva === 'assistida'
      && /BRILHO ASSISTIDO/.test(resumoDaReassistencia.texto),
    `selo: clicar de novo devolve a luz assistida AO VIVO ("${reassistido.brilho}",`
      + ` director.luz=${luzViva}, linha fechada: "${resumoDaReassistencia.texto}")`
  );
  conferir(
    !urlDaVolta.includes('luz=') && urlDaVolta.includes('atlas'),
    `selo: a URL espelha a volta APAGANDO a chave (o padrão não se escreve) — ${urlDaVolta}`
  );

  // A LINHA-CONTROLE PRÓPRIA da luz — todo caminho que altera o
  // resultado tem de poder ser desligado pelo link: `?luz=real` faz o
  // Atlas abrir com o 1/d² cru nos corpos — e aí o selo diz REAL, que
  // é a verdade daquela vista. (O `?grad=` morreu no M1 junto com a
  // gradação por contexto.) Lido na LINHA FECHADA, que é onde o
  // visitante vê sem clicar.
  await sessao.ir(`atlas=1&luz=real&${PIN}`);
  const semAssistencia = await lerResumo();
  conferir(
    /BRILHO REAL/.test(semAssistencia.texto),
    `?luz=real: o Atlas abre sem assistência e a linha do selo diz "${semAssistencia.texto}"`
  );

  // 5. OS CULPADOS NA TELA (a promessa de 4e8bedb, cumprida em 22/08).
  //    `estadoDoSelo` devolve QUEM está inflado e QUANTO desde então, e
  //    até o item 61 só o teste puro via esse campo — a tela dizia FORA
  //    DE ESCALA e calava. Um selo que acusa sem dizer o quê é aviso
  //    legal, não honestidade. A vista é uma ESTRELA, que é onde a
  //    escala sai do 1:1 do sistema solar.
  await sessao.ir(`foco=sirius&${PIN}`);
  const comCulpado = await abrirSelo();
  const resumoCulpado = await lerResumo();
  conferir(
    comCulpado.escala === 'FORA DE ESCALA' && comCulpado.culpados.length > 0
      && /Sagittarius/.test(comCulpado.culpados[0])
      && /× maior/.test(comCulpado.culpados[0]),
    `selo: fora de escala, a gaveta NOMEIA o culpado — ${comCulpado.culpados.join(' · ')}`
  );
  conferir(
    /FORA DE ESCALA/.test(resumoCulpado.texto) && comCulpado.escalaClicavel,
    `selo: a linha fechada acompanha ("${resumoCulpado.texto}") e a linha ESCALA vira controle`
  );
  // E O CONTRÁRIO: numa vista honesta o selo NÃO acusa ninguém. Acusar
  // onde não há dívida é o erro simétrico ao de calar onde há.
  await sessao.ir(`atlas=1&${PIN}`);
  const semCulpado = await abrirSelo();
  conferir(
    semCulpado.escala === 'ESCALA REAL' && semCulpado.culpados.length === 0,
    `selo: em escala real a lista de culpados nasce vazia (${semCulpado.culpados.length})`
  );

  // ---- O SELO ACOMPANHA O TIER NO ATO (item 10) --------------------
  // A queixa era "o selo pode atrasar até 3 segundos; só atualiza
  // quando a interface redesenha". O redesenho é DISPARADO por todo
  // escritor de insumo do selo desde o corte 6 (onQuality → React) e a
  // F6 (enquadrarAgora move a câmera ANTES de avisar o HUD); medido em
  // 2026-08-18: 1–2 ms entre setQuality e o DOM. Esta prova vigia a
  // FIAÇÃO — um tier que mudasse a imagem sem mover o selo na tela
  // seria o selo mentindo por atraso, que é a doença do item. A gaveta
  // fica ABERTA durante ela: é lá que a lista de desvios mora agora.
  await sessao.js("window.__director.setQuality('alta')");
  const tierNaTela = await esperarPor(
    sessao,
    "document.querySelector('.atlas-selo-detalhe').innerText"
      + ".includes('amostragem abaixo de cinema')"
  );
  conferir(
    tierNaTela !== null && tierNaTela < 1000,
    `selo: a troca de tier aparece na tela no ato (${tierNaTela} ms)`
  );
  await sessao.js("window.__director.setQuality('cinema')");
  const tierVoltou = await esperarPor(
    sessao,
    "!document.querySelector('.atlas-selo-detalhe').innerText.includes('amostragem')"
  );
  conferir(
    tierVoltou !== null,
    `selo: a volta a cinema tira o desvio da tela (${tierVoltou} ms)`
  );

  // ---- A ÁREA DO SELO E A GAVETA QUE PARA ACIMA DELE (item 61) -----
  await julgarAreaDoSelo(sessao);

  // ---- A FICHA DO OBJETO: dobra, cabe e não cobre o selo (item 74) --
  await julgarAreaDaFicha(sessao);

  // ---- O HUD DO CELULAR: as alças no pé e a folha que sobe (item 62) --
  await julgarCelular(sessao, { conferir, medirCobertura, PIN, trocarUiAoVivo });

  // ---- A ESCADA DE NAVEGAÇÃO (F2b/D7) -----------------------------
  // Os dois botões da escada com nome acessível pt-BR, o gesto de descer,
  // o Esc que sobe UM degrau — e a interação declarada com os diálogos:
  // diálogo aberto come o Esc PRIMEIRO.
  //
  // ELES MORAM NO CABEÇALHO DA FICHA DO OBJETO, que abre sozinha com a
  // seleção.
  await sessao.ir(`foco=terra&${PIN}`);
  const escadaBotoes = await sessao.js(`(() => {
    const ctx = document.querySelector('.atlas-ficha-escada');
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
    [...document.querySelectorAll('.atlas-ficha-escada button')]
      .find((b) => /Aproximar/.test(b.getAttribute('aria-label'))).click();
  })()`);
  await sessao.assentar();
  const desceu = await sessao.js(`JSON.stringify({
    ver: window.__director.verDaEscada,
    degrau: window.__director.escadaViva.degrau,
    contexto: (document.querySelector('.atlas-ficha-nome') || {}).textContent,
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
  await dorme(150);
  await sessao.teclar('Escape');
  await dorme(200);
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
    corpoId: window.__director.escadaViva.corpoId,
    ficha: document.querySelector('.atlas-ficha') !== null,
    botaoDaFicha: document.querySelector('[data-abre-dialogo="ficha"]') !== null,
  })`);
  const d3 = JSON.parse(sub2);
  // NO SISTEMA NÃO HÁ SELEÇÃO, logo não há ficha e não há botão para
  // abri-la — é o "nunca chuta" do item 74 medido na tela: a peça inteira
  // não monta, e nada ocupa aquele canto.
  conferir(
    sub1 === 'orbita' && d3.degrau === 'sistema' && d3.corpoId === null
      && !d3.ficha && !d3.botaoDaFicha,
    `escada: Esc sobe um degrau por vez (corpo → '${sub1}' → '${d3.degrau}'), e no sistema a ficha não monta`
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
    await dorme(120);
  }
  const noQuarto = await sessao.js(
    "(document.querySelector('.convite-conta')||{}).innerText||''"
  );
  await sessao.js(`[...document.querySelectorAll('.convite-linha button')]
    .find((b) => b.textContent.trim() === 'entendi').click()`);
  await dorme(200);
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
  // ...e com a LINHA DA ESCADA na tela (F2b): com um corpo em foco a barra
  // carrega o gatilho da ficha e é o estado mais alto do topo — é ELE que a
  // fração declarada tem de cobrir
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
// A ÁREA DO SELO (item 61, 22/08) — a medida que faltava.
//
// A QUEIXA DO DONO era de ÁREA e de invasão: *"o selo de honestidade é
// complexo e nao funciona direito, no proejto atlas ele era muito mais
// simples e menos invasivo"*. O selo de então não fechava — quatro
// blocos permanentes sobre a cena —, e MEDIDO em 22/08 antes da obra:
// 336×93 px (3,19% da tela) a 1200×900, 470×131 (6,32%) com `?ui=1,4`,
// e 359×93 (10,10%) num celular de 390×844.
//
// Nenhum gate media isso: o retângulo útil (`medirCobertura`) cobra
// declarado ≥ medido, ou seja, PERMITE o HUD crescer desde que a
// declaração cresça junto — é detector de câmera enquadrando por baixo
// do texto, não teto de invasão. Esta prova é o teto que faltava.
//
// AS DUAS COBRANÇAS:
//  1. FECHADO É UMA LINHA. `TETO_DA_LINHA_PX` é o teto em pixels de CSS
//     em `ui = 1`, multiplicado pelo fator — a linha mede ~16 px ali
//     (14 em 0,85 e 23 em 1,4: ~16,5 px por unidade de ui), e uma
//     segunda linha custaria ~32. O teto de 24 passa folgado numa linha
//     e não tem como passar em duas, que é exatamente o que ele vigia.
//  2. A GAVETA DE CAMADAS NÃO COBRE O SELO. Retângulos que não se
//     intersectam, com a gaveta ABERTA — o defeito que o mockup do dono
//     acusou (artboard 3: a gaveta por cima, a frase do selo cortada em
//     "…"), medido a 768×600 com `?ui=1,4`: gaveta y 160–432 contra selo
//     y 396–556. O conserto é geométrico (`--selo-base`/`--selo-linha`,
//     fatia 1 do HUD), então a prova é geométrica também.
// ============================================================

async function julgarAreaDoSelo(s) {
  const MEDIR = `(() => {
    const W = innerWidth, H = innerHeight;
    const cx = (sel) => {
      const e = document.querySelector(sel);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { x: b.left, y: b.top, w: b.width, h: b.height };
    };
    const selo = cx('.atlas-selo');
    const gaveta = cx('.atlas-gaveta');
    const bate = (p, q) => Boolean(p && q && p.x < q.x + q.w && q.x < p.x + p.w
      && p.y < q.y + q.h && q.y < p.y + p.h);
    return { W, H, selo, gaveta, cobre: bate(gaveta, selo),
      ui: parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue('--ui')) || 1,
      pct: selo ? (selo.w * selo.h) / (W * H) * 100 : null };
  })()`;
  // F5a (item 113): UMA navegação boot-por-URL (a primeira célula, com
  // `?ui=` na porta — o contrato provado) e as outras CINCO células por
  // mudança VIVA: viewport pelo override, escala pelo caminho do painel
  // e a gaveta da célula anterior fechada por Esc, o gesto do visitante.
  let bootou = false;
  for (const fator of [0.85, 1, 1.4]) {
    // 768 px é o piso da faixa declarada (`LARGURA_UTIL_MINIMA_PX`), e
    // 600 de altura com o texto em 140% é o canto em que a gaveta
    // passava por cima do selo — o caso do mockup roda de propósito
    for (const [w, h] of [[1200, 900], [768, 600]]) {
      if (!bootou) {
        await s.send('Emulation.setDeviceMetricsOverride', {
          width: w, height: h, deviceScaleFactor: 1, mobile: false,
        });
        await s.ir(`atlas=1&ui=${fator}&${PIN}`);
        bootou = true;
      } else {
        await s.teclar('Escape');
        await dorme(150);
        await mudarJanela(s, w, h);
        await trocarUiAoVivo(s, fator);
      }
      const fechado = await s.js(MEDIR);
      const onde = `${w}×${h}, ui = ${fator}`;
      const teto = TETO_DA_LINHA_PX * fechado.ui;
      conferir(
        fechado.selo !== null && fechado.selo.h <= teto,
        `selo fechado (${onde}): ${fechado.selo?.h.toFixed(1)} px de altura ≤ teto `
          + `${teto.toFixed(1)} px — UMA linha, e ocupa ${fechado.pct?.toFixed(3)}% da tela`
      );
      await s.js("document.querySelector('[data-abre-dialogo=\"camadas\"]').click()");
      await dorme(250);
      const comGaveta = await s.js(MEDIR);
      const r = (p) => (p ? `[${p.x | 0},${p.y | 0} ${p.w | 0}×${p.h | 0}]` : 'ausente');
      conferir(
        comGaveta.gaveta !== null && !comGaveta.cobre,
        `gaveta aberta (${onde}): NÃO cobre o selo — gaveta ${r(comGaveta.gaveta)}, `
          + `selo ${r(comGaveta.selo)}`
      );
    }
  }
  // fecha a gaveta da última célula — as provas seguintes navegam, mas
  // devolver o estado é higiene de quem mede na mesma sessão
  await s.teclar('Escape');
  await dorme(150);
  // devolve a janela do juiz: as provas seguintes medem nela. LIMPAR
  // basta — a janela real do Chrome é a de `JANELA`, e o override que
  // este bloco pôs é o único que a esconde. Havia aqui um
  // `setDeviceMetricsOverride` para `JANELA` na linha ANTERIOR a este
  // `clear`, ou seja, quatro linhas que o `clear` desfazia no ato.
  await s.send('Emulation.clearDeviceMetricsOverride');
}


/**
 * A FICHA DO OBJETO (item 74) — as promessas que são DELA.
 *
 * As quatro do diálogo (o foco entra, fica preso, Esc fecha, volta ao
 * gatilho) ela ganha de graça, porque nasce no `dialogFocus` como todo
 * diálogo da casa — `julgarPagina` já as cobra. O que se mede aqui é o que
 * nenhum outro juiz cobriria:
 *
 *  1. AS SEÇÕES DOBRAM, e o `aria-expanded` acompanha. Sem isso, quem ouve
 *     a tela recebe um acordeão que não diz se está aberto ou fechado — e a
 *     primeira nasce ABERTA, que é a lição do doador ("live state first"):
 *     abrir a ficha e ver quatro títulos fechados seria pedir um clique
 *     para responder a pergunta que a ficha existe para responder.
 *  2. A ÁREA NO CELULAR. A ficha é a mais alta dos quatro diálogos, e
 *     nenhum juiz da casa abria 390 px antes do item 62 — este é o
 *     primeiro. O teto é metade da tela: acima disso o painel deixa de ser
 *     um painel sobre a cena e vira a tela. Medida em MARTE (as sete
 *     seções), que é a ficha mais alta que existe — ver o comentário do
 *     laço.
 *  3. ELA NÃO COBRE O SELO, a mesma prova geométrica que
 *     `julgarAreaDoSelo` faz para a gaveta de camadas — e pelo mesmo
 *     conserto: o teto dela desconta `--selo-base` e `--selo-linha`.
 *  4. NÃO TRANSBORDA a janela. Um cartão `fixed` encostado à direita que
 *     não coubesse sairia pela borda sem barra de rolagem que o traga de
 *     volta — o defeito que a barra de controles teve a 768 px.
 */
async function julgarAreaDaFicha(s) {
  const MEDIR = `(() => {
    const W = innerWidth, H = innerHeight;
    const cx = (sel) => {
      const e = document.querySelector(sel);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { x: b.left, y: b.top, w: b.width, h: b.height };
    };
    const ficha = cx('.atlas-ficha');
    const selo = cx('.atlas-selo');
    const bate = (p, q) => Boolean(p && q && p.x < q.x + q.w && q.x < p.x + p.w
      && p.y < q.y + q.h && q.y < p.y + p.h);
    return { W, H, ficha, selo, cobre: bate(ficha, selo),
      pct: ficha ? (ficha.w * ficha.h) / (W * H) * 100 : null,
      dentro: Boolean(ficha && ficha.x >= -0.5 && ficha.y >= -0.5
        && ficha.x + ficha.w <= W + 0.5 && ficha.y + ficha.h <= H + 0.5) };
  })()`;
  // Metade da tela. Não é folga escolhida no escuro: medido em 22/08, a
  // ficha da Terra ocupa 17,1% a 1440×813 e 32,3% a 390×844 com a seção
  // "agora" aberta. O teto existe para o dia em que uma seção nova ou uma
  // tradução comprida a empurrem — e para que esse dia acenda vermelho
  // aqui em vez de na tela do dono. Ele acendeu na PARTE B do item 74: com
  // o texto em pt-BR e a procedência da imagem, a ficha passou de três
  // seções a seis e estourou (55,6% a 320×568 com `?ui=0.85`).
  //
  // E O ALVO PASSOU A SER MARTE, não a Terra, e é a lição do mesmo dia: o
  // que dá altura à ficha fechada é o NÚMERO DE SEÇÕES, e a Terra é a que
  // tem MENOS — ela é o observador, então não ganha a seção "no céu". Medir
  // nela era medir a ficha mais baixa e chamar isso de teto. Marte tem as
  // sete, é a mais alta que existe, e é ela que o teto tem de segurar.
  const TETO_PCT = 50;
  // F5a (item 113): boot-por-URL só na primeira célula (`?foco=` e
  // `?ui=` na porta); as outras cinco trocam viewport e escala AO VIVO —
  // a ficha da seleção fica aberta pelo caminho vivo, como no produto.
  let bootou = false;
  for (const fator of [0.85, 1, 1.4]) {
    for (const [w, h] of [[390, 844], [320, 568]]) {
      if (!bootou) {
        await s.send('Emulation.setDeviceMetricsOverride', {
          width: w, height: h, deviceScaleFactor: 1, mobile: false,
        });
        await s.ir(`foco=marte&ui=${fator}&${PIN}`);
        bootou = true;
      } else {
        await mudarJanela(s, w, h);
        await trocarUiAoVivo(s, fator);
      }
      const m = await s.js(MEDIR);
      const onde = `Marte, ${w}×${h}, ui = ${fator}`;
      conferir(
        m.ficha !== null && m.pct <= TETO_PCT,
        `ficha (${onde}): ocupa ${m.pct?.toFixed(1)}% da tela ≤ teto ${TETO_PCT}%`
      );
      const r = (p) => (p ? `[${p.x | 0},${p.y | 0} ${p.w | 0}×${p.h | 0}]` : 'ausente');
      conferir(
        m.ficha !== null && !m.cobre,
        `ficha (${onde}): NÃO cobre o selo — ficha ${r(m.ficha)}, selo ${r(m.selo)}`
      );
      conferir(m.dentro, `ficha (${onde}): cabe inteira na janela — ${r(m.ficha)}`);
    }
  }
  await s.send('Emulation.clearDeviceMetricsOverride');

  // ---- AS SEÇÕES DOBRAM, na janela do juiz
  await s.ir(`foco=terra&${PIN}`);
  const secoes = () => s.js(`[...document.querySelectorAll('.atlas-ficha-titulo button')].map((b) => ({
    titulo: b.innerText.trim().split(String.fromCharCode(10))[0],
    aberta: b.getAttribute('aria-expanded') === 'true',
    controla: b.getAttribute('aria-controls'),
    corpo: Boolean(document.getElementById(b.getAttribute('aria-controls'))),
  }))`);
  const nascidas = await secoes();
  conferir(
    nascidas.length >= 3 && nascidas[0].aberta && nascidas.slice(1).every((x) => !x.aberta),
    `ficha: ${nascidas.length} seções, a PRIMEIRA aberta e as outras fechadas `
      + `(${nascidas.map((x) => `${x.titulo}:${x.aberta ? '▾' : '▸'}`).join(' ')})`
  );
  conferir(
    nascidas.every((x) => x.aberta === x.corpo),
    'ficha: o corpo de cada seção existe no DOM exatamente quando ela está aberta'
      + ` (${nascidas.map((x) => `${x.titulo}:${x.corpo ? 'com' : 'sem'}`).join(' ')})`
  );
  // abre a segunda e fecha a primeira: os dois sentidos do gesto
  await s.js(`[...document.querySelectorAll('.atlas-ficha-titulo button')][1].click()`);
  await dorme(150);
  const abriu = await secoes();
  await s.js(`[...document.querySelectorAll('.atlas-ficha-titulo button')][0].click()`);
  await dorme(150);
  const fechou = await secoes();
  conferir(
    abriu[1].aberta && abriu[1].corpo && abriu[0].aberta,
    `ficha: clicar na segunda a ABRE sem fechar a primeira (${abriu.map((x) => (x.aberta ? '▾' : '▸')).join('')})`
  );
  conferir(
    !fechou[0].aberta && !fechou[0].corpo && fechou[1].aberta,
    `ficha: clicar na primeira a FECHA, e o corpo dela sai do DOM (${fechou.map((x) => (x.aberta ? '▾' : '▸')).join('')})`
  );
}

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
      // A FICHA DO OBJETO NÃO ENTRA AQUI, e é decisão declarada (item 74):
      // ela é um DIÁLOGO, como o painel de Ajustes, a gaveta de camadas e
      // a paleta de busca — nenhum dos quatro está nesta lista. O
      // retângulo útil desconta área PERMANENTE do HUD, nunca painel que o
      // visitante abriu por um instante; medi-la aqui reprovaria uma
      // declaração correta. A .atlas-contexto, que morava nesta lista,
      // virou o cabeçalho dela e deixou de existir — quem dimensiona o
      // topo hoje é a barra, que já era quem dimensionava antes.
      // A área que a ficha ocupa tem prova PRÓPRIA: julgarAreaDaFicha.
      '.controls-bar', '.atlas-selo', '.free-hint',
      // a máquina do tempo entrou na base pela F4: sem esta linha o
      // juiz mediria um HUD que não é mais o que está na tela
      '.atlas-tempo',
      // A FILEIRA DE ALÇAS (item 62): a base do TELEFONE. Ela não existe
      // acima de 760 px, e o medidor devolve nulo para quem não está no
      // DOM — a mesma linha serve os dois arranjos.
      '.atlas-alcas',
      // AS DUAS TARJAS DE CINEMA, e as duas por inteiro: na MESA elas são
      // o PISO de cada borda, e é justamente o que a declaração soma
      // primeiro (LETTERBOX_FRACAO). A de CIMA faltava aqui até 23/08, e
      // a falta era assimétrica: o "topo declarado ≥ medido" comparava
      // contra uma medida que nunca via a tarja, então bastava a peça mais
      // alta do topo ser MENOR que ela para o piso real ficar fora da
      // cobrança. No arranjo de mesa a barra já a engolia, e por isso o
      // buraco passou calado.
      // NO TELEFONE AS DUAS DEIXARAM DE PINTAR no fim de 23/08 (decisão
      // do dono: a imagem ocupa a tela inteira), e o medir devolve nulo
      // para quem mede zero — a mesma linha serve os dois arranjos, como
      // já servia para .atlas-alcas ao contrário. Elas ficam
      // NOMEADAS aqui de propósito: é esta lista que faz o censo do que
      // pode comer borda, e uma tarja que voltasse ao telefone por um nome
      // novo cairia na cobrança em vez de passar calada.
      '.letterbox.top', '.letterbox.bottom',
    ].map(medir).filter(Boolean);
    // A DICA SAI DA COBRANÇA NO TELEFONE, e é a decisão declarada do
    // item 62 (ver retanguloDoAtlas.ts): lá ela é position absolute, apaga
    // sozinha no primeiro arrasto e cede à folha por opacidade — o
    // oposto de área permanente. Na MESA ela conta, porque está no
    // FLUXO: a caixa fica, só a tinta some. Quem diz qual arranjo está
    // na tela é a presença da fileira, não uma largura redigitada aqui.
    const noTelefone = Boolean(document.querySelector('.atlas-alcas'));
    const cobradas = pecas.filter((p) => !(noTelefone && p.sel === '.free-hint'));
    const dica = pecas.find((p) => p.sel === '.free-hint');
    const noTopo = cobradas.filter((p) => p.topo < 0.5);
    const naBase = cobradas.filter((p) => p.topo >= 0.5);
    return {
      util,
      largura: window.innerWidth,
      noTelefone,
      dicaBase: noTelefone && dica ? dica.base : null,
      noTopo: noTopo.length,
      naBase: naBase.length,
      topoMedido: Math.max(...noTopo.map((p) => p.topo)),
      baseMedida: Math.max(...naBase.map((p) => p.base)),
      pecas: cobradas.map((p) => p.sel + ':' + p.topo.toFixed(3) + '/' + p.base.toFixed(3)),
    };
  })()`);
  const sobra = 1 - cobertura.topoMedido - cobertura.baseMedida;
  // A DICA, quando ela ficou de fora da cobrança (telefone): o número
  // aparece SEMPRE, como registro. O que não é cobrado não pode ficar
  // invisível — é ela que decide se a decisão de não declará-la
  // continua barata.
  if (cobertura.dicaBase !== null) {
    process.stdout.write(
      `  ·     retângulo útil (${quando}, ${cobertura.largura} px): a dica dos gestos ocupa `
        + `${(cobertura.dicaBase * 100).toFixed(1)}% da altura — REGISTRO, fora do fluxo e `
        + `apaga no primeiro arrasto (céu com ela na tela: `
        + `${((1 - cobertura.topoMedido - Math.max(cobertura.baseMedida, cobertura.dicaBase)) * 100).toFixed(1)}%)\n`
    );
  }
  // JANELA MUITO BAIXA, ou na FRESTA entre as duas faixas declaradas
  // (761–767 px): a medição é REGISTRO, não gate. A declaração é fração
  // de ALTURA e não sabe da altura da janela, então num viewport de 450
  // px a mesma peça de HUD é o dobro de fração; e na fresta o CSS ainda
  // diz mesa enquanto a janela já é estreita demais para a barra caber
  // sem a quebra que a declaração de mesa paga.
  // O número sai daqui em vez de sair de um adjetivo.
  if (!cobra) {
    process.stdout.write(
      `  ·     retângulo útil (${quando}, ${cobertura.largura} px de largura): `
        + `topo ${cobertura.topoMedido.toFixed(3)}/${cobertura.util.topo.toFixed(3)} · `
        + `base ${cobertura.baseMedida.toFixed(3)}/${cobertura.util.base.toFixed(3)} · `
        + `sobra ${(sobra * 100).toFixed(1)}% — REGISTRO (fora das faixas declaradas)\n`
    );
    return;
  }
  // O CÉU LIVRE, impresso em toda cobrança: é o número do item 62, e é o
  // que a DECLARAÇÃO entrega à câmera (o medido é o HUD real; o
  // declarado é o que faz a câmera recuar).
  process.stdout.write(
    `  ·     céu livre (${quando}, ${cobertura.largura} px): declarado `
      + `${((1 - cobertura.util.topo - cobertura.util.base) * 100).toFixed(1)}% · `
      + `medido ${(sobra * 100).toFixed(1)}%\n`
  );
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
    // F5a (item 113): o degrau grande entra AO VIVO — mesma página,
    // mesmos elementos (o pareamento por índice fica exato); os boots
    // com `?ui=` na porta vivem nas outras famílias deste juiz
    await trocarUiAoVivo(s, GRANDE);
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
  // com o painel ABERTO, que é a peça mais alta que a casa tem.
  // F5a: um boot-por-URL (ui=1) e o degrau grande ao vivo.
  for (const fator of [1, GRANDE]) {
    if (fator === 1) await s.ir(`atlas=1&ajustes=1&ui=1&${PIN}`);
    else await trocarUiAoVivo(s, fator);
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
  // F5a: a página do bloco de cima já está em `atlas=1&ajustes=1` com o
  // texto no degrau grande — o zoom é só o override de métricas, que
  // dispensa recarga (o app responde pelo ouvinte de resize)
  for (const zoom of [1.5, 2]) {
    await s.send('Emulation.setDeviceMetricsOverride', {
      width: Math.round(1200 / zoom),
      height: Math.round(900 / zoom),
      deviceScaleFactor: zoom,
      mobile: false,
    });
    await esperarPor(s, `window.innerWidth === ${Math.round(1200 / zoom)}`);
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
      // F5a: o degrau grande ao vivo — mesma página, mesmos seletores
      await trocarUiAoVivo(s, GRANDE);
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
  await dorme(200);
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
  // F5a: fecha o painel que o teste da URL abriu (Esc — diálogo aberto
  // come o Esc primeiro) e mede os dois extremos AO VIVO; o boot desta
  // família é o `ajustes=1` logo acima
  await s.teclar('Escape');
  await dorme(150);
  for (const fator of [0.85, GRANDE]) {
    await trocarUiAoVivo(s, fator);
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
  await dorme(400);
  const minima = await s.js('window.__rig.LARGURA_UTIL_MINIMA_PX');
  conferir(
    Number.isFinite(minima) && minima > 0,
    `a faixa de validade da declaração é um número: ≥ ${minima} px de largura de CSS`
  );
  // F5a (item 113): eram NOVE recargas para variar só largura e fator —
  // uma célula boota por URL (o contrato) e as outras oito andam ao
  // vivo. O `?ui=1.25` (meio da faixa, sem botão no painel) entra pelo
  // mesmo caminho vivo: a faixa da URL aceita qualquer valor.
  let bootouMatriz = false;
  for (const largura of [minima, 1000, 1200]) {
    for (const fator of [1, 1.25, GRANDE]) {
      if (!bootouMatriz) {
        await s.send('Emulation.setDeviceMetricsOverride', {
          width: largura, height: 900, deviceScaleFactor: 1, mobile: false,
        });
        await s.ir(`atlas=1&ui=${fator}&${PIN}`);
        bootouMatriz = true;
      } else {
        await mudarJanela(s, largura, 900);
        await trocarUiAoVivo(s, fator);
      }
      await medirCobertura(s, `ui = ${fator}`, true, fator);
    }
  }
  await s.send('Emulation.clearDeviceMetricsOverride');
}
