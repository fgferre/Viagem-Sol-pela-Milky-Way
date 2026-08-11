// O juízo do fallback do harness, sem subir Chrome e sem tocar na GPU
// (importar `chrome.mjs` ainda exige o binário instalado — ele resolve o
// caminho no topo do módulo, de propósito).
//
// Existe porque o caso que mais importa — dev server com o sinal QUEBRADO —
// não tem como ser encenado de fora sem editar `src/`: no dev server o sinal
// funciona, e apontar `APP_URL` para outro lugar já é o outro ramo da regra.
// O que dá para provar de fora (e foi provado, 2026-08-11) é o `vite preview`
// do `dist` servido NA PORTA PADRÃO, que é dev-por-endereço e produção-por-
// bundle; aqui ficam as combinações restantes, incluindo as parciais, que
// nenhum arranjo de servidor encena de propósito.
import { describe, it, expect } from 'vitest';
import { julgarProntidao, APP_PADRAO } from './chrome.mjs';

const sinal = (n) => Array(n).fill('sinal');
const quadros = (n) => Array(n).fill('quadros');

describe('julgarProntidao', () => {
  it('leva inteira por sinal no alvo padrão: nada a dizer', () => {
    const r = julgarProntidao({ vias: sinal(6) });
    expect(r).toMatchObject({ total: 6, quadros: 0, alvoPadrao: true, erro: false, mensagem: null });
  });

  it('leva inteira no fallback com APP_URL ausente: ERRO com o bloco', () => {
    const r = julgarProntidao({ vias: quadros(6) });
    expect(r.erro).toBe(true);
    expect(r.quadros).toBe(6);
    expect(r.mensagem).toContain('SINAL DE PRONTIDÃO QUEBRADO');
    expect(r.mensagem).toContain('6 de 6 capturas');
    expect(r.mensagem).toContain('FALLBACK_OK=1');
  });

  it('fallback PARCIAL no alvo padrão: mesmo erro — intermitente é pior', () => {
    const r = julgarProntidao({ vias: [...sinal(5), 'quadros'] });
    expect(r.erro).toBe(true);
    expect(r.mensagem).toContain('SINAL DE PRONTIDÃO QUEBRADO');
    expect(r.mensagem).toContain('1 de 6 capturas');
  });

  it('APP_URL apontado para o próprio padrão não compra o perdão', () => {
    for (const u of [APP_PADRAO, `${APP_PADRAO}/`, 'http://localhost:5173']) {
      const r = julgarProntidao({ vias: quadros(2), appUrl: u });
      expect(r.alvoPadrao, u).toBe(true);
      expect(r.erro, u).toBe(true);
    }
  });

  it('APP_URL explícito noutro alvo: só aviso, sem erro', () => {
    const r = julgarProntidao({ vias: quadros(6), appUrl: 'http://127.0.0.1:4173' });
    expect(r).toMatchObject({ alvoPadrao: false, erro: false });
    expect(r.mensagem).toContain('aviso');
    expect(r.mensagem).toContain('4173');
    expect(r.mensagem).not.toContain('SINAL DE PRONTIDÃO QUEBRADO');
  });

  it('FALLBACK_OK=1 silencia o erro mas não a mensagem', () => {
    const r = julgarProntidao({ vias: quadros(6), fallbackOk: true });
    expect(r.erro).toBe(false);
    expect(r.mensagem).toContain('SINAL DE PRONTIDÃO QUEBRADO');
    expect(r.mensagem).toContain('ACEITO por FALLBACK_OK=1');
  });

  it('sem captura nenhuma (tudo de disco, ou --so-medir) não há juízo', () => {
    expect(julgarProntidao({ vias: [] })).toMatchObject({ total: 0, erro: false, mensagem: null });
  });
});
