// ============================================================
// A LENTE DE SAGITTARIUS A✱ EM ESCALA REAL — passe de pós que dobra o
// quadro já desenhado pela deflexão EXATA de Schwarzschild.
//
// O buraco tem o tamanho verdadeiro (RS = 0,085 UA, `lib/buracoNegro.ts`):
// de longe ele é menor que um pixel e o passe fica DESLIGADO (o composer
// o pula — custo zero). Liga quando o anel de Einstein passa de um pixel,
// o que acontece a ~1 pc do centro; a sombra só se resolve a algumas
// dezenas de UA.
//
// POR PIXEL: o raio da câmera tem ângulo ψ com a vertical local; a tabela
// (`tabelaDaLente`, refeita na CPU quando a distância muda 1 %) dá a dobra
// δ = Φ − ψ, e a luz chega da direção e = cos Φ·n + sen Φ·t. Raio que
// entra com b < b_c cai no buraco: preto, porque de lá não sai nada.
//
// O QUE ESTÁ FORA DA TELA — LIMITAÇÃO DECLARADA: perto da sombra a luz
// vem de trás e dos lados da câmera, e um quadro só não tem esse céu. A
// faixa colada na sombra (as imagens de ordem alta) lê o quadro DOBRADO
// sobre si mesmo na borda — extrapolação: supõe o céu de trás parecido
// com o da frente, o que no centro da galáxia (bojo em volta, por todo
// lado) é um palpite razoável, e a ficha o confessa.
// Uma foto do céu inteiro num cubo foi tentada e não serve nesta casa: o
// gás e boa parte da galáxia são raymarches de TELA presos à câmera
// principal, e as seis faces saíam escuras e com emendas.
//
// Observador PARADO (sem aberração do movimento da câmera) e sem o
// desvio para o azul gravitacional (+5 % de intensidade a 40 RS).
// ============================================================
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { AMOSTRAS_DA_TABELA, RS_SGR_A_PC, tabelaDaLente } from '../../lib/buracoNegro';
import { GAL } from './baseGalactica';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene;
uniform highp sampler2D tTabela;
uniform vec3 uCam;      // câmera − buraco, em RS, eixos do mundo
uniform float uRO;      // |uCam|
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uFwd;
uniform float uTanHalf;
uniform float uAspect;
uniform float uGamaS;   // raio angular da sombra
uniform float uXMin;
uniform float uXMax;
uniform float uPxRad;   // um pixel, em radianos

const float PI = 3.141592653589793;
const float NM1 = ${(AMOSTRAS_DA_TABELA - 1).toFixed(1)};

