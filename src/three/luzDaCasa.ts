// ============================================================
// A UNIDADE DE LUZ DA CASA — uma régua só para brilho, do jeito que
// `escala.ts` já é uma régua só para tamanho.
//
// POR QUE ELE EXISTE. A casa tem TRÊS normalizações de luz que não se
// convertem entre si, e é dessa incomunicabilidade que nasce o pior número
// do projeto:
//
//   `ANCORA_UA = 1`   (`lib/atlas/luz.ts:59`)  — "a Terra a 1 UA lê 1"
//   `expoM0 = 3,5`    (três literais)          — a magnitude cujo pico vale 1
//   `M_V☉ = 4,83/4,85` (duas cópias)           — o ponto-zero das estrelas
//
// Nenhuma delas sabe responder à pergunta que a Lei da Estrela faz: **quantas
// vezes a superfície do Sol?** E como ninguém sabia responder, a fotosfera da
// malha ficou autorada em radiância ~1 enquanto a lei do ponto deposita ~2,9e10
// para a MESMA superfície. São ~26 magnitudes de diferença entre dois desenhos
// do mesmo objeto, e o mais importante sobre elas é que **não quebram nenhum
// teste** — porque o cadastro de escala só tinha coluna para TAMANHO.
//
// A ÂNCORA, e a razão não é gosto: **a radiância da fotosfera solar**.
//  1. é a única grandeza INVARIANTE COM A DISTÂNCIA, que é o fato físico
//     central da lei ("chegar perto de uma estrela não a deixa mais brilhante;
//     deixa maior");
//  2. é diretamente comparável entre disco e ponto — `fluxo = radiância ×
//     ângulo sólido` —, que é exatamente o invariante da troca;
//  3. e o número mais duro da casa é literalmente "a superfície do Sol, medida
//     de dois jeitos".
//
// NO DIA 1 ESTE MÓDULO NÃO MOVE UM PIXEL. Ele devolve os números de hoje: a
// ponte `magnitude ↔ fluxo` é a MESMA expressão que `starPSF` já calcula, e
// `radianciaDeCorpoNegro(TEFF_SOL_K)` é 1 exato por construção. O que ele muda
// é que passa a existir UM lugar onde a pergunta tem resposta — e, com a
// segunda coluna de `escala.ts`, um lugar onde a próxima mentira de brilho é
// obrigada a se declarar em vez de nascer calada.
//
// PURO, pelo mesmo motivo que `escala.ts` é: o selo lê os dois e o selo não
// conhece three. A ÚNICA importação é `lib/atlas/stellarPhysics.ts` — TS puro,
// sem uma única importação própria.
//
// E NÃO IMPORTA `escala.ts`, de propósito: é `escala.ts` quem importa daqui, e
// duas setas fariam ciclo. Por isso toda função que precisa de um raio o
// RECEBE como argumento em vez de ir buscá-lo. Quem precisar de
// `diametroAparentePx` — que mora em `world/corpos/corpos.ts` e importa three
// — o importa no TESTE: a conta de tela é da camada de cima, e trazer three
// para dentro desta régua tiraria dela a propriedade que a torna auditável.
// ============================================================
import { SOLAR_ABSOLUTE_MAGNITUDE_V } from '../lib/atlas/stellarPhysics';

// ─── A ÂNCORA ─────────────────────────────────────────────────────────────

/**
 * A UNIDADE. A radiância da fotosfera solar vale 1 **por definição** — todo
 * brilho desta casa é "quantas vezes a superfície do Sol".
 *
 * Não é uma calibração radiométrica absoluta (a casa não tem W/m²/sr em lugar
 * nenhum, e `luz.ts:48-58` já declara a mesma reserva pela sua ponta). É uma
 * escolha de normalização — e é a escolha que faz disco e ponto poderem ser
 * comparados, que é tudo que a troca da lei precisa.
 */
export const RADIANCIA_DA_FOTOSFERA = 1;

/**
 * Temperatura efetiva do Sol, K. ESPELHO de `SOL_PARAMS.teffK`
 * (`world/stellarBody.ts:282`) — a instância nº 1 da lei estelar é quem manda,
 * e `luzDaCasa.test.ts` cobra a igualdade contra a fonte.
 */
export const TEFF_SOL_K = 5772;

// ─── O INSTRUMENTO ────────────────────────────────────────────────────────

