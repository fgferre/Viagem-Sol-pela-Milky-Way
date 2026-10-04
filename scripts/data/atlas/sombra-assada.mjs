// ============================================================
// A SOMBRA ASSADA DAS FOTOS DA SONDA (PLAN-SOMBRA.md, 03/10/2026)
//
// O DEFEITO. O mapa de cor do lado fotografado de Plutão e Caronte traz a
// sombra do relevo sob o Sol da hora de cada foto da New Horizons, e o app
// acende o MESMO relevo (o normal.png, Lambert) com o Sol dele: do mesmo lado,
// a sombra dobra; do lado oposto, as duas brigam.
//
// O QUE A MEDIDA DISSE (03/10, réguas em capturas/sombra-dobrada/ferramentas):
//  - foto e DEM estão alinhados (deslocamento ótimo de 0 texel);
//  - na região nítida de Caronte (Oz Terra) a banda de 4–10 km do brilho
//    correlaciona r = 0,68 com o sombreado do DEM, com o ganho de Lambert para
//    o Sol a ~40–45°;
//  - o Sol muda de foto para foto do mosaico: a direção que os dados pedem é
//    ~300–340° (de onde vem a luz, horário a partir do norte) no hemisfério das
//    fotos e vira para o sul ao norte de ~50°N — o ponto subsolar estava a ~51°N
//    no sobrevoo. Um Sol só para o globo explica bem menos;
//  - o chiado fino do DEM dilui o ganho nas bandas finas; onde a foto é borrada
//    ou o fino do normal.png foi reinventado, a correlação some sozinha.
//
// O MÉTODO. Sai só o que o relevo MEDIDO explica, por mínimos quadrados locais,
// na grade das normais:
//  - o brilho relativo (brilho ÷ passa-baixa do topo − 1) e as componentes
//    leste (x) e norte (y) das normais partidos nas OITAVAS do relevo
//    (`sigmasDasOitavas`, as mesmas bandas que o relevo inventado declara
//    medidas ou não), até `topoKm`;
//  - a DIREÇÃO do Sol local: regressão de duas variáveis (o brilho em x e y)
//    nas bandas de σ₀ ao topo (a banda 0, a do chiado, fica fora), numa janela
//    grande (`janelaDaDirecaoKm`) — só o ângulo é usado, e ele é estável;
//  - em cada banda, a derivada do relevo NESSA direção, d = ux·x + uy·y, e o
//    GANHO da banda por mínimos quadrados de uma variável numa janela pequena
//    (`janelaDoGanho` × o σ de cima da banda, nunca menos que `janelaMinKm`),
//    preso em [0, `ganhoMax`]: onde a foto é borrada ou o DEM é ruim, o ganho
//    cai sozinho, e onde é nítida ele chega ao de Lambert;
//  - as caixas `dadoRuim` do JSON do relevo (limbo de Caronte, preenchimento
//    polar dos dois) tiram do domínio as bandas que o relevo reinventou nelas
//    (σ de cima ≤ `sigmaMaximoKm`) — ali não há o que explicar;
//  - a sombra prevista é P = Σ ganho·d, com a rampa (`rampaKm`) da borda do
//    domínio de cada banda; o brilho corrigido é brilho ÷ (1 + P), o mesmo
//    fator nos canais (a sombra não tem cor), com o fator limitado a
//    `fatorLimite`.
//
// O QUE FICA (confessado): a sombra mais fina que o DEM resolve — as linhas
// escuras das sombras projetadas nas escarpas, o grão — continua na foto.
//
// DETERMINÍSTICO e puro: não lê nem grava disco.
// ============================================================

import { desfocaComMascara, distanciaAoVazioKm, mascaraDaCaixa, sigmasDasOitavas } from './relevo-inventado.mjs';

/** Os números do método (o cabeçalho), os mesmos nos dois corpos. */
export const SOMBRA_ASSADA = Object.freeze({
  topoKm: 60,
  janelaDaDirecaoKm: 150,
  janelaDoGanho: 3,
  janelaMinKm: 30,
  ganhoMax: 2,
  rampaKm: 60,
  cresta: 0.02,
  fatorLimite: Object.freeze([0.5, 2]),
});

/**
 * A SOMBRA ASSADA PREVISTA na grade L×A das normais. `brilho` (L×A, DN); `dominio` (L×A, 1 onde há foto E DEM
 * medido); `normais` = { pixels (RGB do normal.png, n = rgb/127,5 − 1, x = leste, y = norte), largura, altura }
 * na mesma grade; `dadoRuim` = as caixas do JSON do relevo. Devolve `{ sombra (Float32Array L×A, a fração do
 * brilho; 0 fora), azimute (graus, NaN fora), porBanda }`.
 */
