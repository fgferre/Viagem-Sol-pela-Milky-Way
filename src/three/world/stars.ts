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
        uTime: { value: 0 },
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

// Halo procedural de estrelas distantes (mag 7–11), concentrado no
// plano galáctico real — profundidade além do alcance do catálogo.
export function buildFarStars(count: number, seed = 0x4d494c4b): Float32Array {
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const GAL_N = new THREE.Vector3(
    -0.867666149,
    -0.1980763734,
    0.4559837762
  );
  const t1 = new THREE.Vector3(0, 1, 0).cross(GAL_N).normalize();
  const t2 = GAL_N.clone().cross(t1).normalize();
  const data = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    // direção isotrópica com achatamento gaussiano ao plano
    const a = random() * Math.PI * 2;
    const r = 260 + Math.pow(random(), 0.6) * 3200;
    // O plano médio cruza 5,5 pc ao sul do Sol.
    const off = (random() + random() + random() - 1.5) * 140 - 5.5;
    const inPlane = Math.sqrt(Math.max(r * r - off * off, 1));
    const p = t1
      .clone()
      .multiplyScalar(Math.cos(a) * inPlane)
      .add(t2.clone().multiplyScalar(Math.sin(a) * inPlane))
      .add(GAL_N.clone().multiplyScalar(off));
    data[i * 6] = p.x;
    data[i * 6 + 1] = p.y;
    data[i * 6 + 2] = p.z;
    const mag = 7.0 + random() * 3.6;
    data[i * 6 + 3] = mag; // mag aparente vista do Sol
    data[i * 6 + 4] = -0.15 + random() * 1.6; // B-V
    // Mesmo schema do HYG: logLum = 0,4·(4,85 − M_V). Sorteia-se a
    // magnitude APARENTE (é ela que define a densidade do céu visto
    // daqui) e converte-se para intrínseca com a distância do próprio
    // ponto — assim o halo responde à câmera como o catálogo responde.
    data[i * 6 + 5] = 0.4 * (4.85 - (mag - 5 * Math.log10(r / 10)));
  }
  return data;
}
