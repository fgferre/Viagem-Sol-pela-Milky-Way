// ============================================================
// A MATEMÁTICA PURA do enquadramento privilegiado do Atlas.
//
// A matemática vem da `PrivilegedPosition` do atlas doador (406
// linhas de classe sobre THREE, acopladas a um `ViewportRect`); o
// que atravessa é o que é conferível — `d = r/sen(θ/2)`, o
// `max(distVertical, distHorizontal)` que salva tela ultrawide, e a
// correção pelo retângulo que sobra depois do HUD. Tudo aqui é
// FUNÇÃO PURA e constante medida; o fio que liga à câmera é o
// AtlasRig (./atlasRig), e o retângulo vem de ./retanguloDoAtlas.
// ============================================================
import * as THREE from 'three';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../lib/atlas/frameGalactico';
import { RETRATO_2026 } from '../world/planetas/retrato2026';
import type { RetanguloUtil } from './retanguloDoAtlas';

/**
 * O CENTRO DO FRAME HELIOCÊNTRICO — o Sol não sai daqui, e ninguém muta
 * este vetor (quem precisa de um vetor próprio usa `.clone()`).
 *
 * MORA AQUI porque era QUATRO vetores idênticos: `director.ts`,
 * `director/solNoQuadro.ts`, `director/escada.ts` (que o exportava) e o
 * `SOL` privado do `atlasRig.ts` — e a exportação da escada era o único
 * CICLO de import de valor de todo o `src/` (`escada` → `escolha` →
 * `escada`, nascido quando o gesto se mudou para `escolha.ts` em 22/08).
 * Este módulo é o vizinho neutro dos quatro: geometria pura do Atlas,
 * sem director atrás. O `atlasRig.ts` o reexporta junto com o resto
 * (`export * from './enquadramento'`), então quem sempre o pediu de lá
 * segue servido.
 */
export const ORIGEM = new THREE.Vector3(0, 0, 0);

// ---- as quatro constantes medidas, num lugar só ------------------
// Herdadas do doador como VALORES MEDIDOS a reaproveitar, não como
// código: quem quiser mudar uma delas muda aqui, e o teste da função
// pura cobra o efeito. (PLANO-ATLAS §2.3, linha `PrivilegedPosition`.)

/**
 * Ângulo de fase da câmera medido a partir da DIREÇÃO ILUMINADA — a
 * direção alvo→Sol, que é o lado de onde se vê a face acesa —, em
 * graus. Iluminação de três quartos ("Rembrandt"): de frente para o Sol
 * o alvo lê chapado, e o relevo — quando houver relevo, na Onda 6 —
 * some junto com o terminador.
 *
 * O SINAL importa e custou caro no doador: a câmera vai para o lado do
 * Sol (`PrivilegedPosition.ts:208-212`, `cameraDir = sunToTarget.negate()`),
 * nunca para além do alvo. Com o eixo trocado, os 30° viram fase de
 * 150° — 6,7% do disco iluminado — e todo enquadramento fotografa o
 * lado escuro.
 */
export const PHASE_OFFSET_GRAUS = 30;

/**
 * Desvio MÁXIMO contra a DIREÇÃO ILUMINADA (alvo→Sol), em graus. 70°
 * ainda deixa mais de meio disco iluminado — a fração iluminada é
 * `(1+cos φ)/2`, e em φ = 70° ela é 67% — com o terminador em quadro;
 * passar disso é fotografar o lado escuro do alvo.
 *
 * ELE NÃO GRAMPEIA MAIS O DEDO DO VISITANTE (item 73, 22/08). Até então
 * era um CONE em volta da linha alvo→Sol, e era ele que o arrasto
 * vertical batia: o visitante nunca via o lado escuro de nada, que é
 * metade da queixa "toda navegação atual do modo atlas está uma merda".
 * O que sobrou no caminho do dedo é o GRAMPO POLAR (`MIN_POLAR_RAD`),
 * que não é estético — é a degenerescência de `lookAt`.
 *
 * O QUE ELE AINDA GUARDA, e por isso continua vivo: a MISTURA de
 * `direcaoDaLua`. Lá o desvio é de uma direção CALCULADA — o peso
 * `PARENT_FRAMING_BIAS` puxando a câmera para o lado oposto ao pai —, e
 * sem o grampo a mistura cai no lado noturno quando o eixo pai→lua passa
 * de ~106° do Sol (a cicatriz que o doador pagou: Japeto, Titã e a
 * própria Lua liam como "não carregou").
 *
 * A OBRA PRÓPRIA QUE ESTA NOTA PEDIA FOI FEITA em 26/08, e de graça: até
 * então o arrasto do visitante atravessava a direção privilegiada e o
 * cone aparava o GESTO junto com a mistura, então no degrau "lua" o dedo
 * batia numa parede de 70° que não existia em nenhum outro degrau. O
 * giro livre separou as duas coisas sozinho — a mistura é a pose de
 * REPOUSO, o dedo gira ela DEPOIS (`poseDoVisitante`) — e este número
 * voltou a guardar só o que era dele. Nenhuma pose de repouso se moveu.
 */
export const MAX_SOLAR_DEVIATION_GRAUS = 70;

/**
 * O GRAMPO POLAR, em radianos — o ÚNICO limite que sobrou no caminho do
 * dedo, e o mesmo que todo controle de órbita tem (`OrbitControls` do
 * three, `clamp(phi, 0.18, π−0.18)` do projeto irmão).
 *
 * NÃO É GOSTO, é a degenerescência de `lookAt`: a base da câmera sai de
 * `direita = up × z`, e quando a direção de vista encosta no `up` esse
 * produto vetorial encolhe para zero — a normalização passa a amplificar
 * ruído de float e a imagem GIRA SOZINHA em torno da mira, com o alvo
 * parado. É o mesmo fenômeno que `upDoAtlas` documenta e do qual ele é a
 * segunda linha de defesa (a cedência ao polo da eclíptica só salva
 * quando o polo pedido NÃO é o da eclíptica).
 *
 * 0,1 rad são 5,73°, e o que eles compram é medido: `|up × z| = sen(φ)`,
 * e em 5,73° isso é 0,0998 — quatro ordens de grandeza acima do ruído de
 * float32 (~1e-7), enquanto a 0,01° seria 1,7e-4 e já se veria girar.
 */
export const MIN_POLAR_RAD = 0.1;

/**
 * A SENSIBILIDADE do arrasto, em radianos por pixel — o número que já
 * governava o eixo único (0,0022 rad/px = 0,126°/px, medido na
 * auditoria de 2026-08-12). Vale para os DOIS eixos: dizer que o mesmo
 * dedo anda mais depressa na horizontal do que na vertical seria
 * inventar uma assimetria que ninguém pediu.
 */
