// Serve: chão — a dica do "?" mora fora da linha (portal em document.body) e o Esc a solta de vez, mesmo com o mouse ainda em cima do botão
// ============================================================
// O runner da casa é `node`, sem DOM (`vitest.config.ts`): um `<Ajuda>`
// não se monta aqui, e por isso o arquivo é `.test.ts` — a mesma régua
// de `hooks/useGavetas.test.ts`/`useChromeDoFilme.test.ts`, que leem o
// FONTE em vez de renderizar. O que a11y.mjs prova em navegador real
// (o hover de verdade, o Tab, o Esc) fica lá; o que se pina aqui é o
// que uma corrida de navegador NÃO acusaria como regressão de fiação:
// o dia em que a dica voltar a nascer DENTRO da linha, ou em que o Esc
// parar de soltar o hover junto com o pino.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FONTE = readFileSync(new URL('./Ajuda.tsx', import.meta.url), 'utf8');

describe('a dica é um PORTAL — nunca filha da LINHA (Lote 9)', () => {
  it('createPortal manda a caixa para document.body, e ela fica sempre montada (hidden, não display)', () => {
    const retorno = FONTE.slice(FONTE.indexOf('return ('), FONTE.lastIndexOf('</span>'));
    const iPortal = retorno.indexOf('createPortal(');
    const iCaixa = retorno.indexOf("className={'hud-dica'");
    const iBody = retorno.indexOf('document.body');
    // a caixa da dica só existe DENTRO da chamada de createPortal — não
    // é mais um `<span>`/`<div>` solto ao lado do botão na mesma linha
    expect(iPortal).toBeGreaterThan(-1);
    expect(iCaixa).toBeGreaterThan(iPortal);
    expect(iBody).toBeGreaterThan(iCaixa);
    // sempre MONTADA (o `aria-controls` do botão tem de resolver sempre,
    // regra do axe) — esconde por `hidden`, nunca tirando do DOM
    expect(FONTE).toContain('hidden={!aberta}');
  });
});

describe('o clique só ALTERNA a dica NO TOQUE — em quem tem mouse é NO-OP (design do dono, 09/09; interação efetiva, 12/09)', () => {
  it('a capacidade do aparelho é lida por matchMedia(hover: hover) COM ouvinte — plugar um mouse ou virar de modo no meio da sessão muda a resposta', () => {
    expect(FONTE).toContain("() => window.matchMedia?.('(hover: hover)').matches ?? true");
    const ouvinte = FONTE.slice(FONTE.indexOf("window.matchMedia?.('(hover: hover)');"));
    expect(ouvinte).toContain("consulta.addEventListener('change', aoMudar);");
    expect(ouvinte).toContain("consulta.removeEventListener('change', aoMudar);");
  });

  it('o clique decide pelo PONTEIRO que o fez (pointerdown): dedo ou caneta prendem, mouse nunca; sem ponteiro (teclado) vale a capacidade viva', () => {
    expect(FONTE).toContain('ponteiroDoClique.current = evento.pointerType;');
    const onClick = FONTE.slice(
      FONTE.indexOf('onClick={(evento) => {'),
      FONTE.indexOf('      >\n        ?\n      </button>')
    );
    const iGuarda = onClick.indexOf("if (ponteiro ? ponteiro !== 'mouse' : !hoverCapaz) onAlternar();");
    const iAlternar = onClick.indexOf('onAlternar();');
    const iFecho = onClick.indexOf('setFoco(false);');
    expect(iGuarda).toBeGreaterThan(-1);
    // onAlternar() mora DENTRO da guarda; o setFoco(false) vem DEPOIS
    // dela, FORA, em qualquer aparelho — na mesa o clique deixa o botão
    // focado, e sem soltar o foco a caixa seguiria aberta depois que o
    // mouse saísse (a "presa" por outra porta, 09/09)
    expect(iAlternar).toBeGreaterThanOrEqual(iGuarda);
    expect(iFecho).toBeGreaterThan(iAlternar);
    // o ponteiro lido é CONSUMIDO: o clique seguinte, se vier do teclado,
    // não herda o dedo de antes
    expect(onClick.indexOf('ponteiroDoClique.current = null;')).toBeLessThan(iGuarda);
    // e o stopPropagation() do clique continua FORA da guarda — ele
    // segue valendo em qualquer dispositivo (o <label> da gaveta de
    // Camadas não pode alternar a caixa de seleção em nenhum dos dois)
    expect(onClick.indexOf('evento.stopPropagation();')).toBeGreaterThan(-1);
    expect(onClick.indexOf('evento.stopPropagation();')).toBeLessThan(iGuarda);
  });
});

describe('Esc fecha de vez — mesmo com o mouse ainda em cima do "?"', () => {
  it('presa cair a false solta HOVER e FOCO junto, não só o pino', () => {
    // o ajuste de estado a partir da prop `presa` — `aoTeclarEsc`
    // (useDicaPresa.ts) já solta `presa` no Esc; sem este `if (!presa)`,
    // `hover` sozinho sustentava `aberta` e a caixa reaparecia sem o
    // visitante mexer no mouse. FORA de `useEffect` de propósito (o
    // padrão do React para reagir a uma prop sem efeito, cobrado por
    // `eslint-plugin-react-hooks`/`set-state-in-effect`): o trecho fica
    // entre a comparação com `presaAnterior` e o cálculo de `aberta`.
    const ajuste = FONTE.slice(
      FONTE.indexOf('if (presa !== presaAnterior)'),
      FONTE.indexOf('const aberta = hover || foco || presa;')
    );
    expect(ajuste).toContain('if (!presa) {');
    expect(ajuste).toContain('setHover(false);');
    expect(ajuste).toContain('setFoco(false);');
    // e ela só REABRE ao sair e voltar (ou focar de novo): hover/foco só
    // acendem num lugar cada — o par pointerenter/onFocus de verdade —,
    // nunca como efeito colateral de outra coisa
    expect(FONTE.match(/setHover\(true\)/g) ?? []).toHaveLength(1);
    expect(FONTE.match(/setFoco\(true\)/g) ?? []).toHaveLength(1);
  });
});
