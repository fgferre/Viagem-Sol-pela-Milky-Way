// ============================================================
// AS ESTRELAS COM LUGAR NO QUADRO — o piloto do pilar 2 do NORTE (12/11):
// Proxima, Sirius A+B, Betelgeuse e Vega viram corpos (`world/
// corpoDeEstrela.ts`) nas posições do catálogo, sob a MESMA lei do Sol
// (`solNoQuadro.ts`), linha por linha:
//  · o GATE do palco (4 px de diâmetro, histerese 2×) arma o corpo e o
//    registra no palco — o near passa a respeitar a superfície;
//  · a REPARTIÇÃO (`repartir`) decide o peso da malha (wResolvido), o
//    filtro de tela (overrideExpoente, a fração do quadro) e a cessão do
//    ponto (`cessaoDoSol`, a mesma fórmula do Sol-ponto);
//  · o ponto do CATÁLOGO cede pelo canal `aFocus` do campo (o canal
//    dormente que o item 38 deixou para "a estrela que ganha corpo").
// As heroes e o clarão de asas não precisam de cessão: a hero de cada uma
// já some pelo `nearFade` (0,5 × o tamanho do brilho, ≥ 0,03 pc) muito
// antes do disco ter 4 px (≤ 0,007 pc para Betelgeuse), e o clarão só
// candidata o Sol.
//
// PREGUIÇOSO: a malha só nasce quando o Atlas foca a estrela ou a câmera
// chega a menos de `RAIO_DE_PREPARO_PC`. Sem estrela por perto nada é
// criado e nada é escrito — o quadro sai bit a bit o de antes.
// `?estrelaslugar=0` nem constrói esta peça.
// ============================================================
import * as THREE from 'three';
import type { NamedStar } from '../config';
import type { CorposResolvidos } from '../world/corpos/corpos';
import { diametroAparentePx, gateBinario, LIMIAR_DO_GATE_PX } from '../world/corpos/corpos';
import type { StarField } from '../world/stars';
import type { OclusorDeRotulo } from '../world/labels';
import { repartir, type JanelaDoQuadro, type EstadoDaEstrela } from '../estrela';
import { EXPO_M0, SIGMA_PX, radianciaDeTela, RADIANCIA_DA_FOTOSFERA } from '../luzDaCasa';
import { RAIO_SOL_PC } from '../escala';
import { BETA_DA_EMISSAO } from '../shaders/starShaders';
import { cessaoDoSol } from './solNoQuadro';
import {
  CorpoDeEstrela,
  PontoDeEstrela,
  eixoDeRotacao,
  fotosferaDaCompanheira,
  fotosferaDe,
  ganhoDaVisita,
  posicaoDaCompanheira,
} from '../world/corpoDeEstrela';
import type { PoliticaDeLuz } from '../../lib/atlas/luz';
import { ESTRELAS_VISITAVEIS, type EstrelaVisitavel } from '../../lib/atlas/estrelasVisitaveis';

/** A distância (pc) a que a malha nasce sem foco — bem antes do gate. */
export const RAIO_DE_PREPARO_PC = 0.5;

/** A porta `?estrelaslugar=`: só `0` desliga (o padrão é o piloto ligado). */
export function lerPortaEstrelasComLugar(bruto: string | null): boolean {
  return bruto !== '0';
}

interface Superficie {
  corpo: CorpoDeEstrela;
  armado: boolean;
  estado: EstadoDaEstrela;
}

interface Piloto {
  dados: EstrelaVisitavel;
  pos: THREE.Vector3;
  eixo: THREE.Vector3;
  /** índice no catálogo (`stars.bin`); −1 = não achado */
  indice: number;
  principal: Superficie | null;
  /**
   * O PONTO DE QUEM NÃO ESTÁ NO BINÁRIO (as anfitriãs de exoplanetas
   * fracas demais para `stars.bin`, como TRAPPIST-1): sem ponto do
   * catálogo para ceder, a estrela ganha o seu, pela lei da Sirius B.
   * As quatro do piloto estão no binário: para elas fica `null`.
   */
  pontoProprio: PontoDeEstrela | null;
  companheira: (Superficie & { ponto: PontoDeEstrela; pos: THREE.Vector3 }) | null;
  /** a última cessão escrita no campo (evita escrita por quadro) */
  cedeu: number;
}