export const ARRASTO_RAD_POR_PX = 0.0022;

/**
 * A INÉRCIA DO GIRO — quanto do giro ANTERIOR sobrevive a um quadro de
 * 60 fps. É um filtro exponencial de primeira ordem, e ele é as DUAS
 * coisas de uma vez: a suavização enquanto o dedo anda (o degrau bruto
 * de cada evento chega diluído) e a inércia quando ele solta (o resto
 * decai sozinho em vez de parar seco).
 *
 * 0,8 É A RÉGUA DO NASA EYES, medida do bundle deles em 2026-08-25: todo
 * delta de arrasto passa lá por `novo = 0,2·entrada + 0,8·anterior`, e é
 * daí que vem o tato de que o dono gosta (item 102). O que NÃO se copia
 * é a sensibilidade — a deles é ~4,5× a nossa, e velocidade de giro
 * nunca foi a queixa.
 *
 * COM CORREÇÃO DE DELTA-TIME, e isto é nosso: o filtro deles é POR
 * QUADRO e portanto muda de tato com o fps (a 30 fps o giro deles
 * arrasta o dobro do tempo). Aqui o fator do quadro é
 * `0,8^(dt·60)` — a 60 fps dá exatamente 0,8, e a 30 fps dá 0,64, que é
 * 0,8 aplicado duas vezes. O tato passa a ser o mesmo em qualquer fps, e
 * isso importa porque o app é GPU-bound no M1 e vive perto de 40.
 */
export const SUAVIZACAO_DO_GIRO = 0.8;

/**
 * ONDE O GIRO MORRE, em radianos por quadro de 60 fps — abaixo disto o
 * resto é zerado DE VEZ, sem rastro. Sem este corte o exponencial nunca
 * chega a zero e a câmera fica com um tremor de float que só some no
 * denormal, e cada quadro reescreveria a pose por nada.
 *
 * 1e-4 rad são 0,0057° por quadro: um trigésimo do menor movimento que a
 * tela consegue mostrar (0,0022 rad = 1 px de arrasto). É o mesmo corte
 * do Eyes, na mesma unidade — também ele com a correção de delta-time,
 * porque o limiar é de VELOCIDADE, não de posição.
 */
export const GIRO_MORTO_RAD = 1e-4;

/**
 * O QUE O DEDO DO VISITANTE ACUMULA: uma ROTAÇÃO, e nada além dela.
 *
 * A LEI É DELE, ditada em 26/08 e copiada aqui palavra por palavra —
 * *"o que queremos quanto ao movimento de objeto focado é liberdade
 * total e responsividade... quero que seja navegação livre e sem travas
 * para qualquer dos lados sem nenhum limitador de angulo ou coisa
 * parecida"*. Um par de ângulos não sabe obedecer a essa frase: toda
 * parametrização por dois números tem polos, e em cima do polo um dos
 * dois eixos MORRE (o horizontal encolhe com `sen φ`) enquanto o outro
 * amplifica. Era essa a queixa do item 102, e o conserto não é um
 * grampo melhor — é não ter ângulo nenhum a grampear.
 *
 * ENTÃO O ESTADO É UM QUATERNION, guardado no FRAME DA POSE DE REPOUSO
 * (os eixos da CÂMERA parada: `x` a direita da tela, `y` o alto, `z` a
 * direção alvo→câmera). Ele é o desvio entre a pose que a casa daria
 * sozinha e a pose que o dedo pediu. Consequências, e as três são o que
 * ele pediu:
 *
 *  · NÃO HÁ TRAVA porque não há coordenada a travar. O polo se cruza
 *    como qualquer outro ponto — do outro lado o mundo fica de cabeça
 *    para baixo, e isso é o DESENHO, não defeito;
 *  · NENHUM EIXO MORRE EM FASE NENHUMA: o dedo bate 1:1 com os eixos da
 *    tela em toda geometria, porque os eixos do giro SÃO os da tela;
 *  · o horizonte não gira sozinho no meio do gesto — a câmera inteira é
 *    um corpo rígido, e um corpo rígido não tem roll de surpresa.
 *
 * O PREÇO, declarado: giro livre ACUMULA roll. Dar duas voltas por
 * caminhos diferentes não devolve o mesmo horizonte (é a holonomia da
 * esfera, não um bug), e por isso ele pediu, na mesma conversa, o botão
 * que desfaz — *"podemos colocar um botao de zerar orientacao, assim
 * como o google maps tem um botao de norte"*. Quem mede o desvio é
 * `desvioDaOrientacao`; quem o desfaz é o rig.
 *
 * NO REPOUSO ELE É A IDENTIDADE, e é daí que sai a condição de
 * nascimento do item 102: com o dedo parado NENHUMA rotação roda, e
 * `poseDoVisitante` devolve a direção e o `up` da lei de sempre sem
 * escrever um bit neles. Não é «bit-idêntico porque a conta dá o mesmo»
 * — é bit-idêntico porque a conta NÃO ACONTECE.
 */
export type GiroDoVisitante = THREE.Quaternion;

/** O giro de quem ainda não arrastou nada — o repouso de todo foco. */
export const GIRO_PARADO: Readonly<THREE.Quaternion> = Object.freeze(
  new THREE.Quaternion()
);

/**
 * O giro é a identidade? — a pergunta que compra a condição de
 * nascimento, e ela se faz por IGUALDADE EXATA de propósito: qualquer
 * tolerância aqui deixaria uma rotação minúscula passar por «parada» e
 * a vista de repouso sairia diferente por um fio. Ou o dedo não mexeu
 * em nada, ou a conta roda inteira.
 */
export function giroParado(giro: Readonly<THREE.Quaternion>): boolean {
  return giro.x === 0 && giro.y === 0 && giro.z === 0 && giro.w === 1;
}

/**
 * Peso da mistura "para longe do PAI" contra o enquadramento alinhado ao
 * Sol — é o que ele é no doador (`PrivilegedPosition.ts:22-23, 248-251`):
 * um peso de `lerp` entre DUAS DIREÇÕES unitárias, para que o planeta não
 * domine o quadro de uma lua.
 *
 * O CONSUMIDOR PROMETIDO CHEGOU na F2b da Onda 6: `direcaoDaLua`, o
 * degrau "lua" da escada — peso de `lerp` entre DUAS DIREÇÕES unitárias
 * (a solar privilegiada e a "para longe do pai"), renormalizado, para
 * que o planeta não domine o quadro da lua E continue nele (a câmera
 * fica do lado oposto ao pai, olhando a lua com o pai ao fundo). O que
 * ele NÃO é (e chegou a ser por engano) é fator de DISTÂNCIA:
 * multiplicar a distância de enquadramento por 0,78 come a margem de
 * 1,2 (1,2 × 0,78 = 0,936 < 1) e faz transbordar exatamente a esfera
 * que a conta promete tangenciar.
 */