float lerLinha(int linha, float x) {
  x = clamp(x, 0.0, NM1);
  float i = min(floor(x), NM1 - 1.0);
  float f = x - i;
  float a = texelFetch(tTabela, ivec2(int(i), linha), 0).r;
  float b = texelFetch(tTabela, ivec2(int(i) + 1, linha), 0).r;
  return mix(a, b, f);
}

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec3 d = normalize(uFwd + uRight * (ndc.x * uTanHalf * uAspect) + uUp * (ndc.y * uTanHalf));
  vec3 n = uCam / uRO;
  float c = dot(d, n);
  vec3 perp = d - c * n;
  float s = length(perp);
  // γ: o ângulo do raio à direção do buraco — atan2 é exato perto de 0
  float gama = atan(s, -c);
  float delta;
  if (c >= 0.0) {
    float psi = PI - gama;
    delta = lerLinha(0, (1.0 - sqrt(max(0.0, 1.0 - psi / (0.5 * PI)))) * NM1);
  } else {
    if (gama <= uGamaS) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
    delta = lerLinha(1, (log(gama - uGamaS) - uXMin) / (uXMax - uXMin) * NM1);
  }
  vec4 aqui = texture2D(tScene, vUv);
  // dobra menor que um quarto de pixel: o quadro como está, sem borrar
  if (delta < 0.25 * uPxRad || s < 1e-7) {
    gl_FragColor = aqui;
    return;
  }
  vec3 t = perp / s;
  float phi = (PI - gama) + delta;
  vec3 e = cos(phi) * n + sin(phi) * t;
  // a direção e na tela, em ângulo (θ do eixo da câmera, φ em volta dele)
  float ex = dot(e, uRight);
  float ey = dot(e, uUp);
  float ez = dot(e, uFwd);
  float theta = atan(length(vec2(ex, ey)), ez);
  float phi2 = atan(ey, ex);
  vec2 cs = vec2(cos(phi2), sin(phi2));
  float aMeia = uTanHalf * uAspect;
  // a borda do quadro nessa direção, em ângulo
  float thetaBorda = atan(min(aMeia / max(abs(cs.x), 1e-6), uTanHalf / max(abs(cs.y), 1e-6)));
  // FORA DO QUADRO: o céu é DOBRADO de volta para dentro, espelhado na
  // borda (de trás da câmera, θ = π, cai no centro). É extrapolação
  // declarada — contínua na borda, sem costura — no lugar do céu de
  // trás, que este quadro não tem.
  if (theta > thetaBorda) theta = thetaBorda - (theta - thetaBorda) * thetaBorda / (PI - thetaBorda);
  float rho = tan(theta);
  vec2 uv = vec2(0.5 + 0.5 * rho * cs.x / aMeia, 0.5 + 0.5 * rho * cs.y / uTanHalf);
  vec3 cor = texture2D(tScene, clamp(uv, 0.0, 1.0)).rgb;
  gl_FragColor = vec4(cor, 1.0);
}
`;

const _rel = new THREE.Vector3();
const _v = new THREE.Vector3();

/** o raio do anel de Einstein (fonte no infinito), rad, para a câmera a rO RS */
export function raioDeEinstein(rO: number): number {
  return Math.sqrt(2 / rO);
}

export class LenteDoBuracoNegro extends Pass {
  private mat: THREE.ShaderMaterial;
  private quad: FullScreenQuad;
  private tabela: THREE.DataTexture;
  private rTabela = 0;
  private alturaPx = 1;
  /** a distância da câmera ao buraco, em RS, do último quadro (para quem mede) */
  rO = Infinity;

  constructor() {
    super();
    this.enabled = false;
    this.needsSwap = true;
    const n = AMOSTRAS_DA_TABELA;
    this.tabela = new THREE.DataTexture(new Float32Array(2 * n), n, 2, THREE.RedFormat, THREE.FloatType);
    this.tabela.minFilter = THREE.NearestFilter;
    this.tabela.magFilter = THREE.NearestFilter;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        tScene: { value: null },
        tTabela: { value: this.tabela },
        uCam: { value: new THREE.Vector3() },
        uRO: { value: 1 },
        uRight: { value: new THREE.Vector3() },
        uUp: { value: new THREE.Vector3() },
        uFwd: { value: new THREE.Vector3() },
        uTanHalf: { value: 0.5 },
        uAspect: { value: 1.6 },
        uGamaS: { value: 0 },
        uXMin: { value: 0 },
        uXMax: { value: 1 },
        uPxRad: { value: 1e-3 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.mat);
  }

  get warmupMaterials(): THREE.Material[] {
    return [this.mat];
  }

  setSize(_w: number, height: number) {
    this.alturaPx = Math.max(1, height);
  }

  /**
   * Chamado a cada quadro. `permitido` = fora dos filmes (o filme tem o
   * buraco dele, `blackHole.ts`). Liga só quando o anel de Einstein passa
   * de um pixel E o buraco está perto o bastante do quadro para dobrar
   * alguma coisa nele.
   */
  updateFrame(camPos: THREE.Vector3, camera: THREE.PerspectiveCamera, permitido: boolean) {
    _rel.copy(camPos).sub(GAL.GC_POS).divideScalar(RS_SGR_A_PC);
    const rO = _rel.length();
    this.rO = rO;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const pxRad = (2 * tanHalf) / this.alturaPx;
    // até onde a dobra passa de ¼ de pixel: α ≈ 2/b, b ≈ rO·θ
    const alcance = 8 / (rO * pxRad);
    let ativo = permitido && raioDeEinstein(rO) > pxRad && rO > 3;
    if (ativo) {
      const meiaDiagonal = Math.atan(tanHalf * Math.hypot(1, camera.aspect));
      _v.setFromMatrixColumn(camera.matrixWorld, 2).negate();
      const angulo = _v.angleTo(_rel.clone().negate());
      ativo = angulo < meiaDiagonal + alcance;
    }
    this.enabled = ativo;
    if (!ativo) return;
    if (this.rTabela === 0 || Math.abs(Math.log(rO / this.rTabela)) > 0.01) {
      const t = tabelaDaLente(rO);
      (this.tabela.image.data as Float32Array).set(t.dados);
      this.tabela.needsUpdate = true;
      this.rTabela = rO;
      this.mat.uniforms.uGamaS.value = t.gamaSombra;
      this.mat.uniforms.uXMin.value = t.xMin;
      this.mat.uniforms.uXMax.value = t.xMax;
    }
    const u = this.mat.uniforms;
    (u.uCam.value as THREE.Vector3).copy(_rel);
    u.uRO.value = rO;
    u.uTanHalf.value = tanHalf;
    u.uAspect.value = camera.aspect;
    u.uPxRad.value = pxRad;
    (u.uRight.value as THREE.Vector3).setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    (u.uUp.value as THREE.Vector3).setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    (u.uFwd.value as THREE.Vector3).setFromMatrixColumn(camera.matrixWorld, 2).normalize().negate();
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget
  ) {
    this.mat.uniforms.tScene.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  dispose() {
    this.mat.dispose();
    this.quad.dispose();
    this.tabela.dispose();
  }
}
