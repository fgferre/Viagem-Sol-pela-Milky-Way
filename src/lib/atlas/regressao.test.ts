// Serve: lei — o MotorEfemerides reproduz os fixtures NASA JPL Horizons dentro dos limiares do doador, corpo a corpo e época a época
// ============================================================
// ORÁCULO PORTADO de atlas-orbital/src/lib/orbital/regression.test.ts
// (+ o porte de heliocentric.test.ts ao final) — o juiz numérico da
// Onda 2: MotorEfemerides contra os fixtures NASA JPL Horizons em
// disco. Limiares VERBATIM do doador; corpos, épocas e overrides
// idem, com as adições da casa declaradas.
//
// ADAPTAÇÕES DECLARADAS:
//   1. Frame: o doador remapeava fixture→Y-up de cena
//      (fixturePositionToEngineFrame trocava eixos). A casa responde
//      NO frame do fixture (eclíptica J2000) — a comparação é direta,
//      sem remap nenhum.
//   2. Tempo: fixtures são instantes UT; o motor consome jd TDB. A
//      conversão é o conversor ÚNICO da casa (time.ts, regra M6) — o
//      mesmo caminho que o runtime real percorre.
//   3. Os testes de proveniência/labels do doador morrem (a API
//      getProvenance/model/isFallback não atravessou); a semântica de
//      honestidade sobrevive em notaDeValidade, julgada em
//      efemerides.test.ts.
//   4. Validity-Window Routing do doador virou só o oráculo numérico:
//      ceres@1890 continua julgado (degradação Kepler < 60% em
//      distância), mas sem flags de fallback — aqui asteroide É
//      posicaoKepler sempre (colapso declarado em efemerides.ts).
//   5. hygiea entra como corpo representativo (adição da Onda 2, 3
//      épocas de fixture, limiar da família asteroide).
//   6. Erro angular anômalo NÃO usa Kepler-coarse implícito: todo
//      corpo representativo tem limiar explícito na tabela.
// ============================================================

import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MetaEfemerides } from './efemerides';
import { decodeEfemerides, MotorEfemerides } from './efemerides';
import type { PosicaoEcliptica } from './kepler';
import { REGISTRO_ORBITAL } from './registroOrbital';
import { dateToTDB } from './time';

interface HorizonsFixture {
  bodyId: string;
  date: string;
  center: string;
  referenceFrame: string;
  source: string;
  position: { x: number; y: number; z: number; unit: string };
  velocity: { x: number; y: number; z: number; unit: string };
}

const FIXTURES_DIR = fileURLToPath(
  new URL('../../test/fixtures/horizons/', import.meta.url)
);
const DATA_DIR = fileURLToPath(
  new URL('../../../public/data/atlas/', import.meta.url)
);

const REPRESENTATIVE_BODIES = [
  // Original 12 (checked at all Multi-Epoch Dates below)
  'mercury',
  'earth',
  'moon',
  'mars',
  'io',
  'titan',
  'oberon',
  'neptune',
  'pluto',
  'ceres',
  'vesta',
  'triton',
  // Phase-A additions: 15 satellites + 1 asteroid
  'europa',
  'ganymede',
  'callisto',
  'mimas',
  'enceladus',
  'tethys',
  'dione',
  'rhea',
  'iapetus',
  'miranda',
  'ariel',
  'umbriel',
  'titania',
  'phobos',
  'deimos',
  'pallas',
  // W6 stage B: Charon gained Horizons fixtures when it became an analytical
  // satellite. Triton was already in the list above.
  'charon',
  // Casa (adaptação 5): hygiea saiu do Kepler de catálogo e entrou na
  // família AsteroidOsculating na Onda 2 — julga nas 3 épocas.
  'hygiea',
] as const;
const PREFERRED_BASELINE_DATE = '2025-01-01T00:00:00Z';

/**
 * Multi-epoch coverage is the full representative set. Keeping these two
 * constants as aliases is the cheapest invariant against a recurrence of
 * the 12-vs-28 drift that created the donor's Phase 3 tail.
 */
const MULTI_EPOCH_BODIES = REPRESENTATIVE_BODIES;

/**
 * Universal multi-epoch drift checks: the element-block reference epoch
 * (2025-01-01) plus a half-year and a full-year AFTER it. Every
 * representative body has a Horizons fixture at all three instants.
 */
