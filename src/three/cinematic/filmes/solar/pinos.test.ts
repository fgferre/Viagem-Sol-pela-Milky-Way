// Serve: dono — o filme solar encontra cada corpo onde ele está de verdade no instante do filme
// Os pinos são a efeméride: recomputa cada um pela MESMA cadeia do app
// (a de voltaParaCasa.test.ts), no relógio do seu ato, e cobra igualdade
// bit a bit — e cobra a razão dos três relógios: a Terra vista da Lua
// meia-iluminada no céu do ato I (JD_A), a Grande Mancha acesa e de
// frente para Ceres com Io e Europa acesas ao lado no céu do ato II
// (JD_J), e as luas de Saturno que a câmera visita acesas no céu dos
// atos de fora (JD2).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { MetaEfemerides } from '../../../../lib/atlas/efemerides';
import { decodeEfemerides, MotorEfemerides } from '../../../../lib/atlas/efemerides';
import { eclipticaParaEquatorial, AU_PARA_PC } from '../../../../lib/atlas/frameGalactico';
import { AU_KM } from '../../../../lib/atlas/elementosOrbitais';
import { BODY_AXES, IAU_ORIENTATIONS } from '../../../../lib/atlas/iauOrientation';
import { baseCorpoEquatorial } from '../../../../lib/atlas/orientacao';

// journey puxa world/galaxy, que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const {
  PINOS_SOLAR, JD_A_SOLAR_TDB, JD_J_SOLAR_TDB, DELTA_JDJ_MINUTOS, JD2_SOLAR_TDB, DELTA_JD2_HORAS,
  RELOGIOS_SOLAR, RELOGIO_DO_CORPO, GRM_NA_TEXTURA,
} = await import('./pinos');
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

/** o relógio do ato de cada corpo */
const jdDe = (id: string) => RELOGIOS_SOLAR[RELOGIO_DO_CORPO.get(id)!];

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

/** a lua fora do cilindro de sombra de Júpiter (sem penumbra) */
const foraDaSombraDeJupiter = (lua: string) => {
  const j = PINOS_SOLAR.get('jupiter')!;
  const rel = PINOS_SOLAR.get(lua)!.clone().sub(j);
  const rJupiter = (BODY_AXES.jupiter[0] / AU_KM) * AU_PARA_PC;
  return rel.angleTo(j) > Math.asin(Math.min(1, rJupiter / rel.length()));
};

/** a direção, do centro de Júpiter, da Grande Mancha em JD_J (a receita do emMarte de atos/casa.ts) */
const GRM_EM_JD_J = (() => {
  const base = baseCorpoEquatorial(IAU_ORIENTATIONS.jupiter, JD_J_SOLAR_TDB);
  const polo = new THREE.Vector3(...base.polo);
  const w = THREE.MathUtils.degToRad(base.wDeg);
  const meridiano = new THREE.Vector3(...base.nodoQ).multiplyScalar(Math.cos(w))
    .addScaledVector(new THREE.Vector3(...base.lesteDeQ), Math.sin(w));
  const leste = new THREE.Vector3().crossVectors(polo, meridiano);
  const lat = THREE.MathUtils.degToRad(GRM_NA_TEXTURA.lat);
  const lon = THREE.MathUtils.degToRad(GRM_NA_TEXTURA.lonLeste);
  return meridiano.multiplyScalar(Math.cos(lat) * Math.cos(lon))
    .addScaledVector(leste, Math.cos(lat) * Math.sin(lon))
    .addScaledVector(polo, Math.sin(lat));
})();
/** o ângulo, em Júpiter, entre a Grande Mancha e a direção de `v` */
const anguloAGrm = (v: THREE.Vector3) => THREE.MathUtils.radToDeg(GRM_EM_JD_J.angleTo(v));

describe('os pinos do filme solar são a efeméride', () => {
  it('o ato I é o quarto minguante de 10/01; o ato II, 13 h 52 min antes da coda galáctica; os atos de fora, 8 h antes', () => {
    expect(JD_A_SOLAR_TDB).toBe(2461051.16026012);
    expect(DELTA_JDJ_MINUTOS).toBe(-832);
    expect(JD_J_SOLAR_TDB).toBe(JD_DO_FILME_TDB + DELTA_JDJ_MINUTOS / 1440);
    expect(DELTA_JD2_HORAS).toBe(-8);
    expect(JD2_SOLAR_TDB).toBe(JD_DO_FILME_TDB + DELTA_JD2_HORAS / 24);
    expect(RELOGIOS_SOLAR).toEqual({ a: JD_A_SOLAR_TDB, jupiter: JD_J_SOLAR_TDB, fora: JD2_SOLAR_TDB });
  });

  it('todo corpo com pino, menos o Sol (a origem), tem relógio', () => {
    expect([...RELOGIO_DO_CORPO.keys()].sort())
      .toEqual([...PINOS_SOLAR.keys()].filter((id) => id !== 'sun').sort());
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

  it('no céu do ato II a Grande Mancha está acesa e de frente para Ceres, e Io e Europa acesas ao lado dela', () => {
    const jupiter = PINOS_SOLAR.get('jupiter')!;
    const lua = (id: string) => PINOS_SOLAR.get(id)!.clone().sub(jupiter);
    // a Mancha a até 45° do ponto subsolar, do lado de onde a câmera chega
    // (Ceres, no seu relógio): a câmera chega pela direção dela
    expect(anguloAGrm(jupiter.clone().negate())).toBeLessThanOrEqual(45); // 36,2°
    expect(anguloAGrm(PINOS_SOLAR.get('ceres')!.clone().sub(jupiter))).toBeLessThan(90); // 16,5°
    // Io acesa e ao lado do disco para quem chega: nem na frente nem atrás dele
    const io = anguloSubsolar('io', 'jupiter'); // 60,1°
    expect(io).toBeGreaterThanOrEqual(60);
    expect(io).toBeLessThanOrEqual(110);
    expect(foraDaSombraDeJupiter('io')).toBe(true);
    expect(anguloAGrm(lua('io'))).toBeGreaterThanOrEqual(30); // 36,2°
    expect(anguloAGrm(lua('io'))).toBeLessThanOrEqual(150);
    // Europa acesa e fora da linha da chegada
    expect(anguloSubsolar('europa', 'jupiter')).toBeLessThanOrEqual(110); // 3,3°
    expect(foraDaSombraDeJupiter('europa')).toBe(true);
    expect(anguloAGrm(lua('europa'))).toBeGreaterThanOrEqual(30); // 38,0°
  });

  it('no céu dos atos de fora, Encélado, Mimas e Hipérion estão fora da sombra, do lado aceso', () => {
    const encelado = anguloSubsolar('enceladus', 'saturn'); // 91,9°
    expect(encelado).toBeGreaterThanOrEqual(30);
    expect(encelado).toBeLessThanOrEqual(110);
    expect(anguloSubsolar('mimas', 'saturn')).toBeLessThan(110); // 83,2°
    expect(anguloSubsolar('hyperion', 'saturn')).toBeLessThan(110); // 4,3°
  });
});
