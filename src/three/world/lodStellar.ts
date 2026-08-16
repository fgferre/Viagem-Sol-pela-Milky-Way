// ============================================================
// lodStellar — o LOD estelar da casa num lugar só. PURO: importa uma
// constante de `escala.ts` (que também é puro — o selo o lê, e o selo
// não conhece three); zero three, zero DOM. Antes da F3 o import era
// `WORLD.sunRadius`, de `config.ts`; o raio do Sol mudou de casa junto
// com o cadastro que o declara.
//
// Três coisas moram aqui, com origens DIFERENTES e declaradas:
//
// 1. AS JANELAS DA CASA (verbatim, origem-casa). As rampas do crossfade
//    do Sol VIVIAM redigitadas em dois arquivos que não se importavam —
//    `novoSol.ts:85-86,333-335` (o disco) e
//    `heroStars.ts:224-225,236-237` (uGain e uCore do SunStar) —
//    ligadas só por COMENTÁRIO. Uma casa decimal movida de um lado e
//    nada denunciava. Aqui elas ficam juntas, com os MESMOS números e
//    a MESMA forma de conta; desde a fase 2 da Onda 3 os consumidores
//    IMPORTAM daqui, e um teste de pinagem (lodStellar.test.ts) impede
//    a redigitação de renascer.
//    Nota do plano: a matriz antiga chamava {0,14→0,30} e
//    {0,30→0,42} de janelas "dos heroes" — no código elas eram do SOL
//    visto de longe (a classe `SunStar`), não das 16 heroes. O código
//    real vence; a divergência fica registrada aqui. As janelas que
//    são MESMO das 16 heroes (nearFade e farFade, no FRAG de
//    `heroStars.ts`) entram na tabela `LOD_HERO`, seção 1b — elas
//    alimentam o fim da dupla-luz hero↔catálogo na fase 3 (decisão D2).
//    A F3 DA ONDA DO SOL REAL (2026-08-13) reduziu as quatro janelas do
//    Sol a UMA: com o Sol de raio físico não há disco inflado para
//    dissolver, e o que sobra é a entrega ponto↔clarão. Ver `LOD_SOL`.
//
// 2. `stepRampToward` — TRANSCRIÇÃO AUTORIZADA do doador atlas-orbital
//    (`src/components/canvas/hygMeshFadeRamp.ts`: 48 linhas medidas por
//    `wc -l`, as "47 linhas puras" da matriz mais a linha final — é
//    contagem, não conteúdo). A matriz do plano abre a exceção
//    nominalmente (doutrina de travessia, transcrição autorizada): linhas puras que
//    carregam a razão do clamp de dt junto — "é mais barato copiar com
//    o comentário do que redescobrir o bug".
//    Assinatura, corpo e TODOS os comentários vêm inteiros; só a
//    língua muda (a casa escreve em pt-BR). Onde o comentário do
//    doador cita o stack dele (R3F, Fast Refresh), o texto fica —
//    é o registro de onde o bug foi comprado — com a nota da casa ao lado.
//
// 3. O GATE POR ÂNGULO SÓLIDO — CONTRATO do doador
//    (`src/lib/stellarMeshGate.ts`), NÚMEROS da casa. A própria matriz
//    (doutrina de travessia) diz que os limiares NÃO se herdam: lá o
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
// FIAÇÃO: `heroStars.ts` (classe SunStar) consome `sunStarGain` — nos
// DOIS uniforms desde a F3, `uGain` e `uCore` —, e `planetas.ts` consome
// `deepPointGain`, que é o complemento exato dele. `stellarBody.ts`
// consumia `solWorldFade`/`isDiscGroupVisible` e deixou de consumir na
// F3: a atenuação do disco por distância morreu com o disco, e quem
// decide se o Sol é corpo passou a ser a régua do palco em `corpos.ts`.
// As duas janelas das 16 heroes genéricas (LOD_HERO) ficaram sem
// consumidor JS até a fase 3 da Onda 3, quando entraram na política de
// dominância como rede de segurança (`heroPresence`, seção 5).
//
// O QUE EMBARCA DORMENTE, e é declarado como o doador declarava o seu
// ("module ships dormant", `stellarMeshGate.ts:36-39`): as DUAS metades
// da cicatriz C4. (i) A rampa TEMPORAL (`stepRampToward`,
// `RAMP_DURATION_MS`, `resetRamp`) — já dito na seção 2: o crossfade do
// Sol é dirigido por DISTÂNCIA, e o mecanismo da rampa é o do foco por
// estrela, que chega na Onda 7. Desde a Onda 6/F2b ela TEM consumidor
// (a cessão suave da Terra). (ii) O GATE POR ÂNGULO SÓLIDO
// (`shouldDiscBeActive`, `computeSolidAngle`, `projectedRadiusPx`,
// `maxSpriteSolidAngleRad`): nenhum consumidor de runtime o importa.
//
// ── POR QUE ELE CONTINUA DORMINDO DEPOIS DA F3 (medido em 2026-08-13) ──
// A F2 chegou para lhe dar o primeiro consumidor e NÃO deu, por uma
// razão que só apareceu com a conta na mesa: o `DISC_ENTER_RAD` daqui e
// o `LIMIAR_DO_GATE_PX` do palco (`corpos.ts`) são o MESMO CONTRATO com
// limiares 53× distantes, e não duas escritas da mesma lei.
//   ENTER = 0,06875 rad de RAIO angular ⇒ 0,1375 rad de diâmetro ⇒
//   **212 px** de diâmetro na lente de 58° a 1713 px de altura.
//   A régua do palco entra em **4 px** de diâmetro.
// São perguntas diferentes: o ENTER perguntava "o disco INFLADO ainda é
// o assunto do quadro?" (a calibração artística do crossfade para o
// clarão do `SunStar`), e o palco pergunta "este corpo já é
// REPRESENTÁVEL como corpo?".
// A F3 NÃO O ACORDOU, e agora a razão é mais forte do que era: o disco
// inflado que calibrou o ENTER não existe mais, então o número que ele
// carrega ficou ÓRFÃO — é a memória de uma calibração cuja premissa
// morreu. Acordá-lo hoje seria fiar um limiar sem fonte. Ele fica de pé,
// testado e sem fio, como pendência NOMEADA da Onda 7 (corpo por
// estrela), e a primeira obrigação de quem o acordar é RE-DERIVAR o
// ENTER de um corpo real — a âncora artística que ele ainda usa está
// declarada como lápide, não como número vivo.
// ============================================================
import { RAIO_ARTISTICO_DO_SOL_PC } from '../escala';

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
   * A ENTREGA — desde a F3 a ÚNICA janela do Sol, e ela troca DUAS
   * representações de PONTO, não mais um disco por um clarão.
   *
   * O QUE MORREU AQUI, e por quê. Até a F3 esta tabela tinha quatro
   * janelas, e três delas existiam só porque o Sol da cena era 487.441×
   * maior que o Sol: `disc` {0,16→0,34} dissolvia o disco INFLADO ao se
   * afastar, `deep` {0,05→0,02} dissolvia o mesmo disco ao se
   * APROXIMAR (uma fotosfera de 2.269 UA engolfaria o sistema solar), e
   * `starGain`/`starCore` acendiam o clarão do `SunStar` na janela em
   * que o disco saía. Com o Sol de raio FÍSICO nenhuma delas tem o que
   * dissolver: quem decide se o Sol é desenhado como CORPO é a régua do
   * palco (4 px de diâmetro aparente, `corpos.ts`), a mesma que já
   * governa Terra e Lua, e ela não precisa de janela em parsec nenhuma.
   *
   * O QUE SOBROU é o único handoff que continua sendo real, e ele é
   * entre dois PONTOS:
   *   • ABAIXO de 0,02 pc quem desenha o Sol é o ponto fotométrico da
   *     camada dos dez corpos (`planetas.ts`, vértice 0) — o Sol como
   *     membro do sistema solar, com a fotometria da família;
   *   • ACIMA de 0,05 pc quem desenha o Sol é o clarão do `SunStar`
   *     (`heroStars.ts`) — o Sol como estrela do catálogo, com a
   *     magnitude viva `4,83 + 5·log10(d/10)`;
   *   • ENTRE os dois, esta janela faz os dois trocarem de lugar com
   *     soma constante.
   *
   * POR QUE EXATAMENTE {0,02; 0,05} e não outros dois números: 0,05 pc é
   * onde a camada dos dez corpos deixa de ser submetida
   * (`planetas.ts`, `LIMIAR_SISTEMA_SOLAR_PC`), então o ganho do ponto
   * TEM de chegar a zero exatamente ali — um centímetro além e a camada
   * some com o Sol ainda aceso, que é o pop que esta janela existe para
   * não deixar acontecer. O 0,02 é a outra ponta da mesma janela, e vem
   * herdado da Onda 4 pelo mesmo motivo de sempre: é a maior largura que
   * cabe sem tocar `ua500` (0,0024241 pc), a vista oficial mais próxima
   * da borda de baixo — 8,3× de folga.
   *
   * O BURACO QUE ELA FECHA, medido antes de existir: com as janelas
   * antigas, entre 0,05 e 0,14 pc NADA além do disco inventado desenhava
   * o Sol — o ponto tinha ganho 0 acima de 0,05 e o clarão tinha ganho 0
   * abaixo de 0,14. Tirar o disco sem juntar as duas janelas deixaria o
   * Sol INVISÍVEL por ~1,4 s do trecho mais olhado do produto (a faixa
   * cai em t≈20,2 s da hélice de 24 s, na abertura refilmada). Juntando,
   * o Sol nunca deixa de ter um dono.
   *
   * `startPc`/`widthPc`/`endPc` na convenção de `starGain` (a que
   * sobreviveu), e a escolha da FORMA tem consequência de bit: a rampa
   * divide pela LARGURA LITERAL (0,03), não pela subtração das bordas —
   * `0,05 − 0,02 = 0.030000000000000002` (≠ 0,03), enquanto
   * `0,02 + 0,03 = 0,05` fecha exato. É a subtração que mente. O
   * `deepPointGain` da Onda 4 dividia pela subtração; a fusão o passou
   * para a largura literal, e isso muda o último bit NO MEIO da janela.
   * Nenhuma vista oficial mora lá dentro (a mais próxima é `ua500`,
   * 8,3× abaixo da borda), então a mudança é declarada e não cobrada.
   */
  entrega: { startPc: 0.02, widthPc: 0.03, endPc: 0.05 },
} as const;

