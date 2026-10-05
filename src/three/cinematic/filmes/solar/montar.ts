// A MONTAGEM DO FILME SOLAR (item 210) — os cinco roteiros (o prólogo
// no Sol, o ato I dos mundos de pedra e os três atos de fora da v3)
// lidos pelo MESMO leitor do filme galáctico, com os pontos e os
// números nomeados calculados a partir dos pinos (nada de coordenada
// copiada no JSON). A geometria de cada ato mora em `atos/` (um módulo
// por roteiro, mais `atos/geometria.ts` com o que é comum); aqui os
// pontos e números dos atos se reúnem. Não constrói Journey: devolve
// planos, inícios, duração, apoios, o calendário dos três relógios e o
// "cima"; quem registra o filme é o objeto `Filme`.
import * as THREE from 'three';
import { lerSequencia, type Shot } from '../../lerSequencia';
import { glide } from '../../movimentos';
import { montarApoiosDoRoteiro } from '../../apoiosDoRoteiro';
import { JD2_SOLAR_TDB, PINOS_SOLAR, RELOGIOS_SOLAR, type RelogioSolar } from './pinos';
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
  /** o instante dos atos de fora (JD2), de que o filme é retrato */
  jd: number;
  /** as rampas de um relógio ao outro, na ordem do corte: onde começam e
   *  quanto duram, em segundos do corte, e de que relógio a que relógio */
  trocas: { t: number; duracao: number; de: RelogioSolar; para: RelogioSolar }[];
  /** a data do céu (JD TDB) em cada segundo do corte */
  jdDoFilme(t: number): number;
  /** o "cima" da câmera: o polo norte da eclíptica na cena (equatorial J2000) */
  cima: THREE.Vector3;
  /** quantos planos cada roteiro (ato) deu, na ordem prólogo → afastamento */
  planosPorAto: number[];
}

/** o relógio de cada roteiro, na ordem prólogo → afastamento */
const RELOGIO_DO_ATO: readonly RelogioSolar[] = ['a', 'a', 'jupiter', 'fora', 'fora'];
/** quanto dura cada rampa de um relógio ao outro, em segundos */
const DURACAO_DA_TROCA = 1.5;
/** onde começa a rampa PARA cada relógio, em segundos do início do
 *  primeiro roteiro que o usa (negativo: antes do corte) — ver `trocas` */
const INICIO_DA_TROCA: Readonly<Partial<Record<RelogioSolar, number>>> = {
  jupiter: -DURACAO_DA_TROCA,
  fora: 1,
};

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
   * AS TROCAS DE RELÓGIO, em segundos do corte: cada roteiro corre no
   * relógio do seu ato, e onde o relógio muda o céu passa de um ao outro
   * numa RAMPA (`glide`, a de todo gesto do filme) de `DURACAO_DA_TROCA`
   * segundos, fora do quadro dos corpos que mudam.
   *
   * JD_A → JD_J acaba onde a travessia para Júpiter começa. Entre os dois
   * céus há nove dias e meio e Júpiter anda 0,072 UA: visto da saída de
   * Ceres (5,5 UA) são 0,62° — num degrau, um pulo de ~7 px do ponto que a câmera
   * mira; e dentro da travessia, que em 1 s já está a 2 UA de Júpiter,
   * seriam vários graus. Na rampa, nos últimos segundos da passagem por
   * Ceres, quando o olhar já virou para Júpiter, ele escorrega a ~0,02°
   * por quadro de 1/30 s, e a travessia começa inteira em JD_J, com
   * Júpiter no pino. Terra e Lua, que giram nove vezes e meia na rampa, estão a
   * 2,7 UA — pontos, a 47° ou mais da visada (montar.test.ts confere).
   *
   * JD_J → JD2 (5 h 52 min: Júpiter gira 213°, Io anda 50° na órbita)
   * cai DENTRO da chegada a Saturno, 1 s depois do corte: a câmera sai do
   * fim do arco a ~2 UA/s (o ritmo `settle`) e em 1/30 s já deixou
   * Júpiter e as galileanas para trás; a 1 s eles estão a 177° da
   * visada, e o folgado sobra para o ato II mudar de duração ou de fim
   * (atos/jupiter.test.ts confere, a cada 1/30 s da rampa, que estão a
   * mais de meio quadro mais 10° da visada). Mais cedo é melhor que mais
   * tarde: a 2,5 s Saturno, que a câmera mira, ainda é um ponto.
   */
  const inicioDoAto: number[] = [];
  for (let n = 0, i = 0; n < atos.length; i += atos[n].length, n++) inicioDoAto.push(starts[i]);
  const trocas: FilmeSolarMontado['trocas'] = [];
  for (let n = 1; n < atos.length; n++) {
    const de = RELOGIO_DO_ATO[n - 1];
    const para = RELOGIO_DO_ATO[n];
    if (de === para) continue;
    const inicio = INICIO_DA_TROCA[para];
    if (inicio === undefined) throw new Error(`filme solar: sem lugar para a troca de ${de} a ${para}`);
    trocas.push({ t: inicioDoAto[n] + inicio, duracao: DURACAO_DA_TROCA, de, para });
  }
  return {
    shots,
    starts,
    duracao: acc,
    apoios: montarApoiosDoRoteiro(shots, starts),
    pinos: PINOS_SOLAR,
    jd: JD2_SOLAR_TDB,
    trocas,
    jdDoFilme: (t) => {
      let jd = RELOGIOS_SOLAR[RELOGIO_DO_ATO[0]];
      for (const troca of trocas) {
        if (t <= troca.t) return jd;
        const para = RELOGIOS_SOLAR[troca.para];
        if (t < troca.t + troca.duracao) return jd + (para - jd) * glide((t - troca.t) / troca.duracao);
        jd = para;
      }
      return jd;
    },
    // a mesma rotação da cadeia dos pinos, aplicada ao polo da eclíptica
    cima: CIMA_DA_ECLIPTICA.clone(),
    planosPorAto: atos.map((a) => a.length),
  };
}
