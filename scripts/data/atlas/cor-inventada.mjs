// ============================================================
// A COR INVENTADA DO SUL DE CARONTE (PLAN-COR.md, etapa M1, 02/10/2026)
//
// O DEFEITO. O mapa de cor de Caronte é o mosaico global de 300 m da New
// Horizons (um canal; a casa o grava em 8192×4096, cinza em três canais). O
// terço sul nunca foi fotografado — no sobrevoo o polo sul do sistema estava
// em noite polar — e `preencherVazioSemDado` (item 149) o tapa com o tom médio
// liso. A borda desse tapa-buraco é o terminador do dia da passagem, uma
// polilinha de trechos retos; com relevo dos dois lados (o relevo inventado)
// ela virou uma EMENDA RETA no app (foto 4 de Caronte). O relevo é contínuo e
// não muda aqui: a linha está na cor.
//
// A TÉCNICA: transferência de textura na esfera à Efros & Freeman (2001,
// "Image Quilting for Texture Synthesis and Transfer", §3), GUIADA pelo
// relevo. O alvo (o vazio e a faixa rasante, abaixo) é coberto por retalhos
// quadrados do plano tangente, copiados do fotografado nítido por ROTAÇÃO da
// esfera, sem giro e sem espelho — o norte do retalho fica no norte, porque a
// cor fotografada carrega a sombra da sonda com direção fixa (medido no lado
// nítido: o passa-alta do brilho correlaciona r = 0,34 com n·L para o Sol a
// azimute ~330° e elevação ~45°, no espaço do próprio mapa de normais). O
// "mapa-guia" é esse sombreado, g = max(0, n·L), lido do normal.png da casa
// (medido no lado medido, inventado no resto) nos dois lados. Três passadas,
// retalho de 120 → 80 → 55 km e α (o peso da costura contra o do guia) de
// 0,1 → 0,45 → 0,8; cada passada compara o retalho com o que a anterior pôs
// ali (E&F §3, a iteração). Corte de erro mínimo na sobreposição (curva
// fechada em volta do centro, programação dinâmica em ângulo — o molde é a
// colcha do relevo, `colcha` em `relevo-inventado.mjs`) e rampa de 3 texels.
//
// O QUE AS PRÉVIAS DE 02/10 PEDIRAM ALÉM DISSO (cada item corrige um defeito
// medido; a régua é `capturas/cor-inventada/ferramentas/m1/mede-m1.mjs`):
//  - A SOMBRA ASSADA. Só a escolha pelo guia dá correlação ~0,01 com n·L no
//    alvo (64 candidatos não acham sombreado parecido). A parte do detalhe que
//    o sombreado explica (regressão no `bom`, ganho ~117 DN por unidade de
//    n·L) sai das fontes e a do relevo do ALVO entra com o mesmo ganho — a cor
//    inventada sai sombreada pelo relevo inventado (`opcoes.sombreia: false`
//    desliga).
//  - O TOM. O tom é a continuação HARMÔNICA (`membranaHarmonica`) do
//    passa-baixa do fotografado que não é faixa — o nítido E o borrado (o
//    albedo grande do borrado é real; no lado de trás a borda do alvo só
//    encosta nele) —, presa em volta do alvo; o detalhe vem dos retalhos
//    (resultado = colcha − passa-baixa(colcha) + tom). O corte tom/detalhe é
//    40 km, e na borda 10 km (ver `SIGMA_DO_TOM_KM`): com 200 km a membrana lia
//    a média de centenas de km para dentro e fazia degrau de 13 DN na borda.
//  - O DESFOCADO. Junto do lado de trás (que equivale ao nítido desfocado por
//    σ ~10 km), o detalhe inventado começa desfocado igual e fica nítido em 150
//    km, e na zona livre a foto passa ao inventado sem corte; sem isso, a 1ª
//    prévia trocou a emenda reta por uma emenda de nitidez.
//  - AS UNIDADES sorteadas pelos pesos no centro do retalho, e não a dominante:
//    a dominante muda numa linha reta (−28° no lado de trás) e a colcha a
//    desenhava.
//  - A COSTURA FINAL (Poisson, só o degrau médio): o resultado casa com a foto
//    na borda do alvo, e a correção decai para dentro.
//
// AS REGIÕES (grade da casa: coluna 0 = 180°E, leste para a direita, linha 0
// = +90°; tudo medido no mosaico de Caronte em 02/10):
//  - `vazio`: o que `preencherVazioSemDado` tapou no mosaico CRU (a mesma
//    regra do vazio GRANDE, janela em graus), reduzido ao destino pelo máximo
//    e dilatado 6 texels — o halo do lanczos3 da redução 12693 → 8192.
//  - `semDado`: os buracos pequenos que o mosaico publicou em preto e a casa
//    deixa como estão; não são fonte.
//  - `borrado`: onde o mosaico não tem detalhe fino. A régua é a energia do
//    passa-alta de σ 3 km (média local de σ 20 km) contra a mediana do lado
//    nítido (Oz Terra 330–360°E 30–57°N e Vulcan 300–358°E −38..−3°, RMS 22
//    DN): abaixo de metade (o histograma tem o lado de trás em 0–0,15, a faixa
//    intermediária do norte em 0,3–0,45 e o nítido de 0,5 a 1,5) é
//    `desfocado`; e o RISCADO (coerência do tensor de estrutura do passa-alta
//    acima de 0,7: a cunha de 275–300°E junto do terminador tem 0,84, contra
//    0,55 em Vulcan) também é borrado — energia de risco não é detalhe. O lado
//    de trás inteiro sai borrado.
//  - `faixa` (rasante): dentro do fotografado, junto da borda do vazio, onde a
//    luz era rasante. Medido em função da distância à borda: junto do nítido
//    (275–330°E) o brilho sobe de 109 a 145 DN em 25 km e para em ~145 a
//    25–55 km; junto do borrado sobe de ~92 a ~145–150 ao longo de 45–70 km.
//    Largura: 40 km junto do nítido, 75 km junto do borrado (pela fração de
//    borrado do vizinho, média de σ 50 km), para os 15 km de fora — a ZONA
//    LIVRE, onde o retalho pode ficar com a foto e o corte escolhe por onde
//    passar — caírem no patamar do brilho.
//  - `bom` = fotografado, sem buraco, nem borrado, nem faixa: a fonte, que
//    não muda. Alvo = vazio ∪ faixa; fora dele o mapa sai byte a byte igual.
//
// AS FONTES de cada unidade geológica (`pesosDasUnidades` do JSON do relevo,
// `fonte/<corpo>-lado-de-tras.json`) são as caixas `fontes` dela (Vulcan
// Planitia para a planície lisa do sul; Oz Terra para as terras altas;
// Serenity e Mandjet para o cinturão), com o centro a meia largura da borda da
// caixa e o retalho INTEIRO (meia diagonal) no `bom`.
//
// DETERMINÍSTICO por semente. A prévia e o gerador chamam a MESMA função,
// `inventaCorDoCorpo`; ela não lê nem grava disco.
// ============================================================

import { preencherVazioSemDado } from './lib-texturas.mjs';
import {
  amostraNoPonto,
  coeficientesDeSpline,
  colunaDaLongitude,
  desfocaComMascara,
  distanciaAoVazioKm,
  latitudeDaLinha,
  linhaDaLatitude,
  longitudeDaColuna,
  membranaHarmonica,
  pesosDasUnidades,
  planoTangente,
  repeticaoMaisPerto,
} from './relevo-inventado.mjs';

const GRAUS = 180 / Math.PI;
const RADIANOS = Math.PI / 180;
const INF = 1e30;

/** A janela do vazio GRANDE, em graus: a de `GRAUS_DA_JANELA_DO_VAZIO` em `baixa-texturas.mjs` (lá não é exportada; mudou lá, muda aqui). */
const GRAUS_DA_JANELA_DO_VAZIO = 14;
/** Abaixo disto em todo canal o texel do mosaico cru não tem dado (o padrão de `preencherVazioSemDado`). */
const VAZIO_ATE = 12;
/** Texels (no destino) que o vazio cresce: o halo do lanczos3 na redução, ±3 texels em 12693 → 8192, com folga. */
const HALO_DO_VAZIO_TEXELS = 6;
const HALO_DOS_BURACOS_TEXELS = 3;

/** A régua do borrado (ver o cabeçalho): energia do passa-alta e coerência do tensor de estrutura dele (o riscado). */
const SIGMA_DO_PASSA_ALTA_KM = 3;
const SIGMA_DA_ENERGIA_KM = 20;
const LIMIAR_DO_BORRADO = 0.5;
const SIGMA_DA_COERENCIA_KM = 15;
const LIMIAR_DA_COERENCIA = 0.7;
const SIGMA_DO_BORRADO_KM = 20;
const CAIXAS_NITIDAS = [
  { lon: [330, 360], lat: [30, 57] },
  { lon: [300, 358], lat: [-38, -3] },
];

/** A faixa rasante: largura (km) junto do vizinho nítido e do borrado; σ da fração de borrado do vizinho; a zona livre de fora. */
const FAIXA_RASANTE_KM = { bom: 40, borrado: 75 };
const SIGMA_DA_CLASSE_DA_FAIXA_KM = 50;
const ZONA_LIVRE_KM = 15;

/**
 * O SOL ASSADO nas fotos, no espaço do próprio mapa de normais (n = rgb/127,5
 * − 1; x = R, y = G, z = B): a direção que maximiza a correlação do passa-alta
 * do brilho com n·L no lado medido (Caronte: az 330°, el 45°, r = 0,34;
 * Plutão: az 320°, el 30°, r = 0,40).
 */
export const SOL_ASSADO = { charon: [-0.354, 0.612, 0.707], pluto: [-0.557, 0.663, 0.5] };

