// ============================================================
// AS CRATERAS PELA FOTO (item 230, etapa J1b do PLAN-EUROPA-JAPETO.md) —
// detecta, num mosaico equiretangular da casa, as crateras que a imagem
// mostra, para o relevo ter cratera onde a foto tem e não ter onde ela não
// tem (a receita do Hipérion: poço onde a pintura tem poço). Puro e
// determinístico: sem sorteio, sem E/S; o runner lê a imagem e passa a
// luminância linear.
//
// O QUE A FOTO MOSTRA: o mosaico Cassini de Jápeto não é achatado de luz —
// a borda da cratera aparece como SOMBREADO (um lado claro, o outro na
// sombra), como ALBEDO (fundo escuro no terreno claro da transição) ou como
// ANEL claro sobre a Cassini Regio quase preta. Os três têm em comum um
// degrau (ou um filete) de brilho NA BORDA, nítido diante do tamanho da
// cratera, em volta do círculo inteiro ou dos dois lados opostos. Uma mancha
// sem borda varia devagar em raio; uma linha reta (costura do mosaico, a
// própria crista) não fecha em volta; a textura não se repete em ângulo.
//
// O MÉTODO, nesta ordem:
//  1. log da luminância linear (o contraste vira razão: a mesma borda vale
//     o mesmo na Cassini Regio a 0,04 de albedo e no gelo a 0,6), em
//     pirâmide de oitavas (cada nível é o anterior borrado σ 1 px e
//     reduzido 2×2); o gradiente de cada nível é DIVIDIDO PELO DESVIO-PADRÃO
//     LOCAL do log (janela σ 12 px do nível) — o contraste local da
//     detecção do Hipérion; sem isso só se enxerga a borda no chão claro.
//  2. VOTO DE ANEL (transformada de Hough pelo gradiente): cada pixel com
//     gradiente normalizado ≥ `gradienteMin` vota no ponto a distância r
//     na direção do gradiente e no oposto (a borda clara de dentro e a
//     sombra de fora apontam ambas para o centro), em seis raios por
//     oitava (3,5–6,2 px do nível; 8–490 km no mapa de 3.840). O destino
//     do voto é tomado NA ESFERA (círculo máximo, rumo pelo gradiente
//     corrigido de cos(lat)): o círculo da cratera é uma elipse no mapa e o
//     voto a acompanha. O acumulador (borrado σ 1, dividido pelo raio) é a
//     fração da circunferência que vota; os máximos locais em (x, y, r)
//     acima de `votoMin` (`votoMinGrosso` da oitava 2 em diante: poucos
//     candidatos, e a cratera grande e gasta vota fraco) são os
//     candidatos. Em alta latitude a elipse tem
//     mais pixels e o voto sobe (~2× a 60°): pesar por cos(lat) corta os
//     anéis de verdade tanto quanto a textura, então o voto fica sem peso e
//     quem separa é a conferência, cujo falso positivo não muda com a
//     latitude (medido em textura isotrópica na esfera). Não é DoG: no
//     sombreado a cratera é um dipolo (meia lua clara + meia lua escura) e
//     o DoG põe o blob fora do centro e com metade do tamanho.
//  3. CONFERÊNCIA DO ANEL, um nível mais fino (raio de 7–12 px; a oitava 0
//     no log sem borrão): 48 raios em volta do centro (na esfera), o perfil
//     do log/desvio de 0,25 a 2 R em cada um. Os harmônicos 0 (anel) e 1
//     (sombreado de um lado contra o outro) do perfil em ângulo são
//     ajustados, em raio, por um FUNDO LISO (polinômio de grau 3 no 0, de
//     grau 2 no 1 — a mancha, o declive, o abaulado) mais uma BORDA NÍTIDA
//     em s0 (degrau e filete de largura ~1 px); os harmônicos ≥ 2 são
//     textura e ficam no resíduo. Os atributos, todos na esfera:
//     - NITIDEZ = a fração do resíduo do fundo liso que a borda explica
//       (R² parcial, 0–1), na melhor posição s0 em 0,8–1,25 R — o raio é s0·r
//       (a parábola nos vizinhos refina). A mancha sem borda e a textura
//       lisa ficam abaixo de ~0,2; a cratera nítida passa de 0,4.
//     - DOMINÂNCIA: a borda em s0 tem de explicar ≥ 0,9 do que um degrau em
//       0,4–0,7 R ou 1,35–1,6 R explicaria — senão o anel é concêntrico a
//       outra cratera mais nítida (o raio certo vem de outro voto).
//     - COERÊNCIA na faixa da borda (±0,15 R): a parte da derivada radial
//       que é harmônico 0 ou 1. QUADRUPOLO: o harmônico 2 diante deles — a
//       faixa reta ou o risco de mosaico borrado cruza o círculo dos dois
//       lados com o mesmo sinal; a cratera, não.
//     - COBERTURA = fração dos 48 raios em que a derivada em s0 passa de
//       metade da do modelo, com gradiente radial; EQUILÍBRIO = módulo da
//       média vetorial desses raios (0 = em volta toda ou dos dois lados,
//       0,64 = meio círculo).
//     CONFIANÇA = rampa(nitidez 0,1→0,5) · rampa(cobertura 0,4→0,8) ·
//     (1 − equilíbrio) · rampa(coerência 0,45→0,75) · (1 − rampa(quadrupolo
//     0,5→0,9)), com portões mínimos em cada um (`PARAMETROS_DA_DETECCAO`).
//     O voto erra o raio para menos na cratera gasta (a parede de dentro
//     vota mais nítido que a crista): a conferência tenta r, 1,25 r e 1,5 r;
//     depois o centro a ±0,15 r (±0,3 r e ±0,15 r nas oitavas grossas).
//     Calibração (06/10): galerias de recortes do mosaico por faixa de
//     atributo; textura isotrópica sintética na esfera (sem cratera
//     nenhuma) e três anéis sintéticos. Acima de 0,3 de confiança a
//     galeria é quase toda cratera; entre 0,15 e 0,25, metade é risco,
//     mancha ou costura.
//  4. Máscara: onde a textura fina do log some (o preenchimento borrado dos
//     polos), não se detecta.
//  5. Duplicatas: em ordem de confiança (depois nitidez), cai a que tem o
//     centro a menos de 0,5 R de uma já aceita e tamanho parecido (razão
//     < 1,5).
//
// A CONVENÇÃO DA CASA: linha 0 = +90°N; a coluna i cai em
// (180 + (i+½)·360/W) mod 360 °E (Greenwich no centro).
// ============================================================

