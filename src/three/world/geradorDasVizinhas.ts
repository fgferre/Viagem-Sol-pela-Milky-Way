// ============================================================
// AS GALÁXIAS VIZINHAS — o modelo e o sorteio (pilar 3 do NORTE, 12/11/2026).
//
// A Grande e a Pequena Nuvem de Magalhães, a ponte entre elas, Andrômeda
// (M31) e as duas elípticas dela (M32 e M110), cada uma no lugar MEDIDO
// do céu, à distância medida e com a inclinação medida, feitas das
// mesmas populações da Via Láctea (velhas, jovens e nós H II com a cor
// do corpo negro da casa, poeira por extinção). Nada de foto, sprite ou
// lâmina: só partículas sorteadas aqui, na hora, de números escritos
// neste arquivo — nenhum dado novo em public/data, nenhuma rede.
//
// CPU PURA, sem `window`: roda no trabalhador próprio
// (`vizinhasEmWorker.ts`) e nos testes; a geometria (centro e eixos de
// cada galáxia) também é lida por `lugaresDoCeu.ts` para o enquadramento.
//
// O QUE É MEDIDO E O QUE NÃO É (o selo das fichas repete isto):
// · medido — posição no céu (NED), distância, inclinação, ângulo de
//   posição, lado perto, tamanho de escala, luminosidade V e massa;
// · derivado — a luz de cada população (frações da literatura), o
//   número de estrelas (massa ÷ massa média), o tempo da luz;
// · artístico — o desenho exato do braço da GNM, os nós, a forma das
//   nuvens de poeira, a ponte de Magalhães.
// Fontes conferidas na rodada estão citadas como "(conferido)"; o resto
// é "de memória" da literatura citada.
// ============================================================
import * as THREE from 'three';
import { blackbodyLinear } from '../luzDaCasa';

/** o mesmo tom dos nós H II da Via Láctea (`POP_HII`, shaders/common.ts) —
 *  repetido aqui porque aquele módulo lê `window` e este roda sem ela */
const POP_HII: [number, number, number] = [1.664, 0.807, 0.957];
const POP_JOVEM = blackbodyLinear(15_000);
const POP_AZUL = blackbodyLinear(20_000);
const POP_VELHA = blackbodyLinear(4_800);
const POP_GIGANTE = blackbodyLinear(3_800);
const POP_BOJO = blackbodyLinear(4_300);
// as Nuvens são mais jovens que a Via Láctea: B−V integrado ≈ 0,5 (RC3, de
// memória) contra ~0,9 de M31 — a luz "velha" delas é de estrelas de idade
// intermediária, mais branca
const POP_NUVEM = blackbodyLinear(6_300);
const POP_NUVEM_BARRA = blackbodyLinear(5_600);

const GRAU = Math.PI / 180;

/** direção (RA, Dec) em graus → vetor unitário da cena (equatorial J2000) */
export function direcaoDoCeu(raGraus: number, decGraus: number): THREE.Vector3 {
  const a = raGraus * GRAU;
  const d = decGraus * GRAU;
  return new THREE.Vector3(Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d));
}

/** o norte e o leste do céu numa direção — a base em que se mede o PA */
function norteELeste(n: THREE.Vector3) {
  const leste = new THREE.Vector3(-n.y, n.x, 0).normalize();
  const norte = new THREE.Vector3().crossVectors(n, leste).normalize();
  return { norte, leste };
}

/** um ângulo de posição (do norte para o leste) → direção no céu */
function noCeu(n: THREE.Vector3, paGraus: number): THREE.Vector3 {
  const { norte, leste } = norteELeste(n);
  return norte.multiplyScalar(Math.cos(paGraus * GRAU)).addScaledVector(leste, Math.sin(paGraus * GRAU));
}

/**
 * A BASE DE UM DISCO inclinado: `eu` no eixo maior (a linha dos nodos),
 * `ev` no plano, apontando para o lado PERTO, `en` a normal. O lado
 * perto vem da literatura (velocidades ou poeira), e é ele que decide de
 * que lado o disco se ergue para nós.
 */
export interface BaseDoDisco {
  centro: THREE.Vector3;
  eu: THREE.Vector3;
  ev: THREE.Vector3;
  en: THREE.Vector3;
}

function baseDoDisco(
  centro: THREE.Vector3,
  inclinacaoGraus: number,
  paNodosGraus: number,
  paPertoGraus: number
): BaseDoDisco {
  const n = centro.clone().normalize();
  const eu = noCeu(n, paNodosGraus);
  const perto = noCeu(n, paPertoGraus);
  // ortogonaliza o lado perto contra a linha dos nodos (PA ± 90°)
  perto.addScaledVector(eu, -perto.dot(eu)).normalize();
  const i = inclinacaoGraus * GRAU;
  const ev = perto.multiplyScalar(Math.cos(i)).addScaledVector(n, -Math.sin(i)).normalize();
  const en = new THREE.Vector3().crossVectors(eu, ev).normalize();
  return { centro, eu, ev, en };
}

