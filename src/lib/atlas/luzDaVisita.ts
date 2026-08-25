// ============================================================
// A SEGUNDA LEI DE LUZ DA CASA — a EXPOSIÇÃO DA VISITA (item 91).
//
// `luz.ts` guarda a primeira: `ganhoFundido(dUA)`, a irradiância
// heliocêntrica. Ela é a lei do PONTO no céu — Vênus brilha, Netuno
// some — e continua inteira. Este arquivo guarda a segunda, e ela só
// vale para o GLOBO que o visitante alcançou.
//
// O DIAGNÓSTICO DO DONO, 2026-08-25, palavra por palavra: *o app colou
// a regra de uma coisa na outra*. Existem duas coisas diferentes:
//
//   1. O PONTINHO NO CÉU. Quanto mais longe do Sol, mais fraco. É o céu
//      de verdade, e a casa já o acerta (MH18 em `planetas.ts` — que
//      NÃO passa por aqui nem por `ganhoFundido`).
//   2. O GLOBO QUANDO SE CHEGOU. O Sol ilumina aquele mundo ALI, e a
//      imagem se ajusta a isso. A distância se lê pelo TAMANHO do
//      disco, não pelo quão preto o mármore ficou.
//
// Saturno recebe mesmo ~1/90 da luz que a Terra recebe, e isso não é
// mentira. Mentira é fotografar a visita com o ISO da Terra: nem o
// olho, nem a Cassini, nem o NASA Eyes fazem isso. O 1/d² no globo
// visitado não é realismo — é a regra certa no endereço errado.
//
// ------------------------------------------------------------
// AS TRÊS DECISÕES DO DONO (2026-08-25) — fecham o desenho
// ------------------------------------------------------------
//  1. MODO ASSISTIDO (o padrão): dia claro em TODOS os corpos
//     visitados, como Cassini/Eyes — a "exposição de foto" da visita.
//  2. MODO REAL (`?luz=real`): a penumbra FÍSICA verdadeira no globo —
//     E(d) de verdade, Saturno visivelmente mais escuro que a Terra. O
//     app conserva uma posição 1:1.
//  3. A porta é de DUAS VIAS: alterna real↔assistida ao vivo, sem
//     recarregar (o selo; ver `HudDoAtlas.tsx` e `useEspelhoDaUrl.ts`).
//
// A decisão 2 CONTRARIA o §11.1 do relatório
// `docs/reference/nasa-eyes-iluminacao-planetas.md`, que propunha
// ganho 1 no globo TAMBÉM em `real`. A decisão do dono prevalece: o
// relatório carrega o ⚠️ e o ponteiro para cá.
//
// ------------------------------------------------------------
// O MECANISMO — a lei continua viva, com um consumidor
// ------------------------------------------------------------
// NÃO é "ganho = 1 seco". Apagar o 1/d² e chamar isso de conserto
// mataria a lei em vez de a endereçar. O escalar da malha passa a ser
// um PRODUTO de dois termos que se conhecem:
//
//     uLuzGanho(globo) = ganhoFundido(dUA vivo) × compensacaoDaVisita(corpo)
//
//   - `ganhoFundido(dUA)` continua sendo a lei física, avaliada na
//     distância heliocêntrica VIVA (a mesma de sempre);
//   - `compensacaoDaVisita(corpo)` é uma CONSTANTE por corpo, tabelada
//     nesta página e em lugar nenhum mais. Em `assistida` ela vale
//     1/ganhoFundido(distância característica do corpo) — o produto dá
//     ~1; em `real` vale 1 EXATO — o produto volta a ser E(d).
//
// Isto NÃO é auto-exposição: o número não olha o quadro, não olha a
// câmera e não olha o relógio. É o ISO que uma câmera escolheria UMA
// vez para aquele mundo, e é o mesmo em todo instante da órbita — a
// alavanca que o dono reprovou (`PLANO-ATLAS.md`, `NORTE.md`) é a que
// mede o que está em quadro, e continua recusada.
//
// O RESÍDUO É FÍSICA, NÃO ERRO. Como a compensação é constante e a
// lei é viva, o produto não é exatamente 1: vale (dRef/d)^(2σ). Um
// mundo no periélio fica mais claro que ele mesmo no afélio — Éris,
// hoje perto do afélio, sai ~20% abaixo do próprio 1. É o único sinal
// de distância que sobrevive à exposição da visita, e sobrevive de
// propósito.
//
// A TERRA NÃO SE MEXE, e não por sorte. A distância da visita dela é
// `ANCORA_UA` — a MESMA constante em que `luz.ts` normaliza a lei
// inteira ("a Terra a 1 UA lê 1"). Logo a compensação dela é 1 exato,
// o produto é o mesmo double de antes, e Terra e Lua saem bit a bit
// idênticas ao que já estava na tela. O teste o cobra sob `Object.is`.
//
// ------------------------------------------------------------
// O QUE ESTA LEI NÃO GOVERNA
// ------------------------------------------------------------
//  - O PONTO no céu (`planetas.ts`, MH18/PSF): não consome nem
//    `ganhoFundido` nem esta compensação. O relatório do Grok afirma o
//    contrário em §11.1/§11.6 e está errado; a correção está lá.
//  - A ORDEM de brilho entre corpos. Ela continua verdadeira no PONTO,
//    que é onde o céu se lê. No globo visitado a ordem é, de propósito,
//    a da fotografia: cada mundo exposto para si. O selo declara o
//    gasto exato, corpo a corpo, em passos de luz (`stopsDaVisita`).
// ============================================================
import { ASTEROIDS, CATALOG_TNOS, SATELLITES } from './elementosOrbitais';
import { ANCORA_UA, ganhoFundido, irradianciaRelativa } from './luz';
import type { PoliticaDeLuz } from './luz';