const MULTI_EPOCH_DATES = [
  '2025-01-01T00:00:00Z',
  '2025-07-01T00:00:00Z',
  '2026-01-01T00:00:00Z',
] as const;

/**
 * Negative-side epochs (before the 2025-01-01 element epoch), generated
 * only for the 18 original analytical satellites — for those the ±1 yr
 * envelope is measured on BOTH sides. The two 2024 instants are also
 * OUT-OF-SAMPLE for the 14 `fix` satellites (rates fitted only against
 * 2025-07-01 / 2026-01-01; Phobos, Mimas, Tethys and Io use published
 * rates and were never fitted).
 */
const NEGATIVE_SIDE_DATES = [
  '2024-01-01T00:00:00Z',
  '2024-07-01T00:00:00Z',
] as const;

const NEGATIVE_SIDE_BODIES = new Set<string>([
  'phobos',
  'deimos',
  'io',
  'europa',
  'ganymede',
  'callisto',
  'mimas',
  'enceladus',
  'tethys',
  'dione',
  'rhea',
  'titan',
  'iapetus',
  'miranda',
  'ariel',
  'umbriel',
  'titania',
  'oberon',
]);

function epochsForBody(bodyId: string): readonly string[] {
  return NEGATIVE_SIDE_BODIES.has(bodyId)
    ? [...NEGATIVE_SIDE_DATES, ...MULTI_EPOCH_DATES]
    : MULTI_EPOCH_DATES;
}

/**
 * Per-family regression thresholds — VERBATIM do doador (Phase 4
 * targets). As tabelas Hermite substituem a teoria ao vivo, mas o erro
 * de interpolação medido (≤1e-4 AU) fica ordens abaixo destes limiares.
 */
const TOLERANCES: Record<
  string,
  { maxAngularErrorDeg: number; maxDistanceErrorRatio: number }
> = {
  // VSOP87D planets + Pluto-Meeus
  mercury: { maxAngularErrorDeg: 0.1, maxDistanceErrorRatio: 0.002 },
  venus: { maxAngularErrorDeg: 0.1, maxDistanceErrorRatio: 0.002 },
  earth: { maxAngularErrorDeg: 0.1, maxDistanceErrorRatio: 0.002 },
  mars: { maxAngularErrorDeg: 0.1, maxDistanceErrorRatio: 0.002 },
  jupiter: { maxAngularErrorDeg: 0.1, maxDistanceErrorRatio: 0.002 },
  saturn: { maxAngularErrorDeg: 0.1, maxDistanceErrorRatio: 0.002 },
  uranus: { maxAngularErrorDeg: 0.1, maxDistanceErrorRatio: 0.002 },
  neptune: { maxAngularErrorDeg: 0.1, maxDistanceErrorRatio: 0.002 },
  pluto: { maxAngularErrorDeg: 0.2, maxDistanceErrorRatio: 0.005 },
  // ELP/MPP02-trunc Moon
  moon: { maxAngularErrorDeg: 0.2, maxDistanceErrorRatio: 0.005 },
  // All *Osculating2Body satellites and all AsteroidOsculating bodies are
  // fixture-derived from Horizons at 2025-01-01: sub-arcsecond at epoch,
  // held to the Phase-4 tight targets (< 0.5 deg, < 1% distance).
  // Multi-epoch drift is evaluated separately with wider bounds.
  io: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  europa: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  ganymede: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  callisto: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  mimas: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  enceladus: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  tethys: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  dione: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  rhea: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  titan: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  iapetus: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  miranda: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  ariel: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  umbriel: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  titania: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  oberon: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  phobos: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  deimos: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  ceres: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  pallas: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  vesta: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  // W6 stage B retired Triton's 150° / 60% envelope (catalog `i` was
  // equator-referred with fabricated Ω). With Horizons-derived ecliptic
  // elements it joins the analytical families; measured worst residual
  // over the fixtures on disk is 0.159° / 0.002%.
  triton: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  // Charon: tightest body in this table at 0.011° / 0.011% — nearly
  // circular, un-resonant, published Pluto-Charon lock rate.
  charon: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
  // Casa: hygiea julga no limiar da família asteroide.
  hygiea: { maxAngularErrorDeg: 0.5, maxDistanceErrorRatio: 0.01 },
};

const KEPLER_COARSE_TOLERANCES = {
  maxAngularErrorDeg: 150,
  maxDistanceErrorRatio: 0.6,
} as const;

