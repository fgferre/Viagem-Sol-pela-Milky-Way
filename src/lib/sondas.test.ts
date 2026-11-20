import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MetaEfemerides } from './atlas/efemerides';
import { decodeEfemerides, MotorEfemerides } from './atlas/efemerides';
import { AU_KM } from './atlas/elementosOrbitais';
import { COMETAS, conjuntoVigente, estadoDoCometa } from './cometas';
import { SONDAS, estadoDaSonda, janelaDaSonda, nosDaSonda, propagarKepler } from './sondas';

const DATA_DIR = fileURLToPath(new URL('../../public/data/atlas/', import.meta.url));

/**
 * Instantes SORTEADOS fora da grade dos nós, pedidos ao Horizons à parte
 * (TLIST, eclíptica J2000, centro do Sol, 2026-11-12) — o interpolante
 * nunca os viu.
 */
const DO_HORIZONS: Record<string, [number, number, number, number][]> = {
  'voyager-1': [
    [2443655.318257, -0.9352786277080928, 3.147970765272004, 0.04957906524588782],
    [2444168.918082, -5.850722078106289, 2.607340558479271, 0.186753943530352],
  ],
  'voyager-2': [
    [2443776.918028, -2.004372913619101, 3.401412243691476, 0.1528011900775614],
    [2444483.509373, -7.317829612742439, 0.6910848830843538, 0.2690815551274456],
  ],
  'pioneer-10': [
    [2441445.56216, -0.8675533634953442, -1.060018962675164, -0.04608294688816655],
    [2442021.386991, 3.803175048267827, -3.33329821604202, -0.06926830242191774],
  ],
  'pioneer-11': [
    [2441859.991504, 0.1091754949424929, -1.496957966314008, -0.07836816049473416],
    [2442799.620099, 2.249993749295601, 2.862540628910566, 0.835631667946727],
  ],
  'new-horizons': [
    [2453819.123311, -1.443412658087492, -0.219763394991579, 0.02067122234348373],
    [2454135.424175, -2.098075932989285, -4.641949935008387, 0.06286881520428267],
  ],
};

describe('as sondas', () => {
  it('cada nó é reproduzido exatamente, e fora da tabela a sonda não existe', () => {
    for (const s of SONDAS) {
      const nos = nosDaSonda(s.id);
      const meio = nos[Math.floor(nos.length / 2)];
      const e = estadoDaSonda(s.id, meio[0])!;
      expect(Math.hypot(e[0] - meio[1], e[1] - meio[2], e[2] - meio[3])).toBeLessThan(1e-9);
      const [ini] = janelaDaSonda(s.id)!;
      expect(estadoDaSonda(s.id, ini - 1)).toBeNull();
    }
  });

  it('reproduz o Horizons em instantes que não são nós', () => {
    for (const [id, pontos] of Object.entries(DO_HORIZONS)) {
      for (const [jd, x, y, z] of pontos) {
        const e = estadoDaSonda(id, jd)!;
        expect(Math.hypot(e[0] - x, e[1] - y, e[2] - z)).toBeLessThan(2e-4);
      }
    }
  });

  it('a sonda passa no planeta, contra a efeméride dos corpos da casa', () => {
    const meta = JSON.parse(readFileSync(join(DATA_DIR, 'efemerides_meta.json'), 'utf8')) as MetaEfemerides;
    const bin = readFileSync(join(DATA_DIR, 'efemerides.bin'));
    const motor = new MotorEfemerides(
      decodeEfemerides(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), meta)
    );
    const maisPerto = (sonda: string, corpo: string, jd0: number) => {
      let min = Infinity;
      for (let k = -720; k <= 720; k++) {
        const jd = jd0 + k / 1440;
        const e = estadoDaSonda(sonda, jd)!;
        const p = motor.posicaoHeliocentrica(corpo, jd);
        min = Math.min(min, Math.hypot(e[0] - p.x, e[1] - p.y, e[2] - p.z) * AU_KM);
      }
      return min;
    };
    // Horizons, sonda → centro do planeta: 29.241 km (Netuno, 25/08/1989)
    // e 13.680 km (Plutão, 14/07/2015); medido aqui em 12/11/2026:
    // 29.084 km e 14.220 km — o resto é o erro dos planetas da casa
    const netuno = maisPerto('voyager-2', 'neptune', 2447763.66);
    const plutao = maisPerto('new-horizons', 'pluto', 2457217.99);
    expect(Math.abs(netuno - 29_241)).toBeLessThan(1_000);
    expect(Math.abs(plutao - 13_680)).toBeLessThan(1_000);
  });
});

const MU = 0.01720209895 ** 2;

