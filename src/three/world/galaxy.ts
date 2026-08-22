// ============================================================
// A Via Láctea — modelo 3D galactocêntrico real: bojo + barra,
// 4 braços espirais logarítmicos, regiões HII, halo e poeira.
// O Sol fica na borda interna do braço de Perseu (esporão de
// Órion), a 8,15 kpc do centro — coordenadas reais convertidas
// para o referencial heliocêntrico equatorial da cena local.
// ============================================================
import * as THREE from 'three';
import {
  GALAXY_VERT,
  GALAXY_FRAG,
  GLOW_VERT,
  GLOW_FRAG,
  DISC_VERT,
  DISC_FRAG,
  DISC_BAKE_VERT,
  DISC_BAKED_FRAG,
} from '../shaders/galaxyShaders';
import { GAL, EX, EY, EZ } from './baseGalactica';
import { SGR_DWARF_POS, tune } from './geradorDaGalaxia';
import type { GalaxyBuffers } from './geradorDaGalaxia';

// A FACHADA da onda da arquitetura (corte 5): a base e o gerador
// moram ao lado e são reexportados daqui — o director (Parte 1 da
// onda) segue importando deste endereço; morre quando a Parte 1
// assentar. Os literais das camadas (nodisc/noglow/nogdust) FICAM
// neste arquivo: atlasConfig.test.ts os procura AQUI por texto.
export * from './baseGalactica';
export { buildGalaxy } from './geradorDaGalaxia';
export type { GalaxyBuffers, StructureField } from './geradorDaGalaxia';




export type CartographyMode = 'blend' | 'off' | 'observed';

export class Galaxy {
  readonly group = new THREE.Group();
  private brightMat: THREE.ShaderMaterial;
  private glowMat: THREE.ShaderMaterial; // bojo
  private dwarfMat: THREE.ShaderMaterial; // anã de Sagitário
  private markerMat: THREE.ShaderMaterial; // Sol ("você está aqui")
  private discMats: THREE.ShaderMaterial[] = [];
  private discMeshes: THREE.Mesh[] = [];
  private discBaseAlphas: number[] = [];
  private discRTs: THREE.WebGLRenderTarget[] = [];
  private tauRT: THREE.WebGLRenderTarget | null = null;
  private markerMesh!: THREE.Mesh;
  private dustMap: THREE.Texture;
  private structureMap: THREE.Texture;
  private brightPts!: THREE.Points;
  private glowMesh!: THREE.Mesh;
  private haloMat!: THREE.ShaderMaterial;
  private haloMesh!: THREE.Mesh;
  private haloGain = 0;
  private dwarfMesh!: THREE.Mesh;
  private static scratch = new THREE.Vector3();
  private static dbg = new URLSearchParams(window.location.search);
  // AS TRÊS DA GALÁXIA. A URL só as SEMEIA no boot (ler `has()` por quadro
  // seria lixo evitável); daí em diante quem manda é `setLayerHidden`, e
  // elas são VIVAS — nenhuma é lida no bake. `bakeDiscLayers` roda
  // incondicionalmente, o τRT inclusive; o que estas três governam é
  // `mesh.visible` e o bind de `uTauMap`, reescritos por quadro no
  // `update`. (Até 2026-08-12 três comentários da casa diziam o
  // contrário e cobravam uma recarga por camada.)
  private showGDust = !Galaxy.dbg.has('nogdust');
  private showGlow = !Galaxy.dbg.has('noglow');
  /** ?nodisc=1 — só as partículas, para medir a divisão de fluxo */
  private showDisc = !Galaxy.dbg.has('nodisc');
  /**
   * A 1×1 zerada do `uTauMap` (τ⊥ = 0 ⇒ exp(0) = 1): o valor de REPOUSO
   * do uniform — antes do bake e sempre que a extinção por partícula
   * está desligada. Instância única, e não uma textura nova por troca:
   * o setter alterna entre ELA e o τRT, e uma alocação por clique seria
   * vazamento com cara de conveniência.
   */
  private readonly tauVazio = Galaxy.emptyTauMap();

