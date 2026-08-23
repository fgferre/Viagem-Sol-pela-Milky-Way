// ============================================================
// O ZOOM DA RODA — o `wheel` do Atlas, traduzido em DISTÂNCIA.
//
// ------------------------------------------------------------
// A LÁPIDE — "POR QUE DEGRAU E NÃO ZOOM CONTÍNUO" (2026-08-12 a
// 2026-08-22). O argumento que morreu aqui, inteiro, porque decisão
// revogada sem o texto do que se revogou vira decisão que volta:
//
//   «POR QUE DEGRAU E NÃO ZOOM CONTÍNUO, que é o que a roda faz em toda
//   fonte consultada (SpaceEngine, Celestia, Stellarium, three.js): o
//   Atlas não tem distância de câmera para guardar. Ele tem a ESCADA
//   (sistema → órbita → corpo → lua), e o degrau já vive na URL como
//   `?ver=` — o link copiado reproduz a vista. Uma distância contínua
//   não viveria ali, e a primeira coisa que o visitante faria com a roda
//   seria produzir uma vista que o link dele não sabe contar.»
//
// O QUE O REVOGOU, palavras do dono em 2026-08-22 (item 73):
//
//   «toda navegacao atual do modo atlas está uma merda... antes no
//   projeto atlas verdadeito conseguiamos dar zoom out zoom in
//   livremente rodando o mouse wheel quando um objeto estava
//   selecionado... foi criado um monstro frankstein.»
//
// A premissa do argumento era verdadeira e deixou de ser: o rig ganhou
// `distancia` (`AtlasRig.pinarDistancia`), e a porta `?d=` a põe na URL
// em raios do alvo. A escada não morreu — virou ATALHO (botão, Esc,
// `?ver=`, busca), que é o papel que ela tem em toda fonte consultada.
// ------------------------------------------------------------
//
// A MÁQUINA É PURA E VIVE FORA DO DIRECTOR, pelo mesmo motivo do
// `arrastoDePonteiro` e da roda que ela substitui: o que decide quanto
// um embalo de trackpad vale é lógica com estado, e lógica com estado
// precisa de bancada. Aqui ela recebe números e devolve ESTALOS
// fracionários; quem sabe o que é "perto" e "longe" é o rig.
//
// A MECÂNICA é a do `zoomPhysics.ts` do atlas doador (que por sua vez a
// tirou do `NaturalCamera` do Gaia Sky), REIMPLEMENTADA: impulso por
// estalo, atrito exponencial, zona morta. O que atravessa são os
// NÚMEROS medidos, nunca o código.
// ============================================================

/**
 * O que um `deltaMode = 1` (LINHA) vale em pixels. 16 px é a altura de
 * linha padrão de um navegador de mesa (1rem a 16 px), e é o número que
 * o Firefox — o único navegador de mesa que ainda reporta em linha —
 * multiplica: um estalo de roda lá é `deltaY = 3` em modo linha, ou
 * seja 48 px.
 */
export const LINHA_EM_PX = 16;

/** `deltaMode = 2` (PÁGINA) sem altura de janela conhecida. */
export const PAGINA_PADRAO_PX = 800;

/**
 * UM ESTALO DE RODA, em pixels de `deltaMode = 0`. Chrome e Safari
 * mandam `deltaY = 100` por detente; o Firefox manda 3 linhas, que são
 * 48 px pela régua acima. 100 é a régua do CHROME de propósito — é a
 * mesma escolha do doador (`PIXEL_DELTA_PER_WHEEL_STEP`), e a diferença
 * que sobra para o Firefox é de meio estalo por detente, não de ordem
 * de grandeza. Zoom contínuo não precisa de limiar: o que não completa
 * um estalo vira fração de estalo, e a fração move a câmera.
 */
export const ESTALO_EM_PX = 100;

