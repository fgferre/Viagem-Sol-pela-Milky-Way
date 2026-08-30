// Serve: lei — todo desenhista de estrela que emite gl_PointSize prende o ponto na borda do clip, e o fragmento lê a distância verdadeira
// A conta da beira, e a fiação nos três desenhistas do STAR_FRAG.
// Apagar `prenderPontoNoClip(uScreenH)` de qualquer vértice, ou
// devolver o fragmento a `gl_PointCoord`, tem de reprovar.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STAR_FRAG, STAR_VERT } from './starShaders';
import {
  GLSL_PONTO_NA_BORDA,
  GLSL_PONTO_NA_BORDA_VARYINGS,
  prenderPontoNoClip,
  uvDoPonto,
} from './pontoNaBorda';

const SCREEN = { screenW: 1920, screenH: 1080 };

function ler(relativo: string) {
  return readFileSync(new URL(relativo, import.meta.url), 'utf8');
}

describe('prender o ponto dentro do clip', () => {
  it('no miolo do quadro o vértice não anda', () => {
    const out = prenderPontoNoClip({ ndcX: 0.2, ndcY: -0.4, sizePx: 20, ...SCREEN });
    expect(out.preso).toBe(false);
    expect(out.ndcX).toBe(0.2);
    expect(out.ndcY).toBe(-0.4);
    expect(out.sizePx).toBe(20);
    expect(out.meiaPx).toBe(10);
    expect(out.centroPxX).toBeCloseTo((0.2 * 0.5 + 0.5) * 1920, 10);
  });

  it('5 px fora da direita, sprite de 20: prende, cresce, e o rabo continua no quadro', () => {
    const ndcX = 1 + 5 / (1920 / 2);
    const out = prenderPontoNoClip({ ndcX, ndcY: 0, sizePx: 20, ...SCREEN });
    expect(out.preso).toBe(true);
    expect(out.ndcX).toBeLessThan(1);
    expect(out.centroPxX).toBeCloseTo(1920 + 5, 5);
    expect(out.meiaPx).toBe(10);
    expect(out.sizePx).toBeGreaterThan(20);
    const uvBorda = uvDoPonto(1919, out.centroPxY, out.centroPxX, out.centroPxY, out.meiaPx);
    expect(uvBorda[0] * uvBorda[0] + uvBorda[1] * uvBorda[1]).toBeLessThan(1);
  });

  it('longe demais para o sprite tocar o quadro: não prende — o GPU descarta certo', () => {
    const ndcX = 1 + 50 / (1920 / 2);
    const out = prenderPontoNoClip({ ndcX, ndcY: 0, sizePx: 20, ...SCREEN });
    expect(out.preso).toBe(false);
    expect(out.ndcX).toBe(ndcX);
    expect(out.sizePx).toBe(20);
  });

  it('o uv no centro verdadeiro é zero, na beira original é 1', () => {
    expect(uvDoPonto(100, 50, 100, 50, 10)).toEqual([0, 0]);
    expect(uvDoPonto(110, 50, 100, 50, 10)).toEqual([1, 0]);
  });
});

describe('a fiação — apagar a peça tem de reprovar', () => {
  const cascas = ler('../world/wrappedStars.ts');
  const planetas = ler('../world/planetas/planetas.ts');
  const chamada = 'prenderPontoNoClip(uScreenH)';

  it('o GLSL declara o centro verdadeiro e prende o vértice', () => {
    expect(GLSL_PONTO_NA_BORDA_VARYINGS).toContain('varying vec2 vCentroPx');
    expect(GLSL_PONTO_NA_BORDA).toContain('void prenderPontoNoClip(float screenH)');
    expect(GLSL_PONTO_NA_BORDA).toContain('gl_Position.xy = ndcPreso * gl_Position.w');
  });

  it('os três vértices do STAR_FRAG chamam a peça DEPOIS de gl_PointSize', () => {
    for (const [nome, src] of [
      ['catálogo', STAR_VERT],
      ['cascas', cascas],
      ['planetas', planetas],
    ] as const) {
      expect(src.includes(chamada), `${nome} não chama ${chamada}`).toBe(true);
      expect(
        src.includes('vCentroPx') || src.includes('GLSL_PONTO_NA_BORDA_VARYINGS'),
        `${nome} não declara o centro verdadeiro`
      ).toBe(true);
      const size = src.lastIndexOf('gl_PointSize = size;');
      const call = src.lastIndexOf(chamada);
      expect(size, `${nome}: gl_PointSize = size; sumiu`).toBeGreaterThanOrEqual(0);
      expect(call, `${nome}: a chamada sumiu`).toBeGreaterThan(size);
    }
  });

  it('o fragmento avalia pela distância verdadeira, não pelo PointCoord do vértice preso', () => {
    expect(STAR_FRAG).toContain('vCentroPx');
    expect(STAR_FRAG).toContain('gl_FragCoord');
    expect(STAR_FRAG).not.toContain('gl_PointCoord');
    expect(STAR_FRAG).not.toContain('void prenderPontoNoClip');
  });
});
