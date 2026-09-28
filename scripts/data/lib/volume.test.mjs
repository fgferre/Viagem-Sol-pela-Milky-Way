// Serve: lei — o bloco de poeira guarda a densidade medida no referencial e na unidade do contrato
// ============================================================
// Contrato do bloco de poeira (E1, item 1 do PLAN.md). Sem FITS de 3 GB
// aqui: só a grade, a codificação float16 e a amostragem/integração/
// comparação em grades e fixtures sintéticas minúsculas — a comparação
// com a fixture REAL (de ponta a ponta) é julgada em
// `verify-assets.test.mjs`, que roda o gate inteiro.
// ============================================================
/* global Float16Array:readonly */
import { describe, expect, it } from 'vitest';
import {
  GRADE_20PC,
  PIRAMIDE_POEIRA,
  TOLERANCIA_NIVEL,
  adicionarNivel,
  amostrar,
  centroDe,
  coletarGrade,
  compararComReferencia,
  compararNivelComReferencia,
  criarCampo,
  deFloat16,
  dimsEmTijolos,
  gerarNivel,
  gradeDoNivel,
  indiceDe,
  indiceDoPonto,
  integrarColuna,
  interpolarClampado,
  paraFloat16,
  preservarVolumes,
  tijoloExiste,
  tijolosDoNivel,
  validarPiramide,
  valorNoCampo,
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

  it('carrega a pirâmide (dustPyramid) do antigo — `data:galaxy` não a apaga', () => {
    const piramide = { kind: 'volume-pyramid', levels: [] };
    const novo = { assets: {}, sources: [] };
    preservarVolumes(novo, { assets: {}, sources: [], dustPyramid: piramide });
    expect(novo.dustPyramid).toBe(piramide);
  });
});

// ============================================================
// A PIRÂMIDE (E3c do PLAN.md): coleta, geometria do contrato, aba,
// esparsidade por resíduo, campo e referência por nível — tudo com
// amostrador analítico e grades minúsculas (tijolo de 4 voxels); o
// caminho do FITS até o disco é julgado em build-dust-volumes.test.mjs.
// ============================================================
describe('coletarGrade — o operador das subamostras estratificadas', () => {
  const grade = { nx: 3, ny: 2, nz: 2, voxelPc: 4, origemPc: [-8, -8, -4] };

  it('com 2³ subamostras, amostra centro ± voxel/4 — e num campo linear dá o valor do centro', () => {
    const pontos = [];
    const um = { nx: 1, ny: 1, nz: 1, voxelPc: 4, origemPc: [0, 0, 0] };
    coletarGrade((x, y, z) => pontos.push([x, y, z]) && 0, um, 2);
    const esperados = [];
    for (const z of [1, 3]) for (const y of [1, 3]) for (const x of [1, 3]) esperados.push([x, y, z]);
    expect(pontos).toEqual(esperados);

    const linear = (x, y, z) => 1 + 2 * x - 3 * y + 0.5 * z;
    const { valores, naoFinitas } = coletarGrade(linear, grade, 2);
    expect(naoFinitas).toBe(0);
    for (let k = 0; k < grade.nz; k += 1) {
      for (let j = 0; j < grade.ny; j += 1) {
        for (let i = 0; i < grade.nx; i += 1) {
          expect(valores[indiceDe(grade, i, j, k)]).toBeCloseTo(linear(...centroDe(grade, i, j, k)), 5);
        }
      }
    }
  });

  it('subamostra não finita conta como 0 e é contada', () => {
    const um = { nx: 1, ny: 1, nz: 1, voxelPc: 4, origemPc: [0, 0, 0] };
    const { valores, naoFinitas } = coletarGrade((x, y, z) => (x === 1 && y === 1 && z === 1 ? NaN : 8), um, 2);
    expect(naoFinitas).toBe(1);
    expect(valores[0]).toBe(7);
  });
});

describe('interpolarClampado — o trilinear do n0 repete a borda fora da caixa', () => {
  it('dentro da caixa é o `amostrar`; fora, a borda (onde `amostrar` dá 0)', () => {
    const grade = { nx: 2, ny: 1, nz: 1, voxelPc: 10, origemPc: [0, 0, 0] };
    const volume = { grade, valores: [1, 3] };
    expect(interpolarClampado(volume, 10, 5, 5)).toBe(amostrar(volume, 10, 5, 5));
    expect(interpolarClampado(volume, 10, 5, 5)).toBe(2);
    expect(interpolarClampado(volume, 99, 5, 5)).toBe(3);
    expect(amostrar(volume, 99, 5, 5)).toBe(0);
  });
});

