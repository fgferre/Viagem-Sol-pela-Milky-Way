// ============================================================
// O JUIZ DA BEIRA — a fita de órbita acaba em RAMPA ou em ESCADA?
//
//   node scripts/visual/beira-da-fita.mjs              # captura as duas janelas e mede
//   ESTADO=antes node scripts/visual/beira-da-fita.mjs # o mesmo, com outro rótulo
//   node scripts/visual/beira-da-fita.mjs --prancha    # compõe a folha dos crus em disco
//
// ------------------------------------------------------------
// A QUEM ELE SERVE
// ------------------------------------------------------------
// Ao DONO, e a frase é dele, de 2026-08-26: *"lá a órbita parece uma fita
// dobrada, não uma linha grossa; a nossa ainda parece linha grossa"*.
// Este arquivo mede a primeira metade da resposta — o item 83 · B1, que
// é o A2 (a saia do anti-aliasing) mais o A3 (a largura que cresce com a
// janela). A segunda metade, a junta em bissetriz, é o B2 e tem juiz
// próprio na dobra.
//
// Nada aqui mede semelhança com a foto da referência. O alvo é a linha
// LINDA; o que se mede é o PERFIL ATRAVÉS da fita, que é onde a escada
// mora.
//
// ------------------------------------------------------------
// O QUE ELE MEDE, e por que estas duas grandezas
// ------------------------------------------------------------
// Sobre um corte PERPENDICULAR à fita (uma coluna de pixels no alto do
// laço, onde ele corre quase na horizontal), o perfil sobe do céu ao
// corpo da fita e volta a descer. Dele saem DOIS números, e eles são
// independentes de propósito:
//
//   · A SUBIDA (10%→90%), em px de dispositivo — o tamanho da RAMPA. É o
//     número do A2. Beira dura sobe no espaço de um pixel (o único
//     degrau intermediário é o do downsample do supersampling); beira com
//     saia sobe ao longo dela.
//   · A LARGURA A MEIA ALTURA (FWHM), em px de dispositivo — o traço que
//     o olho lê como "a grossura da fita". É o número do A3, e é ELE que
//     tem de ficar igual numa janela de 800 e crescer numa janela grande.
//
// SEPARAR OS DOIS É O PONTO: uma fita que só engordasse passaria por
// "beira macia" numa medida só de largura, e uma fita que só borrasse
// passaria por "cresceu" numa medida só de subida. O A2 mexe na subida e
// quase não mexe na FWHM; o A3 mexe na FWHM e não mexe na subida.
//
// ------------------------------------------------------------
// AS TRÊS JANELAS, e por que a MESMA proporção
// ------------------------------------------------------------
// A lente da casa é de FOV VERTICAL: o laço de Saturno ocupa a mesma
// fração da ALTURA em qualquer janela. Duas janelas 4:3 — 1067×800 e
// 1600×1200 px CSS — enquadram portanto a MESMA cena, uma 1,5× maior que
// a outra, e o anel cai no mesmo lugar relativo nas duas. O que NÃO
// escala com elas é a fita: largura de tela é largura de tela.
//
// E os números caem redondos na lei do A3 (`max(1, min(lado CSS)/800)`):
// a janela pequena tem lado menor 800 e fator 1 — é a "igual a hoje" que
// o dono pediu para comparar —, e a grande tem lado menor 1200 e fator
// 1,5. Antes do B1 as duas davam a MESMA fita; depois dele a grande dá
// uma fita 1,5× mais larga, e é esse par que prova o A3.
//
// DPR 2 nessas duas, porque é a tela dele.
//
// E UMA TERCEIRA, de dpr 1, acrescentada em 26/08 por auditoria. Ela é o
// regime em que a fita inchada vale 2,25 px de DISPOSITIVO: ali o
// `fwidth(u)` do fragmento passa do `uMiolo`, a rampa toma a fita
// inteira, e sem o grampo de `perfilDaSaia` o CENTRO perdia 15,6% de
// brilho. O regime é alcançável — preset `performance`, auto-degradação
// abaixo de 34 fps, monitor não-Retina —, e era o único que nunca tinha
// sido fotografado. A perna leva `?q=performance` junto do dpr, para o
// preset do engine casar com a emulação em vez de as duas discordarem.
//
// ------------------------------------------------------------
// ONDE ELE OLHA, e como acha a fita sem número decorado
// ------------------------------------------------------------
// A vista é a do juiz do colar (`colar-da-fita.mjs`) — `?pos=` a 40 UA
// olhando o Sol, com o laço de Saturno como um anel largo. O recorte
// deste juiz é o ALTO do anel, que é onde ele corre mais perto da
// horizontal e o corte por coluna é perpendicular à fita.
//
// O RECORTE NÃO É DECORADO: as duas janelas têm tamanhos diferentes, e um
// `FAIXA` fixo mediria o céu numa delas. O juiz VARRE a faixa alta do
// quadro (bem acima do Sol, que fica no centro) procurando a crista mais
// brilhante coluna a coluna, e só aceita se a crista ANDAR DEVAGAR — uma
// fita quase horizontal move-se menos de um pixel por coluna. Estrela e
// planeta não passam nesse teste: são manchas, não cristas contínuas.
//
// E ELE REPROVA QUANDO NÃO CONSEGUE MEDIR — sem crista, crista fraca,
// crista que salta. Juiz que avisa em vez de reprovar é juiz que ninguém
// lê (a lição do MB1 descalibrado, item 81).
// ============================================================
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { carimboDoCodigo } from './ab-identidade.mjs';
import { capturarCDP } from './chrome.mjs';
import { arred, cinzaDoPng, lerPng, percentil, semSobrescrever } from './luz-ab.mjs';

