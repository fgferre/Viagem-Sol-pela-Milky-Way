// ============================================================
// OS RÓTULOS do céu — a projeção por quadro (estrelas, corpos e luas),
// a etiqueta forçada do beat, a linha de rumo ("→ DESTINO · distância
// viva") e a distância viva do Sol. Morava no director.ts com os campos
// a ~2.700 linhas do bloco do tick (onda da arquitetura, Parte 1,
// corte 7); a semântica é a mesma, linha a linha. As arestas viraram
// fios nomeados: onLabels, onDest, onSol e beatDaViagem (o
// `rig.metaAt(journeyT)` que só o ramo da viagem paga). O clicar-para-
// visitar continua no director (é gesto de navegação): ele lê a última
// projeção pelo getter `alvos` — a mesma lista única da pendência 30.
// ============================================================
import * as THREE from 'three';
import {
  PRIORIDADE_DO_ROTULO,
  RampasDeRotulo,
  aplicarReguaDeRelevancia,
  prioridadeDeEstrela,
  projectCorpos,
  projectLabels,
  projectForced,
} from '../world/labels';
import type { OclusorDeRotulo, StarLabel } from '../world/labels';
import { GAL } from '../world/galaxy';
import { numeroDoIdioma } from '../tempoDoAtlas';
import { t } from '../../lib/idioma';
import { notaDeDistancia } from '../../lib/unidades';
import { cenaPcParaHeliocentricaEclipticaUA } from '../../lib/atlas/frameGalactico';
import { UA_POR_PC } from '../world/planetas/planetas';
import type { Planetas } from '../world/planetas/planetas';
import { RAIO_DO_SOL_NA_CENA } from '../escala';
import { CHAVE_DE_CORPO, CORPOS_DO_SISTEMA, LUAS_DO_SISTEMA } from '../atlasConfig';
import { corDaOrbita } from '../world/orbitas';
import type { NamedStar } from '../config';
import type { Phase } from '../fases';
import type { JourneyMeta } from '../cinematic/journey';

/** o que o quadro de agora entrega à projeção — estado vivo do director */
export interface QuadroDeRotulos {
  fase: Phase;
  /** `meta.named` do catálogo; `null` enquanto o boot não o entregou */
  named: NamedStar[] | null;
  /** distância da câmera à casa, em pc — o filtro editorial de perto */
  dHome: number;
  /** a camada dos dez corpos (rótulos só onde ela está DESENHADA) */
  planetas: Planetas | null;
  /**
   * O CORPO EM FOCO no Atlas (id do retrato) — `null` quando o que está
   * em quadro é o sistema ou uma estrela. É a única entrada que o
   * produtor de rótulos precisa da escada: o alvo escolhido tem
   * prioridade 100 e não cede a nada (item 73).
   */
  foco: string | null;
  /**
   * A CAMADA "NOMES NA TELA" ESTÁ DESLIGADA? (item 82, N2 — a flag
   * `nonomes` da tabela única `CAMADAS`.) É o gesto do visitante: as
   * órbitas tinham `noorbitas` e os nomes não tinham nada, e o único
   * jeito de calar a tela era sair do Atlas.
   *
   * Quem lê a flag é o Director, com o `hide.has` de todas as outras —
   * o produtor recebe a resposta pronta, do mesmo jeito que recebe a
   * fase e o foco. Desliga TODOS os nomes: é a chave `Labels` do NASA
   * Eyes, não um filtro por classe. Quem decide quem aparece com ela
   * LIGADA é a régua de relevância.
   */
  nomesEscondidos: boolean;
  /** a camada de ÍCONES dos corpos (item 89) — separada do texto, como
   *  no Eyes: com os nomes desligados os corpos mantêm um marcador
   *  clicável; com as duas desligadas, o silêncio de sempre. */
  iconesEscondidos: boolean;
  /** BETA dos rótulos 3D (item 109): o TEXTO dos corpos é pintado na
   *  cena pelo `Rotulos3d`; o 2D segue dono das leis e do anel. */
  texto3d: boolean;
}

/**
 * O TETO DE CANDIDATAS ESTELARES do Atlas — e ele é DECLARADO, não
 * escondido (item 73, plano §3).
 *
 * O teto de 7 morreu: quem decide quem aparece passou a ser a
 * hierarquia mais a colisão, e um corte numérico antes disso jogava
 * fora Saturno para caber uma vizinha a 40 pc. Mas a lista das nomeadas
 * tem 1.726 entradas e o laço de colisão é quadrático no que sobra —
 * então o dique fica, no lugar certo: 24 CANDIDATAS, o suficiente para
 * a colisão ter de onde escolher e pouco o bastante para o custo por
 * quadro não sair do desprezível.
 */
export const TETO_DE_CANDIDATAS_ESTELARES = 24;

/**
 * A SEPARAÇÃO NA TELA, em fração de largura, em que uma LUA vira
 * assunto. Abaixo de `LUA_ACENDE_EM` o nome dela está em cima do nome do
 * pai e não diz nada; acima de `LUA_ACESA_EM` ela é um objeto próprio no
 * quadro. É o "fade por tamanho angular" da §3 do plano, escrito na
 * grandeza que a decisão realmente usa — o que separa "Titã" de
 * "Saturno" na tela não é a distância à câmera, é o quanto os dois
 * pontos se afastaram um do outro.
 */
export const LUA_ACENDE_EM = 0.012;
export const LUA_ACESA_EM = 0.035;

/** linear [0..1] → canal sRGB 0..255 (a curva exata, não gama 2,2) */
function srgb255(u: number): number {
  const v = u <= 0.0031308 ? u * 12.92 : 1.055 * u ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
}

/** a cor CSS do anel de um corpo — a MESMA da linha de órbita (item
 *  83); as luas herdam a do pai, como as linhas herdam. Cache por id:
 *  a cor não muda em sessão. */
