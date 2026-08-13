// ============================================================
// O ARRASTO DE PONTEIRO — o estado do gesto, e SÓ o estado, sem DOM
// nenhum. Existe separado dos listeners pelo mesmo motivo do
// `EstadoDaCaptura` (`cinematic/cameraRig.ts`): o vitest da casa roda
// em `node`, e regra que só se conferisse com um `document` na mesa
// não seria conferida.
//
// Ele nasce em 2026-08-13 unificando os DOIS gestos de arrastar que a
// casa tem — o trio do `Director` (Atlas + pausar-e-olhar) e o trio do
// `FreeRoam` (voo livre) —, que eram cópias uma da outra com os MESMOS
// quatro defeitos. Um dono do gesto, não dois; os limiares do clique
// curto (6 px, 400 ms) já eram os mesmos números nos dois lugares.
//
// OS TRÊS DEFEITOS QUE ESTA CLASSE FECHA, e por que fechar aqui:
//
//  1. MULTITOQUE TROCANDO O ENQUADRAMENTO SOZINHO. Sem filtro por
//     `pointerId`, o `pointermove` do SEGUNDO dedo era medido contra a
//     última posição do PRIMEIRO. Com ~200 px entre os dedos e o ganho
//     de 0,0022 rad/px, isso é 0,44 rad — 25° de giro num único evento,
//     que cabe dentro do grampo de ±70° do Atlas e por isso não é
//     segurado por nada. Pior que o giro: o `pointerdown` do segundo
//     dedo REARMAVA `andou`/`desde`, então o soltar virava "clique
//     curto" e o Atlas focava outro nome, descia um degrau da escada e
//     reescrevia o `?foco=` sem ninguém pedir. E o `pointerup` de
//     qualquer dedo matava o arrasto do dedo que tinha ficado.
//     Aqui: um DONO por gesto (`dono`), e nenhum outro ponteiro move,
//     rearma ou encerra o que não é dele.
//
//  2. GESTO CANCELADO DEIXANDO O ARRASTO PRESO PARA SEMPRE. Só havia
//     `pointerup`. Quando o sistema toma o ponteiro (gesto do iOS,
//     palma rejeitada, trocar de janela com o botão preso) o
//     `pointerup` NUNCA chega, e o arrasto ficava ligado com o ponteiro
//     solto: a cena passava a girar sozinha ao mexer o mouse. Aqui:
//     `cancelar` encerra pelo mesmo caminho do soltar — MENOS o clique
//     curto, porque gesto abortado pelo sistema não é clique de
//     ninguém.
//
//  3. BOTÃO DIREITO GIRANDO A CENA. Não havia checagem de botão, então
//     arrastar com o direito (ou com o do meio) girava — e ainda abria
//     o menu do sistema por cima. Aqui: só o botão principal começa
//     arrasto. O bloqueio do MENU não mora nesta classe porque é
//     `preventDefault` em DOM; ele fica no canvas, no `Director`.
// ============================================================

/**
 * O botão PRINCIPAL do ponteiro: esquerdo no mouse, e também o valor
 * que o navegador manda no `pointerdown` de toque e de caneta em
 * contato — por isso a guarda não custa nada ao dedo, que é quem mais
 * usa esses listeners.
 */
export const BOTAO_PRINCIPAL = 0;

/**
 * CLIQUE CURTO — os dois limiares de sempre, verbatim dos dois trios
 * que esta classe unifica. 6 px é a soma |dx|+|dy| (distância de
 * quarteirão, não euclidiana: é a conta que os dois já faziam), e são
 * a tolerância ao tremor da mão sobre o botão; 400 ms separa "clicar
 * num nome" de "segurar para girar devagar".
 */
export const CLIQUE_PX = 6;
export const CLIQUE_MS = 400;

/**
 * O MÍNIMO de um `PointerEvent` que a decisão do arrasto lê. Um
 * `PointerEvent` de verdade satisfaz esta forma estruturalmente — o
 * tipo existe para o oráculo poder encenar dois dedos sem um DOM.
 */
export interface ToqueDePonteiro {
  readonly pointerId: number;
  readonly button: number;
  readonly clientX: number;
  readonly clientY: number;
}

/** o passo do gesto em pixels de tela, já filtrado pelo dono */
export interface PassoDeArrasto {
  readonly dx: number;
  readonly dy: number;
}

export class ArrastoDePonteiro {
  /** `pointerId` do ponteiro que começou o gesto; `null` = sem arrasto */
  private dono: number | null = null;
  private ultimoX = 0;
  private ultimoY = 0;
  private andou = 0;
  private desde = 0;

  /** há gesto em curso? (o antigo `dragging`/`pauseDragging`) */
  get ativo(): boolean {
    return this.dono !== null;
  }

  /** |dx|+|dy| somados desde o `pointerdown` — quem cancela a visita lê isto */
  get percorrido(): number {
    return this.andou;
  }

  /**
   * Tenta abrir um gesto. Devolve `false` — e NÃO toca em estado nenhum
   * — quando o ponteiro não é o botão principal (defeito 3) ou quando
   * já existe um dono (defeito 1: o segundo dedo não rearma o relógio
   * do clique curto nem sequestra o gesto do primeiro).
   */
  comecar(evento: ToqueDePonteiro, agora: number): boolean {
    if (this.dono !== null) return false;
    if (evento.button !== BOTAO_PRINCIPAL) return false;
    this.dono = evento.pointerId;
    this.andou = 0;
    this.desde = agora;
    this.ultimoX = evento.clientX;
    this.ultimoY = evento.clientY;
    return true;
  }

  /**
   * O passo do gesto, ou `null` se o evento não for do dono — é a linha
   * que impede os 25° de um evento só. A última posição só avança com o
   * ponteiro dono, então o dedo de fora não contamina nem o próximo dx.
   */
  mover(evento: ToqueDePonteiro): PassoDeArrasto | null {
    if (this.dono !== evento.pointerId) return null;
    const dx = evento.clientX - this.ultimoX;
    const dy = evento.clientY - this.ultimoY;
    this.andou += Math.abs(dx) + Math.abs(dy);
    this.ultimoX = evento.clientX;
    this.ultimoY = evento.clientY;
    return { dx, dy };
  }

  /**
   * Encerra o gesto SE o evento for do dono, e devolve se ele se
   * qualificou como CLIQUE CURTO (curto no espaço e no tempo). Levantar
   * um dedo que não é o dono não devolve `true` nem encerra coisa
   * alguma — era assim que soltar o segundo dedo focava outro nome e
   * matava o arrasto do primeiro.
   */
  soltar(evento: ToqueDePonteiro, agora: number): boolean {
    if (this.dono !== evento.pointerId) return false;
    const curto = this.andou < CLIQUE_PX && agora - this.desde < CLIQUE_MS;
    this.dono = null;
    return curto;
  }

  /**
   * O sistema levou o ponteiro (`pointercancel`, `lostpointercapture`):
   * encerra o gesto do dono SEM clique curto. Devolve se havia mesmo o
   * que encerrar, para quem quiser registrar.
   */
  cancelar(evento: ToqueDePonteiro): boolean {
    if (this.dono !== evento.pointerId) return false;
    this.dono = null;
    return true;
  }

  /**
   * Abandona o gesto sem evento nenhum — troca de modo, `resetMotion`,
   * teardown. Não é o mesmo que `cancelar`: aqui não há ponteiro para
   * conferir, quem chama já sabe que o gesto perdeu o sentido.
   */
  esquecer() {
    this.dono = null;
  }
}
