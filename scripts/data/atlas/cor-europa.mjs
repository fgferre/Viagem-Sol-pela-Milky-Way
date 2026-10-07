// ============================================================
// A COR DE EUROPA (item 230, etapa E1 do PLAN-EUROPA-JAPETO.md) — o mapa em
// cor a partir do cinza USGS Voyager–Galileo de 500 m. Não existe mapa
// global em cor com licença livre (06/10/2026): a LUMINÂNCIA é a medida,
// inteira; só a CROMA (a*, b*) é construída, pelas medidas da etapa E0 no
// PIA19048 (cor "realista", hemisfério anti-Júpiter) e no PIA00502 (cor
// natural, hemisfério traseiro). Puro e determinístico: a cadeia e a prévia
// chamam o mesmo `corDeEuropa`, e o sha256 do RGB é o portão.
//
// NESTA ORDEM:
//  0. A REDUÇÃO (`reduzPorMediaDeArea`): o mosaico de 19631 px vai à
//     largura da casa pela média de área SÓ do que tem dado (o 0 do vazio
//     fica fora da média), na convenção do próprio mosaico; a meia volta é
//     o giro de colunas da cadeia (`giroDeLongitudeGraus: 180`).
//  1. O VAZIO DO SUL (o mosaico não cobre o sul de −77..−84°): preenchido
//     POR COLUNA abaixo da última linha válida com a média da última faixa
//     de 1°, suavizada ao longo da longitude, indo à média do anel no polo
//     (sem cata-vento). INVENTADO, marcado em `preenchido`.
//  2. OS NÍVEIS: um ganho só, em luz linear, que leva a média global (por
//     área) à do mapa antigo do app (`Y_MEDIO_ALVO`, pinada) — a exposição
//     não muda e o contraste é o nativo do mosaico (offset 0).
//  3. A CROMA, receita (a) "mistura" (Clark 1998: manchas, lineae e margens
//     de banda são UM componente escuro avermelhado misturado à planície
//     clara): f = (Lp − L)/(Lp − Le) preso a [0, 1], pelo L* do cinza;
//     a*b* = planície(lon, lat) + f·(escuro − planície). A planície carrega
//     o avermelhamento do hemisfério traseiro (b* em cosseno do ângulo ao
//     ápice traseiro, 90°E — McEwen 1986, medido 12,6 no PIA19048 e 12,1 no
//     PIA00502) e o polo mais branco/azulado (PIA00502; legenda do PIA19048).
//     Receita (b) "hemisfério real + mistura": onde o PIA19048 vale e está
//     bem iluminado, soma-se a DIFERENÇA real − (a) em passa-baixa (a foto
//     tem registro de ~1,2 px), com peso que sobe de 0 a 1 numa faixa de
//     ~10° dentro da borda — sem degrau.
//  4. O TOM: T1 realista (as medidas), T2 natural-forte e T3 natural-suave
//     (as duas estimativas realista→natural do E0, uma similaridade no plano
//     a*b*). De volta a sRGB com o L* do cinza intacto; fora da gama, a
//     croma encolhe (a luminância não).
//
// A CONVENÇÃO DA CASA: equiretangular, linha 0 = +90°N, a coluna i em
// (180 + (i+½)·360/W) mod 360 °E (`longitudeDaColuna`). O cinza de
// `corDeEuropa` chega já nela (o mosaico tem 0°E na borda esquerda: meia
// volta depois de reduzir).
// ============================================================

import { createHash } from 'node:crypto';
import { desfocaComMascara, latitudeDaLinha, longitudeDaColuna } from './relevo-inventado.mjs';

/** Raio da esfera do mosaico USGS (m). */
export const RAIO_M = 1562090;

