// Serve: lei — o contrato do cache, a honestidade da nota de validade e a interpolação Hermite do MotorEfemerides
// ============================================================
// Oráculos do MotorEfemerides fora do juiz Horizons (que vive em
// regressao.test.ts):
//   (a) contrato do CACHE, re-expresso de
//       atlas-orbital/src/lib/orbital/engine.test.ts — mesmos números,
//       mesmas semânticas (miss/hit, bypass do Sol, hitRate sem
//       bypassed no denominador, reset×clear assimétricos, guarda
//       anti-vazamento de 2000 entradas). A API mudou (jdTdb direto em
//       vez de Date; sem providers), os julgamentos não.
//   (b) notaDeValidade nos DOIS braços do contrato de honestidade
//       (engine.test.ts "validity note honesty" do doador): dentro
//       cita acurácia medida, fora nunca; janela BCE sem "-3000-".
//   (c) decode/interp: nó exato, erro contra amostras conhecidas
//       (fixtures Horizons como verdade externa) e decode barulhento
//       para buffer truncado/formato errado.
// ============================================================

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MetaEfemerides } from './efemerides';
import { decodeEfemerides, MotorEfemerides } from './efemerides';
import { dateToTDB } from './time';

const DATA_DIR = fileURLToPath(
  new URL('../../../public/data/atlas/', import.meta.url)
);
const FIXTURES_DIR = fileURLToPath(
  new URL('../../test/fixtures/horizons/', import.meta.url)
);

const meta = JSON.parse(
  readFileSync(join(DATA_DIR, 'efemerides_meta.json'), 'utf8')
) as MetaEfemerides;
const binNode = readFileSync(join(DATA_DIR, 'efemerides.bin'));
const bufferBin = binNode.buffer.slice(
  binNode.byteOffset,
  binNode.byteOffset + binNode.byteLength
);

function criarMotor(): MotorEfemerides {
  return new MotorEfemerides(decodeEfemerides(bufferBin, meta));
}

function lerFixture(id: string, dataIso: string) {
  return JSON.parse(
    readFileSync(join(FIXTURES_DIR, `${id}-${dataIso}.json`), 'utf8')
  ) as {
    date: string;
    position: { x: number; y: number; z: number };
  };
}

// 2025-01-01T00:00:00Z em TDB — instante de referência dos testes de
// cache (qualquer instante dentro da janela serviria).
const JD = dateToTDB(new Date('2025-01-01T00:00:00Z'));

describe('MotorEfemerides cache stats (contrato do doador re-expresso)', () => {
  let motor: MotorEfemerides;

  beforeEach(() => {
    motor = criarMotor();
  });

  it('starts with zero counters and zero size', () => {
    const stats = motor.getCacheStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.bypassed).toBe(0);
    expect(stats.size).toBe(0);
    expect(stats.hitRate).toBe(0);
  });

  it('counts the first call as miss and the repeat as hit', () => {
    motor.posicao('earth', JD);
    expect(motor.getCacheStats().misses).toBe(1);
    expect(motor.getCacheStats().hits).toBe(0);

    motor.posicao('earth', JD);
    const stats = motor.getCacheStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.5);
    expect(stats.size).toBe(1);
  });

  it('bypasses the cache for the Sun special case', () => {
    motor.posicao('sun', JD);
    motor.posicao('sun', JD);
    const stats = motor.getCacheStats();
    expect(stats.bypassed).toBe(2);
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.size).toBe(0);
    // hitRate is over cacheable calls only, so bypassed calls must
    // not poison it — zero denominator → zero rate.
    expect(stats.hitRate).toBe(0);
  });

  it('hitRate excludes bypassed calls from the denominator', () => {
    motor.posicao('sun', JD);
    motor.posicao('sun', JD);
    motor.posicao('earth', JD);
    motor.posicao('earth', JD);
    const stats = motor.getCacheStats();
    expect(stats.bypassed).toBe(2);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    // 1 / (1 + 1) = 0.5; never 1 / (1 + 1 + 2) = 0.25.
    expect(stats.hitRate).toBeCloseTo(0.5);
  });

  it('resetCacheStats() clears counters but keeps cache entries', () => {
    motor.posicao('earth', JD);
    motor.posicao('earth', JD);
    expect(motor.getCacheStats().size).toBe(1);
    expect(motor.getCacheStats().hits).toBe(1);

    motor.resetCacheStats();
    const after = motor.getCacheStats();
    expect(after.hits).toBe(0);
    expect(after.misses).toBe(0);
    expect(after.bypassed).toBe(0);
    // The cache map itself is untouched — only the counters reset.
    expect(after.size).toBe(1);

    // And that surviving entry still serves hits on the next query.
    motor.posicao('earth', JD);
    expect(motor.getCacheStats().hits).toBe(1);
    expect(motor.getCacheStats().misses).toBe(0);
  });

  it('clearCache() empties the cache but preserves counters', () => {
    motor.posicao('earth', JD);
    motor.posicao('earth', JD);
    expect(motor.getCacheStats().size).toBe(1);

    motor.clearCache();
    const after = motor.getCacheStats();
    expect(after.size).toBe(0);
    // Counters are the observability path and belong to a different
    // concern than cache contents — clearCache must not zero them.
    expect(after.hits).toBe(1);
    expect(after.misses).toBe(1);
  });

  it('getCacheEntries() returns (key, age) pairs for each live entry', () => {
    motor.posicao('earth', JD);
    motor.posicao('mars', JD);
    const entries = motor.getCacheEntries();
    expect(entries.length).toBe(2);
    expect(entries.some((e) => e.key.startsWith('earth@'))).toBe(true);
    expect(entries.some((e) => e.key.startsWith('mars@'))).toBe(true);
    for (const e of entries) {
      expect(e.age).toBeGreaterThanOrEqual(0);
      expect(e.age).toBeLessThan(1000);
    }
  });

  it('separate bodies produce separate cache keys (hits per body)', () => {
    motor.posicao('earth', JD);
    motor.posicao('mars', JD);
    expect(motor.getCacheStats().misses).toBe(2);
    expect(motor.getCacheStats().hits).toBe(0);

    motor.posicao('earth', JD);
    motor.posicao('mars', JD);
    expect(motor.getCacheStats().hits).toBe(2);
    expect(motor.getCacheStats().misses).toBe(2);
  });
});

