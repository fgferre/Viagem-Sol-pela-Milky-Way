// ============================================================
// O RETÂNGULO ÚTIL do Atlas — o conhecimento de tela/HUD.
//
// Tudo aqui é layout: as frações que o CSS do HUD come de cada
// borda e a conta que as soma. Zero THREE, zero câmera — quem
// enquadra é ./enquadramento; quem liga à câmera é ./atlasRig.
//
// SÃO DOIS ARRANJOS DE HUD, e por isso duas contas: a MESA (a barra
// de controles em cima, o selo e a máquina do tempo embaixo) e o
// TELEFONE (item 62: a barra de cima com as trocas de modo, o selo
// numa linha logo abaixo dela desde 09/09 e a fileira de alças sozinha
// no pé). NENHUM DOS DOIS TEM
// TARJA — o telefone desde 23/08 (`SAIDA_FRACAO` e o `Math.max` que caiu
// no fim deste arquivo), a mesa desde o Lote 4 (07/09, PLAN-UI.md §0:
// "tarjas de cinema saem do Atlas; ficam no filme", decisão do dono). A
// fronteira entre os dois arranjos é
// `LARGURA_DO_CELULAR_PX`, o mesmo número que o `@media` do HUD usa
// e que o `useCelular` lê para decidir quem está no DOM — a câmera
// não pode recuar por um rodapé que o CSS já desmontou.
// ============================================================
import { LARGURA_DO_CELULAR_PX } from '../../lib/uiScale';

/**
 * A TARJA SAIU DA CONTA DE MESA NO LOTE 4 (07/09). Ela comia 6,5% da
 * altura em CADA borda (`.letterbox.on { height: 6.5vh }`, fatia 2 do
 * HUD) enquanto o Atlas a mantinha — o mesmo quadro do filme. Palavra do
 * dono no portão do §0: *"tarjas de cinema saem do Atlas; ficam no
 * filme"*. `HUD_POR_FASE.atlas.letterbox` virou `false` (`three/fases.ts`)
 * e as duas metades andam juntas — pintar sem descontar (ou o contrário)
 * recuaria a câmera por uma faixa que já não existe. NO TELEFONE NÃO
 * HAVIA TARJA desde 24/08 (decisão dele em 23/08, código no dia
 * seguinte); a mesa só agora alcança a mesma regra.
 */

/**
 * O que o HUD DO ATLAS come — sem tarja nenhuma, desde o Lote 4 — em
 * fração da altura, espelho dos números que o `hud.css` usa. Não são
 * chutes de folga: o juiz de a11y mede os retângulos REAIS dos elementos
 * no navegador e cobra que a declaração aqui os cubra
 * (`scripts/visual/a11y.mjs`, prova "o retângulo útil cobre o HUD do
 * Atlas"). Se a CSS crescer, o gate quebra antes de o alvo começar a ser
 * enquadrado por baixo do selo. Cada constante abaixo traz a MEDIÇÃO que
 * a justifica, com data — a disciplina desta casa: número aqui nasce de
 * `getBoundingClientRect`, nunca de aritmética de comentário.
 *
 * A UI SCALE DA F6 MEXE NESTES NÚMEROS, e a F6 respondeu assim: o
 * retângulo é produzido COM o fator (`retanguloUtilDoAtlas(fatorUi)`),
 * que multiplica as frações do HUD. É de propósito conservador —
 * parte do que cada fração cobre é âncora em `vh` (as peças começam em
 * `top: 8,5vh` / `bottom: 7,4vh`), que NÃO cresce com o texto, então
 * declarar tudo escalado sobra em vez de faltar. Sobrar custa um
 * recuo de câmera; faltar põe o alvo por baixo do selo. O juiz de a11y
 * mede os extremos da faixa (`escalaDaUi`) E os da LARGURA, e cobra
 * declarado ≥ medido em cada canto (ver `LARGURA_UTIL_MINIMA_PX`).
 */
