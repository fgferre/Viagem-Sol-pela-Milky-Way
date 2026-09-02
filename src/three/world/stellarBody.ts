// ============================================================
// StellarBody — o corpo estelar procedural da casa, e o Sol é a
// instância 1. Nasceu como `novoSol.ts`: o Sol transplantado de
// Novo-Sol-Fable-3d (projeto irmão do mesmo autor; three 0.185, zero
// dependências). A Onda 3 não o reescreveu — promoveu a
// `StellarParams` os literais que eram DA INSTÂNCIA, com defaults
// (`SOL_PARAMS`) que reconstroem o objeto de antes byte a byte. O
// `git mv` preservou a história; o diff é o que mudou de fato.
//
// O núcleo vive VENDORIZADO VERBATIM em ./sol/ — fábricas
// createX(ctx) sem side-effects de import, exatamente como no
// original, e a Onda 3 não tocou nenhum dos 14 (M3: portam-se
// pixels). Este arquivo é (a) o adaptador de contexto que o
// main.js de lá provia, e (b) a orquestração por frame portada
// do animate() original (sim fatiada, bake da cromosfera a 8 Hz
// em 8 fatias, ciclo de 11 anos, flares, proeminências, loops,
// coroa). O que NÃO viaja: pipeline de pós deles (bloom/ACES
// próprios — aqui o Sol atravessa o NOSSO composer), céu, UI,
// câmera, museu. Fase 2 FEITA: coroa volumétrica (sampler3D) e CME
// (transform feedback) — as três pontes de escala estão no NORTE.
//
// ESCALA: o núcleo trabalha em "unidades de doador" (raio 2.2);
// o group leva scale = params.radiusPc/2.2 e o uCamDist é alimentado
// em unidades de doador CORRIGIDAS por fov (o LOD do disco de
// lá foi calibrado a fov 42° — sem a correção, o enquadramento
// da parede de fogo a fov 26° leria como "longe").
//
// TEMPO: são DOIS relógios, e a distinção é a lei desta casa desde
// 21/08 (item 5). O RÁPIDO é `update(time)` — o relógio VISUAL do
// director (0 sob ?shot=) — e move granulação, rotação, coroa, flares,
// proeminências: tempo de TELA, que acumula. O LENTO é a DATA SIMULADA,
// que chega por `escreverCiclo` e move a fase do ciclo, as regiões
// ativas e os grupos de manchas: ele NÃO acumula, é função pura do
// calendário, e por isso anda para trás de graça. Misturar os dois foi
// o defeito: o Sol do Atlas ficava congelado no máximo e duas entradas
// no mesmo instante davam dois Sóis.
// delta<=0 congela o relógio rápido — por isso o construtor faz um
// PRIME síncrono (semente do sim + N passos + um bake completo):
// sem ele, captura em t=0 fotografaria o disco sem cromosfera. E quando
// a DATA anda o bastante, um re-bake FATIADO (mesma semente, mesma
// contagem) refaz o retrato na fase nova sem bloquear a thread.
//
// LOD: este arquivo NÃO TEM MAIS LOD, e isso é o que a F3 da onda do Sol
// real entregou. Até ela, o corpo se atenuava por DISTÂNCIA — duas
// rampas em parsec (`solWorldFade`) escurecendo fotosfera, espículas,
// raias e halo, mais um corte duro de custo. As duas rampas existiam
// pela mesma razão: o disco da cena era 487.441× maior que o Sol, e um
// corpo desse tamanho precisava ser dissolvido à mão nas duas pontas
// (afastando-se ele engolia o céu; aproximando-se ele engolia o sistema
// solar). Com raio FÍSICO nada disso acontece — a perspectiva já faz o
// trabalho. Quem decide se o Sol é desenhado como CORPO é a régua do
// palco (4 px de diâmetro aparente, `corpos.ts`), aplicada pelo
// Director, exatamente como em Terra e Lua; aqui só se lê
// `group.visible`.
// ============================================================
import * as THREE from 'three';
import { CAMADA_DOS_OCULTADORES } from '../core/post';
import { RAIO_ARTISTICO_DO_SOL_PC, RAIO_DO_SOL_NA_CENA } from '../escala';
import { RADIANCIA_DA_FOTOSFERA, radianciaDeTela } from '../luzDaCasa';
import type { EstadoDaEstrela, FaseDoCiclo } from '../estrela';
import { UNIDADES_POR_CICLO, tempoDoCiclo } from '../estrela';
import { GLSL_COMPRESSAO } from '../shaders/common';
// o β vem do módulo DONO da curva na emissão, nunca de uma segunda
// leitura da URL: `starShaders.ts` já resolve `?bemis=` uma vez e os
// três materiais de ponto estelar bebem de lá. A malha é o quarto.
import { BETA_DA_EMISSAO } from '../shaders/starShaders';
import type { QualityLevel } from '../core/engine';
import { NOISE_GLSL } from './sol/common.js';
import { createGranulation } from './sol/granulation.js';
import { createPIL } from './sol/pil.js';
import { createActivity } from './sol/activity.js';
import { createChromo } from './sol/chromo.js';
import { createSunBase, createSunUniforms, createSunMesh } from './sol/sun.js';
import { createFlares } from './sol/flares.js';
import { createCoronaRays } from './sol/coronaRays.js';
import { createSpicules } from './sol/spicules.js';
import { createProminences } from './sol/prominences.js';
import { createLoops } from './sol/loops.js';
import { createCoronaVolume } from './sol/coronaVolume.js';
import { createCME } from './sol/cme.js';

const DONOR_RADIUS = 2.2; // SUN_RADIUS do projeto original
const DONOR_FIT = 6.59; // fitDist de lá (fov 42°, landscape)
const DONOR_HALF_FOV = Math.tan((42 * Math.PI) / 360);
const MACRO_SLOW = 0.15;
const SIM_DT = 0.6 * MACRO_SLOW;

// Tiers do original (renderer.js) — só os campos que o núcleo lê.
// cinema→high, alta→mid, performance→low; ultra fica para depois.
const TIERS = {
  low: { fbm: 4, seg: 96, simW: 384, simH: 192, simStep: 1 / 16, prom: 4, chromo: 512, granFreq: 22.0, lic7: false, loops: 8, larc: 5, lseg: 28, cstep: 0, cmestep: 0, cmen: 0 },
  mid: { fbm: 5, seg: 128, simW: 768, simH: 384, simStep: 1 / 22, prom: 6, chromo: 1024, granFreq: 30.0, lic7: true, loops: 12, larc: 7, lseg: 36, cstep: 22, cmestep: 16, cmen: 1024 },
  high: { fbm: 5, seg: 128, simW: 768, simH: 384, simStep: 1 / 26, prom: 7, chromo: 2048, granFreq: 34.0, lic7: true, loops: 16, larc: 9, lseg: 44, cstep: 36, cmestep: 24, cmen: 2048 },
} as const;
/**
 * SEGMENTOS DA ESFERA DA FOTOSFERA NO PIOR TIER — a única grandeza do
 * `TIERS` que alguém de fora precisa saber, e por um motivo geométrico: a
 * silhueta de uma esfera TESSELADA é o polígono INSCRITO, e o oclusor da
 * nebulosa (`world/nebula.ts`, `sunCone`) tem de encolher o raio por
 * `cos(π/N)` usando o N do pior caso. Era 96 redigitado lá, com o tier
 * citado só no comentário ao lado — e comentário não muda quando o tier
 * muda: baixar `low.seg` sem mexer na cópia faria o oclusor apagar pixel
 * visível, calado.
 */
export const SEGMENTOS_DA_FOTOSFERA_NO_PIOR_TIER = TIERS.low.seg;

const TIER_FOR: Record<QualityLevel, keyof typeof TIERS> = {
  cinema: 'high',
  alta: 'mid',
  performance: 'low',
};

// Defaults de fábrica do modo normal de lá (CONTROL_SCHEMA) — os knobs
// que o NÚCLEO lê. Congelados: o painel/URL de lá não viaja.
const SOL_KNOBS: Record<string, number> = {
  spots: 1, cycle: 1, lapse: 0, speed: 1, pmode: 0,
  plageglow: 0.35, halo: 0.55, ray: 0.9, cact: 0.5,
  // cme 1,4 (doador: 0,9): a casca foi calibrada contra a exposição
  // 0,418 do pipeline de lá; no nosso ACES ela compete com a coroa
  // mais clara — 0,9 mal aparecia, 1,4 lê a estrutura de 3 partes
  loops: 0.55, fprom: 0.55, cvol: 0.5, cme: 1.4, edu: 0,
};

// ------------------------------------------------------------
// StellarParams — o que é DA INSTÂNCIA (Onda 3, decisão D5)
// ------------------------------------------------------------
//
// A regra da promoção: sobe a parâmetro o literal que (a) descreve a
// ESTRELA, não o motor, e (b) sobe sem tocar em `sol/*.js`. Os 14
// módulos vendorizados ficam intocados, e o que não passou por esse
// filtro está NOMEADO aqui em vez de escondido:
//
//  1. `DONOR_RADIUS = 2.2`. O mesmo número vive DE NOVO, como literal
//     independente, em `sol/sun.js:13` (`var SUN_RADIUS = 2.2`), de
//     onde é publicado em `ctx.SUN_RADIUS` e lido por 7 dos 14 módulos
//     (sun, coronaRays, coronaVolume, prominences, spicules, loops,
//     cme). Promovê-lo exigiria editar `sol/*.js`. Não é perda: o
//     parâmetro REAL da instância é `radiusPc` (o raio em pc no mundo);
//     2.2 é só a régua interna do doador. Mas os dois lados têm de
//     continuar concordando À MÃO — se um mudar sem o outro, quebra em
//     silêncio. Onda 7.
//  2. A PALETA H-alfa: ~17 tripletos `vec3()` inline em 8 dos
//     `sol/*.js`, nenhum nomeado. É OVERRIDE DECLARADO da instância Sol
//     (decisão D4) — a lei de cor por classe espectral é da Onda 7, e é
//     ela que vai precisar de `teffK`.
//  3. `sol/cme.js:10` captura `ctx.camera` NA CRIAÇÃO, não por frame.
//     Uma segunda instância construída antes de a câmera real existir
//     pegaria a errada, sem erro nenhum. Onda 7.
//  4. `DONOR_FIT`/`DONOR_HALF_FOV` e a janela do limbo (35/25 em
//     unidades de doador): calibração de LENTE e de REGIME do doador,
//     não física da estrela.
//  5. `TIERS`: custo, não estrela — e nem chega a ser da instância,
//     porque nenhuma camada estelar responde a troca de qualidade
//     (decisão D8).

