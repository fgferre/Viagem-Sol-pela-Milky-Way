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
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cancelar,
  desvanecer,
  distanciaCelularPx,
  distanciaMesaPx,
  dobrar,
  duracaoDaDobra,
  emMilissegundos,
  esperar,
  ir,
  resolverTokens,
} from './movimentoDaGaveta';

/** um nó falso: só o formato que `ir`/`cancelar` pedem. */
const noFalso = (animate: (...args: unknown[]) => unknown) =>
  ({ style: { transform: '' }, animate }) as unknown as HTMLElement;

/** uma `Animation` falsa com `finished` controlável de fora — resolve
 *  ou rejeita quando o teste manda, não quando o navegador manda.
 *  `finish` faz o que o de verdade faz (resolve `finished`); `cancel`
 *  NÃO rejeita sozinho, de propósito — é o que deixa a seção 4 provar o
 *  contador, e não só a rejeição. */
function animacaoFalsa() {
  let resolver: () => void = () => {};
  let rejeitar: (erro?: unknown) => void = () => {};
  const finished = new Promise<void>((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });
  return {
    anim: { cancel: vi.fn(), finish: vi.fn(() => resolver()), finished } as unknown as Animation,
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
    const filhos = [
      { animate: vi.fn(() => animacaoFalsa().anim) },
      { animate: vi.fn(() => animacaoFalsa().anim) },
    ];
    desvanecer(filhos as unknown as Element[], 120, 'ease');
    for (const filho of filhos) {
      expect(filho.animate).toHaveBeenCalledWith([{ opacity: 0 }, { opacity: 1 }], {
        duration: 120,
        easing: 'ease',
      });
    }
  });
});

