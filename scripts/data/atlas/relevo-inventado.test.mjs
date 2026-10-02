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
//
// A COSTURA (E3, item 1), num mundo sintético de verdade CONHECIDA também no
// vazio: a verdade T e a simulação da costura são realizações do mesmo modelo
// (Σ gₖ·ruidoDaOitava, sementes diferentes), e o vazio é uma calota ondulada
// que cobre o polo sul e atravessa a coluna 0 (180°E). Num conjunto de pares
// de sementes:
//  6. F = T no dado, byte a byte.
//  7. A inclinação em cada faixa de distância à emenda — dos dois lados e no
//     vazio longe dela — é a da verdade: RMS ±10 %, p99 ±20 %.
//  8. A energia por banda junto da emenda (−σ..0, 0..σ, 1–6σ) é a do modelo
//     (0,60–1,30), nas bandas que carregam ≥ 2 % da energia da inclinação do
//     mundo de teste; o vale das demais é a limitação aceita de `costura`.
//  9. A mesma semente dá os mesmos bytes (a prévia aprovada é o que vai ao app).
// 10. A volta da longitude não tem degrau.
// ============================================================
import { beforeAll, describe, expect, it } from 'vitest';
import {
  costura,
  decompoeEmOitavas,
  distanciaAoVazioKm,
  funcaoDeEstrutura,
  latitudeDaLinha,
  longitudeDaColuna,
  ruidoDaOitava,
  sigmasDasOitavas,
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

// ------------------------------------------------------------
// A costura no mundo sintético
// ------------------------------------------------------------

const MUNDO = { L: 256, A: 128, raioM: 606e3 }; // Caronte, 14,9 km por texel
const SIGMAS = sigmasDasOitavas(MUNDO.raioM, MUNDO.A); // 30, 59, 119, 238, 476 km
// O espectro REALISTA de Oz Terra: o ganho (m) de cada banda é a raiz da energia da banda medida lá
// (.cache/relevo/charon-medidas.json, `energiaPorBanda`; bandas casadas pelo corte σ). As escalas abaixo de
// 30 km, que esta grade não resolve, entram somadas na banda 0, com o ganho que guarda a energia da
// inclinação. As oitavas acima de R/5 ficam com ~0,4 % da inclinação, como em Caronte de verdade.
const GANHOS = [2149, 282, 319, 860, 1131, 1131];
// Só entra no critério de energia a banda que carrega ≥ 2 % da energia da inclinação (∝ ganho²/σ²).
const PARTE_MINIMA = 0.02;
const sigmaDaBanda = (k) => (k < SIGMAS.length ? SIGMAS[k] : 2 * SIGMAS[SIGMAS.length - 1]);
const energiaDaInclinacao = GANHOS.map((g, k) => (g / sigmaDaBanda(k)) ** 2);
const partesDaInclinacao = energiaDaInclinacao.map((e) => e / energiaDaInclinacao.reduce((s, x) => s + x, 0));
const BANDAS = partesDaInclinacao.flatMap((parte, k) => (parte >= PARTE_MINIMA ? [k] : []));
const PARES_DE_SEMENTES = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => [1000 + 2 * s, 1001 + 2 * s]);

/** O vazio: a calota centrada em (−25°, 180°E) de raio 80° ± ondas de 3, 7 e 13 lóbulos. */
function calotaOndulada(L, A) {
  const f0 = (-25 * Math.PI) / 180;
  const centro = [-Math.cos(f0), 0, Math.sin(f0)];
  const norte = [Math.sin(f0), 0, Math.cos(f0)];
  const leste = [0, -1, 0];
  const vazio = new Uint8Array(L * A);
  for (let j = 0; j < A; j += 1) {
    const f = latitudeDaLinha(j, A);
    for (let i = 0; i < L; i += 1) {
      const l = (longitudeDaColuna(i, L) * Math.PI) / 180;
      const p = [Math.cos(f) * Math.cos(l), Math.cos(f) * Math.sin(l), Math.sin(f)];
      const dot = (u) => u[0] * p[0] + u[1] * p[1] + u[2] * p[2];
      const angulo = Math.acos(Math.max(-1, Math.min(1, dot(centro))));
      const az = Math.atan2(dot(leste), dot(norte));
      const raio = 80 + 9 * Math.sin(3 * az + 0.7) + 5 * Math.sin(7 * az + 1.9) + 2.5 * Math.sin(13 * az + 0.3);
      if (angulo < (raio * Math.PI) / 180) vazio[j * L + i] = 1;
    }
  }
  return vazio;
}

