// Serve: chão — cada combinação de gás/poeira compila e desenha algo (não uma tela preta); a poeira só pinta onde há densidade, no macio e no fino; as trocas ao vivo do menu não derrubam a cena nem ficam presas
// Custo: 2,3 min medido 28/09 (20 páginas, Chrome novo cada; as
// transições ao vivo acontecem dentro da página já aberta). Os controles
// t=153 e t=167 com poeira=1 já assentam pelo sinal (~5,5 s cada): o teto
// de ~60 s da rodada anterior sumiu com o termo "gás apagado" de
// `Nebula.poeiraAssentada`.
//
// Onda E2/E3 (revisão independente, 27/09) e item 8 da revisão v2
// (27/09): o bloco de poeira do Gaia perto do Sol entra pela mesma gaveta
// de gás volumétrico (`?gas=`, `?poeira=`). Este juiz tem QUATRO partes:
//
//  1. As quatro combinações de sempre — só que a combinação COMPILA
//     (nenhum erro de shader/GL no console) e DESENHA algo (a foto não
//     sai praticamente preta). Não mede composição nem exatidão física.
//  2. A DIFERENÇA LOCALIZADA, nos DOIS caminhos da poeira: no macio (a
//     poeira assada no bake) e no fino (lida direto no raymarch). Com o
//     volume sintético de `?poeira=teste` e a mesma câmera, `poeiragain=0`
//     × o ganho padrão tem de mover o recorte central (o cubo sintético
//     mais forte, na mira) e NADA nos quatro cantos. Os raios dos cantos
//     atravessam a caixa sintética (a câmera está dentro dela) sem cruzar
//     nenhum dos três cubos iluminados: provam que o ganho não pinta FORA
//     DOS CUBOS, onde a densidade é zero — não um alcance radial. Cada
//     captura afirma, lido da página, o modo que a GPU recebe
//     (`uPoeiraModo`: 1 no macio, 2 no fino), `{ativa, sintetica}` e a
//     prontidão: o fino não pode passar desenhando pelo caminho do macio.
//  3. O CONTROLE FORA DA COBERTURA — em pontos da viagem já longe de
//     casa, `poeira=1` e `poeira=0` têm de desenhar o MESMO pixel: a
//     poeira medida não pinta o que está fora do alcance dela.
//  4. AS TRANSIÇÕES AO VIVO (itens 1, 2, 4 e 7 da revisão v2), cada uma
//     numa página só, pelos mesmos `forcarGas`/`forcarPoeira` que o menu
//     chama: (a) gás antigo → fino não derruba a cena; (b) sintética →
//     Gaia média chega a `{ativa, gaia}` e fica pixel a pixel igual à URL
//     resultante aberta do zero; (c) sem cartografia (`cart=off`), pedir
//     a poeira dá 'indisponivel' na hora, e não 'carregando' para
//     sempre; (d) no fino, trocar o brilho não reassa o volume e muda a
//     imagem.
//
// PROCEDÊNCIA: a primeira linha da saída é o commit (com "+sujo" se a
// árvore tem mudança não commitada), e cada linha de resultado traz a URL
// aberta — um veredito sem os dois não diz de qual código nem de qual
// cena fala.
//
// ERROS NÃO TRATADOS: depois de cada captura e de cada transição o juiz
// lê `window.__errosNaoTratados` — o coletor de 'error' e
// 'unhandledrejection' de `src/main.tsx` — e reprova se houver algum,
// imprimindo as mensagens; reprova também se o coletor faltar (a leitura
// sairia vazia e passaria calada). O que ele NÃO vê é a exceção que o
// próprio app captura: a de um quadro vira `console.error` + véu de falha
// e PARA o laço (`onTick` → `desistir` em `director.ts`), sem evento
// 'error'. Por isso as páginas das transições (`shot=1`; sob `shot=2` o
// véu nem monta) conferem o texto do véu, e toda prova com câmera ou
// transição exige `captura.pronto` depois do gesto: o gesto zera a
// contagem de quadros estáveis, e um laço parado nunca a devolve. Erro de
// shader continua vindo do console (`coletar`).
//
// Roda contra o `vite` já aberto em 5173; não sobe nem mata nada (mata
// só os Chromes que ELE MESMO cria, um por captura).
//
//   node scripts/visual/poeira-shaders.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { capturarCDP, APP_PADRAO, dorme, esperarPor, comLinguaDoJuizNaUrl } from './chrome.mjs';

const APP = process.env.APP_URL || APP_PADRAO;

/**
 * O COMMIT que produziu as provas, com "+sujo" se `git status` não vem
 * vazio. `--no-optional-locks`: só leitura, nem o índice é reescrito.
 */