/** As passadas da transferência: largura do retalho (km), α e o passo (texels) dos pontos que medem o erro. */
const PASSADAS = [
  { larguraKm: 120, alfa: 0.1, passoDasAmostras: 3 },
  { larguraKm: 80, alfa: 0.45, passoDasAmostras: 2 },
  { larguraKm: 55, alfa: 0.8, passoDasAmostras: 2 },
];
/** A sobreposição entre retalhos vizinhos, em frações da largura. */
const SOBREPOSICAO = 0.25;
/** Candidatos sorteados por retalho; o escolhido sai ao acaso entre os `MELHORES`. */
const CANDIDATOS = 64;
const MELHORES = 4;
/** Sem repetir: nenhuma origem a menos de ¼ de largura de outra usada a menos de 4 larguras no alvo. */
const VIZINHANCA_SEM_REPETIR = 4;
const RAIO_DE_REPETICAO = 0.25;
const RODADAS_DE_SORTEIO = 5;
/** A rampa (texels) do corte; a margem do retalho (texels) além do quadrado, onde a rampa ainda escreve. */
const ESFUMADO_TEXELS = 3;
const MARGEM_DO_RETALHO = 3;
/**
 * O TOM: σ (km) do passa-baixa que separa o tom (membrana) do detalhe (retalhos), e a BORDA dele. A
 * membrana prende no passa-baixa do fotografado em volta do alvo, e o passa-baixa só vê um lado na
 * borda: com σ 200 km ele lia lá a média de centenas de km para dentro — no lado de trás, 13 DN
 * mais escura que a vizinhança logo além da faixa (degrau medido na 1ª prévia); com 40 km, ~4 DN
 * (2ª prévia). Por isso, até `BORDA_DO_TOM_KM[0]` do alvo o tom é o passa-baixa de
 * `SIGMA_DA_BORDA_DO_TOM_KM`, e passa ao de `SIGMA_DO_TOM_KM` até `BORDA_DO_TOM_KM[1]`: a membrana
 * sai do brilho LOCAL da borda. A colcha perde a escala grande pelo passa-baixa de
 * `SIGMA_DA_COLCHA_KM` (resultado = colcha − passa-baixa(colcha) + tom). `SIGMA_DA_MEMBRANA_KM` só
 * escolhe o nível em que `membranaHarmonica` resolve exato; tudo na grade ÷`FATOR_DO_TOM`.
 */
const SIGMA_DO_TOM_KM = 40;
const SIGMA_DA_BORDA_DO_TOM_KM = 10;
const BORDA_DO_TOM_KM = [20, 80];
const SIGMA_DA_COLCHA_KM = 200;
const SIGMA_DA_MEMBRANA_KM = 200;
const FATOR_DO_TOM = 8;

/**
 * O DESFOQUE JUNTO DO BORRADO: o lado de trás equivale ao lado nítido desfocado por σ ≈ 10–12 km
 * (RMS por banda de 0–3, 3–6, 6–12, 12–24 km: 0,7/0,7/1,8/4,1 DN em 195–260°E contra 0,2/0,6/1,8/3,6
 * no nítido desfocado 12 km — medido em 02/10). Junto de vizinho borrado, o detalhe inventado começa
 * desfocado assim e fica nítido ao longo de `RAMPA_DO_DESFOQUE_KM` para dentro do alvo — sem o
 * degrau de nitidez que a 1ª prévia mostrou. O vizinho que conta é o MAIS PERTO fora do alvo (a
 * média larga da 2ª prévia desfocou o alvo colado em Vulcan, nítido, por causa da cunha riscada a 50
 * km): borrado se o texel borrado mais perto está mais perto que o nítido mais perto, com transição
 * de ±`TRANSICAO_DA_CLASSE_KM`. Os níveis de desfoque são interpolados.
 */
const DESFOQUE_DO_BORRADO_KM = 10;
/** A costura final: σ (km) da média, ao longo da borda do alvo, do quanto o resultado se afasta da foto ali. */
const SIGMA_DO_DEGRAU_KM = 10;
const RAMPA_DO_DESFOQUE_KM = 150;
const TRANSICAO_DA_CLASSE_KM = 20;
const NIVEIS_DO_DESFOQUE_KM = [0, 2.5, 5, 10];
/** A grade das origens: a cheia ÷ isto. */
const FATOR_DAS_FONTES = 4;

const PESO_MINIMO = 1e-9;

/** mulberry32 — cópia de `geradorDeSemente` (relevo-inventado.mjs, interna; a mesma de esculpido.ts). */
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

// ------------------------------------------------------------
// AS MÁSCARAS
// ------------------------------------------------------------

/**
 * O VAZIO DO MOSAICO CRU, na resolução dele: `vazio` = o que
 * `preencherVazioSemDado` tapa (a mesma função, numa cópia de um canal — o
 * máximo dos canais, que é o que ela compara —, com a janela em graus como em
 * `baixa-texturas.mjs`); `semDado` = os buracos pequenos que ficam pretos.
 */
export function vazioDoMosaico(pixels, largura, altura, canais, { grausDaJanela = GRAUS_DA_JANELA_DO_VAZIO, vazioAte = VAZIO_ATE } = {}) {
  const n = largura * altura;
  const um = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) {
    let m = 0;
    for (let c = 0; c < canais; c += 1) if (pixels[k * canais + c] > m) m = pixels[k * canais + c];
    um[k] = m;
  }
  const tapado = Uint8Array.from(um);
  preencherVazioSemDado(tapado, largura, altura, 1, { vazioAte, raio: Math.round((largura * grausDaJanela) / 360) });
  // o tom do tapa-buraco é a média do que tem dado (≥ vazioAte): todo texel tapado muda
  const vazio = new Uint8Array(n);
  const semDado = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) {
    if (tapado[k] !== um[k]) vazio[k] = 1;
    else if (um[k] < vazioAte) semDado[k] = 1;
  }
  return { vazio, semDado };
}

/** Reduz uma máscara `Lf`×`Af` a `L`×`A` pelo MÁXIMO na pegada de cada texel do destino. */
export function reduzMascara(mascara, Lf, Af, L, A) {
  const saida = new Uint8Array(L * A);
  for (let j = 0; j < A; j += 1) {
    const y0 = Math.floor((j * Af) / A);
    const y1 = Math.max(y0 + 1, Math.ceil(((j + 1) * Af) / A));
    for (let i = 0; i < L; i += 1) {
      const x0 = Math.floor((i * Lf) / L);
      const x1 = Math.max(x0 + 1, Math.ceil(((i + 1) * Lf) / L));
      let v = 0;
      for (let y = y0; y < y1 && !v; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          if (mascara[y * Lf + x]) {
            v = 1;
            break;
          }
        }
      }
      saida[j * L + i] = v;
    }
  }
  return saida;
}

/** Dilata uma máscara `raio` texels (quadrado), com a volta da longitude e as linhas presas nos polos. */
export function dilataMascara(mascara, L, A, raio) {
  const meio = new Uint8Array(L * A);
  const conta = new Int32Array(2 * L + 1);
  for (let j = 0; j < A; j += 1) {
    const base = j * L;
    for (let s = 0; s < 2 * L; s += 1) conta[s + 1] = conta[s] + mascara[base + (s % L)];
    for (let i = 0; i < L; i += 1) {
      const a = i - raio + L;
      if (conta[Math.min(2 * L, a + 2 * raio + 1)] - conta[a] > 0) meio[base + i] = 1;
    }
  }
  const saida = new Uint8Array(L * A);
  const coluna = new Int32Array(A + 1);
  for (let i = 0; i < L; i += 1) {
    for (let j = 0; j < A; j += 1) coluna[j + 1] = coluna[j] + meio[j * L + i];
    for (let j = 0; j < A; j += 1) {
      if (coluna[Math.min(A, j + raio + 1)] - coluna[Math.max(0, j - raio)] > 0) saida[j * L + i] = 1;
    }
  }
  return saida;
}

/** Reduz por blocos de `f`×`f`: a média de `campo` onde `peso` > 0 e a fração com peso; com `ou`, o OU da máscara. */
function reduzEmBlocos(campo, peso, L, A, f) {
  const l = L / f;
  const a = A / f;
  const valor = new Float32Array(l * a);
  const fracao = new Float32Array(l * a);
  for (let j = 0; j < A; j += 1) {
    const J = Math.floor(j / f);
    for (let i = 0; i < L; i += 1) {
      const k = j * L + i;
      const c = J * l + Math.floor(i / f);
      const p = peso ? peso[k] : 1;
      if (p > 0) {
        valor[c] += p * campo[k];
        fracao[c] += p;
      }
    }
  }
  for (let c = 0; c < l * a; c += 1) {
    valor[c] = fracao[c] > 0 ? valor[c] / fracao[c] : 0;
    fracao[c] /= f * f;
  }
  return { valor, fracao, largura: l, altura: a };
}

/** O OU de uma máscara em blocos de `f`×`f`. */
function ouEmBlocos(mascara, L, A, f) {
  const l = L / f;
  const saida = new Uint8Array(l * (A / f));
  for (let j = 0; j < A; j += 1) {
    for (let i = 0; i < L; i += 1) if (mascara[j * L + i]) saida[Math.floor(j / f) * l + Math.floor(i / f)] = 1;
  }
  return saida;
}

const naCaixa = (lat, lon, caixa) => lat >= caixa.lat[0] && lat <= caixa.lat[1] && lon >= caixa.lon[0] && lon <= caixa.lon[1];

/**
 * AS REGIÕES do mapa de cor na grade do destino (ver o cabeçalho), a partir
 * do brilho `valor` (Float32, L×A), do `vazio` e dos buracos `semDado` já no
 * destino. Devolve as máscaras (Uint8), a distância ao vazio na meia grade
 * (`distanciaAoVazio`, km) e a régua do borrado (`rmsDeReferencia`).
 */
