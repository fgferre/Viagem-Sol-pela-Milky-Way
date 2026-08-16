// ============================================================
// lodStellar — o que sobrou do LOD estelar da casa, e o que sobrou tem
// DATA DE ENTERRO: M2 da LEI-DA-ESTRELA. PURO: zero three, zero DOM.
//
// O M1 (2026-08-16) demoliu daqui a metade do Sol: as janelas de
// entrega (`LOD_SOL`, `sunStarGain`, `deepPointGain`), o filtro solar
// por razão disco/halo (`filtroSolarAlvo`) e o gate dormente por ângulo
// sólido (`shouldDiscBeActive` e os órfãos do bloco). Quem responde por
// tudo isso agora é a repartição única (`repartir`, `estrela.ts`) — as
// lápides curtas estão nas seções, e a varredura invertida
// (simbolosProibidos.test.ts) vigia os nomes.
//
// Duas coisas continuam morando aqui, com origens declaradas:
//
// 1. `stepRampToward` — TRANSCRIÇÃO AUTORIZADA do doador atlas-orbital
//    (`src/components/canvas/hygMeshFadeRamp.ts`: 48 linhas medidas por
//    `wc -l`). Linhas puras que carregam a razão do clamp de dt junto —
//    "é mais barato copiar com o comentário do que redescobrir o bug".
//    Assinatura, corpo e comentários vêm inteiros; só a língua muda.
//    Consumidor vivo: a cessão suave da Terra (Onda 6/F2b) e as rampas
//    dos corpos resolvidos.
//
// 2. A POLÍTICA DE DOMINÂNCIA (seção 5, fase 3 da Onda 3) — a decisão
//    D2 do desenho, na forma que a medição da fase 2 corrigiu. Espelhos
//    em JS de duas contas que só existiam em GLSL (a PSF do ponto do
//    catálogo e o tamanho do billboard do hero) e a curva `g` que decide
//    quanto o ponto cede quando o hero o domina na tela — mais o
//    casamento hero↔índice do catálogo, que é a metade de identidade da
//    mesma política. Consumidor: `director.ts`, que escreve `aFade` nas
//    16 por quadro. MORRE NO M2, quando o clarão de asas por orçamento
//    substituir a identidade "as 16" — `heroCatalogFade` e as janelas
//    `LOD_HERO` saem junto (divergência com a lista do M1 na Lei
//    registrada lá: eles têm consumidor de runtime até o M2).
// ============================================================
import { psfPointSizePx } from '../luzDaCasa';

// ------------------------------------------------------------
// 1. (As janelas de LOD do Sol morreram no M1 da LEI-DA-ESTRELA.)
// ------------------------------------------------------------
//
// Aqui moravam `LOD_SOL.entrega` {0,02; 0,05} pc, `sunStarGain`,
// `deepPointGain` e `LIMIAR_DA_ENTREGA_PC` — o crossfade ponto→clarão
// que entregava o Sol ao `SunStar` a 0,05 pc. A repartição única
// (`repartir`, estrela.ts) os substituiu: o Sol-ponto da camada dos dez
// é o dono do Sol em toda distância de ponto, e quem o apaga de longe é
// a magnitude. A varredura invertida (simbolosProibidos.test.ts) vigia
// os nomes mortos.

// ------------------------------------------------------------
// 1b. Janelas da outra instância: as 16 heroes genéricas
// ------------------------------------------------------------
//
// DIFERENÇA DE NATUREZA em relação às três rampas do Sol acima: aquelas
// são código JS HOJE (rodam em double, e a fase 2 as importa daqui — a
// igualdade tem de ser bit a bit). Estas duas são GLSL hoje (as linhas
// `nearFade`/`farFade` do FRAG de `heroStars.ts`, compartilhado por
// HeroStars e SunStar) e continuam sendo: o pixel do hero sai do shader,
// em float32. O que sai DAQUI é o `aFade` do ponto do catálogo,
// calculado em JS na fase 3 (decisão D2 — fim da dupla-luz
// hero↔catálogo: hoje as 16 mais brilhantes desenham luz duas vezes,
// o ponto do catálogo mais o billboard por cima). Logo a igualdade que
// importa aqui é a da CURVA e dos números — mesma fórmula, mesmas
// bordas — não o último bit, que float32 vs float64 nunca daria.
export const LOD_HERO = {
  /**
   * `nearFade`: o clarão esmaece se a câmera colar na estrela. A janela
   * é em MÚLTIPLOS DO PRÓPRIO TAMANHO do hero (`uSize·0,5 → uSize·1,4`),
   * não em pc fixos — cada hero tem seu tamanho (no construtor de
   * `HeroStars`, `size = 0,08·10^(−0,3m)` pc). Linha `nearFade` do FRAG.
   */
  near: { startFactor: 0.5, endFactor: 1.4 },
  /**
   * `farFade`: esmaece de longe, "o ponto do catálogo assume" — janela
   * fixa {320; 900} pc (linha `farFade` do FRAG). É a rede de segurança D2a:
   * além de 900 pc o hero é ZERO, então o ponto do catálogo tem de
   * voltar inteiro, senão as 16 mais brilhantes sumiriam do céu
   * distante.
   */
  far: { startPc: 320, endPc: 900 },
} as const;