const GRAUS = 180 / Math.PI;

/** Os números da detecção (ESCOLHIDOS e calibrados no mosaico; vão ao parametros.json). */
export const PARAMETROS_DA_DETECCAO = Object.freeze({
  epsLog: 0.003,
  epsDesvio: 0.05,
  sigmaDeAnalise: 1,
  sigmaDaJanelaDoDesvio: 12,
  raioInicialPx: 3.5,
  raiosPorOitava: 6,
  oitavas: 6,
  gradienteMin: 0.4,
  gradienteRef: 1.5,
  latMaxDoVotoGraus: 80,
  votoMin: 0.35,
  oitavaGrossa: 2,
  votoMinGrosso: 0.2,
  angulos: 48,
  fatoresDeRaio: Object.freeze([1, 1.25, 1.5]),
  passosDoCentroRR: Object.freeze([0.3, 0.15]),
  larguraDoDegrau: Object.freeze([0.04, 0.5]),
  larguraDoFilete: Object.freeze([0.1, 1]),
  nitidezMin: 0.18,
  nitidezRampa: Object.freeze([0.1, 0.5]),
  dominancia: 0.9,
  amplitudeMin: 0.12,
  radialMin: 0.7,
  coberturaMin: 0.5,
  coberturaRampa: Object.freeze([0.4, 0.8]),
  equilibrioMax: 0.35,
  coerenciaRampa: Object.freeze([0.45, 0.75]),
  quadrupoloRampa: Object.freeze([0.5, 0.9]),
  quadrupoloMax: 0.85,
  confiancaMin: 0.3,
  texturaMin: 0.025,
  duplicata: Object.freeze({ distanciaRR: 0.5, razaoDeTamanho: 1.5 }),
  latMaxGraus: 72,
});

/** sRGB 8 bits → luminância linear (Rec. 709), por pixel. */
export function luminanciaDoRgb(rgb, largura, altura, canais = 3) {
  const tabela = new Float32Array(256);
  for (let i = 0; i < 256; i += 1) {
    const v = i / 255;
    tabela[i] = v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }
  const lum = new Float32Array(largura * altura);
  for (let p = 0, i = 0; p < lum.length; p += 1, i += canais) lum[p] = 0.2126 * tabela[rgb[i]] + 0.7152 * tabela[rgb[i + 1]] + 0.0722 * tabela[rgb[i + 2]];
  return lum;
}

// ------------------------------------------------------------
// Borrão gaussiano por três caixas (dá a volta em x, prende em y)
// ------------------------------------------------------------

function tamanhosDaCaixa(sigma, n) {
  const wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(wIdeal);
  if (wl % 2 === 0) wl -= 1;
  const wu = wl + 2;
  const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
  return Array.from({ length: n }, (_, i) => (i < m ? wl : wu));
}

function caixaH(src, dst, w, h, r) {
  if (r <= 0) return dst.set(src);
  const inv = 1 / (2 * r + 1);
  for (let y = 0; y < h; y += 1) {
    const l = y * w;
    let soma = 0;
    for (let x = -r; x <= r; x += 1) soma += src[l + (((x % w) + w) % w)];
    for (let x = 0; x < w; x += 1) {
      dst[l + x] = soma * inv;
      soma += src[l + ((((x + r + 1) % w) + w) % w)] - src[l + ((((x - r) % w) + w) % w)];
    }
  }
}

