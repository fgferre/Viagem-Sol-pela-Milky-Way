// Serve: chão — Esc com dica presa solta e consome; sem dica, não consome (PLAN-UI.md §5/§8)
// ============================================================
// O runner é `node`, sem DOM: a decisão do Esc é pura
// (`decidirEscDaDica`), e é ela que este teste prova — sem montar
// componente nenhum.
// ============================================================
import { describe, expect, it } from 'vitest';
import { decidirEscDaDica } from './useDicaPresa';

describe('decidirEscDaDica', () => {
  it('Esc com dica presa CONSOME — solta a dica e para aí', () => {
    expect(decidirEscDaDica('Escape', 'ficha').consome).toBe(true);
  });

  it('Esc sem dica presa NÃO consome — segue para quem fecha o painel', () => {
    expect(decidirEscDaDica('Escape', null).consome).toBe(false);
  });

  it('outra tecla nunca consome, com ou sem dica presa', () => {
    expect(decidirEscDaDica('Tab', 'ficha').consome).toBe(false);
    expect(decidirEscDaDica('Tab', null).consome).toBe(false);
  });
});