export function estimaSombraAssada({ brilho, dominio, normais, raioM, dadoRuim = [], parametros = SOMBRA_ASSADA }) {
  const { largura: L, altura: A } = normais;
  const { topoKm, janelaDaDirecaoKm, janelaDoGanho, janelaMinKm, ganhoMax, rampaKm, cresta } = parametros;
  const n = L * A;
  if (brilho.length !== n || dominio.length !== n) throw new Error('estimaSombraAssada: brilho, domínio e normais em grades diferentes.');
  const sigmas = sigmasDasOitavas(raioM, A).filter((s) => s <= topoKm * (1 + 1e-9));
  const caixas = dadoRuim.filter((c) => c.sigmaMaximoKm !== undefined).map((c) => ({ mascara: mascaraDaCaixa(c, L, A), sigmaMaximoKm: c.sigmaMaximoKm }));
  const D = Float32Array.from(dominio, (v) => (v ? 1 : 0));
  const nx = new Float32Array(n);
  const ny = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    const x = normais.pixels[3 * k] / 127.5 - 1;
    const y = normais.pixels[3 * k + 1] / 127.5 - 1;
    const z = normais.pixels[3 * k + 2] / 127.5 - 1;
    const r = Math.hypot(x, y, z) || 1;
    nx[k] = x / r;
    ny[k] = y / r;
  }
  const topo = sigmas[sigmas.length - 1];
  const media = (campo, peso, sigmaKm) => desfocaComMascara(campo, peso, L, A, raioM, sigmaKm).valor;
  const passaBaixa = media(brilho, D, topo);
  const relativo = Float32Array.from(brilho, (v, k) => (D[k] && passaBaixa[k] > 1 ? v / passaBaixa[k] - 1 : 0));
  // os níveis de cima (σ do topo) dos três campos, e a diferença de dois níveis onde os dois existem
  const topoDe = [relativo, nx, ny].map((campo) => media(campo, D, topo));
  const diferenca = (baixo, alto, mascara) => Float32Array.from(baixo, (v, k) => (mascara[k] && Number.isFinite(v) && Number.isFinite(alto[k]) ? v - alto[k] : 0));

  // A DIREÇÃO: das bandas de σ₀ ao topo, no domínio sem caixa `dadoRuim` nenhuma
  const Ddir = Float32Array.from(D);
  for (const c of caixas) for (let k = 0; k < n; k += 1) if (c.mascara[k]) Ddir[k] = 0;
  const [yd, xd1, xd2] = [relativo, nx, ny].map((campo, q) => diferenca(media(campo, D, sigmas[0]), topoDe[q], Ddir));
  const s11 = media(Float32Array.from(xd1, (v) => v * v), Ddir, janelaDaDirecaoKm);
  const s22 = media(Float32Array.from(xd2, (v) => v * v), Ddir, janelaDaDirecaoKm);
  const s12 = media(Float32Array.from(xd1, (v, k) => v * xd2[k]), Ddir, janelaDaDirecaoKm);
  const s1y = media(Float32Array.from(xd1, (v, k) => v * yd[k]), Ddir, janelaDaDirecaoKm);
  const s2y = media(Float32Array.from(xd2, (v, k) => v * yd[k]), Ddir, janelaDaDirecaoKm);
  const ux = new Float32Array(n);
  const uy = new Float32Array(n);
  const azimute = new Float32Array(n).fill(NaN);
  for (let k = 0; k < n; k += 1) {
    if (!D[k] || !Number.isFinite(s11[k])) continue;
    const t = cresta * 0.5 * (s11[k] + s22[k]);
    const m11 = s11[k] + t;
    const m22 = s22[k] + t;
    const det = m11 * m22 - s12[k] * s12[k];
    if (!(det > 0)) continue;
    const a = (m22 * s1y[k] - s12[k] * s2y[k]) / det;
    const b = (m11 * s2y[k] - s12[k] * s1y[k]) / det;
    const m = Math.hypot(a, b);
    if (!(m > 0)) continue;
    ux[k] = a / m;
    uy[k] = b / m;
    azimute[k] = ((Math.atan2(a, b) * 180) / Math.PI + 360) % 360;
  }

  // AS BANDAS: o nível de baixo de cada uma é o de cima da anterior (o campo cru na banda 0)
  const sombra = new Float32Array(n);
  const porBanda = [];
  let baixo = [relativo, nx, ny];
  for (let b = 0; b < sigmas.length; b += 1) {
    const alto = b === sigmas.length - 1 ? topoDe : [relativo, nx, ny].map((campo) => media(campo, D, sigmas[b]));
    const Db = Float32Array.from(D);
    for (const c of caixas) if (sigmas[b] <= c.sigmaMaximoKm * (1 + 1e-9)) for (let k = 0; k < n; k += 1) if (c.mascara[k]) Db[k] = 0;
    const [yb, x1, x2] = baixo.map((campo, q) => diferenca(campo, alto[q], Db));
    const d = Float32Array.from(x1, (v, k) => ux[k] * v + uy[k] * x2[k]);
    const janela = Math.max(janelaMinKm, janelaDoGanho * sigmas[b]);
    const sdd = media(Float32Array.from(d, (v) => v * v), Db, janela);
    const sdy = media(Float32Array.from(d, (v, k) => v * yb[k]), Db, janela);
    const distancia = distanciaAoVazioKm(Uint8Array.from(Db, (v) => (v ? 0 : 1)), L, A, raioM);
    let soma = 0;
    let conta = 0;
    for (let k = 0; k < n; k += 1) {
      if (!Db[k] || !(sdd[k] > 0)) continue;
      const ganho = Math.min(ganhoMax, Math.max(0, sdy[k] / (sdd[k] * (1 + cresta))));
      const u = Math.min(1, distancia[k] / rampaKm);
      sombra[k] += u * u * (3 - 2 * u) * ganho * d[k];
      soma += ganho;
      conta += 1;
    }
    porBanda.push({ deKm: b ? +sigmas[b - 1].toFixed(2) : 0, ateKm: +sigmas[b].toFixed(2), janelaKm: +janela.toFixed(1), ganhoMedio: +(soma / Math.max(1, conta)).toFixed(3) });
    baixo = alto;
  }
  return { sombra, azimute, porBanda };
}

