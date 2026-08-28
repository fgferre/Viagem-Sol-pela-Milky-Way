// Recursos e pontos de conferência: dados do plano, nunca outro relógio.
import { booleano, erro, lista, numero, objeto, opcional, texto } from './dadosDoRoteiro';

export interface ApoiosDoPlano {
  /** pedidos a partir do início do plano, mantidos até o fim do filme */
  preload?: { corpos?: string[]; efemerides?: boolean };
  /** nome único no filme → fração do tempo do plano */
  qa?: Record<string, number>;
}

/** Também lê os apoios dos planos cuja câmera ainda não foi convertida. */
export function lerApoiosDoPlano(dado: unknown, campo = 'apoios'): ApoiosDoPlano {
  const p = objeto(dado, campo);
  return {
    preload: opcional(p.preload, `${campo}.preload`, (valor, c) => {
      const preload = objeto(valor, c);
      return {
        corpos: opcional(preload.corpos, `${c}.corpos`, (v, chave) =>
          Array.from(lista(v, chave), (id, i) => texto(id, `${chave}[${i}]`))),
        efemerides: opcional(preload.efemerides, `${c}.efemerides`, booleano),
      };
    }),
    qa: opcional(p.qa, `${campo}.qa`, (valor, c) => Object.fromEntries(
      Object.entries(objeto(valor, c)).map(([nome, valor]) => {
        texto(nome, c);
        const em = numero(valor, `${c}.${nome}`);
        if (em < 0 || em >= 1) return erro(`${c}.${nome}`, 'deve estar entre 0 e 1 (exclusivo)');
        return [nome, em];
      })
    )),
  };
}

/** Usa os inícios já calculados por Journey; nenhuma conta de duração se duplica. */
export function montarApoiosDoRoteiro(
  planos: readonly (ApoiosDoPlano & { dur: number })[],
  inicios: readonly number[]
) {
  const corpos = new Map<string, number>();
  const qa = new Map<string, number>();
  let efemerides = Infinity;
  for (const [i, plano] of planos.entries()) {
    const inicio = inicios[i];
    for (const id of plano.preload?.corpos ?? []) {
      corpos.set(id, Math.min(corpos.get(id) ?? Infinity, inicio));
    }
    if (plano.preload?.efemerides) efemerides = Math.min(efemerides, inicio);
    for (const [nome, em] of Object.entries(plano.qa ?? {})) {
      if (qa.has(nome)) return erro(`qa.${nome}`, 'está repetido no filme');
      qa.set(nome, inicio + em * plano.dur);
    }
  }
  return {
    preAquecerCorpo(t: number, id: string): boolean {
      const inicio = corpos.get(id);
      return inicio !== undefined && t >= inicio;
    },
    precisaEfemerides(t: number): boolean { return t >= efemerides; },
    instanteDeQA(nome: string): number {
      const t = qa.get(nome);
      if (t === undefined) return erro(`qa.${nome}`, 'não existe no filme');
      return t;
    },
  };
}
