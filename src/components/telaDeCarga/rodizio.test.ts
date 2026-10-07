// ============================================================
// O RODÍZIO DAS TELAS DE CARREGAMENTO — o pedido dele ("revezar é melhor
// do que sortear"): cada visita mostra a seguinte à última vista neste
// aparelho, nunca a mesma duas vezes seguidas quando há mais de uma, e
// um storage quebrado nunca impede a tela de aparecer.
// ============================================================
import { afterEach, describe, expect, it } from 'vitest';
import { ORDEM_DAS_TELAS, TELAS_PRONTAS, escolherTela, proximaTela } from './rodizio';
import type { IdDaTela } from './cena';

const QUATRO: readonly IdDaTela[] = ['nascer', 'ceu', 'bercario', 'galaxia'];

/** O storage do navegador encenado, com o que foi gravado à mostra. */
function comStorage(inicial: string | null, quebrado = false): { gravado: string | null } {
  const estado = { gravado: inicial };
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: () => {
        if (quebrado) throw new Error('storage bloqueado');
        return estado.gravado;
      },
      setItem: (_chave: string, valor: string) => {
        if (quebrado) throw new Error('storage bloqueado');
        estado.gravado = valor;
      },
    },
  };
  return estado;
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe('proximaTela', () => {
  it('a primeira visita vê a primeira da ordem', () => {
    expect(proximaTela(undefined, QUATRO)).toBe('nascer');
  });

  it('anda pela ordem e volta ao começo, sem repetir', () => {
    let ultima: IdDaTela | undefined;
    const vistas: IdDaTela[] = [];
    for (let i = 0; i < 8; i++) {
      ultima = proximaTela(ultima, QUATRO);
      vistas.push(ultima);
    }
    expect(vistas).toEqual([...QUATRO, ...QUATRO]);
  });

  it('lixo no storage, ou uma tela que saiu do rodízio, não trava nada', () => {
    expect(proximaTela('xyz', QUATRO)).toBe('nascer');
    expect(proximaTela(42, QUATRO)).toBe('nascer');
    // `bercario` fora: depois de `ceu` vem a próxima que existe
    expect(proximaTela('ceu', ['nascer', 'ceu', 'galaxia'])).toBe('galaxia');
    expect(proximaTela('bercario', ['nascer', 'ceu', 'galaxia'])).toBe('galaxia');
  });

  it('o filtro do aparelho tira telas, e nunca todas', () => {
    const semGalaxia = (id: IdDaTela) => id !== 'galaxia';
    expect(proximaTela('bercario', QUATRO, semGalaxia)).toBe('nascer');
    expect(proximaTela('ceu', QUATRO, () => false)).toBe('nascer');
  });

  it('com uma tela só, é sempre ela', () => {
    expect(proximaTela('nascer', ['nascer'])).toBe('nascer');
  });

  it('as prontas seguem a ordem dele, e hoje o nascer abre a fila', () => {
    expect(ORDEM_DAS_TELAS).toEqual(QUATRO);
    expect(TELAS_PRONTAS[0]).toBe('nascer');
    expect(TELAS_PRONTAS.every((id, i) => i === 0 || ORDEM_DAS_TELAS.indexOf(id) > ORDEM_DAS_TELAS.indexOf(TELAS_PRONTAS[i - 1]))).toBe(true);
  });
});

describe('escolherTela', () => {
  it('guarda a tela da visita nas preferências, para a próxima partir dela', () => {
    const storage = comStorage(null);
    const tela = escolherTela('');
    expect(tela).toBe(TELAS_PRONTAS[0]);
    expect(JSON.parse(storage.gravado ?? '{}').ultimaTelaDeCarga).toBe(tela);
    expect(escolherTela('')).toBe(proximaTela(tela));
  });

  it('storage bloqueado: a tela aparece do mesmo jeito', () => {
    comStorage(null, true);
    expect(escolherTela('')).toBe(TELAS_PRONTAS[0]);
  });

  it('?tela= força uma tela pronta e não mexe no rodízio; desconhecida é ignorada', () => {
    const storage = comStorage(JSON.stringify({ v: 1, ultimaTelaDeCarga: 'nascer' }));
    expect(escolherTela('?tela=nascer')).toBe('nascer');
    expect(JSON.parse(storage.gravado ?? '{}').ultimaTelaDeCarga).toBe('nascer');
    expect(escolherTela('?tela=nada')).toBe(proximaTela('nascer'));
  });

  it('?shot= mostra sempre a primeira e não mexe no rodízio', () => {
    const storage = comStorage(null);
    expect(escolherTela('?shot=1')).toBe(TELAS_PRONTAS[0]);
    expect(storage.gravado).toBeNull();
  });
});