describe('7. o que já corre assenta quando a preferência muda ou a janela muda de tamanho', () => {
  // Um MÓDULO NOVO por teste (`vi.resetModules`): a lista de animações
  // vivas é do módulo, e as animações falsas das seções de cima, que
  // nunca terminam, deixariam os ouvintes instalados de antemão.
  const janelaFalsa = () => {
    const preferencia = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const janela = {
      matchMedia: vi.fn(() => preferencia),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('window', janela);
    return { janela, preferencia };
  };
  const moduloNovo = async () => {
    vi.resetModules();
    return import('./movimentoDaGaveta');
  };
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ligar "reduzir movimento" no meio de uma saída a TERMINA — e o painel desmonta na hora', async () => {
    const { preferencia } = janelaFalsa();
    const m = await moduloNovo();
    const chamada = animacaoFalsa();
    const assentou = vi.fn();
    m.ir(noFalso(() => chamada.anim), 'de', 'fora', { duracao: 260, curva: 'ease', segurar: true }, assentou);

    const [, aoMudar] = preferencia.addEventListener.mock.calls[0] as [string, (e: unknown) => void];
    aoMudar({ matches: true });
    await proximoQuadro();

    expect(chamada.anim.finish).toHaveBeenCalledTimes(1);
    expect(chamada.anim.cancel).not.toHaveBeenCalled();
    expect(assentou).toHaveBeenCalledTimes(1);
  });

  it('desligar a preferência não mexe no que corre', async () => {
    const { preferencia } = janelaFalsa();
    const m = await moduloNovo();
    const chamada = animacaoFalsa();
    m.ir(noFalso(() => chamada.anim), 'de', 'para', { duracao: 260, curva: 'ease', segurar: false });
    const [, aoMudar] = preferencia.addEventListener.mock.calls[0] as [string, (e: unknown) => void];
    aoMudar({ matches: false });
    expect(chamada.anim.finish).not.toHaveBeenCalled();
  });

  it('o resize da janela assenta a entrada e o conteúdo da troca, sem cruzar fronteira nenhuma', async () => {
    const { janela } = janelaFalsa();
    const m = await moduloNovo();
    const entrada = animacaoFalsa();
    const troca = animacaoFalsa();
    m.ir(noFalso(() => entrada.anim), 'de', 'para', { duracao: 260, curva: 'ease', segurar: false });
    m.desvanecer([{ animate: () => troca.anim }] as unknown as Element[], 120, 'ease');

    const aoRedimensionar = janela.addEventListener.mock.calls.find(([tipo]) => tipo === 'resize')?.[1] as () => void;
    aoRedimensionar();

    expect(entrada.anim.finish).toHaveBeenCalledTimes(1);
    expect(troca.anim.finish).toHaveBeenCalledTimes(1);
  });

  it('os ouvintes entram com a primeira animação e saem com a última — nada pendurado', async () => {
    const { janela, preferencia } = janelaFalsa();
    const m = await moduloNovo();
    const a = animacaoFalsa();
    const b = animacaoFalsa();
    m.ir(noFalso(() => a.anim), 'de', 'para', { duracao: 200, curva: 'ease', segurar: false });
    m.ir(noFalso(() => b.anim), 'de', 'para', { duracao: 200, curva: 'ease', segurar: false });
    expect(janela.addEventListener).toHaveBeenCalledTimes(1);
    expect(preferencia.addEventListener).toHaveBeenCalledTimes(1);

    a.resolver();
    await proximoQuadro();
    expect(janela.removeEventListener).not.toHaveBeenCalled();

    b.rejeitar(new Error('cancelada'));
    await proximoQuadro();
    expect(janela.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(preferencia.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('o relógio sem alvo do halo (C6) entra na mesma lista: o resize e a preferência o terminam', async () => {
    const { janela, preferencia } = janelaFalsa();
    const m = await moduloNovo();
    const primeiro = animacaoFalsa();
    const segundo = animacaoFalsa();
    const fila = [primeiro, segundo];
    vi.stubGlobal('document', { timeline: {} });
    vi.stubGlobal('KeyframeEffect', vi.fn());
    vi.stubGlobal(
      'Animation',
      vi.fn(function () {
        return { ...fila.shift()!.anim, play: vi.fn() };
      })
    );

    const r1 = m.relogio(400);
    expect(r1.play).toHaveBeenCalledTimes(1);
    const aoRedimensionar = janela.addEventListener.mock.calls.find(([tipo]) => tipo === 'resize')?.[1] as () => void;
    aoRedimensionar();
    expect(primeiro.anim.finish).toHaveBeenCalledTimes(1);

    await proximoQuadro();
    m.relogio(400);
    const [, aoMudar] = preferencia.addEventListener.mock.calls[1] as [string, (e: unknown) => void];
    aoMudar({ matches: true });
    expect(segundo.anim.finish).toHaveBeenCalledTimes(1);
  });
});

describe('8. `dobrar` — a sanfona continua de onde está (reabrir no meio da saída, 12/09)', () => {
  it('o tempo encolhe na proporção do que FALTA — a regra das transições CSS ao inverter', () => {
    expect(duracaoDaDobra(0, 1, 200)).toBe(200);
    expect(duracaoDaDobra(0.6, 1, 200)).toBeCloseTo(80, 9);
    expect(duracaoDaDobra(0.6, 0, 200)).toBeCloseTo(120, 9);
    expect(duracaoDaDobra(1, 1, 200)).toBe(0);
    // uma fração fora de 0..1 (medida num quadro estranho) não inventa tempo negativo
    expect(duracaoDaDobra(1.4, 0, 200)).toBe(200);
  });

  it('as duas pontas são `fr` (só `fr` interpola com `fr`), o corte vai nos dois quadros, e `forwards` só ao FECHAR', () => {
    const animate = vi.fn(() => animacaoFalsa().anim);
    const no = noFalso(animate);
    dobrar(no, 0, 0.6, { duracao: 200, curva: 'linear' });
    dobrar(no, 1, 0.25, { duracao: 200, curva: 'linear' });
    const [fecha, abre] = animate.mock.calls as unknown as [
      [Keyframe[], KeyframeAnimationOptions],
      [Keyframe[], KeyframeAnimationOptions],
    ];
    expect(fecha[0]).toEqual([
      { gridTemplateRows: '0.6fr', opacity: 0.6, overflow: 'hidden' },
      { gridTemplateRows: '0fr', opacity: 0, overflow: 'hidden' },
    ]);
    expect(fecha[1]).toMatchObject({ duration: 120, fill: 'forwards' });
    expect(abre[0][0]).toEqual({ gridTemplateRows: '0.25fr', opacity: 0.25, overflow: 'hidden' });
    expect(abre[0][1]).toEqual({ gridTemplateRows: '1fr', opacity: 1, overflow: 'hidden' });
    expect(abre[1]).toMatchObject({ duration: 150, fill: 'none' });
  });

  it('`esperar` (a saída que o CSS desenha) assenta na hora abaixo de 1 ms e devolve o cancelamento do relógio', () => {
    const assentou: string[] = [];
    expect(typeof esperar(0.01, () => assentou.push('zero'))).toBe('function');
    expect(assentou).toEqual(['zero']);
    vi.useFakeTimers();
    try {
      const cancelar = esperar(200, () => assentou.push('tarde'));
      cancelar();
      vi.advanceTimersByTime(300);
      expect(assentou).toEqual(['zero']);
      esperar(200, () => assentou.push('no tempo'));
      vi.advanceTimersByTime(300);
      expect(assentou).toEqual(['zero', 'no tempo']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('tempo ≤ 1 ms não anima e assenta na hora; a última intenção vence, como em `ir`', async () => {
    const assentou: string[] = [];
    const semNada = noFalso(vi.fn());
    dobrar(semNada, 0, 1, { duracao: 0, curva: 'linear' }, () => assentou.push('zero'));
    expect(assentou).toEqual(['zero']);

    const chamadas = [animacaoFalsa(), animacaoFalsa()];
    let vez = 0;
    const no = noFalso(() => chamadas[vez++].anim);
    dobrar(no, 0, 1, { duracao: 200, curva: 'linear' }, () => assentou.push('fecha'));
    dobrar(no, 1, 0.3, { duracao: 200, curva: 'linear' }, () => assentou.push('reabre'));
    chamadas[0].resolver();
    chamadas[1].resolver();
    await proximoQuadro();
    expect(chamadas[0].anim.cancel).toHaveBeenCalledTimes(1);
    expect(assentou).toEqual(['zero', 'reabre']);
  });
});
