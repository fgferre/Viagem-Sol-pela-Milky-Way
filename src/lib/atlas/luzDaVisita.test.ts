// ============================================================
// A RECEITA DO GLOBO — os juízes da segunda lei de luz (itens 91 e 93).
//
// O QUE ESTE ARQUIVO COBRA, e por quê. Ele não pina texto de shader:
// pina o NÚMERO que a malha consome e EXECUTA a expressão que o shader
// interpola. As duas fórmulas da receita (`EXPR_TERMINADOR` e
// `EXPR_LUZ_DO_GLOBO`) existem UMA vez cada, em GLSL e em JS ao mesmo
// tempo — quem as mudar muda o que este arquivo executa, e o oráculo do
// Eyes reprova na hora.
//
//  1. AS TRÊS PEÇAS DA RECEITA: Sol = 1 em `assistida`, lanterna 0,15,
//     terminador logístico s = 3. Reverter qualquer uma reprova aqui.
//  2. A DECISÃO 2 DO DONO, intacta: em `real` o ganho é E(d) BIT A BIT,
//     a lanterna é 0 exato e o `s` é 0 — isto é, Lambert cru.
//  3. O QUE A OBRA MOVEU, DECLARADO: a Terra e a Lua deixaram de ser
//     bit-idênticas ao pré-91, e o delta está medido aqui, não escondido.
//  4. O SELO: `stopsDaVisita` é 2·log2(d) em `assistida` e 0 em `real`.
//  5. O HANDOFF PONTO↔GLOBO continua sem degrau — a exposição da visita
//     não olha a câmera, e isso não mudou no 93.
// ============================================================
import { describe, expect, it } from 'vitest';
import { ROCHOSOS } from '../../three/world/corpos/rochoso';
import { GIGANTES } from '../../three/world/corpos/gigante';
import { LIMIAR_DO_GATE_PX, cessaoAlvo } from '../../three/world/corpos/terra';
import { diametroAparentePx } from '../../three/world/corpos/corpos';
import { ganhoFundido, irradianciaRelativa } from './luz';
import type { PoliticaDeLuz } from './luz';
import {
  EXPR_LUZ_DO_GLOBO,
  EXPR_TERMINADOR,
  GLSL_LUZ_DA_VISITA,
  LANTERNA_DE_LEITURA,
  S_DO_TERMINADOR,
  escreverLuzDaVisita,
  ganhoDoGlobo,
  lanternaDaVisita,
  sDoTerminador,
  stopsDaVisita,
  uniformsDaLuzDaVisita,
} from './luzDaVisita';

/** OS 38 RESOLVIDOS, derivados das listas vivas — nunca redigitados. */
const RESOLVIDOS: readonly string[] = [
  'earth',
  'moon',
  ...ROCHOSOS.map((r) => r.id),
  ...GIGANTES.map((g) => g.id),
];

/** Distâncias heliocêntricas VIVAS de referência, uma por família — as
 *  mesmas rUA que as vistas oficiais do gate produzem. */
const D_SATURNO = 9.5185438390236552;
const D_MERCURIO = 0.46254827132617393;
const D_TERRA = 0.98332668220797514;

/**
 * A EXPRESSÃO DO SHADER, EXECUTADA. Não é uma segunda cópia da fórmula:
 * é a MESMA string que `GLSL_LUZ_DA_VISITA` interpola, rodando em JS. Se
 * alguém trocar a curva no módulo, é esta função que muda — e a tabela
 * do Eyes lá embaixo é quem reprova.
 */
const curvaCrua = new Function('x', 's', 'exp', `return ${EXPR_TERMINADOR};`) as (
  x: number,
  s: number,
  exp: (v: number) => number
) => number;

const terminadorSuave = (x: number, s = S_DO_TERMINADOR): number =>
  s <= 0 ? Math.max(x, 0) : Math.min(1, Math.max(0, curvaCrua(x, s, Math.exp)));

const luzDoGlobo = new Function(
  'luzSol',
  'fill',
  'teto',
  'max',
  'min',
  `return ${EXPR_LUZ_DO_GLOBO};`
) as (
  luzSol: number,
  fill: number,
  teto: number,
  max: (a: number, b: number) => number,
  min: (a: number, b: number) => number
) => number;

