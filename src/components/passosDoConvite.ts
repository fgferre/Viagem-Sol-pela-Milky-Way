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
 * escolher outro objeto, ir até ele. Os `alvo` são os pedaços da dica do
 * rodapé do Atlas (`data-spot` no `App`), e o QUARTO aponta o mesmo
 * pedaço do terceiro de propósito: escolher e ir são o mesmo botão do
 * mouse, e a dica tem uma linha só para os dois.
 */
export const PASSOS_DO_CONVITE_DO_ATLAS: readonly PassoDoConvite[] = [
  { alvo: 'girar', texto: 'convite.girar' },
  { alvo: 'zoom', texto: 'convite.roda' },
  { alvo: 'escolher', texto: 'convite.escolherMouse' },
  { alvo: 'escolher', texto: 'convite.irMouse' },
];

/**
 * OS MESMOS QUATRO GESTOS, NA LÍNGUA DO DEDO (item 62, etapa 2). Até
 * 2026-08-23 o convite do Atlas era PULADO em tela de toque, e a razão
 * escrita era verdadeira: "o gesto do meio é a RODA, que não existe em
 * tela de toque". Com a PINÇA existindo, ela deixou de ser — e um modo
 * que nunca se apresenta ao visitante de telefone é pior que um convite.
 *
 * O QUARTO PASSO GANHA ALVO PRÓPRIO, e é a única diferença de estrutura:
 * no mouse escolher e ir são o MESMO botão, e a dica os junta numa linha
 * ("clique — escolher"); no dedo são dois gestos diferentes, então a
 * dica tem dois pedaços e o convite aponta cada um no seu.
 */
export const PASSOS_DO_CONVITE_DO_ATLAS_TOQUE: readonly PassoDoConvite[] = [
  { alvo: 'girar', texto: 'convite.girar' },
  { alvo: 'zoom', texto: 'convite.pinca' },
  { alvo: 'escolher', texto: 'convite.escolherToque' },
  { alvo: 'ir', texto: 'convite.irToque' },
];

/**
 * UM PASSO DO CONVITE. O `texto` é a CHAVE do dicionário e não a frase
 * (item 130): o convite é remontado a cada render, e a frase sai na
 * língua de agora sem que o roteiro precise existir duas vezes.
 */
export interface PassoDoConvite {
  alvo: string;
  texto: ChaveDeTexto;
}
