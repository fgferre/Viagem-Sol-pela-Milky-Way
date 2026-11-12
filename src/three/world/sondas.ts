// ============================================================
// AS SONDAS NA CENA — o lado three de `lib/sondas.ts`: onde a sonda
// está no instante vivo, o marcador e o nome dela (`projetarSondas`),
// de onde a câmera a olha ao chegar (`poseDaSonda`) e a linha da
// trajetória (`TrajetoriasDasSondas`, a camada `nosondas`).
//
// A REGRA DE ESCALA: uma sonda tem metros e está a 100+ UA — não há
// corpo a desenhar. Ela é um MARCADOR de instrumento (o losango dos
// rótulos) e uma linha, que só brilham por cima e não escrevem
// profundidade; o selo declara a camada pela derivação de sempre.
//
// A LINHA, por decisão desta rodada: só a da sonda EM FOCO. As cinco
// juntas cruzariam a vista de abertura (que o dono aprovou) com cinco
// riscos saindo do sistema; quem escolhe uma sonda vê o caminho dela —
// o percorrido até a data, cheio, e o que falta até 2040, fraco.
// ============================================================
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../lib/atlas/frameGalactico';
import { SONDAS, estadoDaSonda, nosDaSonda } from '../../lib/sondas';
import { classeEmTexto } from '../atlasConfig';
import { POLO_ECLIPTICO } from '../cinematic/enquadramento';
import { kmParaPc } from '../escala';
import { PRIORIDADE_DO_ROTULO, projectForced } from './labels';
import type { StarLabel } from './labels';
import { eixoQuePousaEm } from './lugaresDoCeu';
import { LARGURA_DA_FITA_PX } from './orbitas';

/** o prefixo da chave do rótulo de uma sonda — o clique o reconhece */
export const CHAVE_DE_SONDA = 'sonda:';

/** a tinta da sonda: um ciano pálido que nenhum corpo da casa veste */
const COR_DA_SONDA: readonly [number, number, number] = [0.55, 0.86, 0.92];
export const COR_DO_MARCADOR_DA_SONDA = 'rgba(150, 222, 236, 0.9)';

/** UA (eclíptica) → cena (equatorial, pc) — a conta de `escada.paraPc` */
function naCena(x: number, y: number, z: number, out: THREE.Vector3): THREE.Vector3 {
  const eq = eclipticaParaEquatorial([x, y, z]);
  return out.set(eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC);
}

/** onde a sonda está na CENA no instante `jd`; `null` fora da tabela */
export function posicaoDaSondaNaCena(id: string, jd: number, out = new THREE.Vector3()): THREE.Vector3 | null {
  const e = estadoDaSonda(id, jd);
  return e ? naCena(e[0], e[1], e[2], out) : null;
}

export interface PoseDaSonda {
  alvo: THREE.Vector3;
  raio: number;
  eixoDe: THREE.Vector3;
  polo: THREE.Vector3;
  pisoRaio: number;
}

/** de quantos graus acima da eclíptica a câmera olha */
const ELEVACAO_DA_CHEGADA = 25;
/** a esfera enquadrada, em frações da distância ao Sol, e o ponto do
 *  segmento Sol→sonda que vai ao centro: puxado para a sonda, porque a
 *  ficha aberta come a direita e o nome dela precisa caber (2ª rodada:
 *  com o meio e 0,6 o nome da New Horizons caía embaixo da ficha) */
const FRACAO_DO_RAIO = 0.7;
const CENTRO_NO_SEGMENTO = 0.58;
/** o piso do zoom: chega-se até ~mil km do centro do quadro */
const PISO_DA_SONDA_PC = kmParaPc(1_000);

/**
 * A CHEGADA NUMA SONDA — "até onde ela já foi". O quadro é o SEGMENTO
 * Sol→sonda: o alvo é um ponto dele (`CENTRO_NO_SEGMENTO`) e a esfera enquadrada o cobre inteiro,
 * então o Sol (com os planetas em volta) e a sonda entram juntos, um em
 * cada lado. A câmera olha DE LADO, perpendicular ao segmento e 25° acima
 * da eclíptica, e do lado que põe o Sol à ESQUERDA da tela — a ficha
 * aberta ocupa a direita, e o Sol embaixo dela sumiria (visto na 1ª
 * rodada, quando o alvo era a própria sonda).
 */
export function poseDaSonda(id: string, jd: number): PoseDaSonda | null {
  const sonda = posicaoDaSondaNaCena(id, jd);
  if (!sonda) return null;
  const polo = POLO_ECLIPTICO.clone();
  const radial = sonda.clone().normalize();
  // radial × polo: com esta ordem a direita da tela aponta para a sonda
  const deLado = new THREE.Vector3().crossVectors(radial, polo);
  if (deLado.lengthSq() < 1e-12) deLado.set(1, 0, 0);
  deLado.normalize();
  const g = (ELEVACAO_DA_CHEGADA * Math.PI) / 180;
  const dir = deLado.multiplyScalar(Math.cos(g)).addScaledVector(polo, Math.sin(g)).normalize();
  return {
    alvo: sonda.clone().multiplyScalar(CENTRO_NO_SEGMENTO),
    raio: sonda.length() * FRACAO_DO_RAIO,
    eixoDe: eixoQuePousaEm(dir, polo),
    polo,
    pisoRaio: PISO_DA_SONDA_PC,
  };
}

const _pos = new THREE.Vector3();

/**
 * OS NOMES E OS MARCADORES DAS SONDAS — o losango na posição viva, com o
 * nome ao lado (o mesmo sistema de rótulos dos corpos e dos lugares).
 * Sonda fora da tabela (antes do lançamento) não tem rótulo.
 */
