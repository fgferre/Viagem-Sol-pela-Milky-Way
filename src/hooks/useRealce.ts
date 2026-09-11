import { useState } from 'react';

/**
 * QUANTAS VEZES `valor` MUDOU desde que o componente nasceu — 0 enquanto
 * nada mudou. É a chave do REALCE que confirma uma escolha (M3 do plano de
 * motion): quem usa escreve `key={vezes}` no trecho que confirma, o React
 * remonta só aquele trecho a cada mudança e o `@keyframes` toca uma vez.
 *
 * Na primeira pintura NÃO toca: nascer não é confirmar escolha nenhuma, e
 * o painel que abre já tem a própria entrada. Pelo mesmo motivo o contador
 * zera quando o componente desmonta — reabrir a ficha não é trocar de alvo.
 *
 * Guardar o anterior no ESTADO e comparar durante a renderização é o padrão
 * da casa para "reagir quando uma prop muda" (`BarraOuAlcas`, `useGavetas`):
 * sem efeito, sem um quadro pintado com o realce atrasado.
 */
export function useRealce(valor: unknown): number {
  const [anterior, setAnterior] = useState(valor);
  const [vezes, setVezes] = useState(0);
  if (!Object.is(valor, anterior)) {
    setAnterior(valor);
    setVezes(vezes + 1);
  }
  return vezes;
}
