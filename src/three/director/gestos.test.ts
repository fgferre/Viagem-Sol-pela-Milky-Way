// Serve: chão — o cursor não acende quando uma gaveta vai fechar no clique; o toque cumpre o que o cursor prometeu
// ============================================================
// O CURSOR NÃO PODE PROMETER O QUE A GAVETA IMPEDE — defeito achado
// depois do item 111 ("o cursor diz o que o clique faria"). O hover
// ligava `apontavel` olhando SÓ o hit-test dos rótulos; com uma gaveta
// aberta (Ajustes, busca — qualquer `[data-dialogo]` exceto a ficha) o
// `pointerdown` fecha a folha e o `pointerup` engole a seleção
// (`gestoFechouGaveta`, em `gestos.ts`), então o cursor prometia
// escolher e o clique só fechava a gaveta.
//
// O CONSERTO reusa `gavetaQueOToqueFecha()` — a MESMA fonte que o
// `pointerdown` já consulta — como uma terceira guarda do hover, ao
// lado de `noAtlas()` e `event.target === canvas`.
//
// Este arquivo dispara eventos de verdade contra listeners de verdade,
// pelo mesmo padrão de `arrastoDePonteiro.test.ts`: um `Barramento` de
// mentira guarda os `addEventListener` e os dispara; `window`/`document`
// globais são stubs mínimos, porque `gestos.ts` só os lê DENTRO dos
// tratadores (nunca no topo do módulo), então o import estático é
// seguro mesmo antes de os stubs existirem.
// ============================================================
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ligarGestos } from './gestos';
import type { FiosDosGestos } from './gestos';

/** alvo de eventos de mentira: guarda os listeners e os dispara */
class Barramento {
  private ouvintes = new Map<string, Set<(e: unknown) => void>>();
  addEventListener(tipo: string, fn: (e: unknown) => void) {
    let s = this.ouvintes.get(tipo);
    if (!s) this.ouvintes.set(tipo, (s = new Set()));
    s.add(fn);
  }
  removeEventListener(tipo: string, fn: (e: unknown) => void) {
    this.ouvintes.get(tipo)?.delete(fn);
  }
  emitir(tipo: string, evento: unknown) {
    for (const fn of [...(this.ouvintes.get(tipo) ?? [])]) fn(evento);
  }
}

/** a classList mínima que `gestos.ts` usa: só `toggle`/`contains` */
class ClasseFake {
  private ligadas = new Set<string>();
  toggle(nome: string, forcar?: boolean): boolean {
    const liga = forcar ?? !this.ligadas.has(nome);
    if (liga) this.ligadas.add(nome);
    else this.ligadas.delete(nome);
    return liga;
  }
  contains(nome: string): boolean {
    return this.ligadas.has(nome);
  }
}

// 1000×800 para o clique cair em frações redondas (0,5 · 0,5), como em
// arrastoDePonteiro.test.ts
const janela = Object.assign(new Barramento(), { innerWidth: 1000, innerHeight: 800 });

/** o `[data-dialogo]` que a casa publica — `null` = nenhuma gaveta aberta */
let dialogoAberto: string | null = null;
const documento = {
  querySelector: (seletor: string) =>
    seletor === '[data-dialogo]' && dialogoAberto !== null
      ? { getAttribute: (attr: string) => (attr === 'data-dialogo' ? dialogoAberto : null) }
      : null,
};
Object.assign(globalThis, { window: janela, document: documento });

function fiosMock(overrides: Partial<FiosDosGestos> = {}): FiosDosGestos {
  return {
    pauseLookAtivo: () => false,
    noAtlas: () => true,
    orbitar: () => {},
    inclinar: () => {},
    olhar: () => {},
    selecionar: () => {},
    apontavel: () => true,
    nadaApontado: () => {},
    mergulhar: () => {},
    zoom: () => {},
    lente: () => {},
    fecharGavetas: () => {},
    ...overrides,
  };
}

/** todo punho vivo, para o `desligar()` no `afterEach` — mesmo cuidado
 *  de `arrastoDePonteiro.test.ts`: os listeners do `window` moram na
 *  `janela` COMPARTILHADA, e um punho que sobrevivesse ao próprio teste
 *  ouviria os eventos do teste seguinte. */
const punhos: Array<{ desligar: () => void }> = [];
afterEach(() => {
  while (punhos.length) punhos.pop()?.desligar();
});
beforeEach(() => {
  dialogoAberto = null;
});

