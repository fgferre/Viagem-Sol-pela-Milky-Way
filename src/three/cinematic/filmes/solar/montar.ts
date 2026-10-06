// A MONTAGEM DO FILME SOLAR (item 210) — os seis roteiros (o prólogo
// no Sol, o ato I dos mundos de pedra, os três atos de fora e o epílogo
// de volta à Terra) lidos pelo MESMO leitor do filme galáctico, com os
// pontos e os números nomeados calculados a partir dos pinos (nada de
// coordenada copiada no JSON). A geometria de cada ato mora em `atos/` (um módulo
// por roteiro, mais `atos/geometria.ts` com o que é comum); aqui os
// pontos e números dos atos se reúnem. Não constrói Journey: devolve
// planos, inícios, duração, apoios, o calendário dos quatro relógios e o
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
import { NUMEROS_EPILOGO, PONTOS_EPILOGO } from './atos/epilogo';
import prologo from '../../roteiros/solar/prologo.json';
import casa from '../../roteiros/solar/casa.json';
import jupiter from '../../roteiros/solar/jupiter.json';
import saturno from '../../roteiros/solar/saturno.json';
import afastamento from '../../roteiros/solar/afastamento.json';
import epilogo from '../../roteiros/solar/epilogo.json';

export { raioPc };
export { RAIO_DOS_ANEIS, RAIO_DO_CRUZAMENTO } from './atos/saturno';

/** os pontos nomeados dos seis roteiros, em pc */
const PONTOS: Readonly<Record<string, THREE.Vector3>> = {
  ...PONTOS_DOS_CORPOS, ...PONTOS_PROLOGO, ...PONTOS_CASA, ...PONTOS_JUPITER,
  ...PONTOS_SATURNO, ...PONTOS_AFASTAMENTO, ...PONTOS_EPILOGO,
};

/** os números nomeados: distâncias em pc; o rolamento em radianos; a lente do epílogo em graus */
const NUMEROS: Readonly<Record<string, number>> = {
  ...NUMEROS_PROLOGO, ...NUMEROS_CASA, ...NUMEROS_JUPITER, ...NUMEROS_SATURNO, ...NUMEROS_AFASTAMENTO,
  ...NUMEROS_EPILOGO,
};

export interface FilmeSolarMontado {
  shots: Shot[];
  starts: number[];
  duracao: number;
  apoios: ReturnType<typeof montarApoiosDoRoteiro>;
  pinos: typeof PINOS_SOLAR;
  /** o instante dos atos de fora (JD2), de que o filme é retrato */
  jd: number;
  /** as trocas de um relógio ao outro, na ordem do corte: onde começam e
   *  quanto duram, em segundos do corte, e de que relógio a que relógio
   *  (duração 0: um degrau, num corte) */
  trocas: { t: number; duracao: number; de: RelogioSolar; para: RelogioSolar }[];
  /** a data do céu (JD TDB) em cada segundo do corte */
  jdDoFilme(t: number): number;
  /** o "cima" da câmera: o polo norte da eclíptica na cena (equatorial J2000) */
  cima: THREE.Vector3;
  /** quantos planos cada roteiro (ato) deu, na ordem prólogo → epílogo */
  planosPorAto: number[];
}

/** o relógio de cada roteiro, na ordem prólogo → epílogo */
const RELOGIO_DO_ATO: readonly RelogioSolar[] = ['a', 'a', 'jupiter', 'fora', 'escuro', 'a'];
/** quanto dura cada rampa de um relógio ao outro, em segundos */
const DURACAO_DA_TROCA = 1.5;
/** a troca PARA cada relógio: onde começa, em segundos do início do
 *  roteiro em que ele volta a valer (negativo: antes do corte), e quanto
 *  dura — 0 é um degrau, e só cabe no começo de um roteiro que abre num
 *  corte — ver `trocas` */
const TROCA_PARA: Readonly<Partial<Record<RelogioSolar, { inicio: number; duracao: number }>>> = {
  jupiter: { inicio: -DURACAO_DA_TROCA, duracao: DURACAO_DA_TROCA },
  fora: { inicio: 1, duracao: DURACAO_DA_TROCA },
  escuro: { inicio: 7, duracao: DURACAO_DA_TROCA },
  a: { inicio: 0, duracao: 0 },
};

export function montarFilmeSolar(): FilmeSolarMontado {
  const atos = [prologo, casa, jupiter, saturno, afastamento, epilogo].map((dado) =>
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
   * segundos, fora do quadro dos corpos que mudam — ou, num corte, num
   * DEGRAU (duração 0) no instante dele.
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
   *
   * JD2 → JD_E (7 h para trás: Saturno gira 237°, Encélado anda 77° na
   * órbita) cai DENTRO da saída de Saturno, 7 s depois do começo dela:
   * a câmera já deu a volta por fora do planeta e olha Urano, com Saturno
   * e as luas atrás dela (atos/afastamento.test.ts confere, a cada 1/30 s
   * da rampa, que estão a mais de meio quadro mais 10° da visada).
   *
   * JD_E → JD_A (de volta ao céu do ato I, nove dias e meio adiante) é um
   * DEGRAU, no corte do retrato de família para a Terra: a câmera salta
   * 40 UA e nada do quadro atravessa o corte; do primeiro instante do
   * epílogo em diante o céu é o de JD_A, o da Terra no pino.
   */
  const inicioDoAto: number[] = [];
  for (let n = 0, i = 0; n < atos.length; i += atos[n].length, n++) inicioDoAto.push(starts[i]);
  const trocas: FilmeSolarMontado['trocas'] = [];
  for (let n = 1; n < atos.length; n++) {
    const de = RELOGIO_DO_ATO[n - 1];
    const para = RELOGIO_DO_ATO[n];
    if (de === para) continue;
    const troca = TROCA_PARA[para];
    if (troca === undefined) throw new Error(`filme solar: sem lugar para a troca de ${de} a ${para}`);
    trocas.push({ t: inicioDoAto[n] + troca.inicio, duracao: troca.duracao, de, para });
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
      // `<` e não `<=`: no começo de uma rampa o glide dá 0 e o céu é o de
      // antes do mesmo jeito; no degrau, o instante do corte já é o novo
      for (const troca of trocas) {
        if (t < troca.t) return jd;
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
