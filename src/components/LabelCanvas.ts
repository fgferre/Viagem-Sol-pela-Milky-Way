import { escalaDaUi } from '../lib/uiScale';
import { UA_POR_PC, notaDeDistancia } from '../lib/unidades';
import { numeroPtBr } from '../three/tempoDoAtlas';
import { OPACIDADE_MINIMA_DO_ROTULO } from '../three/world/labels';
import type { StarLabel } from '../three/world/labels';
import type { RotuloComVaga } from '../three/world/rotulos3d';

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** a família do HUD, escrita uma vez (era repetida em quatro linhas) */
const FAMILIA = '"Segoe UI", Arial, sans-serif';

/**
 * UM LUGAR POR NOME (item 82, N1) — e a lei que substituiu os sete.
 *
 * O item 73 deu a cada nome SETE deslocamentos verticais × dois lados =
 * catorze vagas, com traço de até 102 px ligando o texto ao ponto. A
 * promessa era "encaixar o máximo de nomes", e ela foi cumprida: dez
 * nomes onde cabiam três. O preço foi a queixa do dono em 23/08 —
 * *"acho que precisaria ser um sistema mais inteligente"*, *"fica uma
 * confusao na tela"* —, porque catorze vagas por nome desenham uma teia
 * de traços em volta do sistema em vez de uma legenda.
 *
 * A LEI DE HOJE é a dos atlas que o dono aponta como referência (NASA
 * Eyes, Celestia, SpaceEngine): o nome nasce no lugar dele — ao lado da
 * âncora, do lado que a borda da tela permite — e se ali não couber,
 * ele SOME. Nome não se salva puxando um risco. Como a lista chega
 * ordenada pela régua de relevância (`aplicarReguaDeRelevancia`), quem
 * chega primeiro ocupa e quem some é sempre o MENOR da disputa.
 * A única exceção é a direção do filme: nomes que o roteiro declarou
 * como assunto podem procurar as antigas linhas alternativas. A exceção
 * não alcança o céu de fundo nem o Atlas.
 *
 * O que sobrou do traço é o risco de 10 px na horizontal, que é o
 * desenho anterior ao item 73: ele diz de que ponto o nome fala, e não
 * atravessa nada.
 */
const RECUO_DO_TEXTO = 18;

/**
 * Só os nomes DIRIGIDOS pelo roteiro podem procurar outra linha. São as
 * posições antigas, já medidas no filme; o zero primeiro mantém intacto
 * todo assunto que já cabia no lugar natural.
 */
const DESLOCAMENTO_NATURAL = [0] as const;
const DESLOCAMENTOS_DIRIGIDOS = [0, -34, 34, -68, 68, -102, 102] as const;

