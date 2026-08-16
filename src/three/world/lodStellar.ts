// ============================================================
// lodStellar — o que sobrou do LOD estelar da casa depois do M2 da
// LEI-DA-ESTRELA. PURO: zero three, zero DOM.
//
// O M1 (2026-08-16) demoliu daqui a metade do Sol: as janelas de
// entrega (`LOD_SOL`, `sunStarGain`, `deepPointGain`), o filtro solar
// por razão disco/halo (`filtroSolarAlvo`) e o gate dormente por ângulo
// sólido (`shouldDiscBeActive` e os órfãos do bloco). O M2 (2026-08-16)
// demoliu a outra metade: a POLÍTICA DE DOMINÂNCIA inteira — as janelas
// `LOD_HERO` (`heroNearFade`/`heroFarFade`/`heroPresence`), a razão de
// dominância (`heroSizePx`, `catalogApparentMag`, `HERO_DOMINANCE`,
// `heroDominanceFade`, `heroDominanceRatio`, `heroCatalogFade`,
// `fadesDoQuadro`, `DOMINANCE_DEFAULT_ON`, `HERO_ZOOM_TAN_REF`) e o
// casamento hero↔catálogo (`matchHeroesToCatalog`, `HERO_MATCH_REL_TOL`).
//
// Por que a política inteira pôde morrer: ela existia para desfazer a
// DUPLA-LUZ das 16 heroes de autor — dois desenhistas da mesma estrela
// na mesma posição, um cedendo ao outro por razão de tamanho. O clarão
// de asas (`world/clarao.ts`) não tem o problema por construção: é
// LENTE, soma óptica do raio do sprite PARA FORA, e o ponto do catálogo
// continua inteiro em toda distância. Sem dupla-luz, não há o que
// ceder; sem cessão, não há política. O canal `aFade` morreu junto
// (era o atuador dela); `aFocus` segue vivo — item 38, canal do M3/E3.
// Quem precisar da história: `git log -S heroDominanceFade`.
//
// O que continua morando aqui, com origens declaradas:
//
// 1. `stepRampToward` — TRANSCRIÇÃO AUTORIZADA do doador atlas-orbital
//    (`src/components/canvas/hygMeshFadeRamp.ts`: 48 linhas medidas por
//    `wc -l`). Linhas puras que carregam a razão do clamp de dt junto —
//    "é mais barato copiar com o comentário do que redescobrir o bug".
//    Assinatura, corpo e comentários vêm inteiros; só a língua muda.
//    Consumidores vivos: a cessão suave da Terra (Onda 6/F2b), as
//    rampas dos corpos resolvidos e a HISTERESE do orçamento do clarão
//    (`clarao.ts`, §5.21 — a rampa que impede o ranking de piscar).
//
// 2. O contrato C2/C3 da escrita por estrela (seção 4) — a parte pura
//    do canal `aFocus` que `stars.ts` liga ao three.
// ============================================================

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
// 1b. (As janelas das 16 heroes morreram no M2.)
// ------------------------------------------------------------
//
// Aqui moravam `LOD_HERO` ({0,5·uSize; 1,4·uSize} de perto, {320; 900} pc
// de longe), os espelhos `heroNearFade`/`heroFarFade`/`heroPresence` e o
// `glslSmoothstep` que só eles usavam. O clarão da lei não tem janela em
// pc NENHUMA: quem o acende e apaga é o fluxo (a asa afunda no limiar de
// visibilidade sozinha), e distância só entra pela magnitude — como em
// toda estrela.

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
 * [casa] Consumidor vivo desde o M2: a rampa de presença dos slots do
 * clarão de asas (`clarao.ts`) — a entrada e saída do orçamento andam
 * por aqui, nunca em degrau.
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
// 4. Cicatrizes C2/C3 como contrato puro (a parte que `stars.ts` liga
//    ao Three; aqui ela é testável sem GPU)
// ------------------------------------------------------------
//
// (Do par de canais da Onda 3 sobrou UM: `aFade` morreu no M2 com a
// política de dominância — não há mais quem ceda o ponto. `aFocus` é o
// canal DORMENTE do item 38: o buffer e a escrita vivem em `stars.ts`,
// a leitura volta ao shader no M3/E3, quando a esfera analítica apagar
// o ponto da estrela que ganha corpo.)

