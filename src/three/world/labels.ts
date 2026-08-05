// ============================================================
// Rótulos das estrelas nomeadas — projeção 3D → Canvas 2D do HUD.
// No voo livre eles também são os ALVOS do clicar-para-visitar.
// ============================================================
import * as THREE from 'three';
import type { NamedStar } from '../config';
import { GAL } from './galaxy';

export interface StarLabel {
  name: string;
  spect: string;
  distPc: number;
  x: number; // 0..1
  y: number; // 0..1
  opacity: number;
  key: string;
  /** 0 = nome próprio, 1 = designação de Bayer. Só ordena a disputa
   *  pelas vagas; o Sol e Sgr A✱ entram como 0. */
  tier?: number;
}

const _v = new THREE.Vector3();

/** limite do olho nu — as 90 nomeadas do catálogo antigo iam só até 2,56,
 *  então este corte não tira nenhuma etiqueta que já existia */
const NAKED_EYE_MAG = 6.5;

function projectPoint(
  camera: THREE.PerspectiveCamera,
  p: THREE.Vector3 | { x: number; y: number; z: number }
): { x: number; y: number } | null {
  _v.set(p.x, p.y, p.z).project(camera);
  if (_v.z > 1 || _v.z < -1) return null; // atrás da câmera
  const x = (_v.x + 1) / 2;
  const y = (1 - _v.y) / 2;
  if (x < 0.04 || x > 0.96 || y < 0.08 || y > 0.9) return null;
  return { x, y };
}

export function projectLabels(
  camera: THREE.PerspectiveCamera,
  named: NamedStar[],
  maxLabels = 7,
  prevKeys?: Set<string>
): StarLabel[] {
  const camPos = camera.position;
  const out: StarLabel[] = [];
  const dHome = camPos.length();
  const dGC = camPos.distanceTo(GAL.GC_POS);

  // o coração da galáxia tem nome quando estamos perto dele. O teto
  // caiu de 2,6 kpc para 1,2 (revisão: na fuga do centro a etiqueta
  // ficava flutuando sobre névoa, apontando um objeto já invisível).
  if (dGC > 6 && dGC < 1200) {
    const p = projectPoint(camera, GAL.GC_POS);
    if (p) {
      out.push({
        name: 'Sagittarius A✱',
        spect: 'SMBH',
        distPc: dGC,
        x: p.x,
        y: p.y,
        opacity:
          (1 - THREE.MathUtils.smoothstep(dGC, 800, 1200)) *
          THREE.MathUtils.smoothstep(dGC, 6, 16) *
          0.95,
        key: 'sgr-a',
      });
    }
  }

  // longe de casa (>2 kpc) só resta um rótulo estelar possível: o Sol
  if (dHome > 2000) {
    const p = projectPoint(camera, { x: 0, y: 0, z: 0 });
    if (p) {
      out.push({
        name: 'SOL',
        spect: 'G2V',
        distPc: dHome,
        x: p.x,
        y: p.y,
        opacity: THREE.MathUtils.smoothstep(dHome, 2000, 3800) * 0.95,
        key: 'sol-home',
      });
    }
    return out;
  }

  for (const s of named) {
    _v.set(s.x, s.y, s.z);
    const dist = _v.distanceTo(camPos);
    if (dist < 0.35 || dist > 320) continue;
    // Rótulo é para o que se VÊ. O catálogo grande trouxe 575 nomes
    // próprios da IAU, e entre eles anãs vermelhas vizinhas: Ross 614
    // (m 11) ganhava a vaga de Betelgeuse por estar mais perto, e o filme
    // apontava um nome onde não há estrela visível. A magnitude é
    // recalculada da CÂMERA — quem se aproxima acende, como no shader.
    if (s.m + 5 * Math.log10(dist / Math.max(s.d, 1e-6)) > NAKED_EYE_MAG) continue;

    const p = projectPoint(camera, s);
    if (!p) continue;

    // opacidade: perto demais ou longe demais → esmaece
    const oNear = THREE.MathUtils.smoothstep(dist, 0.4, 2.2);
    const oFar = 1 - THREE.MathUtils.smoothstep(dist, 140, 320);
    out.push({
      name: s.n,
      spect: s.s,
      distPc: dist,
      x: p.x,
      y: p.y,
      opacity: Math.min(oNear, oFar) * 0.92,
      key: s.n,
      tier: s.t ?? 0,
    });
  }

  // o Sol tem nome em QUALQUER recuo (revisão: ele virava um pontinho
  // anônimo já no Ato I, e o fio "nossa estrela vira um ponto" se perdia)
  if (dHome > 0.12) {
    const p = projectPoint(camera, { x: 0, y: 0, z: 0 });
    if (p) {
      out.push({
        name: 'SOL',
        spect: 'G2V',
        distPc: dHome,
        x: p.x,
        y: p.y,
        opacity: THREE.MathUtils.smoothstep(dHome, 0.12, 0.5) * 0.92,
        key: 'sol-home',
      });
    }
  }

  // Nome próprio antes de Bayer: a disputa é por PROXIMIDADE, e com o
  // catálogo grande (1,7 k nomeadas contra as 90 curadas de antes) uma
  // "κ Dra" a 30 pc expulsaria Deneb da tela. Dentro do mesmo tier vale
  // a distância, com histerese — quem já estava na tela ganha bônus,
  // senão a seleção "pisca" quando estrelas disputam as últimas vagas.
  const rank = (l: StarLabel) =>
    l.distPc * (prevKeys?.has(l.key) ? 0.8 : 1);
  out.sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0) || rank(a) - rank(b));
  return out.slice(0, maxLabels);
}

/**
 * Etiqueta FORÇADA do assunto do shot: projeta sem os fades de
 * distância — o alvo do beat nunca fica anônimo (regra editorial da
 * revisão: "o assunto sempre tem nome; o fundo fica mudo").
 */
export function projectForced(
  camera: THREE.PerspectiveCamera,
  name: string,
  spect: string,
  pos: { x: number; y: number; z: number },
  key: string
): StarLabel | null {
  const p = projectPoint(camera, pos);
  if (!p) return null;
  const dist = _v.set(pos.x, pos.y, pos.z).distanceTo(camera.position);
  return { name, spect, distPc: dist, x: p.x, y: p.y, opacity: 0.95, key };
}
