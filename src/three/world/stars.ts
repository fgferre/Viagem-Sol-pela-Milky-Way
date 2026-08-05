// ============================================================
// Campo estelar — pontos GPU com magnitude, cor B-V e extinção.
// Serve tanto para o catálogo HYG quanto para o halo procedural.
// ============================================================
import * as THREE from 'three';
import { STAR_VERT, STAR_FRAG } from '../shaders/starShaders';
import type { StarArrays } from '../config';

interface StarFieldOptions {
  /** magnitude aparente que satura o pico da PSF — o "tempo de exposição" */
  expoM0?: number;
  /** largura da PSF em px a 1080p — o "instrumento" */
  sigmaPx?: number;
  tau?: number; // coeficiente de extinção
}

export class StarField {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;

  constructor(data: StarArrays, opts: StarFieldOptions = {}) {
    const geo = new THREE.BufferGeometry();
    // logLum é a LUMINOSIDADE (0,4·(4,85 − M_V)); a magnitude aparente
    // NÃO viaja no atributo porque o vertex a recalcula da posição da
    // câmera — foi assim que "aproximar-se de uma estrela" passou a
    // significar alguma coisa. (O erro antigo era usar a magnitude vista
    // do Sol como brilho intrínseco: a distância entrava duas vezes e o
    // catálogo saía com 10 mag de erro relativo entre Sirius e Rigel.)
    // O decodificador em config.ts já entrega os três atributos prontos.
    geo.setAttribute('position', new THREE.BufferAttribute(data.position, 3));
    geo.setAttribute('aLogLum', new THREE.BufferAttribute(data.logLum, 1));
    geo.setAttribute('aCi', new THREE.BufferAttribute(data.ci, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6000);

    this.material = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      uniforms: {
        uCamPos: { value: new THREE.Vector3() },
        uScreenH: { value: 1080 },
        uExpoM0: { value: opts.expoM0 ?? 3.5 },
        uSigmaPx: { value: opts.sigmaPx ?? 0.85 },
        uTau: { value: opts.tau ?? 0.9 },
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
    this.points.renderOrder = 2;
  }

  update(camPos: THREE.Vector3, screenH: number) {
    const u = this.material.uniforms;
    (u.uCamPos.value as THREE.Vector3).copy(camPos);
    u.uScreenH.value = screenH;
  }

  setFade(f: number) {
    this.material.uniforms.uFade.value = f;
    this.points.visible = f > 0.001;
  }

  /** mesma cavidade do raymarch — a extinção vê o mesmo gás carvado */
  setCavity(pos: THREE.Vector3, gate: number) {
    (this.material.uniforms.uCavityPos.value as THREE.Vector3).copy(pos);
    this.material.uniforms.uCavityGate.value = gate;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
