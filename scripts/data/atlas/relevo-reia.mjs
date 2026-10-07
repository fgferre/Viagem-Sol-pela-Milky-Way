// ============================================================
// O RELEVO DE REIA (PLAN-REIA.md, R2) — o campo de altura em km na convenção
// da casa: o MEDIDO como base e, por cima, só o que ele não resolve. Puro e
// sem E/S: quem chama lê os bytes do TIFF e o mapa de cor.
//
//  1. A BASE é o modelo de forma SPC da Cassini (Weirich, Gaskell, Palmer &
//     Domingue 2025, PDS SBN, doi 10.26033/tqxb-q714), `rhea_radius_g.tif`:
//     2222×1111 float32, raio em metros, +leste, 0°E na borda esquerda,
//     latitude planetocêntrica. O relevo é o raio menos o elipsoide do app
//     (`BODY_AXES.rhea`, 765,0 × 763,1 × 762,4 km, a em lon 0), em km, e vai
//     à grade da casa por média de área (meia volta, sem espelho). Resolve
//     bacias, crateras com profundidade a partir de ~30 km e os grábens
//     largos; abaixo de ~15 km não tem cratera nenhuma (R1, o espectro).
//  2. AS CRATERAS FINAS são as que a foto mostra (`crateras-pela-foto.mjs`
//     no mosaico de cor, co-registrado com o DTM a ~0,2 km), filtradas ANTES
//     do miolo: só abaixo de X = 30 km (de X para cima o DTM já as tem), sem
//     diâmetro desconhecido, sem o mesmo anel em outro raio; nenhuma com
//     nome é carimbada (o Gazetteer erra 1–2° no dianteiro). Rareadas acima
//     da latitude onde o detector infla a densidade, e postas pelo miolo
//     (`completaCratera`): abaixo de 10 km a cavidade inteira da lei sobre o
//     terreno local; de 10 a 30 km só a profundidade que falta ao que o DTM
//     já mostra no lugar — nunca somada por cima.
//  3. A LEI (Aponte-Hernández et al. 2021, PSJ, 509 crateras num MDT de
//     Reia): d/D = 0,11 até 12 km (simples), 0,08 de 12 a 30 km (complexas),
//     da borda ao fundo; a borda e o desfoque são ESCOLHIDOS (como Jápeto).
//
// O vértice do app é `1 + viés + (byte/255)·escala` em raios equatoriais
// (`rochoso.ts`), multiplicado pelo elipsoide inteiro: o relevo em km ÷ a
// erra ≤ 0,34 % do próprio relevo (r/a vai de 0,9966 a 1), ASSUMIDO.
// ============================================================

import { inflateSync } from 'node:zlib';
import { latitudeDaLinha } from './relevo-inventado.mjs';
import {
  completaCratera,
  escalaEViesDaFaixa,
  morfologia,
  normalDoCampoNaFaixa,
  perfilGasto,
  quantizaNaFaixa,
  rareiaPorLatitude,
  texelEDiametroMinimo,
} from './relevo-por-foto.mjs';

/** `BODY_AXES.rhea` (km): a em lon 0 (sub-Saturno), b em lon 90, c polar. */
export const EIXOS_KM = Object.freeze([765.0, 763.1, 762.4]);
/** O raio equatorial a (km) — a unidade do vértice e o passo horizontal da normal. */
export const RAIO_KM = EIXOS_KM[0];

const RADIANOS = Math.PI / 180;

/**
 * O DTM (Weirich et al. 2025), pinado. O rótulo PDS4/GeoTIFF diz 2153,874
 * m/px (6,1868 px/°, o que daria 359,15° em 2222 px); os dados cobrem 360°
 * exatos (a costura não tem degrau e o registro com o mapa de cor não tem
 * deriva com a longitude, R1): vale 360/2222 °/px — a EXCEÇÃO cartográfica.
 */