/**
 * REMEDIDO NO LOTE 4 (07/09) — o topo cresceu por dois motivos de uma
 * vez: os botões da barra chegaram ao tamanho cheio do §2 item 2 (40 px,
 * ícone 16 + rótulo 13, contra os 0,58rem/9,3 px de antes) e a MARCA +
 * LINHA DE CONTEXTO (`.atlas-topo-esquerda`) nasceu ao lado — as duas
 * entraram na cobrança do juiz de a11y (`medirCobertura`, `pecas`).
 *
 * A JANELA TEM DUAS ALTURAS DE VERDADE, e a primeira rodada desta
 * medição esqueceu a segunda: o `a11y.mjs` mede a maior parte da grade
 * (768/1.000/1.200 × 1/1,25/1,4) com `Emulation.setDeviceMetricsOverride`
 * — altura EXATA de 900 px —, mas a prova do painel de Ajustes (linha
 * 1548, "com a linha da escada", que cobre `ui = 0,85`) roda na janela
 * NATURAL da sessão: 1.200×900 PEDIDOS ao Chrome viram 1.200×813 de
 * VIEWPORT — a moldura do navegador come o resto, mesmo headless. A
 * âncora `top: 8,5vh` do topo (e `bottom: 7,4vh` da base, ver
 * `TEMPO_FRACAO`) é fração da altura da JANELA, então a MESMA barra é
 * uma fração maior a 813 px do que a 900 — e a primeira versão desta
 * constante, medida só a 900, ficava ABAIXO do real bem no canto mais
 * comum de todos (texto de fábrica, sessão recém-aberta).
 *
 * MEDIDO (2026-09-07, `?atlas=1&shot=1`), o PIOR de três estados por
 * canto — sem seleção, com um PLANETA (Saturno, a barra ganha "ⓘ
 * Saturno") e com uma LUA (a linha de contexto ganha o quarto trecho,
 * "› Terra ›") —, nas duas alturas:
 *
 *   largura   altura  ui     topo medido (pior de sem/Saturno/Lua)
 *   1.200 px  813     0,85   12,89%
 *   1.200 px  900     0,85   12,47%  ← pior RAZÃO a 900 (÷0,85 = 14,67%)
 *   1.200 px  813     0,85   12,89%  ← pior RAZÃO a 813 (÷0,85 = 15,16%), governa CONTEXTO_FRACAO
 *   1.200 px  813     1,00   13,69%
 *   1.000 px  900     1,00   13,19%
 *   768 px    900     1,00   18,45%
 *   1.200 px  813     1,25   14,89%
 *   1.000 px  900     1,25   20,94%  (com Saturno)
 *   768 px    900     1,25   20,94%
 *   1.200 px  813     1,40   23,93%  (com Saturno)
 *   1.000 px  900     1,40   22,44%
 *   768 px    900     1,40   30,15%  (com Saturno) ← pior ABSOLUTO, governa BARRA_QUEBRADA_FRACAO
 *
 * `CONTEXTO_FRACAO` sai da pior RAZÃO medido/`ui` entre os cantos SEM
 * quebra, agora incluindo a janela de 813: 0,1289/0,85 = 0,1516 — 0,16
 * cobre com ~0,008 de folga por unidade de `ui`.
 *
 * A QUEBRA CRESCEU DE FENÔMENO: com os grupos e o filete (24 px de vão
 * entre eles) a barra quebra bem mais cedo do que antes, e o botão da
 * ficha (com seleção) a empurra ainda mais — a 768 px com Saturno e
 * `ui = 1,4` ela chega a TRÊS linhas. Declarar um degrau por estado
 * (sem seleção / planeta / lua) e por altura de janela exigiria remedir
 * cada combinação nos dois; o caminho mais simples e ainda seguro é
 * declarar UM degrau generoso o bastante para cobrir o PIOR já medido.
 * `LARGURA_DA_QUEBRA_PX` sai de 960 para 920: em `ui = 0,85` só ele
 * classifica 768 px como quebrado (768 < 920×0,85 = 782) — abaixo de 900
 * essa borda escapava pela fresta. Em troca, a 1.200/1.000 px com
 * `ui = 1,4` ele classifica "quebrado" um caso que às vezes não quebra
 * de verdade (920×1,4 = 1.288 > 1.200) — o lado seguro do erro, pago em
 * folga extra ali (ver o teste de FOLGA COM TETO). `BARRA_QUEBRADA_FRACAO`
 * sai de 0,04 para 0,083: o pior caso quebrado (768×1,40 com Saturno,
 * 30,15%, a 900 px de altura) pede `0,16×1,4 + B ≥ 0,3015` →
 * `B ≥ 0,0775` — 0,083 cobre com ~0,006.
 *
 * REMEDIDO DE NOVO NO CONSERTO 1 DO MESMO LOTE (07/09) — a barra sobe de
 * `top: 8,5vh` para `top: 1,5rem` na mesa do Atlas (§2 item 1: "topo +
 * base <= 22%"), então a conta acima fica velha. MEDIDO (`a11y.mjs`
 * depois do conserto), pior RAZAO medido/`ui` por canto SEM quebra:
 * 1.200x813,ui=1: 7,9%/1=7,90% (pior, governa); 1.200x813,ui=0,85:
 * 6,7%/0,85=7,88%; 1.200x900,ui=1: 7,1%; 1.000x900,ui=1: 7,1%;
 * 1.200x900,ui=1,25: 8,9%/1,25=7,12%. `CONTEXTO_FRACAO` = 0,079+0,01 =
 * 0,09.
 *
 * E o pior caso QUEBRADO (768 e 1.000 px a `ui = 1,4`, ambos 17,7%):
 * `0,09×1,4 + B ≥ 0,177` → `B ≥ 0,051` — `BARRA_QUEBRADA_FRACAO` = 0,065.
 */
