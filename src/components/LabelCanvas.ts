import { escalaDaUi } from '../lib/uiScale';
import { UA_POR_PC, notaDeDistancia } from '../lib/unidades';
import { numeroPtBr } from '../three/tempoDoAtlas';
import { OPACIDADE_MINIMA_DO_ROTULO, ordemDaDisputa } from '../three/world/labels';
import type { CaixaDaDisputa, StarLabel } from '../three/world/labels';
import type { RotuloComVaga } from '../three/world/rotulos3d';

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * A QUADTREE DA COLISÃO (item 125, F3 · P5) — os literais do
 * `LabelQuadtree`/`Quadtree` do NASA Eyes.
 *
 * `Quadtree(viewport, maxValuesPerNode = 8)`: a raiz tem o tamanho do
 * viewport; um nó estoura em quatro filhos quando passa de **8** valores
 * e **para de subdividir em `depth >= 8`**; um valor só desce para um
 * filho que o CONTENHA INTEIRO, senão fica no nó em que está; a árvore
 * colapsa de volta quando a soma da subárvore cai abaixo de
 * `maxValuesPerNode / 2` (= 4); e a raiz é reconstruída quando o
 * viewport muda de tamanho.
 *
 * O QUE ELA SUBSTITUI: a varredura linear de `occupied` — um `some()`
 * sobre a lista inteira dos já colocados, por candidato, por quadro.
 * Com o orçamento de dez nomes revogado (item 125, F3) a lista deixou de
 * ter teto, e uma varredura quadrática sobre "todo mundo que projetou"
 * é exatamente o que a estrutura deles existe para não fazer.
 *
 * AS COORDENADAS SÃO AS DO CANVAS, em px CSS — as mesmas de
 * `this.width`/`this.height` e do `ctx` já escalado por `dpr`. Guardar
 * px de dispositivo aqui daria uma árvore com o dobro do lado num Mac e
 * o mesmo desenho colidindo diferente por monitor.
 */
export const VALORES_POR_NO = 8;
export const PROFUNDIDADE_MAXIMA = 8;

/** um retângulo na árvore e de quem ele é (P6: dois por nome) */
interface ValorDaArvore {
  /** `<chave>` para o ícone, `<chave>-texto` para o nome */
  nome: string;
  /** a chave do rótulo dono dos dois retângulos */
  dono: string;
  r: Rect;
}

class NoDaArvore {
  readonly valores: ValorDaArvore[] = [];
  filhos: NoDaArvore[] | null = null;
  readonly bounds: Rect;
  readonly profundidade: number;
  readonly pai: NoDaArvore | null;
  constructor(bounds: Rect, profundidade: number, pai: NoDaArvore | null) {
    this.bounds = bounds;
    this.profundidade = profundidade;
    this.pai = pai;
  }
}

/** `a` contém `b` INTEIRO — a condição de descida (`bounds.surrounds`) */
function contem(a: Rect, b: Rect): boolean {
  return a.left <= b.left && a.right >= b.right && a.top <= b.top && a.bottom >= b.bottom;
}

export class QuadtreeDeRotulos {
  private raiz: NoDaArvore;
  private largura: number;
  private altura: number;
  /** em que nó vive cada retângulo — é o que faz a remoção ser O(1) */
  private readonly onde = new Map<string, NoDaArvore>();

  constructor(largura: number, altura: number) {
    this.largura = largura;
    this.altura = altura;
    this.raiz = this.novaRaiz();
  }

  private novaRaiz(): NoDaArvore {
    return new NoDaArvore(
      { left: 0, top: 0, right: this.largura, bottom: this.altura },
      0,
      null
    );
  }

  /** quantos retângulos a árvore guarda — a régua dos testes */
  get tamanho(): number {
    return this.onde.size;
  }

  redimensionar(largura: number, altura: number): void {
    if (largura === this.largura && altura === this.altura) return;
    this.largura = largura;
    this.altura = altura;
    this.raiz = this.novaRaiz();
    this.onde.clear();
  }

  inserir(nome: string, dono: string, r: Rect): void {
    this.remover(nome);
    let no = this.raiz;
    for (;;) {
      const filho = no.filhos?.find((f) => contem(f.bounds, r));
      if (!filho) break;
      no = filho;
    }
    no.valores.push({ nome, dono, r });
    this.onde.set(nome, no);
    this.talvezDividir(no);
  }

