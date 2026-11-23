// Serve: lei — a luz dos planetas cai onde o ?dbgplan mandou, a ≤0,5 px + a incerteza do sintético, por dois estimadores
// Custo: ~1,5 min as quatro vistas (0,4 min por vista)
// ============================================================
// RÉGUA 3 da D10 (Onda 4) — O PIXEL.
//
//   node scripts/visual/planeta-pixel.mjs             # as 3 vistas profundas e a terra01 (a Lua)
//   node scripts/visual/planeta-pixel.mjs ua150       # uma só
//   LIMIAR=2 node scripts/visual/planeta-pixel.mjs    # outro limiar de delta
//
// As réguas 1 e 2 provam a CADEIA (tabela → cena → NDC → px) e provam que o
// app lê o mesmo Float32Array que a GPU vai ler. Nenhuma das duas olha a
// imagem. Esta olha: ela captura o par `?plan=1` × `?noplan=1` com o MESMO
// binário, subtrai, acha as componentes conexas da luz que APARECEU e cobra
// que cada mancha caia onde o `?dbgplan` mandou, a ≤0,5 px, medido por DOIS
// estimadores independentes (centroide ponderado pelo delta e centro da
// caixa envolvente). É o último elo: sem ele, "a camada acende os planetas"
// é uma conta que ninguém conferiu contra o que a tela mostra.
//
// ------------------------------------------------------------
// A FLAG DE MEDIÇÃO — por que este instrumento pina `&nobloom=1`
// ------------------------------------------------------------
// O Sol-ponto a 150 UA tem m = −15,84 e pico de PSF de 4,8e6. Com o bloom
// do app ligado, 31,85% do QUADRO satura — e um quadro saturado não tem
// centroide: a mancha do Sol engole o desfile inteiro e a régua mediria a
// forma do pós-processamento, não a posição dos corpos.
//
// A resposta NÃO é apagar o brilho do Sol. Decisão do coordenador registrada
// na F4: o brilho do Sol não se mente — encará-lo de 150 UA ofusca porque é
// físico, e teto artificial nenhum entra no Sol-ponto (auto-exposição é
// pendência nomeada da Onda 8, com estes números como semente; `starOptics`
// é da 7a). Quem abla é o INSTRUMENTO, e há precedente exato: o protocolo do
// céu (`sky-capture.mjs`) pina `exp=4.4&knee=0.02&kneeamt=1` porque medir
// contra uma astrofoto sem o stretch equivalente compara curva de tom, não
// céu. Aqui é a mesma figura — `&nobloom=1` é a lente da régua.
//
// E as TRÊS VISTAS OFICIAIS (`ua500`/`ua150`/`ua40` do `ab-identidade`)
// continuam com o render DEFAULT, bloom ligado: elas documentam o estado
// verdadeiro do produto. Régua e retrato medem coisas diferentes de
// propósito, e este parágrafo existe para ninguém "consertar" a divergência.
//
// ------------------------------------------------------------
// A SEGUNDA METADE DA LENTE — `&noclarao=1` (item 58a, 2026-08-22)
// ------------------------------------------------------------
// `&nobloom=1` sozinho parou de isolar em 16/08, quando o M2 da Lei da
// Estrela pôs o CLARÃO DE ASAS numa camada própria (`world/clarao.ts`) que
// não passa pelo bloom: ela desenha a asa Moffat do Sol direto no quadro.
// Como a asa só acende quando o Sol-ponto está visível, ela entrava
// INTEIRA no diff `com camada − sem camada`, e o resultado media a asa em
// vez dos dez pontos. Medido a 150 UA, antes da correção: 37.798 px
// acesos em 209 componentes, uma mancha ÚNICA de 37.132 px engolindo SEIS
// corpos como `SOB-GLARE`, e 191 componentes órfãs — os farrapos da asa
// no limiar de 1/255, a ~110 px do centro — que são um dos três modos de
// REPROVAR. A régua reprovava a asa e chamava isso de planetas.
//
// A asa NÃO é esta representação: no cadastro ela é a linha `heroes`, do
// M2, e quem a julga é `luz-do-quadro.mjs` (a coluna `clarao(px)` da
// escada). Desligá-la nos DOIS lados do A/B tira-a do diff sem tocar em
// nada do que esta régua veio medir — mesmo binário, mesma figura do
// `&nobloom=1`. Medido depois: 393 px em 4 componentes, ZERO órfãs longe,
// e Júpiter e Saturno saem de `SOB-GLARE` para `MEDIDO` (0,049/0,073 px e
// −0,310/+0,006 px de centroide).
//
// O QUE A LENTE NÃO CONSERTA, e não deve: Mercúrio, Vênus e a Terra caem a
// 3,2, 6,8 e 9,3 px do centro do Sol a 150 UA, DENTRO do sprite de ~21 px
// dele. Nenhuma lente separa dois pontos que a geometria põe no mesmo
// lugar — é `SOB-GLARE` de verdade, declarado e não julgado, e a régua os
// mede nas outras duas vistas, onde o desfile abre.
//
// ------------------------------------------------------------
// O INSTRUMENTO É VALIDADO NOS DOIS ESTADOS (M5)
// ------------------------------------------------------------
// Uma régua que só sabe dizer "achei" não prova nada: se o diff acusasse
// componentes por ruído de captura, todo corpo "casaria" com alguma coisa.
// Por isso, antes de qualquer veredito:
//   (a) AUTO-TESTE SINTÉTICO, em processo, sem GPU: um par de imagens
//       fabricadas com manchas em posições conhecidas tem de sair MEDIDO, e
//       o MESMO par com o alvo deslocado 3 px de propósito tem de REPROVAR.
//       Instrumento que aprova alvo errado não mede — só concorda.
//   (b) PAR NULO: `?noplan=1` × `?noplan=1`, duas capturas independentes da
//       mesma URL, tem de caber no TETO DE RUÍDO da casa (`TETO_DO_RUIDO`,
//       `chrome.mjs`: ≤ 1/255 em ≤ 0,03 % dos px — `julgarParNulo`). Até 22/11
//       exigia ZERO, e neste PC (D3D11) 57–86 px de uma galáxia vizinha piscam
//       1/255 de quadro a quadro com a cena parada: o zero reprovava a máquina.
//
// ------------------------------------------------------------
// OS DOIS ESTIMADORES, E POR QUE O JUÍZO É POR EIXO
// ------------------------------------------------------------
// O centroide ponderado pelo delta é o estimador FINO: ele lê a energia de
// cada pixel e resolve muito abaixo da grade (medido nas três vistas: o pior
// dos onze corpos casados fica em 0,26 px). O centro da caixa envolvente é o
// estimador GROSSO e INDEPENDENTE — ele não usa peso nenhum, só quais pixels
// passaram do limiar —, e existe justamente para não deixar o veredito
// depender de uma conta só.
//
// A cobrança dos 0,5 px da D10 é POR EIXO, e isso não é folga: o centro da
// caixa vive numa grade de meio pixel por construção ((x0+x1+1)/2), então
// ±0,5 px em x e em y É a resolução dele. Cobrar a HIPOTENUSA ≤0,5 seria
// cobrar 0,35 px por eixo — mais fino que a grade —, e o que reprovaria não
// seria a camada, seria a régua.
//
// A CAIXA JULGADA É A DE MEIA-ALTURA desde 22/08 (item 58a) — a tolerância
// NÃO mudou, o estimador é que ficou honesto. Sobre todos os pixels da
// componente ele era refém do último: a fronteira em 1/255 é onde um pixel
// da cauda entra ou não por arredondamento, e um pixel solto muda a caixa
// inteira. Medido: Júpiter na `ua40` saía 7×7 em vez dos 6×6 do sprite
// (`gl_PointSize` = 5,93 px) e a caixa caía 0,724 px em y — REPROVA — com o
// centroide a 0,014 px. Com o corte em metade do pico da componente, onde o
// perfil é íngreme e a fronteira é simétrica, a caixa ENCOLHE e melhora em
// todos: Júpiter 0,724 → 0,224, a Terra 0,420 → 0,080, Saturno 0,321 →
// 0,179, e o pior eixo das três vistas passa de 0,724 para 0,286 (Vênus em
// x, na `ua40`). Ver `caixaDeMeiaAltura`.
//
// E A CAIXA NÃO É JULGADA quando outro corpo previsto tem luz DENTRO da mesma
// componente: a caixa é propriedade da componente inteira e o vizinho a
// estica. O centroide não sofre disso, porque o vizinho pesa ordens de
// grandeza menos. Medido na `ua150`: a Terra cai a 9,3 px do Sol, dentro do
// sprite dele, e estica a caixa do Sol em 2 px de um lado (Δcaixa 1,000)
// enquanto o centroide do Sol fica a 0,003 px do previsto.
//
// ------------------------------------------------------------
// COMO LER A COLUNA `status`
// ------------------------------------------------------------
// MEDIDO      a mancha existe e os centros batem com o previsto, por eixo, a
//             ≤0,5 px MAIS a incerteza que o sintético mede para o pico na foto
//             e o tamanho daquela mancha (`incertezaDoSintetico`, desde 22/11),
//             separada para o centroide e a caixa (esta quando julgável).
// SOB-GLARE   o pixel previsto já está SATURADO no lado `plan` (ou a mancha
//             do corpo não se separa da do Sol). A camada só SOMA luz: onde o
//             Sol já clipou, somar não muda byte nenhum. Declarado, não
//             julgado — e não é defeito: é o que 150 UA do Sol fazem.
// SOB-LIMIAR  a posição NÃO é julgada. COM mancha no pixel previsto: a
//             incerteza do centroide para aquela mancha passa de
//             `TETO_DA_INCERTEZA_PX` (desde 22/11). SEM mancha: o pico de PSF
//             do `?dbgplan` (buffer linear) está abaixo de `LIMIAR_PICO`. O corpo está lá, com a
//             magnitude certa, e a tela de 8 bits não tem degrau para ele. É
//             a fotometria honesta — Urano/Netuno/Plutão a 150 UA são
//             exatamente este caso. Quando ainda assim sobram pixels acesos
//             ao lado, a linha DIZ quantos: é o corpo em cima do degrau, cuja
//             PSF só arredonda para cima em faíscas soltas (Marte na `ua150`).
// FUNDIDO     duas manchas previstas caíram na MESMA componente e não há como
//             atribuir centroide. Declarado, não julgado.
// FUNDIDA-COM-TERRA  a Lua (0,0026 UA da Terra) a menos de LUA_FUNDIDA_PX da Terra, ou na
//             mesma componente dela: é parte do MESMO ponto de luz. A Terra segue
//             medida como se a Lua não existisse; a Lua não é medida. Declarado,
//             não julgado. Nas três profundas a Lua não tem posição (sem instante,
//             fica no centro do Sol com pico 0); quem a mede é a `terra01`.
// FORA-DA-TOLERÂNCIA / SEM-COMPONENTE / ÓRFÃ  são os três modos de REPROVAR:
//             mancha no lugar errado, corpo que deveria acender e não acendeu,
//             e luz que apareceu onde corpo nenhum foi previsto.
// ============================================================
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  GPU_FLAGS, lancarChrome, capturarCDP, julgarProntidao, APP_PADRAO, julgarTetoDoRuido, NAO_DETERMINISTICA, TETO_DO_RUIDO,
  SAIDA_NAO_MEDE,
} from './chrome.mjs';
import { VISTAS, PIN } from './ab-identidade.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = process.env.APP_URL || APP_PADRAO;