const CONTEXTO_FRACAO = 0.09;
const LARGURA_DA_QUEBRA_PX = 920;
const BARRA_QUEBRADA_FRACAO = 0.065;
/**
 * REMEDIDO NO LOTE 4 (07/09) — o selo cresceu um pouco (chip com filete,
 * item 3) mas continua BEM abaixo da máquina do tempo (que também
 * cresceu, e mais): medido entre 9,7% e 11,0% de altura, contra
 * 19,1%–52,5% da máquina do tempo nas mesmas janelas. 0,12 cobre o pior
 * medido com folga; ele nunca é quem decide o `Math.max` com
 * `TEMPO_FRACAO` — fica registrado porque o próximo redesenho do selo
 * pode mudar essa conta.
 *
 * REMEDIDO DE NOVO NO CONSERTO 1 (07/09) — `--selo-base` cai de 7,4vh
 * para 1,5rem na mesa, então o selo (que ancora nele) mede bem menos:
 * pior razão medido/`ui` = 0,049/0,85 = 0,0576 (1.200x813, `ui = 0,85`).
 * `SELO_FRACAO` = 0,0576 + 0,01 = 0,07.
 */
const SELO_FRACAO = 0.07;

/**
 * O DEGRAU DA MÁQUINA DO TEMPO, REMEDIDO NO LOTE 4 (07/09) — os
 * controles chegaram ao alvo de 44 px e o texto ao piso de 12/18 px do
 * item 3 (eram 44/13 px sem reserva própria — o comentário antigo do
 * `04-atlas.css` dizia "o tamanho fica pequeno aqui... Lote 4"; esta é a
 * obra que paga essa dívida).
 *
 * A MESMA DUPLA ALTURA DE `CONTEXTO_FRACAO` vale aqui — a âncora
 * `bottom: 7,4vh` do rodapé também não encolhe com `ui`, e a sessão
 * NATURAL do Chrome (1.200×900 pedidos, 813 de viewport) entra na conta
 * ao lado da grade oficial (900 px exatos):
 *
 *   largura   altura  ui     base medida   linhas de `.atlas-tempo-botoes`
 *   1.200 px  900     0,85   19,13%        1 (sem degrau)
 *   1.200 px  813     0,85   20,38%        1 ← pior RAZÃO (÷0,85 = 23,98%), governa TEMPO_FRACAO
 *   1.200 px  813     1,00   22,60%        1
 *   1.000 px  900     1,00   29,51%        2
 *   768 px    900     0,85   26,28%        2
 *   768 px    900     1,00   31,32%        2
 *   1.200 px  813     1,25   37,88%        2
 *   1.000 px  900     1,25   37,36%        2
 *   1.200 px  813     1,40   44,42%        2 ← pior EM DUAS linhas da mesa LARGA, governa TEMPO_QUEBRADO_FRACAO
 *   1.000 px  900     1,40   40,84%        2
 *
 * (a medição do Lote 4 também tinha 768×900 a `ui` 1,25/1,40 em TRÊS
 * linhas — 45,02% e 52,48% — e uma `TEMPO_EM_TRES_LINHAS_FRACAO` própria.
 * As duas morreram no CONSERTO DO RODAPÉ DE MESA ESTREITA, 09/09 —
 * ver abaixo — e saem desta tabela e do arquivo.)
 *
 * `TEMPO_FRACAO` sai da pior RAZÃO sem degrau (1.200×813, ui=0,85:
 * 0,2038/0,85 = 0,2398) — 0,245 cobre com ~0,005 de folga por `ui`.
 *
 * `TEMPO_QUEBRADO_FRACAO` (a 2ª linha) sai do pior caso EM DUAS linhas
 * (1.200×813, ui=1,4): `0,245×1,4 + Q ≥ 0,4442` → `Q ≥ 0,1012` — 0,107
 * cobre com ~0,006.
 *
 * REMEDIDO DE NOVO NO CONSERTO 1 (07/09) — a data cai para 16 px e os
 * controles para 40 px na mesa (§2 item 1), e `--selo-base` cai junto
 * (ver `SELO_FRACAO`): a máquina do tempo mede bem menos. MEDIDO
 * (`a11y.mjs` depois do conserto), pior razão medido/`ui` SEM degrau =
 * 0,149/0,85 = 0,1753 (1.200x813, `ui = 0,85`). `TEMPO_FRACAO` =
 * 0,1753 + 0,01 = 0,19.
 *
 * Pior caso EM DUAS linhas da mesa LARGA (1.200x813, `ui = 1,4`, 36,5%):
 * `0,19×1,4 + Q ≥ 0,365` → `Q ≥ 0,099`.
 *
 * ---- O RODAPÉ NUMA FILEIRA EM QUALQUER MESA (09/09, decisão do dono:
 * "o telefone deitado continua com a interface da mesa; só o orçamento
 * de largura do rodapé muda"). O CSS dá ao `.atlas-rodape`
 * `max(46vw, min(63vw, 30rem))` (04-atlas.css) e o `rem` da raiz cresce
 * com `--ui`, então o teto de 30rem cresce junto. O conteúdo mede
 * 471,1 px a `ui = 1` (medido sem quebra) e cabe em 63vw a partir de
 * 471,1/0,63 = 747,8 px — o piso da mesa (761 px) já cabe; a `ui = 1` a
 * 2ª linha não existe em largura nenhuma de mesa. Bisseção no navegador
 * com texto grande: quebra entre 913 e 914 px a `ui = 1,25` e entre
 * 1.011 e 1.012 px a `ui = 1,4` (o texto cresce um pouco menos que
 * `ui`); 750×`ui` (937 e 1.050) cobre os dois pelo lado seguro, chamando
 * de "quebrado" um trecho curto que já é uma linha só — o mesmo preço
 * que `LARGURA_DA_QUEBRA_PX` paga na barra de cima, pelo mesmo motivo
 * (dois eixos, largura×`ui`, resumidos num limiar só). Não há mais
 * terceira linha nem limiar separado para a mesa larga.
 *
 * A FRAÇÃO da 2ª linha: o pior caso medido é 0,3726 (761/768 px,
 * `ui = 1,4`) e pede `0,19×1,4 + Q ≥ 0,3726` → `Q ≥ 0,1066`; o
 * `TEMPO_QUEBRADO_FRACAO` de sempre (0,11) cobre com 0,0034 de folga.
 */
