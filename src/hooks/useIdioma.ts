// ============================================================
// A LÍNGUA DENTRO DO REACT — a ponte entre o módulo puro
// (`lib/idioma.ts`) e a árvore que precisa se redesenhar quando ela
// troca.
//
// `useSyncExternalStore` e não `useState` + efeito: o estado da língua
// mora FORA do React (o Director, o selo, as unidades e a máquina do
// tempo leem `idiomaAtual()` sem passar por nenhum componente), e este
// é o gancho que o React tem para uma fonte externa. O snapshot é a
// própria string, então componente que não usa a língua não re-renderiza
// — a igualdade referencial resolve sozinha.
//
// O componente que MOSTRA texto chama `useIdioma()` e depois `t(...)`.
// Não há `t` devolvido pelo hook de propósito: `t` é a MESMA função em
// todo lugar (dentro e fora do React), e um segundo `t` com fechamento
// sobre a língua criaria dois caminhos para a mesma frase.
// ============================================================
import { useSyncExternalStore } from 'react';
import { assinarIdioma, idiomaAtual } from '../lib/idioma';
import type { Idioma } from '../lib/idioma';

export function useIdioma(): Idioma {
  return useSyncExternalStore(assinarIdioma, idiomaAtual, idiomaAtual);
}