/** As três vistas do domínio profundo (D9) — a lista vem do harness. */
export const PROFUNDAS = ['ua500', 'ua150', 'ua40'];

/**
 * A VISTA PERTO DA TERRA (rodada 4, decisão 4 do dono, 22/11): a única em que
 * a Lua é medida. Nas profundas não há Lua a medir: sem instante (`retrato`)
 * o ponto dela fica no centro do Sol com pico 0. Aqui o `jd` é o da época do
 * retrato (2026-01-01), que dá à Lua a efeméride viva, e a câmera fica a
 * 0,1 UA da Terra, na normal do plano Sol–Terra–Lua, olhando para a Terra:
 * Terra e Lua (0,0024 UA) são dois pontos separados, com disco abaixo da
 * cessão, e o Sol a ~84° do eixo, fora do quadro. As coordenadas vêm da
 * sonda `r4-laminas/sonda-terra-lua.mjs` (fora do git).
 */
export const PERTO_DA_TERRA = [
  'terra01',
  '?jd=2461041.5&pos=-7.70231349203e-7,0.00000450756852616,0.00000143205679956'
    + '&look=-8.44942803724e-7,0.00000430478166891,0.00000186603836028&shot=2',
];

/**
 * O A/B da camada, com o MESMO binário dos dois lados. O lado LIGADO
 * não tem porta desde o M4 (2026-08-22): `?plan=1` morreu com a chave
 * `PLANETAS_DEFAULT_ON` (regra iv do §4 da Lei) porque a camada é o
 * padrão — o lado ligado é simplesmente a URL sem `?noplan`.
 */
const PORTA_LIGA = '';
const PORTA_DESLIGA = '&noplan=1';
/**
 * A lente da régua — ver o cabeçalho. Não é o look do app. `&tone=linear`
 * (22/11, `destravar/x-terra-e-luz-perdida.md`): a curva Neutral tira de todos
 * os canais um deslocamento do mais escuro, e em fundo colorido isso andava a
 * Terra ua40 ~0,48 px e criava "luz perdida" de 2–5/255; em linear a Terra cai
 * a +0,136/+0,020 no centro e −0,050/−0,073 na caixa, e a camada só soma. O sintético mede na mesma lente.
 */
const FLAG_MEDICAO = '&nobloom=1&noclarao=1&tone=linear';
/** O readout da D7, ligado nos DOIS lados para o diff não medir o readout. */
const READOUT = '&dbgplan=1';

/** A janela do harness: 1800×1800 pedidos = 1800×1713 efetivos. */
const JANELA = { largura: 1800, altura: 1800 };

/** Lua a menos disto da Terra (px previstos) é o mesmo ponto de luz. */
export const LUA_FUNDIDA_PX = 1;

/** Delta de 8 bits que já conta como luz. 1 = qualquer degrau. */
export const LIMIAR_DELTA = Math.max(1, Number(process.env.LIMIAR || 1));

/** O que a D10 cobra dos dois estimadores de centro. */
export const TOLERANCIA_PX = 0.5;

/**
 * O corpo SEM componente no pixel previsto: abaixo disto é `SOB-LIMIAR`,
 * acima é `SEM-COMPONENTE` (reprova). Escala do `pico` do `?dbgplan`: o
 * buffer linear (já com o `expoM0`), antes da exposição do renderer, da curva
 * de tom e do sRGB — 1/255 nele vale ~13 degraus da foto só pela conta do
 * sRGB (1/255 em sRGB é ~3,0e-4 linear), então um corpo entre ~3e-4 e 3,9e-3 que não acendeu sai
 * desculpado. Sem componente não há `deltaMax`, e o `pico` é a única previsão.
 */
export const LIMIAR_PICO = 1 / 255;

/**
 * O fundo da foto no sintético, em degraus: sorteado em [0, 16) por pixel e
 * canal — a faixa medida em volta dos corpos nos recortes do `destravar/viii`
 * e do `x` (1–16 por canal). Ele decide em que trecho da curva sRGB a luz do
 * corpo cai, e a parte fracionária dele é o que o arredondamento de 8 bits come.
 */
export const FUNDO_DO_SINTETICO = 16;

/**
 * A incerteza é o P99 do erro do sintético, e não o máximo: com ~1.000
 * repetições guardadas, o máximo de 5 sementes anda 1,37–1,68 px na caixa
 * (pico 2, σ 1,5) e 1,81–2,29 (pico 2, σ 2,5) — dos dois lados do teto, e o
 * veredito dependeria da semente. O P99 das mesmas 5 sementes anda ≤0,13 px
 * (1,16–1,23 e 1,44–1,55; centroide de pico 1, σ 1,5: 1,04–1,17). Isso vale
 * para as manchas FRACAS; nas fortes sobram poucas repetições (40 em pico 100,
 * σ 1,5; 1–15 perto de 255 com σ ≤ 1), e com menos de 100 o P99 é o máximo.
 */
export const PERCENTIL_DO_SINTETICO = 0.99;

/**
 * Acima disto (px) a incerteza não deixa medir: a do centroide põe o corpo
 * em `SOB-LIMIAR`; a da caixa só tira a caixa do juízo.
 */
export const TETO_DA_INCERTEZA_PX = 1.5;

/**
 * Raio em que uma componente órfã ainda é o HALO de um corpo já casado, e
 * não luz inventada. O sprite do Sol-ponto tem `size = 2·(2,2σ + rSat)`, o
 * que dá ~21 px de LADO nas três vistas profundas; 30 px cobre o sprite
 * inteiro com folga. Além disso, luz que apareceu longe de todo corpo
 * previsto é defeito, e a régua reprova.
 */
