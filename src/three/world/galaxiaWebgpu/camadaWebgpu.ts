// ============================================================
// ?galaxia=webgpu — A CAMADA DO APP. A galáxia vista de fora é desenhada
// pelo motor WebGPU numa tela fora do DOM, em luz LINEAR (rgba16float), e
// entra na cena do app como a textura de um triângulo de tela cheia no
// plano do fundo, somada como as partículas de sempre. Por ser só mais uma
// camada aditiva da cena, o brilho (bloom), a curva de tom, a lente e a
// ordem contra corpos opacos (teste de profundidade) são os do próprio
// app, sem emenda. Medido no Chrome: a textura chega com os valores acima
// de 1 intactos (0,25 / 2 / 8 lidos de volta exatos).
//
// Sem WebGPU (`criar` devolve null) quem desenha é o caminho WebGL do modo
// só-partículas, como reserva. De dentro do disco também: a camada entra
// pelo `peso` que galaxy.ts lhe dá.
// ============================================================
import * as THREE from 'three';
import type { GalaxyBuffers } from '../geradorDaGalaxia';
import { MotorDaGalaxia } from './motor';

/** partículas por sorteio com folga (o gerador dá ~4,02 M na qualidade alta) */
const CAPACIDADE_POR_SORTEIO = 4_100_000;

export class CamadaWebgpu {
  readonly mesh: THREE.Mesh;
  private readonly motor: MotorDaGalaxia;
  private readonly tela: OffscreenCanvas;
  private readonly textura: THREE.CanvasTexture<OffscreenCanvas>;
  private readonly material: THREE.ShaderMaterial;
  private readonly vp = new THREE.Matrix4();
  private readonly alvo = new THREE.Vector2(2, 2);
  private vivo = true;

  private constructor(motor: MotorDaGalaxia, tela: OffscreenCanvas) {
    this.motor = motor;
    this.tela = tela;
    this.textura = new THREE.CanvasTexture(tela);
    this.textura.type = THREE.HalfFloatType;
    this.textura.internalFormat = 'RGBA16F';
    this.textura.colorSpace = THREE.NoColorSpace;
    this.textura.generateMipmaps = false;
    this.textura.minFilter = THREE.LinearFilter;
    this.textura.magFilter = THREE.LinearFilter;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uGalaxia: { value: this.textura },
        uAlvo: { value: this.alvo },
        uPeso: { value: 0 },
      },
      // no plano do fundo: qualquer corpo opaco na frente vence o teste
      vertexShader: /* glsl */ `
        void main() { gl_Position = vec4(position.xy, 1.0 - 4.8e-7, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uGalaxia;
        uniform vec2 uAlvo;
        uniform float uPeso;
        void main() {
          gl_FragColor = vec4(texture2D(uGalaxia, gl_FragCoord.xy / uAlvo).rgb * uPeso, 1.0);
        }`,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      toneMapped: false,
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2; // o das partículas que ela substitui
    this.mesh.visible = false;
    // o tamanho do alvo em que a cena está sendo desenhada, lido na hora
    this.mesh.onBeforeRender = (renderer) => {
      const rt = renderer.getRenderTarget();
      if (rt) this.alvo.set(rt.width, rt.height);
      else renderer.getDrawingBufferSize(this.alvo);
    };
    if (import.meta.env.DEV) Object.assign(window, { __galaxiaWebgpu: motor });
  }

  /**
   * `null` sem WebGPU. O primeiro sorteio é o buffer que o app já gerou;
   * `sortear(s)` entrega os seguintes (s = 1, 2, …), que entram na ordem em
   * que chegam — a camada desenha desde o primeiro e afina com os outros.
   */
  static async criar(
    buffers: GalaxyBuffers,
    sorteios: number,
    sortear: (s: number) => Promise<GalaxyBuffers>
  ): Promise<CamadaWebgpu | null> {
    const tela = new OffscreenCanvas(2, 2);
    const motor = await MotorDaGalaxia.criar(tela, sorteios * CAPACIDADE_POR_SORTEIO, true).catch((e: unknown) => {
      console.warn('[galáxia] WebGPU indisponível — segue o WebGL.', e);
      return null;
    });
    if (!motor) return null;
    const camada = new CamadaWebgpu(motor, tela);
    motor.acrescentar(buffers.bright, buffers.brightCount);
    for (let s = 1; s < sorteios; s++) {
      void sortear(s).then((b) => {
        if (camada.vivo) motor.acrescentar(b.bright, b.brightCount);
      });
    }
    return camada;
  }

  /**
   * Um quadro. `peso` é a fração da luz das partículas que cabe à camada
   * (o resto fica com o WebGL); `ganho` é o uFade das partículas.
   */
  update(
    camera: THREE.PerspectiveCamera, largura: number, altura: number, tanMeioFov: number,
    ganho: number, peso: number
  ) {
    this.mesh.visible = peso > 0.001 && ganho > 0.001;
    if (!this.mesh.visible) return;
    this.material.uniforms.uPeso.value = peso;
    camera.updateMatrixWorld();
    this.vp.copy(camera.matrixWorld).invert().premultiply(camera.projectionMatrix);
    if (this.tela.width !== largura || this.tela.height !== altura) this.textura.dispose();
    this.motor.quadro(
      {
        viewProj: this.vp.elements,
        pos: camera.position.toArray(),
        tanMeioFov,
      },
      largura, altura,
      { k: 1, borrifo: 0, fatia: 4, filtro: 1, lod: 12, expo: 1, ganho }
    );
    this.textura.needsUpdate = true;
  }

  dispose() {
    this.vivo = false;
    this.motor.destruir();
    this.textura.dispose();
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}
