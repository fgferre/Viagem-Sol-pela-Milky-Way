// ============================================================
// A PRONTIDÃO DE CAPTURA — o julgamento puro e as duas janelas de
// quadros. Morava no director.ts (onda da arquitetura, Parte 1, corte
// 3); a COLETA dos termos segue no `get captura` da fachada (só o
// director conhece os donos), o JULGAMENTO mora aqui, testável sem
// THREE. O contrato do harness é o de sempre:
// `window.__director.captura.pronto`.
// ============================================================
import type { Phase } from '../fases';
import type { QualityLevel } from '../core/engine';

/**
 * Quadros desenhados sem NENHUMA perturbação para a cena valer como
 * estável (ver o getter `captura`). Dez, e o número tem medida atrás:
 * `sol`, `travessia` e `soldisco` devolvem o md5 oficial já no primeiro
 * quadro depois que o App aplica o deep-link (sonda de 2026-08-11, marcos
 * 1/2/3/5/…/700 na mesma captura). Dez dá margem de sobra para o intervalo
 * entre o fim do `init` e a aplicação de `?q=`/`?pos=`/`?t=`, e custa ~1 s
 * numa vista de 1800×1800 — contra os ~70 s dos 700 quadros que este sinal
 * aposenta.
 */
export const QUADROS_ESTAVEIS = 10;


/**
 * Quadros que a captura SEGURA quando a efeméride PEDIDA está
 * `indisponivel` com os corpos em cena (auditoria item 5c): a janela em
 * que o tick dispara a SEGUNDA tentativa de `garantirEfemerides` (a
 * fase 'buscando' dela já segura sozinha, pelo termo de `andando`).
 * Esgotada a janela, a captura SOLTA — mas só depois do aviso único no
 * console: o quadro que sair dali mostra o RETRATO congelado, e a
 * captura nunca finge que a efeméride viva estava lá.
 */
export const QUADROS_TENTANDO_FONTE = 10;

/** os termos que a fachada coleta — cada um com o dono explicado nela */
export interface TermosDaProntidao {
  fase: Phase;
  andando: boolean;
  solAssentado: boolean;
  corposAssentados: boolean;
  fonteAssentada: boolean;
  quadrosEstaveis: number;
  tier: QualityLevel;
  /**
   * O tier com que o MUNDO na tela foi assado — e ele não é o `tier`
   * acima. Aquele é o do instrumento e muda no quadro do clique; este é
   * o da ALOCAÇÃO (população da galáxia, Sol, alvo de textura dos
   * corpos) e só muda quando o mundo novo entra, segundos depois
   * (Ajustes C). Só é REPORTADO — nenhum juiz de prontidão o consulta,
   * porque quem segura a captura durante a troca é o termo `andando`.
   * Sem ele, um juiz que quisesse provar que a troca de tier VIROU
   * mundo só teria o número do instrumento, que muda sozinho e não
   * prova nada. `null` antes do init terminar.
   */
  tierDoMundo: QualityLevel | null;
}


/**
 * A CENA ESTÁ ESTÁVEL PARA CAPTURAR? Bandeira somente-leitura que o
 * harness de identidade (`scripts/visual/ab-identidade.mjs`) espera no
 * lugar de contar 700 quadros no escuro.
 *
 * POR QUE ELA EXISTE: o critério antigo era "o log da cartografia e mais
 * 700 quadros" — ~70 s por captura numa vista de 1800×1800, e 700 é um
 * número que ninguém mediu, escolhido com folga porque a alternativa
 * (`--virtual-time-budget`) devolvia a MESMA vista em estados diferentes.
 * Medido em 2026-08-11 nesta máquina: `sol`, `travessia` e `soldisco` já
 * saem com o md5 oficial no PRIMEIRO quadro depois que o deep-link é
 * aplicado. Os 700 quadros eram seguro, não critério.
 *
 * O QUE ELA ESPERA, e cada termo é uma condição REAL que o director
 * conhece (nada de relógio de parede):
 *  - `fase !== 'loading'`: o `init()` terminou — catálogo HYG e ativos
 *    cartográficos baixados, mapas de poeira/estrutura assados, galáxia
 *    construída, lâminas congeladas. O log `[cartografia]` que o harness
 *    antigo farejava sai DENTRO desse init, antes de todo o resto dele.
 *  - nada está ANDANDO: nem a viagem correndo (`journey` sem
 *    `freezeJourney`) nem a câmera do voo livre (visita a caminho, slerp
 *    de entrada, inércia). Aí a cena muda por construção e prontidão não
 *    quer dizer nada. Sob `?shot=` o relógio visual é 0, o `?t=` do
 *    harness congela e o `?pos=` entra com `snapCanonical`.
 *  - `sun.assentado`: o Sol tem retrato completo publicado — sem bake
 *    fatiado no meio e com a coroa volumétrica já publicada.
 *  - corpos assentados (item 5b da auditoria): nenhum corpo resolvido
 *    está no GATE a FRIO — armado, camada ligada, e nem textura quente
 *    nem fetch em voo. Capturar assim fotografaria o ponto fingindo a
 *    vista do globo; a carga que desistiu (3 tentativas, terra.ts)
 *    deixa a captura REPROVAR por teto em vez de mentir.
 *  - fonte assentada (item 5c): efeméride PEDIDA e indisponível com
 *    corpos em cena segura a janela da retentativa
 *    (QUADROS_TENTANDO_FONTE) — depois dela o aviso único já acusou o
 *    RETRATO e a captura solta.
 *  - `quadrosEstaveis >= QUADROS_ESTAVEIS`: quadros desenhados desde a
 *    última perturbação (troca de fase, `?q=`, `?pos=`, `?t=`, resize,
 *    exposição, camada ligada/desligada). Pequeno de propósito: o que
 *    ele cobre é o intervalo entre o fim do `init` e a aplicação dos
 *    parâmetros de URL pelo App, que acontece um tique depois.
 *
 * SOMENTE LEITURA: este getter não escreve nada e o único custo no
 * caminho de render é o `++` no fim do tick. Se ele mudasse um pixel, o
 * gate que ele serve estaria medindo a si mesmo.
 */
export function julgarProntidao(t: TermosDaProntidao) {
  return {
    pronto:
      t.fase !== 'loading' &&
      !t.andando &&
      t.solAssentado &&
      t.corposAssentados &&
      t.fonteAssentada &&
      t.quadrosEstaveis >= QUADROS_ESTAVEIS,
    quadros: t.quadrosEstaveis,
    fase: t.fase,
    andando: t.andando,
    sol: t.solAssentado,
    corpos: t.corposAssentados,
    fonte: t.fonteAssentada,
    tier: t.tier,
    tierDoMundo: t.tierDoMundo,
  };
}