const PAI_DA_LUA = new Map(LUAS_DO_SISTEMA.map((l) => [l.id, l.pai] as const));
const coresDeAnel = new Map<string, string | undefined>();
function corDeAnelCss(id: string, paiId?: string): string | undefined {
  const chave = paiId ? `${id}<${paiId}` : id;
  if (coresDeAnel.has(chave)) return coresDeAnel.get(chave);
  const c = corDaOrbita(paiId ?? id);
  const css = c
    ? `rgba(${srgb255(c[0])}, ${srgb255(c[1])}, ${srgb255(c[2])}, 0.9)`
    : undefined;
  coresDeAnel.set(chave, css);
  return css;
}

export class Rotulos {
  /** última projeção de rótulos — alvo do clicar-para-visitar */
  private lastLabels: StarLabel[] = [];
  private prevLabelKeys = new Set<string>();
  /**
   * QUEM PERDEU A VAGA NO QUADRO ANTERIOR (item 125, F3 · P4) — a
   * realimentação que fecha o ciclo entre a colisão e as rampas.
   *
   * A ORDEM DO QUADRO é: projetar → ordenar → **marcar os perdedores de
   * ontem** → rampas → desenhar/julgar. O veredito só existe depois do
   * desenho, então ele chega aqui um quadro depois; é a mesma latência
   * do Eyes, onde o `LabelQuadtree` põe a classe CSS e a transição de
   * 750 ms começa no quadro seguinte.
   *
   * Era `prevDesenhados`, e servia ao bônus de histerese de 20% do
   * `pesoDoRotulo` — que a F3 aposentou: quem segura o pisca-pisca é a
   * rampa de saída somada ao desempate total do P3, como no Eyes.
   */
  private perdedoresDaVaga = new Set<string>();
  private lastDest = '';
  private destTimer = 0;
  private lastSol = '';
  private solTimer = 0;
  private lastLente = '';
  private lenteTimer = 0;
  /** a última posição de câmera PUBLICADA, em pc de cena (item 74) */
  private readonly ultimaCam = new THREE.Vector3(NaN, NaN, NaN);
  private camTimer = 0;
  /** alguém do outro lado está LENDO a câmera? Ver `emitCamera`. */
  private cameraTemLeitor = false;
  /** posições VIVAS das luas para os rótulos (projectCorpos) —
   *  3 floats por entrada de `LUAS_DO_SISTEMA`, NaN sem efeméride
   *  (projectCorpos ignora NaN — rótulo só onde há corpo). */
  private readonly luaPosParaRotulo = new Float32Array(
    LUAS_DO_SISTEMA.length * 3
  ).fill(Number.NaN);
  /**
   * OS DISCOS QUE ESCONDEM NOME — o Sol na cabeça, os corpos do quadro
   * atrás dele (item 47 + item 115, bloco B, peça 2).
   *
   * O Sol entrou primeiro ("vejo estrelas através do sol") e era o
   * ÚNICO: o comentário de então dizia que planeta é disco de minutos de
   * arco e só importa em close — mas é exatamente em close que o nome
   * atravessa o globo, e o mergulho 08 fotografou o resultado (FOMALHAUT
   * e ALNAIR impressos em branco sobre o disco iluminado da Terra,
   * descrevendo estrelas que estão ATRÁS do planeta). O Eyes oclui por
   * qualquer corpo (`isPositionOccluded`, por rótulo, todo quadro).
   *
   * A ENTRADA ZERO É PERMANENTE e não vem da camada: o Sol está na
   * ORIGEM do mundo heliocêntrico por definição, e vale mesmo antes de
   * existir efeméride. Da entrada 1 em diante a lista é REMONTADA por
   * quadro a partir das posições vivas — os objetos são reusados
   * (`poolDeOclusores`), então nenhum quadro aloca.
   */
  private readonly oclusoresDeRotulo: OclusorDeRotulo[] = [
    { x: 0, y: 0, z: 0, raio: RAIO_DO_SOL_NA_CENA, chave: `${CHAVE_DE_CORPO}sun` },
  ];
  /** os oclusores de corpo, reusados quadro a quadro (ver acima) */
  private readonly poolDeOclusores: OclusorDeRotulo[] = [];
  /** raio físico por id — não muda em sessão, e o fio é da escada */
  private readonly raiosDeCorpo = new Map<string, number | null>();
  /**
   * A CHAVE DO RÓTULO QUE O PONTEIRO APONTA (item 125, F2 · A12) — o
   * MESMO gesto que a F1 usou para acender a linha de órbita (L11), e
   * por isso o mesmo quadro: quem escreve é `Director.apontarRotulo`,
   * do hit-test da lista única dos desenhados.
   *
   * Aqui ele vale para QUALQUER rótulo, não só para corpo: a linha só
   * existe para corpo, mas o alfa do texto é do rótulo — no Eyes o
   * `:hover` está na folha do `<div>`, que toda entidade rotulada tem.
   */
  apontado: string | null = null;
  /** as rampas de 250/750 ms dos nomes (item 115, bloco B) */
  private readonly rampas = new RampasDeRotulo();
  /**
   * O TEMPO QUE AS RAMPAS AINDA NÃO GASTARAM. `tique` acumula, `projetar`
   * consome e zera — assim um quadro em que a projeção não roda não some
   * com o tempo dele nem o faz contar duas vezes.
   */
  private dtDeRampa = 0;

