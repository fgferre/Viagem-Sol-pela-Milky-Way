// ============================================================
// A SEGUNDA LEI DE LUZ DA CASA — a EXPOSIÇÃO DA VISITA (item 91) e a
// RECEITA DO GLOBO do NASA Eyes (item 93).
//
// `luz.ts` guarda a primeira lei: `ganhoFundido(dUA)`, a irradiância
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
// olho, nem a Cassini, nem o NASA Eyes fazem isso.
//
// ------------------------------------------------------------
// AS TRÊS DECISÕES DO DONO (2026-08-25) — fecham o desenho
// ------------------------------------------------------------
//  1. MODO ASSISTIDO (o padrão): dia claro em TODOS os corpos
//     visitados, como Cassini/Eyes — a "exposição de foto" da visita.
//  2. MODO REAL (`?luz=real`): a penumbra FÍSICA verdadeira no globo —
//     E(d) de verdade, Lambert cru, Saturno visivelmente mais escuro
//     que a Terra. O app conserva uma posição 1:1.
//  3. A porta é de DUAS VIAS: alterna real↔assistida ao vivo, sem
//     recarregar (o selo; ver `HudDoAtlas.tsx` e `useEspelhoDaUrl.ts`).
//
// ------------------------------------------------------------
// O QUE O ITEM 93 MUDOU — de "o dia ficou claro" para A RECEITA
// ------------------------------------------------------------
// Pedido do dono em 2026-08-25: *"quero que o nosso conserte isso para
// ficar igual ao algortimo usado no nasa eyes"*. Não é "parecido": é o
// mesmo algoritmo de globo do modo padrão deles, o **Shadow Lighting**,
// lido no fonte e escrito em
// `docs/reference/nasa-eyes-brilho-assistido-contrato.md`.
//
// O item 91 pagou o DIA com um produto —
// `ganhoFundido(dUA vivo) × compensacaoDaVisita(corpo)` — que dava ~1
// mas deixava um resíduo `(dRef/d)^(2σ)` do 1/d² do PONTO dentro do
// globo. Mercúrio saía 0,88 e Saturno 0,99. **Esse resíduo morreu.** Em
// `assistida` o Sol no globo vale **1 literal**, como em
// `MaterialUtils.setLightSourceUniforms` do Eyes (que multiplica a cor
// da luz por 1 e IGNORA a magnitude absoluta escrita no cadastro).
// Com o Sol = 1, a compensação por corpo não tem mais o que compensar e
// saiu inteira — a tabela de semieixos, a cadeia de distância da visita
// e a constante por corpo. A lei continua viva onde ela é lei: em
// `ganhoFundido` e no modo `real`.
//
// AS TRÊS PEÇAS DA RECEITA, e todas nascem NESTE arquivo:
//
//   a. SOL = 1 em `assistida` — {@link ganhoDoGlobo};
//   b. LANTERNA DE LEITURA de 15 % na câmera — {@link LANTERNA_DE_LEITURA},
//      o `toggleCameraLight(true, Color(0.15,0.15,0.15))` do default
//      deles. Ela não sofre eclipse nem sombra de anel (no Eyes o raio
//      da luz de câmera é −1), e a soma satura em 1: a lanterna lê a
//      NOITE e não clareia o subsolar;
//   c. TERMINADOR LOGÍSTICO s = 3 — {@link S_DO_TERMINADOR} e
//      {@link EXPR_TERMINADOR}, o `MaterialUtilsPhong` deles. Flanco a
//      N·L = 0,5 sobe de 0,50 para 0,72 (+43 %).
//
// O QUE NÃO ATRAVESSOU, e por quê (o contrato §3): o ambiente 0,02 de
// cena (anti-padrões 3 e 9 — a lanterna já lê a noite), o flood branco
// (apaga o terminador), o ×2 mágico do anel (a casa tem espalhamento de
// camada, melhor física) e o Phong deles na Lua (o disco chato de
// Lommel-Seeliger é o fato da foto; ali o Eyes é PIOR que a casa).
//
// ------------------------------------------------------------
// A LOGÍSTICA É DA `assistida`, E ISSO É DECISÃO DECLARADA
// ------------------------------------------------------------
// O terminador logístico não é física de corpo sem ar: ele levanta
// N·L = 0,2 para 0,36. Em `real` a casa promete *penumbra física
// verdadeira*, e um terminador inventado ali seria a decisão 2 do dono
// desfeita por dentro. Por isso `s` também é POLÍTICA — {@link sDoTerminador}
// devolve 0 em `real`, e 0 significa "Lambert cru, `max(N·L, 0)`". As
// três peças acendem e apagam JUNTAS, por um único interruptor.
//
// ------------------------------------------------------------
// O QUE ESTA LEI NÃO GOVERNA
// ------------------------------------------------------------
//  - O PONTO no céu (`planetas.ts`, MH18/PSF): não consome nem
//    `ganhoFundido` nem nada daqui.
//  - A ORDEM de brilho entre corpos. Ela continua verdadeira no PONTO,
//    que é onde o céu se lê. No globo visitado a ordem é, de propósito,
//    a da fotografia: cada mundo exposto para si. O selo declara o
//    gasto exato, corpo a corpo, em passos de luz (`stopsDaVisita`).
//  - O ANEL. Ele bebe o mesmo `uLuzGanho` do globo (Sol = 1 junto), mas
//    não recebe lanterna nem logística: o modelo dele é camada de
//    partículas com função de fase, e um fill de câmera por cima
//    quebraria o I/F ancorado em Voyager/Cassini.
//  - AS CASCAS DA TERRA. Nuvens e atmosfera ficam como estavam — o
//    contrato manda mexer no `ndotl` da direta de `TERRA_FRAG` e diz,
//    com todas as letras, que "as cidades e o Nishita ficam".
// ============================================================
import { ganhoFundido, irradianciaRelativa } from './luz';
import type { PoliticaDeLuz } from './luz';