/** onde a visada do Sol para (RA, Dec) fura o plano do disco — o jeito de
 *  pôr no disco um detalhe que a literatura dá como posição no céu */
function noDisco(base: BaseDoDisco, ra: number, dec: number): THREE.Vector3 {
  const d = direcaoDoCeu(ra, dec);
  const t = base.centro.dot(base.en) / d.dot(base.en);
  return d.multiplyScalar(t);
}

const pc = (ra: number, dec: number, dPc: number) => direcaoDoCeu(ra, dec).multiplyScalar(dPc);

// ---- a geometria medida ---------------------------------------------

/** GNM: centro dinâmico, inclinação e linha dos nodos do ajuste das
 *  estrelas jovens de van der Marel & Kallivayalil 2014 (ApJ 781, 121,
 *  conferido: 80,05°, −69,30°; i = 26,2°; Θ = 154,5°); lado perto a NE
 *  (van der Marel & Cioni 2001, de memória); distância 49,59 kpc
 *  (Pietrzyński et al. 2019, Nature 567, 200) */
export const DISTANCIA_GNM_PC = 49_590;
export const GNM = baseDoDisco(pc(80.05, -69.3, DISTANCIA_GNM_PC), 26.2, 154.5, 154.5 - 90);

/** PNM: centro óptico (NED, 00h52m44,8s −72°49′43″), 62,44 kpc (Graczyk
 *  et al. 2020, ApJ 904, 13). Não tem disco que se preste a "inclinação":
 *  é alongada AO LONGO da visada, o nordeste mais perto (Scowcroft et al.
 *  2016; Jacyszyn-Dobrzeniecka et al. 2016, de memória) */
export const DISTANCIA_PNM_PC = 62_440;
export const CENTRO_PNM = pc(13.187, -72.829, DISTANCIA_PNM_PC);

/** M31: centro (NED, 00h42m44,3s +41°16′09″), 761 kpc (Li et al. 2021,
 *  ApJ 920, 84, conferido: μ = 24,407 ± 0,032), i = 77°, PA = 38°
 *  (Walterbos & Kennicutt 1987; de memória), lado perto a NO (as faixas
 *  de poeira do lado oeste, de memória) */
export const DISTANCIA_M31_PC = 761_000;
export const M31 = baseDoDisco(pc(10.6847, 41.269, DISTANCIA_M31_PC), 77, 38, 38 - 90);
/** M32 (NED, 00h42m41,8s +40°51′55″) à distância de M31; M110/NGC 205
 *  (NED, 00h40m22,1s +41°41′07″) a 824 kpc (McConnachie et al. 2005,
 *  de memória) */
export const CENTRO_M32 = pc(10.674, 40.865, DISTANCIA_M31_PC);
export const CENTRO_M110 = pc(10.092, 41.685, 824_000);

// ---- o sorteio ------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** uma galáxia pronta para a GPU: posições RELATIVAS ao centro (a
 *  translação mora na matriz do objeto, em float64 na CPU) */
export interface VizinhaSorteada {
  id: 'gnm' | 'pnm' | 'ponte' | 'm31' | 'm32' | 'm110';
  centro: [number, number, number];
  /** stride 8: x,y,z (pc, relativos ao centro), r,g,b, tamanho (pc; +1000 =
   *  FUNDO, a luz das estrelas velhas não resolvidas, desenhada com pegada
   *  mínima maior e a mesma luz — ver `VIZINHAS_VERT`), alfa */
  pontos: Float32Array;
  n: number;
  /** a poeira própria: τ⊥ no plano do disco (canal único, 0..255 →
   *  0..tauMax), `lado` texels, cobrindo ±`meia` pc em u e v; ausente =
   *  sem poeira desenhada */
  poeira?: {
    tau: Uint8Array;
    lado: number;
    meia: number;
    tauMax: number;
    sigmaPc: number;
    eu: [number, number, number];
    ev: [number, number, number];
    en: [number, number, number];
  };
  /** extinção da Via Láctea na frente dela, vista do Sol (A_V) */
  avPrimeiroPlano: number;
}

/** A LUZ: o fluxo das partículas (Σ alfa·tamanho²·Y, a mesma conta da lei de
 *  tela da Via Láctea) soma a luminosidade V medida, em L☉; a régua que a
 *  leva a brilho na tela é `LUZ_DA_VIA_LACTEA_POR_SOL` (`vizinhas.ts`). */
