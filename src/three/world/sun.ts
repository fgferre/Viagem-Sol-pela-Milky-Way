// ============================================================
// O Sol — fotosfera viva + coroa em três camadas aditivas.
// ============================================================
import * as THREE from 'three';
import { WORLD } from '../config';
import { SUN_VERT, SUN_FRAG, CORONA_VERT, CORONA_FRAG } from '../shaders/sunShaders';

export class Sun {
  readonly group = new THREE.Group();
  private surfaceMat: THREE.ShaderMaterial;
  private coronaMats: THREE.ShaderMaterial[] = [];

  constructor() {
    const r = WORLD.sunRadius;

    this.surfaceMat = new THREE.ShaderMaterial({
      vertexShader: SUN_VERT,
      fragmentShader: SUN_FRAG,
      uniforms: { uTime: { value: 0 } },
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(r, 96, 64), this.surfaceMat);
    sphere.renderOrder = 1;
    this.group.add(sphere);

    // coroa: camadas crescentes, cada uma com semente própria
    const layers: Array<[number, number, number]> = [
      [r * 2.3, 0.3, 3.1],
      [r * 4.0, 0.11, 17.7],
      [r * 6.8, 0.035, 29.3],
    ];
    for (const [size, intensity, seed] of layers) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: CORONA_VERT,
        fragmentShader: CORONA_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: size },
          uIntensity: { value: intensity },
          uSeed: { value: seed },
          uCamDist: { value: 1 },
        },
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      });
      this.coronaMats.push(mat);
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      quad.frustumCulled = false;
      quad.renderOrder = 3;
      this.group.add(quad);
    }
  }

  update(time: number, camPos?: THREE.Vector3) {
    this.surfaceMat.uniforms.uTime.value = time;
    const d = camPos ? camPos.length() : 1;
    for (const m of this.coronaMats) {
      m.uniforms.uTime.value = time;
      m.uniforms.uCamDist.value = d;
    }
  }

  dispose() {
    this.surfaceMat.dispose();
    this.coronaMats.forEach((m) => m.dispose());
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
}