export function mascarasDaCor({ valor, vazio, semDado, largura: L, altura: A, raioM, registra = () => {} }) {
  const n = L * A;
  const dado = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) dado[k] = vazio[k] || semDado[k] ? 0 : 1;

  // o borrado: energia do passa-alta contra o lado nítido
  const passaBaixa = desfocaComMascara(valor, dado, L, A, raioM, SIGMA_DO_PASSA_ALTA_KM).valor;
  const quadrado = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    if (!dado[k]) continue;
    const h = valor[k] - passaBaixa[k];
    quadrado[k] = h * h;
  }
  const energia = desfocaComMascara(quadrado, dado, L, A, raioM, SIGMA_DA_ENERGIA_KM).valor;
  const referencia = [];
  for (let j = 0; j < A; j += 2) {
    const lat = latitudeDaLinha(j, A) * GRAUS;
    for (let i = 0; i < L; i += 2) {
      const k = j * L + i;
      if (dado[k] && CAIXAS_NITIDAS.some((c) => naCaixa(lat, longitudeDaColuna(i, L), c))) referencia.push(energia[k]);
    }
  }
  referencia.sort((a, b) => a - b);
  const energiaDeReferencia = referencia[referencia.length >> 1];
  // o riscado: a coerência do tensor de estrutura do passa-alta (na meia grade) — a cunha de 275–300°E
  // junto do terminador tem 0,84 contra 0,55 em Vulcan, 0,44 em Serenity e 0,31 em Oz Terra
  const l = L / 2;
  const a = A / 2;
  const tensor = [new Float32Array(l * a), new Float32Array(l * a), new Float32Array(l * a)];
  const contaDoTensor = new Float32Array(l * a);
  const raioKm = raioM / 1000;
  const passoNorte = raioKm * (Math.PI / A);
  for (let j = 1; j < A - 1; j += 1) {
    const passoLeste = raioKm * ((2 * Math.PI) / L) * Math.max(Math.cos(80 * RADIANOS), Math.cos(latitudeDaLinha(j, A)));
    for (let i = 0; i < L; i += 1) {
      const k = j * L + i;
      const kl = j * L + ((i + 1) % L);
      const ko = j * L + ((i - 1 + L) % L);
      if (!(dado[k] && dado[kl] && dado[ko] && dado[k - L] && dado[k + L])) continue;
      const gx = (valor[kl] - passaBaixa[kl] - valor[ko] + passaBaixa[ko]) / (2 * passoLeste);
      const gy = (valor[k - L] - passaBaixa[k - L] - valor[k + L] + passaBaixa[k + L]) / (2 * passoNorte);
      const c = (j >> 1) * l + (i >> 1);
      tensor[0][c] += gx * gx;
      tensor[1][c] += gx * gy;
      tensor[2][c] += gy * gy;
      contaDoTensor[c] += 1;
    }
  }
  for (let c = 0; c < l * a; c += 1) {
    for (const t of tensor) t[c] = contaDoTensor[c] ? t[c] / contaDoTensor[c] : 0;
    contaDoTensor[c] = contaDoTensor[c] ? 1 : 0;
  }
  const [txx, txy, tyy] = tensor.map((t) => desfocaComMascara(t, contaDoTensor, l, a, raioM, SIGMA_DA_COERENCIA_KM).valor);
  // dois indicadores: sem energia (desfocado) e sem energia OU riscado (borrado)
  const semEnergia = new Float32Array(n);
  const indicador = new Float32Array(n);
  for (let j = 0; j < A; j += 1) {
    for (let i = 0; i < L; i += 1) {
      const k = j * L + i;
      if (!dado[k]) continue;
      const c = (j >> 1) * l + (i >> 1);
      const traco = txx[c] + tyy[c];
      const coerencia = traco > 0 ? Math.sqrt((txx[c] - tyy[c]) ** 2 + 4 * txy[c] * txy[c]) / traco : 0;
      if (!(energia[k] >= LIMIAR_DO_BORRADO * LIMIAR_DO_BORRADO * energiaDeReferencia)) semEnergia[k] = 1;
      if (semEnergia[k] || coerencia > LIMIAR_DA_COERENCIA) indicador[k] = 1;
    }
  }
  const borrado = new Uint8Array(n);
  const desfocado = new Uint8Array(n);
  for (const [entrada, saida] of [[indicador, borrado], [semEnergia, desfocado]]) {
    const suave = desfocaComMascara(entrada, dado, L, A, raioM, SIGMA_DO_BORRADO_KM).valor;
    for (let k = 0; k < n; k += 1) if (!vazio[k] && suave[k] > 0.5) saida[k] = 1;
  }

  // a faixa rasante, na meia grade: distância ao vazio e a fração de borrado do vizinho
  const distancia = distanciaAoVazioKm(ouEmBlocos(vazio, L, A, 2), l, a, raioM);
  const foto = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) foto[k] = vazio[k] ? 0 : 1;
  const classe = reduzEmBlocos(borrado, foto, L, A, 2);
  const beta = desfocaComMascara(classe.valor, classe.fracao, l, a, raioM, SIGMA_DA_CLASSE_DA_FAIXA_KM).valor;
  const faixa = new Uint8Array(n);
  const livre = new Uint8Array(n);
  for (let j = 0; j < A; j += 1) {
    for (let i = 0; i < L; i += 1) {
      const k = j * L + i;
      if (vazio[k]) continue;
      const c = (j >> 1) * l + (i >> 1);
      const b = Number.isFinite(beta[c]) ? Math.min(1, Math.max(0, beta[c])) : 1;
      const w = FAIXA_RASANTE_KM.bom + (FAIXA_RASANTE_KM.borrado - FAIXA_RASANTE_KM.bom) * b;
      if (distancia[c] < w) {
        faixa[k] = 1;
        if (distancia[c] >= w - ZONA_LIVRE_KM) livre[k] = 1;
      }
    }
  }
  const bom = new Uint8Array(n);
  const alvo = new Uint8Array(n);
  const conta = { vazio: 0, faixa: 0, livre: 0, borrado: 0, desfocado: 0, bom: 0, semDado: 0 };
  for (let k = 0; k < n; k += 1) {
    bom[k] = dado[k] && !borrado[k] && !faixa[k] ? 1 : 0;
    alvo[k] = vazio[k] || faixa[k] ? 1 : 0;
    conta.vazio += vazio[k];
    conta.faixa += faixa[k];
    conta.livre += livre[k];
    conta.borrado += borrado[k];
    conta.desfocado += desfocado[k];
    conta.bom += bom[k];
    conta.semDado += semDado[k];
  }
  const porcento = Object.fromEntries(Object.entries(conta).map(([nome, v]) => [nome, +((100 * v) / n).toFixed(2)]));
  const rmsDeReferencia = Math.sqrt(energiaDeReferencia);
  registra(`máscaras (% dos texels): ${JSON.stringify(porcento)}; RMS do passa-alta no lado nítido ${rmsDeReferencia.toFixed(2)} DN`);
  return { vazio, semDado, borrado, desfocado, faixa, livre, bom, alvo, distanciaAoVazio: { km: distancia, largura: l, altura: a }, rmsDeReferencia, porcento };
}

// ------------------------------------------------------------
// O GUIA E O TOM
// ------------------------------------------------------------

/**
 * O GUIA: g = max(0, n̂·L) na grade L×A, com n o normal.png (`Ln`×`An`, RGB,
 * n = rgb/127,5 − 1) reamostrado bilinear (com a volta) e normalizado.
 */
export function guiaDoRelevo(normais, Ln, An, L, A, sol) {
  const m = Math.hypot(...sol);
  const [lx, ly, lz] = sol.map((v) => v / m);
  const nn = Ln * An;
  const dec = new Float32Array(3 * nn);
  for (let k = 0; k < nn; k += 1) {
    const x = normais[3 * k] / 127.5 - 1;
    const y = normais[3 * k + 1] / 127.5 - 1;
    const z = normais[3 * k + 2] / 127.5 - 1;
    const r = Math.hypot(x, y, z) || 1;
    dec[3 * k] = x / r;
    dec[3 * k + 1] = y / r;
    dec[3 * k + 2] = z / r;
  }
  const guia = new Float32Array(L * A);
  for (let j = 0; j < A; j += 1) {
    const y = ((j + 0.5) * An) / A - 0.5;
    let j0 = Math.floor(y);
    let fy = y - j0;
    if (j0 < 0) {
      j0 = 0;
      fy = 0;
    } else if (j0 > An - 2) {
      j0 = An - 2;
      fy = 1;
    }
    for (let i = 0; i < L; i += 1) {
      const x = ((i + 0.5) * Ln) / L - 0.5;
      let i0 = Math.floor(x);
      const fx = x - i0;
      if (i0 < 0) i0 += Ln;
      const i1 = i0 + 1 < Ln ? i0 + 1 : 0;
      const k00 = 3 * (j0 * Ln + i0);
      const k01 = 3 * (j0 * Ln + i1);
      const k10 = 3 * ((j0 + 1) * Ln + i0);
      const k11 = 3 * ((j0 + 1) * Ln + i1);
      const w00 = (1 - fx) * (1 - fy);
      const w01 = fx * (1 - fy);
      const w10 = (1 - fx) * fy;
      const w11 = fx * fy;
      const nx = w00 * dec[k00] + w01 * dec[k01] + w10 * dec[k10] + w11 * dec[k11];
      const ny = w00 * dec[k00 + 1] + w01 * dec[k01 + 1] + w10 * dec[k10 + 1] + w11 * dec[k11 + 1];
      const nz = w00 * dec[k00 + 2] + w01 * dec[k01 + 2] + w10 * dec[k10 + 2] + w11 * dec[k11 + 2];
      const r = Math.hypot(nx, ny, nz) || 1;
      guia[j * L + i] = Math.max(0, (nx * lx + ny * ly + nz * lz) / r);
    }
  }
  return guia;
}

/** Bilinear da grade `l`×`a` (centros de texel, com a volta) levada à grade L×A. */
function sobeBilinear(campo, l, a, L, A) {
  const saida = new Float32Array(L * A);
  for (let j = 0; j < A; j += 1) {
    const y = ((j + 0.5) * a) / A - 0.5;
    let j0 = Math.floor(y);
    let fy = y - j0;
    if (j0 < 0) {
      j0 = 0;
      fy = 0;
    } else if (j0 > a - 2) {
      j0 = a - 2;
      fy = 1;
    }
    for (let i = 0; i < L; i += 1) {
      const x = ((i + 0.5) * l) / L - 0.5;
      let i0 = Math.floor(x);
      const fx = x - i0;
      if (i0 < 0) i0 += l;
      const i1 = i0 + 1 < l ? i0 + 1 : 0;
      saida[j * L + i] =
        (1 - fy) * ((1 - fx) * campo[j0 * l + i0] + fx * campo[j0 * l + i1]) +
        fy * ((1 - fx) * campo[(j0 + 1) * l + i0] + fx * campo[(j0 + 1) * l + i1]);
    }
  }
  return saida;
}