/** luminosidade V (L☉) de V_T, módulo de distância e A_V — DERIVADA */
const lumV = (vT: number, mu: number, av: number) => 10 ** (0.4 * (4.83 - (vT - mu - av)));
// V_T: GNM 0,9 e PNM 2,7 (de Vaucouleurs RC3), M31 3,44, M32 8,08, M110
// 8,07 (RC3, de memória); A_V do primeiro plano: Schlafly & Finkbeiner
// 2011 pelo NED (de memória): GNM 0,21, PNM 0,10, M31 0,17
const MU_GNM = 5 * Math.log10(DISTANCIA_GNM_PC) - 5;
const MU_PNM = 5 * Math.log10(DISTANCIA_PNM_PC) - 5;
const MU_M31 = 24.407;
export const L_V = {
  gnm: lumV(0.9, MU_GNM, 0.21),
  pnm: lumV(2.7, MU_PNM, 0.1),
  m31: lumV(3.44, MU_M31, 0.17),
  m32: lumV(8.08, MU_M31, 0.17),
  m110: lumV(8.07, 5 * Math.log10(824_000) - 5, 0.17),
};

class Saco {
  readonly p: Float32Array;
  n = 0;
  constructor(readonly max: number) {
    this.p = new Float32Array(max * 8);
  }
  put(v: THREE.Vector3, c: readonly number[], tam: number, peso: number) {
    if (this.n >= this.max) return;
    const o = this.n * 8;
    this.p[o] = v.x;
    this.p[o + 1] = v.y;
    this.p[o + 2] = v.z;
    this.p[o + 3] = c[0];
    this.p[o + 4] = c[1];
    this.p[o + 5] = c[2];
    this.p[o + 6] = tam;
    this.p[o + 7] = peso;
    this.n++;
  }
}

/** luz de um ponto na conta da lei de tela (o Y da cor vezes alfa·tam²) */
const lumDoPonto = (p: Float32Array, o: number) => {
  const tam = p[o + 6] % 1000;
  return (0.2126 * p[o + 3] + 0.7152 * p[o + 4] + 0.0722 * p[o + 5]) * p[o + 7] * tam * tam;
};
/** o tamanho de um ponto de FUNDO (a marca viaja no milhar) */
const FUNDO = 1000;

/**
 * Normaliza a luz por POPULAÇÃO: os pontos [ini, fim) passam a somar
 * `fracao` de `lTotal` — é assim que as frações da literatura (o bojo de
 * M31 com ~30 % da luz, o 30 Dourado com ~3 %) viram brilho.
 */
function normalizar(s: Saco, ini: number, fim: number, lAlvo: number) {
  let soma = 0;
  for (let i = ini; i < fim; i++) soma += lumDoPonto(s.p, i * 8);
  if (soma <= 0) return;
  const k = lAlvo / soma;
  for (let i = ini; i < fim; i++) s.p[i * 8 + 7] *= k;
}

/** embaralha (Fisher–Yates): o prefixo desenhado no celular é amostra de tudo */
function embaralhar(s: Saco, rnd: () => number) {
  for (let i = s.n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const oi = i * 8;
    const oj = j * 8;
    for (let k = 0; k < 8; k++) {
      const t = s.p[oi + k];
      s.p[oi + k] = s.p[oj + k];
      s.p[oj + k] = t;
    }
  }
}

function fechar(
  s: Saco,
  id: VizinhaSorteada['id'],
  centro: THREE.Vector3,
  rnd: () => number,
  avPrimeiroPlano: number,
  poeira?: VizinhaSorteada['poeira']
): VizinhaSorteada {
  embaralhar(s, rnd);
  return {
    id,
    centro: [centro.x, centro.y, centro.z],
    pontos: s.p.subarray(0, s.n * 8),
    n: s.n,
    avPrimeiroPlano,
    ...(poeira ? { poeira } : {}),
  };
}

/** normal (Box–Muller) */
function normal(rnd: () => number) {
  return Math.sqrt(-2 * Math.log(Math.max(rnd(), 1e-12))) * Math.cos(2 * Math.PI * rnd());
}

/** raio de um disco exponencial de escala h (a soma de duas exponenciais
 *  = gama(2), a distribuição exata de R num disco exponencial), sorteado de
 *  novo além de `teto` — grampear empilharia pontos num aro na borda */
const raioExponencial = (rnd: () => number, h: number, teto = Infinity) => {
  for (;;) {
    const r = -h * Math.log(Math.max(rnd() * rnd(), 1e-12));
    if (r <= teto) return r;
  }
};

/** altura sech² (z0): a inversa exata da CDF ½(1 + tanh(z/z0)) */
const alturaSech2 = (rnd: () => number, z0: number) => {
  const u = Math.min(Math.max(rnd(), 1e-9), 1 - 1e-9);
  return z0 * Math.atanh(2 * u - 1);
};

