// Movimentos reutilizáveis da câmera (item 75).
// Extraídos de journey.ts: as contas e a ordem das operações são as mesmas.
// Posições, tempos e assuntos de cada filme ficam no roteiro, não aqui.
import * as THREE from 'three';
import { EX, EY, EZ } from '../world/baseGalactica';

export type Ease = (x: number) => number;
export type PosFn = (k: number, out: THREE.Vector3) => THREE.Vector3;

export const linear: Ease = (x) => x;
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
  return (k, out) => {
    const i = 1 - k;
    out.copy(a).multiplyScalar(i * i * i);
    out.addScaledVector(c1, 3 * i * i * k);
    out.addScaledVector(c2, 3 * i * k * k);
    out.addScaledVector(b, k * k * k);
    return out;
  };
}
/**
 * Órbita/espiral ao redor de um centro no referencial galáctico:
 * raio, ângulo e altura (ao longo do polo) interpolados em k.
 * U=EX, V=EY são o plano do disco; ang em radianos.
 */
export function orbit(
  center: THREE.Vector3,
  r0: number, r1: number,
  a0: number, a1: number,
  h0: number, h1: number
): PosFn {
  return (k, out) => {
    const r = THREE.MathUtils.lerp(r0, r1, k);
    const a = THREE.MathUtils.lerp(a0, a1, k);
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
/** mira que desliza entre dois pontos (para virar o olhar sem saltos) */
export const panLook = (a: THREE.Vector3, b: THREE.Vector3, ease: Ease = smooth): PosFn =>
  (k, out) => out.copy(a).lerp(b, ease(k));
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
