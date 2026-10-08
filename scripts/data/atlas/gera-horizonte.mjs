// ============================================================
// MAPA DE HORIZONTE — a sombra de relevo ASSADA fora do app (item 226,
// contrato em PLAN-HIPERION.md, "Contrato do MAPA DE HORIZONTE").
//
// Para cada texel e cada um de 6 azimutes, a elevação do horizonte: o
// ângulo acima do plano tangente em que o relevo em volta tapa o céu. O
// app compara o Sol com ela e sabe, com duas leituras de textura, se o
// ponto está na sombra de uma parede.
//
// CONVENÇÃO DA CASA (a de `relevo-e-cor-de-hiperion.mjs` e de
// `normalDoMapa` em `src/three/world/corpos/corpos.ts`):
//   - direção de (λ leste, lat) = (cos lat·cos λ, sin lat, −cos lat·sin λ);
//   - u = λ/360 + 0,5, linha 0 = norte; o centro do texel (i, j) é
//     λ = (i + 0,5)·360/W − 180, lat = 90 − (j + 0,5)·180/H;
//   - quadro tangente: n = direção radial do texel,
//     t = normalize(cross((0,1,0), n)) (aponta para o LESTE),
//     b = cross(n, t) (NORTE); azimute φ de t para b, e = cos φ·t + sin φ·b.
//
// A MARCHA: de P = n·r(n) pelo círculo máximo d(θ) = cos θ·n + sin θ·e,
// Q = d(θ)·r(d(θ)); elevação = máx atan2(dot(Q−P, n), dot(Q−P, e)),
// grampeada em ≥ 0. Como dot(Q−P, n) = r·cos θ − r0 e dot(Q−P, e) =
// r·sin θ > 0, o máximo do ângulo é o máximo da TANGENTE
// (r·cos θ − r0)/(r·sin θ) — nenhuma trigonometria no laço de dentro.
//
// O TRUQUE DA LINHA: numa grade equiretangular, o círculo máximo que sai
// do texel (i, j) é o que sai do texel (0, j) girado em longitude. Então,
// por linha, a posição de cada passo na grade é uma tabela
// (deslocamento de coluna, linha) que vale para todas as colunas — o laço
// de dentro é só a bilinear do raio.
//
// CODIFICAÇÃO: sen(elevação)·255, arredondado, grampeado em [0, 255].
// `horizon` = azimutes 0°, 120°, 240° em R, G, B; `horizon2` = 60°,
// 180°, 300°. RGB SEM alfa: o Safari do iPhone decodifica imagem com alfa
// pré-multiplicada e perderia o RGB onde A = 0 — dado nunca vai em alfa.
//
// O HORIZONTE FINO, MÉDIO POR CÉLULA (`assaHorizonteFino`, a Terra, item
// 232, 08/10): a mesma marcha, a mesma convenção e a mesma codificação,
// mas feita em CADA amostra da grade fina da fonte, com a referência na
// altura da PRÓPRIA amostra, e o texel de saída guarda a MÉDIA DE ÁREA,
// na célula, do seno dessas amostras. Com uma referência só (a média da
// célula), a amostra vizinha da mesma célula tapa o céu de qualquer
// crista em todos os azimutes — sombra que não existe. A média do seno é
// o limiar que conserva a área da fração acesa da célula; a lei com que o
// shader a abre é `GLSL_SOMBRA_PARCIAL_DO_RELEVO` (corpos.ts). A marcha da
// Terra leva perto de uma hora numa thread só, então ela corre em faixas
// de linhas de saída em `worker_threads` (este mesmo arquivo, sem import
// pesado), com o relevo num SharedArrayBuffer; cada linha de saída soma as
// linhas finas na mesma ordem em qualquer divisão de faixas, então o mapa
// sai byte a byte o mesmo com um fio ou com oito.
//
// Módulo puro: nada de disco, nada de rede; coberto por
// `gera-horizonte.test.mjs` e `relevo-terra.test.mjs`.
// ============================================================

import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

/** Os 6 azimutes, em graus, na ordem dos índices k = 0..5 (60°·k). */
export const AZIMUTES_GRAUS = [0, 60, 120, 180, 240, 300];

