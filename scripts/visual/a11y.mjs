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
  }
  // ---- o selo de honestidade (D1) ---------------------------------
  // O TESTE PURO (`selo.test.ts`) cobra que nenhum controle possa
  // desmentir o selo; aqui a mesma promessa é cobrada no navegador, com
  // os controles de verdade: desligar uma camada na gaveta tem de mover
  // o selo, e clicar na linha BRILHO tem de trazê-lo de volta.
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
  conferir(
    inicial !== null && inicial.escala === 'ESCALA REAL' && inicial.brilho === 'BRILHO REAL',
    `selo na abertura: "${inicial?.escala}" · "${inicial?.brilho}"`
  );
  conferir(
    inicial !== null && !inicial.brilhoClicavel && !inicial.escalaClicavel,
    'selo: linha sem o que desfazer não é botão clicável'
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
    `selo: clicar na linha BRILHO volta ao real ("${voltou.brilho}", escondidas=${camadasVivas})`
  );
  conferir(
    !urlLimpa.includes('nocat') && urlLimpa.includes('atlas'),
    `selo: a volta limpa a porta e preserva o modo (${urlLimpa})`
  );

  // ---- o retângulo útil cobre o HUD REAL --------------------------
  // A declaração vive no TS (`retanguloUtilDoAtlas`) e as alturas, no
  // CSS. Sem esta prova as duas só se encontrariam a olho — e o alvo
  // começaria a ser enquadrado por baixo do selo sem ninguém notar.
  const cobertura = await sessao.js(`(() => {
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
      topoMedido: Math.max(...noTopo.map((p) => p.topo)),
      baseMedida: Math.max(...naBase.map((p) => p.base)),
      pecas: pecas.map((p) => p.sel + ':' + p.topo.toFixed(3) + '/' + p.base.toFixed(3)),
    };
  })()`);
  conferir(
    cobertura.topoMedido <= cobertura.util.topo,
    `retângulo útil: topo declarado ${cobertura.util.topo} ≥ medido `
      + `${cobertura.topoMedido.toFixed(3)}`
  );
  conferir(
    cobertura.baseMedida <= cobertura.util.base,
    `retângulo útil: base declarada ${cobertura.util.base} ≥ medida `
      + `${cobertura.baseMedida.toFixed(3)} (${cobertura.pecas.join(' · ')})`
  );

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
