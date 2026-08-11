// ============================================================
// lodStellar — o LOD estelar da casa num lugar só. PURO: só importa
// `WORLD` (config.ts, que não importa nada); zero three, zero DOM.
//
// Três coisas moram aqui, com origens DIFERENTES e declaradas:
//
// 1. AS JANELAS DA CASA (verbatim, origem-casa). As três rampas do
//    crossfade disco↔glare do Sol VIVIAM redigitadas em dois arquivos
//    que não se importavam — `novoSol.ts:85-86,333-335` (o disco) e
//    `heroStars.ts:224-225,236-237` (uGain e uCore do SunStar) —
//    ligadas só por COMENTÁRIO. Uma casa decimal movida de um lado e
//    nada denunciava. Aqui elas ficam juntas, com os MESMOS números e
//    a MESMA forma de conta; desde a fase 2 da Onda 3 os dois
//    consumidores IMPORTAM daqui (`stellarBody.ts:473,480` e
//    `heroStars.ts:227,238` — o `novoSol.ts` das citações acima virou
//    `stellarBody.ts` no mesmo `git mv`), e um teste de pinagem
//    (lodStellar.test.ts) impede a redigitação de renascer.
//    Nota do plano: `PLANO-ATLAS.md:96` chama {0,14→0,30} e
//    {0,30→0,42} de janelas "dos heroes" — no código elas são do SOL
//    visto de longe (a classe `SunStar`), não das 16 heroes. O código
//    real vence; a divergência fica registrada aqui. As janelas que
//    são MESMO das 16 heroes (nearFade e farFade, `heroStars.ts:56,58`)
//    entram na tabela `LOD_HERO`, seção 1b — elas alimentam o fim da
//    dupla-luz hero↔catálogo na fase 3 (decisão D2).
//
// 2. `stepRampToward` — TRANSCRIÇÃO AUTORIZADA do doador atlas-orbital
//    (`src/components/canvas/hygMeshFadeRamp.ts`, 48 linhas). A matriz
//    do plano abre a exceção nominalmente (`PLANO-ATLAS.md:49,101,265`):
//    47 linhas puras que carregam a razão do clamp de dt junto — "é
//    mais barato copiar com o comentário do que redescobrir o bug".
//    Assinatura, corpo e TODOS os comentários vêm inteiros; só a
//    língua muda (a casa escreve em pt-BR). Onde o comentário do
//    doador cita o stack dele (R3F, Fast Refresh), o texto fica —
//    é o registro de onde o bug foi comprado — com a nota da casa ao lado.
//
// 3. O GATE POR ÂNGULO SÓLIDO — CONTRATO do doador
//    (`src/lib/stellarMeshGate.ts`), NÚMEROS da casa. A própria matriz
//    (`PLANO-ATLAS.md:97`) diz que os limiares NÃO se herdam: lá o
//    sprite é outra PSF, e o ENTER de 1e-3 rad é ~70× menor que o
//    handoff desta viagem. O que atravessa é o critério (LOD por
//    ÂNGULO, não por distância) e a forma do gate (histerese com
//    cushion 2×, desigualdades assimétricas estritas, NaN preserva
//    estado). Os números saem da conta documentada em "A CONTA DO
//    HANDOFF", abaixo.
//
// 4. A POLÍTICA DE DOMINÂNCIA (seção 5, fase 3 da Onda 3) — a decisão
//    D2 do desenho, na forma que a medição da fase 2 corrigiu. Espelhos
//    em JS de duas contas que só existiam em GLSL (a PSF do ponto do
//    catálogo e o tamanho do billboard do hero) e a curva `g` que decide
//    quanto o ponto cede quando o hero o domina na tela — mais o
//    casamento hero↔índice do catálogo, que é a metade de identidade da
//    mesma política. Consumidor: `director.ts`, que escreve `aFade` nas
//    16 por quadro.
//
// FIAÇÃO (fase 2 da Onda 3): `stellarBody.ts` consome `discWorldFade`
// e `isDiscGroupVisible`; `heroStars.ts` (classe SunStar) consome
// `sunStarGain` e `sunStarCore`. A troca saiu BIT-IDÊNTICA nas 15
// vistas do `ab-identidade` — as 7 fixas mais as 8 novas por distância
// (4 condições do Sol, 4 de hero) — porque as funções daqui repetem a
// expressão do consumidor operação por operação, na mesma ordem. As
// duas janelas das 16 heroes genéricas (LOD_HERO) ficaram sem
// consumidor JS até a fase 3, quando entraram na política de
// dominância como rede de segurança (`heroPresence`, seção 5).
// ============================================================
import { WORLD } from '../config';

