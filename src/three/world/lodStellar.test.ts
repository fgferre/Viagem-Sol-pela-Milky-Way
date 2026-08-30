// Serve: lei — a rampa do LOD estelar e a cessão por dominância corpo↔ponto obedecem a lei contínua, sem degrau
// ============================================================
// Oráculo do LOD estelar — o que sobrou dele depois do M2 da
// LEI-DA-ESTRELA. Duas origens, declaradas:
//
// 1. Os 11 casos de `stepRampToward` são PORTE VERBATIM de
//    `hygMeshFadeRamp.test.ts` do doador (atlas-orbital) — mesmos
//    valores, mesmas tolerâncias. Se um deles precisasse de adaptação,
//    a transcrição do integrador estaria errada; nenhum precisou.
// 2. O resto é da casa: os contratos C2/C3 do canal `aFocus`, a rampa
//    de cessão por dominância CORPO↔PONTO (a única peça viva da velha
//    política — consumidora: a Terra resolvida) e a cirurgia da
//    constante do sistema solar.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LIMIAR_SISTEMA_SOLAR_PC } from '../escala';
import {
  DOMINANCIA_DO_CORPO,
  FOCUS_OFF,
  FOCUS_ON,
  RAMP_DURATION_MS,
  cessaoPorDominancia,
  clearFocus,
  needsAttributeWrite,
  resetRamp,
  stepRampToward,
} from './lodStellar';

// ------------------------------------------------------------
// 1. Integrador da rampa — 11 casos portados verbatim do doador
// ------------------------------------------------------------
// ============================================================
// O QUE MORREU AQUI NO M1 E NO M2 (LEI-DA-ESTRELA §4) — e não volta:
//  · M1: a entrega {0,02; 0,05} pc (LOD_SOL, sunStarGain, deepPointGain),
//    o oráculo `ponto + clarão === 1` em ~22.000 distâncias, o gate por
//    ângulo sólido e filtroSolarAlvo — quem reparte o Sol é repartir();
//  · M2: a POLÍTICA DE DOMINÂNCIA inteira — heroNearFade/heroFarFade/
//    heroPresence e as janelas LOD_HERO, heroSizePx/catalogApparentMag/
//    heroDominanceRatio/heroCatalogFade/fadesDoQuadro, o casamento
//    matchHeroesToCatalog e a chave DOMINANCE_DEFAULT_ON, com os ~600
//    casos que os cobravam (as 4 vistas A9, as redes D2, a prova da luz
//    combinada, o casamento das duplas de Acrux/α Cen). O clarão de asas
//    (`clarao.ts`) não tem dupla-luz por construção — é lente somada POR
//    CIMA do ponto, do raio do sprite para fora — então não há cessão,
//    e sem cessão não há política. O canal `aFade` morreu junto.
// A varredura invertida (simbolosProibidos.test.ts) vigia os nomes.
// ============================================================