/** a vista do juiz do colar — o laço de Saturno como anel largo */
export const VISTA = '/?pos=0,0,0.00019393&look=0,0,0&jd=2460409.26395835&q=cinema&shot=2';
export const APP = process.env.APP_URL || 'http://127.0.0.1:5173';

/**
 * AS TRÊS JANELAS. Mesma proporção 4:3 para enquadrarem a mesma cena;
 * lados menores 800 e 1200 para caírem em fator 1,0 e 1,5 da lei do A3,
 * e a terceira repetindo a de 800 com `pixelRatio` 1 para fotografar o
 * regime fino de dispositivo.
 */
export const JANELAS = [
  { nome: 'p800', largura: 1067, altura: 800, dpr: 2, fatorEsperado: 1 },
  { nome: 'g1200', largura: 1600, altura: 1200, dpr: 2, fatorEsperado: 1.5 },
  // A PERNA DE dpr 1 (26/08, por auditoria) — o regime em que a fita
  // inchada vale 2,25 px de DISPOSITIVO e a rampa toma a fita inteira. É
  // alcançável de verdade (preset `performance`, auto-degradação abaixo
  // de 34 fps, monitor não-Retina), e era o único que nunca tinha sido
  // fotografado. `?q=performance` na URL casa o preset com o dpr, para a
  // foto ser o regime e não uma emulação pela metade.
  { nome: 'dpr1', largura: 1067, altura: 800, dpr: 1, fatorEsperado: 1, q: 'performance' },
];

/**
 * A FAIXA DE BUSCA, em frações da ALTURA do PNG. O alto do anel de
 * Saturno cai a ~0,099 da altura nesta vista (medido: y≈177 num quadro de
 * 1800), e o Sol fica no centro — buscar entre 0,03 e 0,22 põe a crista
 * no meio da faixa e deixa o Sol de fora por larga margem.
 */
export const BUSCA_Y = { de: 0.03, ate: 0.22 };
/** e a largura da varredura, em frações da altura, centrada no ápice */
export const BUSCA_X = 0.22;

/** Abaixo disto não há fita na faixa, e não há o que medir. */
export const PISO_DA_CRISTA = 30;
/**
 * Quanto a crista pode andar de uma coluna para a vizinha, em px. Uma
 * fita quase horizontal anda menos de 1; uma mancha (estrela, planeta) ou
 * o serrilhado de uma curva íngreme saltam muito mais.
 */