// ------------------------------------------------------------
// 1. Janelas de LOD por instância (hoje só a instância Sol)
// ------------------------------------------------------------
//
// ARMADILHA DE PONTO FLUTUANTE — a razão de a tabela guardar largura E
// fim, em vez de só os extremos. Os dois consumidores dividem por
// coisas diferentes, e em double as duas contas NÃO dão o mesmo bit:
//   stellarBody.ts dividia por (DISC_FADE1 - DISC_FADE0) = 0.18000000000000002
//     (≠ 0.18) — a tabela guarda os dois extremos e a rampa recalcula
//     a diferença, igual a lá;
//   heroStars.ts divide pela LARGURA literal: 0.16 e 0.12 — e
//     0.3 - 0.14 = 0.15999999999999998 (≠ 0.16), 0.14 + 0.16 =
//     0.30000000000000004 (≠ 0.3). A tabela guarda a largura literal
//     (é ela que a rampa usa) e o fim como documentação pinada.
// Reduzir isso a um par {início, fim} com largura derivada mudaria o
// último bit da rampa de uGain — que é exatamente o tipo de regressão
// silenciosa que o md5 do ab-identidade pega na fase 2.
export const LOD_SOL = {
  /**
   * Disco procedural do Sol: 1 (disco é o assunto) → 0 (só a PSF
   * estelar). Consumidor: `stellarBody.ts:473` (antes do `git mv` da
   * fase 2 os números viviam em `novoSol.ts:85-86` e a rampa em
   * `:333-335`).
   */
  disc: { fade0Pc: 0.16, fade1Pc: 0.34 },
  /**
   * `uGain` do clarão (SunStar): 0 → 1 enquanto o disco sai de cena.
   * Consumidor: `heroStars.ts:227`.
   */
  starGain: { startPc: 0.14, widthPc: 0.16, endPc: 0.3 },
  /**
   * `uCore` do clarão (SunStar): o núcleo pontual + espinhos só
   * acendem DEPOIS que o disco saiu. Consumidor: `heroStars.ts:238`.
   */
  starCore: { startPc: 0.3, widthPc: 0.12, endPc: 0.42 },
} as const;

/**
 * Piso de visibilidade do grupo do Sol: sumido, nada do Sol é
 * submetido. Consumidor: `stellarBody.ts:480` — corte DURO, não
 * rampa, e por isso mora fora das janelas acima.
 */
export const DISC_VISIBLE_MIN = 0.02;

/**
 * Rampa do disco, forma EXATA da que vivia inline em `novoSol.ts:334-335`
 * antes da fiação (smoothstep
 * cúbico DESCENDENTE, com o clamp escrito como ternário e a largura
 * recalculada de fade1-fade0 — ver a armadilha de float acima).
 * `dPc` é a distância câmera↔Sol em pc REAIS (não na régua do doador
 * corrigida por fov: o fov varia 26°→56° na hélice e balançaria o
 * fade junto com o zoom — `stellarBody.ts:465-471`).
 */