export const PARENT_FRAMING_BIAS = 0.78;

/** Folga entre a esfera enquadrada e a borda do retângulo útil. */
export const MARGEM_DE_ENQUADRAMENTO = 1.2;

/**
 * A LENTE DO ATLAS, pinada. Sem este pino o θ da conta acima herdaria
 * o fov do shot em que o visitante pausou o filme (o roteiro varre de
 * 15° a 60°), e o mesmo alvo seria enquadrado a distâncias diferentes
 * conforme o momento da pausa — nenhuma vista do Atlas seria
 * reproduzível. 35° é a lente neutra de documentário: não comprime a
 * profundidade como as longas do roteiro nem distorce como as curtas.
 */
export const ATLAS_FOV_GRAUS = 35;

export interface PedidoDeEnquadramento {
  /**
   * Raio da esfera a enquadrar, na unidade da CENA. Para um corpo do
   * sistema solar é o raio ORBITAL do alvo (o `rUA` do retrato/da
   * efeméride, convertido): enquadra-se a ÓRBITA, não o corpo — corpos
   * são pontos até a Onda 6, e uma tabela nova de raios físicos seria
   * segunda fonte de verdade que a Onda 7 refaria.
   */
  rAlvo: number;
  /** Abertura VERTICAL da lente, em graus. */
  fovDeg: number;
  /** Largura/altura do quadro. */
  aspect: number;
  retanguloUtil: RetanguloUtil;
}

export interface Enquadramento {
  /** Distância da câmera ao alvo, na unidade de `rAlvo`. */
  distancia: number;
  /**
   * Giros a aplicar DEPOIS do `lookAt(alvo)` para o alvo cair no
   * centro do retângulo útil em vez do centro do quadro — os mesmos
   * `camera.rotateY` / `camera.rotateX` que a JourneyRig usa no
   * pausar-e-olhar, em radianos. Zero quando o HUD é simétrico.
   */
  giroY: number;
  giroX: number;
}

export const GRAU = Math.PI / 180;

/**
 * ENQUADRAMENTO PRIVILEGIADO — pura, e é ela que carrega a conta.
 *
 * `d = r / sen(θ/2)` é a distância em que uma esfera de raio `r`
 * tangencia as bordas de um cone de abertura θ. Faz-se a conta nos
 * DOIS eixos e fica a MAIOR: numa tela ultrawide o vertical é o
 * apertado, num retrato é o horizontal — usar só um dos dois corta o
 * assunto em metade dos aparelhos.
 *
 * O retângulo útil encolhe cada semi-ângulo no espaço da TANGENTE (é
 * lá que a projeção é linear; encolher o ângulo direto erra por vários
 * por cento já a 30°), e o descentramento dele vira os dois giros.
 */
export function enquadrar(pedido: PedidoDeEnquadramento): Enquadramento {
  const { rAlvo, fovDeg, aspect, retanguloUtil } = pedido;
  // lente e quadro: valores impossíveis viram os neutros mais próximos
  // em vez de NaN — este resultado vai direto para a matriz da câmera
  const fov = Number.isFinite(fovDeg) ? THREE.MathUtils.clamp(fovDeg, 1, 179) : 1;
  const asp = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const fracao = (v: number) =>
    Number.isFinite(v) ? THREE.MathUtils.clamp(v, 0, 0.49) : 0;
  const esq = fracao(retanguloUtil.esquerda);
  const dir = fracao(retanguloUtil.direita);
  const topo = fracao(retanguloUtil.topo);
  const base = fracao(retanguloUtil.base);

  const tanV = Math.tan((fov * GRAU) / 2);
  const tanH = tanV * asp;
  // semi-ângulos do que SOBRA depois do HUD
  const meiaV = Math.atan(tanV * (1 - topo - base));
  const meiaH = Math.atan(tanH * (1 - esq - dir));

  // DESCENTRAMENTO do retângulo útil, em NDC (o quadro inteiro é −1..1).
  // `rotateY(+)` vira a câmera para a esquerda e leva o alvo para a
  // direita da tela; `rotateX(+)` levanta a câmera e leva o alvo para
  // baixo. O `cos(giroX)` no giro horizontal não é refinamento: as duas
  // rotações são compostas, e sem ele o alvo erra o centro do retângulo
  // por décimos de por cento quando os dois desvios são grandes.
  const giroX = Math.atan(tanV * (topo - base));
  const giroY = Math.atan(tanH * (esq - dir) * Math.cos(giroX));

  // alvo sem raio (o próprio Sol, um alvo ainda não resolvido) não
  // tem escala para enquadrar: distância 0 e quem chamou decide
  const raio = Number.isFinite(rAlvo) && rAlvo > 0 ? rAlvo * MARGEM_DE_ENQUADRAMENTO : 0;
  const distancia = Math.max(raio / Math.sin(meiaV), raio / Math.sin(meiaH));

  return { distancia, giroY, giroX };
}

/**
 * A DIREÇÃO em que a câmera se põe, vista do alvo: a DIREÇÃO ILUMINADA
 * — o eixo Sol→alvo NEGADO, ou seja alvo→Sol — girada de
 * `PHASE_OFFSET_GRAUS` na direção do polo. Pura.
 *
 * A NEGAÇÃO é a coisa toda, e é do doador: a câmera se põe ENTRE o Sol e
 * o alvo, para ver a face acesa (`PrivilegedPosition.ts:210-212`, "Camera
 * should be on the OPPOSITE side to see illuminated face"). Sem ela os
 * 30° e os 70° passam a ser medidos do lado ESCURO, e o grampo que
 * deveria garantir 67% de disco iluminado garante no máximo 33%.
 *
 * O DEDO DO VISITANTE NÃO ENTRA AQUI desde 26/08 (item 102): esta é a
 * pose de REPOUSO, e quem soma o arrasto por cima dela é
 * `poseDoVisitante`, com um quaternion e sem ângulo nenhum. Onde este
 * bloco descrevia dois acumuladores (`altura` na inclinação, `volta` em
 * torno da linha do Sol), hoje há só o pino de fase.
 *
 * O GRAMPO POLAR vem por último, sobre a direção FINAL: é a direção que
 * chega ao `lookAt` que precisa ficar fora da calota, e a `volta` mexe
 * no ângulo ao polo (ela só preserva o ângulo ao SOL). Dentro da faixa
 * ele não toca em nada — é isso que mantém toda vista pinada bit a bit.
 */
const _poloUnitario = new THREE.Vector3();
const _perpendicular = new THREE.Vector3();