/**
 * O FIM DA ENTREGA em pc — acima dele o Sol é estrela e nada mais. Tem
 * nome próprio porque é o número que amarra esta tabela à camada dos dez
 * corpos: ele TEM de ser igual a `LIMIAR_SISTEMA_SOLAR_PC`
 * (`escala.ts`), e `lodStellar.test.ts` cobra a igualdade.
 *
 * NÃO É O MESMO SÍMBOLO, e a separação é a cirurgia da F3. Até ela,
 * `DEEP_LIMIAR_PC` respondia duas perguntas com uma constante só — "onde
 * o disco do Sol morre?" (LOD) e "onde começa a escala do sistema
 * solar?" (plano de corte, velocidade do voo livre, camada dos dez).
 * Enquanto dividissem o símbolo, mexer no LOD do Sol mexeria nas outras
 * três de graça. Agora o de LOD é este, livre para andar; o de escala é
 * o de `escala.ts`, CONGELADO com âncora escrita.
 */
export const LIMIAR_DA_ENTREGA_PC = LOD_SOL.entrega.endPc;

/**
 * O GANHO DA ESTRELA — `uGain` E `uCore` do `SunStar`. Forma EXATA da
 * que vivia inline em `SunStar.update` antes da fiação da fase 2 da
 * Onda 3 (Math.min/Math.max no clamp, divisão pela largura LITERAL,
 * depois smoothstep cúbico ASCENDENTE); o que a F3 mudou foi a JANELA,
 * de {0,14; 0,16; 0,30} para a entrega, e a FUSÃO com `sunStarCore`.
 *
 * POR QUE O NÚCLEO FUNDIU COM O GANHO. `sunStarCore` era uma segunda
 * rampa, {0,30; 0,12; 0,42}, e a razão escrita dela era o disco: "o
 * núcleo pontual (+ espinhos) só acende DEPOIS que o disco saiu de cena
 * — sobrepostos, o núcleo apertado imprime um ponto branco no meio do
 * disco e a coisa lê como retículo de mira". Sem disco não há o que
 * sobrepor, e manter as duas rampas custaria uma faixa de 0,05 a 0,30 pc
 * em que o Sol seria um borrão SEM ponto no meio — um Sol que não lê
 * como estrela justamente onde ele já é uma. Uma rampa só, e o Sol vira
 * estrela inteira de uma vez: núcleo, espinhos e halo na mesma medida.
 *
 * O piso `Math.max(camDist, 1e-4)` NÃO migra para cá: na primeira linha
 * de `SunStar.update` ele é do `d` inteiro, compartilhado com a lei de
 * magnitude (`5·log10(d/10)`, que estoura em d=0) — é guarda do
 * chamador, não da rampa.
 */
