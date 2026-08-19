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
  degrauValido,
  estadoDoTempo,
  grampearJd,
  taxaDoDegrau,
  DEGRAUS_DE_TEMPO,
} from '../tempoDoAtlas';
import type { EstadoDoTempo, FaseDaEfemeride, SentidoDoTempo } from '../tempoDoAtlas';
import { dateToTDB } from '../../lib/atlas/time';
import { EPOCA_JD_TDB } from '../world/planetas/retrato2026';
import type { FonteDeEfemerides } from '../world/planetas/planetas';
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
 * De quanto em quanto tempo o mostrador do tempo é publicado para o
 * React enquanto o relógio anda, em segundos. Mesmo remédio da linha de
 * rumo (`updateDest`, 4 Hz): sem ele um `setState` por quadro
 * re-renderizaria o HUD inteiro 60×/s durante toda a viagem no tempo.
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
  efemeride: FonteDeEfemerides | null = null;
  faseDaEfemeride: FaseDaEfemeride = 'retrato';
  /** acumuladores do passo do AO VIVO e do mostrador */
  private relogioAoVivo = 0;
  private mostradorTimer = 0;
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

  /** o mostrador sai agora, e o relógio do mostrador recomeça */
  publicarTempo() {
    this.mostradorTimer = 0;
    this.fios.onTempo(this.tempo);
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
