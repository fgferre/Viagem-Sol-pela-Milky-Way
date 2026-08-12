// ============================================================
// AtlasRig — o escritor de câmera da fase 'atlas'.
//
// O voo livre é pilotagem em 1ª pessoa; a viagem é roteiro. O Atlas é
// a terceira lei: ENQUADRAMENTO PRIVILEGIADO sobre um alvo — a câmera
// não é dirigida, ela é POSICIONADA, e a posição sai de uma conta
// conferível em vez de um número escolhido a olho.
//
// A matemática vem da `PrivilegedPosition` do atlas doador (406 linhas
// de classe sobre THREE, acopladas a um `ViewportRect`); o que
// atravessa é o que é conferível — `d = r/sen(θ/2)`, o
// `max(distVertical, distHorizontal)` que salva tela ultrawide, e a
// correção pelo retângulo que sobra depois do HUD. A implementação é
// FUNÇÃO PURA, e o rig é o fio que a liga à câmera (PLANO-ATLAS §2.3).
// ============================================================
import * as THREE from 'three';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../lib/atlas/frameGalactico';
import { RETRATO_2026 } from '../world/planetas/retrato2026';

// ---- as quatro constantes medidas, num lugar só ------------------
// Herdadas do doador como VALORES MEDIDOS a reaproveitar, não como
// código: quem quiser mudar uma delas muda aqui, e o teste da função
// pura cobra o efeito. (PLANO-ATLAS §2.3, linha `PrivilegedPosition`.)

/**
 * Ângulo de fase da câmera em relação ao eixo Sol→alvo, em graus.
 * Iluminação de três quartos ("Rembrandt"): de frente para o Sol o
 * alvo lê chapado, e o relevo — quando houver relevo, na Onda 6 —
 * some junto com o terminador.
 */
export const PHASE_OFFSET_GRAUS = 30;

/**
 * Desvio MÁXIMO que a órbita do visitante pode acumular contra a
 * direção solar, em graus. 70° ainda deixa mais de meio disco
 * iluminado com o terminador em quadro; passar disso é fotografar o
 * lado escuro do alvo.
 */
export const MAX_SOLAR_DEVIATION_GRAUS = 70;

/**
 * Viés de moldura quando o PAI do alvo está no quadro (o Sol, para um
 * planeta; o planeta, para uma lua na Onda 6): aproxima a câmera a 78%
 * da distância de enquadramento isolado, para o pai entrar composto em
 * vez de tangenciar a borda.
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

/**
 * As tarjas de cinema comem 6,5% da altura em CADA borda
 * (`.letterbox.on { height: 6.5vh }`, hud.css) e o Atlas as mantém —
 * é o mesmo quadro do filme. Fonte única do número para o retângulo
 * útil; se a tarja mudar no CSS, muda aqui.
 */
const LETTERBOX_FRACAO = 0.065;

/**
 * O que o HUD DO ATLAS come, além das tarjas, em fração da altura —
 * espelho dos números que o `hud.css` usa, na mesma disciplina do
 * `LETTERBOX_FRACAO`. Não são chutes de folga: o juiz de a11y mede os
 * retângulos REAIS dos dois elementos no navegador e cobra que a
 * declaração aqui os cubra (`scripts/visual/a11y.mjs`, prova "o
 * retângulo útil cobre o HUD do Atlas"). Se a CSS crescer, o gate
 * quebra antes de o alvo começar a ser enquadrado por baixo do selo.
 *
 * TOPO: `.atlas-contexto` e `.controls-bar`, ancoradas em `top: 8,5vh`
 * (a mesma linha) — medido 12,5% da altura a 1280×720, tarja incluída.
 * BASE: `.atlas-selo`, ancorado em `bottom: 7,4vh` — quatro blocos de
 * texto, medido 19,6% da altura com a tarja, e é a peça mais alta do
 * HUD do modo (a dica do Atlas fica em 13,4%).
 *
 * As duas frações são de tela de mesa (medidas a 1280×720 e 1200×900).
 * A UI Scale da F6 mexe no tamanho do texto do HUD e por isso mexe
 * NESTES números: quem mudar o `?ui=` tem de remedir aqui — o gate do
 * juiz falha se a declaração deixar de cobrir o medido.
 */
