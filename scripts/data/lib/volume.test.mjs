// ============================================================
// Contrato do bloco de poeira (E1, item 1 do PLAN.md). Sem FITS de 3 GB
// aqui: só a grade, a codificação float16 e a amostragem/integração em
// grades sintéticas minúsculas — a comparação com a fixture real
// (`compararComReferencia` de ponta a ponta) é julgada em
// `verify-assets.test.mjs`, que roda o gate inteiro.
// ============================================================
import { describe, expect, it } from 'vitest';
import {
  GRADE_20PC,
  amostrar,
  centroDe,
  deFloat16,
  indiceDe,
  indiceDoPonto,
  integrarColuna,
  paraFloat16,
  preservarVolumes,
} from './volume.mjs';

describe('indiceDe / centroDe / indiceDoPonto — ida e volta', () => {
  it('indiceDe segue ix + nx·(iy + ny·iz)', () => {
    expect(indiceDe(GRADE_20PC, 0, 0, 0)).toBe(0);
    expect(indiceDe(GRADE_20PC, 1, 0, 0)).toBe(1);
    expect(indiceDe(GRADE_20PC, 0, 1, 0)).toBe(GRADE_20PC.nx);
    expect(indiceDe(GRADE_20PC, 0, 0, 1)).toBe(GRADE_20PC.nx * GRADE_20PC.ny);
  });

  it('centroDe → indiceDoPonto recupera os mesmos (i,j,k) para vários voxels', () => {
    const casos = [
      [0, 0, 0],
      [124, 124, 49],
      [55, 63, 23],
      [10, 100, 5],
    ];
    for (const [i, j, k] of casos) {
      const [x, y, z] = centroDe(GRADE_20PC, i, j, k);
      expect(indiceDoPonto(GRADE_20PC, x, y, z)).toEqual([i, j, k]);
    }
  });
});

describe('paraFloat16 / deFloat16 — ida e volta', () => {
  it('recupera os valores originais dentro da precisão do float16', () => {
    const escala = 1000;
    const originais = [0, 1e-5, 0.007512990667097799, 0.5, 12.34];
    const codificado = paraFloat16(originais, escala);
    expect(codificado.length).toBe(originais.length);
    const buffer = Buffer.from(codificado.buffer, codificado.byteOffset, codificado.byteLength);
    expect(buffer.byteLength).toBe(originais.length * 2);
    const decodificado = deFloat16(buffer, escala);
    for (let i = 0; i < originais.length; i += 1) {
      expect(decodificado[i]).toBeCloseTo(originais[i], 2);
    }
  });
});

describe('amostrar — trilinear numa grade 3×3×3 sintética', () => {
  const grade = { nx: 3, ny: 3, nz: 3, voxelPc: 10, origemPc: [0, 0, 0] };
  // valores[ix + 3·(iy + 3·iz)]; centros em x,y,z = 5, 15, 25.
  const valores = new Float64Array(27);
  for (let iz = 0; iz < 3; iz += 1) {
    for (let iy = 0; iy < 3; iy += 1) {
      for (let ix = 0; ix < 3; ix += 1) {
        valores[indiceDe(grade, ix, iy, iz)] = 1 + ix + 10 * iy + 100 * iz;
      }
    }
  }
  const volume = { grade, valores };

  it('reproduz o valor exato no centro de cada voxel', () => {
    expect(amostrar(volume, 5, 5, 5)).toBeCloseTo(1, 9);
    expect(amostrar(volume, 25, 25, 25)).toBeCloseTo(1 + 2 + 20 + 200, 9);
    expect(amostrar(volume, 15, 5, 5)).toBeCloseTo(2, 9);
  });

  it('dá a média dos dois centros vizinhos no ponto exatamente entre eles', () => {
    expect(amostrar(volume, 10, 5, 5)).toBeCloseTo((1 + 2) / 2, 9);
    expect(amostrar(volume, 5, 5, 10)).toBeCloseTo((1 + 101) / 2, 9);
  });

  it('devolve 0 fora da caixa', () => {
    expect(amostrar(volume, -1, 5, 5)).toBe(0);
    expect(amostrar(volume, 5, 5, 31)).toBe(0);
  });
});

describe('integrarColuna — campo constante', () => {
  it('dá exatamente valor × (rMax − rMin), com a coluna toda dentro da caixa', () => {
    const grade = { nx: 20, ny: 20, nz: 20, voxelPc: 10, origemPc: [-100, -100, -100] };
    const constante = 0.02;
    const volume = { grade, valores: new Float64Array(20 * 20 * 20).fill(constante) };
    const integral = integrarColuna(volume, 0, 0, 5, 40, 5);
    expect(integral).toBeCloseTo(constante * (40 - 5), 6);
  });
});

describe('preservarVolumes — manifestos mínimos', () => {
  it('sem manifesto antigo, é a identidade (só garante assets/sources)', () => {
    const novo = {};
    const resultado = preservarVolumes(novo, null);
    expect(resultado).toBe(novo);
    expect(novo.assets).toEqual({});
    expect(novo.sources).toEqual([]);
  });

  it('copia os assets kind === "volume" do antigo, sem tocar nos novos Float32', () => {
    const novo = { assets: { estrelas: { kind: 'float32' } }, sources: [] };
    const antigo = {
      assets: {
        poeira: { kind: 'volume', file: 'x.bin' },
        estrelas: { kind: 'float32', file: 'velho.bin' },
      },
      sources: [],
    };
    preservarVolumes(novo, antigo);
    expect(novo.assets.poeira).toEqual({ kind: 'volume', file: 'x.bin' });
    expect(novo.assets.estrelas).toEqual({ kind: 'float32' });
  });

  it('copia sources do antigo que o novo não tem, sem duplicar as que já tem', () => {
    const novo = { assets: {}, sources: [{ id: 'A', role: 'novo' }] };
    const antigo = { assets: {}, sources: [{ id: 'A', role: 'velho' }, { id: 'B', role: 'poeira' }] };
    preservarVolumes(novo, antigo);
    expect(novo.sources).toEqual([{ id: 'A', role: 'novo' }, { id: 'B', role: 'poeira' }]);
  });
});
