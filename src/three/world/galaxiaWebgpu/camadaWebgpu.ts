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
// A CADEIA NUNCA DEIXA A GALÁXIA PRETA. `criar().pronta` devolve null — e
// o WebGL segue desenhando — sem adaptador, com erro de compilação, ou
// quando a PONTE falha: a tela WebGPU é pintada com um valor conhecido e
// lida de volta por um WebGL2 à parte (a ponte só foi medida no Chrome).
// Depois de pronta, perda do dispositivo ou erro da GPU marcam `falhou`, e
// galaxy.ts devolve a luz ao WebGL no quadro seguinte. Uma falha vale pela
// página inteira — o mundo da troca de tier não tenta de novo — até o
// visitante pedir o WebGPU outra vez (`esquecerQuedaDoWebgpu`, 18/11/2026).
//
// O PRAZO NÃO É QUEDA (18/11/2026). Com a placa disputada o dispositivo
// passava dos 15 s, a camada era descartada quando chegava e a página
// ficava no WebGL para sempre, calada. Agora o prazo só avisa
// (`atrasou`): a captura para de esperar, o painel diz que a placa está
// ocupada, e a camada entra quando chegar.
// ============================================================
import * as THREE from 'three';
import type { GalaxyBuffers } from '../geradorDaGalaxia';
import { MotorDaGalaxia } from './motor';
import type { OpcoesDoQuadro, SorteioEmpacotado } from './motor';
import type { OpcoesDoLaboratorioWebgpu } from '../laboratorioDaGalaxia';
import type { QuedaDaGalaxia } from '../../core/engine';

/** partículas por sorteio com folga (o gerador dá ~4,02 M na qualidade alta) */
const CAPACIDADE_POR_SORTEIO = 4_100_000;

/** quanto a GPU tem para entregar a camada antes de o painel dizer que ela atrasou */
const PRAZO_DO_DISPOSITIVO_MS = 15_000;

/** o valor da sonda da ponte: acima de 1, como a luz linear da galáxia */
const COR_DA_SONDA = [0.25, 2, 8, 1] as const;

/** o porquê de uma queda, na palavra que o painel traduz */
type MotivoDaQueda = Extract<QuedaDaGalaxia, 'semWebgpu' | 'ponte' | 'perdido' | 'erro'>;

/** uma falha do WebGPU vale pela página inteira (e é avisada uma vez só) */
let falhaDaPagina: MotivoDaQueda | null = null;

export function webgpuFalhouNestaPagina() {
  return falhaDaPagina !== null;
}

export function motivoDaQuedaDoWebgpu() {
  return falhaDaPagina;
}

/** o visitante pediu o WebGPU de novo: a próxima carga tenta outra vez */
export function esquecerQuedaDoWebgpu() {
  falhaDaPagina = null;
}

function falhar(motivo: MotivoDaQueda, detalhe: string, erro?: unknown) {
  if (falhaDaPagina !== null) return;
  falhaDaPagina = motivo;
  console.warn(`[galáxia] WebGPU fora (${detalhe}) — segue o WebGL.`, erro ?? '');
}

/** a camada pedida e o aviso do prazo, que não a cancela */
export interface CamadaPedida {
  pronta: Promise<CamadaWebgpu | null>;
  atrasou: Promise<void>;
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
      // (na profundidade invertida o fundo é z = 0: `core/profundidade.ts`)
      vertexShader: /* glsl */ `
        #ifdef USE_REVERSED_DEPTH_BUFFER
        void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
        #else
        void main() { gl_Position = vec4(position.xy, 1.0 - 4.8e-7, 1.0); }
        #endif`,
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
   * `pronta` dá `null` sem WebGPU (ou com a ponte quebrada). O primeiro sorteio é a
   * carga principal (`principal`, a mesma que o WebGL desenha); `sortear(s)`
   * entrega os seguintes (s = 1, 2, …), já empacotados, que entram na ordem.
   *
   * CHAMADA NO INÍCIO DA CARGA (13/11/2026), e não depois dela: dispositivo,
   * shaders e a sonda da ponte sobem enquanto os trabalhadores assam, e a
   * camada fica pronta quase junto com a galáxia WebGL. Antes eram três
   * esperas em fila depois da carga (motor, sonda, sorteio extra).
   */
  static criar(
    principal: Promise<GalaxyBuffers & { nuvens?: Uint16Array | null }>,
    sorteios: number,
    sortear: (s: number) => Promise<SorteioEmpacotado>
  ): CamadaPedida {
    return {
      pronta: CamadaWebgpu.montar(principal, sorteios, sortear),
      atrasou: new Promise((r) => window.setTimeout(r, PRAZO_DO_DISPOSITIVO_MS)),
    };
  }