/**
 * Os ângulos θ (radianos) da marcha para uma grade de largura W:
 * 0,5 texel até 3°, 1 texel até 15°, 4 texels até 60° (texel = 360°/W).
 * Os limites são em graus; os passos, em texels.
 */
export function angulosDaMarcha(W, { faixas = [[0.5, 3], [1, 15], [4, 60]] } = {}) {
  const texel = (2 * Math.PI) / W;
  const angulos = [];
  let theta = faixas[0][0] * texel;
  for (const [passoEmTexels, ateGraus] of faixas) {
    const ate = (ateGraus * Math.PI) / 180;
    const passo = passoEmTexels * texel;
    while (theta <= ate + 1e-12) {
      angulos.push(theta);
      theta += passo;
    }
  }
  return angulos;
}

/**
 * Assa o horizonte de um campo de raio equiretangular W×H.
 *
 * @param {object} p
 * @param {ArrayLike<number>} p.raio  raio final por texel, na convenção da
 *   casa (linha 0 = norte), W·H valores; lido por bilinear com volta em u
 *   e grampo em v.
 * @param {number} p.W
 * @param {number} p.H
 * @param {number[]} [p.angulos]  θ da marcha (padrão: `angulosDaMarcha(W)`).
 * @returns {{ senos: Float32Array, horizon: Uint8Array, horizon2: Uint8Array }}
 *   `senos[k·W·H + j·W + i]` = sen(elevação) no azimute 60°·k;
 *   `horizon`/`horizon2` = os dois RGB de 8 bits, W·H·3 bytes cada.
 */
export function assaHorizonte({ raio, W, H, angulos = angulosDaMarcha(W) }) {
  const N = W * H;
  if (raio.length !== N) throw new Error(`assaHorizonte: raio tem ${raio.length} valores, esperado ${N}.`);
  const r = Float32Array.from(raio);
  const S = angulos.length;
  const cosT = new Float64Array(S);
  const sinT = new Float64Array(S);
  for (let s = 0; s < S; s++) {
    cosT[s] = Math.cos(angulos[s]);
    sinT[s] = Math.sin(angulos[s]);
  }
  const K = AZIMUTES_GRAUS.length;
  const cosA = AZIMUTES_GRAUS.map((a) => Math.cos((a * Math.PI) / 180));
  const sinA = AZIMUTES_GRAUS.map((a) => Math.sin((a * Math.PI) / 180));

  // tabela da linha: para cada passo s, onde a amostra cai na grade
  const col0 = new Int32Array(S);
  const col1 = new Int32Array(S);
  const fx = new Float64Array(S);
  const lin0 = new Int32Array(S);
  const lin1 = new Int32Array(S);
  const fy = new Float64Array(S);
  const melhor = new Float64Array(W); // tangente máxima, começa em 0 (o grampo ≥ 0)
  const senos = new Float32Array(K * N);

  for (let j = 0; j < H; j++) {
    const lat = Math.PI / 2 - ((j + 0.5) / H) * Math.PI;
    const cl = Math.cos(lat);
    const sl = Math.sin(lat);
    // o quadro no texel de λ = 0 (a linha inteira é ele girado em λ):
    // n = (cl, sl, 0), t = (0, 0, −1) leste, b = (−sl, cl, 0) norte
    for (let k = 0; k < K; k++) {
      const ex = -sinA[k] * sl;
      const ey = sinA[k] * cl;
      const ez = -cosA[k];
      for (let s = 0; s < S; s++) {
        const dx = cosT[s] * cl + sinT[s] * ex;
        const dy = cosT[s] * sl + sinT[s] * ey;
        const dz = sinT[s] * ez;
        const latD = Math.asin(Math.max(-1, Math.min(1, dy)));
        const lonD = Math.atan2(-dz, dx); // λ relativo ao texel de partida
        const x = (lonD / (2 * Math.PI)) * W;
        const y = (0.5 - latD / Math.PI) * H - 0.5;
        const xf = Math.floor(x);
        fx[s] = x - xf;
        col0[s] = ((xf % W) + W) % W;
        col1[s] = (col0[s] + 1) % W;
        const yf = Math.floor(y);
        fy[s] = y - yf;
        lin0[s] = Math.max(0, Math.min(H - 1, yf)) * W;
        lin1[s] = Math.max(0, Math.min(H - 1, yf + 1)) * W;
      }
      melhor.fill(0);
      const base = j * W;
      for (let s = 0; s < S; s++) {
        const c0 = col0[s];
        const c1 = col1[s];
        const a = fx[s];
        const b = fy[s];
        const l0 = lin0[s];
        const l1 = lin1[s];
        const ct = cosT[s];
        const st = sinT[s];
        for (let i = 0; i < W; i++) {
          let i0 = i + c0;
          if (i0 >= W) i0 -= W;
          let i1 = i + c1;
          if (i1 >= W) i1 -= W;
          const v0 = r[l0 + i0] + (r[l0 + i1] - r[l0 + i0]) * a;
          const v1 = r[l1 + i0] + (r[l1 + i1] - r[l1 + i0]) * a;
          const rq = v0 + (v1 - v0) * b;
          const alto = rq * ct - r[base + i];
          const longe = rq * st;
          if (alto > melhor[i] * longe) melhor[i] = alto / longe;
        }
      }
      const saida = k * N + base;
      for (let i = 0; i < W; i++) {
        const tg = melhor[i];
        senos[saida + i] = tg / Math.sqrt(1 + tg * tg);
      }
    }
  }
  return { senos, ...codificaHorizonte(senos, W, H) };
}

