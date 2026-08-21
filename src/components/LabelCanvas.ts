import { escalaDaUi } from '../lib/uiScale';
import { UA_POR_PC, notaDeDistancia } from '../lib/unidades';
import { numeroPtBr } from '../three/tempoDoAtlas';
import type { StarLabel } from '../three/world/labels';

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Desenha todos os rótulos em um único canvas.
 *
 * Evita criar/mover nós DOM a 10 Hz e resolve colisões antes do desenho,
 * inclusive estrelas binárias que compartilham a mesma coordenada.
 */
export class LabelCanvas {
  private readonly context: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private width = 1;
  private height = 1;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Canvas 2D indisponível para os rótulos.');
    this.context = context;
  }

  private lastHadContent = false;

  /**
   * OS RETÂNGULOS QUE O HUD JÁ OCUPA, em pixels de tela — o mesmo
   * sistema de coordenadas deste canvas, que é `inset: 0`. Quem os mede
   * e publica é o App (`AREAS_RESERVADAS`); a lista chega pronta.
   *
   * Por que existem (2026-08-14): o rótulo cedia espaço a DOIS lugares
   * do HUD escritos como fração da tela (a faixa de baixo e o canto dos
   * controles) e a mais nenhum. Painel de Ajustes, gaveta de camadas e
   * paleta de busca são caixas OPACAS que nascem no meio da direita, e
   * os nomes das estrelas eram desenhados por cima deles — em 1600×900
   * uma faixa de ~530×270 px de nome sobre painel.
   *
   * E POR QUE CRESCERAM (2026-08-20, item 56): o HUD FIXO — rodapé,
   * selo, linha de contexto — também não existia para este canvas. A
   * mesma fração de tela que o cobre numa janela de mesa erra por 15%
   * da altura num celular, onde o rodapé do Atlas vira coluna única e
   * ocupa um terço da tela.
   *
   * Fração de tela não resolve NENHUM dos dois: as peças têm largura em
   * `rem`, altura que muda com o conteúdo (a lista da busca cresce a
   * cada tecla, o selo ganha linha a cada desvio) e arranjo que troca
   * com a largura da janela. O que vale é o retângulo MEDIDO.
   */
  private reservadas: readonly Rect[] = [];

  /** Quem publica é o App; lista vazia = nenhum HUD na tela. */
  reservar(areas: readonly Rect[]): void {
    this.reservadas = areas;
  }

  draw(labels: StarLabel[]): void {
    // vazio→vazio (60×/s fora da viagem): não limpar 3,7 M px à toa
    if (labels.length === 0 && !this.lastHadContent) return;
    this.resizeIfNeeded();
    const ctx = this.context;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    this.lastHadContent = labels.length > 0;
    if (labels.length === 0) return;

    // A ESCALA DA UI (F6) alcança ESTES rótulos também. Eles são texto
    // do HUD como a legenda e o selo — só que pintados à mão, e por
    // isso fora do alcance do `font-size` da raiz. Escalam junto o
    // tamanho da fonte E a geometria que posiciona o texto (o traço, o
    // recuo, o vão e a caixa de colisão): mover só a fonte deixaria o
    // nome maior escrito por cima do próprio traço.
    // Em `ui = 1` cada produto é exato (`x * 1 === x` em IEEE754) e o
    // desenho é o de sempre, pixel a pixel.
    const k = escalaDaUi();
    // O HUD ENTRA COMO SE FOSSE RÓTULO JÁ DESENHADO: a lei de colisão
    // que faz um nome ceder a outro é a mesma que o faz ceder a um
    // painel, ao rodapé ou ao selo. Sem caso novo, sem z-index, sem
    // `!important` — quem chegou primeiro ocupa, e o HUD chega primeiro.
    const occupied: Rect[] = [...this.reservadas];
    ctx.textBaseline = 'middle';
    ctx.lineCap = 'round';

    for (const label of labels) {
      // A MARCA QUE O CLIQUE LÊ (pendência 30). Ela nasce `false` aqui e
      // só vira `true` depois de o rótulo passar pelas TRÊS leis de
      // descarte deste laço — é o que faz "o que se vê" e "o que se
      // clica" serem a mesma lista, sem o Director precisar repetir
      // nenhuma delas. O objeto é o mesmo que ele guarda em
      // `lastLabels`, então a escrita chega lá sem plumbing.
      label.desenhado = false;
      if (label.opacity < 0.08) continue;
      const anchorX = label.x * this.width;
      const anchorY = label.y * this.height;
      // A MARGEM DA COMPOSIÇÃO — a faixa de baixo e o canto dos
      // controles, onde o HUD mora em QUALQUER arranjo. Não é a régua do
      // HUD (essa é `reservadas`, medida): é o que sobra de pé quando
      // uma peça está entre montar e medir, e é o que mantém a linha de
      // rumo, a distância do Sol e a barra de progresso — três réguas de
      // uma linha coladas na borda — fora do alcance dos nomes sem
      // precisarem de retângulo próprio.
      // As duas áreas CRESCEM com o tamanho do texto (F6), porque o que
      // as delimita são caixas de `rem`. A forma `x − c·(k−1)` não é
      // enfeite: em `ui = 1` o segundo termo é ZERO e o primeiro é o
      // número de sempre, bit a bit — o filme não muda um pixel.
      // AQUI O TESTE É PELA ÂNCORA, e é a diferença entre margem e
      // régua: um rótulo cuja âncora passa mas cujo TEXTO avança para
      // dentro da faixa não morre nesta linha — a margem é grosseira de
      // propósito, é só o piso. Quem mede de verdade é a colisão logo
      // abaixo, que compara a CAIXA do rótulo com os retângulos que o
      // App mediu (item 56).
      if (anchorY > this.height * (0.76 - 0.24 * (k - 1))) continue;
      if (
        anchorY < this.height * 0.17 * k &&
        anchorX > this.width * (0.62 - 0.38 * (k - 1))
      ) {
        continue;
      }
      const toLeft = anchorX > this.width * 0.72;
      const direction = toLeft ? -1 : 1;
      const textX = anchorX + direction * 18 * k;
      const name = label.name.toLocaleUpperCase('pt-BR');
      // o `detalhe` é dos corpos do sistema (a classe em pt-BR, que não
      // cabe no orçamento de 5 do tipo espectral); nas estrelas ele é o
      // tipo espectral
      const detail = detalheDoRotulo(label);

      ctx.font = `500 ${12 * k}px "Segoe UI", Arial, sans-serif`;
      const nameWidth = ctx.measureText(name).width;
      ctx.font = `400 ${9 * k}px "Segoe UI", Arial, sans-serif`;
      const detailWidth = ctx.measureText(detail).width;
      const contentWidth = nameWidth + 9 * k + detailWidth;
      const left = toLeft ? textX - contentWidth : textX;
      const candidate: Rect = {
        left: left - 5 * k,
        right: left + contentWidth + 5 * k,
        top: anchorY - 12 * k,
        bottom: anchorY + 12 * k,
      };
      if (occupied.some((rect) => intersects(candidate, rect, 8 * k))) continue;
      occupied.push(candidate);
      // passou pelas três leis: está NA TELA, e portanto é clicável
      label.desenhado = true;

      ctx.globalAlpha = label.opacity;
      ctx.strokeStyle = 'rgba(255, 211, 145, 0.72)';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY);
      ctx.lineTo(anchorX + direction * 10 * k, anchorY);
      ctx.stroke();

      ctx.textAlign = toLeft ? 'right' : 'left';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.96)';
      ctx.shadowBlur = 7;
      ctx.font = `500 ${12 * k}px "Segoe UI", Arial, sans-serif`;
      ctx.fillStyle = 'rgba(240, 244, 251, 0.96)';
      ctx.fillText(name, textX, anchorY);

      ctx.shadowBlur = 6;
      ctx.font = `400 ${9 * k}px "Segoe UI", Arial, sans-serif`;
      ctx.fillStyle = 'rgba(159, 176, 201, 0.88)';
      const detailX = toLeft ? textX - nameWidth - 9 * k : textX + nameWidth + 9 * k;
      ctx.fillText(detail, detailX, anchorY);
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  clear(): void {
    this.draw([]);
  }

  private resizeIfNeeded(): void {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    if (width === this.width && height === this.height && dpr === this.dpr) return;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
  }
}

