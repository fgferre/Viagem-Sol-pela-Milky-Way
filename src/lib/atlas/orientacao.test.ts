// ============================================================
// Porte dos testes de CONTRATO de bodyOrientation.test.ts do doador
// (atlas-orbital), julgando orientacao.ts puro — sem cena, sem three.
//
// FICA DE FORA, declarado:
//  - Mesh/textura (seam u=0,5 da SphereGeometry, correlação dos mapas
//    da Terra): exige three e a cena — vai com a Onda 6, junto com o
//    adaptador Y-up que consome baseCorpoEquatorial.
//  - Cassini polo-vs-normal-da-órbita (20 luas): o risco que ele
//    guardava no doador (transcrição MANUAL de α₀/δ₀ de tabela em PDF)
//    mudou de natureza aqui — iauOrientation.ts regenera
//    máquina→máquina do pck00011 e foi conferido contra o doador a
//    1e-12 (cabeçalho de lá); polo+W seguem julgados contra o JPL em
//    subSolarPoint.test.ts, corpo a corpo.
//
// ADAPTAÇÃO DECLARADA: o doador lia o meridiano da orientação
// RENDERIZADA (quaternion + rotation.y); a casa lê de
// direcaoMeridianoPrimo, que é o mesmo caminho completo base+spin em
// equatorial puro — um erro de sinal em qualquer elo aparece no gate.
// ============================================================

import { describe, expect, it } from 'vitest';
import type { IauOrientation } from './iauOrientation';
import { IAU_ORIENTATIONS } from './iauOrientation';
import {
  baseCorpoEquatorial,
  computeSpinAngleRad,
  direcaoMeridianoPrimo,
  resolveIauOrientation,
} from './orientacao';
import {
  DAYS_PER_JULIAN_CENTURY,
  dateToJD,
  dateToTDB,
  greenwichMeanSiderealTimeDeg,
  J2000_JD,
} from './time';

const EARTH = IAU_ORIENTATIONS.earth;
const MARS = IAU_ORIENTATIONS.mars;
const NEPTUNE = IAU_ORIENTATIONS.neptune;
const PHOBOS = IAU_ORIENTATIONS.phobos;
const VENUS = IAU_ORIENTATIONS.venus;

const DEG_PARA_RAD = Math.PI / 180;
const RAD_PARA_DEG = 180 / Math.PI;

/** RA (graus, ICRF) do meridiano-primo pelo caminho completo. */
function meridianoPrimoRaDeg(o: IauOrientation, jdTdb: number): number {
  const dir = direcaoMeridianoPrimo(o, jdTdb);
  const ra = Math.atan2(dir[1], dir[0]) * RAD_PARA_DEG;
  return ra < 0 ? ra + 360 : ra;
}

