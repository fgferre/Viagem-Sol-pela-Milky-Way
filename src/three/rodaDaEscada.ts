// ============================================================
// A RODA DA ESCADA — o `wheel` do Atlas, traduzido em DEGRAUS.
//
// O DEFEITO QUE ELA FECHA (auditoria de 2026-08-12, varredura em todo
// o `src/`): nenhuma linha do Atlas tratava `wheel`, nenhuma tratava
// `ctrlKey` — que é como a pinça do trackpad de Mac chega ao navegador
// — e nenhuma tratava `deltaMode`. O único tratador de roda do projeto
// é o do voo livre (`cinematic/cameraRig.ts`), e ele desiste quando o
// rig está desligado, que é exatamente o caso do Atlas. Rolar dois
// dedos não produzia movimento NEM aviso.
//
// POR QUE DEGRAU E NÃO ZOOM CONTÍNUO, que é o que a roda faz em toda
// fonte consultada (SpaceEngine, Celestia, Stellarium, three.js): o
// Atlas não tem distância de câmera para guardar. Ele tem a ESCADA
// (sistema → órbita → corpo → lua), e o degrau já vive na URL como
// `?ver=` — o link copiado reproduz a vista. Uma distância contínua
// não viveria ali, e a primeira coisa que o visitante faria com a roda
// seria produzir uma vista que o link dele não sabe contar. O
// precedente do degrau é documentado: o Stellarium tem duas teclas
// (`/` e `\`) que aproximam e afastam pela hierarquia, e o SpaceEngine
// tem o `G`. A rolagem TRAVADA na página — o `preventDefault` que o
// Director faz — é o padrão de Blender, Maya, SketchUp e three.js.
//
// A MÁQUINA É PURA E VIVE FORA DO DIRECTOR pelo mesmo motivo do
// `arrastoDePonteiro`: o que decide se um embalo de trackpad vale um
// degrau ou três é lógica com estado e limiar, e lógica com estado e
// limiar precisa de bancada. Aqui ela recebe números e devolve
// −1 / 0 / +1; quem sabe o que é "descer" é o Director.
// ============================================================

/**
 * O que um `deltaMode = 1` (LINHA) vale em pixels. 16 px é a altura de
 * linha padrão de um navegador de mesa (1rem a 16 px), e é o número que
 * o Firefox — o único navegador de mesa que ainda reporta em linha —
 * multiplica: um estalo de roda lá é `deltaY = 3` em modo linha, ou
 * seja 48 px. Não é um chute de conversão: é a régua que faz o mesmo
 * estalo valer o mesmo degrau em qualquer navegador (ver
 * `LIMIAR_DO_DEGRAU_PX`).
 */
export const LINHA_EM_PX = 16;

/**
 * Quanto o dedo (ou a roda) tem de somar, em pixels normalizados, para
 * a escada andar um degrau.
 *
 * O NÚMERO SAI DOS DOIS ESTALOS QUE EXISTEM, não de gosto: em Chrome e
 * Safari um estalo de roda chega como `deltaY = 100` em modo PIXEL; no
 * Firefox chega como `deltaY = 3` em modo LINHA, que são 48 px pela
 * régua acima. 40 fica abaixo dos dois — então UM estalo é UM degrau em
 * qualquer navegador — e acima do ruído de um dedo apenas apoiado no
 * trackpad, que produz eventos de 1 a 3 px.
 */
export const LIMIAR_DO_DEGRAU_PX = 40;

/**
 * A TRAVA, em milissegundos. O trackpad não manda um evento por gesto:
 * manda dezenas, e depois continua mandando o EMBALO (a inércia que o
 * sistema simula depois que o dedo já saiu). Sem trava, um único
 * empurrão desceria a escada inteira — sistema → órbita → corpo → lua —
 * antes de o visitante entender o que aconteceu.
 *
 * 300 ms é a duração da rampa entre degraus (`RAMPA_DO_DEGRAU_S`, 0,5 s)
 * pela metade mais um pouco: o degrau seguinte só pode ser pedido com a
 * transição do anterior já bem encaminhada, senão o que o visitante vê
 * é um borrão de três enquadramentos e não uma escada. E o que chega
 * DENTRO da trava não fica guardado — é ZERADO —, senão o embalo
 * ressurgiria em degrau assim que ela expirasse, que é o defeito que
 * ela existe para impedir.
 */
export const TRAVA_DO_DEGRAU_MS = 300;

