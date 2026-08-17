// ============================================================
// Contrato cartográfico compartilhado da Via Láctea.
//
// A geometria observável perto do Sol segue os ajustes de masers
// de Reid et al. (2019); o lado distante continua proceduralmente,
// com contraste menor, como nas impressões Gaia/ESA de 2025.
//
// Fontes primárias:
// - Gaia/ESA 2025: https://www.cosmos.esa.int/web/gaia/milky-way
// - Reid et al. 2019: https://arxiv.org/abs/1910.03357
// - Wegg et al. 2015 (barra): https://arxiv.org/abs/1504.01401
// ============================================================
import spiralModel from './spiralModel.json';
import { MEDIDAS_DA_GALAXIA } from './medidasDaGalaxia';

// ?warpamp= — multiplicador de varredura da amplitude do warp.
// Base 820 pc na borda = PISO da literatura (Chen/Skowron 2019 vão de
// ~820 a ~1310 na borda). História: a rodada 21 subiu para 1310 (teto)
// porque o gate pedia — mas o protocolo de captura de 900px sub-resolvia
// a fenda e SUBESTIMAVA o warp medido; sob o protocolo simétrico de
// 1800px (rodada 24) a régua honesta devolveu o valor original (varrido:
// 1,0×→0,699, 0,8×→0,677, 0,63×≈820 pc→0,645 — o gate quer o piso, e
// abaixo do piso é ficção; a recriação-alvo desenha um warp sutil).
const WARP_TUNE = (() => {
  if (typeof window === 'undefined') return 1;
  const v = parseFloat(
    new URLSearchParams(window.location.search).get('warpamp') ?? ''
  );
  return Number.isFinite(v) ? v : 1;
})();

const qnum = (key: string, fallback: number) => {
  if (typeof window === 'undefined') return fallback;
  const v = parseFloat(new URLSearchParams(window.location.search).get(key) ?? '');
  return Number.isFinite(v) ? v : fallback;
};
/**
 * PROFUNDIDADE da modulação m=2 no disco EXTERNO (rodada 30).
 *
 * A dominância de dois braços é da população estelar EVOLUÍDA, que é
 * concentrada: fora do círculo solar quem desenha o padrão é gás e
 * população jovem, e essa é de quatro braços (Drimmel; o mesmo motivo
 * do `uniformWeights`). Manter a modulação saturada até a borda dava
 * um disco externo de dois braços fortes sobre vazio — medido no
 * quadro face-on: m=2 0,40 contra 0,20 da recriação-alvo em
 * 1,0–1,22 R90, com m=4 0,30 contra 0,35.
 *
 * A modulação é `0,42 · (1 ± profundidade)`: a SOMA dos quatro braços
 * não depende da profundidade, então o fluxo azimutal é conservado por
 * construção — o que muda é só a repartição entre o par forte e o
 * fraco. `?armpair=1` recupera o estado anterior EXATO.
 *
 * 0,5 = o par forte vale 3× o fraco na borda, contra ∞ (2 contra 0)
 * antes. Varrido: 1,0 → clumpError 0,2886 · 0,6 → 0,1204 · 0,5 →
 * 0,0929 · 0,45 → 0,0901 · 0,3 → 0,1190 · 0,0 → 0,2112 (passa do
 * ponto: aí o disco externo fica MENOS agrupado que o alvo). A rampa
 * 7,6–11,5 kpc também é varrida: 6–10 kpc morde o miolo (0,1603) e
 * 9–13 kpc quase não age (0,2284). `?armpr0= ?armpr1=` varrem.
 */
const ARM_PAIR_DEPTH = qnum('armpair', 0.5);
const ARM_PAIR_R0 = qnum('armpr0', 7600);
const ARM_PAIR_R1 = qnum('armpr1', 11500);

/**
 * QUEBRAS DA CRISTA (rodada 31) — amplitude modulada AO LONGO do braço.
 *
 * O miolo do disco não erra por falta de contraste braço/interbraço: as
 * três escalas pequenas do `clumpInner` já batem e só a maior (1,1 kpc)
 * fica baixa. É erro de ESPECTRO — o alvo perde 22% de σ/μ de 135 pc a
 * 1,1 kpc e nós perdíamos 30%, porque nossos braços eram FITAS
 * CONTÍNUAS e a variância do alvo mora em estruturas de 1–3 kpc.
 *
 * Braço real é segmentado: HI/CO mostram quebras, ramificações e
 * esporões a cada poucos kpc (a de Perseu é a famosa). A crista ganha um
 * ganho multiplicativo de média zero.
 *
 * A COORDENADA é o que importa, e custou uma ablação: com o ganho escrito
 * em RAIO (`n(R)`) ele varia na direção ATRAVÉS do braço, a célula de
 * 1,1 kpc da régua o integra fora e o termo grande CAI. O eixo certo é o
 * conjugado de `v = θ − ln R/tan p` no plano:
 *
 *     a = ln R + θ/tan p     (∇a ⟂ ∇v)
 *
 * `a` é constante ao atravessar o braço e cresce ao percorrê-lo. Com
 * K adimensional o comprimento de onda FÍSICO ao longo do braço é
 * 2π·R·sin p/K — cresce com o raio, como a estrutura do disco.
 *
 * O campo é ÚNICO para o disco inteiro, não um por braço: as curvas
 * `a = const` cortam os quatro braços em RAIOS diferentes (a razão entre
 * raios de corte de braços vizinhos é e^(π·sin p·cos p) ≈ 1,39), então a
 * mesma senoide já entrega quebras escalonadas — sem anel, sem fase por
 * braço.
 *
 * ONDE se aplica é metade do achado: sobre `galMajorArms` a modulação
 * bate no `clamp(…, 0, 1)` do próprio esqueleto (a crista do par forte já
 * vale 0,84 de 1), o corte come a metade CLARA e sobra perda de contraste
 * — m=2/m=4/m=6 caíram junto (0,2360/0,1958/0,0833 contra 0,2398/0,2004/
 * 0,0872 do estado anterior, todos indo para longe do alvo). Ela mora
 * onde a luz do braço é LINEAR: o excesso sobre o piso de interbraço na
 * lâmina e o alpha da partícula. No domínio linear a mesma amplitude
 * 0,8 deixa m=2/m=4 intactos.
 *
 * Amplitude varrida com λ 4200 (clumpError): 0,40 → 0,0598 · 0,45 →
 * 0,0587 · 0,50 → 0,0612 · 0,60 → 0,0665 · 0,80 → 0,0845 (aí as três
 * escalas pequenas passam do alvo). λ varrido a 0,8: 2200 → 0,0856 ·
 * 3000 → 0,0908 · 4200 → 0,0845 · 5600 → 0,0816 mas com m=6 em 0,1068
 * (o comprimento de onda entra na banda medida m ≤ 6 — 4200 fica em
 * m ≈ 8 e é neutro nas harmônicas). `?armbrk=0` devolve o estado da
 * rodada 30 EXATO; `?armbrkl= ?armbrkr0= ?armbrkr1=` varrem.
 */