  private readonly fios: {
    onLabels: (labels: StarLabel[]) => void;
    /** linha de rumo ("→ DESTINO · distância viva"); vazio = esconder */
    onDest: (text: string) => void;
    /** distância viva do Sol ("SOL · 40,2 UA"); vazio = esconder */
    onSol: (text: string) => void;
    /**
     * ONDE A CÂMERA ESTÁ, em eclíptica heliocêntrica UA — só no Atlas, e
     * só quando ela se MOVE (item 74, parte B).
     *
     * A ficha do objeto diz quanto do disco está iluminado visto DAQUI, e
     * "daqui" é a câmera. A conta é da ficha; o que este fio entrega é a
     * posição, no mesmo remédio de 4 Hz do rumo e do Sol — sem ele, um
     * `setState` por quadro re-renderizaria o HUD inteiro durante todo
     * arrasto. `null` fora do Atlas: lá não há ficha, e mandar posição
     * para ninguém é pagar alocação por quadro no filme.
     */
    onCamera: (posUA: readonly [number, number, number] | null) => void;
    /**
     * O INDICADOR DE FOTOGRAFIA (item 100) — "LENTE 34° · SOL 412 UA",
     * só no FILME; vazio = esconder. É a resposta ao caso das Três
     * Marias, ideia dele em 25/08: no filme não dá para saber se "o
     * ponto de observação está mudando ou o zoom está sendo ativado".
     * A LENTE denuncia o zoom (o roteiro varre 15°–60°) e a distância
     * denuncia o dolly — os dois números lado a lado desfazem a
     * ambiguidade. Mesmo remédio de 4 Hz do rumo e do Sol.
     */
    onLente: (text: string) => void;
    /** o meta do beat da viagem — só o ramo `journey` o paga */
    beatDaViagem: () => JourneyMeta;
    /**
     * O RAIO FÍSICO de um corpo pelo id, na unidade da cena — a fonte é
     * a escada (`raioFisicoDe`), a MESMA que dá o piso do zoom, o raio
     * das malhas e o avanço do nome 3D sobre a casca. Aqui ela mede o
     * disco que esconde rótulo (item 115, bloco B, peça 2); uma segunda
     * tabela de raios seria a segunda verdade que a primeira desmentiria.
     */
    raioFisicoDe: (id: string) => number | null;
  };

  constructor(fios: Rotulos['fios']) {
    this.fios = fios;
  }

  /** a última projeção — a lista ÚNICA que o clique lê (pendência 30) */
  get alvos(): StarLabel[] {
    return this.lastLabels;
  }

  /** posição de MUNDO viva de um corpo pela chave do rótulo — o
   *  consumidor é o `Rotulos3d` (item 109); null sem efeméride. */
  posicaoDoCorpo(
    key: string,
    posicoesPlanetas: Float32Array | null,
    idsPlanetas: readonly { id: string }[]
  ): readonly [number, number, number] | null {
    const id = key.slice(6);
    const iLua = LUAS_DO_SISTEMA.findIndex((l) => l.id === id);
    const fonte = iLua >= 0 ? this.luaPosParaRotulo : posicoesPlanetas;
    const i = iLua >= 0 ? iLua : idsPlanetas.findIndex((c) => c.id === id);
    if (!fonte || i < 0) return null;
    const x = fonte[i * 3];
    if (!Number.isFinite(x)) return null;
    return [x, fonte[i * 3 + 1], fonte[i * 3 + 2]];
  }

  /**
   * A LISTA DE OCLUSORES DESTE QUADRO — o Sol mais cada corpo e lua com
   * posição viva (item 115, bloco B, peça 2).
   *
   * SEM FILTRO DE TAMANHO, de propósito: um corpo pequeno na tela tem
   * cone pequeno, e o próprio teste do cone o descarta — um limiar em
   * pixels aqui seria um segundo critério para a mesma pergunta, e
   * erraria justamente no caso que interessa (a lua que passa
   * rasante atrás do pai).
   */
  private montarOclusores(planetas: Planetas | null) {
    // a entrada zero é o Sol, e ela não se remonta
    this.oclusoresDeRotulo.length = 1;
    if (!planetas) return;
    this.somarOclusores(CORPOS_DO_SISTEMA, planetas.posicoes);
    this.somarOclusores(LUAS_DO_SISTEMA, this.luaPosParaRotulo);
  }

  private somarOclusores(
    corpos: readonly { id: string; chave: string }[],
    posicoes: Float32Array
  ) {
    for (let i = 0; i < corpos.length && (i + 1) * 3 <= posicoes.length; i++) {
      if (corpos[i].id === 'sun') continue; // já é a entrada zero
      const x = posicoes[i * 3];
      const y = posicoes[i * 3 + 1];
      const z = posicoes[i * 3 + 2];
      // sem efeméride não há disco: NaN não esconde nada
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
      const raio = this.raioDeCorpo(corpos[i].id);
      if (raio === null || !(raio > 0)) continue;
      const n = this.oclusoresDeRotulo.length;
      let o = this.poolDeOclusores[n - 1];
      if (!o) {
        o = { x: 0, y: 0, z: 0, raio: 0 };
        this.poolDeOclusores[n - 1] = o;
      }
      o.x = x;
      o.y = y;
      o.z = z;
      o.raio = raio;
      o.chave = corpos[i].chave;
      this.oclusoresDeRotulo.push(o);
    }
  }

  /**
   * O RAIO DE CENA de um corpo pelo id, memoizado — a fonte é a escada
   * (`raioFisicoDe`) e ele não muda em sessão. DOIS fregueses: o disco
   * que esconde nome (item 115) e, desde 01/09, a régua de aparição por
   * tamanho aparente (item 125, F2 · A5).
   */
  private raioDeCorpo(id: string): number | null {
    let raio = this.raiosDeCorpo.get(id);
    if (raio === undefined) {
      raio = this.fios.raioFisicoDe(id);
      this.raiosDeCorpo.set(id, raio);
    }
    return raio;
  }

  /**
   * O MESMO raio, pela CHAVE do rótulo — o formato que `projectCorpos`
   * fala. Campo e não método para não alocar um fecho por quadro: são
   * quatro chamadas de projeção em cada tique.
   */
  private readonly raioPorChave = (chave: string): number | null =>
    this.raioDeCorpo(chave.slice(CHAVE_DE_CORPO.length));

