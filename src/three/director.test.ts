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
import {
  escreverLuzDaVisita,
  uniformsDaLuzDaVisita,
  LANTERNA_DE_LEITURA,
  S_DO_TERMINADOR,
} from '../lib/atlas/luzDaVisita';
import type { PoliticaDeLuz } from '../lib/atlas/luz';
import { lerPortaLuz } from './selo';

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

// ============================================================
// AS PORTAS DE LEITURA do harness (`window.__director`). Elas existem
// para quem observa o app de fora perguntar "CHEGOU?" em vez de dormir e
// torcer — e um juiz que se desliga sozinho quando a peça que ele mede
// some é pior que nenhum.
// ============================================================
describe('as portas de leitura do harness', () => {
  /** roda o corpo REAL do getter, com o `this` que se quiser */
  const porta = (nome: string, alvo: object) => {
    const m = FONTE.match(new RegExp(`\\n  get ${nome}\\(\\)[^{]*\\{\\n([^}]*)\\n  \\}`));
    expect(m, `o getter ${nome} sumiu do director.ts`).not.toBeNull();
    return new Function(`return (function () {${m![1]}}).call(this);`).call(alvo);
  };

  it('zoomEmbalando sem punho de gestos é `undefined` — "não sei" não é "acabou"', () => {
    // `?? false` aqui desligaria o `atlas-smoke`, que espera por
    // `=== false`: o juiz veria "o gesto acabou" no primeiro instante
    expect(porta('zoomEmbalando', { gestos: null })).toBeUndefined();
    expect(porta('zoomEmbalando', { gestos: { embalandoZoom: true } })).toBe(true);
    expect(porta('zoomEmbalando', { gestos: { embalandoZoom: false } })).toBe(false);
    expect(FONTE).toContain('get zoomEmbalando(): boolean | undefined {');
  });

  it('grampoDoPasso publica o passo do integrador — o piso do juiz do filme', () => {
    // o gate lê daqui em vez de redigitar 0,05 (`filme-smoke`,
    // `QUADROS_DE_PISO`); o valor é o do engine, não uma cópia
    expect(FONTE).toContain('return GRAMPO_DO_PASSO_S;');
    expect(ENGINE).toContain('export const GRAMPO_DO_PASSO_S = 0.05;');
  });
});

// ============================================================
// A FASE QUE VAI ÀS LINHAS DE ÓRBITA (item 77 · decisão 3, 25/08).
//
// O gate mora DENTRO de `Orbitas.update` (§7 de `world/orbitas.ts`), e a
// fase chega lá como parâmetro OBRIGATÓRIO — apagá-lo não compila. Mas
// há um furo que compila e que a suíte inteira atravessava calada, e ele
// foi encontrado por SABOTAGEM: o director passar uma fase DIGITADA
// (`'atlas'`) em vez da viva. As linhas voltavam ao filme, 2.319 testes
// seguiam verdes, e nenhum juiz de Node abre este arquivo por conta
// própria — este bloco é a resposta, na disciplina do resto do arquivo.
// ============================================================
describe('o gate de fase das linhas de órbita (item 77 · decisão 3)', () => {
  const CHAMADA = FONTE.match(/this\.orbitas\.update\(([\s\S]*?)\n {6}\);/);

  it('a varredura acha o que procura — um padrão quebrado passaria calado', () => {
    // o cinto do selo: sem a chamada casada, os dois casos abaixo
    // passariam por não terem o que ler
    expect(CHAMADA, 'o director não chama mais `orbitas.update`').not.toBeNull();
    expect(CHAMADA![1]).toContain('this.engine.camera');
  });

  it('a camada recebe a fase VIVA, nunca uma fase digitada', () => {
    expect(CHAMADA![1]).toContain('this.phase');
    // um literal aqui é o furo da sabotagem: compila, passa a suíte e
    // devolve as linhas ao filme sem que nada reclame
    expect(CHAMADA![1]).not.toMatch(/'(loading|intro|journey|end|free|atlas)'/);
  });

  it('a autorização fica LEGÍVEL no ponto de chamada, com dono e número', () => {
    // a regra é exceção à lei do mundo único (item 61): quem ler esta
    // linha tem de descobrir ali mesmo de quem é a permissão. Não é
    // enfeite — é o que impede a próxima conversa de tratá-la como
    // precedente.
    const antes = FONTE.slice(0, FONTE.indexOf('this.orbitas.update(')).slice(-900);
    expect(antes).toContain('item 77');
    expect(antes).toContain('LINHAS_DE_ORBITA_POR_FASE');
    expect(antes).toContain('tirar do filme');
  });
});

