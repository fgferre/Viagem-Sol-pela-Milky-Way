// Serve: lei — a hierarquia dos rótulos e a régua de relevância decidem quem ganha a vaga na tela
// ============================================================
// OS RÓTULOS DOS DEZ CORPOS (Onda 5, conserto da revisão de olhos
// frescos). O que se julga aqui é a única coisa que o produtor promete
// e que o navegador não consegue provar barato: que o rótulo lê a
// posição VIVA do atributo — a mesma que a GPU desenha e que a máquina
// do tempo reescreve —, na ordem certa, e que a chave dele é a que o
// hit-test do Director reconhece.
//
// A prova de que o clique enquadra mora no `busca-smoke`, em navegador
// real. Esta aqui é a que impede o defeito silencioso: o nome de Marte
// sobre o ponto de Júpiter no dia em que alguém redigitar a ordem.
// ============================================================
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CHAVE_DE_CORPO, CORPOS_DO_SISTEMA } from '../atlasConfig';
import { IDS_FOTOMETRIA } from './planetas/fotometria';
import type { StarLabel } from './labels';

// O RUNNER DA CASA É `node` (vitest.config.ts) e `labels.ts` puxa
// `galaxy.ts`, que lê `window.location.search` no topo do módulo para as
// portas de afinação da galáxia. Duas linhas de `window` mínimo e um
// import dinâmico resolvem sem trocar o ambiente de TODOS os testes por
// um jsdom que nenhum outro precisa — e sem partir o módulo em dois só
// para agradar ao runner.
(globalThis as { window?: unknown }).window = { location: { search: '' } };
const {
  projectCorpos,
  prioridadeDeCorpo,
  prioridadeDeEstrela,
  pesoDoRotulo,
  PRIORIDADE_DO_ROTULO,
  BONUS_DE_HISTERESE,
  CORPO_FADE_COMECA_PC,
  CORPO_FADE_TERMINA_PC,
  aplicarReguaDeRelevancia,
  ORCAMENTO_DE_NOMES,
  OPACIDADE_MINIMA_DO_ROTULO,
} = await import('./labels');

/** uma câmera olhando a origem de 10 unidades no eixo z */
function camera() {
  const c = new THREE.PerspectiveCamera(60, 1.6, 0.001, 1000);
  c.position.set(0, 0, 10);
  c.lookAt(0, 0, 0);
  c.updateMatrixWorld(true);
  return c;
}

/** posições de brinquedo: dez corpos em fila, todos no quadro */
function posicoes(): Float32Array {
  const p = new Float32Array(30);
  for (let i = 0; i < 10; i++) p[i * 3] = (i - 4.5) * 0.4;
  return p;
}

describe('a tabela dos dez', () => {
  it('é a ORDEM da camada, derivada e não redigitada', () => {
    expect(CORPOS_DO_SISTEMA.map((c) => c.id)).toEqual([...IDS_FOTOMETRIA]);
    expect(CORPOS_DO_SISTEMA.length).toBe(10);
  });

  it('todo corpo tem nome pt-BR, classe e chave com o prefixo do hit-test', () => {
    for (const c of CORPOS_DO_SISTEMA) {
      expect(c.nome, c.id).toMatch(/^[A-ZÁÂÃÉÊÍÓÔÕÚÜÇ]/);
      expect(c.classe, c.id).toBeTruthy();
      expect(c.chave, c.id).toBe(`${CHAVE_DE_CORPO}${c.id}`);
    }
    // e a classe conta a verdade: Plutão não é planeta desde 2006
    const pluto = CORPOS_DO_SISTEMA.find((c) => c.id === 'pluto');
    expect(pluto?.classe).toBe('planeta anão');
    expect(CORPOS_DO_SISTEMA.find((c) => c.id === 'sun')?.classe).toBe('estrela');
  });
});

