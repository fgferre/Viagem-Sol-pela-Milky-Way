// ============================================================
// A PRESENÇA DE UM CONTEÚDO DOBRÁVEL (PLAN-MOTION-UI.md §5, acordeões) —
// abrir→abrindo→aberto→saindo→fechar, a mesma máquina que `useGavetas`
// já dá às cinco gavetas, extraída para servir qualquer seção que
// aparece e some no lugar: as seções da ficha, o "Avançado" dos
// Ajustes, o detalhe do selo. `duracaoDaSaida`, `lerTokens`,
// `semMovimento` e `dobrar` são EMPRESTADAS de lá, não reescritas — um
// segundo relógio, ou uma segunda leitura da preferência de movimento,
// é o que a §5 proíbe.
//
// DOIS JEITOS DE MOVER, UM SÓ ESTADO. Com `dobra` (a `Sanfona`), quem
// anima a linha da grade é `dobrar` (WAAPI, `movimentoDaGaveta.ts`): é o
// que deixa REABRIR NO MEIO DA SAÍDA continuar da altura de agora, e
// fechar no meio da entrada recolher de onde está, em vez de saltar
// (medido em 12/09 com os `@keyframes` de antes: h=0 aos 75 ms da
// reabertura, h=407 aos 75 ms do refechamento). Sem `dobra` (o detalhe
// do selo, o "mais" do filme) o CSS anima pelas classes e o hook só
// espera a duração que o próprio nó declara.
//
// O ABRINDO É UM TRINCO, e não um pulso: uma vez ligado nesta vida do
// nó, ele fica ligado mesmo quando a seção fecha de novo. As duas
// classes convivem no `className` (`abrindo` e `saindo`) e, onde é o
// CSS quem anima (selo, "mais" do filme), é ele quem desempata
// (`.saindo` vence `.abrindo`, com um nome de animação por sentido — o
// navegador só recomeça uma animação CSS quando o nome muda). Uma
// montagem NOVA começa esta conta do zero sozinha, porque é um
// `useState` novo — e é o trinco desligado que diz "primeira
// renderização já aberta: não anime".
//
// O FOCO NUNCA FICA PRESO DENTRO DO QUE ESTÁ SUMINDO (§5, "Fechar"): se
// ele mora no nó que vai sair, a primeira parada — ANTES de perguntar
// qualquer duração, inclusive quando ela é zero — é o gatilho que abriu
// isto, achado pelo mesmo `aria-controls` que aponta para cá. Até 12/09
// o fechamento sem movimento (preferência reduzida, `?shot=`) desmontava
// no mesmo commit sem passar por aqui, e o foco caía no `body`.
// ============================================================
import { useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { dobrar, esperar, lerTokens } from './movimentoDaGaveta';
import { duracaoDaSaida, semMovimento } from './useGavetas';

export interface Presenca<T extends HTMLElement> {
  /** o nó deve existir na árvore — aberto, ou ainda saindo */
  montada: boolean;
  /** no meio da saída: o movimento corre, e só depois o nó desmonta */
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
 * curso. FECHOU entra SEMPRE — mesmo sem movimento nenhum para
 * desenhar: é dentro da saída que o foco volta ao gatilho, e é o efeito
 * de layout (abaixo) que, sem duração, desmonta antes da pintura.
 */
export const saindoAoMudar = (aberta: boolean): boolean => !aberta;

/**
 * O ABRINDO NOVO — o TRINCO do cabeçalho deste arquivo. Só ABRIU liga;
 * FECHOU não mexe nele.
 */
export const abrindoAoMudar = (abrindoAtual: boolean, aberta: boolean): boolean =>
  abrindoAtual || aberta;

/**
 * A FRAÇÃO JÁ ABERTA de uma caixa dobrável — altura da caixa sobre a
 * altura cheia do miolo (o primeiro filho), medida no nó de AGORA: a
 * meio caminho de uma dobra a caixa responde a altura do quadro, e é
 * dali que a intenção nova parte. Sem miolo, ou sem altura, vale 1.
 */
export const fracaoAberta = (alturaDaCaixa: number, alturaCheia: number): number =>
  alturaCheia > 0 ? Math.min(1, Math.max(0, alturaDaCaixa / alturaCheia)) : 1;

export function usePresenca<T extends HTMLElement>(aberta: boolean, dobra = false): Presenca<T> {
  const ref = useRef<T>(null);
  const [abrindo, setAbrindo] = useState(false);
  const [saindo, setSaindo] = useState(false);
  // o ÚLTIMO nó que `dobrar` moveu: um nó recém-montado ainda não é ele,
  // e por isso abre do zero — o mesmo nó reaberto no meio da saída parte
  // da fração medida
  const noDobrado = useRef<T | null>(null);

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
    setSaindo(saindoAoMudar(aberta));
  }

  /**
   * `useLayoutEffect`, pela mesma razão de `useGavetas.ts`: o foco tem
   * de sair do nó ANTES do primeiro paint em que ele já está saindo, e
   * a duração é perguntada uma vez por mudança, nunca por quadro. Roda
   * a cada MUDANÇA de `aberta` (não só na saída): reabrir no meio de uma
   * saída é o que limpa o finalizador velho — o timer, pelo retorno do
   * efeito; a dobra, pelo contador de `dobrar` (a última intenção vence).
   */
  useLayoutEffect(() => {
    const no = ref.current;
    if (!no) return undefined;
    if (!aberta && no.contains(document.activeElement)) {
      const gatilho = no.id
        ? document.querySelector<HTMLElement>(`[aria-controls="${no.id}"]`)
        : null;
      gatilho?.focus();
    }
    if (dobra) {
      // a primeira renderização já aberta não anima: o trinco está
      // desligado, e o nó fica no repouso que o CSS já desenha
      if (aberta && !abrindo) return undefined;
      const miolo = no.firstElementChild;
      const de =
        noDobrado.current === no ? fracaoAberta(no.clientHeight, miolo?.scrollHeight ?? 0) : 0;
      noDobrado.current = no;
      const { duracao, curva } = lerTokens(no, '--t-entrada', '--curva');
      dobrar(
        no,
        aberta ? 1 : 0,
        de,
        { duracao: semMovimento() ? 0 : duracao, curva },
        aberta ? undefined : () => setSaindo(false)
      );
      return undefined;
    }
    if (aberta) return undefined;
    // sem movimento nenhum, `esperar` assenta na hora: o `setState` num
    // efeito de layout re-renderiza de forma síncrona, e o nó desmonta
    // ANTES da pintura, com o foco já devolvido acima
    return esperar(duracaoDaSaida(no), () => setSaindo(false));
  }, [aberta, abrindo, dobra]);

  return { montada: aberta || saindo, saindo, abrindo, ref };
}
