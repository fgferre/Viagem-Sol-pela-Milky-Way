// ============================================================
// A MÁQUINA DO TEMPO do Atlas (F4/D2) — o instante pedido, o relógio
// (ao vivo e por degraus), a efeméride e o mostrador. Morava no
// director.ts com os campos a 2.125 linhas dos métodos (onda da
// arquitetura, Parte 1, corte 4); a semântica é a mesma, linha a
// linha. As arestas de retorno viraram fios nomeados: onTempo,
// perturbar, aoChegarFonte (o religador do enquadre), signal e
// disposed. O `get jdVivo` é novo SÓ de nome: é a conta
// `grampearJd(jdPedido)` que o director repetia em 12 lugares.
// ============================================================
import {
  contraAParede,
  degrauValido,
  estadoDoTempo,
  grampearJd,
  mesmoMostrador,
  taxaDoDegrau,
  DEGRAUS_DE_TEMPO,
} from '../tempoDoAtlas';
import type { EstadoDoTempo, FaseDaEfemeride, SentidoDoTempo } from '../tempoDoAtlas';
import { dateToTDB } from '../../lib/atlas/time';
import { EPOCA_JD_TDB } from '../world/planetas/retrato2026';
import type { MotorEfemerides } from '../../lib/atlas/efemerides';
import { carregarEfemerides } from '../config';

/**
 * De quanto em quanto tempo o modo AO VIVO relê o relógio do visitante,
 * em segundos. Um: é a resolução em que a máquina do tempo fala (o
 * mostrador é minuto a minuto) e o passo em que a camada recalcula os
 * dez corpos — reler a 60 Hz seria pagar efeméride por quadro para
 * mostrar o mesmo minuto sessenta vezes (D2).
 */
const PASSO_DO_AO_VIVO_S = 1;

/**
 * De quanto em quanto tempo o mostrador do tempo é CONFERIDO enquanto o
 * relógio anda, em segundos. Mesmo remédio da linha de rumo (`updateDest`,
 * 4 Hz): sem ele um `setState` por quadro re-renderizaria o HUD inteiro
 * 60×/s durante toda a viagem no tempo.
 *
 * CONFERIDO, não PUBLICADO — a diferença entrou em 24/08. Este passo é a
 * AMOSTRAGEM (de quanto em quanto tempo vale a pena montar o estado e
 * perguntar "mudou?"); quem decide se o React é acordado é
 * `mesmoMostrador`. Na viagem rápida o mostrador anda e as quatro
 * conferências por segundo viram quatro publicações, que é o que a viagem
 * precisa; no AO VIVO a data vira de minuto em minuto e as mesmas quatro
 * conferências viram UMA publicação por minuto.
 */
const PASSO_DO_MOSTRADOR_S = 0.25;

export class MaquinaDoTempo {
  /**
   * O instante PEDIDO, em JD TDB. Nasce na época do retrato — sem isso
   * a cena não seria a mesma de ontem no primeiro quadro. O instante
   * MOSTRADO é este grampeado na janela da tabela (`get tempo`).
   */
  jdPedido = EPOCA_JD_TDB;
  /** degrau na escada de taxas (`tempoDoAtlas`) */
  degrau = 0;
  /** sentido do relógio: 0 é parado, e parado é como o Atlas abre */
  sentidoDoTempo: SentidoDoTempo = 0;
  /** o relógio segue o tempo real do visitante */
  aoVivo = false;
  /** a fonte viva; `null` enquanto ninguém pediu, ou se a rede faltou */
  /**
   * O MOTOR, e não a fatia dele. O campo era declarado como
   * `FonteDeEfemerides` — a interface de UMA pergunta que a camada dos
   * planetas define para não depender do motor. Só que o que mora aqui É um
   * `MotorEfemerides` (é o que `carregarEfemerides` constrói), e desde o
   * item 74 a ficha do objeto precisa de outras três perguntas dele:
   * `posicao`, `velocidade` e `notaDeValidade`. Declarar o tipo verdadeiro
   * não amplia acoplamento nenhum — a interface estreita continua de pé para
   * quem só quer a posição, e `import type` some na compilação, então o
   * `import()` dinâmico de `efemerides` continua fora do bundle inicial.
   */
  efemeride: MotorEfemerides | null = null;
  faseDaEfemeride: FaseDaEfemeride = 'retrato';
  /** acumuladores do passo do AO VIVO e do mostrador */
  private relogioAoVivo = 0;
  private mostradorTimer = 0;
  /** o último estado que FOI DITO ao React — ver `publicarTempo` */
  private ultimoPublicado: EstadoDoTempo | null = null;
  /**
   * O relógio bateu na borda da tabela e PAROU ali. Uma máquina do
   * tempo honesta faz isso: a fita acaba, ela para na última volta e
   * diz. A alternativa — deixar o pedido correr para fora da janela —
   * cobraria do visitante o mesmo tempo de volta que ele gastou indo.
   */
  naParede = false;

