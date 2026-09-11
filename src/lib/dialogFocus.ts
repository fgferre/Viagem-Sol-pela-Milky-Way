// ============================================================
// FOCO PRESO, DEVOLUÇÃO E Esc — o módulo único dos diálogos da casa
// (Onda 5, decisão D7). Antes disto o único diálogo do projeto (o
// painel de Ajustes) declarava `role="dialog"` SEM `aria-modal`, sem
// prender o foco e sem devolvê-lo ao botão que o abriu: quem navega por
// teclado abria o painel e o Tab seguinte caía nos botões do filme
// atrás dele, e fechar deixava o foco no nada.
//
// A casa não tem pasta `hooks/` e não vai ganhar uma por um arquivo:
// isto é uma lib com um hook dentro, ao lado de `preferencias.ts` e
// `glProbe.ts`.
//
// O CONTRATO DE DOM É GENÉRICO, e isso é o ponto: o juiz
// (`scripts/visual/a11y.mjs`) não conhece Ajustes, gaveta nem paleta de
// busca — ele varre os `data-abre-dialogo` que existirem na página,
// clica em cada um, e cobra do `data-dialogo` correspondente as quatro
// promessas (foco entra, foco fica preso, Esc fecha, foco volta ao
// gatilho). Diálogo novo que nasça neste hook é julgado no mesmo dia,
// sem uma linha a mais no juiz; diálogo que nasça fora dele não tem
// como se declarar e não é julgado — por isso todo diálogo do Atlas
// nasce aqui.
//
// A FICHA É A ÚNICA EXCEÇÃO ÀS QUATRO (`modal: false`, abaixo): ela é o
// painel da SELEÇÃO, não uma folha por cima do resto, e o MOUSE já
// escolhe outro corpo com ela aberta (a exceção declarada em
// `director/gestos.ts`) — um `aria-modal="true"` e um Tab preso
// mentiam, para o teclado, um bloqueio que o rato nunca respeitou. Sem
// `aria-modal` e sem prender o Tab, ela ainda cumpre as outras duas
// promessas (o foco entra, o Esc fecha e devolve) — só as duas do
// "isto trava o resto" saem. `scripts/visual/a11y.mjs` ainda cobra as
// quatro de TODO diálogo, sem saber da exceção: julgar a ficha por ele
// hoje reprova por desenho, não por defeito.
// ============================================================
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

/** No elemento do diálogo. O valor é o nome dele (o mesmo do gatilho). */
export const ATRIBUTO_DIALOGO = 'data-dialogo';

/** No botão que abre. O valor casa com o `data-dialogo` que ele abre. */
export const ATRIBUTO_GATILHO = 'data-abre-dialogo';

/**
 * O que é focável por Tab dentro do diálogo. Lista deliberadamente
 * curta: são os controles que a casa usa (botão, caixa, rádio, faixa,
 * seletor, link) mais qualquer coisa que tenha pedido tabindex.
 */
const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), ' +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** As props do BOTÃO que abre um diálogo — o outro lado do contrato. */
export interface PropsDoGatilho {
  'data-abre-dialogo': string;
  'aria-haspopup': 'dialog';
  'aria-expanded': boolean;
}

/**
 * Marca o botão que abre o diálogo `nome`. Além do `aria` que quem ouve
 * a tela espera, é este atributo que o juiz varre: sem ele o diálogo
 * existe mas ninguém sabe COMO abri-lo, e nenhuma das quatro promessas
 * pode ser cobrada.
 */
export function gatilhoDoDialogo(nome: string, aberto: boolean): PropsDoGatilho {
  return {
    [ATRIBUTO_GATILHO]: nome,
    'aria-haspopup': 'dialog',
    'aria-expanded': aberto,
  } as PropsDoGatilho;
}

/** As props que o hook devolve para o elemento-raiz do diálogo. */
export interface PropsDoDialogo {
  ref: RefObject<HTMLDivElement | null>;
  role: 'dialog';
  /** ausente quando `modal: false` (ver `opcoes` de `useDialogFocus`) —
   *  nunca `"false"`: um `aria-modal` presente e falso ainda anuncia
   *  "isto é modal" para muito leitor de tela. */
  'aria-modal'?: true;
  /** o próprio contêiner recebe o foco quando não há controle dentro */
  tabIndex: -1;
  'data-dialogo': string;
}

/**
 * O NOME de quem tomou o foco por último — módulo, não estado: as cinco
 * instâncias do hook (uma por diálogo) não se enxergam por prop nenhuma,
 * e a troca A → B pode fechar A e abrir B no MESMO commit. Sem isto, a
 * ORDEM em que o React re-executa os efeitos de A e B decidiria quem
 * fica com o foco — e às vezes seria A, devolvendo ao SEU gatilho
 * DEPOIS de B já ter posto o foco lá dentro. Com isto, quem abre por
 * último AVISA aqui, e quem fecha só devolve foco se ainda for o dono —
 * do contrário, brigar pelo foco seria roubá-lo de volta de B.
 */
