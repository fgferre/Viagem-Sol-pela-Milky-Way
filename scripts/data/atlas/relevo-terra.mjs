// ============================================================
// O RELEVO MEDIDO DA TERRA — a normal e os dois mapas de horizonte tirados
// do ETOPO 2022 da NOAA, no lugar do `8k_earth_normal_map` do Solar System
// Scope (artístico, sem medida). Puro e sem E/S: quem chama lê os bytes do
// TIFF e grava. O conjunto de 07/10 (capturas/terra-nuvens/relevo/) saía de
// grades já reduzidas; o de hoje (item 232, 08/10, aprovado pelas fotos de
// capturas/efeitos-timidos/juntos/) sai da grade FINA da fonte.
//
//  1. A FONTE é o ETOPO 2022 v1 de 60″, SUPERFÍCIE (o topo do gelo na
//     Antártida e na Groenlândia), CC0: 21600×10800 float32 em metros sobre
//     o geoide EGM2008, por pixel (PixelIsArea), linha 0 = norte, coluna 0 =
//     −180°, 1/60° por pixel — a mesma grade da casa, sem giro.
//  2. A ÁGUA É ESPELHO, o fundo não se desenha. Os cinco lagos que o ETOPO
//     traz com batimetria (`LAGOS_COM_FUNDO`, medido: todos os outros grandes
//     lagos já vêm no nível do espelho) sobem até o nível do espelho; depois
//     tudo abaixo de 0 m vai a 0 m — o oceano, o Cáspio (−28 m) e, com eles,
//     as depressões secas (Mar Morto, Qattara, Turpan, Danakil), ASSUMIDO: na
//     grade de 4,9 km a diferença não se vê.
//  3. A NORMAL (8192) é `assaNormaisPorMediaDeArea` sobre a grade fina, no
//     raio equatorial (6378,137 km), ganho físico 1,0: a média de área do
//     gradiente de cada célula, pelo fluxo da altura nas bordas — não a
//     diferença central numa grade reduzida, que apoiava a encosta da célula
//     nas vizinhas e a alisava. O TERRA_FRAG não multiplica nada: lê
//     `tex·2 − 1` como (leste, norte, para fora), linear (`PEDIDO_DA_TERRA`:
//     `normal` é dado).
//  4. O HORIZONTE (4096) é `assaHorizonteFino`: a marcha da casa em CADA
//     amostra fina, sobre o raio esférico R + h e com a referência na altura
//     da própria amostra, e o texel guarda a média de área do seno delas. A
//     elevação sai em relação ao plano do nível do mar local, que é o que a
//     normal do elipsoide desenha. A marcha (`HORIZONTE.faixas`, em texels
//     da FONTE): meio texel (0,0083°, 0,93 km) até 1°, um texel até 3,1° —
//     nenhum relevo da Terra aparece acima do plano tangente mais longe que
//     √(2·R·Δh) ≈ 336 km (Δh = 8,85 km). Com uma referência só por célula
//     (a média dela), a amostra vizinha da mesma célula tapava o céu de
//     qualquer crista; e o shader abre a média pela lei gama da célula
//     (`GLSL_SOMBRA_PARCIAL_DO_RELEVO`). Leva perto de dez minutos em oito
//     fios (o cabeçalho de `gera-horizonte.mjs`).
// ============================================================

import { angulosDaMarcha, assaHorizonteFino } from './gera-horizonte.mjs';
import { assaNormaisPorMediaDeArea } from './gera-normal-de-dem.mjs';
import { leTiffFloat32 } from './relevo-reia.mjs';

/** O raio equatorial WGS84 (km): o passo horizontal da normal e a base do raio do horizonte. */
export const RAIO_KM = 6378.137;

/** O ETOPO 2022, pinado (`.cache/terra/FONTES.json`). */
export const ETOPO = Object.freeze({
  arquivo: '.cache/terra/ETOPO_2022_v1_60s_N90W180_surface.tif',
  sha256: '9d27d4b8ea8e76977e2988bca667d7c8fa68b927355feffcddd6b4875a7fd08e',
  bytes: 465969062,
  url: 'https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif',
  largura: 21600,
  altura: 10800,
  bordaEsquerdaLonE: 180,
  semDado: -99999,
  citacao: 'NOAA National Centers for Environmental Information. 2022: ETOPO 2022 15 Arc-Second Global Relief Model. https://doi.org/10.25921/fd45-gt74',
  licenca: 'CC0',
});

/**
 * Os lagos que o ETOPO traz com FUNDO (medido em 07/10 contra 40 grandes
 * lagos: só estes ficam dezenas a centenas de metros abaixo do espelho; os
 * outros vêm no nível dele). A semente é um ponto dentro do lago; o nível
 * é o espelho médio publicado; a área (km²) é a guarda: o enchimento que
 * passar de 1,1× ela vazou e recusa.
 */
