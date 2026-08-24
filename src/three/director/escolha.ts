// ============================================================
// A ESCOLHA DO ATLAS — o que o ponteiro apontou, e o que um segundo
// clique faz com isso. Quatro peças: o hit-test (`alvoNoPonto`, a lista
// ÚNICA de rótulos desenhados), a MEMÓRIA de um gesto só
// (`escolhaDoClique`), o clique simples que ESCOLHE sem mover a câmera
// (`selecionarNoPonto`) e o duplo que MERGULHA no escolhido
// (`mergulharNoEscolhido`) — mais o clique do VOO LIVRE (`tryVisit`),
// que usa o mesmo hit-test e VOA em vez de escolher.
//
// Morava em `escada.ts` (item 73, 22/08); a semântica é a mesma, linha
// a linha, e o director segue chamando as fachadas de 1 linha da escada.
// O corte é o §11: a escada é o DEGRAU (em que enquadramento se está e
// como se sobe e desce), esta peça é o GESTO (o que o dedo apontou).
//
// A FRONTEIRA, e ela é o que impede o corte de virar dois donos do
// mesmo estado: o trio do foco (`ver`/`focoEstrela`/`focoCorpoId`) e o
// pino do link continuam com UM escritor, a escada. Por isso
// `selecionarCorpo`/`selecionarPonto` — que são transições de estado
// DELA — ficaram lá, e daqui só se chamam.
// ============================================================
import * as THREE from 'three';
import type { Phase } from '../fases';
import type { StarsMeta } from '../config';
import type { StarLabel } from '../world/labels';
import type { Rotulos } from './rotulos';
import type { Escada } from './escada';
import { ORIGEM } from '../cinematic/enquadramento';
import { CHAVE_DE_CORPO } from '../atlasConfig';
import { GAL } from '../world/baseGalactica';
import { raioDeEnquadramentoEstelar } from '../cinematic/atlasRig';

export class Escolha {
  /**
   * O QUE O ÚLTIMO CLIQUE SIMPLES ESCOLHEU — a memória de um gesto só,
   * e ela existe porque escolher RE-MIRA a câmera: entre o clique e o
   * `dblclick` a vista gira e o rótulo sai de baixo do dedo, então o
   * duplo clique não tem como reencontrá-lo pelo ponto (ver
   * `mergulharNoEscolhido`). `id` é um corpo do sistema; `pos`/`nome`
   * são uma estrela ou o centro galáctico. `null` = o último clique não
   * acertou rótulo nenhum, e aí não há para onde mergulhar.
   */
  private escolhaDoClique:
    | { id: string | null; pos: THREE.Vector3; nome: string }
    | null = null;

  /** a escada — as transições de estado que o gesto dispara moram lá */
  private readonly escada: Escada;
  /** os rótulos do céu — o clique lê a MESMA lista pelo getter `alvos` */
  private readonly rotulos: Rotulos;
  private readonly fios: {
    fase: () => Phase;
    meta: () => StarsMeta | undefined;
  };

  constructor(dono: {
    escada: Escada;
    rotulos: Rotulos;
    fios: Escolha['fios'];
  }) {
    this.escada = dono.escada;
    this.rotulos = dono.rotulos;
    this.fios = dono.fios;
  }

  // Os getters preservam os NOMES que o corpo dos métodos sempre usou.
  private get phase(): Phase {
    return this.fios.fase();
  }
  private get meta(): StarsMeta | undefined {
    return this.fios.meta();
  }

