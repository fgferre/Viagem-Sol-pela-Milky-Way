// ============================================================
// Pós-processamento — bloom HDR (Unreal) + gradação de filme.
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { FILM_SHADER } from '../shaders/dustShaders';
import { GLSL_COMPRESSAO } from '../shaders/common';
import { BETA_DA_ASA, FRACAO_DA_ASA } from '../estrela';

// KNEE pré-ACES (rodada 19): compressão asinh do compósito HDR — o tone
// map de divulgação da referência (Lupton 2004; Filmic/AgX) comprime
// 1,5–2 dex acima de um knee em ~3% do pico, e é ISSO (não perfil de
// massa) que faz o R90 dela chegar a 0,55·R_disco. Por camada não
// funciona: cada sprite aditivo é minúsculo e asinh(x)≈x — a compressão
// tem de ver a soma. uAmt segue a rampa da galáxia (interior intocado).
// ?knee= (β em luz linear; ausente = β 0,45, o default LIGADO da rodada 20;
// ?knee=0 desliga) e ?kneemode=lum|rgb —
// rgb dessatura altas-luzes como filme; lum preserva o matiz do halo.
const KNEE_SHADER = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uAmt: { value: 0 },
    uBeta: { value: 0.3 },
    uMode: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uAmt;
    uniform float uBeta;
    uniform float uMode;
    varying vec2 vUv;
    // A DEFINIÇÃO SAIU DAQUI e foi para shaders/common.ts (GLSL_COMPRESSAO),
    // sem uma vírgula de mudança no corpo: a F2 da luz precisou da MESMA curva
    // na emissão do ponto, e escrever a segunda cópia numa casa que já tem
    // Ballesteros em três e a PSF em quatro seria o erro conhecido. As duas
    // chamadas abaixo continuam exatamente como estavam — o que mudou foi o
    // endereço da função, não o texto que o compilador recebe.
    ${GLSL_COMPRESSAO}
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 x = max(c.rgb, 0.0);
      vec3 knee;
      if (uMode > 0.5) {
        knee = uBeta * asinh3(x / uBeta);
      } else {
        float y = dot(x, vec3(0.2126, 0.7152, 0.0722));
        float ky = uBeta * asinh3(vec3(y / uBeta)).x;
        knee = x * (y > 1e-6 ? ky / y : 1.0);
      }
      gl_FragColor = vec4(mix(x, knee, uAmt), c.a);
    }
  `,
};

/**
 * O β DA COMPRESSÃO DENTRO DO BLOOM — o joelho que age no passa-alta, não no
 * quadro. Vale 0,45 desde 15/08, e o número vem da rodada de medição daquele
 * dia (`docs/PENDENCIAS.md`, bloco ONDA DA LUZ), não de gosto: com
 * `?bemis=300&bbloom=0.45&bombro=40` o quadro lavado a 1 UA caiu de 100% para
 * 3,8%, a 2.000 UA de 92% para 1,9%, e o borrão de 900 px fixos para 168→120
 * px na escada inteira. É o mesmo 0,45 do joelho do compósito (a rodada 20,
 * logo acima) — e ser o mesmo número não é coincidência de digitação: as duas
 * curvas comprimem a mesma faixa de HDR, e usar dois joelhos diferentes para
 * isso seria a casa discordando de si mesma sem ter medido nada a mais.
 *
 * O CAMINHO DE VOLTA é `?bbloom=0`, que devolve o passa-alta de addons
 * intacto, byte a byte — o lado A do A/B.
 */
export const BETA_DO_BLOOM = 0.45;

/**
 * O PESO POR MIP da pirâmide do bloom — DERIVADO da asa da lei, não
 * digitado (M2 da LEI-DA-ESTRELA, §1: "a mesma asa tem de existir na
 * pirâmide do bloom"). A conta: a asa Moffat tem brilho de superfície
 * ∝ θ^(−2β); a energia dela numa OITAVA [θ, 2θ] vai com θ^(2−2β), então
 * cada dobra de raio carrega 2^(2−2β) da anterior. Cada mip da pirâmide
 * dobra o σ do anterior — logo o peso de cada nível é o do anterior
 * vezes esta razão, e a soma dos gaussianos fica CONFINADA sob a asa
 * explícita, que é a dona da extensão (§1: um dono).
 *
 * O que isto mata, medido: os pesos de fábrica ([1; 0,8; 0,6; 0,4; 0,2]
 * achatados ainda mais pelo lerp do `radius` 0,58 → ~[0,54..0,66]) davam
 * ao mip 5 — σ ≈ 190 px em 900 px — quase o MESMO peso do mip 1. É
 * exatamente o halo constante de ~160–180 px do item 3: um número
 * puramente geométrico que não conhece fluxo. Com a razão da lei
 * (2^(2−4,8) ≈ 0,144) o mip 5 pesa 4×10⁻⁴ do primeiro e o borrão passa a
 * ser ditado pela FONTE (a asa explícita encolhe com a luz), nunca pelo
 * kernel.
 *
 * A pirâmide NÃO foi estendida (8–12 mips era o outro caminho do §1):
 * com pesos em lei de potência os mips além do 5º pesariam < 1e-4 do
 * primeiro — custo sem imagem. Escolha declarada aqui.
 */
export const PESO_POR_MIP = Math.pow(2, 2 - 2 * BETA_DA_ASA);

/**
 * A FRAÇÃO DO BLOOM na partição de energia da asa — DERIVADA, não
 * calibrada (§1: "a fração de energia que cabe a cada um é DECLARADA
 * como número", e "o desenho explícito é o dono da asa"). A leitura
 * operacional da cláusula: a pirâmide INTEIRA não pode somar mais halo
 * do que a própria asa explícita carrega. A soma dos pesos da pirâmide
 * é `PESO_DA_PIRAMIDE · Σᵢ PESO_POR_MIPⁱ`; igualá-la a `FRACAO_DA_ASA`
 * dá o peso do primeiro mip:
 *
 *     PESO_DA_PIRAMIDE = FRACAO_DA_ASA / Σᵢ₌₀..₄ PESO_POR_MIPⁱ ≈ 0,051
 *
 * Zero número livre: mexer na asa (β, fração) move a pirâmide junto.
 *
 * O QUE ISTO MATOU, medido na âncora do dono (15.800 UA, alvo ~8 px de
 * raio): com peso 1 o borrão media 37 px; com 0,35 → 27; com 0,2 → 24;
 * SEM bloom o quadro honesto mede 14 px — o excesso era todo o σ≈12 px
 * do primeiro mip sobre o núcleo saturado, espalhamento que a lei
 * atribui à ASA, não ao kernel. Com a fração derivada o aceite do M2
 * (borrão ≤ 20 px) fecha com folga — o número final está no registro
 * do commit, medido pela régua da luz.
 */
const SOMA_DAS_RAZOES = Array.from({ length: 5 }, (_, i) => Math.pow(PESO_POR_MIP, i)).reduce(
  (a, b) => a + b,
  0
);
export const PESO_DA_PIRAMIDE = FRACAO_DA_ASA / SOMA_DAS_RAZOES;

/**
 * O OMBRO da curva acima, em luz linear. Vale 40, e o 40 é o que separa este
 * conserto do proibido. Abaixo do ombro a identidade é EXATA e todo clarão
 * legítimo — Sirius, as heroes, a Terra, o bojo — passa bit a bit; só o Sol
 * vive acima dele.
 *
 * O NÚMERO É MEDIDO PELO FRACASSO DO ZERO: a primeira rodada (asinh puro, sem
 * ombro, β = 0,45 no passa-alta inteiro) tirou 180 de 255 de Betelgeuse — "as
 * estrelas diminuem", exatamente o que o dono proibiu por escrito. Com o ombro
 * em 40 as vistas `terra`, `interno`, `faceon`, `hero200`, `solestrela` e
 * `soldisco` saem com delta máximo de 1 nível (ULP de compilador) e só `hero8`
 * muda — e ali mudar É o mecanismo funcionando: a vista está a 0,6 pc de
 * Betelgeuse, que é um mini-Sol com a mesma doença.
 *
 * `?bombro=T` varre o ombro sem mexer no β; `?bombro=0` reproduz a primeira
 * rodada, a que reprovou.
 */
export const OMBRO_DO_BLOOM = 40;

/**
 * A CIRURGIA DE TEXTO no passa-alta do `UnrealBloomPass` — ombro + `β·asinh`
 * dentro do filtro, o item 2 da cadeia de curvas. Vive aqui, solta, porque desde a
 * faixa de guarda do item 70 são DUAS máquinas de bloom por quadro (a da lei e
 * a do campo) e as duas precisam da MESMA curva: escrever a segunda cópia numa
 * casa que já tem Ballesteros em três lugares seria o erro conhecido.
 *
 * O porquê de comprimir DENTRO do passa-alta (e não antes do bloom) está no
 * cabeçalho de `Post.domarOBloom`, que é quem a chama pela lei.
 */
function domarPassaAlta(bloom: UnrealBloomPass) {
  // LEI SEM PORTA desde o M2 (regra iv do §4): `?bbloom=`/`?bombro=`
  // morreram no commit que migrou o bloom para a lei — o lado A do A/B
  // vive nas capturas versionadas e nos números deste cabeçalho, nunca
  // num ramo de runtime.
  const beta = BETA_DO_BLOOM;
  const t = OMBRO_DO_BLOOM;
  const mat = (bloom as unknown as { materialHighPassFilter: THREE.ShaderMaterial })
    .materialHighPassFilter;
  const u = (bloom as unknown as { highPassUniforms: Record<string, { value: unknown }> })
    .highPassUniforms;
  u.uBetaBloom = { value: beta };
  u.uOmbroT = { value: t };
  mat.uniforms.uBetaBloom = u.uBetaBloom as { value: number };
  mat.uniforms.uOmbroT = u.uOmbroT as { value: number };
  const ALVO = 'vec4 texel = texture2D( tDiffuse, vUv );';
  if (!mat.fragmentShader.includes(ALVO)) {
    throw new Error('domarOBloom: o passa-alta do UnrealBloomPass mudou de forma');
  }
  mat.fragmentShader = mat.fragmentShader
    .replace(
      'uniform sampler2D tDiffuse;',
      `uniform sampler2D tDiffuse;\nuniform float uBetaBloom;\nuniform float uOmbroT;\n${GLSL_COMPRESSAO}`
    )
    .replace(
      ALVO,
      `${ALVO}\n\ttexel.rgb = min( texel.rgb, uOmbroT ) + comprimir3( max( texel.rgb - uOmbroT, vec3( 0.0 ) ), uBetaBloom );`
    );
  mat.needsUpdate = true;
}

/**
 * O COBERTOR DO CAMPO — a resposta da R2 ao "cobertor curto" que o dono
 * nomeou (item 44): o bloom era UM para a cena inteira, e o kernel que dá
 * respiro ao campo estelar lava o Sol distante (4/11 na escada), enquanto
 * o kernel da lei que disciplina o Sol apaga o céu ("a galaxia parece
 * vazia... tem bilhoes de estrelas e nem parece"). Ordem dele, dada duas
 * vezes: "vai no bloom seletivo então, cada camada com seu cobertor".
 *
 * A partir daqui são DOIS cobertores por quadro, na MESMA máquina:
 *
 *  - o PRINCIPAL veste a pirâmide da LEI (`governarPiramide`) e cobre o
 *    que vive na camada 0 — Sol, planetas, galáxia, nebulosa: é o kernel
 *    do M2, o que passou 11/11 com 20 px na âncora de 15.800 UA;
 *  - o passe do CAMPO (`ClaraoDoCampo`) desenha só as três camadas de
 *    estrelas na `CAMADA_DO_CAMPO` e veste nelas o kernel do FILME,
 *    inteiro — a forma [1; 0,8; 0,6; 0,4; 0,2] com raio 0,58 que dava ao
 *    céu o respiro que o dono cobrou de volta.
 *
 * O LIMIAR do campo já chega na régua de referência SEM conta nova: o
 * depósito das três camadas é ×pr² no vertex desde a parte 2 da
 * invariância — escalar o limiar por pr² aqui seria compensar duas vezes.
 * Galáxia e nebulosa ficam FORA do passe do campo na primeira leva, por
 * decisão declarada no mapa da R2: são 4 M de partículas, e o segundo
 * render delas não se paga antes de o dono sentir falta.
 */
export const CAMADA_DO_CAMPO = 1;

/**
 * A camada dos OCULTADORES do rascunho do campo — as SUPERFÍCIES OPACAS
 * dos corpos resolvidos (fotosfera do Sol, globos de Terra/Lua/rochosos/
 * gigantes). Cada corpo marca o próprio globo ao criá-lo; atmosfera,
 * nuvens, anéis e glows FICAM DE FORA — são vazados/translúcidos, e um
 * fantasma de anel engoliria estrela que se vê pelos buracos. Quem lê a
 * camada é a etapa 1a do `ClaraoDoCampo`: os globos entram no rascunho
 * SÓ com profundidade (colorWrite falso), e o depth test que os materiais
 * do campo já carregam corta estrela escondida — era o item 47, cobrado
 * pelo dono NA TELA: "vejo estrelas através do sol".
 */
export const CAMADA_DOS_OCULTADORES = 2;
const FORMA_DO_FILME = [1.0, 0.8, 0.6, 0.4, 0.2];
const FORCA_DO_FILME = 0.72;
const RAIO_DO_FILME = 0.58;

/**
 * A FAIXA DE GUARDA do cobertor do campo, em px de CSS — o conserto do item
 * 70 ("girar a câmera acende e apaga o céu inteiro").
 *
 * A DOENÇA, medida pelo MB1 em 25/08: o rascunho do campo era do TAMANHO DO
 * QUADRO, então uma estrela forte deixava de existir para o cobertor no pixel
 * em que o centro dela cruzava a borda — e o pedestal de 250–300 px que ela
 * deitava sobre a tela inteira ia embora de uma vez. Na família `fov` do MB1
 * isso valia resíduo 3,80 degraus contra piso 0,34 + folga 2,00, com a luz do
 * quadro caindo 27,0% num passo de câmera só; na `zoomDeRoda`, o Sol saindo
 * pela borda de baixo levava junto a âncora de Vênus, 1,74 px de salto contra
 * um teto de 1,02.
 *
 * O CONSERTO é enxergar ALÉM do quadro: o rascunho passa a ter `2·MARGEM` px
 * a mais em cada eixo, e a câmera do rascunho ganha o mesmo tanto de frustum
 * (`setViewOffset` com deslocamento negativo — a densidade de pixel NÃO muda,
 * é o mesmo px de CSS de sempre, só há mais deles). A fonte continua
 * contribuindo enquanto estiver a menos de `MARGEM` px de fora, e some quando
 * o que lhe restava de pedestal já não chegava ao quadro.
 *
 * O NÚMERO É MEDIDO, e é o menor que zera o MB1 com folga — a varredura
 * inteira está no registro do commit e no item 70:
 *
 *   margem   fov k5 (resíduo / luz)     zoomDeRoda k8 (salto)
 *   0 px     3,80 degraus / −27,0%      1,74 px      ← a doença
 *   64 px    (ver o registro)           (ver o registro)
 *   128 px   ...                        ...
 *
 * MÚLTIPLO DE 32 por obrigação, não por gosto: a pirâmide tem cinco mips e o
 * mais grosso vive a 1/32 da resolução; margem que não seja múltiplo de 32
 * desalinha a grade de texels de algum nível contra a grade do quadro, e o
 * interior — que este conserto NÃO quer mexer — passaria a se reamostrar
 * sozinho.
 *
 * O PREÇO ESTÁ DECLARADO: o passe do campo é o mais caro do quadro, e a área
 * dele cresce ((w+2M)·(h+2M))/(w·h). O número medido com `gpu-profile` está no
 * registro do commit e no item 70.
 */
export const MARGEM_DO_CAMPO = 128;
/**
 * O LIMIAR DO CAMPO É ZERO — e o zero é a correção do aceite negado
 * (17/08, dono: "perdemos muitas estrelas, densidade parece que caiu").
 * O 0,82 do cobertor único existia para a FOTOSFERA e a galáxia não
 * florescerem — mas no rascunho do campo só existe estrela, e cada uma
 * enfrentava o limiar SOZINHA: sem o fundo da galáxia por baixo, as
 * fracas que floresciam no cobertor único perdiam o gatilho e o céu
 * esvaziava. Limiar aqui é censo, não proteção: com zero, todo pontinho
 * respira na proporção da própria luz — quem doma o topo é a compressão
 * do passa-alta (ombro 40 / β 0,45), a mesma de sempre.
 */
const LIMIAR_DO_CAMPO = 0;

/**
 * A SOMA COM RECORTE — o blend aditivo do passe de addons mais a janela: o
 * composite cobre o rascunho INTEIRO (quadro + faixa de guarda) e o quadro é
 * o retângulo do meio dele. `uEscala`/`uDeslocamento` são essa janela em UV,
 * e são a única diferença para o `CopyShader` que o `blendMaterial` do
 * `UnrealBloomPass` usava (`opacity` valia 1 — identidade).
 *
 * NASCE NUMA FÁBRICA, e isso é guarda, não estilo: material do three é objeto
 * de CPU pura, então o gate consegue AFERIR o objeto que o passe usa em vez
 * de procurar a palavra no arquivo. A varredura de texto que guardava isto
 * até 25/08 aceitava `premultipliedAlpha: false // outrora
 * premultipliedAlpha: true` — a sabotagem passava porque a palavra continuava
 * escrita, num comentário.
 */
export function criarSomaComRecorte(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null as THREE.Texture | null },
      uEscala: { value: new THREE.Vector2(1, 1) },
      uDeslocamento: { value: new THREE.Vector2(0, 0) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform vec2 uEscala;
      uniform vec2 uDeslocamento;
      varying vec2 vUv;
      void main() {
        gl_FragColor = texture2D(tDiffuse, vUv * uEscala + uDeslocamento);
      }
    `,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    // `premultipliedAlpha` NÃO é detalhe, e custou uma tarde: com ele o
    // aditivo do three é `blendFuncSeparate(ONE, ONE, ...)` — a cor entra
    // inteira; sem ele é `blendFunc(SRC_ALPHA, ONE)` e a cor entra
    // MULTIPLICADA pelo alpha do composite, que é `bloomStrength · Σ
    // fatores · alpha` e quase nunca vale 1. O `blendMaterial` do
    // `UnrealBloomPass` nasce premultiplicado; a primeira versão desta não,
    // e o céu saiu 28% mais escuro (luz média do quadro 10,17 contra 14,10
    // bytes na vista `fov-0` do MB1) — o respiro das estrelas que o dono
    // cobrou em 17/08, pago sem ninguém pedir. Com a linha abaixo a soma
    // reproduz o de addons: `MARGEM_DO_CAMPO = 0` devolve o quadro de
    // antes da obra (14,10 bytes, resíduo 3,80, luz −27,0%), e é assim que
    // se sabe que a faixa de guarda é a ÚNICA coisa que esta obra mudou.
    premultipliedAlpha: true,
  });
}

