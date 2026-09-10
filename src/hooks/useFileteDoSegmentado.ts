// ============================================================
// O FILETE DA ESCOLHA, E POR QUE ELE MORA SOZINHO NUM ARQUIVO.
//
// Ele serve DUAS marcações diferentes: o componente `Segmentado` e os
// três grupos crus (`.ajustes-seg` escrito à mão) da máquina do tempo,
// onde ação e alternância convivem no mesmo grupo e o componente não
// serve. Um hook exportado do lado de um componente quebra o
// recarregamento rápido do Vite (a regra `react-refresh` do lint), e
// duplicá-lo daria dois desenhos para a mesma marca de escolha, lado a
// lado na mesma tela. Um arquivo, um mecanismo.
// ============================================================
import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * O SUBLINHADO QUE ANDA (M2 do plano de motion, §2 movimento 2) — o
 * filete âmbar da escolha DESLIZA do segmento antigo para o novo, em vez
 * de apagar num e acender no outro. É a diferença entre "trocou" e
 * "isto virou aquilo", e é o gesto que o dono pediu quando falou em
 * interface expressiva.
 *
 * POR QUE UM HOOK, E NÃO SÓ CSS: os segmentos têm larguras diferentes de
 * propósito (`flex: 1 1 auto` — com larguras iguais "Performance" saía
 * cortado), então onde o filete começa e quanto ele mede só se sabe
 * MEDINDO. O hook escreve `--seg-x`/`--seg-w` na moldura e o CSS
 * transita esses dois números; nada é animado por JavaScript.
 *
 * POR QUE UM HOOK, E NÃO DENTRO DO `Segmentado`: metade dos segmentados
 * da casa é desenhada CRUA (`.ajustes-seg` sem este componente) — os três
 * grupos da máquina do tempo misturam ação e alternância e não cabem no
 * componente sem mudar comportamento. Um filete que deslizasse só nos do
 * componente daria DOIS desenhos para a mesma marca de escolha, lado a
 * lado na mesma tela. O hook é o que faz existir UM mecanismo só.
 *
 * SEM ESCOLHA, SEM FILETE: no grupo do transporte, "parar o tempo" não
 * marca nenhum segmento — aí o filete apaga no lugar em vez de correr
 * para um canto, e volta a andar quando a escolha volta.
 */
export function useFileteDoSegmentado() {
  const moldura = useRef<HTMLDivElement>(null);
  const alvoAnterior = useRef<HTMLElement | null>(null);

  const medir = useCallback(() => {
    const caixa = moldura.current;
    if (!caixa) return;
    const alvo = caixa.querySelector<HTMLElement>(':scope > .on');
    if (!alvo) {
      caixa.style.setProperty('--seg-visivel', '0');
      return;
    }
    // ANDA SÓ QUANDO A ESCOLHA MUDA. Trocar de idioma, mexer no `?ui=` ou
    // redimensionar a janela também remedem — e ali o filete tem de já
    // NASCER no lugar novo: vê-lo escorregar sozinho porque uma palavra
    // ficou maior seria movimento sem causa. `--seg-t` é a duração da
    // transição, e ela só existe quando o alvo é outro nó.
    const mudou = alvoAnterior.current !== null && alvoAnterior.current !== alvo;
    caixa.style.setProperty('--seg-t', mudou ? 'var(--t-entrada)' : '0ms');
    // POR RETÂNGULO, e não por `offsetLeft`: de onde `offsetLeft` conta
    // (borda ou padding da moldura) varia entre motores, e aqui isso
    // custava 1 px de desalinhamento visível — o filete começava antes
    // do segmento. Dois retângulos subtraídos não dependem disso, e como
    // os dois sofrem qualquer `transform` do painel em volta na MESMA
    // medida, a diferença continua certa mesmo durante a entrada dele.
    const caixaRet = caixa.getBoundingClientRect();
    const segmento = alvo.getBoundingClientRect();
    caixa.style.setProperty(
      '--seg-x',
      `${segmento.left - caixaRet.left - caixa.clientLeft}px`
    );
    caixa.style.setProperty('--seg-w', `${segmento.width}px`);
    caixa.style.setProperty('--seg-visivel', '1');
    alvoAnterior.current = alvo;
  }, []);

  // TODA RENDERIZAÇÃO, sem lista de dependências: quem move o filete é a
  // classe `.on` mudando de botão, e isso é um render de quem chama.
  useLayoutEffect(() => {
    medir();
  });

  // ...e UMA vez o observador, porque a moldura também muda de tamanho
  // SEM render nenhum: outra língua, outra escala de texto, outra janela.
  useLayoutEffect(() => {
    const caixa = moldura.current;
    if (!caixa) return;
    const observador = new ResizeObserver(medir);
    observador.observe(caixa);
    for (const filho of caixa.children) observador.observe(filho);
    return () => observador.disconnect();
  }, [medir]);

  return moldura;
}
