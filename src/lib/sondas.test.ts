import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MetaEfemerides } from './atlas/efemerides';
import { decodeEfemerides, MotorEfemerides } from './atlas/efemerides';
import { AU_KM } from './atlas/elementosOrbitais';
import { SONDAS, estadoDaSonda, janelaDaSonda, nosDaSonda } from './sondas';

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
