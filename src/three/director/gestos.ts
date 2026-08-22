// ============================================================
// OS GESTOS DO CANVAS — o pausar-e-olhar, a órbita do Atlas, o clique
// de focar, a roda/pinça do zoom e o menu de contexto morto. Morava
// no director.ts (onda da arquitetura, Parte 1, corte 6); a semântica
// é a mesma, linha a linha. As duas máquinas de gesto
// (ArrastoDePonteiro, ZoomDaRoda) moram AQUI — quem precisa esquecer
// a roda na troca de fase usa o punho devolvido.
// ============================================================
import { ArrastoDePonteiro } from '../arrastoDePonteiro';
import { ZoomDaRoda } from '../zoomDaRoda';

export interface FiosDosGestos {
  /** viagem congelada — arrastar olha ao redor */
  pauseLookAtivo: () => boolean;
  /** a fase é 'atlas' — arrastar orbita, clique curto foca, roda dá zoom */
  noAtlas: () => boolean;
  /** atlas.addOrbitDelta + perturbar (a captura recomeça) */
  orbitar: (dx: number, dy: number) => void;
  /** rig.addLookDelta do pausar-e-olhar */
  olhar: (dx: number, dy: number) => void;
  /** clique curto no Atlas: focar o nome mais próximo (frações de tela) */
  focar: (x: number, y: number) => void;
  /**
   * ZOOM CONTÍNUO (item 73): estalos fracionários deste quadro —
   * negativo aproxima, positivo afasta. Quem os converte em distância é
   * o rig, que é quem sabe o piso e o teto do alvo.
   */
  zoom: (estalos: number) => void;
}

/**
 * Liga os gestos no canvas e devolve o punho: `desligar()` (o teardown
 * — remove tudo e esquece o arrasto, porque o HMR do vite chama o
 * dispose a cada salvamento e gesto vivo de uma sessão morta não pode
 * sobreviver ao próprio Director) e `esquecerRoda()` (a troca de fase
 * encerra o gesto da roda: meio empurrão guardado não pode virar
 * degrau na próxima entrada no Atlas).
 */