/**
 * A LANTERNA DE LEITURA — a segunda luz do Shadow Lighting do Eyes,
 * presa à câmera, em `Color(0.15, 0.15, 0.15)`.
 *
 * O PAPEL DELA É A NOITE. Somada DEPOIS do Sol e saturada em 1, ela não
 * tem o que acrescentar no subsolar (o Sol já está no teto lá) e acende
 * o lado escuro que olha para quem olha. É o que faz o globo do Eyes ser
 * legível de qualquer ângulo sem um piso de ambiente chapado — o piso
 * 0,02 deles a casa recusa por doutrina (anti-padrões 3 e 9).
 *
 * NÃO SOFRE ECLIPSE NEM SOMBRA DE ANEL, como no Eyes (a luz de câmera
 * tem raio −1 lá, isto é, fica fora da lista de oclusores). Uma lanterna
 * que a sombra de Titã apagasse não seria lanterna: seria uma terceira
 * fonte de luz na cena, e a casa tem UMA.
 */
export const LANTERNA_DE_LEITURA = 0.15;

/**
 * O `s` do terminador logístico do Phong do Eyes — 3, o literal do
 * `MaterialUtilsPhong` deles.
 *
 * A curva, com este s (a tabela do contrato §1.2): N·L cru 1,00 → 1,00;
 * 0,50 → 0,72; 0,20 → 0,36; 0,00 → 0,05; negativo → 0. É o que dá o
 * flanco +43 % e a borda macia que a casa não tinha.
 *
 * O Eyes divide este s por `1 + 700·densidade` onde há atmosfera; em
 * Saturno (densidade 5e−5) isso o levaria a 2,899. O véu de Saturno é o
 * §4.4 do contrato e NÃO pousou nesta rodada — quando pousar, é aqui que
 * a divisão entra, e o uniforme já é por material.
 */
export const S_DO_TERMINADOR = 3;

/**
 * A CURVA DO TERMINADOR, escrita UMA VEZ SÓ.
 *
 * Esta expressão é válida em GLSL e em JavaScript ao mesmo tempo: o
 * shader a interpola dentro de `terminadorSuave` (ver
 * {@link GLSL_LUZ_DA_VISITA}) e o teste a EXECUTA com `Math.exp` para
 * cobrar a tabela do Eyes. Não existem duas fórmulas para divergirem —
 * que é a doença que o item 99 nomeia (pino de texto que envelhece
 * enquanto o código melhora).
 *
 * `x` é o cosseno de incidência CRU (pode ser negativo — o Eyes o
 * alimenta sem clamp) e `s` é a dureza. O clamp em [0,1] mora fora, no
 * chamador, porque é ele que faz o lado noturno ser preto.
 */
export const EXPR_TERMINADOR = '2.0 * (1.0 + exp(-s)) / (1.0 + exp(-s * x)) - 1.0';

/**
 * A SOMA QUE SATURA EM 1, pela mesma disciplina de {@link EXPR_TERMINADOR}:
 * uma expressão só, válida em GLSL (sobre `vec3`) e em JS (sobre
 * `number`), que o shader interpola e o teste executa.
 *
 * `max(luzSol, min(luzSol + fill, teto))` é `saturate(luzSol + fill)`
 * SEMPRE que `luzSol ≤ 1` — o caso da `assistida`, que é onde a lanterna
 * existe — e é a IDENTIDADE onde o Sol sozinho já passa de 1: o modo
 * `real` em Mercúrio (E = 6,7) e o realce de limbo do Lommel-Seeliger.
 * Cortar ali seria teto de brilho, e o `NORTE.md` o proíbe em letra.
 */
