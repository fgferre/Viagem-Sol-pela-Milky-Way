// ============================================================
// Rótulos das estrelas nomeadas — projeção 3D → Canvas 2D do HUD.
// ============================================================
import * as THREE from 'three';
import type { NamedStar } from '../config';

export interface StarLabel {
  name: string;
  spect: string;
  distPc: number;
  x: number; // 0..1
  y: number; // 0..1
  opacity: number;
  key: string;
}

const _v = new THREE.Vector3();

export function projectLabels(
  camera: THREE.PerspectiveCamera,
  named: NamedStar[],
  maxLabels = 7
): StarLabel[] {
  const camPos = camera.position;
  const out: StarLabel[] = [];

  // longe de casa (>2 kpc) só resta um rótulo possível: o Sol
  const dHome = camPos.length();
  if (dHome > 2000) {
    _v.set(0, 0, 0).project(camera);
    if (_v.z < 1 && _v.z > -1) {
      const x = (_v.x + 1) / 2;
      const y = (1 - _v.y) / 2;
      if (x > 0.04 && x < 0.96 && y > 0.08 && y < 0.9) {
        out.push({
          name: 'SOL',
          spect: 'G2V',
          distPc: dHome,
          x,
          y,
          opacity: THREE.MathUtils.smoothstep(dHome, 2000, 3800) * 0.95,
          key: 'sol-home',
        });
      }
    }
    return out;
  }

  for (const s of named) {
    _v.set(s.x, s.y, s.z);
    const dist = _v.distanceTo(camPos);
    if (dist < 0.35 || dist > 320) continue;

    _v.project(camera);
    if (_v.z > 1 || _v.z < -1) continue; // atrás da câmera
    const x = (_v.x + 1) / 2;
    const y = (1 - _v.y) / 2;
    if (x < 0.04 || x > 0.96 || y < 0.08 || y > 0.9) continue;

    // opacidade: perto demais ou longe demais → esmaece
    const oNear = THREE.MathUtils.smoothstep(dist, 0.4, 2.2);
    const oFar = 1 - THREE.MathUtils.smoothstep(dist, 140, 320);
    out.push({
      name: s.n,
      spect: s.s,
      distPc: dist,
      x,
      y,
      opacity: Math.min(oNear, oFar) * 0.92,
      key: s.n,
    });
  }

  out.sort((a, b) => a.distPc - b.distPc);
  return out.slice(0, maxLabels);
}
