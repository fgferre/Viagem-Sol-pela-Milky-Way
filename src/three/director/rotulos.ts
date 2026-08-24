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
      if (this.lastLabels.length > 0) {
        this.lastLabels = [];
        this.prevLabelKeys.clear();
        this.prevDesenhados.clear();
      }
      this.fios.onLabels(this.lastLabels);
      this.emitDest(undefined, cam.position, named);
      this.emitSol(cam.position, fase);
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
          const forced: StarLabel[] = [];
          for (const name of meta.target) {
            const l = this.resolveForcedLabel(cam, named, name);
            if (l) forced.push(l);
          }
          const keys = new Set(forced.map((l) => l.key));
          labels = labels.filter((l) => !keys.has(l.key)).slice(0, 2);
          labels.push(...forced);
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
        // constrói uma instância e a entrega ao Director), então a morte
        // dos sete deslocamentos e do traço de 102 px alcança as
        // legendas do filme também — e ALCANÇOU.
        //
        // MEDIDO em cinco instantes (t=20/45/60/90/150), pelo md5 da
        // tinta do canvas: quatro deles saem bit-idênticos, porque no
        // filme cabem no máximo quatro nomes de fundo mais os forçados
        // do beat e eles nascem espalhados. O quinto NÃO: no beat das
        // TRÊS MARIAS (t=45) o cinturão de Órion põe Alnitak, Alnilam e
        // Mintaka quase em linha, a caixa de Alnilam encosta na de
        // Alnitak, e sem os deslocamentos ALNILAM PERDE O NOME — 3 nomes
        // viraram 2, a tinta caiu de 6.722 para 4.104 pixels. A legenda
        // do beat, embaixo, continua dizendo os três. É a lei nova
        // funcionando, e ainda assim é uma quebra editorial: está
        // registrada no item 82 para o olho do dono decidir, com a foto
        // em `capturas/item82-filme-legendas-antes-depois.png`.
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
    // e onde a câmera ESTÁ, para a ficha dizer o que se vê iluminado daqui
    this.emitCamera(cam.position, fase);
  }
}
