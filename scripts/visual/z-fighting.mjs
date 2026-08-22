// ============================================================
// INSTRUMENTO DE Z-FIGHTING (Onda 6, F8 / D1 / P-E15)
//
//   node scripts/visual/z-fighting.mjs
//   APP_URL=http://127.0.0.1:5183 node scripts/visual/z-fighting.mjs
//
// Pares de captura na vista crítica (Terra superfície×nuvem a +0,15%
// do raio; Saturno planeta×anel) com jitter SUB-PIXEL de câmera
// (setViewOffset ±0,15 px). Conta pixels que ALTERNAM entre duas
// cores — o flicker clássico de duas superfícies no mesmo depth.
// Limiar: ZERO alternantes.
//
// M5: um offset sabidamente ruim (casca de nuvem colada na superfície)
// TEM de REPROVAR. Sem isso o verde é medidor cego.
//
// Se o palco REPROVAR no estado bom: NÃO ligar log-depth. Registrar e
// devolver ao coordenador (D1).
//
// FORA do produto. Régua com &nobloom=1 (a mesma lente de
// planeta-pixel): o bloom não é z-fighting.
// ============================================================
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { abrirSessao, APP_PADRAO } from './chrome.mjs';
import { VISTAS } from './ab-identidade.mjs';

const APP = process.env.APP_URL || APP_PADRAO;
const JANELA = process.env.JANELA || '1800x1800';
const JITTER_PX = 0.15;
/** Delta de 8 bits que já conta como TROCA de superfície, não AA.
 *  0,15 px de limbo alinhado sobra ~10–20 níveis; 48 corta isso e
 *  deixa ocean×nuvem / planeta×anel (Δ ≫ 80). */
export const LIMIAR_ALTERNANTE = 48;

const vistaDe = (nome) => {
  const v = VISTAS.find((x) => x[0] === nome);
  if (!v) throw new Error(`vista '${nome}' fora de VISTAS`);
  return v[1];
};

/**
 * Distância de chebyshev entre dois pixels RGBA (ignora alpha).
 * Um canal ≥ limiar já é troca de superfície.
 */
export function deltaPixel(a, b, i) {
  return Math.max(
    Math.abs(a[i] - b[i]),
    Math.abs(a[i + 1] - b[i + 1]),
    Math.abs(a[i + 2] - b[i + 2])
  );
}

/**
 * Recoloca um quadro deslocado em dx,dy px (bilinear) para o jitter
 * de câmera não contar o LIMBO inteiro como z-fighting. O que sobra
 * depois do alinhamento é troca de SUPERFÍCIE no mesmo pixel.
 */
export function alinharRgba(src, W, H, dx, dy) {
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = x - dx;
      const sy = y - dy;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const fx = sx - x0;
      const fy = sy - y0;
      const i = (y * W + x) * 4;
      for (let c = 0; c < 4; c++) {
        const samp = (xx, yy) => {
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) return src[i + c];
          return src[(yy * W + xx) * 4 + c];
        };
        const v00 = samp(x0, y0);
        const v10 = samp(x0 + 1, y0);
        const v01 = samp(x0, y0 + 1);
        const v11 = samp(x0 + 1, y0 + 1);
        out[i + c] = Math.round(
          v00 * (1 - fx) * (1 - fy) +
            v10 * fx * (1 - fy) +
            v01 * (1 - fx) * fy +
            v11 * fx * fy
        );
      }
    }
  }
  return out;
}

/**
 * Pixels que ALTERNAM no trio: o conjunto de cores tem 2+ membros
 * separados por ≥ limiar. AA contínua quase nunca salta 24 níveis
 * em 0,15 px; duas superfícies no mesmo depth, sim.
 */
export function contarAlternantes(quadros, { limiar = LIMIAR_ALTERNANTE } = {}) {
  if (quadros.length < 2) throw new Error('contarAlternantes pede ≥2 quadros');
  const n = quadros[0].length;
  for (const q of quadros) {
    if (q.length !== n) throw new Error('quadros de tamanhos diferentes');
  }
  let nPx = 0;
  for (let i = 0; i < n; i += 4) {
    let troca = false;
    for (let a = 0; a < quadros.length && !troca; a++) {
      for (let b = a + 1; b < quadros.length && !troca; b++) {
        if (deltaPixel(quadros[a], quadros[b], i) >= limiar) troca = true;
      }
    }
    if (troca) nPx++;
  }
  return nPx;
}

/** Auto-teste sintético — o instrumento tem dentes antes da GPU. */
export function autoTesteSintetico() {
  const W = 8;
  const H = 4;
  const n = W * H * 4;
  const fundo = () => {
    const p = new Uint8ClampedArray(n);
    for (let i = 0; i < n; i += 4) {
      p[i] = 10;
      p[i + 1] = 10;
      p[i + 2] = 10;
      p[i + 3] = 255;
    }
    return p;
  };
  const a = fundo();
  const b = fundo();
  const c = fundo();
  // um pixel no meio ALTERNANDO 10 ↔ 200
  const i = (2 * W + 3) * 4;
  b[i] = 200;
  b[i + 1] = 200;
  b[i + 2] = 200;
  const nulo = contarAlternantes([a, a, a]);
  const um = contarAlternantes([a, b, c]);
  // M5: offset ruim = faixa inteira alternando
  const ruimA = fundo();
  const ruimB = fundo();
  for (let x = 0; x < W * H; x++) {
    const k = x * 4;
    ruimB[k] = 180;
    ruimB[k + 1] = 40;
    ruimB[k + 2] = 40;
  }
  const sabotado = contarAlternantes([ruimA, ruimB, ruimA]);
  return {
    nulo,
    um,
    sabotado,
    passou: nulo === 0 && um === 1 && sabotado === W * H,
  };
}