describe('projectCorpos', () => {
  it('lê a posição VIVA do atributo, na ordem da tabela', () => {
    const cam = camera();
    const p = posicoes();
    const rotulos = projectCorpos(cam, CORPOS_DO_SISTEMA, p);
    expect(rotulos.length).toBe(10);
    expect(rotulos.map((l) => l.key)).toEqual(CORPOS_DO_SISTEMA.map((c) => c.chave));
    // o x na tela cresce com o x da cena: o rótulo segue o ponto
    for (let i = 1; i < rotulos.length; i++) {
      expect(rotulos[i].x).toBeGreaterThan(rotulos[i - 1].x);
    }
    // e MOVER o atributo move o rótulo — é a promessa da máquina do
    // tempo: ler o retrato congelado aqui deixaria o nome para trás
    p[3 * 3] += 1.5;
    const depois = projectCorpos(cam, CORPOS_DO_SISTEMA, p);
    expect(depois[3].x).toBeGreaterThan(rotulos[3].x);
    expect(depois[0].x).toBe(rotulos[0].x);
  });

  it('a distância é a do OBSERVADOR, e a classe entra no lugar do tipo espectral', () => {
    const cam = camera();
    const rotulos = projectCorpos(cam, CORPOS_DO_SISTEMA, posicoes());
    for (const l of rotulos) {
      expect(l.distPc).toBeGreaterThan(9);
      expect(l.distPc).toBeLessThan(12);
      // corpo do sistema não tem tipo espectral: o detalhe é a classe
      expect(l.spect).toBe('');
      expect(l.detalhe).toBeTruthy();
    }
    expect(rotulos[0].detalhe).toBe('estrela');
    expect(rotulos.at(-1)?.detalhe).toBe('planeta anão');
  });

  it('quem está fora do quadro não vira rótulo', () => {
    const cam = camera();
    const p = posicoes();
    // atrás da câmera
    p[0] = 0;
    p[2] = 100;
    const rotulos = projectCorpos(cam, CORPOS_DO_SISTEMA, p);
    expect(rotulos.length).toBe(9);
    expect(rotulos.some((l) => l.key === `${CHAVE_DE_CORPO}sun`)).toBe(false);
  });

  it('array curta não estoura: lê só o que existe', () => {
    const rotulos = projectCorpos(camera(), CORPOS_DO_SISTEMA, new Float32Array(9));
    expect(rotulos.length).toBeLessThanOrEqual(3);
    for (const l of rotulos) expect(Number.isFinite(l.x)).toBe(true);
  });

  it('posição NaN não vira rótulo — o slot vazio das luas sem efeméride', () => {
    const p = posicoes();
    p[0] = Number.NaN;
    p[1] = Number.NaN;
    p[2] = Number.NaN;
    const rotulos = projectCorpos(camera(), CORPOS_DO_SISTEMA, p);
    expect(rotulos.some((l) => l.key === `${CHAVE_DE_CORPO}sun`)).toBe(false);
    expect(rotulos.length).toBe(9);
    for (const l of rotulos) expect(Number.isFinite(l.x)).toBe(true);
  });
});


