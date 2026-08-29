// Movimentos reutilizáveis da câmera (item 75).
// Curvas espaciais do Three.js; gestos e referencial próprios do filme.
// Posições, tempos e assuntos de cada filme ficam no roteiro, não aqui.
import * as THREE from 'three';
import { EX, EY, EZ } from '../world/baseGalactica';

export type Ease = (x: number) => number;
export type PosFn = (k: number, out: THREE.Vector3) => THREE.Vector3;
type UnidadeDoAngulo = 'radianos' | 'graus';

export const linear: Ease = (x) => x;
export const quadratic: Ease = (x) => Math.pow(x, 2);
export const smooth: Ease = (x) => x * x * x * (x * (x * 6 - 15) + 10); // smootherstep
export const easeOut: Ease = (x) => 1 - Math.pow(1 - x, 3);
/** parte devagar, cruza rápido, pousa devagar — o "gesto" padrão */
export const glide: Ease = (x) => THREE.MathUtils.smoothstep(x, 0, 1);
/** lançamento: quase parado, então a aceleração mais forte do filme */
export const launch: Ease = (x) => Math.pow(x, 2.6);
/** pouso longo: chega com energia e assenta como tripé travando */
export const settle: Ease = (x) => 1 - Math.pow(1 - x, 2.2);
/** pousa aos 88% e CONGELA — o ponto final do filme (revisão: o
 *  arremate não pode acabar em movimento) */
export const settleFreeze: Ease = (x) => settle(Math.min(x / 0.88, 1));

export const still = (p: THREE.Vector3): PosFn => (_k, out) => out.copy(p);
export const line = (a: THREE.Vector3, b: THREE.Vector3): PosFn => (k, out) =>
  out.copy(a).lerp(b, k);
export function bezier(
  a: THREE.Vector3, c1: THREE.Vector3, c2: THREE.Vector3, b: THREE.Vector3
): PosFn {
  const curva = new THREE.CubicBezierCurve3(a, c1, c2, b);
  return (k, out) => curva.getPoint(k, out);
}

/** Usa somente um intervalo de outra trajetória, sem criar outra curva. */
export function intervalo(pos: PosFn, de: number, ate: number): PosFn {
  return (k, out) => pos(de + (ate - de) * k, out);
}

/**
 * Passa pelos pontos sem quinas. O avanço usa distância percorrida;
 * acelerar e desacelerar continua sendo responsabilidade do ritmo.
 * Pontos validados e copiados pelo leitor. A escala local evita que os
 * limiares internos da Catmull-Rom confundam distâncias solares em pc
 * com pontos repetidos. A tabela de comprimentos nasce uma vez, aqui.
 */
export function trajeto(pontos: THREE.Vector3[]): PosFn {
  const origem = pontos[0];
  const fim = pontos[pontos.length - 1];
  const escala = pontos.reduce((maior, p) => Math.max(maior, p.distanceTo(origem)), 0);
  const curva = new THREE.CatmullRomCurve3(
    pontos.map((p) => p.clone().sub(origem).divideScalar(escala)), false, 'centripetal'
  );
  curva.getLengths();
  return (k, out) => {
    // Pontas exatas: o arco não deixa uma fresta ao ligar ao próximo plano.
    if (k === 0) return out.copy(origem);
    if (k === 1) return out.copy(fim);
    return curva.getPointAt(k, out).multiplyScalar(escala).add(origem);
  };
}
/**
 * Órbita/espiral ao redor de um centro no referencial galáctico:
 * raio, ângulo e altura (ao longo do polo) interpolados em k.
 * U=EX, V=EY são o plano do disco; ângulo em radianos por padrão.
 * Em graus, a interpolação acontece antes da conversão para radianos.
 */
