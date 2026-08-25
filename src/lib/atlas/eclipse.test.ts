// ============================================================
// Oráculos do cone de eclipse — a régua que autorizou `eclipse.ts`.
//
// PROVENIÊNCIA (teste/oráculo migra, PLANO-ATLAS §0.2 categoria 1):
// os 14 de `eclipseGeometry.test.ts` + os 7 de `eclipseMath.test.ts`
// do atlas-orbital, traduzidos em 2026-08-12 com os valores numéricos
// do doador copiados EXATOS (umbra +64,9 km; penumbra 3.417,5 km;
// gamma 0,3431; obscuração ~0,905 na banda 0,85–0,97; umbra lunar
// 2,2–3,0 R_lua; Io 69.558/70.343 km do raio MÉDIO 69.911; Danjon
// 10⁻⁴–10⁻³; cobre 0,88/0,42/0,063; fade −0,1/0,2; gate −0,15). O
// código julgado é implementação nova da casa. MAIS os contratos da
// tabela PARES_DE_ECLIPSE, que não têm par no doador (lá a tabela
// vivia espalhada em `eclipsingBodyId` no catálogo).
//
// ADAPTAÇÕES DECLARADAS:
// - POSIÇÕES SINTÉTICAS: o doador recomputa as âncoras dos próprios
//   provedores (ELP/VSOP) em tempo de teste; a casa não tem esses
//   provedores nesta fase. Aqui as posições derivam dos MESMOS
//   parâmetros publicados — as distâncias de instante que o doador
//   recomputou e documentou no cabeçalho de eclipseGeometry.ts
//   (d_se 149.463.545 km, d_er 359.804 km em 2024-04-08T18:18Z), o
//   gamma do catálogo NASA, a magnitude publicada do anular — com a
//   origem de cada número anotada no teste. Consequência dita: o
//   check de gamma vira verificação da DECOMPOSIÇÃO perpendicular
//   (o número entra na construção); o que continua independente é o
//   CARÁTER publicado do evento (total ⇒ umbra POSITIVA; anular ⇒
//   magnitude² ≈ obscuração) emergindo da aritmética de raios, que
//   não é construída para dentro.
// - Os 4 testes de "similarity transform" do doador (modo didático ×
//   realista, THREE, render config) não têm objeto aqui — a casa é
//   1:1 por doutrina, sem segundo modo de escala. Viraram: invariância
//   de similaridade (a propriedade que tornava a transformada do
//   doador válida), o modo de falha pc (o lado da CASA, como em
//   luz.test.ts), a mancha penumbral direto em km e o contrato de
//   clamp do consumidor (umbra negativa clampa; o nível anular vive
//   em minSombra).
// - Io: banda apertada de 1 para 2 casas — as posições sintéticas são
//   determinísticas (sem a variação de amostragem de órbita que o 1%
//   do doador cobria), e a banda apertada agora FALSIFICA o raio
//   equatorial 71.492 km (daria razão 1,023, fora), que a banda do
//   doador deixava passar.
// - Eclipse lunar 2025-03-14: distância da Lua 398.000 km (três dias
//   antes do apogeu de 405.754 km); o oráculo 2,2–3,0 R_lua é
//   insensível a ±20.000 km — ao contrário do caso SOLAR, onde o
//   doador documenta que distância média inverte o sinal da umbra
//   (lá usamos os valores de instante recomputados dele).
// - GLSL: a casa ainda não tem o patch (F2c). Os testes de
//   interpolação do doador (needle nos helpers; variante solar ×
//   Terra em strings de shader) viraram contratos do DADO: derivado-
//   não-redigitado via Object.is e `pisoUmbralDoEclipsador`; o
//   needle-teste do GLSL real é gate da F2c (D3, lição do chunk
//   renomeado).
// - NaN desativa: adição da casa (pauta (a) da revisão da onda —
//   clamps/NaN, precedente c098470/9aff400).
// ============================================================
import { describe, expect, it } from "vitest";

import {
  COR_REFRACAO_LUNAR,
  CORPOS_COM_ANEL,
  EV_OBSERVADOR_ECLIPSE_LUNAR,
  FADE_TERMINADOR_FIM,
  FADE_TERMINADOR_INICIO,
  GANHO_OBSERVADOR_ECLIPSE_LUNAR,
  GATE_LADO_PROXIMO,
  GLSL_SOMBRA_ECLIPSE,
  ILUMINANCIA_SOL_PLENO_LUX,
  ILUMINANCIA_TOTALIDADE_LUX,
  PARES_DE_ECLIPSE,
  PISO_CREPUSCULO_NO_AR,
  PISO_REFRACAO_LUNAR,
  RAIO_SOL_KM,
  criaGeometriaDoCone,
  criaSombraNaCena,
  pisoUmbralDoEclipsador,
  resolveConeDeEclipse,
  resolveSombraNaCena,
  type CorposDoCone,
  type Vetor3Km,
} from "./eclipse";
import { REGISTRO_ORBITAL } from "./registroOrbital";

// Raios de catálogo (radiusKm do doador). O DO SOL vem da lib — fonte
// única desde a F2c, quando o driver nasceu: redigitar aqui seria a
// segunda cópia que o oráculo existe para proibir.
const RAIO_LUA_KM = 1_737;
const RAIO_TERRA_KM = 6_371;
const UA_EM_KM = 149_597_870.7;

const SOLAR: CorposDoCone = {
  raioSolKm: RAIO_SOL_KM,
  raioEclipsadorKm: RAIO_LUA_KM,
  raioReceptorKm: RAIO_TERRA_KM,
};
const LUNAR: CorposDoCone = {
  raioSolKm: RAIO_SOL_KM,
  raioEclipsadorKm: RAIO_TERRA_KM,
  raioReceptorKm: RAIO_LUA_KM,
};

/**
 * Constrói o par de posições sintéticas: eclipsador no eixo +x a
 * `dSolEclipsadorKm`, receptor `dEclipsadorReceptorKm` atrás com
 * desvio perpendicular `desvioKm` do eixo anti-solar. É a geometria
 * dos parâmetros publicados, sem provedor no meio.
 */
const posicoes = (
  dSolEclipsadorKm: number,
  dEclipsadorReceptorKm: number,
  desvioKm: number
): { eclipsador: Vetor3Km; receptor: Vetor3Km } => {
  const aoLongo = Math.sqrt(
    dEclipsadorReceptorKm * dEclipsadorReceptorKm - desvioKm * desvioKm
  );
  return {
    eclipsador: [dSolEclipsadorKm, 0, 0],
    receptor: [dSolEclipsadorKm + aoLongo, desvioKm, 0],
  };
};

const resolve = (
  eclipsador: Vetor3Km,
  receptor: Vetor3Km,
  corpos: CorposDoCone
) => resolveConeDeEclipse(eclipsador, receptor, corpos, criaGeometriaDoCone());

// 2024-04-08T18:18Z: distâncias de INSTANTE recomputadas pelo doador
// (ELP+VSOP, 2026-08-03, cabeçalho de eclipseGeometry.ts) — nunca as
// médias, que invertem o sinal da umbra. Gamma 0,3431 raios TERRESTRES
// EQUATORIAIS (catálogo NASA; a régua do gamma é o raio equatorial
// 6.378 km, não o volumétrico).
const D_SOL_LUA_20240408_KM = 149_463_545;
const D_LUA_TERRA_20240408_KM = 359_804;
const GAMMA_20240408_KM = 0.3431 * 6_378;