// ============================================================
// A POLÍTICA DE LUZ CHEGA AO QUADRO DO PALCO — e a porta `?calib=` MORREU.
//
// ESTE BLOCO NASCEU COM OUTRO DONO, e a história explica o que ele cobra
// hoje. Em 26/08 uma sabotagem mostrou que a fiação da porta `?calib=` do
// item 93 não tinha dente nenhum: trocar o default do Director — `?? 'padrao'`
// por `?? 'c1'` — fazia o app desenhar a candidata C1 para TODO visitante,
// e os 2.360 testes e o `tsc` passavam sem uma queixa.
//
// A porta foi julgada e MORREU: ele escolheu a C1, ela virou o padrão, e as
// duas chaves de chaveamento saíram do código. O que sobrou no lugar é um
// invariante mais forte, e é ele que este bloco executa agora:
//
//   assistido SEMPRE traduzido, real SEMPRE cru
//
// A chave que carrega isso é a `politica`, e a fiação dela é a MESMA que a
// da porta morta: a URL vira campo, o campo entra no quadro do palco, o
// quadro chega ao escritor dos uniformes. Este bloco executa as LINHAS
// REAIS do `director.ts` com um `this` de mentira, no precedente do
// `porta()` logo acima, e leva o que sai delas ao escritor REAL
// (`escreverLuzDaVisita`).
//
// E COBRA A MORTE DA PORTA, que é uma afirmação de pixel: `?calib=c1` na
// URL não pode mover um bit — se alguém ressuscitar a chave, o app volta a
// ter duas doses de brilho assistido e nenhuma foto diz qual está vendo.
//
// O SEGUNDO TRECHO — o quadro chegar ao uniforme de cada corpo — é
// cobrado nos quatro `world/corpos/*.test.ts`, que é onde a chave mora.
// ============================================================
describe('a política de luz chega ao quadro do palco, e `?calib=` morreu', () => {
  const LEITURA = FONTE.match(/\n( *this\.politicaDeLuz = .*;)\n/);
  const NO_QUADRO = FONTE.match(/\n( *q\.politica = .*;)\n/);

  /** roda as DUAS linhas reais do Director com a busca pedida e devolve o
   *  que o quadro do palco leva aos corpos */
  const politicaNoQuadro = (busca: string): PoliticaDeLuz | undefined => {
    const alvo = { debug: new URLSearchParams(busca), politicaDeLuz: 'assistida' };
    const q: { politica?: PoliticaDeLuz } = {};
    new Function(
      'lerPortaLuz',
      'q',
      `(function () {\n${LEITURA![1]}\n${NO_QUADRO![1]}\n}).call(this);`
    ).call(alvo, lerPortaLuz, q);
    return q.politica;
  };

  /** o uniforme que o corpo receberia com o que o quadro leva */
  const uniformeDoCorpo = (busca: string) => {
    const u = uniformsDaLuzDaVisita();
    escreverLuzDaVisita(u, politicaNoQuadro(busca)!, 0);
    return u;
  };

  it('a varredura acha o que procura — um padrão quebrado passaria calado', () => {
    // o cinto: sem as duas linhas casadas, os casos abaixo passariam por
    // não terem o que executar
    expect(LEITURA, 'o Director não lê mais `?luz=`').not.toBeNull();
    expect(NO_QUADRO, 'o quadro do palco não leva mais a política').not.toBeNull();
    expect(LEITURA![1]).toContain('lerPortaLuz');
  });

  it('SEM porta o quadro leva `assistida` — e o corpo recebe a C1', () => {
    for (const busca of ['', 'nobloom=1', 'luz=', 'luz=c4', 'luz=REAL']) {
      expect(politicaNoQuadro(busca), busca || '(vazia)').toBe('assistida');
      const u = uniformeDoCorpo(busca);
      expect(u.uLanternaLeitura!.value, busca || '(vazia)').toBe(LANTERNA_DE_LEITURA);
      // `uTerminadorS > 0` é o interruptor que ACENDE a tradução no chunk
      expect(u.uTerminadorS!.value, busca || '(vazia)').toBe(S_DO_TERMINADOR);
    }
  });

  it('COM `?luz=real` o quadro leva real — e os dois uniformes ZERAM', () => {
    expect(politicaNoQuadro('luz=real')).toBe('real');
    const u = uniformeDoCorpo('luz=real');
    expect(Object.is(u.uLanternaLeitura!.value, 0)).toBe(true);
    expect(Object.is(u.uTerminadorS!.value, 0)).toBe(true);
    // e chega inteira de qualquer posição na busca
    expect(politicaNoQuadro('nobloom=1&luz=real')).toBe('real');
  });

  it('A PORTA MORTA: `?calib=` não move um bit, nem sozinha nem colada', () => {
    expect(FONTE).not.toContain('calibracaoDaLuz');
    expect(FONTE).not.toContain('lerPortaCalibracao');
    const semPorta = uniformeDoCorpo('');
    for (const busca of ['calib=c1', 'calib=c2', 'calib=c3', 'calib=c1&nobloom=1']) {
      expect(politicaNoQuadro(busca), busca).toBe('assistida');
      expect(uniformeDoCorpo(busca), busca).toEqual(semPorta);
    }
  });
});
