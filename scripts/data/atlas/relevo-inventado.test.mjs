// Serve: lei — as réguas do relevo inventado (S(d) em km verdadeiros, com volta e máscara; oitavas que somam de volta a altura)
// ============================================================
// AS MEDIDAS DA E2b EM MINIATURA (PLAN-RELEVO.md). O módulo mede o lado
// medido de Plutão e Caronte para a síntese da E3 copiar; se a régua errar,
// a síntese copia o erro. Grades sintéticas pequenas, de resposta conhecida
// de fora do código:
//
//  1. A DISTÂNCIA VERDADEIRA. Numa rampa leste–oeste de inclinação g (m por
//     km ao longo do paralelo), S(d) = (g·d)² — no equador E a 60°, onde o
//     mesmo d pede o DOBRO de colunas. Esquecer o cos(lat) erra por 4×.
//  2. O RUÍDO BRANCO. Sem correlação, S(d) = 2σ² em todo lag e nos dois eixos.
//  3. A VOLTA. A mesma janela de dado atravessando a coluna 0 ou no meio do
//     mapa dá o MESMO S: o par que cruza a costura da longitude conta.
//  4. A MÁSCARA. Um vazio com valor absurdo não muda S: par com uma ponta no
//     vazio não existe.
//  5. AS OITAVAS. A soma das bandas devolve a altura onde há dado (a síntese
//     costura oitava por oitava; banda que perde ou duplica energia vira
//     degrau na emenda).
// ============================================================
import { describe, expect, it } from 'vitest';
import {
  decompoeEmOitavas,
  funcaoDeEstrutura,
  latitudeDaLinha,
} from './relevo-inventado.mjs';

/** mulberry32 — o mesmo gerador de `geradorDeSemente` (esculpido.ts) */
function gerador(semente) {
  let a = semente >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ruído branco gaussiano de desvio `sigma` (Box–Muller) */
function ruidoBranco(n, sigma, semente) {
  const rnd = gerador(semente);
  const campo = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    const u = 1 - rnd();
    campo[k] = sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
  }
  return campo;
}

/** raio (m) em que o texel do equador mede `texelKm` */
const raioDoTexel = (largura, texelKm) => ((largura * texelKm) / (2 * Math.PI)) * 1000;

