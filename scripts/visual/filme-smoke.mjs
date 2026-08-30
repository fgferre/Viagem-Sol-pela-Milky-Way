// Serve: dono — o roteiro na tela: legenda inteira nas margens, corte certo e o relógio andando
// Custo: 1,4 min (medido 30/08, F5c do item 113: sentinela na 2ª largura + mesma sessão)
// O JUIZ DO ROTEIRO NA TELA — texto, cortes, responsividade e movimento.
//
//   node scripts/visual/filme-smoke.mjs
//   FILME_SMOKE_SAIDA=/tmp/depois.png node scripts/visual/filme-smoke.mjs
//
// `?shot=1` mantém o HUD e congela o instante. O gate salta para as duas
// margens das janelas alteradas, lê o DOM que o espectador vê e depois solta
// o relógio em NOVE trechos. A folha de contato é temporária por padrão: o
// repositório não acumula capturas de revisão.
//
// AS DUAS LARGURAS ANDAM NA MESMA SESSÃO de Chrome desde 30/08 (F5c do
// item 113): a segunda vira um `setDeviceMetricsOverride` de 820×900, e a
// abertura a 820 continua provada por RECARGA (o `ir()` da largura boota o
// documento já estreito). E a varredura completa das janelas roda só na
// primeira largura — na segunda vale a SENTINELA (ver o comentário no
// corpo): top-8 legendas mais compridas + abertura + tela final.
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { abrirSessao, APP_PADRAO, esperarPor } from './chrome.mjs';

const APP = process.env.APP_URL || APP_PADRAO;
const SAIDA = process.env.FILME_SMOKE_SAIDA
  || resolve(tmpdir(), `filme-smoke-${process.pid}.png`);
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

/**
 * O TETO da espera pelo primeiro quadro em movimento. Não é tolerância de
 * ritmo: é o limite acima do qual "o relógio não anda" deixa de ser máquina
 * ocupada e vira relógio PARADO — o defeito que este veredito procura.
 * Mesmo a 1 quadro/s isto são dez quadros de folga.
 */
const TETO_DO_MOVIMENTO_MS = 10000;

/**
 * O PISO DO MOVIMENTO, em QUADROS do próprio app. Um quadro é epsilon:
 * `currentTime > antes` também é verdade num integrador 10× lento por
 * DEFEITO, que é exatamente o que este veredito existe para pegar. Três
 * quadros é o piso, e ele se converte em segundos de filme pelo grampo
 * do passo que o app publica (`window.__director.grampoDoPasso`) —
 * abaixo de 20 q/s cada quadro vale um grampo inteiro de filme. Redigitar
 * o número aqui faria a régua e o integrador discordarem no dia em que
 * um dos dois mudasse.
 */
const QUADROS_DE_PISO = 3;

/**
 * O RELÓGIO ANDA QUANDO SOLTO — e é ISSO que se mede.
 *
 * A espera é por ESTADO (`esperarPor`), com teto grande e generoso, e a
 * taxa sai como REGISTRO, do jeito que o `a11y.mjs` faz com os cantos
 * fora da faixa. Relógio parado — ou lento demais para andar o piso em
 * dez segundos — reprova; máquina lenta vira número no log, que é o que
 * ela é.
 */
async function conferirMovimento(sessao, nome, t, legenda, grampo) {
  await saltar(sessao, t);
  const antes = await sessao.js('window.__director.currentTime');
  const piso = QUADROS_DE_PISO * grampo;
  const t0 = Date.now();
  const pausouAoSoltar = await sessao.js('window.__director.togglePause()');
  const esperou = await esperarPor(
    sessao,
    `window.__director.currentTime > ${antes + piso}`,
    TETO_DO_MOVIMENTO_MS
  );
  const depois = await sessao.js('window.__director.currentTime');
  const parede = (Date.now() - t0) / 1000;
  const atual = await lerLegenda(sessao);
  await sessao.js('window.__director.togglePause()');
  await sessao.assentar();
  conferir(pausouAoSoltar === false, `${nome}: o relógio foi solto`);
  conferir(
    esperou !== null,
    `${nome}: o relógio ANDOU solto — ${(depois - antes).toFixed(2)} s de filme`
      + ` (piso ${piso.toFixed(2)} s = ${QUADROS_DE_PISO} quadros)`
      + ` em ${parede.toFixed(2)} s de parede`
      + ` (${(parede > 0 ? (depois - antes) / parede : 0).toFixed(2)}× o tempo real)`
  );
  conferir(atual.title === legenda, `${nome}: manteve “${atual.title || '—'}” durante o movimento`);
}