describe('PIRAMIDE_POEIRA — a geometria do contrato', () => {
  it('cada nível divide o voxel do pai em 2×2×2 a partir da quina do bloco de 20 pc', () => {
    expect(() => validarPiramide(PIRAMIDE_POEIRA, GRADE_20PC)).not.toThrow();
    const torta = {
      ...PIRAMIDE_POEIRA,
      niveis: [{ nivel: 1, voxelPc: 10, dims: [250, 250, 101], raioPc: null }],
    };
    expect(() => validarPiramide(torta, GRADE_20PC)).toThrow(/2×2×2/);
    expect(() => validarPiramide({ ...PIRAMIDE_POEIRA, origemPc: [-1240, -1250, -500] }, GRADE_20PC)).toThrow(
      /origem/
    );
  });

  it('tijolos por eixo e tijolos que existem (núcleo recortado à caixa toca r ≤ raio)', () => {
    const contagens = PIRAMIDE_POEIRA.niveis.map((nivel) => {
      const grade = gradeDoNivel(PIRAMIDE_POEIRA, nivel);
      return [dimsEmTijolos(grade, 32), tijolosDoNivel(grade, 32, nivel.raioPc).length];
    });
    expect(contagens).toEqual([
      [[8, 8, 4], 256],
      [[16, 16, 7], 796],
      [[32, 32, 13], 1073],
    ]);
    const n3 = gradeDoNivel(PIRAMIDE_POEIRA, PIRAMIDE_POEIRA.niveis[2]);
    expect(tijoloExiste(n3, 32, 450, 15, 15, 6)).toBe(true); // o do Sol
    expect(tijoloExiste(n3, 32, 450, 0, 0, 0)).toBe(false); // a quina, a ~1,8 kpc
    expect(tijoloExiste(n3, 32, 450, 32, 15, 6)).toBe(false); // fora da grade de tijolos
  });
});

// Pirâmide minúscula (tijolo de 4): n0 4×4×2 de 8 pc, constante 0,01;
// n1 8×8×4 de 4 pc na caixa inteira (2×2×1 tijolos de 16 pc); n2
// 16×16×8 de 2 pc com raio 10 (4×4×2 tijolos de 8 pc, as quinas longe
// do Sol não existem). O campo "medido" é 0,01 com quatro marcas:
// FORTE (+0,05) num cubo de 4 pc dentro do tijolo (1,1,0) do n1; FRACA
// (+5e-4, abaixo do limiar) na camada do tijolo (0,1,0) do n1 que encosta
// no (1,1,0); FINA (+0,04), uma lâmina de 2 pc que só o n2 resolve, no
// tijolo (3,3,1) do n2 — que não existe (fora do raio); e +0,02 fora da
// caixa, onde nenhum nível pode medir.
const MINI = {
  origemPc: [-16, -16, -8],
  tijolo: 4,
  limiarResiduo: 1e-3,
  subamostras: 2,
  niveis: [
    { nivel: 1, voxelPc: 4, dims: [8, 8, 4], raioPc: null },
    { nivel: 2, voxelPc: 2, dims: [16, 16, 8], raioPc: 10 },
  ],
};
const MINI_N0 = { nx: 4, ny: 4, nz: 2, voxelPc: 8, origemPc: [-16, -16, -8] };
const dentroDe = (v, lo, hi) => v >= lo && v < hi;
function campoMarcado(x, y, z) {
  if (!dentroDe(x, -16, 16) || !dentroDe(y, -16, 16) || !dentroDe(z, -8, 8)) return 0.03;
  if (dentroDe(x, 0, 4) && dentroDe(y, 4, 8) && dentroDe(z, 0, 4)) return 0.06;
  if (dentroDe(x, -4, 0) && dentroDe(y, 0, 16)) return 0.0105;
  if (dentroDe(x, 8, 10) && dentroDe(y, 8, 16) && dentroDe(z, 0, 8)) return 0.05;
  return 0.01;
}
const ESCALA = 1000;
const LADO = MINI.tijolo + 2;
const f16 = (v) => new Float16Array([v * ESCALA])[0] / ESCALA;

function gerarMini() {
  validarPiramide(MINI, MINI_N0);
  const campo = criarCampo({ grade: MINI_N0, valores: new Float64Array(4 * 4 * 2).fill(0.01) });
  const niveis = MINI.niveis.map((nivel) => {
    const gerado = gerarNivel({ amostrador: campoMarcado, campo, piramide: MINI, nivel, escala: ESCALA });
    adicionarNivel(campo, gerado.grade, MINI.tijolo, gerado.gravados);
    return gerado;
  });
  return { campo, niveis };
}
/** Valor gravado no texel (sx,sy,sz) do tijolo (34³ no contrato, 6³ aqui). */
const texel = (gravado, sx, sy, sz) => gravado.dados[sx + LADO * (sy + LADO * sz)];

