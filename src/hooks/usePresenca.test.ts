// Serve: chão — abrir liga o trinco de entrada uma vez (nunca na primeira renderização já aberta), fechar entra em saída ou desmonta no ato sem movimento, e reabrir no meio do caminho cancela a saída
// ============================================================
// O runner da casa é `node`, sem DOM: um hook não se monta aqui, e as
// duas decisões que viram `abrindo`/`saindo` são funções PURAS
// (`abrindoAoMudar`, `saindoAoMudar`) pela mesma razão de
// `useGavetas.test.ts` — é onde a regra mora, e o `useState` em volta
// dela é encanamento. A garantia de que uma seção JÁ ABERTA na primeira
// renderização não anima não tem forma de função pura (é o `anterior`
// nascendo igual a `aberta`, nunca um `if` executando): ela é conferida
// no FONTE, como `useDicaPresa.test.ts` já faz com o efeito que também
// não monta aqui.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { abrindoAoMudar, saindoAoMudar } from './usePresenca';

const FONTE = readFileSync(new URL('./usePresenca.ts', import.meta.url), 'utf8');

describe('a primeira renderização já aberta não anima', () => {
  it('o "anterior" nasce do PRÓPRIO `aberta`, nunca de um valor fixo — sem isso toda seção aberta por padrão abriria animando quando a ficha nasce ou o alvo troca', () => {
    expect(FONTE).toContain('const [anterior, setAnterior] = useState(aberta);');
    expect(FONTE).toContain('if (anterior !== aberta) {');
  });

  it('`abrindo` nasce desligado — só a MUDANÇA liga, nunca a montagem', () => {
    expect(FONTE).toContain('const [abrindo, setAbrindo] = useState(false);');
  });
});

describe('fechar (saindoAoMudar)', () => {
  it('COM movimento entra em saída — o nó continua montado (`aberta || saindo`)', () => {
    const aberta = false;
    expect(saindoAoMudar(aberta, false)).toBe(true);
    expect(aberta || saindoAoMudar(aberta, false)).toBe(true);
  });

  it('SEM movimento nenhum (reduzido ou ?shot=) desmonta no MESMO commit', () => {
    const aberta = false;
    expect(saindoAoMudar(aberta, true)).toBe(false);
    expect(aberta || saindoAoMudar(aberta, true)).toBe(false);
  });
});

describe('reabrir no meio da saída (saindoAoMudar / abrindoAoMudar)', () => {
  it('abrir cancela a saída em curso, com ou sem movimento', () => {
    expect(saindoAoMudar(true, false)).toBe(false);
    expect(saindoAoMudar(true, true)).toBe(false);
  });

  it('e liga (ou mantém ligado) o trinco de entrada, revivendo a animação de abrir', () => {
    expect(abrindoAoMudar(false, true)).toBe(true);
    expect(abrindoAoMudar(true, true)).toBe(true);
  });
});

describe('abrindoAoMudar é um TRINCO — fechar não o desliga', () => {
  it('uma vez ligado, continua ligado ao fechar: quem desempata a convivência é o CSS (`.saindo` vence `.abrindo`)', () => {
    expect(abrindoAoMudar(true, false)).toBe(true);
  });

  it('nunca liga sozinho — só a mudança para `aberta` liga', () => {
    expect(abrindoAoMudar(false, false)).toBe(false);
  });
});
