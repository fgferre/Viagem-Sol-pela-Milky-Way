// ============================================================
// OS GESTOS DO CANVAS — o pausar-e-olhar, a órbita do Atlas, o clique
// que ESCOLHE, o duplo clique que MERGULHA, a roda/pinça do zoom e o
// menu de contexto morto. Morava no director.ts (onda da arquitetura,
// Parte 1, corte 6); a semântica é a mesma, linha a linha. As duas máquinas de gesto
// (ArrastoDePonteiro, ZoomDaRoda) moram AQUI — quem precisa esquecer
// a roda na troca de fase usa o punho devolvido.
//
// A PINÇA DE DOIS DEDOS entra em 2026-08-23 (item 62): ela é o gesto de
// zoom de TELA DE TOQUE, e não existia. O que existia era a pinça de
// TRACKPAD, que o navegador entrega como `wheel` com `ctrlKey` — num
// telefone o mesmo gesto produz dois PONTEIROS e nenhum `wheel`. O ramo
// novo mede a razão entre as distâncias dos dedos e a converte em
// pixels de roda (`pixelsDaPinca`), que somam no MESMO impulso: um dono
// do empurrão, uma inércia, um `esquecer`.
// ============================================================
import { ArrastoDePonteiro, limiarDeClique } from '../arrastoDePonteiro';
import { ZoomDaRoda, pixelsDaPinca } from '../zoomDaRoda';

export interface FiosDosGestos {
  /** viagem congelada — arrastar olha ao redor */
  pauseLookAtivo: () => boolean;
  /** a fase é 'atlas' — arrastar orbita, clique escolhe, roda dá zoom */
  noAtlas: () => boolean;
  /** atlas.addOrbitDelta + perturbar (a captura recomeça) */
  orbitar: (dx: number, dy: number) => void;
  /** rig.addLookDelta do pausar-e-olhar */
  olhar: (dx: number, dy: number) => void;
  /**
   * CLIQUE CURTO no Atlas: ESCOLHER o nome mais próximo (frações de
   * tela) — sem mover a câmera (item 73).
   */
  selecionar: (x: number, y: number) => void;
  /** DUPLO CLIQUE no Atlas: mergulhar no que o clique escolheu, com rampa. */
  mergulhar: () => void;
  /**
   * ZOOM CONTÍNUO (item 73): estalos fracionários deste quadro —
   * negativo aproxima, positivo afasta. Quem os converte em distância é
   * o rig, que é quem sabe o piso e o teto do alvo.
   */
  zoom: (estalos: number) => void;
  /**
   * A LENTE DO MODO FOTOGRAFIA (item 100, fase 2): a roda com o FILME
   * PAUSADO fecha e abre a lente — deltaY em px, negativo fecha, como
   * o zoom do Atlas aproxima. Quem sabe as paredes e o decaimento no
   * play é o rig; aqui só se decide QUANDO a roda é lente.
   */
  lente: (deltaPx: number) => void;
  /**
   * FECHA A GAVETA ABERTA — a terceira saída da folha do telefone (item
   * 62), ao lado do toque na própria alça e do Esc. Do outro lado do fio
   * há `setState` do React; a REGRA de qual toque fecha o quê é daqui.
   */
  fecharGavetas: () => void;
}

/**
 * O TOQUE NO CÉU FECHA A FOLHA — e o MESMO gesto não escolhe: fechar um
 * painel e trocar o alvo da câmera são duas coisas, e um toque é um.
 *
 * A GUARDA É A QUE A CASA JÁ ESCREVE em dois lugares (`useAtalhos` e o
 * `Selo`): `[data-dialogo]`, o contrato que todo diálogo desta casa
 * publica. Vale nos DOIS modos, porque o Atlas e o filme hospedam as
 * mesmas gavetas.
 *
 * A FICHA É A EXCEÇÃO, e ela é o ponto em que esta obra se afasta do
 * plano — com a razão medida. A ficha do objeto NÃO é uma folha que o
 * visitante abriu: ela é o painel da SELEÇÃO, e abre sozinha a cada
 * escolha (item 74). Se ela contasse, o clique num nome deixaria de
 * escolher em quase todo instante do Atlas — só fecharia a ficha do
 * corpo anterior —, e a queixa que o item 73 fechou (*"nem conseguimos
 * mais selecionar para onde vamos"*) voltaria inteira, na mesa e no
 * telefone. Com a exceção, o gesto continua o que sempre foi: escolher
 * um corpo troca o alvo e a folha da ficha acompanha o novo alvo, que é
 * o "live state first" que a ficha promete.
 */
