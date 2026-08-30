// Serve: dono — o porteiro reprova juiz sem dono ou sem custo, e a catraca segura o teto
import { describe, expect, it } from 'vitest';
import { julgarProntidao } from './visual/chrome.mjs';
import {
  TETO_TOTAL_MIN,
  censo,
  furos,
  julgarCatraca,
  lerCusto,
  lerServe,
  quebraPorClasse,
  somaCustos,
} from './censo-dos-juizes.mjs';

describe('o censo dos juízes', () => {
  const { testes, visuais } = censo();

  it('enxerga todo arquivo de teste — teste novo invisível é o medo do dono', () => {
    expect(testes.length).toBeGreaterThan(50);
    expect(testes.every((t) => t.arquivo.endsWith('.test.ts') || t.arquivo.endsWith('.test.mjs'))).toBe(true);
  });

  it('lê o Serve das três classes e rejeita quem não responde', () => {
    expect(lerServe('// Serve: dono — o anel volta\n').classe).toBe('dono');
    expect(lerServe('// Serve: lei — Kepler manda\n').classe).toBe('lei');
    expect(lerServe('// Serve: chão — regressão do item 91\n').classe).toBe('chão');
    expect(lerServe('// Serve: chefe — classe inventada\n')).toBeNull();
    expect(lerServe('// Serve: dono\n')).toBeNull(); // sem travessão nem frase
    expect(lerServe('const x = 1;\n')).toBeNull();
  });

  it('lê o Custo pt-BR, com ~ marcando estimado, e rejeita o resto', () => {
    expect(lerCusto('// Custo: 2,5 min\n')).toEqual({ minutos: 2.5, estimado: false });
    expect(lerCusto('// Custo: 3 min\n')).toEqual({ minutos: 3, estimado: false });
    expect(lerCusto('// Custo: ~0,8 min (estimado no olho)\n')).toEqual({ minutos: 0.8, estimado: true });
    expect(lerCusto('// Custo: 2.5 min\n')).toBeNull(); // ponto não é vírgula
    expect(lerCusto('// Custo: rápido\n')).toBeNull();
    expect(lerCusto('const x = 1;\n')).toBeNull();
  });

  it('o porteiro acha os furos: teste sem Serve, juiz sem Custo — bancada fica de fora', () => {
    const cheio = { minutos: 1, estimado: false };
    const lote = {
      testes: [
        { arquivo: 'a.test.ts', papel: 'teste', serve: 'lei', custo: null },
        { arquivo: 'b.test.ts', papel: 'teste', serve: null, custo: null },
      ],
      visuais: [
        { arquivo: 'scripts/visual/j1.mjs', papel: 'juiz', serve: 'dono', custo: cheio },
        { arquivo: 'scripts/visual/j2.mjs', papel: 'juiz', serve: 'dono', custo: null },
        { arquivo: 'scripts/visual/j3.mjs', papel: 'juiz', serve: null, custo: null },
        { arquivo: 'scripts/visual/chrome.mjs', papel: 'harness', serve: null, custo: null },
        { arquivo: 'scripts/visual/diff-pixel.mjs', papel: 'ferramenta', serve: null, custo: null },
      ],
    };
    const f = furos(lote);
    expect(f.semServe).toEqual(['b.test.ts', 'scripts/visual/j3.mjs']);
    expect(f.semCusto).toEqual(['scripts/visual/j2.mjs', 'scripts/visual/j3.mjs']);
  });

  it('a quebra por classe e a soma de custos derivam do lote, nada decorado', () => {
    const q = quebraPorClasse([
      { serve: 'dono' },
      { serve: 'dono' },
      { serve: 'lei' },
      { serve: 'chão' },
      { serve: null },
    ]);
    expect(q).toEqual({ dono: 2, lei: 1, 'chão': 1, semDono: 1 });

    const s = somaCustos([
      { custo: { minutos: 2.5, estimado: false } },
      { custo: { minutos: 1.5, estimado: true } },
      { custo: null },
    ]);
    expect(s.total).toBeCloseTo(4);
    expect(s.estimados).toBe(1);
  });

  it('a catraca: desarmada não estoura; armada só estoura acima do teto', () => {
    expect(julgarCatraca(999, null)).toEqual({ armada: false, estoura: false });
    expect(julgarCatraca(10, 12)).toEqual({ armada: true, estoura: false });
    expect(julgarCatraca(12, 12).estoura).toBe(false); // no teto ainda cabe
    expect(julgarCatraca(12.1, 12).estoura).toBe(true);
    // ruído binário da soma não estoura: a comparação é em décimos de minuto
    expect(julgarCatraca(43.300000000000004, 43.3).estoura).toBe(false);
    // o pino do arquivo é o default — derivado, sem decorar o valor
    expect(julgarCatraca(0).armada).toBe(TETO_TOTAL_MIN !== null);
    expect(julgarCatraca(0).estoura).toBe(false);
  });

  it('amostra velha: o juiz do harness ainda morde o sinal quebrado', () => {
    // AGENTS §15: o teste só vale se apagar a fiação o fizer reprovar.
    // Se julgarProntidao deixar de acusar o fallback no alvo padrão,
    // este dente cai — e o chrome.test.mjs antigo cai junto.
    const r = julgarProntidao({ vias: Array(6).fill('quadros') });
    expect(r.erro).toBe(true);
    expect(r.mensagem).toContain('SINAL DE PRONTIDÃO QUEBRADO');
  });

  it('o papel da bancada não vaza: só juiz entra na conta de Custo do censo real', () => {
    const papeis = new Set(visuais.map((v) => v.papel));
    for (const p of papeis) expect(['juiz', 'harness', 'ferramenta']).toContain(p);
    const bancada = visuais.filter((v) => v.papel !== 'juiz').map((v) => v.arquivo.split('/').pop());
    // fase-da-grade desceu a bancada no fechamento do 99 — a soleira dele vive na suíte
    expect(bancada.sort()).toEqual(['chrome.mjs', 'diff-pixel.mjs', 'fase-da-grade.mjs', 'gpu-profile.mjs']);
  });
});