/** `smoothstep(edge0, edge1, x)` do GLSL, transcrito (clamp + cúbica). */
function glslSmoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * `nearFade` do hero — `smoothstep(uSize*0.5, uSize*1.4, uCamDist)`
 * (linha `nearFade` do FRAG), com as bordas calculadas do tamanho como lá
 * (multiplicar antes de subtrair, não pré-somar 0,9·size).
 * GUARDA: fora do domínio do shader (`uSize > 0`, `uCamDist` finito) o
 * GLSL declara o resultado INDEFINIDO; aqui devolve 0 = "hero não
 * contribui", que é a direção segura para o consumidor da fase 3 (o
 * ponto do catálogo fica inteiro). Dentro do domínio, nada muda.
 */
export function heroNearFade(camDistPc: number, sizePc: number): number {
  if (!Number.isFinite(camDistPc) || !Number.isFinite(sizePc) || sizePc <= 0) return 0;
  return glslSmoothstep(sizePc * LOD_HERO.near.startFactor, sizePc * LOD_HERO.near.endFactor, camDistPc);
}

/** `farFade` do hero — `1.0 - smoothstep(320.0, 900.0, uCamDist)`
 *  (linha `farFade` do FRAG de `heroStars.ts`). */
export function heroFarFade(camDistPc: number): number {
  if (!Number.isFinite(camDistPc)) return 0;
  return 1 - glslSmoothstep(LOD_HERO.far.startPc, LOD_HERO.far.endPc, camDistPc);
}

/**
 * A CURVA DE PRESENÇA do hero: o produto que o FRAG aplica na cor e no
 * alfa (`gl_FragColor`, `nearFade * farFade * uGain`, com uGain = 1 nos
 * 16 heroes — uniform literal do construtor). É a curva que a fase 3 escreve em `aFade`
 * para o ponto do catálogo esmaecer na EXATA medida em que o hero
 * assume (D2a): presença 1 ⇒ ponto apagado; presença 0 ⇒ ponto inteiro.
 */
export function heroPresence(camDistPc: number, sizePc: number): number {
  return heroNearFade(camDistPc, sizePc) * heroFarFade(camDistPc);
}

// ------------------------------------------------------------
// 2. Integrador da rampa — TRANSCRIÇÃO VERBATIM do doador
//    (atlas-orbital, src/components/canvas/hygMeshFadeRamp.ts:1-48)
// ------------------------------------------------------------

// Cabeçalho do arquivo do doador, transcrito:
//
//   M3 — integrador linear da rampa de crossfade sprite↔malha do
//   HygStellarMesh.
//
//   Vive fora de `HygStellarMesh.tsx` para que a regra do Fast Refresh
//   (react-refresh/only-export-components) fique limpa e o integrador
//   seja testável por unidade sem montar a cena Three.js inteira.
//
//   Contrato: percorre [0..1] LINEARMENTE rumo a `target` ao longo de
//   `durationMs` de tempo de relógio. Sem overshoot, sem decaimento
//   exponencial (temporização previsível para o usuário). Defensivo
//   contra entradas patológicas (dt NaN, `durationMs` ≤ 0, `current`
//   fora de faixa).
//
// [casa] O motivo do Fast Refresh é do stack de lá (não há React nesta
// casa), mas a consequência é a mesma e é por isso que o integrador
// mora neste módulo: puro, testável sem three na mesa.

/**
 * Duração da rampa: 300 ms, sem easing (o integrador é estritamente
 * linear — nem ele nem o chamador aplicam smoothstep).
 * `HygStellarMesh.tsx:101-109`: "300 ms is the spec default — long
 * enough that the eye perceives a smooth transition rather than a
 * step, short enough that mid-fade doesn't read as 'stuck loading'".
 * [casa] Nenhum consumidor desta casa usa a rampa TEMPORAL ainda — o
 * crossfade do Sol hoje é dirigido por DISTÂNCIA (as janelas acima).
 * A rampa temporal é o mecanismo do foco por estrela, que chega na
 * Onda 7; a constante fica pinada junto com o integrador que a usa.
 */
export const RAMP_DURATION_MS = 300;

/**
 * Avança `current` linearmente rumo a `target`. Devolve o novo valor
 * depois de `dtSeconds` de tempo de relógio, onde a travessia completa
 * de [0..1] leva `durationMs`. Clampado ao segmento entre current e
 * target (sem overshoot).
 *
 * Defensivo com `durationMs <= 0`: devolve o alvo clampado direto
 * (trata como instantâneo). Guarda útil para testes que passam 0 para
 * contornar a rampa.
 */
export function stepRampToward(
  current: number,
  target: number,
  dtSeconds: number,
  durationMs: number
): number {
  if (durationMs <= 0) return Math.max(0, Math.min(1, target));
  // Guarda dt não-finito (honra a segurança contra NaN prometida no
  // docstring — Math.max(0, Math.min(1, NaN)) é NaN, então um dt NaN
  // sem guarda envenenaria a rampa) e clampa picos patológicos como o
  // delta bruto grande do R3F no primeiro quadro depois que uma aba
  // volta do background, para o crossfade animar em vez de saltar.
  // 0.1 s casa com o teto de dt do voo de câmera.
  // [casa] O mesmo teto de 0,1 s já existe do lado de cá, no delta do
  // Sol (`stellarBody.ts:441`) — o número atravessa confirmado dos dois
  // lados, não por autoridade do doador.
  const dt = Number.isFinite(dtSeconds)
    ? Math.min(Math.max(dtSeconds, 0), 0.1)
    : 0;
  const stepMagnitude = (dt * 1000) / durationMs;
  const remaining = target - current;
  if (Math.abs(remaining) <= stepMagnitude) return target;
  const next = current + Math.sign(remaining) * stepMagnitude;
  return Math.max(0, Math.min(1, next));
}