function caixaV(src, dst, w, h, r) {
  if (r <= 0) return dst.set(src);
  const inv = 1 / (2 * r + 1);
  for (let x = 0; x < w; x += 1) {
    let soma = 0;
    for (let y = -r; y <= r; y += 1) soma += src[Math.max(0, Math.min(h - 1, y)) * w + x];
    for (let y = 0; y < h; y += 1) {
      dst[y * w + x] = soma * inv;
      soma += src[Math.min(h - 1, y + r + 1) * w + x] - src[Math.max(0, y - r) * w + x];
    }
  }
}

function borra(src, w, h, sigma) {
  const a = new Float32Array(src.length);
  const b = new Float32Array(src.length);
  b.set(src);
  for (const t of tamanhosDaCaixa(sigma, 3)) {
    const r = (t - 1) / 2;
    caixaH(b, a, w, h, r);
    caixaV(a, b, w, h, r);
  }
  return b;
}

function reduzMetade(src, w, h) {
  const w2 = Math.floor(w / 2);
  const h2 = Math.floor(h / 2);
  const dst = new Float32Array(w2 * h2);
  for (let y = 0; y < h2; y += 1) {
    for (let x = 0; x < w2; x += 1) {
      const a = 2 * y * w + 2 * x;
      dst[y * w2 + x] = 0.25 * (src[a] + src[a + 1] + src[a + w] + src[a + w + 1]);
    }
  }
  return { img: dst, w: w2, h: h2 };
}

// ------------------------------------------------------------
// Um nível da pirâmide: o log borrado, o desvio local e a geometria
// ------------------------------------------------------------

function nivel(img, w, h, P) {
  const B = borra(img, w, h, P.sigmaDeAnalise);
  const quad = new Float32Array(B.length);
  for (let p = 0; p < B.length; p += 1) quad[p] = B[p] * B[p];
  const media = borra(B, w, h, P.sigmaDaJanelaDoDesvio);
  const mediaQ = borra(quad, w, h, P.sigmaDaJanelaDoDesvio);
  const desvio = new Float32Array(B.length);
  for (let p = 0; p < B.length; p += 1) desvio[p] = Math.sqrt(Math.max(0, mediaQ[p] - media[p] * media[p])) + P.epsDesvio;
  const dLat = Math.PI / h;
  const dLon = (2 * Math.PI) / w;
  const sinLat = new Float64Array(h);
  const cosLat = new Float64Array(h);
  for (let y = 0; y < h; y += 1) {
    const f = Math.PI / 2 - (y + 0.5) * dLat;
    sinLat[y] = Math.sin(f);
    cosLat[y] = Math.cos(f);
  }
  return { B, desvio, w, h, dLat, dLon, sinLat, cosLat };
}

function amostra(campo, w, h, x, y) {
  const x0 = Math.floor(x);
  const yc = Math.max(0, Math.min(h - 1, y));
  const y0 = Math.min(h - 2, Math.floor(yc));
  const fx = x - x0;
  const fy = yc - y0;
  const xa = ((x0 % w) + w) % w;
  const xb = (xa + 1) % w;
  const a = y0 * w;
  const b = a + w;
  return (campo[a + xa] * (1 - fx) + campo[a + xb] * fx) * (1 - fy) + (campo[b + xa] * (1 - fx) + campo[b + xb] * fx) * fy;
}

/** O ponto a `delta` rad de (lat, lon) no rumo (cos, sen do rumo a partir do norte, sentido leste). */
function destino(sf, cf, lon, cb, sb, sd, cd) {
  const s2 = sf * cd + cf * sd * cb;
  const f2 = Math.asin(Math.max(-1, Math.min(1, s2)));
  return [f2, lon + Math.atan2(sb * sd * cf, cd - sf * s2)];
}

// ------------------------------------------------------------
// 2. O voto de anel
// ------------------------------------------------------------