/** |∇h| (m/km) com a conta de `inclinacaoRms`: diferença central, passo leste preso em 80°. */
function declive(campo, L, A, raioM) {
  const raioKm = raioM / 1000;
  const passoNorte = raioKm * (Math.PI / A);
  const passoMinimo = raioKm * Math.cos((80 * Math.PI) / 180) * ((2 * Math.PI) / L);
  const g = new Float32Array(L * A);
  for (let j = 0; j < A; j += 1) {
    const passoLeste = Math.max(raioKm * Math.cos(latitudeDaLinha(j, A)) * ((2 * Math.PI) / L), passoMinimo);
    const jn = Math.max(0, j - 1);
    const js = Math.min(A - 1, j + 1);
    for (let i = 0; i < L; i += 1) {
      const e = (campo[j * L + ((i + 1) % L)] - campo[j * L + ((i - 1 + L) % L)]) / (2 * passoLeste);
      const n = (campo[jn * L + i] - campo[js * L + i]) / ((js - jn) * passoNorte);
      g[j * L + i] = Math.hypot(e, n);
    }
  }
  return g;
}

/** Em que faixa de `bordas` cai `d` (−1 fora). */
const faixaDe = (d, bordas) => {
  for (let f = 0; f + 1 < bordas.length; f += 1) if (d >= bordas[f] && d < bordas[f + 1]) return f;
  return -1;
};

/**
 * O CONJUNTO, calculado uma vez: para cada par de sementes, a verdade, a
 * costura e as medidas por faixa de distância com sinal à emenda (negativa
 * no dado, positiva no vazio, em km).
 */
let conjunto = null;
function oConjunto() {
  if (conjunto) return conjunto;
  const { L, A, raioM } = MUNDO;
  const n = L * A;
  const nb = SIGMAS.length + 1;
  const texelKm = (raioM / 1000) * (Math.PI / A);
  const vazio = calotaOndulada(L, A);
  const dado = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) dado[k] = vazio[k] ? 0 : 1;
  const ateVazio = distanciaAoVazioKm(vazio, L, A, raioM);
  const ateDado = distanciaAoVazioKm(dado, L, A, raioM);
  const distancia = new Float32Array(n);
  for (let k = 0; k < n; k += 1) distancia[k] = vazio[k] ? ateDado[k] : -ateVazio[k];
  const um = new Uint8Array(n).fill(1);
  const cosLat = (k) => Math.cos(latitudeDaLinha(Math.floor(k / L), A));

  const bordasDoDeclive = [-Infinity, -10, -3, -1.01, 0, 1.01, 3, 10, Infinity].map((b) => b * texelKm);
  const declives = { T: bordasDoDeclive.slice(1).map(() => []), F: bordasDoDeclive.slice(1).map(() => []) };
  const bordasDaBanda = BANDAS.map((k) => [-1, 0, 1, 6].map((b) => b * sigmaDaBanda(k)));
  const energia = BANDAS.map(() => ({ F: new Float64Array(3), peso: new Float64Array(3), T: 0, pesoT: 0 }));

  const corridas = [];
  for (const [sa, sb] of PARES_DE_SEMENTES) {
    const T = new Float32Array(n);
    for (let k = 0; k < nb; k += 1) {
      const ruido = ruidoDaOitava(sa, k, SIGMAS, L, A, raioM);
      for (let q = 0; q < n; q += 1) T[q] += GANHOS[k] * ruido[q];
    }
    const medida = new Float32Array(n);
    for (let q = 0; q < n; q += 1) medida[q] = dado[q] ? T[q] : 0;
    const entrada = {
      medida, dadoPorOitava: Array(nb).fill(dado), semente: sb, sigmasKm: SIGMAS, ganhos: GANHOS,
      largura: L, altura: A, raioM,
    };
    const F = costura(entrada);
    corridas.push({ entrada, F });
    for (const [nome, campo] of [['T', T], ['F', F]]) {
      const g = declive(campo, L, A, raioM);
      for (let q = 0; q < n; q += 1) declives[nome][faixaDe(distancia[q], bordasDoDeclive)].push(g[q]);
    }
    const bandasF = decompoeEmOitavas(F, um, L, A, raioM, SIGMAS);
    const bandasT = decompoeEmOitavas(T, um, L, A, raioM, SIGMAS);
    BANDAS.forEach((k, b) => {
      for (let q = 0; q < n; q += 1) {
        const w = cosLat(q);
        energia[b].T += w * bandasT[k][q] ** 2;
        energia[b].pesoT += w;
        const f = faixaDe(distancia[q], bordasDaBanda[b]);
        if (f < 0) continue;
        energia[b].F[f] += w * bandasF[k][q] ** 2;
        energia[b].peso[f] += w;
      }
    });
  }
  const resumo = (lista) => {
    const v = Float64Array.from(lista).sort();
    const rms = Math.sqrt(v.reduce((s, x) => s + x * x, 0) / v.length);
    return { rms, p99: v[Math.floor(0.99 * (v.length - 1))] };
  };
  conjunto = {
    dado,
    corridas,
    declive: { T: declives.T.map(resumo), F: declives.F.map(resumo) },
    // energia da banda k de F em cada faixa (−σ..0, 0..σ, 1–6σ) / a da verdade na esfera inteira
    energia: energia.map((e) => Array.from(e.F, (s, f) => s / e.peso[f] / (e.T / e.pesoT))),
  };
  return conjunto;
}

