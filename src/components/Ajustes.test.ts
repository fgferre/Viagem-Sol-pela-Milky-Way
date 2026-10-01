// Serve: chão — o "Copiar link" devolve o foco ao campo a CADA falha, também na segunda com a MESMA URL (Lote 7, BACKLOG)
// ============================================================
// O runner da casa é `node`, sem DOM (`vitest.config.ts`): um `<Ajustes>`
// não se monta aqui, e por isso o arquivo é `.test.ts` — a mesma régua de
// `components/Ajuda.test.ts`, que lê o FONTE em vez de renderizar. O
// defeito era de FIAÇÃO do React: sem `navigator.clipboard` a falha é
// síncrona, o clique limpa a URL (`null`) e a falha a repõe (`url`) no
// MESMO lote, e `url → null → url` resolve para o valor de antes — o
// efeito que dependia só da URL não rodava, e o foco ficava no botão.
// Montar o painel e clicar duas vezes é coisa de navegador; o que se pina
// aqui é a fiação que o conserta: o foco pendura num contador que sobe a
// cada falha, pelas duas portas dela.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FONTE = readFileSync(new URL('./Ajustes.tsx', import.meta.url), 'utf8');

describe('copiar link — o foco volta ao campo a CADA falha, não só quando a URL muda (Lote 7)', () => {
  it('o efeito do foco pendura no CONTADOR de falhas e não na URL — `url → null → url` no mesmo lote não muda a URL', () => {
    const iEfeito = FONTE.indexOf('useEffect(() => {\n    if (falhasDeCopia > 0)');
    expect(iEfeito, 'o efeito do foco tem de abrir com `if (falhasDeCopia > 0)`').toBeGreaterThan(-1);
    const efeito = FONTE.slice(iEfeito, FONTE.indexOf('function aoClicarCopiarLink()'));
    expect(efeito).toContain('campoSemCopiaRef.current?.focus();');
    expect(efeito).toContain('campoSemCopiaRef.current?.select();');
    expect(efeito).toContain('}, [falhasDeCopia]);');
  });

  it('as DUAS portas da falha (sem `navigator.clipboard` e promessa rejeitada) passam pela mesma `falha`, que SOBE o contador — e nada o zera', () => {
    const clique = FONTE.slice(
      FONTE.indexOf('function aoClicarCopiarLink()'),
      FONTE.indexOf('if (!aberto) return null;')
    );
    const iFalha = clique.indexOf('const falha = () => {');
    expect(iFalha, '`falha` tem de ser um bloco, não só o `setUrlSemCopia(url)`').toBeGreaterThan(-1);
    const falha = clique.slice(iFalha, clique.indexOf('};', iFalha));
    expect(falha).toContain('setUrlSemCopia(url);');
    expect(falha).toContain('setFalhasDeCopia((n) => n + 1);');
    // sem clipboard a falha é SÍNCRONA — cai no mesmo lote do `setUrlSemCopia(null)` do clique
    expect(clique).toMatch(/if \(!navigator\.clipboard\?\.writeText\) \{\s*falha\(\);/);
    // com clipboard, é a promessa rejeitada
    expect(clique).toContain('.catch(falha);');
    // zerar o contador repõe o defeito: 1 → 0 → 1 resolve para o 1 de antes
    expect(FONTE).not.toContain('setFalhasDeCopia(0)');
  });
});