function candidatosDoNivel(N, oitava, P) {
  const { B, desvio, w, h, dLat, dLon, sinLat, cosLat } = N;
  // as bordas: pixels com gradiente normalizado acima do mínimo
  const n = w * h;
  const idx = new Int32Array(n);
  const cb = new Float32Array(n);
  const sb = new Float32Array(n);
  const peso = new Float32Array(n);
  let ne = 0;
  const razaoXY = dLon / dLat;
  for (let y = 1; y < h - 1; y += 1) {
    const lat = 90 - (y + 0.5) * dLat * GRAUS;
    if (Math.abs(lat) > P.latMaxDoVotoGraus) continue;
    const c = cosLat[y];
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      const gx = 0.5 * (B[y * w + ((x + 1) % w)] - B[y * w + ((x - 1 + w) % w)]);
      const gy = 0.5 * (B[p + w] - B[p - w]);
      const gE = gx / (razaoXY * c);
      const gN = -gy;
      const mod = Math.hypot(gE, gN);
      const m = mod / desvio[p];
      if (m < P.gradienteMin) continue;
      idx[ne] = p;
      cb[ne] = gN / mod;
      sb[ne] = gE / mod;
      peso[ne] = Math.min(1, m / P.gradienteRef);
      ne += 1;
    }
  }
  const raios = Array.from({ length: P.raiosPorOitava }, (_, k) => P.raioInicialPx * 2 ** (k / P.raiosPorOitava));
  const votos = (r) => {
    const A = new Float32Array(n);
    const sd = Math.sin(r * dLat);
    const cd = Math.cos(r * dLat);
    for (let e = 0; e < ne; e += 1) {
      const p = idx[e];
      const y = (p / w) | 0;
      const lon = (p - y * w + 0.5) * dLon;
      for (const sinal of [1, -1]) {
        const [f2, l2] = destino(sinLat[y], cosLat[y], lon, sinal * cb[e], sinal * sb[e], sd, cd);
        const xf = l2 / dLon - 0.5;
        const yf = (Math.PI / 2 - f2) / dLat - 0.5;
        const x0 = Math.floor(xf);
        const y0 = Math.floor(yf);
        const fx = xf - x0;
        const fy = yf - y0;
        const xa = ((x0 % w) + w) % w;
        const xb = (xa + 1) % w;
        const v = peso[e];
        if (y0 >= 0 && y0 < h) {
          A[y0 * w + xa] += v * (1 - fx) * (1 - fy);
          A[y0 * w + xb] += v * fx * (1 - fy);
        }
        if (y0 + 1 >= 0 && y0 + 1 < h) {
          A[(y0 + 1) * w + xa] += v * (1 - fx) * fy;
          A[(y0 + 1) * w + xb] += v * fx * fy;
        }
      }
    }
    const S = borra(A, w, h, 1);
    for (let p = 0; p < n; p += 1) S[p] /= r;
    return S;
  };
  // nas oitavas grossas o limiar é mais baixo: são poucos candidatos, e a cratera grande e gasta vota fraco
  const votoMin = oitava >= P.oitavaGrossa ? P.votoMinGrosso : P.votoMin;
  const cand = [];
  let ant = null;
  let atual = votos(raios[0]);
  for (let k = 0; k < raios.length; k += 1) {
    const prox = k + 1 < raios.length ? votos(raios[k + 1]) : null;
    for (let y = 1; y < h - 1; y += 1) {
      const lat = 90 - (y + 0.5) * dLat * GRAUS;
      if (Math.abs(lat) > P.latMaxGraus) continue;
      for (let x = 0; x < w; x += 1) {
        const p = y * w + x;
        const v = atual[p];
        if (v < votoMin) continue;
        let max = true;
        for (const camada of [ant, atual, prox]) {
          if (!camada) continue;
          for (let dy = -1; dy <= 1 && max; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              if (camada === atual && dx === 0 && dy === 0) continue;
              const q = (y + dy) * w + ((x + dx + w) % w);
              if (camada[q] > v || (camada[q] === v && (camada !== atual || q < p))) {
                max = false;
                break;
              }
            }
          }
          if (!max) break;
        }
        if (max) cand.push({ oitava, x, y, r: raios[k], voto: v });
      }
    }
    ant = atual;
    atual = prox;
  }
  return cand;
}

// ------------------------------------------------------------
// 3. A conferência do anel
// ------------------------------------------------------------

const S_INI = 0.25;
const S_PASSO = 0.05;
const S_N = 36; // 0,25 … 2,0
const iDe = (s) => Math.round((s - S_INI) / S_PASSO);
const AJ0 = iDe(0.3);
const AJ1 = iDe(1.8);