function bancada(overrides: Partial<FiosDosGestos> = {}) {
  const canvas = Object.assign(new Barramento(), { classList: new ClasseFake() });
  const chamadas = {
    selecionar: [] as [number, number][],
    fecharGavetas: 0,
    apontavel: 0,
    nadaApontado: 0,
  };
  // `...overrides` vem PRIMEIRO: os três campos de baixo têm de vencer o
  // spread, senão um `overrides.apontavel` substituiria o envelope que
  // conta a chamada em vez de passar por dentro dele
  const fios = fiosMock({
    ...overrides,
    selecionar: (x, y) => chamadas.selecionar.push([x, y]),
    fecharGavetas: () => {
      chamadas.fecharGavetas++;
    },
    apontavel: (...args) => {
      chamadas.apontavel++;
      return overrides.apontavel ? overrides.apontavel(...args) : true;
    },
    nadaApontado: () => {
      chamadas.nadaApontado++;
      overrides.nadaApontado?.();
    },
  });
  const punho = ligarGestos(canvas as unknown as HTMLCanvasElement, fios);
  punhos.push(punho);
  const down = (clientX: number, clientY: number, pointerId = 1) =>
    canvas.emitir('pointerdown', {
      clientX,
      clientY,
      buttons: 1,
      button: 0,
      pointerId,
      pointerType: 'mouse',
      target: canvas,
    });
  const move = (clientX: number, clientY: number, buttons = 0) =>
    janela.emitir('pointermove', {
      clientX,
      clientY,
      buttons,
      pointerId: 1,
      pointerType: 'mouse',
      target: canvas,
    });
  const up = (clientX: number, clientY: number, pointerId = 1) =>
    janela.emitir('pointerup', {
      clientX,
      clientY,
      buttons: 0,
      button: 0,
      pointerId,
      pointerType: 'mouse',
      target: canvas,
    });
  return { canvas, chamadas, down, move, up };
}

describe('o cursor não promete o que a gaveta impede', () => {
  it('gaveta que o toque FECHA + hit-test verdadeiro → apontavel DESLIGADA', () => {
    dialogoAberto = 'ajustes'; // qualquer `[data-dialogo]` que não seja a ficha
    const b = bancada();
    b.move(500, 400);
    expect(b.canvas.classList.contains('apontavel')).toBe(false);
    // e o hit-test dos rótulos nem chega a rodar: a guarda da gaveta
    // corta antes, por curto-circuito do `&&`
    expect(b.chamadas.apontavel).toBe(0);
    // ...MAS O HOVER TEM DE SER APAGADO (item 120, F1): sem este aviso a
    // órbita ficaria acesa embaixo da gaveta, prometendo pela linha o
    // que o cursor acabou de negar. É o único caminho que ela tem para
    // saber, justamente porque o hit-test não roda.
    expect(b.chamadas.nadaApontado).toBe(1);
  });

  it('sem gaveta nenhuma + hit-test verdadeiro → apontavel LIGADA', () => {
    dialogoAberto = null;
    const b = bancada();
    b.move(500, 400);
    expect(b.canvas.classList.contains('apontavel')).toBe(true);
    expect(b.chamadas.apontavel).toBe(1);
    // dentro do alcance quem publica o hover é o próprio hit-test: o
    // aviso de "nada apontado" seria uma segunda voz sobre o mesmo
    // estado, e a última a falar venceria
    expect(b.chamadas.nadaApontado).toBe(0);
  });

  it('a ficha (gaveta que o toque NÃO fecha) liga o cursor — e o clique cumpre a promessa', () => {
    dialogoAberto = 'ficha';
    const b = bancada();
    b.move(500, 400);
    expect(b.canvas.classList.contains('apontavel')).toBe(true);
    // a mira vai em FRAÇÃO de tela: 500/1000 e 400/800
    b.down(500, 400);
    b.up(500, 400);
    expect(b.chamadas.selecionar).toEqual([[0.5, 0.5]]);
    expect(b.chamadas.fecharGavetas).toBe(0); // a ficha não fecha no toque
  });

  it('gaveta que o toque fecha: o clique correspondente FECHA e não seleciona — coerente com o cursor desligado', () => {
    dialogoAberto = 'busca';
    const b = bancada();
    b.move(500, 400);
    expect(b.canvas.classList.contains('apontavel')).toBe(false);
    b.down(500, 400);
    b.up(500, 400);
    expect(b.chamadas.fecharGavetas).toBe(1);
    expect(b.chamadas.selecionar).toEqual([]);
  });

  it('hit-test falso continua desligando, gaveta ou não — a guarda nova é um E, não substitui as outras', () => {
    dialogoAberto = null;
    const b = bancada({ apontavel: () => false });
    b.move(500, 400);
    expect(b.canvas.classList.contains('apontavel')).toBe(false);
  });
});

