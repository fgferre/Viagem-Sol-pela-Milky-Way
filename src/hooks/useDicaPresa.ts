// ============================================================
// A DICA FIXA POR CLIQUE (Ajustes, 05/09) — só uma por vez. Extraído do
// painel de Ajustes para servir também a gaveta de Camadas (06/09): as
// duas telas usam o mesmo "?" (`components/Ajuda.tsx`) e precisam do
// mesmo estado — fixar a de baixo apaga a de cima.
//
// O Esc COM DICA PRESA (Lote 2a, PLAN-UI.md §5/§8): antes, cada painel
// (Ajustes, as duas gavetas, a busca, a ficha) escrevia o MESMO
// `onKeyDownCapture` à mão — cinco cópias da mesma decisão. `aoTeclarEsc`
// é essa decisão, uma vez, pronta para espalhar em qualquer diálogo:
//
//   <div onKeyDownCapture={aoTeclarEsc} ...>
//
// `decidirEscDaDica` é a REGRA PURA por trás (testável sem DOM, sem
// React — o runner da casa é `node`): com dica presa, Esc consome o
// evento (solta a dica e PÁRA aí); sem dica presa, deixa passar para o
// Esc de sempre (`useDialogFocus`, que fecha o painel). Desde o design do
// dono de 09/09, só existe pino no TOQUE (`components/Ajuda.tsx` decide
// isso pelo clique) — em quem tem mouse `presa` nunca liga, e por isso o
// Esc vai direto fechar o painel, sem o estágio do meio.
//
// O TOQUE FORA FECHA (mesmo design, 09/09) — cada painel (`onClick={()
// => { if (dicaPresa) limparDica(); }}` no próprio `<div>` do diálogo)
// já tentava isso pela BOLHA, e é frágil: qualquer controle no caminho
// que chame `stopPropagation()` no PRÓPRIO clique — outro "?", um
// `<label>` de caixa de seleção, um botão do segmentado — barra o clique
// antes de chegar lá (o bug relatado pelo dono: a dica fixada por mouse
// nunca soltava sozinha). `aoTocarFora`, abaixo, resolve isso por
// CAPTURA no `document`: roda ANTES de qualquer `stopPropagation()` da
// bolha, então nenhum controle no meio do caminho consegue escondê-la.
//
// A DICA FLUTUA POR CIMA (Lote 9, pedido do dono: "flutuar por cima,
// nunca empurrar o layout") — `Ajuda.tsx` a desenha com `createPortal`
// direto em `document.body`, então a posição não é mais CSS (`top:
// calc(100% + …)`), é conta: `posicionarDica`, abaixo, é essa conta,
// PURA e testável com números soltos (sem DOM, sem `getBoundingClientRect`
// de verdade) — quem lê o layout é o componente; esta função só decide
// onde a caixa cai, dado o que o componente mediu.
// ============================================================
import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';

/** A decisão pura do Esc (§8): com dica presa, ele é DELA — solta e para
 *  aí; sem dica presa, ele segue para quem já o escutava (fechar o
 *  painel). `consome` é o que decide `stopPropagation()`. */
export function decidirEscDaDica(tecla: string, dicaPresa: string | null): { consome: boolean } {
  return { consome: tecla === 'Escape' && dicaPresa != null };
}

/** O formato de `getBoundingClientRect()` — um `DOMRect` real serve
 *  direto, sem conversão; nos testes é só um objeto literal. */
