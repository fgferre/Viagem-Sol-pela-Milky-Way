// ============================================================
// O FILME COMO OBJETO (E1 da viagem solar, 04/10/2026). O motor tocava
// UM filme, montado no nível do módulo de `journey.ts`, e o caminho do
// filme lia as constantes dele direto. Agora ele toca o filme que o
// registro abaixo devolve pelo id: os planos, os pedidos de carga, o
// calendário do céu, o salto do "Ir à galáxia", a dose do Sol e os
// pinos de corpo vêm todos do objeto. O galáctico é a primeira
// instância, com as MESMAS peças de antes — sai bit a bit igual.
// ============================================================
import type * as THREE from 'three';
import { doseDaDramaturgia } from '../director/doseDoSol';
import type { montarApoiosDoRoteiro } from './apoiosDoRoteiro';
import { APOIOS_DO_FILME, Journey, LUA_PC, REVEAL_T, TERRA_PC, jdDoFilme } from './journey';
import { montarFilmeSolar } from './filmes/solar/montar';

/** o que `montarApoiosDoRoteiro` devolve: os pedidos de carga e os marcos de QA */
export type ApoiosDoRoteiro = ReturnType<typeof montarApoiosDoRoteiro>;

export interface Filme {
  id: string;
  /** os planos e as legendas, no relógio do filme */
  journey: Journey;
  /** o que pré-carregar e a partir de quando (corpos, efemérides) */
  apoios: ApoiosDoRoteiro;
  /** a data do céu (JD TDB) em cada segundo do corte */
  jdDoFilme(t: number): number;
  /** onde o "Ir à galáxia" salta; `null` quando o filme não tem galáxia a revelar */
  revealT: number | null;
  /** a dose de ocupação do Sol no instante (1 = o Sol da data, inteiro) */
  doseDoSol(t: number): number;
  /** corpos desenhados num centro fixo durante o filme, pelo id da casa */
  pinos: ReadonlyMap<string, THREE.Vector3>;
  /** o "cima" da câmera enquanto ele toca (`cimaDoFilme`); ausente, o polo galáctico */
  cima?: THREE.Vector3;
}

/** o filme de sempre — do Sol ao centro da Via Láctea e de volta à Terra */
export const FILME_PADRAO = 'galactico';

function montarGalactico(): Filme {
  return {
    id: FILME_PADRAO,
    journey: new Journey(),
    apoios: APOIOS_DO_FILME,
    jdDoFilme,
    revealT: REVEAL_T,
    doseDoSol: doseDaDramaturgia,
    pinos: new Map([
      ['earth', TERRA_PC],
      ['moon', LUA_PC],
    ]),
  };
}

/** a viagem solar (item 210): dois relógios (a Terra às 16:00 UTC, os atos de fora
 *  horas antes, para Io e Encélado acesas), sem galáxia a revelar, Sol inteiro do
 *  primeiro segundo e o polo da eclíptica no alto */
function montarSolar(): Filme {
  const m = montarFilmeSolar();
  return {
    id: 'solar',
    journey: new Journey(m.shots, m.starts),
    apoios: m.apoios,
    jdDoFilme: m.jdDoFilme,
    revealT: null,
    doseDoSol: () => 1,
    pinos: m.pinos,
    cima: m.cima,
  };
}

/** O REGISTRO: id → quem monta. Cada filme só é montado quando pedido. */
export const FILMES: ReadonlyMap<string, () => Filme> = new Map([
  [FILME_PADRAO, montarGalactico],
  ['solar', montarSolar],
]);

const montados = new Map<string, Filme>();

/**
 * O filme pelo id. Ausente (ou vazio) é o galáctico; um id que o
 * registro não conhece avisa no console e TAMBÉM toca o galáctico — link
 * torto não deixa a tela sem filme. O mesmo id devolve o mesmo objeto.
 */
export function filmeDe(id?: string | null): Filme {
  const pedido = id || FILME_PADRAO;
  const chave = FILMES.has(pedido) ? pedido : FILME_PADRAO;
  if (chave !== pedido) console.warn('?filme= desconhecido, toca o galáctico:', pedido);
  let filme = montados.get(chave);
  if (!filme) {
    filme = (FILMES.get(chave) ?? montarGalactico)();
    montados.set(chave, filme);
  }
  return filme;
}
