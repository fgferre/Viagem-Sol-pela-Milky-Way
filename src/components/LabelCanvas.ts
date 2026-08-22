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

/** a família do HUD, escrita uma vez (era repetida em quatro linhas) */
const FAMILIA = '"Segoe UI", Arial, sans-serif';

/**
 * OS LUGARES ALTERNATIVOS de um nome, em pixels de deslocamento
 * VERTICAL a partir da âncora (item 73, plano §3) — e tanto o passo
 * quanto a CONTAGEM são MEDIDOS, não copiados.
 *
 * O PASSO. A caixa de colisão tem 24 px de altura (`anchorY ± 12`) e a
 * folga entre duas caixas é 8 px, então dois textos empilhados só se
 * livram um do outro a partir de 24 + 8 = 32 px. O doador usa ±18 e
 * ±36, que na geometria DESTE canvas não separam nada: a 18 px as
 * caixas ainda se cruzam, e as cinco posições dele viravam uma. 34 px é
 * o primeiro passo que limpa, com 2 px de margem.
 *
 * A CONTAGEM: SETE LUGARES — a âncora e três de cada lado. O plano
 * pedia CINCO, e cinco não bastam — está medido na vista de abertura,
 * que é onde a promessa foi feita ("os 8 planetas e o Sol com nome,
 * contra 3 hoje"). O aglomerado interno tem CINCO corpos dentro de 6 px
 * (Sol, Mercúrio, Vênus, Terra, Marte) e mais três vizinhos na mesma
 * faixa vertical (Júpiter, Saturno, Urano): com cinco lugares num lado
 * só cabem 5 nomes, com os cinco nos dois lados cabem 8, e são os SETE
 * (nos dois lados, 14 vagas) que dão os 10. Cada par a mais custa 34 px
 * de traço, e o traço agora é conferido contra o HUD (ver `draw`), então
 * ele não pode se esconder atrás da tarja.
 *
 * A ordem é centro → cima → baixo → mais longe, alternando, e o
 * PRIMEIRO é o zero: quem já cabia continua exatamente onde estava.
 */
export const DESLOCAMENTOS = [0, -34, 34, -68, 68, -102, 102] as const;

/**
 * OS TRÊS PESOS VISUAIS, numa tabela só — à moda do `labelTier.ts` do
 * doador. O que separa um do outro é a HIERARQUIA (`prioridade`), e a
 * tabela é o único lugar onde cor, peso e tamanho de um rótulo se
 * decidem.
 *
 * O DO MEIO É O DESENHO DE SEMPRE, pixel a pixel, e isso é deliberado:
 * `prioridade` ausente cai nele, e `prioridade` ausente é exatamente o
 * caso do RAMO DO FILME, que esta obra não toca. Um rótulo do filme
 * continua sendo desenhado com os mesmos números de antes.
 */
export const PESOS_DO_ROTULO = {
  /** o foco e o Sol (prioridade ≥ 90): o assunto, e ele se lê primeiro */
  principal: {
    tamanhoDoNome: 13,
    pesoDoNome: '600',
    corDoNome: 'rgba(255, 246, 232, 0.98)',
    tamanhoDoDetalhe: 9,
    corDoDetalhe: 'rgba(198, 206, 220, 0.92)',
  },
  /** planetas, anões, luas e nomes próprios — o desenho de sempre */
  secundario: {
    tamanhoDoNome: 12,
    pesoDoNome: '500',
    corDoNome: 'rgba(240, 244, 251, 0.96)',
    tamanhoDoDetalhe: 9,
    corDoDetalhe: 'rgba(159, 176, 201, 0.88)',
  },
  /** designações de Bayer e o resto: presente, sem disputar a leitura */
  terciario: {
    tamanhoDoNome: 11,
    pesoDoNome: '400',
    corDoNome: 'rgba(206, 215, 231, 0.82)',
    tamanhoDoDetalhe: 8,
    corDoDetalhe: 'rgba(143, 158, 181, 0.74)',
  },
} as const;

