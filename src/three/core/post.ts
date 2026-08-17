// ============================================================
// Pós-processamento — bloom HDR (Unreal) + gradação de filme.
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { Pass } from 'three/addons/postprocessing/Pass.js';
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
 * O CAMINHO DE VOLTA é `?bbloom=0`, que devolve o passa-alta do vendorizado
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

export class Post {
  readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
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
      // O COBERTOR CURTO, nomeado pelo dono ("vc resolve de um lado e
      // ferra do outro"): o bloom é UM para a cena — o kernel do filme
      // (raio 0,58, fatores default) dá o respiro do campo E lava o Sol
      // distante (medido: 4/11 reprovados, borrão 82 px > 69). O raio
      // volta a 0 (o lerp do vendorizado deixa de ser variável) e o
      // meio-termo vive nos FATORES (respirarPiramide): a FORMA do
      // filme com fração medida pela escada. O cobertor comprido — bloom
      // SELETIVO por família de camada (campo respira, Sol disciplinado)
      // — é a R2, junto com a régua do "céu nunca vazio".
      0,
      0.82 // limiar — preserva a fotosfera e faz estrelas HDR florescerem
    );
    this.composer.addPass(this.bloom);
    this.domarOBloom();
    this.respirarPiramide();

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
   * ausentes ⇒ o pacote; `?bbloom=0` ⇒ o passa-alta do vendorizado intacto,
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
   * o fragment do vendorizado é reescrito no ponto de uso, com agulha em
   * `post.test`… que não existe — quem cobra é `luzDaCasa.test.ts`, por
   * varredura, e a régua da luz, por medição.
   */
  private domarOBloom() {
    // LEI SEM PORTA desde o M2 (regra iv do §4): `?bbloom=`/`?bombro=`
    // morreram no commit que migrou o bloom para a lei — o lado A do A/B
    // vive nas capturas versionadas e nos números deste cabeçalho, nunca
    // num ramo de runtime.
    const beta = BETA_DO_BLOOM;
    const t = OMBRO_DO_BLOOM;
    const mat = (this.bloom as unknown as { materialHighPassFilter: THREE.ShaderMaterial })
      .materialHighPassFilter;
    const u = (this.bloom as unknown as { highPassUniforms: Record<string, { value: unknown }> })
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
   * O MEIO-TERMO DO COBERTOR (madrugada 16→17/08): a pirâmide do M2
   * (0,051·0,144^i — só o 1º mip vivo, a 5%) apagou o respiro do campo
   * ("a galaxia parece vazia" — dono); a do filme (fatores default,
   * raio 0,58) lava o Sol distante (4/11 na escada). Aqui: a FORMA do
   * filme (os cinco mips vivos, queda default) com a FRAÇÃO que a
   * escada aprova — campo com respiro, Sol distante dentro do teto.
   * O cobertor comprido (bloom seletivo por camada) é a R2.
   */
  private respirarPiramide() {
    // os fatores default do UnrealBloomPass vendorizado: [1,0.8,0.6,0.4,0.2]
    const FORMA_DO_FILME = [1.0, 0.8, 0.6, 0.4, 0.2];
    const FRACAO_DO_RESPIRO = 0.3;
    const composite = (this.bloom as unknown as { compositeMaterial: THREE.ShaderMaterial })
      .compositeMaterial;
    const fatores = composite.uniforms.bloomFactors?.value as number[] | undefined;
    if (!fatores || fatores.length === 0) {
      throw new Error('respirarPiramide: o composite do UnrealBloomPass mudou de forma');
    }
    for (let i = 0; i < fatores.length; i++)
      fatores[i] = FORMA_DO_FILME[i] * FRACAO_DO_RESPIRO;
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
    this.bloom.dispose();
    this.film.dispose();
    this.knee.dispose();
    this.outputPass.dispose();
    this.composer.dispose();
  }
}