describe('MotorEfemerides cache bound (time-warp leak guard)', () => {
  it('evicts oldest entries so the cache cannot grow without bound', () => {
    const motor = criarMotor();
    // Each call advances simulated time one hour — well past the
    // ~0.864 s cache bucket, so every call is a distinct key: the exact
    // pattern that made the donor's Map grow unbounded under
    // fast-forward playback.
    for (let i = 0; i < 2500; i++) {
      motor.posicao('earth', JD + i / 24);
    }
    const { size } = motor.getCacheStats();
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThanOrEqual(2000);
  });
});

describe('notaDeValidade — contrato de honestidade nos dois braços', () => {
  const motor = criarMotor();

  it('quotes the measured accuracy only while inside the validity window', () => {
    const dentro = motor.notaDeValidade(
      'ceres',
      dateToTDB(new Date('2025-06-01T00:00:00Z'))
    );
    expect(dentro).toContain('0.01°');

    const fora = motor.notaDeValidade(
      'ceres',
      dateToTDB(new Date('1890-01-01T00:00:00Z'))
    );
    expect(fora).toContain('extrapolados');
    expect(fora).toContain('2025-01-01');
    expect(fora).not.toContain('0.01°');
  });

  it('satellite notes follow the same two arms (window 2020–2030)', () => {
    const dentro = motor.notaDeValidade('phobos', JD);
    expect(dentro).toContain('3.6°');
    expect(dentro).toContain('2020–2030');

    const fora = motor.notaDeValidade(
      'phobos',
      dateToTDB(new Date('2035-01-01T00:00:00Z'))
    );
    expect(fora).toContain('extrapolados');
    expect(fora).not.toContain('3.6°');
  });

  it('table bodies cite theory accuracy plus the MEASURED interpolation error', () => {
    const nota = motor.notaDeValidade('earth', JD);
    expect(nota).toContain('VSOP87D');
    expect(nota).toContain('1950–2050');
    expect(nota).toContain('Hermite');
    // O número vem do manifest, não de uma cópia manual.
    expect(nota).toContain(
      meta.corpos.earth!.erroMedidoAu.toExponential(2)
    );
  });

  it('outside the table window the note warns and never cites accuracy', () => {
    const fora = motor.notaDeValidade(
      'mercury',
      dateToTDB(new Date('1900-01-01T00:00:00Z'))
    );
    expect(fora).toContain('Fora de 1950–2050');
    expect(fora).not.toContain('arcsegundo');
  });

  it('does not collide a BCE start year with the range separator', () => {
    // The Moon's theory window starts at year -3000; a bare
    // `${start}-${end}` template renders the unreadable "-3000-3000".
    const nota = motor.notaDeValidade('moon', JD);
    expect(nota).toContain('3000 a.C.');
    expect(nota).not.toContain('-3000-');
  });

  it('catalog moons disclose the fabricated orientation and never quote accuracy', () => {
    const nota = motor.notaDeValidade('vanth', JD);
    expect(nota).toContain('FABRICADAS');
    expect(nota).toContain('nunca prevê');
  });
});

