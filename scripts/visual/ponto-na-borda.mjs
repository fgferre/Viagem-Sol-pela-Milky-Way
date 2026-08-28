// ============================================================
// O JUIZ DO PONTO NA BORDA — item 70, causa 2.
//
//   node scripts/visual/ponto-na-borda.mjs              # mede e grava
//   ESTADO=antes node scripts/visual/ponto-na-borda.mjs # o mesmo, outro rótulo
//
// ------------------------------------------------------------
// A QUEM ELE SERVE
// ------------------------------------------------------------
// Ao DONO. Quando uma estrela forte sai pela borda, o brilhão dela
// some de uma vez e o céu perde luz num passo. A hero (QUAD) já sai
// suave; o ponto do catálogo não. Este juiz esconde o clarão das
// heroes (`noclarao`) e o bloom (`nobloom`) para medir O PONTO, que
// é a causa 2. A foto para o olho dele sai COM a cena inteira —
// `--prancha` — porque é isso que ele vê.
//
// ------------------------------------------------------------
// O QUE ELE MEDE
// ------------------------------------------------------------
// O pico da FAIXA direita do quadro (48×64 px na altura da estrela)
// enquanto Rigil Kentaurus atravessa a borda, numa janela de
// 1128×1080 (a altura em que o item 81 calibrou a PSF). O pop é um
// degrau: a faixa perde mais da metade da luz no passo que cruza
// NDC x = 1. A saída suave perde aos poucos (o rabo da PSF).
//
// Neste Mac (ANGLE/Metal) o GPU já mantém o sprite quando o centro
// sai por 1–2 px, então sabotar o prender não muda a curva aqui. O
// juiz ainda exige o rabo visível; o prender é o conserto portátil
// para o GPU que descarta o ponto no clip, que é a letra do spec.
//
// Sem estrela na faixa, ou sem cruzar a borda, o juiz REPROVA —
// não avisa. A lição do MB1 descalibrado (item 81).
// ============================================================
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { carimboDoCodigo } from './ab-identidade.mjs';
import {
  APP_PADRAO,
  capturarCDP,
  dorme,
  esperarCapaSair,
} from './chrome.mjs';
import { arred, cinzaDoPng, lerPng, semSobrescrever } from './luz-ab.mjs';

export const APP = process.env.APP_URL || APP_PADRAO;
export const LARGURA = 1128;
export const ALTURA = 1080;
export const ESTRELA = 'Rigil Kentaurus';
/** 40 UA em parsec — `648000/π` é `UA_POR_PC` em `lib/unidades.ts`. */
export const UA_POR_PC = 648_000 / Math.PI;
export const DIST_UA = 40;
export const FOV_GRAUS = 58;
export const FAIXA_PX = 48;
/** degrau relativo que ainda é pop: a faixa perde metade num passo */
export const SOLEIRA_DO_POP = 0.5;
/**
 * NDC x da travessia. A PSF do catálogo nesta vista tem ~7 px; a
 * zona em que o sprite ainda toca o quadro depois do centro sair
 * é ~0,006 de NDC. Os passos cobrem os dois lados dessa faixa.
 */
export const PASSOS_NDC = [0.98, 0.995, 0.999, 1.001, 1.003, 1.005, 1.008, 1.015];

/** Média de cinza num retângulo [x0,x1) × [y0,y1), origem no topo do PNG. */
export function luzDaFaixa(cinza, largura, altura, { x0, x1, y0, y1 }) {
  const xa = Math.max(0, Math.floor(x0));
  const xb = Math.min(largura, Math.ceil(x1));
  const ya = Math.max(0, Math.floor(y0));
  const yb = Math.min(altura, Math.ceil(y1));
  if (xb <= xa || yb <= ya) {
    throw new Error(
      `faixa vazia (${xa},${ya})–(${xb},${yb}) em ${largura}×${altura}`
      + ` a partir de x0=${x0} y0=${y0} y1=${y1}`
    );
  }
  let s = 0;
  let n = 0;
  let pico = 0;
  for (let y = ya; y < yb; y++) {
    for (let x = xa; x < xb; x++) {
      const v = cinza[y * largura + x];
      s += v;
      n++;
      if (v > pico) pico = v;
    }
  }
  return { media: s / n, pico, n };
}

