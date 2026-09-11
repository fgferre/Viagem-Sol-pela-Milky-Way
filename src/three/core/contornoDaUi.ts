// Serve: chão — a posição, o deslocamento inicial e o envelope de tempo do halo são número puro; o passe em si só roda enquanto uma abertura está viva
// ============================================================
// O HALO DE CONTORNO WEBGL (C6, protótipo B) — docs/PLANO-MOTION-UI.md
// §7 e §12.5. Um brilho âmbar curto no contorno EXTERIOR do painel da
// mesa ao abrir, desenhado pelo renderer que já existe (`Engine`/
// `Post`), só sob `?contorno=webgl`. O lado A, sempre ativo nos dois
// modos, é o reflexo CSS (`.hud-cabecalho::after`/`reflexoDeAbertura`,
// `01-base.css`) — este módulo nunca o toca.
//
// ISOLADO DE PROPÓSITO (aceite do C6: "se a diferença não for
// perceptível, remover o protótipo descartado e manter CSS"): só este
// arquivo, o método `Director.acenderContorno` e algumas linhas
// marcadas "C6" em App.tsx sabem que ele existe. Descartar B é apagar
// os três.
//
// NADA RODA EM REPOUSO (regra 4 da seção 7): `desenhar` sai na
// primeira linha sem um `acender` pendente, sem tocar o renderer. UMA
// INTENÇÃO DE CADA VEZ (regra 3): `acender` sempre RETARGETA — a
// próxima abertura substitui a anterior na hora, nunca enfileira.
// ============================================================
import * as THREE from 'three';

/** `--acento` (01-base.css), #e2b872, como float 0..1 — `THREE.Vector3`
 *  crua, e não `THREE.Color`: `Color.setHex` respeita o gerenciamento
 *  de cor do three (converte sRGB → linear de trabalho), e este valor
 *  é ESCRITO DIRETO no framebuffer final, depois do OutputPass da cena
 *  científica — sem tonemapping, sem passar pela cadeia de novo. O hex
 *  já É o valor de exibição; convertê-lo agora seria a dupla conversão
 *  que a régua do C6 proíbe. */
const COR_ACENTO = new THREE.Vector3(0xe2 / 0xff, 0xb8 / 0xff, 0x72 / 0xff);

/** σ da gaussiana do brilho, em px de CSS (seção 7: "região pequena"). */
const SIGMA_PX = 12;

/** margem do quad ALÉM do retângulo do painel — só para cobrir a
 *  dispersão; 4σ já é <0,001 do pico, então nada visível fica de fora. */
const MARGEM_DO_QUAD_PX = SIGMA_PX * 4;

/** sobe em 60 ms e some por completo aos 400 ms — o teto que a seção 7
 *  pede ("duração máxima inicial de 400 ms"). */
export const SUBIDA_DO_HALO_MS = 60;
export const DURACAO_DO_HALO_MS = 400;

/** intensidade de pico — modesta por decisão: é acabamento, não uma
 *  fonte HDR nova (o bloom científico já rodou, neste passe é tarde
 *  demais para florescer). */
const PICO_DE_INTENSIDADE = 0.45;

/**
 * A POSIÇÃO X DO HALO — pura, sem DOM. O painel entra da direita
 * (`translateX(N) → translate(0,0)`, `movimentoDaGaveta.ts`): em
 * progress 0 ele está em `restX + N` (fora do lugar), em progress 1 em
 * `restX` (repouso). `progress` é o da PRÓPRIA animação
 * (`getComputedTiming().progress`), já passado pela curva de entrada —
 * o halo acompanha o mesmo amortecimento visual do painel, nunca uma
 * reta por cima dele.
 */
export const posicaoXDoHalo = (
  restX: number,
  deslocamentoInicialPx: number,
  progress: number
): number => restX + (1 - progress) * deslocamentoInicialPx;

/**
 * O DESLOCAMENTO INICIAL (N), lido do primeiro quadro-chave da
 * animação de entrada — sempre `translateX(Npx)` (`foraDaTelaMesa`,
 * `movimentoDaGaveta.ts`). Regex, não um parser de CSS completo: o
 * único formato que este módulo precisa ler é o que a própria casa
 * escreve. Transform ausente, vazio ou sem número dá 0 — o halo nasce
 * no repouso, sem inventar um salto.
 */
export const deslocamentoInicialDoTransform = (transformBruto: string): number => {
  const casado = /-?[\d.]+/.exec(transformBruto);
  const n = casado ? Number.parseFloat(casado[0]) : NaN;
  return Number.isFinite(n) ? n : 0;
};

/**
 * O ENVELOPE DE TEMPO — puro. Sobe linear até `SUBIDA_DO_HALO_MS`,
 * desce linear até zerar em `DURACAO_DO_HALO_MS`; fora da janela é
 * sempre 0. LINEAR, como o reflexo CSS (`reflexoDeAbertura`,
 * `01-base.css`): um brilho que passa não pede a curva de quem chega e
 * assenta.
 */