describe("âncoras de eclipse solar — a Lua eclipsando a Terra", () => {
  it("2024-04-08T18:18Z é ativo com umbra POSITIVA (o evento renderizou TOTAL)", () => {
    const { eclipsador, receptor } = posicoes(
      D_SOL_LUA_20240408_KM,
      D_LUA_TERRA_20240408_KM,
      GAMMA_20240408_KM
    );
    const out = resolve(eclipsador, receptor, SOLAR);
    expect(out.ativo).toBe(true);
    // O sinal positivo É o teste de falsificação: o primeiro rascunho
    // do doador, com âncoras de distância média, punha a umbra em
    // −50 km e teria desenhado este eclipse total como anular. As
    // distâncias entram na construção; o +64,9 km NÃO entra — emerge
    // da aritmética de raios, e o caráter "total" é o dado publicado.
    expect(out.umbraKm).toBeGreaterThan(0);
    expect(out.umbraKm).toBeLessThan(200);
    // Penumbra 3.417,5 km = 1,968 R_lua no instante (valor do doador).
    expect(out.penumbraKm / 3_417.5).toBeCloseTo(1, 1);
    // Total ⇒ sem piso anular.
    expect(out.minSombra).toBe(0);
  });

  it("a distância ao eixo recupera o gamma publicado — a decomposição perpendicular, não a aritmética do cone", () => {
    // ADAPTAÇÃO: no doador este check era independente dos provedores
    // (posições ELP/VSOP × gamma NASA). Aqui o gamma entra na
    // construção, então o que o teste verifica é que a decomposição
    // eixo/perpendicular do resolve o RECUPERA exato — um eixo mal
    // normalizado ou um sinal trocado (precedente do negate da Onda 5)
    // falha aqui. A banda 2.000–2.400 km é a do doador (gamma 0,3431
    // ≈ 2.188 km; ele observou ≈2.192 km dos provedores).
    const { eclipsador, receptor } = posicoes(
      D_SOL_LUA_20240408_KM,
      D_LUA_TERRA_20240408_KM,
      GAMMA_20240408_KM
    );
    const out = resolve(eclipsador, receptor, SOLAR);
    expect(out.distanciaAoEixoKm).toBeCloseTo(GAMMA_20240408_KM, 6);
    expect(out.distanciaAoEixoKm).toBeGreaterThan(2_000);
    expect(out.distanciaAoEixoKm).toBeLessThan(2_400);
  });

  it("uma lua nova comum longe do nó (2024-05-08) é inativa", () => {
    // Origem dos números: distância média Terra–Lua 384.400 km (o
    // sinal da umbra é irrelevante para ATIVO) e latitude eclíptica
    // ~4° — lua nova típica longe do nó (o máximo é 5,14°; o limite
    // de eclipse fica ~±1,5°). O desvio do eixo ≈ d·sin β ≈ 26.800 km,
    // ~2,7× além do alcance R_terra + penumbra (~9.900 km).
    const desvioKm = 384_400 * Math.sin((4 * Math.PI) / 180);
    const { eclipsador, receptor } = posicoes(
      D_SOL_LUA_20240408_KM,
      384_400,
      desvioKm
    );
    const out = resolve(eclipsador, receptor, SOLAR);
    expect(out.ativo).toBe(false);
  });

  it("2023-10-14 anular: umbra NEGATIVA e o piso casa com a obscuração publicada (~0,905)", () => {
    // Origem dos números: Sol–Terra 0,9977 UA (efeméride de meados de
    // outubro); distância Lua–Terra DERIVADA da magnitude publicada
    // 0,952 do catálogo NASA (θ_lua = 0,952·θ_sol ⇒ ~391.000 km — a
    // Lua perto do apogeu, como no evento real); gamma 0,3765.
    // O que segue independente: a relação publicada magnitude² ≈
    // obscuração (0,952² = 0,906 ≈ 0,905) tem de EMERGIR do piso
    // angular do resolve — ela não é construída para dentro.
    const dSolTerraKm = 0.9977 * UA_EM_KM;
    const thetaSol = RAIO_SOL_KM / dSolTerraKm;
    const dLuaTerraKm = RAIO_LUA_KM / (0.952 * thetaSol);
    const gammaKm = 0.3765 * 6_378;
    const aoLongo = Math.sqrt(dLuaTerraKm ** 2 - gammaKm ** 2);
    const out = resolve(
      [dSolTerraKm - aoLongo, 0, 0],
      [dSolTerraKm, gammaKm, 0],
      SOLAR
    );
    expect(out.ativo).toBe(true);
    expect(out.umbraKm).toBeLessThan(0);
    // Banda do doador (uma casa de folga: o número publicado é do
    // ponto de máximo eclipse, não do instante amostrado lá).
    expect(1 - out.minSombra).toBeGreaterThan(0.85);
    expect(1 - out.minSombra).toBeLessThan(0.97);
    expect(1 - out.minSombra).toBeCloseTo(0.905, 2);
  });
});

describe("âncoras de eclipse lunar — a Terra eclipsando a Lua", () => {
  // Origem dos números: Sol–Terra 0,9945 UA (meados de março); Lua a
  // 398.000 km (2025-03-14 caiu três dias antes do apogeu de
  // 405.754 km; o oráculo é insensível a ±20.000 km — ver cabeçalho);
  // gamma 0,3484 do catálogo NASA.
  const D_SOL_TERRA_20250314_KM = 0.9945 * UA_EM_KM;
  const D_TERRA_LUA_20250314_KM = 398_000;

  it("2025-03-14 total lunar: ativo, a umbra engole a Lua inteira (~2,6 R_lua)", () => {
    const { eclipsador, receptor } = posicoes(
      D_SOL_TERRA_20250314_KM,
      D_TERRA_LUA_20250314_KM,
      0.3484 * 6_378
    );
    const out = resolve(eclipsador, receptor, LUNAR);
    expect(out.ativo).toBe(true);
    const umbraEmRaiosDeLua = out.umbraKm / RAIO_LUA_KM;
    // A umbra da Terra na distância da Lua é ~2,6 R_lua — que é
    // exatamente por que uma umbra ingênua "sombra = 0" renderiza a
    // totalidade PRETA e o piso de refração PISO_REFRACAO_LUNAR
    // existe (o check independente da constante).
    expect(umbraEmRaiosDeLua).toBeGreaterThan(2.2);
    expect(umbraEmRaiosDeLua).toBeLessThan(3.0);
    expect(out.minSombra).toBe(0);
  });

  it("uma lua cheia comum (2024-06-22) é inativa", () => {
    // Latitude eclíptica ~5° (perto do máximo 5,14° — lua cheia bem
    // longe do nó): desvio ≈ 33.500 km, ~3,4× além do alcance
    // R_lua + penumbra (~9.900 km).
    const desvioKm = 384_400 * Math.sin((5 * Math.PI) / 180);
    const { eclipsador, receptor } = posicoes(
      D_SOL_TERRA_20250314_KM,
      384_400,
      desvioKm
    );
    const out = resolve(eclipsador, receptor, LUNAR);
    expect(out.ativo).toBe(false);
  });
});

describe("Io na sombra de Júpiter", () => {
  it("umbra e penumbra na distância de Io saem do raio MÉDIO 69.911 km, não do equatorial 71.492", () => {
    // Origem dos números: Júpiter no semi-eixo 5,2044 UA; Io no raio
    // orbital 421.700 km, posto no eixo da sombra (Io cruza a sombra
    // a cada órbita de 42,5 h — o doador amostrava uma órbita dos
    // provedores; a casa põe o instante do trânsito direto). Âncoras
    // do doador: ~69.558 / ~70.343 km, derivadas do radiusKm 69.911 —
    // o primeiro rascunho dele usou o equatorial 71.492 e foi
    // corrigido. Banda apertada para 2 casas (posições determinísticas):
    // o equatorial daria 1,023 e FALHA — a banda de 5% do doador o
    // deixava passar.
    const corpos: CorposDoCone = {
      raioSolKm: RAIO_SOL_KM,
      raioEclipsadorKm: 69_911,
      raioReceptorKm: 1_821,
    };
    const dSolJupiterKm = 5.2044 * UA_EM_KM;
    const out = resolve(
      [dSolJupiterKm, 0, 0],
      [dSolJupiterKm + 421_700, 0, 0],
      corpos
    );
    expect(out.ativo).toBe(true);
    expect(out.umbraKm / 69_558).toBeCloseTo(1, 2);
    expect(out.penumbraKm / 70_343).toBeCloseTo(1, 2);
    // Io (r = 1.821 km) cabe inteira dentro da umbra: eventos de
    // disco inteiro.
    expect(out.umbraKm).toBeGreaterThan(10 * 1_821);
    expect(out.minSombra).toBe(0);
  });
});

