// ============================================================
// O RELEVO EM CUBO ISIS (PLAN-TRITAO.md, 04/10/2026)
//
// O DEM de Tritão (Schenk et al. 2021, Remote Sensing 13, 3476; repositório do
// LPI/USRA, "citar quando usar") não é um GeoTIFF global como os de Plutão e
// Caronte: são dois CUBOS ISIS (o formato do USGS) de uma JANELA do globo — o
// arco medido junto do terminador da passagem da Voyager 2 —, em quilômetros,
// com furos nas marcas da câmera (reseau) e entre os quadros:
//  - `tndem-Thr-cyl-ZT151-101.cub`: estéreo + sombreado, ~4 % do globo, o melhor;
//  - `tndem-Thr-cyl_TA_Tds91.cub`: só sombreado, ~13 %, os comprimentos de onda
//    longos suprimidos (o próprio autor avisa).
// Este módulo lê o cubo (rótulo PVL + amostras Real em ladrilhos), junta os dois
// pela PRIORIDADE (o primeiro onde existe, com uma rampa na borda dele para o
// segundo não fazer degrau), tapa os furos PEQUENOS por membrana (vizinhos
// válidos, iterado) e leva a janela à grade global da casa (coluna 0 = 180°E,
// linha 0 = +90°) pela MÉDIA dos pixels do cubo que caem em cada texel; texel
// com menos da metade de pixels válidos fica no vazio.
//
// Puro: recebe bytes, devolve números.
// ============================================================

/** Os pixels especiais do ISIS em Real ficam todos perto de −3,4e38 (NULL, LRS, LIS, HIS, HRS). */
const LIMIAR_ESPECIAL = -1e30;

/** Os valores do rótulo ISIS (PVL) que o leitor usa: Core, Dimensions, Pixels e o grupo Mapping. */
export function leRotuloIsis(texto) {
  const pega = (chave, numero = true) => {
    const m = texto.match(new RegExp(`^\\s*${chave}\\s*=\\s*([^\\n<]+)`, 'm'));
    if (!m) return undefined;
    const v = m[1].trim();
    return numero ? Number(v) : v;
  };
  const mapa = {};
  const grupo = texto.match(/Group = Mapping([\s\S]*?)End_Group/);
  if (grupo) {
    for (const linha of grupo[1].split('\n')) {
      const m = linha.match(/^\s*(\w+)\s*=\s*([^<\n]+)/);
      if (!m) continue;
      const v = m[2].trim();
      mapa[m[1]] = Number.isFinite(Number(v)) ? Number(v) : v;
    }
  }
  return {
    inicio: pega('StartByte'),
    formato: pega('Format', false),
    ladrilhoX: pega('TileSamples'),
    ladrilhoY: pega('TileLines'),
    largura: pega('Samples'),
    altura: pega('Lines'),
    bandas: pega('Bands'),
    tipo: pega('Type', false),
    ordem: pega('ByteOrder', false),
    base: pega('Base'),
    multiplicador: pega('Multiplier'),
    mapa,
  };
}

/**
 * LÊ UM CUBO ISIS de uma banda, Real, little-endian, em ladrilhos (`Format = Tile`) ou em linhas
 * (`BandSequential`). Devolve `{ valores (Float32Array largura×altura, NaN nos especiais), largura, altura, mapa }`.
 */