/**
 * O TOM (L×A): o passa-baixa de `valor` (gaussiana normalizada pela máscara
 * `dadoDoTom`; σ `SIGMA_DA_BORDA_DO_TOM_KM` junto do alvo, `SIGMA_DO_TOM_KM`
 * longe dele) e, no `alvo`, a membrana harmônica dele presa no resto — tudo na
 * grade ÷`FATOR_DO_TOM` (~3,7 km em Caronte), que sobe por bilinear.
 */
export function tomDeGrandeEscala({ valor, dadoDoTom, alvo, largura: L, altura: A, raioM }) {
  const f = FATOR_DO_TOM;
  const r = reduzEmBlocos(valor, dadoDoTom, L, A, f);
  const alvoR = ouEmBlocos(alvo, L, A, f);
  const longe = desfocaComMascara(r.valor, r.fracao, r.largura, r.altura, raioM, SIGMA_DO_TOM_KM).valor;
  const perto = desfocaComMascara(r.valor, r.fracao, r.largura, r.altura, raioM, SIGMA_DA_BORDA_DO_TOM_KM).valor;
  const distancia = distanciaAoVazioKm(alvoR, r.largura, r.altura, raioM);
  const preso = new Uint8Array(r.largura * r.altura);
  const campo = new Float32Array(r.largura * r.altura);
  for (let c = 0; c < campo.length; c += 1) {
    if (alvoR[c] || !Number.isFinite(longe[c])) continue;
    const t = Math.min(1, Math.max(0, (distancia[c] - BORDA_DO_TOM_KM[0]) / (BORDA_DO_TOM_KM[1] - BORDA_DO_TOM_KM[0])));
    const peso = Number.isFinite(perto[c]) ? 1 - t * t * (3 - 2 * t) : 0;
    preso[c] = 1;
    campo[c] = peso * perto[c] + (1 - peso) * longe[c];
  }
  const membrana = membranaHarmonica(campo, preso, r.largura, r.altura, raioM, SIGMA_DA_MEMBRANA_KM);
  return sobeBilinear(Float32Array.from(membrana), r.largura, r.altura, L, A);
}

// ------------------------------------------------------------
// AS FONTES
// ------------------------------------------------------------

/**
 * AS FONTES de cada unidade (a ordem de `fonte.unidades`) para retalhos de
 * `larguraKm`, na grade ÷`FATOR_DAS_FONTES` (`distanciaAoRuim` = a distância,
 * km, de cada célula ao não-`bom` nessa grade): células com o centro a meia
 * largura da borda de uma caixa `fontes` da unidade e a meia diagonal (mais
 * uma célula) longe do que não é `bom`. `{ celulas, acumulado (cos lat),
 * largura, altura, areaKm2 }` por unidade, ou null.
 */
export function fontesDaCor({ distanciaAoRuim, largura: l, altura: a, fonte, raioM, larguraKm }) {
  const raioKm = raioM / 1000;
  const kmPorGrau = raioKm * RADIANOS;
  const celulaKm = raioKm * (Math.PI / a);
  const meia = larguraKm / 2;
  const meiaDiagonal = meia * Math.SQRT2 + celulaKm;
  return Object.values(fonte.unidades).map((unidade) => {
    const caixas = unidade.fontes ?? (unidade.exemplo ? [unidade.exemplo] : []);
    const celulas = [];
    for (let J = 0; J < a; J += 1) {
      const lat = latitudeDaLinha(J, a) * GRAUS;
      const cosLat = Math.cos(lat * RADIANOS);
      for (let I = 0; I < l; I += 1) {
        const c = J * l + I;
        if (!(distanciaAoRuim[c] >= meiaDiagonal)) continue;
        const lon = longitudeDaColuna(I, l);
        const dentro = caixas.some((cx) =>
          naCaixa(lat, lon, cx) &&
          Math.min(lat - cx.lat[0], cx.lat[1] - lat) * kmPorGrau >= meia &&
          Math.min(lon - cx.lon[0], cx.lon[1] - lon) * kmPorGrau * cosLat >= meia);
        if (dentro) celulas.push(c);
      }
    }
    if (!celulas.length) return null;
    const acumulado = new Float64Array(celulas.length);
    let soma = 0;
    celulas.forEach((c, q) => {
      soma += Math.cos(latitudeDaLinha(Math.floor(c / l), a));
      acumulado[q] = soma;
    });
    return {
      celulas: Int32Array.from(celulas),
      acumulado,
      largura: l,
      altura: a,
      areaKm2: Math.round(soma * celulaKm * celulaKm),
    };
  });
}

// ------------------------------------------------------------
// O RETALHO NA ESFERA
// ------------------------------------------------------------

/**
 * O PONTO DA ORIGEM do ponto `p` (esfera unitária) do retalho do `alvo`: as
 * mesmas coordenadas (x, y) no plano tangente gnomônico da `origem` — uma
 * rotação da esfera que leva o centro ao centro e o norte ao norte (sem giro
 * nem espelho). `alvo` e `origem` vêm de `planoTangente`; null no hemisfério
 * oposto ao centro do alvo.
 */
export function pontoDaOrigem(alvo, origem, p) {
  const d = p[0] * alvo.c[0] + p[1] * alvo.c[1] + p[2] * alvo.c[2];
  if (d <= 0) return null;
  const x = (p[0] * alvo.e[0] + p[1] * alvo.e[1] + p[2] * alvo.e[2]) / d;
  const y = (p[0] * alvo.n[0] + p[1] * alvo.n[1] + p[2] * alvo.n[2]) / d;
  const q = [0, 1, 2].map((i) => origem.c[i] + x * origem.e[i] + y * origem.n[i]);
  const r = Math.hypot(q[0], q[1], q[2]);
  return q.map((v) => v / r);
}

/** Bilinear de `campo` no ponto (x, y, z) da esfera unitária; com `coberto`, NaN se um dos quatro não está. Cópia de `bilinearNoPonto` (relevo-inventado.mjs, interna). */
function bilinearNoPonto(campo, largura, altura, x, y, z, coberto) {
  const u = (Math.atan2(y, x) / (2 * Math.PI) + 0.5) * largura - 0.5;
  const v = (0.5 - Math.asin(Math.max(-1, Math.min(1, z))) / Math.PI) * altura - 0.5;
  let i0 = Math.floor(u);
  const fx = u - i0;
  let j0 = Math.floor(v);
  let fy = v - j0;
  if (j0 < 0) {
    j0 = 0;
    fy = 0;
  } else if (j0 > altura - 2) {
    j0 = altura - 2;
    fy = 1;
  }
  if (i0 < 0) i0 += largura;
  const i1 = i0 + 1 < largura ? i0 + 1 : 0;
  const a = j0 * largura;
  const b = a + largura;
  if (coberto && !(coberto[a + i0] && coberto[a + i1] && coberto[b + i0] && coberto[b + i1])) return NaN;
  return (1 - fy) * ((1 - fx) * campo[a + i0] + fx * campo[a + i1]) + fy * ((1 - fx) * campo[b + i0] + fx * campo[b + i1]);
}

/** Bilinear dos dois campos entrelaçados de `dg` (detalhe, guia) no ponto (x, y, z): em `saida[0]`, `saida[1]`. */
function bilinearDuplo(dg, largura, altura, x, y, z, saida) {
  const u = (Math.atan2(y, x) / (2 * Math.PI) + 0.5) * largura - 0.5;
  const v = (0.5 - Math.asin(Math.max(-1, Math.min(1, z))) / Math.PI) * altura - 0.5;
  let i0 = Math.floor(u);
  const fx = u - i0;
  let j0 = Math.floor(v);
  let fy = v - j0;
  if (j0 < 0) {
    j0 = 0;
    fy = 0;
  } else if (j0 > altura - 2) {
    j0 = altura - 2;
    fy = 1;
  }
  if (i0 < 0) i0 += largura;
  const i1 = i0 + 1 < largura ? i0 + 1 : 0;
  const a = j0 * largura;
  const b = a + largura;
  const w00 = (1 - fx) * (1 - fy);
  const w01 = fx * (1 - fy);
  const w10 = (1 - fx) * fy;
  const w11 = fx * fy;
  const k00 = 2 * (a + i0);
  const k01 = 2 * (a + i1);
  const k10 = 2 * (b + i0);
  const k11 = 2 * (b + i1);
  saida[0] = w00 * dg[k00] + w01 * dg[k01] + w10 * dg[k10] + w11 * dg[k11];
  saida[1] = w00 * dg[k00 + 1] + w01 * dg[k01 + 1] + w10 * dg[k10 + 1] + w11 * dg[k11 + 1];
}

// ------------------------------------------------------------
// O CORTE DE ERRO MÍNIMO
// ------------------------------------------------------------

/**
 * A GEOMETRIA DO CORTE de um retalho de meia largura `meio` (texels) numa
 * grade local G×G (G = 2H + 1, centro em (H, H)): `nTheta` raios do centro;
 * no raio t, o estado r = "texels a menos de r do centro são novos", de 0 a
 * Rt + 1 (o 1º texel além do quadrado). O molde é o de `colcha`
 * (relevo-inventado.mjs).
 */
export function geometriaDoCorte(meio, H) {
  const G = 2 * H + 1;
  const nTheta = Math.ceil(2 * Math.PI * (meio * Math.SQRT2 + 1));
  const S = Math.floor(meio * Math.SQRT2) + 2;
  const Rt = new Int32Array(nTheta);
  const indice = new Int32Array(nTheta * S);
  for (let t = 0; t < nTheta; t += 1) {
    const th = (2 * Math.PI * t) / nTheta;
    const ct = Math.cos(th);
    const st = Math.sin(th);
    Rt[t] = Math.floor(meio / Math.max(Math.abs(ct), Math.abs(st)));
    for (let r = 0; r <= Rt[t] + 1; r += 1) indice[t * S + r] = (H + Math.round(r * st)) * G + H + Math.round(r * ct);
  }
  return {
    meio, H, G, nTheta, S, Rt, indice,
    custo: new Float64Array(nTheta * S),
    ponteiro: new Int8Array((nTheta + 1) * S),
    antes: new Float64Array(S),
    agora: new Float64Array(S),
    rCorte: new Float64Array(nTheta + 1),
  };
}