/** Mínimos quadrados pequenos: devolve a soma dos quadrados do resíduo de y nas colunas `base` (amostras AJ0..AJ1). */
function residuo(y, base) {
  const m = base.length;
  const A = new Float64Array(m * m);
  const b = new Float64Array(m);
  let yy = 0;
  for (let s = AJ0; s <= AJ1; s += 1) {
    yy += y[s] * y[s];
    for (let a = 0; a < m; a += 1) {
      b[a] += base[a][s] * y[s];
      for (let c = a; c < m; c += 1) A[a * m + c] += base[a][s] * base[c][s];
    }
  }
  for (let a = 0; a < m; a += 1) for (let c = 0; c < a; c += 1) A[a * m + c] = A[c * m + a];
  // Gauss com pivô parcial (m ≤ 6)
  const x = b.slice();
  const M = A.slice();
  for (let c = 0; c < m; c += 1) {
    let pv = c;
    for (let a = c + 1; a < m; a += 1) if (Math.abs(M[a * m + c]) > Math.abs(M[pv * m + c])) pv = a;
    if (Math.abs(M[pv * m + c]) < 1e-12) continue;
    if (pv !== c) {
      for (let k = 0; k < m; k += 1) [M[c * m + k], M[pv * m + k]] = [M[pv * m + k], M[c * m + k]];
      [x[c], x[pv]] = [x[pv], x[c]];
    }
    for (let a = c + 1; a < m; a += 1) {
      const f = M[a * m + c] / M[c * m + c];
      for (let k = c; k < m; k += 1) M[a * m + k] -= f * M[c * m + k];
      x[a] -= f * x[c];
    }
  }
  for (let c = m - 1; c >= 0; c -= 1) {
    if (Math.abs(M[c * m + c]) < 1e-12) {
      x[c] = 0;
      continue;
    }
    let v = x[c];
    for (let k = c + 1; k < m; k += 1) v -= M[c * m + k] * x[k];
    x[c] = v / M[c * m + c];
  }
  let bx = 0;
  for (let a = 0; a < m; a += 1) bx += b[a] * x[a];
  return Math.max(0, yy - bx);
}

const potencia = (k) => Float64Array.from({ length: S_N }, (_, s) => (S_INI + s * S_PASSO - 1) ** k);
const BASE_LISA_0 = [0, 1, 2, 3].map(potencia);
const BASE_LISA_1 = [0, 1, 2].map(potencia);

