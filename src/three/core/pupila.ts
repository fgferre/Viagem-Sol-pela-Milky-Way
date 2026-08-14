// ============================================================
// ⚠ LÁPIDE — ESTA PEÇA FOI REPROVADA PELO DONO EM 2026-08-14, NO DIA EM QUE
// NASCEU. Ela fica DESLIGADA e não é o plano. Palavras dele, ao vê-la ligada:
//
//   "eu quero que independentemente do astro/objeto que está em foco na tela
//    nunca se esmaeça a grandeza da cena galáctica e do starfield, exuberante...
//    nada de efeitos de pupila ou sei lá como vc chama isso..."
//
// E a medição lhe dá razão: ao enquadrar Sirius, ela fechava 16 STOPS — a cena
// inteira ~100.000× mais escura. O defeito não era de calibração; era o conceito.
//
// O QUE ENTRA NO LUGAR é uma compressão FIXA na emissão (`β·asinh(x/β)`):
// identidade no céu, logaritmo no Sol, igual em todo quadro e independente do
// foco. Contrato em `docs/LEI-DA-ESTRELA.md` §7.
//
// O QUE SOBREVIVE DAQUI, e é por isso que o arquivo não foi apagado:
//  1. A MEDIÇÃO que só ela permitiu — o vão de ~26 magnitudes entre a malha do
//     Sol e a lei do ponto, que é o que destrava o item 3 das pendências.
//  2. A TÉCNICA de aplicar no shader (deslocamento de `expoM0`), que existe pelo
//     limite de half-float explicado abaixo e NÃO tem parentesco com adaptar por
//     foco — a compressão fixa vai usar o mesmo caminho.
// Quem for mexer aqui: NÃO religue a adaptação por foco. Leia §7 primeiro.
// ============================================================
//
// A PUPILA — a auto-exposição da casa, na parte que é conta pura.
// PURA: zero three, zero DOM. O atuador mora em `stars.ts`/`planetas.ts`/
// `wrappedStars.ts` (um deslocamento de `expoM0`) e o fio em `director.ts`.
//
// ── POR QUE ELA NÃO É UM PASSE DE PÓS, e isto é medição, não gosto ──────
//
// O caminho óbvio era um passe multiplicando o buffer HDR antes do bloom, ou
// simplesmente mexer em `toneMappingExposure`. Os dois estão MORTOS pela mesma
// medição, e ela já estava no repositório sem ninguém ter juntado as pontas:
//
//  1. `toneMappingExposure` é aplicado pelo `OutputPass`, DEPOIS do bloom
//     (`post.ts:71-115`). Medido: `?exp=0,12` — três pontos abaixo do padrão —
//     ainda devolve luz média 0,75 (`atlasConfig.ts:293-297`). Exposição
//     depois do borrão não desfaz o borrão.
//  2. Mais fundo, e é o que fecha a porta: os render targets do composer são
//     HALF-FLOAT (`EffectComposer.js:64-71`), e half-float satura em 65.504. O
//     ponto do Sol a 1 UA deposita pico da ordem de 4e11 — ou seja, ele já
//     chega ao buffer como INFINITO. Qualquer ganho aplicado depois multiplica
//     infinito e devolve infinito. A informação morre no `RenderPass`.
//
// Logo a pupila tem de entrar ANTES da escrita no buffer, isto é, DENTRO do
// shader que emite. E aí ela é de graça: a lei fotométrica da casa
// (`GLSL_STAR_PSF`, `shaders/common.ts:300`) começa com
//     E = 10^(−0,4·(m − expoM0))
// e um deslocamento de `expoM0` É um ganho multiplicativo EXATO sobre E:
//     expoM0' = expoM0 + 2,5·log10(g)   ⟹   E' = E · g.
// Não há uniform novo, não há passe novo, não há draw novo. O "tempo de
// exposição" que o `director.ts:769` já chamava de tempo de exposição passa a
// ser, de fato, o tempo de exposição.
//
// ── O QUE ELA MEDE, e por que não é a média do quadro ───────────────────
//
// Não há leitura de pixel: a casa não tem readback de luminância, e o plano
// registra o custo dele no projeto irmão como "a diferença entre 60 e ~30 fps"
// (`PLANO-ATLAS.md:202`). A pupila mede o que a casa JÁ CALCULA por quadro: a
// magnitude aparente das fontes pontuais em quadro. É geometria e fotometria,
// como a do irmão (`ESCALA-HONESTA.md:865`), mas com o atuador certo.
//
// E a média do quadro seria o medidor ERRADO aqui, por uma razão estrutural:
// uma fonte pontual concentra um fluxo colossal em poucos pixels. A 40 UA o
// Sol contribui com média de cena ~963 e pico ~2,5e8 — cinco ordens de
// grandeza entre os dois. Expor pela média deixaria o pico em 5.000 e a tela
// continuaria lavada. Quem lava é o PICO, e é o pico que a pupila mede.
//
// ── A LEI, e as três decisões que ela carrega ───────────────────────────
//
//     ganho = min(TETO, (ALVO / pico)^KAPPA)
//
// (a) O TETO É 1, e a pupila portanto SÓ FECHA. Os anti-padrões de luz do
//     plano (`PLANO-ATLAS.md:1127`) avisam que "adaptação que só escurece é
//     inútil (CEILING = 1.0, precisa +EV)" — e o aviso é CORRETO para o
//     problema do irmão, que era uma cena 99% preta precisando de +EV. Aqui é
//     o contrário: a exposição de fábrica (1,02) foi calibrada ao longo de
//     ondas inteiras CONTRA o céu escuro, e abrir além dela estouraria
//     justamente o que já está certo. O defeito é só de superexposição. O teto
//     fica como PARÂMETRO declarado, não como constante escondida: no dia em
//     que uma cena pedir +EV, é este número que muda, e a razão de ele ser 1
//     está escrita aqui.
//
// (b) ABAIXO DO ALVO O GANHO É 1 EXATO, e isso é a metade que protege o resto
//     do projeto. Fonte que não estoura não move um bit: `min(1, x>1) === 1` e
//     `expoM0 + 2,5·log10(1)` é `expoM0 + 0`, o mesmo bit. A pupila é INERTE em
//     toda a viagem em que o defeito não existe — céu profundo, galáxia,
//     heroes de longe — e age só onde a tela lava. É o mesmo idioma de
//     neutralidade que o knee (`mix(x,y,0) === x`) e a gradação (`x·1 === x`)
//     já usam.
//
// (c) KAPPA É A ADAPTAÇÃO PARCIAL. Com KAPPA = 1 a fonte mais brilhante pousa
//     SEMPRE no alvo, e o Sol passaria a ter o mesmo brilho a 1 UA e a 500 UA —
//     a aproximação perderia o sentido. Com KAPPA < 1 sobra
//     `pico_exibido = ALVO^κ · pico^(1−κ)`: a fonte continua ganhando brilho ao
//     se aproximar, mas em fração de década, não em década cheia. É a mesma
//     forma da luz assistida da Onda 6 (`E^0,35`, `luz.ts`), e pelo mesmo
//     motivo: honestidade com assistência declarada, em vez de purismo que
//     entrega uma tela branca.
//
// NÃO É TETO DE BRILHO, e a diferença é de natureza, não de dose. Teto é
// `min(x, C)` sobre a fonte: corta a informação e deixaria o Sol quase tão
// fraco quanto uma estrela comum — o que a casa proíbe por escrito em três
// lugares (`NORTE.md:3487`, `NORTE.md:3582`, `PLANO-ATLAS.md:872`). A pupila é
// um GANHO ÚNICO sobre todas as fontes pontuais ao mesmo tempo: nenhuma relação
// entre elas muda, nada é cortado, e o desvio é declarável em stops — que é
// exatamente o que o §7.4 do plano pede ("aplicar como GANHO LINEAR ÚNICO
// antes do ACES", "expressar a assistência como deslocamento de EV explícito",
// "o selo passa a reportar o EV APLICADO").
// ============================================================

