// Serve: R2 (régua única) — o RETRATO DE FAMÍLIA: os 47 corpos que refletem
// luz no Atlas, fotografados na mesma luz, na mesma fase (30°, face acesa
// para a câmera), com UMA exposição fixa e o mesmo tamanho aparente; mede o
// disco de cada um e escreve uma prancha (JPEG) e os números (.md).
// Custo: ~25 s por corpo (uma captura de Chrome por vez, quatro fotos por
// captura); os 47 em lotes de ≤ 9 min, retomáveis (cache por corpo).
//
//   node scripts/visual/retrato-de-familia.mjs --rotulo antes
//   node scripts/visual/retrato-de-familia.mjs --rotulo depois --app http://127.0.0.1:5313
//   node scripts/visual/retrato-de-familia.mjs --rotulo teste --so mars,atlas,saturn --saida /tmp/x --depurar
//
// Opções: --app <url> (padrão http://127.0.0.1:5312; o script NÃO sobe o
// servidor), --saida <pasta> (padrão capturas/regua-r2 da cópia principal),
// --cache <pasta>, --refazer (ignora o cache), --minutos <n> (orçamento do
// lote, padrão 9), --trava <pasta> (a trava do Chrome compartilhado),
// --depurar (a prancha ganha, ao lado de cada foto, o contorno medido).
//
// COMO MEDE. A foto sai com bloom desligado (`?nobloom=1`), lente nenhuma e
// o passe de filme (grão, vinheta, aberração cromática, elevação de negros)
// desligado na página; o resto é o OutputPass: Khronos PBR Neutral + sRGB.
// Cada pixel volta para luz linear da cena: decodifica sRGB, inverte o
// Neutral (conta fechada: reta abaixo do ombro, ombro invertido em forma
// fechada) e divide pela exposição que o renderer recebeu. G medido = média
// do G linear sobre TODO pixel dentro do contorno (aceso e apagado), o
// fluxo integrado por área de disco, como o p. B/G = ΣB / ΣG.
//
// O CONTORNO é o mesmo método para todos: duas fotos extras no mesmo
// carregamento — uma com o corpo escondido, outra com o corpo pintado de
// BRANCO pelo próprio shader (o fragment ganha, no fim do main, uma cor
// fixa; o vertex fica, com o relevo e a forma) — e o contorno é onde as
// duas diferem: a maior componente perto do centro projetado, com os
// buracos preenchidos. Pega a silhueta REAL desenhada (esculpidas, relevo
// por mapa de altura, elipsoides), em qualquer fundo e mesmo onde o mapa
// é preto (a falta de dado de Vesta e Caronte). Só as malhas opacas com a
// luz do Sol do shader entram: plumas e halos ficam fora. Quando falha, cai
// no círculo do raio equatorial e a tabela avisa.
//
// A FASE: na página, o rig do Atlas perde o `pai` (as luas param de usar
// `direcaoDaLua` e passam à lei dos planetas: 30° fora do eixo do Sol, do
// lado do Sol) e o polo do rig vira a componente do polo perpendicular ao
// eixo do Sol (a pose de 30° nunca bate no grampo polar). A fase REAL de
// cada corpo é medida das posições de câmera, corpo e Sol na cena, e
// conferida pelos uniforms do shader. Nada em `src/` muda.
import { existsSync, mkdirSync, readFileSync, rmdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { capturarCDP, dorme } from './chrome.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// ------------------------------------------------------------
// OS ALVOS — §3 de capturas/regua-r2/estudo-da-regra.md (10/10/2026).
// [id, nome, G alvo (p0 médio, canal G), B/G alvo]. Editável à mão.
// A Terra entra só como lajota de referência (fora da mediana).
// ------------------------------------------------------------
const ALVOS = [
  ['mercury', 'Mercúrio', 0.111, 0.74],
  ['venus', 'Vênus', 0.689, 0.96],
  ['earth', 'Terra', 0.226, 1.23],
  ['mars', 'Marte', 0.170, 0.52],
  ['jupiter', 'Júpiter', 0.538, 0.82],
  ['saturn', 'Saturno', 0.517, 0.68],
  ['uranus', 'Urano', 0.488, 1.15],
  ['neptune', 'Netuno', 0.442, 1.27],
  ['moon', 'Lua', 0.113, 0.81],
  ['phobos', 'Fobos', 0.053, 0.91],
  ['deimos', 'Deimos', 0.053, 0.89],
  ['io', 'Io', 0.63, 0.61],
  ['europa', 'Europa', 0.67, 0.86],
  ['ganymede', 'Ganimedes', 0.43, 0.88],
  ['callisto', 'Calisto', 0.17, 0.85],
  ['pan', 'Pã', 0.54, 0.76],
  ['daphnis', 'Dáfnis', 0.58, 0.84],
  ['atlas', 'Atlas', 0.52, 0.83],
  ['prometheus', 'Prometeu', 0.66, 0.74],
  ['pandora', 'Pandora', 0.63, 0.81],
  ['janus', 'Jano', 0.44, 0.87],
  ['epimetheus', 'Epimeteu', 0.39, 0.90],
  ['mimas', 'Mimas', 0.63, 0.89],
  ['enceladus', 'Encélado', 0.89, 0.92],
  ['tethys', 'Tétis', 0.74, 0.93],
  ['dione', 'Dione', 0.65, 0.92],
  ['rhea', 'Reia', 0.60, 0.90],
  ['titan', 'Titã', 0.215, 0.55],
  ['hyperion', 'Hipérion', 0.28, 0.87],
  ['iapetus', 'Jápeto', 0.20, 0.90],
  ['phoebe', 'Febe', 0.067, 1.03],
  ['miranda', 'Miranda', 0.33, 1.00],
  ['ariel', 'Ariel', 0.41, 0.98],
  ['umbriel', 'Umbriel', 0.20, 0.97],
  ['titania', 'Titânia', 0.27, 0.96],
  ['oberon', 'Oberon', 0.24, 0.95],
  ['triton', 'Tritão', 0.72, 0.96],
  ['pluto', 'Plutão', 0.43, 0.76],
  ['charon', 'Caronte', 0.345, 0.93],
  ['ceres', 'Ceres', 0.070, 0.95],
  ['vesta', 'Vesta', 0.31, 0.89],
  ['pallas', 'Palas', 0.121, 1.02],
  ['hygiea', 'Hígia', 0.056, 0.96],
  ['haumea', 'Haumea', 0.43, 1.02],
  ['makemake', 'Makemake', 0.68, 0.82],
  ['eris', 'Éris', 0.81, 0.97],
  ['quaoar', 'Quaoar', 0.092, 0.76],
].map(([id, nome, g, bg]) => ({ id, nome, g, bg }));

/** A REFERÊNCIA: fica na prancha e na tabela, fora da mediana. */
const REFERENCIA = 'earth';

// A lei de luz de cada corpo: Lommel-Seeliger nos opt-in de `rochoso.ts`
// (CONFIG `brdf: 'ls'`) e na Lua (`lua.ts`); o resto é Lambert.
const LOMMEL_SEELIGER = new Set([
  'mercury', 'moon', 'io', 'europa', 'ganymede', 'callisto', 'enceladus',
  'vesta', 'pallas', 'hygiea', 'haumea',
]);

// ------------------------------------------------------------
// A FOTO — a mesma para todos
// ------------------------------------------------------------
/** o instante do céu (o mesmo `jd` de ab-identidade/previas) */
const JD = 2460409.26395835;
/** distância da câmera em raios equatoriais do corpo: o mesmo tamanho aparente */
const D_RAIOS = 3;
/** a exposição fixa, na língua do ACES (`?exp=`); o renderer recebe a conversão */
const EXP = 1.02;
const LARGURA = 960;
const ALTURA = 640;
/** o raio do disco em px, de frente, a D_RAIOS com o fov de 58° do Atlas */
const R_NOMINAL_PX = (ALTURA / 2 / Math.tan((29 * Math.PI) / 180)) * Math.tan(Math.asin(1 / D_RAIOS));
/** o lado do recorte quadrado de cada lajota, igual para todos (as esculpidas passam de 1,5 R) */
const LADO = Math.min(ALTURA, Math.round(3.1 * R_NOMINAL_PX));
/** a diferença |flash − sem corpo| somada em RGB (0–765) que conta como corpo */
const LIMIAR_DA_MASCARA = 12;

const URL_FIXA = [
  'atlas=1', 'ver=corpo', `d=${D_RAIOS}`, `jd=${JD}`, 'shot=2', 'q=cinema',
  'luz=assistida', 'tone=neutral', `exp=${EXP}`, 'lente=nenhuma', 'nobloom=1',
  // marcas desenhadas por cima da cena (órbitas, marcadores, ícones, nomes)
  'noorbitas=1', 'nomarker=1', 'noicones=1', 'nonomes=1',
].join('&');

// ------------------------------------------------------------
// ARGUMENTOS
// ------------------------------------------------------------
const ARGS = process.argv.slice(2);
const opcao = (nome, padrao) => {
  const i = ARGS.indexOf(`--${nome}`);
  return i >= 0 && ARGS[i + 1] !== undefined ? ARGS[i + 1] : padrao;
};
const tem = (nome) => ARGS.includes(`--${nome}`);

const ROTULO = opcao('rotulo', 'antes');
const APP = opcao('app', 'http://127.0.0.1:5312').replace(/\/+$/, '');
// a cópia principal é irmã de toda cópia de trabalho (../Viagem-*), e de si mesma
const SAIDA = resolve(opcao('saida', resolve(ROOT, '../Viagem-Sol-pela-Milky-Way/capturas/regua-r2')));
const PORTA_DO_APP = new URL(APP).port || '80';
const CACHE = resolve(opcao('cache', join(tmpdir(), `retrato-de-familia-${ROTULO}-${PORTA_DO_APP}`)));
const MINUTOS = Number(opcao('minutos', '9'));
// A TRAVA do Chrome compartilhado entre as conversas desta máquina (um
// capturador por vez): `mkdir` atômico, `rmdir` sempre no fim do lote.
const TRAVA = opcao('trava', process.env.CHROME_TRAVA
  || '/private/tmp/claude-501/-Users-fgferre-Github-Viagem-Sol-pela-Milky-Way/3428c1bb-9778-4d00-9a73-e25b312157e4/scratchpad/r1b/chrome.lock');
const CHROME_HEADLESS = '^/Applications/Google Chrome.app/Contents/MacOS/Google Chrome .*--headless';
const SO = opcao('so', '').split(',').map((s) => s.trim()).filter(Boolean);
const DEPURAR = tem('depurar');

// ------------------------------------------------------------
// A CURVA: Khronos PBR Neutral (o `NeutralToneMapping` do three) e a inversa
// ------------------------------------------------------------
const INICIO_DA_COMPRESSAO = 0.8 - 0.04;
const DESSATURACAO = 0.15;
const DD = 1 - INICIO_DA_COMPRESSAO;

/** a curva publicada, na ordem do shader (cor JÁ multiplicada pela exposição) */
function neutralDireta([r, g, b]) {
  const x = Math.min(r, g, b);
  const deslocamento = x < 0.08 ? x - 6.25 * x * x : 0.04;
  let c = [r - deslocamento, g - deslocamento, b - deslocamento];
  const pico = Math.max(...c);
  if (pico < INICIO_DA_COMPRESSAO) return c;
  const novoPico = 1 - (DD * DD) / (pico + DD - INICIO_DA_COMPRESSAO);
  c = c.map((v) => (v * novoPico) / pico);
  const m = 1 - 1 / (DESSATURACAO * (pico - novoPico) + 1);
  return c.map((v) => v * (1 - m) + novoPico * m);
}

/**
 * A INVERSA. Abaixo do ombro é exata (o deslocamento do pé tem inversa
 * fechada); no ombro o pico de saída É o `novoPico` (a mistura vai para
 * ele), então o pico de entrada, a mistura e a escala também se desfazem em
 * forma fechada. A saída perto de 1 é mal condicionada: o pico é grampeado.
 */
function neutralInversa([r, g, b]) {
  let c = [r, g, b];
  const picoSaida = Math.max(r, g, b);
  if (picoSaida >= INICIO_DA_COMPRESSAO) {
    const novoPico = Math.min(picoSaida, 0.99999);
    const pico = (DD * DD) / (1 - novoPico) - DD + INICIO_DA_COMPRESSAO;
    const m = 1 - 1 / (DESSATURACAO * (pico - novoPico) + 1);
    c = c.map((v) => (((v - m * novoPico) / (1 - m)) * pico) / novoPico);
  }
  const resto = Math.max(Math.min(...c), 0);
  const x = resto < 0.04 ? 0.4 * Math.sqrt(resto) : resto + 0.04;
  const deslocamento = x - resto;
  return c.map((v) => Math.max(v + deslocamento, 0));
}

/** a volta completa conferida antes de medir: forward(inverse(y)) ≈ y */
function conferirIdaEVolta() {
  let semente = 12345;
  const acaso = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648);
  let piorY = 0;
  let piorC = 0;
  const amostras = [];
  for (let i = 0; i < 4000; i++) {
    const escala = i % 2 ? 4 : 0.3;
    amostras.push([acaso() * escala, acaso() * escala, acaso() * escala]);
  }
  for (let v = 0; v <= 3; v += 0.01) amostras.push([v, v, v]);
  for (const c of amostras) {
    const y = neutralDireta(c);
    if (Math.max(...y) > 0.9999) continue;
    const de = neutralInversa(y);
    const y2 = neutralDireta(de);
    piorY = Math.max(piorY, ...y.map((v, k) => Math.abs(v - y2[k])));
    piorC = Math.max(piorC, ...c.map((v, k) => Math.abs(v - de[k]) / Math.max(v, 1e-3)));
  }
  if (!(piorY < 1e-9 && piorC < 1e-6)) {
    throw new Error(`a inversa do Neutral não fecha: |Δy| ${piorY.toExponential(2)}, |Δc|/c ${piorC.toExponential(2)}`);
  }
  return { piorY, piorC, n: amostras.length };
}

