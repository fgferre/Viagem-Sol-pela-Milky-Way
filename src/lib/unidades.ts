// ============================================================
// AS UNIDADES QUE O VISITANTE LÊ — uma escada, uma função, um lugar.
//
// A REGRA DA CASA (decisão do dono, 2026-08-11): quilômetros no par
// lua↔pai, UA perto de casa, ANOS-LUZ nas estrelas. O parsec é régua
// interna do motor e NÃO aparece na tela — as posições do mundo 3D
// seguem em pc, e é aqui que elas viram texto.
//
// POR QUE ESTE ARQUIVO EXISTE (2026-08-14). A escada estava escrita
// QUATRO vezes, com quatro resultados diferentes para a mesma estrela:
//
//   `buscaEstrelas.notaDeDistancia`  km/UA, vírgula ....... "8,6 anos-luz"
//   `PaletaDeBusca.distanciaEmAnosLuz` anos-luz, vírgula
//   `LabelCanvas.formatDistance`     UA/AL, `toFixed` ...... "8.6 AL"
//   `director.emitDest`              AL, `toFixed` ......... "8.6 AL"
//
// Duas grafias da mesma unidade ("AL" e "anos-luz") e dois separadores
// decimais na MESMA tela — o rótulo da estrela dizia "8.6 AL" enquanto
// a paleta de busca, a um palmo dele, dizia "8,6 anos-luz". As QUATRO
// saem daqui: as três primeiras desde 2026-08-14, e a quarta
// (`director.emitDest`, a linha de rumo "→ ALNILAM · 1913 anos-luz")
// no acabamento do mesmo dia — é a chamada de uma linha em
// `three/director.ts:1521`. Não sobra cópia; se aparecer uma quinta,
// ela é um bug, não uma exceção.
//
// A GRAFIA ESCOLHIDA é a por extenso. "AL" é abreviação de astrônomo, e
// a razão de o dono ter pedido ano-luz em vez de parsec foi justamente
// a unidade CARREGAR o significado ("a luz levou X anos"); abreviar a
// devolve para o jargão de que ela veio.
//
// `formatar` entra INJETADO, como já entrava: o formatador pt-BR da
// casa (`numeroPtBr`) mora em `three/tempoDoAtlas`, e importá-lo daqui
// inverteria a seta (lib pura não depende do three).
// ============================================================
import { AU_KM } from './atlas/elementosOrbitais';

/**
 * Anos-luz por parsec. É o número que as quatro cópias já usavam — e
 * fica aqui para que ele seja UM, e não quatro literais soltos.
 */
export const AL_POR_PC = 3.262;

/** UA por ano-luz (63.241,08 exatos; a casa sempre contou com o inteiro) */
export const UA_POR_AL = 63_241;

/**
 * UA por parsec — o número EXATO, não o produto dos dois de cima.
 *
 * A primeira versão deste módulo derivava `AL_POR_PC × UA_POR_AL` e saía
 * com **206.292,14**, contra os 206.264,81 verdadeiros: 0,013% de erro,
 * porque os dois fatores acima são arredondamentos de EXIBIÇÃO, não a
 * conta. Um módulo que nasceu para acabar com quatro cópias divergentes
 * não pode nascer sendo a quinta, e errada.
 *
 * O valor vem da definição da IAU — um parsec é a distância em que 1 UA
 * subtende 1 segundo de arco, logo `648.000/π` UA. Escrito como a conta,
 * e não como literal, para não haver dígito para envelhecer.
 *
 * SEGUNDA CÓPIA DECLARADA: `three/world/planetas/planetas.ts:148` exporta
 * o mesmo símbolo como `1 / AU_PARA_PC` (`lib/atlas/frameGalactico.ts:84`,
 * `1/206_264.80624548031`). As duas concordam até a 11ª casa. Se um dia
 * divergirem, esta é a que manda: as outras são recíprocos de um literal.
 */
export const UA_POR_PC = 648_000 / Math.PI;

/** abaixo disto a distância fala QUILÔMETROS (o par lua↔pai) */
const UA_MINIMA = 0.1;

/** abaixo disto a distância fala UA (0,1 al ≈ 6.324 UA) */
const AL_MINIMO = 0.1;

/**
 * A NOTA DE DISTÂNCIA, em UA na entrada e em pt-BR na saída. Devolve
 * `null` quando não há medida (NaN, zero, negativo) — quem chama
 * escreve o nome sem número, nunca um número inventado. Foi assim que
 * o Sol deixou de dizer "0 UA" no próprio rótulo.
 *
 * OS DEGRAUS, de baixo para cima:
 *
 *   < 0,1 UA ......... km ("9378 km", "384 mil km" acima de 10 mil)
 *   < 0,1 al ......... UA ("1 UA", "35,4 UA")
 *   < 100 al ......... anos-luz com a décima ("8,6 anos-luz")
 *   < 10 mil al ...... anos-luz inteiros (a décima já é menor que a
 *                      incerteza da paralaxe — seria ruído)
 *   acima ............ milhares ("26 mil anos-luz")
 *
 * O limiar de 0,1 UA é o da emenda P-E10a: nenhuma órbita de PLANETA é
 * sub-UA (Mercúrio: 0,39) e nenhuma lua do catálogo orbita a mais de
 * 0,1 UA do pai (Jápeto, a mais larga: 0,024).
 *
 * O plural começa em 2, como no rótulo da taxa da máquina do tempo:
 * em pt-BR "1,5 ano-luz" é singular e "2,8 anos-luz" é plural.
 */
export function notaDeDistancia(
  ua: number,
  formatar: (v: number) => string
): string | null {
  if (!Number.isFinite(ua) || ua <= 0) return null;

  if (ua < UA_MINIMA) {
    const km = ua * AU_KM; // o conversor único da casa, importado
    if (km >= 10_000) return `${formatar(Math.round(km / 1000))} mil km`;
    return `${formatar(Math.round(km))} km`;
  }

  const al = ua / UA_POR_AL;
  if (al < AL_MINIMO) return `${formatar(ua)} UA`;

  const unidade = al < 2 ? 'ano-luz' : 'anos-luz';
  if (al < 100) return `${formatar(al)} ${unidade}`;
  if (al < 10_000) return `${formatar(Math.round(al))} ${unidade}`;
  return `${formatar(al / 1000)} mil anos-luz`;
}
