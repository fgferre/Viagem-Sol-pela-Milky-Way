// A textura do flare (item 44/R1): a receita de 30/07 assada. Os testes
// cobram as três promessas da prancha: borda em círculo (quadrado
// impossível), cruz fina e comprida presente, e canais neutros que zeram
// EXATOS na borda do quad.
import { describe, expect, it } from 'vitest';
import {
  AMPLITUDE_DA_CRUZ,
  AMPLITUDE_DO_HALO,
  LADO_DA_TEXTURA,
  gerarTexturaDoFlare,
} from './flare';
import { TETO_DE_LUZ_DO_FLARE, ganhoDeEntradaDoFlare, picoComTeto } from '../estrela';

/** lê um canal decodificado (√v → v) no texel mais próximo de (u,v) em -1..1 */
function canal(dados: Uint8Array, lado: number, u: number, v: number, c: 0 | 1): number {
  const x = Math.min(lado - 1, Math.max(0, Math.round(((u + 1) / 2) * lado - 0.5)));
  const y = Math.min(lado - 1, Math.max(0, Math.round(((v + 1) / 2) * lado - 0.5)));
  const bruto = dados[(y * lado + x) * 4 + c] / 255;
  return bruto * bruto;
}

describe('a textura do flare — a receita de 30/07 assada', () => {
  const tex = gerarTexturaDoFlare();
  const dados = tex.image.data as Uint8Array;
  const lado = LADO_DA_TEXTURA;

  it('halo: máximo no centro, decai radial, e é NEUTRO (um canal só)', () => {
    const centro = canal(dados, lado, 0, 0, 0);
    expect(centro).toBeGreaterThan(0.9);
    expect(canal(dados, lado, 0.3, 0, 0)).toBeLessThan(centro);
    expect(canal(dados, lado, 0.6, 0, 0)).toBeLessThan(canal(dados, lado, 0.3, 0, 0));
  });

  it('cruz: braço fino e comprido — forte no eixo, fraco na diagonal', () => {
    // a razão 16/2,4 da receita: a 0,5 do centro, o eixo carrega o braço
    // e a diagonal (a 45°) está ordens de grandeza abaixo
    const noEixo = canal(dados, lado, 0.5, 0, 1);
    const naDiagonal = canal(dados, lado, 0.5 / Math.SQRT2, 0.5 / Math.SQRT2, 1);
    expect(noEixo).toBeGreaterThan(0.05);
    expect(naDiagonal).toBeLessThan(noEixo / 20);
    // e os DOIS braços existem (horizontal e vertical iguais por simetria)
    expect(canal(dados, lado, 0, 0.5, 1)).toBeCloseTo(noEixo, 2);
  });

  it('a borda zera EXATA em círculo: r ≥ 1 é zero — inclusive no meio da aresta', () => {
    // meio da aresta do quad (r = 1): zero — é aqui que a moldura
    // quadrada do desenho anterior aparecia
    expect(canal(dados, lado, 0.999, 0, 0)).toBe(0);
    expect(canal(dados, lado, 0.999, 0, 1)).toBe(0);
    expect(canal(dados, lado, 0, 0.999, 0)).toBe(0);
    // canto (r = 1,41): zero com folga
    expect(canal(dados, lado, 0.999, 0.999, 0)).toBe(0);
    expect(canal(dados, lado, 0.999, 0.999, 1)).toBe(0);
  });

  it('as amplitudes da receita seguem as de 30/07 (halo 0,9 / cruz 0,8)', () => {
    expect(AMPLITUDE_DO_HALO).toBe(0.9);
    expect(AMPLITUDE_DA_CRUZ).toBe(0.8);
  });
});

describe('a luz do clarão do Sol — teto baixo de propósito', () => {
  it('a dose satura em ~8: o fluxo cegante do Sol nunca vira prato branco', () => {
    // prato branco de borda dura foi medido na 1ª leva da R1 (dose alta
    // saturava o quad inteiro); o rim dourado mora na faixa 0,1–1
    expect(picoComTeto(1e9)).toBeLessThanOrEqual(TETO_DE_LUZ_DO_FLARE);
    expect(picoComTeto(1e9)).toBeGreaterThan(0.99 * TETO_DE_LUZ_DO_FLARE);
    // e o teto fica muito abaixo do β da emissão (300): compressão
    // ~linear, matiz intacto
    expect(TETO_DE_LUZ_DO_FLARE).toBeLessThan(300 / 30);
  });

  it('gatilho de 30/07: acende no núcleo estourado, satura em pico 4', () => {
    expect(ganhoDeEntradaDoFlare(1)).toBe(0);
    expect(ganhoDeEntradaDoFlare(2)).toBeCloseTo(0.5, 12);
    expect(ganhoDeEntradaDoFlare(4)).toBe(1);
  });
});
