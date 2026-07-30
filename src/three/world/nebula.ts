// ============================================================
// Nebulosa volumétrica — raymarching em render target de meia
// resolução, composta como fundo HDR da cena principal.
// ============================================================
import * as THREE from 'three';
import { NEBULA_VERT, NEBULA_FRAG } from '../shaders/nebulaShaders';

// Luzes embutidas no gás — posições reais do catálogo HYG (pc)
const BETELGEUSE = new THREE.Vector3(3.189, 151.364, 19.682); // supergigante vermelha
const RIGEL = new THREE.Vector3(51.601, 256.71, -37.74); // supergigante azul

export class Nebula {
  readonly texture: THREE.Texture;
  private rt: THREE.WebGLRenderTarget;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera();
  private material: THREE.ShaderMaterial;
  private scale: number;
  /** 1×1 sem cobertura — mantém o sampler válido antes dos dados. */
  private fallbackDustMap = new THREE.DataTexture(
    new Uint8Array([0, 0]),
    1,
    1,
    THREE.RGFormat,
    THREE.UnsignedByteType
  );

  constructor(scale = 0.5) {
    this.scale = scale;
    this.fallbackDustMap.needsUpdate = true;
    this.rt = new THREE.WebGLRenderTarget(960, 540, {
      type: THREE.HalfFloatType,
      depthBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    this.texture = this.rt.texture;
    this.material = new THREE.ShaderMaterial({
      vertexShader: NEBULA_VERT,
      fragmentShader: NEBULA_FRAG,
      uniforms: {
        uCamPos: { value: new THREE.Vector3() },
        uCamRight: { value: new THREE.Vector3(1, 0, 0) },
        uCamUp: { value: new THREE.Vector3(0, 1, 0) },
        uCamFwd: { value: new THREE.Vector3(0, 0, -1) },
        uTanHalfFov: { value: 0.5 },
        uAspect: { value: 16 / 9 },
        uResolution: { value: new THREE.Vector2(960, 540) },
        uTime: { value: 0 },
        uSteps: { value: 44 },
        uSunPos: { value: new THREE.Vector3(0, 0, 0) },
        uFade: { value: 1 },
        uLightPos: { value: [BETELGEUSE, RIGEL] },
        uLightColor: {
          value: [new THREE.Vector3(1.0, 0.34, 0.10), new THREE.Vector3(0.42, 0.62, 1.0)],
        },
        uDustMap: { value: this.fallbackDustMap },
        uCartBlend: { value: 0 },
        uSeedCloudCount: { value: 0 },
        uSeedClouds: {
          value: Array.from({ length: 32 }, () => new THREE.Vector4()),
        },
        uSeedCloudAmp: { value: new Float32Array(32) },
        uCavityPos: { value: new THREE.Vector3() },
        uCavityGate: { value: 0 },
      },
      depthWrite: false,
      depthTest: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }

  private lastW = 960;
  private lastH = 540;

  setSize(w: number, h: number) {
    this.lastW = w;
    this.lastH = h;
    const rw = Math.max(2, Math.floor(w * this.scale));
    const rh = Math.max(2, Math.floor(h * this.scale));
    this.rt.setSize(rw, rh);
    (this.material.uniforms.uResolution.value as THREE.Vector2).set(rw, rh);
  }

  /** alavanca do auto-quality sobre o custo do raymarch (~2× extra) */
  setScale(s: number) {
    if (s === this.scale) return;
    this.scale = s;
    this.setSize(this.lastW, this.lastH);
  }

  setSteps(n: number) {
    this.material.uniforms.uSteps.value = n;
  }

  setFade(f: number) {
    this.material.uniforms.uFade.value = f;
  }

  /** liga o mapa de poeira APOGEE na integração da faixa galáctica */
  setDustMap(map: THREE.Texture | null, blend = 1) {
    this.material.uniforms.uDustMap.value = map ?? this.fallbackDustMap;
    this.material.uniforms.uCartBlend.value = map ? blend : 0;
  }

  /**
   * Nuvens-semente do catálogo perto da câmera: entradas
   * [x, y, z, raio, amplitude] em pc na cena.
   */
  setSeedClouds(entries: Float32Array, count: number) {
    const u = this.material.uniforms;
    const positions = u.uSeedClouds.value as THREE.Vector4[];
    const amps = u.uSeedCloudAmp.value as Float32Array;
    const n = Math.min(count, 32);
    for (let i = 0; i < n; i++) {
      const o = i * 5;
      positions[i].set(entries[o], entries[o + 1], entries[o + 2], entries[o + 3]);
      amps[i] = entries[o + 4];
    }
    u.uSeedCloudCount.value = n;
  }

  /** cavidade do observador itinerante (0 = desligada, perto do Sol) */
  setCavity(pos: THREE.Vector3, gate: number) {
    (this.material.uniforms.uCavityPos.value as THREE.Vector3).copy(pos);
    this.material.uniforms.uCavityGate.value = gate;
  }

  render(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, time: number) {
    const u = this.material.uniforms;
    (u.uCamPos.value as THREE.Vector3).copy(camera.position);
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    (u.uCamFwd.value as THREE.Vector3).copy(fwd);
    (u.uCamRight.value as THREE.Vector3).setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    (u.uCamUp.value as THREE.Vector3).setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    u.uTanHalfFov.value = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    u.uAspect.value = camera.aspect;
    u.uTime.value = time;

    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(this.rt);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(prev);
  }

  dispose() {
    this.rt.dispose();
    this.material.dispose();
    this.fallbackDustMap.dispose();
  }
}
