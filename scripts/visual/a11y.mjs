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

const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
if (!ping.includes('<div id="root"')) throw new Error(`dev server não respondeu em ${APP}`);

const sessao = await abrirSessao({ janela: JANELA, app: APP, prefixo: 'a11y' });
try {
  // O FILME PAUSADO: é lá que o painel de Ajustes sempre viveu, e é a
  // prova de que a reforma do D7 não é privilégio do modo novo.
  await julgarPagina(sessao, 't=100', 'journey');

  // O ATLAS: os diálogos do modo novo, pelo mesmo contrato.
  await julgarPagina(sessao, 'atlas=1', 'atlas');
} finally {
  sessao.fechar();
}

if (falhas.length) {
  process.stdout.write(`\nJUIZ DE A11Y: ${falhas.length} falha(s)\n`);
  process.exit(1);
}
process.stdout.write('\nJUIZ DE A11Y: tudo verde\n');