  /**
   * AS POSIÇÕES VIVAS DAS LUAS, para quem mais precisar delas neste
   * tique — hoje as LINHAS DE ÓRBITA (item 125, F7: a órbita de uma lua
   * cede quando a lua enche a tela, e a régua é a distância ao CORPO).
   *
   * Devolve o array em si, não uma cópia: é o mesmo contrato de
   * `Planetas.posicoes`, e copiar por quadro seria pagar 21 vezes por
   * um número que já está certo. Quem lê aceita `NaN` — é assim que
   * "sem efeméride" viaja aqui desde que o campo nasceu.
   */
  get posicoesDasLuas(): Float32Array {
    return this.luaPosParaRotulo;
  }

  /** escreve o centro vivo no slot da lua em `luaPosParaRotulo`. */
  escreverPosicaoDeLua(id: string, centro: THREE.Vector3) {
    const i = LUAS_DO_SISTEMA.findIndex((l) => l.id === id);
    if (i < 0) return;
    this.luaPosParaRotulo[i * 3] = centro.x;
    this.luaPosParaRotulo[i * 3 + 1] = centro.y;
    this.luaPosParaRotulo[i * 3 + 2] = centro.z;
  }

  /**
   * A LUA COLADA NO PAI NÃO TEM O QUE DIZER. Mede a separação NA TELA
   * entre a lua e o pai dela (fração da largura, que é a unidade em que
   * `x`/`y` chegam) e esmaece com `smoothstep` entre `LUA_ACENDE_EM` e
   * `LUA_ACESA_EM`; o `LabelCanvas` descarta abaixo de 0,08 de opacidade
   * e o clique descarta abaixo de 0,15, então o nome some antes de
   * roubar vaga e antes de roubar clique.
   *
   * Pai fora do quadro não esmaece nada: se o planeta não está
   * projetado, a lua É o único objeto ali e o nome dela é a informação.
   */
  private esmaecerLuasColadasNoPai(
    corpos: readonly StarLabel[],
    luas: readonly StarLabel[]
  ) {
    if (luas.length === 0) return;
    for (const lua of luas) {
      const entrada = LUAS_DO_SISTEMA.find((l) => l.chave === lua.key);
      if (!entrada) continue;
      const pai = corpos.find((c) => c.key === `${CHAVE_DE_CORPO}${entrada.pai}`);
      if (!pai) continue;
      const sep = Math.hypot(lua.x - pai.x, lua.y - pai.y);
      lua.opacity *= THREE.MathUtils.smoothstep(sep, LUA_ACENDE_EM, LUA_ACESA_EM);
    }
  }

  /**
   * A FICHA ABRIU (ou fechou) — o único leitor da câmera se declara.
   * Ver `emitCamera`: sem esta porta, publicar era trabalho feito para
   * ninguém, 4 vezes por segundo, durante todo arrasto no Atlas.
   */
  lerCamera(quer: boolean) {
    this.cameraTemLeitor = quer;
  }

  /**
   * A LISTA DO QUADRO SAI POR AQUI, e a rampa é o último passo antes do
   * fio (item 115, bloco B). Um lugar só, e por dois motivos: a rampa
   * precisa correr em TODO quadro do céu navegado — inclusive nos que
   * publicam lista vazia, senão a memória de quem sumiu congela em vez
   * de esvair —, e a régua tem de ter dito a última palavra antes dela.
   *
   * O FILME NÃO ENTRA: lá o assunto do beat é etiqueta forçada, sem
   * fades, por regra editorial ("o assunto sempre tem nome"), e os
   * planos são pinados quadro a quadro.
   */
  private publicar(labels: StarLabel[], dt: number, fase: Phase) {
    if (fase !== 'journey') {
      // O HOVER ENTRA AQUI, no MESMO funil das rampas e no MESMO quadro
      // do gesto (item 125, F2 · A12/A13): um `mouseenter` no nome, dois
      // efeitos — a linha engrossa sem transição (F1 · L10) e o alfa do
      // texto sobe em 250 ms. A marca é do quadro, nunca do objeto: a
      // projeção nasce nova a cada tique e o ponteiro pode ter saído.
      if (this.apontado !== null) {
        for (const l of labels) if (l.key === this.apontado) l.apontado = true;
      }
      this.rampas.aplicar(labels, dt);
    }
    // O NOME OCLUÍDO SAI DA LISTA QUANDO A TINTA ACABA (item 125, F4).
    //
    // Ele entra na lista só para a rampa de 750 ms ter onde correr
    // (`projectCorpos`/`projectLabels` deixaram de dar `continue` na
    // oclusão); passada a rampa, ficar seria um zumbi — um nome de
    // opacidade zero atrás de um globo, pago em `planejar` e em
    // `geometria` sessenta vezes por segundo, por toda a sessão. Saindo,
    // a projeção em regime é NOME A NOME a de antes da F4, e é isso que
    // faz esta peça mudar o COMO sem mudar o QUEM.
    //
    // NO FILME NÃO HÁ RAMPA (o assunto do beat é etiqueta forçada, sem
    // fades — ver acima), então lá o ocluído sai no MESMO quadro: é
    // exatamente o `continue` que ele tinha antes desta fase.
    const semRampa = fase === 'journey';
    for (let i = labels.length - 1; i >= 0; i--) {
      const l = labels[i];
      if (l.causaDoSumico === 'oclusao' && (semRampa || !(l.opacity > 0))) labels.splice(i, 1);
    }
    this.fios.onLabels(labels);
  }

  /** os relógios de 4 Hz do rumo e do Sol andam com o quadro */
  tique(dt: number) {
    this.destTimer += dt;
    this.solTimer += dt;
    this.camTimer += dt;
    this.lenteTimer += dt;
    this.dtDeRampa += dt;
  }