/**
 * Depois de quanto tempo parado o acumulado é ESQUECIDO. Um dedo que
 * andou 20 px e desistiu não pode acordar meio minuto depois e virar
 * degrau junto com os 20 px seguintes: gesto interrompido é gesto que
 * não houve. Meio segundo é folgado para o intervalo entre eventos de
 * um mesmo gesto (o trackpad manda a ~60 Hz) e curto para a memória de
 * um gesto abandonado.
 */
export const ESQUECIMENTO_MS = 500;

/** O que chega do navegador — só os três campos que decidem. */
export interface GiroDeRoda {
  deltaY: number;
  /** 0 = pixel, 1 = linha, 2 = página. */
  deltaMode: number;
  /** A PINÇA DO TRACKPAD chega assim: `wheel` com `ctrlKey` ligado. */
  ctrlKey: boolean;
}

/**
 * O delta em PIXELS, seja qual for a unidade em que ele veio. Sem esta
 * conversão o mesmo gesto vale 100 num navegador e 3 no outro, e
 * qualquer limiar em pixels vira um limiar que só funciona em Chrome.
 *
 * `alturaDaPaginaPx` só entra no modo PÁGINA (2), que é raro e vem de
 * roda de mouse com "rolar por tela" ligado no sistema: ali um evento
 * vale uma tela inteira.
 */
export function deltaEmPixels(
  giro: GiroDeRoda,
  alturaDaPaginaPx: number
): number {
  const dy = Number.isFinite(giro.deltaY) ? giro.deltaY : 0;
  if (giro.deltaMode === 1) return dy * LINHA_EM_PX;
  if (giro.deltaMode === 2) {
    const h =
      Number.isFinite(alturaDaPaginaPx) && alturaDaPaginaPx > 0
        ? alturaDaPaginaPx
        : 800;
    return dy * h;
  }
  return dy;
}

/**
 * O passo que a escada deve dar: −1 desce um degrau (aproximar), +1
 * sobe um (afastar), 0 é "ainda não".
 *
 * O SINAL É O DA CASA E O DE TODO MUNDO: `deltaY < 0` é a roda para
 * cima e a pinça abrindo, e as duas querem dizer APROXIMAR — é o que
 * fazem os `OrbitControls` do three, o Stellarium e o Google Maps.
 */
export type PassoDaEscada = -1 | 0 | 1;

export class RodaDaEscada {
  private acumulado = 0;
  private ultimoDegrauMs = Number.NEGATIVE_INFINITY;
  private ultimoEventoMs = Number.NEGATIVE_INFINITY;

  /**
   * Consome um evento e diz se a escada anda. `agoraMs` é o relógio
   * monotônico de quem chama (`performance.now()`); ele entra por
   * parâmetro para a bancada poder mandar o tempo andar sem esperar.
   */
  girar(giro: GiroDeRoda, agoraMs: number, alturaDaPaginaPx = 800): PassoDaEscada {
    const px = deltaEmPixels(giro, alturaDaPaginaPx);
    const agora = Number.isFinite(agoraMs) ? agoraMs : 0;

    // gesto abandonado não soma com o próximo
    if (agora - this.ultimoEventoMs > ESQUECIMENTO_MS) this.acumulado = 0;
    this.ultimoEventoMs = agora;

    // DENTRO DA TRAVA nada soma: o embalo do trackpad morre aqui, e não
    // fica guardado para ressuscitar quando ela abrir
    if (agora - this.ultimoDegrauMs < TRAVA_DO_DEGRAU_MS) {
      this.acumulado = 0;
      return 0;
    }

    // trocou de sentido: o que estava somado era do gesto anterior
    if (px !== 0 && Math.sign(px) !== Math.sign(this.acumulado)) this.acumulado = 0;
    this.acumulado += px;

    if (Math.abs(this.acumulado) < LIMIAR_DO_DEGRAU_PX) return 0;
    const passo: PassoDaEscada = this.acumulado < 0 ? -1 : 1;
    this.acumulado = 0;
    this.ultimoDegrauMs = agora;
    return passo;
  }

  /** Zera o gesto — sair da fase não pode deixar meio empurrão guardado. */
  esquecer() {
    this.acumulado = 0;
    this.ultimoDegrauMs = Number.NEGATIVE_INFINITY;
    this.ultimoEventoMs = Number.NEGATIVE_INFINITY;
  }
}
