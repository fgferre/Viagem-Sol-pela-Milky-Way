// O JUIZ DO ROTEIRO NA TELA — texto, cortes, responsividade e movimento.
//
//   node scripts/visual/filme-smoke.mjs
//   FILME_SMOKE_SAIDA=/tmp/depois.png node scripts/visual/filme-smoke.mjs
//
// `?shot=1` mantém o HUD e congela o instante. O gate salta para as duas
// margens das janelas alteradas, lê o DOM que o espectador vê e depois solta
// o relógio em sete trechos. A folha de contato é temporária por padrão: o
// repositório não acumula capturas de revisão.
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { abrirSessao, APP_PADRAO } from './chrome.mjs';

const APP = process.env.APP_URL || APP_PADRAO;
const SAIDA = process.env.FILME_SMOKE_SAIDA
  || resolve(tmpdir(), `filme-smoke-${process.pid}.png`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const falhas = [];
const conferir = (ok, texto) => {
  process.stdout.write(`${ok ? '  OK  ' : '  FALHA '} ${texto}\n`);
  if (!ok) falhas.push(texto);
};

const normalizar = (texto) => String(texto || '').replace(/\s+/g, ' ').trim();

async function lerLegenda(sessao) {
  return sessao.js(`(() => {
    const wrap = document.querySelector('.caption-wrap');
    const title = document.querySelector('.caption-title');
    const sub = document.querySelector('.caption-sub');
    const b = wrap?.getBoundingClientRect();
    return {
      title: (title?.textContent || '').trim(),
      sub: (sub?.textContent || '').trim(),
      dentro: !b || (b.left >= -1 && b.right <= innerWidth + 1 && b.top >= -1 && b.bottom <= innerHeight + 1),
      viewport: innerWidth + 'x' + innerHeight,
    };
  })()`);
}

async function saltar(sessao, t) {
  await sessao.js(`window.__director.seek(${t})`);
  const assentou = await sessao.assentar();
  conferir(assentou.via === 'sinal', `t=${t}: assentou por ${assentou.via}`);
  return lerLegenda(sessao);
}

async function conferirLegenda(sessao, largura, { t, title, sub }) {
  const atual = await saltar(sessao, t);
  conferir(atual.title === title, `${largura}px · t=${t}: título “${atual.title || '—'}”`);
  conferir(atual.sub === (sub ?? ''), `${largura}px · t=${t}: apoio “${atual.sub || '—'}”`);
  conferir(atual.dentro, `${largura}px · t=${t}: legenda dentro de ${atual.viewport}`);
}

async function capturar(sessao) {
  const shot = await sessao.send('Page.captureScreenshot', { format: 'png' });
  return Buffer.from(shot.data, 'base64');
}

const xml = (texto) => String(texto)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

async function cartao(png, rotulo) {
  const frame = await sharp(png).resize(600, 450, {
    fit: 'contain',
    background: '#080b13',
  }).png().toBuffer();
  const faixa = Buffer.from(
    `<svg width="600" height="40" xmlns="http://www.w3.org/2000/svg">`
      + '<rect width="600" height="40" fill="#080b13"/>'
      + `<text x="18" y="27" fill="#f4d8a5" font-size="18" font-family="Arial, sans-serif">${xml(rotulo)}</text>`
      + '</svg>'
  );
  return sharp({
    create: { width: 600, height: 490, channels: 4, background: '#080b13' },
  }).composite([
    { input: faixa, left: 0, top: 0 },
    { input: frame, left: 0, top: 40 },
  ]).png().toBuffer();
}

async function salvarFolha(frames) {
  const cards = await Promise.all(frames.map(({ png, rotulo }) => cartao(png, rotulo)));
  const colunas = 3;
  const linhas = Math.ceil(cards.length / colunas);
  mkdirSync(dirname(SAIDA), { recursive: true });
  await sharp({
    create: {
      width: colunas * 600,
      height: linhas * 490,
      channels: 4,
      background: '#080b13',
    },
  }).composite(cards.map((input, i) => ({
    input,
    left: (i % colunas) * 600,
    top: Math.floor(i / colunas) * 490,
  }))).png().toFile(SAIDA);
}

async function conferirMovimento(sessao, nome, t, legenda) {
  await saltar(sessao, t);
  const antes = await sessao.js('window.__director.currentTime');
  const pausouAoSoltar = await sessao.js('window.__director.togglePause()');
  await sleep(420);
  const depois = await sessao.js('window.__director.currentTime');
  const atual = await lerLegenda(sessao);
  await sessao.js('window.__director.togglePause()');
  await sessao.assentar();
  conferir(pausouAoSoltar === false, `${nome}: o relógio foi solto`);
  conferir(depois > antes + 0.1, `${nome}: avançou ${(depois - antes).toFixed(2)} s em movimento`);
  conferir(atual.title === legenda, `${nome}: manteve “${atual.title || '—'}” durante o movimento`);
}

// As margens do corte de 19/08 (23 planos, 231 s): um instante DENTRO de
// cada janela de legenda e um logo DEPOIS dela — os números derivam de
// STARTS/captions do journey.ts e morrem junto com qualquer retemporização.
const JANELAS = [
  { t: 21.37, title: 'A VIA LÁCTEA, DE DENTRO', sub: 'a faixa no céu é a galáxia vista por dentro' },
  { t: 30.5, title: '', sub: '' },
  { t: 33, title: 'SIRIUS', sub: 'a estrela mais brilhante do céu noturno — apenas uma vizinha' },
  { t: 36.9, title: '', sub: '' },
  { t: 40.5, title: 'O MAR INTERESTELAR', sub: 'o espaço entre as estrelas não está vazio' },
  { t: 46.6, title: '', sub: '' },
  { t: 48.5, title: 'AS TRÊS MARIAS', sub: 'Alnitak · Alnilam · Mintaka — em fila só vistas daqui' },
  { t: 54.8, title: '', sub: '' },
  { t: 55.6, title: 'UM PASSO AO LADO', sub: 'e a fila se desfaz — constelações são pontos de vista' },
  { t: 60.95, title: '', sub: '' },
  { t: 70, title: 'BETELGEUSE', sub: 'no lugar do Sol, engoliria a órbita de Júpiter' },
  { t: 76.4, title: '', sub: '' },
  { t: 79, title: 'RIGEL', sub: 'a supergigante azul de Órion — 40.000 sóis' },
  { t: 83.8, title: '', sub: '' },
  { t: 88, title: 'CASA', sub: 'daqui, o Sol já é invisível a olho nu' },
  { t: 92.7, title: '', sub: '' },
  { t: 98, title: 'ANTARES', sub: 'atrás dela: o centro. 26.000 anos-luz' },
  { t: 104, title: '', sub: '' },
  { t: 115, title: 'O MERGULHO', sub: '' },
  { t: 121.9, title: '', sub: '' },
  { t: 150, title: 'SAGITTARIUS A✱', sub: 'quatro milhões de massas solares no centro da Via Láctea' },
  { t: 155.5, title: '', sub: '' },
  { t: 158, title: 'O HORIZONTE', sub: 'a gravidade dobra o disco de luz ao redor da sombra' },
  { t: 166.5, title: '', sub: '' },
  { t: 168.5, title: 'O ESTILINGUE', sub: 'do coração para fora do disco' },
  { t: 172.5, title: '', sub: '' },
  { t: 180, title: 'A VIA LÁCTEA, POR FORA', sub: 'uma reconstrução científica do que ninguém jamais viu' },
  { t: 185.5, title: '', sub: '' },
  { t: 186.5, title: 'ELA NÃO É PLANA', sub: '' },
  { t: 193.5, title: '', sub: '' },
  { t: 210.5, title: 'NOSSA GALÁXIA', sub: 'centenas de bilhões de estrelas' },
  { t: 217.5, title: '', sub: '' },
  { t: 224, title: 'VOCÊ ESTÁ AQUI', sub: '' },
];

async function julgarLargura(largura, altura, captura) {
  const sessao = await abrirSessao({
    janela: `${largura}x${altura}`,
    app: APP,
    prefixo: `filme-${largura}`,
  });
  const frames = [];
  try {
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: largura,
      height: altura,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const introAssentou = await sessao.ir('q=cinema&shot=1');
    conferir(introAssentou.via === 'sinal', `${largura}px · abertura assentou por ${introAssentou.via}`);
    const intro = normalizar(await sessao.js("document.querySelector('.veil-intro .title-sub')?.textContent"));
    conferir(
      intro.includes('do Sol às supergigantes de Órion, ao coração da galáxia — e além'),
      `${largura}px · primeira frase da abertura preservada`
    );
    conferir(
      intro.includes('328.749 estrelas de catálogo · Via Láctea volumétrica reconstruída em tempo real'),
      `${largura}px · promessa técnica da abertura está completa`
    );
    if (captura) frames.push({ png: await capturar(sessao), rotulo: `ABERTURA · ${largura}px` });

    const viagemAssentou = await sessao.ir('q=cinema&shot=1&t=33');
    conferir(viagemAssentou.via === 'sinal', `${largura}px · viagem assentou por ${viagemAssentou.via}`);

    for (const janela of JANELAS) await conferirLegenda(sessao, largura, janela);

    if (captura) {
      const vistas = captura === 'todas' ? [
        [33.5, 'SIRIUS · 33,5 s'],
        [88.5, 'CASA · 88,5 s'],
        [115, 'MERGULHO · 115 s'],
        [137, 'AGLOMERADO · 137 s'],
        [150.5, 'SAGITTARIUS A✱ · 150,5 s'],
        [186.5, 'PERFIL · 186,5 s'],
        [210.5, 'FACE-ON · 210,5 s'],
        [224, 'FINAL · 224 s'],
      ] : [
        [150.5, `SAGITTARIUS A✱ · ${largura}px`],
        [224, `FINAL · ${largura}px`],
      ];
      for (const [t, rotulo] of vistas) {
        await saltar(sessao, t);
        frames.push({ png: await capturar(sessao), rotulo });
      }

      if (captura === 'todas') for (const [nome, t, legenda] of [
        ['Sirius', 33.5, 'SIRIUS'],
        ['Casa', 88.5, 'CASA'],
        ['mergulho', 115, 'O MERGULHO'],
        ['Sagittarius A*', 150.5, 'SAGITTARIUS A✱'],
        ['perfil', 186.5, 'ELA NÃO É PLANA'],
        ['face-on', 210.5, 'NOSSA GALÁXIA'],
        ['final', 224, 'VOCÊ ESTÁ AQUI'],
      ]) await conferirMovimento(sessao, nome, t, legenda);
    }

    await saltar(sessao, 230.9);
    await sessao.js('window.__director.togglePause()');
    const limite = Date.now() + 3000;
    let fase = '';
    while (Date.now() < limite && fase !== 'end') {
      fase = await sessao.js('window.__director.captura.fase');
      if (fase !== 'end') await sleep(50);
    }
    conferir(fase === 'end', `${largura}px · a viagem alcança a tela final`);
    const final = normalizar(await sessao.js("document.querySelector('.veil-end')?.textContent"));
    conferir(final.includes('cerca de 80 mil anos-luz acima de casa'), `${largura}px · distância final em anos-luz`);
    conferir(final.includes('O SOL É SÓ MAIS UM PONTO DE LUZ'), `${largura}px · conclusão do Sol preservada`);
    conferir(
      final.includes('estrelas nomeadas em posições reais · Via Láctea reconstruída a partir de dados científicos'),
      `${largura}px · selo científico final está completo`
    );
    if (captura === 'compacta') {
      frames.push({ png: await capturar(sessao), rotulo: `TELA FINAL · ${largura}px` });
    }
    return frames;
  } finally {
    sessao.fechar();
  }
}

try {
  const frames = await julgarLargura(1200, 900, 'todas');
  frames.push(...await julgarLargura(820, 900, 'compacta'));
  await salvarFolha(frames);
  if (falhas.length === 0) conferir(true, 'gate completo (0 falhas)');
  process.stdout.write(`\nFolha de contato: ${SAIDA}\n`);
} catch (erro) {
  falhas.push(erro instanceof Error ? erro.message : String(erro));
  process.stderr.write(`\nFALHA INESPERADA: ${falhas.at(-1)}\n`);
}

if (falhas.length) {
  process.stderr.write(`\n${falhas.length} falha(s) no gate do filme.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('\nFILME OK — texto, cortes, duas larguras e movimento conferidos.\n');
}