/**
 * O CORTE DE ERRO MÍNIMO (E&F 2001 §2.1, em curva fechada): a curva r(θ) em
 * volta do centro de menor soma de `custoDoTexel` (o erro velho − novo, por
 * texel da grade local) entre os texels que ficam velhos logo além dela. O
 * descoberto (`coberto` = 0) fica sempre dentro; o `fixo` (fora do alvo)
 * sempre fora — num raio, nada além do primeiro fixo vira novo. Programação
 * dinâmica em ângulo com passos radiais livres (Dijkstra numa coluna), como
 * em `colcha` (relevo-inventado.mjs). Escreve `geo.rCorte` (o raio em cada
 * raio, e o do raio 0 repetido no fim) e devolve o custo da curva (INF se não
 * há curva que cumpra as duas regras; aí o raio é o menor possível).
 */
export function corteDeErroMinimo(geo, custoDoTexel, coberto, fixo) {
  const { nTheta, S, Rt, indice, custo, ponteiro, rCorte } = geo;
  let livre = -1;
  for (let t = 0; t < nTheta; t += 1) {
    const R = Rt[t];
    const base = t * S;
    let rF = R + 2;
    for (let r = 0; r <= R + 1; r += 1) {
      if (fixo[indice[base + r]]) {
        rF = r;
        break;
      }
    }
    for (let r = R + 2; r < S; r += 1) custo[base + r] = INF;
    const gFora = indice[base + R + 1];
    custo[base + R + 1] = rF <= R ? INF : coberto[gFora] ? custoDoTexel[gFora] : 0;
    let todos = true;
    for (let r = R; r >= 0; r -= 1) {
      if (r > rF) {
        custo[base + r] = INF;
        continue;
      }
      const g = indice[base + r];
      if (r < rF && !coberto[g]) todos = false;
      custo[base + r] = todos ? custoDoTexel[g] : INF;
    }
    if (livre < 0 && custo[base + R] >= INF && custo[base + R + 1] === 0) livre = t;
  }
  let { antes, agora } = geo;
  const volta = (t0, inicio) => {
    for (let r = 0; r < S; r += 1) antes[r] = inicio < 0 || r === inicio ? custo[t0 * S + r] : INF;
    for (let passo = 1; passo <= nTheta; passo += 1) {
      const t = (t0 + passo) % nTheta;
      const tAntes = (t0 + passo - 1) % nTheta;
      const base = passo * S;
      for (let r = 0; r < S; r += 1) {
        let m = antes[r];
        let cod = 0;
        if (r > 0 && antes[r - 1] < m) {
          m = antes[r - 1];
          cod = 1;
        }
        if (r + 1 < S && antes[r + 1] < m) {
          m = antes[r + 1];
          cod = 2;
        }
        if (r === Rt[t] + 1 && antes[Rt[tAntes] + 1] < m) {
          m = antes[Rt[tAntes] + 1];
          cod = 5;
        }
        agora[r] = Math.min(INF, m + custo[t * S + r]);
        ponteiro[base + r] = cod;
      }
      for (let r = 1; r < S; r += 1) {
        const v = agora[r - 1] + custo[t * S + r];
        if (v < agora[r]) {
          agora[r] = v;
          ponteiro[base + r] = 3;
        }
      }
      for (let r = S - 2; r >= 0; r -= 1) {
        const v = agora[r + 1] + custo[t * S + r];
        if (v < agora[r]) {
          agora[r] = v;
          ponteiro[base + r] = 4;
        }
      }
      [antes, agora] = [agora, antes];
    }
    return antes;
  };
  const refaz = (t0, fim) => {
    let r = fim;
    for (let passo = nTheta; passo >= 1; passo -= 1) {
      const t = (t0 + passo) % nTheta;
      rCorte[t] = r;
      let cod = ponteiro[passo * S + r];
      while (cod === 3 || cod === 4) {
        r += cod === 3 ? -1 : 1;
        cod = ponteiro[passo * S + r];
      }
      const tAntes = (t0 + passo - 1) % nTheta;
      if (cod === 1) r -= 1;
      else if (cod === 2) r += 1;
      else if (cod === 5) r = Rt[tAntes] + 1;
    }
    rCorte[nTheta] = rCorte[0];
  };
  let total;
  if (livre >= 0) {
    total = volta(livre, Rt[livre] + 1)[Rt[livre] + 1];
    if (total < INF) refaz(livre, Rt[livre] + 1);
  } else {
    const fim = volta(0, -1);
    let rMin = 0;
    for (let r = 1; r < S; r += 1) if (fim[r] < fim[rMin]) rMin = r;
    total = volta(0, rMin)[rMin];
    if (total < INF) refaz(0, rMin);
  }
  geo.antes = antes;
  geo.agora = agora;
  if (total >= INF) {
    // sem curva que cumpra as duas regras: em cada raio, o menor estado possível
    for (let t = 0; t < nTheta; t += 1) {
      let r = 0;
      while (r < S - 1 && custo[t * S + r] >= INF) r += 1;
      rCorte[t] = r;
    }
    rCorte[nTheta] = rCorte[0];
    return INF;
  }
  return total;
}

/** O raio do corte (texels) no ângulo de (x, y), interpolado entre os raios. */
function raioDoCorte(geo, x, y) {
  let th = Math.atan2(y, x);
  if (th < 0) th += 2 * Math.PI;
  const ft = (th / (2 * Math.PI)) * geo.nTheta;
  const t = Math.min(geo.nTheta - 1, Math.floor(ft));
  return geo.rCorte[t] + (ft - t) * (geo.rCorte[t + 1] - geo.rCorte[t]);
}

// ------------------------------------------------------------
// A TRANSFERÊNCIA
// ------------------------------------------------------------

/**
 * UMA PASSADA DA TRANSFERÊNCIA (E&F §3): o `alvo` coberto por retalhos de
 * `larguraKm` em faixas de latitude (do topo do alvo ao polo sul, um retalho
 * no polo; o que sobrar descoberto ganha um retalho centrado nele). Cada
 * retalho: a unidade sorteada pelos pesos no centro; `CANDIDATOS` origens sorteadas nas
 * fontes dela; erro = α·(soma dos quadrados contra o já posto — a sobreposição
 * com esta passada, o resto com a anterior —, dividida pela energia dos dois
 * lados) + (1 − α)·(o mesmo para o guia centrado, no retalho inteiro); sorteio
 * entre os `MELHORES`; corte de erro mínimo contra o já posto desta passada e
 * rampa de `ESFUMADO_TEXELS`. Escreve em `campo` (detalhe), `coberto` e
 * `novo` (a fração que veio dos retalhos).
 */
