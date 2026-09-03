// ============================================================
// A LEGENDA QUE ESTÁ NO AR — a decisão de um quadro, e nada mais.
//
// O Director publica a legenda por LATCH: só chama `onCaption` quando
// algo muda, senão o React re-renderizaria a cada quadro. A regra desse
// latch mora AQUI, pura, pelo mesmo motivo do `julgarProntidao` do
// harness de captura: o `director.ts` é DOM + WebGL de ponta a ponta e
// não abre no runner `node` da casa — uma regra escrita lá dentro só
// poderia ser conferida por leitura de fonte, que não é guarda (§15).
// ============================================================

/**
 * A LEGENDA VAI AO AR DE NOVO? Duas causas, uma condição:
 *
 *  · o ROTEIRO mudou de legenda — o índice anda;
 *  · a MESMA legenda mudou de FRASE — o visitante trocou de idioma no
 *    meio do filme (item 130/F3).
 *
 * Comparar só o índice deixava o português na tela até a PRÓXIMA
 * legenda entrar: para o roteiro nada tinha acontecido. Num plano de
 * 20 s isso é meio minuto de tela desmentindo o painel de Ajustes.
 *
 * E a recíproca importa: a regra NÃO é "reemite quando a língua muda".
 * Legenda de nome próprio ("SIRIUS") se escreve igual nas duas línguas
 * e não vai ao ar de novo — publicar o mesmo texto seria acender o
 * React à toa.
 */
export function reemitirLegenda(
  index: number,
  texto: string,
  ultimoIndex: number,
  ultimoTexto: string
): boolean {
  return index !== ultimoIndex || texto !== ultimoTexto;
}
