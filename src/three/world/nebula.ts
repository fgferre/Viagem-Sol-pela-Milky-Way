// ============================================================
// Nebulosa volumétrica — raymarching em render target de meia
// resolução, composta como fundo HDR da cena principal.
// ============================================================
import * as THREE from 'three';
import {
  NEBULA_VERT,
  nebulaFrag,
  nebulaBakeFrag,
  nebulaLutFrag,
  NEBULA_BLUR_FRAG,
} from '../shaders/nebulaShaders';
import { makeBlueNoiseTexture } from './blueNoise';
import { SEGMENTOS_DA_FOTOSFERA_NO_PIOR_TIER } from './stellarBody';
import { NIVEIS_DA_PIRAMIDE_NO_SHADER } from '../shaders/common';
import { diagnosticoDaPoeira } from '../../lib/diagnosticoDaPoeira';
import type { GasVolumetrico } from '../core/engine';
import type { VolumeDePoeira } from '../cartography/galacticAssets';
import {
  LADO_DA_VAGA,
  NUCLEO_DO_TIJOLO,
  RAIO_DESEJADO_PC,
  ResidenciaDaPiramide,
} from '../cartography/piramideDePoeira';
import type {
  FonteDeTijolos,
  LoteParaGpu,
  NivelDaPiramide,
  OrcamentoDaPiramide,
  PiramideDePoeira,
  ResumoDaResidencia,
  Trio,
} from '../cartography/piramideDePoeira';
import { EX, EY, EZ } from './baseGalactica';

// ---- A pirâmide da poeira: as contas puras do lado da GPU (E3c) ----------

/**
 * Cena → heliocêntrico galáctico CONVENCIONAL (pc; x → centro galáctico,
 * y → l = 90°, z → polo norte), o referencial do bloco e da pirâmide. É a
 * inversa de `helioGalacticoParaCena` (world/baseGalactica.ts): a base
 * EX/EY/EZ é ortonormal e o Sol é a origem da cena, então basta projetar
 * — a mesma conta de `poeiraHelio` no shader. Serve à POSIÇÃO e à
 * DIREÇÃO da câmera (sem translação, as duas passam pela mesma rotação).
 */
export function cenaParaHelioGalactico(x: number, y: number, z: number): Trio {
  return [
    -(x * EX.x + y * EX.y + z * EX.z),
    -(x * EY.x + y * EY.y + z * EY.z),
    x * EZ.x + y * EZ.y + z * EZ.z,
  ];
}

/** largura das rampas de um nível no shader, em voxels DELE (8 voxels:
 *  20 pc no n3, 40 no n2, 80 no n1) */
const BANDA_DA_RAMPA_EM_VOXELS = 8;
/** as rampas de um nível que o shader nunca lê: as duas terminam antes
 *  de 0, e t e |p| nunca são negativos — bordas em ordem, peso 0 */
export const RAMPAS_DESLIGADAS: readonly [number, number, number, number] = [-2, -1, -2, -1];
/** "sem região" (o n1 cobre a caixa inteira): uma rampa que |p| nunca
 *  alcança, finita para o uniform */
const SEM_REGIAO_PC = 1e9;

/**
 * As rampas do peso do nível no shader, `[aₖ, bₖ, Aₖ, Bₖ]` — ver
 * `GLSL_POEIRA_NIVEIS` em shaders/common.ts:
 *
 *   wₖ = [1 − S(t; aₖ, bₖ)]·[1 − S(|p|; Aₖ, Bₖ)]
 *
 * bₖ = RAIO_DESEJADO_PC[k] − meia diagonal do tijolo: com peso > 0 o
 * ponto está a menos de bₖ da câmera, o centro do tijolo dele a menos de
 * bₖ + meia diagonal = o raio — e é esse o critério com que a residência
 * DESEJA um tijolo. O shader só lê tijolo desejado; o que a carência
 * segura fora do raio não entra, e a imagem não depende do caminho que a
 * câmera fez. Bₖ = o raio da região do nível: todo tijolo que toca a
 * região existe (gravado ou omitido), então dentro dela nunca falta nível.
 * Um nível cujas rampas não caberiam (raio pequeno demais para o tijolo)
 * sai desligado.
 */
export function raiosDoNivel(
  n: Pick<NivelDaPiramide, 'nivel' | 'voxelPc' | 'raioPc'>
): [number, number, number, number] {
  const raio = RAIO_DESEJADO_PC[n.nivel] ?? 0;
  const banda = BANDA_DA_RAMPA_EM_VOXELS * n.voxelPc;
  const camFim = raio - (Math.sqrt(3) / 2) * NUCLEO_DO_TIJOLO * n.voxelPc;
  const camIni = camFim - banda;
  if (!(camIni > 0)) return [...RAMPAS_DESLIGADAS];
  if (!Number.isFinite(n.raioPc)) return [camIni, camFim, SEM_REGIAO_PC, 2 * SEM_REGIAO_PC];
  const regIni = n.raioPc - banda;
  if (!(regIni > 0)) return [...RAMPAS_DESLIGADAS];
  return [camIni, camFim, regIni, n.raioPc];
}

/** o peso do nível num ponto — o espelho em TS de `poeiraPesoDoNivel`
 *  (t = distância à câmera, r = distância ao Sol), para os testes */
export function pesoDoNivel(raios: readonly number[], t: number, r: number): number {
  const [a, b, ra, rb] = raios;
  return (
    (1 - THREE.MathUtils.smoothstep(t, a, b)) * (1 - THREE.MathUtils.smoothstep(r, ra, rb))
  );
}

/**
 * As tabelas de páginas dos níveis EMPILHADAS em z numa textura só
 * (R16UI): o nível i ocupa as camadas [deslocamentoZ[i], + nbz) — um
 * sampler em vez de um por nível. Largura e altura são as do maior nível.
 */
export interface PilhaDeTabelas {
  largura: number;
  altura: number;
  profundidade: number;
  deslocamentoZ: number[];
}

export function empilharTabelas(tijolosPorNivel: readonly Trio[]): PilhaDeTabelas {
  const deslocamentoZ: number[] = [];
  let profundidade = 0;
  let largura = 1;
  let altura = 1;
  for (const [nbx, nby, nbz] of tijolosPorNivel) {
    deslocamentoZ.push(profundidade);
    profundidade += nbz;
    largura = Math.max(largura, nbx);
    altura = Math.max(altura, nby);
  }
  return { largura, altura, profundidade: Math.max(profundidade, 1), deslocamentoZ };
}

/** o texel da pilha para a entrada `indice` (bi + nbx·(bj + nby·bk), a
 *  numeração da residência) do nível `i` da pilha */
export function texelNaPilha(pilha: PilhaDeTabelas, i: number, tijolos: Trio, indice: number): number {
  const [nbx, nby] = tijolos;
  const bi = indice % nbx;
  const resto = Math.floor(indice / nbx);
  const bj = resto % nby;
  const bk = Math.floor(resto / nby);
  return bi + pilha.largura * (bj + pilha.altura * (pilha.deslocamentoZ[i] + bk));
}

/**
 * Quanto a captura espera a residência assentar (`carregando` falso)
 * antes de soltar mesmo assim, em s de relógio do app. Um tijolo que dá
 * erro só desiste em ~12 s (3 tentativas, esperas de 4 e 8 s — a regra
 * das texturas), e até lá já aparece no nível de cima, a mesma imagem de
 * depois da desistência; 8 s solta antes disso e antes da rede de
 * segurança do harness (700 quadros, ~12 s a 60 Hz), e sobra folga para a
 * carga normal (centenas de ms em rede local). O que ainda não chegou
 * aparece no nível de cima — nunca um buraco.
 */
