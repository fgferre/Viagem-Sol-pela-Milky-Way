// ============================================================
// O RELEVO POR FOTO — o miolo dos relevos cujas crateras finas vêm da foto (Jápeto, sem DEM; Reia, sobre o DTM), puro e sem constante de corpo.
// ENTRA: a grade W×H na convenção do app, o raio equatorial, a camada própria do corpo em km (a crista de Jápeto; nula = chão
//   liso), as crateras com nome (Gazetteer) e as detectadas na foto (`crateras-pela-foto.mjs`), e as leis do corpo (forma por D, desgaste, rareamento).
// SAI: `geraRelevoPorFoto` — o campo em km (a camada + as crateras da maior para a menor) e a confissão do que entrou, saiu e onde;
//   `completaCratera` — a cratera sobre uma base MEDIDA (Reia): soma só a profundidade que falta, sem apagar a base;
//   `quantizaNaFaixa` (km → byte em [hmin, hmax]), `escalaEViesDaFaixa` (o par do vértice) e `normalDoCampoNaFaixa` (a normal do MESMO campo).
// ============================================================

import { createHash } from 'node:crypto';
import { assaNormais } from './gera-normal-de-dem.mjs';
import { amostraBilinear, colunaDaLongitude, latitudeDaLinha, linhaDaLatitude, longitudeDaColuna } from './relevo-inventado.mjs';

const RADIANOS = Math.PI / 180;

/** A rampa suave (smoothstep) de 0 em `a` a 1 em `b`. */
export const suave = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ------------------------------------------------------------
// A grade: a convenção da casa (`orientacaoNaCena.ts`) — linha 0 = +90°N,
// Greenwich no centro, a coluna i em (180 + (i+½)·360/W) mod 360 °E
// (`longitudeDaColuna` de `relevo-inventado.mjs`, reaproveitada)
// ------------------------------------------------------------

/** Visita os texels da calota de raio `raioKm` (círculo máximo) em volta de (lat, lon), num corpo de raio `raioDoCorpoKm`. */
export function paraCadaTexelDaCalota(lat, lon, raioKm, largura, altura, raioDoCorpoKm, visita) {
  const dLat = Math.PI / altura;
  const dLon = (2 * Math.PI) / largura;
  const teta = Math.min(Math.PI, raioKm / raioDoCorpoKm);
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
      const rKm = Math.acos(cosTeta) * raioDoCorpoKm;
      if (rKm < raioKm) visita(j * largura + i, rKm, j);
    }
  }
}

// ------------------------------------------------------------
// As crateras
// ------------------------------------------------------------

/**
 * A FORMA por diâmetro, pela `lei` do corpo: profundidade d (da borda ao
 * fundo) = `simplesProfundidadePorD`·D até `simplesAteKm` (simples: tigela
 * parabólica); acima, d = `complexaProfundidadeKm`·(D/`simplesAteKm`)^
 * `complexaExpoente`. Borda erguida `bordaPorProfundidade`·d; fundo plano de
 * raio `fundoRR.base` + `fundoRR.porDecada`·log10(D/`simplesAteKm`) (até
 * `fundoRR.max`) nas complexas; pico central acima de `picoAcimaDeKm`
 * (`picoPorProfundidade`·d, raio `picoRR`·R); `terracos` degraus acima de
 * `terracosAcimaDeKm`. A `degradacao` (0–1) multiplica profundidade, borda
 * e pico.
 */