/** Período de rotação do Sol — sideral médio de Carrington, em dias. */
export const SOL_ROT_PERIOD_DAYS = 25.38;
/**
 * O `ROT_SPEED` do doador para o Sol: rad por segundo DE TELA. É taxa
 * artística — o doador nunca modelou período nenhum.
 */
const SOL_ROT_SPEED = 0.042;

/**
 * Período (dias) → rad/s de tela. A âncora é a RELAÇÃO, não o número:
 * o Sol devolve exatamente o 0,042 de sempre porque `25.38 / 25.38` é
 * 1 sem resto em IEEE754 e `0.042 * 1` é o mesmo bit. A promoção não
 * podia custar um ULP — o gate de md5 desta fase pegaria.
 * A razão embutida é a COMPRESSÃO DE TEMPO do filme: uma volta em
 * 2π/0,042 ≈ 149,6 s de tela para 25,38 dias ⇒ ~5,9 s por dia solar.
 * Guarda: período inválido devolve 0 (estrela não gira), nunca NaN.
 */
export function rotSpeedFromPeriod(periodDays: number): number {
  if (!Number.isFinite(periodDays) || periodDays <= 0) return 0;
  return SOL_ROT_SPEED * (SOL_ROT_PERIOD_DAYS / periodDays);
}

/** O que descreve UMA estrela procedural desta casa. */
export interface StellarParams {
  /** Nome da instância — diagnóstico e registro, só. */
  readonly nome: string;
  /** Raio VISUAL em pc (escala artística: o real seria invisível). */
  readonly radiusPc: number;
  /** Período de rotação em dias → `rotSpeedFromPeriod`. */
  readonly rotPeriodDays: number;
  /** Inclinação do eixo, em rad. */
  readonly tiltRad: number;
  /**
   * Escala global de atividade magnética: multiplica os knobs `spots` e
   * `cycle` do doador ANTES do override de URL (a URL segue sendo a
   * fonte de verdade). Só esses dois — `cact`/`cvol`/`fprom` são DOSE DE
   * RENDER da coroa, calibrada contra o nosso ACES, e enfiá-los aqui
   * seria promoção falsa.
   */
  readonly activityLevel: number;
  /**
   * Temperatura efetiva, em K. Ganhou o primeiro consumidor no M1 da Lei
   * da Estrela: `estadoDaLei` a declara no estado lógico e `repartir`
   * deriva dela radiância e cor. A paleta H-alfa dos `sol/*.js` continua
   * sendo o override declarado da instância 1 (`overrideExpoente`).
   */
  readonly teffK: number;
  /**
   * RESERVADO: envelope convectivo (granulação). O núcleo do doador não
   * tem caminho radiativo — `sol/granulation.js` roda incondicionalmente
   * — e abrir um exigiria editar os 14 vendorizados. Fica declarado
   * porque é o parâmetro que decide se uma estrela tem grânulos, e a
   * Onda 7 vai precisar dele para as classes quentes.
   */
  readonly convective: boolean;
  /*
   * (A DRAMATURGIA POR TORÇÃO DE FASE morreu em 21/08 — item 5. Eram
   * quatro números aqui — as fases do arranque e do pico, mais a janela
   * em segundos de viagem — que faziam o corpo trocar a fase do ciclo
   * pelo tempo de VIAGEM. A fase agora é da DATA (`faseDoCiclo`, a lei
   * da estrela) e o filme atenua a OCUPAÇÃO por uma dose declarada, que
   * mora com quem dirige o filme — `director/doseDoSol.ts`. Um corpo
   * estelar não tem por que conhecer o roteiro.)
   */
  /** Semente-mãe dos streams determinísticos da instância. */
  readonly seed: number;
  /** Prefixo dos knobs por URL (`?solcvol=0`). Por instância. */
  readonly knobPrefix: string;
  /** Defaults de fábrica dos knobs que o NÚCLEO lê. */
  readonly knobs: Readonly<Record<string, number>>;
}

// ============================================================
// AS DUAS PONTES DE ESCALA PARA O GLSL (F1 da onda do Sol real).
//
// Os dois raymarches vendorizados (`sol/coronaVolume.js`, `sol/cme.js`)
// escrevem o raio DENTRO do texto do shader, e o fazem com dois números
// que só funcionam na escala artística. Com o raio físico do Sol
// (2,2567e-8 pc) os dois QUEBRAM EM SILÊNCIO — sem erro de compilação,
// sem uma linha de console, sem nada na tela além da ausência:
//
//  1. `(2.2567e-8).toFixed(6)` devolve literalmente a string
//     `"0.000000"`. O `#define SUN_R` vira ZERO, o `1.0/SUN_R` de
//     `cme.js` vira infinito, e a coroa e a ejeção de massa somem.
//  2. O guarda de segmento degenerado usa `1e-4` ABSOLUTO em unidade de
//     mundo. A travessia inteira do volume de coroa do Sol real mede
//     1,30e-7 pc — 769× menor que esse limiar: todo raio desiste antes
//     de começar.
//
// As duas pontes moram AQUI, na casa, e não nos arquivos vendorizados:
// lá dentro muda uma linha cada, que só lê o que este adaptador manda
// (`ctx.SUN_R_GLSL`, `ctx.SEG_EPS_GLSL`), com o caminho antigo intacto
// no `||` para quem construir o ctx sem elas. É a menor cirurgia
// possível sobre a promessa de não abrir o núcleo (cabeçalho deste
// arquivo), e ela é o oposto de silenciosa: `stellarBody.test.ts` tem
// teste-agulha que reprova se o raio voltar a virar `"0.000000"`.
// ============================================================

/**
 * Um literal float de GLSL que sobrevive a raio pequeno — e que devolve
 * EXATAMENTE a string de sempre para o raio artístico, que é o que
 * mantém as 24 vistas oficiais bit-idênticas com a porta desligada.
 *
 * A regra: usa-se a forma fixa de 6 casas (a herdada) SE ela voltar ao
 * mesmo float de 32 bits; senão, notação exponencial de 9 casas, que o
 * GLSL ES 3.0 aceita (tem ponto decimal e expoente). `Math.fround`
 * porque é em float32 que o shader vai viver — comparar em double
 * reprovaria formas que a GPU não distingue.
 */
export function literalGlsl(v: number): string {
  const fixo = v.toFixed(6);
  return Math.fround(Number(fixo)) === Math.fround(v) ? fixo : v.toExponential(9);
}

/**
 * O limiar de "segmento curto demais para marchar", como texto de GLSL.
 *
 * O valor herdado (`1e-4`) é ABSOLUTO e foi calibrado quando o raio da
 * cena era o artístico; o certo é ele ser PROPORCIONAL ao raio, que é o
 * que o torna portátil para qualquer instância (a mesma lição da régua
 * por ângulo de `lodStellar.ts`).
 *
 * O RAMO LITERAL PARA O RAIO ARTÍSTICO MORREU NA F3, como este
 * comentário prometia por escrito desde a F1 ("quando a F3 tirar o raio
 * artístico de cena, este ramo morre junto com ele"). Sobra a lei
 * proporcional, e ela é a mesma conta que o ramo morto fazia: o epsilon
 * vale **0,909% do raio do corpo** — `1e-4` de mundo sobre os 0,011 pc
 * em que foi calibrado. A âncora continua sendo o raio artístico porque
 * é dele que o 1e-4 nasceu; trocá-la pelo raio real mudaria o número
 * fingindo que a calibração foi refeita, que é a mentira de procedência
 * que o cadastro de escala existe para impedir.
 */
export function epsilonDeSegmentoGlsl(raioPc: number): string {
  return literalGlsl(raioPc * (1e-4 / RAIO_ARTISTICO_DO_SOL_PC));
}

