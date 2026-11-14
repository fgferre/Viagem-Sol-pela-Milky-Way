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
  TAU_COMPACTO_FRAG,
} from '../shaders/galaxyShaders';
import { GAL, EX, EY, EZ } from './baseGalactica';
import { GALACTIC_MODEL } from '../cartography/galacticModel';
import {
  SGR_DWARF_POS,
  tune,
  celulaDaParticula,
  CELULAS_DA_GRADE,
  ladoDaChave,
  LADO_DO_TAU_DAS_NUVENS,
  tauDasNuvensEmMeia,
} from './geradorDaGalaxia';
import { porCurva } from '../core/engine';
import type { CaminhoDaGalaxia } from '../core/engine';
import { CamadaWebgpu } from './galaxiaWebgpu/camadaWebgpu';
import type { GalaxyBuffers } from './geradorDaGalaxia';
import { controleDoLaboratorio, opcoesWebgpu, LABORATORIO_PADRAO } from './laboratorioDaGalaxia';
import type { Laboratorio } from './laboratorioDaGalaxia';

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
  /** a cópia compacta (R16F) do τ⊥ que o laço das partículas lê — ver TAU_COMPACTO_FRAG */
  private tauParticulasRT: THREE.WebGLRenderTarget | null = null;
  /** ?galaxia=particulas: o τ⊥ somado das NUVENS de poeira (R16F, mesma
   *  convenção do τ pintado) — no lugar do 8º bake, que não roda */
  private tauNuvens: THREE.DataTexture | null = null;
  /** o τ⊥ das nuvens vindo da carga, até virar `tauNuvens` no bake */
  private nuvensEmMeia: Uint16Array | null;
  /** o mesmo τ das nuvens no canal A, que é onde as forjas o leem (?forgetau=1) */
  private tauNuvensRGBA: THREE.DataTexture | null = null;
  private markerMesh!: THREE.Mesh;
  private dustMap: THREE.Texture;
  private structureMap: THREE.Texture;
  private brightPts!: THREE.Points;
  /** total de registros no buffer intercalado — o teto do `drawRange`. */
  private totalParticulas = 0;
  /**
   * A FRAÇÃO AO VIVO das partículas desenhadas (item 149) — `1` desenha
   * tudo. O buffer foi embaralhado UMA VEZ no fim de `buildGalaxy` (ver o
   * comentário lá): um prefixo de qualquer tamanho já é amostra uniforme
   * de TODAS as populações, e por isso cortar em `drawRange` não escolhe
   * disco OU bojo — escolhe menos de cada um, na mesma proporção.
   */
  private fracaoDeParticulas = 1;
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
  /** ?nopts=1 — sem as partículas, a quarta régua da divisão de fluxo */
  private showPts = !Galaxy.dbg.has('nopts');
  /**
   * ?galaxia=particulas (ensaio, desligado por padrão) — a galáxia vista de
   * fora só de partículas: as sete lâminas não acendem e a luz que a
   * EMISSÃO delas entregava passa para os pontos, pela rampa de FORA
   * (`externalFade`), então dentro do disco nada muda. Sem a rampa de
   * abertura das lâminas: elas não tinham lei de caminho e precisavam
   * apagar de raspão; uma distribuição 3D clareia de perfil sozinha.
   * O ganho é a razão de
   * fluxo lâminas÷partículas medida em linear (o grupo da galáxia rendido
   * num alvo float, sem curva nem bloom, uma camada por vez, as duas com
   * uFade 1) na vista de cima a ~38 kpc. Com a lei de fluxo única do
   * núcleo de densidade (GALAXY_VERT) o ganho é 6,99 no quadro inteiro, e
   * o brilho de superfície das partículas num MESMO pedaço do disco não
   * depende mais da distância (medido de 3 a 40 kpc). O quadro de perto
   * ainda sai mais escuro que o das lâminas porque elas usam um μ só (o
   * da câmera ao centro) em todo fragmento: debaixo da câmera, de 3 kpc,
   * isso as deixava ~2,6× mais claras que o μ local daria.
   */
  private readonly soParticulas: boolean;
  /**
   * O motor WebGPU — o modo só-partículas com a vista de FORA desenhada
   * por ele (camadaWebgpu.ts: 16 M de partículas sorteadas em vez de 4 M
   * com filhas). De dentro do disco, e em navegador sem WebGPU, segue o
   * caminho WebGL acima. `null` até o motor ficar pronto (e de novo se
   * ele cair: a luz volta ao WebGL no mesmo quadro).
   */
  private camadaWebgpu: CamadaWebgpu | null = null;
  /** a camada foi pedida e ainda não chegou (nem desistiu) */
  private webgpuEmVoo = false;
  /** a fração da luz das partículas que cabe à camada WebGPU, do último `update` */
  private cessao = 0;
  /** a lei de longe é toda da camada WebGPU neste quadro: o WebGL só desenha a de perto */
  private longeNoWebgpu = false;
  /** quem acompanha a troca do caminho que desenha (Director → painel e selo) */
  aoMudarCaminho: (() => void) | null = null;
  private descartada = false;
  private static readonly GANHO_DAS_LAMINAS = 6.99;
  /** a luz da lei de longe que o WebGL entregava na saída do filme, sob o
   *  teto de instâncias, em fração da que a camada WebGPU entrega (A CESSÃO) */
  private static readonly LUZ_DO_WEBGL_NA_SAIDA = 0.85;
  /**
   * Largura do núcleo das partículas de FUNDO em ESPAÇAMENTOS médios
   * entre partículas (ver GALAXY_VERT): o mínimo para as vizinhas se
   * encostarem — 24 borrava a imagem inteira. O espaçamento sai da contagem
   * desenhada: o gerador sorteia o disco com Σ ∝ e^(−R/a), a = 3·Rd,
   * truncado no raio do disco, então Σ₀ = N / (2π a² Z) com
   * Z = 1 − (1 + x)e^(−x), x = R_disco/a — e o espaçamento é 1/√Σ₀.
   */
  private static readonly NUCLEO_EM_ESPACAMENTOS = 1.5;
  /**
   * NÍVEL DE DETALHE POR CÉLULA (só ?galaxia=particulas). O buffer vem
   * ordenado por célula do plano (`celulaDaParticula`), embaralhado dentro
   * de cada uma, com as tipos 3–6 num intervalo global no fim. Cada célula
   * é UM desenho instanciado de uma única chamada multi-draw (fallback:
   * um drawArraysInstanced por célula visível). Quem decide, partícula a
   * partícula, é o vértice (GALAXY_VERT): com a densidade disponível na
   * tela ρd = Σ·(d/f)²/proj e o alvo ρ, m = ρ/ρd; m < 1 desenha o prefixo
   * da célula com o brilho ÷ m, m > 1 desdobra a partícula em até KMAX
   * filhas com o brilho ÷ m — as duas com a última peça fracionária, então
   * nada estala. Aqui a CPU só dá a cada célula o PIOR caso (o maior
   * prefixo e o maior K que alguma partícula dela pode pedir) e corta as
   * células fora do frustum.
   * ρ = 12 partículas por pixel do buffer (medido, ensaio 5): a tenda de
   * 2 px com pesos iguais daria grão (2/3)/√ρ, mas a dispersão do brilho
   * entre partículas (tamanho² e luz sorteados) dobra a variância — o grão
   * 0,27 da vista de cima do ensaio 4 era ρ ≈ 20. Com 6 a vista de cima
   * piorava para 0,38 e a meia distância não mudava; 12 é o meio-termo de
   * custo. KMAX = 8: 16 não baixa o grão medido (a tenda alarga o que falta
   * no teto) e custa ~25 % a mais de quadro a meia distância; 4 já deixa
   * borrões no primeiro plano. O laboratório da galáxia (Ajustes,
   * `?lodrho=`, `?lodk=`) muda os dois ao vivo (`definirLaboratorio`).
   */
  private rhoLod = controleDoLaboratorio('lodrho').padrao!;
  private kmaxLod = controleDoLaboratorio('lodk').padrao!;
  /**
   * TETO DE INSTÂNCIAS POR QUADRO (mães + filhas), em milhões (?lodmax=).
   * O custo do modo é a contagem de instâncias (~5–6 ms por milhão nesta
   * máquina, ensaio 6): a meia distância pedia 19 M e custava ~105 ms
   * contra ~63 ms da galáxia de hoje. Quando o pedido passa do teto, caem
   * primeiro as FILHAS (K × fK, contínuo, a última filha fracionária — nada
   * estala; a tenda alarga o que falta, borrão em vez de areia); só com
   * uma filha por mãe e ainda acima do teto é que o alvo ρ desce e os
   * prefixos do fundo afinam (brilho ÷ q, fluxo igual). O intervalo global
   * (estrelas jovens resolvidas, nós H II, aglomerados, halo) sai sempre
   * inteiro.
   */
  private tetoLod: number;
  /** o teto do tier, em milhões — o que vale com o laboratório no padrão */
  private readonly tetoDoTier: number;
  /** o laboratório (Ajustes): as opções do quadro do motor WebGPU */
  private opcoesDoMotor = opcoesWebgpu(LABORATORIO_PADRAO);
  private lod: {
    inicio: Int32Array;
    total: Int32Array;
    /** partículas por pc² da coluna da célula (contagem cheia ÷ área) */
    sigma: Float32Array;
    zMin: Float32Array;
    zMax: Float32Array;
    sigmaZ: Float32Array;
    caixa: Float32Array; // 6 por desenho: min xyz, max xyz (cena)
    lado: Float32Array; // lado no plano (pc)
    firsts: Int32Array;
    counts: Int32Array;
    insts: Int32Array;
    dados: Float32Array;
    textura: THREE.DataTexture;
    fade: number;
  } | null = null;
  /** medidas do último quadro (?galaxia=particulas) — para as réguas */
  lodStats = { pais: 0, instancias: 0, desenhos: 0, cpuMs: 0, multiDraw: false, rho: 0, fK: 1 };
  private nucleoPc() {
    const a = 3 * GALACTIC_MODEL.stellarScaleLengthPc;
    const x = GALACTIC_MODEL.diskRadiusPc / a;
    const z = 1 - (1 + x) * Math.exp(-x);
    const n = this.totalParticulas * this.fracaoDeParticulas;
    const sigma0 = n / (2 * Math.PI * a * a * z);
    return Galaxy.NUCLEO_EM_ESPACAMENTOS / Math.sqrt(Math.max(sigma0, 1e-12));
  }
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
    /** `nuvens`: o τ⊥ das nuvens que a carga já assou (só-partículas) */
    buffers: GalaxyBuffers & { nuvens?: Uint16Array | null },
    dustMap: THREE.Texture,
    structureMap: THREE.Texture,
    /** o desenho que a carga montou (`montarCarga`): só-partículas ou o
     *  clássico das lâminas, e o teto de instâncias do tier (?lodmax=) */
    desenho: { soParticulas: boolean; tetoLodMilhoes: number } = { soParticulas: false, tetoLodMilhoes: 5 }
  ) {
    this.soParticulas = desenho.soParticulas;
    this.nuvensEmMeia = buffers.nuvens ?? null;
    this.tetoDoTier = desenho.tetoLodMilhoes;
    this.tetoLod = desenho.tetoLodMilhoes * 1e6;
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
    this.totalParticulas = buffers.brightCount;

    this.brightMat = new THREE.ShaderMaterial({
      vertexShader: GALAXY_VERT,
      fragmentShader: GALAXY_FRAG,
      uniforms: this.sharedUniforms(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    // o núcleo de densidade só existe no ensaio: sem o interruptor o
    // fonte do shader é o de sempre, letra por letra
    if (this.soParticulas) {
      this.brightMat.defines = { GALAXIA_PARTICULAS: '' };
      this.brightMat.uniforms.uNucleo = { value: 0 };
      this.brightMat.uniforms.uNucleoPc = { value: 0 };
      this.lod = Galaxy.celulasDoBuffer(bd, buffers.brightCount);
      this.dadosDasCelulas();
      this.brightMat.extensions.multiDraw = Galaxy.dbg.get('lodmd') !== '0';
      this.brightMat.uniforms.uCelulas = { value: this.lod.textura };
      this.brightMat.uniforms.uDesenho = { value: 0 };
      this.brightMat.uniforms.uRho = { value: this.rhoLod };
      this.brightMat.uniforms.uRhoPiso = { value: controleDoLaboratorio('lodpiso').padrao! };
      this.brightMat.uniforms.uGanhoPerto = { value: 1 };
      this.brightMat.uniforms.uLonge = { value: 1 };
      this.brightMat.uniforms.uKMax = { value: this.kmaxLod };
      this.brightMat.uniforms.uFracK = { value: 1 };
      this.brightMat.uniforms.uEspLod = { value: controleDoLaboratorio('lodesp').padrao! };
      // a geometria não desenha nada sozinha: os desenhos por célula saem
      // do gancho abaixo, com o programa e os atributos já ligados
      geo.setDrawRange(0, 0);
    }
    const brightPts = new THREE.Points(geo, this.brightMat);
    if (this.lod) {
      brightPts.onBeforeRender = (_r, _s, camera) => this.planejarCelulas(camera);
      brightPts.onAfterRender = (renderer, _s, _c, _g, material) =>
        this.desenharCelulas(renderer, material);
    }
    brightPts.frustumCulled = false;
    brightPts.renderOrder = 2;
    this.group.add(brightPts);
    this.brightPts = brightPts;

    // --- emissão contínua dos braços em três lâminas 3D ---
    this.createDiscLayers();
    // só-partículas: as lâminas nunca acendem (`update`) nem são assadas;
    // apagadas desde já, o aquecimento de shaders não compila a analítica
    if (this.soParticulas) for (const mesh of this.discMeshes) mesh.visible = false;

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
    // O TAMANHO É POR CURVA (R1b da régua única): o pé do ACES apagava as
    // asas do halo, e o tom neutro as mostrava como um clarão laranja em
    // volta do bojo de perfil. 4000 pc fora do ACES guarda o miolo (o
    // brilho central do perfil não depende do tamanho) e devolve as asas
    // ao aprovado (t=150: ΔE2000 em volta do bojo 4,4 → 0,8). `?halosize=`
    // vence as duas curvas.
    // A COR TAMBÉM (R1c): no mesmo L*, o pé do neutro tira o canal menor e
    // deixava o clarão do perfil ~1,5× mais vivo e mais amarelo (h 74 contra
    // 67). Fora do ACES o halo é mais cinzento e mais forte, para o que
    // sobra do pé ser o âmbar aprovado (t=150/152, anéis de 40 a 240 px em
    // volta do bojo fora do disco: ΔE2000 3,5 → 0,8). O halo só existe na
    // vista externa de raspão; o glow, que também vive dentro do disco, fica.
    const tamanhoNoAces = tune('halosize', 6000);
    const tamanhoFora = tune('halosize', 4000);
    const corNoAces = (this.haloMat.uniforms.uColor.value as THREE.Vector3).clone();
    const corFora = new THREE.Vector3(1.14, 0.865, 0.775).multiplyScalar(this.haloGain);
    halo.onBeforeRender = (renderer) => {
      this.haloMat.uniforms.uSize.value = porCurva(renderer.toneMapping, tamanhoNoAces, tamanhoFora);
      (this.haloMat.uniforms.uColor.value as THREE.Vector3).copy(porCurva(renderer.toneMapping, corNoAces, corFora));
    };
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
      // extinção por partícula: o τ⊥ da lâmina central bakeada, no canal
      // R da cópia compacta. Nasce com a 1×1 zerada (extinção nula) — o
      // app funciona antes do bake, e é para ela que `?nogdust=1` (ou o
      // clique no painel) volta.
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
    // SÓ-PARTÍCULAS: as sete lâminas não acendem nunca (`discVisible`), e
    // assá-las era ~0,4 s de GPU na carga para nada (13/11/2026). Daqui só
    // sai o τ⊥ das nuvens, que a carga já trouxe pronto.
    if (this.soParticulas) {
      this.tauNuvens = Galaxy.texturaDasNuvens(this.nuvensEmMeia ?? tauDasNuvensEmMeia());
      this.nuvensEmMeia = null;
      this.ligarTauMap();
      this.subirPontos(renderer);
      return true;
    }
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
        // a CÓPIA COMPACTA que o laço das partículas lê (ver
        // TAU_COMPACTO_FRAG): só o τ, no mesmo tamanho e na mesma meia
        // precisão — o τRT inteiro fica para as forjas
        const tauParticulas = new THREE.WebGLRenderTarget(tauRt.width, tauRt.height, {
          type: THREE.HalfFloatType,
          format: THREE.RedFormat,
          depthBuffer: false,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
        });
        const copia = new THREE.ShaderMaterial({
          vertexShader: DISC_BAKE_VERT,
          fragmentShader: TAU_COMPACTO_FRAG,
          uniforms: { uTau: { value: tauRt.texture } },
        });
        quad.material = copia;
        renderer.setRenderTarget(tauParticulas);
        renderer.render(bakeScene, bakeCam);
        copia.dispose();
        this.tauParticulasRT = tauParticulas;
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

  /**
   * SOBE O BUFFER DAS PARTÍCULAS JÁ, num alvo de 1×1 fora da tela
   * (13/11/2026). O `onUpload` dele solta a cópia JS — 122,7 MiB em
   * cinema —, mas só no primeiro quadro em que o WebGL desenha os pontos; e
   * de FORA do disco quem desenha é a camada WebGPU, então numa vista de
   * fora (`de-cima`) a cópia ficava no heap a visita inteira (medido: heap
   * de 462 MB contra 141 quando a câmera nascia dentro). Ela fica na placa,
   * pronta para a volta ao disco ou para a queda do WebGPU.
   */
  private subirPontos(renderer: THREE.WebGLRenderer) {
    const pts = this.brightPts;
    const indice = this.group.children.indexOf(pts);
    const cena = new THREE.Scene();
    cena.add(pts);
    const alvo = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(alvo);
    renderer.render(cena, new THREE.PerspectiveCamera());
    renderer.setRenderTarget(prev);
    alvo.dispose();
    // de volta ao grupo, no MESMO lugar entre os irmãos
    this.group.add(pts);
    this.group.children.splice(this.group.children.indexOf(pts), 1);
    this.group.children.splice(indice, 0, pts);
  }

  /** o bind do τ⊥ num lugar só: a cópia compacta assada ou a 1×1 de repouso. */
  private ligarTauMap() {
    const tau = this.tauNuvens ?? this.tauParticulasRT?.texture;
    this.brightMat.uniforms.uTauMap.value = this.showGDust && tau ? tau : this.tauVazio;
  }

  /** o τ⊥ das nuvens de poeira (`tauDasNuvensEmMeia`) como textura: R a
   *  camada fina (molecular), G a espessa (atômico) */
  private static texturaDasNuvens(meia: Uint16Array) {
    const N = LADO_DO_TAU_DAS_NUVENS;
    const t = new THREE.DataTexture(meia, N, N, THREE.RGFormat, THREE.HalfFloatType);
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
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

  /** τ⊥ da coluna (o τRT inteiro, canal A), para quem mais precisar da mesma extinção (forges). */
  get tauMapTexture(): THREE.Texture | null {
    if (this.tauNuvens && this.showGDust) {
      if (!this.tauNuvensRGBA) {
        const r = this.tauNuvens.image.data as Uint16Array;
        const N = this.tauNuvens.image.width;
        const rgba = new Uint16Array(N * N * 4);
        for (let k = 0; k < N * N; k++) rgba[4 * k + 3] = r[k];
        const t = new THREE.DataTexture(rgba, N, N, THREE.RGBAFormat, THREE.HalfFloatType);
        t.minFilter = THREE.LinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.needsUpdate = true;
        this.tauNuvensRGBA = t;
      }
      return this.tauNuvensRGBA;
    }
    return this.showGDust && this.tauRT ? this.tauRT.texture : null;
  }

  /**
   * A FRAÇÃO DE PARTÍCULAS DA GALÁXIA, TROCADA AO VIVO (item 149).
   * `drawRange` desenha só o PREFIXO do buffer — barato porque
   * `buildGalaxy` o embaralhou uma vez (ver o comentário lá): o prefixo
   * já é amostra uniforme de todas as populações, não só do disco. O
   * fluxo total é conservado em `update()` (`uFade ÷ fracaoDeParticulas`)
   * — menos pontos, cada um mais brilhante.
   */
  setFracaoDeParticulas(fracao: number) {
    this.fracaoDeParticulas = fracao;
    // só-partículas: a fração vira o prefixo de CADA célula (embaralhada
    // por dentro), e a geometria segue sem desenho próprio
    if (this.lod) {
      this.dadosDasCelulas();
      return;
    }
    this.brightPts.geometry.setDrawRange(0, Math.round(this.totalParticulas * fracao));
  }

  /**
   * Varre o buffer ordenado por célula (antes do upload, que o solta) e
   * monta os desenhos: um por célula não vazia e o intervalo global por
   * último. Por célula guarda a caixa na cena, a contagem, a altura média
   * e o desvio vertical (a espessura que entra na área projetada).
   */
  private static celulasDoBuffer(bd: Float32Array, n: number) {
    const inicio: number[] = [];
    const total: number[] = [];
    const chaves: number[] = [];
    let chaveAtual = -1;
    for (let i = 0; i < n; i++) {
      const c = celulaDaParticula(bd, i);
      if (c !== chaveAtual) {
        inicio.push(i);
        total.push(0);
        chaves.push(c);
        chaveAtual = c;
      }
      total[total.length - 1]++;
    }
    const D = inicio.length;
    const sigma = new Float32Array(D);
    const zMin = new Float32Array(D);
    const zMax = new Float32Array(D);
    const sigmaZ = new Float32Array(D);
    const caixa = new Float32Array(D * 6);
    // lado no plano por célula: o disco espesso tem células de 2 kpc
    const lado = new Float32Array(D);
    for (let d = 0; d < D; d++) {
      let sz = 0, sz2 = 0, zl0 = Infinity, zl1 = -Infinity;
      let x0 = Infinity, y0 = Infinity, z0 = Infinity;
      let x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
      for (let i = inicio[d], fim = inicio[d] + total[d]; i < fim; i++) {
        const o = i * 8;
        const x = bd[o], y = bd[o + 1], z = bd[o + 2];
        const zl = (x - GAL.GC_POS.x) * EZ.x + (y - GAL.GC_POS.y) * EZ.y + (z - GAL.GC_POS.z) * EZ.z;
        sz += zl;
        sz2 += zl * zl;
        zl0 = Math.min(zl0, zl);
        zl1 = Math.max(zl1, zl);
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); z0 = Math.min(z0, z);
        x1 = Math.max(x1, x); y1 = Math.max(y1, y); z1 = Math.max(z1, z);
      }
      const m = sz / total[d];
      zMin[d] = zl0;
      zMax[d] = zl1;
      sigmaZ[d] = Math.sqrt(Math.max(sz2 / total[d] - m * m, 0));
      lado[d] = ladoDaChave(chaves[d]);
      sigma[d] = chaves[d] === CELULAS_DA_GRADE ? 0 : total[d] / (lado[d] * lado[d]);
      caixa.set([x0, y0, z0, x1, y1, z1], d * 6);
    }
    const largura = 64;
    const dados = new Float32Array(largura * Math.ceil(D / largura) * 4);
    const textura = new THREE.DataTexture(
      dados, largura, Math.ceil(D / largura), THREE.RGBAFormat, THREE.FloatType
    );
    const lod = {
      inicio: Int32Array.from(inicio),
      total: Int32Array.from(total),
      sigma, zMin, zMax, sigmaZ, caixa, lado,
      firsts: Int32Array.from(inicio),
      counts: new Int32Array(D),
      insts: new Int32Array(D),
      dados, textura, fade: 0,
    };
    return lod;
  }

  /**
   * A textura por desenho que o vértice lê (texelFetch por gl_DrawID):
   * R início no buffer · G partículas disponíveis (0 = intervalo global,
   * sem nível de detalhe) · B as mesmas por pc² da coluna · A a razão de
   * espessura 2,5·σz / lado, que dá a área de perfil da célula.
   */
  private dadosDasCelulas() {
    const L = this.lod!;
    const f = this.fracaoDeParticulas;
    for (let d = 0; d < L.inicio.length; d++) {
      const disp = Math.max(1, Math.round(L.total[d] * f));
      L.dados[d * 4] = L.inicio[d];
      L.dados[d * 4 + 1] = L.sigma[d] > 0 ? disp : 0;
      L.dados[d * 4 + 2] = L.sigma[d] * (disp / L.total[d]);
      L.dados[d * 4 + 3] = (2.5 * L.sigmaZ[d]) / L.lado[d];
    }
    L.textura.needsUpdate = true;
  }

  private static frustum = new THREE.Frustum();
  private static caixaTmp = new THREE.Box3();
  private static mTmp = new THREE.Matrix4();

  /**
   * O pior caso de cada célula visível, com as MESMAS contas do vértice:
   * a menor distância à caixa dá o maior m; a abertura μ varia na caixa e
   * a área projetada ∝ μ + t·√(1−μ²) é tomada no máximo do intervalo; a
   * rampa k = fade·smoothstep(300, 1500, d) entra na menor distância para
   * o prefixo e na maior para as filhas. Pedir de mais só custa vértices
   * que saem cedo; pedir de menos tiraria luz.
   */
  private planejarCelulas(camera: THREE.Camera) {
    const t0 = performance.now();
    const u = this.brightMat.uniforms;
    Galaxy.frustum.setFromProjectionMatrix(
      Galaxy.mTmp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    );
    // o teto: o plano é monótono em (ρ, fK), então uma bisseção num
    // parâmetro só — t ∈ [1, 2] encolhe as filhas (fK = t − 1, o K de
    // cada partícula vezes fK), t ∈ [0, 1] baixa ρ com uma filha por mãe —
    // acha o maior pedido que cabe. fK e ρ são contínuos: cada célula
    // ganha ou perde a SUA última instância com peso que nasce em zero,
    // em degraus de uma célula, e nenhum uniforme salta.
    const rho0 = this.rhoLod;
    const teto = this.tetoLod;
    const params = (t: number): [number, number] =>
      t >= 1 ? [rho0, Math.min(t - 1, 1)] : [rho0 * Math.max(t, 1e-3), 0];
    let rho = rho0;
    let fK = 1;
    if (this.planejarCom(rho, fK) > teto) {
      let lo = 0;
      let hi = 2;
      for (let i = 0; i < 12; i++) {
        const t = (lo + hi) / 2;
        [rho, fK] = params(t);
        if (this.planejarCom(rho, fK) > teto) hi = t;
        else lo = t;
      }
      [rho, fK] = params(lo);
      this.planejarCom(rho, fK);
    }
    u.uRho.value = rho;
    u.uFracK.value = fK;
    this.lodStats.rho = rho;
    this.lodStats.fK = fK;
    this.lodStats.cpuMs = performance.now() - t0;
  }

  /** Um plano com o alvo ρ e a fração fK das filhas; devolve as instâncias. */
  private planejarCom(rho: number, fK: number) {
    const L = this.lod!;
    const u = this.brightMat.uniforms;
    const cam = u.uCamPos.value as THREE.Vector3;
    const f = (u.uScreenH.value as number) / (2 * (u.uTanHalfFov.value as number));
    const fr = Galaxy.frustum;
    const caixa = Galaxy.caixaTmp;
    const zc =
      (cam.x - GAL.GC_POS.x) * EZ.x + (cam.y - GAL.GC_POS.y) * EZ.y + (cam.z - GAL.GC_POS.z) * EZ.z;
    const ss = THREE.MathUtils.smoothstep;
    const kmax = this.kmaxLod;
    let pais = 0, instancias = 0, desenhos = 0;
    const D = L.inicio.length;
    for (let d = 0; d < D; d++) {
      const disp = L.dados[d * 4 + 1];
      const o = d * 6;
      caixa.min.set(L.caixa[o], L.caixa[o + 1], L.caixa[o + 2]);
      caixa.max.set(L.caixa[o + 3], L.caixa[o + 4], L.caixa[o + 5]);
      if (disp === 0) {
        // intervalo global: inteiro, uma instância
        const n = Math.max(1, Math.round(L.total[d] * this.fracaoDeParticulas));
        L.counts[d] = n;
        L.insts[d] = 1;
        pais += n; instancias += n; desenhos++;
        continue;
      }
      const dMin = Math.max(caixa.distanceToPoint(cam), 1);
      const dx = Math.max(Math.abs(cam.x - caixa.min.x), Math.abs(cam.x - caixa.max.x));
      const dy = Math.max(Math.abs(cam.y - caixa.min.y), Math.abs(cam.y - caixa.max.y));
      const dz = Math.max(Math.abs(cam.z - caixa.min.z), Math.abs(cam.z - caixa.max.z));
      const dMax = Math.max(Math.hypot(dx, dy, dz), dMin);
      // margem de 300 pc: o ponto é um quadrado de até 40 px e o corte do
      // vértice já tem a sua; aqui só não pode faltar
      caixa.expandByScalar(300);
      if (!fr.intersectsBox(caixa)) {
        L.counts[d] = 0;
        L.insts[d] = 0;
        continue;
      }
      // abertura: altura da câmera sobre a fatia z da célula
      const zLo = L.zMin[d];
      const zHi = L.zMax[d];
      const hPerto = zc < zLo ? zLo - zc : zc > zHi ? zc - zHi : 0;
      const hLonge = Math.max(Math.abs(zc - zLo), Math.abs(zc - zHi));
      const muLo = Math.min(hPerto / dMax, 1);
      const muHi = Math.min(hLonge / dMin, 1);
      const t = L.dados[d * 4 + 3];
      const proj = (mu: number) => mu + t * Math.sqrt(Math.max(1 - mu * mu, 0));
      const muPico = 1 / Math.sqrt(1 + t * t);
      let projMax = Math.max(proj(muLo), proj(muHi));
      if (muPico > muLo && muPico < muHi) projMax = Math.max(projMax, proj(muPico));
      const sig = L.dados[d * 4 + 2];
      const mMax = (rho * f * f * projMax) / (sig * dMin * dMin);
      const kPerto = this.lod!.fade * ss(dMin, 300, 1500);
      const kLonge = this.lod!.fade * ss(dMax, 300, 1500);
      // com a lei de longe na camada WebGPU, célula toda além de 1,5 kpc
      // não tem luz de perto nenhuma para o WebGL
      if (this.longeNoWebgpu && kPerto >= 1) {
        L.counts[d] = 0;
        L.insts[d] = 0;
        continue;
      }
      const qMax = mMax >= 1 ? 1 : 1 - kPerto * (1 - mMax);
      const kMax = Math.min(kmax, (1 + kLonge * Math.max(mMax - 1, 0)) * fK);
      const n = Math.min(disp, Math.ceil(qMax * disp) + 1);
      const k = Math.max(1, Math.ceil(kMax - 1e-4));
      L.counts[d] = n;
      L.insts[d] = k;
      pais += n; instancias += n * k; desenhos++;
    }
    this.lodStats.pais = pais;
    this.lodStats.instancias = instancias;
    this.lodStats.desenhos = desenhos;
    return instancias;
  }

  /** Os desenhos por célula, com o programa e os atributos que o three acabou de ligar. */
  private desenharCelulas(renderer: THREE.WebGLRenderer, material: THREE.Material) {
    const L = this.lod!;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const D = L.inicio.length;
    // ?lodmd=0 força um desenho por célula: o gpu-profile só cronometra
    // gl.draw*, não a chamada da extensão
    if (this.brightMat.extensions.multiDraw && renderer.extensions.has('WEBGL_multi_draw')) {
      const ext = renderer.extensions.get('WEBGL_multi_draw') as {
        multiDrawArraysInstancedWEBGL(
          mode: number, firsts: Int32Array, firstsOffset: number,
          counts: Int32Array, countsOffset: number,
          instances: Int32Array, instancesOffset: number, drawCount: number
        ): void;
      };
      ext.multiDrawArraysInstancedWEBGL(gl.POINTS, L.firsts, 0, L.counts, 0, L.insts, 0, D);
      this.lodStats.multiDraw = true;
      return;
    }
    this.lodStats.multiDraw = false;
    const programa = (renderer.properties.get(material) as {
      currentProgram: { getUniforms(): { setValue(gl: WebGL2RenderingContext, nome: string, v: number): void } };
    }).currentProgram;
    const uniforms = programa.getUniforms();
    for (let d = 0; d < D; d++) {
      if (L.counts[d] === 0) continue;
      uniforms.setValue(gl, 'uDesenho', d);
      gl.drawArraysInstanced(gl.POINTS, L.firsts[d], L.counts[d], L.insts[d]);
    }
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
    localBandFade: number,
    /** só o ?galaxia=webgpu usa: a câmera e a largura do buffer */
    camera?: THREE.PerspectiveCamera,
    screenW?: number
  ) {
    this.group.visible =
      externalFade > 0.001 || markerFade > 0.001 || localBandFade > 0.001;
    // A CESSÃO (13/11/2026) — duas rampas, só da posição da câmera (pelo
    // externalFade) e do nível (quem tem a camada WebGPU):
    //  · longe: a lei de longe (núcleo, tenda, nível de detalhe) assume as
    //    partículas a mais de ~1,5 kpc. Com a camada, ela fecha logo depois
    //    de sair do plano (externalFade 0 → 0,25, ~600 → ~1,1 kpc de altura)
    //    e essa luz é toda dela; o WebGL fica só com a de perto. Sem a camada
    //    a rampa é a de sempre (o próprio externalFade).
    //  · perto: a lei de perto (pontos resolvidos, < ~1,5 kpc da câmera)
    //    passa do WebGL à camada só no fim (externalFade 0,8 → 1, ~1,7 kpc do
    //    plano), quando sobram poucas partículas tão perto.
    // A luz de cada partícula é dividida, nunca duplicada: a soma é 1.
    const longeW = THREE.MathUtils.smoothstep(externalFade, 0, 0.25);
    const perto = 1 - THREE.MathUtils.smoothstep(externalFade, 0.8, 1);
    // a parte da luz que a camada WebGPU desenharia desta câmera
    this.cessao = this.group.visible ? 1 - perto * (1 - longeW) : 0;
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
      // ÷ fracaoDeParticulas (item 149): menos pontos desenhados, cada um
      // mais brilhante — o fluxo INTEGRADO da galáxia não muda com o
      // ajuste, só a granulação.
      u.uFade.value = this.soParticulas
        ? (brightFade + Galaxy.GANHO_DAS_LAMINAS * externalFade) / this.fracaoDeParticulas
        : brightFade / this.fracaoDeParticulas;
      if (this.camadaWebgpu?.falhou) this.soltarWebgpu();
      this.longeNoWebgpu = !!(this.soParticulas && this.camadaWebgpu && camera && screenW);
      let longe = externalFade;
      let ganhoPerto = brightFade / (brightFade + Galaxy.GANHO_DAS_LAMINAS * externalFade);
      if (this.longeNoWebgpu) {
        // O GANHO DA LEI DE LONGE com a rampa adiantada. A luz das lâminas
        // (6,99·externalFade) entra pela lei de longe; com a rampa de sempre
        // a partícula distante levava (1 − e)·bF + e·(bF + 6,99·e) =
        // bF + 6,99·e². Com a rampa `longe` adiantada, o ganho divide essa
        // luz por `longe`: a galáxia não clareia por a camada entrar mais cedo.
        // A REFERÊNCIA É O QUE O WebGL ENTREGAVA: com a rampa de sempre ele
        // desenhava as partículas distantes até externalFade 0,8 (a fração
        // `perto`), e ali, sob o teto de instâncias, entregava só
        // ~LUZ_DO_WEBGL_NA_SAIDA da luz que a camada entrega das mesmas
        // partículas (medido 13/11 nos quadros t=144–147: sem isto a saída
        // ficava 14–24 % mais clara em luz linear, +4–9 % na média do quadro).
        // O ganho leva essa luz, e não a cheia; em e = 1 (perto = 0) é o de sempre.
        longe = longeW;
        const e = externalFade;
        const ganhoLonge =
          longe > 0
            ? ((e * Galaxy.GANHO_DAS_LAMINAS * e + longe * brightFade) *
                (1 - (1 - Galaxy.LUZ_DO_WEBGL_NA_SAIDA) * perto)) /
              longe
            : brightFade;
        ganhoPerto = (perto * brightFade) / ganhoLonge;
        u.uFade.value = ganhoLonge / this.fracaoDeParticulas;
        // A camada leva, de cada partícula, a lei de longe (longe ×
        // smoothstep(300, 1500, d)) e, no fim, também a de perto (1 − perto);
        // o WebGL, o resto da de perto. O motor desenha TODOS os seus
        // sorteios, qualquer que seja a fração de partículas do WebGL: o
        // ganho dele não leva o ÷ fração (em `alta`, metade, a galáxia saía
        // com o dobro da luz).
        this.camadaWebgpu!.update(camera!, screenW!, screenH, tanHalfFov, ganhoLonge, this.cessao > 0.001 ? 1 : 0, {
          ...this.opcoesDoMotor,
          pesoFixo: 1 - perto,
          pesoPerto: perto * longe,
        });
      }
      if (this.soParticulas) {
        u.uNucleo.value = longe;
        // a pegada de perto (lei de tela) leva só a rampa de dentro do disco
        u.uGanhoPerto.value = ganhoPerto;
        u.uLonge.value = this.longeNoWebgpu ? 0 : 1;
        u.uNucleoPc.value = this.nucleoPc();
        if (this.lod) this.lod.fade = longe;
      }
    }
    // As lâminas contínuas só entram na vista externa. De dentro
    // seriam planos infinitos; a faixa local vem das partículas 3D.
    // Com fade 0 os meshes ficam invisíveis: cada lâmina de 33,6 kpc
    // custa milhões de fragmentos de FBM que somariam exatamente zero.
    const discVisible = discFade > 0.001 && this.showDisc && !this.soParticulas;
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
    // Só partículas: sem as lâminas na frente, o "você está aqui" aparecia
    // de DENTRO do disco como um anel solto no meio do quadro (filme,
    // t=138–147). Ele é uma marca da vista de fora — entra com ela.
    if (this.soParticulas) {
      markerFade *= THREE.MathUtils.smoothstep(externalFade, 0.6, 0.95);
    }
    this.markerMesh.visible = markerFade > 0.001;
    // o brilho contínuo do bojo só aparece de longe — perto ele
    // cobriria a tela inteira de branco
    const dGC = camPos.distanceTo(GAL.GC_POS);
    const glowGate = THREE.MathUtils.smoothstep(dGC, 5000, 13000);
    this.glowMat.uniforms.uTime.value = time;
    // só-partículas: o bojo agora é 3D nas partículas (barra + boxy/
    // peanut com ~11 % da luz); o cartaz contaria a mesma luz duas vezes
    this.glowMat.uniforms.uFade.value = this.soParticulas
      ? 0
      : externalFade * glowGate * 0.32 + localBandFade * 0.11;
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
    // com a lei de longe na camada WebGPU, o WebGL só existe enquanto houver
    // lei de perto para desenhar
    this.brightPts.visible =
      this.showPts && brightFade > 0.001 && (this.brightMat.uniforms.uFade.value as number) > 0 &&
      (!this.longeNoWebgpu || (this.brightMat.uniforms.uGanhoPerto.value as number) > 0);
    this.glowMesh.visible =
      this.showGlow && (this.glowMat.uniforms.uFade.value as number) > 0.001;
    this.haloMesh.visible =
      this.showGlow &&
      this.haloGain > 0 &&
      (this.haloMat.uniforms.uFade.value as number) > 0.001;
    this.dwarfMesh.visible =
      this.showGlow && (this.dwarfMat.uniforms.uFade.value as number) > 0.001;
  }

  /**
   * Liga a camada WebGPU pedida pela carga (`CamadaWebgpu.criar`, que já
   * sobe em paralelo com ela). Sem WebGPU (ou com a ponte quebrada) a
   * camada não chega e o WebGL segue; numa galáxia clássica ela é solta.
   */
  ligarWebgpu(pedida: Promise<CamadaWebgpu | null>) {
    if (!this.soParticulas) {
      void pedida.then((camada) => camada?.dispose());
      return;
    }
    this.webgpuEmVoo = true;
    void pedida.then((camada) => {
      this.webgpuEmVoo = false;
      if (camada && this.descartada) camada.dispose();
      else if (camada) {
        this.camadaWebgpu = camada;
        this.group.add(camada.mesh);
      }
      this.anunciarCaminho();
    });
  }

  /**
   * O LABORATÓRIO DA GALÁXIA, AO VIVO (Ajustes, 13/11/2026): os botões do
   * motor WebGPU e os do nível de detalhe do WebGL. Só uniformes e números
   * lidos no quadro seguinte — nada é refeito. Os sorteios não passam por
   * aqui: mudam o mundo (o Director o reassa). Com tudo no padrão os
   * valores são os de sempre, letra por letra.
   */
  definirLaboratorio(lab: Laboratorio) {
    this.opcoesDoMotor = opcoesWebgpu(lab);
    const v = (id: 'lodrho' | 'lodk' | 'lodpiso' | 'lodesp') => lab[id] ?? controleDoLaboratorio(id).padrao!;
    this.rhoLod = v('lodrho');
    this.kmaxLod = v('lodk');
    this.tetoLod = (lab.lodmax ?? this.tetoDoTier) * 1e6;
    if (this.lod) {
      const u = this.brightMat.uniforms;
      u.uKMax.value = this.kmaxLod;
      u.uRhoPiso.value = v('lodpiso');
      u.uEspLod.value = v('lodesp');
    }
  }

  /** a camada caiu (dispositivo perdido, erro da GPU): a luz volta ao WebGL */
  private soltarWebgpu() {
    const camada = this.camadaWebgpu;
    if (!camada) return;
    this.camadaWebgpu = null;
    this.group.remove(camada.mesh);
    camada.dispose();
    this.anunciarCaminho();
  }

  /**
   * QUEM ESTÁ DESENHANDO a galáxia de fora agora — depois das quedas da
   * cadeia. Enquanto a camada WebGPU não chega, quem desenha é o WebGL.
   */
  get caminho(): CaminhoDaGalaxia {
    if (!this.soParticulas) return 'classica';
    return this.camadaWebgpu ? 'webgpu' : 'particulas';
  }

  /**
   * A imagem ainda vai mudar sozinha: a camada a caminho ou sorteios por
   * chegar — e ela desenharia DESTA câmera (13/11/2026). De dentro do disco
   * (a abertura do Atlas, o filme até a saída) a camada não entra no quadro,
   * e esperar por ela segurava a captura ~0,5 s por um pixel que não muda;
   * se a câmera sai antes de ela chegar, a espera volta no mesmo quadro.
   */
  get desenhoEmVoo(): boolean {
    return (this.webgpuEmVoo || (this.camadaWebgpu?.pendentes ?? 0) > 0) && this.desenhaDeFora;
  }

  /** a camada WebGPU (ou a falta dela) entra no quadro desta câmera */
  get desenhaDeFora(): boolean {
    return this.cessao > 0;
  }

  anunciarCaminho() {
    if (this.descartada) return;
    console.info(`[galáxia] desenhando: ${this.caminho}`);
    if (import.meta.env.DEV) Object.assign(window, { __caminhoDaGalaxia: this.caminho });
    this.aoMudarCaminho?.();
  }

  dispose() {
    this.descartada = true;
    this.camadaWebgpu?.dispose();
    this.brightMat.dispose();
    this.glowMat.dispose();
    this.haloMat.dispose();
    this.dwarfMat.dispose();
    this.markerMat.dispose();
    this.discMats.forEach((material) => material.dispose());
    this.discRTs.forEach((rt) => rt.dispose());
    this.tauRT?.dispose();
    this.tauParticulasRT?.dispose();
    this.tauNuvens?.dispose();
    this.tauNuvensRGBA?.dispose();
    this.tauVazio.dispose();
    this.lod?.textura.dispose();
    if (this.ownsDustMap) this.dustMap.dispose();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) o.geometry.dispose();
    });
  }
}
