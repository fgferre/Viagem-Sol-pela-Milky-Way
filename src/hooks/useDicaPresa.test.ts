// Serve: chão — Esc com dica presa solta e consome; sem dica, não consome (PLAN-UI.md §5/§8)
// ============================================================
// O runner é `node`, sem DOM: a decisão do Esc é pura
// (`decidirEscDaDica`), e é ela que este teste prova — sem montar
// componente nenhum.
// ============================================================
import { describe, expect, it } from 'vitest';
import { decidirEscDaDica, posicionarDica } from './useDicaPresa';

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

describe('posicionarDica (Lote 9 — a dica flutuante)', () => {
  it('sem espaço embaixo SOBE, e a horizontal fica dentro do limite (nunca no cru do botão)', () => {
    // o botão "?" perto do canto inferior direito de um painel de 300 px
    // (700–1000), a 24 px do pé da janela (900) — não cabe abaixo por
    // 58 px (824 + 6 de folga + 120 da caixa = 950 > 900 − 8 de margem)
    const ancora = { top: 800, left: 960, right: 984, bottom: 824, width: 24, height: 24 };
    const limite = { top: 100, left: 700, right: 1000, bottom: 850, width: 300, height: 750 };
    const janela = { largura: 1200, altura: 900 };
    const caixa = { largura: 0, altura: 120 };

    const { top, left, largura } = posicionarDica({ ancora, limite, caixa, janela });

    // SOBE: bottom = anchor.top − gap, ou seja top = 800 − 6 − 120
    expect(top).toBe(674);
    // LARGURA: o teto vem do painel (300 − 2×8 = 284), mais apertado que
    // 22rem (352) e que a janela (1200 − 16)
    expect(largura).toBe(284);
    // HORIZONTAL: colar no `ancora.left` (960) vazaria o painel (que
    // termina em 1000) — grampeada, a caixa pára em 1000 − 8 − 284 = 708
    expect(left).toBe(708);
  });
});