const gavetaQueOToqueFecha = (): boolean => {
  const nome = document.querySelector('[data-dialogo]')?.getAttribute('data-dialogo');
  return Boolean(nome) && nome !== 'ficha';
};

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

  /** este gesto começou fechando uma folha? então ele não escolhe nada */
  let gestoFechouGaveta = false;

  /**
   * OS DEDOS VIVOS NO CANVAS — a memória da PINÇA, e ela existe porque a
   * pinça de TELA DE TOQUE não é a de trackpad. A de trackpad chega como
   * `wheel` com `ctrlKey` e já tinha dono (`onRoda`); num telefone, com
   * `touch-action: none`, dois dedos produzem DOIS PONTEIROS e nenhum
   * `wheel` — e o `ArrastoDePonteiro` ignora o segundo de propósito
   * (é a linha que impede os 25° de um evento só). Ou seja: até
   * 2026-08-23 a pinça simplesmente NÃO EXISTIA no aparelho em que ela é
   * o gesto de zoom.
   *
   * O mapa guarda só o que está encostado, e a distância entre os dois é
   * a única grandeza que interessa: a RAZÃO entre a distância de agora e
   * a do evento anterior vira pixels de roda por `pixelsDaPinca`, e daí
   * para dentro é o MESMO impulso da roda — mesma inércia, mesmo atrito,
   * mesma zona morta. Um dono do empurrão, não dois.
   */
  const dedos = new Map<number, { x: number; y: number }>();
  /** a distância entre os dois dedos no último evento; 0 = sem pinça */
  let pincaAnterior = 0;

  const distanciaDosDedos = (): number => {
    if (dedos.size !== 2) return 0;
    const [a, b] = [...dedos.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  /**
   * Os MESMOS listeners servem o Atlas — arrastar orbita o alvo, clique
   * curto escolhe o nome mais próximo. Registrar um segundo conjunto para
   * a fase nova compraria dois donos do mesmo gesto no mesmo canvas; o
   * dono muda com a fase, o listener não.
   */
  const onPointerDown = (event: PointerEvent) => {
    // ANTES de qualquer gate de fase: o `pointerdown` no CANVAS já é "o
    // toque foi no céu" — quem toca a própria folha não passa por aqui,
    // porque ela é outro nó, por cima. É o mesmo lugar em que o selo
    // escuta o clique fora dele.
    gestoFechouGaveta = gavetaQueOToqueFecha();
    if (gestoFechouGaveta) fios.fecharGavetas();
    if (!fios.pauseLookAtivo() && !fios.noAtlas()) return;
    dedos.set(event.pointerId, { x: event.clientX, y: event.clientY });
    // O SEGUNDO DEDO SUSPENDE O ARRASTO. Sem isto o primeiro dedo
    // continuaria ORBITANDO durante a pinça — a mão inteira se move
    // numa pinça, e o giro sairia de graça por cima do zoom. É
    // `esquecer` e não `cancelar` porque aqui não há o evento DO DONO
    // para conferir: quem chama já sabe que o gesto perdeu o sentido,
    // que é a frase escrita no próprio método.
    if (dedos.size === 2) {
      arrasto.esquecer();
      pincaAnterior = distanciaDosDedos();
      return;
    }
    arrasto.comecar(event, performance.now());
  };

  const onPointerMove = (event: PointerEvent) => {
    // A PINÇA vem ANTES do arrasto, e não depois: com dois dedos o
    // arrasto já não tem dono (o `esquecer` acima), então `mover`
    // devolveria `null` e o gesto morreria no `return` de baixo.
    if (dedos.has(event.pointerId)) {
      dedos.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (dedos.size === 2 && fios.noAtlas()) {
        const agora = distanciaDosDedos();
        if (pincaAnterior > 0 && agora > 0) roda.empurrar(pixelsDaPinca(agora / pincaAnterior));
        pincaAnterior = agora;
        return;
      }
    }
    // o passo vem `null` em dois casos, e os dois querem dizer "não mexa
    // na cena": ponteiro que não é o dono do gesto — é ISSO que impede o
    // segundo dedo de girar 25° medido contra a última posição do
    // primeiro — e gesto que AINDA PODE SER UM CLIQUE, que é o que deixa
    // um toque com tremor soltar em cima do nome em que pousou (ver
    // `arrastoDePonteiro.ts`)
    const passo = arrasto.mover(event, performance.now());
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

  /**
   * O SEGUNDO CLIQUE DE UM DUPLO NÃO ESCOLHE DE NOVO, e sem isto o par
   * "escolhe / vai" não funcionaria — este é o detalhe que a leitura do
   * plano não previa e a medida achou.
   *
   * ESCOLHER RE-MIRA A CÂMERA: a lei do Atlas é que a câmera OLHA o
   * alvo, então trocar o alvo gira a vista em torno da câmera parada, e
   * os rótulos vão junto. Medido: um clique em Alnair na abertura leva o
   * rótulo dela de (0,294 · 0,450) para fora do quadro, e Tiaki assume
   * (0,402 · 0,532). Ou seja, quando o segundo clique do par chega, o
   * pixel debaixo do dedo já é OUTRO objeto — sem a guarda, o duplo
   * clique escolheria um vizinho e mergulharia nele.
   *
   * `event.detail` não serve: medido no Chrome, o `pointerup` chega com
   * `detail = 0` nos dois cliques do par (só o `click`/`dblclick` conta).
   * Então a contagem é nossa, com a MESMA janela que o navegador usa
   * para sintetizar o `dblclick` (500 ms) e o limiar de imobilidade que
   * o clique curto já tem.
   */
  const JANELA_DO_DUPLO_MS = 500;
  let ultimoCliqueMs = -Infinity;
  let ultimoCliqueX = 0;
  let ultimoCliqueY = 0;

  const onPointerUp = (event: PointerEvent) => {
    // clique curto e parado no Atlas = ESCOLHER. Os limiares moram em
    // `arrastoDePonteiro.ts`, um lugar só para os dois gestos, e a
    // imobilidade do PAR usa o MESMO `limiarDeClique` — que desde
    // 2026-08-23 responde ao `pointerType`: 6 px são de mão sobre botão,
    // e um dedo anda o dobro disso só de apoiar.
    const fechouNesteGesto = gestoFechouGaveta;
    gestoFechouGaveta = false;
    // O DEDO SAIU: fim da pinça enquanto sobrar menos de dois. O
    // `pincaAnterior` zera para o próximo par começar do zero, senão a
    // primeira razão do gesto seguinte seria medida contra uma distância
    // de outro gesto — um salto de câmera no primeiro quadro.
    dedos.delete(event.pointerId);
    if (dedos.size < 2) pincaAnterior = 0;
    const agora = performance.now();
    const curto = arrasto.soltar(event, agora);
    if (!curto || !fios.noAtlas()) return;
    // o gesto já fez a coisa dele lá no `pointerdown`
    if (fechouNesteGesto) return;
    const parado = limiarDeClique(event.pointerType);
    const segundoDoPar =
      agora - ultimoCliqueMs < JANELA_DO_DUPLO_MS &&
      Math.abs(event.clientX - ultimoCliqueX) <= parado &&
      Math.abs(event.clientY - ultimoCliqueY) <= parado;
    ultimoCliqueMs = agora;
    ultimoCliqueX = event.clientX;
    ultimoCliqueY = event.clientY;
    if (segundoDoPar) return;
    fios.selecionar(
      event.clientX / window.innerWidth,
      event.clientY / window.innerHeight
    );
  };

  /**
   * O DUPLO CLIQUE MERGULHA (item 73) — e ele tem dono pela primeira
   * vez. Até 22/08 não havia tratador nenhum: dois cliques eram dois
   * ENQUADRAMENTOS seguidos, ou seja dois degraus de escada de uma vez,
   * que é metade da queixa "essa navegação para cima e para baixo de
   * objetos está muito confusa".
   *
   * ELE NÃO REFAZ O HIT-TEST, e é por isso que ele não recebe ponto
   * nenhum: quando o `dblclick` chega, a câmera já foi re-mirada pelo
   * primeiro clique e o rótulo saiu de baixo do dedo (ver a guarda do
   * segundo clique, acima). O que ele mergulha é O QUE O PRIMEIRO
   * CLIQUE ESCOLHEU — a escada guarda a escolha, que é a única leitura
   * que continua verdadeira depois de a vista girar.
   */
  const onDuploClique = (event: MouseEvent) => {
    if (!fios.noAtlas()) return;
    event.preventDefault();
    fios.mergulhar();
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
    gestoFechouGaveta = false;
    dedos.delete(event.pointerId);
    if (dedos.size < 2) pincaAnterior = 0;
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
    if (fios.noAtlas()) {
      evento.preventDefault();
      roda.girar(evento, window.innerHeight);
      return;
    }
    // NO FILME PAUSADO a roda é a LENTE (item 100, fase 2) — o modo
    // fotografia: pausa, olha ao redor e fecha a lente. `deltaMode` 1
    // (linhas, Firefox) vira px pelo mesmo fator ~16 dos navegadores.
    if (fios.pauseLookAtivo()) {
      evento.preventDefault();
      const px = evento.deltaMode === 1 ? evento.deltaY * 16 : evento.deltaY;
      fios.lente(px);
    }
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
  canvas.addEventListener('dblclick', onDuploClique);
  // A RODA E A PINÇA (Onda 7), e o `passive: false` é a coisa toda:
  // sem ele o navegador recusa o `preventDefault` e a página rola (ou
  // o Chrome DÁ ZOOM, que é o que a pinça faz por padrão) por baixo do
  // Atlas. Fica no CANVAS e não na janela para o HUD — a máquina do
  // tempo, a busca, o painel de ajustes — continuar rolando normal.
  canvas.addEventListener('wheel', onRoda, { passive: false });

  return {
    esquecerRoda: () => roda.esquecer(),
    /**
     * A RODA AINDA TEM EMBALO? — a única LEITURA que sai do gesto, e ela
     * existe para o juiz poder perguntar "o gesto acabou?" em vez de
     * dormir e torcer. A velocidade sobe no PRÓPRIO listener do `wheel`,
     * síncrona com o evento, e só o tick a gasta — então logo depois de
     * despachar a roda ela é `true` sem depender de quadro nenhum, e o
     * `false` é o fim do gesto medido pelo app, não pelo relógio de
     * parede de quem observa.
     */
    get embalandoZoom(): boolean {
      return roda.embalando;
    },
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
      canvas.removeEventListener('dblclick', onDuploClique);
      canvas.removeEventListener('wheel', onRoda);
      arrasto.esquecer();
      dedos.clear();
      pincaAnterior = 0;
    },
  };
}
