// Serve: dono — no filme a lente de cinema é a da cena; fora dele, a do visitante (decisão de 09/10)
import { describe, expect, it } from 'vitest';
import { MODOS_DA_LENTE } from '../core/engine';
import type { Phase } from '../fases';
import { lenteEfetiva } from './lenteDoFilme';

describe('a lente de cinema no ar', () => {
  it('o filme usa a lente da cena (ou nenhuma) e ignora o visitante; fora dele vale o visitante', () => {
    const foraDoFilme: Phase[] = ['loading', 'intro', 'end', 'free', 'atlas'];
    for (const visitante of MODOS_DA_LENTE) {
      expect(lenteEfetiva('journey', 'anamorfica', visitante)).toBe('anamorfica');
      expect(lenteEfetiva('journey', 'nenhuma', visitante)).toBe('nenhuma');
      expect(lenteEfetiva('journey', undefined, visitante)).toBe('nenhuma');
      for (const fase of foraDoFilme) {
        expect(lenteEfetiva(fase, 'redonda', visitante), fase).toBe(visitante);
        expect(lenteEfetiva(fase, undefined, visitante), fase).toBe(visitante);
      }
    }
  });
});
