// ============================================================
// Engine — renderer WebGL2 HDR, cena, câmera, loop e a MEDIÇÃO do
// quadro (quantos quadros por segundo, e que tier isso indica).
//
// O QUE ELE NÃO FAZ MAIS, desde a letra D dos Ajustes: trocar de tier
// por conta própria. O antigo auto-quality media e APLICAVA — e
// aplicava só a metade viva (pixel ratio, passos do raymarch), deixando
// a alocação no tier de antes. Agora ele mede e AVISA (`onMedicao`);
// quem aplica é o Director, pela via viva que a letra C abriu, e só
// quando o visitante escolheu Auto.
// ============================================================
import * as THREE from 'three';
import { LIMIAR_SISTEMA_SOLAR_PC } from '../escala';

export type QualityLevel = 'cinema' | 'alta' | 'performance';

export type ToneMapMode = 'aces' | 'agx' | 'neutral' | 'linear';

export const TONE_MAPPINGS: Record<ToneMapMode, THREE.ToneMapping> = {
  aces: THREE.ACESFilmicToneMapping,
  agx: THREE.AgXToneMapping,
  neutral: THREE.NeutralToneMapping,
  linear: THREE.LinearToneMapping,
};

/**
 * O inverso do mapa acima: qual curva está viva no renderer. Existe
 * para o selo de honestidade poder LER o estado do instrumento em vez
 * de guardar uma segunda cópia dele — o dia em que as duas divergissem,
 * o selo estaria declarando o que não é.
 */
export function modoDoToneMapping(tm: THREE.ToneMapping): ToneMapMode {
  return (
    (Object.keys(TONE_MAPPINGS) as ToneMapMode[]).find((k) => TONE_MAPPINGS[k] === tm) ??
    'aces'
  );
}

/**
 * AS DUAS PORTAS DE GOSTO, lidas num lugar só — `?tone=` e `?exp=`.
 *
 * Elas existiam DUAS vezes no `App.tsx`: com guarda no caminho que fala
 * com o engine (`tone in TONE_MAPPINGS`, `Number.isFinite && > 0`) e SEM
 * guarda no inicializador do estado React, que é quem pinta o HUD. Com
 * `?exp=abc` o painel mostrava "Exposição · NaN" e um slider com
 * `value={NaN}`; com `?tone=foo` os quatro rádios ficavam desmarcados —
 * a tela mentindo sobre o que o instrumento aplica. Achado de auditoria
 * externa; o conserto é a lei UMA SÓ, aqui, no módulo que é dono das
 * duas (`setToneMapping`/`setExposure` moram logo abaixo).
 *
 * Devolvem `null` para "não pediram nada de válido" — quem chama é que
 * conhece o padrão, e é o mesmo contrato de `lerPortaJd`.
 */
export function lerPortaTom(bruto: string | null | undefined): ToneMapMode | null {
  // `Object.keys` e NÃO o `in` que a guarda antiga usava: `in` anda na
  // cadeia de protótipos, então `?tone=constructor` passava e o engine
  // recebia a função `Object` como curva de tonemapping. Achado ao
  // escrever o teste desta porta — o relatório não tinha visto.
  return (Object.keys(TONE_MAPPINGS) as ToneMapMode[]).find((m) => m === bruto) ?? null;
}

/**
 * Exposição em multiplicador do tempo de exposição. Só positivo finito
 * passa: 0 apagaria a tela e negativo não tem significado físico. Sem
 * teto de propósito — quem escreve `?exp=8` está estourando o quadro a
 * pedido, e a captura tem de poder.
 */
export function lerPortaExposicao(bruto: string | null | undefined): number | null {
  const v = Number(bruto);
  return Number.isFinite(v) && v > 0 ? v : null;
}

interface QualityPreset {
  pixelRatio: number;
  nebulaSteps: number;
  grain: number;
}

// grain agora é DISPLAY-space (film pass pós-tonemap): 0.055 era
// calibrado para o espaço linear onde o ACES o esmagava — em display
// vira granulado de vídeo; cinema real fica em ~1% de swing.
const PRESETS: Record<QualityLevel, QualityPreset> = {
  cinema: { pixelRatio: 2.0, nebulaSteps: 56, grain: 0.012 },
  alta: { pixelRatio: 1.5, nebulaSteps: 44, grain: 0.01 },
  performance: { pixelRatio: 1.0, nebulaSteps: 30, grain: 0.008 },
};

