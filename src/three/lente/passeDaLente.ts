// ============================================================
// O PASSE DA LENTE — os reflexos da lente de cinema escolhida (Ajustes ·
// Lente), acesos pelo Sol, no HDR do quadro.
//
// Onde: no `Post`, logo depois do `ClaraoDoCampo` e antes do knee/ACES —
// depois do bloom, para reflexo não florescer. Soma no readBuffer como o
// clarão (needsSwap falso). Com `nenhuma` o passe fica `enabled = false` e a
// cadeia é a de sempre, byte a byte.
//
// O quê: os ELEMENTOS desenhados de `presets.ts`, cada tipo com a mesma
// conta do renderizador de referência do look development aprovado em
// 08/10/2026 (capturas/lente/look/ferramentas/render.mjs). Coordenadas em
// frações da ALTURA do quadro, origem no centro, v para cima; L = o Sol.
//
// Como, por quadro:
//   1. MACIOS (fantasma, anel) num alvo HDR de MEIA resolução, cada um num
//      quad do tamanho da sua caixa; o alvo entra no quadro por upsample
//      bilinear.
//   2. A LUZ DA SUJEIRA: o reflexo inteiro de novo num alvo de 128 linhas
//      (linha fina alargada até 1 px dele, energia conservada), borrado por
//      uma gaussiana separável de σ = borrao·altura.
//   3. NO QUADRO, em resolução cheia, um quad de tela soma o alvo macio, a
//      sujeira (textura assada) × a luz borrada e os FINOS (brilho, raios,
//      risco), calculados ali mesmo.
// Texturas procedurais (poeira dos fantasmas, sujeira) e a tabela dos raios
// são assadas uma vez por receita, na CPU, com o MESMO hash do renderizador
// de referência — nada de sin-hash na GPU, que difere de placa para placa.
//
// REGRA DO DISCO: nada da lente cobre o disco resolvido do Sol — brilho, raios,
// risco, fantasmas, anéis e sujeira (máscara 0 dentro, subindo em ~5 px no
// limbo; entre 1 e 3 px de raio o disco entra em rampa); o lóbulo justo do brilho
// cai como s1/(s1+R) e os raios como k/(k+R). O clarão do Sol fica como é.
//
// OS RAIOS SÃO DO SOL-PONTO: a força deles é a soltura do clarão (`solturaDoClarao`,
// estrela.ts) — plenos com o disco ≤ 2 px, zero com ≥ 10 px; com o Sol resolvido os
// efeitos do próprio Sol 3D são os donos. E A LUZ INTEIRA DA LENTE atravessa o ar da
// Terra como o disco: × a transmitância do Sol visto (`transmitanciaDoSolVisto`,
// lib/atlas/arMedido.ts), (1, 1, 1) exato longe da Terra.
// ============================================================

import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { ganhoDoGlobo } from '../../lib/atlas/luzDaVisita';
import type { PoliticaDeLuz } from '../../lib/atlas/luz';
import { FORCA_DA_LENTE, porCurva, type ModoDaLente } from '../core/engine';
import { RAIO_DO_SOL_NA_CENA } from '../escala';
import {
  presetDaLente,
  type Anel,
  type Brilho,
  type Elemento,
  type Fantasma,
  type NomeDoPreset,
  type Preset,
  type Raios,
  type Risco,
  type Sujeira,
} from './presets';

/**
 * G — o brilho do Sol na entrada da lente, o MESMO para todas as lentes
 * (mesmo Sol, mesmo sensor). Na luz assistida perto da Terra a amplitude
 * vale G; os elementos foram desenhados para amplitude 1 ali, então o passe
 * usa amplitude/G (× o fator de cada receita, abaixo).
 */
export const G_DA_LENTE = 65;

/** Até aqui (UA) a lente vê o Sol como na Terra; além, ele vira estrela: (50/d)². */
export const UA_DO_FIM_DA_LENTE = 50;

/**
 * O FATOR DE CADA RECEITA: o look development somou o reflexo DEPOIS do
 * ACES (Narkowicz) em modo tela sobre a foto do app; aqui ele entra no HDR
 * antes do ACES do OutputPass (three.js, exposição/0,6, com as matrizes de
 * cor). Um número por receita, medido contra as pranchas aprovadas (P1,
 * P2, P3 e perto do Sol, 1600×900): com 1 o reflexo do app somava 0,93
 * (redonda), 0,94 (anamórfica) e 0,875 (hollywood) do look development em
 * valor de tela, fora do disco; com estes, ≈ 1. O ACES do three.js puxa um
 * pouco para o azul — isso nenhum fator único corrige.
 *
 * [no ACES, nas outras curvas] (`porCurva`, R1b da régua única): o segundo
 * número foi medido no tom neutro contra o primeiro no ACES — o L* que o
 * reflexo soma, perto do Sol e nos fantasmas, nas cenas P1, P2, P3, perto do
 * Sol e o Sol atrás da Terra (capturas/regua-r1/r1b-lente/). O neutro não
 * esmaga o pé das cores como o ACES: com o mesmo fator, os fantasmas sobre
 * céu preto saíam 20–50 % mais claros. A cor mais viva que ele guarda nos
 * fantasmas, nenhum fator corrige.
 */
const FATOR_DA_RECEITA: Record<NomeDoPreset, readonly [number, number]> = {
  redonda: [1.1, 0.92],
  anamorfica: [1.1, 1.06],
  hollywood: [1.2, 0.94],
};

/**
 * O LIMIAR DE DESENHO, em HDR na exposição 1 (divide-se pela exposição do
 * quadro). Quando o pico do reflexo inteiro — a soma dos picos dos
 * elementos, um teto do que um pixel soma — fica abaixo disto, ele somaria
 * menos de 0,003 de valor de tela num céu preto, e o passe não desenha.
 * [no ACES, nas outras curvas] (`porCurva`). Tela 0,003 = linear 2,32e-4.
 * ACES do OutputPass (three.js): x·exposição/0,6 → RRTAndODTFit → sRGB, com
 * cinza; a curva alcança 2,32e-4 em v = 4,955e-3; x = v·0,6 = 2,973e-3.
 * Neutral da Khronos: abaixo do ombro ele tira de cada canal o desconto do
 * menor (≥ 0) e não comprime, então nenhum canal passa de x·exposição, de
 * qualquer cor — x = 2,32e-4 (o cinza daria 6,09e-3, mas uma cor viva
 * atravessa o pé em linha reta e saltaria à vista no corte).
 */
const LIMIAR_NA_EXPOSICAO_1: readonly [number, number] = [2.973e-3, 2.322e-4];

/**
 * A LEI DA INTENSIDADE, num lugar só:
 *   amplitude = G × visibilidade × ganhoDoGlobo(d, política, roteiro) × fadeLonge(d)
 * Na luz assistida o globo vale 1 (a câmera está exposta para o mundo que
 * visita, então o reflexo lê igual na Terra e em Saturno); na luz real vale
 * E(d). `fadeLonge` = 1 até 50 UA e (50/d)² além. Sempre finita e ≥ 0.
 */
