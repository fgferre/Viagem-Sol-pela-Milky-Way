// ============================================================
// O RELEVO DE JÁPETO (item 230, etapa J1 do PLAN-EUROPA-JAPETO.md) — o
// gerador paramétrico do campo de altura, em km, sem DEM público por trás
// (Schenk "unreleased", Gaskell "planejado" em 06/10/2026). Puro e
// determinístico pela semente: a prévia aprovada é o que vai ao app.
//
// O CAMPO, nesta ordem (o que é MEDIDO e o que é INVENTADO vai escrito no
// `parametros.json` da prévia e confessado na ficha):
//  1. O ABAULADO largo sob a crista (Lopez Garcia et al. 2014: a crista
//     "assenta num abaulado largo"): +1 a +3 km, ±8° de latitude, só onde
//     há crista. Amplitude inventada, lugar medido.
//  2. A CRISTA no lugar do Gazetteer da IAU (Toledo 180,7–267,3°E,
//     Tortelosa 284,0–306,5°E, Carcassone 114,0–171,2°E e seis montes com
//     nome — MEDIDO), com o caminho em latitude traçado na linha clara que
//     o mapa de cor mostra no equador de 180 a 300°E (MEDIDO na foto). A
//     altura ao longo (13–20 km nos máximos: Giese 2008, Porco 2005) e o
//     perfil transversal sorteado por trecho com as frequências de Lopez
//     Garcia 2014 (faces de 15–16°, flancos de 3–4°) são INVENTADOS,
//     ancorados nesses números.
//  3. AS CRATERAS COM NOME do Gazetteer no lugar e no diâmetro (MEDIDO),
//     com a forma de uma lei de profundidade por diâmetro (`morfologia`,
//     ASSUMIDA e escrita), aplicadas DEPOIS da crista: dentro da cavidade
//     a crista some.
//  4. O CAMPO SORTEADO, N(>D) ∝ D^−2 (INVENTADO, semente fixa).
//
// A CONVENÇÃO DA CASA (`orientacaoNaCena.ts`): grade equiretangular, linha 0
// = +90°N, Greenwich no centro — a coluna i cai em (180 + (i+½)·360/W) mod
// 360 °E (`longitudeDaColuna` de `relevo-inventado.mjs`, reaproveitada).
// O vértice do app é `1 + viés + (byte/255)·escala` em raios equatoriais
// (`rochoso.ts`); `quantiza` leva o campo a 8 bits em [−14, +22] km e
// `escalaEVies` dá o par que vai na tabela `RELEVO_DA_LUA`. A normal sai do
// MESMO campo pela conta de `assaNormais` (`gera-normal-de-dem.mjs`), com as
// componentes tangenciais ÷ 1,2 — o shader multiplica por 1,2
// (`ESCALA_DA_NORMAL_DO_RELEVO`) e a inclinação na tela fica a física.
// O achatamento (745,7 × 712,1 km) mora na matriz do app: o campo não o tem.
// ============================================================

import { createHash } from 'node:crypto';
import { assaNormais } from './gera-normal-de-dem.mjs';
import { colunaDaLongitude, latitudeDaLinha, linhaDaLatitude, longitudeDaColuna } from './relevo-inventado.mjs';

/** O raio equatorial (km) — o passo horizontal da normal e a unidade do vértice. */
export const RAIO_KM = 745.7;
/** A faixa do byte, em km: degrau de 36/255 = 141 m. */
export const FAIXA_KM = Object.freeze({ min: -14, max: 22 });

const GRAUS = 180 / Math.PI;
const RADIANOS = Math.PI / 180;
const KM_POR_GRAU = RAIO_KM * RADIANOS;

const normaliza360 = (g) => ((g % 360) + 360) % 360;
const suave = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** O par (escala, viés) de `RELEVO_DA_LUA.iapetus`, em raios equatoriais. */
export function escalaEVies() {
  return { escala: (FAIXA_KM.max - FAIXA_KM.min) / RAIO_KM, vies: FAIXA_KM.min / RAIO_KM };
}

// ------------------------------------------------------------
// O sorteio
// ------------------------------------------------------------

