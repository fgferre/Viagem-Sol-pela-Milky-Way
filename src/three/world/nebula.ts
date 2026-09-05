// ============================================================
// Nebulosa volumétrica — raymarching em render target de meia
// resolução, composta como fundo HDR da cena principal.
// ============================================================
import * as THREE from 'three';
import {
  NEBULA_VERT,
  NEBULA_FRAG,
  nebulaLutFrag,
  NEBULA_BLUR_FRAG,
} from '../shaders/nebulaShaders';
import { makeBlueNoiseTexture } from './blueNoise';
import { SEGMENTOS_DA_FOTOSFERA_NO_PIOR_TIER } from './stellarBody';

// Luzes embutidas no gás — posições reais do catálogo HYG (pc)
const BETELGEUSE = new THREE.Vector3(3.189, 151.364, 19.682); // supergigante vermelha
const RIGEL = new THREE.Vector3(51.601, 256.71, -37.74); // supergigante azul

/**
 * O TETO de `?nebsteps=`, que existia como `Math.min(v, 96)` cru. Mesmo
 * molde do lado da galáxia (`TETO_DE_AMOSTRAS`/`amostrasDaExtincao` em
 * `shaders/galaxyShaders.ts`): passo de varredura que o visitante escreve
 * na URL tem piso E teto, e o clamp é peça nomeada.
 *
 * NÃO É UM ENDEREÇO SÓ com o da galáxia, pela decisão de 4c645b6: 96 passos
 * de raymarch e 96 amostras de coluna de extinção são grandezas diferentes
 * que hoje calham de aceitar o mesmo número. Amarrá-las faria mexer no teto
 * de uma mudar o da outra em silêncio. O que se compartilha é a régua.
 */
const TETO_DE_PASSOS_DA_NEBULOSA = 96;

/** piso 1 (0 = ausente, e aí manda o preset), teto 96, inteiro. */
const passosDoRaymarch = (bruto: number) =>
  Number.isFinite(bruto) && bruto > 0 ? Math.min(bruto, TETO_DE_PASSOS_DA_NEBULOSA) : 0;

/**
 * Segmentos da esfera da fotosfera no PIOR tier — a contagem que
 * `sunCone` usa para achar o polígono INSCRITO da silhueta.
 *
 * DIFERENTE das duas grandezas da nota acima: aquelas CALHAM de valer 96
 * e por isso não se amarram; esta É o `TIERS.low.seg` do
 * `world/stellarBody.ts`, o mesmo número pelo mesmo motivo, e agora vem
 * de lá. Era um 96 redigitado — o dia em que o tier baixasse, o oclusor
 * encolheria o raio de menos e apagaria pixel visível sem avisar.
 */
