// ============================================================
// UM PONTO DO ANEL DE SATURNO — o destino do Atlas para chegar à mão
// até poucos metros da camada de gelo e atravessá-la (15/11/2026).
//
// Entra pela porta dos objetos pequenos (`Escada.visitarSonda`): uma
// `pose(jd)` com alvo, esfera, eixo, polo e piso, recomposta pelo
// religador do relógio. O alvo é um ponto do PLANO MÉDIO do anel A, a
// 2,13 raios de Saturno — o mesmo raio da travessia do filme solar, onde
// as esteiras e os pedaços estão bem desenhados.
//
// O PONTO NÃO GIRA COM O RELÓGIO, e é a lei dos pedaços que manda: o
// passo do relógio de `PedrasDoAnel.atualizar` só acumula o CISALHAMENTO
// medido no raio da câmera (`g`, `e`); a fase de cada pedaço não tem giro
// de conjunto, então os do raio da câmera ficam parados no frame do anel
// (inercial, preso ao céu, sem o W do planeta) e os de raio vizinho
// derivam pelo cisalhamento. O ponto fica na mesma longitude desse frame,
// escolhida uma vez na ENTRADA a partir do Sol; o relógio só o leva junto
// com Saturno pelo céu. Com o tempo acelerado ele pode entrar na sombra
// do planeta: é real.
// ============================================================
import * as THREE from 'three';
import { BODY_AXES, IAU_ORIENTATIONS } from '../../lib/atlas/iauOrientation';
import { GRAU } from '../cinematic/enquadramento';
import { kmParaPc } from '../escala';
import { orientacaoInercialDoAnelNaCena } from './corpos/orientacaoNaCena';
import { eixoQuePousaEm } from './lugaresDoCeu';
import type { PoseDaSonda } from './sondas';

/** o id do link (`?foco=aneis-de-saturno`) e da lista da busca */
export const ID_DO_PONTO_DO_ANEL = 'aneis-de-saturno';
/** o nome nas duas línguas (o cabeçalho e a chave do link) */
export const NOME_DO_PONTO_DO_ANEL = { nome: 'Anéis de Saturno', nomeEn: "Saturn's rings" } as const;
/** o raio do ponto no plano do anel, km: 2,13 raios equatoriais, no anel A */
export const RAIO_DO_PONTO_KM = 2.13 * BODY_AXES.saturn[0]!;
/** quantos graus o ponto fica do meridiano do Sol no plano do anel, no sentido +θ */
export const LONGITUDE_DESDE_O_SOL_GRAUS = 65;
/** a elevação da câmera na chegada, sobre a face que o Sol ilumina */
export const ELEVACAO_DA_CHEGADA_GRAUS = 30;
/** a distância da chegada ao ponto, km: os pedaços já são grão com sombra */
export const CHEGADA_KM = 1.5;
/** a razão distância/esfera do enquadramento na mesa (lente de 58°, `enquadrar`;
 *  medida no navegador a 1280×800: 3,237) — em retrato a chegada fica mais longe */
const FATOR_DO_ENQUADRAMENTO = 3.24;
/** o piso da roda, km: o rig para a `K_MIN_RAIOS` (2) vezes `pisoRaio` */
export const PISO_KM = 2.5e-3;

/** a longitude do ponto e a face do anel que fica no alto, fixadas na entrada */
export interface EscolhaDoPontoDoAnel {
  /** longitude no frame do anel (rad; 0 = nodo, +θ = sentido orbital) */
  lon: number;
  /** +1 = a face norte no alto, −1 = a sul: a que o Sol iluminava na entrada */
  face: 1 | -1;
}

/** a base do anel na cena: x̂ (nodo), ŷ (+θ a 90°) e ẑ (polo) — a de `componentesNoFrameDoAnel` */
function baseDoAnel(jd: number) {
  const o = orientacaoInercialDoAnelNaCena(IAU_ORIENTATIONS.saturn, jd);
  return {
    x: new THREE.Vector3(...o.colunaX),
    y: new THREE.Vector3(...o.colunaZ).negate(),
    z: new THREE.Vector3(...o.colunaY),
  };
}

/** a escolha da entrada: o ponto a `LONGITUDE_DESDE_O_SOL_GRAUS` do Sol, na face acesa */
export function escolherPontoDoAnel(centroDeSaturno: THREE.Vector3, jd: number): EscolhaDoPontoDoAnel {
  const { x, y, z } = baseDoAnel(jd);
  const sol = centroDeSaturno.clone().negate();
  return {
    lon: Math.atan2(sol.dot(y), sol.dot(x)) + LONGITUDE_DESDE_O_SOL_GRAUS * GRAU,
    face: sol.dot(z) < 0 ? -1 : 1,
  };
}

/**
 * A POSE DO PONTO no instante `jd`, com Saturno em `centroDeSaturno` (a
 * cadeia do mesh: `posicaoDoGiganteUA`). A câmera chega por fora do ponto,
 * olhando para Saturno, `ELEVACAO_DA_CHEGADA_GRAUS` acima da face acesa; o
 * polo no alto é a normal dessa face, então o arrasto vertical cruza o
 * plano. O eixo entregue ao rig é o que o repouso dele leva a essa direção.
 */
export function poseDoPontoDoAnel(
  centroDeSaturno: THREE.Vector3,
  jd: number,
  escolha: EscolhaDoPontoDoAnel
): PoseDaSonda {
  const { x, y, z } = baseDoAnel(jd);
  const radial = x.multiplyScalar(Math.cos(escolha.lon)).addScaledVector(y, Math.sin(escolha.lon));
  const polo = z.multiplyScalar(escolha.face);
  const e = ELEVACAO_DA_CHEGADA_GRAUS * GRAU;
  const chegada = radial.clone().multiplyScalar(Math.cos(e)).addScaledVector(polo, Math.sin(e));
  return {
    alvo: centroDeSaturno.clone().addScaledVector(radial, kmParaPc(RAIO_DO_PONTO_KM)),
    raio: kmParaPc(CHEGADA_KM / FATOR_DO_ENQUADRAMENTO),
    eixoDe: eixoQuePousaEm(chegada, polo),
    polo,
    pisoRaio: kmParaPc(PISO_KM / 2),
  };
}