export function discWorldFade(dPc: number): number {
  const wk = (dPc - LOD_SOL.disc.fade0Pc) / (LOD_SOL.disc.fade1Pc - LOD_SOL.disc.fade0Pc);
  return wk <= 0 ? 1 : wk >= 1 ? 0 : 1 - wk * wk * (3 - 2 * wk);
}

/** O corte duro de custo do grupo da estrela (`stellarBody.ts:480`). */
export function isDiscGroupVisible(worldFade: number): boolean {
  return worldFade > DISC_VISIBLE_MIN;
}

/**
 * `uGain` do SunStar, forma EXATA da que vivia em `heroStars.ts:224-225`
 * (Math.min/Math.max no clamp, divisão pela largura LITERAL, depois
 * smoothstep cúbico ASCENDENTE).
 * O piso `Math.max(camDist, 1e-4)` NÃO migra para cá: em
 * `heroStars.ts:215` ele é do `d` inteiro, compartilhado com a lei de
 * magnitude (`5·log10(d/10)`, que estoura em d=0) — é guarda do
 * chamador, não da rampa.
 */
export function sunStarGain(dPc: number): number {
  const k = Math.min(1, Math.max(0, (dPc - LOD_SOL.starGain.startPc) / LOD_SOL.starGain.widthPc));
  return k * k * (3 - 2 * k);
}

/** `uCore` do SunStar, forma EXATA da de `heroStars.ts:236-237`. */
export function sunStarCore(dPc: number): number {
  const c = Math.min(1, Math.max(0, (dPc - LOD_SOL.starCore.startPc) / LOD_SOL.starCore.widthPc));
  return c * c * (3 - 2 * c);
}

// ------------------------------------------------------------
// 1b. Janelas da outra instância: as 16 heroes genéricas
// ------------------------------------------------------------
//
// DIFERENÇA DE NATUREZA em relação às três rampas do Sol acima: aquelas
// são código JS HOJE (rodam em double, e a fase 2 as importa daqui — a
// igualdade tem de ser bit a bit). Estas duas são GLSL hoje
// (`heroStars.ts:56,58`, dentro do FRAG compartilhado por HeroStars e
// SunStar) e continuam sendo: o pixel do hero segue saindo do shader,
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
   * não em pc fixos — cada hero tem seu tamanho (`heroStars.ts:126-127`,
   * `size = 0,08·10^(−0,3m)` pc). `heroStars.ts:56`.
   */
  near: { startFactor: 0.5, endFactor: 1.4 },
  /**
   * `farFade`: esmaece de longe, "o ponto do catálogo assume" — janela
   * fixa {320; 900} pc. `heroStars.ts:58`. É a rede de segurança D2a:
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
 * (`heroStars.ts:56`), com as duas bordas calculadas do tamanho como lá
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

/** `farFade` do hero — `1.0 - smoothstep(320.0, 900.0, uCamDist)` (`heroStars.ts:58`). */
export function heroFarFade(camDistPc: number): number {
  if (!Number.isFinite(camDistPc)) return 0;
  return 1 - glslSmoothstep(LOD_HERO.far.startPc, LOD_HERO.far.endPc, camDistPc);
}

