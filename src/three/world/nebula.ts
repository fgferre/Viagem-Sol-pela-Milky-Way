// ============================================================
// Nebulosa volumétrica — raymarching em render target de meia
// resolução, composta como fundo HDR da cena principal.
// ============================================================
import * as THREE from 'three';
import {
  NEBULA_VERT,
  NEBULA_FRAG,
  NEBULA_LUT_FRAG,
  NEBULA_BLUR_FRAG,
} from '../shaders/nebulaShaders';
import { makeBlueNoiseTexture } from './blueNoise';

// Luzes embutidas no gás — posições reais do catálogo HYG (pc)
const BETELGEUSE = new THREE.Vector3(3.189, 151.364, 19.682); // supergigante vermelha
const RIGEL = new THREE.Vector3(51.601, 256.71, -37.74); // supergigante azul

export class Nebula {
  readonly texture: THREE.Texture;
  private rt: THREE.WebGLRenderTarget;
  // suavização do jitter blue-noise: raymarch → rt → blur 4 taps → rtBlur
  private rtBlur: THREE.WebGLRenderTarget;
  private blurScene = new THREE.Scene();
  private blurMaterial: THREE.ShaderMaterial;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera();
  private material: THREE.ShaderMaterial;
  private scale: number;
  // LUT equiretangular 256×128 da luz distante do disco; recalcula
  // somente após a câmera mover >2 pc.
  private lutRT: THREE.WebGLRenderTarget;
  private lutScene = new THREE.Scene();
  private lutMaterial: THREE.ShaderMaterial;
  private scratchFwd = new THREE.Vector3();
  // o LUT depende só da POSIÇÃO da câmera (integração por direção a
  // partir de ro): rotação pura e câmera parada reusam o do frame
  // anterior — 786k integrações economizadas por frame parado
  private lutCamPos = new THREE.Vector3(Infinity, Infinity, Infinity);
  private lutDirty = true;
  /** 1×1 sem cobertura (A=128: warp neutro) — sampler válido antes dos dados. */
  private fallbackDustMap = new THREE.DataTexture(
    new Uint8Array([0, 0, 0, 128]),
    1,
    1,
    THREE.RGBAFormat,
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
    this.rtBlur = new THREE.WebGLRenderTarget(960, 540, {
      type: THREE.HalfFloatType,
      depthBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    this.blurMaterial = new THREE.ShaderMaterial({
      vertexShader: NEBULA_VERT,
      fragmentShader: NEBULA_BLUR_FRAG,
      uniforms: {
        uSrc: { value: this.rt.texture },
        uTexel: { value: new THREE.Vector2(1 / 960, 1 / 540) },
      },
      depthWrite: false,
      depthTest: false,
    });
    const blurQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.blurMaterial);
    blurQuad.frustumCulled = false;
    this.blurScene.add(blurQuad);
    this.texture = this.rtBlur.texture;

    this.lutRT = new THREE.WebGLRenderTarget(256, 128, {
      type: THREE.HalfFloatType,
      depthBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    // wrap horizontal: costura invisível em lon = ±π
    this.lutRT.texture.wrapS = THREE.RepeatWrapping;
    this.lutRT.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.lutMaterial = new THREE.ShaderMaterial({
      vertexShader: NEBULA_VERT,
      fragmentShader: NEBULA_LUT_FRAG,
      uniforms: {
        uCamPos: { value: new THREE.Vector3() },
        uDustMap: { value: this.fallbackDustMap },
        uCartBlend: { value: 0 },
      },
      depthWrite: false,
      depthTest: false,
    });
    const lutQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.lutMaterial);
    lutQuad.frustumCulled = false;
    this.lutScene.add(lutQuad);
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
        uSteps: { value: 44 },
        uSunPos: { value: new THREE.Vector3(0, 0, 0) },
        uFade: { value: 1 },
        uLightPos: { value: [BETELGEUSE, RIGEL] },
        uLightColor: {
          value: [new THREE.Vector3(1.0, 0.34, 0.10), new THREE.Vector3(0.42, 0.62, 1.0)],
        },
        uDustMap: { value: this.fallbackDustMap },
        uBandLUT: { value: this.lutRT.texture },
        uBlueNoise: { value: makeBlueNoiseTexture() },
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
    this.rtBlur.setSize(rw, rh);
    (this.material.uniforms.uResolution.value as THREE.Vector2).set(rw, rh);
    (this.blurMaterial.uniforms.uTexel.value as THREE.Vector2).set(1 / rw, 1 / rh);
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

  /** liga o mapa galactocêntrico (APOGEE + braços/warp bakeados) */
  setDustMap(map: THREE.Texture | null, blend = 1) {
    const texture = map ?? this.fallbackDustMap;
    this.material.uniforms.uDustMap.value = texture;
    this.lutMaterial.uniforms.uDustMap.value = texture;
    this.lutMaterial.uniforms.uCartBlend.value = map ? blend : 0;
    this.lutDirty = true;
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

  render(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
    const u = this.material.uniforms;
    (u.uCamPos.value as THREE.Vector3).copy(camera.position);
    camera.getWorldDirection(this.scratchFwd);
    (u.uCamFwd.value as THREE.Vector3).copy(this.scratchFwd);
    (u.uCamRight.value as THREE.Vector3).setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    (u.uCamUp.value as THREE.Vector3).setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    u.uTanHalfFov.value = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    u.uAspect.value = camera.aspect;
    const prev = renderer.getRenderTarget();
    if (this.lutDirty || this.lutCamPos.distanceToSquared(camera.position) > 4) {
      this.lutDirty = false;
      this.lutCamPos.copy(camera.position);
      (this.lutMaterial.uniforms.uCamPos.value as THREE.Vector3).copy(camera.position);
      renderer.setRenderTarget(this.lutRT);
      renderer.render(this.lutScene, this.camera);
    }
    renderer.setRenderTarget(this.rt);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(this.rtBlur);
    renderer.render(this.blurScene, this.camera);
    renderer.setRenderTarget(prev);
  }

  dispose() {
    this.rt.dispose();
    this.rtBlur.dispose();
    this.lutRT.dispose();
    this.material.dispose();
    this.blurMaterial.dispose();
    this.lutMaterial.dispose();
    this.fallbackDustMap.dispose();
    const bn = this.material.uniforms.uBlueNoise.value as THREE.Texture;
    bn.dispose();
    // as PlaneGeometry dos quads fullscreen também são GPU buffers
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.lutScene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.blurScene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
}