// As margens do corte (25 planos, 193 s): um instante DENTRO de cada
// janela de legenda e um logo DEPOIS dela — os números derivam de
// STARTS/captions do journey.ts e morrem junto com qualquer
// retemporização.
const JANELAS = [
  { t: 21.5, title: 'A VIA LÁCTEA, DE DENTRO', sub: 'a faixa no céu é o disco: cem mil anos-luz vistos de dentro' },
  { t: 30.1, title: '', sub: '' },
  { t: 33.2, title: 'SIRIUS', sub: 'brilha tanto por estar a 8,6 anos-luz — é só uma vizinha' },
  { t: 36.9, title: '', sub: '' },
  { t: 39, title: 'A BOLHA LOCAL', sub: 'gás a um milhão de graus, esculpido por supernovas antigas' },
  { t: 43, title: '', sub: '' },
  { t: 44.5, title: 'AS TRÊS MARIAS', sub: 'Alnitak, Alnilam, Mintaka — três supergigantes alinhadas só daqui' },
  { t: 48.9, title: '', sub: '' },
  { t: 50, title: 'UM PASSO AO LADO', sub: 'Alnilam está 1.200 anos-luz mais ao fundo — a fila era um ponto de vista' },
  { t: 54.95, title: '', sub: '' },
  { t: 61, title: 'BETELGEUSE', sub: 'supergigante vermelha à beira de explodir — engoliria a órbita de Júpiter' },
  { t: 66, title: '', sub: '' },
  { t: 68.5, title: 'RIGEL', sub: 'supergigante azul a 12.000 K — 40.000 sóis em poucos milhões de anos' },
  { t: 72.85, title: '', sub: '' },
  { t: 76.5, title: 'CASA', sub: 'a 800 anos-luz o Sol caiu para magnitude 12: invisível a olho nu' },
  { t: 79.95, title: '', sub: '' },
  { t: 84, title: 'ANTARES', sub: 'brasa a 550 anos-luz, no alinhamento do centro da galáxia' },
  { t: 87.95, title: '', sub: '' },
  { t: 98, title: 'O MERGULHO', sub: 'braço de Sagitário: a poeira extingue e avermelha as estrelas' },
  { t: 98.9, title: '', sub: '' },
  { t: 100, title: 'O BERÇÁRIO', sub: 'Shaula, Dschubba, Lesath — o berçário de Escorpião no caminho' },
  { t: 104.2, title: '', sub: '' },
  { t: 106.5, title: 'O ÚLTIMO BRAÇO', sub: 'Scutum-Centaurus — o gás comprime e acende estrelas azuis' },
  { t: 110.4, title: '', sub: '' },
  { t: 123.2, title: 'SAGITTARIUS A✱', sub: 'quatro milhões de sóis num volume menor que a órbita de Mercúrio' },
  { t: 127.95, title: '', sub: '' },
  { t: 129, title: 'O HORIZONTE', sub: 'a gravidade curva a luz ao redor da sombra — lente de Einstein' },
  { t: 134.7, title: '', sub: '' },
  { t: 137, title: 'O ESTILINGUE', sub: 'do coração para o vazio acima do disco' },
  { t: 140.1, title: '', sub: '' },
  { t: 146.5, title: 'A VIA LÁCTEA, POR FORA', sub: 'reconstrução a partir de 1,8 bilhão de estrelas da missão Gaia' },
  { t: 149.8, title: '', sub: '' },
  { t: 151.5, title: 'ELA NÃO É PLANA', sub: 'cem mil anos-luz de lado, mil de espessura — as bordas ondulam' },
  { t: 155, title: '', sub: '' },
  { t: 158, title: 'OS BRAÇOS', sub: 'não são braços rígidos — são ondas que comprimem o gás em espiral' },
  { t: 163.1, title: '', sub: '' },
  { t: 165.5, title: 'NOSSA GALÁXIA', sub: 'espiral barrada — centenas de bilhões de estrelas a 220 km/s' },
  { t: 169, title: '', sub: '' },
  { t: 171.5, title: 'VOCÊ ESTÁ AQUI', sub: 'Esporão de Órion, 26 mil anos-luz do centro — uma volta a cada 230 milhões de anos' },
  { t: 175.9, title: '', sub: '' },
  { t: 177.5, title: 'A VOLTA PARA CASA', sub: '26 mil anos-luz até os minutos-luz de casa' },
  { t: 180.9, title: '', sub: '' },
  { t: 183, title: 'A LUA', sub: '1,3 segundo-luz — o mais longe que o ser humano já chegou' },
  { t: 186.05, title: '', sub: '' },
  { t: 187, title: 'A TERRA', sub: 'o único ponto com oceano de onde a galáxia inteira foi decifrada' },
];