/**
 * A CURVA DE PRESENÇA do hero: o produto que o FRAG aplica na cor e no
 * alfa (`heroStars.ts:75`, `nearFade * farFade * uGain`, com uGain = 1
 * nos 16 heroes — `:140`). É esta curva que a fase 3 escreve em `aFade`
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
// 3. Gate por ângulo sólido — contrato do doador, números da casa
// ------------------------------------------------------------
//
// ── A CONTA DO HANDOFF (decisão D6 do desenho da onda) ──────────────
//
// (a) EQUIVALÊNCIA JANELA-EM-PC ↔ LIMIAR-EM-RAD. Uma janela em pc só
//     vale para UM raio: 0,16 pc é "perto" para o Sol e "colado" para
//     uma supergigante. O critério portátil é o ângulo. Para um corpo
//     de raio r visto a d, o raio angular é θ = r/d (aproximação de
//     ângulo pequeno, arctan(x) ≈ x). O erro dessa aproximação onde o
//     gate DECIDE algo (θ ≈ ENTER = 0,069 rad) é 0,16%; mesmo colado no
//     Sol, na parede de fogo (θ ≈ 0,22 rad a 0,05 pc), é 1,6% — uma
//     ordem de grandeza abaixo do cushion de 2× da histerese, então
//     nunca move uma decisão. Logo janela-em-pc e limiar-em-rad são a
//     MESMA régua vista por instâncias diferentes: d = r/θ.
//
// (b) A ÂNCORA DA CASA. O Sol tem r = WORLD.sunRadius = 0,011 pc
//     (`config.ts:8`; raio artístico — o real, 2,3e-8 pc, seria
//     invisível) e o disco está PLENO até DISC_FADE0 = 0,16 pc
//     (`LOD_SOL.disc.fade0Pc`). Traduzindo essa janela para ângulo:
//         θ_handoff = 0,011 / 0,16 = 6,875e-2 rad  →  é o ENTER.
//     Ou seja: "o disco é o assunto enquanto o corpo cobre mais de
//     ~0,0687 rad de raio angular" — a mesma frase que a casa já
//     escreveu em pc, agora dita numa unidade que serve a QUALQUER
//     instância (o que a Onda 7 precisa e a janela em pc não dá).
//
// (c) O CUSHION 2× (contrato do doador, `stellarMeshGate.ts:51,62-67`).
//     EXIT = ENTER/2 = 3,4375e-2 rad. Em distância isso é
//     d_exit = r/EXIT = 2·DISC_FADE0 = 0,32 pc — exato, por
//     construção. CONFERÊNCIA INDEPENDENTE: a casa já apaga o grupo do
//     Sol quando `isDiscGroupVisible` falha (`stellarBody.ts:480`), e resolvendo
//     a rampa isso cai em d = 0,32487 pc. O cushion de 2× do doador
//     reproduz, com 1,5% de diferença, o corte que a casa achou à mão
//     — e a zona morta [0,16; 0,32] pc cabe INTEIRA dentro da janela
//     do crossfade [0,16; 0,34] pc, então o gate nunca mata o disco
//     antes de a rampa ter terminado de apagá-lo. Não é coincidência
//     dosada: é o mesmo fenômeno físico visto por duas contas.
//
// (d) POR QUE ÂNGULO E NÃO BRILHO — A PSF DA CASA. `starPSF`
//     (`shaders/common.ts:300-313`) é a imagem de uma fonte PONTUAL:
//         sigma = sigmaPx · screenH/1080      (px; NÃO depende de d)
//         E     = 10^(-0,4·(m - expoM0))      (a distância entra AQUI)
//         size  = 2·(2,2·sigma + rSat), rSat = sigma·√(2·ln peak)
//     O tamanho do sprite em px cresce com √(ln E) — LOGARÍTMICO no
//     fluxo. O tamanho angular verdadeiro cresce com 1/d — LINEAR.
//     Chegando perto, a segunda ultrapassa a primeira sem volta: o
//     sprite deixa de ser honesto por CONSTRUÇÃO, não por calibração.
//     Por isso o handoff se decide por ângulo sólido (o quanto o corpo
//     é resolvido) e não por magnitude: um sprite com o dobro do
//     brilho continua sendo um ponto.
//
// (e) O TETO DE `gl_PointSize` COMO PARÂMETRO — e o que a conta
//     mostrou. Hoje não existe teto no código: `size` sai de `starPSF`
//     sem min()/clamp (risco 7 do mapa da casa) e quem corta é o
//     driver (`ALIASED_POINT_SIZE_RANGE`), não medido nesta onda. A
//     conta o recebe como PARÂMETRO DE PROJETO: com teto C px, altura
//     de tela H px e t = tan(fov/2), um sprite de ponto cobre no
//     máximo
//         θ_teto = C · t / H   (raio angular; ver maxSpriteSolidAngleRad)
//     Com C = POINT_SIZE_CEILING_PX = 256 px, H = 1080 e o fov mais
//     fechado do regime do Sol (26°, `journey.ts:251-262`):
//         θ_teto = 256 · tan(13°) / 1080 ≈ 5,47e-2 rad  <  ENTER.
//     SÓ QUE O TETO DO DRIVER NEM CHEGA A MANDAR. Com os parâmetros
//     REAIS da PSF da casa (uSigmaPx 0,85, uExpoM0 3,5, uScreenH 1080
//     — `stars.ts:40-42`), `size` satura em ~21,9 px numa magnitude
//     absurda de −60, e vale 9,4 px para o Sol na PRÓPRIA distância do
//     handoff (m = −4,15 pela lei de `heroStars.ts:216`). No mesmo
//     ponto, o corpo precisa de 321,6 px de diâmetro na tela: o sprite
//     de ponto fica 34× curto. Três consequências:
//       1. o handoff no ENTER é obrigação, não gosto — e quem obriga é
//          a própria PSF (o crescimento é log), não o driver;
//       2. o teto de 256 px tem ~12× de folga sobre o que a PSF entrega
//          hoje; ele só vira restrição se sigma/expoM0 mudarem muito —
//          por isso entra como PARÂMETRO declarado (piso conservador
//          comum em GLES/ANGLE), com a MEDIÇÃO real de driver anotada
//          como trabalho da Onda 7, e não como número medido;
//       3. e é por isso que o clarão do Sol de longe é um QUAD
//          (`heroStars.ts:209`, PlaneGeometry(2,2)) e não um ponto:
//          ponto nenhum daria conta do teto de 40° da lei do glare
//          (`heroStars.ts:220`). A camada que de fato emite
//          `gl_PointSize` é o campo de catálogo (`starShaders.ts:69`),
//          e é lá que o teto vira restrição quando a Onda 7 der disco
//          a outras estrelas.

/**
 * ENTER do gate, em radianos de RAIO ANGULAR. Derivado, não digitado:
 * ver (b) da conta acima. Se `WORLD.sunRadius` ou a janela do disco
 * mudarem, o limiar acompanha — a âncora é a RELAÇÃO, não o número.
 */