describe("escala e contrato do consumidor", () => {
  it("é invariante de similaridade: posições E raios × s escalam os raios do cone por s e preservam ativo/minSombra", () => {
    // A tradução do "degenera para a identidade em modo realista" do
    // doador: a casa é 1:1 por doutrina (sem modo didático), e a
    // propriedade que tornava a transformada de similaridade dele
    // válida é esta — escalar a configuração inteira não muda nenhuma
    // relação angular.
    const { eclipsador, receptor } = posicoes(
      D_SOL_LUA_20240408_KM,
      D_LUA_TERRA_20240408_KM,
      GAMMA_20240408_KM
    );
    const base = resolve(eclipsador, receptor, SOLAR);
    for (const s of [1e-3, 1e3]) {
      const escala = (v: Vetor3Km): Vetor3Km => [v[0] * s, v[1] * s, v[2] * s];
      const out = resolve(escala(eclipsador), escala(receptor), {
        raioSolKm: SOLAR.raioSolKm * s,
        raioEclipsadorKm: SOLAR.raioEclipsadorKm * s,
        raioReceptorKm: SOLAR.raioReceptorKm * s,
      });
      expect(out.ativo).toBe(base.ativo);
      expect(out.umbraKm / s).toBeCloseTo(base.umbraKm, 6);
      expect(out.penumbraKm / s).toBeCloseTo(base.penumbraKm, 6);
      expect(out.distanciaAoEixoKm / s).toBeCloseTo(base.distanciaAoEixoKm, 6);
      expect(out.minSombra).toBeCloseTo(base.minSombra, 12);
    }
  });

  it("coordenada de CENA (pc) no lugar de km denuncia o bug com eclipse permanente e centrado", () => {
    // O lado da casa do "recusa distância de render" (luz.test.ts):
    // a cena mede em PARSEC. Um chamador que amostrar posição de cena
    // encolhe as distâncias ~13 ordens de grandeza SEM encolher os
    // raios: as razões de distância do cone são invariantes, então os
    // raios saem "certos" — mas a distância ao eixo colapsa para ~0 e
    // uma noite que em km é INATIVA vira eclipse ativo e centrado.
    // Todo par em eclipse permanente: nunca plausível, o bug grita na
    // primeira vista (por isso não há piso de rejeição — o modo
    // silencioso "nunca eclipsa" seria indistinguível de eclipse raro).
    const KM_POR_PC = 3.0857e13;
    const desvioKm = 384_400 * Math.sin((4 * Math.PI) / 180);
    const { eclipsador, receptor } = posicoes(
      D_SOL_LUA_20240408_KM,
      384_400,
      desvioKm
    );
    expect(resolve(eclipsador, receptor, SOLAR).ativo).toBe(false);
    const emPc = (v: Vetor3Km): Vetor3Km => [
      v[0] / KM_POR_PC,
      v[1] / KM_POR_PC,
      v[2] / KM_POR_PC,
    ];
    const errado = resolve(emPc(eclipsador), emPc(receptor), SOLAR);
    expect(errado.ativo).toBe(true);
    expect(errado.distanciaAoEixoKm).toBeLessThan(1);
  });

  it("a mancha penumbral cobre ≈0,54 raios terrestres em 2024-04-08 — a âncora que a similaridade preserva", () => {
    // 3.417,5 / 6.371 ≈ 0,536: no doador esta razão era o que a
    // transformada de similaridade preservava em todo modo de escala;
    // aqui é afirmada uma vez, em km, porque só existe o 1:1.
    const { eclipsador, receptor } = posicoes(
      D_SOL_LUA_20240408_KM,
      D_LUA_TERRA_20240408_KM,
      GAMMA_20240408_KM
    );
    const out = resolve(eclipsador, receptor, SOLAR);
    expect(out.penumbraKm / RAIO_TERRA_KM).toBeGreaterThan(0.45);
    expect(out.penumbraKm / RAIO_TERRA_KM).toBeLessThan(0.62);
  });

  it("umbra negativa clampa a zero no consumidor e o nível anular sobrevive em minSombra", () => {
    // O contrato do driver da F2c (no doador vivia no render config):
    // o uniform do raio recebe max(umbraKm, 0); o que faz o anular
    // renderizar anular em vez de preto NÃO é o raio — é o piso, que
    // o clamp não toca.
    const dSolTerraKm = 0.9977 * UA_EM_KM;
    const thetaSol = RAIO_SOL_KM / dSolTerraKm;
    const dLuaTerraKm = RAIO_LUA_KM / (0.952 * thetaSol);
    const { eclipsador, receptor } = posicoes(
      dSolTerraKm - dLuaTerraKm,
      dLuaTerraKm,
      0
    );
    const out = resolve(eclipsador, receptor, SOLAR);
    expect(out.umbraKm).toBeLessThan(0);
    expect(Math.max(out.umbraKm, 0)).toBe(0);
    expect(out.minSombra).toBeGreaterThan(0);
    expect(out.penumbraKm).toBeGreaterThan(0);
  });
});

describe("casos degenerados do predicado", () => {
  it("receptor do lado SOLAR do eclipsador nunca é sombreado", () => {
    const out = resolve([UA_EM_KM, 0, 0], [UA_EM_KM / 2, 0, 0], SOLAR);
    expect(out.ativo).toBe(false);
    expect(out.minSombra).toBe(1);
  });

  it("corpos coincidentes (e NaN) desativam em vez de dividir por zero", () => {
    const p: Vetor3Km = [UA_EM_KM, 0, 0];
    const out = resolve(p, p, SOLAR);
    expect(out.ativo).toBe(false);
    // Adição da casa (pauta (a) da revisão: clamps/NaN — precedente
    // c098470/9aff400): posição não-finita desativa neutro; um NaN
    // propagado vira uniform que pinta o corpo de preto sem erro em
    // lugar nenhum.
    const comNaN = resolve([Number.NaN, 0, 0], [UA_EM_KM, 0, 0], SOLAR);
    expect(comNaN.ativo).toBe(false);
    expect(comNaN.minSombra).toBe(1);
    expect(Number.isNaN(comNaN.umbraKm)).toBe(false);
  });

  it("não aloca nada entre chamadas repetidas (contrato de out-parameter)", () => {
    const out = criaGeometriaDoCone();
    const eclipsador: Vetor3Km = [0.9 * UA_EM_KM, 0.01 * UA_EM_KM, 0];
    const receptor: Vetor3Km = [UA_EM_KM, 0, 0];
    const primeira = resolveConeDeEclipse(eclipsador, receptor, SOLAR, out);
    const segunda = resolveConeDeEclipse(eclipsador, receptor, SOLAR, out);
    expect(segunda).toBe(out);
    expect(primeira).toBe(segunda);
  });
});