// ------------------------------------------------------------
// 3. (O gate por ângulo sólido morreu no M1 — dormiu de 13/08 a 16/08
//    e nunca teve consumidor de runtime.)
// ------------------------------------------------------------
//
// Aqui moravam `DISC_ENTER_RAD`/`DISC_EXIT_RAD`/`shouldDiscBeActive`
// (contrato do doador com âncora ARTÍSTICA morta — o ENTER derivava do
// raio inflado que a F3 apagou) e os órfãos `computeSolidAngle`,
// `distanceForSolidAngle`, `projectedRadiusPx`, `maxSpriteSolidAngleRad`
// e `POINT_SIZE_CEILING_PX`. O eixo óptico da Lei (`wPonto` contra a
// pegada do pixel, com histerese C¹) responde a pergunta que o gate
// queria responder, sem booleano e sem número órfão. Quem precisar da
// história: `git log -S shouldDiscBeActive`.

// `psfPointSizePx` MORAVA AQUI e mudou de casa no F0 (LEI-DA-ESTRELA §4):
// era um espelho com vida própria — a quarta cópia da mesma lei — e desde
// a fase 3 estava no caminho de runtime da dominância. O endereço único é
// `luzDaCasa.ts`, de onde este arquivo e os corpos passaram a importar.

// ------------------------------------------------------------
// 4. Cicatrizes C2/C3 como contrato puro (a parte que a fase 3 liga
//    ao Three; aqui ela é testável sem GPU)
// ------------------------------------------------------------

/** Valor NEUTRO de `aFade` (D3): 0 ⇒ `(1 - aFade) = 1`, estrela inteira. */
export const FADE_NEUTRAL = 0;
/** `aFocus` desligado — o branch de foco fica inerte (D3). */
export const FOCUS_OFF = 0;
/** `aFocus` ligado — bypass de identidade (o corpo chega na Onda 7). */
export const FOCUS_ON = 1;

/**
 * C2 — a escrita idempotente. O doador reafirma `a_fadeAlpha` TODO
 * QUADRO (`HygStellarMesh.tsx:334-346`) porque um rebuild de geometria
 * no meio do fade devolvia um buffer zerado e o sprite reaparecia por
 * baixo da malha; e a reafirmação só é barata porque a escrita é no-op
 * quando o slot já tem o valor (`:170`) — sem isso, `needsUpdate` subia
 * todo quadro e a GPU recebia um upload por nada (M4 da casa).
 * Aqui está a decisão pura: precisa escrever?
 * Detalhes que o `!==` decide e que são deliberados:
 *  - alvo NaN SEMPRE escreve (NaN !== NaN) — é o comportamento do
 *    doador, e escrever NaN visível é melhor que fingir estabilidade;
 *  - -0 e +0 contam como iguais (não escreve): mesmo valor, e o bit de
 *    sinal não muda o que a PSF faz com ele.
 * [casa] O rebuild que o doador temia NÃO EXISTE aqui: nenhuma camada
 * estelar responde a troca de qualidade (mapa da casa §8 — D8). O
 * contrato entra mesmo assim, barato, para proteger o invariante.
 */
export function needsAttributeWrite(current: number, target: number): boolean {
  return current !== target;
}

/** Estado vivo da rampa de um consumidor (valor corrente + alvo). */
export interface RampState {
  ramp: number;
  target: number;
}

/**
 * C3 — reset na troca de foco. Rampa E alvo voltam a 0, senão um
 * refoco enquanto a estrela anterior estava plenamente resolvida
 * carregaria ramp=1 para o quadro seguinte e apagaria o sprite da
 * estrela NOVA na hora (`HygStellarMesh.tsx:358-373`). Devolve um
 * objeto NOVO a cada chamada: o estado é do consumidor, não do módulo.
 */
export function resetRamp(): RampState {
  return { ramp: 0, target: 0 };
}

/** O par de valores que uma estrela guarda no campo (fase 3). */
export interface SlotWrites {
  fade: number;
  focus: number;
}

/**
 * C3 — o que o cleanup grava na estrela que PERDE o foco: fade e foco
 * zerados, para não ficar meio-apagada para sempre
 * (`HygStellarMesh.tsx:375-380`).
 */
export function clearFocus(): SlotWrites {
  return { fade: FADE_NEUTRAL, focus: FOCUS_OFF };
}

/**
 * Espelho da linha do shader que a fase 3 escreve em STAR_VERT:
 * `atten *= clamp(1.0 - aFade, 0.0, 1.0)`. Em `aFade = 0` devolve 1 —
 * é a prova de que o atributo nasce NEUTRO (D3).
 */
export function spriteAttenuation(fade: number): number {
  return Math.max(0, Math.min(1, 1 - fade));
}

/**
 * Espelho do branch de identidade do shader (`aFocus > 0.5`, meio
 * caminho entre 0 e 1 para tolerar interpolação/quantização).
 */