/**
 * Per-body tolerance overrides for multi-epoch drift — VERBATIM do
 * doador. Satellites still drift when propagated months from the
 * fixture epoch: only the mean anomaly advances; orientation elements
 * stay frozen and no resonance / J2 / tidal terms are modelled.
 * Entries here *replace* (not stack with) TOLERANCES for the
 * multi-epoch block only.
 *
 * Worst |angular| / |distance| error across the four off-baseline
 * epochs {2024-01-01, 2024-07-01, 2025-07-01, 2026-01-01}, measured
 * 2026-07-23 in the donor through `orbitalEngine.calculatePosition`:
 *   mimas  5.213° / 3.84%   phobos    3.550° / 3.11%   europa  1.614° / 1.69%
 *   miranda 1.292° / 0.04%  tethys    1.239° / 0.15%   enceladus 0.874°/0.83%
 *   io     0.855° / 0.82%   oberon    0.227° / 0.17%   titania 0.213° / 0.09%
 *   deimos 0.154° / 0.01%   dione     0.129° / 0.07%   iapetus 0.122° / 0.16%
 *   ganymede 0.117°/0.08%   ariel     0.105° / 0.01%   rhea    0.056° / 0.02%
 *   umbriel 0.049° / 0.03%  callisto  0.024° / 0.03%   titan   0.024° / 0.02%
 *
 * Bounds sized at roughly 1.1–1.3× the observed residual (never below a
 * 0.3° / 0.2% floor). The real ±1 yr worst case is Mimas at 5.2°.
 */
const MULTI_EPOCH_OVERRIDES: Partial<
  Record<string, { maxAngularErrorDeg: number; maxDistanceErrorRatio: number }>
> = {
  // Martian
  phobos: { maxAngularErrorDeg: 3.9, maxDistanceErrorRatio: 0.04 },
  deimos: { maxAngularErrorDeg: 0.3, maxDistanceErrorRatio: 0.002 },

  // Galilean
  io: { maxAngularErrorDeg: 1.1, maxDistanceErrorRatio: 0.012 },
  europa: { maxAngularErrorDeg: 2.0, maxDistanceErrorRatio: 0.022 },
  ganymede: { maxAngularErrorDeg: 0.3, maxDistanceErrorRatio: 0.002 },
  callisto: { maxAngularErrorDeg: 0.3, maxDistanceErrorRatio: 0.002 },

  // Saturnian
  mimas: { maxAngularErrorDeg: 5.6, maxDistanceErrorRatio: 0.05 },
  enceladus: { maxAngularErrorDeg: 1.2, maxDistanceErrorRatio: 0.012 },
  tethys: { maxAngularErrorDeg: 1.6, maxDistanceErrorRatio: 0.004 },
  dione: { maxAngularErrorDeg: 0.3, maxDistanceErrorRatio: 0.002 },
  rhea: { maxAngularErrorDeg: 0.3, maxDistanceErrorRatio: 0.002 },
  titan: { maxAngularErrorDeg: 0.3, maxDistanceErrorRatio: 0.002 },
  iapetus: { maxAngularErrorDeg: 0.3, maxDistanceErrorRatio: 0.004 },

  // Uranian
  miranda: { maxAngularErrorDeg: 1.6, maxDistanceErrorRatio: 0.002 },
  ariel: { maxAngularErrorDeg: 0.3, maxDistanceErrorRatio: 0.002 },
  umbriel: { maxAngularErrorDeg: 0.3, maxDistanceErrorRatio: 0.002 },
  titania: { maxAngularErrorDeg: 0.4, maxDistanceErrorRatio: 0.002 },
  oberon: { maxAngularErrorDeg: 0.4, maxDistanceErrorRatio: 0.004 },

  // Pallas (asteroid) sits comfortably within the 0.5°/1% family default —
  // no override needed.
};

function loadAllFixtures(): HorizonsFixture[] {
  if (!existsSync(FIXTURES_DIR)) {
    return [];
  }

  return readdirSync(FIXTURES_DIR)
    .filter(
      (file) =>
        file.endsWith('.json') &&
        file !== 'index.json' &&
        // `subsolar-*` are ORIENTATION fixtures (`subSolarPoint.test.ts`) and
        // carry no state vector. They share `bodyId` and `date` with the
        // vectors fixtures and sort ahead of them, so an unfiltered read makes
        // every `find()` below return the wrong record — as `undefined`
        // positions rather than as a missing file. `rebuildIndexFromDisk` in
        // `scripts/generate-horizons-fixtures.js` excludes them for the same
        // reason; this reader was the half that never got the memo.
        !file.startsWith('subsolar-')
    )
    .map(
      (file) =>
        JSON.parse(
          readFileSync(join(FIXTURES_DIR, file), 'utf8')
        ) as HorizonsFixture
    );
}

