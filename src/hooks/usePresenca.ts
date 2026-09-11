// ============================================================
// A PRESENÇA DE UM CONTEÚDO DOBRÁVEL (PLAN-MOTION-UI.md §5, acordeões) —
// abrir→abrindo→aberto→saindo→fechar, a mesma máquina que `useGavetas`
// já dá às cinco gavetas, extraída para servir qualquer seção que
// aparece e some no lugar: as seções da ficha, o "Avançado" dos
// Ajustes, o detalhe do selo. `duracaoDaSaida` e `semMovimento` são
// EMPRESTADAS de lá, não reescritas — um segundo relógio, ou uma
// segunda leitura da preferência de movimento, é o que a §5 proíbe.
//
// O ABRINDO É UM TRINCO, e não um pulso: uma vez ligado nesta vida do
// nó, ele fica ligado mesmo quando a seção fecha de novo. Isso é o que
// deixa REABRIR NO MEIO DA SAÍDA reiniciar a animação de entrada sem
// o hook ter de desligar e religar classe nenhuma — as duas convivem
// no `className` (`abrindo` e `saindo`), e é o CSS quem desempata
// (`.saindo` vence `.abrindo`, `Sanfona.tsx`/`01-base.css`). Uma
// montagem NOVA começa esta conta do zero sozinha, porque é um `useState`
// novo.
//
// O FOCO NUNCA FICA PRESO DENTRO DO QUE ESTÁ SUMINDO (§5, "Fechar"): se
// ele mora no nó que vai sair, a primeira parada — antes de perguntar
// qualquer duração — é o gatilho que abriu isto, achado pelo mesmo
// `aria-controls` que aponta para cá.
// ============================================================
import { useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { duracaoDaSaida, semMovimento } from './useGavetas';

export interface Presenca<T extends HTMLElement> {
  /** o nó deve existir na árvore — aberto, ou ainda saindo */
  montada: boolean;
  /** no meio da saída: o CSS anima, e só depois o nó desmonta */
  saindo: boolean;
  /** abriu AGORA (falso→verdadeiro nesta vida do nó) — nunca na primeira
   *  renderização já aberta, para uma seção aberta por padrão não animar
   *  quando a ficha nasce ou o alvo selecionado troca */
  abrindo: boolean;
  /** onde ancorar o nó que anima — `Sanfona` ou quem chamar direto */
  ref: RefObject<T | null>;
}

/**
 * O SAINDO NOVO, dado que `aberta` ACABOU de mudar (quem chama já
 * conferiu a diferença — a mesma régua de `gavetaQueSai`,
 * `useGavetas.ts`). ABRIU nunca entra em saída, mesmo cancelando uma em
 * curso. FECHOU entra, a menos que não haja movimento nenhum para
 * desenhar (`semMovimentoAgora`: preferência reduzida ou `?shot=`), e aí
 * o commit já desmonta sem fase intermediária.
 */
export const saindoAoMudar = (aberta: boolean, semMovimentoAgora: boolean): boolean =>
  !aberta && !semMovimentoAgora;

/**
 * O ABRINDO NOVO — o TRINCO do cabeçalho deste arquivo. Só ABRIU liga;
 * FECHOU não mexe nele, e é por isso que ele não recebe `semMovimento`
 * nenhum: sem movimento a seção nem passa por `saindo`, mas `abrindo` já
 * pode estar ligado de uma abertura anterior, e cancelar isso a esta
 * altura reabriria a pergunta que o CSS já resolve sozinho.
 */
export const abrindoAoMudar = (abrindoAtual: boolean, aberta: boolean): boolean =>
  abrindoAtual || aberta;

export function usePresenca<T extends HTMLElement>(aberta: boolean): Presenca<T> {
  const ref = useRef<T>(null);
  const [abrindo, setAbrindo] = useState(false);
  const [saindo, setSaindo] = useState(false);

  // O "ANTERIOR" É UM SEGUNDO ESTADO, e não um `useRef` — a mesma razão
  // de `useGavetas.ts`: um ref lido durante o render não faz o
  // componente re-renderizar, e é do re-render ANTES do commit que este
  // ajuste depende. Nasce no valor que `aberta` já tem na montagem, e
  // por isso a primeira passagem é inerte — uma seção aberta por padrão
  // não entra aqui dentro só por existir.
  const [anterior, setAnterior] = useState(aberta);
  if (anterior !== aberta) {
    setAnterior(aberta);
    setAbrindo((atual) => abrindoAoMudar(atual, aberta));
    setSaindo(saindoAoMudar(aberta, semMovimento()));
  }

  /**
   * `useLayoutEffect`, pela mesma razão de `useGavetas.ts`: o foco tem
   * de sair do nó ANTES do primeiro paint em que ele já está saindo, e a
   * duração efetiva (`duracaoDaSaida`) é perguntada ao PRÓPRIO nó — nunca
   * escrita aqui de novo — uma vez por fechamento, nunca por quadro.
   */
  useLayoutEffect(() => {
    if (!saindo) return undefined;
    const no = ref.current;
    if (no?.contains(document.activeElement)) {
      const gatilho = no.id
        ? document.querySelector<HTMLElement>(`[aria-controls="${no.id}"]`)
        : null;
      gatilho?.focus();
    }
    const id = window.setTimeout(() => setSaindo(false), duracaoDaSaida(no));
    return () => window.clearTimeout(id);
  }, [saindo]);

  return { montada: aberta || saindo, saindo, abrindo, ref };
}
