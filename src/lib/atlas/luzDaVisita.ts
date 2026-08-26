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
// AS PEÇAS DA RECEITA, e todas nascem NESTE arquivo:
//
//   a. SOL = 1 em `assistida` — {@link ganhoDoGlobo};
//   b. LANTERNA DE LEITURA de 15 % na câmera — {@link LANTERNA_DE_LEITURA},
//      o `toggleCameraLight(true, Color(0.15,0.15,0.15))` do default
//      deles. A soma satura em 1: a lanterna lê a NOITE e não clareia o
//      subsolar. Aqui ela RESPEITA as sombras do Sol, e é a única
//      divergência da casa — a razão está medida em
//      {@link GLSL_LUZ_DA_VISITA};
//   c. TERMINADOR LOGÍSTICO s = 3 — {@link S_DO_TERMINADOR} e o
//      `terminadorSuave` de {@link GLSL_LUZ_DA_VISITA}, o
//      `MaterialUtilsPhong` deles. Flanco a N·L = 0,5 sobe de 0,50 para
//      0,72 (+43 %).
//   d. O VÉU PALHA DE SATURNO — {@link VEU_DE_SATURNO} e o
//      {@link GLSL_VEU_DE_SATURNO}, o `AtmosphereComponent` deles. É a
//      quarta peça, o §4.4 do contrato, e a última a pousar: uma mistura
//      no LIMBO, depois da superfície, que só o SOL acende;
//   e. A TRADUÇÃO DO COMPOSTO DE TELA — `daTelaParaLinear` em
//      {@link GLSL_LUZ_DA_VISITA}, a **C1** que ele escolheu em 26/08
//      (*"o Eyes ao pé da letra"*). Os números da receita do Eyes são
//      BYTES DE TELA, e atravessavam para o nosso fragmento em LINEAR: a
//      mesma receita saía 2,66× mais clara na noite. É a lição do
//      {@link COR_DO_VEU} aplicada ao termo de LUZ — e nada mais mudou,
//      porque 0,15 e s = 3 continuam os números do Eyes.
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
// peças da receita acendem e apagam JUNTAS, por um único interruptor —
// e desde 26/08 a TRADUÇÃO (peça e) anda nele também: `uTerminadorS <= 0`
// é a convenção de "Lambert cru", e é ela que apaga as quatro em `real`.
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
import { BODY_AXES } from './iauOrientation';
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
 * NO EYES ELA NÃO SOFRE OCLUSÃO NENHUMA (a luz de câmera tem raio −1
 * lá). **A casa diverge**, e a razão está medida no cabeçalho de
 * {@link GLSL_LUZ_DA_VISITA}: ao pé da letra a lanterna INVERTE a umbra
 * de um eclipse total. Ela respeita as duas sombras do Sol e não perde
 * nada com isso — as duas valem 1 no lado noturno, que é onde ela
 * trabalha.
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
 * O Eyes divide este s por `1 + 700·densidade` onde há atmosfera. Com o
 * §4.4 pousado, Saturno passa a ter densidade e a divisão ACONTECE: o s
 * dele cai para 2,8986 ({@link sDoTerminador}), o vazamento no terminador
 * sobe de 4,98 % para 5,51 % e o flanco cede 1 %. Os outros três gigantes,
 * os rochosos, a Terra e a Lua continuam em 3 — nenhum deles tem véu
 * nesta casa, e o uniforme é por material.
 */
export const S_DO_TERMINADOR = 3;

/**
 * O `700` do `sharpness /= 1 + 700 * atmosphereDensity` do Eyes — um
 * literal do `MaterialUtilsPhong` deles, não uma razão R/H desta casa.
 * Fica nomeado porque é ele quem transforma a densidade do véu em borda
 * mais macia, e um número solto no meio de uma divisão é como uma
 * constante mágica se instala.
 */
export const FATOR_DA_ATMOSFERA_NO_TERMINADOR = 700;