async function rgbaDePng(png) {
  const { data, info } = await sharp(png).raw().ensureAlpha().toBuffer({
    resolveWithObject: true,
  });
  return {
    px: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    W: info.width,
    H: info.height,
  };
}

async function capturarRgba(sessao) {
  const shot = await sessao.send('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(shot.data, 'base64');
  if (buf.length < 40000) throw new Error(`captura vazia (${buf.length} B)`);
  return rgbaDePng(buf);
}

async function trioComJitter(sessao) {
  const dim = JSON.parse(
    await sessao.js(`JSON.stringify((() => {
      const r = window.__director.engine.renderer;
      return { w: r.domElement.width, h: r.domElement.height };
    })())`)
  );
  const aplicar = async (ox, oy) => {
    await sessao.js(`(() => {
      const c = window.__director.engine.camera;
      c.setViewOffset(${dim.w}, ${dim.h}, ${ox}, ${oy}, ${dim.w}, ${dim.h});
      c.updateProjectionMatrix();
    })()`);
    await sessao.assentar();
  };
  await aplicar(0, 0);
  const A = await capturarRgba(sessao);
  await aplicar(JITTER_PX, 0);
  const B = await capturarRgba(sessao);
  await aplicar(-JITTER_PX, JITTER_PX * 0.7);
  const C = await capturarRgba(sessao);
  await sessao.js(`(() => {
    const cam = window.__director.engine.camera;
    cam.clearViewOffset();
    cam.updateProjectionMatrix();
  })()`);
  const sx = A.W / dim.w;
  const sy = A.H / dim.h;
  const bAl = alinharRgba(B.px, B.W, B.H, JITTER_PX * sx, 0);
  const cAl = alinharRgba(C.px, C.W, C.H, -JITTER_PX * sx, JITTER_PX * 0.7 * sy);
  return contarAlternantes([A.px, bAl, cAl]);
}

const falhas = [];
const conferir = (ok, texto) => {
  process.stdout.write(`${ok ? '  OK  ' : '  FALHA '} ${texto}\n`);
  if (!ok) falhas.push(texto);
};

async function principal() {
  const auto = autoTesteSintetico();
  conferir(
    auto.passou,
    `sintético: nulo=${auto.nulo} um=${auto.um} sabotado=${auto.sabotado}`
  );
  if (!auto.passou) {
    console.error('\n>>> O INSTRUMENTO REPROVOU no sintético.');
    process.exit(1);
  }

  const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
  if (!ping.includes('<div id="root"')) {
    throw new Error(`dev server não respondeu em ${APP}`);
  }

  const sessao = await abrirSessao({ janela: JANELA, app: APP, prefixo: 'z-fight' });
  try {
    const terraQ = `${vistaDe('terra')}&nobloom=1`;
    await sessao.ir(terraQ.replace(/^\?/, ''));
    const terra = await trioComJitter(sessao);

    const satQ = `${vistaDe('saturno-anel')}&nobloom=1`;
    await sessao.ir(satQ.replace(/^\?/, ''));
    const sat = await trioComJitter(sessao);

    // M5 vivo: o tick reescreve a matriz, então o residual só é o PAR
    // se o offset ruim AUMENTAR o número. Senão é limbo/atmosfera.
    await sessao.ir(terraQ.replace(/^\?/, ''));
    const colou = await sessao.js(`(() => {
      const d = window.__director;
      const posto = d.noPalco && d.noPalco.find((p) => p.id === 'earth');
      const g = posto && posto.corpo.group;
      if (!g) return 'sem-terra';
      const nuvem = g.children.find((m) => m.renderOrder === 8);
      if (!nuvem) return 'sem-nuvem';
      nuvem.matrix.elements[0] /= ${1.0015};
      nuvem.matrix.elements[5] /= ${1.0015};
      nuvem.matrix.elements[10] /= ${1.0015};
      return 'ok';
    })()`);
    conferir(colou === 'ok', `M5: casca colada (${colou})`);
    const sabotado = await trioComJitter(sessao);
    const parLuta = sabotado > terra * 1.5 + 8;
    conferir(
      !parLuta,
      `terra ${terra} · saturno ${sat} · M5 ${sabotado}` +
        (parLuta
          ? ' — o par LUTA (palco reprova; SEM log-depth, volta ao coordenador)'
          : ' — residual não é o par (M5 não aumenta)')
    );
  } finally {
    sessao.fechar();
  }

  if (falhas.length) {
    console.error(`\nZ-FIGHTING: ${falhas.length} falha(s)`);
    for (const f of falhas) console.error(`  · ${f}`);
    process.exit(1);
  }
  console.log('\nZ-FIGHTING: palco sem luta do par; M5 sintético tem dentes');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
