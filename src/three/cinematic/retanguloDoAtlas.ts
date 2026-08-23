// ============================================================
// O RETÂNGULO ÚTIL do Atlas — o conhecimento de tela/HUD.
//
// Tudo aqui é layout: as frações que o CSS do HUD come de cada
// borda e a conta que as soma. Zero THREE, zero câmera — quem
// enquadra é ./enquadramento; quem liga à câmera é ./atlasRig.
//
// SÃO DOIS ARRANJOS DE HUD, e por isso duas contas: a MESA (a barra
// de controles em cima, o selo e a máquina do tempo embaixo) e o
// TELEFONE (item 62: o "Partir" dentro da tarja, a fileira de alças
// no pé e o selo numa linha em cima dela). A fronteira é
// `LARGURA_DO_CELULAR_PX`, o mesmo número que o `@media` do HUD usa
// e que o `useCelular` lê para decidir quem está no DOM — a câmera
// não pode recuar por um rodapé que o CSS já desmontou.
// ============================================================
import { LARGURA_DO_CELULAR_PX } from '../../lib/uiScale';

/**
 * As tarjas de cinema comem 6,5% da altura em CADA borda
 * (`.letterbox.on { height: 6.5vh }`, hud.css) e o Atlas as mantém —
 * é o mesmo quadro do filme. Fonte única do número para o retângulo
 * útil; se a tarja mudar no CSS, muda aqui. No TELEFONE a mesma tarja
 * mede 4,5vh (fatia 6 do HUD) — o número de lá é `LETTERBOX_CELULAR`.
 */
const LETTERBOX_FRACAO = 0.065;

/**
 * O que o HUD DO ATLAS come, além das tarjas, em fração da altura —
 * espelho dos números que o `hud.css` usa, na mesma disciplina do
 * `LETTERBOX_FRACAO`. Não são chutes de folga: o juiz de a11y mede os
 * retângulos REAIS dos dois elementos no navegador e cobra que a
 * declaração aqui os cubra (`scripts/visual/a11y.mjs`, prova "o
 * retângulo útil cobre o HUD do Atlas"). Se a CSS crescer, o gate
 * quebra antes de o alvo começar a ser enquadrado por baixo do selo.
 *
 * TOPO: era `.atlas-contexto` e `.controls-bar` na mesma linha (`top:
 * 8,5vh`) — medido 12,5% da altura a 1280×720, tarja incluída. Desde a F3 a
 * barra carrega o botão da busca e QUEBRA LINHA no texto grande: medido
 * 19,7% a 1200×900 com `?ui=1,4`, e já era ela, e não a linha de contexto,
 * quem dimensionava a faixa. Em 22/08 a linha de contexto virou o cabeçalho
 * da FICHA DO OBJETO (item 74) e saiu do topo: sobrou a barra sozinha, que
 * era quem mandava. `CONTEXTO_FRACAO` fica onde está de propósito — baixá-lo
 * moveria a CÂMERA de todas as vistas do Atlas, e essa é decisão de
 * enquadramento com foto para o dono, não efeito colateral de uma obra de
 * HUD. Enquanto isso a declaração sobra em vez de faltar, que é o lado
 * seguro do erro declarado logo abaixo.
 * BASE: `.atlas-selo`, ancorado em `bottom: 7,4vh`. Ele foi a peça mais
 * alta do modo enquanto eram quatro blocos de texto sempre abertos
 * (19,6% da altura com a tarja). O item 61 o dobrou numa LINHA em
 * 2026-08-22: medido no juiz de a11y, 9,4% a 1200×900 e 10,0% com
 * `?ui=1,4` — a gaveta que sobe dele é `absolute` e não entra na conta,
 * pelo mesmo critério que não conta diálogo aberto. `SELO_FRACAO` fica
 * em 0,14 porque quem dimensiona a base é o `Math.max` com
 * `TEMPO_FRACAO` (0,175), e baixá-lo não moveria a câmera um pixel:
 * seria trocar um número declarado com folga por outro, sem prova.
 *
 * As duas frações são de tela de mesa (medidas a 1280×720 e 1200×900),
 * e valem em `ui = 1`.
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
 * A FAIXA DO TOPO que a barra de controles ocupa, em fração da altura —
 * medida pelo juiz de a11y, que cobra declarado ≥ medido em toda a grade
 * largura×ui.
 */