describe('a inclinação (07/10) — dois dedos juntos, Shift e o botão direito', () => {
  function gesto() {
    const canvas = Object.assign(new Barramento(), { classList: new ClasseFake() });
    const feito = { inclinar: [] as number[], orbitar: 0, selecionar: 0 };
    const punho = ligarGestos(
      canvas as unknown as HTMLCanvasElement,
      fiosMock({
        inclinar: (dy) => feito.inclinar.push(dy),
        orbitar: () => {
          feito.orbitar++;
        },
        selecionar: () => {
          feito.selecionar++;
        },
      })
    );
    punhos.push(punho);
    const evento = (pointerId: number, x: number, y: number, extra: object = {}) => ({
      clientX: x,
      clientY: y,
      button: 0,
      buttons: 1,
      pointerId,
      pointerType: 'touch',
      target: canvas,
      ...extra,
    });
    return {
      feito,
      punho,
      down: (id: number, x: number, y: number, extra?: object) =>
        canvas.emitir('pointerdown', evento(id, x, y, extra)),
      move: (id: number, x: number, y: number, extra?: object) =>
        janela.emitir('pointermove', evento(id, x, y, extra)),
      up: (id: number, x: number, y: number, extra?: object) =>
        janela.emitir('pointerup', evento(id, x, y, { buttons: 0, ...extra })),
    };
  }
  const soma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  it('os dois dedos SUBINDO juntos inclinam, e afastando ao mesmo tempo dão zoom', () => {
    const g = gesto();
    g.down(1, 400, 500);
    g.down(2, 600, 500);
    // 10 passos: cada dedo sobe 12 px e se afasta 5 px do outro
    for (let i = 1; i <= 10; i++) {
      g.move(1, 400 - 5 * i, 500 - 12 * i);
      g.move(2, 600 + 5 * i, 500 - 12 * i);
    }
    // a parte COMUM da subida, inteira: 120 px para cima (dy negativo)
    expect(soma(g.feito.inclinar)).toBeCloseTo(-120, 9);
    // ...e a distância entre os dedos cresceu: a pinça empurrou a roda
    expect(g.punho.embalandoZoom).toBe(true);
    // dois dedos não orbitam
    expect(g.feito.orbitar).toBe(0);
  });

  it('a pinça na VERTICAL (um sobe, o outro desce) é zoom, não inclinação', () => {
    const g = gesto();
    g.down(1, 500, 400);
    g.down(2, 500, 600);
    for (let i = 1; i <= 10; i++) {
      g.move(1, 500, 400 - 8 * i);
      g.move(2, 500, 600 + 8 * i);
    }
    expect(soma(g.feito.inclinar)).toBe(0);
    expect(g.punho.embalandoZoom).toBe(true);
  });

  it('Shift + arrastar inclina pelo vertical e não orbita', () => {
    const g = gesto();
    const mouse = { pointerType: 'mouse', shiftKey: true };
    g.down(1, 500, 600, mouse);
    for (let i = 1; i <= 10; i++) g.move(1, 500 + i, 600 - 20 * i, mouse);
    g.up(1, 510, 400, mouse);
    // o primeiro passo cai na janela do clique curto (6 px), o resto chega
    expect(soma(g.feito.inclinar)).toBeLessThan(-150);
    expect(g.feito.orbitar).toBe(0);
    expect(g.feito.selecionar).toBe(0);
  });

  it('o botão direito arrastado inclina; o clique curto dele não escolhe', () => {
    const g = gesto();
    const direito = { pointerType: 'mouse', button: 2, buttons: 2 };
    g.down(1, 500, 600, direito);
    for (let i = 1; i <= 10; i++) g.move(1, 500, 600 - 20 * i, direito);
    g.up(1, 500, 400, direito);
    expect(soma(g.feito.inclinar)).toBeLessThan(-150);
    expect(g.feito.orbitar).toBe(0);
    g.down(1, 500, 500, direito);
    g.up(1, 500, 500, direito);
    expect(g.feito.selecionar).toBe(0);
  });
});