  /**
   * OS NOMES FORÇADOS DO BEAT — a fala do roteiro, num lugar só.
   *
   * Ela tem DOIS chamadores de propósito: o ramo do filme, onde os
   * forçados se somam aos nomes da régua; e o gate da camada desligada,
   * onde eles são a ÚNICA coisa que sobra. Uma segunda cópia aqui seria a
   * divergência silenciosa entre "o que o filme diz" e "o que o filme diz
   * com os nomes desligados".
   */
  private forcadosDoBeat(
    cam: THREE.PerspectiveCamera,
    named: NamedStar[],
    target: readonly string[] | undefined
  ): StarLabel[] {
    const forced: StarLabel[] = [];
    for (const name of target ?? []) {
      const l = this.resolveForcedLabel(cam, named, name);
      if (l) {
        l.dirigido = true;
        forced.push(l);
      }
    }
    return forced;
  }

  /** etiqueta forçada do assunto do shot ('SOL' | 'SGR' | nome HYG) */
  private resolveForcedLabel(
    cam: THREE.PerspectiveCamera,
    named: NamedStar[],
    name: string
  ): StarLabel | null {
    if (name === 'SOL') {
      return projectForced(cam, 'SOL', 'G2V', { x: 0, y: 0, z: 0 }, 'sol-home');
    }
    if (name === 'SGR') {
      return projectForced(cam, 'Sagittarius A✱', 'SMBH', GAL.GC_POS, 'sgr-a');
    }
    const star = named.find((s) => s.n === name);
    return star ? projectForced(cam, star.n, star.s, star, star.n) : null;
  }

  /** "→ DESTINO · distância viva" — só emite quando o texto muda */
  private emitDest(
    dest: string | undefined,
    camPos: THREE.Vector3,
    named: NamedStar[] | null
  ) {
    let text = '';
    if (dest) {
      const target = dest === 'SGR' ? GAL.GC_POS : named?.find((s) => s.n === dest);
      if (target) {
        const d = camPos.distanceTo(
          target instanceof THREE.Vector3
            ? target
            : new THREE.Vector3(target.x, target.y, target.z)
        );
        // A QUARTA CÓPIA DA ESCADA MORREU AQUI (2026-08-14). Esta linha
        // fazia `d * 3.262` e escrevia "1953 AL" com ponto decimal,
        // enquanto o rótulo da mesma estrela, um palmo acima na mesma
        // tela, já dizia "16,9 anos-luz" — duas grafias e dois
        // separadores convivendo. Agora é a escada única
        // (`lib/unidades`), a mesma de `LabelCanvas` e da paleta de
        // busca. `src/three` pode importar de `src/lib`; o contrário é
        // que inverteria a seta, e por isso o formatador pt-BR continua
        // entrando INJETADO.
        //
        // O `UA_POR_PC` usado é o que este arquivo já importava de
        // `world/planetas` (derivado de `AU_PARA_PC`): é o MESMO número
        // do de `lib/unidades` até a 11ª casa, e um segundo símbolo com
        // o mesmo nome no mesmo arquivo custaria mais do que resolve.
        //
        // SEM MEDIDA, SEM NÚMERO: `notaDeDistancia` devolve `null`
        // quando a distância não é positiva e finita — aí fica só o
        // nome do destino, em vez do "0.0 AL" que a cópia antiga
        // escrevia ao chegar em cima do alvo.
        const nota = notaDeDistancia(d * UA_POR_PC, numeroDoIdioma);
        const label = dest === 'SGR' ? 'SAGITTARIUS A✱' : dest.toUpperCase();
        text = nota ? `→ ${label} · ${nota}` : `→ ${label}`;
      }
    }
    // aparecer/sumir é imediato; o contador vivo atualiza a 4 Hz
    const changedKind = (text === '') !== (this.lastDest === '');
    if (text !== this.lastDest && (changedKind || this.destTimer > 0.25)) {
      this.lastDest = text;
      this.destTimer = 0;
      this.fios.onDest(text);
    }
  }

  /**
   * "SOL · distância viva" — a medida do afastamento que o dono pediu
   * (item 44, R3: "infelizmente nao tem medida de distancia para provar
   * isso"). Só no voo livre — o filme guarda a dramaturgia e o Atlas tem
   * o próprio enquadramento (`HUD_POR_FASE` concorda: `sol` só em
   * 'free'). A escada de unidades é a MESMA dos rótulos e da linha de
   * rumo (`lib/unidades`, injetada com o pt-BR da casa) — uma quinta
   * cópia não nasce aqui. O Sol está na ORIGEM do mundo heliocêntrico,
   * então a distância é o comprimento da posição da câmera; mesmo
   * remédio de 4 Hz do rumo contra o setState por quadro.
   */
  private emitSol(camPos: THREE.Vector3, fase: Phase) {
    let text = '';
    if (fase === 'free') {
      const nota = notaDeDistancia(camPos.length() * UA_POR_PC, numeroDoIdioma);
      if (nota) text = t('cena.sol', { nota });
    }
    const changedKind = (text === '') !== (this.lastSol === '');
    if (text !== this.lastSol && (changedKind || this.solTimer > 0.25)) {
      this.lastSol = text;
      this.solTimer = 0;
      this.fios.onSol(text);
    }
  }

  /**
   * "LENTE 34° · SOL 412 UA" — o indicador de fotografia (item 100),
   * só no FILME (`HUD_POR_FASE` concorda: `lente` só em 'journey' —
   * é lá que o roteiro varre a lente de 15° a 60° e nasce a dúvida
   * das Três Marias; no voo livre e no Atlas a lente é o pino fixo da
   * casa e a distância já tem as próprias linhas). O fov é o VERTICAL
   * da câmera, arredondado a grau inteiro — é o pulso do número que
   * denuncia o zoom; a distância usa a MESMA escada de unidades de
   * todo mostrador (`lib/unidades`). Mesmo remédio de 4 Hz.
   */
  private emitLente(cam: THREE.PerspectiveCamera, fase: Phase) {
    let text = '';
    if (fase === 'journey') {
      const nota = notaDeDistancia(cam.position.length() * UA_POR_PC, numeroDoIdioma);
      const graus = Math.round(cam.fov);
      if (nota && Number.isFinite(graus)) text = t('cena.lente', { graus, nota });
    }
    const changedKind = (text === '') !== (this.lastLente === '');
    if (text !== this.lastLente && (changedKind || this.lenteTimer > 0.25)) {
      this.lastLente = text;
      this.lenteTimer = 0;
      this.fios.onLente(text);
    }
  }