export function projetarSondas(
  camera: THREE.PerspectiveCamera,
  jd: number,
  foco: string | null,
  comMarcador: boolean
): StarLabel[] {
  const out: StarLabel[] = [];
  for (const sonda of SONDAS) {
    if (!posicaoDaSondaNaCena(sonda.id, jd, _pos)) continue;
    const l = projectForced(camera, sonda.nome, '', _pos, `${CHAVE_DE_SONDA}${sonda.id}`);
    if (!l) continue;
    l.distPc = _pos.distanceTo(camera.position);
    l.opacity = 0.95;
    l.detalhe = classeEmTexto('sonda');
    l.prioridade = sonda.id === foco ? PRIORIDADE_DO_ROTULO.foco : PRIORIDADE_DO_ROTULO.sonda;
    if (comMarcador) {
      l.comAnel = true;
      l.formaDoIcone = 'losango';
      l.corDoAnel = COR_DO_MARCADOR_DA_SONDA;
    }
    out.push(l);
  }
  return out;
}

/** quantos pontos da linha entre dois nós da tabela */
const PONTOS_POR_TRECHO = 6;
/** o brilho do caminho que ainda falta, contra o 1 do percorrido */
const BRILHO_DO_FUTURO = 0.28;
/** a opacidade da linha inteira (aditiva, como as órbitas) */
const ALFA_DA_TRAJETORIA = 0.8;

interface LinhaDaSonda {
  id: string;
  linha: Line2;
  geo: LineGeometry;
  /** o instante de cada vértice — é contra ele que o "agora" divide */
  jds: Float64Array;
  /** o fator de cor por vértice (o brilho), reescrito quando a data muda */
  cores: Float32Array;
  jdEscrito: number;
}

/**
 * A CAMADA DAS TRAJETÓRIAS. A linha de cada sonda é amostrada UMA vez,
 * nos nós da tabela (que já são densos onde a curva dobra, nos
 * sobrevoos) e entre eles; o que muda com a data é só o brilho de cada
 * vértice: até o instante vivo, cheio; depois, `BRILHO_DO_FUTURO`.
 */
export class TrajetoriasDasSondas {
  readonly group = new THREE.Group();
  /** a gaveta (`nosondas`), escrita pelo director antes do `update` */
  ligado = true;
  /** a sonda em foco (a escada é a dona) */
  foco: string | null = null;
  private readonly linhas = new Map<string, LinhaDaSonda>();

  constructor() {
    this.group.name = 'sondas';
  }

  private linhaDe(id: string): LinhaDaSonda {
    const pronta = this.linhas.get(id);
    if (pronta) return pronta;
    const nos = nosDaSonda(id);
    const n = (nos.length - 1) * PONTOS_POR_TRECHO + 1;
    const jds = new Float64Array(n);
    const posicoes = new Float32Array(n * 3);
    let k = 0;
    for (let i = 0; i < nos.length - 1; i++) {
      for (let j = 0; j < PONTOS_POR_TRECHO; j++) jds[k++] = nos[i][0] + ((nos[i + 1][0] - nos[i][0]) * j) / PONTOS_POR_TRECHO;
    }
    jds[k] = nos[nos.length - 1][0];
    for (let i = 0; i < n; i++) {
      posicaoDaSondaNaCena(id, jds[i], _pos);
      posicoes[i * 3] = _pos.x;
      posicoes[i * 3 + 1] = _pos.y;
      posicoes[i * 3 + 2] = _pos.z;
    }
    const cores = new Float32Array(n * 3).fill(1);
    const geo = new LineGeometry();
    geo.setPositions(posicoes);
    geo.setColors(cores);
    const material = new LineMaterial({
      color: new THREE.Color(COR_DA_SONDA[0], COR_DA_SONDA[1], COR_DA_SONDA[2]),
      linewidth: LARGURA_DA_FITA_PX,
      transparent: true,
      opacity: ALFA_DA_TRAJETORIA,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    });
    const linha = new Line2(geo, material);
    // logo depois das órbitas (8)
    linha.renderOrder = 9;
    linha.visible = false;
    this.group.add(linha);
    const nova = { id, linha, geo, jds, cores, jdEscrito: Number.NaN };
    this.linhas.set(id, nova);
    return nova;
  }

  /** escreve o brilho por vértice para o instante vivo (só quando muda) */
  private escreverAgora(l: LinhaDaSonda, jd: number) {
    if (l.jdEscrito === jd) return;
    l.jdEscrito = jd;
    // o `setColors` do three guarda as cores como pares início/fim de
    // segmento: o vértice i aparece no fim do segmento i−1 e no começo do i
    const atributo = l.geo.getAttribute('instanceColorStart') as THREE.InterleavedBufferAttribute;
    const dados = atributo.data;
    const arr = dados.array as Float32Array;
    const n = l.jds.length;
    for (let i = 0; i < n - 1; i++) {
      const b = l.jds[i + 1] <= jd ? 1 : BRILHO_DO_FUTURO;
      for (let c = 0; c < 6; c++) arr[i * 6 + c] = b;
    }
    dados.needsUpdate = true;
  }

  update(jd: number) {
    for (const l of this.linhas.values()) l.linha.visible = false;
    if (!this.ligado || !this.foco || !SONDAS.some((s) => s.id === this.foco)) return;
    if (!estadoDaSonda(this.foco, jd)) return;
    const l = this.linhaDe(this.foco);
    this.escreverAgora(l, jd);
    l.linha.visible = true;
  }

  dispose() {
    for (const l of this.linhas.values()) {
      l.geo.dispose();
      (l.linha.material as LineMaterial).dispose();
    }
    this.linhas.clear();
  }
}