describe('a costura — simulação condicional oitava por oitava', () => {
  // o conjunto custa ~5 s (8 pares de costura): sai uma vez, fora do limite de 5 s de cada `it`
  beforeAll(() => {
    oConjunto();
  }, 120_000);

  it('é o medido no dado, byte a byte', () => {
    const { dado, corridas } = oConjunto();
    for (const { entrada, F } of corridas) {
      let diferentes = 0;
      for (let q = 0; q < dado.length; q += 1) if (dado[q] && F[q] !== entrada.medida[q]) diferentes += 1;
      expect(diferentes).toBe(0);
    }
  });

  it('tem o RMS da inclinação da verdade em toda faixa de distância à emenda, dos dois lados e no vazio longe (±10 %)', () => {
    const { declive: d } = oConjunto();
    d.F.forEach((x, f) => {
      expect(x.rms / d.T[f].rms).toBeGreaterThanOrEqual(0.9);
      expect(x.rms / d.T[f].rms).toBeLessThanOrEqual(1.1);
    });
  });

  it('tem o p99 da inclinação da verdade em toda faixa de distância à emenda (±20 %)', () => {
    const { declive: d } = oConjunto();
    d.F.forEach((x, f) => {
      expect(x.p99 / d.T[f].p99).toBeGreaterThanOrEqual(0.8);
      expect(x.p99 / d.T[f].p99).toBeLessThanOrEqual(1.2);
    });
  });

  it('tem junto da emenda a energia do modelo nas bandas que carregam a inclinação (0,60–1,30)', () => {
    const { energia } = oConjunto();
    const partes = partesDaInclinacao.map((p, k) => `banda ${k}: ${(100 * p).toFixed(2)} %`).join(', ');
    const razoesDasBandas = energia.map((r) => r.map((x) => x.toFixed(2)).join(' / ')).join(' | ');
    console.info(
      `energia da inclinação por banda — ${partes}; checadas (≥ ${100 * PARTE_MINIMA} %): ${BANDAS.join(', ')}; ` +
        `razões (−σ..0 / 0..σ / 1–6σ): ${razoesDasBandas}`
    );
    expect(energia).toHaveLength(BANDAS.length);
    for (const razoes of energia) {
      for (const razao of razoes) {
        expect(razao).toBeGreaterThanOrEqual(0.6);
        expect(razao).toBeLessThanOrEqual(1.3);
      }
    }
  });

  it('dá os mesmos bytes com as mesmas sementes', () => {
    const { corridas } = oConjunto();
    const { entrada, F } = corridas[0];
    const outra = costura(entrada);
    expect(Buffer.from(outra.buffer).equals(Buffer.from(F.buffer))).toBe(true);
  });

  it('não tem degrau na volta da longitude (coluna largura − 1 → 0)', () => {
    const { corridas } = oConjunto();
    const { L, A } = MUNDO;
    for (const { F } of corridas) {
      const rmsDoSalto = (i0, i1) => {
        let s = 0;
        for (let j = 0; j < A; j += 1) s += (F[j * L + i1] - F[j * L + i0]) ** 2;
        return Math.sqrt(s / A);
      };
      const volta = rmsDoSalto(L - 1, 0);
      const vizinhos = (rmsDoSalto(L - 2, L - 1) + rmsDoSalto(0, 1)) / 2;
      expect(volta).toBeLessThan(1.5 * vizinhos);
    }
  });
});