function passadaDaTransferencia(ctx, { larguraKm, alfa, passoDasAmostras }, fontes, anterior) {
  const { L, A, raioKm, texelKm, dg, coef, guia, fixo, campo, coberto, novo, pesos, sorteia, registra } = ctx;
  const meio = larguraKm / 2 / texelKm;
  const H = Math.ceil(meio) + MARGEM_DO_RETALHO;
  const G = 2 * H + 1;
  const geo = geometriaDoCorte(meio, H);
  const passoRad = texelKm / raioKm;
  const passoKm = larguraKm * (1 - SOBREPOSICAO);
  const vizinhancaRad = (VIZINHANCA_SEM_REPETIR * larguraKm) / raioKm;
  const repeticaoRad = (RAIO_DE_REPETICAO * larguraKm) / raioKm;
  const raioDaCalota = Math.atan(((meio + MARGEM_DO_RETALHO + 1) * Math.SQRT2 * texelKm) / raioKm);
  const senLat = Float64Array.from({ length: A }, (_, j) => Math.sin(latitudeDaLinha(j, A)));
  const cosLat = Float64Array.from({ length: A }, (_, j) => Math.cos(latitudeDaLinha(j, A)));
  const cosLon = Float64Array.from({ length: L }, (_, i) => Math.cos(longitudeDaColuna(i, L) * RADIANOS));
  const senLon = Float64Array.from({ length: L }, (_, i) => Math.sin(longitudeDaColuna(i, L) * RADIANOS));

  // a grade local e os pontos que medem o erro
  const XL = new Float64Array(G * G);
  const YL = new Float64Array(G * G);
  const INV = new Float64Array(G * G);
  const dentro = new Uint8Array(G * G);
  const amostras = [];
  for (let b = 0; b < G; b += 1) {
    for (let a = 0; a < G; a += 1) {
      const g = b * G + a;
      XL[g] = (a - H) * passoRad;
      YL[g] = (b - H) * passoRad;
      INV[g] = 1 / Math.sqrt(1 + XL[g] * XL[g] + YL[g] * YL[g]);
      dentro[g] = Math.max(Math.abs(a - H), Math.abs(b - H)) <= meio ? 1 : 0;
      if (dentro[g] && (a - H) % passoDasAmostras === 0 && (b - H) % passoDasAmostras === 0) amostras.push(g);
    }
  }
  const nAm = amostras.length;
  const velho = new Float64Array(G * G);
  const cob = new Uint8Array(G * G);
  const fixoG = new Uint8Array(G * G);
  const custoDoTexel = new Float64Array(G * G);
  const temTextura = new Uint8Array(nAm);
  const texturaAlvo = new Float64Array(nAm);
  const guiaAlvo = new Float64Array(nAm);
  const duo = new Float64Array(2);

  const postos = [];
  const porUnidade = fontes.map(() => 0);
  let forcadas = 0;
  let semCurva = 0;
  let trocasDeUnidade = 0;
  let somaDaNota = 0;

  const sorteiaOrigem = (f) => {
    const x = sorteia() * f.acumulado[f.acumulado.length - 1];
    let lo = 0;
    let hi = f.acumulado.length - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (f.acumulado[m] < x) lo = m + 1;
      else hi = m;
    }
    const c = f.celulas[lo];
    const J = Math.floor(c / f.largura);
    const I = c % f.largura;
    return { lat: 90 - ((J + sorteia()) * 180) / f.altura, lon: 180 + ((I + sorteia()) * 360) / f.largura };
  };
  const texelDoPonto = (x, y, z) => {
    const i = Math.floor((Math.atan2(y, x) / (2 * Math.PI) + 0.5) * L) % L;
    const j = Math.min(A - 1, Math.floor((0.5 - Math.asin(Math.max(-1, Math.min(1, z))) / Math.PI) * A));
    return j * L + i;
  };
  const unidadeNoCentro = (latC, lonC) => {
    const { ids, pesos: p, largura: lp, altura: ap } = pesos;
    const y = linhaDaLatitude(latC, ap);
    const x = colunaDaLongitude(lonC, lp);
    const j0 = Math.min(ap - 2, Math.max(0, Math.floor(y)));
    const fy = Math.min(1, Math.max(0, y - j0));
    const i0 = ((Math.floor(x) % lp) + lp) % lp;
    const i1 = (i0 + 1) % lp;
    const fx = x - Math.floor(x);
    const valores = ids.map((_, u) => {
      if (!fontes[u]) return 0;
      const q = p[u];
      return Math.max(0, (1 - fy) * ((1 - fx) * q[j0 * lp + i0] + fx * q[j0 * lp + i1]) + fy * ((1 - fx) * q[(j0 + 1) * lp + i0] + fx * q[(j0 + 1) * lp + i1]));
    });
    // sorteada pelos pesos (como na colcha do relevo): a troca de unidade sai salpicada ao longo de
    // ~2σ dos pesos, e não na linha reta em que o peso dominante muda (a −28° no lado de trás)
    const total = valores.reduce((s, v) => s + v, 0);
    if (!(total > 0)) {
      trocasDeUnidade += 1;
      return fontes.findIndex(Boolean);
    }
    let resto = sorteia() * total;
    for (let u = 0; u < ids.length; u += 1) {
      if (!valores[u]) continue;
      resto -= valores[u];
      if (resto <= 0) return u;
    }
    return valores.findLastIndex((v) => v > 0);
  };

  /** Põe um retalho centrado em (lat, lon); false se ele não tinha nada a cobrir. */
  const poe = (latC, lonC) => {
    const alvo = planoTangente(latC, lonC);
    const [cx, cy, cz] = alvo.c;
    const [ex, ey, ez] = alvo.e;
    const [nx, ny, nz] = alvo.n;
    let descobertos = 0;
    for (let g = 0; g < G * G; g += 1) {
      const s = INV[g];
      const px = (cx + XL[g] * ex + YL[g] * nx) * s;
      const py = (cy + XL[g] * ey + YL[g] * ny) * s;
      const pz = (cz + XL[g] * ez + YL[g] * nz) * s;
      velho[g] = bilinearNoPonto(campo, L, A, px, py, pz, coberto);
      cob[g] = Number.isNaN(velho[g]) ? 0 : 1;
      fixoG[g] = fixo[texelDoPonto(px, py, pz)];
      if (dentro[g] && !cob[g]) descobertos += 1;
    }
    if (!descobertos) return false;
    let somaGuia = 0;
    let somaGuia2 = 0;
    for (let q = 0; q < nAm; q += 1) {
      const g = amostras[q];
      const s = INV[g];
      const px = (cx + XL[g] * ex + YL[g] * nx) * s;
      const py = (cy + XL[g] * ey + YL[g] * ny) * s;
      const pz = (cz + XL[g] * ez + YL[g] * nz) * s;
      if (cob[g]) {
        temTextura[q] = 1;
        texturaAlvo[q] = velho[g];
      } else if (anterior) {
        temTextura[q] = 1;
        texturaAlvo[q] = bilinearNoPonto(anterior, L, A, px, py, pz);
      } else temTextura[q] = 0;
      guiaAlvo[q] = bilinearNoPonto(guia, L, A, px, py, pz);
      somaGuia += guiaAlvo[q];
      somaGuia2 += guiaAlvo[q] * guiaAlvo[q];
    }
    const mediaGuia = somaGuia / nAm;
    const energiaGuia = somaGuia2 - nAm * mediaGuia * mediaGuia;

    const u = unidadeNoCentro(latC, lonC);
    const f = fontes[u];
    const avalia = (base) => {
      const [bx, by, bz] = base.c;
      const [bex, bey, bez] = base.e;
      const [bnx, bny, bnz] = base.n;
      let erroT = 0;
      let energiaT = 0;
      let nT = 0;
      let erroG = 0;
      let somaG = 0;
      let somaG2 = 0;
      for (let q = 0; q < nAm; q += 1) {
        const g = amostras[q];
        const s = INV[g];
        bilinearDuplo(dg, L, A, (bx + XL[g] * bex + YL[g] * bnx) * s, (by + XL[g] * bey + YL[g] * bny) * s, (bz + XL[g] * bez + YL[g] * bnz) * s, duo);
        if (temTextura[q]) {
          const d = texturaAlvo[q] - duo[0];
          erroT += d * d;
          energiaT += texturaAlvo[q] * texturaAlvo[q] + duo[0] * duo[0];
          nT += 1;
        }
        const dGuia = guiaAlvo[q] - duo[1];
        erroG += dGuia * dGuia;
        somaG += duo[1];
        somaG2 += duo[1] * duo[1];
      }
      const mediaG = somaG / nAm;
      const centrado = erroG - nAm * (mediaGuia - mediaG) ** 2;
      const notaGuia = centrado / (energiaGuia + somaG2 - nAm * mediaG * mediaG + PESO_MINIMO);
      if (!nT) return notaGuia;
      return alfa * (erroT / (energiaT + PESO_MINIMO)) + (1 - alfa) * notaGuia;
    };
    const melhores = [];
    const candidato = (forcado) => {
      const o = sorteiaOrigem(f);
      const base = planoTangente(o.lat, o.lon);
      const longe = repeticaoMaisPerto(postos, alvo.c, base.c, vizinhancaRad, repeticaoRad);
      if (!forcado && longe < Infinity) return;
      melhores.push({ nota: avalia(base), longe, base, origem: o });
      if (forcado) melhores.sort((a, b) => b.longe - a.longe || a.nota - b.nota);
      else melhores.sort((a, b) => a.nota - b.nota);
      if (melhores.length > MELHORES) melhores.pop();
    };
    for (let q = 0; q < CANDIDATOS; q += 1) candidato(false);
    for (let rodada = 1; rodada < RODADAS_DE_SORTEIO && !melhores.length; rodada += 1) {
      for (let q = 0; q < CANDIDATOS * 2 ** rodada; q += 1) candidato(false);
    }
    if (!melhores.length) {
      forcadas += 1;
      for (let q = 0; q < 2 * CANDIDATOS; q += 1) candidato(true);
      const corte = melhores[0].longe * 0.9;
      const longes = melhores.filter((m) => m.longe >= corte).sort((a, b) => a.nota - b.nota);
      melhores.splice(0, melhores.length, ...longes);
    }
    const escolhido = melhores[Math.floor(sorteia() * melhores.length)];
    somaDaNota += escolhido.nota;
    const { base } = escolhido;
    const [bx, by, bz] = base.c;
    const [bex, bey, bez] = base.e;
    const [bnx, bny, bnz] = base.n;

    // o corte, contra o já posto desta passada
    let temCorte = false;
    for (let g = 0; g < G * G; g += 1) {
      if (!cob[g]) {
        custoDoTexel[g] = 0;
        continue;
      }
      const s = INV[g];
      bilinearDuplo(dg, L, A, (bx + XL[g] * bex + YL[g] * bnx) * s, (by + XL[g] * bey + YL[g] * bny) * s, (bz + XL[g] * bez + YL[g] * bnz) * s, duo);
      custoDoTexel[g] = (velho[g] - duo[0]) ** 2 + 1e-6;
      temCorte = true;
    }
    if (temCorte && corteDeErroMinimo(geo, custoDoTexel, cob, fixoG) >= INF) semCurva += 1;

    // a escrita: cada texel da calota, pela rotação, com a rampa do corte
    const fatorPlano = raioKm / texelKm;
    const linhaC = linhaDaLatitude(latC, A);
    const raioEmLinhas = (raioDaCalota / Math.PI) * A;
    const j0 = Math.max(0, Math.floor(linhaC - raioEmLinhas));
    const j1 = Math.min(A - 1, Math.ceil(linhaC + raioEmLinhas));
    const senC = Math.sin(latC * RADIANOS);
    const cosC = Math.cos(latC * RADIANOS);
    const cosR = Math.cos(raioDaCalota);
    for (let j = j0; j <= j1; j += 1) {
      let i0 = 0;
      let nI = L;
      const den = cosLat[j] * cosC;
      if (den > 1e-12) {
        const q = (cosR - senLat[j] * senC) / den;
        if (q >= 1) continue;
        if (q > -1) {
          const dLon = Math.acos(q) * GRAUS;
          i0 = Math.floor(colunaDaLongitude(lonC - dLon, L));
          nI = Math.min(L, Math.ceil((2 * dLon * L) / 360) + 2);
        }
      }
      for (let w0 = 0; w0 < nI; w0 += 1) {
        const i = (((i0 + w0) % L) + L) % L;
        const k = j * L + i;
        if (fixo[k]) continue;
        const px = cosLat[j] * cosLon[i];
        const py = cosLat[j] * senLon[i];
        const pz = senLat[j];
        const d = px * cx + py * cy + pz * cz;
        if (d <= 0) continue;
        const pe = (px * ex + py * ey + pz * ez) / d;
        const pn = (px * nx + py * ny + pz * nz) / d;
        const x = pe * fatorPlano;
        const y = pn * fatorPlano;
        const lado = Math.max(Math.abs(x), Math.abs(y));
        if (lado > meio + MARGEM_DO_RETALHO) continue;
        let w = 1;
        if (!coberto[k]) {
          if (lado > meio) continue;
          if (temCorte && Math.hypot(x, y) >= raioDoCorte(geo, x, y) + 1) continue;
        } else {
          if (!temCorte) continue;
          w = Math.min(1, Math.max(0, 0.5 + (raioDoCorte(geo, x, y) - 0.5 - Math.hypot(x, y)) / ESFUMADO_TEXELS));
          if (w <= 0) continue;
        }
        const s = 1 / Math.sqrt(1 + pe * pe + pn * pn);
        const v = amostraNoPonto(coef, L, A, (bx + pe * bex + pn * bnx) * s, (by + pe * bey + pn * bny) * s, (bz + pe * bez + pn * bnz) * s);
        if (coberto[k]) {
          campo[k] = w * v + (1 - w) * campo[k];
          novo[k] = w + (1 - w) * novo[k];
        } else {
          campo[k] = v;
          novo[k] = 1;
          coberto[k] = 1;
        }
      }
    }
    postos.push({ alvo: alvo.c, origem: base.c });
    porUnidade[u] += 1;
    return true;
  };

  // as faixas de latitude, do topo do descoberto ao polo sul
  let topo = -90;
  for (let j = 0; j < A && topo === -90; j += 1) {
    for (let i = 0; i < L; i += 1) {
      if (!coberto[j * L + i]) {
        topo = latitudeDaLinha(j, A) * GRAUS;
        break;
      }
    }
  }
  const kmPorGrau = raioKm * RADIANOS;
  const nFaixas = Math.ceil(((topo + 90) * kmPorGrau) / passoKm) + 1;
  let emFaixas = 0;
  for (let b = 0; b < nFaixas; b += 1) {
    const lat = topo - ((topo + 90) * b) / (nFaixas - 1);
    const quantos = b === nFaixas - 1 ? 1 : Math.max(1, Math.ceil((2 * Math.PI * raioKm * Math.cos(lat * RADIANOS)) / passoKm));
    const inicio = 360 * sorteia();
    for (let q = 0; q < quantos; q += 1) {
      const lon = inicio + (360 * q) / quantos;
      // centro fora do alvo: desce pelo meridiano até um oitavo de largura por vez, até meia largura
      let latC = lat;
      for (let passo = 0; passo <= 8; passo += 1) {
        latC = Math.max(-90, lat - (passo * larguraKm) / 16 / kmPorGrau);
        const j = Math.min(A - 1, Math.max(0, Math.round(linhaDaLatitude(latC, A))));
        const i = ((Math.round(colunaDaLongitude(lon, L)) % L) + L) % L;
        if (!fixo[j * L + i]) break;
        latC = null;
      }
      if (latC !== null && poe(latC, lon)) emFaixas += 1;
    }
  }
  // o que ficou descoberto
  let preenchimento = 0;
  let largados = 0;
  for (let k = 0; k < L * A; k += 1) {
    if (coberto[k] || fixo[k]) continue;
    const j = Math.floor(k / L);
    poe(latitudeDaLinha(j, A) * GRAUS, longitudeDaColuna(k % L, L));
    preenchimento += 1;
    if (!coberto[k]) {
      // nem o retalho centrado nele o cobriu: fica só o tom
      campo[k] = 0;
      novo[k] = 1;
      coberto[k] = 1;
      largados += 1;
    }
  }
  const resumo = {
    larguraKm,
    alfa,
    retalhos: emFaixas,
    preenchimento,
    porUnidade,
    trocasDeUnidade,
    repeticoesForcadas: forcadas,
    cortesSemCurva: semCurva,
    notaMedia: +(somaDaNota / Math.max(1, emFaixas + preenchimento)).toFixed(4),
    largados,
  };
  registra(`passada ${larguraKm} km, α ${alfa}: ${JSON.stringify(resumo)}`);
  return resumo;
}

