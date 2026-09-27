// Serve: chão — cada combinação de gás/poeira compila e desenha algo (não uma tela preta); a poeira muda só perto do Sol, e nunca fora do alcance medido
// Custo: ≈ 3 min medido 27/09 (12 capturas, Chrome novo cada) — dois dos
// seis controles (t=153, t=167, com poeira=1) caem no teto de segurança
// do sinal de prontidão, ~60 s cada em vez de ~5 s; pré-existente, não
// desta rodada (`poeira=0` nos mesmos pontos assenta rápido).
//
// Onda E2/E3 (revisão independente, 27/09): o bloco de poeira do Gaia
// perto do Sol entra pela mesma gaveta de gás volumétrico (`?gas=`,
// `?poeira=`). Este juiz tem TRÊS partes:
//
//  1. As quatro combinações de sempre — só que a combinação COMPILA
//     (nenhum erro de shader/GL no console) e DESENHA algo (a foto não
//     sai praticamente preta). Não mede composição nem exatidão física.
//  2. A DIFERENÇA LOCALIZADA — prova que `?poeiragain=` só move o pixel
//     perto do Sol (o recorte central, com a câmera apontada para o
//     bloco sintético) e NUNCA nos quatro cantos (longe do alcance
//     medido, ~1,2 kpc).
//  3. O CONTROLE FORA DA COBERTURA — em pontos da viagem já longe de
//     casa, `poeira=1` e `poeira=0` têm de desenhar o MESMO pixel: a
//     poeira medida não pinta o que está fora do alcance dela.
//
// GAP CONHECIDO (item 2 da revisão): `capturarCDP`/`chrome.mjs` não
// encaminham `Runtime.exceptionThrown` para quem chama — só
// `Runtime.consoleAPICalled` (via `coletar`). Uma exceção não capturada
// (em vez de um `console.error`/`console.warn`, que É o que THREE usa
// para reportar erro de shader) passaria calada aqui. Cobrir isto
// exigiria uma mudança no harness compartilhado (`chrome.mjs`), fora do
// escopo desta rodada — nenhum outro juiz foi tocado.
//
// Roda contra o `vite` já aberto em 5173; não sobe nem mata nada (mata
// só os Chromes que ELE MESMO cria, um por captura).
//
//   node scripts/visual/poeira-shaders.mjs
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { capturarCDP, APP_PADRAO, dorme } from './chrome.mjs';

const APP = process.env.APP_URL || APP_PADRAO;

// cada combinação em cinema/shot=2/t=60, 640×360, DPR 1 — só a prova
// de compilação, não uma vista de composição.
const COMBINACOES = [
  'gas=macio&poeira=0',
  'gas=macio&poeira=1',
  'gas=fino&poeira=1',
  'gas=macio&poeira=teste',
];

const ERRO_DE_SHADER = /THREE\.WebGLProgram|Shader Error|Uncaught|GL_INVALID|Program Info Log/i;
const LUMINANCIA_MINIMA = 2; // /255 — abaixo disso a foto é praticamente preta

/**
 * A CÂMERA DA DIFERENÇA LOCALIZADA: (0.5, 0.5, 0.5) pc, olhando para o
 * centro galáctico — a mesma direção de cena que o roteiro usa lá
 * (−0,0549, −0,8734, −0,4838; norma ≈ 1). `placeCamera` pede um PONTO
 * para olhar, não uma direção: `OLHAR_PC` é `CAM_POS_PC + direção`, 1 pc
 * adiante no mesmo rumo — o suficiente para `cam.lookAt` apontar certo.
 */
const CAM_POS_PC = [0.5, 0.5, 0.5];
const DIRECAO_CENTRO_GALACTICO = [-0.0548756, -0.8734371, -0.483835];
const OLHAR_PC = CAM_POS_PC.map((v, i) => v + DIRECAO_CENTRO_GALACTICO[i]);