describe('gerarNivel — esparsidade por resíduo', () => {
  it('grava só o tijolo cujo resíduo contra o pai passa do limiar; a marca fraca fica omitida', () => {
    const { niveis } = gerarMini();
    const [n1] = niveis;
    expect(n1.tijolosExistentes).toBe(4);
    expect(n1.gravados.map((g) => g.b)).toEqual([[1, 1, 0]]);
    expect(n1.gravados[0].residuo).toBeGreaterThanOrEqual(1e-3);
    // a marca fraca: resíduo de 5e-4 (em float16) — abaixo do limiar, omitida
    expect(n1.maiorResiduoOmitido).toBeCloseTo(5e-4, 6);
    expect(n1.gravados[0].bytes.byteLength).toBe(LADO ** 3 * 2);
    // o núcleo guarda a marca forte medida: voxel (4,5,2) do n1 = texel (1,2,3)
    expect(texel(n1.gravados[0], 1, 2, 3)).toBe(f16(0.06));
  });

  it('tijolo omitido mostra o pai no campo; o gravado, o próprio valor', () => {
    const { campo } = gerarMini();
    // dentro da marca fraca (tijolo (0,1,0), omitido): o pai, 0,01 — não 0,0105
    expect(valorNoCampo(campo, 1, -2, 2, 2)).toBeCloseTo(0.01, 12);
    // no centro da marca forte (tijolo (1,1,0), gravado)
    expect(valorNoCampo(campo, 1, 2, 6, 2)).toBe(f16(0.06));
  });

  it('nível com raio: tijolo que não toca r ≤ raio não existe e nunca é gravado', () => {
    const { niveis } = gerarMini();
    const n2 = niveis[1];
    const grade = gradeDoNivel(MINI, MINI.niveis[1]);
    expect(n2.tijolosExistentes).toBe(tijolosDoNivel(grade, 4, 10).length);
    expect(n2.tijolosExistentes).toBeLessThan(4 * 4 * 2);
    expect(n2.gravados.length).toBeGreaterThan(0);
    for (const { b } of n2.gravados) expect(tijoloExiste(grade, 4, 10, ...b)).toBe(true);
  });
});

describe('gerarNivel — a aba de 1 voxel', () => {
  it('dentro do nível copia o voxel MEDIDO do vizinho, mesmo omitido; fora da caixa, o pai', () => {
    const { niveis } = gerarMini();
    const tijolo = niveis[0].gravados[0]; // (1,1,0) do n1: voxels 4–7 em x e y, 0–3 em z
    for (let s = 1; s <= 4; s += 1) {
      // face −x (voxel 3, no tijolo (0,1,0), omitido): a marca fraca medida
      expect(texel(tijolo, 0, s, s)).toBe(f16(0.0105));
      // face +x (voxel 8, fora da caixa): o trilinear do pai (0,01), não o
      // +0,02 que o amostrador daria lá fora
      expect(texel(tijolo, LADO - 1, s, s)).toBe(f16(0.01));
      // faces ±z (voxels −1 e 4, fora da caixa em z): o pai
      expect(texel(tijolo, s, s, 0)).toBe(f16(0.01));
      expect(texel(tijolo, s, s, LADO - 1)).toBe(f16(0.01));
    }
  });

  it('aba num tijolo que não existe é o trilinear do pai, não o valor medido', () => {
    const { campo, niveis } = gerarMini();
    const grade = gradeDoNivel(MINI, MINI.niveis[1]);
    let conferidas = 0;
    let longeDoMedido = 0; // onde a regra importa: o medido (a lâmina FINA) difere do pai
    for (const gravado of niveis[1].gravados) {
      const [bi, bj, bk] = gravado.b;
      for (let sz = 0; sz < LADO; sz += 1) {
        for (let sy = 0; sy < LADO; sy += 1) {
          for (let sx = 0; sx < LADO; sx += 1) {
            const g = [4 * bi - 1 + sx, 4 * bj - 1 + sy, 4 * bk - 1 + sz];
            const naCaixa = g.every((v, eixo) => v >= 0 && v < [16, 16, 8][eixo]);
            const vizinho = g.map((v) => Math.floor(v / 4));
            if (!naCaixa || tijoloExiste(grade, 4, 10, ...vizinho)) continue;
            const centro = centroDe(grade, ...g);
            expect(texel(gravado, sx, sy, sz)).toBe(f16(valorNoCampo(campo, 1, ...centro)));
            const voxel = { nx: 1, ny: 1, nz: 1, voxelPc: 2, origemPc: centro.map((c) => c - 1) };
            const medido = coletarGrade(campoMarcado, voxel, 2).valores[0];
            if (Math.abs(texel(gravado, sx, sy, sz) - medido) > 0.01) longeDoMedido += 1;
            conferidas += 1;
          }
        }
      }
    }
    expect(conferidas).toBeGreaterThan(0);
    expect(longeDoMedido).toBeGreaterThan(0);
  });
});

