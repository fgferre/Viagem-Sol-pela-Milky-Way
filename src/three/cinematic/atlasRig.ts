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
import {
  ARRASTO_RAD_POR_PX,
  ATLAS_FOV_GRAUS,
  GIRO_MORTO_RAD,
  GRAU,
  POLO_ECLIPTICO,
  SUAVIZACAO_DO_GIRO,
  desvioDaOrientacao,
  direcaoDaLua,
  direcaoDeRepouso,
  enquadrar,
  giroQueProduz,
  orbitaMaisExterna,
  poseDoVisitante,
  upDoAtlas,
} from './enquadramento';
import { LARGURA_DE_MESA_PX, retanguloUtilDoAtlas } from './retanguloDoAtlas';
import { ORIGEM } from './enquadramento';

// A FACHADA: o retângulo útil e a matemática do enquadramento moram
// ao lado (./retanguloDoAtlas, ./enquadramento) e este arquivo os
// reexporta INTEIROS — quem sempre importou daqui segue servido, e o
// juiz de a11y continua lendo LARGURA_UTIL_MINIMA_PX deste caminho
// (a11y.mjs importa o ARQUIVO por URL no navegador).
export * from './retanguloDoAtlas';
export * from './enquadramento';

export const RAMPA_DO_DEGRAU_S = 0.5;

// A RAMPA PROPORCIONAL À TRAVESSIA (item 110): meio segundo fixo lia
// como salto seco quando o gesto cruzava o céu — palavras dele, 29/08:
// "hoje parece que há um salto abrupto". O tamanho perceptivo do gesto
// tem DOIS eixos, exatamente os que a rampa interpola: o PAN (o ângulo
// que a mira varre entre o alvo velho e o novo, visto de onde a câmera
// está) e o ZOOM (as décadas de distância entre a pose de agora e o
// enquadramento do destino). Meio segundo segue sendo o PISO — o
// mergulho órbita→corpo, que era o gesto para o qual a rampa nasceu,
// fica perto do que era (~1 s); a travessia planeta→planeta é quem
// ganha tempo; e o teto segura qualquer travessia no ritmo de um voo,
// não de um bocejo.
export const RAMPA_MAX_S = 2.2;
const RAMPA_POR_RADIANO_S = 0.9;
const RAMPA_POR_DECADA_S = 0.1;

/**
 * O PISO DO ZOOM, em RAIOS do alvo — e ele é derivado, não escolhido.
 *
 * A conta sai de `nearPlanePc` (`core/engine.ts`): com corpo em quadro
 * ele devolve `near = min(semCorpo, max(dSuperfície·0,004; raio·0,5))`,
 * ou seja o near nunca fica abaixo de MEIO raio do corpo. A câmera a
 * `k` raios do centro vê a superfície a `k − 1` raios, e o corpo começa
 * a ser cortado pelo near quando `k − 1 ≤ 0,5` — isto é, em 1,5 raios a
 * superfície cai EXATAMENTE sobre o plano near e o corpo desaparece.
 * 2,0 é o mesmo número com fator 2 de margem: a superfície fica a 1,0
 * raio e o near a 0,5, com uma folga de um raio inteiro.
 *
 * Chegar mais perto que isto NÃO é mexer neste número: é baixar o piso
 * do `nearPlanePc`, que é obra própria e declarada (o `?dbg` do near, o
 * z-fighting e a fronteira de promoção da Lei dependem dele).
 *
 * QUAL RAIO, e a resposta tem duas metades porque o alvo tem dois tipos:
 *
 *  · ALVO = UM CORPO (os degraus "órbita", "corpo" e "lua"): o raio
 *    FÍSICO dele, que é o que a conta acima descreve. Quem o conhece é a
 *    escada (`BODY_AXES`, a mesma tabela que dá raio às malhas), e ela o
 *    entrega em `focar({ pisoRaio })`. Sem ele o piso do degrau "órbita"
 *    seria 2 ÓRBITAS — de Saturno, 19 UA —, e a roda "para dentro"
 *    acabaria no vazio a 19 UA do planeta em vez de chegar perto dele.
 *    MEDIDO: com o raio físico, Saturno tem 5,55 décadas entre o piso e
 *    o teto, ou 51 estalos; com o orbital, 1,18 décadas e 11 estalos.
 *
 *  · ALVO = O SISTEMA (a abertura): o raio físico do SOL, porque na
 *    abertura o alvo É o Sol — a esfera do sistema é centrada nele, e a
 *    lei do modo é "um alvo e uma distância". Foi o raio da ESFERA
 *    ENQUADRADA até 22/08, e ali a roda tinha 70,8 UA de piso e CINCO
 *    estalos de curso: a nota de então ("descer ao Sol é outro degrau")
 *    valia enquanto a roda TROCAVA de degrau, e caiu junto com ela. Com
 *    o raio do Sol o piso é 0,00930 UA e o curso 40 estalos, a mesma
 *    ordem das ~50 de Saturno. Não abre regime de brilho novo: 2 raios
 *    solares é mais PERTO que o degrau do corpo do Sol (6,40 raios),
 *    que o `luz-do-quadro` já julga.
 */
export const K_MIN_RAIOS = 2.0;

/**
 * O FREIO PERTO DO SOLO, em raios do alvo — de quantos raios de ALTURA
 * o giro precisa para andar pleno. Item 102, P3: no NASA Eyes o giro
 * desacelera ao raspar a superfície (fator altura/raio), e aqui o ganho
 * era fixo a qualquer distância — o mesmo arrasto em pixels varria 20°
 * de céu de longe e jogava a câmera para o outro lado do planeta de
 * perto, que é metade da queixa do "péssimo".
 *
 * A CONTA é `u = clamp((raios − 1) / 3, 1/3, 1)`, e o `− 1` é o que a
 * torna ALTURA e não distância: a câmera a `k` raios do CENTRO vê a
 * superfície a `k − 1` raios. No piso do zoom (`K_MIN_RAIOS` = 2 raios,
 * um raio de altura) o giro anda a um terço; de 4 raios para cima — três
 * raios de altura — anda pleno.
 *
 * A RÉGUA É A MESMA DO PISO, e é isso que faz "no piso, um terço" ser
 * verdade por construção: o raio FÍSICO do corpo quando quem focou o
 * conhece (`pisoRaio`), e o de enquadramento quando não. NÃO é a régua
 * da porta `?d=` (`distanciaEmRaios`, sempre em raios de
 * ENQUADRAMENTO): num degrau de corpo os dois diferem por ordens de
 * grandeza, e o freio tem de falar a língua do solo.
 *
 * AJUSTÁVEL NA CONFERÊNCIA DELE: é número de gosto, e o item 102 o
 * registra como tal.
 */
export const FREIO_DO_SOLO_RAIOS = 3;

/**
 * ...e o quanto o freio pode apertar, no máximo. Um terço é o número do
 * P3; abaixo dele o giro perto da superfície viraria melado, e com zero
 * a câmera ficaria presa no piso do zoom sem poder sair.
 */
export const FREIO_MINIMO_DO_SOLO = 1 / 3;

/**
 * QUANTO DEMORA O ENDIREITAR, em segundos — a rampa do botão de
 * bússola. Meio segundo é a mesma duração de `RAMPA_DO_DEGRAU_S`, e
 * pelo mesmo motivo: é o tempo em que o olho segue uma troca sem
 * precisar reencontrar a cena. Zerar de uma vez seria a imagem girando
 * sozinha num quadro, que é a queixa do item 102 posta ao contrário.
 */
export const ENDIREITAR_S = 0.5;

/**
 * ONDE A BÚSSOLA ACENDE, em graus de horizonte torto. 5° é o menor
 * desvio que se LÊ como torto numa foto — abaixo disso o olho aceita
 * como enquadramento, e um botão oferecendo consertar o que ninguém viu
 * torto é ruído.
 */
export const DESVIO_QUE_ACENDE_GRAUS = 5;

/**
 * ...e onde ela apaga. Dois graus, não cinco: com um limiar só o botão
 * pisca em volta dele enquanto o dedo anda, e a distância entre os dois
 * números é a histerese que impede isso. Apagar mais cedo do que acende
 * é a direção certa — quem endireitou fica endireitado por uma faixa,
 * não por um fio.
 */
export const DESVIO_QUE_APAGA_GRAUS = 2;

const _dir = new THREE.Vector3();
const _dirPai = new THREE.Vector3();
const _posDestino = new THREE.Vector3();
const _quatDestino = new THREE.Quaternion();
const _posPartida = new THREE.Vector3();
const _quatPartida = new THREE.Quaternion();
const _dirA = new THREE.Vector3();
const _dirB = new THREE.Vector3();
const _up = new THREE.Vector3();
const _delta = new THREE.Vector3();
/** a pose que está na tela, guardada enquanto o referencial troca */
const _dirAgora = new THREE.Vector3();
const _upAgora = new THREE.Vector3();
/** a direção de repouso do referencial NOVO, âncora do giro guardado */
const _repouso = new THREE.Vector3();
/** o passo de rotação do quadro, em torno dos eixos da TELA */
const _eixoDaTela = new THREE.Vector3();
const _passoDoGiro = new THREE.Quaternion();
/** a MIRA da pose que está na tela (câmera→frente) no quadro do clique */
const _miraNaTela = new THREE.Vector3();
/** a base de uma pose pura, montada como o `lookAt` da câmera monta */
const _baseDaPose = new THREE.Matrix4();
/** o eixo `z` do frame de repouso — a mira, e o eixo do roll */
const _EIXO_DA_MIRA = new THREE.Vector3(0, 0, 1);

