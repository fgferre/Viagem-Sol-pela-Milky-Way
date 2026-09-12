// Serve: chão — abrir liga o trinco de entrada uma vez (nunca na primeira renderização já aberta), fechar entra SEMPRE em saída (o foco volta ao gatilho antes de qualquer duração, e sem movimento desmonta antes da pintura), e reabrir no meio do caminho cancela a saída partindo da fração já aberta
// ============================================================
// O runner da casa é `node`, sem DOM: um hook não se monta aqui, e as
// decisões que viram `abrindo`/`saindo`/`de` são funções PURAS
// (`abrindoAoMudar`, `saindoAoMudar`, `fracaoAberta`) pela mesma razão
// de `useGavetas.test.ts` — é onde a regra mora, e o `useState` em
// volta dela é encanamento. O que não tem forma de função pura (a
// ordem foco→duração dentro do efeito, o desmontar síncrono sem
// movimento, a dobra pedida ao dono único do movimento) é conferido no
// FONTE, como `useDicaPresa.test.ts` já faz com o efeito que também
// não monta aqui.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { abrindoAoMudar, fracaoAberta, saindoAoMudar } from './usePresenca';

const FONTE = readFileSync(new URL('./usePresenca.ts', import.meta.url), 'utf8');
const EFEITO = FONTE.slice(FONTE.indexOf('useLayoutEffect(() => {'), FONTE.indexOf('return { montada'));

describe('a primeira renderização já aberta não anima', () => {
  it('o "anterior" nasce do PRÓPRIO `aberta`, nunca de um valor fixo — sem isso toda seção aberta por padrão abriria animando quando a ficha nasce ou o alvo troca', () => {
    expect(FONTE).toContain('const [anterior, setAnterior] = useState(aberta);');
    expect(FONTE).toContain('if (anterior !== aberta) {');
  });

  it('`abrindo` nasce desligado — só a MUDANÇA liga, nunca a montagem; e a dobra respeita o trinco desligado', () => {
    expect(FONTE).toContain('const [abrindo, setAbrindo] = useState(false);');
    expect(EFEITO).toContain('if (aberta && !abrindo) return undefined;');
  });
});

describe('fechar (saindoAoMudar) — entra em saída SEMPRE, com ou sem movimento', () => {
  it('o nó continua montado (`aberta || saindo`) até o efeito decidir', () => {
    const aberta = false;
    expect(saindoAoMudar(aberta)).toBe(true);
    expect(aberta || saindoAoMudar(aberta)).toBe(true);
  });

  it('o foco volta ao gatilho ANTES de perguntar qualquer duração — inclusive quando ela é zero (reduzido ou ?shot=), que até 12/09 desmontava sem devolver o foco', () => {
    const iFoco = EFEITO.indexOf('gatilho?.focus();');
    const iDobra = EFEITO.indexOf('dobrar(');
    const iDuracao = EFEITO.indexOf('duracaoDaSaida(no)');
    expect(iFoco).toBeGreaterThan(-1);
    expect(iFoco).toBeLessThan(iDobra);
    expect(iFoco).toBeLessThan(iDuracao);
  });

  it('sem movimento nenhum desmonta no PRÓPRIO efeito de layout (síncrono, antes da pintura) — `esperar` assenta na hora abaixo de 1 ms', () => {
    expect(EFEITO).toContain('return esperar(duracaoDaSaida(no), () => setSaindo(false));');
    // e a dobra recebe duração ZERO pela mesma leitura única da preferência
    expect(EFEITO).toContain("{ duracao: semMovimento() ? 0 : duracao, curva }");
  });
});

describe('reabrir no meio da saída (saindoAoMudar / abrindoAoMudar / fracaoAberta)', () => {
  it('abrir cancela a saída em curso', () => {
    expect(saindoAoMudar(true)).toBe(false);
  });

  it('e liga (ou mantém ligado) o trinco de entrada', () => {
    expect(abrindoAoMudar(false, true)).toBe(true);
    expect(abrindoAoMudar(true, true)).toBe(true);
  });

  it('a dobra parte da FRAÇÃO já aberta (altura da caixa sobre a cheia), nunca do zero — o colapso a zero e o salto à altura cheia medidos em 12/09', () => {
    expect(fracaoAberta(247, 407)).toBeCloseTo(247 / 407, 6);
    expect(fracaoAberta(0, 407)).toBe(0);
    expect(fracaoAberta(500, 407)).toBe(1);
    expect(fracaoAberta(10, 0)).toBe(1);
  });

  it('só um nó RECÉM-MONTADO abre do zero; o mesmo nó reaberto no meio parte da medida', () => {
    expect(EFEITO).toContain('noDobrado.current === no ? fracaoAberta(');
    expect(EFEITO).toContain(': 0;');
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
