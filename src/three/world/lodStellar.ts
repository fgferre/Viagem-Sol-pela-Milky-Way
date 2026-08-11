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
// FIAÇÃO (fase 2 da Onda 3): `stellarBody.ts` consome `discWorldFade`
// e `isDiscGroupVisible`; `heroStars.ts` (classe SunStar) consome
// `sunStarGain` e `sunStarCore`. A troca saiu BIT-IDÊNTICA nas 15
// vistas do `ab-identidade` — as 7 fixas mais as 8 novas por distância
// (4 condições do Sol, 4 de hero) — porque as funções daqui repetem a
// expressão do consumidor operação por operação, na mesma ordem. As
// duas janelas das 16 heroes genéricas (LOD_HERO) seguem no GLSL do
// shader e ainda não têm consumidor JS: elas são da fase 3.
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
 * (`shaders/common.ts:300-313`) — existe SÓ para a derivação (d)/(e) e
 * seu teste. NÃO é caminho de runtime: o valor que a GPU usa sai do
 * shader. Se a PSF mudar lá, este espelho e o teste do teto quebram —
 * ele é o ALARME, não a fonte. Devolve `size` (o `gl_PointSize` que o
 * vertex emitiria), em px.
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