export const DTM = Object.freeze({
  arquivo: '.cache/reia/rhea_radius_g.tif',
  sha256: 'a4d49eb12bfe5c0d97513d3d4692c78c7b5dd7179f8c2097203a37a4834bb51d',
  url: 'https://sbnarchive.psi.edu/pds4/cassini/satellite-rhea.cassini.shape-models-maps/data/rhea_radius_g.tif',
  largura: 2222,
  altura: 1111,
  bordaEsquerdaLonE: 0,
  grausPorPixel: 360 / 2222,
  rotuloMetrosPorPixel: 2153.874,
  latitude: 'planetocêntrica, como vem (não convertida; a diferença para a planetográfica é ≤ 0,195°, ~1 px do DTM)',
});

/** X: de X km para cima o DTM tem a cratera com profundidade (R1, o espectro e as com nome); as detectadas ≥ X não entram. */
export const X_KM = 30;

/**
 * A LEI DE FORMA abaixo de X (Aponte-Hernández et al. 2021; potência não
 * usada): d (borda→fundo) = 0,11·D até 12 km (simples, tigela parabólica);
 * de 12 a 30 km d = 0,96 km·(D/12) = 0,08·D (complexas, fundo plano de raio
 * 0,2 + 0,2·log10(D/12) R). Borda erguida 0,2·d (a razão de Pike, como em
 * Jápeto — ESCOLHIDA); sem pico central nem terraços abaixo de 30 km.
 */
export const LEI_DE_FORMA = Object.freeze({
  simplesAteKm: 12,
  simplesProfundidadePorD: 0.11,
  complexaProfundidadeKm: 0.96,
  complexaExpoente: 1,
  bordaPorProfundidade: 0.2,
  fundoRR: Object.freeze({ base: 0.2, porDecada: 0.2, max: 0.55 }),
  picoAcimaDeKm: X_KM,
  picoPorProfundidade: 0,
  picoRR: 0.15,
  terracosAcimaDeKm: 100,
  terracos: 0,
});

/** A degradação como em Jápeto: o perfil borrado em raio por σ = 0,05·D (a borda gasta). A lei já é a média de Reia, gastas incluídas: sem fator extra. */
export const DESFOQUE_SIGMA_POR_D = 0.05;

/**
 * COMO COMPLETAR (`completaCratera`): de 10 km para cima só a profundidade
 * que falta, medida da borda (máximo em 0,7–1,2 R, média de 36 rumos) ao
 * fundo (média em ρ ≤ 0,3) — a janela de 1,2 D. O limiar é MEDIDO (R2): nas
 * detectadas de 10–15 km o DTM já mostra ~22 % da lei (mediana) e a lei
 * inteira por cima daria ~1,2× a lei; abaixo de 10 km o DTM é liso (o
 * espectro cai > 100× de 12 para 6 km). A borda de fora some de 1,2 a 1,5 R,
 * sem manto de ejecta (ESCOLHIDO: a soma não apaga gráben nem encosta, e o
 * manto de uma cratera de < 30 km não tem número publicado).
 */
export const COMPLETAR = Object.freeze({
  completaDesdeKm: 10,
  corteRR: Object.freeze([1.2, 1.5]),
  instrumento: Object.freeze({ bordaRR: Object.freeze([0.7, 1.2]), fundoAteRR: 0.3, azimutes: 36 }),
});

/** O mesmo anel em outro raio: a detectada menor com o centro a menos de 0,5 R de uma maior e razão de tamanho < 2 sai (fica a maior: o voto erra para menos na parede de dentro). */
export const DUPLICATA = Object.freeze({ distanciaRR: 0.5, razaoDeTamanho: 2 });