describe("registro de constantes do shader (a F2c interpola daqui)", () => {
  it("janela do fade de terminador e gate do lado próximo mantêm os valores de tela do doador", () => {
    expect(FADE_TERMINADOR_INICIO).toBe(-0.1);
    expect(FADE_TERMINADOR_FIM).toBe(0.2);
    expect(GATE_LADO_PROXIMO).toBe(-0.15);
  });

  it("o piso de refração lunar fica DENTRO da banda Danjon L2–L3 (10⁻³–10⁻⁴ do direto)", () => {
    expect(PISO_REFRACAO_LUNAR).toBeGreaterThanOrEqual(1e-4);
    expect(PISO_REFRACAO_LUNAR).toBeLessThanOrEqual(1e-3);
  });

  it("a cor de refração é cobre: monotonicamente quente (r > g > b > 0)", () => {
    const [r, g, b] = COR_REFRACAO_LUNAR;
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(0);
  });

  it("o piso umbral é DERIVADO das constantes, nunca redigitado — Object.is por canal", () => {
    // A tradução do needle do doador ("o helper interpola o registro,
    // não literais redigitados") enquanto o GLSL não existe: o dado
    // derivado tem de ser o produto exato, bit a bit. Quando o patch
    // nascer na F2c, o needle-teste dele cobra a mesma coisa no shader.
    const piso = pisoUmbralDoEclipsador("earth");
    for (let canal = 0; canal < 3; canal += 1) {
      expect(
        Object.is(
          piso[canal],
          COR_REFRACAO_LUNAR[canal]! * PISO_REFRACAO_LUNAR
        )
      ).toBe(true);
    }
  });

  it("toda constante interpolável é um float GLSL válido (contém ponto decimal)", () => {
    for (const valor of [
      FADE_TERMINADOR_INICIO,
      FADE_TERMINADOR_FIM,
      GATE_LADO_PROXIMO,
      PISO_REFRACAO_LUNAR,
      ...COR_REFRACAO_LUNAR,
    ]) {
      expect(`${valor}`).toMatch(/^-?\d+\.\d+$/);
    }
  });

  it("receptores solares sombreiam neutro; só o eclipsador Terra carrega o piso cobre", () => {
    // O tinte laranja que o patch antigo do doador aplicava a
    // receptores solares era herança artística sem fonte — deletado
    // lá, não atravessa: visto do espaço, o sombreado penumbral é
    // neutro. Todo eclipsador da tabela que não é a Terra recebe piso
    // zero (Júpiter/Saturno/Urano/Netuno/Plutão sem limbo refrator
    // modelado; a Lua eclipsando a Terra escurece neutro).
    expect(pisoUmbralDoEclipsador("earth").some((c) => c > 0)).toBe(true);
    for (const eclipsador of new Set(Object.values(PARES_DE_ECLIPSE))) {
      if (eclipsador === "earth") continue;
      expect(pisoUmbralDoEclipsador(eclipsador)).toEqual([0, 0, 0]);
    }
  });

  it("o piso anular guarda os divisores — entrada de lixo nunca vira NaN", () => {
    // O par do "divisor guardado" do GLSL do doador, no lado TS que já
    // existe: eclipsador colado no Sol e receptor absurdamente longe
    // levam o raio angular do Sol abaixo da guarda de 1e-12; o piso
    // tem de sair finito e em [0, 1], nunca NaN.
    const absurdo = resolve([1e6, 0, 0], [1e18, 0, 0], SOLAR);
    expect(Number.isFinite(absurdo.minSombra)).toBe(true);
    expect(absurdo.minSombra).toBeGreaterThanOrEqual(0);
    expect(absurdo.minSombra).toBeLessThanOrEqual(1);
    // Eclipsador NA origem (distância Sol–eclipsador zero): desativa
    // neutro em vez de dividir por zero na normalização do eixo.
    const naOrigem = resolve([0, 0, 0], [UA_EM_KM, 0, 0], SOLAR);
    expect(naOrigem.ativo).toBe(false);
    expect(naOrigem.minSombra).toBe(1);
  });
});

describe("PARES_DE_ECLIPSE — contratos da tabela", () => {
  it("são os 15 pares do doador + as 5 luas de Urano + as 2 marcianas da F3 (data-only)", () => {
    expect(Object.keys(PARES_DE_ECLIPSE)).toHaveLength(23);
    for (const lua of ["miranda", "ariel", "umbriel", "titania", "oberon"]) {
      expect(PARES_DE_ECLIPSE[lua]).toBe("uranus");
    }
    // F3: Fobos e Deimos na sombra de Marte — o contrato "lua aponta o
    // pai" é cobrado pelo teste abaixo sem mudar uma linha
    expect(PARES_DE_ECLIPSE.phobos).toBe("mars");
    expect(PARES_DE_ECLIPSE.deimos).toBe("mars");
    expect(PARES_DE_ECLIPSE.pluto).toBe("charon");
    expect(PARES_DE_ECLIPSE.charon).toBe("pluto");
  });

  it("todo receptor aponta um corpo REAL do registro orbital, diferente de si mesmo", () => {
    for (const [receptor, eclipsador] of Object.entries(PARES_DE_ECLIPSE)) {
      expect(REGISTRO_ORBITAL[receptor]).toBeDefined();
      expect(REGISTRO_ORBITAL[eclipsador]).toBeDefined();
      expect(eclipsador).not.toBe(receptor);
    }
  });

  it("toda lua receptora aponta o PRÓPRIO pai; a Terra aponta o próprio satélite", () => {
    // Só o corpo que domina o céu do receptor produz eclipse que vale
    // um resolve por quadro: para uma lua, é o pai; para a Terra, é a
    // Lua (o único satélite). Um par fora da família seria um resolve
    // pago para uma sombra que nunca alinha.
    for (const [receptor, eclipsador] of Object.entries(PARES_DE_ECLIPSE)) {
      const centroDoReceptor = REGISTRO_ORBITAL[receptor]!.centro;
      if (centroDoReceptor !== "sun") {
        // Lua receptora: o eclipsador É o pai.
        expect(eclipsador).toBe(centroDoReceptor);
      } else {
        // Planeta receptor: o eclipsador é satélite DELE.
        expect(REGISTRO_ORBITAL[eclipsador]!.centro).toBe(receptor);
      }
    }
  });

  it("NENHUM corpo com anel é receptor — o contrato lê CORPOS_COM_ANEL e cobra sozinho", () => {
    // O ramo de eclipse substituiria em silêncio o shader de sombra do
    // anel (JSDoc herdado do doador). A lista é o dado vivo: hoje só
    // Saturno tem anel; quando a F6 acrescentar uranus/neptune/quaoar,
    // este teste passa a cobrá-los sem mudar uma linha aqui.
    expect(CORPOS_COM_ANEL).toContain("saturn");
    for (const corpo of CORPOS_COM_ANEL) {
      expect(REGISTRO_ORBITAL[corpo]).toBeDefined();
      expect(PARES_DE_ECLIPSE[corpo]).toBeUndefined();
    }
  });
});

// ============================================================
// F2c — o driver `resolveSombraNaCena` contra a EFEMÉRIDE REAL nos jd
// pinados da onda de eclipses, o needle do chunk GLSL (a lição do chunk
// renomeado) e o relógio único. A efeméride carrega como em
// `efemerides.test.ts` — o .bin em disco é o dado vivo da casa.
// ============================================================
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { MetaEfemerides } from "./efemerides";
import { decodeEfemerides, MotorEfemerides } from "./efemerides";
import { eclipticaParaEquatorial } from "./frameGalactico";
import { BODY_AXES } from "./iauOrientation";

const DATA_DIR = fileURLToPath(
  new URL("../../../public/data/atlas/", import.meta.url)
);
const motorReal = new MotorEfemerides(
  (() => {
    const meta = JSON.parse(
      readFileSync(join(DATA_DIR, "efemerides_meta.json"), "utf8")
    ) as MetaEfemerides;
    const bin = readFileSync(join(DATA_DIR, "efemerides.bin"));
    return decodeEfemerides(
      bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength),
      meta
    );
  })()
);

const uaDe = (id: string, jd: number): Vetor3Km => {
  const p = motorReal.posicaoHeliocentrica(id, jd);
  return [p.x, p.y, p.z];
};

/** Os jd PINADOS da onda (máximos segundo a NOSSA
 *  efeméride) e os controles verificados fora de eclipse. */
const JD_SOLAR = 2460409.26395835; // 2024-04-08, umbra da Lua na Terra
const JD_LUNAR = 2458327.34980323; // 2018-07-27, Lua funda na umbra
const JD_RETRATO = 2461041.5008692136; // 2026-01-01 — sem eclipse (verificado)

