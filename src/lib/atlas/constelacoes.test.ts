// Serve: lei — toda sigla de constelação usada no catálogo vivo tem entrada nas 88, sem repetir
// ============================================================
// A TABELA DAS 88 — cobrada contra o CATÁLOGO de verdade, não contra si
// mesma. O que pode dar errado aqui é uma sigla viva no `stars_meta.json`
// sem entrada no mapa: a ficha calaria a designação de estrelas inteiras e
// ninguém veria a falta, porque calar é exatamente o que ela faz quando não
// sabe.
// ============================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { StarsMeta } from '../../three/config';
import { CONSTELACOES, designacaoDeBayer } from './constelacoes';

const meta = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../public/data/stars_meta.json', import.meta.url)),
    'utf8'
  )
) as StarsMeta;

describe('as 88 constelações', () => {
  it('são 88, nem uma a mais nem uma a menos', () => {
    expect(Object.keys(CONSTELACOES)).toHaveLength(88);
  });

  it('toda sigla do catálogo tem genitivo — nenhuma estrela cala por falta de tabela', () => {
    const usadas = new Set(meta.named.map((s) => s.c).filter(Boolean) as string[]);
    // o catálogo cobre o céu inteiro: as 1.726 nomeadas visitam as 88
    expect(usadas.size).toBe(88);
    for (const sigla of usadas) {
      expect(CONSTELACOES[sigla], sigla).toBeTruthy();
    }
  });

  it('nenhum genitivo repete — sigla trocada de linha é o erro que isto pega', () => {
    expect(new Set(Object.values(CONSTELACOES)).size).toBe(88);
  });

  it('monta a designação de Bayer, e cala quando não sabe', () => {
    expect(designacaoDeBayer('α', 'CMa')).toBe('α Canis Majoris');
    expect(designacaoDeBayer('γ²', 'Vel')).toBe('γ² Velorum');
    // sem letra, sem sigla, ou com sigla que não existe: nada — "α CMa" na
    // tela seria a casa mostrando o código de coluna do catálogo.
    expect(designacaoDeBayer(undefined, 'CMa')).toBeNull();
    expect(designacaoDeBayer('α', undefined)).toBeNull();
    expect(designacaoDeBayer('α', 'XXX')).toBeNull();
  });

  it('Sirius carrega a letra e a sigla no catálogo publicado', () => {
    // A prova de que o dado ATRAVESSOU: antes de 22/08 a estrela de nome
    // próprio perdia a designação inteira, porque `label` juntava letra e
    // sigla numa string e o nome próprio a substituía.
    const sirius = meta.named.find((s) => s.n === 'Sirius')!;
    expect(sirius.b).toBe('α');
    expect(sirius.c).toBe('CMa');
    expect(designacaoDeBayer(sirius.b, sirius.c)).toBe('α Canis Majoris');
  });
});