/**
 * O PICO da PSF, espelho em TS da primeira metade de `GLSL_STAR_PSF`
 * (`shaders/common.ts:300-313`). Existe uma terceira cópia deste espelho em
 * `planetas.ts:255` (`picoDaPsf`) — esta NÃO a substitui e nem deve: a de lá é
 * do `?dbgplan`, fora do caminho do quadro, e mora junto de quem tem os
 * uniformes verdadeiros. O que as duas têm de manter é a MESMA conta, e
 * `pupila.test.ts` cobra a igualdade contra o texto do GLSL.
 *
 * A igualdade com a GPU é de CURVA e de número, não de bit: float32 lá,
 * float64 aqui (o mesmo achado A7 que `lodStellar.ts` já registrou).
 */
export function picoDaPsf(m: number, expoM0: number, sigmaPx: number, screenH: number): number {
  const sigma = (sigmaPx * screenH) / 1080.0;
  const E = Math.pow(10.0, -0.4 * (m - expoM0));
  return E / (6.2831853 * sigma * sigma);
}

/**
 * O ALVO — o pico, em luz linear, em que a fonte mais brilhante pousa quando a
 * pupila fecha por completo.
 *
 * NÃO é 1 (o branco). Uma fonte pontual muito brilhante DEVE estourar: é o que
 * ela faz numa câmera de verdade, e é o estouro que acende os espinhos de
 * difração (`sat = clamp(0,5·log2(peak), 0, 1)` em `common.ts:311`, que satura
 * em pico 4). Pousar a fonte em 1 apagaria os espinhos de todas as estrelas
 * brilhantes — trocaria a tela lavada por uma tela sem estrela.
 *
 * O valor é CALIBRAÇÃO, medido com `scripts/visual/luz-do-quadro.mjs` na escada
 * de dez degraus do Sol, e a régua de aceitação é a do item 3: a mancha branca
 * tem de acompanhar o disco verdadeiro em vez de ficar grudada no tamanho da
 * tela.
 */