const ARM_BREAK = qnum('armbrk', 0.45);
/** comprimento de onda ao longo do braço (pc) medido a R = 5,5 kpc */
const ARM_BREAK_LAMBDA = Math.max(qnum('armbrkl', 4200), 200);
const ARM_BREAK_R0 = qnum('armbrkr0', 7600);
const ARM_BREAK_R1 = qnum('armbrkr1', 9200);
/** 1/tan(12,5°) — o mesmo pitch da espinha e do referencial espiral */
const ARM_BREAK_INV_TAN = 1 / 0.2216947;
/** K adimensional: λ é medido a 5,5 kpc e vale 2π·R·sin(12,5°)/K */
const ARM_BREAK_K = (2 * Math.PI * 5_500 * 0.2164396) / ARM_BREAK_LAMBDA;

/**
 * O disco estelar como a LUT da faixa o integra, em UM lugar só. Estes
 * sete números eram literais dentro do GLSL de `nebulaShaders.ts`, e
 * saíram de lá porque a curva do desconto do catálogo precisa dos MESMOS
 * números para transformar uma densidade medida em FRAÇÃO do modelo
 * (`resolvedCatalogCurve` em `wrappedStars.ts`). Duas cópias divergiriam
 * na primeira re-dosagem; o template imprime exatamente estes literais.
 *
 * Duas inconsistências conhecidas ficam VISÍVEIS aqui, ambas registradas
 * na auditoria de 2026-08-03 e nenhuma consertada: `hR` é 2× o
 * `stellarScaleLengthPc` das partículas, e `hRThick` é MAIOR que `hR`
 * quando a literatura dá o espesso mais curto que o fino (BH&G 2016:
 * 2,6 e 2,0 kpc). Medido em 2026-08-09: tirar o espesso PIORA o gate do
 * céu (espessura 0,3144 → 0,3215), então a inversão não é a alavanca que
 * parecia — mexer nela exige rodada própria.
 */
export const LUT_DISK = {
  /** escala radial do disco fino (pc) */
  hR: 5_200,
  /** escala radial do disco espesso (pc) */
  hRThick: 6_500,
  /** peso do disco espesso contra o fino, no plano */
  thickAmp: 0.105,
  /** altura de escala fina: sem flare, com flare pleno (pc) */
  hz: [210, 460],
  /** idem para o espesso (pc) */
  hzThick: [610, 1080],
  /** o flare cresce a partir de flareR0 e satura em flareR0 + flareSpan */
  flareR0: 7_500,
  flareSpan: 9_300,
} as const;

export const GALACTIC_MODEL = {
  // as três medidas de ancoragem moram em medidasDaGalaxia.ts (folha
  // sem dependências — a baseGalactica da cena lê de lá, corte 10 da
  // onda); o modelo segue sendo o endereço do contrato completo
  ...MEDIDAS_DA_GALAXIA,
  stellarScaleLengthPc: 2_600,
  barHalfLengthPc: 5_000,
  barAngleRad: (-29 * Math.PI) / 180,
  warpStartPc: 8_400,
  warpAmplitudePc: 820 * WARP_TUNE,
  // 185°, não 5°: a quiralidade do S contra a recriação-alvo estava
  // INVERTIDA — provado por ablação em 2026-08-03 (warpamp −1 ≡ fase
  // +180°: edge 0,6456 → 0,4396, warpAsym −0,353 → +0,219; a câmera do
  // gate está na linha de nós, onde a fase certa projeta o S certo).
  // Conferir contra a convenção de Skowron/Chen 2019 na próxima rodada.
  warpPhaseRad: (185 * Math.PI) / 180,
} as const;

