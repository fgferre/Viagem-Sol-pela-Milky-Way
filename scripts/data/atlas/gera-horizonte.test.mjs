// Serve: lei — o mapa de horizonte de Hipérion (item 226) mede a elevação que o relevo tapa, no quadro e na codificação do contrato
// ============================================================
// Grades sintéticas pequenas (esfera, bacia, calombo) na convenção da
// casa; o mapa real é provado no rascunho da receita de Hipérion.
// ============================================================
import { describe, expect, it } from 'vitest';
import { angulosDaMarcha, assaHorizonte } from './gera-horizonte.mjs';

const GRAU = Math.PI / 180;

/** direção da casa do centro do texel (i, j) — linha 0 = norte */
function direcaoDoTexel(i, j, W, H) {
  const lon = ((i + 0.5) / W) * 2 * Math.PI - Math.PI;
  const lat = Math.PI / 2 - ((j + 0.5) / H) * Math.PI;
  return [Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon)];
}

/** raio W×H com um perfil da distância angular a uma direção central */
function campoRadial(W, H, c, perfil) {
  const raio = new Float64Array(W * H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const d = direcaoDoTexel(i, j, W, H);
      const cos = Math.max(-1, Math.min(1, d[0] * c[0] + d[1] * c[1] + d[2] * c[2]));
      raio[j * W + i] = perfil(Math.acos(cos));
    }
  }
  return raio;
}

const senoEm = (senos, k, i, j, W, H) => senos[k * W * H + j * W + i];

describe('assaHorizonte', () => {
  it('a esfera perfeita não tapa nada: 0 em todo texel e todo azimute', () => {
    const W = 128;
    const H = 64;
    const { senos, horizon, horizon2 } = assaHorizonte({ raio: new Float64Array(W * H).fill(1), W, H });
    expect(senos.every((v) => v === 0)).toBe(true);
    expect(horizon.every((v) => v === 0)).toBe(true);
    expect(horizon2.every((v) => v === 0)).toBe(true);
    expect(horizon.length).toBe(W * H * 3);
  });

  it('no fundo de uma bacia, os 6 azimutes veem a borda na elevação exata', () => {
    // bacia parabólica de raio angular ρ = 12° e fundura k = 0,1: a corda
    // do fundo à borda passa por cima da parede, então o horizonte é a
    // BORDA, em θ = ρ e raio 1, visto de r0 = 1 − k:
    //   atan2(cos ρ − (1 − k), sin ρ) = 20,60° (sen = 0,3518).
    // (atan(k / sin ρ) = 25,7° ignora a curvatura, que aqui pesa.)
    const W = 512;
    const H = 256;
    const rho = 12 * GRAU;
    const k = 0.1;
    const raio = campoRadial(W, H, direcaoDoTexel(256, 128, W, H), (t) =>
      t < rho ? 1 - k * (1 - (t / rho) ** 2) : 1
    );
    const esperado = Math.atan2(Math.cos(rho) - (1 - k), Math.sin(rho));
    expect(esperado / GRAU).toBeCloseTo(20.6, 1);
    const { senos, horizon, horizon2 } = assaHorizonte({ raio, W, H });
    for (let az = 0; az < 6; az++) {
      const h = Math.asin(senoEm(senos, az, 256, 128, W, H));
      expect(Math.abs(h - esperado) / esperado, `azimute ${60 * az}°`).toBeLessThan(0.05);
    }
    // a codificação: sen·255 arredondado; horizon = 0/120/240°, horizon2 = 60/180/300°
    const p = (128 * W + 256) * 3;
    expect(horizon[p + 1]).toBe(Math.round(senoEm(senos, 2, 256, 128, W, H) * 255));
    expect(horizon2[p + 2]).toBe(Math.round(senoEm(senos, 5, 256, 128, W, H) * 255));
  });

  it('um calombo tapa só quem está dentro do alcance, e só do lado dele', () => {
    // calombo parabólico de altura h = 0,1 e raio angular w = 8°. O alcance
    // D* é a maior distância de onde algum ponto dele sobe acima do plano
    // tangente: (1 + h·p(θ − D))·cos θ > 1.
    const W = 512;
    const H = 256;
    const h = 0.1;
    const w = 8 * GRAU;
    const perfil = (x) => 1 + h * Math.max(0, 1 - (x / w) ** 2);
    let alcance = 0;
    for (let D = 0; D < 40 * GRAU; D += 0.02 * GRAU) {
      let ve = false;
      for (let t = 0.02 * GRAU; t <= 45 * GRAU && !ve; t += 0.02 * GRAU) {
        ve = perfil(t - D) * Math.cos(t) > 1;
      }
      if (ve) alcance = D;
    }
    expect(alcance / GRAU).toBeGreaterThan(24.6);
    expect(alcance / GRAU).toBeLessThan(30);
    const texel = (2 * Math.PI) / W;

    // (a) calombo num texel do equador; quem está a LESTE o vê a oeste
    // (180°, o B do horizon2) e nada a leste (0°)
    const ib = 128;
    const jb = 128;
    const { senos } = assaHorizonte({ raio: campoRadial(W, H, direcaoDoTexel(ib, jb, W, H), perfil), W, H });
    const dentro = Math.round((alcance - 4 * GRAU) / texel);
    const fora = Math.round((alcance + 4 * GRAU) / texel);
    expect(senoEm(senos, 3, ib + dentro, jb, W, H)).toBeGreaterThan(0.02);
    expect(senoEm(senos, 0, ib + dentro, jb, W, H)).toBe(0);
    // além do alcance, nenhum azimute vê nada
    for (let az = 0; az < 6; az++) {
      expect(senoEm(senos, az, ib + fora, jb, W, H), `azimute ${60 * az}°`).toBe(0);
    }

    // (b) o sentido de b (norte): calombo posto no azimute 60° (leste para
    // o norte) de um texel; ele aparece em 60° e não no espelho, 300°
    const ip = 256;
    const jp = 128;
    const [nx, ny, nz] = direcaoDoTexel(ip, jp, W, H);
    const lt = Math.hypot(nz, nx);
    const t = [nz / lt, 0, -nx / lt]; // normalize(cross((0,1,0), n))
    const b = [ny * t[2], nz * t[0] - nx * t[2], -ny * t[0]]; // cross(n, t)
    const D = alcance - 4 * GRAU;
    const e = [0, 1, 2].map((q) => Math.cos(60 * GRAU) * t[q] + Math.sin(60 * GRAU) * b[q]);
    const c = [nx, ny, nz].map((v, q) => Math.cos(D) * v + Math.sin(D) * e[q]);
    const { senos: s2 } = assaHorizonte({ raio: campoRadial(W, H, c, perfil), W, H });
    expect(senoEm(s2, 1, ip, jp, W, H)).toBeGreaterThan(0.02);
    expect(senoEm(s2, 5, ip, jp, W, H)).toBe(0);
    expect(senoEm(s2, 4, ip, jp, W, H)).toBe(0);
  });

  it('a marcha: 0,5 texel até 3°, 1 até 15°, 4 até 60°', () => {
    const graus = angulosDaMarcha(2048).map((t) => t / GRAU);
    const texel = 360 / 2048;
    expect(graus[0]).toBeCloseTo(texel / 2, 9);
    expect(graus[1] - graus[0]).toBeCloseTo(texel / 2, 9);
    expect(graus.at(-1)).toBeLessThanOrEqual(60);
    expect(graus.at(-1)).toBeGreaterThan(60 - 4 * texel);
    expect(graus.length).toBeGreaterThan(150);
    expect(graus.length).toBeLessThan(175);
  });
});