/**
 * OS TRÊS PESOS VISUAIS, numa tabela só — à moda do `labelTier.ts` do
 * doador. O que separa um do outro é a HIERARQUIA (`prioridade`), e a
 * tabela é o único lugar onde cor, peso e tamanho de um rótulo se
 * decidem.
 *
 * O DO MEIO É O DESENHO DE SEMPRE, pixel a pixel, e isso é deliberado:
 * `prioridade` ausente cai nele, e `prioridade` ausente é exatamente o
 * caso do RAMO DO FILME, cujo peso esta obra não toca. Um rótulo do filme
 * continua sendo pintado com os mesmos números de antes.
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
    // o HUD mudou de forma: o quadro de agora não é mais o de antes,
    // ainda que os nomes estejam nos mesmos pixels (ver `assinatura`)
    this.assinatura = '';
  }

  /**
   * AS LARGURAS DE TEXTO JÁ MEDIDAS, por fonte + string (item 82, N1).
   *
   * `measureText` é a única conta cara deste arquivo — ela obriga o
   * navegador a moldar o texto — e era chamada DUAS vezes por rótulo por
   * quadro, sempre sobre as mesmas poucas dezenas de strings. O nome de
   * um corpo não muda nunca; o detalhe só muda quando a casa decimal da
   * distância anda.
   */
  private readonly larguras = new Map<string, number>();

  /**
   * O QUADRO ANTERIOR, em uma string — e a razão de ele existir (item
   * 82, N1).
   *
   * `draw` limpava 3,7 M px e repintava TUDO a cada quadro, inclusive
   * com o Atlas parado: o único atalho (`lastHadContent`) só dispara com
   * a tela SEM nome nenhum, que é justamente quando não há o que
   * economizar. A assinatura fecha o buraco certo — mesmos nomes, nos
   * mesmos pixels inteiros, com a mesma tinta e o mesmo HUD ⇒ o canvas
   * já está pintado, e repintá-lo desenharia exatamente o que está lá.
   *
   * O pixel INTEIRO é a granularidade de propósito: é o que o olho vê, e
   * é o que faz um planeta andando devagar pela efeméride repintar
   * quando ele de fato se mexe, e não sessenta vezes por segundo.
   */
  private assinatura = '';

  /**
   * QUEM SOBREVIVEU no quadro anterior — e de que LADO o texto pousou
   * (o valor; `undefined` no só-ícone, que não tem texto). Sem isto o
   * atalho da assinatura seria um defeito silencioso: a projeção cria
   * objetos NOVOS a cada quadro, e um quadro pulado os deixaria com
   * `desenhado: undefined` — que o clique lê como "pode ser alvo" (só o
   * `false` explícito é descartado). O "SOL" escrito na tela voltaria a
   * valer Fobos. Desde o item 109 o LADO viaja junto: o pintor 3D lê
   * `ladoEsquerdo` no objeto do quadro, e um quadro pulado sem a
   * lembrança o faria pintar do lado errado.
   */
  private desenhadosAntes = new Map<string, boolean | undefined>();

  /** o plano do quadro: nome e detalhe prontos, reusados na pintura */
  private readonly nomes: string[] = [];
  private readonly detalhes: string[] = [];

  private medir(texto: string, fonte: string): number {
    const chave = `${fonte}\u0000${texto}`;
    const guardada = this.larguras.get(chave);
    if (guardada !== undefined) return guardada;
    this.context.font = fonte;
    const medida = this.context.measureText(texto).width;
    // O TETO, e ele é necessário: o detalhe carrega a distância VIVA e
    // inventa uma string nova a cada casa decimal que anda. Sem teto, um
    // voo longo faria o mapa crescer sem parar.
    if (this.larguras.size > 512) this.larguras.clear();
    this.larguras.set(chave, medida);
    return medida;
  }

  /**
   * O QUE ESTE QUADRO ESCREVERIA — prepara nome e detalhe de cada rótulo
   * (a pintura os reaproveita) e devolve a assinatura do conjunto.
   */
  private planejar(labels: readonly StarLabel[], k: number): string {
    this.nomes.length = 0;
    this.detalhes.length = 0;
    let assinatura = `${this.width}x${this.height}@${this.dpr}:${k}`;
    for (const label of labels) {
      const nome = label.name.toLocaleUpperCase('pt-BR');
      // o `detalhe` é dos corpos do sistema (a classe em pt-BR, que não
      // cabe no orçamento de 5 do tipo espectral); nas estrelas ele é o
      // tipo espectral
      const detalhe = detalheDoRotulo(label);
      this.nomes.push(nome);
      this.detalhes.push(detalhe);
      assinatura +=
        `|${label.key},${Math.round(label.x * this.width)}` +
        `,${Math.round(label.y * this.height)},${label.opacity.toFixed(2)}` +
        `,${label.prioridade ?? ''},${label.cortadoPelaRegua ? 1 : 0}` +
        // o modo do desenho entra na assinatura (item 89): a mesma chave
        // no mesmo pixel como ÍCONE e como TEXTO são quadros diferentes
        // — sem este bit, ligar/desligar os nomes não repintaria
        `,${label.dirigido ? 1 : 0},${label.icone ? 1 : 0},${label.comAnel ? 1 : 0}` +
        `,${label.textoInvisivel ? 1 : 0}` +
        `,${label.corDoAnel ?? ''},${nome},${detalhe}`;
    }
    return assinatura;
  }

  draw(labels: StarLabel[]): void {
    // vazio→vazio (60×/s fora da viagem): não limpar 3,7 M px à toa
    if (labels.length === 0 && !this.lastHadContent) return;
    this.resizeIfNeeded();
    // A ESCALA DA UI (F6) alcança ESTES rótulos também. Eles são texto
    // do HUD como a legenda e o selo — só que pintados à mão, e por
    // isso fora do alcance do `font-size` da raiz. Escalam junto o
    // tamanho da fonte E a geometria que posiciona o texto (o traço, o
    // recuo, o vão e a caixa de colisão): mover só a fonte deixaria o
    // nome maior escrito por cima do próprio traço.
    // Em `ui = 1` cada produto é exato (`x * 1 === x` em IEEE754) e o
    // desenho é o de sempre, pixel a pixel.
    const k = escalaDaUi();
    const assinatura = this.planejar(labels, k);
    if (assinatura === this.assinatura) {
      // O QUADRO JÁ ESTÁ NA TELA. Só as MARCAS se reescrevem: os objetos
      // são novos, e a decisão de quem foi desenhado — e de que LADO a
      // vaga ficou (item 109) — é a mesma; a assinatura é exatamente a
      // prova disso.
      for (const label of labels) {
        label.desenhado = this.desenhadosAntes.has(label.key);
        const lado = this.desenhadosAntes.get(label.key);
        if (lado !== undefined) (label as RotuloComVaga).ladoEsquerdo = lado;
      }
      return;
    }
    this.assinatura = assinatura;
    const ctx = this.context;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    this.lastHadContent = labels.length > 0;
    this.desenhadosAntes.clear();
    if (labels.length === 0) return;
    // O HUD ENTRA COMO SE FOSSE RÓTULO JÁ DESENHADO: a lei de colisão
    // que faz um nome ceder a outro é a mesma que o faz ceder a um
    // painel, ao rodapé ou ao selo. Sem caso novo, sem z-index, sem
    // `!important` — quem chegou primeiro ocupa, e o HUD chega primeiro.
    const occupied: Rect[] = [...this.reservadas];
    ctx.textBaseline = 'middle';
    ctx.lineCap = 'round';

    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      // A MARCA QUE O CLIQUE LÊ (pendência 30). Ela nasce `false` aqui e
      // só vira `true` depois de o rótulo passar pelas leis de descarte
      // deste laço — é o que faz "o que se vê" e "o que se clica" serem
      // a mesma lista, sem o Director precisar repetir nenhuma delas. O
      // objeto é o mesmo que ele guarda em `lastLabels`, então a escrita
      // chega lá sem plumbing.
      label.desenhado = false;
      // A RÉGUA DE RELEVÂNCIA JÁ DECIDIU (item 82, N1): este nome
      // projetou, mas a tela está cheia de nomes que importam mais. O
      // corte é por IMPORTÂNCIA e vem ANTES da geometria — é a metade
      // que a colisão sozinha nunca resolve, porque colisão trata
      // sobreposição e não POPULAÇÃO.
      if (label.cortadoPelaRegua) continue;
      if (label.opacity < OPACIDADE_MINIMA_DO_ROTULO) continue;
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
      // A ENTRADA SÓ-ÍCONE (item 89): um anel discreto na âncora, sem
      // texto, sem traço e sem disputa de vaga — a caixa dele é pequena
      // e obedece às MESMAS leis de ocupação (HUD medido e vizinhos).
      // Passou, está na tela — e portanto é clicável, pela mesma lista
      // única de sempre (pendência 30).
      if (label.icone) {
        const r = 3.5 * k;
        const caixa: Rect = {
          left: anchorX - r - 2 * k,
          right: anchorX + r + 2 * k,
          top: anchorY - r - 2 * k,
          bottom: anchorY + r + 2 * k,
        };
        if (occupied.some((rect) => intersects(caixa, rect, 2 * k))) continue;
        occupied.push(caixa);
        label.desenhado = true;
        // sem texto, sem lado: o `undefined` no valor é deliberado
        this.desenhadosAntes.set(label.key, undefined);
        this.anel(ctx, anchorX, anchorY, r, k, label);
        continue;
      }
      // No céu geral, o lado continua sendo a ÚNICA liberdade. O roteiro
      // pode dirigir um assunto: aí, e só aí, ele procura as linhas
      // alternativas antigas e assume a frente dos nomes de fundo.
      const ladoPreferido = anchorX > this.width * 0.72;
      const name = this.nomes[i];
      const detail = this.detalhes[i];
      const peso = pesoVisual(label);

      const fonteDoNome = `${peso.pesoDoNome} ${peso.tamanhoDoNome * k}px ${FAMILIA}`;
      const fonteDoDetalhe = `400 ${peso.tamanhoDoDetalhe * k}px ${FAMILIA}`;
      const nameWidth = this.medir(name, fonteDoNome);
      const detailWidth = this.medir(detail, fonteDoDetalhe);
      const contentWidth = nameWidth + 9 * k + detailWidth;
      let candidate: Rect | null = null;
      let textY = anchorY;
      let toLeft = ladoPreferido;
      let textX = anchorX + (ladoPreferido ? -1 : 1) * RECUO_DO_TEXTO * k;
      const lados = label.dirigido ? 2 : 1;
      const deslocamentos = label.dirigido ? DESLOCAMENTOS_DIRIGIDOS : DESLOCAMENTO_NATURAL;
      for (let lado = 0; lado < lados && !candidate; lado++) {
        const esquerda = lado === 0 ? ladoPreferido : !ladoPreferido;
        const direction = esquerda ? -1 : 1;
        const x = anchorX + direction * RECUO_DO_TEXTO * k;
        const left = esquerda ? x - contentWidth : x;
        for (const passo of deslocamentos) {
          const y = anchorY + passo * k;
          const tentativa: Rect = {
            left: left - 5 * k,
            right: left + contentWidth + 5 * k,
            top: y - 12 * k,
            bottom: y + 12 * k,
          };
          if (occupied.some((rect) => intersects(tentativa, rect, 8 * k))) continue;
          const traco: Rect = {
            left: Math.min(anchorX, anchorX + direction * 10 * k),
            right: Math.max(anchorX, anchorX + direction * 10 * k),
            top: Math.min(anchorY, y),
            bottom: Math.max(anchorY, y),
          };
          if (this.reservadas.some((rect) => intersects(traco, rect, 0))) continue;
          candidate = tentativa;
          textY = y;
          toLeft = esquerda;
          textX = x;
          break;
        }
      }
      if (!candidate) continue;
      const direction = toLeft ? -1 : 1;
      occupied.push(candidate);
      // passou por todas as leis: está NA TELA, e portanto é clicável —
      // e a vaga TEM LADO (item 109): o pintor 3D pinta na MESMA vaga,
      // então o lado que a borda escolheu viaja no objeto, ao lado do
      // `desenhado`
      label.desenhado = true;
      (label as RotuloComVaga).ladoEsquerdo = toLeft;
      this.desenhadosAntes.set(label.key, toLeft);

      ctx.globalAlpha = label.opacity;
      if (label.comAnel) {
        // O EYES COMPLETO (item 89): o corpo tem o ANEL na âncora e o
        // nome ao lado — sem risco, porque o anel É a marca do ponto.
        this.anel(ctx, anchorX, anchorY, 3.5 * k, k, label);
      } else {
        ctx.strokeStyle = 'rgba(255, 211, 145, 0.72)';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(anchorX, anchorY);
        // o risco de 10 px na horizontal, que diz de que ponto o nome
        // fala — o desenho anterior ao item 73, de volta inteiro
        ctx.lineTo(anchorX + direction * 10 * k, textY);
        ctx.stroke();
      }

      // BETA 3D (item 109): o rótulo passou por TODAS as leis e ocupou a
      // vaga — mas o texto dele é pintado NA CENA pelo Rotulos3d. Aqui
      // fica só a marca do desenhado (o clique) e o anel lá de cima.
      if (label.textoInvisivel) continue;

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

  /**
   * O ANEL do corpo (item 89, o Eyes completo): traço na cor da ÓRBITA
   * do corpo (item 83; âmbar padrão sem cor declarada) sobre um miolo
   * escuro sutil — é o miolo que mantém o anel legível cruzando a
   * própria linha de órbita e o clarão.
   */
  private anel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    k: number,
    label: StarLabel
  ): void {
    ctx.globalAlpha = label.opacity;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.96)';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8, 10, 14, 0.55)';
    ctx.fill();
    ctx.strokeStyle = label.corDoAnel ?? 'rgba(255, 211, 145, 0.72)';
    ctx.lineWidth = 1.1 * k;
    ctx.stroke();
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
 *
 * E ELE FICOU, EM 24/08, POR DECISÃO — o estudo do NASA Eyes pede que
 * este detalhe SAIA do céu ("nomes magros": o nome e nada mais, que a
 * ficha já diz a classe e a distância), e o item 82 não o tirou. A razão
 * é que este desenho é UM SÓ: a mesma instância de `LabelCanvas` serve o
 * Atlas e o FILME, e apagar o detalhe apagaria junto a legenda do filme
 * ("BETELGEUSE · M2Ib · 49,7 anos-luz"), que não estava em discussão
 * naquele item. Tirar continua sendo uma boa ideia; ela só precisa ser
 * julgada com o filme na tela, e não de passagem.
 */
function detalheDoRotulo(label: StarLabel): string {
  const base = label.detalhe ?? label.spect.slice(0, 5);
  const nota = notaDeDistancia(label.distPc * UA_POR_PC, numeroPtBr);
  return nota ? `${base}  ·  ${nota}` : base;
}