export function sunStarGain(dPc: number): number {
  const k = Math.min(1, Math.max(0, (dPc - LOD_SOL.entrega.startPc) / LOD_SOL.entrega.widthPc));
  return k * k * (3 - 2 * k);
}

/**
 * O COMPLEMENTO EXATO do ganho da estrela: o alpha do Sol-ponto da
 * camada dos dez corpos. 1 para d ≤ 0,02 (perto, o ponto é o Sol
 * inteiro), 0 para d ≥ 0,05 (longe, quem desenha o Sol é o clarão).
 *
 * ESCRITO COMO `1 −` E NÃO COMO UMA SEGUNDA RAMPA, e isso é a lição da
 * Onda 3 aplicada de novo (as três rampas que viviam redigitadas em dois
 * arquivos que não se importavam): duas rampas espelhadas são duas
 * chances de mover uma casa decimal de um lado só. Com esta forma a
 * complementaridade não é convenção, é aritmética — `sunStarGain(d) +
 * deepPointGain(d) === 1` para todo d finito, EXATO: nas bordas os
 * clamps devolvem os literais (0+1 e 1+0), e no meio, com `a` na cúbica
 * e `b = fl(1 − a)`, o erro de arredondamento de `b` é ≤ 2⁻⁵⁴ (porque
 * 1 − a ∈ (0,1)), e 1 ± 2⁻⁵⁴ arredonda de volta para 1 exato. Pinado por
 * varredura no teste.
 *
 * É essa soma constante que faz o crossfade não ter degrau de luz: o que
 * um lado larga o outro pega no mesmo quadro.
 */