export const envelopeDoTempo = (decorridoMs: number): number => {
  if (decorridoMs <= 0 || decorridoMs >= DURACAO_DO_HALO_MS) return 0;
  if (decorridoMs < SUBIDA_DO_HALO_MS) return decorridoMs / SUBIDA_DO_HALO_MS;
  return 1 - (decorridoMs - SUBIDA_DO_HALO_MS) / (DURACAO_DO_HALO_MS - SUBIDA_DO_HALO_MS);
};

/** o efeito já terminou? — `desenhar` some no quadro em que isto vira
 *  `true`, sem esperar o próximo `acender`. */
export const efeitoTerminou = (decorridoMs: number): boolean => decorridoMs >= DURACAO_DO_HALO_MS;

/**
 * O QUE UMA ABERTURA ENTREGA (App.tsx, glue do C6): a caixa de repouso
 * do painel (`caixaDeRepouso` — SEM o transform da animação), a
 * animação de entrada em curso (`no.getAnimations()[0]`) e N, já
 * resolvido por `deslocamentoInicialDoTransform`.
 */
export interface ParametrosDoContorno {
  retangulo: { x: number; y: number; width: number; height: number };
  animacao: Animation;
  deslocamentoInicialPx: number;
}

interface EstadoAtivo extends ParametrosDoContorno {
  /** `performance.now()` de QUANDO esta intenção chegou — relógio
   *  próprio (item 7 da seção 7: nada de medir pelo relógio da cena,
   *  que congela sob `?shot=` — e este efeito nem roda lá, ver
   *  `Director.acenderContorno`). */
  inicioMs: number;
}

const VERTEX_SHADER = /* glsl */ `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec4 uRetangulo; // x, y, largura, altura — px de CSS, origem no canto de cima à esquerda
  uniform vec2 uResolucao; // px de CSS da janela
  uniform float uPixelRatio;
  uniform float uSigma;
  uniform vec3 uCor;
  uniform float uIntensidade;
  uniform float uProgressoDoTempo; // 0..1 ao longo do efeito inteiro (400 ms)

  // SDF de um retângulo alinhado aos eixos (Inigo Quilez) — negativo
  // dentro, zero na borda, positivo fora.
  float distanciaAoRetangulo(vec2 p, vec2 meio) {
    vec2 d = abs(p) - meio;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }

  void main() {
    // gl_FragCoord é SEMPRE px de FRAMEBUFFER, origem embaixo à
    // esquerda — ÷ pixelRatio volta a px de CSS, e o flip em Y devolve
    // a origem de cima à esquerda, a mesma do DOMRect que alimenta
    // uRetangulo (caixaDeRepouso, App.tsx).
    vec2 px = gl_FragCoord.xy / uPixelRatio;
    px.y = uResolucao.y - px.y;

    vec2 meio = uRetangulo.zw * 0.5;
    vec2 centro = uRetangulo.xy + meio;
    float d = distanciaAoRetangulo(px - centro, meio);

    // SÓ FORA (regra 5/item 2 da seção 7): o DOM opaco já cobre o
    // interior, então a luz só existe onde a página não pintou nada —
    // nunca por cima do texto.
    float base = step(0.0, d) * exp(-pow(max(d, 0.0) / uSigma, 2.0));

    // A BORDA DE CIMA inteira, esmaecendo mais depressa que o envelope
    // geral — um lampejo que já não está lá quando o ponto quente
    // ainda desce a borda esquerda.
    float pesoDoTopo = exp(-pow((px.y - uRetangulo.y) / uSigma, 2.0));
    float esmaecimentoDoTopo = exp(-uProgressoDoTempo * 6.0);

    // O PONTO QUENTE na borda ESQUERDA — a de FRENTE, porque o painel
    // entra da direita e é ela quem chega primeiro. Desce do topo à
    // base ao longo do próprio efeito; largura ~25% da altura do
    // painel.
    float alturaDoQuente = mix(uRetangulo.y, uRetangulo.y + uRetangulo.w, uProgressoDoTempo);
    float larguraDoQuente = max(uRetangulo.w * 0.25, 1.0);
    float pesoDoQuente =
      exp(-pow((px.x - uRetangulo.x) / uSigma, 2.0)) *
      exp(-pow((px.y - alturaDoQuente) / larguraDoQuente, 2.0));

    // OS REFORÇOS MULTIPLICAM A BASE, nunca somam soltos: presos à
    // MESMA queda com a distância real ao retângulo — um termo aditivo
    // que dependesse só de X ou só de Y vazaria reto ao longo do eixo
    // todo, bem além de onde o painel de fato está.
    float reforco = 1.0 + pesoDoTopo * esmaecimentoDoTopo + 1.6 * pesoDoQuente;

    gl_FragColor = vec4(uCor * uIntensidade * base * reforco, 1.0);
  }
`;