  /**
   * A CÂMERA EM ECLÍPTICA, a 4 Hz, só quando ela andou e SÓ COM A FICHA
   * ABERTA. O gatilho do movimento é o MESMO de `escreverFase` na camada
   * de planetas — comparar o vetor com o anterior —, porque a pergunta é
   * a mesma: mudou o ponto de onde se olha?
   *
   * O LEITOR ENTRA NA CONTA porque o destino é `setState`: a
   * ficha é a única que lê esta posição, e com ela FECHADA cada
   * publicação re-renderizava o HUD inteiro por um painel que ninguém
   * abriu — 4 vezes por segundo, durante todo arrasto no Atlas. Fora do
   * Atlas, ou sem leitor, publica `null` UMA vez e cala; ao voltar, o
   * `ultimaCam` já é NaN e o quadro seguinte republica sozinho, mesmo
   * com a câmera parada — que é o que faz a ficha nascer com a posição
   * de AGORA e não com a da última vez.
   */
  private emitCamera(camPos: THREE.Vector3, fase: Phase) {
    if (fase !== 'atlas' || !this.cameraTemLeitor) {
      if (!Number.isNaN(this.ultimaCam.x)) {
        this.ultimaCam.set(NaN, NaN, NaN);
        this.fios.onCamera(null);
      }
      return;
    }
    if (this.ultimaCam.equals(camPos) || this.camTimer <= 0.25) return;
    this.ultimaCam.copy(camPos);
    this.camTimer = 0;
    this.fios.onCamera(cenaPcParaHeliocentricaEclipticaUA([camPos.x, camPos.y, camPos.z]));
  }

