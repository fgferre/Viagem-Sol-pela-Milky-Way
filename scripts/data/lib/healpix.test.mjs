// ============================================================
// HEALPix NEST (E1, item 3 do PLAN.md). O oráculo é a fixture gerada
// pelo healpy oficial (fixtures/healpix-nside256.json, script em
// fixtures/gera-referencia-edenhofer.py) — o algoritmo nunca é
// reimplementado aqui, só comparado contra ele e contra si mesmo
// (round-trip, cobertura).
//
// Nos vértices onde 3+ faces se encontram (a categoria "verticeOuAresta"
// da fixture), `ang2pix_nest` de ponto flutuante pode legitimamente
// discordar do healpy por 1 pixel vizinho: medido, sempre a menos de 1
// tamanho de pixel da direção verdadeira (é um empate de arredondamento
// num ponto que está exatamente na borda, não um erro de face). Por
// isso esse grupo é cobrado por proximidade angular quando não bate
// exato; os centros de face e as 250 direções aleatórias (que não caem
// exatamente numa borda) são cobrados por igualdade estrita.
// ============================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ang2pixNest, pix2angNest, pix2vecNest, vec2pixNest } from './healpix.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(AQUI, '..', 'fixtures', 'healpix-nside256.json'), 'utf8')
);
const { nside } = fixture;

function tamanhoPixel(n) {
  return Math.sqrt(Math.PI / 3) / n;
}

function anguloEntre(a, b) {
  const cosseno = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return Math.acos(Math.min(1, Math.max(-1, cosseno)));
}

function rng(semente) {
  let estado = semente;
  return () => {
    estado = (estado * 1103515245 + 12345) & 0x7fffffff;
    return estado / 0x7fffffff;
  };
}

describe('ang2pixNest contra a fixture do healpy (nside 256, NEST)', () => {
  it('bate exatamente nos 12 centros de face e nas 250 direções aleatórias', () => {
    const exatos = fixture.pontos.filter((p) => p.categoria !== 'verticeOuAresta');
    expect(exatos).toHaveLength(262);
    for (const { theta, phi, pix } of exatos) {
      expect(ang2pixNest(nside, theta, phi)).toBe(pix);
    }
  });

  it('nos vértices/arestas das 12 faces, bate exato quase sempre; quando não, o pixel discordante ainda fica a menos de 1 tamanho de pixel da direção verdadeira', () => {
    const bordas = fixture.pontos.filter((p) => p.categoria === 'verticeOuAresta');
    expect(bordas).toHaveLength(96);
    const tam = tamanhoPixel(nside);
    let exatos = 0;
    for (const { theta, phi, pix } of bordas) {
      const meu = ang2pixNest(nside, theta, phi);
      if (meu === pix) {
        exatos += 1;
        continue;
      }
      const direcao = [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
      const centroMeu = pix2vecNest(nside, meu);
      expect(anguloEntre(direcao, centroMeu)).toBeLessThan(tam);
    }
    // medido: só os empates de ponto flutuante nos vértices triplos (4 de
    // 96) caem para a checagem de proximidade acima; o resto bate exato.
    expect(exatos).toBeGreaterThanOrEqual(bordas.length - 8);
  });
});

describe('pix2vecNest contra a fixture do healpy', () => {
  it('bate nos 12 centros de face e nos 50 pixels aleatórios', () => {
    expect(fixture.pix2vec).toHaveLength(62);
    for (const { pix, x, y, z } of fixture.pix2vec) {
      const [mx, my, mz] = pix2vecNest(nside, pix);
      expect(mx).toBeCloseTo(x, 9);
      expect(my).toBeCloseTo(y, 9);
      expect(mz).toBeCloseTo(z, 9);
    }
  });
});

describe('round-trip e cobertura (algoritmo puro, sem fixture)', () => {
  it('vec2pixNest(pix2vecNest(p)) === p para pixels aleatórios em vários nside', () => {
    const sortear = rng(12345);
    for (const n of [4, 16, 64, 256]) {
      const npix = 12 * n * n;
      for (let i = 0; i < 200; i += 1) {
        const p = Math.floor(sortear() * npix);
        const [x, y, z] = pix2vecNest(n, p);
        expect(vec2pixNest(n, x, y, z)).toBe(p);
      }
    }
  });

  it('a distância angular entre pix2vec(p) e pix2vec(ang2pix(pix2vec(p))) é menor que 2× o tamanho do pixel', () => {
    const sortear = rng(999);
    for (const n of [8, 32, 128]) {
      const npix = 12 * n * n;
      const tam = tamanhoPixel(n);
      for (let i = 0; i < 100; i += 1) {
        const p = Math.floor(sortear() * npix);
        const v = pix2vecNest(n, p);
        const { theta, phi } = pix2angNest(n, p);
        const v2 = pix2vecNest(n, ang2pixNest(n, theta, phi));
        expect(anguloEntre(v, v2)).toBeLessThan(2 * tam);
      }
    }
  });

  it('para nside 1, 2 e 4, uma grade densa de direções cobre todos os 12·nside² pixels e nada fora do intervalo', () => {
    for (const n of [1, 2, 4]) {
      const npix = 12 * n * n;
      const vistos = new Set();
      const passos = 250;
      for (let it = 0; it <= passos; it += 1) {
        const theta = Math.min(Math.max((Math.PI * it) / passos, 1e-9), Math.PI - 1e-9);
        for (let ip = 0; ip < passos; ip += 1) {
          const phi = (2 * Math.PI * ip) / passos;
          const pix = ang2pixNest(n, theta, phi);
          expect(pix).toBeGreaterThanOrEqual(0);
          expect(pix).toBeLessThan(npix);
          vistos.add(pix);
        }
      }
      expect(vistos.size).toBe(npix);
    }
  });
});

describe('validação', () => {
  it('nside precisa ser potência de 2', () => {
    expect(() => ang2pixNest(3, 1, 1)).toThrow(/potência de 2/);
    expect(() => vec2pixNest(0, 1, 0, 0)).toThrow(/potência de 2/);
    expect(() => pix2angNest(5, 0)).toThrow(/potência de 2/);
  });

  it('pix2angNest/pix2vecNest rejeitam índice fora do intervalo', () => {
    expect(() => pix2angNest(4, -1)).toThrow(/fora do intervalo/);
    expect(() => pix2angNest(4, 12 * 16)).toThrow(/fora do intervalo/);
  });

  it('vec2pixNest rejeita vetor nulo', () => {
    expect(() => vec2pixNest(4, 0, 0, 0)).toThrow(/nulo/);
  });
});