/** a cônica de um estado, pela equação de Kepler clássica (não pelas
 *  variáveis universais): excentricidade, periélio, h, energia, o tempo
 *  desde o periélio e o período (null na hipérbole) */
function conica(s: readonly number[]) {
  const [x, y, z, vx, vy, vz] = s;
  const r = Math.hypot(x, y, z);
  const rv = x * vx + y * vy + z * vz;
  const h = [y * vz - z * vy, z * vx - x * vz, x * vy - y * vx];
  const alfa = 2 / r - (vx * vx + vy * vy + vz * vz) / MU;
  const p = (h[0] ** 2 + h[1] ** 2 + h[2] ** 2) / MU;
  const e = Math.sqrt(Math.max(0, 1 - alfa * p));
  const n = Math.sqrt(MU * Math.abs(alfa) ** 3);
  let t: number;
  if (alfa > 0) {
    const E = Math.atan2(rv * Math.sqrt(alfa / MU), 1 - r * alfa);
    t = (E - e * Math.sin(E)) / n;
  } else {
    const H = Math.asinh((rv * Math.sqrt(-alfa / MU)) / e);
    t = (e * Math.sinh(H) - H) / n;
  }
  return { e, q: p / (1 + e), h, alfa, t, periodo: alfa > 0 ? (2 * Math.PI) / n : null };
}

/** quanto o tempo desde o periélio de `s` erra `esperado` (dias, módulo o período) */
function erroDoTempo(s: readonly number[], esperado: number): number {
  const c = conica(s);
  let d = c.t - esperado;
  if (c.periodo) d -= c.periodo * Math.round(d / c.periodo);
  return Math.abs(d) / Math.max(1, Math.abs(esperado));
}

describe('propagarKepler', () => {
  it('cometas e sondas, 1950–2050: tudo finito e na cônica certa, no instante certo', () => {
    // o pior erro relativo de todas as datas (NaN conta como Infinity)
    let pior = 0;
    const anota = (erro: number) => {
      pior = Math.max(pior, Number.isNaN(erro) ? Infinity : erro);
    };
    for (const c of COMETAS) {
      for (let jd = 2433282.5; jd <= 2469807.5; jd += 3) {
        const s = estadoDoCometa(c.id, jd)!;
        const k = conjuntoVigente(c.id, jd)!;
        const o = conica(s);
        anota(s.every(Number.isFinite) ? 0 : Infinity);
        anota(Math.abs(o.e - k[2]));
        anota(Math.abs(o.q - k[1]) / k[1]);
        anota(erroDoTempo(s, jd - k[6]));
      }
    }
    for (const sd of SONDAS) {
      const nos = nosDaSonda(sd.id);
      for (let i = 0; i + 1 < nos.length; i++) {
        const a = nos[i];
        const ca = conica(a.slice(1));
        for (let jd = a[0]; jd <= nos[i + 1][0]; jd += Math.min(5, (nos[i + 1][0] - a[0]) / 4)) {
          const s = propagarKepler(a, jd);
          const o = conica(s);
          anota(s.every(Number.isFinite) ? 0 : Infinity);
          anota(Math.abs(o.alfa - ca.alfa) / Math.max(1, Math.abs(ca.alfa)));
          anota(Math.hypot(o.h[0] - ca.h[0], o.h[1] - ca.h[1], o.h[2] - ca.h[2]) / Math.hypot(...ca.h));
          anota(erroDoTempo(s, ca.t + jd - a[0]));
        }
      }
    }
    expect(pior).toBeLessThan(1e-9);
  });

  it('onde o Newton de antes já acertava, a posição é a mesma (fixada antes da troca)', () => {
    const fixados: [string, number, number, number, number][] = [
      ['halley', 2446470.5, 0.34233379055109003, -0.4465925412636795, 0.16779698446562652],
      ['hale-bopp', 2450538.5, -0.11675717761436295, 0.5607676655731841, 0.7127600103611289],
      ['neowise', 2459034.5, 0.21368058875649495, 0.1395216828402726, 0.14763846560025817],
      ['3i-atlas', 2460978.5, -1.3179211504704338, -0.3087094401183493, 0.08997726626973664],
    ];
    for (const [id, jd, x, y, z] of fixados) {
      const s = estadoDoCometa(id, jd)!;
      expect(Math.hypot(s[0] - x, s[1] - y, s[2] - z)).toBeLessThan(1e-10);
    }
    const v1 = propagarKepler(nosDaSonda('voyager-1')[30], 2444485.5);
    expect(Math.hypot(v1[0] + 8.878632674494334, v1[1] - 0.18747304046838104, v1[2] - 0.34789340674938507)).toBeLessThan(
      1e-10
    );
  });
});