const somaComTeto = (luzSol: number, fill: number) =>
  luzDoGlobo(luzSol, fill, 1, Math.max, Math.min);

describe('1. peça (a) — o Sol do globo vale 1 em `assistida`', () => {
  it.each(RESOLVIDOS)('%s: 1 LITERAL, em qualquer distância', (id) => {
    for (const d of [0.31, 1, 5.2, D_SATURNO, 30, 95, 970]) {
      expect(ganhoDoGlobo(d, 'assistida'), `${id} a ${d} UA`).toBe(1);
    }
  });

  /**
   * O QUE A REVERSÃO PRODUZIRIA, por extenso. Antes do 93 o ganho era
   * `ganhoFundido(d) × compensação(corpo)`, e o resíduo `(dRef/d)^0,7`
   * deixava Saturno em 0,9875 e Mercúrio em 0,883 — a conta do PONTINHO
   * ainda viva dentro do globo. Os dois números vêm do pino do item 91,
   * que era o estado anterior desta mesma linha.
   */
  it('o resíduo do 1/d² MORREU: nem Saturno nem Mercúrio ficam fora de 1', () => {
    expect(ganhoDoGlobo(D_SATURNO, 'assistida')).toBe(1);
    expect(ganhoDoGlobo(D_MERCURIO, 'assistida')).toBe(1);
    // e o que o item 91 punha ali, que agora seria a assinatura da reversão
    expect(ganhoDoGlobo(D_SATURNO, 'assistida')).not.toBeCloseTo(0.9875, 3);
    expect(ganhoDoGlobo(D_MERCURIO, 'assistida')).not.toBeCloseTo(0.883, 3);
  });

  it('Saturno sai do carvão: a lei crua daria 0,207 — o globo vê 1', () => {
    expect(ganhoFundido(D_SATURNO, 'assistida')).toBeCloseTo(0.2065, 4);
    expect(ganhoDoGlobo(D_SATURNO, 'assistida') / ganhoFundido(D_SATURNO, 'assistida'))
      .toBeCloseTo(4.842, 3);
  });

  it('distância não-finita devolve o neutro 1, como a lei sempre fez', () => {
    for (const politica of ['assistida', 'real'] as PoliticaDeLuz[]) {
      expect(ganhoDoGlobo(Number.NaN, politica)).toBe(1);
      expect(ganhoDoGlobo(Number.POSITIVE_INFINITY, politica)).toBe(1);
    }
    expect(stopsDaVisita(Number.NaN, 'assistida')).toBeNull();
  });
});

describe('2. peça (b) — a lanterna de leitura, 15 % na câmera', () => {
  it('acende em `assistida` e é ZERO EXATO em `real`', () => {
    expect(lanternaDaVisita('assistida')).toBe(LANTERNA_DE_LEITURA);
    expect(LANTERNA_DE_LEITURA).toBe(0.15);
    expect(lanternaDaVisita('real')).toBe(0);
  });

  /**
   * O PAPEL DELA É A NOITE, e é isto que o número prova: no subsolar o
   * Sol já está no teto e a lanterna não tem o que acrescentar; na noite
   * voltada para a câmera ela é a ÚNICA luz.
   */
  it('não clareia o subsolar e É a luz da noite', () => {
    const fill = lanternaDaVisita('assistida');
    expect(somaComTeto(1, fill)).toBe(1); // subsolar: já no teto
    expect(somaComTeto(0, fill)).toBe(0.15); // noite de frente: só ela
    expect(somaComTeto(0.5, fill)).toBeCloseTo(0.65, 12);
  });

  /**
   * O TETO NÃO MORDE ACIMA DE 1, e isso não é detalhe: o modo `real` em
   * Mercúrio manda E = 6,7 pelo mesmo caminho, e o realce de limbo do
   * Lommel-Seeliger chega a 4/3. Um `saturate` cru cortaria os dois —
   * seria teto de brilho, que o NORTE proíbe em letra.
   */
  it('acima de 1 a função é a IDENTIDADE — não existe teto de brilho', () => {
    for (const luzSol of [4 / 3, 6.674, 400]) {
      expect(somaComTeto(luzSol, 0.15)).toBe(luzSol);
    }
  });

  it('com a lanterna em 0 a soma é a identidade BIT A BIT (o modo real)', () => {
    for (const luzSol of [0, 0.011037, 0.5, 1, 6.674]) {
      expect(Object.is(somaComTeto(luzSol, lanternaDaVisita('real')), luzSol)).toBe(true);
    }
  });
});

