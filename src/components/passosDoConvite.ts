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
 * O CONVITE DO ATLAS, numa olhada só (primeiro minuto, 12/11/2026). Eram
 * cinco passos com "continuar" sob um véu escuro, e o que mais importa —
 * clicar num nome, a Busca — vinha no quarto: quem chegava girava a vista
 * sem saber que podia escolher um planeta. Agora são TRÊS LINHAS no MESMO
 * cartão, o essencial primeiro, sem véu (`Convite` com `juntos`); o
 * cartão some no primeiro gesto do visitante ou sozinho (`App.tsx`).
 * Sem `alvo`: nada no HUD do Atlas é apontado, o texto basta.
 */
export const PASSOS_DO_CONVITE_DO_ATLAS: readonly PassoDoConvite[] = [
  { alvo: null, texto: 'convite.atlas.escolherMouse' },
  { alvo: null, texto: 'convite.atlas.gestosMouse' },
  { alvo: null, texto: 'convite.atlas.busca' },
];

/** OS MESMOS, NA LÍNGUA DO DEDO (item 62): no mouse escolher e ir são o
 *  mesmo botão; no dedo são toque e toque duplo, e a roda vira a pinça. */
export const PASSOS_DO_CONVITE_DO_ATLAS_TOQUE: readonly PassoDoConvite[] = [
  { alvo: null, texto: 'convite.atlas.escolherToque' },
  { alvo: null, texto: 'convite.atlas.gestosToque' },
  { alvo: null, texto: 'convite.atlas.busca' },
];

/**
 * UM PASSO DO CONVITE. O `texto` é a CHAVE do dicionário e não a frase
 * (item 130): o convite é remontado a cada render, e a frase sai na
 * língua de agora sem que o roteiro precise existir duas vezes.
 *
 * `alvo` é `null` quando o passo NÃO aponta nada — o caso das linhas
 * do Atlas desde que a dica do rodapé saiu do modo (item A1.3,
 * 09/09): o `Spotlight` (`Spotlight.tsx`) já tolera a ausência (sem
 * `data-spot` para casar, o furo não nasce e só o véu com o cartão
 * aparecem). Os três do voo livre continuam com alvo: a dica que eles
 * apontam (`.free-hint`) segue viva lá.
 */
export interface PassoDoConvite {
  alvo: string | null;
  texto: ChaveDeTexto;
}
