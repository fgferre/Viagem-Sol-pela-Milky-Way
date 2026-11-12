// Serve: lei — a atividade magnética pela rotação e pela massa (Wright et al. 2011) dá Sol = 1 e ordena as estrelas visitáveis
import { describe, expect, it } from 'vitest';
import {
  ATIVIDADE_FORA_DA_CALIBRACAO,
  atividadeDe,
  atividadeMagnetica,
  estrelaVisitavelPorNome,
  tempoConvectivoDias,
} from './estrelasVisitaveis';

describe('atividade magnética (Rossby, Wright 2011)', () => {
  it('o Sol vale 1 exato, com τ ≈ 14,5 d', () => {
    const sol = atividadeMagnetica(5772, 1, 25.38);
    expect(sol.razao).toBe(1);
    expect(sol.nivel).toBe(1);
    expect(tempoConvectivoDias(1)).toBeCloseTo(14.45, 1);
  });

  it('Proxima: Ro ~0,7, mais ativa que o Sol, nível ~2×', () => {
    const p = atividadeDe(estrelaVisitavelPorNome('Proxima Centauri')!);
    expect(p.regime).toBe('nao saturado');
    expect(p.rossby!).toBeGreaterThan(0.6);
    expect(p.rossby!).toBeLessThan(0.85);
    expect(p.nivel).toBeGreaterThan(1.8);
    expect(p.nivel).toBeLessThan(2.3);
  });

  it('sem envelope convectivo (Sirius, Vega) → 0; supergigante → fallback declarado', () => {
    expect(atividadeDe(estrelaVisitavelPorNome('Sirius')!).nivel).toBe(0);
    expect(atividadeDe(estrelaVisitavelPorNome('Vega')!).nivel).toBe(0);
    const b = atividadeDe(estrelaVisitavelPorNome('Betelgeuse')!);
    expect(b.regime).toBe('fora da calibracao');
    expect(b.razao).toBe(ATIVIDADE_FORA_DA_CALIBRACAO);
  });

  it('satura abaixo de Ro = 0,13', () => {
    const a = atividadeMagnetica(3200, 0.2, 0.5);
    const b = atividadeMagnetica(3200, 0.2, 1);
    expect(a.regime).toBe('saturado');
    expect(a.razao).toBe(b.razao);
  });
});