interface SpiralArmDefinition {
  readonly id:
    | 'perseus'
    | 'sagittarius-carina'
    | 'scutum-centaurus'
    | 'norma-outer'
    | 'near-3kpc'
    | 'far-3kpc';
  readonly phaseAtSunRad: number;
  readonly pitchInnerDeg: number;
  readonly pitchOuterDeg: number;
  readonly weight: number;
  readonly minRadiusPc: number;
  readonly maxRadiusPc: number;
  readonly tint: readonly [number, number, number];
  readonly gate: {
    readonly risePc: readonly number[];
    readonly fallPc: readonly number[];
  };
  /** posição do braço na espinha simétrica (0..armCount-1) */
  readonly symIndex?: number;
  /** lado do par dominante: +1 forte, −1 fraco (só as 4 famílias) */
  readonly pairSign?: 1 | -1;
  /** peso usado no render; ver SPIRAL_ARMS */
  readonly renderWeight?: number;
  readonly outerContinuation?: {
    readonly phaseAtSunRad: number;
    readonly weight: number;
    readonly gate: {
      readonly risePc: readonly number[];
      readonly fallPc: readonly number[];
    };
  };
}

/**
 * Quatro famílias principais. Pitches e janelas seguem Reid et al.; as fases
 * vêm do fit robusto versionado em spiralModel.json. Norma e a continuação
 * Outer têm fases independentes porque não há suporte observado no hiato entre
 * os dois segmentos — esse kink evita forçar uma espiral fictícia pelos dados.
 */
export const SPIRAL_ARMS: readonly SpiralArmDefinition[] =
  spiralModel.arms.map((arm, index) => ({
    id: arm.id as SpiralArmDefinition['id'],
    phaseAtSunRad: arm.phaseAtSunRad,
    pitchInnerDeg: arm.pitchInnerDeg,
    pitchOuterDeg: arm.pitchOuterDeg,
    weight: arm.weight,
    minRadiusPc: arm.minRadiusPc,
    maxRadiusPc: arm.maxRadiusPc,
    tint: arm.tint as [number, number, number],
    gate: arm.gate,
    outerContinuation: arm.outerContinuation,
    // slot na espinha simétrica: o encaixe mais próximo da fase ajustada
    // (Perseus 4,92 → 4,84 · Sgr-Car 0,41 → 0,13 · Scu-Cen 1,62 → 1,70 ·
    // Norma 1,41 → 3,27, a única realocada de verdade — sua fase no Sol é
    // extrapolação da borda da janela 1,6–8,4 kpc, não medida)
    symIndex: [3, 0, 1, 2][index] ?? index,
    // Peso de RENDER — não é o peso do fit (esse fica em spiralModel.json
    // e alimenta o data:verify). Pesos desiguais e arbitrários
    // (0,86/0,76/0,82/0,72) injetam m=1 e m=3. Aqui a modulação é
    // puramente m=2: pares opostos alternam — a referência é uma espiral
    // de dois braços dominantes com quatro visíveis, não quatro iguais.
    // A base fixa a escala absoluta dos dois harmônicos (m=4 ∝ base,
    // m=2 ∝ base·profundidade). Com profundidade 1,0 a modulação está
    // SATURADA: a razão m2/m4 passa a ser ĝ(2)/ĝ(4) da largura da crista
    // (armSharpness nas lâminas) — rodada 12 mediu 1,10 contra alvo
    // 1,20; o que falta vem de largura, não daqui.
    // O par dominante é Sct-Cen + Perseu (symIndex ÍMPAR), como no
    // infravermelho estelar (Drimmel/GLIMPSE); par ~antipodal ⇒ m=1
    // neutro. Estava invertido (Sgr-Car + Norma), que a métrica de
    // amplitude não vê mas o gabarito de anatomia sim.
    // sinal do par: +1 no dominante (symIndex ímpar), −1 no fraco. A
    // profundidade deixou de ser constante — ver ARM_PAIR_DEPTH e
    // armPairDepth(radiusPc).
    pairSign: ([3, 0, 1, 2][index] % 2 === 1 ? 1 : -1) as 1 | -1,
    renderWeight:
      0.42 * (1 + 1.0 * ([3, 0, 1, 2][index] % 2 === 1 ? 1 : -1)),
  }));

/**
 * Profundidade da modulação m=2 no raio. 1 dentro (par dominante puro),
 * ARM_PAIR_DEPTH fora. Espelho exato do `galArmPairDepth` em GLSL.
 */
export function armPairDepth(radiusPc: number) {
  const x = Math.min(
    1,
    Math.max(0, (radiusPc - ARM_PAIR_R0) / (ARM_PAIR_R1 - ARM_PAIR_R0))
  );
  return 1 + (ARM_PAIR_DEPTH - 1) * (x * x * (3 - 2 * x));
}

/**
 * Ganho da crista ao longo do braço — média zero, janela radial que
 * termina antes do anel externo da régua (que já mede no alvo).
 * Espelho exato de `galArmBreak` em GLSL.
 */
export function armBreakGain(radiusPc: number, theta: number) {
  if (ARM_BREAK === 0) return 1;
  const t =
    ARM_BREAK_K *
    (Math.log(Math.max(radiusPc, 180) / GALACTIC_MODEL.sunRadiusPc) +
      theta * ARM_BREAK_INV_TAN);
  const gate =
    smoothstepTs(2_500, 3_800, radiusPc) *
    (1 - smoothstepTs(ARM_BREAK_R0, ARM_BREAK_R1, radiusPc));
  const n = 0.62 * Math.sin(t) + 0.38 * Math.sin(1.61 * t + 2.1);
  return Math.max(0, 1 + ARM_BREAK * gate * n);
}