/**
 * O grampo de `MIN_POLAR_RAD`: afasta `dir` do eixo `polo` até os dois
 * fazerem pelo menos esse ângulo, preservando o azimute. Pura, e usada
 * DOS DOIS LADOS do mesmo colapso — em `direcaoDeRepouso` para a
 * mira não entrar na calota do polo, e em `upDoAtlas` para o `up` não
 * encostar na mira. É o mesmo `|a × b| = sen(ângulo)` nos dois casos.
 *
 * IDEMPOTENTE DENTRO DA FAIXA: fora da calota devolve `dir` sem escrever
 * um bit nele — a reconstrução esférica só acontece onde ela é
 * obrigatória, e é por isso que ela não pode mover nenhuma pose que já
 * era legal.
 */
function grampearNoPolo(dir: THREE.Vector3, polo: THREE.Vector3): THREE.Vector3 {
  _poloUnitario.copy(polo);
  if (_poloUnitario.lengthSq() < 1e-30) return dir;
  _poloUnitario.normalize();
  const cosseno = dir.dot(_poloUnitario);
  if (!Number.isFinite(cosseno)) return dir;
  const teto = Math.cos(MIN_POLAR_RAD);
  if (Math.abs(cosseno) <= teto) return dir;
  const alvo = cosseno > 0 ? MIN_POLAR_RAD : Math.PI - MIN_POLAR_RAD;
  // o AZIMUTE se preserva: o que muda é só a latitude
  _perpendicular.copy(dir).addScaledVector(_poloUnitario, -cosseno);
  if (_perpendicular.lengthSq() < 1e-24) {
    // direção EM CIMA do polo: não há azimute a preservar, e qualquer
    // perpendicular serve — a escolha é determinística
    _perpendicular.set(1, 0, 0).addScaledVector(_poloUnitario, -_poloUnitario.x);
    if (_perpendicular.lengthSq() < 1e-24) {
      _perpendicular.set(0, 1, 0).addScaledVector(_poloUnitario, -_poloUnitario.y);
    }
  }
  _perpendicular.normalize();
  return dir
    .copy(_poloUnitario)
    .multiplyScalar(Math.cos(alvo))
    .addScaledVector(_perpendicular, Math.sin(alvo));
}

/**
 * A DIREÇÃO DE REPOUSO — onde a câmera se põe quando o dedo ainda não
 * pediu nada: a linha alvo→Sol inclinada do pino de `PHASE_OFFSET_GRAUS`
 * rumo ao polo, e o grampo polar por cima.
 *
 * É O MESMO TEXTO que a antiga direção privilegiada rodava com a órbita
 * parada, letra por letra — o que saiu foram os dois ramos que somavam o
 * dedo (`altura` na inclinação, `volta` em torno da linha do Sol). Eles
 * não mudaram de lugar: MORRERAM em 26/08 com a função que os hospedava,
 * e o dedo passou a somar num quaternion (`GiroDoVisitante`). É por ser o
 * mesmo texto que toda vista parada continua bit a bit onde estava.
 *
 * Ela é a ÂNCORA de tudo o que vem depois: `poseDoVisitante` gira ESTA
 * direção, e o giro guardado é medido contra ELA. Por isso ela não pode
 * depender do dedo — se dependesse, o desvio seria medido contra si
 * mesmo e a pose de repouso andaria com o relógio.
 */
export function direcaoDeRepouso(
  doSolAoAlvo: THREE.Vector3,
  polo: THREE.Vector3,
  out: THREE.Vector3
): THREE.Vector3 {
  const eixoSolar = out.copy(doSolAoAlvo).negate();
  if (eixoSolar.lengthSq() < 1e-30) eixoSolar.set(0, 0, 1);
  eixoSolar.normalize();
  // a inclinação: o pino de fase, rumo ao polo. Sem o dedo somando, o
  // grampo em [0, π] que existia aqui não tem o que aparar — o pino é
  // constante e mora dentro da faixa.
  const angulo = PHASE_OFFSET_GRAUS * GRAU;
  const eixo = new THREE.Vector3().crossVectors(eixoSolar, polo);
  // alvo alinhado com o polo: qualquer perpendicular serve
  if (eixo.lengthSq() < 1e-12) {
    eixo.set(1, 0, 0).cross(eixoSolar);
    if (eixo.lengthSq() < 1e-12) eixo.set(0, 1, 0).cross(eixoSolar);
  }
  eixoSolar.applyAxisAngle(eixo.normalize(), angulo);
  return grampearNoPolo(eixoSolar, polo);
}

// ============================================================
// O GIRO LIVRE (item 102) — a pose que o dedo compõe EM CIMA da de
// repouso. Caminho ÚNICO desde 26/08: não há porta, não há eixo a
// escolher e não há ângulo a grampear. A lei é a frase dele —
// "liberdade total... sem nenhum limitador de angulo ou coisa
// parecida" —, e ela está escrita em `GiroDoVisitante`.
// ============================================================

const _direitaDaTela = new THREE.Vector3();
const _cimaDaTela = new THREE.Vector3();
const _upDoRepouso = new THREE.Vector3();
const _upNatural = new THREE.Vector3();
const _perpNatural = new THREE.Vector3();
const _perpAtual = new THREE.Vector3();
const _cruzado = new THREE.Vector3();
const _baseMatriz = new THREE.Matrix4();
const _baseDoRepouso = new THREE.Quaternion();
const _baseDeAgora = new THREE.Quaternion();
const _giroNoMundo = new THREE.Quaternion();

/**
 * A BASE DA CÂMERA, escrita em `out` como quaternion: a MESMA que o
 * `lookAt` monta — `z` é a direção alvo→câmera, `x = normalize(up × z)`
 * é a DIREITA da tela e `y = z × x` é o ALTO dela. `false` quando não há
 * base a montar (mira e `up` colineares).
 *
 * POR QUE TEM DE SER EXATAMENTE A DO `lookAt`, e não uma base qualquer:
 * é nela que o giro do visitante é guardado, e "horizontal" precisa
 * querer dizer «o eixo horizontal DA TELA». Numa base torta o dedo
 * empurraria na diagonal, que é metade da queixa que o item 102 veio
 * matar.
 *
 * ELA NÃO DEGENERA NO CAMINHO DE REPOUSO, e quem paga por isso é
 * `MIN_POLAR_RAD`: o `up` que sai de `upDoAtlas` já vem aparado para
 * ficar a pelo menos esse ângulo da mira, então `|up × z|` tem piso
 * `sen(0,1)` = 0,0998 e a normalização nunca amplifica ruído. O grampo
 * polar deixou de ser só a guarda do `lookAt` — passou a ser também a
 * guarda do REFERENCIAL do giro, e é por isso que ele sobreviveu à
 * limpeza que matou todos os outros limites.
 */
