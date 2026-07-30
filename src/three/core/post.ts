// ============================================================
// Pós-processamento — bloom HDR (Unreal) + gradação de filme.
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FILM_SHADER } from '../shaders/dustShaders';

export class Post {
  readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
  private film: ShaderPass;
  private renderer: THREE.WebGLRenderer;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.72, // força
      0.58, // raio
      0.82 // limiar — preserva a fotosfera e faz estrelas HDR florescerem
    );
    this.composer.addPass(this.bloom);

    this.film = new ShaderPass(FILM_SHADER as never);
    this.composer.addPass(this.film);
    this.composer.addPass(new OutputPass());
  }

  setSize(w: number, h: number) {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
  }

  private galaxyMode = 0;

  /**
   * Modo galáxia (0..1): o bojo é uma fonte HDR enorme — sem
   * moderação o bloom engole a tela inteira. Sobe o limiar e
   * baixa a força conforme a galáxia domina o quadro.
   */
  setGalaxy(k: number) {
    this.galaxyMode = k;
  }

  /** Pulso de bloom durante acelerações da viagem (0..1). */
  setWarp(k: number) {
    const g = this.galaxyMode;
    this.bloom.strength = (0.72 - 0.28 * g) * (1 + k * 0.4);
    this.bloom.threshold = 0.82 + 0.42 * g;
    this.bloom.radius = 0.58 - 0.18 * g;
    (this.film.uniforms as Record<string, { value: number }>).uCA.value =
      0.00012 + k * 0.00042;
  }

  render(time: number) {
    (this.film.uniforms as Record<string, { value: number }>).uTime.value = time;
    this.composer.render();
  }

  dispose() {
    this.composer.dispose();
  }
}
