// A MONTAGEM DO FILME SOLAR (item 210) — os cinco roteiros (o prólogo
// no Sol, o ato I dos mundos de pedra e os três atos de fora da v3)
// lidos pelo MESMO leitor do filme galáctico, com os pontos e os
// números nomeados calculados a partir dos pinos (nada de coordenada
// copiada no JSON). A geometria de cada ato mora em `atos/` (um módulo
// por roteiro, mais `atos/geometria.ts` com o que é comum); aqui os
// pontos e números dos atos se reúnem. Não constrói Journey: devolve
// planos, inícios, duração, apoios, o calendário dos dois relógios e o
// "cima"; quem registra o filme é o objeto `Filme`.
import * as THREE from 'three';
import { lerSequencia, type Shot } from '../../lerSequencia';
import { glide } from '../../movimentos';
import { montarApoiosDoRoteiro } from '../../apoiosDoRoteiro';
import { JD_A_SOLAR_TDB, JD2_SOLAR_TDB, PINOS_SOLAR } from './pinos';
import { CIMA_DA_ECLIPTICA, PONTOS_DOS_CORPOS, raioPc } from './atos/geometria';
import { NUMEROS_PROLOGO, PONTOS_PROLOGO } from './atos/prologo';
import { NUMEROS_CASA, PONTOS_CASA } from './atos/casa';
import { NUMEROS_JUPITER, PONTOS_JUPITER } from './atos/jupiter';
import { NUMEROS_SATURNO, PONTOS_SATURNO } from './atos/saturno';
import { NUMEROS_AFASTAMENTO, PONTOS_AFASTAMENTO } from './atos/afastamento';
import prologo from '../../roteiros/solar/prologo.json';
import casa from '../../roteiros/solar/casa.json';
import jupiter from '../../roteiros/solar/jupiter.json';
import saturno from '../../roteiros/solar/saturno.json';
import afastamento from '../../roteiros/solar/afastamento.json';

export { raioPc };
export { RAIO_DOS_ANEIS, RAIO_DO_CRUZAMENTO } from './atos/saturno';
export { D_INICIO_DA_TRASEIRA_UA, D_FIM_DA_TRASEIRA_UA, D_DO_FECHO_PC } from './atos/afastamento';

/** os pontos nomeados dos cinco roteiros, em pc */
const PONTOS: Readonly<Record<string, THREE.Vector3>> = {
  ...PONTOS_DOS_CORPOS, ...PONTOS_PROLOGO, ...PONTOS_CASA, ...PONTOS_JUPITER,
  ...PONTOS_SATURNO, ...PONTOS_AFASTAMENTO,
};

/** os números nomeados: distâncias em pc; o rolamento em radianos */
const NUMEROS: Readonly<Record<string, number>> = {
  ...NUMEROS_PROLOGO, ...NUMEROS_CASA, ...NUMEROS_JUPITER, ...NUMEROS_SATURNO, ...NUMEROS_AFASTAMENTO,
};

export interface FilmeSolarMontado {
  shots: Shot[];
  starts: number[];
  duracao: number;
  apoios: ReturnType<typeof montarApoiosDoRoteiro>;
  pinos: typeof PINOS_SOLAR;
  /** o instante dos atos de fora (= jd2), de que o filme é retrato */
  jd: number;
  /** o céu do prólogo e do ato I (Sol, Mercúrio, Vênus, Terra, Lua) */
  jdA: number;
  /** o céu dos atos de fora (Júpiter, Saturno, afastamento) */
  jd2: number;
  /** onde o céu começa a passar de jdA a jd2, em segundos do corte */
  tTroca: number;
  /** quanto dura a passagem de jdA a jd2, em segundos do corte */
  duracaoDaTroca: number;
  /** a data do céu (JD TDB) em cada segundo do corte */
  jdDoFilme(t: number): number;
  /** o "cima" da câmera: o polo norte da eclíptica na cena (equatorial J2000) */
  cima: THREE.Vector3;
  /** quantos planos cada roteiro (ato) deu, na ordem prólogo → afastamento */
  planosPorAto: number[];
}

/** a rampa do céu de JD_A para JD2, em segundos (ver `tTroca`) */
const DURACAO_DA_TROCA = 1.5;

export function montarFilmeSolar(): FilmeSolarMontado {
  const atos = [prologo, casa, jupiter, saturno, afastamento].map((dado) =>
    lerSequencia(dado, PONTOS, NUMEROS));
  const shots = atos.flat();
  const starts: number[] = [];
  let acc = 0;
  for (const s of shots) {
    starts.push(acc);
    acc += s.dur;
  }
  /**
   * A TROCA DE RELÓGIO (JD_A → JD2), em segundos do corte. Entre os dois
   * céus há nove dias e Júpiter anda 0,068 UA: visto da saída de Ceres
   * (5,5 UA) são 0,61° — num degrau, um pulo de ~7 px do ponto que a câmera
   * mira; e dentro da travessia, que em 1 s já está a 2 UA de Júpiter,
   * seriam vários graus. Por isso a troca é uma RAMPA (`glide`, a de todo
   * gesto do filme) nos últimos `DURACAO_DA_TROCA` segundos da passagem por
   * Ceres, quando o olhar já virou para Júpiter: ele escorrega 0,61° a
   * ~0,02° por quadro de 1/30 s, e a travessia começa inteira em JD2, com
   * Júpiter no pino. Terra e Lua, que giram nove vezes na rampa, estão a
   * 2,7 UA — pontos, a 47° ou mais da visada (montar.test.ts confere as
   * três coisas).
   */
  const fimDaTroca = starts[atos[0].length + atos[1].length];
  const tTroca = fimDaTroca - DURACAO_DA_TROCA;
  return {
    shots,
    starts,
    duracao: acc,
    apoios: montarApoiosDoRoteiro(shots, starts),
    pinos: PINOS_SOLAR,
    jd: JD2_SOLAR_TDB,
    jdA: JD_A_SOLAR_TDB,
    jd2: JD2_SOLAR_TDB,
    tTroca,
    duracaoDaTroca: DURACAO_DA_TROCA,
    jdDoFilme: (t) => {
      if (t <= tTroca) return JD_A_SOLAR_TDB;
      if (t >= fimDaTroca) return JD2_SOLAR_TDB;
      return JD_A_SOLAR_TDB + (JD2_SOLAR_TDB - JD_A_SOLAR_TDB) * glide((t - tTroca) / DURACAO_DA_TROCA);
    },
    // a mesma rotação da cadeia dos pinos, aplicada ao polo da eclíptica
    cima: CIMA_DA_ECLIPTICA.clone(),
    planosPorAto: atos.map((a) => a.length),
  };
}
