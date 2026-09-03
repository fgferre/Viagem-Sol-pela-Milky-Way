// Serve: lei — a conta que assa a normal do DEM (itens 140/141) e a guarda que recusa a meia volta
// ============================================================
// O GERADOR DE NORMAIS EM MINIATURA. O script real lê DEMs de centenas
// de MB e escreve 4096x2048; aqui entram grades sintéticas de dezenas de
// texels, onde a resposta é conhecida de fora do código:
//
//  1. O SINAL. A convenção que `normalDoMapa` (corpos.ts) consome é
//     x = -dh/dLeste, y = -dh/dNorte, z = 1: encosta que SOBE para o
//     leste tem normal apontando para OESTE. Inverter um dos dois sinais
//     é o defeito que faz a cratera virar montanha na tela, e ele passa
//     em md5 — só um oráculo de sinal o pega.
//  2. A AMPLITUDE FÍSICA. Uma rampa de inclinação conhecida em METROS
//     por METRO tem de sair com essa mesma inclinação no mapa, com os
//     passos da ESFERA (R·cos(lat)·dLon a leste, R·dLat ao norte) — é o
//     que separa "amplitude medida, ganho 1" de exagero.
//  3. A GUARDA DE ALINHAMENTO. Com o albedo acompanhando o relevo, a
//     orientação declarada vence a meia volta; com o DEM girado meia
//     volta contra o mapa de cor, a guarda RECUSA a assar.
//
// Nada aqui toca rede, disco ou o DEM: o script foi partido em funções
// puras (`assaNormais`, `medirAlinhamento`, `conferirAlinhamento`,
// `giraMeiaVolta`) sem mudar uma conta — os mapas já assados da Lua, de
// Mercúrio e de Marte continuam byte a byte os mesmos.
// ============================================================
import { describe, expect, it } from 'vitest';
import {
  CORPOS,
  MARGEM_DA_BORDA,
  assaNormais,
  conferirAlinhamento,
  giraMeiaVolta,
  medirAlinhamento,
} from './gera-normal-de-dem.mjs';

const L = 64;
const A = 32;
const RAIO_M = 1737400;

/** o canal do pixel (i,j) do RGB assado, já de volta em [-1, 1] */
function normalEm(rgb, i, j, largura = L) {
  const k = (j * largura + i) * 3;
  return {
    x: (rgb[k] / 255) * 2 - 1,
    y: (rgb[k + 1] / 255) * 2 - 1,
    z: (rgb[k + 2] / 255) * 2 - 1,
  };
}

/** grade de alturas em metros, montada por uma função de (i, j). */
function grade(f, largura = L, altura = A) {
  const h = new Float32Array(largura * altura);
  for (let j = 0; j < altura; j += 1) {
    for (let i = 0; i < largura; i += 1) h[j * largura + i] = f(i, j);
  }
  return h;
}

/** latitude do centro da linha j — a mesma conta do gerador. */
const latDe = (j, altura = A) => Math.PI / 2 - ((j + 0.5) / altura) * Math.PI;

/** os passos da ESFERA nesta grade, em metros (os mesmos do gerador). */
const passoLeste = (j, raioM = RAIO_M) => (raioM * Math.cos(latDe(j)) * 2 * Math.PI) / L;
const passoNorte = (raioM = RAIO_M) => (raioM * Math.PI) / A;

/**
 * AS ALTURAS SÃO ABSURDAS DE PROPÓSITO. Numa grade de 64x32 o texel da
 * Lua mede 170 km: um morro realista de 2 km daria inclinação de
 * centésimo de grau, dentro da quantização de 8 bits do PNG. O que se
 * mede aqui é o SINAL e a CONTA, não a paisagem — por isso as rampas se
 * escrevem por INCLINAÇÃO (metros por metro), e a calota tem meia
 * largura de texel de altura.
 */
function rampaLeste(declive, raioM = RAIO_M) {
  return grade((i, j) => declive * passoLeste(j, raioM) * i);
}

/**
 * A CALOTA SINTÉTICA: um morro gaussiano centrado no texel (16, 16) com
 * uns 3 texels de raio, alto o bastante para inclinar a normal.
 */
const CALOTA = grade((i, j) =>
  0.6 * passoNorte() * Math.exp(-(((i - 16) ** 2 + (j - 16) ** 2) / 8))
);

/** a inclinação LESTE que o mapa devolve, de volta em metros por metro:
 *  x = -dhLeste·inv e z = inv, então -x/z é a derivada original. */