export const DISC_ENTER_RAD = WORLD.sunRadius / LOD_SOL.disc.fade0Pc;

/** EXIT do gate: metade do ENTER (cushion 2× do doador — (c) acima). */
export const DISC_EXIT_RAD = DISC_ENTER_RAD / 2;

/**
 * Raio angular aparente, em rad. Aproximação de ângulo pequeno
 * (θ = r/d), com as guardas defensivas do doador
 * (`stellarMeshGate.ts:101-114`): entrada não-finita, distância ≤ 0 ou
 * raio ≤ 0 devolvem 0 — nunca NaN, nunca negativo. Raio e distância na
 * MESMA unidade (na casa: pc).
 */
export function computeSolidAngle(radiusPc: number, distancePc: number): number {
  if (
    !Number.isFinite(radiusPc) ||
    !Number.isFinite(distancePc) ||
    distancePc <= 0 ||
    radiusPc <= 0
  ) {
    return 0;
  }
  return radiusPc / distancePc;
}

/**
 * A inversa: a que distância um corpo de raio `radiusPc` cobre
 * `solidAngleRad`. É o conversor que traduz limiar-em-rad de volta
 * para janela-em-pc por instância ((a) da conta). Mesmas guardas —
 * entrada inválida devolve 0 ("não definida"), nunca NaN/Infinity.
 */
export function distanceForSolidAngle(radiusPc: number, solidAngleRad: number): number {
  if (
    !Number.isFinite(radiusPc) ||
    !Number.isFinite(solidAngleRad) ||
    solidAngleRad <= 0 ||
    radiusPc <= 0
  ) {
    return 0;
  }
  return radiusPc / solidAngleRad;
}