export function leCuboIsis(bytes) {
  const r = leRotuloIsis(Buffer.from(bytes.buffer, bytes.byteOffset, Math.min(bytes.length, 65536)).toString('latin1'));
  if (r.tipo !== 'Real' || r.ordem !== 'Lsb' || r.bandas !== 1) {
    throw new Error(`leCuboIsis: só Real, Lsb, uma banda (veio ${r.tipo}, ${r.ordem}, ${r.bandas}).`);
  }
  const { largura: L, altura: A } = r;
  const valores = new Float32Array(L * A);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  const inicio = r.inicio - 1;
  const tx = r.formato === 'Tile' ? r.ladrilhoX : L;
  const ty = r.formato === 'Tile' ? r.ladrilhoY : A;
  const nx = Math.ceil(L / tx);
  const ny = Math.ceil(A / ty);
  const base = r.base ?? 0;
  const multiplicador = r.multiplicador ?? 1;
  for (let TY = 0; TY < ny; TY += 1) {
    for (let TX = 0; TX < nx; TX += 1) {
      const origem = inicio + (TY * nx + TX) * tx * ty * 4;
      for (let y = 0; y < ty; y += 1) {
        const j = TY * ty + y;
        if (j >= A) break;
        for (let x = 0; x < tx; x += 1) {
          const i = TX * tx + x;
          if (i >= L) continue;
          const v = dv.getFloat32(origem + (y * tx + x) * 4, true);
          valores[j * L + i] = v > LIMIAR_ESPECIAL && Number.isFinite(v) ? base + multiplicador * v : NaN;
        }
      }
    }
  }
  return { valores, largura: L, altura: A, mapa: r.mapa };
}

/** A distância (px, quarteirão em 8 vizinhos) de cada pixel ao NaN mais próximo de `v` — em duas varreduras. */
function distanciaAoBuraco(v, L, A) {
  const d = new Float32Array(L * A);
  for (let k = 0; k < L * A; k += 1) d[k] = Number.isFinite(v[k]) ? 1e9 : 0;
  const diag = Math.SQRT2;
  for (let j = 0; j < A; j += 1) {
    for (let i = 0; i < L; i += 1) {
      const k = j * L + i;
      if (!d[k]) continue;
      if (i > 0) d[k] = Math.min(d[k], d[k - 1] + 1);
      if (j > 0) d[k] = Math.min(d[k], d[k - L] + 1);
      if (i > 0 && j > 0) d[k] = Math.min(d[k], d[k - L - 1] + diag);
      if (i < L - 1 && j > 0) d[k] = Math.min(d[k], d[k - L + 1] + diag);
    }
  }
  for (let j = A - 1; j >= 0; j -= 1) {
    for (let i = L - 1; i >= 0; i -= 1) {
      const k = j * L + i;
      if (!d[k]) continue;
      if (i < L - 1) d[k] = Math.min(d[k], d[k + 1] + 1);
      if (j < A - 1) d[k] = Math.min(d[k], d[k + L] + 1);
      if (i < L - 1 && j < A - 1) d[k] = Math.min(d[k], d[k + L + 1] + diag);
      if (i > 0 && j < A - 1) d[k] = Math.min(d[k], d[k + L - 1] + diag);
    }
  }
  return d;
}

/**
 * JUNTA cubos da MESMA grade pela prioridade (o primeiro onde existe); onde o de cima acaba, uma rampa de
 * `rampaPx` (smoothstep da distância à borda dele) o mistura com o de baixo, para não haver degrau. Fora de
 * todos, NaN.
 */
export function juntaCubos(cubos, rampaPx = 20) {
  const { largura: L, altura: A } = cubos[0];
  for (const c of cubos) {
    if (c.largura !== L || c.altura !== A) throw new Error('juntaCubos: os cubos precisam da mesma grade.');
  }
  const saida = Float32Array.from(cubos[cubos.length - 1].valores);
  for (let q = cubos.length - 2; q >= 0; q -= 1) {
    const de = cubos[q].valores;
    const d = distanciaAoBuraco(de, L, A);
    for (let k = 0; k < L * A; k += 1) {
      if (!Number.isFinite(de[k])) continue;
      if (!Number.isFinite(saida[k])) {
        saida[k] = de[k];
        continue;
      }
      const u = Math.min(1, d[k] / rampaPx);
      const w = u * u * (3 - 2 * u);
      saida[k] = w * de[k] + (1 - w) * saida[k];
    }
  }
  return saida;
}

/**
 * TAPA OS FUROS PEQUENOS (componentes de NaN em 4 vizinhos com até `areaMaximaPx` pixels e que não tocam a borda
 * da janela) pela membrana: cada pixel do furo vira a média dos vizinhos, `passadas` vezes, começando da média
 * da borda do furo. Os furos grandes (entre quadros, fora da cobertura) continuam NaN. Devolve quantos tapou.
 */