/**
 * O TIER SEM `?q=` — uma constante, e a constante é CINEMA (Ajustes D
 * do NORTE, a régua do dono: *detecção nunca decide; medição sugere; o
 * visitante escolhe*).
 *
 * LÁPIDE DE `defaultQualityForDevice` E DE `tierQueRodou`. Até 20/08 o
 * tier inicial saía de três palpites em cascata — a URL, depois o
 * veredito MEDIDO na visita passada (storage), depois a detecção por
 * touch/tela, e um rebaixamento extra quando o renderer se nomeava
 * software. Os três decidiam ALOCAÇÃO (4,02 M partículas em cinema, o
 * tier do Sol) pelas costas do visitante, e o pior deles era o
 * storage: um `alta` medido ontem sobrepunha o clique em Cinema de
 * hoje. Nenhum deles sobrevive à letra D — o que o aparelho aguenta
 * deixou de ser palpite de boot e virou MEDIÇÃO viva, que SUGERE (o
 * painel diz) e só APLICA quando o visitante escolheu Auto.
 */
export const TIER_DE_PRODUTO: QualityLevel = 'cinema';

/**
 * A ESCOLHA do seletor — os três tiers mais o `auto`, que NÃO é tier:
 * é a política de quem aceita a sugestão da medição. O mundo é sempre
 * um dos três; `auto` só diz quem escolhe qual.
 */
export type EscolhaDeQualidade = QualityLevel | 'auto';

/**
 * A LEI DA PORTA `?q=`, num lugar só — o precedente é `lerPortaTom`, e
 * a lição é a mesma do `?tone=constructor`: comparação por literal,
 * nunca `in` nem `includes` sobre coisa herdada. `null` = "não pediram
 * nada de válido", e quem chama conhece o padrão (`TIER_DE_PRODUTO`).
 */
export function lerPortaQualidade(
  bruto: string | null | undefined
): EscolhaDeQualidade | null {
  return (['cinema', 'alta', 'performance', 'auto'] as const).find((v) => v === bruto)
    ?? null;
}

/** quanto tempo de quadro entra em cada amostra da medição */
const JANELA_DA_MEDIDA_S = 2.5;

/** o passo que o INTEGRADOR aceita — depois de um engasgo a animação
 *  anda `GRAMPO_DO_PASSO_S` e não salta o buraco inteiro. Exportado
 *  porque é a régua de quem mede o filme em QUADROS e não em parede
 *  (o Director o republica em `grampoDoPasso`, para o harness). */
export const GRAMPO_DO_PASSO_S = 0.05;

/**
 * O MEDIDOR DE QUADROS — puro, para ser julgado sem GPU.
 *
 * SÃO DUAS GRANDEZAS, e confundi-las era o item 68. O integrador quer o
 * passo DOMADO (`GRAMPO_DO_PASSO_S`, senão a animação salta o engasgo);
 * o medidor quer o RELÓGIO DE PAREDE. Enquanto a janela somava o `dt`
 * grampeado, `quadros ÷ tempo` tinha um CHÃO de 1 ÷ 0,05 = 20 q/s que
 * nenhuma máquina lenta atravessava: medidos nesta bancada 60 quadros
 * em 4,00 s reais — 15,0 q/s — e o painel dizia 20,3.
 *
 * O que a correção NÃO mexe: as decisões do Auto. Acima de 20 q/s
 * nenhum quadro grampeia e os dois tempos são o MESMO número; abaixo,
 * os limiares de `QUEDA` (42 e 34) já estavam ambos acima do chão, e
 * uma medida mais baixa cai do mesmo lado deles. Quem mentia era o
 * MOSTRADOR — e mentiria também qualquer limiar futuro abaixo de 20.
 */
export class MedidorDeQuadros {
  private quadros = 0;
  private janelaS = 0;

  zerar() {
    this.quadros = 0;
    this.janelaS = 0;
  }

  /**
   * Um quadro. Devolve a amostra quando a janela fecha (e recomeça),
   * ou `null` enquanto ela ainda está enchendo.
   *
   * @param dtRealS o tempo REAL desde o quadro anterior — nunca o do tick
   */
  amostrar(
    dtRealS: number,
    janelaS = JANELA_DA_MEDIDA_S
  ): { fps: number; janelaS: number } | null {
    this.quadros++;
    this.janelaS += dtRealS;
    if (this.janelaS <= janelaS) return null;
    const amostra = { fps: this.quadros / this.janelaS, janelaS: this.janelaS };
    this.zerar();
    return amostra;
  }
}

