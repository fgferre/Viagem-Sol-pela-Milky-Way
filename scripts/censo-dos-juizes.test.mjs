// Serve: dono — o censo acusa juiz sem dono na amostra, e um juiz velho ainda morde
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { julgarProntidao } from './visual/chrome.mjs';
import {
  AMOSTRA_COM_SERVE,
  TETO_DA_RODADA_MIN,
  amostraSemServe,
  censo,
  lerServe,
} from './censo-dos-juizes.mjs';

describe('o censo dos juízes', () => {
  const { testes, visuais } = censo();
  const todos = [...testes, ...visuais];

  it('enxerga todo arquivo de teste — teste novo invisível é o medo do dono', () => {
    expect(testes.length).toBeGreaterThan(50);
    expect(testes.every((t) => t.arquivo.endsWith('.test.ts') || t.arquivo.endsWith('.test.mjs'))).toBe(true);
  });

  it('a amostra declara Serve, e apagar a linha faz o censo acusar', () => {
    expect(TETO_DA_RODADA_MIN).toBe(15);
    expect(amostraSemServe(todos)).toEqual([]);
    for (const rel of AMOSTRA_COM_SERVE) {
      const fonte = readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
      expect(lerServe(fonte), rel).not.toBeNull();
      expect(lerServe(fonte.replace(/^\/\/ Serve:.*\n/m, '')), rel).toBeNull();
    }
  });

  it('amostra velha: o juiz do harness ainda morde o sinal quebrado', () => {
    // AGENTS §15: o teste só vale se apagar a fiação o fizer reprovar.
    // Se julgarProntidao deixar de acusar o fallback no alvo padrão,
    // este dente cai — e o chrome.test.mjs antigo cai junto.
    const r = julgarProntidao({ vias: Array(6).fill('quadros') });
    expect(r.erro).toBe(true);
    expect(r.mensagem).toContain('SINAL DE PRONTIDÃO QUEBRADO');
  });
});
