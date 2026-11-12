import { describe, expect, it } from 'vitest';
import {
  SISTEMAS_PLANETARIOS,
  baseDaOrbita,
  comAnfitrias,
  exoplanetaPorId,
  posicaoDoExoplaneta,
  zonaHabitavel,
} from './exoplanetas';
import { estrelaVisitavelPorNome } from './atlas/estrelasVisitaveis';

describe('os primeiros exoplanetas', () => {
  it('toda anfitriã tem ficha física no motor de estrelas, e os ids não se repetem', () => {
    const ids = SISTEMAS_PLANETARIOS.flatMap((s) => s.planetas.map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SISTEMAS_PLANETARIOS) expect(estrelaVisitavelPorNome(s.estrela), s.estrela).not.toBeNull();
  });

  it('a zona habitável de TRAPPIST-1 (Kopparapu 2014) tem e, f e g dentro, e d fora', () => {
    const t1 = estrelaVisitavelPorNome('TRAPPIST-1')!;
    const hz = zonaHabitavel(t1.teffK.v, t1.luminosidadeLsol.v);
    // 2.566 K está abaixo da validade (2.600 K): presa na borda, e dito
    expect(hz.presa).toBe(true);
    expect(hz.dentroUA).toBeCloseTo(0.0246, 3);
    expect(hz.foraUA).toBeCloseTo(0.0498, 3);
    const a = (l: string) => exoplanetaPorId(`trappist-1${l}`)!.planeta.aUA;
    for (const l of ['e', 'f', 'g']) expect(a(l) > hz.dentroUA && a(l) < hz.foraUA, l).toBe(true);
    expect(a('d')).toBeLessThan(hz.dentroUA);
  });

  it('no instante do trânsito o planeta está entre a estrela e o Sol', () => {
    const { planeta } = exoplanetaPorId('trappist-1e')!;
    const [t1] = comAnfitrias([]);
    const pos = [t1.x, t1.y, t1.z];
    const base = baseDaOrbita(pos, planeta.iGraus!, 0);
    const r = posicaoDoExoplaneta(planeta, base, planeta.tc!);
    const d = Math.hypot(...pos);
    // o cosseno entre o planeta e a direção do Sol, vista da estrela
    const cos = -(r[0] * pos[0] + r[1] * pos[1] + r[2] * pos[2]) / (Math.hypot(...r) * d);
    expect(cos).toBeGreaterThan(0.999);
  });

  it('as anfitriãs fora do catálogo entram pela posição medida, sem duplicar quem já está', () => {
    const lista = comAnfitrias([]);
    expect(lista.map((s) => s.n)).toEqual(['TRAPPIST-1', 'Kepler-186', 'HD 189733']);
    expect(Math.hypot(lista[0].x, lista[0].y, lista[0].z)).toBeCloseTo(12.43, 2);
    expect(comAnfitrias(lista)).toHaveLength(3);
  });
});
