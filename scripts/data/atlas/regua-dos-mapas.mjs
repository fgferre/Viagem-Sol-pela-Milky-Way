// ============================================================
// A RÉGUA DOS MAPAS (PLAN-REGUA-UNICA.md, etapa R2, 10/10/2026) — a função
// ÚNICA que põe o brilho e a cor de todo mapa de corpo que reflete luz na
// medida. As medidas (o alvo de cada corpo) moram numa tabela só,
// `src/lib/atlas/reguaDosMapas.ts`; aqui mora a conta, pura: pixels + alvo →
// pixels, e os números que a ficha confessa.
//
// A REGRA, em luz LINEAR (o mapa é sRGB e o app o lê como sRGB), com toda
// média ponderada pela ÁREA (cos da latitude — o mapa é equiretangular):
//
//   tex' = g_c · tex^γ     — um γ por corpo, um ganho g por canal.
//
//  1. O NÍVEL: a média de G de tex' é p0, o albedo geométrico sem o pico de
//     oposição em 0,55 µm (como a tabela o tira de cada medida). Como o app
//     desenha p = (2/3)·tex nas duas leis de luz, todo corpo sai com a
//     mesma razão 2/3 do medido: uma constante global, confessada uma vez,
//     não compensada aqui.
//  2. A COR: as médias de B e R são p0·B/G e p0·R/G, as razões medidas
//     normalizadas pelo Sol. Com `matiz: 'foto'` (fonte em cor verdadeira no
//     visível) a variação de cor da foto fica e só a média anda; com
//     `matiz: 'tinta'` (fonte cinza, realçada em IV/UV ou pintada) o pixel
//     vira a LUMINÂNCIA dele vezes uma tinta uniforme medida — a receita que
//     era só de Ceres. Fonte de um canal é sempre tinta.
//  3. O γ: 1, ou o que faz a SEGUNDA ÂNCORA medida valer (a razão das médias
//     de G entre uma região clara e uma escura: as metades de Jápeto, a
//     Sputnik e a Cthulhu de Plutão).
//  4. O TETO, uma regra só: se mais de 0,1 % da área (o p99,9) passa de 1 no
//     canal mais alto, o γ baixa — nunca o g — até sobrar 0,1 %. A média fica
//     a medida e nada estoura; a área que estouraria no γ de antes é a
//     `fracaoComprimida`, que a ficha confessa junto do γ.
//
// IDEMPOTENTE: passada de novo sobre o próprio resultado, a régua acha as
// médias no alvo, o γ em 1 e não muda nada além do arredondamento de 8 bits.
// Exata e rápida porque tudo é tabela: na foto cada canal é um byte (256
// níveis), na tinta a luminância vai a 16 bits (65536 níveis) — as médias
// saem de histogramas ponderados e a saída de uma tabela de consulta.
// ============================================================

import { LINEAR_DO_BYTE } from './cor-europa.mjs';
import { latitudeDaLinha, longitudeDaColuna } from './relevo-inventado.mjs';

/** A fração da área que pode passar de 1 no canal mais alto (o p99,9). */
export const FRACAO_ACIMA_DO_TETO = 0.001;

/** Os pesos da luminância em luz linear (Rec. 709, os de `cor-europa.mjs`). */
const PESOS_DA_LUMINANCIA = [0.2126, 0.7152, 0.0722];
const NIVEIS_DA_TINTA = 65536;
const NIVEIS_DA_FOTO = 256;
const PASSOS_DA_BISSECCAO = 48;
const GAMA_MAXIMO_DA_ANCORA = 8;

/** Luz linear → byte sRGB, preso a [0, 255]. */
export function byteDoLinear(v) {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(255 * c)));
}

const elevado = (x, gama) => (x > 0 ? x ** gama : 0);

/** O peso de área de cada linha do equiretangular (cos da latitude do centro). */
function pesosDasLinhas(altura) {
  return Float64Array.from({ length: altura }, (_, j) => Math.cos(latitudeDaLinha(j, altura)));
}

/** Longitude leste dentro de [de, ate] andando para leste (dá a volta em 360). */
function naFaixaDeLongitude(lonE, [de, ate]) {
  const largura = (((ate - de) % 360) + 360) % 360 || 360;
  return (((lonE - de) % 360) + 360) % 360 <= largura;
}

/** As máscaras de linha e de coluna de uma região `{ lat: [s, n], lonE: [de, ate] }`. */
function mascaraDaRegiao(regiao, largura, altura) {
  const linhas = Uint8Array.from({ length: altura }, (_, j) => {
    const lat = (latitudeDaLinha(j, altura) * 180) / Math.PI;
    return lat >= regiao.lat[0] && lat <= regiao.lat[1] ? 1 : 0;
  });
  const colunas = Uint8Array.from({ length: largura }, (_, i) => (naFaixaDeLongitude(longitudeDaColuna(i, largura), regiao.lonE) ? 1 : 0));
  return { linhas, colunas };
}