/**
 * ESPINHA SIMÉTRICA — a geometria global.
 *
 * Um padrão espiral de m braços é, por definição, m cristas com o MESMO
 * pitch espaçadas 2π/m. As fases ajustadas aos masers não são: Norma e
 * Scutum caem a 0,2 rad uma da outra e sobra um vão de 1,8 rad do outro
 * lado. Somado às janelas radiais distintas, em quase todo raio existiam
 * 1 ou 2 braços em vez de 4. Medido por Fourier log-polar no quadro
 * renderizado, isso dava m=1 (assimetria) = 0,228 contra 0,101 da
 * referência, e m=4 = 0,157 contra 0,208: metade da nossa "estrutura
 * espiral" era lopsidedness, não braço.
 *
 * A inversão é a mesma já feita no brilho: o MODELO define, a observação
 * corrige. A espinha é simétrica em todo o disco; dentro do raio onde a
 * BeSSeL tem paralaxes (~6 kpc do Sol) cada braço cede à fase medida.
 * spiralModel.json não muda, então `npm run data:verify` continua válido.
 */
export const BACKBONE = {
  armCount: 4,
  pitchDeg: 12.5,
  phase0Rad: 0.126,
  /** raio heliocêntrico onde a correção de maser vale integralmente */
  observedReachPc: 4_000,
  // 11 kpc era generoso demais: a correção de fase alcançava metade do
  // disco e injetava m=1 (assimetria) longe de onde há paralaxe. A
  // amostra BeSSeL densa fica dentro de ~5 kpc do Sol.
  observedFadePc: 7_500,
} as const;

/**
 * Braços de 3 kpc — Near (Oort/van Woerden 1957) e Far (Dame & Thaddeus
 * 2008). NÃO saem do fit de masers: a amostra BeSSeL não cobre R < 3 kpc.
 * Vêm do gabarito de anatomia Gaia 2025, onde estão rotulados, e são o
 * par quase simétrico ancorado nas pontas da barra — a estrutura que
 * preenche o disco interno entre o bojo e Norma/Centaurus. Sem eles o
 * anel de 2,5–5 kpc fica vazio e a galáxia mostra 3 voltas onde o alvo
 * mostra 7. Deslocados ±90° em relação ao eixo da barra, como no
 * escoamento induzido por ela.
 *
 * θ(R) = phaseAtSun + ln(R/R0)/tan(pitch) → para pousar a crista em θ0
 * a 3,5 kpc: phaseAtSun = θ0 − ln(3500/8150)/tan(12°) = θ0 + 3,975.
 */
const BAR_AXIS = GALACTIC_MODEL.barAngleRad;
const THREE_KPC_TINT: readonly [number, number, number] = [0.86, 0.72, 0.58];
export const INNER_ARMS: readonly SpiralArmDefinition[] = [
  {
    id: 'near-3kpc',
    phaseAtSunRad: BAR_AXIS + Math.PI / 2 + 3.975,
    pitchInnerDeg: 12,
    pitchOuterDeg: 12,
    // PAR SIMÉTRICO. Pesos e portas desiguais (0,54/0,48 e janelas
    // diferentes) injetavam m=1 no anel interno, que intermodula com a
    // espinha de 4 dobras e sai medido como m=3 (|4−1|).
    // 0,51 → 0,43 na rodada 12: o par contribui m=4 no anel interno via
    // ĝ(4) da crista; com a emissão estelar em 2 braços ele virou uma
    // fração maior do m=4 residual.
    weight: 0.43,
    minRadiusPc: 2_500,
    maxRadiusPc: 5_750,
    tint: THREE_KPC_TINT,
    gate: { risePc: [2_500, 3_150], fallPc: [4_750, 5_750] },
  },
  {
    id: 'far-3kpc',
    phaseAtSunRad: BAR_AXIS - Math.PI / 2 + 3.975,
    pitchInnerDeg: 12,
    pitchOuterDeg: 12,
    weight: 0.43,
    minRadiusPc: 2_500,
    maxRadiusPc: 5_750,
    tint: THREE_KPC_TINT,
    gate: { risePc: [2_500, 3_150], fallPc: [4_750, 5_750] },
  },
];

/** Todas as famílias que desenham partículas, poeira e nós H II. */
export const ALL_ARMS: readonly SpiralArmDefinition[] = [
  ...SPIRAL_ARMS,
  ...INNER_ARMS,
];

// O Local é um ESPORÃO curto (7,45–9,65 kpc), não uma das quatro
// famílias — mas entrava com peso 0,72, quase igual a elas. Numa vista
// externa isso é um braço a mais fora da simetria de 4 dobras, e a
// medição mostrava m=3 = 0,136 e m=5 = 0,101 contra 0,071 e 0,062 do
// alvo. De dentro ele continua com o peso do fit: é onde o Sol mora.
export const LOCAL_ARM_EXTERNAL_WEIGHT = 0.45;

export const LOCAL_ARM = {
  phaseAtSunRad: spiralModel.localArm.phaseAtSunRad,
  pitchDeg: spiralModel.localArm.pitchInnerDeg,
  minRadiusPc: spiralModel.localArm.minRadiusPc,
  maxRadiusPc: spiralModel.localArm.maxRadiusPc,
  weight: spiralModel.localArm.weight,
  gate: spiralModel.localArm.gate,
} as const;

function armPhaseAtRadius(radiusPc: number, arm: SpiralArmDefinition) {
  const outer = arm.outerContinuation;
  return outer && radiusPc >= outer.gate.risePc[0]
    ? outer.phaseAtSunRad
    : arm.phaseAtSunRad;
}

