// A dose antecipada é por corpo; o gate de tamanho continua dono do resto.
import { LUAS_DO_SISTEMA } from '../atlasConfig';
import { APOIOS_DO_FILME } from '../cinematic/journey';
import type { Phase } from '../fases';

/**
 * No Atlas, só foco e pai de lua: os dois que o enquadramento declarou.
 * No filme, só os corpos e os momentos declarados pelo roteiro.
 * A medição que limitou a dose em 22/08 mora no NORTE, Ajustes.
 */
export function corpoPrecisaPreCarga(fase: Phase, t: number, foco: string | null, id: string): boolean {
  if (fase === 'journey') return APOIOS_DO_FILME.preAquecerCorpo(t, id);
  if (fase !== 'atlas' || !foco) return false;
  return id === foco || id === LUAS_DO_SISTEMA.find((l) => l.id === foco)?.pai;
}

/** Efemérides continuam idempotentes/abortáveis; isto só declara a intenção. */
export function efemeridesPrecisamPreCarga(fase: Phase, t: number): boolean {
  return fase === 'atlas' || (fase === 'journey' && APOIOS_DO_FILME.precisaEfemerides(t));
}