/**
 * O QUE A MEDIÇÃO INDICA, puro. Abaixo do limiar do tier que está
 * rodando, a medida pede o degrau de baixo; no teto do monitor (e com a
 * espera cumprida), o de cima. Fora disso, o de agora — e "o de agora"
 * é o que faz o painel ficar calado quando não há nada a sugerir.
 *
 * OS LIMIARES SÃO OS DE SEMPRE (42 e 34): eram o gatilho do antigo
 * auto-quality, que aplicava sozinho. A letra D não os re-dosou — mudou
 * QUEM os obedece.
 */
const QUEDA: Record<QualityLevel, { abaixoDe: number; para: QualityLevel }> = {
  cinema: { abaixoDe: 42, para: 'alta' },
  alta: { abaixoDe: 34, para: 'performance' },
  // o degrau mais baixo não tem para onde cair
  performance: { abaixoDe: 0, para: 'performance' },
};
const SUBIDA: Record<QualityLevel, QualityLevel> = {
  performance: 'alta',
  alta: 'cinema',
  cinema: 'cinema',
};

export function tierMedido(
  atual: QualityLevel,
  quadrosPorSegundo: number,
  noTetoDoMonitor: boolean
): QualityLevel {
  if (quadrosPorSegundo < QUEDA[atual].abaixoDe) return QUEDA[atual].para;
  return noTetoDoMonitor ? SUBIDA[atual] : atual;
}

/** do mais barato ao mais caro — só o `applyQuality` precisa da ordem */
const ORDEM_DOS_TIERS: readonly QualityLevel[] = ['performance', 'alta', 'cinema'];
/** depois de CAIR, 15 s antes de a medição poder pedir para subir */
const ESPERA_APOS_QUEDA_S = 15;
/** depois de SUBIR, 10 s antes do próximo degrau */
const ESPERA_APOS_SUBIDA_S = 10;

/**
 * A JANELA DO VAI-E-VOLTA: subir para um tier e cair dele dentro dela é
 * o aparelho na FRONTEIRA do limiar, não um engasgo que passou. O
 * vai-e-volta medido fecha em 2,5 s — uma janela de medida depois de a
 * espera de subida vencer —, então 20 s são oito janelas de margem, e
 * ainda ficam longe de uma cena que o próprio visitante tornou pesada.
 */
const JANELA_DO_VAIVEM_S = 20;

/**
 * A TRAVA DE VAI-E-VOLTA — pura, para ser julgada sem GPU.
 *
 * O QUE ELA FECHA: o `upgradeCooldown` segura só a SUBIDA. Um aparelho
 * parado na fronteira dos 42 fps caía para alta, esperava os 15 s,
 * subia para cinema no teto do monitor e caía de novo na PRIMEIRA
 * janela de medida: 17,5 s por volta, para sempre, assando um mundo
 * inteiro a cada volta. Fazer a QUEDA esperar também não resolve — só
 * alonga o ciclo (30 s em vez de 17,5). O que o mata é parar de PROPOR
 * a subida.
 *
 * A REGRA: subiu para X e a MEDIÇÃO derrubou de X dentro da janela → a
 * escada desarma, e a medição não pede mais subida nenhuma. Rearma
 * quando alguém sobe de tier — e isso é dedução, não confiança: com a
 * trava armada a medição nunca propõe subida (`tierMedido` sem
 * `noTetoDoMonitor` devolve o tier de agora ou o de baixo), então
 * subida que chegue aqui só pode ter vindo do VISITANTE.
 *
 * A queda só conta se veio da MEDIÇÃO, e por isso o quarto argumento:
 * quem desce dois degraus na mão em poucos segundos (medido no
 * navegador: alta → cinema → performance) não está numa fronteira, está
 * experimentando o painel — e armava a trava sem ter engasgado.
 */
export class TravaDoVaivem {
  private subiuPara: QualityLevel | null = null;
  private quandoSubiu = 0;
  /** com a trava armada a medição não pede mais subida */
  travada = false;

  /** anota uma troca JÁ decidida; `agora` em segundos de sessão */
  anotar(
    de: QualityLevel,
    para: QualityLevel,
    agora: number,
    daMedicao: boolean
  ) {
    const passo = ORDEM_DOS_TIERS.indexOf(para) - ORDEM_DOS_TIERS.indexOf(de);
    if (passo === 0) return;
    if (passo > 0) {
      this.travada = false;
      this.subiuPara = para;
      this.quandoSubiu = agora;
      return;
    }
    if (
      daMedicao
      && this.subiuPara === de
      && agora - this.quandoSubiu <= JANELA_DO_VAIVEM_S
    ) {
      this.travada = true;
    }
    this.subiuPara = null;
  }
}

