// ============================================================
// A GALÁXIA DE FORA EM WEBGPU, A CAMADA DO APP (padrão desde 12/11/2026).
// A galáxia vista de fora é desenhada
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
//
// A CADEIA NUNCA DEIXA A GALÁXIA PRETA. `criar` devolve null — e o WebGL
// segue desenhando — sem adaptador, sem dispositivo em 15 s, com erro de
// compilação, ou quando a PONTE falha: a tela WebGPU é pintada com um
// valor conhecido e lida de volta por um WebGL2 à parte (a ponte só foi
// medida no Chrome). Depois de pronta, perda do dispositivo ou erro da
// GPU marcam `falhou`, e galaxy.ts devolve a luz ao WebGL no quadro
// seguinte. Uma falha vale pela página inteira: o mundo da troca de tier
// não tenta de novo (a escolha é feita uma vez, na carga).
// ============================================================
import * as THREE from 'three';
import type { GalaxyBuffers } from '../geradorDaGalaxia';
import { MotorDaGalaxia } from './motor';

/** partículas por sorteio com folga (o gerador dá ~4,02 M na qualidade alta) */
const CAPACIDADE_POR_SORTEIO = 4_100_000;

/** quanto a GPU tem para entregar o dispositivo antes de a cadeia desistir */
const PRAZO_DO_DISPOSITIVO_MS = 15_000;

/** o valor da sonda da ponte: acima de 1, como a luz linear da galáxia */
const COR_DA_SONDA = [0.25, 2, 8, 1] as const;

/** uma falha do WebGPU vale pela página inteira (e é avisada uma vez só) */
let falhaDaPagina: string | null = null;

export function webgpuFalhouNestaPagina() {
  return falhaDaPagina !== null;
}

function falhar(motivo: string, erro?: unknown) {
  if (falhaDaPagina !== null) return;
  falhaDaPagina = motivo;
  console.warn(`[galáxia] WebGPU fora (${motivo}) — segue o WebGL.`, erro ?? '');
}

/**
 * A PONTE: a tela WebGPU (pintada com `COR_DA_SONDA`) sobe como textura
 * RGBA16F num WebGL2 à parte e é lida de volta. Valores fora de 2 % do
 * pintado = a ponte não funciona neste navegador.
 */
