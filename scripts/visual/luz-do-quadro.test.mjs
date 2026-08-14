// As duas contas PURAS da régua da luz — as que julgam sem subir Chrome.
//
// A régua inteira não é testável aqui (ela captura), mas as duas funções que
// decidem o VEREDITO são: `discoRealPx` é a verdade geométrica contra a qual o
// borrão é julgado, e `medirQuadro` é quem lê a imagem. Se qualquer uma das
// duas mentir, a régua vira decoração — e o item 3 continua sem juiz.
//
// O molde é o de `planeta-pixel.test.mjs`: imagens FABRICADAS, com o resultado
// conhecido de antemão, mais um caso de sabotagem que tem de dar vermelho.
import { describe, it, expect } from 'vitest';
import { discoRealPx, medirQuadro, ESCADA_UA } from './luz-do-quadro.mjs';

/** Um quadro RGB sólido de luminância `y` (0..1), em 8 bits. */
function quadroSolido(largura, altura, y) {
  const v = Math.round(y * 255);
  return new Uint8Array(largura * altura * 3).fill(v);
}

describe('discoRealPx — a verdade geométrica do disco do Sol', () => {
  it('a 1 UA o Sol mede 0,533° — a aferição que todo mundo pode conferir no céu', () => {
    // θ = 2·R☉/1 UA = 2·2,2566840209436597e-8 / 4,84813681e-6 rad
    const graus = (2 * 2.2566840209436597e-8) / (1 / 206264.80624548031) * (180 / Math.PI);
    expect(graus).toBeCloseTo(0.5331, 3);
    // e projetado num buffer de 900 px com a lente de fábrica (58°)
    expect(discoRealPx(1, 900, 58)).toBeCloseTo(7.558, 3);
  });

  it('cai com 1/d EXATO — dobrar a distância divide o disco por dois', () => {
    // não `toBeCloseTo`: a lei é 1/d e a divisão por 2 é exata em IEEE754
    // para estes valores. Um desvio aqui seria erro de fórmula, não de ULP.
    expect(discoRealPx(2, 900, 58) * 2).toBeCloseTo(discoRealPx(1, 900, 58), 12);
    expect(discoRealPx(4000, 900, 58) * 4000).toBeCloseTo(discoRealPx(1, 900, 58), 9);
  });

  it('a escada padrão atravessa o vão inteiro do item 3, de ponta a ponta', () => {
    // da parede de fogo (bola de 113 px) até a véspera de 0,02 pc (0,002 px):
    // quatro ordens de grandeza de disco. É contra ISTO que o borrão constante
    // de hoje é acusado.
    expect(discoRealPx(ESCADA_UA[0], 900, 58)).toBeGreaterThan(100);
    expect(discoRealPx(ESCADA_UA[ESCADA_UA.length - 1], 900, 58)).toBeLessThan(0.01);
  });
});

describe('medirQuadro — o que a régua lê na imagem', () => {
  it('quadro preto: luz média 0, nada acima de meia luz, borrão 0', () => {
    const m = medirQuadro(quadroSolido(64, 64, 0), 64, 64);
    expect(m.luzMedia).toBe(0);
    expect(m.acimaDeMeia).toBe(0);
    expect(m.borrao).toBe(0);
  });

  it('quadro branco: luz média 1 (a menos de 1 ULP), tudo acima de meia luz, borrão do tamanho da largura', () => {
    const m = medirQuadro(quadroSolido(64, 64, 1), 64, 64);
    // NÃO é 1 exato, e o motivo fica escrito para ninguém "consertar" a lei:
    // 0,2126 + 0,7152 + 0,0722 dá 0,9999999999999999 em IEEE754. Branco puro
    // devolve esse valor, não 1. Trocar os coeficientes por três que somem 1
    // exato faria a régua discordar do `KNEE_SHADER` (post.ts:51), que é quem
    // decide de verdade o que é meia luz na cadeia.
    expect(m.luzMedia).toBeCloseTo(1, 12);
    expect(m.luzMedia).toBeLessThanOrEqual(1);
    expect(m.acimaDeMeia).toBe(1);
    expect(m.borrao).toBe(64);
  });

  it('a luminância é a Rec.709 — a MESMA do knee em post.ts, não a média dos canais', () => {
    const px = new Uint8Array(3);
    px[0] = 255; px[1] = 0; px[2] = 0; // vermelho puro
    const m = medirQuadro(px, 1, 1);
    // 0,2126 e não 1/3: se alguém trocar a lei por (r+g+b)/3 este número vira
    // 0,333 e a régua passa a discordar do shader sobre o que é "meia luz".
    expect(m.luzMedia).toBeCloseTo(0.2126, 4);
  });

  it('o borrão é medido do CENTRO para fora, e ignora mancha que não toca o meio', () => {
    // 21 px de largura, 3 de altura. Linha do meio: uma faixa clara de 5 px
    // NO CANTO ESQUERDO, e o centro preto.
    const W = 21, H = 3;
    const d = new Uint8Array(W * H * 3);
    for (let x = 0; x < 5; x++) {
      const p = (1 * W + x) * 3;
      d[p] = d[p + 1] = d[p + 2] = 255;
    }
    const m = medirQuadro(d, W, H);
    // borrão 0: a mancha existe e é clara, mas não é o assunto do quadro. É a
    // guarda contra uma estrela brilhante fora do eixo entrar na conta do Sol.
    expect(m.borrao).toBe(0);
    // o pico VÊ a mancha (ela é branca) — quem a ignora é só o borrão
    expect(m.pico).toBeCloseTo(1, 12);
  });

  it('mancha centrada de 7 px devolve borrão 7 — e não a contagem de toda a imagem', () => {
    const W = 21, H = 3;
    const d = new Uint8Array(W * H * 3);
    for (let x = 7; x <= 13; x++) {
      const p = (1 * W + x) * 3;
      d[p] = d[p + 1] = d[p + 2] = 255;
    }
    const m = medirQuadro(d, W, H);
    expect(m.borrao).toBe(7);
  });

  it('SABOTAGEM: um quadro lavado NÃO pode passar por honesto', () => {
    // é o caso medido hoje a 40 UA (luz média 0,946, 100% acima de meia luz).
    // Se a régua devolvesse "acimaDeMeia" abaixo de 1 aqui, ela estaria
    // escondendo exatamente o defeito que existe para denunciar.
    const m = medirQuadro(quadroSolido(64, 64, 0.95), 64, 64);
    expect(m.acimaDeMeia).toBe(1);
    expect(m.luzMedia).toBeGreaterThan(0.9);
  });
});