/**
 * `expoM0` — a magnitude cujo pico de PSF vale 1. Era TRÊS literais `3.5`
 * espalhados (`world/stars.ts` no default, `director.ts` na construção do
 * campo, `world/wrappedStars.ts` no uniform das cascas), e três literais é o
 * jeito conhecido de uma lei se partir em três leis parecidas sem ninguém ver.
 *
 * Note que o VALOR não muda: 3,5 continua 3,5, e por isso a F1 é bit-neutra.
 * O que muda é o endereço.
 */
export const EXPO_M0 = 3.5;

/**
 * `sigmaPx` — a largura do instrumento em px, na mesma chamada de `director.ts`
 * que publica `expoM0`. Os dois andam juntos porque `starPSF` os usa juntos:
 * separá-los em arquivos diferentes é como a casa perde uma lei de vista.
 */
export const SIGMA_PX = 0.85;

// ─── O PONTO-ZERO, e a divergência que ele DECLARA ────────────────────────

/**
 * M_V☉ = 4,83 — o ponto-zero de `lib/atlas/stellarPhysics.ts:312`, usado pelo
 * `SunStar` (`world/heroStars.ts`) para a magnitude do Sol de longe.
 */
export const M_V_SOL = SOLAR_ABSOLUTE_MAGNITUDE_V;

/**
 * M_V☉ = 4,85 — o ponto-zero que o CAMPO realmente usa. Não está escrito em
 * lugar nenhum com este nome: está embutido em `PONTO_ZERO_SOL_PC = −0,15`
 * (`world/planetas/planetas.ts:164`), que é a magnitude do Sol a 1 pc, e
 * `m(1 pc) = M − 5`. `luzDaCasa.test.ts` cobra a identidade contra a fonte.
 *
 * A DIVERGÊNCIA É DE 0,02 mag = 1,86% de brilho, em 328.749 estrelas. A F1
 * **declara e não conserta**, de propósito: unificar move pixel em todo o céu,
 * e mover pixel é decisão do dono, com foto. O lugar da declaração é a entrada
 * `ponto-zero-do-campo` do cadastro de escala.
 */
export const M_V_SOL_DO_CAMPO = 4.85;

// ─── A PONTE magnitude ↔ fluxo ────────────────────────────────────────────

/**
 * O fluxo recebido de uma fonte de magnitude aparente `m`, na unidade do
 * instrumento. **É a MESMA expressão de `starPSF`** (`shaders/common.ts:306`,
 * `float E = pow(10.0, -0.4 * (m - expoM0));`) — e é essa igualdade, e não uma
 * semelhança, que faz esta régua descrever o que a tela faz.
 *
 * Hoje ela já existe redigitada em quatro lugares: `world/lodStellar.ts`
 * (`psfPointSizePx`, o único de runtime), `core/pupila.ts` (`picoDaPsf`),
 * `world/planetas/planetas.ts` (`picoDaPsf`) e o GLSL. Unificar os quatro é
 * melhoria de estrutura com ganho claro, mas é ONDA PRÓPRIA: `psfPointSizePx`
 * está no caminho de render do Director e de três corpos, e trocar o endereço
 * de uma conta de runtime no meio da onda da luz é misturar dois riscos.
 */
export function fluxoDeMagnitude(m: number, expoM0: number = EXPO_M0): number {
  return Math.pow(10, -0.4 * (m - expoM0));
}

/** A volta: a magnitude que deposita um dado fluxo. */
export function magnitudeDeFluxo(fluxo: number, expoM0: number = EXPO_M0): number {
  return expoM0 - 2.5 * Math.log10(fluxo);
}

// O PICO e o TAMANHO da PSF NÃO nascem aqui, e a ausência é deliberada. Eles
// já existem como espelho em `core/pupila.ts` (`picoDaPsf`) e em
// `world/lodStellar.ts` (`psfPointSizePx`, o único de runtime). Acrescentar
// uma quarta cópia num módulo cuja razão de existir é acabar com lei
// duplicada seria cometer, na primeira linha, o defeito que ele denuncia.
// Quem precisar de pico importa de lá — inclusive o teste deste arquivo.

// ─── A PONTE geometria ↔ fluxo ────────────────────────────────────────────

/**
 * A radiância de uma superfície de corpo negro a `teffK`, na unidade da casa.
 * Stefan-Boltzmann: a radiância vai com T⁴, e o Sol vale 1 **exato** por
 * construção (`Math.pow(1, 4)` é 1 em IEEE754, sem arredondamento).
 *
 * O fato que esta função encarna, e que a lei inteira depende dele: o resultado
 * **não tem `distância` entre os argumentos**. A superfície de uma estrela não
 * fica mais brilhante quando a câmera se aproxima; o que cresce é o ângulo
 * sólido. Quem escrever aqui um `1/d²` está reescrevendo o item 3.
 */