export const TETO_DA_ESPERA_DA_PIRAMIDE_S = 8;

/** a pirâmide já na GPU — o que `setPiramide` monta e `dispose` solta */
interface PiramideNaGpu {
  residencia: ResidenciaDaPiramide;
  niveis: readonly NivelDaPiramide[];
  pilha: PilhaDeTabelas;
  dadosDasTabelas: Uint16Array;
  tabelas: THREE.Data3DTexture;
  atlas: THREE.Data3DTexture;
  vagas: number;
  /** algum `atualizar` já rodou desde que ela chegou? antes disso a
   *  residência diria "nada carregando" sem ter pedido nada */
  atualizada: boolean;
  /** desde quando (relógio do app) a residência está carregando */
  carregandoDesdeS: number | null;
  agoraS: number;
}

/**
 * O atlas R16F (linear, ClampToEdge — a aba de cada vaga mantém o
 * trilinear dentro dela). Com `dados` nulo a GPU só RESERVA a memória
 * (`dataReady = false`: `texStorage3D` sem subida, zerada pelo WebGL) —
 * os tijolos sobem vaga a vaga por `copyTextureToTexture`, e 20 MB de
 * zeros na CPU só para a primeira subida seriam desperdício.
 */
function texturaDoAtlas(dados: Uint16Array | null, [x, y, z]: Trio): THREE.Data3DTexture {
  const tex = new THREE.Data3DTexture(dados, x, y, z);
  tex.format = THREE.RedFormat;
  tex.type = THREE.HalfFloatType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.wrapR = THREE.ClampToEdgeWrapping;
  tex.source.dataReady = dados !== null;
  tex.needsUpdate = true;
  return tex;
}

/** a pilha das tabelas: R16UI (inteiro sem sinal — lida por `texelFetch`
 *  num `usampler3D`, sem filtro) */
