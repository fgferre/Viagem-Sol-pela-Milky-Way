// Serve: dono — a junta da fita vinca em bissetriz em vez de abrir cunha ("fita dobrada, não linha grossa")
// Custo: ~0,4 min por estado (estimado — medir na próxima corrida)
// Fusão marcada (item 99, 30/08): beira+dobra+colar viram UM juiz da
// fita numa corrida só (3 boots de Chrome → 1) — executa quem tocar
// qualquer um dos três.
// ============================================================
// O JUIZ DA DOBRA — a fita VINCA na junta, ou abre cunha e dobra tinta?
//
//   node scripts/visual/dobra-da-fita.mjs              # captura, mede e julga
//   ESTADO=antes node scripts/visual/dobra-da-fita.mjs # o mesmo, com outro rótulo
//   node scripts/visual/dobra-da-fita.mjs --prancha    # compõe a folha dos crus
//
// ------------------------------------------------------------
// A QUEM ELE SERVE
// ------------------------------------------------------------
// Ao DONO, e a frase é dele, de 2026-08-26: *"lá a órbita parece uma FITA
// DOBRADA, não uma LINHA GROSSA; a nossa ainda parece linha grossa"*. É
// isto que este arquivo mede — o item 83 · B2, a junta em bissetriz.
// Nada aqui compara com a foto da referência: o alvo é a fita que vinca.
//
// ------------------------------------------------------------
// O DEFEITO QUE ELE MEDE
// ------------------------------------------------------------
// O `LineMaterial` empurra as pontas de cada quad na perpendicular
// DAQUELE segmento. Numa reta os quads casam; numa DOBRA não: por fora
// abre CUNHA e por dentro os dois quads se sobrepõem e, em blending
// aditivo, dobram tinta. O olho lê isso como uma sucessão de retas
// grossas — uma linha grossa.
//
// A CUNHA VALE `(w/2)·tan(θ/2)`, e é aí que mora a dificuldade deste
// juiz: numa elipse de 256 pontos vista de frente a dobra por junta é
// 1,4°, e a cunha dá 0,01 px — INVISÍVEL, e não é onde o defeito vive. O
// defeito vive onde a dobra PROJETADA é grande, e isso acontece nas
// PONTAS de uma elipse vista quase de perfil: ali a curva volta sobre si
// mesma e dois segmentos vizinhos chegam a divergir dezenas de graus.
//
// POR ISSO A VISTA É DE PERFIL. `?pos=` a 40 UA no plano da eclíptica
// (o equinócio vernal, que é o eixo x do frame equatorial da cena, e
// está nos DOIS planos) achata os nove laços em fusos finíssimos, e as
// pontas deles são as dobras mais fechadas que esta casa desenha. Uma
// vista de frente aprovaria qualquer coisa.
//
// ------------------------------------------------------------
// COMO ELE ISOLA A LINHA — e por que subtrai um quadro
// ------------------------------------------------------------
// A vista tem ESTRELAS e o Sol no meio, e uma delas cai justamente sobre
// a ponta direita. Qualquer limiar sobre o quadro cru acharia a estrela
// em vez da fita.
//
// A saída é a mesma que provou a inocência do A1: capturar o MESMO
// enquadramento com `&noorbitas=1` e SUBTRAIR. O que sobra é a luz que
// as linhas põem no quadro, e mais nada — sem estrela, sem Sol, sem
// bloom do Sol. O bloom da própria linha fica, e deve ficar: é luz dela.
//
// ------------------------------------------------------------
// O NÚMERO — e o que ele NÃO é
// ------------------------------------------------------------
// Numa caixa em volta de cada ponta, a TINTA (a soma da luz que só a
// linha põe ali) e os PIXELS ACESOS. A cunha COME tinta na ponta; a
// bissetriz a devolve. É um número de duas pontas, como o do juiz do
// colar: não existe limiar absoluto que separe "fita boa" de "fita com
// cunha" — o que existe é o mesmo endereço medido nos dois estados.
//
// E OS DOIS ESTADOS MEDEM-SE NO MESMO ENDEREÇO, sempre. A ponta anda um
// ou dois pixels entre eles, e uma caixa centrada na ponta que CADA lado
// achou mediria esse deslocamento em vez da cunha — na primeira redação
// deste juiz isso chegou a INVERTER o sinal do resultado. Quem escolhe o
// endereço é o ANTES, que é onde o defeito está.
//
// O TAMANHO, DITO SEM INFLAR: o ganho é local e é pequeno — poucos por
// cento de tinta na ponta mais fechada, e ~800 pixels de 4,3 milhões no
// quadro inteiro. Este juiz não existe para alegar transformação; existe
// para que a cunha não volte em silêncio, e para pôr a PONTA em zoom, que
// é onde o olho a vê.
//
// E ELE REPROVA QUANDO NÃO CONSEGUE MEDIR — nenhuma ponta achada, ponta
// magra demais para ser fita, quadros de tamanhos diferentes. Juiz que
// avisa em vez de reprovar é juiz que ninguém lê (a lição do MB1
// descalibrado, item 81).
// ============================================================
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { carimboDoCodigo } from './ab-identidade.mjs';
import { capturarCDP } from './chrome.mjs';
import { arred, cinzaDoPng, lerPng, percentil, semSobrescrever } from './luz-ab.mjs';