function declivLeste(rgb, i, j) {
  const n = normalEm(rgb, i, j);
  return -n.x / n.z;
}

describe('1. o sinal da normal — a parede leste aponta para OESTE', () => {
  it('a rampa que SOBE para o leste devolve x negativo em toda a grade', () => {
    // dh/dLeste > 0 ⇒ x = -dh/dLeste < 0 (a normal se deita para OESTE)
    const { rgb } = assaNormais(rampaLeste(Math.tan(Math.PI / 6)), L, A, RAIO_M);
    for (const j of [8, 16, 24]) {
      for (const i of [10, 30, 50]) {
        const n = normalEm(rgb, i, j);
        expect(n.x, `x em (${i},${j})`).toBeLessThan(-0.1);
        expect(n.z, `z em (${i},${j})`).toBeGreaterThan(0);
      }
    }
  });

  it('a rampa que SOBE para o NORTE devolve y negativo (a linha de cima é o norte)', () => {
    // j cresce para o SUL; altura maior no norte ⇒ dh/dNorte > 0 ⇒ y < 0
    const declive = Math.tan(Math.PI / 6);
    const { rgb } = assaNormais(
      grade((_i, j) => declive * passoNorte() * (A - j)), L, A, RAIO_M
    );
    for (const j of [8, 16, 24]) {
      const n = normalEm(rgb, 32, j);
      expect(n.y, `y na linha ${j}`).toBeLessThan(-0.1);
      expect(Math.abs(n.x), `x na linha ${j}`).toBeLessThan(1e-2);
    }
  });

  it('a CALOTA aponta para FORA em todos os quatro flancos', () => {
    const { rgb } = assaNormais(CALOTA, L, A, RAIO_M);
    // a leste do cume a altura CAI para o leste ⇒ x > 0 (a normal se
    // deita rumo ao leste, para fora do morro); e simétrico nos outros
    expect(normalEm(rgb, 18, 16).x).toBeGreaterThan(0.1);
    expect(normalEm(rgb, 14, 16).x).toBeLessThan(-0.1);
    // ao SUL do cume (j maior) a altura SOBE rumo ao norte ⇒ dhNorte > 0
    // ⇒ y < 0, que é a normal deitada para o SUL — para fora do morro
    expect(normalEm(rgb, 16, 18).y).toBeLessThan(-0.1);
    expect(normalEm(rgb, 16, 14).y).toBeGreaterThan(0.1);
    // e o cume é plano: a normal ali é a geométrica (0,0,1)
    const cume = normalEm(rgb, 16, 16);
    expect(Math.hypot(cume.x, cume.y)).toBeLessThan(0.02);
  });
});

describe('2. a amplitude é FÍSICA — a inclinação medida sai como inclinação', () => {
  it('uma encosta de 10° em metros por metro sai como 10° no mapa', () => {
    const { rgb, rmsGraus } = assaNormais(
      rampaLeste(Math.tan((10 * Math.PI) / 180)), L, A, RAIO_M
    );
    // longe da emenda de longitude (a coluna 0 dá a volta e vira degrau)
    for (const j of [8, 16, 24]) {
      for (const i of [16, 32, 48]) {
        const graus = (Math.atan(declivLeste(rgb, i, j)) * 180) / Math.PI;
        expect(graus, `inclinação em (${i},${j})`).toBeCloseTo(10, 0);
      }
    }
    // e o RMS da grade inteira fica na mesma ordem (o degrau da emenda e
    // o clamp polar sobem o número, nunca o derrubam)
    expect(rmsGraus).toBeGreaterThan(9.9);
  });

  it('uma encosta de 30° sai como 30° — nenhum ganho, nenhum teto', () => {
    const { rgb } = assaNormais(rampaLeste(Math.tan(Math.PI / 6)), L, A, RAIO_M);
    const graus = (Math.atan(declivLeste(rgb, 32, 16)) * 180) / Math.PI;
    expect(graus).toBeCloseTo(30, 0);
  });

  it('a MESMA paisagem num corpo 4x maior sai 4x menos inclinada', () => {
    // as alturas são as da rampa de 30° na Lua; num corpo de raio 4x os
    // mesmos metros se espalham por 4x mais chão
    const alturas = rampaLeste(Math.tan(Math.PI / 6));
    const pequeno = assaNormais(alturas, L, A, RAIO_M);
    const grande = assaNormais(alturas, L, A, RAIO_M * 4);
    expect(grande.rmsGraus).toBeLessThan(pequeno.rmsGraus);
    expect(declivLeste(grande.rgb, 32, 16)).toBeCloseTo(
      declivLeste(pequeno.rgb, 32, 16) / 4, 2
    );
  });

  it('terreno plano devolve a normal geométrica exata (128,128,255)', () => {
    const { rgb, rmsGraus, maxGraus } = assaNormais(grade(() => 1234), L, A, RAIO_M);
    for (const k of [0, 3 * (16 * L + 32), rgb.length - 3]) {
      expect(rgb[k]).toBe(128);
      expect(rgb[k + 1]).toBe(128);
      expect(rgb[k + 2]).toBe(255);
    }
    expect(rmsGraus).toBe(0);
    expect(maxGraus).toBe(0);
  });
});

