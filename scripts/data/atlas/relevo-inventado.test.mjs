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
//
// A SÍNTESE (E3, itens 2–8):
// 11. Os pesos das unidades somam 1 e passam de uma unidade à outra sem salto.
// 12. A membrana com restrições no interior as cumpre e fica entre os extremos
//     do dado e delas (princípio do máximo).
// 13. A cratera real do catálogo cai no lugar e no diâmetro dela.
// 14. A mesma semente dá a mesma simulação (ruído + crateras), byte a byte.
// 15. Tirar a trava de 80° no sul (`assaNormais`, `travaNoSul: false`) não muda
//     um byte do hemisfério norte nem das linhas onde a trava não age.
//
// A COLCHA (E3.3), com a textura-fonte conhecida (as bandas finas do ruído das
// oitavas) e as origens numa caixa só:
// 16. As mesmas entradas e a mesma semente dão os mesmos bytes.
// 17. Sem emenda: a inclinação nos texels do corte (a rampa entre dois
//     retalhos) é a dos demais texels, RMS e p99 ±20 %.
// 18. Sem repetir: dois retalhos a menos de 3 larguras não saem de origens a
//     menos de ¼ de largura — e a regra morde: com as origens embaralhadas ela
//     seria violada dezenas de vezes.
// 19. O recorte escondido (`ocultar`) não vaza: nenhuma janela da síntese
//     repete o padrão que estava lá (a cópia direta passa do limiar; a saída,
//     não) e, com outro conteúdo no recorte, a saída tem os mesmos bytes.
// 20. O amostrador do plano tangente (`planoTangente` + `amostraNoPonto`) dá,
//     nos dois polos, em qualquer giro e espelho, o valor de um campo
//     analítico, com erro abaixo do da bilinear.
//
// AS MEDIDAS SEM O RECORTE (E4, a prova do recorte escondido):
// 21. O que `medeLadoMedido` exclui não entra na medida: outro relevo e
//     outras crateras no recorte dão as mesmas medidas e os mesmos planos de
//     qualidade, e a área das crateras da caixa perde a parte excluída.
// ============================================================
import { beforeAll, describe, expect, it } from 'vitest';
import { assaNormais } from './gera-normal-de-dem.mjs';
import {
  amostraNoPonto,
  areaDaCaixaKm2,
  camadaDeCrateras,
  coeficientesDeSpline,
  colcha,
  colunaDaLongitude,
  costura,
  crateraReaisNoVazio,
  decompoeEmOitavas,
  distanciaAoVazioKm,
  fontesDaColcha,
  funcaoDeEstrutura,
  latitudeDaLinha,
  leiDeCrateras,
  lerCatalogoDeCrateras,
  linhaDaLatitude,
  longitudeDaColuna,
  mascaraDaCaixa,
  medeLadoMedido,
  membranaHarmonica,
  moldeDeCratera,
  pesosDasUnidades,
  planoTangente,
  pontoDoPlano,
  ruidoDaOitava,
  sigmasDasOitavas,
  sintetizaCorpo,
  somaDeOitavas,
  sorteiaCrateras,
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

/** O RMS e o p99 de uma lista de números. */
const resumo = (lista) => {
  const v = Float64Array.from(lista).sort();
  const rms = Math.sqrt(v.reduce((s, x) => s + x * x, 0) / v.length);
  return { rms, p99: v[Math.floor(0.99 * (v.length - 1))] };
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
    const ruidos = Array.from({ length: nb }, (_, k) => ruidoDaOitava(sb, k, SIGMAS, L, A, raioM));
    const entrada = {
      medida, dadoPorOitava: Array(nb).fill(dado), simulada: somaDeOitavas(ruidos, GANHOS, n), sigmasKm: SIGMAS,
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

describe('a síntese — unidades, níveis, crateras e o polo sul', () => {
  const PEQUENO = { L: 256, A: 128, raioM: 606e3 }; // 14,9 km por texel
  const FONTE = {
    unidades: {
      a: { poligonos: [[[150, -30], [210, -30], [210, 30], [150, 30]]] },
      b: { poligonos: [[[210, -30], [270, -30], [270, 30], [210, 30]]] },
    },
    padraoDoSul: { unidade: 'b', abaixoDaLatitude: -60 },
  };
  const PERFIL = (() => {
    const rR = Array.from({ length: 50 }, (_, q) => (q + 0.5) * 0.05);
    const h = rR.map((r) => (r < 1.1 ? -0.07 * (1 - (r / 1.1) ** 2) + 0.004 : 0.004 * (1.1 / r) ** 3));
    return { rR, mediana: h, p25: h.map((v) => v * 1.2), p75: h.map((v) => v * 0.8) };
  })();
  const MORFOMETRIA = { perfis: Object.fromEntries(['9-14', '14-20', '20-40', '≥40'].map((f) => [f, PERFIL])) };

  it('dá pesos de unidade que somam 1 e atravessam a borda do polígono sem salto', () => {
    const { L, A, raioM } = PEQUENO;
    const { ids, pesos } = pesosDasUnidades(FONTE, L, A, raioM);
    expect(ids).toEqual(['a', 'b']);
    let pior = 0;
    for (let k = 0; k < L * A; k += 1) pior = Math.max(pior, Math.abs(pesos[0][k] + pesos[1][k] - 1));
    expect(pior).toBeLessThan(1e-5);
    const j = A / 2;
    const wa = (lon) => pesos[0][j * L + Math.round(((lon - 180 + 360) % 360) / 360 * L - 0.5)];
    expect(wa(180)).toBeGreaterThan(0.99);
    expect(wa(240)).toBeLessThan(0.01);
    let maiorSalto = 0;
    for (let i = 0; i < L; i += 1) maiorSalto = Math.max(maiorSalto, Math.abs(pesos[0][j * L + ((i + 1) % L)] - pesos[0][j * L + i]));
    // σ de 50 km = 3,4 texels: a maior derivada do degrau desfocado é 1/(σ√2π) ≈ 0,12 por texel
    expect(maiorSalto).toBeLessThan(0.15);
    expect(maiorSalto).toBeGreaterThan(0.05);
  });

  it('cumpre as restrições no interior da membrana e fica entre os extremos (princípio do máximo)', () => {
    const L = 128;
    const A = 64;
    const raioM = 606e3;
    const n = L * A;
    const campo = new Float32Array(n);
    const dado = new Uint8Array(n);
    const restricoes = { mascara: new Uint8Array(n), valor: new Float32Array(n) };
    for (let j = 0; j < A; j += 1) {
      const lat = latitudeDaLinha(j, A);
      for (let i = 0; i < L; i += 1) {
        const lon = (longitudeDaColuna(i, L) * Math.PI) / 180;
        const k = j * L + i;
        if (Math.cos(lon) > 0.5) {
          dado[k] = 1;
          campo[k] = 1000 * Math.sin(lat) + 500 * Math.cos(3 * lon);
        } else if (Math.cos(lat) * Math.cos(lon - Math.PI) > Math.cos((25 * Math.PI) / 180)) {
          restricoes.mascara[k] = 1;
          restricoes.valor[k] = 2500;
        }
      }
    }
    const u = membranaHarmonica(campo, dado, L, A, raioM, 238, restricoes);
    let menor = Infinity;
    let maior = -Infinity;
    for (let k = 0; k < n; k += 1) {
      if (dado[k]) expect(u[k]).toBe(campo[k]);
      if (restricoes.mascara[k]) expect(u[k]).toBe(2500);
      const fixo = dado[k] ? campo[k] : restricoes.mascara[k] ? 2500 : null;
      if (fixo !== null) {
        menor = Math.min(menor, fixo);
        maior = Math.max(maior, fixo);
      }
    }
    for (let k = 0; k < n; k += 1) {
      expect(u[k]).toBeGreaterThanOrEqual(menor);
      expect(u[k]).toBeLessThanOrEqual(maior);
    }
    // do dado (60°E) à calota presa (155°E), pelo equador, a membrana sobe em direção a ela
    const noEquador = (lon) => u[(A / 2) * L + Math.round(((lon - 180 + 360) % 360) / 360 * L - 0.5)];
    expect(noEquador(80)).toBeLessThan(noEquador(110));
    expect(noEquador(110)).toBeLessThan(noEquador(140));
    expect(noEquador(140)).toBeLessThan(2500);
  });

  it('põe a cratera real do catálogo no lugar e no diâmetro dela', () => {
    const L = 1024;
    const A = 512;
    const raioM = 606e3;
    const texelKm = (606 * Math.PI) / A;
    const csv = [
      'ID,LATITUDE,LONGITUDE,DIAMETER,CONFIDENCE,REGION',
      'CHARON-001218,-23.174,44.67,92.61,4,6',
      'FORA-DO-VAZIO,10,300,40,4,6',
      'CONFIANCA-BAIXA,0,60,30,2,6',
    ].join('\n');
    const vazio = new Uint8Array(L * A);
    for (let i = 0; i < L; i += 1) {
      const lon = longitudeDaColuna(i, L);
      if (lon > 20 && lon < 120) for (let j = 0; j < A; j += 1) vazio[j * L + i] = 1;
    }
    const reais = crateraReaisNoVazio(lerCatalogoDeCrateras(csv, 0), { 6: { completudeKm: null } }, vazio, L, A);
    expect(reais.map((c) => c.id)).toEqual(['CHARON-001218']);
    const c = reais[0];
    const camada = camadaDeCrateras({ crateras: [{ ...c, quantil: 0.5 }], morfometria: MORFOMETRIA, largura: L, altura: A, raioM });
    // o centro da depressão: a média 3D pesada pela profundidade × área
    const v = [0, 0, 0];
    let areaFunda = 0;
    for (let j = 0; j < A; j += 1) {
      const f = latitudeDaLinha(j, A);
      for (let i = 0; i < L; i += 1) {
        const h = camada[j * L + i];
        if (!(h < 0)) continue;
        const l = (longitudeDaColuna(i, L) * Math.PI) / 180;
        const w = -h * Math.cos(f);
        v[0] += w * Math.cos(f) * Math.cos(l);
        v[1] += w * Math.cos(f) * Math.sin(l);
        v[2] += w * Math.sin(f);
        areaFunda += Math.cos(f) * texelKm * texelKm;
      }
    }
    const f0 = (c.lat * Math.PI) / 180;
    const l0 = (c.lon * Math.PI) / 180;
    const norma = Math.hypot(...v);
    const cosAng = (v[0] * Math.cos(f0) * Math.cos(l0) + v[1] * Math.cos(f0) * Math.sin(l0) + v[2] * Math.sin(f0)) / norma;
    expect((Math.acos(Math.min(1, cosAng)) * 606) / texelKm).toBeLessThan(1);
    // o diâmetro: a área funda é o disco até onde o molde cruza o zero
    const { valores } = moldeDeCratera(MORFOMETRIA, c.dKm);
    const r0 = valores.findIndex((x) => x >= 0) * 0.01 * (c.dKm / 2);
    expect(Math.abs(Math.sqrt(areaFunda / Math.PI) - r0)).toBeLessThan(texelKm);
  });

  it('dá a mesma simulação (ruído das oitavas + crateras) com a mesma semente, byte a byte', () => {
    const { L, A, raioM } = PEQUENO;
    const { ids, pesos } = pesosDasUnidades(FONTE, L, A, raioM);
    const lei = leiDeCrateras({ contadas: 30, areaKm2: 4e4, completudeKm: 4, inclinacaoAbaixo: { valor: -2, n: 25 } });
    const sigmas = sigmasDasOitavas(raioM, A);
    const simula = (semente) => {
      const { crateras } = sorteiaCrateras({ semente, ids, pesos, leis: [lei, lei], largura: L, altura: A, raioM, dMinKm: 30 });
      const camada = camadaDeCrateras({ crateras, morfometria: MORFOMETRIA, largura: L, altura: A, raioM });
      const ruidos = [0, 1].map((k) => ruidoDaOitava(semente, k, sigmas, L, A, raioM));
      const s = somaDeOitavas(ruidos, [300, pesos[0]], L * A);
      for (let q = 0; q < L * A; q += 1) s[q] += camada[q];
      return { s, quantas: crateras.length };
    };
    const a = simula(7);
    expect(a.quantas).toBeGreaterThan(20);
    expect(Buffer.from(simula(7).s.buffer).equals(Buffer.from(a.s.buffer))).toBe(true);
    expect(Buffer.from(simula(8).s.buffer).equals(Buffer.from(a.s.buffer))).toBe(false);
  });

  it('tira a trava de 80° só no sul: o norte e as linhas onde ela não age saem byte a byte', () => {
    const { L, A, raioM } = PEQUENO;
    const campo = somaDeOitavas([ruidoDaOitava(3, 0, sigmasDasOitavas(raioM, A), L, A, raioM)], [400], L * A);
    const { rgb } = assaNormais(campo, L, A, raioM);
    const semTrava = assaNormais(campo, L, A, raioM, undefined, { travaNoSul: false });
    const linha = (buf, j) => buf.subarray(j * L * 3, (j + 1) * L * 3);
    const polo = linhaAoSulDe80(A);
    for (let j = 0; j < polo; j += 1) expect(linha(semTrava.rgb, j).equals(linha(rgb, j))).toBe(true);
    for (let j = polo; j < A; j += 1) expect(linha(semTrava.rgb, j).equals(linha(rgb, j))).toBe(false);
    expect(Number.isFinite(semTrava.rmsGraus) && Number.isFinite(semTrava.maxGraus)).toBe(true);
    expect(semTrava.maxGraus).toBeGreaterThan(0);
  });
});

/** A primeira linha cujo centro fica ao sul de −80°. */
function linhaAoSulDe80(A) {
  let j = A / 2;
  while (latitudeDaLinha(j, A) > (-80 * Math.PI) / 180) j += 1;
  return j;
}

// ------------------------------------------------------------
// A colcha na esfera (E3.3)
// ------------------------------------------------------------

const MUNDO_DA_COLCHA = { L: 512, A: 256, raioM: 606e3 }; // 7,5 km por texel: o retalho de 140 km tem 19 texels
// as origens dos retalhos: só esta caixa é "medida"; o alvo é a esfera inteira
const CAIXA_DAS_FONTES = { lon: [0, 150], lat: [-45, 45] };

/**
 * A colcha, calculada uma vez. A textura-fonte conhecida é a parte fina do
 * ruído das oitavas — as duas bandas de σ ≤ 30 km, 100 m de desvio cada —, um
 * campo estacionário: o que a colcha entrega no corte tem de ter a inclinação
 * da fonte em toda parte. Uma unidade só, de peso 1.
 */
let colchada = null;
function aColcha() {
  if (colchada) return colchada;
  const { L, A, raioM } = MUNDO_DA_COLCHA;
  const n = L * A;
  const sigmas = sigmasDasOitavas(raioM, A);
  const fina = somaDeOitavas([0, 1].map((k) => ruidoDaOitava(31, k, sigmas, L, A, raioM)), [100, 100], n);
  const fonte = { unidades: { a: { fontes: [CAIXA_DAS_FONTES] } } };
  const valido = mascaraDaCaixa(CAIXA_DAS_FONTES, L, A);
  const fontes = fontesDaColcha({ metros: fina, valido, fonte, largura: L, altura: A, raioM });
  const entrada = {
    fina, coef: coeficientesDeSpline(fina, L, A), largura: L, altura: A, raioM,
    pesos: [new Float32Array(n).fill(1)], fontes, semente: 4242,
  };
  colchada = { entrada, r: colcha(entrada) };
  return colchada;
}

/**
 * A correlação cruzada normalizada MÁXIMA do `molde` (w×w, w ímpar) contra as
 * janelas de `campo` (L×A, com a volta da longitude) cujo centro está em `onde`.
 */
function correlacaoMaxima(campo, L, A, molde, w, onde) {
  const meia = (w - 1) / 2;
  const media = molde.reduce((s, v) => s + v, 0) / molde.length;
  const m = Float64Array.from(molde, (v) => v - media);
  const normaM = Math.sqrt(m.reduce((s, v) => s + v * v, 0));
  let maior = -1;
  for (let j = 0; j + w <= A; j += 1) {
    for (let i = 0; i < L; i += 1) {
      if (!onde[(j + meia) * L + ((i + meia) % L)]) continue;
      let soma = 0;
      let soma2 = 0;
      let cruzada = 0;
      for (let b = 0; b < w; b += 1) {
        for (let a = 0; a < w; a += 1) {
          const v = campo[(j + b) * L + ((i + a) % L)];
          soma += v;
          soma2 += v * v;
          cruzada += v * m[b * w + a];
        }
      }
      const variancia = soma2 - (soma * soma) / (w * w);
      if (variancia > 0) maior = Math.max(maior, cruzada / (normaM * Math.sqrt(variancia)));
    }
  }
  return maior;
}

describe('a colcha — retalhos do medido copiados por rotação da esfera', () => {
  // a colcha custa ~0,5 s aqui; na máquina do GitHub, mais: sai uma vez, fora do limite de 5 s de cada `it`
  beforeAll(() => {
    aColcha();
  }, 120_000);

  it('dá os mesmos bytes com as mesmas entradas e a mesma semente — e outros com outra semente', () => {
    const { entrada, r } = aColcha();
    const outra = colcha(entrada);
    for (const nome of ['campo', 'coberto', 'corte']) {
      expect(Buffer.from(outra[nome].buffer).equals(Buffer.from(r[nome].buffer))).toBe(true);
    }
    expect(outra.retalhos).toEqual(r.retalhos);
    const diferente = colcha({ ...entrada, semente: entrada.semente + 1 });
    expect(Buffer.from(diferente.campo.buffer).equals(Buffer.from(r.campo.buffer))).toBe(false);
  }, 60_000);

  it('não tem emenda visível: a inclinação nos texels do corte é a dos demais (RMS e p99 ±20 %)', () => {
    const { L, A, raioM } = MUNDO_DA_COLCHA;
    const { r } = aColcha();
    const g = declive(r.campo, L, A, raioM);
    const noCorte = [];
    const nosOutros = [];
    for (let j = 0; j < A; j += 1) {
      // até 80°: acima, `declive` prende o passo leste e a inclinação lida passa a depender da latitude,
      // que não se distribui igual nos dois grupos
      if (Math.abs(latitudeDaLinha(j, A)) > (80 * Math.PI) / 180) continue;
      for (let i = 0; i < L; i += 1) (r.corte[j * L + i] ? noCorte : nosOutros).push(g[j * L + i]);
    }
    // sem texels de corte (ou quase) a razão não diria nada
    expect(noCorte.length).toBeGreaterThan(5000);
    expect(nosOutros.length).toBeGreaterThan(noCorte.length);
    const corte = resumo(noCorte);
    const outros = resumo(nosOutros);
    expect(corte.rms / outros.rms).toBeGreaterThanOrEqual(0.8);
    expect(corte.rms / outros.rms).toBeLessThanOrEqual(1.2);
    expect(corte.p99 / outros.p99).toBeGreaterThanOrEqual(0.8);
    expect(corte.p99 / outros.p99).toBeLessThanOrEqual(1.2);
  });

  it('não repete origem: dois retalhos a menos de 3 larguras não saem de origens a menos de ¼ de largura', () => {
    const { raioM } = MUNDO_DA_COLCHA;
    const { r } = aColcha();
    const { larguraKm } = r.resumo;
    const cosVizinhanca = Math.cos((3 * larguraKm) / (raioM / 1000));
    const cosRepeticao = Math.cos((0.25 * larguraKm) / (raioM / 1000));
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    // os pares de retalhos vizinhos no alvo e, entre eles, os de origem repetida (`origens[q]` é a do retalho q)
    const conta = (origens) => {
      let vizinhos = 0;
      let repetidos = 0;
      r.retalhos.forEach((p, a) => {
        for (let b = a + 1; b < r.retalhos.length; b += 1) {
          if (dot(p.alvo, r.retalhos[b].alvo) <= cosVizinhanca) continue;
          vizinhos += 1;
          if (dot(origens[a], origens[b]) > cosRepeticao) repetidos += 1;
        }
      });
      return { vizinhos, repetidos };
    };
    const origens = r.retalhos.map((p) => p.origem);
    const { vizinhos, repetidos } = conta(origens);
    expect(vizinhos).toBeGreaterThan(5000);
    expect(repetidos).toBe(0);
    expect(r.resumo.repeticoesForcadas).toBe(0);
    // o controle: as mesmas origens trocadas de retalho ao acaso — sem a regra, é isto que sairia
    const sorteia = gerador(7);
    const embaralhadas = Array.from(origens);
    for (let q = embaralhadas.length - 1; q > 0; q -= 1) {
      const s = Math.floor(sorteia() * (q + 1));
      [embaralhadas[q], embaralhadas[s]] = [embaralhadas[s], embaralhadas[q]];
    }
    expect(conta(embaralhadas).repetidos).toBeGreaterThan(10);
  });

  it('não vaza o recorte escondido (`ocultar`): nenhuma janela da saída repete o padrão dele, e a saída nem depende dele', () => {
    const { L, A, raioM } = MUNDO;
    const n = L * A;
    // o medido: textura de espectro realista em toda parte; na caixa escondida, um padrão distinto
    // (ruído branco de 5 km de desvio — nada na textura se parece com ele)
    const fundo = somaDeOitavas(
      Array.from({ length: SIGMAS.length + 1 }, (_, k) => ruidoDaOitava(11, k, SIGMAS, L, A, raioM)),
      GANHOS,
      n
    );
    const ocultar = mascaraDaCaixa({ lon: [45, 135], lat: [-20, 30] }, L, A);
    const comRecorte = (padrao) => {
      const metros = Float32Array.from(fundo);
      for (let k = 0; k < n; k += 1) if (ocultar[k]) metros[k] = padrao[k];
      return metros;
    };
    const padrao = ruidoBranco(n, 5000, 99);
    const metros = comRecorte(padrao);
    const fonte = {
      unidades: { a: { poligonos: [], fontes: [{ lon: [0, 360], lat: [-90, 90] }] } },
      padraoDoSul: { unidade: 'a', abaixoDaLatitude: -60 },
    };
    const medidas = {
      global: { alturaMedia: 0 },
      unidades: {
        a: {
          alturaMedia: null,
          crateras: { contadas: 0, areaKm2: 4e4, completudeKm: 4, inclinacaoAbaixo: { valor: -2, n: 25 } }, // sem crateras
          energiaPorBanda: GANHOS.map((g) => g * g),
        },
      },
      morfometria: { perfis: {} },
    };
    const sintetiza = (m) =>
      sintetizaCorpo({
        grade: { metros: m, vazio: new Uint8Array(n), largura: L, altura: A, raioM },
        fonte, medidas, qualidade: null, catalogo: [], guia: {}, semente: 5, ocultar,
      });
    const { campo, relatorio } = sintetiza(metros);
    // o recorte tem mais de 2000 texels: a unidade ganha núcleo e a conferência com a calibração também roda
    expect(relatorio.texelsOcultos).toBeGreaterThan(2000);
    expect(relatorio.naoFinitos).toBe(0);

    // o molde: a janela de 15×15 do padrão no centro do recorte; a cópia direta o reproduz (correlação 1),
    // e a saída, em toda janela centrada no recorte, fica longe do limiar
    const w = 15;
    const j0 = Math.round(linhaDaLatitude(5, A)) - (w - 1) / 2;
    const i0 = Math.round(colunaDaLongitude(90, L)) - (w - 1) / 2;
    const molde = new Float32Array(w * w);
    for (let b = 0; b < w; b += 1) for (let a = 0; a < w; a += 1) molde[b * w + a] = padrao[(j0 + b) * L + i0 + a];
    const LIMIAR = 0.5;
    expect(correlacaoMaxima(metros, L, A, molde, w, ocultar)).toBeGreaterThan(LIMIAR);
    expect(correlacaoMaxima(campo, L, A, molde, w, ocultar)).toBeLessThan(LIMIAR);

    // e nenhum byte da saída depende do que estava no recorte
    const outro = sintetiza(comRecorte(ruidoBranco(n, 9000, 123))).campo;
    expect(Buffer.from(outro.buffer).equals(Buffer.from(campo.buffer))).toBe(true);
  }, 60_000);

  it('amostra, no plano tangente de cada polo e em qualquer giro e espelho, o valor do campo analítico', () => {
    const L = 128;
    const A = 64;
    const raioKm = 606;
    // suave na esfera (polinômio em x, y, z), com ondas de m = 0, 1 e 2 em longitude: m = 1 pede a meia volta
    // da reflexão no polo; m = 2 é a que um polo mal tratado vira cata-vento
    const f = (x, y, z) => 500 * z + 300 * x - 200 * y + 400 * (x * x - y * y) + 250 * x * y;
    const campo = new Float32Array(L * A);
    for (let j = 0; j < A; j += 1) {
      const lat = latitudeDaLinha(j, A);
      for (let i = 0; i < L; i += 1) {
        const lon = (longitudeDaColuna(i, L) * Math.PI) / 180;
        campo[j * L + i] = f(Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat));
      }
    }
    const coef = coeficientesDeSpline(campo, L, A);
    // o erro da bilinear com passo h (rad) nos dois eixos: ≤ (h²/8)(|f_φφ| + |f_λλ|), e cada termo do campo tem as
    // duas segundas derivadas somando no máximo 6 vezes o coeficiente (x² − y²: 2 + 4)
    const h = Math.PI / A;
    const tolerancia = ((h * h) / 8) * 6 * (500 + 300 + 200 + 400 + 250);
    const passoKm = (raioKm * h) / 2;
    let pior = 0;
    let pontos = 0;
    for (const lat of [90, -90]) {
      for (const giro of [0, 0.7, 2.1, 4]) {
        for (const espelho of [false, true]) {
          const base = planoTangente(lat, 37, giro, espelho);
          // 13×13 pontos em volta do polo (até 3 texels), com o próprio polo (0, 0) e a travessia dele
          for (let b = -6; b <= 6; b += 1) {
            for (let a = -6; a <= 6; a += 1) {
              const p = pontoDoPlano(base, a * passoKm, b * passoKm, raioKm);
              pior = Math.max(pior, Math.abs(amostraNoPonto(coef, L, A, p[0], p[1], p[2]) - f(p[0], p[1], p[2])));
              pontos += 1;
            }
          }
        }
      }
    }
    expect(pontos).toBe(2 * 4 * 2 * 13 * 13);
    expect(pior).toBeLessThan(tolerancia);
  });
});

describe('as medidas sem o recorte escondido (E4)', () => {
  it('não leem o que se exclui (`excluir`): outro relevo e outras crateras no recorte dão as mesmas medidas', () => {
    const { L, A, raioM } = MUNDO;
    const n = L * A;
    const fundo = somaDeOitavas(
      Array.from({ length: SIGMAS.length + 1 }, (_, k) => ruidoDaOitava(11, k, SIGMAS, L, A, raioM)),
      GANHOS,
      n
    );
    const vazio = mascaraDaCaixa({ lon: [200, 300], lat: [-70, 70] }, L, A);
    const caixa = { lon: [30, 150], lat: [-40, 50] };
    const recorte = { lon: [60, 120], lat: [-15, 25] };
    const excluir = mascaraDaCaixa(recorte, L, A);
    const unidades = {
      a: { papel: 'planalto-aspero', exemplo: caixa },
      b: { papel: 'planicie-lisa', exemplo: { lon: [310, 360], lat: [-30, 30] } },
    };
    const guia = { 1: { completudeKm: 20 } };
    const cratera = (id, lat, lon, dKm) => ({ id, lat, lon, dKm, confianca: 4, regiao: 1 });
    const fora = [cratera('f1', 40, 45, 60), cratera('f2', -30, 140, 90), cratera('f3', 0, 330, 40), cratera('f4', 10, 250, 70)];
    const mede = (metros, crateras) =>
      medeLadoMedido({
        grade: { metros, vazio, largura: L, altura: A, raioM },
        unidades,
        crateras,
        guia,
        ro21: [],
        opcoes: { excluir, criadoEm: 'fixo' },
      });
    const a = mede(fundo, fora);
    const outro = Float32Array.from(fundo);
    const lixo = ruidoBranco(n, 9000, 77);
    for (let k = 0; k < n; k += 1) if (excluir[k]) outro[k] = lixo[k];
    const b = mede(outro, [...fora, cratera('d1', 5, 90, 150), cratera('d2', 20, 70, 45)]);

    expect(JSON.stringify(b.medidas)).toBe(JSON.stringify(a.medidas));
    a.qualidade.planos.forEach((p, q) => {
      expect(Buffer.from(b.qualidade.planos[q].buffer).equals(Buffer.from(p.buffer))).toBe(true);
    });
    // e a exclusão morde: a área das crateras da caixa perde o recorte, e só as duas de fora contam
    const area = (c) => areaDaCaixaKm2(c, raioM / 1000);
    expect(a.medidas.unidades.a.crateras.areaKm2 / (area(caixa) - area(recorte))).toBeCloseTo(1, 1);
    expect(a.medidas.unidades.a.crateras.contadas).toBe(2);
  }, 60_000);
});
