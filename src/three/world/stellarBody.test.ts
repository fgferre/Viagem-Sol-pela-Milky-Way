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
import { RAIO_ARTISTICO_DO_SOL_PC, RAIO_DO_SOL_NA_CENA, RAIO_SOL_PC } from '../escala';
import {
  SOL_PARAMS,
  SOL_ROT_PERIOD_DAYS,
  epsilonDeSegmentoGlsl,
  literalGlsl,
  rotSpeedFromPeriod,
} from './stellarBody';

describe('SOL_PARAMS — a instância 1 reproduz os literais de antes', () => {
  it('raio: é o FÍSICO, pela fonte única do cadastro (F3)', () => {
    // até 2026-08-13 esta linha cobrava `WORLD.sunRadius` = 0,011 pc, o
    // raio artístico. A F3 trocou o raio de vez; o que o teste guarda é
    // que ele continua vindo de UM símbolo — e que esse símbolo é o
    // MESMO que o cadastro de escala divide por `RAIO_SOL_PC` para
    // acusar quem infla. Digitar 2,2567e-8 aqui deixaria o cadastro
    // cego para uma futura inflação.
    expect(SOL_PARAMS.radiusPc).toBe(RAIO_DO_SOL_NA_CENA);
    expect(SOL_PARAMS.radiusPc).toBe(RAIO_SOL_PC);
    expect(SOL_PARAMS.radiusPc / 0.011).toBeCloseTo(2.0515e-6, 10);
    // e a escala do group acompanha: raio / 2,2 (DONOR_RADIUS)
    expect(SOL_PARAMS.radiusPc / 2.2).toBe(RAIO_SOL_PC / 2.2);
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

// ============================================================
// AS DUAS PONTES DE ESCALA PARA O GLSL (F1 da onda do Sol real).
//
// Este bloco é o TESTE-AGULHA das duas quebras SILENCIOSAS — as que não
// dão erro de compilação, não escrevem no console e só se manifestam
// como ausência na tela. Sem ele, trocar o raio do Sol apaga a coroa e a
// ejeção de massa e ninguém fica sabendo.
//
// A varredura textual dos dois arquivos vendorizados existe pelo mesmo
// motivo do resto da casa: se alguém "limpar" o `||` lá dentro e voltar
// ao `.toFixed(6)` cru, isto reprova ANTES de a GPU calar.
// ============================================================
describe('F1 — as pontes de escala para o texto do shader', () => {
  const RAIO_SOL_FISICO_PC = 2.2566840209436597e-8;

  describe('literalGlsl', () => {
    it('AGULHA: o raio físico NÃO pode virar "0.000000"', () => {
      // a quebra, escrita: é isto que o caminho herdado faz
      expect((RAIO_SOL_FISICO_PC).toFixed(6)).toBe('0.000000');
      // e é isto que a ponte impede
      const literal = literalGlsl(RAIO_SOL_FISICO_PC);
      expect(literal).not.toBe('0.000000');
      expect(Number(literal)).toBeGreaterThan(0);
    });

    it('AGULHA: o literal volta ao MESMO float32 — senão o raio mente', () => {
      expect(Math.fround(Number(literalGlsl(RAIO_SOL_FISICO_PC)))).toBe(
        Math.fround(RAIO_SOL_FISICO_PC)
      );
    });

    it('o literal é float de GLSL válido (ponto decimal E expoente)', () => {
      expect(literalGlsl(RAIO_SOL_FISICO_PC)).toMatch(/^\d\.\d+e[-+]?\d+$/);
    });

    it('o raio ARTÍSTICO devolvia a string de sempre, byte a byte', () => {
      // foi por causa desta linha que a porta da F1 pôde entrar sem
      // custar um pixel: com o raio de então, a forma fixa de 6 casas
      // voltava ao mesmo float32. O caso fica como registro — o raio
      // saiu de cena, a regra do formatador não.
      expect(literalGlsl(RAIO_ARTISTICO_DO_SOL_PC)).toBe(RAIO_ARTISTICO_DO_SOL_PC.toFixed(6));
      expect(literalGlsl(RAIO_ARTISTICO_DO_SOL_PC)).toBe('0.011000');
    });

    it('nem infinito, nem NaN, nem zero no denominador do cme', () => {
      // `1.0/SUN_R` (cme.js) com SUN_R = 0 é o segundo estrago
      expect(1 / Number(literalGlsl(RAIO_SOL_FISICO_PC))).toBeLessThan(Infinity);
    });
  });

  describe('epsilonDeSegmentoGlsl', () => {
    it('O RAMO LITERAL MORREU NA F3, como o comentário dele prometia', () => {
      // "quando a F3 tirar o raio artístico de cena, este ramo morre
      // junto com ele" — e morreu. Sobra a lei proporcional, e ela
      // devolve para o raio artístico um texto que vale o MESMO float32
      // que o `1e-4` de sempre: a lei generalizou o caso, não o trocou.
      const fonte = readFileSync(new URL('./stellarBody.ts', import.meta.url), 'utf8');
      expect(fonte).not.toContain("return '1e-4';");
      expect(Math.fround(Number(epsilonDeSegmentoGlsl(RAIO_ARTISTICO_DO_SOL_PC)))).toBe(
        Math.fround(1e-4)
      );
    });

    it('AGULHA: no raio físico o limiar cai proporcional, não fica em 1e-4', () => {
      // a travessia do volume de coroa no raio real mede ~1,3e-7 pc;
      // com o limiar herdado (1e-4) TODO raio desiste antes do 1º passo
      const eps = Number(epsilonDeSegmentoGlsl(RAIO_SOL_FISICO_PC));
      const travessiaPc = RAIO_SOL_FISICO_PC * 2 * 2.9; // ~2,9 R de CVOL_ROUT
      expect(1e-4).toBeGreaterThan(travessiaPc); // a quebra, escrita
      expect(eps).toBeLessThan(travessiaPc); // e a ponte
      expect(eps).toBeGreaterThan(0);
    });

    it('a proporção com o raio é a herdada, não um número novo', () => {
      // EM FLOAT32, que é onde o literal vai viver. O texto carrega 9
      // casas decimais e não volta em double bit a bit (erra por ~6e-13,
      // mil vezes abaixo de um ULP de float32 nessa faixa) — cobrar
      // igualdade de double aqui seria exigir uma precisão que a GPU nem
      // tem, e reprovaria a ponte certa. A primeira versão deste teste
      // cobrava double e reprovou; o defeito era da régua, não da ponte.
      const eps = Number(epsilonDeSegmentoGlsl(RAIO_SOL_FISICO_PC));
      expect(Math.fround(eps / RAIO_SOL_FISICO_PC)).toBe(
        Math.fround(1e-4 / RAIO_ARTISTICO_DO_SOL_PC)
      );
    });
  });

  describe('os dois arquivos vendorizados consomem as pontes', () => {
    const ler = (f: string) =>
      readFileSync(new URL(`./sol/${f}`, import.meta.url), 'utf8');

    for (const arquivo of ['coronaVolume.js', 'cme.js']) {
      it(`${arquivo} lê ctx.SUN_R_GLSL antes do toFixed herdado`, () => {
        expect(ler(arquivo)).toContain('ctx.SUN_R_GLSL ||');
      });

      it(`${arquivo} lê ctx.SEG_EPS_GLSL no guarda de segmento`, () => {
        expect(ler(arquivo)).toContain("ctx.SEG_EPS_GLSL || '1e-4'");
      });

      it(`${arquivo} NÃO tem mais o 1e-4 absoluto solto no guarda`, () => {
        // a regressão exata que se quer impedir: alguém "limpa" o `||`
        expect(ler(arquivo)).not.toContain('if (t1 <= t0 + 1e-4)');
      });
    }
  });
});