/**
 * O rig. Estado mínimo: um alvo, um raio de enquadramento e o giro
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
  /**
   * O QUE O DEDO DO VISITANTE ACUMULOU — uma ROTAÇÃO, guardada no frame
   * da pose de repouso (ver `GiroDoVisitante`). A identidade é o
   * repouso, e é dela que sai a condição de nascimento do item 102.
   */
  private readonly giro = new THREE.Quaternion();
  /**
   * A CAIXA DE ENTRADA DO QUADRO, em radianos: o que o dedo pediu desde
   * o último `apply`. Vários eventos de ponteiro cabem no mesmo quadro —
   * o navegador entrega `pointermove` em cascata — e todos somam aqui.
   * Esvaziada pelo `consumirOGiro`.
   *
   * AQUI AINDA SÃO DOIS NÚMEROS, e é o certo: o que chega do ponteiro é
   * um par de deltas de TELA, e o par só vira rotação no consumo, onde
   * há `dt` e onde a base da câmera é conhecida. Guardar um quaternion
   * de entrada obrigaria a montar a base a cada `pointermove`.
   */
  private readonly entrada = { altura: 0, volta: 0 };
  /**
   * O GIRO SUAVIZADO que o quadro vai aplicar — o único estado que a
   * inércia precisa (`SUAVIZACAO_DO_GIRO`). Não é velocidade e não tem
   * relógio próprio: é o filtro exponencial da caixa de entrada, e ele
   * decai sozinho quando a caixa fica vazia. É isso que faz o giro
   * MORRER MACIO ao soltar em vez de parar seco (item 102, P1).
   */
  private readonly suav = { altura: 0, volta: 0 };
  /**
   * O ENDIREITAR EM CURSO — a bússola do HUD (item 102). `total` é o
   * roll que o clique mandou desfazer, `t` o quanto da rampa já correu
   * e `feito` o quanto dele já foi aplicado ao `giro`. `total = 0` quer
   * dizer «não há nada endireitando».
   *
   * POR DIFERENÇA E NÃO POR DESTINO: cada quadro aplica só o pedaço que
   * falta desde o quadro anterior, então o dedo pode arrastar POR CIMA
   * do endireitar sem que um desfaça o outro — e um arrasto de verdade
   * cancela a rampa, porque a vontade do visitante ganha da animação
   * que ele interrompeu.
   */
  private readonly endireitando = { total: 0, t: 0, feito: 0 };
  /**
   * A BÚSSOLA ESTÁ ACESA? — o veredito COM histerese, recalculado a
   * cada quadro por `atualizarBussola`. Mora no rig e não no HUD
   * porque é estado de CÂMERA: quem sabe o quanto o horizonte está
   * torto é quem escreve a pose.
   */
  private torto = false;
  /**
   * De onde sai o EIXO SOLAR quando o próprio alvo não serve para
   * defini-lo. Vale o alvo em todo enquadramento comum; na vista de
   * abertura, cujo alvo é a ORIGEM (o Sol), ele é a posição do corpo
   * mais externo — sem isso `direcaoDeRepouso` cairia no ramo
   * degenerado (vetor nulo) e a abertura viraria uma direção arbitrária.
   */
  private readonly eixoDe = new THREE.Vector3();
  /**
   * O PAI do alvo, quando o alvo é uma LUA (degrau "lua" da escada,
   * F2b/D7): com ele presente a direção sai de `direcaoDaLua` (a
   * mistura `PARENT_FRAMING_BIAS`) em vez de `direcaoDeRepouso`.
   * `null` em todo enquadramento comum.
   */
  private pai: THREE.Vector3 | null = null;
  private readonly paiGuardado = new THREE.Vector3();
  /**
   * O POLO QUE FICA NO ALTO deste enquadramento (Onda 7). Era a
   * constante `POLO_ECLIPTICO`, sempre, e a Terra saía 4,2° torta na
   * data de abertura e até 27,8° noutras datas — o eixo do planeta é
   * dado medido do kernel IAU, e o Atlas o ignorava.
   *
   * A LEI, decidida pelo dono: polo do CORPO nos degraus "corpo" e
   * "lua"; eclíptica nos degraus "sistema" e "órbita" — lá o assunto é
   * o plano do sistema, e o eixo de um corpo qualquer não teria por que
   * governar o horizonte. O default é a eclíptica, então quem não pede
   * nada continua com a vista de sempre, bit a bit.
   *
   * A RAMPA ENTRE DEGRAUS interpola os dois de graça: ela já mistura as
   * poses por `slerp` de quaternion, e o `up` está dentro da pose.
   */
  private readonly polo = POLO_ECLIPTICO.clone();

  // ---- a DISTÂNCIA, e é ela a lei nova (item 73) -------------------
  // «um ALVO e uma DISTÂNCIA». Até 22/08 o Atlas tinha só o alvo: a
  // distância era função dele (`enquadrar().distancia`) e não havia onde
  // guardar "o visitante quis chegar mais perto" — daí a roda ter virado
  // degrau, e daí a queixa. `null` é a conta de sempre, BIT A BIT, e é
  // por isso que toda vista pinada continua reproduzindo: quem não mexeu
  // na roda cai no mesmo caminho de código de antes.
  private distanciaPinada: number | null = null;
  /**
   * O RAIO que mede o PISO do zoom, em pc — o FÍSICO do corpo alvo,
   * quando quem focou o conhece. `null` cai no raio de enquadramento
   * (ver `K_MIN_RAIOS`). Não anda com o relógio: é propriedade do corpo,
   * não do instante, então `recompor` não o toca.
   */
  private pisoRaio: number | null = null;
  /** a distância PURA do enquadramento, do último quadro escrito (pc) */
  private distanciaEnquadrada = 0;
  /**
   * `distância / raio` do último enquadramento — o fator ~6,40 que a
   * lente e o retângulo útil produzem. Guardado porque `enquadrar` é
   * LINEAR no raio (há prova disso na bancada), então o teto do zoom
   * sai dele sem o rig precisar saber de `aspect` nem de HUD fora do
   * `apply`.
   */
  private fatorDeEnquadramento = 0;

  // ---- a rampa entre degraus (F2b/D7) ------------------------------
  // O reposicionamento de ENTRADA no Atlas segue atrás do véu (D3);
  // esta rampa é só a troca de degrau DENTRO do modo — órbita→corpo,
  // corpo→lua, as subidas — onde não há véu e um corte seco leria como
  // teletransporte. Ela interpola POSES (posição por direção+distância
  // log em torno do alvo novo, orientação por slerp), termina EXATA na
  // pose pura do enquadramento (t ≥ 1 escreve a conta de sempre, bit a
  // bit — é o que mantém `?foco=` reproduzível), e o snapshot de
  // partida é a pose que a câmera MOSTRAVA no quadro da troca.
  private rampaT = 1;
  /** a duração DESTA rampa, escolhida pela travessia no `focar` (item 110) */
  private rampaDuracaoS = RAMPA_DO_DEGRAU_S;
  private readonly partida = {
    alvo: new THREE.Vector3(),
    raio: 0,
    eixoDe: new THREE.Vector3(),
    pai: new THREE.Vector3(),
    temPai: false,
    giro: new THREE.Quaternion(),
    polo: POLO_ECLIPTICO.clone(),
    /** o pino de distância que a câmera MOSTRAVA no quadro da troca */
    distancia: null as number | null,
  };

  /**
   * Foca um ponto da cena, enquadrando uma esfera de `raio` pc nele.
   * `eixoDe` é o ponto de onde sai o eixo solar — o próprio alvo, salvo
   * quando o alvo É a origem: aí o eixo Sol→alvo seria nulo e quem chama
   * entrega a direção de fora (`Escada.casaViva`, na abertura e nos
   * degraus centrados no Sol).
   *
   * `opcoes.pai` liga o degrau "lua" (direção por `direcaoDaLua`);
   * `opcoes.rampa` pede a transição suave a partir do enquadramento
   * ATUAL — só faz sentido com a fase já viva (as trocas de degrau);
   * entrada no Atlas e deep-link seguem instantâneos atrás do véu.
   * Focar o MESMO alvo com rampa é no-op (nem reinicia a rampa): é o
   * que mantém `?foco=` idempotente — clicar de novo não move um bit.
   */
  focar(
    alvo: THREE.Vector3,
    raio: number,
    eixoDe: THREE.Vector3 = alvo,
    opcoes: {
      rampa?: boolean;
      pai?: THREE.Vector3 | null;
      /** o polo que fica no alto; ausente = o da eclíptica (ver `polo`) */
      polo?: THREE.Vector3 | null;
      /**
       * o raio FÍSICO do corpo alvo, em pc — a régua do piso do zoom
       * (`K_MIN_RAIOS`). Ausente = o raio de enquadramento.
       */
      pisoRaio?: number | null;
    } = {}
  ) {
    const pai = opcoes.pai ?? null;
    const polo = opcoes.polo ?? POLO_ECLIPTICO;
    if (opcoes.rampa) {
      // "MESMO ALVO" quer dizer «a pose que este foco produziria já está
      // na tela» — e com uma DISTÂNCIA PINADA ela não está. Sem a
      // terceira linha, o duplo clique num corpo que o visitante acabou
      // de SELECIONAR era no-op: a seleção é o alvo com a câmera parada,
      // e o mergulho é o mesmo alvo no enquadramento dele (item 73).
      const mesmoAlvo =
        this.alvo.distanceToSquared(alvo) === 0 &&
        this.raio === raio &&
        this.distanciaPinada === null &&
        (pai === null) === (this.pai === null) &&
        this.polo.distanceToSquared(polo) === 0;
      if (mesmoAlvo) return;
      // snapshot do enquadramento QUE ESTÁ NA TELA — é dele que a rampa
      // parte. Com rampa EM VOO "na tela" é a pose interpolada, não o
      // estado (que é o destino da rampa antiga): o par canônico
      // clique-escolhe + duplo-clique-mergulha cai SEMPRE aqui, porque
      // a janela do duplo (0,5 s) é menor que a rampa da seleção
      const emRampa = this.rampaT < 1;
      let dAgora: number;
      if (emRampa) {
        this.partirDaTela(_posPartida, _miraNaTela, _upAgora);
        dAgora = _posPartida.distanceTo(this.alvo);
      } else {
        this.partida.alvo.copy(this.alvo);
        this.partida.raio = this.raio;
        this.partida.eixoDe.copy(this.eixoDe);
        this.partida.temPai = this.pai !== null;
        if (this.pai) this.partida.pai.copy(this.pai);
        this.partida.giro.copy(this.giro);
        this.partida.polo.copy(this.polo);
        this.partida.distancia = this.distanciaPinada;
        this.repousoDe(this.eixoDe, this.alvo, this.pai, this.polo, _dirAgora);
        poseDoVisitante(_dirAgora, this.polo, this.giro, _dirAgora, _upAgora);
        _posPartida.copy(this.alvo).addScaledVector(_dirAgora, this.distancia);
        _miraNaTela.copy(this.alvo).sub(_posPartida);
        dAgora = this.distancia;
      }
      // A DURAÇÃO É A DA TRAVESSIA (item 110) — medida ANTES de o
      // referencial trocar, na mesma conta fechada de `selecionar`:
      // o pan é o ângulo entre a mira de agora e o alvo novo vistos da
      // posição de agora, e o zoom compara a distância na tela com o
      // enquadramento do destino (estimado pela razão viva
      // distância/raio, que é a lei do enquadramento no fov de agora).
      _dirB.copy(alvo).sub(_posPartida);
      const pan =
        _miraNaTela.lengthSq() > 0 && _dirB.lengthSq() > 0
          ? _miraNaTela.angleTo(_dirB)
          : 0;
      const kDoEnquadramento =
        this.raio > 0 && this.distanciaEnquadrada > 0
          ? this.distanciaEnquadrada / this.raio
          : 0;
      const dDestino = kDoEnquadramento > 0 ? raio * kDoEnquadramento : 0;
      const decadas =
        dDestino > 0 && dAgora > 0
          ? Math.abs(Math.log10(dDestino / dAgora))
          : 0;
      this.rampaDuracaoS = Math.min(
        RAMPA_MAX_S,
        RAMPA_DO_DEGRAU_S + RAMPA_POR_RADIANO_S * pan + RAMPA_POR_DECADA_S * decadas
      );
      this.rampaT = 0;
    } else {
      this.rampaT = 1;
    }
    this.alvo.copy(alvo);
    this.raio = raio;
    this.eixoDe.copy(eixoDe);
    if (pai) {
      this.paiGuardado.copy(pai);
      this.pai = this.paiGuardado;
    } else {
      this.pai = null;
    }
    this.polo.copy(polo);
    this.pisoRaio =
      opcoes.pisoRaio !== undefined && opcoes.pisoRaio !== null && opcoes.pisoRaio > 0
        ? opcoes.pisoRaio
        : null;
    this.giro.identity();
    // ...e a inércia do gesto anterior não atravessa a troca de alvo: o
    // resto de um giro em Marte não tem o que fazer chegando em Saturno
    this.esquecerOGiro();
    // ALVO NOVO NASCE NO ENQUADRAMENTO, sem o zoom do alvo anterior: a
    // distância pinada é do alvo antigo e não tem sentido no novo (2
    // raios de Marte não são 2 raios de Saturno). É isto que faz a
    // escada funcionar como PRESET — o botão, o Esc, o `?ver=` e a busca
    // devolvem o enquadramento, e a roda mexe nele a partir dali.
    this.distanciaPinada = null;
  }

  /**
   * TROCA O ALVO SEM MEXER NA CÂMERA — o clique simples (item 73, plano
   * §1). É a outra metade da lei "um alvo e uma distância": `focar` é o
   * PRESET (o alvo novo nasce no enquadramento dele), e isto é a
   * SELEÇÃO (o alvo novo nasce onde o visitante já está).
   *
   * A CONTA É FECHADA e roda de trás para frente:
   *
   *  1. a pose de agora sai do próprio rig — `alvo + direção · distância`
   *     —, e não da câmera: a direção é a mesma função pura que o
   *     `escreverPose` usa, e a distância é a que ele escreveu. Os dois
   *     giros de recentragem do HUD giram a câmera SEM mover a posição
   *     dela, então esta conta é exata, e o rig continua sem precisar
   *     que ninguém lhe entregue uma câmera;
   *  2. o alvo, o raio, o eixo e o polo passam a ser os novos;
   *  3. o GIRO sai de `giroQueProduz` contra o referencial NOVO — a
   *     mesma pose escrita noutro referencial, roll incluído;
   *  4. a distância vira PINO, porque é isso que ela é agora: uma
   *     distância que o visitante escolheu (ficando parado) e que a roda
   *     continua de onde ela está.
   *
   * SEM PAI, e é declarado: a mistura de `direcaoDaLua` é uma direção
   * CALCULADA (a lua com o pai em quadro), e ela pertence ao PRESET —
   * o duplo clique, a busca, o `?foco=`. Selecionar uma lua de onde se
   * está é escolher o alvo, não pedir o enquadramento dela; quem quiser
   * o enquadramento dá o segundo clique. O religador do relógio
   * pergunta ao rig se há pai (`temPai`) em vez de deduzi-lo do degrau,
   * para não recolocar a mistura que a seleção não pediu.
   *
   * A RAMPA ENTRA QUANDO A VISTA MUDA (item 110). A câmera não sai do
   * LUGAR — mas a lei do Atlas é olhar o alvo, então trocar o alvo
   * RE-MIRA a vista em torno da câmera parada (medido: 45,5° num quadro
   * ao escolher uma estrela estando no degrau corpo de Saturno — o
   * "salto abrupto" da queixa dele, 29/08), e o grampo do passo 4 ainda
   * pode puxar a distância para a faixa do alvo novo. Com `opcoes.rampa`
   * essa mudança desliza pela MESMA rampa dos degraus (slerp + distância
   * em log), com duração proporcional; sem mudança perceptível a seleção
   * segue instantânea — re-clicar o mesmo alvo não balança um bit, e o
   * destino final é bit a bit o de sempre (a prova do smoke, "a câmera
   * não sai do lugar", mede DEPOIS de assentar e continua verdadeira).
   */
  selecionar(
    alvo: THREE.Vector3,
    raio: number,
    eixoDe: THREE.Vector3 = alvo,
    opcoes: {
      polo?: THREE.Vector3 | null;
      pisoRaio?: number | null;
      rampa?: boolean;
    } = {}
  ) {
    // 1. a pose de agora, no mundo — a direção E o alto da tela, porque
    //    desde o giro livre a pose tem TRÊS graus de liberdade e
    //    "não mexer na câmera" inclui não endireitar o horizonte
    const emRampa = this.rampaT < 1;
    if (emRampa) {
      // com rampa EM VOO o estado é o DESTINO dela, não o que a tela
      // mostra — a pose de agora e a partida saem da pose interpolada
      // (ver `partirDaTela`; o pan contra a MIRA real também resolve o
      // re-clique do mesmo alvo, que dava pan 0 e teleportava)
      this.partirDaTela(_posPartida, _miraNaTela, _upAgora);
    } else {
      this.repousoDe(this.eixoDe, this.alvo, this.pai, this.polo, _dirAgora);
      poseDoVisitante(_dirAgora, this.polo, this.giro, _dirAgora, _upAgora);
      _posPartida.copy(this.alvo).addScaledVector(_dirAgora, this.distancia);
      // o snapshot de partida, ANTES de o referencial trocar
      this.partida.alvo.copy(this.alvo);
      this.partida.raio = this.raio;
      this.partida.eixoDe.copy(this.eixoDe);
      this.partida.temPai = this.pai !== null;
      if (this.pai) this.partida.pai.copy(this.pai);
      this.partida.giro.copy(this.giro);
      this.partida.polo.copy(this.polo);
      this.partida.distancia = this.distanciaPinada;
      // assentada, a mira da tela é o próprio alvo
      _miraNaTela.copy(this.alvo).sub(_posPartida);
    }
    // o PAN da re-mira: o ângulo entre a mira de agora e o alvo novo
    // vistos da câmera parada — é exatamente o quanto a vista vai girar
    _dirB.copy(alvo).sub(_posPartida);
    const pan =
      _miraNaTela.lengthSq() > 0 && _dirB.lengthSq() > 0
        ? _miraNaTela.angleTo(_dirB)
        : 0;
    // 2. o referencial novo — e o gesto que trouxe a câmera até aqui
    //    acabou: a inércia não segue para o alvo escolhido
    this.esquecerOGiro();
    const polo = opcoes.polo ?? POLO_ECLIPTICO;
    this.alvo.copy(alvo);
    this.raio = raio;
    this.eixoDe.copy(eixoDe);
    this.pai = null;
    this.polo.copy(polo);
    this.pisoRaio =
      opcoes.pisoRaio !== undefined && opcoes.pisoRaio !== null && opcoes.pisoRaio > 0
        ? opcoes.pisoRaio
        : null;
    // 3. a MESMA pose, escrita no referencial novo
    _dirB.copy(_posPartida).sub(this.alvo);
    const distancia = _dirB.length();
    if (!(distancia > 0)) {
      // a câmera está EM CIMA do alvo novo: não há direção a preservar,
      // e o enquadramento é a única resposta honesta
      this.giro.identity();
      this.distanciaPinada = null;
      this.rampaT = 1;
      return;
    }
    _dirB.multiplyScalar(1 / distancia);
    this.repousoDe(this.eixoDe, this.alvo, null, this.polo, _repouso);
    giroQueProduz(_dirB, _upAgora, _repouso, this.polo, this.giro);
    // 4. a distância vira pino, grampeada na faixa do alvo NOVO. O teto
    //    usa o `fatorDeEnquadramento` do quadro anterior — ele é da
    //    LENTE e do HUD, não do alvo, então não envelhece na troca.
    const piso = this.pisoDeZoom;
    this.distanciaPinada = THREE.MathUtils.clamp(
      distancia,
      piso,
      Math.max(piso, this.tetoDeZoom)
    );
    // 5. a re-mira DESLIZA quando há o que ver (item 110): pan da vista
    //    e décadas do grampo somam a duração; sem mudança perceptível a
    //    seleção segue seca — idempotente como sempre foi. Com rampa em
    //    voo o ramo seco é PROIBIDO por construção: "seco" escreveria o
    //    destino no quadro seguinte, e a tela ainda está no meio do
    //    caminho — o pedaço que falta viraria salto
    const decadas =
      this.distanciaPinada > 0
        ? Math.abs(Math.log10(this.distanciaPinada / distancia))
        : 0;
    if (opcoes.rampa && (emRampa || pan > 1e-4 || decadas > 1e-6)) {
      this.rampaDuracaoS = Math.min(
        RAMPA_MAX_S,
        RAMPA_DO_DEGRAU_S + RAMPA_POR_RADIANO_S * pan + RAMPA_POR_DECADA_S * decadas
      );
      this.rampaT = 0;
    } else {
      this.rampaT = 1;
    }
  }

  /**
   * POUSA A CÂMERA NUMA POSE QUE VEIO DE FORA — o portal do filme (item
   * 61, §2). É o IRMÃO de `selecionar`: os mesmos passos 2, 3 e 4, com a
   * pose de partida chegando por ARGUMENTO em vez de sair do próprio
   * rig.
   *
   * POR QUE O IRMÃO EXISTE. `selecionar` deriva a pose de agora do rig
   * (`alvo + direção · distância`), e isso só é verdade quando o rig É
   * quem escreveu o último quadro. Vindo do filme ele está com a pose
   * VELHA — o Atlas nunca desenhou nada nesta sessão —, então a conta
   * fechada dele daria a vista de abertura de sempre, que é exatamente o
   * defeito: entrar no Atlas em t=12, t=90 ou t=160 saía sempre no mesmo
   * lugar, e o modo parecia outro programa.
   *
   * A DIFERENÇA DE VERDADE, e é uma só: aqui a distância NÃO é
   * grampeada. `selecionar` roda DENTRO do modo, onde `distanciaEnquadrada`
   * e `fatorDeEnquadramento` são do quadro anterior e valem; `pousar`
   * roda antes do primeiro `apply` da fase, quando os dois ainda são
   * zero — grampear contra um teto nulo puxaria a câmera para o piso do
   * zoom no ato, e o pouso sairia mentindo. A distância que veio é a que
   * fica; o `apply` do quadro seguinte recompõe as duas réguas com o
   * raio novo, e daí em diante a roda grampeia como sempre.
   *
   * O RAIO é escolha de quem chama (`Escada.pousarDoFilme`), e não
   * detalhe: é ele que decide onde o teto do zoom vai cair no primeiro
   * quadro. Pousar a 26.911 pc com o raio do SISTEMA poria o teto em
   * 226,8 UA e o primeiro estalo de roda teleportaria o visitante para
   * casa — por isso existe o degrau `céu`, com `raio = |posição|`.
   *
   * E O `eixoDe` VEM DE FORA, o que `selecionar` não precisa: a pose é
   * guardada como (altura, volta) CONTRA ESSE EIXO, e o religador do
   * relógio (`Escada.recomporAlvo`) vai recompor a mesma pose contra o
   * eixo que o DEGRAU define. Se os dois não forem o mesmo vetor, o
   * primeiro tique do relógio gira a câmera — medido: pousar no degrau
   * `sistema` com o eixo da câmera devolvia a vista de abertura no
   * quadro seguinte, exatamente o defeito que este método existe para
   * matar.
   */
  pousar(
    posicao: THREE.Vector3,
    alvo: THREE.Vector3,
    raio: number,
    eixoDe: THREE.Vector3,
    opcoes: { polo?: THREE.Vector3 | null; pisoRaio?: number | null } = {}
  ) {
    // 2. o referencial novo (o passo 1 do `selecionar` é o argumento) —
    //    a câmera vem do FILME, e nada do Atlas anterior a acompanha
    this.esquecerOGiro();
    const polo = opcoes.polo ?? POLO_ECLIPTICO;
    this.alvo.copy(alvo);
    this.raio = raio;
    this.eixoDe.copy(eixoDe);
    this.pai = null;
    this.polo.copy(polo);
    this.pisoRaio =
      opcoes.pisoRaio !== undefined && opcoes.pisoRaio !== null && opcoes.pisoRaio > 0
        ? opcoes.pisoRaio
        : null;
    this.rampaT = 1;
    // 3. a MESMA pose, escrita no referencial novo
    _dirB.copy(posicao).sub(this.alvo);
    const distancia = _dirB.length();
    if (!(distancia > 0)) {
      // a câmera está EM CIMA do alvo: não há direção a preservar, e o
      // enquadramento é a única resposta honesta (o mesmo ramo do
      // `selecionar`)
      this.giro.identity();
      this.distanciaPinada = null;
      return;
    }
    // com o eixo nulo `direcaoDeRepouso` cairia no ramo degenerado:
    // a própria posição da câmera serve de eixo, e aí a pose se preserva
    // por construção
    if (this.eixoDe.lengthSq() === 0) this.eixoDe.copy(posicao);
    _dirB.multiplyScalar(1 / distancia);
    this.repousoDe(this.eixoDe, this.alvo, null, this.polo, _repouso);
    // O `up` DO POUSO É O NATURAL, e é assim que era antes do giro
    // livre: quem chega do filme entrega uma POSIÇÃO, não uma
    // orientação, e o Atlas sempre escreveu o alto da tela pela sua
    // própria lei. Pedir o `up` de `upDoAtlas` na direção de chegada é
    // dizer isso com todas as letras — e é o que faz o giro nascer na
    // identidade quando o pouso cai na pose de repouso.
    upDoAtlas(_dirB, this.polo, _upAgora);
    giroQueProduz(_dirB, _upAgora, _repouso, this.polo, this.giro);
    // 4. a distância vira PINO, sem grampo — ver a docstring
    this.distanciaPinada = distancia;
  }

  /**
   * O ALVO VIVO (Onda 7) — o mesmo enquadramento, no lugar em que o
   * corpo está AGORA.
   *
   * O DEFEITO: `focar` copiava a posição UMA VEZ e a câmera perseguia
   * um ponto morto. Com a máquina do tempo andando (até 116 dias de céu
   * por segundo) a Terra saía do quadro em ~1 segundo — o degrau "corpo"
   * enquadra ~4 raios terrestres, e a Terra anda 2,5 milhões de km por
   * dia de céu. O único religador que existia era chamado num lugar só,
   * quando a efeméride chegava da rede.
   *
   * O QUE ELE NÃO FAZ, e é o ponto: não zera o arrasto do visitante e
   * não reinicia a rampa. `focar` é um GESTO (escolher outro alvo, e o
   * alvo novo nasce no pino); isto é CORREÇÃO do mesmo enquadramento, e
   * quem estava girando o objeto continua girando de onde estava.
   *
   * A POSE DE PARTIDA DA RAMPA ANDA JUNTO, e é obrigatório: a rampa
   * interpola a direção `(posPartida − alvo)` contra a direção do
   * destino, então mover só o alvo REPROJETA a partida num referencial
   * que se moveu — e o quanto isso torce é medido pela razão entre o
   * passo do relógio e a distância partida↔alvo. Na troca corpo→lua a
   * razão é 13:1 num quadro só (a Terra anda 1,6e-7 pc por quadro a 116
   * dias/s; a Lua está a 1,25e-8 pc do enquadramento da Terra), e a
   * câmera daria uma guinada de dezenas de graus em torno do alvo. Com
   * a partida transladada pelo MESMO delta, a direção de partida não se
   * mexe um bit e a rampa só vê a mudança que é real — a do destino.
   */
  recompor(
    alvo: THREE.Vector3,
    raio: number,
    eixoDe: THREE.Vector3,
    opcoes: { pai?: THREE.Vector3 | null; polo?: THREE.Vector3 | null } = {}
  ) {
    _delta.copy(alvo).sub(this.alvo);
    if (this.rampaT < 1) {
      this.partida.alvo.add(_delta);
      this.partida.eixoDe.add(_delta);
      if (this.partida.temPai) this.partida.pai.add(_delta);
    }
    this.alvo.copy(alvo);
    this.raio = raio;
    this.eixoDe.copy(eixoDe);
    const pai = opcoes.pai ?? null;
    if (pai) {
      this.paiGuardado.copy(pai);
      this.pai = this.paiGuardado;
    } else {
      this.pai = null;
    }
    this.polo.copy(opcoes.polo ?? POLO_ECLIPTICO);
  }

  /**
   * A POSE QUE ESTÁ NA TELA com a rampa EM VOO — posição, mira e alto,
   * mais a distância interpolada ao alvo (o retorno). Só faz sentido
   * com `rampaT < 1`; assentada, a pose da tela é a do próprio estado.
   *
   * A CONTA ESPELHA A DO `apply` de propósito, termo a termo (poses das
   * duas pontas, direção em torno do alvo, distância em log, slerp):
   * quem chama vai usar isto como PARTIDA de uma rampa nova, e qualquer
   * diferença contra o que o último quadro escreveu vira salto no
   * quadro do clique. Duas ausências são deliberadas: os giros de
   * recentragem do HUD (são da LENTE, iguais nas duas pontas, e o slerp
   * comuta com eles — reaplicá-los aqui os dobraria) e a caixa de
   * entrada do dedo (o que ainda não foi consumido não está na tela).
   */
  private poseNaTela(
    outPos: THREE.Vector3,
    outMira: THREE.Vector3,
    outUp: THREE.Vector3
  ): number {
    this.repousoDe(this.eixoDe, this.alvo, this.pai, this.polo, _dir);
    poseDoVisitante(_dir, this.polo, this.giro, _dir, _up);
    const dDestino = this.distanciaPinada ?? this.distanciaEnquadrada;
    _posDestino.copy(this.alvo).addScaledVector(_dir, dDestino);
    _baseDaPose.lookAt(_posDestino, this.alvo, _up);
    _quatDestino.setFromRotationMatrix(_baseDaPose);
    const p = this.partida;
    this.repousoDe(p.eixoDe, p.alvo, p.temPai ? p.pai : null, p.polo, _dir);
    poseDoVisitante(_dir, p.polo, p.giro, _dir, _up);
    // sem pino, a distância da partida sai da lei LINEAR do
    // enquadramento (ver `fatorDeEnquadramento`) — a mesma régua que o
    // `apply` recalcula por quadro, sem precisar de câmera aqui
    const dPartida = p.distancia ?? this.fatorDeEnquadramento * p.raio;
    _posPartida.copy(p.alvo).addScaledVector(_dir, dPartida);
    _baseDaPose.lookAt(_posPartida, p.alvo, _up);
    _quatPartida.setFromRotationMatrix(_baseDaPose);
    const t = this.rampaT;
    const k = t * t * (3 - 2 * t);
    _dirA.copy(_posPartida).sub(this.alvo);
    _dirB.copy(_posDestino).sub(this.alvo);
    const dA = Math.max(_dirA.length(), 1e-30);
    const dB = Math.max(_dirB.length(), 1e-30);
    _dirA.multiplyScalar(1 / dA);
    _dirB.multiplyScalar(1 / dB);
    _dir.lerpVectors(_dirA, _dirB, k);
    if (_dir.lengthSq() < 1e-12) _dir.copy(_dirB);
    _dir.normalize();
    const d = Math.exp((1 - k) * Math.log(dA) + k * Math.log(dB));
    outPos.copy(this.alvo).addScaledVector(_dir, d);
    _quatPartida.slerp(_quatDestino, k);
    outMira.set(0, 0, -1).applyQuaternion(_quatPartida);
    outUp.set(0, 1, 0).applyQuaternion(_quatPartida);
    return d;
  }

  /**
   * MATERIALIZA a pose da tela como PARTIDA de uma rampa nova — o
   * conserto do clique com rampa em voo. `selecionar` e `focar`
   * derivavam a partida do ESTADO do rig, que durante uma rampa é o
   * DESTINO dela: a rampa nova nascia no fim da antiga e o pedaço que
   * faltava acontecia num quadro (medido: 50° a 128°). E o par
   * canônico — clique escolhe, duplo clique mergulha — caía SEMPRE
   * nisso, porque a janela do duplo (0,5 s) é menor que a rampa da
   * seleção.
   *
   * O REFERENCIAL É SINTÉTICO por necessidade: `escreverPose` sempre
   * olha o próprio alvo, e a pose no meio de uma rampa não olha para
   * alvo nenhum — então o ponto que a mira atravessa (à distância
   * interpolada) vira o "alvo" da partida, com pino, raio pela lei
   * linear e giro recomposto por `giroQueProduz`. Alimentada de volta
   * no `escreverPose`, esta partida reproduz a pose da tela exata —
   * e `recompor` a translada como qualquer outra.
   */
  private partirDaTela(
    outPos: THREE.Vector3,
    outMira: THREE.Vector3,
    outUp: THREE.Vector3
  ) {
    const aoLonge = this.poseNaTela(outPos, outMira, outUp);
    const p = this.partida;
    p.alvo.copy(outPos).addScaledVector(outMira, aoLonge);
    p.eixoDe.copy(p.alvo);
    p.temPai = false;
    p.polo.copy(this.polo);
    p.raio =
      this.fatorDeEnquadramento > 0
        ? aoLonge / this.fatorDeEnquadramento
        : this.raio;
    p.distancia = aoLonge;
    this.repousoDe(p.eixoDe, p.alvo, null, p.polo, _repouso);
    _dir.copy(outMira).negate();
    giroQueProduz(_dir, outUp, _repouso, p.polo, p.giro);
  }

  /** a rampa entre degraus ainda está andando? (a captura espera por ela) */
  get animando(): boolean {
    return this.rampaT < 1;
  }

  /** a duração da rampa VIVA, em s — a que a travessia escolheu (item 110) */
  get duracaoDaRampa(): number {
    return this.rampaDuracaoS;
  }

  /**
   * A DISTÂNCIA que o último quadro escreveu, em pc — pinada quando o
   * visitante mexeu na roda, e a conta do enquadramento quando não.
   * É esta a grandeza que a porta `?d=` publica em raios do alvo.
   */
  get distancia(): number {
    return this.distanciaPinada ?? this.distanciaEnquadrada;
  }

  /** a distância PURA do enquadramento — a que `?d=` ausente reproduz. */
  get distanciaDoEnquadramento(): number {
    return this.distanciaEnquadrada;
  }

  /** o visitante pinou a distância? (`null` = a conta de sempre) */
  get distanciaEstaPinada(): boolean {
    return this.distanciaPinada !== null;
  }

  /**
   * A DISTÂNCIA EM RAIOS DO ALVO — a unidade da porta `?d=`, e a única
   * que sobrevive à troca de alvo e à troca de tela. `null` quando não
   * há régua (raio zero, o instante antes do primeiro enquadramento).
   */
  get distanciaEmRaios(): number | null {
    return this.raio > 0 ? this.distancia / this.raio : null;
  }

  /** o alvo tem PAI (o degrau "lua")? — o religador do relógio pergunta */
  get temPai(): boolean {
    return this.pai !== null;
  }

  /** o raio de enquadramento do alvo vivo, em pc — a régua do `?d=`. */
  get raioDoAlvo(): number {
    return this.raio;
  }

  /**
   * A RÉGUA DO SOLO, em pc — o raio FÍSICO do corpo alvo quando quem
   * focou o conhece, e o de enquadramento quando não (ver `pisoRaio`).
   * É dela que saem o PISO do zoom e o freio do giro, e é por isso que
   * ela tem um lugar só: as duas leis medem a mesma altura.
   */
  private get reguaDoSolo(): number {
    return this.pisoRaio !== null && this.pisoRaio > 0 ? this.pisoRaio : this.raio;
  }

  /** PISO do zoom: `K_MIN_RAIOS` raios do alvo. Ver a constante. */
  get pisoDeZoom(): number {
    return K_MIN_RAIOS * this.reguaDoSolo;
  }

  /**
   * QUANTO DO GIRO PASSA, perto do solo — ver `FREIO_DO_SOLO_RAIOS`.
   * `1` (freio nenhum) enquanto não há régua: no primeiro quadro de um
   * foco a distância do enquadramento ainda não foi registrada, e frear
   * ali seria inventar um solo onde não se mediu nenhum.
   */
  private get freioDoSolo(): number {
    const regua = this.reguaDoSolo;
    if (!(regua > 0)) return 1;
    const raios = this.distancia / regua;
    if (!(raios > 0)) return 1;
    return THREE.MathUtils.clamp(
      (raios - 1) / FREIO_DO_SOLO_RAIOS,
      FREIO_MINIMO_DO_SOLO,
      1
    );
  }

  /**
   * TETO do zoom: o enquadramento do SISTEMA INTEIRO centrado no alvo —
   * `enquadrar(raio = órbita mais externa + |alvo|)`. A soma é o que
   * torna a promessa verdadeira para um alvo fora do centro: uma esfera
   * da órbita de Plutão pendurada em Saturno não conteria o sistema.
   *
   * A ESFERA É CENTRADA NO SOL e não no corpo, e isso é o que a torna
   * honesta: uma esfera de 35,4 UA pendurada em Plutão não contém o
   * sistema — um corpo do lado oposto da mesma órbita fica a até ~71 UA
   * do centro dela, e a promessa "quem enquadra a órbita de fora
   * enquadra tudo que está dentro" seria falsa. Com o centro na origem
   * ela é verdade por construção: toda órbita do retrato cabe dentro da
   * mais externa.
   *
   * O NÚMERO DO TETO, NUM LUGAR SÓ — aqui, que é onde ele é CALCULADO
   * (quem precisar dele cita esta docstring em vez de repeti-lo). Com o
   * alvo no Sol, o retângulo útil vigente em `ui = 1` e tela de mesa
   * (aspecto ≥ 1, onde quem aperta é o vertical), a roda para a
   * **133,68 UA do Sol** — `35,4213 UA × 1,2 / sen(meia-abertura útil)`
   * sob a lente de 58° (item 86; a 35° eram 226,84) —, e como o alvo é
   * a própria origem essa distância é a distância a casa, sem triângulo
   * nenhum. Ela ANDA com o HUD e com `?ui=`: 126,30 UA em `ui = 0,85`,
   * 183,73 UA em `ui = 1,4`. O trilho de `atlasRig.test.ts` deriva o
   * número de `enquadrar()` e quebra se ele envelhecer aqui.
   *
   * ATÉ 23/08 ESTE NÚMERO MORAVA num método `focarNoSistema` do rig, que
   * enquadrava esta mesma esfera. Ele morreu com o item 61: a abertura
   * desceu para a borda do sistema interno e nenhum caminho de produção
   * chamava mais aquele método — o que a Escada chama é o `focar` de
   * baixo, direto. Dois métodos com o mesmo nome e esferas diferentes
   * eram uma armadilha para quem lesse depois.
   *
   * O Atlas nasceu NESTE teto até 23/08, desceu para a borda do sistema
   * interno com o item 61, e desde 29/08 NASCE AQUI DE NOVO — a escolha
   * dele pela folha da abertura sob a lente nova: o sistema inteiro,
   * estilo NASA Eyes. O curso da roda é todo para dentro; mais longe que
   * "o sistema em quadro" não há assunto, há fundo de céu.
   *
   * O `max` com a distância do último enquadramento é a guarda do
   * relógio: a órbita mais externa aqui vem do RETRATO congelado, e com
   * `?jd=` de outra data a casa VIVA pode ser um pouco maior. Sem o
   * `max`, o primeiro estalo para fora daria um pulinho para dentro.
   */
  get tetoDeZoom(): number {
    const doSistema =
      this.fatorDeEnquadramento > 0
        ? this.fatorDeEnquadramento * (orbitaMaisExterna().raio + this.alvo.length())
        : 0;
    return Math.max(this.distanciaEnquadrada, doSistema);
  }

  /**
   * PINA a distância ao alvo, em pc — a escrita da roda e, na etapa
   * seguinte, a da porta `?d=`. `null` devolve o enquadramento puro.
   *
   * DURANTE A RAMPA a roda re-mira o DESTINO dela: o pino é a distância
   * de chegada, o deslize continua rumo ao valor corrigido, e nada
   * salta — a tela segue na interpolação, só a ponta anda. Recusar aqui
   * (a lei até o item 110) engolia o gesto em silêncio por até 2,2 s
   * depois de CADA clique: `gestos.ts` consome a inércia da roda e
   * entrega os estalos de qualquer jeito, então o estalo recusado não
   * volta. Não é segunda mão na mesma distância: a rampa escreve a POSE
   * do quadro, o pino escreve a chegada — e os estalos já nascem da
   * chegada (`Director` os deriva de `distancia`, que durante a rampa É
   * o destino). Fora da faixa `[piso, teto]` o valor é grampeado, nunca
   * recusado — é o que faz o embalo da inércia parar na parede em vez
   * de sumir.
   */
  pinarDistancia(pc: number | null) {
    if (pc === null) {
      this.distanciaPinada = null;
      return;
    }
    if (!Number.isFinite(pc) || pc <= 0) return;
    const piso = this.pisoDeZoom;
    const teto = Math.max(piso, this.tetoDeZoom);
    this.distanciaPinada = THREE.MathUtils.clamp(pc, piso, teto);
  }

  /**
   * ARRASTO DO PONTEIRO, os DOIS eixos — e cada um gira em torno de um
   * EIXO DA TELA, que é a lei única desde 26/08 (item 102):
   *
   *  · HORIZONTAL (`dx`) gira em torno do eixo VERTICAL da tela;
   *  · VERTICAL (`dy`) gira em torno do eixo HORIZONTAL dela.
   *
   * NÃO HÁ GRAMPO EM NENHUM DOS DOIS, e não é descuido: é a frase dele
   * — *"sem travas para qualquer dos lados sem nenhum limitador de
   * angulo ou coisa parecida"*. O polo se cruza como qualquer outro
   * ponto, a volta é infinita nos dois eixos e o mundo pode ficar de
   * cabeça para baixo. Também não há eixo que MORRA: o par de leis
   * anteriores tinha, cada uma, uma geometria em que o horizontal
   * encolhia a zero (`sen φ` na linha do Sol) ou em que a subida batia
   * numa trava; girando em torno dos eixos da TELA o dedo bate 1:1 em
   * toda geometria, porque os eixos do giro SÃO os da tela.
   *
   * OS SINAIS SÃO OS DA SUPERFÍCIE SEGUINDO O DEDO (o "estilo Google
   * Earth" do projeto irmão), e são os MESMOS de antes desta obra:
   * arrastar para a DIREITA leva a câmera para a esquerda e o alvo para
   * a direita; arrastar para BAIXO leva a câmera para cima e o alvo
   * para baixo. Quem os aplica é `consumirOGiro`, com os dois negativos
   * declarados lá. `atlasRig.test.ts` cobra os dois contra a base REAL
   * da câmera depois do `apply` — se alguém trocar um sinal, o teste vê
   * pelo eixo da matriz, não pela fórmula repetida.
   *
   * NÃO HÁ MAIS O QUE ENROLAR: o acumulador é um quaternion, e um
   * quaternion é periódico por construção — não existe o número sem
   * teto que a `volta` precisava aparar.
   *
   * O DELTA NÃO ENTRA DIRETO NO ACUMULADOR (item 102, P1): ele cai na
   * CAIXA DE ENTRADA do quadro, e quem o vira rotação é o
   * `consumirOGiro`, com o filtro da inércia no meio. O que chega aqui
   * já vem em radianos porque a sensibilidade é do GESTO — o filtro é do
   * QUADRO, e misturar as duas contas faria o tato depender de quantos
   * `pointermove` o navegador entregou.
   */
  addOrbitDelta(dx: number, dy: number) {
    if (Number.isFinite(dx)) this.entrada.volta += dx * ARRASTO_RAD_POR_PX;
    if (Number.isFinite(dy)) this.entrada.altura += dy * ARRASTO_RAD_POR_PX;
  }

  /**
   * O GIRO DO QUADRO — a caixa de entrada passada pelo filtro da inércia
   * e somada na órbita. Roda no `apply`, que é quem tem `dt`, ANTES de a
   * pose ser escrita.
   *
   * O FILTRO, e ele é as duas metades do tato de uma vez
   * (`SUAVIZACAO_DO_GIRO`): enquanto o dedo anda, o degrau bruto de cada
   * evento chega diluído (fim do serrilhado a 40 fps); quando ele solta,
   * a caixa fica vazia e o resto decai sozinho — o giro MORRE MACIO.
   *
   * SEM RELÓGIO NÃO HÁ FILTRO. `dt ≤ 0` quer dizer «nenhum tempo passou»
   * (o `apply` avulso do `enquadrarAgora`, e todo oráculo que escreve a
   * pose sem encenar quadros): `0,8^0 = 1` engoliria a caixa sem mover
   * nada, e o delta do visitante sumiria. Aí o passo entra INTEIRO e não
   * deixa rastro — que é, letra por letra, o que este método fazia antes
   * de existir.
   *
   * O GRAMPO DA INCLINAÇÃO MORREU AQUI, e com ele a "borracha" que todo
   * controle mal grampeado tem: não há mais faixa a estourar, porque
   * não há mais coordenada. O passo do quadro vira uma rotação e a
   * rotação sempre cabe.
   */
  private consumirOGiro(dt: number) {
    const entradaAltura = this.entrada.altura;
    const entradaVolta = this.entrada.volta;
    this.entrada.altura = 0;
    this.entrada.volta = 0;
    let passoAltura: number;
    let passoVolta: number;
    if (dt > 0) {
      const quadros = dt * 60;
      const k = SUAVIZACAO_DO_GIRO ** quadros;
      const morto = GIRO_MORTO_RAD * quadros;
      passoAltura = entradaAltura * (1 - k) + this.suav.altura * k;
      passoVolta = entradaVolta * (1 - k) + this.suav.volta * k;
      // MORTO ZERA DE VEZ: sem o corte o exponencial nunca chega a zero e
      // sobra um tremor de float reescrevendo a pose para sempre
      if (Math.abs(passoAltura) < morto) passoAltura = 0;
      if (Math.abs(passoVolta) < morto) passoVolta = 0;
      this.suav.altura = passoAltura;
      this.suav.volta = passoVolta;
    } else {
      passoAltura = entradaAltura + this.suav.altura;
      passoVolta = entradaVolta + this.suav.volta;
      this.suav.altura = 0;
      this.suav.volta = 0;
    }
    // NADA A FAZER é nada a ESCREVER: a pose parada não toca no
    // quaternion, e é por construção que ela fica bit a bit igual à de
    // antes deste filtro existir (a condição de nascimento do item 102)
    if (passoAltura === 0 && passoVolta === 0) return;
    // O ARRASTO DE VERDADE CANCELA O ENDIREITAR: a vontade do visitante
    // ganha da animação que ele interrompeu, e deixar as duas somarem
    // faria a bússola brigar com o dedo no mesmo quadro.
    this.endireitando.total = 0;
    // O FREIO PERTO DO SOLO entra AQUI, no consumo, e nos DOIS eixos: o
    // que ele muda é quanto do gesto chega ao giro, não quanto tempo a
    // inércia dura (`suav` decai pelo relógio, não pela altura).
    const freio = this.freioDoSolo;
    // ---- E AQUI O PAR DE NÚMEROS VIRA UMA ROTAÇÃO ----
    //
    // NÃO HÁ MAIS FAIXA, NEM GRAMPO, NEM `enrolar` — e a ausência é a
    // obra (item 102, 26/08): *"sem travas para qualquer dos lados sem
    // nenhum limitador de angulo"*. Não sobrou coordenada a aparar.
    //
    // UM ÚNICO EIXO, e não dois giros em sequência: o par (vertical,
    // horizontal) é um vetor no plano da TELA, e a rotação que ele pede
    // é em torno do eixo perpendicular a ele — `x` da tela para o
    // arrasto vertical, `y` para o horizontal, e a diagonal exatamente
    // no meio. Compor duas rotações em ordem daria um resultado que
    // depende de qual vem primeiro, e um arrasto na diagonal não tem
    // primeiro. Assim o gesto é o mesmo em qualquer direção — que é
    // metade da palavra "responsividade".
    //
    // OS SINAIS SÃO OS DE SEMPRE, a superfície seguindo o dedo: girar
    // `+altura` em torno de `x` levaria a mira para BAIXO da tela, e o
    // que se quer é o alvo descendo com o dedo, logo a câmera subindo —
    // daí os dois negativos. `addOrbitDelta` documenta a lei; a bancada
    // a cobra contra a matriz REAL da câmera, não contra esta fórmula.
    const emX = -passoAltura * freio;
    const emY = -passoVolta * freio;
    const angulo = Math.hypot(emX, emY);
    if (!(angulo > 0)) return;
    _eixoDaTela.set(emX / angulo, emY / angulo, 0);
    _passoDoGiro.setFromAxisAngle(_eixoDaTela, angulo);
    // PÓS-MULTIPLICAR é o que faz o eixo ser o da tela DE AGORA: o giro
    // mora no frame de repouso, e `Q·R(e)` gira em torno de `Q·e` — o
    // eixo canônico transportado para a pose corrente. Pré-multiplicar
    // giraria em torno do eixo da tela PARADA, e o dedo deixaria de
    // bater 1:1 assim que a câmera saísse do repouso.
    this.giro.multiply(_passoDoGiro).normalize();
  }

  /** o dedo largou e a inércia acabou: nada mais a girar neste alvo */
  private esquecerOGiro() {
    this.entrada.altura = 0;
    this.entrada.volta = 0;
    this.suav.altura = 0;
    this.suav.volta = 0;
    this.endireitando.total = 0;
  }

  /**
   * A DIREÇÃO DE REPOUSO deste enquadramento — a pose que a casa daria
   * sem dedo nenhum. Um lugar só para a pergunta, porque quatro
   * caminhos a fazem (o `apply`, o `selecionar`, o `pousar` e a
   * bússola) e uma segunda cópia dela seria a segunda fonte de verdade
   * que a regra 4 proíbe.
   *
   * O DEGRAU "LUA" tem lei própria (`direcaoDaLua`, a mistura que põe o
   * pai no quadro), e é só aqui que a diferença mora.
   */
  private repousoDe(
    eixoDe: THREE.Vector3,
    alvo: THREE.Vector3,
    pai: THREE.Vector3 | null,
    polo: THREE.Vector3,
    out: THREE.Vector3
  ): THREE.Vector3 {
    if (pai) {
      return direcaoDaLua(
        out.copy(eixoDe).sub(ORIGEM),
        _dirPai.copy(alvo).sub(pai),
        polo,
        out
      );
    }
    return direcaoDeRepouso(out.copy(eixoDe).sub(ORIGEM), polo, out);
  }

  /**
   * QUANTO O HORIZONTE ESTÁ TORTO, em radianos com sinal — o desvio
   * entre o alto da tela de agora e o alto que a casa daria nesta mesma
   * pose (`desvioDaOrientacao`). É o que a bússola do HUD mede.
   *
   * RECOMPOSTA DO ESTADO, e não lida da câmera: o rig é o dono da pose,
   * e perguntar à câmera obrigaria a passá-la aqui — além de responder
   * errado no meio de uma rampa de degrau, que é pose de transição e
   * não a que o visitante escolheu.
   */
  get desvioDoHorizonte(): number {
    this.repousoDe(this.eixoDe, this.alvo, this.pai, this.polo, _dirAgora);
    poseDoVisitante(_dirAgora, this.polo, this.giro, _dirAgora, _upAgora);
    return desvioDaOrientacao(_dirAgora, _upAgora, this.polo);
  }

  /** a bússola está acesa? — com histerese, ver `atualizarBussola` */
  get horizonteTorto(): boolean {
    return this.torto;
  }

  /**
   * O QUANTO O DEDO JÁ GIROU, em radianos — a leitura de INSTRUMENTO.
   * Quem a consome é o `atlas-smoke`, que a amostra por quadro para
   * medir o rastro da inércia (prova 21): o acumulador é privado, e sem
   * uma leitura declarada a prova teria de espiar campo interno pelo
   * `window.__director` — que é o tipo de dependência que quebra calada
   * na primeira renomeação.
   *
   * POR `atan2` E NUNCA POR `acos` — a mesma lei que o resto desta casa
   * já declara duas vezes. `Quaternion.angleTo` usa `acos` e perde
   * METADE dos dígitos perto da identidade: ele relata 3e-8 para um
   * giro que está a 1e-16 dela, e a prova que mede "o dedo curto não
   * girou nada" leria ruído como movimento.
   */
  get anguloDoGiro(): number {
    const imaginario = Math.hypot(this.giro.x, this.giro.y, this.giro.z);
    return 2 * Math.atan2(imaginario, Math.abs(this.giro.w));
  }

  /**
   * ENDIREITA O HORIZONTE — o botão de bússola, a sugestão que ele
   * aceitou em 26/08: *"podemos colocar um botao de zerar orientacao,
   * assim como o google maps tem um botao de norte"*.
   *
   * SÓ O ROLL, e é a lei do botão de norte: o Google Maps acerta a
   * bússola sem teletransportar o mapa. Aqui é a mesma promessa — a
   * mira não anda um milirradiano, e o que gira é o alto da tela. Quem
   * virou o planeta de cabeça para baixo continua vendo o mesmo pedaço
   * dele, agora de pé.
   *
   * EM RAMPA E NÃO EM SALTO (`ENDIREITAR_S`): a imagem girando meia
   * volta num quadro é exatamente o "girou sozinho" que o item 102 veio
   * matar — fazê-lo de propósito não o torna menos tonto.
   */
  endireitar() {
    const desvio = this.desvioDoHorizonte;
    if (!Number.isFinite(desvio) || desvio === 0) return;
    // o alvo é ZERAR o desvio, então o que se aplica é o negativo dele
    this.endireitando.total = -desvio;
    this.endireitando.t = 0;
    this.endireitando.feito = 0;
  }

  /**
   * O QUADRO DO ENDIREITAR — aplica só o PEDAÇO que falta desde o
   * quadro anterior, em torno da mira.
   *
   * POR DIFERENÇA, e não escrevendo a pose de destino: assim a rampa
   * convive com tudo o mais que mexe no giro no mesmo quadro, e
   * cancelá-la no meio (o que `consumirOGiro` faz quando o dedo anda)
   * deixa a câmera exatamente onde a rampa a tinha levado, sem
   * pulo para trás.
   *
   * O EIXO É `z` DO FRAME DE REPOUSO — a mira. Pós-multiplicar gira em
   * torno da mira DE AGORA (`Q·e_z`), que é a mesma identidade que faz
   * o arrasto girar em torno dos eixos da tela de agora.
   */
  private consumirOEndireitar(dt: number) {
    const passo = this.endireitando;
    if (passo.total === 0) return;
    if (!(dt > 0)) {
      // sem relógio não há rampa: o oráculo que escreve a pose sem
      // encenar quadros recebe o endireitar INTEIRO e sem rastro — a
      // mesma lei do filtro da inércia
      _passoDoGiro.setFromAxisAngle(_EIXO_DA_MIRA, passo.total - passo.feito);
      this.giro.multiply(_passoDoGiro).normalize();
      passo.total = 0;
      return;
    }
    passo.t = Math.min(1, passo.t + dt / ENDIREITAR_S);
    // o mesmo smoothstep de toda rampa da casa (C¹ nas duas bordas)
    const k = passo.t * passo.t * (3 - 2 * passo.t);
    const alvo = passo.total * k;
    const delta = alvo - passo.feito;
    passo.feito = alvo;
    if (delta !== 0) {
      _passoDoGiro.setFromAxisAngle(_EIXO_DA_MIRA, delta);
      this.giro.multiply(_passoDoGiro).normalize();
    }
    if (passo.t >= 1) passo.total = 0;
  }

  /**
   * A BÚSSOLA ACENDE OU APAGA — com HISTERESE, e ela não é capricho: o
   * desvio anda continuamente com o dedo, e um limiar único faria o
   * botão piscar em volta dele a cada quadro do gesto. Acende em
   * `DESVIO_QUE_ACENDE_GRAUS`, apaga em `DESVIO_QUE_APAGA_GRAUS`, e a
   * distância entre os dois é a largura da histerese.
   *
   * ENQUANTO ELA ENDIREITA O BOTÃO FICA ACESO, qualquer que seja o
   * desvio do quadro: ele é o alvo que o clique acabou de mirar, e
   * vê-lo sumir no meio da própria rampa leria como se o clique tivesse
   * falhado.
   */
  private atualizarBussola() {
    if (this.endireitando.total !== 0) {
      this.torto = true;
      return;
    }
    const graus = Math.abs(this.desvioDoHorizonte) / GRAU;
    if (this.torto) {
      if (graus < DESVIO_QUE_APAGA_GRAUS) this.torto = false;
    } else if (graus > DESVIO_QUE_ACENDE_GRAUS) {
      this.torto = true;
    }
  }

  /**
   * Escreve a câmera do quadro. Chamada do MESMO ponto do tick em que
   * a JourneyRig escreve a dela — inclusive o `fov`, que aqui é o pino
   * `ATLAS_FOV_GRAUS` e não o resíduo amortecido do shot anterior.
   *
   * `fatorUi` e `larguraPx` chegam de fora (o Director lê os dois
   * números vivos) para o rig continuar sem saber que existe DOM: texto
   * maior ⇒ HUD mais alto ⇒ retângulo útil menor ⇒ câmera um pouco mais
   * atrás; janela mais estreita ⇒ a barra quebra ⇒ o mesmo efeito.
   */
  apply(
    camera: THREE.PerspectiveCamera,
    fatorUi = 1,
    larguraPx = LARGURA_DE_MESA_PX,
    dt = 0
  ) {
    // O GIRO DO VISITANTE ENTRA AQUI, filtrado pela inércia — antes de
    // qualquer pose ser escrita, e nos dois caminhos (com rampa e sem),
    // porque arrastar durante uma troca de degrau é gesto como outro
    // qualquer e o destino da rampa tem de já contá-lo.
    this.consumirOGiro(dt);
    // ...e a rampa da bússola, DEPOIS dele: um arrasto no mesmo quadro
    // cancela o endireitar (`consumirOGiro` zera a rampa), e a ordem
    // inversa deixaria o pedaço deste quadro passar antes do cancelamento
    this.consumirOEndireitar(dt);
    this.atualizarBussola();
    if (this.rampaT >= 1) {
      // o caminho de SEMPRE, intocado bit a bit quando não há pino — é o
      // que as provas de idempotência (?foco) e os md5 do atlas-smoke
      // medem, e `distanciaPinada` nasce `null` em todo foco
      this.registrarEnquadramento(
        this.escreverPose(
          camera, fatorUi, larguraPx,
          this.alvo, this.raio, this.eixoDe, this.pai, this.giro, this.polo,
          this.distanciaPinada
        )
      );
      return;
    }

    // a rampa entre degraus: poses dos dois enquadramentos, interpoladas
    this.rampaT = Math.min(
      1,
      this.rampaT + (Number.isFinite(dt) ? Math.max(dt, 0) : 0) / this.rampaDuracaoS
    );
    const t = this.rampaT;
    // o mesmo smoothstep de toda rampa da casa (C¹ nas duas bordas)
    const k = t * t * (3 - 2 * t);

    this.registrarEnquadramento(
      this.escreverPose(
        camera, fatorUi, larguraPx,
        this.alvo, this.raio, this.eixoDe, this.pai, this.giro, this.polo,
        this.distanciaPinada
      )
    );
    _posDestino.copy(camera.position);
    _quatDestino.copy(camera.quaternion);
    this.escreverPose(
      camera, fatorUi, larguraPx,
      this.partida.alvo, this.partida.raio, this.partida.eixoDe,
      this.partida.temPai ? this.partida.pai : null, this.partida.giro,
      this.partida.polo, this.partida.distancia
    );
    _posPartida.copy(camera.position);
    _quatPartida.copy(camera.quaternion);

    // posição: direção em torno do ALVO NOVO interpolada e distância em
    // LOG — órbita→corpo atravessa 3+ ordens de grandeza, e a distância
    // linear gastaria a rampa inteira parada e saltaria no fim
    _dirA.copy(_posPartida).sub(this.alvo);
    _dirB.copy(_posDestino).sub(this.alvo);
    const dA = Math.max(_dirA.length(), 1e-30);
    const dB = Math.max(_dirB.length(), 1e-30);
    _dirA.multiplyScalar(1 / dA);
    _dirB.multiplyScalar(1 / dB);
    _dir.lerpVectors(_dirA, _dirB, k);
    if (_dir.lengthSq() < 1e-12) _dir.copy(_dirB);
    _dir.normalize();
    const d = Math.exp((1 - k) * Math.log(dA) + k * Math.log(dB));
    camera.position.copy(this.alvo).addScaledVector(_dir, d);
    camera.quaternion.slerpQuaternions(_quatPartida, _quatDestino, k);
    camera.fov = ATLAS_FOV_GRAUS;
    camera.updateProjectionMatrix();
  }

  /**
   * Guarda a régua do quadro: a distância PURA do enquadramento e o
   * fator `distância/raio` que a lente e o HUD produziram. É de onde o
   * piso e o teto do zoom saem sem o rig ter de conhecer DOM fora do
   * `apply`.
   */
  private registrarEnquadramento(pura: number) {
    this.distanciaEnquadrada = pura;
    this.fatorDeEnquadramento = this.raio > 0 ? pura / this.raio : 0;
  }

  /**
   * A pose PURA de um enquadramento — o corpo do `apply` de sempre.
   * Devolve a distância que a CONTA pede (não a que foi escrita): é ela
   * a régua do zoom, e ela não muda quando o visitante pina.
   *
   * `pinada` substitui a distância na hora de pôr a câmera, e SÓ ela: a
   * direção, o `up` e os dois giros de recentragem do HUD continuam os
   * do enquadramento. Zoom é dolly puro sobre o mesmo eixo — é isso que
   * mantém o alvo no mesmo ponto da tela enquanto a roda anda.
   */
  private escreverPose(
    camera: THREE.PerspectiveCamera,
    fatorUi: number,
    larguraPx: number,
    alvo: THREE.Vector3,
    raio: number,
    eixoDe: THREE.Vector3,
    pai: THREE.Vector3 | null,
    giro: THREE.Quaternion,
    polo: THREE.Vector3,
    pinada: number | null = null
  ): number {
    const { distancia, giroY, giroX } = enquadrar({
      rAlvo: raio,
      fovDeg: ATLAS_FOV_GRAUS,
      aspect: camera.aspect,
      retanguloUtil: retanguloUtilDoAtlas(fatorUi, larguraPx),
    });
    // o MESMO polo governa a pose de repouso e o alto da tela: se a
    // inclinação subisse rumo a um polo e a tela mostrasse outro, o
    // arrasto vertical deixaria de ser vertical na tela
    this.repousoDe(eixoDe, alvo, pai, polo, _dir);
    // ...e o dedo gira a pose INTEIRA — mira e alto da tela pela mesma
    // rotação. É o corpo rígido do item 102: o `up` não é mais
    // recalculado depois do giro, senão a cedência o reescreveria no
    // meio do gesto e a tela rodaria sozinha.
    poseDoVisitante(_dir, polo, giro, _dir, _up);
    const escrita = pinada !== null && Number.isFinite(pinada) && pinada > 0
      ? pinada
      : distancia;
    camera.position.copy(alvo).addScaledVector(_dir, escrita);
    camera.up.copy(_up);
    camera.lookAt(alvo);
    if (giroY !== 0) camera.rotateY(giroY);
    if (giroX !== 0) camera.rotateX(giroX);
    camera.fov = ATLAS_FOV_GRAUS;
    camera.updateProjectionMatrix();
    return distancia;
  }
}
