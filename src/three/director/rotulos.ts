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
  aplicarReguaDeRelevancia,
  prioridadeDeEstrela,
  projectCorpos,
  projectLabels,
  projectForced,
} from '../world/labels';
import type { StarLabel } from '../world/labels';
import { GAL } from '../world/galaxy';
import { numeroPtBr } from '../tempoDoAtlas';
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
  /** as chaves que o DESENHO marcou no quadro anterior — o bônus de
   *  histerese de `pesoDoRotulo` (item 73) */
  private prevDesenhados = new Set<string>();
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
  /** o disco do Sol como oclusor de RÓTULO ("vejo estrelas através do
   *  sol", item 47): nome de estrela atrás da fotosfera não nasce. Os
   *  planetas não entram nesta leva — disco de minutos de arco só em
   *  close, e lá o rótulo do próprio corpo é quem manda no quadro. */
  private readonly oclusoresDeRotulo = [{ x: 0, y: 0, z: 0, raio: RAIO_DO_SOL_NA_CENA }];

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

  /** os relógios de 4 Hz do rumo e do Sol andam com o quadro */
  tique(dt: number) {
    this.destTimer += dt;
    this.solTimer += dt;
    this.camTimer += dt;
    this.lenteTimer += dt;
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
        const nota = notaDeDistancia(d * UA_POR_PC, numeroPtBr);
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
      const nota = notaDeDistancia(camPos.length() * UA_POR_PC, numeroPtBr);
      if (nota) text = `SOL · ${nota}`;
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
      const nota = notaDeDistancia(cam.position.length() * UA_POR_PC, numeroPtBr);
      const graus = Math.round(cam.fov);
      if (nota && Number.isFinite(graus)) text = `LENTE ${graus}° · SOL ${nota}`;
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
        const corpos = projectCorpos(cam, CORPOS_DO_SISTEMA, planetas.posicoes);
        const luas = projectCorpos(cam, LUAS_DO_SISTEMA, this.luaPosParaRotulo);
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
      if (this.prevDesenhados.size > 0) this.prevDesenhados.clear();
      this.lastLabels = [...falados, ...icones];
      this.fios.onLabels(this.lastLabels);
      this.emitDest(roteiro?.dest, cam.position, named);
      this.emitSol(cam.position, fase);
      this.emitLente(cam, fase);
      this.emitCamera(cam.position, fase);
      return;
    }
    if ((fase === 'journey' || fase === 'free' || fase === 'atlas') && named) {
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
            ? projectCorpos(cam, CORPOS_DO_SISTEMA, planetas.posicoes)
            : [];
        // AS LUAS (F2b/F5): rótulo pela posição VIVA da efeméride —
        // não têm vértice na camada de pontos, então entram por uma
        // projeção própria. NaN (sem efeméride) o projectCorpos ignora.
        const luas =
          fase === 'atlas' && planetas?.points.visible
            ? projectCorpos(cam, LUAS_DO_SISTEMA, this.luaPosParaRotulo)
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
        // A RÉGUA DE RELEVÂNCIA (item 82, N1): ordena pela hierarquia da
        // casa — que é o que decide quem vence a colisão, porque o
        // desenho ocupa na ordem em que recebe — e marca o que passa do
        // ORÇAMENTO de nomes da tela. O corte por IMPORTÂNCIA vem antes
        // da geometria: sem ele, vinte estrelas espalhadas pelo quadro
        // nunca colidem entre si e ficam todas na tela, que foi
        // exatamente a confusão que o dono viu na abertura.
        this.lastLabels = aplicarReguaDeRelevancia(lista, this.prevDesenhados);
        this.emitDest(undefined, cam.position, named);
      }
      this.prevLabelKeys = new Set(this.lastLabels.map((l) => l.key));
      // o que o DESENHO marcou no quadro que acabou de sair da tela —
      // a histerese é sobre o que se VIU, não sobre o que se projetou
      this.prevDesenhados = new Set(
        this.lastLabels.filter((l) => l.desenhado).map((l) => l.key)
      );
      this.fios.onLabels(this.lastLabels);
    } else if (fase !== 'journey') {
      this.lastLabels = [];
      this.fios.onLabels([]);
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