/**
 * Histerese do handoff — CONTRATO verbatim do doador
 * (`stellarMeshGate.ts:117-139`), limiares da casa:
 * - partindo de INATIVO, entra só com `> ENTER` (estrito);
 * - partindo de ATIVO, fica ativo enquanto `>= EXIT` (só desativa
 *   abaixo);
 * - as fronteiras exatas são NO-OP deliberadamente (θ === ENTER não
 *   ativa; θ === EXIT não desativa) — evita bater-palma por igualdade
 *   de float;
 * - NaN PRESERVA o estado anterior, não flipa.
 * O cushion de 2× existe porque a câmera desta viagem não é estática:
 * o zoom inercial faz o valor tremer perto da fronteira, e sem folga o
 * disco nasceria/morreria a cada quadro.
 */
export function shouldDiscBeActive(wasActive: boolean, solidAngleRad: number): boolean {
  if (!Number.isFinite(solidAngleRad)) return wasActive;
  if (wasActive) {
    return solidAngleRad >= DISC_EXIT_RAD;
  }
  return solidAngleRad > DISC_ENTER_RAD;
}

// ------------------------------------------------------------
// 3b. O teto de gl_PointSize — a conta de (e), em função
// ------------------------------------------------------------

/**
 * Teto de `gl_PointSize` em px: PARÂMETRO DE PROJETO, não medição.
 * 256 é piso conservador (drivers GLES/ANGLE reais reportam de 63 a
 * 8192 em `ALIASED_POINT_SIZE_RANGE`). Medir o teto real do driver e
 * decidir se o shader ganha um clamp é trabalho da Onda 7 — hoje o
 * código não tem teto nenhum (risco 7 do mapa da casa).
 */
export const POINT_SIZE_CEILING_PX = 256;

/**
 * Raio projetado em px de um corpo de raio angular `solidAngleRad`,
 * numa tela de `screenH` px com `tanHalfFov = tan(fov/2)`.
 * px = θ · screenH / (2·tan(fov/2)) — ângulo pequeno.
 */
export function projectedRadiusPx(
  solidAngleRad: number,
  screenH: number,
  tanHalfFov: number
): number {
  if (
    !Number.isFinite(solidAngleRad) ||
    !Number.isFinite(screenH) ||
    !Number.isFinite(tanHalfFov) ||
    solidAngleRad <= 0 ||
    screenH <= 0 ||
    tanHalfFov <= 0
  ) {
    return 0;
  }
  return (solidAngleRad * screenH) / (2 * tanHalfFov);
}

/**
 * O maior raio angular que um sprite de PONTO ainda consegue cobrir
 * dado o teto: inversa de `projectedRadiusPx` com diâmetro = teto.
 * Se ENTER > este valor, o sprite já está grampeado quando o disco
 * entra — ver (e) da conta.
 */
export function maxSpriteSolidAngleRad(
  ceilingPx: number,
  screenH: number,
  tanHalfFov: number
): number {
  if (
    !Number.isFinite(ceilingPx) ||
    !Number.isFinite(screenH) ||
    !Number.isFinite(tanHalfFov) ||
    ceilingPx <= 0 ||
    screenH <= 0 ||
    tanHalfFov <= 0
  ) {
    return 0;
  }
  return (ceilingPx * tanHalfFov) / screenH;
}

/**
 * Espelho em TS da conta de tamanho de `GLSL_STAR_PSF`
 * (`shaders/common.ts:300-313`). Nasceu na fase 1 só para a derivação
 * (d)/(e) e seu teste; desde a fase 3 ele é CAMINHO DE RUNTIME — a
 * política de dominância (seção 5) precisa saber, em JS, quantos px o
 * ponto do catálogo vai ocupar para decidir se o hero o domina.
 * Continua sendo espelho, não fonte: o valor que a GPU usa sai do
 * shader, e se a PSF mudar lá esta função e seus testes quebram — é o
 * ALARME. Devolve `size` (o `gl_PointSize` que o vertex emitiria), em px.
 */
