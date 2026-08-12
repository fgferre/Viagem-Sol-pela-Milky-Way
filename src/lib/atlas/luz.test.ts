// ============================================================
// Oráculos da lei de luz — a régua que autorizou `luz.ts`.
//
// PROVENIÊNCIA (teste/oráculo migra, PLANO-ATLAS §0.2 categoria 1):
// traduzidos do atlas-orbital `src/lib/graphics/solarIrradiance.test.ts`
// em 2026-08-12, com os valores numéricos do doador copiados EXATOS
// (10.4058 ±1e-3; 1/900 ±1e-9; 2.27; 1/10.8; razão < 30; quarteio a
// 12 casas). O código julgado é implementação nova da casa; estes
// números valem independentemente de quem escreveu o código.
//
// ADAPTAÇÕES DECLARADAS:
// - a política `compensated` do doador morreu na travessia (D2: a
//   casa só tem real|assistida) — os describes dela não vieram;
// - singleton de política, flag de tone mapping e o teto
//   SUNLIGHT_UNMAPPED_CEILING não existem aqui (o teto era guarda da
//   pipeline do doador — anti-padrão 4; a relação bloom×superfície da
//   casa é calibração da F2a com o gate &nobloom, não teto na lib);
// - "recusa distância de render" ganhou o lado da CASA: aqui a cena
//   mede em pc, o chamador errado entra ABAIXO do clamp e recebe o
//   PISO E = 400 uniforme — o teste cobre os DOIS lados;
// - o oráculo Europa/Júpiter (distância da efeméride, não do
//   semi-eixo — razão ≈ 1 a ±1e-2) é contrato de CHAMADOR e entra na
//   F2 quando existir o consumidor que compõe a cadeia; sem
//   consumidor não há o que julgar nesta fase;
// - novos da casa (sem par no doador): identidade bit a bit
//   fundido===E via Object.is, −Inf neutro, e os três oráculos de
//   deslocamentoEVAssistida (sinal, âncora +0, coerência 2^ΔEV·E=E^σ).
// ============================================================
import { describe, expect, it } from "vitest";

import {
  ANCORA_UA,
  MAX_UA,
  MIN_UA,
  SIGMA_ASSISTIDA,
  deslocamentoEVAssistida,
  ganhoFundido,
  irradianciaRelativa,
} from "./luz";

/**
 * A lista de distâncias do doador — uma por regime (Mercúrio no
 * periélio, Vênus, âncora, Marte, Júpiter, Saturno, Urano, Netuno e
 * um TNO distante), reutilizada pelos oráculos de ordenação e de
 * identidade.
 */
const DISTANCIAS_UA = [0.31, 0.72, 1, 1.52, 5.2, 9.6, 19.2, 30, 500];

describe("irradianciaRelativa", () => {
  it("vale 1,0 na âncora, exato", () => {
    // A âncora é RELATIVA e PROVISÓRIA (correção de fato 6 do desenho):
    // o que se pina é só que 1 UA lê como referência, para a lei ser
    // redistribuição e não edição global de brilho. Se a radiometria
    // absoluta fechar um dia, esta expectativa move COM a constante.
    expect(irradianciaRelativa(ANCORA_UA)).toBe(1);
    expect(irradianciaRelativa(1)).toBe(1);
  });

  it("segue o inverso do quadrado na extensão do Sistema Solar", () => {
    // Mercúrio perto do periélio e Netuno — as duas pontas que o
    // plano nomeia. Valores do doador, exatos.
    expect(irradianciaRelativa(0.31)).toBeCloseTo(10.4058, 3);
    expect(irradianciaRelativa(30)).toBeCloseTo(1 / 900, 9);
  });

  it("quarteia a cada dobro, em qualquer distância", () => {
    // A propriedade, não três pontos amostrados: é o que faz disto
    // uma lei em vez de uma tabela.
    for (const d of [0.4, 1, 5.2, 9.6, 19.2]) {
      expect(irradianciaRelativa(2 * d)).toBeCloseTo(
        irradianciaRelativa(d) / 4,
        12
      );
    }
  });

  it("clampa em vez de dividir por zero na distância do próprio Sol", () => {
    // A distância heliocêntrica do Sol é 0 exato e o Sol está no
    // catálogo — 1/d² sem clamp é alcançável, não teórico.
    expect(Number.isFinite(irradianciaRelativa(0))).toBe(true);
    expect(irradianciaRelativa(0)).toBe(irradianciaRelativa(MIN_UA));
  });

  it("devolve neutro, nunca NaN, para entrada não-finita", () => {
    // NaN no uniform pinta o corpo de preto sem erro em lugar nenhum —
    // o pior modo de falha de um termo fotométrico.
    expect(irradianciaRelativa(Number.NaN)).toBe(1);
    expect(irradianciaRelativa(Number.POSITIVE_INFINITY)).toBe(1);
    expect(irradianciaRelativa(Number.NEGATIVE_INFINITY)).toBe(1);
  });

  it("recusa distância de render por CIMA — o lado do doador", () => {
    // No doador o espaço didático corria até 3200 unidades: o chamador
    // errado estourava o teto e caía num preto uniforme e limitado.
    const capDidaticoDoDoador = 3200;
    expect(capDidaticoDoDoador).toBeGreaterThan(MAX_UA);
    expect(irradianciaRelativa(capDidaticoDoDoador)).toBe(
      irradianciaRelativa(MAX_UA)
    );
  });

  it("recusa distância de render por BAIXO — o lado da CASA", () => {
    // A cena da casa mede em PARSEC: os corpos vivem em 1e-6–1,5e-4 pc.
    // Um chamador que passar coordenada de mundo entra ABAIXO do clamp
    // e recebe o PISO E = 400 — o máximo, uniforme para todos os
    // corpos, nunca plausível: todo planeta igualmente estourado de
    // luz denuncia o bug na primeira vista.
    expect(1.72e-4).toBeLessThan(MIN_UA);
    expect(irradianciaRelativa(1e-6)).toBe(400);
    expect(irradianciaRelativa(1.72e-4)).toBe(400);
    expect(irradianciaRelativa(1e-6)).toBe(irradianciaRelativa(MIN_UA));
  });
});