const SRGB_PARA_LINEAR = Float64Array.from({ length: 256 }, (_, i) => {
  const v = i / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
});

// ------------------------------------------------------------
// NA PÁGINA — serializadas com toString(): nada de fora entra
// ------------------------------------------------------------
/**
 * Prepara a foto: passe de filme fora, anéis escondidos, fase de 30°,
 * distância repinada; espera a câmera parar e devolve o diagnóstico.
 */
async function prepararNaPagina({ id, raios }) {
  const d = globalThis.__director;
  const quadro = () => new Promise((r) => globalThis.requestAnimationFrame(() => r()));
  const posto = d.noPalco.find((p) => p.id === id);
  const focado = d.escada.focoCorpoId ?? null;
  if (!posto) return { erro: `"${id}" não está no palco (foco em "${focado}")` };
  if (focado !== id) return { erro: `o foco caiu em "${focado}", não em "${id}"` };
  const est = { aneis: new Set(), corpo: [], shaders: new Map() };
  globalThis.__retrato = est;
  // o passe de filme: grão, vinheta, aberração e elevação de negros
  d.post.film.enabled = false;
  // os anéis (o de Saturno, os tênues, a lajota): fora de todas as fotos
  for (const p of d.noPalco) {
    for (const chave of ['anel', 'tenues', 'lajota']) {
      const v = p.corpo?.[chave];
      if (!v) continue;
      const objetos = v.isObject3D ? [v] : Object.values(v).filter((x) => x?.isObject3D);
      for (const o of objetos) {
        o.traverse((f) => {
          est.aneis.add(f);
          f.layers.mask = 0;
        });
      }
    }
  }
  // a fase: a lei de repouso dos planetas para todos, sem grampo polar
  const rig = d.atlas;
  rig.pai = null;
  const paraOSol = rig.eixoDe.clone().negate().normalize();
  rig.polo.addScaledVector(paraOSol, -rig.polo.dot(paraOSol)).normalize();
  d.pinarEmRaios(raios);
  d.perturbar();
  const cam = d.engine.camera;
  const antes = cam.position.clone();
  const t0 = performance.now();
  let estaveis = 0;
  let quadros = 0;
  while (!(estaveis >= 8 && d.captura.pronto) && performance.now() - t0 < 20000) {
    await quadro();
    quadros++;
    const passo = cam.position.distanceTo(antes) / Math.max(cam.position.distanceTo(rig.alvo), 1e-30);
    estaveis = passo < 1e-7 ? estaveis + 1 : 0;
    antes.copy(cam.position);
  }
  // o diagnóstico, do quadro parado
  const B = rig.alvo.clone();
  const C = cam.position.clone();
  const paraCam = C.clone().sub(B);
  const raio = rig.raioDoAlvo;
  let faseUniform = null;
  let dUniform = null;
  let eclipse = 0;
  let comLuz = 0;
  posto.corpo.group.traverse((o) => {
    if (est.aneis.has(o)) return;
    const u = o.material?.uniforms;
    if (u?.uDirSolLocal && u?.uCamLocal) {
      comLuz++;
      if (faseUniform === null) {
        faseUniform = (u.uDirSolLocal.value.angleTo(u.uCamLocal.value) * 180) / Math.PI;
        dUniform = u.uCamLocal.value.length();
      }
    }
    if (u?.uEclipseAtivo) eclipse = Math.max(eclipse, u.uEclipseAtivo.value);
  });
  const ndc = B.clone().project(cam);
  const W = globalThis.innerWidth;
  const H = globalThis.innerHeight;
  const f = H / 2 / Math.tan((cam.fov * Math.PI) / 360);
  const r = d.engine.renderer;
  return {
    faseCena: (B.clone().negate().angleTo(paraCam) * 180) / Math.PI,
    faseUniform,
    dCena: paraCam.length() / raio,
    dUniform,
    eclipse,
    comLuz,
    cx: ((ndc.x + 1) / 2) * W,
    cy: ((1 - ndc.y) / 2) * H,
    rPx: f * Math.tan(Math.asin(Math.min(1, raio / paraCam.length()))),
    W,
    H,
    fov: cam.fov,
    exposicao: r.toneMappingExposure,
    toneMapping: r.toneMapping,
    passes: d.post.composer.passes.map((p) => `${p.constructor.name}:${p.enabled ? 'on' : 'off'}`),
    lente: d.post.lente,
    bloom: d.post.bloomLigado,
    aneis: est.aneis.size,
    quadros,
    estaveis,
    pronto: d.captura.pronto,
  };
}