/**
 * O PASSE DO CAMPO — o segundo cobertor, SEM segunda máquina.
 *
 * O desenho da R2 pedia "modo só-brilho no passe"; a leitura do
 * passe de addons mostrou um caminho mais barato que a flag: o
 * `UnrealBloomPass` já deposita o clarão puro numa textura própria
 * (`renderTargetsHorizontal[0]`) ANTES do blend aditivo final. Então o
 * passe (1) desenha só o campo — catálogo, cascas, heroes, via
 * `CAMADA_DO_CAMPO` — no buffer OCIOSO do composer (o writeBuffer: o
 * bloom principal não troca buffers, e knee/OutputPass reescrevem cada
 * pixel dele depois — rascunho de graça, zero alvo novo na VRAM);
 * (2) roda a MESMA máquina do bloom vestida de filme em cima do
 * rascunho — o blend interno do passe cai no próprio rascunho e
 * morre ali; (3) soma SÓ o clarão ao quadro principal, com o mesmo
 * blend aditivo dele. As estrelas não contam duas vezes: a
 * imagem direta delas só existe no render principal.
 *
 * LIMITE DECLARADO (v1): o rascunho do campo não tem os ocultadores
 * (Sol e planetas vivem na camada 0), então estrela ATRÁS de um disco
 * resolvido ainda deposita clarão por cima dele — de frente para um
 * corpo próximo, um brilho fantasma fraco pode vazar no lado noturno.
 * Se a tela cobrar, o conserto conhecido é desenhar os ocultadores no
 * rascunho só com profundidade (colorWrite falso) — nunca voltar ao
 * cobertor único.
 *
 * O QUE MUDOU NO ITEM 70 (a faixa de guarda, `MARGEM_DO_CAMPO`). O
 * "SEM segunda máquina" acima era verdade enquanto o rascunho tinha o
 * TAMANHO DO QUADRO: dava para pegar o buffer ocioso do composer
 * emprestado e vestir a máquina da lei de filme por um passe. Com a
 * faixa de guarda o rascunho é MAIOR que o quadro, e nenhum buffer do
 * composer tem esse tamanho — nem a pirâmide da lei, que vive no
 * tamanho do quadro e teria de ser realocada DUAS VEZES POR QUADRO para
 * ser emprestada (o `setSize` do passe de addons dispara `dispose()` em 11
 * alvos quando a medida muda). Então agora são duas máquinas de
 * verdade, cada uma no seu tamanho, e o preço — VRAM e tempo de GPU —
 * está declarado no cabeçalho de `MARGEM_DO_CAMPO`. Em troca some a
 * dança de vestir e despir a máquina da lei a cada quadro: esta nasce
 * de filme e morre de filme.
 */