/**
 * A VISTA DE PERFIL — 40 UA no equinócio vernal, olhando o Sol. É a
 * mesma distância e o mesmo instante da vista do juiz do colar; o que
 * muda é o EIXO, e é ele que achata os laços.
 */
export const VISTA = '/?pos=0.00019393,0,0&look=0,0,0&jd=2460409.26395835&q=cinema&shot=2';
export const SEM_LINHA = '&noorbitas=1';
export const APP = process.env.APP_URL || 'http://127.0.0.1:5173';
export const JANELA = { largura: 1200, altura: 900, dpr: 2 };

/**
 * O NÍVEL DA FITA, em tinta de 255. Abaixo disto é bruma de bloom, e não
 * o traço — a primeira versão deste juiz usava 6 e ia parar numa faixa de
 * névoa a 130 px do fuso, medindo céu com nome de ponta.
 */
export const PISO_DA_TINTA = 40;
/** A meia-caixa medida em volta de cada ponta, em px de dispositivo. */
export const CAIXA = { meiaLargura: 30, meiaAltura: 16 };
/** Um pixel conta como ACESO a partir daqui. */
export const PISO_DO_ACESO = 25;
/** A ponta tem de estar ao menos isto longe da borda para a caixa caber. */
export const MARGEM_DA_BORDA = 40;
/**
 * Quão longe, para fora, uma ponta tem de ser a última da sua faixa. Um
 * pixel só é PONTA se não houver fita à direita dele (à esquerda, do
 * outro lado) por este tanto de colunas, na mesma altura.
 */
export const VAO_DA_PONTA = 30;
/** ...e essa mesma altura, em px — a fita tem ~5 px de grossura. */
export const MEIA_ALTURA_DA_PONTA = 6;
/** Quantas pontas a prancha mostra, das mais brilhantes para baixo. */
export const QUANTAS_PONTAS = 4;
/**
 * O TETO DO CÉU sob a ponta, em cinza de 255. Uma ponta que caia DENTRO
 * do clarão do Sol é medível mas não é olhável: a caixa sai branca e o
 * dono não vê dobra nenhuma. O nível vem do quadro SEM linha, que é
 * exatamente "o que estaria ali se a fita não existisse".
 */
export const TETO_DO_CEU = 60;

const mediana = (v) => percentil(v, 0.5);

/**
 * A DIFERENÇA dos dois quadros, em cinza: o que as linhas puseram na
 * tela. Negativo vira zero — a linha é ADITIVA e só pode somar luz, então
 * um resíduo negativo é ruído de compressão ou de quadro, nunca fita.
 */