export function tapaFurosPequenos(v, L, A, { areaMaximaPx = 400, passadas = 200 } = {}) {
  const visto = new Uint8Array(L * A);
  let tapados = 0;
  const pilha = [];
  for (let k0 = 0; k0 < L * A; k0 += 1) {
    if (visto[k0] || Number.isFinite(v[k0])) continue;
    const membros = [];
    let tocaBorda = false;
    pilha.push(k0);
    visto[k0] = 1;
    while (pilha.length) {
      const k = pilha.pop();
      membros.push(k);
      const i = k % L;
      const j = (k - i) / L;
      if (i === 0 || j === 0 || i === L - 1 || j === A - 1) tocaBorda = true;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + di;
        const jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= L || jj >= A) continue;
        const kk = jj * L + ii;
        if (!visto[kk] && !Number.isFinite(v[kk])) {
          visto[kk] = 1;
          pilha.push(kk);
        }
      }
    }
    if (tocaBorda || membros.length > areaMaximaPx) continue;
    // a média da borda como partida, depois Jacobi sobre o furo
    let soma = 0;
    let conta = 0;
    for (const k of membros) {
      for (const kk of [k - 1, k + 1, k - L, k + L]) {
        if (Number.isFinite(v[kk])) {
          soma += v[kk];
          conta += 1;
        }
      }
    }
    const partida = conta ? soma / conta : 0;
    const furo = new Float32Array(membros.length).fill(partida);
    const indice = new Map(membros.map((k, q) => [k, q]));
    const ler = (kk) => (indice.has(kk) ? furo[indice.get(kk)] : v[kk]);
    for (let p = 0; p < passadas; p += 1) {
      const novo = new Float32Array(membros.length);
      membros.forEach((k, q) => {
        novo[q] = 0.25 * (ler(k - 1) + ler(k + 1) + ler(k - L) + ler(k + L));
      });
      furo.set(novo);
    }
    membros.forEach((k, q) => {
      v[k] = furo[q];
    });
    tapados += membros.length;
  }
  return tapados;
}

/**
 * A JANELA NA GRADE GLOBAL DA CASA (L×A; coluna 0 = 180°E, leste para a direita; linha 0 = +90°): cada texel é a
 * média dos pixels do cubo (cilíndrica simples, `mapa` do rótulo: MinimumLongitude, MaximumLatitude e Scale em
 * px/grau, longitudes de −180 a 180 ou 0 a 360) cujo CENTRO cai nele, ignorando NaN; com menos de `fracaoMinima`
 * dos pixels válidos, o texel fica no vazio. `escala` converte a unidade do cubo em metros (km → 1000).
 * Devolve `{ metros (Float32Array, 0 no vazio), vazio (Uint8Array, 1 = sem dado) }`.
 */
export function janelaNaGrade(valores, largura, altura, mapa, L, A, { escala = 1, fracaoMinima = 0.5 } = {}) {
  const soma = new Float64Array(L * A);
  const validos = new Uint32Array(L * A);
  const total = new Uint32Array(L * A);
  const pxGrau = mapa.Scale;
  for (let j = 0; j < altura; j += 1) {
    const lat = mapa.MaximumLatitude - (j + 0.5) / pxGrau;
    const J = Math.floor(((90 - lat) / 180) * A);
    if (J < 0 || J >= A) continue;
    for (let i = 0; i < largura; i += 1) {
      const lon = mapa.MinimumLongitude + (i + 0.5) / pxGrau;
      const I = Math.floor((((((lon - 180) % 360) + 360) % 360) / 360) * L);
      const c = J * L + Math.min(L - 1, I);
      total[c] += 1;
      const v = valores[j * largura + i];
      if (Number.isFinite(v)) {
        soma[c] += v;
        validos[c] += 1;
      }
    }
  }
  const metros = new Float32Array(L * A);
  const vazio = new Uint8Array(L * A).fill(1);
  for (let c = 0; c < L * A; c += 1) {
    if (!total[c] || validos[c] < fracaoMinima * total[c]) continue;
    metros[c] = (escala * soma[c]) / validos[c];
    vazio[c] = 0;
  }
  return { metros, vazio };
}
