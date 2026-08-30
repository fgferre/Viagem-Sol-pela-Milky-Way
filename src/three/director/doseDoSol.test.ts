// Serve: lei — a dose de ocupação do arranque só cresce e termina em 1 exato, nunca empurra o Sol para trás
// A DOSE DO ARRANQUE — o que substituiu a torção de fase (item 5).
// O oráculo cobra as duas coisas que fazem dela uma assistência e não um
// segundo universo: ela é MONOTÔNICA e some EXATAMENTE no fim da janela.
import { describe, expect, it } from 'vitest';
import { DOSE_NO_ARRANQUE, DRAMA_T0, DRAMA_T1, doseDaDramaturgia } from './doseDoSol';

/** o envelope de atividade do núcleo (`world/sol/activity.js`) */
const envelope = (fase: number) => 0.1 + 1.06 * Math.pow(Math.sin(Math.PI * fase), 1.15);

describe('a dose de ocupação do arranque', () => {
  it('vale a dose no início da janela e 1 EXATO no fim', () => {
    expect(doseDaDramaturgia(0)).toBe(DOSE_NO_ARRANQUE);
    expect(doseDaDramaturgia(DRAMA_T0)).toBe(DOSE_NO_ARRANQUE);
    // exato, e não "1 menos um ULP": o núcleo multiplica por ele, e é
    // essa exatidão que faz dose plena e ausência de dose desenharem o
    // mesmo Sol bit a bit
    expect(doseDaDramaturgia(DRAMA_T1)).toBe(1);
    expect(doseDaDramaturgia(193)).toBe(1);
  });

  it('fora do filme não há dose: 1, sempre', () => {
    expect(doseDaDramaturgia(undefined)).toBe(1);
    expect(doseDaDramaturgia(Number.NaN)).toBe(1);
    expect(doseDaDramaturgia(-5)).toBe(DOSE_NO_ARRANQUE);
  });

  it('sobe sem degrau e sem recuo — nunca "empurra para trás"', () => {
    let anterior = -1;
    for (let t = 0; t <= 40; t += 0.25) {
      const d = doseDaDramaturgia(t);
      expect(d).toBeGreaterThanOrEqual(anterior);
      expect(d).toBeGreaterThanOrEqual(DOSE_NO_ARRANQUE);
      expect(d).toBeLessThanOrEqual(1);
      anterior = d;
    }
  });

  it('0,13 é MEDIDO: reproduz a ocupação que a torção de fase dava', () => {
    // a torção punha a fase em 0,02 (mínimo profundo); a data do filme
    // (2026-01) vive perto da fase 0,60. A dose é a razão dos dois
    // envelopes — o arranque fica igual ao de antes SEM mentir a data.
    const razao = envelope(0.02) / envelope(0.6);
    expect(DOSE_NO_ARRANQUE).toBeCloseTo(razao, 2);
  });
});