export function orbit(
  center: THREE.Vector3,
  r0: number, r1: number,
  a0: number, a1: number,
  h0: number, h1: number,
  unidadeDoAngulo: UnidadeDoAngulo = 'radianos'
): PosFn {
  return (k, out) => {
    const r = THREE.MathUtils.lerp(r0, r1, k);
    const aCru = THREE.MathUtils.lerp(a0, a1, k);
    const a = unidadeDoAngulo === 'graus' ? THREE.MathUtils.degToRad(aCru) : aCru;
    const h = THREE.MathUtils.lerp(h0, h1, k);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    out.copy(center);
    out.addScaledVector(EX, ca * r);
    out.addScaledVector(EY, sa * r);
    out.addScaledVector(EZ, h);
    return out;
  };
}
/** Mesma razão de distância a cada passo; serve tanto para sair como para chegar. */
export function distanciaExponencial(de: number, para: number, k: number): number {
  return de * Math.pow(para / de, THREE.MathUtils.clamp(k, 0, 1));
}

/**
 * A órbita desenha a direção; a distância ao centro tem seu próprio avanço.
 * Use ritmo linear no plano para atravessar décadas de escala uniformemente
 * no relógio. A volta pode suavizar separadamente, assim como a lente.
 */
export function helice(
  centro: THREE.Vector3,
  r0: number, r1: number,
  a0: number, a1: number,
  h0: number, h1: number,
  d0: number, d1: number,
  ritmoDaDirecao: Ease = glide,
  unidadeDoAngulo: UnidadeDoAngulo = 'radianos'
): PosFn {
  const direcao = orbit(new THREE.Vector3(), r0, r1, a0, a1, h0, h1, unidadeDoAngulo);
  return (k, out) => {
    direcao(ritmoDaDirecao(k), out);
    return out.multiplyScalar(distanciaExponencial(d0, d1, k) / out.length()).add(centro);
  };
}

/**
 * Chega a um centro atravessando décadas de distância por razão constante,
 * enquanto a direção entre as duas pontas desliza por um ritmo próprio.
 */
export function aproximacaoExponencial(
  centro: THREE.Vector3,
  de: THREE.Vector3,
  para: THREE.Vector3,
  ritmoDaDirecao: Ease = glide
): PosFn {
  const d0 = de.distanceTo(centro);
  const d1 = para.distanceTo(centro);
  const u0 = de.clone().sub(centro).normalize();
  const u1 = para.clone().sub(centro).normalize();
  const u = new THREE.Vector3();
  return (k, out) => {
    u.copy(u0).lerp(u1, ritmoDaDirecao(k)).normalize();
    return out.copy(centro).addScaledVector(u, distanciaExponencial(d0, d1, k));
  };
}

/** erf de Abramowitz–Stegun 7.1.26, suficiente para deformar um relógio. */
function erfAprox(x: number): number {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const p = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * p - 1.453152027) * p) + 1.421413741) * p
    - 0.284496736) * p + 0.254829592) * p * Math.exp(-a * a);
  return s * y;
}

/** Anda mais devagar perto de um joelho, mas nunca para nele. */
function alongarJoelho(
  k: number,
  joelho: number,
  sigma: number,
  intensidade: number
): number {
  const s2 = sigma * Math.SQRT2;
  const integral = (u: number) =>
    u - intensidade * sigma * Math.sqrt(2 * Math.PI) * 0.5 *
      erfAprox((u - joelho) / s2);
  return (integral(k) - integral(0)) / (integral(1) - integral(0));
}

interface FormaDoRaspao {
  centro: THREE.Vector3;
  de: THREE.Vector3;
  direcaoNoJoelho: THREE.Vector3;
  para: THREE.Vector3;
  distanciaMinima: number;
  joelho: number;
  sigma: number;
  alongamento: number;
  chao: number;
  expoenteDeEntrada: number;
  expoenteDeSaida: number;
}

/**
 * Fly-by com vale logarítmico de distância. O relógio alonga o instante
 * de maior proximidade e o piso linear impede a câmera de parar ali.
 */