/**
 * A MÉDIA de `valor` (Lf×Af) em cada texel da grade L×A: cada texel fino vai ao grosso que contém o centro dele
 * (as duas grades cobrem o globo inteiro). Quem não recebeu ninguém fica NaN.
 */
export function mediaNaGrade(valor, Lf, Af, L, A) {
  const soma = new Float64Array(L * A);
  const conta = new Uint32Array(L * A);
  for (let j = 0; j < Af; j += 1) {
    const jj = Math.min(A - 1, Math.floor(((j + 0.5) * A) / Af));
    for (let i = 0; i < Lf; i += 1) {
      const c = jj * L + Math.min(L - 1, Math.floor(((i + 0.5) * L) / Lf));
      soma[c] += valor[j * Lf + i];
      conta[c] += 1;
    }
  }
  return Float32Array.from(soma, (s, c) => (conta[c] ? s / conta[c] : NaN));
}

/**
 * TIRA A SOMBRA: `cor` (Lf×Af×canais, Uint8) ÷ (1 + P), com P (`sombra`, na grade L×A) levada à grade da cor por
 * bilinear nos centros (com a volta da longitude) e o fator limitado a `fatorLimite`. Devolve `{ cor, mudados }`;
 * onde P = 0 o texel sai byte a byte igual.
 */
export function tiraSombraAssada({ cor, largura: Lf, altura: Af, canais, sombra, L, A, fatorLimite = SOMBRA_ASSADA.fatorLimite }) {
  const saida = Uint8Array.from(cor);
  let mudados = 0;
  for (let j = 0; j < Af; j += 1) {
    const y = ((j + 0.5) * A) / Af - 0.5;
    let j0 = Math.floor(y);
    let fy = y - j0;
    if (j0 < 0) {
      j0 = 0;
      fy = 0;
    } else if (j0 > A - 2) {
      j0 = A - 2;
      fy = 1;
    }
    for (let i = 0; i < Lf; i += 1) {
      const x = ((i + 0.5) * L) / Lf - 0.5;
      let i0 = Math.floor(x);
      const fx = x - i0;
      if (i0 < 0) i0 += L;
      const i1 = i0 + 1 < L ? i0 + 1 : 0;
      const p =
        (1 - fy) * ((1 - fx) * sombra[j0 * L + i0] + fx * sombra[j0 * L + i1]) +
        fy * ((1 - fx) * sombra[(j0 + 1) * L + i0] + fx * sombra[(j0 + 1) * L + i1]);
      if (p === 0) continue;
      const fator = 1 / Math.min(fatorLimite[1], Math.max(fatorLimite[0], 1 + p));
      const k = j * Lf + i;
      let mudou = false;
      for (let c = 0; c < canais; c += 1) {
        const v = Math.min(255, Math.max(0, Math.round(cor[k * canais + c] * fator)));
        if (v !== saida[k * canais + c]) mudou = true;
        saida[k * canais + c] = v;
      }
      if (mudou) mudados += 1;
    }
  }
  return { cor: saida, mudados };
}