describe('3. peça (c) — o terminador logístico s = 3', () => {
  it('o `s` é 3 em `assistida` e 0 (= Lambert cru) em `real`', () => {
    expect(sDoTerminador('assistida')).toBe(S_DO_TERMINADOR);
    expect(S_DO_TERMINADOR).toBe(3);
    expect(sDoTerminador('real')).toBe(0);
  });

  /**
   * O ORÁCULO VEM DE FORA: é a tabela do §1.2 do contrato, lida no fonte
   * do NASA Eyes em 24/08. A função que a responde é a expressão que o
   * shader interpola, executada — trocar a curva no módulo muda o que
   * roda aqui, e a tabela reprova.
   */
  it.each([
    [1.0, 1.0],
    [0.5, 0.72],
    [0.2, 0.36],
    [0.0, 0.05],
    [-0.5, 0.0],
    [-1.0, 0.0],
  ])('N·L cru %s devolve %s, como no Eyes', (ndotl, esperado) => {
    expect(terminadorSuave(ndotl)).toBeCloseTo(esperado, 2);
  });

  it('o flanco a N·L = 0,5 sobe 44 % sobre o Lambert puro — o ganho da peça', () => {
    const razao = terminadorSuave(0.5) / 0.5;
    expect(razao).toBeCloseTo(1.433, 3);
    // a razão que o contrato pede (0,72/0,50) é esta, arredondada
    expect(razao).toBeGreaterThan(1.4);
  });

  it('o subsolar continua exatamente 1 — a curva não estoura o dia', () => {
    expect(terminadorSuave(1)).toBeCloseTo(1, 12);
    for (let x = 0; x <= 1.0001; x += 0.05) {
      expect(terminadorSuave(x)).toBeLessThanOrEqual(1);
    }
  });

  it('é estritamente crescente: a curva não inverte o terminador', () => {
    let anterior = -1;
    for (let x = -1; x <= 1.0001; x += 0.02) {
      const y = terminadorSuave(x);
      expect(y).toBeGreaterThanOrEqual(anterior);
      anterior = y;
    }
  });

  it('com s = 0 o shader devolve o Lambert cru, BIT A BIT (o modo real)', () => {
    for (const x of [-1, -0.3, 0, 0.2, 0.5, 1]) {
      expect(Object.is(terminadorSuave(x, sDoTerminador('real')), Math.max(x, 0))).toBe(true);
    }
  });

  it('o GLSL da casa interpola ESTAS expressões — não uma cópia delas', () => {
    expect(GLSL_LUZ_DA_VISITA).toContain(EXPR_TERMINADOR);
    expect(GLSL_LUZ_DA_VISITA).toContain(EXPR_LUZ_DO_GLOBO);
  });
});