async function julgarLargura(sessao, largura, altura, captura) {
  const frames = [];
  {
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
      intro.includes('do Sol às supergigantes de Órion, ao coração da galáxia — e de volta'),
      `${largura}px · primeira frase da abertura preservada`
    );
    conferir(
      intro.includes('328.749 estrelas de catálogo · Via Láctea volumétrica reconstruída em tempo real'),
      `${largura}px · promessa técnica da abertura está completa`
    );
    if (captura) frames.push({ png: await capturar(sessao), rotulo: `ABERTURA · ${largura}px` });

    const viagemAssentou = await sessao.ir('q=cinema&shot=1&t=33');
    conferir(viagemAssentou.via === 'sinal', `${largura}px · viagem assentou por ${viagemAssentou.via}`);

    // A SENTINELA DA 2ª LARGURA (F5c do item 113, 30/08): a varredura
    // COMPLETA roda na primeira largura, onde texto e corte são o juízo.
    // Na segunda, o único veredito NOVO é "dentro da tela" — e quem
    // estoura borda é COMPRIMENTO. As top-8 legendas mais compridas são
    // escolhidas por contagem de caracteres EM EXECUÇÃO: um texto novo
    // comprido entra sozinho na sentinela, sem ninguém lembrar de
    // listá-lo. Abertura e tela final continuam conferidas nas duas
    // larguras (acima e abaixo deste laço).
    const janelas = captura === 'todas'
      ? JANELAS
      : JANELAS
          .filter((j) => j.title)
          .sort((a, b) => (b.title.length + b.sub.length) - (a.title.length + a.sub.length))
          .slice(0, 8)
          .sort((a, b) => a.t - b.t);
    if (captura !== 'todas') {
      conferir(
        janelas.length === 8,
        `${largura}px · SENTINELA: as ${janelas.length} legendas mais compridas do corte`
          + ` — ${janelas.map((j) => j.title).join(' · ')}`
      );
    }
    for (const janela of janelas) await conferirLegenda(sessao, largura, janela);

    if (captura) {
      const vistas = captura === 'todas' ? [
        [33.2, 'SIRIUS · 33 s'],
        [76.5, 'CASA · 76 s'],
        [98, 'MERGULHO · 98 s'],
        [106.5, 'BERÇÁRIO · 106 s'],
        [123.2, 'SAGITTARIUS A✱ · 123 s'],
        [152, 'PERFIL · 152 s'],
        [166, 'FACE-ON · 166 s'],
        [172, 'VOCÊ ESTÁ AQUI · 172 s'],
        [183, 'A LUA · 183 s'],
        [191.5, 'A TERRA · 191 s'],
      ] : [
        [123.2, `SAGITTARIUS A✱ · ${largura}px`],
        [191.5, `A TERRA · ${largura}px`],
      ];
      for (const [t, rotulo] of vistas) {
        await saltar(sessao, t);
        frames.push({ png: await capturar(sessao), rotulo });
      }

      if (captura === 'todas') {
        // o piso do movimento vem do APP (ver `QUADROS_DE_PISO`); se a
        // porta sumir, reprova aqui em vez de medir com `NaN`
        const grampo = await sessao.js('window.__director.grampoDoPasso');
        conferir(
          typeof grampo === 'number' && grampo > 0,
          `${largura}px · o app publica o grampo do passo (${grampo} s)`
        );
        for (const [nome, t, legenda] of [
          ['Sirius', 33.2, 'SIRIUS'],
          ['Casa', 76.5, 'CASA'],
          ['mergulho', 98, 'O MERGULHO'],
          ['Sagittarius A*', 123.2, 'SAGITTARIUS A✱'],
          ['perfil', 152, 'ELA NÃO É PLANA'],
          ['face-on', 166, 'NOSSA GALÁXIA'],
          ['galáxia final', 172, 'VOCÊ ESTÁ AQUI'],
          ['a Lua', 183, 'A LUA'],
          ['a Terra', 187, 'A TERRA'],
        ]) await conferirMovimento(sessao, nome, t, legenda, grampo);
      }
    }

    // OS ÚLTIMOS 0,2 s DO CORTE, e a mesma régua do movimento: pergunta-se
    // "CHEGOU?", não "passaram 3 s?". Com o passo grampeado, o que falta
    // são uns poucos quadros — cobrar que eles caibam num teto curto de
    // parede é cobrar taxa de quadros da máquina outra vez.
    await saltar(sessao, 192.8);
    await sessao.js('window.__director.togglePause()');
    const chegouEm = await esperarPor(
      sessao,
      "window.__director.captura.fase === 'end'",
      TETO_DO_MOVIMENTO_MS
    );
    conferir(
      chegouEm !== null,
      `${largura}px · a viagem alcança a tela final`
        + (chegouEm === null ? '' : ` (em ${(chegouEm / 1000).toFixed(2)} s)`)
    );
    const final = normalizar(await sessao.js("document.querySelector('.veil-end')?.textContent"));
    conferir(final.includes('de volta a casa'), `${largura}px · a coda assina a tela final`);
    conferir(
      final.includes('O SOL É SÓ MAIS UM PONTO DE LUZ — E É O NOSSO'),
      `${largura}px · conclusão do Sol preservada`
    );
    conferir(
      final.includes('estrelas nomeadas em posições reais · Via Láctea reconstruída a partir de dados científicos'),
      `${largura}px · selo científico final está completo`
    );
    if (captura === 'compacta') {
      frames.push({ png: await capturar(sessao), rotulo: `TELA FINAL · ${largura}px` });
    }
    return frames;
  }
}

// UMA sessão de Chrome para as duas larguras (F5c): a segunda largura é
// override de métricas, e a abertura dela continua provada por recarga —
// o `ir()` de cada largura boota o documento já no tamanho novo.
const sessao = await abrirSessao({ janela: '1200x900', app: APP, prefixo: 'filme' });
try {
  const frames = await julgarLargura(sessao, 1200, 900, 'todas');
  frames.push(...await julgarLargura(sessao, 820, 900, 'compacta'));
  await salvarFolha(frames);
  if (falhas.length === 0) conferir(true, 'gate completo (0 falhas)');
  process.stdout.write(`\nFolha de contato: ${SAIDA}\n`);
} catch (erro) {
  falhas.push(erro instanceof Error ? erro.message : String(erro));
  process.stderr.write(`\nFALHA INESPERADA: ${falhas.at(-1)}\n`);
} finally {
  sessao.fechar();
}

if (falhas.length) {
  process.stderr.write(`\n${falhas.length} falha(s) no gate do filme.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('\nFILME OK — texto, cortes, duas larguras e movimento conferidos.\n');
}