const LARGURA_DA_QUEBRA_DO_TEMPO_PX = 750;
const TEMPO_QUEBRADO_FRACAO = 0.11;

/**
 * A LARGURA DE REFERÊNCIA — a tela de mesa em que as frações acima
 * foram medidas e em que o juiz de a11y roda. É o default do produtor:
 * quem o chama sem largura (o vitest da função pura) recebe o
 * enquadramento desta janela, e não um caso-limite silencioso.
 */
export const LARGURA_DE_MESA_PX = 1200;

/**
 * ATÉ ONDE A DECLARAÇÃO VALE, em largura de CSS — medido, não estimado.
 * De 768 px para cima o retângulo declarado cobre o HUD real em toda a
 * faixa de `?ui=` (0,85 a 1,4), com os dois degraus da máquina do tempo
 * acima. Era 900 até 2026-08-20, e o que baixou o número foi o item 9:
 * a linha dos controles passou a QUEBRAR em vez de ser pintada fora da
 * coluna, então o que ela ocupa virou altura declarável em vez de
 * transbordo invisível.
 *
 * ELE É O PISO DA FAIXA DE MESA, e desde 2026-08-23 há uma SEGUNDA faixa
 * declarada: até `LARGURA_DO_CELULAR_PX` (760) vale o ramo do telefone,
 * medido e cobrado nos mesmos termos (`julgarCelular`, parte 5). O que
 * sobra entre as duas — a fresta de 761 a 767 px — continua sendo
 * REGISTRO, e continua nomeada: ali o CSS ainda diz mesa (o `@media` é
 * `max-width: 760px`) mas a janela é estreita demais para a barra de
 * controles caber sem a quebra que a declaração de mesa paga. O juiz
 * imprime o número dessa fresta em vez de cobrá-lo.
 */
export const LARGURA_UTIL_MINIMA_PX = 768;

