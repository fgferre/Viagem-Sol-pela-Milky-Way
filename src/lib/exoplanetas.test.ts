import { describe, expect, it } from 'vitest';
import {
  SISTEMAS_PLANETARIOS,
  baseDaOrbita,
  climaDoExoplaneta,
  comAnfitrias,
  exoplanetaPorId,
  posicaoDoExoplaneta,
  sementeDoExoplaneta,
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

  const clima = (id: string) => {
    const { planeta, sistema } = exoplanetaPorId(id)!;
    const e = estrelaVisitavelPorNome(sistema.estrela)!;
    return climaDoExoplaneta(planeta, {
      teffK: e.teffK.v,
      raioRsol: e.raioRsol.v,
      massaMsol: e.massaMsol.v,
      luminosidadeLsol: e.luminosidadeLsol.v,
    });
  };

  it('a classe sai dos números: um planeta de cada classe', () => {
    expect(clima('55-cnc-e').classe).toBe('lava');
    expect(clima('trappist-1b').classe).toBe('rochosoQuente');
    expect(clima('proxima-b').classe).toBe('rochosoTemperado');
    // a 0,432 UA, Kepler-186 f fica logo além da borda de fora (0,401 UA
    // pela luminosidade da tabela) — a ficha já dizia "além da borda"
    expect(clima('kepler-186f').classe).toBe('gelado');
    expect(clima('trappist-1h').classe).toBe('gelado');
    expect(clima('55-cnc-c').classe).toBe('subnetuno');
    expect(clima('hd-189733b').classe).toBe('giganteQuente');
    expect(clima('51-peg-b').classe).toBe('giganteQuente');
    expect(clima('eps-eri-b').classe).toBe('giganteFrio');
    // a zona habitável decide os sete de TRAPPIST-1 como decide a ficha
    expect(['b', 'c', 'd', 'e', 'f', 'g', 'h'].map((l) => clima(`trappist-1${l}`).classe)).toEqual([
      'rochosoQuente', 'rochosoQuente', 'rochosoQuente',
      'rochosoTemperado', 'rochosoTemperado', 'rochosoTemperado', 'gelado',
    ]);
  });

  it('a temperatura calculada de a, Teff e R⋆ fecha com a do arquivo onde o trânsito a mediu', () => {
    // TRAPPIST-1 b: o arquivo (Agol 2021) diz 397,6 K, com albedo 0
    expect(clima('trappist-1b').teqK).toBeCloseTo(397.6, -1);
    expect(clima('55-cnc-e').subestelarK / clima('55-cnc-e').teqK).toBeCloseTo(Math.SQRT2, 6);
    // β Pic b brilha do calor da formação: a atmosfera é a do espectro
    expect(clima('bet-pic-b').teqK).toBeLessThan(300);
    expect(clima('bet-pic-b').atmosferaK).toBe(1612);
    expect(clima('bet-pic-b').classe).toBe('giganteQuente');
  });

  it('travados por maré: os perto das anãs vermelhas e os Júpiteres quentes; não os de órbita larga', () => {
    for (const id of ['proxima-b', 'trappist-1e', 'trappist-1h', '55-cnc-e', '51-peg-b', 'hd-189733b']) {
      expect(clima(id).travado, id).toBe(true);
    }
    for (const id of ['kepler-186f', 'eps-eri-b', 'bet-pic-b', 'tau-cet-f']) expect(clima(id).travado, id).toBe(false);
  });

  it('a densidade só existe com raio e massa verdadeira medidos', () => {
    expect(clima('55-cnc-e').densidade).toBeCloseTo(6.7, 1);
    expect(clima('proxima-b').densidade).toBeNull();
  });

  it('a semente é o id: o mesmo planeta, a mesma cara; planetas diferentes, caras diferentes', () => {
    expect(sementeDoExoplaneta('trappist-1e')).toEqual(sementeDoExoplaneta('trappist-1e'));
    expect(sementeDoExoplaneta('trappist-1e')).not.toEqual(sementeDoExoplaneta('trappist-1f'));
    for (const v of sementeDoExoplaneta('proxima-b')) expect(v >= 0 && v < 100).toBe(true);
  });
});