const CONTEXTO_FRACAO = 0.075;
const SELO_FRACAO = 0.14;

/**
 * O que o HUD come do quadro, em FRAÇÃO de cada borda. Um só produtor
 * publicado (`retanguloUtilDoAtlas`) — o Atlas não é letterboxed por
 * conta própria, ele desconta as áreas REAIS do HUD dele.
 */
export interface RetanguloUtil {
  esquerda: number;
  direita: number;
  topo: number;
  base: number;
}

/** Quadro inteiro — nenhuma borda comida. */
export const RETANGULO_CHEIO: RetanguloUtil = {
  esquerda: 0,
  direita: 0,
  topo: 0,
  base: 0,
};

/**
 * O ÚNICO produtor do retângulo útil do Atlas — tarjas de cinema mais
 * as áreas REAIS do HUD do modo (F2). A conta não se repete dentro de
 * componente nenhum: quem enquadra pergunta aqui.
 *
 * As duas áreas do HUD entram no eixo VERTICAL e não no horizontal
 * mesmo estando encostadas nas laterais (ContextLine à esquerda, selo à
 * direita): o retângulo é um recorte retangular do quadro, e descontar
 * meia largura por causa de uma faixa que ocupa 7% da altura empurraria
 * a câmera para trás sem necessidade. Descontar a FAIXA inteira é o
 * corte honesto — é o que garante que nada do alvo caia atrás do texto.
 */
export function retanguloUtilDoAtlas(): RetanguloUtil {
  return {
    esquerda: 0,
    direita: 0,
    topo: LETTERBOX_FRACAO + CONTEXTO_FRACAO,
    base: LETTERBOX_FRACAO + SELO_FRACAO,
  };
}

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
  /** O pai do alvo está no quadro? (aplica `PARENT_FRAMING_BIAS`) */
  comPai?: boolean;
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

const GRAU = Math.PI / 180;

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
  const { rAlvo, fovDeg, aspect, retanguloUtil, comPai } = pedido;
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
  const distancia =
    Math.max(raio / Math.sin(meiaV), raio / Math.sin(meiaH)) *
    (comPai ? PARENT_FRAMING_BIAS : 1);

  return { distancia, giroY, giroX };
}

/**
 * A DIREÇÃO em que a câmera se põe, vista do alvo: o eixo Sol→alvo
 * girado de `PHASE_OFFSET_GRAUS` na direção do polo. Pura.
 *
 * `desvioExtra` (radianos) é a órbita do visitante somada ao pino; o
 * total é grampeado em `MAX_SOLAR_DEVIATION_GRAUS` — passar disso é
 * fotografar o lado escuro do alvo, e é essa a única serventia do 70°.
 */
export function direcaoPrivilegiada(
  doSolAoAlvo: THREE.Vector3,
  polo: THREE.Vector3,
  desvioExtra: number,
  out: THREE.Vector3
): THREE.Vector3 {
  const eixoSolar = out.copy(doSolAoAlvo);
  if (eixoSolar.lengthSq() < 1e-30) eixoSolar.set(0, 0, 1);
  eixoSolar.normalize();
  const maximo = MAX_SOLAR_DEVIATION_GRAUS * GRAU;
  const angulo = THREE.MathUtils.clamp(
    PHASE_OFFSET_GRAUS * GRAU + (Number.isFinite(desvioExtra) ? desvioExtra : 0),
    -maximo,
    maximo
  );
  const eixo = new THREE.Vector3().crossVectors(eixoSolar, polo);
  // alvo alinhado com o polo: qualquer perpendicular serve
  if (eixo.lengthSq() < 1e-12) {
    eixo.set(1, 0, 0).cross(eixoSolar);
    if (eixo.lengthSq() < 1e-12) eixo.set(0, 1, 0).cross(eixoSolar);
  }
  return eixoSolar.applyAxisAngle(eixo.normalize(), angulo);
}

/** Polo da eclíptica no frame da cena (equatorial J2000). */
const POLO_ECLIPTICO = (() => {
  const v = eclipticaParaEquatorial([0, 0, 1]);
  return new THREE.Vector3(v[0], v[1], v[2]).normalize();
})();