export function deepPointGain(dPc: number): number {
  return 1 - sunStarGain(dPc);
}

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
// (b) A ÂNCORA DA CASA — E ELA É UMA LÁPIDE DESDE A F3. Quando esta
//     conta foi escrita, o Sol tinha r = 0,011 pc (raio artístico) e o
//     disco estava PLENO até DISC_FADE0 = 0,16 pc. Hoje o Sol tem raio
//     físico e a janela do disco não existe mais: os dois números
//     abaixo são MEMÓRIA de uma calibração cuja premissa morreu, e
//     estão aqui para o ENTER continuar TESTÁVEL, não para ele
//     continuar CERTO. Ver o aviso no topo do arquivo — quem acordar o
//     gate re-deriva o ENTER de um corpo real antes de fiá-lo.
//     Traduzindo a janela morta para ângulo:
//         θ_handoff = 0,011 / 0,16 = 6,875e-2 rad  →  é o ENTER.
//     Ou seja: "o disco é o assunto enquanto o corpo cobre mais de
//     ~0,0687 rad de raio angular" — a mesma frase que a casa já
//     escreveu em pc, agora dita numa unidade que serve a QUALQUER
//     instância (o que a Onda 7 precisa e a janela em pc não dá).
//
// (c) O CUSHION 2× (contrato do doador, `stellarMeshGate.ts:51,62-67`).
//     EXIT = ENTER/2 = 3,4375e-2 rad. Em distância isso é
//     d_exit = r/EXIT = 2·DISC_FADE0 = 0,32 pc — exato, por
//     construção. CONFERÊNCIA INDEPENDENTE (feita quando o disco ainda
//     existia): a casa apagava o grupo do Sol quando `isDiscGroupVisible`
//     falhava (`stellarBody.ts:480`), e resolvendo
//     a rampa isso caía em d = 0,32487 pc. O cushion de 2× do doador
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
//     fechado do regime do Sol (26°, `cinematic/journey.ts:251,262`):
//         θ_teto = 256 · tan(13°) / 1080 ≈ 5,47e-2 rad  <  ENTER.
//     SÓ QUE O TETO DO DRIVER NEM CHEGA A MANDAR. Com os parâmetros
//     REAIS da PSF da casa (uSigmaPx 0,85, uExpoM0 3,5, uScreenH 1080
//     — os defaults de `StarFieldOptions` e as uniforms do material em
//     `stars.ts`), `size` satura em ~21,9 px numa magnitude absurda de
//     −60, e vale 9,4 px para o Sol na PRÓPRIA distância do handoff
//     (m = −4,15 pela lei de magnitude de `SunStar.update`). No mesmo
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
//          (`PlaneGeometry(2, 2)` no construtor de `SunStar`) e não um
//          ponto: ponto nenhum daria conta do teto de 40° da lei do
//          glare (`Math.min(40, ...)` em `SunStar.update`). A camada
//          que de fato emite `gl_PointSize` é o campo de catálogo (a
//          última linha do `STAR_VERT`, `starShaders.ts`), e é lá que o
//          teto vira restrição quando a Onda 7 der disco a outras
//          estrelas.