export function psfPointSizePx(
  m: number,
  expoM0: number,
  sigmaPx: number,
  screenH: number
): number {
  const sigma = (sigmaPx * screenH) / 1080.0;
  const E = Math.pow(10.0, -0.4 * (m - expoM0));
  const peak = E / (6.2831853 * sigma * sigma);
  const rSat = peak > 1.0 ? sigma * Math.sqrt(2.0 * Math.log(peak)) : 0.0;
  return 2.0 * (2.2 * sigma + rSat);
}

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

/**
 * Espelho da linha INTEIRA que a fase 3 escreveu em `STAR_VERT`:
 * `mix(clamp(1.0 - aFade, 0.0, 1.0), 1.0, step(0.5, aFocus))`.
 * O ternário é mirror EXATO do `mix` porque o `step` só devolve 0 ou 1 e
 * `mix(a,b,0) === a`, `mix(a,b,1) === b` sem arredondamento. Em
 * (0, 0) devolve 1: a prova de que os dois atributos nascem inertes.
 */
export function spriteAttenuationWithFocus(fade: number, focus: number): number {
  return isFocusBypassActive(focus) ? 1 : spriteAttenuation(fade);
}

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
// (a integral da PSF É o fluxo, `starShaders.ts:86-92`) e o billboard do
// hero é artefato de olho/instrumento com ganho artístico
// (`heroStars.ts:62-68`). Somar as duas em "brilho" exigiria calibrar
// uma na outra — trabalho de tela, não de conta, e fica para a Onda 7.
// O tamanho na tela, esse, é a MESMA régua para as duas (px), é o que
// decide quem representa a estrela, e é medível dos dois lados sem
// constante livre nenhuma. É a régua que esta política usa.

/**
 * `tan(58°/2)` — a lente de referência do `uZoom` dos heroes
 * (`heroStars.ts:159`). Escrita com a MESMA associação de
 * `Math.tan(THREE.MathUtils.degToRad(58/2))` (`29 * (Math.PI/180)`, não
 * `(29*Math.PI)/180`): o `heroStars.ts` importa esta constante desde a
 * fase 3, e um ULP aqui é um ULP no tamanho do billboard na tela.
 */
export const HERO_ZOOM_TAN_REF = Math.tan(29 * (Math.PI / 180));

/**
 * Diâmetro em px do billboard de um hero — espelho da cadeia
 * `VERT` (`heroStars.ts:19-24`) + `uZoom` (`:159`):
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

/**
 * Magnitude aparente que o vertex do catálogo recalcula da posição da
 * câmera — espelho de `starShaders.ts:44`:
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
  /** `uSize` do billboard em pc (`heroStars.ts:128`) */
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
 * (`director.ts:893`) desligam o grupo inteiro, e aí o fade escrito é
 * `FADE_NEUTRAL`.
 */
export function heroCatalogFade(i: HeroFadeInputs): number {
  const dominance = heroDominanceFade(heroDominanceRatio(i));
  if (dominance <= 0) return FADE_NEUTRAL;
  return dominance * heroPresence(i.camDistPc, i.heroSizePc);
}

// ------------------------------------------------------------
// 5b. O CASAMENTO hero↔catálogo (a metade de IDENTIDADE da mesma
//     política: sem índice não há o que escrever)
// ------------------------------------------------------------
//
// O formato "sc1" NÃO carrega identidade: são 9 bytes por estrela —
// lon, lat, log10(d), logLum, B−V (`config.ts:147-179`) — e nenhum id.
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
    // a MESMA conta do gerador (`build-star-catalog.mjs:225,237`):
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
  return best;
}