/**
 * O RAREAMENTO POR LATITUDE (corrige um viés do detector MEDIDO em Reia):
 * numa textura isotrópica SEM cratera na grade do mapa (4096×2048, λ 4–32
 * km, 4 sementes), os falsos de < 30 km por km² em |lat| 30–45°, 45–60° e
 * 60–72° são 1,6×, 4,4× e 10,8× os de 0–45° (0,6–0,9× abaixo de 30°) — a
 * inflação começa em 30°, não em 45° como em Jápeto. A regra do miolo
 * (`rareiaPorLatitude`) a partir daí: por faixa de 15°, ficam as de maior
 * confiança, tantas quantas dão a densidade de 0–30°.
 */
export const RAREAMENTO_POR_LATITUDE = Object.freeze({ referenciaAteGraus: 30, faixaGraus: 15, latMaxDaDeteccaoGraus: 72 });

// ------------------------------------------------------------
// A base: o DTM lido, descontado do elipsoide e levado à grade da casa
// ------------------------------------------------------------

/**
 * Lê um TIFF de uma amostra float32: clássico little-endian, por tiras ou
 * por ladrilhos, cru ou Deflate (8/32946), sem preditor ou com o de ponto
 * flutuante (3: soma acumulada dos bytes ao longo da linha do bloco, e o
 * byte k da amostra x — do mais significativo — em `linha[k·largura + x]`).
 * É o que `rhea_radius_g.tif` é (tiras cruas) e o ETOPO 2022 da Terra
 * (ladrilhos 256×256, Deflate, preditor 3); outro formato recusa. Só as tags
 * inteiras são lidas. `{ largura, altura, valores }`.
 */
export function leTiffFloat32(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (v.getUint16(0, true) !== 0x4949 || v.getUint16(2, true) !== 42) throw new Error('o TIFF não é clássico little-endian');
  const ifd = v.getUint32(4, true);
  const tags = new Map();
  for (let n = 0, e = ifd + 2; n < v.getUint16(ifd, true); n += 1, e += 12) {
    const tipo = v.getUint16(e + 2, true);
    if (tipo !== 3 && tipo !== 4) continue;
    const conta = v.getUint32(e + 4, true);
    const tam = tipo === 3 ? 2 : 4;
    const ini = conta * tam <= 4 ? e + 8 : v.getUint32(e + 8, true);
    tags.set(
      v.getUint16(e, true),
      Array.from({ length: conta }, (_, k) => (tipo === 3 ? v.getUint16(ini + 2 * k, true) : v.getUint32(ini + 4 * k, true)))
    );
  }
  const um = (t, padrao) => tags.get(t)?.[0] ?? padrao;
  const largura = um(256);
  const altura = um(257);
  const compressao = um(259, 1);
  const preditor = um(317, 1);
  if (um(258) !== 32 || um(339) !== 3 || um(277, 1) !== 1 || ![1, 8, 32946].includes(compressao) || ![1, 3].includes(preditor)) {
    throw new Error('o TIFF não é float32 de uma amostra, cru ou Deflate, sem preditor ou com o de ponto flutuante');
  }
  const ladrilhos = tags.has(322);
  const bw = ladrilhos ? um(322) : largura;
  const porFileira = Math.ceil(largura / bw);
  const valores = new Float32Array(largura * altura);
  const linha = new Uint8Array(4 * bw);
  const lv = new DataView(linha.buffer);
  const amostra = new DataView(new ArrayBuffer(4));
  let k = 0;
  tags.get(ladrilhos ? 324 : 273).forEach((ini, b) => {
    const cru = bytes.subarray(ini, ini + tags.get(ladrilhos ? 325 : 279)[b]);
    const bloco = compressao === 1 ? cru : inflateSync(cru);
    const x0 = ladrilhos ? (b % porFileira) * bw : 0;
    const usadas = Math.min(bw, largura - x0);
    for (let y = 0; y < bloco.length / (4 * bw); y += 1) {
      const destino = ladrilhos ? (Math.floor(b / porFileira) * um(323) + y) * largura + x0 : k;
      if (destino >= valores.length) break;
      linha.set(bloco.subarray(4 * bw * y, 4 * bw * (y + 1)));
      if (preditor === 3) for (let i = 1; i < linha.length; i += 1) linha[i] = (linha[i] + linha[i - 1]) & 255;
      for (let x = 0; x < usadas; x += 1) {
        if (preditor === 3) {
          for (let c = 0; c < 4; c += 1) amostra.setUint8(c, linha[c * bw + x]);
          valores[destino + x] = amostra.getFloat32(0, false);
        } else valores[destino + x] = lv.getFloat32(4 * x, true);
      }
      k += usadas;
    }
  });
  if (k !== valores.length) throw new Error(`o TIFF tem ${k} amostras, esperava ${valores.length}`);
  return { largura, altura, valores };
}