  /** 1×1 sem cobertura (A=128: warp neutro) — 100% procedural. */
  static emptyDustMap(): THREE.DataTexture {
    const texture = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 128]),
      1,
      1,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    texture.needsUpdate = true;
    return texture;
  }

  private ownsDustMap: boolean;

  constructor(
    buffers: GalaxyBuffers,
    dustMap: THREE.Texture,
    structureMap: THREE.Texture
  ) {
    this.ownsDustMap = !dustMap;
    this.dustMap = dustMap ?? Galaxy.emptyDustMap();
    this.structureMap = structureMap;
    // --- partículas brilhantes (aditivas) ---
    const geo = new THREE.BufferGeometry();
    const bd = buffers.bright;
    const brightBuffer = new THREE.InterleavedBuffer(bd, 8);
    // 122,7 MiB (cinema) ficavam no heap JS DEPOIS do upload, espelhando
    // a VRAM pelo resto do filme. A geometria é estática (nenhum
    // needsUpdate), a boundingSphere é dada à mão logo abaixo e os pontos
    // não são raycast nem frustum-culled: ninguém volta a ler o array.
    // Preço aceito: uma perda de contexto WebGL não reconstrói a galáxia
    // — e o app já não trata perda de contexto em lugar nenhum.
    brightBuffer.onUpload(function (this: THREE.InterleavedBuffer) {
      (this as unknown as { array: Float32Array | null }).array = null;
    });
    geo.setAttribute('position', new THREE.InterleavedBufferAttribute(brightBuffer, 3, 0));
    geo.setAttribute('aColor', new THREE.InterleavedBufferAttribute(brightBuffer, 3, 3));
    geo.setAttribute('aSize', new THREE.InterleavedBufferAttribute(brightBuffer, 1, 6));
    geo.setAttribute('aAlpha', new THREE.InterleavedBufferAttribute(brightBuffer, 1, 7));
    geo.boundingSphere = new THREE.Sphere(GAL.GC_POS.clone(), 40000);

    this.brightMat = new THREE.ShaderMaterial({
      vertexShader: GALAXY_VERT,
      fragmentShader: GALAXY_FRAG,
      uniforms: this.sharedUniforms(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const brightPts = new THREE.Points(geo, this.brightMat);
    brightPts.frustumCulled = false;
    brightPts.renderOrder = 2;
    this.group.add(brightPts);
    this.brightPts = brightPts;

    // --- emissão contínua dos braços em três lâminas 3D ---
    this.createDiscLayers();

    // --- brilho contínuo do bojo ---
    this.glowMat = this.makeGlow(
      new THREE.Vector3(1.0, 0.62, 0.32).multiplyScalar(tune('glowgain', 1)),
      2700,
      0.5
    );
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.glowMat);
    glow.position.copy(GAL.GC_POS);
    glow.frustumCulled = false;
    glow.renderOrder = 3;
    this.group.add(glow);
    this.glowMesh = glow;

    // HALO TÉRMICO (rodada 22): a componente quente EXTENSA que falta às
    // bandas altas — bojo estendido/disco espesso não resolvidos. Sem ele
    // colourZ médio/alto media 0,23/0,42 contra 0,30/0,66 do alvo e
    // axialRatio 0,037 vs 0,060: o glow compacto (2,7 kpc) não alcança.
    // Só na vista externa (uFade sem termo localBand — o interior não
    // ganha névoa) e só de raspão (lei 1/μ do oblato, no update). Varrido
    // na rodada 22: ganho 0,3 × 6000 pc é o joelho (0,2→0,7187,
    // 0,3→0,6743, 0,4→0,705 no edge; face fica na banda de ruído porque
    // de cima o halo some por física). ?halo= e ?halosize= varrem.
    this.haloGain = tune('halo', 0.3);
    this.haloMat = this.makeGlow(
      new THREE.Vector3(1.0, 0.62, 0.32).multiplyScalar(this.haloGain),
      tune('halosize', 6000),
      0.5
    );
    // o halo extenso tem τ0 de fenda próprio: os OMBROS da fenda dele são
    // a maior luz nova junto ao plano (?haloslit= varre; glow fica em 2,5)
    this.haloMat.uniforms.uSlitTau.value = tune('haloslit', 2.5);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.haloMat);
    halo.position.copy(GAL.GC_POS);
    halo.frustumCulled = false;
    halo.renderOrder = 3;
    this.group.add(halo);
    this.haloMesh = halo;

    // --- brilho integrado da galáxia anã de Sagitário --------
    this.dwarfMat = this.makeGlow(
      new THREE.Vector3(0.78, 0.55, 0.38),
      1_150,
      0
    );
    const dwarf = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.dwarfMat);
    dwarf.position.copy(SGR_DWARF_POS);
    dwarf.frustumCulled = false;
    dwarf.renderOrder = 3;
    this.group.add(dwarf);
    this.dwarfMesh = dwarf;

    // --- marcador do Sol ---
    this.markerMat = this.makeGlow(new THREE.Vector3(1.0, 0.9, 0.7), 125, 1);
    const marker = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.markerMat);
    marker.position.set(0, 0, 0);
    marker.frustumCulled = false;
    marker.renderOrder = 6;
    this.group.add(marker);
    this.markerMesh = marker;
  }

  // O teto de tamanho NÃO entra mais por aqui: era `uMaxPx`, uniform de um
  // valor só (20 px), e desde o M5 ele é o teto da lei de tela (`estrela.ts`).
  private sharedUniforms() {
    return {
      uCamPos: { value: new THREE.Vector3() },
      uScreenH: { value: 1080 },
      uTanHalfFov: { value: 0.55 },
      uFade: { value: 0 },
      // extinção por partícula: canal A da lâmina central bakeada. Nasce
      // com a 1×1 A=0 (extinção nula) — o app funciona antes do bake, e
      // é para ela que `?nogdust=1` (ou o clique no painel) volta.
      uTauMap: { value: this.tauVazio },
      uEX: { value: EX.clone() },
      uEY: { value: EY.clone() },
      uEZ: { value: EZ.clone() },
      uGC: { value: GAL.GC_POS.clone() },
    };
  }

  /** 1×1 RGBA zerada — τ⊥ = 0 ⇒ exp(0) = 1: sem extinção até o bake. */
  private static emptyTauMap() {
    const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
    t.needsUpdate = true;
    return t;
  }

  private makeGlow(color: THREE.Vector3, size: number, pulse: number) {
    return new THREE.ShaderMaterial({
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      uniforms: {
        uColor: { value: color },
        uSize: { value: size },
        uTime: { value: 0 },
        uFade: { value: 0 },
        uPulse: { value: pulse },
        uEZ: { value: EZ.clone() },
        uLaneGate: { value: 0 },
        uSlitTau: { value: 2.5 },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
  }

  private createDiscLayers() {
    const root = new THREE.Group();
    const basis = new THREE.Matrix4().makeBasis(EX, EY, EZ);
    root.position.copy(GAL.GC_POS);
    root.quaternion.setFromRotationMatrix(basis);

    // Subdivisões são necessárias para que o vertex shader curve a
    // lâmina no warp — 72² resolve o warp (feições de ~4 kpc) com
    // 1/4 dos vértices de 144².
    const geometry = new THREE.PlaneGeometry(2, 2, 72, 72);
    const layers: Array<[number, number, number]> = [
      [-340, 0.1, 2.1],
      [-190, 0.22, 3.7],
      [-75, 0.4, 7.9],
      [0, 0.64, 11.3],
      [85, 0.35, 17.7],
      [205, 0.2, 23.9],
      [380, 0.08, 31.1],
    ];
    for (const [height, alpha, seed] of layers) {
      const material = new THREE.ShaderMaterial({
        vertexShader: DISC_VERT,
        fragmentShader: DISC_FRAG,
        uniforms: {
          uFade: { value: 0 },
          uSeed: { value: seed },
          uLayerAlpha: { value: alpha },
          uDiskRadius: { value: GAL.DISK_RADIUS },
          uDustMap: { value: this.dustMap },
          uStructureMap: { value: this.structureMap },
          uCartBlend: { value: 1 },
          uInferenceGain: { value: 0.55 },
          uBackgroundGain: { value: 1 },
          uTauExport: { value: 0 },
          // fenda observada pesada pela altura da lâmina: a poeira é FINA
          // (mesma escala 220 pc do colapso do dust map). Sem o peso, as 7
          // cópias da mesma fenda viravam trem de manchas fora do eixo (o
          // retículo diagonal da rodada 29). ?lanethin=0 desliga, =pc varre.
          uLayerHeight: { value: height },
          uLaneThin: { value: tune('lanethin', 220) },
        },
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        transparent: true,
        // sem isto o hemisfério sul da galáxia não existe: vista por
        // baixo, cada lâmina era descartada por backface culling
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = height;
      mesh.scale.set(GAL.DISK_RADIUS, GAL.DISK_RADIUS, 1);
      mesh.renderOrder = 1;
      root.add(mesh);
      this.discMats.push(material);
      this.discMeshes.push(mesh);
      this.discBaseAlphas.push(alpha);
    }
    this.group.add(root);
  }

  /**
   * off: só procedural · blend: observado condiciona o procedural ·
   * observed: realça o medido dimando a emissão inferida (debug A/B).
   * Chamar ANTES de bakeDiscLayers — o modo é congelado no bake.
   */
  setCartography(mode: CartographyMode) {
    this.discMats.forEach((material, index) => {
      if (material.uniforms.uCartBlend) {
        material.uniforms.uCartBlend.value = mode === 'off' ? 0 : 1;
      }
      if (material.uniforms.uInferenceGain) {
        material.uniforms.uInferenceGain.value =
          mode === 'observed' ? 0.12 : 0.55;
      }
      if (material.uniforms.uBackgroundGain) {
        material.uniforms.uBackgroundGain.value =
          mode === 'observed' ? 0.24 : 1;
      }
      material.uniforms.uLayerAlpha.value = this.discBaseAlphas[index];
    });
  }

  /**
   * Congela cada lâmina do disco numa textura 1024² (33 pc/texel —
   * acima da frequência útil do FBM). O conteúdo é 100% estático:
   * por frame sobra um fetch × uLayerAlpha × uFade, em vez de
   * 2×fbm2(5 oitavas) + 10 galArm por fragmento × 7 lâminas
   * (~400 M hash/frame no Ato III).
   *
   * FATIÁVEL POR LÂMINA (Ajustes C do NORTE). São OITO render targets de
   * 1024² com o fragmento analítico inteiro dentro, e num bloco só isso
   * é a maior tarefa longa que sobrou na thread depois que a carga foi
   * para o worker. `respirar` é o fôlego ENTRE lâminas: no boot ele deixa
   * o rótulo do loader pintar; na troca de tier viva ele é o que impede o
   * mundo novo de engasgar o mundo velho, que segue desenhando a 60 Hz
   * enquanto isto assa fora da cena.
   *
   * Devolve `false` quando o fôlego disse para PARAR (`respirar` devolveu
   * `false`): a troca foi cancelada ou o Director morreu no meio, e o
   * corpo meio assado é do chamador — `dispose()` sabe descartar as
   * lâminas já congeladas e as que ainda são analíticas.
   *
   * Sem `respirar` a função é SÍNCRONA de ponta a ponta (nenhum `await`
   * executa): é o caminho do fallback e o que mantém o custo do bake
   * igual ao de sempre para quem não quer fatiar.
   */
  async bakeDiscLayers(
    renderer: THREE.WebGLRenderer,
    respirar?: () => Promise<boolean>
  ): Promise<boolean> {
    const bakeScene = new THREE.Scene();
    const bakeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    quad.frustumCulled = false;
    bakeScene.add(quad);
    const prev = renderer.getRenderTarget();

    for (let i = 0; i < this.discMats.length; i++) {
      const analytic = this.discMats[i];
      const savedFade = analytic.uniforms.uFade.value as number;
      const savedAlpha = analytic.uniforms.uLayerAlpha.value as number;
      analytic.uniforms.uFade.value = 1;
      analytic.uniforms.uLayerAlpha.value = 1;

      const bakeMat = new THREE.ShaderMaterial({
        vertexShader: DISC_BAKE_VERT,
        fragmentShader: DISC_FRAG,
        uniforms: analytic.uniforms, // mesmas refs (uDustMap, uSeed…)
      });
      quad.material = bakeMat;

      const rt = new THREE.WebGLRenderTarget(1024, 1024, {
        type: THREE.HalfFloatType,
        depthBuffer: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      });
      renderer.setRenderTarget(rt);
      renderer.render(bakeScene, bakeCam);
      // 8º bake: o mesmo fragmento com uTauExport=1 grava no alpha o τ
      // das PARTÍCULAS (crista suavizada + termo largo) — o mapa que a
      // extinção por partícula usa. Só a lâmina central precisa dele.
      if (i === 3) {
        analytic.uniforms.uTauExport.value = 1;
        const tauRt = new THREE.WebGLRenderTarget(1024, 1024, {
          type: THREE.HalfFloatType,
          depthBuffer: false,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
        });
        renderer.setRenderTarget(tauRt);
        renderer.render(bakeScene, bakeCam);
        analytic.uniforms.uTauExport.value = 0;
        this.tauRT = tauRt;
      }
      bakeMat.dispose();
      analytic.uniforms.uFade.value = savedFade;
      analytic.uniforms.uLayerAlpha.value = savedAlpha;

      const baked = new THREE.ShaderMaterial({
        vertexShader: DISC_VERT,
        fragmentShader: DISC_BAKED_FRAG,
        uniforms: {
          uBaked: { value: rt.texture },
          uFade: { value: savedFade },
          uLayerAlpha: { value: savedAlpha },
          uDiskRadius: { value: GAL.DISK_RADIUS },
          uMu: { value: 1 },
        },
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        transparent: true,
        side: THREE.DoubleSide,
      });
      this.discMeshes[i].material = baked;
      analytic.dispose();
      this.discMats[i] = baked;
      this.discRTs.push(rt);

      // o fôlego vai ENTRE lâminas, com o alvo de render já devolvido:
      // quem desenhar no intervalo (o mundo velho, na troca viva)
      // encontra o renderer como o deixou
      if (respirar) {
        renderer.setRenderTarget(prev);
        if (!(await respirar())) {
          quad.geometry.dispose();
          return false;
        }
      }
    }

    quad.geometry.dispose();
    renderer.setRenderTarget(prev);

    // O 8º bake (uTauExport=1) fornece o τ⊥ das partículas — ele é
    // assado SEMPRE, esteja a camada ligada ou não. Quem decide o que o
    // uniform enxerga é o bind, e ele tem um dono só.
    this.ligarTauMap();
    return true;
  }

  /** o bind do τ⊥ num lugar só: o mapa assado ou a 1×1 de repouso. */
  private ligarTauMap() {
    this.brightMat.uniforms.uTauMap.value =
      this.showGDust && this.tauRT ? this.tauRT.texture : this.tauVazio;
  }

  /**
   * TROCA AO VIVO uma das três camadas da galáxia. Elas são as que o
   * painel marcava com ↻ por um motivo que nunca existiu: nada aqui é
   * lido no bake (ver o comentário das flags, acima). Desligar é
   * `mesh.visible = false` no quadro seguinte e, no caso da extinção por
   * partícula, o uniform voltando à 1×1 zerada.
   *
   * Devolve `true` quando a flag é desta casa — é assim que o Director
   * roteia sem repetir a lista.
   *
   * O QUE ELA NÃO ALCANÇA, dito: `?forgetau=1` entrega o MESMO τ⊥ às
   * forjas, e esse bind é feito uma vez no `init` (director.ts). A porta
   * segue sendo decisão de boot (varredura de dosagem), então trocar
   * `nogdust` ao vivo com ela ligada deixa as forjas com o mapa que
   * pegaram no carregamento.
   */
  setLayerHidden(flag: string, hidden: boolean): boolean {
    if (flag === 'nodisc') this.showDisc = !hidden;
    else if (flag === 'noglow') this.showGlow = !hidden;
    else if (flag === 'nogdust') {
      this.showGDust = !hidden;
      this.ligarTauMap();
    } else return false;
    return true;
  }

  /** τ⊥ da coluna, para quem mais precisar da mesma extinção (forges). */
  get tauMapTexture(): THREE.Texture | null {
    return this.showGDust && this.tauRT ? this.tauRT.texture : null;
  }

  /**
   * externalFade revela a galáxia vista de fora; localBandFade reutiliza
   * somente suas partículas e poeira quando a câmera ainda está dentro
   * do disco. Assim a faixa celeste é geometria 3D real, nunca um skybox.
   */
  update(
    camPos: THREE.Vector3,
    screenH: number,
    tanHalfFov: number,
    time: number,
    externalFade: number,
    markerFade: number,
    localBandFade: number
  ) {
    this.group.visible =
      externalFade > 0.001 || markerFade > 0.001 || localBandFade > 0.001;
    if (!this.group.visible) return;

    // SOMA, não max. As duas rampas são complementares por construção
    // (director: externalFade = 1 − env, localBandFade = 0,76·env), e
    // max() de rampas complementares tem um MÍNIMO no meio: em env=0,568
    // as duas valem 0,432 e a galáxia escurecia 43% no meio da travessia
    // do envelope, para clarear de novo depois. A soma dá 1 − 0,24·env:
    // monotônica, com os dois extremos idênticos ao que já estava
    // calibrado (env=0 → 1, env=1 → 0,76).
    const brightFade = externalFade + localBandFade;
    // A extinção das lâminas só apaga a luz da PRÓPRIA lâmina (blend
    // aditivo) — nunca chega às faixas escuras do alvo. Quem carrega as
    // fendas agora é a extinção POR PARTÍCULA no vértice (uTauMap) — o
    // herdeiro dos 430 k sprites multiplicativos que moravam aqui.
    // openness: 1 = de cima, 0 = no plano.
    const toCam = Galaxy.scratch.copy(camPos).sub(GAL.GC_POS);
    const openness = Math.abs(toCam.dot(EZ)) / Math.max(toCam.length(), 1);
    // Sete planos achatados descrevem o disco visto de CIMA. De raspão
    // eles viram sete listras horizontais; ali quem tem estrutura em z
    // são as partículas. Cede entre ~3° e ~17° acima do plano — só o
    // suficiente para as listras ficarem abaixo do granulado.
    const discFade =
      externalFade * THREE.MathUtils.smoothstep(openness, 0.05, 0.30);
    {
      const u = this.brightMat.uniforms;
      (u.uCamPos.value as THREE.Vector3).copy(camPos);
      u.uScreenH.value = screenH;
      u.uTanHalfFov.value = tanHalfFov;
      u.uFade.value = brightFade;
    }
    // As lâminas contínuas só entram na vista externa. De dentro
    // seriam planos infinitos; a faixa local vem das partículas 3D.
    // Com fade 0 os meshes ficam invisíveis: cada lâmina de 33,6 kpc
    // custa milhões de fragmentos de FBM que somariam exatamente zero.
    const discVisible = discFade > 0.001 && this.showDisc;
    for (const material of this.discMats) {
      material.uniforms.uFade.value = discFade;
      // openness É o μ da coluna: |cos| entre a visada e a normal do disco.
      // Já estava calculado aqui para o ganho da poeira; a lâmina agora usa
      // o mesmo número para o comprimento de caminho, sem termo novo.
      if (material.uniforms.uMu) material.uniforms.uMu.value = openness;
    }
    for (const mesh of this.discMeshes) {
      mesh.visible = discVisible;
    }
    this.markerMesh.visible = markerFade > 0.001;
    // o brilho contínuo do bojo só aparece de longe — perto ele
    // cobriria a tela inteira de branco
    const dGC = camPos.distanceTo(GAL.GC_POS);
    const glowGate = THREE.MathUtils.smoothstep(dGC, 5000, 13000);
    this.glowMat.uniforms.uTime.value = time;
    this.glowMat.uniforms.uFade.value =
      externalFade * glowGate * 0.32 + localBandFade * 0.11;
    // a fenda no bojo abre exatamente onde as lâminas fecham (vista
    // rasante) — mesma rampa do discFade, invertida
    this.glowMat.uniforms.uLaneGate.value =
      1 - THREE.MathUtils.smoothstep(openness, 0.05, 0.3);
    this.haloMat.uniforms.uTime.value = time;
    // lei de caminho do oblato: a coluna pelo disco espesso é ∝1/μ — de
    // cima ela é curta e o halo some (senão vira bolha central face-on,
    // medido: face 0,0467→0,0573); de raspão é quilo-parsecs e ele É a
    // luz quente das bandas altas. Mesma rampa da fenda/lâminas.
    const grazing = 1 - THREE.MathUtils.smoothstep(openness, 0.05, 0.3);
    this.haloMat.uniforms.uFade.value =
      externalFade * glowGate * 0.32 * grazing;
    this.haloMat.uniforms.uLaneGate.value =
      this.glowMat.uniforms.uLaneGate.value;
    this.dwarfMat.uniforms.uTime.value = time;
    this.dwarfMat.uniforms.uFade.value = externalFade * 0.11;
    this.markerMat.uniforms.uTime.value = time;
    this.markerMat.uniforms.uFade.value = markerFade;
    // Gate de visibilidade em TODA camada cujo uFade multiplica a saída
    // linearmente (blend aditivo de zero é no-op). O glow segue vivo por
    // dentro do disco — tem termo próprio de localBandFade; halo e anã
    // não, e sem gate desenhavam um billboard quase de tela cheia
    // somando exatamente zero durante toda a viagem interna.
    this.brightPts.visible = brightFade > 0.001;
    this.glowMesh.visible =
      this.showGlow && (this.glowMat.uniforms.uFade.value as number) > 0.001;
    this.haloMesh.visible =
      this.showGlow &&
      this.haloGain > 0 &&
      (this.haloMat.uniforms.uFade.value as number) > 0.001;
    this.dwarfMesh.visible =
      this.showGlow && (this.dwarfMat.uniforms.uFade.value as number) > 0.001;
  }

  dispose() {
    this.brightMat.dispose();
    this.glowMat.dispose();
    this.haloMat.dispose();
    this.dwarfMat.dispose();
    this.markerMat.dispose();
    this.discMats.forEach((material) => material.dispose());
    this.discRTs.forEach((rt) => rt.dispose());
    this.tauRT?.dispose();
    this.tauVazio.dispose();
    if (this.ownsDustMap) this.dustMap.dispose();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) o.geometry.dispose();
    });
  }
}