export const ALVO_DE_PICO = 100;

/**
 * KAPPA — quanto da década a pupila devolve. 1 = adaptação total (a fonte pousa
 * sempre no alvo); 0 = pupila desligada. Calibração, pela mesma régua do alvo.
 */
export const KAPPA_DA_PUPILA = 1;

/** O teto do ganho — ver (a) no cabeçalho. A pupila só fecha. */
export const TETO_DO_GANHO = 1;

/** Piso do ganho: −40 stops. Guarda de sanidade, não calibração — existe para
 *  uma fonte com magnitude envenenada não zerar o quadro inteiro em silêncio. */
export const PISO_DO_GANHO = 2 ** -40;

export interface ParametrosDaPupila {
  alvo: number;
  kappa: number;
  teto: number;
  piso: number;
}

export const PUPILA_PADRAO: ParametrosDaPupila = {
  alvo: ALVO_DE_PICO,
  kappa: KAPPA_DA_PUPILA,
  teto: TETO_DO_GANHO,
  piso: PISO_DO_GANHO,
};

/**
 * A LEI, em uma linha: `ganho = clamp((alvo/pico)^kappa, piso, teto)`.
 *
 * Guardas, todas na direção segura (ganho 1 = pupila aberta = imagem de hoje):
 * pico não-finito, ≤ 0, ou abaixo do alvo devolvem o TETO — e devolvem-no como
 * literal, sem passar pela potência, para a neutralidade ser de BIT e não de
 * arredondamento (`Math.pow(1, 1)` é 1, mas `Math.pow(0.9999999, 1)` não é).
 */
export function ganhoDaPupila(pico: number, p: ParametrosDaPupila = PUPILA_PADRAO): number {
  if (!Number.isFinite(pico) || pico <= 0) return p.teto;
  if (pico <= p.alvo) return p.teto;
  if (!(p.kappa > 0)) return p.teto;
  const bruto = Math.pow(p.alvo / pico, p.kappa);
  return Math.min(p.teto, Math.max(p.piso, bruto));
}