class ClaraoDoCampo extends Pass {
  private readonly quad = new FullScreenQuad();
  private readonly corDeLimpezaVelha = new THREE.Color();
  private readonly bloom: UnrealBloomPass;
  private readonly cena: THREE.Scene;
  private readonly camera: THREE.Camera;
  /** o rascunho COM a faixa de guarda — quadro + 2·MARGEM em cada eixo */
  private rascunho: THREE.WebGLRenderTarget;
  /** o quadro em px de CSS, para a conta da janela dentro do rascunho */
  private larguraCss = 1;
  private alturaCss = 1;
  /** o traje dos ocultadores: geometria verdadeira, zero cor — só depth */
  private readonly fantasma = new THREE.MeshBasicMaterial({ colorWrite: false });
  /** a câmera de lente larga do rascunho — cópia, para a do app não ser
   *  tocada por este passe (ver a cicatriz em `render`) */
  private readonly cameraLarga = new THREE.PerspectiveCamera();
  private readonly somaComRecorte = criarSomaComRecorte();

  constructor(
    cena: THREE.Scene,
    camera: THREE.Camera,
    largura: number,
    altura: number,
    pixelRatio: number
  ) {
    super();
    this.cena = cena;
    this.camera = camera;
    this.needsSwap = false;
    // A MÁQUINA DO CAMPO nasce vestida de filme e no tamanho do rascunho.
    // O raio 0,58 entra na CONSTRUÇÃO (a máquina da lei o pina em 0 pelo
    // motivo oposto — ver `governarPiramide`).
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(largura + 2 * MARGEM_DO_CAMPO, altura + 2 * MARGEM_DO_CAMPO),
      FORCA_DO_FILME,
      RAIO_DO_FILME,
      LIMIAR_DO_CAMPO
    );
    const m = this.maquina();
    if (!m.compositeMaterial || !m.renderTargetsHorizontal?.length) {
      throw new Error('ClaraoDoCampo: o UnrealBloomPass mudou de forma');
    }
    // a MESMA curva do passa-alta da máquina da lei: as duas comprimem a
    // mesma faixa de HDR, e duas curvas seria a casa discordando de si
    domarPassaAlta(this.bloom);
    const fatores = m.compositeMaterial.uniforms.bloomFactors.value as number[];
    for (let i = 0; i < fatores.length; i++) fatores[i] = FORMA_DO_FILME[i];
    this.rascunho = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    this.rascunho.texture.name = 'ClaraoDoCampo.rascunho';
    this.redimensionar(largura, altura, pixelRatio);
  }

  private maquina() {
    return this.bloom as unknown as {
      compositeMaterial: THREE.ShaderMaterial;
      renderTargetsHorizontal: Array<{ texture: THREE.Texture }>;
    };
  }

  /**
   * O composer chama `setSize` de todo passe com px de BUFFER; este passe
   * precisa do quadro em px de CSS (a faixa de guarda é do mesmo lado da
   * fronteira que a pirâmide, que vive em CSS desde a parte 3 da
   * invariância) E do pixelRatio, então quem o dimensiona é o `Post`, por
   * `redimensionar`. Sobrescrito para o composer não o dimensionar errado.
   */
  setSize() {}

  redimensionar(largura: number, altura: number, pixelRatio: number) {
    this.larguraCss = Math.max(1, largura);
    this.alturaCss = Math.max(1, altura);
    const lg = this.larguraCss + 2 * MARGEM_DO_CAMPO;
    const al = this.alturaCss + 2 * MARGEM_DO_CAMPO;
    // o rascunho em px de BUFFER (a densidade do quadro, sem mudança de
    // amostragem); a pirâmide em px de CSS, como a da lei
    this.rascunho.setSize(Math.round(lg * pixelRatio), Math.round(al * pixelRatio));
    this.bloom.setSize(lg, al);
    (this.somaComRecorte.uniforms.uEscala.value as THREE.Vector2).set(
      this.larguraCss / lg,
      this.alturaCss / al
    );
    (this.somaComRecorte.uniforms.uDeslocamento.value as THREE.Vector2).set(
      MARGEM_DO_CAMPO / lg,
      MARGEM_DO_CAMPO / al
    );
  }

  render(
    renderer: THREE.WebGLRenderer,
    _writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget
  ) {
    // O autoClear fica PRESO em falso do primeiro ao último draw — a
    // mesma disciplina do corpo do passe de addons, e ela não é estilo: o
    // FullScreenQuad.render é um renderer.render(), e com a limpeza
    // automática ligada a soma do passo 3 LIMPARIA o quadro inteiro
    // antes de somar (o Sol e a nebulosa sumiam da tela — defeito da
    // primeira montagem deste passe, provado e consertado no ato).
    const limpavaSozinho = renderer.autoClear;
    renderer.autoClear = false;

    // 1. só o campo no rascunho — com o fundo (a nebulosa panorâmica)
    //    FORA, senão o céu inteiro entraria no cobertor do campo
    const fundo = this.cena.background;
    renderer.getClearColor(this.corDeLimpezaVelha);
    const alphaVelho = renderer.getClearAlpha();
    this.cena.background = null;
    renderer.setClearColor(0x000000, 0);
    // A FAIXA DE GUARDA (item 70): a MESMA densidade de pixel, mais
    // frustum. `setViewOffset` com deslocamento NEGATIVO pede o quadro
    // inteiro MAIS `MARGEM` px de cada lado; a estrela que acabou de sair
    // pela borda continua sendo desenhada, e o pedestal dela continua
    // caindo sobre o quadro em vez de sumir de uma vez.
    //
    // E A LENTE LARGA VIVE NUMA CÂMERA À PARTE. A primeira versão chamava
    // `setViewOffset` na câmera DO APP e desfazia no fim do passe, e isso
    // é uma armadilha conhecida do three: `setViewOffset` escreve
    // `camera.aspect = fullWidth/fullHeight` e o `clearViewOffset` NÃO o
    // devolve — a câmera sai do passe com o aspect reescrito. Aqui os dois
    // valores COINCIDEM (o quadro é a janela), então nada se movia; mas o
    // passe passaria a depender de uma coincidência, e quem mudasse
    // `redimensionar` herdaria uma câmera adulterada sem nenhum aviso.
    // Com a cópia, a câmera do app sai deste passe sem um bit mexido — e
    // o `z-fighting`, que chacoalha a câmera de fora por `setViewOffset`,
    // continua chacoalhando o que ele quer medir.
    const camera = this.camera as THREE.PerspectiveCamera;
    const larga = this.cameraLarga;
    // `false` porque `Object3D.copy` é RECURSIVO por omissão: com filhos
    // na câmera (um rig, uma luz pendurada) isto clonaria a árvore inteira
    // a cada quadro.
    larga.copy(camera, false);
    // a matriz de mundo vem PRONTA da câmera do app (ela pode estar num
    // rig, e recalcular a partir do local devolveria outra pose)
    larga.matrixWorld.copy(camera.matrixWorld);
    larga.matrixWorldInverse.copy(camera.matrixWorldInverse);
    larga.matrixWorldAutoUpdate = false;
    // e a faixa SOMA-se a uma janela que já exista: o `z-fighting` chacoalha
    // a câmera por `setViewOffset` de fora, e sobrescrever a janela dele
    // apagaria o chacoalho justo no passe que ele está medindo
    const jv = camera.view?.enabled === true ? camera.view : null;
    larga.setViewOffset(
      jv ? jv.fullWidth : this.larguraCss,
      jv ? jv.fullHeight : this.alturaCss,
      (jv ? jv.offsetX : 0) - MARGEM_DO_CAMPO,
      (jv ? jv.offsetY : 0) - MARGEM_DO_CAMPO,
      (jv ? jv.width : this.larguraCss) + 2 * MARGEM_DO_CAMPO,
      (jv ? jv.height : this.alturaCss) + 2 * MARGEM_DO_CAMPO
    );
    renderer.setRenderTarget(this.rascunho);
    renderer.clear();
    // 1a. os OCULTADORES primeiro, só profundidade: as superfícies
    //     opacas enchem o depth do rascunho e o depth test que o campo
    //     já carrega corta estrela ATRÁS de corpo — nem ponto, nem
    //     clarão ("vejo estrelas através do sol", item 47, morto aqui)
    larga.layers.set(CAMADA_DOS_OCULTADORES);
    this.cena.overrideMaterial = this.fantasma;
    renderer.render(this.cena, larga);
    this.cena.overrideMaterial = null;
    // 1b. e o campo por cima, agora com o mundo sólido no caminho
    larga.layers.set(CAMADA_DO_CAMPO);
    renderer.render(this.cena, larga);
    this.cena.background = fundo;
    renderer.setClearColor(this.corDeLimpezaVelha, alphaVelho);

    // 2. a máquina do campo, que já é de filme, sobre o rascunho inteiro
    this.bloom.render(renderer, this.rascunho, this.rascunho, 0, false);

    // 3. só o clarão, somado ao quadro principal — e RECORTADO: o
    //    composite cobre o rascunho, o quadro é a janela do meio dele
    this.somaComRecorte.uniforms.tDiffuse.value = this.maquina().renderTargetsHorizontal[0].texture;
    this.quad.material = this.somaComRecorte;
    renderer.setRenderTarget(readBuffer);
    this.quad.render(renderer);

    renderer.autoClear = limpavaSozinho;
  }

  dispose() {
    this.quad.dispose();
    this.somaComRecorte.dispose();
    this.fantasma.dispose();
    this.rascunho.dispose();
    this.bloom.dispose();
  }
}