/**
 * O VÉU PALHA DE SATURNO — o `postCreateFunction` do Saturno no NASA
 * Eyes, §1.4 do contrato, lido no fonte deles em 24/08.
 *
 * SÃO SEIS NÚMEROS LÁ, e três deles não viram código AQUI, de propósito:
 *
 *  - `sunBrightness` **1**: é o multiplicador do Sol sobre o véu, e 1 é a
 *    identidade. Escrever `× 1` no shader seria enfeite; o que o número
 *    diz é que o véu NÃO ganha um brilho próprio acima da luz que o
 *    globo recebe naquele ponto — e é isso que {@link GLSL_VEU_DE_SATURNO}
 *    faz ao acendê-lo com o MESMO `luzSol` da superfície.
 *  - `sunsetIntensity` **0**: o Eyes avermelha a atmosfera da TERRA no
 *    poente (1,2 lá). Em Saturno é zero — a palha não muda de cor no
 *    terminador, só de intensidade. Um termo de poente multiplicado por
 *    zero seria código morto; o que existe é a AUSÊNCIA dele, e o juiz
 *    cobra a ausência medindo que a croma do véu não se mexe com o Sol.
 *  - `emissivity` **0**: o véu não brilha sozinho. É o número que protege
 *    a decisão 2 do dono — em `?luz=real` a palha continua multiplicada
 *    por E(d) e por `terminadorSuave` cru, então a noite do véu é PRETA e
 *    o dia dele é 1/90. Uma casca com emissividade acenderia Saturno por
 *    fora da física, e é exatamente o que este 0 proíbe.
 *
 * OS TRÊS QUE VIRAM CÓDIGO são a densidade, a escala de altura e a cor.
 * A cor entra em BYTES sRGB porque é assim que ela está escrita lá; esta
 * casa é gerenciada por cor (as texturas decodificam de sRGB e o quadro
 * sai por ACES), então quem atravessa para o shader é
 * {@link COR_DO_VEU}, a mesma palha em LINEAR.
 */
export const VEU_DE_SATURNO = {
  /** km — `scaleHeight` do Eyes */
  escalaDeAlturaKm: 200,
  /** por km — `density` do Eyes, a densidade ao nível de referência */
  densidadePorKm: 5e-5,
  /** bytes sRGB — `color` do Eyes, (234, 202, 151)/255 */
  corEmBytesSRgb: [234, 202, 151] as const,
} as const;

/** sRGB → linear, a curva da IEC 61966-2-1. A casa não tinha esta peça
 *  porque nunca precisou trazer uma cor de FORA em bytes de tela. */
function deSRgbParaLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * A PALHA DO EYES EM LINEAR — (234, 202, 151)/255 decodificada, que dá
 * (0,8228; 0,5906; 0,3095).
 *
 * Por que decodificar: no Eyes a cor entra num caminho que não gerencia
 * espaço, isto é, ela É o que se vê na tela. Aqui o albedo do mapa já
 * chega em linear (o sampler decodifica, `texturas.ts`) e o quadro sai
 * por ACES + sRGB. Misturar bytes de tela com um albedo linear pintaria
 * um véu claro demais e lavado — a mesma classe de erro que pôr um
 * normal map em sRGB, e igualmente silenciosa.
 */
export const COR_DO_VEU: readonly [number, number, number] = [
  deSRgbParaLinear(VEU_DE_SATURNO.corEmBytesSRgb[0] / 255),
  deSRgbParaLinear(VEU_DE_SATURNO.corEmBytesSRgb[1] / 255),
  deSRgbParaLinear(VEU_DE_SATURNO.corEmBytesSRgb[2] / 255),
];

/**
 * QUEM TEM VÉU NESTA CASA: só Saturno, e o contrato diz por quê. A Terra
 * do Eyes também declara atmosfera (densidade 0,0015), mas aqui ela tem
 * NISHITA — física de espalhamento de verdade, melhor que o glow deles —,
 * e o §4.4 escreve "Só Saturno" com todas as letras. Corpo sem véu devolve
 * 0, e 0 é a convenção de "sem atmosfera": o `s` fica em 3 exato e a
 * mistura no limbo é a identidade.
 */
export function densidadeDoVeu(id: string): number {
  return id === 'saturn' ? VEU_DE_SATURNO.densidadePorKm : 0;
}

/**
 * A COLUNA VERTICAL do véu, adimensional — a profundidade óptica de quem
 * olha o subsolar de cima: `∫₀^∞ ρ₀·e^(−z/H) dz = ρ₀·H`. Em Saturno,
 * 5e−5 × 200 km = **0,01**. É a única leitura das duas grandezas do Eyes
 * que fecha em unidades, e é ela que dá a dose do véu.
 */
export function colunaVerticalDoVeu(id: string): number {
  const densidade = densidadeDoVeu(id);
  return densidade === 0 ? 0 : densidade * VEU_DE_SATURNO.escalaDeAlturaKm;
}