/** As fotos do contorno: 'sem' esconde o corpo, 'flash' o pinta de branco, 'volta' desfaz. */
async function mascaraNaPagina({ id, fase }) {
  const d = globalThis.__director;
  const est = globalThis.__retrato;
  const quadro = () => new Promise((r) => globalThis.requestAnimationFrame(() => r()));
  const grupo = d.noPalco.find((p) => p.id === id).corpo.group;
  let acesos = 0;
  if (fase === 'sem') {
    grupo.traverse((o) => {
      if (est.aneis.has(o)) return;
      est.corpo.push([o, o.layers.mask]);
      o.layers.mask = 0;
    });
  } else if (fase === 'flash') {
    for (const [o, mascara] of est.corpo) {
      const mat = Array.isArray(o.material) ? null : o.material;
      const u = mat?.uniforms;
      // só as MALHAS OPACAS com a luz do Sol do shader (a superfície):
      // plumas (pontos) e cascas transparentes ficam escondidas
      if (!o.isMesh || !mat?.isShaderMaterial || mat.transparent || !(u?.uDirSolLocal && u?.uCamLocal)) continue;
      acesos++;
      o.layers.mask = mascara;
      if (!est.shaders.has(mat)) {
        est.shaders.set(mat, mat.fragmentShader);
        const fim = mat.fragmentShader.lastIndexOf('}');
        mat.fragmentShader = `${mat.fragmentShader.slice(0, fim)}  gl_FragColor = vec4(4.0, 4.0, 4.0, 1.0);\n}\n`;
        mat.needsUpdate = true;
      }
    }
  } else {
    for (const [mat, original] of est.shaders) {
      mat.fragmentShader = original;
      mat.needsUpdate = true;
    }
    for (const [o, mascara] of est.corpo) o.layers.mask = mascara;
    est.shaders.clear();
    est.corpo = [];
  }
  d.perturbar();
  const t0 = performance.now();
  let n = 0;
  while ((n < 6 || !d.captura.pronto) && performance.now() - t0 < 10000) {
    await quadro();
    n++;
  }
  return { acesos, quadros: n, pronto: d.captura.pronto };
}