/**
 * A MÁQUINA DO TEMPO (F4), na BASE e à ESQUERDA — o canto oposto ao do
 * selo. Ela e o selo dividem a mesma faixa de baixo, e por isso o que
 * entra no retângulo é o MAIOR dos dois e não a soma: descontar as
 * duas alturas empurraria a câmera para trás por uma faixa que ninguém
 * ocupa inteira. O NÚMERO em si — e o degrau de quebra dela, que desde
 * 09/09 é DOIS limiares de largura (mesa estreita e mesa larga, cada
 * uma com o CSS e a conta próprios) — está declarado e medido de novo
 * junto de `LARGURA_DA_QUEBRA_DO_TEMPO_PX`, no alto deste arquivo: sem
 * tarja nenhuma na conta de mesa, e com os controles no tamanho cheio do
 * item 3, é ela — e não mais o selo — quem sempre decide o `Math.max`.
 * REMEDIDO DE NOVO NO CONSERTO 1 (07/09): 0,19 — a conta está no
 * comentário de `LARGURA_DA_QUEBRA_DO_TEMPO_PX`, junto dos dois limiares.
 */
const TEMPO_FRACAO = 0.19;

/**
 * ---- O TELEFONE (item 62, etapa 2) ---------------------------------
 *
 * ABAIXO DE 761 px O HUD É OUTRO: a fatia 9 do HUD desfaz a barra de
 * controles (sobra uma linha só, no alto, com o CONTEXTO desde o Lote 4),
 * tira a máquina do tempo do rodapé (vira a alça ⏱), põe as portas numa
 * GRADE de alças no pé (Lote 4, item 7) e reduz o selo a um chip de uma
 * linha logo abaixo da barra de cima (item C1, relatório de UI de 09/09
 * — até então ele morava numa linha acima da fileira). AS TRÊS FRAÇÕES
 * SÃO MEDIDAS, uma a uma, pelo juiz de a11y (`julgarCelular`, parte 5)
 * nos SEIS cantos da faixa — 390×844 e 320×568, com `?ui=` 0,85, 1 e
 * 1,4 —, e ele cobra declarado ≥ medido em cada um; a medição de cada
 * constante está no comentário dela, abaixo.
 */

/**
 * NÃO HÁ TARJA NO TELEFONE desde 2026-08-23, e é decisão do DONO, não de
 * enquadramento: *"no celular a imagem ocupa a tela inteira"*. Ela media
 * 4,5vh de cada borda (contra os 6,5vh da mesa) e custava 9% da tela; a
 * fatia 6 do HUD agora a tira do documento (`.letterbox { display: none }`
 * dentro do `@media`), e este ramo parou de descontá-la. As duas metades
 * andaram no mesmo diff de propósito — tirar a pintura sem tirar o
 * desconto deixaria a câmera recuando por uma faixa que já não existe.
 *
 * NA MESA A TARJA TAMBÉM SAIU, no Lote 4 (07/09) — ver o comentário de
 * `LETTERBOX_FRACAO` (que morreu junto com o uso) no alto do arquivo.
 */

/**
 * A BARRA DE CIMA DO TELEFONE, medida do TOPO DA JANELA até a base dela.
 * Ela é a única peça permanente do alto do modo (`.controls-bar` ancorada
 * em `top: 0.4vh`, fatia 9) e carrega hoje o CONTEXTO (item 6, Lote 4 —
 * sem marca, a linha inteira é a única do topo) e os chips ▶ Filme ·
 * ⇗ Voo livre, mais ↩ Retomar quando há filme guardado.
 *
 * REMEDIDO NO LOTE 4 (07/09): a linha cresceu de 2,75rem (44 px já era o
 * alvo antes) para o mesmo alvo, MEDIDO DE NOVO porque o `.hud-btn`
 * dentro dela cresceu (item 2, 40 px de base) e um `min-height: 2,75rem`
 * próprio do topo do celular (`09-celular.css`) passou a mandar por
 * cima. MEDIDO (Chrome com `mobile: true`, `?atlas=1&shot=1`), em fração
 * da altura da janela, NORMALIZADO por `ui` (a âncora de 0,4vh não
 * escala com o texto, então o pior caso é o `ui` MENOR):
 *
 *   390, 0,85 → 0,0483 / 0,85 = 0,0568
 *   390, 1,00 → 0,0561
 *   390, 1,40 → 0,0981 / 1,40 = 0,0701
 *   320, 0,85 → 0,0698 / 0,85 = 0,0821   ← o pior
 *   320, 1,00 → 0,0815
 *   320, 1,40 → 0,1124 / 1,40 = 0,0803
 *
 * 0,085 cobre o pior (0,0821) com ~0,003 de folga por unidade de `ui`.
 * O contexto (texto que muda de tamanho com o alvo) NÃO cresce a linha:
 * ele trunca com `ellipsis` dentro da própria caixa (`.atlas-contexto`,
 * `04-atlas.css`) em vez de quebrar — por isso a medição acima, feita
 * sem seleção, vale igual com um alvo focado.
 *
 * REMEDIDO NO CONSERTO 2 (07/09, PLAN-UI.md §2 item 1: "o CÉU a 320×568
 * <70%") — a linha cai de 44 para 40 px. MEDIDO (`a11y.mjs`), pior razão
 * medido/`ui` = 0,064/0,85 = 0,0753 (320, `ui = 0,85`). `SAIDA_FRACAO`
 * = 0,0753 + 0,01 = 0,086.
 */