/**
 * AS MEDIDAS do E0 (`capturas/europa-japeto/e0/medidas.md`, números em
 * `.cache/europa/registro.json`), no espaço "realista" do PIA19048, com o RGB
 * levado ao brilho do cinza em 100 km. A planície e o escuro são as médias das
 * amostras bem iluminadas (cos e ≥ 0,5, luz ≥ 0,45) com cinza ≥ p90 (162) e
 * ≤ p5 (98). `bullseyeMedio` e `sin2Medio` são as médias de max(0, cos θ) e
 * sin²(lat) na amostra da planície: a cor medida vale ali, e o gradiente e o
 * polo partem dela.
 */
export const MEDIDAS = Object.freeze({
  planicie: Object.freeze([66.66, -1.69, -1.69]),
  escuro: Object.freeze([41.24, 13.14, 14.09]),
  /** b* por unidade de max(0, cos θ), θ = ângulo ao ápice traseiro. */
  gradienteB: 12.64,
  apiceTraseiroE: 90,
  /** b* por sin²(lat) — ver `POLO_B`. */
  poloB: -2.63,
  bullseyeMedio: 0.4646,
  sin2Medio: 0.1912,
});

/**
 * O POLO (b* por sin²lat, realista). O PIA00502 (natural) cai de b* 21,2 no
 * equador a 13,2 em 45–60° (média N/S), 7,9 a menos; levado ao realista pelo
 * ganho do T2 (÷ 1,277) são 6,2, dos quais o cosseno do ângulo ao ápice já dá
 * 12,64·0,92·(1 − cos 52,5°) = 4,5 (0,92 = cos(67° − 90°), o centro do
 * PIA00502). O resto, 1,7 em sin²(52,5°) = 0,63, é −2,63·sin²lat. Só b*: a
 * queda de a* do PIA00502 em 45–60° coincide com a franja do limbo dele.
 */
export const POLO_B = MEDIDAS.poloB;

/**
 * OS TONS: z' = ganho·e^(i·giro)·z + desloc no plano (a*, b*).
 * T2 = as âncoras do E0 (planície e escuro de cada foto, o gradiente
 * descontado); T3 = a sobreposição direta das duas fotos (121–139°E).
 * MEIO = a metade do caminho do T2, como a ferramenta do E0 o fez
 * (`aplica(lab, ½)` em europa/medidas.mjs: ganho^½, giro·½, desloc·½) — o
 * tom escolhido pelo dono em 07/10 na prancha do E0.
 */
export const TONS = Object.freeze({
  T1: Object.freeze({ nome: 'realista', ganho: 1, giroGraus: 0, desloc: Object.freeze([0, 0]) }),
  T2: Object.freeze({ nome: 'natural-forte', ganho: 1.277, giroGraus: -12.9, desloc: Object.freeze([0.03, 8.55]) }),
  T3: Object.freeze({ nome: 'natural-suave', ganho: 1.1, giroGraus: -8.6, desloc: Object.freeze([-0.73, 2.94]) }),
  meio: Object.freeze({ nome: 'meio-termo', ganho: Math.sqrt(1.277), giroGraus: -12.9 / 2, desloc: Object.freeze([0.03 / 2, 8.55 / 2]) }),
});

/**
 * A EXPOSIÇÃO: a média linear por área (peso cos lat, Y = 0,2126 R + 0,7152 G
 * + 0,0722 B) do `map.jpg` NASA 3D que o app mostrava até o item 230 (1440×720,
 * sha256 50d01ca5c01352d1c507bb17fefd1c46ba11260305656250062c6cdac89c8ebf),
 * medida pela prévia do E1. PINADA, e não medida na cadeia: a cadeia grava em
 * cima daquele arquivo, e o mapa aprovado tem de sair só do USGS e destes
 * números (a prova `capturas/europa-japeto/ferramentas/prova-cadeia-europa.mjs`
 * remede enquanto o arquivo antigo existir).
 */
export const Y_MEDIO_ALVO = 0.4445987364168945;

/** A costura da receita (b): passa-baixa da diferença e largura da faixa. */
export const COSTURA = Object.freeze({ sigmaDiferencaKm: 5, larguraGraus: 10 });