// ------------------------------------------------------------
// A PORTA DE ENTRADA
// ------------------------------------------------------------

/**
 * A COR INVENTADA DE UM CORPO — a ÚNICA função que a prévia e o gerador
 * chamam. `cor` = o mapa de cor na grade do destino (Uint8Array, `canais` 1 ou
 * 3, `largura`×`altura` — a saída da redução, antes do jpg); `mascaras` =
 * `{ vazio, semDado }` no destino, ou `cru` = `{ pixels, largura, altura,
 * canais }` (o mosaico cru, antes do tapa-buraco) para montá-las; `normais` =
 * `{ pixels (RGB), largura, altura }` (o normal.png da casa); `fonte` = o JSON
 * do relevo do corpo; `semente` fixa. `opcoes.registra` recebe o andamento.
 * Devolve `{ cor, mascaras, chave: 'sul:1', relatorio }` — `cor` no formato
 * da entrada, igual a ela byte a byte fora do alvo.
 */
export function inventaCorDoCorpo({ id, cor, largura: L, altura: A, canais, mascaras: dadas, cru, normais, fonte, semente, opcoes = {} }) {
  const registra = opcoes.registra ?? (() => {});
  const relogio = Date.now();
  const tempo = () => `${((Date.now() - relogio) / 1000).toFixed(1)} s`;
  const raioM = opcoes.raioM ?? fonte.raioM ?? { charon: 606000, pluto: 1188300 }[id];
  if (!raioM) throw new Error(`inventaCorDoCorpo: sem raio para ${id}.`);
  const sol = opcoes.sol ?? SOL_ASSADO[id];
  if (!sol) throw new Error(`inventaCorDoCorpo: sem o Sol assado de ${id}.`);
  const n = L * A;
  const raioKm = raioM / 1000;
  const texelKm = raioKm * (Math.PI / A);

  // o brilho (um canal: a M1 é Caronte, cinza em três canais iguais)
  const valor = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    const v = cor[k * canais];
    for (let c = 1; c < canais; c += 1) {
      if (cor[k * canais + c] !== v) throw new Error('inventaCorDoCorpo: cor com canais diferentes — a cor em três canais é a etapa M1b.');
    }
    valor[k] = v;
  }

  // as máscaras
  let vazio;
  let semDado;
  if (dadas) ({ vazio, semDado } = dadas);
  else {
    const fonteCru = vazioDoMosaico(cru.pixels, cru.largura, cru.altura, cru.canais);
    vazio = dilataMascara(reduzMascara(fonteCru.vazio, cru.largura, cru.altura, L, A), L, A, HALO_DO_VAZIO_TEXELS);
    semDado = reduzMascara(fonteCru.semDado, cru.largura, cru.altura, L, A);
    semDado = dilataMascara(semDado, L, A, HALO_DOS_BURACOS_TEXELS);
    for (let k = 0; k < n; k += 1) if (vazio[k]) semDado[k] = 0;
  }
  const m = mascarasDaCor({ valor, vazio, semDado, largura: L, altura: A, raioM, registra });
  registra(`máscaras prontas (${tempo()})`);

  // o tom: passa-baixa do fotografado que não é faixa, membrana no alvo
  const dadoDoTom = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) dadoDoTom[k] = !m.vazio[k] && !m.semDado[k] && !m.faixa[k] ? 1 : 0;
  const tom = tomDeGrandeEscala({ valor, dadoDoTom, alvo: m.alvo, largura: L, altura: A, raioM });
  registra(`tom pronto (${tempo()})`);

  // o detalhe (brilho − tom) e o guia; a SOMBRA ASSADA sai do detalhe: a parte que o sombreado do
  // relevo explica (regressão no `bom`, na banda abaixo de σ do tom) — os retalhos levam o albedo, e
  // o alvo recebe a sombra do PRÓPRIO relevo com o mesmo ganho (o lado medido correlaciona 0,34 com
  // n·L; só a escolha do retalho pelo guia dá ~0,01 — medido na 1ª prévia)
  const guia = guiaDoRelevo(normais.pixels, normais.largura, normais.altura, L, A, sol);
  const um = new Uint8Array(n).fill(1);
  const passaBaixaDoGuia = desfocaComMascara(guia, um, L, A, raioM, SIGMA_DO_TOM_KM).valor;
  const sombra = Float32Array.from(guia, (g, k) => g - passaBaixaDoGuia[k]);
  const detalhe = new Float32Array(n);
  for (let k = 0; k < n; k += 1) detalhe[k] = m.vazio[k] ? 0 : valor[k] - tom[k];
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let j = 0; j < A; j += 2) {
    const w = Math.cos(latitudeDaLinha(j, A));
    for (let i = 0; i < L; i += 2) {
      const k = j * L + i;
      if (!m.bom[k]) continue;
      sxy += w * detalhe[k] * sombra[k];
      sxx += w * sombra[k] * sombra[k];
      syy += w * detalhe[k] * detalhe[k];
    }
  }
  const ganhoDaSombra = opcoes.sombreia === false ? 0 : sxy / sxx;
  const correlacaoNoBom = sxy / Math.sqrt(sxx * syy);
  for (let k = 0; k < n; k += 1) if (!m.vazio[k]) detalhe[k] -= ganhoDaSombra * sombra[k];
  registra(`sombra assada: ganho ${ganhoDaSombra.toFixed(1)} DN por unidade de n·L, correlação no bom ${correlacaoNoBom.toFixed(3)}`);
  const dg = new Float32Array(2 * n);
  for (let k = 0; k < n; k += 1) {
    dg[2 * k] = detalhe[k];
    dg[2 * k + 1] = guia[k];
  }
  const coef = coeficientesDeSpline(detalhe, L, A);
  registra(`guia e spline prontos (${tempo()})`);

  // as unidades (a 4096) e as fontes
  const lp = Math.min(L, 4096);
  const ap = (A * lp) / L;
  const pesos = { ...pesosDasUnidades(fonte, lp, ap, raioM), largura: lp, altura: ap };
  const naoBom = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) naoBom[k] = m.bom[k] ? 0 : 1;
  const lq = L / FATOR_DAS_FONTES;
  const aq = A / FATOR_DAS_FONTES;
  const distanciaAoRuim = distanciaAoVazioKm(ouEmBlocos(naoBom, L, A, FATOR_DAS_FONTES), lq, aq, raioM);
  const fontesPorPassada = PASSADAS.map((p) => fontesDaCor({ distanciaAoRuim, largura: lq, altura: aq, fonte, raioM, larguraKm: p.larguraKm }));
  const resumoDasFontes = PASSADAS.map((p, q) => ({
    larguraKm: p.larguraKm,
    unidades: Object.fromEntries(pesos.ids.map((idU, u) => [idU, fontesPorPassada[q][u] ? { centros: fontesPorPassada[q][u].celulas.length, areaKm2: fontesPorPassada[q][u].areaKm2 } : null])),
  }));
  registra(`fontes: ${JSON.stringify(resumoDasFontes)} (${tempo()})`);
  fontesPorPassada.forEach((f, q) => {
    if (!f.some(Boolean)) throw new Error(`inventaCorDoCorpo: nenhuma unidade tem fonte para retalhos de ${PASSADAS[q].larguraKm} km.`);
  });

  // as passadas
  const sorteia = geradorDeSemente(semente);
  const campo = new Float32Array(n);
  const coberto = new Uint8Array(n);
  const novo = new Float32Array(n);
  const fixo = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) fixo[k] = m.alvo[k] ? 0 : 1;
  let anterior = null;
  const passadas = [];
  for (const [q, p] of PASSADAS.entries()) {
    for (let k = 0; k < n; k += 1) {
      const velhoAqui = fixo[k] || m.livre[k];
      campo[k] = velhoAqui ? detalhe[k] : 0;
      coberto[k] = velhoAqui ? 1 : 0;
      novo[k] = 0;
    }
    const ctx = { L, A, raioKm, texelKm, dg, coef, guia, fixo, campo, coberto, novo, pesos, sorteia, registra };
    passadas.push(passadaDaTransferencia(ctx, p, fontesPorPassada[q], anterior));
    anterior = Float32Array.from(campo);
    registra(`passada ${q + 1} pronta (${tempo()})`);
  }

  // o tom no lugar da escala grande da colcha: resultado = colcha − passa-baixa(colcha) + tom, com a
  // sombra do relevo do alvo de volta (no que ficou do fotografado ela devolve o brilho original)
  const f = FATOR_DO_TOM;
  const r = reduzEmBlocos(campo, novo, L, A, f);
  const passaBaixaDaColcha = desfocaComMascara(r.valor, r.fracao, r.largura, r.altura, raioM, SIGMA_DA_COLCHA_KM).valor;
  for (let c = 0; c < passaBaixaDaColcha.length; c += 1) if (!Number.isFinite(passaBaixaDaColcha[c])) passaBaixaDaColcha[c] = 0;
  const escalaGrande = sobeBilinear(passaBaixaDaColcha, r.largura, r.altura, L, A);
  const total = new Float32Array(n);
  for (let k = 0; k < n; k += 1) total[k] = campo[k] - novo[k] * escalaGrande[k] + ganhoDaSombra * sombra[k];

  // junto do vizinho DESFOCADO (sem energia; o riscado não conta), na meia grade: a distância de cada
  // texel do alvo ao de fora e a classe do de fora mais perto dão o desfoque (ver
  // `DESFOQUE_DO_BORRADO_KM`) e a mistura com o fotografado na zona livre (ver `ZONA_LIVRE_KM`)
  const l2 = L / 2;
  const a2 = A / 2;
  const foraDesfocado = new Uint8Array(n);
  const foraNitido = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) {
    if (!fixo[k]) continue;
    if (m.desfocado[k]) foraDesfocado[k] = 1;
    else foraNitido[k] = 1;
  }
  const ateDesfocado = distanciaAoVazioKm(ouEmBlocos(foraDesfocado, L, A, 2), l2, a2, raioM);
  const ateNitido = distanciaAoVazioKm(ouEmBlocos(foraNitido, L, A, 2), l2, a2, raioM);
  const alvo2 = ouEmBlocos(m.alvo, L, A, 2);
  const desfoque = new Float32Array(l2 * a2);
  const mistura = new Float32Array(l2 * a2).fill(1);
  let comDesfoque = 0;
  let noAlvo = 0;
  for (let c = 0; c < l2 * a2; c += 1) {
    if (!alvo2[c]) continue;
    noAlvo += 1;
    const dentro = Math.min(ateDesfocado[c], ateNitido[c]);
    const t = Math.min(1, dentro / RAMPA_DO_DESFOQUE_KM);
    const x = Math.min(1, Math.max(0, (ateNitido[c] - ateDesfocado[c] + TRANSICAO_DA_CLASSE_KM) / (2 * TRANSICAO_DA_CLASSE_KM)));
    const classe = x * x * (3 - 2 * x);
    desfoque[c] = DESFOQUE_DO_BORRADO_KM * classe * (1 - t * t * (3 - 2 * t));
    const u = Math.min(1, dentro / ZONA_LIVRE_KM);
    mistura[c] = 1 - classe * (1 - u * u * (3 - 2 * u));
    if (desfoque[c] > 0.01) comDesfoque += 1;
  }
  const niveis = NIVEIS_DO_DESFOQUE_KM.map((s) => (s ? desfocaComMascara(total, um, L, A, raioM, s).valor : total));
  registra(`desfoque junto do borrado pronto: ${((100 * comDesfoque) / noAlvo).toFixed(1)} % do alvo (${tempo()})`);

  const resultado = Float32Array.from(valor);
  for (let j = 0; j < A; j += 1) {
    for (let i = 0; i < L; i += 1) {
      const k = j * L + i;
      if (!m.alvo[k]) continue;
      const s = desfoque[(j >> 1) * l2 + (i >> 1)];
      let d = total[k];
      if (s > 0.01) {
        let q = 1;
        while (q < NIVEIS_DO_DESFOQUE_KM.length - 1 && NIVEIS_DO_DESFOQUE_KM[q] < s) q += 1;
        const s0 = NIVEIS_DO_DESFOQUE_KM[q - 1];
        const s1 = NIVEIS_DO_DESFOQUE_KM[q];
        const w = Math.min(1, (s - s0) / (s1 - s0));
        d = (1 - w) * niveis[q - 1][k] + w * niveis[q][k];
      }
      // na zona livre junto do desfocado, o fotografado de verdade passa ao inventado sem corte
      const f = mistura[(j >> 1) * l2 + (i >> 1)];
      resultado[k] = f * (tom[k] + d) + (1 - f) * valor[k];
    }
  }

  // A COSTURA FINAL (Pérez, Gangnet & Blake 2003, "Poisson Image Editing", só no degrau médio). A
  // borda do alvo é a borda de fora da faixa, que tem foto: o degrau é o quanto o resultado se
  // afasta do fotografado nos texels do alvo que encostam no de fora, em média ao longo da borda (σ
  // `SIGMA_DO_DEGRAU_KM`, na meia grade) — sem o viés de gradiente das médias de um lado só (a 5ª
  // prévia mediu assim e PÔS 12 DN no flanco de uma mancha escura a 57°E). Ele vira a condição de
  // borda de uma membrana, somada ao alvo: o resultado casa com a foto na borda e a correção decai
  // para dentro sem desenhar nada.
  const somaDoDegrau = new Float32Array(l2 * a2);
  const naBorda = new Float32Array(l2 * a2);
  for (let j = 1; j < A - 1; j += 1) {
    for (let i = 0; i < L; i += 1) {
      const k = j * L + i;
      if (!m.alvo[k] || m.semDado[k] || m.vazio[k]) continue;
      const encosta = !m.alvo[k - L] || !m.alvo[k + L] || !m.alvo[j * L + ((i + 1) % L)] || !m.alvo[j * L + ((i - 1 + L) % L)];
      if (!encosta) continue;
      const c = (j >> 1) * l2 + (i >> 1);
      somaDoDegrau[c] += valor[k] - resultado[k];
      naBorda[c] += 1;
    }
  }
  let degrauMedio = 0;
  let celulasDaBorda = 0;
  for (let c = 0; c < l2 * a2; c += 1) {
    if (!naBorda[c]) continue;
    somaDoDegrau[c] /= naBorda[c];
    naBorda[c] = 1;
    degrauMedio += Math.abs(somaDoDegrau[c]);
    celulasDaBorda += 1;
  }
  const degrauSuave = desfocaComMascara(somaDoDegrau, naBorda, l2, a2, raioM, SIGMA_DO_DEGRAU_KM).valor;
  const fora2 = new Uint8Array(l2 * a2).fill(1);
  for (let k = 0; k < n; k += 1) if (m.alvo[k]) fora2[(Math.floor(k / L) >> 1) * l2 + ((k % L) >> 1)] = 0;
  const degrau = new Float32Array(l2 * a2);
  for (let c = 0; c < l2 * a2; c += 1) if (fora2[c] && Number.isFinite(degrauSuave[c])) degrau[c] = degrauSuave[c];
  const correcao = sobeBilinear(Float32Array.from(membranaHarmonica(degrau, fora2, l2, a2, raioM, SIGMA_DA_MEMBRANA_KM)), l2, a2, L, A);
  registra(`costura final: |foto − resultado| médio na borda do alvo ${(degrauMedio / Math.max(1, celulasDaBorda)).toFixed(2)} DN (${tempo()})`);

  const saida = Uint8Array.from(cor);
  let mudados = 0;
  for (let k = 0; k < n; k += 1) {
    if (!m.alvo[k]) continue;
    const v = Math.min(255, Math.max(0, Math.round(resultado[k] + correcao[k])));
    if (v !== cor[k * canais]) mudados += 1;
    for (let c = 0; c < canais; c += 1) saida[k * canais + c] = v;
  }
  registra(`pronto: ${mudados} texels mudados, todos no alvo (${tempo()})`);
  return {
    cor: saida,
    mascaras: m,
    chave: 'sul:1',
    relatorio: {
      id,
      semente,
      largura: L,
      altura: A,
      texelKm: +texelKm.toFixed(4),
      mascaras: m.porcento,
      rmsDoPassaAltaNitido: +m.rmsDeReferencia.toFixed(2),
      faixaRasanteKm: FAIXA_RASANTE_KM,
      zonaLivreKm: ZONA_LIVRE_KM,
      sol,
      sombraAssada: { ganhoDN: +ganhoDaSombra.toFixed(2), correlacaoNoBom: +correlacaoNoBom.toFixed(3) },
      tom: { sigmaKm: SIGMA_DO_TOM_KM, sigmaDaColchaKm: SIGMA_DA_COLCHA_KM },
      desfoqueJuntoDoBorrado: { sigmaKm: DESFOQUE_DO_BORRADO_KM, rampaKm: RAMPA_DO_DESFOQUE_KM, porcentoDoAlvo: +((100 * comDesfoque) / noAlvo).toFixed(1) },
      fontes: resumoDasFontes,
      passadas,
      texelsMudados: mudados,
      tempoS: +((Date.now() - relogio) / 1000).toFixed(1),
    },
  };
}
