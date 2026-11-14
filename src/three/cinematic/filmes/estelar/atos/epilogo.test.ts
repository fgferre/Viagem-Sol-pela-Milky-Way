// Serve: dono — o filme estelar volta para casa: o Sol nasce ponto amarelo no centro e cresce, a câmera para diante dele, "Na metade do caminho" fecha e há silêncio antes da tela final
// O EPÍLOGO no relógio de Journey.at, a cada 1/30 s: parte de onde o Ato 5
// pousou sem salto, olha o Sol desde que vira para ele, nunca entra nele,
// para no fim com o disco inteiro no quadro e a câmera de pé, e a última
// legenda acaba 2–3 s antes do fim. O céu não anda depois de TRAPPIST-1.
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

// journey puxa world/galaxy, que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const { montarFilmeEstelar } = await import('../montar');
const { Journey } = await import('../../../journey');
const { R_SOL } = await import('../../solar/atos/geometria');
const { EPILOGO } = await import('./epilogo');

const filme = montarFilmeEstelar();
const journey = new Journey(filme.shots, filme.starts);
const graus = THREE.MathUtils.radToDeg;
const SOL = new THREE.Vector3();
const plano = (nome: string) => {
  const i = filme.shots.findIndex((s) => s.nome === nome);
  return { i, inicio: filme.starts[i], fim: filme.starts[i] + filme.shots[i].dur, dur: filme.shots[i].dur };
};
const instantes = (de: number, ate: number) =>
  Array.from({ length: Math.round((ate - de) * 30) + 1 }, (_, n) => Math.min(de + n / 30, ate - 1e-9));
const VOLTA = plano('volta');
const FIM = plano('naMetade');
/** quantos graus o Sol está da visada */
const foraDoCentro = (t: number) => {
  const a = journey.at(t);
  return graus(a.look.clone().sub(a.pos).angleTo(SOL.clone().sub(a.pos)));
};

describe('o epílogo — a volta ao Sol', () => {
  it('dois planos, 20 s, e são o fim do filme', () => {
    expect([VOLTA.i + 1, FIM.i + 1]).toEqual([FIM.i, filme.shots.length]);
    expect(FIM.fim - VOLTA.inicio).toBe(20);
    expect(FIM.fim).toBe(filme.duracao);
  });

  it('parte de onde o Ato 5 pousou sem salto (posição, mira, lente, rolagem), e cada junta continua', () => {
    for (const t of [VOLTA.inicio, FIM.inicio]) {
      const antes = journey.at(t - 1e-9);
      const depois = journey.at(t);
      expect(antes.pos.distanceTo(depois.pos) / antes.pos.length()).toBeLessThan(1e-9);
      expect(graus(antes.look.clone().sub(antes.pos).angleTo(depois.look.clone().sub(depois.pos)))).toBeLessThan(0.01);
      expect(Math.abs(antes.fov - depois.fov)).toBeLessThan(1e-6);
      expect(Math.abs(antes.roll - depois.roll)).toBeLessThan(1e-6);
    }
    expect(journey.at(VOLTA.inicio).pos.distanceTo(EPILOGO.partida)).toBeLessThan(1e-15);
  });

  it('a volta olha para casa: o Sol no centro desde que a mira vira para ele, e a rolagem chega a zero', () => {
    for (const t of instantes(VOLTA.inicio + 0.35 * VOLTA.dur, VOLTA.fim)) expect(foraDoCentro(t)).toBeLessThan(0.01);
    expect(journey.at(VOLTA.fim - 1e-9).roll).toBeCloseTo(0, 9);
  });

  it('a câmera nunca chega a menos de 5 raios do Sol, e no último plano recua devagar e para', () => {
    for (const t of instantes(VOLTA.inicio, FIM.fim)) {
      expect(journey.at(t).pos.length() / R_SOL).toBeGreaterThan(EPILOGO.PERTO_DO_SOL - 1e-6);
    }
    const d = (t: number) => journey.at(t).pos.length() / R_SOL;
    expect(d(FIM.inicio)).toBeCloseTo(EPILOGO.PERTO_DO_SOL, 6);
    expect(d(FIM.fim)).toBeCloseTo(EPILOGO.RECUO, 6);
    // para: no último trinta avos de segundo anda menos de um milésimo de raio
    expect(d(FIM.fim) - d(FIM.fim - 1 / 30)).toBeLessThan(1e-3);
    // e o disco inteiro cabe no quadro, de pé, no centro
    const a = journey.at(FIM.fim);
    expect(graus(Math.asin(R_SOL / a.pos.length()))).toBeLessThan(a.fov / 2);
    expect(a.roll).toBe(0);
    expect(foraDoCentro(FIM.fim)).toBeLessThan(1e-6);
  });

  it('"Na metade do caminho" é a última legenda e acaba 2–3 s antes do fim; o céu não anda no epílogo', () => {
    const c = filme.shots[FIM.i].captions!;
    expect(c.map((x) => x.text)).toEqual(['Na metade do caminho']);
    const fimDaLegenda = FIM.inicio + c[0].at * FIM.dur + c[0].dur!;
    expect(filme.duracao - fimDaLegenda).toBeGreaterThanOrEqual(2);
    expect(filme.duracao - fimDaLegenda).toBeLessThanOrEqual(3);
    expect(filme.shots[VOLTA.i].captions).toBeUndefined();
    expect(filme.jdDoFilme(VOLTA.inicio)).toBe(filme.jdDoFilme(filme.duracao));
  });
});