/** O raio do elipsoide do app (km) em (lat, lonE) graus, latitude planetocêntrica. */
export function raioDoElipsoideKm(lat, lonE) {
  const f = lat * RADIANOS;
  const l = lonE * RADIANOS;
  const [a, b, c] = EIXOS_KM;
  const x = Math.cos(f) * Math.cos(l);
  const y = Math.cos(f) * Math.sin(l);
  const z = Math.sin(f);
  return 1 / Math.sqrt((x * x) / (a * a) + (y * y) / (b * b) + (z * z) / (c * c));
}

/**
 * A MÉDIA DE ÁREA de um campo da FONTE (`Wf`×`Hf`, a coluna 0 começando em
 * `bordaEsquerdaLonE`) para a grade da casa `W`×`H` (a coluna 0 começa em
 * 180°E): cada texel é a média das células da fonte pesadas pela
 * sobreposição em longitude (com a volta em 360°) e em latitude.
 */
export function reamostraParaACasa(fonte, Wf, Hf, W, H, bordaEsquerdaLonE) {
  const sx = Wf / W;
  const meio = new Float64Array(Hf * W);
  for (let x = 0; x < W; x += 1) {
    const u0 = ((((180 + (x * 360) / W - bordaEsquerdaLonE) % 360) + 360) % 360) / 360 * Wf;
    const u1 = u0 + sx;
    const pesos = [];
    for (let i = Math.floor(u0); i < Math.ceil(u1); i += 1) {
      const sobre = Math.min(u1, i + 1) - Math.max(u0, i);
      if (sobre > 1e-9) pesos.push([i % Wf, sobre / sx]);
    }
    for (let j = 0; j < Hf; j += 1) {
      let s = 0;
      for (const [i, w] of pesos) s += w * fonte[j * Wf + i];
      meio[j * W + x] = s;
    }
  }
  const sy = Hf / H;
  const campo = new Float64Array(W * H);
  for (let y = 0; y < H; y += 1) {
    const v0 = y * sy;
    const v1 = v0 + sy;
    for (let j = Math.floor(v0); j < Math.ceil(v1); j += 1) {
      const w = (Math.min(v1, j + 1) - Math.max(v0, j)) / sy;
      if (w <= 1e-9) continue;
      for (let x = 0; x < W; x += 1) campo[y * W + x] += w * meio[Math.min(Hf - 1, j) * W + x];
    }
  }
  return campo;
}

/**
 * O RELEVO MEDIDO na grade da casa (km sobre o elipsoide do app): o raio do
 * DTM (no centro de cada célula da fonte, 360/2222 °/px) menos o elipsoide,
 * pela média de área. `bytes`: o TIFF inteiro.
 */
export function relevoDoDtm(bytes, largura, altura) {
  const { largura: Wf, altura: Hf, valores: raioM } = leTiffFloat32(bytes);
  if (Wf !== DTM.largura || Hf !== DTM.altura) throw new Error(`o DTM tem ${Wf}×${Hf}, esperava ${DTM.largura}×${DTM.altura}`);
  const km = new Float64Array(Wf * Hf);
  for (let j = 0; j < Hf; j += 1) {
    const lat = 90 - (j + 0.5) * (180 / Hf);
    for (let i = 0; i < Wf; i += 1) km[j * Wf + i] = raioM[j * Wf + i] / 1000 - raioDoElipsoideKm(lat, DTM.bordaEsquerdaLonE + (i + 0.5) * DTM.grausPorPixel);
  }
  return reamostraParaACasa(km, Wf, Hf, largura, altura, DTM.bordaEsquerdaLonE);
}

