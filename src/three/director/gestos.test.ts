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
    olhar: () => {},
    selecionar: () => {},
    apontavel: () => true,
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
  const chamadas = { selecionar: [] as [number, number][], fecharGavetas: 0, apontavel: 0 };
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
  });

  it('sem gaveta nenhuma + hit-test verdadeiro → apontavel LIGADA', () => {
    dialogoAberto = null;
    const b = bancada();
    b.move(500, 400);
    expect(b.canvas.classList.contains('apontavel')).toBe(true);
    expect(b.chamadas.apontavel).toBe(1);
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