/**
 * O ganho em STOPS, que é como o §7.4 manda exibir (`log2`, negativo quando a
 * pupila fecha). É este número que o selo de honestidade declara — o selo tem
 * de reportar o EV APLICADO, não uma etiqueta de política.
 */
export function stopsDaPupila(ganho: number): number {
  if (!Number.isFinite(ganho) || ganho <= 0) return 0;
  return Math.log2(ganho);
}

/**
 * O DESLOCAMENTO DE `expoM0` equivalente ao ganho — o atuador.
 * `E = 10^(−0,4·(m − expoM0))`, logo somar `2,5·log10(g)` a `expoM0` multiplica
 * E por g exatamente. Ganho 1 devolve 0 EXATO (`Math.log10(1)` é 0, e
 * `expoM0 + 0` é o mesmo bit): é o que mantém inerte tudo que a pupila não toca.
 */
export function deslocamentoDeExpoM0(ganho: number): number {
  if (!Number.isFinite(ganho) || ganho <= 0) return 0;
  return 2.5 * Math.log10(ganho);
}

/**
 * AS DUAS CONSTANTES DE TEMPO, em segundos. Forma herdada do projeto irmão
 * (`ESCALA-HONESTA.md:865-875`: "fecha em 0,5 s, abre em 3,0 s") — o que
 * atravessa é a CADÊNCIA e a assimetria, não os números do atuador de lá, que a
 * casa recusa por escrito.
 *
 * A assimetria não é enfeite: é o olho. Fechar depressa é proteção (a fonte
 * apareceu e ofusca AGORA); abrir devagar é o escuro voltando aos poucos, que é
 * o que a retina faz e o que impede a cena de "respirar" a cada tremor da
 * câmera perto da fronteira.
 */
export const FECHA_S = 0.5;
export const ABRE_S = 3.0;

/**
 * A pupila viva: guarda o ganho corrente e caminha rumo ao alvo em ESPAÇO
 * LOGARÍTMICO. Em log, porque exposição é multiplicativa — caminhar linearmente
 * de 1 até 1e-11 passaria 99,99% do tempo já praticamente fechada e o
 * espectador veria um salto, não uma adaptação.
 *
 * A APROXIMAÇÃO É EXPONENCIAL (`1 − exp(−dt/τ)`) e não linear como o
 * `stepRampToward` de `lodStellar.ts`: aquela é uma rampa de CROSSFADE, que tem
 * de terminar em tempo previsto; esta é uma adaptação, que tem de ser suave nas
 * duas pontas e nunca "chegar" com quina.
 */
export class Pupila {
  /** ganho corrente. Nasce ABERTA (1) — a imagem de hoje, exata. */
  private ganho = 1;
  /** log2 do ganho corrente; a integração mora aqui. */
  private stops = 0;

  get valor(): number {
    return this.ganho;
  }

  get stopsAplicados(): number {
    return this.stops;
  }

  /**
   * Um passo de adaptação.
   *
   * `instantaneo` existe por uma razão de BANCADA, e ela decide se esta peça
   * pode ser julgada: sob `?shot=` o relógio visual da casa é ZERO, e uma
   * adaptação com constante de tempo continuaria andando depois de a cena
   * assentar — toda captura viraria loteria. O irmão resolveu isso deixando a
   * pupila com efeito ZERO no modo de captura, e o registro da casa já
   * sentenciou o resultado: "se a Onda 8 nascer assim, nenhum juiz olha para
   * ela" (`ESCALA-HONESTA.md:872-874`). Aqui ela SALTA para o alvo sob captura:
   * o gate vê exatamente a exposição que o espectador vê parado, e nenhum md5
   * depende de quando o obturador caiu.
   */
  passo(alvoDeGanho: number, dtS: number, instantaneo = false): number {
    const alvo = Number.isFinite(alvoDeGanho) && alvoDeGanho > 0 ? alvoDeGanho : 1;
    const alvoStops = Math.log2(alvo);
    if (instantaneo) {
      this.stops = alvoStops;
      this.ganho = alvo;
      return this.ganho;
    }
    const dt = Number.isFinite(dtS) ? Math.min(Math.max(dtS, 0), 0.1) : 0;
    // fechar = ficar mais escuro = alvo com MENOS stops que o corrente
    const tau = alvoStops < this.stops ? FECHA_S : ABRE_S;
    const k = 1 - Math.exp(-dt / tau);
    this.stops += (alvoStops - this.stops) * k;
    // o `2 ** stops` reconstrói o ganho; quando os dois já são iguais, o
    // caminho acima é um no-op exato e o ganho não treme
    this.ganho = alvoStops === this.stops ? alvo : 2 ** this.stops;
    return this.ganho;
  }

}