let donoDoFoco: string | null = null;

/**
 * Prende o foco enquanto `aberto`, devolve ao gatilho ao fechar e trata
 * Esc. Espalhe o retorno no elemento-raiz do diálogo:
 *
 *   const dialogo = useDialogFocus('ajustes', aberto, onFechar);
 *   return <div className="ajustes" {...dialogo} aria-label="…">…</div>;
 *
 * Três armadilhas que o código evita de propósito:
 *
 * 1. `aoFechar` NÃO entra na lista de dependências. Quem chama passa uma
 *    arrow inline (`() => setAberto(false)`), que muda de identidade a
 *    cada render; com ela na lista, o efeito reexecutaria a cada render e
 *    o "gatilho" gravado passaria a ser o elemento de DENTRO do diálogo
 *    que estivesse com o foco — a devolução devolveria para si mesma.
 *    O ref de callback resolve sem prender o valor antigo.
 * 2. A devolução checa `isConnected`: o gatilho pode ter desmontado
 *    junto com a fase (a barra de controles some ao trocar de fase), e
 *    `focus()` num nó órfão perde o foco para o `<body>` em silêncio.
 * 3. `aberto` é o FECHAMENTO LÓGICO (`gaveta === nome`), não a presença
 *    visual — quem chama não pode passar a presença (`montada`, que
 *    ainda vale durante a saída animada). Com a presença, a devolução só
 *    corria na DESMONTAGEM, no fim da animação de saída: nesse meio-tempo
 *    o painel que sai vira inert e o foco cai no `<body>` (E2,
 *    PLANO-MOTION-UI.md §12.5 C1.2, medido: `<body>` ~40–130 ms após
 *    Esc). Com o lógico, o efeito abaixo desmonta o TRAP no mesmo commit
 *    em que a intenção muda — e como é `useLayoutEffect`, isso corre
 *    ANTES da pintura, nunca depois.
 */