// ------------------------------------------------------------
// NO NODE — a captura, o contorno e a medida
// ------------------------------------------------------------
async function rgb(png) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

/** a componente que contém o centro, com os buracos preenchidos */
function contornoPorFlash(flash, sem, w, h, cx, cy, rPx) {
  const marca = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const k = 3 * i;
    const s = Math.abs(flash[k] - sem[k]) + Math.abs(flash[k + 1] - sem[k + 1]) + Math.abs(flash[k + 2] - sem[k + 2]);
    if (s > LIMIAR_DA_MASCARA) marca[i] = 1;
  }
  const inundar = (inicio, pode) => {
    const visto = new Uint8Array(w * h);
    const pilha = [...inicio];
    for (const i of inicio) visto[i] = 1;
    while (pilha.length) {
      const i = pilha.pop();
      const x = i % w;
      const vizinhos = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
      for (const j of vizinhos) {
        if (j < 0 || j >= w * h || visto[j] || !pode(j)) continue;
        visto[j] = 1;
        pilha.push(j);
      }
    }
    return visto;
  };
  // A MAIOR componente marcada que passa a menos de um raio do centro
  // projetado — e não a do pixel central: um mapa com buraco preto no meio
  // deixaria a semente num cisco.
  let componente = null;
  let maior = 0;
  const rotulado = new Uint8Array(w * h);
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  for (let y = Math.max(0, Math.floor(y0 - rPx)); y < Math.min(h, y0 + rPx); y++) {
    for (let x = Math.max(0, Math.floor(x0 - rPx)); x < Math.min(w, x0 + rPx); x++) {
      const i = y * w + x;
      if (!marca[i] || rotulado[i] || (x - x0) ** 2 + (y - y0) ** 2 > rPx * rPx) continue;
      const c = inundar([i], (j) => marca[j] === 1);
      let n = 0;
      for (let k = 0; k < w * h; k++) {
        if (c[k]) {
          rotulado[k] = 1;
          n++;
        }
      }
      if (n > maior) {
        maior = n;
        componente = c;
      }
    }
  }
  if (!componente) return null;
  const borda = [];
  for (let x = 0; x < w; x++) borda.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) borda.push(y * w, y * w + w - 1);
  const tocaBorda = borda.some((i) => componente[i]);
  const fora = inundar(borda.filter((i) => !componente[i]), (j) => componente[j] === 0);
  const mascara = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mascara[i] = fora[i] ? 0 : 1;
  return { mascara, tocaBorda };
}

function contornoCircular(w, h, cx, cy, rPx) {
  const mascara = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= rPx * rPx) mascara[y * w + x] = 1;
    }
  }
  return mascara;
}

