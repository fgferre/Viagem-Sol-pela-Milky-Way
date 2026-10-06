// OS PINOS DO FILME SOLAR — onde cada corpo que a câmera visita está no
// céu do filme. Literais pela mesma razão de TERRA_PC/LUA_PC: o roteiro
// é puro e não pode buscar efeméride. Calculados UMA vez pela cadeia do
// app (efemerides.bin → posicaoHeliocentrica → eclipticaParaEquatorial ×
// AU_PARA_PC); `pinos.test.ts` recomputa cada um no SEU instante e cobra
// igualdade bit a bit.
//
// TRÊS RELÓGIOS, como no filme galáctico (atos num instante, coda em
// outro). O prólogo e o ato I (Sol, Mercúrio, Vênus, Terra, Lua — e
// Marte e Ceres) correm em JD_A, o
// quarto minguante de 2026-01-10 15:49:37 UTC: a raiz exata de "Terra
// meia-iluminada vista da Lua" (k = 0,5, elongação 90°), e a hora em
// que o meio-dia está a 57°O — as Américas de frente para o Sol. O ato
// II (Júpiter e as galileanas) corre em JD_J = 2026-01-01 02:08 UTC
// (16:00 − 13 h 52 min): a Grande Mancha Vermelha, onde a textura a
// desenha, a 36,2° do ponto subsolar e a 16,5° da direção de Ceres —
// acesa e de frente para a câmera que chega de lá —, Io a 60,1° do
// ponto subsolar (fora da sombra) e a 36,2° da Mancha (ao lado do disco
// para quem chega), Europa a 3,3° do ponto subsolar e a 38,0° da
// Mancha. É o minuto de janeiro que melhor passa nos critérios do ato
// (Mancha a até 45° do Sol e do lado de Ceres; Io a 60–110° do ponto
// subsolar e a 30–150° da Mancha; Europa a até 110° e a 30° ou mais da
// Mancha; desempate: a Mancha mais perto do Sol), numa busca de 10 em
// 10 min e depois de minuto a minuto de 30/12 a 03/01
// (capturas/viagem-solar/v4-ato2/ferramentas/hora-de-jupiter-fina-tabela.md).
// A Mancha, a 20°S, nunca chega a menos de ~22° do ponto subsolar; a
// única outra janela, 2025-12-31 06:00 UTC, a põe a 28,8°, mas com Io a
// 110° (no limite) e fora de janeiro. Os atos de fora que restam
// (Saturno e o afastamento) correm em JD2 = 2026-01-01 08:00 UTC (16:00
// − 8 h), porque às 16:00 Encélado está a 176° do ponto subsolar de
// Saturno — atrás do planeta, no escuro. −8 h foi escolhido quando JD2
// ainda levava Io (o menor deslocamento, em horas inteiras até ±14 h,
// que também a punha entre 60° e 110°); para Saturno sozinho −7 h já
// bastaria, e −8 h fica: Encélado entre 30° e 110° (91,9°), Mimas,
// Hipérion e Jápeto abaixo de 110° (83,2°, 4,3° e 64,4°); Titã, a 165,2°,
// está atrás de Saturno para quem vem do Sol, mas fora da sombra, e a
// câmera a visita vindo do lado do planeta (atos/saturno.ts). As trocas de relógio são
// rampas fora do quadro: JD_A → JD_J no fim da passagem por Ceres, com
// Terra e Lua fora dele; JD_J → JD2 dentro da chegada a Saturno, com
// Júpiter e as galileanas atrás da câmera (`trocas`, em montar.ts).
import * as THREE from 'three';
import { JD_DO_FILME_TDB } from '../../journey';

/** o céu do prólogo e do ato I: o quarto minguante de 2026-01-10, 15:49:37 UTC */
export const JD_A_SOLAR_TDB = 2461051.16026012;
/** quanto o céu do ato II anda em relação às 16:00 UTC de 2026-01-01, em minutos */
export const DELTA_JDJ_MINUTOS = -832;
/** o céu do ato II (Júpiter e as galileanas): 2026-01-01 02:08 UTC */
export const JD_J_SOLAR_TDB = JD_DO_FILME_TDB + DELTA_JDJ_MINUTOS / 1440;
/** quanto o céu dos atos de fora anda em relação às 16:00 UTC de 2026-01-01, em horas */
export const DELTA_JD2_HORAS = -8;
/** o céu dos atos de fora (Saturno, afastamento): 2026-01-01 08:00 UTC */
export const JD2_SOLAR_TDB = JD_DO_FILME_TDB + DELTA_JD2_HORAS / 24;