export const RAIO_HALO_PX = 30;

// ------------------------------------------------------------
// AS FUNÇÕES PURAS. Elas rodam nos DOIS lados: aqui no Node (auto-teste
// sintético e `planeta-pixel.test.mjs`) e DENTRO do Chrome, injetadas por
// `toString()` na página de análise. Injetar a mesma função em vez de
// reescrevê-la na string do HTML é o que impede a régua de medir uma coisa
// no teste e outra na tela — o defeito que o `diff-pixel.mjs` não pode ter
// porque a conta dele vive só na string.
// ------------------------------------------------------------

/**
 * A CAIXA DE MEIA-ALTURA — o estimador GROSSO, na largura em que ele é
 * um estimador.
 *
 * A caixa nasceu sobre TODOS os pixels da componente, isto é, sobre o
 * limiar de UM degrau de 8 bits. Isso a torna refém do último pixel: a
 * PSF é um gaussiano amostrado numa grade, e a fronteira em 1/255 é
 * exatamente onde um pixel entra ou não por arredondamento. Medido em
 * 22/08, Júpiter na `ua40`: a componente tem 33 px e a caixa crua sai
 * 7×7 em vez dos 6×6 do sprite (`gl_PointSize` = 5,93 px), porque UM
 * pixel solto uma linha acima passou o degrau. A caixa cai meio pixel
 * (centro em 829,5 contra 830,224 previstos: Δ 0,724) enquanto o
 * centroide fica a 0,014 px — e a régua reprovava a camada por causa
 * de um pixel.
 *
 * É a MESMA doença que o cabeçalho já nomeia para o vizinho ("a caixa é
 * propriedade da componente inteira e o vizinho a estica"); a diferença
 * é que aqui quem estica é a própria cauda da PSF. A resposta é a
 * padrão em fotometria: medir a extensão a MEIA ALTURA do pico da
 * componente, onde o perfil é íngreme e a fronteira é simétrica. É um
 * estimador MAIS ESTRITO (a caixa encolhe), continua independente do
 * centroide (usa só quais pixels passam, sem peso nenhum) e a
 * resolução de meio pixel do `(x0+x1+1)/2` não muda — a tolerância de
 * 0,5 px por eixo fica onde estava.
 */
export function caixaDeMeiaAltura(pixels, dMax, deltaMax, W) {
  const corte = deltaMax / 2;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let n = 0;
  for (const p of pixels) {
    if (dMax[p] < corte) continue;
    const x = p % W;
    const y = (p / W) | 0;
    n++;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  // componente de um pixel só: a meia-altura é ele mesmo
  return n ? { n, x0, y0, x1, y1 } : { n: 0, x0: 0, y0: 0, x1: 0, y1: 0 };
}

/**
 * O DIFF e as COMPONENTES CONEXAS da luz que apareceu.
 *
 * `a` é o lado SEM a camada e `b` o lado COM ela, os dois RGBA de W×H —
 * a ordem importa: o sinal de `b − a` é o que prova "só adição".
 *
 * Peso do centroide = soma dos três deltas de canal (a luz somada), e não
 * o delta máximo: é a energia que chegou naquele pixel, que é o que faz do
 * centroide um estimador de posição e não de forma.
 */
export function componentesDoDiff({ a, b, W, H, limiar = 1, alvos = [] }) {
  const total = W * H;
  const dMax = new Uint8Array(total);
  const dSoma = new Uint16Array(total);
  let acesos = 0;
  let subiram = 0;
  let desceram = 0;
  // a perda de EXATAMENTE 1/255 é o pisca do D3D11 (`TETO_DO_RUIDO`): fica
  // fora de `desceram` e é contada à parte, para o teto julgar
  let desceramNoRuido = 0;
  let somaGanho = 0;
  let somaPerda = 0;
  for (let p = 0, i = 0; p < total; p++, i += 4) {
    const dr = b[i] - a[i];
    const dg = b[i + 1] - a[i + 1];
    const db = b[i + 2] - a[i + 2];
    const m = Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db));
    if (m < limiar) continue;
    acesos++;
    dMax[p] = m > 255 ? 255 : m;
    dSoma[p] = Math.abs(dr) + Math.abs(dg) + Math.abs(db);
    // "só adição" é cobrado por CANAL, não pela soma: um pixel que ganha 3
    // no vermelho e perde 1 no azul tem soma positiva e mesmo assim perdeu
    // luz em algum lugar — e a camada é AdditiveBlending, não pode.
    if (dr >= 0 && dg >= 0 && db >= 0) subiram++;
    else if (m === 1) desceramNoRuido++;
    else desceram++;
    for (const v of [dr, dg, db]) { if (v > 0) somaGanho += v; else somaPerda -= v; }
  }

  const rotulo = new Int32Array(total).fill(-1);
  const pilha = new Int32Array(total);
  const componentes = [];
  for (let s = 0; s < total; s++) {
    if (!dMax[s] || rotulo[s] >= 0) continue;
    const id = componentes.length;
    let topo = 0;
    pilha[topo++] = s;
    rotulo[s] = id;
    let n = 0;
    let peso = 0;
    let sx = 0;
    let sy = 0;
    // o segundo momento: o TAMANHO da mancha, que escolhe a incerteza do
    // sintético (`incertezaDoSintetico`) — mesma conta no real e no sintético
    let sxx = 0;
    let syy = 0;
    let deltaMax = 0;
    let x0 = W;
    let y0 = H;
    let x1 = -1;
    let y1 = -1;
    // os pixels da componente, guardados para o SEGUNDO passo da caixa
    // (meia-altura — ver `caixaDeMeiaAltura` abaixo)
    const meus = [];
    while (topo > 0) {
      const p = pilha[--topo];
      const x = p % W;
      const y = (p / W) | 0;
      const w = dSoma[p];
      n++;
      peso += w;
      // +0,5 porque o pixel `x` cobre [x, x+1) e o `px` do `?dbgplan` é
      // medido da BORDA esquerda do quadro: os dois têm de falar a mesma
      // régua, senão a régua inteira erra meio pixel em silêncio.
      sx += w * (x + 0.5);
      sy += w * (y + 0.5);
      sxx += w * (x + 0.5) * (x + 0.5);
      syy += w * (y + 0.5) * (y + 0.5);
      if (dMax[p] > deltaMax) deltaMax = dMax[p];
      meus.push(p);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const q = ny * W + nx;
          if (dMax[q] && rotulo[q] < 0) { rotulo[q] = id; pilha[topo++] = q; }
        }
      }
    }
    // A CAIXA JULGADA É A DE MEIA-ALTURA, não a do limiar de 1 degrau —
    // ver `caixaDeMeiaAltura`. A caixa CRUA fica publicada ao lado
    // porque é ela que diz o quanto a componente inteira se espalha.
    const mh = caixaDeMeiaAltura(meus, dMax, deltaMax, W);
    const cx = sx / peso;
    const cy = sy / peso;
    componentes.push({
      id, n, peso, deltaMax,
      cx, cy,
      sigma: Math.sqrt(Math.max(0, (sxx / peso - cx * cx + syy / peso - cy * cy) / 2)),
      x0, y0, x1, y1,
      nMeia: mh.n,
      cxCaixa: (mh.x0 + mh.x1 + 1) / 2, cyCaixa: (mh.y0 + mh.y1 + 1) / 2,
    });
  }

  // ONDE cada corpo previsto caiu, resolvido AQUI porque o mapa de rótulos
  // tem 3,1 milhões de entradas e não atravessa o `--dump-dom`.
  const ondeCaiu = alvos.map((t) => {
    const ix = Math.floor(t.px);
    const iy = Math.floor(t.py);
    const dentro = ix >= 0 && iy >= 0 && ix < W && iy < H;
    const p = dentro ? iy * W + ix : -1;
    const i = p * 4;
    const cheio = (j) => a[j] === 255 && a[j + 1] === 255 && a[j + 2] === 255;
    return {
      id: t.id,
      px: t.px,
      py: t.py,
      noQuadro: dentro,
      dentroDe: dentro ? rotulo[p] : -1,
      // o pixel do lado COM a camada, e se o lado SEM a camada já estava no
      // teto de 8 bits — o segundo é o que prova "somar aqui não muda byte"
      plan: dentro ? [b[i], b[i + 1], b[i + 2]] : null,
      jaSaturado: dentro ? cheio(i) : false,
    };
  });

  return { W, H, acesos, subiram, desceram, desceramNoRuido, somaGanho, somaPerda, componentes, ondeCaiu };
}

