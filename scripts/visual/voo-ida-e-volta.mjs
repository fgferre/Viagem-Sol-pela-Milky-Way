// Serve: chão — ida e volta nos MESMOS 34 degraus: transição e histerese não travam estado entre os sentidos
// Custo: 1,0 min
// ============================================================
// O VOO DE IDA E VOLTA — a bancada que enxerga MOVIMENTO (item 11).
//
// Pedido do dono, 15/08: "testar tanto o afastamento do sol até aparecer
// os spikes e depois quando ele virar uma bolinha de novo. e depois fazer
// o caminho inverso NA MESMA RUN para voltar até o sol procedural e ver
// se tudo funciona." A palavra que importa é MESMA RUN: os gates da casa
// têm histerese (armam num tamanho, desarmam noutro), e defeito de estado
// que trava na ida só aparece na volta. Captura congelada de página
// recém-carregada nunca vê isso — cada load nasce com o estado zerado.
//
// O que este harness faz, numa SESSÃO só de Chrome:
//  1. carrega o app perto da fotosfera e espera assentar;
//  2. voa em degraus logarítmicos até o fundo (os espinhos acendem no
//     caminho) usando `director.placeCamera` — o MESMO método dos
//     deep-links, determinístico desde o quadro 1;
//  3. voa de volta, pelos MESMOS degraus, sem recarregar nada;
//  4. em cada degrau: espera quadros assentarem, tira o retrato, mede
//     (luz média, % acima de meia luz, borrão central — a régua de
//     `luz-do-quadro.mjs`) e anota o ESTADO vivo (gate do corpo, cessão);
//  5. no fim, compara ida × volta degrau a degrau. Diferença DENTRO da
//     banda de histerese do gate (o corpo arma a 4 px e desarma a 2 px —
//     entre os dois, ida e volta LEGITIMAMENTE diferem) é declarada;
//     diferença FORA dela é defeito e reprova.
//
// Uso:
//   node scripts/visual/voo-ida-e-volta.mjs                # o voo padrão
//   EXTRA='&bemis=0&bbloom=0&bfoto=0&bcede=0' node ...     # o desenho antigo
//   JANELA=900x900 node scripts/visual/voo-ida-e-volta.mjs # (padrão)
//
// Saídas: capturas/voo-<ida|volta>-<ua>ua<SUFIXO>.png por degrau e
// capturas/voo-ida-e-volta<SUFIXO>.json com medidas + estado + veredito.
// Exit ≠ 0 se houver assimetria fora da banda declarada ou tela cega.
// ============================================================
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { abrirSessao, dorme } from './chrome.mjs';
import { tetoDeLavagem } from './luz-do-quadro.mjs';

const RAIZ = resolve(new URL('.', import.meta.url).pathname, '..', '..');
const CAPTURAS = resolve(RAIZ, 'capturas');
mkdirSync(CAPTURAS, { recursive: true });

const EXTRA = process.env.EXTRA ?? '';
const JANELA = process.env.JANELA ?? '900x900';
// o mesmo sufixo-de-arquivo da régua da luz: uma leva com knob nunca
// pisa nos arquivos da leva oficial
const SUFIXO = (EXTRA + (JANELA === '900x900' ? '' : `-${JANELA}`))
  .replaceAll('&', '-').replaceAll('=', '').replaceAll('.', 'p')
  .replace(/^-/, '');
const SUF = SUFIXO ? `-${SUFIXO}` : '';

const UA_POR_PC = 206264.80624548031;

// A ESCADA DO VOO: da fotosfera visível (0,05 UA) até depois de os
// espinhos acenderem (20.000 UA ≈ 0,097 pc > a janela 0,02–0,05 pc da
// entrega ponto→clarão). Seis degraus por década — fino o bastante para
// uma transição de uma década não caber inteira entre dois retratos.
const DEGRAUS_UA = [];
for (let e = Math.log10(0.05); e <= Math.log10(20000) + 1e-9; e += 1 / 6) {
  DEGRAUS_UA.push(Number(Math.pow(10, e).toPrecision(3)));
}

// A BANDA DA HISTERESE, em UA, DERIVADA e não digitada: o corpo arma com
// 4 px e desarma com 2 px (LIMIAR_DO_GATE_PX / CUSHION, corpos.ts), então
// entre a distância-de-4px e a distância-de-2px o estado depende do
// SENTIDO do voo — ida e volta diferem de propósito. A conta é a inversa
// de `diametroAparentePx` para a janela do voo, feita no navegador (a
// mesma fonte de verdade do app), preenchida no arranque.
let BANDA_UA = { de: 0, ate: 0 };

/** as três medidas da régua da luz (espelho de `medirQuadro`,
 *  luz-do-quadro.mjs — luminância Rec.709 do PNG já tonemapado) */