// ============================================================
// A HIERARQUIA DOS NOMES (item 73, plano §3) — a tabela do doador
// (`OverlayPositionTracker`), reimplementada. Antes dela quem chegava
// primeiro na lista ocupava a vaga, e o resultado medido era Saturno
// nascendo `desenhado: false` por colidir com "SOL".
// ============================================================
describe('prioridade — quem ganha a vaga', () => {
  it('a hierarquia é a que o plano declara, e ela DERIVA da classe', () => {
    expect(prioridadeDeCorpo('estrela')).toBe(PRIORIDADE_DO_ROTULO.sol);
    expect(prioridadeDeCorpo('planeta')).toBe(PRIORIDADE_DO_ROTULO.planeta);
    expect(prioridadeDeCorpo('planeta anão')).toBe(PRIORIDADE_DO_ROTULO.anao);
    expect(prioridadeDeCorpo('asteroide')).toBe(PRIORIDADE_DO_ROTULO.anao);
    expect(prioridadeDeCorpo('lua')).toBe(PRIORIDADE_DO_ROTULO.lua);
    // classe que ninguém previu não vira exceção: cai no piso
    expect(prioridadeDeCorpo('cometa')).toBe(PRIORIDADE_DO_ROTULO.outros);
    // e a ordem é a que a queixa do dono pede: planeta acima de lua
    expect(PRIORIDADE_DO_ROTULO.foco).toBeGreaterThan(PRIORIDADE_DO_ROTULO.sol);
    expect(PRIORIDADE_DO_ROTULO.sol).toBeGreaterThan(PRIORIDADE_DO_ROTULO.planeta);
    expect(PRIORIDADE_DO_ROTULO.planeta).toBeGreaterThan(PRIORIDADE_DO_ROTULO.anao);
    expect(PRIORIDADE_DO_ROTULO.anao).toBeGreaterThan(PRIORIDADE_DO_ROTULO.lua);
    expect(PRIORIDADE_DO_ROTULO.lua).toBeGreaterThan(PRIORIDADE_DO_ROTULO.estrelaPropria);
  });

  it('a estrela entra pelo TIER: nome próprio acima de designação', () => {
    expect(prioridadeDeEstrela(0)).toBe(PRIORIDADE_DO_ROTULO.estrelaPropria);
    expect(prioridadeDeEstrela(1)).toBe(PRIORIDADE_DO_ROTULO.estrelaBayer);
    expect(prioridadeDeEstrela(undefined)).toBe(PRIORIDADE_DO_ROTULO.estrelaPropria);
  });

  it('a projeção dos corpos PUBLICA a prioridade — o desenho não a recalcula', () => {
    const rotulos = projectCorpos(camera(), CORPOS_DO_SISTEMA, posicoes());
    const porChave = new Map(rotulos.map((l) => [l.key, l]));
    expect(porChave.get(`${CHAVE_DE_CORPO}sun`)?.prioridade).toBe(PRIORIDADE_DO_ROTULO.sol);
    expect(porChave.get(`${CHAVE_DE_CORPO}earth`)?.prioridade).toBe(
      PRIORIDADE_DO_ROTULO.planeta
    );
    expect(porChave.get(`${CHAVE_DE_CORPO}pluto`)?.prioridade).toBe(
      PRIORIDADE_DO_ROTULO.anao
    );
  });

  it('a HISTERESE vale 20% e é multiplicação, não caso novo', () => {
    const rotulos = projectCorpos(camera(), CORPOS_DO_SISTEMA, posicoes());
    const terra = rotulos.find((l) => l.key === `${CHAVE_DE_CORPO}earth`)!;
    expect(pesoDoRotulo(terra)).toBe(PRIORIDADE_DO_ROTULO.planeta);
    expect(pesoDoRotulo(terra, new Set([terra.key]))).toBe(
      PRIORIDADE_DO_ROTULO.planeta * BONUS_DE_HISTERESE
    );
    expect(BONUS_DE_HISTERESE).toBe(1.2);
    // ...e ela NÃO inverte a hierarquia: uma lua que estava na tela
    // continua abaixo de um planeta que não estava
    const lua = { ...terra, prioridade: PRIORIDADE_DO_ROTULO.lua };
    expect(pesoDoRotulo(lua, new Set([lua.key]))).toBeLessThan(pesoDoRotulo(terra));
  });

  it('O BÔNUS NÃO INVERTE NENHUM PAR DA TABELA — a trava, degrau a degrau', () => {
    // A SEGURANÇA "estrela nunca rouba a vaga de lua" tem margem
    // EXATAMENTE ZERO: `lua` 6 contra `estrelaPropria` 5 × 1,2 = 6,0.
    //
    // O QUE ESTE TESTE ACRESCENTA, dito sem inflar (medido em 24/08, e a
    // primeira redação desta nota exagerava): as sabotagens ÓBVIAS desse
    // par — bônus 1,25, ou `estrelaPropria` 6 — JÁ REPROVAVAM em pinos
    // que existiam antes dele. O buraco real era OUTRO, e este teste é
    // que o achou: `sol` 90 × 1,2 = 108 passava `foco` 100, e NENHUM
    // juiz guardava esse par. É por isso que a trava é sobre a TABELA
    // INTEIRA, e não sobre o par que alguém lembrou de escrever: o par
    // esquecido nunca é o que se está olhando.
    //
    // A LEI: para dois degraus vizinhos, o de BAIXO com bônus não pode
    // PASSAR o de cima sem bônus. Empatar é permitido — o desempate por
    // distância resolve, e é onde `lua`/`estrelaPropria` vive hoje.
    // um rótulo qualquer, só para carregar a prioridade: o que se mede
    // aqui é o PESO, e ele não olha mais nada do objeto
    const base = projectCorpos(camera(), CORPOS_DO_SISTEMA, posicoes()).find(
      (l) => l.key === `${CHAVE_DE_CORPO}earth`
    )!;
    const degraus = [...new Set(Object.values(PRIORIDADE_DO_ROTULO))].sort(
      (a, b) => b - a
    );
    for (let i = 0; i + 1 < degraus.length; i++) {
      const cima = degraus[i];
      const baixo = degraus[i + 1];
      expect(
        baixo * BONUS_DE_HISTERESE,
        `o bônus faz ${baixo} passar ${cima}`
      ).toBeLessThanOrEqual(cima);
    }

    // E A MESMA LEI PELO PESO, que é quem manda de verdade — a conta
    // acima é da tabela, esta é da função que a lê.
    const nomes = Object.keys(PRIORIDADE_DO_ROTULO) as (keyof typeof PRIORIDADE_DO_ROTULO)[];
    for (const alto of nomes) {
      for (const baixo of nomes) {
        if (PRIORIDADE_DO_ROTULO[baixo] >= PRIORIDADE_DO_ROTULO[alto]) continue;
        const a = { ...base, key: 'a', prioridade: PRIORIDADE_DO_ROTULO[alto] };
        const b = { ...base, key: 'b', prioridade: PRIORIDADE_DO_ROTULO[baixo] };
        expect(
          pesoDoRotulo(b, new Set(['b'])),
          `${baixo} com bônus passou ${alto} sem bônus`
        ).toBeLessThanOrEqual(pesoDoRotulo(a));
      }
    }

    // O PAR QUE ESTAVA QUEBRADO até 24/08, pinado pelo nome para nunca
    // mais voltar em silêncio: o `foco` é o topo, e um SOL já desenhado
    // não pode passar à frente de um alvo recém-escolhido.
    const sol = { ...base, key: 'sol', prioridade: PRIORIDADE_DO_ROTULO.sol };
    const foco = { ...base, key: 'foco', prioridade: PRIORIDADE_DO_ROTULO.foco };
    expect(pesoDoRotulo(sol, new Set(['sol']))).toBeLessThanOrEqual(
      pesoDoRotulo(foco)
    );
  });

  it('sem prioridade vale o piso — é o rótulo do FILME, que não é tocado', () => {
    expect(pesoDoRotulo({ ...projectCorpos(camera(), CORPOS_DO_SISTEMA, posicoes())[0], prioridade: undefined }))
      .toBe(PRIORIDADE_DO_ROTULO.outros);
  });
});