/** sen(elevação) → byte: ·255, arredondado, grampeado; NaN vira 0. */
function paraByte(v) {
  const b = Math.round(v * 255);
  return b > 0 ? Math.min(255, b) : 0;
}

/**
 * Os dois RGB de 8 bits a partir dos 6 planos de senos (layout de
 * `assaHorizonte`): `horizon` = k 0, 2, 4 (0°, 120°, 240°); `horizon2` =
 * k 1, 3, 5 (60°, 180°, 300°).
 */
export function codificaHorizonte(senos, W, H) {
  const N = W * H;
  const horizon = new Uint8Array(N * 3);
  const horizon2 = new Uint8Array(N * 3);
  for (let p = 0; p < N; p++) {
    for (let c = 0; c < 3; c++) {
      horizon[p * 3 + c] = paraByte(senos[2 * c * N + p]);
      horizon2[p * 3 + c] = paraByte(senos[(2 * c + 1) * N + p]);
    }
  }
  return { horizon, horizon2 };
}

/**
 * A MÉDIA DE CAIXA em longitude, da grade fina (largura `Wf`) para a de
 * saída (`W`), com a volta em 360°: a coluna I cobre as colunas finas de
 * [I·s, (I + 1)·s), s = Wf/W, cada uma pesada pela fração que se sobrepõe.
 * `{ ini, col, w }`: as colunas finas de I e seus pesos estão em
 * [ini[I], ini[I + 1]).
 */
export function pesosDaCaixa(W, Wf) {
  const s = Wf / W;
  const ini = new Int32Array(W + 1);
  const col = [];
  const w = [];
  for (let I = 0; I < W; I++) {
    ini[I] = col.length;
    const u0 = I * s;
    const u1 = u0 + s;
    for (let k = Math.floor(u0); k < Math.ceil(u1); k++) {
      const sobre = Math.min(u1, k + 1) - Math.max(u0, k);
      if (sobre > 1e-9) {
        col.push(k % Wf);
        w.push(sobre / s);
      }
    }
  }
  ini[W] = col.length;
  return { ini, col: Int32Array.from(col), w: Float64Array.from(w) };
}

/**
 * O HORIZONTE FINO das linhas de saída [J0, J1) (ver o cabeçalho): cada
 * linha fina que as cobre é marchada nos 6 azimutes (a marcha de
 * `assaHorizonte`, sobre o raio `raioM` + altura em metros, com
 * R·(cos θ − 1) = −2R·sen²(θ/2) para não cancelar), o seno vai a float32,
 * e entra na linha de saída pela média de caixa em longitude e pela
 * sobreposição em latitude. `alturaM`: Wf·Hf alturas em metros, linha 0 =
 * norte, lidas por bilinear com volta em u e grampo em v. Devolve
 * `Float32Array` com K·(J1 − J0)·W médias, `[k][J − J0][I]`.
 */