export function ligarGestos(canvas: HTMLCanvasElement, fios: FiosDosGestos) {
  const arrasto = new ArrastoDePonteiro();
  const roda = new ZoomDaRoda();

  /**
   * Os MESMOS listeners servem o Atlas — arrastar orbita o alvo, clique
   * curto foca o nome mais próximo. Registrar um segundo conjunto para
   * a fase nova compraria dois donos do mesmo gesto no mesmo canvas; o
   * dono muda com a fase, o listener não.
   */
  const onPointerDown = (event: PointerEvent) => {
    if (!fios.pauseLookAtivo() && !fios.noAtlas()) return;
    arrasto.comecar(event, performance.now());
  };

  const onPointerMove = (event: PointerEvent) => {
    // o passo vem `null` para qualquer ponteiro que não seja o dono do
    // gesto: é ISSO que impede o segundo dedo de girar 25° medido
    // contra a última posição do primeiro (ver `arrastoDePonteiro.ts`)
    const passo = arrasto.mover(event);
    if (!passo) return;
    if (fios.noAtlas()) {
      // OS DOIS EIXOS (Onda 7): o `dy` era calculado e jogado fora — a
      // dica prometia "girar em torno do alvo" e o que existia era uma
      // subida em latitude. Agora a horizontal dá a volta e a vertical
      // sobe e desce, cada uma no seu eixo (ver `addOrbitDelta`).
      fios.orbitar(passo.dx, passo.dy);
    } else if (fios.pauseLookAtivo()) {
      fios.olhar(passo.dx, passo.dy);
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    // clique curto e parado no Atlas = focar. Os dois limiares (6 px,
    // 400 ms) são os do voo livre, não números novos — hoje moram em
    // `CLIQUE_PX`/`CLIQUE_MS`, um lugar só para os dois gestos.
    const curto = arrasto.soltar(event, performance.now());
    if (curto && fios.noAtlas()) {
      fios.focar(
        event.clientX / window.innerWidth,
        event.clientY / window.innerHeight
      );
    }
  };

  /**
   * O SISTEMA LEVOU O PONTEIRO: gesto do iOS, palma rejeitada, trocar
   * de janela com o botão preso. Nesses casos o `pointerup` NUNCA
   * chega, e sem este tratador o arrasto ficava ligado para sempre — a
   * cena passava a girar com o ponteiro solto, e o único caminho de
   * volta era recarregar. Encerra pelo mesmo lugar do soltar, MENOS o
   * clique curto: gesto abortado pelo sistema não é clique de ninguém.
   * O `lostpointercapture` entra junto porque o toque tem captura
   * IMPLÍCITA no alvo — quando ela cai sem `pointerup` (o navegador
   * assumiu o gesto), este é o único aviso que chega.
   */
  const onPointerCancel = (event: PointerEvent) => {
    arrasto.cancelar(event);
  };

  /**
   * A RODA E A PINÇA DÃO ZOOM (item 73) — e este é o único lugar do
   * projeto que trata `wheel` fora do voo livre.
   *
   * O `preventDefault` é INCONDICIONAL dentro da fase, e vem antes de
   * qualquer decisão: mesmo o giro pequeno demais para mover a câmera de
   * forma visível tem de morrer aqui, senão metade dos eventos de um
   * gesto rolaria a página enquanto a outra metade dá zoom. E ele vale
   * para a PINÇA pelo mesmo `wheel` — no Chrome e no Safari de Mac a
   * pinça de trackpad chega como `wheel` com `ctrlKey`, e o padrão dela
   * é DAR ZOOM NA PÁGINA inteira, HUD e canvas juntos.
   *
   * O EVENTO SÓ EMPURRA A VELOCIDADE; quem gasta é o quadro
   * (`avancarZoom`). Era aqui que a escada decidia degrau, com limiar e
   * trava de embalo; zoom contínuo não precisa de nenhum dos dois — o
   * que não completa um estalo vira fração de estalo, e a fração move a
   * câmera.
   */
  const onRoda = (evento: WheelEvent) => {
    if (!fios.noAtlas()) return;
    evento.preventDefault();
    roda.girar(evento, window.innerHeight);
  };

  /**
   * O MENU DO SISTEMA NÃO ABRE SOBRE A CENA. Mora aqui, e não no
   * `FreeRoam`, porque o canvas é UM e os dois conjuntos de listeners
   * são dele: dois `preventDefault` no mesmo evento seriam a mesma
   * decisão escrita em dois lugares. Vale em TODAS as fases de
   * propósito — o canvas ocupa a tela inteira, e um menu de navegador
   * por cima do filme é a mesma quebra de imersão em qualquer uma
   * delas. As peças do HUD são outros nós do DOM: clicar com o direito
   * nelas continua abrindo o menu normal.
   */
  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  // pausar-e-olhar: com a viagem pausada, arrastar olha ao redor;
  // no play a mira volta sozinha ao enquadramento do filme
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  // as DUAS outras saídas do gesto — sem elas o `pointerup` que nunca
  // chega deixa o arrasto preso para sempre (ver `onPointerCancel`)
  window.addEventListener('pointercancel', onPointerCancel);
  window.addEventListener('lostpointercapture', onPointerCancel);
  canvas.addEventListener('contextmenu', onContextMenu);
  // A RODA E A PINÇA (Onda 7), e o `passive: false` é a coisa toda:
  // sem ele o navegador recusa o `preventDefault` e a página rola (ou
  // o Chrome DÁ ZOOM, que é o que a pinça faz por padrão) por baixo do
  // Atlas. Fica no CANVAS e não na janela para o HUD — a máquina do
  // tempo, a busca, o painel de ajustes — continuar rolando normal.
  canvas.addEventListener('wheel', onRoda, { passive: false });

  return {
    esquecerRoda: () => roda.esquecer(),
    /**
     * UM QUADRO DE INÉRCIA. Chamado do tick, do mesmo ponto em que o
     * Atlas escreve a câmera: a roda deixa velocidade guardada e é o
     * relógio que a gasta, com atrito exponencial e zona morta
     * (`zoomDaRoda.ts`). Fora do Atlas ninguém chama, e a velocidade
     * morre no `esquecerRoda` da troca de fase.
     */
    avancarZoom: (dt: number) => {
      if (!roda.embalando) return;
      const estalos = roda.avancar(dt);
      if (estalos !== 0) fios.zoom(estalos);
    },
    desligar: () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('lostpointercapture', onPointerCancel);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('wheel', onRoda);
      arrasto.esquecer();
    },
  };
}