// ============================================================
// F2 — A FOTOSFERA NA UNIDADE DA CASA, por cirurgia de texto.
//
// A malha emite ~1 e a lei do ponto deposita ~2,7e10 para a MESMA
// superfície: são ~26 magnitudes entre dois desenhos do mesmo objeto,
// e é a dívida que `escala.ts` declara em `fatorDeBrilho` e que o
// `it.fails` de `luzDaCasa.test.ts` cobra sem afrouxar. A F2 é o
// pagamento: a malha passa a emitir a radiância verdadeira, e como o
// composer é half-float ela só pode fazer isso COMPRIMIDA — pela mesma
// `β·asinh(x/β)` que o ponto estelar já aplica.
//
// POR QUE CIRURGIA DE TEXTO, e não um uniform novo. Abrir os 14
// vendorizados é a coisa que o cabeçalho deste arquivo promete não
// fazer, e `stellarBody.test.ts` pina o texto deles por linha. O molde
// é o de `core/post.ts` (`domarOBloom`), que reescreve o passa-alta do
// `UnrealBloomPass` sem tocar no arquivo do vendor: âncora exata, erro
// ALTO se ela sumir, `needsUpdate` no fim. Um shader que muda de forma
// tem de quebrar a suíte, nunca calar a tela.
//
// ------------------------------------------------------------
// O FILTRO SOLAR DECLARADO, que é a segunda metade da F2 e não um
// enfeite dela. A F2 crua foi MEDIDA e REPROVADA pelo dono em 15/08: a
// 1 UA a estrela verdadeira é linda, mas na aproximação a radiância
// verdadeira cega a tela (a 0,027 UA o quadro é 100% branco) — "de
// repente vira um clarão que ocupa a tela toda e não se vê mais nada".
// A resposta é a que a Lei da Estrela §E3 já autorizava por escrito: a
// paleta H-alfa continua, "como OVERRIDE DECLARADO da instância nº 1".
// Este arquivo é onde esse override deixa de ser frase.
//
// COMO: a emissão exibida desce EM STOPS da radiância verdadeira (g=1)
// para a paleta autorada (g=0), e quem manda no g é a DOMINÂNCIA do
// disco sobre o próprio clarão — a MESMA razão `discoPx/haloPx` que
// decide a cessão do Sol-ponto no director. Longe, o disco mede menos de
// 0,4 do clarão: g = 1, e a estrela é a verdadeira. Perto, o disco domina
// por 2,5×: g = 0, e o que se vê é a superfície autorada, com granulação,
// manchas e proeminências — que é o que a aproximação existe para
// mostrar. As duas trocas leem o MESMO número e terminam no MESMO
// ponto (2,5): no quadro em que o ponto acaba de ceder ao corpo, o corpo
// já está inteiro na paleta que sabe se desenhar de perto.
//
// A RAMPA DELE É MAIS LARGA QUE A DA CESSÃO, e isso é conserto de 15/08,
// não desalinho: a cessão arbitra dupla-luz e tem as bordas provadas pela
// Onda 3 (1 → 2,5); o filtro atravessa 26,09 magnitudes, e em 2,57× de
// distância o voo de ida e volta mediu 60% da troca acontecendo entre
// dois degraus vizinhos. `filtroSolarAlvo` estica a travessia
// simetricamente em log (0,4 → 2,5) sem inventar número — a derivação
// inteira mora ao lado da função, em `world/lodStellar.ts`.
//
// ISTO NÃO É PUPILA, e a distinção é a que separa assistência declarada
// de teto de brilho (o que o NORTE proíbe). Uma pupila mede o QUADRO e
// reage a ele; esta lei não mede nada — lê tamanho aparente, que é
// geometria fixa, o mesmo número que o LOD já usa. Nada aqui depende de
// FOCO, de exposição, de histograma ou do que mais estiver na tela: a
// mesma distância dá o mesmo g em qualquer viagem, e as capturas
// continuam reproduzíveis. E o que muda são SÓ os pixels do disco do
// Sol: nenhuma estrela, nebulosa ou planeta esmaece junto — a cena
// nunca escurece para o Sol caber, que é exatamente o defeito que um
// teto global teria.
// ============================================================

/**
 * A âncora: a escrita final do fragment do Sol (`sol/sun.js`, a última
 * linha antes do `}` do main). É o único `gl_FragColor` do arquivo com
 * esta forma, e o teste-agulha o confere contra o vendorizado REAL.
 */
const ESCRITA_FINAL_DO_SOL = 'gl_FragColor = vec4(color * uWorldFade, 1.0);';

/**
 * A declaração do FILTRO SOLAR, injetada junto com a curva. Um uniform,
 * não um literal, porque este é o único número da cirurgia que muda por
 * QUADRO — e o director é quem o escreve (ver `escreverFiltroSolar`).
 */
const UNIFORME_DO_FILTRO = 'uniform float uFiltroSolar;\n';

/**
 * O fragment do Sol reescrito para emitir a radiância VERDADEIRA da
 * fotosfera, comprimida por `β·asinh(x/β)` e descida em STOPS pelo
 * filtro solar. Pura: recebe texto e devolve texto, para poder ser
 * provada sem subir GPU.
 *
 * O FILTRO ENTRA COMO EXPOENTE (`pow(fator, uFiltroSolar)`), e o lugar
 * dele no texto é a decisão inteira. Com `g = 1` o expoente é 1 e a
 * emissão é a radiância verdadeira, bit a bit o que a F2 crua fazia; com
 * `g = 0` o `pow` vale 1 EXATO e sobra `comprimir3(color, β)` — a paleta
 * H-alfa autorada de volta, e volta INTACTA, não "parecida": a cor sai
 * da paleta entre ~1 e ~2,4, e nessa faixa `β·asinh(x/β)` com o β da
 * bancada (300) é identidade a 1,1e-5 de erro relativo. Nada de ramo,
 * nada de `if`: a mesma linha atende às duas pontas.
 *
 * POR QUE POW E NÃO UM `mix` LINEAR, e a conta é o argumento inteiro. A
 * distância entre as duas pontas é de **26,09 magnitudes**. Num `mix`
 * linear o MEIO da rampa vale 1,37e10 — a 0,75 mag do topo: 25 das 26
 * magnitudes seriam gastas na última fração de por cento do caminho (a
 * emissão só desce à casa do milhar em g ≈ 3,7e-8), e a tela ficaria
 * branca em TODO o trecho que o dono reprovou, com o clarão morrendo de
 * um quadro para o outro no fim. `pow` interpola em STOPS — linear no
 * LOG: meia rampa é a raiz do fator, 1,655e5, exatamente 13,05 mag de
 * cada ponta. É a régua do olho e a do pós-processo, não a do buffer.
 *
 * A COMPRESSÃO VEM ANTES DO FADE, e a ordem não é gosto. `uWorldFade` é
 * o crossfade disco→estrela: ele não muda o brilho da estrela, muda
 * QUEM a desenha. Comprimir depois dele faria o joelho da curva andar
 * durante a transição — a mesma superfície entraria em pedaços
 * diferentes da curva conforme o wrapper baixasse o fade, e a troca
 * deixaria de conservar fluxo justamente onde ela precisa conservar. O
 * que a curva tem de ver é a radiância da superfície, que é invariante
 * com a distância (item 3 da Lei); o fade continua sendo cessão de
 * representação, aplicada depois, por fora.
 *
 * O β É O DOS PONTOS, o mesmo símbolo (`BETA_DA_EMISSAO`), não um β da
 * malha. Disco e ponto desenham o MESMO objeto nos dois lados da troca:
 * duas curvas diferentes fariam o Sol mudar de brilho no instante em que
 * mudasse de representação, que é o defeito que a Lei nomeia.
 *
 * A DUPLICATA REPROVA. Depois da cirurgia a âncora não existe mais no
 * texto, então uma segunda passada cai no mesmo erro alto de âncora
 * ausente — e isso é a resposta certa, não um efeito colateral: aplicar
 * o fator duas vezes elevaria a emissão ao quadrado, e uma função que
 * engolisse a segunda chamada em silêncio esconderia exatamente esse
 * estrago.
 */
export function cirurgiaDaFotosfera(
  fragmentShader: string,
  fator: number,
  beta: number
): string {
  if (!fragmentShader.includes(ESCRITA_FINAL_DO_SOL)) {
    throw new Error(
      'cirurgiaDaFotosfera: a escrita final do fragment do Sol não está mais lá ' +
        `(esperado \`${ESCRITA_FINAL_DO_SOL}\`, de sol/sun.js) — ou o vendorizado ` +
        'mudou de forma, ou a cirurgia já foi aplicada neste material'
    );
  }
  // a curva e a declaração do filtro entram ANTES de tudo, por prepend: o
  // fragment do Sol começa com o `NOISE_GLSL` (funções soltas, sem
  // `#version`, sem `#extension` e sem `precision` — quem prefixa precisão
  // é o three), então não há âncora frágil a inventar aqui. Uma vez só, e
  // o teste conta.
  return (
    UNIFORME_DO_FILTRO +
    GLSL_COMPRESSAO +
    fragmentShader.replace(
      ESCRITA_FINAL_DO_SOL,
      `gl_FragColor = vec4(comprimir3(color * pow(${literalGlsl(fator)}, uFiltroSolar), ` +
        `${literalGlsl(beta)}) * uWorldFade, 1.0);`
    )
  );
}

/**
 * A instância 1. Todo campo aqui reproduz o literal que estava solto no
 * módulo antes da Onda 3: a promoção é de ENDEREÇO, não de valor, e o
 * gate de md5 desta fase é a prova.
 *
 * Dramaturgia do arranque (pedido do dono): o Sol acorda com o disco
 * quase limpo na parede de fogo e ganha atividade até o fim da hélice.
 * A partir de 21/08 isso é uma DOSE DE OCUPAÇÃO — quanta atividade da
 * data aparece —, e não uma fase inventada: quem manda na fase é o
 * calendário. A dose mora com quem dirige o filme
 * (`director/doseDoSol.ts`) e se declara no selo; aqui só entra o que é
 * da ESTRELA.
 */
export const SOL_PARAMS: StellarParams = {
  nome: 'Sol',
  // O RAIO FÍSICO DA FOTOSFERA (F3), pela fonte única do cadastro — não
  // um 2,2567e-8 redigitado, e não mais o `WORLD.sunRadius` artístico
  // que ficou aqui da Onda 3 até 2026-08-13. É esta linha que faz o
  // fator do cadastro sair 1: `RAIO_DO_SOL_NA_CENA` é o MESMO símbolo
  // que `escala.ts` divide por `RAIO_SOL_PC` para acusar quem infla.
  radiusPc: RAIO_DO_SOL_NA_CENA,
  rotPeriodDays: SOL_ROT_PERIOD_DAYS,
  // inclinação real do eixo solar (~7,25°), como no original
  tiltRad: 0.1265,
  activityLevel: 1,
  teffK: 5772,
  convective: true,
  seed: 20260803,
  knobPrefix: 'sol',
  knobs: SOL_KNOBS,
};

