// ============================================================
// A CHAPA DO MODO REAL — a prancha da Q14 do dono (item 91).
//
//   node scripts/visual/chapa-do-real.mjs <pasta> <antes|depois> [app]
//   node scripts/visual/chapa-do-real.mjs --folha [pasta-cru] [saida]
//
// A QUEM SERVE. À decisão dele de 26/08, verbatim: *"R1 — +3 passos
// fixos, sempre os mesmos, declarados no selo"*. Ele escolheu a coluna R1
// da folha `capturas/item93-calib-real.png`, que foi capturada com a porta
// `?luz=real&exp=8.16`; a obra embarcou esses +3 passos no MODO, e o que
// esta prancha tem de mostrar são TRÊS coisas ao mesmo tempo:
//
//   1. o ANTES — o `?luz=real` que ele reprovou (*"escuro demais"*);
//   2. o DEPOIS — o mesmo endereço, com a chapa aberta pelo modo;
//   3. o SELO declarando os passos, que é a segunda metade da Q14
//      (*"declarados no selo"*). Sem isto a foto provaria só a metade
//      bonita — a casa abriria a exposição em silêncio.
//
// POR QUE NÃO É O `costura-da-sombra.mjs`. Aquele arquivo é do item 104
// (a costura sombra→noite) e está sob auditoria de outra frente; o eixo
// dele é `antes × depois` do MESMO shader, sem HUD, e a prancha dele é a
// daquela pergunta. O que NÃO se duplica aqui é o que importa: a VISTA
// sai de lá por import (`VISTAS['saturno-real']`, que é literalmente a
// câmera da coluna R1 da folha), o tamanho do quadro também, a medida é
// do `luz-ab.mjs` e o navegador é o `chrome.mjs`. O que este arquivo tem
// de próprio são ~80 linhas: o painel do SELO — que precisa de HUD, de
// clique e de fase Atlas, e por isso não cabe no capturarCDP de lá — e a
// legenda desta pergunta.
//
// A HONESTIDADE DA COMPARAÇÃO COM A R1: a folha foi capturada ANTES da C1
// (item 93) e antes do S1/S2 (item 104), então o quadro de hoje não tem
// obrigação de sair byte a byte igual ao `r1-saturno-real.png`. O que ele
// TEM de fazer é sair com a mesma CHAPA — e é isso que a legenda mede,
// com o resto explicado em número.
//
// NÃO TEM TESTE DE UNIDADE, pela mesma razão do vizinho: aqui não há
// conta a conferir. Quem MEDE é `luz-ab.mjs`, que tem o seu
// `luz-ab.test.mjs` campo por campo; o que este arquivo tem é ENDEREÇO, e
// endereço se confere olhando a foto.
// ============================================================
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { APP_PADRAO, abrirSessao, capturarCDP, dorme, esperarCapaSair, esperarPor } from './chrome.mjs';
import { ALTURA, LARGURA, VISTAS } from './costura-da-sombra.mjs';

/**
 * A VISTA, importada e não redigitada: `saturno-real` de
 * `costura-da-sombra.mjs` É a câmera da coluna R1 — Saturno a 4 raios,
 * fase 67°, na data pinada de 2024-04-08 —, e o que a R1 tinha a mais era
 * só o `&exp=8.16` que a obra tornou desnecessário.
 */
export const VISTA = 'saturno-real';

/**
 * O PAINEL DO SELO. Não é a mesma URL das outras: `?shot=2` APAGA o HUD,
 * e o que se quer provar aqui é justamente o que está escrito no HUD.
 * Então este painel é a VISITA de verdade — Atlas, foco em Saturno, no
 * degrau do corpo, com `?luz=real` — e a data sai da própria vista acima,
 * para as duas contarem o mesmo dia.
 */
function urlDoSelo() {
  const jd = new URLSearchParams(VISTAS[VISTA].url.slice(1)).get('jd');
  return `atlas=1&foco=saturn&ver=corpo&luz=real&q=cinema&jd=${jd}`;
}

/**
 * Abre o Atlas na visita real, ABRE o selo com um clique de verdade e
 * fotografa. O clique é o mesmo gesto da prova 20 do `atlas-smoke`: a
 * gaveta do selo não vai para a URL nem para o storage (é chrome, não
 * domínio), então não há link que a abra — quem a abre é o ponteiro.
 */
