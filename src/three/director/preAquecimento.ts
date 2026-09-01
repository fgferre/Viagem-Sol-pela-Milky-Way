// A dose antecipada é por corpo; o gate de tamanho continua dono do resto.
import { LUAS_DO_SISTEMA } from '../atlasConfig';
import { APOIOS_DO_FILME } from '../cinematic/journey';
import type { Phase } from '../fases';

/**
 * No Atlas, só foco e pai de lua: os dois que o enquadramento declarou.
 * A medição que limitou a dose em 22/08 mora no NORTE, Ajustes.
 *
 * DESDE O ITEM 115 SÃO DUAS FUNÇÕES e não uma, porque quem lê já não é
 * só a carga: a descarga precisa saber QUEM segura os texels, e as duas
 * mãos têm garantias diferentes. Esta solta no clique seguinte do
 * visitante — é o caso que a carência de 15 s existe para amortecer.
 */
export function corpoNoFocoDoAtlas(fase: Phase, foco: string | null, id: string): boolean {
  if (fase !== 'atlas' || !foco) return false;
  return id === foco || id === LUAS_DO_SISTEMA.find((l) => l.id === foco)?.pai;
}

/**
 * No filme, só os corpos e os momentos declarados pelo roteiro — e o
 * pedido é MONOTÔNICO: `montarApoiosDoRoteiro` guarda o INÍCIO de cada
 * corpo e responde `t >= inicio`, então uma vez aceso ele fica aceso até
 * o filme acabar. É essa monotonia que garante que a descarga nunca
 * tire do roteiro um corpo que ele vai usar em seguida.
 */
export function corpoPedidoPeloRoteiro(fase: Phase, t: number, id: string): boolean {
  return fase === 'journey' && APOIOS_DO_FILME.preAquecerCorpo(t, id);
}

/** Efemérides continuam idempotentes/abortáveis; isto só declara a intenção. */
export function efemeridesPrecisamPreCarga(fase: Phase, t: number): boolean {
  return fase === 'atlas' || (fase === 'journey' && APOIOS_DO_FILME.precisaEfemerides(t));
}
