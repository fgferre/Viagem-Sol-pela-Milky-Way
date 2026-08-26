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
// isso a captura ASSENTA com o relógio parado, ANDA no tempo, e só então
// dispara o obturador.
//
// E ANDA UM NÚMERO FIXO DE DIAS DE EFEMÉRIDE, não um número de segundos
// de relógio de parede. A primeira redação dormia 3 s: a efeméride
// andada virava refém da CARGA da máquina (34,1 / 33,6 / 31,2 dias em
// três corridas da mesma casa, 21,4 na de um auditor), e com ela o corpo
// da fita mexia no primeiro decimal. O número de um juiz tem de voltar
// igual amanhã. Agora a parada é por `jd`: um trecho DEPRESSA para
// cobrir o caminho e um DEVAGAR para pousar fino, com o resíduo medido e
// gravado no JSON.
//
// E O RELÓGIO TEM DENTE: se o gancho da captura não disparar, `mexeu`
// volta nulo e a foto seria de cena PARADA — o juiz REPROVA em vez de
// aprovar, pela regra da casa (juiz que não consegue medir reprova).
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { carimboDoCodigo } from './ab-identidade.mjs';
import { capturarCDP, dorme } from './chrome.mjs';
import { arred, cinzaDoPng, lerPng, percentil } from './luz-ab.mjs';

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
 * A ANDADA, em DIAS DE EFEMÉRIDE — e a parada é por `jd`, nunca por
 * segundos dormidos (ver o cabeçalho).
 *
 * DOIS TRECHOS porque a escada de tempo é grossa: o degrau é uma taxa, e
 * a granularidade da parada é o que o relógio anda em UM quadro. O
 * degrau 6 (~11,6 dias/s) cobre 29,5 dias em 2,5 s mas erra o alvo em
 * até ~0,2 dia por quadro; o degrau 4 (~0,116 dias/s) pousa o último
 * meio dia com quantum de ~0,002 dia. Junto: ~7 s de andada e um `jd`
 * final repetível no terceiro decimal.
 *
 * O relógio PARA antes do obturador, e isso não desfaz a prova: os
 * milhares de quadros em que `escreverInstante` reescreveu os 30 laços
 * já aconteceram, e é essa reescrita — com a distância de traço parada
 * no zero do construtor — que a foto tinha de julgar. Sem parar, a
 * latência do próprio `captureScreenshot` voltaria a mover o `jd`.
 */
export const DEGRAU_DEPRESSA = 6;
export const DEGRAU_DEVAGAR = 4;
export const DIAS_A_ANDAR = 30;
/** o último trecho, andado devagar para o pouso ser fino */
export const ULTIMO_TRECHO_DIAS = 0.5;
/** acima disto o relógio não está lento: está PARADO — e o juiz reprova */
export const TETO_DA_ANDADA_MS = 120000;

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

/** A mediana é o `percentil` do medidor de luz — uma definição só. */
const mediana = (v) => percentil(v, 0.5);

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
 * O DENTE DO RELÓGIO, puro e cobrável: a foto vale como prova de fita em
 * movimento? Devolve `{ ok, motivo }`.
 *
 * ELE EXISTE PORQUE O SILÊNCIO ERA APROVAÇÃO: se o gancho `aoAssentar`
 * deixar de disparar — apagado, renomeado, um `capturarCDP` que pare de
 * chamá-lo —, `mexeu` volta `null`, a foto sai da cena PARADA e o
 * veredito do pente seguia dando 0. Fita parada não julga o A1.
 */
export function julgarORelogio(relogio) {
  if (!relogio) {
    return { ok: false, motivo: 'o relógio não foi medido: a foto seria de cena PARADA' };
  }
  if (!(relogio.diasAndados > 0)) {
    return { ok: false, motivo: `o relógio não andou: ${relogio.diasAndados} dias` };
  }
  return { ok: true, motivo: '' };
}