async function capturarSelo(app) {
  const sessao = await abrirSessao({ janela: `${LARGURA}x${ALTURA}`, app, prefixo: 'chapa-selo' });
  try {
    await sessao.ir(urlDoSelo());
    // A CAPA DE CARGA POR CIMA DE TUDO — a armadilha que este painel
    // pisou na primeira corrida, e ela está declarada em `chrome.mjs`: o
    // `md5()` de lá espera a capa sair porque "num quadro COM HUD ela é o
    // que impede a foto de sair com a tela de carga por cima". Um
    // `Page.captureScreenshot` cru não espera nada, e a foto saiu sendo a
    // tela de carregamento — sem HUD, sem Saturno, sem selo.
    const capa = await esperarCapaSair(sessao.send);
    if (capa.estado === 'erro' || capa.estado === 'ficou') {
      throw new Error(`a capa de carga não saiu (${capa.estado}, ${capa.ms} ms)`);
    }
    // ...e o corpo tem de estar EM FOCO: sem isso o selo declara a chapa
    // sobre uma vista que não é a visita
    await esperarPor(
      sessao,
      'window.__director && window.__director.selo.stopsDoGloboEmFoco !== null',
      30000
    );
    // A FICHA DO OBJETO abre sozinha com `?foco=`, e ela cobre metade da
    // gaveta do selo — foi o que emporcalhou a primeira recomposição. Ela
    // é um DIÁLOGO, então fechá-la é o gesto do visitante que quer olhar
    // a cena; o nome de Saturno segue escrito na barra de cima, que é o
    // que prova de que visita esta foto é.
    await sessao.js(
      "(()=>{const b=[...document.querySelectorAll('button')]"
      + ".find((e)=>e.getAttribute('aria-label')==='Fechar a ficha');"
      + 'if (b) b.click();})()'
    );
    await dorme(400);
    const caixa = JSON.parse(
      await sessao.js(
        `JSON.stringify((()=>{const e=document.querySelector('.atlas-selo-resumo');`
        + `if(!e) return null; const r=e.getBoundingClientRect();`
        + `return {x:r.x+r.width/2,y:r.y+r.height/2};})())`
      )
    );
    if (!caixa) throw new Error('o selo não está na tela — o HUD não desenhou');
    await sessao.clicar(caixa.x, caixa.y);
    await dorme(600);
    const texto = await sessao.js(
      "document.querySelectorAll('.atlas-selo-linha')[1].textContent"
    );
    // O RECORTE SAI DA PRÓPRIA TELA, medido, e não de coordenadas
    // digitadas à mão: a caixa do selo cresce com a copy (esta obra
    // acrescentou uma frase a ela) e com `?ui=`, então um retângulo
    // decorado envelheceria calado — foi o que aconteceu na primeira
    // recomposição desta prancha, que cortou a declaração ao meio.
    // …e é a UNIÃO de duas caixas, não a do `.atlas-selo`: a gaveta
    // (`.atlas-selo-detalhe`) é `position: absolute` de propósito — ela
    // cresce PARA CIMA sem mover a linha fechada, para que abrir o selo
    // não mexa no enquadramento —, então ela NÃO entra no rect do pai. A
    // primeira versão disto mediu 179×17, que é só a linha fechada.
    const caixaDoSelo = JSON.parse(
      await sessao.js(
        `JSON.stringify((()=>{`
        + `const r=[...document.querySelectorAll('.atlas-selo,.atlas-selo-detalhe')]`
        + `.map((e)=>e.getBoundingClientRect());`
        + `const x=Math.min(...r.map((b)=>b.left)), y=Math.min(...r.map((b)=>b.top));`
        + `return {x:Math.floor(x),y:Math.floor(y),`
        + `largura:Math.ceil(Math.max(...r.map((b)=>b.right))-x),`
        + `altura:Math.ceil(Math.max(...r.map((b)=>b.bottom))-y),`
        // O QUADRO REAL DESTA FOTO, e ele NÃO é 1100×900. `abrirSessao`
        // pede `--window-size`, e a moldura do Chrome come a diferença: a
        // foto sai 1100×813. É a lição do item 81 (o MB1 media 640×613
        // achando que media 640×700). Sem este par a prancha estica a
        // imagem em 900/813 = 1,107 e o recorte desliza ~47 px — foi
        // exatamente o que aconteceu na segunda recomposição.
        + `quadro:{largura:window.innerWidth,altura:window.innerHeight}};})())`
      )
    );
    const shot = await sessao.send('Page.captureScreenshot', { format: 'png' });
    return { png: Buffer.from(shot.data, 'base64'), texto, caixaDoSelo };
  } finally {
    await sessao.fechar();
  }
}