  private readonly fios: {
    onTempo: (estado: EstadoDoTempo) => void;
    /** a contagem de estabilidade da captura recomeça */
    perturbar: () => void;
    /** F2b: o degrau vivo se reaplica quando a fonte chega */
    aoChegarFonte: () => void;
    signal: () => AbortSignal;
    disposed: () => boolean;
  };

  constructor(fios: MaquinaDoTempo['fios']) {
    this.fios = fios;
  }

  /** o instante pedido, grampeado na janela da tabela — a conta que o
   *  director repetia em 12 lugares */
  get jdVivo(): number {
    return grampearJd(this.jdPedido);
  }

  /**
   * A TAXA VIVA — quantos segundos de céu andam por segundo de relógio
   * AGORA. Relógio parado e AO VIVO valem 1 (nada anda mais devagar que
   * o real); só o degrau acelera. Quem lê é o Sol, que precisa saber que
   * o relógio corre para não fazer as regiões nascerem e morrerem em pop
   * (item 17).
   */
  get taxaViva(): number {
    return this.sentidoDoTempo !== 0 ? taxaDoDegrau(this.degrau) : 1;
  }

  /**
   * O MOSTRADOR, somente leitura — como o `captura` e o `selo`. A conta
   * inteira (grampo, aviso, rótulos) mora no módulo puro; aqui só se
   * juntam os cinco campos de estado que este objeto guarda.
   */
  get tempo(): EstadoDoTempo {
    return estadoDoTempo({
      jdPedido: this.jdPedido,
      jdDaEpoca: EPOCA_JD_TDB,
      degrau: this.degrau,
      sentido: this.sentidoDoTempo,
      aoVivo: this.aoVivo,
      efemeride: this.faseDaEfemeride,
      naParede: this.naParede,
    });
  }

  /**
   * BUSCA A EFEMÉRIDE, UMA VEZ E TARDE. Quem chama são a porta `?jd=`,
   * os controles do tempo no HUD do Atlas — e a reta final do filme
   * (t≥REVEAL_T): a coda "a volta para casa" resolve a LUA, que não tem
   * retrato congelado, então o filme passou a pagar estes bytes de
   * propósito, com ~64 s de folga. O download é abortado pelo mesmo
   * signal de todo o resto.
   *
   * SEM REDE NÃO HÁ GRITO — NESTE caminho. A camada continua no retrato
   * congelado e o badge do HUD conta a verdade ao visitante — um
   * `console.error` aqui seria ruído num caminho em que a degradação é
   * o comportamento projetado. Falhou uma vez, uma segunda tentativa é
   * permitida: quem clicou de novo pediu de novo.
   *
   * A ÚNICA exceção mora no tick (item 5c da auditoria): com CORPOS em
   * cena e a fonte pedida indisponível, o RETRATO ACUSA — um aviso por
   * sessão, depois da janela de retentativa (QUADROS_TENTANDO_FONTE).
   * O juiz atlas-smoke pina exatamente esse aviso, e nada além dele.
   */
  garantirEfemerides() {
    if (this.efemeride || this.faseDaEfemeride === 'buscando') return;
    this.faseDaEfemeride = 'buscando';
    this.publicarTempo();
    carregarEfemerides(this.fios.signal())
      .then(({ motor }) => {
        if (this.fios.disposed()) return;
        this.efemeride = motor;
        this.faseDaEfemeride = 'viva';
        // o instante vai ser reescrito no tick seguinte: a imagem pode
        // mudar, e a contagem de estabilidade da captura recomeça
        this.fios.perturbar();
        this.publicarTempo();
        // F2b: o degrau vivo se reaplica com a fonte na mão — a
        // abertura vira a posição do DIA e o `?foco=lua` do boot ganha
        // a Lua que esperava (na época é bit a bit o que já estava)
        this.fios.aoChegarFonte();
      })
      .catch((error: unknown) => {
        if (this.fios.disposed()) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        this.faseDaEfemeride = 'indisponivel';
        this.publicarTempo();
      });
  }

  /**
   * ⏴ ⏸ ⏵ — o sentido em que o relógio anda. QUALQUER sentido desliga o
   * AO VIVO, inclusive o zero: os dois são modos de relógio, ter os dois
   * ligados seria o visitante disputando a data com o próprio calendário
   * — e o ⏸ diz "parar o tempo", que é parar QUALQUER relógio. Enquanto
   * o zero não desligava o AO VIVO, o botão ficava habilitado (o HUD lê
   * `sentido === 0 && !aoVivo`), o visitante o apertava e a data seguia
   * andando a 1 Hz: o rótulo prometia uma coisa e o método fazia outra.
   */
  andarNoTempo(sentido: SentidoDoTempo) {
    // O PEDIDO CONTRA A PAREDE NÃO ACONTECE (item 115). Limpar
    // `naParede` sem olhar o sentido fazia o ⏵ piscar na borda da
    // tabela: este aperto publicava um quadro de mentira — o aviso
    // sumia, o botão virava ⏸ —, e no quadro seguinte `andarORelogio`
    // grampeava, repunha a parede e devolvia o ⏵. Toda vez. Aqui o
    // estado ASSENTA: o relógio fica parado, o aviso continua, e o que
    // muda é só o AO VIVO, que qualquer sentido desliga. Andar para o
    // outro lado segue livre — quem está no fim volta quando quiser.
    if (contraAParede(this.jdPedido, sentido)) {
      this.sentidoDoTempo = 0;
      this.naParede = true;
      this.aoVivo = false;
      this.publicarTempo();
      return;
    }
    this.sentidoDoTempo = sentido;
    this.naParede = false;
    this.aoVivo = false;
    if (sentido !== 0) this.garantirEfemerides();
    this.fios.perturbar();
    this.publicarTempo();
  }