/**
 * O SEMIEIXO MAIOR dos nove planetas, em UA — a distância
 * característica de cada um ao Sol, e por isso a distância da VISITA.
 *
 * PROVENIÊNCIA: JPL SSD, "Keplerian Elements for Approximate Positions
 * of the Major Planets" (Standish), coluna `a` da tabela 1, válida
 * 1800–2050. Dado publicado, transcrito verbatim — nunca ajustado à
 * mão para arrumar uma imagem.
 *
 * A TERRA É A EXCEÇÃO DECLARADA, e a única. A tabela dá 1,00000261 UA;
 * aqui ela entra como {@link ANCORA_UA} = 1, que é a mesma normalização
 * que `luz.ts` já usa para a lei inteira ("a Terra a 1 UA lê 1"). Não é
 * arredondamento: é a âncora, e é ela que faz a compensação da Terra
 * valer 1 EXATO e o globo de casa não mover um bit nesta obra. Trocar
 * este valor pelo da tabela move Terra e Lua ~1,2%, o que é uma
 * regressão nas vistas oficiais do filme e não um refinamento.
 *
 * Os outros 29 corpos resolvidos NÃO entram aqui: derivam-se
 * (`distanciaDaVisitaUA`) do dado orbital que a casa já tem.
 */
export const SEMIEIXO_DOS_PLANETAS_UA: Readonly<Record<string, number>> = {
  mercury: 0.38709927,
  venus: 0.72333566,
  earth: ANCORA_UA,
  mars: 1.52371034,
  jupiter: 5.202887,
  saturn: 9.53667594,
  uranus: 19.18916464,
  neptune: 30.06992276,
  pluto: 39.48211675,
};

/**
 * A DISTÂNCIA DA VISITA de um corpo resolvido, em UA — a distância
 * heliocêntrica característica em que a exposição dele é escolhida.
 * `null` para quem esta casa não conhece (e aí a visita não compensa
 * nada: o corpo fica com a lei crua, o comportamento de antes do 91).
 *
 * As quatro fontes, nesta ordem, e nenhuma lista redigitada:
 *
 *  1. os nove planetas — {@link SEMIEIXO_DOS_PLANETAS_UA};
 *  2. a LUA — a distância da Terra. Uma lua é visitada à distância do
 *     pai: Titã está a 9,5 UA do Sol porque Saturno está, e a foto de
 *     Titã é exposta como a de Saturno. O ~0,008 UA que a separa do pai
 *     não move a exposição de nada que se veja;
 *  3. as 20 luas analíticas — `SATELLITES[id].parent`, resolvido
 *     recursivamente (Caronte → Plutão, Titã → Saturno…);
 *  4. os 4 asteroides (`ASTEROIDS[id].aAU`) e os TNOs
 *     (`CATALOG_TNOS[id].elements.aAU`), que já são heliocêntricos.
 */