const CONTEXTO_FRACAO = 0.09;

/**
 * O DEGRAU DA BARRA QUEBRADA — e ele é fenômeno de LARGURA, não de
 * `?ui=`. Com o botão da busca (F3) a barra de controles passa a QUEBRAR
 * LINHA quando o texto não cabe nos `max-width: 60vw` que o `hud.css`
 * lhe dá (o CSS prefere quebrar a invadir a linha de contexto —
 * garantia geométrica da F6). Ou seja: quem quebra é a razão entre o
 * TAMANHO DO TEXTO e a LARGURA da janela, e declarar o degrau só em
 * função de `?ui=` deixava metade do fenômeno de fora.
 *
 * MEDIDO (2026-08-12, `?atlas=1&shot=1`, viewport de 813 px de altura),
 * a menor largura de CSS em que a barra ainda NÃO quebra:
 *
 *   ui = 1,00 → entre 930 e 940 px      (razão 930–940)
 *   ui = 1,15 → entre 1.050 e 1.100 px  (razão 913–957)
 *   ui = 1,25 → entre 1.150 e 1.200 px  (razão 920–960)
 *   ui = 1,29 → entre 1.150 e 1.200 px  (razão 891–930)
 *   ui = 1,30 → já quebrada a 1.200 px  (`.controls-bar` 35,0 → 84,9 px
 *               entre 1,25 e 1,30 — o degrau é de 50 px, não uma rampa)
 *
 * A razão é constante dentro da medição: ~930–960 px de largura por
 * unidade de `ui`. `LARGURA_DA_QUEBRA_PX` fica no TOPO da faixa (960)
 * porque errar para cima declara o degrau CEDO — custa um recuo de
 * câmera — e errar para baixo põe o alvo atrás da barra.
 *
 * O que isto corrige, medido: o limiar anterior era `ui > 1,3` numa
 * janela só, e a quebra a 1.200 px começa EM 1,30 — a comparação
 * estrita deixava passar exatamente o degrau (declarado 0,163 contra
 * 0,189 medido). Na lei nova, a 1.200 px o degrau entra a partir de
 * `ui > 1,25`, e em janela estreita ele entra onde a quebra realmente
 * acontece.
 */
const LARGURA_DA_QUEBRA_PX = 960;
const BARRA_QUEBRADA_FRACAO = 0.04;
const SELO_FRACAO = 0.14;

/**
 * OS DOIS DEGRAUS DA MÁQUINA DO TEMPO — o fenômeno da barra de controles
 * repetido na BASE: largura×texto, não texto sozinho. Os seis controles
 * são pedidos em `rem` (crescem com `?ui=`) dentro de uma coluna em `vw`
 * (que não cresce), então a linha deles quebra em duas e depois em três.
 *
 * ATÉ 2026-08-20 havia UM degrau declarado (714 px por unidade de ui) e
 * o CSS não quebrava linha nenhuma acima da faixa estreita: o que não
 * cabia era PINTADO FORA da coluna, por cima do selo. A declaração
 * pagava por uma quebra que não acontecia, e a tela mostrava o "Época"
 * escrito em cima de "O QUE NESTA VISTA É AJUSTADO" (768 px, item 9).
 * Com a quebra de verdade no CSS (`.atlas-tempo-botoes`, fatia 4 do
 * HUD), os dois degraus passam a existir e são MEDIDOS, um a um.
 *
 * MEDIDO em 2026-08-20 (viewport exato por override, 900 px de altura,
 * `?atlas=1&shot=1`, macOS do dono):
 *
 *   1ª quebra (uma linha → duas): a 1.040 px ela já aconteceu, a 1.060
 *   ainda não — com `?ui=1`. Razão 1.040–1.060 px de largura por
 *   unidade de ui; o limiar fica no TOPO da faixa (1.060), que é o lado
 *   seguro do erro: declarar cedo custa um recuo de câmera, declarar
 *   tarde põe o alvo atrás da leitura do tempo. A 1.200 px com `ui = 1`
 *   ela NÃO acontece — é o que mantém a tela de mesa (e as vistas
 *   oficiais, que rodam a 1.800 px) exatamente onde estavam.
 *
 *   2ª quebra (duas linhas → três): entre 940 e 980 px com `?ui=1,4`
 *   (razão 671–700). O limiar de 714 que já morava aqui está no topo
 *   dessa faixa e continua valendo — o que mudou foi o que ele paga.
 *
 * AS FRAÇÕES saem da mesma medição, pela base MEDIDA menos as tarjas,
 * normalizada por ui: duas linhas custam 0,175–0,191 (o extremo é o
 * viewport mais BAIXO, 813 px, onde a mesma altura é fração maior) e o
 * `TEMPO_FRACAO` sozinho já declara 0,175 — daí 0,03, que cobre o
 * extremo com folga. Três linhas custam 0,229 a 900 px e 0,251 a 768,
 * e os 0,09 cobrem o pior com 0,013 de folga. Fontes de outra máquina
 * movem estas margens (o juiz roda no macOS do dono e na nuvem), que é
 * por que a declaração paga o degrau inteiro em vez de raspar o número
 * de uma máquina só.
 */
