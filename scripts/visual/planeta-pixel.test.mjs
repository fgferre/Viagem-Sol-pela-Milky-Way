// Serve: chão — a régua 3 casa corpo com alvo pelo pixel; mover o ALVO, não a mancha, tem de reprovar
// A RÉGUA 3 medida sem GPU — as funções puras de `planeta-pixel.mjs` contra
// imagens fabricadas aqui, onde a resposta certa é conhecida por construção.
//
// Existe pelo mesmo motivo que `chrome.test.mjs`: o instrumento que julga o
// gate não pode ser conferido só rodando o gate. Se a régua concordar com
// qualquer alvo, todo corpo "casa" e a tabela de 0,5 px vira decoração — e
// esse defeito não aparece na leva, porque a leva não tem gabarito. Aqui tem:
// a mancha é posta num lugar sabido e o teste cobra que mover o ALVO (não a
// mancha) reprove.
//
// (Importar o módulo ainda exige o Chrome instalado — `chrome.mjs` resolve o
// binário no topo, de propósito. O import NÃO sobe captura nenhuma: a leva
// mora atrás da guarda de `process.argv[1]`.)
import { describe, it, expect } from 'vitest';
import {
  LIMIAR_PICO,
  PROFUNDAS,
  RAIO_HALO_PX,
  TOLERANCIA_PX,
  autoTesteSintetico,
  caixaDeMeiaAltura,
  casarCorpos,
  componentesDoDiff,
  lerDbgPlan,
  manchaSaturada,
} from './planeta-pixel.mjs';

const W = 80;
const H = 60;

function fundo(nivel = 8) {
  const px = new Uint8ClampedArray(W * H * 4);
  for (let p = 0; p < W * H; p++) {
    px[p * 4] = nivel; px[p * 4 + 1] = nivel; px[p * 4 + 2] = nivel; px[p * 4 + 3] = 255;
  }
  return px;
}

/** uma gaussiana somada (é o que a camada faz: AdditiveBlending) */
function comMancha(base, manchas) {
  const px = Uint8ClampedArray.from(base);
  for (const s of manchas) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x + 0.5 - s.px;
        const dy = y + 0.5 - s.py;
        const v = s.pico * Math.exp(-(dx * dx + dy * dy) / (2 * (s.sigma ?? 1.5) ** 2));
        if (v < 0.5) continue;
        const i = (y * W + x) * 4;
        px[i] += Math.round(v);
        px[i + 1] += Math.round(v);
        px[i + 2] += Math.round(v);
      }
    }
  }
  return px;
}

const alvo = (id, px, py, pico = 1) => ({ id, px, py, m: 0, pico });

// ============================================================
// 1. O diff e as componentes
// ============================================================
describe('componentesDoDiff', () => {
  it('par idêntico: zero pixels acesos, zero componentes — é o piso de ruído', () => {
    const a = fundo();
    const r = componentesDoDiff({ a, b: a, W, H, limiar: 1, alvos: [] });
    expect(r.acesos).toBe(0);
    expect(r.componentes).toHaveLength(0);
  });

  it('duas manchas separadas dão DUAS componentes, e o centroide acha o centro', () => {
    const a = fundo();
    const b = comMancha(a, [
      { px: 20.3, py: 30.7, pico: 60 },
      { px: 60.5, py: 12.5, pico: 30 },
    ]);
    const r = componentesDoDiff({ a, b, W, H, limiar: 1, alvos: [] });
    expect(r.componentes).toHaveLength(2);
    const perto = (x, y) => r.componentes.find((c) => Math.hypot(c.cx - x, c.cy - y) < 1);
    for (const [x, y] of [[20.3, 30.7], [60.5, 12.5]]) {
      const c = perto(x, y);
      expect(c, `${x},${y}`).toBeDefined();
      expect(Math.hypot(c.cx - x, c.cy - y)).toBeLessThanOrEqual(TOLERANCIA_PX);
      expect(Math.hypot(c.cxCaixa - x, c.cyCaixa - y)).toBeLessThanOrEqual(TOLERANCIA_PX);
    }
  });

  it('só ADIÇÃO: nenhum canal cai quando a mancha é somada', () => {
    const a = fundo();
    const b = comMancha(a, [{ px: 40.5, py: 30.5, pico: 40 }]);
    const r = componentesDoDiff({ a, b, W, H, limiar: 1, alvos: [] });
    expect(r.desceram).toBe(0);
    expect(r.somaPerda).toBe(0);
    expect(r.somaGanho).toBeGreaterThan(0);
  });

  it('e ACUSA quando um canal cai — a ordem (a, b) é o que dá o sinal', () => {
    const a = fundo();
    const b = comMancha(a, [{ px: 40.5, py: 30.5, pico: 40 }]);
    // invertido de propósito: agora a "mudança" é perda de luz
    const r = componentesDoDiff({ a: b, b: a, W, H, limiar: 1, alvos: [] });
    expect(r.desceram).toBeGreaterThan(0);
    expect(r.subiram).toBe(0);
  });

  it('o limiar corta: com limiar 255 nada acende', () => {
    const a = fundo();
    const b = comMancha(a, [{ px: 40.5, py: 30.5, pico: 40 }]);
    expect(componentesDoDiff({ a, b, W, H, limiar: 255, alvos: [] }).componentes).toHaveLength(0);
  });

  it('`ondeCaiu` diz em QUAL componente cada alvo caiu, e −1 fora de todas', () => {
    const a = fundo();
    const b = comMancha(a, [{ px: 20.3, py: 30.7, pico: 60 }]);
    const alvos = [alvo('sun', 20.3, 30.7), alvo('pluto', 70.5, 50.5)];
    const r = componentesDoDiff({ a, b, W, H, limiar: 1, alvos });
    expect(r.ondeCaiu[0].dentroDe).toBe(0);
    expect(r.ondeCaiu[1].dentroDe).toBe(-1);
    expect(r.ondeCaiu[1].noQuadro).toBe(true);
  });

  it('alvo fora do quadro é marcado, não conta como componente perdida', () => {
    const a = fundo();
    const r = componentesDoDiff({ a, b: a, W, H, limiar: 1, alvos: [alvo('x', -3, 10)] });
    expect(r.ondeCaiu[0].noQuadro).toBe(false);
    expect(r.ondeCaiu[0].dentroDe).toBe(-1);
  });
});