/** O que a última janela de medida viu, e o que ela indica. */
export interface MedicaoDoQuadro {
  /** média de quadros por segundo na janela */
  fps: number;
  /** o tier que ESTA medida indica — igual ao vivo quer dizer "nada a sugerir" */
  sugestao: QualityLevel;
}

/**
 * O QUE O HUD PRECISA SABER DA QUALIDADE (Ajustes D). São três coisas
 * distintas e nenhuma deriva das outras: o que o visitante ESCOLHEU (um
 * tier ou `auto`), o tier que está VIVO (em Auto ele muda sem clique
 * nenhum), e o que a MEDIÇÃO indica agora (`null` = ainda medindo).
 * Quem publica é o Director — ele é o dono da política.
 */
export interface EstadoDaQualidade {
  escolha: EscolhaDeQualidade;
  tier: QualityLevel;
  medicao: MedicaoDoQuadro | null;
  /**
   * O MSAA ESCOLHIDO À MÃO na gaveta Avançado (item 145) — `null` = o do
   * preset. Ele viaja JUNTO da qualidade porque é o mesmo assunto na
   * tela: o painel desenha os dois um embaixo do outro, e é este campo
   * que faz `rotuloDaQualidade` dizer "Personalizado" em vez de fingir
   * que o preset ainda descreve o que a máquina está desenhando. Quem o
   * publica é o Director, lendo o Post — não há segunda cópia.
   */
  amostras: number | null;
}

/**
 * Guarda mínima do near no domínio profundo: 1e-8 pc = 2,06e-3 UA ≈
 * 308 mil km (0,8× a distância Terra–Lua). Não é janela nem
 * calibração — é o anteparo contra `near = 0`, que a projeção não
 * suporta (a câmera pode parar na origem exata, onde o Sol está).
 * ONDE ELE MANDA, dito por extenso: a proporção `d·0,004` só fica
 * abaixo dele com a câmera a menos de 2,5e-6 pc = 0,52 UA do Sol —
 * dentro da órbita de Vênus. Acima disso quem governa é a proporção,
 * e é ela que abre o sistema solar.
 */
export const DEEP_NEAR_MIN_PC = 1e-8;

/**
 * NEAR PLANE, PIECEWISE PELO LIMIAR DO DOMÍNIO PROFUNDO (decisão D5 da
 * Onda 4). Puro e exportado para o oráculo: o gate desta fase é a
 * IGUALDADE BIT A BIT acima do limiar, e ela se prova sem GPU.
 *
 * ACIMA de `LIMIAR_SISTEMA_SOLAR_PC` a fórmula é a de sempre, verbatim, com os
 * três literais intocados — inclusive o piso de 0,001 pc (= 206,3 UA),
 * que é o que faz as 15 vistas antigas e o filme inteiro (piso
 * 0,0631506 pc) saírem sem um pixel de diferença:
 *   near cap 40 pc (era 500): no free-roam profundo o near de
 *   centenas de pc comia o campo estelar envolvente. far mínimo
 *   60 kpc: com 9 kpc, metade distante da faixa era clipada mesmo
 *   em casa. Quase tudo é aditivo sem depthWrite — a precisão de
 *   depth não é o gargalo aqui.
 *
 * ABAIXO do limiar o piso SAI: a 150 UA da câmera o near de 206 UA
 * clipava o sistema solar inteiro — era o obstáculo mais duro do
 * domínio de escala aninhado, e some com esta linha. Sobra a mesma
 * proporcionalidade de sempre (0,4% da distância), agora até o fim.
 *
 * O DEGRAU NA FRONTEIRA é declarado, não acidental: em 0,05 pc o near
 * cai de 0,001 para 0,0002 pc de uma vez (o piso deixa de valer).
 * Ninguém vê — e desde a Onda 6 a razão é CONTA, não premissa: a
 * antiga ("não há geometria entre 41 e 206 UA") morreu quando o palco
 * local pôs corpos resolvidos no domínio profundo. A conta: quem cruza
 * a fronteira está a 0,05 pc = 10.313 UA da âncora mais próxima, e
 * todo corpo do retrato orbita a ≤ 40 UA do Sol (Plutão, o mais
 * distante, a 35,4) — o corpo mais próximo possível fica a ≥ 10.273 UA
 * da câmera, 49 vezes além da faixa de 41–206 UA que o degrau
 * toca; o disco artístico do Sol (2.269 UA de raio) fica a ≥ 8.044 UA.
 * Pinada em `engine.test.ts`. O que o degrau custa é uma reconstrução
 * de matriz de projeção ao cruzar o limiar — a mesma que o guarda de
 * 5% do `updateClip` já dosa.
 *
 * O PALCO LOCAL (Onda 6, F0 — D1): com um corpo RESOLVIDO em quadro o
 * near passa a acompanhar a superfície mais próxima, com a MESMA
 * proporção de sempre (0,4% da distância) — o regime é o termo
 * proporcional, nunca o piso. O piso deixa de ser o do Sol
 * (`DEEP_NEAR_MIN_PC` = 308 mil km, absurdo ao lado de Fobos) e deriva
 * do RAIO do corpo: UM MILÉSIMO dele. Era METADE (a mesma ordem do
 * anteparo da origem, 0,44 raio solar) até o item 135 (02/09): metade
 * do raio só empata com a proporção a 125 raios da superfície, então
 * de 125 raios para dentro o "piso" era o REGIME — 30 mil km em
 * Saturno, e o anel, que se estende a 2,3 raios e passa rente à câmera,
 * saía cortado por uma linha reta ("como se batesse na lente", palavras
 * do dono). Um milésimo empata a 0,25 raio: dali para dentro a câmera
 * já está mais perto da superfície que a própria curvatura do corpo, e
 * o anteparo (60 km em Saturno, 6 km na Terra, 11 m em Fobos) só existe
 * contra `d_superfície ≤ 0` (câmera tocando ou dentro do corpo) — é
 * anteparo, nunca calibração. `dSuperficiePc`/`raioPc` NaN ou ausentes =
 * sem corpo em quadro, e o par (near, far) é BIT-IDÊNTICO ao vigente:
 * NaN reprova toda comparação e o ramo novo nem executa (pino de
 * neutralidade em `engine.test.ts` — é ele que sustenta o 18/18 da F0).
 */