function baseDaCamera(
  dir: THREE.Vector3,
  up: THREE.Vector3,
  out: THREE.Quaternion
): boolean {
  _direitaDaTela.crossVectors(up, dir);
  if (_direitaDaTela.lengthSq() < 1e-24) return false;
  _direitaDaTela.normalize();
  _cimaDaTela.crossVectors(dir, _direitaDaTela);
  _baseMatriz.makeBasis(_direitaDaTela, _cimaDaTela, dir);
  out.setFromRotationMatrix(_baseMatriz);
  return true;
}

/**
 * A POSE QUE O VISITANTE ESTÁ VENDO — a direção de repouso e o `up` de
 * repouso, os dois girados pelo MESMO quaternion. Pura.
 *
 * OS DOIS JUNTOS, E ISSO É O DESENHO: a câmera do Atlas virou um CORPO
 * RÍGIDO. Girar só a direção e recalcular o `up` pela lei da casa era o
 * que a parametrização velha fazia, e era exatamente de lá que vinha o
 * roll de surpresa — a cedência do `upDoAtlas` reescrevia o alto da tela
 * no meio do gesto (medido no item 102: 14,58° num ÚNICO quadro, quase
 * 10× o que a mira andou). Rodando os dois com a mesma rotação, o alto
 * da tela só muda quando o dedo manda.
 *
 * A CONDIÇÃO DE NASCIMENTO COBRE OS DOIS CAMINHOS — a direção E o `up` —,
 * e é protegida DUAS VEZES, o que é diferente de ser protegida uma vez e
 * bem:
 *
 *  1. a GUARDA da identidade curto-circuita a conta inteira: com o dedo
 *     parado, `outDir` recebe a direção de repouso e `outUp` recebe o que
 *     `upDoAtlas` sempre devolveu, sem uma multiplicação no meio;
 *  2. e a conta, quando roda, é bit-exata mesmo assim. MEDIDO por
 *     sabotagem em 26/08: removendo a guarda, as 4.140 geometrias da
 *     bancada continuam bit a bit idênticas, porque `B·1·B⁻¹` cai em
 *     `(0,0,0,|B|²)` — os termos imaginários se cancelam EXATAMENTE, aos
 *     pares dos mesmos produtos — e `|B|²` sai 1,0 exato de um
 *     `setFromRotationMatrix`.
 *
 * A GUARDA FICA, e não por superstição: ela é o caminho barato do caso
 * comum (a pose parada é a de toda vista pinada), e ela torna a promessa
 * independente de a base continuar saindo exatamente normalizada — o dia
 * em que alguém trocar a construção da base, o item (2) pode deixar de
 * valer calado, e o (1) não deixa.
 *
 * O QUE ISSO COMPRA: vale em TODA geometria — dentro da faixa da
 * cedência, fora dela, com o corpo deitado ou em pé, no solstício ou no
 * equinócio. Nenhuma vista parada pode andar, e nenhum corpo é caso
 * especial. (Foi essa a lição que o P4 pagou: lá a alegação valia para a
 * direção e NÃO para o `up`, e o único dente usava uma geometria fora da
 * faixa da cedência.)
 *
 * O GIRO MORA NO FRAME DA CÂMERA PARADA, não no do mundo, e a razão é o
 * relógio: o corpo ORBITA, a linha do Sol gira em volta dele, e a base
 * de repouso gira junto. Um giro guardado no mundo ficaria para trás —
 * quem tivesse virado o planeta veria a pose escorregar sozinha a cada
 * tique da máquina do tempo. Guardado no frame de repouso, o desvio
 * ACOMPANHA o corpo, que é o que "continuar girando de onde estava"
 * quer dizer. No mundo ele vira a CONJUGAÇÃO `B·Q·B⁻¹`.
 */
export function poseDoVisitante(
  dirRepouso: THREE.Vector3,
  polo: THREE.Vector3,
  giro: THREE.Quaternion,
  outDir: THREE.Vector3,
  outUp: THREE.Vector3
): void {
  // o `up` da lei de sempre, sobre a direção de repouso — o caminho
  // intocado, e a metade da condição de nascimento que fala do `up`
  upDoAtlas(dirRepouso, polo, outUp);
  const parado = giroParado(giro) || !baseDaCamera(dirRepouso, outUp, _baseDoRepouso);
  if (outDir !== dirRepouso) outDir.copy(dirRepouso);
  if (parado) return;
  _giroNoMundo.copy(_baseDoRepouso).multiply(giro);
  _giroNoMundo.multiply(_baseDoRepouso.invert());
  outDir.applyQuaternion(_giroNoMundo);
  outUp.applyQuaternion(_giroNoMundo);
}

/**
 * O CAMINHO DE VOLTA: dada a pose que está na tela (`dir` e `up`) e o
 * referencial de repouso de um alvo, qual giro a produz. Conta fechada,
 * sem busca — é a inversa exata de `poseDoVisitante`.
 *
 * PARA QUE ELA EXISTE (item 73, 22/08): o clique simples SELECIONA sem
 * mover a câmera. Trocar o alvo mantendo a câmera parada é exatamente
 * isto — a mesma pose no mundo, escrita noutro referencial. O portal do
 * filme (`AtlasRig.pousar`) usa a mesma porta.
 *
 * ELA GUARDA O ROLL, e a antiga não guardava: `(altura, volta)` eram
 * dois números e a pose da câmera tem TRÊS graus de liberdade, então o
 * terceiro — o alto da tela — era recalculado pela lei da casa a cada
 * seleção. Quem tivesse inclinado o horizonte e clicasse noutro corpo
 * via a imagem endireitar sozinha, com a promessa "não mexe na câmera"
 * escrita ao lado. Com o quaternion a promessa passa a ser verdade
 * inteira.
 *
 * `Q = B_repouso⁻¹ · B_agora`, e as duas bases são a do `lookAt`.
 */
export function giroQueProduz(
  dir: THREE.Vector3,
  up: THREE.Vector3,
  dirRepouso: THREE.Vector3,
  polo: THREE.Vector3,
  out: THREE.Quaternion
): THREE.Quaternion {
  out.identity();
  if (dir.lengthSq() < 1e-30) return out;
  if (!baseDaCamera(dir, up, _baseDeAgora)) return out;
  upDoAtlas(dirRepouso, polo, _upDoRepouso);
  if (!baseDaCamera(dirRepouso, _upDoRepouso, _baseDoRepouso)) return out;
  return out.copy(_baseDoRepouso).invert().multiply(_baseDeAgora);
}

