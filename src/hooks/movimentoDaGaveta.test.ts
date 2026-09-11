// Serve: chão — a geometria e os tokens do movimento são número puro, e quem chama `ir` duas vezes seguidas só vê a última intenção assentar
// ============================================================
// O CONTROLADOR (`ir`), SEM DOM (plano de motion, C1). O runner da casa
// é `node`: `getComputedStyle` e `Element.animate` não existem aqui, e
// é por isso que todo teste abaixo passa um "de" EXPLÍCITO (nunca
// `'atual'`, o único ramo que chama `getComputedStyle`) e um nó FALSO —
// só precisa do formato que `ir`/`cancelar`/`desvanecer` pedem
// (`animate`, `style.transform`), como qualquer objeto.
//
// "A ÚLTIMA INTENÇÃO VENCE" é uma regra sobre CONTADORES, não sobre
// elementos de verdade — por isso o teste resolve as DUAS promessas
// falsas de propósito (`finished`), em vez de só cancelar a primeira:
// um `cancel()` de verdade já rejeitaria sozinho, e isso provaria só a
// rejeição, não o contador que é a segunda linha de defesa do C1.
// ============================================================
import { describe, expect, it, vi } from 'vitest';
import {
  cancelar,
  desvanecer,
  distanciaCelularPx,
  distanciaMesaPx,
  emMilissegundos,
  ir,
  resolverTokens,
} from './movimentoDaGaveta';

/** um nó falso: só o formato que `ir`/`cancelar` pedem. */
const noFalso = (animate: (...args: unknown[]) => unknown) =>
  ({ style: { transform: '' }, animate }) as unknown as HTMLElement;

/** uma `Animation` falsa com `finished` controlável de fora — resolve
 *  ou rejeita quando o teste manda, não quando o navegador manda. */
function animacaoFalsa() {
  let resolver: () => void = () => {};
  let rejeitar: (erro?: unknown) => void = () => {};
  const finished = new Promise<void>((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });
  return {
    anim: { cancel: vi.fn(), finished } as unknown as Animation,
    resolver,
    rejeitar,
  };
}

/** esvazia a fila de microtarefas E uma volta do timer — o suficiente
 *  para o `.then().catch()` de `ir` rodar, sem depender de contar
 *  quantos `await Promise.resolve()` bastam. */
const proximoQuadro = () => new Promise((r) => setTimeout(r, 0));

describe('1. a geometria é número puro (transcrita dos @keyframes)', () => {
  it('a mesa: a própria largura MAIS a folga até a borda da janela', () => {
    expect(distanciaMesaPx(320, 16)).toBe(336);
    expect(distanciaMesaPx(320, 56)).toBe(376);
    expect(distanciaMesaPx(0, 0)).toBe(0);
  });

  it('o celular: 110% da própria altura da folha', () => {
    expect(distanciaCelularPx(844)).toBeCloseTo(928.4);
    expect(distanciaCelularPx(0)).toBe(0);
  });
});