/**
 * A ESPESSURA DA CASCA EQUIVALENTE, em unidades do raio EQUATORIAL — o
 * modelo que este véu usa no lugar de integrar a exponencial em cinco
 * passos como o Eyes.
 *
 * A IDEIA: trocar a atmosfera exponencial por uma casca UNIFORME de
 * espessura T, dentro da qual a coluna vertical vale exatamente a mesma
 * `ρ₀H`. O caminho de um raio até a superfície tem forma fechada — é uma
 * raiz quadrada, sem laço e sem `erfc` —, e T sai de uma exigência, não
 * de gosto: que a coluna RASANTE também bata com a da atmosfera de
 * verdade. A coluna rasante exponencial é a função de Chapman no limite,
 * `√(πR/2H)`; a da casca é `√(2R/T)`; igualar as duas dá
 *
 *     T = 4H/π  (≈ 1,273 H — 254,6 km em Saturno)
 *
 * e com ela o modelo acerta os DOIS extremos por construção: 1 no
 * subsolar e 21,76 no limbo. Entre eles ele interpola por baixo da
 * secante — que é o sentido certo do erro, porque a esfericidade sempre
 * reduz o caminho em relação a `1/μ`. A APROXIMAÇÃO DECLARADA é usar o
 * raio EQUATORIAL num corpo achatado: nos polos de Saturno o véu fica
 * ~5 % mais espesso do que este modelo pinta, num efeito que já é de
 * poucos pixels.
 */
export function espessuraDoVeu(id: string): number {
  const raioEquatorialKm = BODY_AXES[id]?.[0];
  if (!raioEquatorialKm || densidadeDoVeu(id) === 0) return 0;
  return (4 / Math.PI) * (VEU_DE_SATURNO.escalaDeAlturaKm / raioEquatorialKm);
}

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
 *
 * E O VÉU MEXE NELE. Onde há atmosfera o Eyes amacia mais o terminador —
 * `sharpness /= 1 + 700·density` —, e com o §4.4 pousado Saturno passa a
 * entrar por aqui com `densidade` 5e−5: o s dele vira 2,8986. Densidade 0
 * (todo o resto da casa) devolve `S/(1+0)`, isto é, 3 **exato**.
 */
export function sDoTerminador(politica: PoliticaDeLuz, densidade = 0): number {
  if (politica === 'real') return 0;
  return S_DO_TERMINADOR / (1 + FATOR_DA_ATMOSFERA_NO_TERMINADOR * densidade);
}

/** O molde estrutural de um `uniforms` de `THREE.ShaderMaterial` — sem
 *  importar three: esta pasta é lib pura, e o eclipse já fez assim. */
type Uniformes = Record<string, { value: unknown }>;

/**
 * OS DOIS UNIFORMES da receita, no estado NEUTRO (a `real`): lanterna 0
 * e `s` 0. Todo material que inclui {@link GLSL_LUZ_DA_VISITA} espalha
 * este bloco, e é `escreverLuzDaVisita` quem os acende por quadro.
 *
 * SÃO DOIS, e voltaram a ser dois em 26/08: a calibração do item 93 abriu
 * mais duas chaves (`uTraduzDaTela`, `uLanternaDepois`) para a porta de
 * instrumento `?calib=` escolher entre as três candidatas. Ele escolheu a
 * C1, ela virou o PADRÃO, e chave de escolha sem escolha a fazer é peso
 * morto: a tradução passou a andar no MESMO interruptor das outras três
 * peças — ver {@link GLSL_LUZ_DA_VISITA}.
 */
export function uniformsDaLuzDaVisita(): Uniformes {
  return {
    uLanternaLeitura: { value: 0 },
    uTerminadorS: { value: 0 },
  };
}

/**
 * O ÚNICO ESCRITOR dos dois uniformes — as QUATRO classes de corpo o
 * chamam (`Gigante`, `Rochoso`, `Lua`, `Terra`), nenhuma redigita 0,15
 * nem 3. O anel fica de fora de propósito: ele bebe o `uLuzGanho` do
 * globo e nada mais (ver "O QUE ESTA LEI NÃO GOVERNA", acima). É o que
 * impede a receita de virar quatro cópias (contrato §4.5).
 *
 * `densidade` é a do véu do corpo ({@link densidadeDoVeu}) e só Saturno a
 * traz diferente de zero; quem não passa nada fica com o s = 3 de sempre.
 *
 * E `uTerminadorS` CARREGA MAIS DO QUE A SUAVIDADE desde 26/08: é ele o
 * interruptor que o chunk lê para acender ou apagar a TRADUÇÃO da C1
 * ({@link GLSL_LUZ_DA_VISITA}). Um corpo que o escrevesse sem passar a
 * política acenderia a curva do Eyes dentro do `?luz=real` — a decisão 2
 * do dono desfeita por dentro. Há dente disso nas quatro famílias.
 */
