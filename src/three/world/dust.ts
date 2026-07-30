// ============================================================
// Poeira próxima da câmera — paralaxe que vende o volume do gás.
// ============================================================
import * as THREE from 'three';
import { WORLD } from '../config';
import { DUST_VERT, DUST_FRAG } from '../shaders/dustShaders';

const BOX = 7; // pc — aresta da caixa que envolve a câmera

export class Dust {
  readonly points: THREE.Points;
  private material: THREE.ShaderMaterial;

  constructor(count = WORLD.dustCount) {
    // RNG determinístico — mesma poeira em toda visita/captura
    let state = 0x44555354;
    const random = () => {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pos = new Float32Array(count * 3);
    const rand = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (random() - 0.5) * BOX;
      pos[i * 3 + 1] = (random() - 0.5) * BOX;
      pos[i * 3 + 2] = (random() - 0.5) * BOX;
      rand[i] = random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10000);

    this.material = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      uniforms: {
        uCamPos: { value: new THREE.Vector3() },
        uTime: { value: 0 },
        uScreenH: { value: 1080 },
        uBox: { value: BOX },
        uFade: { value: 1 },
        uCavityPos: { value: new THREE.Vector3() },
        uCavityGate: { value: 0 },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
  }

  update(camPos: THREE.Vector3, screenH: number, time: number) {
    const u = this.material.uniforms;
    (u.uCamPos.value as THREE.Vector3).copy(camPos);
    u.uScreenH.value = screenH;
    u.uTime.value = time;
  }

  setFade(f: number) {
    this.material.uniforms.uFade.value = f;
    this.points.visible = f > 0.001;
  }

  /** mesma cavidade do raymarch — o brilho segue o gás carvado */
  setCavity(pos: THREE.Vector3, gate: number) {
    (this.material.uniforms.uCavityPos.value as THREE.Vector3).copy(pos);
    this.material.uniforms.uCavityGate.value = gate;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