/**
 * Os CÓDIGOS de cada canal (`{ arr, passo, desvio }`: o código do texel k é
 * `arr[passo·k + desvio]`) e o nível linear de cada código. Na foto, os três
 * bytes do próprio mapa (256 níveis do sRGB); na tinta, a luminância em 16
 * bits, a mesma para os três canais de saída.
 */
function codigosDoMapa(pixels, n, canais, tinta) {
  if (!tinta) {
    if (canais !== 3) throw new Error(`régua: a foto pede 3 canais (${canais}).`);
    const codigos = [0, 1, 2].map((c) => ({ arr: pixels, passo: 3, desvio: c }));
    return { codigos, niveis: [LINEAR_DO_BYTE, LINEAR_DO_BYTE, LINEAR_DO_BYTE], tamanho: NIVEIS_DA_FOTO };
  }
  const y = new Uint16Array(n);
  const [wr, wg, wb] = PESOS_DA_LUMINANCIA;
  for (let k = 0; k < n; k += 1) {
    const b = canais * k;
    const lum = canais === 1
      ? LINEAR_DO_BYTE[pixels[b]]
      : wr * LINEAR_DO_BYTE[pixels[b]] + wg * LINEAR_DO_BYTE[pixels[b + 1]] + wb * LINEAR_DO_BYTE[pixels[b + 2]];
    y[k] = Math.round(Math.min(1, lum) * (NIVEIS_DA_TINTA - 1));
  }
  const niveis = Float64Array.from({ length: NIVEIS_DA_TINTA }, (_, k) => k / (NIVEIS_DA_TINTA - 1));
  const codigo = { arr: y, passo: 1, desvio: 0 };
  return { codigos: [codigo, codigo, codigo], niveis: [niveis, niveis, niveis], tamanho: NIVEIS_DA_TINTA };
}

/** Histograma dos códigos ponderado pela área (só as linhas e colunas da máscara, se houver). */
function histograma({ arr, passo, desvio }, tamanho, largura, altura, pesos, mascara) {
  const h = new Float64Array(tamanho);
  for (let j = 0; j < altura; j += 1) {
    if (mascara && !mascara.linhas[j]) continue;
    const w = pesos[j];
    const base = j * largura;
    for (let i = 0; i < largura; i += 1) {
      if (mascara && !mascara.colunas[i]) continue;
      h[arr[passo * (base + i) + desvio]] += w;
    }
  }
  return h;
}

/** A média de nivel^γ num histograma. */
function mediaElevada(h, niveis, gama) {
  let s = 0;
  let w = 0;
  for (let k = 0; k < h.length; k += 1) {
    if (!h[k]) continue;
    s += h[k] * elevado(niveis[k], gama);
    w += h[k];
  }
  return s / w;
}