/** O Sol mora na origem da cena — o centro de tudo que o Atlas enquadra. */
const SOL = new THREE.Vector3(0, 0, 0);

const _dir = new THREE.Vector3();

/**
 * O rig. Estado mínimo: um alvo, um raio de enquadramento e a órbita
 * que o visitante somou com o ponteiro. Não anima nada — o
 * reposicionamento do Atlas acontece atrás do véu (D3: "não é
 * travessia física"), e é por isso que a prontidão de captura só
 * precisa esperar o véu, não o rig.
 */
export class AtlasRig {
  /** alvo em coordenadas de CENA (pc) */
  readonly alvo = new THREE.Vector3();
  /** raio da esfera enquadrada, em pc */
  private raio = 0;
  private comPai = false;
  private orbita = 0;

  /**
   * O ENQUADRAMENTO DE ABERTURA: o SISTEMA inteiro. O alvo é o corpo
   * mais externo do retrato e o raio enquadrado é a órbita dele — quem
   * enquadra a órbita de fora enquadra tudo que está dentro dela, que
   * é o que um atlas do sistema solar abre mostrando.
   *
   * Por que não a Terra, que seria "casa": enquadrar a órbita da Terra
   * põe a câmera a ~4 UA do Sol, e a 4 UA o Sol estoura o quadro
   * inteiro de branco — é fotometria correta (o Sol a 4 UA É ofuscante)
   * contra uma exposição de 1,02 que só a gradação por contexto da F6
   * vai saber tratar. Daqui, a ~150 UA, o sistema aparece como o gate
   * já conhece a vista `ua150`: o desfile a olho nu.
   */
  focarNoSistema() {
    const fora = orbitaMaisExterna();
    this.focar(fora.posicao, fora.raio, true);
  }

  /** foca um ponto da cena, enquadrando uma esfera de `raio` pc nele */
  focar(alvo: THREE.Vector3, raio: number, comPai = false) {
    this.alvo.copy(alvo);
    this.raio = raio;
    this.comPai = comPai;
    this.orbita = 0;
  }

  /** arrasto do ponteiro: orbita o alvo dentro do grampo solar */
  addOrbitDelta(dx: number) {
    const maximo = MAX_SOLAR_DEVIATION_GRAUS * GRAU;
    this.orbita = THREE.MathUtils.clamp(
      this.orbita - dx * 0.0022,
      -maximo - PHASE_OFFSET_GRAUS * GRAU,
      maximo - PHASE_OFFSET_GRAUS * GRAU
    );
  }

  /**
   * Escreve a câmera do quadro. Chamada do MESMO ponto do tick em que
   * a JourneyRig escreve a dela — inclusive o `fov`, que aqui é o pino
   * `ATLAS_FOV_GRAUS` e não o resíduo amortecido do shot anterior.
   */
  apply(camera: THREE.PerspectiveCamera) {
    const { distancia, giroY, giroX } = enquadrar({
      rAlvo: this.raio,
      fovDeg: ATLAS_FOV_GRAUS,
      aspect: camera.aspect,
      retanguloUtil: retanguloUtilDoAtlas(),
      comPai: this.comPai,
    });
    direcaoPrivilegiada(
      _dir.copy(this.alvo).sub(SOL),
      POLO_ECLIPTICO,
      this.orbita,
      _dir
    );
    camera.position.copy(this.alvo).addScaledVector(_dir, distancia);
    camera.up.copy(POLO_ECLIPTICO);
    camera.lookAt(this.alvo);
    if (giroY !== 0) camera.rotateY(giroY);
    if (giroX !== 0) camera.rotateX(giroX);
    camera.fov = ATLAS_FOV_GRAUS;
    camera.updateProjectionMatrix();
  }
}

/**
 * Posição de cena e raio de enquadramento do corpo mais externo do
 * retrato. Fora da classe porque é conta de DADO, não de câmera — e
 * porque o teste a confere sem construir rig nenhum. Quem é "o mais
 * externo" sai do próprio retrato, medido: pinar `pluto` aqui seria
 * uma segunda fonte de verdade que a máquina do tempo da F4 (com as
 * órbitas vivas) desmentiria no primeiro salto de data.
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