/**
 * A MANCHA SATURADA que contém (x, y) — os pixels em que os três canais
 * bateram no teto de 8 bits, ligados por vizinhança. É o "disco do Sol"
 * como a TELA o vê, medido e não estimado pela fórmula do `rSat`: onde
 * ela cobre, somar luz não pode mudar byte nenhum, e é isso que torna o
 * `SOB-GLARE` uma declaração de física e não uma desculpa.
 */
export function manchaSaturada({ img, W, H, x, y }) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= W || iy >= H) return null;
  const cheio = (p) => img[p * 4] === 255 && img[p * 4 + 1] === 255 && img[p * 4 + 2] === 255;
  const s = iy * W + ix;
  if (!cheio(s)) return null;
  const visto = new Uint8Array(W * H);
  const pilha = new Int32Array(W * H);
  let topo = 0;
  pilha[topo++] = s;
  visto[s] = 1;
  let n = 0;
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  while (topo > 0) {
    const p = pilha[--topo];
    const px = p % W;
    const py = (p / W) | 0;
    n++;
    if (px < x0) x0 = px;
    if (px > x1) x1 = px;
    if (py < y0) y0 = py;
    if (py > y1) y1 = py;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = px + dx;
        const ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (!visto[q] && cheio(q)) { visto[q] = 1; pilha[topo++] = q; }
      }
    }
  }
  return { n, x0, y0, x1, y1, larg: x1 - x0 + 1, alt: y1 - y0 + 1 };
}

/**
 * O BLOCO do `?dbgplan` virado em números. Doze linhas: o cabeçalho (época,
 * distância da câmera, tela, os dois uniformes da PSF) e os onze
 * corpos, cada um com o px previsto e o pico de PSF que o APP calculou —
 * é de propósito que a régua não recalcula o pico: quem tem os uniformes
 * verdadeiros é a camada.
 */
export function lerDbgPlan(bloco) {
  const linhas = String(bloco).split('\n').map((s) => s.trim()).filter((s) => s.startsWith('[dbgplan]'));
  if (linhas.length !== 12) {
    throw new Error(`bloco do ?dbgplan com ${linhas.length} linhas (esperadas 12)`);
  }
  const num = (linha, chave) => {
    const m = linha.match(new RegExp(`${chave}=(-?[\\d.]+(?:e[+-]?\\d+)?)`, 'i'));
    if (!m) throw new Error(`?dbgplan sem ${chave}: ${linha}`);
    return Number(m[1]);
  };
  const cab = linhas[0];
  const tela = cab.match(/tela (\d+)×(\d+) px/);
  if (!tela) throw new Error(`?dbgplan sem "tela LxA": ${cab}`);
  const corpos = linhas.slice(1).map((l) => {
    const id = l.slice('[dbgplan]'.length).trim().split(/\s+/)[0];
    const p = l.match(/px=\((-?[\d.]+), (-?[\d.]+)\)/);
    if (!p) throw new Error(`?dbgplan sem px: ${l}`);
    return {
      id,
      px: Number(p[1]),
      py: Number(p[2]),
      dObsUA: num(l, 'dObs'),
      fase: num(l, 'fase'),
      m: num(l, 'm'),
      E: num(l, 'E'),
      pico: num(l, 'pico'),
    };
  });
  return {
    epoca: (cab.match(/época (\S+)/) || [])[1] ?? '?',
    cameraUA: Number((cab.match(/câmera a ([\d.]+) UA/) || [])[1]),
    largura: Number(tela[1]),
    altura: Number(tela[2]),
    expoM0: num(cab, 'expoM0'),
    sigmaPx: num(cab, 'sigmaPx'),
    visivel: /visível=true/.test(cab),
    corpos,
  };
}

/**
 * O JUÍZO, puro: cruza o previsto (`?dbgplan`) com o medido (componentes) e
 * devolve uma linha por corpo mais o veredito da vista. Ver o cabeçalho
 * para a semântica de cada `status`.
 */