// ============================================================
// A PRANCHA — recomposta dos crus dos DOIS estados.
// A legenda carrega o NÚMERO medido e o ARQUIVO da medida, como manda a
// casa: quem duvidar refaz a conta com `luz-ab.mjs par` sobre o mesmo cru.
// ============================================================
const PRANCHA = {
  arquivo: 'item91-real-r1',
  titulo: 'Item 91 · o modo real ganha +3 passos de exposição (a sua R1)',
  colunas: [
    ['antes', 'ANTES — o `?luz=real` que você reprovou ("escuro demais")'],
    ['depois', 'DEPOIS — o mesmo endereço, +3 passos de chapa'],
  ],
  texto: [],
};

/**
 * O RECORTE DO SELO — MEDIDO na captura, nunca digitado. O painel inteiro
 * de 1100×900 esticado em 1880 px deixaria a copy do selo com ~7 px de
 * altura: a foto provaria que existe uma linha, não o que ela DIZ, que é
 * a metade da Q14 que este arquivo existe para mostrar. A caixa vem do
 * `getBoundingClientRect` do próprio `.atlas-selo` no quadro fotografado
 * (ver {@link capturarSelo}), com uma folga para a moldura respirar.
 */
const FOLGA_DO_RECORTE = 12;

function paginaDaPrancha(dirCru, largura, textos, caixa) {
  const corte = {
    x: Math.max(0, caixa.x - FOLGA_DO_RECORTE),
    y: Math.max(0, caixa.y - FOLGA_DO_RECORTE),
    largura: caixa.largura + 2 * FOLGA_DO_RECORTE,
    altura: caixa.altura + 2 * FOLGA_DO_RECORTE,
  };
  const kSelo = (largura - 40) / corte.largura;
  return paginaComRecorte(dirCru, largura, textos, corte, kSelo, caixa.quadro);
}

function paginaComRecorte(dirCru, largura, textos, SELO_CORTE, kSelo, quadro) {
  const painel = Math.round((largura - 40 - 10) / 2);
  const k = painel / LARGURA;
  const col = ([nome, rotulo]) => `<div class="col">
      <div class="rot">${rotulo}</div>
      <div class="p" style="height:${Math.round(ALTURA * k)}px">
        <img src="file://${resolve(dirCru, `${nome}-${VISTA}.png`)}"
          style="width:${Math.round(LARGURA * k)}px;height:${Math.round(ALTURA * k)}px"></div>
    </div>`;
  return `<!doctype html><meta charset="utf-8"><style>
    :root { color-scheme: dark }
    * { box-sizing: border-box }
    body { margin:0; background:#07080c; color:#e8e8ee;
      font: 15.5px/1.42 -apple-system, "Helvetica Neue", Arial, sans-serif; width:${largura}px }
    header { padding:18px 20px 12px }
    h1 { margin:0 0 9px; font-size:26px; letter-spacing:-.2px }
    p { margin:0 0 6px; color:#b9bcc9; font-size:15px }
    .cols { display:flex; gap:10px; padding:0 20px }
    .lupa { padding:9px 20px 2px; color:#8d93a6; font-size:14px; font-weight:600;
      letter-spacing:.3px; text-transform:uppercase }
    .col { width:${painel}px }
    .rot { color:#e8b45a; font-weight:700; font-size:15px; padding:0 0 6px }
    .p { width:${painel}px; overflow:hidden; border-radius:3px; background:#000 }
    img { display:block }
    .selo { padding:0 20px; }
    .selo .jan { width:${largura - 40}px; height:${Math.round(SELO_CORTE.altura * kSelo)}px;
      overflow:hidden; border-radius:3px; background:#000 }
    .selo img { width:${Math.round(quadro.largura * kSelo)}px;
      height:${Math.round(quadro.altura * kSelo)}px;
      margin-left:${-Math.round(SELO_CORTE.x * kSelo)}px;
      margin-top:${-Math.round(SELO_CORTE.y * kSelo)}px }
    footer { padding:12px 20px 18px; color:#6f7488; font-size:13.5px }
  </style><header><h1>${PRANCHA.titulo}</h1>${textos.map((t) => `<p>${t}</p>`).join('')}</header>
  <div class="cols">${PRANCHA.colunas.map(col).join('')}</div>
  <div class="lupa">e o selo diz o que a chapa fez — a segunda metade da sua R1
    (a visita a Saturno no Atlas, com o selo aberto; recorte ampliado ${kSelo.toFixed(1)}×)</div>
  <div class="selo"><div class="jan">
    <img src="file://${resolve(dirCru, 'depois-selo.png')}"></div></div>
  <footer>Quadros crus em capturas/item91-real-cru/ · recompõe-se com
    <b>node scripts/visual/chapa-do-real.mjs --folha</b> · as medidas são
    <b>luz-ab.mjs par</b>, com carimbo de código no próprio arquivo</footer>`;
}

