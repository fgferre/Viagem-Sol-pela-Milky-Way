// ============================================================
// A ORIENTAÇÃO IAU→cena, GENÉRICA de todos os corpos resolvidos.
//
// As três colunas da matriz local→cena (base IAU no frame da cena),
// a base inercial do anel, os eixos como o mesh os gravou (o que o
// oráculo lê) e a convenção UV→direção da SphereGeometry. Morava em
// terra.ts; saiu porque serve à Terra, à Lua, aos rochosos e aos
// gigantes por igual. As INSTÂNCIAS por corpo (orientacaoDaTerraNaCena)
// ficam com cada corpo.
// ============================================================
import * as THREE from 'three';
import type { Vec3 } from '../../../lib/atlas/frameGalactico';
import type { IauOrientation } from '../../../lib/atlas/iauOrientation';
import { baseCorpoEquatorial } from '../../../lib/atlas/orientacao';

const DEG_PARA_RAD = Math.PI / 180;

export interface OrientacaoNaCena {
  colunaX: Vec3;
  colunaY: Vec3;
  colunaZ: Vec3;
  /** W desenrolado em radianos — a deriva das nuvens deriva DELE. */
  wRad: number;
}

/**
 * AS TRÊS COLUNAS da matriz local→cena de um corpo IAU num instante —
 * a ponte entre a base IAU (equatorial J2000, que é o frame da cena) e
 * a convenção de esfera do three (+Y no polo, `direcaoLocalDeLonLat`).
 *
 *   colunaX = x̂(W) = nodoQ·cos W + lesteDeQ·sin W  (o meridiano-primo)
 *   colunaY = polo                                  (o eixo de spin)
 *   colunaZ = x̂(W) × polo                           (fecha a tríade, det +1)
 *
 * GENÉRICA desde a F2b (o material comum dos corpos congela na F2 —
 * regra de paralelização do desenho da onda): a Terra e a Lua passam
 * pelas MESMAS colunas, cada uma com o seu registro IAU — a libração da
 * Lua entra sozinha, porque mora nos termos periódicos do W do kernel.
 * É o transform que os ORÁCULOS de sub-ponto solar julgam (terra.test.ts
 * e lua.test.ts): o mesh usa ESTA função, o teste inverte ESTA função —
 * uma textura girada 90° reprova lá antes de qualquer olho ver.
 */
export function orientacaoDoCorpoNaCena(
  o: IauOrientation,
  jdTdb: number
): OrientacaoNaCena {
  const { nodoQ, lesteDeQ, polo, wDeg } = baseCorpoEquatorial(o, jdTdb);
  const w = wDeg * DEG_PARA_RAD;
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const colunaX: Vec3 = [
    nodoQ[0] * cw + lesteDeQ[0] * sw,
    nodoQ[1] * cw + lesteDeQ[1] * sw,
    nodoQ[2] * cw + lesteDeQ[2] * sw,
  ];
  const colunaZ: Vec3 = [
    colunaX[1] * polo[2] - colunaX[2] * polo[1],
    colunaX[2] * polo[0] - colunaX[0] * polo[2],
    colunaX[0] * polo[1] - colunaX[1] * polo[0],
  ];
  return { colunaX, colunaY: polo, colunaZ, wRad: w };
}

/**
 * Base INERCIAL do anel: o mesmo equador do corpo (nodoQ × polo),
 * sem o W(t). O padrão do anel não gira uma volta por dia do
 * planeta — está preso ao céu, não ao meridiano-primo.
 */
export function orientacaoInercialDoAnelNaCena(
  o: IauOrientation,
  jdTdb: number
): { colunaX: Vec3; colunaY: Vec3; colunaZ: Vec3 } {
  const { nodoQ, polo } = baseCorpoEquatorial(o, jdTdb);
  const colunaZ: Vec3 = [
    nodoQ[1] * polo[2] - nodoQ[2] * polo[1],
    nodoQ[2] * polo[0] - nodoQ[0] * polo[2],
    nodoQ[0] * polo[1] - nodoQ[1] * polo[0],
  ];
  return { colunaX: nodoQ, colunaY: polo, colunaZ };
}

/**
 * Eixos unitários como o MESH os gravou (colunas da matriz, sem a
 * escala). O oráculo D-E4 lê ISTO — não a função que escreveu a
 * matriz. Deitar o polo no equador na malha tem de reprovar.
 */
export function eixosDoMesh(mesh: THREE.Object3D): {
  colunaX: Vec3;
  colunaY: Vec3;
  colunaZ: Vec3;
} {
  const e = mesh.matrix.elements;
  const col = (i: number): Vec3 => {
    const x = e[i];
    const y = e[i + 1];
    const z = e[i + 2];
    const n = Math.hypot(x, y, z) || 1;
    return [x / n, y / n, z / n];
  };
  return { colunaX: col(0), colunaY: col(4), colunaZ: col(8) };
}

/**
 * A CONVENÇÃO UV→direção da SphereGeometry do three, escrita uma vez e
 * PINADA contra a geometria real no teste (é o elo que faltaria ao
 * oráculo): com a textura equiretangular de Greenwich no centro
 * (u = lon/360 + 0,5) e +Y no polo norte, o ponto (lon LESTE, lat)
 * mora na direção local
 *
 *     ( cos lat · cos lon,  sin lat,  −cos lat · sin lon ).
 */
export function direcaoLocalDeLonLat(lonEastDeg: number, latDeg: number): Vec3 {
  const lon = lonEastDeg * DEG_PARA_RAD;
  const lat = latDeg * DEG_PARA_RAD;
  const cosLat = Math.cos(lat);
  return [cosLat * Math.cos(lon), Math.sin(lat), -cosLat * Math.sin(lon)];
}