const SAIDA_FRACAO = 0.086;

/**
 * A FILEIRA DE ALÇAS, que é a base de verdade do telefone. Ela é `fixed`
 * no pé e é a ÚNICA peça permanente de lá desde que a tarja de baixo saiu.
 *
 * REMEDIDO NO LOTE 4 (07/09, item 7 — regra de encaixe do portão 2): a
 * fileira virou GRADE de 5 colunas com ícone sobre rótulo (empilhados),
 * e `--alcas-altura` subiu de 3,6rem para 4rem (o próprio item 7 já
 * declarava o número novo — o par ícone/rótulo empilhado não cabia mais
 * nos 2,75rem de alvo de toque sozinho, que agora é a ALTURA da alça
 * inteira, não uma medida isolada dentro dela). MEDIDO (Chrome com
 * `mobile: true`, `?atlas=1&shot=1`), a caixa da fileira:
 *
 *   390, 0,85 → 0,0644 / 0,85 = 0,0758
 *   390, 1,00 → 0,0758
 *   390, 1,40 → 0,1062 / 1,40 = 0,0759
 *   320, 0,85 → 0,0958 / 0,85 = 0,1127   ← o pior
 *   320, 1,00 → 0,1127
 *   320, 1,40 → 0,1577 / 1,40 = 0,1126
 *
 * 0,115 cobre o pior (0,1127) com ~0,002 de folga.
 *
 * REMEDIDO NO CONSERTO 2 (07/09) — `--alcas-altura` cai de 4rem para
 * 3,5rem (56 px). MEDIDO (`a11y.mjs`), pior razão medido/`ui` = 0,099/1
 * = 0,099 (320, `ui = 1`; praticamente empatado com 0,85 e 1,4, já que
 * é `rem`). `ALCAS_FRACAO` = 0,099 + 0,01 = 0,11.
 */
const ALCAS_FRACAO = 0.11;

/**
 * O SELO, que no telefone MUDOU DE CANTO (item C1, relatório de UI de
 * 09/09): ele saiu do PÉ da tela — onde entrava em `base`, uma linha
 * acima da fileira — e desceu para logo abaixo da BARRA DE CIMA
 * (`top: calc(var(--barra-fim) + 0.5rem)`, `09-celular.css`), como um
 * chip de uma linha só, âncorado na barra que `App.tsx` mede ao vivo.
 * O que ele come agora é TOPO, não mais base: soma-se a `SAIDA_FRACAO`
 * — que já cobre a barra sozinha —, e este campo é só o que o chip
 * ACRESCENTA por cima dela (o vão de 0,5rem mais a caixa do chip, do
 * fim da barra até o fim do chip). Com o selo fora do rodapé,
 * `--selo-base` (CSS) deixou de somar a caixa dele: a fileira volta a
 * ser sozinha na base, e é por isso que `ALCAS_FRACAO` sozinho passa a
 * governar `base` no ramo do telefone (ver `retanguloUtilDoAtlas`).
 *
 * MEDIDO (2026-09-09, Chrome headless com `mobile: true`,
 * `?atlas=1&ui=…&shot=1`), `(selo.bottom − barra.bottom) / altura da
 * janela`, nos SEIS cantos da faixa:
 *
 *   390, 0,85 → 0,0293 / 0,85 = 0,0345
 *   390, 1,00 → 0,0317
 *   390, 1,40 → 0,0402 / 1,40 = 0,0287
 *   320, 0,85 → 0,0438 / 0,85 = 0,0515   ← o pior
 *   320, 1,00 → 0,0472
 *   320, 1,40 → 0,0600 / 1,40 = 0,0429
 *
 * AO CONTRÁRIO DA MEDIÇÃO ANTERIOR ("ui-invariante por ser rem"), a
 * razão aqui NÃO é constante: o vão e a caixa do chip escalam com o
 * texto, mas a barra por cima deles escala um pouco mais rápido — o
 * pior canto é o `ui` MENOR, a mesma lei de `SAIDA_FRACAO` e
 * `ALCAS_FRACAO`. `SELO_FRACAO_CELULAR` sai da pior RAZÃO (320,
 * ui = 0,85): 0,0515 + 0,01 = 0,0615 — 0,065 cobre com ~0,0035 de
 * folga por unidade de `ui`.
 */