async function medir(png) {
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  let soma = 0;
  let acima = 0;
  for (let i = 0; i < W * H; i++) {
    const o = i * C;
    const y = (0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]) / 255;
    soma += y;
    if (y > 0.5) acima++;
  }
  // o borrão: diâmetro da mancha contígua acima de meia luz na linha do
  // meio, a partir do centro — 0 se o centro está escuro
  const meio = Math.floor(H / 2) * W;
  const yEm = (x) => {
    const o = (meio + x) * C;
    return (0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]) / 255;
  };
  const cx = Math.floor(W / 2);
  let borrao = 0;
  if (yEm(cx) > 0.5) {
    let esq = cx;
    let dir = cx;
    while (esq > 0 && yEm(esq - 1) > 0.5) esq--;
    while (dir < W - 1 && yEm(dir + 1) > 0.5) dir++;
    borrao = dir - esq + 1;
  }
  return {
    luzMedia: soma / (W * H),
    acimaDeMeia: acima / (W * H),
    borrao,
  };
}

async function voar() {
  const s = await abrirSessao({ janela: JANELA, prefixo: 'voo' });
  const aval = async (expr) => {
    const r = await s.send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.exceptionDetails) {
      throw new Error(`eval falhou: ${r.exceptionDetails.text ?? 'sem texto'} em ${expr.slice(0, 80)}`);
    }
    return r.result.value;
  };
  try {
    // O CONVITE de primeira visita (Spotlight) escurece a CENA INTEIRA
    // e mascararia toda medida de luz; o voo é visitante recorrente por
    // definição. A marca vai pelo MESMO canal do app (viagem-prefs),
    // antes de qualquer script da página rodar.
    await s.send('Page.addScriptToEvaluateOnNewDocument', {
      source: "try { localStorage.setItem('viagem-prefs', JSON.stringify({ conviteVisto: true })); } catch {}",
    });
    const z0 = DEGRAUS_UA[0] / UA_POR_PC;
    await s.ir(`pos=0,0,${z0}&look=0,0,0&q=cinema${EXTRA}`);

    // o FORNO do Sol (bake de granulação/cromosfera) termina DEPOIS da
    // prontidão geral da página; medir antes fotografa uma bola lisa e
    // pálida que não existe no produto assentado — foi exatamente a
    // assimetria que a primeira rodada deste harness acusou a 0,05 UA.
    // Exigem-se três retratos COMPLETOS com o app já rodado (quadro > 300).
    //
    // A CONTA É NO RELÓGIO DE QUADROS, e não no de parede (item 58b,
    // medido em 22/08). O critério anterior era três leituras verdadeiras
    // seguidas a 500 ms; a medida do sinal explica por que ele nunca
    // fechava: o bake estrutural são 8 fatias, uma por quadro, e quando a
    // oitava publica o acumulador de 0,12 s já estourou de novo — o forno
    // recomeça no quadro seguinte, para sempre. `assentado` fica true UM
    // quadro em cada nove. A 0,05 UA isso é 24 quadros em 199 (12,1%, a
    // 19,9 fps, 2,40 retratos por segundo): o sinal chega o tempo todo, e
    // três leituras SEGUIDAS de um sinal com 12% de duty é uma loteria de
    // 1 em 600. Medido: 240 giros, 28 leituras true, ZERO sequências de
    // três — 121 s sem fechar, rumo ao teto de 480 s. Contando as BORDAS
    // dentro da página, os mesmos três retratos saem em ~1,3 s.
    //
    // A diagnose do comentário antigo ("pisca no quadro ~50 e só volta
    // minutos depois") estava errada: o forno nunca para.
    const t0 = Date.now();
    await aval(`(() => {
      window.__forno = 0;
      let antes = false;
      const passo = () => {
        const agora = window.__director?.sun?.assentado === true;
        if (agora && !antes && window.__f > 300) window.__forno++;
        antes = agora;
        requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
      return 'armado';
    })()`);
    let retratos = 0;
    for (let i = 0; i < 960 && retratos < 3; i++) {
      retratos = await aval('window.__forno | 0');
      if (retratos < 3) await dorme(500);
    }
    // E O TETO NÃO SE CONFUNDE COM O POUSO (censo dos juízes, 21/08): antes
    // desta linha o harness imprimia "assentado" mesmo quando o laço tinha
    // esgotado os 960 giros — 480 s de espera cega travestidos de sinal. O
    // preço deste juiz era quase todo AQUI, então quem o lê tem de saber se
    // pagou por um pouso ou por um teto.
    const esperou = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(
      retratos >= 3
        ? `forno do Sol assentado em ${esperou} s (${retratos} retratos completos)`
        : `forno do Sol NÃO assentou: teto de espera esgotado em ${esperou} s `
          + '— as medidas abaixo saem de um retrato a meio caminho'
    );

    // a banda de histerese, calculada pela régua do próprio app
    BANDA_UA = await aval(`(() => {
      const d = window.__director;
      const h = d.engine.renderer.domElement.height;
      const fov = d.engine.camera.fov;
      const raio = d.solRaioPc;
      const dPara = (px) => {
        // inversa exata de diametroAparentePx: d = r / tan(ang/2)
        const pxPorRad = h / (2 * Math.tan((fov * Math.PI / 180) / 2));
        return raio / Math.tan(px / (2 * pxPorRad));
      };
      return { de: dPara(4) * ${UA_POR_PC}, ate: dPara(2) * ${UA_POR_PC} };
    })()`);

    const pernas = [
      ['ida', DEGRAUS_UA],
      ['volta', [...DEGRAUS_UA].reverse()],
    ];
    const linhas = [];
    for (const [perna, degraus] of pernas) {
      for (const ua of degraus) {
        const zPc = ua / UA_POR_PC;
        await aval(`window.__director.placeCamera([0,0,${zPc}], [0,0,0])`);
        // assenta o suficiente para gates/rampas do quadro reagirem, sem
        // parar o voo: ~12 quadros por degrau
        const f0 = await aval('window.__f');
        for (let i = 0; i < 100; i++) {
          if ((await aval('window.__f')) >= f0 + 12) break;
          await dorme(50);
        }
        const estado = await aval(`(() => {
          const d = window.__director;
          const cede = d.planetas?.points?.geometry?.getAttribute('aCede');
          return {
            dUa: d.engine.camera.position.length() * ${UA_POR_PC},
            // O ENDEREÇO DO GATE é \`solNoQuadro.solArmado\` (director/
            // solNoQuadro.ts), e não \`director.solArmado\`: o campo nunca
            // existiu no Director. Lendo \`undefined\` dos dois lados, a
            // coluna imprimia \`----\` em todos os degraus e a comparação
            // "o gate difere entre ida e volta" virava
            // \`undefined !== undefined\` — sempre falsa. É o mesmo
            // endereço que o MB1 lê (estabilidade-temporal.mjs).
            solArmado: !!(d.solNoQuadro && d.solNoQuadro.solArmado),
            cedeSol: cede ? cede.getX(0) : null,
          };
        })()`);
        const shot = await s.send('Page.captureScreenshot', { format: 'png' });
        const png = Buffer.from(shot.data, 'base64');
        const arq = resolve(CAPTURAS, `voo-${perna}-${String(ua).replace('.', 'p')}ua${SUF}.png`);
        writeFileSync(arq, png);
        const m = await medir(png);
        linhas.push({ perna, ua, ...m, ...estado });
        console.log(
          `${perna.padEnd(5)} ${String(ua).padStart(8)} UA  ` +
          `lavado ${(m.acimaDeMeia * 100).toFixed(2).padStart(6)}%  ` +
          `borrão ${String(m.borrao).padStart(4)} px  ` +
          `gate ${estado.solArmado ? 'armado' : '  ----'}  cessão ${Number(estado.cedeSol).toFixed(2)}`
        );
      }
    }
    return { linhas, gritos: s.gritos() };
  } finally {
    s.fechar();
  }
}