describe('o fade dos corpos — dentro do sistema nada muda', () => {
  it('na vista de abertura a opacidade é a de sempre, 0,95', () => {
    // a câmera de brinquedo está a 10 unidades, mas a régua do fade é a
    // distância em pc, e ela só começa a morder a 0,01 pc: aqui a
    // distância É 10 pc, então o teste usa a escala real
    const cam = camera();
    cam.position.set(0, 0, 0.001); // 0,001 pc — 9× mais perto que o começo
    cam.updateMatrixWorld(true);
    const p = new Float32Array(30);
    const rotulos = projectCorpos(cam, CORPOS_DO_SISTEMA, p);
    for (const l of rotulos) expect(l.opacity).toBeCloseTo(0.95, 12);
  });

  it('e some quando a casa vira um ponto — visitar uma estrela apaga os dez', () => {
    const cam = camera();
    cam.position.set(0, 0, CORPO_FADE_TERMINA_PC * 2);
    cam.updateMatrixWorld(true);
    const rotulos = projectCorpos(cam, CORPOS_DO_SISTEMA, new Float32Array(30));
    for (const l of rotulos) expect(l.opacity).toBe(0);
    // e a faixa é declarada, com o começo bem além da vista de abertura
    // (0,0011 pc): o fade nunca morde dentro do sistema
    expect(CORPO_FADE_COMECA_PC).toBeGreaterThan(0.005);
    expect(CORPO_FADE_TERMINA_PC).toBeGreaterThan(CORPO_FADE_COMECA_PC);
  });
});