export function morfologia(diametroKm, degradacao, lei) {
  const D = diametroKm;
  const simples = D <= lei.simplesAteKm;
  const d = (simples ? lei.simplesProfundidadePorD * D : lei.complexaProfundidadeKm * (D / lei.simplesAteKm) ** lei.complexaExpoente) * degradacao;
  return {
    profundidadeKm: d,
    bordaKm: lei.bordaPorProfundidade * d,
    fundoRR: simples ? 0 : Math.min(lei.fundoRR.max, lei.fundoRR.base + lei.fundoRR.porDecada * Math.log10(D / lei.simplesAteKm)),
    picoKm: D > lei.picoAcimaDeKm ? lei.picoPorProfundidade * d : 0,
    picoRR: lei.picoRR,
    terracos: D > lei.terracosAcimaDeKm ? lei.terracos : 0,
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
 * O PERFIL GASTO: `perfilDaCratera` borrado em raio por uma gaussiana de
 * σ = `sigmaRR`·R (a borda arredondada de uma cratera velha; o borrão em
 * raio é o 2D longe do centro, e no centro o perfil é espelhado). Tabelado
 * de 0 a 2,5 R em passos de 0,005 R. Devolve ρ → km.
 */
export function perfilGasto(m, sigmaRR) {
  const passo = 0.005;
  const n = Math.round(EJECTA_RR[1] / passo) + 1;
  const bruto = (rho) => perfilDaCratera(Math.abs(rho), m);
  const k = Math.ceil((3 * sigmaRR) / passo);
  const pesos = Array.from({ length: 2 * k + 1 }, (_, i) => Math.exp(-0.5 * (((i - k) * passo) / sigmaRR) ** 2));
  const soma = pesos.reduce((s, p) => s + p, 0);
  const tabela = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    let v = 0;
    for (let q = -k; q <= k; q += 1) v += pesos[q + k] * bruto((i + q) * passo);
    tabela[i] = v / soma;
  }
  return (rho) => {
    if (rho >= EJECTA_RR[1]) return 0;
    const x = rho / passo;
    const i = Math.min(n - 2, Math.floor(x));
    return tabela[i] + (tabela[i + 1] - tabela[i]) * (x - i);
  };
}

/**
 * APLICA UMA CRATERA ao campo (km), no lugar: a referência é a média do
 * terreno em volta, no anel de 1 a 2 R (peso cos lat) — o "entorno" de onde
 * a profundidade se mede; com a média do disco, a bacia dentro de outra
 * bacia empilharia as duas profundidades (Falsaron dentro de Abisme, em
 * Jápeto, ia a −20 km). Dentro da cavidade o relevo antigo em volta dessa
 * referência é APAGADO (todo até 0,75 R, sumindo até a borda) — é assim que
 * a cratera corta a crista —, e soma-se o perfil; fora, soma-se a ejecta.
 * `c`: { lat, lonE, diametroKm, morfologia } e, se vier, `perfil` (ρ → km),
 * que troca o perfil da lei (a cratera gasta). Devolve a referência (km).
 */
export function aplicaCratera(campo, largura, altura, c, raioDoCorpoKm) {
  const R = c.diametroKm / 2;
  const perfil = c.perfil ?? ((rho) => perfilDaCratera(rho, c.morfologia));
  const cosLat = (j) => Math.cos(latitudeDaLinha(j, altura));
  let soma = 0;
  let peso = 0;
  paraCadaTexelDaCalota(c.lat, c.lonE, 2 * R, largura, altura, raioDoCorpoKm, (k, rKm, j) => {
    if (rKm < R) return;
    const w = cosLat(j);
    soma += w * campo[k];
    peso += w;
  });
  // anel sem centro de texel dentro (não acontece acima de 2 texels de D): o texel mais perto
  const jP = Math.min(altura - 1, Math.max(0, Math.round(linhaDaLatitude(c.lat, altura))));
  const iP = ((Math.round(colunaDaLongitude(c.lonE, largura)) % largura) + largura) % largura;
  const ref = peso > 0 ? soma / peso : campo[jP * largura + iP];
  paraCadaTexelDaCalota(c.lat, c.lonE, EJECTA_RR[1] * R, largura, altura, raioDoCorpoKm, (k, rKm) => {
    const rho = rKm / R;
    const v = perfil(rho);
    if (rho < 1) {
      const apaga = 1 - suave(0.75, 1, rho);
      campo[k] = ref + (campo[k] - ref) * (1 - apaga) + v;
    } else campo[k] += v;
  });
  return ref;
}

/** O ponto a `distKm` no rumo `rumo` (rad, de N para L) de (lat, lonE) em graus, na esfera de `raioKm`: [lat em rad, lonE em graus]. */
function destinoNaEsfera(lat, lonE, distKm, rumo, raioKm) {
  const d = distKm / raioKm;
  const f1 = lat * RADIANOS;
  const f2 = Math.asin(Math.sin(f1) * Math.cos(d) + Math.cos(f1) * Math.sin(d) * Math.cos(rumo));
  const dl = Math.atan2(Math.sin(rumo) * Math.sin(d) * Math.cos(f1), Math.cos(d) - Math.sin(f1) * Math.sin(f2));
  return [f2, lonE + dl / RADIANOS];
}

/**
 * A PROFUNDIDADE DA BORDA AO FUNDO por um só instrumento, no perfil da lei e
 * no campo medido (a diferença das duas só vale se a conta for a mesma): a
 * borda é a média, em `azimutes` rumos, do máximo em ρ ∈ `bordaRR`; o fundo
 * é a média no disco ρ ≤ `fundoAteRR` (três anéis, pesados pela área). A
 * média em volta cancela o declive: num plano inclinado sem cratera dá
 * ≈ 0,16·R·inclinação, contra 2,2·R·inclinação do máximo − mínimo da janela.
 * `alturaEm(ρ, rumo)` → km.
 */
export function profundidadeBordaFundo(alturaEm, instrumento) {
  const { bordaRR, fundoAteRR, azimutes } = instrumento;
  const passos = Math.round((bordaRR[1] - bordaRR[0]) / 0.05);
  let borda = 0;
  let fundo = 0;
  let pesoDoFundo = 0;
  for (let a = 0; a < azimutes; a += 1) {
    const rumo = (2 * Math.PI * a) / azimutes;
    let max = -Infinity;
    for (let q = 0; q <= passos; q += 1) max = Math.max(max, alturaEm(bordaRR[0] + ((bordaRR[1] - bordaRR[0]) * q) / passos, rumo));
    borda += max;
    for (const t of [1 / 6, 1 / 2, 5 / 6]) {
      fundo += t * alturaEm(t * fundoAteRR, rumo);
      pesoDoFundo += t;
    }
  }
  return borda / azimutes - fundo / pesoDoFundo;
}

const SEM_VAZIO = new Uint8Array(0);

/**
 * COMPLETA UMA CRATERA sobre uma base MEDIDA (o DTM de Reia), no lugar, sem
 * apagar nada — o contrário de `aplicaCratera`, que apaga o relevo antigo
 * dentro da cavidade: soma ao campo `fator`·perfil, e o declive, o gráben e
 * a encosta de baixo continuam sob a tigela. O perfil é `c.perfil` (ρ → km
 * relativos à superfície local) até a borda, e fora dela some em
 * `regra.corteRR` (sem manto de ejecta além disso). Abaixo de
 * `regra.completaDesdeKm` a base não resolve a cratera e o fator é 1 (a
 * cavidade inteira da lei); de lá para cima, só a profundidade que FALTA:
 * fator = (dLei − dCampo)/dLei, preso em [0, 1], com dLei e dCampo medidos
 * pelo mesmo instrumento (`profundidadeBordaFundo`, `regra.instrumento`) no
 * perfil e no campo — se o campo já tem a lei ou mais, nada muda.
 * Devolve `{ leiKm, existenteKm (nulo abaixo do limite), fator }`.
 */
export function completaCratera(campo, largura, altura, c, raioDoCorpoKm, regra) {
  const R = c.diametroKm / 2;
  const [c0, c1] = regra.corteRR;
  const perfil = (rho) => c.perfil(rho) * (1 - suave(c0, c1, rho));
  const leiKm = profundidadeBordaFundo((rho) => perfil(rho), regra.instrumento);
  let existenteKm = null;
  let fator = 1;
  if (c.diametroKm >= regra.completaDesdeKm) {
    const grade = { metros: campo, vazio: SEM_VAZIO, largura, altura };
    existenteKm = profundidadeBordaFundo((rho, rumo) => amostraBilinear(grade, ...destinoNaEsfera(c.lat, c.lonE, rho * R, rumo, raioDoCorpoKm)), regra.instrumento);
    fator = Math.min(1, Math.max(0, (leiKm - existenteKm) / leiKm));
  }
  if (fator > 0) {
    paraCadaTexelDaCalota(c.lat, c.lonE, c1 * R, largura, altura, raioDoCorpoKm, (k, rKm) => {
      campo[k] += fator * perfil(rKm / R);
    });
  }
  return { leiKm, existenteKm, fator };
}

/** O texel (km no equador) e o menor diâmetro que a grade desenha (2 texels, e nunca abaixo de 4 km). */
export function texelEDiametroMinimo(largura, raioKm) {
  const texelKm = (2 * Math.PI * raioKm) / largura;
  return { texelKm, dMinKm: Math.max(4, 2 * texelKm) };
}

/**
 * O fator de profundidade (× a lei) de uma detectada de `diametroKm` e
 * `confianca`, pela forma das detectadas `M` do corpo: 1 até `fatorAte`
 * km; em `fatorDesde` km e acima, `fatorEmDesde` [mín, máx] pela confiança
 * (`confiancaEm` [mín, máx]: a borda mais nítida na foto é a mais fresca);
 * entre os dois, interpolado em log D.
 */
export function fatorDaDetectada(diametroKm, confianca, M) {
  const [c0, c1] = M.confiancaEm;
  const [f0, f1] = M.fatorEmDesde;
  const g = f0 + (f1 - f0) * Math.min(1, Math.max(0, (confianca - c0) / (c1 - c0)));
  const t = Math.min(1, Math.max(0, Math.log(diametroKm / M.fatorAte) / Math.log(M.fatorDesde / M.fatorAte)));
  return 1 - t * (1 - g);
}

/**
 * A forma (`morfologia`) de uma cratera com nome de `diametroKm`, pela
 * forma das com nome `M` do corpo e pela `lei`: até `degradadaAcimaDeKm`, a
 * lei; acima, a forma degradada — profundidade `profundidadeDaLei` × a lei
 * (ou a MEDIDA, em `profundidadeMedidaKm[nome]`, da borda ao fundo no
 * perfil já borrado por σ = `desfoqueSigmaPorD`·D, que é o que a medida
 * mede), borda erguida × `bordaDaLei` e pico central × `picoDaLei`
 * (proporcionais à profundidade nova), pico de raio `picoRR`·R, sem terraços.
 */
export function morfologiaDaComNome(nome, diametroKm, M, lei) {
  const daLei = morfologia(diametroKm, 1, lei);
  if (diametroKm <= M.degradadaAcimaDeKm) return daLei;
  const medida = M.profundidadeMedidaKm[nome];
  const forma = (d) => {
    const r = d / daLei.profundidadeKm;
    return { ...daLei, profundidadeKm: d, bordaKm: daLei.bordaKm * r * M.bordaDaLei, picoKm: daLei.picoKm * r * M.picoDaLei, picoRR: M.picoRR, terracos: 0 };
  };
  if (medida === undefined) return forma(M.profundidadeDaLei * daLei.profundidadeKm);
  // o perfil é linear na profundidade: uma prova com d = a medida dá a escala
  const prova = profundidadeNoPerfil(perfilGasto(forma(medida), 2 * M.desfoqueSigmaPorD));
  return forma((medida * medida) / prova);
}

/** Da borda ao fundo no perfil (ρ → km): o máximo em 0,7–1,5 R menos o mínimo dentro de R. */
export function profundidadeNoPerfil(perfil) {
  let borda = -Infinity;
  let fundo = Infinity;
  for (let i = 0; i <= 300; i += 1) {
    const rho = i * 0.005;
    const v = perfil(rho);
    if (rho >= 0.7 && v > borda) borda = v;
    if (rho <= 1 && v < fundo) fundo = v;
  }
  return borda - fundo;
}

/**
 * QUEM ENTRA: as detectadas (`{ lat, lonE, diametro_km, confianca }`) que
 * cabem na grade (≥ `dMinKm`) e não coincidem com uma com nome — centro a
 * menos de 0,5 R dela e diâmetro a ±40 % do dela: aí fica só a com nome.
 * `{ entram, descartadas: [{ ...detectada, nome }], foraDaGrade }`.
 */
export function combinaCrateras({ detectadas, nomeadas, dMinKm, raioKm }) {
  const unit = (lat, lon) => [Math.cos(lat * RADIANOS) * Math.cos(lon * RADIANOS), Math.cos(lat * RADIANOS) * Math.sin(lon * RADIANOS), Math.sin(lat * RADIANOS)];
  const vn = nomeadas.map((n) => ({ n, v: unit(n.lat, n.lonE) }));
  const entram = [];
  const descartadas = [];
  let foraDaGrade = 0;
  for (const d of detectadas) {
    if (d.diametro_km < dMinKm) {
      foraDaGrade += 1;
      continue;
    }
    const v = unit(d.lat, d.lonE);
    const igual = vn.find(({ n, v: w }) => {
      const dist = Math.acos(Math.min(1, v[0] * w[0] + v[1] * w[1] + v[2] * w[2])) * raioKm;
      return dist < 0.25 * n.diametroKm && Math.abs(d.diametro_km / n.diametroKm - 1) <= 0.4;
    });
    if (igual) descartadas.push({ ...d, nome: igual.n.nome });
    else entram.push(d);
  }
  return { entram, descartadas, foraDaGrade };
}

/**
 * O RAREAMENTO POR LATITUDE pela `regra` do corpo: acima de
 * `referenciaAteGraus`, por faixa de `faixaGraus` em |lat| (a última vai
 * até `latMaxDaDeteccaoGraus`, onde o detector para), ficam só as de MAIOR
 * confiança (empate: lat, lonE, diâmetro — a ordem não depende da entrada),
 * tantas quantas dão a densidade por km² da faixa 0–`referenciaAteGraus`.
 * `{ mantidas, densidadeDeReferencia (por 10⁶ km²), faixas: [{ deGraus,
 * ateGraus, antes, depois, fator, razaoAntes, confiancaMinimaMantida }] }`.
 */
export function rareiaPorLatitude(detectadas, regra, raioKm) {
  const { referenciaAteGraus: ref, faixaGraus, latMaxDaDeteccaoGraus: latMax } = regra;
  const areaKm2 = (a, b) => 4 * Math.PI * raioKm * raioKm * (Math.sin(b * RADIANOS) - Math.sin(a * RADIANOS));
  const absLat = (d) => Math.abs(d.lat);
  const densidadeRef = detectadas.filter((d) => absLat(d) < ref).length / areaKm2(0, ref);
  const sai = new Set();
  const faixas = [];
  for (let a = ref; a < latMax; a += faixaGraus) {
    const b = Math.min(latMax, a + faixaGraus);
    const ultima = b >= latMax;
    const na = detectadas.filter((d) => absLat(d) >= a && (ultima || absLat(d) < b));
    const area = areaKm2(a, b);
    const alvo = Math.min(na.length, Math.round(densidadeRef * area));
    const ordem = na.slice().sort((x, y) => y.confianca - x.confianca || x.lat - y.lat || x.lonE - y.lonE || y.diametro_km - x.diametro_km);
    for (const d of ordem.slice(alvo)) sai.add(d);
    faixas.push({
      deGraus: a,
      ateGraus: b,
      antes: na.length,
      depois: alvo,
      fator: na.length ? alvo / na.length : 1,
      razaoAntes: na.length / area / densidadeRef,
      confiancaMinimaMantida: alvo ? ordem[alvo - 1].confianca : null,
    });
  }
  return { mantidas: detectadas.filter((d) => !sai.has(d)), densidadeDeReferencia: densidadeRef * 1e6, faixas };
}

// ------------------------------------------------------------
// O relevo inteiro
// ------------------------------------------------------------

/**
 * O RELEVO POR FOTO em km (W×H, convenção da casa): sobre a `camadaKm` do
 * corpo (W×H em km, copiada; nula = chão liso), todas as crateras (com nome
 * e detectadas) da maior para a menor (a grande é a velha: a pequena cai
 * dentro dela, não o contrário). `nomeadas`: [{ nome, lat, lonE,
 * diametroKm }], com a forma de `morfologiaDaComNome` e o perfil gasto;
 * `detectadas`: [{ lat, lonE, diametro_km, confianca }] de
 * `crateras-pela-foto.mjs`: as menores que 2 texels (ou 4 km) ficam de
 * fora, as outras passam por `rareiaPorLatitude` e por `combinaCrateras`,
 * com a forma de `fatorDaDetectada` e o perfil gasto. `leis`: { forma (a
 * lei de `morfologia`), comNome (de `morfologiaDaComNome`), detectadas (de
 * `fatorDaDetectada`, com `desfoqueSigmaPorD`), rareamento (a regra de
 * `rareiaPorLatitude`) }. `raioKm`: o raio equatorial (as distâncias na
 * esfera e o texel).
 */
export function geraRelevoPorFoto({ largura, altura, raioKm, camadaKm = null, nomeadas = [], detectadas = [], leis }) {
  const { texelKm, dMinKm } = texelEDiametroMinimo(largura, raioKm);
  const naGrade = nomeadas.filter((n) => n.diametroKm >= dMinKm);
  const foraDaGrade = nomeadas.filter((n) => n.diametroKm < dMinKm).map((n) => n.nome);
  const detectadasNaGrade = detectadas.filter((d) => d.diametro_km >= dMinKm);
  const rareamento = rareiaPorLatitude(detectadasNaGrade, leis.rareamento, raioKm);
  const combinadas = combinaCrateras({ detectadas: rareamento.mantidas, nomeadas: naGrade, dMinKm, raioKm });
  const sigma = leis.detectadas.desfoqueSigmaPorD;
  const comForma = combinadas.entram.map((d) => {
    const fator = fatorDaDetectada(d.diametro_km, d.confianca, leis.detectadas);
    const m = morfologia(d.diametro_km, fator, leis.forma);
    // σ = 0,05·D = 0,1 R
    return { lat: d.lat, lonE: d.lonE, diametroKm: d.diametro_km, confianca: d.confianca, fator, morfologia: m, perfil: perfilGasto(m, 2 * sigma) };
  });
  const sigmaNome = leis.comNome.desfoqueSigmaPorD;
  const comNome = naGrade.map((n) => {
    const m = morfologiaDaComNome(n.nome, n.diametroKm, leis.comNome, leis.forma);
    // σ = 0,05·D = 0,1 R
    const perfil = perfilGasto(m, 2 * sigmaNome);
    const degradada = n.diametroKm > leis.comNome.degradadaAcimaDeKm;
    return { ...n, morfologia: m, perfil, degradada, profundidadeNoPerfilKm: profundidadeNoPerfil(perfil) };
  });
  const todas = [...comNome, ...comForma].sort((x, y) => y.diametroKm - x.diametroKm);
  const campo = camadaKm ? camadaKm.slice() : new Float64Array(largura * altura);
  const colocadas = [];
  for (const c of todas) {
    const ref = aplicaCratera(campo, largura, altura, c, raioKm);
    if (c.nome) colocadas.push({ nome: c.nome, lat: c.lat, lonE: c.lonE, diametroKm: c.diametroKm, ...c.morfologia, degradada: c.degradada, profundidadeNoPerfilKm: c.profundidadeNoPerfilKm, referenciaKm: ref });
  }
  return {
    km: campo,
    largura,
    altura,
    texelKm,
    dMinKm,
    colocadas,
    foraDaGrade,
    detectadas: comForma.map((d) => ({ lat: d.lat, lonE: d.lonE, diametroKm: d.diametroKm, confianca: d.confianca, fator: d.fator, morfologia: d.morfologia })),
    detectadasDescartadas: combinadas.descartadas,
    detectadasForaDaGrade: detectadas.length - detectadasNaGrade.length,
    rareamento: { regra: leis.rareamento, densidadeDeReferencia: rareamento.densidadeDeReferencia, faixas: rareamento.faixas },
  };
}

// ------------------------------------------------------------
// O byte e a normal
// ------------------------------------------------------------

/** km → byte em [faixaKm.min, faixaKm.max]: byte = round((h − min)/(max − min)·255), h preso à faixa; conta os texels que saturaram. */
export function quantizaNaFaixa(km, faixaKm) {
  const { min, max } = faixaKm;
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

/** byte → km na faixa (o que o vértice do app desloca). */
export const desquantizaNaFaixa = (b, faixaKm) => faixaKm.min + (b / 255) * (faixaKm.max - faixaKm.min);

/**
 * A CONVERSÃO para o app: o vértice é `1 + viés + (byte/255)·escala` em
 * raios equatoriais (`rochoso.ts`), e o par (escala, viés) da faixa é o que
 * vai na tabela `RELEVO_DA_LUA`.
 */
export function escalaEViesDaFaixa(faixaKm, raioKm) {
  return { escala: (faixaKm.max - faixaKm.min) / raioKm, vies: faixaKm.min / raioKm };
}

/**
 * A NORMAL do campo (km, já presa à faixa do byte, antes do arredondamento
 * — o degrau do byte não vira listra na luz): `assaNormais`
 * (`gera-normal-de-dem.mjs`) com a altura ÷ `ganhoDoShader`, para que o
 * ganho tangencial do shader (`ESCALA_DA_NORMAL_DO_RELEVO`, 1,2) devolva a
 * inclinação física; `raioKm` é o passo horizontal.
 */
export function normalDoCampoNaFaixa(km, largura, altura, faixaKm, raioKm, ganhoDoShader = 1.2) {
  const { min, max } = faixaKm;
  const preso = new Float64Array(km.length);
  for (let k = 0; k < km.length; k += 1) preso[k] = Math.min(max, Math.max(min, km[k])) / ganhoDoShader;
  return assaNormais(preso, largura, altura, raioKm, null);
}

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