export function isFocusBypassActive(focus: number): boolean {
  return focus > 0.5;
}

// (`spriteAttenuationWithFocus` — o espelho do `mix` inteiro do
// STAR_VERT — morreu no M1: órfão sem consumidor de runtime; os dois
// espelhos de linha (`spriteAttenuation`, `isFocusBypassActive`)
// bastam para os oráculos.)

// ------------------------------------------------------------
// 5. A POLÍTICA DE DOMINÂNCIA — o fim da dupla-luz hero↔catálogo
//    (decisão D2 do desenho da onda, na forma corrigida pela medição
//    da fase 2). PURO: espelhos em JS de duas contas que hoje só
//    existem em GLSL, mais a curva que decide quanto o ponto cede.
// ------------------------------------------------------------
//
// O PROBLEMA. As 16 mais brilhantes desenham luz DUAS vezes: o ponto do
// campo de catálogo (`stars.ts`) e o billboard do hero (`heroStars.ts`)
// na mesma posição, somados em `AdditiveBlending`, sem nenhuma supressão
// entre as camadas (mapa da casa §3 — o vazio que esta fase fecha).
//
// A PRIMEIRA FORMA DA D2 ESTAVA ERRADA, e quem a derrubou foi a medição
// da fase 2 (achado A9): escrever `aFade = presença do hero` apagaria o
// ponto já a 200 pc, onde o billboard tem 0,91 px de diâmetro e o ponto
// tem 5,93 px — trocar-se-ia uma estrela legível por um sub-pixel, e as
// 16 mais brilhantes ESCURECERIAM em quase toda a faixa útil. Presença
// não é dominância.
//
// A FORMA CERTA. O catálogo só cede na medida em que o hero DOMINA a
// representação na tela:
//     r    = diâmetro_px(hero) / diâmetro_px(ponto do catálogo)
//     fade = g(r),  g(r ≤ 1) = 0
// Enquanto o billboard não é maior que o ponto, o ponto fica INTEIRO
// (r ≤ 1 ⇒ fade 0 exato — é por isso que hero200/600/950 saem
// bit-idênticas). Quando o billboard cresce por cima, o ponto cede na
// medida em que virou redundante.
//
// POR QUE COMPARAR TAMANHO E NÃO BRILHO. As duas camadas não têm
// normalização radiométrica comum: o ponto do catálogo é fotométrico
// (a integral da PSF É o fluxo — `starPSF`, `shaders/common.ts`) e o
// billboard do hero é artefato de olho/instrumento com ganho artístico
// (`core`/`glow`/`spikes` no FRAG de `heroStars.ts`). Somar as duas em "brilho" exigiria calibrar
// uma na outra — trabalho de tela, não de conta, e fica para a Onda 7.
// O tamanho na tela, esse, é a MESMA régua para as duas (px), é o que
// decide quem representa a estrela, e é medível dos dois lados sem
// constante livre nenhuma. É a régua que esta política usa.

/**
 * `tan(58°/2)` — a lente de referência do `uZoom` dos heroes
 * (`HeroStars.TAN_REF`, consumida no `update` das duas classes de
 * `heroStars.ts`). Escrita com a MESMA associação de
 * `Math.tan(THREE.MathUtils.degToRad(58/2))` (`29 * (Math.PI/180)`, não
 * `(29*Math.PI)/180`): o `heroStars.ts` importa esta constante desde a
 * fase 3, e um ULP aqui é um ULP no tamanho do billboard na tela.
 */
export const HERO_ZOOM_TAN_REF = Math.tan(29 * (Math.PI / 180));

/**
 * Diâmetro em px do billboard de um hero — espelho da cadeia
 * `VERT` (`heroStars.ts:19-24`) + `uZoom` (`HeroStars.update`):
 *   meia-extensão em espaço de vista = uSize · uZoom
 *   uZoom = min(1, tan(fov/2) / tan(29°))
 *   px = 2 · (meia-extensão / (d · tan(fov/2))) · (screenH/2)
 *
 * O FOV SE CANCELA DE PROPÓSITO enquanto a lente for igual ou mais
 * fechada que a de referência (`tan(fov/2) ≤ tan(29°)`, todo o regime da
 * hélice, que varia 26°→56°): o `uZoom` encolhe o quad na mesma razão em
 * que a teleobjetiva o ampliaria, e sobra
 *     diâmetro_px = uSize · screenH / (d · tan(29°)).
 * Lente MAIS ABERTA que 58° (só `?fov=90` do gate do céu, que já roda com
 * `nohero=1`) volta a depender do fov, e por isso o parâmetro continua na
 * assinatura em vez de virar constante.
 *
 * APROXIMAÇÃO DECLARADA: usa a distância câmera↔estrela como
 * profundidade. Fora do eixo a profundidade verdadeira é `d·cosθ` e o
 * quad projeta um pouco MAIOR; a política erra então para o lado de
 * ceder de menos (o ponto do catálogo fica mais tempo inteiro), que é a
 * direção segura.
 */
export function heroSizePx(
  sizePc: number,
  camDistPc: number,
  screenH: number,
  tanHalfFov: number
): number {
  if (
    !Number.isFinite(sizePc) ||
    !Number.isFinite(camDistPc) ||
    !Number.isFinite(screenH) ||
    !Number.isFinite(tanHalfFov) ||
    sizePc <= 0 ||
    camDistPc <= 0 ||
    screenH <= 0 ||
    tanHalfFov <= 0
  ) {
    return 0;
  }
  const zoom = Math.min(1, tanHalfFov / HERO_ZOOM_TAN_REF);
  return (sizePc * zoom * screenH) / (camDistPc * tanHalfFov);
}

