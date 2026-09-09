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

describe('o clique só ALTERNA a dica NO TOQUE — em quem tem mouse é NO-OP (design do dono, 09/09)', () => {
  it('o dispositivo é lido por matchMedia(hover: hover), uma vez por componente (useState sem ouvinte)', () => {
    // SEM ouvinte de propósito: ao contrário de `useCelular` (que reage a
    // `change` porque a LARGURA muda ao vivo no juiz de a11y), ter mouse
    // ou não não muda durante a sessão — um `useState` com inicializador
    // preguiçoso já é "uma vez por componente".
    expect(FONTE).toContain(
      "const [hoverCapaz] = useState(() => window.matchMedia?.('(hover: hover)').matches ?? true);"
    );
  });

  it('onAlternar() só corre DENTRO de `if (!hoverCapaz)` — mouse não prende nada', () => {
    const onClick = FONTE.slice(
      FONTE.indexOf('onClick={(evento) => {'),
      FONTE.indexOf('      >\n        ?\n      </button>')
    );
    const iGuarda = onClick.indexOf('if (!hoverCapaz) {');
    const iAlternar = onClick.indexOf('onAlternar();');
    const iFecho = onClick.indexOf('setFoco(false);');
    expect(iGuarda).toBeGreaterThan(-1);
    // onAlternar() e o setFoco(false) que zera o foco residual moram
    // DENTRO da mesma guarda — no mouse não há pino para religar por
    // foco, e chamar isso ali fecharia a caixa que hover/foco acabaram
    // de abrir
    expect(iAlternar).toBeGreaterThan(iGuarda);
    expect(iFecho).toBeGreaterThan(iAlternar);
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