  remover(nome: string): void {
    const no = this.onde.get(nome);
    if (!no) return;
    const i = no.valores.findIndex((v) => v.nome === nome);
    if (i >= 0) no.valores.splice(i, 1);
    this.onde.delete(nome);
    this.talvezColapsar(no);
  }

  /** os retângulos que cruzam `r` — a consulta da disputa */
  consultar(r: Rect, saida: ValorDaArvore[]): ValorDaArvore[] {
    this.varrer(this.raiz, r, saida);
    return saida;
  }

  private varrer(no: NoDaArvore, r: Rect, saida: ValorDaArvore[]): void {
    for (const v of no.valores) if (intersects(v.r, r, 0)) saida.push(v);
    if (!no.filhos) return;
    for (const f of no.filhos) if (intersects(f.bounds, r, 0)) this.varrer(f, r, saida);
  }

  private talvezDividir(no: NoDaArvore): void {
    if (no.filhos || no.valores.length <= VALORES_POR_NO) return;
    if (no.profundidade >= PROFUNDIDADE_MAXIMA) return;
    const { left, top, right, bottom } = no.bounds;
    const mx = (left + right) / 2;
    const my = (top + bottom) / 2;
    no.filhos = [
      { left, top, right: mx, bottom: my },
      { left: mx, top, right, bottom: my },
      { left, top: my, right: mx, bottom },
      { left: mx, top: my, right, bottom },
    ].map((b) => new NoDaArvore(b, no.profundidade + 1, no));
    for (let i = no.valores.length - 1; i >= 0; i--) {
      const v = no.valores[i];
      const filho = no.filhos.find((f) => contem(f.bounds, v.r));
      if (!filho) continue;
      no.valores.splice(i, 1);
      filho.valores.push(v);
      this.onde.set(v.nome, filho);
    }
    for (const f of no.filhos) this.talvezDividir(f);
  }

  private talvezColapsar(no: NoDaArvore | null): void {
    if (!no) return;
    if (no.filhos && this.contar(no) < VALORES_POR_NO / 2) {
      this.recolher(no, no);
      no.filhos = null;
    }
    this.talvezColapsar(no.pai);
  }

  private contar(no: NoDaArvore): number {
    let n = no.valores.length;
    if (no.filhos) for (const f of no.filhos) n += this.contar(f);
    return n;
  }

  private recolher(no: NoDaArvore, destino: NoDaArvore): void {
    if (!no.filhos) return;
    for (const f of no.filhos) {
      for (const v of f.valores) {
        destino.valores.push(v);
        this.onde.set(v.nome, destino);
      }
      this.recolher(f, destino);
    }
  }
}

/**
 * O RODÍZIO (item 125, F3 · P7) — `n = Math.min(this._labelNames.length,
 * 20)` no `LabelQuadtree.update` deles, começando em
 * `_labelNamesIndex % length` e avançando `(i + n) % length` no fim.
 *
 * QUEM NÃO FOI JULGADO NESTE QUADRO MANTÉM O VEREDITO ANTERIOR. É por
 * isso que a rampa de 750 ms da F2 é peça DESTA fase também: com 55
 * candidatos a volta leva três quadros (50 ms), e a tinta leva quinze
 * vezes mais que isso para sumir — a latência do rodízio não é
 * visível, e é justamente ela que faz a seleção do Eyes ficar quieta em
 * vez de recalcular tudo sessenta vezes por segundo.
 */
export const JULGAMENTOS_POR_QUADRO = 20;