// ------------------------------------------------------------
// As crateras finas
// ------------------------------------------------------------

const unitario = (lat, lonE) => [Math.cos(lat * RADIANOS) * Math.cos(lonE * RADIANOS), Math.cos(lat * RADIANOS) * Math.sin(lonE * RADIANOS), Math.sin(lat * RADIANOS)];
const anguloEntre = (u, v) => Math.acos(Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]));

/**
 * QUEM PODE ENTRAR, antes do miolo: das detectadas (`{ lat, lonE,
 * diametro_km, confianca }`), sai a de diâmetro desconhecido (ausente, 0 ou
 * não finito), a de X km ou mais (o DTM já a tem) e a menor que repete o
 * anel de uma maior (`DUPLICATA`). `{ entram, excluidas: { diametroDesconhecido,
 * xOuMais, duplicata } }` (listas).
 */
export function filtraDetectadas(detectadas) {
  const excluidas = { diametroDesconhecido: [], xOuMais: [], duplicata: [] };
  const conhecidas = [];
  for (const d of detectadas) {
    if (!(Number.isFinite(d.diametro_km) && d.diametro_km > 0)) excluidas.diametroDesconhecido.push(d);
    else conhecidas.push({ d, v: unitario(d.lat, d.lonE) });
  }
  const entram = [];
  for (const { d, v } of conhecidas) {
    if (d.diametro_km >= X_KM) {
      excluidas.xOuMais.push(d);
      continue;
    }
    const maior = conhecidas.find(
      (o) =>
        o.d.diametro_km > d.diametro_km &&
        o.d.diametro_km / d.diametro_km < DUPLICATA.razaoDeTamanho &&
        anguloEntre(v, o.v) * RAIO_KM < DUPLICATA.distanciaRR * (o.d.diametro_km / 2)
    );
    if (maior) excluidas.duplicata.push({ ...d, de: { lat: maior.d.lat, lonE: maior.d.lonE, diametro_km: maior.d.diametro_km } });
    else entram.push(d);
  }
  return { entram, excluidas };
}

/**
 * O RELEVO DE REIA em km (W×H, convenção da casa): a base `dtmKm`
 * (`relevoDoDtm` na mesma grade, copiada) e, por cima, as detectadas que
 * passam pelo filtro, cabem na grade (≥ 2 texels) e sobrevivem ao
 * rareamento, da maior para a menor, completadas pelo miolo
 * (`completaCratera`) com a lei e o desfoque de Reia.
 */
export function geraRelevo({ largura, altura, dtmKm, detectadas }) {
  const { texelKm, dMinKm } = texelEDiametroMinimo(largura, RAIO_KM);
  const filtro = filtraDetectadas(detectadas);
  const naGrade = filtro.entram.filter((d) => d.diametro_km >= dMinKm);
  const rareamento = rareiaPorLatitude(naGrade, RAREAMENTO_POR_LATITUDE, RAIO_KM);
  const crateras = rareamento.mantidas
    .map((d) => {
      const m = morfologia(d.diametro_km, 1, LEI_DE_FORMA);
      return { lat: d.lat, lonE: d.lonE, diametroKm: d.diametro_km, confianca: d.confianca, morfologia: m, perfil: perfilGasto(m, 2 * DESFOQUE_SIGMA_POR_D) };
    })
    .sort((x, y) => y.diametroKm - x.diametroKm);
  const km = Float64Array.from(dtmKm);
  const completadas = crateras.map((c) => {
    const r = completaCratera(km, largura, altura, c, RAIO_KM, COMPLETAR);
    return { lat: c.lat, lonE: c.lonE, diametroKm: c.diametroKm, confianca: c.confianca, profundidadeDaLeiKm: c.morfologia.profundidadeKm, ...r };
  });
  return {
    km,
    largura,
    altura,
    texelKm,
    dMinKm,
    filtro,
    foraDaGrade: filtro.entram.length - naGrade.length,
    rareamento: { regra: RAREAMENTO_POR_LATITUDE, densidadeDeReferencia: rareamento.densidadeDeReferencia, faixas: rareamento.faixas },
    completadas,
  };
}