export function radianciaDeCorpoNegro(teffK: number): number {
  return Math.pow(teffK / TEFF_SOL_K, 4);
}

/**
 * O ângulo sólido de um disco de raio `raioPc` visto de `distPc`, em
 * esterradianos, na aproximação de ângulo pequeno: `π·(r/d)²`.
 *
 * O `π·(r/2)²` de um DIÂMETRO e o `π·r²` de um RAIO diferem por 4, e esse
 * fator de 4 é o erro mais fácil de cometer e o mais difícil de ver numa
 * imagem. `luzDaCasa.test.ts` tem sabotagem para ele.
 */
export function anguloSolidoDeDisco(raioPc: number, distPc: number): number {
  const r = raioPc / distPc;
  return Math.PI * r * r;
}

/**
 * O fluxo que uma estrela entrega, na unidade da casa: radiância × ângulo
 * sólido. É a metade "disco" do invariante da troca.
 */
export function fluxoDeEstrela(teffK: number, raioPc: number, distPc: number): number {
  return radianciaDeCorpoNegro(teffK) * anguloSolidoDeDisco(raioPc, distPc);
}

// ─── OS DOIS LADOS DA TROCA ───────────────────────────────────────────────

/**
 * O que o DISCO deposita na tela: radiância × área do disco em px.
 * `π/4 · d²` porque `diametroPx` é diâmetro, não raio.
 */
export function depositoDoDisco(radiancia: number, diametroPx: number): number {
  return radiancia * Math.PI * 0.25 * diametroPx * diametroPx;
}

/**
 * O que o PONTO deposita na tela — o termo FOTOMÉTRICO e só ele.
 *
 * A integral do núcleo gaussiano da PSF é `E` por construção, e o próprio
 * `STAR_FRAG` já promete isso por escrito (`starShaders.ts:131-134`: "como o
 * sprite acompanha o sigma, a integral do gaussiano é o fluxo da estrela").
 *
 * O QUE FICA DE FORA, E POR QUÊ. O fragment deposita mais três termos — halo,
 * espinhos de difração e núcleo esbranquiçado. Nenhum deles é a estrela: são o
 * CLARÃO, e a Lei da Estrela §1 já os separou em uma frase ("o clarão é a
 * lente… não é a estrela"). Somá-los aqui faria o invariante da troca ser
 * cobrado sobre disco-mais-óptica de um lado e disco puro do outro — e aí ele
 * falharia **mesmo com o conserto certo**, que é o convite para alguém ajustar
 * o número até ficar verde. Eles entram como SOBRETAXA DECLARADA do
 * instrumento, medida por integração numérica em `luzDaCasa.test.ts` e
 * registrada na coluna de brilho do cadastro.
 */
export function depositoDoPonto(m: number, expoM0: number = EXPO_M0): number {
  return fluxoDeMagnitude(m, expoM0);
}

/**
 * O VÃO RADIOMÉTRICO: quantas vezes o ponto deposita mais que o disco, para a
 * MESMA superfície, na distância em que o disco tem `diametroPx` pixels.
 *
 * É o número mais duro da casa, e a F1 o transforma de frase em função. Hoje
 * ele vale ~2,9e10 (~26 magnitudes) na troca de 1 px. Quando a fotosfera subir
 * para a unidade — o passo que a Lei chama de F2 — ele passa a valer 1, e o
 * teste que hoje é `it.fails` fica verde sozinho.
 */
export function razaoDiscoPonto(m: number, diametroPx: number, expoM0: number = EXPO_M0): number {
  return depositoDoPonto(m, expoM0) / depositoDoDisco(RADIANCIA_DA_FOTOSFERA, diametroPx);
}

/** O vão em magnitudes, que é como um astrônomo o leria. */
export function vaoEmMagnitudes(razao: number): number {
  return 2.5 * Math.log10(razao);
}

/**
 * A MAGNITUDE APARENTE DO SOL vista de `distPc`, pela lei do CAMPO — a mesma
 * forma do vertex de `planetas.ts` (`aMagBase + 5·log₁₀(d)`), com o ponto-zero
 * do campo. Sem o clamp de 1e-3 pc do `catalogApparentMag`, que cai bem no meio
 * do domínio profundo e por isso `planetas.ts` o recusa por teste.
 */
export function magnitudeDoSol(distPc: number): number {
  return M_V_SOL_DO_CAMPO - 5 + 5 * Math.log10(distPc);
}