const sombraDe = (receptorId: string, jd: number) => {
  const eclipsadorId = PARES_DE_ECLIPSE[receptorId]!;
  return resolveSombraNaCena(
    receptorId,
    uaDe(receptorId, jd),
    uaDe(eclipsadorId, jd),
    criaSombraNaCena()
  );
};

describe("resolveSombraNaCena — os jd pinados contra a efeméride real", () => {
  it("eclipse solar 2024: a Terra recebe a geometria pinada da onda", () => {
    const s = sombraDe("earth", JD_SOLAR);
    expect(s.ativo).toBe(true);
    // os números da tabela (a faixa ±1–2 km cobre o raio equatorial de
    // BODY_AXES no lugar do volumétrico da nota de preparação)
    expect(s.distanciaAoEixoKm).toBeGreaterThan(2_190);
    expect(s.distanciaAoEixoKm).toBeLessThan(2_193);
    expect(s.umbraKm).toBeGreaterThan(64);
    expect(s.umbraKm).toBeLessThan(68);
    expect(s.penumbraKm).toBeGreaterThan(3_414);
    expect(s.penumbraKm).toBeLessThan(3_420);
    expect(s.minSombra).toBe(0); // total, sem piso anular
    // a Lua eclipsando a Terra sombreia NEUTRO (o tinte laranja de
    // receptor solar morreu no doador e não atravessa)
    expect(s.pisoUmbral).toEqual([0, 0, 0]);
    // o eclipsador a ~56 raios terrestres (359.804 km / 6.378,1 km)
    expect(Math.hypot(...s.eclipsadorRaios)).toBeCloseTo(56.4, 1);
    // o eixo da sombra é a direção heliocêntrica da Lua, na cena
    const luaCena = eclipticaParaEquatorial(uaDe("moon", JD_SOLAR));
    const norma = Math.hypot(...luaCena);
    const dot =
      (luaCena[0] * s.eixoCena[0] +
        luaCena[1] * s.eixoCena[1] +
        luaCena[2] * s.eixoCena[2]) /
      norma;
    expect(dot).toBeGreaterThan(1 - 1e-9);
  });

  it("eclipse lunar 2018: a Lua recebe a umbra da Terra COM o cobre de Danjon", () => {
    const s = sombraDe("moon", JD_LUNAR);
    expect(s.ativo).toBe(true);
    expect(s.distanciaAoEixoKm).toBeGreaterThan(739);
    expect(s.distanciaAoEixoKm).toBeLessThan(743);
    // a umbra engole a Lua inteira (~2,6 R_lua — a nota tabela 4.527 km)
    expect(s.umbraKm).toBeGreaterThan(4_530);
    expect(s.umbraKm).toBeLessThan(4_538);
    expect(s.umbraKm / BODY_AXES.moon[0]).toBeGreaterThan(2.2);
    expect(s.minSombra).toBe(0);
    // a blood moon é o piso da lib, componente a componente — nunca
    // uma cor inventada no consumidor
    const piso = pisoUmbralDoEclipsador("earth");
    for (let c = 0; c < 3; c += 1) {
      expect(Object.is(s.pisoUmbral[c], piso[c])).toBe(true);
      expect(s.pisoUmbral[c]).toBeGreaterThan(0);
    }
    expect(s.raioEclipsadorRaios).toBeCloseTo(
      BODY_AXES.earth[0] / BODY_AXES.moon[0],
      12
    );
  });

  it("o outro lado do MESMO alinhamento está fora de sombra (controle cruzado)", () => {
    // no jd do eclipse solar a Lua é a OCULTADORA — como receptora, inativa
    expect(sombraDe("moon", JD_SOLAR).ativo).toBe(false);
    // e no jd do eclipse lunar a Terra não é sombreada pela Lua
    expect(sombraDe("earth", JD_LUNAR).ativo).toBe(false);
  });

  it("fora de eclipse o payload é NEUTRO — o que mantém as vistas oficiais", () => {
    for (const jd of [JD_RETRATO, JD_SOLAR + 30, JD_LUNAR - 30]) {
      for (const receptor of ["earth", "moon"]) {
        const s = sombraDe(receptor, jd);
        expect(s.ativo).toBe(false);
        expect(s.minSombra).toBe(1);
        expect(s.pisoUmbral).toEqual([0, 0, 0]);
      }
    }
  });

  it("NaN desativa (nunca um uniform que pinta o corpo de preto)", () => {
    const s = resolveSombraNaCena(
      "earth",
      [Number.NaN, 0, 0],
      uaDe("moon", JD_SOLAR),
      criaSombraNaCena()
    );
    expect(s.ativo).toBe(false);
    expect(s.minSombra).toBe(1);
    const s2 = resolveSombraNaCena(
      "moon",
      uaDe("moon", JD_LUNAR),
      [Number.POSITIVE_INFINITY, 0, 0],
      criaSombraNaCena()
    );
    expect(s2.ativo).toBe(false);
  });

  it("receptor sem par na tabela (Marte) é neutro", () => {
    const s = resolveSombraNaCena(
      "mars",
      uaDe("mars", JD_SOLAR),
      uaDe("moon", JD_SOLAR),
      criaSombraNaCena()
    );
    expect(s.ativo).toBe(false);
    expect(s.minSombra).toBe(1);
  });

  it("o contrato de out-parameter: a referência é estável entre chamadas", () => {
    const out = criaSombraNaCena();
    const primeira = resolveSombraNaCena(
      "earth",
      uaDe("earth", JD_SOLAR),
      uaDe("moon", JD_SOLAR),
      out
    );
    const segunda = resolveSombraNaCena(
      "moon",
      uaDe("moon", JD_LUNAR),
      uaDe("earth", JD_LUNAR),
      out
    );
    expect(primeira).toBe(out);
    expect(segunda).toBe(out);
    // e o conteúdo foi SUBSTITUÍDO (o rascunho do cone não vaza estado)
    expect(out.ativo).toBe(true);
    expect(out.pisoUmbral[0]).toBeGreaterThan(0);
  });
});

describe("o needle do chunk GLSL (a lição do chunk renomeado, D3)", () => {
  it("o chunk interpola as constantes da lib, nunca literais redigitados", () => {
    expect(GLSL_SOMBRA_ECLIPSE).toContain(
      `smoothstep(${FADE_TERMINADOR_INICIO}, ${FADE_TERMINADOR_FIM}, ndotlGeo)`
    );
    expect(GLSL_SOMBRA_ECLIPSE).toContain(`<= ${GATE_LADO_PROXIMO}`);
  });

  it("o neutro é vec3(1.0) EXATO e o clamp da umbra não toca o piso anular", () => {
    expect(GLSL_SOMBRA_ECLIPSE).toContain(
      "if (uEclipseAtivo < 0.5) return vec3(1.0);"
    );
    expect(GLSL_SOMBRA_ECLIPSE).toContain(
      "max(uEclipseCone.x - s * uEclipseCone.y, 0.0)"
    );
    expect(GLSL_SOMBRA_ECLIPSE).toContain("uEclipsePisoEscalar");
  });

  it("a exposição do observador (decisão do dono, opção A): só o cobre, nunca o anular nem o solar", () => {
    // o ganho vem da LIB interpolado — nunca um literal redigitado
    expect(GLSL_SOMBRA_ECLIPSE).toContain(
      `uEclipsePisoCor * ${GANHO_OBSERVADOR_ECLIPSE_LUNAR.toFixed(1)}`
    );
    // o piso ANULAR (escalar) fica FORA do ganho — soma-se depois
    expect(GLSL_SOMBRA_ECLIPSE).toContain("+ vec3(uEclipsePisoEscalar)");
    // o valor é o calibrado por captura na vista eclipse-lunar
    expect(EV_OBSERVADOR_ECLIPSE_LUNAR).toBe(10);
    expect(GANHO_OBSERVADOR_ECLIPSE_LUNAR).toBe(1024);
    // o dado FÍSICO não mudou: o piso da lib continua COR × PISO exato
    // (o oráculo acima o pina componente a componente)
    const piso = pisoUmbralDoEclipsador("earth");
    expect(piso[0]).toBe(COR_REFRACAO_LUNAR[0] * PISO_REFRACAO_LUNAR);
    // receptor solar (eclipsador Lua) tem piso [0,0,0] ⇒ 0 × ganho = 0
    // exato: as vistas do eclipse SOLAR não podem mover por causa do ganho
    expect(pisoUmbralDoEclipsador("moon")).toEqual([0, 0, 0]);
  });
});