describe('stepRampToward — integrador linear (porte verbatim do doador)', () => {
  it('salta para o alvo no primeiro tique quando o que falta cabe num passo', () => {
    // falta 0,05; passo = 0,5 s → 1,667
    expect(stepRampToward(0.95, 1.0, 0.5, 300)).toBe(1.0);
  });

  it('anda linearmente rumo ao alvo, dt/durationMs por tique', () => {
    expect(stepRampToward(0, 1, 0.05, 300)).toBeCloseTo(50 / 300, 6);
  });

  it('é simétrico na direção: a rampa de descida usa o mesmo passo', () => {
    const up = stepRampToward(0, 1, 0.1, 300);
    const down = stepRampToward(1, 0, 0.1, 300);
    expect(up + down).toBeCloseTo(1, 10);
    expect(up).toBeCloseTo(100 / 300, 6);
    expect(1 - down).toBeCloseTo(100 / 300, 6);
  });

  it('clampa o resultado a [0, 1] mesmo com entrada fora de faixa', () => {
    expect(stepRampToward(-0.5, 1, 0.001, 300)).toBeGreaterThanOrEqual(0);
    expect(stepRampToward(1.5, 1, 0.001, 300)).toBe(1);
  });

  it('assenta no alvo depois de exatamente durationMs de integração', () => {
    const dtPerTick = 1 / 60;
    const totalTicks = Math.ceil(300 / 1000 / dtPerTick);
    let r = 0;
    for (let i = 0; i < totalTicks; i++) r = stepRampToward(r, 1, dtPerTick, 300);
    expect(r).toBe(1);
  });

  it('não passa do ponto quando o alvo inverte no meio (cushion de histerese)', () => {
    let r = 0;
    for (let t = 0; t < 100; t += 16.67) r = stepRampToward(r, 1, 16.67 / 1000, 300);
    const peak = r;
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThan(1);
    for (let t = 0; t < 200; t += 16.67) r = stepRampToward(r, 0, 16.67 / 1000, 300);
    expect(r).toBeLessThan(peak);
    expect(r).toBeGreaterThanOrEqual(0);
  });

  it('devolve o alvo inalterado com durationMs <= 0 (defensivo, sem divisão por 0)', () => {
    expect(stepRampToward(0.5, 1, 0.1, 0)).toBe(1);
    expect(stepRampToward(0.5, 1, 0.1, -100)).toBe(1);
    expect(stepRampToward(0.5, 2, 0.1, 0)).toBe(1);
    expect(stepRampToward(0.5, -3, 0.1, 0)).toBe(0);
  });

  it('dt zero segura o valor corrente', () => {
    expect(stepRampToward(0.42, 1, 0, 300)).toBe(0.42);
    expect(stepRampToward(0.42, 0, 0, 300)).toBe(0.42);
  });

  it('trata dt não-finito como no-op (honra a segurança contra NaN do docstring)', () => {
    expect(stepRampToward(0.3, 1, NaN, 300)).toBe(0.3);
    expect(stepRampToward(0.3, 1, Infinity, 300)).toBe(0.3);
  });

  it('clampa o pico de dt da aba que volta do background (anima, não salta)', () => {
    // dt = 10 s clampado a 0,1 s → passo 0,333, não vai ao alvo
    expect(stepRampToward(0, 1, 10, 300)).toBeCloseTo((0.1 * 1000) / 300, 6);
    expect(stepRampToward(0, 1, 10, 300)).toBeLessThan(1);
  });

  it('preserva o invariante de soma do crossfade a cada tique (sprite + malha = 1)', () => {
    let r = 0;
    for (let t = 0; t < 500; t += 16.67) {
      r = stepRampToward(r, 1, 16.67 / 1000, 300);
      const spriteMult = 1 - r;
      const meshVis = r;
      expect(spriteMult + meshVis).toBeCloseTo(1, 10);
    }
  });

  it('[casa] a duração de 300 ms do doador entra pinada junto com o integrador', () => {
    expect(RAMP_DURATION_MS).toBe(300);
  });
});

// ------------------------------------------------------------
// 3b. Heroes genéricos — nearFade × farFade e a curva de presença (D2)
// ------------------------------------------------------------

describe('C2 — escrita idempotente do atributo', () => {
  it('não escreve quando o slot já tem o valor alvo', () => {
    expect(needsAttributeWrite(0.5, 0.5)).toBe(false);
    expect(needsAttributeWrite(0, 0)).toBe(false);
    expect(needsAttributeWrite(1, 1)).toBe(false);
  });

  it('escreve quando o alvo mudou, por menos que seja', () => {
    expect(needsAttributeWrite(0.5, 0.5000001)).toBe(true);
    expect(needsAttributeWrite(0, 1)).toBe(true);
    expect(needsAttributeWrite(1, 0)).toBe(true);
  });

  it('estado estável não levanta dirty-flag: reafirmar 100× escreve zero vezes', () => {
    const slot = 0.37;
    let escritas = 0;
    for (let i = 0; i < 100; i++) if (needsAttributeWrite(slot, 0.37)) escritas++;
    expect(escritas).toBe(0);
  });

  it('alvo NaN sempre escreve; -0 e +0 contam como iguais', () => {
    expect(needsAttributeWrite(0.5, NaN)).toBe(true);
    expect(needsAttributeWrite(NaN, NaN)).toBe(true);
    expect(needsAttributeWrite(-0, 0)).toBe(false);
  });

  it('a rampa reafirmada quadro a quadro só escreve enquanto se move', () => {
    let slot = 0;
    let r = 0;
    let escritas = 0;
    for (let i = 0; i < 40; i++) {
      r = stepRampToward(r, 1, 1 / 60, RAMP_DURATION_MS);
      if (needsAttributeWrite(slot, r)) {
        slot = r;
        escritas++;
      }
    }
    expect(slot).toBe(1);
    expect(escritas).toBeGreaterThan(0);
    expect(escritas).toBeLessThan(40); // depois de assentar em 1, para de escrever
  });
});


describe('C3 — reset de rampa e limpeza de foco', () => {
  it('resetRamp zera valor E alvo, e devolve objeto novo a cada chamada', () => {
    const a = resetRamp();
    expect(a).toEqual({ ramp: 0, target: 0 });
    a.ramp = 1;
    expect(resetRamp()).toEqual({ ramp: 0, target: 0 });
  });

  it('sem o reset, um refoco carregaria ramp=1 e apagaria a estrela nova', () => {
    // estrela A plenamente resolvida (ramp = 1 ⇒ sprite dela apagado)
    let estado = { ramp: 1, target: 1 };
    expect(1 - estado.ramp).toBe(0);
    // troca de foco para B: com reset, o sprite de B começa inteiro
    estado = resetRamp();
    expect(1 - estado.ramp).toBe(1);
  });

  it('clearFocus devolve o que a estrela que PERDE o foco recebe', () => {
    // (o campo `fade` morreu no M2 com o canal aFade — sobrou o foco)
    expect(clearFocus()).toEqual({ focus: FOCUS_OFF });
    expect(clearFocus().focus).toBe(FOCUS_OFF);
  });
});