/** ida × volta, degrau a degrau; fora da banda de histerese os dois
 *  sentidos têm de contar a mesma história */
function julgar(linhas) {
  const ida = new Map(linhas.filter((l) => l.perna === 'ida').map((l) => [l.ua, l]));
  const volta = new Map(linhas.filter((l) => l.perna === 'volta').map((l) => [l.ua, l]));
  const erros = [];
  // TOLERANCIA_LAVADO: o céu vivo cintila (relógio do Sol anda entre as
  // pernas); 1 ponto percentual separa cintilação de mudança de regime
  const TOLERANCIA_LAVADO = 0.01;
  // §5.10: o harness sempre GRAVOU luzMedia e nunca a comparou — a 0,05 UA a
  // ida lia 0,173 e a volta 0,059 (2,94×) e o veredito saía "erros: []".
  // A tolerância é maior que a do lavado porque a luz média integra o céu
  // vivo inteiro (granulação, coroa, relógio do Sol entre as pernas), mas
  // 2 pontos percentuais separam cintilação de mudança de REGIME.
  const TOLERANCIA_LUZ_MEDIA = 0.02;
  for (const [ua, a] of ida) {
    const b = volta.get(ua);
    if (!b) continue;
    const naBanda = ua >= BANDA_UA.de && ua <= BANDA_UA.ate;
    if (a.solArmado !== b.solArmado && !naBanda) {
      erros.push(`${ua} UA: gate difere entre ida (${a.solArmado}) e volta (${b.solArmado}) FORA da banda de histerese`);
    }
    if (Math.abs(a.acimaDeMeia - b.acimaDeMeia) > TOLERANCIA_LAVADO && !naBanda) {
      erros.push(`${ua} UA: quadro lavado difere ida ${(a.acimaDeMeia * 100).toFixed(2)}% × volta ${(b.acimaDeMeia * 100).toFixed(2)}% FORA da banda`);
    }
    if (Math.abs(a.luzMedia - b.luzMedia) > TOLERANCIA_LUZ_MEDIA && !naBanda) {
      erros.push(
        `${ua} UA: luz média difere ida ${a.luzMedia.toFixed(3)} × volta ` +
        `${b.luzMedia.toFixed(3)} FORA da banda (tolerância ${TOLERANCIA_LUZ_MEDIA})`
      );
    }
  }
  // e a queixa original, nos DOIS sentidos: nenhum degrau pode cegar a
  // tela ALÉM DO QUE A LEI PERMITE. O critério era um 50% chapado de
  // antes de a asa existir; desde o M2 o teto é o MESMO da régua da luz
  // (`tetoDeLavagem`): perto do Sol o clarão da lei cobre o quadro e
  // lavar é a parede de fogo honesta (a âncora do dono é R ≈ 450 px já
  // a 1 UA); longe, o orçamento encolhe com a asa e cegueira volta a
  // reprovar. Reescrever o oráculo, nunca contorná-lo (§5.10) — o teto
  // vem da lei, não deste harness.
  const [wPx, hPx] = JANELA.split('x').map(Number);
  const comBloom = !/nobloom=1/.test(EXTRA);
  for (const l of linhas) {
    const teto = tetoDeLavagem(l.ua, { alturaPx: hPx, larguraPx: wPx, comBloom });
    if (l.acimaDeMeia > teto.tetoAcimaDeMeia) {
      erros.push(
        `${l.perna} ${l.ua} UA: tela cega — ${(l.acimaDeMeia * 100).toFixed(1)}% do quadro ` +
        `acima de meia luz (teto da lei ${(teto.tetoAcimaDeMeia * 100).toFixed(1)}%)`
      );
    }
  }
  return erros;
}