/**
 * A CAPTURA: assenta parado, anda um número FIXO de dias de efeméride,
 * para o relógio e fotografa. Volta o `jd` dos dois lados, o resíduo do
 * pouso e quantos QUADROS foram desenhados na andada (`window.__f`, o
 * contador que o próprio harness instala) — sem isso a foto não prova
 * movimento nenhum.
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
      const quadrosAntes = await js('window.__f || 0');

      // O degrau troca com o relógio PARADO: `ciclarDegrau` dá a volta na
      // escada, e passar pelo degrau 7 (~116 dias/s) com o relógio andando
      // atiraria o `jd` para longe do alvo antes do pouso.
      const andarAte = async (degrau, alvoEmDias) => {
        await js(
          '(() => { const d = window.__director; d.andarNoTempo(0);'
          + ` while (d.tempo.degrau !== ${degrau}) d.ciclarDegrau();`
          + ' d.andarNoTempo(1); })()'
        );
        const prazo = Date.now() + TETO_DA_ANDADA_MS;
        for (;;) {
          const jd = await js('window.__director.tempo.jd');
          if (jd - jdParado >= alvoEmDias) return;
          if (Date.now() > prazo) {
            await js('window.__director.andarNoTempo(0)');
            throw new Error(
              `o relógio não chegou a ${alvoEmDias} dias em ${TETO_DA_ANDADA_MS / 1000} s`
              + ` (parou em ${arred(jd - jdParado, 3)}): relógio PARADO, não lento`
            );
          }
          await dorme(10);
        }
      };
      await andarAte(DEGRAU_DEPRESSA, DIAS_A_ANDAR - ULTIMO_TRECHO_DIAS);
      await andarAte(DEGRAU_DEVAGAR, DIAS_A_ANDAR);
      await js('window.__director.andarNoTempo(0)');

      const jdAndado = await js('window.__director.tempo.jd');
      const quadros = (await js('window.__f || 0')) - quadrosAntes;
      const diasAndados = jdAndado - jdParado;
      if (!(diasAndados > 0)) {
        throw new Error(`o relógio não andou: jd ${jdParado} → ${jdAndado}`);
      }
      return {
        jdParado,
        jdAndado,
        diasAndados: arred(diasAndados, 4),
        alvoEmDias: DIAS_A_ANDAR,
        residuoEmDias: arred(diasAndados - DIAS_A_ANDAR, 4),
        quadrosNaAndada: quadros,
      };
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

  const medida = medirPng(bytes, faixa);
  // O CARIMBO vai no arquivo, e não só na tela: dois JSON com números
  // diferentes não têm como ser conciliados depois se nenhum diz de que
  // código saiu. A definição é a do `ab-identidade` — uma só.
  const fora = {
    vista: arquivo ?? VISTA,
    // `codigo` é a árvore de onde ESTE PROCESSO saiu; `app` é quem pintou
    // os pixels. Os dois porque não são sempre o mesmo: medir o pré-A1
    // exige um servidor de outra árvore, e um carimbo sozinho mentiria
    // sobre qual código produziu a imagem.
    codigo: carimboDoCodigo(),
    app: arquivo ? null : APP,
    quandoUtc: new Date().toISOString(),
    relogio,
    ...medida,
  };
  // O DENTE DO RELÓGIO só se aplica a quem CAPTUROU: um PNG de disco não
  // tem relógio a medir, e o modo de arquivo é diagnóstico (medir de novo
  // um quadro já tirado). O que ele nunca pode é aprovar em silêncio uma
  // captura que saiu com a cena parada.
  const doRelogio = arquivo ? { ok: true, motivo: '' } : julgarORelogio(relogio);
  if (!doRelogio.ok) {
    fora.aprovado = false;
    fora.motivo = doRelogio.motivo;
  }
  const texto = JSON.stringify(fora, null, 1);
  console.log(texto);
  if (process.env.JSON) writeFileSync(process.env.JSON, texto + '\n');
  console.log(
    fora.aprovado
      ? `>>> SEM COLAR — ${fora.contas} contas em ${fora.grupos} grupos`
        + (arquivo
          ? ' (quadro de disco: o relógio não foi medido aqui)'
          : ` · relógio andou ${relogio.diasAndados} dias em ${relogio.quadrosNaAndada} quadros`)
      : `>>> REPROVADO — ${fora.motivo}`
  );
  if (!fora.aprovado) process.exit(1);
}

// O IDIOMA DA CASA (`luz-ab.mjs`): compara o caminho RESOLVIDO com o
// próprio módulo. O `endsWith` de antes disparava uma captura inteira em
// qualquer arquivo que por acaso terminasse com este nome.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await principal();
}
