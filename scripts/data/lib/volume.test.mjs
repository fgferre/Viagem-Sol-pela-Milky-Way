// Serve: lei — o bloco de poeira guarda a densidade medida no referencial e na unidade do contrato
// ============================================================
// Contrato do bloco de poeira (E1, item 1 do PLAN.md). Sem FITS de 3 GB
// aqui: só a grade, a codificação float16 e a amostragem/integração/
// comparação em grades e fixtures sintéticas minúsculas — a comparação
// com a fixture REAL (de ponta a ponta) é julgada em
// `verify-assets.test.mjs`, que roda o gate inteiro.
// ============================================================
import { describe, expect, it } from 'vitest';
import {
  GRADE_20PC,
  amostrar,
  centroDe,
  compararComReferencia,
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

describe('compararComReferencia — grade da fixture precisa bater com a do volume', () => {
  // Mesma grade/campo constante usada nos testes de coluna abaixo.
  const grade = { nx: 20, ny: 20, nz: 20, voxelPc: 10, origemPc: [-100, -100, -100] };
  const volume = { grade, valores: new Float64Array(20 * 20 * 20).fill(0.02) };

  it('grade diferente (outras dims/voxelPc/origemPc) → aplicavel:false, com motivo, sem comparar nada', () => {
    const fixture = {
      cabecalho: { grade: { dims: [10, 10, 10], voxelPc: 5, origemPc: [0, 0, 0] } },
      voxeis: [{ indice: [0, 0, 0], media: 999, nanFracao: 0 }],
      colunas: [{ nome: 'x', l: 0, b: 0, rMin: 5, rMax: 40, celulas: [], tubo: { media: 1, min: 1, max: 1 } }],
    };
    const resultado = compararComReferencia(volume, fixture);
    expect(resultado.aplicavel).toBe(false);
    expect(resultado.motivo).toMatch(/grade/);
    expect(resultado.voxel).toBeUndefined();
    expect(resultado.coluna).toBeUndefined();
  });

  it('fixture sem cabecalho.grade → também aplicavel:false (fixture antiga ou de outra resolução)', () => {
    const resultado = compararComReferencia(volume, { voxeis: [], colunas: [] });
    expect(resultado.aplicavel).toBe(false);
    expect(typeof resultado.motivo).toBe('string');
    expect(resultado.motivo.length).toBeGreaterThan(0);
  });
});

describe('compararComReferencia — conteúdo mínimo da fixture (grade OK, mas fixture vazia/inválida)', () => {
  const grade = { nx: 20, ny: 20, nz: 20, voxelPc: 10, origemPc: [-100, -100, -100] };
  const volume = { grade, valores: new Float64Array(20 * 20 * 20).fill(0.02) };
  const gradeFixture = { dims: [grade.nx, grade.ny, grade.nz], voxelPc: grade.voxelPc, origemPc: grade.origemPc };
  const colunaValida = {
    nome: 'x',
    l: 0,
    b: 0,
    rMin: 5,
    rMax: 40,
    celulas: [{ indice: [0, 0, 0], media: 0.02 }],
    tubo: { media: 0.7, min: 0.6, max: 0.8 },
  };
  const voxelValido = { indice: [0, 0, 0], media: 0.02, nanFracao: 0 };

  it('voxeis vazio → aplicavel:false (lista vazia não aprova por vacuidade)', () => {
    const resultado = compararComReferencia(volume, {
      cabecalho: { grade: gradeFixture },
      voxeis: [],
      colunas: [colunaValida],
    });
    expect(resultado.aplicavel).toBe(false);
    expect(resultado.motivo).toMatch(/voxeis/);
  });

  it('colunas vazio → aplicavel:false (lista vazia não aprova por vacuidade)', () => {
    const resultado = compararComReferencia(volume, {
      cabecalho: { grade: gradeFixture },
      voxeis: [voxelValido],
      colunas: [],
    });
    expect(resultado.aplicavel).toBe(false);
    expect(resultado.motivo).toMatch(/colunas/);
  });

  it('índice de voxel fora da grade → aplicavel:false', () => {
    const resultado = compararComReferencia(volume, {
      cabecalho: { grade: gradeFixture },
      voxeis: [{ indice: [20, 0, 0], media: 0.02, nanFracao: 0 }],
      colunas: [colunaValida],
    });
    expect(resultado.aplicavel).toBe(false);
    expect(resultado.motivo).toMatch(/índice/);
  });

  it('índice de célula (referência de mesmo operador) fora da grade → aplicavel:false', () => {
    const resultado = compararComReferencia(volume, {
      cabecalho: { grade: gradeFixture },
      voxeis: [voxelValido],
      colunas: [{ ...colunaValida, celulas: [{ indice: [0, 0, -1], media: 0.02 }] }],
    });
    expect(resultado.aplicavel).toBe(false);
    expect(resultado.motivo).toMatch(/índice/);
  });
});

describe('compararComReferencia — coluna: referência de mesmo operador reprova, faixa do tubo só avisa', () => {
  // Mesma grade/campo constante do teste de integrarColuna: a coluna
  // l=0,b=0,rMin=5,rMax=40 vale sempre 0,02 × (40 − 5) = 0,7. `celulas`
  // cobre a grade toda (8000 voxels) — a fixture "conhece" exatamente o
  // que o bloco tem, então a referência de mesmo operador é exata.
  const grade = { nx: 20, ny: 20, nz: 20, voxelPc: 10, origemPc: [-100, -100, -100] };
  const volume = { grade, valores: new Float64Array(20 * 20 * 20).fill(0.02) };
  const gradeFixture = { dims: [grade.nx, grade.ny, grade.nz], voxelPc: grade.voxelPc, origemPc: grade.origemPc };

  function todasAsCelulas(media) {
    const celulas = [];
    for (let k = 0; k < grade.nz; k += 1) {
      for (let j = 0; j < grade.ny; j += 1) {
        for (let i = 0; i < grade.nx; i += 1) {
          celulas.push({ indice: [i, j, k], media });
        }
      }
    }
    return celulas;
  }

  it('aprova quando a coluna bate com a referência de mesmo operador (e reporta a razão do tubo)', () => {
    const fixture = {
      cabecalho: { grade: gradeFixture },
      // um voxel qualquer, dentro da tolerância — o que este teste cobre é
      // a COLUNA; o voxel só precisa existir (conteúdo mínimo da fixture).
      voxeis: [{ indice: [0, 0, 0], media: 0.02, nanFracao: 0 }],
      colunas: [
        {
          nome: 'dentro',
          l: 0,
          b: 0,
          rMin: 5,
          rMax: 40,
          celulas: todasAsCelulas(0.02),
          tubo: { media: 0.7, min: 0.6, max: 0.8 },
        },
      ],
    };
    const resultado = compararComReferencia(volume, fixture);
    expect(resultado.aplicavel).toBe(true);
    expect(resultado.coluna.aprovado).toBe(true);
    expect(resultado.coluna.maximoRelativo).toBeCloseTo(0, 9);
    expect(resultado.coluna.piorDesvio.nome).toBe('dentro');
    expect(resultado.coluna.piorDesvio.atual).toBeCloseTo(0.7, 9);
    expect(resultado.coluna.piorDesvio.referenciaMesmoOperador).toBeCloseTo(0.7, 9);
    expect(resultado.coluna.piorFaixa.nome).toBe('dentro');
    expect(resultado.coluna.piorFaixa.esperadoFaixa).toEqual([0.6, 0.8]);
    expect(resultado.coluna.piorFaixa.atual).toBeCloseTo(0.7, 9);
    expect(resultado.coluna.piorFaixa.razaoMedia).toBeCloseTo(1, 9);
  });

  it('reprova pela referência de mesmo operador MESMO com a coluna dentro da faixa do tubo (plausibilidade não reprova)', () => {
    const fixture = {
      cabecalho: { grade: gradeFixture },
      // idem: um voxel qualquer, só para satisfazer o conteúdo mínimo —
      // este teste cobre a COLUNA.
      voxeis: [{ indice: [0, 0, 0], media: 0.02, nanFracao: 0 }],
      colunas: [
        {
          nome: 'divergente',
          l: 0,
          b: 0,
          rMin: 5,
          rMax: 40,
          // referência diz 0,05 (média × 35 = 1,75); o bloco tem 0,02
          // (× 35 = 0,7) — bem fora dos 5% —, mas 0,7 ainda cai DENTRO
          // da faixa do tubo [0,6; 0,8].
          celulas: todasAsCelulas(0.05),
          tubo: { media: 0.7, min: 0.6, max: 0.8 },
        },
      ],
    };
    const resultado = compararComReferencia(volume, fixture);
    expect(resultado.aplicavel).toBe(true);
    expect(resultado.coluna.aprovado).toBe(false);
    expect(resultado.coluna.maximoRelativo).toBeGreaterThan(1);
    expect(resultado.coluna.piorDesvio.nome).toBe('divergente');
    expect(resultado.coluna.piorDesvio.atual).toBeCloseTo(0.7, 9);
    expect(resultado.coluna.piorDesvio.referenciaMesmoOperador).toBeCloseTo(1.75, 9);
    // a faixa do tubo continua só reportando: 0,7 está DENTRO de [0,6; 0,8].
    expect(resultado.coluna.piorFaixa.esperadoFaixa).toEqual([0.6, 0.8]);
    expect(resultado.coluna.piorFaixa.razaoMedia).toBeCloseTo(1, 9);
  });
});

describe('compararComReferencia — tolerância do voxel mais apertada (revisão de 28/09/2026)', () => {
  // grade/fixture minúsculas (1 voxel), só para isolar a fórmula da
  // tolerância: `0.05·|esperado| + 2e-6` (antes, `0.15·|esperado| + 3e-5`).
  const grade = { nx: 1, ny: 1, nz: 1, voxelPc: 10, origemPc: [0, 0, 0] };
  const gradeFixture = { dims: [1, 1, 1], voxelPc: 10, origemPc: [0, 0, 0] };
  const colunaValida = {
    nome: 'x',
    l: 0,
    b: 0,
    rMin: 5,
    rMax: 15,
    celulas: [{ indice: [0, 0, 0], media: 0.0011 }],
    tubo: { media: 0.011, min: 0.001, max: 0.02 },
  };

  it('reprova um desvio que a tolerância antiga deixaria passar', () => {
    // esperado 0,001, atual 0,0011: desvio 0,0001. Tolerância antiga
    // 0,15·0,001+3e-5=1,8e-4 (relativo ≈0,56, aprovaria); tolerância nova
    // 0,05·0,001+2e-6=5,2e-5 (relativo ≈1,92, reprova).
    const volume = { grade, valores: new Float64Array([0.0011]) };
    const fixture = {
      cabecalho: { grade: gradeFixture },
      voxeis: [{ indice: [0, 0, 0], media: 0.001, nanFracao: 0 }],
      colunas: [colunaValida],
    };
    const resultado = compararComReferencia(volume, fixture);
    expect(resultado.aplicavel).toBe(true);
    expect(resultado.voxel.maximoRelativo).toBeGreaterThan(1);
    expect(resultado.voxel.aprovado).toBe(false);
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
