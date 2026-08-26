// ============================================================
// O JUIZ DO COLAR — a fita de órbita tem contas de luz nas juntas?
//
//   node scripts/visual/colar-da-fita.mjs              # captura a vista e julga
//   node scripts/visual/colar-da-fita.mjs foto.png     # julga um PNG já em disco
//
//   SAIDA=capturas/x.png   guarda o quadro cru da captura
//   JSON=capturas/x.json   guarda a medida
//   FAIXA=x,y,w,h          sobrescreve o recorte (varredura ad hoc)
//
// ------------------------------------------------------------
// A QUEM ELE SERVE
// ------------------------------------------------------------
// Ao DONO, e a frase é dele, de 2026-08-25: ele quer que **as linhas de
// órbita fiquem lindas e profissionais como as do NASA Eyes**. Nada aqui
// mede semelhança com a foto deles — o alvo é a LINHA LINDA, e o colar
// era o defeito que mais a separava disso. Este arquivo existe para que
// o colar não volte em silêncio.
//
// ------------------------------------------------------------
// O DEFEITO QUE ELE MEDE (item 83 · A1, o L2.5-a)
// ------------------------------------------------------------
// O `LineMaterial` desenha cada segmento como um quad com CALOTA REDONDA
// além das duas pontas, e a calota do segmento *k* cobre o corpo do
// *k+1*. Em blending aditivo o disco da junta é pintado DUAS vezes, e a
// fita ganha um COLAR DE CONTAS: picos de luz igualmente espaçados, um
// por junta.
//
// A assinatura MEDIDA em 24/08, no recorte de 340 colunas da foto de
// zoom do L2: **54 colunas com pico ≥ 215** sobre um corpo de fita de
// ~204, em grupos de vão **rigorosamente constante de 14 px**. O vão
// CONSTANTE é o que separa a conta do serrilhado da própria curva, cujo
// passo é VARIÁVEL — e é por isso que este juiz não se contenta em
// contar pixel claro: ele cobra o PENTE.
//
// ------------------------------------------------------------
// COMO ELE MEDE
// ------------------------------------------------------------
// Sobre um recorte em que a fita corre quase na horizontal, o PERFIL é o
// pico de luminância de cada COLUNA (`perfilDaFita`). Numa fita sã o
// perfil é quase reto, no brilho do corpo da fita; com o colar, é um
// pente.
//
//   · CORPO: a MEDIANA do perfil — o brilho da fita onde ela é só fita.
//   · CONTA: coluna cujo pico passa de `corpo + MARGEM_DA_CONTA`.
//     O limiar é RELATIVO ao corpo, e não os 215 absolutos de 24/08, por
//     uma razão de instrumento: 215 era o número DAQUELA foto, com
//     aquela vista e aquele realce de foco. Um juiz que carregasse o
//     número absoluto mediria a exposição da vista, não a junta.
//   · GRUPO: corrida contígua de contas. Cada junta rende ~2 colunas,
//     não uma.
//   · VÃO: distância entre centros de grupos vizinhos. `vaoMediano` é a
//     mediana deles e `regulares` é a FRAÇÃO dos vãos que cai a menos de
//     `TOLERANCIA_DO_VAO` px dela — a medida de "rigorosamente
//     constante", robusta a um planeta que entre no recorte e parta um
//     vão em dois.
//
// O VEREDITO É A CONJUNÇÃO, e cada termo tem função: grupos DEMAIS
// (`MIN_DE_GRUPOS`), com vão de JUNTA (`PASSO_MIN`..`PASSO_MAX`) e vão
// REGULAR (`MIN_DE_REGULARES`). Tirar qualquer um deixaria passar por
// colar o serrilhado de uma curva, que tem contas mas não tem passo.
//
// E ELE REPROVA QUANDO NÃO CONSEGUE MEDIR — a fita fora do recorte, o
// quadro escuro, o recorte no lugar errado. Juiz que avisa em vez de
// reprovar é juiz que ninguém lê (a lição do MB1 descalibrado, item 81).
//
// ------------------------------------------------------------
// POR QUE A FOTO É NO RETINA E COM O RELÓGIO ANDANDO
// ------------------------------------------------------------
// RETINA (dpr 2) porque é a tela DELE, e porque a 1× o colar é sutil —
// o item 83 diz isso com todas as letras.
//
// RELÓGIO ANDANDO porque a cura do A1 depende de um atributo
// (`instanceDistanceStart/End`) calculado UMA vez no construtor,
// enquanto o buffer de posições é reescrito a cada salto de data: uma
// vista parada não julgaria o caso em que o conserto pode quebrar. Por
// isso a captura ASSENTA com o relógio parado, ANDA no tempo por
// `SEGUNDOS_ANDANDO`, e só então dispara o obturador — e a medida traz o
// `jd` de antes e o de depois, que é a prova de que ele andou.
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { capturarCDP, dorme } from './chrome.mjs';
import { cinzaDoPng, lerPng } from './luz-ab.mjs';

