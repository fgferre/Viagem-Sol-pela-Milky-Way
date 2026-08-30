// Serve: dono — o molde da mordida: rotação determinística, sujeito certo, sabotagem que muda o texto
//
// Só as peças puras: nada aqui sobe vitest de verdade nem cria worktree.
import { describe, expect, it } from 'vitest';
import {
  K_PADRAO,
  MUTACOES,
  agregarVeredito,
  candidatosDeSujeito,
  escolherAmostra,
  indiceDaSemanaIso,
  lerArgumentos,
  lerJustificativa,
  planejarAlvos,
  rotuloDaSemanaIso,
  sujeitoDe,
} from './mordida-amostral.mjs';

const mutacao = (nome) => MUTACOES.find((m) => m.nome.includes(nome));

describe('a rotação semanal', () => {
  it('a semana ISO indexa a contagem: mesma semana, mesmo índice; segunda vira a página', () => {
    expect(indiceDaSemanaIso(new Date(2024, 0, 1))).toBe(0); // segunda, âncora
    expect(indiceDaSemanaIso(new Date(2024, 0, 7))).toBe(0); // domingo, mesma semana
    expect(indiceDaSemanaIso(new Date(2024, 0, 8))).toBe(1); // segunda seguinte
    expect(rotuloDaSemanaIso(new Date(2024, 0, 1))).toBe('2024-W01');
    expect(rotuloDaSemanaIso(new Date(2024, 11, 30))).toBe('2025-W01'); // virada ISO
  });

  it('é determinística e semanas sucessivas varrem a lista inteira', () => {
    const lista = Array.from({ length: 10 }, (_, i) => `t${i}.test.ts`);
    expect(escolherAmostra(lista, 7, 3)).toEqual(escolherAmostra(lista, 7, 3));
    expect(escolherAmostra(lista, 0, 3)).toEqual(['t0.test.ts', 't1.test.ts', 't2.test.ts']);
    expect(escolherAmostra(lista, 1, 3)).toEqual(['t3.test.ts', 't4.test.ts', 't5.test.ts']);

    const vistos = new Set();
    for (let semana = 0; semana < Math.ceil(lista.length / 3); semana++) {
      for (const t of escolherAmostra(lista, semana, 3)) vistos.add(t);
    }
    expect(vistos.size).toBe(lista.length);

    expect(escolherAmostra(lista, -2, 3)).toHaveLength(3); // índice antes da âncora não quebra
    expect(escolherAmostra(lista, 5, 99)).toEqual(lista); // K maior que a lista traz todos
    expect(escolherAmostra([], 5, 3)).toEqual([]);
  });

  it('argumentos: padrão K=3, número vira K, --todos vira todos, resto é erro', () => {
    expect(lerArgumentos([])).toEqual({ todos: false, k: K_PADRAO });
    expect(lerArgumentos(['5'])).toEqual({ todos: false, k: 5 });
    expect(lerArgumentos(['--todos'])).toEqual({ todos: true, k: K_PADRAO });
    expect(() => lerArgumentos(['0'])).toThrow();
    expect(() => lerArgumentos(['--rapido'])).toThrow();
  });
});

describe('o mapa teste→sujeito', () => {
  it('acha o sujeito ao lado — .ts primeiro, .tsx de componente depois — e pula certo', () => {
    expect(sujeitoDe('src/lib/foo.test.ts')).toBe('src/lib/foo.ts');
    expect(sujeitoDe('scripts/visual/bar.test.mjs')).toBe('scripts/visual/bar.mjs');
    expect(sujeitoDe('src/lib/foo.ts')).toBeNull(); // não é teste
    expect(candidatosDeSujeito('src/App.test.ts')).toEqual(['src/App.ts', 'src/App.tsx']);

    const existem = new Set(['src/a.ts', 'src/App.tsx']);
    const alvos = planejarAlvos(['src/a.test.ts', 'src/App.test.ts', 'src/b.test.ts'], (s) => existem.has(s));
    expect(alvos).toEqual([
      { teste: 'src/a.test.ts', sujeito: 'src/a.ts' },
      { teste: 'src/App.test.ts', sujeito: 'src/App.tsx' },
      { teste: 'src/b.test.ts', sujeito: null },
    ]);
  });
});

describe('as sabotagens', () => {
  it('primeiro < vira <=, sem tocar <= nem << já existentes', () => {
    const m = mutacao('< vira');
    expect(m.aplicar('if (a < b) return a;')).toBe('if (a <= b) return a;');
    expect(m.aplicar('if (a <= b) return a;')).toBeNull();
    expect(m.aplicar('const x = 1 << 2;')).toBeNull();
    expect(m.aplicar('const x = 1;')).toBeNull();
  });

  it('primeiro true vira false, só a palavra inteira', () => {
    const m = mutacao('true');
    expect(m.aplicar('const ligado = true;')).toBe('const ligado = false;');
    expect(m.aplicar('const s = "untrue";')).toBeNull();
  });

  it('primeiro + numérico vira -, sem tocar ++ nem +=', () => {
    const m = mutacao('+ numérico');
    expect(m.aplicar('const x = a + b;')).toBe('const x = a - b;');
    expect(m.aplicar('i++;')).toBeNull();
    expect(m.aplicar('total += 1;')).toBeNull();
  });

  it('primeiro return de função exportada vira undefined; sem export, nada', () => {
    const m = mutacao('return');
    expect(m.aplicar('export function dobro(a) {\n  return a * 2;\n}\n')).toBe(
      'export function dobro(a) {\n  return undefined;\n}\n'
    );
    expect(m.aplicar('function dobro(a) { return a * 2; }')).toBeNull();
    expect(m.aplicar('export function nada() {}')).toBeNull();
  });

  it('toda sabotagem aplicada muda o texto de verdade', () => {
    const fonte = 'export function f(a) {\n  if (a < 2 && true) return a + 1;\n  return a;\n}\n';
    for (const m of MUTACOES) {
      const mutado = m.aplicar(fonte);
      expect(mutado, m.nome).not.toBeNull();
      expect(mutado, m.nome).not.toBe(fonte);
    }
  });
});

describe('o veredito', () => {
  it('uma sabotagem pega basta para morder; nenhuma pega, nenhuma aplicada = não mordeu', () => {
    expect(agregarVeredito([{ pegou: false }, { pegou: true }])).toEqual({ morde: true, tentadas: 2 });
    expect(agregarVeredito([{ pegou: false }, { pegou: false }])).toEqual({ morde: false, tentadas: 2 });
    expect(agregarVeredito([])).toEqual({ morde: false, tentadas: 0 });
  });

  it('a justificativa mora no próprio teste e exige frase; fora do formato, não vale', () => {
    expect(
      lerJustificativa('// Mordida: justificada — pina defeitos pontuais; o resto é do navegador\n')
    ).toBe('pina defeitos pontuais; o resto é do navegador');
    expect(lerJustificativa('// Serve: chão — x\n// Mordida: justificada — frase\nit()')).toBe('frase');
    expect(lerJustificativa('// Mordida: justificada —\n')).toBeNull();
    expect(lerJustificativa('// Mordida: talvez — frase\n')).toBeNull();
    expect(lerJustificativa('')).toBeNull();
  });
});