/**
 * A SOBRETAXA DO INSTRUMENTO no ponto das estrelas — quanto o `STAR_FRAG`
 * deposita a mais do que o fluxo fotométrico.
 *
 * MEDIDA, não estimada: `luzDaCasa.test.ts` integra numericamente os quatro
 * termos do fragment (`shaders/starShaders.ts:126-152`) sobre o disco do
 * sprite e cobra este número com três casas. A conta analítica de plano
 * infinito daria 1,54 (o halo é `0,06 × 9`); o disco do sprite corta a cauda e
 * sobra 1,534.
 *
 * OS OUTROS DOIS TERMOS NÃO ENTRAM, e a razão é boa: os espinhos de difração e
 * o núcleo esbranquiçado são somados FORA do produto por `vPeak`
 * (`starShaders.ts:147-149`), ou seja, **não escalam com o fluxo**. Com o pico
 * de ~7e9 da troca de 1 px eles valem 3e-11 do depósito. Não são desprezíveis
 * por gosto: são PISO DE INSTRUMENTO, não luz da estrela — e é justamente isso
 * que autoriza o invariante da troca a ser escrito sobre o núcleo sozinho.
 */
export const SOBRETAXA_DO_HALO = 1.534;

// ─── A COMPRESSÃO NA EMISSÃO ──────────────────────────────────────────────

/**
 * O β da compressão fixa na emissão do ponto estelar — o joelho de
 * `β·asinh(x/β)` que `shaders/common.ts` define e `STAR_FRAG` aplica.
 *
 * NASCE ZERO, e zero é IDENTIDADE EXATA (`comprimir3` devolve `x` sem tocar em
 * nada). É o idioma com que a casa instala mecanismo novo sem mover um pixel
 * no dia em que ele entra — o mesmo do `uAmt = 0` do joelho do compósito.
 *
 * O VALOR FINAL É CALIBRAÇÃO, e ela tem duas pontas que puxam para lados
 * opostos:
 *  · β MENOR comprime mais → o quadro limpa, mas as estrelas mais brilhantes
 *    esmaecem, e esmaecer o campo estelar é o que o dono proibiu por escrito;
 *  · β MAIOR poupa as estrelas → mas o Sol pode continuar lavando a tela.
 * Varre-se com `?bemis=` e julga-se com `scripts/visual/luz-do-quadro.mjs`.
 *
 * TETO DURO, derivado e não digitado: o valor escrito tem de caber no
 * half-float do composer (65.504). Com a radiância máxima alcançável isso põe
 * β abaixo de ~4.000, e `luzDaCasa.test.ts` escreve a conta.
 */
export const BETA_EMISSAO = 0;

/**
 * A porta `?bemis=` — pura, recebe a query em vez de ler `window`, para poder
 * ser testada no ambiente `node` da suíte. Ausente ou envenenada devolve o
 * default, que é o neutro exato.
 */
export function lerBetaDaEmissao(busca: string): number {
  const v = parseFloat(new URLSearchParams(busca).get('bemis') ?? '');
  return Number.isFinite(v) && v >= 0 ? v : BETA_EMISSAO;
}

/**
 * O ESPELHO EM CPU de `comprimir3` (`shaders/common.ts`), palavra por palavra.
 * Existe para o teste poder provar que a curva não é teto sem subir GPU — e
 * fica aqui, não no shader, porque é aqui que mora a lei da luz.
 */
export function comprimir(x: number, beta: number): number {
  if (beta <= 0) return x;
  const v = Math.max(x, 0) / beta;
  return beta * Math.log(v + Math.sqrt(v * v + 1.0));
}