export function tintaDasLinhas(comPng, semPng) {
  const a = lerPng(comPng);
  const b = lerPng(semPng);
  if (a.largura !== b.largura || a.altura !== b.altura) {
    throw new Error('os dois quadros têm tamanhos diferentes');
  }
  const com = cinzaDoPng(a);
  const sem = cinzaDoPng(b);
  const tinta = new Float32Array(com.length);
  for (let i = 0; i < com.length; i++) tinta[i] = Math.max(0, com[i] - sem[i]);
  return { tinta, ceu: sem, largura: a.largura, altura: a.altura };
}

/**
 * AS PONTAS DOS FUSOS — os lugares em que a fita ACABA numa altura, que
 * numa elipse achatada é exatamente onde a curva volta sobre si mesma.
 *
 * A REGRA É GEOMÉTRICA, e não um endereço decorado: um pixel de fita é
 * PONTA quando não há mais fita à frente dele — `VAO_DA_PONTA` colunas
 * adiante, dentro de `MEIA_ALTURA_DA_PONTA` linhas — de UM dos dois
 * lados. Onde a fita passa reto há fita dos dois lados, e ali não há
 * ponta. Cada aglomerado rende UMA ponta, a mais brilhante dele, senão
 * uma dobra viraria dez.
 *
 * DUAS PENEIRAS, e as duas são de instrumento: o piso de tinta, que
 * separa o traço da bruma do bloom, e o teto de céu, que joga fora a
 * ponta afogada no clarão do Sol — medível, mas não olhável em zoom.
 *
 * Devolve as pontas da mais brilhante para a menos, com o `lado` (`1`
 * para a que acaba à direita, `-1` à esquerda) que a achou.
 */
export function acharAsPontas(tinta, ceu, largura, altura) {
  const em = (x, y) => tinta[y * largura + x];
  /** há fita nesta altura, `VAO_DA_PONTA` colunas para o lado `lado`? */
  const temFitaAdiante = (x, y, lado) => {
    for (let d = 1; d <= VAO_DA_PONTA; d++) {
      const nx = x + d * lado;
      if (nx < 0 || nx >= largura) break;
      for (let ny = y - MEIA_ALTURA_DA_PONTA; ny <= y + MEIA_ALTURA_DA_PONTA; ny++) {
        if (ny >= 0 && ny < altura && em(nx, ny) >= PISO_DA_TINTA) return true;
      }
    }
    return false;
  };
  const achadas = [];
  for (let y = MARGEM_DA_BORDA; y < altura - MARGEM_DA_BORDA; y++) {
    for (let x = MARGEM_DA_BORDA; x < largura - MARGEM_DA_BORDA; x++) {
      const v = em(x, y);
      if (v < PISO_DA_TINTA) continue;
      if (ceu[y * largura + x] >= TETO_DO_CEU) continue; // afogada no clarão
      const lado = temFitaAdiante(x, y, 1) ? (temFitaAdiante(x, y, -1) ? 0 : -1) : 1;
      if (lado === 0) continue; // fita passa reto: não é ponta
      // fica a MAIS extrema de um aglomerado, para uma ponta não virar dez
      const perto = achadas.find(
        (p) => Math.abs(p.x - x) <= VAO_DA_PONTA && Math.abs(p.y - y) <= MEIA_ALTURA_DA_PONTA * 2
      );
      if (!perto) achadas.push({ x, y, lado, pico: v });
      else if (v > perto.pico) Object.assign(perto, { x, y, lado, pico: v });
    }
  }
  return achadas
    .map((p) => ({ ...p, pico: arred(p.pico, 1) }))
    .sort((a, b) => b.pico - a.pico);
}

/**
 * A TINTA POR COLUNA na faixa da ponta, e a ASPEREZA dela. Pura, sobre a
 * diferença já calculada — é ela que `dobra-da-fita.test.mjs` cobra sobre
 * perfis sintéticos.
 */