/**
 * A VISTA, e ela é de `?pos=` de propósito: a câmera não persegue nada,
 * então o anel fica parado no recorte enquanto os planetas andam por
 * cima dele. Uma vista de `?foco=` seguiria o corpo e levaria a fita
 * para fora da faixa no meio da corrida.
 *
 * `&jd=` é o que ACENDE a efeméride — sem ele a camada não desenha nada
 * (`orbitas.ts` §6) e não haveria fita a medir. É o mesmo instante das
 * vistas de foco do `ab-identidade`.
 *
 * 40 UA olhando para o Sol põe o laço de Saturno como um anel de ~733 px
 * de raio no quadro de dispositivo: 256 segmentos dão junta a cada ~18
 * px, que é o passo que este juiz mede.
 */
export const VISTA = '/?pos=0,0,0.00019393&look=0,0,0&jd=2460409.26395835&q=cinema&shot=2';
export const APP = process.env.APP_URL || 'http://127.0.0.1:5173';
/** px de CSS; com `dpr` 2 o PNG sai em 2400×1800 de dispositivo */
export const JANELA = { largura: 1200, altura: 900, dpr: 2 };

/**
 * O RECORTE, em px de DISPOSITIVO do PNG — 340 colunas sobre o alto do
 * anel de Saturno, que é onde ele corre mais perto da horizontal. As 340
 * são as mesmas 340 do item 83, para o número deste juiz poder ser lido
 * ao lado do de 24/08 sem conversão.
 *
 * A altura de 45 px foi escolhida com o traço na mão: o anel desce de
 * y=164 a y=191 ao longo das 340 colunas, e a faixa tem folga dos dois
 * lados. Se um dia ela deixar de conter a fita, o juiz REPROVA por não
 * conseguir medir — não devolve um número torto.
 */
export const FAIXA = { x: 1190, y: 155, w: 340, h: 45 };

/**
 * O degrau da escada de tempo e por quanto tempo o relógio anda antes do
 * obturador. Degrau 6 é ~11,6 dias por segundo: em 3 s a efeméride
 * caminha ~um mês, e `escreverInstante` reescreve os 30 laços em TODO
 * quadro do intervalo — que é exatamente o regime que a vista parada não
 * cobre.
 */
export const DEGRAU_DO_RELOGIO = 6;
export const SEGUNDOS_ANDANDO = 3;

/**
 * Quanto um pico tem de passar do corpo da fita para valer como CONTA,
 * em níveis de 255. A conta medida em 24/08 somava ~+26 ao corpo (204 →
 * 230), porque o disco da junta é pintado duas vezes em aditivo. 15 é
 * pouco mais da metade disso: pega a conta com folga e ignora a
 * ondulação de um ou dois níveis que o serrilhado da curva produz.
 */
export const MARGEM_DA_CONTA = 15;

/** Abaixo disto não há fita no recorte, e não há o que medir. */
export const PISO_DO_CORPO = 40;
/**
 * A fita SAIU do recorte em alguma coluna se o pico dessa coluna cai
 * abaixo desta fração do corpo. Medido na vista oficial: o pior pico é
 * 0,95 do corpo, então meia altura é folga larga e ainda pega o recorte
 * deslocado.
 */