/** O γ em que a razão das médias de nivel^γ (clara ÷ escura) vale `razao`. Bissecção. */
function gamaDaAncora(hClara, hEscura, niveis, razao, rotulo) {
  const r = (g) => mediaElevada(hClara, niveis, g) / mediaElevada(hEscura, niveis, g);
  if (!(razao > 1)) throw new Error(`${rotulo}: a âncora pede razão clara/escura > 1 (${razao}).`);
  if (r(GAMA_MAXIMO_DA_ANCORA) < razao) {
    throw new Error(`${rotulo}: a região clara não chega a ${razao}× a escura nem com γ ${GAMA_MAXIMO_DA_ANCORA} (o mapa dá ${r(1).toFixed(3)} em γ 1).`);
  }
  let lo = 0;
  let hi = GAMA_MAXIMO_DA_ANCORA;
  for (let i = 0; i < PASSOS_DA_BISSECCAO; i += 1) {
    const m = (lo + hi) / 2;
    if (r(m) < razao) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

/**
 * A RÉGUA sobre um mapa. `pixels`: bytes sRGB de `canais` (1 ou 3)
 * intercalados, `largura`×`altura` equiretangular na convenção da casa;
 * `alvo`: `{ p0, BG, RG, matiz: 'foto' | 'tinta', ancora? }` (`alvoDoMapa` da
 * tabela). Pura e determinística. Devolve `{ pixels }` (RGB, 3 canais) e os
 * números: `g` [R, G, B], `gama`, `gamaAntesDoTeto` (1 ou o da âncora),
 * `fracaoComprimida` (a área acima de 1 no γ de antes, 0 sem teto),
 * `fracaoNoTeto` (a que sobra acima de 1, ≤ 0,1 %), `razaoDaAncora` (a obtida,
 * com âncora) e `medias` [R, G, B] lineares do resultado em 8 bits.
 */
export function nivelaMapa({ pixels, largura, altura, canais, alvo, rotulo = 'régua' }) {
  const n = largura * altura;
  if (pixels.length !== n * canais) throw new Error(`${rotulo}: ${pixels.length} bytes para ${largura}×${altura}×${canais}.`);
  const { p0, BG, RG, matiz, ancora } = alvo;
  if (matiz !== 'foto' && matiz !== 'tinta') throw new Error(`${rotulo}: matiz desconhecido ${matiz}.`);
  const alvoDoCanal = [p0 * RG, p0, p0 * BG];
  const tinta = matiz === 'tinta' || canais === 1;
  const pesos = pesosDasLinhas(altura);
  const { codigos, niveis, tamanho } = codigosDoMapa(pixels, n, canais, tinta);
  const hs = tinta ? [0, 0, 0].fill(histograma(codigos[1], tamanho, largura, altura, pesos)) : codigos.map((c) => histograma(c, tamanho, largura, altura, pesos));

  const ganhos = (gama) => alvoDoCanal.map((a, c) => a / mediaElevada(hs[c], niveis[c], gama));
  // a área acima de 1 em algum canal: o limiar de cada canal é o primeiro
  // código cujo g·nível^γ passa de 1 (na tinta, um limiar só, o do maior g)
  const pesoTotal = hs[1].reduce((s, v) => s + v, 0);
  const fracaoAcima = (gama) => {
    const g = ganhos(gama);
    const limiar = g.map((gc, c) => {
      let k = tamanho;
      while (k > 0 && gc * elevado(niveis[c][k - 1], gama) > 1) k -= 1;
      return k;
    });
    if (tinta) {
      const l = Math.min(...limiar);
      let s = 0;
      for (let k = l; k < tamanho; k += 1) s += hs[1][k];
      return s / pesoTotal;
    }
    let s = 0;
    const [lr, lg, lb] = limiar;
    for (let j = 0; j < altura; j += 1) {
      let linha = 0;
      for (let k = 3 * j * largura, fim = k + 3 * largura; k < fim; k += 3) {
        if (pixels[k] >= lr || pixels[k + 1] >= lg || pixels[k + 2] >= lb) linha += 1;
      }
      s += linha * pesos[j];
    }
    return s / pesoTotal;
  };

  let gamaAntesDoTeto = 1;
  if (ancora) {
    const clara = histograma(codigos[1], tamanho, largura, altura, pesos, mascaraDaRegiao(ancora.clara, largura, altura));
    const escura = histograma(codigos[1], tamanho, largura, altura, pesos, mascaraDaRegiao(ancora.escura, largura, altura));
    gamaAntesDoTeto = gamaDaAncora(clara, escura, niveis[1], ancora.razao, rotulo);
  }
  const fracaoAntes = fracaoAcima(gamaAntesDoTeto);
  let gama = gamaAntesDoTeto;
  if (fracaoAntes > FRACAO_ACIMA_DO_TETO) {
    let lo = 0;
    let hi = gamaAntesDoTeto;
    for (let i = 0; i < PASSOS_DA_BISSECCAO; i += 1) {
      const m = (lo + hi) / 2;
      if (fracaoAcima(m) <= FRACAO_ACIMA_DO_TETO) lo = m;
      else hi = m;
    }
    gama = lo;
  }
  const g = ganhos(gama);

  // a saída por tabela: cada código de cada canal vira um byte
  const tabelas = g.map((gc, c) => Uint8Array.from({ length: tamanho }, (_, k) => byteDoLinear(gc * elevado(niveis[c][k], gama))));
  const saida = new Uint8Array(3 * n);
  for (let c = 0; c < 3; c += 1) {
    const { arr, passo, desvio } = codigos[c];
    const tabela = tabelas[c];
    for (let k = 0; k < n; k += 1) saida[3 * k + c] = tabela[arr[passo * k + desvio]];
  }
  let razaoDaAncora;
  if (ancora) {
    const media = (regiao) => mediasPonderadas(saida, largura, altura, 3, regiao)[1];
    razaoDaAncora = media(ancora.clara) / media(ancora.escura);
  }
  return {
    pixels: saida,
    g,
    gama,
    gamaAntesDoTeto,
    fracaoComprimida: gama < gamaAntesDoTeto ? fracaoAntes : 0,
    fracaoNoTeto: fracaoAcima(gama),
    ...(ancora ? { razaoDaAncora } : {}),
    medias: mediasPonderadas(saida, largura, altura, 3),
  };
}

/**
 * As médias LINEARES de cada canal de um mapa sRGB de 8 bits, ponderadas pela
 * área (cos da latitude); com `regiao`, só dentro dela. [R, G, B] (ou [Y] num canal).
 */
export function mediasPonderadas(pixels, largura, altura, canais, regiao) {
  const pesos = pesosDasLinhas(altura);
  const mascara = regiao ? mascaraDaRegiao(regiao, largura, altura) : null;
  const somas = new Float64Array(canais);
  let w = 0;
  for (let j = 0; j < altura; j += 1) {
    if (mascara && !mascara.linhas[j]) continue;
    for (let i = 0; i < largura; i += 1) {
      if (mascara && !mascara.colunas[i]) continue;
      const k = canais * (j * largura + i);
      for (let c = 0; c < canais; c += 1) somas[c] += pesos[j] * LINEAR_DO_BYTE[pixels[k + c]];
      w += pesos[j];
    }
  }
  return Array.from(somas, (s) => s / w);
}