/**
 * O DESVIO DA ORIENTAÇÃO, em radianos com SINAL — quanto o alto da tela
 * está torto em relação ao alto que a casa daria NESTA MESMA pose. É a
 * grandeza que acende a bússola do HUD e a que o endireitar desfaz.
 *
 * A REFERÊNCIA É `upDoAtlas`, e a escolha é declarada: ela é a resposta
 * que o próprio app dá à pergunta "o que fica no alto aqui?" — o polo
 * do corpo nos degraus corpo/lua, o da eclíptica nos degraus sistema/
 * órbita, com a cedência entre os dois onde a mira encosta no eixo.
 * Pinar o polo da eclíptica em vez dela daria um "norte" que discorda
 * do horizonte que a casa desenha em metade dos degraus; pinar o polo
 * do corpo daria um norte que colapsa perto do eixo. A referência
 * natural é a que já existe.
 *
 * SÓ O ROLL, e é ele que o botão zera: o desvio é medido NO PLANO DA
 * TELA (a componente de cada `up` perpendicular à mira), então virar o
 * planeta de cabeça para baixo e endireitar devolve o horizonte SEM
 * devolver a câmera para onde ela estava. É a lei do botão de norte do
 * Google Maps, que é a régua que ele deu: ele acerta a bússola, não
 * teletransporta o mapa.
 *
 * O SINAL é o de quem gira DE natural PARA atual, em torno da mira —
 * então endireitar é aplicar o NEGATIVO dele.
 */
export function desvioDaOrientacao(
  dir: THREE.Vector3,
  up: THREE.Vector3,
  polo: THREE.Vector3
): number {
  upDoAtlas(dir, polo, _upNatural);
  _perpNatural.copy(_upNatural).addScaledVector(dir, -_upNatural.dot(dir));
  _perpAtual.copy(up).addScaledVector(dir, -up.dot(dir));
  if (_perpNatural.lengthSq() < 1e-24 || _perpAtual.lengthSq() < 1e-24) return 0;
  _perpNatural.normalize();
  _perpAtual.normalize();
  _cruzado.crossVectors(_perpNatural, _perpAtual);
  const angulo = Math.atan2(_cruzado.dot(dir), _perpNatural.dot(_perpAtual));
  return Number.isFinite(angulo) ? angulo : 0;
}

/**
 * A DIREÇÃO DO DEGRAU "LUA" (F2b/D7) — o consumidor de
 * `PARENT_FRAMING_BIAS`. Pura, e a semântica é a do doador
 * (`PrivilegedPosition.calculateContextAwareDirection`), re-expressa:
 *
 * ELA É POSE DE REPOUSO, e desde 26/08 SÓ isso: o dedo do visitante não
 * entra mais aqui — ele gira o resultado depois, em `poseDoVisitante`.
 * A troca APAGA uma cicatriz declarada: enquanto o arrasto atravessava
 * esta função, o cone de `MAX_SOLAR_DEVIATION_GRAUS` aparava o GESTO
 * junto com a mistura, e no degrau "lua" o visitante batia numa parede
 * de 70° que não existia em nenhum outro degrau. O cone continua
 * guardando o que sempre guardou — a mistura CALCULADA —, e o dedo
 * passou a ser livre em todo degrau, que é a lei dele.
 *
 *  1. parte da direção de repouso (os 30° de Rembrandt —
 *     `direcaoDeRepouso`);
 *  2. mistura com "para longe do PAI" (`(alvo − pai)` normalizado) com
 *     peso `PARENT_FRAMING_BIAS` no termo do pai e renormaliza — a
 *     câmera vai para o lado oposto ao pai, então olhar a lua é olhar
 *     TAMBÉM o pai, ao fundo do mesmo quadro;
 *  3. …mas NUNCA além do terminador (a cicatriz que o doador pagou para
 *     aprender: com 0,78 o termo do pai vence, e quando o eixo pai→lua
 *     passa de ~106° do Sol a mistura cai no lado NOTURNO — Japeto,
 *     Titã e a própria Lua liam como "não carregou"): se a mistura
 *     desvia mais que `MAX_SOLAR_DEVIATION_GRAUS` da direção iluminada,
 *     gira-se a direção iluminada RUMO à mistura por exatamente o
 *     máximo — o azimute "longe do pai" sobrevive onde é compatível com
 *     luz, e onde não é fica a direção mais próxima que ainda é.
 */
const _solSnapshot = new THREE.Vector3();
const _iluminada = new THREE.Vector3();
const _longeDoPai = new THREE.Vector3();
const _eixoDeGiro = new THREE.Vector3();

export function direcaoDaLua(
  doSolAoAlvo: THREE.Vector3,
  doPaiAoAlvo: THREE.Vector3,
  polo: THREE.Vector3,
  out: THREE.Vector3
): THREE.Vector3 {
  // snapshots ANTES de escrever em `out`: os chamadores da classe podem
  // passar o mesmo rascunho nos dois papéis (o padrão de `apply`)
  _solSnapshot.copy(doSolAoAlvo);
  _iluminada.copy(doSolAoAlvo).negate();
  const temSol = _iluminada.lengthSq() >= 1e-30;
  if (temSol) _iluminada.normalize();

  const solar = direcaoDeRepouso(doSolAoAlvo, polo, out);
  if (doPaiAoAlvo.lengthSq() < 1e-30) return solar;
  _longeDoPai.copy(doPaiAoAlvo).normalize();
  const mistura = solar.lerp(_longeDoPai, PARENT_FRAMING_BIAS);
  if (mistura.lengthSq() < 1e-12) return out.copy(_longeDoPai);
  mistura.normalize();

  if (!temSol) return mistura;
  const maximo = MAX_SOLAR_DEVIATION_GRAUS * GRAU;
  if (mistura.angleTo(_iluminada) <= maximo) return mistura;

  _eixoDeGiro.crossVectors(_iluminada, mistura);
  if (_eixoDeGiro.lengthSq() < 1e-12) {
    // anti-paralelo exato: não há plano em que girar — não sobra
    // componente "longe do pai" que valha preservar; volta à direção
    // solar privilegiada pura, recomposta do snapshot (o rascunho está
    // sujo da mistura).
    return direcaoDeRepouso(_solSnapshot, polo, out);
  }
  return out
    .copy(_iluminada)
    .applyAxisAngle(_eixoDeGiro.normalize(), maximo)
    .normalize();
}

/** Polo da eclíptica no frame da cena (equatorial J2000). */
export const POLO_ECLIPTICO = (() => {
  const v = eclipticaParaEquatorial([0, 0, 1]);
  return new THREE.Vector3(v[0], v[1], v[2]).normalize();
})();

/** O Sol mora na origem da cena — o centro de tudo que o Atlas enquadra. */