export function useDialogFocus(
  nome: string,
  aberto: boolean,
  aoFechar: () => void,
  opcoes?: {
    /**
     * ONDE O FOCO ENTRA ao abrir (Lote 2a, PLAN-UI.md §3.4/§11 — a busca
     * no celular por toque quer focar o CABEÇALHO, não o campo de texto,
     * para não abrir o teclado sozinha). `'primeiro'` é o padrão de
     * sempre, IGUAL bit a bit ao comportamento antes desta opção existir:
     * o primeiro focável (pulando `.hud-ajuda`/`.hud-fechar`), ou o
     * próprio contêiner quando o diálogo é só texto. `'caixa'` foca
     * sempre o contêiner, mesmo havendo controles dentro.
     */
    focoInicial?: 'primeiro' | 'caixa';
    /**
     * MODAL PARA O TECLADO — `false` só na ficha (item 74/D7: a EXCEÇÃO
     * de `director/gestos.ts`, que já deixa o CLIQUE escolher outro
     * corpo com a ficha aberta, porque ela é o painel da seleção, não
     * uma folha que o visitante abriu por cima do resto). Com o padrão
     * (`true`) o diálogo declarava `aria-modal="true"` e prendia o Tab
     * enquanto o MOUSE já furava — o teclado mentia um bloqueio que o
     * rato não respeitava. `false` tira as duas coisas: sem
     * `aria-modal`, sem o Tab dar a volta sozinho — o Esc continua
     * fechando e o foco continua entrando ao abrir, porque nenhuma das
     * duas promessas depende de ser modal. `true` é o padrão, IGUAL bit
     * a bit ao comportamento antes desta opção existir.
     */
    modal?: boolean;
  }
): PropsDoDialogo {
  const focoInicial = opcoes?.focoInicial ?? 'primeiro';
  const modal = opcoes?.modal ?? true;
  const ref = useRef<HTMLDivElement>(null);
  const fechar = useRef(aoFechar);
  // efeito sem lista: roda depois de TODO render, e é a única forma
  // permitida de manter o ref em dia (escrever `fechar.current` no corpo
  // do componente é escrita durante o render — o lint barra, com razão)
  useEffect(() => {
    fechar.current = aoFechar;
  });

  useLayoutEffect(() => {
    if (!aberto) return;
    // AVISA que é o dono do foco agora — antes de focar qualquer coisa,
    // para uma troca A → B no mesmo commit já achar isto trocado quando
    // a saída de A for decidir se devolve (ver o comentário no fim).
    donoDoFoco = nome;
    const caixa = ref.current;
    if (!caixa) return;
    // o foco de ANTES é só a reserva — quem manda é o gatilho declarado
    // (ver a devolução, no fim deste efeito)
    const focoAnterior = document.activeElement as HTMLElement | null;

    // `getClientRects` e não `offsetParent`: o HUD inteiro vive em
    // `position: fixed`, onde o offsetParent de um filho é o contêiner
    // fixo — a checagem clássica não distingue escondido de fixo.
    const focaveis = () =>
      Array.from(caixa.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(
        (el) => el.getClientRects().length > 0
      );

    // o foco ENTRA: no primeiro controle, ou no próprio contêiner quando
    // o diálogo é só texto
    // …pulando o botão de ajuda (`.hud-ajuda`) e o de fechar
    // (`.hud-fechar`): com o foco no primeiro o balão abre sozinho ao
    // abrir a folha (foto do Tempo, 06/09), e no segundo o gesto mais
    // comum (Tab, Tab, Enter) fecharia o diálogo que acabou de abrir.
    const lista0 = focaveis();
    (focoInicial === 'caixa'
      ? caixa
      : lista0.find((e) => !e.classList.contains('hud-ajuda') && !e.classList.contains('hud-fechar')) ??
        lista0[0] ??
        caixa
    ).focus({
      // sem rolar: focar um controle no meio da folha enquanto ela sobe
      // rolava a folha e quebrava o juiz do celular (medido 3 de 3, 06/09)
      preventScroll: true,
    });

    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        fechar.current();
        return;
      }
      if (event.key !== 'Tab') return;
      // NÃO MODAL: o Tab segue o caminho normal da página — só a ficha
      // usa isto, e é o teclado alcançando o que o mouse já podia (a
      // exceção de `director/gestos.ts`, escolher outro corpo com a
      // ficha aberta).
      if (!modal) return;
      const lista = focaveis();
      if (lista.length === 0) {
        // nada focável dentro: o Tab não tem para onde ir e sair seria
        // vazar o foco para o filme atrás do diálogo
        event.preventDefault();
        caixa.focus();
        return;
      }
      const primeiro = lista[0];
      const ultimo = lista[lista.length - 1];
      const atual = document.activeElement;
      if (event.shiftKey && (atual === primeiro || atual === caixa)) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && atual === ultimo) {
        event.preventDefault();
        primeiro.focus();
      }
    };

    caixa.addEventListener('keydown', aoTeclar);
    return () => {
      caixa.removeEventListener('keydown', aoTeclar);
      // A DEVOLUÇÃO VAI AO GATILHO DECLARADO, e a procura é feita AGORA,
      // na hora de fechar. Antes ela ia para o que estivesse com o foco
      // quando o diálogo abriu, e isso bastou enquanto os diálogos da
      // casa se fechavam um de cada vez pelo Esc. Com o terceiro (a
      // paleta da busca) apareceu o caso em que aquilo mentia: abrir um
      // diálogo FECHA o outro, e a devolução do que fecha corre no MESMO
      // commit, ANTES de o que abre olhar para o foco — o diálogo novo
      // adotava o gatilho do antigo e, ao fechar, devolvia o foco a um
      // botão que ninguém tinha apertado. Medido no juiz de a11y: abrir
      // a busca com a gaveta aberta terminava com o foco no ⚙ Ajustes.
      //
      // Procurar na hora também sobrevive a re-render: o nó do botão
      // pode ter sido recriado desde a abertura, e um nó órfão engole o
      // foco em silêncio (daí o `isConnected` da reserva).
      //
      // SE JÁ NÃO SOU O DONO, outro diálogo abriu no mesmo commit (troca
      // A → B) e já pôs o foco onde devia — devolver aqui seria roubá-lo
      // de volta para o gatilho de QUEM SAIU. Só o dono atual devolve.
      if (donoDoFoco !== nome) return;
      donoDoFoco = null;
      const gatilho =
        document.querySelector<HTMLElement>(`[${ATRIBUTO_GATILHO}="${nome}"]`) ??
        focoAnterior;
      if (gatilho?.isConnected) gatilho.focus();
    };
  }, [aberto, nome, focoInicial, modal]);

  return {
    ref,
    role: 'dialog',
    // AUSENTE quando não modal, nunca `false`: `undefined` some do DOM
    // (React omite o atributo); um `aria-modal="false"` continuaria
    // anunciando "isto é um diálogo modal" para quem ouve a tela.
    ...(modal ? { 'aria-modal': true as const } : {}),
    tabIndex: -1,
    [ATRIBUTO_DIALOGO]: nome,
  } as PropsDoDialogo;
}