// (`heroSizePcDePx` — a inversa de `heroSizePx`, nascida em 15/08 para
// o `SunStar` pedir o tamanho em pixels — morreu no M1 junto com o
// único consumidor. O clarão por pixel derivado do fluxo é `claraoPx`
// da Lei, M2.)

/**
 * Magnitude aparente que o vertex do catálogo recalcula da posição da
 * câmera — espelho da linha `float m = ...` do `STAR_VERT`
 * (`starShaders.ts`):
 *   `m = -0.15 - 2.5*aLogLum + 5.0*(log2(max(dist,1e-3)) * 0.30103)`
 * O `log2 · 0,30103` fica como está (não vira `Math.log10`): é a conta
 * QUE A GPU FAZ, e o espelho existe para prever o pixel dela. A
 * igualdade com o shader é de curva e de número, não de bit — float32 lá,
 * float64 aqui (achado A7 da fase 1).
 */
export function catalogApparentMag(logLum: number, distPc: number): number {
  return -0.15 - 2.5 * logLum + 5.0 * (Math.log2(Math.max(distPc, 1e-3)) * 0.30103);
}

/**
 * As bordas de `g`. A INFERIOR não é escolha: `r = 1` é a definição de
 * dominância (o billboard passa a ser maior que o ponto).
 *
 * A SUPERIOR é DERIVADA da prova de continuidade, não de gosto. Com
 * `g = smoothstep(1, hi, r)`, a presença combinada na tela é
 *     P(d) = C(d)·(1 − g(r)) + H(d),  com H = r·C por definição de r,
 *     P(d) = C(d)·(1 − g(r) + r) = C(d)·φ(r),
 * e φ′(r) = 1 − g′(r). O máximo de `6t(1−t)` é 1,5, logo
 *     max g′ = 1,5/(hi − 1) ≤ 1  ⟺  hi ≥ 2,5.
 * Na aproximação, C cresce (a PSF cresce com o fluxo) e r cresce (o
 * billboard cresce com 1/d, mais rápido que a PSF, que cresce com
 * √log). Com φ′ ≥ 0 o produto de dois fatores não-decrescentes é
 * não-decrescente: **2,5 é a MENOR borda superior em que a luz combinada
 * nunca dá um passo para trás enquanto se chega perto**. Abaixo dela o
 * ponto cederia mais rápido do que o hero cresce, e o par piscaria para
 * baixo no meio da aproximação — o defeito que a D2d proíbe.
 *
 * O ESCOPO DA PROVA, dito por extenso (correção da revisão de olhos
 * frescos da fase 4b): o passo `H = r·C` supõe que o hero desenha
 * INTEIRO, isto é, que `heroPresence` vale 1 — o que é verdade acima de
 * `1,4 × uSize`, onde o `nearFade` do FRAG já saturou. É toda a faixa em
 * que `g > 0` para os 16 (a dominância morre em 113 pc no pior caso e o
 * maior `1,4·uSize` dos 16 é 0,3028 pc, o de Sirius), e por isso a prova
 * cobre a viagem inteira. ABAIXO de `1,4 × uSize` ela NÃO vale, e não é
 * defeito desta política: lá o `nearFade` apaga o clarão (é a rede que
 * devolve o ponto ao catálogo — ver `heroCatalogFade`), e a luz
 * combinada de fato DIMINUI ao colar na estrela, porque não há corpo
 * nenhum para assumir. Medido em Sirius (`uSize` 0,2163 pc, tela de
 * 1713 px): P vai de 2.297 px em 0,28 pc para 18,6 px em 0,11 pc —
 * queda de 123×. É comportamento HERDADO (o mesmo `nearFade` de antes da
 * onda) — o handoff completo, com corpo por estrela como o Sol tem, é a
 * Onda 7 (pendência nomeada no Estado da Onda 3). O teste
 * "abaixo de 1,4×uSize" documenta o regime com estes números.
 *
 * Bônus geométrico do mesmo número: em r = 2,5 o sprite INTEIRO do
 * catálogo (diâmetro 2·raio) cabe dentro do RAIO do billboard com folga —
 * o ponto virou, de fato, um detalhe dentro do clarão.
 */
export const HERO_DOMINANCE = { enterRatio: 1, fullRatio: 2.5 } as const;

/**
 * `g(r)` — quanto o ponto do catálogo cede a um hero que mede `r` vezes
 * o tamanho dele na tela. Smoothstep cúbico, a mesma forma que a casa
 * usa em toda rampa (C¹ nas duas bordas: sem degrau e sem quina, a
 * derivada é `6t(1−t)`, que zera em t=0 e t=1).
 * `r ≤ 1` devolve 0 EXATO (não "quase 0"): é o que mantém as vistas onde
 * o hero é sub-dominante bit-idênticas.
 * Entrada não-finita devolve 0 — direção segura (ponto inteiro).
 */
export function heroDominanceFade(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0;
  return glslSmoothstep(HERO_DOMINANCE.enterRatio, HERO_DOMINANCE.fullRatio, ratio);
}