/** soma a luz linear da cena dentro do contorno */
function medir(foto, mascara, exposicao) {
  let n = 0;
  let somaR = 0;
  let somaG = 0;
  let somaB = 0;
  let altos = 0;
  let baixos = 0;
  let sx = 0;
  let sy = 0;
  const caixa = [Infinity, Infinity, -Infinity, -Infinity];
  const { data, w } = foto;
  for (let i = 0; i < mascara.length; i++) {
    if (!mascara[i]) continue;
    const k = 3 * i;
    const [r, g, b] = neutralInversa([
      SRGB_PARA_LINEAR[data[k]], SRGB_PARA_LINEAR[data[k + 1]], SRGB_PARA_LINEAR[data[k + 2]],
    ]);
    somaR += r;
    somaG += g;
    somaB += b;
    if (data[k + 1] >= 250) altos++;
    if (data[k + 1] <= 2) baixos++;
    const px = i % w;
    const py = Math.floor(i / w);
    sx += px;
    sy += py;
    caixa[0] = Math.min(caixa[0], px);
    caixa[1] = Math.min(caixa[1], py);
    caixa[2] = Math.max(caixa[2], px);
    caixa[3] = Math.max(caixa[3], py);
    n++;
  }
  return {
    n,
    G: somaG / n / exposicao,
    BG: somaB / somaG,
    RG: somaR / somaG,
    altos: altos / n,
    baixos: baixos / n,
    centroide: [sx / n, sy / n],
    caixa: [(caixa[0] + caixa[2] + 1) / 2, (caixa[1] + caixa[3] + 1) / 2],
  };
}

function diferencaNoContorno(a, b, mascara) {
  let max = 0;
  let soma = 0;
  let n = 0;
  for (let i = 0; i < mascara.length; i++) {
    if (!mascara[i]) continue;
    for (let c = 0; c < 3; c++) {
      const dlt = Math.abs(a[3 * i + c] - b[3 * i + c]);
      max = Math.max(max, dlt);
      soma += dlt;
    }
    n += 3;
  }
  return { max, media: soma / n };
}

const urlDoCorpo = (id) => `${APP}/?foco=${encodeURIComponent(id)}&${URL_FIXA}`;