export function tintaNaPonta(tinta, largura, ponta) {
  const { meiaLargura: hw, meiaAltura: hh } = CAIXA;
  const x0 = ponta.x - hw;
  const y0 = ponta.y - hh;
  let soma = 0;
  let acesos = 0;
  const colunas = [];
  for (let i = 0; i <= hw * 2; i++) {
    let coluna = 0;
    for (let j = 0; j <= hh * 2; j++) {
      const v = tinta[(y0 + j) * largura + (x0 + i)];
      coluna += v;
      if (v >= PISO_DO_ACESO) acesos++;
    }
    colunas.push(coluna);
    soma += coluna;
  }
  return {
    caixa: { x: x0, y: y0, w: hw * 2 + 1, h: hh * 2 + 1 },
    tinta: Math.round(soma),
    acesos,
    colunaMediana: arred(mediana(colunas), 1),
  };
}

/** O caminho inteiro sobre os dois quadros em memória. */
export function medirPar(comPng, semPng) {
  const { tinta, ceu, largura, altura } = tintaDasLinhas(comPng, semPng);
  const pontas = acharAsPontas(tinta, ceu, largura, altura);
  if (!pontas.length) {
    return { quadro: `${largura}x${altura}`, aprovado: false, motivo: 'nenhuma ponta de fuso achada' };
  }
  const medidas = pontas.slice(0, QUANTAS_PONTAS).map((p) => ({ ...p, ...tintaNaPonta(tinta, largura, p) }));
  const magra = medidas.find((m) => m.acesos < 20);
  if (magra) {
    return {
      quadro: `${largura}x${altura}`,
      aprovado: false,
      motivo: `ponta (${magra.x},${magra.y}) com ${magra.acesos} pixels acesos: não é fita`,
    };
  }
  return { quadro: `${largura}x${altura}`, aprovado: true, motivo: '', pontas: medidas };
}

async function capturar(url, porta) {
  const { png } = await capturarCDP({
    url, largura: JANELA.largura, altura: JANELA.altura, dpr: JANELA.dpr, porta,
  });
  return png;
}

async function principal() {
  const estado = process.env.ESTADO || 'depois';
  const dir = resolve('capturas', 'item83-b2-cru');
  mkdirSync(dir, { recursive: true });
  process.stdout.write(`[dobra] ${estado} · vista de perfil · dpr ${JANELA.dpr}\n`);
  const com = await capturar(`${APP}${VISTA}`, 9351);
  const sem = await capturar(`${APP}${VISTA}${SEM_LINHA}`, 9352);
  writeFileSync(resolve(dir, `${estado}-com.png`), com);
  writeFileSync(resolve(dir, `${estado}-sem.png`), sem);
  const medida = medirPar(com, sem);
  const saida = { estado, carimbo: carimboDoCodigo(), vista: VISTA, ...medida };
  if (!medida.aprovado) process.stdout.write(`  REPROVA — ${medida.motivo}\n`);
  else {
    for (const p of medida.pontas) {
      process.stdout.write(
        `  ponta (${p.x},${p.y}) lado ${p.lado > 0 ? 'dir' : 'esq'} · `
        + `tinta ${p.tinta} · acesos ${p.acesos}\n`
      );
    }
  }
  const json = semSobrescrever(resolve('capturas', `item83-b2-${estado}.json`));
  writeFileSync(json, `${JSON.stringify(saida, null, 2)}\n`);
  process.stdout.write(`[dobra] ${json}\n`);
  process.exitCode = medida.aprovado ? 0 : 1;
}

