/**
 * O CONTRATO DE UMA TELA DE CARREGAMENTO. Cada tela do rodízio é uma cena
 * que só desenha num canvas: nada de DOM, nada de relógio próprio. Quem a
 * hospeda (um worker com OffscreenCanvas, ou a thread principal quando o
 * aparelho não tem isso) cria o canvas, chama `quadro` a cada quadro e põe
 * o texto por cima em HTML. Assim a mesma cena roda nos dois lugares, e a
 * animação não congela quando a carga do app ocupa a thread principal.
 */

export type IdDaTela = 'nascer' | 'ceu' | 'bercario' | 'galaxia';

export interface EstadoDaCena {
  /** segundos desde a montagem da cena */
  t: number;
  /** segundos desde o quadro anterior */
  dt: number;
  /** 0..1 cru, anda aos trancos como a carga */
  progresso: number;
  /** 0..1 sem degraus, para o que cresce com a carga */
  suave: number;
  /** 0..1 do desfecho depois de 100 % (0 até a carga acabar) */
  fim: number;
  /** "reduzir movimento": tudo ~4× mais lento, sem clarões */
  reduzido: boolean;
}

export interface Cena {
  /** tamanho em px de CSS e a razão de pixel já limitada (≤ 2) */
  redimensionar(largura: number, altura: number, dpr: number): void;
  quadro(e: EstadoDaCena): void;
  /** solta os recursos e o contexto WebGL */
  soltar(): void;
}

export interface DefinicaoDaCena {
  id: IdDaTela;
  /** segundos do desfecho depois de 100 % */
  duracaoFinal: number;
  /** lança erro quando o aparelho não tem WebGL2 */
  criar(canvas: HTMLCanvasElement | OffscreenCanvas): Cena;
}