  private static async montar(
    principal: Promise<GalaxyBuffers & { nuvens?: Uint16Array | null }>,
    sorteios: number,
    sortear: (s: number) => Promise<SorteioEmpacotado>
  ): Promise<CamadaWebgpu | null> {
    // O ABORTO DA CARGA (auditoria R3, M8) chega por `principal`: troca de
    // tier cancelada, placa perdida, desmontagem. Não é falha do WebGPU —
    // marcar a página jogaria a galáxia no WebGL até recarregar. O motor
    // espera as nuvens por último, e o `criar` que rejeita já destruiu o
    // dispositivo dele.
    const abortada = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';
    const nuvens = principal.then((b) => b.nuvens ?? undefined);
    // quem sai antes de esperar por elas não deixa rejeição sem dono
    principal.catch(() => {});
    nuvens.catch(() => {});
    if (falhaDaPagina !== null) return null;
    const tela = new OffscreenCanvas(2, 2);
    let abortou = false;
    const motor = await MotorDaGalaxia.criar(tela, sorteios * CAPACIDADE_POR_SORTEIO, true, nuvens).catch(
      (e: unknown) => {
        if (abortada(e)) abortou = true;
        else falhar('erro', 'erro ao iniciar', e);
        return null;
      }
    );
    if (abortou) return null;
    if (!motor) {
      falhar('semWebgpu', 'sem adaptador');
      return null;
    }
    try {
      await motor.pintar(2, 2, COR_DA_SONDA);
    } catch (e) {
      falhar('erro', 'a sonda da ponte não pintou', e);
    }
    if (falhaDaPagina === null && !ponteFunciona(tela)) falhar('ponte', 'a ponte com o WebGL não devolve a luz');
    if (falhaDaPagina !== null || motor.erros.length) {
      falhar('erro', 'erro da GPU na sonda');
      motor.destruir();
      return null;
    }
    const camada = new CamadaWebgpu(motor, tela);
    void motor.perdido.then((info) => {
      if (!camada.vivo) return; // destruído por nós
      camada.falhou = true;
      falhar('perdido', `dispositivo perdido: ${info.message}`);
    });
    // o motor só existe depois de `principal` (as nuvens vêm dela), então
    // isto não rejeita hoje; se rejeitar, o dispositivo não fica sem dono
    const buffers = await principal.catch((e: unknown) => {
      camada.dispose();
      if (abortada(e)) return null;
      throw e;
    });
    if (!buffers) return null;
    try {
      motor.acrescentar(buffers.bright, buffers.brightCount);
    } catch (e) {
      falhar('erro', 'erro ao subir as partículas', e);
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
          if (camada.vivo && !camada.falhou) motor.acrescentarPacote(b);
        })
        .catch((e: unknown) => {
          if (!abortada(e)) console.warn('[galáxia] um sorteio extra falhou — segue com menos.', e);
        })
        .finally(() => camada.pendentes--);
    }
    return camada;
  }

  /**
   * Um quadro. `peso` é a fração da luz das partículas que cabe à camada
   * (o resto fica com o WebGL); `ganho` é o uFade das partículas;
   * `opcoes`, os botões do motor que o laboratório da galáxia governa, e a
   * cessão por partícula (`pesoFixo`/`pesoPerto`, galaxy.ts).
   */
  update(
    camera: THREE.PerspectiveCamera,
    largura: number,
    altura: number,
    tanMeioFov: number,
    ganho: number,
    peso: number,
    opcoes: OpcoesDoLaboratorioWebgpu & Pick<OpcoesDoQuadro, 'pesoFixo' | 'pesoPerto'>
  ) {
    this.mesh.visible = peso > 0.001 && ganho > 0.001;
    if (!this.mesh.visible) return;
    this.material.uniforms.uPeso.value = peso;
    camera.updateMatrixWorld();
    this.vp.copy(camera.matrixWorld).invert().premultiply(camera.projectionMatrix);
    if (this.tela.width !== largura || this.tela.height !== altura) this.textura.dispose();
    let novo: boolean;
    try {
      // com a imagem parada o motor não desenha e a textura guarda o último quadro
      novo = this.motor.quadro(
        {
          viewProj: this.vp.elements,
          pos: camera.position.toArray(),
          tanMeioFov,
        },
        largura,
        altura,
        { ...opcoes, expo: 1, ganho },
        false,
        true
      );
    } catch (e) {
      this.falhou = true;
      this.mesh.visible = false;
      falhar('erro', 'erro ao desenhar', e);
      return;
    }
    if (novo) this.textura.needsUpdate = true;
    if (this.motor.erros.length) {
      this.falhou = true;
      falhar('erro', `erro da GPU: ${this.motor.erros[0]}`);
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