describe('D3 — o canal dormente nasce NEUTRO', () => {
  it('FOCUS_OFF é 0 e FOCUS_ON é 1 — o corte em 0,5 é do consumidor do M3', () => {
    expect(FOCUS_OFF).toBe(0);
    expect(FOCUS_ON).toBe(1);
  });
});

describe('g — a rampa de cessão por dominância CORPO↔PONTO', () => {
  it('as bordas: 1 é a definição de dominância, 2,5 é DERIVADA da continuidade', () => {
    expect(DOMINANCIA_DO_CORPO.entra).toBe(1);
    expect(DOMINANCIA_DO_CORPO.plena).toBe(2.5);
    // a derivada máxima do smoothstep é 1,5/(hi−1); a compensação
    // disponível (dr/dr) é 1. Em 2,5 elas empatam — é a MENOR borda que
    // ainda garante φ′ = 1 − g′ ≥ 0 (ver a prova no módulo).
    expect(1.5 / (DOMINANCIA_DO_CORPO.plena - DOMINANCIA_DO_CORPO.entra)).toBe(1);
  });

  it('r ≤ 1 devolve 0 EXATO — é o que mantém as vistas bit-idênticas', () => {
    for (const r of [0, 0.1, 0.5, 0.9, 0.999999, 1]) expect(cessaoPorDominancia(r)).toBe(0);
  });

  it('r ≥ 2,5 devolve 1: o ponto virou detalhe dentro do corpo', () => {
    for (const r of [2.5, 3, 10, 1e6]) expect(cessaoPorDominancia(r)).toBe(1);
  });

  it('é monotônica e contínua — sem degrau em nenhum ponto da faixa', () => {
    const passo = 1e-4;
    let anterior = cessaoPorDominancia(0);
    for (let r = 0; r <= 4; r += passo) {
      const g = cessaoPorDominancia(r);
      expect(g).toBeGreaterThanOrEqual(anterior);
      // continuidade: o salto por passo é limitado pela derivada máxima
      expect(Math.abs(g - anterior)).toBeLessThanOrEqual(1.0 * passo + 1e-12);
      anterior = g;
    }
  });

  it('a derivada zera nas DUAS bordas (C¹): a cessão entra e sai sem quina', () => {
    const h = 1e-6;
    const d = (r: number) => (cessaoPorDominancia(r + h) - cessaoPorDominancia(r - h)) / (2 * h);
    expect(d(1)).toBeCloseTo(0, 4);
    expect(d(2.5)).toBeCloseTo(0, 4);
    expect(d(1.75)).toBeCloseTo(1, 4); // o máximo, exatamente 1
    // e nunca passa de 1 — a prova numérica da borda superior
    for (let r = 1; r <= 2.5; r += 1e-3) expect(d(r)).toBeLessThanOrEqual(1 + 1e-6);
  });

  it('entrada não-finita cede ZERO (direção segura: ponto inteiro)', () => {
    expect(cessaoPorDominancia(NaN)).toBe(0);
    expect(cessaoPorDominancia(Infinity)).toBe(0);
    expect(cessaoPorDominancia(-Infinity)).toBe(0);
  });
});

describe('o shader novo depois do M2 — aFade morto, vPeak fatorado', () => {
  it('o STAR_VERT não declara mais aFade e mantém a fatoração em vPeak', () => {
    const vert = readFileSync(new URL('../shaders/starShaders.ts', import.meta.url), 'utf8');
    // o canal da dominância morreu — a varredura invertida também vigia,
    // mas a FIAÇÃO viva se pina aqui: toda atenuação num fator só (alpha)
    // e vPeak carregando-o para núcleo, halo, espinhos e branqueamento.
    expect(vert).not.toContain('attribute float aFade;');
    expect(vert).not.toContain('float atten =');
    // ×uPr2 desde a parte 2 da invariância: o depósito nasce na régua de
    // referência (DPR 1 é ×1 exato). O commit da parte 2 esqueceu de
    // atualizar este pino e a suíte ficou vermelha em silêncio — o pino
    // agora cobra a linha VIVA, com a resolução dentro.
    expect(vert).toContain('vPeak = peak * alpha * uPr2;');
    // espinhos e branqueamento derivam de vPeak no FRAG (o clamp sat
    // morreu) — proibida é a DECLARAÇÃO do varying, não a menção nas
    // lápides (a regra de sempre da varredura invertida)
    expect(vert).not.toContain('varying float vSat');
    expect(vert).not.toContain('vSat =');
  });
});