  /** o próximo degrau da escada, dando a volta — precedente do `1×/2×/4×` */
  ciclarDegrau(): number {
    this.degrau = degrauValido((this.degrau + 1) % DEGRAUS_DE_TEMPO);
    this.garantirEfemerides();
    // troca de taxa muda o que a tela vai mostrar no quadro seguinte
    this.fios.perturbar();
    this.publicarTempo();
    return this.degrau;
  }

  /**
   * AO VIVO: o céu no instante em que o visitante está. A data sai do
   * conversor único da casa (`dateToTDB`, regra M6) — nunca de uma
   * conta de milissegundos aqui dentro.
   */
  alternarAoVivo() {
    this.aoVivo = !this.aoVivo;
    this.naParede = false;
    if (this.aoVivo) {
      this.sentidoDoTempo = 0;
      this.relogioAoVivo = PASSO_DO_AO_VIVO_S; // o primeiro tick já lê o relógio
      this.garantirEfemerides();
    }
    this.fios.perturbar();
    this.publicarTempo();
  }

  /**
   * VOLTAR À ÉPOCA — o retrato congelado de 2026, que é o que a cena
   * mostra quando ninguém mexeu em nada. Não busca efeméride nenhuma:
   * se ela nunca chegou, a camada já está exatamente aqui.
   */
  voltarAEpoca() {
    this.jdPedido = EPOCA_JD_TDB;
    this.sentidoDoTempo = 0;
    this.aoVivo = false;
    this.naParede = false;
    this.fios.perturbar();
    this.publicarTempo();
  }

  /**
   * O mostrador sai agora SE tiver o que dizer, e o relógio do mostrador
   * recomeça de qualquer jeito.
   *
   * A GUARDA (24/08): publicar é acordar o React no RAIZ — `onTempo` é
   * `setTempo` no `App`, e o App re-renderiza o HUD inteiro. Enquanto o
   * relógio anda AO VIVO isso acontecia 4×/s para dizer exatamente a mesma
   * coisa, porque a data tem resolução de minuto. Agora quem não mudou não
   * fala. Ver `mesmoMostrador` (`tempoDoAtlas`) para o que conta como
   * "mudou" — e por que o `jd` não conta.
   *
   * NÃO É CACHE E NÃO É SEGUNDA VERDADE: `this.tempo` continua sendo
   * calculado na leitura e continua sendo a fonte única. O que se guarda
   * aqui é só a lembrança do que já foi DITO, para não repetir.
   */
  publicarTempo() {
    this.mostradorTimer = 0;
    const agora = this.tempo;
    if (this.ultimoPublicado && mesmoMostrador(this.ultimoPublicado, agora)) return;
    this.ultimoPublicado = agora;
    this.fios.onTempo(agora);
  }

  /**
   * O RELÓGIO, um passo. Fora de qualquer movimento no tempo o método
   * inteiro é um teste falso — o filme não paga por ele.
   *
   * O grampo PARA na borda em vez de deixar o pedido correr para fora:
   * ver `naParede`. O AO VIVO relê o calendário a 1 Hz (D2), que é a
   * resolução em que o mostrador fala.
   */
  andarORelogio(dt: number) {
    if (!this.aoVivo && this.sentidoDoTempo === 0) return;
    if (this.aoVivo) {
      this.relogioAoVivo += dt;
      if (this.relogioAoVivo >= PASSO_DO_AO_VIVO_S) {
        this.relogioAoVivo = 0;
        const agora = dateToTDB(new Date());
        const grampeado = grampearJd(agora);
        this.naParede = grampeado !== agora;
        this.jdPedido = grampeado;
      }
    } else {
      const bruto =
        this.jdPedido + (this.sentidoDoTempo * taxaDoDegrau(this.degrau) * dt) / 86400;
      const grampeado = grampearJd(bruto);
      this.jdPedido = grampeado;
      if (grampeado !== bruto) {
        this.naParede = true;
        this.sentidoDoTempo = 0;
        this.publicarTempo();
        return;
      }
    }
    this.mostradorTimer += dt;
    if (this.mostradorTimer >= PASSO_DO_MOSTRADOR_S) this.publicarTempo();
  }
}