export function horizonteFinoNasLinhas({ alturaM, Wf, Hf, W, H, raioM, angulos, J0, J1 }) {
  const h = alturaM;
  const S = angulos.length;
  const ct = new Float64Array(S);
  const st = new Float64Array(S);
  const rc = new Float64Array(S);
  for (let s = 0; s < S; s++) {
    ct[s] = Math.cos(angulos[s]);
    st[s] = Math.sin(angulos[s]);
    rc[s] = -2 * raioM * Math.sin(angulos[s] / 2) ** 2;
  }
  const K = AZIMUTES_GRAUS.length;
  const cosA = AZIMUTES_GRAUS.map((a) => Math.cos((a * Math.PI) / 180));
  const sinA = AZIMUTES_GRAUS.map((a) => Math.sin((a * Math.PI) / 180));
  const col0 = new Int32Array(S);
  const col1 = new Int32Array(S);
  const fx = new Float64Array(S);
  const lin0 = new Int32Array(S);
  const lin1 = new Int32Array(S);
  const fy = new Float64Array(S);
  const melhor = new Float64Array(Wf);
  const sen = new Float32Array(K * Wf);
  const P = pesosDaCaixa(W, Wf);
  const ry = Hf / H;
  const nJ = J1 - J0;
  const acc = new Float64Array(K * nJ * W);
  const r0 = Math.floor(J0 * ry);
  const r1 = Math.min(Hf, Math.ceil(J1 * ry));
  for (let rf = r0; rf < r1; rf++) {
    const lat = Math.PI / 2 - ((rf + 0.5) / Hf) * Math.PI;
    const cl = Math.cos(lat);
    const sl = Math.sin(lat);
    const base = rf * Wf;
    for (let k = 0; k < K; k++) {
      // o truque da linha de `assaHorizonte`, na grade fina
      const ex = -sinA[k] * sl;
      const ey = sinA[k] * cl;
      const ez = -cosA[k];
      for (let s = 0; s < S; s++) {
        const dx = ct[s] * cl + st[s] * ex;
        const dy = ct[s] * sl + st[s] * ey;
        const dz = st[s] * ez;
        const latD = Math.asin(Math.max(-1, Math.min(1, dy)));
        const lonD = Math.atan2(-dz, dx);
        const x = (lonD / (2 * Math.PI)) * Wf;
        const y = (0.5 - latD / Math.PI) * Hf - 0.5;
        const xf = Math.floor(x);
        fx[s] = x - xf;
        col0[s] = ((xf % Wf) + Wf) % Wf;
        col1[s] = (col0[s] + 1) % Wf;
        const yf = Math.floor(y);
        fy[s] = y - yf;
        lin0[s] = Math.max(0, Math.min(Hf - 1, yf)) * Wf;
        lin1[s] = Math.max(0, Math.min(Hf - 1, yf + 1)) * Wf;
      }
      melhor.fill(0);
      for (let s = 0; s < S; s++) {
        const c0 = col0[s];
        const c1 = col1[s];
        const a = fx[s];
        const b = fy[s];
        const l0 = lin0[s];
        const l1 = lin1[s];
        const cts = ct[s];
        const sts = st[s];
        const rcs = rc[s];
        for (let i = 0; i < Wf; i++) {
          let i0 = i + c0;
          if (i0 >= Wf) i0 -= Wf;
          let i1 = i + c1;
          if (i1 >= Wf) i1 -= Wf;
          const v0 = h[l0 + i0] + (h[l0 + i1] - h[l0 + i0]) * a;
          const v1 = h[l1 + i0] + (h[l1 + i1] - h[l1 + i0]) * a;
          const hq = v0 + (v1 - v0) * b;
          // (R + hq)·cos θ − (R + h0) e (R + hq)·sen θ, em metros
          const alto = hq * cts - h[base + i] + rcs;
          const longe = (raioM + hq) * sts;
          if (alto > melhor[i] * longe) melhor[i] = alto / longe;
        }
      }
      for (let i = 0; i < Wf; i++) {
        const tg = melhor[i];
        sen[k * Wf + i] = tg / Math.sqrt(1 + tg * tg);
      }
    }
    // a linha fina entra nas linhas de saída que ela cobre, pesada pela sobreposição
    for (let J = Math.max(J0, Math.floor(rf / ry)); J < J1 && J * ry < rf + 1; J++) {
      const wr = (Math.min((J + 1) * ry, rf + 1) - Math.max(J * ry, rf)) / ry;
      if (wr <= 1e-9) continue;
      for (let k = 0; k < K; k++) {
        const o = (k * nJ + (J - J0)) * W;
        const sk = k * Wf;
        for (let I = 0; I < W; I++) {
          let s = 0;
          for (let p = P.ini[I]; p < P.ini[I + 1]; p++) s += P.w[p] * sen[sk + P.col[p]];
          acc[o + I] += wr * s;
        }
      }
    }
  }
  return Float32Array.from(acc);
}