export function amplitudeDaLente(
  dUA: number,
  politica: PoliticaDeLuz,
  roteiro: number,
  visibilidade: number
): number {
  const fadeLonge = dUA > UA_DO_FIM_DA_LENTE ? (UA_DO_FIM_DA_LENTE / dUA) ** 2 : 1;
  const vis = Math.min(1, Math.max(0, Number.isFinite(visibilidade) ? visibilidade : 0));
  const a = G_DA_LENTE * vis * ganhoDoGlobo(dUA, politica, roteiro) * fadeLonge;
  return Number.isFinite(a) && a > 0 ? a : 0;
}

/**
 * A FORÇA DA LENTE (Ajustes · Lente), de % para o multiplicador ÚNICO do
 * reflexo: ele entra em `g`, que acende brilho, raios, risco, fantasmas e
 * anel e, pela luz borrada, a sujeira — o estilo inteiro anda junto, na
 * mesma proporção, sem mexer em tamanho, cor nem posição. 100 % é ×1 exato
 * (a lente aprovada, bit a bit); fora da faixa da barra, preso a ela; não
 * finito, ×1.
 */
export function multiplicadorDaForca(forca: number): number {
  if (!Number.isFinite(forca)) return 1;
  return Math.min(FORCA_DA_LENTE.maxima, Math.max(FORCA_DA_LENTE.minima, forca)) / 100;
}

/** Ladrilho da poeira de cada fantasma: lado em texels, e o alcance em a/tamanho (≥ croma máximo 1,12). */
const LADO_DO_LADRILHO = 128;
const COLUNAS_DE_LADRILHOS = 4;
const ALCANCE_DA_POEIRA = 1.15;
/** A sujeira cobre u ∈ [−1, 1] (quadros até 2:1) e v ∈ [−0,5; 0,5]; além, espelha. */
const SUJEIRA_U_MAX = 1;
const SUJEIRA_LARGURA = 1024;
const SUJEIRA_ALTURA = 512;
/** Linhas do alvo da luz da sujeira (a largura segue o aspecto). */
const LINHAS_DA_LUZ = 128;
export const MAX_RAIOS = 64;
/** A linha fina mais estreita no quadro, em px: abaixo disto ela some entre os pixels. */
export const LARGURA_MINIMA_PX = 0.7;

// ---------- o hash e o ruído do renderizador de referência, na CPU ----------
const fract = (x: number) => x - Math.floor(x);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hash1 = (x: number) => fract(Math.sin(x * 127.1 + 11.3) * 43758.5453);
/** A variação de UM raio da receita (desvio do ângulo em setores, comprimento e brilho
 *  relativos): a mesma tabela para o Sol e para as estrelas que seguem a lente. */
export const variacaoDoRaio = (r: Raios, k: number): [number, number, number] => [
  r.jitterAngulo * (hash1(k + r.semente) - 0.5),
  1 - r.jitterComprimento * hash1(k + 17.3 + r.semente),
  1 - r.jitterBrilho * hash1(k + 41.9 + r.semente),
];
const hash2 = (x: number, y: number) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
function ruido(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return mix(mix(a, b, sx), mix(c, d, sx), sy);
}
const fbm = (x: number, y: number) =>
  (0.5 * ruido(x, y) + 0.25 * ruido(2.03 * x + 5.2, 2.03 * y + 1.3) + 0.125 * ruido(4.01 * x + 9.7, 4.01 * y + 3.1)) /
  0.875;