/**
 * O PASSO, em DÉCADAS de distância por estalo, junto ao piso e junto ao
 * teto. É daqui que sai a "velocidade proporcional à distância" de
 * graça: passo em LOG quer dizer que um estalo vale a mesma FRAÇÃO da
 * distância em qualquer escala — 0,05 década é 12,2% da distância.
 *
 * O passo CRESCE com a distância, que é a ideia do
 * `calculateAdaptiveZoomSpeed` do doador (ele faz
 * `MIN + log10(d/dmin) × 0,35` porque trabalha em distância absoluta e
 * precisa recuperar a escala; aqui a escala já está no log, e o que
 * sobra é o tempero). Sem ele, atravessar as 6,4 décadas que separam a
 * superfície de um planeta da esfera do sistema custaria 128 estalos.
 */
export const PASSO_LOG_PERTO = 0.05;
export const PASSO_LOG_LONGE = 0.2;

/**
 * ATRITO exponencial, por segundo: `v ← v·exp(−F·dt)`. 8/s é o número
 * do doador — meia-vida `ln(2)/8` = 87 ms —, e é a forma FECHADA da
 * equação `dv/dt = −F·v`, não a aproximação linear: com um quadro
 * perdido (`F·dt > 1`) a linear devolveria velocidade NEGATIVA e o zoom
 * andaria para trás.
 */
export const ATRITO_POR_S = 8;

/**
 * ZONA MORTA, em estalos por segundo. Abaixo dela a velocidade vira
 * zero: sem isso o float ficaria arrastando a câmera para sempre, abaixo
 * do limiar de percepção mas acima de zero — e uma câmera que nunca para
 * é uma captura que nunca assenta. 0,1 é o do doador.
 */
export const ZONA_MORTA = 0.1;

/**
 * O IMPULSO de um estalo, em estalos por segundo de velocidade.
 *
 * ELE NÃO É O 4,0 DO DOADOR, e a diferença tem conta. A integral de um
 * impulso `I` sob atrito `F` é `I/F` — o quanto a câmera anda ao todo.
 * Com `I = 4` e `F = 8` um detente andaria MEIO estalo, e o
 * `PASSO_LOG_PERTO` declarado acima valeria metade do que diz. Com
 * `I = F` a integral é exatamente UM estalo, e o número declarado é o
 * número que acontece (menos a fatia que a zona morta come: 0,1/8, ou
 * 1,25%).
 */
export const IMPULSO_POR_ESTALO = ATRITO_POR_S;

/** O que chega do navegador — só os três campos que decidem. */
export interface GiroDeRoda {
  deltaY: number;
  /** 0 = pixel, 1 = linha, 2 = página. */
  deltaMode: number;
  /**
   * A PINÇA DO TRACKPAD chega assim: `wheel` com `ctrlKey` ligado. O
   * campo NÃO decide nada aqui, e é de propósito — a pinça de trackpad
   * é o mesmo evento, com `deltaY` pequeno, e fração de estalo é fração
   * de câmera. Ele fica escrito porque explica por que o
   * `preventDefault` do canvas é obrigatório: sem ele o Chrome dá zoom
   * na PÁGINA.
   *
   * A PINÇA DE TELA DE TOQUE É OUTRA COISA, e até 2026-08-23 ela
   * simplesmente não existia: num telefone, com `touch-action: none`,
   * dois dedos produzem dois PONTEIROS e nenhum `wheel`. Ela entra pelo
   * `empurrar`, com a régua de `pixelsDaPinca`.
   */
  ctrlKey: boolean;
}