// (`filtroSolarAlvo` e `MEIA_LARGURA_LOG_DO_FILTRO` morreram no M1: o
// filtro solar é `overrideExpoente` da repartição única — mesma
// `discoPx` do eixo óptico, largura própria (§5.7 da Lei). A rampa
// log-simétrica sobre disco/halo era a âncora circular que a Lei §8.4
// proíbe: media o disco contra o halo do próprio ponto.)

/**
 * A CHAVE DA CESSÃO. `true` desde a fase 4a da Onda 3 — a dupla-luz
 * hero↔catálogo está DESFEITA por padrão. A chave nasceu em `false` na
 * fase 3 por disciplina de gate (o mecanismo inteiro instalado e provado,
 * escrevendo neutro), porque o achado daquela fase derrubou a previsão da
 * fase 2 ("só a vista de 8 pc muda"): ela valia para Betelgeuse e não
 * para as 16. PERTO DE CASA A DOMINÂNCIA É A REGRA — a 0,06 pc de casa
 * oito das 16 dominam o próprio ponto (Sirius com 248 px de clarão contra
 * 11 px de ponto).
 * O QUE O A/B MEDIU com `?dom=1` nas quinze vistas do `ab-identidade`
 * (mesmo binário dos dois lados): mudam CINCO, não uma. As quatro do Sol,
 * por causa de α Centauri (1,4 pc, ponto DENTRO do quadro ao lado do Sol
 * — 5,2% dos pixels em `soldisco`, delta máximo de 2 níveis: real, mas
 * invisível lado a lado), e a `hero8` (48,7% dos pixels, delta máximo de
 * 19 — o clarão de Betelgeuse cede 22,7% do ponto e o bloom espalha a
 * diferença). As dez restantes ficam bit-idênticas, inclusive a `sol` e a
 * `interno`: lá as heroes que cedem estão FORA do frustum e quem pinta é
 * só o clarão delas, que esta política não toca — o pixel só muda quando
 * o PONTO está no quadro.
 * A DECISÃO (D11 do desenho da onda, coordenador, 2026-08-11, com as
 * imagens abertas): o colateral nas quatro vistas do Sol é imperceptível
 * e o disco solar sai idêntico; a `hero8` é MELHORIA — o núcleo branco de
 * dupla-luz vira supergigante quente. Logo a chave liga por padrão e as
 * quinze capturas com ela ligada viram as baselines oficiais da casa
 * (md5 no `NORTE.md`). O pixel-igual que o plano pede foi cumprido duas
 * vezes com a chave desligada (fases 2 e 3) — ele era o instrumento, e
 * esta mudança é melhoria auditada, não regressão acidental (D1).
 * `?nodom=1` desliga ao vivo (é o caminho de volta e o lado "antes" de
 * qualquer A/B futuro); `?dom=1` continua ligando mesmo com esta
 * constante em `false`, para o A/B ser sempre feito com o MESMO binário.
 */
export const DOMINANCE_DEFAULT_ON = true;

/** O que a política precisa saber de UM par hero↔ponto, num quadro. */
export interface HeroFadeInputs {
  /** distância câmera↔estrela, em pc (a mesma que vai em `uCamDist`) */
  camDistPc: number;
  /** `uSize` do billboard em pc (o `sizePc` que `HeroStars` publica) */
  heroSizePc: number;
  /** `aLogLum` do ponto do catálogo CASADO (quantizado — é o que a GPU lê) */
  catalogLogLum: number;
  /** altura do buffer de desenho em px (`uScreenH`) */
  screenH: number;
  /** `tan(fov/2)` da câmera do quadro */
  tanHalfFov: number;
  /** `uExpoM0` do campo de catálogo */
  expoM0: number;
  /** `uSigmaPx` do campo de catálogo */
  sigmaPx: number;
}

/**
 * `r` — a razão de dominância do quadro. Os dois lados são DIÂMETROS na
 * tela: `gl_PointSize` é a aresta do sprite de ponto e `heroSizePx`
 * devolve a largura cheia do quad, então a comparação é da mesma
 * grandeza. Ponto inexistente (PSF ≤ 0) devolve 0 = "não domina".
 *
 * QUASE INDEPENDENTE DA RESOLUÇÃO, e isso é propriedade, não acaso: o
 * numerador é ∝ screenH e o denominador também (σ = sigmaPx·screenH/1080
 * multiplica a PSF inteira), sobrando screenH só dentro do `ln peak` do
 * termo de saturação. Dobrar a tela não muda quem representa a estrela.
 */
export function heroDominanceRatio(i: HeroFadeInputs): number {
  const catPx = psfPointSizePx(
    catalogApparentMag(i.catalogLogLum, i.camDistPc),
    i.expoM0,
    i.sigmaPx,
    i.screenH
  );
  if (!(catPx > 0)) return 0;
  return heroSizePx(i.heroSizePc, i.camDistPc, i.screenH, i.tanHalfFov) / catPx;
}