export const PASSO_MAX_DA_CRISTA = 1.5;
/** ...e esta fração das colunas tem de andar devagar para valer crista. */
export const MIN_DE_COLUNAS_MANSAS = 0.9;
/** meia altura do corte, em px — folga larga sobre uma fita de ~5 px */
export const MEIO_CORTE = 12;

/** A mediana é o `percentil` do medidor de luz — uma definição só. */
const mediana = (v) => percentil(v, 0.5);

/**
 * A CRISTA da fita na faixa alta do quadro: para cada coluna, a linha
 * mais brilhante e o quanto ela brilha. Pura, sobre o cinza já lido.
 */
export function acharACrista(cinza, largura, altura) {
  const y0 = Math.round(altura * BUSCA_Y.de);
  const y1 = Math.round(altura * BUSCA_Y.ate);
  const meia = Math.round((altura * BUSCA_X) / 2);
  const x0 = Math.round(largura / 2) - meia;
  const x1 = Math.round(largura / 2) + meia;
  const colunas = [];
  for (let x = x0; x < x1; x++) {
    let pico = -1;
    let onde = -1;
    for (let y = y0; y < y1; y++) {
      const v = cinza[y * largura + x];
      if (v > pico) {
        pico = v;
        onde = y;
      }
    }
    colunas.push({ x, y: onde, pico });
  }
  return { colunas, faixa: { x0, x1, y0, y1 } };
}

/**
 * O PERFIL ATRAVÉS DA FITA numa coluna, e as duas medidas que saem dele.
 *
 * O CÉU é o menor valor do corte — a fita é fina e o corte é largo, então
 * as pontas dele são céu por construção. A ALTURA é o pico menos o céu, e
 * os cortes de 10%, 50% e 90% são frações DELA: um juiz que usasse
 * limiares absolutos mediria a exposição da vista, não a beira.
 *
 * A INTERPOLAÇÃO É LINEAR entre os dois pixels que cercam cada corte, e é
 * ela que dá resolução de sub-pixel a uma medida cujo defeito inteiro tem
 * um ou dois pixels de tamanho. Sem ela, "subiu em 1 px" e "subiu em 2
 * px" seriam a mesma resposta.
 */
export function medirOCorte(cinza, largura, x, yPico) {
  const de = yPico - MEIO_CORTE;
  const ate = yPico + MEIO_CORTE;
  const v = [];
  for (let y = de; y <= ate; y++) v.push(cinza[y * largura + x]);
  const ceu = Math.min(...v);
  const pico = Math.max(...v);
  const altura = pico - ceu;
  if (!(altura > 0)) return null;
  const iPico = v.indexOf(pico);

  // onde o perfil cruza uma fração da altura, andando do pico para fora
  const cruzar = (fracao, sentido) => {
    const alvo = ceu + altura * fracao;
    for (let i = iPico; i >= 0 && i < v.length; i += sentido) {
      if (v[i] <= alvo) {
        const anterior = i - sentido;
        const d = v[anterior] - v[i];
        const t = d > 0 ? (v[anterior] - alvo) / d : 0;
        return anterior + t * sentido;
      }
    }
    return null;
  };

  const b10 = cruzar(0.1, -1);
  const b50 = cruzar(0.5, -1);
  const b90 = cruzar(0.9, -1);
  const c10 = cruzar(0.1, 1);
  const c50 = cruzar(0.5, 1);
  const c90 = cruzar(0.9, 1);
  if ([b10, b50, b90, c10, c50, c90].some((n) => n === null)) return null;
  return {
    ceu,
    pico,
    // a SUBIDA é a média dos dois flancos: a fita não é simétrica no
    // pixel (a grade cai onde cai), e um flanco só mediria a fase da
    // amostragem em vez do tamanho da rampa
    subida: ((b90 - b10) + (c10 - c90)) / 2,
    fwhm: c50 - b50,
  };
}

