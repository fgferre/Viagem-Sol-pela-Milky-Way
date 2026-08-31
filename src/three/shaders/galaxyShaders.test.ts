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
import { GALAXY_VERT, TETO_DE_AMOSTRAS, amostrasDaExtincao } from './galaxyShaders';

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

// ============================================================
// A FIAÇÃO DA LEI DE TELA NA RÉGUA (item 46).
//
// O comportamento da lei é julgado em `estrela.test.ts` (o depósito por
// ângulo não pode depender da altura do buffer) e a prova de imagem é a
// escada 450→900→1800 do rastro `capturas/item46-fix-resolucao.json`.
// O que se cobra AQUI é que esta camada seja de fato quem a consome: a
// galáxia profunda era a única camada de ponto da casa sem correção de
// resolução, e é a fiação que a liga.
// ============================================================
describe('a galáxia profunda consome a lei de tela NA RÉGUA', () => {
  it('o vértice julga o ângulo na régua e escreve o rastro do buffer', () => {
    expect(GALAXY_VERT).toContain(
      'leiDeTelaNaRegua(px, uScreenH, escritoPx, fluxoDaTela);'
    );
    expect(GALAXY_VERT).toContain('gl_PointSize = escritoPx;');
    expect(GALAXY_VERT).toContain(
      'vAlpha = aAlpha * uFade * fluxoDaTela * unresolved(dist);'
    );
  });

  it('a lei em px de BUFFER não voltou pela porta dos fundos', () => {
    // o defeito de origem: `leiDeTela(px, …)` julga o ângulo em pixels do
    // buffer, e aí os joelhos andam com a resolução
    expect(GALAXY_VERT).not.toMatch(/leiDeTela\(px[,)]/);
    // e o `main` não pode consumir `shrink`/`subPix` crus — eles são
    // internos da lei, e é `fluxoDaTela` que já vem na régua
    const main = GALAXY_VERT.slice(GALAXY_VERT.indexOf('void main()'));
    expect(main).not.toMatch(/shrink|subPix/);
  });
});
