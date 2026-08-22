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
  GRAU,
  PHASE_OFFSET_GRAUS,
  POLO_ECLIPTICO,
  direcaoDaLua,
  direcaoPrivilegiada,
  enquadrar,
  orbitaQueProduz,
  orbitaMaisExterna,
  upDoAtlas,
} from './enquadramento';
import { LARGURA_DE_MESA_PX, retanguloUtilDoAtlas } from './retanguloDoAtlas';
import type { OrbitaDoVisitante } from './enquadramento';

// A FACHADA: o retângulo útil e a matemática do enquadramento moram
// ao lado (./retanguloDoAtlas, ./enquadramento) e este arquivo os
// reexporta INTEIROS — quem sempre importou daqui segue servido, e o
// juiz de a11y continua lendo LARGURA_UTIL_MINIMA_PX deste caminho
// (a11y.mjs importa o ARQUIVO por URL no navegador).
export * from './retanguloDoAtlas';
export * from './enquadramento';

/** O Sol está na ORIGEM do mundo heliocêntrico. */
const SOL = new THREE.Vector3(0, 0, 0);

export const RAMPA_DO_DEGRAU_S = 0.5;

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

/** Ângulo de volta em (−π, π] — periódico, então o número não cresce. */
function enrolar(rad: number): number {
  if (!Number.isFinite(rad)) return 0;
  const volta = 2 * Math.PI;
  const r = rad - Math.floor(rad / volta + 0.5) * volta;
  // `floor` devolve −π quando o resto cai exatamente na borda; o
  // intervalo fechado à direita mantém a ida e a volta simétricas
  return r === -Math.PI ? Math.PI : r;
}

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
  /** o que o dedo do visitante acumulou nos dois eixos */
  private readonly orbita: OrbitaDoVisitante = { altura: 0, volta: 0 };
  /**
   * De onde sai o EIXO SOLAR quando o próprio alvo não serve para
   * defini-lo. Vale o alvo em todo enquadramento comum; na vista de
   * abertura, cujo alvo é a ORIGEM (o Sol), ele é a posição do corpo
   * mais externo — sem isso `direcaoPrivilegiada` cairia no ramo
   * degenerado (vetor nulo) e a abertura viraria uma direção arbitrária.
   */
  private readonly eixoDe = new THREE.Vector3();
  /**
   * O PAI do alvo, quando o alvo é uma LUA (degrau "lua" da escada,
   * F2b/D7): com ele presente a direção sai de `direcaoDaLua` (a
   * mistura `PARENT_FRAMING_BIAS`) em vez de `direcaoPrivilegiada`.
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
  private readonly partida = {
    alvo: new THREE.Vector3(),
    raio: 0,
    eixoDe: new THREE.Vector3(),
    pai: new THREE.Vector3(),
    temPai: false,
    orbita: { altura: 0, volta: 0 } as OrbitaDoVisitante,
    polo: POLO_ECLIPTICO.clone(),
    /** o pino de distância que a câmera MOSTRAVA no quadro da troca */
    distancia: null as number | null,
  };

  /**
   * O ENQUADRAMENTO DE ABERTURA: o SISTEMA inteiro, e a esfera dele é
   * CENTRADA NO SOL com raio igual à órbita mais externa do retrato.
   * Centrada no Sol e não no corpo: uma esfera de 35,4 UA pendurada em
   * Plutão não contém o sistema — um corpo do lado oposto da mesma
   * órbita fica a até ~71 UA do centro dela, e a promessa "quem enquadra
   * a órbita de fora enquadra tudo que está dentro" seria falsa. Com o
   * centro na origem ela é verdade por construção: toda órbita do
   * retrato cabe dentro da mais externa.
   *
   * A DIREÇÃO continua saindo do corpo (`eixoDe`), porque o alvo é a
   * origem e o eixo Sol→alvo seria nulo.
   *
   * Por que não a Terra, que seria "casa": enquadrar a órbita da Terra
   * põe a câmera a ~4 UA do Sol, e a 4 UA o Sol estoura o quadro
   * inteiro de branco — é fotometria correta (o Sol a 4 UA É ofuscante)
   * contra uma exposição de 1,02 que só a gradação por contexto da F6
   * vai saber tratar.
   *
   * O NÚMERO DA ABERTURA, num lugar só (quem mais precisar dele cita
   * esta docstring em vez de repeti-lo): com o retângulo útil vigente em
   * `ui = 1` e tela de mesa (aspecto ≥ 1, onde quem aperta é o vertical)
   * a câmera fica a **226,84 UA do Sol** — `35,4213 UA × 1,2 / sen(meia-abertura útil)`
   * (era 221,55 até a F2b: a linha da ESCADA na ContextLine cresceu a
   * faixa do topo — ver CONTEXTO_FRACAO),
   * e como o alvo é a própria origem essa distância é a distância a casa,
   * sem triângulo nenhum. Ela ANDA com o HUD e com `?ui=`: 213,37 UA em
   * `ui = 0,85`, 296,76 UA em `ui = 1,4`. O trilho de `atlasRig.test.ts`
   * deriva o número de `enquadrar()` e quebra se ele envelhecer aqui.
   */
  focarNoSistema() {
    const fora = orbitaMaisExterna();
    this.focar(SOL, fora.raio, fora.posicao);
  }

  /**
   * Foca um ponto da cena, enquadrando uma esfera de `raio` pc nele.
   * `eixoDe` é o ponto de onde sai o eixo solar — o próprio alvo, salvo
   * na abertura (ver `focarNoSistema`).
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
      // snapshot do enquadramento QUE ESTÁ NA TELA — é dele que a rampa parte
      this.partida.alvo.copy(this.alvo);
      this.partida.raio = this.raio;
      this.partida.eixoDe.copy(this.eixoDe);
      this.partida.temPai = this.pai !== null;
      if (this.pai) this.partida.pai.copy(this.pai);
      this.partida.orbita.altura = this.orbita.altura;
      this.partida.orbita.volta = this.orbita.volta;
      this.partida.polo.copy(this.polo);
      this.partida.distancia = this.distanciaPinada;
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
    this.orbita.altura = 0;
    this.orbita.volta = 0;
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
   *  3. `(altura, volta)` saem de `orbitaQueProduz` contra o eixo NOVO —
   *     a mesma pose escrita noutro referencial;
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
   * A RAMPA NÃO ENTRA: não há travessia a animar — a câmera não sai do
   * lugar. `rampaT` volta a 1 para o caso de a seleção pegar uma troca
   * de degrau no meio (aí a rampa perde, e é o certo: o gesto do
   * visitante ganha do preset que ele interrompeu).
   */
  selecionar(
    alvo: THREE.Vector3,
    raio: number,
    eixoDe: THREE.Vector3 = alvo,
    opcoes: { polo?: THREE.Vector3 | null; pisoRaio?: number | null } = {}
  ) {
    // 1. a pose de agora, no mundo
    if (this.pai) {
      direcaoDaLua(
        _dir.copy(this.eixoDe).sub(SOL),
        _dirPai.copy(this.alvo).sub(this.pai),
        this.polo,
        this.orbita,
        _dir
      );
    } else {
      direcaoPrivilegiada(_dir.copy(this.eixoDe).sub(SOL), this.polo, this.orbita, _dir);
    }
    _posPartida.copy(this.alvo).addScaledVector(_dir, this.distancia);
    // 2. o referencial novo
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
    _dirB.copy(_posPartida).sub(this.alvo);
    const distancia = _dirB.length();
    if (!(distancia > 0)) {
      // a câmera está EM CIMA do alvo novo: não há direção a preservar,
      // e o enquadramento é a única resposta honesta
      this.orbita.altura = 0;
      this.orbita.volta = 0;
      this.distanciaPinada = null;
      return;
    }
    orbitaQueProduz(
      _dirB.multiplyScalar(1 / distancia),
      _dir.copy(this.eixoDe).sub(SOL),
      this.polo,
      this.orbita
    );
    // 4. a distância vira pino, grampeada na faixa do alvo NOVO. O teto
    //    usa o `fatorDeEnquadramento` do quadro anterior — ele é da
    //    LENTE e do HUD, não do alvo, então não envelhece na troca.
    const piso = this.pisoDeZoom;
    this.distanciaPinada = THREE.MathUtils.clamp(
      distancia,
      piso,
      Math.max(piso, this.tetoDeZoom)
    );
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

  /** a rampa entre degraus ainda está andando? (a captura espera por ela) */
  get animando(): boolean {
    return this.rampaT < 1;
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

  /** PISO do zoom: `K_MIN_RAIOS` raios do alvo. Ver a constante. */
  get pisoDeZoom(): number {
    const regua =
      this.pisoRaio !== null && this.pisoRaio > 0 ? this.pisoRaio : this.raio;
    return K_MIN_RAIOS * regua;
  }

  /**
   * TETO do zoom: o enquadramento do SISTEMA INTEIRO centrado no alvo —
   * `enquadrar(raio = órbita mais externa + |alvo|)`. A soma é o que
   * torna a promessa verdadeira para um alvo fora do centro: uma esfera
   * da órbita de Plutão pendurada em Saturno não conteria o sistema.
   *
   * Com o alvo no Sol ele REDUZ ao enquadramento de abertura, que é o
   * que o Atlas já mostrava — ou seja, na vista de abertura o visitante
   * nasce NO teto e só pode aproximar. É a leitura certa: mais longe que
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
   * A RAMPA MANDA enquanto ela anda: a troca de degrau interpola poses e
   * termina EXATA na pose pura, e um pino escrito no meio dela seria uma
   * segunda mão na mesma distância. Depois de `rampaT ≥ 1` o zoom
   * escreve à vontade. Fora da faixa `[piso, teto]` o valor é grampeado,
   * nunca recusado — é o que faz o embalo da inércia parar na parede em
   * vez de sumir.
   */
  pinarDistancia(pc: number | null) {
    if (pc === null) {
      this.distanciaPinada = null;
      return;
    }
    if (this.rampaT < 1 || !Number.isFinite(pc) || pc <= 0) return;
    const piso = this.pisoDeZoom;
    const teto = Math.max(piso, this.tetoDeZoom);
    this.distanciaPinada = THREE.MathUtils.clamp(pc, piso, teto);
  }

  /**
   * ARRASTO DO PONTEIRO, os DOIS eixos — e cada um faz o que a tela
   * promete:
   *
   *  · HORIZONTAL (`dx`) dá a VOLTA no alvo, girando em torno da linha
   *    alvo→Sol. Não tem grampo porque não tem o que grampear: o giro
   *    não altera o ângulo ao Sol (a conta está em `OrbitaDoVisitante`).
   *  · VERTICAL (`dy`) sobe e desce pela INCLINAÇÃO INTEIRA, de 0° (fase
   *    cheia) a 180° (o lado escuro visto de trás). Era o cone de
   *    `MAX_SOLAR_DEVIATION_GRAUS` — 70° —, e era ele a trava de que o
   *    dono reclama no item 73: "conseguíamos… agora essa navegação está
   *    muito confusa". O par (inclinação, volta) passa a varrer a esfera
   *    inteira, e o único limite que sobra no caminho do dedo é o grampo
   *    polar de `direcaoPrivilegiada` (`MIN_POLAR_RAD`), que não é
   *    estético: é a degenerescência de `lookAt`.
   *
   * OS SINAIS SÃO OS DA SUPERFÍCIE SEGUINDO O DEDO (o "estilo Google
   * Earth" do projeto irmão), e não são gosto: com `up = polo`, a base
   * da câmera dá `direita = polo × dir` e `cima = dir × direita`, e a
   * derivada da posição sai `∂P/∂volta ∝ −direita` e
   * `∂P/∂altura ∝ +cima`. Ou seja, arrastar para a DIREITA leva a câmera
   * para a esquerda e o alvo para a direita; arrastar para BAIXO leva a
   * câmera para cima e o alvo para baixo. `atlasRig.test.ts` cobra os
   * dois sinais contra a base REAL da câmera depois do `apply` — se
   * alguém trocar um sinal aqui, o teste vê pelo eixo da matriz, não
   * pela fórmula repetida.
   *
   * A `volta` é ENROLADA em (−π, π]: o ângulo é periódico, o alcance é
   * a volta inteira de qualquer jeito, e um acumulador que só cresce
   * seria um número sem teto guardado em estado de sessão.
   */
  addOrbitDelta(dx: number, dy: number) {
    const pino = PHASE_OFFSET_GRAUS * GRAU;
    const passoX = Number.isFinite(dx) ? dx : 0;
    const passoY = Number.isFinite(dy) ? dy : 0;
    this.orbita.volta = enrolar(this.orbita.volta + passoX * ARRASTO_RAD_POR_PX);
    // o acumulador para EXATAMENTE onde a inclinação para — sem isso o
    // dedo somaria arrasto morto e a volta custaria desfazê-lo antes de
    // a câmera se mexer de novo (a "borracha" de todo controle mal
    // grampeado). A faixa é a da inclinação [0°, 180°] menos o pino.
    this.orbita.altura = THREE.MathUtils.clamp(
      this.orbita.altura + passoY * ARRASTO_RAD_POR_PX,
      -pino,
      Math.PI - pino
    );
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
    if (this.rampaT >= 1) {
      // o caminho de SEMPRE, intocado bit a bit quando não há pino — é o
      // que as provas de idempotência (?foco) e os md5 do atlas-smoke
      // medem, e `distanciaPinada` nasce `null` em todo foco
      this.registrarEnquadramento(
        this.escreverPose(
          camera, fatorUi, larguraPx,
          this.alvo, this.raio, this.eixoDe, this.pai, this.orbita, this.polo,
          this.distanciaPinada
        )
      );
      return;
    }

    // a rampa entre degraus: poses dos dois enquadramentos, interpoladas
    this.rampaT = Math.min(
      1,
      this.rampaT + (Number.isFinite(dt) ? Math.max(dt, 0) : 0) / RAMPA_DO_DEGRAU_S
    );
    const t = this.rampaT;
    // o mesmo smoothstep de toda rampa da casa (C¹ nas duas bordas)
    const k = t * t * (3 - 2 * t);

    this.registrarEnquadramento(
      this.escreverPose(
        camera, fatorUi, larguraPx,
        this.alvo, this.raio, this.eixoDe, this.pai, this.orbita, this.polo,
        this.distanciaPinada
      )
    );
    _posDestino.copy(camera.position);
    _quatDestino.copy(camera.quaternion);
    this.escreverPose(
      camera, fatorUi, larguraPx,
      this.partida.alvo, this.partida.raio, this.partida.eixoDe,
      this.partida.temPai ? this.partida.pai : null, this.partida.orbita,
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
    orbita: Readonly<OrbitaDoVisitante>,
    polo: THREE.Vector3,
    pinada: number | null = null
  ): number {
    const { distancia, giroY, giroX } = enquadrar({
      rAlvo: raio,
      fovDeg: ATLAS_FOV_GRAUS,
      aspect: camera.aspect,
      retanguloUtil: retanguloUtilDoAtlas(fatorUi, larguraPx),
    });
    // o MESMO polo governa a inclinação e o alto da tela: se a
    // inclinação subisse rumo a um polo e a tela mostrasse outro, o
    // arrasto vertical deixaria de ser vertical na tela
    if (pai) {
      direcaoDaLua(
        _dir.copy(eixoDe).sub(SOL),
        _dirPai.copy(alvo).sub(pai),
        polo,
        orbita,
        _dir
      );
    } else {
      direcaoPrivilegiada(_dir.copy(eixoDe).sub(SOL), polo, orbita, _dir);
    }
    const escrita = pinada !== null && Number.isFinite(pinada) && pinada > 0
      ? pinada
      : distancia;
    camera.position.copy(alvo).addScaledVector(_dir, escrita);
    camera.up.copy(upDoAtlas(_dir, polo, _up));
    camera.lookAt(alvo);
    if (giroY !== 0) camera.rotateY(giroY);
    if (giroX !== 0) camera.rotateX(giroX);
    camera.fov = ATLAS_FOV_GRAUS;
    camera.updateProjectionMatrix();
    return distancia;
  }
}
