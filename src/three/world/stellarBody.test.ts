// ============================================================
// Oráculo de `StellarParams` (Onda 3, fase 2).
//
// O que este arquivo guarda é UMA afirmação: a parametrização não mudou
// a instância 1. Cada campo de `SOL_PARAMS` é conferido contra o literal
// que estava solto dentro de `novoSol.ts` antes do `git mv` — os valores
// abaixo foram lidos do arquivo no commit 87d9b9b, não copiados da nova
// tabela (copiar da tabela testaria a tabela contra si mesma).
//
// O gate de verdade desta fase é o md5 do `ab-identidade`; isto aqui é o
// alarme BARATO, o que quebra em 200 ms em vez de 45 min de GPU — e o que
// diz POR QUE quebrou.
//
// Não instancia a classe: o construtor pede WebGLRenderer, câmera e
// `window.location.search`. O que se testa é o CONTRATO de parâmetros,
// que é puro.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WORLD } from '../config';
import { SOL_PARAMS, SOL_ROT_PERIOD_DAYS, rotSpeedFromPeriod } from './stellarBody';

describe('SOL_PARAMS — a instância 1 reproduz os literais de antes', () => {
  it('raio: é o MESMO WORLD.sunRadius, não um 0,011 redigitado', () => {
    expect(SOL_PARAMS.radiusPc).toBe(WORLD.sunRadius);
    expect(SOL_PARAMS.radiusPc).toBe(0.011);
    // e a escala do group sai igual: 0,011 / 2,2 (DONOR_RADIUS)
    expect(SOL_PARAMS.radiusPc / 2.2).toBe(0.011 / 2.2);
  });

  it('rotação: o período devolve EXATAMENTE o 0,042 do doador', () => {
    // não `toBeCloseTo` — a igualdade tem de ser de bit. Um ULP aqui
    // seria regressão de md5 assim que o relógio voltasse a andar.
    expect(rotSpeedFromPeriod(SOL_PARAMS.rotPeriodDays)).toBe(0.042);
    expect(SOL_PARAMS.rotPeriodDays).toBe(SOL_ROT_PERIOD_DAYS);
    expect(SOL_ROT_PERIOD_DAYS).toBe(25.38);
  });

  it('rotação: a âncora é a RELAÇÃO — meio período gira o dobro', () => {
    expect(rotSpeedFromPeriod(SOL_ROT_PERIOD_DAYS / 2)).toBeCloseTo(0.084, 12);
    expect(rotSpeedFromPeriod(SOL_ROT_PERIOD_DAYS * 4)).toBeCloseTo(0.0105, 12);
  });

  it('rotação: período inválido não gira (0), nunca NaN', () => {
    expect(rotSpeedFromPeriod(0)).toBe(0);
    expect(rotSpeedFromPeriod(-1)).toBe(0);
    expect(rotSpeedFromPeriod(NaN)).toBe(0);
    expect(rotSpeedFromPeriod(Infinity)).toBe(0);
  });

  it('inclinação, sementes e janelas do ciclo batem os literais antigos', () => {
    expect(SOL_PARAMS.tiltRad).toBe(0.1265); // ~7,25°
    expect(SOL_PARAMS.seed).toBe(20260803);
    expect(SOL_PARAMS.cyclePhaseMin).toBe(0.02);
    expect(SOL_PARAMS.cyclePhaseMax).toBe(0.5);
    expect(SOL_PARAMS.dramaT0).toBe(5);
    expect(SOL_PARAMS.dramaT1).toBe(29);
    expect(SOL_PARAMS.knobPrefix).toBe('sol');
    // a fase inicial do ciclo é derivada da fase mínima: 1206 s
    expect((1 + SOL_PARAMS.cyclePhaseMin - 0.35) * 1800).toBe(1206);
  });

  it('os 3 streams derivados da semente-mãe continuam nos mesmos XOR', () => {
    expect(SOL_PARAMS.seed ^ 0x59075eed).toBe(20260803 ^ 0x59075eed);
    expect(SOL_PARAMS.seed ^ 0x5eedc0de).toBe(20260803 ^ 0x5eedc0de);
    expect(SOL_PARAMS.seed ^ 0x00c0e5ed).toBe(20260803 ^ 0x00c0e5ed);
  });

  it('os 14 knobs são a tabela do doador, valor por valor', () => {
    expect(SOL_PARAMS.knobs).toEqual({
      spots: 1, cycle: 1, lapse: 0, speed: 1, pmode: 0,
      plageglow: 0.35, halo: 0.55, ray: 0.9, cact: 0.5,
      // cme 1,4 e não os 0,9 do doador: recalibrado contra o nosso ACES
      loops: 0.55, fprom: 0.55, cvol: 0.5, cme: 1.4, edu: 0,
    });
  });

  it('activityLevel = 1 é NEUTRO por multiplicação, bit a bit', () => {
    // o construtor faz `kn.spots *= activityLevel` ANTES do override de
    // URL; com 1 o produto é o mesmo bit, e é por isso que a promoção
    // não move um pixel
    expect(SOL_PARAMS.activityLevel).toBe(1);
    expect(SOL_PARAMS.knobs.spots * SOL_PARAMS.activityLevel).toBe(1);
    expect(SOL_PARAMS.knobs.cycle * SOL_PARAMS.activityLevel).toBe(1);
    // e o parâmetro é VIVO: metade da atividade, metade dos dois knobs
    expect(SOL_PARAMS.knobs.spots * 0.5).toBe(0.5);
  });

  it('teffK e convective nascem RESERVADOS: declarados, sem consumidor', () => {
    expect(SOL_PARAMS.teffK).toBe(5772);
    expect(SOL_PARAMS.convective).toBe(true);
    // a prova de que são reservados: o módulo não os lê em lugar nenhum
    // além da própria tabela (a lei de cor por classe é da Onda 7, e o
    // núcleo do doador não tem caminho radiativo)
    const src = readFileSync(new URL('./stellarBody.ts', import.meta.url), 'utf8');
    expect(src.match(/params\.teffK|p\.teffK/g)).toBeNull();
    expect(src.match(/params\.convective|p\.convective/g)).toBeNull();
  });
});

describe('o que NÃO foi promovido está declarado, não escondido', () => {
  const src = readFileSync(new URL('./stellarBody.ts', import.meta.url), 'utf8');

  it('o 2.2 do doador segue duplicado em sol/sun.js — e o texto diz isso', () => {
    // D5: os 14 vendorizados ficam intocados, então o raio interno do
    // doador continua sendo DOIS literais que precisam concordar à mão.
    // Se alguém "consertar" um dos lados sem o outro, quebra em silêncio;
    // este teste garante ao menos que o aviso continua no lugar.
    const sunJs = readFileSync(new URL('./sol/sun.js', import.meta.url), 'utf8');
    expect(sunJs).toContain('var SUN_RADIUS = 2.2;');
    expect(src).toContain('const DONOR_RADIUS = 2.2;');
    expect(src).toContain('sol/sun.js:13');
  });

  it('a paleta H-alfa e a captura de câmera do CME estão nomeadas', () => {
    expect(src).toContain('PALETA H-alfa');
    expect(src).toContain('sol/cme.js:10');
  });
});