/** A folha, desenhada pelo próprio Chrome — o molde da folha do item 104. */
async function comporPrancha(zoom = 6) {
  const { abrirSessao } = await import('./chrome.mjs');
  const dir = resolve('capturas', 'item83-b2-cru');
  const lados = ['antes', 'depois'].map((estado) => ({
    estado,
    dados: JSON.parse(readFileSync(resolve('capturas', `item83-b2-${estado}.json`), 'utf8')),
  }));
  const largura = 1720;
  // AS PONTAS SÃO AS DO ANTES, e os dois lados recortam E MEDEM nas
  // MESMAS coordenadas: é o defeito que escolhe o endereço, não o
  // conserto. Medir cada lado na ponta que ELE achou vicia a conta — a
  // ponta anda um ou dois pixels entre os dois estados, e a caixa passa a
  // medir o deslocamento em vez da cunha.
  const enderecos = (lados[0].dados.pontas ?? []).map((p) => ({ x: p.x, y: p.y }));
  const tintaDe = (estado) =>
    tintaDasLinhas(
      readFileSync(resolve(dir, `${estado}-com.png`)),
      readFileSync(resolve(dir, `${estado}-sem.png`))
    );
  const medido = Object.fromEntries(
    lados.map((l) => {
      const { tinta, largura: w } = tintaDe(l.estado);
      return [l.estado, { w, pontas: enderecos.map((p) => tintaNaPonta(tinta, w, p)) }];
    })
  );
  const celula = (lado, i) => {
    const p = medido[lado.estado].pontas[i];
    const r = p.caixa;
    const url = pathToFileURL(resolve(dir, `${lado.estado}-com.png`)).href;
    return `<div class="c">
      <b>${lado.estado} · ponta do fuso em (${enderecos[i].x}, ${enderecos[i].y})</b>
      <div class="jan" style="width:${r.w * zoom}px;height:${r.h * zoom}px">
        <img src="${url}" style="left:${-r.x * zoom}px;top:${-r.y * zoom}px;width:${medido[lado.estado].w * zoom}px">
      </div>
      <i>tinta na caixa <u>${p.tinta}</u> · pixels acesos <u>${p.acesos}</u></i>
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
  <h1>Item 83 · B2 — a junta vira bissetriz: a fita fecha a ponta</h1>
  <p>Zoom ${zoom}× em pixels crus nas PONTAS dos fusos — as órbitas vistas de perfil, onde a curva volta
  sobre si mesma. É a dobra mais fechada que esta casa desenha, e por isso é aqui que se julga:
  numa elipse vista de frente a dobra por junta é 1,4° e a cunha vale 0,01 px, invisível.
  <br><b>Em cima</b> os quads são empurrados na perpendicular de CADA segmento, e na dobra isso abre
  CUNHA por fora — a ponta do fuso sai CORTADA, com um degrau reto onde deveria fechar em bico.
  <b>Embaixo</b> as pontas empurram na BISSETRIZ das duas perpendiculares e a fita vinca: a ponta fecha.
  <br>O número é a <i>tinta na caixa</i> em volta da ponta — a luz que a cunha comia e a bissetriz devolve —
  e os <i>pixels acesos</i>. As estrelas e o Sol saem por subtração de um quadro com <code>&noorbitas=1</code>,
  então o que se mede é só a linha.
  <br><b>O tamanho, dito sem inflar:</b> o ganho é local. Na ponta mais fechada dá poucos por cento de
  tinta e um punhado de pixels; no quadro inteiro mudam ~800 pixels de 4,3 milhões. O que a bissetriz
  conserta é a PONTA, e é lá que se olha.
  <br>Recortes nos endereços das pontas do ANTES, iguais nos dois lados.
  Antes: <code>${lados[0].dados.carimbo}</code> · Depois: <code>${lados[1].dados.carimbo}</code>.
  Reproduz com <code>ESTADO=antes|depois node scripts/visual/dobra-da-fita.mjs</code> e <code>--prancha</code>.</p>
  <div class="g">
    ${enderecos.map((_, i) => lados.map((l) => celula(l, i)).join('')).join('')}
  </div>`;
  const arquivo = resolve('capturas', 'item83-b2-dobra.html');
  writeFileSync(arquivo, html);
  const sessao = await abrirSessao({ janela: `${largura}x1200`, prefixo: 'folha83b2' });
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
    const saida = semSobrescrever(resolve('capturas', 'item83-b2-dobra.png'));
    writeFileSync(saida, Buffer.from(shot.data, 'base64'));
    process.stdout.write(`[dobra] ${saida} · ${largura}x${altura}\n`);
  } finally {
    await sessao.fechar();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--prancha')) await comporPrancha();
  else await principal();
}