const SELO_FRACAO_CELULAR = 0.065;

/**
 * A DICA DOS GESTOS NÃO ENTRA NA BASE DO TELEFONE, e é decisão declarada
 * do item 62 — a mesma que a tirou do fluxo. Ela é a única peça do HUD
 * que se apaga sozinha (`.free-hint.apagada`, no primeiro arrasto) e que
 * cede à folha por opacidade quando um painel abre: o retângulo útil
 * desconta área PERMANENTE, e ela é o oposto disso. Na MESA ela conta
 * porque está NO FLUXO — a caixa fica, só a tinta some.
 *
 * O preço é declarado e medido: enquanto ela está na tela, ocupa 0,1533
 * da altura a 390×844 e 0,3689 a 320×568 com `ui = 1,4`. Declará-la
 * levaria a base a 0,264 por unidade de `ui` e devolveria o céu a 66,6%
 * — abaixo da meta de 70% —, ou seja, pagaríamos o quadro inteiro por
 * uma linha de ensino que some no primeiro gesto. O juiz de a11y IMPRIME
 * o número dela em todos os seis cantos, como registro: o que não é
 * cobrado não fica invisível.
 */

/**
 * O que o HUD come do quadro, em FRAÇÃO de cada borda. Um só produtor
 * publicado (`retanguloUtilDoAtlas`) — o Atlas não é letterboxed por
 * conta própria, ele desconta as áreas REAIS do HUD dele.
 */
export interface RetanguloUtil {
  esquerda: number;
  direita: number;
  topo: number;
  base: number;
}

/** Quadro inteiro — nenhuma borda comida. */
export const RETANGULO_CHEIO: RetanguloUtil = {
  esquerda: 0,
  direita: 0,
  topo: 0,
  base: 0,
};

/**
 * A RESERVA DA FICHA (Lote 3, PLAN-UI.md §6, item 225) — a ÚNICA gaveta
 * que entra no retângulo útil, e só enquanto está aberta: ela é o
 * painel DO ALVO (nasce com a seleção), não um painel qualquer que o
 * visitante abriu por um instante. `base` cobre a folha do celular
 * (âncora no pé); `direita` cobre o painel da mesa (âncora na direita).
 * As duas em FRAÇÃO da tela, na mesma unidade do resto de
 * `RetanguloUtil` — quem converte pixel medido em fração é o
 * `Director` (`reservarParaAFicha`), nunca esta função.
 */
export interface ReservaDaFicha {
  base: number;
  direita: number;
}

/**
 * A LARGURA DA RÉGUA DE ABAS (Lote 4½, PLAN-UI.md) — 56 px em `ui = 1`,
 * o mesmo número que `.atlas-regua` declara em `04-atlas.css`
 * (`width: 3.5rem`). AO CONTRÁRIO das frações acima (medidas pelo juiz
 * de a11y, com folga sobre o pior caso), esta não é uma leitura: régua
 * e retângulo útil concordam por CONSTRUÇÃO, os dois lendo o mesmo
 * número — a folga é 0, a régua é exatamente 3,5rem. É chrome
 * PERMANENTE do Atlas de mesa (existe com ou sem painel aberto), por
 * isso entra direto na conta de `direita` da mesa, ANTES de
 * `reservaDireita` (a ficha, transitória, que se soma por cima). O
 * juiz de a11y é quem mede — outro trabalhador roda essa prova.
 */
const REGUA_LARGURA_PX = 56;