// ============================================================
// 2. A mancha saturada — a definição operacional do SOB-GLARE
// ============================================================
// ============================================================
// 1b. A CAIXA DE MEIA-ALTURA (item 58a, 22/08) — o estimador grosso
// deixou de ser refém do último pixel do limiar de 1 degrau.
// ============================================================
describe('caixaDeMeiaAltura', () => {
  /** um mapa `dMax` de brinquedo, num quadro de largura `w` */
  function mapa(w, celulas) {
    const dMax = new Uint8Array(w * 40);
    const pixels = [];
    for (const [x, y, v] of celulas) {
      dMax[y * w + x] = v;
      pixels.push(y * w + x);
    }
    return { dMax, pixels, w };
  }

  it('um pixel solto no limiar NÃO estica a caixa — o defeito de Júpiter', () => {
    // o núcleo (delta 40) mais UM pixel de delta 1 uma linha acima: é
    // exatamente a forma medida na `ua40` em 22/08, que punha a caixa
    // crua em 7 linhas e derrubava o centro meio pixel
    const { dMax, pixels, w } = mapa(20, [
      [10, 5, 1],
      [10, 6, 40], [11, 6, 38], [10, 7, 39], [11, 7, 37],
    ]);
    const crua = { y0: 5, y1: 7 };
    expect((crua.y0 + crua.y1 + 1) / 2).toBe(6.5);
    const mh = caixaDeMeiaAltura(pixels, dMax, 40, w);
    expect(mh.y0).toBe(6);
    expect(mh.y1).toBe(7);
    expect((mh.y0 + mh.y1 + 1) / 2).toBe(7);
    expect(mh.n).toBe(4);
  });

  it('o corte é METADE do pico da componente, não um número fixo', () => {
    const { dMax, pixels, w } = mapa(20, [[3, 3, 100], [4, 3, 51], [5, 3, 49]]);
    const mh = caixaDeMeiaAltura(pixels, dMax, 100, w);
    expect(mh.x0).toBe(3);
    expect(mh.x1).toBe(4);
    expect(mh.n).toBe(2);
  });

  it('mancha chata (tudo no mesmo delta) devolve a caixa INTEIRA', () => {
    const { dMax, pixels, w } = mapa(20, [[2, 2, 9], [3, 2, 9], [4, 2, 9]]);
    const mh = caixaDeMeiaAltura(pixels, dMax, 9, w);
    expect([mh.x0, mh.x1, mh.n]).toEqual([2, 4, 3]);
  });

  it('a caixa da componente JÁ é a de meia-altura, e ela é MAIS ESTRITA', () => {
    // pela porta pública: a gaussiana do harness com uma faísca solta
    const base = fundo();
    const com = comMancha(base, [{ px: 40.5, py: 30.5, pico: 60, sigma: 1.5 }]);
    // a faísca de 1 degrau, cinco pixels acima do núcleo
    const i = ((30 - 5) * W + 40) * 4;
    com[i] += 1; com[i + 1] += 1; com[i + 2] += 1;
    const r = componentesDoDiff({ a: base, b: com, W, H, limiar: 1 });
    const c = r.componentes.reduce((m, x) => (x.n > m.n ? x : m));
    // a caixa CRUA subiu com a faísca...
    expect(c.y0).toBe(25);
    // ...e a de meia-altura, que é a julgada, ficou no núcleo
    expect(c.cyCaixa).toBeGreaterThan(29);
    expect(c.cyCaixa).toBeLessThan(32);
    expect(c.nMeia).toBeLessThan(c.n);
  });
});