const LARGURA_DA_QUEBRA_DO_TEMPO_PX = 1060;
const TEMPO_QUEBRADO_FRACAO = 0.03;
const LARGURA_DA_TERCEIRA_LINHA_PX = 714;
const TEMPO_EM_TRES_LINHAS_FRACAO = 0.09;

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
 * ocupa inteira.
 *
 * MEDIDO pelo juiz de a11y a 1200×900: `.atlas-tempo` (leitura em
 * cima, seis controles embaixo, linha de aviso sempre montada) ocupa
 * 22,0% da altura contando a tarja — 15,5% além dela. Ela PASSOU A SER
 * a peça mais alta do modo: o selo mede 18,8% na mesma janela. 0,175
 * declara isso com folga de ~1,5% da altura para variação de fonte, e
 * é este número que o juiz confere contra o retângulo real.
 */
const TEMPO_FRACAO = 0.175;

/**
 * ---- O TELEFONE (item 62, etapa 2) ---------------------------------
 *
 * ABAIXO DE 761 px O HUD É OUTRO, e até 2026-08-23 a câmera não sabia:
 * a fatia 9 do HUD desfez a barra de controles (só o "Partir" ficou, e
 * DENTRO da tarja), tirou a máquina do tempo do rodapé (virou a alça ⏱),
 * pôs as portas numa fileira de alças no pé e reduziu o selo a uma linha
 * em cima dela — e o retângulo continuava descontando a base de MESA,
 * `Math.max(SELO_FRACAO, TEMPO_FRACAO)` mais os dois degraus da máquina
 * do tempo, que numa tela de 390 px disparam os dois. Ou seja: a câmera
 * recuava por um rodapé que o CSS já tinha desmontado. Medido a 390×844
 * com `ui = 1`: 44,5% de céu declarado contra 84,5% de HUD real fora do
 * caminho.
 *
 * AS QUATRO FRAÇÕES SÃO MEDIDAS, uma a uma, pelo juiz de a11y
 * (`julgarCelular`, parte 5) nos SEIS cantos da faixa nova — 390×844 e
 * 320×568, com `?ui=` 0,85, 1 e 1,4 —, e ele cobra declarado ≥ medido em
 * cada um. É a disciplina de `LARGURA_DA_QUEBRA_DO_TEMPO_PX`: número que
 * entra aqui nasce de uma leitura de `getBoundingClientRect`, nunca de
 * aritmética de comentário.
 *
 * MEDIDO em 2026-08-23 (Chrome com `mobile: true` e toque emulado,
 * `?atlas=1&q=cinema&shot=1`), em fração da altura da janela:
 *
 *              tarja   "Partir"      fileira    selo (linha + vão)
 *   390, 0,85  0,0450   0,0327       0,0580     0,0847 − 0,0580 = 0,0267
 *   390, 1,00  0,0450   0,0364       0,0682     0,0987 − 0,0682 = 0,0305
 *   390, 1,40  0,0450   0,0492       0,0955     0,1389 − 0,0955 = 0,0434
 *   320, 0,85  0,0450   0,0466       0,0862     0,1258 − 0,0862 = 0,0396
 *   320, 1,00  0,0450   0,0522       0,1014     0,1466 − 0,1014 = 0,0452
 *   320, 1,40  0,0450   0,0712       0,1419     0,2064 − 0,1419 = 0,0645
 *
 * NORMALIZADAS por `ui`, a fileira dá 0,0682 (390) e 0,1014 (320) em
 * TODOS os três degraus — ela é `rem` puro (`--alcas-altura: 3.6rem`), e
 * a diferença entre os dois aparelhos é só a altura da janela. O selo
 * acima dela dá 0,0314 (390) e 0,0466 (320). O aparelho PEQUENO manda,
 * porque a mesma peça em `rem` é fração maior numa tela mais baixa.
 */