describe('decodeEfemerides / interpolação Hermite', () => {
  const motor = criarMotor();

  it('rejects an unknown format loudly', () => {
    expect(() =>
      decodeEfemerides(bufferBin, { ...meta, formato: 'ef9' })
    ).toThrow(/formato/);
  });

  it('rejects a truncated buffer instead of interpolating garbage', () => {
    const truncado = bufferBin.slice(0, 1024);
    expect(() => decodeEfemerides(truncado, meta)).toThrow(/não cabe/);
  });

  it('reproduces a table node EXACTLY at the node instant (Hermite s=0)', () => {
    const corpo = meta.corpos.earth!;
    const no0 = new Float32Array(bufferBin, corpo.offsetFloats * 4, 6);
    const p = motor.posicao('earth', meta.janela.jdInicio);
    expect(p.x).toBe(no0[0]!);
    expect(p.y).toBe(no0[1]!);
    expect(p.z).toBe(no0[2]!);
  });

  // Amostras conhecidas EXTERNAS (Horizons) entre nós da tabela: o erro
  // total (teoria + interpolação + conversão de tempo) tem de ficar
  // ordens abaixo dos limiares angulares do juiz de regressão.
  it.each([
    // corpo, época, teto do erro absoluto em AU
    ['earth', '2025-07-01', 5e-4],
    ['mercury', '2026-01-01', 5e-4],
    ['moon', '2025-07-01', 1e-5],
  ])('%s@%s matches the Horizons fixture within %f AU', (id, epoca, teto) => {
    const fixture = lerFixture(id as string, epoca as string);
    const p = motor.posicao(id as string, dateToTDB(new Date(fixture.date)));
    const erro = Math.hypot(
      p.x - fixture.position.x,
      p.y - fixture.position.y,
      p.z - fixture.position.z
    );
    expect(erro).toBeLessThan(teto as number);
  });

  it('throws with a clear message for a table body outside the window', () => {
    expect(() =>
      motor.posicao('earth', dateToTDB(new Date('1900-01-01T00:00:00Z')))
    ).toThrow(/fora da janela/);
  });

  it('rejects a parentId that is not the natural center', () => {
    expect(() => motor.posicao('moon', JD, 'sun')).toThrow(/centrado em/);
  });
});

// Consertos da revisão de olhos frescos da Onda 2 — cada teste abaixo é a
// regressão de um achado verificado por reprodução (ata no PLANO-ATLAS).
describe('achados da revisão de olhos frescos', () => {
  // O achado importante: posicaoHeliocentrica('vanth') compunha até o pai
  // e morria em 'corpo desconhecido "orcus"'. A regressão é de FECHAMENTO,
  // não de um corpo: todo id do registro compõe até o Sol sem lançar.
  it('posicaoHeliocentrica resolve para TODO corpo do registro (fechamento)', async () => {
    const { REGISTRO_ORBITAL } = await import('./registroOrbital');
    const motor = criarMotor();
    for (const id of Object.keys(REGISTRO_ORBITAL)) {
      const p = motor.posicaoHeliocentrica(id, JD);
      expect(Number.isFinite(p.x + p.y + p.z), `${id} devolveu não-finito`).toBe(
        true
      );
    }
  });

  it('vanth e weywot compõem até o Sol na distância dos pais TNO (~39/44 UA)', () => {
    const motor = criarMotor();
    const vanth = motor.posicaoHeliocentrica('vanth', JD);
    const weywot = motor.posicaoHeliocentrica('weywot', JD);
    // Órbitas de catálogo com fase fabricada: só a ESCALA é testável
    // (r entre periélio e afélio do pai; a lua desloca < 1e-4 UA).
    const rV = Math.hypot(vanth.x, vanth.y, vanth.z);
    const rW = Math.hypot(weywot.x, weywot.y, weywot.z);
    expect(rV).toBeGreaterThan(39.4 * 0.78 - 0.001);
    expect(rV).toBeLessThan(39.4 * 1.22 + 0.001);
    expect(rW).toBeGreaterThan(43.7 * 0.962 - 0.001);
    expect(rW).toBeLessThan(43.7 * 1.038 + 0.001);
  });

  it('jdTdb não-finito lança nas duas entradas públicas, nunca NaN em silêncio', () => {
    const motor = criarMotor();
    for (const jd of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => motor.posicao('earth', jd)).toThrow(/não-finito/);
      expect(() => motor.posicaoHeliocentrica('moon', jd)).toThrow(/não-finito/);
      expect(() => motor.posicaoHeliocentrica('sun', jd)).toThrow(/não-finito/);
    }
  });

  it('decodeEfemerides recusa tabela com n < 2 (a Hermite exige dois nós)', () => {
    const corpoEarth = meta.corpos['earth'];
    const doente: MetaEfemerides = {
      ...meta,
      corpos: { earth: { ...corpoEarth, n: 1 } },
    };
    expect(() => decodeEfemerides(bufferBin, doente)).toThrow(/pelo menos 2 nós/);
  });

  it('posicao("sun", jd, parentId) valida o parentId antes do bypass', () => {
    const motor = criarMotor();
    expect(() => motor.posicao('sun', JD, 'earth')).toThrow(/centrado em/);
    // E o bypass legítimo continua sem tocar o cache:
    motor.posicao('sun', JD);
    expect(motor.getCacheStats().bypassed).toBe(1);
    expect(motor.getCacheStats().size).toBe(0);
  });
});