// ------------------------------------------------------------
// 10. A ENTREGA PONTO↔CLARÃO (F3 da onda do Sol real) — a única
//     janela do Sol, e a cirurgia que separou as duas constantes.
// ------------------------------------------------------------
//
// A janela `deep` da Onda 4 existia para dissolver o disco INFLADO ao se
// chegar perto de casa. Com o Sol de raio físico não há o que dissolver,
// e a janela mudou de assunto sem mudar de números: ela agora é a
// ENTREGA entre as duas representações de PONTO do Sol — o vértice 0 da
// camada dos dez corpos e o clarão do `SunStar`.
//
// O que este bloco cobra é o que a fase prometeu: (1) as duas somam 1
// em toda distância, (2) as vistas oficiais fora da janela não se movem
// um bit, (3) a borda de cima da janela é EXATAMENTE onde a camada dos
// dez some, e (4) a constante do sistema solar ficou congelada e
// separada, com os três consumidores importando dela.

describe('a CIRURGIA da constante — duas perguntas, dois símbolos', () => {
  const engine = readFileSync(new URL('../core/engine.ts', import.meta.url), 'utf8');
  const rig = readFileSync(new URL('../cinematic/cameraRig.ts', import.meta.url), 'utf8');
  const escala = readFileSync(new URL('../escala.ts', import.meta.url), 'utf8');

  it('a constante do SISTEMA SOLAR está congelada em 0,05 pc, com âncora escrita', () => {
    expect(LIMIAR_SISTEMA_SOLAR_PC).toBe(0.05);
    // a âncora: 0,05 pc = 10.313 UA, contra os 35,4 UA de Plutão
    expect(LIMIAR_SISTEMA_SOLAR_PC * 206264.80624548031).toBeCloseTo(10313.24, 2);
    expect(escala).toContain('10.313 UA');
    expect(escala).toContain('35,4 UA');
  });

  it('os consumidores importam de `escala.ts`, e não do LOD', () => {
    // é a cirurgia: até a F3 os consumidores liam `DEEP_LIMIAR_PC`, o
    // mesmo símbolo que dizia onde o disco morria. Desde o M1 a camada
    // dos dez NÃO consome limiar nenhum (o corte de distância dela
    // morreu — planetas.test.ts cobra a ausência); ficam o plano de
    // corte (engine) e a velocidade do voo (rig).
    for (const [nome, txt] of [
      ['engine', engine],
      ['rig', rig],
    ] as const) {
      expect(txt, nome).toMatch(/import \{[^}]*\bLIMIAR_SISTEMA_SOLAR_PC\b[^}]*\} from '[^']*escala'/);
      // o `not` é sobre o IMPORT, não sobre a prosa: os comentários
      // desses arquivos citam o nome antigo de propósito, para contar o
      // que a cirurgia separou
      expect(txt, nome).not.toMatch(/import \{[^}]*\bDEEP_LIMIAR_PC\b/);
    }
    expect(engine).toContain('distFromSun >= LIMIAR_SISTEMA_SOLAR_PC');
    expect(rig).toContain('dPc >= LIMIAR_SISTEMA_SOLAR_PC');
    expect(engine).not.toMatch(/distFromSun >= 0\.05/);
  });

  it('e as fórmulas ANTIGAS do near/far e da velocidade seguem literais', () => {
    // o gate da Onda 4 era a igualdade bit a bit acima do limiar: se
    // alguém mexer num destes literais, ela morre em silêncio.
    expect(engine).toContain('THREE.MathUtils.clamp(distFromSun * 0.004, 0.001, 40)');
    expect(engine).toContain('THREE.MathUtils.clamp(distFromSun * 12, 60000, 400000)');
    expect(engine).toContain('const near = nearPlanePc(distFromSun, dSuperficiePc, raioCorpoPc);');
    expect(engine).toContain('const far = farPlanePc(distFromSun);');
    expect(rig).toContain('THREE.MathUtils.clamp(dPc * 0.02, 2, 600)');
    expect(rig).toContain('this.speed = velocidadeDeVoo(this.camera.position.length());');
    expect(rig).toContain('pisoDaRoda(this.camera.position.length()),');
  });

  // (a SABOTAGEM da igualdade LIMIAR_DA_ENTREGA_PC === LIMIAR_SISTEMA_SOLAR_PC
  // morreu com a entrega no M1: não existe mais janela para divergir da
  // camada — o Sol-ponto não é cortado por distância nenhuma.)
});
