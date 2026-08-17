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
import { projectCorpos, projectLabels, projectForced } from '../world/labels';
import type { StarLabel } from '../world/labels';
import { GAL } from '../world/galaxy';
import { numeroPtBr } from '../tempoDoAtlas';
import { notaDeDistancia } from '../../lib/unidades';
import { UA_POR_PC } from '../world/planetas/planetas';
import type { Planetas } from '../world/planetas/planetas';
import { RAIO_DO_SOL_NA_CENA } from '../escala';
import { CORPOS_DO_SISTEMA, LUAS_DO_SISTEMA } from '../atlasConfig';
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
}

export class Rotulos {
  /** última projeção de rótulos — alvo do clicar-para-visitar */
  private lastLabels: StarLabel[] = [];
  private prevLabelKeys = new Set<string>();
  private lastDest = '';
  private destTimer = 0;
  private lastSol = '';
  private solTimer = 0;
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

  /** os relógios de 4 Hz do rumo e do Sol andam com o quadro */
  tique(dt: number) {
    this.destTimer += dt;
    this.solTimer += dt;
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
        // OS DEZ CORPOS PRIMEIRO, e só onde eles estão DESENHADOS (a
        // camada ligada e dentro do domínio profundo — o mesmo critério
        // que decide `points.visible`). Primeiro na lista porque o
        // desempate de colisão do `LabelCanvas` é a ordem: dentro do
        // sistema solar o assunto são eles, e uma vizinha a 40 pc não
        // pode expulsar Netuno do quadro que o Atlas abriu mostrando.
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
        this.lastLabels = [
          ...corpos,
          ...luas,
          ...projectLabels(cam, named, 7, this.prevLabelKeys, this.oclusoresDeRotulo),
        ];
        this.emitDest(undefined, cam.position, named);
      }
      this.prevLabelKeys = new Set(this.lastLabels.map((l) => l.key));
      this.fios.onLabels(this.lastLabels);
    } else if (fase !== 'journey') {
      this.lastLabels = [];
      this.fios.onLabels([]);
      this.emitDest(undefined, cam.position, named);
    }

    // a distância viva do Sol — roda todo tique e se auto-apaga fora do voo
    this.emitSol(cam.position, fase);
  }
}
