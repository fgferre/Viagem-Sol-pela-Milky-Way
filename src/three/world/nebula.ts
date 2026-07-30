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

  constructor(scale = 0.5) {
    this.scale = scale;
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
      },
      depthWrite: false,
      depthTest: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }

  setSize(w: number, h: number) {
    const rw = Math.max(2, Math.floor(w * this.scale));
    const rh = Math.max(2, Math.floor(h * this.scale));
    this.rt.setSize(rw, rh);
    (this.material.uniforms.uResolution.value as THREE.Vector2).set(rw, rh);
  }

  setSteps(n: number) {
    this.material.uniforms.uSteps.value = n;
  }

  setFade(f: number) {
    this.material.uniforms.uFade.value = f;
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
  }
}
