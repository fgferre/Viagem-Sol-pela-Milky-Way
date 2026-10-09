// ============================================================
// A LENTE DE CINEMA QUE A TELA MOSTRA — a decisão de um quadro, pura.
//
// A regra é do dono (09/10): "o diretor escolhe, cena por cena; o Atlas
// segue limpo". No filme vale a lente que o roteiro declarou para a
// cena (`lenteDeCinema`, `cinematic/lerSequencia.ts`), e a cena que não
// declara vai sem lente; fora do filme (Atlas, voo livre, tela de
// título, tela final) vale a escolha do visitante em Ajustes, que o
// Director guarda à parte e que volta no quadro em que o filme acaba ou
// é deixado. Mora aqui, fora do `director.ts`, pelo motivo do
// `legendaNoAr.ts`: o Director não abre no runner `node` da casa.
// ============================================================
import type { ModoDaLente } from '../core/engine';
import type { Phase } from '../fases';

/**
 * A lente no ar. "Filme" é a fase 'journey' — correndo, pausado ou
 * depois de um salto dentro dele; a troca acontece no corte do plano,
 * sem transição (escolher o corte é trabalho do diretor).
 */
export function lenteEfetiva(
  fase: Phase,
  daCena: ModoDaLente | undefined,
  doVisitante: ModoDaLente
): ModoDaLente {
  return fase === 'journey' ? (daCena ?? 'nenhuma') : doVisitante;
}