describe('4. decisão 2 do dono — `real` conserva a penumbra FÍSICA', () => {
  it.each([0.31, D_MERCURIO, D_TERRA, 5.2, D_SATURNO, 30, 95])(
    'a %s UA o ganho em `real` é E(d) BIT A BIT',
    (d) => {
      expect(Object.is(ganhoDoGlobo(d, 'real'), irradianciaRelativa(d))).toBe(true);
      expect(Object.is(ganhoDoGlobo(d, 'real'), ganhoFundido(d, 'real'))).toBe(true);
    }
  );

  it('em `real` Saturno é MUITO mais escuro que a Terra — a posição 1:1', () => {
    const saturno = ganhoDoGlobo(D_SATURNO, 'real');
    const terra = ganhoDoGlobo(D_TERRA, 'real');
    expect(saturno).toBeCloseTo(0.011037, 6);
    expect(terra / saturno).toBeGreaterThan(90);
  });

  it('em `assistida` a mesma dupla fica JUNTA — e agora é 1 contra 1', () => {
    expect(ganhoDoGlobo(D_SATURNO, 'assistida')).toBe(ganhoDoGlobo(D_TERRA, 'assistida'));
  });

  /**
   * AS TRÊS PEÇAS ACENDEM E APAGAM JUNTAS, por um interruptor só. É o
   * que impede a receita de virar meia-receita — um modo com lanterna e
   * sem logística, por exemplo, não é alcançável desta casa.
   */
  it('o interruptor é UM: as três peças concordam com a política', () => {
    const neutro = { ganho: 1, lanterna: 0, s: 0 };
    expect({
      ganho: ganhoDoGlobo(D_TERRA, 'real') === irradianciaRelativa(D_TERRA) ? 1 : 0,
      lanterna: lanternaDaVisita('real'),
      s: sDoTerminador('real'),
    }).toEqual(neutro);
    expect(lanternaDaVisita('assistida')).toBeGreaterThan(0);
    expect(sDoTerminador('assistida')).toBeGreaterThan(0);
  });
});

describe('5. os uniformes que a malha recebe — um escritor só', () => {
  it('nascem NEUTROS: um material que ninguém ticou não inventa luz', () => {
    const u = uniformsDaLuzDaVisita();
    expect(u.uLanternaLeitura!.value).toBe(0);
    expect(u.uTerminadorS!.value).toBe(0);
  });

  it('o escritor acende os dois com a MESMA política, e apaga os dois', () => {
    const u = uniformsDaLuzDaVisita();
    escreverLuzDaVisita(u, 'assistida');
    expect(u.uLanternaLeitura!.value).toBe(LANTERNA_DE_LEITURA);
    expect(u.uTerminadorS!.value).toBe(S_DO_TERMINADOR);
    escreverLuzDaVisita(u, 'real');
    expect(u.uLanternaLeitura!.value).toBe(0);
    expect(u.uTerminadorS!.value).toBe(0);
  });
});

/**
 * O QUE A OBRA MOVEU, DITO COM NÚMERO. O item 91 pinava Terra e Lua
 * bit-idênticas ao pré-91 — a distância da visita delas era a `ANCORA_UA`
 * e a compensação valia 1 exato. O contrato do 93 autoriza a queda desse
 * pino em letra ("Bit-idêntico da Terra/Lua do item 91: **cai**"), e ela
 * cai por três motivos somados. Este bloco existe para que a queda seja
 * MEDIDA e não silenciosa.
 */
describe('6. o pino que caiu — a Terra deixou de ser bit-idêntica, e quanto', () => {
  it('o ganho de casa: era E(d)^σ na distância viva, agora é 1 exato', () => {
    const antes = ganhoFundido(D_TERRA, 'assistida');
    const agora = ganhoDoGlobo(D_TERRA, 'assistida');
    expect(agora).toBe(1);
    // o delta do GANHO sozinho é minúsculo — a Terra vive na âncora
    expect(antes).toBeCloseTo(1.011839253200, 9);
    expect(Math.abs(agora / antes - 1)).toBeLessThan(0.012);
    expect(Object.is(agora, antes)).toBe(false);
  });

  it('quem move a Terra de verdade são a logística e a lanterna', () => {
    // no flanco a 45° o terminador sozinho já vale +24 %
    const flanco = Math.cos(Math.PI / 4);
    expect(terminadorSuave(flanco) / flanco).toBeCloseTo(1.237, 3);
    // e a noite voltada para a câmera passa de PRETA a 15 %
    expect(somaComTeto(0, lanternaDaVisita('assistida'))).toBe(0.15);
    expect(somaComTeto(0, lanternaDaVisita('real'))).toBe(0);
  });
});

