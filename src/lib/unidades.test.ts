// ============================================================
// A ESCADA DE UNIDADES que o visitante lê — km → UA → anos-luz.
//
// Os dois primeiros blocos vieram de `buscaEstrelas.test.ts`, onde
// moravam desde a F2b: o degrau sub-UA era metade de uma escada, e a
// outra metade (os anos-luz) estava copiada em três arquivos fora da
// lib — por isso o rótulo da estrela dizia "8.6 AL" enquanto a paleta
// de busca, a um palmo dele, dizia "8,6 anos-luz". A escada inteira
// virou uma função; o gate dela é este arquivo.
// ============================================================
import { describe, expect, it } from 'vitest';
import { UA_POR_AL, UA_POR_PC, notaDeDistancia } from './unidades';

/** o formatador injetado dos testes: uma casa, vírgula decimal */
const fmt = (v: number) => String(Math.round(v * 100) / 100).replace('.', ',');

// ============================================================
// F2b (emenda P-E10a): o degrau de unidade sub-UA da nota — o par
// lua↔pai fala QUILÔMETROS, nunca "0,0026 UA".
// ============================================================
describe('notaDeDistancia — o degrau de unidade sub-UA', () => {
  it('a Lua lê "384 mil km", nunca 0,0026 UA', () => {
    // 384.400 km ≈ 0,002570 UA — o caso que dá nome à emenda
    expect(notaDeDistancia(384400 / 149597870.7, fmt)).toBe('384 mil km');
  });

  it('órbita de planeta segue em UA (nenhuma é sub-UA)', () => {
    expect(notaDeDistancia(1, fmt)).toBe('1 UA');
    expect(notaDeDistancia(0.39, fmt)).toBe('0,39 UA');
    expect(notaDeDistancia(35.4, fmt)).toBe('35,4 UA');
  });

  it('lua rasante fala km cheios; lua larga fala mil km', () => {
    // Fobos: ~9.378 km do centro de Marte
    expect(notaDeDistancia(9378 / 149597870.7, fmt)).toBe('9378 km');
    // Japeto: ~3,56 milhões de km
    expect(notaDeDistancia(3560000 / 149597870.7, fmt)).toBe('3560 mil km');
  });

  it('sem medida não há nota: NaN e não-positivo devolvem null', () => {
    expect(notaDeDistancia(Number.NaN, fmt)).toBeNull();
    expect(notaDeDistancia(0, fmt)).toBeNull();
    expect(notaDeDistancia(-1, fmt)).toBeNull();
  });
});

// ============================================================
// 2026-08-14: o degrau de CIMA da mesma escada. Uma grafia só
// ("anos-luz", por extenso — "AL" é jargão), uma vírgula só.
// ============================================================
describe('notaDeDistancia — o degrau dos anos-luz', () => {
  const emAl = (al: number) => notaDeDistancia(al * UA_POR_AL, fmt);

  it('a estrela fala ANOS-LUZ por extenso, nunca "AL"', () => {
    // Sirius: 2,637 pc — o par que aparecia com duas grafias na tela
    expect(notaDeDistancia(2.637 * UA_POR_PC, fmt)).toBe('8,6 anos-luz');
  });

  it('singular abaixo de 2, plural a partir dele', () => {
    expect(emAl(1.3)).toBe('1,3 ano-luz');
    expect(emAl(2.4)).toBe('2,4 anos-luz');
  });

  it('acima de 100 al a décima é ruído; acima de 10 mil, conta em milhares', () => {
    expect(emAl(420.6)).toBe('421 anos-luz');
    expect(emAl(26_000)).toBe('26 mil anos-luz');
  });

  it('abaixo de 0,1 al a régua volta para UA — a escada é contínua', () => {
    // é o degrau que o rótulo do canvas usa quando a câmera está no
    // sistema: 6.324 UA ainda é UA, 6.325 já é ano-luz
    expect(notaDeDistancia(6324, fmt)).toBe('6324 UA');
    expect(notaDeDistancia(6325, fmt)).toBe('0,1 ano-luz');
  });
});