// ============================================================
// A RÉGUA DE RELEVÂNCIA (item 82, N1) — a metade que o NASA Eyes não
// tem. A quadtree deles resolve SOBREPOSIÇÃO e resolve bem; e ainda
// assim mede-se quarenta nomes acesos numa vista da Terra, que é
// confusão. O Eyes nunca decide que um objeto não INTERESSA; só decide
// que ele não CABE. Estes vereditos guardam a decisão que falta.
//
// São de comportamento: nenhum pergunta o valor do orçamento nem o nome
// de uma constante. O que se cobra é a ORDEM (importância primeiro) e o
// TETO (a tela não carrega nomes sem fim), que é o que o dono vê.
// ============================================================
describe('a régua de relevância — importância antes de geometria', () => {
  const nome = (key: string, prioridade: number, distPc = 1): StarLabel => ({
    name: key, spect: '', distPc, x: 0.5, y: 0.5, opacity: 0.9, key, prioridade,
  });

  /** um céu com mais nomes do que a tela carrega */
  const ceuLotado = () => [
    ...Array.from({ length: 30 }, (_, i) =>
      nome(`bayer${i}`, PRIORIDADE_DO_ROTULO.estrelaBayer, 10 + i)
    ),
    ...Array.from({ length: 6 }, (_, i) =>
      nome(`propria${i}`, PRIORIDADE_DO_ROTULO.estrelaPropria, 5 + i)
    ),
    nome('planeta', PRIORIDADE_DO_ROTULO.planeta, 0.001),
    nome('sol', PRIORIDADE_DO_ROTULO.sol, 0.0001),
  ];

  it('a tela tem TETO: sobra nome de fora, por mais que projete', () => {
    const lista = aplicarReguaDeRelevancia(ceuLotado());
    const passaram = lista.filter((l) => !l.cortadoPelaRegua);
    expect(passaram.length).toBeLessThan(lista.length);
    expect(passaram.length).toBe(ORCAMENTO_DE_NOMES);
  });

  it('quem passa vale MAIS que quem some — sempre, sem exceção', () => {
    // é isto que separa uma régua de relevância de um corte arbitrário:
    // o menor prioritário que ficou ainda é ≥ o maior que saiu
    const lista = aplicarReguaDeRelevancia(ceuLotado());
    const passaram = lista.filter((l) => !l.cortadoPelaRegua);
    const cortados = lista.filter((l) => l.cortadoPelaRegua);
    const menorQueFicou = Math.min(...passaram.map((l) => l.prioridade!));
    const maiorQueSaiu = Math.max(...cortados.map((l) => l.prioridade!));
    expect(menorQueFicou).toBeGreaterThanOrEqual(maiorQueSaiu);
  });

  it('o Sol e o planeta NUNCA cedem a estrela de fundo', () => {
    const lista = aplicarReguaDeRelevancia(ceuLotado());
    for (const chave of ['sol', 'planeta']) {
      expect(lista.find((l) => l.key === chave)!.cortadoPelaRegua, chave).toBeFalsy();
    }
  });

  it('a designação de Bayer é o primeiro degrau a cair', () => {
    // as dezessete estrelas que faziam o nó na abertura eram quase todas
    // designações (ε Ind, ι Pav, τ PsA…): o último degrau da tabela some
    // sozinho, sem uma regra nova que o nomeie
    const lista = aplicarReguaDeRelevancia(ceuLotado());
    const bayerVivas = lista.filter(
      (l) => l.prioridade === PRIORIDADE_DO_ROTULO.estrelaBayer && !l.cortadoPelaRegua
    );
    const propriasVivas = lista.filter(
      (l) => l.prioridade === PRIORIDADE_DO_ROTULO.estrelaPropria && !l.cortadoPelaRegua
    );
    expect(propriasVivas.length).toBe(6);
    expect(bayerVivas.length).toBeLessThan(propriasVivas.length);
  });

  it('a ORDEM da lista é a disputa: quem vale mais chega antes', () => {
    // o `LabelCanvas` ocupa na ordem em que recebe, então ordenar aqui É
    // decidir quem sobrevive à colisão
    const lista = aplicarReguaDeRelevancia(ceuLotado());
    for (let i = 1; i < lista.length; i++) {
      expect(lista[i - 1].prioridade!).toBeGreaterThanOrEqual(lista[i].prioridade!);
    }
  });

  it('a histerese segura quem já estava na tela — o corte não PISCA', () => {
    // dois de mesmo peso disputando a última vaga trocariam de lugar a
    // cada quadro em que a projeção andasse um pixel
    const lista = () => [
      nome('sol', PRIORIDADE_DO_ROTULO.sol, 0.0001),
      nome('longe', PRIORIDADE_DO_ROTULO.estrelaPropria, 9),
      nome('perto', PRIORIDADE_DO_ROTULO.estrelaPropria, 8),
    ];
    // sem memória, o mais PERTO vem antes
    expect(aplicarReguaDeRelevancia(lista(), undefined, 2).map((l) => l.key))
      .toEqual(['sol', 'perto', 'longe']);
    // com o bônus de quem estava desenhado, o que já se lia continua lido
    const comMemoria = aplicarReguaDeRelevancia(lista(), new Set(['longe']), 2);
    expect(comMemoria.map((l) => l.key)).toEqual(['sol', 'longe', 'perto']);
    expect(comMemoria.find((l) => l.key === 'perto')!.cortadoPelaRegua).toBe(true);
  });

  it('nome invisível não gasta vaga — a lua colada no pai não expulsa ninguém', () => {
    // `esmaecerLuasColadasNoPai` derruba a opacidade das 21 luas quase a
    // zero; se elas consumissem orçamento, empurrariam para fora nomes
    // que o visitante VÊ
    const fantasmas = Array.from({ length: 20 }, (_, i) => {
      const l = nome(`lua${i}`, PRIORIDADE_DO_ROTULO.lua, 0.01);
      l.opacity = OPACIDADE_MINIMA_DO_ROTULO / 2;
      return l;
    });
    const visiveis = Array.from({ length: 4 }, (_, i) =>
      nome(`propria${i}`, PRIORIDADE_DO_ROTULO.estrelaPropria, 5 + i)
    );
    const lista = aplicarReguaDeRelevancia([...fantasmas, ...visiveis]);
    for (const v of visiveis) {
      expect(lista.find((l) => l.key === v.key)!.cortadoPelaRegua, v.key).toBeFalsy();
    }
  });
});