const texturaR8 = (dados: Uint8Array, largura: number, altura: number) => {
  const t = new THREE.DataTexture(dados, largura, altura, THREE.RedFormat, THREE.UnsignedByteType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
};

/** A poeira de cada fantasma, fbm((a/tam)·3 + semente, (a/tam)·3 − semente), um ladrilho por fantasma. */
function assarPoeira(fantasmas: readonly Fantasma[]) {
  const T = LADO_DO_LADRILHO;
  const linhas = Math.max(1, Math.ceil(fantasmas.length / COLUNAS_DE_LADRILHOS));
  const largura = COLUNAS_DE_LADRILHOS * T;
  const dados = new Uint8Array(largura * linhas * T);
  fantasmas.forEach((f, n) => {
    const x0 = (n % COLUNAS_DE_LADRILHOS) * T;
    const y0 = Math.floor(n / COLUNAS_DE_LADRILHOS) * T;
    for (let j = 0; j < T; j++) {
      const sy = -ALCANCE_DA_POEIRA + (2 * ALCANCE_DA_POEIRA * j) / (T - 1);
      for (let i = 0; i < T; i++) {
        const sx = -ALCANCE_DA_POEIRA + (2 * ALCANCE_DA_POEIRA * i) / (T - 1);
        const v = fbm(sx * 3 + f.semente, sy * 3 - f.semente);
        dados[(y0 + j) * largura + x0 + i] = Math.round(255 * Math.min(1, Math.max(0, v)));
      }
    }
  });
  return texturaR8(dados, largura, linhas * T);
}

/** A sujeira em espaço de tela (t/2 em 8 bits): manchas de fbm, pó em bokeh por célula e arcos de limpeza. */
function assarSujeira(e: Sujeira) {
  const W = SUJEIRA_LARGURA;
  const H = SUJEIRA_ALTURA;
  const t = new Float32Array(W * H);
  const uDe = (i: number) => -SUJEIRA_U_MAX + ((i + 0.5) * 2 * SUJEIRA_U_MAX) / W;
  const vDe = (j: number) => -0.5 + (j + 0.5) / H;
  const iDe = (u: number) => ((u + SUJEIRA_U_MAX) * W) / (2 * SUJEIRA_U_MAX) - 0.5;
  const jDe = (v: number) => (v + 0.5) * H - 0.5;
  const s = e.semente;
  // manchas: o fbm é macio, então sai numa grade 4× mais rala e interpolado
  if (e.manchas > 0) {
    const wc = W / 4 + 1;
    const hc = H / 4 + 1;
    const grade = new Float32Array(wc * hc);
    for (let j = 0; j < hc; j++) {
      for (let i = 0; i < wc; i++) {
        const u = -SUJEIRA_U_MAX + (i * 2 * SUJEIRA_U_MAX) / (wc - 1);
        const v = -0.5 + j / (hc - 1);
        grade[j * wc + i] = fbm(u * 3.1 + s, v * 3.1 - s);
      }
    }
    for (let j = 0; j < H; j++) {
      const fy = ((vDe(j) + 0.5) * (hc - 1));
      const y0 = Math.min(hc - 2, Math.floor(fy));
      const ty = fy - y0;
      for (let i = 0; i < W; i++) {
        const fx = ((uDe(i) + SUJEIRA_U_MAX) * (wc - 1)) / (2 * SUJEIRA_U_MAX);
        const x0 = Math.min(wc - 2, Math.floor(fx));
        const tx = fx - x0;
        const a = mix(grade[y0 * wc + x0], grade[y0 * wc + x0 + 1], tx);
        const b = mix(grade[(y0 + 1) * wc + x0], grade[(y0 + 1) * wc + x0 + 1], tx);
        t[j * W + i] += e.manchas * suave(0.5, 0.85, mix(a, b, ty));
      }
    }
  }
  // pó: no máximo um disco por célula, recortado pela própria célula
  for (const [cel, prob, rmin, rmax, amp] of e.camadasDePo) {
    for (let iy = Math.floor(-0.5 / cel); iy <= Math.floor(0.5 / cel); iy++) {
      for (let ix = Math.floor(-SUJEIRA_U_MAX / cel); ix <= Math.floor(SUJEIRA_U_MAX / cel); ix++) {
        if (hash2(ix + s, iy) >= prob) continue;
        const h1 = hash2(ix, iy + s);
        const h2 = hash2(ix + 3.7, iy - s);
        const h3 = hash2(ix - 7.1, iy + 2.9);
        const ccx = (ix + 0.25 + 0.5 * h1) * cel;
        const ccy = (iy + 0.25 + 0.5 * h2) * cel;
        const rr = mix(rmin, rmax, h3) * cel;
        const a = amp * (0.4 + 0.6 * h1);
        const i0 = Math.max(0, Math.floor(iDe(ccx - rr)));
        const i1 = Math.min(W - 1, Math.ceil(iDe(ccx + rr)));
        const j0 = Math.max(0, Math.floor(jDe(ccy - rr)));
        const j1 = Math.min(H - 1, Math.ceil(jDe(ccy + rr)));
        for (let j = j0; j <= j1; j++) {
          const v = vDe(j);
          if (Math.floor(v / cel) !== iy) continue;
          for (let i = i0; i <= i1; i++) {
            const u = uDe(i);
            if (Math.floor(u / cel) !== ix) continue;
            const d = Math.hypot(u - ccx, v - ccy) / rr;
            if (d >= 1) continue;
            t[j * W + i] += a * (1 - suave(0.75, 1, d)) * (0.55 + 0.45 * suave(0.45, 0.95, d));
          }
        }
      }
    }
  }
  // arcos de limpeza: anel gaussiano fino aceso de um lado; só a faixa |d − R| < 4σ é percorrida
  const SIGMA_ARCO = 0.0025;
  const faixa = 4 * SIGMA_ARCO;
  for (let k = 0; k < e.arcos; k++) {
    const cx = (hash1(k + s) - 0.5) * 1.8;
    const cy = (hash1(k + 5.5 + s) - 0.5) * 1.0;
    const R = 0.15 + 0.35 * hash1(k + 9.1 + s);
    const a0 = hash1(k + 13.7 + s) * 6.283;
    const ca = Math.cos(a0);
    const sa = Math.sin(a0);
    const j0 = Math.max(0, Math.floor(jDe(cy - R - faixa)));
    const j1 = Math.min(H - 1, Math.ceil(jDe(cy + R + faixa)));
    for (let j = j0; j <= j1; j++) {
      const qy = vDe(j) - cy;
      const fora = (R + faixa) ** 2 - qy * qy;
      if (fora <= 0) continue;
      const dentro = Math.sqrt(Math.max(0, (R - faixa) ** 2 - qy * qy));
      const ext = Math.sqrt(fora);
      for (const [lo, hi] of [[-ext, -dentro], [dentro, ext]]) {
        const i0 = Math.max(0, Math.floor(iDe(cx + lo)));
        const i1 = Math.min(W - 1, Math.ceil(iDe(cx + hi)));
        for (let i = i0; i <= i1; i++) {
          const qx = uDe(i) - cx;
          const d = Math.hypot(qx, qy);
          if (Math.abs(d - R) >= faixa || d <= 0) continue;
          const ang = (qx * ca + qy * sa) / d;
          t[j * W + i] += e.intArcos * Math.exp(-(((d - R) / SIGMA_ARCO) ** 2)) * suave(0.3, 0.95, ang);
        }
      }
    }
  }
  const dados = new Uint8Array(W * H);
  for (let k = 0; k < W * H; k++) dados[k] = Math.round(255 * Math.min(1, Math.max(0, t[k] / 2)));
  const tex = texturaR8(dados, W, H);
  tex.wrapS = THREE.MirroredRepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

// ---------- shaders ----------
const NOQUADRO = /* glsl */ `gl_Position = vec4(vQ.x * 2.0 / uAspecto, vQ.y * 2.0, 0.0, 1.0);`;

const VERTICE_FANTASMA = /* glsl */ `
  in vec4 aForma;  // p, tamanho, aspecto, rotacao
  in vec4 aIris;   // laminas, redondeza, poeira, ladrilho
  in vec4 aPerfil; // miolo, larguraBorda, suaveFora, suaveDentro
  in vec3 aCroma;
  in vec3 aCor;    // cor × intensidade
  in vec4 aCorte;  // p, raio (× tamanho), suave, ativo
  uniform vec2 uL;
  uniform float uKTam;
  uniform float uAspecto;
  out vec2 vQ;
  flat out vec4 vForma; flat out vec4 vIris; flat out vec4 vPerfil;
  flat out vec3 vCroma; flat out vec3 vCor; flat out vec4 vCorte;
  void main() {
    vForma = aForma; vIris = aIris; vPerfil = aPerfil; vCroma = aCroma; vCor = aCor; vCorte = aCorte;
    float caixa = aForma.y * uKTam * max(max(aCroma.x, aCroma.y), aCroma.z) * max(1.0, aForma.z) * 1.05;
    vQ = aForma.x * uL + (position.xy * 2.0 - 1.0) * caixa;
    ${NOQUADRO}
  }
`;

const FRAGMENTO_FANTASMA = /* glsl */ `
  precision highp float;
  uniform vec2 uL;
  uniform float uKTam;
  uniform float uG;
  uniform sampler2D tPoeira;
  uniform vec2 uLadrilhos; // colunas, linhas
  in vec2 vQ;
  flat in vec4 vForma; flat in vec4 vIris; flat in vec4 vPerfil;
  flat in vec3 vCroma; flat in vec3 vCor; flat in vec4 vCorte;
  layout(location = 0) out highp vec4 saida;
  const float PI = 3.141592653589793;
  const float ALCANCE = ${ALCANCE_DA_POEIRA.toFixed(4)};
  const float LADO = ${LADO_DO_LADRILHO.toFixed(1)};

  // polígono de n lâminas arredondado (n < 3 = círculo); 1 = borda quando |q| = tamanho
  float raioDaForma(vec2 q) {
    float r = length(q);
    float n = vIris.x;
    if (n < 3.0 || r < 1e-12) return r;
    float setor = 2.0 * PI / n;
    float th = atan(q.y, q.x);
    float psi = th - setor * floor(th / setor) - 0.5 * setor;
    return mix(r * cos(psi) / cos(PI / n), r, vIris.y);
  }
  // perfil rosca (Nuke Flare): borda 1, miolo, largura da borda, suavidades
  float perfilRosca(float rho) {
    if (rho > 1.0001) return 0.0;
    float fora = 1.0 - smoothstep(1.0 - vPerfil.z, 1.0 + 1e-4, rho);
    float borda = smoothstep(1.0 - vPerfil.y - max(vPerfil.w, 1e-3), 1.0 - vPerfil.y, rho);
    return fora * mix(vPerfil.x, 1.0, borda);
  }
  float poeira(vec2 s) {
    vec2 t = clamp(s / (2.0 * ALCANCE) + 0.5, 0.0, 1.0);
    vec2 cel = vec2(mod(vIris.w, uLadrilhos.x), floor((vIris.w + 0.5) / uLadrilhos.x));
    return texture(tPoeira, (cel * LADO + 0.5 + t * (LADO - 1.0)) / (uLadrilhos * LADO)).r;
  }
  void main() {
    float tam = max(vForma.y * uKTam, 1e-6);
    vec2 q = vec2((vQ.x - vForma.x * uL.x) / max(vForma.z, 1e-4), vQ.y - vForma.x * uL.y);
    float cr = cos(-vForma.w);
    float sr = sin(-vForma.w);
    vec2 a = vec2(q.x * cr - q.y * sr, q.x * sr + q.y * cr);
    float rho0 = raioDaForma(a);
    float k = uG * (1.0 + vIris.z * (poeira(a / tam) - 0.5) * 2.0);
    if (vCorte.w > 0.5) {
      float cR = max(vCorte.y * tam, 1e-6);
      k *= 1.0 - smoothstep(cR * (1.0 - max(vCorte.z, 1e-3)), cR, length(vQ - vCorte.x * uL));
    }
    vec3 rho = rho0 / (tam * vCroma);
    vec3 perfil = vec3(perfilRosca(rho.r), perfilRosca(rho.g), perfilRosca(rho.b));
    saida = vec4(clamp(max(k, 0.0) * perfil * vCor, 0.0, 1.0e3), 1.0);
  }
`;

const VERTICE_ANEL = /* glsl */ `
  uniform vec2 uL;
  uniform float uAspecto;
  uniform vec4 uAnel; // p, raio, espessura, no centro do quadro (1)
  out vec2 vQ;
  void main() {
    vec2 c = uAnel.w > 0.5 ? vec2(0.0) : uAnel.x * uL;
    vQ = c + (position.xy * 2.0 - 1.0) * (uAnel.y + 3.0 * uAnel.z);
    ${NOQUADRO}
  }
`;

const FRAGMENTO_ANEL = /* glsl */ `
  precision highp float;
  uniform vec2 uL;
  uniform float uG;
  uniform vec4 uAnel;
  uniform vec2 uAnelArco; // expoente, saturacao
  uniform vec3 uAnelCor;  // cor × intensidade
  in vec2 vQ;
  layout(location = 0) out highp vec4 saida;
  float g2(float x) { return exp(-x * x); }
  void main() {
    vec2 c = uAnel.w > 0.5 ? vec2(0.0) : uAnel.x * uL;
    vec2 l = uL - c;
    float ll = max(length(l), 1e-4);
    float temLuz = smoothstep(0.0, 0.05, length(l));
    vec2 q = vQ - c;
    float d = max(length(q), 1e-4);
    float t = (d - uAnel.y) / max(uAnel.z, 1e-6);
    if (abs(t) > 3.0) {
      saida = vec4(0.0);
      return;
    }
    float faixa = exp(-t * t * 1.5);
    // 0 = lado de dentro (violeta), 1 = de fora (vermelho)
    float s = clamp((t + 1.0) * 0.5, 0.0, 1.0);
    vec3 arco = vec3(g2((s - 0.8) / 0.2), g2((s - 0.5) / 0.18), g2((s - 0.2) / 0.2));
    float cosA = dot(q, l) / (d * ll);
    float m = mix(1.0, pow(max((1.0 + cosA) * 0.5, 0.0), uAnelArco.x), temLuz);
    saida = vec4(clamp(uG * faixa * m * mix(vec3(1.0), arco, uAnelArco.y) * uAnelCor, 0.0, 1.0e3), 1.0);
  }
`;

const VERTICE_TELA = /* glsl */ `
  out vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/** Os finos (brilho, raios, risco) e, no quadro, a soma do alvo macio e da sujeira. Com LUZ: só os finos, alargados. */
const FRAGMENTO_FINOS = /* glsl */ `
  precision highp float;
  uniform vec2 uL;
  uniform float uKTam;
  uniform float uG;
  uniform float uRaioDisco;
  uniform float uAlfaDisco;     // o raio angular do Sol, rad
  uniform float uForcaDisco;    // a rampa do disco: 0 até 1 px de raio, 1 a partir de 3 px
  uniform vec2 uTanPorUnidade;  // tan do ângulo por unidade de uv (frações da altura), em x e y
  uniform float uAspecto;
  uniform float uInvAltura;
  uniform float uLarguraMinima;
  uniform bool uTemBrilho;
  uniform vec4 uBrilho; // int1, raio1, int2, raio2
  uniform vec3 uBrilhoCor1;
  uniform vec3 uBrilhoCor2;
  uniform float uBrilhoEsticar;
  uniform bool uTemRaios;
  uniform vec4 uRaiosForma; // numero, comprimento, largura, alargar
  uniform vec4 uRaiosLuz;   // queda, intensidade, atenuacaoDisco, rotacao
  uniform vec3 uRaiosCroma;
  uniform vec3 uRaiosCor;
  // por raio: jitterAngulo·(h1 − 0,5), 1 − jitterComprimento·h2, 1 − jitterBrilho·h3
  uniform vec3 uRaiosTabela[${MAX_RAIOS}];
  uniform float uSolturaDosRaios; // a soltura do clarão do Sol: 1 ponto, 0 resolvido
  uniform bool uTemRisco;
  uniform vec4 uRiscoForma; // comprimento, queda, larguraNucleo, larguraAsas
  uniform vec3 uRiscoInt;   // nucleo, asas, paralelas
  uniform vec3 uRiscoParalelas; // desvio 1, desvio 2, quantas
  uniform vec3 uRiscoCorPerto;
  uniform vec3 uRiscoCorLonge;
#ifndef LUZ
  uniform float uBorda; // o gatilho de borda sozinho, sem a amplitude (que já vem em tLuz)
  uniform sampler2D tMacio;
  uniform sampler2D tLuz;
  uniform sampler2D tSujeira;
  uniform bool uTemSujeira;
  uniform vec3 uSujeiraCor; // cor × intensidade
  uniform vec3 uTransmitancia; // a luz do Sol através do ar da Terra, por canal
#endif
  in vec2 vUv;
  layout(location = 0) out highp vec4 saida;
  const float PI = 3.141592653589793;
  float g2(float x) { return exp(-x * x); }

  // o disco é um disco no CÉU: fora do eixo ele vira na tela uma elipse até ~2× mais longa rumo ao
  // centro do quadro, então o teste é o ângulo entre o raio do pixel e o do centro do Sol; a faixa
  // macia (−1 a +4 px) usa o tamanho angular do pixel ali, na direção que atravessa o limbo
  float mascaraDisco(vec2 uv) {
    if (uForcaDisco <= 0.0) return 1.0;
    vec3 p = vec3(uv * uTanPorUnidade, -1.0);
    float lp = length(p);
    vec3 n = p / lp;
    vec3 s = normalize(vec3(uL * uTanPorUnidade, -1.0));
    // o ângulo pela corda: 1 − cos perderia os dígitos de um disco pequeno
    float th = 2.0 * asin(min(1.0, 0.5 * length(n - s)));
    vec3 t = (n * cos(th) - s) / max(sin(th), 1e-6);
    float px = max(uInvAltura * length(t.xy * uTanPorUnidade) / lp, 1e-9);
    return mix(1.0, smoothstep(-1.0, 4.0, (th - uAlfaDisco) / px), uForcaDisco);
  }

  vec3 brilho(vec2 dv, float d, float limpo) {
    float s1 = max(uBrilho.y * uKTam, 1e-6);
    float s2 = max(uBrilho.w * uKTam, 1e-6);
    float esticar = max(uBrilhoEsticar, 1e-3);
    float alc = min(2.5, uRaioDisco + s2 * 12.0);
    if (abs(dv.x) > alc * esticar || abs(dv.y) > alc) return vec3(0.0);
    // disco resolvido: o lóbulo justo cai com o tamanho do disco, senão vira um anel branco no limbo
    float nucleo = uBrilho.x * s1 / (s1 + uRaioDisco);
    float dd = max(d, 1e-6);
    // distância a partir do LIMBO, esticada na horizontal só no trecho além do disco
    float r = max(0.0, d - uRaioDisco) * length(vec2(dv.x / dd / esticar, dv.y / dd));
    float a = nucleo * g2(r / s1);
    float b = uBrilho.z / (1.0 + (r / s2) * (r / s2));
    // o lóbulo largo chega a zero antes do recorte retangular, que na luz real aparecia como uma reta
    float fim = 1.0 - smoothstep(0.6 * alc, alc, length(vec2(dv.x / esticar, dv.y)));
    return uG * limpo * fim * (a * uBrilhoCor1 + b * uBrilhoCor2);
  }

  vec3 raios(vec2 dv, float d, float limpo) {
    float n = uRaiosForma.x;
    float comp = uRaiosForma.y * uKTam;
    float cMax = max(max(uRaiosCroma.r, uRaiosCroma.g), uRaiosCroma.b);
    if (d >= uRaioDisco + comp * cMax || d < 1e-7) return vec3(0.0);
    float setor = 2.0 * PI / n;
    float kf = (atan(dv.y, dv.x) + uRaiosLuz.w) / setor;
    float k = floor(kf + 0.5);
    vec3 h = uRaiosTabela[int(clamp(mod(k, n), 0.0, n - 1.0) + 0.5)];
    float perp = max(d, uRaioDisco) * abs((kf - k - h.x) * setor);
    float lk = max(comp * h.y, 1e-6);
    float largura = max(uRaiosForma.z, uLarguraMinima);
    // disco resolvido: cada ponto do disco faz seu raio e eles se borram; os finos enfraquecem com o disco
    float m = uG * uRaiosLuz.y * (uRaiosLuz.z / (uRaiosLuz.z + uRaioDisco)) * h.z * limpo
      * (uRaiosForma.z / largura) * uSolturaDosRaios;
    vec3 ao = max(0.0, d - uRaioDisco) / (lk * uRaiosCroma);
    vec3 w = largura * (1.0 + ao * uRaiosForma.w);
    vec3 atravessa = exp(-(perp / w) * (perp / w));
    return m * pow(max(1.0 - ao, 0.0), vec3(uRaiosLuz.x)) * atravessa * uRaiosCor * (1.0 - step(1.0, ao));
  }

  vec3 risco(vec2 dv, float limpo) {
    float ao = abs(dv.x) / max(uRiscoForma.x, 1e-6);
    float lN0 = uRiscoForma.z;
    float lA0 = uRiscoForma.w;
    float alcY = lA0 * 3.0;
    if (uRiscoParalelas.z > 0.5) alcY = max(alcY, abs(uRiscoParalelas.x) + lN0 * 4.0);
    if (uRiscoParalelas.z > 1.5) alcY = max(alcY, abs(uRiscoParalelas.y) + lN0 * 4.0);
    if (ao >= 1.0 || abs(dv.y) > alcY) return vec3(0.0);
    float queda = exp(-ao * uRiscoForma.y) * (1.0 - smoothstep(0.55, 1.0, ao));
    float lN = max(lN0, uLarguraMinima);
    float lA = max(lA0, uLarguraMinima);
    float lP = max(lN0 * 1.5, uLarguraMinima);
    float nucleo = (lN0 / lN) * g2(dv.y / (lN * (1.0 + ao)));
    float asas = (lA0 / lA) * g2(dv.y / lA);
    float par = 0.0;
    if (uRiscoParalelas.z > 0.5) par += g2((dv.y - uRiscoParalelas.x) / lP);
    if (uRiscoParalelas.z > 1.5) par += g2((dv.y - uRiscoParalelas.y) / lP);
    par *= lN0 * 1.5 / lP;
    float val = uG * queda * limpo
      * (uRiscoInt.x * nucleo + uRiscoInt.y * asas + uRiscoInt.z * par * exp(-ao * 1.5));
    return val * mix(uRiscoCorPerto, uRiscoCorLonge, smoothstep(0.0, 0.6, ao));
  }

  void main() {
    vec2 uv = vec2((vUv.x - 0.5) * uAspecto, vUv.y - 0.5);
    vec2 dv = uv - uL;
    float d = length(dv);
    float limpo = mascaraDisco(uv);
    vec3 c = vec3(0.0);
    if (uTemBrilho) c += min(brilho(dv, d, limpo), vec3(1.0e3));
    if (uTemRaios && uSolturaDosRaios > 0.0) c += min(raios(dv, d, limpo), vec3(1.0e3));
    if (uTemRisco) c += min(risco(dv, limpo), vec3(1.0e3));
#ifndef LUZ
    // a regra do disco vale também para os fantasmas, os anéis e a sujeira: com o Sol
    // perto do centro eles se empilham em cima dele e lavavam a superfície (vídeo de 08/10)
    c += texture(tMacio, vUv).rgb * limpo;
    if (uTemSujeira) {
      float t = 2.0 * texture(tSujeira, vec2(uv.x / ${(2 * SUJEIRA_U_MAX).toFixed(1)} + 0.5, uv.y + 0.5)).r;
      c += min(uBorda * t * texture(tLuz, vUv).rgb * uSujeiraCor, vec3(1.0e3)) * limpo;
    }
    // só aqui: a luz da sujeira (tLuz) já entra nesta soma, e passaria duas vezes pelo ar
    c *= uTransmitancia;
#endif
    saida = vec4(clamp(c, 0.0, 1.0e3), 0.0);
  }
`;

/** Gaussiana separável, borda presa (como o renderizador de referência). */
const FRAGMENTO_BORRAO = /* glsl */ `
  precision highp float;
  uniform sampler2D tFonte;
  uniform vec2 uPasso;
  uniform float uSigma;
  in vec2 vUv;
  layout(location = 0) out highp vec4 saida;
  void main() {
    int rad = int(ceil(uSigma * 3.0));
    float inv = 1.0 / (2.0 * uSigma * uSigma);
    vec3 acc = vec3(0.0);
    float soma = 0.0;
    for (int k = -rad; k <= rad; k++) {
      float w = exp(-float(k * k) * inv);
      acc += w * texture(tFonte, vUv + float(k) * uPasso).rgb;
      soma += w;
    }
    saida = vec4(acc / soma, 1.0);
  }
`;

const somaHdr = {
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  depthTest: false,
  depthWrite: false,
} as const;

type Uniformes = Record<string, THREE.IUniform>;

const unico = <T extends Elemento['tipo']>(p: Preset, tipo: T) =>
  p.elementos.find((e) => e.tipo === tipo) as Extract<Elemento, { tipo: T }> | undefined;

const maxRgb = (c: readonly number[]) => Math.max(c[0], c[1], c[2]);

/** O pico do reflexo por unidade de ganho: a soma dos picos dos elementos (a sujeira é acesa por eles). */
function picoDoPreset(p: Preset): number {
  let pico = 0;
  for (const e of p.elementos) {
    if (e.tipo === 'brilho') pico += (e.int1 + e.int2) * Math.max(maxRgb(e.cor1), maxRgb(e.cor2));
    else if (e.tipo === 'raios') pico += e.intensidade * maxRgb(e.cor);
    else if (e.tipo === 'risco')
      pico += (e.intNucleo + e.intAsas + 2 * e.intParalelas) * Math.max(maxRgb(e.corPerto), maxRgb(e.corLonge));
    else if (e.tipo === 'fantasma') pico += e.intensidade * (1 + e.poeira) * maxRgb(e.cor);
    else if (e.tipo === 'anel') pico += e.intensidade * maxRgb(e.cor);
  }
  return pico;
}

/** Os fantasmas de uma receita na GPU: atributos instanciados fixos e a poeira assada. */
function fantasmasNaGpu(fantasmas: readonly Fantasma[]) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const n = fantasmas.length;
  const atributo = (nome: string, tamanho: number, valores: (f: Fantasma, k: number) => number[]) => {
    const dados = new Float32Array(n * tamanho);
    fantasmas.forEach((f, k) => dados.set(valores(f, k), k * tamanho));
    g.setAttribute(nome, new THREE.InstancedBufferAttribute(dados, tamanho));
  };
  atributo('aForma', 4, (f) => [f.p, f.tamanho, f.aspecto, f.rotacao]);
  atributo('aIris', 4, (f, k) => [f.laminas, f.redondeza, f.poeira, k]);
  atributo('aPerfil', 4, (f) => [f.miolo, f.larguraBorda, f.suaveFora, f.suaveDentro]);
  atributo('aCroma', 3, (f) => [...f.croma]);
  atributo('aCor', 3, (f) => f.cor.map((c) => c * f.intensidade));
  atributo('aCorte', 4, (f) => (f.corte ? [f.corte.p, f.corte.raio, f.corte.suave, 1] : [0, 1, 0.06, 0]));
  g.instanceCount = n;
  return g;
}

interface NaGpu {
  readonly preset: Preset;
  readonly fator: readonly [number, number];
  readonly pico: number;
  readonly fantasmas: THREE.InstancedBufferGeometry;
  readonly ladrilhos: THREE.Vector2;
  readonly poeira: THREE.DataTexture;
  readonly sujeira: THREE.DataTexture | null;
}

function naGpu(nome: NomeDoPreset): NaGpu {
  const preset = presetDaLente(nome);
  const fantasmas = preset.elementos.filter((e): e is Fantasma => e.tipo === 'fantasma');
  const suj = unico(preset, 'sujeira');
  return {
    preset,
    fator: FATOR_DA_RECEITA[nome],
    pico: picoDoPreset(preset),
    fantasmas: fantasmasNaGpu(fantasmas),
    ladrilhos: new THREE.Vector2(COLUNAS_DE_LADRILHOS, Math.max(1, Math.ceil(fantasmas.length / COLUNAS_DE_LADRILHOS))),
    poeira: assarPoeira(fantasmas),
    sujeira: suj ? assarSujeira(suj) : null,
  };
}

const alvoHdr = (nome: string) => {
  const a = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    depthBuffer: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  a.texture.name = nome;
  return a;
};

export class PasseDaLente extends Pass {
  private readonly camera: THREE.Camera;
  private modo: ModoDaLente = 'nenhuma';
  private amplitude = 0;
  /** a força da lente, já em multiplicador (`multiplicadorDaForca`) */
  private multiplicador = 1;
  private readonly naGpu = new Map<NomeDoPreset, NaGpu>();
  /** os uniformes de todos os materiais, compartilhados (um lugar só por quadro) */
  private readonly u: Uniformes;
  private readonly materiais: THREE.ShaderMaterial[] = [];
  private readonly malhaDosFantasmas: THREE.Mesh;
  private readonly malhaDoAnel: THREE.Mesh;
  private readonly cenaMacia = new THREE.Scene();
  private readonly cameraNula = new THREE.Camera();
  private readonly quadLuz: FullScreenQuad;
  private readonly quadBorraoH: FullScreenQuad;
  private readonly quadBorraoV: FullScreenQuad;
  private readonly quadFinal: FullScreenQuad;
  private readonly alvoMacio = alvoHdr('PasseDaLente.macio');
  private readonly alvoLuz = alvoHdr('PasseDaLente.luz');
  private readonly alvoLuz2 = alvoHdr('PasseDaLente.luz2');
  private readonly corDeLimpezaVelha = new THREE.Color();
  private readonly sol = new THREE.Vector3();
  private largura = 1;
  private altura = 1;

  constructor(camera: THREE.Camera) {
    super();
    this.camera = camera;
    this.needsSwap = false;
    this.enabled = false;
    const v2 = () => ({ value: new THREE.Vector2() });
    const v3 = () => ({ value: new THREE.Vector3() });
    const v4 = () => ({ value: new THREE.Vector4() });
    this.u = {
      uL: v2(),
      uKTam: { value: 1 },
      uG: { value: 0 },
      uBorda: { value: 0 },
      uRaioDisco: { value: 0 },
      uAlfaDisco: { value: 0 },
      uForcaDisco: { value: 0 },
      uTanPorUnidade: v2(),
      uAspecto: { value: 1 },
      uInvAltura: { value: 1 },
      tPoeira: { value: null },
      uLadrilhos: v2(),
      uAnel: v4(),
      uAnelArco: v2(),
      uAnelCor: v3(),
      uTemBrilho: { value: false },
      uBrilho: v4(),
      uBrilhoCor1: v3(),
      uBrilhoCor2: v3(),
      uBrilhoEsticar: { value: 1 },
      uTemRaios: { value: false },
      uRaiosForma: v4(),
      uRaiosLuz: v4(),
      uRaiosCroma: v3(),
      uRaiosCor: v3(),
      uRaiosTabela: { value: Array.from({ length: MAX_RAIOS }, () => new THREE.Vector3()) },
      uSolturaDosRaios: { value: 1 },
      uTemRisco: { value: false },
      uRiscoForma: v4(),
      uRiscoInt: v3(),
      uRiscoParalelas: v3(),
      uRiscoCorPerto: v3(),
      uRiscoCorLonge: v3(),
      uTemSujeira: { value: false },
      uSujeiraCor: v3(),
      uTransmitancia: { value: new THREE.Vector3(1, 1, 1) },
      tMacio: { value: this.alvoMacio.texture },
      tLuz: { value: this.alvoLuz.texture },
      tSujeira: { value: null },
    };
    const material = (
      vertexShader: string,
      fragmentShader: string,
      extra: Uniformes = {},
      outros: THREE.ShaderMaterialParameters = somaHdr
    ) => {
      const m = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader,
        fragmentShader,
        uniforms: { ...this.u, ...extra },
        ...outros,
      });
      this.materiais.push(m);
      return m;
    };
    this.malhaDosFantasmas = new THREE.Mesh(
      new THREE.InstancedBufferGeometry(),
      material(VERTICE_FANTASMA, FRAGMENTO_FANTASMA)
    );
    const quad = new THREE.BufferGeometry();
    quad.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3));
    quad.setIndex([0, 1, 2, 0, 2, 3]);
    this.malhaDoAnel = new THREE.Mesh(quad, material(VERTICE_ANEL, FRAGMENTO_ANEL));
    for (const m of [this.malhaDosFantasmas, this.malhaDoAnel]) {
      m.frustumCulled = false;
      this.cenaMacia.add(m);
    }
    const luz = material(VERTICE_TELA, FRAGMENTO_FINOS, { uLarguraMinima: { value: 1 / LINHAS_DA_LUZ } });
    luz.defines = { LUZ: '' };
    this.quadLuz = new FullScreenQuad(luz);
    const borrao = (fonte: THREE.Texture) =>
      new FullScreenQuad(
        material(
          VERTICE_TELA,
          FRAGMENTO_BORRAO,
          { tFonte: { value: fonte }, uPasso: v2(), uSigma: { value: 1 } },
          { blending: THREE.NoBlending, depthTest: false, depthWrite: false }
        )
      );
    this.quadBorraoH = borrao(this.alvoLuz.texture);
    this.quadBorraoV = borrao(this.alvoLuz2.texture);
    this.quadFinal = new FullScreenQuad(
      material(VERTICE_TELA, FRAGMENTO_FINOS, { uLarguraMinima: { value: LARGURA_MINIMA_PX } })
    );
  }

  definirLente(modo: ModoDaLente) {
    this.modo = modo;
    if (modo === 'nenhuma') {
      this.enabled = false;
      return;
    }
    let gpu = this.naGpu.get(modo);
    if (!gpu) {
      gpu = naGpu(modo);
      this.naGpu.set(modo, gpu);
    }
    this.malhaDosFantasmas.geometry = gpu.fantasmas;
    this.uniformesDaReceita(gpu);
  }

  /** A força da lente (Ajustes · Lente), em %: vale para qualquer estilo, e fica guardada com `nenhuma`. */
  definirForca(forca: number) {
    this.multiplicador = multiplicadorDaForca(forca);
  }

  /** Os uniformes fixos de uma receita: um elemento de cada tipo, no máximo, além dos fantasmas. */
  private uniformesDaReceita(gpu: NaGpu) {
    const u = this.u;
    const p = gpu.preset;
    const v3 = (nome: string, c: readonly number[]) => (u[nome].value as THREE.Vector3).set(c[0], c[1], c[2]);
    u.tPoeira.value = gpu.poeira;
    (u.uLadrilhos.value as THREE.Vector2).copy(gpu.ladrilhos);
    const anel: Anel | undefined = unico(p, 'anel');
    this.malhaDoAnel.visible = !!anel;
    if (anel) {
      (u.uAnel.value as THREE.Vector4).set(anel.p, anel.raio, anel.espessura, anel.centro === 'quadro' ? 1 : 0);
      (u.uAnelArco.value as THREE.Vector2).set(anel.expoente, anel.saturacao);
      v3('uAnelCor', anel.cor.map((c) => c * anel.intensidade));
    }
    const b: Brilho | undefined = unico(p, 'brilho');
    u.uTemBrilho.value = !!b;
    if (b) {
      (u.uBrilho.value as THREE.Vector4).set(b.int1, b.raio1, b.int2, b.raio2);
      v3('uBrilhoCor1', b.cor1);
      v3('uBrilhoCor2', b.cor2);
      u.uBrilhoEsticar.value = b.esticar;
    }
    const r: Raios | undefined = unico(p, 'raios');
    u.uTemRaios.value = !!r;
    if (r) {
      const n = Math.min(MAX_RAIOS, Math.max(1, Math.round(r.numero)));
      (u.uRaiosForma.value as THREE.Vector4).set(n, r.comprimento, r.largura, r.alargar);
      (u.uRaiosLuz.value as THREE.Vector4).set(r.queda, r.intensidade, r.atenuacaoDisco, r.rotacao);
      v3('uRaiosCroma', r.croma);
      v3('uRaiosCor', r.cor);
      const tabela = u.uRaiosTabela.value as THREE.Vector3[];
      for (let k = 0; k < n; k++) tabela[k].set(...variacaoDoRaio(r, k));
    }
    const s: Risco | undefined = unico(p, 'risco');
    u.uTemRisco.value = !!s;
    if (s) {
      (u.uRiscoForma.value as THREE.Vector4).set(s.comprimento, s.queda, s.larguraNucleo, s.larguraAsas);
      v3('uRiscoInt', [s.intNucleo, s.intAsas, s.intParalelas]);
      const par = s.paralelas.slice(0, 2);
      v3('uRiscoParalelas', [par[0] ?? 0, par[1] ?? 0, par.length]);
      v3('uRiscoCorPerto', s.corPerto);
      v3('uRiscoCorLonge', s.corLonge);
    }
    const sj: Sujeira | undefined = unico(p, 'sujeira');
    u.uTemSujeira.value = !!sj && !!gpu.sujeira;
    u.tSujeira.value = gpu.sujeira;
    if (sj) {
      v3('uSujeiraCor', sj.cor.map((c) => c * sj.intensidade));
      for (const q of [this.quadBorraoH, this.quadBorraoV]) {
        (q.material as THREE.ShaderMaterial).uniforms.uSigma.value = sj.borrao * LINHAS_DA_LUZ;
      }
    }
  }

  /**
   * A luz deste quadro (o Director, ao lado de `setWarp`). `soltura` e
   * `transmitancia` são as do Sol deste quadro, calculadas uma vez para o
   * disco, o ponto e o clarão (director/solNoQuadro.ts) — aqui só consumidas.
   */
  atualizar(
    dUA: number,
    politica: PoliticaDeLuz,
    roteiro: number,
    visibilidade: number,
    soltura: number,
    transmitancia: readonly [number, number, number]
  ) {
    this.amplitude = amplitudeDaLente(dUA, politica, roteiro, visibilidade);
    this.u.uSolturaDosRaios.value = soltura;
    (this.u.uTransmitancia.value as THREE.Vector3).set(transmitancia[0], transmitancia[1], transmitancia[2]);
    if (this.modo === 'nenhuma') {
      this.enabled = false;
      return;
    }
    this.enabled = this.amplitude > 0;
  }

  /** Recebe px de BUFFER do composer; o alvo macio é a metade, o da luz tem 128 linhas. */
  setSize(largura: number, altura: number) {
    this.largura = Math.max(1, largura);
    this.altura = Math.max(1, altura);
    this.alvoMacio.setSize(Math.ceil(this.largura / 2), Math.ceil(this.altura / 2));
    const wLuz = Math.max(1, Math.round((LINHAS_DA_LUZ * this.largura) / this.altura));
    this.alvoLuz.setSize(wLuz, LINHAS_DA_LUZ);
    this.alvoLuz2.setSize(wLuz, LINHAS_DA_LUZ);
    const uH = (this.quadBorraoH.material as THREE.ShaderMaterial).uniforms;
    const uV = (this.quadBorraoV.material as THREE.ShaderMaterial).uniforms;
    (uH.uPasso.value as THREE.Vector2).set(1 / wLuz, 0);
    (uV.uPasso.value as THREE.Vector2).set(0, 1 / LINHAS_DA_LUZ);
    this.u.uAspecto.value = this.largura / this.altura;
    this.u.uInvAltura.value = 1 / this.altura;
    (this.quadFinal.material as THREE.ShaderMaterial).uniforms.uLarguraMinima.value =
      LARGURA_MINIMA_PX / this.altura;
  }

  /**
   * O Sol neste quadro, com a câmera do render: L, o disco resolvido, o
   * gatilho de borda e a saída (look development), e o ganho. Devolve falso
   * quando o Sol está atrás, saiu da margem, a câmera não é perspectiva, ou
   * o reflexo inteiro ficaria abaixo do limiar de desenho.
   */
  private prepararQuadro(gpu: NaGpu, exposicao: number, curva: THREE.ToneMapping): boolean {
    const cam = this.camera;
    if (!(cam instanceof THREE.PerspectiveCamera)) return false;
    this.sol.set(0, 0, 0).applyMatrix4(cam.matrixWorldInverse);
    const dist = this.sol.length();
    const frente = -this.sol.z;
    if (!(dist > 0) || !(frente > 1e-9 * dist)) return false;
    const T = Math.tan(THREE.MathUtils.degToRad(cam.getEffectiveFOV()) / 2);
    const aspecto = this.largura / this.altura;
    const lx = ((this.sol.x / frente / (T * cam.aspect)) * aspecto) / 2;
    const ly = this.sol.y / frente / (2 * T);
    // gatilho de borda (Sapphire): perto da borda brilho × e tamanho ×; some depois da margem
    const b = gpu.preset.borda;
    const db = Math.min(aspecto / 2 - Math.abs(lx), 0.5 - Math.abs(ly));
    const sai = suave(-b.margem, 0, db);
    if (!(sai > 0)) return false;
    const perto = 1 - suave(0, b.zona, db);
    const borda = (1 + (b.ganhoBrilho - 1) * perto) * sai;
    const fator = porCurva(curva, gpu.fator[0], gpu.fator[1]);
    const g = (this.amplitude / G_DA_LENTE) * borda * fator * this.multiplicador;
    const t = this.u.uTransmitancia.value as THREE.Vector3;
    const ar = Math.max(t.x, t.y, t.z);
    const limiar = porCurva(curva, LIMIAR_NA_EXPOSICAO_1[0], LIMIAR_NA_EXPOSICAO_1[1]);
    if (!(g * gpu.pico * ar >= limiar / Math.max(exposicao, 1e-6))) return false;
    // o disco do Sol: o raio angular e, para as formas, o raio no eixo em frações da altura; abaixo
    // de ~1 px ele é ponto (como no look development) e entre 1 e 3 px de raio o disco entra em
    // rampa — um degrau aqui fazia o miolo saltar ~16 % (~3 UA)
    const alfa = Math.asin(Math.min(0.999, RAIO_DO_SOL_NA_CENA / dist));
    const raio = Math.tan(alfa) / (2 * T);
    const forca = suave(1, 3, raio * this.altura);
    const u = this.u;
    (u.uL.value as THREE.Vector2).set(lx, ly);
    (u.uTanPorUnidade.value as THREE.Vector2).set((2 * T * cam.aspect) / aspecto, 2 * T);
    u.uKTam.value = 1 + (b.ganhoTamanho - 1) * perto;
    u.uG.value = g;
    u.uBorda.value = borda;
    u.uAlfaDisco.value = alfa;
    u.uForcaDisco.value = forca;
    u.uRaioDisco.value = raio * forca;
    return true;
  }

  render(
    renderer: THREE.WebGLRenderer,
    _writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget
  ) {
    if (this.modo === 'nenhuma') return;
    const gpu = this.naGpu.get(this.modo);
    if (!gpu || !this.prepararQuadro(gpu, renderer.toneMappingExposure, renderer.toneMapping)) return;
    const limpavaSozinho = renderer.autoClear;
    renderer.autoClear = false;
    renderer.getClearColor(this.corDeLimpezaVelha);
    const alphaVelho = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(this.alvoMacio);
    renderer.clear(true, false, false);
    renderer.render(this.cenaMacia, this.cameraNula);
    if (this.u.uTemSujeira.value) {
      renderer.setRenderTarget(this.alvoLuz);
      renderer.clear(true, false, false);
      renderer.render(this.cenaMacia, this.cameraNula);
      this.quadLuz.render(renderer);
      renderer.setRenderTarget(this.alvoLuz2);
      this.quadBorraoH.render(renderer);
      renderer.setRenderTarget(this.alvoLuz);
      this.quadBorraoV.render(renderer);
    }
    renderer.setRenderTarget(readBuffer);
    this.quadFinal.render(renderer);
    renderer.setClearColor(this.corDeLimpezaVelha, alphaVelho);
    renderer.autoClear = limpavaSozinho;
  }

  dispose() {
    for (const gpu of this.naGpu.values()) {
      gpu.fantasmas.dispose();
      gpu.poeira.dispose();
      gpu.sujeira?.dispose();
    }
    this.malhaDoAnel.geometry.dispose();
    for (const m of this.materiais) m.dispose();
    for (const q of [this.quadLuz, this.quadBorraoH, this.quadBorraoV, this.quadFinal]) q.dispose();
    this.alvoMacio.dispose();
    this.alvoLuz.dispose();
    this.alvoLuz2.dispose();
  }
}