export const PISO_RELATIVO = 0.5;

/** A faixa de vãos que uma junta pode ter, em px de dispositivo. */
export const PASSO_MIN = 4;
export const PASSO_MAX = 40;
/** Quantos grupos fazem um COLAR — abaixo disso é acidente, não pente. */
export const MIN_DE_GRUPOS = 8;
/** "Rigorosamente constante": o vão cai a menos disto da mediana, em px. */
export const TOLERANCIA_DO_VAO = 1.5;
/** ...e essa fração dos vãos tem de ser regular para o pente existir. */
export const MIN_DE_REGULARES = 0.7;

const arred = (v, casas) => +v.toFixed(casas);

/**
 * O PICO DE CADA COLUNA do recorte. O máximo sobre as linhas — e não uma
 * média — porque a fita tem 1,25 px de largura CSS sobre uma faixa de
 * dezenas de px: a média mediria o céu, não a fita.
 */
export function perfilDaFita(cinza, largura, faixa) {
  const { x, y, w, h } = faixa;
  const perfil = new Float32Array(w);
  for (let i = 0; i < w; i++) {
    let pico = 0;
    for (let j = 0; j < h; j++) {
      const v = cinza[(y + j) * largura + (x + i)];
      if (v > pico) pico = v;
    }
    perfil[i] = pico;
  }
  return perfil;
}

/** A mediana de uma lista, sem interpolação — o idioma de `percentil`. */
function mediana(v) {
  if (!v.length) return 0;
  const o = [...v].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)];
}

/**
 * O PENTE de um perfil: contas, grupos, vão e regularidade. Pura, sem
 * disco e sem navegador — é ela que `colar-da-fita.test.mjs` cobra sobre
 * perfis sintéticos.
 */
export function pentearOColar(perfil, margem = MARGEM_DA_CONTA) {
  const n = perfil.length;
  const corpo = mediana(Array.from(perfil));
  let piso = Infinity;
  for (const v of perfil) if (v < piso) piso = v;
  const limiar = corpo + margem;

  const centros = [];
  let contas = 0;
  let ini = -1;
  for (let i = 0; i <= n; i++) {
    const dentro = i < n && perfil[i] >= limiar;
    if (dentro) {
      contas++;
      if (ini < 0) ini = i;
    } else if (ini >= 0) {
      centros.push((ini + i - 1) / 2);
      ini = -1;
    }
  }

  const vaos = [];
  for (let i = 1; i < centros.length; i++) vaos.push(centros[i] - centros[i - 1]);
  const vaoMediano = mediana(vaos);
  const regulares = vaos.length
    ? vaos.filter((v) => Math.abs(v - vaoMediano) <= TOLERANCIA_DO_VAO).length / vaos.length
    : 0;

  return {
    colunas: n,
    corpo: arred(corpo, 1),
    piso: arred(piso, 1),
    limiar: arred(limiar, 1),
    contas,
    grupos: centros.length,
    vaoMediano: arred(vaoMediano, 1),
    regulares: arred(regulares, 3),
  };
}

/**
 * O VEREDITO sobre um pente. Devolve `{ colar, motivo, ...medida }`.
 *
 * `colar: true` é REPROVAÇÃO — o defeito está lá. `colar: false` com
 * `motivo` preenchido também reprova, e é o ramo do juiz que não
 * conseguiu medir; quem chama olha `aprovado`.
 */
