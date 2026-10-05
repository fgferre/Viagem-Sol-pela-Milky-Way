// OS PINOS DO FILME SOLAR — onde cada corpo que a câmera visita está no
// céu do filme. Literais pela mesma razão de TERRA_PC/LUA_PC: o roteiro
// é puro e não pode buscar efeméride. Calculados UMA vez pela cadeia do
// app (efemerides.bin → posicaoHeliocentrica → eclipticaParaEquatorial ×
// AU_PARA_PC); `pinos.test.ts` recomputa cada um no SEU instante e cobra
// igualdade bit a bit.
//
// DOIS RELÓGIOS, como no filme galáctico (atos num instante, coda em
// outro). O prólogo e o ato I (Sol, Mercúrio, Vênus, Terra, Lua — e
// Marte e Ceres) correm em JD_A, o
// quarto minguante de 2026-01-10 15:49:37 UTC: a raiz exata de "Terra
// meia-iluminada vista da Lua" (k = 0,5, elongação 90°), e a hora em
// que o meio-dia está a 57°O — as Américas de frente para o Sol. Os
// atos de fora correm em JD2 = 2026-01-01 08:00 UTC (16:00 − 8 h),
// porque às 16:00 Io está a 177° do ponto subsolar de Júpiter e
// Encélado a 176° do de Saturno — as duas protagonistas atrás do
// planeta, no escuro. −8 h é o menor deslocamento, em horas inteiras até
// ±14 h, que põe Io entre 60° e 110° do ponto subsolar (109,6°: fora da
// sombra e longe do disco), Encélado entre 30° e 110° (91,9°) e Mimas e
// Hipérion abaixo de 110° (83,2° e 4,3°). A troca de relógio cai na
// travessia para Júpiter, com Terra e Lua fora do quadro (`tTroca`, em
// montar.ts).
import * as THREE from 'three';
import { JD_DO_FILME_TDB } from '../../journey';

/** o céu do prólogo e do ato I: o quarto minguante de 2026-01-10, 15:49:37 UTC */
export const JD_A_SOLAR_TDB = 2461051.16026012;
/** quanto o céu dos atos de fora anda em relação às 16:00 UTC de 2026-01-01, em horas */
export const DELTA_JD2_HORAS = -8;
/** o céu dos atos de fora (Júpiter, Saturno, afastamento): 2026-01-01 08:00 UTC */
export const JD2_SOLAR_TDB = JD_DO_FILME_TDB + DELTA_JD2_HORAS / 24;

/** os corpos do céu de JD_A; os outros são de JD2 */
export const CORPOS_DE_JD_A: ReadonlySet<string> = new Set([
  'mercury', 'venus', 'earth', 'moon', 'mars', 'ceres',
]);

const pc = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const PINOS_SOLAR: ReadonlyMap<string, THREE.Vector3> = new Map([
  ['sun', pc(0, 0, 0)],
  ['mercury', pc(-0.00000004323251790895513, -0.0000019866985529506867, -0.0000010568186206355426)],
  ['venus', pc(0.00000133822905917851, -0.0000029455907989730347, -0.0000014100968433251503)],
  ['earth', pc(-0.0000016346956313018727, 0.000004109430550141987, 0.0000017813840758880365)],
  ['moon', pc(-0.0000016468277075468393, 0.000004105665006642374, 0.0000017789376564969062)],
  ['mars', pc(0.0000023035318133954307, -0.000005868838909867969, -0.0000027540271927125264)],
  ['ceres', pc(0.00001211866076902956, 0.000006898501375673769, 0.0000007865250620261008)],
  ['jupiter', pc(-0.0000082244996465630537, 0.000021887201394739877, 0.0000095816484062320831)],
  ['io', pc(-0.0000082138078697747536, 0.000021894848934840235, 0.0000095854590658307327)],
  ['europa', pc(-0.0000082103378041228336, 0.000021872397789158861, 0.0000095749933046069813)],
  ['ganymede', pc(-0.0000081898806612642711, 0.000021886022758062355, 0.0000095816307706461865)],
  ['callisto', pc(-0.0000082318140327107180, 0.000021942009335877653, 0.0000096073665963013481)],
  ['saturn', pc(0.000046092157476377579, 0.0000018932913331745410, -0.0000012028073226667266)],
  ['enceladus', pc(0.000046092740680677272, 0.0000018855780414543731, -0.0000012022895478639156)],
  ['hyperion', pc(0.000046040125708046430, 0.0000018896478021109211, -0.0000011978636953681793)],
  ['mimas', pc(0.000046091694337218732, 0.0000018872068914552442, -0.0000012021493217877019)],
  ['titan', pc(0.000046129645125509543, 0.0000018851619799281664, -0.0000012055865662989665)],
]);

/** o pino de um corpo; corpo sem pino é erro de montagem, não silêncio */
export function pino(id: string): THREE.Vector3 {
  const p = PINOS_SOLAR.get(id);
  if (!p) throw new Error(`filme solar: sem pino para “${id}”`);
  return p;
}