/** `aFocus` desligado — o canal fica inerte (D3). */
export const FOCUS_OFF = 0;
/** `aFocus` ligado — bypass de identidade (o corpo chega no M3/E3). */
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

/** O que uma estrela guarda no canal de foco (M2: só `focus` — o canal
 *  `fade` morreu com a política de dominância). */
export interface SlotWrites {
  focus: number;
}

/**
 * C3 — o que o cleanup grava na estrela que PERDE o foco: foco zerado,
 * para não ficar com bypass pendurado para sempre
 * (`HygStellarMesh.tsx:375-380`).
 */
export function clearFocus(): SlotWrites {
  return { focus: FOCUS_OFF };
}

/**
 * Magnitude aparente que o vertex do catálogo recalcula da posição da
 * câmera — espelho da linha `float m = ...` do `STAR_VERT`
 * (`starShaders.ts`):
 *   `m = -0.15 - 2.5*aLogLum + 5.0*(log2(max(dist,1e-3)) * 0.30103)`
 * O `log2 · 0,30103` fica como está (não vira `Math.log10`): é a conta
 * QUE A GPU FAZ, e o espelho existe para prever o pixel dela. A
 * igualdade com o shader é de curva e de número, não de bit — float32
 * lá, float64 aqui (achado A7 da fase 1). Sobreviveu ao M2 porque a
 * linha que ele espelha está VIVA (o campo continua recalculando m);
 * quem morreu foi a política que o consumia por quadro.
 */
export function catalogApparentMag(logLum: number, distPc: number): number {
  return -0.15 - 2.5 * logLum + 5.0 * (Math.log2(Math.max(distPc, 1e-3)) * 0.30103);
}

// ------------------------------------------------------------
// 5. A rampa de cessão por dominância CORPO↔PONTO — a única peça da
//    velha política que tem consumidor legítimo, com o nome do que ela
//    FAZ (a política hero↔catálogo morreu inteira no M2; esta curva
//    sobrevive porque a cessão do globo da Terra sobre o ponto
//    fotométrico é OUTRA troca — duas representações da MESMA fonte,
//    fluxo conservado — e a prova de continuidade vale igual).
// ------------------------------------------------------------

/** `smoothstep(edge0, edge1, x)` do GLSL, transcrito (clamp + cúbica). */
function glslSmoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * As bordas de `g`. A INFERIOR não é escolha: `r = 1` é a definição de
 * dominância (o corpo passa a ser maior que o halo do ponto).
 *
 * A SUPERIOR é DERIVADA da prova de continuidade, não de gosto. Com
 * `g = smoothstep(1, hi, r)`, a presença combinada na tela é
 *     P(d) = C(d)·(1 − g(r)) + H(d),  com H = r·C por definição de r,
 * e o máximo da derivada do smoothstep (`6t(1−t)`) é 1,5, logo
 *     max g′ = 1,5/(hi − 1) ≤ 1  ⟺  hi ≥ 2,5.
 * Na aproximação o corpo cresce com 1/d, mais rápido que o halo da PSF
 * (√log): **2,5 é a MENOR borda superior em que a luz combinada nunca
 * dá um passo para trás enquanto se chega perto**. Abaixo dela o ponto
 * cederia mais rápido do que o corpo cresce, e o par piscaria para
 * baixo no meio da aproximação.
 *
 * Bônus geométrico do mesmo número: em r = 2,5 o sprite INTEIRO do
 * ponto cabe dentro do RAIO do corpo com folga — o ponto virou, de
 * fato, um detalhe dentro do globo.
 */
export const DOMINANCIA_DO_CORPO = { entra: 1, plena: 2.5 } as const;

/**
 * `g(r)` — quanto o PONTO fotométrico cede a um corpo resolvido que
 * mede `r` vezes o halo dele na tela. Smoothstep cúbico, a mesma forma
 * de toda rampa da casa (C¹ nas duas bordas — sem degrau e sem quina).
 * `r ≤ 1` devolve 0 EXATO: enquanto o corpo não domina, o ponto fica
 * inteiro e as vistas de longe saem bit-idênticas.
 * Entrada não-finita devolve 0 — direção segura (ponto inteiro).
 */
export function cessaoPorDominancia(razao: number): number {
  if (!Number.isFinite(razao)) return 0;
  return glslSmoothstep(DOMINANCIA_DO_CORPO.entra, DOMINANCIA_DO_CORPO.plena, razao);
}