/**
 * A FAIXA EM QUE O POLO DO CORPO CEDE — a guarda da mira, e ela é
 * OBRIGATÓRIA, não caprichosa.
 *
 * O `lookAt` constrói a base da câmera com `direita = up × z`. Quando o
 * `up` chega perto da direção de vista esse produto vetorial encolhe
 * para zero, e a normalização dele passa a amplificar ruído de float: a
 * imagem GIRA SOZINHA em torno da mira, com o alvo parado. Trocar um
 * globo torto por um globo que roda sozinho não é conserto.
 *
 * E a degenerescência é ALCANÇÁVEL, medida: com o polo do CORPO no alto
 * e o arrasto de dois eixos solto, a direção da câmera chega ao polo da
 * Terra — no cone de 70° de então ela já chegava a 0,44° dele, e desde
 * que a inclinação varre a esfera inteira (item 73) ela chega ao polo de
 * QUALQUER corpo, em qualquer data.
 *
 * A saída é o precedente que já existe na casa (`cameraRig.ts`,
 * `galacticUp`): misturar suavemente com um segundo `up`. Aqui o
 * segundo é o POLO DA ECLÍPTICA — que é o `up` que o Atlas usou a vida
 * inteira, e que para a Terra fica a 23,4° do polo do corpo: quando a
 * mira encosta no eixo da Terra, a eclíptica está a 23,4° dela, longe
 * da degenerescência. A troca não vaza para o caso comum: acima de 30°
 * de separação a mistura é ZERO e o `up` é o polo do corpo puro, bit a
 * bit (o repouso do degrau "corpo" fica a 36,6° do polo no solstício e
 * a 83° no equinócio — nunca dentro da faixa).
 *
 * ELA NÃO BASTA SOZINHA, e é por isso que `MIN_POLAR_RAD` existe: a
 * cedência só tem para onde ir quando o polo pedido NÃO é o da
 * eclíptica. No degrau "sistema" e no "órbita" o polo pedido É o da
 * eclíptica, e a mistura devolve ele mesmo; no degrau "lua" o polo da
 * Lua está a 1,5° do da eclíptica, e a mistura quase não move. Quem
 * garante o piso nesses casos é o grampo polar, que impede a mira de
 * entrar na calota — as duas guardas são complementares, não
 * redundantes.
 */
export const CEDER_COMECA_GRAUS = 30;
export const CEDER_TERMINA_GRAUS = 15;

const _upBruto = new THREE.Vector3();

/**
 * O `up` que a câmera do Atlas escreve: o polo pedido, cedendo ao polo
 * da eclíptica quando ele encosta na direção de vista. Pura.
 *
 * `dir` é a direção alvo→câmera (unitária); o sinal não importa, o que
 * decide é |dir·polo|.
 *
 * A CEDÊNCIA SOZINHA PODE PERSEGUIR A MIRA, e a varredura de
 * `atlasRig.test.ts` mediu isso quando o arrasto ficou livre (item 73):
 * o `up` cedido caminha pelo arco polo→eclíptica, e se a mira estiver
 * NESSE arco os dois se cruzam. Medido: com a mira a 20° do eixo da
 * Terra e no azimute da eclíptica, `cede` vale 0,83 e põe o `up` a 19,4°
 * do eixo — 0,6° da mira, que é o colapso que a cedência existe para
 * impedir. No cone de 70° o ponto era inalcançável (o piso medido era
 * 17,6°) e o defeito ficou latente.
 *
 * O FECHO é o MESMO grampo da direção, com os papéis trocados: o
 * `up` final é aparado para ficar a pelo menos `MIN_POLAR_RAD` da mira.
 * Dentro da faixa ele volta intocado, bit a bit — nenhuma vista de
 * repouso se move, e a cedência continua sendo quem decide o roll onde
 * há roll a decidir.
 *
 * ELA É O `up` DA POSE DE REPOUSO, e só dela, desde 26/08 (item 102).
 * Quem escreve o alto da tela DEPOIS do dedo é `poseDoVisitante`, que
 * gira este vetor pela mesma rotação que gira a mira — a câmera virou um
 * corpo rígido. A consequência é que o roll de surpresa que esta função
 * dava no meio do gesto MORREU na origem: a cedência é medida na pose de
 * REPOUSO, que não anda com o dedo, então ela não tem mais como reescrever
 * o horizonte enquanto o visitante arrasta. (Medido antes da troca: a
 * 26,2° do polo a tela girava 14,58° num ÚNICO quadro, quase 10× o que a
 * mira andava.)
 *
 * E É ELA A REFERÊNCIA DA BÚSSOLA: `desvioDaOrientacao` pergunta a esta
 * função o que ficaria no alto na pose de agora, e a diferença para o
 * alto de verdade é o que acende o botão de endireitar.
 */
export function upDoAtlas(
  dir: THREE.Vector3,
  polo: THREE.Vector3,
  out: THREE.Vector3
): THREE.Vector3 {
  const alinhamento = Math.abs(dir.dot(polo));
  const cede = THREE.MathUtils.smoothstep(
    Number.isFinite(alinhamento) ? alinhamento : 1,
    Math.cos(CEDER_COMECA_GRAUS * GRAU),
    Math.cos(CEDER_TERMINA_GRAUS * GRAU)
  );
  _upBruto.copy(polo).lerp(POLO_ECLIPTICO, cede);
  // polo do corpo anti-paralelo ao da eclíptica no meio da mistura: o
  // lerp passa pelo vetor nulo e não há direção a normalizar
  if (_upBruto.lengthSq() < 1e-12) _upBruto.copy(POLO_ECLIPTICO);
  return grampearNoPolo(out.copy(_upBruto).normalize(), dir);
}

/**
 * A RAMPA ENTRE DEGRAUS da escada (F2b/D7), em segundos. Curta como o
 * véu (0,45 s por metade): descer de órbita para corpo não é travessia
 * física — a rampa existe para o olho seguir a troca de enquadramento,
 * não para fingir voo. Sob `prefers-reduced-motion` e `?shot=` quem
 * chama pede o salto seco (`rampa: false`) e ela nunca anima.
 */