function procedencia() {
  const git = (...args) =>
    execFileSync('git', ['--no-optional-locks', ...args], {
      cwd: fileURLToPath(new URL('.', import.meta.url)),
      encoding: 'utf8',
    }).trim();
  try {
    return `${git('rev-parse', '--short', 'HEAD')}${git('status', '--porcelain') ? '+sujo' : ''}`;
  } catch (e) {
    return `desconhecido (${e.message.split('\n')[0]})`;
  }
}

/**
 * O TEXTO DO VÉU DE FALHA EM VOO (`hud.falhaEmVoo`), lido do dicionário
 * e não copiado: o juiz roda em pt-BR (`LINGUA_DO_JUIZ`), e uma cópia
 * que o dicionário deixasse de usar faria a prova do véu passar calada
 * para sempre. Chave sumida é erro alto, não "sem véu".
 */
const TEXTO_FALHA_EM_VOO = (() => {
  const pt = readFileSync(new URL('../../src/lib/idioma/pt.ts', import.meta.url), 'utf8');
  const achado = pt.match(/'hud\.falhaEmVoo':\s*'([^']+)'/);
  if (!achado) throw new Error("'hud.falhaEmVoo' não achado em src/lib/idioma/pt.ts");
  return achado[1];
})();

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
  if (r.exceptionDetails) {
    const d = r.exceptionDetails;
    throw new Error(`js: ${d.exception?.description ?? d.text}`);
  }
  return r.result.value;
}

/** O `s` que `esperarPor` (chrome.mjs) pede, em cima do `send` do gancho. */
const sessao = (send) => ({ js: (expressao) => aval(send, expressao) });

/** Chama um método do Director como o menu chama — sem mexer na URL. */
const noDirector = (send, chamada) =>
  aval(send, `(() => { window.__director.${chamada}; return true; })()`);

/**
 * O QUE AS PROVAS AFIRMAM SOBRE A PÁGINA, lido de uma vez:
 *  - `modo`: o `uPoeiraModo` que a GPU recebe (`Nebula.poeiraModoEfetivo`,
 *    pelo campo `nebula` do Director — privado só no TypeScript);
 *  - `estado`: `estadoDaPoeira`, o `{situacao, fonte}` do selo;
 *  - `pronto`/`quadros`: o sinal de prontidão e os quadros DESENHADOS
 *    desde a última perturbação;
 *  - `bakes`: `window.__poeira.bakes`, quantas vezes o volume foi assado;
 *  - `erros`: `window.__errosNaoTratados` (`null` se o coletor faltar);
 *  - `veu`: o véu de falha em voo na tela.
 * Campo ausente sai `null`, e `null` não satisfaz afirmação nenhuma.
 */
const LEITURA_DA_PAGINA = `(() => {
  const d = window.__director;
  const p = window.__poeira;
  return {
    modo: d && d.nebula ? (d.nebula.poeiraModoEfetivo ?? null) : null,
    estado: d ? (d.estadoDaPoeira ?? null) : null,
    pronto: d && d.captura ? d.captura.pronto : null,
    quadros: d && d.captura ? d.captura.quadros : null,
    bakes: p && typeof p.bakes === 'number' ? p.bakes : null,
    erros: Array.isArray(window.__errosNaoTratados) ? window.__errosNaoTratados : null,
    veu: document.body.textContent.includes(${JSON.stringify(TEXTO_FALHA_EM_VOO)}),
  };
})()`;
const lerPagina = (send) => aval(send, LEITURA_DA_PAGINA);

const resumo = (p) =>
  `modo=${p.modo} estado=${p.estado ? `${p.estado.situacao}/${p.estado.fonte}` : null} ` +
  `pronto=${p.pronto} quadros=${p.quadros} bakes=${p.bakes}`;

const ehEstado = (p, situacao, fonte) =>
  !!p.estado && p.estado.situacao === situacao && p.estado.fonte === fonte;

/** Reprova (lança) com o ponto da prova e o estado lido junto. */
function exigir(condicao, onde, motivo, pagina) {
  if (!condicao) throw new Error(`${onde}: ${motivo}${pagina ? ` (${resumo(pagina)})` : ''}`);
}

/**
 * Reprova se a página acusou erro não tratado, se o coletor sumiu ou se
 * o véu de falha subiu — ver "ERROS NÃO TRATADOS" no topo.
 */
function exigirSemErro(pagina, onde) {
  exigir(
    pagina.erros !== null,
    onde,
    'window.__errosNaoTratados ausente — sem o coletor de src/main.tsx a prova não enxerga exceção'
  );
  if (pagina.erros.length) {
    const mensagens = pagina.erros.map((e) => `[${e.origem}] ${e.mensagem}`).join(' | ');
    throw new Error(`${onde}: ${pagina.erros.length} erro(s) não tratado(s) — ${mensagens}`);
  }
  exigir(!pagina.veu, onde, `o véu "${TEXTO_FALHA_EM_VOO}" está na tela`, pagina);
}