/**
 * O VEREDITO de um quadro: a crista existe, é mansa, e o par de números
 * que ela devolve. `aprovado: false` é o ramo do juiz que não conseguiu
 * medir — quem chama olha `aprovado` antes de olhar número nenhum.
 */
export function medirPng(bytes) {
  const png = lerPng(bytes);
  const { largura, altura } = png;
  const cinza = cinzaDoPng(png);
  const { colunas, faixa } = acharACrista(cinza, largura, altura);

  const picoMediano = mediana(colunas.map((c) => c.pico));
  if (!(picoMediano >= PISO_DA_CRISTA)) {
    return {
      quadro: `${largura}x${altura}`,
      aprovado: false,
      motivo: `sem fita na faixa: crista ${arred(picoMediano, 1)} < ${PISO_DA_CRISTA}`,
    };
  }

  let mansas = 0;
  for (let i = 1; i < colunas.length; i++) {
    if (Math.abs(colunas[i].y - colunas[i - 1].y) <= PASSO_MAX_DA_CRISTA) mansas++;
  }
  const fracaoMansa = mansas / (colunas.length - 1);
  if (fracaoMansa < MIN_DE_COLUNAS_MANSAS) {
    return {
      quadro: `${largura}x${altura}`,
      aprovado: false,
      motivo: `a crista salta: só ${Math.round(fracaoMansa * 100)}% das colunas andam devagar`,
    };
  }

  const cortes = [];
  for (const c of colunas) {
    if (c.pico < picoMediano * 0.5) continue;
    const m = medirOCorte(cinza, largura, c.x, c.y);
    if (m) cortes.push(m);
  }
  if (cortes.length < colunas.length * 0.5) {
    return {
      quadro: `${largura}x${altura}`,
      aprovado: false,
      motivo: `só ${cortes.length} de ${colunas.length} colunas deram corte medível`,
    };
  }

  const yMediano = Math.round(mediana(colunas.map((c) => c.y)));
  return {
    quadro: `${largura}x${altura}`,
    aprovado: true,
    motivo: '',
    faixa,
    colunas: colunas.length,
    medidas: cortes.length,
    colunasMansas: arred(fracaoMansa, 3),
    ceu: arred(mediana(cortes.map((c) => c.ceu)), 1),
    pico: arred(mediana(cortes.map((c) => c.pico)), 1),
    // OS DOIS NÚMEROS, em px de DISPOSITIVO
    subidaPx: arred(mediana(cortes.map((c) => c.subida)), 3),
    fwhmPx: arred(mediana(cortes.map((c) => c.fwhm)), 3),
    // ...e o mesmo par em px CSS, que é a régua em que a lei é escrita
    recorte: { x: Math.round(largura / 2) - 40, y: yMediano - 14, w: 80, h: 28 },
  };
}

/** A captura de UMA janela, com o carimbo do código que a produziu. */
async function capturar(janela, porta) {
  // a vista já pede `q=cinema`; a perna de dpr 1 troca o preset, para o
  // `pixelRatio` do engine casar com o da emulação
  const url = janela.q ? `${APP}${VISTA}`.replace('q=cinema', `q=${janela.q}`) : `${APP}${VISTA}`;
  const { png } = await capturarCDP({
    url,
    largura: janela.largura,
    altura: janela.altura,
    dpr: janela.dpr,
    porta,
  });
  return png;
}

