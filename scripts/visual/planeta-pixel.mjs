// ============================================================
// RÉGUA 3 da D10 (Onda 4) — O PIXEL.
//
//   node scripts/visual/planeta-pixel.mjs             # as 3 vistas profundas
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
//       mesma URL, tem de dar ZERO componentes. É o piso de ruído medido, e
//       não suposto.
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
// seria a camada, seria a régua. (Medido: a Terra na `ua40` sai com a caixa a
// 0,277/0,420 px, dentro dos 0,5 em cada eixo e 0,503 na hipotenusa.)
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
// MEDIDO      a mancha existe e os centros batem com o previsto a ≤0,5 px por
//             eixo (a caixa, quando julgável — ver acima).
// SOB-GLARE   o pixel previsto já está SATURADO no lado `plan` (ou a mancha
//             do corpo não se separa da do Sol). A camada só SOMA luz: onde o
//             Sol já clipou, somar não muda byte nenhum. Declarado, não
//             julgado — e não é defeito: é o que 150 UA do Sol fazem.
// SOB-LIMIAR  não há mancha no pixel previsto, e o pico de PSF (que o
//             `?dbgplan` publica, calculado pelo app com os uniformes
//             verdadeiros) está abaixo de 1/255. O corpo está lá, com a
//             magnitude certa, e a tela de 8 bits não tem degrau para ele. É
//             a fotometria honesta — Urano/Netuno/Plutão a 150 UA são
//             exatamente este caso. Quando ainda assim sobram pixels acesos
//             ao lado, a linha DIZ quantos: é o corpo em cima do degrau, cuja
//             PSF só arredonda para cima em faíscas soltas (Marte na `ua150`).
// FUNDIDO     duas manchas previstas caíram na MESMA componente e não há como
//             atribuir centroide. Declarado, não julgado.
// FORA-DA-TOLERÂNCIA / SEM-COMPONENTE / ÓRFÃ  são os três modos de REPROVAR:
//             mancha no lugar errado, corpo que deveria acender e não acendeu,
//             e luz que apareceu onde corpo nenhum foi previsto.
// ============================================================
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { CHROME, GPU_FLAGS, matarPerfil, capturarCDP, julgarProntidao, APP_PADRAO } from './chrome.mjs';
import { VISTAS, PIN } from './ab-identidade.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = process.env.APP_URL || APP_PADRAO;

/** As três vistas do domínio profundo (D9) — a lista vem do harness. */
export const PROFUNDAS = ['ua500', 'ua150', 'ua40'];

/** O par de portas da D7. O A/B é feito com o MESMO binário dos dois lados. */
const PORTA_LIGA = '&plan=1';
const PORTA_DESLIGA = '&noplan=1';
/** A lente da régua — ver o cabeçalho. Não é o look do app. */
const FLAG_MEDICAO = '&nobloom=1';
/** O readout da D7, ligado nos DOIS lados para o diff não medir o readout. */
const READOUT = '&dbgplan=1';

/** A janela do harness: 1800×1800 pedidos = 1800×1713 efetivos. */
const JANELA = { largura: 1800, altura: 1800 };

/** Delta de 8 bits que já conta como luz. 1 = qualquer degrau. */
export const LIMIAR_DELTA = Math.max(1, Number(process.env.LIMIAR || 1));

/** O que a D10 cobra dos dois estimadores de centro. */
export const TOLERANCIA_PX = 0.5;