describe('compararNivelComReferencia — a referência por nível', () => {
  const { campo } = gerarMini();
  const grade1 = gradeDoNivel(MINI, MINI.niveis[0]);
  /** Células no núcleo do tijolo gravado (1,1,0) do n1, com o valor do campo (ou `mudar(valor)`). */
  function celulasGravadas(mudar = (v) => v) {
    const celulas = [];
    for (let i = 4; i < 8; i += 1) {
      for (let j = 4; j < 8; j += 1) {
        const valor = valorNoCampo(campo, 1, ...centroDe(grade1, i, j, 1));
        celulas.push({ indice: [i, j, 1], media: mudar(valor), nanFracao: 0 });
      }
    }
    return celulas;
  }
  const referencia = (celulas, extra = {}) => ({
    nivel: 1,
    grade: { dims: [8, 8, 4], voxelPc: 4, origemPc: MINI.origemPc },
    raioPc: null,
    celulas,
    ...extra,
  });

  it('aprova quando as células batem com o campo', () => {
    const r = compararNivelComReferencia(campo, MINI, 1, referencia(celulasGravadas()));
    expect(r.aplicavel).toBe(true);
    expect(r.emTijoloGravado).toBe(16);
    expect(r.maximoRelativo).toBe(0);
    expect(r.aprovado).toBe(true);
  });

  it('é célula a célula na precisão do float16: meio ulp (0,05%) passa, 1% sistemático (unidade levemente errada) reprova', () => {
    expect(TOLERANCIA_NIVEL.celulaRelativa).toBe(1e-3);
    const meioUlp = compararNivelComReferencia(campo, MINI, 1, referencia(celulasGravadas((v) => v * (1 + 2 ** -11))));
    expect(meioUlp.aprovado).toBe(true);
    const umPorCento = compararNivelComReferencia(campo, MINI, 1, referencia(celulasGravadas((v) => v * 1.01)));
    expect(umPorCento.maximoRelativo).toBeGreaterThan(9);
    expect(umPorCento.aprovado).toBe(false);
  });

  it('reprova uma célula com erro grosseiro (fator 3)', () => {
    const celulas = celulasGravadas();
    celulas[0] = { ...celulas[0], media: celulas[0].media * 3 };
    const r = compararNivelComReferencia(campo, MINI, 1, referencia(celulas));
    expect(r.maximoRelativo).toBeGreaterThan(1);
    expect(r.aprovado).toBe(false);
  });

  it('não se aplica sem células bastantes em tijolo gravado, com outra grade ou sem o nível', () => {
    // 16 células no tijolo omitido (0,1,0): nenhuma prova o nível
    const omitidas = celulasGravadas().map((c) => ({ ...c, indice: [c.indice[0] - 4, c.indice[1], 1] }));
    expect(compararNivelComReferencia(campo, MINI, 1, referencia(omitidas)).aplicavel).toBe(false);
    const outraGrade = referencia(celulasGravadas(), { grade: { dims: [8, 8, 4], voxelPc: 5, origemPc: MINI.origemPc } });
    expect(compararNivelComReferencia(campo, MINI, 1, outraGrade).aplicavel).toBe(false);
    expect(compararNivelComReferencia(campo, MINI, 1, undefined).aplicavel).toBe(false);
  });

  it('não se aplica com célula fora do nível (tijolo que não existe)', () => {
    const grade2 = gradeDoNivel(MINI, MINI.niveis[1]);
    expect(tijoloExiste(grade2, 4, 10, 0, 0, 0)).toBe(false);
    const r = compararNivelComReferencia(campo, MINI, 2, {
      nivel: 2,
      grade: { dims: [16, 16, 8], voxelPc: 2, origemPc: MINI.origemPc },
      raioPc: 10,
      celulas: [{ indice: [0, 0, 0], media: 0.01, nanFracao: 0 }],
    });
    expect(r.aplicavel).toBe(false);
    expect(r.motivo).toMatch(/fora do nível/);
  });
});

describe('float16 do tijolo — ida e volta sem desalinhar', () => {
  it('deFloat16 aceita Buffer que começa em byte ímpar (o de gunzipSync pode)', () => {
    const f = paraFloat16([0.004, 0.25], 1000);
    const comDeslocamento = Buffer.alloc(f.byteLength + 1);
    Buffer.from(f.buffer).copy(comDeslocamento, 1);
    const impar = comDeslocamento.subarray(1);
    expect(impar.byteOffset % 2).toBe(1);
    expect(Array.from(deFloat16(impar, 1000))).toEqual(Array.from(deFloat16(f, 1000)));
  });
});