export const EXPR_LUZ_DO_GLOBO = 'max(luzSol, min(luzSol + fill, teto))';

/**
 * O ESCALAR ÚNICO que o material de um corpo RESOLVIDO multiplica na sua
 * luz direta — `uLuzGanho` de gigante, rochoso, lua, Terra e anel.
 *
 * - `assistida` → **1 literal**. É o Sol do Eyes: a cor da luz vezes 1,
 *   sem 1/d² e sem resíduo. O globo visitado é exposto para si.
 * - `real` → `ganhoFundido(dUA, 'real')` = E(d) EXATO, bit a bit, o
 *   mesmo double de sempre — a decisão 2 do dono, intacta.
 *
 * Distância não-finita devolve **1**, o mesmo neutro que
 * `irradianciaRelativa` sempre entregou — lua sem efeméride não pinta de
 * preto nem estoura de luz; fica como estava.
 */
export function ganhoDoGlobo(dUA: number, politica: PoliticaDeLuz): number {
  if (!Number.isFinite(dUA)) return 1;
  return politica === 'real' ? ganhoFundido(dUA, 'real') : 1;
}

/**
 * A LANTERNA que a política liga: 0,15 em `assistida`, **0 exato** em
 * `real`. Zero não é "quase nada": com ele o termo de fill some por
 * identidade algébrica e o modo real fica com o Sol e nada mais.
 */
export function lanternaDaVisita(politica: PoliticaDeLuz): number {
  return politica === 'real' ? 0 : LANTERNA_DE_LEITURA;
}

/**
 * O `s` que a política liga: 3 em `assistida`, **0 em `real`** — e 0 é a
 * convenção declarada de "sem suavização": o shader devolve
 * `max(N·L, 0)`, o Lambert cru de antes desta obra, sem um bit de
 * diferença.
 */
export function sDoTerminador(politica: PoliticaDeLuz): number {
  return politica === 'real' ? 0 : S_DO_TERMINADOR;
}

/** O molde estrutural de um `uniforms` de `THREE.ShaderMaterial` — sem
 *  importar three: esta pasta é lib pura, e o eclipse já fez assim. */
type Uniformes = Record<string, { value: unknown }>;

/**
 * OS DOIS UNIFORMES da receita, no estado NEUTRO (a `real`): lanterna 0
 * e `s` 0. Todo material que inclui {@link GLSL_LUZ_DA_VISITA} espalha
 * este bloco, e é `escreverLuzDaVisita` quem os acende por quadro.
 */
export function uniformsDaLuzDaVisita(): Uniformes {
  return {
    uLanternaLeitura: { value: 0 },
    uTerminadorS: { value: 0 },
  };
}

/**
 * O ÚNICO ESCRITOR dos dois uniformes — as cinco classes de corpo o
 * chamam, nenhuma redigita 0,15 nem 3. É o que impede a receita de
 * virar quatro cópias (contrato §4.5).
 */
export function escreverLuzDaVisita(u: Uniformes, politica: PoliticaDeLuz): void {
  u.uLanternaLeitura!.value = lanternaDaVisita(politica);
  u.uTerminadorS!.value = sDoTerminador(politica);
}