function signedDeltaDeg(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

describe("o spin da Terra contra o tempo sideral médio de Greenwich", () => {
  // J2000.0 como INSTANTE: JD 2451545.0 é TT, então o UT correspondente
  // vem ΔT mais cedo. Este é o único insumo do gate que não deriva do
  // código sob teste.
  const J2000_DELTA_T_SECONDS = 63.83;
  const jdUT_J2000 = J2000_JD - J2000_DELTA_T_SECONDS / 86400;

  /**
   * O gate de primeiro degrau. GMST vem da convenção IERS/IAU de
   * rotação da Terra e não compartilha NENHUMA constante com as tabelas
   * de Archinal — então ele FALSIFICA um W₀ transcrito em vez de
   * confirmá-lo.
   *
   * Roda em J2000.0 e não numa data moderna, e isso é deliberado
   * (comentário herdado do doador, verbatim em substância): a forma
   * "2026" não passa a 0,1° nem para um modelo CORRETO — GMST é
   * referido ao equinócio MÉDIO DA DATA e o W IAU ao ICRF, e a
   * precessão em ascensão reta separa os dois frames em 0,34° já em
   * 2026. Fechar isso importaria um polinômio de precessão IAU 2006 —
   * um bloco novo de constantes sem fonte dentro de uma onda cujo risco
   * declarado É constante sem fonte. Em J2000 os dois frames coincidem
   * por construção, a tolerância continua estrutural (os dois controles
   * negativos abaixo) e o Ẇ é cobrado à parte contra a taxa do GMST.
   *
   * Resíduo medido ~0,047°: o modelo IAU da Terra é deliberadamente
   * grosso, não erro de transcrição.
   */
  it('põe o meridiano-primo a menos de 0,1° do GMST em J2000.0', () => {
    const pmRa = meridianoPrimoRaDeg(EARTH, J2000_JD);
    const gmst = greenwichMeanSiderealTimeDeg(jdUT_J2000);
    expect(Math.abs(signedDeltaDeg(pmRa, gmst))).toBeLessThan(0.1);
  });

  /**
   * Os dois testes abaixo são POR QUE a tolerância de 0,1° não pode
   * ser afrouxada: ΔT é 0,27° de rotação da Terra em J2000 (~0,30° em
   * 2026), então um limiar de 0,5° aceitaria as DUAS combinações
   * erradas de escala de tempo que o gate existe para rejeitar.
   */
  it('rejeita GMST avaliado numa data TDB em vez de UT', () => {
    const pmRa = meridianoPrimoRaDeg(EARTH, J2000_JD);
    const errado = greenwichMeanSiderealTimeDeg(J2000_JD);
    expect(Math.abs(signedDeltaDeg(pmRa, errado))).toBeGreaterThan(0.1);
  });

  it('rejeita spin dirigido por contagem de dias UT em vez de TDB', () => {
    const pmRa = meridianoPrimoRaDeg(EARTH, jdUT_J2000);
    const gmst = greenwichMeanSiderealTimeDeg(jdUT_J2000);
    expect(Math.abs(signedDeltaDeg(pmRa, gmst))).toBeGreaterThan(0.1);
  });

  /**
   * A TAXA, que um gate de época única não enxerga. O Ẇ IAU da Terra é
   * taxa referida ao ICRF e o coeficiente linear do GMST é a mesma taxa
   * mais a precessão em RA (~3,5e-5°/dia) — os dois têm de concordar
   * bem dentro de 1e-4°/dia. Um dígito transposto em qualquer uma das
   * seis primeiras casas de 360.9856235 quebra isto.
   */
  it('gira na taxa sideral que o GMST implica independentemente', () => {
    const porDia =
      (computeSpinAngleRad(EARTH, J2000_JD + 1) -
        computeSpinAngleRad(EARTH, J2000_JD)) *
      RAD_PARA_DEG;
    const gmstPorDia =
      greenwichMeanSiderealTimeDeg(J2000_JD + 1) -
      greenwichMeanSiderealTimeDeg(J2000_JD) +
      360;
    expect(Math.abs(porDia - gmstPorDia)).toBeLessThan(1e-4);
  });

  it('UT alimenta o GMST e TDB alimenta o spin, a partir de um só Date', () => {
    // Guarda a FIAÇÃO que o runtime usa, não só a matemática acima:
    // dateToJD e dateToTDB (time.ts, conversor único da regra M6) têm
    // de permanecer em lados opostos deste gate.
    const date = new Date('2026-03-20T12:00:00Z');
    expect(dateToTDB(date) - dateToJD(date)).toBeGreaterThan(60 / 86400);
  });
});

describe('convenção de sinal sin/cos dos termos periódicos', () => {
  /**
   * Marte e Netuno são os corpos cujos termos periódicos são grandes o
   * bastante para ver, e ambos carregavam no catálogo do doador um polo
   * arredondado vindo de fonte INDEPENDENTE das tabelas — reproduzir
   * aqueles números a partir dos termos seculares MAIS os periódicos
   * confirma a convenção sin/cos por fora: uma convenção trocada
   * desloca a declinação de Marte 3,1° e a de Netuno 1,0°.
   */
  it('reproduz os valores de polo que o catálogo do doador carregava', () => {
    const mars = resolveIauOrientation(MARS, J2000_JD);
    const neptune = resolveIauOrientation(NEPTUNE, J2000_JD);

    expect(mars.raDeg).toBeCloseTo(317.68, 1);
    expect(mars.decDeg).toBeCloseTo(52.89, 1);
    expect(neptune.decDeg).toBeCloseTo(42.95, 1);
  });

  /**
   * O controle negativo que aplica a troca DE PROPÓSITO: avaliar a
   * declinação com A·sin θ (a convenção errada) tem de errar o polo
   * histórico de Marte por mais de 1° — se este teste falhar, o de
   * cima passou por coincidência e o gate está cego.
   */
  it('a convenção trocada (δ com sin) erra o polo de Marte por > 1°', () => {
    const T = 0; // J2000
    let decTrocada = MARS.poleDecDeg + (MARS.poleDecRateDegPerCentury ?? 0) * T;
    for (const term of MARS.nutPrec ?? []) {
      if (!term.decAmpDeg) continue;
      let deg = term.phaseDeg + term.rateDegPerCentury * T;
      if (term.rateDegPerCentury2) deg += term.rateDegPerCentury2 * T * T;
      decTrocada += term.decAmpDeg * Math.sin(deg * DEG_PARA_RAD); // TROCA
    }
    expect(Math.abs(decTrocada - 52.89)).toBeGreaterThan(1);
  });
});

describe('a quebra de unidade do kernel: polo por SÉCULO, spin por DIA', () => {
  /**
   * Registro sintético que isola as duas escalas. Confundir século com
   * dia move um corpo por fator 36.525 — grande demais para depender só
   * dos oráculos compostos.
   */
  const sintetico: IauOrientation = {
    poleRaDeg: 10,
    poleRaRateDegPerCentury: 1,
    poleDecDeg: 0,
    primeMeridianDeg: 0,
    spinRateDegPerDay: 1,
  };

  it('após 36.525 dias: α avançou 1° (1 século) e W avançou 36.525°', () => {
    const jd = J2000_JD + DAYS_PER_JULIAN_CENTURY;
    const { raDeg, wDeg } = resolveIauOrientation(sintetico, jd);
    expect(raDeg).toBeCloseTo(11, 12);
    expect(wDeg).toBeCloseTo(DAYS_PER_JULIAN_CENTURY, 9);
  });
});

describe('o ângulo de spin é desenrolado', () => {
  /**
   * Cicatriz 2 do módulo: o deck de nuvens do doador é desenhado a
   * spin×1,03; num ângulo ENROLADO esse multiply cai numa
   * descontinuidade de (1,03−1)×360° ≈ 10,8° a cada volta. Amostrar
   * através de uma fronteira de volta é a coisa mais barata que falha
   * se alguém reintroduzir um % 360.
   */
  it('cresce monotônico através de uma volta completa, e o multiply de taxa fica suave', () => {
    const amostras = Array.from({ length: 64 }, (_, i) =>
      computeSpinAngleRad(EARTH, J2000_JD + i / 32)
    );
    for (let i = 1; i < amostras.length; i++) {
      expect(amostras[i]).toBeGreaterThan(amostras[i - 1]!);
    }
    const nuvem = amostras.map((s) => s * 1.03);
    const passos = nuvem.slice(1).map((c, i) => c - nuvem[i]!);
    const max = Math.max(...passos);
    const min = Math.min(...passos);
    expect(max - min).toBeLessThan(1e-9);
  });

  it('anda para trás num rotor retrógrado (Vênus)', () => {
    expect(computeSpinAngleRad(VENUS, J2000_JD + 1)).toBeLessThan(
      computeSpinAngleRad(VENUS, J2000_JD)
    );
  });
});

describe('Fobos: o termo acelerado e o Ẅ secular', () => {
  it('embarca os dois coeficientes exatos do kernel', () => {
    // Guarda de transcrição barata: os dois números que fazem Fobos
    // especial, verbatim do pck00011 via derive-iau-orientation.js.
    expect(PHOBOS.spinAccelDegPerDay2).toBe(9.536137031212154e-9);
    const acelerado = (PHOBOS.nutPrec ?? []).find(
      (t) => t.pmAmpDeg === -1.143
    );
    if (!acelerado) throw new Error('Fobos perdeu o termo acelerado −1,143°');
    expect(acelerado.rateDegPerCentury2).toBeCloseTo(12.711923222, 9);
  });

  it('spinAccel: 9,5e-9°/dia² parece ruído e é ~12,7° de meridiano por século', () => {
    const d = DAYS_PER_JULIAN_CENTURY;
    const jd = J2000_JD + d;
    const semAccel: IauOrientation = {
      ...PHOBOS,
      spinAccelDegPerDay2: undefined,
    };
    const delta =
      resolveIauOrientation(PHOBOS, jd).wDeg -
      resolveIauOrientation(semAccel, jd).wDeg;
    // Forma fechada Ẅ·d² — prova que o campo é consumido em d² (dias),
    // não em T² nem ignorado.
    expect(delta).toBeCloseTo(9.536137031212154e-9 * d * d, 6);
    expect(delta).toBeGreaterThan(12);
    expect(delta).toBeLessThan(13);
  });

  it('o termo −1,143° usa o argumento QUADRÁTICO (taxa₂·T²)', () => {
    const T = 0.5; // 50 anos — o T² já rende ~3,2° de argumento
    const jd = J2000_JD + T * DAYS_PER_JULIAN_CENTURY;
    const alvo = (PHOBOS.nutPrec ?? []).find((t) => t.pmAmpDeg === -1.143);
    if (!alvo) throw new Error('Fobos perdeu o termo acelerado −1,143°');

    const semQuadratico: IauOrientation = {
      ...PHOBOS,
      nutPrec: (PHOBOS.nutPrec ?? []).map((t) =>
        t === alvo ? { ...t, rateDegPerCentury2: undefined } : t
      ),
    };
    const delta =
      resolveIauOrientation(PHOBOS, jd).wDeg -
      resolveIauOrientation(semQuadratico, jd).wDeg;

    const thetaLinearDeg = alvo.phaseDeg + alvo.rateDegPerCentury * T;
    const esperado =
      alvo.pmAmpDeg! *
      (Math.sin((thetaLinearDeg + alvo.rateDegPerCentury2! * T * T) * DEG_PARA_RAD) -
        Math.sin(thetaLinearDeg * DEG_PARA_RAD));
    // Tolerância ditada pelo float64, não pelo modelo: o delta é a
    // DIFERENÇA de dois W desenrolados de ~2,1e7° (ulp ≈ 3,7e-9°),
    // então carrega ~7e-9° de arredondamento legítimo. 5e-8 fica uma
    // ordem acima disso e cinco ordens abaixo do efeito (~2,2e-2°).
    expect(delta).toBeCloseTo(esperado, 7);
    // E o efeito é real, não zero por coincidência de fase.
    expect(Math.abs(delta)).toBeGreaterThan(1e-3);
  });
});

describe('a base do corpo', () => {
  it('é ortonormal e dextrógira para TODOS os corpos embarcados', () => {
    for (const [id, o] of Object.entries(IAU_ORIENTATIONS)) {
      const { nodoQ, lesteDeQ, polo } = baseCorpoEquatorial(o, J2000_JD);
      // det[x̂ ŷ ẑ] = x̂·(ŷ×ẑ); a guarda interna já lançaria, mas o
      // teste documenta o contrato por corpo e imprime QUAL falhou.
      const det =
        nodoQ[0] * (lesteDeQ[1] * polo[2] - lesteDeQ[2] * polo[1]) +
        nodoQ[1] * (lesteDeQ[2] * polo[0] - lesteDeQ[0] * polo[2]) +
        nodoQ[2] * (lesteDeQ[0] * polo[1] - lesteDeQ[1] * polo[0]);
      expect(det, `base degenerada para "${id}"`).toBeCloseTo(1, 12);
    }
  });

  it('aponta o polo da Terra para δ = 90° em J2000 (polo ICRF)', () => {
    const { polo } = baseCorpoEquatorial(EARTH, J2000_JD);
    const decDeg = Math.asin(polo[2]) * RAD_PARA_DEG;
    expect(decDeg).toBeCloseTo(90, 3);
  });
});