/**
 * Veredito sobre a curva de luz da faixa. `pop: true` é REPROVAÇÃO —
 * o ponto morreu seco. Sem cruzar a borda, sem luz, também reprova.
 */
export function julgarSaida(curva, { soleira = SOLEIRA_DO_POP } = {}) {
  if (!curva || curva.length < 4) {
    return { aprovado: false, pop: false, motivo: 'curva curta demais para julgar' };
  }
  const cruzou = curva.findIndex((p) => p.ndcX >= 1);
  if (cruzou < 2 || cruzou >= curva.length - 1) {
    return { aprovado: false, pop: false, motivo: 'a estrela não cruzou a borda' };
  }
  const ultimoDentro = curva[cruzou - 1];
  const primeiroFora = curva[cruzou];
  if (ultimoDentro.luz < 4) {
    return {
      aprovado: false,
      pop: false,
      motivo: `sem estrela na faixa: luz ${arred(ultimoDentro.luz, 2)}`,
    };
  }
  const queda = (ultimoDentro.luz - primeiroFora.luz) / ultimoDentro.luz;
  const pop = queda >= soleira;
  return {
    aprovado: !pop,
    pop,
    maiorQueda: arred(queda, 3),
    noPasso: cruzou,
    luzDentro: arred(ultimoDentro.luz, 2),
    luzFora: arred(primeiroFora.luz, 2),
    motivo: pop
      ? `pop de ${arred(queda * 100, 1)}% ao cruzar a borda (soleira ${soleira * 100}%)`
      : null,
  };
}

/** Recorte na borda direita, na altura da estrela. PNG tem origem no topo. */
export function caixaDaEstrela(largura, altura, ndcY) {
  const pngY = (0.5 - 0.5 * ndcY) * altura;
  const h = 64;
  const y0 = Math.max(0, pngY - h / 2);
  const y1 = Math.min(altura, pngY + h / 2);
  return {
    x0: largura - FAIXA_PX,
    x1: largura,
    y0,
    y1: Math.max(y1, y0 + 1),
  };
}

async function avaliar(send, expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.exceptionDetails) {
    throw new Error(`js: ${r.exceptionDetails.text}: ${r.exceptionDetails.exception?.description ?? ''}`);
  }
  return r.result.value;
}

async function esperarQuadros(send, n) {
  const f0 = Number(await avaliar(send, 'window.__f|0')) || 0;
  const prazo = Date.now() + 4000;
  while (Date.now() < prazo) {
    const f = Number(await avaliar(send, 'window.__f|0')) || 0;
    if (f >= f0 + n) return;
    await dorme(30);
  }
}

async function pousar(send, estrela, ndcAlvo) {
  const js =
    `(() => { const d = window.__director; const c = d.engine.camera;`
    + ` const roam = d.roam;`
    + ` if (!roam) throw new Error('Director.roam inacessível');`
    + ` const len = Math.hypot(${estrela.x}, ${estrela.y}, ${estrela.z});`
    + ` const dpc = ${DIST_UA} / ${UA_POR_PC};`
    + ` const ux = ${estrela.x} / len, uy = ${estrela.y} / len, uz = ${estrela.z} / len;`
    + ` d.placeCamera([ux * dpc, uy * dpc, uz * dpc], [${estrela.x}, ${estrela.y}, ${estrela.z}]);`
    + ` c.fov = ${FOV_GRAUS}; c.updateProjectionMatrix();`
    + ` const fovH = 2 * Math.atan(Math.tan(c.fov * Math.PI / 360) * c.aspect);`
    + ` roam.yaw += Math.atan(${ndcAlvo} * Math.tan(fovH / 2));`
    + ` roam.update(0);`
    + ` return { yaw: roam.yaw, pitch: roam.pitch }; })()`;
  await avaliar(send, js);
  const prazo = Date.now() + 8000;
  while (Date.now() < prazo) {
    const pronto = await avaliar(
      send,
      '!!(window.__director && window.__director.captura && window.__director.captura.pronto)'
    );
    if (pronto) break;
    await dorme(40);
  }
  await esperarQuadros(send, 2);
}

