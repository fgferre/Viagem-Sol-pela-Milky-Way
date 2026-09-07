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
// Esc de sempre (`useDialogFocus`, que fecha o painel).
// ============================================================
import { useState } from 'react';
import type { KeyboardEvent } from 'react';

/** A decisão pura do Esc (§8): com dica presa, ele é DELA — solta e para
 *  aí; sem dica presa, ele segue para quem já o escutava (fechar o
 *  painel). `consome` é o que decide `stopPropagation()`. */
export function decidirEscDaDica(tecla: string, dicaPresa: string | null): { consome: boolean } {
  return { consome: tecla === 'Escape' && dicaPresa != null };
}

export function useDicaPresa() {
  const [presa, setPresa] = useState<string | null>(null);
  const alternar = (id: string) => setPresa((atual) => (atual === id ? null : id));
  const limpar = () => setPresa(null);
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