async function aval(send, expressao) {
  const r = await send('Runtime.evaluate', { expression: expressao, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`js: ${r.exceptionDetails.text}`);
  return r.result.value;
}

/** Espera `window.__f` (o contador de rAF que `capturarCDP` injeta)
 *  andar `n` quadros — mesmo padrão de `esperarQuadros` em
 *  `ponto-na-borda.mjs`. */
async function esperarQuadros(send, n) {
  const f0 = Number(await aval(send, 'window.__f|0')) || 0;
  const prazo = Date.now() + 4000;
  while (Date.now() < prazo) {
    const f = Number(await aval(send, 'window.__f|0')) || 0;
    if (f >= f0 + n) return;
    await dorme(30);
  }
}

/**
 * CÂMERA LIVRE VIA `window.__director.placeCamera` (o mesmo método dos
 * deep-links, modelo `pousar` em `ponto-na-borda.mjs`) — `placeCamera`
 * zera a contagem de estabilidade da captura (`setPhase('free')`), então
 * espera o sinal `captura.pronto` voltar antes do obturador de
 * `capturarCDP` disparar, com mais dois quadros de margem.
 */
async function posicionarCamera(send, pos, olhar) {
  await aval(
    send,
    `(() => { window.__director.placeCamera([${pos.join(',')}], [${olhar.join(',')}]); return true; })()`
  );
  const prazo = Date.now() + 8000;
  while (Date.now() < prazo) {
    const pronto = await aval(
      send,
      '!!(window.__director && window.__director.captura && window.__director.captura.pronto)'
    );
    if (pronto) break;
    await dorme(40);
  }
  await esperarQuadros(send, 2);
}

async function capturarComCamera(url, porta) {
  return capturarCDP({
    url,
    largura: 640,
    altura: 360,
    dpr: 1,
    porta,
    aoAssentar: ({ send }) => posicionarCamera(send, CAM_POS_PC, OLHAR_PC),
  });
}

/** O recorte cru (RGB, sem alfa) de uma área — em bytes 0–255. */
async function recorte(png, area) {
  const { data } = await sharp(png)
    .extract(area)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

/** A diferença média absoluta, byte a byte, entre dois recortes do
 *  MESMO tamanho — em /255. */
function diferencaMedia(a, b) {
  const n = Math.min(a.length, b.length);
  let soma = 0;
  for (let i = 0; i < n; i++) soma += Math.abs(a[i] - b[i]);
  return soma / n;
}

const LARGURA_B = 640;
const ALTURA_B = 360;
// o recorte central, 25% × 25%, centrado — onde o bloco sintético de
// `?poeira=teste` cobre a mira da câmera.
const CENTRO = {
  left: Math.round(LARGURA_B * 0.375),
  top: Math.round(ALTURA_B * 0.375),
  width: Math.round(LARGURA_B * 0.25),
  height: Math.round(ALTURA_B * 0.25),
};
// os quatro cantos, 15% × 15% cada — longe da mira, onde `?poeiragain=`
// não tem nada para iluminar.
const LARGURA_CANTO = Math.round(LARGURA_B * 0.15);
const ALTURA_CANTO = Math.round(ALTURA_B * 0.15);
const CANTOS = {
  'topo-esquerda': { left: 0, top: 0, width: LARGURA_CANTO, height: ALTURA_CANTO },
  'topo-direita': {
    left: LARGURA_B - LARGURA_CANTO,
    top: 0,
    width: LARGURA_CANTO,
    height: ALTURA_CANTO,
  },
  'base-esquerda': {
    left: 0,
    top: ALTURA_B - ALTURA_CANTO,
    width: LARGURA_CANTO,
    height: ALTURA_CANTO,
  },
  'base-direita': {
    left: LARGURA_B - LARGURA_CANTO,
    top: ALTURA_B - ALTURA_CANTO,
    width: LARGURA_CANTO,
    height: ALTURA_CANTO,
  },
};
const LIMIAR_CENTRO_MIN = 5; // /255 — o centro TEM de mudar mais que isto
const LIMIAR_CANTO_MAX = 1; // /255 — os cantos NÃO PODEM mudar mais que isto

/**
 * A DIFERENÇA LOCALIZADA (item b da revisão): A = `poeiragain=0`
 * (termo medido zerado, cobertura intacta), B = o ganho padrão — a
 * MESMA câmera, o mesmo volume sintético (`?poeira=teste`). Se o ganho
 * só ilumina perto do Sol, o recorte central muda e os quatro cantos
 * não.
 */
async function testeDiferencaLocalizada(proximaPorta) {
  process.stdout.write('diferença localizada (poeiragain=0 × padrão, câmera em (0.5,0.5,0.5) pc): ');
  try {
    const { png: pngA } = await capturarComCamera(
      `${APP}/?q=cinema&gas=macio&poeira=teste&poeiragain=0&shot=2&t=30`,
      proximaPorta()
    );
    const { png: pngB } = await capturarComCamera(
      `${APP}/?q=cinema&gas=macio&poeira=teste&shot=2&t=30`,
      proximaPorta()
    );
    const diffCentro = diferencaMedia(await recorte(pngA, CENTRO), await recorte(pngB, CENTRO));
    const linhas = [`centro: ${diffCentro.toFixed(2)}/255 (precisa > ${LIMIAR_CENTRO_MIN})`];
    let falhou = !(diffCentro > LIMIAR_CENTRO_MIN);
    for (const [nome, area] of Object.entries(CANTOS)) {
      const diff = diferencaMedia(await recorte(pngA, area), await recorte(pngB, area));
      linhas.push(`canto ${nome}: ${diff.toFixed(2)}/255 (precisa < ${LIMIAR_CANTO_MAX})`);
      if (!(diff < LIMIAR_CANTO_MAX)) falhou = true;
    }
    process.stdout.write(`${falhou ? 'FALHA' : 'ok'}\n    ${linhas.join('\n    ')}\n`);
    return falhou;
  } catch (e) {
    process.stdout.write(`FALHA — ${e.message}\n`);
    return true;
  }
}

/** O recorte cru (RGB) da imagem inteira, para o diagnóstico de
 *  diff-pixel quando o controle abaixo reprova. */
async function cruaInteira(png) {
  return sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

const PONTOS_FORA_DA_COBERTURA = [100, 153, 167];

/**
 * O CONTROLE FORA DA COBERTURA (item c da revisão): em pontos da
 * viagem já bem longe de casa, `poeira=1` e `poeira=0` têm de desenhar
 * o MESMO quadro — a poeira medida (~1,2 kpc de alcance) não pode
 * pintar o que está fora dela. md5 diferente é falha, com o diff-pixel
 * impresso.
 */
async function testeControleForaDaCobertura(proximaPorta) {
  let falhou = false;
  for (const t of PONTOS_FORA_DA_COBERTURA) {
    process.stdout.write(`controle fora da cobertura (t=${t}, poeira=1 × poeira=0): `);
    try {
      const base = `${APP}/?q=cinema&gas=macio&shot=2&t=${t}`;
      const { png: pngOn } = await capturarCDP({
        url: `${base}&poeira=1`,
        largura: 1280,
        altura: 720,
        dpr: 2,
        porta: proximaPorta(),
      });
      const { png: pngOff } = await capturarCDP({
        url: `${base}&poeira=0`,
        largura: 1280,
        altura: 720,
        dpr: 2,
        porta: proximaPorta(),
      });
      const md5On = createHash('md5').update(pngOn).digest('hex');
      const md5Off = createHash('md5').update(pngOff).digest('hex');
      if (md5On === md5Off) {
        process.stdout.write(`ok — md5 ${md5On.slice(0, 12)}\n`);
        continue;
      }
      falhou = true;
      const { data: a, info } = await cruaInteira(pngOn);
      const { data: b } = await cruaInteira(pngOff);
      let diferentes = 0;
      let maiorDiff = 0;
      for (let i = 0; i < a.length; i += info.channels) {
        let d = 0;
        for (let c = 0; c < info.channels; c++) d = Math.max(d, Math.abs(a[i + c] - b[i + c]));
        if (d > 0) {
          diferentes++;
          if (d > maiorDiff) maiorDiff = d;
        }
      }
      process.stdout.write(
        `FALHA — md5 diferem (${md5On.slice(0, 12)} × ${md5Off.slice(0, 12)}); ` +
          `${diferentes} px diferem de ${info.width * info.height}, maior diferença ${maiorDiff}/255\n`
      );
    } catch (e) {
      falhou = true;
      process.stdout.write(`FALHA — ${e.message}\n`);
    }
  }
  return falhou;
}

async function main() {
  // `porta` é a porta de depuração remota do Chrome que capturarCDP
  // sobe sozinho — nada a ver com a 5173 do vite, ocupada por ele.
  // Chrome novo a cada captura, porta nova a cada captura (padrão de
  // previas-de-destino.mjs/sky-capture.mjs).
  let porta = 9700 + (process.pid % 100);
  const proximaPorta = () => porta++;
  let falhou = false;

  for (const combinacao of COMBINACOES) {
    process.stdout.write(`${combinacao}: `);
    try {
      const url = `${APP}/?${combinacao}&q=cinema&shot=2&t=60`;
      const { png, linhas } = await capturarCDP({
        url, largura: 640, altura: 360, dpr: 1, porta: proximaPorta(),
        coletar: ERRO_DE_SHADER,
      });
      const erro = linhas.length ? linhas.join(' | ') : null;
      const { channels } = await sharp(png).stats();
      const luminancia = channels.slice(0, 3).reduce((soma, c) => soma + c.mean, 0) / 3;
      const pretaDemais = luminancia < LUMINANCIA_MINIMA;

      if (erro) {
        falhou = true;
        process.stdout.write(`FALHA — erro de shader/GL no console: ${erro}\n`);
      } else if (pretaDemais) {
        falhou = true;
        process.stdout.write(
          `FALHA — tela praticamente preta (luminância ${luminancia.toFixed(2)}/255)\n`
        );
      } else {
        process.stdout.write(`ok — luminância ${luminancia.toFixed(2)}/255\n`);
      }
    } catch (e) {
      falhou = true;
      process.stdout.write(`FALHA — ${e.message}\n`);
    }
  }

  if (await testeDiferencaLocalizada(proximaPorta)) falhou = true;
  if (await testeControleForaDaCobertura(proximaPorta)) falhou = true;

  process.exit(falhou ? 1 : 0);
}

main();