/** o anteparo do near com corpo em quadro, em RAIOS do corpo (item 135) */
export const PISO_DO_NEAR_EM_RAIOS = 1e-3;

export function nearPlanePc(
  distFromSun: number,
  dSuperficiePc = Number.NaN,
  raioPc = Number.NaN
): number {
  const semCorpo =
    distFromSun >= LIMIAR_SISTEMA_SOLAR_PC
      ? THREE.MathUtils.clamp(distFromSun * 0.004, 0.001, 40)
      : Math.max(distFromSun * 0.004, DEEP_NEAR_MIN_PC);
  if (!(Number.isFinite(dSuperficiePc) && Number.isFinite(raioPc) && raioPc > 0)) {
    return semCorpo;
  }
  return Math.min(semCorpo, Math.max(dSuperficiePc * 0.004, raioPc * PISO_DO_NEAR_EM_RAIOS));
}

/**
 * FAR PLANE — inalterado pela Onda 4, e é de propósito: o que muda no
 * domínio profundo é o quão PERTO se enxerga, não o quão longe. Fica
 * como função só para o oráculo poder julgar o PAR (near, far) que o
 * `updateClip` entrega, que é o que o gate promete.
 */
export function farPlanePc(distFromSun: number): number {
  return THREE.MathUtils.clamp(distFromSun * 12, 60000, 400000);
}

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  quality: QualityLevel = 'cinema';

  private timer = new THREE.Timer();
  private raf = 0;
  private tickFns = new Set<(t: number, dt: number) => void>();
  private resizeFns = new Set<(w: number, h: number) => void>();
  private qualityFns = new Set<(quality: QualityLevel) => void>();
  private medidor = new MedidorDeQuadros();
  private medicaoFns = new Set<(m: MedicaoDoQuadro) => void>();
  private contextoPerdidoFns = new Set<() => void>();
  /**
   * A ÚLTIMA MEDIDA, ou `null` para "ainda medindo" — e ela volta a
   * `null` a cada troca de tier: a média do tier que saiu não diz nada
   * sobre o que entrou.
   */
  private medicaoAtual: MedicaoDoQuadro | null = null;
  /** teto de refresh observado (proxy do monitor) — sob vsync a 60 Hz
   *  "avg > 72" nunca acontece; os limiares de subida são relativos */
  private peakAvg = 0;
  private upgradeCooldown = 0;
  /** a trava anti-vai-e-volta do Auto (ver `TravaDoVaivem`) */
  private travaDoVaivem = new TravaDoVaivem();
  /** a media query armada no DPR vivo — trocar de monitor a dispara */
  private vigiaDeDpr: MediaQueryList | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      // AA NÃO SE LIGA AQUI, e não é escolha: esta flag governa só o
      // framebuffer do CANVAS, que neste app recebe um quad de tela cheia
      // e nada mais — a cena 3D é rasterizada no alvo do `EffectComposer`
      // (`core/post.ts`, `AMOSTRAS_DO_ALVO`), e é lá que o MSAA mora
      // desde 31/08. Ligá-la aqui é INERTE, e foi medido assim.
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      // O BUFFER DE PROFUNDIDADE DA TELA era memória paga e inútil
      // (item 21): TUDO renderiza dentro do composer (que tem os RTs
      // e o depth PRÓPRIOS) e o que chega ao canvas é o blit de um
      // quad — um fullscreen quad não testa profundidade. Medido na
      // época: ~22,9 MB de VRAM devolvidos numa tela retina.
      depth: false,
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = true;

    this.camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.001, 9000);
    this.camera.position.set(0.03, 0.015, 0.07);
    this.timer.connect(document);

    // ?q= tem de valer ANTES do init: o tier do Sol congela no construtor do
    // Director e a população da galáxia é decidida durante o init. Aplicado
    // só depois (App.tsx), performance ficava com as 2,7 M partículas e o Sol
    // em high — exatamente onde a economia é necessária.
    //
    // A PRECEDÊNCIA ENCOLHEU PARA DUAS LINHAS (Ajustes D): a URL, e o
    // tier de produto. `?q=auto` é POLÍTICA, não tier — o mundo nasce em
    // cinema como qualquer outro boot e quem o move depois é a medição,
    // pela via viva do `Director.setQuality`. Nada de storage, nada de
    // detecção: ver a lápide em `TIER_DE_PRODUTO`.
    const escolha = lerPortaQualidade(
      new URLSearchParams(window.location.search).get('q')
    );
    this.applyQuality(escolha && escolha !== 'auto' ? escolha : TIER_DE_PRODUTO);
    this.resize();
    window.addEventListener('resize', this.resize);
    canvas.addEventListener('webglcontextlost', this.aoPerderContexto);
    this.armarVigiaDeDpr();
  }

  /**
   * A PLACA DESISTIU. Sem este listener o sintoma medido era o pior de
   * todos: o canvas congela na última imagem, o HUD inteiro continua no
   * ar respondendo a clique, o console fica MUDO e nada na tela diz que
   * acabou — a sessão parece viva e não é.
   *
   * `preventDefault` porque é ele que tira o evento das mãos do browser;
   * e o laço para na hora, senão são 60 draws por segundo num contexto
   * que não existe mais.
   *
   * NÃO SE TENTA RESTAURAR, e isso é decisão medida, não preguiça: o que
   * se perde com o contexto não são só os objetos que o three refaz
   * sozinho — são os dois mapas assados na GPU, as lâminas do disco, o
   * `prime` do Sol e os alvos do pós. Refazê-los é a cadeia inteira do
   * boot (segundos de forno), e uma restauração pela metade devolveria
   * uma galáxia sem disco fingindo que está tudo bem. Recarregar é
   * honesto e é o que o véu pede.
   */
  private aoPerderContexto = (e: Event) => {
    e.preventDefault();
    this.parar();
    this.contextoPerdidoFns.forEach((f) => f());
  };

  /** avisa que o contexto WebGL morreu — quem escuta é o véu de erro */
  onContextoPerdido(fn: () => void) {
    this.contextoPerdidoFns.add(fn);
  }

  /**
   * PARA O LAÇO e nada mais — a cena, o renderer e os recursos ficam de
   * pé. Existe porque há duas mortes diferentes: a do `dispose()`, que
   * desmonta tudo, e a da falha em quadro (contexto perdido, exceção no
   * tick), em que o que se quer é só deixar de desenhar enquanto o véu
   * de erro conta o que aconteceu. Idempotente: `cancelAnimationFrame`
   * de um id já cancelado é no-op.
   */
  parar() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  get preset(): QualityPreset {
    return PRESETS[this.quality];
  }

  /**
   * Curva de tom. É GOSTO, não física: cada operador decide o que fazer com
   * o que passa de 1, e isso muda croma e faixa dinâmica. O ACES comprime e
   * dessatura os altos — bom para pele, discutível para uma galáxia, onde a
   * cor dos altos é justamente o dado. AgX preserva mais croma e escurece;
   * Neutral fica no meio; Linear não faz nada e estoura, mas serve para ver
   * o que a cena realmente produz antes de qualquer curva.
   *
   * Não precisa de traverse: a cena SÓ é renderizada dentro do composer, e
   * com render target amarrado o three compila os materiais com NoToneMapping
   * (o operador é do OutputPass, que recompila o próprio shader sozinho).
   * O traverse que havia aqui recompilava a cena inteira sem efeito visual —
   * é o hitch de compilação que o warm-up do director existe para evitar.
   */
  setToneMapping(mode: ToneMapMode) {
    this.renderer.toneMapping = TONE_MAPPINGS[mode];
  }

  setExposure(v: number) {
    this.renderer.toneMappingExposure = v;
  }

  /**
   * Planos de corte dinâmicos — a cena vai de 0,01 pc a ~25.000 pc;
   * sem isso o depth buffer colapsaria num extremo ou no outro.
   * Desde a Onda 6 o `min()` aceita a superfície resolvida mais
   * próxima (o Director a lê do palco local): NaN/ausente = o par de
   * sempre, bit a bit — ver `nearPlanePc`.
   */
  updateClip(distFromSun: number, dSuperficiePc = Number.NaN, raioCorpoPc = Number.NaN) {
    const near = nearPlanePc(distFromSun, dSuperficiePc, raioCorpoPc);
    const far = farPlanePc(distFromSun);
    if (
      Math.abs(near - this.camera.near) / near > 0.05 ||
      Math.abs(far - this.camera.far) / far > 0.05
    ) {
      this.camera.near = near;
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * TROCA O INSTRUMENTO. A metade assada do tier é do Director
   * (`setQuality` → `reassarMundo`); daqui sai o pixel ratio, os passos
   * do raymarch e o grão.
   *
   * E RECOMEÇA A MEDIDA, que é a outra metade do contrato da letra D: a
   * média do tier que saiu não diz nada sobre o que entrou, então a
   * sugestão volta a "medindo" e a espera anti-vaivém é rearmada — 15 s
   * depois de uma QUEDA (não subir de volta em cima do mesmo engasgo) e
   * 10 s depois de uma SUBIDA. Os dois números são os do auto-quality
   * que morreu aqui; o que mudou é quem obedece a eles.
   *
   * E A TROCA É ANOTADA na `TravaDoVaivem`, que é o que impede o Auto de
   * balançar para sempre num aparelho parado na fronteira do limiar. A
   * espera sozinha nunca conseguiu: ela segura a subida e a queda vem na
   * janela seguinte.
   */
  applyQuality(q: QualityLevel) {
    const antes = this.quality;
    // quem PEDIU esta troca: a medição só age pela sugestão que acabou
    // de publicar, e é a última coisa que ainda dá para saber daqui —
    // o engine mede e não conhece o painel
    const daMedicao = q === this.medicaoAtual?.sugestao;
    this.quality = q;
    this.travaDoVaivem.anotar(antes, q, this.timer.getElapsed(), daMedicao);
    this.upgradeCooldown = ORDEM_DOS_TIERS.indexOf(q) < ORDEM_DOS_TIERS.indexOf(antes)
      ? ESPERA_APOS_QUEDA_S
      : ESPERA_APOS_SUBIDA_S;
    this.medicaoAtual = null;
    this.medidor.zerar();
    this.aplicarNitidez();
    this.qualityFns.forEach((fn) => fn(q));
  }

  /** o que a medição viu por último, ou `null` enquanto ela mede */
  get medicao(): MedicaoDoQuadro | null {
    return this.medicaoAtual;
  }

  /**
   * QUEM OUVE A MEDIÇÃO. O engine MEDE e avisa; ele não troca de tier
   * sozinho — essa fronteira é a letra D inteira. Quem decide o que
   * fazer com a sugestão é o Director, que é quem sabe assar um mundo.
   */
  onMedicao(fn: (m: MedicaoDoQuadro) => void) {
    this.medicaoFns.add(fn);
  }

  /**
   * A NITIDEZ DO QUADRO (item 6): o pixel ratio é o MENOR entre o teto
   * do tier e o DPR do monitor ATUAL — relido a cada aplicação, nunca
   * guardado. Chamada pelo `applyQuality` e pelo vigia de DPR: arrastar
   * a janela para outro monitor (ou mudar o zoom) reafia a cena sem
   * recarregar, como os rótulos já faziam. O resto do pipeline não
   * precisa saber: quem depende de resolução lê `getPixelRatio()` por
   * quadro — a invariância de resolução da casa.
   */
  private aplicarNitidez() {
    const pr = Math.min(window.devicePixelRatio || 1, this.preset.pixelRatio);
    this.renderer.setPixelRatio(pr);
    this.resize();
  }

  /**
   * O VIGIA DE DPR — uma media query armada no valor VIVO; ela dispara
   * exatamente quando `devicePixelRatio` deixa de ser o que era (troca
   * de monitor, zoom do navegador), e aí a nitidez é reaplicada e o
   * vigia re-armado no valor novo. `once` porque a query velha vira
   * mentira no instante em que dispara. Não passa por `applyQuality`:
   * trocar de tela não é opinião sobre tier nem desliga o auto-quality.
   */
  private armarVigiaDeDpr() {
    if (typeof window.matchMedia !== 'function') return;
    this.vigiaDeDpr = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`
    );
    this.vigiaDeDpr.addEventListener('change', this.aoMudarDpr, { once: true });
  }

  private aoMudarDpr = () => {
    this.aplicarNitidez();
    this.armarVigiaDeDpr();
  };

  onTick(fn: (t: number, dt: number) => void) {
    this.tickFns.add(fn);
  }

  onResize(fn: (w: number, h: number) => void) {
    this.resizeFns.add(fn);
  }

  onQuality(fn: (quality: QualityLevel) => void) {
    this.qualityFns.add(fn);
  }

  private resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.resizeFns.forEach((f) => f(w, h));
  };

  start() {
    this.timer.reset();
    const loop = (timestamp: number) => {
      this.raf = requestAnimationFrame(loop);
      this.timer.update(timestamp);
      // DUAS grandezas do mesmo quadro (item 68): o real, que o medidor
      // conta, e o grampeado, que o integrador anda.
      const dtReal = this.timer.getDelta();
      const dt = Math.min(dtReal, GRAMPO_DO_PASSO_S);
      const t = this.timer.getElapsed();

      // A MEDIÇÃO (Ajustes D). Ela roda SEMPRE — inclusive com o
      // seletor no manual —, porque a régua do dono é "medição sugere":
      // uma sugestão que só existisse depois de o visitante já ter
      // escolhido Auto não sugeriria nada a ninguém. O que ela nunca faz
      // é trocar de tier: daqui sai um aviso, não uma decisão.
      const amostra = this.medidor.amostrar(dtReal, JANELA_DA_MEDIDA_S);
      if (amostra) {
        const avg = amostra.fps;
        this.peakAvg = Math.max(this.peakAvg, avg);
        this.upgradeCooldown = Math.max(0, this.upgradeCooldown - amostra.janelaS);
        // subir pede limiar RELATIVO ao teto de refresh observado (94%)
        // + a espera anti-vaivém — limiares absolutos (>72 fps) eram
        // inatingíveis sob vsync a 60 Hz. E a TRAVA, que é o que faz o
        // Auto parar de balançar depois de a primeira volta se fechar.
        const noTeto =
          this.peakAvg > 20
          && avg > this.peakAvg * 0.94
          && this.upgradeCooldown <= 0
          && !this.travaDoVaivem.travada;
        const sugestao = tierMedido(this.quality, avg, noTeto);
        const antes = this.medicaoAtual;
        this.medicaoAtual = { fps: avg, sugestao };
        // AVISA QUANDO A SUGESTÃO MUDA (inclusive a primeira, que sai do
        // "medindo") OU QUANDO O NÚMERO ANDOU DE VERDADE. O critério do
        // número entrou no item 145: o mostrador virou a RÉGUA da gaveta
        // Avançado — o dono troca a suavização de bordas e compara os
        // quadros/s ali mesmo —, e sem ele o painel ficava preso no
        // valor de ANTES da troca até a sugestão mudar (medido a
        // 2560×1500: 21 quadros/s no rótulo com a cena já a 25).
        // Movimento pequeno segue calado, que era a razão original do
        // freio: o número balança sozinho de janela a janela, e um
        // evento a cada 2,5 s para dizer o mesmo é re-render do HUD à
        // toa. 5% é maior que esse balanço (a 60 quadros/s presos no
        // vsync a variação medida fica abaixo de 1%).
        if (!antes || sugestao !== antes.sugestao || Math.abs(avg - antes.fps) > antes.fps * 0.05) {
          this.medicaoFns.forEach((fn) => fn(this.medicaoAtual!));
        }
      }

      this.tickFns.forEach((f) => f(t, dt));
    };
    this.raf = requestAnimationFrame(loop);
  }

  dispose() {
    this.parar();
    window.removeEventListener('resize', this.resize);
    this.renderer.domElement.removeEventListener(
      'webglcontextlost',
      this.aoPerderContexto
    );
    this.vigiaDeDpr?.removeEventListener('change', this.aoMudarDpr);
    this.timer.dispose();
    this.renderer.dispose();
  }
}