/**
 * A LÁPIDE DA JANELA DO DISCO: 0,16 pc era `LOD_SOL.disc.fade0Pc`, o
 * ponto até onde o disco INFLADO do Sol era o assunto do quadro. A
 * janela morreu na F3 com o disco; o número fica aqui, e só aqui,
 * porque o `DISC_ENTER_RAD` dormente é derivado dele. Nada novo pode se
 * ancorar neste valor.
 */
const DISC_FADE0_ARTISTICO_PC = 0.16;

/**
 * ENTER do gate, em radianos de RAIO ANGULAR. Derivado, não digitado:
 * ver (b) da conta acima. Os dois termos são LÁPIDES desde a F3 — o
 * raio artístico do Sol e a janela morta do disco —, e é de propósito
 * que ele continua saindo da RELAÇÃO entre eles em vez de virar um
 * 0,06875 digitado: assim o número que a Onda 7 vai ter de re-derivar
 * carrega, no próprio código, de onde veio e por que não vale mais.
 */
export const DISC_ENTER_RAD = RAIO_ARTISTICO_DO_SOL_PC / DISC_FADE0_ARTISTICO_PC;

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

/**
 * A VOLTA de `heroSizePx`: o `uSize` em pc que faz o billboard medir
 * `diametroPx` de aresta na tela DESTE quadro. Mesma cadeia, resolvida
 * para o outro lado —
 *     sizePc = px · camDistPc · tanHalfFov / (zoom · screenH),
 * com o MESMO `zoom = min(1, tanHalfFov/tan(29°))` do VERT (e por isso a
 * lente continua se cancelando enquanto for igual ou mais fechada que a
 * de referência: quem pede px fixo recebe px fixo).
 *
 * POR QUE ELA EXISTE. Até 15/08 o único jeito de dizer "este clarão tem
 * de medir N pixels" era escolher um ÂNGULO e torcer — foi assim que
 * nasceu a lei de autor do `SunStar` (`1,75°·10^(−0,3m)`, com teto de
 * 40° de céu), e o teto virou o defeito do item 42: entre 4,1 e 27,7 mil
 * UA o ângulo fica GRAMPEADO em 40°, ou seja o clarão ocupa exatamente a
 * mesma fração da tela enquanto o Sol encolhe 6,7×. Medido na tela do
 * gate (1713 px): 2.593 px de aresta, o MESMO número a 10.800 e a 15.800
 * UA. Com esta inversa o tamanho passa a ser pedido em PIXELS, e quem os
 * fornece é a lei do campo estelar (`psfPointSizePx`) — a mesma que
 * desenha o ponto que o clarão substitui.
 *
 * IDA E VOLTA: `heroSizePx(heroSizePcDePx(px, …), …) === px` a menos de
 * ~2 ULP (metade dos casos sai bit a bit; a outra metade erra 5e-16
 * relativos, que é o preço de duas multiplicações e duas divisões em
 * ordens diferentes). O teste cobra a igualdade RELATIVA, não o bit —
 * afirmar bit aqui seria afirmar o que a aritmética não dá.
 *
 * GUARDAS iguais às da ida: entrada não-finita ou não-positiva devolve 0,
 * que no consumidor é quad degenerado = "não desenha".
 */
export function heroSizePcDePx(
  diametroPx: number,
  camDistPc: number,
  screenH: number,
  tanHalfFov: number
): number {
  if (
    !Number.isFinite(diametroPx) ||
    !Number.isFinite(camDistPc) ||
    !Number.isFinite(screenH) ||
    !Number.isFinite(tanHalfFov) ||
    diametroPx <= 0 ||
    camDistPc <= 0 ||
    screenH <= 0 ||
    tanHalfFov <= 0
  ) {
    return 0;
  }
  const zoom = Math.min(1, tanHalfFov / HERO_ZOOM_TAN_REF);
  return (diametroPx * camDistPc * tanHalfFov) / (zoom * screenH);
}

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

/**
 * A MEIA-LARGURA da rampa do filtro solar, em LOG de razão: `ln 2,5`.
 * Não é número novo — é o MESMO `HERO_DOMINANCE.fullRatio` lido em outra
 * unidade, e é o que faz a borda de baixo valer `1/2,5 = 0,4` sem que
 * ninguém digite 0,4 em lugar nenhum.
 */
const MEIA_LARGURA_LOG_DO_FILTRO = Math.log(HERO_DOMINANCE.fullRatio);