/** O anel de raio `r` (px verticais do nível `N`) em volta de (lat, lon) em rad. */
function confereAnel(N, lat, lon, r, P) {
  const { B, desvio, w, h, dLat, dLon } = N;
  const sf = Math.sin(lat);
  const cf = Math.cos(lat);
  const K = P.angulos;
  const dc = desvio[Math.min(h - 1, Math.max(0, Math.round((Math.PI / 2 - lat) / dLat - 0.5))) * w + ((Math.round(lon / dLon - 0.5) % w) + w) % w];
  const perfis = new Float64Array(K * S_N);
  for (let s = 0; s < S_N; s += 1) {
    const delta = (S_INI + s * S_PASSO) * r * dLat;
    const sd = Math.sin(delta);
    const cd = Math.cos(delta);
    for (let j = 0; j < K; j += 1) {
      const t = (2 * Math.PI * j) / K;
      const [f2, l2] = destino(sf, cf, lon, Math.cos(t), Math.sin(t), sd, cd);
      perfis[j * S_N + s] = amostra(B, w, h, l2 / dLon - 0.5, (Math.PI / 2 - f2) / dLat - 0.5) / dc;
    }
  }
  // os harmônicos 0 e 1 em ângulo, por raio, e a energia que sobra (≥ 2: textura)
  const H0 = new Float64Array(S_N);
  const C1 = new Float64Array(S_N);
  const S1 = new Float64Array(S_N);
  const C2 = new Float64Array(S_N);
  const S2 = new Float64Array(S_N);
  let alta = 0;
  for (let s = 0; s < S_N; s += 1) {
    let e = 0;
    for (let j = 0; j < K; j += 1) {
      const v = perfis[j * S_N + s];
      const t = (2 * Math.PI * j) / K;
      H0[s] += v;
      C1[s] += v * Math.cos(t);
      S1[s] += v * Math.sin(t);
      C2[s] += v * Math.cos(2 * t);
      S2[s] += v * Math.sin(2 * t);
      e += v * v;
    }
    H0[s] /= K;
    C1[s] *= 2 / K;
    S1[s] *= 2 / K;
    C2[s] *= 2 / K;
    S2[s] *= 2 / K;
    if (s >= AJ0 && s <= AJ1) alta += Math.max(0, e / K - H0[s] * H0[s] - 0.5 * (C1[s] * C1[s] + S1[s] * S1[s]));
  }
  // o FUNDO LISO e a BORDA NÍTIDA em s0 (degrau logístico e filete gaussiano de ~1 px)
  const lisaSub = residuo(H0, BASE_LISA_0) + 0.5 * (residuo(C1, BASE_LISA_1) + residuo(S1, BASE_LISA_1));
  const lisa = alta + lisaSub;
  const largDegrau = Math.max(P.larguraDoDegrau[0], P.larguraDoDegrau[1] / r);
  const largFilete = Math.max(P.larguraDoFilete[0], P.larguraDoFilete[1] / r);
  const ajusta = (s0) => {
    const degrau = Float64Array.from({ length: S_N }, (_, s) => 1 / (1 + Math.exp(-(S_INI + s * S_PASSO - s0) / largDegrau)));
    const filete = Float64Array.from({ length: S_N }, (_, s) => Math.exp(-0.5 * ((S_INI + s * S_PASSO - s0) / largFilete) ** 2));
    const cheiaSub = residuo(H0, [...BASE_LISA_0, degrau, filete]) + 0.5 * (residuo(C1, [...BASE_LISA_1, degrau, filete]) + residuo(S1, [...BASE_LISA_1, degrau, filete]));
    return { nit: lisa > 0 ? 1 - (alta + cheiaSub) / lisa : 0, explicado: lisaSub - cheiaSub };
  };
  let melhor = { nitidez: -1, s0: 1 };
  const nitidezEm = [];
  for (let s0i = iDe(0.8); s0i <= iDe(1.25); s0i += 1) {
    const s0 = S_INI + s0i * S_PASSO;
    const { nit, explicado } = ajusta(s0);
    nitidezEm.push(nit);
    if (nit > melhor.nitidez) melhor = { nitidez: nit, s0, s0i, explicado };
  }
  // a borda deste raio tem de ser a DOMINANTE no recorte: se um degrau em
  // 0,4–0,7 R ou 1,35–1,6 R explica bem mais, o anel é de outra cratera (um
  // anel falso concêntrico a uma cratera nítida) e o raio certo vem de outro voto
  let fora = 0;
  for (const s0 of [0.4, 0.5, 0.6, 0.7, 1.35, 1.45, 1.55]) fora = Math.max(fora, ajusta(s0).nit);
  const dominante = melhor.nitidez >= P.dominancia * fora;
  // o s0 refinado por parábola nos vizinhos
  const k = melhor.s0i - iDe(0.8);
  let s0 = melhor.s0;
  if (k > 0 && k < nitidezEm.length - 1) {
    const [a, b, c] = [nitidezEm[k - 1], nitidezEm[k], nitidezEm[k + 1]];
    const den = a - 2 * b + c;
    if (den < 0) s0 += S_PASSO * Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / den));
  }
  const nitidez = Math.max(0, melhor.nitidez);
  // a AMPLITUDE da borda (desvios locais): a raiz do que ela explica por amostra
  const amplitude = Math.sqrt(Math.max(0, melhor.explicado) / (AJ1 - AJ0 + 1));
  // a COBERTURA: os raios cuja |derivada| na borda (±1 amostra) passa de
  // metade da do modelo de harmônicos 0+1, com o gradiente radial ali
  const passo = 2 * S_PASSO * r;
  const si = melhor.s0i;
  let g = 0;
  let gq = 0;
  let g2q = 0;
  let tq = 0;
  for (let s = si - 3; s <= si + 3; s += 1) {
    const d0 = (H0[s + 1] - H0[s - 1]) / passo;
    const dC = (C1[s + 1] - C1[s - 1]) / passo;
    const dS = (S1[s + 1] - S1[s - 1]) / passo;
    const q = d0 * d0 + 0.5 * (dC * dC + dS * dS);
    if (Math.abs(s - si) <= 1) g = Math.max(g, Math.sqrt(q));
    gq += q;
    g2q += 0.5 * (((C2[s + 1] - C2[s - 1]) / passo) ** 2 + ((S2[s + 1] - S2[s - 1]) / passo) ** 2);
    for (let j = 0; j < K; j += 1) tq += ((perfis[j * S_N + s + 1] - perfis[j * S_N + s - 1]) / passo) ** 2 / K;
  }
  // a COERÊNCIA na faixa da borda (±0,15 R): a parte da derivada radial que é anel ou dipolo
  const coerencia = tq > 0 ? Math.sqrt(gq / tq) : 0;
  // o QUADRUPOLO na borda: a faixa reta (risco de mosaico borrado) cruza o
  // círculo dos dois lados com o mesmo sinal — harmônico 2; a cratera, não
  const quadrupolo = gq > 0 ? Math.sqrt(g2q / gq) : 1;
  let votam = 0;
  let sx = 0;
  let sy = 0;
  for (let j = 0; j < K; j += 1) {
    let e = 0;
    let sE = si;
    for (let s = si - 1; s <= si + 1; s += 1) {
      const v = Math.abs(perfis[j * S_N + s + 1] - perfis[j * S_N + s - 1]) / passo;
      if (v > e) {
        e = v;
        sE = s;
      }
    }
    if (e < 0.5 * g) continue;
    const arco = ((2 * 2 * Math.PI) / K) * (S_INI + sE * S_PASSO) * r;
    const tang = (perfis[((j + 1) % K) * S_N + sE] - perfis[((j - 1 + K) % K) * S_N + sE]) / arco;
    if (e < P.radialMin * Math.hypot(e, tang)) continue;
    votam += 1;
    const t = (2 * Math.PI * j) / K;
    sx += Math.cos(t);
    sy += Math.sin(t);
  }
  const cobertura = votam / K;
  const equilibrio = votam ? Math.hypot(sx, sy) / votam : 1;
  const rampa = (x, [a, b]) => Math.min(1, Math.max(0, (x - a) / (b - a)));
  const confianca =
    rampa(nitidez, P.nitidezRampa) *
    rampa(cobertura, P.coberturaRampa) *
    (1 - equilibrio) *
    rampa(coerencia, P.coerenciaRampa) *
    (1 - rampa(quadrupolo, P.quadrupoloRampa));
  const passa =
    dominante &&
    nitidez >= P.nitidezMin &&
    coerencia >= P.coerenciaRampa[0] &&
    quadrupolo <= P.quadrupoloMax &&
    amplitude >= P.amplitudeMin &&
    cobertura >= P.coberturaMin &&
    equilibrio <= P.equilibrioMax &&
    confianca >= P.confiancaMin;
  return { passa, dominante, nitidez, coerencia, quadrupolo, amplitude, cobertura, equilibrio, confianca, latRad: lat, lonRad: lon, raioPx: s0 * r, raioRad: s0 * r * dLat };
}

