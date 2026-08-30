// Serve: lei — a fase do ciclo solar sai das datas reais (mínimo 2019, máximo out/2024), e o relógio anda monotônico, contínuo e reversível
// A ÂNCORA DO CICLO SOLAR, cobrada contra as datas reais. Este é o
// oráculo que faz a promessa do item 5 ser verificável sem navegador:
// se alguém mexer na assimetria subida/descida, é aqui que o máximo do
// ciclo 25 sai de outubro de 2024.
import { describe, expect, it } from 'vitest';
import {
  CICLO_DA_ANCORA,
  DIAS_DO_ANO_JULIANO,
  PERIODO_DO_CICLO_ANOS,
  SUBIDA_DO_CICLO_ANOS,
  UNIDADES_POR_CICLO,
  faseDoCiclo,
  haleDoCiclo,
  tempoDoCiclo,
} from './cicloDeAtividade';

/** JD TDB de algumas datas âncora (00:00). */
const JD = {
  '2019-12': 2458818.5, // mínimo do ciclo 25 (SILSO)
  '2024-10': 2460584.5, // máximo do ciclo 25
  '2026-01': 2461041.5, // a época em que o filme vive
  '2030-05': 2462622.5, // rumo ao mínimo seguinte
  '2035-01': 2464328.5, // subida do ciclo 26
} as const;

describe('a fase do ciclo sai da data, e a data é a real', () => {
  it('o mínimo do ciclo 25 cai em dezembro de 2019', () => {
    const f = faseDoCiclo(JD['2019-12']);
    expect(f.fase01).toBeCloseTo(0, 6);
    expect(f.ciclo).toBe(25);
  });

  it('o máximo cai em outubro de 2024 — e é a ASSIMETRIA que o põe lá', () => {
    const f = faseDoCiclo(JD['2024-10']);
    // fase 0,5 é o pico do envelope do núcleo (sin(π·fase))
    expect(f.fase01).toBeCloseTo(0.5, 2);
    expect(f.ciclo).toBe(25);
    // a prova de que a assimetria é necessária: um ciclo SIMÉTRICO
    // (subida = metade do período) poria o máximo mais de meio ano depois
    const simetrico =
      (0.5 * (JD['2024-10'] - JD['2019-12'])) /
      DIAS_DO_ANO_JULIANO /
      (PERIODO_DO_CICLO_ANOS / 2);
    expect(Math.abs(simetrico - 0.5)).toBeGreaterThan(0.05);
  });

  it('2026 é um Sol ATIVO em declínio — nem mínimo, nem pico', () => {
    const f = faseDoCiclo(JD['2026-01']);
    expect(f.ciclo).toBe(25);
    expect(f.fase01).toBeGreaterThan(0.5);
    expect(f.fase01).toBeLessThan(0.7);
    // o envelope do núcleo (activity.js) nesta fase ainda vale ~1,1 do
    // valor de repouso: é isto que autoriza a frase "o Sol de 2026 É ativo"
    const amp = 0.1 + 1.06 * Math.pow(Math.sin(Math.PI * f.fase01), 1.15);
    expect(amp).toBeGreaterThan(1);
  });

  it('2030 é fundo de poço e 2035 é ciclo 26 subindo', () => {
    const min = faseDoCiclo(JD['2030-05']);
    expect(min.ciclo).toBe(25);
    expect(min.fase01).toBeGreaterThan(0.9);
    const amp = 0.1 + 1.06 * Math.pow(Math.sin(Math.PI * min.fase01), 1.15);
    expect(amp).toBeLessThan(0.35); // disco quase limpo

    const sobe = faseDoCiclo(JD['2035-01']);
    expect(sobe.ciclo).toBe(26);
    expect(sobe.fase01).toBeGreaterThan(0.3);
    expect(sobe.fase01).toBeLessThan(0.5);
  });

  it('Hale alterna por ciclo, e ciclos vizinhos discordam', () => {
    expect(haleDoCiclo(25)).toBe(-haleDoCiclo(26));
    expect(haleDoCiclo(26)).toBe(haleDoCiclo(28));
    expect(haleDoCiclo(-1)).toBe(haleDoCiclo(25)); // negativo não quebra
  });
});

describe('o relógio lento é monotônico, contínuo e reversível', () => {
  it('anda para frente com a data, sem degrau na virada de ciclo', () => {
    let anterior = -Infinity;
    for (let jd = JD['2019-12'] - 4000; jd < JD['2019-12'] + 8000; jd += 37) {
      const t = tempoDoCiclo(faseDoCiclo(jd));
      expect(t).toBeGreaterThan(anterior);
      anterior = t;
    }
    // a virada 25→26 é contínua: um dia antes e um dia depois distam
    // muito menos que uma unidade
    const viradaJd =
      JD['2019-12'] + PERIODO_DO_CICLO_ANOS * DIAS_DO_ANO_JULIANO;
    const antes = tempoDoCiclo(faseDoCiclo(viradaJd - 0.5));
    const depois = tempoDoCiclo(faseDoCiclo(viradaJd + 0.5));
    expect(faseDoCiclo(viradaJd - 0.5).ciclo).toBe(25);
    expect(faseDoCiclo(viradaJd + 0.5).ciclo).toBe(26);
    expect(depois - antes).toBeLessThan(1);
    expect(depois - antes).toBeGreaterThan(0);
  });

  it('a mesma data devolve o mesmo T — venha de onde vier', () => {
    // é ISTO que o item 5 comprou: não existe caminho, existe instante
    const alvo = JD['2026-01'];
    const direto = tempoDoCiclo(faseDoCiclo(alvo));
    let deFrente = 0;
    for (let i = 70; i >= 0; i--) deFrente = tempoDoCiclo(faseDoCiclo(alvo - i * 13));
    let deTras = 0;
    for (let i = 70; i >= 0; i--) deTras = tempoDoCiclo(faseDoCiclo(alvo + i * 13));
    expect(deFrente).toBe(direto);
    expect(deTras).toBe(direto);
  });

  it('a unidade herdada sobrevive: um ciclo são 1800 unidades', () => {
    const a = tempoDoCiclo({ fase01: 0, ciclo: CICLO_DA_ANCORA });
    const b = tempoDoCiclo({ fase01: 0, ciclo: CICLO_DA_ANCORA + 1 });
    expect(b - a).toBe(UNIDADES_POR_CICLO);
    // uma unidade vale ~2,24 dias — a régua que calibra os períodos de
    // vida das regiões (150–240) e dos grupos de manchas (90–160)
    const dias = (PERIODO_DO_CICLO_ANOS * DIAS_DO_ANO_JULIANO) / UNIDADES_POR_CICLO;
    expect(dias).toBeGreaterThan(2.2);
    expect(dias).toBeLessThan(2.3);
  });

  it('data envenenada não cega o quadro: cai no mínimo da âncora', () => {
    expect(faseDoCiclo(Number.NaN)).toEqual({ fase01: 0, ciclo: CICLO_DA_ANCORA });
    expect(faseDoCiclo(Number.POSITIVE_INFINITY).ciclo).toBe(CICLO_DA_ANCORA);
  });

  it('antes da âncora a lei continua definida (ciclos 24, 23…)', () => {
    const antes = faseDoCiclo(JD['2019-12'] - SUBIDA_DO_CICLO_ANOS * DIAS_DO_ANO_JULIANO);
    expect(antes.ciclo).toBe(24);
    expect(antes.fase01).toBeGreaterThan(0);
    expect(antes.fase01).toBeLessThan(1);
  });
});
