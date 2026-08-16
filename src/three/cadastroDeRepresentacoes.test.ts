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
  /**
   * A REGRA MUDOU NO M1, e o motivo é um arquivo com dois donos:
   * `planetas.ts` desenha o `sol-ponto` (consome a lei desde o M1, fiado
   * pelo director) E os nove `planetas` (que só migram no M4). A regra
   * antiga — todo arquivo da entrada tem de bater com a coluna — não
   * distingue duas representações no mesmo arquivo. A regra nova:
   *   · quem CONSOME tem PELO MENOS UM arquivo importando `estrela.ts`
   *     (é onde a fiação mora — e a coluna `arquivos` diz qual);
   *   · quem NÃO consome não pode ter NENHUM arquivo importando — exceto
   *     arquivo partilhado com uma entrada consumidora, que é cobrado
   *     pela regra dela.
   * A mentira continua quebrando aqui: declarar consumo sem import cai
   * na primeira; importar a lei numa camada não migrada cai na segunda.
   */
  it('consomeL1 bate com o import de verdade, entrada a entrada', () => {
    const fontesDe = (r: (typeof CADASTRO_DE_REPRESENTACOES)[number]): string[] => {
      const fontes: string[] = [];
      for (const a of r.arquivos) {
        const caminho = join(RAIZ, a);
        try {
          fontes.push(
            ...(statSync(caminho).isDirectory() ? arquivosDeProducao(caminho) : [caminho])
          );
        } catch {
          expect.fail(`${r.id}: arquivo declarado não existe — ${a}`);
        }
      }
      return fontes;
    };
    const importa = (f: string) => /from '[^']*\/estrela'/.test(readFileSync(f, 'utf8'));
    // os arquivos reivindicados por alguma entrada CONSUMIDORA: neles o
    // import é assunto dela, não das entradas irmãs que os partilham
    const deQuemConsome = new Set(
      CADASTRO_DE_REPRESENTACOES.filter((r) => r.consomeL1).flatMap(fontesDe)
    );
    for (const r of CADASTRO_DE_REPRESENTACOES) {
      const fontes = fontesDe(r);
      if (r.consomeL1) {
        expect(
          fontes.some(importa),
          `${r.id}: consomeL1=true e NENHUM arquivo da entrada importa estrela.ts`
        ).toBe(true);
      } else {
        for (const f of fontes) {
          if (deQuemConsome.has(f)) continue;
          expect(
            importa(f),
            `${relative(RAIZ, f)}: consomeL1=false mas o arquivo importa estrela.ts`
          ).toBe(false);
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

  it('o censo da Lei está inteiro (a entrada sunstar MORREU no M1)', () => {
    expect(CADASTRO_DE_REPRESENTACOES.length).toBeGreaterThanOrEqual(16);
    // representação morta não tem linha: o censo é do que existe, e a
    // varredura invertida é quem vigia o nome enterrado
    expect(CADASTRO_DE_REPRESENTACOES.some((r) => r.id === 'sunstar')).toBe(false);
  });
});