const _v = new THREE.Vector3();
/** ponto do disco em coordenadas (u, v, z) → relativo ao centro */
const doDisco = (b: BaseDoDisco, u: number, v: number, z: number) =>
  _v.copy(b.eu).multiplyScalar(u).addScaledVector(b.ev, v).addScaledVector(b.en, z);
/** (u, v) do disco de um ponto relativo ao centro */
const uvDe = (b: BaseDoDisco, p: THREE.Vector3) => [p.dot(b.eu), p.dot(b.ev)] as const;

/** uma curva de pontos no disco (u, v) percorrida por comprimento */
function sobreACurva(curva: readonly (readonly [number, number])[], t: number): [number, number, number, number] {
  const k = Math.min(Math.floor(t * (curva.length - 1)), curva.length - 2);
  const f = t * (curva.length - 1) - k;
  const [u0, v0] = curva[k];
  const [u1, v1] = curva[k + 1];
  const du = u1 - u0;
  const dv = v1 - v0;
  const l = Math.hypot(du, dv) || 1;
  return [u0 + du * f, v0 + dv * f, -dv / l, du / l];
}

/** mapa τ⊥ a partir de nuvens gaussianas sorteadas no plano (u, v) */
function mapaDePoeira(
  b: BaseDoDisco,
  lado: number,
  meia: number,
  nuvens: { u: number; v: number; s: number; tau: number }[],
  sigmaPc: number
): NonNullable<VizinhaSorteada['poeira']> {
  const campo = new Float32Array(lado * lado);
  const px = (2 * meia) / lado;
  for (const n of nuvens) {
    const r = Math.ceil((3 * n.s) / px);
    const ci = Math.floor((n.u / (2 * meia) + 0.5) * lado);
    const cj = Math.floor((n.v / (2 * meia) + 0.5) * lado);
    for (let j = Math.max(0, cj - r); j <= Math.min(lado - 1, cj + r); j++) {
      for (let i = Math.max(0, ci - r); i <= Math.min(lado - 1, ci + r); i++) {
        const du = ((i + 0.5) / lado - 0.5) * 2 * meia - n.u;
        const dv = ((j + 0.5) / lado - 0.5) * 2 * meia - n.v;
        campo[j * lado + i] += n.tau * Math.exp(-(du * du + dv * dv) / (2 * n.s * n.s));
      }
    }
  }
  let tauMax = 0;
  for (const x of campo) tauMax = Math.max(tauMax, x);
  const tau = new Uint8Array(lado * lado);
  for (let k = 0; k < campo.length; k++) tau[k] = Math.round((campo[k] / Math.max(tauMax, 1e-9)) * 255);
  return {
    tau,
    lado,
    meia,
    tauMax,
    sigmaPc,
    eu: [b.eu.x, b.eu.y, b.eu.z],
    ev: [b.ev.x, b.ev.y, b.ev.z],
    en: [b.en.x, b.en.y, b.en.z],
  };
}

// ---- A GRANDE NUVEM -------------------------------------------------

/**
 * GNM: disco exponencial de h = 1,5 kpc (van der Marel 2001: 1,4 kpc,
 * de memória) até ~8 kpc, espessura z0 0,4 kpc; a BARRA fora do centro
 * (o centro óptico do NED, 05h23m34,5s −69°45′22″, ~0,5 kpc do centro
 * dinâmico; ~3 kpc de comprido no ângulo de posição ~115°, de memória);
 * UM braço dominante saindo da ponta leste da barra, junto do 30
 * Dourado, subindo ao norte e virando a oeste (o "braço norte" dos mapas
 * do Gaia — o traçado exato é artístico); o 30 Dourado (NED, 05h38m42s
 * −69°06′03″), o complexo H II mais brilhante do Grupo Local, com ~3 %
 * da luz (artístico na fração).
 */
