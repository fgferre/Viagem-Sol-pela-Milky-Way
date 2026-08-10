// ============================================================
// Preferências locais — memória de ALOCAÇÃO, não de gosto.
// A URL continua sendo a fonte de verdade (qualquer configuração
// vira link e a captura headless enxerga o que a tela enxerga);
// o storage só guarda o que a URL não carrega: o veredito MEDIDO
// sobre o aparelho (tierQueRodou) e marcas de primeira visita.
// Tom, exposição e camadas NÃO se persistem — quebrariam a
// honestidade dos gates. Precedência de quem lê:
// URL > storage > detecção (PLANO-ATLAS, Onda 1f).
// ============================================================
import type { QualityLevel } from '../three/core/engine';

export interface Preferencias {
  v: 1;
  tierQueRodou?: QualityLevel;
  conviteVisto?: boolean;
  wikipediaLigada?: boolean;
}

const CHAVE = 'viagem-prefs';
const TIERS: readonly QualityLevel[] = ['cinema', 'alta', 'performance'];

/**
 * Leitura tolerante a lixo: storage inacessível (política, aba privada),
 * JSON inválido ou campo corrompido NUNCA travam o boot — devolvem um
 * envelope vazio e a detecção decide como sempre decidiu.
 */
export function lerPreferencias(): Preferencias {
  try {
    const cru = window.localStorage.getItem(CHAVE);
    if (!cru) return { v: 1 };
    const dado: unknown = JSON.parse(cru);
    if (typeof dado !== 'object' || dado === null) return { v: 1 };
    const p = dado as Record<string, unknown>;
    const envelope: Preferencias = { v: 1 };
    const tier = TIERS.find((t) => t === p.tierQueRodou);
    if (tier) envelope.tierQueRodou = tier;
    if (p.conviteVisto === true) envelope.conviteVisto = true;
    if (p.wikipediaLigada === true) envelope.wikipediaLigada = true;
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
