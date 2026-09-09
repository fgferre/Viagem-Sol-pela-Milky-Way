// Os roteiros do convite (os gestos que o visitante aprende, na ordem),
// fora de Spotlight.tsx porque um arquivo de componente só pode exportar
// componentes para o fast refresh do Vite funcionar (regra do eslint).
import type { ChaveDeTexto } from '../lib/idioma';

/**
 * OS TRÊS GESTOS. Os `alvo` são os pedaços da dica de voo (`data-spot`
 * no `App`), e a cópia é a mesma coisa dita por extenso — a dica é
 * telegrama porque fica na tela o tempo todo; o convite passa uma vez.
 */
export const PASSOS_DO_CONVITE: readonly PassoDoConvite[] = [
  { alvo: 'olhar', texto: 'convite.olhar' },
  { alvo: 'voar', texto: 'convite.voar' },
  { alvo: 'visitar', texto: 'convite.visitar' },
];

/**
 * OS QUATRO GESTOS DO ATLAS (item 73, 22/08), na ordem em que se
 * aprendem: girar em volta do que está em quadro, aproximar com a roda,
 * escolher outro objeto, ir até ele. SEM ALVO (item A1.3, relatório de
 * UI de 09/09): os quatro apontavam pedaços da dica do rodapé do Atlas
 * (`.free-hint`, `data-spot` no `App`), que saiu do modo — o Spotlight
 * já tolera `alvo: null` (sem recorte, só o véu e o cartão), e é o que
 * os quatro passos usam agora. O QUARTO repete o texto do terceiro de
 * propósito: escolher e ir são o mesmo botão do mouse, e a dica tinha
 * uma linha só para os dois.
 */
export const PASSOS_DO_CONVITE_DO_ATLAS: readonly PassoDoConvite[] = [
  { alvo: null, texto: 'convite.girar' },
  { alvo: null, texto: 'convite.roda' },
  { alvo: null, texto: 'convite.escolherMouse' },
  { alvo: null, texto: 'convite.irMouse' },
];

/**
 * OS MESMOS QUATRO GESTOS, NA LÍNGUA DO DEDO (item 62, etapa 2). Até
 * 2026-08-23 o convite do Atlas era PULADO em tela de toque, e a razão
 * escrita era verdadeira: "o gesto do meio é a RODA, que não existe em
 * tela de toque". Com a PINÇA existindo, ela deixou de ser — e um modo
 * que nunca se apresenta ao visitante de telefone é pior que um convite.
 *
 * SEM ALVO, como o roteiro do mouse (item A1.3, 09/09) — a diferença de
 * estrutura entre os dois roteiros não é mais o `alvo` (nenhum dos oito
 * passos aponta nada), e sim só o TEXTO: no mouse escolher e ir são o
 * MESMO botão ("clique — escolher"); no dedo são dois gestos diferentes,
 * e cada um ganha a própria chave.
 */
export const PASSOS_DO_CONVITE_DO_ATLAS_TOQUE: readonly PassoDoConvite[] = [
  { alvo: null, texto: 'convite.girar' },
  { alvo: null, texto: 'convite.pinca' },
  { alvo: null, texto: 'convite.escolherToque' },
  { alvo: null, texto: 'convite.irToque' },
];

/**
 * UM PASSO DO CONVITE. O `texto` é a CHAVE do dicionário e não a frase
 * (item 130): o convite é remontado a cada render, e a frase sai na
 * língua de agora sem que o roteiro precise existir duas vezes.
 *
 * `alvo` é `null` quando o passo NÃO aponta nada — o caso dos quatro
 * passos do Atlas desde que a dica do rodapé saiu do modo (item A1.3,
 * 09/09): o `Spotlight` (`Spotlight.tsx`) já tolera a ausência (sem
 * `data-spot` para casar, o furo não nasce e só o véu com o cartão
 * aparecem). Os três do voo livre continuam com alvo: a dica que eles
 * apontam (`.free-hint`) segue viva lá.
 */
export interface PassoDoConvite {
  alvo: string | null;
  texto: ChaveDeTexto;
}
