// Serve: chão — o teto do pronto, o controle fora da cobertura e a transição (b) do juiz da poeira reprovam o que devem, sem subir Chrome
// As contas PURAS do juiz da poeira (destravar, 21/11/2026). O juiz inteiro
// captura e não roda aqui; o que decide os vereditos roda. Cada um tem
// o seu CONTROLE NEGATIVO, no molde de `memoria.test.mjs`.
import { describe, it, expect } from 'vitest';
import {
  julgarControle, julgarDepoisDaTroca, julgarPronto, TETO_PRONTO_MS,
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

describe('o controle fora da cobertura, pelo teto de ruído da casa (22/11)', () => {
  // a foto do controle: 1280×720 em DPR 2
  const total = 2560 * 1440;
  const medida = (diferentes, maior = 1) => ({ diferentes, maior });
  const caso = (entre, ruidoOn, ruidoOff, md5On = ['a1', 'a2'], md5Off = ['b1', 'b2']) =>
    julgarControle({ md5On, md5Off, entre, ruidoOn, ruidoOff, total });

  it('um md5 em comum entre os lados é IGUAL', () => {
    const v = caso(medida(8), medida(0, 0), medida(0, 0), ['a1', 'c'], ['c', 'b2']);
    expect([v.ok, v.veredito]).toEqual([true, 'IGUAL']);
  });

  it('a diferença entre os lados dentro do teto passa, mesmo com a mesma URL repetindo o md5', () => {
    expect([caso(medida(8), medida(7), medida(5)).ok, caso(medida(8), medida(7), medida(5)).veredito])
      .toEqual([true, 'DENTRO DO TETO']);
    // o "piso zero ⇒ DIFERE" da folga de 2× saiu por decisão: 1 px de 1/255 cabe no teto
    expect(caso(medida(1), medida(0, 0), medida(0, 0), ['a', 'a'], ['b', 'b']).ok).toBe(true);
  });

  it('CONTROLE NEGATIVO: a poeira vazando acima do teto é DIFERE', () => {
    // em nível: 3/255 num punhado de px
    const nivel = caso(medida(4, 3), medida(7), medida(5));
    expect([nivel.ok, nivel.veredito]).toEqual([false, 'DIFERE']);
    // em área: 1/255 em mais de 0,03 % dos px
    expect(caso(medida(Math.floor(total * 0.0003) + 1), medida(7), medida(5)).ok).toBe(false);
  });

  it('CONTROLE NEGATIVO: a MESMA URL acima do teto reprova dizendo que a vista não é determinística', () => {
    const v = caso(medida(0, 0), medida(9, 2), medida(5));
    expect([v.ok, v.veredito]).toEqual([false, 'NÃO DETERMINÍSTICA']);
    expect(v.texto).toContain('a vista não é determinística');
    expect(v.texto).toContain('9 px de 3686400');
  });
});

describe('a transição (b), depois da troca × do zero', () => {
  const total = 640 * 360;
  it('os 9 px a 1/255 medidos com o conserto do pronto passam', () => {
    expect(julgarDepoisDaTroca({ diferentes: 9, maior: 1, total }).ok).toBe(true);
  });

  it('CONTROLE NEGATIVO: a foto do pronto cedo (11.832 px, 15/255) reprova, e 2/255 num px também', () => {
    expect(julgarDepoisDaTroca({ diferentes: 11832, maior: 15, total }).ok).toBe(false);
    expect(julgarDepoisDaTroca({ diferentes: 1, maior: 2, total }).ok).toBe(false);
  });
});