/**
 * A POLÍTICA INTEIRA, num número: o `aFade` que o ponto do catálogo
 * casado com este hero recebe neste quadro.
 *
 * `g(r) · presença(hero)`. O segundo fator é a rede de segurança
 * analítica "hero apagado ⇒ ponto inteiro". Em toda a faixa que a
 * viagem visita ele é INERTE por construção, e o teste prova as duas
 * pontas: acima de 0,31 pc (= 1,4 × o maior `uSize` dos 16) o
 * `nearFade` já vale 1, e o `farFade` só começa a cair em 320 pc,
 * enquanto a dominância morre em 113 pc no pior dos 16 (Sirius) — ou
 * seja, onde `g > 0` a presença vale exatamente 1. O fator existe para
 * que a garantia venha da CONTA e não da varredura que por acaso se
 * fez, e ele fecha o único regime onde as duas curvas se cruzariam: o
 * de colar na estrela (abaixo de ~0,3 pc), onde o billboard some pelo
 * `nearFade` e o ponto do catálogo tem de voltar inteiro.
 * As outras duas redes da D2 são do CHAMADOR, porque são estado de
 * runtime e não de geometria: `?nohero=1` e o corte `dHome ≥ 1200`
 * (a linha que decide `heroes.group.visible` no `frame` do
 * `director.ts`) desligam o grupo inteiro, e aí o fade escrito é
 * `FADE_NEUTRAL` — ver `fadesDoQuadro`, logo abaixo.
 */
export function heroCatalogFade(i: HeroFadeInputs): number {
  const dominance = heroDominanceFade(heroDominanceRatio(i));
  if (dominance <= 0) return FADE_NEUTRAL;
  return dominance * heroPresence(i.camDistPc, i.heroSizePc);
}

/** O que a política precisa saber da CÂMERA e do campo, num quadro. */
export interface QuadroDaCamera {
  /** altura do buffer de desenho em px (`uScreenH`) */
  screenH: number;
  /** `tan(fov/2)` da câmera do quadro */
  tanHalfFov: number;
  /** `uExpoM0` do campo de catálogo */
  expoM0: number;
  /** `uSigmaPx` do campo de catálogo */
  sigmaPx: number;
}

/**
 * A POLÍTICA DO QUADRO INTEIRO: os `aFade` dos 16 pares hero↔ponto de
 * uma vez. É a função que o `director` chama por quadro, extraída do
 * corpo dele na fase 4b por um achado da caçada adversarial — a fiação
 * era o único trecho da onda sem teste de COMPORTAMENTO (o que havia
 * eram asserções sobre o texto-fonte, que passam com a fiação errada).
 * Aqui o comportamento inteiro cabe num teste sem three e sem GPU.
 *
 * `ligado` é a conjunção das duas redes de runtime da D2 (grupo dos
 * heroes visível — `?nohero=1` e o corte `dHome ≥ 1200` o desligam — e a
 * chave da cessão com suas portas `?dom`/`?nodom`). DESLIGADO ESCREVE
 * NEUTRO, não "não escreve": é isso que limpa o resíduo do quadro
 * anterior no MESMO quadro em que a chave vira, e é por isso que o gate
 * do céu (que roda com `nohero=1`) mede exatamente o que sempre mediu.
 *
 * Slot sem par (`idx < 0`) recebe NEUTRO e o chamador o pula — não há
 * onde escrever, e o ponto dele fica inteiro.
 *
 * `out` é reusado entre quadros (o chamador guarda o array): zero
 * alocação por quadro além dos 16 literais que `heroCatalogFade` recebe,
 * medidos em 1,54 µs por quadro na revisão.
 */
export function fadesDoQuadro(
  idx: readonly number[],
  camDistPc: readonly number[],
  sizePc: readonly number[],
  catalogLogLum: readonly number[],
  cam: QuadroDaCamera,
  ligado: boolean,
  out: number[] = []
): number[] {
  out.length = idx.length;
  for (let i = 0; i < idx.length; i++) {
    out[i] =
      ligado && idx[i] >= 0
        ? heroCatalogFade({
            camDistPc: camDistPc[i],
            heroSizePc: sizePc[i],
            catalogLogLum: catalogLogLum[i],
            screenH: cam.screenH,
            tanHalfFov: cam.tanHalfFov,
            expoM0: cam.expoM0,
            sigmaPx: cam.sigmaPx,
          })
        : FADE_NEUTRAL;
  }
  return out;
}

// ------------------------------------------------------------
// 5b. O CASAMENTO hero↔catálogo (a metade de IDENTIDADE da mesma
//     política: sem índice não há o que escrever)
// ------------------------------------------------------------
//
// O formato "sc1" NÃO carrega identidade: são 9 bytes por estrela —
// lon, lat, log10(d), logLum, B−V (`decodeStars`, `config.ts`) — e nenhum id.
// Os 16 heroes vêm do sidecar `stars_meta.json` (`named`), que tem
// nome, HD/HIP/Gliese e posição, mas NÃO tem o índice da estrela no
// binário: o gerador emite as nomeadas ordenadas e deduplicadas por
// nome (`build-star-catalog.mjs:279-281`), o que destrói a ordem do
// array de estrelas.
//
// O que o gerador GARANTE (`build-star-catalog.mjs:237-273`) é que toda
// nomeada saiu da MESMA linha que empurrou uma estrela para o binário —
// com o mesmo x,y,z e a mesma luminosidade. Logo o casamento existe
// sempre; o que ele não pode ser é por igualdade exata, porque o
// binário guarda a versão QUANTIZADA (o próprio build mede o erro:
// `quantization.maxPositionErrorPc`).
//
// Casa-se então por POSIÇÃO com tolerância relativa e desempata-se por
// LUMINOSIDADE — e o desempate não é luxo: Acrux (α Cru A e B, 4″ de
// separação) tem DUAS entradas no binário que caem no MESMO ponto
// quantizado, separação idêntica até o último bit, e Rigil Kentaurus
// (α Cen A e B) tem duas a 8,9e-5 pc e 6,7e-5 pc. Posição sozinha
// escolheria a companheira fraca em Acrux por sorte de ordenação; a
// luminosidade separa as duas por 0,32 dex, contra 1e-4 dex de erro de
// quantização — 3 ordens de grandeza de margem.