async function capturarCorpo(alvo, porta) {
  const extra = {};
  const avaliar = async (send, fn, arg) => {
    const r = await send('Runtime.evaluate', {
      expression: `(${fn.toString()})(${JSON.stringify(arg)})`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) {
      throw new Error(`na página: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    }
    return r.result.value;
  };
  const foto = async (send) => Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64');
  const { png, via } = await capturarCDP({
    url: urlDoCorpo(alvo.id), largura: LARGURA, altura: ALTURA, dpr: 1, porta,
    aoAssentar: async ({ send }) => {
      extra.diag = await avaliar(send, prepararNaPagina, { id: alvo.id, raios: D_RAIOS });
      if (extra.diag?.erro) return null;
      extra.a = await foto(send);
      extra.sem = await avaliar(send, mascaraNaPagina, { id: alvo.id, fase: 'sem' });
      extra.fotoSem = await foto(send);
      extra.flash = await avaliar(send, mascaraNaPagina, { id: alvo.id, fase: 'flash' });
      extra.fotoFlash = await foto(send);
      extra.volta = await avaliar(send, mascaraNaPagina, { id: alvo.id, fase: 'volta' });
      return null;
    },
  });
  if (extra.diag?.erro) throw new Error(extra.diag.erro);
  const diag = extra.diag;
  const a = await rgb(extra.a);
  const sem = await rgb(extra.fotoSem);
  const flash = await rgb(extra.fotoFlash);
  const depois = await rgb(png);
  const avisos = [];
  let metodo = 'silhueta';
  let mascara = null;
  let tocaBorda = false;
  const porFlash = extra.flash.acesos > 0
    ? contornoPorFlash(flash.data, sem.data, a.w, a.h, diag.cx, diag.cy, diag.rPx)
    : null;
  const areaDaEsfera = Math.PI * diag.rPx * diag.rPx;
  if (porFlash) {
    const area = porFlash.mascara.reduce((s, v) => s + v, 0);
    if (area / areaDaEsfera > 0.3 && area / areaDaEsfera < 2.2) {
      mascara = porFlash.mascara;
      tocaBorda = porFlash.tocaBorda;
    } else avisos.push(`contorno pela foto branca rejeitado (área/esfera ${(area / areaDaEsfera).toFixed(2)})`);
  } else avisos.push(extra.flash.acesos ? 'nada mudou perto do centro na foto branca' : 'nenhuma malha opaca com a luz do Sol do shader');
  if (!mascara) {
    metodo = 'círculo';
    mascara = contornoCircular(a.w, a.h, diag.cx, diag.cy, diag.rPx);
    avisos.push('contorno APROXIMADO: círculo do raio equatorial');
  }
  if (tocaBorda) avisos.push('o corpo toca a borda da foto');
  const medida = medir(a, mascara, diag.exposicao);
  const desvioDoCentro = Math.hypot(medida.centroide[0] - diag.cx, medida.centroide[1] - diag.cy) / diag.rPx;
  if (Math.abs(diag.faseCena - 30) > 2) avisos.push(`fase ${diag.faseCena.toFixed(1)}° fora de 30 ± 2°`);
  if (diag.faseUniform !== null && Math.abs(diag.faseUniform - diag.faseCena) > 0.5) {
    avisos.push(`fase pelos uniforms ${diag.faseUniform.toFixed(1)}° ≠ cena`);
  }
  if (diag.eclipse > 0) avisos.push('eclipse ativo no shader (sombra de outro corpo)');
  if (!diag.pronto) avisos.push('a página não declarou pronto depois da preparação');
  if (via !== 'sinal') avisos.push(`assentou por ${via}`);
  if (medida.altos > 0.005) avisos.push(`${(medida.altos * 100).toFixed(1)} % dos pixels com G ≥ 250`);
  if (desvioDoCentro > 0.15) avisos.push(`centro do contorno a ${desvioDoCentro.toFixed(2)} R do centro projetado`);
  const repete = diferencaNoContorno(a.data, depois.data, mascara);
  if (repete.max > 2) avisos.push(`a foto não se repete depois da foto branca (Δmax ${repete.max})`);
  const area = medida.n / areaDaEsfera;
  // a máscara vai junto ao cache para a prancha de depuração
  const pngMascara = await sharp(Buffer.from(mascara.map((v) => v * 255)), {
    raw: { width: a.w, height: a.h, channels: 1 },
  }).png().toBuffer();
  return {
    numeros: {
      id: alvo.id,
      lei: LOMMEL_SEELIGER.has(alvo.id) ? 'LS' : 'L',
      ...medida,
      area,
      metodo,
      repete,
      diag,
      avisos,
      quando: new Date().toISOString(),
    },
    foto: extra.a,
    fotoSem: extra.fotoSem,
    fotoFlash: extra.fotoFlash,
    mascara: pngMascara,
  };
}

// ------------------------------------------------------------
// LOTE: trava, intervalo, orçamento, cache
// ------------------------------------------------------------
const marcaDoLote = join(CACHE, 'ultimo-lote.txt');

async function pegarTrava() {
  if (existsSync(marcaDoLote)) {
    const falta = 120000 - (Date.now() - Number(readFileSync(marcaDoLote, 'utf8')));
    if (falta > 0) {
      console.log(`esperando ${Math.ceil(falta / 1000)} s (≥ 2 min entre lotes)`);
      await dorme(falta);
    }
  }
  mkdirSync(dirname(TRAVA), { recursive: true });
  const teto = Date.now() + 15 * 60000;
  for (;;) {
    const outro = spawnSync('pgrep', ['-f', CHROME_HEADLESS], { encoding: 'utf8' }).stdout.trim();
    if (!outro) {
      try {
        mkdirSync(TRAVA);
        return;
      } catch (erro) {
        if (erro.code !== 'EEXIST') throw erro;
      }
    }
    if (Date.now() > teto) throw new Error('a trava do Chrome ficou ocupada por 15 min');
    console.log(outro ? 'Chrome headless de outra conversa vivo; esperando…' : 'trava ocupada; esperando…');
    await dorme(10000);
  }
}

function soltarTrava() {
  try {
    rmdirSync(TRAVA);
  } catch { /* já solta */ }
  writeFileSync(marcaDoLote, String(Date.now()));
}

const arquivoDoCache = (id, ext) => join(CACHE, `${id}.${ext}`);
const noCache = (id) => !tem('refazer') && existsSync(arquivoDoCache(id, 'json')) && existsSync(arquivoDoCache(id, 'png'));

async function lote(lista) {
  const pendentes = lista.filter((a) => !noCache(a.id));
  if (!pendentes.length) return 0;
  await pegarTrava();
  const soltar = () => {
    soltarTrava();
    process.exit(130);
  };
  process.once('SIGINT', soltar);
  process.once('SIGTERM', soltar);
  const inicio = Date.now();
  let porta = 9700 + (process.pid % 100);
  let feitos = 0;
  try {
    for (const alvo of pendentes) {
      if (Date.now() - inicio > MINUTOS * 60000) break;
      process.stdout.write(`${alvo.id}:\n`);
      try {
        const r = await capturarCorpo(alvo, porta++);
        writeFileSync(arquivoDoCache(alvo.id, 'png'), r.foto);
        writeFileSync(arquivoDoCache(alvo.id, 'mascara.png'), r.mascara);
        if (DEPURAR) {
          writeFileSync(arquivoDoCache(alvo.id, 'sem.png'), r.fotoSem);
          writeFileSync(arquivoDoCache(alvo.id, 'flash.png'), r.fotoFlash);
        }
        writeFileSync(arquivoDoCache(alvo.id, 'json'), JSON.stringify(r.numeros, null, 1));
        const n = r.numeros;
        process.stdout.write(
          `  G ${n.G.toFixed(4)} · B/G ${n.BG.toFixed(3)} · fase ${n.diag.faseCena.toFixed(2)}° · ` +
          `d ${n.diag.dCena.toFixed(3)} · ${n.metodo} · área/esfera ${n.area.toFixed(3)}` +
          `${n.avisos.length ? ` · ${n.avisos.join('; ')}` : ''}\n`
        );
        feitos++;
      } catch (erro) {
        process.stdout.write(`  FALHOU — ${erro.message}\n`);
      }
    }
  } finally {
    process.removeListener('SIGINT', soltar);
    process.removeListener('SIGTERM', soltar);
    soltarTrava();
  }
  return feitos;
}

// ------------------------------------------------------------
// A PRANCHA E OS NÚMEROS
// ------------------------------------------------------------
const f3 = (v) => (Number.isFinite(v) ? v.toFixed(3) : '—');
const f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : '—');
const pct = (v) => (Number.isFinite(v) ? `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v * 100))} %` : '—');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function linhas(lista) {
  const medidos = lista.map((alvo) => {
    const n = JSON.parse(readFileSync(arquivoDoCache(alvo.id, 'json'), 'utf8'));
    return { alvo, n, razao: n.G / alvo.g };
  });
  const razoes = medidos.filter((m) => m.alvo.id !== REFERENCIA).map((m) => m.razao).sort((x, y) => x - y);
  const meio = razoes.length / 2;
  const mediana = razoes.length % 2 ? razoes[Math.floor(meio)] : (razoes[meio - 1] + razoes[meio]) / 2;
  for (const m of medidos) m.desvio = m.alvo.id === REFERENCIA ? NaN : m.razao / mediana - 1;
  return { medidos, mediana, nMediana: razoes.length };
}

function nomeLivre(base) {
  for (let v = 1; ; v++) {
    const sufixo = v === 1 ? '' : `-v${v}`;
    const jpg = join(SAIDA, `${base}${sufixo}.jpg`);
    const md = join(SAIDA, `${base}${sufixo}.md`);
    if (!existsSync(jpg) && !existsSync(md)) return { jpg, md };
  }
}

async function lajota(m, tam) {
  const { diag } = m.n;
  // centrado na caixa do contorno (as esculpidas fogem do centro projetado), preso à foto
  const [bx, by] = m.n.caixa ?? [diag.cx, diag.cy];
  const x = Math.round(Math.min(Math.max(bx - LADO / 2, 0), diag.W - LADO));
  const y = Math.round(Math.min(Math.max(by - LADO / 2, 0), diag.H - LADO));
  const recorte = { left: x, top: y, width: LADO, height: LADO };
  const foto = await sharp(arquivoDoCache(m.alvo.id, 'png')).removeAlpha().extract(recorte).resize(tam, tam).toBuffer();
  if (!DEPURAR) return [foto];
  // o contorno medido, em vermelho, por cima da mesma foto
  const borda = await sharp(arquivoDoCache(m.alvo.id, 'mascara.png')).extract(recorte).resize(tam, tam)
    .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] })
    .threshold(40).toColourspace('b-w').raw().toBuffer();
  const vermelho = Buffer.alloc(tam * tam * 4);
  for (let i = 0; i < tam * tam; i++) {
    if (borda[i]) vermelho.set([255, 40, 40, 255], 4 * i);
  }
  const comBorda = await sharp(foto)
    .composite([{ input: vermelho, raw: { width: tam, height: tam, channels: 4 } }])
    .png().toBuffer();
  return [foto, comBorda];
}

function legenda(m, largura, altura) {
  const { alvo, n } = m;
  const ref = alvo.id === REFERENCIA;
  const cor = ref ? '#9ab' : Math.abs(m.desvio) > 0.5 ? '#ff8a6a' : Math.abs(m.desvio) > 0.2 ? '#ffd27a' : '#9fe0a0';
  const aviso = n.metodo !== 'silhueta' || Math.abs(n.diag.faseCena - 30) > 2 || n.diag.eclipse > 0 ? ' ⚠' : '';
  const ls = [
    [`${alvo.nome} · ${n.lei === 'LS' ? 'Lommel-Seeliger' : 'Lambert'}${aviso}`, '#fff', 15, 'bold'],
    [`alvo G ${f3(alvo.g)} · B/G ${f2(alvo.bg)}`, '#cfd6dd', 13, 'normal'],
    [`medido G ${f3(n.G)} · B/G ${f2(n.BG)}`, '#cfd6dd', 13, 'normal'],
    [`fase ${n.diag.faseCena.toFixed(1)}° · razão ${f2(m.razao)}`, '#cfd6dd', 13, 'normal'],
    [ref ? 'referência (fora da mediana)' : `desvio ${pct(m.desvio)}`, cor, 15, 'bold'],
  ];
  const texto = ls.map(([t, c, s, peso], i) =>
    `<text x="8" y="${18 + i * 17}" font-family="Helvetica, Arial, sans-serif" font-size="${s}" font-weight="${peso}" fill="${c}">${esc(t)}</text>`
  ).join('');
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}">` +
    `<rect width="100%" height="100%" fill="#0d1116"/>${texto}</svg>`
  );
}