/**
 * A PINÇA DE DOIS DEDOS, em pixels de roda — a régua que o gesto de
 * TOQUE usa, e ela não traz número novo: é `ESTALO_EM_PX` dividido por
 * `PASSO_LOG_PERTO`, os dois já declarados acima.
 *
 * A LEI É MANIPULAÇÃO DIRETA: afastar os dedos ao DOBRO aproxima a
 * câmera à METADE, que é o que todo mapa de telefone faz e o que a mão
 * espera. Meia distância é 0,301 década; junto ao piso um estalo vale
 * `PASSO_LOG_PERTO` (0,05 década), então a dobra vale 6,02 estalos —
 * 602 px pela régua do `ESTALO_EM_PX`. O 1:1 é EXATO junto ao piso e
 * fica mais forte à medida que a câmera se afasta (o passo cresce até
 * `PASSO_LOG_LONGE`), que é o mesmo tempero que a roda já tem: longe, um
 * gesto atravessa mais escala.
 *
 * O SINAL é o da casa: negativo APROXIMA. Razão > 1 são dedos se
 * afastando, e afastar aproxima.
 *
 * Razão inválida (zero, negativa, não finita — dedos no mesmo pixel)
 * devolve zero em vez de infinito: um dos dois dedos ainda vai chegar,
 * e um impulso infinito seria a câmera no piso num quadro.
 */
export function pixelsDaPinca(razao: number): number {
  if (!Number.isFinite(razao) || razao <= 0) return 0;
  return (-ESTALO_EM_PX * Math.log10(razao)) / PASSO_LOG_PERTO;
}

/**
 * O delta em PIXELS, seja qual for a unidade em que ele veio. Sem esta
 * conversão o mesmo gesto vale 100 num navegador e 3 no outro.
 */
export function pixelsDoGiro(giro: GiroDeRoda, alturaDaPaginaPx: number): number {
  const dy = Number.isFinite(giro.deltaY) ? giro.deltaY : 0;
  if (giro.deltaMode === 1) return dy * LINHA_EM_PX;
  if (giro.deltaMode === 2) {
    const h =
      Number.isFinite(alturaDaPaginaPx) && alturaDaPaginaPx > 0
        ? alturaDaPaginaPx
        : PAGINA_PADRAO_PX;
    return dy * h;
  }
  return dy;
}

/**
 * ESTALOS (fracionários) de um evento. O SINAL é o da casa e o de todo
 * mundo: `deltaY < 0` é a roda para cima e a pinça abrindo, e as duas
 * querem dizer APROXIMAR — negativo aproxima, positivo afasta.
 */
export function estalosDoGiro(giro: GiroDeRoda, alturaDaPaginaPx: number): number {
  return pixelsDoGiro(giro, alturaDaPaginaPx) / ESTALO_EM_PX;
}

/**
 * O PASSO EM DÉCADAS que um estalo vale NESTA distância — interpolação
 * linear entre `PASSO_LOG_PERTO` e `PASSO_LOG_LONGE` na POSIÇÃO
 * LOGARÍTMICA da distância dentro da faixa `[piso, teto]`.
 *
 * A faixa entra por parâmetro e não por constante porque ela é do ALVO:
 * o piso é `K_MIN` raios dele e o teto é o sistema em quadro, e os dois
 * andam com o alvo escolhido. Faixa degenerada (piso ≥ teto, número não
 * finito) devolve o passo de perto, que é o conservador.
 */
export function passoDeZoomLog(distancia: number, piso: number, teto: number): number {
  if (!(distancia > 0) || !(piso > 0) || !(teto > piso)) return PASSO_LOG_PERTO;
  const span = Math.log10(teto / piso);
  const u = Math.min(1, Math.max(0, Math.log10(distancia / piso) / span));
  return PASSO_LOG_PERTO + (PASSO_LOG_LONGE - PASSO_LOG_PERTO) * u;
}

/**
 * A distância depois de `estalos` — o passo de Euler em LOG de
 * distância, avaliado no ponto de partida. Explícito porque o passo de
 * um quadro é pequeno por construção (a velocidade que sobrevive à zona
 * morta anda no máximo `v·dt` estalos, e a 60 Hz isso é centésimos de
 * década): integrar o passo variável exatamente mudaria o número na
 * quarta casa e não mudaria um pixel.
 *
 * O resultado sai SEMPRE dentro de `[piso, teto]` — é o grampo que
 * impede a câmera de atravessar o alvo por um lado e de perder o sistema
 * de vista pelo outro.
 */
