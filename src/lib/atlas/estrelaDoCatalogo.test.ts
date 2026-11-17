// Serve: lei — a ficha física de qualquer estrela com nome sai de magnitude, distância, tipo e cor por uma regra só; a escrita à mão vence; a regra confere com as fichas escritas
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { NamedStar, StarsMeta } from '../../three/config';
import { estrelaComCorpo, estrelaDoCatalogo } from './estrelaDoCatalogo';
import { ESTRELAS_VISITAVEIS, estrelaVisitavelPorNome } from './estrelasVisitaveis';

const meta = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../public/data/stars_meta.json', import.meta.url)), 'utf8')
) as StarsMeta;

const estrela = (c: Partial<NamedStar>): NamedStar => ({ n: 'Teste', x: 0, y: 0, z: 0, m: 4.83, s: 'G2V', d: 10, ...c });

describe('a ficha de uma estrela do catálogo (regra única)', () => {
  it('um Sol a 10 pc dá ~1 R☉, ~1 M☉, ~5.772 K e ~1 L☉', () => {
    const e = estrelaDoCatalogo(estrela({ ci: 0.65 }))!;
    expect(e.teffK.v / 5772).toBeCloseTo(1, 1);
    expect(e.raioRsol.v).toBeCloseTo(1, 1);
    expect(e.massaMsol.v).toBeCloseTo(1, 1);
    expect(e.luminosidadeLsol.v).toBeCloseTo(1, 1);
    expect(e.massaMsol.p).toBe('derivado');
    expect(e.tipo.p).toBe('medido');
  });

  it('gigante tem massa típica artística; anã branca fica ponto de luz (sem lei de superfície)', () => {
    expect(estrelaDoCatalogo(estrela({ s: 'K0III', m: 0.5 }))!.massaMsol.p).toBe('artistico');
    expect(estrelaDoCatalogo(estrela({ s: 'DA2', m: 11.3 }))).toBeNull();
  });

  it('sem tipo, a Teff vem da cor e o tipo é derivado', () => {
    const e = estrelaDoCatalogo(estrela({ s: '', ci: 0.65 }))!;
    expect(e.tipo.p).toBe('derivado');
    expect(e.teffK.fonte).toMatch(/Ballesteros/);
  });

  it('volta null quando não dá para confiar', () => {
    expect(estrelaDoCatalogo(estrela({ d: 0 }))).toBeNull();
    expect(estrelaDoCatalogo(estrela({ s: '' }))).toBeNull(); // sem tipo nem cor
    expect(estrelaDoCatalogo(estrela({ s: 'WC8 + O9I', ci: -0.1 }))).toBeNull(); // Wolf-Rayet
    expect(estrelaDoCatalogo(estrela({ m: -30 }))).toBeNull(); // raio absurdo
  });

  it('rótulo que contradiz o brilho: vale o brilho e o tipo vira derivado; sem cor, null', () => {
    // um "A2 Ia" com a luminosidade de uma anã A a 10 pc
    const e = estrelaDoCatalogo(estrela({ s: 'A2Ia', m: 1, ci: 0.05 }))!;
    expect(e.tipo.p).toBe('derivado');
    expect(e.massaMsol.p).toBe('derivado');
    expect(estrelaDoCatalogo(estrela({ s: 'A2Ia', m: 1 }))).toBeNull();
  });

  it('a ficha escrita à mão vence; a gerada é guardada por nome', () => {
    expect(estrelaComCorpo('Sirius', meta.named)).toBe(estrelaVisitavelPorNome('Sirius'));
    const canopus = estrelaComCorpo('Canopus', meta.named);
    expect(canopus?.id).toBe('hip-30438');
    expect(estrelaComCorpo('Canopus', meta.named)).toBe(canopus);
    // a companheira já desenhada na órbita da escrita à mão não ganha segundo corpo
    expect(estrelaComCorpo('Sirius B', meta.named)).toBeNull();
  });
});

/**
 * A REGRA CONTRA AS FICHAS ESCRITAS. Tolerâncias pelo que a física entrega,
 * fixadas antes de rodar: Teff ±10 % (a tabela MK interpolada erra ~5 % por
 * subclasse), L ±0,15 dex (BC ~0,1 mag + fotometria + o erro da Teff na BC),
 * R ±25 % (R ∝ √L/T²), massa ±25 % só onde é derivada (a MLR de Eker tem
 * ~0,1 dex de espalhamento em L). Massa artística não se cobra.
 */
const FORA: Record<string, readonly string[]> = {
  // L −0,23 dex e R −30 %: o catálogo a chama de M5 (3.060 K, BC_V −3,11 na
  // tabela conferida de Pecaut & Mamajek); Proxima é M5.5 (Bessell 1991),
  // mais fria, e o L medido pede BC ~−3,7. O erro é do rótulo, não da
  // coluna: ajustar a coluna para ela passar estragaria as outras anãs M
  'Proxima Centauri': ['luminosidadeLsol', 'raioRsol'],
  // o catálogo a traz como uma estrela só, "M1: comp" (o tipo e o brilho são
  // do PAR); a escrita à mão é a componente Aa, medida (Torres et al. 2015)
  Capella: ['teffK', 'raioRsol', 'luminosidadeLsol', 'massaMsol'],
};

describe('a regra confere com as fichas escritas à mão', () => {
  it('Teff, raio, luminosidade e massa derivada dentro das tolerâncias', () => {
    const named = new Map(meta.named.map((s) => [s.n, s]));
    let conferidas = 0;
    for (const a of ESTRELAS_VISITAVEIS) {
      const n = named.get(a.nomeNoCatalogo);
      if (!n) continue; // TRAPPIST-1, Kepler-186, HD 189733: fora dos `named`
      const g = estrelaDoCatalogo(n)!;
      const fora = FORA[a.nomeNoCatalogo] ?? [];
      const confere = (campo: string, ok: boolean) => {
        if (!fora.includes(campo)) expect(ok, `${a.nomeNoCatalogo} ${campo}`).toBe(true);
      };
      confere('teffK', Math.abs(g.teffK.v / a.teffK.v - 1) <= 0.1);
      confere('raioRsol', Math.abs(g.raioRsol.v / a.raioRsol.v - 1) <= 0.25);
      confere('luminosidadeLsol', Math.abs(Math.log10(g.luminosidadeLsol.v / a.luminosidadeLsol.v)) <= 0.15);
      if (g.massaMsol.p === 'derivado') confere('massaMsol', Math.abs(g.massaMsol.v / a.massaMsol.v - 1) <= 0.25);
      conferidas++;
    }
    expect(conferidas).toBe(12);
  });
});
