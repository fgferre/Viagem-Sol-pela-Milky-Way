// Serve: chão — o campo jovem do mapa de estrutura é misturado também onde o gás inferido zera
import { describe, expect, it } from 'vitest';
import { DUST_MAP_HALF_EXTENT, DUST_MAP_SIZE } from './dustMap';
import { bakeGalacticStructureMap } from './structureMap';

describe('bakeGalacticStructureMap — a segunda passada', () => {
  it('texel do disco sem gás inferido, mas com braço, fica com jovem > 0', () => {
    const n = DUST_MAP_SIZE * DUST_MAP_SIZE;
    // sem catálogo (modo procedural) e braço em todo o disco: o jovem
    // inferido é ≥ 0,1 em todo texel do disco
    const bake = bakeGalacticStructureMap(
      null, new Float32Array(n), new Float32Array(n), new Float64Array(n).fill(1)
    );
    const half = DUST_MAP_SIZE / 2;
    const texelPc = (2 * DUST_MAP_HALF_EXTENT) / DUST_MAP_SIZE;
    let semGas = 0;
    let jovemNulo = 0;
    for (let i = 0; i < n; i++) {
      const x = ((i % DUST_MAP_SIZE) + 0.5 - half) * texelPc;
      const y = (Math.floor(i / DUST_MAP_SIZE) + 0.5 - half) * texelPc;
      if (Math.hypot(x, y) > DUST_MAP_HALF_EXTENT) continue;
      if (bake.gasResponse[i] !== 0) continue;
      semGas++;
      if (bake.youngResponse[i] === 0) jovemNulo++;
    }
    // o caso existe (o gás inferido zera em boa parte do disco)...
    expect(semGas).toBeGreaterThan(1000);
    // ...e nenhum desses texels perde o jovem
    expect(jovemNulo).toBe(0);
  });
});