async function prancha(lista, { medidos, mediana }, destino, exposicao) {
  const tam = 240;
  const porCorpo = DEPURAR ? 2 : 1;
  const larguraCela = tam * porCorpo;
  const alturaLegenda = 98;
  const vao = 6;
  const colunas = Math.min(lista.length, DEPURAR ? 4 : 8);
  const fileiras = Math.ceil(lista.length / colunas);
  const topo = 46;
  const W = colunas * (larguraCela + vao) + vao;
  const H = topo + fileiras * (tam + alturaLegenda + vao) + vao;
  const camadas = [];
  const titulo = `Retrato de família — ${ROTULO} · fase 30° · d = ${D_RAIOS} raios · exp ${EXP} (renderer ${exposicao.toFixed(4)}) · ` +
    `Neutral · luz assistida · mediana da razão ${mediana.toFixed(3)}`;
  camadas.push({
    input: Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${topo}">` +
      `<text x="${vao + 4}" y="29" font-family="Helvetica, Arial, sans-serif" font-size="19" font-weight="bold" fill="#fff">${esc(titulo)}</text></svg>`
    ),
    left: 0,
    top: 0,
  });
  for (let i = 0; i < medidos.length; i++) {
    const m = medidos[i];
    const x = vao + (i % colunas) * (larguraCela + vao);
    const y = topo + Math.floor(i / colunas) * (tam + alturaLegenda + vao);
    const fotos = await lajota(m, tam);
    fotos.forEach((input, k) => camadas.push({ input, left: x + k * tam, top: y }));
    camadas.push({ input: legenda(m, larguraCela, alturaLegenda), left: x, top: y + tam });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: '#05070a' } })
    .composite(camadas).jpeg({ quality: 90 }).toFile(destino);
}