export class Post {
  readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
  private claraoDoCampo: ClaraoDoCampo;
  private film: ShaderPass;
  private knee: ShaderPass;
  private kneeOn = false;
  private outputPass!: OutputPass;
  private renderer: THREE.WebGLRenderer;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    // (A porta de medição `?knee2=` morreu no M2: o experimento que ela
    // permitia — joelho ANTES do bloom — foi medido em 15/08, perdeu para
    // o ombro dentro do passa-alta, e o ombro é padrão. Regra iv do §4:
    // o lado A vive nas capturas versionadas, nunca num ramo de runtime.
    // A CADEIA DE CURVAS da casa, contada — §7 da Lei exige o número:
    //   1. β·asinh na EMISSÃO por fonte (β = 300, `?bemis=` é a volta);
    //   2. ombro + β·asinh DENTRO do passa-alta do bloom (40 / 0,45);
    //   3. joelho asinh no compósito pós-bloom (β = 0,45, só na vista
    //      externa — rampa da galáxia);
    //   4. ACES no OutputPass.
    // Quatro curvas, nesta ordem, com os desvios declarados no selo.)

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.72, // força
      // O COBERTOR deixou de ser um só (R2 do item 44, ordem do dono:
      // "cada camada com seu cobertor"): este passe é o PRINCIPAL —
      // pirâmide da LEI via governarPiramide, com o raio pinado em 0
      // para o lerp do passe não achatar os pesos derivados — e
      // disciplina o que vive na camada 0: Sol, planetas, galáxia,
      // nebulosa. O respiro do campo estelar mora no segundo cobertor,
      // o ClaraoDoCampo logo abaixo.
      0,
      0.82 // limiar — preserva a fotosfera e faz estrelas HDR florescerem
    );
    this.composer.addPass(this.bloom);
    this.domarOBloom();
    this.governarPiramide();
    // o segundo cobertor: o clarão do campo entra ANTES do knee/ACES,
    // aditivo, como o mapa da R2 manda
    const tamanho = renderer.getSize(new THREE.Vector2());
    this.claraoDoCampo = new ClaraoDoCampo(
      scene,
      camera,
      tamanho.x,
      tamanho.y,
      renderer.getPixelRatio()
    );
    this.composer.addPass(this.claraoDoCampo);

    // knee asinh no HDR composto (depois do bloom, antes do ACES).
    // Default LIGADO com β=0,45 (rodada 20: com chromsat=0,5 na extinção,
    // knee 0,45 + exp 1,05 venceu os DOIS gates — edge 0,8275, face
    // 0,0517). ?knee=0 desliga; ?knee=β varre; ?kneemode=lum|rgb.
    this.knee = new ShaderPass(KNEE_SHADER as never);
    const q = new URLSearchParams(window.location.search);
    const raw = q.get('knee');
    const beta = raw === null ? 0.45 : parseFloat(raw);
    this.kneeOn = Number.isFinite(beta) && beta > 0;
    if (this.kneeOn) {
      (this.knee.uniforms as Record<string, { value: number }>).uBeta.value = beta;
      (this.knee.uniforms as Record<string, { value: number }>).uMode.value =
        q.get('kneemode') === 'lum' ? 0 : 1;
    }
    // ?kneeamt= força o amount (a rampa galaxyFade zera o knee DENTRO
    // da galáxia; o gate do céu interno precisa varrê-lo de dentro)
    const rawAmt = q.get('kneeamt');
    this.forcedAmt = rawAmt === null ? null : parseFloat(rawAmt);
    if (this.kneeOn && this.forcedAmt !== null && Number.isFinite(this.forcedAmt)) {
      (this.knee.uniforms as Record<string, { value: number }>).uAmt.value = this.forcedAmt;
    }
    // com uAmt = 0 o shader é identidade (mix(x, knee, 0) === x) e o passe
    // vira uma cópia HDR de tela cheia. O gate segue o MESMO amount que o
    // frame vai usar — ver setGalaxy.
    this.knee.enabled = this.kneeOn && (this.forcedAmt ?? 0) > 0;
    this.composer.addPass(this.knee);

    // OutputPass (ACES + sRGB) ANTES da gradação: grão, vinheta e
    // elevação de negros operam em espaço de DISPLAY, como autorados.
    // Antes do tonemap, o joelho do ACES esmagava o lift e o grão.
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
    this.film = new ShaderPass(FILM_SHADER as never);
    this.composer.addPass(this.film);
  }

  /**
   * A COMPRESSÃO DENTRO DO BLOOM, no filtro de passa-alta — PADRÃO desde
   * 15/08, com `BETA_DO_BLOOM` e `OMBRO_DO_BLOOM`. As portas `?bbloom=β` e
   * `?bombro=T` viraram o caminho de volta e a bancada de comparação:
   * ausentes ⇒ o pacote; `?bbloom=0` ⇒ o passa-alta de addons intacto,
   * sem uma linha de cirurgia, que é o lado A do A/B.
   *
   * POR QUE AQUI E NÃO ANTES DO BLOOM. Medido em 15/08: um joelho aplicado ao
   * quadro inteiro antes do bloom conserta a tela branca e RE-GRADUA O FILME —
   * a Terra escurece até 199 de 255 em 77% do quadro e a galáxia de face perde
   * luz em 40% dos pixels. É o preço de comprimir a imagem para conter uma
   * fonte só.
   *
   * O `UnrealBloomPass` tem duas metades: o passa-alta separa o que vai
   * florescer, borra numa pirâmide de mips e compõe; e no fim ele soma esse
   * clarão POR CIMA do buffer de entrada, que continua intacto
   * (`UnrealBloomPass.js`, o blend aditivo do `basic` sobre o readBuffer).
   * Logo, comprimir DENTRO do passa-alta toca só o clarão: a imagem direta —
   * Terra, planetas, superfícies, galáxia — não passa pela curva. É a
   * diferença entre domar o brilho espalhado e re-graduar o filme.
   *
   * A restrição do dono, palavra dele: "eu nao quero que as estrelas de fundo
   * diminuam ou morram". É contra isso que esta porta é medida — não basta o
   * Sol encolher.
   *
   * A cirurgia é de texto, no molde de `ctx.tuneLic` (`world/stellarBody.ts`):
   * o fragment de addons é reescrito no ponto de uso, com agulha em
   * `post.test`… que não existe — quem cobra é `luzDaCasa.test.ts`, por
   * varredura, e a régua da luz, por medição.
   */
  private domarOBloom() {
    domarPassaAlta(this.bloom);
  }

  /**
   * A PIRÂMIDE GOVERNADA PELA LEI (M2, de volta na R2): os pesos por mip
   * saem de `PESO_POR_MIP` (derivado de `BETA_DA_ASA` — a conta no
   * cabeçalho da constante), com o raio pinado em 0 na construção para o
   * lerp do passe não os achatar de volta. O bloom fica cuidando
   * do BRILHO perto da fonte (abaixo do ombro); a EXTENSÃO é da asa
   * explícita (`world/clarao.ts`), que é a dona declarada (§1).
   *
   * (O meio-termo da madrugada de 16→17/08 — a forma do filme a 30% no
   * cobertor único — morreu aqui: era o remendo que dava meio respiro ao
   * campo lavando meio Sol. O respiro inteiro do campo mora no
   * `ClaraoDoCampo`; a varredura invertida vigia a volta do remendo.)
   */
  private governarPiramide() {
    const composite = (this.bloom as unknown as { compositeMaterial: THREE.ShaderMaterial })
      .compositeMaterial;
    const fatores = composite.uniforms.bloomFactors?.value as number[] | undefined;
    if (!fatores || fatores.length === 0) {
      throw new Error('governarPiramide: o composite do UnrealBloomPass mudou de forma');
    }
    for (let i = 0; i < fatores.length; i++)
      fatores[i] = PESO_DA_PIRAMIDE * Math.pow(PESO_POR_MIP, i);
  }

  /**
   * Sgr A* entra logo depois da cena e ANTES do bloom: o disco de
   * acreção floresce como qualquer fonte HDR. O setSize aqui é cinto de
   * segurança: o EffectComposer já repassa o tamanho a todos os passes
   * (setSize itera this.passes), inclusive aos inseridos depois.
   */
  addBlackHole(pass: Pass) {
    this.composer.insertPass(pass, 1);
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    pass.setSize(size.x, size.y);
  }

  /**
   * O knee agora liga só na vista externa (setGalaxy), então o primeiro uso
   * do programa dele cairia no MEIO do filme — o mesmo hitch de compilação
   * síncrona que o warm-up existe para evitar (era o que o BH fazia ao
   * cruzar 2,4 kpc). Entra no warm-up junto com os quads de pós; a
   * geometria tem de ser a do FullScreenQuad (position+uv, sem normal).
   */
  get warmupMaterials(): THREE.Material[] {
    return this.kneeOn ? [this.knee.material] : [];
  }

  /** amplitude do grão por preset de qualidade */
  setGrain(v: number) {
    (this.film.uniforms as Record<string, { value: number }>).uGrain.value = v;
  }

  setSize(w: number, h: number) {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    // A EXTENSÃO DO BLOOM NA RÉGUA DE REFERÊNCIA (parte 3 da invariância,
    // cobrada pelo dono no aceite do bloom seletivo: "ficou muito corpo
    // redondo bojudo"). O composer dimensiona os passes em px FÍSICOS, e
    // com isso o σ da pirâmide media em buffer: em retina a mesma energia
    // concentrava na METADE do tamanho visual — a bola densa em cima da
    // cruz fina, e o borrão do Sol a 1 UA caindo de 30 para 8 px de CSS
    // (medido na perna DPR 2). A pirâmide inteira (bright + mips) passa a
    // viver em px de CSS: mesmo halo visual em qualquer tela, DPR 1
    // bit-idêntico (css == buffer), e o trem de mips 4× mais barato em
    // retina. O blend final amostra o composite para o buffer cheio, como
    // sempre fez.
    this.bloom.setSize(w, h);
    // e o cobertor do campo no MESMO lado da fronteira, mais a faixa de
    // guarda do item 70 (o rascunho dele precisa também do pixelRatio —
    // ver `ClaraoDoCampo.redimensionar`)
    this.claraoDoCampo.redimensionar(w, h, this.renderer.getPixelRatio());
  }

  /**
   * A PORTA `?nobloom=1`, e ela deixou de mentir (item 72). Até 25/08 a porta
   * apagava só `bloom.enabled`, e o SEGUNDO cobertor — o `ClaraoDoCampo` —
   * seguia inteiro, porque chama a própria máquina na mão e nunca passou pelo
   * `enabled` de ninguém. Medido então: `?nobloom=1` mudava 0,35% da luz do
   * quadro a 40 UA e o halo de 250–300 px de uma estrela forte continuava lá.
   * Quem lia a linha do `NORTE.md` ("perto do Sol, A/B só com `&nobloom=1`")
   * acreditava estar sem bloom nenhum e não estava — foi essa crença que quase
   * enterrou o diagnóstico do item 70.
   *
   * Agora a porta apaga OS DOIS passes. Ela move pixel nas vistas que a usam,
   * e o delta entrou declarado (as dez vistas `…nb` do `ab-identidade`, o
   * `z-fighting`, a prova 8 do `atlas-smoke` e a lente do `planeta-pixel`).
   */
  set bloomLigado(ligado: boolean) {
    this.bloom.enabled = ligado;
    this.claraoDoCampo.enabled = ligado;
  }

  private galaxyMode = 0;
  private forcedAmt: number | null = null;

  // (`setGradacao` — a gradação por contexto do Atlas, F6 — morreu no M1
  // da LEI-DA-ESTRELA junto com `claraoDoAtlas`: o bloom deixou de ter um
  // apagador de 100× por modo. Ver a lápide em `atlasConfig.ts`.)

  /**
   * Modo galáxia (0..1): o bojo é uma fonte HDR enorme — sem
   * moderação o bloom engole a tela inteira. Sobe o limiar e
   * baixa a força conforme a galáxia domina o quadro.
   */
  setGalaxy(k: number) {
    this.galaxyMode = k;
    // o knee segue a mesma rampa da vista externa que a auto-exposição
    if (this.kneeOn) {
      const amt = this.forcedAmt ?? k;
      (this.knee.uniforms as Record<string, { value: number }>).uAmt.value = amt;
      // Dentro do disco (galaxyFade = 0) o passe só copia o buffer HDR.
      // Desligá-lo é bit-exato: mix(x, knee, 0) === x, e o knee é finito
      // para qualquer half-float. Limiar EXATAMENTE 0, não 1e-3 — a rampa
      // atravessa (0, 1e-3] em toda travessia do disco, e ali a
      // contribuição existe. E o amount é o forcedAmt quando há: o gate do
      // céu varre o knee de DENTRO com ?kneeamt=, onde k vale 0.
      this.knee.enabled = amt > 0;
    }
  }

  /** Pulso de bloom durante acelerações da viagem (0..1). */
  setWarp(k: number) {
    const g = this.galaxyMode;
    // moderação mais firme na vista externa: o bojo é uma fonte HDR
    // enorme e virava uma bola branca que engolia barra e fendas.
    // (força e limiar são INSTRUMENTO e seguem moduláveis por modo; o
    // RAIO deixou de ser knob no M2 — pinado em 0 na construção, porque
    // o lerp dele reflatten os pesos que a lei derivou. Ver
    // governarPiramide.)
    this.bloom.strength = (0.72 - 0.34 * g) * (1 + k * 0.4);
    this.bloom.threshold = 0.82 + 0.52 * g;
    (this.film.uniforms as Record<string, { value: number }>).uCA.value =
      0.00012 + k * 0.00042;
  }

  render(time: number) {
    (this.film.uniforms as Record<string, { value: number }>).uTime.value = time;
    this.composer.render();
  }

  dispose() {
    // EffectComposer.dispose() NÃO dispõe os passes: o UnrealBloom
    // sozinho retém 11 render targets HDR na VRAM
    this.claraoDoCampo.dispose();
    this.bloom.dispose();
    this.film.dispose();
    this.knee.dispose();
    this.outputPass.dispose();
    this.composer.dispose();
  }
}
