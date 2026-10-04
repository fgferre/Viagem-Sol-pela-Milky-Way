// Serve: lei — o relevo em cubo ISIS (PLAN-TRITAO.md): o leitor devolve as amostras e os especiais, a junção respeita a prioridade sem degrau, os furos pequenos fecham e a janela cai no lugar certo da grade da casa
// ============================================================
// Em miniatura, com resposta conhecida de fora do código:
//  1. O LEITOR: um cubo sintético em ladrilhos (com ladrilho incompleto na
//     borda) volta valor a valor; o especial NULL vira NaN; Base e Multiplier
//     valem.
//  2. A JUNÇÃO: o de cima manda onde existe; longe da borda dele é ele puro, fora
//     dele é o de baixo, e na rampa fica entre os dois.
//  3. OS FUROS: o furo pequeno no meio de uma rampa linear fecha na rampa; o furo
//     grande e o que toca a borda da janela continuam NaN.
//  4. A JANELA NA GRADE: um bloco em −10..10°E, 0..20°N cai nas colunas e linhas
//     dessas coordenadas na casa (coluna 0 = 180°E), em metros; o resto é vazio.
// ============================================================
import { describe, expect, it } from 'vitest';
import { janelaNaGrade, juntaCubos, leCuboIsis, leRotuloIsis, tapaFurosPequenos } from './cubo-isis.mjs';

const NULL_ISIS = -3.4028226550889045e38;

/** Um cubo ISIS mínimo: rótulo PVL de 1024 bytes e as amostras em ladrilhos tx×ty, Real Lsb. */
function cuboSintetico(L, A, tx, ty, valorDe, { base = 0, multiplicador = 1, mapa = '' } = {}) {
  const rotulo = [
    'Object = IsisCube',
    '  Object = Core',
    '    StartByte   = 1025',
    '    Format      = Tile',
    `    TileSamples = ${tx}`,
    `    TileLines   = ${ty}`,
    '    Group = Dimensions',
    `      Samples = ${L}`,
    `      Lines   = ${A}`,
    '      Bands   = 1',
    '    End_Group',
    '    Group = Pixels',
    '      Type       = Real',
    '      ByteOrder  = Lsb',
    `      Base       = ${base}`,
    `      Multiplier = ${multiplicador}`,
    '    End_Group',
    '  End_Object',
    mapa,
    'End_Object',
    'End',
  ].join('\n');
  const nx = Math.ceil(L / tx);
  const ny = Math.ceil(A / ty);
  const bytes = Buffer.alloc(1024 + nx * ny * tx * ty * 4);
  bytes.write(rotulo, 0, 'latin1');
  for (let TY = 0; TY < ny; TY += 1) {
    for (let TX = 0; TX < nx; TX += 1) {
      for (let y = 0; y < ty; y += 1) {
        for (let x = 0; x < tx; x += 1) {
          const i = TX * tx + x;
          const j = TY * ty + y;
          const v = i < L && j < A ? valorDe(i, j) : 0;
          bytes.writeFloatLE(v, 1024 + ((TY * nx + TX) * tx * ty + y * tx + x) * 4);
        }
      }
    }
  }
  return bytes;
}

describe('o leitor de cubo ISIS', () => {
  it('devolve as amostras em ladrilhos, o NULL como NaN, com Base e Multiplier', () => {
    const [L, A] = [7, 5];
    const valorDe = (i, j) => (i === 3 && j === 2 ? NULL_ISIS : i + 10 * j);
    const cubo = leCuboIsis(cuboSintetico(L, A, 3, 2, valorDe, { base: 1, multiplicador: 2 }));
    expect([cubo.largura, cubo.altura]).toEqual([L, A]);
    for (let j = 0; j < A; j += 1) {
      for (let i = 0; i < L; i += 1) {
        const v = cubo.valores[j * L + i];
        if (i === 3 && j === 2) expect(v).toBeNaN();
        else expect(v).toBeCloseTo(1 + 2 * (i + 10 * j), 4);
      }
    }
  });

  it('lê o grupo Mapping como números', () => {
    const r = leRotuloIsis('Group = Mapping\n  MinimumLongitude = -70.0\n  Scale = 39.345539104126 <pixels/degree>\n  TargetName = Triton\nEnd_Group');
    expect(r.mapa.MinimumLongitude).toBe(-70);
    expect(r.mapa.Scale).toBeCloseTo(39.3455391, 6);
    expect(r.mapa.TargetName).toBe('Triton');
  });
});

describe('a junção dos cubos', () => {
  it('o de cima manda onde existe, o de baixo fora, e a rampa fica entre os dois', () => {
    const [L, A] = [60, 10];
    const cima = { largura: L, altura: A, valores: Float32Array.from({ length: L * A }, (_, k) => (k % L < 30 ? 10 : NaN)) };
    const baixo = { largura: L, altura: A, valores: new Float32Array(L * A) };
    const v = juntaCubos([cima, baixo], 10);
    expect(v[5 * L + 2]).toBeCloseTo(10, 5); // a borda da JANELA não é furo: os dois cubos acabam ali juntos
    expect(v[5 * L + 15]).toBeCloseTo(10, 5); // longe do furo do de cima: ele puro
    expect(v[5 * L + 45]).toBe(0); // fora do de cima: o de baixo
    const naRampa = v[5 * L + 25];
    expect(naRampa).toBeGreaterThan(0);
    expect(naRampa).toBeLessThan(10);
  });
});

describe('os furos pequenos', () => {
  it('o pequeno fecha na rampa; o grande e o que toca a borda continuam NaN', () => {
    const [L, A] = [80, 40];
    const v = Float32Array.from({ length: L * A }, (_, k) => k % L);
    const furo = (i0, j0, n) => { for (let j = j0; j < j0 + n; j += 1) for (let i = i0; i < i0 + n; i += 1) v[j * L + i] = NaN; };
    furo(10, 10, 4);
    furo(40, 5, 25);
    furo(0, 30, 3);
    const tapados = tapaFurosPequenos(v, L, A, { areaMaximaPx: 100, passadas: 400 });
    expect(tapados).toBe(16);
    for (let j = 10; j < 14; j += 1) for (let i = 10; i < 14; i += 1) expect(v[j * L + i]).toBeCloseTo(i, 1);
    expect(v[15 * L + 50]).toBeNaN();
    expect(v[31 * L + 1]).toBeNaN();
  });
});

describe('a janela na grade da casa', () => {
  it('um bloco em −10..10°E, 0..20°N cai nessas coordenadas, em metros; o resto é vazio', () => {
    const pxGrau = 4;
    const mapa = { MinimumLongitude: -10, MaximumLatitude: 20, Scale: pxGrau };
    const [largura, altura] = [20 * pxGrau, 20 * pxGrau];
    const valores = new Float32Array(largura * altura).fill(1.5);
    const [L, A] = [360, 180];
    const { metros, vazio } = janelaNaGrade(valores, largura, altura, mapa, L, A, { escala: 1000 });
    const col = (lon) => Math.floor(((((lon - 180) % 360) + 360) % 360));
    const lin = (lat) => Math.floor(90 - lat);
    expect(vazio[lin(10) * L + col(0)]).toBe(0);
    expect(metros[lin(10) * L + col(0)]).toBeCloseTo(1500, 3);
    expect(vazio[lin(10) * L + col(-9.5)]).toBe(0);
    expect(vazio[lin(10) * L + col(12)]).toBe(1);
    expect(vazio[lin(25) * L + col(0)]).toBe(1);
    let comDado = 0;
    for (const v of vazio) if (!v) comDado += 1;
    expect(comDado).toBe(20 * 20);
  });
});
