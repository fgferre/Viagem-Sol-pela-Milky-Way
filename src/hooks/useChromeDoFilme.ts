// ============================================================
// O CHROME DO FILME SOME SOZINHO — item 61, 22/08.
//
// A RESPOSTA DO DONO aos mockups, em duas palavras: *"2) somem
// sozinhos"*. O que some é o CHROME — a barra de controles do topo e a
// barra de capítulos —, e o que fica é o CONTEÚDO: as legendas do beat,
// a linha de rumo, as tarjas. É a lei de qualquer tocador de vídeo:
// quem está assistindo não precisa dos botões na tela, e quem precisa
// deles mexe o ponteiro.
//
// TRÊS REGRAS, e cada uma responde a um caso que a tela tem de fato:
//  1. SÓ COM O FILME CORRENDO. Pausado, o chrome fica — quem pausou
//     parou para usar alguma coisa, e esconder o botão de retomar de
//     quem acabou de apertar pausa seria esconder justamente o que ele
//     vai procurar.
//  2. VOLTA AO PRIMEIRO GESTO, seja ele qual for: ponteiro, toque,
//     roda ou TECLA. A tecla entra porque o Tab é um gesto de
//     navegação: quem tabula até a barra precisa dela visível quando o
//     foco chegar lá — e o `keydown` acontece antes de o foco andar.
//  3. TRÊS SEGUNDOS de imobilidade, e o relógio é o de PAREDE
//     (`performance.now()`), não o do filme: sob `?shot=` o tempo da
//     viagem congela e o chrome continuaria na tela para sempre, ou
//     seja, o juiz nunca veria o que julga.
//
// O QUE ESTE HOOK NÃO FAZ: esconder. Ele devolve um booleano, e quem
// pinta é o CSS (`.hud-sumido`, fatia 3) — por opacidade, com a caixa
// no lugar. A altura da barra alimenta `--barra-fim` e o retângulo dos
// rótulos; tirá-la do fluxo mexeria na geometria de quem não pediu
// nada. É a mesma lição da dica do rodapé do Atlas (`3f2a290`).
//
// O ESTADO É "ADORMECEU", NÃO "ESTÁ VISÍVEL", e a diferença importa: o
// visível DERIVA de `ativo && sumido`, então pausar ou sair da fase
// devolve o chrome no mesmo render, sem um `setState` dentro do efeito
// (que é render em cascata, e o lint da casa proíbe). O que o efeito faz
// é só armar e desarmar o relógio.
//
// O CUSTO, porque isto escuta o ponteiro: os ouvintes só escrevem um
// NÚMERO numa variável do escopo. O `setState` acontece nas duas
// transições (some, volta) e em mais nada — um `setSumido(false)` por
// `pointermove` seria um render do App a cada quadro de movimento do
// mouse, com o índice da busca e o HUD inteiro atrás dele.
// ============================================================
import { useEffect, useState } from 'react';

/** quanto tempo parado até o chrome sair — a resposta do dono foi "3 s" */
export const ESPERA_DO_CHROME_MS = 3000;

/** os gestos que ACORDAM o chrome: os do ponteiro, o toque e o teclado */
const GESTOS = ['pointermove', 'pointerdown', 'wheel', 'keydown'] as const;

/**
 * O chrome do filme está visível AGORA?
 *
 * @param ativo o filme está correndo (fase `journey`, sem pausa)? Fora
 *   disso o chrome é sempre visível — e é o `ativo` na derivação abaixo
 *   que garante que pausar ou trocar de fase o devolve na hora.
 */
export function useChromeDoFilme(ativo: boolean): boolean {
  const [sumido, setSumido] = useState(false);

  useEffect(() => {
    if (!ativo) return;
    let marca = performance.now();
    let temporizador = 0;
    // espelho LOCAL do estado, válido dentro desta ativação: é ele que
    // deixa o ouvinte saber se há transição a publicar sem ler estado
    // durante o render (que o lint da casa, com razão, proíbe)
    let dormindo = false;

    const dormir = () => {
      const parado = performance.now() - marca;
      // ACORDOU NO MEIO DA ESPERA: o ouvinte só moveu a marca (é o que o
      // mantém barato), então quem confere o relógio é este disparo — e
      // ele se re-arma pelo tanto que falta em vez de zerar o ciclo.
      if (parado + 1 < ESPERA_DO_CHROME_MS) {
        temporizador = window.setTimeout(dormir, ESPERA_DO_CHROME_MS - parado);
        return;
      }
      temporizador = 0;
      dormindo = true;
      setSumido(true);
    };

    const acordar = () => {
      marca = performance.now();
      if (dormindo) {
        dormindo = false;
        setSumido(false);
      }
      if (!temporizador) temporizador = window.setTimeout(dormir, ESPERA_DO_CHROME_MS);
    };

    temporizador = window.setTimeout(dormir, ESPERA_DO_CHROME_MS);
    // em CAPTURA: um gesto que um diálogo aberto consumisse continua
    // sendo um gesto do visitante, e o chrome tem de acordar com ele
    for (const gesto of GESTOS) window.addEventListener(gesto, acordar, true);
    return () => {
      window.clearTimeout(temporizador);
      for (const gesto of GESTOS) window.removeEventListener(gesto, acordar, true);
      // e o relógio volta ao começo: quem retoma o filme retoma com o
      // chrome na tela e três segundos inteiros pela frente
      setSumido(false);
    };
  }, [ativo]);

  return !(ativo && sumido);
}
