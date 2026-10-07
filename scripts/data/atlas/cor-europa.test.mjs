// Serve: lei — a cor de Europa (item 230, E1): a fração escura presa e monotônica, a costura sem degrau, o sul sem linha vazia e o mesmo mapa para a mesma entrada
// ============================================================
// Grades pequenas e sintéticas (o mosaico de 4096 é da prévia): um cinza
// sorteado por LCG com borda sul irregular e buracos, e uma "foto" com
// croma constante num disco — o passa-baixa dela é a própria constante,
// então o que a costura acrescenta é só a rampa.
// ============================================================
import { describe, expect, it } from 'vitest';
import { MEDIDAS, corDeEuropa, costuraDoHemisferio, fracaoEscura, preencheSul, sha256 } from './cor-europa.mjs';

function cinzaSintetico(W, H, semente = 7) {
  let s = semente;
  const lcg = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const g = new Uint8Array(W * H);
  for (let i = 0; i < W; i++) {
    const borda = Math.floor(H * 0.86) + (Math.floor(i / 17) % 4) * 3; // degraus de mosaico
    for (let j = 0; j <= borda; j++) g[j * W + i] = 100 + Math.floor(100 * lcg());
  }
  g[10 * W + 5] = 0; // buracos acima da borda
  g[40 * W + 99] = 0;
  return g;
}

describe('cor de Europa', () => {
  it('a fração escura é 0 na planície, 1 no escuro, presa a [0, 1] e não cresce com o L*', () => {
    const [Lp, Le] = [MEDIDAS.planicie[0], MEDIDAS.escuro[0]];
    expect(fracaoEscura(Lp)).toBe(0);
    expect(fracaoEscura(Le)).toBe(1);
    let antes = Infinity;
    for (let L = 0; L <= 100; L += 0.25) {
      const f = fracaoEscura(L);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
      expect(f).toBeLessThanOrEqual(antes);
      antes = f;
    }
  });

  it('na receita (b) a diferença real − mistura entra por rampa: nenhum passo entre vizinhos passa de 20 % do corte seco', () => {
    const W = 512;
    const H = 256;
    const a = new Float32Array(W * H);
    const b = new Float32Array(W * H);
    const real = { a: new Float32Array(W * H), b: new Float32Array(W * H), confianca: new Float32Array(W * H) };
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const lat = 90 - ((j + 0.5) * 180) / H;
        const lon = ((i + 0.5) * 360) / W - 180; // 0°E no meio da grade
        if (Math.hypot(lat, lon) > 40) continue;
        const k = j * W + i;
        real.a[k] = 8;
        real.b[k] = 8;
        real.confianca[k] = 1;
      }
    }
    const { salto } = costuraDoHemisferio(a, b, real, W, H);
    expect(salto.corteSecoMedio).toBeGreaterThan(11);
    let passo = 0;
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W - 1; i++) {
        const k = j * W + i;
        passo = Math.max(passo, Math.hypot(a[k + 1] - a[k], b[k + 1] - b[k]));
        if (j < H - 1) passo = Math.max(passo, Math.hypot(a[k + W] - a[k], b[k + W] - b[k]));
      }
    }
    expect(passo).toBeLessThan(0.2 * salto.corteSecoMedio);
    const centro = (H / 2) * W + W / 2;
    expect(a[centro]).toBeCloseTo(8, 1);
    expect(b[centro]).toBeCloseTo(8, 1);
  });

  it('depois do preenchimento do sul nenhum pixel fica 0 e nenhuma linha tem média zero; o preenchido é o que era vazio', () => {
    const W = 256;
    const H = 128;
    const g = cinzaSintetico(W, H);
    const { cinza, preenchido } = preencheSul(g, W, H);
    for (let j = 0; j < H; j++) {
      let soma = 0;
      for (let i = 0; i < W; i++) {
        const k = j * W + i;
        expect(cinza[k]).toBeGreaterThan(0);
        expect(preenchido[k]).toBe(g[k] === 0 ? 1 : 0);
        soma += cinza[k];
      }
      expect(soma / W).toBeGreaterThan(0);
    }
  });

  it('a mesma entrada dá o mesmo sha256 do RGB, e o tom muda o mapa', () => {
    const W = 256;
    const H = 128;
    const g = cinzaSintetico(W, H);
    const real = { a: new Float32Array(W * H).fill(4), b: new Float32Array(W * H).fill(-3), confianca: new Float32Array(W * H) };
    for (let k = 0; k < W * H; k += 1) if (Math.abs((k % W) - W / 2) < 30 && Math.abs(Math.floor(k / W) - H / 2) < 30) real.confianca[k] = 0.8;
    const mapa = (tom) => corDeEuropa({ cinza: g, largura: W, altura: H, receita: 'b', tom, yMedioAlvo: 0.44, real });
    const um = sha256(mapa('meio').rgb);
    expect(sha256(mapa('meio').rgb)).toBe(um);
    expect(sha256(mapa('T1').rgb)).not.toBe(um);
  });
});