async function comporFolha(dirCru, dirSaida, textos, caixa) {
  const { semSobrescrever } = await import('./luz-ab.mjs');
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const larguraDaFolha = 1920;
  const tmp = mkdtempSync(resolve(tmpdir(), 'folha91-'));
  const sessao = await abrirSessao({ janela: `${larguraDaFolha}x1200`, prefixo: 'folha91' });
  try {
    const html = resolve(tmp, `${PRANCHA.arquivo}.html`);
    writeFileSync(html, paginaDaPrancha(dirCru, larguraDaFolha, textos, caixa));
    await sessao.send('Page.navigate', { url: `file://${html}` });
    const prazo = Date.now() + 60000;
    let altura = 0;
    for (;;) {
      const r = await sessao.send('Runtime.evaluate', {
        expression: `(() => {
          const imgs = [...document.images];
          if (!imgs.length || !imgs.every((i) => i.complete && i.naturalWidth)) return 0;
          return document.documentElement.scrollHeight;
        })()`,
        returnByValue: true,
      });
      altura = r?.result?.value ?? 0;
      if (altura > 0 || Date.now() > prazo) break;
      await dorme(200);
    }
    if (!altura) throw new Error('as imagens da prancha não decodificaram');
    await sessao.send('Emulation.setDeviceMetricsOverride', {
      width: larguraDaFolha, height: altura, deviceScaleFactor: 1, mobile: false,
    });
    const shot = await sessao.send('Page.captureScreenshot', { format: 'png' });
    const destino = semSobrescrever(resolve(dirSaida, `${PRANCHA.arquivo}.png`));
    writeFileSync(destino, Buffer.from(shot.data, 'base64'));
    process.stdout.write(`${destino} (${larguraDaFolha}×${altura})\n`);
  } finally {
    await sessao.fechar();
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [destino, estado, app = APP_PADRAO] = process.argv.slice(2);
  if (!destino) {
    throw new Error('uso: chapa-do-real.mjs <pasta> <antes|depois> [app]');
  }
  if (destino === '--folha') {
    const { readFileSync } = await import('node:fs');
    const cru = estado ?? 'capturas/item91-real-cru';
    // a legenda sai do arquivo de medida, e não de números digitados à
    // mão duas vezes: quem editar a medida edita a legenda junto
    const legenda = JSON.parse(readFileSync(resolve(cru, 'legenda.json'), 'utf8'));
    // a caixa do selo foi MEDIDA na captura e gravada ao lado do quadro:
    // a prancha recorta pelo que a tela tinha, não por um número decorado
    const caixa = JSON.parse(readFileSync(resolve(cru, 'selo-caixa.json'), 'utf8'));
    await comporFolha(cru, app === APP_PADRAO ? 'capturas' : app, legenda.texto, caixa);
    process.exit(0);
  }
  if (estado !== 'antes' && estado !== 'depois') {
    throw new Error('o estado do código tem de ser `antes` ou `depois`');
  }
  mkdirSync(destino, { recursive: true });
  process.stdout.write(`${VISTA} · ${estado}: `);
  const { png, via, ms } = await capturarCDP({
    url: `${app}/${VISTAS[VISTA].url}`,
    largura: LARGURA, altura: ALTURA, porta: 9711, dpr: 1,
  });
  writeFileSync(resolve(destino, `${estado}-${VISTA}.png`), png);
  process.stdout.write(`${(png.length / 1024).toFixed(0)} kB por via=${via} em ${(ms / 1000).toFixed(1)}s\n`);
  // o SELO só se fotografa do lado DEPOIS: antes da obra não há chapa a
  // declarar, e um painel do selo no `antes` seria enfeite
  if (estado === 'depois') {
    process.stdout.write('selo · depois: ');
    const { png: selo, texto, caixaDoSelo } = await capturarSelo(app);
    writeFileSync(resolve(destino, 'depois-selo.png'), selo);
    writeFileSync(resolve(destino, 'selo-caixa.json'), `${JSON.stringify(caixaDoSelo, null, 2)}\n`);
    process.stdout.write(`${(selo.length / 1024).toFixed(0)} kB\n  linha BRILHO: ${texto.trim()}\n`);
  }
  process.exit(0);
}