/**
 * O GLSL COMPARTILHADO da receita — um helper por peça, e as peças
 * moram todas aqui. Quem inclui este chunk NÃO redeclara os uniformes.
 *
 * `terminadorSuave` — a logística do Eyes. `uTerminadorS <= 0` é a
 * convenção de "Lambert cru" (o modo real), e o ramo devolve
 * `max(x, 0.0)`: o MESMO valor que o shader calculava antes desta obra.
 *
 * `lanternaDeLeitura` — o fill da câmera, JÁ multiplicado pelas sombras
 * do quadro. Ver a divergência declarada logo abaixo.
 *
 * `luzDoGlobo` — a soma que satura em 1. O teto vale só para o que a
 * LANTERNA acrescenta: onde o Sol sozinho já passa de 1 — o modo `real`
 * em Mercúrio (E = 6,7) e o realce de limbo do Lommel-Seeliger — o teto
 * NÃO morde. Cortar ali seria teto de brilho, e o `NORTE.md` o proíbe em
 * letra. Com a lanterna em 0 a função é a identidade, bit a bit.
 *
 * ------------------------------------------------------------
 * A DIVERGÊNCIA DECLARADA — a lanterna RESPEITA a sombra
 * ------------------------------------------------------------
 * O §4.2 do contrato manda a lanterna entrar "SEM eclipse e SEM sombra
 * de anel", porque no Eyes a luz de câmera tem raio −1 e nenhum oclusor
 * a alcança. **A casa diverge, e a foto é a razão.** Implementada ao pé
 * da letra, a lanterna não escurece a umbra: ela a INVERTE. Medido em
 * 25/08, no mesmo binário, com os dois caminhos:
 *
 *   eclipse solar 08/04/2024, núcleo da umbra sobre Durango, de 255:
 *     item 91 . . . . . . . . . 2,76  contra 24,4 do vizinho  (8,8×)
 *     lanterna sem sombra . .  42,21  contra 30,5 do vizinho  (0,7×)
 *     lanterna com sombra . . . 2,80  contra 28,1 do vizinho (10,0×)
 *
 *   Lua eclipsada 27/07/2018, cor do disco (R/B do cobre de Danjon):
 *     item 91 . . . . . . 34,1/19,4/8,0   R/B 4,28
 *     lanterna sem sombra 43,2/29,6/19,3  R/B 2,24  (o cobre esmaece)
 *     lanterna com sombra 37,4/21,4/8,4   R/B 4,47
 *
 * A umbra ficava MAIS CLARA que o deserto ao lado — a totalidade
 * literalmente saía do mapa —, e o cobre de Danjon perdia metade da sua
 * razão vermelho/azul. São dois fatos MEDIDOS que a auditoria do item 91
 * conferiu contra a realidade (a umbra caiu em Durango, por onde a
 * totalidade passou), e trocá-los por um fill de câmera é a mesma pressa
 * que o contrato recusa em quatro outras linhas (o ambiente 0,02, o
 * flood, o ×2 do anel, o Phong na Lua).
 *
 * O CONSERTO NÃO CUSTA NADA À LANTERNA. As duas sombras valem **1 no
 * lado noturno** por construção (a de eclipse tem o portão do lado
 * próximo e o fade pelo terminador; a do anel só existe com N·L > 0), e
 * a noite é justamente onde a lanterna trabalha. Ela perde exatamente o
 * que não devia ter: o direito de acender uma sombra.
 */
export const GLSL_LUZ_DA_VISITA = /* glsl */ `
uniform float uLanternaLeitura; // 0,15 em assistida; 0 em real
uniform float uTerminadorS;     // 3 em assistida; 0 = Lambert cru (real)

float terminadorSuave(float x) {
  if (uTerminadorS <= 0.0) return max(x, 0.0);
  float s = uTerminadorS;
  return clamp(${EXPR_TERMINADOR}, 0.0, 1.0);
}

vec3 lanternaDeLeitura(vec3 n, vec3 dirCam, vec3 sombras) {
  return (uLanternaLeitura * clamp(dot(n, dirCam), 0.0, 1.0)) * sombras;
}

vec3 luzDoGlobo(vec3 luzSol, vec3 fill) {
  vec3 teto = vec3(1.0);
  return ${EXPR_LUZ_DO_GLOBO};
}
`;

/**
 * O QUE O SELO DECLARA: quantos passos de luz o globo desta visita está
 * exposto ACIMA (ou abaixo) da luz física que o corpo realmente recebe.
 *
 *     stops = log2( ganhoDoGlobo(d) / E(d) )
 *
 * Com o Sol = 1 do item 93 a conta fica exata e legível: em `assistida`
 * são `−log2(E(d))`, isto é, **2·log2(d)** — Saturno a 9,7 UA declara
 * +6,6; Netuno +9,8; Éris +12,2; e Mercúrio **−2,2**, porque a visita
 * também DOMA quem está perto demais do Sol. A Terra sai em ~0: a
 * âncora da lei é 1 UA e ali não há nada a gastar.
 *
 * Em `real` é **0 exato** por construção (o ganho É E(d)), e o selo tem
 * o direito de dizer que não há nada a declarar. Distância não-finita
 * devolve `null` — o selo nunca inventa um número que não mediu.
 */
export function stopsDaVisita(dUA: number, politica: PoliticaDeLuz): number | null {
  if (!Number.isFinite(dUA)) return null;
  const razao = ganhoDoGlobo(dUA, politica) / irradianciaRelativa(dUA);
  if (!Number.isFinite(razao) || razao <= 0) return null;
  const stops = Math.log2(razao);
  return stops === 0 ? 0 : stops;
}
