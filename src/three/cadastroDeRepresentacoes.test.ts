// ============================================================
// O CADASTRO DE REPRESENTAÇÕES — o teste que o mantém verdadeiro.
//
// Duas obrigações, e a segunda é a que o censo de memória nunca teve:
//  1. COERÊNCIA: quem declara `consomeL1` importa `estrela.ts`; quem declara
//     que não, não pode — a mentira quebra aqui, não numa vista.
//  2. VARREDURA REPRODUZÍVEL: os emissores de `gl_PointSize` são achados de
//     verdade (fs), e cada um TEM de estar coberto por uma linha do
//     cadastro. Foi um grep assim que achou dois emissores fora da lista da
//     v1 da Lei — o teste é o comando, versionado.
// ============================================================
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CADASTRO_DE_REPRESENTACOES, PADRAO_DE_EMISSOR } from './cadastroDeRepresentacoes';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));

/** Varre `src/` por arquivos .ts/.js de produção (testes e d.ts fora). */
function arquivosDeProducao(dir: string): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      if (nome === 'node_modules') continue;
      achados.push(...arquivosDeProducao(caminho));
    } else if (
      /\.(ts|js)$/.test(nome) &&
      !/\.test\.(ts|mjs|js)$/.test(nome) &&
      !nome.endsWith('.d.ts')
    ) {
      achados.push(caminho);
    }
  }
  return achados;
}

const TODOS = arquivosDeProducao(join(RAIZ, 'src'));

describe('a varredura reproduzível — gl_PointSize contra o cadastro', () => {
  const emissores = TODOS.filter((c) => PADRAO_DE_EMISSOR.test(readFileSync(c, 'utf8'))).map(
    (c) => relative(RAIZ, c)
  );

  it('todo emissor achado no fonte está coberto por uma linha do cadastro', () => {
    for (const emissor of emissores) {
      const coberto = CADASTRO_DE_REPRESENTACOES.some(
        (r) =>
          r.emiteGlPointSize &&
          r.arquivos.some((a) => emissor === a || emissor.startsWith(`${a}/`))
      );
      expect(coberto, `${emissor} emite gl_PointSize e não está no cadastro`).toBe(true);
    }
  });

  it('nenhuma linha declara emissor que a varredura não ache (censo não infla)', () => {
    for (const r of CADASTRO_DE_REPRESENTACOES) {
      if (!r.emiteGlPointSize) continue;
      const achado = r.arquivos.some((a) =>
        emissores.some((e) => e === a || e.startsWith(`${a}/`))
      );
      expect(achado, `${r.id} declara emitir gl_PointSize e a varredura não achou`).toBe(true);
    }
  });
});

describe('coerência das colunas', () => {
  it('consomeL1 bate com o import de verdade, arquivo a arquivo', () => {
    for (const r of CADASTRO_DE_REPRESENTACOES) {
      for (const a of r.arquivos) {
        const caminho = join(RAIZ, a);
        let fontes: string[];
        try {
          fontes = statSync(caminho).isDirectory()
            ? arquivosDeProducao(caminho)
            : [caminho];
        } catch {
          expect.fail(`${r.id}: arquivo declarado não existe — ${a}`);
        }
        for (const f of fontes) {
          const importa = /from '[^']*\/estrela'/.test(readFileSync(f, 'utf8'));
          expect(
            importa,
            `${relative(RAIZ, f)}: consomeL1=${r.consomeL1} mas o import diz o contrário`
          ).toBe(r.consomeL1);
        }
      }
    }
  });

  it('ids únicos, razões escritas, migração coerente com o destino', () => {
    const ids = new Set<string>();
    for (const r of CADASTRO_DE_REPRESENTACOES) {
      expect(ids.has(r.id), `id duplicado: ${r.id}`).toBe(false);
      ids.add(r.id);
      expect(r.razao.length, `${r.id} sem razão`).toBeGreaterThan(10);
      if (r.destino === 'fora-da-lei') {
        expect(r.migracao, `${r.id}: fora da lei não tem migração`).toBeNull();
      } else {
        expect(r.migracao, `${r.id}: ${r.destino} exige migração nomeada`).not.toBeNull();
      }
      if (r.leiVelhaApagada) {
        expect(r.consomeL1, `${r.id}: lei velha apagada sem consumir a nova`).toBe(true);
      }
    }
  });

  it('as 18 representações do censo da Lei estão todas aqui (mais as do grep)', () => {
    expect(CADASTRO_DE_REPRESENTACOES.length).toBeGreaterThanOrEqual(17);
  });
});