/**
 * O ALVO DO FILTRO SOLAR — a MESMA pergunta de `heroDominanceFade` (o
 * disco domina o próprio clarão?), com a rampa esticada SIMETRICAMENTE
 * EM LOG ao redor do cruzamento de dominância: de `1/2,5 = 0,4` a `2,5`,
 * em vez de `1 → 2,5`. `1` ⇒ radiância verdadeira; `0` ⇒ a paleta H-alfa
 * autorada (o override da instância nº 1, `world/stellarBody.ts` §F2).
 *
 * POR QUE ESTICAR. A troca vale **26,09 magnitudes** — é a maior
 * transição de luz da casa —, e a rampa de `1 → 2,5` cobre só 2,57× em
 * distância. O voo de ida e volta de 15/08
 * (`scripts/visual/voo-ida-e-volta.mjs`, 34 degraus geométricos de
 * fator 1,468) mediu a consequência: entre DOIS degraus vizinhos,
 * 0,232 → 0,341 UA, o filtro pulava de 0,02 para 0,62 — 60% da troca num
 * degrau só, e a foto `capturas/VOO-IDA.png` mostra o laranja aparecendo
 * de uma vez. Com a rampa nova o mesmo par de degraus anda de 0,003 para
 * 0,139, e o MAIOR salto por degrau da travessia inteira cai de 0,60
 * para 0,30: a largura em log DOBRA, o salto por degrau cai pela metade.
 *
 * POR QUE SIMÉTRICA EM LOG e não "mais um pedaço para baixo". A razão é
 * um QUOCIENTE de dois tamanhos na tela — a régua natural dela é
 * multiplicativa, e `0,4` é `2,5` do outro lado do cruzamento, não um
 * segundo número. Como o disco vai com `1/d` e o halo cresce só com
 * `√log`, simetria em log de razão sai quase exatamente simétrica em log
 * de DISTÂNCIA: medido na tela do gate, a rampa vai de 1,446 UA a
 * 0,219 UA com o cruzamento em 0,562 UA — fator 2,57 de cada lado.
 * Esticar "para baixo" com um número livre custaria uma constante nova e
 * uma rampa torta; esticar em log não custa nenhuma das duas.
 *
 * POR QUE NÃO É A CURVA DA CESSÃO, embora leia a mesma razão. A cessão
 * do Sol-ponto (`heroDominanceFade`) arbitra DUPLA-LUZ: lá a borda de
 * baixo é `r = 1` por DEFINIÇÃO (é onde o billboard passa a ser maior que
 * o ponto) e a de cima é DERIVADA da prova de continuidade da Onda 3
 * (`hi ≥ 2,5`) — mexer nelas reabre o passo para trás na luz. O filtro
 * não arbitra dupla-luz nenhuma: ele troca a LEI DE EMISSÃO de uma
 * superfície só, e a única coisa que se exige dele é não ter degrau
 * visível. Duas exigências diferentes, duas rampas — e é por isso que
 * esta função existe em vez de um `1 −` em cima da outra.
 *
 * O QUE ELA CUSTA, declarado: a rampa agora ALCANÇA 1 UA (g = 0,901 lá,
 * ~2,6 das 26,09 magnitudes), então a vista `solreal1ua` muda de
 * propósito. Era esse o pedido — o defeito era a brusquidão, e o preço
 * de consertá-la é o degrau anterior deixar de ser branco puro.
 *
 * PROPRIEDADES (todas pinadas em teste):
 *  - razão ≤ 0,4 ⇒ 1 EXATO (o clamp do smoothstep devolve o literal);
 *  - razão ≥ 2,5 ⇒ 0 EXATO (`(L+L)/(2L)` é 1 sem arredondamento);
 *  - razão = 1 ⇒ 0,5 EXATO — o cruzamento é o MEIO da rampa, que é o que
 *    "simétrica" quer dizer (`L/(2L)` é 0,5 exato);
 *  - monotônica não-crescente e C¹ (smoothstep, e `log` é C¹ em (0,∞));
 *  - razão não-finita ou ≤ 0 ⇒ 1: halo inexistente não filtra nada, o
 *    mesmo precedente de `cessaoAlvo`.
 */
export function filtroSolarAlvo(razao: number): number {
  if (!Number.isFinite(razao) || razao <= 0) return 1;
  return (
    1 -
    glslSmoothstep(-MEIA_LARGURA_LOG_DO_FILTRO, MEIA_LARGURA_LOG_DO_FILTRO, Math.log(razao))
  );
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