describe('manchaSaturada', () => {
  it('devolve null onde o pixel não está no teto', () => {
    expect(manchaSaturada({ img: fundo(), W, H, x: 10.5, y: 10.5 })).toBeNull();
  });

  it('mede a área contígua em que os três canais bateram em 255', () => {
    const px = fundo();
    for (let y = 20; y < 25; y++) {
      for (let x = 30; x < 37; x++) {
        const i = (y * W + x) * 4;
        px[i] = 255; px[i + 1] = 255; px[i + 2] = 255;
      }
    }
    const m = manchaSaturada({ img: px, W, H, x: 33.5, y: 22.5 });
    expect(m).toMatchObject({ n: 35, x0: 30, y0: 20, x1: 36, y1: 24, larg: 7, alt: 5 });
  });
});

// ============================================================
// 3. O JUÍZO — e o que ele TEM de reprovar
// ============================================================
describe('casarCorpos', () => {
  const MANCHA_SOL = { px: 20.3, py: 30.7, pico: 60 };
  const MANCHA_LONGE = { px: 60.5, py: 12.5, pico: 30 };
  // as manchas são declaradas por teste: uma componente que nenhum alvo
  // reclama é ÓRFÃ e reprova de propósito, então "quais manchas existem" faz
  // parte do gabarito e não pode ser cenário fixo
  const cena = (alvos, manchas) => {
    const a = fundo();
    const b = comMancha(a, manchas);
    const r = componentesDoDiff({ a, b, W, H, limiar: 1, alvos });
    return casarCorpos({ previstos: alvos, componentes: r.componentes, ondeCaiu: r.ondeCaiu });
  };

  it('alvo certo: MEDIDO nos dois corpos, sem erro e sem componente órfã', () => {
    const j = cena([alvo('sun', 20.3, 30.7), alvo('jupiter', 60.5, 12.5)], [MANCHA_SOL, MANCHA_LONGE]);
    expect(j.linhas.map((l) => l.status)).toEqual(['MEDIDO', 'MEDIDO']);
    expect(j.erro).toBe(false);
    expect(j.orfas).toHaveLength(0);
    for (const l of j.linhas) {
      // POR EIXO: é a resolução da grade em que os dois estimadores vivem
      expect(Math.abs(l.dxC), l.id).toBeLessThanOrEqual(TOLERANCIA_PX);
      expect(Math.abs(l.dyC), l.id).toBeLessThanOrEqual(TOLERANCIA_PX);
      expect(Math.abs(l.dxB), l.id).toBeLessThanOrEqual(TOLERANCIA_PX);
      expect(Math.abs(l.dyB), l.id).toBeLessThanOrEqual(TOLERANCIA_PX);
      expect(l.caixaJulgada, l.id).toBe(true);
    }
  });

  it('ALVO DESLOCADO 3 px: FORA-DA-TOLERÂNCIA e erro — o teste que importa', () => {
    const j = cena([alvo('sun', 23.3, 30.7), alvo('jupiter', 60.5, 12.5)], [MANCHA_SOL, MANCHA_LONGE]);
    expect(j.linhas[0].status).toBe('FORA-DA-TOLERÂNCIA');
    expect(Math.abs(j.linhas[0].dxC)).toBeGreaterThan(TOLERANCIA_PX);
    expect(j.erro).toBe(true);
  });

  it('corpo previsto brilhante que NÃO acendeu: SEM-COMPONENTE e erro', () => {
    const j = cena([alvo('sun', 20.3, 30.7), alvo('venus', 5.5, 50.5, 10)], [MANCHA_SOL]);
    expect(j.linhas[1].status).toBe('SEM-COMPONENTE');
    expect(j.erro).toBe(true);
  });

  it('corpo sob o limiar de 8 bits: SOB-LIMIAR, declarado e SEM erro', () => {
    const j = cena([alvo('sun', 20.3, 30.7), alvo('neptune', 5.5, 50.5, LIMIAR_PICO / 10)], [MANCHA_SOL]);
    expect(j.linhas[1].status).toBe('SOB-LIMIAR');
    expect(j.erro).toBe(false);
  });

  it('corpo DENTRO da mancha do Sol: SOB-GLARE, e o Sol segue julgado', () => {
    const j = cena([alvo('sun', 20.3, 30.7), alvo('mercury', 20.9, 31.2)], [MANCHA_SOL]);
    expect(j.linhas[0].status).toBe('MEDIDO');
    // a caixa do Sol fica com o vizinho dentro: declarada, não julgada
    expect(j.linhas[0].caixaJulgada).toBe(false);
    expect(j.linhas[0].motivo).toContain('caixa não julgada');
    expect(j.linhas[1].status).toBe('SOB-GLARE');
    expect(j.linhas[1].motivo).toContain('sun');
    expect(j.erro).toBe(false);
  });

  it('componente contaminada NÃO absolve o centroide: 3 px de erro reprova igual', () => {
    // o Sol deslocado E com vizinho dentro da mancha — se a régua deixasse de
    // julgar os dois estimadores junto, este caso passaria em silêncio
    const j = cena([alvo('sun', 23.3, 30.7), alvo('mercury', 20.9, 31.2)], [MANCHA_SOL]);
    expect(j.linhas[0].status).toBe('FORA-DA-TOLERÂNCIA');
    expect(j.erro).toBe(true);
  });

  it('dois corpos QUE NÃO SÃO O SOL na mesma mancha: FUNDIDO nos dois', () => {
    const j = cena([alvo('venus', 60.2, 12.2), alvo('earth', 60.9, 12.9)], [MANCHA_LONGE]);
    expect(j.linhas.map((l) => l.status)).toEqual(['FUNDIDO', 'FUNDIDO']);
    expect(j.erro).toBe(false);
  });

  it('LUZ SEM DONO longe de todo corpo previsto REPROVA', () => {
    const j = cena([alvo('sun', 20.3, 30.7)], [MANCHA_SOL, MANCHA_LONGE]);
    const orfa = j.orfas.find((o) => Math.abs(o.cx - 60.5) < 1);
    expect(orfa).toBeDefined();
    expect(orfa.dMin).toBeGreaterThan(RAIO_HALO_PX);
    expect(orfa.halo).toBe(false);
    expect(j.erro).toBe(true);
  });
});