export function casarCorpos({
  previstos, componentes, ondeCaiu,
  tolerancia = TOLERANCIA_PX, limiarPico = LIMIAR_PICO, tetoIncerteza = TETO_DA_INCERTEZA_PX,
  raioHalo = RAIO_HALO_PX,
}) {
  const incertezas = new Map();
  const porId = new Map(componentes.map((c) => [c.id, c]));
  const caiuPorId = new Map(ondeCaiu.map((o) => [o.id, o]));
  // quantos corpos previstos caíram em cada componente: 2+ é `FUNDIDO`
  const ocupantes = new Map();
  for (const o of ondeCaiu) {
    if (o.dentroDe < 0) continue;
    if (!ocupantes.has(o.dentroDe)) ocupantes.set(o.dentroDe, []);
    ocupantes.get(o.dentroDe).push(o.id);
  }

  // A Lua e a Terra: a menos de LUA_FUNDIDA_PX ou na mesma componente, a Lua é
  // parte do ponto da Terra — não conta como "outro corpo" para ela.
  const terra = previstos.find((p) => p.id === 'earth');
  const lua = previstos.find((p) => p.id === 'moon');
  const compLua = caiuPorId.get('moon')?.dentroDe ?? -1;
  const luaFundida = Boolean(terra && lua) && (
    Math.hypot(lua.px - terra.px, lua.py - terra.py) < LUA_FUNDIDA_PX
    || (compLua >= 0 && compLua === (caiuPorId.get('earth')?.dentroDe ?? -2))
  );

  const reclamadas = new Set();
  const linhas = previstos.map((c) => {
    const o = caiuPorId.get(c.id);
    const base = {
      id: c.id, px: c.px, py: c.py, m: c.m, pico: c.pico,
      comp: null, dCentroide: null, dCaixa: null,
    };
    if (!o || !o.noQuadro) return { ...base, status: 'FORA-DO-QUADRO' };
    if (luaFundida && c.id === 'moon') {
      return { ...base, status: 'FUNDIDA-COM-TERRA', motivo: 'mesmo ponto de luz da Terra, não medida' };
    }
    if (o.dentroDe < 0) {
      // sem mancha. Três motivos possíveis, e só um deles é defeito.
      if (o.jaSaturado) {
        return { ...base, status: 'SOB-GLARE', motivo: 'o pixel já estava no teto SEM a camada' };
      }
      // FAÍSCAS: o pixel previsto está apagado, mas há pixels acesos ao lado.
      // É a assinatura do corpo que está EXATAMENTE no degrau da tela — a PSF
      // dele não forma mancha, só arredonda para cima em pixels soltos. Vale
      // dizer, e não esconder atrás de um `SOB-LIMIAR` seco.
      const faiscas = componentes.filter(
        (k) => Math.hypot(k.cx - c.px, k.cy - c.py) <= 5
      );
      const nFaiscas = faiscas.reduce((s, k) => s + k.n, 0);
      return {
        ...base,
        status: c.pico < limiarPico ? 'SOB-LIMIAR' : 'SEM-COMPONENTE',
        motivo: nFaiscas
          ? `${nFaiscas} px acesos soltos a ≤5 px, sem mancha no pixel previsto`
          : undefined,
      };
    }
    const comp = porId.get(o.dentroDe);
    reclamadas.add(o.dentroDe);
    const juntos = ocupantes.get(o.dentroDe) || [];
    // O SOL É O DONO DO SPRITE DELE. Quem cai DENTRO da mancha do Sol não
    // tem centroide próprio para medir — a luz que aquele pixel ganhou é do
    // Sol, e a do corpo não cabe mais no byte. O Sol, esse, é julgado
    // normalmente: o que os vizinhos somam dentro do disco saturado é zero,
    // então o centroide dele não fica contaminado.
    const outros = juntos.filter((n) => n !== c.id && !(luaFundida && c.id === 'earth' && n === 'moon'));
    if (outros.length && c.id !== 'sun') {
      return {
        ...base,
        comp,
        status: juntos.includes('sun') ? 'SOB-GLARE' : 'FUNDIDO',
        motivo: `dentro da mancha de ${outros.join(', ')}`,
      };
    }
    // A TOLERÂNCIA DE CADA CORPO (22/11, decisão da conversa principal): o
    // MAIOR entre os 0,5 px da lei e a incerteza que o sintético mede para o
    // pico NA FOTO (`deltaMax`) e o tamanho (`sigma`) desta componente,
    // separada para o centroide e para a caixa. Não a soma: os 0,5 px já
    // contêm o erro de grade, que o sintético também mede — somar contaria a
    // grade duas vezes e chamaria ruído de MEDIDO. Um corpo brilhante fica na
    // lei; um fraco é julgado na incerteza dele. O P99 deixa de fora as 2–3
    // piores das 256 posições: corpo fraco fora por pouco é "a conferir", não
    // defeito provado. Só quando a do centroide passa do teto o corpo não é
    // mensurável nesta foto; a caixa acima do teto sai do juízo, e o centroide
    // segue julgado. Memorizada por chamada: corpos iguais dão a mesma conta.
    const chave = `${comp.deltaMax}|${Math.round(comp.sigma * 10)}`;
    if (!incertezas.has(chave)) {
      incertezas.set(chave, incertezaDoSintetico({ deltaMax: comp.deltaMax, sigma: comp.sigma }));
    }
    const inc = incertezas.get(chave);
    const tolC = Math.max(tolerancia, inc.centroide);
    const tolB = Math.max(tolerancia, inc.caixa);
    const deOnde = (i) => (i > tolerancia ? `incerteza P99 = ${i.toFixed(2)}` : `lei ${tolerancia}`);
    const fotometria = {
      incC: inc.centroide, incB: inc.caixa, tolC, tolB,
      origemC: deOnde(inc.centroide), origemB: deOnde(inc.caixa),
    };
    if (inc.centroide > tetoIncerteza) {
      return {
        ...base,
        comp,
        ...fotometria,
        status: 'SOB-LIMIAR',
        motivo: `pico na foto ${comp.deltaMax}/255, σ ${comp.sigma.toFixed(2)} px: incerteza do centroide`
          + ` ${inc.centroide.toFixed(2)} px > teto ${tetoIncerteza} — não medido em posição`,
      };
    }
    const dxC = comp.cx - c.px;
    const dyC = comp.cy - c.py;
    const dxB = comp.cxCaixa - c.px;
    const dyB = comp.cyCaixa - c.py;
    // POR EIXO, e não pela distância euclidiana: os dois estimadores vivem
    // numa grade de pixels, e ±0,5 px em CADA eixo é a resolução deles. Cobrar
    // a hipotenusa ≤0,5 seria cobrar 0,35 px por eixo — mais fino que a grade,
    // e o que reprovaria não seria a camada, seria a régua.
    const okCentroide = Math.abs(dxC) <= tolC && Math.abs(dyC) <= tolC;
    const okCaixa = Math.abs(dxB) <= tolB && Math.abs(dyB) <= tolB;
    const caixaNoTeto = inc.caixa > tetoIncerteza;
    // A CAIXA NÃO É JULGADA quando outro corpo tem luz dentro da mesma
    // componente: a caixa envolvente é propriedade da componente INTEIRA, e o
    // vizinho a estica. O centroide não sofre disso — ele é ponderado pelo
    // delta, e dentro da mancha do Sol o vizinho pesa ordens de grandeza
    // menos. Medido na `ua150`: a Terra cai a 9,3 px do Sol, dentro do sprite,
    // e estica a caixa do Sol em 2 px de um lado só (Δcaixa 1,000) enquanto o
    // centroide fica a 0,003 px. Julgar a caixa ali mediria a Terra.
    const contaminada = outros.length > 0;
    const caixaJulgada = !contaminada && !caixaNoTeto;
    let motivo;
    if (contaminada) motivo = `caixa não julgada: ${outros.join(', ')} dentro da mesma mancha`;
    else if (caixaNoTeto) motivo = `caixa não julgada: incerteza ${inc.caixa.toFixed(2)} px > teto ${tetoIncerteza}`;
    return {
      ...base,
      comp,
      ...fotometria,
      dxC, dyC, dxB, dyB,
      dCentroide: Math.hypot(dxC, dyC),
      dCaixa: Math.hypot(dxB, dyB),
      caixaJulgada,
      status: okCentroide && (!caixaJulgada || okCaixa) ? 'MEDIDO' : 'FORA-DA-TOLERÂNCIA',
      motivo,
    };
  });

  // LUZ SEM DONO: componente que nenhum corpo reclamou. Perto de um corpo
  // já casado é o halo/espinho do mesmo sprite partido pelo arredondamento;
  // longe de todos é luz que a camada acendeu onde a régua 1 não previu
  // nada — e isso é defeito, não detalhe.
  // a órfã que não passa de 1/255 é o pisca do D3D11, não luz da camada:
  // sai da conta e seus px vão para o teto (`julgarDescarteDoRuido`)
  const semDono = componentes.filter((c) => !reclamadas.has(c.id));
  const pxOrfasNoRuido = semDono.filter((c) => c.deltaMax <= 1).reduce((t, c) => t + c.n, 0);
  const orfas = semDono
    .filter((c) => c.deltaMax > 1)
    .map((c) => {
      let dMin = Infinity;
      let dono = null;
      for (const p of previstos) {
        const d = Math.hypot(c.cx - p.px, c.cy - p.py);
        if (d < dMin) { dMin = d; dono = p.id; }
      }
      return { ...c, dMin, dono, halo: dMin <= raioHalo };
    });

  const REPROVA = new Set(['FORA-DA-TOLERÂNCIA', 'SEM-COMPONENTE']);
  const longe = orfas.filter((o) => !o.halo);
  const conta = {};
  for (const l of linhas) conta[l.status] = (conta[l.status] || 0) + 1;
  return {
    linhas,
    orfas,
    pxOrfasNoRuido,
    conta,
    erro: linhas.some((l) => REPROVA.has(l.status)) || longe.length > 0,
  };
}

/**
 * O AUTO-TESTE. Fabrica um par de imagens com manchas gaussianas em
 * posições conhecidas e exige do instrumento as duas respostas:
 *   1. com o alvo CERTO, `MEDIDO` — e a ≤0,5 px nos dois estimadores;
 *   2. com o alvo deslocado 3 px, REPROVAR.
 * A segunda é a que importa. Uma régua que só sabe achar concorda com
 * qualquer alvo, e o "casamento" vira tautologia.
 */
/**
 * O PAR NULO (M5b): `noplan×noplan`, a mesma URL em duas capturas, contra o
 * teto de ruído da casa. Acima dele a vista não é determinística e a régua 3
 * não mede nada — reprova dizendo isso, com os números. `acesos` são os px
 * que diferem em algum canal; `maior`, o maior delta de canal, em /255.
 */
export function julgarParNulo({ acesos, maior, total }) {
  const r = julgarTetoDoRuido({ diferentes: acesos, maior, total });
  return { ok: r.ok, texto: r.ok ? `dentro do teto: ${r.texto}` : `${NAO_DETERMINISTICA}: ${r.texto}` };
}

/**
 * O DESCARTE DO RUÍDO (22/11/2026, decisão da conversa principal): a luz
 * perdida e as órfãs de EXATAMENTE 1/255 não entram na conta delas, mas os
 * px descartados cabem no teto (`TETO_DO_RUIDO.fracao`); acima, a régua
 * reprova por "ruído acima do teto", com o número.
 */
export function julgarDescarteDoRuido({ descartados, total }) {
  const teto = Math.floor(total * TETO_DO_RUIDO.fracao);
  const ok = descartados <= teto;
  return {
    ok,
    texto: `${descartados} px de 1/255 descartados da luz perdida e das órfãs`
      + ` (teto ${teto} px, ${(TETO_DO_RUIDO.fracao * 100).toFixed(2)} %)${ok ? '' : ' — ruído acima do teto'}`,
  };
}