describe("relógio único (D2/D-E6) — texto-fonte do módulo", () => {
  it("eclipse.ts não conhece relógio de parede: o jd vem do Director", () => {
    const fonte = readFileSync(new URL("./eclipse.ts", import.meta.url), "utf8");
    expect(fonte).not.toContain("Date.now");
    expect(fonte).not.toContain("new Date(");
    expect(fonte).not.toContain("performance.now");
  });
});

// ============================================================
// O INSTRUMENTO DO ITEM 95 — como este arquivo EXECUTA o chunk
//
// O chunk do eclipse é a peça mais crítica de shader da casa (o
// cabeçalho de `eclipse.ts` diz por quê: selo e render discordarem
// sobre um eclipse é o pior resultado que um produto honesto pode
// dar), e até 25/08 ninguém a media POR VALOR — só por needle de
// texto. O item 95 precisou medi-la para provar o piso do ar, e o que
// nasceu disso fica: um tradutor GLSL → JS de uma página, para o
// dialeto que `GLSL_SOMBRA_ECLIPSE` usa e SÓ para ele.
//
// A DIFERENÇA PARA O JUIZ DA RECEITA (`luzDaVisita.test.ts`): aquele
// mede UM CANAL, porque o chunk de lá é canal a canal. Este não pode —
// `dot` e `length` amarram os três —, então aqui um vec3 é um TRIO e os
// operadores infixos viram chamadas por um analisador de precedência.
// São dois dialetos diferentes, não duas cópias do mesmo tradutor.
//
// ELE RECUSA O QUE NÃO ENTENDE, pela mesma doutrina: identificador
// desconhecido, swizzle fora de .x/.y/.z, comando com chaves ou
// recursão fazem o juiz LANÇAR. Quem levar construção nova ao chunk
// ensina o tradutor no mesmo commit — juiz que não consegue medir
// reprova, não avisa.
// ============================================================

/** um valor do dialeto: `float` é número, `vec3` é um trio. */
type Valor = number | [number, number, number];

const trio = (v: Valor): [number, number, number] =>
  typeof v === "number" ? [v, v, v] : v;

/**
 * Binária componente a componente, com broadcast de escalar — a regra do
 * GLSL. Escalar × escalar continua ESCALAR: é o que mantém `s <= 0.0` e
 * `perp - umbra` sendo contas de float, como no shader.
 */
const porComponente =
  (f: (a: number, b: number) => number) =>
  (a: Valor, b: Valor): Valor => {
    if (typeof a === "number" && typeof b === "number") return f(a, b);
    const [ax, ay, az] = trio(a);
    const [bx, by, bz] = trio(b);
    return [f(ax, bx), f(ay, by), f(az, bz)];
  };

const soma = porComponente((a, b) => a + b);
const subt = porComponente((a, b) => a - b);
const mul = porComponente((a, b) => a * b);
const divi = porComponente((a, b) => a / b);
const neg = (a: Valor): Valor => mul(a, -1);
const canal = (a: Valor, k: number): number => trio(a)[k]!;

/** um float onde o GLSL exige float — a comparação relacional é escalar */
const escalar = (v: Valor, onde: string): number => {
  if (typeof v !== "number") {
    throw new Error(`comparação de vec3 em \`${onde}\` — o GLSL não permite`);
  }
  return v;
};

const EMBUTIDOS: Record<string, (...a: Valor[]) => Valor> = {
  vec3: (...a: Valor[]) => (a.length === 1 ? trio(a[0]!) : [
    canal(a[0]!, 0), canal(a[1]!, 1), canal(a[2]!, 2),
  ]),
  max: (a, b) => porComponente(Math.max)(a!, b!),
  min: (a, b) => porComponente(Math.min)(a!, b!),
  clamp: (x, lo, hi) => porComponente(Math.min)(
    porComponente(Math.max)(x!, lo!), hi!
  ),
  mix: (x, y, a) => soma(mul(x!, subt(1, a!)), mul(y!, a!)),
  smoothstep: (e0, e1, x) => {
    const t = Math.min(
      Math.max(
        (escalar(x!, "smoothstep") - escalar(e0!, "smoothstep")) /
          (escalar(e1!, "smoothstep") - escalar(e0!, "smoothstep")),
        0
      ),
      1
    );
    return t * t * (3 - 2 * t);
  },
  dot: (a, b) => {
    const [ax, ay, az] = trio(a!);
    const [bx, by, bz] = trio(b!);
    return ax * bx + ay * by + az * bz;
  },
  length: (a) => Math.hypot(...trio(a!)),
};

/** os uniformes que o chunk declara — lidos DELE, nunca redigitados. */
const UNIFORMES_DO_CHUNK = [
  ...GLSL_SOMBRA_ECLIPSE.matchAll(/^uniform\s+(?:float|vec3)\s+(\w+)\s*;/gm),
].map((m) => m[1]!);

type Ligados = Partial<Record<string, Valor>>;

/** os nomes que o PRÓPRIO chunk declara — é por aqui que uma peça sabe
 *  que a irmã existe (o mesmo desenho do juiz da receita). */