// ============================================================
// 4. O readout que a régua consome
// ============================================================
describe('lerDbgPlan', () => {
  const CORPOS = [
    'sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  ];
  const bloco = [
    '[dbgplan] época 2026-01-01T00:00:00Z = JD 2461041.5008692136 TDB · instante retrato · '
      + 'câmera a 150.000 UA '
      + '(0.002372 anos-luz; 0.00072722 pc, régua interna) · tela 1800×1713 px · '
      + 'expoM0=3.5 · sigmaPx=0.85 · visível=true',
    ...CORPOS.map((id, i) =>
      `[dbgplan] ${id.padEnd(8)} ecl=(0.000000000, 0.000000000, 0.000000000) UA · `
      + 'cena=(0, 0, 0) pc[régua interna] · '
      + 'ndc=(0.000000000, 0.000000000, 0.000000000) · '
      + `px=(${(900 + i).toFixed(6)}, ${(856.5 - i).toFixed(6)}) · `
      + `dObs=150.000000 UA · fase=1.000000000 · m=${(-15.84 + i).toFixed(6)} · `
      + `E=1.234567e+${i} · pico=9.876543e-${i + 1}`),
  ].join('\n');

  it('lê cabeçalho, os dez corpos, o px e o pico que o app calculou', () => {
    const d = lerDbgPlan(bloco);
    expect(d.cameraUA).toBe(150);
    expect(d.largura).toBe(1800);
    expect(d.altura).toBe(1713);
    expect(d.expoM0).toBe(3.5);
    expect(d.sigmaPx).toBe(0.85);
    expect(d.visivel).toBe(true);
    expect(d.corpos.map((c) => c.id)).toEqual(CORPOS);
    expect(d.corpos[0]).toMatchObject({ px: 900, py: 856.5, m: -15.84, pico: 9.876543e-1 });
    expect(d.corpos[9].px).toBe(909);
    expect(d.corpos[9].pico).toBe(9.876543e-10);
  });

  it('bloco truncado é ERRO, não meia-tabela em silêncio', () => {
    expect(() => lerDbgPlan(bloco.split('\n').slice(0, 5).join('\n'))).toThrow(/5 linhas/);
  });
});

// ============================================================
// 5. O auto-teste que o próprio script roda antes de medir
// ============================================================
describe('autoTesteSintetico', () => {
  it('passa nos três estados: acha o certo, recusa o torto, e o par nulo é zero', () => {
    const r = autoTesteSintetico();
    expect(r.aprovouCerto).toBe(true);
    expect(r.reprovouTorto).toBe(true);
    expect(r.parNulo).toBe(true);
    expect(r.soAdicao).toBe(true);
    expect(r.passou).toBe(true);
  });
});

describe('a lista de vistas', () => {
  it('a régua mede as TRÊS profundas da D9', () => {
    expect(PROFUNDAS).toEqual(['ua500', 'ua150', 'ua40']);
  });
});
