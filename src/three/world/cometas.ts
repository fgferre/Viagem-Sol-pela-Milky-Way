// ============================================================
// OS COMETAS NA CENA — o lado three de `lib/cometas.ts`, no molde das
// sondas (`world/sondas.ts`): onde o núcleo está no instante vivo, o
// marcador e o nome (`projetarCometas`), de onde a câmera o olha ao
// chegar (`poseDoCometa`) e a linha da órbita (`OrbitasDosCometas`, a
// camada `nocometas`). A coma e as caudas moram em `caudasDosCometas.ts`.
//
// A REGRA DE ESCALA: o núcleo tem quilômetros. De longe ele é um
// MARCADOR de instrumento (o anel dos rótulos, que só brilha por cima);
// de perto, um corpo escuro do tamanho medido (`caudasDosCometas.ts`).
//
// O NOME, por decisão desta rodada: só aparece com o cometa em foco ou
// dentro de 6 UA do Sol — onde ele de fato "passa". Os oito o tempo
// todo poriam oito nomes a mais na vista de abertura (que o dono
// aprovou), quase todos a dezenas de UA, apagados.
//
// A LINHA, como a das sondas: só a do cometa EM FOCO — a cônica do
// conjunto osculante que vale na data (ver o cabeçalho de `lib/cometas`).
// ============================================================
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import {
  COMETAS,
  conjuntoVigente,
  estadoDoCometa,
  pontoDaConica,
  semieixo,
  type ConjuntoOsculante,
} from '../../lib/cometas';
import { classeEmTexto } from '../atlasConfig';
import { PRIORIDADE_DO_ROTULO, projectForced } from './labels';
import type { StarLabel } from './labels';
import { LARGURA_DA_FITA_PX } from './orbitas';
import { naCena, poseDoSegmento, type PoseDaSonda } from './sondas';
import { kmParaPc } from '../escala';

/** o prefixo da chave do rótulo de um cometa — o clique o reconhece */
export const CHAVE_DE_COMETA = 'cometa:';

/** a tinta do cometa: o verde-claro do C₂ da coma, pálido */
const COR_DA_ORBITA: readonly [number, number, number] = [0.6, 0.92, 0.72];
export const COR_DO_MARCADOR_DO_COMETA = 'rgba(176, 238, 200, 0.9)';

/** até onde (UA do Sol) o nome aparece sem foco */
const NOME_ATE_UA = 6;

/** onde o núcleo está na CENA no instante `jd` */
export function posicaoDoCometaNaCena(id: string, jd: number, out = new THREE.Vector3()): THREE.Vector3 | null {
  const e = estadoDoCometa(id, jd);
  return e ? naCena(e[0], e[1], e[2], out) : null;
}

/**
 * A CHEGADA NUM COMETA — o Sol, o núcleo e as caudas no mesmo quadro.
 * O segmento Sol→núcleo de lado (o quadro das sondas), mas o alvo é o
 * PRÓPRIO núcleo: a roda aproxima dele, e não de um ponto vazio do
 * segmento. A esfera de 0,85 vez a distância ao Sol põe o Sol à
 * esquerda, dentro do quadro, e deixa espaço às caudas, que apontam para fora. O piso do
 * zoom é três raios do núcleo: chega-se até ver o corpo escuro.
 */
const FRACAO_DO_RAIO = 0.85;
const CENTRO_NO_SEGMENTO = 1;
export function poseDoCometa(id: string, jd: number, raioDoNucleoKm: number | null): PoseDaSonda | null {
  const p = posicaoDoCometaNaCena(id, jd);
  if (!p) return null;
  return poseDoSegmento(p, FRACAO_DO_RAIO, CENTRO_NO_SEGMENTO, kmParaPc(Math.max(3 * (raioDoNucleoKm ?? 2), 5)));
}

const _pos = new THREE.Vector3();
const AU_PC = naCena(1, 0, 0, new THREE.Vector3()).length();

