// Serve: chão — o teto do pronto e o controle fora da cobertura do juiz da poeira reprovam o que devem, sem subir Chrome
// As contas PURAS do juiz da poeira (destravar, 21/11/2026). O juiz inteiro
// captura e não roda aqui; o que decide os dois vereditos roda. Cada um tem
// o seu CONTROLE NEGATIVO, no molde de `memoria.test.mjs`.
import { describe, it, expect } from 'vitest';
import {
  diferencaPorPixel, julgarControle, julgarPronto, FOLGA_DO_RUIDO, TETO_PRONTO_MS,
} from './poeira-shaders.mjs';

describe('o teto do pronto', () => {
  it('é 20 s, e o pronto dos 9,2 s do D3D11 passa dizendo os segundos', () => {
    expect(TETO_PRONTO_MS).toBe(20000);
    const r = julgarPronto(9200);
    expect(r.ok).toBe(true);
    expect(r.texto).toContain('pronto em 9.2 s');
  });

  it('reprova quando o pronto não chega em 20 s', () => {
    expect(julgarPronto(null).ok).toBe(false);
    expect(julgarPronto(null).texto).toContain('não voltou a ficar pronta em 20 s');
    expect(julgarPronto(20500).ok).toBe(false);
  });
});

describe('diferencaPorPixel', () => {
  it('conta px que diferem em algum canal e a maior diferença', () => {
    const a = Uint8Array.from([10, 10, 10, 50, 50, 50, 0, 0, 0]);
    const b = Uint8Array.from([10, 11, 10, 50, 50, 53, 0, 0, 0]);
    expect(diferencaPorPixel(a, b, 3)).toEqual({ diferentes: 2, maior: 3 });
  });
});

describe('o controle fora da cobertura', () => {
  const ruido = (diferentes, maior = 1) => ({ diferentes, maior });
  const caso = (entre, ruidoOn, ruidoOff, md5On = ['a1', 'a2'], md5Off = ['b1', 'b2']) =>
    julgarControle({ md5On, md5Off, entre, ruidoOn, ruidoOff });

  it('um md5 em comum entre os lados é IGUAL', () => {
    const v = caso(ruido(8), ruido(0, 0), ruido(0, 0), ['a1', 'c'], ['c', 'b2']);
    expect([v.ok, v.veredito]).toEqual([true, 'IGUAL']);
  });

  it('a diferença entre os lados dentro do ruído do mesmo lado passa', () => {
    const v = caso(ruido(8), ruido(7), ruido(5));
    expect([v.ok, v.veredito]).toEqual([true, 'DENTRO DO RUÍDO']);
  });

  it('REPROVA quando a diferença passa do piso de ruído medido vezes a folga', () => {
    expect(caso(ruido(7 * FOLGA_DO_RUIDO + 1), ruido(7), ruido(5)).ok).toBe(false);
    // o nível também conta: ruído de 1/255, poeira de 3/255 num punhado de px
    expect(caso(ruido(4, 3), ruido(7), ruido(5)).ok).toBe(false);
  });

  it('lados que repetem o próprio md5 têm piso zero: qualquer diferença é DIFERE', () => {
    const v = caso(ruido(1), ruido(0, 0), ruido(0, 0), ['a', 'a'], ['b', 'b']);
    expect([v.ok, v.veredito]).toEqual([false, 'DIFERE']);
    expect(v.texto).toContain('entre os lados 1 px');
  });
});
