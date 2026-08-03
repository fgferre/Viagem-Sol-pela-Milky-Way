// ============================================================
// Campo estelar — pontos GPU com magnitude, cor B-V e extinção.
// Serve tanto para o catálogo HYG quanto para o halo procedural.
// ============================================================
import * as THREE from 'three';
import { STAR_VERT, STAR_FRAG } from '../shaders/starShaders';

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

  constructor(data: Float32Array, stride: number, opts: StarFieldOptions = {}) {
    const count = Math.floor(data.length / stride);
    const geo = new THREE.BufferGeometry();
    // stride 6: x,y,z,mag,ci,logLum
    //
    // logLum é a LUMINOSIDADE (0,4·(4,85 − M_V)) e o índice 3 é a
    // magnitude APARENTE vista do Sol — já contém 1/d☉². Usar o índice 3
    // como se fosse brilho intrínseco e depois dividir pela distância à
    // câmera aplicava a distância duas vezes: cada estrela errava pelo
    // seu próprio módulo de distância (Sirius 2,9 mag brilhante demais,
    // Rigel 7,1 fraca demais — 10 mag de erro relativo entre as duas).
    // Com logLum a magnitude aparente é recalculada a partir de onde a
    // câmera está, que é o que faz aproximar-se de uma estrela significar
    // alguma coisa. Assets sem o campo (halo procedural, stride < 6)
    // caem no fallback que reconstrói M_V a partir da mag do Sol.
    const pos = new Float32Array(count * 3);
    const logLum = new Float32Array(count);
    const ci = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = data[i * stride];
      pos[i * 3 + 1] = data[i * stride + 1];
      pos[i * 3 + 2] = data[i * stride + 2];
      ci[i] = data[i * stride + 4];
      logLum[i] = data[i * stride + 5];
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aLogLum', new THREE.BufferAttribute(logLum, 1));
    geo.setAttribute('aCi', new THREE.BufferAttribute(ci, 1));
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