function estadoDe(id: string, raioPc: number, teffK: number, pos: THREE.Vector3): EstadoDaEstrela {
  return {
    id,
    semente: 0,
    posicaoPc: [pos.x, pos.y, pos.z],
    raioPc,
    teffK,
    tempo: 0,
    fase: 0,
    rotacao: { periodo: 0, eixo: [0, 0, 1] },
    atividade: { nivel: 0 },
  };
}

const _dir = new THREE.Vector3();

export class EstrelasNoQuadro {
  readonly group = new THREE.Group();
  private readonly pilotos: Piloto[] = [];
  private readonly poolDeOclusores: OclusorDeRotulo[] = [];
  private readonly listaDeOclusores: OclusorDeRotulo[] = [];
  private lugaresResolvidos = false;
  private readonly fios: {
    stars: () => StarField | undefined;
    palco: () => CorposResolvidos;
    escondido: (flag: string) => boolean;
    janelaDoQuadro: JanelaDoQuadro | 'hoje';
    /** a curva de tom viva — a receita do Sol troca de calibração com ela */
    toneMapping: () => THREE.ToneMapping;
    /** brilho assistido × real (o selo do HUD) — a exposição da visita */
    politicaDeLuz: () => PoliticaDeLuz;
  };

  constructor(named: readonly NamedStar[], fios: EstrelasNoQuadro['fios']) {
    this.fios = fios;
    for (const dados of ESTRELAS_VISITAVEIS) {
      const s = named.find((n) => n.n === dados.nomeNoCatalogo);
      if (!s) continue;
      const pos = new THREE.Vector3(s.x, s.y, s.z);
      this.pilotos.push({
        dados,
        pos,
        eixo: eixoDeRotacao(dados, pos, new THREE.Vector3()),
        indice: -1,
        principal: null,
        pontoProprio: null,
        companheira: null,
        cedeu: 0,
      });
    }
  }

  /**
   * OS DISCOS QUE ESCONDEM NOME (a lei do Sol e dos planetas em
   * `director/rotulos.ts`): cada corpo VISÍVEL deste quadro, com a chave
   * do próprio rótulo para não esconder o próprio nome. A lista e os
   * objetos são reusados — nenhum quadro aloca.
   */
  oclusores(): readonly OclusorDeRotulo[] {
    let n = 0;
    for (const p of this.pilotos) {
      for (const s of [p.principal, p.companheira]) {
        if (!s || !s.corpo.group.visible) continue;
        let o = this.poolDeOclusores[n];
        if (!o) {
          o = { x: 0, y: 0, z: 0, raio: 0 };
          this.poolDeOclusores[n] = o;
        }
        const pos = s.corpo.group.position;
        o.x = pos.x;
        o.y = pos.y;
        o.z = pos.z;
        o.raio = s.corpo.raioPc;
        o.chave = s === p.principal ? p.dados.nomeNoCatalogo : undefined;
        n++;
      }
    }
    this.listaDeOclusores.length = 0;
    for (let i = 0; i < n; i++) this.listaDeOclusores.push(this.poolDeOclusores[i]);
    return this.listaDeOclusores;
  }

  /** A posição de catálogo de um piloto pelo nome (para a escada). */
  posicaoDe(nomeNoCatalogo: string): THREE.Vector3 | null {
    this.resolverLugares();
    return this.pilotos.find((p) => p.dados.nomeNoCatalogo === nomeNoCatalogo)?.pos ?? null;
  }

  private criar(p: Piloto) {
    const f = fotosferaDe(p.dados);
    const corpo = new CorpoDeEstrela(f);
    this.group.add(corpo.group);
    p.principal = {
      corpo,
      armado: false,
      estado: estadoDe(p.dados.id, corpo.raioPc, f.teffK, p.pos),
    };
    if (p.indice < 0) {
      const stars = this.fios.stars();
      p.pontoProprio = new PontoDeEstrela(f, stars?.expoM0 ?? EXPO_M0, stars?.sigmaPx ?? SIGMA_PX);
      this.group.add(p.pontoProprio.points);
    }
    const fb = fotosferaDaCompanheira(p.dados);
    if (fb) {
      const cb = new CorpoDeEstrela(fb);
      const stars = this.fios.stars();
      const ponto = new PontoDeEstrela(fb, stars?.expoM0 ?? EXPO_M0, stars?.sigmaPx ?? SIGMA_PX);
      this.group.add(cb.group, ponto.points);
      const posB = new THREE.Vector3();
      p.companheira = {
        corpo: cb,
        armado: false,
        estado: estadoDe(fb.id, cb.raioPc, fb.teffK, posB),
        ponto,
        pos: posB,
      };
    }
  }