const SEGMENTOS_DA_FOTOSFERA = SEGMENTOS_DA_FOTOSFERA_NO_PIOR_TIER;

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
  /**
   * O QUADRO CONGELADO (item 144). O raymarch não tem uniform de tempo:
   * com a mesma câmera e os mesmos uniforms ele produz o MESMO pixel —
   * e até 03/09 produzia a 60 Hz, 25–30% do quadro no Atlas parado
   * (medido no M1 dele, `capturas/desempenho-m1-03-09.txt`). `sujo` é
   * levantado por todo setter que muda um uniform de verdade; a chave
   * da câmera é comparada em `render`. A chave NÃO é a matriz de mundo:
   * a câmera do filme parado treme nos últimos dígitos do double a cada
   * quadro (52 raymarches em 2,5 s com o filme pausado, medido em 05/09)
   * e a matriz nunca repetia. A chave é o que a GPU RECEBE — os uniforms
   * de câmera e do cone do Sol, já arredondados a float32 pelo
   * `Float32Array`. Iguais os dois, o `rtBlur` do quadro anterior
   * continua sendo o céu.
   */
  private sujo = true;
  private chaveDaCamera = new Float32Array(18);
  private ultimaChave = new Float32Array(18).fill(Number.NaN);
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
      fragmentShader: nebulaLutFrag(null),
      uniforms: {
        uCamPos: { value: new THREE.Vector3() },
        uDustMap: { value: this.fallbackDustMap },
        uCartBlend: { value: 0 },
        uCatFade: { value: 0 },
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
        uSunDir: { value: new THREE.Vector3(0, 0, 1) },
        uSunCos: { value: 2 },
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
    this.sujo = true;
  }

  /** alavanca do auto-quality sobre o custo do raymarch (~2× extra) */
  setScale(s: number) {
    if (s === this.scale) return;
    this.scale = s;
    this.setSize(this.lastW, this.lastH);
  }

  /**
   * ?nebsteps= força o número de passos, ignorando o preset. Existe porque
   * `uSteps` é a única alavanca linear medida do raymarch (o maior item do
   * quadro, 58%) e sem ele a única ablação possível era trocar de preset —
   * que muda passos, `setScale` e `populationScale` de uma vez. Ausente, o
   * caminho é o do preset, byte por byte: as capturas não passam por aqui.
   */
  private stepsOverride = (() => {
    if (typeof window === 'undefined') return 0;
    const v = parseInt(new URLSearchParams(window.location.search).get('nebsteps') ?? '', 10);
    return passosDoRaymarch(v);
  })();

  setSteps(n: number) {
    const passos = this.stepsOverride || n;
    if (this.material.uniforms.uSteps.value === passos) return;
    this.material.uniforms.uSteps.value = passos;
    this.sujo = true;
  }

  /** raymarch, LUT e blur, para a pré-compilação sob o véu (director.init) */
  get warmupMaterials(): THREE.Material[] {
    return [this.material, this.lutMaterial, this.blurMaterial];
  }

  setFade(f: number) {
    if (this.material.uniforms.uFade.value === f) return;
    this.material.uniforms.uFade.value = f;
    this.sujo = true;
  }

  /**
   * A curva medida do catálogo (ver `resolvedCatalogCurve`). Recompila o
   * fragment do LUT UMA vez, no init: a curva só existe depois que o
   * binário chega, e a Nebula nasce antes. É de propósito antes do
   * warm-up de shaders do director, para a variante final ser a que ele
   * pré-compila — senão o primeiro uso cairia no meio do filme, que é o
   * hitch que o warm-up existe para evitar.
   */
  setResolvedCurve(curva: Parameters<typeof nebulaLutFrag>[0]) {
    this.lutMaterial.fragmentShader = nebulaLutFrag(curva);
    this.lutMaterial.needsUpdate = true;
    this.lutDirty = true;
  }

  /**
   * O quanto do catálogo está visível: o mesmo `catFade` das cascas —
   * zero fora da bolha heliocêntrica e zero com `?nocat=1`, para a
   * ablação tirar as estrelas sem abrir um buraco no lugar delas.
   * Suja a LUT só quando muda de verdade.
   */
  setCatalogueFade(fade: number) {
    if (this.lutMaterial.uniforms.uCatFade.value === fade) return;
    this.lutMaterial.uniforms.uCatFade.value = fade;
    this.lutDirty = true;
  }

  /**
   * A CÂMERA TELETRANSPORTOU — recalcule a LUT no quadro que vem.
   *
   * O reuso da LUT tolera 2 pc de deriva porque foi desenhado para
   * movimento CONTÍNUO: a 2 pc de distância a integração por direção
   * mal muda, e são 786k integrações economizadas por quadro parado.
   * Um salto de câmera quebra a premissa de outro jeito — a câmera pode
   * cair a menos de 2 pc de onde a LUT foi calculada vindo de um lugar
   * completamente diferente, e aí a vista herda a LUT do lugar ANTIGO.
   * Medido (Onda 5): entrar no Atlas a partir de t=10 (câmera ainda
   * dentro dos 2 pc de casa) e a partir de t=250 (a 20 kpc) devolvia a
   * MESMA vista com 29 pixels de 1 nível de diferença — a primeira
   * reusando a LUT do trajeto, a segunda recalculando. Quem salta,
   * avisa; o custo é um recálculo da LUT no salto.
   */
  invalidarLut() {
    this.lutDirty = true;
  }

  /** liga o mapa galactocêntrico (APOGEE + braços/warp bakeados) */
  setDustMap(map: THREE.Texture | null, blend = 1) {
    const texture = map ?? this.fallbackDustMap;
    this.material.uniforms.uDustMap.value = texture;
    this.lutMaterial.uniforms.uDustMap.value = texture;
    this.lutMaterial.uniforms.uCartBlend.value = map ? blend : 0;
    this.lutDirty = true;
    this.sujo = true;
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
    // as sementes chegam a cada 0,25 s (nuvensSemente.tique) com a câmera
    // parada ou não: só o que MUDOU suja o quadro congelado
    let mudou = u.uSeedCloudCount.value !== n;
    for (let i = 0; i < n; i++) {
      const o = i * 5;
      const p = positions[i];
      if (
        p.x !== entries[o] || p.y !== entries[o + 1] || p.z !== entries[o + 2] ||
        p.w !== entries[o + 3] || amps[i] !== entries[o + 4]
      ) {
        p.set(entries[o], entries[o + 1], entries[o + 2], entries[o + 3]);
        amps[i] = entries[o + 4];
        mudou = true;
      }
    }
    u.uSeedCloudCount.value = n;
    if (mudou) this.sujo = true;
  }

  /** cavidade do observador itinerante (0 = desligada, perto do Sol) */
  setCavity(pos: THREE.Vector3, gate: number) {
    const p = this.material.uniforms.uCavityPos.value as THREE.Vector3;
    if (p.equals(pos) && this.material.uniforms.uCavityGate.value === gate) return;
    p.copy(pos);
    this.material.uniforms.uCavityGate.value = gate;
    this.sujo = true;
  }

  private occluderPos = new THREE.Vector3();
  private occluderR = 0;

  /**
   * A fotosfera, que é opaca e tapa o fundo. `raio = 0` desliga (é o que o
   * director manda quando o grupo do Sol some ou ?nosun está ligado).
   */
  setSunOccluder(pos: THREE.Vector3, raio: number) {
    if (this.occluderPos.equals(pos) && this.occluderR === raio) return;
    this.occluderPos.copy(pos);
    this.occluderR = raio;
    this.sujo = true;
  }

  /**
   * Cosseno do meio-ângulo SEGURO do cone da fotosfera. Três encolhimentos, e
   * o do meio é o que morde:
   *  - a malha é uma esfera TESSELADA, cuja silhueta é o polígono INSCRITO, não
   *    o círculo: raio efetivo R·cos(π/N). Usa-se o pior tier
   *    (N = `SEGMENTOS_DA_FOTOSFERA`), porque errar para menos aqui só custa
   *    GPU e errar para mais apaga pixel visível;
   *  - entre o raymarch e o consumo há um blur de 4 taps a ±meio-texel E o
   *    upsample linear do RT de meia-res: os dois ESPALHAM o preto para fora do
   *    disco. É o encolhimento grande, e é em texel do RT, não em raio;
   *  - uma folga final de 1 texel, porque a conversão texel→ângulo é de ângulo
   *    pequeno e o Sol de perto não é ângulo pequeno.
   */
  private sunCone(camera: THREE.PerspectiveCamera): number {
    if (this.occluderR <= 0) return 2;
    const d = this.occluderPos.distanceTo(camera.position);
    // câmera dentro (ou quase) da esfera: não há cone, e a fotosfera nem cobre
    // a tela toda de forma previsível
    if (d <= this.occluderR * 1.02) return 2;
    const rMalha = this.occluderR * Math.cos(Math.PI / SEGMENTOS_DA_FOTOSFERA);
    const theta = Math.asin(Math.min(rMalha / d, 1));
    const texel = (2 * (this.material.uniforms.uTanHalfFov.value as number)) / this.rt.height;
    const seguro = theta - 3 * texel;
    if (seguro <= 0) return 2;
    (this.material.uniforms.uSunDir.value as THREE.Vector3)
      .copy(this.occluderPos)
      .sub(camera.position)
      .normalize();
    return Math.cos(seguro);
  }

  /**
   * Os uniforms de câmera desta chamada, como a GPU os recebe (float32),
   * são os da anterior? Chamar DEPOIS de escrevê-los nos uniforms.
   */
  private cameraParada(): boolean {
    const u = this.material.uniforms;
    const k = this.chaveDaCamera;
    (u.uCamPos.value as THREE.Vector3).toArray(k, 0);
    (u.uCamFwd.value as THREE.Vector3).toArray(k, 3);
    (u.uCamRight.value as THREE.Vector3).toArray(k, 6);
    (u.uCamUp.value as THREE.Vector3).toArray(k, 9);
    k[12] = u.uTanHalfFov.value as number;
    k[13] = u.uAspect.value as number;
    k[14] = u.uSunCos.value as number;
    (u.uSunDir.value as THREE.Vector3).toArray(k, 15);
    const antes = this.ultimaChave;
    let igual = true;
    for (let i = 0; i < 18; i++) {
      if (k[i] !== antes[i]) {
        igual = false;
        break;
      }
    }
    if (!igual) antes.set(k);
    return igual;
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
    // depois do tanHalfFov: sunCone lê o uniform para converter texel em ângulo
    u.uSunCos.value = this.sunCone(camera);
    // o quadro congelado: mesma câmera, mesmos uniforms, mesma LUT — o
    // céu de antes continua valendo, e o raymarch inteiro fica parado
    if (this.cameraParada() && !this.sujo && !this.lutDirty) return;
    this.sujo = false;
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