function gerarGnm(escala: number, rnd: () => number): VizinhaSorteada {
  const b = GNM;
  const N = Math.round(260_000 * escala);
  const s = new Saco(N);
  const L = L_V.gnm;
  // o braço e a barra são desenhados NO CÉU (é como a literatura os dá)
  // e levados ao disco pela visada
  const centroBarra = noDisco(b, 80.894, -69.756).sub(b.centro);
  const [ub, vb] = uvDe(b, centroBarra);
  const pontaBarra = noDisco(b, 80.894 + 1.5 * Math.sin(115 * GRAU) / Math.cos(69.756 * GRAU), -69.756 + 1.5 * Math.cos(115 * GRAU)).sub(b.centro);
  const [up, vp] = uvDe(b, pontaBarra);
  const eixoBarra = [up - ub, vp - vb];
  const meioComp = Math.hypot(eixoBarra[0], eixoBarra[1]);
  const ax = [eixoBarra[0] / meioComp, eixoBarra[1] / meioComp];
  const doro = noDisco(b, 84.677, -69.101).sub(b.centro);
  const [ud, vd] = uvDe(b, doro);
  // o braço norte, em graus do céu a partir do centro óptico (leste, norte)
  const bracoCeu: [number, number][] = [
    [2.4, 0.2], [2.9, 1.3], [2.6, 2.4], [1.6, 3.2], [0.2, 3.5], [-1.3, 3.2], [-2.1, 2.7],
  ];
  const braco = bracoCeu.map(([e, nn]) => {
    const p = noDisco(b, 80.894 + e / Math.cos(69.756 * GRAU), -69.756 + nn).sub(b.centro);
    return uvDe(b, p);
  });

  // 1 · disco velho (45 % da luz)
  let ini = s.n;
  const nDisco = Math.round(N * 0.46);
  for (let i = 0; i < nDisco; i++) {
    const r = raioExponencial(rnd, 1500, 9000);
    const a = rnd() * 2 * Math.PI;
    const gig = rnd() < 0.12;
    s.put(doDisco(b, r * Math.cos(a), r * Math.sin(a), alturaSech2(rnd, 400)), gig ? POP_GIGANTE : POP_NUVEM, FUNDO + 22, 1);
  }
  normalizar(s, ini, s.n, L * 0.45);
  // 2 · a barra (20 %): elipsoide 1:0,3:0,3 fora do centro
  ini = s.n;
  const nBarra = Math.round(N * 0.18);
  for (let i = 0; i < nBarra; i++) {
    const t = normal(rnd) * meioComp * 0.55;
    const w = normal(rnd) * meioComp * 0.2;
    const u = ub + ax[0] * t - ax[1] * w;
    const v = vb + ax[1] * t + ax[0] * w;
    s.put(doDisco(b, u, v, normal(rnd) * 350), rnd() < 0.15 ? POP_GIGANTE : POP_NUVEM_BARRA, FUNDO + 20, 1);
  }
  normalizar(s, ini, s.n, L * 0.2);
  // 3 · jovens (24 %): 70 % no braço, o resto em complexos espalhados
  ini = s.n;
  const nJovem = Math.round(N * 0.28);
  const complexos = Array.from({ length: 60 }, () => {
    const r = raioExponencial(rnd, 1700);
    const a = rnd() * 2 * Math.PI;
    return [r * Math.cos(a), r * Math.sin(a)];
  });
  for (let i = 0; i < nJovem; i++) {
    let u: number;
    let v: number;
    if (rnd() < 0.62) {
      const [cu, cv, nu, nv] = sobreACurva(braco, rnd());
      const w = normal(rnd) * 380;
      const ao = normal(rnd) * 120;
      u = cu + nu * w + ao * nv;
      v = cv + nv * w - ao * nu;
    } else {
      const [cu, cv] = complexos[Math.floor(rnd() * complexos.length)];
      u = cu + normal(rnd) * 260;
      v = cv + normal(rnd) * 260;
    }
    s.put(doDisco(b, u, v, normal(rnd) * 120), rnd() < 0.5 ? POP_AZUL : POP_JOVEM, 14, 0.5 + rnd());
  }
  normalizar(s, ini, s.n, L * 0.24);
  // 4 · nós H II (4 %) nos mesmos lugares das jovens
  ini = s.n;
  for (let i = 0; i < Math.round(N * 0.012); i++) {
    const [cu, cv, nu, nv] = sobreACurva(braco, rnd());
    const w = normal(rnd) * 350;
    s.put(doDisco(b, cu + nu * w, cv + nv * w, normal(rnd) * 80), POP_HII, 10, rnd() ** 3);
  }
  normalizar(s, ini, s.n, L * 0.04);
  // 5 · o 30 Dourado (3 %): o núcleo R136 azul e a nebulosa em volta
  ini = s.n;
  for (let i = 0; i < Math.round(N * 0.025); i++) {
    const r = Math.abs(normal(rnd)) * (rnd() < 0.3 ? 25 : 110);
    const a = rnd() * 2 * Math.PI;
    const c = Math.acos(2 * rnd() - 1);
    const p = new THREE.Vector3(r * Math.sin(c) * Math.cos(a), r * Math.sin(c) * Math.sin(a), r * Math.cos(c)).add(doro);
    s.put(p, rnd() < 0.55 ? POP_HII : POP_AZUL, 8, 1);
  }
  normalizar(s, ini, s.n, L * 0.03);
  // a poeira: pouca (metalicidade ~½ da solar), em nuvens nos braços e no
  // 30 Dourado — τ⊥ de pico ~0,4 (artístico na forma)
  const nuvens: { u: number; v: number; s: number; tau: number }[] = [];
  for (let i = 0; i < 260; i++) {
    const [cu, cv, nu, nv] = sobreACurva(braco, rnd());
    const w = normal(rnd) * 300 - 150;
    nuvens.push({ u: cu + nu * w, v: cv + nv * w, s: 60 + rnd() * 120, tau: 0.08 + rnd() * 0.15 });
  }
  for (let i = 0; i < 40; i++) {
    nuvens.push({ u: ud + normal(rnd) * 250, v: vd + normal(rnd) * 250, s: 50 + rnd() * 80, tau: 0.1 + rnd() * 0.15 });
  }
  return fechar(s, 'gnm', b.centro, rnd, 0.21, mapaDePoeira(b, 256, 7000, nuvens, 120));
}

