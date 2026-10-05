// A GEOMETRIA COMUM DOS ATOS DO FILME SOLAR — o que mais de um ato usa: a
// régua dos raios, os versores e giros, os pinos dos corpos, o "cima" da
// eclíptica e as unidades. Cada ato (`prologo.ts`, `casa.ts`, `jupiter.ts`,
// `saturno.ts`, `afastamento.ts`) deriva dos pinos os seus pontos e números
// nomeados; `../montar.ts` os reúne para o leitor dos roteiros.
import * as THREE from 'three';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../../../../lib/atlas/frameGalactico';
import { AU_KM } from '../../../../../lib/atlas/elementosOrbitais';
import { BODY_AXES } from '../../../../../lib/atlas/iauOrientation';
import { RAIO_SOL_PC } from '../../../../escala';
import { pino } from '../pinos';

const PC_POR_KM = AU_PARA_PC / AU_KM;
/** raio equatorial em pc, da fonte única BODY_AXES (a mesma do palco) */
export const raioPc = (id: string) => BODY_AXES[id][0] * PC_POR_KM;

export const versor = (v: THREE.Vector3) => v.clone().normalize();
export const rad = THREE.MathUtils.degToRad;
/** a direção a `graus` de `e`, girando para `f` (os dois ortonormais) */
export const girar = (e: THREE.Vector3, f: THREE.Vector3, graus: number) =>
  e.clone().multiplyScalar(Math.cos(rad(graus))).addScaledVector(f, Math.sin(rad(graus))).normalize();
/** a componente de `v` perpendicular a `eixo`, normalizada */
export const perpendicular = (v: THREE.Vector3, eixo: THREE.Vector3) =>
  versor(v.clone().addScaledVector(eixo, -v.dot(eixo)));
export const ate = (de: THREE.Vector3, para: THREE.Vector3) => versor(para.clone().sub(de));

export const SOL = pino('sun');
export const MERCURIO = pino('mercury');
export const VENUS = pino('venus');
export const TERRA = pino('earth');
export const LUA = pino('moon');
export const MARTE = pino('mars');
export const CERES = pino('ceres');
export const JUPITER = pino('jupiter');
export const IO = pino('io');
export const SATURNO = pino('saturn');
export const ENCELADO = pino('enceladus');
export const HIPERION = pino('hyperion');

export const R_MERCURIO = raioPc('mercury');
export const R_VENUS = raioPc('venus');
export const R_TERRA = raioPc('earth');
export const R_LUA = raioPc('moon');
export const R_MARTE = raioPc('mars');
export const R_CERES = raioPc('ceres');
export const R_JUPITER = raioPc('jupiter');
export const R_IO = raioPc('io');
export const R_SATURNO = raioPc('saturn');
export const R_ENCELADO = raioPc('enceladus');
export const R_HIPERION = raioPc('hyperion');
/** o polo norte da eclíptica na cena (equatorial J2000): o cima do filme */
export const CIMA_DA_ECLIPTICA = new THREE.Vector3(...eclipticaParaEquatorial([0, 0, 1])).normalize();

/** o raio do Sol, em pc */
export const R_SOL = RAIO_SOL_PC;
/** o equinócio (+X da cena): está no plano do equador do Sol desenhado e no da eclíptica */
export const EQUINOCIO = new THREE.Vector3(1, 0, 0);
/** a unidade astronômica, em pc */
export const UA = AU_PARA_PC;

/** os pinos dos corpos que a câmera visita, pelo nome que os roteiros usam */
export const PONTOS_DOS_CORPOS: Readonly<Record<string, THREE.Vector3>> = {
  Sol: SOL, Mercurio: MERCURIO, Venus: VENUS, Terra: TERRA, Lua: LUA, Marte: MARTE, Ceres: CERES,
  Jupiter: JUPITER, Io: IO, Saturno: SATURNO, Encelado: ENCELADO, Hiperion: HIPERION,
};