export function julgarColar(medida) {
  if (!(medida.corpo >= PISO_DO_CORPO)) {
    return { ...medida, colar: false, aprovado: false,
      motivo: `sem fita no recorte: corpo ${medida.corpo} < ${PISO_DO_CORPO}` };
  }
  if (medida.piso < medida.corpo * PISO_RELATIVO) {
    return { ...medida, colar: false, aprovado: false,
      motivo: `a fita sai do recorte: piso ${medida.piso} < ${PISO_RELATIVO} do corpo ${medida.corpo}` };
  }
  const colar =
    medida.grupos >= MIN_DE_GRUPOS
    && medida.vaoMediano >= PASSO_MIN
    && medida.vaoMediano <= PASSO_MAX
    && medida.regulares >= MIN_DE_REGULARES;
  return {
    ...medida,
    colar,
    aprovado: !colar,
    motivo: colar
      ? `COLAR: ${medida.grupos} grupos de vão ${medida.vaoMediano} px, `
        + `${Math.round(medida.regulares * 100)}% regulares`
      : '',
  };
}

/** O caminho inteiro sobre um PNG em memória. */
export function medirPng(bytes, faixa = FAIXA) {
  const png = lerPng(bytes);
  const { largura, altura } = png;
  if (faixa.x + faixa.w > largura || faixa.y + faixa.h > altura) {
    throw new Error(
      `o recorte ${faixa.x},${faixa.y},${faixa.w},${faixa.h} não cabe no quadro ${largura}×${altura}`
    );
  }
  const cinza = cinzaDoPng(png);
  const medida = pentearOColar(perfilDaFita(cinza, largura, faixa));
  return { quadro: `${largura}x${altura}`, faixa, ...julgarColar(medida) };
}

/**
 * A CAPTURA: assenta parado, anda no tempo, fotografa. O `jd` dos dois
 * lados volta junto — sem ele a foto não prova movimento nenhum.
 */
export async function capturarAFita(porta = 9411) {
  return capturarCDP({
    url: APP + VISTA,
    largura: JANELA.largura,
    altura: JANELA.altura,
    dpr: JANELA.dpr,
    porta,
    aoAssentar: async ({ send }) => {
      const js = async (expr) => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
        if (r.exceptionDetails) throw new Error(`js: ${r.exceptionDetails.text}`);
        return r.result.value;
      };
      // `window.__director` só existe em DEV — e é lá que este juiz roda,
      // no mesmo dev server das outras réguas. Sem ele não há relógio a
      // andar, e uma foto parada seria prova falsa: por isso LANÇA.
      const temDirector = await js('typeof window.__director === "object"');
      if (!temDirector) throw new Error('sem window.__director: o relógio não pode andar');
      const jdParado = await js('window.__director.tempo.jd');
      await js(
        '(() => { const d = window.__director;'
        + ` while (d.tempo.degrau !== ${DEGRAU_DO_RELOGIO}) d.ciclarDegrau();`
        + ' d.andarNoTempo(1); })()'
      );
      await dorme(SEGUNDOS_ANDANDO * 1000);
      const jdAndando = await js('window.__director.tempo.jd');
      if (!(jdAndando > jdParado)) {
        throw new Error(`o relógio não andou: jd ${jdParado} → ${jdAndando}`);
      }
      return { jdParado, jdAndando, diasAndados: arred(jdAndando - jdParado, 3) };
    },
  });
}

async function principal() {
  const arquivo = process.argv[2];
  const faixa = process.env.FAIXA
    ? (([x, y, w, h]) => ({ x, y, w, h }))(process.env.FAIXA.split(',').map(Number))
    : FAIXA;

  let bytes;
  let relogio = null;
  if (arquivo) {
    bytes = readFileSync(arquivo);
  } else {
    const r = await capturarAFita(Number(process.env.PORTA || 9411));
    bytes = r.png;
    relogio = r.mexeu;
    if (process.env.SAIDA) writeFileSync(process.env.SAIDA, bytes);
  }

  const fora = { vista: arquivo ?? VISTA, relogio, ...medirPng(bytes, faixa) };
  const texto = JSON.stringify(fora, null, 1);
  console.log(texto);
  if (process.env.JSON) writeFileSync(process.env.JSON, texto + '\n');
  console.log(
    fora.aprovado
      ? `>>> SEM COLAR — ${fora.contas} contas em ${fora.grupos} grupos`
      : `>>> REPROVADO — ${fora.motivo}`
  );
  if (!fora.aprovado) process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('colar-da-fita.mjs')) await principal();
