// Serve: dono — a escada de unidades fala km/UA perto de casa e anos-luz nas estrelas, na grafia e vírgula que ele pediu
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
import { afterEach, describe, expect, it } from 'vitest';
import {
  UA_POR_AL,
  UA_POR_PC,
  comCasas,
  formatarMassaKg,
  notaDeDistancia,
} from './unidades';
import { definirIdioma } from './idioma';

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

// ============================================================
// A VÍRGULA DECIMAL. As três grafias abaixo nasceram na obra da ficha do
// objeto, cada uma no arquivo onde o número era usado — e vieram para cá
// pela mesma razão que a escada: grafia mora onde a grafia mora. Quem as
// consome é `atlas/ficha.ts`; o que a ficha prova, no gate dela, é que
// USA estas e não outras.
// ============================================================
describe('formatarMassaKg', () => {
  it('escreve a potência de dez como se escreve, não como o JS escreve', () => {
    // O `1.345e+23` do JavaScript é endereço de programador. O visitante
    // desta casa é leigo, e viu "× 10²³" na escola.
    expect(formatarMassaKg(1.345e23)).toBe('1,34 × 10²³ kg');
    expect(formatarMassaKg(5.9722e24)).toBe('5,97 × 10²⁴ kg');
    expect(formatarMassaKg(1.06e16)).toBe('1,06 × 10¹⁶ kg');
  });

  it('recusa massa sem medida', () => {
    expect(formatarMassaKg(0)).toBeNull();
    expect(formatarMassaKg(Number.NaN)).toBeNull();
  });
});

describe('comCasas', () => {
  it('não achata a excentricidade da Terra, que é 0,017', () => {
    // Duas casas escreveriam "0,02" e uma casa "0,0" — o número que a
    // seção da órbita existe para mostrar sumiria no arredondamento.
    expect(comCasas(0.0167, 3)).toBe('0,017');
    expect(comCasas(0.5, 2)).toBe('0,50');
  });
});

// ============================================================
// O PLURAL MUDA DE REGRA COM A LÍNGUA (item 130, lista do §19).
//
// Em pt-BR o plural começa em 2 — "1,5 ano-luz" é singular —, a mesma
// regra do rótulo da taxa da máquina do tempo. Em inglês só o 1 EXATO é
// singular: "1.5 light-years". Traduzir a regra da casa daria
// "1.5 light-year", que é o erro que este bloco existe para pegar.
//
// A troca é AO VIVO: nenhuma das duas chamadas recarrega nada, e a
// língua volta ao pt-BR no fim para o resto da suíte não herdar inglês.
// ============================================================
describe('notaDeDistancia — o plural muda de regra com a língua', () => {
  /** o formatador cru: quem põe vírgula ou ponto é a língua, não ele */
  const cru = (v: number) => String(Math.round(v * 10) / 10);
  const emAnosLuz = (al: number) => notaDeDistancia(al * UA_POR_AL, cru);

  afterEach(() => definirIdioma('pt-BR'));

  it('pt-BR: 1,5 é SINGULAR e 2,8 é plural', () => {
    expect(emAnosLuz(1.5)).toBe('1.5 ano-luz');
    expect(emAnosLuz(2.8)).toBe('2.8 anos-luz');
    expect(emAnosLuz(1)).toBe('1 ano-luz');
  });

  it('inglês: só o 1 EXATO é singular — 1.5 já é plural', () => {
    definirIdioma('en');
    expect(emAnosLuz(1.5)).toBe('1.5 light-years');
    expect(emAnosLuz(2.8)).toBe('2.8 light-years');
    expect(emAnosLuz(1)).toBe('1 light-year');
  });

  it('a escada inteira troca de língua, degrau por degrau', () => {
    // em UA, um por degrau: Lua, órbita de Fobos, casa, Sirius, Alnilam,
    // o centro da galáxia
    const degraus = [0.00257, 0.0000626, 1, 8.6 * UA_POR_AL, 1913 * UA_POR_AL, 26000 * UA_POR_AL];
    const pt = degraus.map((ua) => notaDeDistancia(ua, cru));
    definirIdioma('en');
    const en = degraus.map((ua) => notaDeDistancia(ua, cru));
    // nenhum degrau ficou para trás em português
    expect(pt.some((v) => v === null)).toBe(false);
    // "9365 km" é igual nas duas línguas de propósito (km é km e o
    // número é inteiro); todo degrau que carrega PALAVRA tem de mudar
    for (const i of [0, 2, 3, 4, 5]) expect(en[i]).not.toBe(pt[i]);
    expect(en[0]).toMatch(/thousand km$/);
    expect(en[1]).toMatch(/^\d+ km$/);
    expect(en[2]).toMatch(/ AU$/);
    expect(en[3]).toMatch(/ light-years$/);
    expect(en[5]).toMatch(/thousand light-years$/);
  });

  it('o separador decimal segue a língua na ficha', () => {
    expect(comCasas(0.0167, 3)).toBe('0,017');
    definirIdioma('en');
    expect(comCasas(0.0167, 3)).toBe('0.017');
  });
});