/** O que o casamento precisa saber de uma nomeada (subconjunto de `NamedStar`). */
export interface CatalogMatchTarget {
  x: number;
  y: number;
  z: number;
  /** magnitude aparente vista do Sol */
  m: number;
  /** distância ao Sol, pc */
  d: number;
}

/**
 * Tolerância de posição, RELATIVA à distância da estrela. O erro de
 * quantização é relativo por construção — angular (20″ ⇒ 4,8e-5·d) e
 * radial (o passo de log10(d) ⇒ 7,9e-5·d) — então uma tolerância
 * absoluta seria frouxa perto e apertada longe. 3e-4 é ~4× a pior
 * separação MEDIDA nos 16 (8e-5·d, em Aldebaran) e ~2× o pior caso
 * teórico da soma dos dois erros.
 */
export const HERO_MATCH_REL_TOL = 3e-4;

/**
 * Índice de cada alvo no catálogo, ou −1 para "sem par" — que é
 * declaração, não chute: o consumidor pula o slot e ninguém escreve
 * `aFade` numa estrela errada.
 * Uma passada só sobre o catálogo (16 × 328.749 com rejeição por eixo:
 * ~40 ms medidos, uma vez no init).
 *
 * INJETIVO POR CONSTRUÇÃO (conserto da revisão de olhos frescos, fase
 * 4b): cada alvo elege seu melhor índice sozinho, então nada no laço
 * impede que DOIS elejam o mesmo — hoje não acontece (os 16 casam um a
 * um, provado contra o binário real), mas basta o catálogo ser regerado
 * com outro corte de magnitude ou outra quantização para duas nomeadas
 * vizinhas (as duplas de Acrux e Rigil Kentaurus) colapsarem no mesmo
 * slot. Aí o consumidor escreveria as duas no mesmo índice por quadro, a
 * última venceria, e a dupla-luz voltaria EM SILÊNCIO na outra. A
 * varredura de colisão abaixo desempata pelo mesmo score de
 * luminosidade e marca a perdedora com −1, que é o caminho seguro já
 * existente: o `director` a reporta no MESMO `console.warn` do caso sem
 * par e o ponto dela fica inteiro (o comportamento pré-onda).
 */
export function matchHeroesToCatalog(
  targets: readonly CatalogMatchTarget[],
  position: Float32Array,
  logLum: Float32Array
): number[] {
  const k = targets.length;
  const best = new Array<number>(k).fill(-1);
  const bestScore = new Array<number>(k).fill(Infinity);
  const tol = new Array<number>(k).fill(0);
  const wantLum = new Array<number>(k).fill(0);
  for (let j = 0; j < k; j++) {
    const t = targets[j];
    if (!Number.isFinite(t.x) || !Number.isFinite(t.y) || !Number.isFinite(t.z)) continue;
    if (!Number.isFinite(t.d) || !Number.isFinite(t.m) || t.d <= 0) continue;
    tol[j] = HERO_MATCH_REL_TOL * t.d;
    // a MESMA conta do gerador (`build-star-catalog.mjs:226,237`):
    // M = m − 5·log10(d) + 5 e logLum = 0,4·(4,85 − M).
    wantLum[j] = 0.4 * (4.85 - (t.m - 5 * Math.log10(t.d) + 5));
  }
  const n = logLum.length;
  for (let i = 0; i < n; i++) {
    const x = position[i * 3];
    const y = position[i * 3 + 1];
    const z = position[i * 3 + 2];
    for (let j = 0; j < k; j++) {
      const t = tol[j];
      if (t <= 0) continue;
      const target = targets[j];
      const dx = x - target.x;
      if (dx > t || dx < -t) continue;
      const dy = y - target.y;
      if (dy > t || dy < -t) continue;
      const dz = z - target.z;
      if (dz > t || dz < -t) continue;
      if (dx * dx + dy * dy + dz * dz > t * t) continue;
      const score = Math.abs(logLum[i] - wantLum[j]);
      if (score < bestScore[j]) {
        bestScore[j] = score;
        best[j] = i;
      }
    }
  }
  // colisão: dois alvos no mesmo índice. Fica quem casa melhor em
  // luminosidade (`<` estrito — no empate exato vence o primeiro, a
  // mesma regra do desempate de dentro do laço); o outro vira "sem par".
  const dono = new Map<number, number>();
  for (let j = 0; j < k; j++) {
    const i = best[j];
    if (i < 0) continue;
    const anterior = dono.get(i);
    if (anterior === undefined) {
      dono.set(i, j);
    } else if (bestScore[j] < bestScore[anterior]) {
      best[anterior] = -1;
      dono.set(i, j);
    } else {
      best[j] = -1;
    }
  }
  return best;
}