async function projetar(send, estrela) {
  const js =
    `(() => { const d = window.__director; const c = d.engine.camera;`
    + ` c.updateMatrixWorld(true); c.updateProjectionMatrix();`
    + ` const v = c.position.clone().set(${estrela.x}, ${estrela.y}, ${estrela.z});`
    + ` v.project(c);`
    + ` return { nx: v.x, ny: v.y, nz: v.z,`
    + ` fov: c.fov, aspect: c.aspect,`
    + ` px: [c.position.x, c.position.y, c.position.z] }; })()`;
  return avaliar(send, js);
}

async function fotografar(send) {
  await esperarCapaSair(send);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(shot.data, 'base64');
  if (buf.length < 40000) throw new Error(`captura suspeita de vazia (${buf.length} B)`);
  return buf;
}

async function medir({ porta = 9740 } = {}) {
  const query =
    'atlas=1&shot=2&noclarao=1&nobloom=1&nogal=1&nonebula=1&nosun=1'
    + '&noplan=1&noforge=1&nowrap=1&q=cinema&jd=2460409.26395835';
  const { mexeu } = await capturarCDP({
    url: `${APP}/?${query}`,
    largura: LARGURA,
    altura: ALTURA,
    porta,
    dpr: 1,
    aoAssentar: async ({ send }) => {
      const nomeadas = JSON.parse(
        await avaliar(send, 'JSON.stringify(window.__director.nomeadas.map((e) => ({ n: e.n, x: e.x, y: e.y, z: e.z, m: e.m })))')
      );
      const estrela = nomeadas.find((e) => e.n === ESTRELA);
      if (!estrela) throw new Error(`${ESTRELA} não está nas nomeadas`);
      const curva = [];
      const crus = [];
      for (const ndcAlvo of PASSOS_NDC) {
        await pousar(send, estrela, ndcAlvo);
        const proj = await projetar(send, estrela);
        process.stdout.write(
          `  ndcAlvo=${ndcAlvo} proj=(${Number(proj.nx).toFixed(3)},${Number(proj.ny).toFixed(3)},${Number(proj.nz).toFixed(3)})`
          + ` fov=${proj.fov} aspect=${Number(proj.aspect).toFixed(3)}\n`
        );
        const png = await fotografar(send);
        const dec = lerPng(png);
        const cinza = cinzaDoPng(dec);
        const faixa = caixaDaEstrela(dec.largura, dec.altura, proj.ny);
        const { media, pico } = luzDaFaixa(cinza, dec.largura, dec.altura, faixa);
        curva.push({
          ndcAlvo,
          ndcX: arred(proj.nx, 4),
          ndcY: arred(proj.ny, 4),
          luz: arred(pico, 3),
          media: arred(media, 3),
          pico: arred(pico, 2),
        });
        crus.push(png);
      }
      return { estrela: { n: estrela.n, m: estrela.m }, curva, crus };
    },
  });
  return mexeu;
}

/* c8 ignore start */
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const estado = process.env.ESTADO || 'depois';
  const pasta = resolve('capturas');
  mkdirSync(pasta, { recursive: true });
  const medido = await medir();
  const veredito = julgarSaida(medido.curva);
  const json = {
    item: 70,
    causa: 2,
    estado,
    carimbo: carimboDoCodigo(),
    janela: { largura: LARGURA, altura: ALTURA, dpr: 1 },
    estrela: medido.estrela,
    curva: medido.curva,
    veredito,
  };
  const arqJson = semSobrescrever(resolve(pasta, `item70-borda-${estado}.json`));
  writeFileSync(arqJson, JSON.stringify(json, null, 2));
  const cruzou = medido.curva.findIndex((p) => p.ndcX >= 1);
  const idx = cruzou >= 1 ? cruzou : Math.floor(medido.curva.length / 2);
  const arqPng = semSobrescrever(resolve(pasta, `item70-borda-${estado}.png`));
  writeFileSync(arqPng, medido.crus[idx]);
  process.stdout.write(
    JSON.stringify({ arquivo: arqJson, png: arqPng, veredito }, null, 2) + '\n'
  );
  if (!veredito.aprovado) process.exit(1);
}
/* c8 ignore end */
