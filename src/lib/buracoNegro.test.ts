import { describe, expect, it } from 'vitest';
import { LUGARES_DO_FILME } from './lugaresDoFilme';
import {
  B_CRITICO,
  MASSA_SGR_A_MSOL,
  ORBITA_S2,
  PERIASTRO_S2_UA,
  RS_SGR_A_KM,
  RS_SGR_A_UA,
  distanciaDeS2,
  sombraEmMicroArcsec,
} from './buracoNegro';

describe('Sagittarius A✱ — os números', () => {
  it('RS ≈ 0,085 UA e a sombra de longe ≈ 54 µas (o anel da EHT: 51,8 ± 2,3)', () => {
    expect(RS_SGR_A_UA).toBeCloseTo(0.0849, 3);
    expect(sombraEmMicroArcsec()).toBeGreaterThan(51.8 - 2 * 2.3);
    expect(sombraEmMicroArcsec()).toBeLessThan(51.8 + 2 * 2.3);
  });

  it('S2: periastro ≈ 120 UA, e a distância anda entre ele e o apoastro', () => {
    expect(PERIASTRO_S2_UA).toBeGreaterThan(115);
    expect(PERIASTRO_S2_UA).toBeLessThan(125);
    expect(distanciaDeS2(2018.379)).toBeCloseTo(PERIASTRO_S2_UA, 0);
  });
});

describe('a ficha diz os números desta física', () => {
  it('massa, horizonte, sombra e S2 batem com as contas', () => {
    const fatos = LUGARES_DO_FILME.find((l) => l.id === 'sagittarius-a')!.fatos!;
    const de = (campo: string) => fatos.find((f) => f.campo === campo)!.pt;
    const br = (x: number, casas: number) => x.toFixed(casas).replace('.', ',');
    expect(de('massa')).toContain(br(MASSA_SGR_A_MSOL / 1e6, 2));
    expect(de('horizonte')).toContain(br(RS_SGR_A_UA, 3));
    expect(de('horizonte')).toContain(br(RS_SGR_A_KM / 1e6, 1));
    expect(de('sombra')).toContain(br(2 * B_CRITICO * RS_SGR_A_UA, 2));
    expect(de('sombra')).toContain(String(Math.round(sombraEmMicroArcsec())));
    expect(de('estrelaS2')).toContain(br(ORBITA_S2.periodoAnos, 2));
    expect(de('estrelaS2')).toContain(String(Math.round(PERIASTRO_S2_UA / 10) * 10));
  });
});