  /**
   * A PROJEÇÃO DO QUADRO — rótulos a cada frame (a 10 Hz eles "nadavam"
   * contra as estrelas; 7 projeções + um canvas 2D pequeno: custo
   * desprezível). Na viagem, menos rótulos (cinema); no voo livre, mais
   * (são os alvos do clicar-para-visitar). O Atlas entra pelo ramo do
   * voo livre: rótulos fartos e sem filtro editorial de centro — lá eles
   * são os ALVOS do clicar-para-focar, não a moldura de um beat
   * (fundação da busca da F3). A distância viva do Sol roda todo tique e
   * se auto-apaga fora do voo.
   */
  projetar(cam: THREE.PerspectiveCamera, quadro: QuadroDeRotulos) {
    const { fase, named, dHome, planetas } = quadro;
    // O TEMPO DAS RAMPAS, consumido de uma vez (ver `dtDeRampa`). O FILME
    // NÃO ENTRA: lá o assunto do beat é etiqueta forçada, sem fades, por
    // regra editorial — a rampa é do céu que o visitante navega.
    const dtDaRampa = this.dtDeRampa;
    this.dtDeRampa = 0;
    // OS DISCOS DO QUADRO, antes de qualquer projeção: eles valem para
    // as estrelas e para os corpos, e a lista é a mesma nos dois ramos.
    this.montarOclusores(planetas);
    // A ISENÇÃO DO ALVO SEGUIDO (item 125, F4 · O11): o corpo em foco não
    // é escondido por globo nenhum — o `setCanBeOccluded(false)` deles,
    // que o `unfollow` desfaz. Aqui o "desfazer" é de graça: a chave sai
    // do foco vivo a cada quadro, então largar o alvo devolve a lei geral
    // no quadro seguinte, sem estado guardado para restaurar.
    const isentoDeOclusao = quadro.foco ? `${CHAVE_DE_CORPO}${quadro.foco}` : undefined;
    // A CAMADA DESLIGADA CALA A TELA INTEIRA (item 82, N2) — e cala
    // antes de projetar, porque projetar para jogar fora seria pagar a
    // conta de um quadro que ninguém vê. A lista fica VAZIA, e com ela o
    // clicar-para-visitar: o que não está escrito não se clica, que é a
    // mesma lei única da pendência 30.
    if (quadro.nomesEscondidos) {
      // A CHAVE GOVERNA A RÉGUA, NÃO O ROTEIRO (24/08). Ela nasceu para
      // o ATLAS, onde o visitante escolhe o que quer ver e a lei é dura:
      // sem nome escrito não há clique (a pendência 30). Mas ela vale em
      // toda fase, a gaveta existe DURANTE o filme, e o gate ficava ANTES
      // do ramo `journey` — então dois cliques calavam o ROTEIRO: os
      // nomes FORÇADOS do beat (o assunto do plano, que a regra editorial
      // manda sempre ter nome) e até a LINHA DE RUMO ("→ SIRIUS · 8,6
      // anos-luz"), que nem nome de corpo é. O filme é o roteiro dirigindo
      // a cena; uma chave de camada não tem autoridade para emudecê-lo.
      //
      // O QUE FICA das ESTRELAS: no Atlas e no voo livre elas calam —
      // inclusive o clique, decisão declarada e testada. Desde 29/08
      // (item 89) os CORPOS têm sorte própria, logo abaixo: o ícone é
      // camada SEPARADA do texto, como no Eyes (Labels ≠ Icons, degrau
      // D5 do estudo), e o céu limpo continua navegável.
      const roteiro =
        fase === 'journey' && named
          ? this.fios.beatDaViagem()
          : null;
      const falados = roteiro
        ? this.forcadosDoBeat(cam, named as NamedStar[], roteiro.target)
        : [];
      // OS ÍCONES DOS CORPOS (item 89): com os NOMES desligados e a
      // camada de ícones LIGADA, cada corpo mantém um marcador discreto
      // e CLICÁVEL na posição dele. A lei do clique não muda de casa: o
      // ícone entra na MESMA lista dos rótulos desenhados (`alvos`), e
      // por isso não nasce raycast nenhum — a armadilha herdada do
      // "raycast antes do primeiro render falha em silêncio" morre no
      // desenho. Com AS DUAS camadas desligadas, o silêncio de sempre.
      let icones: StarLabel[] = [];
      if (!quadro.iconesEscondidos && fase === 'atlas' && planetas?.points.visible) {
        const corpos = projectCorpos(
          cam, CORPOS_DO_SISTEMA, planetas.posicoes, this.oclusoresDeRotulo, this.raioPorChave, isentoDeOclusao
        );
        const luas = projectCorpos(
          cam, LUAS_DO_SISTEMA, this.luaPosParaRotulo, this.oclusoresDeRotulo, this.raioPorChave, isentoDeOclusao
        );
        this.esmaecerLuasColadasNoPai(corpos, luas);
        icones = [...corpos, ...luas];
        for (const c of icones) {
          const id = c.key.slice(6);
          c.icone = true;
          c.comAnel = true;
          c.corDoAnel = corDeAnelCss(id, PAI_DA_LUA.get(id));
        }
      }
      // a memória da régua não sobrevive: ela não está correndo
      if (this.prevLabelKeys.size > 0) this.prevLabelKeys.clear();
      if (this.perdedoresDaVaga.size > 0) this.perdedoresDaVaga.clear();
      this.lastLabels = [...falados, ...icones];
      this.publicar(this.lastLabels, dtDaRampa, fase);
      this.emitDest(roteiro?.dest, cam.position, named);
      this.emitSol(cam.position, fase);
      this.emitLente(cam, fase);
      this.emitCamera(cam.position, fase);
      return;
    }
    if ((fase === 'journey' || fase === 'free' || fase === 'atlas') && named) {
      // O VEREDITO DO QUADRO ANTERIOR, colhido ANTES de `lastLabels` ser
      // reescrito (item 120, e desde o item 125/F3 é o veredito da
      // colisão). Quem escreve `perdeuAVaga` é o `LabelCanvas`, e ele
      // corre DEPOIS deste tique, dentro do `onLabels` — então
      // `lastLabels` chega aqui ainda carregando as marcas do quadro que
      // saiu da tela, e é exatamente esse conjunto que as rampas querem.
      // Colher DEPOIS da reescrita lia a lista NOVA:
      // `projectCorpos`/`projectLabels` constroem objetos do zero a cada
      // quadro, e o conjunto saía SEMPRE vazio.
      this.perdedoresDaVaga = new Set(
        this.lastLabels.filter((l) => l.perdeuAVaga).map((l) => l.key)
      );
      if (fase === 'journey') {
        // REGRA EDITORIAL da revisão: o assunto do beat sempre tem nome
        // (target, etiqueta forçada, sem fades) e o fundo fica mudo
        // (quiet) ou limitado a 2 durante o beat. SOL e Sagittarius A✱
        // são sempre isentos do filtro de centro.
        const meta = this.fios.beatDaViagem();
        let labels = meta.quiet
          ? []
          : projectLabels(cam, named, 4, this.prevLabelKeys, this.oclusoresDeRotulo).filter(
              (l) => {
                if (l.key === 'sol-home' || l.key === 'sgr-a') return true;
                const dx = l.x - 0.5;
                const dy = l.y - 0.5;
                return dx * dx + dy * dy > 0.012; // ~11% do quadro
              }
            );
        if (dHome < 1.5 && !meta.target) labels = [];
        if (meta.target) {
          const forced = this.forcadosDoBeat(cam, named, meta.target);
          const keys = new Set(forced.map((l) => l.key));
          // O ROTEIRO ASSUME A FRENTE: os assuntos ocupam primeiro; o
          // fundo preserva a régua existente e disputa só o que sobrou.
          labels = [
            ...forced,
            ...labels.filter((l) => !keys.has(l.key)).slice(0, 2),
          ];
        }
        this.lastLabels = labels;
        // linha de rumo com distância viva
        this.emitDest(meta.dest, cam.position, named);
      } else {
        // OS DEZ CORPOS, e só onde eles estão DESENHADOS (a camada
        // ligada e dentro do domínio profundo — o mesmo critério que
        // decide `points.visible`).
        const corpos =
          fase === 'atlas' && planetas?.points.visible
            ? projectCorpos(
                cam, CORPOS_DO_SISTEMA, planetas.posicoes, this.oclusoresDeRotulo, this.raioPorChave, isentoDeOclusao
              )
            : [];
        // AS LUAS (F2b/F5): rótulo pela posição VIVA da efeméride —
        // não têm vértice na camada de pontos, então entram por uma
        // projeção própria. NaN (sem efeméride) o projectCorpos ignora.
        const luas =
          fase === 'atlas' && planetas?.points.visible
            ? projectCorpos(
                cam, LUAS_DO_SISTEMA, this.luaPosParaRotulo, this.oclusoresDeRotulo, this.raioPorChave, isentoDeOclusao
              )
            : [];
        // A LUA SÓ ACENDE QUANDO SE DESCOLA DO PAI (item 73, plano §3):
        // de longe as 21 luas projetam em cima dos planetas delas, e o
        // nome "Titã" escrito sobre o nome "Saturno" não é informação, é
        // ruído que ainda por cima disputa vaga. (Medido no teto do
        // zoom, que era a vista de abertura até o item 61; na abertura
        // de hoje Saturno já nem entra no quadro, e a Lua, Fobos e
        // Deimos continuam colados nos pais deles.)
        this.esmaecerLuasColadasNoPai(corpos, luas);
        // O EYES COMPLETO (item 89, ordem dele em 29/08): com a camada
        // de ícones LIGADA o anel aparece TAMBÉM ao lado do nome — as
        // duas camadas são independentes de verdade, como Labels/Icons
        // no Eyes. O anel veste a cor da órbita do corpo (item 83); a
        // lua, a do pai, como a linha dela.
        if (!quadro.iconesEscondidos) {
          for (const c of [...corpos, ...luas]) {
            const id = c.key.slice(6);
            c.comAnel = true;
            c.corDoAnel = corDeAnelCss(id, PAI_DA_LUA.get(id));
          }
        }
        // BETA 3D (item 109): o texto do corpo migra para a cena; a
        // vaga, o anel e o clique ficam aqui
        if (quadro.texto3d) {
          for (const c of [...corpos, ...luas]) c.textoInvisivel = true;
        }
        // AS ESTRELAS entram por CANDIDATAS, não por vagas: o teto de 7
        // era um corte ANTES da disputa, e era ele que fazia uma vizinha
        // a 40 pc chegar à tela enquanto Saturno ficava de fora. Quem
        // decide agora é a hierarquia (o peso) mais a colisão.
        const estrelas = projectLabels(
          cam,
          named,
          TETO_DE_CANDIDATAS_ESTELARES,
          this.prevLabelKeys,
          this.oclusoresDeRotulo
        );
        // a prioridade das ESTRELAS é escrita AQUI e não dentro de
        // `projectLabels`, que é o mesmo caminho do FILME: sem
        // `prioridade` o rótulo do filme cai no peso VISUAL do meio, que
        // é a tinta de sempre, e não passa pela régua de relevância —
        // ela só corre neste ramo.
        //
        // O QUE ISSO NÃO QUER DIZER (corrigido em 24/08, achado do
        // auditor): que o filme esteja fora do alcance desta obra. O
        // `LabelCanvas` é UM SÓ para os dois modos (`useDirector`
        // constrói uma instância e a entrega ao Director), então a lei
        // do item 82 — um lugar por nome — alcança as legendas do filme
        // também, e no beat das TRÊS MARIAS ela custou um nome. A
        // medida, a foto e as saídas possíveis moram no item 82 do
        // `PENDENCIAS.md`, que é onde o dono decide; repeti-las aqui
        // seria a segunda cópia que envelhece calada.
        for (const e of estrelas) e.prioridade = prioridadeDeEstrela(e.tier);
        const lista = [...corpos, ...luas, ...estrelas];
        // O ALVO ESCOLHIDO NÃO CEDE A NADA. A chave do corpo em foco é a
        // mesma que o hit-test reconhece; o `sol-home` cobre o caso da
        // estrela da casa vista de longe.
        if (quadro.foco) {
          const chaveDoFoco = `${CHAVE_DE_CORPO}${quadro.foco}`;
          for (const l of lista) {
            if (l.key === chaveDoFoco) l.prioridade = PRIORIDADE_DO_ROTULO.foco;
          }
        }
        // A RÉGUA DE RELEVÂNCIA (item 82, N1) ORDENA, e desde o item 125
        // (F3) não corta mais nada: o orçamento de dez nomes foi
        // revogado por decisão do dono e quem decide quem cabe é a
        // colisão, com os pesos do Eyes. A ordem continua importando —
        // é ela que o rodízio da quadtree percorre (P8).
        this.lastLabels = aplicarReguaDeRelevancia(lista);
        // A DERROTA DE ONTEM VIRA A RAMPA DE HOJE (F3 · P4). A marca é a
        // mesma que o orçamento escrevia (`cortadoPelaRegua` +
        // `causaDoSumico: 'disputa'`), e por isso as rampas da F2 a leem
        // sem saber que a fonte mudou. Quem já cedeu por TAMANHO fica
        // com a causa dele: são as duas classes do Eyes (`hidden` e
        // `hiddenByLabelQuadtree`), e a de fora manda.
        if (this.perdedoresDaVaga.size > 0) {
          for (const l of this.lastLabels) {
            if (!this.perdedoresDaVaga.has(l.key)) continue;
            // QUEM JÁ TEM CAUSA FICA COM A DELE — e desde a F4 são DUAS
            // as causas de fora ('tamanho' e 'oclusao'), as duas o
            // `hidden` do `DivComponent` deles. A distinção não é
            // cosmética: o ocluído não disputa espaço (a `geometria` do
            // `LabelCanvas` o tira da árvore), e reescrever a causa dele
            // como 'disputa' o mandaria de volta à disputa que ele não
            // travou.
            if (l.causaDoSumico !== undefined) continue;
            l.cortadoPelaRegua = true;
            l.causaDoSumico = 'disputa';
          }
        }
        this.emitDest(undefined, cam.position, named);
      }
      // A MEMÓRIA DA RÉGUA NÃO CONTA O OCLUÍDO (item 125, F4). Esta
      // marca vira BÔNUS de 20% na disputa por candidatura estelar
      // (`projectLabels`, `rank`), e um nome que está atrás de um globo
      // — invisível, de saída — não pode usar esse bônus para tomar a
      // vaga de uma estrela que se vê. É a mesma lei da neutralidade que
      // põe as ocluídas depois do corte das candidatas.
      this.prevLabelKeys = new Set(
        this.lastLabels.filter((l) => l.causaDoSumico !== 'oclusao').map((l) => l.key)
      );
      this.publicar(this.lastLabels, dtDaRampa, fase);
    } else if (fase !== 'journey') {
      this.lastLabels = [];
      this.publicar(this.lastLabels, dtDaRampa, fase);
      this.emitDest(undefined, cam.position, named);
    }

    // a distância viva do Sol — roda todo tique e se auto-apaga fora do voo
    this.emitSol(cam.position, fase);
    // o indicador de fotografia — roda todo tique e se auto-apaga fora do filme
    this.emitLente(cam, fase);
    // e onde a câmera ESTÁ, para a ficha dizer o que se vê iluminado daqui
    this.emitCamera(cam.position, fase);
  }
}
