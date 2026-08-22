// ============================================================
// Preferências locais — marcas de PRIMEIRA VISITA, não gosto.
// A URL continua sendo a fonte de verdade (qualquer configuração
// vira link e a captura headless enxerga o que a tela enxerga);
// o storage só guarda o que a URL não carrega e o visitante não
// escolheu: por ora, só que ele já viu o convite.
// Tom, exposição e camadas NÃO se persistem — quebrariam a
// honestidade dos gates.
//
// LÁPIDE DE `tierQueRodou` (Ajustes D, 2026-08-20). O terceiro campo
// era o veredito MEDIDO sobre o aparelho, gravado pelo monitor de fps e
// lido no boot para decidir a ALOCAÇÃO da visita seguinte. Ele foi o
// caso mais claro de "detecção decide": um `alta` medido ontem — num
// engasgo que podia ser outra aba pesada — sobrepunha o clique em
// Cinema de hoje, calado, e sem `?q=` no link não havia como saber.
// Sem `?q=` o tier agora é uma constante (`TIER_DE_PRODUTO`), e o que
// o aparelho aguenta é medição VIVA, que sugere e só aplica no Auto.
// A precedência da Onda 1f (URL > storage > detecção) vale para o que
// sobrou aqui; para o tier, ela encolheu para URL > produto.
//
// LÁPIDE DE `wikipediaLigada` (2026-08-21). O campo nasceu com o
// PLANO-ATLAS ("Wikipedia no painel, opt-out persistido"), e o painel
// NUNCA nasceu: ninguém no projeto o leu nem o escreveu — nem código,
// nem teste, nem captura. Era um envelope guardando a preferência de um
// visitante que não tinha onde exprimi-la, e um campo assim mente duas
// vezes: promete que a opção existe e faz o saneamento fingir que
// protege alguma coisa. O plano do Atlas CONTINUA prometendo o painel,
// e a promessa fica lá; quando ele nascer, o campo nasce com ele — que
// é a ordem certa. A varredura invertida vigia o nome em
// `atlasConfig.test.ts`, ao lado da lápide do `tierQueRodou`.
// ============================================================

export interface Preferencias {
  v: 1;
  conviteVisto?: boolean;
  /**
   * O convite do ATLAS já passou? Chave PRÓPRIA, e não a do voo livre
   * (item 73, 22/08): são dois conjuntos de gestos diferentes — lá o
   * WASD voa e o clique visita; aqui a roda dá zoom e o clique escolhe.
   * Reaproveitar `conviteVisto` faria quem viu um pular o outro, nos
   * dois sentidos, e o visitante chegaria ao modo novo sem nunca ter
   * lido os gestos dele.
   */
  conviteAtlasVisto?: boolean;
}

const CHAVE = 'viagem-prefs';

/**
 * Leitura tolerante a lixo: storage inacessível (política, aba privada),
 * JSON inválido ou campo corrompido NUNCA travam o boot — devolvem um
 * envelope vazio, e quem lê segue com o padrão.
 */
export function lerPreferencias(): Preferencias {
  try {
    const cru = window.localStorage.getItem(CHAVE);
    if (!cru) return { v: 1 };
    const dado: unknown = JSON.parse(cru);
    if (typeof dado !== 'object' || dado === null) return { v: 1 };
    const p = dado as Record<string, unknown>;
    const envelope: Preferencias = { v: 1 };
    if (p.conviteVisto === true) envelope.conviteVisto = true;
    if (p.conviteAtlasVisto === true) envelope.conviteAtlasVisto = true;
    return envelope;
  } catch {
    return { v: 1 };
  }
}

/**
 * Grava um campo por vez (lê, funde, escreve); falha em silêncio —
 * perder a preferência custa menos que travar o quadro.
 */
export function gravarPreferencia<K extends keyof Omit<Preferencias, 'v'>>(
  campo: K,
  valor: NonNullable<Preferencias[K]>
) {
  try {
    const atual = lerPreferencias();
    atual[campo] = valor;
    window.localStorage.setItem(CHAVE, JSON.stringify(atual));
  } catch {
    /* storage cheio ou bloqueado: segue sem memória */
  }
}