export interface RetanguloDeReferencia {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/** A folga entre o botão "?" e a caixa (Lote 9, contrato do dono). */
export const DICA_GAP_PX = 6;
/** A margem que a caixa nunca cruza — nem a do limite, nem a da janela. */
export const DICA_MARGEM_PX = 8;
/** O teto de largura, em rem — a mesma unidade do resto do HUD (cresce
 *  com `?ui=`, por isso quem chama converte para px com `escalaDaUi()`). */
export const DICA_LARGURA_MAXIMA_REM = 22;

/**
 * ONDE A DICA CAI (Lote 9) — largura, e depois `top`/`left` já
 * grampeados. Recebe o retângulo do BOTÃO (`ancora`), o do painel mais
 * próximo ou a janela (`limite`), o tamanho JÁ RENDERIZADO da caixa
 * (`caixa` — só a altura entra na conta daqui: a largura é um
 * RESULTADO, não uma entrada) e o da janela.
 *
 * LARGURA: o menor dos três tetos — 22rem (convertido por `pxPorRem`,
 * que seguindo a régua de `App.tsx`/`uiScale.ts` é `16 × escalaDaUi()`
 * fora do teste), o limite menos duas margens, a janela menos duas
 * margens.
 *
 * HORIZONTAL: a borda esquerda começa colada na do botão, depois é
 * grampeada dentro do limite E da janela (as duas — um painel mais
 * estreito que a janela não deixa a caixa vazar por ele mesmo perto da
 * borda da tela).
 *
 * VERTICAL: abaixo do botão por padrão; sobe para CIMA só quando não
 * cabe abaixo antes do pé da janela (menos a margem) — a mesma decisão
 * que a barra de Tempo já tomava por CSS (`.atlas-rodape .hud-dica`),
 * agora em número.
 */
export function posicionarDica(entrada: {
  ancora: RetanguloDeReferencia;
  limite: RetanguloDeReferencia;
  caixa: { largura: number; altura: number };
  janela: { largura: number; altura: number };
  pxPorRem?: number;
}): { top: number; left: number; largura: number } {
  const { ancora, limite, caixa, janela } = entrada;
  const pxPorRem = entrada.pxPorRem ?? 16;

  const largura = Math.min(
    DICA_LARGURA_MAXIMA_REM * pxPorRem,
    limite.width - 2 * DICA_MARGEM_PX,
    janela.largura - 2 * DICA_MARGEM_PX
  );

  // grampeada no LIMITE primeiro — um painel mais estreito que a caixa
  // (`Math.max` no teto) ainda assim gruda na margem esquerda dele
  const limiteMin = limite.left + DICA_MARGEM_PX;
  const limiteMax = Math.max(limiteMin, limite.right - DICA_MARGEM_PX - largura);
  let left = Math.min(Math.max(ancora.left, limiteMin), limiteMax);
  // ...e de novo na JANELA — belt-and-suspenders para o caso raro de o
  // próprio limite vazar a tela
  const janelaMin = DICA_MARGEM_PX;
  const janelaMax = Math.max(janelaMin, janela.largura - DICA_MARGEM_PX - largura);
  left = Math.min(Math.max(left, janelaMin), janelaMax);

  const cabeAbaixo = ancora.bottom + DICA_GAP_PX + caixa.altura <= janela.altura - DICA_MARGEM_PX;
  const top = cabeAbaixo
    ? ancora.bottom + DICA_GAP_PX
    : ancora.top - DICA_GAP_PX - caixa.altura;

  return { top, left, largura };
}

export function useDicaPresa() {
  const [presa, setPresa] = useState<string | null>(null);
  const alternar = (id: string) => setPresa((atual) => (atual === id ? null : id));
  const limpar = () => setPresa(null);

  /**
   * O TOQUE FORA FECHA (design do dono, 09/09) — ver o cabeçalho. Roda só
   * enquanto HÁ dica presa (nunca liga em quem tem mouse, onde `presa`
   * não existe) e ouve `pointerdown` — antes do `click`, e antes de
   * qualquer `stopPropagation()` que a bolha do clique venha a sofrer.
   *
   * TODO "?" fica de fora do gatilho, não só o preso: tocar o MESMO "?"
   * tem de deixar o `onClick` dele (`Ajuda.tsx`) alternar (desligar)
   * sozinho — se esta função chamasse `limpar()` primeiro, o `alternar`
   * leria `presa` já nula e a religaria (`atual === id` daria falso
   * contra `null`). Tocar OUTRO "?" também passa livre: o `onClick` dele
   * troca o pino sem ajuda daqui (`alternar` não olha o valor antigo).
   * Sobra para fechar por aqui: qualquer toque que NÃO é em nenhum "?".
   */
  useEffect(() => {
    if (presa == null) return undefined;
    const aoTocarFora = (evento: PointerEvent) => {
      const alvo = evento.target;
      if (alvo instanceof Element && alvo.closest('.hud-ajuda')) return;
      limpar();
    };
    document.addEventListener('pointerdown', aoTocarFora, true);
    return () => document.removeEventListener('pointerdown', aoTocarFora, true);
  }, [presa]);

  /**
   * O handler reutilizável de `onKeyDownCapture`. A CAPTURA é o que
   * garante rodar ANTES do listener de fechar que `useDialogFocus` prende
   * no mesmo nó, na fase de bolha — `stopPropagation()` aqui impede o Esc
   * de sequer chegar lá.
   */
  const aoTeclarEsc = (evento: KeyboardEvent<HTMLElement>) => {
    if (!decidirEscDaDica(evento.key, presa).consome) return;
    evento.stopPropagation();
    limpar();
  };
  return { presa, alternar, limpar, aoTeclarEsc };
}