/**
 * A PORTA `?bfoto=1` — a MALHA do Sol emitindo a radiância VERDADEIRA da
 * fotosfera, que é a F2 inteira em uma linha. Hoje a malha emite ~1 (a paleta
 * H-alfa autorada de `world/sol/sun.js`) e a lei do ponto deposita
 * `vaoRadiometricoNaTroca(RAIO_SOL_PC)` — ~2,7e10 — para a MESMA superfície.
 * Ligar a porta é multiplicar a emissão por esse fator, e é só isso: o número
 * não se digita em lugar nenhum, sai da função que o cadastro de escala já
 * usa para declarar a dívida.
 *
 * BINÁRIA de propósito, e não um `parseFloat` como a irmã `?bemis=`. Um
 * "quanto" aqui seria um segundo botão de brilho para a malha, e a onda inteira
 * existe para acabar com brilho que se calibra por gosto: ou a fotosfera está
 * na unidade da casa, ou não está. Quem quiser mexer no joelho mexe em `?bemis=`,
 * que é onde o joelho mora.
 *
 * INERTE SOZINHA, e a dependência é dura, não estilística. O composer é
 * half-float e satura em 65.504; a radiância verdadeira está **quase seis ordens
 * de grandeza acima disso** (2,7e10 é 4,2e5× o teto). Sem `?bemis=` > 0 não há
 * curva para dobrar esse valor, e a porta sozinha não mostraria o Sol honesto —
 * escreveria infinito no buffer e devolveria exatamente o quadro branco que a
 * onda existe para consertar. Por isso `world/stellarBody.ts` cobra AS DUAS
 * antes de encostar no material, em vez de confiar em quem digita a URL.
 *
 * PURA, recebe a query em vez de ler `window`, pelo mesmo motivo de
 * `lerBetaDaEmissao`: `vitest.config.ts` roda em `environment: 'node'`.
 *
 * E ELA SOME. Porta de medição é andaime de calibração: no dia em que o β
 * fechar e a fotosfera na unidade virar o padrão, esta função sai daqui junto
 * com a linha dela no selo — e é o `it.fails` da dívida
 * (`luzDaCasa.test.ts`) que fica verde para avisar que o dia chegou. Enquanto
 * ele reprovar, a F2 não é padrão: é bancada.
 */
export function lerPortaFotosfera(busca: string): boolean {
  return new URLSearchParams(busca).get('bfoto') === '1';
}

// ─── O INSTRUMENTO DE REFERÊNCIA, para o cadastro poder declarar ──────────

/**
 * O fov VERTICAL de fábrica da câmera (`core/engine.ts`,
 * `new THREE.PerspectiveCamera(58, …)`). Espelho, cobrado por teste.
 */
export const FOV_DA_CASA = 58;

/**
 * A altura de buffer em que o vão radiométrico é DECLARADO — a mesma janela da
 * régua da luz (`scripts/visual/luz-do-quadro.mjs`, 900×900).
 *
 * O vão depende do buffer, e isso não é defeito de medida: é a própria
 * natureza do número. A lei do ponto normaliza por PIXEL (é o que `expoM0`
 * significa), então "quantas vezes o ponto brilha mais que o disco" só tem
 * resposta depois de dizer quantos pixels a tela tem. Declarar a altura junto
 * do número é o que impede a comparação de virar uma frase sem unidade.
 */
export const ALTURA_DE_REFERENCIA_PX = 900;

/**
 * A distância em que um corpo de raio `raioPc` mede `diametroPx` pixels.
 * Inversa da régua do palco (`world/corpos/corpos.ts`, `diametroAparentePx`),
 * na aproximação de ângulo pequeno.
 *
 * O PREÇO DA APROXIMAÇÃO ESTÁ MEDIDO, não suposto: na troca de 1 px o ângulo é
 * r/d = 6,16e-4 rad, e `atan(x) ≈ x − x³/3` deixa erro relativo de x²/3 =
 * **1,26e-7** na distância (o dobro disso no fluxo, que vai com d⁻²). Folga de
 * sobra para o cadastro declarar o vão sem arrastar three para dentro desta
 * régua — e insuficiente para quem for usá-la com a câmera colada no corpo,
 * que é por isso que a régua do palco usa a `atan` exata e esta não a
 * substitui. `luzDaCasa.test.ts` cobra o número contra a série.
 */
export function distanciaDeTrocaPc(
  raioPc: number,
  diametroPx: number,
  alturaPx: number,
  fovGraus: number = FOV_DA_CASA
): number {
  return (raioPc * alturaPx) / (Math.tan((fovGraus * Math.PI) / 360) * diametroPx);
}

/**
 * O VÃO RADIOMÉTRICO DA FOTOSFERA, avaliado na troca de 1 px — o número que a
 * coluna de brilho do cadastro declara, e a dívida que a F2 paga.
 *
 * Recebe o raio em vez de importá-lo: é assim que esta régua evita o ciclo com
 * `escala.ts`, que é quem a chama.
 */
export function vaoRadiometricoNaTroca(
  raioPc: number,
  alturaPx: number = ALTURA_DE_REFERENCIA_PX,
  fovGraus: number = FOV_DA_CASA
): number {
  const d = distanciaDeTrocaPc(raioPc, 1, alturaPx, fovGraus);
  return razaoDiscoPonto(magnitudeDoSol(d), 1);
}