function ponteFunciona(tela: OffscreenCanvas): boolean {
  const gl = new OffscreenCanvas(2, 2).getContext('webgl2');
  if (!gl) return false;
  try {
    if (!gl.getExtension('EXT_color_buffer_float')) return false;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, tela);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return false;
    const px = new Float32Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, px);
    return [0, 1, 2].every((i) => Math.abs(px[i] - COR_DA_SONDA[i]) <= 0.02 * COR_DA_SONDA[i]);
  } catch {
    return false;
  } finally {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

export class CamadaWebgpu {
  readonly mesh: THREE.Mesh;
  private readonly motor: MotorDaGalaxia;
  private readonly tela: OffscreenCanvas;
  private readonly textura: THREE.CanvasTexture<OffscreenCanvas>;
  private readonly material: THREE.ShaderMaterial;
  private readonly vp = new THREE.Matrix4();
  private readonly alvo = new THREE.Vector2(2, 2);
  private vivo = true;
  /** perdeu o dispositivo ou a GPU acusou erro: galaxy.ts a solta */
  falhou = false;
  /** sorteios pedidos que ainda não entraram (a captura espera por eles) */
  pendentes = 0;

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
   * `null` sem WebGPU (ou com a ponte quebrada). O primeiro sorteio é o
   * buffer que o app já gerou; `sortear(s)` entrega os seguintes (s = 1,
   * 2, …), que entram na ordem em que chegam — a camada desenha desde o
   * primeiro e afina com os outros.
   */
  static async criar(
    buffers: GalaxyBuffers,
    sorteios: number,
    sortear: (s: number) => Promise<GalaxyBuffers>
  ): Promise<CamadaWebgpu | null> {
    if (falhaDaPagina !== null) return null;
    const tela = new OffscreenCanvas(2, 2);
    let prazo = 0;
    const motor = await Promise.race([
      MotorDaGalaxia.criar(tela, sorteios * CAPACIDADE_POR_SORTEIO, true),
      new Promise<null>((r) => {
        prazo = window.setTimeout(() => {
          falhar('o dispositivo não chegou no prazo');
          r(null);
        }, PRAZO_DO_DISPOSITIVO_MS);
      }),
    ]).catch((e: unknown) => {
      falhar('erro ao iniciar', e);
      return null;
    });
    window.clearTimeout(prazo);
    if (!motor) {
      falhar('sem adaptador');
      return null;
    }
    if (falhaDaPagina !== null) {
      motor.destruir(); // chegou depois do prazo
      return null;
    }
    try {
      await motor.pintar(2, 2, COR_DA_SONDA);
    } catch (e) {
      falhar('a sonda da ponte não pintou', e);
    }
    if (falhaDaPagina === null && !ponteFunciona(tela)) falhar('a ponte com o WebGL não devolve a luz');
    if (falhaDaPagina !== null || motor.erros.length) {
      falhar('erro da GPU na sonda');
      motor.destruir();
      return null;
    }
    const camada = new CamadaWebgpu(motor, tela);
    void motor.perdido.then((info) => {
      if (!camada.vivo) return; // destruído por nós
      camada.falhou = true;
      falhar(`dispositivo perdido: ${info.message}`);
    });
    try {
      motor.acrescentar(buffers.bright, buffers.brightCount);
    } catch (e) {
      falhar('erro ao subir as partículas', e);
      camada.dispose();
      return null;
    }
    // Os sorteios assam em paralelo mas entram NA ORDEM (1, 2, 3…): o nível
    // de detalhe desenha um prefixo deles, e a ordem de chegada mudaria a
    // imagem de uma carga para outra (md5 instável nas provas).
    camada.pendentes = sorteios - 1;
    let fila = Promise.resolve();
    for (let s = 1; s < sorteios; s++) {
      const assado = sortear(s);
      fila = fila
        .then(() => assado)
        .then((b) => {
          if (camada.vivo && !camada.falhou) motor.acrescentar(b.bright, b.brightCount);
        })
        .catch((e: unknown) => console.warn('[galáxia] um sorteio extra falhou — segue com menos.', e))
        .finally(() => camada.pendentes--);
    }
    return camada;
  }

  /**
   * Um quadro. `peso` é a fração da luz das partículas que cabe à camada
   * (o resto fica com o WebGL); `ganho` é o uFade das partículas.
   */
  update(
    camera: THREE.PerspectiveCamera,
    largura: number,
    altura: number,
    tanMeioFov: number,
    ganho: number,
    peso: number
  ) {
    this.mesh.visible = peso > 0.001 && ganho > 0.001;
    if (!this.mesh.visible) return;
    this.material.uniforms.uPeso.value = peso;
    camera.updateMatrixWorld();
    this.vp.copy(camera.matrixWorld).invert().premultiply(camera.projectionMatrix);
    if (this.tela.width !== largura || this.tela.height !== altura) this.textura.dispose();
    try {
      this.motor.quadro(
        {
          viewProj: this.vp.elements,
          pos: camera.position.toArray(),
          tanMeioFov,
        },
        largura,
        altura,
        { k: 1, borrifo: 0, fatia: 4, filtro: 1, lod: 12, expo: 1, ganho }
      );
    } catch (e) {
      this.falhou = true;
      this.mesh.visible = false;
      falhar('erro ao desenhar', e);
      return;
    }
    this.textura.needsUpdate = true;
    if (this.motor.erros.length) {
      this.falhou = true;
      falhar(`erro da GPU: ${this.motor.erros[0]}`);
    }
  }

  dispose() {
    this.vivo = false;
    this.motor.destruir();
    this.textura.dispose();
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}