/** §5.10: a margem da banda, ESCRITA — o PASSA do voo já dependeu de um
 *  degrau cair 0,0035 UA dentro da borda da banda, e ninguém via. Para cada
 *  degrau, a distância à borda mais próxima (negativa = DENTRO da banda,
 *  isento de julgamento); no topo, a menor margem entre os degraus julgados. */
function margensDaBanda(linhas) {
  const porDegrau = [...new Set(linhas.map((l) => l.ua))].map((ua) => {
    const dentro = ua >= BANDA_UA.de && ua <= BANDA_UA.ate;
    const margemUa = dentro
      ? -Math.min(ua - BANDA_UA.de, BANDA_UA.ate - ua)
      : Math.min(Math.abs(ua - BANDA_UA.de), Math.abs(ua - BANDA_UA.ate));
    return { ua, dentroDaBanda: dentro, margemUa };
  });
  const julgados = porDegrau.filter((d) => !d.dentroDaBanda);
  const margemMinimaUa = julgados.length ? Math.min(...julgados.map((d) => d.margemUa)) : null;
  return { porDegrau, margemMinimaUa };
}

const { linhas, gritos } = await voar();
const erros = julgar(linhas);
const margens = margensDaBanda(linhas);
const json = resolve(CAPTURAS, `voo-ida-e-volta${SUF}.json`);
writeFileSync(
  json,
  JSON.stringify(
    { janela: JANELA, extra: EXTRA, bandaUa: BANDA_UA, margens, linhas, erros, gritos },
    null,
    1
  )
);
console.log(`\nbanda de histerese declarada: ${BANDA_UA.de.toFixed(2)} a ${BANDA_UA.ate.toFixed(2)} UA`);
if (margens.margemMinimaUa !== null) {
  console.log(
    `margem mínima até a borda da banda, entre degraus JULGADOS: ` +
    `${margens.margemMinimaUa.toFixed(4)} UA` +
    (margens.margemMinimaUa < 0.05 ? '  ← FINA: o veredito depende de um fio' : '')
  );
}
if (gritos.length) console.log(`gritos do app: ${gritos.length}\n  ` + gritos.slice(0, 5).join('\n  '));
if (erros.length) {
  console.log(`\n>>> REPROVA — ${erros.length} assimetria(s)/cegueira(s):`);
  for (const e of erros) console.log('  · ' + e);
  console.log(`\n  ${json}`);
  process.exit(1);
}
console.log(`>>> PASSA — ida e volta contam a mesma história em ${linhas.length / 2} degraus\n  ${json}`);