  /**
   * Clique curto no rótulo mais próximo. Duas fases, dois modos: no voo
   * livre a câmera VOA até lá; no Atlas ela ENQUADRA de onde estiver.
   *
   * SÓ O QUE ESTÁ NA TELA É ALVO (pendência 30, fechada em 2026-08-14).
   * Este laço lia a lista INTEIRA de rótulos projetados, e o desenho
   * (`LabelCanvas`) joga fora quase tudo dela no TETO do zoom do Atlas
   * (224 UA — a vista de abertura até 23/08, e desde o item 61 o lugar
   * aonde a roda leva): os dez corpos e as 21 luas projetam a menos de
   * 1% de tela uns dos outros, e só o Sol sobrevive à colisão. O
   * resultado medido era o
   * defeito 1 do commit `51d7777` — clicar no "SOL" escrito na tela
   * enquadrava FOBOS, cujo rótulo invisível estava 0,4% de tela mais
   * perto do ponteiro (Sol em 0,500/0,458; Marte, Fobos e Deimos
   * empilhados em 0,503/0,453). Eram duas listas onde tem de haver uma.
   *
   * O descarte é do `false` EXPLÍCITO e não do "não é `true`": quem
   * marca é o desenho, e sem canvas de rótulos na tela (nenhum quadro
   * desenhado ainda) a marca é `undefined` — aí vale a lista projetada,
   * que é o comportamento de sempre.
   */
  private alvoNoPonto(x: number, y: number): StarLabel | null {
    let best: StarLabel | null = null;
    let bestD = 0.0035; // ~6% da tela ao quadrado
    for (const label of this.rotulos.alvos) {
      if (label.desenhado === false) continue;
      if (label.opacity < 0.15) continue;
      const dx = label.x - x;
      const dy = label.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = label;
      }
    }
    return best;
  }

  /**
   * O CLIQUE CURTO NO VOO LIVRE: a câmera VOA até o nome mais próximo.
   *
   * O ATLAS SAIU DAQUI em 22/08 (item 73): lá o clique passou a
   * ESCOLHER (`selecionarNoPonto`) e o duplo a MERGULHAR
   * (`mergulharNoEscolhido`), e cada gesto ganhou a sua porta. O ramo
   * dos CORPOS do sistema saiu junto — eles só têm rótulo dentro do
   * Atlas (`projectCorpos` só roda naquela fase), então aqui ele era
   * código sem caminho.
   */
  tryVisit(x: number, y: number) {
    if (this.phase !== 'free' || !this.meta) return;
    const best = this.alvoNoPonto(x, y);
    if (!best) return;
    if (best.key === 'sgr-a') {
      this.escada.irAte(GAL.GC_POS.clone(), 7, best.name);
      return;
    }
    const star =
      best.key === 'sol-home'
        ? { n: 'Sol', x: 0, y: 0, z: 0 }
        : this.meta.named.find((s) => s.n === best.name);
    if (!star) return;
    this.escada.visitarEstrela(star);
  }

  /**
   * O DUPLO CLIQUE MERGULHA NO QUE O CLIQUE ESCOLHEU (item 73, 22/08) —
   * e ele NÃO refaz o hit-test, o que é a lição medida desta obra.
   *
   * Escolher RE-MIRA a câmera (a lei do Atlas é que a câmera olha o
   * alvo), então entre o primeiro clique e o `dblclick` a vista já girou
   * e o rótulo saiu de baixo do dedo: medido, um clique em Alnair na
   * abertura leva o rótulo dela para fora do quadro e põe Tiaki a meio
   * caminho do ponteiro. Refazer o hit-test aqui mergulharia no vizinho.
   *
   * Sem escolha guardada não há mergulho: um duplo clique no vazio não
   * pode descer num alvo que o visitante não apontou.
   */
  mergulharNoEscolhido() {
    if (this.phase !== 'atlas') return;
    const escolha = this.escolhaDoClique;
    if (!escolha) return;
    if (escolha.id !== null) {
      // o SOL tem os dois degraus e o mergulho pede o de baixo — o corpo
      // dele; `focarNoCorpo('sun')` sem `ver=` é a casa, que é o oposto
      if (escolha.id === 'sun') this.escada.focarNoCorpo('sun', 'corpo');
      else this.escada.focarNoCorpo(escolha.id);
      return;
    }
    // uma estrela ou o centro galáctico: o enquadramento da D5, com
    // rampa — o `arriveDist` é do voo livre e o Atlas o ignora
    this.escada.irAte(escolha.pos.clone(), 0, escolha.nome);
  }

  /**
   * O CLIQUE SIMPLES NO ATLAS: ESCOLHE O ALVO E A CÂMERA NÃO SAI DO
   * LUGAR (item 73, plano §1). É a metade da queixa do dono que faltava
   * — *"nem conseguimos mais selecionar para onde vamos"* —, e o padrão
   * de toda fonte consultada: um clique escolhe, dois vão.
   *
   * Não há canal novo: `focoCorpoId` já É a seleção. O que muda é que a
   * troca de alvo passa por `AtlasRig.selecionar` (a pose preservada,
   * conta fechada) em vez de `focar` (o alvo novo no enquadramento
   * dele). Depois disso a roda mede a distância AO CORPO ESCOLHIDO, que
   * é a lei do modo.
   *
   * A ESTRELA E O CENTRO GALÁCTICO entram pelo mesmo caminho: eles são
   * alvos do rig como qualquer corpo, com o raio de enquadramento que a
   * D5 já lhes dá. O `sol-home` é a exceção declarada — ele só nasce a
   * mais de 0,12 pc de casa, onde "SOL" quer dizer voltar, e selecionar
   * o corpo do Sol a 2,6 pc de distância cairia direto no teto do zoom
   * (o sistema em quadro), ou seja MOVERIA a câmera. Um gesto que
   * promete não mover não pode ter um canto onde move.
   */
  selecionarNoPonto(x: number, y: number) {
    if (this.phase !== 'atlas' || !this.meta) return;
    this.escolhaDoClique = null;
    const best = this.alvoNoPonto(x, y);
    if (!best) return;
    if (best.key === 'sol-home') {
      this.escada.focarNoSistema();
      return;
    }
    if (best.key.startsWith(CHAVE_DE_CORPO)) {
      const id = best.key.slice(CHAVE_DE_CORPO.length);
      this.escolhaDoClique = { id, pos: ORIGEM.clone(), nome: best.name };
      this.escada.selecionarCorpo(id);
      return;
    }
    if (best.key === 'sgr-a') {
      this.escolhaDoClique = { id: null, pos: GAL.GC_POS.clone(), nome: best.name };
      // o MESMO raio que o mergulho vai usar (`irAte` → D5): duas
      // réguas para o mesmo alvo fariam o `?d=` mudar de unidade entre
      // escolher e ir
      this.escada.selecionarPonto(
        GAL.GC_POS.clone(),
        raioDeEnquadramentoEstelar(GAL.GC_POS.length()),
        best.name
      );
      return;
    }
    const star = this.meta.named.find((s) => s.n === best.name);
    if (!star) return;
    const pos = new THREE.Vector3(star.x, star.y, star.z);
    this.escolhaDoClique = { id: null, pos, nome: star.n };
    this.escada.selecionarPonto(pos, raioDeEnquadramentoEstelar(pos.length()), star.n);
  }
}