/** os três relógios do filme, pelo nome (JD TDB) */
export const RELOGIOS_SOLAR = { a: JD_A_SOLAR_TDB, jupiter: JD_J_SOLAR_TDB, fora: JD2_SOLAR_TDB } as const;
export type RelogioSolar = keyof typeof RELOGIOS_SOLAR;

/** o relógio de cada corpo com pino (o Sol, na origem, não tem) */
export const RELOGIO_DO_CORPO: ReadonlyMap<string, RelogioSolar> = new Map<string, RelogioSolar>([
  ...['mercury', 'venus', 'earth', 'moon', 'mars', 'ceres'].map((id) => [id, 'a'] as const),
  ...['jupiter', 'io', 'europa', 'ganymede', 'callisto'].map((id) => [id, 'jupiter'] as const),
  ...['saturn', 'enceladus', 'hyperion', 'mimas', 'titan', 'iapetus'].map((id) => [id, 'fora'] as const),
]);

/** a Grande Mancha Vermelha onde a textura de Júpiter a desenha: latitude
 *  planetocêntrica e longitude leste (Sistema III do motor), em graus —
 *  medida no mapa (capturas/viagem-solar/v4-ato2/ferramentas/hora-de-jupiter-tabela.md) */
export const GRM_NA_TEXTURA = { lat: -20.3, lonLeste: 312.06 } as const;

const pc = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const PINOS_SOLAR: ReadonlyMap<string, THREE.Vector3> = new Map([
  ['sun', pc(0, 0, 0)],
  ['mercury', pc(-0.00000004323251790895513, -0.0000019866985529506867, -0.0000010568186206355426)],
  ['venus', pc(0.00000133822905917851, -0.0000029455907989730347, -0.0000014100968433251503)],
  ['earth', pc(-0.0000016346956313018727, 0.000004109430550141987, 0.0000017813840758880365)],
  ['moon', pc(-0.0000016468277075468393, 0.000004105665006642374, 0.0000017789376564969062)],
  ['mars', pc(0.0000023035318133954307, -0.000005868838909867969, -0.0000027540271927125264)],
  ['ceres', pc(0.00001211866076902956, 0.000006898501375673769, 0.0000007865250620261008)],
  ['jupiter', pc(-0.000008215931542601324, 0.000021889569187554324, 0.000009582454747872488)],
  ['io', pc(-0.000008202454461233301, 0.000021887148010066862, 0.000009581514220518238)],
  ['europa', pc(-0.00000821003281947248, 0.000021870761289584736, 0.000009573706591546871)],
  ['ganymede', pc(-0.000008182343276848696, 0.000021881749095300363, 0.000009579235298464538)],
  ['callisto', pc(-0.000008217644025404012, 0.000021944684469833736, 0.000009608400922859954)],
  ['saturn', pc(0.000046092157476377579, 0.0000018932913331745410, -0.0000012028073226667266)],
  ['enceladus', pc(0.000046092740680677272, 0.0000018855780414543731, -0.0000012022895478639156)],
  ['hyperion', pc(0.000046040125708046430, 0.0000018896478021109211, -0.0000011978636953681793)],
  ['mimas', pc(0.000046091694337218732, 0.0000018872068914552442, -0.0000012021493217877019)],
  ['titan', pc(0.000046129645125509543, 0.0000018851619799281664, -0.0000012055865662989665)],
  ['iapetus', pc(0.00004603851511844557, 0.0000019921492523755735, -0.0000011738771274674208)],
]);

/** o pino de um corpo; corpo sem pino é erro de montagem, não silêncio */
export function pino(id: string): THREE.Vector3 {
  const p = PINOS_SOLAR.get(id);
  if (!p) throw new Error(`filme solar: sem pino para “${id}”`);
  return p;
}