/** OS NOMES E OS MARCADORES DOS COMETAS — o anel na posição viva */
export function projetarCometas(
  camera: THREE.PerspectiveCamera,
  jd: number,
  foco: string | null,
  comMarcador: boolean
): StarLabel[] {
  const out: StarLabel[] = [];
  for (const c of COMETAS) {
    if (!posicaoDoCometaNaCena(c.id, jd, _pos)) continue;
    if (c.id !== foco && _pos.length() > NOME_ATE_UA * AU_PC) continue;
    const l = projectForced(camera, c.nome, '', _pos, `${CHAVE_DE_COMETA}${c.id}`);
    if (!l) continue;
    l.distPc = _pos.distanceTo(camera.position);
    l.opacity = 0.95;
    l.detalhe = classeEmTexto(c.classe);
    l.prioridade = c.id === foco ? PRIORIDADE_DO_ROTULO.foco : PRIORIDADE_DO_ROTULO.cometa;
    if (comMarcador) {
      l.comAnel = true;
      l.corDoAnel = COR_DO_MARCADOR_DO_COMETA;
    }
    out.push(l);
  }
  return out;
}

/** pontos da cônica — a elipse pela anomalia excêntrica, que adensa
 *  perto do periélio, onde a curva dobra */
const PONTOS_DA_ORBITA = 1024;
/** a hipérbole (3I) se desenha até esta distância do Sol */
const HIPERBOLE_ATE_UA = 60;
const ALFA_DA_ORBITA = 0.75;

/** as posições (UA, eclíptica) da linha de um conjunto */
export function amostrarOrbita(c: ConjuntoOsculante): Float32Array {
  const fecha = c[2] < 1;
  const n = PONTOS_DA_ORBITA;
  const pts = new Float32Array((n + 1) * 3);
  let limite = Math.PI;
  if (!fecha) {
    const a = -semieixo(c);
    limite = Math.acosh((HIPERBOLE_ATE_UA / a + 1) / c[2]);
  }
  for (let i = 0; i <= n; i++) {
    const anomalia = -limite + (2 * limite * i) / n;
    const p = pontoDaConica(c, anomalia);
    naCena(p[0], p[1], p[2], _pos);
    pts[i * 3] = _pos.x;
    pts[i * 3 + 1] = _pos.y;
    pts[i * 3 + 2] = _pos.z;
  }
  return pts;
}

/**
 * A CAMADA DAS ÓRBITAS DOS COMETAS: a linha do cometa em foco, refeita
 * só quando o conjunto que vale muda (Encke troca a cada 3,3 anos).
 */
export class OrbitasDosCometas {
  readonly group = new THREE.Group();
  /** a gaveta (`nocometas`), escrita pelo director antes do `update` */
  ligado = true;
  /** o cometa em foco (a escada é a dona) */
  foco: string | null = null;
  private linha: Line2 | null = null;
  private geo: LineGeometry | null = null;
  private material: LineMaterial | null = null;
  private conjuntoEscrito: ConjuntoOsculante | null = null;

  constructor() {
    this.group.name = 'cometas';
  }

  update(jd: number) {
    const c = this.ligado && this.foco ? conjuntoVigente(this.foco, jd) : null;
    if (!c) {
      if (this.linha) this.linha.visible = false;
      return;
    }
    if (c !== this.conjuntoEscrito) {
      this.conjuntoEscrito = c;
      this.geo?.dispose();
      this.geo = new LineGeometry();
      this.geo.setPositions(amostrarOrbita(c));
      if (!this.material) {
        this.material = new LineMaterial({
          color: new THREE.Color(COR_DA_ORBITA[0], COR_DA_ORBITA[1], COR_DA_ORBITA[2]),
          linewidth: LARGURA_DA_FITA_PX,
          transparent: true,
          opacity: ALFA_DA_ORBITA,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: true,
        });
      }
      if (this.linha) this.group.remove(this.linha);
      this.linha = new Line2(this.geo, this.material);
      // logo depois das órbitas (8), com as sondas
      this.linha.renderOrder = 9;
      this.group.add(this.linha);
    }
    if (this.linha) this.linha.visible = true;
  }

  dispose() {
    this.geo?.dispose();
    this.material?.dispose();
  }
}