function intersects(a: Rect, b: Rect, padding: number): boolean {
  return !(
    a.right + padding < b.left ||
    a.left - padding > b.right ||
    a.bottom + padding < b.top ||
    a.top - padding > b.bottom
  );
}

/**
 * O DETALHE À DIREITA DO NOME: o tipo espectral (ou a classe do corpo)
 * e a distância. A distância sai da escada única da casa
 * (`lib/unidades`) — até 2026-08-14 este arquivo tinha uma cópia dela,
 * com `toFixed` (ponto decimal) e a abreviação "AL", enquanto a paleta
 * de busca, aberta na mesma tela, escrevia "8,6 anos-luz".
 *
 * SEM MEDIDA, SEM NÚMERO: a nota vem `null` quando a distância é zero
 * ou não finita, e aí fica só o tipo. É o caso do Sol, cujo rótulo
 * anunciava "0 UA" — e o de um corpo a menos de meio quilômetro da
 * câmera, que a cópia antiga arredondava para o mesmo "0 UA".
 */
function detalheDoRotulo(label: StarLabel): string {
  const base = label.detalhe ?? label.spect.slice(0, 5);
  const nota = notaDeDistancia(label.distPc * UA_POR_PC, numeroPtBr);
  return nota ? `${base}  ·  ${nota}` : base;
}
