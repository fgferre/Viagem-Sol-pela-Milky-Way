// ============================================================
// O RETÂNGULO ÚTIL do Atlas — o conhecimento de tela/HUD.
//
// Tudo aqui é layout: as frações que o CSS do HUD come de cada
// borda e a conta que as soma. Zero THREE, zero câmera — quem
// enquadra é ./enquadramento; quem liga à câmera é ./atlasRig.
// ============================================================
/**
 * As tarjas de cinema comem 6,5% da altura em CADA borda
 * (`.letterbox.on { height: 6.5vh }`, hud.css) e o Atlas as mantém —
 * é o mesmo quadro do filme. Fonte única do número para o retângulo
 * útil; se a tarja mudar no CSS, muda aqui.
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
 * TOPO: `.atlas-contexto` e `.controls-bar`, ancoradas em `top: 8,5vh`
 * (a mesma linha) — medido 12,5% da altura a 1280×720, tarja incluída.
 * Desde a F3 a barra carrega o botão da busca e QUEBRA LINHA no texto
 * grande: medido 19,7% a 1200×900 com `?ui=1,4` — é ela, e não a linha
 * de contexto, quem dimensiona a fração do topo.
 * BASE: `.atlas-selo`, ancorado em `bottom: 7,4vh` — quatro blocos de
 * texto, medido 19,6% da altura com a tarja, e é a peça mais alta do
 * HUD do modo (a dica do Atlas fica em 13,4%).
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
 * F2b: a ContextLine ganhou a linha da ESCADA (nome + botões
 * aproximar/sistema em linha) e a faixa do topo cresceu a altura de um
 * `.hud-btn.small` sobre a do nome — medido pelo juiz de a11y (que
 * cobra declarado ≥ medido em toda a grade largura×ui): 0,075 → 0,09.
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
 * O DEGRAU DA MÁQUINA DO TEMPO QUEBRADA — o fenômeno da barra de
 * controles repetido na BASE: largura×texto, não texto sozinho. MEDIDO
 * pelo juiz de a11y na grade de eixos (2026-08-18, viewport exato por
 * override, fontes Linux da máquina de nuvem): com `?ui=1,4` a barra
 * do tempo mede 0,267 da altura a 1.000 e 1.200 px e QUEBRA para 0,321
 * a 900 px — o degrau vive entre 900 e 1.000 px por 1,4 de ui (razão
 * 643–714). O limiar fica no TOPO da faixa (714), o mesmo lado seguro
 * do erro da barra: declarar cedo custa um recuo de câmera; declarar
 * tarde põe o alvo atrás da leitura do tempo. Em `ui = 1` o degrau só
 * existiria abaixo de 714 px — fora da faixa declarada
 * (`LARGURA_UTIL_MINIMA_PX`), onde a medição já é só registro.
 *
 * A fração (0,03) cobre o 0,321 medido com folga de 0,019 — e fontes
 * de outra máquina movem esta margem (o juiz roda no macOS do dono e
 * na nuvem), que é exatamente por que a declaração paga o degrau
 * inteiro em vez de raspar o número de uma máquina só.
 */
const LARGURA_DA_QUEBRA_DO_TEMPO_PX = 714;
const TEMPO_QUEBRADO_FRACAO = 0.03;

/**
 * A LARGURA DE REFERÊNCIA — a tela de mesa em que as frações acima
 * foram medidas e em que o juiz de a11y roda. É o default do produtor:
 * quem o chama sem largura (o vitest da função pura) recebe o
 * enquadramento desta janela, e não um caso-limite silencioso.
 */
export const LARGURA_DE_MESA_PX = 1200;

/**
 * ATÉ ONDE A DECLARAÇÃO VALE, em largura de CSS — medido, não estimado.
 * De 900 px para cima o retângulo declarado cobre o HUD real em toda a
 * faixa de `?ui=` (0,85 a 1,4) — no próprio 900, o extremo 1,4 só cabe
 * pelo degrau `TEMPO_QUEBRADO_FRACAO` (a quebra da máquina do tempo já
 * morde ali: 0,321 medido na grade de eixos de 2026-08-18). Abaixo da
 * faixa a BASE estoura de vez, em duas e três linhas: medido na era do
 * viewport de 813 px, base 0,328 a 800 px e 0,416 a 700 px; a 600 px
 * nem o topo cabe (0,245 contra 0,210).
 *
 * PENDÊNCIA NOMEADA, com endereço em vez de adjetivo: "telas estreitas"
 * é o HUD do Atlas reflowar abaixo de 900 px de largura de CSS — não é o
 * enquadramento que está errado ali, é o HUD que precisa de um arranjo
 * próprio (Onda 6). O juiz de a11y mede essas larguras e IMPRIME os
 * números; o que ele cobra como gate é a faixa declarada aqui.
 */
export const LARGURA_UTIL_MINIMA_PX = 900;

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
 * mesmo estando encostadas nas laterais (ContextLine à esquerda, selo à
 * direita): o retângulo é um recorte retangular do quadro, e descontar
 * meia largura por causa de uma faixa que ocupa 7% da altura empurraria
 * a câmera para trás sem necessidade. Descontar a FAIXA inteira é o
 * corte honesto — é o que garante que nada do alvo caia atrás do texto.
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
      (largura < LARGURA_DA_QUEBRA_DO_TEMPO_PX * k ? TEMPO_QUEBRADO_FRACAO : 0),
  };
}