// a confiança satura em 1 nas nítidas: o desempate é a nitidez
const melhor = (a, b) => (b.confianca > a.confianca || (b.confianca === a.confianca && b.nitidez > a.nitidez) ? b : a);

/** O centro de `m` a ±passo·r nos quatro rumos, para cada passo, cada um em volta do melhor até ali. */
function ajustaCentro(N, m, passos, P) {
  for (const passo of passos) {
    const r1 = m.raioPx;
    const d = passo * r1 * N.dLat;
    const c = Math.max(0.05, Math.cos(m.latRad));
    const [lat1, lon1] = [m.latRad, m.lonRad];
    for (const [a, b] of [
      [d, 0],
      [-d, 0],
      [0, d / c],
      [0, -d / c],
    ]) {
      m = melhor(m, confereAnel(N, lat1 + a, lon1 + b, r1, P));
    }
  }
  return melhor(m, confereAnel(N, m.latRad, m.lonRad, m.raioPx, P));
}

/**
 * A conferência de um candidato um nível mais fino: o raio do voto e
 * `fatoresDeRaio` vezes ele; no melhor, o centro (`passosDoCentroRR`) e
 * uma volta final centrada no raio achado.
 */
function confere(N, cand, escalaDoNivel, P) {
  const lat = Math.PI / 2 - (cand.y + 0.5) * N.dLat * escalaDoNivel;
  const lon = (cand.x + 0.5) * N.dLon * escalaDoNivel;
  const r = cand.r * escalaDoNivel;
  let m = confereAnel(N, lat, lon, r, P);
  for (const f of P.fatoresDeRaio) if (f !== 1) m = melhor(m, confereAnel(N, lat, lon, f * r, P));
  // o voto das grandes erra mais o centro: dois passos nas oitavas grossas
  return ajustaCentro(N, m, cand.oitava >= P.oitavaGrossa ? P.passosDoCentroRR : P.passosDoCentroRR.slice(-1), P);
}

/**
 * A CONFERÊNCIA NO NÍVEL CERTO: o raio achado pode ter saído da faixa de
 * 7–14 px do nível conferido (os fatores de raio e a volta final andam até
 * 1,9× e 0,8×) — confere de novo onde ele cabe, com o raio a ±10 % e o
 * centro a ±0,15 r. `niveis[0]` é o log sem borrão do nível 0 (para os
 * raios abaixo de 7 px), `niveis[k+1]` o nível borrado k.
 */
function confereNoNivelCerto(niveis, m, P) {
  const r0 = m.raioRad / niveis[1].dLat;
  const k = r0 < 7 ? 0 : Math.min(niveis.length - 1, 1 + Math.floor(Math.log2(r0 / 7)));
  const N = niveis[k];
  const r = m.raioRad / N.dLat;
  let a = confereAnel(N, m.latRad, m.lonRad, r, P);
  for (const f of [0.9, 1.1]) a = melhor(a, confereAnel(N, m.latRad, m.lonRad, f * r, P));
  return ajustaCentro(N, a, P.passosDoCentroRR.slice(-1), P);
}

// ------------------------------------------------------------
// A detecção inteira
// ------------------------------------------------------------

/**
 * AS CRATERAS DA IMAGEM. `luminancia`: W×H linear (0–1), convenção da casa.
 * `raioKm`: o raio do corpo (a conversão de ângulo para km). Devolve
 * `{ crateras: [{ lat, lonE, diametro_km, confianca, nitidez, amplitude,
 * cobertura, equilibrio, voto, oitava }], candidatos, conferidos, parametros }`,
 * em ordem de confiança.
 */
