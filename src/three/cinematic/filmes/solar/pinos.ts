// OS PINOS DO FILME SOLAR — onde cada corpo que a câmera visita está no
// céu do filme. Literais pela mesma razão de TERRA_PC/LUA_PC: o roteiro
// é puro e não pode buscar efeméride. Calculados UMA vez pela cadeia do
// app (efemerides.bin → posicaoHeliocentrica → eclipticaParaEquatorial ×
// AU_PARA_PC); `pinos.test.ts` recomputa cada um no SEU instante e cobra
// igualdade bit a bit.
//
// DOIS RELÓGIOS, como no filme galáctico (atos num instante, coda em
// outro). O ato I corre em JD1 = JD_DO_FILME_TDB, as 16:00 UTC de
// 2026-01-01 que acendem as Américas: Terra e Lua são os pinos que já
// existiam. Os atos II–IV correm em JD2 = JD1 − 8 h (08:00 UTC do mesmo
// dia), porque em JD1 Io está a 177° do ponto subsolar de Júpiter e
// Encélado a 176° do de Saturno — as duas protagonistas atrás do
// planeta, no escuro. −8 h é o menor deslocamento, em horas inteiras até
// ±14 h, que põe Io entre 60° e 110° do ponto subsolar (109,6°: fora da
// sombra e longe do disco), Encélado entre 30° e 110° (91,9°) e Mimas e
// Hipérion abaixo de 110° (83,2° e 4,3°). A troca de relógio cai na
// travessia Terra→Júpiter, com Terra e Lua fora do quadro (`T_TROCA`,
// em montar.ts).
import * as THREE from 'three';
import { JD_DO_FILME_TDB, LUA_PC, TERRA_PC } from '../../journey';

/** o céu do ato I (Terra e Lua): o instante da coda galáctica */
export const JD1_SOLAR_TDB = JD_DO_FILME_TDB;
/** quanto o céu dos atos II–IV anda em relação ao do ato I, em horas */
export const DELTA_JD2_HORAS = -8;
/** o céu dos atos II–IV (Júpiter, Saturno, afastamento) */
export const JD2_SOLAR_TDB = JD1_SOLAR_TDB + DELTA_JD2_HORAS / 24;

const pc = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const PINOS_SOLAR: ReadonlyMap<string, THREE.Vector3> = new Map([
  ['sun', pc(0, 0, 0)],
  ['earth', TERRA_PC],
  ['moon', LUA_PC],
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