export function raspao(forma: FormaDoRaspao): PosFn {
  const {
    centro, de, direcaoNoJoelho, para, distanciaMinima, joelho, sigma,
    alongamento, chao, expoenteDeEntrada, expoenteDeSaida,
  } = forma;
  const uEntrada = de.clone().sub(centro).normalize();
  const uMinimo = direcaoNoJoelho.clone();
  const uSaida = para.clone().sub(centro).normalize();
  const dEntrada = de.distanceTo(centro);
  const dSaida = para.distanceTo(centro);
  const u = new THREE.Vector3();
  return (k, out) => {
    const k2 = alongarJoelho(k, joelho, sigma, alongamento);
    const antes = k2 <= joelho;
    const t = antes ? k2 / joelho : (k2 - joelho) / (1 - joelho);
    const f = antes
      ? chao * t + (1 - chao) * (1 - Math.pow(1 - t, expoenteDeEntrada))
      : chao * t + (1 - chao) * Math.pow(t, expoenteDeSaida);
    const d = antes
      ? dEntrada * Math.pow(distanciaMinima / dEntrada, f)
      : distanciaMinima * Math.pow(dSaida / distanciaMinima, f);
    u.copy(antes ? uEntrada : uMinimo)
      .lerp(antes ? uMinimo : uSaida, f)
      .normalize();
    return out.copy(centro).addScaledVector(u, d);
  };
}

/** Arco entre dois versores em torno de um centro e de um único eixo. */
export function arcoAxial(
  centro: THREE.Vector3,
  direcaoDe: THREE.Vector3,
  direcaoPara: THREE.Vector3,
  raioDe: number,
  raioPara: number
): PosFn {
  const eixo = new THREE.Vector3().crossVectors(direcaoDe, direcaoPara).normalize();
  const angulo = direcaoDe.angleTo(direcaoPara);
  return (k, out) => out
    .copy(direcaoDe)
    .applyAxisAngle(eixo, angulo * k)
    .multiplyScalar(THREE.MathUtils.lerp(raioDe, raioPara, k))
    .add(centro);
}

/** Vários gestos dentro do mesmo plano, cada um em sua fração do relógio. */
export function sequencia(
  trechos: readonly { ate: number; pos: PosFn }[]
): PosFn {
  return (k, out) => {
    let inicio = 0;
    for (const trecho of trechos) {
      if (k <= trecho.ate) {
        return trecho.pos((k - inicio) / (trecho.ate - inicio), out);
      }
      inicio = trecho.ate;
    }
    const ultimo = trechos[trechos.length - 1];
    return ultimo.pos(1, out);
  };
}
/** mira que desliza entre dois pontos (para virar o olhar sem saltos) */
export const panLook = (a: THREE.Vector3, b: THREE.Vector3, ease: Ease = smooth): PosFn =>
  (k, out) => out.copy(a).lerp(b, ease(k));

/**
 * No joelho de um fly-by, cede o olhar do alvo principal ao assunto e
 * devolve. A posição vem do próprio plano, portanto mira e câmera não
 * mantêm duas cópias da trajetória.
 */
export function lookRaspao(
  posDoPlano: PosFn,
  principal: THREE.Vector3,
  assunto: THREE.Vector3,
  ate: number,
  joelho: number,
  sigma: number,
  alongamento: number,
  pesoMaximo: number,
  alcance: number
): PosFn {
  const pos = new THREE.Vector3();
  const dirPrincipal = new THREE.Vector3();
  const dirAssunto = new THREE.Vector3();
  return (k, out) => {
    if (k >= ate) return out.copy(principal);
    const kr = alongarJoelho(k / ate, joelho, sigma, alongamento);
    const w = kr <= joelho
      ? pesoMaximo * 0.5 * (1 - Math.cos((Math.PI * kr) / joelho))
      : pesoMaximo * 0.5 * (1 + Math.cos(
        (Math.PI * (kr - joelho)) / (1 - joelho)
      ));
    if (w < 1e-6) return out.copy(principal);
    posDoPlano(k, pos);
    dirPrincipal.copy(principal).sub(pos).normalize();
    dirAssunto.copy(assunto).sub(pos).normalize();
    dirPrincipal.lerp(dirAssunto, w).normalize();
    return out.copy(pos).addScaledVector(dirPrincipal, alcance);
  };
}
/**
 * O GESTO-PADRÃO DA FRENTE (lei de 19/08): vira CEDO do ponto `a` para o
 * assunto `b` (até a fração `fim` do plano) e SEGURA nele — o giro é
 * atividade, a espera de olhar parado no ponto errado não é.
 */