describe('2. o token de tempo aceita "260ms" e "0.26s" — a mesma leitura do CSS', () => {
  it('milissegundos e segundos convergem para o mesmo número', () => {
    expect(emMilissegundos('260ms')).toBe(260);
    expect(emMilissegundos('0.26s')).toBeCloseTo(260);
    expect(emMilissegundos('0.01ms')).toBeCloseTo(0.01);
  });

  it('um token vazio ou inválido não trava a conta — vira zero', () => {
    expect(emMilissegundos('')).toBe(0);
    expect(emMilissegundos('nem-numero')).toBe(0);
  });

  it('resolverTokens: a curva vazia cai em "ease", não em animação travada', () => {
    expect(resolverTokens('260ms', 'cubic-bezier(0.22, 1, 0.36, 1)')).toEqual({
      duracao: 260,
      curva: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
    expect(resolverTokens('0.2s', '')).toEqual({ duracao: 200, curva: 'ease' });
  });
});

describe('3. `ir` — duração ≤ 1 ms não anima, assenta na hora', () => {
  it('com `segurar`, escreve o "para" direto no inline', () => {
    const no = noFalso(vi.fn());
    let assentou = false;
    ir(no, 'de', 'para-final', { duracao: 0.5, curva: 'linear', segurar: true }, () => {
      assentou = true;
    });
    expect(no.animate).not.toHaveBeenCalled();
    expect(no.style.transform).toBe('para-final');
    expect(assentou).toBe(true);
  });

  it('sem `segurar`, limpa o inline — o repouso já é o que o CSS mostra sozinho', () => {
    const no = noFalso(vi.fn());
    no.style.transform = 'sobrando-de-antes';
    ir(no, 'de', 'para-final', { duracao: 0, curva: 'linear', segurar: false });
    expect(no.style.transform).toBe('');
  });
});

describe('4. `ir` — a última intenção vence (C1: reabrir no meio de uma saída)', () => {
  it('o `aoAssentar` de uma chamada velha não roda depois de uma nova', async () => {
    const chamadas = [animacaoFalsa(), animacaoFalsa()];
    let vez = 0;
    const no = noFalso(() => chamadas[vez++].anim);
    const assentou: string[] = [];

    ir(no, 'de-1', 'para-1', { duracao: 200, curva: 'linear', segurar: false }, () =>
      assentou.push('primeira')
    );
    ir(no, 'de-2', 'para-2', { duracao: 200, curva: 'linear', segurar: false }, () =>
      assentou.push('segunda')
    );

    // as DUAS resolvem — de propósito: é o CONTADOR que decide, não só
    // a rejeição que um `.cancel()` de verdade já dispararia sozinho
    chamadas[0].resolver();
    chamadas[1].resolver();
    await proximoQuadro();

    expect(assentou).toEqual(['segunda']);
    expect(chamadas[0].anim.cancel).toHaveBeenCalledTimes(1);
  });

  it('a rejeição de `finished` por cancelamento é ignorada, não estoura', async () => {
    const chamada = animacaoFalsa();
    const no = noFalso(() => chamada.anim);
    expect(() =>
      ir(no, 'de', 'para', { duracao: 200, curva: 'linear', segurar: false }, () => {
        throw new Error('não devia rodar');
      })
    ).not.toThrow();
    chamada.rejeitar(new Error('cancelado'));
    await proximoQuadro();
    // chegar até aqui sem a promessa rejeitada estourar já é a prova
  });

  it('`de` explícito nunca chama `getComputedStyle` — só `\'atual\'` leria o nó', () => {
    // o runner da casa é `node`: se este teste chamasse `getComputedStyle`
    // de verdade ele já teria estourado antes de qualquer `expect`
    const no = noFalso(() => animacaoFalsa().anim);
    expect(() =>
      ir(no, 'translateX(10px)', 'translateX(0)', { duracao: 50, curva: 'linear', segurar: false })
    ).not.toThrow();
  });
});

describe('5. `cancelar` — para sem começar outra', () => {
  it('chama `cancel` da animação em curso', () => {
    const chamada = animacaoFalsa();
    const no = noFalso(() => chamada.anim);
    ir(no, 'de', 'para', { duracao: 200, curva: 'linear', segurar: false });
    cancelar(no);
    expect(chamada.anim.cancel).toHaveBeenCalledTimes(1);
  });

  it('nó sem animação nenhuma não quebra nada', () => {
    const no = noFalso(vi.fn());
    expect(() => cancelar(no)).not.toThrow();
  });
});

describe('6. `desvanecer` — a troca não desloca a moldura, só os filhos piscam', () => {
  it('duração ≤ 1 ms não anima filho nenhum', () => {
    const filho = { animate: vi.fn() };
    desvanecer([filho] as unknown as Element[], 0, 'ease');
    expect(filho.animate).not.toHaveBeenCalled();
  });

  it('cada filho anima a PRÓPRIA opacidade — nunca um wrapper único', () => {
    const filhos = [{ animate: vi.fn() }, { animate: vi.fn() }];
    desvanecer(filhos as unknown as Element[], 120, 'ease');
    for (const filho of filhos) {
      expect(filho.animate).toHaveBeenCalledWith([{ opacity: 0 }, { opacity: 1 }], {
        duration: 120,
        easing: 'ease',
      });
    }
  });
});