export function escreverLuzDaVisita(
  u: Uniformes,
  politica: PoliticaDeLuz,
  densidade = 0
): void {
  u.uLanternaLeitura!.value = lanternaDaVisita(politica);
  u.uTerminadorS!.value = sDoTerminador(politica, densidade);
}

/**
 * OS TRÊS UNIFORMES DO VÉU, resolvidos POR CORPO na hora em que o
 * material nasce — e escritos uma vez só, porque nenhum deles muda com o
 * quadro: a coluna é do corpo, a espessura é do corpo, e a cor é a palha
 * do Eyes. Quem manda o véu acender e apagar com a luz da visita não é
 * este bloco: é o `luzSol` que {@link GLSL_VEU_DE_SATURNO} recebe, o
 * MESMO que a superfície usa — com o ganho, o terminador e as sombras
 * daquele quadro já dentro.
 *
 * Corpo sem véu recebe coluna 0, e o chunk devolve a identidade.
 */
export function uniformsDoVeu(id: string): Uniformes {
  return {
    uVeuColuna: { value: colunaVerticalDoVeu(id) },
    uVeuEspessura: { value: espessuraDoVeu(id) },
    uVeuCor: { value: [...COR_DO_VEU] },
  };
}

/**
 * O GLSL COMPARTILHADO da receita — um helper por peça, e as peças
 * moram todas aqui. Quem inclui este chunk NÃO redeclara os uniformes.
 *
 * ------------------------------------------------------------
 * ESTE TEXTO É A RECEITA, E É ELE QUE O JUIZ EXECUTA
 * ------------------------------------------------------------
 * As três funções abaixo não têm irmã gêmea em JavaScript. Elas moram
 * AQUI e em lugar nenhum mais: `luzDaVisita.test.ts` extrai o CORPO de
 * cada uma desta string, traduz o dialeto para JS e RODA o resultado
 * contra a tabela do Eyes. Não há duas fórmulas para divergirem, e não
 * há pino de texto pedindo licença — mudar qualquer linha daqui muda o
 * que o juiz executa, e o oráculo reprova na hora.
 *
 * O tradutor de lá entende só o que este chunk usa (declaração com
 * tipo, `if`/`return`, `vec3(x)` de um canal, e os embutidos `max`,
 * `min`, `clamp`, `exp`, `dot`) e RECUSA o resto: construção nova aqui
 * reprova o teste até alguém ensiná-la lá, que é o comportamento certo
 * de um juiz — quem não consegue medir reprova, não avisa.
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
 * `daTelaParaLinear` — A TRADUÇÃO, a QUARTA peça da receita desde 26/08, e
 * a MESMA curva da IEC 61966-2-1 de {@link deSRgbParaLinear} — a que
 * decodificou a palha do véu —, agora aplicada ao termo de LUZ: no Eyes o
 * `diffuse` do Phong multiplica bytes de TELA (lá não há gerência de cor
 * nem tonemap no globo), e aqui ele multiplicava um albedo já linear. Sem
 * ela a MESMA receita saía 2,66× mais clara na noite e 3,26× no
 * terminador; foi o que ele julgou em foto e o que a **C1** consertou.
 *
 * ELA VAI NO MESMO INTERRUPTOR DAS OUTRAS TRÊS, e não num uniforme
 * próprio. `uTerminadorS <= 0` é a convenção declarada de "Lambert cru",
 * que é dizer `?luz=real`; e a razão da tradução — *"os números do Eyes
 * são bytes de tela"* — só existe onde a receita do Eyes está acesa. As
 * quatro peças acendem e apagam JUNTAS, como o cabeçalho deste arquivo
 * promete, e em `real` esta função é a IDENTIDADE bit a bit: a decisão 2
 * do dono não se toca.
 *
 * A PORTA `?calib=` E AS SUAS DUAS CHAVES MORRERAM AQUI (26/08). Elas
 * existiram para uma escolha — qual das três candidatas vira o padrão —, e
 * a escolha foi feita: *"C1 — o Eyes ao pé da letra"*. Uma chave de
 * seleção que sempre vale o mesmo é um caminho que ninguém percorre e um
 * dente que ninguém pode morder.
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
uniform float uLanternaLeitura; // a dose da lanterna; 0 em real
uniform float uTerminadorS;     // 3 em assistida; 0 = Lambert cru (real)

float terminadorSuave(float x) {
  if (uTerminadorS <= 0.0) return max(x, 0.0);
  float s = uTerminadorS;
  return clamp(2.0 * (1.0 + exp(-s)) / (1.0 + exp(-s * x)) - 1.0, 0.0, 1.0);
}

vec3 lanternaDeLeitura(vec3 n, vec3 dirCam, vec3 sombras) {
  return (uLanternaLeitura * clamp(dot(n, dirCam), 0.0, 1.0)) * sombras;
}

vec3 daTelaParaLinear(vec3 c) {
  if (uTerminadorS <= 0.0) return c;
  vec3 baixo = c / 12.92;
  vec3 alto = pow(max(c + 0.055, 0.0) / 1.055, vec3(2.4));
  // o step vai INVERTIDO de propósito: \`step(c, joelho)\` é 1 quando
  // \`c <= 0.04045\`, que é o lado do joelho que \`deSRgbParaLinear\` escolhe.
  // No joelho exato os dois ramos diferem 2,3e−9, e uma casa com DUAS
  // decisões para o mesmo ponto é uma casa com duas curvas.
  return mix(alto, baixo, step(c, vec3(0.04045)));
}

vec3 luzDoGlobo(vec3 luzSol, vec3 fill) {
  vec3 teto = vec3(1.0);
  return daTelaParaLinear(max(luzSol, min(luzSol + fill, teto)));
}
`;

/**
 * O VÉU PALHA DE SATURNO EM GLSL — a quarta peça da receita, o §4.4 do
 * contrato. Só o `GIGANTE_LAMBERT_FRAG` inclui este chunk, e ele vem
 * DEPOIS de {@link GLSL_LUZ_DA_VISITA}: `globoComVeu` chama o
 * `luzDoGlobo` de lá.
 *
 * ------------------------------------------------------------
 * `opacidadeDoVeu` — quanta palha há NA FRENTE da superfície
 * ------------------------------------------------------------
 * O Eyes integra a exponencial em cinco passos. Aqui a atmosfera é a
 * CASCA EQUIVALENTE de {@link espessuraDoVeu} — mesma coluna vertical,
 * mesma coluna rasante —, e o caminho até a superfície tem forma
 * fechada: entrando por uma casca de espessura `t` (em raios) num ponto
 * de cosseno de visada `μ`, o raio anda
 *
 *     caminho = √((1+t)² − (1−μ²)) − μ
 *
 * e a MASSA DE AR é isso dividido por `t`. Ela vale 1 EXATO no subsolar
 * e 21,78 no limbo de Saturno — 0,1 % acima da função de Chapman rasante
 * √(πR/2H) = 21,76, que é a sobra do termo `t²` da raiz. A opacidade é
 * `1 − e^(−coluna·massa)`: **0,00995** no centro do disco, 0,0466 a
 * μ = 0,2 e **0,1957** no limbo. É um véu que abraça a borda — os 2 %
 * externos do raio —, e não uma névoa por cima do planeta.
 *
 * `uVeuColuna <= 0` é a convenção de "corpo sem véu": Júpiter, Urano e
 * Netuno passam por este mesmo fragmento e saem por aqui com ZERO, sem
 * um bit de diferença.
 *
 * ------------------------------------------------------------
 * `globoComVeu` — a ORDEM, e quem tem o direito de acender a palha
 * ------------------------------------------------------------
 * A superfície acende primeiro (albedo × a luz do globo, lanterna
 * incluída) e o véu se MISTURA por cima — é o
 * `mix(globo, atmosphereColor, a)` do `main` deles, na mesma posição.
 *
 * **A LANTERNA NÃO ENTRA NO VÉU.** No Eyes a atmosfera percorre as luzes
 * com `if (length(lightPositions[i]) > 0)`, e a luz de câmera está na
 * ORIGEM do espaço de câmera: ela é pulada por construção. Aqui isso é
 * literal — `globoComVeu` acende a palha com `luzSol`, o termo do Sol
 * sozinho (terminador × ganho × sombras), e não com a soma que a
 * superfície usa. As duas consequências são as que o contrato pede:
 *
 *  - `emissivity` 0 VIVE AQUI: onde o Sol não bate, `luzSol` é 0 e o véu
 *    não acrescenta nada — a noite de Saturno não ganha uma auréola. O
 *    que ele ainda faz no lado escuro é EXTINGUIR: a palha apagada come
 *    até 19,6 % do que a lanterna acendia no fio do limbo, que é o que
 *    uma camada de gás faz com a luz que a atravessa.
 *  - `sunsetIntensity` 0 TAMBÉM: o véu multiplica a palha por um ESCALAR
 *    de três canais iguais, então a croma dele nunca anda. O poente da
 *    Terra do Eyes avermelha; o de Saturno não existe, e o que prova a
 *    ausência é a razão R/B do termo do véu ficar parada.
 *  - `?luz=real` NÃO GANHA BRILHO INDEVIDO, e quem garante isso é a
 *    LINEARIDADE: o termo do véu é `uVeuCor × luzSol × aVeu`, sem uma
 *    parcela própria, então E(d) vezes o MESMO `luzSol` dá E(d) vezes o
 *    véu — e nada mais. A decisão 2 do dono não pode ser desfeita por
 *    uma casca que brilha sozinha, e esta não brilha: ela só sabe
 *    repetir a luz que o globo recebeu.
 *
 *    O QUE ISSO NÃO DIZ — e a frase que estava aqui até 25/08 dizia, o
 *    achado A5 da auditoria: que o véu de `real` seja E(d) vezes o de
 *    `assistida` PIXEL A PIXEL. Não é, porque o `luzSol` dos dois modos
 *    não é o mesmo: em `real` ele é `E(d)·max(N·L,0)` e em `assistida` é
 *    `terminadorSuave(N·L)`. A razão entre MODOS anda com o N·L — vale
 *    E(d) no subsolar (as duas curvas valem 1 lá), cede a ~0,7·E(d) no
 *    flanco e vai a ZERO no terminador, onde a logística ainda vaza
 *    5,5 % e o Lambert cru já não vaza nada. E(d) é o TETO da razão, não
 *    a razão.
 *
 * ------------------------------------------------------------
 * A TRADUÇÃO NÃO MEXE NO VÉU — e é por isso que ela o ACENDE junto
 * ------------------------------------------------------------
 * *"a dose do Eyes está boa (sutil)"* (Q12): {@link VEU_DE_SATURNO},
 * {@link COR_DO_VEU} e a casca equivalente ficam como estão, e a opacidade
 * sai bit a bit igual dos dois lados da porta de luz — ela é geometria
 * (`mu`), não luz. O que a C1 mudou é o que ACENDE a palha, e tinha de
 * mudar junto: o véu é LINEAR no `luzSol`, então deixá-lo com o `luzSol` de
 * tela enquanto a superfície passa a ser decodificada trocaria a razão
 * véu/superfície do Eyes por uma inventada aqui — o limbo palha saltaria à
 * frente do disco. Em `real` `daTelaParaLinear` é a identidade, e a razão
 * volta a ser a de sempre.
 */
export const GLSL_VEU_DE_SATURNO = /* glsl */ `
uniform float uVeuColuna;    // ρ₀H do corpo; 0 = corpo sem véu
uniform float uVeuEspessura; // espessura da casca equivalente, em raios
uniform vec3 uVeuCor;        // a palha do Eyes, já em LINEAR

float opacidadeDoVeu(float mu) {
  if (uVeuColuna <= 0.0) return 0.0;
  float m = clamp(mu, 0.0, 1.0);
  float t = max(uVeuEspessura, 1.0e-9);
  float raio = 1.0 + t;
  float caminho = (sqrt(max(raio * raio - (1.0 - m * m), 0.0)) - m) / t;
  return 1.0 - exp(-uVeuColuna * caminho);
}

vec3 globoComVeu(vec3 albedo, vec3 luzSol, vec3 fill, float aVeu) {
  vec3 superficie = albedo * luzDoGlobo(luzSol, fill);
  if (aVeu <= 0.0) return superficie;
  return mix(superficie, uVeuCor * daTelaParaLinear(luzSol), aVeu);
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