describe('3. a guarda de alinhamento recusa a meia volta', () => {
  /** albedo que ACOMPANHA o relevo (o degrau de terreno é degrau de imagem) */
  const albedoDaCalota = Float64Array.from(CALOTA, (h) => 40 + h / 20);
  const naOutraOrientacao = giraMeiaVolta(CALOTA, L, A);

  it('com o DEM e o mapa na MESMA convenção, a declarada vence e a guarda passa', () => {
    const m = medirAlinhamento(CALOTA, naOutraOrientacao, albedoDaCalota, L, A);
    expect(m.bordaDeclarada).toBeGreaterThan(m.bordaOutra + MARGEM_DA_BORDA);
    expect(() => conferirAlinhamento(CORPOS.mercury, m)).not.toThrow();
  });

  it('com o DEM MEIA VOLTA virado contra o mapa de cor, a guarda NÃO assa', () => {
    // as duas orientações trocadas: é exatamente o defeito do item 138
    const m = medirAlinhamento(naOutraOrientacao, CALOTA, albedoDaCalota, L, A);
    expect(m.bordaDeclarada).toBeLessThan(m.bordaOutra);
    expect(() => conferirAlinhamento(CORPOS.mercury, m)).toThrow(/meia volta/);
  });

  it('empate dentro da margem também recusa — vencer por pouco não é vencer', () => {
    const quase = { bordaDeclarada: 0.20, bordaOutra: 0.16, comSinal: 0.9 };
    expect(quase.bordaDeclarada - quase.bordaOutra).toBeLessThan(MARGEM_DA_BORDA);
    expect(() => conferirAlinhamento(CORPOS.mercury, quase)).toThrow(/meia volta/);
  });

  it('o piso COM SINAL é só da Lua, e reprova quando o albedo não segue a altura', () => {
    expect(CORPOS.moon.correlacaoMinima).toBe(0.3);
    expect(CORPOS.mercury.correlacaoMinima).toBeUndefined();
    expect(CORPOS.mars.correlacaoMinima).toBeUndefined();
    const passaNaBorda = { bordaDeclarada: 0.9, bordaOutra: 0.0, comSinal: 0.1 };
    // em Mercúrio o albedo é composição: a mesma medida passa
    expect(() => conferirAlinhamento(CORPOS.mercury, passaNaBorda)).not.toThrow();
    // na Lua, mar baixo E escuro é FATO — 0,1 não serve
    expect(() => conferirAlinhamento(CORPOS.moon, passaNaBorda)).toThrow(/correlação com sinal/);
  });

  it('a meia volta é involutiva e não perde texel — girar duas vezes volta ao mesmo', () => {
    const ida = giraMeiaVolta(CALOTA, L, A);
    const volta = giraMeiaVolta(ida, L, A);
    expect(Array.from(volta)).toEqual(Array.from(CALOTA));
    expect(ida[16 * L + 16 + L / 2]).toBe(CALOTA[16 * L + 16]);
  });
});

describe('4. a tabela dos corpos (o que muda de um para o outro)', () => {
  it('a conversão declarada por cada fonte está pinada, e só ela muda', () => {
    expect(CORPOS.moon).toMatchObject({ offsetDoDado: 20000, metrosPorUnidade: 0.5, meiaVolta: false });
    expect(CORPOS.mercury).toMatchObject({ offsetDoDado: 0, metrosPorUnidade: 0.5, meiaVolta: true });
    expect(CORPOS.mars).toMatchObject({ offsetDoDado: 0, metrosPorUnidade: 1, meiaVolta: true });
  });
});