// ---- A PEQUENA NUVEM E A PONTE --------------------------------------

/**
 * PNM: corpo de estrelas velhas e intermediárias num elipsoide esticado
 * ao longo da visada (σ ~2,5 kpc em profundidade contra ~1 × 0,6 kpc no
 * céu; o nordeste mais perto), a "barra" de jovens de NE a SO (PA ~45°),
 * a Asa a leste-sudeste, rumo à GNM (centro ~01h15m −73°20′), e o NGC
 * 346 (N66), a maior região H II dela (NED 00h59m05s −72°10′38″).
 * Formas: de memória; proporções: artísticas.
 */
function gerarPnm(escala: number, rnd: () => number): VizinhaSorteada {
  const c = CENTRO_PNM;
  const n = c.clone().normalize();
  const N = Math.round(110_000 * escala);
  const s = new Saco(N);
  const L = L_V.pnm;
  const ne = noCeu(n, 45);
  const se = noCeu(n, 135);
  // o eixo longo: a visada, inclinada 35° para o nordeste (NE mais perto)
  const longo = n.clone().negate().multiplyScalar(Math.cos(35 * GRAU)).addScaledVector(ne, Math.sin(35 * GRAU)).normalize();
  const largo = new THREE.Vector3().crossVectors(longo, se).normalize();
  const fino = new THREE.Vector3().crossVectors(longo, largo).normalize();
  const rel = (ra: number, dec: number, d: number) => pc(ra, dec, d).sub(c);
  let ini = s.n;
  for (let i = 0; i < Math.round(N * 0.6); i++) {
    const p = longo.clone().multiplyScalar(normal(rnd) * 2500)
      .addScaledVector(largo, normal(rnd) * 1000)
      .addScaledVector(fino, normal(rnd) * 650);
    s.put(p, rnd() < 0.12 ? POP_GIGANTE : POP_NUVEM, FUNDO + 24, 1);
  }
  normalizar(s, ini, s.n, L * 0.6);
  ini = s.n;
  const barraJovem = ne.clone();
  const asa = rel(18.75, -73.33, 58_000);
  const n66 = rel(14.77, -72.177, DISTANCIA_PNM_PC);
  for (let i = 0; i < Math.round(N * 0.3); i++) {
    let p: THREE.Vector3;
    const x = rnd();
    if (x < 0.65) {
      p = barraJovem.clone().multiplyScalar(normal(rnd) * 1000)
        .addScaledVector(se, normal(rnd) * 450)
        .addScaledVector(longo, normal(rnd) * 1500);
    } else if (x < 0.9) {
      p = asa.clone().add(new THREE.Vector3(normal(rnd) * 600, normal(rnd) * 600, normal(rnd) * 600));
    } else {
      p = n66.clone().add(new THREE.Vector3(normal(rnd) * 90, normal(rnd) * 90, normal(rnd) * 90));
    }
    s.put(p, rnd() < 0.5 ? POP_AZUL : POP_JOVEM, 14, 0.5 + rnd());
  }
  normalizar(s, ini, s.n, L * 0.33);
  ini = s.n;
  for (let i = 0; i < Math.round(N * 0.02); i++) {
    const p = rnd() < 0.4
      ? n66.clone().add(new THREE.Vector3(normal(rnd) * 60, normal(rnd) * 60, normal(rnd) * 60))
      : barraJovem.clone().multiplyScalar(normal(rnd) * 1000).addScaledVector(se, normal(rnd) * 400).addScaledVector(longo, normal(rnd) * 1500);
    s.put(p, POP_HII, 10, rnd() ** 3);
  }
  normalizar(s, ini, s.n, L * 0.07);
  return fechar(s, 'pnm', c, rnd, 0.1);
}

/**
 * A PONTE DE MAGALHÃES: gás e estrelas jovens esparsas da Asa da PNM à
 * borda sudoeste da GNM (~04h25m −72°30′, de memória), ~1 % da luz da
 * PNM. Traçado e luz artísticos; a existência é medida (H I e OB).
 */