export const LAGOS_COM_FUNDO = Object.freeze([
  Object.freeze({ nome: 'Baikal', lat: 53.3, lon: 108.0, nivelM: 456, areaKm2: 31722 }),
  Object.freeze({ nome: 'Superior', lat: 47.6, lon: -87.0, nivelM: 183, areaKm2: 82100 }),
  Object.freeze({ nome: 'Michigan–Huron', lat: 43.5, lon: -87.0, nivelM: 176, areaKm2: 117600 }),
  Object.freeze({ nome: 'Erie', lat: 42.2, lon: -81.0, nivelM: 174, areaKm2: 25700 }),
  Object.freeze({ nome: 'Ontário', lat: 43.6, lon: -77.8, nivelM: 75, areaKm2: 18960 }),
]);

/** A grade da normal: 8192 (a fonte da escada; ~4,9 km por texel no equador). */
export const NORMAL = Object.freeze({ largura: 8192, altura: 4096 });

/**
 * O horizonte: 4096×2048 (texel de 9,8 km) e a marcha fina, em faixas
 * [passo em texels da FONTE, até graus]: meio texel até 1°, um até 3,1°
 * (345 km, acima dos 336 km do limite).
 */
export const HORIZONTE = Object.freeze({
  largura: 4096,
  altura: 2048,
  faixas: Object.freeze([Object.freeze([0.5, 1]), Object.freeze([1, 3.1])]),
});

/**
 * A SUPERFÍCIE na grade da fonte, NO LUGAR (`valores` é mudado): os lagos
 * com fundo sobem ao espelho e o resto abaixo de 0 m vai a 0 m. Recusa
 * amostra sem dado. `{ lagos: [{ nome, areaKm2, subiuAteM }], abaixoDoMar }`.
 */
export function superficieDaTerra(valores, largura, altura) {
  const kmPorPasso = (Math.PI * RAIO_KM) / altura;
  const area = (k) => kmPorPasso * kmPorPasso * Math.cos(Math.PI / 2 - ((Math.floor(k / largura) + 0.5) / altura) * Math.PI);
  const lagos = LAGOS_COM_FUNDO.map(({ nome, lat, lon, nivelM, areaKm2 }) => {
    const semente = Math.floor(((90 - lat) / 180) * altura) * largura + Math.floor(((lon + 180) / 360) * largura);
    let soma = 0;
    let fundo = valores[semente];
    const pilha = valores[semente] < nivelM ? [semente] : [];
    if (pilha.length) valores[semente] = nivelM;
    while (pilha.length) {
      const k = pilha.pop();
      soma += area(k);
      if (soma > 1.1 * areaKm2) throw new Error(`o enchimento de ${nome} passou de 1,1× a área do lago: vazou`);
      const i = k % largura;
      for (const n of [k - i + ((i + 1) % largura), k - i + ((i - 1 + largura) % largura), k - largura, k + largura]) {
        if (n < 0 || n >= valores.length || !(valores[n] < nivelM)) continue;
        fundo = Math.min(fundo, valores[n]);
        valores[n] = nivelM;
        pilha.push(n);
      }
    }
    return { nome, nivelM, areaKm2: Math.round(soma), fundoM: Math.round(fundo) };
  });
  let abaixoDoMar = 0;
  for (let k = 0; k < valores.length; k += 1) {
    if (valores[k] === ETOPO.semDado || !Number.isFinite(valores[k])) throw new Error(`o ETOPO tem amostra sem dado no índice ${k}`);
    if (valores[k] < 0) {
      valores[k] = 0;
      abaixoDoMar += 1;
    }
  }
  return { lagos, abaixoDoMar };
}

/**
 * O ETOPO lido e levado à superfície: `{ largura, altura, metros, superficie }`
 * (`metros`, Float32Array na grade da fonte). `bytes`: o TIFF inteiro.
 */
export function leEtopo(bytes) {
  const { largura, altura, valores } = leTiffFloat32(bytes);
  if (largura !== ETOPO.largura || altura !== ETOPO.altura) throw new Error(`o ETOPO tem ${largura}×${altura}, esperava ${ETOPO.largura}×${ETOPO.altura}`);
  return { largura, altura, metros: valores, superficie: superficieDaTerra(valores, largura, altura) };
}

/**
 * A NORMAL (RGB linear, W·H·3) de `largura`×`altura` a partir da grade fina
 * `metros` (Wf×Hf): `assaNormaisPorMediaDeArea` no raio equatorial, ganho 1,0.
 */
export const normalDaTerra = (metros, Wf, Hf, largura, altura) =>
  assaNormaisPorMediaDeArea(metros, Wf, Hf, largura, altura, RAIO_KM * 1000);

/** Os ângulos da marcha do horizonte sobre uma grade FINA de largura `larguraDaFonte`. */
export const angulosDoHorizonte = (larguraDaFonte) => angulosDaMarcha(larguraDaFonte, { faixas: HORIZONTE.faixas });

/**
 * O HORIZONTE (`{ senos, horizon, horizon2 }`) de `largura`×`altura` a partir
 * da grade fina `metros` (Wf×Hf), sobre o raio R + h; `fios`: quantas threads
 * marcham (padrão: as do aparelho) — o mapa é o mesmo com qualquer número.
 */
export const horizonteDaTerra = (metros, Wf, Hf, largura, altura, { fios } = {}) =>
  assaHorizonteFino({
    alturaM: metros, Wf, Hf, W: largura, H: altura, raioM: RAIO_KM * 1000, angulos: angulosDoHorizonte(Wf), fios,
  });