/** A faixa de prioridade de cada peso — a tabela decide, não o desenho. */
export function pesoVisual(label: StarLabel) {
  const p = label.prioridade;
  if (p === undefined) return PESOS_DO_ROTULO.secundario;
  if (p >= 90) return PESOS_DO_ROTULO.principal;
  if (p >= 5) return PESOS_DO_ROTULO.secundario;
  return PESOS_DO_ROTULO.terciario;
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
      const ladoPreferido = anchorX > this.width * 0.72;
      const name = label.name.toLocaleUpperCase('pt-BR');
      // o `detalhe` é dos corpos do sistema (a classe em pt-BR, que não
      // cabe no orçamento de 5 do tipo espectral); nas estrelas ele é o
      // tipo espectral
      const detail = detalheDoRotulo(label);
      const peso = pesoVisual(label);

      ctx.font = `${peso.pesoDoNome} ${peso.tamanhoDoNome * k}px ${FAMILIA}`;
      const nameWidth = ctx.measureText(name).width;
      ctx.font = `400 ${peso.tamanhoDoDetalhe * k}px ${FAMILIA}`;
      const detailWidth = ctx.measureText(detail).width;
      const contentWidth = nameWidth + 9 * k + detailWidth;
      // AS CINCO POSIÇÕES, EM CADA LADO (item 73, plano §3): prioridade
      // não salva Vênus colidindo com o Sol — outro LUGAR para o texto,
      // sim. O primeiro candidato é o de sempre (lado preferido,
      // deslocamento ZERO), e é isso que mantém intacto todo rótulo que
      // já cabia: em `ui = 1` o produto é exato e a caixa é a mesma, bit
      // a bit.
      let candidate: Rect | null = null;
      let textY = anchorY;
      let toLeft = ladoPreferido;
      let textX = anchorX + (ladoPreferido ? -1 : 1) * 18 * k;
      for (const lado of [ladoPreferido, !ladoPreferido]) {
        const direcao = lado ? -1 : 1;
        const x = anchorX + direcao * 18 * k;
        const left = lado ? x - contentWidth : x;
        for (const passo of DESLOCAMENTOS) {
          const y = anchorY + passo * k;
          const tentativa: Rect = {
            left: left - 5 * k,
            right: left + contentWidth + 5 * k,
            top: y - 12 * k,
            bottom: y + 12 * k,
          };
          if (occupied.some((rect) => intersects(tentativa, rect, 8 * k))) continue;
          // O TRAÇO TAMBÉM É TINTA, e com deslocamento ele deixa de ser
          // um risco de 10 px para virar uma diagonal de até 102: ela
          // não pode atravessar o HUD. A caixa do texto continua sendo
          // a régua da disputa ENTRE nomes (incluir a âncora nela faria
          // todo empilhamento colidir consigo mesmo — medido, os 10
          // nomes da abertura voltavam a 4); contra o HUD, que é opaco,
          // vale a tinta inteira.
          const traco: Rect = {
            left: Math.min(anchorX, anchorX + direcao * 10 * k),
            right: Math.max(anchorX, anchorX + direcao * 10 * k),
            top: Math.min(anchorY, y),
            bottom: Math.max(anchorY, y),
          };
          if (this.reservadas.some((rect) => intersects(traco, rect, 0))) continue;
          candidate = tentativa;
          textY = y;
          toLeft = lado;
          textX = x;
          break;
        }
        if (candidate) break;
      }
      if (!candidate) continue;
      const direction = toLeft ? -1 : 1;
      occupied.push(candidate);
      // passou pelas três leis: está NA TELA, e portanto é clicável
      label.desenhado = true;

      ctx.globalAlpha = label.opacity;
      ctx.strokeStyle = 'rgba(255, 211, 145, 0.72)';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY);
      // o traço vai da ÂNCORA até a altura do texto: com deslocamento
      // zero ele é a horizontal de sempre, pixel a pixel; deslocado, ele
      // é a linha que diz de qual ponto aquele nome está falando
      ctx.lineTo(anchorX + direction * 10 * k, textY);
      ctx.stroke();

      ctx.textAlign = toLeft ? 'right' : 'left';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.96)';
      ctx.shadowBlur = 7;
      ctx.font = `${peso.pesoDoNome} ${peso.tamanhoDoNome * k}px ${FAMILIA}`;
      ctx.fillStyle = peso.corDoNome;
      ctx.fillText(name, textX, textY);

      ctx.shadowBlur = 6;
      ctx.font = `400 ${peso.tamanhoDoDetalhe * k}px ${FAMILIA}`;
      ctx.fillStyle = peso.corDoDetalhe;
      const detailX = toLeft ? textX - nameWidth - 9 * k : textX + nameWidth + 9 * k;
      ctx.fillText(detail, detailX, textY);
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