/** mulberry32 — o mesmo gerador de `relevo-inventado.mjs` e `esculpido.ts`. */
function geradorDeSemente(semente) {
  let a = semente >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Um fluxo independente por camada: mudar o campo de crateras não muda a crista. */
function fluxo(semente, k) {
  let h = (semente ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return geradorDeSemente((h ^ (h >>> 16)) >>> 0);
}

const entre = (sorteia, a, b) => a + (b - a) * sorteia();

/** Ruído coerente 1D em longitude (três senoides de fase sorteada), em [−1, 1]. */
function ruidoAoLongo(sorteia, comprimentosGraus = [40, 15, 6], pesos = [1, 0.5, 0.25]) {
  const fases = comprimentosGraus.map(() => 2 * Math.PI * sorteia());
  const soma = pesos.reduce((s, p) => s + p, 0);
  return (lon) => {
    let v = 0;
    for (let k = 0; k < fases.length; k += 1) v += pesos[k] * Math.sin((2 * Math.PI * lon) / comprimentosGraus[k] + fases[k]);
    return v / soma;
  };
}

// ------------------------------------------------------------
// O que o Gazetteer da IAU dá (MEDIDO; °E, lat 0 — conferido contra
// `.cache/japeto/iapetus-gazetteer.json` pelo runner da prévia)
// ------------------------------------------------------------

export const CRISTA_DO_GAZETTEER = Object.freeze({
  carcassone: [114.0, 171.2],
  toledo: [180.7, 267.3],
  tortelosa: [284.0, 306.5],
});

export const MONTES_DO_GAZETTEER = Object.freeze([
  { nome: 'Seville Mons', lonE: 13.7, diametroKm: 69 },
  { nome: 'Cordova Mons', lonE: 153.8, diametroKm: 85 },
  { nome: 'Sorence Mons', lonE: 166.3, diametroKm: 46 },
  { nome: 'Haltile Mons', lonE: 169.6, diametroKm: 45 },
  { nome: 'Gayne Mons', lonE: 184.0, diametroKm: 65 },
  { nome: 'Valterne Mons', lonE: 189.4, diametroKm: 50 },
]);

/** Lopez Garcia et al. 2014, 506 perfis: a frequência de cada forma do corte transversal. */
export const FREQUENCIA_DOS_PERFIS = Object.freeze({
  triangular: 0.33,
  trapezoidal: 0.21,
  sela: 0.17,
  gemea: 0.14,
  coroada: 0.08,
  dissimilar: 0.07,
});

/**
 * AS ESCOLHAS da crista, em km e graus. As alturas da crista contínua são
 * frações de `alturaMaximaKm` (no candidato de 20 km elas dão os números da
 * literatura: Toledo 13–20, Tortelosa 10–15); o vão e os picos isolados são
 * absolutos (Porco 2005: picos de ~10 km fora da Cassini Regio).
 */
export const ESCOLHAS_DA_CRISTA = Object.freeze({
  toledoFracao: [0.65, 1.0],
  toledoRampaOeste: [180.7, 205.0],
  toledoInicioKm: 3,
  tortelosaFracao: [0.5, 0.75],
  vaoKm: [3, 6],
  picosDoVao: { quantos: 2, alturaKm: [6, 8], diametroKm: [40, 70] },
  picosDeCarcassone: { alturaKm: [8, 12], diametroKm: [45, 85], espacamentoKm: [30, 80], desvioLatGraus: 0.5 },
  montesAlturaKm: [8, 10],
  abaulado: { meiaLarguraGraus: 8, carcassoneKm: 1, toledoKm: [2, 3], vaoKm: 1.5, tortelosaKm: 2 },
  faceGraus: [15, 16],
  flancoGraus: [3, 4],
  flancoKm: [30, 40],
  trechoKm: [100, 200],
  transicaoKm: 40,
  bordasGraus: { toledoOeste: 1, interna: 2, tortelosaLeste: 3, abaulado: 4 },
});

// ------------------------------------------------------------
// O caminho da crista, pela linha clara do mapa de cor
// ------------------------------------------------------------

/**
 * A LATITUDE DA CRISTA por coluna da grade (graus; 0 = equador), traçada
 * no mapa de cor (`rgb` W×H, a convenção da casa): em cada coluna do mapa,
 * a resposta de linha fina clara L(y) − ½[L(y−k) + L(y+k)] (k ≈ 0,6°);
 * por coluna da grade, a soma dessas respostas numa janela de ±2° de
 * longitude, e o máximo dentro de ±`janelaLatGraus` (refinado por
 * parábola). As latitudes medidas passam pela mediana ponderada pela força
 * da linha (a altura do pico sobre a média da janela) em ±5° e por uma
 * gaussiana de σ 3°. Fora de [lonIni, lonFim] a crista volta ao equador
 * numa rampa de `rampaGraus`.
 * `{ lat, amostras: [{ lonE, latBruta, forca, latMediana, lat }] }`.
 */
export function caminhoDaCristaPeloMapa({
  rgb,
  largura,
  altura,
  canais = 3,
  larguraDaGrade,
  lonIni = 180,
  lonFim = 300,
  janelaLatGraus = 3,
  meiaJanelaLonGraus = 2,
  medianaGraus = 5,
  sigmaGraus = 3,
  rampaGraus = 8,
}) {
  const pxPorGrau = altura / 180;
  const k = Math.max(2, Math.round(0.6 * pxPorGrau));
  const yA = Math.floor(altura / 2 - janelaLatGraus * pxPorGrau);
  const yB = Math.ceil(altura / 2 + janelaLatGraus * pxPorGrau);
  const linhas = yB - yA + 1;
  const lum = (x, y) => {
    const i = (y * largura + x) * canais;
    return (rgb[i] + rgb[i + 1] + rgb[i + 2]) / 3;
  };
  const resposta = (x) => {
    const r = new Float64Array(linhas);
    for (let q = 0; q < linhas; q += 1) {
      const y = yA + q;
      r[q] = lum(x, y) - 0.5 * (lum(x, y - k) + lum(x, y + k));
    }
    return r;
  };
  const cache = new Map();
  const respostaDaColuna = (x) => {
    if (!cache.has(x)) cache.set(x, resposta(x));
    return cache.get(x);
  };
  const latDaLinha = (y) => 90 - ((y + 0.5) / altura) * 180;
  const amostras = [];
  for (let g = 0; g < larguraDaGrade; g += 1) {
    const lon = longitudeDaColuna(g, larguraDaGrade);
    if (lon < lonIni || lon > lonFim) continue;
    const xc = colunaDaLongitude(lon, largura);
    const meia = Math.round(meiaJanelaLonGraus * pxPorGrau);
    const soma = new Float64Array(linhas);
    for (let dx = -meia; dx <= meia; dx += 1) {
      const x = ((Math.round(xc) + dx) % largura + largura) % largura;
      const r = respostaDaColuna(x);
      for (let q = 0; q < linhas; q += 1) soma[q] += r[q];
    }
    let qMax = 1;
    for (let q = 1; q < linhas - 1; q += 1) if (soma[q] > soma[qMax]) qMax = q;
    const a = soma[qMax - 1];
    const b = soma[qMax];
    const c = soma[qMax + 1];
    const den = a - 2 * b + c;
    const desvio = den < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / den)) : 0;
    const media = soma.reduce((s, v) => s + v, 0) / linhas;
    amostras.push({
      g,
      lonE: lon,
      latBruta: latDaLinha(yA + qMax + desvio),
      forca: Math.max(0, (b - media) / (2 * meia + 1)),
    });
  }
  // 1º a mediana ponderada (pela força) em ±`medianaGraus`: a linha some em
  // trechos da Cassini Regio e o máximo pula de lado — a mediana não segue
  // o pulo; 2º a gaussiana, que tira o degrau entre medianas vizinhas
  for (const m of amostras) {
    const viz = amostras.filter((o) => Math.abs(o.lonE - m.lonE) <= medianaGraus).sort((a, b) => a.latBruta - b.latBruta);
    const total = viz.reduce((s, o) => s + o.forca, 0);
    let acc = 0;
    m.latMediana = viz.length ? viz[viz.length - 1].latBruta : 0;
    for (const o of viz) {
      acc += o.forca;
      if (acc >= total / 2) {
        m.latMediana = o.latBruta;
        break;
      }
    }
  }
  const lat = new Float64Array(larguraDaGrade);
  const alisada = (lon) => {
    let s = 0;
    let p = 0;
    for (const m of amostras) {
      const w = Math.exp(-0.5 * ((m.lonE - lon) / sigmaGraus) ** 2);
      s += w * m.latMediana;
      p += w;
    }
    return p > 0 ? s / p : 0;
  };
  const noIni = alisada(lonIni);
  const noFim = alisada(lonFim);
  for (let g = 0; g < larguraDaGrade; g += 1) {
    const lon = longitudeDaColuna(g, larguraDaGrade);
    if (lon >= lonIni && lon <= lonFim) lat[g] = alisada(lon);
    else if (lon > lonFim && lon < lonFim + rampaGraus) lat[g] = noFim * (1 - suave(lonFim, lonFim + rampaGraus, lon));
    else if (lon < lonIni && lon > lonIni - rampaGraus) lat[g] = noIni * suave(lonIni - rampaGraus, lonIni, lon);
  }
  for (const m of amostras) m.lat = lat[m.g];
  return { lat, amostras, k, janelaLatGraus, meiaJanelaLonGraus, medianaGraus, sigmaGraus, rampaGraus, lonIni, lonFim };
}

