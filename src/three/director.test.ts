// ============================================================
// O DESMONTE DO DIRECTOR, cobrado por VARREDURA e não por lista.
//
// O defeito que este arquivo nasceu para não deixar voltar: `heroes`
// tinha `dispose()` desde que nasceu e nunca esteve na lista do
// `teardown`. Medido em 21/08 — depois de `__director.dispose()`,
// `renderer.info.memory.geometries` ficava em 16, que são exatamente as
// 16 nomeadas de autor. Uma lista escrita à mão só cobre o que alguém
// lembrou de escrever nela; a varredura cobra o que o construtor e o
// init de fato CONSTROEM, então o próximo filho esquecido reprova
// sozinho, no dia em que for esquecido.
//
// O Director é DOM + WebGL de ponta a ponta e o runner da casa é `node`:
// aqui se lê a fonte, como em `App.test.ts` e na fiação de `terra.test.ts`.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FONTE = readFileSync(new URL('./director.ts', import.meta.url), 'utf8');

/** onde o desmonte começa — tudo acima dele é construção */
const INICIO_DO_TEARDOWN = FONTE.indexOf('  private teardown() {');
const TEARDOWN = FONTE.slice(INICIO_DO_TEARDOWN);

/**
 * Os filhos que o Director CONSTRÓI (`this.x = new …`), que são os que
 * seguram geometria, material, textura ou listener. Os campos
 * inicializados na própria declaração (`private rig = new JourneyRig()`)
 * ficam de fora de propósito: são estado puro, sem recurso de GPU.
 */
const CONSTRUIDOS = [
  ...new Set(
    [...FONTE.slice(0, INICIO_DO_TEARDOWN).matchAll(/this\.([A-Za-z]+) = new /g)].map(
      (m) => m[1]
    )
  ),
];

describe('o teardown não esquece nenhum filho', () => {
  it('a varredura acha o que procura — um padrão quebrado passaria calado', () => {
    expect(INICIO_DO_TEARDOWN).toBeGreaterThan(0);
    // os quatro que ninguém discute; se a regex quebrar, a lista esvazia
    // e o teste abaixo passaria sem cobrar nada
    expect(CONSTRUIDOS.length).toBeGreaterThan(10);
    for (const nome of ['engine', 'sun', 'stars', 'heroes']) {
      expect(CONSTRUIDOS, `${nome} sumiu da varredura`).toContain(nome);
    }
  });

  it.each(CONSTRUIDOS)('%s é desmontado', (nome) => {
    expect(TEARDOWN, `${nome} é construído e nunca desmontado`).toContain(
      `this.${nome}`
    );
  });

  it('o renderer morre por ÚLTIMO — material descartado depois dele não apaga programa', () => {
    const engine = TEARDOWN.indexOf("step('engine'");
    expect(engine).toBeGreaterThan(0);
    for (const nome of CONSTRUIDOS) {
      if (nome === 'engine') continue;
      expect(
        TEARDOWN.indexOf(`this.${nome}`),
        `${nome} é desmontado depois do renderer`
      ).toBeLessThan(engine);
    }
  });
});