function relatorio({ medidos, mediana, nMediana }, idaEVolta, nomeJpg) {
  const d0 = medidos[0].n.diag;
  const fases = medidos.map((m) => m.n.diag.faseCena);
  const pior = medidos.reduce((p, m) => (Math.abs(m.n.diag.faseCena - 30) > Math.abs(p.n.diag.faseCena - 30) ? m : p));
  const aprox = medidos.filter((m) => m.n.metodo !== 'silhueta').map((m) => m.alvo.nome);
  const nomesTom = { 0: 'nenhum', 1: 'Linear', 4: 'ACES', 6: 'AgX', 7: 'Neutral' };
  const expos = [...new Set(medidos.map((m) => m.n.diag.exposicao.toFixed(6)))];
  const L = [];
  L.push(`# Retrato de família — ${ROTULO}`, '');
  L.push(`${new Date().toISOString().slice(0, 10)} · app ${APP} · prancha \`${nomeJpg}\` · script \`scripts/visual/retrato-de-familia.mjs\``, '');
  L.push('## Como a foto foi tirada', '');
  L.push(`- Link de cada corpo: \`?foco=<id>&${URL_FIXA}\` (shot=2: só a cena, sem HUD, tempo parado).`);
  L.push(`- Tamanho aparente: câmera a d = ${D_RAIOS} raios equatoriais (o raio do rig), fov ${d0.fov}°, ${d0.W}×${d0.H} px, dpr 1; recorte de ${LADO} px por lajota, igual para todos.`);
  L.push('- Luz: `assistida` (ganho do globo 1, sem 1/d²).');
  L.push(`- Tom: ${nomesTom[d0.toneMapping] ?? d0.toneMapping} (Khronos PBR Neutral do three: início da compressão 0,76, dessaturação 0,15).`);
  L.push(`- Exposição: \`?exp=${EXP}\` (língua do ACES) para todos → \`renderer.toneMappingExposure\` = ${expos.join(', ')} (lido na página).`);
  L.push('- Desligado: bloom (`?nobloom=1`, o principal e o clarão do campo); o passe de filme inteiro na página (grão, vinheta 0,42, aberração cromática, elevação de negros 0,985·c + 0,012); lente `nenhuma`; camadas de marca (`noorbitas`, `nomarker`, `noicones`, `nonomes`).');
  L.push(`- Passes no obturador: ${d0.passes.join(', ')}.`);
  L.push('- Anéis: o anel de Saturno, os tênues e a lajota escondidos na página em todas as fotos (não há camada para eles). A SOMBRA do anel no globo de Saturno fica (é do shader do globo).');
  L.push('- Fase: na página, o rig perde o `pai` (as luas saem de `direcaoDaLua` e passam à lei de repouso dos planetas: 30° fora do eixo do Sol, do lado do Sol) e o polo do rig vira a componente do polo perpendicular ao eixo do Sol (sem grampo polar). A fase medida vem das posições de câmera, corpo e Sol na cena; a dos uniforms do shader confere.');
  L.push(`- Fase real: de ${Math.min(...fases).toFixed(2)}° a ${Math.max(...fases).toFixed(2)}°; a pior é ${pior.alvo.nome} (${pior.n.diag.faseCena.toFixed(2)}°).`);
  L.push(`- Contorno (o mesmo método para todos, coluna "contorno" = silhueta): duas fotos extras do mesmo carregamento, uma com o corpo escondido e outra com a superfície pintada de branco pelo próprio shader (cor fixa no fim do fragment; o vertex, com relevo e forma, fica); contorno = onde diferem (|ΔR|+|ΔG|+|ΔB| > ${LIMIAR_DA_MASCARA}), a maior componente a menos de um raio do centro projetado, buracos preenchidos. É a silhueta desenhada de verdade (esculpidas, relevo por mapa de altura, elipsoides, e também onde o mapa é preto). Entram só as malhas opacas com a luz do Sol do shader: plumas e cascas transparentes ficam fora (os pixels delas POR CIMA do disco entram na medida). Contorno aproximado (círculo do raio equatorial): ${aprox.length ? aprox.join(', ') : 'nenhum'}.`);
  L.push(`- Medida: sRGB decodificado → Neutral invertido (conta fechada; ida e volta conferida em ${idaEVolta.n} cores: |Δy| ≤ ${idaEVolta.piorY.toExponential(1)}, |Δc|/c ≤ ${idaEVolta.piorC.toExponential(1)}) → ÷ exposição do renderer. G = média do G linear em TODO pixel do contorno (aceso e apagado); B/G = ΣB/ΣG.`);
  L.push(`- Razão = G medido ÷ G alvo; desvio = razão ÷ mediana − 1. **Mediana da razão = ${mediana.toFixed(4)}** (${nMediana} corpos, sem a Terra).`);
  L.push('- Alvos: §3 de `capturas/regua-r2/estudo-da-regra.md` (tabela no topo do script). Lei: LS = Lommel-Seeliger, L = Lambert.', '');
  L.push('## Números', '');
  L.push('| corpo | lei | G alvo p0 | B/G alvo | G medido | B/G medido | fase | razão | desvio |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const m of medidos) {
    L.push(`| ${m.alvo.nome} | ${m.n.lei} | ${f3(m.alvo.g)} | ${f2(m.alvo.bg)} | ${m.n.G.toFixed(4)} | ${m.n.BG.toFixed(3)} | ` +
      `${m.n.diag.faseCena.toFixed(2)}° | ${m.razao.toFixed(3)} | ${m.alvo.id === REFERENCIA ? 'referência' : pct(m.desvio)} |`);
  }
  L.push('', '## Diagnóstico', '');
  L.push('| corpo | fase (uniforms) | d (cena) | R/G medido | px no contorno | área ÷ esfera | G ≥ 250 | G ≤ 2 | contorno | repete (Δmax) | avisos |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const m of medidos) {
    const n = m.n;
    L.push(`| ${m.alvo.nome} | ${n.diag.faseUniform === null ? '—' : `${n.diag.faseUniform.toFixed(2)}°`} | ${n.diag.dCena.toFixed(3)} | ` +
      `${n.RG.toFixed(3)} | ${n.n} | ${n.area.toFixed(3)} | ${(n.altos * 100).toFixed(2)} % | ${(n.baixos * 100).toFixed(1)} % | ` +
      `${n.metodo} | ${n.repete.max} | ${n.avisos.join('; ') || '—'} |`);
  }
  L.push('', '"área ÷ esfera" = pixels do contorno ÷ área do disco de uma esfera do raio equatorial à mesma distância: < 1 nos corpos achatados, de forma própria ou com raio do rig maior que a média; > 1 onde há halo aceso pela luz do shader. "repete" = maior diferença (0–255) dentro do contorno entre a foto medida e a foto tirada depois de desfazer a foto branca.');
  return `${L.join('\n')}\n`;
}

// ------------------------------------------------------------
async function main() {
  const idaEVolta = conferirIdaEVolta();
  const lista = SO.length ? ALVOS.filter((a) => SO.includes(a.id)) : ALVOS;
  if (SO.length && lista.length !== SO.length) throw new Error(`id desconhecido em --so: ${SO.join(',')}`);
  mkdirSync(CACHE, { recursive: true });
  console.log(`retrato "${ROTULO}" · ${lista.length} corpos · app ${APP} · cache ${CACHE}`);
  await lote(lista);
  const faltam = lista.filter((a) => !existsSync(arquivoDoCache(a.id, 'json')));
  if (faltam.length) {
    console.log(`faltam ${faltam.length}: ${faltam.map((a) => a.id).join(', ')} — rode de novo (o cache guarda os feitos)`);
    return;
  }
  const tabela = linhas(lista);
  mkdirSync(SAIDA, { recursive: true });
  const { jpg, md } = nomeLivre(`retrato-${ROTULO}`);
  const exposicao = tabela.medidos[0].n.diag.exposicao;
  await prancha(lista, tabela, jpg, exposicao);
  writeFileSync(md, relatorio(tabela, idaEVolta, jpg.split('/').pop()));
  console.log(`prancha: ${jpg}\nnúmeros: ${md}\nmediana da razão ${tabela.mediana.toFixed(4)}`);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