/** O preenchimento do sul: faixa lida, suavização em longitude. */
export const SUL = Object.freeze({ faixaGraus: 1, suavizaGraus: 4 });

// ------------------------------------------------------------
// COR: sRGB 8 bits ↔ Lab (D65)
// ------------------------------------------------------------

const linear = (c8) => {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
/** Luz linear de cada nível de 8 bits. */
export const LINEAR_DO_BYTE = Float64Array.from({ length: 256 }, (_, i) => linear(i));
const gama = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const XN = 0.95047;
const ZN = 1.08883;
const EPS = 216 / 24389;
const KAPPA = 24389 / 27;
/** L* de uma luminância linear Y em [0, 1]. */
export const lDeY = (y) => (y > EPS ? 116 * Math.cbrt(y) - 16 : KAPPA * y);
const fInv = (t) => (t * t * t > EPS ? t * t * t : (116 * t - 16) / KAPPA);
const fDir = (t) => (t > EPS ? Math.cbrt(t) : (KAPPA * t + 16) / 116);

/** sRGB 8 bits (pode ser fracionário) → [L, a, b]. */
export function labDoRgb(r, g, b) {
  const R = linear(r);
  const G = linear(g);
  const B = linear(b);
  const x = fDir((0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / XN);
  const y = fDir(0.2126729 * R + 0.7151522 * G + 0.072175 * B);
  const z = fDir((0.0193339 * R + 0.119192 * G + 0.9503041 * B) / ZN);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** Lab → RGB linear em `saida` (sem prender). */
function rgbLinearDoLab(L, a, b, saida) {
  const fy = (L + 16) / 116;
  const X = fInv(fy + a / 500) * XN;
  const Y = fInv(fy);
  const Z = fInv(fy - b / 200) * ZN;
  saida[0] = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
  saida[1] = -0.969266 * X + 1.8760108 * Y + 0.041556 * Z;
  saida[2] = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;
}
const naGama = (c) => c[0] >= 0 && c[0] <= 1 && c[1] >= 0 && c[1] <= 1 && c[2] >= 0 && c[2] <= 1;

/**
 * Lab → sRGB 8 bits em `rgb[3k..3k+2]`. Fora da gama a croma encolhe por
 * bissecção (12 passos) e o L* fica: devolve true se encolheu.
 */
function escreveRgb(L, a, b, rgb, k) {
  const c = escreveRgb.tmp;
  rgbLinearDoLab(L, a, b, c);
  let encolheu = false;
  if (!naGama(c)) {
    encolheu = true;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 12; i += 1) {
      const s = (lo + hi) / 2;
      rgbLinearDoLab(L, a * s, b * s, c);
      if (naGama(c)) lo = s;
      else hi = s;
    }
    rgbLinearDoLab(L, a * lo, b * lo, c);
  }
  for (let q = 0; q < 3; q += 1) rgb[3 * k + q] = Math.round(255 * gama(Math.min(1, Math.max(0, c[q]))));
  return encolheu;
}
escreveRgb.tmp = new Float64Array(3);

// ------------------------------------------------------------
// 0. A REDUÇÃO
// ------------------------------------------------------------

/**
 * O mosaico (1 canal, `larguraFonte`×`alturaFonte`, 0 = sem dado) reduzido a
 * `largura`×`largura/2` pela média de área: cada texel de saída é a média,
 * ponderada pela fração coberta de cada pixel de origem, SÓ dos pixels com
 * dado — o vazio não escurece a borda. Texel sem dado nenhum sai 0; com dado,
 * sai ≥ 1. Na convenção do mosaico (a borda esquerda dele fica na esquerda).
 * As colunas somam por prefixo fracionário: tudo cabe em float64 sem
 * arredondar, e por isso a meia volta depois da redução dá os mesmos bytes que
 * a redução já girada da etapa E0.
 */
export function reduzPorMediaDeArea(dados, larguraFonte, alturaFonte, largura) {
  const altura = largura / 2;
  if (dados.length !== larguraFonte * alturaFonte) {
    throw new Error(`reduzPorMediaDeArea: ${dados.length} bytes para ${larguraFonte}×${alturaFonte}.`);
  }
  const sx = larguraFonte / largura;
  const sy = alturaFonte / altura;
  const acS = new Float64Array(largura);
  const acC = new Float64Array(largura);
  const PS = new Float64Array(larguraFonte + 1);
  const PC = new Float64Array(larguraFonte + 1);
  const saida = new Uint8Array(largura * altura);
  // a soma do prefixo até a posição fracionária u, com volta
  const P = (pre, u) => {
    const voltas = Math.floor(u / larguraFonte);
    const r = u - voltas * larguraFonte;
    const i = Math.floor(r);
    const f = r - i;
    const v = i < larguraFonte ? pre[i + 1] - pre[i] : 0;
    return voltas * pre[larguraFonte] + pre[i] + f * v;
  };
  for (let y = 0; y < altura; y += 1) {
    acS.fill(0);
    acC.fill(0);
    const v0 = y * sy;
    const v1 = (y + 1) * sy;
    for (let j = Math.floor(v0); j < Math.min(alturaFonte, Math.ceil(v1)); j += 1) {
      const wj = Math.min(v1, j + 1) - Math.max(v0, j);
      if (wj <= 0) continue;
      const lin = j * larguraFonte;
      for (let i = 0; i < larguraFonte; i += 1) {
        const d = dados[lin + i];
        PS[i + 1] = PS[i] + d;
        PC[i + 1] = PC[i] + (d > 0 ? 1 : 0);
      }
      for (let x = 0; x < largura; x += 1) {
        const u0 = x * sx;
        const u1 = u0 + sx;
        acS[x] += wj * (P(PS, u1) - P(PS, u0));
        acC[x] += wj * (P(PC, u1) - P(PC, u0));
      }
    }
    for (let x = 0; x < largura; x += 1) {
      saida[y * largura + x] = acC[x] > 1e-6 ? Math.max(1, Math.min(255, Math.round(acS[x] / acC[x]))) : 0;
    }
  }
  return saida;
}

// ------------------------------------------------------------
// 1. O VAZIO DO SUL
// ------------------------------------------------------------

/** Gaussiana circular de desvio `sigma` (amostras) num anel de Float64. */
function gaussianaCircular(x, sigma) {
  const n = x.length;
  const r = Math.ceil(3 * sigma);
  const k = Array.from({ length: 2 * r + 1 }, (_, q) => Math.exp(-((q - r) ** 2) / (2 * sigma * sigma)));
  const soma = k.reduce((s, v) => s + v, 0);
  const o = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    let acc = 0;
    for (let q = -r; q <= r; q += 1) acc += k[q + r] * x[(((i + q) % n) + n) % n];
    o[i] = acc / soma;
  }
  return o;
}

/**
 * Preenche o cinza onde vale 0 (sem dado). Os buracos isolados acima da
 * borda viram a média dos vizinhos com dado; abaixo da última linha válida de
 * cada coluna, a média da última faixa de `faixaGraus` (só pixels com dado),
 * suavizada em longitude (σ `suavizaGraus`), indo à média do anel no polo por
 * s² (s = 0 na emenda, 1 no polo). Devolve o cinza novo (Uint8Array, ≥ 1),
 * a máscara `preenchido` (1 = inventado) e a última linha válida por coluna.
 */
export function preencheSul(cinza, largura, altura, { faixaGraus = SUL.faixaGraus, suavizaGraus = SUL.suavizaGraus } = {}) {
  const saida = Uint8Array.from(cinza);
  const preenchido = new Uint8Array(largura * altura);
  const ultima = new Int32Array(largura).fill(-1);
  for (let i = 0; i < largura; i += 1) {
    for (let j = altura - 1; j >= 0; j -= 1) {
      if (cinza[j * largura + i] > 0) {
        ultima[i] = j;
        break;
      }
    }
    if (ultima[i] < 0) throw new Error(`preencheSul: a coluna ${i} não tem dado nenhum.`);
  }
  // buracos acima da borda: média dos vizinhos com dado (janela crescente)
  for (let i = 0; i < largura; i += 1) {
    for (let j = 0; j < ultima[i]; j += 1) {
      if (cinza[j * largura + i] > 0) continue;
      for (let r = 1; r < 16; r += 1) {
        let s = 0;
        let n = 0;
        for (let dj = -r; dj <= r; dj += 1) {
          const jj = j + dj;
          if (jj < 0 || jj >= altura) continue;
          for (let di = -r; di <= r; di += 1) {
            const v = cinza[jj * largura + ((((i + di) % largura) + largura) % largura)];
            if (v > 0) {
              s += v;
              n += 1;
            }
          }
        }
        if (n) {
          saida[j * largura + i] = Math.max(1, Math.round(s / n));
          preenchido[j * largura + i] = 1;
          break;
        }
      }
    }
  }
  const nf = Math.max(1, Math.round((faixaGraus * altura) / 180));
  const media = new Float64Array(largura);
  for (let i = 0; i < largura; i += 1) {
    let s = 0;
    let n = 0;
    for (let j = Math.max(0, ultima[i] - nf + 1); j <= ultima[i]; j += 1) {
      const v = cinza[j * largura + i];
      if (v > 0) {
        s += v;
        n += 1;
      }
    }
    media[i] = s / n;
  }
  const suave = gaussianaCircular(media, (suavizaGraus * largura) / 360);
  const polo = suave.reduce((a, v) => a + v, 0) / largura;
  for (let i = 0; i < largura; i += 1) {
    const latEmenda = latitudeDaLinha(ultima[i], altura);
    for (let j = ultima[i] + 1; j < altura; j += 1) {
      const s = (latEmenda - latitudeDaLinha(j, altura)) / (latEmenda + Math.PI / 2);
      const v = suave[i] + (polo - suave[i]) * s * s;
      saida[j * largura + i] = Math.max(1, Math.min(255, Math.round(v)));
      preenchido[j * largura + i] = 1;
    }
  }
  return { cinza: saida, preenchido, ultima };
}

// ------------------------------------------------------------
// 2. OS NÍVEIS
// ------------------------------------------------------------

/**
 * O ganho em luz linear que leva a média por área (peso cos lat) de
 * min(1, ganho·Y(cinza)) a `yMedioAlvo`. Bissecção sobre o histograma.
 */
export function ganhoDosNiveis(cinza, largura, altura, yMedioAlvo) {
  const hist = new Float64Array(256);
  let area = 0;
  for (let j = 0; j < altura; j += 1) {
    const w = Math.cos(latitudeDaLinha(j, altura));
    area += w * largura;
    for (let i = 0; i < largura; i += 1) hist[cinza[j * largura + i]] += w;
  }
  const media = (g) => {
    let s = 0;
    for (let v = 0; v < 256; v += 1) s += hist[v] * Math.min(1, g * LINEAR_DO_BYTE[v]);
    return s / area;
  };
  let lo = 0;
  let hi = 20;
  if (media(hi) < yMedioAlvo) throw new Error('ganhoDosNiveis: alvo inalcançável.');
  for (let i = 0; i < 60; i += 1) {
    const m = (lo + hi) / 2;
    if (media(m) < yMedioAlvo) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

// ------------------------------------------------------------
// 3. A CROMA
// ------------------------------------------------------------

/** A fração do componente escuro pelo L* local, presa a [0, 1]. */
export function fracaoEscura(L, Lp = MEDIDAS.planicie[0], Le = MEDIDAS.escuro[0]) {
  return Math.min(1, Math.max(0, (Lp - L) / (Lp - Le)));
}

/** max(0, cos θ), θ = ângulo ao ápice traseiro (lat e lon em graus). */
export function bullseye(latGraus, lonE, apiceE = MEDIDAS.apiceTraseiroE) {
  const r = Math.PI / 180;
  return Math.max(0, Math.cos(latGraus * r) * Math.cos((lonE - apiceE) * r));
}

/** A croma da planície em (lat, lon): [a*, b*] (realista). */
export function cromaDaPlanicie(latGraus, lonE, m = MEDIDAS) {
  const s2 = Math.sin((latGraus * Math.PI) / 180) ** 2;
  return [
    m.planicie[1],
    m.planicie[2] + m.gradienteB * (bullseye(latGraus, lonE, m.apiceTraseiroE) - m.bullseyeMedio) + m.poloB * (s2 - m.sin2Medio),
  ];
}

/**
 * Receita (a): a*b* de cada pixel pela mistura, a partir do cinza (8 bits,
 * sRGB, já preenchido). Devolve { a, b, f } (Float32Array).
 */
export function cromaDaMistura(cinza, largura, altura, m = MEDIDAS) {
  const n = largura * altura;
  const a = new Float32Array(n);
  const b = new Float32Array(n);
  const f = new Float32Array(n);
  const fDoByte = Float64Array.from(LINEAR_DO_BYTE, (y) => fracaoEscura(lDeY(y), m.planicie[0], m.escuro[0]));
  const [, ae, be] = m.escuro;
  const lon = Float64Array.from({ length: largura }, (_, i) => longitudeDaColuna(i, largura));
  for (let j = 0; j < altura; j += 1) {
    const lat = (latitudeDaLinha(j, altura) * 180) / Math.PI;
    for (let i = 0; i < largura; i += 1) {
      const k = j * largura + i;
      const [ap, bp] = cromaDaPlanicie(lat, lon[i], m);
      const t = fDoByte[cinza[k]];
      a[k] = ap + t * (ae - ap);
      b[k] = bp + t * (be - bp);
      f[k] = t;
    }
  }
  return { a, b, f };
}

const suave = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/**
 * Receita (b): soma à croma (a) a diferença real − (a) em passa-baixa, com
 * peso que sobe de 0 na borda da região real a 1 a `larguraGraus` dentro.
 * `real` = { a, b, confianca } (confiança > 0 onde a foto vale e está bem
 * iluminada — o peso do passa-baixa, cos da emissão). Muda `a` e `b` no
 * lugar; devolve { peso, salto }: o degrau que um corte seco deixaria na
 * borda (|diferença| média e p95, em Δa*b*) e o maior passo entre vizinhos
 * que a costura acrescenta.
 */
export function costuraDoHemisferio(a, b, real, largura, altura, { sigmaDiferencaKm = COSTURA.sigmaDiferencaKm, larguraGraus = COSTURA.larguraGraus, raioM = RAIO_M } = {}) {
  const n = largura * altura;
  const dA = new Float32Array(n);
  const dB = new Float32Array(n);
  const regiao = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    if (!(real.confianca[k] > 0)) continue;
    dA[k] = real.a[k] - a[k];
    dB[k] = real.b[k] - b[k];
    regiao[k] = 1;
  }
  const lpA = desfocaComMascara(dA, real.confianca, largura, altura, raioM, sigmaDiferencaKm).valor;
  const lpB = desfocaComMascara(dB, real.confianca, largura, altura, raioM, sigmaDiferencaKm).valor;
  // a faixa: a região borrada vale ½ na borda e ~0,977 a 2σ dentro
  const sigmaKm = ((larguraGraus / 2) * Math.PI * raioM) / 180 / 1000;
  const borrada = desfocaComMascara(regiao, new Float32Array(n).fill(1), largura, altura, raioM, sigmaKm).valor;
  const peso = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    if (!regiao[k] || !Number.isFinite(lpA[k])) continue;
    peso[k] = suave((borrada[k] - 0.5) / 0.477);
    a[k] += peso[k] * lpA[k];
    b[k] += peso[k] * lpB[k];
  }
  // o salto: |diferença| na borda (vizinho fora da região) e o passo da costura
  const borda = [];
  let passoMax = 0;
  for (let j = 0; j < altura; j += 1) {
    for (let i = 0; i < largura; i += 1) {
      const k = j * largura + i;
      if (!regiao[k]) continue;
      const viz = [j * largura + ((i + 1) % largura), j * largura + ((i - 1 + largura) % largura)];
      if (j > 0) viz.push(k - largura);
      if (j < altura - 1) viz.push(k + largura);
      if (viz.some((q) => !regiao[q])) borda.push(Math.hypot(lpA[k], lpB[k]));
      for (const q of viz) {
        if (!regiao[q] || !Number.isFinite(lpA[q])) continue;
        // o que a RAMPA acrescenta entre vizinhos (a diferença fina não é costura)
        const dp = Math.abs(peso[k] - peso[q]);
        passoMax = Math.max(passoMax, dp * Math.hypot(lpA[k], lpB[k]));
      }
    }
  }
  borda.sort((x, y) => x - y);
  const salto = {
    corteSecoMedio: borda.length ? borda.reduce((s, v) => s + v, 0) / borda.length : 0,
    corteSecoP95: borda.length ? borda[Math.floor(0.95 * (borda.length - 1))] : 0,
    passoMaximoDaCostura: passoMax,
    pixelsDaBorda: borda.length,
  };
  return { peso, salto };
}

/** O tom no plano a*b*, no lugar. */
export function aplicaTom(a, b, tom) {
  const g = tom.giroGraus * (Math.PI / 180);
  const c = tom.ganho * Math.cos(g);
  const s = tom.ganho * Math.sin(g);
  for (let k = 0; k < a.length; k += 1) {
    const x = a[k];
    const y = b[k];
    a[k] = c * x - s * y + tom.desloc[0];
    b[k] = s * x + c * y + tom.desloc[1];
  }
}

// ------------------------------------------------------------
// O MAPA
// ------------------------------------------------------------

/**
 * O mapa de cor de Europa. `cinza`: Uint8Array largura×altura na convenção da
 * casa, 0 = sem dado. `receita`: 'a' | 'b' ('b' exige `real`). `tom`: chave de
 * TONS. `yMedioAlvo`: a média linear por área do mapa de hoje.
 * Devolve { rgb (Uint8Array RGB), preenchido, pesoReal, ganho, f, ... }.
 */
export function corDeEuropa({ cinza, largura, altura, receita = 'a', tom = 'T1', yMedioAlvo, real = null, medidas = MEDIDAS }) {
  if (!TONS[tom]) throw new Error(`corDeEuropa: tom desconhecido ${tom}`);
  if (receita === 'b' && !real) throw new Error('corDeEuropa: a receita (b) exige `real`.');
  const sul = preencheSul(cinza, largura, altura);
  const ganho = ganhoDosNiveis(sul.cinza, largura, altura, yMedioAlvo);
  const { a, b, f } = cromaDaMistura(sul.cinza, largura, altura, medidas);
  let pesoReal = null;
  let salto = null;
  if (receita === 'b') ({ peso: pesoReal, salto } = costuraDoHemisferio(a, b, real, largura, altura));
  aplicaTom(a, b, TONS[tom]);
  const LDoByte = Float64Array.from(LINEAR_DO_BYTE, (y) => lDeY(Math.min(1, ganho * y)));
  const n = largura * altura;
  const rgb = new Uint8Array(3 * n);
  let encolhidos = 0;
  let saturados = 0;
  for (let k = 0; k < n; k += 1) {
    const g = sul.cinza[k];
    if (ganho * LINEAR_DO_BYTE[g] >= 1) saturados += 1;
    if (escreveRgb(LDoByte[g], a[k], b[k], rgb, k)) encolhidos += 1;
  }
  return { rgb, preenchido: sul.preenchido, ultima: sul.ultima, pesoReal, salto, ganho, f, a, b, encolhidos, saturados };
}

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