  /**
   * O LUGAR DE CADA UMA é o do PONTO do catálogo (float32 de `stars.bin`),
   * não o do nome: a posição do nome vem arredondada a 1e-4 pc, e para
   * Sirius isso punha o corpo a ~40 UA do próprio ponto — de perto, os
   * dois apareciam em lugares diferentes. Uma vez, quando o catálogo
   * chega; escrito no MESMO vetor que `posicaoDe` entrega.
   */
  private resolverLugares(): boolean {
    if (this.lugaresResolvidos) return true;
    const stars = this.fios.stars();
    if (!stars) return false;
    const xyz = stars.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (const p of this.pilotos) {
      p.indice = this.indiceNoCatalogo(p.pos);
      if (p.indice < 0) continue;
      p.pos.set(xyz.getX(p.indice), xyz.getY(p.indice), xyz.getZ(p.indice));
      eixoDeRotacao(p.dados, p.pos, p.eixo);
    }
    this.lugaresResolvidos = true;
    return true;
  }

  /**
   * a estrela do catálogo na posição do nome (a mais próxima, < 0,01 pc).
   * Era 1e-3 pc; β Pictoris tem o ponto do binário a 1,08e-3 pc do nome
   * (a quantização angular de ~20″ a 19,6 pc) e HD 189733, sem nome no
   * catálogo, a 5,4e-3 pc da posição do Gaia. As quatro do piloto casam
   * a < 1,2e-4 pc, então o ponto delas não muda.
   */
  private indiceNoCatalogo(pos: THREE.Vector3): number {
    const stars = this.fios.stars();
    if (!stars) return -1;
    const xyz = (stars.points.geometry.getAttribute('position') as THREE.BufferAttribute)
      .array as Float32Array;
    let melhor = -1;
    let dMin = 1e-4; // (0,01 pc)²
    for (let i = 0; i < xyz.length; i += 3) {
      const dx = xyz[i] - pos.x;
      const dy = xyz[i + 1] - pos.y;
      const dz = xyz[i + 2] - pos.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < dMin) {
        dMin = d2;
        melhor = i / 3;
      }
    }
    return melhor;
  }

  /**
   * O passo do quadro. Roda ANTES de o near ler o palco (o corpo que
   * arma NESTE tick governa o clip NESTE tick), como o gate do Sol.
   */
  atualizar(q: {
    camPos: THREE.Vector3;
    hPx: number;
    prAtual: number;
    fovDeg: number;
    jd: number;
    tempoS: number;
    focoNome: string | null;
  }) {
    const alturaCss = q.hPx / q.prAtual;
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(q.fovDeg) / 2);
    const stars = this.fios.stars();
    const escondido = this.fios.escondido('noestrelaslugar');
    // sem o catálogo não há lugar certo (nem ponto a ceder): espera
    if (!this.resolverLugares()) return;
    for (const p of this.pilotos) {
      if (!p.principal) {
        const perto = q.camPos.distanceTo(p.pos) < RAIO_DE_PREPARO_PC;
        if (!(perto || q.focoNome === p.dados.nomeNoCatalogo)) continue;
        this.criar(p);
      }
      const a = p.principal!;
      const leiA = this.passo(a, p.pos, p.eixo, q, alturaCss, tanHalfFov, escondido);
      // a cessão do ponto do catálogo: a MESMA do Sol-ponto
      const cede = a.corpo.group.visible ? cessaoDoSol(leiA) : 0;
      if (stars && p.indice >= 0 && cede !== p.cedeu) {
        stars.writeFocus(p.indice, cede);
        p.cedeu = cede;
      }
      if (p.pontoProprio) {
        p.pontoProprio.points.visible = !escondido;
        p.pontoProprio.escrever({
          posPc: p.pos,
          distPc: q.camPos.distanceTo(p.pos),
          screenH: q.hPx,
          pr2: q.prAtual * q.prAtual,
          peso: 1 - cede,
        });
      }
      const b = p.companheira;
      if (b && p.dados.companheira) {
        const rel = posicaoDaCompanheira(
          q.jd,
          p.dados.companheira.orbita,
          [p.pos.x / p.pos.length(), p.pos.y / p.pos.length(), p.pos.z / p.pos.length()],
          p.pos.length()
        );
        b.pos.set(p.pos.x + rel[0], p.pos.y + rel[1], p.pos.z + rel[2]);
        const leiB = this.passo(b, b.pos, p.eixo, q, alturaCss, tanHalfFov, escondido);
        const cedeB = b.corpo.group.visible ? cessaoDoSol(leiB) : 0;
        b.ponto.points.visible = !escondido;
        b.ponto.escrever({
          posPc: b.pos,
          distPc: q.camPos.distanceTo(b.pos),
          screenH: q.hPx,
          pr2: q.prAtual * q.prAtual,
          peso: 1 - cedeB,
        });
      }
    }
  }

  private passo(
    s: Superficie,
    pos: THREE.Vector3,
    eixo: THREE.Vector3,
    q: { camPos: THREE.Vector3; hPx: number; fovDeg: number; jd: number; tempoS: number },
    alturaCss: number,
    tanHalfFov: number,
    escondido: boolean
  ) {
    const d = q.camPos.distanceTo(pos);
    s.armado = gateBinario(s.armado, diametroAparentePx(s.corpo.raioPc, d, q.hPx, q.fovDeg));
    const id = `estrela:${s.estado.id}`;
    // no palco também SEM disco, enquanto a câmera está perto: o near
    // da casa só conhece a distância ao SOL (é o dHome que salva o
    // Sol-ponto), e a 0,5 UA de Sirius B o near de ~2.000 UA cortava os
    // pontos de A e de B. Com a superfície registrada, o near a respeita.
    const noPalco = !escondido && (s.armado || d < RAIO_DE_PREPARO_PC);
    if (noPalco) this.fios.palco().registrar(id, s.corpo.raioPc, pos);
    else this.fios.palco().remover(id);
    s.corpo.group.visible = s.armado && !escondido;
    const stars = this.fios.stars();
    _dir.copy(q.camPos).sub(pos);
    if (d > 0) _dir.divideScalar(d);
    const lei = repartir(
      s.estado,
      { distPc: d, direcao: [_dir.x, _dir.y, _dir.z] },
      {
        alturaPx: alturaCss,
        tanHalfFov,
        expoM0: stars?.expoM0 ?? EXPO_M0,
        sigmaPx: stars?.sigmaPx ?? SIGMA_PX,
        beta: BETA_DA_EMISSAO,
        trocaPx: LIMIAR_DO_GATE_PX,
        requisitoGeometrico: 1,
        janelaDoQuadro: this.fios.janelaDoQuadro,
      }
    );
    if (s.corpo.group.visible) {
      // a ponte casa → tela com o raio do SOL (a unidade é a superfície
      // do Sol), na altura viva, descida em stops pelo filtro da lei
      const g = lei.overrideExpoente;
      const fator = Math.pow(radianciaDeTela(RADIANCIA_DA_FOTOSFERA, RAIO_SOL_PC, alturaCss), g);
      // a exposição da visita entra pela MESMA rampa, ao contrário: plena
      // com o disco enchendo o quadro (g = 0), nenhuma no ponto (g = 1)
      const exposicao = Math.pow(
        ganhoDaVisita(s.corpo.fotosfera.teffK, this.fios.politicaDeLuz()),
        1 - Math.min(1, Math.max(0, g))
      );
      s.corpo.escrever({
        posPc: pos,
        eixo,
        jd: q.jd,
        tempoS: q.tempoS,
        fator,
        exposicao,
        peso: lei.wResolvido * lei.wMalha,
        toneMapping: this.fios.toneMapping(),
      });
    }
    return lei;
  }

  dispose() {
    for (const p of this.pilotos) {
      p.principal?.corpo.dispose();
      p.pontoProprio?.dispose();
      p.companheira?.corpo.dispose();
      p.companheira?.ponto.dispose();
    }
  }
}
