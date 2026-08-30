// Serve: lei — ?samples= tem teto além do piso: nunca escreve notação científica no shader nem trava a GPU
// ============================================================
// O KNOB `?samples=` NÃO PODE ESCREVER QUALQUER COISA NO FONTE.
//
// `NSAMP` entra TEXTUAL no shader (`for (int i = 0; i < ${NSAMP}; i++)`), e
// até 2026-08-21 ele só tinha piso: `Math.max(2, Math.round(...))`. Um
// `?samples=1000000` nascia com um milhão de voltas por fragmento, e um
// `?samples=1e21` imprimia `1e+21` no lugar de um literal inteiro — GLSL
// inválido, galáxia sem compilar, nenhuma mensagem que explicasse.
//
// A régua é a de `?nebsteps=` (`passosDoRaymarch`, `world/nebula.ts`): passo
// de varredura que o visitante escreve na URL tem teto. O default (16) e o
// piso (2) NÃO mudam — nenhum pixel se move nesta mudança, e é isso que os
// dois primeiros casos cobram.
// ============================================================
import { describe, expect, it } from 'vitest';
import { TETO_DE_AMOSTRAS, amostrasDaExtincao } from './galaxyShaders';

describe('?samples= tem teto, e não só piso', () => {
  it('o default e a faixa útil passam intactos — a imagem não se move', () => {
    expect(amostrasDaExtincao(16)).toBe(16);
    expect(amostrasDaExtincao(8)).toBe(8);
    expect(amostrasDaExtincao(32)).toBe(32);
    expect(amostrasDaExtincao(TETO_DE_AMOSTRAS)).toBe(TETO_DE_AMOSTRAS);
  });

  it('o piso de 2 continua de pé', () => {
    expect(amostrasDaExtincao(0)).toBe(2);
    expect(amostrasDaExtincao(1)).toBe(2);
    expect(amostrasDaExtincao(-500)).toBe(2);
  });

  it('o teto barra o que travaria a GPU', () => {
    expect(amostrasDaExtincao(97)).toBe(TETO_DE_AMOSTRAS);
    expect(amostrasDaExtincao(1_000_000)).toBe(TETO_DE_AMOSTRAS);
    expect(amostrasDaExtincao(Number.MAX_SAFE_INTEGER)).toBe(TETO_DE_AMOSTRAS);
  });

  it('o que sai é sempre literal INTEIRO — nunca notação científica', () => {
    // era este o caminho que quebrava o fonte: `${1e21}` é "1e+21".
    for (const bruto of [1e21, 1e300, 7.5, 15.4, Number.MAX_VALUE]) {
      const n = amostrasDaExtincao(bruto);
      expect(Number.isInteger(n)).toBe(true);
      expect(String(n)).toMatch(/^\d+$/);
    }
  });
});