/**
 * A TARJA NO TELEFONE — `.letterbox.on { height: 4.5vh }` na fatia 6,
 * contra os 6,5vh da mesa. Fonte única do número, como o
 * `LETTERBOX_FRACAO`: se a tarja mudar no CSS, muda aqui. (Tirá-las no
 * celular é a única pergunta de GOSTO que o item 62 deixou para o dono —
 * elas custam ~9% da tela e ficaram porque são "o mesmo quadro do
 * filme".)
 */
const LETTERBOX_CELULAR = 0.045;

/**
 * O "PARTIR", a única SAÍDA por ponteiro do modo, ancorado DENTRO da
 * tarja (`top: 0.4vh`). Ele quase não sobra da tarja — no aparelho comum
 * cabe inteiro nela —, mas num de 320 px com o texto grande transborda
 * 2,6% da altura. 0,025 cobre o pior caso medido (0,0712 contra 0,0450
 * de tarja, ou seja 0,0187 por unidade de `ui`) com 0,0088 de folga para
 * fonte de outra máquina — o juiz roda no macOS do dono e na nuvem.
 */
const SAIDA_FRACAO = 0.025;

/**
 * A FILEIRA DE ALÇAS, que é a base de verdade do telefone. Ela é `fixed`
 * no pé e ENGOLE a tarja de baixo, então não se soma nada a ela: 0,11
 * cobre o pior medido (0,1014 no aparelho pequeno) com 0,0086 de folga.
 * O alvo de toque dela — 2,75rem, 44 px em `ui = 1` — é o que a dimensiona,
 * e é ele que não se aperta (o commit anterior apertou LARGURA, nunca o
 * alvo).
 */
const ALCAS_FRACAO = 0.11;

/**
 * O SELO, que no telefone é UMA LINHA acima da fileira — `--selo-base`
 * soma `--alcas-altura` dentro de si (fatia 9), então o que entra aqui é
 * só o que ele acrescenta POR CIMA dela. 0,05 cobre o pior medido
 * (0,0466) com 0,0034 de folga. Nada do `SELO_FRACAO` de mesa (0,14)
 * atravessa: lá ele dividia a faixa com a máquina do tempo, e aqui a
 * máquina do tempo é uma alça.
 */
const SELO_FRACAO_CELULAR = 0.05;

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
 */
export function retanguloUtilDoAtlas(
  fatorUi = 1,
  larguraPx = LARGURA_DE_MESA_PX
): RetanguloUtil {
  const k = Number.isFinite(fatorUi) && fatorUi > 0 ? fatorUi : 1;
  const largura =
    Number.isFinite(larguraPx) && larguraPx > 0 ? larguraPx : LARGURA_DE_MESA_PX;
  // O TELEFONE É OUTRO HUD, não o de mesa apertado — ver o bloco das
  // quatro frações acima. O `Math.max` na base é o piso da tarja: a
  // fileira já a engole nos dois aparelhos medidos, e o `max` garante
  // que ela nunca fique de fora se o alvo de toque encolher um dia.
  if (largura <= LARGURA_DO_CELULAR_PX) {
    return {
      esquerda: 0,
      direita: 0,
      topo: LETTERBOX_CELULAR + SAIDA_FRACAO * k,
      base: Math.max(LETTERBOX_CELULAR, (ALCAS_FRACAO + SELO_FRACAO_CELULAR) * k),
    };
  }
  return {
    esquerda: 0,
    direita: 0,
    topo:
      LETTERBOX_FRACAO +
      CONTEXTO_FRACAO * k +
      (largura < LARGURA_DA_QUEBRA_PX * k ? BARRA_QUEBRADA_FRACAO : 0),
    base:
      LETTERBOX_FRACAO +
      Math.max(SELO_FRACAO, TEMPO_FRACAO) * k +
      (largura < LARGURA_DA_QUEBRA_DO_TEMPO_PX * k ? TEMPO_QUEBRADO_FRACAO : 0) +
      (largura < LARGURA_DA_TERCEIRA_LINHA_PX * k ? TEMPO_EM_TRES_LINHAS_FRACAO : 0),
  };
}