async function principal() {
  const estado = process.env.ESTADO || 'depois';
  const dir = resolve('capturas', 'item83-b1-cru');
  mkdirSync(dir, { recursive: true });
  const carimbo = carimboDoCodigo();
  const saida = { estado, carimbo, vista: VISTA, janelas: [] };
  let porta = 9333;
  for (const janela of JANELAS) {
    process.stdout.write(`[beira] ${estado} · ${janela.nome} `
      + `${janela.largura}x${janela.altura} CSS · dpr ${janela.dpr}\n`);
    const png = await capturar(janela, porta++);
    const arquivo = resolve(dir, `${estado}-${janela.nome}.png`);
    writeFileSync(arquivo, png);
    const medida = medirPng(png);
    if (!medida.aprovado) {
      process.stdout.write(`  REPROVA: ${medida.motivo}\n`);
    } else {
      const cssSubida = medida.subidaPx / janela.dpr;
      const cssFwhm = medida.fwhmPx / janela.dpr;
      process.stdout.write(
        `  céu ${medida.ceu} · pico ${medida.pico} · `
        + `subida ${medida.subidaPx} px disp (${arred(cssSubida, 3)} CSS) · `
        + `FWHM ${medida.fwhmPx} px disp (${arred(cssFwhm, 3)} CSS)\n`
      );
    }
    saida.janelas.push({ ...janela, arquivo, ...medida });
  }
  const json = semSobrescrever(resolve('capturas', `item83-b1-${estado}.json`));
  writeFileSync(json, `${JSON.stringify(saida, null, 2)}\n`);
  process.stdout.write(`[beira] ${json}\n`);
  const reprovou = saida.janelas.some((j) => !j.aprovado);
  process.exitCode = reprovou ? 1 : 0;
}

/**
 * A FOLHA, desenhada pelo próprio Chrome — o mesmo caminho da folha do
 * item 104 (`costura-da-sombra.mjs`). O recorte e o zoom são de CSS
 * (`image-rendering: pixelated`), e não de um redimensionador nosso: o
 * que o dono vê na prancha são os PIXELS do quadro cru, ampliados sem
 * uma interpolação no meio que pudesse inventar a rampa que se alega.
 */
