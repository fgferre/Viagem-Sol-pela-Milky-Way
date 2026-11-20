import { useState } from 'react';

interface PassoDoRealce {
  valor: unknown;
  calado: unknown;
  vezes: number;
}

/**
 * A DECISÃO, pura: a mudança de `valor` conta — menos quando `calado`
 * mudou JUNTO. `calado` é o motivo que troca o valor sem ser escolha do
 * visitante (a língua: "Terra" virar "Earth" não é confirmar alvo nenhum).
 */
export function passoDoRealce(ant: PassoDoRealce, valor: unknown, calado: unknown): PassoDoRealce {
  if (!Object.is(calado, ant.calado)) return { valor, calado, vezes: ant.vezes };
  if (!Object.is(valor, ant.valor)) return { valor, calado, vezes: ant.vezes + 1 };
  return ant;
}

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
export function useRealce(valor: unknown, calado?: unknown): number {
  const [estado, setEstado] = useState<PassoDoRealce>({ valor, calado, vezes: 0 });
  const novo = passoDoRealce(estado, valor, calado);
  if (novo !== estado) setEstado(novo);
  return estado.vezes;
}
