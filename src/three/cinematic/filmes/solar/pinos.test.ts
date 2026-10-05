// Serve: dono — o filme solar encontra cada corpo onde ele está de verdade no instante do filme
// Os pinos são a efeméride: recomputa cada um pela MESMA cadeia do app
// (a de voltaParaCasa.test.ts), no relógio do seu ato, e cobra igualdade
// bit a bit — e cobra a razão dos dois relógios: a Terra vista da Lua
// meia-iluminada no céu do ato I (JD_A) e as luas que a câmera visita
// acesas no céu dos atos de fora (JD2).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { MetaEfemerides } from '../../../../lib/atlas/efemerides';
import { decodeEfemerides, MotorEfemerides } from '../../../../lib/atlas/efemerides';
import { eclipticaParaEquatorial, AU_PARA_PC } from '../../../../lib/atlas/frameGalactico';

// journey puxa world/galaxy, que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const { PINOS_SOLAR, JD_A_SOLAR_TDB, JD2_SOLAR_TDB, DELTA_JD2_HORAS, CORPOS_DE_JD_A } = await import('./pinos');
const { JD_DO_FILME_TDB } = await import('../../journey');

const DATA_DIR = fileURLToPath(new URL('../../../../../public/data/atlas/', import.meta.url));
const meta = JSON.parse(
  readFileSync(join(DATA_DIR, 'efemerides_meta.json'), 'utf8')
) as MetaEfemerides;
const binNode = readFileSync(join(DATA_DIR, 'efemerides.bin'));
const motor = new MotorEfemerides(
  decodeEfemerides(
    binNode.buffer.slice(binNode.byteOffset, binNode.byteOffset + binNode.byteLength),
    meta
  )
);

/** os corpos do prólogo e do ato I vivem em JD_A; o resto, em JD2 */
const jdDe = (id: string) => (CORPOS_DE_JD_A.has(id) ? JD_A_SOLAR_TDB : JD2_SOLAR_TDB);

const cadeiaPc = (id: string) => {
  const v = motor.posicaoHeliocentrica(id, jdDe(id));
  const eq = eclipticaParaEquatorial([v.x, v.y, v.z]);
  return [eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC];
};

/** o ângulo da lua ao ponto subsolar do planeta (0° = entre o planeta e o Sol, 180° = atrás dele) */
const anguloSubsolar = (lua: string, planeta: string) => {
  const p = PINOS_SOLAR.get(planeta)!;
  return THREE.MathUtils.radToDeg(
    PINOS_SOLAR.get(lua)!.clone().sub(p).angleTo(p.clone().negate())
  );
};

describe('os pinos do filme solar são a efeméride', () => {
  it('o ato I é o quarto minguante de 10/01; os atos de fora, 8 h antes da coda galáctica', () => {
    expect(JD_A_SOLAR_TDB).toBe(2461051.16026012);
    expect(DELTA_JD2_HORAS).toBe(-8);
    expect(JD2_SOLAR_TDB).toBe(JD_DO_FILME_TDB + DELTA_JD2_HORAS / 24);
  });

  it('traz todos os corpos que a câmera visita', () => {
    expect([...PINOS_SOLAR.keys()].sort()).toEqual([
      'callisto', 'ceres', 'earth', 'enceladus', 'europa', 'ganymede', 'hyperion',
      'io', 'jupiter', 'mars', 'mercury', 'mimas', 'moon', 'saturn', 'sun', 'titan', 'venus',
    ]);
  });

  it.each([...PINOS_SOLAR.keys()].filter((id) => id !== 'sun'))(
    '%s bate bit a bit com a cadeia no relógio do seu ato',
    (id) => {
      const p = PINOS_SOLAR.get(id)!;
      expect([p.x, p.y, p.z]).toEqual(cadeiaPc(id));
    }
  );

  it('o Sol é a origem da cena', () => {
    const s = PINOS_SOLAR.get('sun')!;
    expect([s.x, s.y, s.z]).toEqual([0, 0, 0]);
  });

  it('no céu do ato I a Terra vista da Lua está meia-iluminada: k = 0,50 ± 0,01 e elongação 90° ± 1°', () => {
    const terra = PINOS_SOLAR.get('earth')!;
    const lua = PINOS_SOLAR.get('moon')!;
    // a fase da Terra vista da Lua: o ângulo, na Terra, entre o Sol e a Lua
    const fase = terra.clone().negate().angleTo(lua.clone().sub(terra));
    const k = (1 + Math.cos(fase)) / 2;
    expect(Math.abs(k - 0.5)).toBeLessThanOrEqual(0.01);
    // a elongação da Lua vista da Terra é o mesmo ângulo: 90° é o quarto
    expect(Math.abs(THREE.MathUtils.radToDeg(fase) - 90)).toBeLessThanOrEqual(1);
  });

  it('no céu dos atos de fora, Io, Encélado, Mimas e Hipérion estão fora da sombra, do lado aceso', () => {
    const io = anguloSubsolar('io', 'jupiter'); // 109,6°
    expect(io).toBeGreaterThanOrEqual(60);
    expect(io).toBeLessThanOrEqual(110);
    const encelado = anguloSubsolar('enceladus', 'saturn'); // 91,9°
    expect(encelado).toBeGreaterThanOrEqual(30);
    expect(encelado).toBeLessThanOrEqual(110);
    expect(anguloSubsolar('mimas', 'saturn')).toBeLessThan(110); // 83,2°
    expect(anguloSubsolar('hyperion', 'saturn')).toBeLessThan(110); // 4,3°
  });
});