// ------------------------------------------------------------
// A crista: altura ao longo, abaulado, perfil transversal, picos
// ------------------------------------------------------------

/**
 * Janela suave [a, b] em longitude: sobe em a ± da e desce em b ± db. Janelas
 * vizinhas com a mesma borda e o mesmo meio-vão somam 1 (partição da unidade).
 */
function janela(lon, a, b, da, db) {
  return suave(a - da, a + da, lon) * (1 - suave(b - db, b + db, lon));
}

/** Normaliza f em [0, 1] pela amostragem densa de [a, b]. */
function normalizaNoIntervalo(f, a, b) {
  let min = Infinity;
  let max = -Infinity;
  for (let lon = a; lon <= b; lon += 0.05) {
    const v = f(lon);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return (lon) => Math.min(1, Math.max(0, (f(lon) - min) / (max - min)));
}

/**
 * O CUME (km acima da referência) e o ABAULADO ao longo da crista contínua,
 * por longitude. A crista contínua para em Toledo–vão–Tortelosa; em
 * Carcassone só os picos (e o abaulado de 1 km).
 */
function alturasAoLongo(sorteia, alturaMaximaKm) {
  const E = ESCOLHAS_DA_CRISTA;
  const [t0, t1] = CRISTA_DO_GAZETTEER.toledo;
  const [o0, o1] = CRISTA_DO_GAZETTEER.tortelosa;
  const [c0] = CRISTA_DO_GAZETTEER.carcassone; // o abaulado de Carcassone vai até Toledo (a ponte de 171–181°E)
  const bd = E.bordasGraus;
  const meioToledo = 0.5 * (t0 + t1) + entre(sorteia, -6, 6);
  const ruidoT = ruidoAoLongo(sorteia);
  const sinoT = (lon) => Math.cos((Math.PI / 2) * Math.min(1, Math.abs(lon - meioToledo) / 50)) ** 2;
  const gT = normalizaNoIntervalo((lon) => 0.55 * sinoT(lon) + 0.45 * (0.5 + 0.5 * ruidoT(lon)), E.toledoRampaOeste[1], t1);
  const [fT0, fT1] = E.toledoFracao;
  const cumeToledo = (lon) => {
    const pleno = alturaMaximaKm * (fT0 + (fT1 - fT0) * gT(lon));
    return E.toledoInicioKm + (pleno - E.toledoInicioKm) * suave(E.toledoRampaOeste[0], E.toledoRampaOeste[1], lon);
  };
  const gV = normalizaNoIntervalo(ruidoAoLongo(sorteia), t1, o0);
  const cumeVao = (lon) => E.vaoKm[0] + (E.vaoKm[1] - E.vaoKm[0]) * gV(lon);
  const meioTortelosa = 0.5 * (o0 + o1) + entre(sorteia, -3, 3);
  const ruidoO = ruidoAoLongo(sorteia, [20, 8, 4]);
  const gO = normalizaNoIntervalo(
    (lon) => 0.5 * Math.cos((Math.PI / 2) * Math.min(1, Math.abs(lon - meioTortelosa) / 20)) ** 2 + 0.5 * (0.5 + 0.5 * ruidoO(lon)),
    o0,
    o1
  );
  const [fO0, fO1] = E.tortelosaFracao;
  const cumeTortelosa = (lon) => alturaMaximaKm * (fO0 + (fO1 - fO0) * gO(lon));
  const cume = (lon) =>
    janela(lon, t0, t1, bd.toledoOeste, bd.interna) * cumeToledo(lon) +
    janela(lon, t1, o0, bd.interna, bd.interna) * cumeVao(lon) +
    janela(lon, o0, o1, bd.interna, bd.tortelosaLeste) * cumeTortelosa(lon);
  const ab = E.abaulado;
  const ruidoB = ruidoAoLongo(sorteia, [30, 12], [1, 0.5]);
  const abaulado = (lon) =>
    janela(lon, c0, t0, bd.abaulado, bd.interna) * ab.carcassoneKm +
    janela(lon, t0, t1, bd.interna, bd.interna) * (0.5 * (ab.toledoKm[0] + ab.toledoKm[1]) + 0.5 * (ab.toledoKm[1] - ab.toledoKm[0]) * ruidoB(lon)) +
    janela(lon, t1, o0, bd.interna, bd.interna) * ab.vaoKm +
    janela(lon, o0, o1, bd.interna, bd.abaulado) * ab.tortelosaKm;
  return { cume, abaulado, meioToledo, meioTortelosa };
}

/** A forma do abaulado em latitude: cos² até ±`meia` graus da linha da crista. */
const formaDoAbaulado = (dLat, meia) => (Math.abs(dLat) >= meia ? 0 : Math.cos((Math.PI / 2) * (dLat / meia)) ** 2);

/**
 * A RAMPA de um lado da crista: do cume (C km) desce pela FACE (tFace) até
 * a altura do flanco, e pelo FLANCO (tFlanco) até zero — o flanco é
 * `flancoKm` de largura e no máximo 35 % de C. `u` em km do cume.
 */
function rampa(u, C, tFace, tFlanco, flancoKm) {
  if (C <= 0) return 0;
  const hF = Math.min(flancoKm * tFlanco, 0.35 * C);
  const wF = hF / tFlanco;
  const wFace = (C - hF) / tFace;
  if (u <= wFace) return C - tFace * u;
  if (u <= wFace + wF) return hF - tFlanco * (u - wFace);
  return 0;
}

/**
 * O PERFIL TRANSVERSAL de um trecho a `s` km (com sinal: + norte) da linha
 * da crista, para um cume de C km acima do abaulado. As seis formas de
 * Lopez Garcia 2014, como as lemos (INVENTADO, escrito no parametros.json):
 * triangular (um cume), trapezoidal (topo plano de `topoKm`), sela (dois
 * ombros a ±`d` com a depressão rasa no meio), gêmea (duas cristas
 * paralelas a ±`d`, a segunda a `f` da altura), coroada (planalto a `p`·C
 * de `topoKm` com o cume estreito no meio) e dissimilar (uma face a
 * `faceGraus`, a outra a `face2Graus`).
 */
function perfilDoTrecho(t, s, C) {
  const tf = t.tFace;
  const tl = t.tFlanco;
  const w = t.flancoKm;
  const u = Math.abs(s);
  switch (t.tipo) {
    case 'trapezoidal':
      return rampa(Math.max(0, u - t.topoKm / 2), C, tf, tl, w);
    case 'sela':
      return Math.max(rampa(Math.abs(s - t.dKm), C, tf, tl, w), rampa(Math.abs(s + t.dKm), C, tf, tl, w));
    case 'gemea':
      return Math.max(rampa(Math.abs(s - t.lado * t.dKm), C, tf, tl, w), rampa(Math.abs(s + t.lado * t.dKm), t.f * C, tf, tl, w));
    case 'coroada':
      return Math.max(rampa(Math.max(0, u - t.topoKm / 2), t.p * C, tf, tl, w), rampa(u, C, tf, tl, w));
    case 'dissimilar':
      return rampa(u, C, s * t.lado >= 0 ? tf : t.tFace2, tl, w);
    default:
      return rampa(u, C, tf, tl, w);
  }
}

/** Os TRECHOS do perfil, de ~100–200 km, de `lonA` a `lonB`, com o tipo sorteado pelas frequências. */
function sorteiaTrechos(sorteia, lonA, lonB) {
  const E = ESCOLHAS_DA_CRISTA;
  const tipos = Object.entries(FREQUENCIA_DOS_PERFIS);
  const trechos = [];
  let lon = lonA;
  while (lon < lonB) {
    const comprimento = entre(sorteia, E.trechoKm[0], E.trechoKm[1]) / KM_POR_GRAU;
    let v = sorteia();
    let tipo = tipos[tipos.length - 1][0];
    for (const [nome, f] of tipos) {
      if (v < f) {
        tipo = nome;
        break;
      }
      v -= f;
    }
    const faceGraus = entre(sorteia, E.faceGraus[0], E.faceGraus[1]);
    const flancoGraus = entre(sorteia, E.flancoGraus[0], E.flancoGraus[1]);
    const t = {
      lonIni: lon,
      lonFim: Math.min(lonB, lon + comprimento),
      tipo,
      faceGraus,
      flancoGraus,
      flancoKm: entre(sorteia, E.flancoKm[0], E.flancoKm[1]),
      tFace: Math.tan(faceGraus * RADIANOS),
      tFlanco: Math.tan(flancoGraus * RADIANOS),
    };
    const lado = sorteia() < 0.5 ? -1 : 1;
    if (tipo === 'trapezoidal') t.topoKm = entre(sorteia, 20, 40);
    if (tipo === 'sela') t.dKm = entre(sorteia, 8, 12);
    if (tipo === 'gemea') Object.assign(t, { dKm: entre(sorteia, 22, 32), f: entre(sorteia, 0.75, 1), lado });
    if (tipo === 'coroada') Object.assign(t, { topoKm: entre(sorteia, 40, 60), p: entre(sorteia, 0.65, 0.8) });
    if (tipo === 'dissimilar') {
      t.face2Graus = entre(sorteia, 8, 10);
      t.tFace2 = Math.tan(t.face2Graus * RADIANOS);
      t.lado = lado;
    }
    trechos.push(t);
    lon = t.lonFim;
  }
  return trechos;
}

/** O pico isolado: rampa radial de base `raioKm` (o flanco é 30 % dela, a 3,5°) até `hKm`. */
function perfilDoPico(rKm, hKm, raioKm) {
  if (rKm >= raioKm || hKm <= 0) return 0;
  const wF = 0.3 * raioKm;
  const hF = Math.min(wF * Math.tan(3.5 * RADIANOS), 0.35 * hKm);
  const tFace = (hKm - hF) / (raioKm - wF);
  return rKm <= raioKm - wF ? hKm - tFace * rKm : hF * ((raioKm - rKm) / wF);
}

/** Os PICOS: os seis montes com nome, a cadeia sorteada de Carcassone e os do vão. */
function sorteiaPicos(sorteia) {
  const E = ESCOLHAS_DA_CRISTA;
  const picos = MONTES_DO_GAZETTEER.map((m) => ({
    nome: m.nome,
    lat: 0,
    lonE: m.lonE,
    diametroKm: m.diametroKm,
    alturaKm: entre(sorteia, E.montesAlturaKm[0], E.montesAlturaKm[1]),
    origem: 'monte com nome (lugar e tamanho do Gazetteer; altura sorteada)',
  }));
  const pc = E.picosDeCarcassone;
  const [c0, c1] = CRISTA_DO_GAZETTEER.carcassone;
  let lon = c0 + entre(sorteia, 0, pc.espacamentoKm[0]) / KM_POR_GRAU;
  while (lon < c1) {
    const diametroKm = entre(sorteia, pc.diametroKm[0], pc.diametroKm[1]);
    const alturaKm = entre(sorteia, pc.alturaKm[0], pc.alturaKm[1]);
    const lat = Math.max(-1.5, Math.min(1.5, pc.desvioLatGraus * (sorteia() + sorteia() + sorteia() - 1.5) * 2));
    const longe = picos.every((p) => Math.abs(normaliza360(p.lonE - lon + 180) - 180) * KM_POR_GRAU > 0.5 * (p.diametroKm + diametroKm) * 0.6);
    if (longe) picos.push({ lat, lonE: lon, diametroKm, alturaKm, origem: 'pico sorteado de Carcassone' });
    lon += entre(sorteia, pc.espacamentoKm[0], pc.espacamentoKm[1]) / KM_POR_GRAU;
  }
  const pv = E.picosDoVao;
  const [v0, v1] = [CRISTA_DO_GAZETTEER.toledo[1], CRISTA_DO_GAZETTEER.tortelosa[0]];
  for (let n = 0; n < pv.quantos; n += 1) {
    const lonV = v0 + ((n + 0.5 + entre(sorteia, -0.25, 0.25)) / pv.quantos) * (v1 - v0);
    picos.push({
      lat: 0,
      lonE: lonV,
      diametroKm: entre(sorteia, pv.diametroKm[0], pv.diametroKm[1]),
      alturaKm: entre(sorteia, pv.alturaKm[0], pv.alturaKm[1]),
      origem: 'pico sorteado do vão',
    });
  }
  return picos;
}

/** Visita os texels da calota de raio `raioKm` (círculo máximo) em volta de (lat, lon). */
function paraCadaTexelDaCalota(lat, lon, raioKm, largura, altura, visita) {
  const dLat = Math.PI / altura;
  const dLon = (2 * Math.PI) / largura;
  const teta = Math.min(Math.PI, raioKm / RAIO_KM);
  const cosMax = Math.cos(teta);
  const fc = lat * RADIANOS;
  const sfc = Math.sin(fc);
  const cfc = Math.cos(fc);
  const lc = lon * RADIANOS;
  const xc = colunaDaLongitude(lon, largura);
  const j0 = Math.max(0, Math.ceil((Math.PI / 2 - fc - teta) / dLat - 0.5));
  const j1 = Math.min(altura - 1, Math.floor((Math.PI / 2 - fc + teta) / dLat - 0.5));
  for (let j = j0; j <= j1; j += 1) {
    const fj = latitudeDaLinha(j, altura);
    const sj = Math.sin(fj);
    const cj = Math.cos(fj);
    const cosDl = (cosMax - sj * sfc) / (cj * cfc);
    if (cosDl > 1) continue;
    const meia = cosDl <= -1 ? Math.PI : Math.acos(cosDl);
    const ia = meia >= Math.PI ? 0 : Math.ceil(xc - meia / dLon - 1);
    const ib = meia >= Math.PI ? largura - 1 : Math.floor(xc + meia / dLon + 1);
    for (let i0 = ia; i0 <= ib; i0 += 1) {
      const i = ((i0 % largura) + largura) % largura;
      const li = longitudeDaColuna(i, largura) * RADIANOS;
      const cosTeta = Math.min(1, Math.max(-1, sj * sfc + cj * cfc * Math.cos(li - lc)));
      const rKm = Math.acos(cosTeta) * RAIO_KM;
      if (rKm < raioKm) visita(j * largura + i, rKm, j);
    }
  }
}

/**
 * A CRISTA INTEIRA no campo (km): abaulado + max(perfil da crista contínua,
 * picos). O perfil é a média de 4 amostras em latitude dentro do texel (o
 * cume não pisca de coluna a coluna quando a linha da crista anda meio
 * texel). Devolve o campo e o que foi sorteado.
 */
export function camadaDaCrista({ largura, altura, semente, alturaMaximaKm, caminho }) {
  const sorteia = fluxo(semente, 1);
  const { cume, abaulado, meioToledo, meioTortelosa } = alturasAoLongo(sorteia, alturaMaximaKm);
  const trechos = sorteiaTrechos(sorteia, CRISTA_DO_GAZETTEER.toledo[0] - 2, CRISTA_DO_GAZETTEER.tortelosa[1] + 6);
  const picos = sorteiaPicos(sorteia);
  const E = ESCOLHAS_DA_CRISTA;
  const meia = E.abaulado.meiaLarguraGraus;
  const transicao = E.transicaoKm / KM_POR_GRAU;
  const camada = new Float64Array(largura * altura);
  const abaul = new Float64Array(largura * altura);
  const latDaCrista = (i) => (caminho ? caminho[i] : 0);
  const passoLat = 180 / altura;
  const sub = [-0.375, -0.125, 0.125, 0.375];
  for (let i = 0; i < largura; i += 1) {
    const lon = longitudeDaColuna(i, largura);
    const B = abaulado(lon);
    const S = cume(lon);
    if (B <= 0 && S <= 0) continue;
    const C = Math.max(0, S - B);
    const latC = latDaCrista(i);
    const pesos = [];
    for (const t of trechos) {
      const w = janela(lon, t.lonIni, t.lonFim, transicao, transicao);
      if (w > 1e-6) pesos.push([t, w]);
    }
    const somaW = pesos.reduce((s, [, w]) => s + w, 0);
    for (let j = 0; j < altura; j += 1) {
      const lat = latitudeDaLinha(j, altura) * GRAUS;
      const dLat = lat - latC;
      if (Math.abs(dLat) > meia + 1) continue;
      const k = j * largura + i;
      abaul[k] = B * formaDoAbaulado(dLat, meia);
      if (C <= 0 || somaW <= 0) continue;
      let h = 0;
      for (const o of sub) {
        const s = (dLat + o * passoLat) * KM_POR_GRAU;
        let p = 0;
        for (const [t, w] of pesos) p += w * perfilDoTrecho(t, s, C);
        h += p / somaW;
      }
      camada[k] = h / sub.length;
    }
  }
  const sub2 = [-0.25, 0.25];
  for (const p of picos) {
    const iP = ((Math.round(colunaDaLongitude(p.lonE, largura)) % largura) + largura) % largura;
    const latC = latDaCrista(iP);
    const B = abaulado(p.lonE) * formaDoAbaulado(p.lat - latC, meia);
    p.alturaAcimaDoAbauladoKm = Math.max(0, p.alturaKm - B);
    const R = p.diametroKm / 2;
    const passoKm = (180 / altura) * KM_POR_GRAU;
    paraCadaTexelDaCalota(p.lat, p.lonE, R + passoKm, largura, altura, (k, rKm) => {
      // 2×2 sub-amostras radiais aproximadas: o raio ± ¼ de texel
      let h = 0;
      for (const a of sub2) for (const b of sub2) h += perfilDoPico(Math.hypot(rKm + a * passoKm, b * passoKm), p.alturaAcimaDoAbauladoKm, R);
      h /= 4;
      if (h > camada[k]) camada[k] = h;
    });
  }
  const campo = new Float64Array(largura * altura);
  for (let k = 0; k < campo.length; k += 1) campo[k] = abaul[k] + camada[k];
  return { campo, trechos, picos, cume, abaulado, meioToledo, meioTortelosa };
}

// ------------------------------------------------------------
// As crateras
// ------------------------------------------------------------

/**
 * A LEI DE FORMA por diâmetro (ASSUMIDA, escrita no parametros.json):
 * profundidade d (da borda ao fundo) = 0,2·D até 15 km (simples: tigela
 * parabólica); acima, d = 3 km·(D/15)^0,4 — 6,4 km em 100 km, 11 km em
 * 400 km, 14,5 km em 768 km, ancorada em Falsaron (10,5 km em 424 km,
 * White et al. 2013) e nas bacias "até 14 km" de Giese et al. 2008. Borda
 * erguida 0,2·d (4 % de D nas simples, a razão de Pike); fundo plano de
 * raio 0,2 + 0,2·log10(D/15) (até 0,55) nas complexas; pico central acima
 * de 30 km (0,3·d, raio 0,15 R); terraços sutis acima de 100 km. A
 * `degradacao` (0–1) multiplica profundidade, borda e pico.
 */
export function morfologia(diametroKm, degradacao = 1) {
  const D = diametroKm;
  const simples = D <= 15;
  const d = (simples ? 0.2 * D : 3 * (D / 15) ** 0.4) * degradacao;
  return {
    profundidadeKm: d,
    bordaKm: 0.2 * d,
    fundoRR: simples ? 0 : Math.min(0.55, 0.2 + 0.2 * Math.log10(D / 15)),
    picoKm: D > 30 ? 0.3 * d : 0,
    picoRR: 0.15,
    terracos: D > 100 ? 3 : 0,
  };
}

/** O alcance da ejecta (em R) e onde ela começa a sumir. */
const EJECTA_RR = [1.5, 2.5];

/** Quanto da parede vira escada nos terraços (sutis: 0,5 dava anéis concêntricos fortes no sombreado). */
const PESO_DOS_TERRACOS = 0.25;

/** Escada suave de n degraus em [0, 1] (os terraços). */
const escada = (t, n) => {
  const x = t * n;
  const k = Math.min(n - 1, Math.floor(x));
  return (k + suave(0.3, 0.7, x - k)) / n;
};

/** O perfil da cratera em `rho` = r/R, km relativos à referência (a média do terreno em volta). */
export function perfilDaCratera(rho, m) {
  const { profundidadeKm: d, bordaKm: hr, fundoRR: rf } = m;
  if (rho >= 1) {
    if (rho >= EJECTA_RR[1]) return 0;
    return hr * rho ** -3 * (1 - suave(EJECTA_RR[0], EJECTA_RR[1], rho));
  }
  let h;
  if (rho <= rf) h = hr - d;
  else {
    let t = (rho - rf) / (1 - rf);
    if (m.terracos) t = (1 - PESO_DOS_TERRACOS) * t + PESO_DOS_TERRACOS * escada(t, m.terracos);
    h = hr - d + d * t * t;
  }
  if (m.picoKm > 0 && rho < m.picoRR) h += m.picoKm * 0.5 * (1 + Math.cos((Math.PI * rho) / m.picoRR));
  return h;
}

/**
 * APLICA UMA CRATERA ao campo (km), no lugar: a referência é a média do
 * terreno em volta, no anel de 1 a 2 R (peso cos lat) — o "entorno" de onde
 * a profundidade se mede; com a média do disco, a bacia dentro de outra
 * bacia empilharia as duas profundidades (Falsaron dentro de Abisme ia a
 * −20 km). Dentro da cavidade o relevo antigo em volta dessa referência é
 * APAGADO (todo até 0,75 R, sumindo até a borda) — é assim que a cratera
 * corta a crista —, e soma-se o perfil; fora, soma-se a ejecta. Devolve a
 * referência usada (km).
 */
export function aplicaCratera(campo, largura, altura, c) {
  const R = c.diametroKm / 2;
  const m = c.morfologia ?? morfologia(c.diametroKm, c.degradacao ?? 1);
  const cosLat = (j) => Math.cos(latitudeDaLinha(j, altura));
  let soma = 0;
  let peso = 0;
  paraCadaTexelDaCalota(c.lat, c.lonE, 2 * R, largura, altura, (k, rKm, j) => {
    if (rKm < R) return;
    const w = cosLat(j);
    soma += w * campo[k];
    peso += w;
  });
  // anel sem centro de texel dentro (não acontece acima de 2 texels de D): o texel mais perto
  const jP = Math.min(altura - 1, Math.max(0, Math.round(linhaDaLatitude(c.lat, altura))));
  const iP = ((Math.round(colunaDaLongitude(c.lonE, largura)) % largura) + largura) % largura;
  const ref = peso > 0 ? soma / peso : campo[jP * largura + iP];
  paraCadaTexelDaCalota(c.lat, c.lonE, EJECTA_RR[1] * R, largura, altura, (k, rKm) => {
    const rho = rKm / R;
    const v = perfilDaCratera(rho, m);
    if (rho < 1) {
      const apaga = 1 - suave(0.75, 1, rho);
      campo[k] = ref + (campo[k] - ref) * (1 - apaga) + v;
    } else campo[k] += v;
  });
  return ref;
}

/**
 * A DENSIDADE do campo sorteado, N(>D) = 0,05·D^−2 por km² — R = 0,1
 * (ESCOLHA, pela foto): com 0,075 (R = 0,15) as de 40–120 km saíam cerca
 * do dobro das que o mapa de cor mostra em 60–150°E; com 0,05 ficam na
 * mesma ordem. Kirchoff & Schenk 2010 põem Jápeto como a mais craterada
 * das luas médias de Saturno; o número deles não foi conferido aqui.
 */
export const DENSIDADE_DO_CAMPO = 0.05;

/**
 * O CAMPO SORTEADO: N(>D) = `densidade`·D^−2 por km² entre `dMinKm` e
 * `dMaxKm` (a lei de inclinação −2 cumulativa = R constante = 2·densidade),
 * centro uniforme na esfera, degradação uniforme em [0,55, 1]. Rejeita a
 * sorteada que cobriria uma com nome sendo maior que min(40 km, ¼ dela).
 */
export function sorteiaCampo({ semente, densidade, dMinKm, dMaxKm, nomeadas }) {
  const sorteia = fluxo(semente, 2);
  const area = 4 * Math.PI * RAIO_KM * RAIO_KM;
  const a = dMinKm ** -2;
  const b = dMaxKm ** -2;
  const quantas = Math.round(area * densidade * (a - b));
  const lista = [];
  let rejeitadas = 0;
  const unit = (lat, lon) => [Math.cos(lat * RADIANOS) * Math.cos(lon * RADIANOS), Math.cos(lat * RADIANOS) * Math.sin(lon * RADIANOS), Math.sin(lat * RADIANOS)];
  const vn = nomeadas.map((n) => ({ n, v: unit(n.lat, n.lonE) }));
  for (let q = 0; q < quantas; q += 1) {
    const lat = Math.asin(2 * sorteia() - 1) * GRAUS;
    const lonE = 360 * sorteia();
    const diametroKm = (a - sorteia() * (a - b)) ** -0.5;
    const degradacao = entre(sorteia, 0.55, 1);
    const idade = sorteia();
    const v = unit(lat, lonE);
    const cobre = vn.some(({ n, v: w }) => {
      const dist = Math.acos(Math.min(1, v[0] * w[0] + v[1] * w[1] + v[2] * w[2])) * RAIO_KM;
      return dist < 0.5 * (n.diametroKm + diametroKm) && diametroKm > Math.min(40, 0.25 * n.diametroKm);
    });
    if (cobre) {
      rejeitadas += 1;
      continue;
    }
    lista.push({ lat, lonE, diametroKm, degradacao, idade });
  }
  return { crateras: lista, sorteadas: quantas, rejeitadas };
}

// ------------------------------------------------------------
// O relevo inteiro, a quantização e a normal
// ------------------------------------------------------------

/** A faixa equatorial onde se mede o máximo da crista (graus de latitude). */
export const FAIXA_DA_CRISTA_GRAUS = 5;

/** O máximo do campo na faixa equatorial: `{ km, lonE, lat }`. */
export function maximoDaFaixa(km, largura, altura, meiaGraus = FAIXA_DA_CRISTA_GRAUS) {
  let melhor = { km: -Infinity, lonE: 0, lat: 0 };
  for (let j = 0; j < altura; j += 1) {
    const lat = latitudeDaLinha(j, altura) * GRAUS;
    if (Math.abs(lat) > meiaGraus) continue;
    for (let i = 0; i < largura; i += 1) {
      const v = km[j * largura + i];
      if (v > melhor.km) melhor = { km: v, lonE: longitudeDaColuna(i, largura), lat };
    }
  }
  return melhor;
}

/**
 * A ALTURA DA CRISTA lida no campo, à prova de um pico de borda de cratera:
 * por coluna, o máximo da faixa equatorial; a mediana corrida de 7 colunas
 * (~32 km ao longo) tira a borda de uma cratera pequena que caiu no cume;
 * o máximo dessas medianas é a crista. `{ km, lonE }`.
 */
export function alturaDaCrista(km, largura, altura, meiaGraus = FAIXA_DA_CRISTA_GRAUS) {
  const porColuna = new Float64Array(largura).fill(-Infinity);
  for (let j = 0; j < altura; j += 1) {
    if (Math.abs(latitudeDaLinha(j, altura) * GRAUS) > meiaGraus) continue;
    for (let i = 0; i < largura; i += 1) porColuna[i] = Math.max(porColuna[i], km[j * largura + i]);
  }
  let melhor = { km: -Infinity, lonE: 0 };
  const janela7 = new Float64Array(7);
  for (let i = 0; i < largura; i += 1) {
    for (let d = -3; d <= 3; d += 1) janela7[d + 3] = porColuna[(i + d + largura) % largura];
    const mediana = janela7.slice().sort()[3];
    if (mediana > melhor.km) melhor = { km: mediana, lonE: longitudeDaColuna(i, largura) };
  }
  return melhor;
}

/** Crista + crateras para uma altura de construção (uma passada de `geraRelevo`). */
function constroi({ largura, altura, semente, alturaKm, caminho, naGrade, campoSorteado }) {
  const crista = camadaDaCrista({ largura, altura, semente, alturaMaximaKm: alturaKm, caminho });
  const campo = crista.campo.slice();
  const todas = [
    ...naGrade.map((n) => ({ ...n, degradacao: 1, chave: Math.log10(n.diametroKm) })),
    ...campoSorteado.crateras.map((c) => ({ ...c, chave: Math.log10(c.diametroKm) + 0.8 * (c.idade - 0.5) })),
  ].sort((x, y) => y.chave - x.chave);
  const colocadas = [];
  for (const c of todas) {
    const m = morfologia(c.diametroKm, c.degradacao);
    const ref = aplicaCratera(campo, largura, altura, { ...c, morfologia: m });
    if (c.nome) colocadas.push({ nome: c.nome, lat: c.lat, lonE: c.lonE, diametroKm: c.diametroKm, ...m, referenciaKm: ref });
  }
  return { campo, crista, colocadas };
}

/**
 * O RELEVO DE JÁPETO em km (W×H, convenção da casa): crista, depois todas
 * as crateras (com nome e sorteadas) em ordem de idade — a chave é
 * log10(D), mais ±0,4 sorteado nas sorteadas (as grandes tendem a ser as
 * velhas; as com nome entram na ordem do tamanho, a maior primeiro).
 * `nomeadas`: [{ nome, lat, lonE, diametroKm }]; as menores que 2 texels
 * ficam de fora (listadas em `foraDaGrade`).
 *
 * O ALVO `alturaMaximaKm` é a altura da crista DEPOIS das crateras
 * (`alturaDaCrista`): a ejecta das bacias vizinhas (Malprimis, Abisme) soma
 * ~1 km sobre o cume, e a crista é reconstruída com a altura de construção
 * corrigida por essa diferença (secante, até 4 passadas, ±0,2 km). O
 * sorteio não depende da altura: só a escala da crista contínua muda.
 */
export function geraRelevo({
  largura = 1024,
  altura = 512,
  semente,
  alturaMaximaKm,
  caminho = null,
  nomeadas = [],
  densidade = DENSIDADE_DO_CAMPO,
  dMaxKm = 120,
}) {
  const texelKm = (2 * Math.PI * RAIO_KM) / largura;
  const dMinKm = Math.max(4, 2 * texelKm);
  const naGrade = nomeadas.filter((n) => n.diametroKm >= dMinKm);
  const foraDaGrade = nomeadas.filter((n) => n.diametroKm < dMinKm).map((n) => n.nome);
  const campoSorteado = sorteiaCampo({ semente, densidade, dMinKm, dMaxKm, nomeadas: naGrade });
  const passadas = [];
  let alturaKm = alturaMaximaKm;
  let feito;
  for (let n = 0; n < 4; n += 1) {
    feito = constroi({ largura, altura, semente, alturaKm, caminho, naGrade, campoSorteado });
    const max = alturaDaCrista(feito.campo, largura, altura);
    passadas.push({ alturaDeConstrucaoKm: alturaKm, alturaDaCrista: max, maximoDaFaixa: maximoDaFaixa(feito.campo, largura, altura) });
    if (Math.abs(max.km - alturaMaximaKm) <= 0.2) break;
    const anterior = passadas[passadas.length - 2];
    const inclinacao = anterior
      ? (max.km - anterior.alturaDaCrista.km) / (alturaKm - anterior.alturaDeConstrucaoKm) || 1
      : 1;
    alturaKm += (alturaMaximaKm - max.km) / Math.max(0.3, inclinacao);
  }
  return {
    km: feito.campo,
    largura,
    altura,
    texelKm,
    dMinKm,
    crista: feito.crista,
    colocadas: feito.colocadas,
    passadas,
    foraDaGrade,
    sorteadas: campoSorteado.crateras,
    rejeitadas: campoSorteado.rejeitadas,
    densidade,
    dMaxKm,
  };
}

/** km → byte em [FAIXA_KM.min, FAIXA_KM.max]; conta os texels que saturaram. */
export function quantiza(km) {
  const { min, max } = FAIXA_KM;
  const bytes = new Uint8Array(km.length);
  let abaixo = 0;
  let acima = 0;
  for (let k = 0; k < km.length; k += 1) {
    const h = km[k];
    if (h < min) abaixo += 1;
    if (h > max) acima += 1;
    bytes[k] = Math.round(((Math.min(max, Math.max(min, h)) - min) / (max - min)) * 255);
  }
  return { bytes, abaixo, acima };
}

/** byte → km (o que o vértice do app desloca). */
export const desquantiza = (b) => FAIXA_KM.min + (b / 255) * (FAIXA_KM.max - FAIXA_KM.min);

/**
 * A NORMAL do campo (km, já presa à faixa do byte, antes do arredondamento
 * — o degrau de 141 m não vira listra na luz): `assaNormais` com a altura
 * ÷ 1,2, para que o 1,2 tangencial do shader devolva a inclinação física.
 */
export function normalDoCampo(km, largura, altura, ganhoDoShader = 1.2) {
  const { min, max } = FAIXA_KM;
  const preso = new Float64Array(km.length);
  for (let k = 0; k < km.length; k += 1) preso[k] = Math.min(max, Math.max(min, km[k])) / ganhoDoShader;
  return assaNormais(preso, largura, altura, RAIO_KM, null);
}

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
