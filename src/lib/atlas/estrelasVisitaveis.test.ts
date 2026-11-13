// Serve: lei — a atividade magnética pela rotação e pela massa (Wright et al. 2011) dá Sol = 1 e ordena as estrelas visitáveis; a rotação, o dínamo, a órbita de Sirius B e o enquadramento
import { describe, expect, it } from 'vitest';
import {
  ATIVIDADE_FORA_DA_CALIBRACAO,
  ESTRELAS_VISITAVEIS,
  GRANULO_DO_SOL_NA_TELA_EM_RAIOS,
  atividadeDe,
  atividadeMagnetica,
  estrelaVisitavelPorNome,
  granuloNaTelaEmRaios,
  posicaoDaCompanheira,
  raioDaEstrelaPc,
  rotacaoDe,
  temDinamoSolar,
  tempoConvectivoDias,
} from './estrelasVisitaveis';
import { AU_PARA_PC } from './frameGalactico';
import { RAIO_SOL_PC } from '../../three/escala';

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

describe('a rotação de quem não tem período medido (lei única)', () => {
  it('anfitriã G/K/M sem medida gira pelo Rossby do Sol: atividade 1 exata', () => {
    for (const n of ['Helvetios', 'Copernicus', 'τ Cet', 'Ran', 'HD 189733', 'Kepler-186']) {
      const e = estrelaVisitavelPorNome(n)!;
      expect(rotacaoDe(e).p).toBe('derivado');
      expect(atividadeDe(e).nivel).toBe(1);
    }
    // τ Cet (0,78 M☉): ~36 d, perto dos 34 d medidos por Baliunas et al.
    expect(rotacaoDe(estrelaVisitavelPorNome('τ Cet')!).v).toBeCloseTo(36, 0);
  });
  it('TRAPPIST-1 (0,0898 M☉, 3,3 d) é calibrada pela borda e satura', () => {
    expect(tempoConvectivoDias(0.0898)).toBe(tempoConvectivoDias(0.09));
    expect(tempoConvectivoDias(0.05)).toBeNull();
    const t = atividadeDe(estrelaVisitavelPorNome('TRAPPIST-1')!);
    expect(t.regime).toBe('saturado');
    expect(t.nivel).toBeGreaterThan(5);
  });
  it('estrela A sem medida: o período do Sol, declarado artístico', () => {
    expect(rotacaoDe(estrelaVisitavelPorNome('Fomalhaut')!)).toMatchObject({ v: 25.38, p: 'artistico' });
  });
});

describe('o dínamo de tipo solar (envelope convectivo e a linha de Linsky & Haisch)', () => {
  it('anãs frias têm; estrelas A e a supergigante vermelha não', () => {
    const tem = (n: string) => temDinamoSolar(estrelaVisitavelPorNome(n)!);
    expect(tem('Proxima Centauri')).toBe(true);
    expect(tem('TRAPPIST-1')).toBe(true);
    expect(tem('Helvetios')).toBe(true);
    expect(tem('Sirius')).toBe(false);
    expect(tem('Fomalhaut')).toBe(false);
    expect(tem('Betelgeuse')).toBe(false);
  });
});

const sirius = estrelaVisitavelPorNome('Sirius')!;
// a posição de catálogo de Sirius (stars_meta.json), pc
const POS_SIRIUS: [number, number, number] = [-0.4944, 2.4768, -0.7584];

function noCeu(jdAno: number) {
  const d = Math.hypot(...POS_SIRIUS);
  const r = POS_SIRIUS.map((x) => x / d);
  const jd = 2451545 + (jdAno - 2000) * 365.25;
  const v = posicaoDaCompanheira(jd, sirius.companheira!.orbita, [r[0], r[1], r[2]], d);
  const z = v[0] * r[0] + v[1] * r[1] + v[2] * r[2];
  const ceu = v.map((x, i) => x - z * r[i]);
  const ln = Math.hypot(r[1], r[0]);
  const leste = [-r[1] / ln, r[0] / ln, 0];
  const norte = [r[1] * leste[2] - r[2] * leste[1], r[2] * leste[0] - r[0] * leste[2], r[0] * leste[1] - r[1] * leste[0]];
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return {
    sepSegArco: Math.hypot(...ceu) / d / AU_PARA_PC,
    paGraus: ((Math.atan2(dot(ceu, leste), dot(ceu, norte)) * 180) / Math.PI + 360) % 360,
  };
}

describe('Sirius B pela órbita de Bond et al. 2017', () => {
  it('no periastro de 1994,57 a separação é a mínima (~a(1−e) projetada)', () => {
    expect(noCeu(1994.5715).sepSegArco).toBeGreaterThan(2);
    expect(noCeu(1994.5715).sepSegArco).toBeLessThan(4);
  });
  it('em 2020 bate a efeméride publicada: ~11,2″ no ângulo de posição ~68°', () => {
    const { sepSegArco, paGraus } = noCeu(2020);
    expect(sepSegArco).toBeCloseTo(11.2, 0);
    expect(paGraus).toBeGreaterThan(63);
    expect(paGraus).toBeLessThan(73);
  });
});

describe('o enquadramento do corpo é o raio físico', () => {
  it('raio equatorial em pc, Betelgeuse ~4.950× Proxima', () => {
    for (const e of ESTRELAS_VISITAVEIS) expect(raioDaEstrelaPc(e)).toBe(e.raioRsol.v * RAIO_SOL_PC);
    const b = raioDaEstrelaPc(estrelaVisitavelPorNome('Betelgeuse')!);
    const p = raioDaEstrelaPc(estrelaVisitavelPorNome('Proxima Centauri')!);
    expect(b / p).toBeCloseTo(764 / 0.1542, 6);
  });
});

describe('a concessão cinematográfica dos grânulos é a do Sol, relativa pela lei', () => {
  it('Proxima ~0,67× e Sirius ~1,4× o grânulo que o Sol mostra; teto de 0,1 R', () => {
    const naTela = (n: string) =>
      granuloNaTelaEmRaios(estrelaVisitavelPorNome(n)!.superficie.granuloEmRaios.v) / GRANULO_DO_SOL_NA_TELA_EM_RAIOS;
    expect(naTela('Proxima Centauri')).toBeCloseTo(0.668, 2);
    expect(naTela('Sirius')).toBeCloseTo(1.416, 2);
    expect(granuloNaTelaEmRaios(estrelaVisitavelPorNome('Betelgeuse')!.superficie.granuloEmRaios.v)).toBe(0.1);
  });
});