const PECAS_DO_CHUNK = [
  ...GLSL_SOMBRA_ECLIPSE.matchAll(/\b(?:float|vec3)\s+(\w+)\s*\(/g),
].map((m) => m[1]!);

/** o corpo CRU de uma peça do chunk, achado por contagem de chaves */
function corpoNoChunk(nome: string): { params: string[]; corpo: string } {
  const decl = new RegExp(`(?:float|vec3)\\s+${nome}\\s*\\(([^)]*)\\)\\s*\\{`)
    .exec(GLSL_SOMBRA_ECLIPSE);
  if (!decl) throw new Error(`o chunk não declara \`${nome}\``);
  const abre = decl.index + decl[0].length;
  let nivel = 1;
  let i = abre;
  for (; i < GLSL_SOMBRA_ECLIPSE.length && nivel > 0; i++) {
    if (GLSL_SOMBRA_ECLIPSE[i] === "{") nivel++;
    else if (GLSL_SOMBRA_ECLIPSE[i] === "}") nivel--;
  }
  if (nivel !== 0) throw new Error(`chave que não fecha em \`${nome}\``);
  const lista = decl[1]!.trim();
  const params =
    lista === ""
      ? []
      : lista.split(",").map((p) => {
          const m = /^\s*(?:float|vec3)\s+(\w+)\s*$/.exec(p);
          if (!m) {
            throw new Error(
              `parâmetro que o tradutor não entende em \`${nome}\`: "${p.trim()}"`
            );
          }
          return m[1]!;
        });
  return { params, corpo: GLSL_SOMBRA_ECLIPSE.slice(abre, i - 1) };
}

/** GLSL → fichas. Caractere que não casa PARA o juiz, não o deixa passar. */
export function fichasDoGlsl(corpo: string, nome: string): string[] {
  const re =
    /\s+|\/\/[^\n]*|\d+\.\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?|\d+(?:[eE][+-]?\d+)?|[A-Za-z_]\w*|<=|>=|[-+*/(),;<>=.]/y;
  const saida: string[] = [];
  let i = 0;
  while (i < corpo.length) {
    re.lastIndex = i;
    const m = re.exec(corpo);
    if (!m) {
      throw new Error(
        `o tradutor de GLSL não entende "${corpo.slice(i, i + 24)}" (em \`${nome}\`)`
      );
    }
    i = re.lastIndex;
    const f = m[0];
    if (!/^\s/.test(f) && !f.startsWith("//")) saida.push(f);
  }
  return saida;
}

/**
 * Fichas → JS, por análise de precedência. O que ele entende é o que o
 * chunk usa: declaração com tipo, `if` de um comando só, `return`,
 * chamada, swizzle .x/.y/.z, unário `-`, `* / + -` e as relacionais.
 */
export function traduzirGlsl(
  corpo: string,
  params: readonly string[],
  nome: string
): string {
  const fichas = fichasDoGlsl(corpo, nome);
  const conhecidos = new Set<string>([
    ...params,
    ...UNIFORMES_DO_CHUNK,
    ...Object.keys(EMBUTIDOS),
    ...PECAS_DO_CHUNK,
  ]);
  let i = 0;
  const ver = () => fichas[i];
  const comer = (esperada?: string): string => {
    const f = fichas[i];
    if (f === undefined) throw new Error(`fim inesperado em \`${nome}\``);
    if (esperada !== undefined && f !== esperada) {
      throw new Error(`esperava "${esperada}" e veio "${f}" (em \`${nome}\`)`);
    }
    i++;
    return f;
  };
  const eNumero = (f: string) => /^[\d.]/.test(f);
  const eNome = (f: string) => /^[A-Za-z_]/.test(f);

  function primaria(): string {
    const f = comer();
    if (eNumero(f)) return f;
    if (f === "(") {
      const e = expr();
      comer(")");
      return `(${e})`;
    }
    if (!eNome(f)) throw new Error(`ficha inesperada "${f}" (em \`${nome}\`)`);
    if (!conhecidos.has(f)) {
      throw new Error(
        `o tradutor de GLSL não conhece \`${f}\` (em \`${nome}\`) — ensine-o aqui`
      );
    }
    if (ver() !== "(") return f;
    if (f === nome) {
      throw new Error(`\`${nome}\` chama a SI MESMA — este juiz não executa recursão`);
    }
    comer("(");
    const args: string[] = [];
    if (ver() !== ")") {
      args.push(expr());
      while (ver() === ",") {
        comer(",");
        args.push(expr());
      }
    }
    comer(")");
    return `${f}(${args.join(", ")})`;
  }
  function posfixa(): string {
    let e = primaria();
    while (ver() === ".") {
      comer(".");
      const c = comer();
      const k = { x: 0, y: 1, z: 2 }[c];
      if (k === undefined) {
        throw new Error(`swizzle que o tradutor não conhece: ".${c}" (em \`${nome}\`)`);
      }
      e = `canal(${e}, ${k})`;
    }
    return e;
  }
  function unaria(): string {
    if (ver() === "-") {
      comer("-");
      return `neg(${unaria()})`;
    }
    return posfixa();
  }
  function produto(): string {
    let e = unaria();
    for (;;) {
      if (ver() === "*") { comer(); e = `mul(${e}, ${unaria()})`; }
      else if (ver() === "/") { comer(); e = `divi(${e}, ${unaria()})`; }
      else return e;
    }
  }
  function adicao(): string {
    let e = produto();
    for (;;) {
      if (ver() === "+") { comer(); e = `soma(${e}, ${produto()})`; }
      else if (ver() === "-") { comer(); e = `subt(${e}, ${produto()})`; }
      else return e;
    }
  }
  function expr(): string {
    const e = adicao();
    const f = ver();
    if (f === "<" || f === "<=" || f === ">" || f === ">=") {
      comer();
      const d = adicao();
      return `(escalar(${e}, "${nome}") ${f} escalar(${d}, "${nome}"))`;
    }
    return e;
  }
  function comando(): string {
    const f = ver();
    if (f === "return") {
      comer("return");
      const e = expr();
      comer(";");
      return `return ${e};`;
    }
    if (f === "float" || f === "vec3") {
      comer();
      const alvo = comer();
      if (!eNome(alvo)) throw new Error(`nome inválido "${alvo}" (em \`${nome}\`)`);
      comer("=");
      const e = expr();
      comer(";");
      conhecidos.add(alvo);
      return `const ${alvo} = ${e};`;
    }
    throw new Error(`comando que o tradutor não entende: "${f}" (em \`${nome}\`)`);
  }

  const linhas: string[] = [];
  while (i < fichas.length) {
    if (ver() === "if") {
      comer("if");
      comer("(");
      const cond = expr();
      comer(")");
      linhas.push(`if (${cond}) ${comando()}`);
    } else {
      linhas.push(comando());
    }
  }
  return linhas.join("\n");
}

/**
 * A TRADUÇÃO É PREGUIÇOSA (a lição do juiz da receita): um chunk que o
 * tradutor não entende tem de derrubar o TESTE que o mede, não a coleta
 * do arquivo inteiro.
 */
const compiladas = new Map<string, (args: readonly Valor[], u: Ligados) => Valor>();

function pecaDoChunk(nome: string) {
  const pronta = compiladas.get(nome);
  if (pronta) return pronta;
  const { params, corpo } = corpoNoChunk(nome);
  const js = traduzirGlsl(corpo, params, nome);
  const irmas = PECAS_DO_CHUNK.filter((n) => n !== nome);
  const ajudas = { soma, subt, mul, divi, neg, canal, escalar };
  const assinatura = [
    ...params,
    ...UNIFORMES_DO_CHUNK,
    ...Object.keys(ajudas),
    ...Object.keys(EMBUTIDOS),
    ...irmas,
  ];
  const fn = new Function(...assinatura, js) as (...a: unknown[]) => Valor;
  const roda = (args: readonly Valor[], u: Ligados = {}): Valor =>
    fn(
      ...args,
      ...UNIFORMES_DO_CHUNK.map((chave) => u[chave] ?? 0),
      ...Object.values(ajudas),
      ...Object.values(EMBUTIDOS),
      ...irmas.map((irma) => (...a: Valor[]) => pecaDoChunk(irma)(a, u))
    );
  compiladas.set(nome, roda);
  return roda;
}

// ------------------------------------------------------------
// A geometria dos casos: tudo sai do DRIVER (`resolveSombraNaCena`), no
// frame da cena. O chunk é cego a frame — só faz dot e length —, então
// medir na cena mede a mesma conta que o material mede no frame local.
// ------------------------------------------------------------

/** os uniformes do quadro, a partir da sombra que o driver resolveu */
function uniformesDaSombra(s: ReturnType<typeof criaSombraNaCena>): Ligados {
  return {
    uEclipseAtivo: s.ativo ? 1 : 0,
    uEclipseEixo: [...s.eixoCena] as [number, number, number],
    uEclipseEclipsador: [...s.eclipsadorRaios] as [number, number, number],
    uEclipseCone: [s.raioEclipsadorRaios, s.inclinacaoUmbra, s.inclinacaoPenumbra],
    uEclipsePisoCor: [...s.pisoUmbral] as [number, number, number],
    uEclipsePisoEscalar: s.minSombra,
  };
}

/**
 * O PONTO SOB A SOMBRA: onde o eixo, saindo do eclipsador, fura a esfera
 * unitária do receptor. Derivado da saída do driver — nenhuma segunda
 * geometria de sombra neste arquivo.
 */
function pontoSobAMancha(s: ReturnType<typeof criaSombraNaCena>): [number, number, number] {
  const [ex, ey, ez] = s.eclipsadorRaios;
  const [ux, uy, uz] = s.eixoCena;
  const b = 2 * (ex * ux + ey * uy + ez * uz);
  const c = ex * ex + ey * ey + ez * ez - 1;
  const t = 0.5 * (-b - Math.sqrt(b * b - 4 * c));
  return [ex + t * ux, ey + t * uy, ez + t * uz];
}

describe("o chunk EXECUTADO — o fator do ar no eclipse (item 95)", () => {
  /** distância perpendicular ao eixo da sombra, em raios do receptor —
   *  a MESMA grandeza que o chunk chama de `perp`, para o caso poder
   *  dizer ONDE está o ponto que ele mede. */
  const aoEixo = (
    q: readonly number[],
    e: readonly number[],
    u: readonly number[]
  ): number => {
    const r = [q[0]! - e[0]!, q[1]! - e[1]!, q[2]! - e[2]!];
    const s = r[0]! * u[0]! + r[1]! * u[1]! + r[2]! * u[2]!;
    return Math.hypot(s * u[0]! - r[0]!, s * u[1]! - r[1]!, s * u[2]! - r[2]!);
  };

  /** o ponto da esfera a `ang` da mancha, andando para LONGE do eixo */
  const afastando = (
    p: readonly number[],
    u: readonly number[],
    ang: number
  ): [number, number, number] => {
    // direção radial-a-partir-do-eixo em p, tirada a componente ao longo de p
    const pu = p[0]! * u[0]! + p[1]! * u[1]! + p[2]! * u[2]!;
    const w = [p[0]! - pu * u[0]!, p[1]! - pu * u[1]!, p[2]! - pu * u[2]!];
    const wp = w[0]! * p[0]! + w[1]! * p[1]! + w[2]! * p[2]!;
    const t = [w[0]! - wp * p[0]!, w[1]! - wp * p[1]!, w[2]! - wp * p[2]!];
    const n = Math.hypot(t[0]!, t[1]!, t[2]!);
    const c = Math.cos(ang);
    const sn = Math.sin(ang) / n;
    return [
      p[0]! * c + t[0]! * sn,
      p[1]! * c + t[1]! * sn,
      p[2]! * c + t[2]! * sn,
    ];
  };

  /** a sombra real da Lua sobre a Terra em 2024-04-08 (a vista `eclipse-solar`) */
  const sombraSolar = () =>
    resolveSombraNaCena(
      "earth",
      uaDe("earth", JD_SOLAR),
      uaDe("moon", JD_SOLAR),
      criaSombraNaCena()
    );

  it("o piso do ar é DERIVADO em lux, nunca redigitado — e o GLSL interpola o derivado", () => {
    expect(PISO_CREPUSCULO_NO_AR).toBe(
      ILUMINANCIA_TOTALIDADE_LUX / ILUMINANCIA_SOL_PLENO_LUX
    );
    expect(PISO_CREPUSCULO_NO_AR).toBeGreaterThan(0); // zerar o ar é o OUTRO erro
    expect(GLSL_SOMBRA_ECLIPSE).toContain(`vec3(${PISO_CREPUSCULO_NO_AR})`);
  });

  it("sem eclipse o ar é identidade EXATA — vec3(1.0) canal a canal", () => {
    const fora = pecaDoChunk("fatorDeEclipseNoAr")([[0, 0, 1], [0, 0, 1], 1], {
      uEclipseAtivo: 0,
    });
    for (const c of trio(fora)) expect(Object.is(c, 1)).toBe(true);
  });

  it("com eclipse ativo o ar CAI sob a mancha, e o piso do crepúsculo o segura", () => {
    const s = sombraSolar();
    expect(s.ativo).toBe(true);
    const u = uniformesDaSombra(s);
    const p = pontoSobAMancha(s);
    // o eixo é ANTI-solar, e o ponto está a gamma do centro: N·L = √(1−γ²)
    const nl = -(p[0] * s.eixoCena[0] + p[1] * s.eixoCena[1] + p[2] * s.eixoCena[2]);
    expect(nl).toBeGreaterThan(0.9); // pleno dia: o fade do terminador está aberto
    // e o ponto está DENTRO da umbra da lib, medido na mesma unidade
    const raioTerraKm = BODY_AXES.earth[0]!;
    expect(aoEixo(p, s.eclipsadorRaios, s.eixoCena) * raioTerraKm).toBeLessThan(
      s.umbraKm
    );

    const cone = pecaDoChunk("fatorDeEclipse")([p, p, nl], u);
    const ar = pecaDoChunk("fatorDeEclipseNoAr")([p, p, nl], u);
    // totalidade: o cone geométrico vai a ZERO no núcleo…
    expect(canal(cone, 0)).toBeCloseTo(0, 12);
    // …e o AR fica no piso do crepúsculo, nunca no preto. A comparação é
    // com o CHÃO daquele mesmo ponto: onde o chão apaga, o ar ainda tem
    // o crepúsculo de 360°, e é ISSO que o item 95 exige — zerar o ar
    // seria trocar um erro por outro.
    for (const k of [0, 1, 2]) {
      expect(canal(ar, k)).toBe(PISO_CREPUSCULO_NO_AR);
      expect(canal(ar, k)).toBeGreaterThan(canal(cone, k));
    }
  });

  it("fora da penumbra o ar não se mexe — identidade EXATA com o eclipse LIGADO", () => {
    const s = sombraSolar();
    const u = uniformesDaSombra(s);
    const raioTerraKm = BODY_AXES.earth[0]!;
    // 45° para longe da mancha: ~5.780 km do eixo contra a penumbra de
    // ~3.390 km, e ainda a 65° do subsolar — pleno dia, fade aberto
    const q = afastando(pontoSobAMancha(s), s.eixoCena, Math.PI / 4);
    // o caso prova ONDE está: além da penumbra da lib, e ainda em pleno dia
    expect(aoEixo(q, s.eclipsadorRaios, s.eixoCena) * raioTerraKm).toBeGreaterThan(
      s.penumbraKm
    );
    const nl = -(q[0] * s.eixoCena[0] + q[1] * s.eixoCena[1] + q[2] * s.eixoCena[2]);
    expect(nl).toBeGreaterThan(FADE_TERMINADOR_FIM);
    for (const c of trio(pecaDoChunk("fatorDeEclipseNoAr")([q, q, nl], u))) {
      expect(Object.is(c, 1)).toBe(true);
    }
  });

  it("o instrumento confere com a LIB: a rampa cruza a meia-luz ENTRE umbra e penumbra", () => {
    // quem julga o juiz. A rampa que o GLSL executa é a do cone desta
    // lib: então o ponto em que ela passa de 0,5 tem de cair entre os
    // raios de umbra e penumbra que `resolveConeDeEclipse` devolveu.
    const s = sombraSolar();
    const u = uniformesDaSombra(s);
    const p = pontoSobAMancha(s);
    const raioTerraKm = BODY_AXES.earth[0]!;
    const fator = pecaDoChunk("fatorDeEclipse");
    let anterior = -1;
    let cruzouKm = Number.NaN;
    for (let g = 0; g <= 600; g++) {
      const ang = (g / 600) * (Math.PI / 3);
      const q = afastando(p, s.eixoCena, ang);
      const nl = -(q[0] * s.eixoCena[0] + q[1] * s.eixoCena[1] + q[2] * s.eixoCena[2]);
      if (nl <= FADE_TERMINADOR_FIM) break; // fora do dia o fade manda, não a rampa
      const v = canal(fator([q, q, nl], u), 0);
      expect(v).toBeGreaterThanOrEqual(anterior - 1e-12); // monótona: só clareia
      if (!(anterior >= 0.5) && v >= 0.5) {
        cruzouKm = aoEixo(q, s.eclipsadorRaios, s.eixoCena) * raioTerraKm;
      }
      anterior = v;
    }
    expect(anterior).toBe(1); // além da penumbra volta a ser identidade EXATA
    expect(cruzouKm).toBeGreaterThan(s.umbraKm);
    expect(cruzouKm).toBeLessThan(s.penumbraKm);
  });

  it("o tradutor RECUSA o que não entende, em vez de dar passe livre", () => {
    expect(() => traduzirGlsl("return inventada(x);", ["x"], "t")).toThrow(/não conhece/);
    expect(() => traduzirGlsl("return p.w;", ["p"], "t")).toThrow(/swizzle/);
    expect(() => traduzirGlsl("for (int i = 0; i < 2; i++) {}", [], "t")).toThrow();
    expect(() =>
      traduzirGlsl("return fatorDeEclipse(p, p, 1.0);", ["p"], "fatorDeEclipse")
    ).toThrow(/recursão/);
    expect(() => traduzirGlsl("return dot(p, p) < 1.0;", ["p"], "t")).not.toThrow();
  });
});