describe('7. o que o selo declara — os passos de luz', () => {
  it('em `real` não há nada a declarar: 0 EXATO', () => {
    for (const d of [D_MERCURIO, D_TERRA, D_SATURNO, 30, 95]) {
      expect(stopsDaVisita(d, 'real')).toBe(0);
    }
  });

  it('em `assistida` o gasto é exatamente 2·log2(d) — a conta ficou legível', () => {
    for (const d of [D_MERCURIO, D_TERRA, 5.2, D_SATURNO, 30, 95]) {
      expect(stopsDaVisita(d, 'assistida')!).toBeCloseTo(2 * Math.log2(d), 12);
      expect(stopsDaVisita(d, 'assistida')!).toBeCloseTo(
        Math.log2(ganhoDoGlobo(d, 'assistida') / irradianciaRelativa(d)),
        12
      );
    }
  });

  it('os números que o selo vai mostrar, um por um', () => {
    const stops = (d: number) => stopsDaVisita(d, 'assistida')!;
    expect(stops(D_SATURNO)).toBeCloseTo(6.5, 1);
    expect(stops(5.2118928954384449)).toBeCloseTo(4.8, 1);
    expect(stops(29.884744842988464)).toBeCloseTo(9.8, 1);
    expect(stops(95)).toBeCloseTo(13.1, 1);
    // a âncora não gasta nada — a Terra sai em ~0
    expect(Math.abs(stops(D_TERRA))).toBeLessThan(0.05);
    // Mercúrio é NEGATIVO: a visita gasta luz para BAIXO
    expect(stops(D_MERCURIO)).toBeCloseTo(-2.2, 1);
  });
});

/**
 * O HANDOFF PONTO↔GLOBO, e por que ele continua sem degrau no item 93.
 *
 * O medo é legítimo e está escrito na `cessaoAlvo`: a borda 2,5 da rampa
 * foi DERIVADA de "a luz combinada nunca dá passo para trás na
 * aproximação". O 91 multiplicou a radiância do globo de Saturno por
 * 4,85; o 93 a multiplica por mais 1,3 % e acrescenta a lanterna.
 *
 * O QUE ESTE BLOCO PROVA, e é o que fecha o argumento: a exposição da
 * visita não é função da câmera, e o globo nasce SOB o clarão. Então
 * nada na aproximação pode dar um pulo POR CAUSA do ganho — o que cresce
 * é a ÁREA, continuamente, a partir dos 4 px do gate.
 *
 * A LANTERNA NÃO ABRE BURACO NOVO AQUI: ela é constante em toda a
 * aproximação (não olha a distância) e está limitada pelo teto de 1, que
 * é o mesmo teto de sempre.
 *
 * A prova MEDIDA da escada de aproximação (a captura de 25/08, com os
 * degraus 800→3 raios sem recuo) continua no item 91 do
 * `docs/PENDENCIAS-ARQUIVO.md`.
 */
describe('8. o handoff ponto↔globo — o degrau que não existe', () => {
  it('a exposição da visita NÃO é função da câmera: o mesmo corpo, o mesmo ganho', () => {
    for (const d of [D_MERCURIO, D_TERRA, D_SATURNO, 30, 95]) {
      const ganho = ganhoDoGlobo(d, 'assistida');
      for (let i = 0; i < 4; i++) {
        expect(Object.is(ganhoDoGlobo(d, 'assistida'), ganho), `${d} UA`).toBe(true);
      }
    }
  });

  it('o globo NASCE sob o clarão: aos 4 px do gate a cessão ainda é 0', () => {
    for (const halo of [8, 12, 16]) {
      expect(cessaoAlvo(true, LIMIAR_DO_GATE_PX, halo)).toBe(0);
    }
  });

  it('o fluxo do globo na tela CRESCE em toda a aproximação — área × radiância fixa', () => {
    const raioPc = 2.9e-9; // ordem de grandeza de um gigante, em pc
    const ganho = ganhoDoGlobo(D_SATURNO, 'assistida');
    let anterior = 0;
    for (let raios = 5000; raios >= 2; raios *= 0.9) {
      const px = diametroAparentePx(raioPc, raioPc * raios, 1080, 58);
      if (px < LIMIAR_DO_GATE_PX) continue;
      const fluxo = px * px * ganho;
      expect(fluxo, `raios=${raios.toFixed(1)}`).toBeGreaterThan(anterior);
      anterior = fluxo;
    }
    expect(anterior).toBeGreaterThan(0);
  });
});