/** Diferença angular em (−π, π] — sem isso o blend salta 2π. */
function wrapPi(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/** Azimute da crista simétrica do braço `symIndex` no raio dado. */
export function backboneThetaAtRadius(radiusPc: number, symIndex: number) {
  return (
    BACKBONE.phase0Rad +
    (symIndex * 2 * Math.PI) / BACKBONE.armCount +
    Math.log(Math.max(radiusPc, 180) / GALACTIC_MODEL.sunRadiusPc) /
      Math.tan((BACKBONE.pitchDeg * Math.PI) / 180)
  );
}

/**
 * Peso da correção observada: 1 dentro do alcance das paralaxes BeSSeL,
 * 0 no lado oculto. A distância heliocêntrica sai da lei dos cossenos com
 * o Sol em θ=0 (a base galactocêntrica tem EX apontando para o Sol).
 */
export function observedWeight(radiusPc: number, theta: number) {
  const d = Math.sqrt(
    radiusPc * radiusPc +
      GALACTIC_MODEL.sunRadiusPc * GALACTIC_MODEL.sunRadiusPc -
      2 * radiusPc * GALACTIC_MODEL.sunRadiusPc * Math.cos(theta)
  );
  return 1 - smoothstepTs(BACKBONE.observedReachPc, BACKBONE.observedFadePc, d);
}

export function armThetaAtRadius(radiusPc: number, arm: SpiralArmDefinition) {
  const phaseAtSunRad = armPhaseAtRadius(radiusPc, arm);
  const observedPitchDeg =
    radiusPc < GALACTIC_MODEL.sunRadiusPc ? arm.pitchInnerDeg : arm.pitchOuterDeg;
  // Gaia ainda não cartografou o lado oculto com a mesma precisão.
  // A continuação externa abre gradualmente para 15,8° e perde
  // contraste; perto do Sol permanece no pitch observado.
  const farBlend = Math.min(1, Math.max(0, (radiusPc - 9_500) / 5_500));
  const easedFarBlend = farBlend * farBlend * (3 - 2 * farBlend);
  const pitchDeg =
    observedPitchDeg + (15.8 - observedPitchDeg) * easedFarBlend;
  const observed =
    phaseAtSunRad +
    Math.log(Math.max(radiusPc, 180) / GALACTIC_MODEL.sunRadiusPc) /
      Math.tan((pitchDeg * Math.PI) / 180);
  // Espinha simétrica + correção medida onde há paralaxe. Fora do alcance
  // BeSSeL o braço relaxa para o slot equiespaçado, que é o que faz o
  // padrão global ler como espiral e não como disco torto.
  const symmetric = backboneThetaAtRadius(radiusPc, arm.symIndex ?? 0);
  const w = observedWeight(radiusPc, symmetric);
  return symmetric + wrapPi(observed - symmetric) * w;
}

function smoothstepTs(edge0: number, edge1: number, value: number) {
  const c = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return c * c * (3 - 2 * c);
}

function gateActivity(
  radiusPc: number,
  gate: SpiralArmDefinition['gate']
) {
  return (
    smoothstepTs(gate.risePc[0], gate.risePc[1], radiusPc) *
    (1 - smoothstepTs(gate.fallPc[0], gate.fallPc[1], radiusPc))
  );
}

/**
 * Extensão da espinha: um braço real não termina onde termina a amostra
 * de masers. As janelas por braço marcam o trecho MEDIDO; usá-las como
 * fim do braço deixava 1 ou 2 braços vivos em cada raio e destruía a
 * simetria de 4 dobras. A espinha vive de 3 a 16,3 kpc; o trecho medido
 * continua mais forte.
 */
function backboneActivity(radiusPc: number) {
  return (
    smoothstepTs(2_600, 3_900, radiusPc) *
    (1 - smoothstepTs(15_000, 16_500, radiusPc))
  );
}

export function armActivityAtRadius(
  radiusPc: number,
  arm: SpiralArmDefinition
) {
  const measured = gateActivity(radiusPc, arm.gate);
  const outerContinuation = arm.outerContinuation
    ? gateActivity(radiusPc, arm.outerContinuation.gate) *
      arm.outerContinuation.weight
    : 0;
  const observed = Math.min(1, measured + outerContinuation);
  // braços internos de 3 kpc não participam da espinha de 4 dobras
  if (arm.symIndex === undefined) return observed;
  // Rodada 12, medido e revertido: subir este piso para 0,86 SUBIU m=1
  // (0,120→0,129) — o m=1 residual não é o contraste medido-vs-espinha.
  return Math.min(1, Math.max(observed, backboneActivity(radiusPc) * 0.78));
}

export function localArmThetaAtRadius(radiusPc: number) {
  return (
    LOCAL_ARM.phaseAtSunRad +
    Math.log(Math.max(radiusPc, 180) / GALACTIC_MODEL.sunRadiusPc) /
      Math.tan((LOCAL_ARM.pitchDeg * Math.PI) / 180)
  );
}

/**
 * Reid et al. encontram w(R) = 336 + 36(R[kpc] - 8.15) pc.
 * O clamp só evita extrapolações não físicas no bojo e na borda.
 */
export function armWidthPc(radiusPc: number) {
  return Math.min(690, Math.max(170, 336 + 36 * (radiusPc / 1000 - 8.15)));
}

/** Warp suave, nulo dentro do círculo solar e máximo na borda externa. */
export function warpHeightPc(radiusPc: number, theta: number) {
  if (radiusPc <= GALACTIC_MODEL.warpStartPc) return 0;
  const x = Math.min(
    1,
    (radiusPc - GALACTIC_MODEL.warpStartPc) /
      (GALACTIC_MODEL.diskRadiusPc - GALACTIC_MODEL.warpStartPc)
  );
  return (
    GALACTIC_MODEL.warpAmplitudePc *
    Math.pow(x, 1.55) *
    Math.sin(theta - GALACTIC_MODEL.warpPhaseRad)
  );
}

/** Flare adimensional usado para aumentar a espessura no disco externo. */
export function flareAtRadius(radiusPc: number) {
  const x = Math.max(0, (radiusPc - 7_500) / 9_300);
  return Math.min(1, x * x);
}

// ---- Espelhos TS exatos das funções GLSL abaixo -----------------
// Usados pelo bake do dust map (canais B/A: braços e warp) para que
// o shader troque ~40 transcendentais por 1 fetch de textura sem
// nenhuma divergência de contrato.

function wrappedDistance(a: number, b: number) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function smoothstepGl(edge0: number, edge1: number, x: number) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

function glArmTarget(
  radiusPc: number,
  phaseAtSun: number,
  tanPitchInner: number,
  tanPitchOuter: number,
  symIndex = -1
) {
  const observedTan = radiusPc < 8150 ? tanPitchInner : tanPitchOuter;
  const farBlend = smoothstepGl(9500, 15000, radiusPc);
  const tanPitch = observedTan + (0.283 - observedTan) * farBlend;
  const base = phaseAtSun + Math.log(Math.max(radiusPc, 180) / 8150) / tanPitch;
  const observed =
    base +
    0.052 * Math.sin(radiusPc * 0.00115 + phaseAtSun * 2.7) +
    0.022 * Math.sin(radiusPc * 0.0037 - phaseAtSun);
  if (symIndex < 0) return observed;
  const symmetric = backboneThetaAtRadius(radiusPc, symIndex);
  return (
    symmetric +
    wrapPi(observed - symmetric) * observedWeight(radiusPc, symmetric)
  );
}

/**
 * `sharpness` é dado em largura ANGULAR — o que é certo no disco, onde a
 * largura do braço acompanha o espaçamento entre braços. Perto do centro
 * a mesma abertura angular vira um LEQUE saindo do bojo (um braço de
 * ~0,26 rad tem 2 kpc de espessura a R=8 kpc e continua com 0,26 rad a
 * R=1 kpc, cobrindo um quarto do bojo). Abaixo de 6 kpc a abertura passa
 * a encolher com o raio, mantendo a espessura física.
 */
function innerTaper(radiusPc: number) {
  const k = 6_000 / Math.max(radiusPc, 900);
  return Math.max(1, k * k);
}

function glArm(
  theta: number,
  radiusPc: number,
  phaseAtSun: number,
  tanPitchInner: number,
  tanPitchOuter: number,
  sharpness: number,
  symIndex = -1
) {
  const d = wrappedDistance(
    theta,
    glArmTarget(radiusPc, phaseAtSun, tanPitchInner, tanPitchOuter, symIndex)
  );
  return Math.exp(-d * d * sharpness * innerTaper(radiusPc));
}

/** espelho TS de galBackboneGate — a espinha vive de 3 a 16,3 kpc */
function glBackboneGate(radiusPc: number) {
  return (
    smoothstepGl(2_600, 3_900, radiusPc) *
    (1 - smoothstepGl(15_000, 16_500, radiusPc)) *
    0.78
  );
}

function armById(id: SpiralArmDefinition['id']) {
  const arm = SPIRAL_ARMS.find((candidate) => candidate.id === id);
  if (!arm) throw new Error(`Braço galáctico ausente: ${id}.`);
  return arm;
}

function tanPitch(degrees: number) {
  return Math.tan((degrees * Math.PI) / 180);
}

function glGate(
  radiusPc: number,
  gate: SpiralArmDefinition['gate']
) {
  return (
    smoothstepGl(gate.risePc[0], gate.risePc[1], radiusPc) *
    (1 - smoothstepGl(gate.fallPc[0], gate.fallPc[1], radiusPc))
  );
}

const NORMA_OUTER = armById('norma-outer');
function requireOuterContinuation(arm: SpiralArmDefinition) {
  const continuation = arm.outerContinuation;
  if (!continuation) {
    throw new Error('Continuação Outer ausente do modelo galáctico.');
  }
  return continuation;
}
// mantido para validar que o modelo versionado traz a continuação Outer;
// ela não entra mais como termo separado no render (ver glMajorArms).
requireOuterContinuation(NORMA_OUTER);

/**
 * Espelho TS de galMajorArms. As quatro famílias entram pela espinha
 * simétrica; o gate é o MAIOR entre a janela medida e o gate da espinha,
 * senão só 1 ou 2 braços existem em cada raio e o padrão perde a simetria
 * de 4 dobras. A continuação Outer de Norma deixou de ser um termo à
 * parte: com a espinha, o slot de Norma já vai até 16,5 kpc — que é o
 * Outer Arm do gabarito — e um termo extra com fase própria só voltava a
 * injetar m=1.
 */
export function glMajorArms(
  theta: number,
  radiusPc: number,
  sharpness: number,
  /**
   * true = ignora a modulação m=2 dos pesos de render.
   *
   * A LUZ dos braços é modulada (um par mais forte que o outro, que é o
   * componente de dois braços da referência), mas a POEIRA não deveria
   * herdar isso: no alvo os quatro braços carregam faixa escura parecida.
   * Herdando, a assimetria da luz e a da poeira se somam e vazam para
   * m=1 e m=3.
   */
  uniformWeights = false
) {
  const backbone = glBackboneGate(radiusPc);
  let sum = 0;
  for (const arm of SPIRAL_ARMS) {
    const gate = Math.min(1, Math.max(glGate(radiusPc, arm.gate), backbone));
    sum +=
      glArm(
        theta,
        radiusPc,
        arm.phaseAtSunRad,
        tanPitch(arm.pitchInnerDeg),
        tanPitch(arm.pitchOuterDeg),
        sharpness,
        arm.symIndex
      ) *
      (uniformWeights
        ? 0.82
        : arm.pairSign !== undefined
          ? 0.42 * (1 + armPairDepth(radiusPc) * arm.pairSign)
          : arm.renderWeight ?? arm.weight) *
      gate;
  }
  for (const arm of INNER_ARMS) {
    sum +=
      glArm(
        theta,
        radiusPc,
        arm.phaseAtSunRad,
        tanPitch(arm.pitchInnerDeg),
        tanPitch(arm.pitchOuterDeg),
        sharpness
      ) *
      arm.weight *
      glGate(radiusPc, arm.gate);
  }
  return Math.min(1, Math.max(sum, 0));
}

/** espelho TS de galLocalArm (GLSL abaixo) */
export function glLocalArm(theta: number, radiusPc: number, sharpness: number) {
  return (
    glArm(
      theta,
      radiusPc,
      LOCAL_ARM.phaseAtSunRad,
      tanPitch(LOCAL_ARM.pitchDeg),
      tanPitch(LOCAL_ARM.pitchDeg),
      sharpness
    ) *
    glGate(radiusPc, LOCAL_ARM.gate) *
    LOCAL_ARM.weight *
    LOCAL_ARM_EXTERNAL_WEIGHT
  );
}

function glslNumber(value: number) {
  return value.toFixed(7);
}

function glslGate(
  name: string,
  gate: SpiralArmDefinition['gate'],
  weight = 1
) {
  return `float ${name} =
    smoothstep(${glslNumber(gate.risePc[0])}, ${glslNumber(gate.risePc[1])}, radiusPc) *
    (1.0 - smoothstep(${glslNumber(gate.fallPc[0])}, ${glslNumber(gate.fallPc[1])}, radiusPc)) *
    ${glslNumber(weight)};`;
}

/** peso de render em GLSL: expressão viva no par dominante, número nos demais */
function glslArmWeight(arm: SpiralArmDefinition) {
  return arm.pairSign === undefined
    ? glslNumber(arm.renderWeight ?? arm.weight)
    : `(0.42 * (1.0 + galArmPairDepth(radiusPc) * ${glslNumber(arm.pairSign)}))`;
}

function glslArmCall(
  arm: SpiralArmDefinition,
  phaseAtSunRad: number,
  gateName: string,
  weight: string | number = glslArmWeight(arm)
) {
  const w = typeof weight === 'number' ? glslNumber(weight) : weight;
  return `galArm(
      theta,
      radiusPc,
      ${glslNumber(phaseAtSunRad)},
      ${glslNumber(tanPitch(arm.pitchInnerDeg))},
      ${glslNumber(tanPitch(arm.pitchOuterDeg))},
      sharpness,
      ${glslNumber(arm.symIndex ?? -1)}
    ) * ${w} * ${gateName}`;
}

/**
 * Mesmo contrato em GLSL. Mantê-lo aqui impede que partículas, lâminas
 * emissivas e volume de gás usem versões incompatíveis da galáxia.
 */
export const GLSL_CARTOGRAPHY = /* glsl */ `
const float GAL_SUN_RADIUS = 8150.0;
const float GAL_DISK_RADIUS = 16800.0;
const float GAL_WARP_START = 8400.0;

float galWrappedDistance(float a, float b) {
  return abs(atan(sin(a - b), cos(a - b)));
}

float galWarpHeight(float radiusPc, float theta) {
  float x = clamp(
    (radiusPc - GAL_WARP_START) / (GAL_DISK_RADIUS - GAL_WARP_START),
    0.0,
    1.0
  );
  return ${(820 * WARP_TUNE).toFixed(1)} * pow(x, 1.55) * sin(theta - 3.2288591);
}

// ---- espinha simétrica (espelho de BACKBONE / backboneThetaAtRadius) ----
// m cristas de mesmo pitch espaçadas 2π/m. É ela que faz o padrão global
// ler como espiral; a fase medida só corrige perto do Sol.
float galBackboneTheta(float symIndex) {
  return ${glslNumber(BACKBONE.phase0Rad)} +
    symIndex * ${glslNumber((2 * Math.PI) / BACKBONE.armCount)};
}

// peso da correção observada: 1 dentro do alcance das paralaxes BeSSeL,
// 0 no lado oculto. Lei dos cossenos com o Sol em theta = 0.
float galObservedWeight(float radiusPc, float theta) {
  float d = sqrt(
    radiusPc * radiusPc + GAL_SUN_RADIUS * GAL_SUN_RADIUS -
    2.0 * radiusPc * GAL_SUN_RADIUS * cos(theta)
  );
  return 1.0 - smoothstep(
    ${glslNumber(BACKBONE.observedReachPc)},
    ${glslNumber(BACKBONE.observedFadePc)},
    d
  );
}

float galArmTarget(
  float radiusPc,
  float phaseAtSun,
  float tanPitchInner,
  float tanPitchOuter,
  float symIndex
) {
  float observedTan =
    radiusPc < GAL_SUN_RADIUS ? tanPitchInner : tanPitchOuter;
  float farBlend = smoothstep(9500.0, 15000.0, radiusPc);
  float tanPitch = mix(
    observedTan,
    ${glslNumber(tanPitch(15.8))},
    farBlend
  );
  float lnR = log(max(radiusPc, 180.0) / GAL_SUN_RADIUS);
  float observed = phaseAtSun + lnR / tanPitch +
    0.052 * sin(radiusPc * 0.00115 + phaseAtSun * 2.7) +
    0.022 * sin(radiusPc * 0.0037 - phaseAtSun);
  if (symIndex < 0.0) return observed;
  float symmetric =
    galBackboneTheta(symIndex) + lnR / ${glslNumber(tanPitch(BACKBONE.pitchDeg))};
  float delta = atan(sin(observed - symmetric), cos(observed - symmetric));
  return symmetric + delta * galObservedWeight(radiusPc, symmetric);
}

// espinha viva de 3 a 16,3 kpc — sem isso só 1 ou 2 braços existem
// em cada raio e a simetria de 4 dobras desaparece
float galBackboneGate(float radiusPc) {
  return smoothstep(2600.0, 3900.0, radiusPc) *
    (1.0 - smoothstep(15000.0, 16500.0, radiusPc)) * 0.78;
}

// espelho de innerTaper(): abertura angular constante vira leque no bojo
float galInnerTaper(float radiusPc) {
  float k = 6000.0 / max(radiusPc, 900.0);
  return max(1.0, k * k);
}

float galArm(
  float theta,
  float radiusPc,
  float phaseAtSun,
  float tanPitchInner,
  float tanPitchOuter,
  float sharpness,
  float symIndex
) {
  float target = galArmTarget(
    radiusPc, phaseAtSun, tanPitchInner, tanPitchOuter, symIndex
  );
  float d = galWrappedDistance(theta, target);
  return exp(-d * d * sharpness * galInnerTaper(radiusPc));
}

// Espelho de armPairDepth(): a modulação m=2 é da população evoluída,
// concentrada — no disco externo os quatro braços tendem a se igualar.
// A soma dos quatro pesos não depende dela: fluxo azimutal conservado.
float galArmPairDepth(float radiusPc) {
  return mix(
    1.0,
    ${glslNumber(ARM_PAIR_DEPTH)},
    smoothstep(${glslNumber(ARM_PAIR_R0)}, ${glslNumber(ARM_PAIR_R1)}, radiusPc)
  );
}

// Espelho de armBreakGain(): a crista do braço é SEGMENTADA. O eixo é
// a = ln R + θ/tan p, o conjugado de v no plano — constante ao
// ATRAVESSAR o braço, crescente ao percorrê-lo. NÃO entra no esqueleto:
// lá bate no clamp e come a metade clara da modulação. Quem chama é a
// lâmina, sobre o excesso de luz do braço, que é linear.
// Com amplitude 0 esta função é a constante 1 e some do shader.
${
  ARM_BREAK === 0
    ? 'float galArmBreak(float radiusPc, float theta) { return 1.0; }'
    : `float galArmBreak(float radiusPc, float theta) {
  float t = ${glslNumber(ARM_BREAK_K)} *
    (log(max(radiusPc, 180.0) / GAL_SUN_RADIUS) +
     theta * ${glslNumber(ARM_BREAK_INV_TAN)});
  float gate = smoothstep(2500.0, 3800.0, radiusPc) *
    (1.0 - smoothstep(
      ${glslNumber(ARM_BREAK_R0)},
      ${glslNumber(ARM_BREAK_R1)},
      radiusPc
    ));
  float n = 0.62 * sin(t) + 0.38 * sin(1.61 * t + 2.1);
  return max(0.0, 1.0 + ${glslNumber(ARM_BREAK)} * gate * n);
}`
}

float galMajorArms(float theta, float radiusPc, float sharpness) {
  float backbone = galBackboneGate(radiusPc);
${SPIRAL_ARMS.map(
  (arm, i) => `  ${glslGate(`measured${i}`, arm.gate)}
  float gate${i} = min(1.0, max(measured${i}, backbone));`
).join('\n')}
  ${INNER_ARMS.map((arm, i) => glslGate(`inner${i}Gate`, arm.gate)).join('\n  ')}
  return clamp(
      0.0
${SPIRAL_ARMS.map(
  (arm, i) => `    + ${glslArmCall(arm, arm.phaseAtSunRad, `gate${i}`)}`
).join('\n')}
${INNER_ARMS.map(
  (arm, i) => `    + ${glslArmCall(arm, arm.phaseAtSunRad, `inner${i}Gate`)}`
).join('\n')},
    0.0,
    1.0
  );
}

// GÁS: 4 braços parecidos (espelho de glMajorArms com uniformWeights).
// A dominância de 2 braços (renderWeight) é da emissão estelar evoluída;
// o gás carrega os 4 (Drimmel) — mesma razão do uniformWeights do TS.
float galMajorArmsGas(float theta, float radiusPc, float sharpness) {
  float backbone = galBackboneGate(radiusPc);
${SPIRAL_ARMS.map(
  (arm, i) => `  ${glslGate(`measured${i}`, arm.gate)}
  float gate${i} = min(1.0, max(measured${i}, backbone));`
).join('\n')}
  ${INNER_ARMS.map((arm, i) => glslGate(`inner${i}Gate`, arm.gate)).join('\n  ')}
  return clamp(
      0.0
${SPIRAL_ARMS.map(
  (arm, i) => `    + ${glslArmCall(arm, arm.phaseAtSunRad, `gate${i}`, 0.82)}`
).join('\n')}
${INNER_ARMS.map(
  (arm, i) => `    + ${glslArmCall(arm, arm.phaseAtSunRad, `inner${i}Gate`)}`
).join('\n')},
    0.0,
    1.0
  );
}

float galLocalArm(float theta, float radiusPc, float sharpness) {
  ${glslGate('localGate', LOCAL_ARM.gate)}
  return galArm(
    theta,
    radiusPc,
    ${glslNumber(LOCAL_ARM.phaseAtSunRad)},
    ${glslNumber(tanPitch(LOCAL_ARM.pitchDeg))},
    ${glslNumber(tanPitch(LOCAL_ARM.pitchDeg))},
    sharpness,
    -1.0
  ) * localGate * ${glslNumber(LOCAL_ARM.weight * LOCAL_ARM_EXTERNAL_WEIGHT)};
}
`;