export function autoTesteSintetico() {
  const W = 80;
  const H = 60;
  const fundo = new Uint8ClampedArray(W * H * 4);
  for (let p = 0; p < W * H; p++) {
    fundo[p * 4] = 8; fundo[p * 4 + 1] = 9; fundo[p * 4 + 2] = 11; fundo[p * 4 + 3] = 255;
  }
  const com = Uint8ClampedArray.from(fundo);
  const manchas = [
    { id: 'sun', px: 20.3, py: 30.7, pico: 60, sigma: 1.6 },
    { id: 'jupiter', px: 55.5, py: 12.5, pico: 24, sigma: 1.2 },
  ];
  for (const s of manchas) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x + 0.5 - s.px;
        const dy = y + 0.5 - s.py;
        const v = s.pico * Math.exp(-(dx * dx + dy * dy) / (2 * s.sigma * s.sigma));
        if (v < 0.5) continue;
        const i = (y * W + x) * 4;
        com[i] += Math.round(v);
        com[i + 1] += Math.round(v);
        com[i + 2] += Math.round(v);
      }
    }
  }
  const previstos = manchas.map((s) => ({ id: s.id, px: s.px, py: s.py, m: 0, pico: 1 }));
  const certo = componentesDoDiff({ a: fundo, b: com, W, H, limiar: 1, alvos: previstos });
  const bom = casarCorpos({
    previstos, componentes: certo.componentes, ondeCaiu: certo.ondeCaiu,
  });

  const torto = previstos.map((p) => ({ ...p, px: p.px + 3 }));
  const t = componentesDoDiff({ a: fundo, b: com, W, H, limiar: 1, alvos: torto });
  const ruim = casarCorpos({ previstos: torto, componentes: t.componentes, ondeCaiu: t.ondeCaiu });

  // e o par NULO em sintético: sem mancha, zero componentes
  const nulo = componentesDoDiff({ a: fundo, b: fundo, W, H, limiar: 1, alvos: previstos });

  const aprovouCerto = bom.linhas.every((l) => l.status === 'MEDIDO') && !bom.erro;
  const reprovouTorto = ruim.erro && ruim.linhas.every((l) => l.status !== 'MEDIDO');
  const parNulo = nulo.componentes.length === 0;
  return {
    passou: aprovouCerto && reprovouTorto && parNulo,
    aprovouCerto,
    reprovouTorto,
    parNulo,
    soAdicao: certo.desceram === 0,
    bom,
    ruim,
  };
}

/**
 * A INCERTEZA DO SINTÉTICO para uma componente de pico `deltaMax` (degraus da
 * foto) e tamanho `sigma` (o segundo momento de `componentesDoDiff`).
 *
 * NA MESMA LENTE DO JUIZ (`&tone=linear`): a cena é linear, a luz do corpo
 * SOMA no linear, e o caminho até a foto é a codificação sRGB e depois o
 * arredondamento de 8 bits. Por pixel e canal, um fundo de foto contínuo `B`
 * (`FUNDO_DO_SINTETICO`) dá `sem = round(B)` e
 * `com = round(255·sRGB(sRGB⁻¹(B/255) + v))`, com `v` uma gaussiana LINEAR
 * numa posição subpixel sorteada. O diff carrega o ±1/255 do arredondamento
 * ONDE há luz e zero onde não há (o par nulo real difere em ≤0,03 % dos px),
 * e a curva sRGB achata o topo da mancha forte como na foto. A exposição não
 * entra: a amplitude é dita em degraus da foto sobre o fundo do meio.
 *
 * O pico verdadeiro que mostra um dado `deltaMax` não é ele (fora do centro
 * do pixel o pico medido cai; o fundo muda a inclinação do sRGB; o ±1/255
 * sobe ou desce um degrau), então a conta varre `niveis` picos de
 * `0,7·(deltaMax − 1)` a `1,4·(deltaMax + 1)·e^(0,5/σ²)`, `repeticoes`
 * posições por pico, e GUARDA só as repetições em que o alvo caiu numa
 * componente com o MESMO `deltaMax` — a situação do corpo real (se nenhuma o
 * mostrou, as do pico mais próximo, e `desvio` diz a distância). Em cada pico,
 * o σ linear é o que dá, depois do sRGB, o segundo momento `sigma` na foto
 * (o mesmo estimador de `componentesDoDiff`). O erro de cada repetição é o
 * pior eixo, separado para o centroide e para a caixa de meia-altura, e a
 * incerteza é o `PERCENTIL_DO_SINTETICO` dos guardados.
 *
 * Determinística: `semente` fixa a cada chamada (nunca um fluxo entre corpos)
 * e o σ entra arredondado a 0,1 px — a mesma componente dá sempre o mesmo número.
 */
export function incertezaDoSintetico({
  deltaMax, sigma, repeticoes = 256, semente = 1, niveis = 16, percentil = PERCENTIL_DO_SINTETICO,
}) {
  // mulberry32
  let s = semente >>> 0;
  const acaso = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // a codificação sRGB da saída (IEC 61966-2-1), de linear [0,1] para [0,1]
  const cod = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
  const dec = (y) => (y <= 0.04045 ? y / 12.92 : ((y + 0.055) / 1.055) ** 2.4);
  const B0 = FUNDO_DO_SINTETICO / 2;
  const L0 = dec(B0 / 255);
  // amplitude LINEAR que põe `P` degraus de foto sobre o fundo do meio
  const amplitude = (P) => dec(Math.min(255, B0 + P) / 255) - L0;
  const sg = Math.max(0.3, Math.round(sigma * 10) / 10);
  const W = 2 * Math.ceil(6 * sg + 3);
  const H = W;
  // o σ LINEAR cuja mancha, depois do sRGB, tem o segundo momento `sg` na foto
  // (o sRGB achata o topo de uma mancha forte e a alarga): bissecção sobre o
  // perfil contínuo, sem arredondamento, sobre o fundo do meio
  const sigmaNaFoto = (sl, A) => {
    let w0 = 0;
    let w2 = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const r2 = (x + 0.5 - W / 2) ** 2 + (y + 0.5 - H / 2) ** 2;
        const w = cod(Math.min(1, L0 + A * Math.exp(-r2 / (2 * sl * sl)))) - cod(L0);
        w0 += w;
        w2 += w * r2;
      }
    }
    return Math.sqrt(w2 / w0 / 2);
  };
  const sigmaLinear = (A) => {
    let lo = 0.1;
    let hi = sg;
    for (let it = 0; it < 30; it++) {
      const m = (lo + hi) / 2;
      if (sigmaNaFoto(m, A) < sg) lo = m; else hi = m;
    }
    return (lo + hi) / 2;
  };
  const pLo = Math.max(0.25, 0.7 * (deltaMax - 1));
  const pHi = 1.4 * (deltaMax + 1) * Math.exp(0.5 / (sg * sg));
  // todas as repetições casadas, com o pico que mostraram; as guardadas são
  // as do `deltaMax` pedido ou, se nenhuma o mostrou (um px só perto de 255),
  // as do pico mais próximo — `desvio` diz quantos degraus longe
  const casadas = [];
  for (let nv = 0; nv < niveis; nv++) {
    const A = amplitude(pLo + ((pHi - pLo) * nv) / (niveis - 1));
    const sl = sigmaLinear(A);
    for (let r = 0; r < repeticoes; r++) {
      const px = W / 2 + acaso();
      const py = H / 2 + acaso();
      const a = new Uint8ClampedArray(W * H * 4);
      const b = new Uint8ClampedArray(W * H * 4);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const dx = x + 0.5 - px;
          const dy = y + 0.5 - py;
          const v = A * Math.exp(-(dx * dx + dy * dy) / (2 * sl * sl));
          const i = (y * W + x) * 4;
          for (let k = 0; k < 3; k++) {
            // o fundo da foto, contínuo, por pixel e canal: a parte
            // fracionária dele é o que o arredondamento de 8 bits come
            const B = FUNDO_DO_SINTETICO * acaso();
            a[i + k] = Math.round(B);
            b[i + k] = Math.round(255 * cod(Math.min(1, dec(B / 255) + v)));
          }
          a[i + 3] = 255;
          b[i + 3] = 255;
        }
      }
      const d = componentesDoDiff({ a, b, W, H, limiar: 1, alvos: [{ id: 'alvo', px, py }] });
      const k = d.ondeCaiu[0].dentroDe;
      if (k < 0) continue;
      const c = d.componentes[k];
      casadas.push({
        dm: c.deltaMax,
        sigma: c.sigma,
        eC: Math.max(Math.abs(c.cx - px), Math.abs(c.cy - py)),
        eB: Math.max(Math.abs(c.cxCaixa - px), Math.abs(c.cyCaixa - py)),
      });
    }
  }
  // nenhuma repetição casou: o sintético não sabe a incerteza, e o que não se
  // sabe não se mede (passa do teto)
  if (!casadas.length) return { centroide: Infinity, caixa: Infinity, guardadas: 0, desvio: null, sigma: sg };
  const desvio = Math.min(...casadas.map((e) => Math.abs(e.dm - deltaMax)));
  const guardadas = casadas.filter((e) => Math.abs(e.dm - deltaMax) === desvio);
  const p = (v) => v.sort((x, y) => x - y)[Math.ceil(percentil * v.length) - 1];
  return {
    centroide: p(guardadas.map((e) => e.eC)),
    caixa: p(guardadas.map((e) => e.eB)),
    guardadas: guardadas.length,
    desvio,
    sigma: sg,
    sigmaNaFoto: guardadas.reduce((t, e) => t + e.sigma, 0) / guardadas.length,
  };
}