async function comporPrancha(zoom = 5) {
  const { abrirSessao } = await import('./chrome.mjs');
  const dir = resolve('capturas', 'item83-b1-cru');
  const lados = ['antes', 'depois'].map((estado) => ({
    estado,
    dados: JSON.parse(readFileSync(resolve('capturas', `item83-b1-${estado}.json`), 'utf8')),
  }));
  const largura = 1720;
  const celula = (lado, janela) => {
    const j = lado.dados.janelas.find((x) => x.nome === janela.nome);
    if (!j?.aprovado) return `<div class="c"><b>${lado.estado} · ${janela.nome}</b><i>${j?.motivo ?? 'sem medida'}</i></div>`;
    const r = j.recorte;
    const url = pathToFileURL(resolve(dir, `${lado.estado}-${janela.nome}.png`)).href;
    return `<div class="c">
      <b>${lado.estado} · janela ${janela.largura}×${janela.altura} CSS · fator ${janela.fatorEsperado}× · <u>dpr ${janela.dpr}</u>${janela.q ? ` · ?q=${janela.q}` : ''}</b>
      <div class="jan" style="width:${r.w * zoom}px;height:${r.h * zoom}px">
        <img src="${url}" style="left:${-r.x * zoom}px;top:${-r.y * zoom}px;width:${j.quadro.split('x')[0] * zoom}px">
      </div>
      <i>subida 10→90% <u>${j.subidaPx} px</u> · FWHM <u>${j.fwhmPx} px</u> (dispositivo)
      <br>= ${arred(j.subidaPx / janela.dpr, 2)} / ${arred(j.fwhmPx / janela.dpr, 2)} px CSS · céu ${j.ceu} · pico ${j.pico}</i>
    </div>`;
  };
  const html = `<meta charset="utf-8"><style>
    body{margin:0;background:#0b0d12;color:#dfe6f2;font:14px/1.5 -apple-system,system-ui,sans-serif;padding:22px}
    h1{font-size:19px;margin:0 0 4px}
    p{margin:0 0 18px;color:#93a0b8;font-size:13px;max-width:1600px}
    .g{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .c{background:#12151d;border:1px solid #232838;border-radius:8px;padding:12px}
    .c b{display:block;font-size:13px;margin-bottom:8px;color:#cfe0ff}
    .c i{display:block;margin-top:8px;font-style:normal;font-size:12px;color:#93a0b8}
    .c u{text-decoration:none;color:#ffd8a8}
    .jan{position:relative;overflow:hidden;border:1px solid #2c3346;background:#000}
    .jan img{position:absolute;image-rendering:pixelated}
  </style>
  <h1>Item 83 · B1 — a beira da fita: rampa, largura e o eixo</h1>
  <p>Zoom ${zoom}× em pixels crus (sem interpolação) no alto do laço de Saturno, corte perpendicular à fita.
  Cada LINHA é uma janela, com o mesmo recorte dos dois lados; o par de cada linha é o que se compara.
  <br><b>Os dois números.</b> A <i>subida</i> é quanto a luz demora a ir de 10% a 90% atravessando a beira —
  é o tamanho da RAMPA, e é o número do A2: beira dura sobe no espaço de um pixel, beira com saia sobe ao
  longo dela. A <i>FWHM</i> é a grossura do traço a meia altura — é o número do A3, que tem de ficar igual
  numa janela de lado 800 e crescer numa de 1200.
  <br><b>As três janelas.</b> As duas de dpr 2 são a tela dele, em fator 1× e 1,5×.
  A de <b>dpr 1</b> é o regime FINO de dispositivo, alcançável de verdade — preset <code>performance</code>,
  auto-degradação abaixo de 34 fps, monitor não-Retina. Ali a fita inchada vale 2,25 px de DISPOSITIVO e o
  <code>fwidth</code> do fragmento passa do miolo: sem o grampo <code>max(uMiolo − pixel, 0)</code> o começo
  da rampa fica NEGATIVO e o <b>centro da fita perde 15,6% de brilho</b> — perfil através da largura, que
  este item proíbe. Com o grampo, o eixo volta ao pleno e a rampa toma a fita inteira, que é o melhor que
  2,25 px permitem: <b>não há platô nessa densidade, e o item não promete um</b>.
  <br><b>A franja colorida não é da fita:</b> é a aberração cromática da lente da casa (<code>uCA</code>, no
  <code>post.ts</code>), mais forte longe do centro do quadro, e igual nos dois lados de cada par.
  <br>Antes: <code>${lados[0].dados.carimbo}</code> · Depois: <code>${lados[1].dados.carimbo}</code>.
  Reproduz com <code>ESTADO=antes|depois node scripts/visual/beira-da-fita.mjs</code> e <code>--prancha</code>.</p>
  <div class="g">
    ${JANELAS.map((j) => lados.map((l) => celula(l, j)).join('')).join('')}
  </div>`;
  const arquivo = resolve('capturas', `${process.env.SAIDA || 'item83-b1-beira'}.html`);
  writeFileSync(arquivo, html);
  const sessao = await abrirSessao({ janela: `${largura}x1200`, prefixo: 'folha83b1' });
  try {
    await sessao.send('Page.navigate', { url: pathToFileURL(arquivo).href });
    const prazo = Date.now() + 60000;
    let altura = 0;
    for (;;) {
      const r = await sessao.send('Runtime.evaluate', {
        expression: `(() => { const i=[...document.images];
          if (!i.length || !i.every((x) => x.complete && x.naturalWidth)) return 0;
          return document.documentElement.scrollHeight; })()`,
        returnByValue: true,
      });
      altura = r?.result?.value ?? 0;
      if (altura > 0 || Date.now() > prazo) break;
      await new Promise((f) => setTimeout(f, 200));
    }
    if (!altura) throw new Error('a prancha não carregou as imagens');
    const shot = await sessao.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: largura, height: altura, scale: 1 },
    });
    // AO LADO, NUNCA POR CIMA (regra 7 do AGENTS.md)
    const base = process.env.SAIDA || 'item83-b1-beira';
  const saida = semSobrescrever(resolve('capturas', `${base}.png`));
    writeFileSync(saida, Buffer.from(shot.data, 'base64'));
    process.stdout.write(`[beira] ${saida} · ${largura}x${altura}\n`);
  } finally {
    await sessao.fechar();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--prancha')) await comporPrancha();
  else await principal();
}