/**
 * O PASSE DECORATIVO — cena, câmera e quad PRÓPRIOS, fora da `Scene`
 * científica: é tinta 2D por cima do quadro já pronto, não um objeto
 * disputando luz/fog com o resto do mundo (regra 1 da seção 7 fala de
 * não abrir OUTRO CONTEXTO nem uma cena 3D por menu — isto reaproveita
 * o mesmo `WebGLRenderer`/loop, e é UM passe, não uma cena por painel).
 */
export class ContornoDaUi {
  private estado: EstadoAtivo | null = null;
  private readonly cena = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(0, 1, 0, 1, 0.1, 10);
  private readonly geometria = new THREE.PlaneGeometry(1, 1);
  private readonly material: THREE.ShaderMaterial;
  private readonly malha: THREE.Mesh;

  constructor() {
    this.camera.position.z = 1;
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      // A câmera inverte o Y (topo 0, base = altura, como o CSS), e o
      // quad chegaria à tela com a volta trocada — sem os dois lados, a
      // face da frente seria descartada e o halo nunca apareceria.
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        uRetangulo: { value: new THREE.Vector4() },
        uResolucao: { value: new THREE.Vector2(1, 1) },
        uPixelRatio: { value: 1 },
        uSigma: { value: SIGMA_PX },
        uCor: { value: COR_ACENTO },
        uIntensidade: { value: 0 },
        uProgressoDoTempo: { value: 0 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
    });
    this.malha = new THREE.Mesh(this.geometria, this.material);
    this.cena.add(this.malha);
  }

  /** LIGA/RETARGETA — uma nova abertura sempre substitui a anterior
   *  (regra 3 da seção 7: "não enfileirar rastros luminosos"). */
  acender(parametros: ParametrosDoContorno): void {
    this.estado = { ...parametros, inicioMs: performance.now() };
  }

  apagar(): void {
    this.estado = null;
  }

  /**
   * DESENHA, se houver o que desenhar — chamada todo quadro, sem
   * condição nenhuma do lado de fora (`Director.tick`, logo depois de
   * `this.post.render(time)`, o composite científico já pronto). Sai
   * na PRIMEIRA linha em repouso: nenhuma leitura de uniform, nenhum
   * `renderer.render` — é isso que cumpre "fora do efeito, nenhum
   * passe decorativo executado" (regra 4 da seção 7).
   */
  desenhar(renderer: THREE.WebGLRenderer): void {
    const estado = this.estado;
    if (!estado) return;
    const decorridoMs = performance.now() - estado.inicioMs;
    // A INTENÇÃO MUDOU (§7, regra 3): a entrada que o halo acompanha foi
    // cancelada — o painel está saindo ou foi trocado —, então o halo some
    // junto, em vez de brilhar no lugar de repouso de um painel que já foi.
    if (efeitoTerminou(decorridoMs) || estado.animacao.playState === 'idle') {
      this.estado = null;
      return;
    }
    const progress = estado.animacao.effect?.getComputedTiming().progress ?? 1;
    const x = posicaoXDoHalo(estado.retangulo.x, estado.deslocamentoInicialPx, progress);
    const { y, width, height } = estado.retangulo;

    const larguraCss = window.innerWidth;
    const alturaCss = window.innerHeight;
    const pixelRatio = renderer.getPixelRatio();

    // A CÂMERA EM PX DE CSS: left/top ficam em 0 (o quad já nasce na
    // posição certa via `malha.position`); só a janela muda de quadro
    // a quadro, então só right/bottom precisam de `updateProjectionMatrix`.
    this.camera.right = larguraCss;
    this.camera.bottom = alturaCss;
    this.camera.updateProjectionMatrix();

    this.malha.position.set(x + width / 2, y + height / 2, 0);
    this.malha.scale.set(width + MARGEM_DO_QUAD_PX * 2, height + MARGEM_DO_QUAD_PX * 2, 1);

    const u = this.material.uniforms;
    (u.uRetangulo.value as THREE.Vector4).set(x, y, width, height);
    (u.uResolucao.value as THREE.Vector2).set(larguraCss, alturaCss);
    u.uPixelRatio.value = pixelRatio;
    u.uIntensidade.value = PICO_DE_INTENSIDADE * envelopeDoTempo(decorridoMs);
    u.uProgressoDoTempo.value = Math.min(1, decorridoMs / DURACAO_DO_HALO_MS);

    // AUTOCLEAR FORA enquanto dura o passe: o quadro científico já está
    // pronto no framebuffer (renderTarget null, o próprio composite do
    // Post termina ali) e este é só tinta ADITIVA por cima. Restaurado
    // na mesma função, síncrono — nada mais lê o renderer no meio.
    const autoClearAntes = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setRenderTarget(null);
    renderer.render(this.cena, this.camera);
    renderer.autoClear = autoClearAntes;
  }

  /** descarte explícito (regra 4 da seção 7) — chamado por
   *  `Director.dispose()`, junto dos outros passes. */
  dispose(): void {
    this.estado = null;
    this.geometria.dispose();
    this.material.dispose();
  }
}
