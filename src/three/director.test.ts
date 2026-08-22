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
// quem tem o canvas e o laço (o listener de contexto perdido mora lá) e
// quem monta o véu de falha
const ENGINE = readFileSync(new URL('./core/engine.ts', import.meta.url), 'utf8');
const APP = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

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

// ============================================================
// A FALHA DEPOIS DO BOOT CHEGA À TELA.
//
// Medido em 21/08, nos dois protocolos: `loseContext()` deixava o canvas
// congelado com o HUD inteiro no ar, ZERO erro de console e nenhuma tela;
// uma exceção no tick saía do rAF como "Uncaught", uma por quadro, e a
// tela também não dizia nada. O véu de erro existia e nascia em três
// lugares — a sonda de GL, o catch do construtor e o `.catch` do `init()`
// —, todos no BOOT: depois dele a camada já tinha sido desmontada pelo
// merge, e não havia onde a falha aparecer.
// ============================================================
describe('a falha depois do boot chega à tela', () => {
  it('o tick roda dentro de um try — exceção em quadro vira véu, não cascata', () => {
    const registro = FONTE.slice(
      FONTE.indexOf('this.engine.onTick('),
      FONTE.indexOf('this.engine.onContextoPerdido(')
    );
    expect(registro).toContain('try {');
    expect(registro).toContain('this.tick(t, dt)');
    expect(registro).toContain('this.desistir(');
  });

  it('desistir PARA o laço e avisa o véu — uma vez só', () => {
    const corpo = FONTE.slice(
      FONTE.indexOf('  private desistir(mensagem: string) {'),
      FONTE.indexOf('  dispose() {')
    );
    expect(corpo).toContain('if (this.desistiu || this.disposed) return;');
    expect(corpo).toContain('this.engine.parar();');
    expect(corpo).toContain('this.events.onErro(mensagem);');
    // o `.catch` do boot descarta o mundo; aqui NÃO — o véu desenha por
    // cima do último quadro e o "Tentar novamente" recarrega a página
    expect(corpo).not.toContain('this.dispose()');
  });

  it('o contexto perdido é ouvido no canvas, com preventDefault, e o laço para', () => {
    expect(ENGINE).toContain(
      "canvas.addEventListener('webglcontextlost', this.aoPerderContexto)"
    );
    const corpo = ENGINE.slice(
      ENGINE.indexOf('private aoPerderContexto = '),
      ENGINE.indexOf('onContextoPerdido(')
    );
    expect(corpo).toContain('e.preventDefault();');
    expect(corpo).toContain('this.parar();');
    // e o listener morre com o Engine: um canvas reaproveitado não pode
    // ficar com o ouvido de uma sessão morta
    expect(ENGINE.slice(ENGINE.indexOf('  dispose() {'))).toContain(
      "removeEventListener(\n      'webglcontextlost',\n      this.aoPerderContexto\n    )"
    );
  });

  it('o véu VOLTA a montar quando o erro chega depois do merge', () => {
    // sem o segundo termo a camada some ~MERGE_MS depois do `done` e a
    // falha em voo não tem onde aparecer
    expect(APP).toContain("{(loadingMontada || loaderState === 'error') && !bareMode && (");
    // e a copy muda: "não pôde começar" é mentira quando ela começou
    expect(APP).toContain("emVoo={phase !== 'loading'}");
  });
});

describe('a fiação de um posto do palco no Director (a da Lua)', () => {
  // MUDOU DE CASA em 22/08: estas quatro cravações moravam em
  // `world/corpos/lua.test.ts`, que lia o texto-fonte de `director.ts`,
  // `director/palco.ts` e `director/rotulos.ts` para cobrá-las. Refatorar
  // o Director quebrava o teste da LUA, que não tinha nada com isso. O
  // fato é o mesmo; o dono dele é este arquivo. Os TRAÇOS da Lua (sem
  // ponto, sem retrato, com rótulo) seguem por TEXTO — a razão está no
  // `it` abaixo.
  const PALCO = readFileSync(new URL('./director/palco.ts', import.meta.url), 'utf8');
  const ROTULOS = readFileSync(new URL('./director/rotulos.ts', import.meta.url), 'utf8');
  const CARREGAMENTO = readFileSync(
    new URL('./director/carregamento.ts', import.meta.url),
    'utf8'
  );

  it('a Lua é UM posto da lista única, com os quatro traços que a distinguem', () => {
    // Segue por TEXTO, e a razão está medida: `montarCorposDoPalco` é a
    // peça que declara os traços, mas importá-la arrasta `world/galaxy.ts`
    // → `geradorDaGalaxia.ts`, que lê `window.location.search` no topo do
    // módulo — e o runner da casa é `node`. Um teste de objeto aqui
    // custaria um `window` falso global no arquivo; o fato é de texto até
    // a peça ser alcançável sem o mundo junto.
    expect(CARREGAMENTO).toContain(
      "new LuaResolvida({ tier, maxTextureSize, base }), 'moon'"
    );
    // sem ponto fotométrico na camada (não há cessão a escrever), sem
    // retrato congelado (sem efeméride ela não existe — e o fallback frio
    // não pode segurar a captura por isso) e COM rótulo próprio; o pino
    // das 16:00 é o que a coda mira
    const tracos = CARREGAMENTO.slice(
      CARREGAMENTO.indexOf("'moon'"),
      CARREGAMENTO.indexOf('const rochosos')
    );
    expect(tracos).toContain('pinoNoFilme: LUA_PC');
    expect(tracos).toContain('temPonto: false');
    expect(tracos).toContain('temRetrato: false');
    expect(tracos).toContain('rotuloDeLua: true');
  });

  it('o palco registra e remove a superfície pelo posto — o corpo não conhece o palco', () => {
    expect(PALCO).toContain('palco.registrar(posto.id, e.raioPc, e.centroPc)');
    expect(PALCO).toContain('palco.remover(posto.id)');
  });

  it('a captura espera a textura de QUALQUER posto, não uma lista escrita à mão', () => {
    expect(FONTE).toContain('this.noPalco.some((p) => p.carregando)');
  });

  it('o buffer das luas é escrito pelo palco e lido pelos rótulos — os dois lados da costura', () => {
    // NaN o `projectCorpos` ignora; a barreira mora em `labels.ts`, não
    // no gate do [0]. O buffer e a projeção moram no módulo dos rótulos
    // (corte 7 da onda da arquitetura), e o fio se cobra dos dois lados.
    expect(PALCO).toContain('rotulos.escreverPosicaoDeLua(posto.id, e.centroPc)');
    expect(ROTULOS).toContain('projectCorpos(cam, LUAS_DO_SISTEMA, this.luaPosParaRotulo)');
  });

  it('teardown: os corpos devolvem tudo ANTES de o palco esvaziar', () => {
    const stepCorpos = FONTE.indexOf('step(posto.id, () => posto.corpo.dispose())');
    const stepPalco = FONTE.indexOf("step('palco'");
    expect(stepCorpos).toBeGreaterThan(0);
    expect(stepCorpos).toBeLessThan(stepPalco);
  });
});