export function distanciaDaVisitaUA(idCorpo: string): number | null {
  const planeta = SEMIEIXO_DOS_PLANETAS_UA[idCorpo];
  if (planeta !== undefined) return planeta;
  if (idCorpo === 'moon') return SEMIEIXO_DOS_PLANETAS_UA.earth!;
  const satelite = SATELLITES[idCorpo];
  if (satelite) return distanciaDaVisitaUA(satelite.parent);
  const asteroide = ASTEROIDS[idCorpo];
  if (asteroide) return asteroide.aAU;
  const tno = CATALOG_TNOS[idCorpo];
  if (tno) return tno.parent === 'sun' ? tno.elements.aAU : distanciaDaVisitaUA(tno.parent);
  return null;
}

/**
 * A TABELA VIVA da compensação `assistida`, uma entrada por corpo que
 * esta casa sabe visitar. Assada UMA vez na carga do módulo: o `pow`
 * não pode morar no laço de quadro, e a compensação é constante por
 * construção — se ela mudasse por quadro, seria a auto-exposição que o
 * dono recusou.
 */
export const COMPENSACAO_DA_VISITA: Readonly<Record<string, number>> =
  Object.freeze(
    Object.fromEntries(
      [
        ...Object.keys(SEMIEIXO_DOS_PLANETAS_UA),
        'moon',
        ...Object.keys(SATELLITES),
        ...Object.keys(ASTEROIDS),
        ...Object.keys(CATALOG_TNOS),
      ].map((id) => [id, 1 / ganhoFundido(distanciaDaVisitaUA(id)!, 'assistida')])
    )
  );

/**
 * A COMPENSAÇÃO DA VISITA de um corpo — o segundo termo do produto, e o
 * único que a obra 91 acrescentou à cadeia.
 *
 * - `real` → **1 exato**, para todo corpo. O produto volta a ser E(d)
 *   bit a bit: a penumbra física verdadeira, decisão 2 do dono.
 * - `assistida` → 1/ganhoFundido(distância da visita), a constante da
 *   tabela. Corpo desconhecido → 1 (nunca um caminho terceiro: a lei
 *   crua é o piso seguro).
 */
export function compensacaoDaVisita(idCorpo: string, politica: PoliticaDeLuz): number {
  if (politica === 'real') return 1;
  return COMPENSACAO_DA_VISITA[idCorpo] ?? 1;
}

/**
 * O ESCALAR ÚNICO que o material de um corpo RESOLVIDO multiplica na
 * sua luz direta — `uLuzGanho` de gigante, rochoso, lua, Terra e anel.
 * Continua sendo UM uniforme e UM produto (o anti-padrão 1 do doador é
 * lei física em duas camadas que NÃO SE CONHECEM; estes dois termos se
 * conhecem, e é exatamente o conserto legítimo).
 *
 * Distância não-finita devolve **1**, o mesmo neutro que
 * `irradianciaRelativa` sempre entregou — lua sem efeméride não pinta
 * de preto nem estoura de luz; fica como estava.
 */
export function ganhoDoGlobo(
  dUA: number,
  idCorpo: string,
  politica: PoliticaDeLuz
): number {
  if (!Number.isFinite(dUA)) return 1;
  return ganhoFundido(dUA, politica) * compensacaoDaVisita(idCorpo, politica);
}

/**
 * O QUE O SELO DECLARA: quantos passos de luz o globo desta visita está
 * exposto ACIMA (ou abaixo) da luz física que o corpo realmente recebe.
 *
 *     stops = log2( ganhoDoGlobo(d) / E(d) )
 *
 * Números do desenho: Saturno **+6,5**, Netuno **+9,8**, Éris **+12,8**,
 * Júpiter **+4,7** — e Mercúrio **−2,4**, porque a visita também DOMA
 * quem está perto demais. A Terra sai em ~0: a âncora não gasta nada.
 *
 * Em `real` é **0 exato** por construção (o ganho É E(d)), e o selo tem
 * o direito de dizer que não há nada a declarar. Distância não-finita
 * devolve `null` — o selo nunca inventa um número que não mediu.
 */
export function stopsDaVisita(
  dUA: number,
  idCorpo: string,
  politica: PoliticaDeLuz
): number | null {
  if (!Number.isFinite(dUA)) return null;
  const razao = ganhoDoGlobo(dUA, idCorpo, politica) / irradianciaRelativa(dUA);
  if (!Number.isFinite(razao) || razao <= 0) return null;
  const stops = Math.log2(razao);
  return stops === 0 ? 0 : stops;
}