/**
 * A LEITURA DA PORTA `?pupila=`:
 *   ausente / `0`  → DESLIGADA (ganho 1 sempre, imagem de hoje bit a bit)
 *   `1`            → ligada com o padrão da casa
 *   `A,K`          → ligada com alvo e kappa explícitos (`?pupila=100,0.85`),
 *                    que é como a bancada varre a calibração com o MESMO
 *                    binário dos dois lados (molde do `?dom=`/`?nodom=`)
 * Entrada inválida devolve o padrão LIGADO e NÃO lança: porta de URL é entrada
 * de usuário, e a casa nunca deixa uma porta torta apagar a cena.
 *
 * ── POR QUE ELA NASCE DESLIGADA, e a razão é MEDIDA ────────────────────
 *
 * Ligada, a pupila faz o que promete: a faixa branca de 1 a 2.000 UA
 * desaparece (luz média 0,945 → 0,04; quadro acima de meia luz 100% → 0,2%).
 * Só que ela DESCOBRE um defeito mais fundo, que a tela branca escondia, e
 * ligá-la hoje trocaria um defeito conhecido por outro:
 *
 *   a 3,6 UA o Sol é um ponto fotométrico, e a pupila o pousa no alvo: bola
 *   branca com halo, dominando o quadro. A 1 UA a malha do corpo ARMA (4 px)
 *   e, sendo opaca com escrita de profundidade, OCLUI o ponto — e o que sobra
 *   é a fotosfera sozinha, um disco laranja de 7,6 px SEM clarão nenhum.
 *   Ou seja: aproximar-se de 3,6 para 1 UA faz o Sol ESCURECER.
 *
 * Um passo para trás na luz é exatamente o que a prova de continuidade da
 * Onda 3 proíbe, e é a regra que a casa provou e cobrou por três ondas
 * (`NORTE.md:3384`, `PLANO-ATLAS.md:572`). A causa está medida e tem número: a
 * fotosfera da malha é autorada numa escala de radiância ~1, e a lei
 * fotométrica do ponto deposita, para a MESMA superfície, ~2,8e10. As duas
 * representações do Sol estão a **cerca de 26 magnitudes uma da outra**, e
 * meia-luz nenhuma fecha esse vão: enquanto a malha não estiver na escala
 * fotométrica da casa, o handoff disco↔ponto tem degrau por construção.
 *
 * E NADA A DESTRAVA: horas depois deste texto o dono a REPROVOU por inteiro (ver
 * a lápide no topo do arquivo e o item 39 das pendências). Ela fica montada e
 * medível porque o caminho do atuador serve à compressão fixa que a substitui —
 * não porque exista um dia em que ela liga. Item 3 de `docs/PENDENCIAS.md`.
 */
export function lerPortaDaPupila(bruto: string | null | undefined): ParametrosDaPupila | null {
  if (bruto === null || bruto === undefined || bruto === '' || bruto === '0') return null;
  if (bruto === '1') return PUPILA_PADRAO;
  const partes = bruto.split(',').map(Number);
  const alvo = partes[0];
  const kappa = partes.length > 1 ? partes[1] : KAPPA_DA_PUPILA;
  if (!Number.isFinite(alvo) || alvo <= 0) return PUPILA_PADRAO;
  if (!Number.isFinite(kappa) || kappa < 0 || kappa > 1) return PUPILA_PADRAO;
  return { ...PUPILA_PADRAO, alvo, kappa };
}