/**
 * O RAIO DE ENQUADRAMENTO DE UMA ESTRELA — a esfera de vizinhança que o
 * Atlas põe em quadro em volta dela. Função do ALVO e só dele: a
 * distância da estrela ao SOL, que é o mesmo referencial de onde
 * `direcaoDeRepouso` tira o eixo.
 *
 * POR QUE NÃO A DISTÂNCIA À CÂMERA, que era o que estava aqui: o Atlas
 * ENQUADRA (a câmera é posta, não voa), e `apply` move a câmera na mesma
 * chamada. Com o raio saindo da câmera, clicar duas vezes no mesmo nome
 * dava duas vistas — a 100 pc o primeiro clique enquadrava 8 pc, o
 * segundo 4, o terceiro 2, até o piso —, e o link `?foco=` reproduzia a
 * vista do primeiro clique, nunca a que estava na tela. É a mesma
 * não-reprodutibilidade que o pino de `ATLAS_FOV_GRAUS` existe para
 * impedir, entrando por outra porta (D5: a função pura recebe o `rAlvo`
 * como propriedade do alvo).
 *
 * A LEI é a que já existia — 8% da distância, entre 0,8 e 9 pc —, só que
 * medida do Sol: o alcance segue o mesmo (uma vizinha a 1,4 pc abre com
 * 0,8 pc de esfera, Betelgeuse a 152 pc com os 9 do teto), e no VOO
 * LIVRE nada muda: lá o número significa outra coisa (a distância de
 * chegada de um voo), e depender de onde se parte é o certo.
 */
export function raioDeEnquadramentoEstelar(distanciaAoSolPc: number): number {
  return THREE.MathUtils.clamp(distanciaAoSolPc * 0.08, 0.8, 9);
}

/**
 * Posição de cena e raio de enquadramento do corpo mais externo do
 * retrato. Fora da classe porque é conta de DADO, não de câmera — e
 * porque o teste a confere sem construir rig nenhum. Quem é "o mais
 * externo" sai do próprio retrato, medido: pinar `pluto` aqui seria
 * uma segunda fonte de verdade que a máquina do tempo da F4 (com as
 * órbitas vivas) desmentiria no primeiro salto de data.
 *
 * O QUE É DERIVADO E O QUE É CONGELADO, declarado para não haver
 * confusão: a ESCOLHA de quem é o mais externo é derivada do dado; a
 * POSIÇÃO e o RAIO vêm da tabela congelada de 1º de janeiro de 2026
 * (`RETRATO_2026`), e nada neste caminho consulta a efeméride viva nem
 * o `jd` do Director. Consequência: depois de um salto de data a esfera
 * do SISTEMA INTEIRO continua a do retrato — o Sol segue no centro dela
 * (a esfera é centrada na origem, e é essa a promessa que importa), mas
 * o corpo que dá nome ao enquadramento não está mais onde estava. (Esta
 * esfera FOI a de abertura até 23/08; desde o item 61 ela é o teto do
 * zoom, e quem abre é a irmã abaixo.)
 *
 * A PENDÊNCIA DA ONDA 5 ("abertura ancorada na época") FECHOU na F2b da
 * Onda 6, com OVERRIDE DECLARADO do destino registrado: o conserto era
 * exatamente o previsto — o Director compõe a posição viva
 * (`Director.focarNoSistema`) — mas ele NÃO esperou as órbitas
 * desenhadas, porque a posição viva só depende de efeméride + tempo
 * vivo, que já existem (emendas D-E5/T-E12; "justificativa errada conta
 * como falha", Onda 9). Esta função ficou sendo o caminho SEM efeméride:
 * o retrato congelado, com o badge do tempo contando a verdade.
 */
export function orbitaMaisExterna(): { posicao: THREE.Vector3; raio: number } {
  const corpo = Object.values(RETRATO_2026).reduce((maior, c) =>
    c.rUA > maior.rUA ? c : maior
  );
  // MESMO caminho da camada de planetas (`planetas.ts:349-353`):
  // `eclipticaParaEquatorial(vetorUA) × AU_PARA_PC`. Qualquer outro
  // escalar de comprimento aqui seria uma segunda fonte de verdade.
  const eq = eclipticaParaEquatorial(corpo.vetorUA);
  return {
    posicao: new THREE.Vector3(
      eq[0] * AU_PARA_PC,
      eq[1] * AU_PARA_PC,
      eq[2] * AU_PARA_PC
    ),
    raio: corpo.rUA * AU_PARA_PC,
  };
}

/**
 * A BORDA DO SISTEMA INTERNO — a esfera que o Atlas ENQUADRA AO ABRIR
 * desde o item 61 (a vista que o dono escolheu em 23/08: *"o sistema
 * interno com as linhas de órbita desenhadas"*).
 *
 * A IRMÃ DE CIMA NÃO PERDEU EMPREGO: a esfera do sistema INTEIRO
 * (`orbitaMaisExterna`) segue sendo o TETO do zoom (`AtlasRig.tetoDeZoom`)
 * e a fronteira do pouso (`Escada.alvoDoPouso`). O que ela deixou de ser
 * é a ABERTURA — e é por isso que o visitante continua podendo puxar a
 * roda para fora até ver o sistema todo, de onde o Atlas costumava nascer.
 *
 * POR QUE AQUI MARTE É PINADO e ali o "mais externo" é PERGUNTADO AO
 * DADO — a distinção é o que impede isto de ser a segunda fonte de
 * verdade que a nota de `orbitaMaisExterna` proíbe:
 *
 *  · «quem é o mais externo» é uma PERGUNTA, e a resposta troca com a
 *    data — Netuno e Plutão trocaram de lugar entre 1979 e 1999;
 *  · «onde acaba o sistema interno» é uma DEFINIÇÃO: os rochosos são
 *    Mercúrio, Vênus, Terra e Marte, e Marte é o de fora em QUALQUER
 *    data, porque o periélio dele (1,381 UA) fica fora do afélio da
 *    Terra (1,017 UA). A esfera da órbita de Marte centrada no Sol
 *    contém os outros três por construção e não por sorte — a MESMA
 *    promessa que `orbitaMaisExterna` faz para o sistema todo.
 *
 * SÓ O RAIO SAI DAQUI. A DIREÇÃO de onde a abertura olha continua saindo
 * do corpo mais externo, e o porquê está em `Escada.casaViva`.
 */
export const BORDA_DO_SISTEMA_INTERNO = {
  /** a chave da efeméride VIVA (`posicaoHeliocentrica`) — a abertura na
   *  época viva (F2b) lê o raio no instante pedido, como sempre leu.
   *  O `satisfies` é a amarra: a chave tem de existir no RETRATO, que é
   *  a mesma tabela de onde o `raio` abaixo sai e a mesma que alimenta
   *  `IDS_FOTOMETRIA`. Sem ela, uma string solta aqui só quebraria em
   *  runtime, e a vista de abertura é o pior lugar para descobrir isso. */
  id: 'mars' satisfies keyof typeof RETRATO_2026,
  /** e o raio do RETRATO congelado, o caminho SEM efeméride: ali não há
   *  linha de órbita nenhuma para desenhar (§6 de `orbitas.ts`), e o
   *  enquadramento é o que sobra de honesto */
  raio: RETRATO_2026.mars.rUA * AU_PARA_PC,
} as const;
