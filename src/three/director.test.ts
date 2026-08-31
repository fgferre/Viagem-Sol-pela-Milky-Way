// Serve: chão — cada buraco achado por auditoria ou sabotagem no Director (desmonte esquecido, falha muda, porta ?calib= morta, fase digitada) continua fechado
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
  exposicaoDoQuadro,
  uniformsDaLuzDaVisita,
  LANTERNA_DE_LEITURA,
  PASSOS_DA_EXPOSICAO_REAL,
  S_DO_TERMINADOR,
} from '../lib/atlas/luzDaVisita';
import type { PoliticaDeLuz } from '../lib/atlas/luz';
import { lerPortaLuz } from './selo';
import { JD_DO_FILME_TDB, jdDoFilme } from './cinematic/journey';
import { EPOCA_JD_TDB } from './world/planetas/retrato2026';

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
    [...FONTE.slice(0, INICIO_DO_TEARDOWN).matchAll(/this\.([A-Za-z0-9]+) = new /g)].map(
      (m) => m[1]
    )
  ),
];

describe('o teardown não esquece nenhum filho', () => {
  it('a varredura acha o que procura — um padrão quebrado passaria calado', () => {
    expect(INICIO_DO_TEARDOWN).toBeGreaterThan(0);
    // os cinco que ninguém discute; se a regex quebrar, a lista esvazia
    // e o teste abaixo passaria sem cobrar nada. `rotulos3d` é o cinto
    // do DÍGITO no nome: a varredura antiga (`[A-Za-z]+`) não o via, e
    // foi exatamente assim que a camada ficou fora do teardown até 30/08
    expect(CONSTRUIDOS.length).toBeGreaterThan(10);
    for (const nome of ['engine', 'sun', 'stars', 'heroes', 'rotulos3d']) {
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
    // COM ponto fotométrico desde 30/08 (item 108 — a cessão dela é
    // escrita como a das irmãs), SEM retrato congelado (sem efeméride
    // ela não existe — e o fallback frio não pode segurar a captura por
    // isso) e COM rótulo próprio; o pino das 16:00 é o que a coda mira
    const tracos = CARREGAMENTO.slice(
      CARREGAMENTO.indexOf("'moon'"),
      CARREGAMENTO.indexOf('const rochosos')
    );
    expect(tracos).toContain('pinoNoFilme: LUA_PC');
    expect(tracos).toContain('temPonto: true');
    expect(tracos).toContain('temRetrato: false');
    expect(tracos).toContain('rotuloDeLua: true');
  });

  it('corpo com ponto e SEM retrato publica o PRÓPRIO lugar na camada', () => {
    // o par (temPonto, temRetrato) é o que decide quem posiciona o
    // ponto — e a Lua é o único corpo em que os dois discordam. O
    // comportamento tem juiz próprio (`world/corpos/lua.test.ts`, §6,
    // que roda o `passoDoPalco` de verdade); aqui fica a cravação de
    // que a decisão mora no palco e é feita por esse par.
    expect(PALCO).toContain(
      'if (!posto.temRetrato) planetas?.escreverPontoDeCorpo(posto.id, e.centroPc);'
    );
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

// ============================================================
// A CHAPA DO MODO REAL — a Q14 do dono, 26/08 (item 91)
//
// A QUEM SERVE: à decisão dele, verbatim — *"R1 — +3 passos fixos,
// sempre os mesmos, declarados no selo"*. Ele julgou a coluna R1 da folha
// `capturas/item93-calib-real.png`, que foi capturada com
// `?luz=real&exp=8.16`; o app embarcado tem de chegar à MESMA chapa sem a
// porta, e sem que a penumbra física do globo se mexa.
//
// POR QUE ELE EXECUTA A LINHA EM VEZ DE PINAR O NÚMERO. Um teste que
// afirmasse `exposicaoDoQuadro(1.02, 'real') === 8.16` seria verdade
// mesmo que o Director tivesse parado de CHAMAR a função — e foi
// exatamente esse gênero de furo que o item 103 pagou caro (o pino puro
// passava verde sobre uma porta emperrada). Aqui se arranca o bloco
// GUARDADO do `director.ts`, com o `if (!this.expOverride)` junto, e se
// roda com um `this` de mentira e um `engine` que só anota o que recebeu
// — o precedente é o bloco da política de luz acima.
//
// O QUE MORDE, e foi conferido desmontando cada peça à mão:
//  · tirar o `exposicaoDoQuadro(...)` de volta para `1.02 + 0.03 * fade`
//    → a razão real/assistida cai a 1 e três casos reprovam;
//  · trocar a composição por um `8.16` digitado → a vista externa
//    reprova (a rampa deixaria de compor);
//  · apagar a guarda `if (!this.expOverride)` → o caso do `?exp=`
//    reprova, porque o gesto do visitante deixaria de vencer.
// ============================================================
describe('a Q14 do dono — em `?luz=real` a LINHA do Director abre +3 passos', () => {
  /** o bloco INTEIRO da auto-exposição, guarda incluída */
  const AUTO = FONTE.match(/\n( *if \(!this\.expOverride\) \{\n[^}]*\n *\})\n/);

  /**
   * Roda o bloco real do `director.ts` com um `this` de mentira e devolve
   * o que o `engine` recebeu — `undefined` quando a guarda barrou a
   * escrita, que é o caso do `?exp=`.
   */
  const exposicaoDoTick = (
    politica: PoliticaDeLuz,
    galaxyFade: number,
    expOverride = false
  ): number | undefined => {
    let visto: number | undefined;
    const alvo = {
      expOverride,
      politicaDeLuz: politica,
      engine: {
        setExposure: (v: number) => {
          visto = v;
        },
      },
    };
    new Function(
      'exposicaoDoQuadro',
      'galaxyFade',
      `(function () {\n${AUTO![1]}\n}).call(this);`
    ).call(alvo, exposicaoDoQuadro, galaxyFade);
    return visto;
  };

  it('a varredura acha o bloco — um padrão quebrado passaria calado', () => {
    expect(AUTO, 'o Director não tem mais a auto-exposição guardada').not.toBeNull();
    // o cinto do cinto: o bloco tem de CHAMAR a lei, não redigitá-la
    expect(AUTO![1]).toContain('exposicaoDoQuadro');
    expect(AUTO![1]).toContain('this.politicaDeLuz');
    expect(AUTO![1]).not.toContain('8.16');
  });

  it('em `assistida` a linha entrega a rampa de sempre — 1,02 dentro do disco', () => {
    expect(exposicaoDoTick('assistida', 0)).toBe(1.02);
    // e a vista externa continua sendo o outro assunto fotográfico
    expect(exposicaoDoTick('assistida', 1)).toBeCloseTo(1.05, 12);
  });

  it('em `real` a MESMA linha entrega ×8 — os +3 passos, medidos na razão', () => {
    for (const fade of [0, 0.5, 1]) {
      const real = exposicaoDoTick('real', fade)!;
      const assistida = exposicaoDoTick('assistida', fade)!;
      expect(real / assistida, `fade ${fade}`).toBe(2 ** PASSOS_DA_EXPOSICAO_REAL);
    }
    // e o número que sai na visita é o da foto que ele escolheu
    expect(exposicaoDoTick('real', 0)).toBeCloseTo(8.16, 12);
  });

  it('`?exp=` VENCE os dois: com o latch ligado a linha não escreve nada', () => {
    // é a precedência declarada no registro do selo — o gesto do
    // visitante vence a gradação do modo. Substitui, não multiplica: a
    // URL histórica `?luz=real&exp=8.16` continua dando 8,16 e não 65.
    expect(exposicaoDoTick('real', 0, true)).toBeUndefined();
    expect(exposicaoDoTick('assistida', 0, true)).toBeUndefined();
  });
});

// ============================================================
// A BETA 3D SÓ CALA O 2D COM O PINTOR VIVO (item 109, 30/08).
//
// `setRotulos3d(true)` liga a flag NA HORA, mas o pintor chega pela rede
// (import tardio de `world/rotulos3d`, chunk separado). O quadro levava
// `texto3d: this.rotulos3dLigado` cru: entre o clique e o chunk o Atlas
// ficava sem nome de corpo nenhum — e num 404 de deploy novo a promise
// rejeitava sem tratamento e os nomes sumiam PARA SEMPRE. Aqui se
// executa a LINHA REAL do quadro com um `this` de mentira, no precedente
// do bloco da política de luz acima.
// ============================================================
describe('a beta dos rótulos 3D (item 109): o 2D pinta até o 3D existir', () => {
  const GATE = FONTE.match(/\n *texto3d: (.*),\n/);

  /** a expressão real do quadro, avaliada com a flag e o pintor dados */
  const texto3dNoQuadro = (ligado: boolean, pintor: unknown): boolean =>
    new Function(`return (${GATE![1]});`).call({
      rotulos3dLigado: ligado,
      rotulos3d: pintor,
    });

  it('a varredura acha a linha — um padrão quebrado passaria calado', () => {
    expect(GATE, 'o quadro não entrega mais `texto3d`').not.toBeNull();
  });

  it('flag ligada SEM pintor: `texto3d` é falso e o 2D continua pintando', () => {
    // é a janela do import em voo E o estado permanente após uma falha
    // de carga — nos dois, apagar o texto 2D deixaria o corpo sem nome
    expect(texto3dNoQuadro(true, undefined)).toBe(false);
  });

  it('flag ligada COM pintor: o 3D assume o texto', () => {
    expect(texto3dNoQuadro(true, {})).toBe(true);
  });

  it('flag desligada: nunca — nem com o pintor vivo de uma ligada anterior', () => {
    expect(texto3dNoQuadro(false, {})).toBe(false);
  });

  it('o import tem `.catch`: a falha avisa no console e deixa o 2D em paz', () => {
    const corpo = FONTE.slice(
      FONTE.indexOf('  setRotulos3d('),
      FONTE.indexOf('  private get pauseLookActive')
    );
    expect(corpo).toContain(".catch");
    expect(corpo).toContain('console.warn');
    // a falha não desliga a flag nem mexe em estado: quem mantém o 2D
    // pintando é o gate acima (pintor ausente), sem caso novo
    expect(corpo).not.toContain('rotulos3dLigado = false');
  });
});

// ============================================================
// O RELÓGIO DO FILME É DO FILME (item 108, 30/08).
//
// O DEFEITO QUE ESTE BLOCO EXISTE PARA NÃO DEIXAR VOLTAR: o tick do
// filme escrevia `jdPedido = jdDoFilme(journeyT)` atrás de uma guarda
// `!this.debug.has('jd')`. A porta parecia do operador — mas o Atlas
// abre AO VIVO por desenho, então `naEpoca` é falso sempre e QUALQUER
// gesto que espelhe a URL (`urlComMomento` em `useEspelhoDaUrl.ts`)
// grava `&jd=` de hoje na barra de endereços. Um F5, um link
// compartilhado ou uma aba restaurada devolviam esse `?jd=` ao boot, a
// guarda calava o relógio do roteiro e a coda mirava uma Terra a 263
// milhões de km em vez de 34.868. Nenhuma porta de visitante tira o
// relógio do filme.
//
// A LINHA REAL É EXECUTADA com um `this` de mentira — o precedente do
// gate dos rótulos 3D e das portas do harness acima. Recolocar a
// condição antiga reprova aqui: a linha extraída deixaria de escrever.
// ============================================================
describe('o relógio do filme é do filme — a porta ?jd= não o cala (item 108)', () => {
  // a condição fica no grupo: qualquer guarda que alguém recoloque
  // entra aqui e vai ser EXECUTADA, não lida.
  // Recortado DO PRÓPRIO tick — a auditoria de 30/08 provou que uma
  // cópia morta do bloco noutro método enganava a varredura solta; a
  // unicidade da linha é cobrada no primeiro veredito abaixo.
  const DO_TICK = FONTE.slice(FONTE.indexOf('private tick('));
  const BLOCO = DO_TICK.match(
    /\n {4}(if \([^\n]*\) \{\n {6}this\.maquinaDoTempo\.jdPedido = jdDoFilme\(this\.journeyT\);\n {4}\})/
  );

  /** roda o bloco REAL do tick com a fase, o t e as portas que se quiser */
  const tick = (phase: string, journeyT: number, portas: [string, string][]) => {
    const alvo = {
      phase,
      journeyT,
      debug: new Map(portas),
      maquinaDoTempo: { jdPedido: Number.NaN },
    };
    new Function('jdDoFilme', BLOCO![1]).call(alvo, jdDoFilme);
    return alvo.maquinaDoTempo.jdPedido;
  };

  it('a varredura acha o bloco — um padrão quebrado passaria calado', () => {
    expect(BLOCO, 'o tick não escreve mais `jdPedido = jdDoFilme(journeyT)`').not.toBeNull();
    // e a linha viva é ÚNICA no arquivo: uma cópia morta em outro canto
    // reprovaria AQUI, em vez de se oferecer à varredura no lugar dela
    expect(FONTE.match(/jdPedido = jdDoFilme\(this\.journeyT\);/g)).toHaveLength(1);
  });

  it('COM ?jd= na URL o filme SEGUE corrigindo o relógio — os dois trechos', () => {
    // a coda (t=193, o quadro do pouso sobre as Américas) e um ato
    // qualquer: os dois têm de sair na data do ROTEIRO, não na da porta
    expect(tick('journey', 193, [['jd', '2465000']])).toBe(JD_DO_FILME_TDB);
    expect(tick('journey', 40, [['jd', '2465000']])).toBe(EPOCA_JD_TDB);
  });

  it('...e sem a porta, idêntico — a porta nunca foi a variável', () => {
    expect(tick('journey', 193, [])).toBe(JD_DO_FILME_TDB);
    expect(tick('journey', 40, [])).toBe(EPOCA_JD_TDB);
  });

  it('fora do filme o bloco não escreve nada — o Atlas tem o relógio dele', () => {
    // o controle que prova que o bloco extraído é código de verdade, com
    // o gate de fase vivo: se ele escrevesse sempre, o Atlas perderia a
    // data do visitante no primeiro quadro
    expect(tick('atlas', 193, [['jd', '2465000']])).toBeNaN();
    expect(tick('intro', 40, [])).toBeNaN();
  });

  it('a porta ?jd= volta a mandar quando o ATLAS abre — o pino não morreu', () => {
    // o outro lado do conserto: o `atlas-smoke` chega ao Atlas VINDO do
    // filme (`t=250&jd=EPOCA`, prova 3; `noCorpoDoSol`, prova 18) e
    // precisa do instante que pediu. Sem esta chamada dentro do portal o
    // `?jd=` valeria só até o primeiro quadro de viagem.
    const portal = FONTE.slice(
      FONTE.indexOf('  entrarNoAtlas(opcoes'),
      FONTE.indexOf('  partirDoAtlas()')
    );
    // guarda de TEXTO declarada (a regex exclui linha comentada); o
    // dublê morto fora do portal cai na unicidade abaixo e no tsc do gate
    expect(portal).toMatch(/\n\s*this\.aplicarPortaJd\(\);/);
    // e a porta é LIDA num lugar só, do boot e do portal
    expect(FONTE.match(/lerPortaJd\(/g)).toHaveLength(1);
  });
});