/** Abaixo disto a tela de 8 bits não tem degrau — ver `SOB-LIMIAR`. */
export const LIMIAR_PICO = 1 / 255;

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
    let deltaMax = 0;
    let x0 = W;
    let y0 = H;
    let x1 = -1;
    let y1 = -1;
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
      if (dMax[p] > deltaMax) deltaMax = dMax[p];
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
    componentes.push({
      id, n, peso, deltaMax,
      cx: sx / peso, cy: sy / peso,
      x0, y0, x1, y1,
      cxCaixa: (x0 + x1 + 1) / 2, cyCaixa: (y0 + y1 + 1) / 2,
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

  return { W, H, acesos, subiram, desceram, somaGanho, somaPerda, componentes, ondeCaiu };
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
 * O BLOCO do `?dbgplan` virado em números. Onze linhas: o cabeçalho (época,
 * distância da câmera, tela, `uGain`, os dois uniformes da PSF) e os dez
 * corpos, cada um com o px previsto e o pico de PSF que o APP calculou —
 * é de propósito que a régua não recalcula o pico: quem tem os uniformes
 * verdadeiros é a camada.
 */
export function lerDbgPlan(bloco) {
  const linhas = String(bloco).split('\n').map((s) => s.trim()).filter((s) => s.startsWith('[dbgplan]'));
  if (linhas.length !== 11) {
    throw new Error(`bloco do ?dbgplan com ${linhas.length} linhas (esperadas 11)`);
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
    uGain: num(cab, 'uGain'),
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
  tolerancia = TOLERANCIA_PX, limiarPico = LIMIAR_PICO, raioHalo = RAIO_HALO_PX,
}) {
  const porId = new Map(componentes.map((c) => [c.id, c]));
  const caiuPorId = new Map(ondeCaiu.map((o) => [o.id, o]));
  // quantos corpos previstos caíram em cada componente: 2+ é `FUNDIDO`
  const ocupantes = new Map();
  for (const o of ondeCaiu) {
    if (o.dentroDe < 0) continue;
    if (!ocupantes.has(o.dentroDe)) ocupantes.set(o.dentroDe, []);
    ocupantes.get(o.dentroDe).push(o.id);
  }

  const reclamadas = new Set();
  const linhas = previstos.map((c) => {
    const o = caiuPorId.get(c.id);
    const base = {
      id: c.id, px: c.px, py: c.py, m: c.m, pico: c.pico,
      comp: null, dCentroide: null, dCaixa: null,
    };
    if (!o || !o.noQuadro) return { ...base, status: 'FORA-DO-QUADRO' };
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
    const outros = juntos.filter((n) => n !== c.id);
    if (outros.length && c.id !== 'sun') {
      return {
        ...base,
        comp,
        status: juntos.includes('sun') ? 'SOB-GLARE' : 'FUNDIDO',
        motivo: `dentro da mancha de ${outros.join(', ')}`,
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
    const okCentroide = Math.abs(dxC) <= tolerancia && Math.abs(dyC) <= tolerancia;
    const okCaixa = Math.abs(dxB) <= tolerancia && Math.abs(dyB) <= tolerancia;
    // A CAIXA NÃO É JULGADA quando outro corpo tem luz dentro da mesma
    // componente: a caixa envolvente é propriedade da componente INTEIRA, e o
    // vizinho a estica. O centroide não sofre disso — ele é ponderado pelo
    // delta, e dentro da mancha do Sol o vizinho pesa ordens de grandeza
    // menos. Medido na `ua150`: a Terra cai a 9,3 px do Sol, dentro do sprite,
    // e estica a caixa do Sol em 2 px de um lado só (Δcaixa 1,000) enquanto o
    // centroide fica a 0,003 px. Julgar a caixa ali mediria a Terra.
    const contaminada = outros.length > 0;
    return {
      ...base,
      comp,
      dxC, dyC, dxB, dyB,
      dCentroide: Math.hypot(dxC, dyC),
      dCaixa: Math.hypot(dxB, dyB),
      caixaJulgada: !contaminada,
      status: okCentroide && (contaminada || okCaixa) ? 'MEDIDO' : 'FORA-DA-TOLERÂNCIA',
      motivo: contaminada ? `caixa não julgada: ${outros.join(', ')} dentro da mesma mancha` : undefined,
    };
  });

  // LUZ SEM DONO: componente que nenhum corpo reclamou. Perto de um corpo
  // já casado é o halo/espinho do mesmo sprite partido pelo arredondamento;
  // longe de todos é luz que a camada acendeu onde a régua 1 não previu
  // nada — e isso é defeito, não detalhe.
  const orfas = componentes
    .filter((c) => !reclamadas.has(c.id))
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
  const nulo = componentesDoDiff({ a: pa, b: pa2, W, H, limiar: ${LIMIAR_DELTA}, alvos: [] });
  // o disco saturado do Sol, MEDIDO na imagem com a camada: é a área em
  // que somar luz não muda byte nenhum, e é a definição operacional do
  // SOB-GLARE da tabela
  const sol = alvos.find((t) => t.id === 'sun');
  document.getElementById('o').textContent = JSON.stringify({
    W, H,
    par,
    nulo: { acesos: nulo.acesos, componentes: nulo.componentes.length },
    discoDoSol: sol ? manchaSaturada({ img: pb, W, H, x: sol.px, y: sol.py }) : null,
  });
})();
</script>`);

  const perfil = resolve(dir, 'perfil');
  const chrome = spawn(CHROME, [
    ...GPU_FLAGS, '--allow-file-access-from-files', '--no-first-run',
    `--user-data-dir=${perfil}`, '--window-size=600,400',
    '--virtual-time-budget=60000', '--dump-dom', `file://${pagina}`,
  ], { stdio: ['ignore', 'pipe', 'ignore'] });
  let dom = '';
  chrome.stdout.on('data', (c) => { dom += c; });
  try {
    const prazo = Date.now() + 300000;
    for (;;) {
      await new Promise((r) => setTimeout(r, 500));
      if (/<pre[^>]*>\{[\s\S]*?\}<\/pre>/.test(dom) || Date.now() > prazo) break;
    }
  } finally {
    chrome.kill();
    matarPerfil(perfil);
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
async function medirVista(nome, query, porta) {
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
  // o par nulo já cumpriu o que tinha a cumprir; o PNG é byte a byte o do
  // outro lado quando ele passa, e guardá-lo seria guardar duas vezes a
  // mesma imagem (regra 5 do AGENTS)
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
    + ` · uGain=${dbg.uGain} · nobloom (flag de medição) ===`);
  console.log(`  diff plan−noplan: ${s.acesos.toLocaleString('pt-BR')} px acesos`
    + ` (${((100 * s.acesos) / (r.W * r.H)).toFixed(4)}%) · ${s.subiram.toLocaleString('pt-BR')} SUBIRAM`
    + ` · ${s.desceram} desceram · soma +${s.somaGanho.toLocaleString('pt-BR')}`
    + ` / −${s.somaPerda.toLocaleString('pt-BR')} · ${s.componentes.length} componentes`);
  console.log(`  par nulo (noplan×noplan): ${r.nulo.acesos} px, ${r.nulo.componentes} componentes`
    + `  ${r.nulo.componentes === 0 && r.nulo.acesos === 0 ? '[M5 OK]' : '[M5 FALHOU]'}`);
  const d = r.discoDoSol;
  const pxSol = (s.ondeCaiu.find((o) => o.id === 'sun') || {}).plan;
  console.log(d
    ? `  disco saturado do Sol (3 canais em 255): ${d.n.toLocaleString('pt-BR')} px,`
      + ` caixa ${d.larg}×${d.alt} em (${d.x0},${d.y0})`
    : `  disco saturado do Sol (3 canais em 255): NENHUM — o pixel central do Sol`
      + ` é (${(pxSol || []).join(', ')})`);
  console.log('  corpo     previsto px            centroide medido      Δcentro x/y      Δcaixa x/y      n px   m       pico      status');
  for (const l of juizo.linhas) {
    const prev = `(${l.px.toFixed(3)}, ${l.py.toFixed(3)})`;
    const med = l.comp && l.dxC !== undefined
      ? `(${l.comp.cx.toFixed(3)}, ${l.comp.cy.toFixed(3)})` : '—';
    const par = (a, b) => (a === undefined ? '—' : `${a >= 0 ? '+' : ''}${a.toFixed(3)}/${b >= 0 ? '+' : ''}${b.toFixed(3)}`);
    console.log(
      `  ${l.id.padEnd(9)} ${prev.padEnd(21)} ${med.padEnd(21)} `
      + `${par(l.dxC, l.dyC).padStart(15)}  `
      + `${(l.caixaJulgada === false ? '(não julgada)' : par(l.dxB, l.dyB)).padStart(15)}  `
      + `${(l.comp ? String(l.comp.n) : '—').padStart(5)}  `
      + `${l.m.toFixed(2).padStart(6)}  ${l.pico.toExponential(2).padStart(9)}  ${l.status}`
      + (l.motivo ? `  (${l.motivo})` : '')
    );
  }
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

  const lista = VISTAS.filter(([n]) => (so ? n === so : PROFUNDAS.includes(n)));
  if (!lista.length) throw new Error(`vista desconhecida: ${so}`);

  const vias = [];
  let erro = false;
  let porta = 9800 + (process.pid % 100) * 4;
  for (const [nome, query] of lista) {
    const medida = await medirVista(nome, query, porta);
    porta += 4;
    imprimir(medida);
    vias.push(...medida.vias);
    const nulo = medida.r.nulo;
    if (nulo.componentes !== 0 || nulo.acesos !== 0) erro = true;
    if (medida.r.par.desceram !== 0) {
      console.error(`  !! ${nome}: ${medida.r.par.desceram} px PERDERAM luz — a camada é aditiva`);
      erro = true;
    }
    if (medida.juizo.erro) erro = true;
  }

  const prontidao = julgarProntidao({
    vias, appUrl: process.env.APP_URL, fallbackOk: process.env.FALLBACK_OK === '1',
  });
  if (prontidao.mensagem) process.stderr.write(prontidao.mensagem);
  console.log(erro ? '\n>>> RÉGUA 3 REPROVOU' : '\n>>> RÉGUA 3 OK');
  if (erro || prontidao.erro) process.exit(1);
}

// SÓ a invocação por linha de comando mede. `planeta-pixel.test.mjs` importa
// as funções puras — e um import não pode subir nove capturas.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await principal();
}