/** O console de uma captura com `coletar: ERRO_DE_SHADER` tem de vir limpo. */
function exigirConsoleLimpo(captura, onde) {
  exigir(!captura.linhas.length, onde, `erro de shader/GL no console: ${captura.linhas.join(' | ')}`);
}

/** A foto no meio de uma transição — o mesmo obturador de `capturarCDP`. */
async function fotografar(send) {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  return Buffer.from(shot.data, 'base64');
}

const md5 = (png) => createHash('md5').update(png).digest('hex');

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

const TETO_PRONTO_MS = 8000;

/**
 * Espera `captura.pronto` voltar — a câmera, o gás e a poeira trocados
 * zeram a contagem de quadros estáveis — e mais dois quadros de margem.
 * Devolve os ms da espera, ou `null` no teto: quem chama reprova.
 */
async function esperarPronto(send) {
  const ms = await esperarPor(
    sessao(send),
    '!!(window.__director && window.__director.captura && window.__director.captura.pronto)',
    TETO_PRONTO_MS
  );
  await esperarQuadros(send, 2);
  return ms;
}

/**
 * CÂMERA LIVRE VIA `window.__director.placeCamera` (o mesmo método dos
 * deep-links, modelo `pousar` em `ponto-na-borda.mjs`) — `placeCamera`
 * zera a contagem de estabilidade da captura (`setPhase('free')`), então
 * espera o sinal `captura.pronto` voltar antes do obturador.
 */
async function posicionarCamera(send, pos, olhar) {
  await noDirector(send, `placeCamera([${pos.join(',')}], [${olhar.join(',')}])`);
  return esperarPronto(send);
}

/** Captura com a câmera da diferença localizada; `mexeu` é a página lida
 *  logo antes do obturador. */
async function capturarComCamera(url, porta) {
  return capturarCDP({
    url,
    largura: 640,
    altura: 360,
    dpr: 1,
    porta,
    coletar: ERRO_DE_SHADER,
    aoAssentar: async ({ send }) => {
      await posicionarCamera(send, CAM_POS_PC, OLHAR_PC);
      return lerPagina(send);
    },
  });
}

/**
 * A captura com câmera tem de estar no estado que a prova diz medir: o
 * console limpo, nenhum erro, o modo que a GPU recebe (`modo`, se não
 * `null`), a situação `ativa` com a `fonte` pedida e a prontidão.
 */
