// O QUE TODO FILME POR ATOS FAZ IGUAL (E0 do filme estelar, 14/11/2026):
// ler os roteiros de cada ato pelo MESMO leitor, enfileirar os planos no
// relógio do corte e saber onde cada ato começa. Saiu de `solar/montar.ts`,
// que fazia isso à mão; o estelar é o segundo a usar. A data do céu fica com
// cada filme — o solar troca de relógio entre atos, o estelar deixa o
// relógio ANDAR dentro de um plano (`relogioDosPlanos`).
import type * as THREE from 'three';
import { lerSequencia, type Shot } from '../lerSequencia';

export interface AtosMontados {
  shots: Shot[];
  /** o início de cada plano, em segundos do corte */
  starts: number[];
  duracao: number;
  /** o início de cada ato, em segundos do corte */
  inicioDoAto: number[];
  /** quantos planos cada ato deu, na ordem */
  planosPorAto: number[];
}

/** os roteiros dos atos, na ordem do filme, num corte só */
export function montarAtos(
  roteiros: readonly unknown[],
  pontos: Readonly<Record<string, THREE.Vector3>>,
  numeros: Readonly<Record<string, number>>,
  assuntoConhecido?: (nome: string) => boolean
): AtosMontados {
  const atos = roteiros.map((dado) => lerSequencia(dado, pontos, numeros, assuntoConhecido));
  const shots = atos.flat();
  const starts: number[] = [];
  let acc = 0;
  for (const s of shots) {
    starts.push(acc);
    acc += s.dur;
  }
  const inicioDoAto: number[] = [];
  for (let n = 0, i = 0; n < atos.length; i += atos[n].length, n++) inicioDoAto.push(starts[i]);
  return { shots, starts, duracao: acc, inicioDoAto, planosPorAto: atos.map((a) => a.length) };
}

/**
 * A DATA DO CÉU QUE ANDA DENTRO DO PLANO: parte de `jd0` e, em cada plano
 * que declara `relogio.diasPorSegundo`, avança essa taxa por segundo de
 * filme; nos outros fica parada. Por partes e contínua — o plano seguinte
 * começa no dia em que o anterior parou, sem degrau.
 */
export function relogioDosPlanos(
  shots: readonly Pick<Shot, 'dur' | 'diasPorSegundo'>[],
  starts: readonly number[],
  jd0: number
): (t: number) => number {
  return (t) => {
    let jd = jd0;
    for (let i = 0; i < shots.length && t > starts[i]; i++) {
      const taxa = shots[i].diasPorSegundo;
      if (taxa) jd += taxa * Math.min(t - starts[i], shots[i].dur);
    }
    return jd;
  };
}
