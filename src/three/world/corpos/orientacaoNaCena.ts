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
 * O SOL (OU A CÂMERA) NAS COORDENADAS DA `RingGeometry` — a ponte que
 * faltava, e que custou ao dono a sombra invertida do item 91.
 *
 * O anel é uma `RingGeometry`, que mora no plano XY; o mesh a levanta
 * com `M = Base(anelX, anelY, anelZ) · S(a) · Rx(−π/2)`. Logo a base
 * local do anel, escrita na cena, é
 *
 *     x̂ = anelX      ŷ = −anelZ      ẑ = anelY   (o polo)
 *
 * e as COMPONENTES de um vetor da cena nessa base são os produtos
 * escalares com esses três — que é a INVERSA de `Rx(−π/2)`, não ela
 * mesma. Aplicar a rotação para a frente (o que o código fazia até
 * 2026-08-25) devolve o mesmo vetor girado MEIA VOLTA em torno de x̂:
 * a sombra do globo saía espelhada no plano do anel e ia parar do lado
 * do Sol, e a fotometria da camada lia uma câmera que não era a da cena.
 *
 * Existe UMA função porque existia o MESMO erro copiado em dois lugares
 * (o anel de Saturno em `gigante.ts` e o de Quaoar em `rochoso.ts`).
 */
export function componentesNoFrameDoAnel(
  v: THREE.Vector3,
  anelX: THREE.Vector3,
  anelY: THREE.Vector3,
  anelZ: THREE.Vector3,
  out: THREE.Vector3
): THREE.Vector3 {
  return out.set(v.dot(anelX), -v.dot(anelZ), v.dot(anelY));
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

/**
 * A ESFERA UNITÁRIA CUJO UV CAI NA LAT/LON PLANETOCÊNTRICA depois da escala
 * do elipsoide. Os rochosos e os gigantes põem a figura na matriz —
 * `S(a, a·razaoC, a·razaoB)` em (X, Y, Z), +Y no polo — e a cadeia de dados
 * entrega todo mapa em latitude PLANETOCÊNTRICA (`paraLatitudePlanetocentrica`,
 * `lib-texturas.mjs`). Com o vértice onde a SphereGeometry o põe, a escala
 * levava a linha do mapa à latitude PARAMÉTRICA (tan φc = (c/a)·tan β) e, no
 * triaxial, a coluna à longitude paramétrica (tan λc = (b/a)·tan λβ): 10° em
 * Fobos, 3° em Saturno, 23° em Haumea.
 *
 * O uv fica e o vértice anda: para o uv de (λ, φ), u = `direcaoLocalDeLonLat`;
 * o ponto do elipsoide nessa direção, em raios de a, é P = u / |u ⊘ k| com
 * k = (1, razaoC, razaoB), e o vértice antes da escala é P ⊘ k =
 * normalize(u ⊘ k) — ainda na esfera unitária, então o `vLocal` dos shaders, o
 * relevo radial (que só estica a direção) e o boundingSphere seguem como eram.
 * A normal do atributo acompanha a posição. Esfera (razões 1) sai intacta,
 * byte a byte.
 */
export function esferaNoPlanetocentrico<G extends THREE.BufferGeometry>(
  geo: G,
  razaoC: number,
  razaoB: number
): G {
  if (razaoC === 1 && razaoB === 1) return geo;
  const uv = geo.getAttribute('uv');
  const pos = geo.getAttribute('position');
  const nrm = geo.getAttribute('normal');
  for (let i = 0; i < pos.count; i++) {
    const u = direcaoLocalDeLonLat((uv.getX(i) - 0.5) * 360, (uv.getY(i) - 0.5) * 180);
    const x = u[0];
    const y = u[1] / razaoC;
    const z = u[2] / razaoB;
    const s = 1 / Math.hypot(x, y, z);
    pos.setXYZ(i, x * s, y * s, z * s);
    nrm.setXYZ(i, x * s, y * s, z * s);
  }
  pos.needsUpdate = true;
  nrm.needsUpdate = true;
  return geo;
}