// ------------------------------------------------------------
// A faixa, o byte e a normal
// ------------------------------------------------------------

/**
 * A FAIXA DO BYTE derivada do campo final: de min(p0,01 − `margemKm`, o
 * mínimo fora das calotas de |lat| > `poloGraus`) a max(p99,99 + `margemKm`,
 * o máximo fora delas), arredondada para fora a `passoKm` — só a calota pode
 * saturar. Os percentis são por área (cos lat). `{ min, max, medida }`.
 */
export function faixaDoCampo(km, largura, altura, { margemKm = 0.5, passoKm = 0.5, poloGraus = 89 } = {}) {
  const ordem = Array.from(km.keys()).sort((a, b) => km[a] - km[b]);
  const peso = (k) => Math.cos(latitudeDaLinha(Math.floor(k / largura), altura));
  const total = ordem.reduce((s, k) => s + peso(k), 0);
  const percentil = (p) => {
    let acc = 0;
    for (const k of ordem) {
      acc += peso(k);
      if (acc >= p * total) return km[k];
    }
    return km[ordem[ordem.length - 1]];
  };
  let minFora = Infinity;
  let maxFora = -Infinity;
  for (let j = 0; j < altura; j += 1) {
    if (Math.abs(latitudeDaLinha(j, altura) / RADIANOS) > poloGraus) continue;
    for (let i = 0; i < largura; i += 1) {
      minFora = Math.min(minFora, km[j * largura + i]);
      maxFora = Math.max(maxFora, km[j * largura + i]);
    }
  }
  const medida = { p0_01: percentil(0.0001), p99_99: percentil(0.9999), minForaDoPolo: minFora, maxForaDoPolo: maxFora, margemKm, passoKm, poloGraus };
  return {
    min: Math.floor(Math.min(medida.p0_01 - margemKm, minFora) / passoKm) * passoKm,
    max: Math.ceil(Math.max(medida.p99_99 + margemKm, maxFora) / passoKm) * passoKm,
    medida,
  };
}

/** Onde saturou: `{ abaixo, acima, foraDoPolo }` (foraDoPolo: os que saturaram com |lat| ≤ `poloGraus`). */
export function saturacoes(km, largura, altura, faixa, poloGraus = 89) {
  let abaixo = 0;
  let acima = 0;
  let foraDoPolo = 0;
  for (let k = 0; k < km.length; k += 1) {
    const sai = km[k] < faixa.min ? (abaixo += 1) : km[k] > faixa.max ? (acima += 1) : 0;
    if (sai && Math.abs(latitudeDaLinha(Math.floor(k / largura), altura) / RADIANOS) <= poloGraus) foraDoPolo += 1;
  }
  return { abaixo, acima, foraDoPolo };
}

/** O par (escala, viés) de `RELEVO_DA_LUA.rhea` para a faixa, em raios equatoriais (÷ a). */
export const escalaEVies = (faixa) => escalaEViesDaFaixa(faixa, RAIO_KM);

/** km → byte na faixa. */
export const quantiza = (km, faixa) => quantizaNaFaixa(km, faixa);

/** A NORMAL do mesmo campo, presa à faixa, com o ganho de 1,2 do shader descontado. */
export const normalDoCampo = (km, largura, altura, faixa) => normalDoCampoNaFaixa(km, largura, altura, faixa, RAIO_KM);