export function distanciaAposEstalos(
  distancia: number,
  piso: number,
  teto: number,
  estalos: number
): number {
  if (!(distancia > 0) || !(piso > 0) || !(teto > 0)) return distancia;
  const passos = Number.isFinite(estalos) ? estalos : 0;
  const passo = passoDeZoomLog(distancia, piso, teto);
  const alvo = distancia * Math.pow(10, passos * passo);
  return Math.min(Math.max(alvo, Math.min(piso, teto)), Math.max(piso, teto));
}

/**
 * A INÉRCIA — velocidade em estalos/s, atrito exponencial, zona morta.
 * Cada evento é um IMPULSO (não uma força sustentada), então ele soma
 * direto na velocidade: é o que o doador faz, e é o certo para entrada
 * impulsiva.
 */
export class ZoomDaRoda {
  private velocidade = 0;

  /**
   * O IMPULSO, em PIXELS de roda — o único dono do empurrão, e a porta
   * pela qual entram os DOIS gestos que dão zoom: a roda/pinça de
   * trackpad (`girar`, que é a casca que traduz o `wheel`) e a pinça de
   * dois dedos (`pixelsDaPinca`, do `gestos.ts`).
   *
   * ELE NASCE EM 2026-08-23 e não traz mecânica nova: o corpo é o que o
   * `girar` já fazia. O que muda é que o gesto de toque passa a somar na
   * MESMA velocidade, com o MESMO atrito e a MESMA zona morta — dois
   * donos do impulso seriam duas inércias somando na câmera, e o
   * `esquecer` da troca de fase só apagaria uma.
   */
  empurrar(pixels: number) {
    const estalos = pixels / ESTALO_EM_PX;
    if (!Number.isFinite(estalos)) return;
    this.velocidade += estalos * IMPULSO_POR_ESTALO;
  }

  /** Consome um evento do navegador — a casca do `empurrar`. */
  girar(giro: GiroDeRoda, alturaDaPaginaPx = PAGINA_PADRAO_PX) {
    this.empurrar(pixelsDoGiro(giro, alturaDaPaginaPx));
  }

  /**
   * Um quadro: devolve os ESTALOS fracionários a gastar agora, aplica o
   * atrito e corta na zona morta.
   *
   * O QUE ANDOU É A INTEGRAL EXATA de `v·e^(−F·t)` no quadro —
   * `v·(1 − e^(−F·dt))/F` —, e não o `v·dt` do doador. A diferença não é
   * refinamento: com `v·dt` a soma de um estalo depende da TAXA DE
   * QUADROS (soma de Riemann pela direita), e quem MEDE é a bancada
   * (`zoomDaRoda.test.ts`, o `it` do `v·dt`): 92,33% do que o impulso
   * promete a 60 Hz, contra 98,36% a 1.000 Hz — e 86,32% a 30 Hz, que é
   * a máquina ruim, onde isto importa. (Os 93,5% / 99,9% que este
   * comentário trazia eram lembrança, nunca medida.) Um gesto
   * que anda menos quando a máquina está rápida é um gesto que ninguém
   * consegue calibrar. Com a forma fechada a soma é `I/F` exato em
   * qualquer taxa, menos a fatia que a zona morta corta no fim (< 1,25%).
   */
  avancar(dt: number): number {
    if (this.velocidade === 0) return 0;
    if (!Number.isFinite(dt) || dt <= 0) return 0;
    const decaimento = Math.exp(-ATRITO_POR_S * dt);
    const andou = (this.velocidade * (1 - decaimento)) / ATRITO_POR_S;
    this.velocidade *= decaimento;
    if (Math.abs(this.velocidade) < ZONA_MORTA) this.velocidade = 0;
    return andou;
  }

  /** ainda tem embalo para gastar? */
  get embalando(): boolean {
    return this.velocidade !== 0;
  }

  /** Zera o gesto — sair da fase não pode deixar embalo guardado. */
  esquecer() {
    this.velocidade = 0;
  }
}