function findRepresentativeFixture(
  fixtures: HorizonsFixture[],
  bodyId: (typeof REPRESENTATIVE_BODIES)[number]
): HorizonsFixture | null {
  return (
    fixtures.find(
      (fixture) =>
        fixture.bodyId === bodyId && fixture.date === PREFERRED_BASELINE_DATE
    ) ??
    fixtures.find((fixture) => fixture.bodyId === bodyId) ??
    null
  );
}

function findFixtureAt(
  fixtures: HorizonsFixture[],
  bodyId: string,
  date: string
): HorizonsFixture | null {
  return fixtures.find((f) => f.bodyId === bodyId && f.date === date) ?? null;
}

// Adaptação 1: identidade — fixture e motor falam o MESMO frame.
function fixturePosition(fixture: HorizonsFixture): PosicaoEcliptica {
  return { ...fixture.position };
}

function norma(p: PosicaoEcliptica): number {
  return Math.hypot(p.x, p.y, p.z);
}

/** Angular separation between two position vectors, in degrees. */
function angularSeparation(a: PosicaoEcliptica, b: PosicaoEcliptica): number {
  const dot = a.x * b.x + a.y * b.y + a.z * b.z;
  const cos = dot / (norma(a) * norma(b));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

function parentOf(bodyId: string): string {
  const registro = REGISTRO_ORBITAL[bodyId];
  if (!registro) throw new Error(`sem registro orbital para ${bodyId}`);
  return registro.centro;
}

function jdTdbDe(dateIso: string): number {
  return dateToTDB(new Date(dateIso));
}

function criarMotor(): MotorEfemerides {
  const meta = JSON.parse(
    readFileSync(join(DATA_DIR, 'efemerides_meta.json'), 'utf8')
  ) as MetaEfemerides;
  const bin = readFileSync(join(DATA_DIR, 'efemerides.bin'));
  const buffer = bin.buffer.slice(
    bin.byteOffset,
    bin.byteOffset + bin.byteLength
  );
  return new MotorEfemerides(decodeEfemerides(buffer, meta));
}

describe('Numerical Regression Tests vs Horizons', () => {
  const fixtures = loadAllFixtures();
  let motor: MotorEfemerides;

  beforeAll(() => {
    motor = criarMotor();
  });

  it('loads real Horizons fixtures from disk for every representative body', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(
      REPRESENTATIVE_BODIES.length
    );

    const missingBodies = REPRESENTATIVE_BODIES.filter(
      (bodyId) => !findRepresentativeFixture(fixtures, bodyId)
    );

    expect(missingBodies).toEqual([]);
  });

  it('uses authentic parent-centered ecliptic fixtures', () => {
    for (const bodyId of REPRESENTATIVE_BODIES) {
      const fixture = findRepresentativeFixture(fixtures, bodyId);
      expect(fixture).not.toBeNull();
      expect(fixture?.source).toContain('Horizons');
      expect(fixture?.referenceFrame).toBe('J2000_ECLIPTIC');
      expect(fixture?.position.unit).toBe('AU');
      expect(fixture?.velocity.unit).toBe('AU/day');
    }
  });

  describe('Position Consistency', () => {
    it('returns consistent positions for the same date', () => {
      const jd = jdTdbDe('2020-06-15T12:00:00Z');

      const result1 = motor.posicao('earth', jd);
      const result2 = motor.posicao('earth', jd);

      expect(result1.x).toBe(result2.x);
      expect(result1.y).toBe(result2.y);
      expect(result1.z).toBe(result2.z);
    });

    it('returns different positions for different dates', () => {
      const p1 = motor.posicao('mars', jdTdbDe('2020-01-01T00:00:00Z'));
      const p2 = motor.posicao('mars', jdTdbDe('2020-06-01T00:00:00Z'));

      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
      expect(dist).toBeGreaterThan(0.1);
    });
  });

  describe('Representative Bodies', () => {
    for (const bodyId of REPRESENTATIVE_BODIES) {
      it(`keeps ${bodyId} within its family tolerance vs. Horizons`, () => {
        const fixture = findRepresentativeFixture(fixtures, bodyId);
        expect(fixture).not.toBeNull();

        if (!fixture) {
          return;
        }

        const result = motor.posicao(
          bodyId,
          jdTdbDe(fixture.date),
          parentOf(bodyId)
        );
        const expected = fixturePosition(fixture);
        const angleError = angularSeparation(result, expected);
        const distanceError =
          Math.abs(norma(result) - norma(expected)) / norma(expected);

        const tol = TOLERANCES[bodyId] ?? KEPLER_COARSE_TOLERANCES;
        expect(angleError).toBeLessThan(tol.maxAngularErrorDeg);
        expect(distanceError).toBeLessThan(tol.maxDistanceErrorRatio);
      });
    }

    it('returns to approximately the same position after one Earth year', () => {
      const startPos = motor.posicao('earth', jdTdbDe('2020-01-01T00:00:00Z'));
      const endPos = motor.posicao('earth', jdTdbDe('2021-01-01T00:00:00Z'));

      const angleDiff = angularSeparation(startPos, endPos);
      expect(angleDiff).toBeLessThan(5.0);
    });
  });

  describe('Kepler degradation far from epoch (Priority C, adaptação 4)', () => {
    it('Ceres at 1890-01-01 has a valid Horizons fixture and falls within Kepler coarse distance', () => {
      const fixture = findFixtureAt(fixtures, 'ceres', '1890-01-01T00:00:00Z');
      expect(fixture).not.toBeNull();

      if (!fixture) return;

      const result = motor.posicao('ceres', jdTdbDe(fixture.date));
      const expected = fixturePosition(fixture);
      const distanceError =
        Math.abs(norma(result) - norma(expected)) / norma(expected);
      // Kepler at 1890 (epoch −135 yr) drifts significantly — verify it is
      // in the right solar-distance ballpark (within the coarse bound).
      expect(distanceError).toBeLessThan(
        KEPLER_COARSE_TOLERANCES.maxDistanceErrorRatio
      );
    });
  });

  describe('Multi-Epoch Drift (Priority B)', () => {
    it('has a fixture for every body × every epoch', () => {
      const missing: string[] = [];
      for (const bodyId of MULTI_EPOCH_BODIES) {
        for (const date of epochsForBody(bodyId)) {
          if (!findFixtureAt(fixtures, bodyId, date)) {
            missing.push(`${bodyId} @ ${date.split('T')[0]}`);
          }
        }
      }
      expect(missing).toEqual([]);
    });

    for (const bodyId of MULTI_EPOCH_BODIES) {
      for (const date of epochsForBody(bodyId)) {
        it(`keeps ${bodyId} within tolerance at ${date.split('T')[0]}`, () => {
          const fixture = findFixtureAt(fixtures, bodyId, date);
          expect(fixture).not.toBeNull();

          if (!fixture) {
            return;
          }

          const result = motor.posicao(
            bodyId,
            jdTdbDe(fixture.date),
            parentOf(bodyId)
          );
          const expected = fixturePosition(fixture);
          const angleError = angularSeparation(result, expected);
          const distanceError =
            Math.abs(norma(result) - norma(expected)) / norma(expected);

          // Multi-epoch overrides take precedence for bodies with known drift.
          const tol =
            MULTI_EPOCH_OVERRIDES[bodyId] ??
            TOLERANCES[bodyId] ??
            KEPLER_COARSE_TOLERANCES;
          expect(angleError).toBeLessThan(tol.maxAngularErrorDeg);
          expect(distanceError).toBeLessThan(tol.maxDistanceErrorRatio);
        });
      }
    }
  });
});

