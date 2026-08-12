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
  FADE_TERMINADOR_FIM,
  FADE_TERMINADOR_INICIO,
  GATE_LADO_PROXIMO,
  PARES_DE_ECLIPSE,
  PISO_REFRACAO_LUNAR,
  criaGeometriaDoCone,
  pisoUmbralDoEclipsador,
  resolveConeDeEclipse,
  type CorposDoCone,
  type Vetor3Km,
} from "./eclipse";
import { REGISTRO_ORBITAL } from "./registroOrbital";

// Raios de catálogo (radiusKm do doador; os mesmos corpos.json da casa).
const RAIO_SOL_KM = 696_340;
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
  it("são os 15 pares do doador + as 5 luas de Urano (a exceção revertida, data-only)", () => {
    expect(Object.keys(PARES_DE_ECLIPSE)).toHaveLength(20);
    for (const lua of ["miranda", "ariel", "umbriel", "titania", "oberon"]) {
      expect(PARES_DE_ECLIPSE[lua]).toBe("uranus");
    }
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