/** o que a geometria do quadro apurou de um rótulo, antes da disputa */
interface PlanoDoRotulo {
  /** disputa espaço? (fora: escondido por tamanho, transparente, margem) */
  candidato: boolean;
  caixaDoIcone: Rect | null;
  caixaDoTexto: Rect | null;
  ancoraX: number;
  ancoraY: number;
  textoX: number;
  textoY: number;
  esquerda: boolean;
  larguraDoNome: number;
  peso: (typeof PESOS_DO_ROTULO)[keyof typeof PESOS_DO_ROTULO];
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

/**
 * A faixa de prioridade de cada peso — a tabela decide, não o desenho.
 *
 * OS DEGRAUS FORAM REESCRITOS NA ESCALA NOVA (item 125, F3 · P1) e o
 * conjunto de quem cai em cada peso é o MESMO de antes, nome por nome:
 * `foco` e `sol` (201/100) no principal; planeta, anão, lua, asteroide e
 * estrela de nome próprio (50…10) no secundário; designação de Bayer e o
 * piso (5/1) no terciário. Só os números mudaram — a tipografia é
 * assunto da F5 e esta fase não a move um pixel.
 */
export function pesoVisual(label: StarLabel) {
  const p = label.prioridade;
  if (p === undefined) return PESOS_DO_ROTULO.secundario;
  if (p >= 100) return PESOS_DO_ROTULO.principal;
  if (p >= 10) return PESOS_DO_ROTULO.secundario;
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
        `,${label.textoInvisivel ? 1 : 0},${label.saindo ? 1 : 0}` +
        // A CAMADA DE DENTRO ENTRA NA ASSINATURA (item 125, F2 · A8): o
        // alfa do texto muda sem que o nome saia do pixel — um hover, ou
        // a rampa de 250 ms subindo de 0,05 a 0,35 — e sem este campo o
        // atalho de repintura diria "já está na tela" e congelaria o fade.
        `,${(label.alfaDoTexto ?? 1).toFixed(3)}` +
        `,${label.corDoAnel ?? ''},${nome},${detalhe}`;
    }
    return assinatura;
  }

  /**
   * A ÁRVORE DA COLISÃO — e ela VIVE ENTRE QUADROS (item 125, F3 · P5/P7).
   *
   * Não é cache: é a memória que o rodízio exige. Só vinte nomes por
   * quadro têm as caixas atualizadas e o veredito revisto; os demais
   * disputam com a caixa que deixaram na árvore da última vez em que
   * foram julgados. Zerá-la por quadro seria voltar à varredura linear
   * com um nome pomposo.
   */
  private arvore = new QuadtreeDeRotulos(1, 1);

  /**
   * O VEREDITO POR CHAVE: `true` = perdeu a vaga. É ele que o rodízio
   * conserva entre quadros (P7) e que diz, na hora da disputa, quem está
   * escondido e portanto NÃO derruba ninguém (P9).
   */
  private readonly veredito = new Map<string, boolean>();

  /** onde o rodízio parou — o `_labelNamesIndex` deles (P7) */
  private indiceDoRodizio = 0;

  /**
   * QUANTOS QUADROS SEGUIDOS SEM UM VEREDITO MUDAR — o que autoriza o
   * atalho da assinatura a valer.
   *
   * Sem isto o atalho seria um defeito silencioso: com mais de vinte
   * nomes, dois quadros de entrada IDÊNTICA têm vereditos diferentes a
   * apurar (o rodízio ainda não deu a volta), e sair pelo atalho
   * congelaria para sempre os nomes que nunca chegaram a ser julgados.
   * O atalho só vale depois de uma volta inteira sem mudança.
   */
  private quadrosSemMudanca = 0;

  /**
   * A CAIXA JULGADA DE CADA NOME, guardada entre quadros — o mesmo motivo
   * de `desenhadosAntes` existir: no quadro pulado pelo atalho da
   * assinatura os objetos são NOVOS e a geometria não roda, e sem esta
   * memória a caixa sumiria do rótulo justamente na tela parada, que é
   * quando o juiz mede. (`StarLabel.caixaDaDisputa`.)
   */
  private readonly caixas = new Map<string, CaixaDaDisputa>();

  /** o plano geométrico do quadro, na ordem da lista */
  private readonly plano: PlanoDoRotulo[] = [];
  /** os rótulos deste quadro por chave — o oponente da disputa */
  private readonly porChave = new Map<string, StarLabel>();
  /** os retângulos que a consulta devolveu, reusados por quadro */
  private readonly achados: ValorDaArvore[] = [];
  /** quem já teve a caixa POSTA na árvore neste quadro */
  private readonly colocados = new Set<string>();
  /** o retângulo inflado da consulta, reusado (a folga vive aqui) */
  private readonly consulta: Rect = { left: 0, right: 0, top: 0, bottom: 0 };

  /** os dois retângulos deste nome saem da árvore (P9) */
  private esquecer(chave: string): void {
    this.arvore.remover(chave);
    this.arvore.remover(`${chave}-texto`);
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
    const parado = assinatura === this.assinatura;
    if (
      parado &&
      this.quadrosSemMudanca >= Math.ceil(labels.length / JULGAMENTOS_POR_QUADRO)
    ) {
      // O QUADRO JÁ ESTÁ NA TELA e o rodízio já deu a volta sem mudar de
      // ideia. Só as MARCAS se reescrevem: os objetos são novos, e a
      // decisão de quem foi desenhado — e de que LADO a vaga ficou (item
      // 109) — é a mesma; a assinatura mais a volta do rodízio são
      // exatamente a prova disso.
      for (const label of labels) {
        label.desenhado = this.desenhadosAntes.has(label.key);
        label.perdeuAVaga = this.veredito.get(label.key) === true;
        label.caixaDaDisputa = this.caixas.get(label.key);
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
    if (labels.length === 0) {
      this.veredito.clear();
      this.caixas.clear();
      this.arvore = new QuadtreeDeRotulos(this.width, this.height);
      this.quadrosSemMudanca = 0;
      return;
    }
    this.caixas.clear();
    ctx.textBaseline = 'middle';
    ctx.lineCap = 'round';

    this.porChave.clear();
    this.colocados.clear();
    for (const l of labels) this.porChave.set(l.key, l);

    // ── 1) A GEOMETRIA, e a primeira passada do rodízio ──────────
    // Onde cada nome pousaria, e se ele sequer disputa. A geometria roda
    // para TODOS todo quadro (no Eyes quem posiciona o `<div>` é o
    // `DivComponent`, que também roda para todos); o que o rodízio
    // limita é a ATUALIZAÇÃO DAS CAIXAS na árvore e o JULGAMENTO — as
    // duas passadas do `LabelQuadtree.update` deles (P7).
    const janela = Math.min(labels.length, JULGAMENTOS_POR_QUADRO);
    const inicio = this.indiceDoRodizio % labels.length;
    const daVez = (i: number) => {
      const d = (i - inicio + labels.length) % labels.length;
      return d < janela;
    };
    this.indiceDoRodizio = (inicio + janela) % labels.length;
    const plano = this.plano;
    plano.length = 0;
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      // A MARCA QUE O CLIQUE LÊ (pendência 30). Ela nasce `false` aqui e
      // só vira `true` na terceira passada, se o rótulo tiver vencido a
      // disputa — é o que faz "o que se vê" e "o que se clica" serem a
      // mesma lista. O objeto é o mesmo que o Director guarda em
      // `lastLabels`, então a escrita chega lá sem plumbing.
      label.desenhado = false;
      const p = this.geometria(label, i, k);
      plano.push(p);
      if (!p.candidato) {
        // P9: quem já está escondido por OUTRA causa sai da disputa E
        // tem a marca da disputa LIMPA — não gasta vaga, não derruba
        // ninguém, e volta a ser julgado do zero quando reaparecer.
        this.esquecer(label.key);
        this.veredito.delete(label.key);
        continue;
      }
      if (!daVez(i)) continue;
      this.colocados.add(label.key);
      this.arvore.inserir(label.key, label.key, p.caixaDoIcone!);
      if (p.caixaDoTexto) this.arvore.inserir(`${label.key}-texto`, label.key, p.caixaDoTexto);
      else this.arvore.remover(`${label.key}-texto`);
    }
    // o que saiu de quadro leva os retângulos junto: caixa de nome que
    // já não projeta continuaria derrubando vizinho por quadros a fio
    for (const chave of this.veredito.keys()) {
      if (!this.porChave.has(chave)) {
        this.esquecer(chave);
        this.veredito.delete(chave);
      }
    }

    // ── 2) A DISPUTA (a segunda passada, sobre os mesmos 20) ─────
    let mudou = false;
    for (let i = 0; i < labels.length; i++) {
      const p = plano[i];
      if (!p.candidato || !daVez(i)) continue;
      const perdeu = this.disputar(labels[i], p, k);
      if ((this.veredito.get(labels[i].key) ?? false) !== perdeu) mudou = true;
      this.veredito.set(labels[i].key, perdeu);
    }
    this.quadrosSemMudanca = mudou || !parado ? 0 : this.quadrosSemMudanca + 1;

    // ── 3) A PINTURA ────────────────────────────────────────────
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const p = plano[i];
      const perdeu = this.veredito.get(label.key) === true;
      label.perdeuAVaga = perdeu;
      if (!p.candidato) continue;
      // A CAIXA QUE FOI JULGADA sai no objeto (item 125, F3): é a mesma
      // que a disputa usou, com a folga que a consulta aplica — não uma
      // cópia recalculada. Quem lê é o juiz de imagem do `atlas-smoke`.
      const julgada = p.caixaDoTexto ?? p.caixaDoIcone!;
      const caixa: CaixaDaDisputa = {
        left: julgada.left,
        right: julgada.right,
        top: julgada.top,
        bottom: julgada.bottom,
        folga: (p.caixaDoTexto ? 8 : 2) * k,
      };
      label.caixaDaDisputa = caixa;
      this.caixas.set(label.key, caixa);
      // O NOME QUE PERDEU É IMAGEM, NÃO OCUPANTE (item 115, bloco B;
      // item 125, F3 · P4). Ele pinta enquanto a rampa de 750 ms desce —
      // é isso que faz o nome esvair em vez de sumir num quadro — e não
      // faz mais nada: não vira alvo de clique e não derruba vizinho (a
      // disputa ignora o oponente escondido, P9). Sem esta porta a rampa
      // deixaria de ser o COMO e viraria o QUEM.
      if (!perdeu) {
        label.desenhado = true;
        if (p.caixaDoTexto) {
          // a vaga TEM LADO (item 109): o pintor 3D pinta na MESMA vaga
          (label as RotuloComVaga).ladoEsquerdo = p.esquerda;
          this.desenhadosAntes.set(label.key, p.esquerda);
        } else {
          // só-ícone: sem texto, sem lado — o `undefined` é deliberado
          this.desenhadosAntes.set(label.key, undefined);
        }
      }
      if (label.opacity < OPACIDADE_MINIMA_DO_ROTULO) continue;
      if (!p.caixaDoTexto) {
        // A ENTRADA SÓ-ÍCONE (item 89): um anel discreto na âncora, sem
        // texto e sem traço.
        this.anel(ctx, p.ancoraX, p.ancoraY, 3.5 * k, k, label);
        continue;
      }
      const direcao = p.esquerda ? -1 : 1;
      ctx.globalAlpha = label.opacity;
      if (label.comAnel) {
        // O EYES COMPLETO (item 89): o corpo tem o ANEL na âncora e o
        // nome ao lado — sem risco, porque o anel É a marca do ponto.
        this.anel(ctx, p.ancoraX, p.ancoraY, 3.5 * k, k, label);
      } else {
        ctx.strokeStyle = 'rgba(255, 211, 145, 0.72)';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(p.ancoraX, p.ancoraY);
        // o risco de 10 px na horizontal, que diz de que ponto o nome
        // fala — o desenho anterior ao item 73, de volta inteiro
        ctx.lineTo(p.ancoraX + direcao * 10 * k, p.textoY);
        ctx.stroke();
      }

      // BETA 3D (item 109): o rótulo passou por TODAS as leis e ocupou a
      // vaga — mas o texto dele é pintado NA CENA pelo Rotulos3d. Aqui
      // fica só a marca do desenhado (o clique) e o anel lá de cima.
      if (label.textoInvisivel) continue;

      // O PRODUTO DAS DUAS CAMADAS (item 125, F2 · A8/A9). No Eyes a
      // opacidade do nome é `opacity` do `<div>` (0↔1, 250/750 ms) VEZES
      // a opacidade do `.text` de dentro (0,35 no comum, 0,75 no planeta
      // e no Sol, 0,05 escondido, 1 apontado — com as mesmas durações).
      // É essa curva não-linear que soa orquestrada, e nenhuma das duas
      // camadas sozinha a produz.
      //
      // SÓ O TEXTO: o anel e o risco continuam na camada de fora, porque
      // o canal de ÍCONE é assunto da F5 (`alfaDoIcone` já viaja no
      // objeto, calculado, e ninguém o lê ainda). Ausente = 1, e é assim
      // que o ramo do FILME — que não passa pelas rampas — continua
      // pintando pixel a pixel o de sempre.
      ctx.globalAlpha = label.opacity * (label.alfaDoTexto ?? 1);
      ctx.textAlign = p.esquerda ? 'right' : 'left';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.96)';
      ctx.shadowBlur = 7;
      ctx.font = `${p.peso.pesoDoNome} ${p.peso.tamanhoDoNome * k}px ${FAMILIA}`;
      ctx.fillStyle = p.peso.corDoNome;
      ctx.fillText(this.nomes[i], p.textoX, p.textoY);

      ctx.shadowBlur = 6;
      ctx.font = `400 ${p.peso.tamanhoDoDetalhe * k}px ${FAMILIA}`;
      ctx.fillStyle = p.peso.corDoDetalhe;
      const detalheX = p.esquerda
        ? p.textoX - p.larguraDoNome - 9 * k
        : p.textoX + p.larguraDoNome + 9 * k;
      ctx.fillText(this.detalhes[i], detalheX, p.textoY);
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  /** o rótulo que não disputa nada — a resposta negativa da geometria */
  private static readonly FORA: PlanoDoRotulo = {
    candidato: false,
    caixaDoIcone: null,
    caixaDoTexto: null,
    ancoraX: 0,
    ancoraY: 0,
    textoX: 0,
    textoY: 0,
    esquerda: false,
    larguraDoNome: 0,
    peso: PESOS_DO_ROTULO.secundario,
  };

  /**
   * ONDE ESTE NOME POUSARIA, e se ele disputa espaço.
   *
   * SÃO DOIS RETÂNGULOS POR NOME (item 125, F3 · P6), como no Eyes: lá
   * são `"<nome>"` (o ponto do objeto) e `"<nome>-div"` (a caixa do
   * texto); aqui são a marca da ÂNCORA — o anel do corpo, ou o risco de
   * 10 px de quem não tem anel — e a caixa do texto. A diferença é
   * declarada: o retângulo do ponto deles tem tamanho (0,0) e não
   * disputa; o nosso ícone é um anel de 7 px que o visitante VÊ, e por
   * ordem do pacote da F3 ele disputa como o texto, testado à parte.
   */
  private geometria(label: StarLabel, i: number, k: number): PlanoDoRotulo {
    // P9 — quem já está escondido por outra causa sai da disputa. A
    // cessão por tamanho aparente (F2 · A5) é o `hidden` deles; o
    // quase-transparente é a lua colada no pai. Já a derrota na disputa
    // NÃO tira ninguém daqui: o perdedor continua sendo julgado, senão
    // nunca voltaria à tela quando o vencedor saísse de perto.
    const perdeuAntes = label.cortadoPelaRegua === true || label.saindo === true;
    if (label.causaDoSumico === 'tamanho') return LabelCanvas.FORA;
    if (!perdeuAntes && label.opacity < OPACIDADE_MINIMA_DO_ROTULO) return LabelCanvas.FORA;
    const ancoraX = label.x * this.width;
    const ancoraY = label.y * this.height;
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
    // propósito, é só o piso. Quem mede de verdade é a disputa, que
    // compara a CAIXA do rótulo com os retângulos que o App mediu (item
    // 56) e com as caixas dos vizinhos.
    if (ancoraY > this.height * (0.76 - 0.24 * (k - 1))) return LabelCanvas.FORA;
    if (
      ancoraY < this.height * 0.17 * k &&
      ancoraX > this.width * (0.62 - 0.38 * (k - 1))
    ) {
      return LabelCanvas.FORA;
    }
    const raio = 3.5 * k;
    const anel: Rect = {
      left: ancoraX - raio - 2 * k,
      right: ancoraX + raio + 2 * k,
      top: ancoraY - raio - 2 * k,
      bottom: ancoraY + raio + 2 * k,
    };
    const peso = pesoVisual(label);
    if (label.icone) {
      return {
        candidato: true,
        caixaDoIcone: anel,
        caixaDoTexto: null,
        ancoraX,
        ancoraY,
        textoX: ancoraX,
        textoY: ancoraY,
        esquerda: false,
        larguraDoNome: 0,
        peso,
      };
    }
    // No céu geral, o lado continua sendo a ÚNICA liberdade. O roteiro
    // pode dirigir um assunto: aí, e só aí, ele procura as linhas
    // alternativas antigas e assume a frente dos nomes de fundo.
    const ladoPreferido = ancoraX > this.width * 0.72;
    const fonteDoNome = `${peso.pesoDoNome} ${peso.tamanhoDoNome * k}px ${FAMILIA}`;
    const fonteDoDetalhe = `400 ${peso.tamanhoDoDetalhe * k}px ${FAMILIA}`;
    const larguraDoNome = this.medir(this.nomes[i], fonteDoNome);
    const larguraDoDetalhe = this.medir(this.detalhes[i], fonteDoDetalhe);
    const conteudo = larguraDoNome + 9 * k + larguraDoDetalhe;
    const caixaEm = (esquerda: boolean, y: number): Rect => {
      const x = ancoraX + (esquerda ? -1 : 1) * RECUO_DO_TEXTO * k;
      const left = esquerda ? x - conteudo : x;
      return {
        left: left - 5 * k,
        right: left + conteudo + 5 * k,
        top: y - 12 * k,
        bottom: y + 12 * k,
      };
    };
    let esquerda = ladoPreferido;
    let textoY = ancoraY;
    let caixaDoTexto = caixaEm(ladoPreferido, ancoraY);
    if (label.dirigido) {
      // A EXCEÇÃO DO FILME: só o assunto declarado procura outra linha.
      // O que ele evita é ESPAÇO OCUPADO por quem está vivo — o
      // perdedor da disputa não reserva nada, e por isso não conta aqui.
      busca: for (let lado = 0; lado < 2; lado++) {
        const esq = lado === 0 ? ladoPreferido : !ladoPreferido;
        for (const passo of DESLOCAMENTOS_DIRIGIDOS) {
          const y = ancoraY + passo * k;
          const tentativa = caixaEm(esq, y);
          if (this.ocupado(tentativa, 8 * k, label.key)) continue;
          const traco: Rect = {
            left: Math.min(ancoraX, ancoraX + (esq ? -1 : 1) * 10 * k),
            right: Math.max(ancoraX, ancoraX + (esq ? -1 : 1) * 10 * k),
            top: Math.min(ancoraY, y),
            bottom: Math.max(ancoraY, y),
          };
          if (this.reservadas.some((rect) => intersects(traco, rect, 0))) continue;
          esquerda = esq;
          textoY = y;
          caixaDoTexto = tentativa;
          break busca;
        }
      }
    }
    const direcao = esquerda ? -1 : 1;
    const risco: Rect = {
      left: Math.min(ancoraX, ancoraX + direcao * 10 * k),
      right: Math.max(ancoraX, ancoraX + direcao * 10 * k),
      top: ancoraY - 2 * k,
      bottom: ancoraY + 2 * k,
    };
    return {
      candidato: true,
      caixaDoIcone: label.comAnel ? anel : risco,
      caixaDoTexto,
      ancoraX,
      ancoraY,
      textoX: ancoraX + direcao * RECUO_DO_TEXTO * k,
      textoY,
      esquerda,
      larguraDoNome,
      peso,
    };
  }

  /** há alguém VIVO nesta caixa? (a busca de linha alternativa do filme) */
  private ocupado(r: Rect, folga: number, dono: string): boolean {
    if (this.reservadas.some((rect) => intersects(r, rect, folga))) return true;
    this.achados.length = 0;
    this.consulta.left = r.left - folga;
    this.consulta.right = r.right + folga;
    this.consulta.top = r.top - folga;
    this.consulta.bottom = r.bottom + folga;
    this.arvore.consultar(this.consulta, this.achados);
    for (const v of this.achados) {
      if (v.dono === dono) continue;
      // quem está escondido não reserva — MAS quem já foi POSTO neste
      // quadro reserva mesmo carregando o veredito velho: ele ainda vai
      // ser julgado hoje, e dois assuntos do roteiro não podem escolher a
      // mesma linha por causa da ordem em que foram planejados
      if (this.escondidoNaDisputa(v.dono) && !this.colocados.has(v.dono)) continue;
      return true;
    }
    return false;
  }

  /**
   * ESTE NOME ESTÁ ESCONDIDO PELA DISPUTA? (F3 · P9) — o veredito vivo,
   * ou a marca que o produtor já pôs no objeto (`cortadoPelaRegua` /
   * `saindo`, que são o `hiddenByLabelQuadtree` deles vindo de volta do
   * quadro anterior). As duas dizem a mesma coisa; ler as duas é o que
   * mantém a lei válida no primeiro quadro de um canvas novo.
   */
  private escondidoNaDisputa(chave: string): boolean {
    if (this.veredito.get(chave) === true) return true;
    const l = this.porChave.get(chave);
    return l !== undefined && (l.cortadoPelaRegua === true || l.saindo === true);
  }

  /**
   * A DISPUTA DE UM NOME (item 125, F3 · P3/P4/P9) — e ela é PAREADA,
   * não por ordem de chegada.
   *
   * Até 01/09 quem chegava primeiro na lista ocupava, e a lista chegava
   * ordenada: o resultado era o mesmo na maioria dos casos, mas a
   * decisão dependia de QUEM MAIS estava na lista naquele quadro. No
   * Eyes cada nome consulta a quadtree e compara-se com cada vizinho
   * pelo comparador completo (peso → profundidade → alfabética): a
   * relação é uma ordem total entre DOIS nomes, e não muda porque um
   * terceiro entrou em quadro.
   *
   * O HUD é o oponente que ninguém vence: a mesma lei que faz um nome
   * ceder a outro o faz ceder ao painel, ao rodapé e ao selo — sem caso
   * novo, sem z-index, sem `!important`.
   */
  private disputar(label: StarLabel, p: PlanoDoRotulo, k: number): boolean {
    // QUAL DOS DOIS RETÂNGULOS DISPUTA — e aqui o fonte deles é
    // explícito (P6): *"Só retângulos terminados em `-div` participam da
    // disputa — o outro está lá para consultas de interseção"*. O `-div`
    // é a caixa do TEXTO; o outro é o ponto do objeto, que lá tem
    // tamanho (0,0) e por isso nunca derrubaria nada.
    //
    // OS DOIS ENTRAM NA ÁRVORE assim mesmo, e é isso que a nossa marca
    // de âncora acrescenta ao desenho deles: ela tem 7 px de anel (ou 10
    // de risco) e um NOME não pode pousar em cima dela. Ou seja: a marca
    // é OPONENTE de todo mundo, mas não é ela que perde a vaga — quem
    // perde é sempre o nome que não coube.
    //
    // A entrada SÓ-ÍCONE (item 89) não tem par no Eyes — lá o `<div>`
    // sempre existe e sempre carrega a caixa. Sem texto, a marca É o
    // rótulo, e é ela que disputa.
    const caixa = p.caixaDoTexto ?? p.caixaDoIcone;
    if (caixa === null) return false;
    return this.perdePara(label, caixa, p.caixaDoTexto ? 8 * k : 2 * k);
  }

  private perdePara(label: StarLabel, caixa: Rect, folga: number): boolean {
    if (this.reservadas.some((rect) => intersects(caixa, rect, folga))) return true;
    this.achados.length = 0;
    this.consulta.left = caixa.left - folga;
    this.consulta.right = caixa.right + folga;
    this.consulta.top = caixa.top - folga;
    this.consulta.bottom = caixa.bottom + folga;
    this.arvore.consultar(this.consulta, this.achados);
    for (const v of this.achados) {
      if (v.dono === label.key) continue;
      // P9 — um oponente só derruba se ele próprio não estiver oculto
      if (this.escondidoNaDisputa(v.dono)) continue;
      const oponente = this.porChave.get(v.dono);
      if (!oponente) continue;
      if (ordemDaDisputa(oponente, label) < 0) return true;
    }
    return false;
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
    // "A raiz é reconstruída sozinha quando o viewport muda de tamanho"
    // (P5, literal): a árvore nasce com o tamanho da tela, e caixa de
    // quadro velho não sobrevive a uma janela nova.
    this.arvore.redimensionar(width, height);
    this.veredito.clear();
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