/**
 * AS FAMÍLIAS DE VIDA. Cada linhagem de estrutura efêmera do corpo tem um
 * tempero próprio na semente, para que o sorteio de uma não desloque o da
 * outra — regiões ativas e grupos de manchas nascem no mesmo instante e
 * têm de ser independentes.
 */
const FAMILIAS_DA_VIDA: Record<string, number> = { regiao: 1, mancha: 2 };

/**
 * QUANTO A DATA PRECISA ANDAR PARA O RETRATO SER OUTRO — em unidades do
 * ciclo (1800 por ciclo, ~2,24 dias cada). 7,2 unidades ≈ 16 dias: abaixo
 * disso a fase move a atividade menos que o ruído da granulação, e re-assar
 * seria pagar por nada. No filme o instante é fixo (a troca da coda anda
 * 0,667 dia ≈ 0,3 unidade), então o filme não paga NENHUM re-bake; no
 * degrau de 10⁷ s/s do Atlas o limiar é cruzado ~7×/s e a máquina pousa a
 * cada meio segundo — que é honesto, porque ali o Sol está mesmo mudando.
 */
const LIMIAR_DE_REASSAR = 7.2;

/**
 * Os passos de relaxamento do Br que estabelecem um retrato — os mesmos
 * no `prime` síncrono e no re-bake fatiado, porque é a IGUALDADE da
 * contagem que garante a mesma chegada por qualquer caminho.
 */
const PRIME_STEPS = 320;