function gerarPonte(escala: number, rnd: () => number): VizinhaSorteada {
  const a = pc(18.75, -73.33, 58_000);
  const b = pc(66, -72.5, 51_000);
  const c = a.clone().lerp(b, 0.5);
  const N = Math.round(6_000 * escala);
  const s = new Saco(N);
  const desvio = new THREE.Vector3().crossVectors(b.clone().sub(a), c).normalize();
  for (let i = 0; i < N; i++) {
    const t = rnd();
    const p = a.clone().lerp(b, t).sub(c)
      .addScaledVector(desvio, Math.sin(t * Math.PI) * 2500 + normal(rnd) * 700)
      .add(new THREE.Vector3(normal(rnd) * 500, normal(rnd) * 500, normal(rnd) * 500));
    s.put(p, rnd() < 0.15 ? POP_HII : POP_AZUL, 14, rnd() ** 2);
  }
  normalizar(s, 0, s.n, L_V.pnm * 0.01);
  return fechar(s, 'ponte', c, rnd, 0.15);
}

// ---- ANDRÔMEDA -------------------------------------------------------

/**
 * M31: bojo clássico de Sérsic n ≈ 2, R_e ≈ 1 kpc, ~30 % da luz V
 * (Courteau et al. 2011, de memória); disco exponencial de h = 5,3 kpc
 * (Courteau et al. 2011, de memória) até 25 kpc com z0 0,4 kpc; o ANEL
 * de formação de estrelas a ~10 kpc (Habing et al. 1984; Gordon et al.
 * 2006, de memória) e um anel externo fraco a ~15 kpc; poeira fina (σ
 * 150 pc) concentrada nos anéis e em braços que os ligam — a forma dos
 * braços e dos nós é artística.
 */
function gerarM31(escala: number, rnd: () => number): VizinhaSorteada {
  const b = M31;
  const N = Math.round(420_000 * escala);
  const s = new Saco(N);
  const L = L_V.m31;
  // dois braços frouxos (pitch ~ 7°) que viram o anel — artístico
  const espiral = (k: number, r: number) => k * Math.PI + Math.log(r / 4000) / Math.tan(7 * GRAU);
  // 1 · bojo (30 %): Sérsic n=2 pelo raio de meia luz; perfil sorteado por
  // r = R_e·(x/b)^n com x ~ gama(2n) (a CDF exata de Sérsic em 2D)
  let ini = s.n;
  const nBojo = Math.round(N * 0.25);
  for (let i = 0; i < nBojo; i++) {
    let r = Infinity;
    while (r > 8000) {
      let g = 0;
      for (let k = 0; k < 4; k++) g -= Math.log(Math.max(rnd(), 1e-12));
      r = 1000 * (g / 3.67) ** 2;
    }
    const a = rnd() * 2 * Math.PI;
    const c = Math.acos(2 * rnd() - 1);
    s.put(doDisco(b, r * Math.sin(c) * Math.cos(a), r * Math.sin(c) * Math.sin(a) * 0.9, r * Math.cos(c) * 0.75), POP_BOJO, FUNDO + 40, 1);
  }
  normalizar(s, ini, s.n, L * 0.3);
  // 2 · disco velho (54 %)
  ini = s.n;
  const nDisco = Math.round(N * 0.58);
  for (let i = 0; i < nDisco; i++) {
    const r = raioExponencial(rnd, 5300, 26_000);
    const a = rnd() * 2 * Math.PI;
    s.put(doDisco(b, r * Math.cos(a), r * Math.sin(a), alturaSech2(rnd, 400)), rnd() < 0.12 ? POP_GIGANTE : POP_VELHA, FUNDO + 70, 1);
  }
  normalizar(s, ini, s.n, L * 0.54);
  // 3 · jovens (12 %): o anel de 10 kpc, o de 15 kpc e os braços
  ini = s.n;
  const nJovem = Math.round(N * 0.14);
  const lugarJovem = (): [number, number] => {
    const x = rnd();
    if (x < 0.5) {
      const r = 10_000 + normal(rnd) * 900;
      const a = rnd() * 2 * Math.PI;
      return [r * Math.cos(a), r * Math.sin(a)];
    }
    if (x < 0.7) {
      const r = 15_000 + normal(rnd) * 1200;
      const a = rnd() * 2 * Math.PI;
      return [r * Math.cos(a), r * Math.sin(a)];
    }
    const r = 4000 + rnd() * 14_000;
    const a = espiral(rnd() < 0.5 ? 0 : 1, r) + normal(rnd) * 0.12;
    return [r * Math.cos(a), r * Math.sin(a)];
  };
  // aglomera em complexos: cada jovem sai de um de 900 centros
  const centros = Array.from({ length: 900 }, lugarJovem);
  for (let i = 0; i < nJovem; i++) {
    const [cu, cv] = rnd() < 0.7 ? centros[Math.floor(rnd() * centros.length)] : lugarJovem();
    s.put(doDisco(b, cu + normal(rnd) * 220, cv + normal(rnd) * 220, normal(rnd) * 150), rnd() < 0.5 ? POP_AZUL : POP_JOVEM, 40, 0.5 + rnd());
  }
  normalizar(s, ini, s.n, L * 0.12);
  // 4 · nós H II (4 %)
  ini = s.n;
  for (let i = 0; i < Math.round(N * 0.01); i++) {
    const [cu, cv] = centros[Math.floor(rnd() * centros.length)];
    s.put(doDisco(b, cu + normal(rnd) * 120, cv + normal(rnd) * 120, normal(rnd) * 60), POP_HII, 30, rnd() ** 3);
  }
  normalizar(s, ini, s.n, L * 0.04);
  // a poeira: anéis de 10 e 15 kpc e os braços, em nuvens (τ⊥ de pico ~1,5)
  const nuvens: { u: number; v: number; s: number; tau: number }[] = [];
  for (let i = 0; i < 2600; i++) {
    const x = rnd();
    let r: number;
    let a: number;
    if (x < 0.45) {
      r = 10_000 + normal(rnd) * 450;
      a = rnd() * 2 * Math.PI;
    } else if (x < 0.65) {
      r = 15_000 + normal(rnd) * 600;
      a = rnd() * 2 * Math.PI;
    } else if (x < 0.9) {
      r = 3000 + rnd() * 16_000;
      a = espiral(rnd() < 0.5 ? 0 : 1, r) - 0.15 + normal(rnd) * 0.08;
    } else {
      r = 4500 + normal(rnd) * 600;
      a = rnd() * 2 * Math.PI;
    }
    nuvens.push({ u: r * Math.cos(a), v: r * Math.sin(a), s: 90 + rnd() * 160, tau: 0.15 + rnd() * 0.35 });
  }
  return fechar(s, 'm31', b.centro, rnd, 0.17, mapaDePoeira(b, 512, 26_000, nuvens, 150));
}