describe('S(d) — a função de estrutura do lado medido', () => {
  it('na rampa leste–oeste dá (g·d)² no lag certo em km, no equador e a 60°', () => {
    const L = 512;
    const A = 256;
    const raioM = raioDoTexel(L, 1);
    const g = 3; // m por km ao longo do paralelo
    const campo = new Float32Array(L * A);
    for (let j = 0; j < A; j += 1) {
      const colunaKm = (raioM / 1000) * Math.cos(latitudeDaLinha(j, A)) * ((2 * Math.PI) / L);
      for (let i = 0; i < L; i += 1) campo[j * L + i] = g * i * colunaKm;
    }
    for (const linhas of [[127, 128], [42, 43]]) {
      // só a metade oeste da linha: nenhum par cruza o salto da rampa
      const valido = new Uint8Array(L * A);
      for (const j of linhas) for (let i = 0; i < L / 2; i += 1) valido[j * L + i] = 1;
      const { ew } = funcaoDeEstrutura(campo, valido, L, A, raioM, { lags: [10] });
      const [km, s] = ew[0];
      expect(km).toBeGreaterThan(9.9);
      expect(km).toBeLessThan(10.05);
      expect(s / (g * km) ** 2).toBeGreaterThan(0.99);
      expect(s / (g * km) ** 2).toBeLessThan(1.01);
    }
  });

  it('no ruído branco dá 2σ² em todo lag, nos dois eixos', () => {
    const L = 256;
    const A = 128;
    const sigma = 5;
    const campo = ruidoBranco(L * A, sigma, 7);
    const valido = new Uint8Array(L * A).fill(1);
    const S = funcaoDeEstrutura(campo, valido, L, A, raioDoTexel(L, 1), { lags: [1, 2, 5, 13, 34] });
    expect(S.ns).toHaveLength(5);
    expect(S.ew).toHaveLength(5);
    for (const [, s] of [...S.ns, ...S.ew]) {
      expect(s / (2 * sigma * sigma)).toBeGreaterThan(0.95);
      expect(s / (2 * sigma * sigma)).toBeLessThan(1.05);
    }
  });

  it('dá a volta na longitude: a janela que cruza a coluna 0 mede o mesmo que no meio', () => {
    const L = 128;
    const A = 64;
    const campo = ruidoBranco(L * A, 2, 11);
    const girado = new Float32Array(L * A);
    const naCostura = new Uint8Array(L * A);
    const noMeio = new Uint8Array(L * A);
    for (let j = 0; j < A; j += 1) {
      for (let i = 0; i < L; i += 1) {
        const meia = (i + L / 2) % L;
        girado[j * L + meia] = campo[j * L + i];
        if (j >= 20 && j <= 40 && (i < 8 || i >= L - 8)) {
          naCostura[j * L + i] = 1;
          noMeio[j * L + meia] = 1;
        }
      }
    }
    const opcoes = { lags: [1, 3, 6], minimoDePares: 1 };
    const raioM = raioDoTexel(L, 1);
    const a = funcaoDeEstrutura(campo, naCostura, L, A, raioM, opcoes);
    const b = funcaoDeEstrutura(girado, noMeio, L, A, raioM, opcoes);
    expect(a.ew).toHaveLength(3);
    for (let q = 0; q < 3; q += 1) {
      expect(a.ew[q][2]).toBe(b.ew[q][2]);
      expect(a.ew[q][1]).toBeCloseTo(b.ew[q][1], 9);
      expect(a.ns[q][1]).toBeCloseTo(b.ns[q][1], 9);
    }
  });

  it('ignora o par com uma ponta no vazio, por maior que seja o valor ali', () => {
    const L = 128;
    const A = 64;
    const campo = ruidoBranco(L * A, 2, 23);
    const comLixo = Float32Array.from(campo);
    const valido = new Uint8Array(L * A).fill(1);
    for (let j = 10; j < 20; j += 1) {
      for (let i = 30; i < 50; i += 1) {
        valido[j * L + i] = 0;
        comLixo[j * L + i] = 1e6;
      }
    }
    const raioM = raioDoTexel(L, 1);
    const limpo = funcaoDeEstrutura(campo, valido, L, A, raioM, { lags: [1, 4, 16] });
    const sujo = funcaoDeEstrutura(comLixo, valido, L, A, raioM, { lags: [1, 4, 16] });
    expect(sujo).toEqual(limpo);
    expect(Math.max(...sujo.ew.map(([, s]) => s))).toBeLessThan(100);
  });
});

describe('as oitavas por diferença de gaussianas', () => {
  it('somam de volta a altura onde há dado (e valem 0 no vazio)', () => {
    const L = 128;
    const A = 64;
    const raioM = raioDoTexel(L, 10);
    const ruido = ruidoBranco(L * A, 30, 5);
    const campo = new Float32Array(L * A);
    const valido = new Uint8Array(L * A).fill(1);
    for (let j = 0; j < A; j += 1) {
      for (let i = 0; i < L; i += 1) {
        const k = j * L + i;
        campo[k] = 800 * Math.sin((2 * Math.PI * i) / L) * Math.cos(latitudeDaLinha(j, A)) + ruido[k];
        if (i >= 70 && i < 110 && j >= 15 && j < 45) {
          valido[k] = 0;
          campo[k] = 1e6;
        }
      }
    }
    const bandas = decompoeEmOitavas(campo, valido, L, A, raioM, [20, 40, 80, 160]);
    expect(bandas).toHaveLength(5);
    let maiorErro = 0;
    let maiorNoVazio = 0;
    for (let k = 0; k < L * A; k += 1) {
      const soma = bandas.reduce((s, b) => s + b[k], 0);
      if (valido[k]) maiorErro = Math.max(maiorErro, Math.abs(soma - campo[k]));
      else maiorNoVazio = Math.max(maiorNoVazio, ...bandas.map((b) => Math.abs(b[k])));
    }
    expect(maiorErro).toBeLessThan(1e-3);
    expect(maiorNoVazio).toBe(0);
  });
});