function texturaDasTabelas(dados: Uint16Array, [x, y, z]: Trio): THREE.Data3DTexture {
  const tex = new THREE.Data3DTexture(dados, x, y, z);
  tex.format = THREE.RedIntegerFormat;
  tex.type = THREE.UnsignedShortType;
  tex.internalFormat = 'R16UI';
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/** a variante de nascença — a mesma que o fragment do raymarch e do bake
 *  sempre foram antes do item 145b (macio: tudo assado, sem `?nebvol=`
 *  nem `?nebfino=` vivos). O Director aplica a do preset/gaveta logo
 *  depois de construir (`aplicarGas`), antes do primeiro `render()`. */
const VARIANTE_DE_NASCENCA = 'macio';

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
  /** o quad fullscreen do raymarch — guardado para `setVariante` trocar o
   *  material sem recriar a cena. */
  private quad: THREE.Mesh;
  /**
   * A VARIANTE DO GÁS VOLUMÉTRICO (item 145b) e o CACHE de materiais já
   * compilados por variante — um para o raymarch, outro para o bake
   * (este sem entrada `antigo`: o caminho antigo nunca assa, ver
   * `render()`). Todo material do cache COMPARTILHA o mesmo objeto de
   * uniforms de sempre (o de `this.material`/`this.volumeMaterial`
   * originais, que nunca mudam de identidade — só o fragment muda), então
   * nenhum setter (`setFade`, `setCavity`...) precisa saber que a
   * variante trocou.
   */
  private variante: GasVolumetrico = VARIANTE_DE_NASCENCA;
  private materiaisRaymarch = new Map<string, THREE.ShaderMaterial>();
  private materiaisBake = new Map<string, THREE.ShaderMaterial>();
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
  /**
   * REDESIGN (PLAN.md, 05/09) — GÁS ASSADO NUM CUBO QUE SEGUE A CÂMERA.
   * A primeira versão assava uma caixa FIXA em torno do Sol — inútil,
   * porque o gás liga em qualquer ponto do disco (`nebulaFade`/`inDisk`
   * em director.ts), não só perto de casa. `volumeSujo` sobe quando um
   * insumo que não depende da posição muda (`setDustMap`); o desvio da
   * câmera além da margem é checado a cada `render()` (`precisaRecentrar`).
   * Qualquer um dos dois dispara `bake()`, que primeiro pede sementes
   * novas do centro (via `pedirSementes`) e só depois assa.
   */
  private volumeSujo = true;
  private volumeRT: THREE.WebGL3DRenderTarget;
  private volumeScene = new THREE.Scene();
  private volumeMaterial: THREE.ShaderMaterial;
  /** o quad fullscreen do bake — guardado para `setVariante` trocar o
   *  material sem recriar a cena. */
  private volumeQuad: THREE.Mesh;
  /** meia-aresta do cubo assado (pc) — tMax do raymarch (650) + margem (350) */
  private static readonly MEIA_ARESTA = 1000;
  private static readonly VOXEIS = 128;
  /** aresta do voxel: 2000/128 = 15,625 pc — `centro` é sempre múltiplo
   * disto, para um re-bake num centro novo amostrar as MESMAS posições
   * de mundo que o bake anterior amostrava (sem isso, o gás treme: o
   * mesmo ponto do espaço cairia num offset de sub-voxel diferente a
   * cada bake). */
  private static readonly VOXEL_PC =
    (2 * Nebula.MEIA_ARESTA) / Nebula.VOXEIS;
  /** reassa quando a câmera se afasta do centro assado além disto, em
   * qualquer eixo — a mesma margem que separa tMax da meia-aresta, então
   * o raio nunca sai do cubo entre um bake e o próximo. */
  private static readonly MARGEM_REBAKE = 350;
  /** ≤256 nuvens-semente mais perto do CENTRO do volume (não da câmera),
   * numa DataTexture 256×2 — ver `setBakeSeedClouds`. */
  private static readonly SEMENTES_MAX = 256;
  private sementesTex: THREE.DataTexture;
  private sementesData = new Float32Array(Nebula.SEMENTES_MAX * 2 * 4);
  /** centro do cubo assado, sempre múltiplo de VOXEL_PC; NaN = nenhum
   * bake ainda aconteceu (força o primeiro na próxima render()). */
  private centro = new THREE.Vector3(NaN, NaN, NaN);
  /**
   * O director liga isto ao NuvensSemente depois que o pool do catálogo
   * carrega (`nuvensSemente.construir`). A Nebula PEDE pelo CENTRO do
   * volume, nunca pela câmera direto: quem decide "as ≤256 mais perto de
   * onde o cubo está" é `nuvensSemente.sementesParaBake`, e a Nebula não
   * precisa importar NuvensSemente para isso (evita o ciclo de módulos —
   * nuvensSemente.ts já importa `type Nebula`).
   */
  private pedirSementes: ((centro: THREE.Vector3) => void) | null = null;
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
  /**
   * POEIRA MEDIDA (E2, PLAN.md) — ver GLSL_POEIRA_MEDIDA em
   * shaders/common.ts. `fallbackPoeiraTex` (1×1×1, R16F zerada) é o
   * sampler válido antes do bloco chegar (mesmo papel de
   * `fallbackDustMap`, em 3D); `poeiraTexAtual` é a textura REAL do
   * último bloco entregue por `setPoeiraMedida`, guardada só para o
   * `dispose()` da troca/do fim de vida — nunca lida diretamente, os
   * materiais sempre leem `uPoeiraTex`.
   */
  private fallbackPoeiraTex: THREE.Data3DTexture;
  private poeiraTexAtual: THREE.Data3DTexture | null = null;
  /** o bloco já chegou (setPoeiraMedida com um volume não-nulo)? entra em
   *  `atualizarModoEfetivo`/`poeiraAssentada` — ver os campos abaixo. */
  private poeiraVolumeCarregado = false;
  /**
   * O PEDIDO (`setPoeiraMedida`, sucesso OU falha: fetch nulo, abortado,
   * teto de textura) já ENCERROU pelo menos uma vez? Distinto de
   * `poeiraVolumeCarregado` (que só diz se o bloco está disponível
   * AGORA): uma falha encerra o pedido sem nunca deixar
   * `poeiraVolumeCarregado` verdadeiro — sem este campo, `poeiraAssentada`
   * esperaria para sempre por um fetch que já desistiu (item D, revisão
   * independente — sem prazo artificial, como não há retentativa).
   */
  private poeiraPedidoEncerrado = false;
  /**
   * O modo PEDIDO (setPoeira; 0/1/2 — "teste" já chega como 1 do
   * director). O modo EFETIVO que a GPU recebe (`uPoeiraModo`) só copia
   * este valor quando ele bate com `modoEsperado` da variante ATIVA E o
   * bloco já carregou — `atualizarModoEfetivo` escreve o efetivo nos
   * dois materiais.
   */
  private poeiraModoPedido = 0;
  /**
   * A PIRÂMIDE DA POEIRA (E3c) — o atlas de tijolos, as tabelas de páginas
   * e a residência que decide quem mora no atlas (`setPiramide`); `null`
   * = só o n0, o bloco de 20 pc de sempre. Só é LIDA com a poeira ativa
   * numa variante que a lê (`piramideAtiva`): aí os materiais trocam para
   * os da pirâmide (`aplicarMateriais`); sem ela, o texto de hoje.
   */
  private piramide: PiramideNaGpu | null = null;
  /** os samplers da pirâmide antes dela chegar — tipos certos (R16F no
   *  atlas, R16UI nas tabelas), nunca lidos: com as rampas desligadas o
   *  shader nem pergunta */
  private fallbackAtlas: THREE.Data3DTexture;
  private fallbackTabelas: THREE.Data3DTexture;
  /**
   * O PORTADOR das subidas: uma Data3DTexture de 34³ que NUNCA sobe à GPU
   * — só empresta `image.data` (os bits de um tijolo) a
   * `renderer.copyTextureToTexture`, que, com uma origem que o renderer
   * não conhece, faz um `texSubImage3D` direto da memória para a vaga.
   */
  private portador: THREE.Data3DTexture;
  private posicaoDaSubida = new THREE.Vector3();

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

    // REDESIGN (PLAN.md, 05/09) — o volume assado: 128³, RGBA16F (R =
    // campo estático + sementes, G = lanes×gasDensity, B = envelope, A =
    // ruído da paleta), filtro linear (a única diferença aceita de visual
    // é o borrão da interpolação trilinear). ClampToEdgeWrapping em
    // wrapS/wrapT/wrapR NÃO é passado aqui porque já É o default de
    // Data3DTexture (e de Texture, para S/T) — passar wrapR explícito
    // dispara um aviso inofensivo do three (a primeira passagem de
    // _setTextureOptions, dentro do construtor da classe-base, roda
    // sobre a Texture 2D provisória que WebGL3DRenderTarget ainda vai
    // substituir, e essa não tem wrapR). O raymarch testa a caixa antes
    // de amostrar (ver nebulaDensity em common.ts), então o wrap nem entra.
    this.volumeRT = new THREE.WebGL3DRenderTarget(
      Nebula.VOXEIS,
      Nebula.VOXEIS,
      Nebula.VOXEIS,
      {
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: false,
      }
    );
    // sementes do bake: DataTexture 256×2 (linha 0 = xyz+raio, linha 1 =
    // .x = amplitude), lida por texelFetch em glslBakeDensity — não um
    // array de uniform, que não comportaria 256 slots em todo driver.
    this.sementesTex = new THREE.DataTexture(
      this.sementesData,
      Nebula.SEMENTES_MAX,
      2,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.sementesTex.minFilter = THREE.NearestFilter;
    this.sementesTex.magFilter = THREE.NearestFilter;
    this.sementesTex.generateMipmaps = false;
    this.sementesTex.needsUpdate = true;
    // Poeira medida (E2): 1×1×1 R16F zerada — sampler válido até o
    // primeiro `setPoeiraMedida` (mesmo papel de `fallbackDustMap`, em 3D).
    this.fallbackPoeiraTex = new THREE.Data3DTexture(new Uint16Array([0]), 1, 1, 1);
    this.fallbackPoeiraTex.format = THREE.RedFormat;
    this.fallbackPoeiraTex.type = THREE.HalfFloatType;
    this.fallbackPoeiraTex.minFilter = THREE.LinearFilter;
    this.fallbackPoeiraTex.magFilter = THREE.LinearFilter;
    this.fallbackPoeiraTex.wrapS = THREE.ClampToEdgeWrapping;
    this.fallbackPoeiraTex.wrapT = THREE.ClampToEdgeWrapping;
    this.fallbackPoeiraTex.wrapR = THREE.ClampToEdgeWrapping;
    this.fallbackPoeiraTex.needsUpdate = true;
    // A pirâmide (E3c): os dois samplers de reserva e o portador das
    // subidas — ver os campos. Nada disto toca a GPU sem a pirâmide.
    this.fallbackAtlas = texturaDoAtlas(new Uint16Array([0]), [1, 1, 1]);
    this.fallbackTabelas = texturaDasTabelas(new Uint16Array([0]), [1, 1, 1]);
    this.portador = new THREE.Data3DTexture(null, LADO_DA_VAGA, LADO_DA_VAGA, LADO_DA_VAGA);
    this.portador.format = THREE.RedFormat;
    this.portador.type = THREE.HalfFloatType;
    this.volumeMaterial = new THREE.ShaderMaterial({
      vertexShader: NEBULA_VERT,
      fragmentShader: nebulaBakeFrag(VARIANTE_DE_NASCENCA),
      uniforms: {
        uFatia: { value: 0 },
        uDustMap: { value: this.fallbackDustMap },
        uSeedCloudTex: { value: this.sementesTex },
        uSeedCloudCount: { value: 0 },
        uVolMin: { value: new THREE.Vector3() },
        uVolTamanho: { value: new THREE.Vector3(1, 1, 1).multiplyScalar(2 * Nebula.MEIA_ARESTA) },
        // Poeira medida (E2) — ver GLSL_POEIRA_MEDIDA em shaders/common.ts
        // e `atualizarModoEfetivo`/`setPoeira`/`setPoeiraMedida` abaixo.
        uPoeiraTex: { value: this.fallbackPoeiraTex },
        uPoeiraMin: { value: new THREE.Vector3() },
        uPoeiraTamanho: { value: new THREE.Vector3(1, 1, 1) },
        uPoeiraEscala: { value: 1 },
        uPoeiraRaios: { value: new THREE.Vector2() },
        uPoeiraModo: { value: 0 },
        uPoeiraGanho: { value: 46.9 },
        uPoeiraGama: { value: 1 },
        uPoeiraLanes: { value: 0 },
      },
      depthWrite: false,
      depthTest: false,
    });
    this.materiaisBake.set(VARIANTE_DE_NASCENCA, this.volumeMaterial);
    this.volumeQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.volumeMaterial);
    this.volumeQuad.frustumCulled = false;
    this.volumeScene.add(this.volumeQuad);

    this.material = new THREE.ShaderMaterial({
      vertexShader: NEBULA_VERT,
      fragmentShader: nebulaFrag(VARIANTE_DE_NASCENCA),
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
        // REDESIGN (PLAN.md, 05/09): o volume assado que o caminho novo lê
        // a cada amostra — ver `bake()` e `nebulaDensity(p, t)` em
        // common.ts. `uVolMin` MUDA a cada re-bake (o cubo segue a
        // câmera); `uVolTamanho` é a mesma aresta constante do bake.
        uVolume: { value: this.volumeRT.texture },
        uVolMin: { value: new THREE.Vector3() },
        uVolTamanho: { value: new THREE.Vector3(1, 1, 1).multiplyScalar(2 * Nebula.MEIA_ARESTA) },
        // Poeira medida (E2) — mesmos uniforms de `this.volumeMaterial`
        // acima, em objetos SEPARADOS (mesmo padrão de uVolMin/uVolTamanho
        // nesta classe): o raymarch ainda não os lê nesta etapa, só os
        // recebe para a E3 não precisar voltar aqui.
        uPoeiraTex: { value: this.fallbackPoeiraTex },
        uPoeiraMin: { value: new THREE.Vector3() },
        uPoeiraTamanho: { value: new THREE.Vector3(1, 1, 1) },
        uPoeiraEscala: { value: 1 },
        uPoeiraRaios: { value: new THREE.Vector2() },
        uPoeiraModo: { value: 0 },
        uPoeiraGanho: { value: 46.9 },
        uPoeiraGama: { value: 1 },
        uPoeiraLanes: { value: 0 },
        // A pirâmide (E3c) — só os fragments DELA declaram estes (ver
        // GLSL_POEIRA_NIVEIS em shaders/common.ts); o texto de hoje não os
        // lê, e o three ignora uniform que o programa não tem.
        uPoeiraAtlas: { value: this.fallbackAtlas },
        uPoeiraTabelas: { value: this.fallbackTabelas },
        uPoeiraAtlasTexel: { value: new THREE.Vector3(1, 1, 1) },
        uPoeiraVagas: { value: new THREE.Vector3(1, 1, 1) },
        uPoeiraNivel: {
          value: Array.from({ length: NIVEIS_DA_PIRAMIDE_NO_SHADER }, () => new THREE.Vector4(0, 0, 0, 1)),
        },
        uPoeiraNivelTijolos: {
          value: Array.from({ length: NIVEIS_DA_PIRAMIDE_NO_SHADER }, () => new THREE.Vector4(1, 1, 1, 0)),
        },
        uPoeiraNivelRaios: {
          value: Array.from({ length: NIVEIS_DA_PIRAMIDE_NO_SHADER }, () =>
            new THREE.Vector4(...RAMPAS_DESLIGADAS)
          ),
        },
        uPoeiraNivelEscala: { value: new Float32Array(NIVEIS_DA_PIRAMIDE_NO_SHADER) },
      },
      depthWrite: false,
      depthTest: false,
    });
    this.materiaisRaymarch.set(VARIANTE_DE_NASCENCA, this.material);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  /**
   * O material do raymarch para uma variante, do cache ou construído na
   * hora — todos os materiais desta lista COMPARTILHAM o mesmo objeto de
   * uniforms (o de `this.material`, que nasce com `VARIANTE_DE_NASCENCA`
   * e nunca muda de identidade): trocar de variante troca só o fragment
   * que lê os mesmos uniforms, então nenhum setter (`setFade`,
   * `setCavity`...) precisa saber que a variante mudou.
   */
  private materialDoRaymarch(v: GasVolumetrico, piramide = false): THREE.ShaderMaterial {
    // a pirâmide (E3c) é outra chave do cache só onde muda o texto: o
    // antigo nunca lê a poeira
    const comPiramide = piramide && v !== 'antigo';
    const chave = comPiramide ? `${v}+piramide` : v;
    let m = this.materiaisRaymarch.get(chave);
    if (!m) {
      m = new THREE.ShaderMaterial({
        vertexShader: NEBULA_VERT,
        fragmentShader: nebulaFrag(v, comPiramide),
        uniforms: this.material.uniforms,
        depthWrite: false,
        depthTest: false,
      });
      this.materiaisRaymarch.set(chave, m);
    }
    return m;
  }

  /**
   * O material do bake para uma variante — mesmo contrato do raymarch,
   * mas só fino/macio: o caminho antigo nunca assa (ver `render()`), e
   * quem chama aqui já garantiu isso.
   */
  private materialDoBake(
    v: Exclude<GasVolumetrico, 'antigo'>,
    piramide = false
  ): THREE.ShaderMaterial {
    // a pirâmide (E3c) só muda o bake do macio (o medido sai dele); o do
    // fino não assa o medido nem hoje, e o texto é o mesmo
    const comPiramide = piramide && v === 'macio';
    const chave = comPiramide ? `${v}+piramide` : v;
    let m = this.materiaisBake.get(chave);
    if (!m) {
      m = new THREE.ShaderMaterial({
        vertexShader: NEBULA_VERT,
        fragmentShader: nebulaBakeFrag(v, comPiramide),
        uniforms: this.volumeMaterial.uniforms,
        depthWrite: false,
        depthTest: false,
      });
      this.materiaisBake.set(chave, m);
    }
    return m;
  }

  /**
   * A PIRÂMIDE É LIDA AGORA? Presente E a poeira ativa (modo efetivo ≠ 0:
   * pedida, n0 carregado e uma variante que a lê — ver
   * `atualizarModoEfetivo`). Falso = os materiais de hoje, texto idêntico.
   */
  private get piramideAtiva(): boolean {
    return this.piramide !== null && (this.material.uniforms.uPoeiraModo.value as number) !== 0;
  }

  /**
   * OS MATERIAIS DA VEZ, num lugar só: os da variante, com ou sem a
   * pirâmide (`piramideAtiva`). Chamada por `setVariante`,
   * `atualizarModoEfetivo` e `setPiramide` — as três coisas de que a
   * escolha depende. Trocar o bake (o do macio com a pirâmide guarda só
   * o inventado) reassa; trocar o raymarch refaz a imagem.
   */
  private aplicarMateriais() {
    const ativa = this.piramideAtiva;
    const m = this.materialDoRaymarch(this.variante, ativa);
    if (m !== this.material) {
      this.material = m;
      this.quad.material = m;
      this.sujo = true;
    }
    if (this.variante === 'antigo') return;
    const b = this.materialDoBake(this.variante, ativa);
    if (b !== this.volumeMaterial) {
      this.volumeMaterial = b;
      this.volumeQuad.material = b;
      this.volumeSujo = true;
    }
  }

  /**
   * A VARIANTE DO GÁS VOLUMÉTRICO, TROCADA AO VIVO (item 145b) — troca
   * só o `material`/`volumeMaterial` dos dois quads fullscreen, os
   * mesmos uniforms por baixo. `fino` e `macio` têm layouts de canal
   * DIFERENTES no volume assado (ver `glslBakeDensity` em common.ts),
   * então a troca marca `volumeSujo`: o próximo `render()` reassa antes
   * do raymarch, sempre — não há como aproveitar o volume da variante
   * anterior. `antigo` não tem bake (`volumeMaterial` fica como estava,
   * intocado — `render()` nunca o usa nesse caminho).
   */
  setVariante(v: GasVolumetrico) {
    if (v === this.variante) return;
    this.variante = v;
    this.aplicarMateriais();
    if (v !== 'antigo') this.volumeSujo = true;
    // a imagem mudou: o quadro congelado (item 144) precisa refazer o
    // raymarch mesmo com a câmera parada, senão o céu da variante
    // anterior persistiria
    this.sujo = true;
    // poeira medida (E2): só o macio a assa — trocar para fino/antigo
    // tem de zerar `uPoeiraModo` (ver `atualizarModoEfetivo`), senão o
    // material do macio ficaria com o modo ligado escondido no cache.
    this.atualizarModoEfetivo();
  }

  /**
   * O modo que ESTA variante consumiria se o pedido combinasse e o bloco
   * já tivesse chegado — 0 para 'antigo' (nunca lê a poeira), 1 para
   * 'macio' (assado, `nebulaBake`), 2 para 'fino' (direto, ao vivo em
   * `nebulaDensity`/`glslBakeDensity`; ver GLSL_POEIRA_MEDIDA em
   * shaders/common.ts). A MESMA régua decide o que a GPU recebe
   * (`atualizarModoEfetivo`) e o que `poeiraAssentada` espera.
   */
  private get modoEsperado(): number {
    return this.variante === 'macio' ? 1 : this.variante === 'fino' ? 2 : 0;
  }

  /**
   * O modo EFETIVO que a GPU está recebendo agora (`uPoeiraModo` — ver
   * `atualizarModoEfetivo` abaixo) — 0 quando a poeira não é lida (não
   * pedida, bloco ainda não chegado, ou a variante ativa é 'antigo').
   * Único consumidor: `Director.estadoDaPoeira` (revisão independente,
   * 27/09), para dizer 'inativa' (volume disponível, variante não lê)
   * sem duplicar a conta que já vive aqui.
   */
  get poeiraModoEfetivo(): number {
    return this.material.uniforms.uPoeiraModo.value as number;
  }

  /**
   * O modo EFETIVO da poeira medida (`uPoeiraModo` que a GPU recebe): 0 a
   * menos que a poeira esteja PEDIDA (qualquer pedido ≠ 0: o pedido é só
   * "ligada"; a TÉCNICA — 1 assada no macio, 2 direta no fino — é da
   * variante ativa, `modoEsperado`) E o bloco já tenha chegado — sem isso,
   * `?poeira=1` pintaria cobertura sobre a caixa 1×1×1 zerada enquanto o
   * fetch assíncrono de `carregarVolumeDePoeira` ainda voa. Chamada por
   * `setPoeira`, `setPoeiraMedida` e `setVariante` — as três coisas de que
   * o efetivo depende.
   */
  private atualizarModoEfetivo() {
    const esperado = this.modoEsperado;
    const efetivo =
      esperado !== 0 && this.poeiraModoPedido !== 0 && this.poeiraVolumeCarregado
        ? esperado
        : 0;
    if (this.material.uniforms.uPoeiraModo.value === efetivo) return;
    this.material.uniforms.uPoeiraModo.value = efetivo;
    this.volumeMaterial.uniforms.uPoeiraModo.value = efetivo;
    this.volumeSujo = true;
    this.sujo = true;
    // a pirâmide (E3c) só é lida com a poeira ativa: ligar/desligar o
    // efetivo troca os materiais (com ela ↔ os de hoje)
    this.aplicarMateriais();
  }

  /**
   * `?poeira=`/`?poeiragain=`/`?poeiragama=`/`?poeiralanes=` (director.ts,
   * mesmo padrão de leitura de `cart=off`) — ver `poeiraDensidadeApp` e
   * `nebulaBake` em shaders/common.ts. `modo` é o PEDIDO (0/1/2, "teste"
   * já chega como 1); o EFETIVO é recalculado no fim (ver
   * `atualizarModoEfetivo`). LIMITES (item E, revisão independente):
   * `ganho`/`gama`/`lanes` fora da faixa (ou NaN) são clampados/trocados
   * pelo padrão aqui — defesa de segunda linha; director.ts já clampa o
   * que vem da URL.
   */
  setPoeira({
    modo,
    ganho,
    gama,
    lanes,
  }: {
    modo: number;
    ganho: number;
    gama: number;
    lanes: number;
  }) {
    // `poeiraModoPedido` é só o campo-fonte: quem decide se algo precisa
    // reassar é `atualizarModoEfetivo` (compara o EFETIVO, não o pedido
    // cru) — variante 'fino' pedindo modo 1 não pode sujar o volume, ou
    // o quadro congelado (item 144) reassaria sem nenhum pixel mudar.
    this.poeiraModoPedido = modo;
    const ganhoClamp = Number.isFinite(ganho) ? THREE.MathUtils.clamp(ganho, 0, 500) : 46.9;
    const gamaClamp = Number.isFinite(gama) ? THREE.MathUtils.clamp(gama, 0.2, 3) : 1;
    const lanesClamp = Number.isFinite(lanes) ? THREE.MathUtils.clamp(lanes, 0, 1) : 0;
    const u = this.material.uniforms;
    const uv = this.volumeMaterial.uniforms;
    // GANHO/GAMA/LANES NO FINO NÃO PEDEM REBAKE (item 7, revisão
    // independente v2, 27/09): no modo efetivo 2 (fino) os três são
    // consumidos AO VIVO por amostra no raymarch (nebulaDensity, ver
    // GLSL_POEIRA_MEDIDA em shaders/common.ts) — só a IMAGEM precisa
    // refazer (`sujo`), nunca as 128 fatias do bake (`volumeSujo`), que
    // nem os lê. Só o modo 1 (macio) os assa dentro do voxel
    // (`nebulaBake`), e por isso ainda pede os dois. Mesmo cálculo de
    // `atualizarModoEfetivo` (chamada abaixo, que só reage a MUDANÇA de
    // modo): `poeiraModoPedido` já está atualizado acima, então já
    // reflete o efetivo que este `setPoeira` está pedindo.
    const esperado = this.modoEsperado;
    const efetivo =
      esperado !== 0 && this.poeiraModoPedido !== 0 && this.poeiraVolumeCarregado ? esperado : 0;
    // com a pirâmide no macio (E3c) o bake guarda só o inventado — o
    // medido, com ganho/gama/lanes, é lido por passo, como no fino
    const precisaRebake = efetivo === 1 && this.piramide === null;
    if (u.uPoeiraGanho.value !== ganhoClamp) {
      u.uPoeiraGanho.value = ganhoClamp;
      uv.uPoeiraGanho.value = ganhoClamp;
      if (precisaRebake) this.volumeSujo = true;
      this.sujo = true;
    }
    if (u.uPoeiraGama.value !== gamaClamp) {
      u.uPoeiraGama.value = gamaClamp;
      uv.uPoeiraGama.value = gamaClamp;
      if (precisaRebake) this.volumeSujo = true;
      this.sujo = true;
    }
    if (u.uPoeiraLanes.value !== lanesClamp) {
      u.uPoeiraLanes.value = lanesClamp;
      uv.uPoeiraLanes.value = lanesClamp;
      if (precisaRebake) this.volumeSujo = true;
      this.sujo = true;
    }
    this.atualizarModoEfetivo();
  }

  /**
   * O bloco de poeira medida chegou (E1: `dust-near-20pc.bin`, ou o
   * volume sintético de `?poeira=teste`) — ou `null` se o fetch falhou,
   * foi abortado, ou o teto de textura do aparelho o recusou (director.ts
   * só chama isto depois de PEDIR a poeira — `?cart=off`/manifesto sem
   * `dustVolumeNear20pc` nem chegam a disparar o fetch, ver
   * `Director.definirPoeira`). Cria a `Data3DTexture` R16F (linear,
   * ClampToEdge nos três eixos — `dados` já são os bits crus do
   * half-float, little-endian) e escreve os uniforms nos DOIS materiais.
   * `null` destrói a textura anterior e volta à 1×1×1 zerada. Em QUALQUER
   * dos dois casos marca `poeiraPedidoEncerrado` (item D: uma falha não
   * espera para sempre) e chama `atualizarModoEfetivo`, que é quem decide
   * `volumeSujo`/`sujo` — CARGA PREGUIÇOSA (item C, revisão
   * independente): o bloco pode chegar com o pedido em 0 (nenhuma
   * variante o lendo ainda), e reassar as 128 fatias por nada seria
   * exatamente o custo que a carga preguiçosa evita.
   *
   * TROCA DE FONTE AO VIVO (item A, revisão independente v2, 27/09):
   * `atualizarModoEfetivo` só suja o volume/a imagem quando o modo
   * EFETIVO troca de VALOR — trocar um volume JÁ carregado por outro
   * (o director redisparando com uma fonte nova, mesma variante ativa)
   * mantém o mesmo efetivo, e ela voltava sem marcar nada: o bloco
   * assado continuava sendo o da textura ANTERIOR, mesmo com
   * `uPoeiraTex` já apontando para a nova. Por isso, com uma textura
   * NOVA (não o ramo `null` abaixo), o efetivo resultante ≥ 1 força a
   * invalidação de novo — efetivo 0 (nada lê a poeira) continua sem
   * reassar, não há nada que o bake precise refazer.
   */
  setPoeiraMedida(volume: VolumeDePoeira | null) {
    const texAnterior = this.poeiraTexAtual;
    const u = this.material.uniforms;
    const uv = this.volumeMaterial.uniforms;
    this.poeiraPedidoEncerrado = true;
    if (!volume) {
      this.poeiraVolumeCarregado = false;
      u.uPoeiraTex.value = this.fallbackPoeiraTex;
      uv.uPoeiraTex.value = this.fallbackPoeiraTex;
      this.poeiraTexAtual = null;
      texAnterior?.dispose();
      this.atualizarModoEfetivo();
      return;
    }
    const { descritor, dados } = volume;
    const [nx, ny, nz] = descritor.dims;
    const tex = new THREE.Data3DTexture(dados, nx, ny, nz);
    tex.format = THREE.RedFormat;
    tex.type = THREE.HalfFloatType;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.wrapR = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    this.poeiraTexAtual = tex;
    this.poeiraVolumeCarregado = true;
    const min = new THREE.Vector3(descritor.originPc[0], descritor.originPc[1], descritor.originPc[2]);
    const tamanho = new THREE.Vector3(nx, ny, nz).multiplyScalar(descritor.voxelPc);
    for (const uniforms of [u, uv]) {
      uniforms.uPoeiraTex.value = tex;
      (uniforms.uPoeiraMin.value as THREE.Vector3).copy(min);
      (uniforms.uPoeiraTamanho.value as THREE.Vector3).copy(tamanho);
      uniforms.uPoeiraEscala.value = 1 / descritor.scale;
      (uniforms.uPoeiraRaios.value as THREE.Vector2).set(
        descritor.innerRadiusPc,
        descritor.outerRadiusPc
      );
    }
    texAnterior?.dispose();
    this.atualizarModoEfetivo();
    if ((this.material.uniforms.uPoeiraModo.value as number) >= 1) {
      this.volumeSujo = true;
      this.sujo = true;
    }
  }

  /**
   * PRONTIDÃO DA CAPTURA (E2/E3, item D — revisão independente): separa
   * "pedido ENCERRADO" (sucesso ou falha — `poeiraPedidoEncerrado`) de
   * "volume DISPONÍVEL" (`poeiraVolumeCarregado`). `poeiraAssentada` é:
   * não pedida (nada a esperar) OU pedido encerrado com FALHA (sem prazo
   * artificial — não há retentativa, então uma falha é definitiva) OU
   * (disponível E assada pelo menos uma vez desde que chegou).
   * `director.ts` usa isto em `get captura` para a foto não saltar na
   * frente do fetch assíncrono de `carregarVolumeDePoeira`, que não
   * perturba `quadrosEstaveis` por si só. `director.ts` compõe isto com
   * `this.cartMode === 'off'` (sem cartografia, o fetch nem é disparado).
   */
  get poeiraAssentada(): boolean {
    const esperado = this.modoEsperado;
    const pedida = esperado !== 0 && this.poeiraModoPedido !== 0;
    if (!pedida) return true;
    if (this.poeiraPedidoEncerrado && !this.poeiraVolumeCarregado) return true;
    // gás apagado (director pula `render()` com fade ≤ 0,02: vistas de
    // escala galáctica, fora do disco): o bake pendente nunca vai rodar
    // e não aparece — nada a esperar (achado da revisão de 27/09: t=153/167
    // com poeira ligada esperavam o teto de segurança da prontidão)
    const apagada = (this.material.uniforms.uFade.value as number) <= 0.02;
    return this.poeiraVolumeCarregado && (!this.volumeSujo || apagada);
  }

  /**
   * A PIRÂMIDE DA POEIRA CHEGOU (E3c) — ou `null`: sem ela, ou ao trocar
   * de fonte, de orçamento, ou na perda de contexto. Monta a GPU dela: o
   * ATLAS (vagas de 34³, R16F, só reservado), a PILHA de tabelas de
   * páginas (R16UI; a tabela inteira de cada nível sobe aqui, com os
   * OMITIDOS já marcados) e a RESIDÊNCIA, que decide a cada quadro quem
   * mora no atlas (`atualizarPiramide`). A velha é descartada inteira —
   * buscas abortadas, texturas soltas — depois que os uniforms já não a
   * apontam. Até `NIVEIS_DA_PIRAMIDE_NO_SHADER` níveis; um orçamento sem
   * vaga é o mesmo que nenhuma pirâmide.
   */
  setPiramide(
    entrada: { piramide: PiramideDePoeira; fonte: FonteDeTijolos; orcamento: OrcamentoDaPiramide } | null
  ) {
    const velha = this.piramide;
    this.piramide = null;
    velha?.residencia.descartar();
    const u = this.material.uniforms;
    const niveis = entrada ? entrada.piramide.niveis.slice(0, NIVEIS_DA_PIRAMIDE_NO_SHADER) : [];
    const nivelDoShader = u.uPoeiraNivel.value as THREE.Vector4[];
    const tijolosDoShader = u.uPoeiraNivelTijolos.value as THREE.Vector4[];
    const raiosDoShader = u.uPoeiraNivelRaios.value as THREE.Vector4[];
    const escalaDoShader = u.uPoeiraNivelEscala.value as Float32Array;
    for (let i = 0; i < NIVEIS_DA_PIRAMIDE_NO_SHADER; i++) {
      nivelDoShader[i].set(0, 0, 0, 1);
      tijolosDoShader[i].set(1, 1, 1, 0);
      raiosDoShader[i].set(...RAMPAS_DESLIGADAS);
      escalaDoShader[i] = 0;
    }
    if (entrada && niveis.length > 0 && entrada.orcamento.vagas > 0) {
      const residencia = new ResidenciaDaPiramide({ niveis }, entrada.orcamento, entrada.fonte);
      const pilha = empilharTabelas(niveis.map((n) => n.dimsEmTijolos));
      const dadosDasTabelas = new Uint16Array(pilha.largura * pilha.altura * pilha.profundidade);
      niveis.forEach((n, i) => {
        const tabela = residencia.tabela(n.nivel);
        if (!tabela) return;
        for (let indice = 0; indice < tabela.length; indice++) {
          dadosDasTabelas[texelNaPilha(pilha, i, n.dimsEmTijolos, indice)] = tabela[indice];
        }
        const [ox, oy, oz] = n.origemPc;
        nivelDoShader[i].set(ox, oy, oz, n.voxelPc);
        tijolosDoShader[i].set(...n.dimsEmTijolos, pilha.deslocamentoZ[i]);
        raiosDoShader[i].set(...raiosDoNivel(n));
        escalaDoShader[i] = 1 / n.escala;
      });
      const tabelas = texturaDasTabelas(dadosDasTabelas, [pilha.largura, pilha.altura, pilha.profundidade]);
      const { layout } = entrada.orcamento;
      const atlas = texturaDoAtlas(null, layout.texels);
      this.piramide = {
        residencia,
        niveis,
        pilha,
        dadosDasTabelas,
        tabelas,
        atlas,
        vagas: entrada.orcamento.vagas,
        atualizada: false,
        carregandoDesdeS: null,
        agoraS: 0,
      };
      u.uPoeiraAtlas.value = atlas;
      u.uPoeiraTabelas.value = tabelas;
      (u.uPoeiraAtlasTexel.value as THREE.Vector3).set(
        1 / layout.texels[0],
        1 / layout.texels[1],
        1 / layout.texels[2]
      );
      (u.uPoeiraVagas.value as THREE.Vector3).set(...layout.vagasPorEixo);
    } else {
      u.uPoeiraAtlas.value = this.fallbackAtlas;
      u.uPoeiraTabelas.value = this.fallbackTabelas;
    }
    this.aplicarMateriais();
    this.sujo = true;
    velha?.atlas.dispose();
    velha?.tabelas.dispose();
  }

  /** as vagas da pirâmide no ar (0 = nenhuma) — o director compara com o
   *  orçamento do tier para remontar quando ele muda */
  get vagasDaPiramide(): number {
    return this.piramide?.vagas ?? 0;
  }

  /** o resumo da residência (diagnóstico: `__director.nebula`) */
  get resumoDaPiramide(): ResumoDaResidencia | null {
    return this.piramide?.residencia.resumo() ?? null;
  }

  /**
   * A CADA QUADRO, antes do desenho (E3c): a câmera vai à residência, no
   * referencial do bloco, e o lote que ela devolve sobe INTEIRO — os
   * tijolos direto nas vagas do atlas (`texSubImage3D` pelo portador), as
   * mudanças na cópia da pilha de tabelas, que sobe no próximo desenho
   * que a ler. É nessa fronteira que vale a garantia da residência:
   * nenhuma entrada aponta para uma vaga com outro tijolo dentro. Sem a
   * pirâmide ativa não faz nada — nem busca (o Gaia desligado, o gás
   * antigo ou o n0 ainda em voo não pedem tijolo). `tS` é o relógio de
   * parede do app (o do tick), o mesmo da carência das texturas.
   */
  atualizarPiramide(renderer: THREE.WebGLRenderer, tS: number, camera: THREE.Camera) {
    const p = this.piramide;
    if (!p || !this.piramideAtiva) return;
    const pos = camera.position;
    camera.getWorldDirection(this.scratchFwd);
    const lote = p.residencia.atualizar(tS, {
      posicaoPc: cenaParaHelioGalactico(pos.x, pos.y, pos.z),
      frente: cenaParaHelioGalactico(this.scratchFwd.x, this.scratchFwd.y, this.scratchFwd.z),
    });
    this.aplicarLote(renderer, p, lote);
    p.atualizada = true;
    p.agoraS = tS;
    if (!p.residencia.carregando) p.carregandoDesdeS = null;
    else p.carregandoDesdeS ??= tS;
  }

  private aplicarLote(renderer: THREE.WebGLRenderer, p: PiramideNaGpu, lote: LoteParaGpu) {
    if (lote.subidas.length === 0 && lote.mudancas.length === 0) return;
    for (const subida of lote.subidas) {
      this.portador.image.data = subida.dados;
      this.posicaoDaSubida.set(...subida.origemTexel);
      renderer.copyTextureToTexture(this.portador, p.atlas, null, this.posicaoDaSubida);
    }
    // o portador não segura bytes que a residência pode soltar
    this.portador.image.data = null;
    for (const mudanca of lote.mudancas) {
      const i = p.niveis.findIndex((n) => n.nivel === mudanca.nivel);
      if (i < 0) continue;
      p.dadosDasTabelas[texelNaPilha(p.pilha, i, p.niveis[i].dimsEmTijolos, mudanca.indice)] =
        mudanca.codigo;
    }
    if (lote.mudancas.length > 0) p.tabelas.needsUpdate = true;
    // a imagem mudou: o quadro congelado (item 144) refaz o raymarch
    this.sujo = true;
  }

  /**
   * PRONTIDÃO DA CAPTURA para a pirâmide (E3c): nada a esperar sem ela,
   * sem ela ativa ou com o gás apagado; com ela, espera a residência
   * rodar pela primeira vez e assentar (`carregando` falso — todo tijolo
   * do alvo numa vaga, nenhuma busca no ar), com o teto
   * `TETO_DA_ESPERA_DA_PIRAMIDE_S` para a rede que não responde.
   */
  get piramideAssentada(): boolean {
    const p = this.piramide;
    if (!p || !this.piramideAtiva) return true;
    if ((this.material.uniforms.uFade.value as number) <= 0.02) return true;
    if (!p.atualizada) return false;
    if (!p.residencia.carregando) return true;
    return p.carregandoDesdeS !== null && p.agoraS - p.carregandoDesdeS >= TETO_DA_ESPERA_DA_PIRAMIDE_S;
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
    // o bake lê o MESMO mapa (diskGasEnvelope dentro de nebulaBake) —
    // reassa na próxima render()
    this.volumeMaterial.uniforms.uDustMap.value = texture;
    this.volumeSujo = true;
    this.lutDirty = true;
    this.sujo = true;
  }

  /**
   * Nuvens-semente do catálogo perto da câmera: entradas
   * [x, y, z, raio, amplitude] em pc na cena. Só alimenta a variante
   * ANTIGA (item 145b, `Nebula.setVariante('antigo')`) — as outras duas
   * leem o volume assado, que usa `setBakeSeedClouds` abaixo.
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

  /**
   * REDESIGN (PLAN.md, 05/09) — as ≤256 nuvens-semente mais perto do
   * CENTRO do volume assado (não da câmera — o cubo pode estar até 350 pc
   * à frente dela), sem fade de fronteira: reassar já é o evento
   * discreto que escondia o popping no caminho antigo (32 slots, seleção
   * por proximidade da câmera a cada 0,25 s). Escreve na DataTexture
   * 256×2 que `glslBakeDensity` lê por `texelFetch` — não um array de
   * uniform, que não caberia. Chamada de dentro de `bake()`, via
   * `pedirSementes`, nunca direto pelo director.
   */
  setBakeSeedClouds(entries: Float32Array, count: number) {
    const n = Math.min(count, Nebula.SEMENTES_MAX);
    const d = this.sementesData;
    d.fill(0);
    for (let i = 0; i < n; i++) {
      const o = i * 5;
      // linha 0 (y=0): texel i = xyz + raio
      const p0 = i * 4;
      d[p0] = entries[o];
      d[p0 + 1] = entries[o + 1];
      d[p0 + 2] = entries[o + 2];
      d[p0 + 3] = entries[o + 3];
      // linha 1 (y=1): texel i, canal .x = amplitude crua (sem fade)
      const p1 = Nebula.SEMENTES_MAX * 4 + i * 4;
      d[p1] = entries[o + 4];
    }
    this.sementesTex.needsUpdate = true;
    this.volumeMaterial.uniforms.uSeedCloudCount.value = n;
  }

  /**
   * Liga o pedido de sementes ao NuvensSemente — ver o comentário do
   * campo `pedirSementes` acima. Chamada uma vez, quando o pool do
   * catálogo nasce (`nuvensSemente.construir`).
   */
  setPedirSementes(cb: (centro: THREE.Vector3) => void) {
    this.pedirSementes = cb;
  }

  /**
   * Força um reassar na próxima `render()` — para insumos do bake que
   * não têm setter próprio (o pool de sementes acabou de nascer, por
   * exemplo: o centro não mudou, então `foraDaMargem` não pegaria isso
   * sozinho).
   */
  marcarVolumeSujo() {
    this.volumeSujo = true;
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

  /**
   * A câmera saiu da margem assada, ou nenhum bake aconteceu ainda
   * (`centro` nasce NaN — qualquer comparação com NaN é falsa, por isso
   * o `!Number.isFinite` explícito em vez de confiar no `>`).
   */
  private precisaRecentrar(camPos: THREE.Vector3): boolean {
    if (!Number.isFinite(this.centro.x)) return true;
    return (
      Math.abs(camPos.x - this.centro.x) > Nebula.MARGEM_REBAKE ||
      Math.abs(camPos.y - this.centro.y) > Nebula.MARGEM_REBAKE ||
      Math.abs(camPos.z - this.centro.z) > Nebula.MARGEM_REBAKE
    );
  }

  /**
   * Recentra `centro` na câmera, arredondado a múltiplos de VOXEL_PC: um
   * re-bake num centro novo tem que amostrar as MESMAS posições de mundo
   * que o bake anterior amostrava, senão o gás treme (cada ponto do
   * espaço cairia num offset de sub-voxel diferente a cada bake).
   */
  private recentrar(camPos: THREE.Vector3) {
    const v = Nebula.VOXEL_PC;
    this.centro.set(
      Math.round(camPos.x / v) * v,
      Math.round(camPos.y / v) * v,
      Math.round(camPos.z / v) * v
    );
    const min = this.centro.clone().subScalar(Nebula.MEIA_ARESTA);
    (this.volumeMaterial.uniforms.uVolMin.value as THREE.Vector3).copy(min);
    (this.material.uniforms.uVolMin.value as THREE.Vector3).copy(min);
  }

  /**
   * REDESIGN (PLAN.md, 05/09; item 145b) — reassa as 128 fatias do
   * volume 3D. Chamada de `render()`, ANTES do raymarch, só quando
   * `volumeSujo` (insumo sem posição mudou, ou `setVariante` trocou
   * fino/macio) ou a câmera saiu da margem, e só nas duas variantes que
   * assam (`this.variante !== 'antigo'` — a variante antiga nunca lê a
   * textura, então nunca assa). `pedirSementes` roda ANTES do laço: o bake precisa da textura de
   * sementes já atualizada para o centro que `render()` acabou de fixar.
   * `renderer.setRenderTarget(rt, fatia)` grava a fatia de PROFUNDIDADE
   * `fatia` do Data3DTexture — é a peça de `WebGL3DRenderTarget` que faz
   * um passe fullscreen 2D assar um volume 3D, uma camada por vez.
   */
  private bake(renderer: THREE.WebGLRenderer) {
    const t0 = performance.now();
    this.pedirSementes?.(this.centro);
    const prev = renderer.getRenderTarget();
    const uFatia = this.volumeMaterial.uniforms.uFatia;
    for (let fatia = 0; fatia < Nebula.VOXEIS; fatia++) {
      uFatia.value = fatia;
      renderer.setRenderTarget(this.volumeRT, fatia);
      renderer.render(this.volumeScene, this.camera);
    }
    renderer.setRenderTarget(prev);
    this.volumeSujo = false;
    // o volume mudou: o quadro congelado (item 144) precisa refazer o
    // raymarch mesmo com a câmera parada, senão o céu antigo persistiria
    this.sujo = true;
    // CUSTO DA SUBMISSÃO (CPU) DO BAKE (item G, revisão independente):
    // sempre medido — custa nada e não depende de dev —, para `?fps=1`
    // (director.ts/contadorDeFps.ts) mostrar na tela sem abrir o
    // DevTools. RENOMEADO de "ultimoMs": as 128 chamadas de
    // `renderer.render` daqui só devolvem depois de SUBMETER o desenho —
    // não medem a conclusão na GPU, que pode terminar bem depois (daí
    // `bakeCpuMs`, não `bakeMs`). `diagnosticoDaPoeira()` (lib/, item 1
    // — revisão independente v2, 27/09) é o inicializador ÚNICO de
    // `window.__poeira`, partilhado com `Director.tick`: sem ele, o
    // objeto podia nascer PARCIAL (o outro lado escreve primeiro, só com
    // os campos dele) e o `.push` abaixo explodia em `bakesMs` ausente —
    // a mesma função devolve um objeto local sob `environment: node`
    // (nebula.test.ts), então este método não precisa mais da sua
    // própria guarda de `typeof window`.
    const ms = performance.now() - t0;
    const d = diagnosticoDaPoeira();
    d.bakesMs.push(ms);
    if (d.bakesMs.length > 20) d.bakesMs.shift();
    d.bakeCpuMs = ms;
    d.bakes += 1; // contagem desde a marca (`reiniciar()` zera)
  }

  render(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
    if (this.variante !== 'antigo') {
      const recentrar = this.precisaRecentrar(camera.position);
      if (recentrar) this.recentrar(camera.position);
      if (this.volumeSujo || recentrar) this.bake(renderer);
    }
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
    // a pirâmide (E3c) primeiro: buscas abortadas, atlas e tabelas soltos
    // — e o material de hoje que ela devolve à tela entra no cache antes
    // do laço que descarta todos, logo abaixo
    this.setPiramide(null);
    this.rt.dispose();
    this.rtBlur.dispose();
    this.lutRT.dispose();
    this.volumeRT.dispose();
    // TODOS os materiais em cache (item 145b) — não só o que está no ar:
    // `setVariante` nunca descarta o anterior (é a troca ao vivo sem
    // recompilar de novo), então o dono deles é o `dispose` final.
    for (const m of this.materiaisRaymarch.values()) m.dispose();
    for (const m of this.materiaisBake.values()) m.dispose();
    this.blurMaterial.dispose();
    this.lutMaterial.dispose();
    this.sementesTex.dispose();
    this.fallbackDustMap.dispose();
    this.fallbackPoeiraTex.dispose();
    this.poeiraTexAtual?.dispose();
    this.fallbackAtlas.dispose();
    this.fallbackTabelas.dispose();
    this.portador.dispose();
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
    this.volumeScene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
}