export const panThenHold = (a: THREE.Vector3, b: THREE.Vector3, fim: number): PosFn =>
  (k, out) => out.copy(a).lerp(b, smooth(Math.min(k / fim, 1)));
/** slerp de versores — o lerp de PONTOS perto da câmera gira 445 °/s
 *  (Sirius) e 650 °/s (fuga). A direção não atravessa a origem. */
const _eixoSlerp = new THREE.Vector3();
function slerpVersor(
  a: THREE.Vector3, b: THREE.Vector3, t: number, out: THREE.Vector3
): THREE.Vector3 {
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1);
  if (dot > 0.9995) return out.copy(a).lerp(b, t).normalize();
  if (dot < -0.9995) {
    _eixoSlerp.set(Math.abs(a.x) < 0.9 ? 1 : 0, Math.abs(a.x) < 0.9 ? 0 : 1, 0);
    _eixoSlerp.cross(a).normalize();
    return out.copy(a).applyAxisAngle(_eixoSlerp, Math.PI * t);
  }
  const omega = Math.acos(dot);
  const so = Math.sin(omega);
  return out
    .copy(a)
    .multiplyScalar(Math.sin((1 - t) * omega) / so)
    .addScaledVector(b, Math.sin(t * omega) / so);
}
/**
 * O olhar de um EVENTO de passagem: vira cedo (`k1`) do assunto `a` para
 * o `assunto` (DIREÇÃO a partir da câmera, não ponto em mundo), vive o
 * assunto crescendo, e em `k2` entrega o rumo seguinte.
 */
export function lookEvento(
  posDe: PosFn,
  a: THREE.Vector3,
  assunto: THREE.Vector3,
  rumo: THREE.Vector3,
  k1: number,
  k2: number
): PosFn {
  const p = new THREE.Vector3();
  const dirA = new THREE.Vector3();
  const dirB = new THREE.Vector3();
  const dir = new THREE.Vector3();
  return (k, out) => {
    posDe(k, p);
    let de: THREE.Vector3;
    let para: THREE.Vector3;
    let t: number;
    if (k <= k1) {
      de = a;
      para = assunto;
      t = glide(k / k1);
    } else if (k <= k2) {
      de = assunto;
      para = assunto;
      t = 1;
    } else {
      de = assunto;
      para = rumo;
      t = glide((k - k2) / (1 - k2));
    }
    dirA.copy(de).sub(p);
    const la = dirA.length();
    if (la > 1e-20) dirA.multiplyScalar(1 / la);
    dirB.copy(para).sub(p);
    const lb = dirB.length();
    if (lb > 1e-20) dirB.multiplyScalar(1 / lb);
    slerpVersor(dirA, dirB, t, dir);
    return out.copy(p).addScaledVector(dir, 1);
  };
}
/** vira cedo de `de` para `para` (direção) e segura — o panThenHold de
 *  PONTOS chicoteia quando o alvo passa perto da câmera (Rigel, 47°). */
export function lookPan(
  posDe: PosFn, de: THREE.Vector3, para: THREE.Vector3, fim: number
): PosFn {
  return lookEvento(posDe, de, para, para, fim, 1);
}