/**
 * O ÚNICO produtor do retângulo útil do Atlas — tarjas de cinema mais
 * as áreas REAIS do HUD do modo (F2). A conta não se repete dentro de
 * componente nenhum: quem enquadra pergunta aqui.
 *
 * As duas áreas do HUD entram no eixo VERTICAL e não no horizontal
 * mesmo estando encostadas nas laterais (a barra em cima, o selo em
 * baixo à direita): o retângulo é um recorte retangular do quadro, e
 * descontar meia largura por causa de uma faixa que ocupa 7% da altura
 * empurraria a câmera para trás sem necessidade. Descontar a FAIXA
 * inteira é o corte honesto — é o que garante que nada do alvo caia
 * atrás do texto. As CINCO GAVETAS não entram nesta conta: o retângulo
 * útil desconta área PERMANENTE, nunca painel que o visitante abriu por
 * um instante.
 *
 * `fatorUi` é a escala do texto do HUD (`?ui=`, F6). As tarjas não
 * escalam — são `vh` puro —; as faixas do HUD, sim.
 *
 * `larguraPx` é a largura de CSS da janela (o mesmo `vw` de que o
 * `max-width: 60vw` da barra de controles vive). Ela entra porque a
 * quebra da barra é fenômeno de largura×texto e não de texto sozinho —
 * ver `LARGURA_DA_QUEBRA_PX`.
 *
 * `extra` é a ÚNICA exceção à frase "as cinco gavetas não entram nesta
 * conta" — a ficha, e só ela (ver `ReservaDaFicha` acima). Soma-se nos
 * DOIS ramos (mesa e telefone), porque a fração já sai correta do lado
 * de quem mede (o `Director` só passa `direita` quando o painel existe
 * de mesa, só passa `base` quando a folha existe de celular). SEM
 * `extra` (ou com os dois campos a 0) o resultado é BIT A BIT o de
 * antes desta reserva: `+0` não muda nenhuma soma de ponto flutuante, e
 * é disso que as provas de `?foco` e os md5 do `atlas-smoke` dependem
 * (`retanguloDoAtlas.test.ts`, caso "sem extra"). Valor não finito ou
 * negativo — uma medição de DOM que falhasse antes do layout assentar —
 * vira 0 em vez de recuar a câmera por lixo.
 */
export function retanguloUtilDoAtlas(
  fatorUi = 1,
  larguraPx = LARGURA_DE_MESA_PX,
  extra?: ReservaDaFicha
): RetanguloUtil {
  const k = Number.isFinite(fatorUi) && fatorUi > 0 ? fatorUi : 1;
  const largura =
    Number.isFinite(larguraPx) && larguraPx > 0 ? larguraPx : LARGURA_DE_MESA_PX;
  const reservaBase = Number.isFinite(extra?.base) && extra!.base > 0 ? extra!.base : 0;
  const reservaDireita =
    Number.isFinite(extra?.direita) && extra!.direita > 0 ? extra!.direita : 0;
  // O TELEFONE É OUTRO HUD, não o de mesa apertado — ver o bloco das
  // três frações acima. Ele não tem tarja desde 24/08 (decisão dele em
  // 23/08, código no dia seguinte),
  // e por isso as duas bordas são só HUD: a barra mais o selo em cima
  // (o selo mudou de canto no item C1, 09/09 — ver `SELO_FRACAO_CELULAR`),
  // a fileira sozinha embaixo. O `Math.max` que segurava o piso da tarja
  // na base morreu com ela — sem uma faixa preta a cobrir, não há piso a
  // garantir, e um `max` contra zero é ruído que finge decidir algo.
  if (largura <= LARGURA_DO_CELULAR_PX) {
    return {
      esquerda: 0,
      direita: 0 + reservaDireita,
      topo: (SAIDA_FRACAO + SELO_FRACAO_CELULAR) * k,
      base: ALCAS_FRACAO * k + reservaBase,
    };
  }
  // SEM TARJA (Lote 4, 07/09) — o `LETTERBOX_FRACAO` que somava aqui nas
  // duas bordas morreu junto com a pintura: ver o comentário no alto do
  // arquivo. A ESQUERDA volta a ser só HUD, como no telefone — mas a
  // DIREITA não (Lote 4½): a régua de abas é chrome permanente do Atlas
  // de mesa, então `REGUA_LARGURA_PX` entra sempre, e é sobre ela que a
  // reserva transitória da ficha (`reservaDireita`) se soma.
  return {
    esquerda: 0,
    direita: (REGUA_LARGURA_PX * k) / largura + reservaDireita,
    topo:
      CONTEXTO_FRACAO * k +
      (largura < LARGURA_DA_QUEBRA_PX * k ? BARRA_QUEBRADA_FRACAO : 0),
    base:
      Math.max(SELO_FRACAO, TEMPO_FRACAO) * k +
      // a 2ª linha do rodapé entra quando a largura não a segura — um
      // limiar só por unidade de `ui` desde 09/09 (a derivação está em
      // `LARGURA_DA_QUEBRA_DO_TEMPO_PX`, no alto)
      (largura < LARGURA_DA_QUEBRA_DO_TEMPO_PX * k ? TEMPO_QUEBRADO_FRACAO : 0) +
      reservaBase,
  };
}
