// ============================================================
// O `src/` NÃO TEM CICLO DE IMPORT — varrido, não lembrado.
//
// O ciclo `escada → escolha → escada` nasceu e morreu na mesma rodada de
// 22/08, achado por um detector escrito à mão e jogado fora em seguida.
// A casa não tem `madge` nem `eslint-plugin-import`, e um ciclo não
// quebra o vite: ele fica, entrega `undefined` na avaliação circular e
// só aparece no dia em que alguém troca a ordem dos imports. Detector
// descartável não protege nada — este é permanente e não custa
// dependência nenhuma.
//
// O QUE CONTA COMO ARESTA: import (ou re-export) de VALOR entre dois
// arquivos do `src/`. `import type` e `export type` ficam de fora — eles
// somem na compilação e não podem fechar ciclo em runtime. Pacote,
// folha de estilo e asset também: só se resolve o que é caminho
// relativo e existe como `.ts`/`.tsx` nesta árvore.
// ============================================================
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = dirname(fileURLToPath(import.meta.url));
const ARQUIVOS = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
  .filter((p) => /\.tsx?$/.test(p))
  .map((p) => resolve(SRC, p));
const EXISTE = new Set(ARQUIVOS);

/** comentário não é import — e há blocos que CITAM `export * from …` */
const semComentarios = (fonte: string) =>
  fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

/** `import … from 'x'`, `export … from 'x'` e o `import 'x'` seco */
const ESPECIFICADORES =
  /(?:^|\n)[ \t]*(?:import|export)[ \t]+(?!type[ \t])[^'";]*?from[ \t]*'([^']+)'|(?:^|\n)[ \t]*import[ \t]+'([^']+)'/g;

const resolverAlvo = (de: string, spec: string) => {
  if (!spec.startsWith('.')) return null; // pacote
  const base = resolve(dirname(de), spec);
  for (const cauda of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
    if (EXISTE.has(base + cauda)) return base + cauda;
  }
  return null; // .css, ?url, .json, asset
};

const GRAFO = new Map(
  ARQUIVOS.map((arquivo) => [
    arquivo,
    [
      ...semComentarios(readFileSync(arquivo, 'utf8')).matchAll(ESPECIFICADORES),
    ]
      .map((m) => resolverAlvo(arquivo, m[1] ?? m[2]))
      .filter((alvo): alvo is string => alvo !== null && alvo !== arquivo),
  ])
);

/** o primeiro ciclo achado, como caminho fechado; `null` se não há */
function acharCiclo(): string[] | null {
  const estado = new Map<string, 'aberto' | 'fechado'>();
  const pilha: string[] = [];
  const visitar = (no: string): string[] | null => {
    const marca = estado.get(no);
    if (marca === 'fechado') return null;
    if (marca === 'aberto') return [...pilha.slice(pilha.indexOf(no)), no];
    estado.set(no, 'aberto');
    pilha.push(no);
    for (const vizinho of GRAFO.get(no) ?? []) {
      const ciclo = visitar(vizinho);
      if (ciclo) return ciclo;
    }
    pilha.pop();
    estado.set(no, 'fechado');
    return null;
  };
  for (const no of ARQUIVOS) {
    const ciclo = visitar(no);
    if (ciclo) return ciclo;
  }
  return null;
}

describe('o src não tem ciclo de import', () => {
  it('a varredura acha o que procura — um padrão quebrado passaria calado', () => {
    expect(ARQUIVOS.length).toBeGreaterThan(100);
    const arestas = [...GRAFO.values()].reduce((n, v) => n + v.length, 0);
    expect(arestas).toBeGreaterThan(200);
    // uma aresta conhecida de cada forma: `import {}` e `export * from`
    expect(GRAFO.get(resolve(SRC, 'three/director.ts'))).toContain(
      resolve(SRC, 'three/cinematic/enquadramento.ts')
    );
    expect(GRAFO.get(resolve(SRC, 'three/cinematic/atlasRig.ts'))).toContain(
      resolve(SRC, 'three/cinematic/enquadramento.ts')
    );
  });

  it('nenhum ciclo', () => {
    const ciclo = acharCiclo();
    expect(ciclo && ciclo.map((f) => relative(SRC, f)).join(' → ')).toBeNull();
  });
});