function exigirCapturaAtiva(captura, { modo, fonte }, onde) {
  exigirConsoleLimpo(captura, onde);
  const p = captura.mexeu;
  exigirSemErro(p, onde);
  if (modo !== null) exigir(p.modo === modo, onde, `a GPU recebe uPoeiraModo=${p.modo}, e não ${modo}`, p);
  exigir(ehEstado(p, 'ativa', fonte), onde, `estadoDaPoeira não é {ativa, ${fonte}}`, p);
  exigir(p.pronto === true, onde, 'captura.pronto não voltou depois de posicionar a câmera', p);
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
// o recorte central, 25% × 25%, centrado — onde o cubo sintético mais
// forte de `?poeira=teste` (0,05 E/pc a ~310 pc, rumo ao centro
// galáctico) cobre a mira da câmera.
const CENTRO = {
  left: Math.round(LARGURA_B * 0.375),
  top: Math.round(ALTURA_B * 0.375),
  width: Math.round(LARGURA_B * 0.25),
  height: Math.round(ALTURA_B * 0.25),
};
// os quatro cantos, 15% × 15% cada. A câmera está DENTRO da caixa
// sintética (±400/±400/±200 pc em volta do Sol), então os raios dos
// cantos também a atravessam — só que sem cruzar nenhum dos três cubos
// iluminados (`volumeSinteticoDePoeira` em director.ts): ali a densidade
// é zero e `?poeiragain=` não tem o que multiplicar. Igualdade nos cantos
// prova "o ganho não pinta fora dos cubos", NÃO um alcance radial.
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
 * OS DOIS CAMINHOS DA POEIRA: no macio ela é assada no volume
 * (`nebulaBake`, modo 1); no fino é lida direto no raymarch (modo 2). A
 * prova localizada roda nos dois — só o macio deixava remover a soma do
 * raymarch fino sem nenhum juiz notar.
 */
const CAMINHOS_DA_POEIRA = [
  { gas: 'macio', modo: 1 },
  { gas: 'fino', modo: 2 },
];

/**
 * A DIFERENÇA LOCALIZADA (item b da revisão; o fino pelo item 8 da v2):
 * A = `poeiragain=0` (termo medido zerado, cobertura intacta), B = o
 * ganho padrão — a MESMA câmera, o mesmo volume sintético
 * (`?poeira=teste`). O ganho só pode pintar onde há densidade: o recorte
 * central (o cubo mais forte) muda e os quatro cantos (fora dos cubos)
 * não. As duas capturas afirmam antes o modo, `{ativa, sintetica}` e a
 * prontidão — ver `exigirCapturaAtiva`.
 */
async function testeDiferencaLocalizada(proximaPorta, { gas, modo }) {
  const urlA = `${APP}/?q=cinema&gas=${gas}&poeira=teste&poeiragain=0&shot=2&t=30`;
  const urlB = `${APP}/?q=cinema&gas=${gas}&poeira=teste&shot=2&t=30`;
  const urls = `    url A: ${comLinguaDoJuizNaUrl(urlA)}\n    url B: ${comLinguaDoJuizNaUrl(urlB)}\n`;
  process.stdout.write(
    `diferença localizada no ${gas} (poeiragain=0 × padrão, câmera em (0.5,0.5,0.5) pc): `
  );
  try {
    const a = await capturarComCamera(urlA, proximaPorta());
    exigirCapturaAtiva(a, { modo, fonte: 'sintetica' }, 'captura A');
    const b = await capturarComCamera(urlB, proximaPorta());
    exigirCapturaAtiva(b, { modo, fonte: 'sintetica' }, 'captura B');
    const diffCentro = diferencaMedia(await recorte(a.png, CENTRO), await recorte(b.png, CENTRO));
    const linhas = [
      `as duas: uPoeiraModo=${modo}, {ativa, sintetica}, pronto, sem erro`,
      `centro: ${diffCentro.toFixed(2)}/255 (precisa > ${LIMIAR_CENTRO_MIN})`,
    ];
    let falhou = !(diffCentro > LIMIAR_CENTRO_MIN);
    for (const [nome, area] of Object.entries(CANTOS)) {
      const diff = diferencaMedia(await recorte(a.png, area), await recorte(b.png, area));
      linhas.push(`canto ${nome}: ${diff.toFixed(2)}/255 (precisa < ${LIMIAR_CANTO_MAX})`);
      if (!(diff < LIMIAR_CANTO_MAX)) falhou = true;
    }
    process.stdout.write(`${falhou ? 'FALHA' : 'ok'}\n    ${linhas.join('\n    ')}\n${urls}`);
    return falhou;
  } catch (e) {
    process.stdout.write(`FALHA — ${e.message}\n${urls}`);
    return true;
  }
}

/** O recorte cru (RGB) da imagem inteira, para o diagnóstico de
 *  diff-pixel quando duas fotos que deviam ser iguais não são. */
async function cruaInteira(png) {
  return sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

/** O diff-pixel impresso quando o md5 de duas fotos diverge. */
async function descreverDiferenca(pngA, pngB) {
  const { data: a, info } = await cruaInteira(pngA);
  const { data: b } = await cruaInteira(pngB);
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
  return (
    `md5 diferem (${md5(pngA).slice(0, 12)} × ${md5(pngB).slice(0, 12)}); ` +
    `${diferentes} px diferem de ${info.width * info.height}, maior diferença ${maiorDiff}/255`
  );
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
    const base = `${APP}/?q=cinema&gas=macio&shot=2&t=${t}`;
    const urlOn = `${base}&poeira=1`;
    const urlOff = `${base}&poeira=0`;
    const urls =
      `    url poeira=1: ${comLinguaDoJuizNaUrl(urlOn)}\n` +
      `    url poeira=0: ${comLinguaDoJuizNaUrl(urlOff)}\n`;
    process.stdout.write(`controle fora da cobertura (t=${t}, poeira=1 × poeira=0): `);
    try {
      const capturar = async (url, onde) => {
        const r = await capturarCDP({
          url,
          largura: 1280,
          altura: 720,
          dpr: 2,
          porta: proximaPorta(),
          aoAssentar: ({ send }) => lerPagina(send),
        });
        exigirSemErro(r.mexeu, onde);
        return r.png;
      };
      const pngOn = await capturar(urlOn, 'poeira=1');
      const pngOff = await capturar(urlOff, 'poeira=0');
      if (md5(pngOn) === md5(pngOff)) {
        process.stdout.write(`ok — md5 ${md5(pngOn).slice(0, 12)}, sem erro\n${urls}`);
        continue;
      }
      falhou = true;
      process.stdout.write(`FALHA — ${await descreverDiferenca(pngOn, pngOff)}\n${urls}`);
    } catch (e) {
      falhou = true;
      process.stdout.write(`FALHA — ${e.message}\n${urls}`);
    }
  }
  return falhou;
}

/**
 * (a) GÁS ANTIGO → FINO AO VIVO (item 1 da revisão v2) — a sequência
 * exata que derrubou a cena: `antigo` nunca assa, então os quadros criam
 * `window.__poeira` sem bake nenhum, e o PRIMEIRO bake da página só
 * acontece depois da troca. Um tick que lança ali sobe o véu de falha e
 * PARA o laço: a contagem de quadros estáveis, zerada pela troca, não
 * volta, e `bakes` não sobe. A prova exige o contrário dos três — e que
 * a cena siga contando quadros desenhados depois de pronta.
 */
async function testeGasAntigoParaFino(proximaPorta) {
  const url = `${APP}/?q=cinema&gas=antigo&shot=1&t=60`;
  const linhaUrl = `    url: ${comLinguaDoJuizNaUrl(url)}\n`;
  process.stdout.write('transição (a) gás antigo → fino ao vivo: ');
  try {
    const r = await capturarCDP({
      url,
      largura: 640,
      altura: 360,
      dpr: 1,
      porta: proximaPorta(),
      coletar: ERRO_DE_SHADER,
      aoAssentar: async ({ send }) => {
        const antes = await lerPagina(send);
        exigirSemErro(antes, 'antes da troca');
        exigir(antes.bakes !== null, 'antes da troca', 'window.__poeira.bakes ausente', antes);
        await noDirector(send, "forcarGas('fino')");
        const msBake = await esperarPor(
          sessao(send),
          `((window.__poeira && window.__poeira.bakes) || 0) > ${antes.bakes}`,
          TETO_PRONTO_MS
        );
        const msPronto = await esperarPronto(send);
        const depois = await lerPagina(send);
        exigirSemErro(depois, 'depois da troca');
        exigir(msBake !== null, 'depois da troca', `nenhum bake em ${TETO_PRONTO_MS / 1000} s`, depois);
        exigir(
          msPronto !== null,
          'depois da troca',
          `a cena não voltou a ficar pronta em ${TETO_PRONTO_MS / 1000} s — o laço parou?`,
          depois
        );
        await esperarQuadros(send, 20);
        const adiante = await lerPagina(send);
        exigirSemErro(adiante, '20 quadros depois');
        exigir(adiante.quadros > depois.quadros, '20 quadros depois', 'a cena parou de desenhar', adiante);
        return (
          `bakes ${antes.bakes} → ${depois.bakes} (primeiro bake em ${msBake} ms), pronto em ` +
          `${msPronto} ms, quadros desenhados ${depois.quadros} → ${adiante.quadros}, sem véu, sem erro`
        );
      },
    });
    exigirConsoleLimpo(r, 'depois da troca');
    process.stdout.write(`ok — ${r.mexeu}\n${linhaUrl}`);
    return false;
  } catch (e) {
    process.stdout.write(`FALHA — ${e.message}\n${linhaUrl}`);
    return true;
  }
}

const TETO_FONTE_MS = 15000;

/**
 * (b) SINTÉTICA → GAIA MÉDIA AO VIVO (item 2 da revisão v2) — a página
 * abre com os cubos de `?poeira=teste`, a gaveta pede "Gaia média"
 * (`forcarPoeira('media')`), e o estado tem de chegar a `{ativa, gaia}`
 * dentro do teto. A foto depois da troca tem de ser IDÊNTICA (md5) à da
 * URL resultante (`poeira=media`) aberta do zero, na mesma câmera: o
 * mesmo endereço não pode representar duas cenas conforme o histórico.
 * md5 e não tolerância porque o caminho é determinístico — medido em
 * 28/09: md5 igual entre a troca ao vivo e a abertura do zero, e entre
 * duas aberturas do zero. E a igualdade só prova algo se as duas fontes
 * desenham diferente: a foto ANTES da troca (cubos) tem de diferir da de
 * DEPOIS no recorte central (medido 9,80/255).
 */
async function testeTrocaDeFonte(proximaPorta) {
  const urlVivo = `${APP}/?q=cinema&poeira=teste&shot=1&t=60`;
  // a URL que a gaveta deixa depois do clique em "Gaia média"
  const urlResultante = `${APP}/?q=cinema&poeira=media&shot=1&t=60`;
  const urls =
    `    url ao vivo: ${comLinguaDoJuizNaUrl(urlVivo)}\n` +
    `    url resultante: ${comLinguaDoJuizNaUrl(urlResultante)}\n`;
  process.stdout.write('transição (b) sintética → Gaia média ao vivo × a URL resultante do zero: ');
  try {
    const vivo = await capturarCDP({
      url: urlVivo,
      largura: 640,
      altura: 360,
      dpr: 1,
      porta: proximaPorta(),
      coletar: ERRO_DE_SHADER,
      aoAssentar: async ({ send }) => {
        await posicionarCamera(send, CAM_POS_PC, OLHAR_PC);
        const antes = await lerPagina(send);
        exigirSemErro(antes, 'antes da troca');
        exigir(
          antes.pronto === true && ehEstado(antes, 'ativa', 'sintetica'),
          'antes da troca',
          'a página não está pronta em {ativa, sintetica}',
          antes
        );
        const fotoAntes = await fotografar(send);
        await noDirector(send, "forcarPoeira('media')");
        const msFonte = await esperarPor(
          sessao(send),
          "(() => { const e = window.__director.estadoDaPoeira; return e.situacao === 'ativa' && e.fonte === 'gaia'; })()",
          TETO_FONTE_MS
        );
        const msPronto = msFonte === null ? null : await esperarPronto(send);
        const depois = await lerPagina(send);
        exigirSemErro(depois, 'depois da troca');
        exigir(
          msFonte !== null,
          'depois da troca',
          `estadoDaPoeira não chegou a {ativa, gaia} em ${TETO_FONTE_MS / 1000} s`,
          depois
        );
        exigir(msPronto !== null && depois.pronto === true, 'depois da troca', 'a cena não voltou a ficar pronta', depois);
        return { fotoAntes, msFonte, msPronto };
      },
    });
    exigirConsoleLimpo(vivo, 'ao vivo');
    const zero = await capturarComCamera(urlResultante, proximaPorta());
    exigirCapturaAtiva(zero, { modo: null, fonte: 'gaia' }, 'do zero');
    const { fotoAntes, msFonte, msPronto } = vivo.mexeu;
    const diffAntes = diferencaMedia(await recorte(fotoAntes, CENTRO), await recorte(vivo.png, CENTRO));
    const linhas = [
      `{ativa, gaia} ${msFonte} ms depois da troca, pronto em mais ${msPronto} ms, sem erro nas duas páginas`,
      `centro antes × depois da troca: ${diffAntes.toFixed(2)}/255 (precisa > ${LIMIAR_CENTRO_MIN})`,
    ];
    let falhou = !(diffAntes > LIMIAR_CENTRO_MIN);
    if (md5(vivo.png) === md5(zero.png)) {
      linhas.push(`depois da troca × do zero: md5 igual (${md5(vivo.png).slice(0, 12)})`);
    } else {
      // A PIRÂMIDE (E3c) guarda cada tijolo numa vaga do atlas que depende
      // do caminho: a página "do zero" carrega tijolos em t = 60 antes de a
      // câmera ir para casa, e o mesmo tijolo cai noutra vaga; num atlas de
      // lado que não é potência de 2 a coordenada normalizada arredonda
      // diferente por vaga (medido 28/09: 2 px de 230.400, 1/255). Aceita-se
      // esse arredondamento e só ele — no máximo 1/255 em no máximo 0,01%
      // dos pixels; uma fonte errada muda o quadro inteiro.
      const { data: a, info } = await cruaInteira(vivo.png);
      const { data: b } = await cruaInteira(zero.png);
      let diferentes = 0;
      let maior = 0;
      for (let i = 0; i < a.length; i += info.channels) {
        let d = 0;
        for (let c = 0; c < info.channels; c++) d = Math.max(d, Math.abs(a[i + c] - b[i + c]));
        if (d > 0) {
          diferentes++;
          if (d > maior) maior = d;
        }
      }
      const total = info.width * info.height;
      if (!(maior <= 1 && diferentes <= total * 1e-4)) falhou = true;
      linhas.push(
        `depois da troca × do zero: ${diferentes} px de ${total} diferem, maior ${maior}/255 ` +
          '(aceita só o arredondamento das vagas: ≤ 1/255 em ≤ 0,01% dos px)'
      );
    }
    process.stdout.write(`${falhou ? 'FALHA' : 'ok'}\n    ${linhas.join('\n    ')}\n${urls}`);
    return falhou;
  } catch (e) {
    process.stdout.write(`FALHA — ${e.message}\n${urls}`);
    return true;
  }
}

const TETO_INDISPONIVEL_MS = 3000;

/**
 * (c) SEM CARTOGRAFIA (`cart=off`), A POEIRA PEDIDA (item 4 da revisão
 * v2) — sem cartografia não há bloco a buscar, e o pedido tem de
 * encerrar como 'indisponivel' logo, nos dois caminhos: pedida já na URL
 * (`poeira=media`) e pedida AO VIVO depois de a página abrir com a poeira
 * desligada — o caso que ficava em 'carregando' para sempre, porque o
 * `init` não tinha pedido nenhum a encerrar. A captura também não pode
 * ficar esperando o bloco que nunca vem (`pronto`).
 */
async function testeCartografiaIndisponivel(proximaPorta) {
  let falhou = false;
  const urlNaUrl = `${APP}/?q=cinema&cart=off&poeira=media&shot=1&t=60`;
  process.stdout.write('transição (c) sem cartografia, poeira pedida na URL: ');
  try {
    const r = await capturarCDP({
      url: urlNaUrl,
      largura: 640,
      altura: 360,
      dpr: 1,
      porta: proximaPorta(),
      aoAssentar: ({ send }) => lerPagina(send),
    });
    const p = r.mexeu;
    exigirSemErro(p, 'ao abrir');
    exigir(ehEstado(p, 'indisponivel', null) && p.pronto === true, 'ao abrir', 'não está pronta em {indisponivel}', p);
    process.stdout.write('ok — indisponivel e pronta ao abrir, sem erro\n');
  } catch (e) {
    falhou = true;
    process.stdout.write(`FALHA — ${e.message}\n`);
  }
  process.stdout.write(`    url: ${comLinguaDoJuizNaUrl(urlNaUrl)}\n`);

  const urlAoVivo = `${APP}/?q=cinema&cart=off&shot=1&t=60`;
  process.stdout.write("transição (c) sem cartografia, poeira desligada → 'media' ao vivo: ");
  try {
    const r = await capturarCDP({
      url: urlAoVivo,
      largura: 640,
      altura: 360,
      dpr: 1,
      porta: proximaPorta(),
      aoAssentar: async ({ send }) => {
        const antes = await lerPagina(send);
        exigirSemErro(antes, 'antes do pedido');
        exigir(
          ehEstado(antes, 'desligada', null),
          'antes do pedido',
          'a página devia abrir com a poeira desligada — senão a prova não passa pelo caminho do item 4',
          antes
        );
        await noDirector(send, "forcarPoeira('media')");
        const ms = await esperarPor(
          sessao(send),
          "window.__director.estadoDaPoeira.situacao === 'indisponivel'",
          TETO_INDISPONIVEL_MS
        );
        const msPronto = await esperarPronto(send);
        await esperarQuadros(send, 30);
        const depois = await lerPagina(send);
        exigirSemErro(depois, 'depois do pedido');
        exigir(
          ms !== null,
          'depois do pedido',
          `situacao não chegou a 'indisponivel' em ${TETO_INDISPONIVEL_MS / 1000} s`,
          depois
        );
        exigir(ehEstado(depois, 'indisponivel', null), '30 quadros depois', "saiu de 'indisponivel'", depois);
        exigir(msPronto !== null && depois.pronto === true, 'depois do pedido', 'a cena não voltou a ficar pronta', depois);
        return (
          `desligada → indisponivel em ${ms} ms, ainda indisponivel 30 quadros depois, ` +
          `pronto em ${msPronto} ms, sem erro`
        );
      },
    });
    process.stdout.write(`ok — ${r.mexeu}\n`);
  } catch (e) {
    falhou = true;
    process.stdout.write(`FALHA — ${e.message}\n`);
  }
  process.stdout.write(`    url: ${comLinguaDoJuizNaUrl(urlAoVivo)}\n`);
  return falhou;
}

/**
 * (d) NO FINO, O BRILHO NÃO REASSA (item 7 da revisão v2) — no fino
 * (modo 2) ganho, gama e lanes são lidos AO VIVO no raymarch, e o bake
 * não os lê. Com o Gaia ativo, média → suave → forte tem de deixar
 * `window.__poeira.bakes` igual: a prontidão esperada depois de cada
 * troca só volta depois de quadros desenhados, então um rebake pedido
 * pela troca já estaria contado. E o recorte central tem de mudar entre
 * suave e forte — a imagem parada do fino refeita com o ganho novo, e
 * não congelada. O contador tem de estar vivo na página (≥ 1 bake ao
 * abrir), senão "igual" passaria calado. `poeiralanes=0`: desde 28/09
 * as três opções do Gaia levam a textura inventada, que escava o recorte
 * central — com ela a diferença suave × forte ali caiu de 8,25 para
 * 4,07/255 (medido 28/09), abaixo do limiar; a prova é sobre o ganho
 * não reassar e mudar a imagem, e a porta de bancada vence a textura.
 */
async function testeBrilhoNoFino(proximaPorta) {
  const url = `${APP}/?q=cinema&gas=fino&poeira=media&poeiralanes=0&shot=1&t=60`;
  const linhaUrl = `    url: ${comLinguaDoJuizNaUrl(url)}\n`;
  process.stdout.write("transição (d) no fino com o Gaia, 'suave' → 'forte' ao vivo: ");
  try {
    const r = await capturarCDP({
      url,
      largura: 640,
      altura: 360,
      dpr: 1,
      porta: proximaPorta(),
      coletar: ERRO_DE_SHADER,
      aoAssentar: async ({ send }) => {
        await posicionarCamera(send, CAM_POS_PC, OLHAR_PC);
        const inicio = await lerPagina(send);
        exigirSemErro(inicio, 'ao abrir');
        exigir(
          inicio.modo === 2 && ehEstado(inicio, 'ativa', 'gaia') && inicio.pronto === true,
          'ao abrir',
          'não está pronta no fino com o Gaia ativo (modo 2, {ativa, gaia})',
          inicio
        );
        exigir(inicio.bakes >= 1, 'ao abrir', 'nenhum bake contado — o contador não está vivo', inicio);
        const trocar = async (variante) => {
          const onde = `depois de '${variante}'`;
          await noDirector(send, `forcarPoeira('${variante}')`);
          const ms = await esperarPronto(send);
          const p = await lerPagina(send);
          exigirSemErro(p, onde);
          exigir(ms !== null && p.pronto === true, onde, 'a cena não voltou a ficar pronta', p);
          exigir(p.modo === 2 && ehEstado(p, 'ativa', 'gaia'), onde, 'saiu do fino com o Gaia ativo', p);
          return p;
        };
        const suave = await trocar('suave');
        const fotoSuave = await fotografar(send);
        const forte = await trocar('forte');
        return { bakes: [inicio.bakes, suave.bakes, forte.bakes], fotoSuave };
      },
    });
    exigirConsoleLimpo(r, 'depois das trocas');
    const { bakes, fotoSuave } = r.mexeu;
    const diffCentro = diferencaMedia(await recorte(fotoSuave, CENTRO), await recorte(r.png, CENTRO));
    const linhas = [
      `bakes ao abrir (média) / depois de 'suave' / depois de 'forte': ${bakes.join(' / ')} (precisam ser iguais)`,
      `centro 'suave' × 'forte': ${diffCentro.toFixed(2)}/255 (precisa > ${LIMIAR_CENTRO_MIN})`,
    ];
    const falhou = bakes[1] !== bakes[0] || bakes[2] !== bakes[1] || !(diffCentro > LIMIAR_CENTRO_MIN);
    process.stdout.write(`${falhou ? 'FALHA' : 'ok'}\n    ${linhas.join('\n    ')}\n${linhaUrl}`);
    return falhou;
  } catch (e) {
    process.stdout.write(`FALHA — ${e.message}\n${linhaUrl}`);
    return true;
  }
}

async function main() {
  // `porta` é a porta de depuração remota do Chrome que capturarCDP
  // sobe sozinho — nada a ver com a 5173 do vite, ocupada por ele.
  // Chrome novo a cada captura, porta nova a cada captura (padrão de
  // previas-de-destino.mjs/sky-capture.mjs).
  let porta = 9700 + (process.pid % 100);
  const proximaPorta = () => porta++;
  let falhou = false;
  process.stdout.write(`commit ${procedencia()} · app ${APP}\n`);

  for (const combinacao of COMBINACOES) {
    const url = `${APP}/?${combinacao}&q=cinema&shot=2&t=60`;
    const linhaUrl = `    url: ${comLinguaDoJuizNaUrl(url)}\n`;
    process.stdout.write(`${combinacao}: `);
    try {
      const { png, linhas, mexeu } = await capturarCDP({
        url, largura: 640, altura: 360, dpr: 1, porta: proximaPorta(),
        coletar: ERRO_DE_SHADER,
        aoAssentar: ({ send }) => lerPagina(send),
      });
      const erro = linhas.length ? linhas.join(' | ') : null;
      exigirSemErro(mexeu, 'depois da captura');
      const { channels } = await sharp(png).stats();
      const luminancia = channels.slice(0, 3).reduce((soma, c) => soma + c.mean, 0) / 3;
      const pretaDemais = luminancia < LUMINANCIA_MINIMA;

      if (erro) {
        falhou = true;
        process.stdout.write(`FALHA — erro de shader/GL no console: ${erro}\n${linhaUrl}`);
      } else if (pretaDemais) {
        falhou = true;
        process.stdout.write(
          `FALHA — tela praticamente preta (luminância ${luminancia.toFixed(2)}/255)\n${linhaUrl}`
        );
      } else {
        process.stdout.write(`ok — luminância ${luminancia.toFixed(2)}/255, sem erro\n${linhaUrl}`);
      }
    } catch (e) {
      falhou = true;
      process.stdout.write(`FALHA — ${e.message}\n${linhaUrl}`);
    }
  }

  for (const caminho of CAMINHOS_DA_POEIRA) {
    if (await testeDiferencaLocalizada(proximaPorta, caminho)) falhou = true;
  }
  if (await testeControleForaDaCobertura(proximaPorta)) falhou = true;
  if (await testeGasAntigoParaFino(proximaPorta)) falhou = true;
  if (await testeTrocaDeFonte(proximaPorta)) falhou = true;
  if (await testeCartografiaIndisponivel(proximaPorta)) falhou = true;
  if (await testeBrilhoNoFino(proximaPorta)) falhou = true;

  process.exit(falhou ? 1 : 0);
}

main();
