// Serve: chão — Esc com dica presa solta e consome; sem dica, não consome (PLAN-UI.md §5/§8)
// ============================================================
// O runner é `node`, sem DOM: a decisão do Esc é pura
// (`decidirEscDaDica`), e é ela que este teste prova — sem montar
// componente nenhum. O toque-fora-fecha (design do dono, 09/09) já é
// EFEITO — sem componente para montar, a régua é o FONTE, a mesma de
// `components/Ajuda.test.ts`.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decidirEscDaDica, posicionarDica } from './useDicaPresa';

const FONTE = readFileSync(new URL('./useDicaPresa.ts', import.meta.url), 'utf8');

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

describe('o toque FORA fecha a dica presa — CAPTURA no document (design do dono, 09/09)', () => {
  it('só liga enquanto HÁ dica presa e ouve pointerdown em CAPTURA no document, não na bolha', () => {
    // a fase de CAPTURA é o que garante rodar ANTES de qualquer
    // stopPropagation() que a bolha do clique sofra dentro do painel —
    // a mesma razão do aoTeclarEsc, agora aplicada ao ponteiro
    const efeito = FONTE.slice(
      FONTE.indexOf('useEffect(() => {\n    if (presa == null)'),
      FONTE.indexOf('const aoTeclarEsc')
    );
    expect(efeito).toContain('if (presa == null) return undefined;');
    expect(efeito).toContain("document.addEventListener('pointerdown', aoTocarFora, true);");
    expect(efeito).toContain("document.removeEventListener('pointerdown', aoTocarFora, true);");
  });

  it('poupa qualquer "?" do fechamento — só o clique DELE decide (alternar ou trocar o pino)', () => {
    const aoTocarFora = FONTE.slice(
      FONTE.indexOf('const aoTocarFora'),
      FONTE.indexOf("document.addEventListener('pointerdown'")
    );
    expect(aoTocarFora).toContain("alvo.closest('.hud-ajuda')");
    expect(aoTocarFora).toContain('limpar();');
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