// ------------------------------------------------------------
// O LADO DO CHROME: decodificar PNG é dele (o Node puro exigiria uma
// dependência só para isto — o mesmo motivo do `diff-pixel.mjs`). O que
// vai injetado são as funções puras acima, por `toString()`; só o pedaço
// que toca DOM mora na string.
// ------------------------------------------------------------
async function analisar({ semCamada, comCamada, semCamada2, alvos }) {
  const dir = mkdtempSync(resolve(tmpdir(), 'planetapx-'));
  const pagina = resolve(dir, 'analise.html');
  writeFileSync(pagina, `<!doctype html><meta charset="utf-8"><pre id="o">…</pre><script>
${caixaDeMeiaAltura.toString()}
${componentesDoDiff.toString()}
${manchaSaturada.toString()}
(async () => {
  const carrega = (src) => new Promise((r, j) => {
    const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = src;
  });
  const [a, b, a2] = await Promise.all([
    carrega(${JSON.stringify('file://' + semCamada)}),
    carrega(${JSON.stringify('file://' + comCamada)}),
    carrega(${JSON.stringify('file://' + semCamada2)}),
  ]);
  const W = a.width, H = a.height;
  if (b.width !== W || b.height !== H || a2.width !== W || a2.height !== H) {
    document.getElementById('o').textContent = JSON.stringify({ erro: 'tamanhos diferentes' });
    return;
  }
  const px = (img) => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    return x.getImageData(0, 0, W, H).data;
  };
  const pa = px(a), pb = px(b), pa2 = px(a2);
  const alvos = ${JSON.stringify(alvos)};
  const par = componentesDoDiff({ a: pa, b: pb, W, H, limiar: ${LIMIAR_DELTA}, alvos });
  // o par nulo conta TODO px que difere (limiar 1), qualquer que seja o LIMIAR da régua: é o teto de ruído
  const nulo = componentesDoDiff({ a: pa, b: pa2, W, H, limiar: 1, alvos: [] });
  // o disco saturado do Sol, MEDIDO na imagem com a camada: é a área em
  // que somar luz não muda byte nenhum, e é a definição operacional do
  // SOB-GLARE da tabela
  const sol = alvos.find((t) => t.id === 'sun');
  document.getElementById('o').textContent = JSON.stringify({
    W, H,
    par,
    nulo: {
      acesos: nulo.acesos, componentes: nulo.componentes.length,
      maior: nulo.componentes.reduce((m, c) => Math.max(m, c.deltaMax), 0),
    },
    discoDoSol: sol ? manchaSaturada({ img: pb, W, H, x: sol.px, y: sol.py }) : null,
  });
})();
</script>`);

  const perfil = resolve(dir, 'perfil');
  const { processo: chrome, encerrar } = lancarChrome({
    perfil,
    args: [
      ...GPU_FLAGS, '--allow-file-access-from-files', '--no-first-run',
      '--window-size=600,400',
      '--virtual-time-budget=60000', '--dump-dom', `file://${pagina}`,
    ],
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  let dom = '';
  chrome.stdout.on('data', (c) => { dom += c; });
  try {
    const prazo = Date.now() + 300000;
    for (;;) {
      await new Promise((r) => setTimeout(r, 500));
      if (/<pre[^>]*>\{[\s\S]*?\}<\/pre>/.test(dom) || Date.now() > prazo) break;
    }
  } finally {
    await encerrar();
  }
  const bloco = dom.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (!bloco || !bloco[1].trim().startsWith('{')) throw new Error('a análise não devolveu resultado');
  const r = JSON.parse(bloco[1].replace(/&quot;/g, '"'));
  rmSync(dir, { recursive: true, force: true });
  if (r.erro) throw new Error(r.erro);
  return r;
}

// ------------------------------------------------------------
// A LEVA
// ------------------------------------------------------------
/** o rótulo diz o que foi VISTO, não uma causa: a captura não está vazia */
export const TAMANHOS_DIFERENTES = 'NÃO MEDE (tamanhos diferentes)';

/**
 * AS TRÊS CAPTURAS DE UMA VISTA TÊM DE TER O MESMO TAMANHO, e o Chrome sem tela
 * não o garante (22/11, rodada 4: noplan e plan 1778×1702, noplan2 1784×1705
 * num lançamento em ~26 contados; não reproduzido em 20 seguidos; causa
 * desconhecida). Diferindo, a vista é repetida UMA vez; diferindo de novo, ela
 * sai NÃO MEDE nomeada (saída 2), nunca trava o juiz. O tamanho segue sendo o da
 * janela com a moldura: fixar a área (override) mudaria a geometria de todos.
 */
export function julgarTamanhos([noplan, noplan2, plan], tentativa = 1) {
  if (noplan === noplan2 && noplan === plan) return { acao: 'medir' };
  const texto = `tamanhos diferentes nas três capturas (noplan ${noplan}, noplan2 ${noplan2}, plan ${plan})`;
  return tentativa === 1
    ? { acao: 'repetir', texto: `${texto} — repetindo a vista uma vez` }
    : { acao: 'naoMede', texto: `${TAMANHOS_DIFERENTES}: ${texto}, de novo na repetição` };
}

async function medirVista(nome, query, porta, tentativa = 1) {
  const capturas = resolve(ROOT, 'capturas');
  mkdirSync(capturas, { recursive: true });
  const arquivo = (lado) => resolve(capturas, `regua3-${nome}-${lado}.png`);
  const base = `${APP}/${query}${PIN}${FLAG_MEDICAO}${READOUT}`;
  const vias = [];

  // os DOIS lados com `&dbgplan=1`: o readout é simétrico e some no diff.
  const sem = await capturarCDP({ url: base + PORTA_DESLIGA, ...JANELA, porta: porta++ });
  writeFileSync(arquivo('noplan'), sem.png);
  vias.push(sem.via);
  const sem2 = await capturarCDP({ url: base + PORTA_DESLIGA, ...JANELA, porta: porta++ });
  const nulo2 = arquivo('noplan2');
  writeFileSync(nulo2, sem2.png);
  vias.push(sem2.via);
  const com = await capturarCDP({
    url: base + PORTA_LIGA, ...JANELA, porta: porta++, coletar: /\[dbgplan\]/,
  });
  writeFileSync(arquivo('plan'), com.png);
  vias.push(com.via);
  const tamanho = (png) => `${png.readUInt32BE(16)}×${png.readUInt32BE(20)}`;
  const tamanhos = julgarTamanhos([sem.png, sem2.png, com.png].map(tamanho), tentativa);
  if (tamanhos.acao !== 'medir') return { nome, vias, tamanhos };

  if (!com.linhas.length) throw new Error(`${nome}: o ?dbgplan não falou — a régua 2 não tem o que ler`);
  // O MESMO QUADRO: a câmera é fixa (`?pos=`) e as posições são estáticas
  // (época congelada, D4), então TODO quadro imprime o mesmo bloco. Isso é
  // verificado, não suposto — se um quadro divergir, a premissa caiu e a
  // comparação de 0,5 px estaria misturando duas cenas.
  const distintos = new Set(com.linhas);
  if (distintos.size !== 1) {
    throw new Error(`${nome}: o ?dbgplan mudou entre quadros (${distintos.size} blocos distintos)`);
  }
  const dbg = lerDbgPlan(com.linhas[com.linhas.length - 1]);
  if (!dbg.visivel) throw new Error(`${nome}: a camada saiu INVISÍVEL com ${PORTA_LIGA}`);

  const r = await analisar({
    semCamada: arquivo('noplan'),
    comCamada: arquivo('plan'),
    semCamada2: nulo2,
    alvos: dbg.corpos.map((c) => ({ id: c.id, px: c.px, py: c.py })),
  });
  if (r.W !== dbg.largura || r.H !== dbg.altura) {
    throw new Error(`${nome}: PNG ${r.W}×${r.H} contra tela ${dbg.largura}×${dbg.altura} do ?dbgplan`);
  }
  // o par nulo já cumpriu o que tinha a cumprir; quando ele passa, o PNG é o
  // do outro lado a menos do teto de ruído, e guardá-lo seria guardar duas
  // vezes a mesma imagem (regra 5 do AGENTS)
  rmSync(nulo2, { force: true });

  const juizo = casarCorpos({
    previstos: dbg.corpos,
    componentes: r.par.componentes,
    ondeCaiu: r.par.ondeCaiu,
  });
  return { nome, dbg, r, juizo, vias };
}

function imprimir({ nome, dbg, r, juizo }) {
  const s = r.par;
  console.log(`\n=== ${nome} · câmera a ${dbg.cameraUA.toFixed(3)} UA · tela ${r.W}×${r.H}`
    + ' · nobloom (flag de medição) ===');
  console.log(`  diff plan−noplan: ${s.acesos.toLocaleString('pt-BR')} px acesos`
    + ` (${((100 * s.acesos) / (r.W * r.H)).toFixed(4)}%) · ${s.subiram.toLocaleString('pt-BR')} SUBIRAM`
    + ` · ${s.desceram} desceram · soma +${s.somaGanho.toLocaleString('pt-BR')}`
    + ` / −${s.somaPerda.toLocaleString('pt-BR')} · ${s.componentes.length} componentes`);
  const nulo = julgarParNulo({ ...r.nulo, total: r.W * r.H });
  console.log(`  par nulo (noplan×noplan): ${r.nulo.componentes} componentes, ${nulo.texto}`
    + `  ${nulo.ok ? '[M5 OK]' : '[M5 FALHOU]'}`);
  const d = r.discoDoSol;
  const pxSol = (s.ondeCaiu.find((o) => o.id === 'sun') || {}).plan;
  console.log(d
    ? `  disco saturado do Sol (3 canais em 255): ${d.n.toLocaleString('pt-BR')} px,`
      + ` caixa ${d.larg}×${d.alt} em (${d.x0},${d.y0})`
    : `  disco saturado do Sol (3 canais em 255): NENHUM — o pixel central do Sol`
      + ` é (${(pxSol || []).join(', ')})`);
  console.log('  corpo     previsto px            centroide medido      Δcentro x/y   tol.C      Δcaixa x/y   tol.B'
    + '   n px  Δmax  σ px   m       pico      status');
  const tol = (t) => (t === undefined ? '—' : t.toFixed(3)).padStart(6);
  for (const l of juizo.linhas) {
    const prev = `(${l.px.toFixed(3)}, ${l.py.toFixed(3)})`;
    const med = l.comp && l.dxC !== undefined
      ? `(${l.comp.cx.toFixed(3)}, ${l.comp.cy.toFixed(3)})` : '—';
    const par = (a, b) => (a === undefined ? '—' : `${a >= 0 ? '+' : ''}${a.toFixed(3)}/${b >= 0 ? '+' : ''}${b.toFixed(3)}`);
    console.log(
      `  ${l.id.padEnd(9)} ${prev.padEnd(21)} ${med.padEnd(21)} `
      + `${par(l.dxC, l.dyC).padStart(15)} ${tol(l.tolC)}  `
      + `${(l.caixaJulgada === false ? '(não julgada)' : par(l.dxB, l.dyB)).padStart(15)} ${tol(l.tolB)}  `
      + `${(l.comp ? String(l.comp.n) : '—').padStart(5)}  `
      + `${(l.comp ? String(l.comp.deltaMax) : '—').padStart(4)}  `
      + `${(l.comp ? l.comp.sigma.toFixed(2) : '—').padStart(4)}  `
      + `${l.m.toFixed(2).padStart(6)}  ${l.pico.toExponential(2).padStart(9)}  ${l.status}`
      + (l.motivo ? `  (${l.motivo})` : '')
      + (l.origemC ? `  [tol.C: ${l.origemC}; tol.B: ${l.origemB}]` : '')
    );
  }
  const lua = juizo.linhas.find((l) => l.id === 'moon');
  console.log(lua && lua.status === 'MEDIDO' ? '  Lua: medida' : `  Lua: não medida (${lua ? lua.status : 'ausente'})`);
  if (juizo.orfas.length) {
    const longe = juizo.orfas.filter((o) => !o.halo);
    console.log(`  componentes sem dono: ${juizo.orfas.length}`
      + ` (${juizo.orfas.length - longe.length} dentro de ${RAIO_HALO_PX} px de um corpo = halo do sprite`
      + `, ${longe.length} longe)`);
    for (const o of juizo.orfas.slice(0, 8)) {
      console.log(`    ${o.n} px em (${o.cx.toFixed(1)}, ${o.cy.toFixed(1)}) · `
        + `${o.dMin.toFixed(1)} px de ${o.dono} · ${o.halo ? 'halo' : 'ÓRFÃ'}`);
    }
  }
}

async function principal() {
  const so = process.argv[2];
  const auto = autoTesteSintetico();
  console.log('auto-teste sintético: '
    + `alvo certo ${auto.aprovouCerto ? 'MEDIDO' : 'FALHOU'} · `
    + `alvo deslocado 3 px ${auto.reprovouTorto ? 'REPROVADO (certo)' : 'ACEITO (defeito)'} · `
    + `par nulo ${auto.parNulo ? 'zero componentes' : 'FALHOU'} · `
    + `só adição ${auto.soAdicao ? 'sim' : 'não'}`);
  if (!auto.passou) {
    console.error('\n>>> O INSTRUMENTO REPROVOU no sintético: não meça nada com ele.');
    process.exit(1);
  }

  const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
  if (!ping.includes('<div id="root"')) throw new Error(`dev server não respondeu em ${APP}`);

  const lista = [...VISTAS, PERTO_DA_TERRA]
    .filter(([n]) => (so ? n === so : [...PROFUNDAS, PERTO_DA_TERRA[0]].includes(n)));
  if (!lista.length) throw new Error(`vista desconhecida: ${so}`);

  const vias = [];
  let luaMedida = false;
  let erro = false;
  const naoMedidas = [];
  let porta = 9800 + (process.pid % 100) * 4;
  for (const [nome, query] of lista) {
    let medida = await medirVista(nome, query, porta);
    porta += 4;
    if (medida.tamanhos?.acao === 'repetir') {
      console.log(`\n  ${nome}: ${medida.tamanhos.texto}`);
      vias.push(...medida.vias);
      medida = await medirVista(nome, query, porta, 2);
      porta += 4;
    }
    if (medida.tamanhos) {
      console.log(`\n  ${nome}: ${medida.tamanhos.texto}`);
      vias.push(...medida.vias);
      naoMedidas.push(nome);
      continue;
    }
    imprimir(medida);
    if (medida.juizo.linhas.some((l) => l.id === 'moon' && l.status === 'MEDIDO')) luaMedida = true;
    vias.push(...medida.vias);
    if (!julgarParNulo({ ...medida.r.nulo, total: medida.r.W * medida.r.H }).ok) erro = true;
    const descarte = julgarDescarteDoRuido({
      descartados: medida.r.par.desceramNoRuido + medida.juizo.pxOrfasNoRuido,
      total: medida.r.W * medida.r.H,
    });
    console.log(`  ${nome}: ${descarte.texto}`);
    if (!descarte.ok) erro = true;
    if (medida.r.par.desceram !== 0) {
      console.error(`  !! ${nome}: ${medida.r.par.desceram} px PERDERAM luz — a camada é aditiva`);
      erro = true;
    }
    if (medida.juizo.erro) erro = true;
  }

  if (!luaMedida) console.log('\na Lua não é medida em nenhuma vista');
  if (!luaMedida && lista.includes(PERTO_DA_TERRA) && !naoMedidas.includes(PERTO_DA_TERRA[0])) {
    console.error(`  !! ${PERTO_DA_TERRA[0]}: a vista existe para medir a Lua, e ela não foi medida`);
    erro = true;
  }

  const prontidao = julgarProntidao({
    vias, appUrl: process.env.APP_URL, fallbackOk: process.env.FALLBACK_OK === '1',
  });
  if (prontidao.mensagem) process.stderr.write(prontidao.mensagem);
  if (erro || prontidao.erro) {
    console.log('\n>>> RÉGUA 3 REPROVOU');
    process.exit(1);
  }
  if (naoMedidas.length) {
    console.log(`\n>>> ${TAMANHOS_DIFERENTES}: ${naoMedidas.join(', ')} — as outras vistas passaram`);
    process.exit(SAIDA_NAO_MEDE);
  }
  console.log('\n>>> RÉGUA 3 OK');
}

// SÓ a invocação por linha de comando mede. `planeta-pixel.test.mjs` importa
// as funções puras — e um import não pode subir nove capturas.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await principal();
}