// ============================================================
// Porte de atlas-orbital/src/lib/orbital/heliocentric.test.ts — a
// composição heliocêntrica recursiva. As duas janelas APERTADAS
// (Europa−Júpiter e Lua−Terra) são as que pegam composer degenerado:
// as faixas largas por corpo aceitariam um composer que devolvesse só
// o pai (Júpiter sozinho cabe na faixa de Europa).
// ============================================================

// Fixed date for reproducible distances. Picked to sit inside the
// validity window of every model in the codebase.
const TEST_JD = dateToTDB(new Date('2026-01-01T00:00:00Z'));

describe('posicaoHeliocentrica', () => {
  const motor = criarMotor();

  it('the Sun sits at the heliocentric origin', () => {
    const p = motor.posicaoHeliocentrica('sun', TEST_JD);
    expect(norma(p)).toBe(0);
  });

  it('an unknown body id throws instead of masking to a fake origin', () => {
    // Silent-origin fallback would fabricate a physically plausible
    // value and hide the caller's mistake. Loud failure is the contract.
    // (Adaptação: a mensagem do doador era "unknown body id"; a da casa
    // é pt-BR "corpo desconhecido" — a semântica é a mesma.)
    expect(() =>
      motor.posicaoHeliocentrica('this-body-does-not-exist', TEST_JD)
    ).toThrow(/corpo desconhecido/);
  });

  // Ranges bracket the body's aphelion/perihelion so the asserts stay
  // valid regardless of where in the orbit TEST_JD lands.
  it.each([
    ['mercury', 0.3, 0.5],
    ['earth', 0.98, 1.02],
    ['mars', 1.38, 1.67],
    ['jupiter', 4.95, 5.46],
    ['saturn', 9.0, 10.1],
    ['neptune', 29.7, 30.4],
    ['pluto', 29.5, 49.5],
  ])('%s heliocentric distance ∈ [%f, %f] AU', (id, lo, hi) => {
    const d = norma(motor.posicaoHeliocentrica(id as string, TEST_JD));
    expect(d).toBeGreaterThan(lo as number);
    expect(d).toBeLessThan(hi as number);
  });

  // The regression these exist for: without parent composition, moons
  // collapse to their parent-centered a (fractions of an AU).
  it.each([
    ['moon', 0.97, 1.03], // Earth-bound; heliocentric ≈ 1 AU
    ['europa', 4.93, 5.48], // Jupiter-bound; heliocentric ≈ 5.2 AU
    ['titan', 8.95, 10.15], // Saturn-bound; heliocentric ≈ 9.5 AU
    ['triton', 29.6, 30.5], // Neptune-bound; heliocentric ≈ 30 AU
    ['charon', 29.4, 49.6], // Pluto-bound; heliocentric ≈ Pluto's
  ])(
    '%s heliocentric distance ∈ [%f, %f] AU (parent chain composed)',
    (id, lo, hi) => {
      const d = norma(motor.posicaoHeliocentrica(id as string, TEST_JD));
      expect(d).toBeGreaterThan(lo as number);
      expect(d).toBeLessThan(hi as number);
    }
  );

  it('a moon is NEVER classified at its parent-centered distance', () => {
    // Europa's orbit.a is ~0.00449 AU to Jupiter; the composer must
    // return ~5.2, not ~0.0045.
    const d = norma(motor.posicaoHeliocentrica('europa', TEST_JD));
    expect(d).toBeGreaterThan(1);
  });

  it('Europa composer output minus Jupiter heliocentric equals local jovicentric orbit', () => {
    const europa = motor.posicaoHeliocentrica('europa', TEST_JD);
    const jupiter = motor.posicaoHeliocentrica('jupiter', TEST_JD);
    const localOffset = Math.hypot(
      europa.x - jupiter.x,
      europa.y - jupiter.y,
      europa.z - jupiter.z
    );
    // Europa's jovicentric semi-major axis is 0.00449 AU; e ≈ 0.009.
    // Instantaneous distance stays within ~1 % of that.
    expect(localOffset).toBeGreaterThan(0.0044);
    expect(localOffset).toBeLessThan(0.0046);
  });

  it('Moon composer output minus Earth heliocentric equals local geocentric orbit', () => {
    const moon = motor.posicaoHeliocentrica('moon', TEST_JD);
    const earth = motor.posicaoHeliocentrica('earth', TEST_JD);
    const localOffset = Math.hypot(
      moon.x - earth.x,
      moon.y - earth.y,
      moon.z - earth.z
    );
    // Moon's geocentric semi-major axis is 0.00257 AU; e ≈ 0.055.
    // Instantaneous distance 0.00243–0.00271.
    expect(localOffset).toBeGreaterThan(0.0024);
    expect(localOffset).toBeLessThan(0.0028);
  });

  it('composer output differs from parent alone by the local orbit (non-degenerate)', () => {
    const europa = norma(motor.posicaoHeliocentrica('europa', TEST_JD));
    const jupiter = norma(motor.posicaoHeliocentrica('jupiter', TEST_JD));
    expect(Math.abs(europa - jupiter)).toBeGreaterThan(1e-5);
  });
});