/** Passos de simulação por quadro durante o re-bake fatiado. */
const PASSOS_DO_REASSAR_POR_QUADRO = 16;

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export class StellarBody {
  readonly group = new THREE.Group();
  readonly params: StellarParams;
  /** rad/s de tela, derivado de `params.rotPeriodDays` no construtor */
  private readonly rotSpeed: number;
  private ctx: any;
  private lastTime = -1;
  private simAccum = 0;
  private chromoAccum = 0;
  private scale: number;
  private camDirN = new THREE.Vector3(0, 0, 1);
  private limboFade = 1;
  private kn: Record<string, number>;
  private sunRotM4 = new THREE.Matrix4();
  private camRightTmp = new THREE.Vector3();
  private camUpTmp = new THREE.Vector3();
  private promNormal = new THREE.Vector3();
  private promWorldTmp = new THREE.Vector3();
  /** a cirurgia da F2 foi aplicada NESTA instância (as duas portas) */
  private filtroSolarLigado = false;
  /** peso da representação resolvida (M1) — o director escreve; o
   *  `update` o entrega a `uWorldFade`. Nasce 1: sem director escrevendo
   *  (testes de unidade do corpo), o comportamento é o de sempre. */
  private pesoDaLei = 1;
  /** cache do último `uFiltroSolar` escrito — nasce no valor do uniform */
  private filtroSolarAnterior = 1;
  /** a fase do ciclo VIVA (a da data), escrita pelo director por quadro */
  private faseDoCicloViva: FaseDoCiclo;
  /** o T em que o retrato publicado foi assado — a régua do re-bake */
  private cicloAssado = 0;
  /**
   * O RE-BAKE FATIADO. Quando a data anda o bastante, o retrato da
   * cromosfera (e, com o relógio parado, o campo da granulação) precisa
   * ser refeito NA FASE NOVA — e isso só é preciso com o relógio VISUAL
   * PARADO. Com ele andando, o bake estrutural de 8 Hz já refaz o retrato
   * com as cargas de agora e a granulação já relaxa rumo a elas: a data
   * é seguida de graça, e as duas máquinas escrevem no MESMO conjunto de
   * alvos — deixá-las correr juntas rasgaria o retrato ao meio.
   *
   * Fatiado por quadro e COALESCIDO: um re-bake em curso nunca se
   * reinicia nem se enfileira, ele POUSA, e só então a data pode disparar
   * o próximo. O retrato velho continua publicado até o fim, então não há
   * véu nem meia cromosfera em quadro.
   */
  private reassar: { passos: number; fatia: number } | null = null;
  /** as geometrias das cenas de quad (`makeFullscreenScene`) — elas não
   *  moram no `group`, então só esta lista as leva ao `dispose()` */
  private readonly geoDosQuads: THREE.PlaneGeometry[] = [];

  constructor(
    params: StellarParams,
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    quality: QualityLevel,
    /**
     * A FASE DO CICLO NO NASCIMENTO — a data que o mundo já conhece. Não
     * é conforto: o `prime` do construtor assa um retrato completo, e
     * assá-lo na fase errada obrigaria um re-bake no primeiro quadro de
     * TODA sessão. Quem sabe a data é o director; o corpo obedece.
     */
    cicloInicial: FaseDoCiclo = { fase01: 0, ciclo: 0 }
  ) {
    this.params = params;
    this.faseDoCicloViva = cicloInicial;
    this.rotSpeed = rotSpeedFromPeriod(params.rotPeriodDays);
    this.scale = params.radiusPc / DONOR_RADIUS;
    this.group.scale.setScalar(this.scale);

    const tier = TIERS[TIER_FOR[quality]];
    const srand = mulberry32(params.seed);
    // knobs por URL (?solcvol=0 etc.) — a URL é a fonte de verdade,
    // como no resto do app; sem query, os defaults de fábrica valem.
    // `activityLevel` escala os dois knobs de atividade ANTES da URL:
    // no Sol ele é 1, e `1 * x` é o mesmo bit que x — a instância 1 sai
    // idêntica à de antes da parametrização.
    const kn: Record<string, number> = { ...params.knobs };
    kn.spots *= params.activityLevel;
    kn.cycle *= params.activityLevel;
    const q = new URLSearchParams(window.location.search);
    for (const k of Object.keys(kn)) {
      const v = Number.parseFloat(q.get(params.knobPrefix + k) ?? '');
      if (Number.isFinite(v)) kn[k] = v;
    }
    this.kn = kn;
    const ctx: any = {
      renderer,
      // as fábricas fazem ctx.scene.add(mesh) — um Group serve
      scene: this.group,
      // o CME captura ctx.camera na CRIAÇÃO (cme.js:10) — tem de ser a real
      camera,
      // raio em unidades de MUNDO para os raymarches de cvol/cme
      // (cameraPosition/vWorld são parsec — ver patches "transplante:")
      SUN_RADIUS_WORLD: params.radiusPc,
      // as duas pontes de escala para o texto do GLSL (F1) — sem elas o
      // raio físico vira "0.000000" e o guarda de segmento mata todo
      // raio antes do primeiro passo. Ver o bloco acima de SOL_PARAMS.
      SUN_R_GLSL: literalGlsl(params.radiusPc),
      SEG_EPS_GLSL: epsilonDeSegmentoGlsl(params.radiusPc),
      TP: tier,
      TIER: TIER_FOR[quality],
      FBM_OCTAVES: tier.fbm,
      SPHERE_SEG: tier.seg,
      SIM_W: tier.simW,
      SIM_H: tier.simH,
      PROMINENCE_COUNT: tier.prom,
      // streams próprios como no config.js de lá (semeados: capturas
      // reproduzíveis; o three não consome estes streams)
      srand,
      spotRand: mulberry32(params.seed ^ 0x59075eed),
      loopRand: mulberry32(params.seed ^ 0x5eedc0de),
      cmeRand: mulberry32(params.seed ^ 0x00c0e5ed),
      knob: (name: string) => kn[name] ?? 0,
      getControl: (name: string) => kn[name] ?? 0,
      getAppliedControl: (name: string) => kn[name] ?? 0,
      TIME_SCALE: 1, EDU_K: 0, CYCLE_K: kn.cycle, LAPSE_K: 0,
      FPROM_K: kn.fprom, SPOTS_K: kn.spots, LOOP_K: kn.loops,
      CVOL_K: kn.cvol, CME_K: kn.cme,
      DET: false,
      subToggle: {
        sim: true, bake: true, corona: true, corona3d: true,
        loops: true, spots: true, prom: true, cme: true, cmepts: true,
      },
      eduEvent: () => false,
      diagEvent: () => {},
      markInteraction: () => {},
      directorUserExit: null,
      launchCME: () => {},
      maybeLaunchCME: () => {},
      elapsed: 0,
      cyclePhase01: cicloInicial.fase01,
      cycleN: cicloInicial.ciclo,
      // O RELÓGIO LENTO — a data, na unidade do núcleo. Escrito por
      // `escreverCiclo` a cada quadro; nasce no instante que o director
      // passou. Não acumula, não pode acumular: é ele que faz o mesmo
      // instante devolver o mesmo Sol.
      tempoDoCiclo: tempoDoCiclo(cicloInicial),
      // a régua que converte T de volta em (ciclo, fase) — é dela que o
      // núcleo tira a fase EM QUE UMA REGIÃO NASCEU
      UNIDADES_POR_CICLO,
      // a DOSE de ocupação da dramaturgia (1 = sem assistência)
      doseDoSol: 1,
      // A CORRENTE DE UMA VIDA. Semente por (família, índice, vida) — é
      // o que substituiu o stream compartilhado que ANDAVA a cada
      // renascimento. A família separa regiões de grupos de manchas para
      // um não deslocar o outro.
      correnteDaVida: (familia: string, i: number, k: number) =>
        mulberry32(
          (params.seed ^ Math.imul(FAMILIAS_DA_VIDA[familia] ?? 0, 0x9e3779b1)
            ^ Math.imul(i + 1, 0x85ebca6b) ^ Math.imul(k | 0, 0xc2b2ae35)) >>> 0
        ),
      solarMaxK: 0,
      surfFlareT: 999,
      surfFlareAmp: 0,
      surfFlareCooldown: 6,
      flareSeedVal: 0,
      bakeStep: -1,
      bakeTime: 0,
      bakeSwapT: 0,
      bakeCycleDt: 0.4,
      camDist: DONOR_FIT,
      fitDist: DONOR_FIT,
      MACRO_SLOW,
      ROT_SPEED: this.rotSpeed,
      rtType: THREE.HalfFloatType,
      isHDR: true,
      quadCamera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
      // As CINCO cenas de quad (sim, três da cromosfera, PIL) vivem FORA
      // do `group` — são cenas de passo, não cena de mundo —, e por isso
      // o `traverse` do `dispose()` nunca as alcançou. Com um Sol por
      // aba isso não custava nada; com a troca de tier ao vivo (Ajustes
      // C) custava 5 geometrias POR CLIQUE, e o amostrador de memória as
      // pegou. A lista é a coleira: quem cria, anota.
      makeFullscreenScene: (material: THREE.Material) => {
        const geometria = new THREE.PlaneGeometry(2, 2);
        this.geoDosQuads.push(geometria);
        const mesh = new THREE.Mesh(geometria, material);
        mesh.frustumCulled = false;
        const s = new THREE.Scene();
        s.add(mesh);
        return s;
      },
    };
    ctx.NOISE_GLSL = NOISE_GLSL.replace('i<5;', 'i<' + tier.fbm + ';');
    ctx.tuneLic = (src: string) =>
      tier.lic7
        ? src
        : src
            .replace(/int i=-6;i<=6/g, 'int i=-3;i<=3')
            .replace(/float\(i\)\/6\.0/g, 'float(i)/3.0');
    this.ctx = ctx;

    // Ordem de criação do main.js original — dependências implícitas
    ctx.gran = createGranulation(ctx);
    ctx.simRTs = ctx.gran.simRTs;
    ctx.simUniforms = ctx.gran.simUniforms;
    ctx.simRTOptions = ctx.gran.simRTOptions;
    ctx.pil = createPIL(ctx);
    createSunBase(ctx);
    ctx.act = createActivity(ctx);
    ctx.charges = ctx.act.charges;
    ctx.pairStates = ctx.act.pairStates;
    createSunUniforms(ctx);
    ctx.chromo = createChromo(ctx);
    createSunMesh(ctx);
    // a fotosfera é ocultador do rascunho do campo (item 47): estrela
    // atrás do Sol não vaza clarão. Coroa/cromosfera/ejeções ficam fora.
    ctx.sunMesh.layers.enable(CAMADA_DOS_OCULTADORES);
    // F2, LEI SEM PORTA desde o M1. A fotosfera emite a radiância
    // verdadeira na unidade de tela; a porta `?bfoto=` morreu com a
    // migração (regra iv do §4 da LEI-DA-ESTRELA) — o lado A do A/B vive
    // nas capturas versionadas e no teste numérico, nunca mais num ramo
    // de runtime.
    //
    // A CONDIÇÃO QUE FICA NÃO É ZELO, é o half-float: com `?bemis=0` a
    // curva é identidade exata, e identidade sobre 2,7e10 é o buffer
    // saturado em 65.504 no primeiro pixel do disco — o quadro branco que
    // a onda existe para consertar. Quem pedir a volta do joelho leva
    // junto a volta da paleta autorada; ou as duas, ou nenhuma.
    //
    // O FATOR SAI DA PONTE DE UNIDADES (`radianciaDeTela`), a MESMA que o
    // invariante da troca cobra em `luzDaCasa.test.ts` — uma escrita só
    // para a lei, com o raio DESTA instância. A metade geométrica dela já
    // é da instância; a fotométrica ainda é do Sol (`magnitudeDoSol`), e é
    // a E3 — `StellarBody` parametrizado por `teffK` — que a solta. Passar
    // `params.radiusPc` em vez do `RAIO_SOL_PC` constante é o que faz esse
    // dia ser um diff em `luzDaCasa.ts`, não uma caça a literais aqui
    // dentro.
    if (BETA_DA_EMISSAO > 0) {
      const mat = ctx.sunMesh.material as THREE.ShaderMaterial;
      mat.fragmentShader = cirurgiaDaFotosfera(
        mat.fragmentShader,
        radianciaDeTela(RADIANCIA_DA_FOTOSFERA, params.radiusPc),
        BETA_DA_EMISSAO
      );
      // O FILTRO nasce em 1 — radiância verdadeira, o comportamento da F2
      // crua — e só desce quando o director escreve. O uniform entra no
      // MESMO objeto que o vendorizado entregou ao material (`uniforms:
      // sunUniforms`, sun.js:857), e ANTES do primeiro render: o three
      // monta a lista de uniforms na COMPILAÇÃO do programa, e uma chave
      // que aparecesse depois nunca chegaria à GPU.
      ctx.sunUniforms.uFiltroSolar = { value: 1 };
      this.filtroSolarLigado = true;
      mat.needsUpdate = true;
    }
    ctx.sunInvRot = new THREE.Matrix3();
    createCoronaRays(ctx);
    createCoronaVolume(ctx);
    createCME(ctx);
    // partículas do CME: -mv.z em parsec de volta à régua do doador
    // meshes NASCE [null, null] (cme.js) e o tier low nunca as preenche
    // (cmen=0 desliga o subsistema inteiro) — sem o m?. o construtor
    // estourava em ?q=performance. Ficou escondido porque o ?q= só era
    // aplicado DEPOIS do init: o tier low nunca tinha rodado.
    for (const m of ctx.cmePts?.meshes ?? []) {
      if (m?.material?.uniforms?.uZScale) m.material.uniforms.uZScale.value = 1 / this.scale;
    }
    createSpicules(ctx);
    ctx.prom = createProminences(ctx);
    createLoops(ctx);
    createFlares(ctx);

    // inclinação do eixo (Sol: ~7,25°, como no original)
    ctx.sunMesh.rotation.z = params.tiltRad;
    ctx.prominenceGroup.rotation.z = params.tiltRad;
    ctx.spiculeMesh.rotation.z = params.tiltRad;
    ctx.loopGroup.rotation.z = params.tiltRad;

    this.prime(renderer);
  }

  // Sim + bake síncronos: põe as regiões NA FASE PEDIDA, evolui o Br na
  // direção delas e publica um retrato completo da cromosfera. Usado
  // pelo `prime` do construtor. A ORDEM importa e mudou em 21/08: as
  // cargas primeiro, senão os N passos relaxam rumo a um estado que já
  // não existe e o retrato sai meio ciclo atrasado.
  private bakeNow(simSteps: number) {
    const ctx = this.ctx;
    const prevRT = ctx.renderer.getRenderTarget();
    ctx.act.updateActiveRegions(ctx.tempoDoCiclo);
    for (let i = 0; i < simSteps; i++) ctx.gran.stepSimulation(SIM_DT);
    ctx.chromo.snapshotBakeInputs();
    for (let s = 0; s < 8; s++) ctx.chromo.bakeChromoSlice(s, ctx.elapsed);
    this.publicarRetrato();
    ctx.renderer.setRenderTarget(prevRT);
  }

  /** o passo comum a `bakeNow` e ao re-bake: o retrato novo entra INTEIRO */
  private publicarRetrato() {
    const ctx = this.ctx;
    ctx.bakePrev = ctx.bakeCur = ctx.bakeWrite;
    ctx.bakeWrite = (ctx.bakeCur + 1) % 3;
    ctx.bakeSwapT = ctx.elapsed;
    const set = ctx.bakeSets[ctx.bakeCur];
    ctx.sunUniforms.uChromoTex.value = set.s.texture;
    ctx.sunUniforms.uChromoFar.value = set.c.texture;
    ctx.sunUniforms.uChromoTexP.value = set.s.texture;
    ctx.sunUniforms.uChromoFarP.value = set.c.texture;
    ctx.sunUniforms.uBakeMix.value = 1;
    this.cicloAssado = ctx.tempoDoCiclo;
  }

  /**
   * O RE-BAKE FATIADO, um passo por quadro. É a MESMA máquina do `prime`
   * — mesma semente, MESMA CONTAGEM de passos —, só que repartida no
   * orçamento de quadro em vez de bloquear a thread. É essa igualdade
   * que faz a chegada ser bit-idêntica por qualquer caminho: nunca se
   * integra para trás; re-semeia-se e repete-se a contagem fixa.
   *
   * A SEMENTE É O PONTO. Ele só roda com o relógio visual parado, e ali
   * NADA integra a granulação — então o campo é REFEITO da semente, com
   * a contagem fixa, e a chegada é a mesma por qualquer caminho. Com o
   * relógio andando esta máquina nem acorda: quem segue a data é a
   * relaxação de sempre, 5 passos por quadro, e re-semear ali trocaria o
   * padrão de grânulos duas vezes por segundo — um strobo.
   */
  private passoDoReassar() {
    const ctx = this.ctx;
    const r = this.reassar!;
    const prevRT = ctx.renderer.getRenderTarget();
    if (r.passos === 0 && ctx.gran.seedSimulation) ctx.gran.seedSimulation();
    if (r.passos < PRIME_STEPS) {
      const ate = Math.min(PRIME_STEPS, r.passos + PASSOS_DO_REASSAR_POR_QUADRO);
      for (let i = r.passos; i < ate; i++) ctx.gran.stepSimulation(SIM_DT);
      r.passos = ate;
    } else {
      if (r.fatia === 0) ctx.chromo.snapshotBakeInputs();
      ctx.chromo.bakeChromoSlice(r.fatia, ctx.elapsed);
      r.fatia++;
      if (r.fatia >= 8) {
        this.publicarRetrato();
        this.reassar = null;
      }
    }
    ctx.renderer.setRenderTarget(prevRT);
  }

  // Estado apresentável ANTES do primeiro frame (e do t=0 das capturas):
  // semente + relaxamento LONGO do sim (o Br semeado precisa convergir
  // para as cargas fracas do mínimo — senão o disco nasce com filamentos
  // de campo que não existe) + um bake completo. Sob o véu.
  private prime(renderer: THREE.WebGLRenderer) {
    const ctx = this.ctx;
    const prev = renderer.getRenderTarget();
    if (ctx.gran.seedSimulation) ctx.gran.seedSimulation();
    this.bakeNow(PRIME_STEPS);
    // coroa volumétrica: corre a máquina de fatias até a 1ª publicação —
    // sem isto, capturas ?shot= (delta 0) nunca a veriam
    for (let i = 0; i < 220 && !ctx.cvolReady; i++) {
      if (ctx.CVOL_STEPS > 0) ctx.cvolFrame(true, 1 / 30, false);
      else break;
    }
    renderer.setRenderTarget(prev);
  }

  // (sem warmupMaterials: os quads de sim/bake compilam no prime(),
  // com RT amarrado — a variante certa; os meshes do group entram na
  // cena antes do compileAsync do director e são cobertos por ele)

  /**
   * O corpo tem um retrato COMPLETO publicado: nenhum bake fatiado a meio
   * caminho (`bakeStep < 0` — as 8 fatias publicam de uma vez, e capturar
   * no meio mostraria meia cromosfera nova sobre meia velha) e a coroa
   * volumétrica já na primeira publicação (`cvolReady`, que o `prime` roda
   * até acontecer justamente porque sob `?shot=` o delta é 0 e a máquina
   * de fatias nunca giraria).
   *
   * SOMENTE LEITURA, e isso é contrato: quem consulta é o sinal de
   * prontidão do harness de captura (`window.__director.captura`). Nenhum
   * ramo daqui escreve estado nem toca no caminho de render — se tocasse,
   * o gate de identidade estaria medindo a própria régua.
   */
  get assentado(): boolean {
    const ctx = this.ctx;
    return (
      ctx.bakeStep < 0 &&
      // o re-bake pela data conta como retrato a meio caminho: capturar
      // no meio dele fotografaria a cromosfera da data ANTERIOR
      this.reassar === null &&
      (!(ctx.CVOL_STEPS > 0) || Boolean(ctx.cvolReady))
    );
  }

  /**
   * O FILTRO SOLAR DECLARADO (F2), escrito por quadro pelo director.
   *
   * `g = 1` ⇒ a fotosfera emite a radiância VERDADEIRA; `g = 0` ⇒ a
   * paleta H-alfa autorada, o override que a Lei da Estrela §E3 declara.
   * Entre as duas pontas a descida é em STOPS (o `pow` do fragment) — o
   * porquê está escrito no cabeçalho da seção F2, junto com a conta.
   *
   * QUEM DECIDE O g É O DIRECTOR, e a régua dele é a MESMA da cessão do
   * Sol-ponto — a razão `discoPx / haloPx` —, com a rampa PRÓPRIA que a
   * travessia de 26 magnitudes exige: `filtroSolarAlvo(discoPx/haloPx)`,
   * esticada simetricamente em log de 0,4 a 2,5 (`world/lodStellar.ts`,
   * onde está escrito por que ela não é a curva da cessão). Este método
   * não a reproduz nem a adivinha — se a régua morasse aqui, a casa teria
   * duas cópias de uma lei que precisa andar em passo com a cessão, e a
   * primeira a mudar deixaria a outra para trás em silêncio.
   *
   * SEM A CIRURGIA É NO-OP SILENCIOSO, e é o contrato certo: com
   * `?bfoto=0` (ou `?bemis=0`) a cirurgia não rodou, `uFiltroSolar` não
   * existe no material, e o director — que não sabe de porta nenhuma —
   * chama isto todo quadro do mesmo jeito. Lançar aqui transformaria o
   * lado A do A/B em erro por quadro.
   *
   * A ESCRITA É CACHEADA, no precedente do `uGain` de `planetas.ts`: o g
   * fica parado em 1 na viagem inteira, e só acorda no último trecho da
   * aproximação — escrever mesmo assim sujaria o uniform 60×/s por nada.
   */
  escreverFiltroSolar(g: number) {
    if (!this.filtroSolarLigado) return;
    // valor envenenado NÃO é escrito: `pow(2,7e10, NaN)` pinta o disco de
    // preto (ou de lixo), e o último valor são é melhor que qualquer
    // fallback inventado aqui.
    if (!Number.isFinite(g)) return;
    const v = g <= 0 ? 0 : g >= 1 ? 1 : g;
    if (v === this.filtroSolarAnterior) return;
    this.filtroSolarAnterior = v;
    this.ctx.sunUniforms.uFiltroSolar.value = v;
  }

  /**
   * O PESO DA REPRESENTAÇÃO RESOLVIDA (M1 da Lei da Estrela): quanto
   * desta malha a repartição única manda desenhar neste quadro —
   * `wResolvido·wMalha` de `repartir` (estrela.ts). Quem o calcula é o
   * director (só ele tem câmera e instrumento); o corpo só obedece, na
   * mesma divisão de trabalho de `escreverFiltroSolar`.
   *
   * Vai para `uWorldFade`, o multiplicador PÓS-compressão que o
   * vendorizado já tinha — a cessão de representação aplicada por fora,
   * na ordem que o invariante pós-curva (§5.1) exige. Envenenado não
   * escreve, pelo mesmo motivo do filtro.
   */
  escreverPesoDaLei(w: number) {
    if (!Number.isFinite(w)) return;
    this.pesoDaLei = w <= 0 ? 0 : w >= 1 ? 1 : w;
  }

  /**
   * A FASE DO CICLO, escrita por quadro pelo director a partir da DATA
   * SIMULADA (`faseDoCiclo(jdVivo)`, a lei da estrela). Mesma divisão de
   * trabalho do filtro e do peso: quem tem o relógio é o director; o
   * corpo obedece. É esta linha que faz o Sol do Atlas ter calendário.
   *
   * Escrever é BARATO e idempotente: enquanto a data não mover o
   * bastante (`LIMIAR_DE_REASSAR`), nada é re-assado.
   */
  escreverCiclo(fase: FaseDoCiclo) {
    if (!Number.isFinite(fase.fase01) || !Number.isFinite(fase.ciclo)) return;
    this.faseDoCicloViva = fase;
    const ctx = this.ctx;
    ctx.cyclePhase01 = fase.fase01;
    ctx.cycleN = fase.ciclo;
    ctx.tempoDoCiclo = tempoDoCiclo(fase);
  }

  /**
   * O LAPSO DO RELÓGIO (item 17). `taxa` é quantos segundos de céu andam
   * por segundo de relógio; ela vira `LAPSE_K` na unidade do núcleo
   * doador (0..1 ↔ multiplicador 1..40 de `sol/cycle.js`, invertendo
   * `cycleMultiplierFor`). É o único interruptor das rampas largas do
   * bloco C de `sol/activity.js` — sem ele o nascimento e a morte de
   * plage/faculae viram pop no limbo assim que o relógio do Atlas
   * acelera. Taxa 1 (relógio parado, ao vivo, filme, foto) devolve 0 e o
   * Sol é o de sempre, bit a bit.
   */
  escreverLapso(taxa: number) {
    if (!Number.isFinite(taxa)) return;
    const lapso = ((Math.max(1, taxa) - 1) / 39) ** 2;
    this.ctx.LAPSE_K = lapso >= 1 ? 1 : lapso;
  }

  /**
   * A DOSE DE OCUPAÇÃO da dramaturgia (`director/doseDoSol.ts`): quanto
   * da atividade DAQUELA data aparece. 1 = tudo, e é o valor fora do
   * filme. Ela multiplica a ocupação e não encosta em fase, banda de
   * Spörer, Hale ou dipolo polar — atenuação de QUANTO, nunca invenção
   * de QUANDO.
   */
  escreverDose(d: number) {
    if (!Number.isFinite(d)) return;
    this.ctx.doseDoSol = d <= 0 ? 0 : d >= 1 ? 1 : d;
  }

  /**
   * O ESTADO LÓGICO desta instância, na forma do contrato da Lei
   * (`EstadoDaEstrela`, estrela.ts §3): o corpo declara O QUE ELE É; a
   * observação (quem olha) e o instrumento (a casa) são do director.
   *
   * OS TRÊS CAMPOS DO §5.18 SÃO FACES DESTE ESTADO, e a nomeação é esta:
   *   S(n, t) — a superfície: granulação, manchas, faculae
   *             (`sol/granulation.js`, `sol/activity.js`, `sol/sun.js`);
   *   C(n, h, t) — a cromosfera: casca fina + espículas
   *             (`sol/chromo.js`, `sol/spicules.js`);
   *   E(x, t) — o exterior: coroa, proeminências, loops, flares, CME
   *             (`sol/corona*.js`, `sol/prominences.js`, `sol/loops.js`,
   *             `sol/flares.js`, `sol/cme.js`).
   * Cada estrutura de E tem critério de visibilidade PRÓPRIO — escala
   * projetada e contraste (o `limboFade` deste arquivo, o cone da coroa
   * que desliga abaixo de um texel) — nunca o LOD do renderer.
   *
   * A FASE é a do ciclo VIVO e ela é a da DATA SIMULADA — não há mais
   * inversa de fórmula nenhuma a fazer, porque não há mais acumulador
   * (item 5, 21/08). O §5.20 fica satisfeito pelo caminho mais forte que
   * existe: a fase não "persiste", ela é RECALCULÁVEL — sair de quadro,
   * voltar, recarregar ou trocar de tier devolvem o mesmo Sol porque
   * todos leem o mesmo calendário.
   */
  estadoDaLei(): EstadoDaEstrela {
    const p = this.params;
    return {
      id: p.nome,
      semente: p.seed,
      posicaoPc: [0, 0, 0],
      raioPc: p.radiusPc,
      teffK: p.teffK,
      tempo: this.ctx.elapsed,
      fase: this.faseDoCicloViva.fase01,
      rotacao: {
        periodo: p.rotPeriodDays * 86400,
        eixo: [Math.sin(p.tiltRad), Math.cos(p.tiltRad), 0],
      },
      atividade: { nivel: p.activityLevel },
    };
  }

  /** relógio visual do director (0 sob ?shot=) + câmera */
  update(time: number, camera: THREE.PerspectiveCamera) {
    const ctx = this.ctx;
    ctx.camera = camera;
    const delta = this.lastTime < 0 ? 0 : Math.min(Math.max(time - this.lastTime, 0), 0.1);
    this.lastTime = time;

    // (o relógio RÁPIDO — `ctx.elapsed` — só anda DEPOIS do retorno de
    // invisibilidade, umas linhas abaixo. Item 16: até 21/08 ele era
    // somado aqui, fora de quadro, e o Sol reaparecia com um salto de
    // tudo o que "viveu" enquanto ninguém o via.)

    // câmera em unidades de doador, corrigida por fov: o LOD do disco
    // de lá foi calibrado a fov 42° — mesmo enquadramento, mesmo LOD
    const fovCorr =
      Math.tan((camera.fov * Math.PI) / 360) / DONOR_HALF_FOV;
    ctx.camDist = (camera.position.length() / this.scale) * fovCorr;
    ctx.sunUniforms.uCamDist.value = ctx.camDist;
    this.camDirN.copy(camera.position).normalize();
    ctx.camDirN = this.camDirN;

    // Fade das camadas de LIMBO além do regime do doador: o zoom de lá
    // parava em ~14 R e a dose proeminência+bloom nunca foi calibrada
    // para vista afastada (viravam bolas de bloom no recuo da hélice).
    // Fisicamente proeminências/loops somem a distâncias estelares.
    const fk = (ctx.camDist - 35) / 25;
    this.limboFade = fk <= 0 ? 1 : fk >= 1 ? 0 : 1 - fk * fk * (3 - 2 * fk);
    ctx.prominenceGroup.visible = this.limboFade > 0.01;
    ctx.loopGroup.visible = this.limboFade > 0.01;

    // O PESO DA LEI (M1). `uWorldFade` — que a F3 deixou em 1 SEMPRE por
    // ausência de lei — voltou a ter dono: é o peso da representação
    // RESOLVIDA na repartição única (`wResolvido·wMalha`, estrela.ts),
    // escrito pelo director por quadro via `escreverPesoDaLei`. É o que
    // faz a malha ENTRAR DO ZERO enquanto o Sol-ponto cede na mesma
    // medida (aCede = wResolvido na camada dos dez): a soma dos pesos é
    // 1 por construção, e o armar binário do gate do palco (4 px) fica
    // invisível em pixel — no instante em que o grupo liga, o peso ainda
    // é 0. A ORDEM não mudou: a compressão vem antes do fade, porque o
    // invariante da troca é cobrado PÓS-curva (§5.1 da Lei) e o joelho
    // não pode andar durante a transição.
    ctx.sunUniforms.uWorldFade.value = this.pesoDaLei;
    ctx.spiculeUniforms.uWorldFade.value = this.pesoDaLei;
    ctx.coronaRaysUniforms.uRayBoost.value = this.kn.ray;
    ctx.coronaRaysUniforms.uHalo.value = this.kn.halo;
    if (!this.group.visible) return;

    // O RELÓGIO RÁPIDO, aqui e não lá em cima (item 16): corpo fora de
    // quadro não envelhece. Antes deste ponto ficam só as leituras de
    // câmera e os uniforms que o ponto do Sol ainda consome; daqui para
    // baixo é tudo trabalho de corpo em quadro.
    ctx.elapsed += delta;
    ctx.sunUniforms.uTime.value = ctx.elapsed;

    // --- o retrato SEGUE A DATA (item 5) ------------------------------
    // COALESCER É DEIXAR POUSAR. Um re-bake em curso NUNCA se reinicia:
    // reiniciá-lo a cada vez que a data passa do limiar parece "seguir a
    // fase mais de perto" e é o contrário — MEDIDO no degrau de 115,7
    // dias/s, com a data andando ~6 unidades por quadro contra um limiar
    // de 7,2, a máquina reiniciava a cada quadro e o retrato NUNCA
    // publicava. Deixando pousar, ele pousa e a data seguinte dispara o
    // próximo.
    //
    // TRÊS GUARDAS, e cada uma tem uma razão escrita: `delta === 0`
    // porque com o relógio andando quem segue a data é o bake de 8 Hz de
    // sempre, e as duas máquinas escrevem no MESMO alvo; `bakeStep < 0`
    // porque um bake estrutural a meio caminho não pode ser atropelado;
    // e o lugar — depois do retorno de invisibilidade — porque re-assar
    // um Sol que ninguém vê é gastar quadro à toa, e quando ele voltar a
    // ser corpo a comparação dispara sozinha.
    if (
      this.reassar === null &&
      delta === 0 &&
      ctx.bakeStep < 0 &&
      Math.abs(ctx.tempoDoCiclo - this.cicloAssado) > LIMIAR_DE_REASSAR
    ) {
      this.reassar = { passos: 0, fatia: 0 };
    }

    // --- simulação de convecção, fatiada (guard-5 + dreno, como lá) ---
    this.simAccum += delta;
    let guard = 0;
    while (this.simAccum >= ctx.TP.simStep && guard < 5) {
      this.simAccum -= ctx.TP.simStep;
      ctx.gran.stepSimulation(SIM_DT);
      guard++;
    }
    if (this.simAccum > ctx.TP.simStep) this.simAccum = ctx.TP.simStep;

    // --- bake estrutural ~8 Hz, 8 fatias, publicação com crossfade ---
    this.chromoAccum += delta;
    if (ctx.bakeStep < 0 && this.chromoAccum >= 0.12 && delta > 0 && this.reassar === null) {
      this.chromoAccum = 0;
      ctx.bakeStep = 0;
      ctx.bakeTime = ctx.elapsed;
      ctx.chromo.snapshotBakeInputs();
    }
    if (ctx.bakeStep >= 0) {
      ctx.chromo.bakeChromoSlice(ctx.bakeStep, ctx.bakeTime);
      ctx.bakeStep++;
      if (ctx.bakeStep >= 8) {
        ctx.bakeStep = -1;
        ctx.bakePrev = ctx.bakeCur;
        ctx.bakeCur = ctx.bakeWrite;
        ctx.bakeWrite = ctx.bakeCur === ctx.bakePrev ? (ctx.bakeCur + 1) % 3 : 3 - ctx.bakeCur - ctx.bakePrev;
        ctx.bakeCycleDt = Math.max(0.05, Math.min(4.5, (ctx.elapsed - ctx.bakeSwapT) * 0.85));
        ctx.bakeSwapT = ctx.elapsed;
        // o retrato de 8 Hz também é um retrato DA DATA: anotá-lo aqui é
        // o que faz parar o relógio não disparar um catch-up para uma
        // fase que já está na tela
        this.cicloAssado = ctx.tempoDoCiclo;
        ctx.sunUniforms.uChromoTex.value = ctx.bakeSets[ctx.bakeCur].s.texture;
        ctx.sunUniforms.uChromoFar.value = ctx.bakeSets[ctx.bakeCur].c.texture;
        ctx.sunUniforms.uChromoTexP.value = ctx.bakeSets[ctx.bakePrev].s.texture;
        ctx.sunUniforms.uChromoFarP.value = ctx.bakeSets[ctx.bakePrev].c.texture;
      }
    }
    ctx.sunUniforms.uBakeMix.value = Math.min(1, (ctx.elapsed - ctx.bakeSwapT) / ctx.bakeCycleDt);

    // --- rotação + inversa compartilhada (tilt+spin) ---
    ctx.sunMesh.rotation.y += this.rotSpeed * delta;
    ctx.prominenceGroup.rotation.y = ctx.sunMesh.rotation.y;
    ctx.spiculeMesh.rotation.y = ctx.sunMesh.rotation.y;
    ctx.loopGroup.rotation.y = ctx.sunMesh.rotation.y;
    this.sunRotM4.makeRotationFromQuaternion(ctx.sunMesh.quaternion);
    ctx.sunInvRot.setFromMatrix4(this.sunRotM4).transpose();
    ctx.spiculeUniforms.uTime.value = ctx.elapsed;

    // --- ciclo de 11 anos + regiões ativas ---------------------------
    // O relógio LENTO é a data e chega escrito (`escreverCiclo`): não há
    // o que integrar aqui, e é por isso que ele anda para trás de graça.
    // A dramaturgia por torção de fase morreu — o filme atenua OCUPAÇÃO
    // (`escreverDose`), nunca a fase.
    if (ctx.act.cycleDepth() > 0.001) ctx.act.updateCycleState();
    else if (ctx.solarMaxK !== 0) ctx.solarMaxK = 0;
    ctx.sunUniforms.uMaxK.value = ctx.solarMaxK;
    ctx.act.updateActiveRegions(ctx.tempoDoCiclo);
    if (this.reassar !== null) this.passoDoReassar();

    // --- flare de superfície (duas fases; sem CME na fase 1) ---
    if (delta > 0) {
      ctx.surfFlareCooldown -= delta;
      if (ctx.surfFlareCooldown <= 0) {
        if (ctx.triggerSurfaceFlare()) {
          ctx.surfFlareT = 0;
          // flare grande pode soltar CME (sorteio no stream próprio)
          ctx.maybeLaunchCME();
        }
        ctx.surfFlareCooldown =
          (12 + ctx.srand() * 14) / (0.5 + 1.1 * ctx.coronaRaysUniforms.uActivity.value);
      }
      ctx.surfFlareT += delta;
    }
    const sfImp = ctx.flareEnvImp(ctx.surfFlareT);
    const sfGrad = ctx.flareEnvGrad(ctx.surfFlareT);
    let sfEnv = sfImp * 1.7 * ctx.surfFlareAmp;
    let sfRib = (0.45 * sfImp + 0.85 * sfGrad) * 1.7 * ctx.surfFlareAmp;
    if (sfEnv < 0.004) sfEnv = 0;
    if (sfRib < 0.004) sfRib = 0;
    const sfSep = 0.018 + 0.05 * (1.0 - Math.exp(-ctx.surfFlareT * 0.45));
    const sfLen = 0.055 + 0.04 * (1.0 - Math.exp(-ctx.surfFlareT * 0.45));
    ctx.sunUniforms.uFlare.value.set(ctx.surfFlareDir.x, ctx.surfFlareDir.y, ctx.surfFlareDir.z, sfEnv);
    ctx.sunUniforms.uFlareGeo.value.set(ctx.flareTanDir.x, ctx.flareTanDir.y, ctx.flareTanDir.z, sfSep);
    ctx.sunUniforms.uFlarePerp.value.set(ctx.flarePerpDir.x, ctx.flarePerpDir.y, ctx.flarePerpDir.z, sfLen);
    ctx.sunUniforms.uFlareRib.value.set(
      sfRib, 0.01, ctx.flareSeedVal,
      Math.min(2.6, Math.max(1.0, ctx.fitDist / ctx.camDist))
    );

    // --- loops coronais + arcada pós-flare ---
    ctx.updateLoops(delta);

    // --- CME: relógio, casca e partículas (episódico; custo ~zero fora) ---
    if (ctx.cmePts?.on) {
      ctx.cmePts.meshes[0].rotation.y = ctx.sunMesh.rotation.y;
      ctx.cmePts.meshes[1].rotation.y = ctx.sunMesh.rotation.y;
    }
    ctx.updateCME(delta);

    // --- proeminências: ciclo de vida, campo, agitação, orientação ---
    ctx.promStates.forEach((ps: any) => {
      const lx = ((ctx.elapsed + ps.phase) % ps.period) / ps.period;
      ps.env = ctx.act.lifeEnvelope(lx);
      if (lx >= 0.9) {
        if (!ps.reborn) {
          ctx.placeProminence(ps, ctx.sampleProminenceAnchor());
          ps.reborn = true;
        }
      } else ps.reborn = false;
      const Bm = ctx.act.bFieldJS(ps.meshes[0].userData.dir).length();
      const fieldK = Math.min(1.2, 0.35 + 0.65 * (Bm / 1.1));
      // A RESPOSTA DA PROEMINÊNCIA AO CAMPO segue o campo com atraso —
      // e com o relógio PARADO ela SNAPA nele, em vez de ficar travada
      // no último valor que viu andando. Sem esta linha o filtro virava
      // um latch: uma captura (`?shot=`) mostrava proeminências
      // respondendo às cargas de um instante ANTERIOR, e entrar no Atlas
      // por t=10 ou por t=100 dava dois Sóis mesmo com todo o resto
      // idêntico — foi este o último resíduo de caminho que o item 5
      // encontrou, e ele estava aqui desde sempre. É a mesma doutrina do
      // catch-up de salto: com o relógio parado, o Sol vive o salto na
      // hora.
      const seguirOCampo = delta > 0 ? Math.min(1, delta * 0.8) : 1;
      ps.fieldK = ps.fieldK === undefined ? fieldK : ps.fieldK + (fieldK - ps.fieldK) * seguirOCampo;
      ps.agitT = ps.agitT === undefined ? 999 : ps.agitT + delta;
      ps.agit = (1.0 - Math.exp(-ps.agitT * 3.0)) * Math.exp(-ps.agitT * 0.55);
      if (ps.agit < 0.004) ps.agit = 0;
      ps.drift = (ps.drift || 0) + delta * (1.0 + 4.0 * ps.agit);
      if (!ps.orient) ps.orient = [0, 0];
      for (let oi = 0; oi < 2; oi++) {
        ps.meshes[oi].getWorldDirection(this.promNormal);
        const nv = Math.abs(this.promNormal.dot(this.camDirN));
        const ek = Math.min(1, Math.max(0, (nv - 0.03) / 0.13));
        ps.orient[oi] = (1.0 - 0.5 * nv) * ek * ek * (3 - 2 * ek);
      }
      ps.orientNorm = 1.05 / Math.max(0.45, ps.orient[0] + ps.orient[1]);
      if (ctx.FPROM_K > 0.001) {
        ps.flat.visible = true;
        const facingF = this.promWorldTmp
          .copy(ps.flat.userData.dir)
          .applyQuaternion(ctx.prominenceGroup.quaternion)
          .dot(this.camDirN);
        let sF = Math.min(1, Math.max(0, (facingF - 0.1) / 0.42));
        sF = sF * sF * (3.0 - 2.0 * sF);
        const fu = ps.flat.material.uniforms;
        fu.uLife.value = ps.env;
        fu.uAgit.value = ps.agit;
        fu.uPTime.value = ps.drift;
        fu.uTime.value = ctx.elapsed;
        fu.uAbsorb.value =
          Math.min(1.0, ctx.FPROM_K) * 0.45 * sF * Math.min(1.0, ps.fieldK) * this.limboFade;
      } else if (ps.flat.visible) ps.flat.visible = false;
    });
    ctx.prominenceMeshes.forEach((m: any) => {
      const ps = m.userData.state;
      m.material.uniforms.uLife.value = ps.env;
      m.material.uniforms.uAgit.value = ps.agit;
      m.material.uniforms.uPTime.value = ps.drift;
      const famp = 0.16 + 0.14 * ps.fieldK + 0.45 * ps.agit;
      const f = 0.65 + famp * ctx.act.flicker1f(ctx.elapsed * m.userData.speed + m.userData.phase);
      let base = Math.max(0.55, Math.min(1.15, f + 0.2));
      base *= 0.3 + 0.7 * ps.env;
      base *= ps.fieldK;
      base += 1.6 * ps.agit;
      const facing = this.promWorldTmp
        .copy(m.userData.dir)
        .applyQuaternion(ctx.prominenceGroup.quaternion)
        .dot(this.camDirN);
      let s = Math.min(1, Math.max(0, (facing - 0.1) / 0.42));
      s = s * s * (3.0 - 2.0 * s);
      base *= 0.05 + 0.95 * (1.0 - s);
      base *= ps.orient[m.userData.twinIdx] * ps.orientNorm;
      m.material.uniforms.uIntensity.value = base * this.limboFade;
      m.material.uniforms.uTime.value = ctx.elapsed;
    });
    ctx.flushProminences();

    // --- coroa (plano de raias): billboard + atividade global ---
    ctx.coronaRays.quaternion.copy(camera.quaternion);
    ctx.coronaRaysUniforms.uTime.value = ctx.elapsed;
    this.camRightTmp.set(1, 0, 0).applyQuaternion(camera.quaternion);
    this.camUpTmp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    ctx.coronaRaysUniforms.uRight.value.copy(this.camRightTmp);
    ctx.coronaRaysUniforms.uUp.value.copy(this.camUpTmp);
    let actSum = 0;
    for (let ai = 0; ai < ctx.pairStates.length; ai++) actSum += Math.abs(ctx.pairStates[ai].lead.w);
    ctx.coronaRaysUniforms.uActivity.value = Math.min(1.0, actSum / 4.0);

    // --- coroa volumétrica: uniforms + scheduler fatiado do sampler3D ---
    if (ctx.CVOL_STEPS > 0) {
      const cvolOn = ctx.CVOL_K > 0.001 && !ctx.cvolKilled;
      const cvolShow = cvolOn && ctx.cvolReady;
      ctx.coronaVol.visible = cvolShow;
      ctx.coronaRaysUniforms.uCvolMix.value = cvolShow ? Math.min(1.0, ctx.CVOL_K) : 0.0;
      if (cvolShow) {
        ctx.coronaVol.quaternion.copy(camera.quaternion);
        ctx.cvolUniforms.uCvol.value = ctx.CVOL_K;
        ctx.cvolUniforms.uTime.value = ctx.elapsed;
        ctx.cvolUniforms.uActivity.value = ctx.coronaRaysUniforms.uActivity.value;
        // rotação PURA (matrixWorld herdaria a escala do group)
        ctx.cvolInvRot.copy(ctx.sunInvRot);
      }
      ctx.cvolFrame(cvolOn, delta, false);
    }
  }

  dispose() {
    const ctx = this.ctx;
    // As proeminências são Object3D-PROXY com `material = { uniforms }`
    // (prominences.js): objeto simples, SEM dispose. Chamar dispose() em
    // qualquer material truthy estourava aqui e abortava todo o teardown
    // — inclusive os RTs abaixo e o Engine (ver director.dispose).
    const free = (x: any) => x?.dispose?.();
    this.group.traverse((o: any) => {
      free(o.geometry);
      const m = o.material;
      if (Array.isArray(m)) m.forEach(free);
      else free(m);
    });
    for (const rt of ctx.simRTs ?? []) rt.dispose();
    for (const set of ctx.bakeSets ?? []) {
      set.c?.dispose?.();
      set.s?.dispose?.();
    }
    // OS DOIS RTs QUE NÃO ESTAVAM EM LISTA NENHUMA: o do PIL (readback do
    // Br para as âncoras de proeminência) e o snapshot do sim que a
    // cromosfera assa. Nasceram privados dentro dos vendorizados; a troca
    // de tier ao vivo (Ajustes C) transformou "um por aba" em "um por
    // clique", e eles se publicam no ctx desde então (ver os comentários
    // `transplante:` em pil.js e chromo.js).
    free(ctx.pilRT);
    free(ctx.bakeSimRT);
    // as cenas de quad vivem fora do `group` — só esta lista as alcança
    for (const g of this.geoDosQuads) g.dispose();
    this.geoDosQuads.length = 0;
    // Data3DTexture da coroa volumétrica: material.dispose() NÃO dispõe
    // texturas, e esta não pertence a nenhum material do traverse.
    free(ctx.cvolTex);
  }
}