describe("ganhoFundido — política 'real'", () => {
  it("É a irradiância, bit a bit — identidade via Object.is", () => {
    // O modo sem assistência é pinado por teste, não por copy de UI.
    // NUNCA "ganho = 1": um fundido que devolvesse 1 apagaria o 1/d²
    // — o anti-padrão 1 reencarnado, que este oráculo torna
    // impossível. `toBe`/`toBeCloseTo` seriam afirmações mais fracas
    // que "não tocamos no número": Object.is é a identidade IEEE-754.
    for (const d of DISTANCIAS_UA) {
      expect(Object.is(ganhoFundido(d, "real"), irradianciaRelativa(d))).toBe(
        true
      );
    }
  });
});

describe("ganhoFundido — política 'assistida'", () => {
  it("é exatamente E^σ, não uma aproximação de um", () => {
    for (const d of [0.31, 1, 5.2, 30]) {
      const e = irradianciaRelativa(d);
      expect(ganhoFundido(d, "assistida")).toBeCloseTo(
        Math.pow(e, SIGMA_ASSISTIDA),
        12
      );
    }
  });

  it("comprime a faixa do Sistema Solar para algo que um display mostra", () => {
    // Os números que justificam o σ escolhido — se o expoente mover
    // na recalibração da F2a, estes movem com ele, de propósito.
    expect(ganhoFundido(0.31, "assistida")).toBeCloseTo(2.27, 2); // real 10,4×
    expect(ganhoFundido(30, "assistida")).toBeCloseTo(1 / 10.8, 3); // real 1/900
    // ~9400:1 de faixa dinâmica real vira ~25:1.
    expect(
      ganhoFundido(0.31, "assistida") / ganhoFundido(30, "assistida")
    ).toBeLessThan(30);
  });

  it("não toca a âncora", () => {
    // 1^σ = 1 para qualquer σ: a âncora é ponto fixo das duas
    // políticas — a propriedade que faz da lei uma redistribuição.
    expect(ganhoFundido(1, "assistida")).toBe(1);
  });

  it("preserva a ordenação verdadeira de brilho — nas DUAS políticas", () => {
    // O que separa compressão honesta de equalização: uma transformada
    // monótona de E ainda responde certo "qual destes dois está mais
    // iluminado, e este mundo está clareando ou escurecendo agora".
    for (const politica of ["real", "assistida"] as const) {
      for (let i = 1; i < DISTANCIAS_UA.length; i += 1) {
        expect(ganhoFundido(DISTANCIAS_UA[i]!, politica)).toBeLessThan(
          ganhoFundido(DISTANCIAS_UA[i - 1]!, politica)
        );
      }
    }
  });
});

describe("deslocamentoEVAssistida — os 'passos de luz' do selo", () => {
  it("é zero exato na âncora — +0, não −0", () => {
    // A conta crua (σ−1)·log2(1) dá −0; a lib normaliza para +0. O
    // selo exibiria "−0 passos" — mentira de meia casa decimal — e
    // Object.is(−0, 0) é false: o toBe pina a normalização.
    expect(deslocamentoEVAssistida(1)).toBe(0);
  });

  it("é POSITIVO além da âncora — o +EV que o gate do plano exige", () => {
    // Netuno: ΔEV = (σ−1)·log2(1/900) = 0,65·log2(900) ≈ +6,379.
    expect(deslocamentoEVAssistida(30)).toBeGreaterThan(0);
    expect(deslocamentoEVAssistida(30)).toBeCloseTo(6.379, 3);
  });

  it("é NEGATIVO aquém da âncora", () => {
    // Mercúrio no periélio cede ~2,2 passos: ΔEV ≈ −2,1966.
    expect(deslocamentoEVAssistida(0.31)).toBeLessThan(0);
    expect(deslocamentoEVAssistida(0.31)).toBeCloseTo(-2.1966, 3);
  });

  it("é coerente com o fundido: 2^ΔEV × E = E^σ a 12 casas", () => {
    // O deslocamento é a MESMA compressão dita em stops, não uma
    // segunda alavanca — a identidade que impede o selo de desmentir
    // o material.
    for (const d of DISTANCIAS_UA) {
      const e = irradianciaRelativa(d);
      expect(Math.pow(2, deslocamentoEVAssistida(d)) * e).toBeCloseTo(
        ganhoFundido(d, "assistida"),
        12
      );
    }
  });
});