/** As linhas de saída de cada faixa que um fio marcha de uma vez. */
const LINHAS_POR_FAIXA = 16;

/**
 * Assa o HORIZONTE FINO de uma grade de alturas inteira (`alturaM`, Wf·Hf
 * metros sobre a esfera de raio `raioM`) na grade de saída W×H, em
 * `fios` threads (ver o cabeçalho). `{ senos, horizon, horizon2 }` no
 * layout de `assaHorizonte`.
 */
export async function assaHorizonteFino({ alturaM, Wf, Hf, W, H, raioM, angulos, fios = os.availableParallelism() }) {
  if (alturaM.length !== Wf * Hf) throw new Error(`assaHorizonteFino: ${alturaM.length} alturas, esperado ${Wf * Hf}.`);
  let sab = alturaM.buffer;
  if (!(sab instanceof SharedArrayBuffer) || alturaM.byteOffset !== 0 || sab.byteLength !== alturaM.byteLength) {
    sab = new SharedArrayBuffer(alturaM.length * 4);
    new Float32Array(sab).set(alturaM);
  }
  const K = AZIMUTES_GRAUS.length;
  const N = W * H;
  const senos = new Float32Array(K * N);
  const fila = [];
  for (let J = 0; J < H; J += LINHAS_POR_FAIXA) fila.push([J, Math.min(H, J + LINHAS_POR_FAIXA)]);
  const trabalhadores = [];
  try {
    await Promise.all(
      Array.from({ length: Math.max(1, Math.min(fios, fila.length)) }, () => new Promise((pronto, falha) => {
        const w = new Worker(new URL(import.meta.url), {
          workerData: { horizonteFino: { sab, Wf, Hf, W, H, raioM, angulos: Array.from(angulos) } },
        });
        trabalhadores.push(w);
        const proxima = () => {
          const faixa = fila.shift();
          if (faixa) w.postMessage(faixa);
          else pronto();
        };
        w.on('message', ({ J0, J1, acc }) => {
          const nJ = J1 - J0;
          for (let k = 0; k < K; k++) senos.set(acc.subarray(k * nJ * W, (k + 1) * nJ * W), k * N + J0 * W);
          proxima();
        });
        w.on('error', falha);
        w.on('exit', (codigo) => {
          if (codigo !== 0) falha(new Error(`assaHorizonteFino: um fio saiu com o código ${codigo}.`));
        });
        proxima();
      }))
    );
  } finally {
    await Promise.all(trabalhadores.map((w) => w.terminate()));
  }
  return { senos, ...codificaHorizonte(senos, W, H) };
}

// o fio de `assaHorizonteFino`: marcha as faixas que o principal manda
if (!isMainThread && workerData?.horizonteFino) {
  const { sab, ...p } = workerData.horizonteFino;
  const alturaM = new Float32Array(sab);
  parentPort.on('message', ([J0, J1]) => {
    const acc = horizonteFinoNasLinhas({ alturaM, ...p, J0, J1 });
    parentPort.postMessage({ J0, J1, acc }, [acc.buffer]);
  });
}