/** uma elíptica de Sérsic n, R_e, achatamento q e PA no céu — M32 e M110 */
function gerarEliptica(
  id: 'm32' | 'm110',
  centro: THREE.Vector3,
  rePc: number,
  nSersic: number,
  q: number,
  paGraus: number,
  lV: number,
  nPontos: number,
  rnd: () => number
): VizinhaSorteada {
  const s = new Saco(nPontos);
  const n = centro.clone().normalize();
  const maior = noCeu(n, paGraus);
  const menor = new THREE.Vector3().crossVectors(n, maior).normalize();
  const bN = 2 * nSersic - 1 / 3;
  for (let i = 0; i < nPontos; i++) {
    let r = Infinity;
    while (r > rePc * 8) {
      let g = 0;
      for (let k = 0; k < 2 * nSersic; k++) g -= Math.log(Math.max(rnd(), 1e-12));
      r = rePc * (g / bN) ** nSersic;
    }
    const a = rnd() * 2 * Math.PI;
    const c = Math.acos(2 * rnd() - 1);
    const p = maior.clone().multiplyScalar(r * Math.sin(c) * Math.cos(a))
      .addScaledVector(menor, r * Math.sin(c) * Math.sin(a) * q)
      .addScaledVector(n, r * Math.cos(c) * q);
    s.put(p, POP_BOJO, FUNDO + (id === 'm32' ? 10 : 30), 1);
  }
  normalizar(s, 0, s.n, lV);
  return fechar(s, id, centro, rnd, 0.17);
}

/**
 * TODAS AS VIZINHAS, na ordem do desenho. `escala` é a fração das
 * partículas (1 no cinema); a luz não muda com ela.
 * M32: R_e ≈ 30″ ≈ 110 pc, quase redonda (q 0,85, PA 170°); M110:
 * R_e ≈ 2,5′ ≈ 600 pc, q 0,5, PA 170° (de memória).
 */
export function gerarVizinhas(escala = 1, semente = 20261112): VizinhaSorteada[] {
  const rnd = mulberry32(semente);
  return [
    gerarGnm(escala, rnd),
    gerarPnm(escala, rnd),
    gerarPonte(escala, rnd),
    gerarM31(escala, rnd),
    gerarEliptica('m32', CENTRO_M32, 110, 2, 0.85, 170, L_V.m32, Math.round(20_000 * escala), rnd),
    gerarEliptica('m110', CENTRO_M110, 600, 1.5, 0.5, 170, L_V.m110, Math.round(30_000 * escala), rnd),
  ];
}