export function detectaCrateras(luminancia, { W, H, raioKm, ...outros }) {
  const P = { ...PARAMETROS_DA_DETECCAO, ...outros };
  let img = new Float32Array(W * H);
  for (let p = 0; p < img.length; p += 1) img[p] = Math.log(luminancia[p] + P.epsLog);
  // 4. a TEXTURA FINA: |log − log borrado σ 1,5| em média numa janela σ 12 px
  const fino = borra(img, W, H, 1.5);
  for (let p = 0; p < fino.length; p += 1) fino[p] = Math.abs(img[p] - fino[p]);
  const textura = borra(fino, W, H, 12);
  const temTextura = (c) => {
    const y = Math.min(H - 1, Math.max(0, Math.round((Math.PI / 2 - c.latRad) / (Math.PI / H) - 0.5)));
    const x = ((Math.round(c.lonRad / ((2 * Math.PI) / W) - 0.5) % W) + W) % W;
    return textura[y * W + x] >= P.texturaMin;
  };
  // a pirâmide: niveis[0] = o log sem o borrão de análise (a oitava 0 confere
  // ali — o σ 1 come a borda de um raio de 4 px); niveis[k+1] = o nível k
  const niveis = [nivel(img, W, H, { ...P, sigmaDeAnalise: 0 })];
  let w = W;
  let h = H;
  for (let o = 0; o < P.oitavas && w >= 16 && h >= 8; o += 1) {
    const N = nivel(img, w, h, P);
    niveis.push(N);
    const menor = reduzMetade(N.B, w, h);
    img = menor.img;
    w = menor.w;
    h = menor.h;
  }
  let candidatos = 0;
  const conferidos = [];
  for (let o = 0; o + 1 < niveis.length; o += 1) {
    const cand = candidatosDoNivel(niveis[o + 1], o, P);
    candidatos += cand.length;
    // conferência um nível mais fino (raio de 7–12 px), depois no nível do raio achado
    for (const c of cand) {
      let r = confere(niveis[o], c, o ? 2 : 1, P);
      if (!r.passa && r.confianca < 0.5 * P.confiancaMin) continue;
      r = confereNoNivelCerto(niveis, r, P);
      if (!r.passa || !temTextura(r) || Math.abs(r.latRad) * GRAUS > P.latMaxGraus) continue;
      conferidos.push({ ...r, voto: c.voto, oitava: o });
    }
  }
  // 5. duplicatas, na ordem de confiança (o desempate é determinístico)
  conferidos.sort((a, b) => b.confianca - a.confianca || b.nitidez - a.nitidez || b.voto - a.voto || a.latRad - b.latRad || a.lonRad - b.lonRad);
  const aceitas = [];
  const D = P.duplicata;
  for (const c of conferidos) {
    const v = [Math.cos(c.latRad) * Math.cos(c.lonRad), Math.cos(c.latRad) * Math.sin(c.lonRad), Math.sin(c.latRad)];
    let dup = false;
    for (const a of aceitas) {
      const razao = a.raioRad > c.raioRad ? a.raioRad / c.raioRad : c.raioRad / a.raioRad;
      if (razao >= D.razaoDeTamanho) continue;
      const lim = D.distanciaRR * Math.max(a.raioRad, c.raioRad);
      if (Math.abs(a.latRad - c.latRad) > lim) continue;
      const cos = v[0] * a.v[0] + v[1] * a.v[1] + v[2] * a.v[2];
      if (Math.acos(Math.min(1, cos)) < lim) {
        dup = true;
        break;
      }
    }
    if (!dup) aceitas.push({ ...c, v });
  }
  const r2 = (x, k = 100) => Math.round(x * k) / k;
  const crateras = aceitas.map((a) => ({
    lat: r2(a.latRad * GRAUS),
    lonE: r2((((180 + a.lonRad * GRAUS) % 360) + 360) % 360),
    diametro_km: r2(2 * a.raioRad * raioKm),
    confianca: r2(a.confianca, 1000),
    nitidez: r2(a.nitidez, 1000),
    quadrupolo: r2(a.quadrupolo, 1000),
    coerencia: r2(a.coerencia, 1000),
    amplitude: r2(a.amplitude, 1000),
    cobertura: r2(a.cobertura, 1000),
    equilibrio: r2(a.equilibrio, 1000),
    voto: r2(a.voto, 1000),
    oitava: a.oitava,
  }));
  return { crateras, candidatos, conferidos: conferidos.length, parametros: P };
}

/** Quantas por faixa de diâmetro (km): `{ '9–15': n, … }`. */
export function contaPorFaixa(lista, limites = [9, 15, 30, 60, 120, 250, 500], campo = 'diametro_km') {
  const faixas = {};
  for (let i = 0; i < limites.length - 1; i += 1) faixas[`${limites[i]}–${limites[i + 1]}`] = 0;
  for (const c of lista) {
    const D = c[campo];
    for (let i = 0; i < limites.length - 1; i += 1) {
      if (D >= limites[i] && D < limites[i + 1]) faixas[`${limites[i]}–${limites[i + 1]}`] += 1;
    }
  }
  return faixas;
}
